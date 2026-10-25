---
title: "Data Prefetch指令预取"
date: "2020-11-18 00:00:00"
updated: "2020-11-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/Data-Prefetch指令预取/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/299596490"
---


### 引言

我们知道，CPU从存储介质中读取数据是有延迟的，在现代计算机体系结构中，为了减少数据读写的延迟，采用了分层的内存体系，处于底层的是DRAM，也就是我们说的主存，它比硬盘读写速度更快，但是容量更小，在主存上面是SRAM也就是我们说的高速缓存Cache，高速缓存又分为L1、L2、L3，每级的Cache大小依次递减，这种分层的架构因为CPU访问内存高度的局部性对于减少数据读写延迟非常有效。**对于数据密集型的程序来说，我们没有办法保证数据读写一定有很强的局部性，比如大规模矩阵运算，所以cache miss在这种数据密集型的程序中会带来较大的开销，其中一部分原因是因为及时性的内存请求策略，只有在需要某个数据的时候才会发起内存请求，这个时候如果cache miss，cpu则会等待数据所在的cache line从主存被调入cache中，才能成功拿到数据继续执行。
正是如此，编译器提供了prefetch预取指令（比如gcc提供的__builtin_prefetch），prefetch指令可以让主存提前将目标内存地址对应的数据所在的整个cache line从主存调入cache中，可以是L1 L2 或者L3，后续的内存读取操作就大概率不会触发cache miss导致cpu stall。

### 指令的乱序执行

在讲指令预取之前，先了解一下CPU的乱序执行（Out-of-order execution）。早期CPU数据流架构是顺序执行的，我们先看下它的基本流程：

1.获取当前指令。
2.如果输入的运算对象是可以直接被获取到的，则将指令发送到相应的执行单元执行。如果运算对象不可取，依赖主存读取，则CPU会开始等待数据直到可取。
3.指令在对应的执行单元被执行。
4.执行单元将运算结果写回到寄存器。

然后，乱序执行的流程：
1.获取当前指令。
2.指令先被送入执行缓冲区。
3.所有指令在执行缓冲区中等待其运算对象就位，当运算对象就位之后，每个指令都允许优先离开缓冲区。
4.运算对象就位的指令被分配到相应的执行单元执行。
5.执行单元的执行结果被存放到缓冲区中。
6.当该指令之前的所有指令的执行结果都写回到寄存器之后，该条指令的结果才会从缓冲区中写回到寄存器。

假设有如下代码片段：

- R1 = M[1024]
- R1 = R1 +2
- M[1032] = R1
- R1 = M[2048]
- R1 = R1 + 4
- M[2056] = R1
第4条指令在逻辑上是不依赖第3条指令的，但是4却不能在3完成之前提交指令运算结果，这种依赖本质上是因为不同指令用了同一个寄存器导致的，为了解决这个问题引入了寄存器重命名技术。

#### 寄存器重命名

我们可以通过改变寄存器名字来让4 5 6指令与1 2 3指令并行执行：

- R1 = M[1024] ==== 4. R2 = M[2048]
- R1 = R1 + 2 ==== 5. R2 = R2 + 4
- M[1032] = R1 ==== 6. M[2056] = R2
编译器会尽量检测出这种依赖问题，调整寄存器的使用，合理的分配给不同的指令。但是汇编程序能够使用的寄存器是有限的，现代CPU很多多有物理寄存器，通过把指令集所使用的寄存器映射为不同的物理寄存器，从而在硬件级别提供更大的并行能力。**尽管，就算CPU有乱序执行能够最大程度的掩盖 load & store指令带来的延迟，但是依然无法保证在指令有依赖的情况下CPU会等待主存请求的情况出现。

### Prefetch指令预取原理

#### 基本流程

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f1ef04c4410e.jpg)

- 图a, 表示没有prefetch的CPU执行流程，可以看到的是，内存读取操作r1,r2,r3到来的时候都触发了cache miss，CPU必须等待直到cache line被换入才能继续执行。
- 图b，表示prefetch的最理想情况，指令预取的理想时机是CPU请求内存的时候刚好cache line被换入，这样主存和cpu是最大程度的并行，没有任何主存延迟。
- 图c，表示不那么理想的情况，可以看到r1,r2内存读取操作发起时间过晚，导致cpu还是等了一段时间，但是尽管等了，也要比不用prefetch要快。

#### Software Data Prefetch(软件数据预取)

