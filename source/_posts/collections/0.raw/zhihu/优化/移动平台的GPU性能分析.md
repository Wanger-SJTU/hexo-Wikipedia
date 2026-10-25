---
title: 移动平台的GPU性能分析
date: "2022-09-02 00:00:00"
updated: "2022-09-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/移动平台的GPU性能分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/560738175
---


移动平台Profile GPU性能，通常有几个目的：

- 分析技术方案的性能；
- 分析优化方案的效果。
- 查找性能瓶颈；
不同硬件设备的测试工具有：

- Mali GPU，Streamline Performance Analyzer
- Adreno GPU，Snapdragon Profiler
- Apple GPU，Xcode
各个平台通用的测试工具：

- 腾讯，Perfdog
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_a17a7580edc9.jpg)

Perfdog远不如各个硬件产商的工具强大，但是它在ios平台，也能提供一定的补充作用，例如带宽数据的分析，xcode只能通过截帧的方式获取，通过perfdog工具，可以分析多帧的平均值，这样得到的结果会更加准确。

在移动平台上实现的任何技术方案，我们都只关心三个因素：

- 表现效果
- 实时开销
- 耗电情况
这里的实时开销，是指GPU运行时消耗的时间，我们期望减少GPU的消耗，来提高游戏的帧率。但是，我们不能根据游戏的fps帧率来分析GPU，因为游戏逻辑功能、CPU状态等能对帧率产生影响，会导致误判。

这里，希望解决的是问题是：

- （1）怎么科学的分析性能指标；
- （2）怎么利用好现有的分析工具。
现在在网上公开的资料，Mali GPU有比较丰富的文档，而adreno和apple系列缺少相应的文档资料。但是，从移动端的结构原理而言，我可以合理的估计，它们绝大部分的硬件特性的原理是相通的。

Mali GPU提供的streamline工具的功能非常强大，文档也较丰富，后续重点以Mali G76 Bifrost GPU硬件为例展开介绍，并适当提些一些别的硬件的指标。

利用工具，分析GPU性能时，通常需要：

- 关闭垂直同步；
- 若分析带宽，要锁帧；
- 不要出现CPU-Bound或GPU-Bound的情况，否则实验数据误差严重；
- 确保设备不要长时间运行，移动设备发烫会降频，导致性能数据出现误差；

### 实时开销

任意GPU受限于寄存器等因素，它所能支持的运算力有上限值，这个上限值也就是所能支持的最大线程数，每个线程的执行时间通常是按照时钟数来度量。<strong>任意一个时刻，运行时的总时钟数就代表了当前GPU的总负载，它的数据跟实时开销正相关</strong>。

不同硬件厂商提供的工具对某一时刻的总负载有不同的表示：

- Apple GPU，利用率（Utilization），反映的是实际执行的线程与GPU最大支持的线程的比值；
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_68a086399a90.jpg)

- Mali GPU，GPU Active Cycles；
- Adreno GPU，Clocks / Second；
提交至Mali GPU的任务通过任务管理器（Job Manager）进行调度，里面包括两条完全并行的队列，一条处理非片段管线（例如顶点、tiling等），另一条是处理片段的管线。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f3eb08423720.jpg)

数据处理流的一个切片如下图所示，总的GPU时钟周期不等于Non-Fragment时钟周期和Fragment时钟周期的和，两者之间是存在一定的重叠。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_5ab68f67e5e8.jpg)

Non-Fragment时钟周期、Fragment时钟周期与总的时钟周期的比值提供了一种宏观分析游戏性能占用情况的指标，不能简单的根据它们要衡量性能的高低。

Mali GPU Streamline提供的指标:

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_a7679239bd6d.png)

Mali GPU还有一个指标称为吞吐量（Thoughput），表示平均执行一个线程需要的时钟数，是能反映实时开销的。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_18d86d9fdfc9.png)

