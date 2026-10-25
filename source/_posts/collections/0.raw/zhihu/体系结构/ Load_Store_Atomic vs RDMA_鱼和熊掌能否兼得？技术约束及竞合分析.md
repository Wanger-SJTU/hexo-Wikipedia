---
title: Load/Store/Atomic vs RDMA:鱼和熊掌能否兼得？技术约束及竞合分析
date: "2026-03-11 00:00:00"
updated: "2026-03-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Load_Store_Atomic-vs-RDMA_鱼和熊掌能否兼得-技术约束及竞合分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2014996241344373641
---


当前AI算力网络领域出现了一个引人深思的现象：以腾讯（ETH-X）和字节跳动（EthLink）为代表的<strong>客户侧计算互联协议设计</strong>普遍要求同时支持<strong>基于Load/Store/Atomic的细粒度</strong>（≤512B）<strong>数据访问</strong>和<strong>基于RDMA的粗粒度</strong>（≥4K）<strong>数据传输；</strong>而NVIDIA的NVLink、AMD主导的UALink及Broadcom主导的SUE(Scale Up Ethernet)等<strong>解决方案提供方的计算互联协议设计</strong>却仅支持Load、Store、Atomic，AMD主导的UEC（Ultra Ethernet Consortium）则专注于RDMA优化。这一分化背后存在哪些深刻的技术约束？还反映了哪些产业链的商业竞争与合作考量？能不能从技术约束和商业竞争合作两个维度展开深度剖析，揭示AI算力网络发展的核心矛盾与未来走向？


一、**  **技术约束：AI计算场景对协议设计的双重需求​​**

<strong>a)</strong>  <strong>双重需求的必要性</strong>

## 1.  ​**​细粒度访问（Load/Store/Atomic）的必要性​**​


·  ​<strong>​场景需求​</strong>​：例如MoE（Mixture of Experts）模型中的门控决策（≤100B）、Attention机制中的权重重计算需原子操作保证实时性，需频繁更新小规模数据（≤512B），要求协议支持纳秒级延迟的原子操作（如GPU显存直接读写）。例如，ETH-X协议通过统一虚拟地址（UVA）和硬件级页表同步，实现GPU间细粒度内存直接访问（Direct Access），减少数据预处理开销。

·  ​<strong>​性能瓶颈​</strong>​：传统RDMA(如RoCE)需软件层Verbs语义交互，启动延迟高达微秒级，无法满足细粒度操作需求。

## 2.  ​**​粗粒度传输（RDMA）的核心价值​**​


·  ​<strong>​大规模</strong>数据<strong>搬运​</strong>​：模型权重、梯度等批量数据（≥4K）传输依赖高带宽DMA引擎。例如，ETH-X的Direct Copy语义通过专用硬件（如ETH.DMA）实现TB级带宽的批量拷贝，优化结构化数据处理效率。

·  ​<strong>​网络</strong>效率<strong>优化​</strong>​：RDMA的零拷贝特性可绕过CPU，降低协议栈开销。但传统RoCE在控制路径(WQ/CQ)上存在冗余，ETH-X通过优化流控（PFC/ECN）和简化交互提升效率。

<strong>b)</strong>  <strong>​​架构设计目标的分歧​​</strong>

## 1.  ​**​负载场景的差异​**​


·  ​<strong>​Load/Store/Atomic​</strong>​：针对​<strong>​节点内​</strong>​的细粒度通信（≤512B），如GPU间显存直接访问、原子操作同步（如AllReduce中的梯度更新），要求纳秒级延迟（通常InfiniBand），延迟在微秒级（1-10μs）。

·  ​<strong>​冲突点​</strong>​：两种语义对延迟、数据粒度、协议栈的要求截然不同，强行融合会导致硬件设计冗余和性能折中。

## 2.  ​**​协议栈分层矛盾​**​


·  Load/Store需​<strong>​内存语义​</strong>​（直接地址访问+原子指令），依赖全局虚拟地址映射（如NVIDIA UVA）和硬件级页表同步。

·  RDMA需​<strong>​网络语义​</strong>​（端到端队列管理+流控），依赖独立的QP（Queue Pair）和CQ（Completion Queue）机制，需实现丢包重传、拥塞控制等。

·  ​<strong>​硬件瓶颈​</strong>​：在单一协议中同时实现内存语义的地址透明性和网络语义的可靠性保障，需复杂的状态机协调，显著增加芯片面积和功耗。

<strong>c)</strong>  <strong>物理层与芯片集成的技术瓶颈​​</strong>

## 1.  ​**​延迟与带宽的权衡​**​


·  Load/Store依赖​<strong>​超低延迟</strong>物理层<strong>​</strong>​：如NVLink采用高速SerDes（串行解串器）和直连拓扑。

·  RDMA需​<strong>​独立DMA</strong>引擎<strong>​</strong>​：处理大块数据搬运需专用DMA控制器，但集成到GPU芯片会挤占计算单元面积（如NVIDIA H100中NVLink占芯片面积15%，若加入RDMA引擎可能增至25%）。

·  ​<strong>​案例​</strong>​：NVLink 4.0延迟仅300ns，而RoCEv2延迟约1.5μs，因后者需经过网卡协议解析。

## 2.  ​**​流控机制的冲突​​**


·  Load/Store使用​<strong>​基于信用的实时流控​</strong>​（Credit-based Flow Control），确保原子操作的即时响应。

