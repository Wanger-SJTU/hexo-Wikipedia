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


<strong>Robust 3D Self-portraits in Seconds</strong>

 快速、准确、鲁棒、高效的3D人体重建一直是一个研究热点，在游戏、 VR/AR、虚拟试衣等众多领域都有着重要的应用。

![](https://picx.zhimg.com/v2-31eef81c53ee85bf4aa2dcd48eaba4bb_r.jpg)本文已经被 CVPR 2020 接收为 Oral 文章，作者来自清华大学的刘烨斌老师团队，`BodyFusion`、`DoubleFusion`、`UnstructuredFusion`、`HybridFusion`、`DeepHuman` 等一系列人体重建、捕捉方面的优秀工作都出自该团队。

<strong>项目主页</strong>：[http://www.liuyebin.com/portrait/portrait.html](https://link.zhihu.com/?target=http%3A//www.liuyebin.com/portrait/portrait.html)

作者将深度学习和传统的优化方法相结合，提出了一种基于 RGBD 相机的3D人体快速重建方法，只需要在相机前面自转一圈，数秒时间便可以重建出穿着衣服的 3D 人体模型，且模型表面有丰富的几何细节。下面是文章方法的Demo视频。

[
![](https://pic3.zhimg.com/v2-a47d60bcb733c97e51a89b3c5023b60e.jpg)Demohttps://www.zhihu.com/video/1232321009056751616](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/1232321009056751616)

3D自画像 (人体重建) 方法可以被分为三类：

- <strong>基于学习的方法</strong> (learning-based methods)：主要从单张 RGB 图片恢复人体的三维模型，但由于遮挡和深度歧义，重建精度较低；
- <strong>基于融合的方法</strong> (fusion-based methods)：通过递增的方式重建几何，但不可避免地存在累计误差，尤其是非刚性的情况下，导致重建闭环问题；
- <strong>基于光束法平差的方法</strong> (bundle-adjustment-based methods)：该类方法采用光束法平差算法来改善渐进式融合的累积误差问题。首先将输入序列分割为一些块，在每个块之间进行融合得到光滑的部分扫描结果，最后基于显式的回环对应和光束对应将所有的部分扫描数据同时非刚性地注册在一起得到最终模型。虽然结果不错，但该方法需要多个 RGBD 相机或者电子转盘，效率较低。文章方法将以上三种方法组合在一起，汲取各自的优点和长处，提出了一种高效、鲁棒的基于RGBD相机的人体重建方法。

<strong>Overview</strong>
给定一段捕捉了人体自然旋转一圈的 RGBD 视频序列，文章通过下面三个步骤来进行重建：

- <strong>RGBD-PIFu</strong>：通过神经网络从第一帧 RGBD 图片预测一个大致准确的人体模型；
- <strong>PIFusion</strong>：对于每一帧，首先使用前面估计的人体模型作为内层，进行基于双层表达的非刚性追踪，然后使用传统的非刚性融合方法将深度数据融合到参考帧中。再使用非刚性体变形进一步优化内层模型，以提高追踪和融合的精度。最后将整个序列分为几个小块并在每个块中分别进行融合，得到部分扫描结果。
- <strong>Lightweight bundle adjustment</strong>：使用 BA 算法对部分扫描网格进行回环优化，在每次迭代中，选择合适的关键帧来构建深度对齐和轮廓对齐能量项，然后通过联合优化，使得所有部分扫描能够组合在一起形成闭环，还能将其变形对齐到每一个关键帧深度图。
![](https://pica.zhimg.com/v2-601c8169ffc83715e0b20e4bf2ef9f5e_r.jpg)System Pipeline
<strong>RGBD-PIFu</strong>
作者将像素对齐的隐式函数 (Pixel-aligned Implicit Functions, PIFu)[2] 进行推广，提出 RGBD-PIFu 来从单张 RGBD 图片重建 3D 人体模型。PIFu[2] 是 ICCV 2019 的一篇文章，其通过水平集函数 
$f$ 来隐式地定义三维曲面：
$f(X) = 0, X \in \mathbb{R}^3$，并利用该表达从单张彩色图重建3D人体。而 RGBD-PIFu 将该隐式函数表达为一个复合函数 
$f$，其由 <strong>全卷积 RGBD图片编码器</strong> 
$g$ 和 <strong>基于多层感知机表达的隐式函数</strong> 
$h$ 组成：

$$f(X ; I)=h\left(G(x ; I), X_{z}\right), X \in \mathbb{R}^{3} \\$$


这里 
$I$ 是输入的 RGBD 图片，
$x = \pi(X)$ 是3D点 
$X$ 的2D投影，
$G(x;I)$ 是编码的特征图 
$g(I)$ 上的 
$x$ 点处的特征向量，
$X_z$ 是3D点 
$X$ 的深度值。与 PIFu 不同，这里的编码器编码了深度图的信息，使得重建的模型与输入深度图一致，能够解决深度歧义问题并提高重建结果的准确性。训练的损失函数使用均方误差：

$$\mathcal{L}=\frac{1}{n} \sum_{i=1}^{n}\left|f\left(X_{i} ; I\right)-f^{*}\left(X_{i}\right)\right|^{2} \\$$


![](https://picx.zhimg.com/v2-1a03dc077d451382316b42667f12124b_r.jpg)RGBD-PIFu
<strong>PIFusion</strong>

<strong>Initialization</strong>
首先将第一帧深度图直接投影来初始化截断符号距离函数 (Truncated Signed Distance Function, TSDF) 体并将 RGBD-PIFu 得到的内层模型拟合到 TSDF 体中，然后基于测地距离 (geodesic distance) 在内层模型上均匀采用得到变形节点图，以对融合的外层表面和内层模型的非刚性形变进行参数化。

<strong>Double-layer Non-rigid Tracking</strong>
给定第 
$t-1$ 帧的内层模型和融合表面 (即双层表达)，基于双层表达的非刚性追踪需要将双层表面进行变形以追踪第 
$t$ 帧的深度图，内层模型主要用于辅助非刚性追踪。总的优化目标函数如下：

$$E_{\text{tracking}} = \lambda_{\text{outer}} E_{\text{outer}}+\lambda_{\text{inner}} E_{\text{inner}}+\lambda_{\text{smooth}} E_{\text{smooth}} \\$$


这里 
$E_{\text{outer}}$ 和 
$E_{\text{inner}}$ 分别是两种对应的能量，即融合表面(外层)与深度图之间的对应，内层模型(内层)与深度图之间的对应。
$E_{\text{smooth}}$ 是促使局部变形尽可能刚性 (as-rigid-as-possible, ARAP) 的正则项。
$\lambda_{\text{outer}}$、
$\lambda_{\text{inner}}$ 和 
$\lambda_{\text{smooth}}$ 分别是三种能量对应的权重。

整个目标函数通过迭代最近点 (Iterative Closest Point, ICP) 算法求解，通过高斯牛顿法求解优化问题，优化过程中，随着 ICP 迭代次数的增加，权重 
$\lambda_{\mathrm{inner}}$ 逐渐减小以使得外层表面拟合更加准确。追踪完成后，再使用传统的融合方法将深度图融合并更新 TSDF 体。

<strong>Outer and Inner Term</strong>
两个数据项能量衡量了双层表面与深度图之间的对齐程度，其有着相似的数学表达：

$$E_{\text{outer/inner}}=\sum_{(\mathbf{v}, \mathbf{u}) \, \in \,\mathcal{C}_{\text{outer/inner}}}\left|\hat{\mathbf{n}}_{\mathbf{v}}^{\top}(\hat{\mathbf{v}}-\mathbf{u})\right|^{2} \\$$


其中 
$\mathcal{C}_{\text{outer}}$ 和 
$\mathcal{C}_{\text{inner}}$ 分别是两种类型的对应点集合，
$(\mathbf{v}, \mathbf{u})$ 是一对对应点，
$\mathbf{v}$ 是外层或内层表面上的点，
$\mathbf{u}$ 是深度图上离 
$\mathbf{v}$ 最近的点。这里需要注意 
$\mathbf{v}$ 是参考模型上的顶点，
$\hat{\mathbf{v}}$ 和 
$\hat{\mathbf{n}}_{\mathbf{v}}$ 分别是顶点  
$\mathbf{v}$ 的位置和法向通过其 KNN 节点利用对偶四元数混合蒙皮 (Dual Quaternion Blending) 变形到当前帧的的结果

$$\mathbf{T}(\mathbf{v}) = SE3 \left(\sum_{k \in \mathcal{N}(\mathbf{v})} w(k, \mathbf{v}) \mathbf{dq}_k\right) \\$$


这里 
$\mathbf{dq}_k$ 是第 
$k$ 个节点的对偶四元数，
$SE3(\cdot)$ 将对偶四元数映射到 
$\mathbf{SE}_3$ 空间，
$\mathcal{N}_{\mathbf{v}}$ 是节点 
$\mathbf{v}$ 的 KNN 节点集合，
$w(k, \mathbf{v})$ 是混合权重:

$$w(k, \mathbf{v}) = \exp\left(-\frac{\|\mathbf{v} - \mathbf{x}_k \|_2^2}{2 r^2}\right) \\$$


其中 
$\mathbf{x}_k$ 是第 
$k$ 个节点的位置，
$r$ 是有效半径。

<strong>Smooth Term</strong>
光滑项定义在节点图的所有边上，用来保证局部变形尽可能刚性，其定义如下：

$$E_{\mathrm{smooth}}=\sum_{i} \sum_{j \in \mathcal{N}(i)}\left\|\mathbf{T}_{i} \mathbf{x}_{j}-\mathbf{T}_{j} \mathbf{x}_{j}\right\|_{2}^{2} \\$$


这里 
$\mathbf{T}_i$ 和  
$\mathbf{T}_j$ 分别是第 
$i$ 和 
$j$ 个节点的变换矩阵，
$\mathbf{x}_i$ 和 
$\mathbf{x_j}$ 是对应的节点位置。

<strong>Non-rigid Volumetric Deformation</strong>
通过 RGBD-PIFu 预测的初始内层模型可能并不足够准确，从而会影响整个追踪效果。作者参考 DoubleFusion[3] 中的方法，通过非刚性的体变形算法将内层模型拟合到融合的网格 ( TSDF 的零等值面) 来持续地矫正内层模型。

给定更新后的 TSDF 体，非刚性体变形的能量函数如下：

$$E_{\mathrm{vol}} = E_{\mathrm{tsdf}} + \lambda_{\mathrm{smooth}} E_{\mathrm{smooth}} \\$$


其中 
$E_{\mathrm{smooth}}$ 是与前面定义类似的 ARAP 能量项， 
$E_{\mathrm{tsdf}}$ 衡量了内层模型与 TSDF 零等值面的对齐程度：

$$E_{\mathrm{tsdf}}=\sum_{\mathbf{v} \in \mathbf{T}}|\operatorname{TSDF}(\hat{\mathbf{v}})|^{2} \\$$


这里 
$\mathbf{T}$ 是初始的内层模型，
$\mathbf{v}$ 是 
$\mathbf{T}$ 上的一个顶点，
$\hat{\mathbf{v}}$ 是通过 
$\mathbf{v}$ 的 KNN 顶点变形后的顶点位置，
$\operatorname{TSDF}(\cdot)$ 是一个三线性采样函数，返回给定位置上插值的 TSDF 值。通过优化上述目标函数，可以使得内层模型完美贴合融合的网格。然后下一帧将矫正的内层模型变形到当前帧来寻找对应用于追踪，由于非刚性体变形，对应建立会更加准确，追踪效果更好。

![](https://picx.zhimg.com/v2-6fae7c812c2309204089213e59a57c2f_r.jpg)Non-rigid Volumetric Deformation
<strong>Partial Scan Fusion</strong>
为了确保后面的 BA 只在少数部分扫描之间进行，作者将整个序列分为5段，覆盖人体前后、左右侧面的视角。由于累积误差，第一个和最后一个部分扫描结果可能不是非常对齐，无法形成一个闭环，因此作者提出了一个轻量级的 BA 算法来解决这个问题。

<strong>Lightweight Bundle Adjustment</strong>
为了使得所有的部分扫描能够形成一个封闭完整的模型，且能够通过变形场非刚性地拟合到每帧深度图，作者提出了一个高效的算法来联合优化 BA 变形 (用于闭环重建) 和变形场 (用于深度图拟合)，如下图所示。

![](https://pic3.zhimg.com/v2-5829d3fd877c10e528337bb693f2dd04_r.jpg)Bundle Adjustment作者首先对每个部分扫描构建了一个变形节点图用于参数化 BA 变形，然后通过优化节点图的参数使得所有部分扫描能够形成一个闭环重建。除此之外，同时优化变形场使得所有部分扫描能够同时变形到每帧深度图，每个部分扫描有着自己的BA变形，同时所有的部分扫描共享同一个到深度图的变形场。为了确保算法的高效性，作者根据变形后的部分扫描和对应深度图之间的几何不对齐误差选择深度图关键帧 
$\mathcal{K}_{\mathrm{depth}}$，根据渲染的人体轮廓和输入论文之间的轮廓误差选择轮廓图关键帧 
$\mathcal{K}_{\mathrm{sil}}$。

<strong>Formulation</strong>
整个优化目标函数如下所示：

$$\begin{array}{l}E\left(\mathbf{W}_{b}^{j}, \mathbf{W}_{l}^{i}\right)=\lambda_{\mathrm{loop}} E_{\mathrm{loop}}+\lambda_{\mathrm{depth}} E_{\mathrm{depth}}+\lambda_{\mathrm{silhouette}} E_{\mathrm{sillouette}}+\lambda_{\mathrm{smooth }} E_{\mathrm{smooth}}\end{array} \\$$


其中 
$\mathbf{W}_{b}^{j}$ 是第 
$j$ 个部分扫描对应的 BA 变形，
$\mathbf{W}_{l}^{i}$ 是从参考帧到第 
$i$个关键帧的变形场。
$E_\mathrm{loop}$、
$E_\mathrm{depth}$、
$E_\mathrm{silhouette}$ 和 
$E_\mathrm{smooth}$ 分别是闭环重建、深度拟合、轮廓对齐和光滑能量项。

在每一次迭代过程中，<strong>交替优化</strong> 
$\mathbf{W}_{b}^{j}$ 和 
$\mathbf{W}_{l}^{i}$，即固定一个优化另一个，交替迭代进行。

<strong>Loop Term</strong>
闭环重建能量项衡量所有部分扫描之间的对齐程度：

$$E_{\mathrm{loop}}=\sum_{i, j=1 \atop i \neq j}^{N} \sum_{\left(\mathbf{v}_{p}, \mathbf{v}_{q}\right) \in \mathcal{C}_{i, j}}\left|\mathbf{W}_{b}^{i}\left(\mathbf{n}_{p}\right)^{\top}\left(\mathbf{W}_{b}^{i}\left(\mathbf{v}_{p}\right)-\mathbf{W}_{b}^{j}\left(\mathbf{v}_{q}\right)\right)\right|^{2} \\$$


其中 
$N$ 是部分扫描的数量，
$\mathcal{C}_{i,j}$ 是通过最近点查找确定的第 
$i$ 和第 
$j$ 个部分扫描之间的对应点集合，
$\mathbf{v}_{p}, \mathbf{v}_{q}$ 是其中的一对对应点，其分别是第 
$i$ 和第 
$j$ 个部分扫描上的一个顶点，
$\mathbf{n}_{p}$ 是顶点 
$\mathbf{v}_{p}$ 的法向，
$\mathbf{W}_{b}^{i}(\mathbf{v}_{p})$ 和 
$\mathbf{W}_{b}^{i}(\mathbf{n}_{p})$ 是通过 BA 变形后的顶点位置和法向。<strong>该能量项促使所有部分扫描能够拟合在一起</strong>。

<strong>Live Depth Term</strong>
深度拟合能量项确保部分扫描能够和 
$\mathcal{K}_{\mathrm{depth}}$ 中的所有深度图对齐：

$$\begin{aligned} E_{\text {depth }}=& \sum_{i=1}^{K} \sum_{j=1}^{N} \sum_{(\mathbf{v}, \mathbf{u}) \in \mathcal{D}_{j, i}} \left|\mathbf{W}_{l}^{i}\left(\mathbf{W}_{b}^{j}(\mathbf{n})\right)^{\top}\left(\mathbf{W}_{l}^{i}\left(\mathbf{W}_{b}^{j}(\mathbf{v})\right)-\mathbf{u}\right)\right|^{2} \end{aligned} \\$$


其中 
$K = |\mathcal{K}_{\mathrm{depth}}|$ 是关键帧的数量，
$\mathcal{D}_{i,j}$ 是第 
$j$ 个部分扫描和第 
$i$ 个关键帧深度图之间的对应点集合，
$\mathbf{v}, \mathbf{u}$ 是其中的一对对应点，
$\mathbf{v}$ 是第 
$j$ 个部分扫描上的一个顶点，
$\mathbf{u}$ 是第 
$i$ 个深度图上对应的最近点。
$\mathbf{W}_l^i(\cdot)$ 将顶点位置或法向从参考坐标变换到第 
$i$ 个关键帧。**该能量项确保所有部分扫描能够和 
$\mathcal{K}_{\mathrm{depth}}$ 中的深度点云对齐**。

<strong>Live Silhouette Term</strong>
轮廓对齐能量项衡量部分扫描变形后渲染得到的人体轮廓与输入的人体Mask轮廓之间的对齐程度，和 LiveCap 和 DeepCap 中的方法类似，基于距离变换 (distance transform) 表示：

$$E_{\text {silhouette }}=\sum_{i=1}^{K} \sum_{j=1}^{N} \sum_{\mathbf{v}_{j} \in \mathcal{B}_{i}} d_{j} \cdot\left|I_{\mathrm{DT}}^{i}\left(\pi\left(\mathbf{W}_{l}^{i}\left(\mathbf{W}_{b}^{j}\left(\mathbf{v}_{j}\right)\right)\right)\right)\right|^{2} \\$$


这里 
$K = |\mathcal{K}_{\mathrm{sil}}|$ 是关键帧的数量，
$\mathbf{v}_j$ 是第 
$j$ 个部分扫描的轮廓顶点，
$d_j \in \{-1, 1\}$ 促使在距离场中沿着正确的方向运动，
$I_{\mathrm{DT}}^i$ 是输入图像Mask的距离变换图像，
$\pi(\cdot)$ 是投影函数。<strong>该能量项促使部分扫描的形状能够拟合输入的人体轮廓</strong>。

![](https://pic3.zhimg.com/v2-e71f0e8b7a60be4cab615daa93c218c6_r.jpg)Silhouette Term光滑能量项即前面介绍的 ARAP 能量项。整个能量函数通过高斯牛顿法求解，每次迭代构建一个大型稀疏线性方程组，通过高效的预分解共轭梯度 (Preconditioned Conjugate Gradient, PCG) 求解器计算更新值。

![](https://pic2.zhimg.com/v2-f75ab90928752bdf41047140bb4d663f_r.jpg)Bundle Adjustment Result
<strong>Non-rigid Multi-texturing</strong>
在 BA 之后，再将所有的部分扫描融合在一起，通过泊松重建得到封闭的网格。最后再针对每帧彩色图，将每个可见点投影到图像空间，并根据顶点法向将每个可见视角的颜色进行融合得到该顶点最后的颜色值。

<strong>Results</strong>

<strong>Performance</strong>
整个算法在 NVIDIA Geforce RTX 2080Ti GPU 上实现，初始化阶段 (包括 RGBD-PIFu 生成初始内部模型和 PIFusion 的初始化) 最多需要 10s，PIFusion 以 30ms 每帧的速度实时运行，对于每一帧，追踪、非刚性体变形和融合分别消耗20ms、3ms 和 6ms。BA 消耗 15s，计算纹理颜色需要 1s。

<strong>Results</strong>
下图展示了文章的部分重建结果。

![](https://pic4.zhimg.com/v2-9e8537d5a73d549ebe9c6cc6e092d213_r.jpg)3D Portrait Results下面左图展示了文章方法 PIFusion 与 DynamicFusion 和 DoubleFusion 的结果比较，文章方法能够得到更加准确的重建闭环，尤其是特别宽松的衣服情况下。右图展示了与当前 state-of-the-art 的非刚性 BA 算法的结果比较，文章方法能够得到更加准确、具有更多细节的重建结果。

![](https://pic3.zhimg.com/v2-9502b413361dd6f82d740cfc418f9a1c_r.jpg)Comparisons
<strong>参考</strong>

- Robust 3D Self-portraits in Seconds. Zhe Li, Tao Yu, Chuanyu Pan, Zerong Zheng, Yebin Liu. CVPR(Oral), 2020.
- PIFu: Pixel-Aligned Implicit Function for High-Resolution Clothed Human Digitization. Shunsuke Saito, Zeng Huang, Ryota Natsume, Shigeo Morishima, Angjoo Kanazawa, Hao Li. ICCV, 2019.
- DoubleFusion: Real-time Capture of Human Performances with Inner Body Shapes from a Single Depth Sensor. Tao Yu, Zerong Zheng, Kaiwen Guo, Jianhui Zhao, Qionghai Dai, Hao Li, Gerard Pons-Moll, Yebin Liu. CVPR(Oral), 2018.欢迎关注公众号“<strong>人脸人体重建</strong>”，和您分享值得关注的人脸人体相关技术最新文章。

![](https://picx.zhimg.com/v2-b609ccefac4d440aecb9768cb5761c1f_r.jpg)