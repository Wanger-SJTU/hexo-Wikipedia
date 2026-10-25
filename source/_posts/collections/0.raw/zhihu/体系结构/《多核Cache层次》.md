---
title: 《多核Cache层次》
date: "2025-03-07 00:00:00"
updated: "2025-03-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/《多核Cache层次》/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/24638786450
---


本文详细全面的介绍在多核系统中cache特别是LLC设计中需重点考虑的各种问题。阅读正文可以对LLC的发展脉络以及设计的重难点有一个比较清晰的认识。另：本文中有近一半以上的内容都是对自当时的一些论文介绍，精力有限且这部分相对较老，没有对这部分进行非常详细的阅读，有兴趣的读者可以自行阅读。

具体是Synthesis Lectures on Computer Architecture系列中《Multi-Core Cache Hierarchies》书籍的读书笔记，其与2011年出版，添加了部分自己理解，留作记录也供一起学习。

### 1. 大型Cache设计的基本要素

过去一段时间，大多数片上cache hierarchy大都包括两级(L1和L2)，但是最近开始增加L3 LLC可以更好的提升性能(现在看也确实如此)。

#### 1.1 Shared vs. Private Caches

这一节将L2作为LLC，但和L3作为LLC是一样的道理。

1.1.1 Shared Cache

cache的出现引入了coherency的问题，主要包括两种解决方案：基于广播和基于directory。下图是基于shared bus和广播实现的L2 LLC，当在L1 miss后则向总线发起请求，此时所有core和L2都可以监听总线从而解决一致性问题。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b1ac2485b556.jpg)

对于core数较少的情况，上述的方案可基本满足，随着core继续增多，则需要使用directory协议来减少Bus上的流量。如下图所示，其需要一个更加灵活的非广播互联总线，同时在L2处增加Directory来记录每个core中cache line的状态，在适当的时候由L2发起snoop来无效掉对应的cache line。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f87cb6c02b11.jpg)

Shared cache的优势：

- 可用的存储空间可以在多核core之间动态分配，达到更好的cache空间利用率
- 如果数据被多个core共享，那么只需要1个L2副本，同样可以由更高的利用率和hit率
- 如果数据由多个core共享，并且发生多次coherence miss，那么必须到达shared cache才能解决一致性，所以更早的遇到shared cache，就可以更早的解决一致性问题
Shared cache的劣势：

- 不同core的工作负载可能会相互干扰从而影响miss rate，导致较差的QoS
- shared cache需要引入一致性协议，会导致额外的开销
- 大的shared cache具有相对更长的latency
1.1.2 Private LLC

此时每个core将携带私有的unified L2 Cache，同时将一致性问题下移到下一级Cache处理。其优缺点也很明显，这里不再赘述。以下图private L2 Cache和directory 一致性协议为例，重点说明这种情况下的一致性问题解决需要更长的时间，一方面是因为增加了L2进行look-up的延迟，另一方面是L2的容量更大，也导致其Directory需要查找的范围更大，从而增加延迟。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c6acce0d8c5c.jpg)

具体的Shared Cache和Private Cache对比如下表。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_16f13835cc58.jpg)

另外，未来的处理器形态还可能结合Private cache和Shared cache，如下图。现在主流的CPU和GPU已经都是用了类似的cache hierarchy。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_da94c9236c5b.jpg)

#### 1.2 Centralized vs. Distributed Shared Caches

Centralized Cache的可以包含多个Bnak，且其controller的功能也分布在各个Bank，但它们在Chip上都占据连续的面积。其layout示意图如下图，因为Bank之间距离相对比较近，所以跨bank间的数据移动相对简单。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_81049c77e49f.jpg)

另一种扩展形式则是Distributed Shared L2 Cache，尽管L2仍在逻辑上共享资源，但是在物理上被分布在不同的Tile。这种组织形式可以允许仅设计单个Tile并例化多份，具有更低的设计/验证成本。下图则显示了两种不同的物理布局，右边是3D结构。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_33053f539604.jpg)

在中等规模core时，centralized L2是一个合理的选择，但是随着core的增加，散热和互联限制centralised cache的使用。此时使用distributed cache可以帮助core能更快的访问L2并降低互联的负担，但需要特别注意数据管理。

#### 1.3 Non-Uniform Cache Access

目前为止的大多数设计都采用Uniform Cache Access(UCA)架构来简化对应的指令调度逻辑，但是随着Cache容量和Bank数量增加，Non-Uniform Cache Access(NUCA)是一个趋势。 UCA通常使用H-tree拓扑来连接Bank到controller，如下图。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ad5f4f127cd2.jpg)

对于L2这类的LLC来说，core的pipeline调度不需要利用预期的L2访问Latency，所以其可以是NUCA架构，而提供部分数据以更低Latency的代价是更加复杂的network，可能是mesh类，且需要复杂的router设计和路由算法。一个示例的NUCA架构如下图。需要重点考虑的问题包括：

- Mapping：如何在不同banks间分配cache line
- Search：定位cache line的机制
- Movement：改变cache line位置的机制

