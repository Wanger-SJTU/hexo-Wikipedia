---
title: FreeToken 边缘 MoE 推理：主机内存预算、分路径 JIT 与首次请求 OOM 定位
date: 2026-10-30 22:56:00
updated: 2026-10-30 22:56:00
summary: 14 GiB 内存机器上跑 18.2 GiB 专家 MoE 模型的完整链路：--cpu-mem 主机内存预算、分路径 JIT、chunked prefill 预热、spill 页缓存回收，以及首次请求 OOM 的定位过程。
navigation: 工程笔记
nav_title: FreeToken 推理链路与 JIT
nav_order: 10
tags: [FreeToken, MoE, JIT, GGUF, 性能优化]
categories: [技术分析]
---

## 0. TL;DR

- 目标：在 **14 GiB 内存 + RTX 3060 12G** 的机器上跑 `Qwen3.6-35B-A3B-UD-Q4_K_M`（专家权重实测 18.2 GiB）。
- `--cpu-mem 2GiB`：40 个 MoE 层里 **4 层 pin 在内存（1.81 GiB）**，其余 36 层写入**文件后备 spill**（页缓存按需换入）；加载和 `API server is ready` 都正常。
- **首个请求必 OOM**，但根因不是 spill：首个 forward 才触发 **ggml-CUDA 的 JIT 编译**（本机没有预编译 kernel cache），nvcc 的内存峰值叠在常驻进程上，几秒内被杀。
- 修复四件事：
  1. 银行加载**之前**预编译 forward 用到的 AOT 模块（ggml / FlashInfer）；
  2. **prefill 与 decode 分路径 JIT 预热**，prefill 走 **chunked prefill** 形态；
  3. prefill 拷贝完成后**回收 spill 文件页缓存**；
  4. 新增 `ft jit`，**不加载模型权重**即可单独完成编译。
- 实测：启动约 **76 s**；首个请求 **TTFT 11.9 s、decode ≈5 tok/s**；`ft jit` 冷编译 **3 分 02 秒**、峰值 RSS **1.72 GiB**。

---

## 1. 背景与命令

机器与模型：

| 项 | 值 |
|---|---|
| GPU | RTX 3060 12 GiB |
| CPU | AMD Ryzen 7 PRO 8845HS（8C16T） |
| RAM | 14 GiB（2 GiB swap） |
| 模型 | `Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`，22.1 GB |
| 结构 | 40 个 MoE 层 × 256 专家，top-8；专家张量 18.22 GiB |

`--cpu-mem` 的语义：给 **pinned 专家 bank** 一个主机内存上限；预算内的层 `cudaHostRegister`（GPU 可直接读），超出的层用 unlinked tmpfile + `MAP_SHARED` 做文件后备，填完丢页，按需缺页读回，decode 由 CPU executor 计算。

启动命令（后文数据均来自它）：

```bash
systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 \
  bash -c 'exec timeout 600 .venv/bin/ft serve \
    --model ~/models/unsloth/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf \
    --cpu-mem 2GiB --moe-cache-size 512 --max-running-requests 1 \
    --max-seq-len 4096 --num-pages 64 --cuda-graph-max-bs 0 \
    --host 127.0.0.1 --port 31565'
```

---

## 2. 现象：加载能过，首个请求被杀

| 阶段 | 结果 |
|---|---|
| 加载 18.2 GiB 专家 + 引擎初始化 | 通过，8 GiB cgroup 峰值 6.64 GiB |
| `API server is ready` | 通过（约 76 s） |
| 第一个流式补全请求 | 前端立刻 `200 OK`，**1~9 s 内 scheduler 退出**，流中断 |
| 客户端 | 93 s 后连接断开，收到 0 个 token |

日志与内核记录是两个形态的 OOM：

```
mem-guard: avail=296 MB  SIGTERM  python3 rss=5505 MB
kernel:   Memory cgroup out of memory ... anon-rss:1714664kB shmem-rss:3837888kB
```

关键观察：在 `copy_missing` 的 spill 拷贝分支加日志后，计数是 **0** —— 进程死在第一个（pinned）MoE 层的 GEMM 之前，**还没进入 spill 路径**。

---

## 3. 代码级时序

### 3.1 启动

