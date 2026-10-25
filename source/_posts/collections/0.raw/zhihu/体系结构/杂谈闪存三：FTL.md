---
title: 杂谈闪存三：FTL
date: "2018-03-24 00:00:00"
updated: "2018-03-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/杂谈闪存三-FTL/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/26944064
---


上文（[杂谈闪存二：NOR和NAND Flash - 知乎专栏](https://zhuanlan.zhihu.com/p/26745577)）提到NAND flash管理的核心FTL（Flash Translation Layer）。事实上几乎所有的应用NAND Flash的设备都必须配备FTL，包括我们经常碰到的SD, eMMC, UFS, SSD等等。通常FTL由这些设备的固件提供实现。我们来深入了解下什么是FTL吧。

### NAND flash的组成

一个典型的Flash芯片由Package, die, plane, block和page组成，如下图：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fd2a12d458ee.jpg)


Package**: 也就是chip即Flash芯片，就是我们经常在M.2的SSD上看到的NAND flash颗粒：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a03b1a290389.jpg)


Die**: 一个NAND颗粒是由一颗或者多颗Die封装在一起而成，这种封装可是平排的，也可以是层叠的。die内部可以通过3D 堆叠技术扩展容量，譬如三星的V-NAND每层容量都有128Gb（16GB），通过3D堆叠技术可以实现最多24层堆叠，这意味着24层堆叠的总容量将达到384GB！就像盖楼房一样：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b6714b5f85cf.jpg)


Die也是可以单独执行命令和返回状态的最小单位。

Plane**: 一个die可以包含几个Plane.

<strong>Block</strong>: 重要的概念，它是擦除操作的最小单位。

<strong>Page</strong>：也很重要，它是写入动作的最小单位。

### FTL

当我们有了块“干净”的Flash，我们第一个想干的事就是写些东西上去，无论我们是写一个byte还是很多东西，必须以page为单位，即写一个byte上去也要写一个page。当我们满意的写了东西上去后，如何修改呢？是不是可以再写一次呢？可惜的是，我们的program操作只能把bit 1改成0，而不能从0改成1. 即我们可以把11110000改成11000000，但不能改成11111111。即有点像逻辑and操作(我们可以通过NAND这个名字联想记忆一下)。那么如何把0改回1呢？这就要靠擦除操作了，但是擦除操作只能在block的上面操作，如果我们把整块block上的所有page都读回RAM，改动后再擦除再写回去(也叫read-modify-write)，似乎问题就完美解决了。但是别忘了，我们前文中提到，NAND flash的寿命是由其擦写次数决定的(P/E数 (Program/Erase Count)来衡量的)，频繁的擦除慢慢的会产生坏块。那么我们如何才能平衡整块flash的整体擦写次数呢？这就要我们的FTL登场了。

<strong>1。FTL原理</strong>

FTL简单来说就是系统维护了一个逻辑Block地址（LBA，logical block addresses ）和物理Block地址（PBA, physical block addresses）的对应关系, 如图：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_53a640d519ee.jpg)


有了这层映射关系，我们需要修改时就不需要改动原来的物理块，只需要标记原块为废块，同时找一个没用的新物理块对应到原来的逻辑块上就好了。问题解决了！实际情况比这个稍微复杂些，我们需要解决以下问题：

A．** LBA和PBA究竟是对应page还是block？

<strong>B．</strong> 如何做到寿命均衡?

<strong>C．</strong> 废块何时回收？

<strong>D．</strong> 这个逻辑对应表存储到哪里？

<strong>2。LBA/PBA的颗粒度问题</strong>

如果我们把LBA和PBA都设置成page大小，这也叫做page-level mapping，这和我们写入颗粒一致，很灵活。但这么小的粒度会带来一个问题：逻辑对应表太大！想象一下，我们有个64GB的Die，每个page只有4KB，我们的对应表需要64*1024*1024 * 4 /4 = 64MB！这个绝对不能接受。那么按照block，也就是block-level mapping呢? 会不会好些呢？至少占用空间好了很多，但是因为写入时不清楚page情况，往往要整块擦除，效能会大大下降。有没有更好的办法呢？实际使用中常用的是log-block mapping,它从我们现代的log文件系统中学到经验，也充分利用了page和block的不同特性。它比较复杂，我们这里按下不表。

