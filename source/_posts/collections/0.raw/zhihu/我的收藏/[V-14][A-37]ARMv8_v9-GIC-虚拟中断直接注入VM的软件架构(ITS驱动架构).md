---
title: "[V-14][A-37]ARMv8/v9-GIC-虚拟中断直接注入VM的软件架构(ITS驱动架构)"
date: "2026-07-04 00:00:00"
updated: "2026-07-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[V-14][A-37]ARMv8_v9-GIC-虚拟中断直接注入VM的软件架构(ITS驱动架构)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2056746236506535677
---


ver0.1

前言
前文我们介绍了虚拟中断直接注入VM的路由机制，以及这个机制下的Doorbell机制，应该说从系统层面大家已经对整体的虚拟中断直接注入的流程有了大概的了解了。在这个基础上，本文我们将从软件层面对上述的过程做一下介绍，毕竟这个世界还是码农多，哈哈哈，也顺势将虚拟中断直接注入VM的软件架构的路由和处理两个方面做一下详细的阐述。同样在开始本文的阅读之前，希望大家阅读一些前序文章找找感觉： (0)[[V-00] 虚拟化概论-思想篇 ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247483660%26idx%3D1%26sn%3D587aa3603240b89eb4a2e5bc80f27a6d%26chksm%3Dc0824263f7f5cb75bab76cba9d8a2c02420eba23b971f050ec9fb4a91a6e032023763ff0fef1%26scene%3D178%26cur_album_id%3D3465892385727528966%23rd) (1) [[V-02] 虚拟化基础-CPU架构(基于AArch64) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247483708%26idx%3D1%26sn%3Dcce1079e96a3cd09d4eb5c7c6599ffd2%26chksm%3Dc0824253f7f5cb45df7b890c9f48ae8520e20dc5d1af44707e96be430da31866fe47b781d35d%26scene%3D178%26cur_album_id%3D3465892385727528966%23rd)

 (2) [[V-05] 虚拟化基础-异常模型(Exception)(AArch64) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247483766%26idx%3D1%26sn%3D76f40e40e4fbe2fe2cb38fdb4cb8d62e%26chksm%3Dc0824219f7f5cb0f3e78024da9d2ed354e2f636888964c15a34485666174ea44b76a1ade7135%26scene%3D178%26cur_album_id%3D3465892385727528966%23rd). 

