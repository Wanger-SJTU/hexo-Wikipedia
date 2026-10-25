---
title: 如何理解深度学习分布式训练中的large batch size与learning rate的关系？
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/如何理解深度学习分布式训练中的large-batch-size与learning-rate的关系/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/64134994/answer/1925682805
---


Summer Clover
​
量子计算机等 4 个话题下的优秀答主

​ 关注

收录于 · Science of AI

接上一个回答，

怎么选取训练神经网络时的Batch size?1740 赞同 · 39 评论 回答
来谈谈linear scaling rule为什么成立？又为什么失效？

Large-batch training在实践上最重要的原则就是linear scaling rule——保持learning rate/batch size的比例和正常设置下一致即可。

比如把batch size增加k倍的话，那么把学习率增加到k倍。

为什么一些文章（比如高赞）会推导出一个 k\sqrt{k} 倍learning rate的原则，而实践里真正用的却是linear scaling rule？

因为前者是单纯基于随机梯度噪音的大小得到的结果，忽略了改变学习率对整个动力学演化的影响。

而后者是有动力学理论分析的支持的。

一，基于随机梯度噪音的分析。

首先，SGD可以写成：

\theta_{t} = \theta_{t-1} - \eta_{t} \frac{\partial \hat{L}(\theta_{t-1})}{\partial\theta} , 

其中 \theta 是模型参数， \eta 是学习率。而 \hat{L} 是一个minibatch的training loss，定义为该minibatch的里所有sample的loss的均值：

\hat{L}(\theta) = \frac{1}{B} \sum_{1=1}^{B} l(\theta, x_{i}). 

其中 B 是batch size。

我们把随机梯度噪音 \xi 定义为（基于一个minibatch）随机梯度和（基于整个training dataset）真实梯度的差：

\xi = \hat{L}(\theta) - L(\theta). 

由于minibatch是从训练数据集里随机取的，所以根据中心极限定理，我们有

\mathbb{E}[\xi] = 0  和 \mathbb{Covar}[\xi]=\frac{1}{B}C 。

其中 C 是batch size为1的是的梯度噪音协方差。

所以如果batch size从1增大到B的话，随机梯度噪音的幅度会缩小为原来的 \frac{1}{\sqrt{B}} 倍。

那么我们可以进一步把SGD写成

\theta_{t} = \theta_{t-1} - \eta_{t} [\frac{\partial L(\theta_{t-1})}{\partial\theta} + \sqrt{\frac{C}{B}}\zeta_{t}], 

这里我们用 \sqrt{C}\zeta_{t} 表示batch size为1时的随机梯度噪音。

所以大家也很容易看出来里，batch size大小改变的就是那个噪音项的大小: \eta \sqrt{\frac{C}{B}}\zeta 。

太大的batch size会带来过小的噪音。这会导致SGD容易找到泛化不好minima[1]，也容易卡在鞍点附近[2]。对于泛化和优化都不好。

一些文章提出的补救方法，把学习率变成原来的 \sqrt{B} 就可以保持梯度噪音大小不变了。

然而这个方法在理论和实践上都很不好。这属于只考虑了保持梯度噪音大小不变，而忽略了增加学习率带来的其他问题。比如说，很可能意味着你选择了不好的超参数搭配。改变学习率，整个学习动力学都变了。

所以我们还是需要一些理论分析才能知道，改变了batch size后，该怎么搭配其他超参数才能维持一个比较好的学习动力学。

二，基于朗之万动力学的分析，训练即退火。

我们需要的理论分析也很简单——朗之万动力学。这可能是最简单的分析linear scaling rule的方法。

我们先把SGD的连续时间近似下的动力学写出来:

d \theta = \frac{\partial L(\theta)}{\partial \theta} d t  + \sqrt{\frac{\eta C}{B} }dW_{t}， 

其中 W 是一个Weiner process。这个也是统计物理里的朗之万方程。

这个朗之万方程最开始物理学家是用来描述有势场下的布朗运动的。

梯度项在机器学习里是training loss的梯度，在物理里相当于势能产生的保守力。

噪音项在机器学习是随机梯度噪音，在物理里一般是热噪音。

在这个朗之万方程里，很容易看到是，其实是 \frac{\eta}{B} 这个比值在控制噪音项对整个动力学的影响。

如果保持 \frac{\eta}{B} 这个比值固定，那么支配large batch training和small batch training的朗之万方程就是一模一样的。

不仅如此，即使对于更大的batch size，你也只需要训练相同的epoch数（即便意味着更少的iteration）就可以得到正好相等的动力学演化时间[3]。

文献[3]从这个方程除非也证明了\frac{\eta}{B} 这个比值对于逃离sharp minima有指数级的作用。

如果你学过一些布朗运动的知识，也很容易想到\frac{\eta}{B} 其实很像物理里的温度。

这也可以解释为什么深度学习需要learning rate decay。这其实就是一个退火的过程。一个高温的动力学系统不可能落到低能量(即low training loss)的态。

同样的道理，在训练过程中，增大batch size也是退火，理所当然地也会有效的[4]。

三，linear scaling rule的极限在哪里？

在上一个回答也说了，batch size过大的时候，linear scaling rule是真不管用。

甚至有时候在很常见的数据集还有反效果，比如ResNet18+CIFAR10 with B=8192...

为什么？

你只需要看看我们的推导过程中用了哪些近似就明白了。

（1）中心极限定理成立要求batch size远小于训练数据集大小。

（2）连续时间近似成立要求学习率足够小。

另外还有一个来自于优化理论的限制，

（3）过大的学习率会带来convergence的问题。

这三点是不同场合下linear scaling rule会失效的最主要的三个原因。

最后，目前所有相关工作几乎全部忽略了weight decay的存在。

我们组有一个正在under review的工作研究了学习动力学里weight decay的影响。learning rate、batch size和weight decay这三个超参数对学习动力学的影响是耦合在一起的，而且是近似线性的耦合。可以等peer review后再介绍一下。

参考文献：

[1] Goyal, P., Dollár, P., Girshick, R., Noordhuis, P., Wesolowski, L., Kyrola, A., ...   He, K. (2017). Accurate, large minibatch sgd: Training imagenet in 1 hour.arXiv preprint arXiv:1706.02677.

[2] Jin, C., Ge, R., Netrapalli, P., Kakade, S. M.,   Jordan, M. I. (2017, July). How to escape saddle points efficiently. In International Conference on Machine Learning(pp. 1724-1732). PMLR.

[3] Xie, Z., Sato, I.,   Sugiyama, M. (2020). A diffusion theory for deep learning dynamics: Stochastic gradient descent exponentially favors flat minima. In International Conference on Representation Learning.

[4] Smith, S. L., Kindermans, P. J., Ying, C.,   Le, Q. V. (2018, February). Don't Decay the Learning Rate, Increase the Batch Size. In International Conference on Learning Representations.

阅读全文​
​赞同 399​​22 条评论​491 ​44 ​分享