---
title: Rebuilding Agentic AI for AMD GPU
date: "2026-07-23 00:00:00"
updated: "2026-07-23 00:00:00"
layout: post
permalink: /collections/0.raw/rebuilding-agentic-ai-for-amd-gpu/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - AI
  - GPU
  - AMD
  - KV Cache
  - Agentic
  - Serving
  - SGLang
---


> 原文链接：<https://www.amd.com/en/developer/resources/technical-articles/2026/rebuilding-agentic-ai-for-amd-gpu.html>

当下的 Chatbot 服务栈是为一种正在被快速替代的工作负载而构建的。随着 AI 从聊天转向 Agentic 应用，该栈所依赖的假设正在悄然失效，逐个修补已无济于事。AMD 与 Moonshot AI 团队合作，从第一性原理出发，在 AMD Instinct™ GPU 上从零重建了 Agentic 服务栈。

Agentic Coding——即由 Claude Code 等工具驱动的工作负载——在 token 消耗量上已呈爆发式增长。这些会话长且多轮，上下文随每一轮线性增长，其挂钟时间大部分花在工具调用之间而非等待人类，并且会产生短生命周期的子 Agent 以突发方式到达。服务它们的经济性不再由原始算力主导，而是由 KV Cache 主导：你能复用多少、当它不再适合 HBM 时存放在哪里，以及调度器是否知道。

本文描述了 Agentic 工作负载的真实需求、AMD 与 Moonshot AI 共同构建的在 AMD GPU 上服务这些工作负载的端到端解决方案、其核心的 KV Cache 与调度组件——我们的自研 UMBP、使其快速的各项具体优化，以及我们如何验证其正确性。

<strong>TL;DR</strong>

- Agentic Coding 是 Cache 主导且突发的：上下文随轮次线性增长，KV 复用 roofline 极高，轮次在工具调用上等待（因此 p90 端到端延迟，而非 TTFT，才是关键指标），短生命周期的子 Agent 产生 KV Cache 突发。
- 我们与 Moonshot AI 共同构建了端到端的 Agentic 服务解决方案——Kimi K2.6 on SGLang + MoRI + UMBP + AITER + ROCm，运行于 AMD Instinct™ MI355X。
- 其核心是 UMBP（Unified Memory & Bandwidth Pool，统一内存与带宽池）：一个调度器感知的多层 KV Cache（引擎 HBM → 主机 DRAM → UMBP 池 → SSD），将 Cache 放置转化为路由器可以据此行动的成本模型——不仅是“谁持有该前缀”，而是“谁能最快服务它”。例如，一个可共享的 L3 加上 loadback prefetch 可实现最高 3.2× 更小的 p99 TTFT 和 +7.7% 的总 token 吞吐量，而累计命中率基本不变。
- 在此之上叠加的全栈优化：调度器感知的多层 KV Caching、零 CU SDMA 恢复的 loadback prefetch、增量 P→D KV 传输、delta tokenization（DeltaTok），以及轮次内工具↔引擎的重叠执行。
- 分两部分评估：在基于 ProgramBench 构建的自定义 Agentic Coding 数据集上的性能，以及通过 Kimi Vendor Verifier（KVV / K2VV）验证的准确性——性能提升不带来任何准确性损失。

## Agentic 应用的真实需求

要从第一性原理重建栈，首先要诚实地认识工作负载。Agentic Coding 流量有着精确、可识别的特征模式，其每一项特征都对应着一个已不再成立的聊天时代假设：

| Agentic 特征 | 它所打破的聊天时代假设 |
|---|---|
| 上下文随轮次线性增长的多轮会话 | Prefill 是一次性成本——错误；上下文每一轮都向 HBM 上限膨胀 |
| 极高的理论 KV Cache 命中率 roofline | 全部重算没问题——错误；全部收益在于复用 |
| 工具调用之间的大量短间隔 | 延迟 ≈ TTFT/交互性——错误；轮次等待的是工具而非人类 |
| 短生命周期子 Agent 产生的 KV Cache 突发 | 流量是平稳的——错误；子 Agent 扇出以突发方式到达 |
| 超出 HBM 的工作集 | Cache 放在 GPU 内存中——错误；它必须跨层卸载并保持可路由 |

由此直接产生两个后果，它们决定了后续的一切。

