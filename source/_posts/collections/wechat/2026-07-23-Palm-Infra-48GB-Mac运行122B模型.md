---
title: 现在，48GB Mac 也能运行 122B 模型！腾讯优图 Palm-Infra：用图执行、W4 量化与 SSD 专家缓存，重写端侧大模型推理边界
date: "2026-07-23 00:00:00"
updated: "2026-07-23 00:00:00"
layout: post
permalink: /collections/wechat/2026-07-23-Palm-Infra-48GB-Mac运行122B模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 端侧推理
  - ARM优化
  - 模型量化
  - MoE卸载
  - 图执行引擎
---


# 现在，48GB Mac 也能运行 122B 模型！腾讯优图 Palm-Infra：用图执行、W4 量化与 SSD 专家缓存，重写端侧大模型推理边界

**关键词**：端侧推理、ARM 优化、模型量化、MoE 卸载、图执行引擎

---

大模型本地运行的难点，常被简化成一句话：内存不够，算力不够。

Palm-Infra 里的 mollm 给出了一个更工程化的答案：把模型转换成可直接加载的单文件包，把 Python 侧复杂的图构建留在离线阶段，把 C++ 运行时收敛成一次线性图遍历，再用 ARM NEON、FP16FML、dot-product、i8mm、W4/W8 权重量化和 SSD 专家缓存去抠每一毫秒。

当前已支持的模型包括 Qwen3、Qwen3 MoE、Qwen3.5、Qwen3.5 MoE、Youtu-LLM MLA、RWKV7 等。测试最充分的运行路径是 w4g128：它占用内存最少，且具有 mollm 中最快的 decode 速度。若纯 W4 的质量不足，可使用 w4mixg128，它会保留部分敏感 tensor 为 W8。

它最有冲击力的地方，是让 48GB Apple Silicon Mac 跑起 W4 量化的 Qwen3.5-122B-A10B MoE：稠密权重常驻内存，被路由到的专家从 SSD 异步读入，再通过共享缓存和跨层预取隐藏 I/O 延迟。

在 16GiB 专家缓存容量限制下，对比 MoE 模型 SSD 卸载推理的两套缓存调度方案。相比旧逐层均分缓存、无预测策略，全新共享缓存搭配跨层预取机制将专家缓存命中率从 74.5% 提升至 89.3%，解码吞吐由 10.89t/s 上涨至 13.54t/s。

下面是更多性能数据：

Apple M5 Pro、4 线程环境下 molli 与 llama.cpp 的推理吞吐量对比测试，覆盖 FP16、W8、W4 多种量化精度，对 Qwen、RWKV、Yuan 等多款模型，分别统计预填充 Prompt 与 token 解码吞吐速率。蓝色 molli 在绝大多数模型的解码环节性能优势明显。

## 一、快速上手：从模型目录到本地聊天

Palm-Infra 当前核心项目是 mollm，一个面向 ARM CPU 的轻量 C++ LLM 推理引擎，并带有实验性 Apple Metal 后端。

最短使用路径来自项目 README：先构建运行时，再把 Hugging Face 模型目录转换成 .mollm 单文件包，随后用 mollm_chat 启动交互。

```bash
cmake -G Ninja -B build_i8mm -DCMAKE_BUILD_TYPE=Release
cmake --build build_i8mm -j

# W4 转换需要 C++ 辅助量化工具
cmake --build build_i8mm --target mollm-quantize

# 转换 Hugging Face 模型目录为单个 .mollm 包
python3 models/converter.py /path/to/Qwen3.5-4B qwen35_4b_w4g128.mollm w4g128

# 启动本地聊天
./build_i8mm/mollm_chat --package qwen35_4b_w4g128.mollm --threads 4
```

依赖很克制：macOS/Apple Silicon 或 ARM Linux，CMake、Ninja 或 Make，Python 3，以及转换阶段需要的 numpy、safetensors。

量化模式有四类：
- fp16：最直接的基线
- w8pc：int8 weight-only
- w4g128：项目中最强调的性能路径，包更小、decode 更快
- w4mixg128：把部分敏感 tensor 保持在 W8，换取质量稳定性

## 二、整体架构：把复杂性压到离线转换阶段

### 2.1 顶层目录透露的分工

mollm 的目录划分非常清楚：

