---
title: ARM平台性能分析：使用perf c2c分析数据共享问题 - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-22/ARM平台性能分析-使用perf-c2c分析数据共享问题-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 82794d8e-14e5-4db1-9ba7-e841fbc27a66
---

# ARM平台性能分析：使用perf c2c分析数据共享问题 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/arm-perf-c-2-c-18f9fafb727)
[Read Original](https://zhuanlan.zhihu.com/p/698723845)



发布于 2024-05-20 12:18・IP 属地广东・来源官方网站 ，编辑于 2024-05-21 09:11・IP 属地广东・来源官方网站

## 1\. 背景

后续的几篇文章作为TMA的方法论的扩展，继续介绍使用Linux perf工具通过性能监控单元（SPU）在ARM平台上分析系统性能的方法。这里利用了Arm 处理器中实现的 SPE 功能的其他分析技术。

关于自顶而下的方法论的介绍，请参考下面的文章。

统计分析单元 （SPU）是一种 Arm® 架构功能扩展，支持在 CPU 中增强指令执行分析。Arm 统计分析扩展 （SPE） 功能提供了硬件辅助的 CPU 操作分析机制，与使用PMU事件进行性能分析和调优用例的传统采样机制相比，它支持更详细的分析功能。SPE 功能扩展作为 Armv8-A 架构的一部分，从 Arm v8.2 开始提供支持。

统计分析单元 （SPU） 记录在 CPU 后端采样的操作执行关键数据点和跟踪情况。SPE 采样过程是作为 CPU 流水线中指令执行路径的一部分内置的。每个采样操作都会生成一个采样记录。每条记录由多个数据包组成，其中包含关键操作执行信息，期中包括： 

```text
* 操作的 PC 值
* 访问的数据地址
* 流水线延迟
* 触发的PMU 事件
* 时间戳
```


SPE 还通过提供额外的执行详细信息（如分支错误预测、缓存未命中、内存访问延迟以及提供额外的执行细节）来帮助详细分析性能关键型操作（如分支、内存访问和 SVE）。这些操作会对给定微架构的高效执行产生巨大影响。例如，SPE 提供的内存访问分析功能对于优化和调整内存带宽和延迟繁重的工作负载非常有用。

## 2\. 数据共享分析

SPE分析提供了有关内存操作执行的关键分析，这些操作可用于识别多线程工作负载中的数据共享问题。

下面案例演示了如何将SPE用于数据共享分析，以帮助改善由多个线程处理同一数据集而导致的性能问题，因为这种情况可能会由于缓存一致性机制的开销而导致延迟问题。下面我们具体介绍Linux perf c2c 工具如何使用 SPE 数据来查找错误共享问题。

伪共享是多处理器系统中常见的性能问题之一。当一个处理器修改另一个处理器使用的同一缓存行上的数据项时，就会发生这种情况，而另一个处理器正在处理同一缓存行的不同部分。这意味着，一个 CPU 修改的缓存行会使另一个 CPU 的缓存副本失效并进行更新，即使它们各自正在访问缓存行的不同部分并且不关心缓存行的更新部分。

在下图中，线程 0 和 1 在不同的 NUMA 节点上运行。两个线程都将相同的内存块加载到它们的缓存行中，即使它们在此缓存行中使用不同的数据元素（由红色和蓝色元素表示）。例如，当线程 0 以红色更新其数据时，会发生伪共享，这会导致线程 1 也更新其缓存行，即使它从不引用红色数据。这种缓存失效成本高昂，如果线程共享缓存行的情况很多，可能会影响整个系统的性能。当共享缓存行的内核位于不同的 NUMA 节点上时，此性能成本会更差。

![](https://proxy-prod.omnivore-image-cache.app/585x457,sHUaSj5jSPUOLh29gAzF07klDYSSFnH6UNHs0uKxuP7s/https://pic1.zhimg.com/v2-6994ad65f37fd405397ba92195a41388_b.jpg)

图1：在多个线程之间伪共享缓存

### 2.1 perf c2c 简介

为了检测多线程应用程序中的伪共享方案，Linux perf 工具提供了 c2c 功能，它代表 cache to cache。在 Arm 机器上，此性能工具功能是通过分析来自 SPE 的内存访问数据来实现的，特别是数据源信息，以及使用 SPE 进行内存访问分析中介绍的 SPE 数据包中捕获的数据地址和指令 PC 地址。Perf c2c 已在Linux v6.0及其之后的内核上的 Arm 计算机上启用。

perf c2c 工具报告提供以下信息，这些信息可以帮助识别伪共享情况： 

```text
* 可能存在伪共享问题的缓存行地址。
* 由不同进程访问的缓存行中的数据偏移量。
* 访问缓存行的指令地址。
* 涉及到的NUMA 节点。
```


### 2.2 使用 perf c2c 进行伪共享分析

为了演示如何在 SPE 支持的基于 Aarch64 的平台上使用 perf c2c 进行伪共享分析，这里使用了 github 存储库中的示例代码：https://github.com/joemario/perf-c2c-usage\-files/blob/master/false\_sharing\_example.c

<strong>2.2.1 代码介绍</strong>

如果存在多个线程，则 false\_sharing\_example.c 中的代码会根据不同 NUMA 节点上的用户输入创建多个线程。所有这些线程都访问如图2所示定义的相同数据结构 buf。在 buf 定义中有一个名为 NO\_FALSE\_SHARING 检查的宏。当 NO\_FALSE\_SHARING 未定义时，pad 字段的大小为 1 字节（在 Arm64 上为 8 个字节），强制锁定和读取器字段位于同一缓存行中。但是，当定义 NO\_FALSE\_SHARING 宏时，pad的大小为 5 个字长，它将锁和读取器字段存储在不同的缓存行中。

![](https://proxy-prod.omnivore-image-cache.app/1212x801,sXuHIWHB7NEWnizt_uWBamP0nPYkiooSnfTiRaPzEA88/https://pic3.zhimg.com/v2-f132ae4e43e35e5d64f590c4dbccbf42_b.jpg)

图2：伪共享示例代码段

代码中的线程分为两组：锁定线程和读取线程。所有线程都运行名为 read\_write\_func（） 的相同函数。下图显示了该函数的关键逻辑，该逻辑显示了线程在锁定线程或读取器线程时可以采用的不同路径。锁线程在结构中设置 lock0/lock1 字段，而读取器线程读取 reader1/reader2/reader3/reader4 字段。

![](https://proxy-prod.omnivore-image-cache.app/727x747,svMhwWuj9n87A89ZsJkxC9JgRe0j_gk7PxnOXp1nl1X4/https://pic2.zhimg.com/v2-0215cc61def57e8800d4a62c25c51071_b.jpg)

当使用 NO\_FALSE\_SHARING undefined 编译 false\_sharing\_example.c 时，在同一缓存行中访问不同数据元素的线程之间会发生共享伪共享情况。可以使用 perf c2c 工具检测它，如下面运行测试所示。

<strong>2.2.2 运行测试</strong> 

为了在实验中多次运行程序，稍微修改了原始 false\_sharing\_example.c 以运行更多迭代，如下所示：

![](https://proxy-prod.omnivore-image-cache.app/927x312,sk_NiUUnw3ljFG84WXbg3t-vCqjNq5NFkm1RaXq5CG9k/https://pic3.zhimg.com/v2-1d7840cff600bd9b6d4b462af4415d7a_b.jpg)

下一步是在未定义NO\_FALSE\_SHARING的情况下编译代码，使用伪共享方案。

现在，运行测试并记录执行时间以进行性能评估。由于测试机器只有一个 NUMA 节点，参数 1 传递给可执行文件，因此导致在不同的内核上运行一个读取器线程和 1 个锁定线程。

```angelscript
time ./false_sharing 1  
         348 mticks, reader_thd (thread 1), on node 0 (cpu 8).  
         467 mticks, lock_th (thread 0), on node 0 (cpu 7).  

         real  0m18.684s
         user  0m32.617s
         sys   0m0.004s   
```

接下来，使用 perf c2c 分析false\_sharing程序：

```elm
$ perf c2c record -- ./false_sharing 1  
$ perf c2c report --stdio
```

<strong>2.2.3 perf c2c 输出</strong>

使用 Linux perf report 实用程序来查看 perf c2c 分析，它提供了三个输出部分。我们首先讨论如何使用 perf c2c 输出，然后仔细查看源代码与 perf c2c 输出的伪共享检测。

<strong>2.2.4 Perf c2c - 输出部分1</strong>

下图显示了 perf c2c 执行详细信息。perf c2c 输出显示了使用包含以下筛选器的命令为此分析执行的arm\_spe\_0分析：

```angelscript
arm_spe_0/ts_enable=1,pa_enable=1,load_filter=1,store_filter=1,min_latency=30/ 
```

perf c2c 工具依赖于 SPE 数据源信息中的对端侦听指示来检测线程之间的数据共享。

![](https://proxy-prod.omnivore-image-cache.app/1186x366,s3HRpXasa9LxELmKkPysUxVYqXbgFTYs6ujWjGuSy2M4/https://pic2.zhimg.com/v2-5f138377cd82a6d6c59dba9cbfd2ca4d_b.jpg)

<strong>2.2.5 Perf c2c - 输出部分2</strong>

下图的显示了共享数据缓存行表，其中列出了检测到 SNOOP（可能的伪共享）的所有缓存行。缓存行按 Peer Snoop 百分比值进行排序。

![](https://proxy-prod.omnivore-image-cache.app/1197x388,sDJzT-dpvQERDqghbLYFsJdpHlS5vNc-RqNnJWJ7j_z4/https://pic1.zhimg.com/v2-cd805609d529e0f7def09a64c764c5dc_b.jpg)

<strong>2.2.6 Perf c2c - 输出部分3</strong>

下图显示了共享缓存行分布表情况。这为检测到 SNOOP 的每个缓存行提供了详细信息。对于像 0xaaaab26320c0 这样具有最高侦听命中百分比的缓存行，它会在此缓存行中提供由不同线程访问的偏移量。这里还提供了线程的代码地址，可以找到对应的源代码以进行检查。

![](https://proxy-prod.omnivore-image-cache.app/1142x677,s05k4NB9q3NiKpiOa7AQGkEJlh-2eumzrB5j9MSw8wqs/https://pic4.zhimg.com/v2-778dfaf2989771b30fb31c0539283a17_b.jpg)

Peer Snoop分为两种类型：

```text
* Rmt 代表远程，这意味着不同的 CPU 插槽之间存在窥探命中。
* Lcl 代表同一 CPU 插槽中的本地缓存侦听。
```


输出数据还提供了更多详细信息，包括以下内容： 

```text
* Node是指 CPU 插槽。由于测试平台只有一个 CPU 插槽，因此这里只能看到本地 SNOOP 节点 0。
* Offset显示缓存行内访问的数据偏移量。
```


<strong>2.2.7 使用 perf c2c 输出进行代码分析</strong>

在上段输出部分3的“共享缓存行分布表”示例输出中，缓存行地址 0xaaaab26320c0 指向 false\_sharing\_example.c 中的第175行，这是触发大量本地到对端侦听的代码。这表示可能存在缓存行伪共享，可以通过访问缓存行偏移量进行检查以确认。可以对缓存行地址0xaaaab2632080进行类似的观察分析。

如上示例输出信息，源文件 false\_sharing\_example.c 中的第 175 行读取 buf2 的 reader1 字段，而第 166 行设置 buf2 的 lock1 字段。如前所述，这两行代码由不同内核上的不同线程执行，这些线程访问同一缓存行中的不同字段。因此这是一个伪共享案例，perf c2c 通过详细的缓存访问数据完美地指出了这一点。

<strong>2.2.8 解决问题后重新运行</strong>

要解决此缓存错误共享情况，最简单的方法是确保锁定和读取器字段位于不同的缓存行中。如源代码图中 buf 结构的定义所示，如果定义了 NO\_FALSE\_SHARING 宏，它会添加 5 个长，总共 40 个字节，作为将读取器字段存储在不同缓存行中的字段的填充，因为缓存行大小通常为 64 个字节。

为了测试这一点，使用定义的宏NO\_FALSE\_SHARING重新编译源代码。现在测试，与第一个false\_sharing二进制文件相比，我们机器上的执行时间减少了大约 3 倍，如下所示。我们使用 perf c2c 来分析这个 no\_false\_sharing 程序，它显示 false\_sharing\_example.c 没有对端侦听检测。

![](https://proxy-prod.omnivore-image-cache.app/1048x236,s45RcT0-5puN11UUfzXAZKmRux1IsCSzeAUiXJep2NDM/https://pic1.zhimg.com/v2-4249f89ca284403f883bd70262280130_b.jpg)

没有伪共享的程序执行时间

## 3\. 总结

这里展示了 SPE 支持的 perf c2c 工具如何实现在Arm 平台上支持数据共享分析的场景。示例代码展示了如何使用此分析来解决多线程代码中的伪共享性能问题。

Ref: Arm Statistical Profiling Extension: Performance Analysis Methodology 

发布于 2024-05-20 12:18・IP 属地广东・来源官方网站 ，编辑于 2024-05-21 09:11・IP 属地广东・来源官方网站

