---
title: "DECO：卷积结构的反击，纯卷积Query-Based检测器超越DETR"
date: "2024-03-08 00:00:00"
updated: "2024-03-08 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/DECO-卷积结构的反击,纯卷积Query-Based检测器超越DETR/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/686011746"
---


- 论文地址：
[![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_cbfe7191992e.jpg)DECO: Query-Based End-to-End Object Detection with ConvNetsarxiv.org/abs/2312.13735](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.13735)

- Pytorch代码：
[![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_0131380718cc.jpg)GitHub - xinghaochen/DECO: Official PyTorch implementation of "DECO: Query-Based End-to-End Object Detection with ConvNets"github.com/xinghaochen/DECO](https://link.zhihu.com/?target=https%3A//github.com/xinghaochen/DECO)

- Mindspore代码：
[https://github.com/mindspore-lab/models/tree/master/research/huawei-noah/DECOgithub.com/mindspore-lab/models/tree/master/research/huawei-noah/DECO](https://link.zhihu.com/?target=https%3A//github.com/mindspore-lab/models/tree/master/research/huawei-noah/DECO)

<strong>引言</strong>

Detection Transformer（DETR）推出之后，迅速引发了目标检测领域的一股热潮，很多的后续工作也从精度和速度方面对原始的DETR进行了改进。然而，Transformer是否真的大一统视觉领域呢，至少从ConvNeXt和RepLKNet等工作表明，CNN结构在视觉领域还是有很大的潜力的。我们这个工作探究的就是如何利用纯卷积的架构，来得到一个性能能打的类DETR框架的检测器。致敬DETR，我们称我们的方法为DECO (Detection ConvNets)。采用DETR类似的结构设定，搭配不同的Backbone，DECO在COCO上取得了38.6%和40.8%的AP，在V100上取得了35 FPS和28 FPS的速度，取得比DETR更好的性能。搭配类似RT-DETR的多尺度特征等模块，DECO取得了47.8% AP和34 FPS的速度，总体性能跟很多DETR改进方法比都有不错的优势。

<strong>DECO整体框架</strong>

DETR的主要特点是利用Transformer Encoder-Decoder的结构，对一张输入图像，利用一组Query跟图像特征进行交互，可以直接输出指定数量的检测框，从而可以摆脱对NMS等后处理操作的依赖。我们提出的DECO总体架构上跟DETR类似，也包括了Backbone来进行图像特征提取，一个Encoder-Decoder的结构跟Query进行交互，最后输出特定数量的检测结果。唯一的不同在于，DECO的Encoder和Decoder是纯卷积的结构，因此DECO是一个由纯卷积构成的Query-Based端对端检测器。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_bcb1efe3f8e6.jpg)

DECO和DETR框架的对比<strong>DECO Encoder结构</strong>

Encoder的结构替换相对比较直接，我们选择使用4个ConvNeXt Block来构成Encoder结构。具体来说，Encoder的每一层都是通过叠加一个7x7的深度卷积、一个LayerNorm层、一个1x1的卷积、一个GELU激活函数以及另一个1x1卷积来实现的。此外，在DETR中，因为Transformer架构对输入具有排列不变性，所以每层编码器的输入都需要添加位置编码，但是对于卷积组成的Encoder来说，则无需添加任何位置编码

<strong>DECO Decoder结构</strong>

相比而言，Decoder的替换则复杂得多。Decoder的主要作用为对图像特征和Query进行充分的交互，使得Query可以充分感知到图像特征信息，从而对图像中的目标进行坐标和类别的预测。Decoder主要包括两个输入：Encoder的特征输出和一组可学的查询向量（Query）。我们把Decoder的主要结构分为两个模块：自交互模块（Self-Interaction Module, SIM）和交叉交互模块（Cross-Interaction Module, CIM）。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_730c3eac7342.jpg)

DECO的Decoder结构SIM模块主要融合Query和上层Decoder层的输出，这部分的结构，可以利用若干个卷积层来组成，使用9x9 depthwise卷积和1x1卷积分别在空间维度和通道维度进行信息交互，充分获取所需的目标信息以送到后面的CIM模块进行进一步的目标检测特征提取。Query为一组随机初始化的向量，该数量决定了检测器最终输出的检测框数量，其具体的值可以随实际需要进行调节。对DECO来说，因为所有的结构都是由卷积构成的，因此我们把Query变成二维，比如100个Query，则可以变成10x10的维度。

CIM模块的主要作用是让图像特征和Query进行充分的交互，使得Query可以充分感知到图像特征信息，从而对图像中的目标进行坐标和类别的预测。对于Transformer结构来说，利用cross attention机制可以很方便实现这一目的，但对于卷积结构来说，如何让两个特征进行充分交互，则是一个最大的难点。

要把大小不同的SIM输出和encoder输出全局特征进行融合，必须先把两者进行空间对齐然后进行融合，首先我们对SIM的输出进行最近邻上采样：

\hat o = \mathrm {Upsample}(o) 

使得上采样后的特征与Encoder输出的全局特征有相同的尺寸，然后将上采样后的特征和encoder输出的全局特征进行融合，然后进入深度卷积进行特征交互后加上残差输入：

\hat o_f = \hat o + \mathrm {dwconv} (\mathrm {Fusion}(\hat o, z_e)) 

最后将交互后的特征通过FNN进行通道信息交互，之后pooling到目标数量大小得到decoder的输出embedding：

\hat o_p = \mathrm {Pooling} (\hat o_f + \mathrm {FFN}(\hat o_f)) 

最后我们将得到的输出embedding送入检测头，以进行后续的分类和回归。

<strong>多尺度特征的利用</strong>

跟原始的DETR一样，上述框架得到的DECO有个共同的短板，即缺少多尺度特征，而这对于高精度目标检测来说是影响很大的。Deformable DETR通过使用一个多尺度的可变形注意力模块来整合不同尺度的特征，但这个方法是跟Attention算子强耦合的，因此没法直接用在我们的DECO上。为了让DECO也能处理多尺度特征，我们在Decoder输出的特征之后，采用了RT-DETR提出的一个跨尺度特征融合模块。实际上，DETR诞生之后衍生了一系列的改进方法，我们相信很多策略对于DECO来说同样是适用的，这也希望感兴趣的人共同来探讨。

<strong>实验结果</strong>

我们在COCO上进行了实验，在保持主要架构不变的情况下将DECO和DETR进行了比较，比如保持Query数量一致，保持Decoder层数不变等，仅将DETR中的Transformer结构按上文所述换成我们的卷积结构。可以看出，DECO取得了比DETR更好的精度和速度的Tradeoff。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_19716a5e5f0d.png)

DECO和DETR的性能比较我们也把搭配了多尺度特征后的DECO跟更多目标检测方法进行了对比，其中包括了很多DETR的变体，从下图中可以看到，DECO取得了很不错的效果，比很多以前的检测器都取得了更好的性能。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_590793afaa8b.jpg)

DECO和不同检测器的性能比较文章中DECO的结构进行了很多的消融实验及可视化，包括在Decoder中选用的具体融合策略（相加、点乘、Concat），以及Query的维度怎么设置才有最优的效果等，也有一些比较有趣的发现，更详细的结果和讨论请参看原文。
