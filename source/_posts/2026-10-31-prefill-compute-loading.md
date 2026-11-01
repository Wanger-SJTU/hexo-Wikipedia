---
title: Prefill 计算与专家加载的关系
date: 2026-10-31 22:30:00
updated: 2026-10-31 22:30:00
summary: 从 FreeToken 的 MoE offload 实现出发，拆开 prefill 的"计算"与"加载"两条腿：为什么每层要搬整层专家、什么时候加载主导、chunked prefill 与 OEA 稀疏加载各改变了什么。
navigation: 工程笔记
nav_title: Prefill 计算与专家加载
nav_order: 20
tags: [FreeToken, MoE, prefill, 专家加载, 性能分析]
categories: [技术分析]
---

## 0. 一句话结论

**Prefill 是"算得少、搬得多"的阶段**：每个 token 只路由 top-8/256 个专家（约 3%），但 offload 的 prefill 默认把**整层** 256 个专家都搬进 GPU。于是每层耗时由"加载字节 / 带宽"决定，而不是由算力决定。把加载量降下来（只搬 batch 实际激活的并集）或把它藏起来（双 buffer overlap），TTFT 才会下降。

本文基于 FreeToken 的 MoE offload 实现，讨论三件事：

1. prefill 计算和加载各自是什么、谁在主导；
2. 为什么默认要"整层加载"，以及它和 chunked prefill 的乘法关系；
3. OEA 稀疏加载改的是哪一项，能把 TTFT 从 ~12 s 压到 ~5 s。

---

## 1. Prefill 与 Decode：两种完全不同的负载

| | Prefill | Decode |
|---|---|---|
| 每层 token 数 | 整个 prompt / chunk（几十到几千） | 每请求 1 个（batch 最多 1 行/请求） |
| 矩阵形状 | 大 GEMM（M = token 数） | GEMV（M = 1） |
| 算术强度 | 高，GPU 算力能跑满 | 极低，纯带宽 |
| MoE 专家加载 | 默认**整层**（256 个） | 只加载本步 top-k 命中的专家 |
| 时间主导项 | 加载（offload/spill 时）或计算（全驻留时） | 加载（几乎总是） |

对同一层专家权重，prefill 一次加载可以服务成百上千个 token，decode 一次加载只服务 1 个 token——所以 decode 天然是带宽瓶颈，而 prefill 的加载/计算比取决于**prompt 有多长**。本机场景（14 GiB 内存、18.2 GiB 专家、大部分层 spill 到磁盘）恰好落在"加载主导"的一端。

---

## 2. Prefill 的计算侧

一个 MoE 层的前向：

```
hidden ──► router(top-k=8/256) ──► routed experts: gate/up GEMM ─► SwiGLU ─► down GEMM ─► 加权求和
   └─────► shared expert（始终计算）────────────────────────────────────────────┘
```

计算量只与**被路由到的 (token, expert) 对**有关：

- 15 个 token × top-8 = 120 个路由；
- 去重后实际涉及的专家数 ≤ 256（本例约 83 个）；
- routed FLOPs ≈ tokens × top_k × 3 × H × I × 2 ≈ 15 × 8 × 3 × 2048 × 512 × 2 ≈ **0.75 GFLOP/层**，40 层约 30 GFLOP——在 RTX 3060 上只是毫秒级。

也就是说，**计算不是 prefill 的瓶颈**；它需要的输入却是整整一层专家权重。

---

## 3. Prefill 的加载侧：三种数据来源

| 来源 | 路径 | 带宽量级 |
|---|---|---|
| GPU slot 已驻留（hit） | D2D copy（`--moe-prefill-hit-d2d`） | 显存带宽，几乎免费 |
| pinned host bank | PCIe H2D | ~10–20 GB/s |
| spill file（`--cpu-mem`） | 磁盘 → 页缓存 → H2D | NVMe ~1–3 GB/s |

FreeToken 的 prefill 数据流（非 overlap）：

```
_prefill_routed                     layers/moe.py:364
 ├─ cache.materialize_layer(L)      offload_cache.py:1110
 │    └─ 整层 staging 到 GPU buffer 0（256 个专家全部就位，行号 == expert id）
 ├─ cache.copy_missing()            offload_cache.py:1275
 │    └─ spill 层：整层 pageable H2D；pinned 层：fused copy
 └─ _expert_gemm                    layers/moe.py:459
      └─ grouped GEMM 用 expert id 直接索引 staging，只算被路由到的行
```

有 `--moe-prefill-overlap` 时改为双 buffer：

```
begin_prefill :859 → prefetch_prefill_layer(L+1) :882 （提前搬下一层）
                    … 与当前层 GEMM 并行 …
wait_prefill_layer(L) :1037 → 本层 GEMM
```

OEA 稀疏加载（`--prefill-oea-k0`）：

```
prefill_forward                     layers/moe.py:246
 ├─ oea_select(scores, k, k0)       moe/oea.py:31
 │    └─ 每 token top-k0 baseline ∪ 搭便车 → 返回 union（本 chunk 真正要用的专家集合）
 ├─ _prefill_routed_sparse           layers/moe.py:405
 │    ├─ materialize_experts(union)  offload_cache.py:1117
 │    │    └─ 只把 union 里的行搬到 staging（行号仍是 expert id）
 │    └─ _expert_gemm（ids 只指向 union 内的专家，其余行永远不被 gather）
```

**关键点：加载量从"层的全部专家"变成"本 chunk 激活的并集"。**

---

## 4. 时间模型：一层 prefill 到底花在哪

设：

