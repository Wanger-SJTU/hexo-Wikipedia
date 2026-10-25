---
title: GM以色列研究中心最新发表的3-D车道线检测论文
date: "2020-04-20 00:00:00"
updated: "2020-04-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/GM以色列研究中心最新发表的3-D车道线检测论文/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/133623737
---


2020年3月11日GM以色列研发中心在arXiv上传论文“Semi-Local 3D Lane Detection and Uncertainty Estimation”。

![](https://pica.zhimg.com/v2-8813283703b9842a9ce53ded9931c384_r.jpg)<strong>摘要</strong>：本文提出了一种基于相机的新型DNN方法，用于带不确定性估计的3D车道线检测。该方法基于半局部BEV（鸟瞰视角）的网格表示形式，其将车道线分解为简单车道线段。该方法结合了线段学习的参数化模型和聚类线段成为全车道线的深度特征嵌入。这种结合可以将该方法推广到复杂的车道拓扑结构、曲率和曲面几何。此外，该方法是第一个为车道线检测任务提供基于学习估计不确定性的方法。

如图是有不确定性估计网络的基于摄像机3-D车道线检测示意图。该方法适用于“鸟瞰视角（Bird Eye View）”透视图，该视图被栅格化为粗网格。 输出所有网格的参数化3-D曲线表示，然后处理形成整个3-D车道曲线以及检测的不确定性估计。

![](https://pic3.zhimg.com/v2-85924942d6306f70b0d3885484c4e182_r.jpg)假设通过每个网格的车道线段很简单，用低维参数模型表示。 具体而言，每个网格均包含一条线段，该线段的参数包括距网格中心偏移、方向和距鸟瞰视角平面的高度偏移。这种半局部网格表示位于从全局表示（整个通道）到局部表示（像素级别）之间的连续变化。这种基于分段的解决方案，每个网格输出比单个像素更具信息性，它可以推理局部车道线结构，只是不像全局解决方案那样受限，因为全局解决方案必须获取整个车道的拓扑、曲率和表面几何的复杂性。

该表示将车道曲线细分为多个车道线段，但未明确获取它们之间的任何关系。 相邻的网格将具有重叠的感受野并产生相关结果，但是没有捕获多个网格表示的是同一车道的事实。 为了生成完整的车道曲线，文中学习了每个网格的嵌入，其沿着车道满足全局一致性。 这样，可以将小车道线段聚类成一个完整的曲线。

此外，通过网络输出建模为高斯分布并估计其均值和方差值，可以实现不确定性估计。 对每个车道线段参数操作，将其组合在一起，对每个车道线的点生成最终的协方差矩阵。 与沿着网格进行局部学习的线段参数不同，这种方法训练不确定性所需的经验误差，取决于组成整个车道的所有网格并全局进行推理。

如图是网络结构图。该网络由两个处理流水线组成：图像视图和鸟瞰（BEV）视图。 图像视图编码器由ResNet块组成。 BEV主干由投影图像视图的特征图组成，并与来自前一个块的卷积投影特征图拼接。 最终BEV特征图是生成局部车道线段的车道线预测头输入、将这些线段聚类到整个车道的全局嵌入、以及依赖于局部网格和整个车道曲线的车道点位置不确定性。

![](https://pic2.zhimg.com/v2-22ccd04a0049a1c6b7460e53ffab982d_r.jpg)网络的输入是单目图像。 该方法采用了该团队以前提出的双途径主干方法【1】。 上一个工作【1】使用编码器和反透视映射（IPM）模块将特征图投影到鸟瞰图（BEV）。 如图所示。

![](https://picx.zhimg.com/v2-4d7501c8b762ffb7a4c68cc37b73819b_r.jpg)投影应用相机俯仰角ϕ和高度h定义的单应变换（homography），将图像平面映射到道路平面，如图所示。 最终BEV特征图在空间上分为由W×H个非重叠网格组成的网格G。 与以前方法【1】相似，投影可确保BEV特征图中的每个像素对应于预定义的道路位置，与摄像机的内参数和外部姿态无关。

假设通过每个网格的车道线可以拟合为一个线段。具体地说，网络针对每个网格回归三个参数：相对于网格中心的横向偏移距离，直线角度和高度偏移。 除了这些参数之外，网络还预测二值分类分数，该分数指示车道与特定网格相交的概率。 将网格相交的车道线投影到道路平面后，用GT车道线点把网格相交的车道线段近似为直线，可计算出偏移量和角度，即GT回归的目标。

![](https://picx.zhimg.com/v2-00bbdeea1586789e1648481468f36b99_r.jpg)以下是预测模型训练的损失函数：

![](https://pica.zhimg.com/v2-dd047ff539d52a46633af02966c84fee_r.jpg)其中

![](https://picx.zhimg.com/v2-0ff1bd0015bedd256e4cb27583e0e519_r.jpg)
![](https://pic4.zhimg.com/v2-60bc29b616e1604e8998dfea72a24ec7_r.jpg)
![](https://pic2.zhimg.com/v2-aef88e63feb72a7694643aca02ebade1_r.jpg)以下是车道线聚类的全局嵌入所采用的鉴别损失（discriminative push-pull loss）：

![](https://picx.zhimg.com/v2-27c39c88002570b0aaf62dd7386bc657_r.jpg)其中

![](https://pic3.zhimg.com/v2-eac97ebc6bb725547cb687cabfcdd3c0_r.jpg)
![](https://pica.zhimg.com/v2-d253b87ef58621ff44c0e4f9ff7d254a_r.jpg)最后，要将BEV平面的车道线点转换到摄像头坐标系：

![](https://pic4.zhimg.com/v2-4c95b67627b9912a2aaec5823dd3a1f7_r.jpg)这是一些实验结果：GT（红色）、【1】方法（青色）和本文方法（蓝色）的比较。

![](https://pic4.zhimg.com/v2-600381c5273d062bd9b6e8ad7cb4fd55_r.jpg)
![](https://pica.zhimg.com/v2-00c8c06851ed1870c02313b571f1fa26_r.jpg)注明：同时，大家也可以参考百度阿波罗发表的3D车道线检测文章【2】。

<strong>参考文献</strong>

- Garnett, N., Cohen, R., Pe’er, T., Lahav, R., Levi, D. ”3D-lanenet: end-to-end 3d multiple lane detection“，ICCV 2019.
- Y Guo et al., "Gen-LaneNet: A Generalized and Scalable Approach for 3D Lane Detection", arXiv 2003.10656, March 24, 2020.