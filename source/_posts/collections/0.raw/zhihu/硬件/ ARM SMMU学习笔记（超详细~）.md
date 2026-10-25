---
title: (1 封私信) ARM SMMU学习笔记（超详细~）
date: "2022-07-07 00:00:00"
updated: "2022-07-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/硬件/ARM-SMMU学习笔记(超详细~)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/534550409
---


### 1. 什么是SMMU？

SMMU（system mmu),是I/O device与总线之间的地址转换桥。

它在系统的位置如下图：

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_f889bf6a706f.jpg)

它与mmu的功能类似，可以实现地址转换，内存属性转换，权限检查等功能。

<strong>好文推荐：</strong>

[字节终面：CPU 是如何读写内存的？](https://zhuanlan.zhihu.com/p/522038503)

[全网最牛Linux内核分析--Intel CPU体系结构](https://zhuanlan.zhihu.com/p/472840233)

[一文让你读懂Linux五大模块内核源码，内核整体架构设计（超详细）](https://zhuanlan.zhihu.com/p/474337723)

[嵌入式前景真的好吗？那有点悬！](https://zhuanlan.zhihu.com/p/481425267)

[一文教你如何使用GDB+Qemu调试Linux内核](https://zhuanlan.zhihu.com/p/478762354)

[Linux内核必读五本书籍(强烈推荐)](https://zhuanlan.zhihu.com/p/472962137)

[全网独一无二Linux内核Makefle系统文件详解（一）(纯文字代码)](https://zhuanlan.zhihu.com/p/490198354)

[带你深度了解Linux内核架构和工作原理！](https://zhuanlan.zhihu.com/p/489733923)

[如何读懂GDB底层实现原理（从这几点入手~）](https://zhuanlan.zhihu.com/p/492380529)

[一文彻底理解Memory barrier（内存屏障）](https://zhuanlan.zhihu.com/p/491567798)

[一篇文带你搞懂，虚拟内存、内存分页、分段、段页式内存管理（超详细）](https://zhuanlan.zhihu.com/p/491457649)

### 2. 为什么需要SMMU？

了解SMMU出现的背景，需要知道系统中的两个概念：DMA和虚拟化。

DMA：（(Direct Memory Access），直接内存存取, 是一种外部设备不通过CPU而直接与系统内存交换数据的接口技术 。外设可以通过DMA，将数据批量传输到内存，然后再发送一个中断通知CPU取，其传输过程并不经过CPU， 减轻了CPU的负担。但由于DMA不能像CPU一样通过MMU操作虚拟地址，所以DMA需要连续的物理地址。

虚拟化：在虚拟化场景， 所有的VM都运行在中间层hypervisor上，每一个VM独立运行自己的OS（guest OS）,Hypervisor完成硬件资源的共享, 隔离和切换。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_06d12c6d04ae.jpg)

但对于Hypervisor + GuestOS的虚拟化系统来说, guest VM使用的物理地址是GPA, 看到的内存并非实际的物理地址(也就是HPA)，因此Guest OS无法正常的将连续的物理地址分给硬件。

因此，为了支持I/O透传机制中的DMA设备传输，而引入了IOMMU技术（ARM称作SMMU）。

总而言之，SMMU可以为ARM架构下实现虚拟化扩展提供支持。它可以和MMU一样，提供stage1转换（VA->PA）, 或者stage2转换（IPA->PA）,或者stage1 + stage2转换（VA->IPA->PA）的灵活配置。

*[VA：虚拟地址；IPA: 中间物理地址；PA：物理地址]

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_6f25ec737ff0.jpg)

### 3. SMMU常用概念

术语 概念

StreamID 一个平台上可以有多个SMMU设备，每个SMMU设备下面可能连接着多个Endpoint， 多个设备互相之间可能不会复用同一个页表，需要加以区分，SMMU用StreamID来做这个区分( SubstreamID的概念和PCIe PASID是等效的)

STE Stream Table Entry, STE里面包含一个指向stage2地址翻译表的指针，并且同时还包含一个指向CD（Context Descriptor）的指针.

CD Context Descriptor, 是一个特定格式的数据结构，包含了指向stage1地址翻译表的基地址指针


【文章福利**】小编推荐自己的Linux内核技术交流群:【891587639】整理了一些个人觉得比较好的学习书籍、视频资料共享在群文件里面，有需要的可以自行添加哦！！！

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_a041a705367f.jpg)

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_e1fee1d3c356.jpg)

<strong>学习直通车：</strong>

<strong>内核资料直通车：</strong>

### 4. SMMU数据结构查找

SMMU翻译过程需要使用多种数据结构，如STE, CD，PTW等。

#### 4.1 SID查找STE

Stream Table是存放在内存中的一张表，在SMMU驱动初始化时由驱动程序创建好。

Stream table有两种格式，一种是Linear Stream Table, 一种是2-level Stream Table.

1. Linear Stream Table

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_eaf600541663.jpg)

Linear Stream Table是将整个stream table在内存中线性展开成一个数组， 用Stream Id作为索引进行查找.

Linear Stream Table 实现简单，只需要一次索引，速度快；但是平台上外设较少时，浪费连续的内存空间。

2. 2-level Stream Table

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_eb341c03f41f.jpg)

2-level Stream Table， 顾名思义，就是包含2级table, 第一级table， 即STD，包含了指向二级STE的基地址STD。第二级STE是Linear stream Table. 2-level Stream Table的优点是更加节省内存。

SMMU根据寄存器配置的STRTAB_BASE地址找到STE， STRTAB_BASE定义了STE的基地值， Stream id定义了STE的偏移。如果使用linear 查找， 通过STRTAB_BASE + sid * 64（一个STE的大小为64B）找到STE；若使用2-level查找， 则先通过sid的高位找到L1_STD（STRTAB_BASE + sid[9:8] * 8, 一个L1_STD的大小为8B）, L1_STD定义了下一级查找的基地址，然后通过sid 找到具体的STE（l2ptr + sid[7:0] * 64）.

最终找到的STE如下所示，表中的信息包含属性相关信息， 翻译模式信息（是否 stream bypass, 若否，选择stage1, stage2或者stage1 + stage2翻译模式）。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_93fc590ca1cb.jpg)

找到STE后可以进一步开始S1翻译或S2翻译.

#### 4.2 SSID查找CD

CD包含了指向stage1地址翻译表的基地址指针.

如下图所示， STE指明了CD数据结构在DDR中的基地址S1ContextPTR, SSID(substream id)指明了CD数据结构的偏移，如果SMMU选择进行linear, 则使用S1ContextPTR + 64 * ssid 找到CD。如果SMMU选择2-level, 则使用ssid进行二级查找获得CD（与上节STE的方式一致）。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_ed8b647506ad.jpg)

最终找到的CD如下所示：

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_34e13d6a8d89.jpg)

表中信息包含memory属性，翻译控制信息，异常控制信息以及Page table walk(PTW)的起始地址TTB0, TTB1， 找到TTBx后，就可以PTW了。

### 5. SMMU地址转换

#### 5.1 单stage的地址转换：

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_a4f7afb288b2.jpg)

TTB 和 VA[47:39]组成获取Level0页表的地址PA；

Level0页表中的next-level table address 和 VA[38:30]组成获取Level1的页表地址PA；

Level1页表中的next-level table address 和 VA[29:21]组成获取Level2的页表地址PA；

Level2页表中的next-level table address 和 VA[20:12]组成获取Leve3的页表地址PA；

level3页表中的output address和va[12:0]组成获取组后的钻换地址

在stage1地址翻译阶段：硬件先通过StreamID索引到STE，然后用SubstreamID索引到CD， CD里面包含了stage1地址翻译（把进程的GVA/IOVA翻译成IPA）过程中需要的页表基地址信息、per-stream的配置信息以及ASID。在stage1翻译的过程中，多个CD对应着多个stage1的地址翻译，通过Substream去确定对应的stage1地址翻译页表。所以，Stage1地址翻译其实是一个（RequestID, PASID） => GPA的映射查找过程。

#### 5.2 stage1+stage2的地址转换：

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_0016dc1442b7.jpg)

在使能SMMU两阶段地址翻译的情况下，stage1负责将设备DMA请求发出的VA翻译为IPA并作为stage2的输入， stage2则利用stage1输出的IPA再次进行翻译得到PA，从而DMA请求正确地访问到Guest的要操作的地址空间上。

在stage2地址翻译阶段：STE里面包含了stage2地址翻译的页表基地址（IPA->HPA）和VMID信息。如果多个设备被直通给同一个虚拟机，那么意味着他们共享同一个stage2地址翻译页表。

在两阶段地址翻译场景下， 地址转换流程步骤：

Guest驱动发起DMA请求，这个DMA请求包含VA + SID前缀

DMA请求到达SMMU，SMMU提取DMA请求中的SID就知道这个请求是哪个设备发来的，然后去StreamTable索引对应的STE

从对应的STE表中查找到对应的CD，然后用ssid到CD中进行索引找到对应的S1 Page Table

IOMMU进行S1 Page Table Walk，将VA翻译成IPA并作为S2的输入

IOMMU执行S2 Page Table Walk，将IPA翻译成PA，地址转化结束。

### 6. SMMU command queue 与 event queue

系统软件通过Command Queue和Event Queue来和SMMU打交道，这2个Queue都是循环队列。

Command queue用于软件与SMMU的硬件交互，软件写命令到command queue, SMMU从command queue中 地区命令处理。

Event Queue用于SMMU发生软件配置错误的状态信息记录，SMMU将配置错误信息写到Event queue中，软件通过读取Event queue获得配置错误信息并进行配置错误处理。

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_5d8159177c72.jpg)

![](/images/collections/0.raw/zhihu/%E7%A1%AC%E4%BB%B6/asset/img_a3889a1b2fc2.jpg)
