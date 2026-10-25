---
title: (2 条消息) 一文搞懂cpu cache工作原理
date: "2023-01-19 00:00:00"
updated: "2023-01-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/一文搞懂cpu-cache工作原理/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/593016449
---


### 1， 简介

Cache被成为高速缓冲存储器（cache memory），是一种小容量高速的存储器，属于存储子系统的一部分，存放程序常使用的指令和数据。对于做service开发的同学，可能很少关注过这个模块，一般也不关心数据是在内存，还是在cache里。毕竟大部分时候，上层的程序只要遵循一定的开发规范（比如局部性原理），就不会太影响cache的工作。但是对于底层开发的工程师，比如操作系统开发、固件开发、性能优化和编译器开发工程师，在做开发、性能优化的时候，cache是需要重点关注的模块，如果对cache理解的不够深入，开发出来的程序不仅性能不好，并且可能会存在稳定性问题。

我们既然有了DDR，为什么还需要在CPU和DDR之间增加一个cache呢？主要是由于两个原因：一是CPU和DDR的访问、读写速度相差很大，二是减少CPU与其他模块争抢访存频率。

DDR的性能虽然也在提升，但是与CPU的差距越来越大，当前两者的速度相差几百倍，一条加载指令需要上百个时钟周期，才能从DDR读取数据到CPU的内部寄存器，这会导致CPU停滞等待加载指令，严重影响了CPU的性能。CPU的运行速度跟cache相差不大，并且程序运行遵循着时间、空间的局限性。因此通过在CPU与DDR之间增加一个cache，就可以很大的缓解CPU与DDR之间的速度差距。你可能会想，既然cache的读写速度这么快，是不是可以直接替代DDR？想法是好的，不过现实比较残酷，cache的成本是DDR的几十倍，最主要的是cache的单位存储的面积也要比DDR大的多，1G的cache面积有A4纸大小。因此不论从成本，还是芯片面积角度来看，基本上不能用cache替代DDR。

具有访存需求的模块不仅有CPU，还有GPU、DSP、DMA等模块。这些模块协同工作，存在很大概率的并行、竞争访问DDR的时刻。在CPU与DDR之间增加cache，会减少CPU直接访问DDR的频率，这样对其他模块访问DDR的速度提升有帮助。

其实在微架构中，除了CPU与DDR之间的cache外，还存在着其他的一些cache。比如，用于虚拟地址与物理地址转换的TLB（Table Lookup Buffer），用于指令流水线中的重排序缓冲区（Re-Order Buffer），用于指令乱序执行的内存重排缓冲区（Memory Ordering Buffer）等。本文主要谈论的是CPU与DDR之间的cache。

Cache一般由集成在CPU内部的SRAM（Static Random Access Memory）和Tag组成。在CPU第一次从DDR中读取数据时，也会把这个数据缓存在cache里，当CPU再次读取时，直接从cache中取数据，从而大大提高读写的速度。CPU读写数据的时候，如果数据在cache中，称为高速缓存命中（cache hit），如果数据不再cache中，称为高速缓存未命中（cache miss）。如果程序的高速缓存命中率比较高，不仅会提升CPU性能，还会降低系统的功耗。

### 2， 框架

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ed8f5915bce1.jpg)

arm64体系结构处理器框架如上图是一个经典ARM64体系结构处理器系统，其中包含了多级的cache。一个cluster CPU族包含了两个CPU内核，每个CPU都有自己的L1 cache及L2 cache，其中L1 cache分了L1I（Level 1 Instruction）、L1D（Level 1 Data）两种。不同CPU共享L3 cache，L3 cache位于cluster内。Cluster通过BUS与DDR、EMMC、SSD等建立连接，这样CPU就可以访问到EMMC、SSD中的数据。在程序执行时，会先将程序及数据，从SSD或者EMMC加载到内存中，然后将内存中的数据，加载到共享的 L3 Cache 中，再加载到每个核心独有的 L2 Cache，最后才进入到最快的 L1 Cache，之后才会被 CPU 读取。

