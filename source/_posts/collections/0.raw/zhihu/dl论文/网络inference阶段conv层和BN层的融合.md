---
title: "网络inference阶段conv层和BN层的融合"
date: "2018-10-30 00:00:00"
updated: "2018-10-30 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/网络inference阶段conv层和BN层的融合/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/48005099"
---


现在很多的网络结构都将BN层直接放在卷积层和激活层之间，这种做法可以在网络的inference阶段，将BN层的运算直接嵌入到卷积层中，减少运算量，提升网络的运行速度。

在inference阶段，已知某层卷积层的kernel参数 
$w$， 
$b$ ，以及输入 
$x$ ，紧随其后的BN层参数（已学习到）：尺度参数 
$\gamma$ 、偏移参数 
$\beta$ 、以及样本均值 
$\hat{u}$ 和标准差 
$\hat{\sigma}$ 。

- 则卷积层输出为： 
$$w\ast x  + b$$

- bn层输出为： 
$\gamma \frac{w\ast x+b-\hat{u}}{\sqrt{\sigma^2+\epsilon} }+\beta$ bn层的输出可以化为如下形式：

$$\gamma \frac{w\ast x +b-\hat{u}}{\sqrt{\sigma^2+\epsilon} }+\beta=\\ (\frac{\gamma}{\sqrt{\sigma^2+\epsilon}}w)\ast x + \frac{\gamma}{\sqrt{\sigma^2+\epsilon}}b - \frac{\gamma}{\sqrt{\sigma^2+\epsilon}}\hat{u} +  \beta =  kw\ast x +b'$$


所以，在inference阶段，如果BN直接跟在卷积层后，可以将BN层直接嵌入到卷积层的计算中，相当于将卷积核缩放一定倍数，并对偏置进行一定改变。

将BN层如何到卷积层中，就相当于对卷积核进行一定的修改，并没有增加卷积层的计算量，同时整个BN层的计算量都省去了。