<strong>首先，正确的延迟指标发生了变化。</strong> 在 Agent 时代，大多数轮次不是在等待人类，而是在等待工具调用，因此 TTFT 与 decode 期间挂钟时间的具体分配远不如聊天时代重要。因此我们优化的目标是 token 吞吐量（tok/s/chip）和每百万 token 的 TCO，以 p90 端到端延迟为约束——而非孤立的 TTFT 或交互性。

<strong>其次，KV Cache 卸载成为一等杠杆，而非事后补救。</strong> 一旦工作集超出 HBM，Cache 就会溢出到 CPU DRAM（以及未来的 NVMe），在现实的容量限制下——可用的 KV 卸载受限于每台服务器几 TB 的 CPU DRAM，与使用的 GPU 数量成正比，而这（相当大的）DDR5 成本必须计入 TCO。因此问题不再是是否卸载，而是如何廉价、正确地卸载，并以调度器能够推理的方式进行。

最后一点是关键。当一个前缀从每个引擎的 HBM 中淘汰但仍存在于某处——某个节点的主机 DRAM 上，另一个节点的 SSD 上——它所代表的价值只有在系统能找到它并以比重算更快的速度获取它时才能实现。在聊天时代的栈中，调度器对此完全盲目：KV 卸载后端是被动的字节存储，关于 Cache 存放在哪里、热度如何、获取成本多少——这些信息对最需要它的那一层完全不可见。

因此 Agentic 服务的核心挑战是：KV Cache 不再适合 HBM，卸载是必须的，而调度器对 Cache 实际存放位置——哪个层、哪个节点、以什么获取成本——完全盲目。弥合这一差距就是本文后续的全部内容。

## Kimi K2.6 简介

这些特征不是假设的；它们是前沿 Agentic 模型投入工作的那一刻就会产生的，而我们这里投入工作的模型是 Kimi K2.6。

Kimi K2.6 拥有更强且更稳定的长期代码编写能力，显著提升的指令遵循和自我纠错能力，以及处理更复杂软件工程任务的能力。它还显著增强了 Agent 的自主执行能力。它采用原生多模态架构，支持文本、图像和视频输入，具备思考和非思考模式，以及对话和 Agent 任务。

从服务端来看，这些优势的每一项也是上述压力的来源——将上下文推过 HBM 的长周期会话、将每个轮次都卡在工具调用上的自主 Agent 执行、其 KV 必须保持可复用的多轮对话。因此 K2.6 既是聊天时代栈失效的原因，也是任何替代方案必须达到的标尺：它是我们在本文中端到端服务的模型，也是我们在重建其下一切时保持准确性不变的模型。本文的后续就是这次重建，从我们围绕它设计的端到端栈开始。

## 与 Moonshot AI 共同构建的端到端 Agentic 栈

AMD 与 Moonshot AI 没有选择将 Cache 硬塞到现有的聊天服务器上，而是围绕上述工作负载共同设计了单一的端到端解决方案。它在 SGLang 和 AMD ROCm 平台上运行 Kimi K2.6，由 MoRI 提供通信和内存架构，运行于 AMD Instinct™ MI355X。

架构分为三层：

- <strong>基准测试客户端（左上）</strong>。许多并发的 Kimi Code CLI 会话，由我们基于 ProgramBench 派生的 Agentic 工作负载驱动，产生真实的 Agentic Coding 流量以及我们关心的指标——TTFT、TPOT、JCT（作业/任务完成时间）、APS、TPS——并向调度器打开会话。
- <strong>调度器（中间）</strong>。整个栈的大脑。它融合四个职责：工作负载 SLO 预测（延迟预测加成本模型）、自动 Cache 管理（Cache 感知调度、prefetch、TTL 和上下文级别的驱逐、路径搜索）、自动 PD（XpYd prefill/decode 比例、跨 PP/TP/DP/EP 的自动并行、扩缩容、动态路由），以及为所有上述提供数据的指标中心——SLO/SLA、KV Cache 使用量、Cache 命中率、加载延迟、节点/GPU 利用率、网络和工作负载。
- <strong>统一内存与带宽池（底部）</strong>。KV 基底——UMBP。Prefill（P）和 Decode（D）节点在多层池（GPU HBM → DRAM → SSD）上解耦，前缀在此被 prefetch、通过 RDMA/XGMI 跨节点迁移、在活跃和去活状态之间交换，因此会话的 KV 无论当前存放在哪里都保持可路由。