- `B_layer`：一层需要加载的字节（= 256 × 每专家字节数，或 |union| × 每专家字节）；
- `BW`：对应来源的有效带宽；
- `C_layer`：一层 routed + shared 的计算时间；
- `F`：GPU 有效算力。

则：

```
无 overlap：T_layer ≈ B_layer / BW + C_layer / F
有 overlap：T_layer ≈ max(B_layer / BW, C_layer / F)
整段 prefill：T_prefill ≈ 层数 × T_layer
```

代入本机（Qwen3.6-35B-A3B，UD-Q4_K_M，每层专家 0.456 GiB，spill 读 ~1.4 GB/s，2 GiB pinned）：

| 模式 | B_layer | 估计 T_layer | 40 层 prefill |
|---|---|---|---|
| 默认整层（spill，无 overlap） | 0.456 GiB | ~0.33 s | ~13 s |
| OEA k0=8（union 83/256） | 0.148 GiB | ~0.11 s | ~4.4 s |
| OEA k0=4（union 48/256） | 0.086 GiB | ~0.06 s | ~2.5 s |
| 全驻留 + overlap | PCIe 0.456 GiB @ ~12 GB/s | ~0.04 s（被 GEMM 掩盖） | ~1.5 s |

实测 TTFT（8 GiB cgroup、`--cpu-mem 2GiB`、15–16 token prompt）：**11.4 s → 7.05 s（k0=8）→ 5.08 s（k0=4）**，与"加载字节数"近似成正比。差额来自首 token 采样、KV 分配、以及 spill 读没有完全打满带宽。

---

## 5. 三个读放大来源

### 5.1 整层物化 vs 实际激活

默认 staging 把 256 个专家全部搬进来，而一个 15-token 的 prompt 只用到其中 ~83 个。**加载/计算比 ≈ 3:1 的浪费**。OEA 的 `union` 直接消掉这部分（k0=top_k 时无损：union = 模型自身 top-k 集合的并集）。

### 5.2 Chunked prefill：每个 chunk 都重新搬

`--max-prefill-length`（`max_extend_tokens`）把长 prompt 切成 C 个 chunk，每个 chunk 都是一次完整的 40 层前向：

```
T_prefill ≈ C × 层数 × T_layer
```

所以 chunk 越小，加载次数越多。对 spill 配置，一个 4k prompt 配 `--max-prefill-length 512` 会读 **8 遍** spill 集（~130 GiB），这是 chunked prefill 在 offload 场景下最反直觉的代价。默认 8192 就是为了避免这种乘法。

### 5.3 页缓存：读了不回收

spill 层的数据读进页缓存后不会自动消失；每次 prefill 重新读一遍，页缓存就被重复填满。当前实现会在整层拷贝后 `MADV_DONTNEED` + `fadvise(DONTNEED)`（`moe/host_banks.py` 的 `drop_spill_page_cache`），把一次 prefill 的页缓存峰值从"全部 spill"降到"约一层"。

---

## 6. 策略取舍

| 策略 | 加载量/层 | 计算 | 质量 | 适用 |
|---|---|---|---|---|
| 整层 staging（默认） | 256/256 | 全量 | 无损 | 专家可全驻留，或 prefill overlap 能掩盖 PCIe |
| chunked prefill | 每个 chunk 256/256 | 分块 | 无损 | 长 prompt 限制 activation/KV；**spill 下慎调小** |
| OEA `k0 = top_k` | \|union\| ≤ 256 | 全量 | **无损** | 短 prompt、小 chunk；首选 |
| OEA `k0 < top_k` | \|union\| 更小 | 全量（重路由后） | 有质量代价 | 追求更低 TTFT，需业务侧验证 |

判断加载是否主导，可以看 `B_layer/BW` 与 `C_layer/F` 谁大：**token 越少、top-k 越小、算力越富余，越偏加载主导**。本机的短 prompt 几乎 100% 是加载时间。

---

## 7. 代码索引

| 主题 | 位置 |
|---|---|
| prefill 入口（router → 分支） | `layers/moe.py:246` |
| 整层物化 prefill | `layers/moe.py:364`；`moe/offload_cache.py:1110`、`:1275` |
| 双 buffer overlap | `moe/offload_cache.py:859/882/1037` |
| OEA 选择 | `moe/oea.py:31` |
| OEA 稀疏 staging | `layers/moe.py:405`；`moe/offload_cache.py:1117` |
| 分组 GEMM（只算路由到的行） | `layers/moe.py:459` |
| chunk 大小 | `scheduler/scheduler.py:146/213`（`max_extend_tokens`） |
| 启动 prefill 预热（同样走加载路径） | `engine/engine.py:1404/1449` |

**术语**

- **staging**：GPU 上用于 prefill 的整层专家缓冲区，行号 == expert id。
- **union**：一个 chunk 内所有 token 路由到的专家并集（OEA 下由 baseline 决定）。
- **spill**：`--cpu-mem` 超出 pinned 预算的层，落成文件后备 bank，按需缺页读回。
- **overlap**：搬下一层与当前层 GEMM 并行（双 buffer）。

---

## 8. 小结

- prefill 的计算只碰 top-k 专家，加载却默认搬整层——这是 offload prefill 的核心矛盾；
- 每层耗时 ≈ 加载字节 / 带宽（overlap 时取 max），本机短 prompt 的 TTFT 基本就是"40 × 0.456 GiB / 磁盘带宽"；
- chunked prefill 不减少每层加载量，反而按 chunk 数放大；
- OEA 稀疏加载把加载量从 256 降到本 batch 的 union（无损版 83，激进版 48），TTFT 相应从 ~11.4 s 降到 ~7.0 s / ~5.1 s，且无损版输出与基线逐字节一致。
