---
title: pd分离下decode请求被抢占再恢复
date: "2026-08-13 00:00:00"
updated: "2026-08-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/pd分离下decode请求被抢占再恢复/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2071256072153837666
---


在大模型推理服务中，长上下文请求会占用大量 KV Cache。当 Decode 节点的 HBM 空间不足时，调度器通常需要抢占部分请求，释放它们占用的 KV blocks。

最直接的做法是丢弃被抢占请求的 KV Cache，等它再次被调度时重新执行 Prefill。但对于长上下文请求，这意味着大量重复计算。一个自然的优化方向是：抢占时把 KV Cache 保存到 Host 内存，恢复时直接执行 H2D load-back。

问题是，**KV Cache 能正确地 offload 和 restore，不代表请求一定能够及时恢复**。

如果调度器要求一次性为完整 KV snapshot 分配所有 GPU blocks，却又没有为恢复请求预留容量，那么持续运行的 Decode 请求和后来进入的新请求就可能不断拿走刚释放的空间。最终表现为：Host 上明明保存着完整 KV Cache，恢复请求却长期拿不到足够的 HBM，甚至比重新 Prefill 更慢。

这篇文章主要分析这一“恢复饥饿”问题，（**可以主要了解一下背景即可，方案我目前还没验证，验证后更新**）并给出一套由恢复队列、restore credit、admission control、恢复后保护组成的调度方案。

1. 问题背景：抢占之后如何恢复 KV Cache
对于一个已经进入 Decode 阶段的请求，其有效上下文不只包含原始 Prompt，还包含已经生成的 Token。调度器抢占该请求时，必须在以下两种恢复路径中做选择。

1.1 重新 Prefill
被抢占请求的 GPU KV Cache 被释放。请求恢复时重新进入 Decode 节点的 `prefill_queue`，对“Prompt + 已生成上下文”重新执行 Prefill，从而重建 KV Cache。

这种做法的优点是实现简单，而且能够复用现有的 chunked prefill 调度机制；缺点是长上下文需要重复计算，恢复延迟和计算成本都很高。

假设 Decode 侧每轮的 Token Budget 为：

