---
title: OpenURMA 论文阅读：把 RDMA 的 PCIe 往返改成片上总线访问
date: "2026-07-04 13:45:37"
updated: "2026-07-04 13:45:37"
layout: post
permalink: /collections/wechat/2026-06-30-OpenURMA论文阅读把RDMA的PCIe往返改成片上总线访问/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# OpenURMA 论文阅读：把 RDMA 的 PCIe 往返改成片上总线访问

> 原文链接: https://mp.weixin.qq.com/s/0NXD0FadkjgO6uCS28Cvow

<strong>发布时间</strong>: 2026-06-30 21:51

---

MiracleFarmsREADING · NOTE

![图片](/images/collections/wechat/asset/93c289113f66.jpg)


长上下文推理、KV 池化和超节点互连正在把“远端内存访问”推到更热的位置。OpenURMA 这篇论文把问题压到 64B remote fetch：如果一次小读还要走 WQE、doorbell、DMA 和 completion，RDMA 的低延迟神话会被 PCIe 往返重新收税。读懂这篇文章，就能更具体地判断 UB / memory-semantic fabric 到底改变了哪一层成本。

OpenURMA 这篇论文最醒目的数字，是 500 ns remote fetch 和 4855 倍状态缩减。但更有意思的是作者的位置。arXiv 页面显示论文只有一位作者 Bojie Li；他的公开主页和 CV 显示，他长期做数据中心网络、RDMA、SmartNIC、FPGA 网络处理和用户态网络栈，现在是 Pine AI 首席科学家，曾发表 ClickNP、KV-Direct、SocksDirect、1Pipe 等系统论文[5][6]。CV 还写到，他在华为 TopMinds / 计算机网络与协议实验室期间，是 Huawei Unified Bus（UB）的关键架构师之一，做过下一代数据中心互联、uRPC、RDMA 扩展和 remote memory abstraction[6]。
所以 OpenURMA 很难被读成一篇普通的第三方 benchmark。它更像是一个长期做 RDMA / SmartNIC / UB 相关系统的人，在离开闭源硬件和闭源代码后，基于公开规范搭出的 clean-room 原型和对照实验。论文把 RoCE 和 UB 的差别落到两张账上：一个 64B remote fetch，应用看起来只是读远端内存，底下却要把操作变成 WQE、doorbell、DMA fetch、completion，再让 CPU 和 PCIe 外设来回交接；在 1024×1024 端点规模下，RoCEv2 RC 的 per-QP 状态会涨到约 537 MB，UB / OpenURMA 同一规模只有约 110 KB[1]。
这两个数字已经把问题说透了：RDMA 小请求的瓶颈同时落在 PCIe 外设模型、QP 状态和强顺序语义三笔固定成本上。 OpenURMA 没有证明某个商用产品已经成熟，却给了一把尺子：当 NIC 从 PCIe 外设挪到 on-chip bus，状态、延迟和 ordering 成本会怎样变化。

RDMA 小请求的税，主要交给了 PCIe 往返
传统 RDMA 的直觉是“绕过内核、直接读写远端内存”。这句话只描述了应用看到的接口，没描述 NIC 和 CPU 之间怎么说话。RoCEv2 RC 仍然把 NIC 放在 PCIe 后面，CPU 写 Work Queue Entry，敲 MMIO doorbell，NIC 再 DMA 取 WQE，执行网络收发，最后 DMA 写 completion，CPU 轮询 CQE。
论文把这条路径拆成四次 PCIe crossing；再把 target-side NIC 读远端 host DRAM 的 DMA 显式计入，64B READ 的关键路径里，PCIe 相关成本合计约 1650 ns[1]。一个读远端 64B 的动作，被拆成了好几次“CPU 告诉外设、外设再回来告诉 CPU”。对大块传输来说，这些固定成本还能被 payload 摊薄；对 pointer chase、锁、barrier、KV lookup 这类小操作来说，它们就直接变成延迟主体。


