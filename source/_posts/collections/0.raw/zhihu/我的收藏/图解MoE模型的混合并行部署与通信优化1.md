---
title: 图解MoE模型的混合并行部署与通信优化1
date: "2026-03-24 00:00:00"
updated: "2026-03-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/图解MoE模型的混合并行部署与通信优化1/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2019814309815927081
---


随着大规模混合专家（MoE）模型在在线推理中的应用不断扩大，Fine-Grained MoE 模型逐渐成为核心服务模型，理解推理过程中 MoE 推理过程中的计算流程有助于看懂当前主流推理框架的优化点，为了简化问题我们先考虑非 Hybird-Attention 架构的模型来对计算通信计算流程进行剖析，在此声明，本文以看图为主。

### <strong>单卡推理 MoE 模型</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_56a0580ac378.jpg)

图1. Transformer Block with MoE Module 示意图![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bd468eec2b0f.jpg)

图2. 图解MoE GEMM 计算流程如图2所示，整体MoE相比于之前的FFN来说会多几块， <strong>a.</strong>通过activation计算得到选择的专家；<strong>b. 增加</strong>map between token and expert 模块用于activation到真实Expert 的输入进行Dispatch；<strong>c.</strong>依据 map between token and expert 模块 用于Expert 输出的Combine。

整体流程还是非常清晰的，并且在图中介绍了DeepGEMM 中 Layout 的引入，也可以更好的理解为啥需要有Masked Layout和Contiguous Layout两种模式的支持：

<strong>Contiguous Layout：</strong>在 Prefill 或训练前向阶段，由于不同专家接收的 token 数量不一致，系统会将各专家的 token 按顺序拼接为一个连续的输入 buffer（contiguous layout），并通过 offset/index 进行逻辑划分，每个专家必须对齐到M块大小，可以为128，最大化 Tensor Core 利用率（避免尾部不对齐带来的低效计算）。

<strong>Masked Layout：</strong>在 Decoding + CUDA Graph 场景下，由于 expert-token 分配在运行时动态变化且无法被 CPU 感知，我们采用 mask-based grouped GEMM 方案替代传统的显式分组，可兼容 CUDA Graph，没有冗余的计算浪费，通过更精细的控制可以获得更好的性能。

### 多卡并行推理 MoE 模型

#### 多卡 TP 推理 MoE 模型计算流程解析

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e4868fcd89a6.jpg)

图3. MoE 类模型一层Transformer Block的通信示意图，可以看到一层Block存在两个All Reduce，另外在一次模型推理过程中会有两个AllGather图中展示了一个基于 Tensor Parallel（TP）的 MoE Transformer 推理流程，计算在 GPU0 和 GPU1 之间对称展开。

输入 token `[B, S]` 进入 Embedding 层，词表维度按列切分到不同 GPU，每个 GPU 生成 `[B, S, H/k]` 的局部表示，通过 All-Gather 拼接成完整的 `[B, S, H]`。

进入 Attention Block 后，先进行 RMSNorm 和激活，然后 QKV 投影按列切分，每个 GPU 只计算部分 head（`h/k`）。Q、K、V 经过 RoPE 后执行 Scaled Dot Product Attention，整个注意力计算在本地完成。随后通过线性输出投影（行切分）得到部分结果，并通过 All-Reduce 聚合为完整输出，再与残差相加。

Feed Forward 层采用 MoE 结构。输入经过 RMSNorm 和激活后进入 FusedGateGroupedGEMM，执行 Gate 和 Up 投影，并通过 SiLU(Gate(x)) * Up(x) 形成中间结果，再经过 DownGroupedGEMM 投影回隐藏维度。各 GPU 仅计算自身分片的专家权重，最终通过 All-Reduce 聚合输出，并与残差连接。

上述 Attention 和 MoE Block 重复堆叠 N 层。

最后进入输出层（Tokenizer Decode），权重按列切分生成 `[B, S, V/k]` 的局部 logits，通过 All-Gather 拼接为完整 `[B, S, V]`，再进入采样层生成最终 token。

#### 多卡 EP 推理 MoE 模型计算流程解析

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7db0c08b4c67.jpg)

图4. 8GPU或者4GPU混合并行部署架构示意图图中展示了一个在 4 张 GPU 上运行的混合并行架构，采用 TP（Tensor Parallel）+ EP（Expert Parallel）+ DP（Data Parallel）的组合方式。

