---
title: (1 封私信) 【目录序言翻译】硬件预取技术导论《A Primer on Hardware Prefetching》
date: "2021-07-20 00:00:00"
updated: "2021-07-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/硬件/【目录序言翻译】硬件预取技术导论《A-Primer-on-Hardware-Prefetching》/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/373038275
---


### 序言

自1970s它们的诞生以来，基于微处理器的数字平台一直遵循着摩尔定律，即在相同面积上，大约每两年密度就翻一番。然而，微处理器和存储器制造技术一直在以两种截然相反的方式利用这种密度的增加。微处理器的制造技术专注于提高指令的执行速度，而存储器的制造技术则主要关注容量的提高，速度的增加可忽略不计。这种处理器和内存间的性能差异趋势导致了一种被称为“存储墙”的现象[1]。

为克服存储墙，设计者们引入了带有缓存（cache）的存储器体系层次（memory hierarchy），每层的延迟与容量都经过了权衡。缓存基于内存访问的局域性原理来缓解处理器与内存间的性能差距。但不幸的是，存在许多重要的工作负载会表现出不利的内存访问模式。这些模式会难住现代高速缓存层次结构中的简单更新策略（这些策略规定了指令和数据在缓存层次间移动的规则）。因此，对于在较高层缓存（L1、L2）中不存在的内存块，处理器往往需要花费大量时间获取它们。

预取（prefetching）——预测未来的内存访问，并在处理器显式访问前对就相应内存块发出请求。——其作为一种隐藏内存访问延迟的方法是非常具有前途的。已经存在了大量用于预期的软硬件方法。许多针对简单存取模式的硬件预取机制已被纳入现代微处理器中，以预取指令与数据。

本文概述了这些年来提出的各种类型的指令、数据的硬件预取器，并给出了现代微处理器中采用的技术实例。尽管本书所涉及的技术并不全面，但它们涵盖了每类技术的重要实例，因此，本书对于那些想熟悉该领域的人来说会是一本合适的评述。我们会涵盖指令和数据的预取，但讨论的许多技术也可能同样适用于TLB（Translations lookaside buffer）的内存预取，例如[2]。

本书分为四章：

- 第一章介绍存储层次结构和预取的一般概念
- 第二章讨论指令预取技术
- 第三章讨论数据预取技术
- 第四章我们提供一个总结
指令预取技术包括：

- next-line prefetchers（下一行预取）
- branch-directed prefetching（分支定向的预取）
- discontinuity prefetchers（不连续的预取）
- temporal Instruction streaming（时间域上的存储流）
数据预取器包括：

- stride and stream-based data prefetchers（基于跨步和流的数据预取器）
- address-correlated prefetching（基于地址相关性的预取器）
- spatially correlated prefetching（基于空间相关性的预取器）
- execution-based prefetching（基于执行的预取）
我们假设读者已熟悉有关处理器架构和缓存的基础知识，并对更高级的主题如乱序执行有一定了解。本书列举了硬件预取器设计的关键问题，并对各种预取技术进行了高层次描述。为获得更完整的微架构细节与预取方案的性能评估，我们建议读者参阅书中所引用的出版物。

<strong>关键词：</strong>hardware prefetching（硬件预取）, next-line prefetching（下一行预取）, branch-directed prefetching（分支定向的预取）, discontinuity prefetching（不连续的预取）, stride prefetching（跨步预取）, address-correlated prefetching（基于地址相关性的预取）, Markov prefetcher（马尔可夫预测器）, global history buffer（全局历史缓冲区）, temporal memory streaming（时间域上的存储流）, spatial memory streaming（空间域上的存储流）, execution-based prefetching（基于执行的预取）

原书：《A Primer on Hardware Prefetching》Babak Falsafi, Thomas F. Wenisch（Morgan&Claypool Publishers - Synthesis Lectures On Computer Architecture）出版时间：May 2014
个人汉化了此书的目录与前言，以便大家在搜索相关中文关键词时能获得参考，但也仅供参考。如果帮到了您，那就再好不过了，希望能留个赞支持一下！（有支持才有动力嘛）
note：本文包括很多算法或方法，这些算法或方法的名称也被我翻译了，但在使用时请优先采用英文原名，因为这些名词仅仅只是我的个人翻译，仅供参考。> Fetch被译为“获取”。
术语Directed被译为“定向”，意思是通过某个事物来确定方向。例如Fetch-Directed Prefetching的意思就是通过“Fetch”来确定预取方向。XX-Directed的意思就是基于“XX”来确定方向。

### 目录

- ■■1 引言 Introduction

- ■1 存储墙 The Memory Wall
- ■1 预取 Prefetching

- 1 预测地址 Predicting Ardresses
- 2 提前预取 Prefetch Lookahead
- 3 预取值的放置 Placing Prefetched Values

- ■■2 指令预取 Instruction Prefetching

