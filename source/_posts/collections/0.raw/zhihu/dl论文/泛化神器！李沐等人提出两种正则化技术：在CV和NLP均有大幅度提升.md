---
title: 泛化神器！李沐等人提出两种正则化技术：在CV和NLP均有大幅度提升
date: "2021-02-08 00:00:00"
updated: "2021-02-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/泛化神器-李沐等人提出两种正则化技术-在CV和NLP均有大幅度提升/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/350067666
---


本文提出两种解决out-of-distribution(OOD)问题的正则化技术：<strong>SelfNorm</strong>和<strong>CrossNorm</strong>，两者还可以相互补充，实验证明该方法在CV/NLP、分类/分割、监督/半监督上效果显著！

<strong>注1：文末附【计算机视觉细分垂直方向】交流群（含检测、分割、跟踪、医疗、GAN、Transformer等）</strong>

<strong>注2：整理不易，欢迎点赞，支持分享！</strong>

作者：ChaucerG
原出处：AI人工智能初学者
原文链接：[泛化神器 | 李沐老师新作进一步提升模型在多域多的泛化性，CV和NLP均有大幅度提升(文末获取论文)](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/LpoUzRXVSnsIDuuYyMZcmA)![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_91c4aeccd978.jpg)

SelfNorm and CrossNorm for Out-of-Distribution Robustness

> 论文：[https://arxiv.org/abs/2102.02811](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2102.02811)
作者单位**：罗格斯大学, 亚马逊AWS(李沐等人)

### 1 简介

正则化技术对于稳定和加速深度神经网络的训练至关重要。但是，目前的正则化方法主要是针对独立且均匀分布（IID）的数据而设计的，不能满足许多实际的out-of-distribution(OOD)情况。

与大多数以前的工作不同，本文提出了2种归一化方法，SelfNorm和CrossNorm，以促进OOD泛化。SelfNorm会注意重新校准统计信息（按通道均值和方差），而CrossNorm在特征图之间交换统计信息。尽管在统计使用方面探索了不同的方向，但SelfNorm和CrossNorm在OOD泛化中可以相互补充。在不同领域（CV和NLP），任务（分类和分割）和设置（监督和半监督）的广泛实验表明了该方法的有效性。

<strong>本文主要贡献</strong>：**

- 1、提出了SelfNorm<strong>和</strong>CrossNorm**这2种标准化技术来增强out-of-distribution(OOD)泛化；
- 2、<strong>SelfNorm</strong>和<strong>CrossNorm</strong>在利用特征均值和方差提高模型鲁棒性方面形成了对立统一；
- 3、<strong>SelfNorm</strong>和<strong>CrossNorm</strong>与领域无关，可以提高不同领域(CV或NLP)、设置(监督和半监督)和任务(分类和分割)的性能。

### 2 相关概念阐述

### 2.1 Out-of-distribution generalization

尽管目前的深度模型继续在benchmark IID数据集上打破记录，但它们仍然难以推广到由常见的损坏和数据集差距造成的OOD数据。

为了提高鲁棒性，StylizedImageNet进行了风格增强，以减少cnn的纹理偏向。最近，AugMix通过混合基于随机图像语义或图像到图像网络的多个增强图像来训练具备鲁棒性的模型；对抗噪声训练(ANT)和无监督域自适应也可以提高抗腐蚀的鲁棒性。

CrossNorm与AugMix和ANT正交，使它们的联合应用成为可能。与程式化的imagenet相比，CrossNorm有2个主要优点：

- 1、<strong>CrossNorm是有效的，因为它直接在目标CNN的特征空间中迁移Styles</strong>。然而，Stylized-ImageNet依赖于external style datasets和预训练style transfer模型；
- 2、<strong>CrossNorm可以提高干净数据和损坏数据的性能</strong>，而Stylized-ImageNet会损害clean generalization，因为external styles会导致分布迁移。
除了常见的损害之外，在不同数据集之间存在分布差异的泛化也仍然具有挑战性。IBN混合了IN和BN来缩小域距离。Domain Randomization在分割数据集上使用style augmentation来进行Domain泛化。它遇到了与Stylized-ImageNet相同的问题，因为它还使用了预先训练的Styles传输模型和附加的Styles数据集。与IBN和Domain Randomization方法相比，<strong>SelfNorm可以通过style recalibration来弥补不同Domain之间的差异</strong>，<strong>CrossNorm可以更有效地平衡源域和目标域的性能</strong>。

除CV领域之外，许多自然语言处理(NLP)也面临着分布泛化的挑战。<strong>SelfNorm</strong>和<strong>CrossNorm</strong>也可以提高模型在自然语言处理领域的鲁棒性。

### 2.2 Normalization and attention

BN是一项具有里程碑意义的技术，它激发了以下许多规范化方法，如IN、LN和GN。最近，一些工作将attention整合到特征规范化中。模式归一化和注意归一化使用attention来衡量BN的混合。

Mode Normalization和Attention Normalization通过attention学习多种类型的归一化。相比之下，SelfNorm只使用了带注意力的IN。更重要的是，不像以前的标准化方法，SelfNorm和CrossNorm的目标是改进外分布泛化。

此外，SelfNorm和CrossNorm虽然使用了相似的attention，但也有所不同。首先，SelfNorm学习重新校准Channel的均值和方差，而不是在SE中的Channel特征。其次，SE是对Channel之间的相互依赖性进行建模，而SelfNorm则对每个Channel进行独立处理。同样，O(n)的SelfNorm unit比的O(n^2)SE unit更简单，其中n表示Channel数。

### 2.3 Data augmentation

Data augmentation是训练深度模型的重要工具。目前流行的Data augmentation技术要么是label-preserving，要么是label-perturbing。label-preserving方法通常依赖于特定领域的图像语义，例如旋转和颜色，这使得它们不适合视觉领域以外的任务。label-perturbing技术主要用于分类，在更广泛的领域可能会有问题。CrossNorm作为一种Data augmentation方法，很容易应用于不同的领域(CV和NLP)和任务(分类和分割)。CrossNorm的目的不同于以往的许多Data augmentation方法，CrossNorm的目的是促进外分布泛化。

### 3 SelfNorm and CrossNorm

### 3.1 背景

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_5baadc00510c.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_b962c01f1bdb.jpg)

