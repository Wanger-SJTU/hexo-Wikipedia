---
title: "为什么现在的llm大模型主要都是用RoPE位置编码而非其他？"
date: "2025-12-18 00:00:00"
updated: "2025-12-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/为什么现在的llm大模型主要都是用RoPE位置编码而非其他/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/1821771428/answer/1984941851405472205"
---


林谨

Life is append-only

​ 关注

23 人赞同了该回答

Canon Layer 告诉我们，只要序列方向有稳定的结构，一个简单的 Conv 1D 就能替代 RoPE。

Deepseek MLA 告诉我们，Partial RoPE 不弱于甚至强于 RoPE。

所以纯 RoPE 还是有一些挑战者的。

RoPE 最主要的特性是纯净和简单。

纯净指的是 RoPE 不作用于 V 上，简单指的是 RoPE 可以预计算绝对位置的 sin cos 表。RoPE 看起来有什么复数啊，旋转啊，其实实际操作非常简单。

我个人是更看好 Partial RoPE。RoPE 阻断了 QK 计算中 Q 和 K 的生成矩阵的线性交互。这也是 MLA 为什么只能吸收 NoPE 部分的 K 解压矩阵到 Q 生成矩阵里。

NoPE Q 和 K 的生成矩阵的线性交互可以让模型自己学习分工，Q 可以挪一部分工作到 K 里，反过来 K 也可以。QK 网络可能会隐式习得成一个小的 Encoder Decoder 网络。

那二者混合 Partial RoPE 就把两方面好处都占了。

编辑于 2025-12-18 12:51・北京

​赞同 23​​添加评论​32 ​喜欢​分享

​