---
title: AI处理器架构应该长什么样子？
date: "2025-05-08 00:00:00"
updated: "2025-05-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/AI处理器架构应该长什么样子-e06311/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1903135541765054828
---


### 写在前面

这个问题其实过于宏大了，也没有任何一个人或者一家公司能够有资格100%回答这个问题。

但是当我们着力于思考AI 处理器当下及next 架构应该长什么样子时，会发现业界中很多人已经不约而同在朝着一个方向汇集：<strong>Processor融合DSA</strong>。这个方向在我浅薄的见识中，非常符合我个人的技术审美。

本文会借助Meta的论文描述一下这个架构，再追溯看下Tenstorrent的产品、以及Nvidia GPGPU。会发现一个有趣的过程：NV GPGPU从传统的GPU出发，不断提升自己DSA；而一些之前嚷着要异构计算、专用计算的DSA厂家，又陆续把Processer加回来，将DSA作为其管控的执行单元之一。两条线貌似在不断汇聚。

### Meta（Facebook） MTIA

Meta为了给自己的应用加速，最近这两年做了所谓的MTIA（Meta Inference Accelerator）芯片，并公布了其设计架构，见论文：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_03f21804d71d.jpg)

MTIA论文论文首先介绍了要做这款芯片的原因：

*Meta的数据中心里面，深度学习推荐模型（DLRM）成为主要工作负载之一，其结合了计算密集型的多层感知机（MLP）和内存密集型的嵌入表操作。*

换言之，计算和访存，对于Meta来讲这二者都需求高性能。而我们知道GPGPU在处理推理任务时效率并不理想，因为GPGPU本质上还是通用处理器，在已经训练好的特定的网络上，肯定跑不过NPU/DSA，而且GPGPU可不便宜（NV卡很贵）。

因此，Meta开发了MTIA（Meta Inference Accelerator），这款专用加速器旨在针对DLRM的特定需求进行优化，同时保持一定的通用性和可编程性。

#### 硬件架构

我们来看一下它的架构设计：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_28c87fcf79ca.jpg)

MTIA顶层架构可见：多个PE（Processor Element）组成阵列形式，然后每个边以xbar连到片上memory和外部的DDR。

我们来重点看下PE核内部的设计。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4769f0ed0cab.jpg)

PE内部uARCH<strong>MLU</strong>

memory layput unit。进行数据格式转换的模块。是AI加速器常见的模块，去完成一些类似于：矩阵转秩，Tensor维度转换，以及将Tensor转成一维连续地址存放到memory中（或者反过来）。

<strong>DPE</strong>

Dot-Product Engine，点积计算单元。输入两个Tensor，first Tensor先进，second后进，然后流式和first Tensor的每行做点积。每个cycle能做32*32的int8乘法。

也是AI加速器常见的模块，类似TPU的加速阵列，或者matrix，或者NV DLA的卷积core，相关内容可见我的另一个帖子：[NPU的核心-加速阵列设计详解 - 知乎](https://zhuanlan.zhihu.com/p/22537704473)

<strong>RE</strong>

reduction engine。内置4个独立的存储bank。承接DPE或者reduction network的结果，进入内部的累加器进一步计算。

结合上下文分析，应该就是将卷积或者矩阵运算的partial sum汇聚到该模块做累加，所以它应该和上述的DPE合起来，对标一个标准的卷积core阵列。

<strong>SE</strong>

SIMD engine。SIMD模块用于支持量化、反量化或者一些非线性操作。内置一些查找表和浮点计算单元。线性逼近一些非线性的运算，比如指数函数或者sigmoid，tanh这些激活函数。INT8或者FP16作为输入，INT8或者FP32作为输出；浮点单元去计算一些elementwise的操作，加法、乘法、累加。

虽然取名叫做SIMD，其本质应该类似于DSA中的vector加速单元，处理一些激活函数，特殊函数等。

<strong>LS Mem</strong>

local memory。128KB，映射到系统地址空间，其他core均可访问，上述的5个engine都可以直接访存该memory，属于典型的AI加速器memory设计。为了更好用这块local memory，抽象了一个CB（circular buffer）的概念，每个CB有id，有2个内置寄存器指定CB的start addre和depth，这样的话，访存携带一个offset就可以访问到绝对地址。Fix function可以直接用CB id作为输入输出的操作数（类似于GPR id用法），在解dependency时也直接聚焦到CB和CB之间，而不是再精确到某个绝对地址。

以上6个单元，构成了粗粒度的AI加速Pipeline，比如一个CNN，顺次在这些单元上执行，得到最终结果。这些也是目前AI加速器中基本已经固化的通用部件了，玩不出什么花样，下图所示为NV的DLA框图。现在各家AI芯片公司能做的都是怎么优化出更好的能效、面效，怎么支持更多的典型算子，怎么更好被用起来。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d86f7d97c95d.jpg)

NV DLA开源1.0版本架构图<strong>CP</strong>

command processor。管理local memory和寄存器堆，同时会接收来自两个RV核的指令（CP内置两个独立的Schedule），进行dependency检查、调度，并拆解任务发送到fix function上去执行。PE内或者PW之间的同步atomic操作也在该单元完成。

<strong>RV core</strong>

5级流水、顺序单发射（Andes的AX25定制化），其中一core个核挂载了DLEN=64B的RVV。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7e686928480c.jpg)

