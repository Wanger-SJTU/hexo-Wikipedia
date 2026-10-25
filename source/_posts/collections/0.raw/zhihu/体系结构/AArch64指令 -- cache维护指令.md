---
title: "AArch64指令 -- cache维护指令"
date: "2024-04-20 00:00:00"
updated: "2024-04-20 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/AArch64指令-cache维护指令/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/677750807"
---


AArch64指令集中有两条关于缓存维护（cache maintenance）的指令，分别是IC和DC。<strong>IC用于指令缓存操作，DC用于数据缓存操作</strong>。

IC和DC指令都属于系统指令（system instruction），系统指令还包括AT，BRB，CFP，CPP，DVP和TLBI等。

cache的管理主要有如下几种情况：

无效（invalidate）操作：<strong>使整个cache或者某个cacheline失效</strong>，这可能会丢弃cache中的更改。其实就是修改valid bit，让cache无效。

清理（clean）操作：<strong>把标记为脏的整个cache或者某个cacheline写回下一级cache中或者内存中</strong>，然后清除cacheline中的脏位。这使得cacheline的内容与下级cache或者内存中的数据保持一致。

清零（zero）操作：在某些情况下，用于对cache进行预取和加速。例如，当程序需要使用较大的临时内存时，如果在初始化阶段对这块内存进行清零操作，高速缓存控制器就会主动把这些零数据写入cacheline中。若程序主动使用cache的清零操作，那么将大大减小系统内部总线的带宽。

清理并失效 (clean and invalidate)：它会先执行清理操作，然后再使cacheline失效。

对cache的操作可以指定如下不同的范围：

- 整块高速缓存。
- 某个虚拟地址。
- 特定的高速缓存行或者组和路。

DC和IC指令的格式如下：

DC , 
IC , 

DC和IC指令包含两个参数：一个是操作码；另一个是通用寄存器Xt，用于传递参数，例如虚拟地址等。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_073c20a36a26.jpg)

DC和IC指令格式操作码可以分成4部分：

- 功能：表示cache维护指令的功能。
- 类型：表示指令操作的范围，例如VA是针对单个虚拟地址的操作，SW表示针对cache中的路和组进行操作，ALL表示针对整个cache。
- 观察点：表示站在哪个角度对cache进行操作，U表示站在处理器缓存一致性角度（PoU），C表示站在全局缓存一致性角度（PoC），P表示持久性角度（PoP）。
- 共享：IS表示内部共享属性。
IC指令格式中的U还可以和共享属性IS结合来表示属于同一个内部共享域的一组处理器。例如，“ic ialluis”指令表示使内部共享域中所有处理器的指令高速缓存都失效。

ARMv8架构支持的cache维护指令如下表所示：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_48acfd65f0c6.jpg)

另外，在这里补充一下PoC/PoU/PoP的概念：

PoC（Point of Coherency）：在此处，确保所有可以访问内存的观察者都能看到相同的副本<strong>，这些观察者是系统中所有可以访问内存的模块，例如CPU、GPU、DMA设备等。</strong>PoC一般是HNF (在使用CHI总线的系统中)**。

PoU（Point of Unification）：在此处，<strong>确保PE的I-cache、D-cache以及MMU（TLB）能够看到相同的副本</strong>。对于单核处理器来说，PoU就是系统内存；对于多核处理器，PoU取决于<strong>共享域（shareability domain）属性</strong>。

PoP（Point of Persistence）: 持久节点，它是Memory系统中的一个节点，<strong>当系统电源断开时，对Memory的写入会被维持</strong>，当电源恢复到Memory中受影响的位置时，写入会被可靠地恢复。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_78ea9fd1f339.jpg)

图1：图中没有集成L2 cache，只有一个Core和I/D cache和TLB，所以PoU等于PoC。

图2：

- 站在core1上看集成了L2 cache，包含core，I/D cache、TLB、L2 cache组成了PoU for inter share；
- 站在系统上看，包含了core1、core2和系统内存，整体组成了PoC。
图3：

- 系统架构包含了两个cluster组成，每个cluster包含了L1、L2 cache，可以独立看成一个PoU。
- 两个Cluster共享了L3 cache和系统内存，则可以是PoC。
参考：

- ARM64体系结构编程与实践
- AArch64指令集中的缓存维护指令IC和DC介绍
- armv8 cache PoU和PoC区别
