---
title: 有哪些优秀的 C/C++ 开源代码框架？这些框架的设计思路是怎样的？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/有哪些优秀的-C_C-开源代码框架-这些框架的设计思路是怎样的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/20201738/answer/2928936881
---


给你几个能学到思路的：

一、senders for C++26（std::execution），它有一个高级的思想叫做<strong>structured concurrency</strong>（结构化并发），凭借这一思想打败了久负盛名的asio。

<strong>“Structured concurrency” refers to a way to structure async  computations so that child operations are guaranteed to complete before  their parents, just the way a function is guaranteed to complete before  its caller.</strong>**“结构化并发”指的是一种构建异步计算的方式，以便保证子操作在其父操作之前完成，就像保证函数在其调用者之前完成的方式一样。简单地说，有了这种思想的保证，即使在并发环境中，函数嵌套调用时参数的作用域也是严格嵌套的，你不需要用智能指针之类的技术，也不会发生不小心的内存泄露。如果想要详细理解，看这里：

[![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_d8cfa17add10.jpg)Structured Concurrencyericniebler.com//08/structured-concurrency/](https://link.zhihu.com/?target=https%3A//ericniebler.com//08/structured-concurrency/)

C++标准想要一个官方的异步调用模型，在最后一次投票中，senders以微弱的优势打败了asio。

asio的异步模型其实也是久经考验且非常易于扩展，如果说它哪一点败给了senders，我的理解就是这个structured concurrency。

senders源码：

[](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/stdexec)

二、asio网络库，它包含了多种功能强大且鲜为人知的网络与并发编程设计模式

asio源码的设计思想看起来自成一套，而且有一些看似独特的概念，像completion token之类的，其实这并非作者发明，而是运用了一些早已被总结出来的设计模式，这些模式被收录在《面向模式的软件体系构架，卷2》中：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_b9d64e1ca3de.jpg)![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4274d977f6a9.webp)

这个书的内容本身并不难，如果想彻底看懂asio的源码，可以花点时间看看此书。

asio源码：

[](https://link.zhihu.com/?target=https%3A//github.com/chriskohlhoff/asio)

三、leveldb，它包含了一种名字叫<strong>LSM-Tree</strong>的<strong>面向磁盘的</strong>数据结构。

LSM-Tree全名Log-structured merge-tree，是一种分层、有序、面向磁盘的数据结构，其核心思想是充分了利用了「磁盘批量顺序写要远比随机写性能高出很多」的原理。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_d0f1a2754fd5.jpg)

从leveldb中学到了很多东西，但是我觉得最值得学习的还是lsm，虽然它是一种古老的数据结构，但是leveldb让它老树开出了新花，理解它、并且能够自己用代码实现它，可以让自己的编程能力提高一个level，这也契合了leveldb这个名字。

如何肆无忌惮地写文件并且最大限度地保证文件的完整性，leveldb中对于lsm-tree的实现就是最好的答案。

leveldb源码：

[](https://link.zhihu.com/?target=https%3A//github.com/google/leveldb)

四、EnTT，一个用<strong>ECS思想</strong>实现的游戏引擎 

cpu其实并不喜欢面向对象（OOP），它喜欢的是DoD，全名叫Data-oriented design(面向数据的设计），一种在游戏里面利用DoD思想的构架叫ECS（Entity Component System），在某些场合下面用来提高游戏的性能，这里有一个简单明了的ppt：

但是DoD肯定不止能用于游戏，在任何你想要优化cpu的场合，都可以尝试一下它。优秀的学习视频：

更推荐effective c++的作者——Scott Meyers这一篇：

当时看完这个视频以后感觉受益良多，世间数据结构千万种，可是CPU只喜欢一种：数组。DoD思想是生产环境中肯定是派得上用场的，我自己尝试过，也见别的同事成功用它来优化程序。

EnTT源码：

[](https://link.zhihu.com/?target=https%3A//github.com/skypjack/entt)

五、boost::context，你可以学到用<strong>几十行汇编代码实现的顶级协程</strong>解决方案

著名的协程库libco，它的底层其实是几十行汇编，和boost::context里面的汇编原理是一样的，都是通过汇编的方式来保存寄存器，实现堆栈的切换，对于计算机专业的大学生来说，看懂这些汇编很容易。

汇编源码在这里：

[](https://link.zhihu.com/?target=https%3A//github.com/boostorg/context/tree/develop/src/asm)

这种方式实现的协程非常高效，boost基于它作了简单的封装，名字叫fiber_context，不出意外会进入C++26的标准库中。

从此C++会成为第一个同时拥有官方的有栈和无栈协程解决方案的编程语言。

送礼物

还没有人送礼物，鼓励一下作者吧

[编辑于 2024-06-04 15:59](//www.zhihu.com/question/20201738/answer/2928936881)・广东

​​4296 ​240 ​分享

​​

收起​
