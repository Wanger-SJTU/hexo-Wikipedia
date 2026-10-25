---
title: ARM WFI和WFE指令
date: "2024-03-13 00:00:00"
updated: "2024-03-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/ARM-WFI和WFE指令/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/686063374
---


### 1. 基本介绍

ARM有两条和低功耗相关的指令: WFI和WFE。WFI全称是Wait For Interrupt，WFE全称是Wait For Event。**这两条指令统称为WFx，可以让ARM核进入low-power standby**模式，由ARM架构定义，由ARM core实现，使用时不需要带任何参数。

ARM架构并没有规定“low-power standby state”的具体形式，**可以由ARM core自定义实现**，根据ARM的建议，一般可以实现为standby（关闭clock、保持供电）、dormant、shutdown等。但有个原则，**不能造成内存一致性的问题**。以Cortex-A57 ARM core为例，它**把WFI和WFE实现为“put the core in a low-power state by disabling the clocks in the core while keeping the core powered up**”，即我们通常所说的**standby模式**，**保持供电，关闭clock**。

接下来了解一下ARM处理器进入低功耗状态的机制。当一个处理器核的工作负载不高时，可以通过降压降频（DVFS）的方式来让处理器运行在较低频率，从而降低芯片功耗。如果处理器没有工作负载，完全空闲下来，这时就需要让处理器进入更低的功耗模式。

CPU进入空闲状态的大概顺序如下:

应用处理器（Application Processor）判断是否具备进入空闲状态的条件，如果满足条件则进行一些准备工作；发消息给系统控制器（System control processor）；等待全部操作执行完；执行WFI进入空闲状态；等待系统控制器做出下一步动作，或者关闭时钟，或者关闭电源等等。

从WFI的名字可以看出，唤醒（wake up）处理器的一个机制就是发送中断给处理器（也有一些其他的机制）。GIC中断控制器接收到中断后，产生唤醒信号给系统控制器或者是电源管理模块（Power Management Unit），系统控制器或者PMU根据处理器核的状态以及系统状态，决定下一步的动作。

WFE与WFI类似，只不过等待的是事件，也就是说系统可以通过发送事件来唤醒CPU核。**WFE的一个典型应用场景是自旋锁spinlock**。当多个核竞争同一个临界区资源时，只有一个核能获得权限，其它的核需要等待临界区资源被释放，也就是这些核“自旋”。当然操作系统也可以采取其它的处理方式，比如把时间片分给其它的应用程序。显然，应用处理器简单的“自旋”对于功耗不友好，一个解决办法就是让这些“自旋”的核进入低功耗模式，获得临界区资源的核在完成当前进程后，唤醒这些核去重新竞争临界区资源。**这时的唤醒机制不宜采取中断方式，因为效率不高。ARM采用的是事件方式，即通过执行SEV（Send Event）指令向其它应用处理器发送唤醒的事件。**

WFI和WFE还有一种变体形式，WFIT和WFET，其中的T是超时（timeout）的意思，也就是说，唤醒机制多了一种超时的方式，没有中断或者事件产生，时间到了也会发出唤醒。

### 2.不同点

**WFE状态的唤醒事件比WFI多了一个SEV指令（Send Event）**，也就是说WFE还会受控于一个1bit event register，此寄存器软件不可访问。此功能时为多核而准备的。WFE在event register为0，或为1时，其功能是不一样的。WFE的E就是指这个事件寄存器。

进一步描述：

假设两个核，分别为core1和core2，

> A、core1可以执行SEV指令更改event register，同时它可以通过TXEV硬连接到core2的RXEV更改core2的event register。
B、core1在执行WFE时，如果发现event register=1，它是不会进低功耗的，这里就是区别。

基于以上描述WFE是多核低功耗用的，举个例子：当core1和core2抢同一个资源A时，core1占据A，那core2就WFE进低功耗，等待core1的SEV发过来。

SEV指令是一个用来改变Event Register的指令，有两个：SEV会修改所有PE上的寄存器；SEVL只修改本PE的寄存器值。

### 3.使用场景

1）WFI

WFI一般用于cpu idle。

在ARM64架构中，当CPU Idle时，会调用WFI指令，关掉CPU的Clock以便降低功耗。

2）WFE

WFE的典型使用场景是在spinlock中（可参考arch_spin_lock，对arm64来说，位于arm64/include/asm/spinlock.h中）。spinlock的功能，是在不同CPU core之间，保护共享资源。使用WFE的流程是：

>  1. 资源空闲
 2. Core1访问资源，acquire lock，获得资源
 3. Core2访问资源，此时资源不空闲，执行WFE指令，让core进入low-power state
 4. Core1释放资源，release lock，释放资源，同时执行SEV指令，唤醒Core2
 5. Core2获得资源
