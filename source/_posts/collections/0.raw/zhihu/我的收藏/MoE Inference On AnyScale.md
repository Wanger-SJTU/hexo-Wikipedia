---
title: (2 条消息) MoE Inference On AnyScale
date: "2025-03-07 00:00:00"
updated: "2025-03-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/MoE-Inference-On-AnyScale/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/28680264165
---


### Expert Parallelism推理优化探索之路

近年来，混合专家（Mixture-of-Experts，MoE）架构在大语言模型领域取得突破性进展，模型参数量级从数亿跃升至万亿级别。以DeepSeek V3/R1为代表的稀疏化MoE架构通过动态激活子网络显著降低训练成本，但其在推理阶段面临严峻挑战：当面向大规模并发用户服务时，现有的分布式推理框架难以有效支撑MoE架构的独特需求。

当前主流推理框架（如vLLM、SGLang）依赖张量并行（Tensor Parallelism，TP）技术，这种源自稠密模型的设计范式在MoE场景中暴露显著局限：TP很难增大推理的batch size，使得专家部分计算遇到内存瓶颈（memory-bound）。

由于张量并行有着根本的局限性，我们认为在大规模MoE推理需求下，专家并行（Expert Parallelism, EP）是更适合作为部署策略。EP通过将不同专家模块分布式部署，增大每个专家的batch size，使得计算资源的利用更加高效，特别适用于MoE架构下的推理任务。DeepSeek团队的arXiv论文也同样印证了这一点，他们同样在推理场景中采用了EP，以提升性能。然而，目前主流开源框架对EP的支持仍较为有限，缺乏针对MoE推理优化的完整解决方案。

基于此，我们团队致力于开发高效的MoE分布式并行推理框架，以提升EP在实际应用中的可用性。当前，我们已基于SGLang框架实现了支持AlltoAll-based EP版本，并在DeepSeek-R1模型上完成了初步实验验证。实验结果表明，在32卡NVIDIA A100 GPU集群环境下，我们的EP实现相比SGLang框架的原生方案，将DeepSeek-R1模型的推理吞吐量提升了30%以上。这一结果验证了EP的有效性。未来我们将继续通过blog分享研发进展，并开源相关实现，敬请关注。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8d6fae6f072c.jpg)

图1 单层MoE的并行策略对比
#### 为什么传统TP方案难以支撑大规模 MoE 推理？

如图1左边所示，TP的基本思路是将模型参数切分到多个 GPU 进行计算。面对参数量大幅增大但计算量不变的MoE架构，TP 方案暴露出两大核心问题。

随着TP size的增大，通讯会逐渐成为瓶颈。假设每次推理一个batch里一共有 S 个token，hidden dimension是 D，那么对于TP每一个MoE层每个GPU需要发送 2 \cdot S\cdot D 大小的数据，通讯量并不会随着TP size的增大而降低。

同时，TP的部署方式使得每个GPU上都需要AllReduce来聚合所有input tokens的activation，极大限制了推理的batch size。有限的batch size使得每次推理时，每个专家分到的token数量极其有限，使得专家的计算从compute-bound变为了memory-bound，大大降低了GPU的利用率。同时由于专家负载的不均衡性，较小的batch size甚至可能会导致单次推理时只有部分专家被激活。然而，TP 方案要求所有 GPU 加载全部专家的参数，即使某些专家未参与计算，也会占用显存资源。

因此，面对超大参数量 MoE 模型以及大规模推理场景，传统 TP 方案有着巨大的本质上的局限性。

#### Expert Parallelism (EP)：实现高效的大规模MoE推理关键

EP 方案为大规模 MoE 推理提供了一种全新的并行思路，能够有效解决 TP 方案的两大核心问题。

在通信开销方面，EP 采用 All-to-all 原语进行数据交换。在EP size增大的情况下，EP能大幅降低计算相同数量token的情况下单个GPU的通讯开销。同样以一个batch一共包含 S 个token为例，假设每个token需要选择top-k 的专家，以及专家之间负载平衡的话，那么每个GPU在token分发（dispatch）和重组（combine）两个阶段各需要发送 \frac{K\cdot S}{M}\cdot D 大小的数据，其中M是EP size。考虑dispatch和combine两阶段的通讯，当 \frac{K}{M} \ll 1 时，EP的通讯开销会远低于TP。

