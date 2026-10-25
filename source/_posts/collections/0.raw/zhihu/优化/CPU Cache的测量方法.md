---
title: CPU Cache的测量方法
date: "2023-08-07 00:00:00"
updated: "2023-08-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/CPU-Cache的测量方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/242740319
---


通过上一篇文章[《测量CPU的利器 - TSC》](https://zhuanlan.zhihu.com/p/242702373)知道了可以通过TSC来测量CPU的内部行为，本文将介绍CPU Cache的结构及几种常用的测量手法：

#### Cache的分级结构

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_a34af056a83b.jpg)

- Cache 是分级的：一般分为3级，较老的CPU如Core 2 Duo只有2级。L1是集成是core内部的，指令与数据Cache是分离的，好L1C和L1D；L2是紧贴core的；L3是多核共享的，每个core有自己的Slice，通过Ring Bus或Mesh结构互联互访
- Cache以Cache Line为访问单位，即Cache及内存的访问是以块为单位的，而不是字节单位。较新的X86 CPU的Cache Line一般是64字节。上一篇文章通过TSC观察CPU曾注意到一个有趣的测量结果：X86程序访问一个1字节与访问2个、4个及8个字节的延进均为31个指令周期，并不是线性增长的，就是这个原因
- 层级包含与否由CPU实现决定：L2一般都是包含L1的全部内容的，L3可以是Non-inclusive，也可以是Exclusive。Intel的CPU一般是包含的，但AMD的Zen系列CPU的L3就是定义为L1/L2的Victim Cache，Victim是指从L1及L2中移除的Cache项
- Cache自身的构造采用“组相联”方式

#### Cache不同分级的性能

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_3283905bb09c.jpg)

在上图中看到Cache是分级的，用不同级的访问速度有很大不同，故我们可以通过制造冲突或直接Flush Cache的方式将数据从Cache中清除，从而通过前后内存访问的时间差来进行判定。

#### 测量方法

制造冲突以清除Cache的常用手段有以下几种【参阅 1：Cache side channel attacks: CPU Design as a security problem by Anders Fog]】：

- Evict (驱逐) + Time (测量) ： 通过制造冲突以达成被测量目标数据从cache中清除的目的
- Prime (装填) + Probe (探测) ：与1)方法一样，只是作用对象是反的
- Flush (冲刷) + Reload (加载) ) ：最主动和最快的办法，直接利用clflush指令刷新，然后再读取内存，此时会发生Cache Miss事件。
- Flush (冲刷) + Flush (冲刷) ) ：与3)类似，但测量的是clflush指令针对数据在不在cache中的执行周期的不同
在条件许可的情况下，尽量采用第3种，即最快的办法。

#### 实例：Flush + Reload

Flush即clflush指令，Visual C++中定义如下：

`extern void _mm_clflush(void const*_P);`

测量代码：

```text
/* flush */
        _mm_clflush(&data[0]);

        /* measure cache miss latency */
        ts = rdtscp(&ui);
        m |= data[0];
        te = rdtscp(&ui);`
```


#### 实战：Cache Line的测量

<strong>原理：</strong>

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_d7dab2c2aae3.jpg)

<strong>结论：</strong>

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_9d342fbeb82b.jpg)

从图中我们可以看到64字节是一个明显的分界点。

<strong>硬件预取: Hardware Prefetcher</strong>

如果你在自己的电脑上进行测试，你看到的可能不是上图所示的样子，很大的可能如下图所示，明显的分界点不是64字节而是128字节：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_ac7070322742.jpg)

这是因为硬件预取即HWPrefetcher的缘故，并且硬件预取默都是开启的。硬件预取功能会在每次Cache Miss的情况下多读一个Cache Line，可以理解为每次读取两个Cache Line即64 * 2 = 128字节，但数据并不是同时到达的，第二个Cache Line的数据的到达周期会晚些，这也是为什么在128这个点上的延时会比64高。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_20c72320a043.jpg)

如何关闭硬件预取

- 通过BIOS设置： 通过BIOS选项来关闭hwprefetcher，对所有的CPU生效
- 通过内核调试器windbg直接关闭：通过直接改写msr寄存器关闭当前核的硬件预取功能:
0: kd> rdmsr 0x1a4
msr[1a4] = 00000000`00000000
0: kd> wrmsr 0x1a4 0x0f
0: kd> ~1
1: kd> rdmsr 0x1a4
msr[1a4] = 00000000`00000000
1: kd> wrmsr 0x1a4 0x0f
1: kd> rdmsr 0x1a4
msr[1a4] = 00000000`0000000f
1: kd> ~0`

#### 实战：Cache不同分级的访问延时测量

如果我们以更大的的stride进行同样的测试则可以测量出Cache每一级的大小，即L1D，L2，LLC和内存访问的延时。下图中我们分别以1K、2K，直至64M的stride测量出来结果：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_61f6affaed0d.jpg)

可以看到整个曲线有4个平台，分别表示L1D、L2、LLC和内存。L1D的大小为32K，L2为256K，这部分和CPUZ的输出是一致的。
但第三个平台包含了512K、1M及2M，从4M开始延进有明显的跃升，从8M之后基本稳定在高位。这里就涉及到了LLC组织的不同：L1D及L2 Cache都是与物理核（Core）绑定的，而LLC是绑定CPU的，即2核的CPU的两个核心会共享同一个LLC，整个LLC是平均分配给每个核的，然后每个核心的LLC通过Ring Bus互联，即每个核又可以访问所有的LLC。这里在4M的stride发生波动的原因有两个：

- 当前运行测量程序的CPU核心用尽自己的LLC后会通过Ring Bus竞争访问另一个核心的LLC
- 测量程序运行时整个操作系统也在运行，所以整个系统均会竞争使用LLC，必然会带来挤出效应，从而增大了延时

#### 参考资料

- CSCA: Cache side channel attacks: CPU Design as a security problem by Anders Fogh
- HWPF: Disclosure of Hardware Prefetcher Control on Some Intel® Processors
- [SourceCode: CacheLatency Github Repo](https://link.zhihu.com/?target=https%3A//github.com/matt-wu/CPU/tree/develop/CacheLatency)