上半部分给出了并行拓扑，每张 GPU 对应不同的 DP、EP、TP 组合位置，例如 DP0/EP0/TP0 到 DP1/EP1/TP3，表示在数据并行、专家并行和张量并行三个维度上的划分关系。

下半部分展示了具体计算流程。输入数据按 batch 划分为 Batch 0 和 Batch 1，分别进入 DP0 和 DP1。每个 DP 内部执行 Attention 计算，Attention 层在 TP 维度上拆分为 TP0 和 TP1 两部分，分别计算后通过 All Reduce 聚合。

Attention 输出进入 Dispatch 模块，将数据按路由分发到不同专家。

在 EP Group 中包含多个专家（MoE EP0 到 EP3），每个专家独立处理分配到的 token。处理完成后，通过 Combine 模块将各专家输出合并。

最终结果分别输出回对应的 Batch（Batch 0 和 Batch 1）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bdd0aa0d5027.jpg)

图5. EP 部署计算流程解析相比于单卡部署的Dispatch和Combine模块中，多了Rank维度，由之前的Token 2 Expert 和 Expert 2 Token 多了Rank to Token 的维度，那么也就是需要将对应的Token Dispatch 到 其它的专家GPU上，此时因为传统的NCCL（区别于NCCL-EP工作） 对于All2All 支持不够友好，所以需要有DeepEP的优化引入，仔细理解此图能够对EP并行有更清晰的理解。

### 多卡TP并行推理 MoE 模型通算融合优化

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f855a5b9606f.jpg)

图6. AllReduce 推理优化拆解为Reduce-Scatter + All-Gather示意图![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_19ca4127b741.jpg)

图7. TP并行 AllReduce 拆解为 Reduce Scatter + All Gather 的示意图依据图6和图7所示，优于All Gather 可以拆解为Reduce Scatter + All Gather，所以我们可以将Reduce Scatter 和 All Gather 分别和其最近的GEMM相结合，然后在GEMM计算过程中利用通信单元空闲的特性，来进行Overlap，具体可以参考Comet文章，这个地方值得注意的是，在第一层的Attention QKV GEMM和最后一层的Moe FFN Out Down GEMM 是没法做Overlap的，并且需要仔细考虑为啥通信转移后，中间的其它操作不会影响最终的结果。

### Conclusion & Future Works

结合上述对计算流程的分析，希望一定程度上能够帮助大家理解一些通信优化工作，后续将持续对通信或者通算融合相关工作持续进行关注，比如 Flux，Comet，Triton-Distributed，Parallel-Kittens，Deep-EP，Hybird-EP，NCCL-EP 等通信工作进行分析。

*<strong>最后附一张MetaShuffling 16 GPU 混合部署的结构图，对应优化内容可以看官方文档 [MetaShuffling: Accelerating Llama 4 MoE Inference](https://link.zhihu.com/?target=https%3A//pytorch.org/blog/metashuffling-accelerating-llama-4-moe-inference/)</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c651c73c3b24.jpg)

图8. Meta Shuffling 优化方案多GPU混合部署示意图**

### Reference**

[1] [[2406.06858] FLUX: Fast Software-based Communication Overlap On GPUs Through Kernel Fusion](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.06858)

[2] [[2502.19811] Comet: Fine-grained Computation-communication Overlapping for Mixture-of-Experts](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.19811)

[3] [FlashCommunication V2: Bit Splitting and Spike Reserving for Any Bit Communication](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2508.03760v1)

[4] [Reducing Tensor Parallelization Bottleneck for Fast Large Language Model Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2412.04964)

[5] [[2408.12757] NanoFlow: Towards Optimal Large Language Model Serving Throughput](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2408.12757)

[6] [GitHub - NVIDIA/nccl: Optimized primitives for collective multi-GPU communication](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/nccl)

[7] [Demystifying NCCL: An In-depth Analysis of GPU Communication Protocols and Algorithms](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2507.04786v1)

[8] [NVSHMEM | NVIDIA Developer](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/nvshmem)

[9] [MetaShuffling: Accelerating Llama 4 MoE Inference](https://link.zhihu.com/?target=https%3A//pytorch.org/blog/metashuffling-accelerating-llama-4-moe-inference/)

[10] [DeepSeek-V3 Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2412.19437)