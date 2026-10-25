---
title: (2 条消息) 如何看待Log-linear Attention?
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何看待Log-linear-Attention_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1914749108511540671/answer/1919954084464685369
---


作为和两个一作都非常熟的朋友，来客观的评价下这篇文章。希望不要破坏大家的友情哈哈哈哈

```text
TL;DR. 和sonta说的比较一样，很大的一个价值是揭示了如何用attention mask+decay就可以很清晰的表达出不同的softmax/linear attention变体具体是怎么定义的。同时也某种程度上体现出了state可以一种更灵活的方式组合，从而可以动态的在softmax and linear attention间寻找平衡点。
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_674ee74263e4.jpg)

首先从motivation上，传统的softmax attention需要 O(N^2) 的计算复杂度+ O(N) 的空间复杂度，而linear attention对应的是 O(N) 的计算复杂度+ O(1) 的空间复杂度。后者显然享有更低的复杂度，但相应的也会导致过去信息的遗忘。这个时候很自然的一个想法就是能不能在两者之间取得一个折衷点，相应的就带来了这篇Log-linear Attention。

但是其实本质上来说，Log-linear Attention更多是各种Linear Attention的一个通用的变体，用稍微提升的复杂度换取稍微提升的记忆能力（从下图中我们也可以看出 logn 相对于 n 的差异还是非常大的，所以我们也并不难看出，其记忆能力相对Linear Attention的提升还是很有限大。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5522cd875f91.jpg)

那Log-linear Attention是如何改变这个复杂度的，一个很直观的解释就是在softmax attention里面，每个token单独对应一个记忆(KV Cache)，而在linear attention中，所有的信息被组合进同一个记忆中(State)，所以对应的方法就是去分组组合每个token的记忆，从而把N的token分到logN个记忆中。基于这个思想，作者选择用Fenwick Tree的方式去进行划分，简单概括来说就是近距离保留更原始的信息，远距离对信息有更大的压缩比，从而符合了序列信息的一种天然bias。但相应的，我们也可以看出Log-linear Attention并不能很好的记忆远处的信息，因为还是一个高度压缩后的信息。所以从我的角度上，我认为其更大的可能性是避免了过去工作中对于linear attention和sliding window attention的hybrid，因为其可以对近处的信息有着更好的记忆能力，但可能离解决linear attention的远距离记忆问题还是有很大的距离（因为整体的state size还是过小了）

然后一个比较有意思的一点是，基于这个思想，其实我们可以去构建各种各样复杂度的记忆系统：
比如很多稀疏注意力中的selection branch，对应的就是一种常数级别压缩的记忆系统；然后如果我们类似monarch那种分成多个 O(\sqrt N) 大小的block，就自然是一种 O(N\sqrt N ) 复杂度的系统了。类似的，其实还可以去构建很多种多样的系统，取决于你如何去切分你的token。

最后再讲一些更技术的细节，上述的所有分析都是在一个静态的环境下，也就是给你N个token，如何进行切分，但在实际情况中，LLM的序列长度是不断线性增长的，所以可能每隔一段时间就需要更新切块，如果这种情况下，全部从最原始的状态重新合并进行重算就会显得非常昂贵。因此，对于Fenwick Tree的选择就显得非常合理了，因为作者采用了lssb来判断当前第一个非0的数位，相应的把树上的一些层（不同压缩比）的信息聚合并传递至下一层，这样避免了把聚合的状态再恢复到原始状态重新组合的问题，也即全程不会出现split的操作，只会发生merge。而这个设计，也是得益于linear attention的state之间可以进行天然组合，形成一个压缩度更高的state。

总体来说，算法本身很有意思，关于不同token之间的信息如何能够动态的高效组合，在有限的memory内尽可能的充分利用会是个很有意思的研究方向～

[发布于 2025-06-22 03:05](//www.zhihu.com/question/1914749108511540671/answer/1919954084464685369)・美国

​1 条评论​157 ​3 ​分享

​​

收起​