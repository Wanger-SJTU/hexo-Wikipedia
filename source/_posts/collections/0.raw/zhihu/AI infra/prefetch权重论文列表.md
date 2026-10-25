---
title: prefetch权重论文列表
date: "2025-04-26 00:00:00"
updated: "2025-04-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/prefetch权重论文列表/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1899538967348634456
---


缓存的预取，场景应该针对memory bound。比如模型权重预取（尤其是decoding，KV cache），还有MOE预取等等。

1. CPU到GPU的预取

Deep Learning based Data Prefetching in CPU-GPU Unified Virtual Memory(JPDC23)
找了一些科学计算的case。不过我感觉decoding可能更好。。。

ProMoE: Fast MoE-based LLM Serving using Proactive Caching(arxiv 24)
用了一个“predictor”，没细看，不过和上面直接用神经网络做预测好像不一样。另外MOE的prefetch也挺重要的。

InfiniGen: Efficient Generative Inference of Large Language Models with Dynamic KV Cache Management（OSDI24）
有趣的技术是，如H2O这篇paper（这个是不是很火啊，在flash Tensor里也看到了），KV cache不需要全部都保存，只保存很重要的那部分就行了（有些列就直接丢掉得了）（当然这个和具体在哪个layer有关，前几个layer得少丢点，后面的layer可以多丢弃）