```
ft serve
└─ launch_server → supervisor
   └─ spawn freetoken-TP0-scheduler                server/launch.py:81
      └─ Engine.__init__                           engine/engine.py:432
         ├─ _precompile_kernels(config)            :497 → :1698
         │    ├─ FlashInfer prefill/decode 模块      build_and_load()
         │    └─ ggml-CUDA 模块（GGUF 权重时）       kernel.ggml._module()
         ├─ _init_offload_moe_cache(config)        :752
         │    ├─ _cpu_mem_plan(18.22GiB, 40, 预算)  :804 → :1670
         │    ├─ load_expert_banks(spill_dir=…)     :872
         │    │    ├─ HostBank(backing="file")      host_banks.py:294
         │    │    └─ O_DIRECT 直读进 bank           models/gguf/experts.py:46
         │    ├─ settle：pin 或 drop_pages/drop_cache host_banks.py:399
         │    ├─ OffloadMoeCache + set_bank_sources :976/:999
         │    └─ CpuMoeExecutor                     :1007
         ├─ KV pool / GraphRunner                   :534/:595
         └─ _warmup_forward_paths()                 :612 → :1404
              ├─ chunked prefill 预热（按 --max-prefill-length 切块）
              └─ decode 预热（未启用 CUDA graph 时）
```

### 3.2 请求

```
POST /v1/chat/completions
└─ scheduler.overlap_loop                          scheduler.py:220
   └─ _schedule_next_batch → _prepare_batch → _forward   :896/:839/:931
      └─ Engine.forward_batch                      engine/engine.py:1387
         └─ OffloadMoELayer.forward                 layers/moe.py:191
            ├─ prefill → _prefill_routed            :345
            │   ├─ cache.materialize_layer(L)       offload_cache.py:1110
            │   ├─ cache.copy_missing()             :1253
            │   │    ├─ spill 层：整层 pageable H2D  :1267（0.456 GiB/层）
            │   │    │    └─ 之后回收 spill 页缓存    drop_spill_page_cache()
            │   │    └─ pinned 层：fused copy        :1274
            │   └─ _expert_gemm → ggml.mul_mat_id   layers/moe.py:402
            └─ decode → _decode_routed              :260
                ├─ spill 层 → CpuMoeExecutor.decode  cpu_executor.py:529
                └─ pinned 层 → ensure_experts + GEMM :1070
```

`--cpu-mem` 只改变 **bank 的驻留位置**，不改变 prefill 的「整层物化」：每个 spill 层在 prefill 时都要把 0.456 GiB 从磁盘读入并 H2D。一次请求的 prefill 读放大 ≈ 36 × 0.456 ≈ **16.4 GiB**。

---

## 4. 根因：首个 forward 才编译 ggml-CUDA

证据链：

1. 本机未安装 `freetoken_kernel_cache`，`_kernel_cache_dir()` 返回 `None`，`_load_prebuilt()` 永远拿不到预编译产物（`kernel/utils.py:210/252`）。
2. ggml 缓存目录 `~/.cache/tvm-ffi/freetoken__ggml_*/` 里只有 `build.ninja` 和空 `lock`，**没有 `.so`**，时间戳正好对应两次请求被杀的时刻。
3. `ft serve` 在 fi 后端不跑 `_warmup_prefill`（原实现只针对 triton，`engine.py:610`），CUDA graph 又被关掉 → **启动阶段没有任何 forward**。
4. 因此第一次 `mul_mat_id`（GGUF dense/MoE 都走它）才触发 `kernel.ggml._module()` → `load_aot("ggml")` → nvcc 现场编译 6 个 `.cu` + 全部模板实例化。nvcc 峰值叠加在 5.5 GiB 常驻进程上 → OOM。
5. 预热/捕获期失败也吻合：7 GiB 那次死在 `Capturing graphs: bs=1`，graph 捕获本身就是第一次 forward。

结论：**加载路径没问题，坏在「首次 forward 的 JIT」没有提前做**。

---

## 5. 修复设计

### 5.1 分路径 JIT + chunked prefill 预热

- 启动时在**银行加载之前**调用 `_precompile_kernels()`：FlashInfer 的 prefill/decode 模块，以及 GGUF 权重需要的 ggml-CUDA 模块。此时只有 dense 模型常驻，nvcc 峰值放得下。
- 引擎初始化末尾执行 `_warmup_forward_paths()`：
  - **prefill**：用 dummy 请求走真实 prefill 路径，并按 `--max-prefill-length`（`max_extend_tokens`）**切成 chunk 逐块 forward**，`cached_len` 递增，所以 chunk N>0 的续块路径也被覆盖；
  - **decode**：CUDA graph 关闭时单独跑一步 decode，覆盖 CPU executor 的 pinned IO / host node 与 ggml 的 mmvq 路径；
  - 触发条件：triton 后端（autotune）、`--cpu-mem`、或 `FREETOKEN_WARMUP=1`。
- 这样首个用户请求不再承担任何「首次使用」的 JIT/分配。

