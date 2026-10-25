---
title: "(2 条消息) 为什么Deepseek-V3类模型部署使用DP+EP比TP+EP更优？"
date: "2025-04-10 00:00:00"
updated: "2025-04-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/为什么Deepseek-V3类模型部署使用DP-EP比TP-EP更优/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1893454979878085947"
---


今天在单位和同事和导师们交流终于想明白了这个问题，浅浅记录一下，不算是很完备的report，简单看看吧。可能有胡说八道指出，欢迎评论区指正。

DP+EP是Attention DP + MoE EP。

MoE如果做EP，可以做很大的分布式，比如144张卡做EP144。（256稀疏专家+32共享专家=288，一张卡分到两个专家）

DP+EP和TP+EP的区别主要是attention部分的并行方式有区别。

### DP+EP与TP+EP分别的具体含义

attention DP是指每一张卡上载入一份attention的权重，然后从batch维度切开（ `batch_per_rank = batch_size // dp_size`)，对单个batch内计算attention。attention部分不涉及通信。（最后给MoE部分的EP是一次All-to-all通信）

如果是attention TP的话，是讲attention的权重矩阵按照num_heads维度切开，然后不同rank计算不同的head上的attention，最后做一次all-reduce。（每个rank需要得到整个hidden才能做MoE的计算，然后如果当前卡的expert被激活才计算，如果当前卡上的expert没有被激活，就直接浪费了这张卡的通信带宽）

### DP+EP的好处——KV Cache内存优化

MLA里面，“KV Cache“里面的c向量（见deepseek-v3 tech report）不再是multi-head的。c的维度远小于`head_dim* num_head`。

这造成一个后果是，如果attention部分是TP，每一个dp_rank上都要存所有token的c向量（`batch_size * seq_len`）（后面再upcast成multi-head k，v，再切出部分头做计算）；而如果attention部分是DP，则每一个dp_rank上只需要存`batch_per_rank * seq_len` 长度的tokens，可以省去dp_size倍的kv cache空间。

### DP+EP的trade-off

需要多存储attention权重矩阵，大约每个dp_rank多10GB显存（对于dpsk-v3的模型）。如果是小并行（N2）可能会大幅减少KVCache的空间，造成总batch下降。如果大并行（N18），这个显存对于KV Cache的影响没有那么大。