![](https://pic3.zhimg.com/v2-32e29ef5f1f4f686ecf809c84276ba8c_r.jpg)
![](https://pica.zhimg.com/v2-ef355ebb2735f0513381aa802fc2cc86_r.jpg)这是说seq_len和batch小的时候，权重和KV cache差不多，之后就KV cache主导了
2. HBM到L2的预取

PRESERVE: Prefetching Model Weights and KV-Cache in Distributed LLM Serving(arxiv 25)
因为我熟单卡，我对这个挺感兴趣的。

在做allreduce的时候用不到L2（真的吗？我不熟卡间通信细节），所以此时用另一个stream做L2预取正好。如下图：

![](https://pic4.zhimg.com/v2-16b146fdedebf940c49c247e28942aef_r.jpg)华为苏黎世做的，当然是昇腾芯片。

cutlass-example63也是预取。不过是一个GEMM的末尾预取下一个GEMM，这样很容易把L2搞乱。这里是allreduce的时候，反正也用不到L2，正好。

![](https://pic4.zhimg.com/v2-00e0a43205e16dc24e6d2abcf36622a1_r.jpg)图2表明，张量并行度高达16 device足以减少内存需求注意和MLP层连最大的模型下来让它们能够适应现有商用人工智能加速器的二级缓存（在做单GPU优化的时候看来是得考虑上TP呀。。。不能以为一整个模型都在一个GPU上执行。）

![](https://pica.zhimg.com/v2-cf57b487cd4e9ceaf83db97f452aa4b2_r.jpg)算子插入算法1描述了提出的op算子插入算法，用于权值和KV-cache预取。该算法采用计算图和目标硬件平台的L2缓存容量作为输入。然后，该算法在com计算图中找到所有allreduce操作，并遍历这些allreduce op操作。对于每个allreduce操作，算法以宽度优先的顺序访问子节点，直到到达图结束或下一个allreduce操作。对于每一个类型为MatMul或SelfAttention的子节点 children，算法估算预取所需的内存大小，并计算计算所有预取操作的内存大小总和在当前节点和allreduce操作之间。如果a .总内存小于L2缓存容量当前权重或kv缓存的预取操作符节点插入到并行流中以执行allreduce操作。如果总内存大小超过L2缓存容量，则未插入预取操作符，避免缓存被取出算法继续执行下一个allreduce操作。（稍微有点奇怪。。即使超过了，也可以部分预取吧？）

——》我的思路：1. 迁移到GPU上。2. 哪怕不是通信，一些element wise算子也不需要L2复用，干脆跳过L2，省下给GEMM用。

——〉我的疑问：比如decoding里的KV cache，好多个G，L2一般也就80MB，存不下，所以能节省的也只是GEMM里第一波的读取，是吧？

AutoScratch: ML-Optimized Cache Management for Inference-Oriented GPUs
GPU的L2-prefetch技术如何使用。（其实是唯一一篇利用了L2-prefetch NV指令的论文，但是这个在GEMM里有多大作用 没怎么体现出来）本文就是预取，用AI预测一下在哪里预取，没了

Snake: A Variable-length Chain-based Prefetching for GPUs
图形处理单元 (GPU) 利用内存层次结构和线程级并行 (TLP) 来容忍片外内存延迟，这对于内存受限型应用程序而言是一个重大瓶颈。然而，并行线程会产生大量的内存请求，这会增加平均内存延迟，并因高争用而降低缓存性能。预取是降低内存访问延迟的有效技术，先前的研究表明基于步长的预取对 GPU 性能有积极的影响。然而，现有的预取方法仅依赖于固定步长。为了突破这一限制，本文提出了一种新的预取技术 Snake，它基于可变步长链构建，并采用节流和内存解耦策略。Snake 在预取按需内存请求方面实现了 80% 的覆盖率和 75% 的准确率，从而将内存受限型通用图形处理单元 (GPGPU) 应用程序的 GPU 整体性能和能耗提升了 17%。

3. L2到L1的预取

<strong>Alcop: Automatic load-compute pipelining in deep learning compiler for ai-gpus</strong>
真要说的话，multi- stage也可以算是。那就参考MLSYS23的ALCOP。

![](https://pic4.zhimg.com/v2-9ab872d009139a19e53b7641d506e74b_r.jpg)上图解释了multi-stage的概念，更多的stage有助于掩盖smem读取的bubble
![](https://picx.zhimg.com/v2-404e5cc2c594fa6a228ae123837e832b_r.jpg)当然了，也有可能读取还是太长了，TC计算还是存在bubble。理论上更多的stage会有好处。不过也有可能smem不够大

还有一种思路是，每个GEMM因为流水线，天然开头和末尾都有smem读取的bubble。主要是，如果k很大，那每次GEMM的最后一个bubble占比也很小，非要做，只能面向小模型了。并且需要多个GEMM算子融合到一起才方便填补bubble，而GEMM的融合本身也很难搞，没什么应用场景。如果是更小的conv或者科学计算，或许可以试试。

真要是融合，如果把decoding全融合起来，里面对L2预取，L1预取，似乎有很多可以精细做的调优空间。不过工程上感觉很复杂…可以写一个：面向极致的缓存命中优化- decoding场景下的多级预取

还真没见过L1到L0的预取。为什么呢？可能是global到L1太慢了是瓶颈，而L1到L0太快了不会卡住吧？

WaSP: Warp Scheduling to Mimic Prefetching in Graphics WorkloadsWaSP: Warp Scheduling to Mimic Prefetching in Graphics Workloads(arxiv24)
提出一种轻量级的<strong>warp调度器</strong>，通过提前启动部分“优先”warp来模拟预取，将Miss均匀分布在执行过程中以保持数据局部性。此方法无需额外缓存硬件，能显著增加内存并行度并减少缓存阻塞，实验证明在图形渲染应用上可带来约3.9%的平均性能提升

Treelet Prefetching For Ray Tracing(MICRO23)
针对GPU的光线追踪工作负载，提出将BVH树切分为若干“树单元”（treelet）并预取到L1缓存中，利用当前warp中的射线轨迹预测后续访问路径，从而降低遍历延迟。这类专用预取器虽偏向图形渲染场景，但展示了为特定GPU应用定制预取策略的思路。（虽然这是修改了硬件，不过似乎是不是图计算也值得做点prefetch？）

How Does Software Prefetching Work on GPU Query Processing?(damon24)(ccf-none)
Deng等人（2024）在数据库领域研究了常见的<strong>软件预取算法</strong>（如Group Prefetch、SPP、AMAC、IMV等）在GPU哈希连接和B树搜索中的效果。他们利用CUDA提供的`prefetch.global.L1`指令显式将数据预取到L1缓存，以重叠计算和内存访问。结果表明在这些数据分析任务上，软件预取可带来最高≈1.3×的速度提升

4. L1到L0的预取

Lightweight Register File Caching in Collector Units for GPUs(GPGPU23)(CCF-NONE)
Mojtaba Abaie Shoushtary等人提出的Memento（又称Malekeh）是一种针对GPU寄存器文件（RF）的层次化缓存设计。该方案在GPU的操作数收集单元（Operand Collector Units, OCU）上虚拟出一个小容量的寄存器缓存，利用编译器分析的寄存器重用距离信息进行调度和分配，尽量在OCU中保留即将重用的数据。

这个基本搜不到内容。。。