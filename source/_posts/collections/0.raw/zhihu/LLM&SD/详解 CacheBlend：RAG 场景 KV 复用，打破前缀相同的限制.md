---
title: "详解 CacheBlend：RAG 场景 KV 复用，打破前缀相同的限制"
date: "2024-11-19 00:00:00"
updated: "2024-11-19 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/详解-CacheBlend-RAG-场景-KV-复用,打破前缀相同的限制/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/7781800255"
---


[CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2405.16444)

KV Cache 复用的一个核心条件就是前缀必须相同，所以才有了 RadixAttention 这样的复用方案。这个条件大大限制复用的机会。

CacheBlend 是一篇专门针对 RAG 场景的 KV Cache 复用的文章，与 [SGLang](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2312.07104)、[RAGCache](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.12457) 的 Prefix Caching 相比，<strong>打破了必须前缀相同才能复用 KV Cache 的限制</strong>，直接拼接缓存好的 KV Cache 块，然后巧妙地利用 attention 的稀疏性在一定程度上恢复缺失的交叉注意力，取得一种性能和生成质量的折中。

### 背景

Retrieval-Augmented Generation (RAG，检索增强生成) 通过提供领域知识或特定于用户的上下文信息增强特定领域的生成质量。

如下图所示，一个典型的 RAG 工作流是这样的，用户输入一个 query 后，根据 query 在事先构建好的向量数据库中检索出多个相关的文本块（text chunks），然后将这些文本块按照一定的顺序拼接在一起作为上下文，再在后面拼接上用户输入的 query，构成一个完整的输入请求喂给 LLM。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ecd6967a6744.jpg)

显然，文本块会极大地增大输入的长度，因此 RAG 是一个典型的长上下文场景，增加计算开销和 KV Cache 内存占用。SGLang、vLLM 等框架通过 KV Cache 复用可以用来减少长上下文的计算和显存开销，但通用的 KV Cache 复用机制没有为 RAG 场景的特点进行针对性优化。

RAG 有以下特点：

- KV Cache 复用以文本块为粒度
- 数据库包含的文档数量大，但是一小部分热文档会在请求中重复出现
因此，如果能够在请求间复用相同文本块的 KV Cache，并构建一个多级缓存架构，把热文本块的 KV Cache 存储在 GPU，冷文本块卸载到主存和磁盘，需要时再加载回来，能够大大提升 RAG 的效率和性能。

### 挑战

如果缓存下某个文本块的 KV Cache，在之后的请求中如果包含了这个文本块就复用缓存好的 KV Cache，这样做看上去很简单有效，但这种方法会有两个问题：

- <strong>KV Cache 的位置编码错误</strong>：RAG 拼接文本块时是有顺序的，这个顺序不能直接打破，因此同一个文本块在请求当中的位置可以是不同的，这意味着这些 token 虽然相同，但是位置编码不同，Q/K 也是不同的。
- <strong>文本块之间的交叉注意力（cross-attention）缺失</strong>：在原始的 prefill 计算当中，后面文本块中的 token 会注意到前面文本块中的 token（Causal Attention）。可是如果在一个请求中，例如包含两个文本块 [chunk1、chunk2]，chunk2 使用缓存的 KV Cache，这些 KV 是没有与 chunk1 中 token 计算过 attention score 的，因为只有请求产生了才知道自己前面有哪些 token，chunk2 的 KV Cache 在被缓存的时候还不知道谁是 chunk 1 呢。
有了这两个问题，缓存和复用文本块的 KV Cache 就难了，只有前面所有文本块都相同的 KV Cache 块可以复用。

### 动机

作者对比了现有的几种 RAG 场景的 KV Cache 复用解决方案：

#### Full KV Re-compute**：

不复用 KV Cache，这样做 prefill 开销巨大

#### Prefix Caching**：

[RAGCache](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.12457) 构建了一棵文档树，把每个请求中文档的 KV Cache 块序列缓存下来，请求间的的前缀文档必须完全匹配才可以复用。比如之前的请求用到 [D1、D2、D3]，下一个请求是 [D1、D2、D5]，可以复用 [D1、D2]。

- 好处：Attention 计算等效，生成质量不变
- 坏处：复用条件苛刻，并且缓存占用空间大，因为一个文档在不同的文档序列中会有多个不同的 KV Cache 块，如下图： 
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a4101085e2a2.jpg)

