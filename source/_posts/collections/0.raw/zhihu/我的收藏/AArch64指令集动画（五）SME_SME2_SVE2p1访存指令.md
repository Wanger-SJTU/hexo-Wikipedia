---
title: AArch64指令集动画（五）SME/SME2/SVE2p1访存指令
date: "2025-11-28 00:00:00"
updated: "2025-11-28 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/AArch64指令集动画(五)SME_SME2_SVE2p1访存指令/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1956467180234318221
---


AArch64指令集动画（五）SME/SME2/SVE2p1访存指令

非典型程序员

编程，手工，轮滑

收录于 · ARMv9架构学习笔记

7 人赞同了该文章

​目录

本篇介绍SME/SME2/SVE2p1指令集引入了对ZA矩阵和SVE向量寄存器的load/store指令，对应于Arm-ARM（L.a）的C3.4.1-C3.4.3。

矩阵向量load/store指令（C3.4.1）
LDR从指定内存位置连续读取数据，并回写到ZA矩阵的指定行的元素。STR将ZA矩阵的指定行的元素回写到指定的内存位置。指令不受谓词控制。指令访问的内存位置由标量基地址加立即数索引指定。4比特立即数索引表示向量索引，而非元素索引。立即数索引值与向量元素数量相乘，然后与内存元素访问的字节数相乘。

LDR (array vector)

STR (array vector)
查表向量load/store指令（C3.4.1）
LDR从指定内存位置连续读取数据，并回写到ZT0寄存器的元素。STR将ZT0寄存器的元素回写到指定的内存位置。指令不受谓词控制。指令访问的内存位置只由基地址寄存器决定。

ZT0寄存器宽度固定为512比特。考虑到动画的观感，我假设内存宽度是128比特。ZT0寄存器的load和store需要4笔内存事务。 

LDR (table)

STR (table)
多个SVE向量的连续load/store指令（C3.4.2）
SME2引入了操作多个SVE向量寄存器的load/store指令。这些指令一次性load/store多个向量寄存器的值，以适配AI应用引入的高带宽需求。

连续的多个SVE向量的连续load/store指令（C3.4.2.1）
LD1[B|H|W|D|]和LDNT1[B|H|W|D]从指定内存位置连续读取数据元素并回写到两个或四个向量寄存器的元素。ST1[B|H|W|D]和STNT1[B|H|W|D]将两个或四个向量寄存器的元素回写到指定内存位置。指令受计数器形式的谓词控制，不活跃的目的向量元素清零。LDNT1*和STNT1*指令是非时间局部性的load/store指令。

动画中不展示将计数器形式的谓词解码为掩码形式的谓词的过程。 指令访问的内存位置由以下寻址模式确定：

- 标量基地址加立即数索引。4比特立即数索引表示向量索引，而非元素索引。立即数索引值与向量元素数量相乘（与谓词无关），然后与内存元素访问的字节数相乘。

LD1B, LD1D, LD1H, LD1W (scalar plus immediate, consecutive registers)

ST1B, ST1D, ST1H, ST1W (scalar plus immediate, consecutive registers)
- 标量基地址加标量索引。标量索引表示元素索引，与内存元素访问的字节数相乘。 

LD1B, LD1D, LD1H, LD1W (scalar plus scalar, consecutive registers)

ST1B, ST1D, ST1H, ST1W (scalar plus scalar, consecutive registers)
跨步的多个SVE向量的连续load/store指令（C3.4.2.2）
LD1[B|H|W|D]和LDNT1[B|H|W|D]从指定内存位置连续读取数据元素并回写到两个或四个向量寄存器的元素。ST1[B|H|W|D]和STNT1[B|H|W|D]将两个或四个向量寄存器的元素回写到指定内存位置。指令访问的向量寄存器不是连续的，而是由间隔的（两个寄存器变形间隔8个寄存器；四个寄存器变形则间隔4个寄存器）。指令受计数器形式的谓词控制，不活跃的目的向量元素清零。LDNT1*和STNT1*指令是非时间局部性的load/store指令。

动画中不展示将计数器形式的谓词解码为掩码形式的谓词的过程。 指令访问的内存位置由以下寻址模式确定：

- 标量基地址加立即数索引。4比特立即数索引表示向量索引，而非元素索引。立即数索引值与向量元素数量相乘（与谓词无关），然后与内存元素访问的字节数相乘。

LD1B, LD1D, LD1H, LD1W (scalar plus immediate, strided registers)

