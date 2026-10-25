---
title: (1 条消息) AI芯片设计--Mapping空间探索工具
date: "2024-01-09 00:00:00"
updated: "2024-01-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/AI芯片设计-Mapping空间探索工具/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/676947023
---


有许多工作已经开发出解决DNN加速器mapping问题的工具。比如Eyeriss mapper [184]，MAESTRO [190]，R-Stream [191]，Timeloop [192]和TVM [130]。其他解决类似问题的著名工具有：Halide [193]和Tiramisu [194]，但它们最初并不是针对DNN加速器的。Halide介绍了算法与调度(或mapping)的分离，Tiramisu虽然只针对CPU和GPU，但特别有趣，因为它优化了第8章讨论的稀疏计算。

mapper和类似mapper的工具的典型特征在于它们如何处理下列问题：(1)它们所针对的体系结构的范围。(2)它们可以mapping的计算范围(例如，仅DNN层或更一般的计算)。这通常由他们用来描述映射空间的框架决定(例如，区分合理和不合理的mapping)。这些框架通常也有助于分析特定架构上的计算行为。(3)他们用来搜索mapping空间的探索方法。(4)用来估计给定mapping下的性能和能量的方法。下面将描述一些较为流行的工具使用方法。但是需要注意的是，许多工具还在不断的更新，这里只描述本文撰写时候的版本。

现有mapper的目标是相当多的体系结构。有些目标只是特定的DNN加速器。举个例子，Eyeriss映射器仅针对Eyeriss的行静态数据流。为了支持更广泛的目标设计，其他mapper接受描述DNN加速器体系结构的架构模板。这些模板包括支持的数据流、PE数量和存储层次结构的级数、存储大小和网络连接等因素。MAESTRO、Timeloop和TVM mapper都接受这些模板。一些工具（例如TVM）通过将某些硬件功能（例如向量或Nvidia的tensor core）描述为高度约束的模板来扩展到目标通用处理器。

这些工具接受的问题定义的范围也有所不同。比如Eyeriss mapper，假设CONV/FC层的标准表达式（见第二章）。其他有的则接受等效于第二章中描述的张量索引表达式的表达式，例如Tiramisu和Timeloop。TVM接受由各种标准机器学习库生成的问题规范，如TensorFlow [98]和PyTorch [99]。最后，Halide作为C++中的嵌入式领域特定语言（EDSL）运行。

另一个mapper的要求是需要一种表示映射空间的方式。有些工具使用一种广为人知的编译器框架，称为polyhedral model[128]。该模型允许表示成为static control parts（SCoPs）的循环嵌套序列。SCoP是一系列循环嵌套，其中循环可以具有动态循环边界，循环体中的语句可以具有控制语句是否执行的条件。然而，循环边界和条件必须是循环索引变量和常量参数的线性函数（即它们不依赖于数据）。polyhedral model通常与分析框架配对使用，以计算特定架构的重用等行为特征。使用多面体模型的工具包括R-Stream和Tiramisu。

目前还没有基于polyhedral model的cost model能够适用于一些更复杂的DNN加速器特性。这些更复杂的特性包括多级显式解耦数据协调式（EDDO）缓冲（见第5.8节）或支持多级multicast或空间降维的复杂NoC拓扑结构。此外，实现polyhedral model的现有框架非常庞大，对于某些情况可能过于臃肿。因此，一些mapper使用自定义表示方式来表示映射空间。这些表示方式通常支持更受限制的循环嵌套集合（例如没有条件语句或固定循环边界）。这样的映射器的例子包括：Eyeriss mapper、Halide、Timeloop和TVM。这些系统倾向于使用自定义分析来跟踪数据块的移动以确定数据重用，这在第6.4节中有描述。

搜索启发式方法差异很大。一些当前的方法包括：基于遗传算法的搜索（Eyeriss映射器）、beam搜索（Halide、Tiramisu）、legal map-pings的并行随机搜索（Timeloop）和并行模拟退火（TVM）。

