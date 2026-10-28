---
title: "目前主流的attention方法都有哪些？"
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/目前主流的attention方法都有哪些/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/68482809/answer/79951615941"
---


8 人赞同了该回答

Transformer中的注意力机制（Attention Mechanism）是其核心组成部分之一，主要用于捕捉输入序列中不同位置之间的依赖关系。通过计算每个输入的隐藏状态（hidden state），同时利用注意力机制来解决上下文关联问题。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_927e8c6a082d.jpg)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_69fba4060802.webp)

  transformer架构图
#### 
Self-Attention

在自注意力机制中，输入通常是一个统一的输入矩阵,而这个矩阵后续会通过乘以不同的权重矩阵来转换成三个不同的向量集合。这个过程包含三个主要部分：查询（Query, Q）、键（Key, K）和值（Value, V）。在Transformer中，这些通常是输入序列的线性变换。
给定一组查询 Q、键 K 和值 V 矩阵，其中每个矩阵的维度分别是 d_k（键和查询的特征维度）， d_v（值的特征维度），以及序列长度 L ：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6db396d76909.jpg)

Scaled Dot-Product AttentionAttention计算公式表示为：
 $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V $$
首先计算查询与所有键之间的相似度得分，这通常通过点积来完成。为了防止大数值导致梯度消失或爆炸的问题，点积结果被除以 \sqrt{d_k} 进行缩放。接下来，对每个查询的位置应用softmax函数，以获得表示注意力权重的概率分布，最后，使用上面得到的注意力权重对值向量进行加权求和，生成输出。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e70fee985319.jpg)

attention初始化
 W_Q、W_K 、W_V  为去要学习的权重矩阵，获取encoder输入的embeding，并计算每个embedding 的query，key，value。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bcf664ccef29.jpg)

Attention计算过程
#### 
MHA(Multi Head Attention)

单头注意力在计算不同位置间关联时用到了加权平均，这在一定程度上影响了特征计算的准确性，因此要用多头注意力来抵消这种影响。多头注意力允许模型在不同的位置关注信息的不同表征子空间。它通过并行执行多个上述的注意力函数，并将它们的结果拼接起来再通过一个线性变换来实现。具体来说：
对于每一个head，都有独立的参数矩阵：
$查询矩阵 W_Q^i \in \mathbb{R}^{d_{\text{model}} \times d_k} $
$键矩阵 W_K^i \in \mathbb{R}^{d_{\text{model}} \times d_k} $
$值矩阵 W_V^i \in \mathbb{R}^{d_{\text{model}} \times d_v} $
用于将输入转换成查询、键和值。每个头的输出是按照上述公式计算出来的。所有头的输出会被拼接在一起，并通过另一个线性变换 W_O 来整合这些输出。这个最终的线性变换矩阵  W_O 的尺寸是 {R}^{hd_{\text{v}} \times d_{model}} ，其中h 是头的数量。
多头注意力的公式可以表示为：
 \text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W_O 
其中，  \text{head}_i = \text{Attention}(QW_Q^i, KW_K^i, VW_V^i) 。
单头注意力包含 W_Q、W_K、W_V  ， 产生一个output，多头注意力则包含n个 W_Q、W_K、W_V  ，这些参数的权重不共享，产生n个output。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6a3b07da2e61.jpg)

Multi-Head  Attention多头计算过程

在多头注意力机制（Multi-Head Attention）中，各个头产生的输出确实被拼接在一起，并且对拼接后的结果再次进行线性变换（projection），以得到最终的输出。这个过程确保了模型可以综合不同表征子空间的信息，同时保持输出维度的一致性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0659d4e1a16d.jpg)

Multi-Head  Attention多头拼接计算过程
#### 
MQA(Multi Query Attention)

MQA（Multi-Query Attention）是一种优化的注意力机制，旨在减少Transformer模型中多头注意力（Multi-Head Attention, MHA）计算的参数量和计算成本。与标准的MHA不同，MQA通过让所有的注意力头共享同一个键（Key, K）和值（Value, V）线性映射矩阵来实现这一点，而查询（Query, Q）矩阵仍然为每个头独立设置。
在传统的多头注意力机制中，每个注意力头都有独立的 W_Q^i、W_K^i、W_V^i  矩阵用于将输入转换成查询、键和值。这导致了参数量的增长，尤其是在头数较多的情况下。MQA简化了这一过程：

- 共享的键和值矩阵：对于每一层，所有注意力头共享同一个键  K和值 V线性映射矩阵，即  W_K和 W_V。这意味着每层只有一个 W_K 和W_V 矩阵。
- 独立的查询矩阵：查询矩阵  Q 仍然为每个头独立设置，即 W_Q^1 ,  W_Q^2 ..., W_Q^h , h 是头的数量。
这种设计减少了模型的参数量，因为键和值的线性变换不再依赖于头的数量，从而降低了计算复杂度，特别是在大规模模型或长序列上时性能提升更为显著。
MQA计算公式表示为：
 \text{MultiQueryAttention}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W_O 