RAGCache
#### Full KV Reuse

直接将不同文本块的 KV Cache 拼接起来，那如何解决前面提到的两个问题呢？   

为了修正位置编码错误，[Prompt Cache](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2311.04934) 提到了一种"dummy prefix"的方法，如果请求包含 [C1、C2]，那这里用到的 C2 KV Cache 是 [一段与 C1 等长的 dummy prefix、C2] 进行 prefill 计算得到。如果使用 ROPE 位置编码，还可以通过把 C2 的 K 整体旋转 Lenght(C1) 个位置来解决（后面会介绍）。    

尽管能解决位置编码的问题，交叉注意力缺失的问题无法解决，根本原因是当请求产生的时候才知道前序有哪些文本块。交叉注意力的缺失会丢失文档之间的联系，导致生成质量的下降，作者举了一个例子： 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0e1e182f2b05.jpg)

缺失文本块之间的注意力，导致问题回答错误

- 好处：KV Cache 复用率高，prefill 效率高
- 坏处：忽视文本块之间的交叉注意力，生成质量下降严重
比较上面几种 KV Cache 复用方案，复用效率高的会牺牲生成质量，保持生成质量又会降低复用效率。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_27db55ed35a5.jpg)

现有 KV 复用方案与 CacheBlend 的对比因此，作者想办法在两者之间取得一个权衡，既保持高复用率，又不损失太多生成质量，核心思想是在 Full KV Reuse 的基础上再计算少量 token 的注意力以恢复文本块之间的交叉注意力。

### 方案

CacheBlend 的方案主要分为两部分：先拼接起不同文本块的 KV Cache、挑选一部分重要的 token 重新计算它们的注意力（<strong>Selectively recomputing KV cache</strong>）、

#### 拼接 KV Cache 块

如何解决 Full KV reuse 位置编码错误的问题呢？这里用到了 [Rotary Position Embedding(RoPE) ](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2104.09864) 编码的特性。

ROPE 不同于作用在 embedding 层的绝对位置编码，而是直接作用在 token 的 q 和 k 上，将第 $m$ 个位置的 token 旋转 $m\theta$ 个角度。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_647f60c329c3.jpg)

ROPEROPE 最大的特点是只关注 token 间的相对距离而非绝对位置。根据这个特性，一个请求 [C1、C2、C3] ，如果缓存的 C1、C2、C3 的 KV Cache 都是从位置 0  开始的，拼接时只需要把 C2 每一层的 K 都旋转 Length(C1) 个角度，把 C3 每一层的 K 都旋转 Length(C1)+Length(C2) 个角度，就能恢复出正确的位置编码。

我们可以把拼接出来的 KV Cache 成为 <strong>pre-computed KV Cache</strong>。

#### 交叉注意力恢复

解决了位置编码错误的问题后，我们还需要解决交叉注意力缺失的问题。我们的目标本质上说就是让 <strong>pre-computed KV Cache 通过“还原”尽可能接近真实（Full KV Re-compute）的 KV Cache</strong>，但是“还原”的过程又要尽可能高效。

CacheBlend 利用了老生常谈的 <strong>attention 稀疏性</strong>和<strong>相邻层之间的相似性</strong>（[DejaVu](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2403.01876)），并引入了一个 <strong>KV 偏差（KV deviation）</strong>的概念。

实际上 token 间构成的 attention matrix 是很稀疏的。某个 token[i] 和前序 token[1~i-1] 进行 attention 计算时，它只和少部分的前序 token 的 attention score 高，因为 softmax 的存在，只有这少部分 attention score 高的前序 token 的 k v 真正影响了 token[i] 的 attention output。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b9338143a908.jpg)

注意力矩阵是很稀疏的，黄框里的是两个文本块之间的交叉注意力大白话说，一个 token 一般只“重点”关注少部分 token，而如果一个 token “重点”关注的这少部分 token 又恰巧跟自己在同一个文本块中，那么其实缺失交叉注意力对它影响不大。