·  RDMA需​<strong>​网络级流控​</strong>​（如PFC/ECN）避免拥塞丢包，但传统以太网的丢包率（>10⁻³）会严重破坏RDMA吞吐。

·  ​<strong>​硬件冲突​</strong>​：若在芯片内整合两类流控，需双重缓冲区和调度器，显著增加设计复杂度。例如，AMD UALink仅支持Credit流控，而UEC（以太网联盟）仅优化RDMA的ECN机制。

## 3.  ​**​内存管理单元（MMU）限制​​**


·  Load/Store要求​<strong>​</strong>统一<strong>虚拟地址空间​</strong>​（如GPU Direct RDMA需GPU与网卡共享PCIe Root Complex）。

·  RDMA需​<strong>​物理地址注册​</strong>​（Memory Registration）和内存保护（Memory Key），无法直接映射到GPU虚拟地址。

·  ​<strong>​地址转换开销​</strong>​：若强制统一，需多层地址转换表（如IOMMU+SMMU），增加200ns以上的延迟。

<strong>d)</strong> <strong>结论：本质是硬件设计中的“不可能三角”</strong>

​<strong>​低延迟（Load/Store）​</strong>​、​<strong>​高吞吐（RDMA）​</strong>​ 与​<strong>​</strong>低成本<strong>/低复杂度​</strong>​三者难以兼得：

·  ​<strong>​NVIDIA/AMD​</strong>​优先保障节点内低延迟，牺牲跨节点灵活性；

·  ​<strong>​腾讯/字节​</strong>​因业务强需求（混合负载），通过软硬件协同设计实现折中，但需更高成本

<strong>1</strong>

<strong>​​二、商业竞争与合作逻辑​​</strong>

## 1.  ​**​NVIDIA的封闭生态策略​**​


·  ​<strong>​技术控制​</strong>​：NVLink通过硬件一致性协议绑定GPU间通信，确保性能优势（如NVSwitch 900GB/s带宽）。开放RDMA支持可能削弱其交换机（NVSwitch）和DPU（BlueField）的附加值。

·  ​<strong>​授权限制​</strong>​：NVLink Fusion计划仅开放物理层/链路层IP，保留软件层控制权，强制客户使用至少一件NVIDIA产品（GPU/Switch/CPU），维护生态壁垒。

## 2.  ​**​AMD UALink的开放联盟博弈​**​


·  ​<strong>​差异化定位​</strong>​：UALink 1.0优先支持Load/Store，瞄准Scale Up域（如超节点内GPU互联），避开与UEC（RDMA优化）的直接竞争。通过联合微软、谷歌等巨头，构建开放标准对抗NVLink。

·  ​<strong>​战略妥协​</strong>​：UEC（由AMD等主导）专注Scale Out的RDMA优化，避免在协议层与UALink重叠，同时迎合以太网在大型集群的性价比优势（如Meta 24K GPU集群）。

## 3.  ​**​腾讯/字节的“应用驱动”设计​**​


·  ​<strong>​业务场景强需求​</strong>​：大模型训练需混合负载支持——细粒度操作处理参数更新，RDMA搬运权重数据。例如，字节跳动DeepSeek的日活爆发依赖高效异构计算，促使EthLink协议同时支持两类语义。

·  ​<strong>​规避厂商锁定​</strong>​：ETH-X强调以太网兼容性（如ETH.MEM优化小包传输），降低对专用硬件（如NVSwitch）的依赖，提升供应链自主性。

<strong>​​三、技术路线对比与未来趋势​​</strong>


​​协议​​支持能力技术约束商业意图​​ETH-X/EthLink​​Load/Store + RDMA需分层协议（GPU-GPU/GPU-Switch）打破封闭生态，降低算力成本​​NVLink​​Load/Store硬件一致性协议限制维护GPU生态垄断​​UALink​​Load/Store开放标准，但未集成RDMA联合巨头对抗NVIDIA​​UEC​​RDMA以太网优化，无内存映射支持主导Scale Out市场

a)<strong>​</strong>​趋势分析​​：**

- ​<strong>​协议融合​</strong>​：AMD或推动UALink与UEC协作，在下一代标准中整合两类语义（如UALink 2.0支持RDMA控制器）。还有华为UnifiedBus，在设计之初即同时支持Memory语义和URMA(对标RDMA)。
- ​<strong>​硬件创新​</strong>​：专用DMA引擎（如AWS NeuronLink）可能集成原子操作能力，实现协议层统一。
- ​<strong>​开源生态​</strong>​：腾讯ETH-X的分层设计（开放物理层/私有事务层）或成行业折中方案，平衡性能与自主性。
<strong>b)</strong>  <strong>​​总结​​</strong>

技术差异本质是​<strong>​场景与供应链的博弈结果​</strong>​：

·  ​<strong>​应用方（腾讯/字节）​</strong>​：业务复杂度迫使协议支持混合负载，通过以太网兼容性换取灵活性；

·  ​<strong>​方案商（NVIDIA/AMD）​</strong>​：硬件限制与商业利益驱动协议“单极化”，以维护生态控制权或联盟竞争力。<strong>未来竞争焦点将转向​​跨层协议优化​</strong>​（如ETH-X的事务层私有化+物理层开放），在自主可控与性能极致间寻找平衡点。