<strong>3。如何做到寿命均衡（Wear Levelling）</strong>

LBA/PBA的映射本身会对寿命均衡产生正面影响。就如我们SD卡上的FAT文件系统，文件分配表会被经常修改，但由于修改的是逻辑块，我们可以让每次物理块不同而避免经常擦写相同的物理块，这本身就保证不会有物理块被经常擦写。但是有一种情况它没有办法处理，即冷的数据块（cold block），它们被写入后没有更改，就一直占据某些物理块，而这些物理块寿命还很长，而别的热的块却在飞速损耗中。这种情况怎么办呢？我们只有在合适的时机帮它们换个位置了，如何选择这个时机很重要，而且这个搬家动作本身也会损耗寿命本身。这些策略也是各个FTL算法的精华了。

<strong>4。垃圾回收</strong>

废块需要找时机回收，这就需要垃圾回收（GC，Garbage Collection）机制。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0e4c3307e13a.jpg)


现在到处都会碰到GC，各种高级语言都在炫耀自己有GC，不像C++/C那样要手动回收内存。这里的GC是指回收废块，但是时机非常重要，谁都不希望看到一个存盘后，SSD硬盘固件发现没有干净的块可用，开始整盘GC，就像开始了一个没有进度条的磁盘整理，系统被完全卡死了。聪明的固件往往未雨绸缪，在我们不知不觉下在后台悄悄做垃圾回收，不少固件还同时进行Wear Levelling。

5。LBA/PBA表存储在哪里

这个表随时可以变化，我们把它存储在哪里呢？是不是也找个page存起来呢？事实上，在大部分的NAND Flash里，还有些空闲块，我们叫它OP(Over Provisioning)。如下图:

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3e83f396dce9.jpg)


这些空闲的块可以极大的帮助我们改善NAND flash的性能，它可以：

A．** 坏块处理。发现坏块，这些后备的可以立刻顶上，因为有映射机制，上层软件完全感受不到。

<strong>B．</strong> 存储LBA/PBA表

<strong>C．</strong> 给GC和Wear Levelling留下极大的腾挪空间。

<strong>D</strong> . 减少写入放大（Write Amplification）

事实上，现在几乎所有主流SSD等NAND die上都有OP。譬如我们拿到标称容量240GB的SSD，实际空间可能有256GB甚至更高（一般>7.37%），只不过这些多余的空间我们用不到，感受不到，它完全被SSD固件藏做私用而已。

### 尾声

现在能生产NAND芯片的厂家在Wikipedia上能查出11家，而能生产主控芯片和固件的就四家。他们各自的绝活都在FTL中的各种调优上，再加上Trim等等特性，这也就决定了SSD硬盘性能的好坏。

下一篇我们会介绍现有各种NAND Flash存储媒体的历史和区别，以及接口的不同，如SATA，M.2,U.2,NVMe等等。敬请关注。

<strong>其他闪存相关文章：</strong>

[](https://zhuanlan.zhihu.com/p/26652622)

[](https://zhuanlan.zhihu.com/p/26745577)

[](https://zhuanlan.zhihu.com/p/26944064)

[](https://zhuanlan.zhihu.com/p/27068849)

[](https://zhuanlan.zhihu.com/p/27328255)

[](https://zhuanlan.zhihu.com/p/27343166)

[](https://zhuanlan.zhihu.com/p/27380955)

[](https://zhuanlan.zhihu.com/p/27294558)

[](https://zhuanlan.zhihu.com/p/34858149)

[](https://zhuanlan.zhihu.com/p/34889064#comments)

<strong>硬盘相关文章：</strong>

[](https://zhuanlan.zhihu.com/p/32907254)

[](https://zhuanlan.zhihu.com/p/32915834)

欢迎大家关注本专栏和用微信扫描下方二维码加入微信公众号"UEFIBlog"，在那里有最新的文章。同时欢迎大家给本专栏和公众号投稿！

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_431421bffde3.jpg)

用微信扫描二维码加入UEFIBlog公众号
