---
title: (2 条消息) 我们预判了DeepSeek-V3.2的性能瓶颈，SparseServe分级内存是最优解，利好超节点
date: "2025-10-01 00:00:00"
updated: "2025-10-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/我们预判了DeepSeek-V3.2的性能瓶颈,SparseServe分级内存是最优解,利好超节点/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1956407490485940573
---


昨天，自带稀疏注意力的DeepSeek-3.2-Exp 模型发布了，而我们为稀疏注意力模型量身定制的 SparseServe关键技术也正好完工。先抛一个问题：大家有没有考虑过像 DeepSeek-v3.2 这种稀疏注意力出来后，对推理系统的根本性改变是什么？我们的预判是：稀疏注意力使推理系统的主要瓶颈从显存带宽转移到了显存容量。而 SparseServe 正是基于这一预判应运而生的。SparseServe 的核心思想是HBM-DRAM分级存储，这将利好超节点，特别是 GPU/NPU + DRAM 内存池混部的超节点。

**

### TL; DR

动态稀疏注意力（Dynamic Sparse Attention，DSA）通过仅计算关键 Token 的注意力来降低长上下文 LLM 推理的成本。然而，我们发现：在引入 DSA 后，推理系统的主要性能瓶颈从 HBM 带宽转移到了 HBM 容量**。原因在于：虽然未被选中的 Token 不参与注意力计算，但其对应的 KV Cache 仍需常驻 HBM，以保证低延迟的解码性能。这一设计限制了并行解码的 Batch Size，从而成为进一步提升系统吞吐量的关键障碍。

**

为突破这一“HBM 容量墙**”，我们提出了 SparseServe。它的核心思想非常直接：**将未被频繁访问的 KV Cache 卸载到 DRAM，以扩展有效的 HBM 容量，从而显著提升并行 Batch Size**。然而，要高效实现这一 **HBM–DRAM 分级机制并非易事，面临多重系统挑战**，包括：碎片化 KV 访问导致的传输效率低、HBM 缓存争用问题，以及混合批处理（Hybrid Batching）带来的高 HBM 占用。

**

SparseServe 针对这些挑战引入了三项关键创新：碎片感知（Fragmentation-aware）的 KV 缓存传输机制：1) 通过 FlashH2D 和 FlashD2H 两个高效算子，显著加速 HBM–DRAM 间的数据移动。2) 工作集感知（Working-set-aware）的 Batch Size 控制：根据实时工作集估算，动态调整 Batch Size，最大限度降低 HBM 抖动。3) Layer-segmented Prefill 机制：将 Prefill 的 HBM 使用量限制在单层范围内，即使面对超长Prompt也能高效执行。在基于 vLLM 的实现和 LongBench 数据集的评测中，SparseServe 相较当前最先进的 LLM 推理系统，实现了 高达 9.26× 的 TTFT 降低，以及 高达 3.14× 的 Token 生成吞吐量提升。

论文题目：SparseServe: Unlocking Parallelism for Dynamic Sparse Attention in Long-Context LLM Serving

论文链接：**  [https://arxiv.org/pdf/2509.24626](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2509.24626)

**

对硬件的启示**：  稀疏注意力大模型非常利好超节点，特别是 GPU/NPU + DRAM 内存池混部的超节点。

**

###  1 Introduction

DSA的背景和瓶颈**：

**

随着复杂推理、文档分析和 Agent 等长上下文应用的兴起，LLM 对长序列的高效处理能力变得愈发关键。为满足这一需求，最新的模型已将上下文窗口扩展至超过一百万个 Token。然而，服务长上下文 LLM 的成本极其高昂。注意力计算的复杂度随序列长度线性增长，每一步解码都需从 HBM 加载完整的 KV Cache。由于 KV Cache 的体积同样线性增长，注意力计算最终受限于 HBM 带宽。

为降低推理成本，动态稀疏注意力（DSA） 被提出。其核心思想是：在注意力计算中，仅关注对输出影响最大的少量“关键 Token”，忽略其余 Token，以减少带宽与算力开销**。具体而言，如图1所示，DSA 将 KV Cache 划分为连续 Token 的块，并为每块维护元数据索引。对于每个 Query Token，DSA 先利用元数据索引估计各块的重要性，再选择 Top-k 个KV块参与近似注意力计算，实现“先选择、再计算”（select-then-compute）的高效推理。

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_6f25a12ab100.jpg)