其中， \text{head}_i = \text{Attention}(QW_Q^i, KW_K, VW_V) 。这里的 W_Q^i 是第 i 个头的查询矩阵，而 W_K 和 W_V 是该层下所有头共享的键和值矩阵。

$- 查询矩阵  W_Q^i  的维度为 {d_{\text{model}} \times d_k} ，每个头都有自己独立的查询矩阵。$
$- 共享的键矩阵 W_K 和值矩阵 W_V 的维度分别为 {d_{\text{model}} \times d_k} 和 {d_{\text{model}} \times d_v} ，这两个矩阵在整个层内被所有头共享。$
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7fd00989cae4.jpg)

Multi-Query  Attention计算过程
MQA只让 Q 保留了原始多头的性质（每个Head存在不同的转换）,可以大大减少 K 和 V 矩阵的参数量以及KV Cache的显存占用，提升推理速度。但是可能会带来精度上的损失。广泛应用于大规模语言模型（LLMs），如ChatGLM2。

#### 
GQA(Group Query Attention)

GQA（Grouped Query Attention）是一种在MQA基础上进一步优化的注意力机制，旨在平衡参数量减少和模型性能之间的关系。通过将查询（Query, Q）进行分组，并让每个组内的所有头共享同一组键（Key, K）和值（Value, V），GQA试图保留多头注意力机制的优势，同时减少计算成本和显存占用。
GQA(Group Query Attention)实现步骤`：

- 查询分组：将所有的查询 Q 分成若干个组，每个组内的查询共享一组键 K 和值 V 。
- 共享键和值矩阵：每个组内共享同一个键矩阵 W_k^g 和值矩阵 W_V^g ，其中 g表示组编号。
- 独立的查询矩阵：每个组内的查询仍然有自己的查询矩阵W_Q^{i,g} ，这里 i 表示组内的头编号， g 表示组编号。
- 输出拼接和投影：所有组的输出被拼接在一起，并通过线性变换矩阵 W_O 进行投影。
GQA的计算公式表示为：
\text{GroupedQueryAttention}(Q, K, V) = \text{Concat}(\text{group}_1, ..., \text{group}_G)W_O 其中，\text{group}_g = \text{Concat}(\text{head}_{1,g}, ..., \text{head}_{h_g,g})，\text{head}_{i,g} = \text{Attention}(QW_Q^{i,g}, KW_K^g, VW_V^g) 
这里的W_Q^{i,g} 是第 g 组中第 i 个头的查询矩阵，而 W_K 和 W_V 是该组内所有头共享的键和值矩阵。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_875395b75f72.jpg)

Group Query Attention计算过程
#### 

MLA( Multi-head Latent Attention)

MLA的核心是对key和value进行低秩联合压缩，以减少KV Cache的计算量，通过一系列矩阵投影实现对k和v的压缩和解压。核心步骤如下：
$X\in \mathbb{R}^{l*d_model}  :输入序列长度 l 和模型维度  d_{model} $
 $W^Q\in \mathbb{R}^{d_model*d_q}  :查询权重矩阵，将输入映射到查询空间。$
1、压缩阶段

- 向下投影
k和v的原始表示  h_t 通过一个向下投影矩阵  W^{DKV} 被映射到一个更低维度的空间，形成压缩潜在向量 C_t^{kv} 。

C_t^{kv}=W^{DKV}h_t 

其中 C_t^{kv}\in \mathbb{R}^{d_c}  ,   $d_c$ 是压缩后的KV维度，且  d_c 。

- 缓存压缩向量
在推理过程中，只缓存 C_t^{kv} ，因此KV缓存只需要存储  d_c \times l 个元素，其中 l 表示层数。
2、解压缩阶段

- 向上投影
当需要使用这些压缩的k和v时，分别通过两个不同的向上投影矩阵  和 W^{UK} W^{UV} 将其恢复为原始维度。
 K_t^{C}=W^{UK}C_t^{kv} 
 V_t^{C}=W^{UV}C_t^{kv} 

- 推理计算
QK^T=XW^Q*({C_t^{kv}*W^{UK}})^T=X*(W^Q*(W^{UK})^T)*({C_t^{kv})^T} 
为了减小推理过程中的计算量， W^{UK} 为方阵是转置后还是其本身。将 W^{UK} 吸收到查询矩阵 W^Q ，  W^{UV} 吸收到输出变换矩阵 W^{O} 中，在计算注意力的时候使用 W^{Q} 和压缩的k向量 C_t^{kv} 作用，最后再使用输出变换矩阵 W^{O} 得到最后的输出。
新的查询矩阵 W^{Q'} 表示为：
 {W^Q}^{'}=W^Q.W^{UK} 
新的输出变换矩阵 $W^{O'}$ 表示为：
 {W^O}^{'}=W^O.W^{UV} 
 $$\text{Attention}(Q^{'}, C_t^{kv}) = \text{softmax}\left(\frac{Q^{'}({C_t^{kv}})^T}{\sqrt{d_k}}\right)C_t^{kv} $$
其中， Q^{'}=X{W^Q}^{'} 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d0105cb3226d.jpg)

Multi-head Latent Attention计算过程
MQA这种共享一个K，V，只有Q是独立的，大幅减小了参数数量，带来推理加速的同时会造成模型性能损失，且在训练过程使得模型变得不稳定，从而提出了GQA，它将Query进行分组，每个组内共享一组Key、Value。

当GQA的分组数N等于1时，GQA等价于MQA，所有的查询Q共享一组K、V，当GQA的分组数N等于查询Q的数量时，GQA等价于MHA，每一个Q对应自己的K、V矩阵。

#### 小结

MQA这种共享一个K，V，只有Q是独立的，大幅减小了参数数量，带来推理加速的同时会造成模型性能损失，且在训练过程使得模型变得不稳定，从而提出了GQA，它将Query进行分组，每个组内共享一组Key、Value。当GQA的分组数N等于1时，GQA等价于MQA，所有的查询Q共享一组K、V，当GQA的分组数N等于查询Q的数量时，GQA等价于MHA，每一个Q对应自己的K、V矩阵。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_138086647ca2.jpg)

四种attention计算过程当GQA的分组数N等于1时，GQA等价于MQA，所有的查询Q共享一组K、V，当GQA的分组数N等于查询Q的数量时，GQA等价于MHA，每一个Q对应自己的K、V矩阵。

特性MHA (Multi-Head Attention)MQA (Multi-Query Attention)GQA (Grouped Query Attention)MLA( Multi-head Latent Attention)参数共享程度Q、K、V矩阵都独立共享K、V，Q矩阵独立每组共享K、V，组内Q矩阵独立压缩K、V，通过投影矩阵解压推理效率推理慢，计算量大推理快，减少了计算量推理接近MQA，同时保持模型性能高效，减少了KV缓存占用模型性能最优轻微下降接近MHA优于MHA训练稳定性强第中中特殊情况-GQA分组数为1等价于MQAGQA分组数等于Q矩阵数量等价为MHAGQA分组数为2.25时两者kv cache相当应用模型bert、t5palmllama2、chatglm2、baichuan、qwendeepseekv2、deepseekv3![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fbfbbf5a128e.jpg)

三种注意力机制的推理性能对比与MHA 相比，经过升级训练的 MQA 具有更优的权衡，其质量和速度都比 MHA-Large 更高，而 GQA 的性能甚至更好，速度增益与 MHA-XXL 相似，质量也相当。在所有任务上，T5-Large 和 T5-XXL 在所有任务上的平均性能与每个样本的平均推理时间有关，而 T5-XXL 在所有任务上的平均性能与 MQA 和 GQA-8 注意力有关。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7492334cdcfb.jpg)

 不同分组数的性能对比GQA-XXL 的每个样本的时间是 GQA 组数的函数，输入长度为 2048，输出长度为 512。从 1 (MQA) 到 8
组会增加适度的推理开销，并且增加更多组的成本也会增加。在分组数量大于8以后推理开销显著变大，因此在llama中GQA的分组数设定为8。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a954a3395529.jpg)

四种attention机制的性能对比

- MHA KV缓存大小：
KV  {Cache} per Token =n_h\times d_h 

- MQA KV缓存大小：
 KV Cache per Token =d_h 

- GQA KV缓存大小：
 $$KV Cache per Token =\frac{n_h}{n_g} \times d_h $$

- MLA KV缓存大小：
KV Cache per Token = d_c 
 n_h 表示注意力头的数量， d_h 表示每个注意力头的维度， l 表示层数， n_g 表示 GQA 中的组数， d_c 和 d_h^R 分别表示 MLA 中解耦查询和键的 KV 压缩维度和每个头的维度。DeepSeek-V2的KV缓存等效于GQA仅有2.25组时，LA的KV缓存大小与GQA相等。MLA机制，在减少KV缓存占用的同时，实现了比传统MHA更强的性能。

#### 参考

【1】Attention Is All You Need[https://arxiv.org/pdf/1706.03762](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1706.03762)

【2】GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints[https://arxiv.org/pdf/2305.13245](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.13245)

【3】LLaMA: Open and Efficient Foundation Language Models[https://arxiv.org/pdf/2302.13971](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2302.13971)

【4】PaLM: Scaling Language Modeling with Pathways[https://arxiv.org/pdf/2204.02311](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2204.02311)

【5】[Linsight：理解Attention:从起源到MHA,MQA和GQA](https://zhuanlan.zhihu.com/p/686149289)

【6】DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model[https://arxiv.org/pdf/2405.04434](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2405.04434)

[编辑于 2025-01-19 19:40](//www.zhihu.com/question/68482809/answer/79951615941)・湖南

​2 条评论​35 ​1 ​分享

​​

收起​