---
title: (2 条消息) Linux内核应该怎么去学习？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Linux内核应该怎么去学习/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/58121772/answer/1914708043062556662
---


158 人赞同了该回答

知乎专栏和回答似乎是不能同步更新的，后面的翻译我会逐步补上（<strong>目前更新至第26篇</strong>）。


Linkedin上推送了Linux内核开发人员[Moon Hee Lee](https://link.zhihu.com/?target=https%3A//www.linkedin.com/in/moon-hee-lee/)的内核思考系列文章《The Kernel in the Mind》,副标题为“Understanding Linux Kernel Before Code”，大意是在了解代码之前去理解Linux内核。简单浏览目录和标题后，发现对其中的话题和讲解的方式颇为感兴趣，随产生了边学习边翻译的想法。在与作者取得联系并表达意图后，对方告知文章是基于[CC BY](https://link.zhihu.com/?target=https%3A//creativecommons.org/licenses/by/4.0/)协议发布的，对于有人愿意翻译他表示欢迎，这个系列翻译也终于可以成行。

[Moon Hee Lee](https://link.zhihu.com/?target=https%3A//www.linkedin.com/in/moon-hee-lee/)当前受雇于Linux基金会，关注的领域是包括Kernel, KVM, microVMs以及Rust，有兴趣的可以在Linkedin上关注他。

有一定内核基础的，建议直接阅读原文，非常易懂，位置在这里：[The Kernel in the Mind](https://link.zhihu.com/?target=https%3A//www.linkedin.com/pulse/kernel-mind-moon-hee-lee-miwze/)。此系列翻译对应原文版本为V1.1.2025

<strong>不方便访问原链接的，我上传到了国内网盘：</strong>[https://www.123912.com/s/qJF4vd-q746H](https://link.zhihu.com/?target=https%3A//www.123912.com/s/qJF4vd-q746H)

以下为系列文章前言和目录部分：

### 前言

这不是一本编写内核代码的指南。而是一次探索Linux内核思维方式的尝试。

在系统编程中，人们很容易迷失在符号、头文件和实现细节中。但代码背后，内核是一个结构严谨的响应式系统——它以上下文为准则，建立在隔离机制之上，从内存管理到进程调度，每个设计都蕴含着精确意图。

本系列适合所有希望在阅读源码前建立内核思维模型的人。无论你是初次探索Linux内核，还是带着新问题重返，这里关注的始终是行为逻辑而非语法细节。

每篇文章最初都是独立的思考札记。当它们汇聚在一起时，便构成了一张概念地图——不标注函数调用关系，而是勾勒内核如何响应、约束、隔离与服务。

内核驱动万物运转。让我们理解它的运行之道。

### 目录

- [内核不是进程，而是系统本身 The Kernel Is Not a Process. It Is the System](https://zhuanlan.zhihu.com/p/1914711025682482013)
- [服务进程：内核的核心职责 Serving the Process: The Kernel’s Primary Responsibility](https://zhuanlan.zhihu.com/p/1914745992324035304)
- [代码之前先构建概念地图 A Conceptual Map Before the Code](https://zhuanlan.zhihu.com/p/1914849722025379112)
- [内核分层体系：虚拟、映射、隔离与控制 The Kernel as a System of Layers: Virtual, Mapped, Isolated, Controlled](https://zhuanlan.zhihu.com/p/1915560369679762655)
- [单体形式，协同行为：真正的内核模型 Monolithic Form, Coordinated Behavior: The Real Kernel Model](https://zhuanlan.zhihu.com/p/1916237844348925925)
- [内核对象揭示设计，函数仅负责执行 Kernel Objects Reveal the Design — Functions Only Execute It](https://zhuanlan.zhihu.com/p/1917682882836697111)
- [无冲突编码：内核如何在并发风暴中保持安全 Code Without Conflict — How the Kernel Stays Safe in a Storm of Concurrency](https://zhuanlan.zhihu.com/p/1919486140613912260)
- [间接访问的威力——单一内核何以服务众生 The Power of Indirection — How One Kernel Serves Them All](https://link.zhihu.com/?target=https%3A//www.linkedin.com/posts/moon-hee-lee_the-power-of-indirection-how-one-kernel-activity-7319565119250657280-4JwF/)
- [内核设备模型：硬件如何成为/dev The Kernel’s Device Model: How Hardware Becomes /dev](https://zhuanlan.zhihu.com/p/1935302863560607353)
- [内核眼中的内存：不是地图，而是责任 How the Kernel Sees Memory: Not as a Map, But as a Responsibility](https://zhuanlan.zhihu.com/p/1935649552381228461)
- [内存不是空间，而是一套系统 Memory Is Not a Place. It’s a System](https://zhuanlan.zhihu.com/p/1935748844106290104)
- [内核一直都在——你知道它在何处吗The Kernel Is Always There—Do You Know Where?](https://zhuanlan.zhihu.com/p/1964072958243869529)
- [不止于代码执行：内核实际强制执行的内容 Not Just Code Execution: What the Kernel Actually Enforces](https://zhuanlan.zhihu.com/p/1965813915196818734)
- [引导结束之处：内核启程之时 Where Boot Ends: The Kernel Begins](https://zhuanlan.zhihu.com/p/1968637641802097390)
- [从 vmlinuz 到 eBPF：Linux 内核内部究竟运行什么？From vmlinuz to eBPF: What Actually Runs Inside the Linux Kernel](https://zhuanlan.zhihu.com/p/1986843022072238597)
- [无状态 CPU，有状态内核：执行如何被编排 Stateless CPU, Stateful Kernel: How Execution Is Orchestrated](https://zhuanlan.zhihu.com/p/1988681224240247344)
- [内核的构建成果——逐层剖析 What the Kernel Builds — Layer by Layer](https://zhuanlan.zhihu.com/p/1988718305079490346)
- [内核执行路径：有哪些部分，在哪里运行，以及为何重要 Kernel Execution Paths: What Runs Where, and Why It Matters](https://zhuanlan.zhihu.com/p/1988901577235383314)
- [一份追踪内核执行的模板 A Template for Tracing Execution](https://zhuanlan.zhihu.com/p/1989424640616047797)
- [中断不是打断，而是设计 An Interrupt Is Not a Disruption. It’s Design](https://zhuanlan.zhihu.com/p/1991129056410894361)
- [执行是逻辑的，布局是物理的 Execution Is Logical, Placement Is Physical](https://zhuanlan.zhihu.com/p/1991200659337394095)
- [超越代码：内核路径的内在规程 Beyond Code: The Procedure Inside Every Kernel Path](https://zhuanlan.zhihu.com/p/1993639469652386366)
- [内核如何自我对话——内部通信工具 How the Kernel Talks to Itself — Tools for Internal Communication](https://zhuanlan.zhihu.com/p/1999418206796931834)
- [内核模块的交互边界：唯导出符号可见 Kernel Modules Know Each Other: Only Through Exported Symbols](https://zhuanlan.zhihu.com/p/2001674362810544622)
- [填补组件间的鸿沟 Bridging the Gaps Between Components](https://zhuanlan.zhihu.com/p/2005967786418145218)
- [超越 libc：用户空间如何真正与内核对话 Beyond libc: How User Space Really Talks to the Kernel](https://zhuanlan.zhihu.com/p/2010039299517728400)
- CPU 不搬运数据——但没有它万物皆止 The CPU Doesn’t Move the Data — But Nothing Moves Without It
- 时间与精度：内核视角下的 CPU 执行 Time and Precision: The Kernel’s View of CPU Execution
- 内核在虚拟化中的角色：理解 KVM The Kernel’s Role in Virtualization: Understanding KVM
- 两个世界，一颗CPU：虚拟化中的根模式与非根模式 Two Worlds, One CPU: Root and Non-Root Operation in Virtualization
- 内核与VirtIO：无需仿真的网络驱动 The Kernel and VirtIO: Network Drivers Without Emulation
- 万物仍经其手 All That Still Runs Through It
- 对齐即理解 Alignment Is Understanding
- 如果内核并非由Linus创造和维护？ What If the Kernel Wasn’t Created and Maintained by Linus?
- 配置不是定制，而是内核的身份标识 Configuration Isn’t Customization. It’s Identity for the Kernel
- 内存生命周期及其塑造者 Memory Lifecycle and the Roles That Shape It
- 中断如何改变却未改变 How Interrupts Changed Without Changing
- 同步不止于并发 Synchronization Beyond Concurreny
- 无关炒作，唯硬件是从 It Was Never About Hype. It Was Always About Hardware
- 从意图到I/O：内核如何看待文件、磁盘与设备 From Intent to I/O: How the Kernel Sees Files, Disks, and Devices
- 内核之魂——效率至上，而非守旧：为何内核坚守C语言 The Kernel In the Mind — Efficiency, Not Legacy: Why Kernels Stay in C

送礼物

还没有人送礼物，鼓励一下作者吧

[编辑于 2026-02-25 17:33](//www.zhihu.com/question/58121772/answer/1914708043062556662)・江苏

​8 条评论​484 ​1 ​分享

​​

收起​