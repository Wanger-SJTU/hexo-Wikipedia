---
title: "深度学习中的batch的大小对学习效果有何影响？"
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/深度学习中的batch的大小对学习效果有何影响/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/32673260/answer/675161450"
---


龙鹏-笔名言有三

​ 关注

可以参考这篇文章：

龙鹏-言有三：【AI不惑境】学习率和batchsize如何影响模型的性能？786 赞同 · 44 评论 文章
目前深度学习模型多采用批量随机梯度下降算法进行优化，随机梯度下降算法的原理如下，

n是批量大小(batchsize)，η是学习率(learning rate)。可知道除了梯度本身，这两个因子直接决定了模型的权重更新，从优化本身来看它们是影响模型性能收敛最重要的参数。

学习率直接影响模型的收敛状态，batchsize则影响模型的泛化性能，两者又是分子分母的直接关系，相互也可影响，因此这一次来详述它们对模型性能的影响。

模型性能对batchsize虽然没有学习率那么敏感，但是在进一步提升模型性能时，batchsize就会成为一个非常关键的参数。（关于学习率对模型性能的影响，可以参考上文）

1 大的batchsize减少训练时间，提高稳定性
这是肯定的，同样的epoch数目，大的batchsize需要的batch数目减少了，所以可以减少训练时间，目前已经有多篇公开论文在1小时内训练完ImageNet数据集。另一方面，大的batch size梯度的计算更加稳定，因为模型训练曲线会更加平滑。在微调的时候，大的batch size可能会取得更好的结果。

2 大的batchsize导致模型泛化能力下降
在一定范围内，增加batchsize有助于收敛的稳定性，但是随着batchsize的增加，模型的性能会下降，如下图，来自于文[5]。

这是研究者们普遍观测到的规律，虽然可以通过一些技术缓解。这个导致性能下降的batch size在上图就是8000左右。

那么这是为什么呢？

研究[6]表明大的batchsize收敛到sharp minimum，而小的batchsize收敛到flat minimum，后者具有更好的泛化能力。两者的区别就在于变化的趋势，一个快一个慢，如下图，造成这个现象的主要原因是小的batchsize带来的噪声有助于逃离sharp minimum。

Hoffer[7]等人的研究表明，大的batchsize性能下降是因为训练时间不够长，本质上并不少batchsize的问题，在同样的epochs下的参数更新变少了，因此需要更长的迭代次数。

总之batchsize在变得很大(超过一个临界点)时，会降低模型的泛化能力。在这个临界点之下，模型的性能变换随batch size通常没有学习率敏感。

3 学习率和batchsize的关系
通常当我们增加batchsize为原来的N倍时，要保证经过同样的样本后更新的权重相等，按照线性缩放规则，学习率应该增加为原来的N倍[5]。但是如果要保证权重的方差不变，则学习率应该增加为原来的sqrt(N)倍[7]，目前这两种策略都被研究过，使用前者的明显居多。

从两种常见的调整策略来看，学习率和batchsize都是同时增加的。学习率是一个非常敏感的因子，不可能太大，否则模型会不收敛。同样batchsize也会影响模型性能，那实际使用中都如何调整这两个参数呢？

研究[8]表明，衰减学习率可以通过增加batchsize来实现类似的效果，这实际上从SGD的权重更新式子就可以看出来两者确实是等价的，文中通过充分的实验验证了这一点。

研究[9]表明，对于一个固定的学习率，存在一个最优的batchsize能够最大化测试精度，这个batchsize和学习率以及训练集的大小正相关。

对此实际上是有两个建议：

- 如果增加了学习率，那么batch size最好也跟着增加，这样收敛更稳定。
- 尽量使用大的学习率，因为很多研究都表明更大的学习率有利于提高泛化能力。如果真的要衰减，可以尝试其他办法，比如增加batch size，学习率对模型的收敛影响真的很大，慎重调整。参考文献

[1] Smith L N. Cyclical learning rates for training neural networks[C]//2017 IEEE Winter Conference on Applications of Computer Vision (WACV). IEEE, 2017: 464-472.

[2] Loshchilov I, Hutter F. Sgdr: Stochastic gradient descent with warm restarts[J]. arXiv preprint arXiv:1608.03983, 2016.

[3] Reddi S J, Kale S, Kumar S. On the convergence of adam and beyond[J]. 2018.

[4] Keskar N S, Socher R. Improving generalization performance by switching from adam to sgd[J]. arXiv preprint arXiv:1712.07628, 2017.

[5] Goyal P, Dollar P, Girshick R B, et al. Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour.[J]. arXiv: Computer Vision and Pattern Recognition, 2017.

[6] Keskar N S, Mudigere D, Nocedal J, et al. On large-batch training for deep learning: Generalization gap and sharp minima[J]. arXiv preprint arXiv:1609.04836, 2016.

[7] Hoffer E, Hubara I, Soudry D. Train longer, generalize better: closing the generalization gap in large batch training of neural networks[C]//Advances in Neural Information Processing Systems. 2017: 1731-1741.

[8] Smith S L, Kindermans P J, Ying C, et al. Don't decay the learning rate, increase the batch size[J]. arXiv preprint arXiv:1711.00489, 2017.

[9] Smith S L, Le Q V. A bayesian perspective on generalization and stochastic gradient descent[J]. arXiv preprint arXiv:1710.06451, 2017.

阅读全文​
​赞同 686​​21 条评论​834 ​69 ​分享