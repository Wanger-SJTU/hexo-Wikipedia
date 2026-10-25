---
title: "显存为什么不能当内存使？内存、Cache和Cache一致性"
date: "2021-05-08 00:00:00"
updated: "2021-05-08 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/编程向/显存为什么不能当内存使-内存、Cache和Cache一致性/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/63494668"
---


外置显卡（独显）动辄8G以上显存，很多朋友都希望能够“借”一些给CPU当普通内存用。这在某种程度上是十分容易做到的。显存基本上都会被映射到PCI的mmio地址空间中，一个简单的驱动就可以将它们映射到普通的地址空间中，但如果在其上运行任何banchmark软件你就会发现性能相当差。这固然有GDDR和PC DDR设计初衷不同导致的问题，关于这部分以及之前[DDR4的文章](https://zhuanlan.zhihu.com/p/62234511)末尾部分知友的提问“为什么显存都DDR5了，内存还DDR4”，我后续还有一篇GDDR vs DDR vs HBM的文章来解释，敬请期待，这里就按下不表了。如果我们忽略GDDR的不同，一个进一步的问题就是，为什么不能通过PCIe来扩展普通内存？

主要的原因在于Cache。前一阵举行的“Interconnect Day 2019”，Intel宣布了一系列新技术。其中CXL（Compute Express Link）看起来并不显眼，但却是解决这个问题的关键：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_c52fcab756fd.jpg)

CXL实际上有更大的野心：解决CPU和设备、设备和设备之间的memory鸿沟。普通电脑用户也许偶尔会想到用用显存，用不了也无伤大雅，这个需求并不强烈。但服务器用户有巨大的内存池和数量庞大的基于PCIe运算加速器，每个上面都有很大的内存。内存的分割已经造成巨大的浪费、不便和性能下降。CXL就是为解决这个问题而诞生，<strong>我迫不及待得想要给大家介绍这种新技术，但是为了更好的理解它，必须要有些预备知识</strong>，也是为什么偷显存性能低的原因：显存不能保证被cache，或者说无法保证cache的一致性。感谢 @木头龙

 十年如一日的催稿，我也利用这次机会补上cache系列中缺失的一块拼图，来介绍一下cache一致性的问题。Cache的基础知识可以看这篇文章：

[](https://zhuanlan.zhihu.com/p/31859105)

### 什么是Cache一致性？

Cache Memory简称Cache，是存储器子系统的组成部分，存放着程序经常使用的指令和数据，这就是Cache的传统定义。在最新的X86 CPU里，cache分为L1、L2和L3，L1一般还分成指令和数据两块，L3有时也被称作LLC（Last Level Cache）。Cache的各个层次之间内容可以是相互包含的（Inclusive），也可以是排斥的（Exclusive）。Inclusive和exclusive cache各有优缺点，比较复杂，以后单独讲，<strong>这里提到它们是因为它们和Cache一致性有一定关系，为了简化起见，这里所有相关性都被忽略，将来讲到Cache层级（Hierarchy）再来回顾</strong>。

CPU里面L3/LLC实际上被切成很多小片，每个Core对应一个小片：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_71a6b2691203.jpg)

Haswell-EP这些小片在Ring bus上都有个Ring stop来连接，Ring bus和Ring bus之间的高速队列将这些L3小片整合在一起，形成一个虚拟的大一统L3。当然在Mesh network后不再有Ring bus，但L3的小片还是存在。我们来看统一后的两路情况：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_6122baee56b5.jpg)

如果我们不讨论Cache的层级，可以化简成这样：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_d9fa0cf578fd.jpg)

假设我用红框标出的内存已经被Socket1/Node0和Socket2/Node1访问过了，它的部分数据已经被它们分别cache了。现在socket 1上的一个程序P1改写了一点这些内存中的内容，socket2上的另一个程序P2也要用这段内存。P1的改写和P2的读取如果都仅仅发生在各自的Cache中，就不能保证数据的全局一致性。<strong>换句话说就是在一个多处理器系统中，Cache们和内存池可能对同一份数据有多份副本，如何保证这些副本的一致性（Coherency）是个必须严肃对待的问题</strong>。

我们可以纯软件来处理这个问题，利用cache操作指令，但开销巨大十分复杂，而且操作系统的内存模型就需要全部改变，这对X86体系甚至绝大多数体系都是不能接受的。所以绝大多数计算机体系都是靠硬件来完成Cache Coherency的，硬件会自动保证各个副本的一致性，不需要软件操心。那么硬件是如何做到的呢？又有哪些弊病呢？

### Cache一致性模型

X86、ARM和Power系列的Cache Coherency的原始模型都出自MESI protocol(参考资料2)。在MESI协议中，每个Cache Line（x86中是64 bytes）都有MESI四种状态：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_a6efe00d76dc.jpg)

 MESI之间的转换可以表示为有限状态机的描述形态：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_ff57ae5a064f.jpg)

我并不打算相信介绍各个状态及它们之间的转换，对此有兴趣可以阅读参考资料2和其中的链接。