这种分层是有意为之的。Agentic 流量的每一项特征都指向同一结论：决定性的资源不是 FLOPs，而是 KV Cache——你能实际捕获多少复用 roofline，Cache 一旦溢出 HBM 后存放在哪里，以及调度器能否比重算更快地路由到它。因此在图 1 中，决定整个解决方案成败的模块是调度器加上统一内存与带宽池——KV Cache 卸载和请求调度。这是我们投入最多的地方，也是我们的自研组件 UMBP 所在的位置。下一节深入介绍它。

## 核心：调度器感知的多层 KV Caching 与 UMBP

### 为什么现有的 KV 卸载不够

当今大多数 L3 KV Cache 后端——文件存储、Mooncake、NIXL、HF3FS 等——都是被动的字节存储。服务引擎在 HBM 满时将页推下去，在命中时拉回来；后端忠实地存储和返回字节，仅此而已。系统在过程中学到的一切——哪个节点持有哪个前缀、每个 Block 的热度、某个副本实际能以多快速度返回——都锁定在存储层内部，对调度器不可见。

对于聊天流量这是可以容忍的。对于 Agentic 流量这恰好是反过来的，因为调度器是最需要这些信息的层。当一个前缀已从 HBM 中淘汰的子 Agent 到达时，正确的决策——本地重算，还是从持有它的节点获取，如果获取，从哪个副本——完全取决于放置位置、热度和获取成本。一个被动的字节存储能回答“这个前缀是否存在某处？”但不能回答“谁能最快服务它？”——而对于 Cache 主导的工作负载，第二个问题才是决定 p90 端到端延迟的关键。

### 什么是 UMBP

UMBP（Unified Memory & Bandwidth Pool，统一内存与带宽池）是 AMD MoRI 库中分层存储的分布式 KV 组件。我们以两种方式同时将其集成到 SGLang 中：作为 HiCache L3 存储后端，以及作为调度器可查询的 KV 事件流。它管理一个跨越所有层的单一逻辑 Cache——引擎 HBM → 主机 DRAM → UMBP DRAM 池 → SSD——并且，关键的是，它将其所知的信息暴露给做出路由决策的层。

它与被动字节存储的区别体现在四个方面——设计的四大支柱。

- <strong>支柱 1——调度器友好，与路由器（mori-sched）协同设计。</strong> UMBP Master 是一个覆盖所有层的集群级 KV 放置目录。除了“谁持有该前缀”，它还暴露每个 Key 的历史访问计数、路由命中计数器、最后访问时间、每节点容量和利用率、访问带宽直方图和 RPC 延迟。路由器可以利用这些信号构建真正的成本模型——路由不是到碰巧持有前缀的节点，而是到能最快服务它的节点。

- <strong>支柱 2——可定制的 Cache 管理策略。</strong> 卸载（put-routing）、加载（get-routing）、驱逐以及（计划中的）复制是可插拔的策略接口，全部读取相同的丰富指标。Cache 管理成为开发者可调节的接口而非硬编码的 LRU，因此策略可以针对特定 Agentic 工作负载的 revisit 模式进行调优。

- <strong>支柱 3——Agent 感知提示（WIP）。</strong> TTL、会话固定和优先级提示从服务 API 流经 HiCache 进入 UMBP。Agentic 工作负载通常知道自己的 revisit 模式——子 Agent 的父上下文很快会再次需要——这些提示让工作负载显式地塑造 Cache 保留策略，而非将其留给通用的驱逐启发式。

- <strong>支柱 4——与 AMD 硬件的亲和性设计。</strong> 数据平面与 AMD GPU/CPU/NIC 能力协同设计——IBGDA 和 SDMA 传输、GPU-Direct Storage、GPU 发起的 NVMe——因此页在层之间或跨节点移动的成本尽可能低。

### 闭环

两个集成——L3 数据路径（UMBPStore ↔ 客户端，零拷贝 RDMA）和 KV 事件流（KV 事件 ↔ Master ↔ 路由器）——是解耦的，因此各自单独也有用。结合在一起它们形成了一个闭环：

引擎报告放置 → Master 索引并累积访问历史 → 路由器基于成本模型路由（支柱 1）→ 路由决策训练命中历史 → 放置、驱逐和复制策略消费该历史（支柱 2）→ Agent 提示在工作负载更了解情况时覆盖（支柱 3），全部运行在与 AMD 硬件协同设计的数据平面上（支柱 4）。

