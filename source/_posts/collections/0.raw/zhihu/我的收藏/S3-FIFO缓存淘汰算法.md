---
title: (2 条消息) S3-FIFO缓存淘汰算法
date: "2025-09-29 00:00:00"
updated: "2025-09-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/S3-FIFO缓存淘汰算法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1956103700922762926
---


原文首发：异度部落格（微信公众号: yidooxyz，博客：[异度部落格](https://link.zhihu.com/?target=https%3A//www.yidoo.xyz)）
转载声明：本文版权归作者所有。若需商业转载请联系作者授权，非商业转载请注明出处。> *在研究 AIBrix 的 KVCache 淘汰机制时，我第一次接触到 S3FIFO 这一算法。它以极致简洁的设计令我印象深刻，因此特意撰文记录与分享。*

### 概述

S3-FIFO缓存淘汰算法全称为<strong>S</strong>imple, <strong>S</strong>calable eviction algorithm with <strong>three</strong> <strong>S</strong>tatic FIFO queues，出自论文[《FIFO Queues are All You Need for Cache Eviction》](https://link.zhihu.com/?target=https%3A//dl.acm.org/doi/pdf/10.1145/3600006.3613147)，算法极其简单高效且容易理解。本文将对设计动机、算法的原理和性能做进行介绍。

#### 背景和设计动机

在传统缓存淘汰算法（如 LRU、LFU、2Q、TinyLFU 等）中，往往每次命中或访问都要更新元数据（如把条目移到队列头、调整链表或优先级）。这样做：

- 对并发系统来说需要锁竞争，不容易扩展；
- 对小对象缓存而言，元数据开销（指针、链表等）可能较大；
- 在闪存存储系统或持久化存储场景下，频繁随机写元数据可能不够友好。
另一方面，FIFO（先进先出）算法实现简单、操作开销小、易扩展，但其命中率往往比 LRU 差。**S3-FIFO 的目标是结合 FIFO 的高吞吐量、简易性、可扩展性与较好的命中率表现，尤其是在“偏斜访问”（某些对象被频繁访问，而多数对象只访问一次或极少）场景下。
具体来说，在很多缓存访问轨迹中含有大量 “one-hit wonders” —— 即那些被访问一次后就不再被访问的对象。若这些对象被缓存就会浪费空间。S3-FIFO 通过一个结构将这类对象快速驱逐出去，从而减小“无效占用”的成本。

### S3-FIFO算法原理

#### S3-FIFO 的结构：三队列

S3-FIFO 使用 三个静态 FIFO 队列（不需要在命中时调整链表顺序）：

- S 队列（Small queue）

- 用于缓存“新进入、还未稳定”的对象
- 占整个缓存空间的一个小比例

- M 队列（Main queue）

- 用于存放稳定的（较有可能被再次访问的）对象
- 占主要的缓存空间

- G 队列（Ghost queue）

- 只记录 key（不存数据），用于追踪曾被淘汰对象的历史
- 大小与 M 队列相当（或者说与 M 中的数据条目数相同）

Ghost 队列的作用是：当一个对象在被驱逐后又被访问时，从 G 队列中检测到，就把这个对象提升到 M 队列，认为它可能是热点对象。

#### 缓存访问与更新流程

下面分情况说明对象访问、插入、淘汰的流程。<strong>访问缓存</strong>

- 当数据被访问（查询）时，如果它在 M 或 S 中，则视为命中。在命中时，S3-FIFO 会据此更新对象的一个称作freq的小位（2 bit）来记录访问次数状态（最大值上限）。
- 如果在 G 中（幽灵队列），表示这是曾被淘汰过但又被访问的对象（即“回归”），此时不算命中（因为数据已不在缓存中），但会把这个对象重新插入到 M 队列，以表示它可能是热点对象。
- 如果既不在 S、M 也不在 G，则这是全新对象。
<strong>更新缓存</strong>**当一个新对象要被缓存：

- 首先检查 G 队列：若之前该对象在 G 中（即曾被淘汰过），则此时将它插入 M 队列（因为它显示出“二次访问”的潜力）。
- 否则（未在 G 中），将该对象插入 S 队列，初始freq=0 。
- 如果 S 队列满了，要做溢出处理：

- 从 S 的尾部取出老对象，根据其 freq 判断是转入 M 还是 G。如果 freq > 0 转入M，否则转到 G。
- 在转入 M 时要清除其 freq 状态（重置）。如果转入 G 时 G 满了，则按 FIFO 顺序淘汰 G 队列尾部对象。
4. 若 M 队列满了，则也要淘汰条目。M 的淘汰逻辑稍复杂：

- M 中也用 freq 位记录访问频率。
- 在淘汰时，从 M 的尾部（或候选区）取出一个对象t ，如果 freq > 0，则把 t 再插回到 M 队头并freq - 1。如果 freq = 0，则才真正将 t 从 M 中移除
- 被淘汰的对象其 key 会被加入 G，以便未来可被检测到是否再次访问。
下面是S3-FIFO的缓存访问和更新示例：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_99abca42ae55.jpg)

S3-FIFO性能****S3-FIFO由于其简洁设计和低成本的操作开销，性能上表现优异，下面是翻译自项目首页（[https://s3fifo.com/）的两句话：](https://link.zhihu.com/?target=https%3A//s3fifo.com/%25EF%25BC%2589%25E7%259A%2584%25E4%25B8%25A4%25E5%258F%25A5%25E8%25AF%259D%25EF%25BC%259A)

- S3-FIFO 的未命中率比 LRU 低达 72%。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_73ca8dd02d4a.jpg)

- <strong>S3-FIFO 将 LRU 缓存大小减少 46%，并将吞吐量提升 6 倍。</strong>
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_833378e03f65.jpg)