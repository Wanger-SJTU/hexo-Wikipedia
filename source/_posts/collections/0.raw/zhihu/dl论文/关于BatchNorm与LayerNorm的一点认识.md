---
title: 关于BatchNorm与LayerNorm的一点认识
date: "2022-08-23 00:00:00"
updated: "2022-08-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/关于BatchNorm与LayerNorm的一点认识/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/556630201
---


### 今天讨论到LayerNorm的问题，突然就想到为什么要对一个句子（一条样本）进行LayerNorm，感觉自己对BERT中的LayerNorm还是没完全想明白，就查了查资料又看了下源码，分享一下我的想法。

假设现在有一批数据（或者说某一层的输入或输出），对于cv来说，通常是这样：

[batch\_size, channel\_size, feature\_map\_height, feature\_map\_width]   

简化一下就是`[B, C, H, W]`，其中`batch_size`是批大小，`channel_size`是通道数，`feature_map_height/width`就是特征图的长和宽。

对于NLP来说（这里就指BERT的输入），通常是这样：

[batch_size,max_sequence_length,word_embedding_dimension] [batch\_size, max\_sequence\_length, word\_embedding\_dimension]  

简化一下就是`[B, S, D]`（这个是我瞎起的），其中`max_sequence_length`就是文本的最大长度，`word_embedding_dimension`就是token向量的维度，对于BERT-base就是768。

感谢 @Quokka

 的指正，之前的对应关系时错的：

NLP 和 CV 相比，应该是 HW 对应 S（大小由输入数据本身的尺寸决定，前者是空间位置，后者是时间位置；要提取整张图的信息要对不同空间位置做 pooling，要提取整句话的信息要对不同时间位置做 pooling），C 对应 D（相当于隐层维度，这个可以自己设置，属于网络超参数。CV 里设置有几个输出通道，NLP 里设置词向量维度或者隐层维度）。应当是`C`和`D`对应，`C`是CV里设置的通道数量，`D`是nlp里词向量的维度，都是属于网络超参数；`H*W`和`S`对应上，这是有输入决定的，前者是由输入图像尺寸决定，后者由输入文本的长度决定。 

> 之前是这样写的（是错的）：CV和NLP的输入对应上的话，`B`没什么好说的；`C`可以和`S`对应上，如果取具体值得话，cv上就是某一个通道，nlp就是某一个字，`D`可以和`H*W`对应上，cv上就是一个通道上某一个特征值，nlp上就是一个token嵌入的某个特征值。

### NLP中的批数据输入形式

在进行标准化之前，还需要考虑一个问题，在实际的计算中到底什么是一批数据，只有考虑清楚这个问题，才能明白具体进行标准化的对象是哪些特征，这里还把@Quokka

 老哥的评论搬过来：

> 关键就是这个形如 [B, S, D] 的 tensor 它其实不是一层，而是 S 个形如 [B, D] 的层拼接的结果。用 RNN 来想就很明白了，计算完时间步 t 以后才能计算时间步 t+1，比如 h_{t+1}=tanh(Wh_t+b)，h_{t+1} 和 h_t 在计算图上的深度都不同，显然第 t 个词的 D 维向量和第 t+1 个词的 D 维向量属于两个不同的层。只不过为了方便使用，会把所有的 h_{1:T} 都拼接起来组成一个 tensor 返回。在 xfmr 里，因为各个时间步可以同时计算，所以这一点不够不明显了。

再搬一下LayerNorm论文里举的一个RNN的例子时的原话：

> It is common among the NLP tasks to have different sentence lengths for different training cases. This is easy to deal with in an RNN because the same weights are used at every time-step. But when we apply batch normalization to an RNN in the obvious way, we need to to compute and store separate statistics for each time step in a sequence. This is problematic if a test sequence is longer than any of the training sequences. Layer normalization does not have such problem because its normalization terms depend only on the summed inputs to a layer at the current time-step. It also has only one set of gain and bias parameters shared over all time-steps.

简单来说，由于RNN在每个时间步都共享同一套参数（其实Transformer也是一样，同一层的不同token共享同一套QKV），BatchNorm是跨时间步进行的（换句话说就是跨token进行的，因为一个batch中所有句子在同一位置的token属于同一个时间步），而LayerNorm是只取决于当前时间步（或者说当前这个token）。

从这样的视角来看，或者说从网络的实际计算流程来看，对于一批文本输入`[B, S, D]`，实际上可以看作是由S个`[B, D]`的输入拼接而来的，其中每个`[B, D]`代表的是一个batch中所有句子在某一位置（或说某个时间步）的token嵌入组成的。在RNN中，`[B, D]`按时序依次输入网络，在Transformer中则是通过并行计算，但本质上都是通过同一套参数来计算。 因此，在`[B, S, D]`上进行LN，就是在S个`[B, D]`这样的批数据上进行LN，只不过这S个LN共享同一套 gain(\gamma)和bias(\beta)。

### 标准化 Normalization

进行标准化操作的公式如下：

 $$y=\frac{x-\mathrm{E}[x]}{\sqrt{\operatorname{Var}[x]+\epsilon}} * \gamma+\beta  $$

