---
title: Is SIMD all you need?
date: "2021-11-06 00:00:00"
updated: "2021-11-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/Is-SIMD-all-you-need_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/430223278
---


### 引言

最近和组里大佬们讨论向量化引擎的时候关注到一个很有趣的点是在现在的向量化引擎加速中，SIMD的加速效果十分有限，深究原因，一方面是如果仅靠编译器优化c++代码成为SIMD指令的效果是十分有限的，另一方面是SIMD指令可能导致预期外的CPU降频。于是亲自去扒了扒网上关于SIMD指令导致CPU降频的原因，这里做一个总结。

体系结构大牛Lemire在2018年做了一个SIMD的实验[1]，benchmark使用一个计算密集型的Mandelbrot算法，在Skylake X服务器中实验结果如下：

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_71561e5ee72e.jpg)

实验结果显示，AVX-512指令导致了3%～4%的性能下降。

而在另一篇文章中，作者用不同的机器部署NGINX观察性能，得到了更夸张的性能结果，使用AVX-512指令的服务相比不使用AVX-512的服务性能下降了大概10%[5]。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_c0350fb51b18.jpg)

上述实验结论大体相似，就是AVX-512指令会导致主频下降，从而导致预期外的性能下降。

造成这样现象的原因主要是在AVX-512指令和其他指令**混用**时，AVX-512指令导致短时间内CPU降频（~2ms），从而影响其他非SIMD指令的执行，最终导致整体性能下降。

不过，其中最让人费解的是CPU的行为，众所周知SIMD指令最大的作用在于通过单指令多数据流的方式提升单线程的计算能力，但是为什么会导致总体的性能下降呢？

### CPU Frequency Behavior[3]

想要知道答案，我们必须从CPU自身设计入手。通过查阅Intel的wiki，我们可以大致得到结论，就是Intel CPU依赖复杂的机制基于可用headroom进行dynamic frequency scaling。dynamic frequency scaling，顾名思义，其实就是在运行时，根据不同的负载，CPU会主动升频、降频。

而在CPU进行dynamic frequency scaling中不得不提的一点是，在CPU发展过程中，虽然晶体管的数量仍然能勉强维持摩尔定律[4]，并且单核越来越复杂，但是芯片的能耗限制却始终没有解除。所以，当进行某些更加复杂、耗能的计算时（例如AVX-512中的FMA计算），CPU必须要保证自身热能与电能的能耗不超过限制，这也是dynamic frequency scaling的作用，就是通过自身主动升频、降频，能够在保证能耗限制的同时，尽可能对程序进行优化。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_bf8b61751b40.jpg)

CPU有三种不同的频率级别，也称为三种不同的license，从最快到最慢：L0、L1和L2。L0是写在盒子上的“标称”速度：当芯片上写着“3.5 GHz turbo”时，它们指的是单核L0 turbo。L1是一种较低的速度，有时称为AVX turbo或AVX2 turbo，最初与AVX和AVX2指令相关。L2的速度低于L1，有时称为“AVX-512 turbo”。而由于不同的workload表现出不同的热能特性和电能特性，因此它们也具有不同的频率。Intel将workload分为三类：

- Non-AVX
- AVX2 Heavy
- AVX-512 Heavy
各自的典型Workload及主频变化区间如下

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_790acffa8371.jpg)

除此之外，不同核数对于主频的影响也是不同的，下图是xeon gold系列中主频对比，可以看出，核数越多，AVX512指令对于CPU降频的影响是越大的（其他系列的主频变化不太一样，但是观察到的现象大致相同）。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_41577267bda5.jpg)

另外也有一篇文章指出，其实指令是否导致CPU降频是和操作数的位数相关的，具体结论如下：

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_3ac0e9fc042c.jpg)

根据上述分析，我们现在可以把性能下降归咎于特定宽度、特定指令和特定操作类型。所以，我们如何能在自己的程序中避免引入SIMD出现的性能回退呢？

### Is SIMD all you need?

好的回到文章标题。我们现在可以得到结论，就是SIMD并不是一种并行计算的完美方法。那么我们如何能充分利用SIMD的优势呢？

- SIMD指令是否造成性能下降与指令集类型、计算负载相关，所以使用之前必须要进行细致分析。
- 在多线程环境下，不同CPU核的频率是隔离的，所以像AVX-512这种大量SIMD计算的程序，应该使用单独线程放在独立CPU核心上进行。这样可以**避免AVX-512指令影响**其他指令的执行。
- 工程师可以利用profile工具观察CPU license变化，例如使用perf stat。
- 需要使用AVX-512指令时，需要仔细评估SIMD带来的收益是否能抵消CPU降频带来的penalty。
- 注意编译器的影响，目前大多数编译器对于使用AVX-512指令应该都是十分保守的，但是也不可避免会优化少量代码成为AVX-512指令。

Reference

[1] The dangers of AVX-512 throttling: a 3% impact

[2] Xeon Gold 5120  - Intel - WikiChip

[3] Frequency Behavior  - Intel - WikiChip

[4] [linux：百度C++工程师的那些极限优化（并发篇）](https://zhuanlan.zhihu.com/p/385380454)

[5] On the dangers of Intel's frequency scaling

[6] SIMD instructions lowering CPU frequency
