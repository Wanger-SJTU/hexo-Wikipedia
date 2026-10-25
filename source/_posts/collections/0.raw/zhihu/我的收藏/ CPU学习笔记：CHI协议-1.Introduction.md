---
title: (1 条消息) CPU学习笔记：CHI协议-1.Introduction
date: "2023-08-09 00:00:00"
updated: "2023-08-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/CPU学习笔记-CHI协议-1.Introduction/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/647841067
---


### Introduction是CHI协议的第一章，主要内容是介绍了CHI的概念，应用场景，基本工作流程及其构成

### 1.CHI协议介绍

### 1.1总览

#### 1.1.1什么是CHI协议？

 AMBA 5 Coherent Hub Interface (CHI) architecture

#### 1.1.2.CHI协议的作用是什么？

The CHI architecture is a scalable, coherent hub interface and on-chip interconnect used by multiple
components.The CHI architecture allows for flexible topologies of component connections, driven by performance,power, and area system requirements.CHI架构是一个可测量的一致性集线器，以及一种用于多器件之间的片上互联。

CHI架构允许基于性能，功耗，面积要求的多器件之间拥有灵活的拓扑结构。

> CHI的特性
架构灵活，易于扩展；
独立的分层实现，包括协议层（protocol）、网络层（network）和链路层（link）；
基于包传输 (Packet-based)；
由基于互连的主节点（Home Node，简称HN）处理的所有事务，包括snoop、缓存和内存访问；
HN协调所有的传输请求，包括snoop请求、访问高速缓存和内存；
CHI的一致性协议支持：64Byte的缓存行、snoop filter和directory、MESI和MOESI 缓存模型、增加两个缓存行状态（partial和empty）；
CHI传输事务包含多种类型，支持原子操作和同步操作，支持cache stashing，DVM（distributed virtual memory）等；
支持Retry机制来管理协议层资源；
支持端到端的QoS（Quality of Service）；
可配置的数据宽度来满足系统需求；
支持ARM的TrustZone；
优化传输事务流；
跨组件和互连的错误报告和传播机制，以确保系统的可靠性和完整性；
低功耗信号，可以使能flit级别时钟门控、根据组件的工作情况实施时钟门控或电源门控等低功耗手段

#### 1.1.3.CHI的可用场景

> The components of CHI-based systems can comprise of:
• Standalone processors
• Processor clusters
• Graphic processors
• Memory controllers
• I/O bridges
• PCIe subsystems
• Interconnects

独立处理器

> 嵌入式开发基础(4)-阿里云开发者社区

处理器簇

> What is a cluster?

图像处理器

> 这个就不用举例了吧。。。

存储器控制器，IO桥

> 没遇到过这几个。。。

PCIE子系统

内部互联

#### 1.1.4.架构层次（Architecture layers）

- Protocol
- Network
- Link
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_044e93f6b4e7.jpg)

 Layers of the CHI architecture> Communication granularity：通讯颗粒度
Transaction：传输
Packet：信息包
Flit：切片

（说实话看到这里我已经蒙了，这都是啥玩意？如何理解这写层次呢？）

#### 1.1.4.1 Protocol 

从协议来看，protocol layer有四种作用

- 生成和处理“节点”上的请求和响应；
- 定义含caches节点上可用的cache状态转换；
- 定义每一种请求方式的传输流程；
- 管理prorocol级别的流程控制；
如何理解呢？

总体来说就是协议层主要是定义工作/控制流程，是用来描述整个CHI是如何处理读写操作，都有哪些工作流程的

#### 1.1.4.2 Network layer

- 打包协议层信息；
- 确定并增加源节点和目的节点的ID到packet中，确保这些packets能正确在互联线上路由；

#### 1.1.4.3 Link layer

从协议来看。link layer有两种作用

- 在系统网络设备(network)之间提供流程控制
- 在系统网络(network)之间管理连接通道（link channels）提供无死锁切换？(deadlock-free switching)
如何理解呢？

这个又如何理解呢？可以看这个文章，写的非常好，通俗易懂又不失严谨

