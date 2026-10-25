---
title: "清华大学提出ISDA：使用语义数据增广来正则化深度网络"
date: "2020-08-06 00:00:00"
updated: "2020-08-06 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/清华大学提出ISDA-使用语义数据增广来正则化深度网络/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/170610480"
---


ISDA：隐式语义数据增广新方法，涨点明显！可提高分类、目标检测、实例分割等任务性能，代码现已开源！

<strong>Regularizing Deep Networks with Semantic Data Augmentation</strong>

作者单位：清华大学&北京航空航天大学
代码：[https://github.com/blackfeather-wang/ISDA-for-Deep-Networks](https://link.zhihu.com/?target=https%3A//github.com/blackfeather-wang/ISDA-for-Deep-Networks)
论文下载链接：[https://arxiv.org/abs/2007.10538](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2007.10538)注：如果上述论文链接无法访问，可以看文末，论文已上传至百度云，方便下载。

数据增广是一种用于正则化深度网络的简单但出奇的有效技术。常规的数据增广方案，例如翻转，平移或旋转，是low-level的，与数据无关且与类无关的操作，导致扩充样本的多样性有限。

![](https://pica.zhimg.com/v2-13de532e900c14bd04bf34dc95b79d98_r.jpg)
ISDA
为此，我们提出了一种新颖的语义数据增广算法以补充传统方法。提出的方法受到了有趣的特性的启发，即深度网络可有效地学习线性化特征，即深度特征空间中的某些方向对应于有意义的语义转换，例如更改对象的背景或视角。基于此观察，在特征空间中沿许多这样的方向平移训练样本可以有效地扩展数据集以实现更多多样性。

![](https://pica.zhimg.com/v2-5679e3136e9c67932f924235bf26558a_r.jpg)为了实现这个想法，我们首先介绍一种基于采样的方法，以有效地获取语义上有意义的方向。然后，通过假设增强样本的数量达到无穷大，得出增强训练集上预期交叉熵（CE）损失的上限，从而得出高效的算法。

![](https://pic3.zhimg.com/v2-1e398736123fc1801e254c5d3abd9052_r.jpg)
![](https://picx.zhimg.com/v2-7608e6c19b31fabe663804c2c10a4cc3_r.jpg)实际上，我们表明，提出的隐式语义数据增广（ISDA）算法可将新的稳健的CE损失降至最低，从而为常规训练过程增加了最少的额外计算成本。除了监督学习之外，ISDA还可以在一致性正则化框架下应用于半监督学习任务，其中ISDA等于最大程度地减少了增强特征和原始特征之间的预期KL散度的上限。

实验结果
尽管很简单，但ISDA不断提高了流行的深度模型（例如ResNets和DenseNets）在各种数据集（即CIFAR-10，CIFAR-100，SVHN，ImageNet，Cityscapes和MS COCO）上的泛化性能。

在图像分类、目标检测、语义分割等任务上均有性能提升！

![](https://pic4.zhimg.com/v2-1559f79032fe37e92a2fc725c653c753_r.jpg)
![](https://pica.zhimg.com/v2-8d6d6c4ac3eaf4fae60a669b966c4336_r.jpg)
![](https://pic1.zhimg.com/v2-cd19833eab67d4223ffced4b2769cafe_r.jpg)
下载
链接：[https://pan.baidu.com/s/1OUe59W0FboaeY343y8t1pQ](https://link.zhihu.com/?target=https%3A//pan.baidu.com/s/1OUe59W0FboaeY343y8t1pQ) 
提取码：kxt6<strong>强烈推荐大家关注[计算机视觉论文速递](https://zhuanlan.zhihu.com/c_172507674)知乎专栏和[CVer](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/moRNkCaBDtYZgXwaZDXBwA)微信公众号，可以快速了解到最新优质的CV论文。</strong>

推荐阅读
[使用深度神经网络从Noisy Labels中学习：全面调研](https://zhuanlan.zhihu.com/p/161822079)

[PyTorch3D：面向3D计算机视觉的PyTorch工具箱](https://zhuanlan.zhihu.com/p/162977433)

[剪枝filter？还是剪枝layer？这是个问题](https://zhuanlan.zhihu.com/p/163248951)

[Facebook发布FAIRScale：用于高性能和大规模训练的PyTorch工具](https://zhuanlan.zhihu.com/p/161246287)

[ECCV 2020 | 53.5 AP！PAA：用于目标检测的IoU预测的概率Anchor分配](https://zhuanlan.zhihu.com/p/161667111)

[ECCV 2020 | 南京理工提出FPT：特征金字塔Transformer](https://zhuanlan.zhihu.com/p/166649124)

[ECCV 2020 | DecoupleSegNets：通过解耦的主体和边缘监督改进语义分割](https://zhuanlan.zhihu.com/p/164899960)

[Mask TextSpotter v3：用于场景文字检测和识别的分割Proposal网络](https://zhuanlan.zhihu.com/p/166301106)

[ECCV 2020 Oral | LISRD：局部特征描述符的在线不变性选择](https://zhuanlan.zhihu.com/p/163720836)

[ECCV 2020 | BMask R-CNN：边界保持的Mask R-CNN](https://zhuanlan.zhihu.com/p/163672090)

[ECCV 2020 | 即插即用！PSConv：将特征金字塔压缩到紧凑的多尺度卷积层中](https://zhuanlan.zhihu.com/p/160777733)

[ECCV 2020 | STTN：用于视频修复的时空联合Transformer](https://zhuanlan.zhihu.com/p/165412320)

[ECCV 2020 Oral | DG-Net++：面向跨域的行人重识别新网络](https://zhuanlan.zhihu.com/p/164646358)

[ECCV 2020 | 北邮提出PMG：通过渐进式多粒度拼图训练进行细粒度视觉分类](https://zhuanlan.zhihu.com/p/163097635)

[ECCV 2020 | 通过聚类无标签数据来提高人脸识别能力](https://zhuanlan.zhihu.com/p/161478578)