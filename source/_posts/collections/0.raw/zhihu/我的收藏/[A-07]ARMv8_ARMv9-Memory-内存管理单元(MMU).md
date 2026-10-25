---
title: "[A-07]ARMv8/ARMv9-Memory-内存管理单元(MMU)"
date: "2025-08-19 00:00:00"
updated: "2025-08-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[A-07]ARMv8_ARMv9-Memory-内存管理单元(MMU)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1941251607946847037
---


### **前言**

本来是要写虚拟化系列的文章，而虚拟化技术又是和硬件密切相关的，于是就依托ARM体系架构相继写了几篇虚拟化基础性的文章。等写到内存的时候，发现内存又太过重要，不是写一篇综述级别的文章就能讲清楚的，但是在检讨内存管理的原理时，又觉得Cache太过重要，不写清楚Cache，总觉得内存的事情讲不透，于是就先写了Cache相关系列文章。现在Cache系列的文章暂时告一段落，我们可以开始进入内存的世界，也就离我们码农更近了一些，离CPU远了一些，不过没关系，大家还是要密切配合才能工作，码农平时写得代码以及代码中操作的数据还是要经过内存传递给CPU，由CPU自己处理或者统一调配给总线上的其他功能单元或者外设继续处理，然后实现我们的业务需求，比如可以看到高清画质的大片。基于以上的背景，我们研究内存管理的基本原理就显得更加有必要，可以帮助我们在研究内核的源码中一些核心的数据结构、用户空间内存优化、以及性能调优时候提供理论和方法论的依据。本篇我们先来介绍，ARM体系内存管理的核心单元MMU，也算是我们ARM内存系列文章的绪论。更多精彩内容请参考：

请参考：

[ARMv8/v9合集](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484595%26idx%3D1%26sn%3D00aa9d6f4183745076b6717b015b8813%26chksm%3Dc08247dcf7f5cecac7f1217e5d26602f716f146018bdf563bdec0a5ef81b8704d6dc3dc5897d%26scene%3D178%26cur_album_id%3D3521355675752595456%26search_click_id%3D%23rd)

[虚拟化技术合集](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/mp/appmsgalbum%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26action%3Dgetalbum%26album_id%3D3465892385727528966%26scene%3D173%26subscene%3D%26sessionid%3Dsvr_bd05ff70e6d%26enterid%3D1755610584%26from_msgid%3D2247484110%26from_itemidx%3D1%26count%3D3%26nolastread%3D1%23wechat_redirect)

### **正文**

前面我们介绍了ARM Cache子系统的相关的知识，我们了解到Cache因为特殊的电路结构，作为PE-Core执行单元最亲近的存储组织，通过备份主存中的数据，可以极大提高CPU的工作效率。Cache的结构和容量决定了其在工作的时候也涉及到Cache内部寻址的过程，也可以说是一个映射的过程，就是说通过主存的虚拟地址如何找到主存副本所在的Cache Line，主要有3种方式：VIVT、VIPT、PIPT。简单归纳一下，串联主存、CPU、Cache的线索就是虚拟地址，而在背后驱动这个虚拟地址的功能单元其实就是MMU，内存管理单元。从总线架构的视角看过去，MMU所在位置如图1-1所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_90bf0c352b60.jpg)

图1-1 MMU与典型的ARM总线架构的关系通过图1-1，ARM体系下每一个PE-Core(Master-1中的功能单元)都有一个MMU，负责处理与内存有关的事物。当然，有些情况也要做一下说明：

(1) MMU在ARM体系下是一个相对独立的功能单元，可以通过配置禁止使用，那么此时MMU的功能就需要通过编程的方式让CPU吸收，此时CPU的性能影响是非常大的。

(2) MMU主要是和CPU以及Cache打交道，但是如果处理的内存被配置为不可Cache，那么此时MMU也会配合PE-Core绕过Cache直接操作内存(Master 5中的功能单元)。

(3) 内存管理的行文中，如果不做特殊说明，那么“内存”、“外存”、“主存”都是同样含义，专指图1-1 Master-5中的存储单元。

