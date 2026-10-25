---
title: 【预取简介】[Prefetching Introduction]
date: "2022-04-02 00:00:00"
updated: "2022-04-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/【预取简介】[Prefetching-Introduction]/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/491673969
---


这篇文章将会简单介绍目前电脑中使用到的预取技术，包括软件预取和硬件预取的一些简单概念，然后会举例几种简单的硬件预取机制。由于但是是需要内部分享关于预取相关概念，并且是用英文PPT进行介绍，所以我在文章中也保留了原来PPT中英文的介绍部分，如果觉得英文比中文好可以只看英文，但是中文部分会有一些详细的额外讲解。文中可能有些不准确或者遗漏的地方，欢迎评论补充指出，谢谢。

预取是 CPU 使用的一种技术，在指令或数据实际需要之前，将从其在较慢内存中提取到较快的本地Cache中，从而提高执行性能（因此称为“预取”）。

*<strong>Prefetching</strong>* is a technique used by the CPU to boost execution performance by fetching <strong>instructions</strong> or <strong>data</strong> from their original storage in slower memory to a faster local memory before it is actually needed (hence the term 'pre-fetch').

**

#### Why need prefetch?

首先讲下为什么需要预取，这其实是由处理器和内存之前的性能差异越来越大导致的。从下图可以看出，1985年至2010年间，CPU的性能提升的数千倍，可是内存相关的性能只提升了不到10倍。如果等CPU需要执行相关指令或者需要修改数据的时候再从内存中去读取，那么大部分时间都会花费在等待数据上，这是不可容忍的。这时预取的重要性就体现了，将将要访问的内容提前从内存搬移到Cache中，CPU就可以即时拿到所需的内容，避免了等待。当然，如果预取做得不好，是有可能导致性能下降的，由于Cache的大小是很宝贵的，如果预取判断出错，预取的是无用的数据，然后反而把Cache中后续有可能还会用到的数据给Evict了，那么会增加系统的功耗，减低性能。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_7f99133d8fa6.jpg)

The growing disparity between processor and memory performance
#### Prefetching Mechanism

关于预取的机制，可以分为软件预取和硬件预取。软件预取比较好理解，可以在coding的时候有意识地使用预取指令来执行预取，或者是在编译时使用优化的编译选项，无意识地让编译器加入预取指令以提升程序的执行效率。

硬件预取的话是由CPU内部专用的硬件模块来实现的，CPU内部的预取机制会一直观察分析所执行的指令或数据流，从中找出规律，从而提前将可能要被用到的数据放在相关的缓存中，以待被使用。

下图给预取做了一个简单地分类，将会简单介绍一下软件预取，然后后续会着重介绍硬件预取机制。

*Prefetching ***can be accomplished either by hardware or by software.

*<strong>Software-based prefetching</strong>*is typically accomplished by having the compiler analyze the code and insert additional "prefetch" instructions in the program during compilation itself.

*<strong>Hardware-based prefetching</strong>*is typically accomplished by having a dedicated hardware mechanism in the processor that watches the stream of instructions or data being requested by the executing program, recognizes the next few elements that the program might need based on this stream, and prefetches into the processor's cache.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_93bfcc975095.jpg)

预取的简单分类
### Software prefetching 

先简单介绍下软件预取，在我们执行一些需要大量数据的SIMD指令时（如AVX相关指令），如果没有软件预取机制，由于数据之间存在依赖性（后一次的计算需要前一次的执行结果），如果图9-3所示，大部分时间都浪费在等待内存的相关数据，执行单元大部分时间处于空闲状态。

一旦我们在程序中插入了相关的预取指令，比如在计算N-2的数据块时便发出对数据块N的预取操作的指令，假设相应数据需要两次计算周期后才可以取得，那么我们在N-1数据块执行结束后便可以拿到数据块N的数据，不需要任何等待便可以立即执行数据库N的计算。引入了预取指令，使得执行单元和相关存取单元马不停蹄地干活，不给一口喘息的计划，最大化地压榨了相关的硬件资源，我想这是追求CPU性能最大化的Geek喜闻乐见的。如图9-4所示，可以发现图9-3中大量的Bubble不见了，相同的时间内的计算量差不多提升了一倍。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_37ee7e981685.jpg)

