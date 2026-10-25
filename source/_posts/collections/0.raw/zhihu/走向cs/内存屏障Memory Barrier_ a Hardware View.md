---
title: "内存屏障Memory Barrier: a Hardware View"
date: "2019-05-19 00:00:00"
updated: "2019-05-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/内存屏障Memory-Barrier_-a-Hardware-View/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/66085562
---


### Why Hardware Misordering?

**（1）Cache Structure**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_aaedf915b15d.jpg)

Modern CPUs sport increasingly large caches in order to reduce the overhead of these expensive memory accesses.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_b567e88063ba.jpg)

two-way set-associative cache: and is analogous to a software hash table with sixteen buckets, where each bucket's hash chain is limited to at most two elements. This cache has sixteen "sets" and two "ways" for a total of 32 "lines", each entry containing a single 256-byte "cache line", which is a 256-byte-aligned block of memory. 

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_0720dd7d0fbf.jpg)

(1) 多个cache缓存同一份内存数据导致不一致性；（2）false sharing。一个共享变量的字段在同一个cache-line中，但是各字段读写频率不一样，同步读写放大；（3）Reorder Memory Accesses。CPU0有2个平行运行的cache（bank0与bank1），若CPU0先写banck0再写bank1。若bank0忙而bank1空闲，第1个写可能比第2个写先对CPU1可见。

**（2）Cache-Coherence Protocols **

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_25f82a1a7a2f.jpg)

MESI 4 States.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_1f6171098946.jpg)

MESI Protocol Messages.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_f3ac8bbd3f79.jpg)

cache-line强一致性同步模型。

**（3）Store Buffers**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_2a6a7beade0b.jpg)

Stores Result in Unnecessary Stalls.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_441aff1e4f43.jpg)

One way to prevent this unnecessary stalling of writes is to add “store buffers” between each CPU and its cache.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_51d48ead3e56.jpg)

CPU 0 can simply record its write in its store buffer and continue executing. When the cache line does finally make its way from CPU 1 to CPU 0, the data will be moved from the store buffer to the cache line.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_e68b5ea803bb.jpg)

b中赋值语句中未得到a的新值，单CPU顺序无法保证。The problem is that we have two copies of "a", one in the cache and the other in the store buffer. This example breaks a very important guarantee, namely that each CPU will always see its own operations as if they happened in program order.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_305803c9079e.jpg)

增加store forwarding。a given CPU's stores are directly forwarded to its subsequent loads, without having to pass through the cache.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_7796968d540a.jpg)

多CPU执行会怎样？

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_c502c425d622.jpg)

多CPU仍执行乱序。8行too late。

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_56b1ef2b9b73.jpg)

写前加入内存屏障。The memory barrier smp_mb() will cause the CPU to flush its store buffer before applying subsequent stores to their cache lines. (1)The CPU could either simply stall until the store buffer was empty before proceeding, (2)or it could use the store buffer to hold subsequent stores until all of the prior entries in the store buffer had been applied.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_f35de2d496f4.jpg)

**（4）Invalidate Queue**

Unfortunately, each store buffer must be relatively small, which means that a CPU executing a modest sequence of stores can fill its store buffer (for example, if all of them result in cache misses). At that point, the CPU must once again wait for invalidations to complete in order to drain its store buffer before it can continue executing. This same situation can arise immediately after a memory barrier, when all subsequent store instructions must wait for invalidations to complete, regardless of whether or not these stores result in cache misses(a large number of invalidate messages arrive in a short time period or cache is busy). This situation can be improved by making invalidate acknowledge messages arrive more quickly. One way of accomplishing this is to use per-CPU queues of invalidate messages(invalidate queues).

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_fe3caa3f7070.jpg)

cache一致性同步间加入Invalid Queue。有了Invalidate Queue的CPU，在收到invalidate消息的时候首先把它放入Invalidate Queue，同时立刻回送acknowledge 消息，无需等到该cacheline被真正invalidate之后再回应；一旦将一个invalidate（例如针对变量a的cacheline）消息放入CPU的Invalidate Queue，实际上该CPU就等于作出这样的承诺：在处理完该invalidate消息之前，不会发送任何相关（即针对变量a的cacheline）的MESI协议消息；如果本CPU想要针对某个cacheline向总线发送invalidate消息的时候，那么CPU必须首先去Invalidate Queue中看看是否有相关的cacheline，如果有，那么不能立刻发送，需要等到Invalidate Queue中的cacheline被处理完之后再发送。（若不处理，store buffer有写该cache line的信息，而invalidate queue有让该cache line失效的消息，写冲突）。

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_602754fb9c4d.jpg)

多CPU执行仍会乱序，因为未及时cache同步。Since the hardware does not know what relationships there might be among what to the CPU are just different piles of bits.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_d2395a2a3d7c.jpg)

