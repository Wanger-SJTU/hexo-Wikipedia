---
title: 为什么大模型结构设计中往往使用postNorm而不用preNorm？
date: "2024-02-23 00:00:00"
updated: "2024-02-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/为什么大模型结构设计中往往使用postNorm而不用preNorm/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682747135
---


本篇结合深度神经网络特点、postNorm与preNorm的公式阐释、实验结论以及具体Post Norm的用法来解释大模型结构设计中往往使用postNorm而非preNorm这一现象。

我们知道，大模型网络结构中基本上都用Post Norm，而几乎不用Pre Norm。其实Pre Norm与Post Norm之间的对比算是“老生常谈”的话题了，一个比较明确的结论是：

<strong>同一设置之下，Pre Norm结构往往更容易训练，但最终效果通常不如Post Norm。</strong>

那么是为什么呢？

本文通过公式阐释、实验结论以及具体Post Norm的用法来试图解释这个结论，下面是一个快捷目录。

## 1. 直观理解


## 2. 实验结论


## 3. PostNorm 结构的模型中 warm up 是如何起作用的？


### 一、**直观理解

#### 1.结论

Pre Norm的深度有“水分”！

也就是说，一个L层的Pre Norm模型，其实际等效层数不如L层的Post Norm模型；而因为pre Norm实际层数少了导致效果变差了。

#### 2.公式阐释

<strong>1）Pre Norm 和 Post Norm的公式</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_632309388256.jpg)

式中，Norm主要指Layer Normalization，但在一般的模型中，它也可以是Batch Normalization、Instance Normalization等，相关结论本质上是通用的。

<strong>2）Pre Norm的推导</strong>

对于Pre Norm我们可以迭代得到：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_42f12cae2865.jpg)

式中每一项都是同一量级的，那么有  ，也就是说第t+1层跟第t层的差别就相当于t+1与t的差别，当t较大时，两者的相对差别是很小的，因此

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d4974b0eda87.jpg)

这个意思是说，当t比较大时，xt，xt+1相差较小，所以Ft+1(Norm(xt+1))与Ft+1(Norm(xt)很接近，因此原本一个t层的模型与t+1层和，近似等效于一个更宽的t层模型，所以在Pre Norm中多层叠加的结果更多是增加宽度而不是深度，层数越多，这个层就越“虚”。

而我们知道，神经网络深度通常比宽度更重要：

<strong>a. 提升同样效果需要增加的宽度远远超过需要增加的深度</strong>

- Delalleau和Bengio等人的论文《Shallow vs. Deep sum-product networks》中提出，对于一些特意构造的多项式函数，浅层网络需要指数增长的神经元个数，其拟合效果才能匹配上多项式增长的深层网络。
- Eldan和Shamir等人的论文《The power of depth for feedforward neural network》中构造了一个3层网络，并尝试用一个2层网络获得近似的表达能力，结果宽度呈现了指数级的增加。
- Zhou Lu等人的论文《The expressive power of neural networks: A view form the width》中表明，宽度减少后用于补偿模型性能的深度不是呈指数级增长，而是多项式增长。
从这几篇论文的角度来看，似乎模型性能对宽度确实没有深度那么敏感。

<strong>b. 宽而浅的网络可能比较擅长记忆，却不擅长概括，即泛化能力差</strong>

在<strong>MobileNet</strong>模型的研究中，作者们通过实验表明窄且深的MobileNet架构比宽且浅的架构准确率更高。

多层的优势在于可以在不同的抽象层次上学习特征，随着层数的增加，每个神经元相对于前一层的感受野变得越来越大，因此深层可以提供全局语义和抽象细节的信息，这是宽层很难做到的。

那么再根据上面公式推导的结论，说白了，Pre Norm结构无形地增加了模型的宽度而降低了模型的深度，所以在无形之中的降低深度导致最终效果变差了。

### 二、**实验结论

#### 1. Pre Norm效果优于Post Norm？

《On Layer Normalization in the Transformer Architecture》这篇论文中显示Pre Norm要好于Post Norm。

但其实这篇文章比较的是在完全相同的训练设置下Pre Norm的效果要优于Post Norm，这只能显示出Pre Norm更容易训练。通常Post Norm要达到自己的最优效果，不能用跟Pre Norm一样的训练配置。

Pre Norm可以不加Warmup，但Post Norm通常要加Warmup，如果Post Norm结构的模型不进行Wamrup，我们能观察到的现象往往是：loss快速收敛到一个常数附近，然后再训练一段时间，loss开始发散，直至NAN。所以结论并不矛盾。

#### 2. **其他实验

论文《Understanding the Difficulty of Training Transformers》与《RealFormer: Transformer Likes Residual Attention》都显示Post Norm优于Pre Norm。

此外，苏神的实验中，Post Norm的结构迁移性能更加好，也就是说在Pretraining中，Pre Norm和Post Norm都能做到大致相同的结果，但是Post Norm的Finetune效果明显更好。

### 三、PostNorm 结构模型中 warm up 如何起作用的？

大家可能已经听说过，Warmup是Transformer训练的关键步骤，没有它可能不收敛，或者收敛到比较糟糕的位置。为什么会这样呢？


Warmup是在训练开始阶段，将学习率从0缓增到指定大小，而不是一开始从指定大小训练。如果不进行Wamrup，那么模型一开始就快速地学习，由于梯度消失，模型对越靠后的层越敏感，也就是越靠后的层学习得越快，**然后后面的层是以前面的层的输出为输入的，前面的层根本就没学好，所以后面的层虽然学得快，但却是建立在糟糕的输入基础上的。

很快地，后面的层以糟糕的输入为基础到达了一个糟糕的局部最优点，此时它的学习开始放缓（因为已经到达了它认为的最优点附近），同时反向传播给前面层的梯度信号进一步变弱，这就导致了前面的层的梯度变得不准。

所以，如果Post Norm结构的模型不进行Wamrup，我们能观察到的现象往往是：loss快速收敛到一个常数附近，然后再训练一段时间，loss开始发散，直至NAN。如果进行Wamrup，<strong>那么留给模型足够多的时间进行“预热”，在这个过程中，主要是抑制了后面的层的学习速度，并且给了前面的层更多的优化时间，以促进每个层的同步优化。</strong>


这里的讨论前提是梯度消失，如果是Pre Norm之类的结果，没有明显的梯度消失现象，那么不加Warmup往往也可以成功训练。

更多的算法相关细节，前沿学术理论研究以及大模型微调专题实践代码，欢迎关注公众号：瓦力算法学研所

参考文献

[1] 苏剑林. (Nov. 08, 2021). 《模型优化漫谈：BERT的初始标准差为什么是0.02？》[Blog post]. Retrieved from [https://kexue.fm/archives/8747]

[2] 苏剑林. (Mar. 29, 2022). 《为什么Pre Norm的效果不如Post Norm？》[Blog post]. Retrieved from [https://kexue.fm/archives/9009]