在没有预取的情况下执行矩阵运算![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_d1d6ee8ca5ce.jpg)

在有预取的情况下执行矩阵运算**

对于x86处理器，具体执行预取操作的有如下指令，他们之间的区别可以参考下图Intel手册中给出的Fill Cache Detail，由于我不是软件相关的专家，这块就不展开细说了，善用Google的话还是可以找到很多相关内容的。这块应该还有个编译器优化的深坑，往下深究还可以顺便研究下编译器原理，汇编级别的代码优化等。

§T0 (temporal data)—prefetch data into all levels of the cache hierarchy.

§T1 (temporal data with respect to first level cache misses)—prefetch data into level 2 cache and higher.

§T2 (temporal data with respect to second-level cache misses)—prefetch data into level 3 cache and higher, or an implementation-specific choice.

§NTA (non-temporal data with respect to all cache levels)—prefetch data into a non-temporal cache structure and into a location close to the processor, minimizing cache pollution.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_ebaae962e628.jpg)

不同预取指令的执行效果对比
### Hardware prefetching 

下面我们重点介绍一下CPU内部自动实现的硬件预取，这块也是CPU架构学术界研究比较多的领域，有很多相关的学术Papers可以研究，并且对CPU的整体性能影响也很大，一个理想的预取机制可以大大提升CPU执行某些应用的性能。

想要消除内存性能与CPU性能的巨大的gap，相关的预取策略必须考虑以下三点：

- 预取哪块数据：必须能准确地判断所需预取的数据，这个很好理解，无效数据对我们毫无用处，只会白白耗费电源
- 何时开始预取：如果预取不及时，甚至晚于需要相关数据的节点，那么这个策略毫无帮助，浪费硬件资源，预取过早亦同理
- 数据存放在哪：如果相关预取数据存放不合理，将会将后续需要用到的数据踢出CPU，造成性能下降

*Prefetching***—predicting future memory accesses and issuing requests for the corresponding memory blocks in advance of explicit accesses by a processor—is quite promising as an approach to hide memory access latency.

**

§To hide latency effectively, a prefetching mechanism must: 

•(1) Predict the address of a memory access (i.e., be accurate)

•(2) Predict when to issue a prefetch (i.e., be timely)

•(3) Choose where to place prefetched data (and, potentially, which other data to replace)

#### Hardware prefetching two key metrics 

在评价一个预取机制策略的好坏时，我们一般会从覆盖率和准确性两个维度来评判，好的预取策略必须同时在这两个指标上面有亮眼的成绩。

覆盖率很好理解，比如没有预取机制的时候会发生100次Cache Miss，然后引入预取将Cache Miss减少到了30次，意味着该预取策略成功避免了70次Cache Miss，即覆盖率为=70%。

预取的正确率还需要考虑在这个过程中预取机制发出了几次预取操作，接着上面的例子，如果该预取机制总共发出了140次的预取操作，其中70次是有效的预取操作，那么正确率为=50%。

在不同时考虑两个指标的情况下，单纯盲目地提升覆盖率指标是很容易做到的，宁可错杀一千，不可放过一个，这种情况下覆盖率大大提升，但是准确性会极速下降，最终性能不升反降。理想的预取策略应该在取得高覆盖率的同时，确保准确性。

There is typically a trade-off between the aggressiveness of a prefetch strategy and its accuracy; more aggressive prefetching will predict a higher fraction of the addresses actually requested by the processor at the cost of also fetching many more addresses erroneously. 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_b5f673b17ac7.jpg)

Coverage** measures the fraction of explicit processor requests for which a prefetch is successful (i.e., the fraction of demand misses eliminated by prefetching). 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_dc177409d425.jpg)

