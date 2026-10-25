---
title: (2 条消息) Pre Norm 和 Post Norm 各自的优缺点？｜频次：★★★
date: "2025-01-16 00:00:00"
updated: "2025-01-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Pre-Norm-和-Post-Norm-各自的优缺点-频次-★★★/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/18753164849
---


这个问题其实还蛮难回答的，因为目前并没有特别好的理论来解释清楚。

我们先按时间顺序来梳理一下关于 Pre-Norm 和 Post-Norm 的研究。

Pre Norm 和 Post Norm 的区别 Layer Norm 和 Residual connections 组合方式的不同。

### <strong>2017 Attention is All your Need</strong>

<strong>在原始的 Transformers 论文中，使用的是 Post Norm</strong>，如下所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01d77da6eb5a.jpg)

Post Norm 用公式可以表示为：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5aebb647c0f2.jpg)

每一层的输入先与 Attention 相加，然后才计算 Layer Norm。早期的很多模型都用的是 Post Norm，比如著名的 Bert。

Post Norm 之所以这么设计，是把 Normalization 放在一个模块的最后，这样下一个模块接收到的总是归一化后的结果。这比较符合 Normalization 的初衷，就是为了降低梯度的方差。但是层层堆叠起来，从上图可以看出，<strong>深度学习的基建 ResNet 的结构其实被破坏了</strong>。

这就导致大家在训练 Transformers 的时候，<strong>发现并不是那么容易的训练，learning rate warm up, 初始化等各种招都用上，训练的时候还得小心翼翼</strong>。

下一篇文章讨论了 ResNet 中  Identity mappings 的重要性，并且以此为基础提出了 Pre Norm。

### <strong>2019 Transformers without Tears: Improving the Normalization of Self-Attention</strong>

假设输入 X、Attention(X)、FNN(X) 的均值为0，方差都为1，且相互独立。事实上可能没有那么理想，因为权重矩阵的分布在学习过程中并不一定能保持理想的分布，这里为了说明问题对建模进行了简化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bb5e410debfb.jpg)

这个式子的第一项会随着层数递减，而且是指数的变小。如果层数较低还好，如果像是现在的大模型一样堆叠32层，那 几乎和0没什么区别了，也就丧失了 ResNet 的意义。

<strong>Post Norm 就像在何凯明修的高速公路上，每一层都加了一个收费站。</strong>

没了 ResNet 的架构，就导致 Transforemrs 在训练的时候，需要小心翼翼。都要加一个 learning rate warm up 的过程，先让模型在小学习率上适应一段时间，然后再正常训练。