### 1. MMU

#### 1.1 MMU Overview

首先，我们看一下ARM手册中中对MMU的描述：

*Memory Management Unit (**MMU**)*

*Provides detailed control of the part of a memory system that provides a single stage of address **translation**. Most of the control is provided using translation tables that are held in memory, and define the attributes of different regions of the physical memory map.*

*When memory is accessed, the Memory Management Unit (MMU) controls address translation, memory access permissions, memory attribute determination, and memory attribute **checking**.*

*The MMU uses the most significant bits of the Virtual Address to index entries in a translation table and establish which block is being accessed. The MMU translates the Virtual Addresses of code and data to the Physical Addresses in the actual system. The translation is carried out automatically in hardware and is **transparent** to the application. In addition to address translation, the MMU controls memory access permissions, memory ordering, and cache policies for each region of memory.*

*Armv8-A uses a Virtual Memory system where the addresses used by code (virtual addresses) are translated into physical addresses which are used by the memory system. This translation is performed by a part of the processor that is called a Memory Management Unit (MMU). MMUs in the Arm architecture use translation tables stored in memory to translate virtual addresses to physical addresses. The MMU will automatically read the translation tables when necessary, this process is known as a Table Walk.*

*An important function of the MMU is to enable the system to run multiple tasks, as independent programs running in their own private virtual memory **space**. They do not need any knowledge of the physical memory map of the system, that is, the addresses that are used by the hardware, or about other programs that might execute at the same time.*

通过手册中的描述，我们可以抓住这样几个关键词：

**Space**：

在内存的世界里面空间的概念从不同的维度看过去可以有不同的解读，如图1-2所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a0963a1c5ec1.jpg)

图1-2 ARM的内存空间这里我们简单的归纳如下，后续的文章我们会围绕着这些内存管理的重要概念展开讨论，帮助理解内存管理机制的核心思想。

(1)在ARM体系下内存首先被分成了两大相对独立的空间：虚拟内存空间和物理内存空间。虚拟地址空间的使用者：程序员、编译器、连接器。代码从编辑器到二进制文件，再从磁盘中的二进制文件到内存中的布局，再从内存到Cache中，在CPU中的索引都是虚拟地址，而在指令的“发射”阶段将虚拟地址转换成物理地址完成指令或者操作数的寻址。物理地址就比较简单了，系统中所有的硬件在访问物理内存的时候用的都是物理地址。通过图1-2可以看出，物理空间和虚拟空间互不隶属，但是可以映射，可以将虚拟空间映射到物理空间。

(2)从用途的角度出发，内存空间还可以分成不同的地址空间，每个空间都有自己的容量，互不重叠(富裕的时候直接通过内存空洞隔离)，尤其是ARM这种统一编码的内存管理体系，IO空间也被编码到内存空间内部，对IO空间的访问如同对内存空间的访问一样(注意对IO空间的访问实际上还是需要特殊的功能单元做辅助处理，这个功能单元就是SMMU或者IOMMU，尤其是在虚拟化技术领域这个功能单元的作用也变得更加突出)。

(3)从权限(异常等级)的角度出发，其实可以对内存空间做细分，比如User Space(EL0)、Kernel Space(EL1)、Hypervisor Space(EL2)、Secure Space(EL3)，上面这个分类的方式可能不是特别严谨，但是大家能了解到从这个维度去细分内存空间就可以了，后面的文章还会详细讨论。对ARM异常模型不了解的同学，可以复习下笔者前序的文章，暂时能理解Userspace和Kernel Space就可以了。

**Checking**：

第二个关键词就是检查，MMU还负责检查或者核查。这里就引出了，内存管理的另外一个重要的课题就是内存的属性，内存空可以根据不同的配置在不同上下文发挥不同的作用，这些属性包括：内存的类型(正常内存、设备内存)、共享属性(核间共享、系统内部共享等)、Cache属性、权限属性(读、写、执行)、对齐和大小端等。这里暂时也不展开，只举一个例子，当CPU试图访问一个只读内存区域往里面做写的动作的时候，一定会被组织并抛出异常，这个哨兵就是MMU。关于内存的属性，这里也举一个简单的例子帮助大家有一个感性的认识，如图1-3所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9e16d213b708.jpg)