<strong>Accuracy</strong> measures the fraction of accesses issued by the prefetcher that turn out to be useful (i.e., the fraction of correct prefetches over all prefetches). 

**

Many simple prefetchers can improve coverage at the expense of accuracy, whereas an ideal prefetcher provides both high accuracy and coverage.

#### Hardware prefetching timeliness

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_3c38036fe781.jpg)

除了覆盖率和准确率，时效性也是预取很重要的一个指标，哪怕我们对将要预取的数据做出了正确的判断，但是不能在恰当的时间执行相关预取操作，有可能对性能提升毫无帮助，甚至带来性能的下降。比如过早地进行相关预取地址的读取，在数据还未被使用的时候就被别的数据给淹没最终踢出了CPU，那么等真正需要用到的时候还需要重新从内存中读取，除此之外，除了白白耗费了电力做了一次无用功，还可能把其他有效的数据块从CPU中剔除，因为CPU内的存储空间是十分有限的。如果过完地进行预取，可能并不能掩盖所有的内存延迟，执行单元还需要等待一会，不理想的情况下，还可能由于预取增加了内存访问的流量，导致整体的性能下降。

Even if addresses are predicted correctly, a prefetcher that issues prefetches too early may not be able to hold all prefetched memory close to the processor long enough prior to access.

Prefetching too early**

•Prefetched data might not be used before it is evicted from the processor.

•In the worst case, it may evict other useful information.

**

Prefetching too late**

•Might not hide the whole memory latency.

•In the limit, late prefetches may lead to performance degradation due to additional memory system traffic.

**

#### Instruction & Data prefetching

众所周知，CPU需要指令和指令所需的数据才可以运行起来（废话），除了数据需要经过内存访问，所执行的指令也需要通过内存进行访问，所以我们可以看到CPU内有ITLB，DTLB，L1I，L1D来分别服务指令和数据的访问。指令访问内存的模式比较好琢磨，毕竟只有读取没有写入，读取也比较规规矩矩，无法就顺序执行，不开心了就条件判断一下，跳转一下，所以目前CPU的指令预取策略都做得比较成熟，正确率甚至达到了大于99%的水平。相对来说，数据预取就难以摸透了很多，更少规律性地读写操作，当然也意味着对预测策略设计者来说更具有挑战性。

Instruction prefetching <strong>fetches instructions before they need to be executed. The first mainstream microprocessors to use some form of instruction prefetch were the</strong>Intel 8086 **(six bytes) and the Motorola 68000 (four bytes). In recent years, all high-performance processors use prefetching techniques.

<strong>Data prefetching</strong>fetches data before it is needed. Because data access patterns show less regularity than instruction patterns, accurate data prefetching is generally more challenging than instruction prefetching.

**

The instruction prefetching techniques** include next-line prefetchers, branch-directed prefetching, discontinuity prefetchers, and temporal instruction streaming…

The <strong>data prefetchers</strong>include stride and stream-based data prefetchers, address-correlated prefetching, spatially correlated prefetching, and execution-based prefetching….

**

下面将简单分别介绍指令预取和数据预取几种简单的策略，抛砖引玉，希望可以激发大家对预取策略的兴趣，也去发几篇相关的Paper，提升目前CPU架构的性能，造福人类。

### Instruction prefetching 

提到指令预取，我们先来看下指令读取的几种序列，下图中Fecthed Blocks可以理解为Cahc Line，毕竟Cache中的最小单位就是一个Cache Line。先是最简单的顺序读取，a情形就是这种没有分支没有判断的简单程序，只需要按顺序A-B-C-D地读取即可，对预取机制毫无压力。然后是包含判断和循环b情形，多了判断，导致A跳过了B然后在C中连续读取了两次。除此之外，我们的程序中可能还存在函数的调用，c情形就是把函数调用也考虑进去，并且还包含了a,b中两种情形的复杂情况，其实现实中更多是c这种复杂的情形。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_9ca3c9349eb1.jpg)

 (a) sequential fetch   (b) discontinuity due to an if-statement and a loop   (c) discontinuities due to function calls.  (a) sequential fetch (b) discontinuity due to an if-statement and a loop (c) discontinuities due to function calls. 

