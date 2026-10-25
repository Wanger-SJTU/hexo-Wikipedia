---
title: (1 封私信) 相机图像信号处理流程（ISP）
date: "2023-11-30 00:00:00"
updated: "2023-11-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/ISP-计算摄影/相机图像信号处理流程(ISP)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/669484515
---


本文主要为阅读ICCV 2023 一篇Tutorial的笔记（Part 2）：
原文连接：ICCV 2023 Tutorial: Understanding the In-Camera Rendering Pipeline and the role of AI/Deep Learning (yorku.ca)
只是图像信号处理流程的一个总体的介绍，以便更好理解一张照片究竟是如何诞生的，实际的技术要复杂很多。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_32259ef7280f.jpg)

### 1 传感器捕获光信号

现在的相机多使用CMOS作为传感器，不同的相机有不同的画幅，如常见的APS-C画幅、全画幅等。总的来说画幅越大，即传感器尺寸越大，最终的成像质量会越好，因为可以捕捉到更多的光信号。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_6714b5beff82.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_8d9225edee9a.jpg)

常见的彩色图像格式是RGB三通道的，但是最开始的光信号采集却不是每个像素都会采集RGB三个像素的信息**，这样做会有成本以及空间的问题，而是收集三种不同光的Sensor成拜尔阵列分布，后续再通过插值等手段去恢复。


![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_21106cd83ca9.jpg)

CFA的作用是过滤其他光线，使得我们需要的红、绿、蓝三种波段的光才能进入传感器。

但是不同的CFA(color filter array)过滤后，最终相机对于不同波段的光的敏感度曲线也是有差别的。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_3a271a8a6d43.jpg)

Sensor最终的值是光强和曝光时间的线性函数，结合前面的人眼的敏感曲线，这个阶段其实是对真实世界的光辐射的一个捕捉，并没有结合人眼特性去处理。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_7a77a77e9a97.jpg)

这个时候的图像也不是电子设备可以显示的常见色彩空间，需要后续进行转换，直接显示RAW-RGB会非常奇怪。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_5793c0e4b6ad.jpg)

### 2 ISO和RAW格式图像处理流程

#### ISO

玩摄影的知道ISO代表感光度，值越高相机对光线敏感度越高，暗光下需要调高ISO,但是随之而来的是噪点会变明显。

但是其实相机捕捉到的实际光信号是不会因ISO变化而改变的，受限于光圈大小和Sensor曝光时间（快门时间），调整ISO本质上是调整传感器对得到的光信号的放大倍数，而在放大这个信号的同时，噪声也被放大了，就出现了前面提到的现象。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_959c28d6951e.jpg)

像素强度（Pixel "intensity"）是个绝对值，主要取决于：

- 增益（ISO）
- 曝光时间（Exposure）
- 将信号数字化的硬件设计

#### 暗电流矫正（Black Level Correction）与光学暗区（Optical black）

即使没有光照，电路中也会存在噪声电流等。所以传感器会有一块光学暗区(OB)去捕捉没有光线时候采集到的信号，然后再永实际捕捉到的信号减去OB的信号，以减少噪声。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_84dae73721c6.jpg)

#### 缺陷像素遮盖(Defective pixel mask)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_865ce84e88f8.jpg)

传感器的可能存在一些有缺陷的相机，一般由相机厂商完成，通过插值等方法去处理。

#### 平场矫正（Flat-field correction）

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_cc4eebe77fdb.jpg)

由于镜头、传感器位置等原因，会导致传感器最终捕捉到的不同区域的光强并不平均（有点类似一些镜头拍出来会有暗角），需要人为对对应的区域做补偿或者抑制。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_ed7e66085e8c.jpg)

### 3 去马赛克

即前面提到的，由于CMOS的RGB采集像素是分布不均匀的，需要通过插值去进行补偿，使得最终得到的每个Pixel都有RGB三个通道的值。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_96165bf92ae6.jpg)

文章里提到了两个插值方法，即简单的平均插值，或根据与周围像素的相似度去分配权限求加权平均去插值。但是发展到今天实际上的技术应该要复杂很多，就不赘述了。

- <strong>平均插值：</strong>
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_58804ee1de06.jpg)

- <strong>按相似度加权：</strong>
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_6e6e6ed6f348.jpg)


另外现在的很多传感器其实也不再采用拜尔阵列，而是有其他不同的排布方式

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_5e2b3075e184.jpg)

### 4 降噪（Noise reduction）

接下来会根据噪点的大小去采取不同程度的降噪处理，噪声越大采取的算法越激进，但是这个过程中其实会丢失很多信息与细节（例如手机由于传感器比较小，往往需要更激进的降噪算法）。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_721694ce0541.jpg)

噪声主要来源：

- 由于光子自身量子性质产生的噪声，这部分是与成像系统无关的，服从泊松分布
- 传感器和电路系统自身的噪声，如暗电流等，服从正态分布
而增益g由进一步放大了这个噪声（即IOS），所以一般ISO越高需要采取更加激进的降噪算法。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_ce2b0684fbf3.jpg)

文中提到了一个简单的降噪算法，现在采用的技术会更复杂，但是思路值得借鉴。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_9efe9a1e59f1.jpg)

