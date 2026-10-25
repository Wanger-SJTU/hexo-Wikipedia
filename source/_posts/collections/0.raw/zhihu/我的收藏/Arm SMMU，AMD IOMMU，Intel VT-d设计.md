---
title: (2 条消息) Arm SMMU，AMD IOMMU，Intel VT-d设计
date: "2025-02-12 00:00:00"
updated: "2025-02-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Arm-SMMU,AMD-IOMMU,Intel-VT-d设计/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/22616569807
---


Arm SMMU，AMD IOMMU，Intel VT-d相对于MMU都是给外设用的，且区别与在处理器内部的MMU，都是在外设外部。

基本功能包括： 

1. 外设别DMA访问隔离：SMMU通过配置映射表管理外设别DMA请求，确保其只能访问被授权的内存区域，防止非法或越界访问，增强了系统安全性。 

2. 硬件加速器访问控制：对于硬件加速器（如GPU、网络加速器、加密加速器等），SMMU确保它们仅访问指定的内存区域，避免对系统关键数据的干扰，同时优化访问效率。 

3. 虚拟化支持：在虚拟化环境中，SMMU为每个虚拟机提供独立的地址空间映射表，实现内存的隔离，保障虚拟机间不能互相干扰，提升了虚拟化平台的安全性和稳定性。 

4. 中断处理：SMMU在某些实现中，如GICv3，可能间接参与中断路由和管理，特别是与中断的虚拟化处理，确保中断能被正确、高效地路由至目标处理器。

 5. 内存属性管理：SMMU还可以控制内存访问属性，如是否缓存、共享与否、访问权限等，进一步细化内存管理，提升系统整体性能和安全性。组件与实现：·Stream Table：根表基地址寄存于寄存器中，是SMMU查找中断或DMA请求映射的起点。·Context Descriptor：描述符定义了第一阶段映射表的基地址，与第二阶段配置相关联。·Translation Tables：用于实际的地址转换，依据不同阶段的映射表结构，完成从虚拟到物理地址的映射。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01d6c1bf839c.jpg)

### Arm SMMU

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3e6f98a8d03a.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3b65c47bc1f8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0cb3d3517309.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_62544edaaad4.jpg)

兼容SMMUv3.2架构：

- 支持stage 1 translation, stage 2 translation, and stage 1 followed by stage 2 translation
- 支持ARMv8 AArch32和AArch64页表格式
- 支持4KB，16KB和64KB粒度（AArch64）
- 支持PCIe集成：Address Translation Services (ATS)，Process Address Space IDs (PASIDs)，Access Control Services (ACS)，Support for the PASID TLP prefix for use on ATS Translated transactions
- 支持Page Request Interface (PRI)
- 支持MPAM（memory resource partitioning and monitoring）
- 支持Secure-EL2
- 每个TBU和TCU中都有Performance Monitoring Unit (PMU) 
- RAM支持Reliability, Serviceability, and Availability (RAS) 
AMBA接口：

- ACE5-Lite TBU事务接口，支持原子操作
- ACE5-Lite+Distributed Virtual Memory (DVM)  TCU table walk接口
- 支持AMBA Low‑Power Interface (LPI) Q-channel去控制功耗和时钟门控
- 支持Local Translation Interface (LTI)
- 支持集成Generic Interrupt Controller (GIC)，支持Message Signaled Interrupts (MSIs)
feature：

- 可配置TBU中MicroTLB和MTLB的数量
- TLB direct index和MTLB partitioning
- 优化架构定义的page和block size适配一个cache entry
- TCU中支持TBU的优先级
- TCU预取转换表
- Hit-Under-Miss（HUM）
- TBU/TCU对相同转换的merge
- TCU支持多级多阶段walk cache
- TBU/TCU支持并发转换

#### TBU

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f0d7871ee2c7.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_483c10e78df1.jpg)


TBU（Translation Buffer Unit）用于提供地址转换，提供两种形式：

- ACE-Lite TBU
- Local Translation Interface (LTI) TBU
模块功能介绍

