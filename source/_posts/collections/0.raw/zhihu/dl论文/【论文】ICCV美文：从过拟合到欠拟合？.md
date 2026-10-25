---
title: 【论文】ICCV美文：从过拟合到欠拟合？
date: "2020-09-17 00:00:00"
updated: "2020-09-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/【论文】ICCV美文-从过拟合到欠拟合/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/242304519
---


如果大家想查阅ICCV的所有论文，可以点击下面的数据库，不仅可以查看ICCV 2021年的论文，还能看到每篇论文的视频解读、研究溯源、代码链接和自动提取的论文摘要等内容。 
[ICCV论文数据库](https://xg.zhihu.com/plugin/98a85951a63b8f2427645670f4ee67a3?BIZ=ECOMMERCE)
[O2U-Net: A Simple Noisy Label Detection Approach for Deep Neural Networks](https://link.zhihu.com/?target=https%3A//openaccess.thecvf.com/content_ICCV_2019/papers/Huang_O2U-Net_A_Simple_Noisy_Label_Detection_Approach_for_Deep_Neural_ICCV_2019_paper.pdf). (ICCV, 2019)
这篇文章深度剖析了网络学习样本的过程，并分析了简单样本、难样本、噪声样本在学习过程中分别扮演了一个怎样的角色，以及常用的指标“loss”存在的问题，最后针对这一问题给出了一个很漂亮的解决方法，是一个稍稍有些惊艳、意想不到的方法吧，文章值得一读！

直观来看
本文的方法名字叫做“overfitting to underfitting”，记作**O2U**。该方法拟解决带噪样本学习问题，其直观出发点来自一个普通神经网络的训练过程。

在一个经典的训练过程中，网络的状态往往是从欠拟合“underfitting”到过拟合的“overfitting”。具体来说，在训练阶段的早期，网络会首先去记住那些简单样本，因此在进行梯度更新时，这些简单样本在早期对梯度计算的贡献更大，导致其 losses 下降得非常快。与此相反，那些难样本往往在训练阶段后期才被学会，如果训练持续得进行，网络会通过其庞大得参数记住每一个单一的训练样本，从而导致 overfitting。在我之前的文章中有提到过，噪声样本和难样本往往是很难区分的，并且其同样是在网络训练阶段的后期才被学得，**因此标签噪声的负面影响主要是由于标签噪声的过拟合引起的。**

本文的方法
大量的文章表明，网络在噪声数据集上的训练过程中，噪声样本通常是在训练过程的后期作为“hard examples”被网络记住。在训练的早期，噪声样本的 loss 会比干净简单样本的 loss 大很多，因为干净样本能很快的被网络拟合。然而在训练的后期，loss 将很难区分干净样本和噪声样本，因为两者都被网络记住了，两者的 loss 都很小。基于此，如果我们跟踪每个样本在训练的不同阶段的损失变化，可以在一定程度上检测出有噪声标签的样本。**换句话来说，我们首先训练一个状态为overfitting 的网络，然后让它转移到 underfitting，再让它继续训练到 overfitting，我们记录样本在不同阶段转移过程中的损失变化，并根据该统计量进行样本挑选。**

![](https://pic1.zhimg.com/v2-48152791ded0261742333e96e04040b0_r.jpg)本文将上述过程定义为 **Cyclical Training。**那么，怎么让一个网络从 overfitting 到 underfitting呢？其实，也很简单，和正常的训练过程反过来即可。在正常的训练中，我们通常逐步的调小学习率从而使得网络慢慢的拟合好样本；那么反过来，O2U 的阶段为，在overfitting状态下突然设置一个很大的学习率即能跳出overfitting状态到达underfitting。该方法背后的思想是，当网络几乎收敛到一个最小值时（nearly overfitting），此时一个较大的学习率能让网络跳出该最小值点。

说了这么多，本文所提出的方法 O2U-Net 的训练也很清楚了，分为三个步骤：

- **Pre-training: **使用常规的训练方法在带噪的数据集上训练一个 overfitting 的网络。
- **Cyclical Training: **通过调整学习率使网络重复从 overfitting 到 underfitting 多次。记录每个样本在多次 cyclical training 过程中的 loss 的平均值，挑选出前 k% 个 loss 平均值小的样本作为“Clean Dataset”。
- **Training on Clean Data: **最后，我们重新初始化一个新的网络在第二步得到的“Clean Dataset”上训练。
**浅谈Loss指标**
接下来聊一聊带噪学习中最常使用到的指标之一，**loss**。大量的文章，例如 [co-teaching](https://link.zhihu.com/?target=https%3A//papers.nips.cc/paper/8072-co-teaching-robust-training-of-deep-neural-networks-with-extremely-noisy-labels.pdf)、[co-teaching+](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1901.04215.pdf)、[MentorNet](https://link.zhihu.com/?target=http%3A//proceedings.mlr.press/v80/jiang18c/jiang18c.pdf) 等，都多多少少依赖 loss 来挑选噪声样本。简单来说，就是使用当前的网络对所有样本的 loss 进行排序，然后 loss 越大的样本越有可能是噪声样本，那么我就挑选前 k% 个 loss 小的样本进行训练。但深度分析 loss 这个指标，真的是让人又爱又恨，首先贴一张依赖于loss指标的方法“co-teaching”的实验结果。

![](https://pic2.zhimg.com/v2-f7950940f4a469b2e9dfbae635403175_r.jpg)如上图所示，不同的对比方法在CIFAR100数据集上的性能表现，三列分别代表三种不同的噪声设置，第一行代表的是不同方法在干净测试集上的表现，**第二行代表训练过程中挑选的干净样本的纯度 （label precision）。**这里纯度的统计是整个过一遍数据集，真正被挑选出来喂入模型的样本的是干净样本的纯度。可以看出，无论是哪种噪声设置，以及无论是哪一类数据集，label precision 的性能表现出高度的一致，**即在训练的早期，模型能够更具自己对样本的 loss 挑选出纯度很高的干净样本，但随着训练的进行，模型开始 overfitting 噪声样本，使得再使用该指标挑样本的纯度下降，从而导致模型的预测性能下降。**

这里面其实有很多值得思考的地方：

- loss 这个指标是有效的，但不是全程有效的，是否有更好的指标来代替它或是想办法解决overfitting 这一问题，O2U 感觉就是从这一点出发的。**为啥 O2U 能避免loss在后期会挑选噪声样本的情况，因为它是使用另一个模型在 “overfitting to underfitting”整个过程中对样本平均 loss 统计量的情况来筛选样本，而其它方法是使用当前模型对样本的 loss来指导挑选干净样本又反过来学习当前模型，这两者有着本质上的不同。**
- 训练早期的模型辨别噪声样本的能力要比训练后期的模型要强？
- Early stop是有效的。我过一个实验，保持所有的随机种子不变，尝试过在 label precision 的最高点进行 early stop，即后续使用纯度最高的样本进行后续的训练，测试性能能有效提高。但是，我这是一个有点作弊的行为，就是事先知道了啥时候 label precision 会达到最高点，那么是否可以通过模型自身的一些自监督信息来告诉自己啥时候 early stop ？