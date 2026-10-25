---
title: transformer block
date: "2026-04-11 21:40:17"
updated: "2026-04-11 21:40:17"
layout: post
permalink: /collections/草稿/Dynamic-Sparse-LLM—offload的艺术/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


# transformer block
![Pasted image 20240922215653.png](/images/collections/assets/Pasted%2520image%252020240922215653.png)
> Attention是时空力场（LLM只有时，Version存在空间力场），而FFN则是空间结构，并且代表了基于Knowledge的静态高纬字典，也有人用图书馆来比喻。    ——夏Core

首先回顾一下transformer block的结构，Attention +FFN，前者随着序列的增长占用越来越高，FFN则在权重中占了极大比例。按当前大家的认识来看，
- Attention部分完成的是时间序列建模，完成的当前token与历史信息（kv cache）的相关性查找。
- FFN层则沉淀了训练集中的固化的知识，从Gate、Up的运算来看，其计算也有很强的查找属性。而且从量化难度上看，Up、Gate可以做到更低比特量化，Down则比较困难，从这方面也可以反映出，Up、Gate接近于查找key，Down部分对应value，最终得到结果传递给下一层