在系统设计时，需要在cache的性能和成本（芯片面积）之间做tradeoff，由于程序运行遵循着局部性原理，因此现在CPU都采用了多级cache设计方案。越靠近CPU的cache，速度越快，成本越高，容量越小，越远离CPU的存储模块，速度越慢，成本越低、容量越大。不同存储器的访问速度、成本对比如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c755c7c36459.jpg)

不同存储器成本、性能对比
#### 2.1 cache和MMU的关系

Cache和MMU基本上都是一起使用的，会同时开启或同时关闭。因为MMU页表中的entry属性，控制着内存的权限和cache缓存的策略。CPU在访问DDR的时候用的地址是虚拟地址（Virtual Address，VA），经过MMU将VA映射成物理地址（Physucal Address，PA），然后使用物理地址查询高速缓存，这种高速缓存称为物理高速缓存。物理高速缓存在的缺点主要是，CPU查询TLB或MMU后才能访问cache，增加了流水线的延时。物理高速缓存的工作流程如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9c21fd56b464.jpg)

物理高速缓存的工作流程 CPU使用虚拟地址寻址高速缓存，这种高速缓存称为虚拟高速缓存。CPU在寻址时，先把虚拟地址发送到高速缓存，若在高速缓存里找到所需数据，就不再访问TLB和DDR。虚拟高速缓存的工作流程如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_09d38f3ec7de.jpg)

虚拟高速缓存的工作流程
#### 2.2 L1、L2、L3 cache

1）cache分级的原因

 L1、L2、L3 cache主要是由SRAM及tag组成的，其中L1 cache采用的是分离缓存方式：L1I（Level 1 Instruction）、L1D（Level 1 Data）cache。L2、L3 cache采用的却是统一缓存的方式，没有将数据、指令分开存储。从上面各存储器的访问延时对比来看，L1、L2、L3存在一定差异，但是成本相近，为什么要做成这种多级缓存形式，不直接将L1 cache做大，然后去掉L2、L3？

不采用一级cache的原因，一方面是：cache做的太大会影响读写速度。如果要更大的容量，就需要更多的晶体管，这不仅带来芯片的面积变大，还会导致速度下降。因为访问速度和要访问的晶体管信号线的长度成反比。也就是说当晶体管数增加后，信号路径会变长，读写存在大延迟，从而影响读写速度。另一方面，多级不同尺寸的缓存有利于提高整体的性能。尤其是对于CPU存在私有的L1、L2 cache，会减少对L3 cache的访问竞争。

L1、L2、L3 cache的区别是什么呢？L1是为了更快的速度访问，而优化过的。它用了更多、更复杂、更大的晶体管，从而更加昂贵和更加耗电。L2是为提供更大的容量优化的，用了更少、更简单的晶体管，从而相对便宜和省电。L3相对L2的优化也是类似的道理。在相同的制程、工艺中，单位面积可以放入晶体管的数目是确定的，这些晶体管如果都给L1，则容量太少，Cache命中率（Hit Rate）严重降低，功耗上升太快。如果都给L2、L3，容量大了，但延迟提高了一个数量级。如何平衡L1、L2和L3，用固定的晶体管数目达成最好的性能、最低的功耗、最小的成本，这是一种平衡的艺术。

2）cache命中率与大小的关系

对于L2、L3一般比L1要大，但是比DDR还是小了很多，L2、L3是不是可以做的更大？其实这跟上面讲述的L1不能做的太大的原因类似，主要是成本、面积、速度限制了L2、L3不能做的太大。L2、L3也是基于SRAM实现的，一个存储单元需要6个晶体管，再加上tag电路，至少需要几十个晶体管，另外命中率并不是随着L2、L3的增加一直大幅度增加的。命中率和各级cache大小的关系如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c0676228a0d9.jpg)

