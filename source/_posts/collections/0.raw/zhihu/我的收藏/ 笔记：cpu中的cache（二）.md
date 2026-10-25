---
title: (1 条消息) 笔记：cpu中的cache（二）
date: "2020-05-31 00:00:00"
updated: "2020-05-31 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/笔记-cpu中的cache(二)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/144836286
---


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9d788cc4fab4.jpg)

<strong>引入缓存后，必然会存在缓存一致性问题。</strong>

<strong>一，缓存不一致的地方</strong>

cpu的cache缓存的写操作基本上是两种策略：

①<strong>写穿透（Write Through）</strong>：数据同时写入Cache和主存 。

② <strong>写返回（Write Back）</strong>：数据只写入Cache，仅当该数据块被替换时才将数据写回主存。

写穿透效率不如写返回，它额外的需要对内存进行同步，对于主流的CPU来说，一般采用的是写返回，但这样就存在一致性问题。

<strong>二，cpu解决缓存一致性的方式</strong>

CPU硬件上，两种方法来解决这个问题。

<strong>①Directory 协议</strong>。这种方法的典型实现是要设计一个集中式控制器，它是主存储器控制器的一部分。其中有一个目录存储在主存储器中，其中包含有关各种本地缓存内容的全局状态信息。当单个CPU Cache 发出读写请求时，这个集中式控制器会检查并发出必要的命令，以在主存和CPU Cache之间或在CPU Cache自身之间进行数据同步和传输。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f223a9d0ff89.jpg)

②<strong>Snoopy 协议</strong>。这种协议更像是一种数据通知的总线型的技术。CPU Cache通过这个协议可以识别其它Cache上的数据状态。如果有数据共享的话，可以通过广播机制将共享数据的状态通知给其它CPU Cache。这个协议要求每个CPU Cache 都可以***“*窥探*”***数据事件的通知并做出相应的反应。（来源：https://coolshell.cn/articles/20793.html）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c86d907a22b2.jpg)

Snoopy Bus

MESI协议**是一个基于失效的缓存一致性协议，是支持回写（write-back）缓存的最常用协议。与写通过（write through）缓存相比，回写缓冲能节约大量带宽。总是有“脏”（dirty）状态表示缓存中的数据与主存中不同。MESI协议要求在缓存不命中（miss）且数据块在另一个缓存时，允许缓存到缓存的数据复制。（来源：https://zh.wikipedia.org/wiki/MESI%E5%8D%8F%E8%AE%AE）

<strong>MESI协议下缓存行的状态：</strong>

- <strong>已修改（Modified）</strong>，缓存行（cache line）是脏的（*dirty*），被所属的处理器修改了。如果一个缓存行处于已修改状态，那么它在其他处理器缓存中的拷贝马上会变成失效状态，此外，已修改缓存行如果被丢弃或标记为失效，那么先要把它的内容回写到内存中。
- <strong>独占（Exclusive）</strong>缓存行，和主内存内容保持一致的一份拷贝，如果一个处理器持有了某个 E 状态的缓存行，那其他处理器就不能同时持有它，也即如果其他处理器原本也持有同一缓存行，那么它会马上变成“失效”状态。
- <strong>共享（Shared）</strong>缓存行，它是和主内存内容保持一致的一份拷贝，在这种状态下的缓存行只能被读取，不能被写入，也即多组缓存可以同时拥有针对同一内存地址的共享缓存行。
- <strong>失效（Invalid）</strong>缓存行，要么已经不在缓存中，要么它的内容已经过时。为了达到缓存的目的，这种状态的段将会被忽略。一旦缓存段被标记为失效，那效果就等同于它从来没被加载到缓存中。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_86958cdc2f86.jpg)

<strong>状态转换的操作：</strong>

a) cpu把cache line 回写到内存，此时该cpu对这个cache line还是有独占权。

b) cache line 被cpu修改，该操作不需要cpu之间通信。

c) cpu收到read invalidate之后，本地cache line失效。

d) cache line 被本地cpu修改，需要和其他cpu通信，发出read invalidate 获取最新的数据。

e) cache line 被本地cpu修改，需要向其他cpu发出invalidate请求。

f) 其他cpu发来read请求。

g) 其他cpu发来read请求。

