---
title: (2 条消息) Sparse AI Accelerator(review)
date: "2026-02-12 00:00:00"
updated: "2026-02-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Sparse-AI-Accelerator(review)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1908533318879777525
---


### 1. systolic array稀疏加速

原文《A Survey of Design and Optimization for Systolic Array-based DNN Accelerators》

SA 对稀疏的支持大部分还是基于结构化稀疏。

#### 1.1 flexSA：将大SA切分为小SA

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a8b1ed580f08.jpg)

structed sparsity and SA utilization在结构化稀疏方面，Shape，Filter，Channel-wise 稀疏方式对 SA 更友好，但仍会造成大型 SA (128×128) 利用率低的问题（因为矩阵变小了），因此可以将大型 SA 切分为小型 SA 。实验表明 64×64 的切分效果最好（切分越多，控制、路由、SRAM 等逻辑也会增加）。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_fb00c98e8de4.jpg)

flexSA 四种运作方式flexSA 采用 IS/WS 数据流，以 WS 举例，FW 就是正常的大型 SA，VSW 是将 Core0 和 Core2 合并为一个，Core1 和 Core3 合并为一个，两个共享预载的 Weight，适合苗条的权重矩阵。HSW 就是横过来，适合胖的权重矩阵。ISW 是四个分别运作。

#### 1.2 column packing & row permulation

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_e39e68b69362.jpg)

column packing进行列打包，这样稀疏又变成稠密了。但存在三个问题，1. 在前层输出与后层输入之间需要进行重排，将要打包的列变为相邻，导致路由tradeoff。2. 如果权重矩阵三列打包则需要三行输入矩阵并行输入，造成带宽变大。3. column packing 的时候会丢数。

解决第一个问题：使用row permutation

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ffcd0d8f6073.jpg)

row permutation解决第二个问题：使用 bit-serial 的方法，interleaved 在 PE 间 systolic。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9eaedeeb89e5.jpg)

bit-serial interleaved解决第三个问题：分块 column packing，或者 row permutation

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ff5764e5ca88.jpg)

解决 column packing 丢数
#### 1.3 Density-bound Block

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_dbd4b3136eec.jpg)

DBB structed sparsity2020年的 STA(systolic tensor array)-DBB 和 2022年的 S2TA 都使用了这种结构化稀疏方式。个人认为 TPE 的设计比传统的 scalar-PE 要好，这样可以节省很多 p2p 控制逻辑和 Buffer 开销，且 sync-fifo 的数量也可以变少。即使在稠密情况下也是这样。但 TPE 应该做多大尺寸，还需要进一步探讨。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ae914d4c071a.jpg)

STA-DBBSTA-DBB 只支持权重 DBB 稀疏

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_28f93833501c.jpg)

S2TA PES2TA 支持权重和输入都可以稀疏。其中，W 是 DBB 的格式，而 A 支持1/8-8/8( 因为A是串行进入，即time-unroll，所以其有效位数可以动态调整)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_eff116e1f2c9.jpg)

S2TA-SA图a 绿色的带宽应该是 B×INT8。

如何将 A-DBB 进行动态剪枝呢？S2TA 使用的是 Top-NNZ 的剪枝方法，NNZ 支持 1-5，通过级联 Maxpool 实现( 可 bypass )。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_40b35cfb03d2.jpg)

级联 Maxpool
#### 1.4 simultaneous multithread

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_0b5be3f16342.jpg)

SMT-SASMT-SA 一次可以接收多个 W 和多个 A，如果有0就直接向后传播，非0数计算则是分拍进行。这样 SMT 设计需要在 SA PE 中设计一个数据 FIFO，同时会反压( backpressure )相邻的 PE。

### 2. 专用稀疏计算加速架构

原文《Dedicated Hardware Accelerators for Processing of Sparse Matrices and Vectors: A Survey》

#### 2.1 稀疏存储格式

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_c014255c62a8.jpg)

COO CSR FiberTreeCSR 格式中 Row PTR 第 i 个元素表示第 i 行的起始元素在 Payload 的位置，i+1 个元素表示第 i 行的终止元素在 Payload 的位置。CSC 格式把 Row 变成 Column。

同时不同的稀疏格式可以用 FiberTree 来归纳，并且可以用 label 描述每个 rank，分别是 Uncompressed (U), Coordinate Payload (CP), Uncompressed Offset Pairs (UOP). 例如 CSR 可以表示为 row-major (UOP, CP)。

