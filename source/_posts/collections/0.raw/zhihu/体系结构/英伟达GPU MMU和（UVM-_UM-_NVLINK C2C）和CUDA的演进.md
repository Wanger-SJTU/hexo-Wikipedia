---
title: 英伟达GPU MMU和（UVM->UM->NVLINK C2C）和CUDA的演进
date: "2025-02-13 00:00:00"
updated: "2025-02-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/英伟达GPU-MMU和(UVM-_UM-_NVLINK-C2C)和CUDA的演进/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/23506400985
---


英伟达 GPU 的内存管理单元（MMU）主要承担功能：

1. 虚拟地址到物理地址转换 
   - 将 GPU 线程或 DMA 请求的虚拟地址（VA）映射到物理显存地址（PA），支持复杂的内存访问模式。
2. 统一内存管理（Unified Memory）  
   - 实现 CPU 和 GPU 共享同一虚拟地址空间，允许透明数据迁移（无需显式拷贝）。
3. 内存保护与隔离
   - 通过页表权限位（读/写/执行）和安全域隔离，防止非法访问或越界操作。
4. 虚拟化支持
   - 在云环境中支持多虚拟机（VM）共享 GPU 资源，通过多级页表（如 Stage1/Stage2）实现物理显存隔离。
5. 性能优化
   - 通过多级 TLB、预取机制和大页支持，降低地址转换延迟，提升显存带宽利用率。
6. 安全扩展
   - 支持显存加密（如 NVIDIA A100/H100 的 MIG 安全分区），保护敏感数据。

