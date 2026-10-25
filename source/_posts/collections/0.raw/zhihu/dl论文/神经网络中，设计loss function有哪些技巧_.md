---
title: 神经网络中，设计loss function有哪些技巧?
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/神经网络中,设计loss-function有哪些技巧_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/268105631/answer/333738561
---


刘诗昆

在涅贵不缁，暧暧内含光。

​ 关注

题主这个问题是 multi-task learning 里相当重要的一个核心问题。我正好在做相关的工作，很多细节将在论文投稿后再更新此答案。此外，我对 re-identfication 相关研究不熟所以无法回答第三个问题请见谅，望其他研究者补充。

理解多任务学习: Understanding Multi-task learning
Multi-task learning 核心的问题通常是可简单分为两类：

- How to share: 这里主要涉及到基于 multi-task learning 的网络设计。
- Share how much: 如何平衡多任务的相关性使得每个任务都能有比 single-task training 取得更好的结果。题主的问题主要落在第二类，尽管这两个问题通常同时出现也互相关联。对于 multi-task learning 更加粗略的介绍以及和 transfer learning 的关系请参看我之前的回答：刘诗昆：什么是迁移学习 (Transfer Learning)？这个领域历史发展前景如何？其中同样包括了 task weighting 的一些讨论，以下再做更加细节的补充。

网络设计和梯度平衡的关系: The Relationship Between Network Design and Gradient Balancing
无论是网络设计还是平衡梯度传播，我们的目标永远是让网络更好的学习到 transferable, generalisable feature representation 以此来缓解 over-fitting。为了鼓励多任务里多分享各自的 training signal 来学泛化能力更好的 feature，之前绝大部分研究工作的重点在网络设计上。直到去年才有陆续一两篇文章开始讨论 multi-task learning 里的 gradient balancing 问题。

再经过大量实验后，我得出的结论是，一个好的 gradient balancing method 可以继续有效增加网络的泛化能力，但是在网络设计本身的提高强度面前，这点增加不足一提。更加直白的表达是：

Gradient balancing method 一定需要建立在网络设计足够好的基础上，不然光凭平衡梯度并不会对网络泛化能力有着显著的改变。
梯度统治: Gradient Domination
在 multi-task learning 里又可根据 training data 的类别再次分为两类：

- one-to-many (single visual domain): 输入一个数据，输出多个标签。通常是基于 image-to-image 的 dense prediction。一个简单的例子，输入一张图片，输出 semantic segmentation + depth estimation。
- many-to-many (multi visual domain)：输入多个数据，输入各自标签。比如如何同时训练好多个图片分类任务。由于不同任务之间会有较大的差异，平衡梯度的目标是为了减缓任务本身的由于 variance, scale, complexity 不同而导致的差异。在训练 multi-task 网络时候则会因为任务复杂度的差异出现一个现象，我把他称之为: Gradient Domination, 通常发生在 many-to-many 的任务训练中。因为图片分类可以因为图片类别和本身数据数量而出现巨大差异。而基于 single visual domain 的 multi-task learning 则不容易出现这个问题因为数据集是固定的。

最极端的例子： MNIST + ImageNet 对于这种极端差异的多任务训练基本可以看成基于 MNIST initialisation 的网络对于 ImageNet 的 finetune。所以这种情况的建议就是：优先训练复杂度高的数据集，收敛之后再训练复杂度低的数据集。当然这种情况下，多任务学习也没有太大必要了。

对于一些差别比较大但是还是可接受范围的比如：SVHN + CIFAR100。这种情况的 gradient balancing 就会出现一定的效果但也取决于你输入数据的方式。输入数据的通常方法，例如在这篇文章里：Incremental Learning Through Deep Adaptation 就是通过一个 dataset switch 来决定更新哪一个数据集的参数。对于这种方法，起始 learning rate 调的低，网络本身就会有一个较好的下降速率。

动态加权梯度传播: Adaptive Weighting Scheme
即使光对优化网络调参并不能给多任务学习有着本质的改变。在考虑最 straightforward 的 loss: 

L_{total}=\sum_iw_iL_i  我们的目标是学习好一个 w_i(t) 能够根据训练效果动态变化使得平衡网络的梯度传播。

这个问题目前只有两篇文章做出了相关成果，

- Weight Uncertainty: 这个是通过 Gaussian approximation 的方式直接对修改了 loss 的方式，并同时以梯度传播的方式来更新里面的两个参数。实际实验效果也还不错，在我复现的结果来看能有显著的提升但是比较依赖并敏感于一个合适的的 learning rate 的设置。
- GradNorm : 是通过网络本身 back-propagation 的梯度大小进行 renormalisation。这篇文章写的比较草率并被最近的 ICLR 2018 拒绝收录了。个人期待他的更新作品能对方法本身有着更细节的描述。
- Dynamic Weight Average: 我对于 GradNorm 一个更加简约且有效的改进，细节将会被补充。
一些总结
平衡梯度问题最近一年才刚刚开始吸引并产出部分深入研究的工作，这个方向对于理解 multi-task learning 来说至关重要，也可以引导我们去更加高效且条理化的训练多任务网络。但在之前，更重要的事情是理解泛化能力本身，个人觉得 multi-task learning 的核心目标不在于训练多个任务并得到超越单任务学习的性能，而是通过理解 multi-task learning 学习的过程重新思考并加深理解深度学习里 generlisation 的真正意义和价值。

阅读全文​
​赞同 934​​25 条评论​1511 ​109 ​分享