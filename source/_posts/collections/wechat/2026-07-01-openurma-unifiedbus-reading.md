---
title: OpenURMA 深度解读：Unified Bus 的 clean-room 实现与远端内存访问成本拆解
date: "2026-07-01 00:00:00"
updated: "2026-07-01 00:00:00"
layout: post
permalink: /collections/wechat/2026-07-01-openurma-unifiedbus-reading/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - UB
  - RDMA
  - UnifiedBus
  - 远端内存
  - 华为
  - Scale-up
  - 网络架构
source_url: https://mp.weixin.qq.com/s/0NXD0FadkjgO6uCS28Cvow
---


# OpenURMA 深度解读：Unified Bus 的 clean-room 实现与远端内存访问成本拆解

<strong>来源</strong>: MiracleFarms

长上下文推理、KV 池化和超节点互连正在把"远端内存访问"推到更热的位置。OpenURMA 这篇论文把问题压到 64B remote fetch：如果一次小读还要走 WQE、doorbell、DMA 和 completion，RDMA 的低延迟神话会被 PCIe 往返重新收税。

## 核心数字

OpenURMA 这篇论文最醒目的数字，是 <strong>500 ns remote fetch</strong> 和 <strong>4855 倍状态缩减</strong>。但更有意思的是作者的位置。arXiv 页面显示论文只有一位作者 Bojie Li；他的公开主页和 CV 显示，他长期做数据中心网络、RDMA、SmartNIC、FPGA 网络处理和用户态网络栈，现在是 Pine AI 首席科学家，曾发表 ClickNP、KV-Direct、SocksDirect、1Pipe 等系统论文。CV 还写到，他在华为 TopMinds / 计算机网络与协议实验室期间，是 Huawei Unified Bus（UB）的关键架构师之一，做过下一代数据中心互联、uRPC、RDMA 扩展和 remote memory abstraction。

所以 OpenURMA 很难被读成一篇普通的第三方 benchmark。它更像是一个长期做 RDMA / SmartNIC / UB 相关系统的人，在离开闭源硬件和闭源代码后，基于公开规范搭出的 clean-room 原型和对照实验。

## RoCE vs UB 的两笔账

论文把 RoCE 和 UB 的差别落到两张账上：

## 1. 一个 64B remote fetch，应用看起来只是读远端内存，底下却要把操作变成 WQE、doorbell、DMA fetch、completion，再让 CPU 和 PCIe 外设来回交接

## 2. 在 1024×1024 端点规模下，RoCEv2 RC 的 per-QP 状态会涨到约 537 MB，UB / OpenURMA 同一规模只有约 110 KB


## RDMA 小请求的税：PCIe 往返

传统 RDMA 的直觉是"绕过内核、直接读写远端内存"。这句话只描述了应用看到的接口，没描述 NIC 和 CPU 之间怎么说话。RoCEv2 RC 仍然把 NIC 放在 PCIe 后面，CPU 写 Work Queue Entry，敲 MMIO doorbell，NIC 再 DMA 取 WQE，执行网络收发，最后 DMA 写 completion，CPU 轮询 CQE。

论文把这条路径拆成<strong>四次 PCIe crossing</strong>；再把 target-side NIC 读远端 host DRAM 的 DMA 显式计入，64B READ 的关键路径里，PCIe 相关成本合计约 1650 ns。

软件层优化能省下一段路，但省不掉整条路。Blue Flame inline WQE 能去掉 initiator 侧一次 WQE DMA fetch，target-side DMA、CQE 写回和 CPU poll miss 还在。论文给出的 64B pointer-chase 数据：
- RoCE DMA baseline: 2186 ns
- RoCE Blue Flame: 1686 ns
- UB URMA work-request path: 757 ns
- UB load/store path: 500 ns

Blue Flame 缩短了外设编程路径，UB 让这类小请求不再按外设编程路径走。

## Jetty / TP Channel 先把状态规模压住

RoCE QP 把应用端点和传输端点绑在一起，于是每个 (local application, remote endpoint) 都要一个 QP；规模一大，连接状态按乘法增长。