收益用一句话概括：一个已从每个引擎的 HBM 中淘汰但仍存活于 UMBP 池中的前缀保持可路由，并通过 RDMA 从最近的副本获取而非被重算。这正是高 Agentic 命中率 roofline 所承诺的收益，而被动字节存储将其留在了桌面上。

## 如何接入 SGLang

该集成复用了 SGLang 现有的机制，而非重新发明：

| 关注点 | SGLang 接入点 | 底层 MoRI 调用 |
|---|---|---|
| L3 字节存储 | UMBPStore（零拷贝 v1 HiCache 接口） | BatchGet / BatchPut / BatchExistsConsecutive |
| L2 主机缓冲区 | UMBPHostTensorAllocator hook | 主机 KV 张量注册 |
| KV 事件流 | KVEventsSubscriber ← 现有 ZmqEventPublisher（无需引擎改动） | Master 外部 KV 索引 |
| 路由 | mori-sched umbp_cache_aware 策略 | Master 每请求查询 |

有几个设计选择对 Agentic 服务尤为重要。L3 路径直接对主机 KV 页缓冲区发起基于指针的 BatchGet/BatchPut，无中间拷贝；L2 主机分配器分配一个 hugepage 支持的、NUMA 绑定的、预映射的张量，使 KV 缓冲区只需注册一次即可用于 RDMA——一次 Put 或 Get 就恰好是一次 RDMA 操作。在分布式模式下，rank 加入一个 Master 领导的池，跨 DP rank 的重复 Put 由 Master 去重，连接复用防止数千个并发请求——即前面描述的子 Agent 突发——耗尽端口。后端注册为 mori，通过 --hicache-storage-backend mori 选择；整个集成由 flag 控制，未启用 UMBP 的构建不受影响。

## 关键优化

UMBP 建立了 Cache 和路由；一系列全栈优化将这一架构转化为吞吐量。以下每一项都直接由 Agentic 流量的某个特性驱动，而非聊天。

### Loadback Prefetch 与零 CU 恢复路径

在 Agentic 服务中，前缀 Cache 是主导的延迟杠杆：上下文每轮增长并不断被重新进入，因此 KV 复用 roofline 极高，前缀 Cache 命中是常见情况而非例外。一次命中用存储换取计算——前缀的 KV 从卸载位置获取而非重算——这正是压低长会话 TTFT 的手段。但这只有在恢复被隐藏时才有收益：在命中时，KV 位于一层或多层之下（主机 DRAM、本地 UMBP 池或远程节点），必须在引擎能使用之前加载回 HBM。关键路径上的 loadback 仅仅是用一次停顿交换一次重算，因此目标是将 loadback 与模型前向重叠——KV 在需要之前就落到 HBM 中，命中的成本实际上为零。两个机制使这成为可能。

<strong>跨层 Prefetch，包括远程 KV。</strong> 成本模型知道会话前缀存放在哪里并预判其重新进入，因此 UMBP 提前在层级中向上 prefetch KV。来源取决于命中情况：位于本节点低层（本地 L3）的前缀被向上暂存到 HBM；位于另一节点（远程 L3）的前缀通过网络拉取到本地主机层——将远程 KV 缓存到本地，使后续轮次使用内存总线。远程 L3 在持有前缀的节点已饱和时最为关键：调度器将请求路由到负载较低的节点并通过 RDMA 获取前缀，同时避免了该节点负载背后的排队和一次重算，从而降低 TTFT。无论哪种情况，前缀都在引擎需要之前驻留于 HBM。

<strong>零 CU 的 Loadback。</strong> 最终的恢复跳——L2→L1（主机 DRAM → HBM）——可以由计算 kernel 或 SDMA 引擎发起。Kernel 拷贝的带宽随 CU 数量扩展，在 32 个 CU 时接近 H2D roofline（~51 GB/s），但消耗了 prefill 需要的 CU。SDMA 拷贝引擎以零 CU 成本完成同样的工作：它达到相同的 H2D roofline 并将这些 CU 归还给 prefill，因此恢复不再与 prefill 争抢计算资源。