Intel、AMD和ARM都不是简简单单照搬MESI模型，而是在其上各有扩展，<strong>并结合一定的Directory来减小它带来的副作用</strong>。Intel的模型叫做MESIF，加了个Forward状态；AMD的模型叫做MOESI，加了个Owner状态。需要特别说明的是，即使同一个CPU，不同Cache层级会有不同的内存模型，这和Inclusive和exclusive密切相关，以后我们再来看有没有机会revisit这点。

### Cache一致性发生在哪里？

Cache Line实际上是加了几个bits来表示这些状态。有了这些状态，那么是谁在管理这些状态，各个Cache Line的副本又是谁来同步的呢？在Intel CPU中，这就要引入两个新朋友：HA和CA。

Home Agent(HA)，在内存控制器端；Cache Agent(CA)，在L3 Cache端。他们都在Ring bus上监听和发送snoop消息。这种模型叫做Bus snooping模型，与之相对的还有Directory模型。Snoop消息会在QPI总线上广播，会造成很大的带宽消耗，为了减小这种带宽消耗，如何snoop有很多讲究，在参考资料1里面有介绍Intel的两种snoop的方式：Home Snoop和Source Snoop。它们的主要区别在于谁主导Snoop消息的发送，HA主导叫做Home Snoop,CA主导叫做Source Snoop。一个跨socket/node的Home Snoop例子：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_160a289fad62.jpg)

### 结语

Intel每一代都在优化Snoop模型，有许多新的机制被引入，并结合Directory，来减小整体的overhead。尽管如此，snoop消耗的QPI带宽依然很高，这在8路变成16路甚至32路时会占据大量带宽，在很多情况下会让更多路变大得不偿失。

现在我们回头看看PCIe为什么不能够被用作真正的内存。因为PCIe和其他所有的设备一样，他们的memory不能被CPU cache。那么为什么不能被Cache呢？因为无法保证Cache一致性。

如前言所述，PCIe内部的memory的割裂性在服务器领域造成了很大问题，CXL的引入为解决这个问题提供了技术手段。加以时日，我相信普通的台式机也可以用上这种技术。关于CXL的介绍，将在下一篇文章中。

### 后记

评论区一些同学的提问可以看出大家还有不少疑惑，我摘出一些典型的问题：

<strong>Q</strong>： @张輿

 @daemoneye

 PS4只有显存，为啥可以当内存？

<strong>A</strong>: PS4是只有GDDR5，但它是直接连接APU，并不在PCIe后面。GDDR高带宽、高并发，但延迟较高。PS4选择它是为了PS4里面app很特殊，全是游戏，和GPU需求近似。本文并不是说GDDR不能当内存，而是说<strong>显卡的</strong>显存（尽管也是GDDR）不能当内存，重点在显卡这里。GDDR vs DDR的事我们今后再讲。

当然这和本文无关，本文主要目标不是GDDR，而是在PCIe后面的显存，甚至其他类型的内存，如NvRAM等等，他们的cache一致性。

<strong>Q</strong>: @齐河一家

 显存延迟高，被cpu调用就要存储速度一致性，这样影响性能，如果反过来，在内存带宽不是瓶颈的情况下，如果gpu占用显存，虽然内存带宽不如显存但他延迟小，所以[https://b23.tv/av16369376](https://link.zhihu.com/?target=https%3A//b23.tv/av16369376)早期我做的b站上1063爆显存测试上两者实际区别不大，那么我有一个小疑问，gpu调用内存要求显存与内存带宽延迟一致性吗？(从测试结果看不要求)

<strong>A:</strong> 所谓延迟一致性说法不严谨。GPU可以通过DMA调用内存，甚至可以访问cache。DMA是异步的，不需要原地等待，也不在一个时钟域里面，不会拉底自己访问本地GDDR的速度。

CPU访问GPU后的mmio是一般的访问方式，虽然也不是一个时钟域，但是是同步的和阻塞式的，所以需要等待结束。

CPU访问mmio一般是不cache的，意味着这次访问完，下次还要重新fetch。为什么不cache?因为不知道下次访问该地址内容变了没有，因为GPU的内存不能汇报自己的改变，这就是为什么需要CXL。  

<strong>更多BIOS知识尽在BIOS培训云课堂</strong>：

<strong>Cache其他文章：</strong>

[](https://zhuanlan.zhihu.com/p/31422201)

[](https://zhuanlan.zhihu.com/p/31859105)

[](https://zhuanlan.zhihu.com/p/32058808)

欢迎大家关注本专栏和用微信扫描下方二维码加入微信公众号"UEFIBlog"，在那里有最新的文章。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_963b44142a22.jpg)

用微信扫描二维码加入UEFIBlog公众号
### 参考资料：

[1]: https://www.intel.ca/content/dam/doc/white-paper/quick-path-interconnect-introduction-paper.pdf

[2]: https://en.wikipedia.org/wiki/MESI_protocol