图1： Dynamic Sparse Attention (DSA) 流程示意图

尽管 DSA 显著降低了带宽开销，但我们发现：推理瓶颈随之从 HBM 带宽转向 HBM 容量**。这是因为，为了在不确定的KV 块选择下仍保持低的 TPOT 延迟，所有 KV 块需要常驻 HBM，即便每步 Decode 仅访问少部分 KV块。这导致 HBM 容量利用率低下，无法通过扩大 Batch Size 来进一步提升吞吐量。

**

分层内存管理的潜力与难点：**

**

将未被访问的 KV 块 分层管理（即卸载到 DRAM，仅在需要时取回 HBM）是缓解 HBM 容量压力的潜在方向。然而，直接卸载会因 PCIe 带宽有限而引入显著延迟，反而降低系统吞吐。要在 DSA 中高效实现分层内存管理，需要解决三个关键问题：

1）碎片化 KV 传输导致 DRAM 访问效率低下**：以 NVIDIA A100 GPU 为例，其 PCIe Gen4 D2H 带宽仅 32 GB/s，而 HBM 带宽高达 1.6 TB/s。DSA 通常采用较小块（如 32 tokens）并按注意力头分别存储，对于LLAMA-3.1-8B 模型，每个注意力头访问的KV块仅约 16 KB。我们使用标准 cudaMemcpy 传输大量小块时，发现实际带宽不足 2 GB/s，远低于 PCIe 峰值，更无法满足高并发场景。

**

2）缺乏高效的 Batch Size 运行时控制：**Batch Size 过小会导致 GPU 资源浪费，过大则引发 HBM 缓存争用，频繁触发 DRAM 回传，吞吐量反而下降。如图 2 所示，当 batch size 从 6 增大到 12 时，吞吐量下降了 1.73×，原因是每次迭代加载的 KV 块数量增加了 21.36×。

**

3) 分块预填充（Chunked Prefill）的高 HBM 占用问题：**为提高 GPU 利用率，现代 LLM 服务系统采用 混合批处理（Hybrid Batching），即在同一 Batch 中并行处理 Prefill 和 Decode 请求。对于长提示，为避免阻塞，输入会被划分为多个 Chunk。但每个 Chunk 的执行都依赖之前所有 Chunk 生成的 KV Cache，因此 Prefill 阶段的 HBM 占用并未减少。对于超长输入，这种依赖关系会导致队首阻塞（Head-of-line Blocking），必须等待其他请求释放足够 HBM 资源才能继续执行。

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_cf3eb047376e.jpg)

图2：在不同Batch Size情况下，基于HBM-DRAM分级推理的吞吐量和KV Block加载数

SparseServe：释放 DSA 的潜能**

**

针对上述挑战，我们提出 SparseServe，一个面向 DSA 的基于高效 HBM–DRAM 分层内存管理的 LLM 服务系统。SparseServe 通过以下三项关键创新，充分释放了 DSA 的并行潜力：

1) 碎片感知的 KV 缓存传输机制：利用 GPU 直连加载（FlashH2D）与 CPU 辅助保存（FlashD2H），显著提高 HBM–DRAM 传输效率；

2) 工作集感知的 Batch Size 动态控制：基于实时工作集估计自适应调整 Batch Size，避免缓存抖动；

3) Layer-Segmented Prefill：将 Prefill 的 HBM 使用限制在单层范围内，保证即便长Prompt也能高效处理。

我们在 vLLM 上实现了 SparseServe，并在 LongBench 数据集上对两种主流长上下文 LLM 进行了评估。结果显示，相较现有系统，SparseServe 将 TTFT 最多降低 9.26×，token 吞吐量最多提升 3.14×，并在不牺牲 SLO 的前提下，显著提升了系统的最大服务能力。

