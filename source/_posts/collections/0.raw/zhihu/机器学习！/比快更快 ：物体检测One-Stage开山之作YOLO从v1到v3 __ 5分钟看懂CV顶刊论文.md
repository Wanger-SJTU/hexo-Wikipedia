---
title: 比快更快 ：物体检测One-Stage开山之作YOLO从v1到v3 || 5分钟看懂CV顶刊论文
date: "2019-05-02 00:00:00"
updated: "2019-05-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/比快更快-物体检测One-Stage开山之作YOLO从v1到v3-__-5分钟看懂CV顶刊论文/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64051698
---


<strong>项目地址：</strong>

YOLOv1-Pytorch：[GitHberChen/Yolov1-Pytorch](https://link.zhihu.com/?target=https%3A//github.com/GitHberChen/Yolov1-Pytorch)
to be continue原论文：

[You Only Look Once: Unified, Real-Time Object Detection](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1506.02640)
[YOLO9000: Better, Faster, Stronger](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1612.08242)
[YOLOv3: An Incremental Improvement](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1804.02767)前期提过的物体检测的算法：

[SSD || 5分钟看懂CV顶刊论文](https://zhuanlan.zhihu.com/p/57399396)
[R-CNN： 狼入羊群 || 5分钟看懂CV顶刊论文](https://zhuanlan.zhihu.com/p/62041286)
[Fast R-CNN： 变快了，也变强了 || 5分钟看懂CV顶刊论文](https://zhuanlan.zhihu.com/p/62273673)
[Faster R-CNN：这篇论文讲的是一个感人的爱情故事 || 5分钟看懂CV顶刊论文](https://zhuanlan.zhihu.com/p/62401362)

本文目录：

- <strong>YOLO发展路线</strong>
- <strong>YOLOv1介绍</strong>
- <strong>YOLOv2介绍</strong>
- <strong>YOLOv3</strong>介绍

### 一、YOLO发展路线

YOLO作为物体检测领域中极具名气的算法，只因它拿下两个第一：

- YOLO是第一个one-stage的物体检测算法，直接end-to-end训练，不用像Faster R-CNN一样来回倒腾训练（虽然GitHub上也有其end-to-end训练的实现）。
- YOLO是第一个可以做到实时检测的物体检测算法，Fast YOLO甚至可以在Titan X上可以跑到155FPS。
不过检测精度上相对于表现最好的Faster R-CNN而言mAP还差了一些，然而后者VGG-16的实现在FPS仅个位数，所以，要啥自行车？

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_1eca17e704cf.jpg)

YOLOv1与Faster R-CNN差异的一个重要原因在于YOLOv1没那么多Proposal，YOLOv1将图片划分成 7\times 7 个格子，每个格子只负责检测一个物体，如果两物体重叠，那么分别由物体中心所在的格子来预测，如果两物体中心在同一个格子的话......没错，它就瞎了，这即是YOLOv1的mAP之所以比Faster R-CNN低的关键。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0aee152e22e1.jpg)

总的来说，YOLOv1作为物体检测算法，基本上没有离开R-CNN打下的基本框架，即<strong>提出候选框->特征提取->分类->精调位置。</strong>具体而言，YOLOv1候选框用给图片划分格子搞定，特征提取依旧用CNN，分类和精调位置用全连接网络，具体细节会在相应章节描述。

YOLOv2作为改进的版本，相对YOLOv1的做了以下调整：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_ae3ce7932c1a.jpg)

YOLOv2做出的改变还是挺多的，比较重要的有以下几点：

- 使用了与Faster R-CNN、SSD类似锚框机制和边框预测机制，值得一提的是，这个锚框尺寸并非人工设计，而是通过在数据集上进行K-means得到的，效果上5个抵人工设计的9个。
- 自行设计了一个高效的网络结构Darknet-19作为主体网络，运算量仅VGG-16的，但效果相当，且最后的YOLOv2不含全连接层，这意味着其对输入的图像大小无限制，可以通过调整输入图像的大小来对识别准确度与识别速度进行trade-off。
- Darknet在预训练完成后再继续用在ImageNet上用 448×448 的更高分辨率训练10epochs以提前适应更高分辨率的物体检测情况。
在YOLOv3论文中作者就写得相当随性了，开头先唠唠嗑，谈谈生活近况：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_2077b9597408.jpg)

中途逗比一下，强行在论文中cite本篇论文：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0c6e092b7211.png)

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_257461640390.png)

最后不忘调侃一下越来越严峻的隐私问题

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_063204662f85.jpg)

不得不说，这论文写得真是清新脱俗。


调侃归调侃，Yolov3还是做了一些改变的，在论文中尝试了许多tricks，而且告诉了读者哪些有用，哪些没有用。其中最重要的还是主体网络的改变，提出了Darknet-53，且使用了多层级的Feature maps进行检测：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_3f8ee646b454.jpg)

接下来会对其分别作详细介绍。

### 二、YOLOv1介绍

