---
title: (1 条消息) 【AI编译器】论文阅读（五）Roller
date: "2023-07-18 00:00:00"
updated: "2023-07-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/【AI编译器】论文阅读(五)Roller/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/644383797
---


#### 基本信息

论文题目：*<strong>Roller: Fast and Efficient Tensor Compilation for Deep Learning</strong>*

发表时间：Jul 2022

#### 摘要概述

当前张量编译器在取得进展的同时，生成一个高效的内核需要数个小时的时间开销。

缓慢的编译是由于现有DNN编译器的搜索空间巨大，其大大减缓了DNN的开发周期。

论文提出Roller，使用不同的、基于构造的方法生成内核。

rTile是Roller的核心，其封装了与硬件加速器关键特性对齐的张量形状，对tile进行抽象，从而通过对形状选择进行限制，以此实现高效的探索。Roller基于rTile生成最终的rProgram。

rProgram的性能可以通过微性能模型进行评估。因此，Roller可以在几秒内生成高效的内核。

#### 章节概述

<strong>第一章节</strong>

DNN编译器将一个DNN算子视为张量计算，将其转换为嵌套的多层循环。编译优化技术将循环划分/融合/重排作用到嵌套循环中，在一个大的搜索空间寻找优化的解决方案是一个组合优化问题。当前编译器利用机器学习算法探寻一个优化结果。即使这样，也需要上千的搜索步骤，每个步骤需要在真实的硬件上运行评估。

Roller提出了完全不同的方式解决开销问题。

- Roller将DNN算子的计算视为数据的处理管道。数据块在并行执行的计算单元和多层内存层次架构的硬件中移动和计算。生成高效的内核程序的代价目标就是提升管道的吞吐量。
- 数据块的形状需要和硬件特性一致以保证硬件加速器高效的运行。包括内存存储体、内存事务长度和最小的调度单元（rTile每一层与相应的硬件约束相对齐）。
- 对齐的管道（算子在Roller中的抽象）的性能是高度可预测的。对齐的管道的关键性能指标可以从硬件规范或微基准测试获取。因此管道模型极大的简化了算子的性能评估。
基于上述解决方案，Roller提出了rTile。数据处理管道可以被描述成基于rTile的程序，由三个接口构成：Load/Store/Compute。为了构建一个高效的rProgram，Roller使用一种*scale-up-then-scale-out* 的方法。Rolloer先执行放大过程，采用基于递归的rTile构造算法，逐步增大rTile的大小，构造硬件加速器的单个执行单元的饱和运行。然后根据深度学习模型和硬件加速器的计算模式的同质性执行scale-out过程。Roller可以高效的评估rTile的性能。

<strong>第二章节</strong>

Roller的研究动机是当前DNN编译器过多的编译时间。当DNN模型包含数百个算子时，其编译过程可能需要数天的时间开销。该开销在不成熟的硬件设备上会增大。

Roller的观察：

- 算子的计算过程可以视为一个数据处理管道。算子的性能取决于在加载-计算-存储管道中移动数据块的速度。以矩阵乘 C = A x B为例，从A，B中加载Tile，计算两个子矩阵的结果，将结果存储回C。
- 影响管道中所有步骤的性能的关键因素是tile的形状和相应的布局。
<strong>第三章节</strong>

下图展示了Roller的系统概述：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_422165b9342e.jpg)


Roller从张量表达式中提取张量的形状，并利用硬件的相关规范来构造rTiles。在rTiles的基础上使用一种*scale-upthen-scale-out*的递归构造算法生成rProgram。构造算法通过评估生成的rProgram的性能来识别rTile合适的配置。

rTile的数据结构如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5a6bc2bc6e69.jpg)

rTile必须和给定张量表达式中的张量形状和底层硬件特性对齐。（*该部分可以配合CUDA学习笔记来看）*

- 与硬件的执行单元对齐，如NVIDIA中的wrap（32）、TensorCore（16x16x16）
- 与内存事务对齐，如图5.a所示，避免事务读取数据的浪费
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c14500b8e5c2.jpg)

- 与内存存储体对齐，如图5.b所示，避免存储体冲突。rTiles通过padding数据避免低效访问。
- 与张量形状对齐
Roller利用如下接口推导出所有rTiles的尺寸：`vector GetNextAlignedAxisSize(rTile T, Dev d)`

Roller可以通过增加rTile的大小来获取更多的数据重用机会。Roller通过rTile T和下一次对齐大小计算出数据重用得分。

下图显示了矩阵乘算子rTiles的分层。可以从c中看到L0，L1和L2层的数据移动。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a06ad3135594.jpg)

给定一个数据处理管道，其rProgram的优化目标是最大化管道的吞吐量，该目标可以转换为：

- 计算和数据移动需要充分利用硬件特性
- 吞吐量需要达到性能瓶颈
- 需要足够的并行以充分利用并行执行单元
Roller首先使用scale up以满足前两点，之后利用scale out利用多核并行性。

- scale up：Roller从内存结构由顶至下构建不同层次的rTile尺寸，Roller首先进行rTile的初始化，之后迭代扩大rTile的大小，最大程度提升数据重用得分。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f071ae88b1e4.jpg)

- scale out：Roller在最底层的内存尺寸上构造单一单元执行的rProgram，并通过将每层的rTile平均分配来将rProgram复制到其他单元。一般会在reduce的轴上分配单元。
Roller尝试沿着具有最小数据重用得分的轴上收缩rTiles以实现足够的并行度。

第四章节

Roller的实现基于TVM和Rammer。通过8K行代码实现了表达式优化、构造算法和微性能模型等核心机制。

Roller首先利用Rammer进行图级优化，然后Roller从每个算子的TVM张量表达式，并通过构造算法生成rProgram，执行内核生成。最终生成的内核注入Rammer的运行时，生成端到端模型。

Roller利用预定义的模板实现内核代码由TVM调度原语实现。

Roller利用张量填充排列rTiles和张量的形状。在上层利用TVM的storage_align原语来添加填充。

Roller有两个分析器：微性能分析器和内核分析器。

Roller抽象了三层内存结构，L0对应寄存器，L1对应共享内存，L2对应全局内存。

<strong>第五章节</strong>

此章节将Roller与最先进的DNN编译器和框架想比较，进行端到端的测验。

<strong>第六章节</strong>

Roller以提升数据重用为主要优化目标，并将硬件相关性能优化转换为对齐约束。这种权衡导致了快速编译和高性能的生成内核。

此章节还阐述了一些当前的局限和未来工作。

<strong>第七章节</strong>

阐述了相关工作，Roller的rTile抽象补充了Rammer的rTask概念，提供了一种构造rTask的有效方法。

<strong>第八章节</strong>

Roller避免使用昂贵的机器学习方法在巨大的搜索空间寻找解决方案，而是使用基于递归构造的算法生成高效的内核，利用rTiles抽象，使用更少的形状对齐硬件特性。构建的程序可以方便的通过微性能模型进行评估。Roller实现了在几秒之内生成高性能内核。