如图所示，style transfer实验证实了和可以编码一些style信息。

### 3.2 SelfNorm

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_b3e025fb6beb.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_542c9c7b268f.jpg)

### 3.3 CrossNorm

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_492e4f92de04.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_8c6d26b02f10.png)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_619057457fb2.jpg)

A和B相互标准化，因此称为<strong>CrossNorm</strong>。CrossNorm的动机是基于一个关键的观察，即一个目标数据集，例如一个分类数据集，具有丰富的Styles。具体来说，每个实例，甚至每个通道，都有其独特的风格。交换统计信息可以有效地进行Style扩展，减少决策时的Style偏差。在小批量训练中，一般以一定的概率使用CrossNorm。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_28f9550bd610.jpg)

### 3.4 对立统一

SelfNorm和CrossNorm都是从IN开始的，但方向相反。SelfNorm重新校准统计数据，只关注必要的Style，减少标准化特征(零均值和单位方差)和统计混合多样性。而CrossNorm在Channel间传递统计信息，丰富了标准化特征与统计信息的结合。它们执行相反的操作主要是因为它们针对的是不同的阶段。SelfNorm致力于在测试中进行Style的重新校准，而CrossNorm只在训练中起作用。请注意，SelfNorm是一个可学习的模块，需要训练才能发挥作用。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_28f9550bd610.jpg)

上图显示了SelfNorm和CrossNorm的流程图。此外，SelfNorm有助于降低模型对外观变化的敏感性，而CrossNorm旨在减少模型的Style偏差。尽管有这些差异，它们都可以促进分布外推广。此外，CrossNorm可以提高SelfNorm的表现，因为它的Style增强可以防止SelfNorm过拟合特定的Style。总的来说，这两种看似对立的方法形成了一个统一，即使用标准化统计来提高分布外的鲁棒性。

### 3.5 CrossNorm变体

CrossNorm的核心思想是在特征映射之间交换均值和方差。不同的特征映射选择会导致不同的CrossNorm变体。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_e18904c052e8.jpg)

