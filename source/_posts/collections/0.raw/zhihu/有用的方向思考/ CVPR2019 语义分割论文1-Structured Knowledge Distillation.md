---
title: (1 封私信) CVPR2019 语义分割论文1-Structured Knowledge Distillation
date: "2019-07-22 00:00:00"
updated: "2019-07-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/有用的方向思考/CVPR2019-语义分割论文1-Structured-Knowledge-Distillation/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/73468830
---


### ***Structured Knowledge Distillation for Semantic Segmentation***

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1903.04197)

本文通过知识蒸馏的思想利用复杂网络（Teacher）来训练简单网络（Student），目的是为了让简单的网络能够达到和复杂网络相同的分割结果。为了得到两个网络相同的结果就要保证两个网络在训练过程中的一致性。因此通过设计训练过程中的损失函数来是两者达到一致效果。

由于整个模型的过程是希望简单网络（Student）能够将复杂网络（Teacher）中的只是学习过来，因此Teacher网络是已经训练好的复杂网络，能够直接使用的网络，并不进行优化。

本文的主要蒸馏框架如下所示：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_026dc3ebf10d.jpg)

整个蒸馏过程分为了三个过程其按照顺序分别是：1) Pair-wise distillation 2)Pixel-wise distillation 3)Holistic distillation。

下面按照顺序讲解整个框架的过程：

--1)Pair-wise distillation

	首先当输入的图像分别经过两个网络之后会生成两个维度相同的特征表示。作者根据pair-wise Markov random field framework的启发，通过两个像素之间的相似性关系来提升网络的效果。也可以认为是将Teacher生成的特征映射中像素相似性关系蒸馏到Student网络中。其成对蒸馏损失函数如下：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_1f98da9bd4e2.jpg)

其中的与表示的是两个网络生成的特征表示的长宽， 表示Student 网络中像素i与像素j的相似性，表示的Teacher网络中的相似性关系，而像素之间的相似性关系通过下面的公式来计算：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_735244baf5ca.jpg)

--2)Pixel-wise distillation

对两个网络最后输出得到的特征表示做Pixel Labeling操作，得到了一个Score Map，这个可以看作是最终得到的分割结果（）因此作者希望Student网络得到的Score Map表示能够与Teacher网络保持一致，也就是使得每个像素下的表示是相同的。所以得到了像素蒸馏的损失函数如下:

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_b7fe8ff431d8.jpg)

其中的KL(*)表示的两者之间的KL散度。

--3)Holistic distillation

文中指出为了匹配Teacher 网络与Student网络产生的分割图的高阶关系，引入了条件生成对抗学习的思想。文中提到之前也有人用GAN来做语义分割，目标也是生成器的结果和ground truth没法被判别器区分出来。不过存在一个问题：生成器的输出是连续的（如0-1之间的某个值），而ground truth中的值是独立的（如0或1），因此判别器性能受限。而本文中的方法却没有这个问题，因为ground truth采用的是复杂网络的logits，也是连续的，和生成器的输出可以平等地比较，这是本文一个比较巧妙的点。论文使用对抗学习方法来尽量消除Teacher网络和Student网络的差异。

将Student网络作为生成器，将其产生的Segmentation Map与条件I（原始的RGB图像）输入到判别器D中，最后得到一个Fake embedding 被视为是假样本分布，而Teacher网络与条件I输入得到的Real embedding 视为真样本分布，真假样本分布之间通过推土机距离来进行衡量，公式如下：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_6b9e56142a58.jpg)

其中的E(*)表示期望运算，D（*）表示的是一个嵌入网络，它是由5个全卷积网络组成，并为了捕捉结构信息，在最后三层之间加入了两层自注意力网络。这样的判别器能够产生一个描述真实图像与segmentation Map至今匹配程度的表征。

***Optimization***

由于最终要得到的是Student网络输出的图像，所以损失函数还是有传统的多类交叉熵损失,不同之处就是引入了三个新的损失函数组成了最终的损失函数，公式如下图所示：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_e7240d77b67f.jpg)

其中与分别设置为10和0.1，至于为什么这样设置，我觉得可能是通过实验选取出最好的权重吧！要平衡着三类对最终结果的影响程度，最终要使得Student 网络学习过程中最小化这个目标函数的同时最大化判别器的出错概率，这也就是为什么要减去整体损失的原因。

整个框架的学习过程就是1、训练判别器2、训练Student 网络。

Experiments

数据集使用了三个分别是Cityscapes, Cam Vid, ADE20K。

评价标准为 IoU、mIoU、FLOPs

首先进行了消融实验，实验在ResNet18上进行，其变体ResNet18（0.5）代表Cityscapes数据集上ResNet18的宽度减半版本。

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_19195ce49005.jpg)

此外为了说明GAN能够提炼整体的知识，对每个图像，提供三个分割图，由Teacher网输出，Student网没有整体蒸馏，Student网有整体蒸馏，进入鉴别器D，并比较Student网的嵌入分数。

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_2a8dc2ed7442.jpg)

下面是为了说明成对蒸馏的作用进行的实验。

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_ef5e797e39fd.jpg)

对比实验中分别在三个数据集上进行了对比试验，并在Cityscapes和Cam Vid上进行了单一图像的展示来验证该蒸馏方法的有效性。实验结果如下：

![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_163ad592df08.jpg)

Cityscapes 数据集下实验结果![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_c06c4c217e63.jpg)

 Cam Vid 数据集下实验结果![](/images/collections/0.raw/zhihu/%25E6%259C%2589%25E7%2594%25A8%25E7%259A%2584%25E6%2596%25B9%25E5%2590%2591%25E6%2580%259D%25E8%2580%2583/asset/img_73ecbf8c2283.jpg)

ADE20K 数据集下实验结果
