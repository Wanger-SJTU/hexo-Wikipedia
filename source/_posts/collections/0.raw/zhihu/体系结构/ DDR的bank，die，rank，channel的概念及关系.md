---
title: (1 封私信) DDR的bank，die，rank，channel的概念及关系
date: "2025-09-17 00:00:00"
updated: "2025-09-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/DDR的bank,die,rank,channel的概念及关系/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1951615520425087344
---


#### 通俗的比喻

如果把读写DDR看成是公司组织旅游

Die等于公司请的旅游大巴，8部大巴车等于8个Die。

Rank就等于是公司，4个公司（团体）等于4个Rank。

Channel等于公路，有2个公路可以去到景点等于有2个Channel。

Bank呢？，等于大巴车上的区域，大巴车上有一个通道，把座位分成2个区域，就是2个Bank。

#### 主要区别对比

以下表格总结了 ，Bank，Die，Rank，Channel的本质层级，数据宽度及关系。

概念Bank (存储体)Die (晶粒)Rank (秩)Channel (通道)本质逻辑分区，Die内部的功能单元。物理实体，一个独立的集成电路芯片。逻辑单元，内存控制器操作的基本单位CPU与内存之间的 数据传输总线层级内部组成，被包含于一个Die之中。外部容器，包含多个Bank。包含1个或多个Die内存组织结构的 最顶层数据宽度较小 (如 x4, x8, x16)与die的宽度一致较小 (如 x4, x8, x16)与Bank的宽度一致包含的die的宽度相加，一般64BIT，如果使用ECC（Error-Correcting Code，纠错码）内存，宽度会扩展到72位channel的数据宽度通常为64位（8字节）如果使用ECC（Error-Correcting Code，纠错码）内存，宽度会扩展到72位关系多对一。多个Bank共同构成一个Die的存储阵列。一对多。一个Die包含多个（如8, 16个）Bank。一个功能集合，由一个或1组Die构成Rank与CPU之间的通路
#### 应用与分析

DDR的bank，die，rank，channel需要在软件中配置，特别在一个平台是做多种DDR的兼容，需要正确的rank，channel，否则无法开机。

如下图DDR的结构：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_4d7bf51dca90.jpg)

图1从图1中可知，这个DDR芯片有2个Die，2个channel, 但是看不出有多少个Rank，有个方法就是看片选 CS的PIN的命名，如上图，有CS0_A,CS0_B,两个片选PIN，CS0_A中的0表示Rank的编号，A表示channel的编号。所以，这个DDR只有0号Rank，1个Rank。

比较复杂DDR的结构如下图：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_25b9d415f95e.jpg)

图2从图2中可知，这个DDR芯片有8个Die，有A,B,C,D,4个channel,  通过看片选 CS的PIN的命名：

CS0_A,  CS1_A, 

CS0_B, CS1_B, 

CS0_C,  CS1_C, 

CS0_D,  CS1_D, 

可以看出这个DDR有0号和1号两个Rank。