命中率和cache大小关系 为方便分析，我们假设L1维持在50%~60%的命中率（实际上95%左右）。从图中可以看出，随着L2容量的快速增加，开始时整体命中率也会快速提高，这表明提高L2容量，对提升整体命中率效用很明显。但随后L2的命中率，在容量增加到64KB后，随着容量增加，命中率增长趋缓，而整体命中率也同时趋缓。增加同样的晶体管，而受益却越来越少，个人理解这跟运行程序的访存特点有关，就是说当访存的频次、大小等确定后，开始L2容量增加，整体命中率也会增加，但是一旦达到一个临界点后，就算再增加容量，命中率的提升也是很有限的。因此再做CPU cache大小设计的时候，一定要建立在业务访存特点的基础之上，不然要么造成成本浪费，要么造成性能不足。

3）为什么L1 cache采用分离缓存的方式，而L2、L3采用统一缓存的形式？

 为什么L1采用了分离缓存的方式，分了L1I和L1D？主要原因如下：

- 原因一：避免取指令单元和取数据单元竞争访问缓存： 在CPU中，取指令和取数据指令是由两个不同的单元完成的，也就是说在流水线控制中取指和访存是分开的。如果使用统一缓存，当CPU使用超前控制或流水线控制（并行执行）的控制方式时，会存在取指令操作和取数据操作，同时争用同一个缓存的情况，这会降低CPU运行效率。
- 原因二：内存中数据和指令是相对聚集的，分离缓存能提高命中率： 在现代计算机系统中，内存中的指令和数据并不是随机分布的，而是相对聚集地分开存储的。因此，CPU Cache中也采用分离缓存的策略，这更符合DDR内存中数据的组织形式，从而提高cache命中率。
为什么L2、L3采用了统一缓存的方式？主要原因如下：

- 原因一：CPU直接跟L1 cache打交道，L1采用分离缓存后，已经解决了取指令单元和取数据单元的竞争访问缓存问题，所以L2是否使用分离缓存，影响不大。
- 原因二：当缓存容量较大时，分离缓存无法动态调节分离比例，不能最大化发挥缓存容量的利用率。例如数据缓存满了，但是指令缓存还有空闲，而L2使用统一缓存，则能够保证最大化利用缓存空间。
4）L3 cache为多核共享的，能不能放在片外？

集成在芯片内部的缓存称为片内缓存，放在在芯片外部的缓存称为片外缓存。开始由于芯片工艺的限制，片内缓存不可能很大，不然芯片会非常大，因此 L2 / L3 缓存都是设计在板子上，而不是在芯片内的。后来，随着芯片制作工艺的提升，L2 / L3 才逐渐集成到 CPU 芯片内部。片内缓存优于片外缓存的主要原因如下：

- 原因一：片内缓存物理距离更短：片内缓存与取指令单元和取数据单元的物理距离更短，延迟更小，访问速度更快。
- 原因二：片内缓存不占用系统总线：片内缓存使用独立的CPU片内总线，可以减轻系统总线的负担。
5）多级cache替换策略

 多级cache的替换策略设计有很多种方式，可以根据一个cache的内容，是否同时存在于其他级cache来分类，即Cache inclusion policy。如果低级别cache中的所有cache line，也存在于较高级别cache中，则称高级别cache包含（inclusive）低级别cache。如果高级别的cache，仅包含低级别cache不存在的cache line，则称高级别的cache不包含（exclusive）较低级别的cache。如果高级cache的内容，既不严格包含，也不排除低级cache，则称为非包含非排他（non-inclusive non-exclusive，NINE）cache。

 Inclusive Policy cache：CPU对数据A进行读取操作时，若A在L1 cache中找到，则从L1 cache中读取数据，并返回给CPU。若A未在L1 cache中找到，但存在L2 cache中，则从L2 cache中提取该数据所在cache line，并将其填充到L1中。若一个cache line从L1 cache中被逐出，则L2 cache不做操作。若在L1或L2中均未找到想要的数据，则从L3中寻找，找到后会填充到L2、L1，若未在L3中找到，则从DDR中以cache line为单位取出该数据，并将其填充到L1、L2、L3中。若有来自L2的逐出，L2会向L1发送invalidation，以便遵循“Inclusive Policy”。

