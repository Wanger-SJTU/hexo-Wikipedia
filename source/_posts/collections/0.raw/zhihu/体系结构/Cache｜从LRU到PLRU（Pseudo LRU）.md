---
title: "Cache｜从LRU到PLRU（Pseudo LRU）"
date: "2025-10-26 00:00:00"
updated: "2025-10-26 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/Cache-从LRU到PLRU(Pseudo-LRU)/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1965749069306651453"
---


简介
本文主要介绍——

- Cache替换策略存在的原因。
- LRU的原理以及相应分析。
- 借用二叉树/线段树对PLRU进行介绍。
- PLRU和LRU的比较。
背景

![](https://pic4.zhimg.com/v2-957a0b3d1c9fc216bd3eb7e4b4924d47_r.jpg)图来自姚宏斌老师《超标量处理器设计》

如上图所示，同一个index字段但Tag不同的Cacheline Adress会索引到一组Cacheline之中，这组Cacheline也会被称为Cache Set。

 Unfortunately, power consumption and hardware complexity both increase as we increase associativity.而Cache在面对能耗和硬件复杂度钱，总会还只能算是有限的资源。

于是当访问过多的不同TAG字段同index字段的Cacheline的时候，势必对应的Cache Set是无法缓存好所有的数据，需要根据具体的策略来在该Cache Set中选择出合适的cacheline进行驱逐以腾出空间，一方面让数据请求相应的cache line得以置入，另外一方面也会综合考虑未来请求对Cache的访问。

这是一种策略，也叫做Cache替换策略（Cache Replacement Policies）。

而Cache替换策略主要会有LRU（least recently used），PLRU（伪LRU，Pseudo LRU）等。

比如LRU是基于近期性质（Recency-based）的算法，如果近期被访问了，可能会相信它在未来的一段时间内大概率还是会被访问，应该被保留，从而最被“打入冷宫”的cache line应该淘汰（局部性原理）。比如当它需要为新的对cache的访问请求腾出空间来存放对应的cacheline的时候，它会优先去选择出最近最没有被访问的cacheline进行驱逐或者说是淘汰，这也就是least recently used。

而与LRU（least recently used）的对立面就是MRU（ most recently used ) 。

而要去真正实现LRU这种策略时，会有几个问题——

- 需要知道cache set里面cacheline的近期有没有被访问，以及它们之间的近期性的差异，才得以确认出LRU的选项，这是怎么进行实现？
- 二是如果没有驱逐和替换需求，只是命中（即访问cache的请求对应的数据已经在cacheline之中），应该怎么维护和更新这些cacheline的近期性质？比如在同一个Cache Set内部的其他Cache line怎么去面对这个cache line近期又重新被访问。对于问题1，最直接的方式是可以采用专门的数据去作为每一个cacheline的“年龄”来说明近期性。

对于问题2，直觉上会应该让其他Cache line显得“更老”。

Cache Replacement Policies
而为了能够更好去探讨以上这些问题，还是需要对Cache Replacement Policies的Policy进行科学的分类得以更细粒度的刻画，其中Policy主要会分为——

- 插入策略Insertion Policy——“新生儿打多少分”，讲的是当一个新的cacheline插入到这个cache中，应该给这个新入的cacheline设置怎么样的年龄数据，如果愿意设得高，则说明还是相信未来一段时间它还是会被访问到，如果愿意设的低，则说明这个cacheline还是处于比较动荡的状态，空降还是比较不安全的，容易被驱逐出去。
- 促进策略Promotion Policy——“命中后如何加分”，讲的是当一个已经是老人的cacheline又重新得到“重用”，应该怎么样设置数据来重给这个cacheline进入到一个“安全区”。
- 老化策略Aging Policy:——“别人得分时如何扣分”，讲的是当一个cacheline要么新插入要么重新获得使用时，其他cacheline是如何进行老化，以动态适应和维持住这种相近性的相对性。
- 驱逐策略Eviction Policy——“只能踢一个时踢哪个”，讲的是怎么当缓存组已满、又必须腾出空位时，在同组所有候选行里，谁的状态最“老”、优先级最低，就把谁踢出去；从空间的宏观上，在一个时间点，以上不同的policy可能在同CacheSet的不同的Cacheline上。

结合上面的理解，我们可以对这些策略对应的事件也一并进行整理和归纳——

- 当发生Cache命中的时候，命中的cacheline会执行Promotion Policy，其他cacheline会执行Aging Policy。
- 当发生Cache miss且对应Cache Set未满载的时候，这个cacheline将作为“新生儿”进行Insertion Policy，其他cacheline依旧进行Aging Policy。
- 当发生Cache miss且对应Cache Set满载的时候，这个cacheline将作为“新生儿”进行Insertion Policy，同时需要腾出一个空间，按Eviction Policy选择一个cacheline进行驱逐，其他cacheline依旧进行Aging Policy。
![](https://pic4.zhimg.com/v2-d33886e9b710a7968c3cdcaeb1772549_r.jpg)从时间的宏观上，对于一个cacheline来说，它整个生命周期会接受不同的policy，从Insertion Policy进入，从Promotion Policy得到“保温”，重新进入相对安全期，从Aging Policy开始相对老化，从驱逐策略Eviction Policy退出Cacheset的舞台，给新cacheline腾出位置。

LRU
回归LRU的正题，LRU的这些策略的配置如下——

![](https://pica.zhimg.com/v2-92c46eda715af330adeff4b62f83287e_r.jpg)对于Cacheline hit的具体情况如下——

![](https://pic1.zhimg.com/v2-785c5c87ee70a60170b0c74838c90dbc_r.jpg)对于Cacheline miss的具体情况如下——

![](https://picx.zhimg.com/v2-2453fa41b0af3fdf7ff1cd2a16d413d5_r.jpg)
LRU分析

- cacheline hit相对cacheline miss一般Aging的cacheline会更少，极端情况还是会一样，比如Cacheline hit正是最“危险”，准备被淘汰的cacheline。因而，每个cachlineline也会配对独立的加法器
- LRU需要给每个Cacheline都配备独立的数据来表示他们的年龄/近期性质，数据的大小会取决于cache set内部会有几个cacheline，即 associativity。