---
title: "如何理解现有的各种序列并行技术，Ulysses, Megatron-LM SP/CP等？"
date: "2024-12-09 00:00:00"
updated: "2024-12-09 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/如何理解现有的各种序列并行技术,Ulysses,-Megatron-LM-SP_CP等/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/4130491572/answer/51095129472"
---


这个，序列并行的核心是分布式attention。Ulysses, Megatron-LM SP/CP这几个都是分布式attention场景的不同实现，用于训练场景。然而推理场景也有序列并行，所有所有的序列并行技术、以及不同的场景（训练和推理），笔者均有详细总结和分析。

[手抓饼熊：大模型推理序列并行](https://zhuanlan.zhihu.com/p/9816504195)[手抓饼熊：图解序列并行云台28将（上篇）](https://zhuanlan.zhihu.com/p/707204903)[手抓饼熊：图解序列并行云台28将（云长单刀赴会）](https://zhuanlan.zhihu.com/p/707435411)[手抓饼熊：图解序列并行云台28将（下篇）](https://zhuanlan.zhihu.com/p/707499928)[手抓饼熊：序列并行云台第29将](https://zhuanlan.zhihu.com/p/708670154)[手抓饼熊：序列并行DeepSpeed-FPDT](https://zhuanlan.zhihu.com/p/720387198)