- Static-NUCA(S-NUCA)：不支持cache line的移动
- Dynamic-NUCA(D-NUCA)：支持cache line的移动

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_08f4a865e273.jpg)

#### 1.4 Inclusion

L1和L2之间的关系：

- Inclusive

- L1的数据都在L2有备份
- 实现容易，特别是L1 miss的处理，只需要在L2上查看是否存在，存在则确定是都在其他L1被修改，否则向下一级发送请求

- Exclusive

- L1和L2互斥
- 实现困难，特别是L1 miss时，无论如何都需要同步确认L2和其他core的L1内是否存在

- Non-inclusive

- 不保证inclusive

写策略

- write through/back

- 在有足够的互联带宽和功耗预算情况下，write through具有更好的性能，因为在访问相同数据时可以确保其他core也可以尽快找到。

### 2. 组织CMP中LLC的数据

#### 2.1 大型Shared NUCA Cache的数据管理

2.1.1 D-NUCA中的Placement/Migration/Search策略

相对来说，D-NUCA比S-NUCA具有更好的性能，且本文介绍了多篇相关论文，没有详细阅读，有兴趣的读者可自行查看。

2.1.2 Shared Cache的替换策略

相对Private L2来说，Shared L2中的数据可能距离所需的core距离较远，这是S-NUCA所面临的一个主要问题，一种解决方法是允许在Shared Cache中存在多个数据副本，从而需要额外的机制来保证这些副本间的一致性。同样，原文也介绍了几篇相关论文的详细设计，有兴趣的读者自行查看原文。

2.1.3 基于OS的Page Placement

早期的研究都提到S-NUCA的一大缺点是数据在所有Bank内随机分布，会导致有一半的数据位于对应core的另一侧，但是真实世界中的地址并不是随机均匀分布的。其可以被OS所控制进而提高数据的局部性，所以该方法和S-NUCA或D-NUCA结合能取得更好的效果。同样的，这里有几篇相关论文，有兴趣的读者自行阅读。

#### 2.2 Private Cache集合的数据管理

Private cache可以使一个core最常使用的数据位于其距离最近的cache bank，但是会导致较低的hir rate。关于Private LLC的大多数创新在于优化负面效应(低hit rate)同时保留正面效果(hit时latency较低)。但是其维护一致性所需的复杂结构仍无法解决。同样的，这里有几篇相关论文，有兴趣的读者自行阅读。

#### 2.3 讨论

近些年，在Shared Cache上取得了更多的进步，比如传统的Shared Cache所面临的“会给network造成很大复杂从而导致访存latency增加”的问题得到很大程度解决，具体的可以使用基于tile的distributed shared S-NUCA cache、page-to-bank mapping策略以及基于OS的page管理，可以保证大多数LLC请求都能在tile内命中。同时，Private Cache所面临的最大问题是下一级的一致性问题，目前在一些core数较少的场景，可利用broadcast总线结合解决一致性问题。

### 3. 影响cache命中率的策略

#### 3.1 针对吞吐量和QoS的Cache Partitioning

3.1.1 Introduction

大多数论文通过将一个set-associative shared cache按way切分来实现cache partitioning，这对于小规模的core来说是合理的。随着core增多，distributed shared cache称为主流，此时除了按way或者set切分外还需要搭配额外的search机制以确定cache line具体位于哪个tile。

三种性能优化目标类型：

- Communist

- 每个程序可以达到类似的性能水平

- Utilitarian

- 通过分配资源到可以最好利用额外cache空间的线程来最大总的吞吐量

- Capitalist

- 不加管制的进行资源竞争，类似于基本的LRU策略

一种新的技术称为Dynamic Set Sampling或者Set Dueling Monitors(SDMs)，可以帮助每个程序来动态的选择策略，比如cache共4096 set，通过绑定16 set为policy-A，16set为Policy-B，动态检测哪个效果好，则将其他set全部设置为更好的策略。

3.1.2 吞吐量

这部分介绍了以吞吐量作为目标的cache partitioning方案，包括UCP、TADIP、PIPP算法，不做详细介绍，有兴趣的读者请阅读原文。

3.1.3 QoS策略

该部分的内容对于一些需要提供一定程度程序运行的保证的系统比较重要，比如说数据中心或其他租借类型的服务平台。其中一些详细论文细节请阅读原文。

#### 3.2 为大型共享Cache选择非常有用的填充

这部分主要讨论cache中的哪些数据应该插入/保持/删除。

3.2.1 Replacement/Insertion 策略

在一些特殊场景，多个应用程序经L1滤除后再访问L2，此时LRU策略可能不是最优。这里也介绍了一些论文，不再详细介绍。

3.2.2 新的associatibity组织形式

一个观察是某些set可能会承担比其他set更大的压力，从而造成更大的conflict miss，所以一些新的方案尝试通过硬件的方案来实现set减负载均衡。同样，这些也可以通过OS软件手段缓解。

3.2.3 Block级优化