### 2 SparseServe 系统设计

接下来，我们详细介绍 SparseServe 系统的设计。

#### 2.1 系统概览

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2a1d790b5de1.jpg)

图3：SparseServe系统架构图

图 3 展示了 SparseServe 的整体系统架构，由三个关键组件构成：请求调度器（Request Scheduler）、模型执行器（Model Executor） 和 KV 缓存管理器（KV Cache Manager）。

请求调度器（Request Scheduler）：**请求调度器决定在每次迭代中应执行的请求集合。与现有 LLM 服务系统类似，SparseServe 采用动态批处理（Dynamic Batching），并以先到先服务（FCFS）的方式进行调度。此外，SparseServe 集成了 *工作集感知的 Batch Size 控制策略*（§2.3），在维持高 GPU 利用率的同时，避免过度加载 KV 块引起的 HBM 缓存抖动。

同时，调度器还结合了*Layer-Segmented Prefill 机制*（§2.4）：将预填充阶段按层划分为多个段，并在不同批次中逐段执行。该策略有效降低了每次迭代的内存占用与运行时间，使系统能够在长提示输入下维持稳定的服务性能。

**

模型执行器（Model Executor）：**模型执行器负责执行模型的前向计算。对于解码请求，模型执行器用动态稀疏注意力（DSA）替代标准注意力，并根据 Layer-Segmented Prefill 策略跟踪每个批次需要执行的层，跳过不必要的层计算。

在执行过程中，模型执行器与 KV Cache 管理器协同工作：传输新生成的 KV Cache 数据；查询并加载本次注意力计算所需的 KV 块；将选定 KV 块的索引发送给 KV Cache 管理器，触发从 DRAM 到 HBM 的加载操作（§2.2.1）。SparseServe 默认采用 cuboid-mean 方法构建 KV 块元数据索引（因其精度高），但也支持其他元数据构建方式的无缝集成。

**

KV 缓存管理器（KV Cache Manager）：**KV 缓存管理器在 HBM 与 DRAM 之间维护一个分层 KV Cache 体系。为减少碎片化，HBM 与 DRAM 都以固定大小的块组织，并按每个注意力头独立管理 。KV 缓存管理器接收模型执行器产生的 KV 缓存，将其写入 DRAM 中相应的块（§2.2.2）。当一个 KV 块填满后，系统生成其元数据并保存在 HBM 中，用于后续注意力计算。剩余的 HBM 空间用作高频块缓存，采用基于LRU 的替换策略，充分利用连续查询 Token 之间的高余弦相似性，从而提高缓存命中率。

**

#### 2.2 碎片化感知的 KV 缓存传输

SparseServe 的分层存储依赖在 HBM 与 DRAM 间数据的高效 Load 与 Save。但由于 KV  Cache 访问通常在 per Layer, per Head 上进行，访问模式呈现高度碎片化，导致频繁的传输阻塞。为此，SparseServe 引入 FlashD2H&H2D 机制 —— 一种面向 GPU 直接加载与 CPU 辅助保存的碎片感知型传输方法，显著降低了数据移动开销。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_f5478883b6c1.jpg)

图4：(a) 采用 CudaMemory 和 FlashH2D 的 KV Cache加载带宽对比；(a) 采用 CudaMemory 和 FlashD2H 的 KV Cache 保存带宽对比

2.2.1 FlashH2D：GPU 直接加载**

**

在每层注意力计算前，DSA 会基于每个头动态地从 DRAM 选择并加载所需 KV 块到 HBM。传统基于 cudaMemcpy 的加载方式需对每个离散块分别调用 memcpy，导致函数调用次数激增、PCIe 带宽利用率低下，尤其在块数量较多时问题更严重（见图 5）。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7164f509a29d.jpg)

图5：碎片化的 KV Cache 加载示意图