为了保持inclusion，需要满足：

- 无论set的数量多少，L2 way的数量都必须大于或等于 L1 way的数量。
- 无论 L2 way的数量多少，L2 set的数量必须大于或等于 L1 set的数量。
Exclusive Policy cache：CPU对数据A进行读取操作时，若A在L1中找到，则从 L1 中读取数据并返回给CPU。若未在L1中找到，但存在L2中，则将该A数据所在的cache line从L2移动到L1。若一个cache line从L1中被逐出，则被逐出的cache line将被放置到L2中。这是L2 填充的唯一方式。若在L1、L2中都未找到A数据，则将其从L3中取出，并填充到L1，若在L3中也未找到，则在主存中取出，并填充到L1中。

NINE（non-inclusive non-exclusive）Policy：CPU对数据A进行读取操作时，若A在L1中找到，则从L1中读取数据并返回给CPU。若在L1中未找到，但存在L2中，则从L2中提取（复制）该数据对应的cache line，并放置到L1中。若一个cache line从L1中被逐出，则L2不做操作，这与inclusive policy相同。若在L1、L2中都没找到该A数据，则从L3中查找，若L3中找到该数据，将该数据所在cache line取出，并填充到L1、L2，若L3中没找到，从主存中取出该数据对应的cache line，填充到L1、L2、L3。

三种数据关系策略的比较：

- inclusive policy的优点：在每个处理器都有私有cache 时，如果存在cache miss，则检查其他处理器私有cache，以查找该cache line。如果L2 cache包含L1 cache，并且在L1 cache中miss，则不需要再大面积搜索L2 cache。这意味着与exclusive cache和 NINE cache相比，inclusive cache的miss 延迟更短。
- inclusive policy的缺点：cache的内存容量由L3 cache决定的。exclusive cache的容量是层次结构中，所有cache的总容量。如果L3 cache较小，则在inclusive cache中浪费的cache容量更多。
- 尽管exclusive cache具有更多的内存容量，但相比NINE cache，它需要占用更多的带宽，因为L1 cache 逐出时，会将逐出数据填充到L2、L3 cache。

### 3， cache的工作原理

#### 3.1 cache的存储单元

Cache的存储部分是由SRAM实现的，cache的存储单元就是SRAM的存储单元，SRAM存储单元由6个三极管组成，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3132053ce2a8.jpg)

SRAM的存储单元写入“1”的过程如下（写入数据“0”的过程类似）：