- IOS越高，通过滤波进行模糊。
- 由于滤波也会丢失细节，用原图减去滤波后的图像，认为数值高的地方为原本的细节，再把这部分添加回来，可以找回一部分细节。
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_abe8a9d96d7d.jpg)

### 5 白平衡（White-balance）和色彩空间变换（White-balance）

这个部分需要把raw—RGB转换到一个通用色彩空间，以供后续处理,文章以CIE XYZ为例，但是实际上常用ProPhoto RGB。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_dfc3504d1843.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_6f5aea37bd63.jpg)

#### 白平衡

- 第一个阶段即需要通过白平衡去矫正原来的raw-RGB的值。**** 
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_45a5e0dbb21f.jpg)

 

首先要得到Sensor对于光照环境的RGB值，然后用这个对角矩阵变换，就可以得到白平衡之后的颜色。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_b0f8c85aef35.jpg)

这里最关键的其实就是如何去得到这个白平衡设置值，这个值可以根据经验以及环境光照的色温去手动设置，也可以借助成像设备的自动白平衡算法去计算得到，但是这个就对白平衡算法的要求比较高，目前还有很多人在研究。

而白平衡中最关键的就是我们要知道哪里是图片中白色区域或者灰色区域，文章提到了两个简单的算法：

第一种就是“Gray world”算法，假设平均光谱的值是灰色，图像的平均应该具有相同的能量，即R=G=B，基于这个假设将图像的平均作为灰色。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_ce42ae9fb0b6.jpg)

第二种方法假设高光点是光源的一个镜面反射，那么就可以以R,G,B的最大值去估计光源的颜色。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_e718766de3bf.jpg)

同样实际上的白平衡算法会更加的复杂，这里只是个基础的传统处理方法。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_6866ebe58486.jpg)

#### 色彩空间转换

- 第二个阶段是将raw-RGB映射变换到CIE XYZ色彩空间。
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_6739c06fd951.jpg)

相机厂商会先去标定两个极值下（CCT 2500K与CCT 6500K）的CST矩阵,后续的在这个范围内的色温就可以通过这两个标定好的极值去做插值得到，就像这里的4300K。所以这个阶段的变换矩阵也同样需要上阶段估算出环境色温。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_a80a1802dd83.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_02eee2d7b26e.jpg)

### 6 调色（Color manipulation）

基本工作完成后，在这个阶段对色彩进行调整或者风格化处理，使得最终的成像看起来更漂亮。不同相机厂商成像风格的差异应该业主要在这个阶段产生，不同厂商有不同厂商的色彩科学。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_8e249699bf4f.jpg)

一般来说通过LUT（3D Look up table）和1D的曲线进行调整，摄影后期LR或者PS调色的色调曲线应该也是在进行这一步一样的工作。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_b901a59486cc.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_9db3e4896a14.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_2a9492c80220.jpg)

再进一步的，也可以针对不同区域、和颜色进行单独的调整（Local tone mapping & Selective color manipulation），LR和PS等后期软件中也有类似的针对不同区域、颜色的单独调整功能。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_d2fe8dcf9f14.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_ec52afb5f81f.jpg)

- 关于皮肤调色相关文章，有空研究研究 -。-
![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_e805b584d3f0.jpg)

### 7 Re-scaling image

即根据取景器要求重新进行缩放，也可以叫做数码变焦或者超分辨率，传统的方法这里没有提，这方面AI的方法好像用的更多。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_5436a684df24.jpg)

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_ed3cb9878fc4.jpg)

### 8 色彩空间转换（sRGB conversion (or other color space)）

最后转换到我们需要的色彩空间，并且使用Gamma编码，之前有提过即给人眼更敏感的暗部分配更多的编码空间

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_1b5b85c42e18.jpg)

### 9 图像压缩

即将图片进行压缩，涉及到图像压缩编码技术比较复杂，这里只了解流程。

最常见的就是jpeg压缩，但是文章中提到现在苹果已经在使用的HEIC正在慢慢替代他们。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_8b9eeeb2cd9e.jpg)

### 10 零延时拍照技术 (Zero Shutter Lag)

比较好理解，由于图像的处理经过前面各个流程是需要一定的时间的，所以如果按下快门才开始记录，实际得到的是有有时延的。

所以实际上当取景器开始预览，相机便已经开始不断的去缓存快照，当按下快门后，根据按下时间去找对应的缓存帧就可以实现零延时。

![](/images/collections/0.raw/zhihu/ISP%26%E8%AE%A1%E7%AE%97%E6%91%84%E5%BD%B1/asset/img_11055d8b94b9.jpg)

### 参考文章

[[1] Understanding the In-Camera Rendering Pipeline and the role of AI/Deep Learning](https://link.zhihu.com/?target=https%3A//www.eecs.yorku.ca/~mbrown/ICCV2023_Brown.html)

另：

作者的主页，有很多其他工作：https://www.eecs.yorku.ca/~mbrown/ 

一个Github上ISP相关的仓库：[cruxopen/openISP: Image Signal Processor (github.com)](https://link.zhihu.com/?target=https%3A//github.com/cruxopen/openISP)

其他部分：

Part1: [色彩、色彩恒常性、色温、色彩空间—相关知识 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/667590636)

Part3：[基于AI的ISP（图像信号处理）相关研究 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/669664082)
