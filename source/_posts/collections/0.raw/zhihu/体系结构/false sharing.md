---
title: false sharing
date: "2024-02-07 00:00:00"
updated: "2024-02-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/false-sharing/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/681744521
---


False Sharing（伪共享）是多线程编程中一种特殊的性能问题，它发生在多个线程访问并修改同一个cache line上的不同数据时。这会导致无效的缓存一致性流量，因为处理器必须不断地在cpu核之间同步数据，即使各个线程访问的是不同的内存位置。

#### 为什么会发生False Sharing？

现代CPU使用缓存来加速内存访问，它们按cache line（通常是64字节）来存储数据。当一个core修改了cache line中的数据，其他core中缓存了同一cache line的副本会失效。这意味着如果另一个core需要访问同一cache line（即使是不同的变量），它需要等待原cache line被写回内存然后重新加载它，导致延迟。这就是所谓的伪共享，伪共享可以显著降低并发程序的性能，尤其是在多核处理器系统上。

#### 怎么解决False Sharing？

- <strong>数据填充（Padding）</strong>：在高性能计算的数据结构中，可以在每个元素之间填充额外的字节，以确保它们不会位于同一个缓存行上。这样可以防止多核心之间因为访问相邻数据而不必要地同步缓存行。
- <strong>数据对齐（Alignment）</strong>：通过对齐数据结构的大小以缓存行大小的倍数，确保它们不会跨越多个缓存行，从而减少False Sharing的风险。
- <strong>访问模式优化</strong>：修改代码以减少线程间共享数据的情况，例如，通过确保线程尽可能在不同的数据上工作，或者采用线程本地存储。
- <strong>编译器支持</strong>：使用编译器特性，如C++11中的`alignas`关键字，或其他语言特定的对齐指令，来指定变量的对齐方式。
- <strong>避免频繁写入共享变量</strong>：如果必须使用共享变量，可以减少写入的频率，例如，通过使用本地变量进行计算，然后只将最终结果写回共享变量。
- <strong>硬件事务内存（Hardware Transactional Memory, HTM）</strong>：在支持HTM的硬件平台上，可以使用事务内存来避免锁的开销，这在某些情况下可以减少由于伪共享导致的性能问题。
