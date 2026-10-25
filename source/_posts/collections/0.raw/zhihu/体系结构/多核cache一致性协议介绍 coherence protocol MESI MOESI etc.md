---
title: 多核cache一致性协议介绍 coherence protocol MESI MOESI etc
date: "2021-11-19 00:00:00"
updated: "2021-11-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/多核cache一致性协议介绍-coherence-protocol-MESI-MOESI-etc/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/435087189
---


多年前工作原因参与Power多核系列CPU设计和验证，负责cache一致性工作，对MESI 等4状态至多13状态一致性协议有较为深入的理解。本文试图从最简单的MESI 4状态协议开始，直到IBM在Power6中开始使用13状态的一致性协议来进一步提升性能做一个知识梳理。

### 1. cache一致性协议的目的

可并行执行的程序会划分成不同的程序片段，被安排到不同的cpu core上去执行，不同的core会有独立的私有的cache，程序片段有局部性原则，如果能够让独立私有的cache间共享数据，而不是每个程序片段独立从外部存储器上取数据，那么程序性能就会好。cache coherence protocol就是为了解决这个问题的。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0273274b4cc8.jpg)

core发出数据请求1，总线会把该请求广播(2)到其它core，其它core如果有这个数据，会返回该数据(3)
### 2. MESI协议介绍

MESI是最基本的4状态（2bit）协议，该状态位位于每一个cacheline中。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_5de1fc170522.jpg)

Modified: 意思为此cache line的数据被当前cache隶属于的core更改了，此cacheline的数据和DDR中不一致，也说明其它core的cache不会有此cacheline的数据；

Exclusive: 意思为此cacheline的数据不存在于其它core的cache中，并且独此一份，并且是和DDR中数据是一致的，没有被写过，可以随时覆盖或丢弃而不用再写回ddr；

Shared: 意思为此cacheline中的数据不一定是唯一的，别的core的cache中可能也有，但是数据是和DDR中一致的，随时可以被覆盖或丢弃；

Invalid: 意思是cacheline为空；

例子：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_46d330a1e7c5.jpg)

状态转化：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_bdfc2e106126.jpg)

### 3. MOESI介绍

Owned：意思和上述的Shared类似，不同之处在于在多核系统为了方便总线仲裁，当多个cache拥有相同数据时，选一个负责相应，处于O状态的cache需要相应总线的读取，而处于S状态的不相应。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c0fddb6316c5.jpg)

### 4. 13位协议介绍

为了最大化性能，Power processor总是广播cache请求，收到请求的单位会相应，总线控制器会尽早的根据相应反馈给所有单位，被选中的单位做进一步的数据返回操作，没被选中的单位尽早结束相应。基于这种思想设计的一致性协议：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1c88206baa7c.jpg)

power 5 的9个状态![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0a3435d7e476.jpg)

power 6 再不上4个状态由于这些状态和总线控制器相关，不具有一般性，不做深入探讨了，希望大家可以有种体会即为了提升性能，计算机体系结构已经做到了不可思议的复杂。

### 5. 总结

AI芯片又给做计算机体系结构的人打了一剂强心针，但是AI芯片相对于做了几十年的CPU架构，复杂度上真不是一个量级的。

AI芯片的复杂度更多来自于软件。当芯片内部的很多部件都暴露给软件工程师时，如何写出高性能的库是工作的重点。笔者认为这样的思路是对的，而不应该像CPU那样，单单一个分支预测都可以做出来10级流水线...，硬件工程师搞的头秃，而软件工程师却又帮不上什么忙。

参考：
