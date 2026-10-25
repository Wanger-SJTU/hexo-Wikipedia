---
title: "(1 条消息) 为什么目前x86的CPU的L1 Cache这么小？"
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/为什么目前x86的CPU的L1-Cache这么小/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/490863861/answer/2157766409"
---


前面答主提到了L1大小将直接影响访问时间，而访问L1的时间又会直接影响到平均内存访问时间（average memory access time - AMAT），对整个CPU的性能产生巨大影响。那么具体L1大小是如何限制L1访问时间的呢？这里涉及到一个重要的CPU模块translation lookahead buffer - TLB，下面简单介绍一下这两点。

#### 1，平均内存访问时间 AMAT

首先，我们用一个简单的例子来说明一下L1访问时间对AMAT的影响。Intel从Sunny Cove开始将L1-D从原来的32KB提高到了48KB（纠正题目中的一个错误，intel和AMD长期使用的是32KB L1-D和32KB L1-I而非16KB）。对应的L1访问时间从4 cycle来到了5 cycle（intel声称48KB L1-D的延时虽然提升了，但是带宽比之前提升了一倍）。对应的苹果的M1 L1-D访问时间为3 cycle。

假设我们有三层的memory hierarchy（L1, L2, off-chip RAM），其中L2访问时间为10 cycle，off-chip RAM访问时间为200 cycle。假设32KB L1-D的情况下L1，L2的hit rate大致为90%，9%，增加至48KB L1-D的Sunny Cove L1，L2 hit rate提升为95%，4%，那么对应的。

Sunny Cove平均访问时间约为7.15 cycle

Sunny Cove之前的microarchitecture的平均访问时间约为6.5 cycle（之前写反了:p）

简单的模型估算可以看出，即便增大L1 size可以提升L1 hit rate，然而L1访问延时的增加，还是会使得平均内存访问延时增加了~10%。这也是为什么L1 cache size（以及对应的访问时间）长时间来没有太大改动的原因。那么究竟是什么限制了L1的访问延时呢？这里就要引入TLB和L1的结构。

#### 2，TLB，virtual index physical tag L1缓存结构

在系统启动过程中，仅在很早期启动阶段CPU处于实模式，开启paging之后，CPU接受的load/store指令对应的地址均为虚拟地址（更准确的说是线性地址，x64之后segment基本不怎么用了），在访问L1 cache的时候还需要经过虚拟地址VA到物理地址PA的转换。现代CPU通常采用virtual index physical tag的L1结构（L1-D和L1-I类似，TLB也区分iTLB和dTLB）。这种L1的结构一大好处就是可以在index cache set的时候同时访问TLB（相当于隐藏了部分L1访问延时），一个x64下的L1访问示意图如下所示。（这里不在详细介绍set-associative cache的具体结构）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eab256f6dafd.jpg)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8dee3a60f6cd.webp)

对于4KB大小的page，共有12bit page offset，其中低6bit为cacheline offset（64B cacheline size），剩余6bit作为L1 index bits，这也就意味着L1只能限制于64个cache set。对于32KB L1-D，也就意味着其每个set对应8 way（32KB/ = 8）。Sunny Cove的48KB L1-D对应每个set 12 way。由上图可以看出，L1访问延时的关键路径为TLB访问以及TLB hit之后对相应L1 cache set的TAG matching，由于cache set是简单的lookup，我们可以认为在TLB查询结束得到PPN的时候立即可以进行TAG matching。（TLB也是一个小的set-associatative cache，也需要进行TAG matching因此访问时间要长于L1 set lookup）。因此，TLB的查询时间和L1的associativity（即图中的TAG matching）决定了L1的访问延时。

为了保证L1访问延时可以做的足够低（原因如上所示），通常需要设计L1的associativity尽量小。因此在Sunny Cove之前通常为8 way。这里Sunny Cove增加了一个cycle的L1访问延时，不确定是由TLB的改动引起的还是L1 associativity由8 way增加到12 way因此的。但是总的来说，我们可以看出L1为什么不能设计的很大，主要是由于virtual index physical tag的结构引起的。

那么为什么苹果的M1可以做到192KB的L1-I（128KB L1-D），同时保证3 cycle的访问延时呢？

首先一点苹果的最高主频相对Intel/AMD的desktop/server line的CPU要低一些，因此在时序上约束相对放松一些（主要是tag matching的comparator路径的关键路径）。其次一点，也是最关键的M1对应的MacOS采用的是16KB page而非x86的4KB page。

由上图可知如果扩大page size（16KB对应14bit），相当于增加了2bit的index bits，这样的话L1 cache set数目可以增加4倍（在保持associativity的前提下），因此M1的L1-I正好是Sunny Cove的4倍（192KB/48KB = 4）。M1的L1-D大小是128KB（4倍于32KB）。

苹果的M1其实没有什么太多的黑科技（相对于x86来讲，RISC带来的译码的简化确实可以带来巨大的instruction window size的提升），但是对于问题中的L1 cache来讲，其实更多的是系统层面的取舍（page size增加也会导致内存浪费，内存碎片等问题，但是同时也会减轻页表的压力，增加TLB coverage）。不过也仅限于苹果，其M1的产品只是MacBook一个设备，可以做更多的定制，对于x86来讲，历史包袱和众多设备兼容性的问题，使其很难做到像苹果这种更加灵活的架构设计。

[编辑于 2021-10-08 00:20](//www.zhihu.com/question/490863861/answer/2157766409)

​​260 ​39 ​分享

​​

收起​
