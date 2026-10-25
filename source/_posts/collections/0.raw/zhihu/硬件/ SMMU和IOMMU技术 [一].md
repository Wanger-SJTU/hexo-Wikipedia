---
title: (1 封私信) SMMU和IOMMU技术 [一]
date: "2023-03-26 00:00:00"
updated: "2023-03-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/硬件/SMMU和IOMMU技术-[一]/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/75978422
---


[前面的文章](https://zhuanlan.zhihu.com/p/69627614)讲到了为设备访问 memory 引入的 IOMMU/SMMU技术，同时留了一个问题：IOMMU/SMMU 是否可以同时支持 GVA->GPA 和 GPA->HPA 的转换？答案是Yes。

在虚拟化的环境中，借助 IOMMU 的 GPA->HPA 转换，DMA 控制器可以直接以 guest VM 提供的 GPA 作为 source 或者 destination，减少了 VMM 的参与。

在非虚拟化的环境中，借助 IOMMU 的 HVA->HPA 转换，DMA 控制器也可以直接以 userspace buffer 的 HVA 作为 source/destination，而不需要 OS kernel 将 user process 的 VA 转换后的 PA 填入 DMA 控制器。

两者其实是统一的，不管 HVA 还是 GPA，都不是 real phsical address，有了 IOMMU/SMMU 之后，DMA 控制器就可以使用虚拟地址，也不再要求对应的内存是物理连续的了。

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_5e632c4afd0f.jpg)

### **ARM的SMMU**

那IOMMU/SMMU具体应该如何使用呢？本文将主要以ARM的SMMU为例，讲解其转换地址的过程。

在Linux的实现中，一个进程有一个对应的页表，而SMMU是为设备服务的，几个设备可能同属于一个guest VM，因此多个设备可能会共用一个GPA->HPA的转换页表。同一个guest VM的设备可能属于或者不属于某一个特定的进程，因此也可能共用或者不共用GVA->GPA的转换页表。

在SMMU中，一个发起DMA传输（transaction）的设备的信息由一个Stream Table Entry(**STE**)来描述。所有的STEs共同构成了**Stream Table**，可由**StreamID**作为Stream Table数组的索引，查找得到对应的STE，因此StreamID也就成了设备唯一性的标识。Stream table可以是1-level的：

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_d64392eed079.jpg)

也可以是2-level的，比如一个10位的StreamID使用[9:8]的2个bits作为第一级Stream table的索引，[7:0]的8个bits作为第二级Stream table的索引，这和使用虚拟地址作为索引查找页表是一样的（参考[这篇文章](https://zhuanlan.zhihu.com/p/65348145)）。

不同的是，多级页表中每级页表的大小是相同的，而第二级Stream table的大小可以是不同的，比如下图中A就是占满了的，有255个entries，而B和C分别只有4个entries和1个entry。用户可以根据实际的需要灵活配置，以节约内存空间。

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_fe332678936a.jpg)

大家应该都知道，ARM公司主要是依靠出售core的license来赚钱的，它给予了具体的芯片厂商一些自由发挥的空间，比如SMMUv3只规定了StreamID的大小是0-32个bits，但具体采用多少个bits，以及StreamID是怎样构成的，则都属于implementation defined。

但SMMUv3同时也做出了限制：如果StreamID的数目超过了64（也就是超过了6个bits），那么必须使用2-level的Stream table。

如果一个STE对应的设备要进行的是GPA->HPA的stage 2转换（关于stage请参考[这篇文章](https://zhuanlan.zhihu.com/p/69828213)的注[1]），那么该STE包含的S2TTB(Stage 2 Translate Table Base)将直接指向设备所属的guest VM对应的stage 2页表（下图中的D）。设备所属的VM由STE中的VMID标识，属于同一个VM的设备对应的STEs将指向同一个stage 2页表。

在同一个VM内，一个设备可能被VM内的多个进程共享，而这些进程会有不同的页表，因此一个设备在和不同进程交互时，也会使用不同的页表。为了区分，需要一个设备对应进程的描述信息，这个描述信息被称为**CD**(Context Descriptor)。

如果该设备需要进行的是GVA->GPA的stage 1转换（比如前面提到的用户空间的DMA传输），那么描述该设备的STE将指向当前进程对应的这个CD（下图中的B）。和同一个进程交互的不同设备将共用这个进程的stage 1页表，因此这些设备的STEs将指向同一个CD。

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_ca8883cb8462.jpg)

每个CD包含了一个标识进程的ASID，由TTB0和TTB1指向进程对应的stage 1页表（上图中的C）。熟悉ARM架构的同学应该知道，TTBR0和TTBR1是ARM中分别用来存储进程页表和内核页表的基地址的寄存器，由于这里不再是Register，而是内存中的Descriptor，但用途类似，所以就叫TTB0和TTB1。

同一个设备对应的所有CDs构成了一个CD table。CD table使用的查找索引被称为**SubstreamID**。SubstreamID最多占20个bits，这个规定是有出处的。熟悉PCIe的同学可能知道，PCIe中有个PASID，而PASID最大就是20个bits。SubstreamID基本就是和PASID对等的概念，虽然SMMU并不限于只支持PCIe的设备，但这里SubstreamID还是和PASID保持了统一的步调。

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_dd10730163c5.jpg)

同Stream table一样，CD table可以是1-level的（下图中的D），也可以是2-level的（下图中的E和F）。

![](/images/collections/0.raw/zhihu/%25E7%25A1%25AC%25E4%25BB%25B6/asset/img_d3276fc08664.jpg)

如果是熟悉x86的segmentation机制或者是看过[这个系列的文章](https://zhuanlan.zhihu.com/p/67714693)的同学，会不会发现SMMU中的这个Stream table/CD table，其实和x86中的GDT/LDT是很相似的。都是通过索引查找得到对应的entry，每一个entry都是记录的一些描述信息，而且后面还都是跟的page tables。

限于篇幅控制，[下文](https://zhuanlan.zhihu.com/p/76643300)继续。

**

参考：**

*ARM System Memory Management Unit Architecture Specification, version 3.1*

*原创文章，转载请注明出处。*