#### Crop

此外，不同的空间区域可能有不同的均值和方差统计量。为了促进风格的多样性，建议对Crop区域进行CrossNorm:

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_2bcafeb6a7a0.png)

其中，crop函数返回一个面积比为不小于阈值t(0![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_77b322b5249c.jpg)

例如，在ResNet中，把它们放到一个residual模块中。对于residual模块中有限的位置，搜索空间显著缩小。模块化设计允许在一个网络中使用多个SelfNorm和CrossNorm。作者在消融研究中表明，累积style重新校准有助于模型的鲁棒性。由于过度的style扩展是有害的，因此作者在前向推理的过程中只是随机地启用一些CrossNorm。

### 4 实验结果

#### mCE on CIFAR-10-C and CIFAR-100-C

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_fea1b7f695e6.jpg)

从表1可以看出，单独的SN和CN对看不见的腐蚀的鲁棒性优于大多数以前的方法，将它们组合在一起CIFAR-10-C和CIFAR-100-c上的平均误差都降低了12%。一个可能的解释是腐蚀主要改变了图像纹理。

通过Style的重新校准和增强，SN和CN可能有助于降低纹理的敏感性和偏差，使分类器对看不见的腐蚀更加健壮。此外，与领域无关的SN和CN与AugMix正交，而AugMix依赖于特定于领域的操作。联合使用可以在AugMix的基础上继续将mCEs降低2.2%和3.6%

#### Ablation study of IBN,SN,CN

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_6737f18c18ef.jpg)

从表1可以看出，在ResNet50+IBN-a的基础上将CN+AM组合在一起使用mCE在原有IBN-a的基础上降低了8.7%；在ResNet50+IBN-b的基础上将SNCN+AM组合在一起使用mCE在原有IBN-b的基础上降低了11.3%；可以看出都是比较大的提升。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_c24d4f70350c.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_7c951cba39a9.jpg)

CN可视化在头部(左)，尾部(中)2块和开始3块(右)在一个WideResNet-40-2。内容(行)和样式(列)图像都来自CIFAR-10。与第1块CNs相比(如图5所示)，第2块CNs和第3块CNs的风格传递效果较弱，因为High-Level Features Map的统计信息可能包含较少的Low Level视觉信息。

### 5 参考

[1].SelfNorm and CrossNorm for Out-of-Distribution Robustness

### CVer-细分垂直交流群成立

扫码添加CVer助手微信，<strong>可申请加入CVer-细分垂直方向 微信交流群，也可申请加入CVer大群，细分方向已涵盖：目标检测、图像分割、目标跟踪、人脸检测&识别、OCR、姿态估计、超分辨率、SLAM、医疗影像、Re-ID、GAN、NAS、深度估计、自动驾驶、强化学习、车道线检测、模型剪枝&压缩、去噪、去雾、去雨、风格迁移、遥感图像、行为识别、视频理解、图像融合、图像检索、论文投稿&交流、Transformer、PyTorch和TensorFlow等群。</strong>

CVer小助手微信号：<strong>CVer9999。一定要备注：研究方向+地点+学校/公司+昵称（如目标检测+上海+上交+卡卡）</strong>，根据格式备注，才能通过且邀请进群

<strong>强烈推荐大家关注</strong>CVer知乎<strong>账号和</strong>[CVer](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/moRNkCaBDtYZgXwaZDXBwA)<strong>微信公众号，可以快速了解到最新优质的CV论文。</strong>

### 推荐阅读