图1-3 内存的share属性**Translation**：

MMU重要的一个功能就是地址翻译，将虚拟地址翻译成物理地址。现代处理器的发展也伴随着现代操作系统的发展，两者是相辅相成的，最终的目的却是统一的，那就是在单位时间内执行更多的任务，满足人们的需求，这就是并发这个设计思想的由来。而要做到并发，硬件已经准备好了，前面的文章我们介绍了CPU的架构，大家也不用绕远，看看图1-1 也能发现，现代CPU都是多PE-Core的结构，而且越来越多，随着总线架构的不断向前迭代，ARM已经进军服务器领域了。既然硬件准备好了，接力棒就交到软件领域了，所以OS也对硬件资源做了隔离，初代隔离者是kernel，二代隔离者是Hypervisor，但是这些隔离者对用户来说都是透明的，甚至对一般的用户空间程序的开发者来说也是透明的，用户空间的程序运行的时候，都以为自己拥有全世界，这个世界其实就是虚拟内存空间，如图1-4所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ad0cd69db812.jpg)

图1-4 虚拟地址空间的分类对于内核空间来说，每个操作系统只能有一个共同的区域(在虚拟化环境下，每个OS，不论是Host OS还是GuestOS都有自己的内核空间)，而对于用户空间来说每个进程都拥有一个独立的空间。但是，实际的物理内存空间确实固定且唯一的，那么虚拟的终归是虚拟，总要面对现实，那么这个维持虚拟环境并完成地址空间转换的角色就是MMU。

**Transparent**

这最后一个关键字就是透明，这也是令广大码农朋友最幸福的关键词了，每当在手册中看见“transparent”，就感到眼前一亮，这个时候就会觉得这个世界真好，这个ARM的设计真好，“寡人，从此可以高枕无忧矣，哈哈哈哈”。确实很幸福，该做的事儿，MMU都给你做了，比如MMU的核心功能地址翻译，它都默默给你做好了，如图1-5所示，PE-Core的地址翻译功能。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8208457359ff.jpg)

图1-5 ARM PE-Core地址翻译通过上面的介绍，我们可以讲MMU是PE-Core中一个独立的功能单元，辅助PE-Core进行虚拟地址到物理地址翻译，并通过对内存属性的检查借助异常处理机制是PE-Core的执行始终处于高效且合规的状态执行。而对于应用层软件(对于PE-Core来说，所有的代码包括kernel和User Process都是运行于应用层)，借助MMU的管理机制可以到并发执行多任务的目的。

### 1.2 MMU的结构

经过上面的介绍，我们初步搞清楚了MMU诞生的背景以及关键的feature，本节我们主要关注一下MMU的结构。我们知道MMU是PE-Core中的一个独立的功能单元，这里我们具象化一个具体的PE-Core，如图1-6所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_69097543444a.jpg)

图1-6 ARM Cortex-A 725 Block图先看一下手册中对MMU的描述：

*The Memory Management Unit (**MMU**) translates an input address to an output address.*

*This translation is based on address mapping and memory attribute information that is available in the Cortex ® -A725 core internal registers and translation tables. The MMU also controls memory access permissions, memory ordering, and cache policies for each region of memory.*

*An address translation from an input address to an output address is described as a stage of address translation. The Cortex ® -A725 core can perform:*

*• Stage 1 translations that translate an input Virtual Address (VA) to an output Physical Address (PA) or Intermediate Physical Address (IPA).*

*• Stage 2 translations that translate an input IPA to an output PA.*

*• Combined stage 1 and stage 2 translations that translate an input VA to an IPA, and then translate that IPA to an output PA. The Cortex ® -A725 core performs translation table walks for each stage of the translation.*

*In addition to translating an input address to an output address, a stage of address translation also deﬁnes the memory attributes of the output address. With a two-stage translation, the stage 2 translation can modify the attributes that the stage 1 translation deﬁnes. A stage of address translation can be disabled or bypassed, and cores can deﬁne memory attributes for disabled and bypassed stages of translation.*

