---
title: Write Combine 和 Cache 是什么关系
date: "2023-03-05 00:00:00"
updated: "2023-03-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Write-Combine-和-Cache-是什么关系/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/607637105
---


### 多元

事务不是二元对立、非黑即白的，在 0 和 1 之间，往往存在多种中间的过渡状态。

在 x86 架构的 Cache 光谱线上，有 read 和 write 都 cache 的 Writeback 模式（简称 <strong>WB</strong>），有 read 时 cache，write hit 时同步写入 cache line 和 main memory，而 write miss 时不分配 cache line（即没有 write allocate），直接写入 memory 的 Writethrough 模式（简称 <strong>WT</strong>）。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0a475cbad677.jpg)

图-1而上图绿框的这个代表 Write-Combining 的 <strong>WC</strong>，看起来和红框代表 Uncacheable 的 <strong>UC</strong> 一样，读写都是不 cache 的。 那 WC 存在的意义是什么，这个“写合并”又是怎样一种工作方式呢？

### 专长

在 Linux 的 debugfs 中，查看一下各内存段的 PAT。如果是没有独立显卡（指 GPU 有专属的内存）的机器，大概率只能看到 WB 和 UC 两种 memory type：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3b8e71a9ba48.jpg)

WB 理论上性能最好，是 <strong>system memory</strong> 的默认配置，而 UC 多作为 <strong>memory-mapped I/O</strong>（简称 MMIO） 的属性。相比而言，WC 要小众一些，它可以将多个 write 操作合并成一个【注-1】，以减少内存访问的开销，但代价是可能 reorder： 

**Writes to this memory type can be combined internally by the processor and written to memory as a single write operation to reduce memory accesses. For example, four word writes to consecutive addresses can be combined by the processor into a single quadword write, resulting in one memory access instead of four.                                                                                                                                                                 
The WC memory type is useful for graphics-display memory buffers where the order of writes is not important.SMP 系统上，各个 CPU 可以通过支持 [cache 一致性协议](https://zhuanlan.zhihu.com/p/95435168)的总线 snoop 到其他 CPU 对 cache 的读写，而通过 PCIe 连接的 CPU 和 GPU 则不能互相 snoop，因此从 CPU 的角度，「显存」算是 I/O memory，对其访问需要是 uncachable 的。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_546a83a9c6e8.jpg)

但是「显存」作为 frame buffer 有个特点，就是它容许对不同地址写操作的 combine 和 reorder（写入不同像素点的数据往往是不相关的），这和普通的 MMIO 是不同的，因此就有了 WC 这种相对特殊的类型，它在 graphic memory** 的写操作上，比 UC 有更高的效率：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b96d71ab791b.jpg)

图-2由此也可见，cache 和 out-of-order 并不是两个独立的特性，memory type 将它们交织在了一起。

那 WC 对同一地址的连续写呢？以最后写入的为准（来自 Intel SDM 卷 3 第 11.3.1 节）。

**multiple writes to the same memory location will leave the last data written in the location and the other writes will be lost.
### 后来者

x86 是有先发优势的，Linux 中早早就有了 ioremap_wc() 等和 write-combine 有关的函数，作为后来者的 ARM，在设计上需要去兼容。

ARM 并没有直接的 WC 的概念，但它提供的 Normal NC** 的效果等同于 x86 的 WC：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c5a27cc83670.jpg)

图-3而 ARM 里这个 Normal NC 跟它的 noncached 并不是一回事（以下代码取自 v6.1 内核 "arch/arm64/include/asm/pgtable.h"）：

```text
#define pgprot_noncached(prot) \
    _pgprot_modify(prot, PTE_ATTRINDX_MASK, PTE_ATTRINDX(MT_DEVICE_nGnRnE) | PTE_PXN | PTE_UXN)
#define pgprot_writecombine(prot) \
    _pgprot_modify(prot, PTE_ATTRINDX_MASK, PTE_ATTRINDX(MT_NORMAL_NC) | PTE_PXN | PTE_UXN)
```


这里你会看到 ARM 有个 GRE 的概念（不是 GRE 考试），其中 G 代表 Gathering：

**Multiple memory accesses of the same type, read or write, to the same memory location to be merged into a single transaction.
Multiple memory accesses of the same type, read or write, to different memory locations to be merged into a single memory transaction on an interconnect.R 代表 Re-ordering，E 代表 Early Write Acknowledgement（所谓 early ack，就是 CPU 不会等待数据真的写入目标 device）。而如果加上 "n" 前缀，就表示相反的意思。

这算是在 UC 和 WC 的基础上，对 device memory 的访问提供了更多可能的组合。按理 2 的 3 次方对应 8 种组合？

#### GRE

其实不然，GRE 对应的这个三个属性是 hierarchic 的，就是你允许了 Gathering，也必须允许 Reordering 和 Early Ack，因此不会出现 GnRnE, GnRE, GRnE, nGRnE 这四种情况，而只会存在 GRE, nGRE, nGnRE, nGnRnE（截止 v6.1，Linux 除了 Normal NC，应该只用到了 nGnRE 和 nGnRnE）。

此外，GRE 系列相比 Normal NC 还有个重要区别（注意到上面图-3 红框部分）：不支持 unaligned access（更具 ARM 特色有没有） 。

如果你遇到一台（不知道什么原因）不能很好支持 Normal NC 的 ARM 机器，想把对 device memory 的访问改成 nGnRnE 的模式，那么你可要小心了：如果传入 glibc 库的 memset() 的参数是非自然对齐的，那么很可能出现 bus error**，因为 memset 在 ARM64 架构上的实现可能用了 "dc zva" 指令。

**

注-1**：看起来 write combine 和 write back 有一点像，都有 write 的延迟和聚合，但 WC 是 uncache, reorder 的，"uncache" 是指它不涉及 cache line 的分配。那数据暂存在哪里呢？答案是CPU 内部一个叫 "WC buffer" 的硬件单元，它不是 L1/L2/L3 cache，也不是 store buffer。

**

参考：**

- *AMD64 Architecture Programmer's Manual Volume 2* 第 7.4 节 *Memory Types*
- *Armv8-A memory model*
- Understanding Write Combining on Arm
- https://developer.arm.com/documentation//Device-memory 
- Semantics of MMIO mapping attributes across architectures

*原创文章，转载请注明出处。*