如何评估缺失交叉注意力对它的影响大不大？让注意力产生差别的根源在于 pre-computed KV 与真实的 KV 不同，所以我们可以衡量<strong>KV 偏差：一个 token 在有无文本块交叉注意力的情况下 k、v 的差别</strong>，也就是在 Full KV Reuse 和 Full KV Re-compute 情况下的区别。显然，偏差越大越容易影响注意力的结果。因此，我们可以挑选前 r% 个 KV 偏差大的 token，然后重新计算它们的 attention。

下图说明了通过重新计算少量 KV 偏差大的 token 来还原 attention 结果的有效性：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cee44095bc13.jpg)

重新计算少量 token，得到的 attention 结果与真实值的差距就比较小了但是实际上我们不能知道 KV 偏差，我们不知道真实的 KV 是多少，因为我们不会真的做 Full KV Re-compute。这里 CacheBlend 利用了相邻层之间的相似性：<strong>上一层 KV 偏差大的 token 大概率也是下一层 KV 偏差大的</strong>，如下图：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_326407abc242.jpg)

根据这个特性，CacheBlend 给出的方法是，在第一层 Layer 1 完整计算所有 token，这样得到的 Layer 2 的 KV Cache 将和 pre-computed Layer 2 KV Cache 不同，从中筛选出 KV 偏差大的 r1 个 token 重新计算，这样在 Layer 3 中将至多有 r1 个 token 的 KV 与 pre-computed 的不同，再其中再挑选出 KV 偏差大的 r2 个 token 重新计算，以此类推……作者形象地把这个方法称为 gradual filtering scheme（渐进过滤方案），下一层选择进行 reompute 的 token 是上一层 recompute token 的子集。

>  这里论文中的图似乎有问题，Layer 1 的完整计算得到的 KV 和 pre-computed 得到的 KV 应该是一样的，KV 应该从 Layer 2 开始才会产生区别。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_37d0b339214e.jpg)

上面的选择性重新计算，Q 是挑选出的 token 的 Q，而 KV 是 pre-computed KV 与挑选出的 token 的 KV 拼出来的进，输出是挑选出的 token 的 output，根据这些 output 可以更新下一层的对应位置的 KV Cache，如下图。因此，选择性重新计算的复杂度正比于挑选的比例。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7508e7a78dcc.jpg)

#### Pipeline KV loading and recompute

如何减少 recompute 带来的开销？recompute 第 i 层的 KV Cache，实际上需要的是加载第 i-1 层的 pre-computed KV Cache 并从第 i-1 层的 KV 偏差中选择需要重新计算的 token 进行 forward 计算。因此，recompute 第 i 层的 KV Cache 和 加载第 i 层的 KV Cache 到 GPU 这两个步骤可以 pipeline 起来。如果 recompute 1 层的时间低于 load 一层 KV Cache 的实际，理论上可以完全 hide 掉 recompute 的开销。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_74c368d1e6d6.jpg)

KV 加载和交叉注意力恢复两个步骤形成的 pipeline 而 load 和 recompute 的时间分别可以通过存储介质和 recompute token 的比例进行调整，详见论文。

#### 系统架构

完整的处理流程是这样的：用户输入 query，根据 query 查询需要的文本块，从多级存储中逐层加载已被缓存的文本块的 KV Cache，同时逐层挑选 token 进行交叉注意力恢复，最后得到恢复后的 KV Cache 用于后续的文本生成。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e51c6e6503b4.jpg)

CacheBlend 流程
### 实验

CacheBlend 实际上是在生成质量和 KV 复用效率上进行了一个折中，相较于 Prefix Caching（SGLang），复用效率更高，TTFT 低，但生成质量可能会有所较低；相较于 Full KV Reuse（PromptCache），会有交叉注意力恢复产生的 overhead，但是生成质量更高。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_86b9ec69aa8f.jpg)

几种方案的生成质量（纵轴）和性能（横轴）的对比
### 参考

[CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2405.16444)

[CacheBlend.git](https://link.zhihu.com/?target=https%3A//github.com/YaoJiayi/CacheBlend)

[RAGCache: Efficient Knowledge Caching for Retrieval-Augmented Generation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.12457)

[SGLang: Efficient Execution of Structured Language Model Programs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.07104)

[Prompt Cache: Modular Attention Reuse for Low-Latency Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2311.04934)

[DéjàVu: KV-cache Streaming for Fast, Fault-tolerant Generative LLM Serving](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2403.01876)

[RoFormer: Enhanced Transformer with Rotary Position Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2104.09864)