- Write data buffer：用于缓存写请求的数据（2048 entry）
- MicroTLB：地址转换TLB cache（64 entry），先于MTLB访问，替换策略可配置为轮询或伪最近最少使用（PLRU）
- Main TLB：缓存table walk entry（65536 entry），可选，set associative cache structure
- Translation manager：用于管理正在进行的转换请求。每个请求都占用一个slot，直到通过ACE‑Lite TBM向下游传播，或者返回LTI转换响应。所有交易都经过hazard-check ，以减少向TCU发送重复翻译请求的可能性。对不同AXI ID请求是无序地向下游传播。具有相同AXI ID/LTI OG的请求必须保持有序。
- PMU：performance monitor unit
- Clock and power control：TBU有独立的时钟功耗控制，由Q‑Channels provide
- Transaction tracker：用于管理未完成的读写事务，允许在不停止AXI接口的情况下进行无效和同步
- DTI interface
TBS和TBM：

- 支持52-bit地址位宽，
- 数据位宽64bit-512bit
- Outstanding支持读写最大512
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_66e541e16a7c.jpg)

 由 VA、ASID、PA、Attributes 组成，即：

- VA：虚拟地址； 
- ASID：Address Space ID
- PA：物理地址 
- Attributes：属性；
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5360fc5397f1.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f29d15f8c466.jpg)

#### TCU

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eb926bda8959.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_476e51ac7a03.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_91f6d53686fc.jpg)

TCU（Translation Control Unit）功能

- 管理队列
- translation table walk
- Configuration table walk
- 实现备份缓存结构
- 实现SMMU编程模型
TCU模块介绍

- Walk cache：缓存state1和2的table walk caches或者叫paging structure caches
- Configuration cache：用于缓存Context Descriptor (CD) and Stream Table Entry (STE)（4096 entry）
- Translation manager：管理正在进行的转换请求，包括配置和转换table walk的hazard-check （65536 entry）
- Translation request buffer：当translation manager slots满时，存储TBU发送的转换请求
- PMU：performance monitor unit
- Clock and power control：TCU有独立的时钟功耗控制，由Q‑Channels provide
- Queue manager：管理命令和事件队列
- QTW/DVM interface：Queue and Table Walk (QTW)/Distributed Virtual Memory (DVM) interface是ACE-Lite+DVM主接口
- Register file：implements the SMMUv3 programmers model
- DTI interface
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f7a254c1b4d2.jpg)

#### DTI

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_64e32754a3d9.jpg)

The DTI interconnect includes switch, sizer, and register slice components

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_09d31e4faf09.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_23c42bc2f4b1.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_26c1122b840e.jpg)

#### 软件与SMMU的交互

SMMU 提供了三个接口给软件使用

一是基于内存的数据结构，用于配置转换客户端设备地址的转换表。

二是基于内存的循环缓冲区队列，如下所示，其中，Command 队列用于发送给 SMMU 的命令，Event 队列用于来自 SMMU 的事件/故障报告，PRI 队列用于 接收 PCIe 页面请求。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_696dae1e3c22.jpg)

Command queue用于软件与SMMU的硬件交互，软件写命令到command queue, SMMU从command queue中 地区命令处理。 

Event Queue用于SMMU发生软件配置错误的状态信息记录，SMMU将配置错误信息写到Event queue中，软件通过读取Event queue获得配置错误信息并进行配置错误处理。

Page Request Interface queue 是ATS的一个扩展项，是其允许Endpoint请求OS提供映射了页面的内存给DMA使用。

三是一组寄存器，其中一些是安全专用的，用于发现和 SMMU 全局配置。

这些寄存器有以下功能：

1）指明了数据结构和缓冲区队列的基地址；

2）提供特征检测和识别寄存器；todo：什么是特征检测和识别寄存器？

3）提供了一个用以支持队列处理和流量转换的全局寄存器。

当支持安全属性时，还有一组额外的寄存器，这组寄存器有以下功能：

1）允许安全软件维护安全设备的数据结构；

2）允许从第二个 Secure Command 队列上发出命令，以及从 Secure Event 队列中读取安全事件

在允许 stage 1 转换的虚拟化场景中，呈现给 guest OS 编程界面与非虚拟化场景相同，guest OS 认为它是在控制真正的 SMMU （尽管只是 stage 1），guest OS 看到与非虚拟化场景相同的 Comnand、Event、可选的 PRI队列、和基于内存的数据结构。

#### 缺页异常Page Fault

