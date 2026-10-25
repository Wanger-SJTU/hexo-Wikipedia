---
title: (2 条消息) LUT in AI Accelerator
date: "2025-07-08 00:00:00"
updated: "2025-07-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/LUT-in-AI-Accelerator/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1914357817042801846
---


<strong>LUT</strong>在 <strong>AI accelerator</strong>中有一定的应用，并且非常适合 <strong>Activation</strong>位宽固定，<strong>Weight</strong>位宽可变或低位宽的情况。其代表作为 KAIST 的 <strong>UNPU( 18'isscc )</strong> 和 <strong>Slim-Llama( 25'isscc )</strong>，分别面向 <strong>CNN</strong>和 <strong>bitnet-llm</strong>。刚好我本科毕设就是做的相关方面的优化工作，看到 LUT 在 llm 中还能大放异彩感觉确实牛逼。

### 1. base architecture

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_11412737b3b9.jpg)

bit-serial 算法bit-serial 算法原理为，假设我们有一个向量 [A,B,C] ，可以<strong>先将所有可能结果存储在查找表中</strong>，如上图右。然后将<strong>向量点积</strong>的操作转换为“<strong>查表-移位-累加”的操作</strong>，如上图中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_149cf07fc5ac.jpg)

电路结构电路上使用一个<strong>8-deep 的 regfile，MUX，移位器，加法器</strong>即可构成。注意共有12个MUX，以此增加并行性。因此一个 LUT 可以承担一个 12\times 3 的矩阵和一个 3\times 1 的向量之间的 GEMV。在 1-bit 的情况下可以计算一个 12\times 4 的矩阵和一个 4\times 1 的向量之间的 GEMV，因为在单比特情况下可以使用补码的方式存储。这是 UNPU 中的 LUT 模块，然后使用多个 LUT 搭建阵列可以计算更大矩阵。

除此之外 UNPU 的其他设计从今天来看就有点过时了。

### 2. Slim-Llama

Slim-Llama 是专为 Bitnet-1b 和 Bitnet-1.58b 设计的超低功耗处理器，延续了 UNPU 中单比特查找表的计算模式。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6c6ce0428e63.jpg)

bitnet但 UNPU 中的 LUT 在低功耗 bitnet 设计中会遇到一些问题。首先 bitlinear 在 1b 情况下并不稀疏，在 1.58b 情况下也只有0.35稀疏。第二是 UNPU 中的 LUT 不能处理稀疏特性，第三是如何降低加法树的功耗。

于是 Slim-Llama 进行了三步改进：1. 让 bitlinear 稀疏 2. 让 LUT 支持稀疏 3. 让加法树功耗低

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_323f793acad3.jpg)

问题
#### 2.1 让 bitlinear 稀疏

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9e972dba9d8c.jpg)

output reuse 算法层在算法上，将相似的 weight 向量组合成为一个<strong>Cluster</strong>，这一步是在<strong>编译</strong>时完成。在 Cluster 计算时先计算第一个向量得到结果，<strong>其他的向量</strong>计算则通过与<strong>第一个向量差分</strong>得到。通过这样的做法就把一个矩阵拆分为一个 <strong>dense vector</strong> 和其他的 <strong>sparse vector</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3bdd0ef2b7f4.jpg)

电路实现电路实现上分为两部分，首先进行 cluster center calculation 的计算将 dense vector 结果存储在 output reuse unit 中，然后进行差分稀疏向量运算。<strong>差分的计算通过 local accum</strong> 完成。可以看到稀疏性从 0.35 提高到了 0.7 左右，在 cluster 为128时稀疏性最好。

#### 2.2 让 LUT 支持稀疏

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_680fd4c8a7db.jpg)

2-mode of LUTLUT 在稀疏性支持上相比于 UNPU 做了优化。分为2种工作模式，Mode1 和 Mode2（注意这里的 Mode1 和 Mode2 <strong>不是</strong> LUT-Mode 和 Buffer-Mode。Mode1 由 LUT-Mode 和 Buffer-Mode <strong>混合构成</strong>，Mode2 <strong>只由</strong> Buffer-Mode 构成）。