- ■1 下一行预取 Next-Line Prefetching
- ■2 获取定向的预取 Fetch-Directed Prefetching
- ■3 不连续的预取 Discontinuity Prefetching
- ■4 预测未来的预取 Prescient Prefetching
- ■5 时间域取指流 Temporal Instruction Fetch Streaming
- ■6 返回地址栈定向的预取 Return-Address Stack-Directed Instruction Prefetching
- ■7 主动取指 Proactive Instruction Fetch

- ■■3 数据预取 Data Prefetching

- ■1 数据的跨步和流预取器 Stride and Stream Prefetchers for Data
- ■2 基于地址相关性的预取器 Address-Correlating Prefetchers

- 1 跳转指针 Jump Pointers
- 2 成对两者间的相关性 Pair-Wise Correlation
- 3 马尔可夫预取器 Markov Prefetcher
- 4 通过预取深度改善前瞻性 Improving Lookahead via Prefetch Depth
- 5 通过死快预测改善前瞻性 Improving Lookahead via Dead Block Prediction
- 6 片上存储器寻址的局限性 Addressing On-Chip Storage Limitations
- 7 全局历史缓冲区 Global History Buffer
- 8 流链 Stream Chaining
- 9 时间域上的存储流 Temporal Memory Streaming
- 10 不规则流的缓冲区 Irregular Stream Buffer

- ■3 基于空间相关性的预取器 Spatially Correlated Prefetching

- 1 Δ相关性查找 Delta-Correlated Lookup
- 2 PC局域性/Δ相关性的全局历史缓冲（GHB PC/DC） Global History Buffer PC-Localized/Delta-Correlating (GHB PC/DC)
- 3 代码相关性查找 Code-Correlated Lookup
- 4 空间足迹预测 Spatial Footprint Predicction
- 5 空间模式预测 Spatial Pattern Prediction
- 6 隐形预取 Stealth Prefetching
- 7 空间存储流 Spatial Memory Streaming
- 8 时空存储流 Spatio-Temporal Memory Streaming

- ■4 基于执行的预取 Execution-Based Prefetching

- 1 算法汇总 Algorithm Summarization
- 2 辅助内存和辅助内核的方法 Helper-Thread and Helper-Core Approaches
- 3 超前执行 Run-Ahead Execution
- 4 上下文恢复 Context Restoration
- 5 计算分摊 Computation Spreading

- ■5 预取的调制与控制 Prefetch Modulation and Control
- ■6 软件方法 Software Approaches

- ■■4 总结 Concluding Remarks

### 引言

<strong>1.1 存储墙</strong>

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_e44daf964a99.jpg)

图1.1，处理器与内存间的差距越来越大，来自[3]图1.1显示了过去四十年间，处理器和内存间日益扩大的性能差距。在这段时期，微架构、电路和制造技术的创新导致了处理器性能的指数增长。与此同时，DRAM则主要受益于密度的增加，其速度只在名义上有所提高。虽然未来的预测表明，处理器性能的提高可能不会再以同样速度进行下去，但目前的性能差距将使我们有必要在未来几年内采用相关技术，以应对漫长的内存访问延迟。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_4f6edfb83fc7.jpg)

图1.2，一个现代的存储层次计算机架构师们尝试通过建立高速缓冲存储器（cache）的层次结构来弥补这一性能差距。图1.2就展示了一个现代计算机的cache层次结构，该层次由若干层级cache组成，每层都在延迟与容量间经历了权衡。该层次结构的目的主要是通过在cache中完成大部分内存访问，减少较慢的DRAM访问的次数，以改善平均内存访问时间。靠近核心的cache会更小但更快，以有效降低访问延迟。我们将最靠近核心的cache层级称为一级缓存（L1），然后依次对cache层级进行编号，最后一级cache称作LLC（last level cache）

层次结构依赖于两种类型的内存访问局域性：时间局域性和空间局域性。时间局域性是指最近被访问的内存块很可能会被再次访问。空间局域性是指内存中近邻的指令或数据通常是相关的，因此被访问位置周围的位置也很可能会被访问。

尽管局域性原理非常强大，但它依赖于两个基本前提，而这两个前提不一定适用于所有类型的工作负载（workload），尤其是在缓存层次结构越来越深的情况下。第一个前提是：缓存的大小适合于所有的工作负载和访问模式。事实上，现代工作负载的容量需求变化是高度动态的，不同工作负载所适合的缓存层次容量/速度权衡通常不同。第二个前提是：分配和替换缓存项的单一策略适用于所有工作负载（通常按需分配和替换最近未使用项）。同样，内存访问模式也可以是高度动态的，因此很难说哪个缓存项分配/替换策略能一直或在所有情况下表现良好。

关于内存墙，无论是算法、编译器、系统软件还是硬件，都已经提出了相当多种不同的技术。这些技术包括缓存无关的算法（cache-oblivious algorithms）、编译器级的代码/数据分布优化（code and data layout optimizations），以及以硬件为中心的方法。在本书，我们将集中讨论基于硬件的指令/数据预取技术。为更全面地处理存储系统，我们建议读者参阅Jacob的各个综合讲座[4]。

<strong>1.2 预取</strong>