Andes AX25结构如果说DSA提供了强大快速的性能，那么集成Processer则是保证了<strong>可编程性、灵活性</strong>。就像论文中提到的，在意料之外的一些新算子，事先没有在DSA上做特定优化与适配，或者是诸如LayerNorm和BatchedReduceAdd的复杂算子，携带vector的Processor就可以派上用场了。

<strong>FI</strong>

fabric Interface。PE对外连接的接口，借助该接口可用DMA方式操作local memory，也支持普通的对外访存，或者外部PE访问当前PE。

<strong>MISC</strong>

- 片上的sram，合计128MB，分到阵列的四边，可以作为scratchpad memory，又或者配置成cache。
- 对外DDR的带宽：176GB/s的理论带宽。128GB的DDR容量。
- 基于AXI的片上网络，支持同行（列）PE之间访存的合并、广播。
- 另外还有一个专用的reduction network，只支持从北到南，从西到东。在PE之间传递partial sums，而不用先存到memory，再从memory搬。

#### 用法举例

论文给了一个例子：FC层常用到矩阵乘法。512*1024,1024*256。示意如何将这个运算分配部署到4*4的PE阵列上，过程讲的怪复杂，但本质就是GEMM tiling。512*1024的矩阵拆成8个（4行2列）128*512的sub matrix，同样1024*256的矩阵也拆分4个（2行2列）512*128的sub matrix。一共会是16次sub matrix乘，扔到这4*4的PE阵列上。PE内的DPE完成乘法计算，partial sum累加再借助RE完成，跨PE的部分和累加则借助上文提到的reduction network传递。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0544026a24d4.jpg)

举例计算一个矩阵乘法
#### 性能收益

论文拿MTIA和NV的A100 GPGPU（以及Intel的NNPI，见：NNP-I 1100  - Intel Nervana - WikiChip）做了对比

- <strong>算子级性能评估</strong>
<strong>FC层性能</strong>

在不同数据类型（INT8和FP16）下，MTIA的FC层性能表现如下：

- <strong>INT8</strong>：MTIA在小批量大小下能效比优于GPU，且随着批量大小增加，性能逐渐接近GPU。
- <strong>FP16</strong>：MTIA和GPU的性能趋势相似，但在小批量大小下MTIA的能效比仍有一定优势。
<strong>TBE操作性能</strong>

在稀疏计算方面，MTIA的TBE操作性能如下：

- MTIA的当前内核实现能达到GPU 0.6x到1.5x的能效比。
- 通过优化软件流水线和指令调度，MTIA的性能有较大提升空间。
<strong>其他操作性能</strong>

BatchMatMul、Concat、Transpose等操作的性能表现如下：

- 当数据位于片上SRAM时，这些操作的性能接近内存带宽上限。
- 当数据位于片外DRAM时，性能因内存延迟而下降，平均效率约为40%。
<strong>2. 模型级性能评估</strong>

论文评估了五个不同复杂度的DLRM模型，包括低复杂度、中复杂度和高复杂度模型。

- <strong>低复杂度模型</strong>：MTIA在低复杂度模型中的能效比显著优于GPU，例如LC2模型的能效比接近GPU的3倍。
- <strong>中复杂度模型</strong>：MTIA在中复杂度模型中仍有一定能效比优势，但优势较弱，因为GPU的软件栈在其他操作（如TBE和算子融合）上更高效。
- <strong>高复杂度模型</strong>：在高复杂度模型中，GPU软件栈在处理大形状数据时更优，MTIA需要进一步优化才能达到或超过GPU的能效比。

### Andes的RV core

Andes和Sifive应该是目前在RISCV领域商业化IP最为成熟完备的两家公司（除中国大陆以外），目前Andes最新的架构已经迭代到了AX45和AX46。附图AX46架构图，其最大的特征是在RV vector单元中额外增加了所谓的AMM，即小型martrix，<strong>这也是Processor+DSA是AI处理器发展方向的有力佐证之一。</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8f5255ef1405.jpg)

Andes（晶心科技）最新的的AX46 core
### Tenstorrent 

硅仙人在Tenstorrent给出的AI芯片架构，其实和上文的MTIA十分类似（MTIA在后，Tenstorrent在前）。网上完整的公开资料较少，官网也没有太多的资料，可以看这一篇帖子的介绍：Tenstorrent芯片架构浅谈_tensix core-CSDN博客

非常明显，也是以core阵列形式组织：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bd102e9539eb.jpg)

多core阵列core内部用了5个riscv的CPU+固定的计算单元协同工作，不过1MB的sram倒是比较吓人的。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_640f1e61ec63.jpg)

T core内部
### Nvidia GPGPU

再回头去看英伟达的GPGPU，会发现H100每个SM的partial内部也是SIMT core + Tensor core。前者是通用化Processor，只不过是SIMT编程模型，是NV自己的ISA而非RISCV，后者则是可以专门用来加速卷积、矩阵计算。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_877946b90482.jpg)

H100每个SM的partial内部是SIMT core + Tensor coreGPGPU还有一个和上文MTIA显著的差异：GPGPU有多层级，不同层级和编程模型层级会有关系，而MTIA是平摊的结构。

不过在MTIA论文的最后，作者也提出后续可能考虑将若干个core打包成cluster，多加一个层级，用来应对不同规模的任务。这其实是向着NV GPGPU结构靠拢了。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b5648e594727.jpg)

论文最后的讨论增加层级
