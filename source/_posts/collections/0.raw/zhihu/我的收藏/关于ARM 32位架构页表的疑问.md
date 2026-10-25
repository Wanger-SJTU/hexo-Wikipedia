---
title: 关于ARM 32位架构页表的疑问
date: "2025-07-29 00:00:00"
updated: "2025-07-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/关于ARM-32位架构页表的疑问/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1933578680564704490
---


最近在做页表结构相关设计，想要借鉴ARM的页表思路，发现ARM Arch32的页表一个无法理解的设计：

在Arch64中，4KB页表粒度下，每一级的索引最多9bit，这样2^9*64bit正好是4KB，即一个4KB页面正好放下一级table的所有entry，只有第一级有可能用不满9bit索引，即用不满4KB。

而在Arch32中，第一级table使用12bit索引，2^12*32bit是16KB空间，意味着必须有4个连续4KB页面才能放下一级table的所有entry，而第二级table使用8bit索引，2^8*32bit只有1KB空间。

对此设计我就有几个疑问：

1、4KB粒度管理下的系统如何保证一定能分出连续的16KB空间用来存储Level 1 Table？

2、只使用1KB的Level 2 Table难道不是一种内存的浪费？

3、为什么Level 1和Level 2不都采用10bit索引，这样正好每一级都是4KB空间，和Arch64的设计思路相同？

有大佬能解答吗

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0a2c49eff05f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_475d2ee512f5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3b214a415682.jpg)