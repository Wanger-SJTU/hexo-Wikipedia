---
title: "百面LLM-21"
date: "2024-04-04 00:00:00"
updated: "2024-04-04 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/百面LLM-21/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/688369625"
---


<strong>提问：</strong>如果我们把推理结果相关的多个关键段落按照下列规则藏在一段文章里：

- A：关键段落藏在头部
- B：关键段落藏在尾部
- C：关键段落藏在中间
- D：关键段落随机分布在文章中
然后，把文章交给大模型，并要求它生成正确的推理过程和结果。请按照模型能预测正确推理过程和结果的概率对这几个规则排序？

<strong>回答：</strong>B > A > C > D. 这是一个经典的长文本的大海捞针的问题，整体而言，模型的attention分布集中在头部和尾部，中间的attention较少，那么B > A > C。最后还有如果分散在文章中，这个结论就更难获得。Mistral 70B的研究结果如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b14faa3dc3a8.jpg)

更多结论可以参考论文 Same Task, More Tokens: the Impact of Input Length on the Reasoning Performance of Large Language Models [1]。

[1] Levy M, Jacoby A, Goldberg Y. Same Task, More Tokens: the Impact of Input Length on the Reasoning Performance of Large Language Models[J]. arXiv preprint arXiv:2402.14848, 2024.