有两种主要方法来预估mapping的性能和/或能耗：基于深度学习的方法和分析方法。基于深度学习的方法需要训练一个DNN模型，以预测在给定架构上映射的操作指标。Halide、Tiramisu和TVM采用了这种方法。这种模型相对快速和准确。然而基于深度学习的模型往往只适用于被训练过的架构，并且不适合空间探索设计，因为不反映不在训练集中的设计特征（即那些想要发现的特征）。此外，大多数工作都集中在预测性能而不是能耗。

为了在支持的架构范围内提供更大的灵活性，并预估能耗（以及性能），一些工具使用自定义的分析模型。这样的工具包括Eyeriss mapper（使用第6.4节中描述的模型）、MAESTRO和Timeloop。Timeloop与离散能耗评估框架Accelergy [187]配对使用，允许基于模板的描述架构和组件能耗成本，如图6.12所示。后者的能力对于理解像第10章中讨论的新技术的影响尤为有用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8b1b6d540fbd.jpg)

图6.12：Timeloop [192]通过整合Accelergy [187]作为能量估计模型。Timeloop将映射的操作计数发送到Accelergy，并接收能量估计以指导搜索。Accelergy插件允许自定义组件能量估计。这些工具可在http://accelergy.mit.edu/tutorial.html上获得。总之，有各种mapper（或类似映射器的）工具，针对各种DNN加速器架构，以找到最佳mapping。它们通常使用一种循环嵌套（或循环嵌套序列）的变体来描述映射空间中的映射，并使用分析工具来预测性能和能量，以指导映射空间的搜索，以找到最佳映射。

[184] Y.-H. Chen, J. Emer, and V. Sze, Using dataflow to optimize energy efficiency of deep neural network accelerators, IEEE Micro’s Top Picks from the Computer Architecture Conferences, 37(3), May–June 2017. DOI: 10.1109/mm.2017.54. 123, 124, 136, 140

[185] R. M. Karp, R. E. Miller, and S. Winograd, The organization of computations for uniform recurrence equations, Journal of the ACM, 14(3):563–590, 1967. DOI: 10..321418. 126

[186] L. Lamport, The parallel execution of DO loops, Communications of the ACM, 17(2):83–93, February 1974. DOI: 10..360844. 126 

[187] Y. N. Wu, J. S. Emer, and V. Sze, Accelergy: An architecture-level energy estimation methodology for accelerator designs, in International Conference on Computer Aided Design (ICCAD), 2019. DOI: 10.1109/iccad45719.2019.8942149. 130, 142, 143, 181

[188] B. Dally, Power, programmability, and granularity: The challenges of ExaScale computing, in International Parallel and Distributed Processing Symposium (IPDPS), 2011. DOI: 10.1109/ipdps.2011.420. 131

[189] K. T. Malladi, B. C. Lee, F. A. Nothaft, C. Kozyrakis, K. Periyathambi, and M. Horowitz, Towards energy-proportional datacenter memory with mobile DRAM, in International Symposium on Computer Architecture (ISCA), 2012. DOI: 10.1109/isca.2012.6237004. 131

[190] H. Kwon, P. Chatarasi, M. Pellauer, A. Parashar, V. Sarkar, and T. Krishna, Understanding reuse, performance, and hardware cost of DNN dataflows: A datacentric approach, International Symposium on Microarchitecture (MICRO), 2019. 140

[191] B. Pradelle, B. Meister, M. Baskaran, J. Springer, and R. Lethin, Polyhedral optimization of TensorFlow computation graphs, in Workshop on Extreme-Scale Programming Tools (ESPT), November 2017. DOI: 10.-3-030-17872-7_5. 140

[192] A. Parashar, P. Raina, Y. S. Shao, Y.-H. Chen, V. A. Ying, A. Mukkara, R. Venkatesan, B. Khailany, S. W. Keckler, and J. Emer, Timeloop: A systematic approach to DNN accelerator evaluation, in International Symposium on Performance Analysis of Systems and Software (ISPASS), 2019. DOI: 10.1109/ispass.2019.00042. 140, 143
