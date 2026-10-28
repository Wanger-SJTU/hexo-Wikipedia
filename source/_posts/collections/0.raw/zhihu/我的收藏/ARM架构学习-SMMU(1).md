---
title: "ARM架构学习-SMMU(1)"
date: "2025-01-03 00:00:00"
updated: "2025-01-03 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/ARM架构学习-SMMU(1)/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/16243460276"
---


SMMU是ARM架构中完成内存虚拟化功能的一个重要组件，整体包含功能较多。本文从PCIe应用的角度出发，重点梳理了SMMU中和PCIe命令处理相关的基本功能和流程。此外，本文只是基于SMMU的官方Spec对相关功能和流程做一个基本介绍，不会深入到细节和具体数据结构，感兴趣的读者请自行查阅ARM的Spec。

SMMU即system memory management unit，在x86体系结构中对应的是IOMMU。SMMU在ARM体系中用于翻译来自I/O Devices的DMA请求的地址，并且SMMU的作用是单向的，只翻译来自I/O Devices的请求。系统发给I/O Devices的请求的地址翻译，由其它方式完成，比如Processing Element (PE，可以认为是processor或者core) MMUs。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e156c069a628.jpg)

图 1 System MMU in DMA TrafficSMMU中，不同的streams和不同的devices绑定，可以基于devices/streams做不同的translation（即可以认为每个stream有独立的translation配置）。

一个系统中可以有多个独立的SMMU，每个SMMU可以只服务一个或多个devices。

SMMU支持两级（two-stages）翻译。每一级都可以被独立地enabled或disabled。典型场景下，stage 1是将VA转换为IPA（Intermediate Physical Address），stage 2是将IPA转换为PA。

### Stage 2转换

首先澄清一下，x86控制器存在I/O地址空间和内存地址空间的划分，CPU访问I/O和内存空间的指令也不同。ARM体系中则只有内存（mem）空间，I/O的访问机制也被称为memory-mapped I/O（MMIO）。

ARM的地址空间可以分为三类：

1） OS/VM控制的虚拟地址空间；

2） OS/VM看到的物理地址空间；

3） 真正的物理地址空间。

三者的转换关系如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7fb71d101df4.jpg)

图 2 ARM中不同的地址空间及关系VMM/Hypervisor控制了哪部分物理空间可以被一个VM访问，并映射到VM的OS中的哪一块地址（即OS看到的物理地址空间，ARM中称为Intermediate Physical Address）。所以stage 2 translation可以保证VM只看分配给它的物理资源。

OS/VM控制stage 1 translation，基于操作系统的虚拟内存管理技术，将自己看到的物理空间（IPA），映射到虚拟地址空间。

在内存虚拟化概念中，客户机/VM看到的物理地址（IPA），也被称为GPA (Guest Physical Address)，对应的虚拟地址则叫GVA (Guest Virtual Address)。

### Data Structures and Translation Procedure

SMMU的主要数据结构是stream table，stream table中的entries包含了stage 2 translation table的基址，对应stream ID的translation configurations和stage 1 configuration structures（Context Descriptor）的基址 。Context Descriptor（CD）中包含了stage 1 translation table的基址。

通常翻译过程的第一步，便是基于stream ID从stream table找到对应的Stream Table Entry（STE），然后基于对应stream ID的configurations进行下一步的地址翻译。

#### Stream Table Lookup

第一种是Linear Stream table，STEs和stream ID一一线性对应，在物理空间上的地址也是连续的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a90cee1ed0b8.jpg)

图 3 Linear Stream table第二种是2-level Stream table，第一级stream table的entries，包含的是第二级stream table的pointer或者说descriptors。所以一级 stream table可以包含多个二级stream table，同时每一个二级stream table都是一个linear stream table。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_89e75947537b.jpg)

图 4 2-level Stream table2-level Stream table的主要好处是stream table的保存在物理空间上可以是不连续的。

在超过64个stream IDs可以考虑使用2-level Stream table，否则连续的a linear Stream table存放会跨越4KB边界。

#### Stream IDs to Context Descriptors

每一个STE都保存了stream的以下configurations：

1） device的traffic是否enabled，即device是否可以发送请求；

2） 是否需要进行stage 1 translation；

3） 是否需要进行stage 2 translation，以及stage 2 translation table的基址；

4） Stage 1 context descriptor的基址/pointer（S1ContextPtr）。

Context descriptor中保存了stage 1 translation table的基址，stream的configuration以及ASID。如果使能了substream ID，则每个substream ID使用的context descriptor也会不同。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fdabc88e1336.jpg)

图 5 Configuration structure example![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_47fbea8430fa.jpg)

图 6 Multiple Context Descriptors for Substreams注：VMID即virtual machine ID，stage 2的翻译是基于virtual machine（VM），即一个VM对应一个stage 2 translation table。ASID为Address Space ID，与OS/VM的application对应（不同于PCIe PASID），每个VM的ASID namespace是独立的。

CD中的TTB0表示用户（user）的stage 1 translation table基址，TTB1表示内核（kernel）的stage 1 translation table基址。

