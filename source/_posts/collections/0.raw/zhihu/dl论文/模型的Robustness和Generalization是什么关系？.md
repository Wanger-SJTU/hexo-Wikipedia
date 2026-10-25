---
title: "模型的Robustness和Generalization是什么关系？"
date: 2026-04-23
tags: [知乎]
source: https://www.zhihu.com/question/410332622/answer/1367527402
---

Aalanyj

Graph Miner/Civil Aviation

​ 关注

2020 科技数码季

最近在研究这个问题，抛砖引玉。

经验上来说，毫无疑问他们两者是存在联系的。体现的比较明显的领域在于弱监督学习（例如，半监督学习），会使用各种个样的数据增强（例如，加入噪声，反转，裁切，甚至对抗等），让模型变得对输入的细微扰动不敏感，从而减少过拟合（因为在标注数据少的情况下，过拟合是容易发生的），提升泛化性能。类似的工作比如

- Tarvainen and Valpola 2017: Mean teachers are better role models: Weight-averaged consistency targets improve semi-supervised deep learning results
- Miyato et al. 2019: Virtual Adversarial Training: A Regularization Method for Supervised and Semi-Supervised Learning但是，把鲁棒性做的极端一点，即使是大幅度的扰动，也无法改变模型的输出，那么模型就会变成过平滑/随机模型，从而降低预测性能。

理论上，我所了解到的，有如下理论的相关结果

- Robustness may be at odds with accuracy. https://arxiv.org/pdf/1805.12152.pdf，这篇文章的结果是这么说的：
首先，经验上来说，在训练数据不足的时候，加入robustness（例如，对抗样本训练）会对模型的泛化起到积极的作用。但是，当数据量变大/变得复杂，这个效果就消失了（哪怕是在稍微复杂一丢丢的数据集，例如CIFAR10，CIFAR100上，这个效果就从未体现出来）。这是好理解的，在简单/小数据上，过拟合/欠鲁棒发生了，但是程度可能非常有限。

随后作者从理论上用一个简单的仿真数据解释了这个问题，数据集构造如下：

作者在这个简单的数据集下证明了robustness和accuracy是存在矛盾的，很符合我们通过实验观测的结果。

2. Theoretical evidence for adversarial robustness through randomization. https://papers.nips.cc/paper/9356-theoretical-evidence-for-adversarial-robustness-through-randomization.pdf

本文中作者证明了，如果想通过随机化的方式增强鲁棒性，那么必然面对精确度的损失（作者用预测的期望熵来衡量）

符号很复杂，不过表达的意思就是，如果加入较大的噪声让模型变鲁棒，那么H(M(x))，即模型输出的熵一定变大。当然，本文作者只探讨了“随机化”一种方式对robustness-generalization关系的影响。

我个人的理解，鲁棒性和泛化是一个权衡的关系，权衡体现在上面说的，过鲁棒-无法泛化，欠鲁棒也无法泛化。这个权衡，我们可以分两方面看。

在现实中，一般模型是都欠鲁棒的，一个间接的证据就是很多看起来很离奇的正则化都可以让模型test accuracy变高，例如mixup(Zhang et al. 2018), StochasticDepth(Huang et al. 2016), Shake-shake (Gestaldi et al. 2017)等等，所以在实际应用中鲁棒性应该是越强越好。

在权衡的另一端，鲁棒性的一个很强的例子是对对抗样本鲁棒（adversarial robustness），是一个非常强的约束，从而会导致test accuracy大幅下降。这体现了过鲁棒-无法泛化，在刚才提到的paper里也有论证这一点。

一些粗浅的见解先写到这里，下班了，明天再写

阅读全文​
​赞同 249​​10 条评论​137 ​17 ​分享