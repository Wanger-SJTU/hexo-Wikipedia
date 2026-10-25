---
title: "大模型已有文本表征能力，为什么还需要向量表征（embedding）模型？"
date: "2024-01-05 00:00:00"
updated: "2024-01-05 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/大模型已有文本表征能力,为什么还需要向量表征(embedding)模型/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/637789621/answer/3351386560"
---


以前BERT时代就已经有过结论了——直接用原始BERT生成文本表示的话，由于BERT生成的向量存在各向异性问题，其在向量空间中的分布高度不均匀，因此效果很差。为了基于BERT获得比较好的向量表示，就必须使用对比学习方法对BERT进行自监督训练。

LLM也同理——形式上直接用最后一个token的Embedding确实可以作为文本表示使用，但效果显然无法得到保证。如果要用LLM生成Embedding就同样需要对比学习训练——但这样一来成本就高到完全无法接受，而且训过的LLM就不能拿来干别的事情了。这种事情基本上只有财大气粗如OpenAI才能做到。