[](https://zhuanlan.zhihu.com/p/625042006)

以下摘抄文章原文

如果说Protocol是top层纯软的定义协议的东西，那么Link Layer层就是纯纯硬的硬件层。多硬呢，就是你在eda仿真，把各个模块之间连接的接口的信号拉到verdi来看，看到的就是link层的信号。
 Link层定义的信号，那都是实现到RTL里面实实在在的信号。这也是为啥先讲Link的原因。就是说该层已经是CHI的硬件实现的那一层了，CHI中所有与传输相关的硬件描述都是属于这一层的，是物理上客观存在的总线连接。

#### 1.2拓扑结构

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6cc924465775.jpg)

CHI-Topology

- <strong>CROSSBAR</strong>，这种结构相对简单，互连部分延时小，多用于数量不多的组件互连，缺点是如果互连组件太多，这种结构的内部走线会非常多，不利于物理实现，比较常见的crossbar类型IP如ARM公司的NIC-400；从图可以看出 CROSSBAR是没有ROUNTER的.
- <strong>RING</strong>，折中考虑了互连组件数量和延时，有利于中等规模的SoC设计，比较常见的ring类型IP如ARM公司的CCN；
- <strong>MESH</strong>，这种拓朴结构可以提供更大的带宽，而且是可以模块化，通过增加网格的行或列来增加更多的节点，ARM的CMN-600就是基于mesh的互连IP。

#### 1.3 术语解释

<strong>Master/Requester</strong>:读写请求发起方，即主端

<strong>Subordinate/Slave</strong>:读写请求接收方，即从端

<strong>Transaction：</strong>一个单独的操作，比如读或写内存。

<strong>Message：</strong>协议层术语，用于定义两个组件之间交换信息的粒度，如Request/Data response/Snoop request，一个数据响应message可能由多个packets组成。

<strong>Packet：</strong>是互连端点间的传输粒度，一个message可能由一个或多个packets组成，每个packet包含有源和目的节点的ID来保证在interconnect上独立路由。

<strong>Flit</strong>是最小流控单位，一个packet可以由一个或多个flits组成，对于同一个packet的所有flits在互连（interconnect，简称ICN）上传输必须遵循同样的路径。

<strong>Phit</strong>是物理层传输单位，一个flit可以由一个或多个phits组成。phit定义为两相邻网络设备之间的一个传输。

待补充
#### 1.4 传输分类

- 传输分类
- 传输描述

#### 1.4.1传输分类

- Read
- Dataless
- Write
- Combined Write
- Atomic
- Other 
- Snoop 
Read:   *此处列表内容从后文得知应该是transaction的请求分类（initial request），其余传输方式下的列表内容也是类似性质*

- ReadNoSnp, ReadNoSnpSep
- ReadOnce
- ReadOnceCleanInvalid
- ReadOnceMakeInvalid
- ReadClean
- ReadNotSharedDirty
- ReadShared
- ReadUnique
- ReadPreferUnique
- MakeReadUnique
Dataless:

- CleanUnique
- MakeUnique
- Evict
- StashOnceUnique,StashOnceSepUnique,
- StashOnceShared,StashOnceSepShared
- CleanShared
- CleanSharedPersist,CleanSharedPersistSep
- CleanInvalid,CleanInvalidPoPA
- MakeInvalid
Write

- WriteNoSnpPtl, WriteNoSnpFull,WriteNoSnpZero,WriteNoSnpDef
- WriteUniquePtl, WriteUniqueFull, WriteUniqueZero
- WriteUniquePtlStash, WriteUniqueFullStash
- WriteBackPtl, WriteBackFull
- WriteCleanFull
- WriteEvictFull,WriteEvictOrEvict
Combined Write

- WriteNoSnpPtlCleanInv, WriteNoSnpPtlCleanSh, riteNoSnpPtlCleanShPerSep,WriteNoSnpPtlCleanInvPoPA
- WriteNoSnpFullCleanInv, WriteNoSnpFullCleanSh,
- WriteNoSnpFullCleanShPerSep, WriteNoSnpFullCleanInvPoPA
- WriteUniquePtlCleanSh, WriteUniquePtlCleanShPerSep
- WriteUniqueFullCleanSh, WriteUniqueFullCleanShPerSep
- WriteBackFullCleanInv, WriteBackFullCleanSh, WriteBackFullCleanShPerSep,
- WriteBackFullCleanInvPoPA
- WriteCleanFullCleanSh, WriteCleanFullCleanShPerSep
Atomic

- AtomicStore
- AtomicLoad
- AtomicSwap
- AtomicCompare
Other 

