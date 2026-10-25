---
title: 都可以RDMA，mac组网以后会不会取代基于IB的集群？
date: "2026-07-14 00:00:00"
updated: "2026-07-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/都可以RDMA,mac组网以后会不会取代基于IB的集群/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/2005348116719744112/answer/2060501186130743304
---


你的理解其实抓住了一部分趋势，但有几个关键概念混在一起了。如果从现在（2026 年）的 HPC 和 AI 集群发展来看，可以这样理解：

## 1. RoCE 会不会取代 IB？


短期不会完全取代，但正在大量替代。

过去超算和 HPC 基本都是 InfiniBand（IB），因为：

- 延迟最低（<1μs）

- 拥塞控制成熟
- RDMA 是原生支持

- MPI 性能最好而现在 AI 集群（尤其 NVIDIA DGX、GB200、B300 等）越来越多采用 RoCE v2。

原因不是因为 RoCE 比 IB 快，而是：

- 可以复用成熟的以太网生态；

- 网络规模更容易扩展（几千到几万 GPU）；
- 成本更低，厂商更多；

- NVIDIA Spectrum-X、Cisco、Arista 等都在优化 AI Ethernet。所以未来更可能是：

传统 HPC 继续大量使用 IB，AI 训练集群越来越偏向 RoCE。

## 2. Thunderbolt 能不能组成集群？


Thunderbolt（雷电）确实支持：

- PCIe Tunnel

- DMA
- 高带宽（TB5 已到 80~120Gbps）Mac 两台机器之间甚至可以直接建立网络。

但是它不适合大型集群。

原因包括：

- 最大链路距离只有几米；

- 不支持大型交换网络（没有 1000 节点 Thunderbolt Fabric）；
- 没有成熟的路由协议；

- 没有大规模拥塞控制；
- 没有 Datacenter 级容错。所以：

Thunderbolt 更像：

PCIe 延长线。

而不是：

数据中心网络。

## 3. Apple 的统一内存是不是 RDMA？


不是。

Apple Silicon（M1/M2/M3/M4/M5）的 Unified Memory 是：

CPU、GPU、NPU 共用同一块物理内存。

这是单机内部共享内存。

RDMA 则是：

跨服务器直接访问另一台机器的内存。

这是完全不同的层次。

很多人第一次接触 Apple Silicon 都容易把两者混在一起。

## 4. Mac 会进入 HPC 吗？


我认为可能用于科研、小规模 MPI、开发环境，但不会进入大型超算中心。

主要原因：

- Apple 不做数据中心服务器；

- 没有大规模交换机生态；
- 没有 IB；

- 没有企业级 BMC、机架管理；
- CUDA 生态缺失（这是最大问题）。目前全球 TOP500 超算几乎都是：

- x86 + NVIDIA GPU

- ARM + NVIDIA GPU（Grace）
- ARM + AMD GPU

- Fujitsu A64FX几乎没有 Apple Silicon。

## 5. 将来的趋势是什么？


真正的发展方向不是 “Thunderbolt 集群”，而是：

- 单机：CPU、GPU、HBM 越来越融合（如 NVIDIA Grace Blackwell、AMD MI400、Apple M 系列）。

- 机间：高速网络越来越接近本地总线性能（IB、RoCE、NVLink Switch、CPO 光互连）。也就是说，未来的发展方向是：

机内统一内存 + 机间高速 RDMA 网络。

Apple 做的是前半部分（单机统一内存），NVIDIA、AMD、Intel 做的是前半部分 + 后半部分（数据中心互连）。

一句话总结：

Thunderbolt 和 Apple 统一内存解决的是单机内部高速互联；而 IB、RoCE、RDMA 解决的是成百上千台服务器之间的高速互联。未来 AI/HPC 集群的发展趋势更可能是 RoCE 与 AI Ethernet 持续扩张、IB 保持高端 HPC 优势，而不是用 Thunderbolt 或 Mac 集群取代传统数据中心网络。