写后与读前加入内存屏障。

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_0bb17ad0b6b3.jpg)

However, the memory-barrier instructions can interact with the invalidate queue, so that when a given CPU executes a memory barrier, it marks all the entries currently in its invalidate queue, and forces any subsequent load to wait until all marked entries have been applied to the CPU's cache(需要从其他CPU获取最新值).

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_e6409393278b.jpg)

### **Memory-Barrier Instructions For Specific CPUs**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_4299b9a7e66f.jpg)

Each CPU has its own peculiar memory-barrier instructions, which can make portability a challenge. In the table, the first four columns indicate whether a given CPU allows the four possible combinations of loads and stores to be reordered. The next two columns indicate whether a given CPU allows loads and stores to be reordered with atomic instructions. With only six CPUs, we have five different combinations of load-store reorderings, and three of the four possible atomic-instruction reorderings. The seventh column, dependent reads reordered, covering Alpha CPUs. The last column indicates whether a given CPU has a incoherent instruction cache and pipeline. Such CPUs require special instructions be executed for self-modifying code.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_e6b99801a34c.jpg)

These primitives generate code only in SMP kernels.

### Intel® 64 Architecture Memory Ordering White Paper

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_c055aea350ae.jpg)

Since the **x86 CPUs **provide "process ordering" so that all CPUs agree on the order of a given CPU's writes to memory, the smp_wmb() primitive is a no-op for the CPU. Even more recently, Intel published an updated memory model for x86, which mandates a total global order for stores, although individual CPUs are still permitted to see their own stores as having happened earlier than this total global order would indicate. On the other hand, x86 CPUs have traditionally given no ordering guarantees for loads, so the smp mb() and smp rmb() primitives expand to lock;addl. This atomic instruction acts as a barrier to both loads and stores. However, note that some SSE instructions are weakly ordered, CPUs that have SSE can use mfence for smp_mb(), lfence for smp_rmb(), and sfence for smp_wmb().

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_a4d6d7063e69.jpg)

**（1）Instructions and memory accesses**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_c63e69bbd891.jpg)

**（2）Terminology**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_5d827d9c42c3.jpg)

可见性visibility。

**（3）Base Guarantee**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_d24023bae162.jpg)

Store-Load重排。

**（4）Memory ordering for write-back (WB) memory**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_67fb82dfab3a.jpg)

**（5）Loads are not reordered with other loads and stores are not reordered with other stores**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_1dbfbdf06c9e.jpg)

**（6）Stores are not reordered with older loads**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_c8f91407f1e0.jpg)

**（7）Loads may be reordered with older stores to different locations**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_4821f4c618d5.jpg)

**（8）Intra-processor forwarding is allowed**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_bafaedf75af4.jpg)

**（9）Stores are transitively visible**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_c9ec24c6319f.jpg)

**（10）Total order on stores to the same location**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_1c1f51268584.jpg)

**（11）Locked instructions have a total order**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_277a65ebbac6.jpg)

**（12）Loads and stores are not reordered with locks**

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_30bee6c7ec44.jpg)

### C++ Atomic on CPU

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_df6fe1c62f01.jpg)

on x86。

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_b18300469626.jpg)

on ARM。AMD64 is compatible with x86, and has recently updated its memory model to enforce the tighter ordering that actual implementations have provided for some time. The AMD64 implementation of the Linux smp_mb() primitive is mfence, smp_rmb() is lfence, and smp_wmb() is sfence. In theory, these might be relaxed, but any such relaxation must take SSE and 3DNOW instructions into account.

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_b6f37ba4dc1e.jpg)

### Advice to Hardware Designers

presented here in the hope that it might help prevent future such problems:

- I/O devices that ignore cache coherence.
- Device interrupts that ignore cache coherence.
- Inter-processor interrupts (IPIs) that ignore cache coherence.
- Context switches that get ahead of cache coherence.
- Overly kind simulators and emulators.

### References

-  为什么需要内存屏障 [betterfishXL：为什么需要内存屏障](https://zhuanlan.zhihu.com/p/55767485)
- Why Memory Barriers？中文翻译（上） 
-  无锁数据结构（基础篇）：内存栅障 无锁数据结构（基础篇）：内存栅障 - 文章 - 伯乐在线
- McKenney P E. Memory barriers: a hardware view for software hackers[J]. Linux Technology Center, IBM Beaverton, 2010.
- Hardware S. Memory Ordering in Modern Microprocessors[J]. Interface, 6: 6.
- Is Parallel Programming Hard, And, If So, What Can You Do About It?. Chapter 15, Advanced Synchronization: Memory Ordering.
- C/C++11 mappings to processors, https://www.cl.cam.ac.uk/~pes20/cpp/cpp0xmappings.html 
-  Intel® 64 Architecture Memory Ordering White Paper, http://www.cs.cmu.edu/~410-f10/doc/Intel_Reordering_318147.pdf