*Each stage of address translation uses address translations and associated memory properties that are held in memory-mapped **translation tables**. Translation table entries can be cached into a Translation Lookaside Buﬀer (**TLB**). The translation table entries enable the MMU to provide ﬁne-grained memory system control and to control the table walk hardware.*

下面我们对手册中的内容做一下解读(手册中的描述就是干货，就是精辟而不是屁精，哈哈哈)：

(1) 首先明确了MMU的核心作用就是地址翻译。

(2) MMU需要借助页表(translation table)和系统寄存器才能完成对对内存的控制，控制的内容包括内存的权限、Cache策略等等。注意又引入了一个新的概念页表。

(3) 地址的翻译是需要分阶段的(Stage-1 & Stage-2)，这就有一点门槛了，其实这个如果读者看过笔者的前序虚拟化系列文章，应该不难理解。简单说一下，虚拟化技术发展到现在这个阶段可以做到系统级别的虚拟化，也就是说在同一个硬件环境下面通过Hypervisor的隔离可以同时运行多个GuestOS，而GuestOS之前那可是控制硬件的软件大哥啊，比如kernel就控制着整个系统物理内存的分配，现在GuestOS自己也被虚拟化了，要让kernel干活，就需要给它幻觉GuestOS的kernel认为自己还拥有物理内存的控制权，这个GuestOS视角的物理内存空间就叫做IPS(Intermediate Physical Space，中间物理地址空间)，在GuestOS的虚拟机启动的时候是必须要传递相应的物理参数的，对应的地址空间就是IPA中间物理地址。所以GuestOS中的进程执行的时候会做第一阶段的地址转换，也就是VA到IPA。当Hypervisor知道VM要访问内存之后，就要讲PE-Core状态做相应的权限调整，让CPU意识到一次翻译还不过，还要做第二阶段的地址翻译也就是讲IPA翻译成PA。这部分内容，后面我们会详细讨论，这里大家暂时了解这个背景就可以了。

(4) MMU不但可以进行地址翻译还可以对翻译的结果进行缓存操作，经过前面Cache系列文章的介绍，这个设计就很好理解了，就是为了提高PE-Core的执行效率，因为根据局部性原理，PE-Core再次访问上次访问的地址空间的概率是非常大的，因此下个指令周期访问内存就不需要进行翻译动作，直接就可以从缓存中返回结果，这个缓存就是TLB。

了解了MMU设计的一些背景之后，我们再来看一下Cotex-A725的MMU内部有哪些组件构成， 如图1-7所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_79c696cf12ec.jpg)

图1-7 Cortex-A725 MMU 组件这里面我们重点介绍一下TLB，先看下手册的描述：

*Translation Lookaside Buﬀer (TLB) entries store the context information required to facilitate a match and avoid the need for a TLB clean on a context or virtual machine switch.Each TLB entry contains:*

*• A Virtual Address (VA)*

*• A Physical Address (PA)*

*• A set of memory properties that includes type and access permissions*

*Each TLB entry is associated with either:*

*• A particular Address Space IDentiﬁer (ASID)*

*• A global indicator*

*Each TLB entry also contains a ﬁeld to store the Virtual Machine IDentiﬁer (VMID) in the entry applicable to accesses from EL0 and EL1. The VMID permits hypervisor virtual machine switches without requiring the TLB to be invalidated.*

根据手册的描述，TLB大概长这个样子，如图1-8所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a9bff7415dcd.jpg)

图1-8 TLB的结构示意图其他的内存前面我们都介绍了，这里只讨论两点：

(1) ASID的设计是为了区别不同的进程空间，而VMID的设计是为了区别不同的GuestOS运行的VM，这些都是方便CPU能够正确识别目前运行的Context。当然大家要清楚，这只是示意图帮助大家理解，实际的MMU工作中，还要结合系统寄存器的确定PE的状态，确定内存工作的Space等条件综合判断TLB是否命中，如下面的引用中的描述。

