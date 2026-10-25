---
title: CVPR 2020 (Oral) | 你去自转一圈，给我数秒时间，还你一个数字化3D模型
date: "2020-04-11 00:00:00"
updated: "2020-04-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/CVPR-2020-(Oral)-_-你去自转一圈,给我数秒时间,还你一个数字化3D模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/128979681
---


**Robust 3D Self-portraits in Seconds**

 快速、准确、鲁棒、高效的3D人体重建一直是一个研究热点，在游戏、 VR/AR、虚拟试衣等众多领域都有着重要的应用。

![](https://picx.zhimg.com/v2-31eef81c53ee85bf4aa2dcd48eaba4bb_r.jpg)本文已经被 CVPR 2020 接收为 Oral 文章，作者来自清华大学的刘烨斌老师团队，`BodyFusion`、`DoubleFusion`、`UnstructuredFusion`、`HybridFusion`、`DeepHuman` 等一系列人体重建、捕捉方面的优秀工作都出自该团队。

**项目主页**：[http://www.liuyebin.com/portrait/portrait.html](https://link.zhihu.com/?target=http%3A//www.liuyebin.com/portrait/portrait.html)

作者将深度学习和传统的优化方法相结合，提出了一种基于 RGBD 相机的3D人体快速重建方法，只需要在相机前面自转一圈，数秒时间便可以重建出穿着衣服的 3D 人体模型，且模型表面有丰富的几何细节。下面是文章方法的Demo视频。

[
![](https://pic3.zhimg.com/v2-a47d60bcb733c97e51a89b3c5023b60e.jpg)Demohttps://www.zhihu.com/video/1232321009056751616](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/1232321009056751616)

3D自画像 (人体重建) 方法可以被分为三类：

- **基于学习的方法** (learning-based methods)：主要从单张 RGB 图片恢复人体的三维模型，但由于遮挡和深度歧义，重建精度较低；
- **基于融合的方法** (fusion-based methods)：通过递增的方式重建几何，但不可避免地存在累计误差，尤其是非刚性的情况下，导致重建闭环问题；
- **基于光束法平差的方法** (bundle-adjustment-based methods)：该类方法采用光束法平差算法来改善渐进式融合的累积误差问题。首先将输入序列分割为一些块，在每个块之间进行融合得到光滑的部分扫描结果，最后基于显式的回环对应和光束对应将所有的部分扫描数据同时非刚性地注册在一起得到最终模型。虽然结果不错，但该方法需要多个 RGBD 相机或者电子转盘，效率较低。文章方法将以上三种方法组合在一起，汲取各自的优点和长处，提出了一种高效、鲁棒的基于RGBD相机的人体重建方法。

**Overview**
给定一段捕捉了人体自然旋转一圈的 RGBD 视频序列，文章通过下面三个步骤来进行重建：

- **RGBD-PIFu**：通过神经网络从第一帧 RGBD 图片预测一个大致准确的人体模型；
- **PIFusion**：对于每一帧，首先使用前面估计的人体模型作为内层，进行基于双层表达的非刚性追踪，然后使用传统的非刚性融合方法将深度数据融合到参考帧中。再使用非刚性体变形进一步优化内层模型，以提高追踪和融合的精度。最后将整个序列分为几个小块并在每个块中分别进行融合，得到部分扫描结果。
- **Lightweight bundle adjustment**：使用 BA 算法对部分扫描网格进行回环优化，在每次迭代中，选择合适的关键帧来构建深度对齐和轮廓对齐能量项，然后通过联合优化，使得所有部分扫描能够组合在一起形成闭环，还能将其变形对齐到每一个关键帧深度图。
![](https://pica.zhimg.com/v2-601c8169ffc83715e0b20e4bf2ef9f5e_r.jpg)System Pipeline
**RGBD-PIFu**
作者将像素对齐的隐式函数 (Pixel-aligned Implicit Functions, PIFu)[2] 进行推广，提出 RGBD-PIFu 来从单张 RGBD 图片重建 3D 人体模型。PIFu[2] 是 ICCV 2019 的一篇文章，其通过水平集函数 
![](https://www.zhihu.com/equation?tex=f) 来隐式地定义三维曲面：
![](https://www.zhihu.com/equation?tex=f%28X%29+%3D+0%2C+X+%5Cin+%5Cmathbb%7BR%7D%5E3)，并利用该表达从单张彩色图重建3D人体。而 RGBD-PIFu 将该隐式函数表达为一个复合函数 
![](https://www.zhihu.com/equation?tex=f)，其由 **全卷积 RGBD图片编码器** 
![](https://www.zhihu.com/equation?tex=g) 和 **基于多层感知机表达的隐式函数** 
![](https://www.zhihu.com/equation?tex=h) 组成：

![](https://www.zhihu.com/equation?tex=f%28X+%3B+I%29%3Dh%5Cleft%28G%28x+%3B+I%29%2C+X_%7Bz%7D%5Cright%29%2C+X+%5Cin+%5Cmathbb%7BR%7D%5E%7B3%7D+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=I) 是输入的 RGBD 图片，
![](https://www.zhihu.com/equation?tex=x+%3D+%5Cpi%28X%29) 是3D点 
![](https://www.zhihu.com/equation?tex=X) 的2D投影，
![](https://www.zhihu.com/equation?tex=G%28x%3BI%29) 是编码的特征图 
![](https://www.zhihu.com/equation?tex=g%28I%29) 上的 
![](https://www.zhihu.com/equation?tex=x) 点处的特征向量，
![](https://www.zhihu.com/equation?tex=X_z) 是3D点 
![](https://www.zhihu.com/equation?tex=X) 的深度值。与 PIFu 不同，这里的编码器编码了深度图的信息，使得重建的模型与输入深度图一致，能够解决深度歧义问题并提高重建结果的准确性。训练的损失函数使用均方误差：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D%3D%5Cfrac%7B1%7D%7Bn%7D+%5Csum_%7Bi%3D1%7D%5E%7Bn%7D%5Cleft%7Cf%5Cleft%28X_%7Bi%7D+%3B+I%5Cright%29-f%5E%7B%2A%7D%5Cleft%28X_%7Bi%7D%5Cright%29%5Cright%7C%5E%7B2%7D+%5C%5C)

![](https://picx.zhimg.com/v2-1a03dc077d451382316b42667f12124b_r.jpg)RGBD-PIFu
**PIFusion**

**Initialization**
首先将第一帧深度图直接投影来初始化截断符号距离函数 (Truncated Signed Distance Function, TSDF) 体并将 RGBD-PIFu 得到的内层模型拟合到 TSDF 体中，然后基于测地距离 (geodesic distance) 在内层模型上均匀采用得到变形节点图，以对融合的外层表面和内层模型的非刚性形变进行参数化。

**Double-layer Non-rigid Tracking**
给定第 
![](https://www.zhihu.com/equation?tex=t-1) 帧的内层模型和融合表面 (即双层表达)，基于双层表达的非刚性追踪需要将双层表面进行变形以追踪第 
![](https://www.zhihu.com/equation?tex=t) 帧的深度图，内层模型主要用于辅助非刚性追踪。总的优化目标函数如下：

![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext%7Btracking%7D%7D+%3D+%5Clambda_%7B%5Ctext%7Bouter%7D%7D+E_%7B%5Ctext%7Bouter%7D%7D%2B%5Clambda_%7B%5Ctext%7Binner%7D%7D+E_%7B%5Ctext%7Binner%7D%7D%2B%5Clambda_%7B%5Ctext%7Bsmooth%7D%7D+E_%7B%5Ctext%7Bsmooth%7D%7D+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext%7Bouter%7D%7D) 和 
![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext%7Binner%7D%7D) 分别是两种对应的能量，即融合表面(外层)与深度图之间的对应，内层模型(内层)与深度图之间的对应。
![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext%7Bsmooth%7D%7D) 是促使局部变形尽可能刚性 (as-rigid-as-possible, ARAP) 的正则项。
![](https://www.zhihu.com/equation?tex=%5Clambda_%7B%5Ctext%7Bouter%7D%7D)、
![](https://www.zhihu.com/equation?tex=%5Clambda_%7B%5Ctext%7Binner%7D%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Clambda_%7B%5Ctext%7Bsmooth%7D%7D) 分别是三种能量对应的权重。

整个目标函数通过迭代最近点 (Iterative Closest Point, ICP) 算法求解，通过高斯牛顿法求解优化问题，优化过程中，随着 ICP 迭代次数的增加，权重 
![](https://www.zhihu.com/equation?tex=%5Clambda_%7B%5Cmathrm%7Binner%7D%7D) 逐渐减小以使得外层表面拟合更加准确。追踪完成后，再使用传统的融合方法将深度图融合并更新 TSDF 体。

**Outer and Inner Term**
两个数据项能量衡量了双层表面与深度图之间的对齐程度，其有着相似的数学表达：

![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext%7Bouter%2Finner%7D%7D%3D%5Csum_%7B%28%5Cmathbf%7Bv%7D%2C+%5Cmathbf%7Bu%7D%29+%5C%2C+%5Cin+%5C%2C%5Cmathcal%7BC%7D_%7B%5Ctext%7Bouter%2Finner%7D%7D%7D%5Cleft%7C%5Chat%7B%5Cmathbf%7Bn%7D%7D_%7B%5Cmathbf%7Bv%7D%7D%5E%7B%5Ctop%7D%28%5Chat%7B%5Cmathbf%7Bv%7D%7D-%5Cmathbf%7Bu%7D%29%5Cright%7C%5E%7B2%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BC%7D_%7B%5Ctext%7Bouter%7D%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BC%7D_%7B%5Ctext%7Binner%7D%7D) 分别是两种类型的对应点集合，
![](https://www.zhihu.com/equation?tex=%28%5Cmathbf%7Bv%7D%2C+%5Cmathbf%7Bu%7D%29) 是一对对应点，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 是外层或内层表面上的点，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bu%7D) 是深度图上离 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 最近的点。这里需要注意 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 是参考模型上的顶点，
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cmathbf%7Bv%7D%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cmathbf%7Bn%7D%7D_%7B%5Cmathbf%7Bv%7D%7D) 分别是顶点  
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 的位置和法向通过其 KNN 节点利用对偶四元数混合蒙皮 (Dual Quaternion Blending) 变形到当前帧的的结果

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BT%7D%28%5Cmathbf%7Bv%7D%29+%3D+SE3+%5Cleft%28%5Csum_%7Bk+%5Cin+%5Cmathcal%7BN%7D%28%5Cmathbf%7Bv%7D%29%7D+w%28k%2C+%5Cmathbf%7Bv%7D%29+%5Cmathbf%7Bdq%7D_k%5Cright%29+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bdq%7D_k) 是第 
![](https://www.zhihu.com/equation?tex=k) 个节点的对偶四元数，
![](https://www.zhihu.com/equation?tex=SE3%28%5Ccdot%29) 将对偶四元数映射到 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BSE%7D_3) 空间，
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BN%7D_%7B%5Cmathbf%7Bv%7D%7D) 是节点 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 的 KNN 节点集合，
![](https://www.zhihu.com/equation?tex=w%28k%2C+%5Cmathbf%7Bv%7D%29) 是混合权重:

![](https://www.zhihu.com/equation?tex=w%28k%2C+%5Cmathbf%7Bv%7D%29+%3D+%5Cexp%5Cleft%28-%5Cfrac%7B%5C%7C%5Cmathbf%7Bv%7D+-+%5Cmathbf%7Bx%7D_k+%5C%7C_2%5E2%7D%7B2+r%5E2%7D%5Cright%29+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx%7D_k) 是第 
![](https://www.zhihu.com/equation?tex=k) 个节点的位置，
![](https://www.zhihu.com/equation?tex=r) 是有效半径。

**Smooth Term**
光滑项定义在节点图的所有边上，用来保证局部变形尽可能刚性，其定义如下：

![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Bsmooth%7D%7D%3D%5Csum_%7Bi%7D+%5Csum_%7Bj+%5Cin+%5Cmathcal%7BN%7D%28i%29%7D%5Cleft%5C%7C%5Cmathbf%7BT%7D_%7Bi%7D+%5Cmathbf%7Bx%7D_%7Bj%7D-%5Cmathbf%7BT%7D_%7Bj%7D+%5Cmathbf%7Bx%7D_%7Bj%7D%5Cright%5C%7C_%7B2%7D%5E%7B2%7D+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BT%7D_i) 和  
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BT%7D_j) 分别是第 
![](https://www.zhihu.com/equation?tex=i) 和 
![](https://www.zhihu.com/equation?tex=j) 个节点的变换矩阵，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx%7D_i) 和 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bx_j%7D) 是对应的节点位置。

**Non-rigid Volumetric Deformation**
通过 RGBD-PIFu 预测的初始内层模型可能并不足够准确，从而会影响整个追踪效果。作者参考 DoubleFusion[3] 中的方法，通过非刚性的体变形算法将内层模型拟合到融合的网格 ( TSDF 的零等值面) 来持续地矫正内层模型。

给定更新后的 TSDF 体，非刚性体变形的能量函数如下：

![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Bvol%7D%7D+%3D+E_%7B%5Cmathrm%7Btsdf%7D%7D+%2B+%5Clambda_%7B%5Cmathrm%7Bsmooth%7D%7D+E_%7B%5Cmathrm%7Bsmooth%7D%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Bsmooth%7D%7D) 是与前面定义类似的 ARAP 能量项， 
![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Btsdf%7D%7D) 衡量了内层模型与 TSDF 零等值面的对齐程度：

![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Btsdf%7D%7D%3D%5Csum_%7B%5Cmathbf%7Bv%7D+%5Cin+%5Cmathbf%7BT%7D%7D%7C%5Coperatorname%7BTSDF%7D%28%5Chat%7B%5Cmathbf%7Bv%7D%7D%29%7C%5E%7B2%7D+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BT%7D) 是初始的内层模型，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 是 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BT%7D) 上的一个顶点，
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cmathbf%7Bv%7D%7D) 是通过 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 的 KNN 顶点变形后的顶点位置，
![](https://www.zhihu.com/equation?tex=%5Coperatorname%7BTSDF%7D%28%5Ccdot%29) 是一个三线性采样函数，返回给定位置上插值的 TSDF 值。通过优化上述目标函数，可以使得内层模型完美贴合融合的网格。然后下一帧将矫正的内层模型变形到当前帧来寻找对应用于追踪，由于非刚性体变形，对应建立会更加准确，追踪效果更好。

![](https://picx.zhimg.com/v2-6fae7c812c2309204089213e59a57c2f_r.jpg)Non-rigid Volumetric Deformation
**Partial Scan Fusion**
为了确保后面的 BA 只在少数部分扫描之间进行，作者将整个序列分为5段，覆盖人体前后、左右侧面的视角。由于累积误差，第一个和最后一个部分扫描结果可能不是非常对齐，无法形成一个闭环，因此作者提出了一个轻量级的 BA 算法来解决这个问题。

**Lightweight Bundle Adjustment**
为了使得所有的部分扫描能够形成一个封闭完整的模型，且能够通过变形场非刚性地拟合到每帧深度图，作者提出了一个高效的算法来联合优化 BA 变形 (用于闭环重建) 和变形场 (用于深度图拟合)，如下图所示。

![](https://pic3.zhimg.com/v2-5829d3fd877c10e528337bb693f2dd04_r.jpg)Bundle Adjustment作者首先对每个部分扫描构建了一个变形节点图用于参数化 BA 变形，然后通过优化节点图的参数使得所有部分扫描能够形成一个闭环重建。除此之外，同时优化变形场使得所有部分扫描能够同时变形到每帧深度图，每个部分扫描有着自己的BA变形，同时所有的部分扫描共享同一个到深度图的变形场。为了确保算法的高效性，作者根据变形后的部分扫描和对应深度图之间的几何不对齐误差选择深度图关键帧 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bdepth%7D%7D)，根据渲染的人体轮廓和输入论文之间的轮廓误差选择轮廓图关键帧 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bsil%7D%7D)。

**Formulation**
整个优化目标函数如下所示：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Barray%7D%7Bl%7DE%5Cleft%28%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D%2C+%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D%5Cright%29%3D%5Clambda_%7B%5Cmathrm%7Bloop%7D%7D+E_%7B%5Cmathrm%7Bloop%7D%7D%2B%5Clambda_%7B%5Cmathrm%7Bdepth%7D%7D+E_%7B%5Cmathrm%7Bdepth%7D%7D%2B%5Clambda_%7B%5Cmathrm%7Bsilhouette%7D%7D+E_%7B%5Cmathrm%7Bsillouette%7D%7D%2B%5Clambda_%7B%5Cmathrm%7Bsmooth+%7D%7D+E_%7B%5Cmathrm%7Bsmooth%7D%7D%5Cend%7Barray%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D) 是第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描对应的 BA 变形，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D) 是从参考帧到第 
![](https://www.zhihu.com/equation?tex=i)个关键帧的变形场。
![](https://www.zhihu.com/equation?tex=E_%5Cmathrm%7Bloop%7D)、
![](https://www.zhihu.com/equation?tex=E_%5Cmathrm%7Bdepth%7D)、
![](https://www.zhihu.com/equation?tex=E_%5Cmathrm%7Bsilhouette%7D) 和 
![](https://www.zhihu.com/equation?tex=E_%5Cmathrm%7Bsmooth%7D) 分别是闭环重建、深度拟合、轮廓对齐和光滑能量项。

在每一次迭代过程中，**交替优化** 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D)，即固定一个优化另一个，交替迭代进行。

**Loop Term**
闭环重建能量项衡量所有部分扫描之间的对齐程度：

![](https://www.zhihu.com/equation?tex=E_%7B%5Cmathrm%7Bloop%7D%7D%3D%5Csum_%7Bi%2C+j%3D1+%5Catop+i+%5Cneq+j%7D%5E%7BN%7D+%5Csum_%7B%5Cleft%28%5Cmathbf%7Bv%7D_%7Bp%7D%2C+%5Cmathbf%7Bv%7D_%7Bq%7D%5Cright%29+%5Cin+%5Cmathcal%7BC%7D_%7Bi%2C+j%7D%7D%5Cleft%7C%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bi%7D%5Cleft%28%5Cmathbf%7Bn%7D_%7Bp%7D%5Cright%29%5E%7B%5Ctop%7D%5Cleft%28%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bi%7D%5Cleft%28%5Cmathbf%7Bv%7D_%7Bp%7D%5Cright%29-%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D%5Cleft%28%5Cmathbf%7Bv%7D_%7Bq%7D%5Cright%29%5Cright%29%5Cright%7C%5E%7B2%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=N) 是部分扫描的数量，
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BC%7D_%7Bi%2Cj%7D) 是通过最近点查找确定的第 
![](https://www.zhihu.com/equation?tex=i) 和第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描之间的对应点集合，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D_%7Bp%7D%2C+%5Cmathbf%7Bv%7D_%7Bq%7D) 是其中的一对对应点，其分别是第 
![](https://www.zhihu.com/equation?tex=i) 和第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描上的一个顶点，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bn%7D_%7Bp%7D) 是顶点 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D_%7Bp%7D) 的法向，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bi%7D%28%5Cmathbf%7Bv%7D_%7Bp%7D%29) 和 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bi%7D%28%5Cmathbf%7Bn%7D_%7Bp%7D%29) 是通过 BA 变形后的顶点位置和法向。**该能量项促使所有部分扫描能够拟合在一起**。

**Live Depth Term**
深度拟合能量项确保部分扫描能够和 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bdepth%7D%7D) 中的所有深度图对齐：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+E_%7B%5Ctext+%7Bdepth+%7D%7D%3D%26+%5Csum_%7Bi%3D1%7D%5E%7BK%7D+%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Csum_%7B%28%5Cmathbf%7Bv%7D%2C+%5Cmathbf%7Bu%7D%29+%5Cin+%5Cmathcal%7BD%7D_%7Bj%2C+i%7D%7D+%5Cleft%7C%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D%5Cleft%28%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D%28%5Cmathbf%7Bn%7D%29%5Cright%29%5E%7B%5Ctop%7D%5Cleft%28%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D%5Cleft%28%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D%28%5Cmathbf%7Bv%7D%29%5Cright%29-%5Cmathbf%7Bu%7D%5Cright%29%5Cright%7C%5E%7B2%7D+%5Cend%7Baligned%7D+%5C%5C)

其中 
![](https://www.zhihu.com/equation?tex=K+%3D+%7C%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bdepth%7D%7D%7C) 是关键帧的数量，
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BD%7D_%7Bi%2Cj%7D) 是第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描和第 
![](https://www.zhihu.com/equation?tex=i) 个关键帧深度图之间的对应点集合，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D%2C+%5Cmathbf%7Bu%7D) 是其中的一对对应点，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D) 是第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描上的一个顶点，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bu%7D) 是第 
![](https://www.zhihu.com/equation?tex=i) 个深度图上对应的最近点。
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_l%5Ei%28%5Ccdot%29) 将顶点位置或法向从参考坐标变换到第 
![](https://www.zhihu.com/equation?tex=i) 个关键帧。**该能量项确保所有部分扫描能够和 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bdepth%7D%7D) 中的深度点云对齐**。

**Live Silhouette Term**
轮廓对齐能量项衡量部分扫描变形后渲染得到的人体轮廓与输入的人体Mask轮廓之间的对齐程度，和 LiveCap 和 DeepCap 中的方法类似，基于距离变换 (distance transform) 表示：

![](https://www.zhihu.com/equation?tex=E_%7B%5Ctext+%7Bsilhouette+%7D%7D%3D%5Csum_%7Bi%3D1%7D%5E%7BK%7D+%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Csum_%7B%5Cmathbf%7Bv%7D_%7Bj%7D+%5Cin+%5Cmathcal%7BB%7D_%7Bi%7D%7D+d_%7Bj%7D+%5Ccdot%5Cleft%7CI_%7B%5Cmathrm%7BDT%7D%7D%5E%7Bi%7D%5Cleft%28%5Cpi%5Cleft%28%5Cmathbf%7BW%7D_%7Bl%7D%5E%7Bi%7D%5Cleft%28%5Cmathbf%7BW%7D_%7Bb%7D%5E%7Bj%7D%5Cleft%28%5Cmathbf%7Bv%7D_%7Bj%7D%5Cright%29%5Cright%29%5Cright%29%5Cright%29%5Cright%7C%5E%7B2%7D+%5C%5C)

这里 
![](https://www.zhihu.com/equation?tex=K+%3D+%7C%5Cmathcal%7BK%7D_%7B%5Cmathrm%7Bsil%7D%7D%7C) 是关键帧的数量，
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7Bv%7D_j) 是第 
![](https://www.zhihu.com/equation?tex=j) 个部分扫描的轮廓顶点，
![](https://www.zhihu.com/equation?tex=d_j+%5Cin+%5C%7B-1%2C+1%5C%7D) 促使在距离场中沿着正确的方向运动，
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmathrm%7BDT%7D%7D%5Ei) 是输入图像Mask的距离变换图像，
![](https://www.zhihu.com/equation?tex=%5Cpi%28%5Ccdot%29) 是投影函数。**该能量项促使部分扫描的形状能够拟合输入的人体轮廓**。

![](https://pic3.zhimg.com/v2-e71f0e8b7a60be4cab615daa93c218c6_r.jpg)Silhouette Term光滑能量项即前面介绍的 ARAP 能量项。整个能量函数通过高斯牛顿法求解，每次迭代构建一个大型稀疏线性方程组，通过高效的预分解共轭梯度 (Preconditioned Conjugate Gradient, PCG) 求解器计算更新值。

![](https://pic2.zhimg.com/v2-f75ab90928752bdf41047140bb4d663f_r.jpg)Bundle Adjustment Result
**Non-rigid Multi-texturing**
在 BA 之后，再将所有的部分扫描融合在一起，通过泊松重建得到封闭的网格。最后再针对每帧彩色图，将每个可见点投影到图像空间，并根据顶点法向将每个可见视角的颜色进行融合得到该顶点最后的颜色值。

**Results**

**Performance**
整个算法在 NVIDIA Geforce RTX 2080Ti GPU 上实现，初始化阶段 (包括 RGBD-PIFu 生成初始内部模型和 PIFusion 的初始化) 最多需要 10s，PIFusion 以 30ms 每帧的速度实时运行，对于每一帧，追踪、非刚性体变形和融合分别消耗20ms、3ms 和 6ms。BA 消耗 15s，计算纹理颜色需要 1s。

**Results**
下图展示了文章的部分重建结果。

![](https://pic4.zhimg.com/v2-9e8537d5a73d549ebe9c6cc6e092d213_r.jpg)3D Portrait Results下面左图展示了文章方法 PIFusion 与 DynamicFusion 和 DoubleFusion 的结果比较，文章方法能够得到更加准确的重建闭环，尤其是特别宽松的衣服情况下。右图展示了与当前 state-of-the-art 的非刚性 BA 算法的结果比较，文章方法能够得到更加准确、具有更多细节的重建结果。

![](https://pic3.zhimg.com/v2-9502b413361dd6f82d740cfc418f9a1c_r.jpg)Comparisons
**参考**

- Robust 3D Self-portraits in Seconds. Zhe Li, Tao Yu, Chuanyu Pan, Zerong Zheng, Yebin Liu. CVPR(Oral), 2020.
- PIFu: Pixel-Aligned Implicit Function for High-Resolution Clothed Human Digitization. Shunsuke Saito, Zeng Huang, Ryota Natsume, Shigeo Morishima, Angjoo Kanazawa, Hao Li. ICCV, 2019.
- DoubleFusion: Real-time Capture of Human Performances with Inner Body Shapes from a Single Depth Sensor. Tao Yu, Zerong Zheng, Kaiwen Guo, Jianhui Zhao, Qionghai Dai, Hao Li, Gerard Pons-Moll, Yebin Liu. CVPR(Oral), 2018.欢迎关注公众号“**人脸人体重建**”，和您分享值得关注的人脸人体相关技术最新文章。

![](https://picx.zhimg.com/v2-b609ccefac4d440aecb9768cb5761c1f_r.jpg)