- engine/：LLMEngine、tokenizer、生成生命周期、Metal backend
- graph/：图格式、图加载、执行器、BufferPool、mmap package loading
- kernels/：matmul、attention、MoE、norm、rope、RWKV、threading、trace
- models/：Python 转换器和各模型族图构建器
- examples/：mollm_chat、mollm_server、mollm_bench、mollm_ppl
- tools/：mollm-quantize 权重量化工具
- tests/：单元、压力、端到端与 benchmark 测试

这套结构背后的思路很像"离线编译 + 轻量运行时"。Python 负责识别模型类型、读取权重、构建图、写出 .mollm 包；C++ 运行时只做加载、调度和 kernel 执行。这样一来，端侧运行时不需要携带庞大的框架依赖，也不需要在推理现场做复杂图优化。

### 2.2 构建系统中的硬件分叉

CMake 配置展示了 mollm 的目标平台：ARM64 是主场，Apple Metal 是可选实验后端，x86_64 只保留 scalar fallback。构建系统会探测 ARM i8mm 支持，满足条件时启用 -march=armv8.6-a+i8mm+fp16+fp16fml。

这里的设计取向很务实：在可用硬件上吃满新指令，在不可用机器上退回 NEON/DOTPROD。

## 三、模型转换：把 Hugging Face 目录变成运行时友好的包

### 3.1 自动识别模型族

入口脚本 models/converter.py 是转换链路的总调度器。它读取 config.json 中的 model_type，再分发到对应转换模块。

推理引擎最怕"运行时才发现模型结构差异"。mollm 把模型族差异放到离线转换阶段处理：不同模型的 attention 形态、MoE 参数、MLA 结构、RWKV recurrent state，都在 Python 图构建器里落成统一的 C++ 图格式。到了执行阶段，运行时面对的是 OpType 与 tensor，而非一堆模型专用 Python 逻辑。

### 3.2 prefill chunk 是转换与运行时之间的契约

转换器默认 DEFAULT_PREFILL_SEQ_LEN = 256。prefill 图内部以 256 token 为 chunk size 构建，但 CPU runtime 支持 dynamic prefill，短 prompt 不会被强行 pad 到 256，除非显式开启 --static-padded。

这点非常重要。端侧推理中，prefill 常常是延迟大头。如果每次短问题都补齐到固定 256 token，用户感知到的首 token 延迟会被浪费的 padding 放大。mollm 的做法是：图里保留符号维度表达，运行时注入真实长度；必要时再进入静态 padding 模式。

## 四、图格式：C++只执行，不在现场猜形状

### 4.1 Graph 是线性拓扑序节点列表

graph/graph.h 里对 Graph 的注释非常直白：Graph 是一个线性、拓扑排序后的节点列表。执行器只走一遍列表，把每个节点派发到对应 kernel。图构建与优化全部在 Python 完成。

这是一种对端侧运行时很友好的设计。它避开了通用深度学习框架的重型 dispatcher，也减少了 runtime shape inference 的复杂度。你可以把 Graph 理解为一张"已经排好队的工单"：C++ worker 不需要讨论任务依赖，只要按顺序取工单、调用内核、释放临时内存。

### 4.2 OpType 覆盖 Transformer、MoE、RWKV 和 recurrent 路径

OpType 里能看到 mollm 的模型覆盖范围：常规 MATMUL、RMS_NORM、ROTARY_EMBED、SDPA，还有 SDPA_MLA、GATED_DELTANET、MOE、SHORTCONV、RWKV7 等。它没有追求 ONNX 那种大而全的 op 体系，反而围绕当前支持模型裁出一组够用、可优化的算子。

这种"模型驱动的最小算子集"有一个直接好处：每个算子都值得手写优化。对端侧 LLM 推理来说，抽象过厚会损失可控性；抽象太薄又会让图构建难以维护。mollm 在中间取了一个工程平衡点。

### 4.3 动态维度用 DimExpr 烘进图

GraphNode 保存 out_shape[4] 与 dim_expr[4]。静态维度直接读 out_shape，动态维度通过 SEQ、MUL、ADD 表达。运行时只要把 runtime_seq_len 注入执行上下文，再调用 inject_runtime_shapes() 即可。

这像是在离线编译时给每个 tensor 贴好"尺寸公式"。运行时不解方程，只代入数值。对 C++ 推理引擎而言，这能降低错误面，也让动态 prefill 的实现更可控。

## 五、执行器：一次线性遍历背后的内存管理

