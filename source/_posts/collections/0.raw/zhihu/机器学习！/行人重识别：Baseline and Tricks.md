---
title: "行人重识别：Baseline and Tricks"
date: "2019-03-27 00:00:00"
updated: "2019-03-27 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/机器学习/行人重识别-Baseline-and-Tricks/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/60546887"
---


### 声明：本篇文章首发于微信公众号：极市平台（微信号：extrememart）

<strong>原文链接：</strong>

[![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9e0ec3403e6d.jpg)行人重识别算法优化技巧：Bags of Tricks and A Strong Baselinemp.weixin.qq.com/s/BDgIf6foDGtCNc48JPqrcg](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/BDgIf6foDGtCNc48JPqrcg)

本文主要收集并介绍行人重识别（Person ReID）算法中的一些训练技巧，随着深度卷积神经网络的不断改进，行人重识别领域也有了很大的进步，但大多数的SOTA的算法都是设计了很复杂的网络结构和融合了多支路的特征。作者首先设计了一个强力的baseline, 然后尝试使用一个简单的全局特征，并融合了很多有效的训练技巧，使得模型在Market1501数据集上达到了94.5% rank-1以及85.9% mAP。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_8d634b08cefb.jpg)

<strong>论文链接：</strong>

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1903.07071)

<strong>开源代码：</strong>

[](https://link.zhihu.com/?target=https%3A//github.com/michuanhaohao/reid-strong-baseline)

首先作者在Maket1501数据集上对比了ECCV2018和CVPR2018的一些baseline的性能，并与自己提出的baseline作对比，这些baseline大部分都是通过一些训练技巧来提升的，由于在论文中轻描淡写易被忽视，因此作者也建议评价一篇学术论文一定要把训练技巧考虑在内，这样才会更加客观。


### Standard Baseline

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_1c18bb0f06f6.jpg)

上图为作者所提出的Standard Baseline，其大致流程如下：

- 使用一个带有ImageNet预训练参数的ResNet50，并改变FC的输出为N，也就是训练集中行人的ID。
- 随机采样P个身份以及每个人的K幅图片，构成一个batch，并设置P=16, K=4，接着将其resize到256x128，并进行10个像素的zero-padding，接着进行random      crop（数据增强）
- 进行概率0.5的随机翻转，并进行归一化处理（Normalize）
- 模型输出ReID特征 f 用于计算triplet      loss， 预测的ID分类p用于计算交叉熵损失，其中triplet      loss的margin设置为0.3
- 使用Adam方法进行优化，一开始学习率为3.5e-4，在40和70个epoch分别降低为原来的10%，共训练120个epoch
<strong>Training Tricks</strong>

接下来我们要介绍一些在ReID中十分有效的训练策略，用于提升我们的baseline的精度，让我们一起来看看作者都使用了那些Trick。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_fef7047da953.jpg)

### 学习率变化策略（Warm up）

<strong>参考论文：[https://arxiv.org/abs/1608.03983](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1608.03983)</strong>

学习率对ReID的模型有非常大得影响，对于baseline的学习率一开始是一个很大的常量，而经过其他论文提出，Warm up的策略对于行人重识别的模型更加有效，具体是一开始从一个小的学习率经过几个epoch后慢慢上升，如下图红色曲线部分：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_373cb201cea8.jpg)

具体公式为：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0165f3a5dc04.jpg)

#### 数据增强 Random Erasing

<strong>参考论文：[https://arxiv.org/abs/1708.04896](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1708.04896)</strong>

这是进行分类问题常见的数据增强方式，对行人检测十分有效！在行人重识别中特别是现实生活中，大部分人体会存在遮挡的情况，为了使模型更具有鲁棒性，我们对每个mini-batch使用REA(Random Erasing Augmentation)，REA随机选择一个大小为 (w_e, H_e) 的正方形区域 I_e ，然后对这个区域的像素用一些随机值代替。其中擦除区域面积占比0.02S_e r_l=0.3,r_h=3.33 ,随机概率为0.5，具体算法如下：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_98f710c7aeb8.jpg)

### 效果图：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_2068f4e04156.jpg)

#### Label Smoothing

这也是从分类问题借鉴的一种trick，假设我们网络最后的分类为N，也就是ID的数量。且y为真实的ID标签，而pi为预测的ID分类。则其交叉熵损失为：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_8d736afcb91f.jpg)

