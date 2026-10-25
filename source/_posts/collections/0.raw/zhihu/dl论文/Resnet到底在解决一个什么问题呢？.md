---
title: "Resnet到底在解决一个什么问题呢？"
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/Resnet到底在解决一个什么问题呢/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/64494691/answer/220989469"
---


知乎用户
​​​
深度学习（Deep Learning）话题下的优秀答主

726 人赞同了该回答

今年2月份有篇文章，正好跟这个问题一样。

The Shattered Gradients Problem: If resnets are the answer, then what is the question?

大意是神经网络越来越深的时候，反传回来的梯度之间的相关性会越来越差，最后接近白噪声。因为我们知道图像是具备局部相关性的，那其实可以认为梯度也应该具备类似的相关性，这样更新的梯度才有意义，如果梯度接近白噪声，那梯度更新可能根本就是在做随机扰动。

有了梯度相关性这个指标之后，作者分析了一系列的结构和激活函数，发现resnet在保持梯度相关性方面很优秀（相关性衰减从 12L\frac{1}{2^L} 到了 1L\frac{1}{\sqrt{L}} ）。这一点其实也很好理解，从梯度流来看，有一路梯度是保持原样不动地往回传，这部分的相关性是非常强的。

阅读全文​
​赞同 726​​20 条评论​502 ​53 ​分享