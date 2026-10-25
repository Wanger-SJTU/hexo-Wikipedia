---
title: (2 条消息) 如何理解 Transformers 中 FFNs 的作用？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何理解-Transformers-中-FFNs-的作用/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/622085869/answer/3518358912
---


### 题目

Transformers 中 FFN 的作用是什么？

这个也是经常被问到的一个题目。如果你是 NLP 学生或者从业者，不妨先试着回答一下，如果有更好的答案欢迎交流。

一些大模型的知识整理到下面两个目录了：

[](https://zhuanlan.zhihu.com/p/18745601522)

[](https://zhuanlan.zhihu.com/p/1928382068011827620)

### 7年来答案的变化

我自己在面试过程中，感觉到这个题目的回答有一些有意思的变化。

几年前的时候，大家都会从非线性变换的角度来回答。这个时候我一般会再追问，attention 中也有 softmax，也是非线性，那 FFN 还是必须的么？

最近几年，感觉大家开始从 记忆，knowledge 等角度来回答，反而把非线性变换给忘了，要不忘初心啊亲们。当然这也只是我个人的身边统计学，可能不具备统计意义。

### 原始论文给的答案

Transformers 原始论文中的解释： FNN 可以看作用 1x1 的卷积核来进行特征的升维和降维。估计是当时 Transformers 内容太多，所以作者并没有很详细的解释。

### 最基本的答案：模型设计的角度

虽然 Transformers 论文的名字叫《Attention is All your Need》，但是实际上， **FFN and ResNet are also your need**.

研究人员发现 FFN 和 ResNet 的 Skip Connection 无论去掉哪一个，模型都会变得不可用，具体可以看《One Wide Feedforward Is All You Need》 这篇论文。所以说 **Attention, FFN, ResNet 可以认为是 Transformers 架构的三驾马车，缺一不可** 。

FFN 设计的初衷，其实就是为模型引入非线性变换。那接着问，attention 中也有 softmax，也是非线性，那 FFN 还是必须的么？ 大多数人开始产生自我怀疑，开始从别的角度回答 FFN 的作用。就比如用Transformers 原始论文中的解释： FNN 可以看作用 1x1 的卷积核来进行特征的升维和降维。

其实这么追问是个陷阱，用来了解一下候选人对 Transformers 细节的把握情况。这个陷阱其实会引出另外一个问题：attention 是线性运算的还是非线性运算的？

全局来看，对于x来说是非线性运算。因为仔细看一下 Attention 的计算公式，其中确实有一个针对 q 和 k 的 softmax 的非线性运算。

但是对于 value 来说，并没有任何的非线性变换。所以每一次 Attention 的计算相当于是对 value 代表的向量进行了加权平均，虽然权重是非线性的权重。这就是 FFN 必须要存在的原因，或者说更本质的原因是因为 FFN 提供了最简单的非线性变换。

线性变换无法处理一些非线性的特征，恰如当年马文明斯基给神经网络判的死刑，只需要加个非线性变换的激活函数就能起死回生。

Attention, FFN, ResNet 缺一不可但却可能是各司其职，我个人的观点（并不一定准确）是， Attention 的功能是做信息的提取和聚合，Resnet 提供信息带宽，而真正学到的知识或者信息都存储在 FFN 中。在图像领域中，也有一种说法，那就是 Attention 其实是 token mixer, FNN 其实是 channel mixer.

**

### 扩展答案： 功能性的角度

首先大家先猜一下整个 Transformers 中 FFN 的参数占比是多少？ 答案是 2/3，你猜对了么？

关于 FFN 的作用，后续研究人员做了很多实验和研究。但是直到目前也不能说就研究清楚了，因为神经网络的解释性本来就差。一个新技术的应用往往要比理论提前好久，比如 GBDT 等 ensemble 模型非常好用，但是很多年以后才用 Margin 的理论研究明白。

这里将一些 FFN 研究的成果做一个小汇总，只列举了目前大家都比较公认的结果。

#### FFN是 Transformers 的必备模块，没有 FFN 的 Transformers 学不到什么东西

上面的结论同样适用于 Transformers 中的 skip connect。

《 Attention is Not All You Need: Pure Attention Loses Rank Doubly Exponentially with Depth》这篇论文，提出了 Transformers 架构存在 token uniformity 的归纳偏置(inductive bias，有时候也叫归纳偏好)问题。如果去掉 FFN 或者 Resnet，则问题更加严重。

这里解释一下这两个名词，所谓归纳偏置，可以通俗的理解为模型的“个性”，就是满足训练集合的解法有无数种，但是不同的模型架构会让模型更偏向于某些解法。比如我们常用的一些正则化方法，其实就是让模型的归纳偏置倾向于选择一些简单的解法。任何模型都有归纳偏置，尤其是碰到未见过的样本的时候，模型的归纳偏置就更容易体现出来。 Transformers 的一个归纳偏执是什么呢？就是 token uniformity，有时候也叫 information diffusion，或者 anisotropic (各向异性)，也就是说 训练完后的 token 会共享很多相似信息。详细可以看：

[](https://www.zhihu.com/question/460991118/answer/2353153090)

看下图大概就知道了，我们期望表示 token 的向量，相似的要相近，不相似的要远，而且最好是均匀的分布在整个空间中，比如下图所示。但是 Transformers 会存在 各向异性的问题，也就是所有的 token 都挤到一个很窄的锥形区域了。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9348316e8736.jpg)

回到论文，论文将 FFN 和 ResNet 去掉之后做了一些消融实验，证明了 FFN 和 ResNet 是 Transformers 中的必备组件，这两个可以大大的缓解 token uniformity 或者 各向异性的问题。

论文中从数学上证明了经过 Attention 变换后的输出与 rank-1 的矩阵之间的差值存在上界，但是有点复杂，我也没仔细推导过。简单一点的理解呢，就是 Attention 本质上是 value 的线性变换（虽然线性变换的权重是非线性的softmax）。

当然并不是说 Transformers 就已经将 token uniformity 问题解决了，这个问题依然存在，所以后续又有 Bert-flow 、whitening 等改进。详细可以参考：Bert中的词向量各向异性具体什么意思啊？ - 看图学的回答 - 知乎 [https://www.zhihu.com/question/460991118/answer/2353153090](https://www.zhihu.com/question/460991118/answer/2353153090)

#### FFN 承担了记忆功能

这一节讲的两篇论文都非常有意思，建议大家看一看原始论文。

《Transformer Feed-Forward Layers Are Key-Value Memories》这篇文章做了很多实验和统计，得出了以下结论：

- FFN 是一个 Key-Value 记忆网络，第一层线性变换是 Key Memory，第二层线性变换是 Value Memory。
- FFN 学到的记忆有一定的可解释性，比如低层的 Key 记住了一些通用 pattern (比如以某某结尾)，而高层的 Key 则记住了一些语义上的 Pattern （比如句子的分类）。
- Value Memory 根据 Key Memory 记住的 Pattern，来预测输出词的分布。
- skip connection 将每层 FFN 的结果进行细化。
2015年，《End-To-End Memory Networks 》这篇论文提出了 Key-Value Memory 的结构，对于一个输入 x, 其网络结构为

\text{MemoryNet(x)} = \text{softmax}(x \cdot K^\top) V \\ 

FFN 的公式为，

\text{FFN}(x) = f(x \cdot W_1) W_2 = f(x \cdot K^\top) V \\ 

这里 f 是 ReLU 激活函数，可以看出两个结构的唯一区别就是一个是才用 softmax 进行归一化，另一个则采用 ReLU 进行筛选。本质上都差不多。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_35e697bb9fd0.jpg)

通过一些实验也确实证明了上面结论，也就是 FFN 确实将一些 pattern 或者知识记忆和存储起来了。

这就很有意思，从这个角度来说，Attention 是对短期的信息进行提取，而 FFN 则对整个训练样本进行信息提取和记忆。这也就能解释为什么一个有限的窗口甚至对语料进行了暴力截断，模型也能记住语料库中的信息。**

《Knowledge Neurons in Pretrained Transformers》这一篇就更有意思，在上一篇的基础上，**对 Transformers 进行了前额叶切除手术，擎天柱瑟瑟发抖**。

研究人员先是定位到对某些事实或者知识影响较大的神经元，然后神经元内的数值进行增强或者抑制，发现 Transformers 对这些事实或者知识的回答效果也会变好或者变差。如果将这个神经元删掉，也就是值全部置0，则 Transformers 完全忘记了这些知识，更神奇的是，对于其他的知识则影响不大。

更进一步的，研究人员还对神经元的内容进行了替换操作以达到“篡改记忆”的效果。当然作者只是在 BERT 上进行了实验，随着预料和模型的增大，像定位知识的记忆也愈发的困难，但是着给了人们一个可控文本生成的研究方向，未来可期。

#### FFN 是一种混合专家模型

MoEfication: Transformer Feed-forward Layers are Mixtures of Experts

这是刘知远团队的论文，其实一直以来，神经网络就存在稀疏激活的现象，也就是在推理的时候，其实只有极小一部分参数参与了计算。这篇论文则通过 MoE 的思想来将 FFN 层拆分成了多个专家，并且新增了一个路由模块来确定推理的时候来挂哪个专家的门诊：）

这么做完之后，在提升推理速度的同时，效果依然能保持原来的95%以上。

[编辑于 2025-07-26 16:17](//www.zhihu.com/question/622085869/answer/3518358912)・北京

​8 条评论​1325 ​17 ​分享

​​

收起​