恢复管线的每个阶段都运行在其传输介质的硬件 roofline 附近。L2→L1 达到 H2D 带宽（~51 GB/s）。本地 L3→L2 主机内存拷贝，经多线程和非临时（NT）存储指令优化，在 4 线程时达到 ~66 GB/s——高于管线的 H2D 瓶颈需求（~51 GB/s），因此更多线程不产生端到端增益。远程 L3→L2 路径是零拷贝的，聚合工作负载并分发到多个 NIC 和 QP，因此主机 RDMA 在 QP=4 时饱和于接近其有效线速率（~42 GB/s）。

恢复路径达到了其理论性能目标而非仅仅是接近它：绑定的 L2→L1 H2D 阶段运行在其 roofline（~51 GB/s），远程 RDMA 达到线速率的 ~96%（41.8 / 43.5 GB/s）。

### 跨 Prefill/Decode 分离的增量 KV 传输

PD 解耦将 prefill 和 decode 放在不同节点上，因此在 decode 运行一轮之前，该轮的 KV 必须从 P 跨网络传输到 D。对于聊天这是一次性交接。对于 Agentic 会话这又是线性增长问题，只不过发生在网络上：上下文每轮增长，而朴素交接每轮都重新传输整个前缀——第 N 轮要为第 0…N-1 轮已经发送过的所有内容付费。在长编码会话中，这种冗余重传主导了 P→D 路径，并直接作用在 TTFT 上，因为 decode 必须等 KV 到达才能开始。

但 decode 端已经持有几乎所有的内容。当 decode 侧在轮次之间保持 radix cache 时，第 N-1 轮接收的 KV 页在第 N 轮仍然驻留——正是 prefill 即将重新发送的前缀。因此修复方案是 UMBP 应用于卸载的同一不变前缀复用原则、DeltaTok 应用于 token 的同一原则，再应用到一个新地方——P→D 传输：prefill 只发送 decode 尚未持有的页面。

收益是双重的。明显的一半是延迟：节省随会话增长，恰好位于 Agentic 流量所在之处——越晚的轮次，越大的已缓存前缀不再跨越网络。在两节点 1P1D 微基准测试中，正是后期前缀权重高的轮次下降最多——第 1 轮 TTFT 从 2.44s 降至 1.06s，第 2 轮从 1.24s 降至 0.78s——前三轮平均 TTFT 降低 ~21%。更安静的一半是带宽：从未发送的字节就是从未离开 prefill GPU 的 NIC 的字节，因此增量传输释放了 prefill 侧的 NIC 出口带宽——这是一个 prefill 与其服务的每个 decode 共享的资源。回收它让该链路在饱和前承载更多并发的 P→D 交接（以及搭载其上的子 Agent 突发），因此收益在负载下复利而非仅累加到单个请求上。

### Tokenizer 层：DeltaTok 的 Delta Tokenization

线性上下文增长还有第二个更隐蔽的成本——在 CPU 上而非 GPU 上。Tokenization 位于每个请求的最前端（tokenize → block-hash → cache lookup），而聊天时代的路径每轮都重新 token 化整个对话：上下文长度的 O(N)，随着会话积累轮次无界增长。UMBP 使该历史的 KV 保持可路由；DeltaTok 则对 token 本身做了对称的事情。

DeltaTok 是 UMBP 家族中面向 Agent 的、AMD Zen 5 加速的 Rust tokenizer，充当 SGLang 的记录 tokenizer——token id 直接喂给引擎。其核心手段是 delta 编码：它从 chat template 一次性推导出轮次边界（通过 probe-rendering，然后将每个边界对齐到最近的 special-token 硬边界，使段拼接保持 BPE-safe），缓存每个段，在下一轮只重新编码新增的轮次——O(1)，与上下文长度无关，复用不变的前缀。引擎保留已复用前缀的 token（其 KV 已经驻留）并仅追加新的 token，与全量重新编码逐字节一致。

收益恰好落在 Agentic 会话所在之处——长的、多轮上下文。在 1M token 上下文下，全量重新 token 化每轮耗费 ~1.7s；DeltaTok 的下一轮 delta 约 ~0.09 ms，无论上下文长度如何都保持平坦。而且它经过验证，与 HuggingFace AutoTokenizer 在 Kimi 系列及其他生产 tokenizer 上逐字节精确匹配——加速不带来准确性损失。

### CPU（工具）↔ GPU（推理引擎）重叠