此外，Mali GPU还提供了一种度量overdraw的指标：片段着色器的线程数 / 像素数，overdraw比较高的情况，还是UI或者特效的渲染。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_61750c249846.jpg)

### 带宽开销

移动平台的带宽开销，直接挂钩耗电情况，低功耗也是移动游戏优化的目标之一。为了有更低的功耗，移动平台的GPU都是以TBR架构为基础，GPU与系统内存之间的数据交互就会产生带宽。Mali官方提供了一种简单粗暴的估计算法是：

** 1 GB/s 带宽 = 80mW ~ 100mW 耗电通常不同的硬件厂商提供的工具都有分析带宽的指标：

- 读带宽，GPU从系统内存读数据；
- 写带宽，GPU写数据到系统内存。
如下图所示，GPU与外部系统内存的交互是需要经过L2缓存的：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_45cae222edf2.jpg)

例如Mali GPU的提供的指标，可以看出右边的技术方案的带宽就比左边的要低。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_c44d7b4c0082.png)

当得到总的带宽数据后，往往我们想要去分析带宽增加或降低的原因，需要关注哪些指标呢？带宽的来源包括：

- 纹理的读取；
- Buffer的读取，例如Vertex Buffer、Index Buffer；
- load/store；
- 缓存的命中率，缓存命中失效就会导致需要从外部存储读写数据；
- GPU上的内存较小，当存储消耗过大，就会导致需要将数据写回外部的系统内存；
我们需要关注的指标有：

- 片段着色器的带宽读写开销；
- 顶点着色器的带宽读写开销；
- 缓存的命中率情况，缓存的命中率也是会影响实时开销的；
- texture单元、load/store单元的带宽读写开销。
Mali GPU：

- 片段着色器对L2缓存、系统存储的读带带宽；
- load/store对L2缓存、系统内存的读写带宽；
- tile buffer的写带宽。
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f10ad2075d3c.jpg)

Adreno GPU:

- 片段着色器、顶点着色器的读写带宽；
- L1、L2缓存的贴图命中失效率；
- 每像素L1缓存的命中失效率；
- 等等。
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_ea6d16bad366.jpg)

再比如，当我们面对贴图带宽开销较高的情况的时候，我们还需要关注一些不同贴图滤波方式的占比、压缩贴图的占比等：

- 尽可能的压缩贴图，降低存储；
- 减少使用trilinear等滤波方式；
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_7423a5fedbd7.png)

### ShaderCore性能

以Mali GPU为例，如下图所示，ShaderCore是执行运算的核心组件，包括一些基础组件：

- Varying单元；
- Load/Store单元；
- Texture单元；
- Late-ZS单元；
- Hide Surface Hide（Apple的TBDR、Mali的FPK、Adreno的LRZ）；
- Blend单元；
- 指令执行的Excuetion Engine单元，执行ALU的关键性单元；
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_c0147d15076d.jpg)

任意一个时刻，各个组件会占用一定的时钟周期去执行工作，它的占比称之为占用率（ios上称为limiter Counter），我们是期望能提高shader core的占用率。

以Mali GPU例如，可以得到如下所示的性能指标：

- ALU占用率；
- Varying单元占用率（VS到PS的插值运算）；
- Texture单元占用率；
- Load/Store单元占用率；
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_900731da2dd3.jpg)

举个应用例子，ALU单元是执行shader指令的关键单元，当一个技术，使得ALU单元的占用率提高了，我们是否能认为该技术提高了GPU的实时开销？

ALU单元占用率占：

- 优点：能充分利用GPU的延迟隐藏特性，从而发挥GPU的潜能；
- 缺点：可能shader效率低，线程争夺cache资源（Thrashing）。
理想情况：

- 相同执行任务下，提高ALUs的占用率
技术优化对占用率的期待是：提高缓存命中、减少寄存器数和内存数据，提高占用率。