ST1B, ST1D, ST1H, ST1W (scalar plus immediate, strided registers)
- 标量基地址加标量索引。标量索引表示元素索引，与内存元素访问的字节数相乘。 

LD1B, LD1D, LD1H, LD1W (scalar plus scalar, strided registers)

ST1B, ST1D, ST1H, ST1W (scalar plus scalar, strided registers)
矩阵块切片load/store指令（C3.4.2.3）
LD1[B|H|W|D]从指定内存位置连续读取数据元素并回写到ZA矩阵的指定tile的指定行或指令列的元素。ST1[B|H|W|D]将ZA矩阵的指定tile的指定行或指定列的元素回写到指定内存位置。指令受谓词控制，不活跃的目的向量元素清零。

指令访问的内存位置由标量基地址加标量索引决定。标量索引表示元素索引，与内存元素访问的字节数相乘。 

LD1B, LD1D, LD1H, LD1W, LD1Q (scalar plus scalar, tile slice)

ST1B, ST1D, ST1H, St1W, ST1Q (scalar plus scalar, tile slice)
SVE2p1引入的四字元素的load/store指令（C3.4.3）
SVE2p1为SVE向量寄存器的load/store指令引入了128比特元素宽度的变形。

四字元素的连续load/store指令（C3.4.3.1）
LD1[W|D]从指定内存位置连续读取数据元素并回写到单个向量寄存器的元素。ST1[W|D]将单个向量寄存器的元素回写到指定内存位置。指令受谓词控制，不活跃的目的向量元素清零。

指令访问的内存位置由以下寻址模式确定：

- 标量基地址加立即数索引。4比特立即数索引表示向量索引，而非元素索引。立即数索引值与向量元素数量相乘（与谓词无关），然后与内存元素访问的字节数相乘。

LD1D, LD1W (scalar plus immediate, single register)

ST1D, ST1W (scalar plus immediate, single register)
- 标量基地址加标量索引。标量索引表示元素索引，与内存元素访问的字节数相乘。 

LD1D, LD1W (scalar plus scalar, single register)

ST1D, ST1W (scalar plus scalar, single register)
四字元素的Gather-Load/Scatter-Store（C3.4.3.2）
LD1Q从多个内存位置读取元素数据并回写到目的向量的元素中。ST1Q将源向量的元素回写到多个内存位置。指令受谓词控制。不活跃元素对应的地址不会被。

每一个元素对应的内存位置相互独立，由标量基地址加标量索引决定。

LD1Q

ST1Q
四字元素的结构体load/store指令（C3.4.3.3）
LD[2|3|4]Q从内存中连续读取多个结构体，每个结构体包含两个/三个/四个元素，并将结构体回写到两个/三个/四个向量寄存器中的相同元素。ST[2|3|4]Q将两个/三个/四个向量寄存器中保存的结构体回写到连续的内存位置。指令受谓词控制，每个谓词元素适用于内存中的单个结构体，或者等效于两个、三个或四个向量寄存器中的相同元素。

指令访问的内存位置由下列寻址模式决定：

- 标量基地址加立即数索引。立即数索引值是向量索引，索引与向量元素数量相乘（与谓词无关），然后与内存元素访问的字节大小相乘。

LD2Q, LD3Q, LD4Q (scalar plus immediate)

ST2Q, ST3Q, ST4Q (scalar plus immediate)
- 标量基地址加标量索引，与内存元素访问大小的字节数相乘。 

LD2Q, LD3Q, LD4Q (scalar plus scalar)

ST2Q, ST3Q, ST4Q (scalar plus scalar)

编辑于 2025-11-28 10:30・新加坡
ARM架构

寻址方式

向量处理器（SIMD指令集）

​赞同 7​​添加评论​31 ​喜欢​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

非典型程序员
编程，手工，轮滑

回答
8
文章
43
关注者
999

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

AArch64指令集动画（四）SVE/SVE2访存指令
本篇介绍SVE/SVE2指令集引入了对SVE向量寄存器和谓词寄存器的load/store指令，对应于Arm-ARM（L.a）的C3.3.1-C3.3.7。 与通用寄存器load/store指令类似，指令访问内存的元素大小与向量元素…

非典型程序员

工作中常用的kubectl命令
Java老兵一枚

Alluxio中的元数据同步：设计、实现和优化
Alluxio

Faiss on GPU/CPU
前言作为目前ANN领域最受社区欢迎的框架之一，[Faiss]( https://github.com/facebookresearch/faiss)为初学者提供了轻量、简单、高效的检索框架，支持CPU和GPU的硬件计算架构，具有用户友好…

LMJ1995