[一切皆是映射：浅谈操作系统内核的缺页异常（Page Fault）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3Fsrc%3D11%26timestamp%3D1739250694%26ver%3D5805%26signature%3DDcmJEsscycYQq4SPKI1Easyb3hZP-8jfQkL8qW667V2a-KJRFb9Fv67-%2AI-CHIPBR%2AfSiP%2ADQ30YhOCbFQvvP%2A3D31ECODPZhjMsWCkxlyI6oVxQvCAAfFj6l4I%2Avmnv%26new%3D1)

虚拟地址在TLB和Page Table都没有找到对应的物理页帧或者权限不对，这就是缺页异常Page Fault，它是一个由硬件中断触发的可以由软件逻辑纠正的错误。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1798f63fc6a8.jpg)

缺页中断会交给PageFaultHandler处理，其根据缺页中断的不同类型会进行不同的处理：

- Hard Page Fault 也被称为Major Page Fault，翻译为硬缺页错误/主要缺页错误，这时物理内存中没有对应的页帧，需要CPU打开磁盘设备读取到物理内存中，再让MMU建立VA和PA的映射。  
- Soft Page Fault 也被称为Minor Page Fault，翻译为软缺页错误/次要缺页错误，这时物理内存中是存在对应页帧的，只不过可能是其他进程调入的，发出缺页异常的进程不知道而已，此时MMU只需要建立映射即可，无需从磁盘读取写入内存，一般出现在多进程共享内存区域。  
- Invalid Page Fault 翻译为无效缺页错误，比如进程访问的内存地址越界访问，又比如对空指针解引用内核就会报segment fault错误中断进程直接挂掉。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_263853bfebe3.jpg)

触发Page Fault的原因可能有很多，归根到底也只有几种大类： 1. 如使用共享内存区域，没有存储VA->PA的映射但是存在物理页帧的软缺页错误，在Page Table/TLB中建立映射关系即可。 2. 访问的地址在物理内存中确实不存在，需要从磁盘/swap分区读入才能使用，这种性能影响会比较大，因为磁盘太慢了，尽量使用高性能的SSD来降低延时。 3. 访问的地址内存非法，缺页错误会升级触发SIGSEGV信号结束进程，这种属于可以导致进程挂掉的一种缺页错误。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_05d38c55de95.jpg)


### AMD IOMMU

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_83e530977813.jpg)

#### 功能

- 虚拟到物理地址转换功能
- AMD64长模式页表兼容性
- 支持PCI ATS
- 支持PCI-SIG PRI和PASID TLP prefix ECN
- 支持虚拟APIC（如AVIC）
- 增强的性能和错误记录功能
- Guest 页面表用户/Supervisor访问权限检查
- Guest 页面表全局Supervisor级访问保护
- Guest 页面表不可执行页面保护
- 设备表的细分
- PPR和事件日志双缓冲区，带可选的autoswap
- 具有始终开启功能的PPR自动响应
- PPR日志早期溢出警告
- 设备特定功能报告寄存器
- MMIO访问MSI设置和映射配置空间字段
- 内存访问路由和控制（MARC）
- 自动阻止停止标记消息处理
- 访客I/O保护
- x2APIC
- 硬件加速虚拟化IOMMU（vIOMMU）
- 安全ATS
- 安全嵌套分页

#### 数据结构

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1c073066e4f0.jpg)

#### page size有效字段定义

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_57b326b23ece.jpg)

支持的physical-page sizes：4 Kbytes, 2 Mbytes, 4 Mbytes, and 1 Gbytes

In long mode 4-Kbyte, 2-MByte, and 1-GByte sizes are available. 

In legacy mode 4-Kbyte, 2-MByte, and 4-MByte sizes are available

Virtual addresses are 32 bits long, and physical addresses up to the supported physical-address size can

be used. 

The AMD64 architecture enhances the legacy translation support by allowing virtual

addresses of up to 64 bits long to be translated into physical addresses of up to 52 bits long.

#### 5级page table walk

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a1fdf0ff6722.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_382ea4f74846.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b3417e8fccf7.jpg)

#### 5级PTE/PDE定义

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_90e66b51a137.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b7cc08e92f0e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_92d7c0ef6729.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e245f30f0004.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ebea8ca5e11.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_27b5544255b3.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ed0252a82e78.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_adc42b0bf55b.jpg)

