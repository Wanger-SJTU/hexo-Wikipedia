---
title: (1 条消息) Computer Architecture —— Advanced Cache 高级缓存优化（一）
date: "2021-06-29 00:00:00"
updated: "2021-06-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Computer-Architecture-——-Advanced-Cache-高级缓存优化(一)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/384874383
---


大家好，我是老萧。

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_713079a5a96f.jpg)Computer Architecture —— Cache 缓存器介绍 （三）：缓存的基础优化34 赞同 · 0 评论 文章](https://zhuanlan.zhihu.com/p/347651405)

距离上一篇关于缓存的文章，已经过去了大半年了。中间发布了一些其他主题的文章，再加上学业繁忙，关于缓存这块一直没有更新。今天老萧重新整理了一下以前的笔记，准备给大家继续带来关于缓存系统优化的知识点。

### 高级优化方法一：缓存流水线化（Pipelined Cache）

<strong>为什么需要带有流水线的缓存呢？</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_58a4c8349d01.jpg)

图1. 分开来的 Tag Array 和 Data Array通常来说，将数据写入缓存有两步：

- 使用索引（Index）来定位 Tag Array （我们假设 Tag Array 和 Data Array 是分开的）
- 检查有效位 Valid Bit 和标签 Tag；如果 Tag 相同，则写入缓存
上述两个步骤可以同时做，但对时钟周期（Clock Cycle）不是那么的友好，因为一个周期里面硬件需要做的事情更多了，可能会违反 Timing。

如果把这两步用时序分开，那么在 Memory Stage 会需要两个时钟周期：

- 一个周期用来比较标签（Tag）
- 一个周期用来写入数据（如果命中）
所以，为了让效率最大化，我们就可以使用流水线缓存（Pipelined Cache）来对这两个时序进行 Pipelining。

<strong>流水线缓存如何工作？</strong>

为了拆分这两个步骤，设计人员在缓存旁边新添加了一个模块，叫做（<strong>缓存延迟存储缓冲区 Delayed Cache Store Buffer）</strong>。没错，你一定看晕了，为了便于理解，我们可以认为它就是块缓冲区（Buffer），数据将在里面持续等待，直到被写入缓存。

那么数据要等到什么时候呢？答案是当遇到下一个 Store 指令的时候，在其比较标签 Tag 的时候，来自上一个 Store 指令的数据就可以完成第二步：从缓冲区写入缓存。下面的时序图能更直观的展示流水线缓存的工作流程：

        0   1   2   3   4   5   6   7   8  
SW1     CHK WC
SW2         CHK -   -   -   -   WC
INTR1           F   D   E   M   W
SW3                             CHK WC

WC  = Write Cache
CHK = Check Tag

来自 SW2 指令的数据一直停留在缓冲区中，直到第六个周期，下一条指令 SW3 开始了 CHK，这个时候这块 Buffer 检测到了，并把 SW2 的数据写入进了缓存。

<strong>流水线缓存的得与失</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c15abc41699f.jpg)

图2. Delayed Cache Stored Buffer 的 Bypass 路线（黄色标注部分）看似 Pipelined Cache 这种优化思路能够拆分写入缓存的步骤，减少写命中时间，但从硬件实现的角度来说，这一点还需要斟酌。假设有一个情况，一个 Load 指令紧接着 Store 指令，那么这个 Load 指令就需要去 Delayed Stored Buffer 里面寻找有没有相同的地址。如果有，就需要使用 Bypass 把数据送还给 CPU。图2 中的黄色标注路线就是 Bypass 路径。可以看出，为了实现这一点，一些新的硬件模块比如多路复用器（MUX）和比较器（Comparator）被加入到了缓存系统，而新的硬件则会为 Timing 和命中时间（Hit Time）带来新的挑战。

### 高级优化方法二：内存写入缓冲区（Write Buffer）

同样，我们先抛出相同的问题：<strong>为什么需要这种优化？</strong>

- 如果有连续的 Store 指令（其实很普遍），我们不希望让 Cache 和 Memory 之间每次都通信，这样耗费的时间太多
- 所以可以加一个Write Buffer，类似一个 Queue，可以 Queue-in 要存入内存的数据
- 好处是，如果有连续的 Store 指令，他们可以在 Write Buffer 里形成一个完整的 Block，然后再存入 Memory 中，而不是每次都要访问内存，这种效果叫做 Write Merging

- 可以减少 Cache 和 Memory 之间的 Bandwidth 的压力，也能减少 Miss Penalty

- 当 Store 指令把数存入 Write Buffer 之后，从处理器的角度来说，整个写入内存的过程已经完成
在计算机的世界里，有一种现象很普遍，那就是多个连续的 Store 指令连续出现。如果每次 Store 指令都需要让缓存单独把数据写入内存，那效率就太低了。所以，设计人员就希望在缓存和内存之间，添加一个新的缓冲区叫做（内存）写入缓冲区（Write Buffer），作用类似于一个队列（Queue），可以 Queue-in 将要存入内存的数据。

在经历过连续的 Store 指令后，多个数据可以在 Write Buffer 里面形成一个完整的 Block，然后再将整个 Block 存入内存中，而不是每次都要访问内存。这种效果叫做写入合并（Write Merging）。从处理器的角度来说，处理器不需要担心 Write Buffer的存在，当 Store 指令把数据存进 Write Buffer 之后，整个写入内存的过程已经完成了。

<strong>Write Buffer 对于写穿和写回缓存有区别吗？</strong>

老萧在之前的缓存笔记中提到过两种缓存写入内存的策略，写穿（Write Through）和写回（Write Back）。还没看过的小伙伴们，链接帮你们 po 在下面了：

[](https://zhuanlan.zhihu.com/p/343870184)

对于写穿（Write Through）的缓存来说，Write Buffer 里面存了要写入内存的数据，而对于写回（Write Back）的缓存来说，里面存了被驱逐的脏线（Dirty Line），它们正在等待被写入。但对于以下两种情况，上述的两种缓存都有着相同的策略：

- 如果 Write Buffer 满了，那么 CPU 和缓存必须阻塞（Stall），等待 Write Buffer 清空
- 如果出现读不命中（Read Miss），那么可以比较 Read Miss 的地址和存在 Write Buffer 里面的地址；如果没有相同，可以允许 Read Miss 比之前的 Store 指令提前去内存拿数；如果有相同的地址，那么就把这个在 Write Buffer 里面的数据送还给 CPU
下期预告 —— 高级优化方法三：多级缓存（Multilevel Cache）& 方法四：高速牺牲缓存（Victim Cache）

传送门 —— 老萧其他笔记和文章

[](https://zhuanlan.zhihu.com/p/382269148)

[](https://zhuanlan.zhihu.com/p/347400101)

*注：知识点来源于 Coursera 的 Computer Architecture 公开课*

<strong>欢迎关注我的专栏：老萧追芯，和老萧一起学习芯片行业的点点滴滴</strong>
