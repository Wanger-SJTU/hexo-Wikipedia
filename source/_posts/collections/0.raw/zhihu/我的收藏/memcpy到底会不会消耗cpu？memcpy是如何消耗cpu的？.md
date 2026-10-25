---
title: memcpy到底会不会消耗cpu？memcpy是如何消耗cpu的？
date: "2024-05-17 00:00:00"
updated: "2024-05-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/memcpy到底会不会消耗cpu-memcpy是如何消耗cpu的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/654514738/answer/3500963676
---


为什么会有那么多回答认为memcpy不消耗CPU？主流的C库，不管是MSVC，glibc，用的要么是repz movs，要么是SIMD指令，这些指令都是消耗CPU的。

有回答里说可以用DMA，怎么说呢，从CPU的角度来看DMA<strong>非常慢非常慢非常慢</strong>的……（重要的事情说三遍）

DMA操作必须在内存里，而不是在缓存里，如果要做DMA，要把MMU属性设置non-cache，CPU访问non-cache内存的速度，大概是正常内存的<strong>几分之一</strong>。

多数情况下，DMA内存还要求对齐，要么是4K，要么是cache line<strong>对齐</strong>，否则要再搬迁一次数据。

写完数据，还要用<strong>memory barrier</strong>来保证不乱序。

DMA是一个<strong>操作系统行为</strong>，不是CPU行为，因为DMA要使用<strong>中断</strong>进行同步，中断都是操作系统接管的，因为是操作系统行为，所以就要通过系统调用<strong>进入内核态</strong>，还要初始化dma的数据结构。

发起DMA传输以后，确实不消耗CPU了，但是dma sync wait阶段，是要等待DMA中断完成的，对于CPU来说，仅仅CPU中断指令的开销就是几十个cycle，再算上中断里面的同步指令，上百个cycle都不止。

总结一下，为了用DMA实现memcpy，需要的开销有：

## 0. non-cache内存访问，是正常速度的几分之一


## 1. memory barrier指令，大概相当于几条到十几条正常指令


## 2. 进入内核态（系统调用），大概相当于几十条到上百条正常指令


## 3. 初始化DMA数据结构（包含若干函数调用），大概几十条指令


## 4. DMA中断处理，上百条指令


## 5. 再加上这期间CPU的任务调度开销，几十到上百条指令


算一下，额外的开销估计需要几百条到上千条指令，这还不算把数据从non-cache内存里取出来需要的时间。

这里还涉及到系统调用，任务调度等等一大堆的额外支持，要知道memcpy原本就是一个用户态的，跟操作系统无关，跟硬件无关的函数。

所以，用repz movs就好了，哪怕用未经优化的for循环，也比DMA要快。

我记得操作系统课还是计算机接口/组成原理课上讲过，DMA主要用于跟外设通信。