### 5.2 prefill 后回收 spill 页缓存

`copy_missing` 的 spill 分支把整层拷贝到 GPU 后，调用 `drop_spill_page_cache()`：

- 先对每个 file-backed bank `MADV_DONTNEED`（解除本进程的 PTE，页才可被回收）；
- 再 `posix_fadvise(POSIX_FADV_DONTNEED)` 丢弃页缓存。

否则**每次 prefill 都会把 16 GiB spill 重新塞进页缓存**，在内存紧张的机器上直接顶穿。

### 5.3 `ft jit`：不加载模型，单独编译

```bash
ft jit --model <checkpoint> [--attention-backend NAME] [--dtype auto|bfloat16|float16|float32] [--tp-size N]
```

只读 checkpoint 的配置（GGUF 元数据 / `config.json`），不读权重，编译该模型 forward 需要的 AOT 模块。适合先在空闲时段/另一台机器上把 kernel 建好；`ft serve` 启动时直接命中缓存（0 s）。

---

## 6. 实测

冷启动（清空 ggml 缓存后的 `ft jit`）：

| 指标 | 值 |
|---|---|
| 冷构建 ggml-CUDA（`freetoken__ggml.so` 39 MB） | **3 分 02 秒** |
| 进程峰值 RSS（未加载权重） | **1.72 GiB** |
| 缓存命中后再次 `ft jit` | 10.8 s |
| 之后 `ft serve` 的预编译开销 | 0.0 s |

服务端（8 GiB cgroup、禁 swap、`--cpu-mem 2GiB`，4/40 层 pinned）：

| 阶段 | 实测 |
|---|---|
| 专家 bank 加载 | 33 s |
| forward 预热（chunked prefill [64] + decode） | 12.0 s |
| 启动到 ready | 约 76 s |
| 首个请求 TTFT | **11.94 s**（15 token prefill，服务端 input 0.99 tok/s） |
| decode | **≈5.0 tok/s**（服务端日志 3.6–6.6，median step 199 ms） |
| OOM | **无**（8 GiB cgroup、无 swap 全程未触发） |

---

## 7. 使用方式

```bash
# 1) 空闲时先把 kernel 编译好（不加载模型，峰值约 1.7 GiB）
ft jit --model ~/models/unsloth/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf

# 2) 再启动服务；启动时命中 kernel 缓存，--cpu-mem 下不再有请求期 JIT
ft serve --model ...gguf \
  --cpu-mem 2GiB --moe-cache-size 512 --max-running-requests 1 \
  --max-seq-len 4096 --num-pages 64 --cuda-graph-max-bs 0
```

---

## 8. 边界与经验

1. **chunked prefill 在 spill 配置下会放大磁盘读**：每个 chunk 都会重新整层物化所有 spill 层。默认 `--max-prefill-length 8192`；只有专家能全驻留内存时才建议调小 chunk。
2. `--cpu-mem` 只限制 pinned 内存，不减少 active set、不减少 prefill 流量；它让模型**能装下**，不等于**跑得快**。
3. 14 GiB 内存跑 22 GB 模型仍是紧平衡：4/40 层在 GPU 时 decode ≈5 tok/s；加大 `--cpu-mem`（更多层 pin）或换 Q2_K/IQ2（专家约 8–10 GiB）会明显改善。
4. 本机教训：**首次 forward 的所有 JIT 都必须前置**。没有 kernel cache 时，`ft serve` 的「启动成功」不代表「能推理」。
5. 诊断技巧：在 OOM 现场先看「进程死在哪一步」——调试计数为 0 说明还没进入 spill，直接把怀疑范围从 I/O 缩到第一个 GEMM 的模块加载。

---

## 9. 代码位置索引

| 主题 | 位置 |
|---|---|
| 启动预编译（ggml + FlashInfer） | `engine/engine.py:497/1698` |
| `--cpu-mem` 规划 | `engine/engine.py:804/1670` |
| 分路径预热（chunked prefill / decode） | `engine/engine.py:1404` |
| GGUF 专家加载（O_DIRECT） | `models/gguf/experts.py:46/90`；`models/gguf/reader.py:150` |
| HostBank 文件后备 / 丢页 / 丢缓存 | `moe/host_banks.py:108/213/222/294` |
| prefill 拷贝 + 页缓存回收 | `moe/offload_cache.py:1253/1267` |
| GGUF MoE kernel | `layers/quantization/moe/gguf.py:97/128` |
| AOT 加载 / 预编译查找 | `kernel/ggml.py:45`；`kernel/utils.py:210/252/292` |
| `ft jit` 命令 | `freetoken/jit.py`；`freetoken/cli.py` |
