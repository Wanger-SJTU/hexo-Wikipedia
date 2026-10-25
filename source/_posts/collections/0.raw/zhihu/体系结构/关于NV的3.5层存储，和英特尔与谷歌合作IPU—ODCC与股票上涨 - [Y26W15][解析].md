---
title: "关于NV的3.5层存储，和英特尔与谷歌合作IPU—ODCC与股票上涨 - [Y26W15][解析]"
date: "2026-04-13 00:00:00"
updated: "2026-04-13 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/关于NV的3.5层存储,和英特尔与谷歌合作IPU—ODCC与股票上涨-[Y26W15][解析]/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2027149317765363051"
---


<strong>引言 — 两个背景，一个是ODCC上的话题，一个是英特尔股票的上涨。</strong>

<strong>1. ODCC春季会议的存储工作组上，NV，三星，Solidigm分别就3.5层存储做了技术分享，NVMe‑oF RDMA 与 GPUDirect Storage（GDS）串成一条完整的数据通路，对TTFT和throughput 带来数倍的性能提升。</strong>

<strong>2. 昨晚Intel与Google宣布了一项多年期合作，英特尔股票也再创五年新高。双方将将围绕多代 Xeon 处理器 以及 定制化 IPU 展开深度协同。</strong>

<strong>在之前对NV这次GTC介绍的Context Memory Platform的时候，我也卖了一个关子，说英特尔也有类似的产品。这篇文章展开介绍一下。</strong>

<strong>[Y26W02 | 老黄在CES上，讲“内存墙”的另一种解法？](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzMzIyMjIyMw%3D%3D%26mid%3D2650171691%26idx%3D1%26sn%3D92086dabb93b7f1a241abe84310e815d%26scene%3D21%23wechat_redirect)</strong>

<strong>已有更多解析文章和参考文献，请移步星球：工程芯一：</strong>

<strong>本篇文章分为三个部分。</strong>
<strong>1. GDS over RDMA</strong>

<strong>2. Intel IPU E2200</strong>

<strong>3. 写在最后</strong>

<strong>I. GDS over RDMA</strong>

<strong>在ODCC的存储工作组上</strong>，NVIDIA 与 Samsung ，Solidigm 分别展示了一<strong>3.5‑tier storage</strong> 的现实形态和性能提升：

通过 <strong>BlueField‑3 DPU</strong> 将 <strong>NVMe‑oF RDMA 与 GPUDirect Storage（GDS）</strong> 串成一条完整的数据通路，使 GPU 可以直接访问远端 NVMe 存储资源。

![](https://pic2.zhimg.com/v2-b6e9c15b2333b13a23a33bf43ca943a5_r.jpg)

实际展示表明，这种设计在 <strong>首 token 生成时间（TTFT）</strong> 和整体吞吐上都实现了成倍级提升，其关键并不在于单个组件的性能，而在于<strong>绕开 CPU，把“存储→网络→GPU”的数据搬运变成一条直通路径</strong>。

这意味着，远端 NVMe 不再只是“慢一拍的冷数据池”，而是开始具备接近本地存储的可用性，为大模型推理提供了一种更具扩展性的中间存储层。

![](https://pic4.zhimg.com/v2-38228622cc58667796b1f711f1a437cd_r.jpg)

<strong>II. Intel IPU E2200</strong>

Intel 第二代 IPU——<strong>Intel IPU E2200</strong>。

你看下面中间这个，是不是就是3.5层KV存储的应用场景？这是去年Hot Chip上的图。

![](https://pic2.zhimg.com/v2-663ea4a9ce026678a949a95f75899727_r.jpg)

Look-aside Crypto & Compression：为存储而生
除 Inline Crypto 外，E2200 还提供 <strong>Look-aside Crypto & Compression Engine</strong>：

- AES / SHA / RSA / ECC
- Zstd / Deflate / Snappy
- 支持 NVMe-oF 单通道卸载一个 NVMe 请求可以在 IPU 内完成：
<strong>校验 → 压缩 → 加密 → 传输 → 解密 → 解压 → 校验</strong>

  <strong>芯一视角：</strong>
真正值钱的不是“有加速器”，而是<strong>不用回主机</strong>。
![](https://pic3.zhimg.com/v2-64bd8e2323d422daba93933f73beaad6_r.jpg)

<strong>平台形态与应用场景</strong>
E2200 支持多种部署形态：

- 多 Host Headless
- Converged CPU / GPU 平台
- 网络 / 存储 Appliance目标非常明确：
<strong>让基础设施像网络设备一样规模化部署</strong>。

  <strong>芯一视角：</strong>
一旦基础设施可以“插卡复用”，云的规模曲线就变了。

我们再回到整个芯片的亮点

- 把 IPU 从“SmartNIC”升级为<strong>真正的基础设施处理单元</strong>
- 系统性展示 <strong>Packet / Crypto / RDMA / Storage</strong> 的单通道卸载路径
- 一个很现实的判断：<strong>性能不稳定，本质是基础设施和租户代码混跑</strong>
- 适合正在做 <strong>AI 集群、云网络、虚拟化平台、NVMe-oF</strong> 的工程师
在云与 AI 数据中心中，CPU 不仅要跑应用，还要承担网络、存储、虚拟化、安全、监控等基础设施任务。

这带来四个直接后果：

- 基础设施和租户代码共享同一 CPU，<strong>干扰不可避免</strong>
- 延迟不可预测，尾延迟尤其糟糕
- 安全边界模糊，隔离只能靠软件
- 基础设施能力难以规模化复用
  <strong>芯一视角：</strong>
很多系统“看起来 CPU 利用率不高”，但 QoS 已经崩了。问题不在算力，而在<strong>控制面和数据面混在一起</strong>。这不是调度能解决的，是架构问题。
![](https://pic3.zhimg.com/v2-f67a5b83a80f3b0756e267b8d869462e_r.jpg)

- IPU：网络、存储、虚拟化、加密、监控全部下沉IPU 位于 <strong>PCIe Root Complex 与网络之间</strong>，成为所有 I/O 的必经之路。
这意味着：

- 租户无法绕过 IPU
- 基础设施逻辑不再依赖主机 OS
- 安全隔离是硬件级别的  <strong>芯一视角：</strong>
真正的隔离不是“我 promise 不看你内存”，而是<strong>物理路径上你根本碰不到我</strong>。IPU 的位置决定了它天然适合做“基础设施 air-gap”。

<strong>E2200 的系统级架构总览</strong>
E2200 是一个高度集成的 SoC，核心由三大块组成：

- <strong>Network Subsystem</strong>
- <strong>Compute Complex</strong>
- <strong>Management & Security Complex</strong>

![](https://pic2.zhimg.com/v2-9c1a0e7538a4d12637f88ea7150942f1_r.jpg)网络侧支持 <strong>400G Ethernet + 112G SerDes</strong>，
主机侧支持 <strong>PCIe Gen5 x32 + SR-IOV / S-IOV</strong>，
片上系统级缓存和 LPDDR5 。

![](https://pica.zhimg.com/v2-464e7750b7e2afa9b88d0f9d871561a0_r.jpg)

  <strong>芯一视角：</strong>
这已经不是“网卡加 ARM 核”，而是一个<strong>站在主机和网络中间的系统处理器</strong>。
Network Subsystem：P4 是骨架，不是噱头
E2200 的数据面核心是一条 <strong>P4 可编程包处理流水线</strong>