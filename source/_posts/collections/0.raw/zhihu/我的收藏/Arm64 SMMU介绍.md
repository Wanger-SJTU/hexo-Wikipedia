---
title: (2 条消息) Arm64 SMMU介绍
date: "2025-03-19 00:00:00"
updated: "2025-03-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Arm64-SMMU介绍/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/31339405896
---


SMMU是IOMMU在arm64体系结构中的叫法，IOMMU的作用是将系统中DMA的访存和物理内存单元相连，完成DMA访存的虚拟地址对物理地址的映射.

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_324f7a4cfb46.jpg)

这样的话，其实好处就是：

1）DMA所在外设不需要连续物理地址的要求，在物理内存不连续的情况下也能访问连续虚拟地址

2）SMMU对访存加一层控制，形成保护，如读写权限，cache与否

3）做到不同外设访问地址空间的隔离

4）支持虚拟化等功能，如同一个qemu虚拟机中不同进程使用同一ip，可以引入IPA，保证2个进程的内存不

相互干扰。简单来说就是translation，isolation，protection，下面我们从架构层和软件层了解下SMMU

### 一.架构层

首先从架构层来说，官方文档当然是ARM的，这里只贴下链接[Documentation - Arm Developer](https://link.zhihu.com/?target=https%3A//developer.arm.com/documentation/ihi0070/ga)

，随后给下简介，我们对于架构层的了解，主要在于知道这个ip可能具有的能力到哪里，这可能为我们之后遇到问题提供一些解决的思路。

#### 1.1 2 stage translation

首先如下图所示，SMMU是有选择2 stage translation的控制能力的，这个控制能力由STE.config来完成设置。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_73d6c3a42238.jpg)

### 1.2 security&non-security

对于同一个SMMU而言，其由secure和unsecure两种内存管理模式，我们下面说的streamID，也是per security的。

#### 1.3 StreamID

SMMU可以用StreamID区分不同的device，我们可以配置不同的device为特定的ID,之后配置SMMU对于特定StreamID的 translation table和属性。软件上StreamID作为STE TABLE的index。

SubstreamID作为子索引，软件上是CD tabel的index，用来区分同一虚拟机下不同process。

#### 1.4 Fault model

SMMU在遇到错误后，可以有2种相应模式

1）Terminate Model:记录错误，发出中断，停止处理

2）Stall Model:记录错误，发出中断，CPU处理完后可以Resume SMMU，再次尝试翻译

### 1.5 ByPass

分为3类：

stage bypass，如1.1说STE.config控制

stream bypass，也是STE.config控制

globalPass，直接不开SMMU

#### 1.6 映射结构

这部分主要分为2层，STE作为第1层，CDs作为第2层

STEs：

STRTAB_BASE配置到SMMU的寄存器中，如下是简单的LinearStreamTabel模式（模式通过一个寄存器里的FMT属性配置），这个模式有个缺点，就是需要连续内存存放STRTAB_BASE

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3d533a9341f7.jpg)

另外一种省连续内存的方式，使用streamID部分bit索引第一级STRTABLE，剩余bit索引第2级STRTABLE,如下是配置SPLIT=8的模式

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2a3c26940b12.jpg)

CDs：

对于CD，我们有如下3种层次配置，在STE entry可以做相应配置

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_01e25e3ebb1b.jpg)

TranslateBase

如上CD中的TTB0指向translate table的基地址，之后是配置level的翻译工作,但TTB1指向的是什么我还不清楚。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_491c38bcf732.jpg)

### 软件层

TO BE CONTINUE