![图片](/images/collections/wechat/asset/567054df6f77.jpg)


图 1：论文把差异压成三步链路：RoCEv2 RC 把 NIC 放在 PCIe 后面、每个应用-远端端点绑定一个 QP、默认 strict order；UB / OpenURMA 把 controller 放到 on-chip bus，拆出 Jetty 与 TP Channel，并把 ordering 改成 opt-in。来源：OpenURMA 论文 Figure 1。
软件层优化能省下一段路，但省不掉整条路。Blue Flame inline WQE 能去掉 initiator 侧一次 WQE DMA fetch，target-side DMA、CQE 写回和 CPU poll miss 还在。论文给出的 64B pointer-chase 数据很直接：RoCE DMA baseline 是 2186 ns，RoCE Blue Flame 是 1686 ns，UB URMA work-request path 是 757 ns，UB load/store path 是 500 ns[1]。
Blue Flame 缩短了外设编程路径，UB 让这类小请求不再按外设编程路径走。 这句话是整篇论文的第一层分界。READ、WRITE、SEND、atomic 仍然可以走 URMA work-request path；但 controller 已经移到 on-chip bus，哪怕继续走队列化提交，也不再给每个操作缴完整的 PCIe 往返税。论文里，非 load/store verb 上 UB 仍能比 RoCE DMA 低约 2.2× 到 2.9×[1]。

Jetty / TP Channel 先把状态规模压住
如果只看 500 ns，容易把 OpenURMA 读成一篇“更快远端读”的论文。更底层的变化在状态模型。RoCE QP 把应用端点和传输端点绑在一起，于是每个 (local application, remote endpoint) 都要一个 QP；规模一大，连接状态按乘法增长。
OpenURMA 对 QP 的重构有很朴素的协议分层味道：应用是谁，和传输到哪个远端 host，应该是两件事。UB 把 per-application endpoint state 放到 Jetty，把 per-remote-host transport state 放到 TP Channel，任意 Jetty 可以经共享 TP Channel pool 指向远端端点。


![图片](/images/collections/wechat/asset/7ff803e04148.jpg)


图 2：RoCE 的 per-pair QP 让 NIC 状态按 O(N·M) 增长；UB 的 Jetty + TP Channel 拆分后，状态按 O(N+M) 增长。这个拆分决定 controller 能不能稳定留在片上状态里。来源：OpenURMA 论文 Figure 3。
论文给出的状态账本很关键：Jetty MVP 每条 20B，TP Channel 每条 56B，memory-region record 每条 32B；在 (N, M)=(1024, 1024) 时，OpenURMA 的总状态是 110.6 KB，OpenRoCE 的 QP pool 是 536.9 MB，比例达到 4855×[1]。即使按 full UB spec 把 Jetty 补到 48B，比例也只是从 4855× 收敛到 3855×。这个数量级差异不靠某个字段抠出来，而是由 O(N+M) 和 O(N·M) 的模型决定。
状态规模会继续变成热路径成本。生产 NIC 的 connection context 通常要塞进片上 SRAM；一旦 QP working set 溢出，每个操作都可能额外付一次 context refetch。论文在 Figure 14 里把这个 cliff 画出来：RoCE 在大约 N≈23 就触发 QP cache spill，而 UB 到 N≈1024 才触发；RoCE spill 之后每次 READ 约多付 1000 ns[1]。


![图片](/images/collections/wechat/asset/5255dc58ebd4.jpg)


图 3：状态模型最终会变成延迟曲线。RoCE 的 QP cache cliff 在 N≈23 附近出现，UB 因状态按加法增长，把 cliff 推到 N≈1024；图中数据来自论文仿真。来源：OpenURMA 论文 Figure 14。
这也和近期 scale-up fabric 的讨论接上了。前期对华为 UnifiedBus 的拆解里，UB 被放在“内存语义总线协议”这一层，而 CloudMatrix384 和 UB-Mesh 是两种拓扑实现[3]。OpenURMA 给这条判断补了一个底层机制：memory-semantic fabric 要先控制住端点状态，否则 controller 会被 host-memory spill 和 PCIe refetch 拖回外设模型。
相关阅读 RELATED华为灵衢 UnifiedBus 综述›


