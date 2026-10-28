---
title: "LLM前沿技术跟踪：PagedAttention升级版vAttention"
date: "2024-05-30 00:00:00"
updated: "2024-05-30 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/LLM前沿技术跟踪-PagedAttention升级版vAttention/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/700569722"
---


[Memory Management for Serving LLMs without PagedAttention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.04437)

PagedAttention动态分配内存，导致内存不连续。有如下问题：

- 需要在框架中引入额外内存管理代码。增大开发难度。
- kv cache在attention计算中无法连续读取，需要手动修改注意力kernel代码进行分段读取，增大开发难度。
- 根据查找表分段读取内存会导致整体效率受到影响。

PagedAttention速度慢于FlashAttention

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_85364863fbb6.jpg)

在小数据量时，PagedAttention慢的更多，猜测是由于cache命中率高，连续内存读取效率更高？数据量更大时，PagedAttention的性能开销被高计算量所覆盖。

从vllm代码中可看出，在prefill阶段使用的是FlashAttention，而在decoder阶段使用PagedAttention。原因就在于

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d01d72f4a787.jpg)

vllm代码 PagedAttention改进：使用连续内存。

最开始其实就是使用连续内存，但是存在问题：

- LLM自回归生成，需要的内存大小不固定，预分配太长会导致内存浪费，太短后续再分配如何保持连续？
- 动态分配cuda api影响耗时。

vAttention优化 —— 将KV缓存存储在连续虚拟内存中而无需提前提交物理内存的系统。

- 1、首先，CUDA API支持的最小物理内存分配粒度为2MB，此大小可能会导致大量的容量浪费（表8）。为了解决这个问题，我们修改了开源的CUDA统一虚拟内存驱动程序，以添加对64KB到256KB的更细粒度物理内存分配的支持。
- 2、使用CUDA API进行内存分配会导致高延迟，因为每次分配都涉及到内核的往返。为了向最终用户隐藏内存分配的延迟，我们介绍了几种特定于LLM的优化，例如将内存分配与计算重叠，提前执行一些操作以及延迟内存回收。

总结：单纯的内存管理，无需修改kernel代码，可无缝接入FlashAttention等。性能比vLLM高出1.97倍。

### vAttention Systems

观察1：在每次迭代的基础上，KV高速缓存内存需求是事先已知的。这是由于自回归解码每次生成一个令牌。因此，在每次迭代中，请求的KV缓存内存占用量均匀地增长一个令牌，直到请求完成。

观察2：KV缓存不需要高内存分配带宽。跨所有层的单个令牌的内存占用通常是几十到几百兆字节的内存，每次迭代运行10s—100s毫秒，这意味着请求每秒最多需要几兆字节的内存。虽然令牌管理提高了系统吞吐量，但每秒生成的令牌数量在超过特定的批量大小后会趋于稳定（图6a）。这意味着存储器分配带宽要求在大批量时也饱和（例如，Yi34B为128）。对于我们研究的所有模型，我们观察到最高的内存分配速率最多为每秒600 MB（图6c）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f6e178bd8649.jpg)

#### 1、预留虚拟内存

创建足够长的虚拟内存，但是并不分配物理内存（利用了系统本身的虚拟内存管理机制）。对每个kvcache分配2个buffer单独存储，总共分配B*layer_num*2个buffer，每个buffer为seq_len*FP16。

以Yi-34B为例，TP=2。N=60，H=4，D=128，P=2. L=128K。则每层每个token的cache为4(head) * 128(D) * 2(Fp16) = 1024B。那么总共的kv cache =256(bs)* 128k * 60层 * 1024B  * 2= 3840GB。 

#### 2、按需物理内存分配

Attention每次优先分配一个物理内存页面，并且仅当请求已使用完其先前分配的所有物理内存页面时，再分配新的物理内存，并映射到虚拟内存中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_de9792d71d44.jpg)

#### 3、利用low-level CUDA支持

cudaMalloc同时分配虚拟内存和物理内存。最近的CUDA版本为程序员提供了对虚拟和物理内存的细粒度控制。在vAttention中利用这些底层API。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4fe9315148dd.jpg)