- 先将某一组地址值输入到行、列[译码器](https://link.zhihu.com/?target=https%3A//baike.baidu.com/item/%25E8%25AF%2591%25E7%25A0%2581%25E5%2599%25A8%3FfromModule%3Dlemma_inlink)中，选中特定的单元，如上图所示。
- 使写使能信号WE有效，将要写入的数据“1”，通过写入电路变成“1”和“0”后，分别加到选中单元的两条位线BL、BLB上。
- 选中单元的WL=1，晶体管N6、N5打开，把BL、BLB上的信号分别送到Q、QB点，从而使Q=1，QB=0，这样数据“1”就被锁存在晶体管P2、P3、N3、N4构成的[锁存器](https://link.zhihu.com/?target=https%3A//baike.baidu.com/item/%25E9%2594%2581%25E5%25AD%2598%25E5%2599%25A8%3FfromModule%3Dlemma_inlink)中。
读“1”的过程如下（读取数据“0”的过程类似）：

- 通过译码器选中某列位线对BL、BLB进行预充电到电源电压VDD。
- 预充电结束后，再通过行译码器选中某行，则某一[存储单元](https://link.zhihu.com/?target=https%3A//baike.baidu.com/item/%25E5%25AD%2598%25E5%2582%25A8%25E5%258D%2595%25E5%2585%2583%3FfromModule%3Dlemma_inlink)被选中。
- 由于其中存放的是“1”，则WL=1、Q=1、QB=0。晶体管N4、N5导通，有电流经N4、N5到地，从而使BLB电位下降，BL、BLB间电位产生电压差，当电压差达到一定值后打开灵敏度放大器，对电压进行放大，再送到输出电路，读出数据。

#### 3.2 高速缓存的映射方式

CPU访问DDR前，都会先对cache进行操作，无论对Cache数据检查、读取还是写入，CPU都需要知道访问的内存数据，对应于Cache上的哪个位置，这就是内存地址与 Cache 地址的映射问题。由于内存块和缓存块的大小分别是固定的，所以在映射的过程中，我们只需要考虑 “内存块索引 - 缓存块索引” 之间的映射关系，而具体访问的是块内的哪一个字，则使用相同的偏移在块中寻找。

目前，主要有 3 种映射方案：

- 直接相联映射（Direct Mapped Cache）： 固定的映射关系；
- 全相联映射（Fully Associative Cache）： 灵活的映射关系；
- 组相联映射（N-way Set Associative Cache）： 前两种方案的折中方法。
接下来，我们分别以内存有32个内存块，CPU Cache有8个缓存块为例讲解这3种映射方案。

1） 直接相联映射

直接相联映射的策略：在内存块和缓存块之间建立起固定的映射关系，一个内存块总是映射到同一个缓存块上。直接映射是三种映射方式中最简单的。 我们通过以下图来了解直接相联映射，其中cache块跟内存块大小相等，大小为cache line。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_162722a9a936.jpg)

直接相联映射具体方式如下：

- 将内存块索引对 Cache 块个数取模，得到固定的映射位置。例如11号内存块映射的位置就是11 % 8 = 3，对应3号Cache块。
- 取模后，多个内存块会映射到同一个缓存块上，这会产生块冲突，所以需要在Cache块上，增加一个组标记（TAG），标记当前缓存块存储的是哪一个内存块的数据。其实，组标记就是内存块索引的高位，而 Cache 块索引就是内存块索引的低4位（8个字块需要4位）；
- 由于初始状态Cache块中的数据是空的，也是无效的。为了标识Cache块中的数据，是否已经从内存中读取，需要在Cache块上增加一个有效位（Valid bit）。如果有效位为1，则CPU可以直接读取 Cache 块上的内容，否则需要先从内存读取内存块，并填入Cache块，再将有效位改为 1。
2） 全相联映射

对于直接映射存在2个问题：

- 问题1，缓存利用不充分：每个内存块只能映射到固定的位置上，即使Cache上有空闲位置也不会使用。
- 问题2，块冲突率高：直接映射会频繁出现块冲突，影响缓存命中率。
为了改进直接相联映射的缺点，全相联映射的策略是：允许内存块映射到任何一个Cache块上。这种方式能够充分利用 Cache 的空间，块冲突率也更低，但是所需要的电路结构物更复杂，成本更高。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cca9e6a9446e.jpg)

全相联映射具体方式如下：

- 当Cache块上有空闲位置时，使用空闲位置。
- 当Cache被占满时，则替换出一个旧的块腾出空闲位置。
- 由于一个Cache块会映射所有内存块，因此组标记TAG需要扩大到与主内存块索引相同的位数，而且映射的过程需要沿着Cache从头到尾匹配Cache块的TAG标记。
3） 组相联映射

组相联映射结合了直接相联映射和全相联映射的优点，组相联映射的策略是：将Cache分为多组，每个内存块固定映射到一个分组中，又允许映射到组内的任意Cache块。显然，组相联的分组为1时，就等于全相联映射，而分组等于Cache块个数时，就等于直接映射。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7a27f256b50.jpg)