Next-line prefetching**

开胃菜我们先来看下最简单的指令预取机制，这里使用了一个叫做Stream Buffer的预取Buffet，可以理解成是一个全关联Cache，每次CPU请求一个Cache Line的时候，该模块就会把下个Cache Line的内容的读取请求发往下级Cache Level，以提前Ready。当然这种简单的机制只能应付最简单的a情形，一旦出现了分支/跳转之类的指令，这种就有点无能为力了。

This picture depicts the anatomy of the next-line prefetcher in a modern processor pipeline. 

An instruction prefetch buffer or stream buffer, a small associative buffer, stores prefetched instruction cache blocks retrieved from lower cache hierarchy levels. Each time a block from the prefetch buffer is explicitly requested by the processor, it is transferred to the cache and the next consecutive block is prefetched from the memory.

**

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_3a8ffc2eef5a.jpg)

Branch-predictor-directed prefetchers**

那么遇到分支指令我们有什么相关的机制可以解决呢？首先简单介绍一下FDIP这种预取机制，该机制在Branch Predictor模块和Instruction Fetch模块之间插入了一个FTQ的模块，然后会经过一个filter把一部分地址过滤掉（比如已经存在ICache中的？），然后进入到PIQ中，这时就会将PIQ中的地址发往L2 Cache，然后将取回的Cache Line放入一个全相联的Cache中。

**

Fetch-directed instruction prefetching (FDIP) **is one of the best branch-predictor-directed techniques. 

FDIP decouples the branch predictor from stalls in the L1 instruction fetch unit, introducing the fetch target queue (FTQ) between these two structures. The prefetcher uses the addresses in the FTQ to fetch instruction blocks from the L2 cache and place them in a small, fully associative buffer, overlapping prefetches with other L1 instruction fetches. The buffer is accessed by the instruction fetch unit in parallel with the L1 cache.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_4661a4620c2e.jpg)

**

DISCONTINUITY PREFETCHING**

前一种预取发生在Branch Predicate之后，可能有点滞后。然后我们再来看一种不连续预取机制，该机制维护一张不连续表，该表格会记录每次分支最终跳转的位置，并且记录这个位置的Cache Line地址。要注意的是这里的tag保存的是PC的值，而不是译码之后的指令值，所以在取指阶段拿到PC值的时候便可以执行预取操作，整个流程提前了很多。

**

Discontinuity predictor maintains a table of fetch discontinuities mapping the PC of the block containing the taken branch to the branch target. 

As a next-line instruction prefetcher explores ahead of the fetch unit, it consults the discontinuity table with each block address and, upon a match, prefetches the discontinuous path in addition to the sequential one.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_37430e7a8638.jpg)

Temporal instruction fetch streaming (TIFS)**

我们再看看指令预取的另一种思路，从L1I Cache这个模块入手。TIFS机制会维护一个L1I Cache Miss Log，可以简单理解为把L1I犯错没有做好一系列错误记录都归档，然后当L1I再次犯错了，会通过一个Index Table去索引，看下能不能在Log中发现这个没有找到的Cache Line的身影，如果找到了，就会把在记录中这个Cache Line后续要读取的地址发往L2，提前拿到Buffer中去。那么下次L1I就很有可能还是需要同样地址的内容，这时就可以直接从Buffer中获取而不用劳烦L2大哥了。这种机制尤其对那种复杂刁钻的指令序列流有效，哪怕你再不连续，只要你敢来第二次，我们这边会有案底记录，下次我就按照你之前的作案手法守株待兔便可。

**

TIFS is designed to address the lookahead limitations of helper-thread and fetch/discontinuity-based mechanisms. Rather than explore a program's control flow graph, TIFS predicts future instruction-cache misses directly, through recording and replaying recurring L1 instruction miss sequences. 