上述优化跨请求复用 KV；基于工具的 Agent 还在单轮内留下了空闲窗口。一轮是一个依赖链——decode 工具调用 → 执行工具 → prefill 下一轮的结果——其中工具间隔（沙箱往返、网页搜索、MCP、子 Agent 调用）通常是最长的段，往往接近一秒，而加速器在其间空闲。这是一个调度问题，不是模型问题：下面的重叠只重新排列调度，不改变输出。

<strong>并发的工具扇出</strong> 将一轮中独立的、无副作用的调用同时派发，将其工具等待从 Σ(tᵢ) 缩短为 max(tᵢ)。

<strong>流式 mid-decode 派发</strong> 在 decode 期间解析 tool_calls 流，并在其参数闭合的瞬间启动每个调用，因此工具与 decode 尾部重叠而非跟随其后。

<strong>跨轮次前缀驻留与 prefill 重叠</strong> 在工具间隔期间保持会话共享的 prompt 前缀驻留——固定住，使竞争无法驱逐下一轮将要复用的 Block——因此该轮只 prefill 新的、依赖工具的后缀，并在前缀上命中 Cache 而非重算。

这三者都保持语义：只有独立的工具——读取，以及写入不相交状态——被提前或并行派发，而依赖于前序结果或会产生冲突的工具仍然按序串行运行，结果按原始索引重组，因此上下文与串行循环逐位一致。

## 评估

我们分两部分评估该解决方案，因为两件事必须同时成立：系统必须高性能，答案必须保持正确。所有结果均使用原生 SGLang 上的 Kimi K2.6，运行于 AMD Instinct™ MI355X。

### 第一部分——基于 ProgramBench 派生的 Agentic 数据集上的性能

为了用真正的 Agentic 工作负载驱动系统，我们在 ProgramBench 之上构建了自定义数据集。ProgramBench 是一个净室软件工程基准测试：Agent 只获得一个已编译的可执行文件及其使用文档，必须架构和实现一个完整代码库来复现原始的行为，由 200 个任务中数十万个隐藏的行为测试来评判。这使它成为 Agentic 服务的近理想压力测试——长多轮会话、大量工具使用和深层上下文增长——因此我们采样并改编其任务为可重放的 Agentic Coding trace。

<strong>我们如何生成流量：</strong> 我们用真实的 Kimi CLI 驱动每个 ProgramBench 任务，而非合成的 HTTP 重放器，使用 SwarmPressure——我们自研的将 Agent CLI 指向被测集群的 harness。它为每个任务启动一个隔离的 kimi CLI 容器，用该任务的可执行文件和文档播种，让 Agent 端到端地解决它——阅读文档、编写代码、针对真实构建/测试反馈迭代 compile.sh——针对我们自己的集群而非托管 API。因此上下文增长、工具调用间隔和轮次计数全部来自 Agent 自身的决策，而非脚本化的 trace，这正是使该流量接近真实世界 Agentic 负载的原因。

<strong>会话如何轮换：</strong> 真实用户会离开并返回一个 Cache 已变冷的对话，因此一个服务集群始终持有热、温和冷状态的混合——一个整个过程中保持相同会话热的基准测试会报告不切实际的温暖的 Cache。因此我们保持并发数固定，但任何时刻只保留这些会话中的一小部分活跃：每个活跃会话运行一个有限的时间片，然后被驱逐并替换为非活跃池中的一个，让其 KV 像闲置用户的 KV 一样在层间老化，直到稍后被恢复。

运行这些 trace，我们向数据提出的问题是：UMBP 是否将 Agentic 流量使其可用的复用转化为服务收益。以下两个实验回答了该问题的 Cache 行为部分，它们共享一个测量词汇：KV Cache 命中率，拆分为首次调用（会话的冷启动或恢复调用，前缀必须从本地热 Cache 之外获取）和后续调用（一轮的热延续）；TTFT 按其分布拆分（avg/p50/p90/p99）并同样拆分两种调用；以及总 token 吞吐量，报告为相对每个实验仅 L2 基线的提升。

这种拆分是全部要点。累计命中率在我们测试的每个配置中几乎相同，因此它完全隐藏了效果——可共享的 L3 改变的是哪些调用命中，而首次调用/后续调用的拆分使这一效果可见并将其连接到 TTFT 尾部。

### 实验 1——L3 效应与高并发下的 loadback prefetch 优化

