---
title: "多模态大语言模型（MLLM）为什么最近的工作中用BLIP2中Q-Former结构的变少了？"
date: 2024-05-11
tags: [知乎]
source: https://www.zhihu.com/question/626796690/answer/3494816721

---

因为qformer的复杂度没有必要引入。。

qformer和detr差不多，都是用一些query embedding想把image embedding里面的语义obj提取出来。不过这就有个问题，一张图里面obj有多少呢，query emb设多长？这个先验也不好获得。不如直接把所有emb一起input