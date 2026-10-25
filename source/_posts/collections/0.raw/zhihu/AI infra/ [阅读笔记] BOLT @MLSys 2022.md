---
title: [阅读笔记] BOLT @MLSys 2022
date: "2022-05-31 00:00:00"
updated: "2022-05-31 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/[阅读笔记]-BOLT-MLSys-2022/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/514032549
---


这篇文章是师弟发给我看的，之前扫MLSys的publicatioin居然没看到这个漏掉了，看了一下发现做的事情很有趣，很多想法是之前想过但是没付诸实践的，在文中得到了验证，因此记录一下。

### 1. 题目和作者信息

题目：BOLT: BRIDGING THE GAP BETWEEN AUTO-TUNERS AND HARDWARE-NATIVE PERFORMANCE

一作是邢加荣，山东大学2017级毕业生，现在美国莱斯大学读博士四年级，导师是陈昂。邢加荣的研究兴趣主要是网络和系统，所以这篇文章做深度学习编译器还是比较奇特的，和以往的技术路线很不一样。共同一作leyuan wang来自字节跳动，她之前有给TVM提过Cutlass Tensor Core代码生成的问题，和本文也非常相关。

### 2. 总体介绍

众所周知，现在很多深度学习编译器如TVM使用自动调优的工具来生成高性能代码，比如AutoTVM和Ansor。但是它们的性能其实不太理想，相比厂商自己提供的库如CuBlas和CuDNN，很难达到相当的水平。比如，对于非FP32的算子（换言之，可以用Tensor Core了），AutoTVM和Ansor的性能会差很多。如下图所示。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_450eea61628f.jpg)

此外，这些自动调优器的问题就是调优时间太长了。比如用AutoTVM调优ResNet-50，需要在GPU上跑七天（这个有点离谱，虽然慢，但是印象里也不至于这么慢，而且Ansor应该已经非常快了才对）。考虑到dyanmic shape问题，这种慢速调优方式难以接受。

所以这篇文章想要同时兼顾灵活性和性能，既要快，又要好！文章提出一个新的编译器叫Bolt来做到这一点。考虑到现在的库开发得越来越模块化、可配置、参数化，可以用自动调优技术与库进行结合。一个典型的库就是Cutlass。Cutlass提供参数化的模板，可以用来组合出想要的运算。这一点我是有感触的，之前在Cutlass上开发过一点点东西，实现一个新的算子，虽然Cutlass读起来比较费劲，但是一旦弄清楚了，用起来还是比较好的，我记得当时只需要增加几种新的layout，改一改predicated_iterator，就能支持一个新的算子，内层的kernel代码全能复用。

所以这篇文章就是想用类似Cutlass的模板进行调优。这层模板就是介于上层算子和底层CUDA代码之间的一层抽象。Bolt首先用模板组合生成高性能算子代码，然后可以进一步应用一些图层面的优化，从而做到算子层和图层的共同优化，生成代码的性能也和库相当。具体实现的话，他们是基于TVM和Cutlass，已经合进了TVM主分支，代码在[这里](https://link.zhihu.com/?target=https%3A//github.com/apache/tvm/commit/541f9f2d8aef9697fd7ccb6a7c0644da273f33b6)。之前也注意到了TVM里Cutlass的调用不是简单地像CuBlas那样调用固定kernel，不过具体怎么做的还得看看代码研究研究。

### 3. 背景知识

#### 3.1 Auto-tuners和库存在performance gap

这里讲现在的调优器生成代码性能还是比库低不少，这个我就不细说了，用过调优器的都应该知道，大家不成文的习惯就是只比inference，小batch，不规则矩阵……大batch，大方阵，真的打不过库。

#### 3.2 Templated libraries

这里文章主要介绍库开发的趋势：模板化。其实我接触到的很多经典的库都是模板化的，不只是Cutlass。这种设计最开始是为了方便库的维护和系统接入，组件之间能够复用，降低开发成本。不过能基于这套思想进行开发，对开发者的要求特别高，很多时候要基于概念进行元编程，层次比直接写kernel要高。不过值得一提的是，现在的模板即使再通用，暴露出来的参数其实也是非常有限的，一般都是计算规模，数据类型。看起来本文其实也是基于这些参数进行设计的，这也就使得本文局限在了库提供的原语支持能力范围之内，比如我之前开发的那个新算子，就应该无法用本文的方法直接支持，因为需要添加新的iterator模板。从这个意义上来说，Bolt的理念就和TVM分道扬镳了，因为TVM的前端TE或者TensorIR至少是能表达绝大多数运算的，代码生成能力不会被限制住。

### 4. Bolt

本文的insight在于库也是可以和auto-tuner集成的。其实这个insight应该属于被“重发现”了。如果大家仔细看深度学习编译器文章的引用的话，会发现很多人都会acknowledge一个工作叫ATLAS，这个工作就是2022年图领奖得主Jack Dongarra的作品。ATLAS做的事情就是自动化生成BLAS库，通过使用硬件高度相关调优的routines，以及通过参数化tiling factor, cache size等控制代码生成，这个过程会使用之前准备好的高性能routines。ATLAS诞生的年代深度学习还没怎么兴起，如今的Bolt再次使用相似的insight，在深度学习领域应用了类似的理念。

接下来的一点，Bolt提出可以在图上做更深的fusion，称作persistent kernel fusion。这个后面再具体说。

最后的一点，Bolt提出自动化模板代码生成，自动搜索模板参数。其实听起来挺trivial的，不过做的人应该很清楚，工程实现上也不是那么轻松。文章还提到了硬件友好模型设计，一笔带过了，对核心贡献不太重要。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_fa6720e5e4f2.jpg)