仅从ALU占用率并不能判断是优化或者是负优化，还依赖于别的指标。如果一个技术方案，经过测试：总的始终周期降低，ALUs占用率提高，我们则可以乐观的认为，实时开销是降低了。

Shader实现是影响性能的重要的因素，一些简单宏观的判断指标是：

- 指令数；
- 缓存命中率；
- 采样数、采样滤波方式；
- 等等
不同的硬件平台提供的分析指标有一定差异的，例如adreno的SnapDragon提供了一些指标，例如：

- Percent of texels filtered using the "Anisotropic" sampling method.
- Percent of texels filtered using the "Linear" sampling method.
- Percent of texels filtered using the "Nereast" sampling method.
- Average number of scalar fragment shader ALU instructions issued per shaded fragment.
- Average number of scalar fragment shader EFU instructions issued per shaded fragment.
- .....
这些都是比较宏观的检测手段，针对某个shader性能的分析，我觉得xcode的截帧工具是非常有效的，虽然截帧显示出来的实时时间数据不够准确。

### 场景数据

场景数据提交至GPU，在片段着色器之前，还需要经历一系列的处理，这部分的性能数据怎么分析呢？

面元数据**

往往移动游戏都会限制一个同屏最大面数，例如规定30w面是上限值。这些面数提交至GPU并不会都被渲染出来，必须经历一系列的剔除（Culling），例如是否在视口（viewport）内，Z方向是否被遮挡，背面剔除等等。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_2abce27e88f3.png)

Mali GPU的几何裁剪管线streamline支持的一些指标如下所示，并不是说被 剔除的面数越高越好。剔除的面数越多，说明场景的制作存在缺陷；剔除的面 数越少，有可能会有性能瓶颈，这些数据也是要在实际的场景中去权衡判断。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f051f56527f7.jpg)

<strong>顶点数据</strong>

Mali GPU支持一种称为Index-Driven Vertex Shading（IDVS）的处理管线，在IDVS管线中，需要在剔除阶段之前计算顶点的坐标，然后存入顶点缓存中，避免去计算被剔除的顶点。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_3e4e10868fb3.jpg)

1个三角面片有3个顶点，每个顶点会被多个面共享，这样在渲染三角面片的时候，就存在顶点着色器会多次冗余调用的情况。GPU硬件一般都有支持一个称之为Post-Transform Vertex Cache的内容，就是将计算出来的顶点结果缓存起来，减少冗余计算的问题。这就期望，提交至GPU的Index Buffer索引的顶点有较好的相关性，可以大大提高缓存的命中率。像这种顶点缓存的技术，在不同的硬件平台也是相通的。

Mali GPU的性能指标，如下所示（注意：641 milli-threads = 0.641 thread）：

- Position shading threads，顶点shading触发的次数；
- Varying shading threads，插值单元触发的次数；
- Position threads/input primitves，平均每个面需要触发的顶点线程数；
- Varying threads/visible primitives，平均每个可见面需要触发的插值线程数；
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f4b94334b77d.jpg)

Adreno GPU的性能指标：

- Average Vertices per Polygon
Apple GPU的性能指标：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_f273822a3300.jpg)

<strong>Early-ZS</strong>

Mali Bifrost的一个架构图如下所示，光栅化后的图元需要经历两个阶段：

- Earyly ZS Test
- FPK组件
![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_6e829799e2b9.jpg)

FPK组件是Mali的HSR（Hide Surface Hide）组件，Apple系列称之为TBDR架构，Adreno称之为LRZ。

这两个技术的前提要求是：

- 不要使用alpha to coverage
- 不要使用discard语义
- 不要在着色器中写gl_FragDepth
Mali GPU的性能指标如下所示，当然我们期望尽可能的走FPK组件或者Earyly-ZS测试，提前剔除的话，可以减少后续片段着色的运算开销。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_11974210ca15.jpg)

### 参考

[1] GPU指标详细说明

[2] Performance Tuning

[3] Mali-G76 Performance Counters Reference Guide