此外，由于STE和CD中的table基址都是软件/VM初始化的，而VM只能看到IPA，并不是真实的PA。所以如果使能了stage 2翻译，SMMU在获取到STE中的S1ContextPtr和CD中的stage 1 translation table后，要去memory中读取对应表项前也需要对相关地址进行stage 2的查表翻译，获取真实的PA后再去读取表项。

在实现上，为了加速，SMMU模块通常会把translation table，CD或STE等cache在内部。

#### Configuration and Translation lookup

SMMU的翻译过程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5629f80e917b.jpg)

图 7 Configuration and translation lookup sequence上图中，TLB用于cache translation table及相关的configurations。

Streamworld是地址翻译的regime（a mode of rule），等同于一个PE的Exception Level，与transaction的权限等级相关，具体如下表所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_df235679a97b.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_867abfad445f.jpg)

最终输出的地址是一个input address，StreamWorld（(Stream Security state and Exception level), ASID和VMID的函数。

#### Transaction attributes: incoming, two-stage translation and overrides

发送给SMMU的transactions有很多attributes ，包括access type，shareability，cache allocation hints，instruction/data，privileged/unprivileged，secure/non-secure等等。简单来说：

1） permission-related的属性，包括instruction/data，privileged/unprivileged，secure/non-secure和read/write属性是用来检查translation table的permissions，有些translation table只能给特定属性的transactions查表。SMMU支持在查找translation table前对transactions的permission-related属性基于device或者说StreamID进行覆盖；

2） 其它属性（memory type, Shareability, cache hints）主要作用于memory system而非SMMU，比如影响transaction的cache查找方式。同样的，SMMU支持在模块内部以device粒度对这些属性进行覆盖，然后再发送给memory system。

### Support for PCIe, PASID, PRI, and ATS

PCIe的Requester ID会放到Stream ID的低位，所以一个Requester ID和一个Stream Table Entry（STE）对应，可以简单理解成一个requester/function对应一个stream；

一个function内还可以按照PASID Prefix细分成多个部分，即SMMU内，同一个STE中还会按照PASID划分成多个caches。PASID只用于stage 1翻译；

PCIe场景，SMMU的substream ID即为PASID。所以，同一个stream ID下（来自同一个function），不同transaction可以有不同的substream ID。

对PCIe请求来说：

1） Stage 2翻译基于requester ID的，或者源function，源function和VM（virtual machine）绑定；

2） Stage 1翻译基于requester ID和PASID；

3） 如果SMMU的Stage 1翻译被bypass，但是请求源头依然提供了PASID或substream ID，会导致SMMU abort transaction的翻译并在内部记录错误；

4） PASID Prefix中的Execute和Privileged对应SMMU的INST（instruction）和PRIV（privileged） attributes。没有PASID的transaction默认为Data，unprivileged属性（影响见SMMU Architecture Spec 13.7）。

#### ATS Interface

SMMU实现了PCIe系统中Translation Agent的功能，可以接收ATS/PRI请求，并返回对应response；

*<strong>ATC Invalidation</strong>*

ATC invalidation的流程，可以由软件下发命令给SMMU，SMMU再将invalidation请求发给RC（RP），对应的ATC invalidation response也要（通过RC/RP）返回给SMMU。EP返回的ATC invalidation response可能为UR（比如PASID超出范围），此时SMMU也不会上报异常；

*<strong>Page Request Interface</strong>*

PRI相关流程如下：

1） SMMU返回ATS request的not-present result，EP发起PRI page request，发送到SMMU中的PRI queue中。软件从PRI queue中获取PRI page request；

2） 软件收到PRI page request后，完成物理地址分配，并返回PRI response command给SMMU

3） SMMU将response返回给RC/RP，最后再返回给EP。

SMMU如果在PRI queue满了的情况下，再收到page request，会直接返回successful PGR response并丢弃请求。

*<strong>ATS Translated Transactions</strong>*

经过ATC翻译的请求，RC需要将对应的translated的信息带给SMMU，SMMU可以基于这个信息bypass translation。但是如果直接将请求发送到总线上，可能存在安全问题，SMMU可以通过配置，对此类请求进行权限检查（也可以配置成不检查）；

SMMU也可以配置成在ATS responses中返回IPAs（即stage 1 translation的输出），此时，SMMU在收到translated的请求后，仍然可能需要对地址进行stage 2 translation。

SMMU在进行translation和权限检查时需要报错并将transaction aborted（内部不再继续处理，不会将请求送上总线）。

*<strong>Responses to ATS Requests</strong>*

当SMMU返回携带了PASID的ATS request对应的ATS completion时，需要将Translation Completion Data Entry中的Global bit置0；

SMMU可能因为配置或流程异常问题，返回UR或CA状态的ATS completion。如果是因为ATS请求本身没有找到对应的entry，SMMU仍然会返回success status的completion，不过completion data entry中R==W==0，表示data内容是invalid的。

#### SMMU interactions with the PCIe IDE TLP Prefix Fields

PCIe的IDE TLP Prefix中，有个t-bit域段，表示是否为trusted。TLP可能处于以下三种状态中的一种：

1） 没有IDE TLP Prefix；