EP同时使得每个GPU可以计算不同的input data，而不需要像TP一样在每个GPU上处理相同的token并聚合 activation，EP可以极大的扩展batch size，使得每个专家都能分到足够数量的token，解决memory access的bottleneck。

**DeepSeek 技术报告的启示：**DeepSeek 在其技术报告中也推荐使用基于 Alltoall 操作的 Expert Parallelism 方案在大规模 MoE 模型推理中展现出了显著优势。在 Prefill 阶段，DeepSeek 采用 EP=32 的并行策略，将 256 个专家分散到 32 个 GPU 上，以确保每个 GPU 具有足够大的 batch size，从而提高计算效率。在 Decode 阶段，DeepSeek 采取 EP=320 的并行方式，每个 GPU 仅保留一个专家。通过这种动态分配策略，DeepSeek 能够周期性感知热点专家，并为其分配更多计算资源，从而显著提高了整体 GPU 资源利用率。上述实践也佐证了EP方案对MoE模型推理的重要性。

**填补开源空白：** DeepSeek虽然在报告中揭示了EP重要性，**但目前开源社区里还缺乏开源的基于All-to-all的EP推理框架**，我们希望能够填补这一空白，并认为EP有望成为未来大规模模型推理的重要方案之一。我们的方案不仅支持A100上BF16和INT8精度，还正在适配H100等新一代硬件平台，具有良好的扩展性。相关结果和代码将很快在后续blog中发布。

#### DeepSeek R1的推理加速初步结果

我们以SGLang为基础，开发了一个初步的基于All-to-all的EP推理框架原型。并取得了初步成果：

- **Prefill阶段优化：** 我们在Prefill阶段实现了显著的性能提升，为后续的推理优化奠定了坚实基础。具体来说，我们优化了数据加载和预处理流程，并实现了高效的GPU内存管理，从而减少了Prefill阶段的时间开销。
- **性能提升显著：** 我们的初步测试结果表明，与SGLang基于TP的实现相比，我们的方案在吞吐量上提升了30%。我们的测试使用了32个A100 GPU集群进行测试，以及DeepSeek-R1模型，BF16精度。
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b8788fc8bd37.jpg)

#### 近期的开发计划

EP 方案的潜力远不止于此。不过EP也面临着一系列全新的问题，例如DeepSeek报告中所提到的负载不均衡，需要动态的优化。同时，EP也并不是在任何场合中都是最优的方案，小规模时TP由于更小的通讯开销和GPU计算负载较为均衡，可能为更优的方案。EP和MoE模型的这些问题都对现有的推理系统提出了巨大的挑战。我们将持续探索更高效的MoE推理优化策略，我们目前主要关注以下方向：

**底层通信优化**：我们的框架也集成了 DeepEP 高性能通信库，DeepSeek自研的 DeepEP 高性能通信库针对 Alltoall 操作进行了深度优化。下一步将在更大规模GPU集群下进行验证end-to-end性能，提升 GPU 数据传输效率。

**PD分离架构**：我们计划预填充与解码分离，实现并行策略自动优化。目前的优化主要集中在 Prefill 阶段，未来，我们计划将预填充（Prefill）与解码（Decode）阶段分离，针对不同阶段的特点进行自动优化。例如，在 Prefill 阶段，采用更激进的并行策略以最大化吞吐量，而在 Decode 阶段，采用更精细化的策略减少延迟，提高响应速度。

**EP的分配和调度**： 我们将基于DeepSeek的EPLB，研究动态专家分配与调度，基于负载情况的动态专家调度策略，为热点专家分配更多资源，提升推理效率，并实现细粒度的专家扩容机制，以适应突发流量。

随着 DeepSeek 等超大规模模型的不断演进，Expert Parallelism 将成为大规模 AI 推理的核心技术之一。我们将持续探索和优化 EP 方案，助力 AI 模型突破性能瓶颈，为更高效、更智能的 AI 计算提供强大支撑。敬请期待我们的后续更新和开源！

本博客由来自加州大学伯克利分校，新加坡国立大学，中国科学技术大学，穆罕默德本扎耶德人工智能大学，中科类脑，合肥综合性国家科学中心人工智能研究院 的研究者合作完成（注：单位排名不分先后）