SparseServe 利用 统一虚拟寻址（Unified Virtual Addressing, UVA），使 GPU 核心能够直接访问 DRAM。通过一个融合的 GPU kernel 并行加载所有选定 KV 块，SparseServe 将多次 memcpy 调用合并为一次内核调用：为每个 KV 块分配一个线程块；根据实际选中块数量动态调整线程数；最大化 PCIe 带宽利用率并减少调用开销。如图 4a所示，FlashH2D 将KV Cache带宽从1~4 GB/s 提升到 22 GB/s。

2.2.2 FlashD2H：CPU 辅助保存**

**

在每层开始时，上一层的隐藏状态被投影为形状为 (N, H, D) 的 KV 张量，并写入 HBM 中相应 KV 块。当块填满后，通过独立 CUDA 流异步写回 DRAM，与计算重叠执行。由于这些块在 HBM 中地址分散，直接保存同样面临碎片化问题。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3e6d16d7bcc1.jpg)

图6：FlashD2H 的执行流示意图

GPU 加速保存虽可行，但会与模型计算争夺 GPU 资源，导致执行变慢。SparseServe 的关键发现是：每次迭代生成的 KV 张量在写入块前是连续的。因此，它采用两步式 CPU 辅助保存（图 6）：使用单次 memcpy 将整个连续 KV 张量写入 DRAM 缓冲区；由 CPU 线程将缓冲区数据分发到目标 KV 块。该方法不占用 GPU 计算资源，实现了与模型计算的完全并行，从而显著降低了保存延迟。

#### 2.3 工作集感知的 Batch Size 控制

SparseServe 采用了一种工作集感知的 Batch Size 控制策略在运行时动态调整 Batch Size 。 其核心思想是估计工作集大小 —— 即迭代中所有运行中请求的 KV Cache 所需的总 HBM 容量 —— 是否能容纳在 HBM 内，从而避免缓存颠簸和过度的 KV 块加载 。我们首先介绍如何估计预填充和解码请求的工作集大小，然后描述调度工作流程 。

预填充工作集 (Prefill Working Set)：**预填充请求的工作集是在当前迭代期间存储其 KV Cache 所需的总 HBM 容量 。 这个值可以精确计算，因为预填充过程是确定性的 。 然而，工作集的大小因预填充策略而异 。对于Chunked Prefill，工作集包括所有先前词元块在所有层中的 KV Cache，因为每个块都依赖于先前生成的 KV Cache 。 对于本文提出的 Layer-segmented Prefill（§ 2.4），工作集仅包含一层的 KV Cache，因为所有先前层的 KV Cache 一旦处理完毕就不再需要，可以被驱逐到 DRAM 中 。

**

解码工作集 (Decoding Working Set)：** 与预填充不同，解码请求的工作集大小无法直接计算，因为在每个解码步骤中选择的 KV 块是动态变化的 。 为了解决这个问题，SparseServe 通过利用强的时间局部性来估计工作集大小：连续的查询词元通常会选择高度重叠的 KV 块，如图7所示。 SparseServe 统计过去 w 个解码步骤中选择的 KV 块（默认 w=12），并将它们的并集视为解码工作集 。 

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8bf57ac0d28b.jpg)

图7：前后解码步骤中所访问 KV 块的平均重叠率 （我们将所考虑的前序解码步骤数量称为Window Size）

调度工作流程 (Scheduling workflow)：** 我们通过扩展现有 LLM 服务系统的调度器，在 SparseServe 中实现了工作集感知的 Batch Size 控制，确保与先前设计的兼容性 。 调度器在每次迭代中根据三个输入约束进行操作：（1） $R_{max}$，限制一个 Batch Size 中的最大请求数；（2）$T_{max}$，限制一个 Batch Size 中的词元总数以控制计算工作量，特别是对于预填充请求；以及（3）$M_{avl}$，指定可用的 GPU HBM 缓存容量 。 为了形成一个批次，SparseServe 首先调用现有的调度逻辑来构建一个满足 $R_{max}$ 和 $T_{max}$ 约束的初始候选批次 。 然后，SparseServe 估计该初始批次中每个请求的 Batch Size，并且只有在总 HBM 使用量在 $M_{avl}$ 范围内时才将请求添加到当前执行批次中 。 否则，该请求将被拒绝，其状态将被重置 。