这是在高并发端的一个固定并发快照，此时纯 L2 预算承受最大压力。我们保持工作负载固定，仅在三轮运行中变化 Cache 层配置。

<strong>实验设置：</strong> 三个配置统一固定：Kimi-K2.6-MXFP4 在 1P2D 拓扑上，由 128 个并发的 programbench agentic 会话驱动。每个节点有 8× AMD Instinct™ MI355X、8× AMD Pensando™ Pollara 400G NIC 和总计 1TB DRAM 预算。唯一变量是每个 rank 的 Cache 层配置：

| 配置 | L2（每 rank） | L3（每 rank） | Loadback prefetch |
|---|---|---|---|
| A — 仅 L2 基线 | 96 GB | — | — |
| B — +L3，优化关 | 64 GB | 32 GB | 未应用 |
| C — +L3，优化开 | 64 GB | 32 GB | 已应用 |

<strong>分析——两个效应叠加：</strong>

将部分 L2 拆分为 L3（A→B）几乎不移动累计命中率（88.5% → 88.3%）但重新分配了 TTFT 曲线。它将首次调用命中率提升 21 个百分点（58.2% → 79.3%），将容量饥饿的冷未命中转化为 L3 命中，因此尾部坍缩（p99 17.3s → 9.9s，p90 7.2s → 4.9s）。中位数上升（p50 2.0s → 2.8s）：L2 从 96 缩小到 64GB，而未优化的恢复还不够快以完全隐藏在前向背后。净效果是，一个小的确定性中位数成本换取了灾难性尾部风险的消除（avg 3.2s → 2.9s）——但吞吐量保持平坦（+0.1%）。

开启 loadback prefetch 优化（B→C）使首次调用命中率缓和至 72.0%，但使恢复足够高效以完全隐藏在模型前向背后。每个百分位同时改善（p50 2.8s → 2.4s，p90 4.9s → 4.3s，p99 9.9s → 5.4s），吞吐量跃升 7.7%——而且由于 L2→L1 跳运行在零 CU SDMA 引擎上，隐藏恢复还将 CU 归还给 prefill 而非花费在拷贝上。

端到端（A→C），TTFT 在整个分布上改善（avg 3.2s → 2.4s，p90 7.2s → 4.3s，p99 17.3s → 5.4s——尾部改善 3.2×），而累计命中率实际上下降 1 个点（88.5% → 87.5%）。

### 实验 2——当 Cache 已足够大时的请求迁移

本实验在故意过度配置的部署上运行相同的并发——每个 rank 192 GB 主机 DRAM 而非 96 GB，使用两个 prefill 实例而非一个。基线不再容量饥饿：仅用 L2，累计命中率已达 95.0%，首次调用命中率 82.2%。

因此容量在这里不是绑定约束。局部性才是。会话在 prefill worker 之间被强制迁移，问题变为前缀一旦与其构建它的 worker 分离是否仍可到达——因为一个 worker 本地的 L2 无论多大，都无法回答一个已迁移的请求。

<strong>实验设置：</strong> Kimi-K2.6-MXFP4 在 2P1D 拓扑上，128 个并发的 programbench agentic 会话，其中 64 个在任何时刻活跃。每个会话固定到一个 prefill worker，全部从 worker 0 开始；一旦会话上下文增长 ≥256 token，该固定轮转到另一个 worker。变量是 Cache 层配置：

| 配置 | Prefill L2（每 rank） | Prefill L3（每 rank） | Decode 主机 Cache |
|---|---|---|---|
| A — 仅 L2 基线 | 192 GB | — | — |
| B — +L3 | 160 GB | 32 GB | L2 64 GB + L3 128 GB |

<strong>分析：</strong>

累计命中率几乎不动——95.0% → 96.6%，1.5 个百分点的增益看起来像噪声。拆分显示了效果实际在哪里。后续调用命中率精确到小数位相同（两者均为 97.4%）——L3 对热延续没有改变任何东西。首次调用命中率移动了 9.5 个百分点（82.2% → 91.7%）：迁移后的轮次开始，在仅 L2 下在其新 worker 上找不到任何东西并重算前缀，改为在可共享的 L3 中找到它。

这种重新分配作用在尾部。TTFT p99 下降 1.6×（11.5s → 7.3s），首次调用 TTFT 下降 12.4%（4.24s → 3.71s），而后续调用 TTFT 持平（1.56s → 1.53s）。总 token 吞吐量上升 4.9%，输出 token 上升 6.5%。

