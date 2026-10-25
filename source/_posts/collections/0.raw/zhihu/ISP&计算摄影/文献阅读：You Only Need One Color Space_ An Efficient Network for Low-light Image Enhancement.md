---
title: "文献阅读：You Only Need One Color Space: An Efficient Network for Low-light Image Enhancement"
date: "2024-05-27 00:00:00"
updated: "2024-05-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/ISP-计算摄影/文献阅读-You-Only-Need-One-Color-Space_-An-Efficient-Network-for-Low-light-Image-Enhancement-22b276/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/699934490
---


文献阅读：You Only Need One Color Space: An Efficient Network for  Low-light Image Enhancement

mniCJ

37 人赞同了该文章

作者：Yixu Feng, Cheng Zhang, Pei Wang, Peng Wu, Qingsen Yan, Yanning Zhang

单位：西北工业大学

期刊：Neuro Computing

DOI：

You Only Need One Color Space: An Efficient Network for Low-light Image Enhancementarxiv.org/abs/2402.05809

一、研究动机

1.研究目标
         为解决低光照图像增强（LLIE）任务在增强低光照图像时易产生颜色偏移和亮度伪影的问题，本文提出了一种新型的可训练颜色空间HVI（Horizontal/Vertical-Intensity），并设计了一种新的网络架构CIDNet，通过分离亮度和颜色提升增强效果。

LLIE任务中不同颜色空间的敏感性比较。sRGB和HSV空间的增强结果有明显的色彩失真。
2.过去方法
过去的低光照图像增强方法主要分为两类：

①传统方法

- 基于直方图均衡化和伽马校正。
- 使用Retinex理论，将图像分解为照明和反射成分。
- 这些方法通常无法有效消除噪声伪影和产生准确的色彩映射。②深度学习方法

- 使用深度神经网络（DNN）在sRGB颜色空间中学习低光照和正常光照图像之间的映射关系。
- RetinexNet、RUAS和SNR-Aware等方法取得了一定的效果，但在sRGB颜色空间中处理亮度和颜色会引入不稳定性。
3.本文方法
        本文提出了一种新的颜色空间HVI，该空间解耦了亮度和颜色信息，并包含可训练参数以适应不同的照明尺度，并提出了包含轻量级交叉注意力模块(LCA)的双分支颜色亮度解耦网络CIDNet，用于在HVI空间中分别处理颜色和亮度。

截止文章发出前，在Paperswithcode使用LOL数据集的LLIE任务中为SOTA方法（Use GT）
4.优势及创新点

- HVI颜色空间：HVI颜色空间不仅解耦了亮度和颜色，还能通过可训练参数适应不同光照范围的图像。
- 颜色亮度解耦网络(CIDNet)：双分支架构同时处理亮度和颜色信息，提升了图像增强的稳定性和效果。
- 交叉注意力模块(LCA)：，增强图像结构和内容信息之间的交互，并抑制低光照图像中的噪声。
二、算法主要思想

整体算法流程①输入低光的sRGB图像

②从输入图像中提取每个像素的最大值，得到亮度图。

③根据亮度图和HVI颜色空间定义，通过HVT模块计算H（颜色的色调）V（颜色的强度：不同亮度对应的颜色变化）图。计算过程中通过引入可训练参数k以调整颜色点密度。将HV图和亮度图合并为低光HVI图。

引入k的动机：低光照图像的颜色和亮度信息往往紧密耦合，低光会使颜色信息容易受到噪声的影响，导致颜色点分布不均造成色彩失真。根据不同图像的光照条件设置k动态调整颜色点的密度，可以使颜色信息在低光条件下更稳定。

④将亮度图和HV图分别送入双分支unet结构的CIDNet，该网络由三个下采样Conv3×3的编码器和三个上采样Conv3×3的解码器构成，输出增强后的亮度图和去噪后的HV图。

编解码过程中引入轻量的交叉注意力LCA模块进行亮度和颜色特征的交互，减少计算开销。该模块包含交叉注意力模块CAB、亮度增强层IEL和颜色降噪层CDL。

⑤将增强后的亮度图和去噪后的HV图合并为残差HVI图，并与低光HVI图相加得到增强后的HVI图，并通过PHVIT模块将增强后的HVI图转为sRGB图输出。

双分支CIDNet网络结构
三、实验结果

1.数据集
①常用LLIE基准数据集：

配对：LOLv1、LOLv2、

非配对：DICM、LIME、MEF、NPE、VV

②极端数据集：

SICE、SID（Sony-Total-Dark）

③低光照模糊数据集:

LOL-Blur

2.评价指标
带参指标（需要GT）：PSNR、SSIM、LPIPS

无参指标（无需GT）：BRISQUE、NIQE

3.定性实验

不同方法在LOLv1和LOLv2上增强结果的视觉比较
未配对数据集的视觉效果比较
4.定量实验

对于LOL(v1和v2)数据集的定量比较（PSNR/SSIM↑），wP和oP分别表示使用CIDNet训练是否包含（with/without）感知损失。
对于LOL(v1和v2)数据集的定量比较（LPIPS/FLOPs↓）
未配对数据集的定量比较，使用BRISQUE（主观质量指标）↓和NIQE（无参考图像质量评价）↓。
四、结论与改进
本文提出的HVI颜色空间和CIDNet网络能够有效提升低光照图像的亮度，在保持色彩不偏移的同时，模型更为轻量，在多个数据集上的实验取得了SOTA结果，验证了HVI颜色空间在低光照图像增强任务的兼容性。

改进：将低光照增强任务与其他图像处理任务（如去噪、去模糊）结合，设计联合损失函数，通过多任务学习提升模型的综合性能。

编辑于 2024-05-27 02:02・北京
Transformer

深度学习（Deep Learning）

北京市信息服务工程重点实验室

​赞同 37​​添加评论​59 ​2 ​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

mniCJ

回答
0
文章
49
关注者
36

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

讨论图像传感器RGB Color Filter的合理性
Photo...发表于图像传感器

Convolutional Color Constancy
奇点点发表于Color...

Lecture20 Light Field、Color and Perception【学习笔记】
Light Field、Color and Perception（光场、颜色和感知） 本节课主要内容： 1 Light Field / Lumigraph（光场）-全光函数 -光场摄像机 2 颜色（Color）-颜色的物理基础（谱功率密度（SPD）…

箱子发表于笔记GAM...

Luma Shading   Color Shading
冰川