### 5.1 ExecContext 记录后端、线程池、动态 shape 与释放队列

graph/execute.h 中的 ExecContext 是执行器的运行环境，里面包含 Graph、BufferPool、ThreadPool、Backend，以及 profile、trace、workspace reuse、动态 shape 注入字段和 release_queue。

执行前，prepare_execution() 会构建保守的 last-use release queue。执行时，中间 tensor 从 BufferPool 申请，最后一次使用后归还。

对移动端推理来说，这类生命周期管理和 kernel 优化同样重要：算得快但中间内存乱涨，依然会卡在内存墙上。

### 5.2 execute_graph 只做执行与释放

execute_graph() 的注释强调"pure executor, no shape inference"。它会根据 workspace 复用策略清理非 INPUT/CONSTANT tensor，特别注意 view-like op：RESHAPE、PERMUTE、SLICE 可能借用上游存储，不能把借来的指针当成 owner 释放。

这段逻辑代表了 mollm 的另一个主题：它愿意为"少分配、少拷贝、可复用"写很多细节代码。端侧推理里的性能瓶颈常常来自看不见的小分配、临时拷贝和 cache miss，而非单个矩阵乘法本身。

## 六、LLMEngine：prefill、decode 与 KV cache 的生命周期

### 6.1 引擎配置直接暴露端侧关键旋钮

engine/engine.h 中的 EngineConfig 很能说明项目重点：包路径、设备、上下文长度、线程数、权重加载方式、MoE SSD cache、I/O worker、跨层预取、dense weight lock、trace 路径、采样参数都在这里。

其中 moe_ssd_global_cache、moe_ssd_cross_layer_prefetch、lock_dense_weights 是 122B MoE 能跑进 48GB Mac 的关键旋钮。稠密权重被锁住，专家权重按需从 SSD 读，缓存从传统逐层配额改成全局池，预取尝试把下一层可能需要的专家提前搬进来。

### 6.2 KV cache 把 metadata 放进 buffer 头部

mollm 的 KV cache buffer 前 64 字节放 CacheMetadata，后面才是 key/value 数据。这种布局让 kernel 拿到 tensor 时，也能知道当前有效序列长度、最大长度、KV head 数和 head dim。

这是一种低开销的"数据自描述"方式。它避免在每次 attention 调用时额外传一堆上下文参数，也让 cache tensor 在 prefill graph 与 decode graph 之间共享同一块物理存储。

### 6.3 prefill 按 graph_seq_len 分块

prefill 输入可能超过图构建时的 chunk 长度。mollm 的做法是循环切块，每个 chunk 调一次 prefill_chunk()，并逐步推进 past_len_。

这段实现简单，却解决了两个实际问题：图可以按固定 chunk 构建，运行时仍能处理长 prompt；短 prompt 又可以通过动态 shape 路径避免无意义 padding。对聊天场景而言，这直接影响首 token 时间。

### 6.4 decode 是单 token 快路径

decode 阶段每次只处理一个 token：embedding、生成 RoPE cache、构造 causal mask、跑 decode graph、更新 past_len_ 与 cache metadata、最后通过 lm_head 采样下一个 token。

README 中的性能表也印证了这个取向：mollm 在 W4 decode 上很强，多个模型的 decode token/s 高于 llama.cpp 对照。项目自己也承认 dense model 的 prefill 仍是主要优化目标，这种表述很诚实。

## 七、内核层：围绕 ARM decode 重新打磨矩阵乘法

### 7.1 matmul 按精度和平台分派

kernels/matmul.cpp 是仓库里最大的文件之一，承担 FP32、FP16、W8、W4 等路径。

一个典型分派逻辑是：有 NEON 时走 NEON kernel，没有时走 scalar fallback。FP16 路径中，权重是 __fp16*，激活与输出是 float*，这对应推理中常见的"累加保持 FP32"策略。

在 decode 场景里，很多计算退化成 GEMV 或小 M GEMM，常规大矩阵乘库未必最合适。mollm 围绕"单 token、多输出通道、量化权重"的形态写专门路径，解释了它在 decode 上的优势。

### 7.2 lm_head 对 N 维切分

matmul_fp32_range_n 的注释提到：当 N >> M，例如 lm_head 中 M=1、N=vocab_size，按输出维 N 切分更合理。