500 ns 的本质，是把远端访问放进 load/store 热路径
论文的 headline 数字是 UB load/store path 在 64B remote fetch 上达到约 500 ns，比匹配的 RoCE DMA baseline 2186 ns 低 4.37×，吞吐高 2.80×，RTL 实现在 Alveo U50 上约占 14% LUT[1]。这组数要和 cost decomposition 一起读：RoCE 的关键路径里，verb post、WQE construct、doorbell、DMA WQE fetch、target NIC↔DRAM、response DMA、CQE write、CQE poll 都在给外设模型付费。
UB load/store path 直接把 CPU load 指令接到 on-chip bus controller，完成后数据回到发起 load 的寄存器。短 remote fetch 过去要先把一次操作描述成 WQE，再让 NIC 作为外设读取、执行、写回完成；UB 的 load/store path 让远端访问进入 CPU 的 load-use dependency chain，transport header、sequence number、retransmission slot 和 completion queue 都退出这条热路径。


![图片](/images/collections/wechat/asset/1ba49a19b54c.jpg)


图 4：论文把 64B pointer-chase 的延迟拆成软件、PCIe、NIC pipeline、wire propagation 和 remote DRAM 几部分。RoCE 的红色 PCIe 部分占了主要成本；UB load/store 基本消掉这块固定开销。来源：OpenURMA 论文 Figure 22。


![图片](/images/collections/wechat/asset/ff9e16cb5eb9.jpg)


图 5：UB 在 load/store 上复现 500 ns vs 2186 ns 的主差距；即便回到 URMA work-request path，READ/WRITE/SEND/atomic 也因为避开 PCIe 往返而保持约 2.2× 到 2.9× 优势。来源：OpenURMA 论文 Figure 23。
延迟下降来自提交路径的变化：远端小读从 work-request / completion 变成了指令级访存。 这也是 UB load/store 的强区为什么很窄。论文还补了一组更贴近应用的边界：当 80% load 命中本地 hot lines 时，write-back / write-through 策略下均值可到 175 ns，相对 RoCE DMA cold miss 的 2186 ns 是 12.5×[1]。但顺序扫描这类 page-grain 友好的访问，Infiniswap / Fastswap 反而能靠 4KB page amortization 占优；大 payload 到 16KB-64KB 后，wire serialization 主导，四条栈收敛到 5% 以内。
所以 OpenURMA 的强区很清楚：submission-bound 的小操作、pointer chase、KV lookup、参数热行访问、分布式锁和 barrier。bulk transfer 要换另一套吞吐账本。

ordering 按需付费，才给 runtime 留出空间
OpenURMA 给生产系统的一条启发，是把“南向内存语义通道”和“北向 RDMA 通道”的分工讲得更硬。CloudMatrix384 的服务论文已经展示过一个系统层答案：UB 平面承载异步细粒度内存池访问，RDMA 平面承载 prefill 到 decode 的同步 KV 大块交接，VPC 管控制流[4]。OpenURMA 从协议实现层解释了为什么这个分工合理：细粒度、延迟敏感、可被 load/store 表达的访问适合内存语义；吞吐导向、可批量、可 overlap 的大块搬运仍然适合队列化路径，甚至可以继续交给 RDMA。


![图片](/images/collections/wechat/asset/09dfaa839d91.jpg)


