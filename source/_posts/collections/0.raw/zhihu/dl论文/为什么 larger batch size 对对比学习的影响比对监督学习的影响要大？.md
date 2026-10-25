---
title: 为什么 larger batch size 对对比学习的影响比对监督学习的影响要大？
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/为什么-larger-batch-size-对对比学习的影响比对监督学习的影响要大/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/483524293/answer/2327482420
---


霍华德
​
新加坡国立大学 电子及计算机工程系博士

​ 关注

可能是因为logK诅咒，其中K是batch size。softmax后的交叉熵损失函数可以写成：

−log⁡ezp∑iezn=log⁡(∑iezn)−zp=log⁡(1+∑i≠pezn−zp)\begin{equation}-\log \frac{e^{z_p}}{\sum\limits_i e^{z_n}} = \log \left(\sum_i e^{z_n}\right) - z_p = \log \left(1 + \sum_{i\neq p} e^{z_n - z_p}\right)\end{equation} 

其中， zpz_{p} 是正样本的分数， znz_{n} 是负样本的分数。

因为对比学习的正负样本差别是挺大的， ezn−zpe^{z_n-z_p} 的分数很快就会趋近于0，此时损失函数的数值将趋近于log⁡(1+(K−1)ε)\begin{equation}\log (1+(K-1)  \varepsilon)\end{equation} ，其中 ε\varepsilon 可以简单理解为所有负样本ezn−zpe^{z_n - z_p} 分数的平均值。当batch size比较小的时候，可以理解为 (K−1)ε(K-1)  \varepsilon 的值也会比较小，接近于0，这个时候浮点误差就会对计算结果造成比较大的影响，最后使得梯度变成随机噪音，使得模型无法进一步收敛。

以上分析来自于下面这篇FlatNCE的论文，详细地分析可以自己看下。

https://arxiv.org/pdf/2107.01152.pdfarxiv.org/pdf/2107.01152.pdf
所以避免这个问题，最简单的解法就是使用比较大的batch size。或者改造一下损失函数，这也是FlatNCE的目的和贡献。

阅读全文​
​赞同 401​​7 条评论​374 ​40 ​分享