- DVMOp
- PrefetchTgt
- PCrdRetur
Snoop 

- SnpOnceFwd
- SnpOnce
- SnpStashUnique
- SnpStashShared
- SnpCleanFwd
- SnpClean
- SnpNotSharedDirtyFwd
- SnpNotSharedDirty
- SnpSharedFwd
- SnpShared
- SnpUniqueFwd
- SnpUnique
- SnpPreferUniqueFwd
- SnpPreferUnique
- SnpUniqueStash
- SnpCleanShared
- SnpCleanInvalid
- SnpMakeInvalid
- SnpMakeInvalidStash
- SnpQuery
- SnpDVMO

#### 1.4.2传输种类列表

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dfd681c78a91.jpg)

#### 1.5 一致性总览（Coherence overview）

#### 1.5.1 一致性模型（Coherence model）

- 硬件一致性使得共享memory空间的系统组件不需要执行软件缓存保持来保证cache之间的一致性；
- 如果两个组件往相同地址的memory发起写操作，这些操作可以被所有的组件以相同的顺序观察到，那么这个memory区域就是一致性的；
图1所示为包含三个master组件的一致性系统，每个master组件包含一份loacl cache和一致性协议节点。CHI协议允许memory数据存放在一处或多处master cache当中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eb84a4c6f3c3.jpg)

coherence协议确保所有 master 在任何给定地址位置都观察到正确的数据值，它强制执行在任何位置出现 stores 时，不存在超过一个副本(*注：即MESI中的M，或者说MOESI中的O，这也是为什么cacheline中没有O时，代表着cache内的数据一定与主存一致，因为没人修改过它或者说修改已被推入主存*)。每次存储到某个位置后，其他主机可以为自己的本地缓存获得数据的新副本，从而允许存在多个缓存副本。After each store to a location, other masters can obtain a new copy of the data for their own local cache, to permit multiple cached copies to exist

当需要存数据时，先把所有其它masters的数据备份失效掉，这样一致性协议可以使得所有的masters获取到任何地址的正确的数据值。在存储完成后，其它masters可以获取到新的数据到自己local cache；

CHI协议允许（不强求）主存的数据不是实时更新，只有在所有master的cache都不需要该数据备份时，才把数据刷新到主存中；

协议使得master可以确定一份cacheline是否是唯一的或者存在多份拷贝。如果是唯一的，master可以直接改变它的值不需要知会系统中其它masters，如果不是唯一的，master必须使用恰当的transaction知会其它masters；

所有的一致性是以cacheline粒度对齐，cacheline在64bytes对齐存储系统中大小为64bytes；

#### 1.5.2 Cache state model

为了使得一个组件在访问cache line时，可以确定是否该执行某操作，CHI协议定义了cache state。每个cache state基于如下的cache line特性：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_123886099c67.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_443ea24d675c.jpg)

> 协议节点访问cacheline后所需要执行的动作是根据cacheline state决定的，CHI协议规定的每个cacheline状态如下，一个cache允许只实现如下这些cache state的子集：

```text
    I：Invalid，该cache line不存在于当前cache中(present in the cache)，即cache中没有目标数据使cacheline有效；
    UC：Unique Clean，该cacheline的数据只在当前cache中，且和memory的数据一致，可以不知会其它RN就对该cacheline的数据进行修改。在收到snoop请求时，该cacheline不需要返回数据给HN或fwd data给RN；
    UCE：Unique Clean Empty，该cacheline的数据只在当前cache中，但是所有的数据都是无效的，可以不知会其它RN就对该cacheline的数据进行修改。在收到snoop请求时，该cacheline必须不能返回数据给HN或fwd data给RN；
    UD：Unique Dirty，该cacheline的数据只在当前cache中，且和memory的数据不一致，已经被修改过了；如果该cacheline的数据不用了，那需要写回到下级cache或memory；可以不知会其它RN就对该cacheline的数据进行修改。在收到snoop请求时，该cacheline必须返回数据给HN或fwd data给RN；
    UDP：Unique Dirty Partial，该cacheline的数据只在当前cache中，且和memory的数据不一致，部分被修改且有效；如果该cacheline的数据不用了，那需要和下级cache或memory的数据组成一个完成有效的cacheline；可以不知会其它RN就对该cacheline的数据进行修改。在收到snoop请求时，该cacheline必须返回数据给HN，但不能直接将数据fwd给Requester；
    SC：Shared Clean，其它cache可能也存在该cacheline的拷贝；该cacheline可能已经被修改了；当不需要该cacheline数据时，cache没有义务必须将该数据写回到memory；必须对其它cache的该cacheline进行无效后，获得U态才能将该cacheline进行改写；在收到snoop请求时，该cacheline在RetToSrc没有置位时不需要返回数据，如果RetToSrc置位，则需要返回数据，可以直接fwd数据给Requester；
    SD：Shared Dirty，其它cache可能也存在该cacheline的拷贝；该cacheline相对于memory已经被修改了；当该cacheline不需要的时候，cache需要将它写回下游cache或memory；必须对其它cache的该cacheline进行无效后，获得U态后才能将该cacheline进行改写。在收到snoop请求时，该cacheline必须返回数据给HN和fwd data给Requester；
```


