---
title: "无问芯穹计算通信重叠新范式——FlashOverlap技术解析"
date: "2025-04-28 00:00:00"
updated: "2025-04-28 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/无问芯穹计算通信重叠新范式——FlashOverlap技术解析/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1897633068380054002"
---


前言
FlashOverlap是由无问芯穹推出的计算通信重叠工作，不同于目前主流的基于张量切分和算子融合的方案，我们提出了基于控制信号的计算通信重叠新思路，主要出发点在于提供一种低侵入矩阵乘法，无侵入通信的方式完成细粒度计算通信重叠，可以无缝适配矩阵乘法和各种常见的通信原语，包括不限于AllReduce、ReduceScatter、All2All等。<strong>对于通信瓶颈显著的低端消费卡来讲优化效果尤为明显，可以达到高达1.65倍的性能提升。</strong>欢迎大家关注。
开源仓库地址：[https://github.com/infinigence/FlashOverlap](https://link.zhihu.com/?target=https%3A//github.com/infinigence/FlashOverlap)
技术报告：[https://arxiv.org/abs/2504.19519](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.19519)

背景

说起计算通信重叠，这也是我最近几年一直关注的内容，24年我和北大的博士生陈畅同学合作的Centauri也是计算和通信重叠的工作。不过Centauri更偏向于训练系统，今天要讲的FlashOverlap则更关注和聚焦在一个计算操作后面跟着一个和计算结果存在依赖的通信操作这样的场景（Overlapping Communication and Dependent Computation）来做重叠。我们知道随着LLM的流行，以及模型尺寸的不断增加，单个GPU往往无法放得下模型权重，因此不管是大模型训练还是推理，都需要多GPU并行。具体地说，常见的并行方式包括数据并行、张量并行、流水并行、序列并行和专家并行。<strong>虽然我们不喜欢通信，但是通信是并行的代价。</strong>除了流水并行直接调用send/recv点对点通信之外，其余的并行方式往往需要配合集合通信，常见的包括AllReduce、ReduceScatter、AllGather和All2All。这些集合通信在端到端的执行中一般占用着不可忽略的时间，往往在10-40%不等。

该怎么进行重叠呢？
我们把目前学术界主流的相关工作分了两大类。

- 第一类工作工作是基于张量分解的，将有依赖的计算和通信操作分解为多个子操作，然后将子操作流水起来。例如矩阵乘法产生张量T，通过将原本的一个矩阵乘法变为N个子矩阵乘法 Com1,Com2,Com3,...,ComN ，产生将其分解为 T1,T2,T3,...,TN 个子张量；接下来将原本针对张量T的一次通信，分解为针对子张量的N个子通信 Comm1,Comm2,Comm3,...,CommN ，分解之后第K个矩阵乘法就可以和第K-1个通信操作进行Overlap。典型工作包括CoCoNet、Domino等。当然这里对切分有要求，切分后的子张量，必须在显存上连续存储，这样才能直接调用NCCL来通信。这种切分会带来两种后果。首先，为了保证切分出来的矩阵乘法结果的连续性，切分维度受限，难以支持Tile粒度的重叠。其次，切分往往会损害计算的性能，我们都知道GPU针对大矩阵计算才能充分利用其算力资源，切分成后的小矩阵乘法可能无法打满GPU，从而最终使得子矩阵乘法的计算耗时本身就比原先的矩阵乘法大。
- 第二类工作是基于算子融合的，这类工作通过将计算和通信融合为一个算子，发掘Tile之间的依赖，在Kernel内部实现细粒度的通信和计算重叠。典型工作包括SC24上的Optimizing Distributed ML Communication with Fused Computation-Collective Operations，以及Flux、Comet和TileLink等。此外，NVIDIA官方也亲自下场做了cuBLASMp支持计算和通信融合。<strong>然而，算子的融合会打乱原本精心设计优化的矩阵乘法和通信算子，对原先矩阵乘法和通信算子的侵入较大，需要非常细致的优化和调整，因此往往开发难度大，耦合带来的复杂度高。同时，针对不同的通信原语还要专门进行不同的开发和调优。</strong>

我们指出一个低开发成本高性能收益的计算和通信重叠方案，需要满足以下三个方面：
1）支持Tile粒度的重叠和调度，以最大化重叠效果
2）重叠方案要尽可能少的侵入计算部分，以最小化对计算部分的伤害
3）重叠方案要尽可能对不同的通信原语和基于拓扑的优化技术正交，以最小化对通信部分的伤害，以及最小化不同通信原语的适配成本
为此，我们提出一种基于信号的计算通信重叠技术，可以完美契合上面提到的三个准则。
方法Tile-wise调度计算侵入性通信正交性基于张量分解的方法❌❌✅基于算子融合的方法✅❌❌基于信号的方法✅✅✅
基于信号的计算通信重叠方法

如何能减少对计算的侵入性，同时又能和通信都正交呢，我们的核心idea是，<strong>如果计算Kernel能够在完成一部分计算结果之后自动发出一个就绪的信号，然后接收到该信号之后我们发起一次针对就绪部分数据的NCCL的通信，这样就好了</strong>。想起了高中老师的经典名句“答案其实简单，做对太难”，我们想的很美好，怎么实现呢？接下来，为大家展开FlashOverlap中核心技术的介绍：

一）首先，基于信号的计算通信重叠的实现机制是什么？
我们使用两个Stream，一个Stream里是计算，另一个Stream里是通信。我们在计算Kernel里轻量的加入一些Flag变量，当“部分计算结果”算完之后，我们将其对应的Flag置为True。与此同时，另外一个Stream里我们首先插入一个用于等待阻塞的Kernel（几乎不占用计算资源），当该Kernel读到Flag置为True之后会退出，然后紧跟其后的通信算子被调用。我们先放一个实际的Timeline，来进一步展示该机制和重叠效果。

![](https://picx.zhimg.com/v2-97d926bd2579fcf5177e9bd27d364e53_r.jpg)图1. 实现机制和效果图
上图中计算流为我们轻量化加入Flag信号的cutlass kernel，通信流中被打碎的通信部分，每一个NCCL通信之前有一个阻塞Kernel等待数据就绪，看起来这个重叠效果非常完美。

二）介绍了机制，我们上面含糊的讲了“部分计算结果算完”，接下来我们来展开这个部分计算结果是怎么定出来的。

1）首先最直观和简单的设计是，每个Tile算完，我们就把结果发出来。稍微简单科普定义一下这里的Tile，Tile是矩阵乘法和其他重要计算在CUDA实现中的一个基本并行单元，如下图2所示，结果矩阵C被分为多个Tile。如果每执行完一个Tile就发的话，NCCL的通信都在发送小数据，性能不友好，通信带宽利用率低，效果肯定不会太好，另外也没啥调度和优化空间可言。

![](https://pic2.zhimg.com/v2-eecf7ed93025db0a30fa4fbd4dcd1cfb_1440w.jpg)图2. 典型矩阵乘法分块算法和Tile示意图

2）所以我们需要积攒多个Tile一起，不过由于这些Tile的数据需要一起发，这些Tile就要求数据连续。然而Tile（Block）的执行顺序和完成顺序往往和物理内存上的连续性无法完全一致（再考虑到Block Swizzle是目前优化矩阵乘法的一个重要方式，会使得这一问题更加显著）。图2中假设了一种Tile的选取策略，选中了图中深绿色的Tile为一组，一起发送（这里仅作为示例）。然而，为了保证可以无缝使用NCCL来发送，我们需要将本来在显存上是按照图中方式分散排布的情况，改成这四个Tile连续存储。当然，NCCL通信之后这些数据仍然是连续的。

3）为了保证后续计算的正确性，我们引入一个Map Table来记录每个Tile应该存储位置和由步骤2引起的实际存储位置的映射关系。幸运的是，在模型整体运行过程中计算和通信后往往有Element-Wise算子，我们可以将Map Table的逻辑融合到后续的Element算子中，来完成对存储偏移影响的纠正。注：Map Table需要提前获取，获取办法和后续过程中提到的Wave相关。

4）那我们该怎么选取Tile组呢？这里在讲Tile选取之前，先插入一个GPU的执行模型。当一个拥有N个Block的Kernel被发射到GPU上之后，GPU驱动会根据Kernel的编译期信息知道每一个Block会占用SM上多少资源，因此可以算出每个SM可以并行执行的Block数目。那么同时发射到GPU上的Block，在时间序列上会呈现一个“Wave”的现象。像图3左边这个例子，这个CUDA kernel的执行被分成了4个Wave。当然实际上由于不同SM和不同Block的执行时间不完全对齐，不会像图上画的这么整齐划一，但基本上同一个Wave的任务相差不会太大。

![](https://picx.zhimg.com/v2-fce1157192416132dcd863fcc63b6237_r.jpg)图3. Block发射机制，摘自https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html
很显然，如图4所示，对于矩阵乘法来讲，也存在这种Wave现象。而且Wave现象中具体每一个Wave中包含的Tile和Swizzling算法息息相关。

![](https://pic4.zhimg.com/v2-7f7c8b64b77dc9fde4d25da1a0ab4681_r.jpg)图4. 矩阵乘法的Wave现象
我们找了一个矩阵乘法进行观察，也证实了这种Wave现象，如图5所示，图中横坐标为Block ID，纵坐标为该Block的实际完成时间。左图和右图分别是做与不做Swizzle的Wave现象，<strong>可以证实同一个Wave里的block实际完成时间基本差不多，这为我们后面选取Tile组提供了一个事实依据。</strong>显然，当我们选取同一个Wave的Tile作为一个组是一个非常不错的选择。这是由于同一个Wave内的Tile基本能整整齐齐的结束，很显然选择他们作为一个Group，一起发一次通信效果会更好。事实上当给定一个矩阵乘法和GPU之后我们很容易Hack出Block的发射顺序从而获得Wave信息。

![](https://pic1.zhimg.com/v2-b78bdb83bed51c53ecfea4e51b0aa112_r.jpg)图5. 实际矩阵乘法中的Wave现象5）那我们选择一个Wave作为一个Tile Group是不是就是最好的选择了呢？

答案是否定的，这里仍然存在调优空间。因为我们一方面希望一次性通信的数据要多，这样通信的效率更高，所以我们需要一个Group尽量包含更多的Tile；另一方面，我们希望切分的要碎，一算完就传，通信启动越早越好，所以我们需要一个Group尽量包含更少的Tile。看，Trade-off就出来了，所以这里我们需要来调优选择一个合适的Tile Group，这个Group的最小单位是一个Wave。当然作为知乎来讲，具体是怎么调优的我们就不展开讲了，感兴趣的同学可以移步我们的论文里了。
最终基于信号的计算通信重叠的方案图这样：

![](https://pica.zhimg.com/v2-5584f4973752244ada2376f99a3f3166_r.jpg)图6. 计算通信重叠算法框架
图6中黄色行是矩阵乘法，下面浅绿色是通信。假设矩阵乘法包含6个 Tile，我们将这6个Tile分为3个Tile Group，Group1包含Tile0和Tile5，Group2包括Tile2和Tile4，Group3包括Tile1和Tile3。当每个Group的计算结束之后，会发起一次NCCL通信。最后将Map Table传到后面的Element-wise算子中来恢复重映射的影响。

实验结果

接下来我们简单展示一下实验结果，实验结果分为两部分，第一部分是我们针对矩阵乘法和AllReduce、ReduceScatter和All2All三个通信算子，在A800和4090的优化效果。第二部分我们以AllReduce为例，分析M、N、K变化时优化效果的变化。

1）我们对几个典型工作进行了对比，部分工作只针对部分通信原语，没有的部分我们会留白。整体上看，FlashOverlap可以获得1.07-1.31X性能提升，而且大多数情况下都优于其他SOTA工作。具体如下图所示，我们测试了小面表格中大量的矩阵乘法形状，柱状图代表表格中所有矩阵乘法形状下的平均性能，线状图分别代表性能最差情况和最优情况。（本来想画灯芯图来着，感觉太乱了）

![](https://pic3.zhimg.com/v2-aa9188983d919eb0cb1b30a2b6952d42_r.jpg)图7. Overall Performance结果2）上面的结果主要是平均结果，为了更进一步展开，我们在4090上针对TP=2下做ReduceScatter，在A800上针对TP=4下做AllReduce，这两种场景不同矩阵乘法形状M*K*N的性能结果。

![](https://picx.zhimg.com/v2-7d0f459f8322e2de03949ee0bdcab43d_r.jpg)图8. 不同矩阵乘法形状下优化热力图