#### 
4、拓展pytorch接口

通过torch.empty等API分配的张量带有预分配的物理内存。这是因为PyTorch缓存分配器使用cudaMalloc接口来分配GPU内存（虚拟和物理）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7dccebb08533.jpg)

依靠CUDA的低级API支持，我们扩展了PyTorch缓存分配器，允许应用程序为张量保留虚拟内存缓冲区，而无需提前提交物理内存。

#### 5、请求级KV-cache索引

每个虚拟张量表示最大批量大小B的层的K-cache（或V-cache）。在这些张量中，不同的请求占据不同的非重叠子区域（即子张量）。我们用一个唯一的整数标识符reqId来定位请求的子张量，该标识符的范围是0到10- 1（请注意，最多有两个请求同时运行）。请求的子张量在整个批处理的虚拟张量中的K-cache（或V-cache）偏移量  请求标识符reqId由vAttention分配。

#### 6、框架调用API流程

根据参数分配虚拟内存。但只预分配部分物理内存，且此物理内存尚未映射到kvcache。

根据Schedue调度请求，得到request_id。在模型处理之前，需要确保相应的虚拟内存都存在映射的物理内存。在预填充阶段，需要分配指定数量的cache内存。而在decoder阶段，每次只需要一个长度的kvcache。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9886de658b58.jpg)

当推理完成时，释放request_id对应内存。

### vAttention优化总结

1、NVIDIA GPU原生支持至少三种页面大小：4KB、64KB和2MB。因此，原则上，物理内存可以以4KB大小的任意倍数分配。实现这一点的最简单方法是扩展现有的CUDA虚拟内存API。不幸的是，CUDA API是在封闭源代码的NVIDIA驱动程序中实现的，这使得我们无法修改它们的实现。

幸运的是，部分NVIDIA驱动程序（特别是与统一内存管理相关的驱动程序）是开源的。因此，我们在开源NVIDIA驱动程序中实现了一组新的API，以模仿现有CUDA API提供的相同功能，但支持多种页面大小。

2、内存分配存在延时。对具有60层的Yi-34 B进行扩展。这需要调用120次vMemMap，每次调用大约需要9微秒。因此，将一个请求的KV缓存增加一个页面将为相应的迭代增加大约1毫秒的延迟，并且将与需要映射的物理内存量成比例地增长。

在prefill阶段和deocder阶段，每一次迭代需要的kvcache大小都是固定的。vAttention跟踪当前上下文长度以及每个请求已经映射了多少物理内存页面。因此在每次判断需要创建新页时，在执行前一次迭代时使用后台线程分配新页。

由于迭代延迟通常在10s—100s毫秒的范围内，因此后台线程在开始执行之前有足够的时间为迭代准备物理内存映射。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b2b6b0e58959.jpg)

如图显示了按需同步分配物理内存（当我们的后台线程、延迟回收和急切分配优化都被禁用时）可以在64KB的页面大小下增加多达15%的开销。较大的页面大小可以分摊分配成本，并将开销降低到3%（256KB和2MB页面大小）。

3、延迟回收。当一个request请求完成后，不急于收回内存。当短时间内有新的request_id进来，可以直接使用已分配好的内存。

### 性能评估

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3dd3348053f1.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_757cf743d1d7.jpg)

吞吐量和TTFT均有提高

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b10808aba592.jpg)

vLLM在块大小为16的情况下表现最好，因为其注意力内核在较小的块大小下更有效。
FlashAttention的GPU内核比vLLM内核的最佳版本（Yi-6 B，16* 16 K）快2.85倍。然而，较小的块增加了CPU开销，例如，块大小为16的FlashAttention比块大小为128的更差。

每次分配的size越小，内存浪费的空间越小。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_284d90dc90e2.jpg)

### 
总结

vAttention就是在PagedAttention的想法上，利用虚拟内存机制，将预分配虚拟内存和实际分配物理内存分离，并拓展了分配小内存的pytorch算子，将内存管理从attention kernel中剥离出来。既可以使用原生的FlashAttention计算加速，又可以完成PagedAttention的内存碎片化+动态化管理功能。