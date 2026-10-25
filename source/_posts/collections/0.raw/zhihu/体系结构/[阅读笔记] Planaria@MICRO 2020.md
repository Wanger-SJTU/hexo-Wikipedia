---
title: "[阅读笔记] Planaria@MICRO 2020"
date: "2022-12-07 00:00:00"
updated: "2022-12-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/[阅读笔记]-Planaria-MICRO-2020/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/589773030
---


### 题目与作者介绍

题目：Planaria: Dynamic Architecture Fission for Spatial Multi-Tenant Acceleration of Deep Neural Networks

作者：一作Soroush Ghodrati研究兴趣主要是AI与Arch的结合，他的导师是Hadi Esmaeilzadeh，在UCSD任职助理教授，是体系结构领域内非常活跃的一位学者，常年在四大(MICRO, HPCA, ISCA, ASPLOS)上有文章发表。特别地，他也关注代码生成和auto-schedule相关内容，基于TVM做过许多架构和调优的工作。感兴趣的同学可以看看他的主页。

### 主要内容介绍

### 1. 简要介绍

DNN在云端的服务部署已经是众多商业巨头的业务内容之一了，我们熟知的加速器如GPU，TPU等都被广泛地用来进行这类任务。不过云端推理非常看重加速器的利用率，为单独的任务独占加速器往往是非常浪费的，因为推理的时候，经常会出现计算任务用不满加速器的情况，为此，很多加速器都考虑资源共享，最简单的方式是时分复用，不同的任务一个一个地上加速器去跑，但是这个也不能很好地缓解问题。于是像GPU这类硬件提供了空间共享的支持(spatial colocating)，像是把一个加速器的资源分成了几个小的部分，每个部分分给一个任务去跑。在GPU上实现这种共享的方式有很多，比如利用stream，利用cuda graph，以及同一stream内可以用persistent thread block等等。但是对于DNN专门的加速器，比如TPU，还没有这么先进的空间共享的支持。本文就是为了解决这一问题提出了新的DNN专用加速器架构。

具体来说，本文提出了一种动态架构分解技术(dynamically architecture fission)，可以在运行时把一个DNN加速器分解为多个小的DNN加速单元(engine)。这种架构可以很好地支持多模型推理任务(multi-tenant inference)。为了做到这一点，作者提出了一种可分解的全向数据流动脉动阵列(breakable omni-directional systolic array)，然后他们提出了一种新的片上存储组织和互联形式支持这种可分解的systolic array。面向这种加速器，在multi-tenant DNN inference场景下可以使用更好的调度算法，兼顾负载，DNN结构，以及任务优先级。作者依照此架构设计了一个叫做Planaria的加速器，与先前工作PREMA对比，在相同频率，相同计算和存储面积下，在QoS，SLA satisfaction rate和fairness都有显著提升。

### 2. 动态架构分解

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_8e7664111543.jpg)

该图展示了可分解架构的理想情况：根据到达的任务的需求动态分割加速器给不同的任务，满足所有任务的QoS要求。为了引出动态可分解架构，作者首先介绍了常规的systolic array加速器结构（如TPU）。以往的加速器往往都只有一个巨大的systolic array（monolithic systolic array）。如下图所示，这种加速器把权重（weight）事先存放在阵列内的存储中，然后通过multi-bank bufffer进行输入数据的存储，将数据流入systolic array，将结果流出systolic array，在最后结合一个SIMD处理单元完成一些收尾算子的计算（比如batch norm, ReLU）。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_725ca1f956fd.jpg)

这种架构被作者成为是固定方向的（uni-directional），数据流动的方向是确定的。不过在DNN网络中不同层的形状区别是比较大的，一个固定的大阵列不能适应不同层的动态需求，总是会有一些部分是浪费的（比如矩阵乘法的权重矩阵有一个维度特别大，另一个维度特别小，就不能铺满整个阵列了）。这种时候要是我们能把大阵列切成多个小的独立阵列就可以解决这个问题，比如下图就是可能的分解/重组方法

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_68594c078eab.jpg)

除了计算阵列，片上存储也需要适应可分解的特性，这里主要考虑input buffer和output buffer，因为weight buffer本来就是分布在array内的，天然可分解。下图展示了memory buffer的不同的分解可能性

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_dbf780e11e2b.jpg)

为了支持这种分解，需要重新组织片上存储的分布方式，不能只把存储放在加速器阵列整体的一侧（因为这样会导致很多远端连线，极大增加了实现难度，如果不连线的话，就无法做到充分利用计算资源，这两种不好的情况如下图所示）。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_8f16d495a6a5.jpg)

基于以上的讨论，作者提出一种叫做Fission Pod的结构作为加速器设计的基本单元，它如下图所示

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_9b02a91c2e5f.jpg)

其中每个子阵列内部的PE是可以灵活控制数据流向的（全向流动，omni-directional），其结构如下图，可以通过一些额外的控制位操控每个PE到底是读左边还是右边/上边还是下边的数据。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_d8b9ee9cc526.jpg)

利用这样的Fission Pod，就可以搭建Planaria的架构了，如下图

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_86e78186a10e.jpg)

可以看到子阵列还是用两个正交的ring bus连接起来的，分别用来传input和partial sum。

### 3. 编译和调度

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_cf4550d70c8e.jpg)

对于编译部分，我比较关心，仔细看文章的介绍，逐字逐句地理解的话，意思是DNN因为模型基本固定，所以可以precompile，然后因为这个Planaria架构可以配置使用多少子阵列，所以每个DNN的会有多个版本的编译结果，根据使用的子阵列数目可以有16种版本，然后编译器还会生成16种不同的配置（这里的配置应该是配置片上开关寄存器的，因为当一个网络可以用多个子阵列，不同层如何用这些阵列还是需要配置的，但是为什么也是16种我不太清楚，可能是人工设计的16种情况），然后对于每个层，在给定的子阵列使用情况下，从可选的配置中选择最优的版本，如上图左侧所示。等到运行时调度就可以直接用precompile的结果。

对于运行时调度，契机有两个：一是有新的任务加到队列里了，二是先前的任务有结束的了，这两种情况都会触发重新schdule。整个schedule算法如下，这个算法的细节应该是写错了不少地方，比如estimates是个dict，在第26行应该是estimates[task]，不过这种细节bug太多了，我就不一一指出，只看整体思路了。思路比较简单，通过启发式地算一些分值决定task的资源分配。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_7821b8e2d9cd.jpg)

整体看来这个编译和调度还是非常直接的，毕竟整篇文章的重点不在软件部分。

### 5. 实验部分

实验里对比了四种度量：Throughput, SLA Satisfaction Rate, Fairness, Energy。这些度量在不同的场景下有不同的定义，作者主要是按照先前工作PREMA的定义和MLPerf的定义做的。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0858b3952233.jpg)

经过评论区id NoName的同学指正，我找到了这篇文章的开源地址

[](https://link.zhihu.com/?target=https%3A//github.com/he-actlab/planaria.code)

可以好好看看他的simulator和scheduler部分。