这类细节说明项目不是只堆 NEON intrinsic，而是从 LLM 推理的具体张量形状出发调整并行策略。这就是端侧推理优化的"颗粒度"：不是简单喊多线程，而是判断哪一维值得切、哪一块值得常驻、哪个临时 buffer 可以复用。

## 八、122B MoE：SSD 专家缓存是项目最锋利的部分

### 8.1 只读被路由到的专家

README 中最吸引人的数据是：Qwen3.5-122B-A10B W4 能在 48GB Apple Silicon Mac 上运行。方法是把始终需要的 dense weights 锁在 RAM，只从包文件中读取被路由到的 MoE expert pair。RAM cache 保存近期使用过的 SSD-backed expert pair，并受 --ssd-cache-mb 控制。

MoE 的稀疏激活特性给了这个设计空间：每个 token 只会路由到少数专家。mollm 把专家矩阵切成可定位的 byte slice，运行时根据 router 结果读取对应专家。这样，122B 的"总参数量"不再等价于"每轮都要常驻内存的参数量"。

### 8.2 request_many 让 I/O 和计算重叠

MoeSsdCache 提供 request_many() 与 acquire() 两阶段接口。

request_many() 在 router top-k 后立即提交缺失专家读取任务，acquire() 到真正需要某个 expert pair 时再等待。两者之间，运行时可以继续做 shared expert 或 cache hit expert 的计算，从而隐藏 SSD 延迟。

具体实现里，request_many_impl() 会去重专家 id，查找缓存命中；没命中的 entry 被 reserve 后进入 I/O 队列。真实请求会更新 active layer 和 miss 统计，speculative 请求则进入跨层预取统计。

这套机制的性能结果很直观：README 给出的 16GiB cache 下，旧的逐层均分 cache、无预测 decode 为 10.89 t/s；默认共享 cache + 跨层预取达到 13.54 t/s，expert-cache hit rate 从 74.5% 提升到 89.3%。SSD 读取量略增，交互 decode 速度却提升，因为更多 I/O 被藏在计算后面。

### 8.3 共享全局池和 Least-Stale 驱逐

传统逐层 cache 配额容易浪费：有些层暂时不需要很多专家，另一些层的路由窗口却很紧。mollm 默认使用全局 RAM pool，配合 Least-Stale eviction 保护当前与未来层的专家。这个策略贴近 MoE decode 的时间结构：当前层马上要用，下一层很快要用，刚过期且未来短期用不到的 entry 更适合被驱逐。

这也是 mollm 价值最高的地方：它把 SSD offload 做成一套可分析系统，把缓存、预取、驱逐、trace 和 benchmark 都放了进去。

## 九、Metal 后端：实验性，但路线清楚

mollm 的主战场仍是 CPU，README 也把 CPU runtime 称为 portable baseline。不过仓库中有 engine/metal_backend.mm、graph/metal_pool.mm、kernels/metal/mollm.metal，CMake 可通过 MOLLM_METAL 打开 Apple Metal 后端。

Metal kernel 里已经出现 Metal 4 tensor API 的 W8A8 GEMM 路径。注释强调 cooperative tensor register layout 在不同编译器间有可移植性风险，因此使用 tensor .load/.store 路径。

这条路线的意义在于未来空间：Apple Silicon 的 GPU/NPU 能力在增强，Metal 4 tensor API 让量化 GEMM 有机会走更高吞吐路径。不过项目 Roadmap 也承认，Metal 的量化 prefill、MoE prefill、CPU/GPU 同步开销仍需优化。

## 十、交互层：REPL 和本地服务都围绕 KV 复用

### 10.1 REPL 中的精确前缀缓存

examples/main.cpp 的多轮对话逻辑并不复杂，却很谨慎。

每轮用户输入后，程序把完整 history 重新套 chat template 得到 token 序列，再与 cached_token_ids 比较公共前缀。如果前缀不匹配，就 reset engine，避免把新 prompt 追加到错误 KV cache 后面。

这里的"精确"二字很关键。文本看起来一样，不代表 token 一定一样；history 重新渲染后若发生差异，KV cache 就不能复用。mollm 选择 token equality 作为缓存正确性的边界，性能让位于正确性。

### 10.2 本地 HTTP 服务的边界也很清晰

SERVER.md 说明服务端是 dependency-free 的本地 baseline，支持 OpenAI compatible chat completions 和 SSE streaming。它串行请求，保留一个 engine KV/GDN state 与上一请求的精确 token prefix。若下一个请求扩展该 prefix，只 prefill suffix；若 divergent，则 reset。