本节内容尝试优化插入cache中内容的质量，包括prefetch、dead block prediction、compression。其中prefetch是一个发展非常久的话题，且对于LLC非常重要，因为LLC到DRAM的latency非常长；dead block prediction，可以通过trace每条指令的执行来提前预测某个block已经不再需要，从而提前预取；compression则通过压缩的方式增加cache容量，即只将所需的部分内容预取到cache。

### 4. 大型Cache内的互联网络

#### 4.1 大型cache设计基础

4.1.1 Cache Array 设计

简单cache的组织方式如下图所示，包含一个单独的Tag Array和一个Data Array，根据输入的地址进行译码激活一整个line，经放大器放大后将Tag中的值与地址再进行比较以确定具体命中哪一部分，从而确认是都hit以及读/写数据。其中cache的访问延迟主要是decoder、wordline、bitline和output bus组成。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ce35fde3f53c.jpg)

4.1.2 Cache互联

随着cache的增加，传统的单Array形式会造成严重的latency问题，所以大多大型的L2/L3都会分为多个bank，他们之前相互独立，且每个bank可以服务一个request。另外，一个bank内也可能包括多个Array，所以需要是有interconnect来互联这些sub-array，甚至是互联bank。

对于中等规模的设计，大多数在core和LLC不同bank间使用crossbar连接，但是随着core增加到数十个，则需要使用scalable noc，主流是packet-switched routed network，即现在比较火的NoC。

4.1.3 基于包交换路由的网络

原文中介绍了一些NoC的基本概念，但不很全面，推荐大家可以阅读数据《On-Chip Networks, Second Edition》，也有中文翻译版《片上互联网络：多核众核关键技术》。

列出原文中的一些基本概念，都比较简单：

- Topology
- Routing Algorithm
- Buffer, Crossbar, Channel
- Packets
- Flits
- Flow Control
- Bufferless Flow Control（这个概念上边NOC书籍中没有介绍，感兴趣的同学可以看些相关论文，比如华为在HPCA发表的《Application Defined On-chip Networks for Heterogeneous Chiplets: An Implementation Perspective》就采用了bufferless设计）
- Buffered Flow Control
- Virtual Channel Flow Control
- VC Allocation
- Buffer Management
- Physical Channel Allocation
- Basic Router Pipeline

- Routing Computation (RC)
- VC Allocation (VA)
- Switch Allocation (SA)
- Switch Traversal (ST)

- Speculative Router Pipelines
- Deadlock Avoidance
- Router Bottlenecks
- Router Optimizations

#### 4.2 互联设计对NUCA和UCA Cache的影响

4.2.1 NUCA Cache

早期的研究都假设了简单的Noc模型，认为每个router只会引入1 cycle延迟并忽略noc的功耗，这时的结果显示将cache分为64-256bank是最优的。随着意识到noc的重要性，考虑noc的延时和功耗后普遍认为分为少数几个bank是更优的，下图是一个trade-off。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ced25fd0474b.jpg)

 使用CATI6.5 对128MB L2-cache和16个core的仿真，结果是32bank最优，下边两图分别是此时的hit latency和功耗饼状图。  

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e20c1d91af65.jpg)

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3a6a03cc6276.jpg)

4.2.2 UCA Caches

下图是UCA架构使用CACTI在32nm节点下不同组件的功耗占比，可以看到H-tree网路是最大的瓶颈。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_9c380a24c124.jpg)

#### 4.3 用于大型Cache的网络架构创新

这里同样是一些顶刊论文，不做详细描述。

### 5. Technology

介绍一些RAM底层的相关技术以及一些新型技术。

#### 5.1 Static-RAM的限制

过去几十年，SRAM一直时片上Memory的理想选择，因为它具有低延迟和可扩展的优点。但当扩展到多核时，一些问题越发显著：

- 特征尺寸的减少使得精确控制晶体管尺寸变得困难，这增加了泄露电流和延迟variation。并且，SRAM也变得容易遭到辐射而发生错误。
- 随着对片上cache容量需求的增加，SRAM面积过大的问题也越加严重，一个6晶体管SRAM往往是1T1C DRAM面积的20倍。
这些问题的解决需要尝试修改cache微架构、3D堆叠以及新的SRAM结构等。

#### 5.2 参数变化

随着工艺进步，光刻等工艺的粒度越来越小，使得精确制造掩模版等变得困难，引入的误差则会导致期间的各类variation。

#### 5.3 容忍硬错误和软错误

soft error指由于粒子撞击等造成错误，hard error指由于V_{th}衰减、电子迁移等造成。可通过ECC等对错误进行修复。

#### 5.4 利用 3D 堆叠来解决SRAM问题

比如现在很火的3D DRAM方案，将传统DRAM通过Hrbird bonding到logic die上，可以提高非常大的带宽和极低的延迟，且已经有商用产品出现。

#### 5.5 新兴技术

- 3T1D RAM，在DRAM基础上，改善速度问题
- embedded DRAM，IBM提出。
- 最后是一些RAM技术的性能对比
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f93075571827.jpg)
