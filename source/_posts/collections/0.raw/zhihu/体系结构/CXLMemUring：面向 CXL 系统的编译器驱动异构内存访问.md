---
title: "CXLMemUring：面向 CXL 系统的编译器驱动异构内存访问"
date: "2025-11-04 00:00:00"
updated: "2025-11-04 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/CXLMemUring-面向-CXL-系统的编译器驱动异构内存访问/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1968840336215376258"
---


摘要
CXL（Compute Express Link）为主机提供到远端内存池的缓存一致访问能力，但本地 DRAM 与 CXL 挂载内存之间显著的<strong>延迟与带宽非对称</strong>会在不规则访存负载中造成严重性能退化。本文提出 <strong>CXLMemUring</strong>：一种<strong>编译器—运行时协同</strong>的系统，将传统“CPU 单边取数”的执行模型重构为主机 x86 与 CXL 设备侧 ARM 管理核的<strong>协同执行</strong>。为此，我们设计了新的中间表示 <strong>CIRA（CXL Intermediate Representation for Asynchrony）</strong>，在 IR 层显式刻画异步取数、LLC 安装与跨核同步；并配套异构运行时进行在线画像与自适应调参。代码开源在[https://github.com/CXLMemUring/CXLMemUring](https://link.zhihu.com/?target=https%3A//github.com/CXLMemUring/CXLMemUring)。

<strong>关键词</strong>：CXL，异构计算，编译器中间表示，预取，缓存安装，指针追踪，图分析，机器学习推理

1 引言
CXL 通过缓存一致互连将主机与扩展内存连接起来，缓解容量瓶颈。然而，CXL 内存访问通常较本地 DRAM <strong>高 2–3× 的访问延迟</strong>，并受限于链路带宽，导致乱序核在<strong>间接访问/指针依赖</strong>场景下出现严重流水线阻塞与 LLC 抖动。现有方法主要有两类：
 (1) <strong>操作系统/NUMA 迁移</strong>（页粒度），粒度过粗，难以覆盖 64B 线级的一致访问；
 (2) <strong>软件/硬件预取</strong>，前者需要开发者显式标注，负担重且易失配；后者对规则流有效，对不规则间接访问常失效。
 因此需要一种新的抽象，能够<strong>拆分“算—取—装”</strong>，并<strong>调动 CXL 设备侧的嵌入式算力</strong>。

本文提出 <strong>CXLMemUring</strong>：通过编译器在 IR 层显式表达“异步取数 + LLC 安装 + 跨核同步”，把计算与取数的职责在<strong>主机 x86</strong>与<strong>设备侧 ARM 管理核</strong>之间重新分工，并由运行时在执行期自适应地调节预取距离与安装策略，从而在不改业务语义的前提下有效掩蔽 CXL 访问延迟。

<strong>本文贡献如下：</strong>

-  提出将 CXL 扩展内存从“被动介质”重定义为<strong>协同执行体</strong>的系统架构，使设备侧管理核可承担 LLC 管理与数据喂给职责。
 
-  设计 <strong>CIRA</strong> 方言，首次在编译器 IR 层面统一刻画异步取数、缓存安装与跨核同步，并给出 x86/ARM <strong>双后端</strong>与低开销通信结构。
 
-  实现配套的<strong>自适应运行时</strong>，基于采样与硬件计数器进行访问模式画像与多版本热环路切换。
 
-  在真实原型平台上评估，覆盖指针追踪、图分析与 ML 推理，展示显著的性能与能效收益。

2 设计概述
CXLMemUring 的核心思想是：把<strong>数据获取与缓存管理外包</strong>给 CXL 设备侧的管理核，由其<strong>持续预取与安装</strong> cacheline；主机侧则以异步风格推进计算与消费。二者通过共享队列与轻量同步进行解耦，从而并行推进“取数—安装—消费”三个阶段，<strong>隐藏链路延迟</strong>并提高有效带宽利用。

- <strong>主机（x86）侧</strong>：编译器将负载降为异步计算核，插入 `await` 等同步点与（可能的）推测预取提示，形成“命中路径/回退路径”的多版本热环路。
 
- <strong>设备（ARM）侧</strong>：CIRA 中的访问模式被编译为<strong>轻量管理核</strong>（规则流/间接追踪等），负责预取、LLC 安装与逐出提示；并与主机通过内存映射队列进行请求-完成交互。
 
- <strong>运行时</strong>：基于计数器与采样画像识别相位与模式，在线调节预取距离、安装速率与同步粒度，必要时切换函数版本以在“掩蔽延迟”与“污染控制”之间权衡。
3 CIRA：面向异步协同的中间表示

### 3.1 抽象与操作

CIRA 构建于 MLIR 之上，提供以下<strong>一等公民</strong>类型与操作：

- <strong>类型</strong>：`MemoryHandle`、`AsyncFuture`、`SyncToken` 等；
 
- <strong>异步原语</strong>：`cira.async_load` 触发异步取数并返回 future；`cira.await` 在使用前同步；`cira.prefetch_stream` / `cira.prefetch_indirect` 描述规则/间接访存流；
 
- <strong>缓存管理</strong>：`cira.install_cacheline` 明示安装目标线；`cira.evict_hint` 给出逐出建议；
 
- <strong>同步与可见性</strong>：`cira.barrier`、`cira.release` 用于跨核内存可见性与进度协调。
 
![](https://pic1.zhimg.com/v2-c783ae95c1abbe7d9f93adc61eff3ae6_r.jpg)通过上述抽象，<strong>“何时取、取到哪一层、由谁安装、何时消费”</strong>在 IR 层即被显式化，便于后端针对不同执行体做差异化生成。

### 3.2 降阶与代码生成

CIRA 程序被降到两个后端：

- <strong>x86 后端</strong>：生成异步计算核，插入 `await` 与推测预取，构造“命中/回退”多版本热环路以稳态运行。
 
- <strong>ARM 后端</strong>：把访问模式译为轻量预取/安装例程（支持流式与指针链），在设备侧持续运行，按主机进度进行前沿推进。
4 异构运行时与自适应执行
运行时围绕<strong>画像—调参—切换</strong>展开：

- <strong>画像</strong>：周期性采样结合硬件计数器，判定 stride/stream/间接等模式与相位边界；
 
- <strong>调参</strong>：当访存 stall 偏高时<strong>拉大预取窗口</strong>、提升安装速率；当 LLC 污染增大时<strong>收缩距离</strong>、降低安装频率；
 
- <strong>切换</strong>：维护函数的多版本，依据画像在稳态区间内选择合适版本，降低抖动。
 通信方面，主机与设备通过<strong>内存映射请求/完成队列</strong>与轻量中断/轮询结合的策略实现低延迟交互。
 
![](https://pic2.zhimg.com/v2-0bb7db76229ce3affbda6101e3104b2b_r.jpg)
5 实验评估

### 5.1 平台与基线


- <strong>主机</strong>：Intel Xeon 6 6787p（86 核，2.8 GHz），本地 DDR5-8000 256 GB；
 
- <strong>互连</strong>：CXL Gen5 x16（理论 64 GB/s），测得延迟：顺序约 375 ns、随机约 405 ns；
 
- <strong>设备</strong>：Agilex 7 + 四核 Cortex-A53@1.5 GHz（2 GB DDR4）；
 
- <strong>硬件模块</strong>：预取仲裁、cacheline 追踪与轻量消息队列。
 <strong>基线</strong>包括：naïve CXL 访问、软件预取以及硬件预取器默认配置。
 
### 5.2 工作负载

覆盖<strong>指针追踪</strong>（链表/树/跳表）、<strong>图分析</strong>（BFS、PageRank、连通分量）、<strong>ML 推理</strong>（推荐系统大规模 embedding、BERT 注意力、稀疏网络）。

6 讨论与比较
与页粒度迁移不同，CXLMemUring 在<strong>线粒度</strong>上协同预取与安装；与纯硬件预取不同，它在编译期<strong>掌握访问结构信息</strong>并下发明确的安装/同步语义；与 PIM（Processing-in-Memory）不同，本文<strong>不改变主机编程模型</strong>，将规则且高频的缓存管理外包给设备侧管理核，从而在工程上更易落地。

<strong>适用性</strong>：当负载以<strong>不规则/间接访存</strong>为主且算力未被充分压满时收益显著；对已明显 compute-bound 或局部性极好的负载收益有限。
 <strong>局限性</strong>：对设备侧算力/协议特性存在平台差异；在极度动态的相位下，在线策略可能出现短时震荡。

7 相关工作
NUMA 感知的数据放置与传统预取对规则流更友好；多种编译器框架（如基于多级中间表示/日程优化的系统）虽能优化算子调度，但缺少<strong>显式缓存安装语义</strong>与<strong>跨核协同</strong>。本文工作以 CXL 异构内存为对象，结合 IR 扩展与运行时自适应，为<strong>不规则访存</strong>提供端到端的编译器驱动解法。

8 结论
CXLMemUring 通过 <strong>CIRA</strong> 中间表示与异构运行时，把 CXL 时代的内存访问从“主机独奏”转为“主机—设备协同”。实验证明其在多类不规则负载上可同时提升性能与能效。未来工作将扩展至 <strong>CXL 3.0</strong> 织物池化、与持久内存协同及更自动化的策略学习。