OpenURMA 对 QP 的重构有很朴素的协议分层味道：应用是谁，和传输到哪个远端 host，应该是两件事。UB 把 per-application endpoint state 放到 Jetty，把 per-remote-host transport state 放到 TP Channel，任意 Jetty 可以经共享 TP Channel pool 指向远端端点。

论文给出的状态账本很关键：Jetty MVP 每条 20B，TP Channel 每条 56B，memory-region record 每条 32B；在 (N, M)=(1024, 1024) 时，OpenURMA 的总状态是 110.6 KB，OpenRoCE 的 QP pool 是 536.9 MB，比例达到 4855×。这个数量级差异不靠某个字段抠出来，而是由 O(N+M) 和 O(N·M) 的模型决定。

状态规模会继续变成热路径成本。生产 NIC 的 connection context 通常要塞进片上 SRAM；一旦 QP working set 溢出，每个操作都可能额外付一次 context refetch。RoCE 在大约 N≈23 就触发 QP cache spill，而 UB 到 N≈1024 才触发；RoCE spill 之后每次 READ 约多付 1000 ns。

## 500 ns 的本质：远端访问进入 load/store 热路径

UB load/store path 直接把 CPU load 指令接到 on-chip bus controller，完成后数据回到发起 load 的寄存器。短 remote fetch 过去要先把一次操作描述成 WQE，再让 NIC 作为外设读取、执行、写回完成；UB 的 load/store path 让远端访问进入 CPU 的 load-use dependency chain，transport header、sequence number、retransmission slot 和 completion queue 都退出这条热路径。

当 80% load 命中本地 hot lines 时，write-back / write-through 策略下均值可到 175 ns，相对 RoCE DMA cold miss 的 2186 ns 是 12.5×。但顺序扫描这类 page-grain 友好的访问，Infiniswap / Fastswap 反而能靠 4KB page amortization 占优。

所以 OpenURMA 的强区很清楚：<strong>submission-bound 的小操作、pointer chase、KV lookup、参数热行访问、分布式锁和 barrier</strong>。bulk transfer 要换另一套吞吐账本。

## ordering 按需付费

RoCE RC 把 strict order 当默认语义，应用不一定每次都需要，却一直在付账；OpenURMA 把 strict order 变成 per-operation opt-in。UB 的延迟会随着 strict-order 请求比例线性上升，RoCE 则一直停在强顺序成本上。

这给 runtime 留了一个新接口：只有锁、barrier、依赖链这样的操作需要强顺序，普通小读写可以走更轻的路径。

## 边界：这是一把尺子，离产品判决还差一步

OpenURMA 最该被珍惜的地方，是它把一个原本高度闭源的方向做成了可复现实验物。论文用 clean-room RTL、SystemC 和 gem5 scaffold 去复现 UB 的 transport / transaction 层，并把代码公开在 GitHub。

但边界也要摆清楚：
## 1. OpenURMA 是 clean-room implementation 和多层仿真/综合框架，还没有物理 FPGA 运行、没有生产驱动、没有真实线缆下 loss / contention 的首包延迟测量

## 2. OpenRoCE 是 apples-to-apples baseline，无法代表 ConnectX-7 这类多代优化商用 RNIC 的完整产品力

## 3. UB 也有弱区：16KB-64KB 大块传输、RoCE BF inline WRITE/SEND、小集群未触发 QP spill 的场景，差距都会收窄


## 延伸阅读

- [OpenURMA 论文](https://arxiv.org/abs/2605.28717)
- [OpenURMA GitHub](https://github.com/bojieli/OpenURMA)
- [华为灵衢 UnifiedBus 综述](https://miraclefarms.github.io/notes/2026/06/24/huawei-unifiedbus-survey/)
- [Serving Large Language Models on Huawei CloudMatrix384](https://arxiv.org/abs/2506.12708)
- [KV Cache 池化的南向选择](https://miraclefarms.github.io/notes/)
