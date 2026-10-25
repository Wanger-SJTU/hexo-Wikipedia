---
title: (2 条消息) 8张图讲清楚mmap实现原理
date: "2024-01-05 00:00:00"
updated: "2024-01-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/8张图讲清楚mmap实现原理/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/676167319
---


大家好，最近在研究Linux内核以及Linux系统编程的时候，经常会碰到mmap内存映射，mmap函数是实现高性能编程的一个关键点，下面我通过几张图详细介绍一下mmap实现原理。

<strong>（本文以64位CPU为原型讲解）</strong>

### 1.虚拟地址如何映射物理地址？

<strong>要了解mmap实现原理，首先必须了解虚拟地址如何映射物理地址，如果没掌握这个知识点，后续阅读会有很大的困难，切记！</strong>

虚拟地址映射物理地址采用的是页表机制，64位CPU采用的是4级页表。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7db74e45f5d.jpg)

64位CPU虚拟地址长度为64位，但实际只用48位就已满足虚拟地址映射物理内存的要求，如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_36c3b5a57515.jpg)

64位CPU地址空间可分为三个部分：

- 128T用户空间
- 128T内核空间
- 其他：保留空间
用户空间和内核空间共256T，2的48次方刚好为256T，所以48位地址空间能映射所有的虚拟地址。

48位虚拟地址由五部分组成：

- pgd表偏移，四级表，9位
- pud表偏移，三级表，9位
- pmd表偏移，二级表，9位
- ptl表偏移，一级表，9位
- 物理页偏移，12位
<strong>问题1：为什么pgd，pud，pmd，ptl表偏移是9位？</strong>

pgd，pud，pmd，ptl表实现原理都相同，我们以pgd来讲解。

一张pgd表对应一个物理页，一个物理页的大小为4KB，一个pgd_t表项为8个字节，一张pgd表能存储4*1024/8=512个表项。

2的9次方等于512，所以采用9位的表偏移就能索引整张表的表项。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fc1b5c25689a.jpg)

<strong>问题2：为什么物理页偏移为12位？</strong>

一个物理页为4KB，物理页访问是单字节访问，2的12次方刚好为4KB，所以物理页偏移为12位。

#### 1.1 虚拟地址映射物理地址过程

虚拟地址映射物理地址需要依次索引pgd，pud，pmd，ptl表，具体过程如下：

- <strong>步骤1：查询pgd表</strong>
查询pgd表，首先需要找到pgd表物理页首地址，pgd表物理页首地址由task_struct->mm_struct->pgd成员保存，每个进程的task_struct->mm_struct->pgd成员数值不同，所以不同的进程即使使用相同的虚拟地址也不会访问相同到物理地址。

通过pgd表首地址+虚拟地址pgd表偏移索引到pgd_t表项完成pgd表查询。<strong>步骤2：查询pud表</strong>

pgd_t表项存储的是pud表物理页首地址。

通过pud表首地址+虚拟地址pud表偏移索引到pud_t表项完成pud表查询。

- <strong>步骤3：查询pmd表</strong>
pud_t表项存储的是pmd表物理页首地址。

通过pmd表首地址+虚拟地址pmd表偏移索引到pmd_t表项完成pmd表查询。

- <strong>步骤4：查询ptl表</strong>
pmd_t表项存储的是ptl表物理页首地址。

通过ptl表首地址+虚拟地址ptl表偏移索引到pte表项完成ptl表查询。

- <strong>步骤5：映射物理地址</strong>
pte表项存储的是物理页首地址，pte+虚拟地址物理页偏移就能定位到物理地址。

注意：定位到物理地址后，虚拟地址映射物理地址的过程就已完成。

<strong>思考：64位CPU页表机制需要多少张表？</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4c3df561349a.jpg)

表的数量如下：

- pgd表1张，占用内存4KB。
- pud表2的9次方张，占用内存4KB * 512 = 2MB。

- pmd表2的18次方张，占用内存4KB * 512 * 512 = 1GB。

- ptl表2的27次方张，占用内存4KB * 512 * 512 * 512 = 512GB。
如果每张表都固定分配一个物理页，所有的表占用的内存空间已经达到500多GB，这只是一个进程占用的空间，如果有大量的进程，占用内存就非常恐怖了。

通常情况下，进程只会使用很小的内存，所以系统不会一下把所有的页表都创建出来，而是采用动态分配的方式创建，当需要访问虚拟地址时，通过缺页中断创建虚拟地址对应的各个页表。

精品文章推荐：

[一篇文章让你真正搞懂epoll机制（爆款文章）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484514%26idx%3D1%26sn%3Dc0c4c678899a3075bf898180857138da%26chksm%3Dc1d846f3f6afcfe5b91fe6f8a91481f48e535df89d5c3b95ff04c558ee3b99941e5a1a9b6f83%23rd)

[图解Linux select机制_从内核到应用（精华篇）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484523%26idx%3D1%26sn%3D89df36837af16b724f63c7d51a7f9366%26chksm%3Dc1d846faf6afcfec1c54fcc6c7a4ce2c0501a7145279df53b9df5d04d2a7bf6bedd0f6d378ed%23rd)