h) cpu意识到它马上要写数据到cache line，所以提前发出invalidate消息给其他cpu。

i) 其他cpu发来read invalidate。

j) cpu在写数据之前发出read invalidate消息给其他cpu，之后就处于e状态，该状态很快就可能变成m状态。

k) cpu发出read请求。

l) 收到invalidate请求。

<strong>三，Store Buffers</strong>

<strong>当前cpu视角</strong>：当需要修改本地缓存中的一条信息，必须通知（Invalidate请求）其他拥有该缓存数据的CPU缓存中，并且需要等待确认（Invalidate Acknowledge），而这个等待确认的过程会阻塞处理器，这会降低处理器的性能。

为了避免这种CPU运算能力的浪费，引入了Store Bufferes机制。

1）处理器把它想要写入到主存的值写到缓存buffer中（队列实现），然后继续去处理其他事情。（风险：有可能读取到未提交的buffer数据，即buffer没有操作到主存，所以我们需要在查cache的时候还得查一下store buffer,这种技术叫做store forwarding。）

2）当所有失效确认（Invalidate Acknowledge）都接收到时，数据才会最终被提交。


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_497dc0b77eb9.jpg)

Store Buffers 

其他cpu视角：**对于其他接收到消息的cpu需要执行失效操作，这操作也会降低处理器的性能。

为了避免这种CPU运算能力的浪费，引入了 invalidate queue。

1）对于所有的收到的Invalidate请求，处理器必须立刻发送Invalidate Acknowlege消息。

2）Invalidate操作并不真正执行，而是被放在一个Invalidate队列中，在方便的时候才会去执行。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8cf32f630798.jpg)

 invalidate queue

即便新增加了Store Bufferes 和  invalidate queue，但是对于存在变量顺序依赖的情况，也还是没法处理的。

//假定b在cpu0
voidexecutedOnCpu0(){

```text
    a = 1;
    b = 1;
 } 
//假定a在cpu1
```

voidexecutedOnCpu1(){  

```text
   while (b == 0) {};
   assert(a == 1);
}
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_47791d16d748.jpg)

假定：cpu0 cache里面有个b，初值为0，cpu1 cache有个a，初值为0，各自执行方法。

1）cpu0 发现a不在本地cache，发送read invalidate去cpu1，并将a=1写入store buffer中

2）cpu1 执行while (b == 0)发现b不在本地内存，发送read消息去cpu0

3）cpu0 执行b=1，在本地cache置b为1

4）cpu0收到read消息，把cache中的b传送给cpu1

5）cpu1发现b为1，退出循环，因为这时候cpu1本地cache中a还是0，所以失败,与期望不符。

（详细:[https://zhuanlan.zhihu.com/p/55767485](https://zhuanlan.zhihu.com/p/55767485)）

memory barrier（内存屏障）

写屏障 Store Memory Barrier(a.k.a. ST, SMB, smp_wmb)是一条告诉处理器在执行这之后的指令之前，应用所有已经在存储缓存（store buffer）中的保存的指令。

读屏障Load Memory Barrier (a.k.a. LD, RMB, smp_rmb)是一条告诉处理器在执行任何的加载前，先应用所有已经在失效队列中的失效操作的指令。

//假定在cpu0
voidexecutedOnCpu0(){

```text
    a = 1;
    //在更新数据之前必须将所有存储缓存（store buffer）中的指令执行完毕。
    storeMemoryBarrier();
    b = 1;
 } 
//假定在cpu1
```

voidexecutedOnCpu1(){  

```text
   while (b == 0) {
};
    //在读取之前将所有失效队列中关于该数据的指令执行完毕。
    loadMemoryBarrier();
   assert(a == 1);
}
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1b3cf4d6bdf7.jpg)

参考：

https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-823-computer-system-architecture-fall-2005/lecture-notes/l19_snoopy_prot.pdf  

https://www.cs.utah.edu/~rajeev/cs7820/pres/08-7820-04.pdf 

https://people.eecs.berkeley.edu/~pattrsn/252F96/Lecture18.pdf  

https://courses.cs.washington.edu/courses/cseau/Lectures/luke_directories.pdf

http://www2.in.tum.de/hp/file?fid=1276  

https://www.cnblogs.com/yanlong300/p/8986041.html 

https://www.infoq.cn/article/cache-coherency-primer
