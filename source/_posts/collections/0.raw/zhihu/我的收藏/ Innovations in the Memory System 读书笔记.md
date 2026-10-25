---
title: (1 条消息) Innovations in the Memory System 读书笔记
date: "2024-01-24 00:00:00"
updated: "2024-01-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Innovations-in-the-Memory-System-读书笔记/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/678371396
---


**硬件相关的就看个乐呵。
思路可以借鉴：
调度：（前面几本书说了很多，这里不说细节了）负载分类，不同资源需求，如何利用调度请求和目标端的性质（本书特指内存访问和 bank 结构），准确定义出调度的质量指标，与上下游组件一起构建竞争力。
数据放置：分析访问模式，迁移，冷热，容量，压缩，带宽，成本，能源效率。
NDP 近数据计算：高并行度，高带宽。（如果有机会值得详细研究一遍）
存储安全，可信计算：不太懂。  

- [1 Introduction](https://zhuanlan.zhihu.com/write#1)
- [2 Memory System Basics for Every Architect](https://zhuanlan.zhihu.com/write#2)
- [3 Commercial Memory Products](https://zhuanlan.zhihu.com/write#3)
- [4 Memory Scheduling](https://zhuanlan.zhihu.com/write#4)
- [5 Data Placement](https://zhuanlan.zhihu.com/write#5)
- [6 Memory Chip Microarchitectures](https://zhuanlan.zhihu.com/write#6)
- [7 Memory Channels](https://zhuanlan.zhihu.com/write#7)
- [8 Memory Reliability](https://zhuanlan.zhihu.com/write#8)
- [9 Memory Refresh](https://zhuanlan.zhihu.com/write#9)
- [10 Near Data Processing](https://zhuanlan.zhihu.com/write#10)
- [11 Memory Security](https://zhuanlan.zhihu.com/write#11)
- [12 Closing Thoughts](https://zhuanlan.zhihu.com/write#12)

#### 1 Introduction

- 创新转向

- DPU/GPU/ASIC
- memory system

- 论文评论

- 以前经常用来拒绝的理由：内存行业非常厌恶成本和变革，他们永远不会考虑这样的想法。。。

本书主要关注：

- 调度
- 数据放置
- 压缩
- bank 结构
- 网络互联
- 可靠性
- DRAM refresh
- NDP（近数据计算）
- 安全
- 作者认为 schedule 和 refresh 已经被解决了

#### 2 Memory System Basics for Every Architect

#### 2.1 DRAM vs. SRAM

- DRAM 相比 SRAM：高密度，低成本
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f9701f8f540f.jpg)

- DRAM 需要 refresh，因为电容会泄漏

- 甚至数据会错乱，参考 [Row hammer 笔记](https://link.zhihu.com/?target=https%3A//github.com/rsy56640/paper-reading/tree/master/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/content/Flipping%2520Bits%2520in%2520Memory%2520Without%2520Accessing%2520Them%2520-%2520An%2520Experimental%2520Study%2520of%2520DRAM%2520Disturbance%2520Errors)，我还没在真实场景中见过
- 提高 refresh rate 可以缓解，但是在数据中心层面增加功耗成本

#### 2.2 Memory Channel

- DRAM controller 单向操控内存

- 注：印象里有种说法是，ctrl 是异步的，与内存之间没有控制命令同步机制，需要内存厂商提供在任何场景下（考虑压强，温度）成立的延迟保证，ctrl 用这个延迟来当做同步点

#### 2.3 DDR Standards

#### 2.4 DIMMs, Ranks, Banks, Mats

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2086c58d0566.jpg)

- DIMM 包含 2 rank（如图显示 1 个 rank）
- rank 包含 （如图）8 bank
- channel：共享一组总线
- memory pipeline

- （共享）address/command bus, 1ns
- （rank 内部）pick data, 35ns
- （共享）data bus, 5ns
- 需要提高 pick data 的并行度

#### 2.5 Row Buffers

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e318f349c06c.jpg)

- Row Activation 通过 Row Address Strobe (RAS)，13ns
- Column Address Strobe (CAS) 选择数据到 row buffer, 13ns
- precharge，为下一次读取新数据清空，13ns
- DRAM bank latency
- CAS 如果行命中

- RAS + CAS 如果已经 precharged 成空行
- PRE + RAS + CAS 发生冲突
- 另外 DRAM ctrl 排队延迟 60ns，数据总线 4ns，访问 off-chip 可能超过 100ns

#### 2.6 Capacity vs. Energy

mats 的组织和能耗，不太懂

#### 2.7 Address Mapping

- row buffer hit 友好：连续 cacheline 可以放在同一个 row

- `row : rank : bank : channel : column : blkoffset`

- parallelsim 友好：连续 cacheline 可以放在不同 bank

- `row : column : rank : bank : channel : blkoffset`

- 参考

- Physical Address Decoding in Intel Xeon v3/v4 CPUs: A Supplemental Datasheet
- How physical addresses map to rows and banks in DRAM
- L3 cache mapping on Sandy Bridge CPUs
- Agner`s CPU blog - Test results for Intel's Sandy Bridge processor
- intel：spectre&Meltdown侧信道攻击（五）—— DRAM address mapping

#### 2.8 Scheduling

- 目标：性能，能耗，公平性
- open/close-page policy：是否 lazy/eager precharge

- 需要判断 locality，延迟，功耗

- 读写需要转换 data bus 方向，总线周转时间 7.5ns

- read 优先，write 有 buffer，满了 batch 操作

- 调度请求，利用 row buffer hit
- 通知 refresh
可以定义一个 batch window，在里面施加一些调度策略：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_649360eaf907.jpg)

- 利用 row buffer hit 重排请求
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e83753ddfec8.jpg)

- 按照 core 维度定义优先级，并且重排
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fd8922c5d3ce.jpg)

- 分辨混部计算负载类型，对于 non-intensive 并且 vulnerable 提升服务优先级；intensive 就轮流给 quota。这样保证了响应时间和带宽的公平性。

#### 2.9 DRAM Timing Parameters

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_82800227d10b.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6047964ab569.jpg)

> Print out Table 2.1 as a handy cheat sheet. Feel free to casually mention tFAW at the next grad student party to establish your very coveted social status as a DRAM guru.

#### 3 Commercial Memory Products

> 不太懂，看个乐呵。  

创新趋势从 cpu 转向 memory

#### 3.1 Basic DDR3/DDR4 Channels and DIMMs

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d62c2aab184a.jpg)

- channel 更高频率导致更少的 DIMM pre channel（为什么），导致带宽和容量的增长无法同时兼顾
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b5e3c8285b6e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_54ec1153afe8.jpg)

#### 3.2 DDR Deviations for Higher Capacity and Bandwidth

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_233884176579.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_65407788e2d3.jpg)

#### 4 Memory Scheduling

判断：cpu 只提供 addr，将底层控制留给 DRAM controller。

#### 4.1 Memory Scheduler Basics

DRAM ctrl 清楚 bank 的状态，将内存读写请求分解成对应 bank 操作发送到 bank 队列。DRAM ctrl 允许调度重排，bank 队列层面顺序执行。

#### 4.2 Early Multi-Core Memory Schedulers

考虑整体 QoS：优先级，响应时间，带宽份额，总吞吐量。

根据带宽份额的边际效用自适应调节，保证整体服务质量。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_649360eaf907.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e83753ddfec8.jpg)

- 定义一个 batch window，优先执行这一批
- 利用 row buffer hit 重排请求
- 考虑 thread rank 优先级，请求 age
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fd8922c5d3ce.jpg)

- 将计算负载分类为延迟敏感和带宽敏感
- 延迟敏感的优先级高
- 带宽敏感按照 nice 分配带宽份额
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3981e03fa971.jpg)

- 分两组

- interference-causing 干扰组
- interference-vulnerable 易受干扰组

- vulnerable 调度优先级更高
- 组内按照 row buffer hit 和 request age 调度
- 分组采用启发式方法：在连续窗口内统计负载的带宽占用，如果高认为是干扰组
大多数调度策略的差异不大，主要考虑：

- row buffer locality
- read/write 总线切换
- 是否需要 early precharge
- 是否需要 early activation
- 掩盖 refresh
- 公平性
- 能源

#### 4.3 Co-Designed Schedulers

- LLC

- 写时检查 LLC 是否有相邻 dirty 和 to-be-evicted，看看是否可以 coalesce

- DRAM chip

- Staged Read 架构，读写总线切换（没看懂）

- prefetch

- 考虑 prefetch 和 demand fetch 的服务质量

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d9d8a22e2ad7.jpg)

- addr mapping & prefetch

- 同时兼顾 row buffer locality 和 bank level parallelism，比如上图连续 4 个 cacheline 放在一个 bank
- 观察：大多数 row buffer hit 来源于 stride prefetch。可以利用 POWER6 multi-line prefetch 一次读完然后 precharge。（这里似乎只是借用了这种方式）
- 翻了一下 POWER 8 Ch10.1.23 只看到说 prefetch 有一种 batch 并且是分层渐进的模式    

- multi DRAM ctrl

- 调节不同 channel 负载，数据迁移，cost-based page coloring，NUMA affinity

#### 4.4 Discussion

- 调度策略本身已经演进到头了
- 考虑 HBM，3d-stacking 新兴内存系统
- 与上下游其他组件拉通设计，构建竞争力

#### 5 Data Placement

#### 5.1 Data Interleaving

- 访问多个 cacheline 的 3 种模式

- bank-level parallelism
- row buffer locality
- row buffer conflict,需要避免

- 用 XOR 来分散请求到不同 bank

- bank bit 和其他 bit

- channel 负载
- core 到 DRAM ctrl 的 NoC 延迟
- 优先考虑 bank-level parallelism，而不是 row buffer locality

- 多核负载更容易产生 row buffer miss 而不是 hit

#### 5.2 Memory Compression

在远离计算的存储层级，密度比延迟重要**。

参考 [rsy56640：A Primer on Compression in the Memory Hierarchy 读书笔记](https://zhuanlan.zhihu.com/p/678371278)，大部分都有覆盖。

#### 5.2.1 IBM MXT

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_62e971d1aa48.jpg)

#### 5.2.2 Ekman and Stenstrom

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_97aa47946928.jpg)

#### 5.2.3 Linearly Compressed Pages (LCP)

#### 5.2.4 Nearly Overhead-Free Memory Compression

服务质量，成本，能源效率

#### 5.2.5 PTMC

#### 5.2.6 Active Memory Expansion in the IBM Power Processors

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ed49fff4126.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b61d0d233ac1.jpg)

- memory 分为 2 个池：压缩，未压缩
- 目标：提高容量

- 而不是提高带宽，并行性，可靠性

- 热 page 放在未压缩，保证延迟
- 冷 page 放在压缩
- kernel 配合保证 transparent migration

#### 5.3 Discussion

- 数据放置策略：考虑 parallelism 和 locality
- 压缩：考虑容量，成本，带宽，可靠性，安全性

#### 6 Memory Chip Microarchitectures

DRAM march 比较神秘，不为圈外人理解。。

#### 6.1 Basics of DRAM Chip Microarchitecture

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01035c13053a.jpg)

- RAS (row address strobe)

- 激活 bank 中的 1 个 subarray

- CAS (column address strobe)

- 识别 subarray 中的 1 个 row

- 硬件工艺，看不懂

#### 6.2 DRAM Chip Innovations

- activate/precharge 功率

- 减少 column 宽度
- 降低等待时间，增加传输时间
- EC 变得复杂
- bitline 分段

- subarray 并行

- 不同 subarray 分别执行 activate/precharge

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d37e6121bccd.jpg)

- 可变延迟

- 数据冷热迁移
- 管理困难

#### 6.3 Discussion

- 商业吸引力：功率，并行性
- 商品 DRAM 行业利润率很低，DDR chip 改进空间小
- 新兴存储介质的改进空间大

#### 7 Memory Channels

cpu 到 DRAM 之间 data movement 瓶颈在于 off-chip link。

interconnection 影响带宽，延迟，容量。

#### 7.1 The Basics of Parallel and Serial Interconnects

频率，能量，距离，空闲开销

#### 7.1.1 Parallel Buses

#### 7.1.2 Serial Buses

#### 7.1.3 Discussion

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5eac62ca83e7.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c08a9270ac57.jpg)

#### 7.2 Memory Interconnect Innovations

#### 7.2.1 Recent Work

- 并行链路适合 cpu 延迟敏感
- 串行链路适合 gpu 带宽敏感
- 压缩，能量，带宽
- 异构互联，qos

#### 7.2.2 Discussion

- 链路

- 串行/并行
- 带宽
- 编码

- 现有成果：自适应节流，编码
- 未来突破：近数据计算，减少数据移动

#### 8 Memory Reliability

- SECDED：64b data + 8b code

#### 8.1 Basics of DRAM Errors

- 硬错误：永久损坏的 bit/pin
- 软错误：瞬态的 bit flip
- 错误原因

- 制造缺陷
- 高能粒子撞击
- 磨损
- 噪音

- 错误性质

- 可纠正的 correctable error (CE)
- 已检测但未纠正的 detected but uncorrected error (DUE)
- 静默数据损坏 silent data corruption (SDC)

- DRAM 错误类型

- single/double/multiple-bit
- row/column/bank/pin/chip

观察：

- 大多数错误都是 single-bit

- Hamming code，m code 保护 k data，2^{m-1} >= m + k

- multiple-bit 错误具有空间相关性，通常是 row hammer
- 地理海拔高度影响错误率

#### 8.2 Memory Reliability Innovations

- ECC 演进
- 3d-stacking 可靠性/性能

#### 8.3 Discussion

- 趋势：DRAM 错误率增加，可靠性非常关键

- 原因是啥，晶体管密度？

- 可靠性还要顾及：存储开销，带宽开销，数据访问粒度/并行性，错误率

#### 9 Memory Refresh

DDR 标准要求每个单元 64ms 内刷新，指令间隔 7.8us

#### 9.1 Refresh Basics

- 频率

- 温度，功耗，故障率

- tRFC

- refresh 时停止服务，刷新周期 tRFC

- 刷新惩罚

- cpu 队列深度，交错 refresh
- 服务不可用时间占比：tRFC/tREFI

- DRAM ctrl 只下发指令，DRAM chip 自己管理 refresh
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4dd212dd6925.jpg)

#### 9.2 Refresh Innovations

#### 9.2.1 Empirical Studies and Retention Times

- 弱单元会拉高频率，增加功耗成本
- 识别弱单元，动态频率

#### 9.2.2 Alternative Hardware Techniques

#### 9.2.3 Alternative Software Techniques

#### 9.2.4 Leveraging Charge in Cells

#### 9.3 Discussion

- 隐藏 refresh 延迟
- refresh 功耗

#### 10 Near Data Processing

> 看不懂，如果以后有机会可以再看，这章是最值得重复研究的。  

- 3d-stacking 和 NVM 兴起引发了对近内存计算的兴趣（为啥？）

- The Intel 2022-09 ISA Extensions 引入新指令 remote atomics，疑似计算下推
- IBM POWER9 Processor User’s Manual Ch10.8 这个算不算计算下推？

- In/Near-memory process 的区别

- near 表示 compute 和 memory 在不同的 die

#### 10.1 NDP Implementations

两种形式

- 3D-stacking，高带宽，高成本
- 非 3D-stacking，依赖新 DIMM

#### 10.1.1 3D Stacked Architectures

- 优势

- 高并行度，高带宽，低功耗 per instr

- 适合 GPU-like 计算

#### 10.1.2 Tight Coupling on a DIMM

#### 10.2 In-Situ Implementations

- 宏观上看，从存储到计算的数据链路宽度越来越窄
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d12e87643036.jpg)

- 电流模拟值转换为数值

#### 10.3 Programming Models and Applications

- 软件变化：模型抽象，负载，静默/运行时

#### 10.3.1 Programming Approaches

- 类似 MapReduce
- NDP 基础上提供驱动，模拟以太网集群，相当于 MPP

#### 10.3.2 Broadening the Scope of NDP with Additional Workloads

有点想法，但看不太懂。

- SSD，DB，AI，图计算

#### 10.4 Discussion

- NDP 研究和商业化才刚刚起步
- 集成到 SRAM/DRAM/NVM
- 商业产品，软件变革

#### 11 Memory Security

- 基本原语假设

- 处理器给出的数据已经加密
- HW 和 OS 保证鉴权，通过验证才能从处理器读取和解密数据

- side-channel attack

- 电磁辐射
- 功率变化
- 内存活动
- 内存访问模式
- 投机执行

- 内存漏洞

- memory timing channel

- 我猜就是 EVICT + TIME 那种形式

- memory integrity violation

- 攻击者可以修改返回给处理器的数据

- memory access pattern leakage

- 地址泄漏

#### 11.1 Memory Timing Channels

- 判断 cache latency
- 考虑 cache, bank, DRAM mapping 等 march 特征
- 多租户调度时有可能泄漏其他租户的信息！！

- （这里可能有些讲究）
- 重排请求，并且隐藏调度信息

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fc31ec37090b.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_397b4e878c32.jpg)

- 访问分区，每一轮调度一个租户只能访问某个指定分区，各租户隔离，下一轮调度分区轮换

#### 11.2 Oblivious RAM (ORAM)

- 攻击分析指标

- reuse distance
- 读写比例
- temporal/spatial locality
- page 分布

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b9f5a2495dda.jpg)

- 感觉有点像 shrubs tree root set 和 VSA 那一套逻辑

#### 11.3 Memory Integrity

- 处理器读数据错误

- 读数据带上 MAC 和 addr 校验，重放攻击
- Intel SGX

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_52233e41c6a7.jpg)

- 读取数据时带上整条链路校验
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_25106639ec3f.jpg)

- Intel SGX 看不懂
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4035799e10de.jpg)

- 看不懂

#### 11.4 Impact of Smart Memories

#### 11.5 Other Memory Security Issues

#### 11.6 Discussion

- 完整性
- 代价，商业吸引力

#### 12 Closing Thoughts

- 发展趋势：密度 -> 扩展，附加价值
- 层次结构复杂化：NVM, 3D-stacked HBM, HMC
- 数据移动成本：NoC, DIMM
- 容错
- refresh，能耗
- 内存调度：发展到头了
- 压缩，可靠性，安全性
- NDP 近数据计算