*The ASID information is used for the purpose of TLB matching for entries using:*

*• The Secure EL1 and EL0 and Non-secure EL1 and EL0 translation regime*

*• The Secure EL2 and EL0 and Non-secure EL2 and EL0 translation regime*

*The VMID information is used for the purpose of TLB matching for entries using:*

*• The Secure EL1 and EL0 and Non-secure EL1 and EL0 translation regime, when EL2 is enabled.*

(2) TLBs的空间也支持软件的方式可编程的干预，具体不展开，这里只列出部分指令(如图1-9所示)，一般的码农很少会涉猎这部分内容的编辑，因此不是我们研究的重点，考虑的文章的完整性，这里简单罗列一下，感兴趣的同学可以自行查阅手册。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_1b413c50f004.jpg)

图1-9 部分TLB操作指令**1.3 MMU的工作流程**

关于MMU的内容还有很多，比如MMU工作的空间配置、内存属性的检查流程、异常处理等等，我们陆续都会在后续的文章中穿插进去给大家介绍清楚。这里我们先归纳一下MMU工作的一般流程，如图1-10所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7a4ec5076900.jpg)

图1-10 MMU的一般工作流程我们对MMU的工作流程做一个简单归纳如下。

(1) 软件的代码在CPU上执行涉及的指令和操作数的读取使用的都是虚拟地址，虚拟地址是需要转换成物理地址，才能在真实的物理设备上被定位的，PE-Core为了提高工作效率将这个翻译的工作委托给了MMU。

(2) 初次拿到地址之后，MMU中的有一个sub unit名字叫Table walk unit，负责按照一定规则到内存中去遍历物理内存找到后返回给PE-Core的相关单元比如取指令的单元到指定的位置(需要借助PC寄存器)加载到PE-Core，继续执行，但是这种遍历是非常耗时的，为了提高效率。软件工程师和硬件工程达成了一致意见，在内存中开辟一段区域对内存做多级管理，例如“中国-辽宁省-大连市-高新园区-七贤岭街道-xxx小区-xxx楼--单元”，相当于对遍历工作做了优化。

(3) 访问外存终归还是慢，即便做了优化还是要多耗费很多时钟周期，于是大家发现可以借鉴Cache的工作机制和局部性原理，讲Table Walk Unit的遍历结果缓存起来，那么就是存在TLBs。下次CPU在发过来一个虚拟地址，先到TLBs里面去遍历一圈，大概率会命中。真的赶上指令长跳或者异常处理导致的上下文切换，那么就冲刷掉TLBs里面的内容，让Table Walk Unit重新遍历，重新缓存就行了。那么是否每次都要冲刷以及冲刷的范围，又可以根据PE-Core的设计，根据Cache的策略进一步进行优化，毕竟现在TLBs也是多级Cache的架构。

(4) 当然如果一切顺利就还好，但是这个世界总是充满各种各样的不确定行，那么也要做好应急预案。例如一直命中当然是好的，如果不能命中，比如要访问的内存是文件中的内存，那么MMU就会有异常抛出通知CPU去执行IO操作将磁盘中的文件加载内存。再举一个例子，如果访问的内存位置经过权限坚持为非法访问，那么也需要抛出异常让PE-Core执行相应的例程干预相关非法的行为。

上面，我们粗线条的描述 了MMU的一般工作流程，详细的流程和设计思想我们会在后续的文章中继续讨论。

### 结语

本文我们还是从一张典型的总线架构图开始，层层分解从PE-Core定位到MMU，又从MMU定位到了TLBs以及Table walk Unit。通过一个具象化的MMU实例的介绍，MMU工作的一般流程，目的就是让大家对内存管理有一个感性的认识，对MMU的工作流程有一个大致的印象，把一些内存管理的基本概念也逐一引出来，后面的文章我们会循着这个MMU工作的脉络和这些基本的概念对AMR体系的MMU管理机制的核心思想和大家阐述和探讨清楚。基于以上的想法，因此本篇也算是内存管理系列文章的绪论吧，请大家保持关注。