<strong>Mode1：</strong>在不太稀疏时，采用 Mode1（左图左）。LUT 一次接收 3-bit 的索引，<strong>当 3-bit 索引都不为0时</strong>，查询 LUT 的上面四个表项，和 UNPU 一样进行补码的格式存储，查表完直接输出（中图）。<strong>当 3-bit 索引至少有一个为0时</strong>，查询下面四个表项，然后通过加法器数据通路进行相加（右图）。

<strong>Mode2：</strong>在非常稀疏时，采用 Mode2（左图右），LUT 一次接收<strong>8-bit</strong>的索引（onehot），每次可以查 8-bit 中的2个 non-zero bit，然后查表相加（右图）。当 8-bit 中有多于<strong>2个 non-zero</strong>就<strong>分拍</strong>查表，因为后面接有加法树和 Local accu，所以分拍查也不会破坏正确性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f01a35f276c7.jpg)

运行模式如上图所示，38% 是 Mode1 和 Mode2 的功耗相交点，所以根据稀疏度决定使用哪一种 Mode。

#### 2.3 adder-tree low-power design

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_890ae6f5e442.jpg)

adder-tree optimization在 adder-tree 的低功耗设计上主要考虑到减少动态翻转，所以可以将 index 相近的列凑在一起，这样在相加的时候可以减少动态翻转。

#### 2.4 总结

Slim-Llama 进行推理加速分为<strong>off-line</strong>和 <strong>on-line</strong>，在 <strong>off-line</strong> 的时候首先将一个矩阵内相似的向量打包在一起，打包成一个<strong>cluster</strong>，实验发现 cluster 为<strong>128</strong> 时稀疏效果最好。然后在一个 <strong>cluster 内</strong>再调整顺序，让 <strong>non-zero 位置相近的向量挨在一起，</strong>这样可以减少加法树的动态翻转。低功耗狂魔

在<strong>on-line</strong>阶段并没有讲计算流划分，但看架构是进行了<strong>层次化设计</strong>的。看文章的意思好像是一个<strong>SBC</strong> 承担 <strong>A-Vec × W-Mat</strong> 的任务，在 SBC 内部不同的 <strong>S-LUT based BMM Column</strong> 承担 <strong>A-Vec × W-Cluster-alike</strong> 的任务（2.1），<strong>W-Cluter-alike</strong>是分时按向量 <strong>W-Vec</strong> 逐个进入的（2.3），<strong>S-LUT based BMM Column</strong> 中不同的<strong>S-LUT</strong>则是承担<strong>W-sub-Vec</strong> × <strong>A-sub-Vec</strong>，这样才可以通过<strong>加法树</strong>进行累加。

然而在 2.2 中图好像不同的 <strong>S-LUT based BMM Column</strong>也可以承担同一个 <strong>W-Cluster-alike</strong>中的稀疏向量部分和不那么稀疏的向量部分的计算，2.3 中图好像一个 <strong>SBC-Cluster</strong> 内的不同 <strong>SBC</strong>是承担<strong>不同位宽</strong>的计算？如果就是<strong>4 bit</strong>那么<strong>不同 SBC</strong>任务如何分配呢？反正文章没有说很清楚。8个 SBC-Cluster 也没讲。希望能和 UNPU 一样出个长文版的，虽然 UNPU 也是层次化硬件设计，但说的很明白。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_421a4f1fb883.jpg)

架构总之他们 <strong>稠密到稀疏的转化</strong>和<strong>S-LUT的设计</strong>还是很有趣的。

### 3. Cambricon-C

#### 3.1 算法

Cambricon-C 针对于<strong>int4</strong>精度下的 <strong>GEMM</strong> 做优化，其也是使用查表的方法，但他是把 int4 * int4 的所有 256 种结果全部预存，所以一个加法器都不需要。相比而言 Slim-Llama 和 UNPU 在<strong>预计算阶段</strong>仍然<strong>需要加法器</strong>。

