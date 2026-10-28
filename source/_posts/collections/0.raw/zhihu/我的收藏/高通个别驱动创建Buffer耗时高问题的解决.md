---
title: "高通个别驱动创建Buffer耗时高问题的解决"
date: "2023-07-12 00:00:00"
updated: "2023-07-12 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/高通个别驱动创建Buffer耗时高问题的解决/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/643075021"
---


### 前言

最近在优化游戏的时候，发现在在高通特定驱动版本的机器上(855,855+等)，创建VB的耗时跟VB的数量成正比，这个应该是驱动的bug。跟官方人员确认过，确实是有这个问题，他们给的解决方案是减少Buffer的数量，经过一轮优化后，Buffer数量减少了将近30%，但是这个耗时的问题还是没能解决，在正常机型上创建100个VB的开销大约在几ms的时间，但是在有问题的机器上可以达到30多ms。那这个问题有没有可能解决呢？是有方法的，这里也把解决过程记录下，给遇到相关问题的人做个参考。

### 解决方案

### 尝试1

首先想到的是像内存管理一样预创建特定大小的Buffer，在后面所有使用到的地方直接从Pool里面去取，然后调用glBufferSubData去更新，这个时候Buffer的创建开销确实大缩短了，在framepro中基本上看不到Buffer创建的耗时，但是耗时开销转移了！转移到了创建纹理相关的操作上！！！而且耗时跟你预创建Buffer的数量成正比。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7e24630a0f4e.jpg)

创建VB开销小了很多![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2f272b254088.jpg)

创建纹理开销显著增加那这个方案看起来是行不通的。

### 尝试2

既然是跟Buffer数量成正比，那就直接减少Buffer数量，尝试像Vulkan、Metal、D3D12来管理内存，思路就是像内存管理一样创建特定大小的大Buffer，然后使用ringbuffer的方式来管理内存，通过glMapBufferRange来局部更新内容。

理论上是完全成立的，但是在实际的时候还是有不少小坑需要处理。一开始使用glMapBufferRange (`GL_MAP_INVALIDATE_RANGE_BIT`  | `GL_MAP_UNSYNCHRONIZED_BIT` ) 来更新buffer，但是发现性能出奇的差，不过同样的操作在另外一个联发科的机器上就没有问题，可能跟驱动的实现有关。

我们在来看另外一个标记GL_MAP_UNSYNCHRONIZED_BIT，这个标记的意思就是你驱动别做同步了，我自己保证数据的正确性。

`GL_MAP_UNSYNCHRONIZED_BIT indicates that the GL should not attempt to synchronize pending operations on the buffer prior to returning from glMapBufferRange. No GL error is generated if pending operations which source or modify the buffer overlap the mapped region, but the result of such previous and any subsequent operations is undefined.`

看到这个标记感觉应该能跑通了，我们使用这个标记并配合RingBuffer来实现内存的管理，这里为了保证数据准确有两个实现方式，一个是确保RingBuffer足够大，不会出现数据被写的情况，另外一个是加一个Fence来做同步，小于一定数量的时候强制等GPU执行完成。

一些处理细节：

- 因为Index Buffer相关的接口不是所有的都支持offset，所以Index buffer走预创建Buffer的方式。
- Shader里面会访问texture buffer，这个时候需要使用offset来做，为了减少Shader的修改，我们这部分数据也采用预创建buffer的方式来处理。

### 优化效果

优化前：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_78d2b2f9d1dc.jpg)

优化后：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d032a4a2a33a.jpg)

可以看到优化前有很多峰值，优化后基本上看不到创建Buffer的开销，创建纹理的开销也正常。

### 总结

因为我们是大世界游戏，所以Buffer数量比较多，容易触发这个问题。不知道有没有人遇到这个问题，以及你们是如何解决的，欢迎一起讨论，解决的方式比较Trick，这里就把它记录下来。

### 参考

- https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glMapBufferRange.xhtml
