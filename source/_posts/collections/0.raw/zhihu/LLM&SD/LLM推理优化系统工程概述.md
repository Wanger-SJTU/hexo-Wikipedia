---
title: LLM推理优化系统工程概述
date: "2024-02-04 00:00:00"
updated: "2024-02-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/LLM推理优化系统工程概述/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/680635901
---


最近看了CMU Catalyst团队23年底出的一篇总结LLM推理加速的综述文章[Towards Efficient Generative Large Language Model Serving: A Survey from Algorithms to Systems](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.15234)，覆盖面还是挺广的，文章从算法和系统工程两个大的视角出发对业界现有工作进行了归纳和总结，最后还提出了对未来发展方向的几点预测。本文主要对系统工程和市面上已有的推理框架进行一些讲解，算是查漏补缺吧，算法部分可以看[Hsword：大模型如何高效部署？CMU最新万字综述纵览LLM推理MLSys优化技术](https://zhuanlan.zhihu.com/p/677635306)这篇文章，讲的很详细了。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0821dc912210.jpg)

推理加速技术分类**

### 系统工程优化

系统工程优化旨在不改变LLM计算语义的前提下进行LLM推理加速，翻译成白话就是不改变模型结构。这一工作的目标是通过改进用于大语言模型推理的底层系统和推理框架来提高系统效率，包括低比特量化、并行计算、内存管理、请求调度和内核优化，下面我们进行逐一介绍。

#### 1. 低比特量化

量化已经不是什么新技术了，通过使用更少的位表示数值来显著地减少内存消耗，加速在硬件平台上的推理过程。传统的量化方法分为Quantization-Aware Training (QAT) 和 Post-Training Quantization (PTQ)，可以简单通过是否需要重新训练来进行区分，经过这些年的发展围绕QAT和PTQ也衍生了很多经典算法，如下图所示，而在LLM时代，PTQ和QAT又焕发出新的活力，成为模型压缩的一大重要技术。
 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_19f4fa5d04ab.jpg)

PTQ主要是对模型权重值和激活值进行INT8/INT4量化，[A Comprehensive Study on Post-Training Quantization for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2303.08302v2.pdf)这篇文章是LLM PTQ的一篇综述文章，介绍对比了RTN、GPTQ、ZQ-Global、ZQ-Local这些算法，其中[GPTQ](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.17323)、[SmoothQuant](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.10438)算法影响力都不小，都可以展开看一看。因为权重和激活值的不同属性有多种精度组合，如W8A16(权重INT8+激活值FP16或BF16)、W4A16、W8A8、W4A4，分别有很多文章来介绍这些类型的量化技术。当然这也是需要硬件来支持，N厂的Ampere架构支持了INT8和INT4的tensor core，Hopper架构支持了FP8的tensor core， 其实也进一步说明了这方面的需求非常旺盛，得到了硬件厂商的肯定。

QAT一般效果是更好的，但是它需要重训模型所以成本会大一些，相关的研究成果相较PTQ也少一些，在fintune阶段会用的比较多一些，例如 [QLoRA: Efficient finetuning of quantized llms](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.14314)、[LLM-QAT: Data-Free Quantization Aware Training for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.17888)、[Memory-Efficient Fine-Tuning of Compressed Large Language Models via sub-4-bit Integer Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.14152)

[LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2208.07339)这篇文章还提到一个值得关注的点，相较于传统的FP16量化，低精度量化方法可能会有更低的推理速度，我们最近也遇到了这个问题，其实对底层的系统实现带来了很大的挑战。

#### 2. 并行计算

利用现代硬件架构的并行处理能力，并行计算方法将计算分配给多个核心或设备，从而在推理过程中实现实质性的加速，主要有两类并行：模型并行和非集中式推理。

模型并行**