2） 有IDE TLP Prefix且T=0，表示transaction是encrypted and protected，并且来自一个untrusted source；

3） 有IDE TLP Prefix且T=1，表示transaction是encrypted and protected，并且来自一个trusted source。

在ARM系统中，没有IDE Prefix，或者有IDE Prefix但T=0，表示transaction与non-secure状态（state）关联，此时：

1） non-secure的device transaction，发给SMMU时，SEC_SID =non-secure（streamID security level）；

2） SMMU在产生ATC invalidation请求和PRI response时，对应T bit也会是0。

有IDE Prefix且T=0，表示与Realm state关联，此类请求发给SMMU时，SEC_SID=Realm。

### SMMU扩展

#### Secure State（SMMU System Spec 3.10）

ARM支持给PA地址空间分配两种security states，secure state和non-secure state。

ARM还支持Realm Management Extension（FEAT_RME），引入了额外的两种security states，共分为：secure state，non-secure state，realm state和root state。

StreamID Security state (SEC_SID)决定了一个transaction的security state，0表示non-secure（如果接口上没有SEC_SID，则默认为0），1表示secure；

如果支持RME，SEC_SID扩展为2-bit，2’b00表示non-secure；2’b01表示secure；2’b10表示realm；2’b11表示reserved。

Security state和允许访问的PA space的state对应关系如下（YES表示允许访问）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_daf372e0c60e.jpg)

#### Device Permission Table（SMMU System Spec 3.24）

DPT是按照一定物理地址空间大小粒度对device（VM）的permission进行检查的table。

DPT给每个物理空间提供三种权限：

1） No access is permitted，即对应物理空间不允许访问；

2） Accessible with some specific VMIDs，即部分VM（基于VMID识别）可以访问；

3） Accessible regardless of VMID，即所有的VM都可以访问。

对于ATS被disabled或者配置为split-stage的stream ID，不需要进行DPT check（基于STE中的EATS域段）；

Non-secure和Realm的DPT可以独立配置。

DPT check（DPC）会基于Access Control（AC），W和VMID等进行检查：

1） 如果对应region（地址）是No access，则DPT check返回Device Access fault；

2） 如果对应region是W=0，且当前请求为write操作，则DPT check也返回Device Access fault；

3） DPT中的AC和VMID域段会和STE中的DPT_VMATCH和S2VMID域段结合进行检查。如下表所示，Yes表示STE中的S2VMID必须和DPT中的VMID matched，才可以access对应region（此时不matched，则返回Device Access fault）。No则表示不需要检查VMID是否matched：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7e9d80550c83.jpg)

对于Realm属性的STEs，DPT_VMATCH固定为2'b00。

#### Granule Protection Checks（SMMU System Spec 3.25）

The Realm Management Extension, FEAT_RME，定义了Granule Protection Checks（GPC）；

除了Granule Protection Table的内容本身，所有的物理地址访问都适用于GPC（基于翻译的物理地址/output address查找对应GPT entry）。如果GPC检查失败（GPC fault），SMMU会返回fault结果给源头。

如果SMMU使能了RME，ATS translation request的翻译输出（completion）也需要进行GPC。如果GPC检查不通过，SMMU会返回completer abort给请求源头。但是如果ATS request的completion为R==W==0，说明地址是invalid的，不需要进行GPC。此外，ATS translated transactions也需要进行GPC。

GPT可以cache到TLB中，用于加速检查。

*<strong>GPT Formats</strong>*

GPT查表分为两级，level 0中的entry分为GPT Block和GPT Table descriptors两种；level 1中的entry分为GPT Contiguous和GPT Granules descriptors两种。

level 0 GPT Table descriptor format：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_797a68bed6b3.jpg)

图 8 Level 0 GPT Table descriptor format用于保存next level的GPT Table地址，bit[3:0]=4'b0011表示此entry为GPT Table descriptor。

level 0 GPT Block descriptor format:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fd5e0d6addd4.jpg)

图 9 level 0 GPT Block descriptor formatBit[7:4]为GPI，其encoding如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_684445035121.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2778a6ed7d99.jpg)

bit[3:0]=4'b0001表示此entry为level 0 GPT Block descriptor。

level 1 GPT Granules descriptor：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4502097b0fe7.jpg)

图 10 Level 1 GPT Granules descriptor format一个GPT Granules descriptor包含了16个physical granules（即包含了连续的16个物理地址范围的GPI），基于每个GPI对应的size配置（最小为4KB），其与物理地址关联如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b639cb79f9a4.jpg)

level 1 GPT Contiguous descriptor format:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_71c922dafd3e.jpg)

图 11 Level 1 GPT Contiguous descriptor formatbit[3:0]=4'b0001表示此entry为Contiguous descriptor，bit[7:4]表示地址对应的GPI。Bit[9:8]为Contig域段，encoding如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ec2af336e827.jpg)

表示对应地址空间大小的GPI都是相同的。

Contiguous regions都必须是按照size大小对齐。比如，地址0x8004000的对应entry的Contig为2MB，则此region包含了0x80000000 to 0x801FFFFF的地址范围，GPI都相同。