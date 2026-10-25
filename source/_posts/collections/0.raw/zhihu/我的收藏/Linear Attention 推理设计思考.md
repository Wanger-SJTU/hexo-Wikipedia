---
title: Linear Attention 推理设计思考
date: "2025-11-08 00:00:00"
updated: "2025-11-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Linear-Attention-推理设计思考/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1970421781090268661
---


### 背景

近两个月，Qwen3 Next 与 Kimi Linear 的相继发布，让基于 GDN（Gated Delta Network）架构的 Linear attention 成为大模型领域的焦点之一。传统 Softmax Attention 的推理优化已经形成了成熟的技术体系——比如优化TTFT的前缀缓存（prefix caching），优化OTPS的投机推理（speculative decoding）。然而对于Linear attention，暂时还没有很多工作讨论其推理效率。当前技术是否依然适用？本文重点探讨Linear Attention在speculative decoding与prefix caching场景下的设计选择，抛砖引玉。

### GDN 计算量: Linear State 一定比 Softmax KVcache 节省吗

在深入优化前，我们必须先回答一个基础问题：Linear Attention的”线性”优势，在实际访存层面是否成立？

<strong>先给结论：不一定，取决于序列长度。</strong>

我们来算一笔账：

- Linear SSM State：每层需要保存的state大小为
- num_head × head_dim × head_dim × 2 bytes (bf16) 以Kimi Linear的具体配置为例，num_head=32, head_dim=128，则每层state占用
32 × 128 × 128 × 2 = 1MB

MLA KV Cache 采取典型值kv_lora_rank=512, qk_rope_head_dim=64，每层缓存大小（per token）为 

1 × (512+64) × 2 bytes=1.2KB

当单层序列长度超过 910 tokens 时，Linear State的累计访存量才开始优于传统KVCache。这个阈值会随num_heads, head_dim 和 Hybrid层数比例动态变化。

一方面，这意味着大部分一句话问答的短推理场景里 linear attention 的访存优势并不明显。另一方面，拿当前 32 attention heads 的 KDA 和 MQA 比较访存量并不太公平，或者说 linear attention 在未来存在更多可被压缩的访存空间。

### KDA Prologue Kernel 并行

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_647b7a3c91d4.jpg)

观察KDA的核心计算路径[1]，我们会发现q、k、v、g、beta五个矩阵乘在prologue阶段完全独立，没有数据依赖。但并不能直接fuse为一次矩阵乘，因为乘法中间结果存在sigmoid、gate、conv等操作。因此更好的方案是<strong>选择性地fuse一些矩阵乘，然后考虑用多个CUDA Stream并行发射算子，通过green ctx调节显卡资源可以让访存利用率低的算子计算延迟隐藏在利用率高的矩阵乘里。</strong>

可能的方案：计算 qkv_proj 之后创建多个 cuda stream
Stream 1: q/k/v conv1d
Stream 2: fg_a_proj
Stream 3: b_proj → float -> sigmoid
Stream 4: fb_proj → gate

另外，为什么MLA没有采用类似策略？

虽然MLA也有很多细碎算子（比如一系列norm），但是MLA的数据依赖更多，提升空间有限。比如 sglang 尝试了q/k layernorm overlap：[https://github.com/sgl-project/sglang/pull/5977](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/5977) 单层收益只有 2.4 us。

#### Speculative Decoding 优化

Speculative decoding是推理加速的核心技术，但在Linear Attention下，state的管理策略成为关键瓶颈。vLLM上Qwen3 Next实现了一个基础版本，最直接的想法是为每个draft token保存全量的 linear states。这样的存储开销

Bsz \times num\_drafts \times num\_heads \times head\_dim \times head\_dim 

以 Bsz=8，num_drafts=4 为例，单层的额外开销已经来到32MB，这对于大Batch、显存敏感的RL训练场景是一个噩耗。

学习了yywangcs的想法[2]([从推理框架的视角谈DeltaNet](https://link.zhihu.com/?target=https%3A//yywangcs.notion.site/DeltaNet-1fefc9f5d80580a496f8eb406a496f09))是在验证阶段结束后，只保留最开始的 S_{init} ，验证阶段生成的 S_n 随着forward过程传递。在下一轮验证的时候，把k个已经被接收的token和新的num_draft个token拼在一起重新做linear states更新，这次可以保存到 S_k 状态。确实节省了显存开销，但是会引入重复计算，对于FFN每次都需要重算更多的token： Bsz \times（k+num\_draft） ，接收的越多重算的越多，除非进行查表优化。这些额外计算和查表时间可能会把投机推理的优势吃掉很多。

本文提出一种折中方案：<strong>保留q/k/v的projection_states</strong>，而非最终linear state，可以把存储开销由 head\_dim^2 降为线性。在下一轮验证的时候，对k个已经被接收的token使用其q/k/v states重算得到当前的状态 S_k ，FFN也不需要重复访存。

这种保留中间状态的另一种好处是层内计算可以和prologue kernel并行，不同层的重算也可以独立并行，与前面prologue的multi-stream策略可以拼在一起，进一步节省时间。

#### Prefix Caching 优化

由于不存在全量kvcache，Linear Attention的前缀匹配需要重新审视。朴素思路是每处理一个block（比如128 tokens）就保存一次state，但如前所述，linear attention需要一个相当粗粒度的block才能战平传统MLA kvcache，而block size变大我们又担心前缀命中率的下降。

因此，MARCONI [3]（[https://arxiv.org/abs/2411.19379](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.19379)）的办法是使用radix tree的结构来管理linear states的checkpoint，只在大量公共前缀的部分处保存一个states，思路比较有效，还引申出缓存管理替换策略的问题，值得一读。

另外，在本文前面提及的保留projection_size的重算也许能和缓存管理结合，本质上都是用计算换显存的tradeoff，在比较快的重算任务中不保留全量states也许是更优的解法。

#### 总结

Linear Attention的推理优化才刚刚开始，我们提出stream并行加速prologue、用部分重算节省投机推理显存和用新layout管理可前缀匹配的linear states，期待更多探索！

[1] Kimi Linear: An Expressive, Efficient Attention Architecture. [https://arxiv.org/abs/2510.26692](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2510.26692)
[2] 从推理框架的视角谈DeltaNet [从推理框架的视角谈DeltaNet](https://link.zhihu.com/?target=https%3A//yywangcs.notion.site/DeltaNet-1fefc9f5d80580a496f8eb406a496f09)
[3] Marconi: Prefix Caching for the Era of Hybrid LLMs. [https://arxiv.org/abs/2411.19379](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.19379)