这套策略适合单用户本机体验，也给未来多 session cache 留了路线：engine state snapshot/restore、容量统计、LRU 驱逐、隔离不同会话。项目发布清单中特别提醒：在认证、TLS、请求限制、取消、并发、多 session cache 隔离完成前，不应描述为 production-ready。

## 十一、性能画像：decode 强，prefill 还有空间

README 的基准数据有几个清晰结论：

- FP16：mollm 在 Qwen3.5-0.8B、Youtu-LLM-2B、RWKV7-1.5B 上 prefill 与 decode 都表现强；Qwen3.5-4B 上 llama.cpp prefill 更快，mollm decode 更快。
- W8：mollm 多数情况下 decode 更快，prefill 常被 llama.cpp 领先。
- W4：mollm decode 优势更明显，尤其是小模型和 RWKV mixed W4。
- MoE W4：Qwen3.6-35B-A3B、Qwen3.30B-A3B 的 prefill/decode 对照都很有竞争力；Qwen3.5-122B-A10B 在 48GB Mac 上通过 SSD offload 跑起来，llama.cpp CPU baseline OOM。

这说明 mollm 当前最成熟的定位是：端侧、ARM、低 batch、本地交互、decode 优先。它适合"用户在本机与模型持续对话"的场景。prefill 优化、Metal 量化路径和 serving 级 prefix cache 是它下一阶段的自然增长点。

项目还提供 --trace <path.json> 输出 Chrome Trace / Perfetto 时间线，可以观察 prefill/decode、逐层 MoE routing、expert compute、cache request/acquire、SSD worker 合并后的 pread。这让性能问题从"猜测"变成"看时间线"：哪一层 I/O 没盖住，哪个 worker 队列太浅，哪个 expert cache 命中率不足，都能被定位。

## 十二、从工程视角看 Palm-Infra 的核心价值

mollm 的价值不在于发明某个单点算法，而在于把端侧 LLM 推理所需的多个层面接起来：

- 格式统一：Hugging Face 目录进入 Python 转换器，输出 .mollm 单文件包。
- 运行时轻量：C++ 执行线性图，图构建和 shape 传播在离线阶段完成。
- 内存可控：BufferPool、last-use release、workspace reuse、KV metadata header 降低运行时抖动。
- 硬件贴合：ARM NEON、FP16FML、dot-product、i8mm 与 W4/W8 packed layout 服务于 decode 热路径。
- 超内存模型可运行：MoE expert 通过 SSD demand paging、共享缓存和跨层预取进入端侧交互。
- 可观测：Perfetto trace 把 I/O、路由、计算、cache 行为放到同一条时间线上。

如果把传统推理框架比作一辆功能齐全的重卡，mollm 更像一辆为山路改装过的小车：载重有限，但底盘、轮胎、油门响应都围绕具体道路调过。它没有覆盖所有模型，也没有把 HTTP server 包装成完整生产系统；它把精力集中在"ARM 本地跑大模型"这件事上，并且把 122B MoE 的门槛从数据中心级内存拉到了高配个人 Mac。

更深一层看，mollm 体现的是端侧 AI Infra 的一个趋势：模型能力继续变大，设备内存增长有限，推理系统必须学会让 RAM、SSD、CPU SIMD、GPU tensor core、离线转换器和运行时缓存共同工作。单纯压缩权重不够，单纯 mmap 也不够；真正可用的系统需要知道哪些权重总会用、哪些专家马上会用、哪些读取可以提前发、哪些 cache entry 该被保护。

Palm-Infra 目前还很年轻，README 中也列出了明确路线：优化 dense model prefill、改进 Metal 性能、实现 serving workload 的完整 prefix cache、扩展更多模型系列和视觉模型支持。

即便如此，mollm 已经提供了一个很有参考价值的样板：端侧大模型推理可以用一套小而硬的系统，把模型格式、执行图、内核、缓存、I/O 和观测工具打通。它的突破点不只在"跑得快"，更在于让开发者看见一条可复现、可调试、可继续优化的本地大模型工程路径。

## 参考资料

- SERVER.md: https://github.com/TencentYoutuResearch/Palm-Infra/blob/main/SERVER.md

原文链接: https://mp.weixin.qq.com/s/1Xcaj2LlthvMSnUDAq3I3Q