组相联映射
#### 3.3 cache的基本结构

 Cache的基本结构如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b995524d5b95.jpg)

cache的基本结构

- 地址：以32位为例，CPU访问cache时的地址编码，分为3各部分：偏移量（offset）域、索引（index）域和标记（tag）域。
- 高速缓存行：高速缓存中最小的访问单元，包含一小段DDR中的数据。常见的高速缓存行大小时32字节或64字节。
- 索引（index）：高速缓存地址编码的一部分，用于索引和查找地址在高速缓存行的哪一组中。
- 组（set）：由相同索引的高速缓存行组成。
- 路（way）：在组相联的高速缓存中，高速缓存分成大小相同的几个块。如上每一路由四个缓存行组成。
- 标记（tag）：高速缓存地址编码的一部分，通常是高速缓存地址的高位部分，用于盘点高速缓存行中的数据地址，是否和处理器寻找的地址一致。
- 偏移量（offset）：高速缓存行中的偏移量。CPU可以按字节或字来寻址高速缓存行的内容。
CPU访问高速缓存的流程如下：

- CPU对访问高速缓存时的地址进行编码。根据索引域来查找组。对于组相联的高速缓存，一个组里有多个缓存行的候选者。比如上图，有一个4路组相联的高速缓存，一个组里有4个高速缓存行候选者。
- 在4个高速缓存行候选者中，通过组标记域进行比对。若组标记域相同则说明命中高速缓存行。
- 通过偏移量域来寻址高速缓存行对应的数据。

#### 3.4 cache的体系结构

 高速缓存可以设计成，通过虚拟地址或者物理地址来访问，这在处理器设计时就确定下来了。高速缓存可以分成如下3类：

- VIVT（Virtual Index Virtual Tag）：使用虚拟地址的索引域和虚拟地址的标记域，相当于虚拟高速缓存。
- PIPT（Physical Index Physical Tag）：使用物理地址的索引域和物理地址的标记域，相当于物理高速缓存。
- VIPT（Virtual Index Physical Tag）：使用虚拟地址的索引域和物理地址的标记域。
在当前ARM架构中，L1 cache都是VIPT的，也就是当有一个虚拟地址送进来，MMU在开始进行地址翻译的时候，Virtual Index就可以去L1 cache中查询了，MMU查询和L1 cache的index查询是同时进行的。如果L1 Miss了，则再去查询L2，L2还找不到则再去查询L3。 注意在ARM架构中，仅仅L1是VIPT，L2和L3都是PIPT。我们看看VIPT的工作过程：

CPU输出的虚拟地址会同时发送到TLB和高速缓存。TLB是一个用于存储虚拟地址到物理地址的转换的小缓存，处理器先使用有效页帧号（Effective Page Number，EPN），在TLB中查找最终的实际页帧号（Real Page Number，RPN）。如果期间发生TLB未命中（TLB miss），将会带来一些列严重的系统惩罚，处理器需要查询页表。假设发生TLB命中（TLB hit），就会很快获得合适的RPN，并得到相应的物理地址。

同时，处理器通过高速缓存编码地址的索引（index）域，可以很快找到高速缓存行对应的组。但是这里的高速缓存行中的数据，不一定是处理器所需要的，因此有必要进行一些检查，将高速缓存行中存放的标记域和通过虚实地址转换得到的物理地址的标记域进行比较，如果相同并且状态位匹配，就会发生高速缓存命中，处理器通过字节选择与对齐（byte select and align）部件，就可以获取所需要的数据。如果发生高速缓存未命中，处理器需要用物理地址进一步访问主存储器，来获得最终的数据，数据也会填充到相应的高速缓存行中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_23211d9d30c5.jpg)

VIPT高速缓存体系结构
#### 3.5 cache的替换策略

