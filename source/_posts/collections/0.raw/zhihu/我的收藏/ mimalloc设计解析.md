---
title: "(1 条消息) mimalloc设计解析"
date: "2023-09-25 00:00:00"
updated: "2023-09-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/mimalloc设计解析/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/658307892"
---


### 前言

前段时间给项目上了mimalloc优化了一波性能，但这么底层的改动很容易导致晚上睡不着。这段时间趁着闲把mimalloc的源码过了一遍，把潜在的风险也排查了一波，过程中发现现代内存分配器的设计还挺妙的，遂在此记录一下。

#### mimalloc

mimalloc是专门为多线程应用设计的一款高性能的内存分配器，能极大降低多线程环境下线程间同步带来的性能下降。与tcmalloc类似，mimalloc采用了线程本地缓存的设计，同时采用了复杂的缓存管理机制提升内存分配和释放的速度。此外，mimalloc的内存分配/释放算法是lock-free的，意味着它是async-signal-safe（可以在signal handler内调用）。

这篇文章主要介绍mimalloc中的四个关键数据结构：tld（thread local data）、heap、page、segment，以及与之关联的一些算法流程，以使得我们对mimalloc在达到稳态后是如何实现高性能有个大致的了解。

#### thread local data

大多数高性能内存分配器产品都会实现自己的内存池（缓存），以减少系统调用（mmap）的次数。mimalloc将缓存进一步划分到各个线程中，各线程的内存分配都走线程本地缓存（tld），最大程度避免了内存分配时线程间的（锁）竞争。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9244b618aa8e.jpg)

mimalloc的cache结构一个tld主要由heap和segment两部分构成，它们共同组成了一个二级缓存系统：

<strong>heap</strong>：面向上层应用的一级缓存，是分配内存时的第一搜索位置。其内部使用了相当巧妙的结构和算法来组织和管理内存块，以实现内存块的快速索引和改善连续内存分配时的局域性

<strong>segment</strong>：面向heap的二级缓存，是通过mmap申请的连续大内存区域（32MB），起到了缓冲heap频繁调整大小的作用

虽然内存一定走线程本地的heap分配，但内存被分配后可能会传递到其它线程并由其负责释放（归还到原线程的tld），因此不可避免地导致多线程竞态的风险。后面我们会看到，mimalloc通过free-list分片的方式极大地分散了内存跨线程释放时的竞态风险。

#### heap

heap以page为单位进行内存管理，page是一组大小固定的block序列（但不同page的block size可以不同），后者是内存分配所返回的对象。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4e45a417f73d.jpg)

mimalloc的heap结构不同于传统内存分配器使用单free list管理一个size class的所有block，mimalloc将free list以page为单位进行分片：每个free list只管理所属page的block，block的大小即为free list的size class。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_387addf7de3e.jpg)

free list分片前后的对比这样做的第一个好处是<strong>减少跨线程内存释放时多线程竞争的概率</strong>：一般来说应用的线程数（几十）远少于page数（几万），如果不出现极端的hot page现象竞争的概率很小。

这样做的第二个好处是<strong>连续分配的内存块有更好的内存局域性</strong>：大多数应用长期运行后都会有内存碎片化问题，传统的单free list会导致结构复杂的对象的内存分散在整个heap上；而分片free list则更可能将对象的内存聚集到单个page上，降低cache miss（主要是L2和L3）的概率。

由于进行了分片，因此内存分配时原则需要至少两次转跳才能找到合适的free-list：第一次找到对应size class的free list集合（或者说，page queue），第二次从page queue中找到有空闲block的free list。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_507309c8b174.jpg)

类buddy系统的page管理但这样查找的效率很低，尤其是从集合查找有空闲block的page：最坏情况下要遍历整个page_queue。因此mimalloc额外设置了一个特殊的full page queue：每当检测到page无可用block时，就把它转移到full page queue；当有block释放回full page时，再将其移回对应page queue，以保证大部分情况下page queue的第一个page可用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ce953252cda.jpg)

full page集中管理然而，这个看似简单的优化极大地复杂化了多线程同步的逻辑：当一个full page因为跨线程内存释放导致它不再full了，谁负责把它放回原位？由释放线程来做并不现实，因为这个过程涉及到多个数据，很难用无锁的方式实现。

因此，mimalloc为跨线程内存释放额外增加了一套流程：当page处于full page_queue时，将block暂存到delayed_free缓存队列而非归还到page，由本地线程定期从缓存队列中取出并归还至相应page，同时将page转移回原page queue。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a7ed8200d701.jpg)