首先定义一个预计算向量，256 维，**存储 int4*int4 的所有可能情况<strong>，将</strong>两个值拼接作为索引**进行查表。

m = \begin{bmatrix} 0 \times 0, & 0 \times 1, & 0 \times 2, & \dots, & 0 \times -1, \\ 1 \times 0, & 1 \times 1, & 1 \times 2, & \dots, & 1 \times -1, \\ 2 \times 0, & 2 \times 1, & 2 \times 2, & \dots, & 2 \times -1, \\ \vdots & \vdots & \vdots & & \vdots \\ -1 \times 0, & -1 \times 1, & -1 \times 2, & \dots, & -1 \times -1 \end{bmatrix},\\ 于是计算转变为

$y = \sum_{i=0}^{N-1}w_ix_i=\sum_{i=0}^{N-1} \boldsymbol{p}_i \boldsymbol{m}^\mathrm{T}\\ 其中**\boldsymbol{p}_i = [p_0, p_1, \dots, p_{255}], \quad p_j = \begin{cases} 1, & \text{if } j = x_i \odot w_i \\ 0, & \text{otherwise.} \end{cases}\\ 于是 MAC 就变成了一个庞大的 RegFile 和一个执行+1的加法器（Inc）：$

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9ffcba3dbdfd.jpg)

MAC![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_425fc8c69be6.jpg)

OS SA有一种古老的 QSM 查表算法：

$$\frac{(x+y)^2}{4} - \frac{(x-y)^2}{4} = xy.\\ (x+y)^2 \equiv (x-y)^2 \pmod 4.\\ \left\lfloor \frac{(x+y)^2}{4} \right\rfloor - \left\lfloor \frac{(x-y)^2}{4} \right\rfloor = xy, \quad x,y \in \mathbb{Z}.\\ 于是实际的查的表项是：$$

Q(n)=\lfloor n^2/4 \rfloor\\因为平方关系的引入，所以实际表项只有：Q  = [1, 2, 4, 6, 9, 12,16, 20,25, 30,36, 42,49, 56,64]\\ 于是计算就变成了一次相减一次相加和两次查表，牛逼。同时 Regfile 的大小也从256变成了29.

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1c1df8d9fadd.jpg)

QSM 查表计算方式
#### 3.2 整体电路

电路上使用 OS 的 SA，同时增加 Converter 模块负责将计数器值转译出来。SFU 承担非线性函数、量化等功能。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7895444deaf8.jpg)

OS SA
#### 3.3 计数器微架构设计

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8f90451b4e5d.jpg)

- SRAM-based：基于 SRAM 进行存储。使用”读-算-存“的方式进行操作。算的部分使用+1的半加器实现
- Ripple-counter：使用行波计数器实现。行波计数器高位的时钟连接在低位的Q'信号**。
- Bidirectional-counter：使用双向计数器实现。可以实现<strong>加一和减一</strong>。这样的话可以将 Regfile 的大小继续缩小为原来的<strong>1/2.</strong>

#### 3.4 PE 微架构

基于以上三种计数器微架构设计了以下的几种 PE：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3a9aa847bf7d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_73145766cd6d.jpg)

通过量化分析竟然是<strong>R29</strong>最好。我以为会是 B15 和 S32 胜出呢。同时我们也注意到 MAC 的实现面积会小很多。这种优化使得<strong>功耗降低了一半但面积增加了6倍</strong>。并且后面还有一个单独的 converter 电路，converter 电路的功耗也不见得会小。所以这种优化我感觉没啥用。不过至少提供了 QSM 的这种新的查表方式，学到了。

#### 3.5 converter 设计

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_43e2aa59d211.jpg)

converter 输入为一列的数据（OS数据流）计算步骤分为：1. 将 counter 中<strong>相同权重处的正值和负值相减</strong> 2. 进行<strong>查表，相乘</strong> 3. 使用<strong>加法器累加</strong>

<strong>这个思路其实和 EncodingNet 比较像，在计算中途先用一种中间格式编码进行储存，最后译码并使用加法树累加。</strong>