#### command queue

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3abe9b4ac700.jpg)

command是以链表的形式按照FIFO的形式保存和获取

主要有以下命令

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_28f8528f5991.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7cd94e37fc25.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_34218e645dbd.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5f7169dc525c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b17cd9f80d3f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_106c30753950.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1bdbdd4bdd21.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_888deeabf1b4.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_417ae924abcf.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_be3d2131d808.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6a5e7e053784.jpg)

RESET_VMMIO Command
#### Event Log 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a79c7d53728.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4bcb46b67bd1.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9910905fd179.jpg)

#### Peripheral Page Request Log

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_56da55a73c70.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bab1ab287cfe.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8f50dd465745.jpg)

#### Guest vAPIC Log 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6105b18d0a60.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_90c909c66d32.jpg)

#### vIOMMU Private Address Space

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9b3cc3a96857.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2d9066b11113.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c61e7aa8c3f1.jpg)

#### I/O Virtualization Memory Definition (IVMD)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_560a5678026d.jpg)

### Intel VT-d

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8910de13ad48.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4f6370c5f5a6.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_291fac257a34.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7869fd00ec97.jpg)

#### Legacy Mode Address Translation

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1265911de31d.jpg)

#### paging

支持pagesize：4KB，4MB，1GB，

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_be0e8cfccd76.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_89a9d620296d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b7610db36834.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a2e152dbdbe8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bf5dc5ea382c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3c850ed23ef.jpg)

#### 页表描述符（page table descriptor）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_763dd06425ea.jpg)

包括

存储当前进程的page directory首地址的CR3寄存器

存储page table首地址的PDE（page directory entry）

存储page首地址的PTE（page table entry）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fb4d207292d1.jpg)

P**（Present） - 为1表明该page存在于当前物理内存中，为0则PTE的其他部分都失去意义了，直接触发page fault。P位为0的PTE也不会有对应的TLB entry，因为早在P位由1变为0的时候，对应的TLB就已经被flush掉了。

<strong>G</strong> （Global）- 这个标志位主要是用于context switch的时候不用flush掉kernel对应的TLB，所以这个标志位在TLB entry中也是存在的。

<strong>A</strong>（Access） - 当这个page被访问（读/写）过后，硬件将该位置1，TLB只会缓存access的值为1的page对应的映射关系。软件可将该位置0，然后对应的TLB将会被flush掉。这样，软件可以统计出每个page被访问的次数，作为内存不足时，判断该page是否应该被回收的参考。

<strong>D</strong> （Dirty）- 这个标志位只对file backed的page有意义，对anonymous的page是没有意义的。当page被写入后，硬件将该位置1，表明该page的内容比外部disk/flash对应部分要新，当系统内存不足，要将该page回收的时候，需首先将其内容flush到外部存储。之后软件将该标志位清0。

R/W和U/S属于权限控制类：

<strong>R/W</strong>（Read/Write） - 置为1表示该page是writable的，置为0则是readonly，对只读的page进行写操作会触发page fault。

<strong>U/S</strong>（User/Supervisor） - 置为0表示只有supervisor（比如操作系统中的kernel）才可访问该page，置为1表示user也可以访问。

PCD和PWT和cache属性相关：

<strong>PCD</strong>（Page Cache Disabled）- 置为1表示disable，即该page中的内容是不可以被cache的。如果置为0（enable），还要看CR0寄存器中的CD位这个总控开关是否也是0。

<strong>PWT</strong> （Page Write Through）- 置为1表示该page对应的cache部分采用write through的方式，否则采用write back。


#### paging structure caches

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_be0e8cfccd76.jpg)

在多级页表系统中，TLB只缓存最后一级PTE（（对于large pages的TLB则最后一级是PDE或者PDPTE），若是TLB miss，则需要进行多级页表的查找，这是一个串行的，链式的过程。在通过n次内存访问（n等于页表级数）查找到第一个page的物理页面号，为了加速，像TLB缓存PTE一样，中间的PMD, PUD, PGD也可以被缓存。

以intel的x86-64架构为例，它支持PDE cache（使用64位虚拟地址的bits 47:21作为index/tag，对应linux里的PMD entry）, PDPTE cache（使用64位虚拟地址的bits 47:30作为index/tag，对应linux里的PUD entry）, PML4 cache（使用64位虚拟地址的bits 47:39作为index/tag，对应linux里的PGD entry）。

