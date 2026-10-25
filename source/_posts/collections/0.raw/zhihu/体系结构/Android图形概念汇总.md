---
title: Android图形概念汇总
date: "2025-09-11 00:00:00"
updated: "2025-09-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Android图形概念汇总/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1945066568506671540
---


Android性能知识版图中图形框架和概念是必须学习和了解的，否则很难分析好性能问题。本文只是汇总了一下图形基本概念和知识。

### 1 概述

Android图形系统是一个复杂的系统。相关组件模块横跨软件全栈，如示意图

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_861c193938ce.jpg)

运行结构又涉及到多个进程/线程进行协同：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_436814ab2a8d.jpg)

### 2 重要概念

#### 2.1 VSYNC和Fence

- TE信号：硬件刷图的断点，从一个TE到下一个TE刷好一张图
- Vsync：统一系统绘制与显示节奏（Apps和SurfaceFlinger）， 表示的是什么时间开始做事（绘制/合成）节拍器
- <strong>Fence:</strong>表示什么时间事情做完了
- 屏幕刷新率：硬件的概念，指屏幕这个硬件刷新画面的频率。如：60Hz 刷新率：这个屏幕在 1 秒内，会刷新显示内容 60 
- FPS （  Frame Per Second ）是由软件系统决定，是每秒产生画面的个数。如：60FPS 指的是每秒产生 60 个画面。如：60 fps 的系统 , 1s 内需要生成 60 个可供显示的 Frame , 也就是说绘制一帧需要 16.67ms (  ) , 才会不掉帧 ( FrameMiss ).
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2ef6aa9c90ae.jpg)

来自OPPO一文搞定Android VSync机制来龙去脉

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_96940d9c0501.jpg)

一文搞定Android VSync机制来龙去脉

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_eea2aeede288.jpg)

一文搞定Android VSync机制来龙去脉

- 官方vsync实现
- [一文搞定Android VSync机制来龙去脉](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/gAcBEqjYAwSVwFSg2vuN8Q)
- [Vsync之app层面深入分析](https://zhuanlan.zhihu.com/p/694194825)
- [Android 15 vsync源码研究](https://zhuanlan.zhihu.com/p/1887591049251242761)
- [显示基础--Vsync相关](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/TaisTpfqzjjxv52ZmZ04bw)
- Android View绘制原理 - VSync原理之SurfaceFlinger篇
- [为什么Vsync需要分成 App VSync和 SurfaceFlinger VSync呢？](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/qf2M8upTCbdRNR1Up8oRng)
- [Android VSync 为什么不用binder同步](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/TR3fVzRe65dcjOj7kB3gjw)
- [Android14 Vsync 原理](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/nw-YkuTZ86HvJ3ORb07Qvw)
- [SurfaceFlinger的硬件Vsync深入分析-千里马android framework车机手...](https://zhuanlan.zhihu.com/p/683996498)

#### 2.2 Buffer,BufferQueue,Fence

Buffer：应用绘制图像所使用一块内存；Surfaceflinger对应Layer，应用端对应为Surface

BufferQueue：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9f5f92ce2049.jpg)

- https://source.android.com/docs/core/graphics/arch-bq-gralloc?hl=zh-cn
- https://source.android.com/docs/core/graphics/sync
- [深入浅出Android BufferQueue](https://zhuanlan.zhihu.com/p/62813895)
- [Android Synchronization Fences – An Introduction](https://zhuanlan.zhihu.com/p/582462117)

### 2.3 Window，ViewRoot，View

- [Android渲染系列之如何渲染UI](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/cHI1lN0L6_PIlc4Qg3j1qA)
- understanding-canvas-and-surface-concepts/4577249#4577249
- Android绘制流程 -- View、Window、SurfaceFlinger
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8c2e0e687b05.jpg)

#### 2.4 Choreographer

<strong>frameworks/base/core/java/android/view/Choreographer.java</strong>

```text
 /**
 * Coordinates the timing of animations, input and drawing.
```

 * 

```text
 * The choreographer receives timing pulses (such as vertical synchronization)
 * from the display subsystem then schedules work to occur as part of rendering
 * the next display frame.`
```


- 移动端显示技术杂谈
- Android Choreographer 原理 以及 动画原理
- Graphics

#### 2.5 SurfaceFlinger

- [为什么SurfaceFlinger是Android流畅显示的幕后英雄？合成过程详解](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/DJ5SO_Wlu4I5BBLxBHq5lA)
- [解码60FPS流畅渲染：Android图形子系统核心机制全链路剖析](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/k-X_cM53iqdyt15k-0yTGA)

### 3 关键代码模块

#### 3.1 内核

kgsl：kernel/drivers/gpu/msm/adreno_dispatch.c

crc_commit:drivers/gpu/drm/msm/msm_drv.c

3.2 BLASTBufferQueue:

frameworks/native/libs/gui/BLASTBufferQueue.cpp

#### 3.3 View系统

frameworks/base/core/java/android/view

#### 3.4 SurfaceFlinger

frameworks/native/services/surfaceflinger