![](https://pic2.zhimg.com/v2-01eeacbd51cb3c690ab45389303240a9_r.jpg)
![](https://pic3.zhimg.com/v2-5f39b43a640b7ccbfa0d03543caef2dc_r.jpg)[CUDA：英伟达最深的护城河，加速计算行业发展的时代引擎！ - 与非网](https://link.zhihu.com/?target=https%3A//www.eefocus.com/article/1698017.html)

从体系结构的组成来说，CUDA包含了三个部分：开发库、运行期环境和驱动。

![](https://pic4.zhimg.com/v2-a8381e46dbda0248e169aabd4b5edb8b_r.jpg)[“DeepSeek甚至绕过了CUDA”，论文细节再引热议，工程师灵魂提问：英伟达护城河还在吗？](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/kDNZw6C-HIngwp57pycMXw)

![](https://pic4.zhimg.com/v2-8af90e01f7b4a2462cff109fb029ef2b_r.jpg)[reed：NVidia GPU指令集架构-前言](https://zhuanlan.zhihu.com/p/686198447)

![](https://pic2.zhimg.com/v2-d722d07f7b0bf67f475589225aef01cf_r.jpg)
![](https://pic3.zhimg.com/v2-f833987c07698e9f6f5807c13f98bb4a_r.jpg)
![](https://pic2.zhimg.com/v2-63aa8475292f1cf83a80eb7da8334d29_r.jpg)[CUDA 教程（二）CUDA 模型概述](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/EsKndXN_1q1JTdzAcGV18w)

![](https://pica.zhimg.com/v2-3729241363509788d8673e9e85cb2b2e_r.jpg)
![](https://pic1.zhimg.com/v2-1818e2a2ddb481f0de945cb5bf5f01c8_r.jpg)
![](https://pic3.zhimg.com/v2-2997b0f5a745368219f8b4e49795cd2c_r.jpg)
![](https://pic2.zhimg.com/v2-c6d881024648a245da7e143e7de18f3d_r.jpg)
![](https://picx.zhimg.com/v2-6adc170dcea12d2e219ff1e52e01bb5d_r.jpg)
![](https://pic4.zhimg.com/v2-1f62d4164004d4191a3ea39432aecb65_r.jpg)
![](https://pic2.zhimg.com/v2-ca2b019609b7e6cfd6b264df7b046711_r.jpg)PTX在接近汇编语言的层级运行，允许进行细粒度的优化，如寄存器分配和Thread/Warp级别的调整。

![](https://picx.zhimg.com/v2-91bb442aac13fc260e922df069a0fd01_r.jpg)
![](https://pic1.zhimg.com/v2-122395d2db4159cf69e20582af1812b8_r.jpg)
![](https://pic2.zhimg.com/v2-98f214b4eeb99bff4fabc928446419a1_r.jpg)
![](https://pic2.zhimg.com/v2-b3be7a105b48547ddb0e437cee772799_r.jpg)NVIDIA DGX H800 连接了 8 个 SXM5 H800，通过 4 个 NVLink 交换芯片，每个 GPU的带宽为 400 GB/s（**Nvidia H800，这是被US制裁之后的产品，把Nvlink的带宽从900GBps裁剪到400GBps**），总双向带宽超过 3.2 TB/s。每个 H800 SXM GPU 也通过 PCIe 连接到 CPU，因此 8 个 GPU 中的任何一个计算的数据都可以转发回 CPU。这也是为什么DeepSeek放弃TP选择了MoE。

并且因为H800裁剪了带宽，但没裁剪TensorCore，所以在做Attention计算的时候，可以用闲置的TensorCore Matrix算力去置换带宽，把算力和带宽都用满。在**DeepSeek-V3**论文中，使用英伟达的H800 GPU训练DeepSeek-V3时，他们针对自己的需求把132个流式多处理器（SMs）中的**20个修改成负责服务器间的通信，而不是计算任务**。变相绕过了硬件对通信速度的限制。

![](https://picx.zhimg.com/v2-c6c2d49de7826a69d1a148b9e42797b7_r.jpg)[cuda的发展历史和作用_cuda历史-CSDN博客](https://link.zhihu.com/?target=https%3A//blog.csdn.net/qq_52964132/article/details/141182090)

[cuda 护城河历史_cuda推出时间-CSDN博客](https://link.zhihu.com/?target=https%3A//blog.csdn.net/hxsln11/article/details/145000651)

CUDA（Compute Unified Device Architecture）是 NVIDIA 公司开发的一种并行计算平台和编程模型，它极大地推动了并行计算领域的发展。以下是 CUDA 的发展历程和其作为 NVIDIA 护城河的历史：

初期发展

2006年：NVIDIA 推出了 CUDA，这是 GPU 并行计算的一个重要里程碑。CUDA 允许开发者利用 GPU 的强大并行处理能力来加速各种计算密集型任务。

2007年：CUDA 1.0 发布，支持 C 语言编程，为开发者提供了一个新的计算平台。

功能扩展与优化

2008年：CUDA 2.0 引入了对 C++ 的部分支持，并增加了更多的库和工具。

2010年：CUDA 3.0 引入了 Fermi 架构的 GPU，提供了更好的双精度性能和更多的内存带宽。

2012年：CUDA 4.0 引入了 Kepler 架构的 GPU，提供了更高的能效和更好的并行处理能力。

2014年：CUDA 5.0 引入了 Maxwell 架构的 GPU，进一步提升了能效和性能。

深度学习与高性能计算

2016年：CUDA 8.0 引入了 Pascal 架构的 GPU，支持更多的并行计算优化。

2017年：CUDA 9.0 引入了 Volta 架构的 GPU，提供了更好的深度学习性能。

2020年：CUDA 11.0 引入了 Ampere 架构的 GPU，提供了更好的 AI 和高性能计算（HPC）性能。

现代版本与未来展望

2022年：CUDA 12.0 发布，支持 NVIDIA Hopper 架构和 Grace CPU，进一步提升了 HPC 和深度学习任务的性能。

2025年2月24日：CUDA  12.8 发布，支持 NVIDIA Blackwell 架构。Blackwell 由 208 亿个晶体管构建而成，是 NVIDIA Hopper GPU 中晶体管数量的 2.5 倍以上，是迄今为止最大的 GPU。

原文链接：[【AI系统】GPU 架构回顾（从2010年-2017年）](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/ZOMI/articles/18556535)

![](https://pic4.zhimg.com/v2-77279262c5a8a8dabb35a87a7d81284f_r.jpg)
![](https://pic2.zhimg.com/v2-3ea74cb0fe2735ddfcb1776bbf63d5d9_r.jpg)从2017年Volta架构的第一代tensor core深度学习DSA组件，到2022年Hopper架构中再次加入第一代Transformer Engine，Transformer Engine是 PyTorch 的一个拓展，为了利用 FP8 的特性，针对 Transformer 里面的 Kernel 进行了重写，包含了一系列 LayerNorm, GeLU, ScaledSoftmax 等。

[Yongfeng：详解 NVIDIA H100 TransformerEngine[转]](https://zhuanlan.zhihu.com/p/6277867371)

![](https://pic3.zhimg.com/v2-56f770ab72105507198508d13b0b82da_r.jpg)
![](https://pic2.zhimg.com/v2-6e4f65564d43e8fc5d0c00cbd7c4eb89_r.jpg)https://sci-hub.se/10.1145/3307650.3322224
![](https://pic2.zhimg.com/v2-c857ab33ece705ce3d58253da30c104b_r.jpg)

NV在内存管理方面的演进：

（1）最开始是分离内存管理，又可以分为两种，即锁页内存和零拷贝内存。在最原始的方式下，从主机内存拷贝数据到GPU，首先操作系统会分配一块用于数据中转的临时锁页内存，然后将用户缓冲区中的数据拷贝到锁页内存中，再通过PCIe DMA拷贝到GPU显存中。

（2）在CUDA4.0 引入了Unified virtual address space，全局使用统一地址空间，即半分分离内存管理。实际上也是语法糖，将原有的四个方向的拷贝函数合成了一个，用户调用统一的拷贝函数，由Cuda Runtime来判定数据源和目标所在的物理地址。

![](https://pic2.zhimg.com/v2-d042df302795b3069ec0240793bd8cc1_r.jpg)
![](https://pic1.zhimg.com/v2-857c329501e6059fc30b9e1482462592_r.jpg)在UVA之前，你需要管理哪些指针指向主机内存和哪些指针指向设备内存。有了 UVA，由指针指向的内存空间对应用程序代码来说是透明的。通过UVA，由cudaHostAlloc分配的固定主机内存具有相同的主机和设备指针。因此， 可以将返回的指针直接传递给核函数。

![](https://pica.zhimg.com/v2-ed3b050c2f4594ec1bb7cd787682e888_r.jpg)https://tallendev.github.io/assets/papers/sc21.pdf
![](https://pic2.zhimg.com/v2-f0f9ae2c7807d7fb37814795662b8e37_r.jpg)（3）CUDA6.0 引入了unified memory，这时可以通过软件维护的内存coherence。Unified Memory在Unified Virtual Address的基础上更进一步，将系统内的所有内存资源都整合到相同的虚拟地址空间中。不管是CPU还是GPU代码，不用再区分其指针指向的空间，这给用户编程提供了极大的便利性。

![](https://pic2.zhimg.com/v2-1a336321591b7056f994c97dc0a3cefb_r.jpg)[cuda unified memory简介 和 cuda深拷贝问题](https://link.zhihu.com/?target=https%3A//blog.csdn.net/zdlnlhmj/article/details/104821723%3Fspm%3D1001.2101.3001.6650.7%26utm_medium%3Ddistribute.pc_relevant.none-task-blog-2%257Edefault%257EVECTOR_COMMERCIAL%257ERRF-7-104821723-blog-84817110.235%255Ev43%255Epc_blog_bottom_relevance_base8%26depth_1-utm_source%3Ddistribute.pc_relevant.none-task-blog-2%257Edefault%257EVECTOR_COMMERCIAL%257ERRF-7-104821723-blog-84817110.235%255Ev43%255Epc_blog_bottom_relevance_base8%26utm_relevant_index%3D10)

统一内存创建了一个受管内存池，该池在CPU和GPU之间共享，弥合了CPU与GPU的鸿沟。使得CPU端和GPU端都能通过同一个指针访问数据，从而避免了程序员编写代码时显示的执行GPU和CPU端的内存拷贝命令

![](https://pic1.zhimg.com/v2-b7ced3f4855973903ca221d0ad774afc_r.jpg)如果不用Unified Memory，我们如果需要在GPU上处理数据，需要显示的调用cudaMemcpy函数到GPU端，需要在CPU端处理的时候还需要在cudaMemcpy回来,会带来很大的麻烦。而unified memory则可以解决这个问题（拷贝依然会执行，但是是系统帮程序员执行，不需要显示调用cudamemcpy）

使用unified memry 需要使用 cudaMallocManaged 函数来进行分配。

这样带来的好处主要是可以减少代码量，使得程序员不用费尽心思去进行CPU和GPU端数据的拷贝，尤其是对于一些嵌套结构体，链表之类的拷贝起来比较麻烦的问题。

CUDA的统一内存（Unified Memory）允许CPU和GPU共享数据，通过以页面大小为单位进行数据传输。当分配的内存小于页面大小时，可能导致同一页面在不同GPU间频繁迁移，影响性能。为避免此问题，应尽量避免在多GPU环境下分配小块内存。

[CUDA统一内存：简化编程与内存管理的革命,-CSDN博客](https://link.zhihu.com/?target=https%3A//blog.csdn.net/m0_47324800/article/details/136628984%3Fspm%3D1001.2101.3001.6661.1%26utm_medium%3Ddistribute.pc_relevant_t0.none-task-blog-2%257Edefault%257EBlogCommendFromBaidu%257EPaidSort-1-136628984-blog-104821723.235%255Ev43%255Epc_blog_bottom_relevance_base8%26depth_1-utm_source%3Ddistribute.pc_relevant_t0.none-task-blog-2%257Edefault%257EBlogCommendFromBaidu%257EPaidSort-1-136628984-blog-104821723.235%255Ev43%255Epc_blog_bottom_relevance_base8%26utm_relevant_index%3D1)

![](https://pic3.zhimg.com/v2-7feb0b1d1b474e8c3573423e1cdeaef0_r.jpg)[CUDA--Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/u011613991/article/details/84817110)

在编写CUDA程序时，经常要对CPU和GPU上分配内存和管理，这样就增加了编写程序发复杂度。在cuda6后引入了统一寻址（Unified Memory）技术，该技术使得CPU和GPU使用同一个指针对同一块内存进行处理，省去了原始的在CPU和CPU分配内存然后来回拷贝的过程，简化了程序的编写。

     统一寻址创建了一块托管内存（managed memory），这是在CPU和GPU共享的内存，它在CPU和GPU之间架起了桥梁。这块托管内存CPU和GPU都能访问通过单一指针访问得到，最关键的一点是，系统会自动地在host端和device端转移在Unified Memory内存分配的数据，这样就好像看起来CPU内存好像运行在GPU，GPU内存好像运行在CPU。

[CUDA统一内存优化DeepUM: Tensor Migration and Prefetching in Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/illyh/article/details/135071925%3Futm_medium%3Ddistribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-1-135071925-blog-134387446.235%255Ev43%255Epc_blog_bottom_relevance_base8%26spm%3D1001.2101.3001.4242.2%26utm_relevant_index%3D4)

利用CUDAUnified Memory，训练超出GPU内存容量的DNN。其实Unified Memory允许通过缺页异常来训练超出GPU内存容量的DNN，但是页面的迁移带来了很大的开销。DeepUM使用一种新的关联预取技术来隐藏页面传输的开销。

UM的缺点：

- 由于UM是虚拟内存空间，因此对于GPU上的每个内存请求都要进行地址转换，这可能严重影响性能
- 处理缺页异常会在CPU和GPU之间迁移页面，这会带来很大的I/O开销。但是UM也有很多好处：

- 使用纯粹的GPU内存，无法运行内存占用高于GPU内存容量的CUDA核函数，而UM可以利用缺页异常按需迁移页面，因此可以训练更大的DNN。
- 使用纯粹的GPU内存可能会有比较严重的内存碎片问题，DNN在训练过程中有频繁的内存分配和释放操作，尽管tensorflow和pytorch等主流DL框架都有自己的GPU内存管理机制，但是仍然存在一些内存碎片问题。而UM是虚拟内存空间，所有的内存对象都是以4KB的页为基础单元的，这会减小内存碎片问题，更有可能训练更大的DNN。DeepUM实现了一些优化技术来减小UM带来的开销：

DeepUM修改了一项最初为cache line预取而开发的相关预取技术来预取GPU页面。DeepUM在许多预取技术中选择了相关预取（correlation prefetching）。

page fault handler监控异常访问，因此DeepUM可以从page fault handler这里获得fault pages之间的关系。

DeepUM利用了一个事实：在DNN训练时，核函数执行模式和内存访问模式大多是固定、重复的。因此可以记忆这些重复的模式，然后进行相关预取。

DeepUM的相关表记录了在训练时核函数的执行历史以及页面访问，它通过相关表预测接下来会执行哪个核函数，然后预期页面。传统的相关预取使用单个表来存储历史并记录CPU cache line之间的关系，DeepUM相关预取使用了两个不同的表（核函数的执行历史、页面访问模式）。

采取了两种优化技术来减少页面异常处理的时间：page pre-eviction，page invalidation。

UM构建了一块统一的内存空间，CPU和GPU都能访问。从Pascal架构开始，NVIDIA GPU就有了页面迁移引擎（page migration engine），通过利用缺页异常机制（page fault mechenism），GPU可以拥有一个虚拟内存系统。当GPU访问一个不在GPU内存中的页面时，就会触发缺页中断，然后NVIDIA设备驱动将页面迁移到GPU内存里。因此，UM允许在GPU上执行超出GPU内存的程序。

![](https://pic3.zhimg.com/v2-5af7c99aef187c0b49be02c198409fd4_r.jpg)左侧是CPU的统一内存空间（物理位置位于CPU内存，即主存）、右侧是GPU的统一内存空间（物理位置位于GPU内存），

在图a中，page1和page2都位于CPU的统一内存空间，GPU访问page1，触发缺页中断（如图b），NVIDIA设备驱动将page1从主存迁移到GPU内存上，然后重新对page1的访问。

![](https://picx.zhimg.com/v2-b99b98218ee7c9f9bdb2d734a1df0cd1_r.jpg)尽管UM有这些好处，但是UM的缺点很明显，那就是缺页异常处理的开销太大。SM中有TLB，在处理异常时，TLB无法运行，等到异常处理完毕后，TLB才能继续；缺页异常还会引入很大的I/O开销（CPU和GPU之间页面迁移）。因此可以使用CUDA API如cudaMemPrefetchAsync()、cudaMemAdvise()来减少缺页异常。

![](https://pic2.zhimg.com/v2-9692bc0c004bfaff7a98e53f1bfe7913_r.jpg)NVIDIA Page Fault Handler

fault buffer : fault buffer是GPU上的一个循环队列，存储了异常访问信息（faulted access information）。GPU可以同时产生多个异常。fault buffer里面可以存储对于同一个页面的多次异常访问信息。

UM block : 1个UM block最多由512个连续的页面组成，也就是4KB*512=2MB。每个UM block都包含了所有页面的信息，比如这些页面存在CPU还是GPU、读写权限等。NVIDIA以UM block的粒度来管理页面，如果一个UM block包含了faulted page，那么这个UM block被称为faulted UM block。

![](https://picx.zhimg.com/v2-dff11b037fca84bb95e06efb38bbc549_r.jpg)GPU页面异常处理（fault page handler）的流程
- 首先，NVIDIA驱动程序从GPU的故障缓冲区中获取发生故障的页面地址和访问类型（步骤1）。
- 然后，NVIDIA驱动程序预处理这些故障（步骤2），它移除重复的地址并根据它们的UM块进行分组。
- 接下来，NVIDIA驱动程序检查每个故障UM块的可用GPU内存空间（步骤3）。
- 如果没有可用的GPU内存空间用于故障UM块，它会将一些页面从GPU驱逐到CPU（步骤4）。
- 然后，它在GPU中填充故障页面（步骤5）（也就是为故障页面分配GPU内存空间），
- 并将页面传输到GPU（步骤6）。
- 当传输完成时，UM块的故障页面被映射到GPU（步骤7）。
- 这个过程重复，直到所有的故障UM块都被处理（步骤8）。
- 最后，NVIDIA驱动程序向GPU发送一个重播信号，故障处理器完成处理（步骤9）。DeepUM**修改了一个最初用于缓存行预取的相关预取技术来预取 GPU 页面**。来隐藏页面传输的开销。这种技术是完全自动的，对用户是透明的。

此外，文章还提出了**两种优化技术**，以尽量减少 GPU 错误处理的时间。

一种是基于相关表信息的页面**预先驱逐**。当 GPU 内存被过度订阅时，页面驱逐会增加页面错误处理时间，因为页面驱逐逻辑位于页面错误处理例程的关键路径上。

另一种优化是在页面驱逐受害者预计不再被 PyTorch 使用时，使 GPU 内存中的页面失效。这种优化删除了 CPU 和 GPU 之间不必要的内存流量。

![](https://pic3.zhimg.com/v2-b45bb68b30e6834745724ea089a831b0_r.jpg)DeepUM的整体架构DeepUM由两部分组成：DeepUM Runtime和DeepUM Driver

**DeepUM runtime**

DeepUM runtime为CUDA内存分配函数提供封装函数，来把所有GPU内存分配请求转换为UM分配请求。通过在UM空间里面分配GPU内存对象，实现对GPU内存的超额分配。此外，DeepUM runtime为CUDA核函数启动命令和其他CUDA库函数（比如cuDNN cuBLAS）提供了封装函数。

DeepUM runtime管理着execution ID table，这个表记录了核函数启动历史，以及核函数名称、参数的哈希值。当一个新的核函数启动命令进入到deepUM runtime时，它会计算该核函数名称、参数对应的哈希值，然后在表里查询有没有同样的哈希值，如果有的话，就把对应的execution ID赋给这个核函数，如果没有的话，就把新的哈希值记录到表中，并赋给这个核函数一个新的execution ID。最后，DeepUM runtime在执行这个新的核函数启动命令之前，会把一个CUDA callback函数排队到CUDA runtime，这个callback函数会把接下来的核函数启动命令对应的execution ID传递给DeepUM driver，DeepUM driver在相关预取中使用这个execution ID。

DeepUM driver

DeepUM driver处理GPU缺页异常，并且把页面预取到GPU。

核函数执行模式和内存访问模式是固定的、重复的，因此可以记忆下来，进行相关预取。DeepUM driver管理correlation table，记录了在DNN训练过程中的核函数执行历史和页面访问。通过相关表中的信息预测接下来会执行哪个核函数，进行相关预取。

DeepUM driver中有四个线程：fault handling thread、correlator thread、prefetching thread、migration thread

fault handling thread : 使用NVIDIA驱动中的函数（比如访问fault buffer、给GPU发送重放信号）处理缺页异常。DeepUM driver拦截发往NVIDIA driver的缺页异常中断信号，然后fault handing thread读取fault buffer，将读取到的异常访问信息传递给其他三个线程。fault queue存储异常页面对应的UM block的地址，fault queue拥有最高优先级，以保证GPU尽快重放异常访问。

correlator thread : 管理相关表，它根据来自fault handing thread的异常访问信息更新相关表。详见4.2

prefetching thread : prefetching thread查找相关表并根据出现异常的块地址计算要预取的UM block地址。然后，它将预取命令加入预取队列，这是一个单生产者/单消费者队列。预取命令包括要预取的UM block地址和预测将使用的UM block的execution ID。

migration thread : 在CPU和GPU之间迁移UM block。fault queue的优先级高于prefetch queue，因此当fault queue空时，才会处理prefetch queue。

**原始的相关预取 (Correlation Prefetching)**

基于对的相关预取（pair-based correlation prefetching）在相关表中记录了miss addrssed的序列。当miss时，会查询相关表，预取所有和miss address相关的address。

如下图(a)所示，相关表中每一行记录的是一个不同的miss address。miss address序列是abca，当前的miss address是c，因此Last指向c，SecondLast指向b。

![](https://pic3.zhimg.com/v2-bb003492fd9da6018ebfe58fb0e5d1e8_r.jpg)DeepUM中的相关预取技术，基于原始的“相关预取”技术进行了修改

旨在通过预取 CUDA 内核预期访问的页面来减少页面错误。与原始的相关预取不同，DeepUM 使用两种类型的相关表：执行 ID 和 UM 块。

这两种类型的表都是单级 (          = 1)，因为预取线程执行链式操作。此外，由于 DNN 工作负载的特性，没有必要维护多个级别。

**注意：DeepUM中的相关预取是以UM block为单位的！**而不是cache line或者page！

执行 ID 相关表（简称执行表）:

该表记录了CUDA核函数的execution ID，execution ID来自DeepUM runtime。

记录了 CUDA 核心的执行 ID 的执行历史，整个系统中只存在一个这样的表。

图 6 显示了一个执行表的示例。执行表的每个条目都保存了一组相关的执行 ID。

每组由四个执行 ID 组成。前三个 ID 代表最后一个核心（更新表时正在执行的核心）之前刚刚执行的核心。因此，最后一个 ID 表示预取发生时接下来要执行的核心。

例如，执行 ID 为 0 的条目有一个记录（7，9，92，75）。这个记录意味着已经执行了执行 ID 为 7，9，和 92 的核心，执行 ID 为 0 的核心当前正在执行。它预测接下来要执行的核心的执行 ID 为 75。

这个执行表的作用就像是一本历史记录册，它记录了每个核心执行的顺序，这样在预取时就可以根据这个顺序来预测下一个可能会执行的核心，从而提前预取相应的页面，提高性能。

每个条目包含的记录数是可变的，也就是说，一个核心的后继核心的数量是可变的。因此，每个条目可以持有所有后继核心执行 ID 的历史。DeepUM 选择这种方案是为了尽可能准确地预测下一个要执行的核心。即使预测下一个要访问的 UM 块的结果不准确，成本也不高，但预测下一个要执行的核心的结果不准确，成本就很高。

![](https://pic1.zhimg.com/v2-6a20f07a18e108bf8e3998d16f7e80f2_r.jpg)UM 块相关表（简称块表）记录的是 UM 块级别的历史，而不是记录错误页面地址的历史。选择这种粒度的原因有两个。

- 一个是大规模 DNN 有太多的页面地址需要管理。
- 另一个是让 DeepUM 与 NVIDIA 驱动程序具有相同的页面管理粒度更有效。图 7 显示了一个块表的示例。每个执行 ID 都有一个块表，记录了相应 CUDA 核心内的 UM 块访问历史。它类似于原始相关预取中使用的表。然而，一个块表包含了指向最后一个被预取的 UM 块的结束 UM 块的地址，以及指向在相应核心执行中首次出错的 UM 块的开始 UM 块的地址。这两个指针被用来实现链式操作。在当前执行的核心转换过程中，开始 UM 块和结束 UM 块都会被捕获。结束 UM 块是页面所在的 UM 块，该页面在执行 ID 转换之前最后出错。开始 UM 块是第一个出错的页面所在的 UM 块，这个错误发生在执行 ID 转换之后。

![](https://pic1.zhimg.com/v2-db9e89cb115dc5eeed5f807c66ed5df8_r.jpg)
![](https://pica.zhimg.com/v2-f3c428e0059b4cd976e64922314f764e_r.jpg)https://www.cs.utexas.edu/~skeckler/pubs/HPCA_2016_Paged_Memory.pdf

Unified Memory是如何处理page fault的

这里的demand paging的概念和CPU的相同，就是访问页时，发生page fault，然后获取page,也被称为memory oversubscription，但是与CPU不同，因为GPU没有处理precise exception的能力，也没有处理page fault的能力。当一个warp的遇到page fault时，GPU可以：

- 暂停所有warp的执行
- 或者暂停当前warp的执行，调度其他可以执行的warp显然第一种代价更大，因此GPU按照第二种执行，内部也就需要存放一个page fault queue。而后具体的处理page fault，搬运page的操作，超出了GPU的能力范围，需要CPU执行或者CPU发送命令到GPU执行。

具体的流程：

- GPU内部单元向TLB发起虚实地址转换请求，TLB miss，而后在GPU MMU page walk，查询页表，依然miss后，触发page fault。
- GPU MMU向内部单元发送该地址翻译失败响应，挂起该warp。
- GPU将page fault存到page fault queue中，向CPU发起page fault异常请求。
- CPU执行GPU runtime程序从page fault queue中读取page fault的请求，不同于CPU处理CPU page fault的直接处理方式，GPU可能会同时发生多个page fault，于是：对page fault queue中的地址进行排序sort，Sort之后，方便在CPU的页表中进行查找
- 不同于CPU处理CPU page fault的另一点是，不仅会处理GPU的page fault对应的页，也会进行prefetch其他的页，预取一些页进入GPU内存，提高page fault的利用效率
- 而后根据该page的属性，CPU需要unmap这个page，将该页放到GPU的内存中，同时在GPU的页表中增加这个page，并flush 这个GPU uTLB
- 完成上述操作后，GPU才可以重新将page fault的warp重新调度后面又发现GPU处理evict和fetch的操作是顺序的，以保证正确性，因此他们提出可以在中断处理时，先evict一个页，因为GPU内存向CPU内存写，比读要快，因此evict和fetch操作可以并行执行。

![](https://pica.zhimg.com/v2-e6492ab59ba3981605fec9354992adf0_r.jpg)https://ramyadhadidi.github.io/files/kim-asplos20.pdf

[CUDA Unified Memory统一内存使用注意](https://link.zhihu.com/?target=https%3A//blog.csdn.net/u013701860/article/details/51140762%3Fspm%3D1001.2101.3001.6650.6%26utm_medium%3Ddistribute.pc_relevant.none-task-blog-2%257Edefault%257EBlogCommendFromBaidu%257ERate-6-51140762-blog-104821723.235%255Ev43%255Epc_blog_bottom_relevance_base8%26depth_1-utm_source%3Ddistribute.pc_relevant.none-task-blog-2%257Edefault%257EBlogCommendFromBaidu%257ERate-6-51140762-blog-104821723.235%255Ev43%255Epc_blog_bottom_relevance_base8%26utm_relevant_index%3D12)

![](https://pic1.zhimg.com/v2-d8b3c7e91bb529d9eb1370b7faf1c6fe_r.jpg)
![](https://pica.zhimg.com/v2-09430a49fbad501762e38eb205e7d4c4_r.jpg)一方面，只需要定义一个指针即可在主机和设备端通用；另一方面，去掉了显式的内存拷贝，大大缩短了代码数量和编写、维护难度。

在CUDA编程使用Unified Memory的时候有几个注意点：

Unified Memory has three basic requirements:

1, a GPU with SM architecture 3.0 or higher (Kepler class or newer)

2, a 64-bit host application and operating system, except on Android

3, Linux or Windows

（4）再接着在CUDA 11.2 引入了stream ordered memory allocator（流顺序内存分配器），使用 cudaMalloc 和 cudaFree 管理内存分配会导致 GPU 在所有正在执行的 CUDA 流之间进行同步。 Stream Order Memory Allocator 使应用程序能够通过启动到 CUDA 流中的其他工作（例如内核启动和异步拷贝）来对内存分配和释放进行排序

[10.CUDA编程手册中文版---附录F流序内存分配_cudamallocasync-CSDN博客](https://link.zhihu.com/?target=https%3A//blog.csdn.net/kunhe0512/article/details/124318480)，

[使用 NVIDIA CUDA 流顺序内存分配器，第 1 部分](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/zh-cn/blog/using-cuda-stream-ordered-memory-allocator-part-1/)

[jhang：CUDA编程入门之 Stream-Ordered Memory Allocator(1)](https://zhuanlan.zhihu.com/p/602591368)

![](https://pic2.zhimg.com/v2-76d838384d29cfd829a1c4eee5ced271_r.jpg)（5）在CUDA 11.7 引入了Lazy loading，内核延迟加载，提高了内核加载效率。CUDA Runtime在程序初始化期间将不再加载所有模块，除非这些模块包含managed variables，程序能够仅加载实际需要使用的内核，在初始化过程中节省时间。这减少了GPU存储器和主机存储器上的内存开销。

（6）最终在CUDA 12，NVIDIA走到了一个新高度，通过NVLINK C2C实现硬件层面的cache level coherence，既保证了速度又确保了可编程性。

![](https://pica.zhimg.com/v2-f1f3b0a4551dc1073dfd5d929b8dc75c_r.jpg)
![](https://pic3.zhimg.com/v2-61aa0cf95a71832031da56f70a342392_r.jpg)在Grace Hopper系统中，处理器（CPU或GPU）可以直接通过NVLink-C2C互连访问另一个处理器的物理内存（CPU和GPU共享一个虚拟内存空间（即系统内存））。这种访问以缓存行粒度进行，CPU端的传输大小为64字节，GPU端为128字节。所访问的内存被透明地缓存在两个处理器的高速缓存层次结构中。此外，两个处理器缓存是完全一致的。原子操作也可以在NVLink-C2C互连上执行，允许任何处理器以原子方式读取和修改物理内存位置。这些特性是在硬件级别实现的，并且不需要用户干预，遵循Arm的AMBA CHI协议。

在 Grace Hopper 内存系统中，Grace CPU 具有一个称为系统内存管理单元 (SMMU) 的独特硬件，该硬件由 ARM 的 SMMUv3 规范定义

Grace Hopper系统使用两个不同的页表：一个全局页表和一个GPU专用页表。选择用于内存分配的页表取决于使用的特定程序级API。

**一个集成的系统页表。**Grace Hopper 系统引入了一个位于 CPU 内存中的系统范围页表。操作系统直接访问这个页表，创建并管理页表项（PTE）。SMMU 使用这个页表为 CPU（在用户应用程序需要时）和 GPU（通过 NVLink-C2C 互连请求时）提供虚拟到物理地址转换。系统范围页表中的内存页面可以物理上存在于 CPU 或 GPU 的内存中，并且它们使用系统页面大小，该页面大小由操作系统定义并受 CPU 架构能力的限制。当使用 Grace 处理器时，页面大小为 4KB 或 64KB。

**GPU专用页表。**Grace Hopper 系统保留了NVIDIAGPU 早期版本中的本地 GPU 页表。该页表位于 GPU 内存中，只能由 GPU 访问，并在托管内存的物理位置在 GPU 上时存储与cudaMalloc分配和 cudaMallocManaged 分配相对应的虚拟到物理地址映射。此页表使用的页面大小为 2MB

![](https://pic1.zhimg.com/v2-d754ebfb0cb7a4dc8ca54ec7eeb396ea_1440w.jpg)在数据位于 CPU 内存的情况下，当 GPU 的高速缓存中保存有虚拟到物理地址的映射时，在 Grace Hopper 系统上访问一个虚拟地址位置的工作流程：

- GPU 线程访问一个虚拟地址。
- 数据没有被缓存在 GPU缓存层次结构中。这会导致缓存未命中的情况。
- 在 GPUTLB（Translation Lookaside Buffers）中查找虚拟地址以进行虚拟到物理地址的转换。由于转换已经被缓存，所以使用它来进行对物理内存的访问。
- GMMU 使用 NVLink-C2C 互连以cacheline为粒度来发起直接内存访问 (DMA)。
- 请求的访问从 CPU 内存执行，并且被发送回 GPU。
- 访问完成并且内存被缓存在常规 GPU 缓存层次结构中。

各代 GPU MMU 的演进（从 P100 到 B100）

1. Pascal 架构（P100，2016 年）
- MMU 功能：
  - 基础地址转换：支持 2 级页表（类似传统 GPU MMU），虚拟地址空间为 40 位。
  - 初步统一内存：通过 CUDA 6.0 引入 Unified Memory，但需手动数据迁移（`cudaMemcpy`），效率较低。
  - 基本隔离：依赖 PCIe 的 SR-IOV 实现虚拟机分片，MMU 仅支持简单权限控制。
- 限制：
  - TLB 容量小（L1 TLB 约 64 条目），高并发计算时频繁未命中。
  - 虚拟化性能差，Hypervisor 需频繁干预地址转换。

![](https://picx.zhimg.com/v2-da1b70d5c0d15608125515c77bf78935_r.jpg)
![](https://pic1.zhimg.com/v2-6cf973e54aea79c9da2a81f4a73df7a6_r.jpg)

2. Volta 架构（V100，2017 年）
- 关键改进：
  - 增强的统一内存：支持按需页面迁移（Page Migration），GPU 可触发缺页中断，驱动自动迁移数据。
  - 多级页表：引入 4 级页表（48 位虚拟地址），支持更大显存映射。
  - 虚拟化初步优化：硬件辅助的 TLB 无效化指令（减少 Hypervisor 开销）。
- 性能提升：
  - L2 TLB 容量提升至 512 条目，支持 2MB 大页，AI 训练任务提速约 20%。
- 应用场景：  
  深度学习训练（如 ResNet）受益于大页和按需分页。

![](https://pica.zhimg.com/v2-2f6f34dfbb97b5e80331ddbc05b16744_r.jpg)3. Ampere 架构（A100，2020 年)
- 关键改进：
  - 多实例 GPU（MIG/Multi-InstanceGPU）：  MMU 支持显存硬分区（每个实例独立地址空间），最多分割 7 个实例。
  - 硬件虚拟化（Stage2）：  
    引入类似 ARM SMMU 的 Stage2 转换，虚拟机直接管理客户页表（VA→IPA），Hypervisor 控制IPA→PA。
  - 安全扩展：  
    显存加密引擎（AES-XTS），保护多租户场景数据。
  - TLB 优化：  
    L2 TLB 容量增至 2048 条目，支持 1GB 大页。
- 性能提升：  
   虚拟化延迟降低 50%，大模型训练（如 GPT-3）显存利用率提升 30%。

![](https://pic4.zhimg.com/v2-9d05a2bf003f1393db41a6043de3cb8b_r.jpg)4. Hopper 架构（H100，2022 年）
- 关键改进：
  - 动态地址扩展：支持 57 位虚拟地址（未来兼容性），适应百亿参数模型。
  - 增强虚拟化（vGPU 2.0）：  
    硬件沙盒化 MMU，每个 vGPU 实例独立加密上下文。
  - 智能预取：  
    基于线程块访问模式的 TLB 预取算法，推荐系统推理吞吐量提升 40%。
  - 显存压缩：  
    稀疏页表压缩（如 MoE 模型），减少显存占用。
- 应用场景：  
  超大规模推荐系统（如 Meta 的 DLRM）、机密计算（医疗 AI）。

![](https://pic2.zhimg.com/v2-24789bf3a99422cc3c4357616e0c534d_r.jpg)
![](https://pic3.zhimg.com/v2-61aa0cf95a71832031da56f70a342392_r.jpg)

5. Blackwell 架构（B100，2024 年）
- 关键改进：
  - 内存池：  
    MMU 支持跨 GPU/CPU 的一致性内存访问（CXL.mem），统一地址空间扩展至 64 位。
  - 显存优化：  
    针对 HBM3e 的 3D 堆叠显存设计低延迟转换路径，减少高密度计算开销。
  - 量子安全加密：  
    集成抗量子加密算法（如 CRYSTALS-Kyber），应对未来算力攻击。
  - 自适应页表：  
    动态调整页表层级（4 级/5 级），优化稀疏与密集访问场景。
- 性能提升：  
   千亿参数模型训练（如 GPT-5）显存效率提升 50%，边缘推理延迟降低 35%。

演进趋势总结

架构GMMU 关键创新性能提升方向典型场景P100基础统一内存、2 级页表初代 AI 计算支持传统 HPC、小规模训练V100按需分页、4 级页表大模型训练效率深度学习框架（TensorFlow）A100MIG 分区、Stage2 虚拟化、显存加密多租户隔离、安全增强云 AI、多任务推理H100动态地址扩展、智能预取、稀疏压缩超大规模模型支持、低延迟推理推荐系统、机密计算B100内存池、3D 显存优化、量子安全跨设备一致性、抗未来威胁千亿模型训练、边缘

对上层软件带来的好处
1. 显存优化：  
   - 使用 `cudaMallocManaged` 时启用大页（`hugePage` 标志），减少 TLB 未命中。
2. 虚拟化配置：  
   - 在云环境中启用 MIG 或 vGPU，利用硬件隔离提升多租户性能。
3. 安全实践：  
   - 通过 `nvidia-smi` 启用显存加密（如 `-fgpu` 参数）保护敏感数据。
4. 未来兼容性：  
   - 针对 CXL 内存池设计分布式训练框架，减少数据迁移开销。

参考资料

- [函谷叨客：【研究综述】浅谈GPU通信和PCIe P2P DMA](https://zhuanlan.zhihu.com/p/430101220)
- [CUDA Unified Virtual Address Space & Unified Memory](https://link.zhihu.com/?target=https%3A//nichijou.co/cudaRandom-UVA/)
- [Introducing Low-Level GPU Virtual Memory Management](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/blog/introducing-low-level-gpu-virtual-memory-management/)
- 《GPUVM: GPU-driven Unified Virtual Memory》
- 《An Evaluation of Unified Memory Technology on NVIDIA GPUs》
- 《In-Depth Analyses of Unified Virtual Memory System for GPU Accelerated Computing》
- 《Interplay between Hardware Prefetcher and Page Eviction Policy in CPU-GPU Unified Virtual Memory》
- 《Harnessing Integrated CPU-GPU System Memory for HPC: a first look into Grace Hopper》
- [李常青：[文献翻译] Harnessing Integrated CPU-GPU System Memory for HPC: a first look into Grace Hopper](https://zhuanlan.zhihu.com/p/710047673)
- [NVIDIA 的 Blackwell 架构：解析 B100、B200 和 GB200](https://link.zhihu.com/?target=https%3A//blog.csdn.net/Ai17316391579/article/details/142592557)
- [CUDA02 - 访存优化和Unified Memory](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/maomaozi/p/16175725.html)
- [Phoenix Studio：CUDA|Unified Virtual Address|Unified Memory](https://zhuanlan.zhihu.com/p/690464857)
- [GPU Microarch 学习笔记【2】Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/hit_shaoqi/article/details/134387446)
- [https://ramyadhadidi.github.io/files/kim-asplos20.pdf](https://link.zhihu.com/?target=https%3A//ramyadhadidi.github.io/files/kim-asplos20.pdf)
- [https://www.cs.utexas.edu/~skeckler/pubs/HPCA_2016_Paged_Memory.pdf](https://link.zhihu.com/?target=https%3A//www.cs.utexas.edu/~skeckler/pubs/HPCA_2016_Paged_Memory.pdf)
- [GPU Microarch 学习笔记【2】Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/hit_shaoqi/article/details/134387446)
- [CUDA统一内存优化DeepUM: Tensor Migration and Prefetching in Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/illyh/article/details/135071925%3Futm_medium%3Ddistribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-1-135071925-blog-134387446.235%255Ev43%255Epc_blog_bottom_relevance_base8%26spm%3D1001.2101.3001.4242.2%26utm_relevant_index%3D4)
- [SoJGooo：cuda统一内存优化DeepUM: Tensor Migration and Prefetching in Unified Memory](https://zhuanlan.zhihu.com/p/672931240)
- [【论文笔记】【存储】DeepUM: Tensor Migration and Prefetching in Unified Memory](https://link.zhihu.com/?target=https%3A//blog.csdn.net/qq_43207982/article/details/134194540)
- [G10: Enabling An Efficient Unified GPU Memory and Storage Architecture with Smart Tensor Migrations](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2310.09443)
- OC-DNN: Exploiting Advanced Unified Memory Capabilities in CUDA 9 and Volta GPUs for Out-of-Core DNN Training
- DeepUM: Tensor Migration and Prefetching in Unified Memory
- 《**PTX与CUDA：性能、兼容与生态——**赵家程 中科院计算所 处理器芯片全国重点实验室 中科加禾》