<strong>1、主体网络结构</strong>

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_aa6bf92481ec.jpg)

最后输出的 7\times 7\times 30 含义为 7\times 7\times (B\times5+C) ，其中 7\times 7 是将图片等分的格子数量；B为每个格子预测的物体框数量，论文中取2；5表示<strong>含有物体的置信度</strong> P(Obj ) 以及预测的物体框中心 (x,y),\ x,y\in(0,1) <strong>相对于格子</strong>的偏移以及框<strong>相对于整张图的尺寸</strong> (w,h),\ w,h\in(0,1) ；C表示检测物体的各类别的置信度 P(Class_i|Obj) ，对于VOC而言种类数是20 。

具体对于每一个格子预测的每一种类别的置信度的计算方式如下：

P(Obj)*P(Class_i|Obj)*IOU^{truth}_{pred}=P(Class_i)*IOU^{truth}_{pred} 

损失函数的设计

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_fcb7b5378d90.jpg)

$其中 \lambda_{coord}=5,\lambda_{noobj}=0.5 ； \mathbb 1^{obj}_{i} 用于选择真框落入的那个； \mathbb 1^{obj}_{ij} 表示当真框的中心坐标落在格子 i 中时，选出真框 IOU 最大的那个box。$

参考链接：https://blog.csdn.net/guleileo/article/details/80581858

2、激活函数

激活函数并非ReLU，而是Leaky ReLU，即：

\phi(x)= \left\{   \begin{array}{leaky} x,&if\ x\gt 0 \\ 0.1x, & otherwise \end{array} \right. 


3、模型训练

- 采用VOC2007、VOC2012的训练集和交叉验证集，总共训练了135个epochs。
- batch_size=64。
- 使用SGD，momentum=0.9，decay=0.0005。
- 学习率第一个epoch中从 10^{-3} 缓慢上升到 10^{-2} ，持续75个epochs，尔后30个epochs为 10^{-3} ，最后30个epochs为 10^{-4} 
- 在第一个全连接层后使用dropout，rate=0.5。
- 数据增强上：

- 调整原始图像大小以及转换最高幅度至20%。
- 在HSV颜色空间使用factor=1.5随机对曝光以及饱和度作调整


4、算法流程图

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_3bba0ac5bc49.jpg)

参考链接：
https://blog.csdn.net/hrsstudy/article/details/70305791
https://blog.csdn.net/hrsstudy/article/details/70305791

5、个人感受

YOLOv1和Faster R-CNN个人都简单地用Pytorch实现过，最大的感受就是YOLO真的比Faster R-CNN快太多了，用CPU跑都很快。不过，YOLOv1的槽点也有不少，其一是在对物体的的定位上真的差，常常是可以准确地找出图中含有的物体种类，但标出来的框框很飘逸：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_63fbd0a284d5.jpg)

而且太小的物体也检测不到，如最后那一辆车：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_389376ad4612.jpg)

不过总得来说，在一般情况下，效果还是可以的：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c72d3dd5b068.jpg)

其二是YOLOv1模型真的太大了，锅在全连接层，光第一个全连接层就有206M的参数，将近需要1GB的内存了，作为对比，ResNet101模型大小不到200MB。


### 三、YOLOv2介绍

<strong>1、Better</strong>

- 使用了BatchNorm，此举提高了2%的mAP
- 使用ImageNet在 224\times 224 分辨率下预训练完成后，再调整模型在 448\times 448 分辨率下训练10个epoch，此举提高了4%的mAP。
- 去掉了特征提取网络中的一个池化层，在输入为 448\times 448 时输出的特征图大小为 14\times 14 ，更容易识别到小的物体；由于图片中的物体都倾向于出现在图片的中心位置，特别是那种比较大的物体，中心有单独的格子有助于提高识别的表现，而为了使输出特征图为奇数，输入调整为 416\times 416 ，这样输出为 13\times 13 。
- 去掉了全连接层，换成了一个输出为1024层的 3\times 3 卷积层以及一个使用锚框机制的 1\times 1 的卷积层，这样使得mAP从69.5降低至69.2，但recall率从82%提高到了88%，说明改进空间提高了。
- 非人为设计锚框，使用k-means得到聚类的不同大小尺寸的锚框，这样得出的锚框，5个更比人为设计的9个要强：
![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_a06f3ca3b19f.jpg)

- 使用了新的定位方法，Yolov1中框的中心定位由格子的位置以及相对格子的的偏移量 (x,y) \in(0,1) 决定，框的大小由 (w,h) \in (0,1) 相对于图片的宽高决定。而Yolov2采用了如下的定位方式，其中 (c_x,c_y) 为格子左上角的位置， (p_w,p_h) 为锚框的宽高， \sigma 为sigmoid函数，置信度上和Yolov1一样采用了物体真框与预测框的IOU与Pr(Obj)相乘的方式。
![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_b09ce9871b9b.jpg)