我们在这篇文章中把最后的分类loss叫做ID loss，上面为最常用的Softmax loss，但是由于标签的形式为One-hot编码的形式，也就是qi只有0和1两个取值，当我们使用Softmax loss进行优化时，模型会不断的优化使得pi为1，但却非常容易造成过拟合。因此label smoothing的思想是对真实标签进行改造，使其不再是One-hot编码。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_dccd5fdb8c8d.jpg)

假设N=5， \varepsilon =0.1，假设原来的label为[1, 0, 0, 0, 0]，经过平滑后变成了[0.92, 0.02, 0.02, 0.02, 0.02]，这样进行优化时始终与真实标签存在损失，不会使得pi非常接近1，从而降低了过拟合的风险。这么做的原因主要是ReID的测试集的ID并没有在训练集中出现，因此我们需要提高模型的泛化性能，而Label Smoothing就是一个十分有效的手段。

#### Last Stride

相关的论文发现在backbone中移除最后一个将采样的操作可以丰富特征的细粒度，作者为了简单方便，直接把ResNet-50的最后一个卷积层的Stride由2变成了1，当输入图片为256x128时，最后一层输出的feature map的尺寸为16x8，而不是原来的8x4。

#### BNNeck

在行人重识别模型中，有很多工作都是融合了ID loss和Triplet loss来进行训练的，但是这种loss函数的目标并不协调，对于ID loss，特别在行人重检测，consine距离比欧氏距离更加适合作为优化标准，而Triplet loss更加注重在欧式空间提高类内紧凑性和类间可分性。因此两者关注的度量空间不一致，这就会导致一个可能现象就是当一个loss减小时另外一个在震荡或增大。因此作者设计了BNNeck用于解决这个问题，如下图：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9e4b9b0ea40f.jpg)

通过神经网络提取特征ft用于Triplet loss，然后通过一个BN层变成了fi，在训练时，分别使用ft和fi来优化这个网络，由于BN层的加入，ID loss就更容易收敛，另外，BNNeck也减少了ID loss对于ft优化的限制，从而使得Triplet loss也变得容易收敛了。因为超球体几乎是对称的坐标轴的原点，BNNECK的另一个技巧是去除分类器fc层的偏差，这个偏差会限制分类的超球面。在测试时，使用fi作为ReID的特征提取结果，这是由于Cosine距离相比欧氏距离更加有效的原因。

#### Center loss

为了使类内更加的紧凑，作者又加入了人脸识别中提出的Center Loss, 它在学习到一个类中心的同时会惩罚深度特征和其类中心的距离，这样就弥补了Triplet Loss的缺点，我们可以从下图看出，其类间更加紧凑了！

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_5eb129389cfe.jpg)

其公式为：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_a3a109f93dc3.jpg)

然后我们把三种loss函数进行相加，一起去优化整个网络！

### 对比试验

作者首先在同一个数据域下进行试验，分别在Markert1501和DukeMTMC这两个数据集进行训练与测试，结果为

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_6c5973e6c85e.jpg)

为了展示其鲁棒性，作者又在不同的数据域上进行测试，即使用Market1501训练好的模型在DukeMTMC数据集上验证，得到了如下结果：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_97d6a936b85c.jpg)

最后与其他模型进行对比：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_1492fd729ade.jpg)

### 算法总结

本篇论文提出了一个很强的Baseline，并呼吁大家加强对训练Trick的重视性，接着主要是介绍了几种适用于ReID算法的训练策略，比如random erasing以及warm up和防止过拟合的label smoothing。这些策略其实主要来源于图像分类算法，但对于一个具体的领域，这些Trick就不一定都适用了，所以，这篇文章对于ReID的研究者还是有很大的帮助的，与此同时，作者也参考了人脸识别的一些损失函数，并把这些应用到ReID算法中，也向我们说明了softmax所对应的cosin空间和center loss所对应的欧式空间，以及如何将这两个空间相连接从而便于loss函数的优化。

总之，在前人的基础之上，总结了一些适合ReID算法的Tricks，也提出了自己的设计思路，供大家借鉴，总之，中规中矩，不错的综述性文章，创新点并不是太鲜明！