[沈春华团队提出：使用条件卷积的实例和全景分割](https://zhuanlan.zhihu.com/p/349995990)

[中国成都举办！ACM MM 2021 Call for Papers](https://zhuanlan.zhihu.com/p/349901149)

[效果远超Transformer！AAAI 2021最佳论文Informer：最强最快的序列预测神器](https://zhuanlan.zhihu.com/p/349800169)

[深度学习理论的最新进展](https://zhuanlan.zhihu.com/p/349733790)

[DeepMind重新设计高性能ResNet！无需激活归一化层](https://zhuanlan.zhihu.com/p/349575099)

[VisualSparta：首个基于Transformer的大规模文本到图像检索](https://zhuanlan.zhihu.com/p/349369775)

[南京大学提出SA-Net：深度卷积神经网络的Shuffle注意力](https://zhuanlan.zhihu.com/p/349122099)

[CV待解决问题！华中科大提出OVIS：遮挡视频实例分割（数据集+代码）](https://zhuanlan.zhihu.com/p/349018018)

[VTN：视频Transformer网络](https://zhuanlan.zhihu.com/p/348849616)

[基于深度学习的图像检索最新综述：全面调研](https://zhuanlan.zhihu.com/p/348222902)

[T2T-ViT：在ImageNet上从头训练视觉Transformer](https://zhuanlan.zhihu.com/p/348055832)

[深度学习中的3个秘密：集成，知识蒸馏和蒸馏](https://zhuanlan.zhihu.com/p/348006186)

[国防科大提出CHPDet：任意方向的船舶检测](https://zhuanlan.zhihu.com/p/347858976)

[84.7％！BoTNet：视觉识别的Bottleneck Transformers](https://zhuanlan.zhihu.com/p/347602463)

[港中文提出ResLT：用于长尾识别的残差学习](https://zhuanlan.zhihu.com/p/347545960)

[没有卷积！CPTR：用于图像描述的全Transformer网络](https://zhuanlan.zhihu.com/p/347510279)

[华为诺亚提出：AdderNet及其极简硬件设计](https://zhuanlan.zhihu.com/p/347270442)

[龙泉寺贤超法师：用AI为古籍经书识别、断句、翻译](https://zhuanlan.zhihu.com/p/347237973)

[北邮提出PCA-Net：用于细粒度视觉分类的渐进式协同注意力网络](https://zhuanlan.zhihu.com/p/347001395)

[SSTVOS：基于稀疏时空Transformers的视频目标分割网络](https://zhuanlan.zhihu.com/p/346827146)

[南加大和Intel提出：基于注意力的图像上采样](https://zhuanlan.zhihu.com/p/346708849)

[攻下SLAM！用于无监督视觉里程表的Transformer引导几何模型](https://zhuanlan.zhihu.com/p/346545778)

[没有自然图像的预训练 | ACCV 2020 最佳论文提名奖](https://zhuanlan.zhihu.com/p/346488531)

[基于深度学习的行人重识别(Re-ID)综述：全面调研（2015-2020）](https://zhuanlan.zhihu.com/p/346361954)

[2020年最先进的3D医学图像分割方法](https://zhuanlan.zhihu.com/p/346246175)

[Focal-EIOU Loss：用于精确边界框回归的高效IOU损失](https://zhuanlan.zhihu.com/p/346006319)

[旷视提出Momentum^2 Teacher：用于自监督学习的具有动量统计的动量老师](https://zhuanlan.zhihu.com/p/345762425)

[计算机视觉中的Transformer](https://zhuanlan.zhihu.com/p/345557138)

[医学图像语义分割最佳方法的全面比较：U-Net和U-Net++](https://zhuanlan.zhihu.com/p/344658591)

[生成对抗U-Net：实现Domain-free医学图像增广](https://zhuanlan.zhihu.com/p/344479363)

[80GB 医学影像数据集发布！OCTA-500公开下载](https://zhuanlan.zhihu.com/p/344381755)

[RepVGG：使VGG样式的ConvNets再次出色](https://zhuanlan.zhihu.com/p/343660471)

[涨点神器！SoftPool：一种新的池化方法，带你起飞，代码已开源！](https://zhuanlan.zhihu.com/p/343481363)

[又一篇视觉Transformer综述来了！](https://zhuanlan.zhihu.com/p/341995737)

[深度神经网络中的池化方法：全面调研（1989-2020）](https://zhuanlan.zhihu.com/p/341820742)

[涨点神器！IC-Conv：具有高效空洞搜索的Inception卷积](https://zhuanlan.zhihu.com/p/340482046)

[一文快速回顾U-Net Family](https://zhuanlan.zhihu.com/p/339934172)

[冠军解决方案！用于脑肿瘤分割的nnU-Net改进](https://zhuanlan.zhihu.com/p/325932805)