具体操作就是通过均值与标准差将特征归一化后再通过可学习的参数\gamma 与 \beta映射到一个新的分布上（注意这里的 \gamma与 \beta是针对每个特征值的，假如一个向量100维，进行标准化后就会有100个\gamma与 \beta）。根据要归一化的特征所在的不同位置，Normalization分为BatchNorm, LayerNorm等等，这里主要讨论这两种。还是看这张经典的图。(补充一下：这张图是面向CV的，像上面讨论的由于NLP数据的组织形式不同，这张图好像并不适用于NLP)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_ce2d310fc03b.jpg)

#### BatchNorm

cv：就是对于某个通道c，所有batch在通道c的所有特征进行标准化（`B*H*W`），或者说是“逐通道**”进行，对每个通道都计算出均值、标准差，一共C组。

nlp：根据之前的讨论，`[B, S, D]`看作S组的`[B,D]`，BN就可以看作是在`[B,D]`上对D的每一维分别进行标准化，或者说是“<strong>逐维</strong>”进行，对于token嵌入的每个维度都计算出均值和标准差，一共S*D组。根据上面引用的LayerNorm的原文，可以看到，BN需要计算batch中每个时间步（每个位置）的均值和标准差，而如果测试集存在长度大于S的文本，那这些文本的统计数据就是缺失的，这里就存在问题。

注意，<strong>下面这张图是错的</strong>，不是对同一batch中同一位置的整体嵌入进行标准化，而是对嵌入的不同维度进行标准化。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_cc6150190f74.jpg)

这张图中举例的BN是错误参照Pytorch的`torch.nn.BatchNorm2d`，cv的BatchNorm的实现如下：（NLP我的理解可能有问题这里就不放实现了）

# initialize
cv_batch_norm = nn.BatchNorm2d(C)

# normalize embedding
cv_embedding = cv_batch_norm(cv_embedding) # cv_embedding: [B, C, H, W]

#### LayerNorm

cv：对于batch内某个样本b，所有通道的所有特征进行归一化（`C*H*W`），或者说是“<strong>逐样本</strong>”进行，每个样本都计算均值、标准差，一共B组。

nlp: 根据之前的讨论，`[B, S, D]`看作S组的`[B,D]`，自然LN就是“<strong>逐字</strong>”进行，对每个token嵌入都计算均值、标准差，一共S*B组。

参照Pytorch的`torch.nn.LayerNorm`,cv和nlp的LayerNorm的实现如下：

# initialize

```text
cv_layer_norm = nn.LayerNorm([C, H, W])
nlp_layer_norm = nn.LayerNorm(D)
```


# normalize embedding

```text
cv_embedding = cv_layer_norm(cv_embedding) # cv_embedding: [B, C, H, W]
nlp_embedding = nlp_layer_norm(nlp_embedding) # nlp_embedding: [B, S, D]
```


然后看huggingface开源的BERT代码如下，可以看到就是在BERT中的实现也就是传入toekn嵌入的维度hidden_size，对每个token的嵌入进行标准化：

```python
class BertEmbeddings(nn.Module):
    def __init__(self, config):
        ...
        self.LayerNorm = nn.LayerNorm(config.hidden_size, eps=config.layer_norm_eps)
        ...

    def forward(...):
        ...
        embeddings = self.LayerNorm(embeddings)
        ...
```


#### 一点想法

今天突然想到这个问题，查了资料看了源码，看到BERT的LN是对每个token归一化，也就是对`[B, S, D]`中的`D`进行，而我原本以为是按照上面那张各种标准化的图里那样对`[B, S, D]`中的`[S, D]`进行，最后经老哥评论才发现原来是我对NLP数据的输入形式没想明白。

从现实意义去考虑为什么nlp要LN而cv要BN的话，cv里面同一个通道的特征是通过同一个卷积得来的，提取的是同一类的特征，自然就可以放在一起进行norm，对于输入来说，比如3通道红绿蓝，红的跟红的去归一化，蓝的跟蓝的去归一化，也很自然嘛。但是在nlp里面，每个句子长短不一出处不同，token也不尽相同，句子与句子之间的同一位置进行BatchNorm或者同一句子的token与token之间去LayerNorm(图中的那种)，并没有什么意义。
然而，对token自身进行norm，就可以看作是把一个句子里的不同位置的token嵌入归一化到高维空间中半径为1的球的表面上**，每个归一化后的嵌入都可以看作是从原点指向不同的方向的单位向量，这样在之后self-attention计算注意力的点积就有点计算余弦相似度的意味了，也就是方向比较一致的token之间的注意力就会相对更大，方向相背离的token之间的注意力就会相对较小。从这个角度看的话，这种归一化好像更有意义。上面这段是昨天最后写的，其实感觉也有问题。标准化的主要目的还是使训练更加稳定，像上面说的归一化到单位向量应该是通过除以2-范式来实现，也不是通过标准化来实现的。想看LN在Transformer的更多讨论可以参考一下第二批参考文献。

此外，也吸取了一些经验与教训，一是不要过分信赖网络上的博客，有不懂的还是看论文看源码，其实原论文里写的非常清楚，二是还是要多分享，分享了别人看到了才能指出自己的错误。最后，非常感谢 @Quokka

 写的评论，让我对NLP中的LN有了更清晰的认识。

写的仓促，欢迎讨论与批评指正。

#### 参考文献：

[Layer Normalization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1607.06450)

On Layer Normalization in the Transformer Architecture

LayerNorm - PyTorch 1.12 documentation

BatchNorm2d - PyTorch 1.12 documentation

深入理解NLP中LayerNorm的原理以及LN的代码详解_白马金羁侠少年的博客-CSDN博客_layernorm层