在使用直接相联映射的 Cache 中，由于每个主内存块都与某个Cache块有直接映射关系，因此不存在替换策略。而使用全相联映射或组相联映射的Cache，由于主内存块与Cache块没有固定的映射关系，当新的内存块需要加载到Cache中时，且Cache块没有空闲位置，则需要替换到Cache块上的数据。此时就存在替换策略的问题。

常见cache中数据的替换策略如下，cache中数据的替换以cache line为单位：

- 随机法： 使用一个随机数生成器，随机地选择要被替换的 Cache 块。优点是实现简单，缺点是没有利用 “局部性原理”，无法提高缓存命中率。
- FIFO先进先出法： 记录各个Cache块的加载事件，最早调入的块最先被替换。缺点同样是没有利用 “局部性原理”，无法提高缓存命中率。
- LRU最近最少使用法： 记录各个Cache块的使用情况，最近最少使用的块最先被替换。这种方法相对比较复杂，也有类似的简化方法，即记录各个块最近一次使用时间，最久未访问的最先被替换。与前 2 种策略相比，LRU策略利用了 “局部性原理”，平均缓存命中率更高。
多级cache的替换策略，在上面的“多级cache替换策略”里说明了常见的三种替换策略：Inclusive Policy cache，Exclusive Policy cache，NINE（non-inclusive non-exclusive）Policy。接下来以DynamIQ架构中的cortex-A710的L1、L2 cache的替换策略为例，做分析。

我们先看一下DynamIQ架构中的cache中新增的几个概念：

(1) Strictly inclusive: 对应Inclusive Policy cache，所有存在于L1 cache的数据，必然也存在L2 cache中。

(2) Weakly inclusive: 对应NINE（non-inclusive non-exclusive）Policy，当miss的时候，数据会被同时缓存到L1和L2，但在之后，L2中的数据可能会被替换。

(3) Fully exclusive: 对应Exclusive Policy cache，当miss的时候，数据只会缓存到L1。L1中的数据会逐出到L2。

其实inclusive/exclusive属性描述的是 L1和L2之间的替换策略，这部分是硬件定死的，软件不可更改。

根据ARMV9 cortex-A710 trm手册中的描述，查看该core的cache类型如下：

- L1 I-cache和L2之间是 weakly inclusive的，当发生I-cache发生miss时，数据缓存到L1 I-cache的时候，也会被缓存到L2 Cache中，当L2 Cache被替换时，L1 I- cache不会被替换。
- L1 D-cache和L2之间是 strictly inclusive的，当发生D-cache发生miss时，数据缓存到L1 D-cache的时候，也会被缓存到L2 Cache中，当L2 Cache被替换时，L1 D-cache也会跟着被替换。
dynamIQ 架构中 L1和L2之间的替换策略，是由core的inclusive/exclusive的硬件特性决定的，软无法更改。core cache之间的替换策略，是由SCU(或DSU)执行的MESI协议中定义的，软件也无法更改。多cluster之间的缓存一致性，由 CCI/CMN 来执行维护，没有使用MESI协议。在L1 data cache TAG中，有记录MESI相关比特。将一个core内的cache看做是一个整体，core与core之间的缓存一致性，就由DSU执行MESI协议来维护，因此L1D遵从MESI协议。对于L1I cache来说，都是只读的，cpu不会改写L1I中的数据，所以也就不需要硬件维护多核之间缓存的不一致。

#### 3.6 高速缓存分配策略

 cache的分配策略是指我们什么情况下应该为数据分配cache line。cache分配策略分为读和写两种情况。

读分配(read allocation)是指当CPU读数据时，发生cache缺失，这种情况下都会分配一个cache line，缓存从主存读取的数据。默认情况下，cache都支持读分配。写分配(write allocation)是指当CPU写数据发生cache缺失时，才会考虑写分配策略。当我们不支持写分配的情况下，写指令只会更新主存数据，然后就结束了。当支持写分配的时候，我们首先从主存中加载数据到cache line中（相当于先做个读分配动作），然后会更新cache line中的数据。

