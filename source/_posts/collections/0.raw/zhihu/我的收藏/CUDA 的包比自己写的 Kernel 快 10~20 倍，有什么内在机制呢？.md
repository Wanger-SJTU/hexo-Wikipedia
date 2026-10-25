---
title: CUDA 的包比自己写的 Kernel 快 10~20 倍，有什么内在机制呢？
date: "2022-04-21 00:00:00"
updated: "2022-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/CUDA-的包比自己写的-Kernel-快-10~20-倍,有什么内在机制呢/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/356661099/answer/2449633440
---


我写过一个20行的kernel。

完全没有复杂数学计算，就是把特定数据从一个地方搬到另一个地方。写这个kernel 估计用了半天。

在review 的时候，我被问到这样几个问题。解决这些问题花了我半年。

- 这个kernel 是 memory bound 还是 compute bound ? 
- 这个容易，直接理论解释一下就好。配合 nvprof/ncu report。
- 如果是memory bound, 现在这个实现的throughput 是多少？
- 这个时候我就得拿nvprof/nsight 去把一些指标拿出来，并且针对这个问题认真算一下我到底access 了多少数据。
- 你的代码真的在做你让它做的事情吗？
- 比如我在代码里展开循环， 展开了8次。但是有可能register 不够用，在编译的时候只能展开6次。你怎么证明编译出来的代码在做你让他做的事情？
- memory bound 具体在gpu 上的哪一块儿遇到了瓶颈？DRAM ? L1? L2? 
- 这个时候上面的指标就不够用了，我得去找细化的指标，然后算 hitrate，算cacheline 的大小，算我们每个计算单元上能跑多少线程。
- 这些指标就一定是对的吗？互相之间能相互佐证吗？和我们的预期相符吗？比如L1 hitrate 汇报说是30%。但是我在load data 完全没有复用，理论上应该没有L1 hit，这30% 哪里来的？
- 针对以上的瓶颈，理论上的上限是多少？
- 然后我就要去找英伟达发布的硬件数据， 根据这些数据算出来理论上限。
- 接下来的问题是，你怎么证明这些理论上限是正确的。于是我又要些一些microbenchmarking 证明我算出来的理论上限是可以达到的，并且理解了在要达到这些上限需要怎样的条件。
- 我们现在这个实现是不是达到了理论上的上限？有没有硬件上的一些特殊指令能够让我们跨越理论上限？
- 比如LDGSTS，能够跨越L1，比如 reduced precision 能够省带宽，比如vectorization，能够增加load in flight。写优化代码水还是很深的。

========== 更新一下 =========================

我们的这个kernel 开源了，所以开了个新帖讲一讲里面细节。

[聊聊 CuEmbed （一）](https://zhuanlan.zhihu.com/p/1959047008972171179)