除了最后一级页表PTE的entry是直接指向page外，其他级的页表的entry都是指向下一级页表首地址的，因此这些级的页表被称为paging structure**，所以PDE cache，PDPTE cache和PML4 cache被统称为paging structure caches。在ARM中，这些caches被称为table walk caches（名字来自MMU里的table walk unit）。

如果发生TLB miss, 相当于PTE cache中没找到，那就

- 从PDE cache中找，如果找到了则获得对应PT页表的首地址，可继续在PT中索引到PTE，需要1次内存访问；
- 没找到再从PDPTE cache中找，如果找到了则获得对应PD页表的首地址，然后在PD->PT中索引，需要2次内存访问；
- 还没找到再从PML4 cache中找，如果找到了则获得对应PDPT页表的首地址，然后在PDPT->PD->PT中索引，需要3次内存访问；
- PML4 cache中也没有的话，那只能去DRAM里按照PML4->PDPT->PD->PT找了，需要4次内存访问。
从TLB到DRAM，越往后，所需要的内存访问次数越多。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_62c5dbbbe079.jpg)

同TLB一样，paging structure caches需要使用专用的cache来实现，对这些cache的支持与否取决于不同处理器的具体设计。以Intel的Haswell为例（i7-4770）为例，其PDE cache含有32个entries。

TLB中可能含有PCID/ASID来分别不同的进程，同样的，paging structure caches也是使用虚拟地址的位域子集作为index/tag的，如果在进程切换的时候不希望整个被flush掉，也需要含有PCID/ASID。

页表既然是放在普通内存中的，自然也可以被缓存到普通cache中，MMU在不得不去查找页表之前，也会先去普通cache里看看，实在没有再去访问内存。以x86处理器为例，CR3寄存器和每级页表的entry都含有一个叫PCD（page-level cache disable）的位，可以控制该entry对应的下级页表（对于PTE对应的就是page）是否需要被缓存到普通cache中。

这种cache（intel的手册中称为page-level cache）缓存的是一个页表，而paging structure caches缓存的是页表中的某一项，后者效率更高。

所以访问的顺序应该是TLB -> paging structure caches -> 普通cache中的页表 -> 内存中的页表。

#### Device-TLB Operation

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4809278baa17.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_41cf7bdf279d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6e64281fa199.jpg)

### 参考资料

- [SoC芯片设计系列---ARM CPU子系统组件介绍](https://link.zhihu.com/?target=http%3A//www.360doc.com/content/24/0621/22/78456304_1126814604.shtml)
- 《Arm® CoreLink™ MMU-700 System Memory Management Unit Technical Reference Manual》
- 《Arm® System Memory Management Unit Architecture Specification SMMU architecture version 3》
- 《AMD64 Technology AMD64 Architecture Programmer’s Manual Volume 2: System Programming》
- 《AMD I/O Virtualization Technology(IOMMU) Specification》
- [对方正在输出：ARM架构学习-SMMU(1)](https://zhuanlan.zhihu.com/p/16243460276)
- [一切皆是映射：浅谈操作系统内核的缺页异常（Page Fault）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3Fsrc%3D11%26timestamp%3D1739250694%26ver%3D5805%26signature%3DDcmJEsscycYQq4SPKI1Easyb3hZP-8jfQkL8qW667V2a-KJRFb9Fv67-%2AI-CHIPBR%2AfSiP%2ADQ30YhOCbFQvvP%2A3D31ECODPZhjMsWCkxlyI6oVxQvCAAfFj6l4I%2Avmnv%26new%3D1)
- [DonaldDuck：AMD IOMMU要点](https://zhuanlan.zhihu.com/p/660148185)
- 《Intel® Virtualization Technology for Directed I/O Architecture Specification》
- 《Intel® 64 and IA-32 Architectures Software Developer’s Manual》
- [页表描述符（page table descriptor）](https://zhuanlan.zhihu.com/p/67053210)
- [虚拟地址转换[五] - paging structure caches](https://zhuanlan.zhihu.com/p/65774094)
- [计算机体系结构 -- 虚拟内存](https://zhuanlan.zhihu.com/p/526684107)（总结了linux虚拟内存，缺页异常处理和内存交换）