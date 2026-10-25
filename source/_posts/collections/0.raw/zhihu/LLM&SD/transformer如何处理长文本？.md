---
title: transformer如何处理长文本？
date: "2024-01-22 00:00:00"
updated: "2024-01-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/transformer如何处理长文本/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/635395282/answer/3372320028
---


之前介绍了如何在位置编码和 attention 机制方面进行文本长度的有效拓展，这两个方面都是“经济适用性”的，即只需要简单微调或者直接外推即可，接下来将是最困难，也是成本最高的部分，即讨论如何在预训练阶段提高文本长度。

为解决预训练过程中的长文本问题，思路主要有以下几个方面：

- 并行化计算，典型方法如 [sequence parallelism](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2105.13120.pdf)
- 优化 attention 机制，典型方法如 [Transformer-XL](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1901.02860), [Longformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2004.05150.pdf)
- 引入 memory 机制，典型方法如 [Focused Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2307.03170.pdf), [Memorizing Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2203.08913.pdf)
- 引入采样机制，典型方法如 [Hierarchical transformers](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2110.13711), [Dynamic-Pooling Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.09761.pdf)由于笔者精力有限，下面仅选取其中部分方法加以介绍。

### 4.1 序列并行(sequence parallel)

在并行化算法大行其道的今天，使用改思想来解决长文本问题变得自然而言，实际上 SP 已逐渐成为 3D(DP, PP, TP)并行之外的第 4 个维度了。关于3D 并行，已经有很多文章介绍了，在此不予赘述。

简单来说，SP 就是将一段完整的文本拆分到多个设备上进行计算，设备在适当的时候进行通信和信息交互，如下图(c) 所示。

![](https://pic1.zhimg.com/v2-18df562662aaab801c4704d6a5e97188_r.jpg?source=2c26e567)在实现层面，借鉴了 Ring-Allreduce 的思想，将输入序列分割成多个块，并将每个块输入到其相应的设备中。为了计算注意力输出，将环状通信与自注意力计算相结合，实现了环自注意力（RSA），如下图所示。

![](https://pic1.zhimg.com/v2-e073eaae839cd76bff161be8d92a2489_r.jpg?source=2c26e567)下面我们来深度理解一下这个过程，论文中的符号表示为

- B: batch size
- L: sequence length
- H: hidden size of linear layers
- A: attention head size
- Z: number of attention heads
- N: number of GPUs对于 
$Ring-Q K^\top$ **：
$[B,Z,\frac{L}{N},A] \times [B,Z,A,\frac{L}{N}] \rightarrow (all-gather)[B,Z,\frac{L}{N},L]$** **，**

切分后的每一个小块 
$\frac{L}{N}$ ，在和 
$k^{T}$ 矩阵乘后得到 
$[\frac{L}{N}, \frac{L}{N}]$ 需要在切分维度做补全才可以得到每一个小块 
$\frac{L}{N}$ 的完整结果，在后续进行 
$softmax$ 操作。故需要做 ring 操作达到一个 
$concat$ 的操作。

对于 
$Ring-AV$ <strong>：</strong> 
$[B,Z,\frac{L}{N},L](reduce-scatter) \times [B,Z,\frac{L}{N},A] \rightarrow [B,Z,\frac{L}{N},A]$ ，

需要完整对 
$softmax$ 结果进行 value 查询，需要对 
$[B,Z,\frac{L}{N},L]$ 根据序列并行度进行分块，用对应的块在对应的 value 上查询并求和，故也需要做 ring 操作。

![](https://pica.zhimg.com/v2-730a59eaf0676f46dd2a65857471efd1_r.jpg?source=2c26e567)MLP 部分的计算就更简单了，如下所示：

![](https://pic1.zhimg.com/v2-62bcfb50cc1c9436c428e877faacbdf0_r.jpg?source=2c26e567)
### 4.2 LongLLaMA (Focused Transformer)

LongLLaMA 通过引入 Focused Transformer（FOT）方法，在保持性能的同时，将 LLaMA 的上下文长度扩展到100k！在长文本的情况下，除了第一节所研究的显存和计算量的问题外，这篇论文还提出了一个分心问题（Distraction Issue），即随着文本长度的增加，其中相关的 tokens 对不相关 tokens 的比例会减少，从而导致与不相关 value 相关的 key 和与相关 value 相关的 key 发生重叠，致使模型需要额外区分不同语义的 key 。

为此文章提出了 <strong>Focused Transformer</strong>（FOT）解决方案，其中主要使用了 Memory Attention Layers 以及 CrossBatch 技术，在 Inference 的过程中，绿色的 Memory Attention Layers 使用 kNN 对外部的 Memory 进行查询，从而有效延长了上下文长度，而 Memory Attention Layers 则主要使用 CrossBatch 进行训练。

![](https://picx.zhimg.com/v2-c37988cdcbd7814362c6815038c960b8_r.jpg?source=2c26e567)具体而言，Memory Attention Layers 中的每个 query 在 
$\in$ 中会关注局部的上下文以及 Memory 中使用 kNN 计算出的最匹配的 
$k$ 个key，而整个 Memory 则根据 之前处理的 key，value 进行填充。而 CrossBatch 则期望使得 Memory Attention Layers 更加关注长文本之中的“相关 value 的 key” ，CrossBatch 的处理借鉴了对比学习的思想，以相关文档之中的 d-1 个上下文作为正样本，以不相关文档之中的 d-1 个上下文作为负样本，通过对比学习的方式使得 Memory Attention Layers 可以更好的分辨相关与无关的 key-value。

与标准的 Transformer 相比，一般的 Transformer 的训练过程中，相关与不相关文档没有被得到有效区分（正负样本分散均匀），当文档数量扩展时，注意力变得越来越分散，而 Focused Transformer 则通过 CrossBatch 的训练目标使得模型有效的关注与区分的长文本下的相关与无关的 key-value 的空间结构，从而解决了分心的问题。

以上内容节选自以下文章，感兴趣的可以查看原文

[紫气东来：NLP（廿三）：LLM 中的长文本问题](https://zhuanlan.zhihu.com/p/640641794)