#### 2.2 计算模式

IP 是一种输出约简的计算，OP 输出完全不约简，Gust 介于之间。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_29631702d404.jpg)

IP OP GUST![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_0046cad2ac78.jpg)

Challenges**Inner Product：**

是最符合人类直觉的计算方式，其有着**最大的 output reuse**，但在硬件中存在许多问题：

- 在计算 A\times B =C 的 SpMSpM 时，A 需要以** CSR **格式存储，B 需要以** CSC **格式存储。
- 在计算 row-A 时，需要将每一个 col-B 读入片内，但有可能 row-A 和 col-B 无需计算，造成**无效的 fetch**。如 row0-A 只有 a_{00} 为 non-zero，rown-B 只有 b_{nn} 为 non-zero，则 rowm-B 的 fetch 为无效 fetch。
- 在进行计算时需要对 row-A 和 col-B 的 index 进行比对，相符的才需要计算，造成大量**比较电路**。
- 每一 row-A 都要取出 B 的所有 non-zero，**input reuse** 很低。
因此很少有加速器在使用 IP 的计算方式。

**Outer Product：**

在早期稀疏加速器研究中获得了大量的应用，因为其有着**最大的 input reuse**，但在硬件中存在许多问题：

- 需要对大量中间结果矩阵进行 merge，对**二维矩阵**进行 merge 在电路实现上比较困难，大量的中间结果矩阵造成**无法片内存储**，产生额外的 **off-chip dram access**。
- 每个 PE 产生一个中间结果矩阵，中间结果矩阵的 merge 需要在 PE 间进行，导致 PE 间需要**通信**和**粗粒度同步**。
- A 矩阵以 **CSC** 格式存储，B 矩阵以 **CSR** 格式存储。
因此 Output Product 的研究重点在于如何减少 **off-chip dram access** 和**优化 merger 电路**实现。但这种计算方式决定了其 merger 电路和 off-chip dram access 比较困难。

**Gust Product：** 

一种结合了 OP 和 IP 优点的计算方式，展现出独特优势，主要在于：

- row-A 对应 row-C，因此其 merge 过程在 PE 内部进行，无需进行大量的 PE **通信和同步**，因此 PE 是完全**独立且异步**。
- PE 间完全独立且异步，因此每个 PE 可以**独立**进行 row-A 计算，因此可以获得**更大的并行性**。
- PE 负责 row-A，需要 merge 的不是中间结果矩阵，而是中间结果向量。对**一维向量**进行 merge 在电路上更容易实现。
- 其输入输出都是 **CSR **格式。
- 其不会产生如 OP 大量的中间结果，因此 **off-chip dram access** 更少。其没有 IP 的诸多缺点。
因此 GP 可能是更硬件友好的一种计算方式，但其仍然存在以下问题：

- 需要对 row-B 进行多次的读取。比如 row-A 有 n 个 **non-zero**，则要读取** n 个 row-B**。
- 在 row-A **non-zero** 过多时仍然存在 **off-chip dram access** 的问题。
因此，GP 的研究重点主要为：

- 实验表明对 row-B 的访问存在一定的**局部性**，因此可以设计 **cache**，对 row-B 和 C partial output 进行缓存，并优化策略**提高命中**。
- 在 **row-A non-zero** 过多导致中间结果产生时，在硬件上优化 **merge 和计算顺序**减少中间结果产生，尽量在**片内**可以 merge 完成，避免 **off-chip dram access**。
- 使用**软件**方法，对矩阵进行**预处理**，提高 row-B 的**局部性**，或进行 tiling 减少**中间结果的产生**。

#### 2.3 Tiling

Tiling 添加新的 rank。也即划分子模块。Tiling 在大型矩阵运算中是必须的，因此也增加了稀疏计算中的维度，带来了更多硬件设计机会，不同 rank 可以使用不同的计算顺序（IP OP GP）。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_17382d894e25.jpg)

Tile 内进行 IP，Tile 间进行 OP 的 Tiling 例子
#### 2.4 硬件加速器评估

review 用四个 criterion 对一些加速器进行分类：1. 是否能够独立完成计算还是需要 processor 介入。2. 处于内存层次：作为处理器的协处理器，介于处理器与内存间优化内存排布，直接连接主存进行大批量计算。3. IP OP Gust 4. 解决 gather 或者 scatter。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a2c34ac8d20e.jpg)

classification