---
title: ARM架构的GPU和台式机的GPU最核心的区别是什么？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/ARM架构的GPU和台式机的GPU最核心的区别是什么/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/25419183/answer/151339808
---


移动GPU和桌面GPU最核心的差别在于渲染流程不同。目前主流的移动GPU，无论ARM、高通还是Imagination，其GPU都是TBR（Tile Based Rendering）。而桌面GPU，无论NVIDIA、AMD还是Intel，都是Immediate Rendering. 下面我就来说说什么叫TBR，什么叫Immediate Rendering。

说在前面：
从opengl定义的GPU pipeline来看，一帧3D场景是通过以下几个过程渲染出来的。

“Vertex前端”（负责准备数据和Vertex Shader指令）->"Vertex Shader"(计算定点位置，颜色，纹理坐标，光照，等相关工作)->"Primitive Assembly"（负责组装图元，比如三角形； 坐标系变换，物体坐标->世界坐标->透视变换->屏幕坐标；视锥剪裁；Culling正反面选择）-> “Rasterizing”（光栅化，就是将立体场景投影到二维屏幕的过程）->"Early Z/S"（前期depth和stencil测试，决定一个fragment是否被渲染，从而降低后期fragment shader的负担）->"Fragment Shader"（对一个fragment，即像素，进行渲染。可能涉及到读取纹理texture。）->"Post Z/S"（后期depth和stencil测试，有些应用在fragment shader中可能会改变该像素的深度值）->"Blending"（将此次渲染结果和之前的渲染结果进行混合）。

1. Immediate Rendering

Ok，说到这所谓的Immediate Rendering，就是将一个图元（最常见的是三角形），从头到尾走完整个Pipeline，中间没有停止。这种结构，控制简单，容易实现。问题是在做blending的时候需要从存储单元中不断读回之前render的结果，可想而知在绘制一个大的场景时这个带宽消耗是比较大的。

那为什么桌面GPU会采用这个架构。首先，历史原因，最开始设计opengl pipeline的人，正是这些设计桌面GPU的大咖们。不过，最重要的一点是，桌面GPU都是有自身显存的，它不需要通过系统总线从系统的DDR memory中读回数据。所以开销比较小，是完全可以接受的。但移动端的处理器（基本是可以认为都是ARM处理器）都是统一寻址的。所有的IP都是使用统一的DDR存储空间，这样读回Pixel进行blending就变成了一件非常奢侈的事情。它会严重占用系统带宽，不但功耗提升，而且会影响整个SOC的处理能力（可以想象北京上海的堵车场景）。为了解决这个问题TBR便应运而生了，下面该TBR出场了。

2. TBR

TBR是Tile Based Rendering的缩写。首先来认识一个概念Tile。什么是Tile，你可以把它看成一小块屏幕区域。比如一个屏幕的分辨率为256x256，假定一个tile的大小是16x16，那么这个屏幕可以看成是由16x16个Tile组成。TBR的精髓就是一个Tile一个Tile的渲染。这样只需要给GPU配上一块很小的片上cache（足够装下一两个Tile的内容就行），就能实现高效的blending。那么，问题来了，根据前面讲述的GPU pipeline来看，只有在光栅化的时候才能知道每一个tile中包含的fragment，如何才能做到一个tile画完再画另一个tile呢。这里就需要一种机制将整个场景的图元信息（最主要的是位置）都保存下来，并且能在做光栅化时快速的检索出属于这个Tile的图元。所以所有的移动GPU中都会有Tiler这个模块，这在桌面GPU中是没有的。每个厂家的Tiler实现都是机密，这里不予讨论。我们只要知道Tiler能接收vertex shader的运算结果，并在光栅化之前，选出属于特定tiler的图元就行了。有了Tiler，这个GPU Pipeline就被分为了两部分，一个场景中所有的vertex计算都在光栅化之前完成，最后再一次性raster一个Tile。这样做还有一个好处就是，可以更有效的在early z中剔除被遮挡的像素，降低了fragment shader的负载。

[所属专栏 · 2024-08-30 22:38 更新](https://zhuanlan.zhihu.com/c_1812981869215608832)[![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c64896d5bda9.jpg)计算机图形学

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_38997858044c.jpg)TechThinker

13 篇内容 · 699 赞同

](https://zhuanlan.zhihu.com/c_1812981869215608832)订阅[最热内容 ·

移动 GPU 和桌面 GPU 的差距有哪些？

](https://zhuanlan.zhihu.com/c_1812981869215608832)[发布于 2017-03-13 13:47](//www.zhihu.com/question/25419183/answer/151339808)

​​491 ​93 ​分享

​​

收起​