大多数模型并行都是应用在分布式训练场景，比如Tensor Parallelism(TP)和Pipeline Parallelism(PP)，不过像[PaLM](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.05102) inference继承了TP的思想是应用在大规模Transformer推理场景的。而Sequence Parallelism(SP)具有多种不同的设计和实现方式，但其针对大型语言模型推理的关键思想，是通过沿序列长度维度将长序列的处理过程拆分到多个GPU上，从而实现计算和存储负载的分布式处理，不过这个的应用相对来说没有前两个这么广泛。

此外不同的并行性技术会引入不同程度的通信开销和计算延迟。为了实现最佳性能和资源利用率，分布式训练中的自动并行性已受到广泛研究，像 AlpaServe, FlexFlow-Serve, SpotServe已经实现了一些自动化策略，有时间可以去实践一下。

<strong>非集中式推理</strong>

非集中式处理方法主要是利用一些非中心化的节点来处理数据进行推理，这个方法面向的场景是计算资源是物理隔离的通过Internet互联的，可以充分利用一些消费级GPU的计算资源，同样也有很多挑战，比如设备的异构特性、有限的计算存储容量、低带宽的网络、容错性、隐私保护等等，目前业界比较成熟的这类系统就是[Petals](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2209.01188)。

**

#### 3. 内存管理