(3) [[A-25]ARMv8/v9-GIC的系统架构(中断的硬件基础)](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484194%26idx%3D1%26sn%3D897f1d239d1c3dfb3c9f7c526befe220%26chksm%3Dc082404df7f5c95be859dc5e88386dd05138285e37e5d3dcec5292f0773ad07b7810169c8568%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd)

 (4) [[A-26]ARMv8/v9-GIC的中断类型](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484209%26idx%3D1%26sn%3D1aa2c246b8cf39cf382d8acc3b09690c%26chksm%3Dc082405ef7f5c9480764c00613281b0f6ac5c3e68d1e8a53546f58085dfc401c459c0dde85ba%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(5) [[A-27]ARMv8/v9-GIC的核心组件(中断编程的基础组件) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484223%26idx%3D1%26sn%3D08ff097ee426b7efa9403b24d3ee99d0%26chksm%3Dc0824050f7f5c946b5eec35de87e4b4596562b347638c352bb9b92d1c5729a0ea64cf4274234%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd)

 (6) [[A-28]ARMv8/v9-GIC中断信号的路由机制与策略 ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484239%26idx%3D1%26sn%3D7fb7bfc430d8edeb1fc395a0e28db101%26chksm%3Dc0824020f7f5c936f87fe99b305cdd21313bc9bb8c3254e2e800337ac6c3754bb5e79cd3a674%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd)

 (7) [[A-29]ARMv8/v9-GIC-中断子系统的安全架构设计(Security/FIQ/IRQ) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484255%26idx%3D1%26sn%3D01a8cf3d1336f9a2c624ecf9b78a581f%26chksm%3Dc0824030f7f5c9267694028538fe8a05b4baefe6bd3470b10b6100318d0091ef0fd2759ae477%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(8) [[A-30]ARMv8/v9-GIC-中断处理(中断状态机\中断生命周期)](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484272%26idx%3D1%26sn%3Dde3d718e7f4cbdd20c5f224bd68dd67b%26chksm%3Dc082401ff7f5c9098d7b978401bc0f70b5e4fba8c05540c7ec6b79f9169afe07c6cd316baa55%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(9)[[A-31]ARMv8/v9-GIC-中断处理(中断优先级/中断抢占/中断嵌套) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484295%26idx%3D1%26sn%3Db3fcd3a5c4780e82c5d2646fe69a1281%26chksm%3Dc08240e8f7f5c9fe295eaf5a038541d69c10936ba8f9b6805ee9a08d7fb25431a6857f655536%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(10)[ [A-32]ARMv8/v9-GIC-LPIs类型中断的架构和工作机制](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484312%26idx%3D1%26sn%3D9c7c74d65f615ffdd8f382062b99fe10%26chksm%3Dc08240f7f7f5c9e126972f03ce4ad67182dc274d67416d96dcce7d621b797f0b639dc40bb9c1%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(11)[[V-10]ARMv8/v9-CPU Virtualization-CPU虚拟化架构简介(vCPU/vPE) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484327%26idx%3D1%26sn%3De0f805f135411bc1b523b5e721b9a045%26chksm%3Dc08240c8f7f5c9de21b955a097ec6d46a321d3ac5fe1e6eca0797ba6bab9031ec625a8a3ec80%26scene%3D178%26cur_album_id%3D3465892385727528966%23rd) 

(12)[[V-11][A-33]ARMv8/v9-GIC-中断虚拟化架构与工作原理](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484347%26idx%3D1%26sn%3D2961afcae13af8baf9c16144aef0ddd8%26chksm%3Dc08240d4f7f5c9c2b8ffeb76c8fb02a53ceb9beb5ee5c42c4b3c155da4a395d185102a302928%26scene%3D178%26cur_album_id%3D3465892385727528966%23rd) 

(13)[[A-34]ARMv8/v9-GIC-LPIs类型中断的路由机制(PCIE-MSI简介) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484367%26idx%3D1%26sn%3Db952aafcc97a0532659b9aacfeb65893%26chksm%3Dc08240a0f7f5c9b6b65a59dcefb88a384ad9b6b7d0891d7ebdc890ab5d85f692d747182e539b%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd) 

(14)[[V-13][A-36]ARMv8/v9-GIC-虚拟中断直接注入虚拟机的路由机制(Doorbell) ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkwNDY5NzM0NA%3D%3D%26mid%3D2247484389%26idx%3D1%26sn%3Dd0996463585828f6d4608d4a4ec1cdeb%26chksm%3Dc082408af7f5c99c2f4ad04eef1639a081c579eb3b4c33c7fdacc892b0f7664e3935801da9dd%26scene%3D178%26cur_album_id%3D3521355675752595456%23rd)

正文

### 1.1 ITS驱动架构(ITS Commands)


### 1.1.1 背景

在正式的介绍虚拟中断直接注入虚拟机的软件架构之前，我们花一点时间介绍一下GIC-ITS的驱动的架构。ITS作为MSI类型中断到达GIC的第一站肩负着将MSI(DeviceID，EventID)翻译成物理中断还是虚拟中断的重要任务。而这个翻译的过程需要借助基于内存的ITS Tables的深度参与，如图1-1所示：

![](https://pica.zhimg.com/v2-9e3c428ccd2af736f397fb9a35deb606_r.jpg)图1-1 An ITS forwarding an LPI to a Redistributor通过对这些ITS这些表的遍历，可以将EventID变成pINTID或者vINTID，然后依然是对这些表的遍历找对应GIC-Redistributor进行物理中断或者虚拟中断的直接投递。 通过上面的描述，可以看出ITS这些基于内存的表的初始化也是完成虚拟中断直接投递到vPE的重要组成部分。这些ITS Tables更加的具体的发挥作用的上下文如手册的描述如下：

<strong>Mapping an interrupt to a Redistributor</strong> Every peripheral that can send interrupts to an ITS has its own DeviceID. Each DeviceID requires its own Interrupt Translation Table (ITT) to hold its EventID to INTID mappings. Software must allocate memory for the ITT and then use the MAPD command to map the DeviceID to the ITT. <strong>Reconﬁguring LPIs</strong> LPI conﬁguration information is stored in a table in memory, not in registers. Redistributors cache the LPI conﬁguration information for performance reasons. This means that to reconﬁgure an LPI, software must: • RUpdate the entry in the LPI Conﬁguration table. • REnsure global visibility of the update or updates. • RInvalidate any caching of the conﬁguration in the Redistributors. The invalidation of the cache in the Redistributor is performed by issuing the ITS INV or INVALL commands. The INV command invalidates the entry for a speciﬁc interrupt, so this command is typically used when reconﬁguring a small number of LPIs. The INVALL command invalidates entries for all interrupts in a speciﬁed collection. If an ITS is not implemented, software must write to the GICR_INVLPIR or GICR_INVALLR registers instead to cause the Redistributors to reload the interrupt conﬁguration. <strong>Migrating interrupts between Redistributors</strong> You can use several diﬀerent techniques to move an interrupt from one Redistributor to another: • Remap a collection. Software can move all interrupts from one Redistributor to a diﬀerent Redistributor by remapping the entire collection. This is typically done when the processing element attached to the Redistributor is powering down, and the interrupts must be moved to another Redistributor. • Map an interrupt to a diﬀerent collection. Individual interrupts can be remapped to a diﬀerent collection. <strong>Removing interrupt mappings</strong> To remap or remove the mapping of an interrupt, software must do the following: • Disable the physical INTID to which the interrupt is currently mapped. This is done in the LPI conﬁguration tables. For more information, see Reconﬁguring LPIs. •  Issue a DISCARD command. This removes the mapping of the interrupt and clears the pending state of the mapped INTID. •  Issue a SYNC command and wait until the command has completed. After the command has completed, no more interrupts are delivered to the Redistributor to which the interrupts were previously mapped. <strong>Remapping or removing the mapping of devices</strong> To change or remove the mapping for devices software must do the following: •  Follow the steps in Removing interrupt mappings for each EventID of that peripheral that is currently mapped. •  Issue a MAPD command to remap the device. Alternatively, a MAPD command with the valid bit cleared to 0 removes the mapping. •  Issue a SYNC command and wait until the command has completed. <strong>Remapping a vPE to a diﬀerent Redistributor</strong> If a hypervisor migrates a vPE to a diﬀerent a Redistributor that is part of a diﬀerent CommonLPIAﬀ group, the ITS mappings must be updated so that virtual interrupts are sent to the correct location. The ITS mappings are updated using the VMOVP command, followed by VSYNC to synchronize the context. <strong>Removing mappings</strong> The mappings commands, VMAPP and VMAPTI , have a V ﬁeld. When V=1, they are treated as mapping commands. When V=0, they are treated as un-mapping commands. When removing the mapping for a vPE, software must ﬁrst remove all the interrupt mappings for that vPE. <strong>Changing vLPI conﬁguration</strong> As with physical LPIs, a Redistributor is permitted to cache the conﬁguration of vLPIs. If the conﬁguration of a vLPI is changed the cached copy must be invalidated. There are two ITS commands available to do this. The INV command is typically used when changing the conﬁguration of a single, or small number, of vLPIs. A separate INV is required for each vLPI that is modiﬁed. The VINVALL command invalidates the conﬁguration of all vLPIs that belong to a speciﬁed vPE. This command is typically used when modifying many vLPIs. In GICv4.1, invalidation can also be carried out using the GICR_INVLPIR register in each Redistributor. Arm expects that software will either use the commands or the registers but will not regularly mix use of both approaches.我们将手册中关于通过软件对于ITS的控制，进而达到控制MSI物理中断和虚拟中断的场景都做了详细的罗列，这里面最核心的点就是ITS Commands。通过ITS的这些命令可以实现在初始阶段和运行时静态的或者动态的控制物理中断和虚拟中断和GIC-Redistributor的映射关系从而达到灵活控制整个系统负载均衡的目的。有两个点需要澄清一下： (1) 上面摘录的手册中的内容涵盖了LPIs物理中断处理的部分，主要是基于完整性的考虑，前面的章节介绍中这一部分都没有做过详细的介绍，这里一并补充一下，事实上物理中断和虚拟中断同样重要，都值得研究。 (2) 上面介绍了”Removing mapping”、“Remapping”、“ReConfiguration”的的场景，也是处于介绍技术完整性的考虑。这个只是代表目前的ARM的GIC架构支持在运行时做这些重新配置的操作，不代表量产的时候一定要这么去做，反而是要更加的谨慎的在运行时做这些事情，因为真的很容易出错，需要花费大量的精力去维护。

基于上面的背景，我们就要看到从软件层面看一下，到底是如何通过ITS Commands实现的一个MSI类型的中断经过映射成为虚拟中断然后找到一个目标GIC-Redistributor。

### 1.1.2 ITS Commands

先让我们来认识一下ITS 的Commands，看一下手册中的介绍：

 An ITS is controlled using a command queue in memory. The command queue is a circular buﬀer and it is deﬁned by the following three registers: <strong>GITS_CBASER</strong> This register speciﬁes the base address and size of the command queue. The command queue must be 64KB aligned and the size must be a multiple of 4KB. Each entry in the command queue is 32 bytes. GITS_CBASER also speciﬁes the cacheability and shareability settings that the ITS uses when accessing the command queue. <strong>GITS_CREADR</strong> This register points to the next command that the ITS will process. <strong>GITS_CWRITER</strong> This register points to the entry in the queue where the next new command should be written.GIC-ITS是收到内存中的一个Commands Queue控制，这是一个环形的Buffer，通过三个寄存器控制命令的执行时序，如图1-2所示： 

![](https://pic1.zhimg.com/v2-8436a719e3aeda61d455cfec063aa874_r.jpg)图1-2 The ITS command queue通过上图结合手册中的描述我们梳理几个关键的点： (1) 先来看一下GITS_CBASER的格式，如图1-3所示： 

![](https://pica.zhimg.com/v2-f116089605e642246835a5b4aa1b9824_r.jpg)图1-3 GITS_CBASER, ITS Command Queue Descriptor这里面需要清楚的第一点就是ITS Commands Queue这段内存区域是PE-Cores和GIC控制器共享的，共享的属性通过Shareability控制，如图1-4所示： 

![](https://pic2.zhimg.com/v2-86f2b27f2a7eaba7f229eaa5b0d43165_r.jpg)图1-4 Inner and outer shareable domainsITS Commands Queue这部分内存就比较特殊一些，这部分区域是一个生产者和消费者的模式在运作，CPU上运行的ITS驱动程序扮演者生成的角色，而GIC-ITS扮演者消费者的角色。GITS_CBASER里面有InnerCache和OuterCache这两个可配置的区域，为了是总线上的设备的性能达到最佳状态，ARM的体系下的各个IP是支持Cache操作的(关于Cache，我们前面也写过系列的文章做过基础知识的介绍)，而GIC的内部组件也支持对系统内存的Cache。根据具体的SOC的实现，双方都支持对系统内存的Cache，这也有内外之别了，如图1-5所示： 

![](https://pic4.zhimg.com/v2-67e3c12dfacd2c5407859e4b91683103_r.jpg)图1-5 Cacheable properties of memory我们简要的介绍如下： (1)Inner Cacheable：与 Inner Shareable 属性密切相关。Inner Shareable 区域内的内存通常具有 Inner Cacheable 属性，这些内存主要用于在同一集群内的处理器核心之间共享数据，并且在该集群内的缓存管理相对较为简单，因为只需保证集群内的一致性。 (2)Outer Cacheable：与 Outer Shareable 属性相关联。Outer Shareable 区域的内存具有 Outer Cacheable 属性，适用于系统中更广泛的组件之间共享数据，包括不同集群的处理器核心以及其他外部设备，所以需要更复杂的缓存一致性机制来确保数据在整个系统范围内的一致性。而结合到本文，这里的外部设备就是GIC这控制器了。

GITS_CBASER的其他字段以及GITS_CREADR和GITS_CWRITER都比较好理解，就不展开讨论了，大家可以自行查阅手册进一步探索细节，其实搞懂了这3个寄存器的作用以及这部分内存的属性也就搞懂了ITS Commands Queue的工作原理。下面看一下ITS支持命令的集合(节选)，如图1-6所示： 

![](https://picx.zhimg.com/v2-5acedf0141a9af2d313b6a5ca608ea51_r.jpg)图1-6 ITS Commands
### 1.1.3 GIC-ITS驱动架构

通过上面的介绍我们清楚了ITS Commands在实现MSI类型中断注入ARM PE-Cores这个过程中的重要性。 而GIC-ITS驱动架构则扮演着控制ITS行为的角色，不但要在初始化阶段发送ITS指令初始ITS Tables，还要在运行时根据上下文的策略要求(例如vCPU线程在不同的PE-Core上迁移)通过ITS的命令重新配置ITS Tables。本节就对ITS的驱动的架构做一个简要的介绍，帮助我们从软件的视角重新审视虚拟中断的路由过程。 让我们先换上一个的视角再来重新认识一下GIC，看一下GIC的系统架构，如图1-7所示。 

![](https://pic3.zhimg.com/v2-069fee6903caeee02d33ed09cca197a2_r.jpg)图1-7 GIC top-level structure options通过上面的GIC系统架构图，我们能够更加清晰的看清楚GIC内部的结构(注意，这只是一种实现方式)，之所以GIC的驱动能够对GIC内部的各个核心组件(ITS、Distributor、Redistributor)进行编程的硬件基础就是从系统架构上这些组件都是通过一致性总线的接口连接在一条总线上，PE-Core可以通过总线对他们进行控制。那么对应的ITS驱动的架构也就比较清晰了： 

![](https://pic3.zhimg.com/v2-aba6332053bc437f1c4c64b47c2953cc_r.jpg)图1-8 High-Level GIC-ITS ARCH我们对GIC-ITS的驱动架构做一下简要的介绍： (1) 由于GIC的特殊性，应用空间(EL0)不会有模块需要和GIC-ITS进行交互。 (2) 各个VM内部的GIC驱动对ITS的操作都会被Hypervisor截获并做仲裁处理，这部分就比较复杂了，比如最近带的项目Remapping虚拟中断对应vCPU，VM内部和Hypervisor都需要修改。 (3) Hypervisor内部就比较容易理解了，主要就是初始化GIC、发送ITS Commands到ITS Commands Queue，然后等待ITS Commands的执行结果就好了，如果命令执行报错，GIC-ITS会评估是否需要向CPU的驱动抛出异常，CPU截获ITS报错异常进行处理就好了，每条ITS指令都有自己的错误码，如图1-9所示： 

![](https://pic2.zhimg.com/v2-84d5950e30fe976b53fccdb4d9a2c629_r.jpg)图1-9 ITS-Command-MOVALL Error Codes(4) 对应的Linux kernel内部的一些具体的实现，这里就不展开讨论了，这里只截取两个代码片段，感兴趣的小伙伴们可以自行阅读代码： ITS Commands的定义如图1-10所示： 

![](https://pic4.zhimg.com/v2-fa9aa40e33300545a0616805d8f9ab7b_r.jpg)图1-10 ITS-Commands(kernel)ITS 驱动发送命令的代码片段，如图1-11所示： 

![](https://pic1.zhimg.com/v2-7d903a2b815bb22f3573381af9c331aa_r.jpg)图1-11 ITS-Commands(Driver)
### 1.2 虚拟中断直接注入虚拟机的软件架构

前一个小节对GIC-ITS驱动架构的介绍，我们只完成了虚拟中断注入虚拟机的路由部分的软件实现的方案的了解。本节我们将完成虚拟中断直接注入VM之后的处理部分的介绍。

### 1.2.1 传统虚拟中断软件架构


![](https://pic1.zhimg.com/v2-f796b751a843de62d6a58a9b0d31f9da_r.jpg)图1-12 ARM传统虚拟中断的软件架构 其实这里对ARM传统的虚拟中断的软件架构的设计重新提一下，主要有两个目的：一个是方便大家对比虚拟中断直接注入VM的软件架构方便理解；第二个目的是之前的文章的配图这块是有一些细节的错误的，关键的寄存器标错了，如VBAR_EL2和VBAR_EL3，这里也算是做一下澄清。

### 1.2.2 虚拟中断直接注入虚拟机的软件架构

ARM体系下所有的中断以及中断的处理其实都属于Exception的范畴，这个我们在前序的文章中反复提到过，这也是构成ARM体系的核心基础概念之一，这里我们就不再重复介绍了。回到中断虚拟化的体系，虚拟中断直接注入VM的软件架构如图1-13所示： 

![](https://pic3.zhimg.com/v2-25fbfdd34da758832f0a261ad5580b46_r.jpg)图1-13 ARM虚拟中断直接注入VM的软件架构通过与传统的虚拟中断的软件架构做对比，我们理解虚拟中断直接注入VM主要有如下几点需要关注： (1) 虚拟中断直接注入VM其实就是跳过了Hypervisor这个Level，避免了每个中断都要先陷入EL2层的情况出现，这也是提升整个中断虚拟化性能核心Feature。 (2) 因为是虚拟化系统，而虚拟中断的目的地是vPE，但是vPE线程是要接受Hypervisor的调度的，那么郎有情的时候，妾未必有意，就是vCPU当前的状态不一定能够及时的响应整个虚拟中断，此时虚拟中断只能Pending。对于一般的中断还好，对于一些紧急的高优先级的中断，这种情况就比较麻烦。因此，ARM搞了辅助的措施避免这种中断长时间的Pending，那就是Doorbell机制，其实就是通过GIC直接发射一个物理中断给Hypervisor，让它赶紧调度目标vPE重新获得物理CPU的时间片资源，尽快执行。这样，pending状态的虚拟中断就会被vPE尽快响应。 (3) 虚拟中断直接注入VM的软件架构和传统的虚拟中断的软件架构不是互斥的关系，而是兼容的互帮互助的关系。一方面目前的各种中断类型在SOC上都是同时存在的，并不是每个中断都可以变成可以直接注入VM的虚拟中断。另外一个方面，支持MSI类型中断的设备也需要一个发展的过程，这里面涉及到实现的难度和成本以及稳定性的因素需要考虑进去。

对于虚拟中断直接注入VM的软件架构就介绍到这里，其他的点就不展开讨论了(例如如1-14的vSGI的直接注入的架构等)，大家还是要多看以前的文章以及多看手册。 

![](https://picx.zhimg.com/v2-f71f3637a1be08c02d62ea09add9166d_r.jpg)图1-14 Process of sending a vSGI
结语
本文我们从ITS的Commands开始，详细的介绍了ITS的驱动的架构，其实也就是勾勒出了虚拟中断直接注入VM的软件架构。后面在传统中断虚拟化架构的基础上，通过对比介绍了虚拟中断直接注入VM的软件架构。写到这里，对于ARM整个中断子系统的介绍也将暂时告一个段落了，前前后后写了挺长时间了，除了是因为中断子系统这一块的重要性之外，还有就是因为目前的项目要对中断子系统做优化，所以就系统性的研究了一下。虽然写了这么多的文章，但是对GIC的理解也还是皮毛，对于很多的细节还是没有研究透彻，请大家多多包涵。最近也在搞调度的优化，下一个系列打算写写调度子系统(也可能会写一下设备虚拟化的基础原理)，其实调度的目的就是把系统资源合理的分配给软件的各个模块使用，而不是让一部分模块多吃多占，联系到目前的中美贸易战，其实就是世界范围内的资源配置失衡导致的，一部分群体占有的太多了，哈哈哈。谢谢大家，请评论、关注和转发。