**

#### 2.4 Layer-Segmented Prefill

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_562691b6673a.jpg)

图8：Layer-segmented prefill工作流示意图 （该 LLM 模型由三层组成，每个批次包含三个解码请求和一个 prefill 请求，分段大小设置为 1）

为了在使用 DSA 时同时实现低 HBM 消耗和低 TBT，SparseServe 引入了 Layer-Segmented Prefill，这是一种专为混合批处理设计的新预填充机制 。LLM 由多个层组成，模型的前向传播是逐层进行的 。 尽管对长输入 Prompt 的整个预填充过程可能耗时较长，但单层的执行相对较快 。 这表明我们可以将预填充划分为层段，并在不同的批次中处理这些段，从而限制每个批次的运行时间 。 重要的是，由于输入Prompt没有被分块，每层的 KV 块在预填充期间只被访问一次 。 所有已完成层的 KV 块在保存到 HBM 后可以立即被驱逐，释放的 HBM 空间可以被后续层重用 。 这种设计将预填充的 HBM 占用在任何给定时间都限制在单层之内 。图 8 通过一个运行示例展示了所提出的层分段预填充的工作流程 。

### 3 性能评估

基线（Baselines）：** SparseServe 基于 vLLM  实现，vLLM 采用全量 KV 缓存注意力机制（无稀疏性）。我们将 vLLM 作为性能比较的第一个基线。其次，我们在 vLLM 上实现了动态稀疏注意力，作为第二个基线，称为 vLLM-S。此外，我们通过 KV 缓存卸载进一步增强了 vLLM-S，得到第三个基线，称为 vLLM-SO。我们评估了不同方案的端到端性能，以展示 SparseServe 的效率。

**

对于 SparseServe、vLLM-S 和 vLLM-SO，注意力 KV 缓存的 Token 预算在 LWM-7B 和 LLaMA3-8B 上均设置为 2,048，以确保稀疏注意力的准确率达到全注意力准确率的 99%，这一配置在生产场景中较为典型。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a130b611b8ca.jpg)

图9：TTFT 对比

TTFT（首词元时间）：**图 9 显示了所有系统在不同请求率下的平均 TTFT。在低请求率下，各系统 TTFT 相差不大。然而，随着请求率增加，vLLM 的 HBM 很快被 KV 缓存耗尽，导致新请求阻塞并显著延长排队时间。例如，在 LWM-7B 0.125 req/s 下，vLLM 的 TTFT 比 SparseServe 高 9.26 倍。稀疏注意力使 vLLM-S 可通过更快的解码降低 TTFT，而 vLLM-SO 通过 KV 卸载支持更大批次，在低请求率下进一步降低 TTFT。但在高请求率下，由于 KV 块加载延迟过高，vLLM-SO 的 TTFT 反而高于 vLLM 和 vLLM-S。相比之下，SparseServe 将稀疏注意力与系统级优化结合，在所有请求率下均实现最低 TTFT。

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8c019d57777d.jpg)

图10：吞吐量对比

吞吐量（Token Generation Throughput）：**图 10 展示了各系统的吞吐量。由于 vLLM-SO 在高请求率下运行时间过长，我们将其在 LWM-7B 和 LLaMA3-8B 上的最大请求率分别限制为 0.1 和 0.2 RPS。低请求率下，所有系统吞吐量相近；随着请求率增加，由于 HBM 限制批处理大小，vLLM 和 vLLM-S 的吞吐量达到平台期。稀疏注意力使 vLLM-S 因解码延迟降低而获得比 vLLM 更高的吞吐量。尽管 vLLM-SO 通过将 KV 缓存卸载到 DRAM 支持更大批次，但 KV 加载开销过重，导致吞吐量低于 vLLM-S。SparseServe 始终提供最高吞吐量，相比 vLLM，在 LWM-7B 和 LLaMA3-8B 上分别提升 2.93× 和 3.14×；相比 vLLM-S，分别提升 2.23× 和 2.03×；相比 vLLM-SO，分别提升 2.96× 和 4.24×。

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_15c04be79e6b.jpg)