#### 4.1 Deeper operator fusion

Bolt可以在一个kernel里fuse多个conv或者gemm。这个功能是Cutlass自己提供的，在examples里可以找到。Bolt利用了这一点，进行更深的fusion，如下图所示。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_e2cee2ddc89a.jpg)

直观上来说，就是第一个gemm算完的结果不要存出去，而是留在片上给下一个gemm用。实现上，需要控制threadblock先后处理两个大小可能不太一样的gemm块，如下图所示，文章中称为threadblock persistence。这个观点还是比较直接，缺少一些更具体的分析，不过作为早期成果，也是不错。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_d3bf6d4eb015.jpg)

至于在哪里放中间数据，Bolt首先介绍一种激进的方法，直接在一个warp的寄存器里暂存数据，如下图所示

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_177a4867fb2e.jpg)

看过我之前[MMA文章](https://zhuanlan.zhihu.com/p/455166274)的读者应该清楚，Tensor Core的输入fragment和输出fragment的layout是不一样的。所以这就需要Bolt在进行第二个gemm之前把warp fragment里的数据relayout一下才能用，文章中说他们自己实现了一个warp fragment iterator。这个事情估计大部分用户都做不了。

使用warp fragment暂存数据其实不太明智，因为寄存器资源太紧张了，过分使用寄存器会损害整体性能的。所以Bolt还有一种shared memory-resident fusion的选择，把中间数据放在shared memory。我个人认为，这种方式更实用。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_8449c52db497.jpg)

#### 4.2 Templated code generation

Bolt是用TVM自定义codegen的方式进行代码生成。此外，为了填模板参数，Bolt还自己加了performance profiler。Bolt调优的参数其实就是调用Cultass模板时候需要填的参数，比如threadblock要算多大的gemm，warp算多大的gemm，用什么swizzling方式，用多少个stage流水线之类的。此外，Bolt还有一些启发式的规则：

- 寄存器使用不要超了，尽量提高arithmetic intensity
- 使用4个或者8个warp
- 本身gemm比较小，threadblock gemm规模也得选小点
这些规则也比较细节，有点太工程化了。

后面还介绍了一些Bolt的优化，属于老生常谈了

- NCHW向NHWC layout的转换
- kernel padding，为了数据对齐，进行vector load

#### 4.3 System-friendly models

这里的内容也比较简单

- 更换epilogue算子
- 多用1x1 conv
- 使用对齐的tensor

### 5. 实验

实验的话，老规矩，简单放几张图。首先是比较Bolt fuse两个gemm和conv

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_76fa8f17d085.jpg)

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_e7f51eb6ea35.jpg)

可以看到合并这种比较“重”的算子真的会有加速比。我在TVM上用原生codegen是验证过的，基本符合我的实验结果。然后这里有个华点，文章里放的conv fuse conv的实验是3x3 conv fuse 1x1 conv，而且channel超级小，大家猜猜为什么作者不放3x3 conv fuse 3x3 conv或者放channel大一点的情形呢（这个问题我们研究了很久hhh）。

Bolt和Ansor比的话，确实加速很大。毕竟Ansor支持不了Tensor Core。

![](/images/collections/0.raw/zhihu/AI%20infra/asset/img_9c081efb62a1.jpg)

我最近发表的文章其实也可以处理自动Tensor Core代码生成的问题，有兴趣的同学或许可以瞧一瞧。代码在[这里](https://link.zhihu.com/?target=https%3A//github.com/KnowingNothing/AMOS)。

### 总结

这个文章我是非常喜欢看的，因为很多想法都有共鸣。虽然觉得整体writing还有很大提升空间，技术和实验也有点工程化，缺少核心贡献。不过作为早期成果，还是非常棒的，相信字节跳动内部已经有更强的实现了，只是还没开源[doge]。
