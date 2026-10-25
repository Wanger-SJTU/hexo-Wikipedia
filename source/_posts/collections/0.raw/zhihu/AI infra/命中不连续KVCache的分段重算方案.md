---
title: 命中不连续KVCache的分段重算方案
date: "2026-07-24 00:00:00"
updated: "2026-07-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/命中不连续KVCache的分段重算方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2063989921711501424
---


背景
推理架构一般仅支持到L1和L2缓存的管理和淘汰策略，比如SGLANG的hicache架构会使用radix tree统一管理L1和L2，淘汰策略会从叶子结点逐级向上淘汰，所以命中的KVCache一定连续。

但随着扩展L3级大容量缓存，L3的缓存管理统一交给LMCache/Mooncake等组件，这些组件没有完整的上下文信息，无法严格按照radix tree的形式从叶子结点向根节点逐级淘汰，所以很可能出现一段会话中的部分前置KVCache被淘汰，但后续KV可以命中的情况。

这种时候如果采用已有框架，需要把整段会话都重现一遍，计算出所有的历史KV。由于后续层的输入依赖于上一层的输出hidden，所以并不是只用一次矩阵乘法计算出KV矩阵就可以，而是需要把整段会话的prefill和decode流程都重新执行一遍。这样只要有不命中的KVCache，整体的效率就会很低。

vLLM社区针对该场景已经有两种支持方案。

方案一  attention算子支持可配mask
[https://github.com/vllm-project/vllm/issues/25672](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/issues/25672)

将已有token顺序且连续的放在前，缺失的历史token顺序依次重新计算。

由于缺失的历史token并不完整的依赖所有前序KV（重排序过），所以每个token计算时都要有独立的mask，选中前序KV。因此需要scheduler生成这个mask，且attention算子需要支持使用该mask（类似于prefill阶段的上三角）。

![](https://pic3.zhimg.com/v2-6d27d6f6faad1a1bb92e79779bdf9ad6_r.jpg)重排序后计算：

![](https://pic2.zhimg.com/v2-b4e8acaa76d5125df8a62968acaab019_r.jpg)
方案二  attention算子无缝支持
[https://github.com/vllm-project/vllm/pull/32785](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/pull/32785)

这个思路非常巧妙，利用了attention算子的已有特性。

我们如果把所有缺失的连续token块，都作为一个req去计算的话，第一反应就是：这些req是有互相依赖关系的，会话下游的token块需要依赖所有前序KV，所以需要这些请求串行执行，不可以放到一个batch里同步执行。

![](https://pic4.zhimg.com/v2-e029b09ca19f16a09f49558bbdfa0683_r.jpg)这个方案的作者比较了解attention算子。

一. attention算子的计算流程如下：

1. 先按层的粒度计算，再按batch/req的粒度计算；

2. 每层都会计算出batch内所有req r1-r4的KV后，再统一进行batch内所有req的attention计算。

二. 由于历史输出token是已知的，而decode阶段的首层输入是前一个token。所有的历史token都已知，所以我们的运算都可以直接使用prefill阶段的算子做prefill extend计算，不需要像第一次计算时decode阶段一个token一个token计算。

这样看，每层attention计算阶段依赖的历史KV，都已经被batch中的其他req在KV计算阶段计算出来了。所以这些req完全放到同一个batch中运算。

即使hole过多，req过多需要拆分到多个batch，那也只需要将前序token的连续req顺序组batch就可以了。只要明确reqs可以在同batch并行计算，这些就不是问题。

方案二充分利用了attention算子的计算流程，可以只修改scheduler而不需要引入attention算子的修改。