- YOLOv2修改后的特征图大小为 13\times 13 ，为了进一步提高其对细小物体的检测性能，YOLOv2 加上了一个 Passthrough Layer 来取得之前的某个 26*26 分辨率的层的特征。这个 Passthrough layer 能够把高分辨率特征与低分辨率特征联系在一起，联系起来的方法是把相邻的特征堆积在不同的 Channel 之中，这一方法类似与 Resnet 的 Identity Mapping，从而把 26\times 26\times 512 变成 13\times 13\times 2048 连结在原来 13\times 13 的特征图上。这提升了 YOLOv2 1% 的性能。
- 为了使YOLOv2在不同分辨率下依然有很好的表现，训练时每过19个Batch，网络会随机地选择一个新的图片尺寸，尺寸大小间隔选择为下采样的倍数，即32，可选大小为{320，352…..608}，最小 320*320，最大 608*608。这样使得YOLOv2 的速度和精度上进行权衡，在输入图片较小时跑得快，较大时精度高。
在 voc2007 上的速度与精度对比：


![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_84be5078e978.jpg)

2、Faster

作者自行自行设计了一个高效的网络结构Darknet-19作为特征提取网络，效果与VGG-16相当，运算量缩减为20%。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_82f86130a12a.jpg)

预训练：

- 使用SGD优化器，momentum=0.9，decay=0.0005
- 初始学习率0.1，采用指数为4的多项式衰减，训练160个epoch
参考链接：https://blog.csdn.net/dcrmg/article/details/80017200

- 数据增强手段和YOLOv1、SSD类似，使用：随机裁剪、旋转、色调调整、曝光调整。
- 训练完后再在448\times 448分辨率下训练10个epoch，这会使Darknet的top-1、top-5从72.9%、91.2%分别提高到76.5%、93.3%。
训练细节：

- 最后 1\times 1 卷积层输出为 S\times S\times P\times (5+C) ，P为锚框数量，取5；C为VOC物体检测类别数量，取20。
- 使用SGD优化器，momentum=0.9，decay=0.0005
- 初始学习率为0.001，到60、90epochs时分别除以10，160个epochs截止。
YOLOv2的性能表现：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c38c788534b8.jpg)

3、Stronger

作者用WordTree的结构嵌套多个softmax，在VOC和ImageNet上联合训练得到了可以分类9000种的一个模型：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c3fede94889b.jpg)

个人觉得并不实用，识别的准度糟糕，不过还是挺有意思的。


### 四、YOLOv3介绍

<strong>1、YOLOv3性能</strong>

YOLOv3 在 Pascal Titan X 上处理 608x608 图像速度可以达到 20FPS，在 COCO test-dev 上 mAP@0.5 达到 57.9%，与RetinaNet（FocalLoss论文所提出的单阶段网络）的结果相近，并且速度快 4 倍。YOLO v3 的模型比之前的模型复杂了不少，可以通过改变模型结构的大小来权衡速度与精度。
从YOLOv1到YOLOv3，目标检测的进化之路 - TinyMind -专注人工智能的技术社区速度对比如下：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_f850f267b20e.jpg)

2、YOLOv3的改进

- 使用了多尺度预测 （实用类似FPN的上采样），分割的格子数量分别是 13\times 13  、 26\times 26  、 52\times 52  。
- 更佳的特征提取网络（类ResNet）DarkNet-53
![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c66e2bd2d92b.jpg)

- YOLOv3 不使用 Softmax 对每个框进行分类，主要考虑因素如下：

- Softmax 的潜台词是一个框内只能有一个物体，而实际上目标可能有重叠。因此 Softmax不适用于多标签分类。
- Softmax 可被独立的多个 logistic 分类器替代，且准确率不会下降。 
- 分类损失采用 binary cross-entropy loss.


3、多尺度预测

锚框由k-means得出，每层分别负责三种尺寸，在COCO数据集下使用聚类得出：

10\times 13,\  16\times 30,\  33\times 23,\  \\ 30\times 61,\  62\times 45,\  59\times 119,\  \\ 116\times 90,\ 156\times 198,\ 373\times 326,\       

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_5e6efcc385d8.jpg)

具体结构参数：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0839caaa2fe7.jpg)

参考链接：https://blog.csdn.net/Gentleman_Qin/article/details/84350496

Darknet-53 与 ResNet-101 或 ResNet-152 准确率接近，但速度更快，对比如下：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_31dbbf40250c.jpg)

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9e52928e9570.jpg)

> YOLOv3 在 mAP@0.5 及小目标 APs 上具有不错的结果，但随着 IOU的增大，性能下降，说明 YOLOv3 不能很好地与 ground truth 切合.

YOLOv3 608*608用于实时检测：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c1ad3a14186d.jpg)

> 参考链接：https://blog.csdn.net/qq_35451572/article/details/85254865

PS：
广告时间啦~
理工生如何提高人文素养软实力？快关注微信公众号：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_d3143c5fc425.jpg)

欢迎扫码关注~