<strong>总结：</strong> 即使 Cache 被慷慨地配置到仅 L2 基线已经健康的程度，迁移仍然打破了会话与持有其前缀的 worker 之间的固定——而 worker 本地的 L2 无论多大都没有答案。从相同的 DRAM 中切出的可共享 L3 捕获了它，将 9.5 个百分点的首次调用命中率增益转化为 1.6× 更小的 TTFT 尾部和 4.9% 更多总 token 吞吐量。累计命中率——大多数基准测试报告的数字——移动了 1.5 个点并隐藏了整个效果。

### 第二部分——通过 Kimi Vendor Verifier（KVV / K2VV）验证准确性

如果重建的工程层悄悄降低了质量，性能就毫无意义。为了排除这一点，我们使用 Kimi Vendor Verifier（KVV）——Moonshot 开源套件，用于验证推理实现的准确性。我们的重建精确改变了工程层——跨层的 KV 卸载、成本模型路由、FP4 量化、投机解码——因此 KVV 是正确的工具。

<strong>K2VV 工具调用——schema 准确性达到与官方 API 的 parity。</strong> 在 K2VV 工具调用套件（非思考模式，官方 K2.6 参考数据集，2000 个请求）上，基线部署已通过及格线，启用约束工具调用解码（xgrammar grammar 后端 + SGLANG_TOOL_STRICT_LEVEL=1）将 JSON-schema 准确性提升至完美的 100%——消除了全部 54 个格式错误参数的情况——同时 trigger-similarity 的 tool_call_f1 保持在官方 ~84% 的水平：

| 运行 | 约束解码 | tool_call_f1 | Schema 准确性 | Schema 错误 |
|---|---|---|---|---|
| A — 基线 | 关 | 84.97% | 94.73% (970/1024) | 54 |
| B — 约束 | xgrammar + strict=1 | 84.12% | 100.00% (1047/1047) | 0 |
| 官方 Kimi-K2.6 API | 参考 | ~84.0% | 100% (1012/1012) | 0 |

<strong>KVV 视觉基准测试——多模态路径端到端工作正常：</strong>

| 基准测试 | 模式 | 样本数 | 准确性 |
|---|---|---|---|
| OCRBench | 非思考 | 1000 | 0.922 |
| OCRBench | 思考 | 1000 | 0.911 |
| MMMU Pro Vision（10 选 1） | 非思考 | 1730 | 0.738 |
| MMMU Pro Vision（10 选 1） | 思考 | 1730 | 0.782 |

结果：第一部分的性能提升不带来任何准确性损失——重建的栈更快更便宜，且经过验证的正确，在多模态和工具调用路径上均与 Moonshot 官方参考达到 parity。

## 展望

- <strong>为 Kimi K3 协同设计：</strong> 我们的优化焦点转向下一代 Kimi K3。
- <strong>将 Agentic 服务推向更多引擎——ATOM、SGLang、vLLM：</strong> UMBP 分层 Cache、成本模型路由和 AMD 原生数据移动在设计上是引擎无关的。
- <strong>完成 UMBP 路线图：</strong> 在调度器侧，将 umbp_cache_aware 从前缀匹配提升到完整成本模型；在存储侧，NVMe 作为第四层和 GPU 发起的 NVMe 访问。

## 总结

Agentic 应用打破了聊天时代服务栈所依赖的假设：上下文随每一轮线性增长，KV 复用 roofline 巨大，轮次等待的是工具调用而非人类，短生命周期的子 Agent 以突发方式到达。这些属性共同使 KV Cache——而非计算——成为决定成本和延迟的资源，并迫使 Cache 超出 HBM、跨层分布，而调度器再也无法看到它。

与 Kimi 团队合作，AMD 为这一工作负载从第一性原理重建了栈，运行于 AMD Instinct™ MI355X：Kimi K2.6 on SGLang 和 ROCm，配备 KV Cache 与调度核心 UMBP——使卸载的 Cache 保持可路由，并将放置转化为路由器可以据此行动的成本模型。全栈优化将这一架构转化为吞吐量，Kimi Vendor Verifier 确认这些提升不带来准确性损失。Cache 不再在 HBM 边缘悬崖式跌落，调度器不再对它的存放位置一无所知。</arg_value>