UCE态的获得：有两种情况UCE态发生，
a. Requester故意产生UCE态，在Requester对cacheline写数据前，为了节省系统带宽，Requester获得UCE态而不是UC，就可以对该cacheline进行写操作；
b. Request切换到UCE态，如果Requester已经有该cacheline的拷贝，且正在申请获取写权限，但是在获得写权限之前该数据已经被失效掉了，这样会使得该cacheline变为UCE态。

UDP态的获得：UDP态获得的前提是当前cacheline为UCE态，然后Request对齐进行partial写，这样就产生了UDP态

直接看可能感觉很复杂，不如这样想：

先考虑cacheline是否是valid or invalid的，再考虑是否是unique or shared，之后再分别考虑dirty or clean;

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c55be9b5460d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_599fc181c173.jpg)

不过要特殊注意理解UCE和UDP；


#### 1.6 组件命名

RN**（Request Node）产生协议transaction给互连，包含读和写。

- <strong>RN-F</strong>，（Fully coherent Request Node，全一致性请求节点）：包含硬件一致性cache；允许产生所有协议定义的transactions；支持所有的snoop transactions。
- <strong>RN-D</strong>，（IO coherent Request Node with DVM support，支持DVM的IO一致性请求节点）：不包含硬件一致性cache；可以接收DVM操作；可以产生协议定义的部分transactions。
- <strong>RN-I</strong>，（IO coherent Request Node，IO一致性请求节点）：不包含硬件一致性cache；不能接受DVM操作；可以产生协议定义的部分transactions；不要求具有snoop功能。

HN** (Home Node)用于组件内接收来自RN的协议transaction，（完成相应的一致性操作并返回一个响应）

- <strong>HN-F</strong>，（Fully coherent Home Node，全一致性主节点）：用于接收除了DVM操作所有的请求操作：包括一个PoC（Point of Coherence）点，通过监听RN-Fs，管理各Master一致性，完成所有的snoop响应后，发送一个响应给发出请求的RN；最好是一个PoS（Point of Serialization）点，用于管理多个memory请求的顺序。可能包含目录或监听过滤，以此来减少冗余的snoop请求。
- <strong>HN-I</strong>，（Non-coherent Home Node，非一致性主节点）：处理有限的一部分协议定义的Request：不包含PoC点，也不具备处理snoop请求；最好是一个PoS点，管理访问IO 子系统的请求顺序。
- <strong>MN</strong>，（Miscellaneous Node，混合节点）：用于接收来自RN发送的DVM操作，完成相应的操作，并返回一个响应。

SN**（Subordinate Node）用于接收来自HN的请求，完成相应的操作,并返回一个响应。

- <strong>SN-F</strong>：(Subordinate/slave Node type FOR Normal memory)（还记得ARM中的normal memory是啥不？）的从节点，可以处理Non-snoop读写请求、atomic请求、以及这些命令的其它形式、CMO（Cache Maintenance Operation）请求。
- <strong>SN-I</strong>：Subordinate/slave Node type For peripheral or normal memory的从节点，可以处理Non-snoop读写、atomic操作、以及这些命令的其它形式、CMO请求。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eff9bc839f71.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_186f4ea74151.jpg)

#### 1.7 读数据源

在基于CHI的系统中，读请求的数据可以来自不同的地方，如下图4所示，这些源有：

- Cache within ICN
- Slave Node
- Peer RN-F
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ebea357a1376.jpg)