full page跨线程释放时的延迟free至于本地线程是如何实现定期从delayed_free中收集并归还block到对应full page，后面我们会看到，mimalloc通过对page内的free list再一次分片实现了这种类似于定期心跳的回收机制。

#### page

page是mimalloc中内存管理的最小单位（block太简单，忽略不计），它由大小固定block序列和元数据组成，这些block由隶属于page的free list组织：当进行内存申请时，最终返回的就是free list中第一个block。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_07eb44d4e8d3.jpg)

page的内存结构不过，page中的空闲block并非只由一条free list组织，mimalloc在page的基础上再次对free list进行了分片：供内存分配的free、供本地线程内存释放的local-free、供其它线程内存释放的thread-free

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4d312d2e37c6.jpg)

page内部的free list分片

- free list：上层应用请求分配内存时block的直接来源，大部分时间直接pop-from-head即可，只有在变空时才从另外两条free list补充block
- local-free list：上层应用（同一线程）释放内存时block的直接归处，大部分时间直接push-to-head即可
- thread-free list：上层应用（跨线程）释放内存时block的直接归处，通过lock-free算法实现push-to-head
将thread-free分片出来的原因很直观：在大部分时间内<strong>将本地线程的malloc/free和其它线程的free隔离开</strong>，使得线程竞争的时机集中延迟到free为空需要从另外两条free链表补充时，进一步减小了竞争的概率

将local-free分片出来的原因则较为间接：一方面是<strong>提供了一种定期检查的机制</strong>，保证一个page在经过固定次数malloc后一定会触发内存回收逻辑，不仅包括从local-free和thread-free中回收block，还包括从上一节中介绍的`heap->delayed_free`中回收block。另一方面，对于使用了引用计数的语言运行时而言，释放大对象（直接或间接引用了大量资源的对象）时会触发大量的引用递减操作，其中一个优化便是使用所谓延迟引用递减（deferred decrement）的机制，mimalloc所提供的定期回收机制使得语言运行时可以将引用递减推迟到内存压力紧张时执行。

#### segment

heap、page、block内存并非凭空而来，它们最终源于内核为我们分配的匿名内存段——通过mmap系统调用的方式。然而后者的开销是昂贵的，因此mimalloc设置了尺寸较大的segment作为heap和内核之间的缓冲，以减少mmap/munmap的调用次数

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9bfd15333ea1.jpg)

segment内存布局segment结构较为简单：一块连续的大内存（32MB），以64KB为单位划分成500个slice，其中头部slice区域用于存储segment的元数据。在heap需要拓展page时，会从segment中拿走由若干slice构成的序列——所谓的slice span，作为page的原始内存。

当然，和heap一样，在长时间使用后segment中的内存也会呈碎片化的形式：空闲的和被占用的slice交替出现，导致寻找目标尺寸的slice span变得困难；同时，一个tld可能会持有多个segment，如何选择一个合适的segment也是一个问题。

为了让heap在page不足时能够迅速从segment中找到合适的slice span，mimalloc将slice span按大小分类成不同的size class，并为每个size class分配一个slice span queue，用于存储所有segment中该size class的所有slice span——类似于heap按block大小分类管理page那样。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9c20e004ac49.jpg)

类buddy系统的slice span管理当heap需要从segment中申请长度为n的slice span时，会先计算出n对应的size class下标bin，从而找到该size class的slice span queue。若span queue非空，则将第一个slice span作为搜索结果；若span queue为空，则向size class更大的span queue查找，直至找到第一个非空的span queue。

由于返回的slice span大小可能大于实际page所需，因此会将多余部分裁剪出来的作为新的span，并添加到对应size class的span queue，以避免浪费

#### 总结

mimalloc采用one-cache-per-thread的设计减少了内存分配和释放时线程间的竞争，各线程从本地的heap请求内存即可；heap以page为单位对free list进行了分片，大幅降低了跨线程内存释放时的竞争概率以及提高了连续内存分配的局域性；page在此基础上对free list做了进一步的分片，分隔了本地线程malloc/free和跨线程free流程之间的耦合，同时为上层提供了一种定期触发的回收机制；最后，segment充当了heap和内核之间的缓冲，减少了mmap/munmap等昂贵的系统调用频率。

要注意的是，这里只是介绍了mimalloc基本的数据结构和内存管理算法，对于更细节但同样重要的问题并没有涉及，比如：在保证速度的同时如何兼顾内存使用率、如何避免page/cache effect（频繁访问cache line偏移相同的地址导致的高cache miss效应）、如何实现内存安全性（防破解），等等。