![](https://www.zhihu.com/equation?tex=+B%3D4096.+)

当前有 6 个活动 Decode 请求，并启用了 MTP。若按每个请求本轮占用 
![](https://www.zhihu.com/equation?tex=1%2B3%3D4) 个 Token Budget 计算，则 Decode 消耗为：

![](https://www.zhihu.com/equation?tex=+B_%7Bdecode%7D%3D6%5Ctimes4%3D24.+)

本轮剩余的 Prefill Budget 为：

![](https://www.zhihu.com/equation?tex=+B_%7Bprefill%7D%3D4096-24%3D4072.+)

因此，被抢占的长请求可以一边按大约 4K Token 的 chunk 重新计算，其他活动请求一边继续 Decode。每轮有多少计算 Budget 和可分配的 HBM，就推进多少重算进度。

每轮调度顺序

活动请求 Decode ──► 消耗约 24 Token Budget
                         │
                         ▼
剩余 Budget ──────► 为重 Prefill 调度约 4072 Token
重新 Prefill 的关键特征是“可分块推进”：请求不需要在第一轮就完成全部上下文计算，而是可以通过多个调度轮次逐渐重建 KV。

1.2 Host KV Offload 与 Restore
抢占时执行：

GPU HBM KV Cache
        │ D2H
        ▼
Host Memory KV Snapshot
恢复时执行：

Host Memory KV Snapshot
        │ H2D
        ▼
GPU HBM KV Cache
这条路径避免了重复计算，理论上尤其适合长上下文请求。但它有一个前提：恢复前必须在 GPU 上拿到足够的 KV blocks。

对于普通 Full Attention，下一次 Decode forward 需要访问完整的历史 KV。即使数据已经完整保存在 CPU DRAM 中，只要 HBM 无法容纳这份历史 KV，请求就不能继续生成。

2. 为什么 Host Restore 反而可能更慢
考虑一个 8000 Token 的长请求，KV block size 为 16 Token。忽略额外对齐时，它需要的逻辑 KV block 数量为：

![](https://www.zhihu.com/equation?tex=+R%3D%5Cleft%5Clceil%5Cfrac%7B8000%7D%7B16%7D%5Cright%5Crceil%3D500.+)

假设一个 DP replica 总共只有约 1169 个可用 KV blocks，那么单个请求恢复时需要一次拿到约 500 个 blocks，占总容量的约 43%。

当前如果采用完整恢复语义，流程是：

等待约 500 个空闲 blocks
          │
          ▼
一次性为请求分配完整目标空间
          │
          ▼
执行完整 H2D load-back
          │
          ▼
请求重新进入 Decode
问题在于，其他活动请求仍在持续生成并增长 KV Cache；已经运行完成的请求虽然会释放 blocks，但这些 blocks 可能马上被新请求或其他 Decode 请求拿走。

于是系统可能长期处于下面的状态：

- 每隔一段时间都会释放少量 blocks；
- 空闲容量始终达不到完整恢复所需的 500 blocks；
- 恢复请求在 waiting queue 中反复尝试；
- 新请求和现有 Decode 请求继续消耗容量；
- Host snapshot 始终无法执行 H2D。这不是 KV Offload 的正确性问题，也不一定是 PCIe、HCCS 或 NVLink 带宽问题，而是一个典型的**调度饥饿问题**：恢复请求需要一个较大的连续“容量机会”，但调度器没有为它积累和保护这个机会。

3. 根因：全有或全无的恢复遇上无预留调度
这个问题由三个条件共同造成。

3.1 恢复具有完整容量门槛
假设 Host 上需要恢复的 KV 数量为 
![](https://www.zhihu.com/equation?tex=R) 个 blocks，请求恢复后还需要为近期 Decode 增长预留 
![](https://www.zhihu.com/equation?tex=D) 个 blocks，则恢复目标为：

![](https://www.zhihu.com/equation?tex=+T%3DR%2BD.+)

在最简单的完整恢复实现中，只有满足以下条件才能启动 H2D：

![](https://www.zhihu.com/equation?tex=+free%5C_blocks%5Cge+R%2BD.+)

如果系统还有其他正在执行的 KV load 以及全局安全余量，则更完整的条件应写成：

![](https://www.zhihu.com/equation?tex=+free%5C_blocks-reserved_%7Binflight%7D-watermark%5Cge+R%2BD.+)

3.2 空闲 blocks 会被后来者抢走
如果调度器只检查“当前是否放得下”，但不为队首恢复请求预留正在释放的容量，那么每次释放出来的少量 blocks 都可能被新请求 admission 或现有请求的 KV 增长消耗。

恢复请求虽然等待时间越来越长，但可用容量并不会随时间积累。

3.3 Decode 优先策略会放大饥饿
许多推理调度器优先保证 Decode 的 ITL，再用剩余 Token Budget 执行 Prefill 或其他任务。这对常规请求有利，但如果恢复请求既不属于可分块 Prefill，也不能在 HBM 不足时进入 Decode，它就可能落在调度策略的缝隙中。

因此，仅仅实现 D2H/H2D 数据通路还不够。要真正解决问题，调度器必须显式建模“恢复债务”。

4. 业界方案调研

4.1 vLLM V1
[vLLM V1 的优化文档](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/blob/main/docs/configuration/optimization.md)说明，当 KV Cache 不足时，V1 默认采用 preemption + recomputation，而不是旧版以 `SWAP` 为主的抢占模式。V1 还提供了 [KV Offload Connector 接口](https://link.zhihu.com/?target=https%3A//docs.vllm.ai/en/stable/api/vllm/v1/kv_offload/base/)，可以将 KV Cache 扩展到 CPU 等后端。

vLLM 的相关演进分别覆盖了几个不同问题：

- 为已经开始的异步 KV load 预留完整剩余容量，避免后来请求抢走空间；
- 按完整 Input Sequence Length（ISL）做 admission，避免长请求只因第一个 chunk 放得下就进入系统；
- 设置 KV Cache watermark，保留少量空闲 blocks，以降低抢占发生概率；
- 探索 progressive onload，缓解大请求传输造成的队头阻塞。
4.2 SGLang HiCache
[SGLang HiCache](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/blob/main/docs_new/docs/advanced_features/hicache_design.mdx)提供分层 KV Cache：GPU HBM 作为 L1、CPU pinned memory 作为 L2，并可继续接入 L3 存储。它支持 load-back 和 prefetch。

SGLang 还提供 `num_reserved_decode_tokens` 一类的容量控制参数。其核心思想是：请求被接纳时不能只考虑眼前能否进入，还要考虑后续 Decode 的 KV 增长空间。参数说明可以参考 [SGLang Server Arguments](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/blob/main/docs/advanced_features/server_arguments.md)。

4.3 相关 PR 与 RFC
下表中的状态核对时间为 2026 年 8 月。

项目PR / RFC状态主要解决方式vLLM#44560：Resolve multiple async KV load deadlock已合入为先进入的异步 KV load 预留完整剩余容量，避免后来请求抢走容量vLLM#33526：Progressive KV Cache CPU Onloading已关闭，未实施提议分批 progressive onload，主要解决传输阶段的队头阻塞vLLM#37307：Schedule requests based on full ISL已合入按完整 ISL 做 admission，避免长请求只因首个 chunk 能放下就进入vLLM#44594：Add KV Cache watermark已合入通过 watermark 预留少量空闲 blocks，降低抢占概率SGLang#7196：Support decode retract已合入保存并完整恢复 CPU snapshot，同时对恢复所需容量记账SGLang#29471：Radix-aware resume开放中如果 GPU 仍有 Radix Prefix，只从 CPU snapshot 恢复缺失的 suffixSGLang#17216：Dynamic block offload已合入NSA/DSA 稀疏注意力在运行期逐页 offload；不直接适用于普通 Full AttentionvLLM Ascend#10742：Recompute KV Cache offloading已合入在正常 waiting queue 中反复尝试完整恢复，未提供 reservation 或 agingvLLM Ascend#12128：Add KV Cache watermark开放中移植 KV watermark，降低抢占概率，但不直接解决已有 snapshot 的恢复饥饿从这些方案可以看到，watermark、完整 ISL admission、progressive onload 和恢复容量预留解决的是不同层面的问题：

- **Watermark**：减少系统进入危险水位和触发抢占的概率；
- **完整 ISL admission**：避免接纳注定无法稳定运行的长请求；
- **Progressive onload**：降低单次传输粒度，缓解传输队头阻塞；
- **Restore reservation**：让已经被抢占的请求最终一定能重新获得 HBM。其中，真正直接解决“Host snapshot 恢复饥饿”的是最后一项。

5. 建议方案：显式管理恢复债务
建议组合 vLLM 的容量预留思路和 SGLang 的恢复债务记账方式，在每个 DP replica 内增加独立的恢复调度机制。

完整流程如下：

RUNNING
   │ HBM 不足，被抢占
   ▼
OFFLOADING
   │ D2H 完成
   ▼
WAITING_RESTORE ──► FALLBACK / ROUTER_RETRY
   │ 容量和调度条件满足
   ▼
RESTORING
   │ H2D 完成
   ▼
RESTORE_PROTECTED
   │ 达到最小驻留期
   ▼
RUNNING

5.1 建立独立的等待恢复队列
被抢占且已经生成 Host snapshot 的请求进入 `waiting_restore_queue`，不要与普通新请求完全等价地竞争 admission。

恢复顺序可以采用：

- FCFS：逻辑简单，天然避免老请求长期饥饿；
- Priority Aging：业务优先级与等待时间共同决定顺序；
- FCFS + 有限旁路：后面的短恢复请求可以使用未预留容量，但不能占用队首请求已经积累的 restore credit。一种简单的 aging 分数可以写成：

![](https://www.zhihu.com/equation?tex=+score_r%3Dbase%5C_priority_r%2B%5Clambda%5Ccdot+wait%5C_time_r.+)

![](https://www.zhihu.com/equation?tex=%5Clambda) 控制等待时间对优先级的提升速度。无论采用哪种规则，都必须保证等待时间能够实际转化为更高的恢复机会，而不只是改变队列排序。

5.2 为队首请求积累 Restore Credit
对当前选中的恢复请求 
![](https://www.zhihu.com/equation?tex=r)，定义：

- 
![](https://www.zhihu.com/equation?tex=R_r)：CPU 上需要 load-back 的 KV block 数量；
- 
![](https://www.zhihu.com/equation?tex=D_r)：恢复后为近期 Decode 增长保留的 KV block 数量；
- 
![](https://www.zhihu.com/equation?tex=T_r%3DR_r%2BD_r)：该请求的恢复目标；
- 
![](https://www.zhihu.com/equation?tex=C_r)：已经为该请求保留的 restore credit。满足：

![](https://www.zhihu.com/equation?tex=+0%5Cle+C_r%5Cle+T_r.+)

随着运行请求完成并释放 GPU KV blocks，调度器逐步增加 
![](https://www.zhihu.com/equation?tex=C_r)：

![](https://www.zhihu.com/equation?tex=+C_r%5Cleftarrow%5Cmin%28T_r%2C+C_r%2Bnewly%5C_freed%5C_blocks%29.+)

这里的 credit 是一种调度器容量承诺：它可以暂时不对应已经写入 KV 数据的物理 blocks，但这部分容量不能再被新请求 admission 消耗。

为了避免多个大请求同时预留导致 HBM 利用率过低，第一版实现可以只允许一个队首请求积累完整 credit。后续请求继续排队，等队首恢复完成后再获得 reservation。

5.3 Admission 必须扣除恢复预留和 Decode 安全余量
设：

- 
![](https://www.zhihu.com/equation?tex=F)：当前空闲 KV blocks；
- 
![](https://www.zhihu.com/equation?tex=C)：已经承诺给恢复请求的 blocks；
- 
![](https://www.zhihu.com/equation?tex=W)：为运行中 Decode 增长保留的全局安全余量。那么可供新请求 admission 使用的容量应为：

![](https://www.zhihu.com/equation?tex=+%5Cboxed%7B+A_%7Bnew%7D%3D%5Cmax%280%2CF-C-W%29+%7D+)

新请求只有在其 admission 需求不超过 
![](https://www.zhihu.com/equation?tex=A_%7Bnew%7D) 时才能进入运行集合。

需要注意，
![](https://www.zhihu.com/equation?tex=W) 和 
![](https://www.zhihu.com/equation?tex=D_r) 的作用不同：

- 
![](https://www.zhihu.com/equation?tex=W) 服务于当前所有 running 请求，避免下一轮 Decode 立即陷入 OOM；
- 
![](https://www.zhihu.com/equation?tex=D_r) 属于即将恢复的请求，保证它完成昂贵的 H2D 后至少还能继续生成，而不是立刻再次陷入容量不足。如果支持完整 ISL admission，还应根据请求的完整输入长度或可接受的容量上界进行判断，而不能只看第一个 Prefill chunk 是否放得下。

5.4 满足“历史 KV + 后续 Decode 空间”后再恢复
最简单的恢复条件为：

![](https://www.zhihu.com/equation?tex=+F%5Cge+R_r%2BD_r.+)

考虑其他 in-flight load 和全局 watermark 后，可以扩展为：

![](https://www.zhihu.com/equation?tex=+F-reserved_%7Binflight%7D-W%5Cge+R_r%2BD_r.+)

条件满足后，调度器执行以下操作：

- 原子地确认或分配目标 GPU blocks；
- 将请求状态切换为 `RESTORING`；
- 执行 Host 到 Device 的 KV copy；
- H2D 完成后把请求放回 running queue；
- 消耗对应 restore credit，解除未使用的 reservation。容量检查、block 分配和状态切换必须具有一致性。否则多个异步恢复任务可能同时观察到相同的空闲容量，最终形成超额承诺或死锁。

5.5 正确计算恢复后的 Decode 预留量

![](https://www.zhihu.com/equation?tex=D_r) 不应简单写死为一个常量，而应至少覆盖：

- 下一轮正常 Decode 所需的 Token；
- MTP 或 speculative decoding 的 lookahead slots；
- 当前最后一个 KV block 的剩余槽位；
- 最小驻留期内计划生成的 Token；
- block 对齐造成的额外空间。在 block size 为 
![](https://www.zhihu.com/equation?tex=b) 时，可以把所需新增 Token 数转换为 blocks：

![](https://www.zhihu.com/equation?tex=+D_r%3Dblocks%5C_needed%28request_r%2C+lookahead%2Bprotected%5C_tokens%2C+b%29.+)

这里应复用实际 KV block allocator 的计算逻辑，因为请求当前所在 block 的填充程度会影响真实新增 block 数量。

6. 恢复后设置最小驻留期
请求刚完成一次昂贵的 H2D load-back，如果下一轮马上再次被抢占，会产生严重的 KV Cache thrashing：

GPU → CPU offload
CPU → GPU load-back
只 Decode 几步
GPU → CPU offload
CPU → GPU load-back
……
因此，恢复成功的请求应进入短暂的 `RESTORE_PROTECTED` 状态。保护条件可以是：

- 至少执行 
![](https://www.zhihu.com/equation?tex=N) 个 Decode steps；
- 至少生成 
![](https://www.zhihu.com/equation?tex=N) 个 Token；
- 至少驻留 
![](https://www.zhihu.com/equation?tex=T) 毫秒；
- 或者执行到 H2D 成本被一定计算量摊销之后。保护期内，调度器优先选择其他可抢占请求。但保护不应是绝对不可打破的：当系统即将 OOM，或更高优先级请求必须立即执行时，仍然可以强制抢占受保护请求，并记录一次 protection break。

选择抢占 victim 时，也不能只看谁占用的 blocks 最多。更合理的候选因素包括：

- 请求业务优先级；
- 已经执行的进度和剩余生成长度；
- 抢占后可释放的 blocks；
- 重新 Prefill 或再次 Restore 的成本；
- 是否处于恢复保护期；
- 是否会产生新的大额恢复债务。