对于RN-F或SN返回的读数据，可以发送给HN，HN再转发数据给原始的Requester；也可以直接跳过HN，返回数据给原始Requester，这样可以减少读数据的latency。有以下两种直接返回数据方式：

    Direct Memory Transfer（DMT）：SN直接返回数据给原始的Requester；

    Direct Cache Transfer（DCT）：Peer RN-F字节返回数据给原始Requester；

    在DCT中，数据提供者需要通知HN它已经将数据发给原始Request了，在某些情况下，数据提供者也必须发送一份拷贝数据给HN。

参考资料：

1.CHI 协议_chi协议_wangwangmoon_light的博客-CSDN博客

2.CHI基本概念介绍_chi协议_谷公子的藏经阁的博客-CSDN博客

3.[言身寸：AMBA CHI协议导论](https://zhuanlan.zhihu.com/p/623221493#:~:text=%E4%B8%80%E8%87%B4%E6%80%A7%E9%9B%86%E7%BA%BF%E5%99%A8%E6%8E%A5%E5%8F%A3%EF%BC%88CHI%EF%BC%89%E6%98%AFAXI%E4%B8%80%E8%87%B4%E6%80%A7%E6%89%A9%E5%B1%95%EF%BC%88ACE%EF%BC%89%E5%8D%8F%E8%AE%AE%E7%9A%84%E6%BC%94%E8%BF%9B%E3%80%82%20%E5%AE%83%E6%98%AFArm%E6%8F%90%E4%BE%9B%E7%9A%84%E9%AB%98%E7%BA%A7%E5%BE%AE%E6%8E%A7%E5%88%B6%E5%99%A8%E6%80%BB%E7%BA%BF%E6%9E%B6%E6%9E%84%EF%BC%88AMBA%EF%BC%89%E7%9A%84%E4%B8%80%E9%83%A8%E5%88%86%E3%80%82%20AMBA%E6%98%AF%E4%B8%80%E7%A7%8D%E5%85%8D%E8%B4%B9%E5%8F%AF%E7%94%A8%E3%80%81%E5%85%A8%E7%90%83%E9%87%87%E7%94%A8%E7%9A%84%E5%BC%80%E6%94%BE%E6%A0%87%E5%87%86%EF%BC%8C%E7%94%A8%E4%BA%8ESoC%E4%B8%AD%E5%8A%9F%E8%83%BD%E5%9D%97%E7%9A%84%E8%BF%9E%E6%8E%A5%E5%92%8C%E7%AE%A1%E7%90%86%E3%80%82,%E5%AE%83%E6%9C%89%E5%8A%A9%E4%BA%8E%E4%B8%80%E6%AC%A1%E6%80%A7%E6%AD%A3%E7%A1%AE%E5%BC%80%E5%8F%91%E5%85%B7%E6%9C%89%E5%A4%A7%E9%87%8F%E6%8E%A7%E5%88%B6%E5%99%A8%E5%92%8C%E5%A4%96%E8%AE%BE%E7%9A%84%E5%A4%9A%E5%A4%84%E7%90%86%E5%99%A8%E8%AE%BE%E8%AE%A1%E3%80%82%20CHI%E9%80%82%E7%94%A8%E4%BA%8E%E9%9C%80%E8%A6%81%E4%B8%80%E8%87%B4%E6%80%A7%E7%9A%84%E5%90%84%E7%A7%8D%E5%BA%94%E7%94%A8%EF%BC%8C%E5%8C%85%E6%8B%AC%E7%A7%BB%E5%8A%A8%E3%80%81%E7%BD%91%E7%BB%9C%E3%80%81%E6%B1%BD%E8%BD%A6%E5%92%8C%E6%95%B0%E6%8D%AE%E4%B8%AD%E5%BF%83%E3%80%82%20AMBA%20CHI%E6%97%A8%E5%9C%A8%E7%BB%B4%E6%8A%A4%E7%BB%84%E4%BB%B6%E6%95%B0%E9%87%8F%E5%92%8C%E6%B5%81%E9%87%8F%E4%B8%8D%E6%96%AD%E5%A2%9E%E9%95%BF%E7%9A%84%E7%B3%BB%E7%BB%9F%E4%B8%AD%E7%9A%84%E6%80%A7%E8%83%BD%E3%80%82)
