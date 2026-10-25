---
title: 聊一聊DDR（7）—— 内存交织（memory interleaving）
date: "2023-07-30 00:00:00"
updated: "2023-07-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/聊一聊DDR(7)——-内存交织(memory-interleaving)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/646850159
---


<strong>“</strong> Memory Interleaving可以翻译为内存交织，即通过在不同内存上的交错访问来提高内存访问性能的技术。<strong>”</strong>**

​在之前的文章[聊一聊DDR（7）—— Turnaround时间和对性能的影响](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167805%26idx%3D1%26sn%3D25ef6e6e52362de09d47ecba8d11475b%26chksm%3Df08a00ddc7fd89cb42865768a7247064b8fbe97a0e78b19beb93bc2dd587e784e8d071f80318%23rd)中，我们曾经了解过DDR的turnaround时间，也就是DRAM介质在操作的前后都有一段时间是无法进行读写操作的。

通过Memory Interleaving 和预取技术，可以在两个方面降低相关的影响，提高内存访问的性能。

预取技术之前的文章中有过介绍，链接如下：

[CPU架构-Hardware Prefetcher - 1](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167698%26idx%3D1%26sn%3Db6ce0c244cbedfd7563cbad377ad77ec%26chksm%3Df08a00b2c7fd89a411b744769f9df5c235d0f4a458bf5e0718237a4cf6855341b92d343bdb94%23rd)

[CPU架构-Hardware Prefetcher - 2](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167705%26idx%3D1%26sn%3D04c1015c56b8677c980eac4f8bb6f9d7%26chksm%3Df08a00b9c7fd89af1f985e9f443b273a82daa29ce1df52bd8b6f592437e43ccae300ea842406%23rd)
[CPU架构-Hardware Prefetcher - 3](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167876%26idx%3D1%26sn%3Db66aeb80c22dc5036ba809d3b74a4b5e%26chksm%3Df08a0364c7fd8a727ed52f1d98676200f128bebaf19969aafa5a21e9679bccba13fb0a70e863%23rd)

这篇文章我们来聊一聊memory interleaving，主要分为以下两个部分：

内存交织的原因**<strong>内存插法的影响</strong>**

### 内存交织的原因

​在开篇引用的文章中介绍了turnaround时间的问题。为解决这个问题，很自然地想到了统筹规划和流水线作业，如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5c6112f5a643.jpg)

可以看到上图中，红色的区块表示数据输出，在时间这个维度上看就是连续的，不会被介质读写本身的turnaround时间所限制。

在上面的文章中，我们把Bank比作一个excel表格的tab，每次数据读写，都会将对应的一行数据，读取到sense amplifier当中。为了避免数据不可用时间，在bank级别的interleaving如下面的动图所示。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_00bd79cb95c0.jpg)

那么，是不是​只在bank级别去做interleave形成这种流水线就可以了？

答案是否定的，像我们之前文章中提到的那样，turnaround时间不仅仅发生在底层的bank级别，也会发生在更高的层级，例如rank之间。

而在更高的层级上，interleaving可以允许多个DIMM的并发访问，多个独立的通道（channel）提高了数据传输速率​。在多通道模式下运行时，延迟也会降低​。

内存控制器以交替模式在DIMM之间分配数据，允许内存控制器访问每个DIMM来获取较小的数据位，而不是访问单个DIMM来获取整个数据块，这为内存控制器提供了更多带宽用于跨通道访问相同数量的数据，而不是遍历单个通道将所有数据​存储到单个DIMM中。

因此内存访问需要分布在多个内存控制器上，多个channel上，多个rank上，多个bank上，这样交织的访问，就是memory interleaving的两个主要原因和方式。
下图是Intel Sapphire Rapid这一代​的CPU，每个CPU有四个内存控制器，每个内存控制器有两个channel，每个channel有2根DIMM。通过interleaving我们可以享受到四个内存控制器，两个channel的并行数据，因此单个​内存访问的最大带宽理论值即为：
4800（MT/s）*64（bit）/8（bit/Byte）= 307，200 MBps

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_256040db3a66.jpg)

### 内存插法的影响​

由于memory interleaving在多个DIMM的并发访问，多个独立的内存通道提高了​数据传输速率。

如上所述，Intel Sapphire Rapid平台，一个socket有四个内存控制器，每个内存控制器有两个channel，每个channel可以插两个​内存条。

考虑到memory interleaving，内存条的插法有什么讲究么？

在内存通道的interleaving中会有interleave group的形成，而在一个interleave group中会首先检查同样容量，同样rank数目的最大内存通道数，这个最大通道数的区域会组成一个​interleave group。

​而不平衡的内存插法会在第一次的遍历之后剩下一部分DIMM或者内存容量。剩下的​内存容量，会按照同样的方法重复进行interleave的分组。

以此类推可能会得到不同interleave group，而每个group内部的通道数，capacity都可能存在的差异，因此​内存访问的性能就会出现不同的结果。

所以出于性能考虑，​有以下建议：

-  所有的内存通道建议有同样的内存容量和同样的rank数量。

-  在一个处理器上的所有内存通道建议有同样的内存配置。

结语**，Interleaving在细节方面还有很多的算法可以考虑，这篇文章中介绍了引入interleave 机制的两个主要原因，并且介绍了不同的插法带来的interleave group的变化，进一步得出内存插法的建议，以避免非平衡插法对性能带来的影响。

​相关的内存介绍链接如下：

[聊一聊DDR（1）-DDR5基本介绍](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167670%26idx%3D1%26sn%3D7539525230bb08fff4dad7019385210d%26chksm%3Df08a0056c7fd8940824a68774b7a6f18eb952b8758f6eae590b87f28532787f9603059bd0596%23rd)

[聊一聊DDR（2）-DRAM基本介绍](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167677%26idx%3D1%26sn%3Db0eb27e3588b1f9939ea1a7f4cf59aed%26chksm%3Df08a005dc7fd894be281e506efaad0034396fc65034cd4542b72d914c5ab01ff571ae0558c15%23rd)

[聊一聊DDR（3）- 介绍一下读写数据的过程](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167686%26idx%3D1%26sn%3D6bab400c929172f5e6f2ded2ec0bfa75%26chksm%3Df08a00a6c7fd89b09a74aba02ee5e4ce8e179ab5d7af9382c5f6dc9d186d6b00d76a8a37a8dd%23rd)

[聊一聊DDR（4）- 鱼的记忆 之 refresh](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167692%26idx%3D1%26sn%3D3e8eaa9d2f44c5659adcd19abed9c165%26chksm%3Df08a00acc7fd89ba20df38454af4b5d846ae1f862f39920a2641e715a6d38bc359fcb05776c6%23rd)

[聊一聊DDR（5）- On die ECC](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167720%26idx%3D1%26sn%3D27a0fdd45f48a79037441e75a14c2e76%26chksm%3Df08a0088c7fd899eb24d7492cd86eec2737849897c12846660fd348aa5169558cb85b7b8d04f%23rd)

[聊一聊DDR（6）—— 性能测试](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167739%26idx%3D1%26sn%3Df49ec5e22e8ae4c93c31d56ebb22aaee%26chksm%3Df08a009bc7fd898dcee4337aaaa1fccda351198f2d52a9ad70855518db568d39e978432805ef%23rd)

[聊一聊DDR（7）—— Turnaround时间和对性能的影响](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650167805%26idx%3D1%26sn%3D25ef6e6e52362de09d47ecba8d11475b%26chksm%3Df08a00ddc7fd89cb42865768a7247064b8fbe97a0e78b19beb93bc2dd587e784e8d071f80318%23rd)