图 6：UB 只在 Work Request 明确请求 strict order 时付 fence / gating 成本；RoCE RC 默认强顺序，因此延迟和吞吐曲线基本不随请求比例变化。这个实验把“ordering opt-in”从协议描述变成了性能曲线。来源：OpenURMA 论文 Figure 35。
ordering 是这篇论文里容易被轻轻带过、但生产系统会很在意的一点。RoCE RC 把 strict order 当默认语义，应用不一定每次都需要，却一直在付账；OpenURMA 把 strict order 变成 per-operation opt-in。Figure 35 里，UB 的延迟会随着 strict-order 请求比例线性上升，RoCE 则一直停在强顺序成本上[1]。
这给 runtime 留了一个新接口：只有锁、barrier、依赖链这样的操作需要强顺序，普通小读写可以走更轻的路径。 看一条 fabric 能不能进入热路径，不能只看带宽或名字；要看端点状态是否有界、controller 在不在关键路径上、ordering 能否 opt-in、上层 runtime 能否把流量按语义拆开。内存语义最后要落到状态表大小、doorbell 路径、completion 语义、ordering 成本和 p99 延迟曲线。
相关阅读 RELATEDKV Cache 池化的南向选择›


边界：这是一把尺子，离产品判决还差一步
OpenURMA 最该被珍惜的地方，是它把一个原本高度闭源的方向做成了可复现实验物。论文用 clean-room RTL、SystemC 和 gem5 scaffold 去复现 UB 的 transport / transaction 层，并把代码公开在 GitHub[2]。这让“UB 比 RDMA 快”这种宽泛表述被压成了更可核查的问题：哪类请求、哪条提交路径、多少状态、什么 ordering 语义、什么仿真边界。
但边界也要摆清楚。第一，OpenURMA 是 clean-room implementation 和多层仿真/综合框架，论文自己说明还没有物理 FPGA 运行、没有生产驱动、没有真实线缆下 loss / contention 的首包延迟测量[1]。第二，OpenRoCE 是 apples-to-apples baseline，用来固定工具链、target 和 harness；它无法代表 ConnectX-7 这类多代优化商用 RNIC 的完整产品力。论文用 ConnectX-7 公开区间校准模型，在 8B RDMA WRITE 上落入 1.5-1.8 μs 范围并控制在 ±5%，但没有宣称打赢某块具体商用 NIC[1]。第三，UB 也有弱区：16KB-64KB 大块传输、RoCE BF inline WRITE/SEND、小集群未触发 QP spill 的场景，差距都会收窄。
这篇 reading 可以收在一个更朴素的判断上：OpenURMA 给 memory-semantic scale-up fabric 补上了可复现实验底座，并把“让远端小访问绕开 PCIe 外设路径”这条路线的状态规模、短操作延迟和 ordering 成本量化出来。 后续要追的已经不只是平均延迟，而是真实硬件、驱动、通信库和调度器能否把这组语义接进生产：小操作走 load/store，批量搬运走 URMA / RDMA，ordering 只在需要时付费，p99 在多租户和拥塞下仍然受控。


结论和展望：OpenURMA 把 UB 的工程讨论从“总线语义更快”推进到状态、PCIe 往返和 ordering 三张账。下一步要看的，是真实硬件和 runtime 能不能把 500 ns 小访问变成可运维的生产路径。

延伸阅读华为灵衢 UnifiedBus 综述：先把协议和拓扑分开，再谈超节点›KV Cache 池化的南向选择：scale-up 内存语义的收益边界›SAC：用 CXL 给稀疏注意力做一个只取 top-k 的分离式 KV Cache›


参考
[1] OpenURMA: A Clean-Room Open Implementation of the Unified Bus Protocol：https://arxiv.org/abs/2605.28717
[2] OpenURMA GitHub Repository：https://github.com/bojieli/OpenURMA
[3] 前期调研：华为灵衢 UnifiedBus 综述：先把协议和拓扑分开，再谈超节点：https://miraclefarms.github.io/notes/2026/06/24/huawei-unifiedbus-survey/
[4] Serving Large Language Models on Huawei CloudMatrix384：https://arxiv.org/abs/2506.12708
[5] Bojie Li Personal Homepage：https://01.me/en/whoami/
[6] Bojie Li CV：https://01.me/files/bojieli-cv-2026.pdf
Less hype · more systems.MiracleFarms · READING · NOTE