众所周知高效的内存管理是LLM serving一个很大的挑战，随着KV Cache优化变成一个事实标准，对存储的使用需求越来越大。这里主要提三个系统优化，[vLLM](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.06180)使用的pagedAttention优化、[SpecInfer](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.09781)提出的tree attention优化和[LightLLM](https://link.zhihu.com/?target=https%3A//github.com/ModelTC/lightllm)采用的更精细的标记级内存管理机制。但这些优化在提高吞吐量的同时会牺牲一部分请求响应延时，这其实就需要做出一定的取舍，所以这里的挑战仍然很大。

#### 4. 请求调度

高效地调度请求输入推理引擎对于优化LLM服务至关重要。请求调度算法算法旨在最大限度地提高资源利用率，确保在延迟服务级别目标（SLO）内达到响应时间，并有效地处理不同的请求负载。LLM的请求调度和ML的常规调度没有太大区别，主要包括动态批处理、抢占、优先级、交换、模型选择、成本效率、负载平衡和资源分配这些。

早期的LLM 推理框架只支持request-level的调度，比如像fastertransformer这种，ORCA率先提出了iteration-level的调度系统，结合selective-batching输出了更高效的调度能力。后来continuous batching逐步应用到vLLM、TensorRT-LLM(flight batching)和[RayLLM](https://link.zhihu.com/?target=https%3A//github.com/ray-project/ray-llm)上，也成为了事实标准。FastServe则专注于作业完成时间（JCT），并涉及迭代级抢占，优先处理输入长度较短的任务，而不是先进先出策略。[S3](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.06000)包含一个输出序列长度预测器，有助于在GPU内存有限的情况下调度更多并发请求，从而实现更高的推理吞吐量。

#### 5. 内核优化

文章把一些利用硬件特性加速特定操作的优化归纳到内核优化的范畴，主要提出了5点，即内核融合、定制attention、采样优化、变长序列优化和自动编译优化。

内核融合**

内核融合是一个广泛使用的内核优化手段，可以减少内核launch和访存开销，一些推理引擎像FasterTransformer、LightSeq、ByteTransformer都用到了内核融合的技术。常规做法是把相同shape的GEMM进行融合、addBias和其他非GEMM层(残差、LN、Relu)融合、通过CUTLASS将GEMM和一些激活层融合等等。

<strong>定制Attention</strong>

由于attention是transformer-base模型中核心模块，会有很多对它进行优化的成果，比如像融合的MHA kernel。LLM 推理分为prefill和decode阶段，prefill阶段并行地接收prompt，decode阶段逐步迭代生成token。针对prefill阶段，[xFormers](https://link.zhihu.com/?target=https%3A//github.com/facebookresearch/xformers)沿用online softmax思想使用CUTLASS来进行整个attention计算。而decode阶段主流的加速方法就是基于KVCache的FlashDecoding和[FlashDecoding++](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2311.01282)，他们都起到提升GPU利用率、降低访存的作用。

<strong>采样优化</strong>

采样算法的选择会极大地影响LLM的生成质量。并行采样技术已被广泛使用，如beamSearch，通过在每次迭代中维护固定数量的最高得分的序列，解码近似最优序列。各种随机采样技术（例如，top-k，top-p ，温度控制）也层出不穷，通过引入随机性以获得多样化的输出。然而，它们仍然面临着一些实际系统挑战。一个是由冗余的KVCache增加的内存压力，另一个是由于LLM巨大词汇量引起的采样效率问题。[LightSeq](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2010.13887)提供了一种高效的分层实现，将词汇表分成 组，使用几个GPU指令在每个组内检索候选者，然后对这些候选者进行重新排名以获得前 个token。

<strong>变长序列优化</strong>

LLM推理的另一个独特挑战在于，序列的输入长度和输出长度都可以变化，而后者是事先未知的。通常使用批处理的方式来处理请求，然而当一批序列具有可变的输入长度时，还需要使用Padding填充手段，而这会浪费计算和内存资源。为了缓解这些低效情况，[Packing](https://link.zhihu.com/?target=https%3A//github.com/bytedance/effective_transformer)是常用的手段。Packing 将序列存储在连续的内存空间中，无需填充，由于attention计算无法通过连续空间进行，所以在注意力计算之前需要unPacking，在[ByteTransformer](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03052)中有关于Packing和unPacking的详细应用。

<strong>自动编译优化</strong>

大多数现有的LLM推理系统使用NVIDIA 提供的函数库作为其后端，例如cuBLAS、cuDNN和CUTLASS，这些库提供了优化的内核实现。为了进一步提高推理效率，他们还针对NVIDIA GPU上的特定LLM操作（例如，注意力）手动优化内核。尽管有这些工作，使用自动化DNN编译器的趋势仍然存在，例如TVM（即Unity、Relax和TensorIR）、MLIR、JAX、OpenAI Triton、TASO 和TorchInductor。编译方法可以帮助发现潜在的更高效的运算符实现，更重要的是可以促进适应其他硬件平台，包括移动设备和边缘设备、CPU、DL加速器和其他类型的GPU（例如，AMD GPU和Apple M2 Ultra）。

### 推理框架

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1ac0a47a3cfd.jpg)

从并行计算支持方法、迭代粒度、attention kernel实现方案和优先级支持几个维度对常见推理框架进行了对比。然后每家因为出生不同都有一些自身特性。

FasterTransformer是NVIDIA开发的，为了提高GPU的利用率，它手动将attention计算（例如，线性投影、位置偏置、点积、softmax等）融合到一个高性能的内核模板中，并涉及多种内核优化技术，例如shard缓存、warp-shuffle reduce指令、使用了TensorCore的半矩阵乘法累积（HMMA）。

FlexFlow-Serve支持投机解码，并提供基于树的并行解码内核来验证来自多个序列（即来自多个小型模型）的预测token，具有零内存冗余和最大线程并行性。

vLLM继承了FasterTransformer中的融合MHA内核，通过将KV Cache划分为页来消除冗余内存使用。

LightLLM采取了一种后续方法，将KV Cache划分为更精细的token级片段。

事实上这些框架都有自己的优化目标，需要在吞吐量和延时之间做取舍，这就体现出了多样性。比如vLLM主要的目标是吞吐量，而FlexFlow-Serve主要的目标是低延时。此外经济成本也是一个设计和实现的核心目标，谁不想多快好省呢？相信未来这些推理框架会集成更多好用的feature，持续提升系统性能和资源利用率。

### 参考

https://vgel.me/posts/faster-inference/

[Towards Efficient Generative Large Language Model Serving: A Survey from Algorithms to Systems](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.15234)
