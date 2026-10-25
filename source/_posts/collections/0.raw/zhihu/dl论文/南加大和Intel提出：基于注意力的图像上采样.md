---
title: "南加大和Intel提出：基于注意力的图像上采样"
date: 2021-01-24
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/346708849

---

本文提出基于注意力的上采样方法，其在使用较少参数的情况下，性能始终优于转置卷积或基于自适应滤波器的传统上采样方法！通过对单图像超分辨率和联合图像上采样任务进行验证。

**注1：文末附【计算机视觉细分垂直方向】交流群（含检测、分割、跟踪、医疗、GAN、Transformer等）**

**注2：整理不易，欢迎点赞，支持分享！**

**Attention-based Image Upsampling**

![](https://pic3.zhimg.com/v2-9ebdf22cbfca298097accd29d462251a_r.jpg)作者单位：南加州大学, Intel Labs
论文：[https://arxiv.org/abs/2012.09904](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2012.09904)卷积层是计算机视觉中许多深度神经网络解决方案不可或缺的一部分。最近的工作表明，用基于自注意力机制来替换标准的卷积运算可以提高图像分类和目标检测任务的性能。在这项工作中，我们展示了如何使用注意力机制代替另一种规范操作：**strided transposed convolution（转置卷积）**。

![](https://pic1.zhimg.com/v2-fe8873bcf1b169c8fdd90d6823322e5a_r.jpg)我们称其称为：**基于注意力的上采样**，因为它会增加/向上采样特征图的空间尺寸。

![](https://pic1.zhimg.com/v2-0903f4fb7eb72afcb03b87137de20b02_r.jpg)
![](https://pica.zhimg.com/v2-9322fcfdc1be841208114ab541ea1ea2_r.jpg)
![](https://pic3.zhimg.com/v2-fde589fd2f5132deaf52762b6f249106_r.jpg)**算法细节**

![](https://pic2.zhimg.com/v2-484c5e1068baee6fd644b2fa8cac5137_r.jpg)
![](https://pic2.zhimg.com/v2-6c108afa964e5850327e58d5e7bda2f3_r.jpg)
实验结果
通过对单图像超分辨率和联合图像上采样任务的实验，我们表明基于注意力的上采样在使用较少参数的情况下，始终优于基于跨步转置卷积或基于自适应滤波器的传统上采样方法。

![](https://picx.zhimg.com/v2-c97eda00ab80b2386a36716a291c28c7_r.jpg)
![](https://pic2.zhimg.com/v2-0b17e2b5a85f87523797d2297cbc17a1_r.jpg)
![](https://pic2.zhimg.com/v2-447c2fa708f1b680bf4c3a43f16dc19b_r.jpg)
![](https://pic2.zhimg.com/v2-75b6c49c7694af7b1567336e2808fadf_r.jpg)我们表明，注意力机制的固有灵活性使它能够使用单独的源来计算注意力系数和注意力目标，从而在融合来自多种图像形式的信息时，基于注意力的上采样成为一种自然选择。

![](https://pic1.zhimg.com/v2-f393b16aa348d2fae1e55df4a953295e_r.jpg)
**CVer-细分垂直交流群成立**
扫码添加CVer助手微信，**可申请加入CVer-细分垂直方向 微信交流群，也可申请加入CVer大群，细分方向已涵盖：目标检测、图像分割、目标跟踪、人脸检测&识别、OCR、姿态估计、超分辨率、SLAM、医疗影像、Re-ID、GAN、NAS、深度估计、自动驾驶、强化学习、车道线检测、模型剪枝&压缩、去噪、去雾、去雨、风格迁移、遥感图像、行为识别、视频理解、图像融合、图像检索、论文投稿&交流、Transformer、PyTorch和TensorFlow等群。**

CVer小助手微信号：**CVer9999。一定要备注：研究方向+地点+学校/公司+昵称（如目标检测+上海+上交+卡卡）**，根据格式备注，才能通过且邀请进群

**强烈推荐大家关注**[CVer知乎](https://www.zhihu.com/people/cver-38)**账号和**[CVer](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/moRNkCaBDtYZgXwaZDXBwA)**微信公众号，可以快速了解到最新优质的CV论文。**

推荐阅读
[攻下SLAM！用于无监督视觉里程表的Transformer引导几何模型](https://zhuanlan.zhihu.com/p/346545778)

[没有自然图像的预训练 | ACCV 2020 最佳论文提名奖](https://zhuanlan.zhihu.com/p/346488531)

[基于深度学习的行人重识别(Re-ID)综述：全面调研（2015-2020）](https://zhuanlan.zhihu.com/p/346361954)

[2020年最先进的3D医学图像分割方法](https://zhuanlan.zhihu.com/p/346246175)

[Focal-EIOU Loss：用于精确边界框回归的高效IOU损失](https://zhuanlan.zhihu.com/p/346006319)

[旷视提出Momentum^2 Teacher：用于自监督学习的具有动量统计的动量老师](https://zhuanlan.zhihu.com/p/345762425)

[计算机视觉中的Transformer](https://zhuanlan.zhihu.com/p/345557138)

[又快又强！DDRNet：用于实时准确语义分割的深度双分辨率网络](https://zhuanlan.zhihu.com/p/345500163)

[谷歌提出：用于医学影像的大规模监督迁移学习](https://zhuanlan.zhihu.com/p/345342535)

[AAAI 2021 3D目标检测论文大盘点（CIA-SSD/Voxel R-CNN等）](https://zhuanlan.zhihu.com/p/345240056)

[AAAI 2021 目标检测论文大盘点（YOLObile/R3Det/StarNet等）](https://zhuanlan.zhihu.com/p/344915799)

[AttentionLite：面向高效的视觉自注意力模型](https://zhuanlan.zhihu.com/p/344742755)

[医学图像语义分割最佳方法的全面比较：U-Net和U-Net++](https://zhuanlan.zhihu.com/p/344658591)

[阿里CV面试官对招人的几点看法](https://zhuanlan.zhihu.com/p/344588668)

[生成对抗U-Net：实现Domain-free医学图像增广](https://zhuanlan.zhihu.com/p/344479363)

[80GB 医学影像数据集发布！OCTA-500公开下载](https://zhuanlan.zhihu.com/p/344381755)

[RepVGG：使VGG样式的ConvNets再次出色](https://zhuanlan.zhihu.com/p/343660471)

[涨点神器！SoftPool：一种新的池化方法，带你起飞，代码已开源！](https://zhuanlan.zhihu.com/p/343481363)

[又一篇视觉Transformer综述来了！](https://zhuanlan.zhihu.com/p/341995737)

[深度神经网络中的池化方法：全面调研（1989-2020）](https://zhuanlan.zhihu.com/p/341820742)

[涨点神器！IC-Conv：具有高效空洞搜索的Inception卷积](https://zhuanlan.zhihu.com/p/340482046)

[一文快速回顾U-Net Family](https://zhuanlan.zhihu.com/p/339934172)

[冠军解决方案！用于脑肿瘤分割的nnU-Net改进](https://zhuanlan.zhihu.com/p/325932805)

[综述 | 基于深度学习的实时语义分割方法：全面调研](https://zhuanlan.zhihu.com/p/266047861)