隐藏内存访问延迟的一种办法就是预取（prefetch）。预取是指，预测后续的内存访问，并提前完成该访问，以隐藏有关的长延迟行为。在极限情况下（预取总是及时且正确的），内存访问不会导致任何额外开销，且内存性能似乎与处理器寄存器相当。但实际上，预期并不总是及时或正确，而延迟或不准确的预取则会浪费能源，最坏情况下还会影响性能。

为有效地隐藏延迟，预取机制必须：

- 预测内存访问的地址（即，准确accurate）
- 预测何时发出预取（即，及时timely）
- 选择暂存预取数据的位置（以及可能要替换其它数据）
<strong>1.2.1 地址预测</strong>

正确预测内存地址是预取机制的一个关键挑战。若地址预测正确，预取机制就有机会提前获取有关内容并隐藏内存访问延迟。但如果不能准确预测地址的话，预取就可能会污染cache（即预取的cache块会逐出那些潜在有用的cache块），同时还会在内存系统中产生额外的通信量与争用。

内存地址预测有时并不简单。数据引用可以是对独立变量的访问，也可以是对数据结构元素的访问，引用的性质则取决于程序在特定执行实例中所执行的操作。某些算法和数据结构的访问模式很好预测（例如按顺序读取数组的每个元素）。但也存在复杂情况，包括但不限于对变量访问的交错，多个数据结构和控制流的遍历（例如搜索一个二叉树）。

类似地，指令引用将取决于程序是连续执行还是执行分支（即，在不连续后）。顺序指令的获取很简单，但程序中控制流行为及其可预测性会影响指令预取的有效性。

地址的准确预测还取决于执行预取的cache层级。在最高层级中，处理器和L1间的接口将包含所有内存引用信息，基于这些信息可实现高精度的预取，但也可能造成资源浪费，去记录那些反正就会在L1命中的访问的预取信息。与之相反，在较低的层级中，访问序列会被过滤（如果在高层cache中命中，信息就不会下行到低层），而且只能观察到来自较高层级的缺失（miss）。所以，其它有效的预取算法也可能因此被访问序列的扰动所影响，这些扰动来自于cache块的放置与替换策略等方面的影响。

最后，预取策略通常还需要在策略（strategy）和准确度（accuracy）间权衡；更激进的策略会进行更多的预测，但代价是会获得更多错误的地址。因此，许多对预取器的评估研究报告都会涵盖两个关键指标，它们将共同描述预取器在预测地址方面的有效性：

- 覆盖率（coverage）度量了显式处理器请求中被预取成功的比例（即，通过预取来消除请求未命中的比例）。
- 准确度（accuracy）度量了预取器所发出的有效访问的占比（即，所有预取中有效预取的占比）。
许多简单的预取器都能以牺牲准确度为代价来提高覆盖率。而理想的预取器则可同时提供较高的准确度与覆盖率。

<strong>1.2.2 预取的前瞻性</strong>

理想情况下，预取机制将提前发出预取，并为预取数据提供足够的暂存空间，从而隐藏所有的内存访问延迟。但在实践中，准确预测向来是一个重大的挑战。即便地址预测正确，过早的预取也将意味着必须在数据被使用前一直在处理器附近暂存它们。在最好的情况下，过早预取是无用的，因为预取信息会在使用前被从处理器中移除。最坏情况下，它则可能会驱逐其它有用信息（例如其它预取块或cache中的有效块）。若预取较晚，则其将暴露内存访问的延迟，从而降低预取的有效性。极端情况下，出于额外的内存系统流量，以及对延迟敏感的关键访问需求造成的影响，较晚预取可能导致性能下降。

<strong>1.2.3 预取值的暂存</strong>

最简单，也可能是最古老的软件策略就是直接将预取值加载到处理器的寄存器中，就如其它显式加载操作一样。许多架构，尤其是现代的乱序架构，在LOAD指令发射后并不会暂停执行，而是在不得不需要用到LOAD所加载的数据时，才暂停相关执行。

这种预取策略通常被称为<strong>绑定预取（binding prefetch）</strong>，因为在发出预取时，数据的后续使用价值将会被绑定。这种方法存在很多缺点：

- 它会消耗宝贵的处理器寄存器空间
- 它会强制硬件进行预取，即便内存系统的负载很重
- 在预取地址错误时会导致语义上的困难（例如，预取的无效地址是否会导致内存保护故障（fault）？）
- 不清楚如何将这种策略用于指令
与此相反，大多预取技术都会将预取值直接放入cache，或用于增强cache层次的补充缓冲区（supplemental buffer）中，并同时进行访问。在多核和多处理器系统中，这些cache和buffer还将参与cache一致性协议，因此预取值的存储位置可能在随后访问的期间发生改变；硬件需要保证被访问的值是最新的。这种预取策略被称作<strong>非绑定策略（nonbinding）</strong>。对于这些方案，预取将只是一种纯粹的性能方案，不影响程序语义。

我们在本书中考虑的所有硬件预取器都属于后者（非绑定）。它们主要的区别在于预取值的放置和替换的策略设计。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_4b68050210f6.jpg)
