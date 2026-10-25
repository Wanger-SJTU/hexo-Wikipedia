---
title: 让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（二）How
date: "2019-07-23 00:00:00"
updated: "2019-07-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】(二)How/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/60940902
---


上一篇文章简要地介绍了TMA是什么，并且使用一些例子来帮助大家更好地了解体会到TMA这套分析方法学所能带来的好处，即为什么要使用TMA。叙述完了What跟Why，接下来该讲讲How了，这篇文章将会简要讲解一下TMA的的基本实现原理，即TMA的第一次层级的四个分类是如何得到的，TMA究竟是站在哪个角度去得到这些相应的比重的。

[![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_c02b3a03adc6.jpg)拓荒犬：让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（一）概要293 赞同 · 17 评论 文章](https://zhuanlan.zhihu.com/p/60569271)

**

首先讲讲为什么要划分成这四个大的分类，而不是三个或者五个，并且为什么是这四种。了解CPU微架构的朋友兴许还记得，CPU内部可以分为前端后后端，前端主要负责取值、译码等操作，是顺序执行；后端负责接收前端的指令，并且乱序执行，顺序Retire。但是由于现在的高性能CPU，几乎都有分支预测的功能，既然是预测，必然有预测出错的情况存在。那么，一个CPU若出现性能瓶颈，那么便有可能出现在前端或者后端，也有可能是分支预测导致的**。所以，TMA的第一层级中有Frontend、Backend、Speculation这三个分类，那么，为什么还有Retiring这个分类呢？在这里，Retiring分类表示的是理想状况的流水线执行比重。

那么，为什么不直接划分成三类可能导致瓶颈的类别，而要多加一项Retiring分类呢？为了解释这个问题，首先要了解TMA第一层级究竟是对什么进行划分的，要了解Pipeline Slots的概念。假设我们分析的CPU是一个四发射CPU，即每个周期，前端可以向后端发送四个uops。在理想情况下，前端每个周期可以向后端发送4个uops，后端每个周期也能接收4个uops，便会出现下图的情况，绿色表示的Pipeline被uop填充的情况，而这里的每一个点，便是一个Pipeline Slot。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_808d4708ceb8.jpg)

理想情况下的Pipeline Slots状况但是，由于某些原因，导致前端不能每个周期发送四个uops，或者后端不能接收4个uops，所以便会导致某些周期出现Pipeline Slots并未被uops填充满的情况。如下图所示，灰色表示该Pipeline Slots并未被uops所填充。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_78387c75ee2c.jpg)

CPU出现性能瓶颈，导致Pipeline Slots只被填充了50%假设我们分析的程序的运行过程和上图一样，只有十个周期，那么，在理想情况下（即Pipeline Slots被100%填充），Retiring这个分类为100%，其余的三个分类为0%。在第二幅图的情况下，Pipeline Slots只被填充了50%（即出现了50%的Bubble），所以Retiring这个分类有可能为50%（若发生Bad Speculation，Retiring这个分类将![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_3d627edd4cc5.jpg)

接下来，看看如何使用这两个分支判断来对一个四发射的CPU进行TMA，对于第一个周期，没有uops被issue，并且后端也没有堵塞，在该情况下，全部都归结到前端不给力，因为Fronttend没有及时地发射uops。在第二个周期，后端依然没有堵塞，前端这时发射了两条uops，故Frontend和Retiring各为2。在第三个周期的时候，没有uops被issue，但是这时候后端出现了堵塞，所以全部落在Backend。在第四个周期，虽然四条Pipeline都有uop被issue，但是由于其中3个uops最终没有Retire，所以Retiring分类为1，Bad Speculation这个分类为3。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_e4a840cdc379.jpg)

有朋友可能就会觉得，这样每个周期去数究竟有多少uops被发射，后端究竟是否堵塞，还要去追踪每一条uops最终是否被Retire，这种实现方法的代价实在太高了，而且在硬件中也很难实现。那么，TMA究竟在硬件中是如何实现的呢？其实，TMA并不需要每个周期都去探查一次CPU的具体状况，只需要执行完整个测试程序后，拿到这个程序的一些特定的Performance Counter值，便可进行TMA。这，其实也是TMA的一个优势所在，硬件的资源开销很小，并且对程序的运行几乎没有影响。为什么拿到一些统计结果便可进行第一层级的划分呢？我们看下TMA第一层级的公式，便可以解答这个问题。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_0c347e90bf2b.jpg)

TMA第一层级大体的划分公式下面将解释这些公式中的值究竟是如何通过统计得到的。Total Slots**，即总共有多少个Pipeline Slots，只需用程序的执行周期乘以CPU每个周期的发射数便可得到。**Slots Retired**，即被成功Retired的uops数量，这个计数器在大部分的CPU中都有被实现，只需要每个周期加上这个周期Retired的uops数量便可以实现。**Slots issued**，即总共有多少的uops被成功发射，这个也在大部分的CPU中已经实现。**Fetch Bubbles**，即只需要统计没有出现后端拥塞的情况下，前端没有利用好pipeline slots的数量。**Recovery Bubbles**，指的是由于Recovery的原因导致前端出现瓶颈，在后端没有拥塞的情况下，没有发射uops的数量。Fetch Bubbles和Recovery Bubbles的和便是Frontend Bubbles，即在后端没有拥塞的情况下，前端导致了多少的Pipeline Slost被浪费。

通过在CPU中设计相应的逻辑电路，加上Performance monitoring units (PMUs)，便可以很容易得到以上公式中我们所需要的统计值。Fetch所导致的Bubbles占所有Pipeline Slots的比重，便是前端所浪费的Slots比重。用Issued uops总数减去Retired uops总数，表示虽然Issue但是没有Retire，做了无用功的uops数量，再加上Recovery过程中所导致的Bubbles，这两者之和再除以总的Slots数量，便可以表示Bad Speculation所浪费的Slots比重。Retiring这个分类的比重很好理解，直接用总的Retired uops数量，除以总的Slots数量，便是成功Retire的uops比重。由于所有的Pipeline Slots无非就只能划分到这四个大类中去，所以四个分类的和一定为1，故Backend这个分类只需要用1减去其余分类的值便可。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_78b62a75f441.jpg)

使用TMA对Intel CPU的Pipeline Slots进行划分至此，我们便简要地了解到了TMA的原理，以及TMA在具体的CPU硬件中是如何实现的，接下来，将会具体讲解每个大类，介绍每个层级是如何进一步进行划分的，以及相应的计算公式，以帮助大家更好地了解整套的TMA方法学。如果对于讲解中的内容有什么困惑，欢迎大家留言，一起探讨。

#### 补充：

- CPU中前端和后端的划分:
对于CPU中的前端和后端划分，一般将micro-op Queue往后的部分划分为后端，micro-op Queue模块及其之前的部分为前端。micro-op Queue模块往后的带宽，便是CPU的发射宽度，比如下图的AMD CPU，由于流水线宽度为6，所以这里的带宽为6。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_1c411c0d4ed1.jpg)

Intel CPU的前端和后端的划分![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_6a72fa0491f9.jpg)

AMD CPU![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_3812b6514bdd.jpg)

左半部分为前端，负责Fetch/Decode; 右半部分为后端

2.现代乱序执行CPU会使用的一些机制：

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_5852f21d539b.jpg)

正是由于这些机制，使得CPU性能变得强大，也正是因为这些机制，使得CPU变得难以分析