[Linux进程调度之完全公平调度（压箱底的干货分享）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484458%26idx%3D1%26sn%3De4e64c006d4d822c6e7c184ab50540c1%26chksm%3Dc1d846bbf6afcfad20af0a7132eca1e3fd3c765ea5d4ee4134985b2b03f2461c207239fcc208%23rd)

[图解Linux进程优先级（点赞多）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484435%26idx%3D1%26sn%3Db6f30489cf388f1024d6883abb8237c8%26chksm%3Dc1d84682f6afcf94c1af14678d5401d558d2b728f0e6c853dbe4efe02c12dfa147369ceee13f%23rd)

[图解Linux内核调度系统（干货分享）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484426%26idx%3D1%26sn%3D1874e9b0bd13082a160a7d23032d1f9f%26chksm%3Dc1d8469bf6afcf8db197c01cce1474ad53aafb2647dbbcc3a2771bd10ab8ca6a5197885e2ed4%23rd)

### 2.mmap实现原理

mmap函数是一种内存映射文件的方法，它可以将一个文件或设备映射到进程的地址空间中，使得进程可以像访问内存一样访问文件或设备。

mmap可以分为：<strong>文件映射和匿名映射。</strong>

mmap函数主要工作就是创建VMA。

#### 2.1 VMA简介

VMA（Virtual Memory Area，虚拟内存区域）是Linux内核中用于管理进程虚拟内存的数据结构。每个进程都有一个VMA链表，用于描述进程的虚拟地址空间的不同区域。

VMA包含了一段连续的虚拟地址空间，它定义了该区域的起始地址、结束地址以及一些属性信息。VMA可以表示进程的代码段、数据段、堆、栈等不同的内存区域。

VMA对应Linux内核struct vm_area_struct对象。

<strong>注意：VMA用于指导虚拟内存映射物理内存，没有VMA指导无法完成虚拟地址和物理地址映射。</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_523d1801f02e.jpg)

struct vm_area_struct结构体主要成员如下：

- vm_start：虚拟内存区域起始地址。
- vm_end：虚拟内存区域结束地址，vm_end减去vm_start为映射区域长度。
- vm_page_prot：虚拟内存访问权限，
PROT_READ：可读

PROT_WRITE：可写

PROT_EXEC：可执行

- vm_page_flags：内存映射标志，
MAP_SHARED：共享映射

MAP_PRIVATE：私有映射

- vm_ops：文件映射操作集合，匿名映射为NULL。

- vm_pgoff：文件映射文件偏移量，匿名映射无效。

- vm_file：映射文件，匿名映射为NULL。

### 3.缺页中断

Linux缺页中断是指当进程访问尚未建立映射关系的虚拟内存时，系统会触发缺页中断，并根据页面的状态来分配物理页面并建立映射关系。

通过mmap创建VMA后，我们使用VMA内存映射区虚拟地址，但此时虚拟地址不能映射物理地址，原因是映射表还没有动态创建出来。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_927a7830c7a5.jpg)

当缺页中断发生后，中断处理函数会完成虚拟地址至物理地址各映射表创建。

各映射表的创建需要task_struct->mm_struct->pgd和虚拟地址表偏移量共同完成。

完成映射表创建后，还有最后一步工作需要完成，那就是pte创建。

pte该如何创建呢？

我们接着往下看...

### 4.文件映射

文件映射可以将文件的内容映射到进程的内存空间。

文件映射pte指向文件的物理内存页，文件映射需要VMA指向对应的文件，由文件来生成物理页。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9f44539728ea.jpg)

mmap函数实现文件映射时需指定文件fd，文件偏移量，文件映射长度。

内核会根据文件fd，文件偏移量，文件映射长度填充新创建的VMA。

文件映射创建pte时根据VMA记录的文件file，文件偏移量，文件映射长度定位到具体文件以及文件偏移位置，将磁盘文件内容拷贝至物理内存页，再将物理内存页转换成pte设置进ptl表。

至此文件映射已完成，就能通过虚拟地址访问文件物理内存页。

### 5.匿名映射

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b93b8389f2eb.jpg)

匿名映射相对来说比较简单，只要在创建pte的时候，从物理内存中申请一个物理内存页，将物理内存页转换成pte设置进ptl表，就完成匿名映射。

物联网心球（嵌入式软件开发专业内容生产者）。

C/C++，Linux Bug修复秘籍，Linux基础，Linux环境编程，Linux网络编程，高性能服务器，音视频开发，网络开发，Gui开发。

原文地址：[8张图讲清楚mmap实现原理](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzkyNDIyNzU4Mg%3D%3D%26mid%3D2247484690%26idx%3D1%26sn%3D32d89f3f42f643b20a1328967bc6d5cc%26chksm%3Dc1d84783f6afce95374224e8bd7e3e6c22bd4ee7e0e09ce0216008e9c2b4a8ece87a1ff5b3c6%23rd)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_481277797e89.jpg)