数据预取指令的目的就是在下一个load & store指令到来之前，先将数据从主存调入cache中，尽量掩盖cache miss带来的延迟，编译器也可能会在编译期自动化插入prefetch指令，不管是程序员还是编译器都无法在编译期准确的预测prefetch完成的时候刚好执行到load & store指令，所以如何正确的插入prefetch指令来匹配load & store指令是一个技术活，我们称为Prefetch scheduling。**prefetch最佳的引用场景是loop循环，因为loop循环中cache miss的概率非常大，我们可以用一个简单的loop来说明如何使用prefetch指令。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bc95d298ae36.jpg)

图a，表示没有prefetch指令的循环体。
图b，表示在每次循环体中，都首先预取下一次循环中需要的数据也就是第i+1个数据。
图c，假设一个cache line的长度是4个字长，数组中每个元素的大小是一个字长，那么没必要每次都prefetch，因为prefetch本身是有开销的，应该尽量减小它本身带来的开销。所以应该每次prefetch后面4个元素。
图d，在图c的基础之上，进一步在循环体之前先预取第0个元素，避免compulsory cache miss，然后在循环末尾再单独处理一下剩下几个元素。

#### Hardward Data Prefetch（硬件数据预取）

除了由程序员或者编译器主动插入prefetch指令之外，硬件级别上也可以做到运行时动态prefetch，这样进一步减小了prefetch指令执行带来的开销。

#### Sequential prefetching

在介绍 Sequential prefetching之前，先了解false sharing这个概念。对于多核CPU来说，每一个核都有相应的cache line，其中有一部分是私有的(比如L1)，有一部分是共享的(L2或者L3),如果不同的核访问了同一个cache line中的数据，其中有一个是写操作，那么由于要保持cache 一致性，导致两个核的cache line都被更新，带来性能损失。这个问题本质上是因为cache数据交换是以一个cache line为单位的，所以为了避免这个问题只能浪费一点内存，把两个核共享的变量单独放到不同的cache line中，比如把这个变量padding到一个cache line的长度。

Sequential prefetching的基本思路是每当取一个cache line的时候都默认prefetch下一个相邻的cache line，与直接把cache line扩充为两倍大小的方式相比，既能保证不会引入false sharing的问题，因为每个cache line的一致性策略是分来执行的，同时也能带来性能的提升。

当然，除了Sequential prefetching之外还有很多其他的算法比如, prefetch on miss、Tagged prefetch、Adaptive sequential prefetch 等等。

### Prefetch的缺点

- prefetch指令本身是有开销的，因为cpu需要存储prefetch指令的目标地址，通常是存在寄存器，这样一来就占用了cpu可用的寄存器空间，如果prefetch指令过多的话还会导致额外的主存访问带来更大的开销.
- prefetch除了本身的开销之外，还有可能带来cache pollution，如果被prefetch指令换入的cache line有可能在匹配的 load & store指令到来之前，又被换出了cache，这样不仅浪费了一次prefetch，还导致了cache miss。

### UE中的Prefetch应用实例

首先UE为不同的平台封装了Prefetch指令，比如windows平台的可以在WindowsPlatformMisc.h中看到：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c84c3ae4b9a8.png)

它里面调用了windows提供的_mm_prefetch，第一个参数是首地址，第二个参数是预取方式，分别为：

- _MM_HINT_T0，表示将数据取到所有缓存
- _MM_HINT_T1，表示将数据取到L2和L3
- _MM_HINT_T2，表示将数据取到L3
- _MM_HINT_NTA，表示读到非临时缓存中，防止cache pollution。
在粒子系统中，也有prefetch的应用：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_835d94fb24a8.jpg)

可以看到，在更新每一个粒子之前，会先prefetch下一个粒子数据首地址对应的cache line以及下一个相邻的cache line，一共两个cache line, cache line的大小通常是64字节，UE的粒子数据是16字节对齐，一个完整的粒子一共128字节，刚好2个cache line，也就是说，在循环体中每次都预取下个粒子数据。

### 总结

大部分的prefetch策略应用场景都是基于数值运算和连续内存访问的程序，这些程序的内存模型更加容易预测，并且有着不是很高的cache利用率，这种程序中使用prefetch容易得到较大的性能提升。对于普通程序来说，自动化的prefetch策略目前在学术界也还有很大的研究空间。

### Reference

Vanderwiel S P , Lilja D J . Data prefetch mechanisms[J]. Acm Computing Surveys, 2000, 32(2):174-199.