图11：TBT对比

TBT：** 图 11 显示了不同请求率下的平均 TBT。为了防止 vLLM 请求过度排队，其在 LWM-7B 和 LLaMA3-8B 上的最大请求率分别限制为 0.15 和 0.25 RPS。相比 vLLM，vLLM-S 通过减少注意力计算时间并保持相同平均批处理大小，实现了更低 TBT。vLLM-SO 由于更大平均批处理和高 KV 加载开销，TBT 最大，这与 TTFT 和吞吐量结果一致。SparseServe 通过系统优化有效降低 KV 块加载开销，其 TBT 略高于 vLLM，在 LWM-7B 和 LLaMA3-8B 上均低于 20%，这一轻微增加是合理权衡，因为 SparseServe 显著降低了 TTFT 并提高了吞吐量。

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_31d3cc1c3175.jpg)

图12：Goodput对比

Goodput（有效吞吐量）：** 最后，我们分析 SparseServe 各设计组件对 Goodput 的增量贡献，Goodput 定义为在 SLO（服务等级目标）下可持续的最大请求吞吐量，如图 12 所示。遵循先前工作，将 P99 TBT 的 SLO 定义为解码迭代执行时间的 25 倍，并通过限制请求排队延迟（平均调度延迟 ≤ 2 秒）确保最大输入请求负载的可持续性。以 vLLM 为基础，引入稀疏注意力（vLLM+SA）可通过降低解码延迟，将 Goodput 提升 1.20×（LWM-7B）和 1.13×（LLaMA3-8B）；KV 卸载（vLLM+SA+Offload）通过降低 HBM 占用并支持更大批次，进一步提升 1.33× 和 1.12×；感知碎片化传输（vLLM+SA+Offload+FT）通过加速碎片化 KV 传输并容忍更高缓存未命中率，增益更大（1.88× 和 1.19×）；工作集感知批处理控制（vLLM+SA+Offload+FT+WC）通过防止 GPU 缓存颠簸，贡献额外 1.33× 和 1.11×；最后，层分段预填充（vLLM+SA+Offload+FT+WC+LP）完成 SparseServe，将 Goodput 再提升 1.25× 和 1.10×。总体而言，这些优化使 SparseServe 相比 vLLM，在 LWM-7B 上 Goodput 提升 5.00×，在 LLaMA3-8B 上提升 1.83×。

**

####  4 对未来硬件的启示

基于SparseServe的研究，我们认为 基于HBM-DRAM 分级的KV Cache管理会成为稀疏大模型推理的标配**。而稀疏注意力算法的稀疏度（Total KV Cache / Selected KV Cache）都能做得非常高，比如4~16。那么采用 HBM-DRAM 分级后，只有少量的KV Cache 才需要保存到 HBM 上，**对 DRAM 容量的需求是HBM容量的 N 倍**。另外，KV Cache分级对 H2D 的带宽访问的要求也非常高，比如 HBM层的Miss率在2~5%，那么 **H2D 的带宽需要做到 HBM带宽的 2~5% 才能使 TBT 不会明显增加**。

**

上面的结论非常利好超节点，特别是 GPU/NPU + DRAM 内存池混部的超节点**。前段时间，华为徐总最近发布的一种**昇腾 NPU 和鲲鹏 CPU 混合部署**在相同的 8K超节点中的形态非常适合稀疏注意力分级的场景，**可以实现足够的 DRAM 容量和 H2D 带宽**。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ed014a853bf7.jpg)

华为昇腾超节点发布

### 顺便提下（广告）

华为 CloudMatrix384 已 0 day 适配 DeepSeek-V3.2-Exp ，欢迎大家到华为云上体验。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_82b4a336541c.jpg)