---
title: L2 prefetch
date: "2026-06-29 00:00:00"
updated: "2026-06-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/L2-prefetch/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2055051175477655441
---


最近读了2篇关于L2预取的论文。分别是NV和昇腾上做的。

Accelerating LLM Inference Throughput via Asynchronous KV Cache Prefetching（AAAI26）
在计算当前kv block的时候，预取下一个kv的值到L2

PRESERVE: Prefetching Model Weights and KV-Cache in Distributed LLM Serving（arxiv很久了。。）
通信过程不需要存储在L2里，只需要放到HBM，所以可以借此时机去预取后续计算的权重（或者kvcache）

这里面用的技术都是cp.async.prefetch啊，是一种hint。这让我想起另一篇PF-LLM。具体在什么时机做预取，设定L2模式是streaming还是persistent，很有技巧啊，似乎可以结合大模型与sweep，找到最优性能。当前agent的流行使得decoding，推理变得更加重要，因此L2 prefetch是一个有趣的课题。

不过。我自己对这俩论文的方法在H20上做了一下实验，性能提升比较小。。2%左右吧。。