1）写操作时，cache更新策略

 一条存储器读写指令，通过取指、译码、发射和执行等一系列操作之后，会到达LSU（Load Store Unit）。LSU是指令流水线中的一个执行部件，连接指令流水线和高速缓存，包括加载队列（load queue）和存储队列（store queue）。存储器读写指令通过LSU后，会到达L1控制器，L1控制器先发起探测（probe）操作。对于读操作，发起高速缓存读探测操作，并带回数据。对于写操作，发起高速缓存写探测操作。发起写探测操作前，需要准备好待写的高速缓存行。探测操作返回时，会带回数据，存储器写指令获得最终数据，并进行提交操作后，才会将数据写入，这个写入可以采用直写（write through）模式，或者回写（write back）模式。

 在探测过程中，对于写操作，若没有找到相应的高速缓存行，就出现写未命中（write miss）。否则就出现写命中（write bit）。对于写未命中的处理策略时写分配（write allocate），L1控制器将分配一个新的高速缓存行，之后和获取的数据合并，然后写入L1D。

若写未命中，存在两种不同的策略：

- 写分配（write allocate）策略：先把要写的数据加载到高速缓存中，然后修改高速缓存的内容。
- 不写分配（no write allocate）策略：不分配高速缓存，而直接把内容写入内存。
若写命中，存在两种不同的策略：

- 直写模式：进行写操作时，数据同时写入当前的高速缓存，下一级高速缓存，或主存储器中，cache和主存的数据始终保持一致。。直写模式可以降低高速缓存一致性实现的难度，缺点是消耗比较多的总线带宽，性能比回写模式差。
- 回写模式：在进行写操作时，数据直接写入当前高速缓存，而不会继续传递，当该高速缓存被替换出去时，被改写的数据才会更新到下一级高速缓存，或主存中。该策略增加了高速缓存一致性的实现难度，但是可有效减少总线带宽的需求。每个cache line中会有一个bit位记录数据是否被修改过，称之为dirty bit。我们会在数据写到cache中后，将dirty bit置位。主存中的数据只会在cache line被替换或者显式的clean操作时更新。因此，主存中的数据可能是未修改的数据，而修改的数据躺在cache中。cache和主存的数据可能不一致。此模式的优点是，数据写入速度快，因为不需要写存储。缺点是，一旦更新后的数据，未被写入存储时，出现系统掉电的情况，数据将无法找回。
无论是Write-through还是Write-back都可以使用写缺失的两种方式之一。只是通常Write-back采用Write allocate方式，而Write-through采用No-write allocate方式。因为多次写入同一缓存时，Write allocate配合Write-back可以提升性能，而对于Write-through则没有帮助。

2）读操作时，cache更新策略

 对于读操作，若高速缓存命中，那么直接从高速缓存总获取数据。若未命中高速缓存，存在如下两种策略：

- 读分配（read allocate）策略：先把数据加载到高速缓存中，然后将数据返回给CPU。
- 读直通（read through）策略：不经过高速缓存，直接从内存中读取数据。
（平时会分享linux技术干货文章。关注我，可以定期收到相关文章的推送。知乎、微信同名：黑客与摄影师）

参考资料：

(13 条消息) 黑客与摄影师 - 知乎 (zhihu.com)

[多级cache的包含策略（Cache inclusion policy - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/443090974)

[SRAM（静态随机存取存储器）_百度百科 (baidu.com)](https://link.zhihu.com/?target=https%3A//baike.baidu.com/item/SRAM/7705927%3Ffr%3Daladdin)

[我把 CPU 三级缓存的秘密，藏在这 8 张图里 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/584128599)

[(13 条消息) CPU是怎么解决Cache的冲突的？ - 知乎 (zhihu.com)](https://www.zhihu.com/question/434996610/answer/1629810702)

《arm64体系结构编程与实践》