L1 instruction cache misses are recorded in an instruction miss log, a circular buffer maintained either in dedicated storage or within the L2 cache.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_886003a4244b.jpg)

#### Summary of Instruction prefetching 

再看一个对Instruction Prefetching的简单总结，当然这里肯定收录不全，目前肯定还有很多优秀的指令预取机制，但是可以看出一些有效的机制准确率已经高达99%了，最右侧所消耗的硬件资源估计是晶体管数量。如果大家感兴趣进一步了解的话，可以直接Google这几个机制的名字，就可以直接找到相关的论文。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_906969b64e8e.jpg)

### Data prefetching

简单介绍完指令预取，再简单介绍下数据相关的预取机制，由于数据访问的模式相对指令来说更加复杂多变，尤其是目前还有很多遍历执行和通过指令链接的数据结构。当然，同时这也意味着有更大更丰富多彩的设计空间，设计人员可以天马行空地设计他们的数据预取机制，只要最终的结果让人满意。

我们大致可以将数据预取简单分为四类：

- 第一类就是简单根据Cache Line的访问步幅来进行下一个Cache Line的预取，可以简单认为就是指令预取中的Next-line预取。
- 第二类是针对重复遍历的序列进行记录，以发现重复模式时进行预取，这种对指针的数据比较有效。
- 第三类时针对常规的数据结构进行针对性地设计相关预取策略。
- 第四类在CPU的乱序阶段前就进行预取相应的识别和预取，故不依赖内存地址访问的规律性和重复性。

Whereas code tends to be static and hence easy to prefetch (with the exception of recent virtualization and just-in-time compilation mechanisms, which tend to thwart instruction prefetching), data structures morph over the course of execution, causing traversal patterns to change**. Data access patterns can be far more diverse, particularly in pointer-linked data structures that enable multiple traversals. 

This greater complexity in access patterns has led to a rich and diverse design space for data prefetching schemes that is much broader than instruction prefetchers.

**

We divide the design space of data prefetchers into four broad categories. 

First are prefetchers that rely on simple stride patterns, which directly generalize next-line instruction prefetching concepts to data. 

Second are those that rely on repetitive traversal sequences, often exploiting the pointer relationships among addresses. 

Third are those that rely on regular (yet potentially non-strided) data structure layouts. 

Finally, are mechanisms that explore ahead of the conventional out-of-order instruction window, and hence do not rely on regularity or repetition in the memory access address stream.

Stride and stream prefetchers**

先来看一个在PC阶段就进行预取操作的数据预取机制，该机制每次会记录最后一次访问的地址，并且还会记录最后两次访问地址直接的间距。只要该模块连续两次观察到相同的间距时，便会用最后一次访问的地址加上相应的部分作为要预取的地址进行提前的预取。

**

This reference prediction table is a tagged, set-associative structure that uses the load instruction PC as the lookup key. Each entry holds the last address referenced <strong>by that load and the difference in address between the</strong>last two preceding references<strong>. Whenever the same stride is observed</strong>twice** **consecutively**, the last reference address and stride are used to compute one or more additional addresses for prefetch. Subsequent accesses that continue to match the recorded stride will trigger additional prefetches. 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_10121c41b007.jpg)

Baer and Chen&amp;amp;#39;s reference prediction table**

Address-correlated prefetching**

由于前一种机制通常对基于指针的数据结构效果不大，我们再来看一种在数据读取阶段触发的预取机制，该触发机制会记录读取的数据地址后续会访问的地址，一般会保存四个候选地址。在访问某个地址时，在相应的表格中查找，如果命中，可以将候选地址中的全部取出，当然也有做出调整，只取出访问频率最高的那一个。该策略等于维护了一个地址访问记录日志，把某个地址后续可能会访问的地址记录下来，当然出于资源的限制，只能记录少数的地址和少数的候选人。

**

Whereas stride prefetchers are typically ineffective for pointer-based data structures**, such as linked lists, the second class of prefetcher we consider is specifically designed to target the pointer-chasing access patterns of such data structures.

The Markov prefetcher is organized as an on-chip set-associative table indexed by trigger address. An entry in the table contains the set of successor addresses to prefetch and optional confidence or replacement policy information; four successors is a typical width. 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_432cd72d1992.jpg)

Markov prefetcher**

Spatially correlated prefetching **

关于空间相关性预取机制利用数据访问的规律性和重复性，这种机制对面向对象编程中的对象，固定大小字段的数据库数据等有规律的数据块进行访问时比较有效。而且目前许多高级编程语言会将数据结构与Cache Line和页边界进行对齐，以提升其数据访问的规律性，更容易发挥这种预取机制的，有其用武之地。具体的实现可以直接找到很多相关的论文，这里就不展开细说了。

**

Spatially correlated prefetching mechanisms exploit regularity<strong>and</strong>repetition** in data layout. 

Spatial correlation arises due to <strong>regularity</strong> in <strong>data structure layouts</strong>, as programs frequently use data structures with fixed layouts in memory (e.g., objects in object-oriented programming language, database records with fixed-size fields, stack frames). Many high-level programming languages align data structures to cache-line and page boundaries, further increasing layout regularity. Strided access patterns are a special case of spatial correlation.

**

DELTA-CORRELATED LOOKUP**

与Delta相关的查找预取机制，这里简要介绍使用GHB这种数据预取机制，更详细关于这种机制的介绍可以直接参考相关的论文。可以简单理解为这种机制会维护一个全局历史信息的Buffer，然后设计者可以根据自己的喜好，比如选择用Delta值进行索引，再结合Miss的数据地址，得到要进行预取的地址进行预取。

**

One of the most effective known prefetchers from both a storage efficiency and coverage perspective is the program counter-localized delta-correlating variant of the global history buffer **(GHB PC/DC).

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_33429ee50a80.jpg)

**

Execution-based prefetching**

最后再简要介绍还有一种不依赖于数据规律性/重复性，也不依赖于数据结构布局的基于执行的预取策略。这种策略会尝试在执行数据存取操作之前进行预取操作，利用CPU中的Stall周期和空闲的硬件资源，提前在执行之前把将要之前存取的指令地址提前在Cache中准备好，有点提前找打考试内容并打小抄的感觉。

**

The final category of data prefetcher we briefly address relies neither on repetition in miss sequences nor in data layouts; rather execution-based prefetchers seek to explore the program’s instruction sequence ahead of instruction execution and retirement to discover address calculations and dereference pointers. 

The key objective of such prefetchers is to run faster than instruction execution itself, to get ahead of the processor core, **while still using the actual address calculation algorithm to identify prefetch candidates. 

As such, these mechanisms do not rely on repetition at all. Instead, they rely on mechanisms that either summarize address calculation while omitting other aspects of the computation, guess at values directly, or leverage <strong>stall cycles and idle processor resources</strong>to explore ahead of instruction retirement. 

#### Summary of Data prefetching 

最后我们看下目前几种数据预取策略的总结，可以看到，该表格中最好的预取算法也仅仅达到50%的准确率，当然这是比较老的汇总了，目前估计有更有效的数据预取策略。但是总的来说，由于数据访问的复杂性远大于指令的读取，所以准确率不可能像指令读取那样达到惊人的99%，所以在这上面还有很大的研究价值。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0de77e82d961.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_fcf3d6bb2096.jpg)

以上只是对预取的一个简单的介绍，具体细节大家也可以直接找到相关的Paper深入了解，还有很多优秀的预取策略没有提到，Google上一搜可以找到一大堆，如果想要深入系统地了解硬件预取的话，可以看看A Primer on Hardware Prefetching这本书，网上可以直接找到电子版。

#### References

Intel HW Prefetchers- An Overview

https://en.wikipedia.org/wiki/Cache_prefetching

A Primer on Hardware Prefetching
