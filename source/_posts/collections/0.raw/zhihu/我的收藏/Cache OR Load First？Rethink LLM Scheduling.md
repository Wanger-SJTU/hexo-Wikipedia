---
title: Cache OR Load First？Rethink LLM Scheduling
date: "2026-07-11 00:00:00"
updated: "2026-07-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Cache-OR-Load-First-Rethink-LLM-Scheduling/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2059354689678862105
---


今天分享一篇2026.7.9发布在arxiv上的文章，聚焦agent serving efficiency问题，来自sjtu IPADS实验室和阿里。

[http://arxiv.org/abs/2607.08565](https://link.zhihu.com/?target=http%3A//arxiv.org/abs/2607.08565)
Motivation
长期以来agent serving system存在矛盾：KV reuse主要来自轮次之间的请求，因此在进程执行tool call的时候，之前轮次的全部KV-cache需要驻留在GPU上；而随着服务器到达的请求不断增多，GPU上驻留了越来越多请求，造成了整体的效率低下。即cost-load balance的问题。

Workload Profiling Findings
文章真实采集了两种real-world workload。在大规模集群上，agentic workload的KV-cache运行状态有以下特征：

- KV-cache的命中率很高
- 大多数hit来自intra-session，即后面轮次对前面的复用
- system prompt占reuse的18–20 %，表明用户使用的agent framework有不小重合
- KV reuse在时间上也有特征，在论文的场景下主要集中在前100s，这是因为agent的单次任务大概就是这个时间，而reuse主要来自agent单次task的multi-turn requests，所以之后复用时间延长可能是用户没有及时响应agent answer
- session之间的有token usage存在差异性，前25%的sessions占80%的token usage
- 尽管token usage存在差异，但是在任意时刻到达的请求数量都超过了服务器的承载实例上限，所以不同sessios的token数量看起来也是平衡的
![](https://pic1.zhimg.com/v2-a7105519fac8cdcc059a939fb44097f8_r.jpg)两种trace的KV reuse

![](https://pic1.zhimg.com/v2-6f5fb1df4c561d7a870e62a2443ac164_r.jpg)两种trace的时间分布
![](https://pic1.zhimg.com/v2-4a2fe014a5de168e3b05712d5af815d0_r.jpg)reuse source type ratio
Analysis of existing schedulers
文章对现有的LLM调度器进行了分析：都是以请求为单位，按照某种分数计算规则来对请求排序的。这些分数在计算时特别关注两点：（1）关注现有的KV-cache状态 （2）关注请求本身的load

作者首先把已有的 cluster-level scheduler 抽象成：

![](https://www.zhihu.com/equation?tex=i%5E%2A%3D%5Carg%5Cmin_i+f%28c_i%2Cl_i%29) 

其中：

-  c_i：请求在实例 i上能够命中的 **local KV 长度或比例**； 
-  l_i​：实例 iii 当前的负载； 
-  f(c_i,l_i)：把 KV locality 和 load 组合起来的评分函数。 换句话说，现有 scheduler 都在回答：

 这个请求应该去“KV 命中更多的实例”，还是去“负载更低的实例”？紧接着对BAILIAN，LMetric，Load-balance的实际策略做了解读，说明这些策略是可用作者的设定解释的。这些也是作者设定的baselines。

![](https://pic3.zhimg.com/v2-15f05a488f39012025a76710ce67efc2_r.jpg)不同方法的倾向
Global KV Tier Decouples Local Miss from Cache Miss
第一个关键观察是：在 global KV tier 资源充足时，负载均衡并不一定意味着失去 KV 复用。

传统 cache-aware scheduler 通常隐含了一个假设：如果请求没有被发送到保存其 KV Cache 的 GPU，那么这部分前缀就需要重新计算。也就是说：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BLocal+Miss%7D+%5Capprox+%5Ctext%7BCache+Miss%7D+)

但在分层 KV Cache 系统中，这个假设不再成立。即使目标 GPU 上没有对应的 KV，请求仍然可以从 CPU 或远端 global tier 中加载缓存：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BLocal+Miss%7D+%5Crightarrow+%5Ctext%7BGlobal+KV+Fetch%7D+)

而不一定退化为：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BLocal+Miss%7D+%5Crightarrow+%5Ctext%7BPrefix+Re-computation%7D+)

实验中，当 global tier 容量和带宽足够时，BAILIAN、LMetric 和纯负载均衡策略的总 KV reuse ratio 都接近 73%–75%。它们的差异主要不在于“是否复用 KV”，而在于“KV 从哪里获得”。

BAILIAN 更多依赖 GPU 本地命中；纯负载均衡策略的本地命中较少，但可以通过 global tier 补回大部分缓存。换句话说，global tier 在一定程度上解耦了 KV reuse 和 request placement：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BRequest+Placement%7D+%5Cnot%5CRightarrow+%5Ctext%7BLocal+KV+Location%7D+)

这也是为什么在 global tier 充足时，纯负载均衡策略的吞吐量可以接近 cache-aware baseline。它牺牲的是 local hit，而不是全部 KV reuse。

Excessive Locality Causes Load Imbalance
第二个观察是：过度追求 local KV hit，可能让集群负载变得更加不均衡。

Cache-aware scheduler 倾向于把请求发送到已经保存相关 KV 的实例。这样做可以减少缓存加载开销，但也会形成一种正反馈：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BAn+Instance+Holds+Popular+KV%7D+)

![](https://www.zhihu.com/equation?tex=+%5CDownarrow+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BMore+Requests+Are+Routed+to+It%7D+)

![](https://www.zhihu.com/equation?tex=+%5CDownarrow+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BMore+Related+KV+Is+Cached+Locally%7D+)

![](https://www.zhihu.com/equation?tex=+%5CDownarrow+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BFuture+Requests+Prefer+the+Same+Instance%7D+)

结果是，少数实例因为缓存了热门前缀而持续接收请求，其他实例却没有被充分利用。

论文使用 maximum-to-mean load ratio 衡量这种不均衡。实验中，纯负载均衡策略的平均比值约为 
![](https://www.zhihu.com/equation?tex=2.1%5Ctimes)，而 BAILIAN 和 LMetric 分别达到 
![](https://www.zhihu.com/equation?tex=2.7%5Ctimes) 和 
![](https://www.zhihu.com/equation?tex=3.0%5Ctimes)。

这说明 cache-aware scheduler 虽然提高了 local hit ratio，但也可能制造新的热点：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BHigher+Local+Hit%7D+%5Crightarrow+%5Ctext%7BRequest+Concentration%7D+%5Crightarrow+%5Ctext%7BGPU+Load+Imbalance%7D+)

在存在 global KV tier 的情况下，这种倾斜有时是不必要的。因为部分 local miss 本可以通过 global fetch 解决，scheduler 却仍然为了保留本地命中，把请求挤到少数 GPU 上。

因此，问题并不是 KV locality 本身没有价值，而是现有策略可能高估了 local miss 的代价，从而为缓存命中付出了过高的负载均衡成本。

![](https://pic2.zhimg.com/v2-9d2fc778751dda8cdef63764bffb223d_r.jpg)
Load Balancing Alone Is Not Enough
不过，global tier 的存在也不意味着 scheduler 可以完全忽略 KV locality。

从 global tier 加载 KV 仍然需要经历查询、网络传输和 GPU 写入。即使数据没有重新计算，global hit 的成本通常仍然高于 local hit：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BCost%7D_%7B%5Ctext%7Bglobal+hit%7D%7D++%3E++%5Ctext%7BCost%7D_%7B%5Ctext%7Blocal+hit%7D%7D+)

因此，纯负载均衡策略虽然让 GPU 计算负载更加均匀，却会产生大量 global KV fetch。请求可能需要等待缓存传输完成，global tier 的带宽也可能成为新的瓶颈。

当 global tier 的容量或带宽不足时，这个问题会更加明显：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BMore+Global+Fetches%7D+%5Crightarrow+%5Ctext%7BHigher+Transfer+Contention%7D+%5Crightarrow+%5Ctext%7BLonger+Request+Latency%7D+)

如果 global tier 无法容纳所有活跃 session 的 KV，部分 local miss 甚至会重新退化为 prefix recomputation。

在没有 global tier 的实验中，BAILIAN、LMetric 和纯负载均衡策略的 KV hit ratio 分别约为 58%、33% 和 6%。此时，BAILIAN 因为保留了更多 local KV，反而能够获得更高的吞吐量。

因此，纯负载均衡走向了另一个极端：它改善了 GPU 利用率，却低估了 global fetch 的真实成本。

最终，4.1 排除了两种简单方案：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BAlways+Prefer+Locality%7D+%5Crightarrow+%5Ctext%7BSevere+Load+Imbalance%7D+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BAlways+Prefer+Load+Balance%7D+%5Crightarrow+%5Ctext%7BExcessive+Global+KV+Traffic%7D+)

真正需要解决的问题是：只牺牲少量 local hit 来改善整体负载，同时避免让 global tier 承担过多流量。这也为后续的 session-aware scheduling 提供了直接动机。

Approach：SMETRIC
SMETRIC 的出发点是：在 agent workload 中，一个 session 的多轮请求并不是彼此独立的。

后续请求通常会携带此前的完整对话历史，因此它能够复用前几轮请求留下的 KV Cache。只要这部分 KV 仍然保存在原实例的 GPU 上，cache-aware scheduler 就会持续把该 session 的请求送回同一个实例。

论文的 trace 结果验证了这种 **session stickiness**。在 BAILIAN 的 KV-aware 策略下，
![](https://www.zhihu.com/equation?tex=96.6%25) 的后续请求都会回到处理 first-turn 的实例；而在纯负载均衡策略下，这一比例只有 
![](https://www.zhihu.com/equation?tex=4.0%25)。

因此，在一个优先保留 local KV hit 的 scheduler 中：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BFirst-Turn+Placement%7D+%5Capprox+%5Ctext%7BWhole-Session+Placement%7D+)

也就是说，scheduler 表面上是在逐个调度请求，实际上，first-turn 的落点往往已经决定了整个 session 后续会运行在哪个实例上。

这带来一个直接的设计机会：不需要对每一轮请求都强行做负载均衡，只要把不同 session 的 first-turn 均匀分散到集群中，后续请求就会在 KV locality 的作用下自然保持分散。

Differential Routing for First and Follow-Up Requests
基于上述观察，SMETRIC 不再对所有请求使用同一种评分函数，而是根据请求在 session 中的位置采用两种不同策略。

对于 first-turn 请求，SMETRIC 完全按照当前负载进行路由：

![](https://www.zhihu.com/equation?tex=+i%5E%2A+%3D++%5Carg%5Cmin_i+l_i+)

其中，
![](https://www.zhihu.com/equation?tex=l_i) 表示实例 
![](https://www.zhihu.com/equation?tex=i) 的当前负载。

first-turn 可能包含可复用的 agent system prompt，但这些 KV Cache 主要属于跨 session 共享前缀。即使目标 GPU 上没有本地缓存，也可以从 global KV tier 获取。因此，SMETRIC 愿意在 first-turn 上牺牲一部分 local hit，用它换取更均匀的 session 初始分布。

对于 follow-up 请求，scheduler 首先寻找 KV 命中长度最大的实例：

![](https://www.zhihu.com/equation?tex=+s+%3D++%5Carg%5Cmax_i+c_i+)

其中，
![](https://www.zhihu.com/equation?tex=c_i) 表示当前请求在实例 
![](https://www.zhihu.com/equation?tex=i) 上能够获得的 local KV hit length。

如果没有出现异常情况，SMETRIC 就将请求发送到实例 
![](https://www.zhihu.com/equation?tex=s)：

![](https://www.zhihu.com/equation?tex=+i%5E%2A%3Ds+)

由于 
![](https://www.zhihu.com/equation?tex=s) 通常就是处理该 session 前一轮请求的实例，这种策略会让同一 session 的后续请求保持在原实例上，从而复用完整的对话历史 KV。

整体策略可以简化为：

![](https://www.zhihu.com/equation?tex=+i%5E%2A%3D+%5Cbegin%7Bcases%7D+%5Carg%5Cmin_i+l_i%2C+%26+%5Ctext%7Bfirst+turn%7D+%5C+%5Carg%5Cmax_i+c_i%2C+%26+%5Ctext%7Bfollow-up+turn%7D+%5Cend%7Bcases%7D+)

它将两类目标分开处理：

- first-turn 负责决定 session 的负载分布；
- follow-up turn 负责保留 session 内的 local KV reuse。因此，SMETRIC 只让少量 first-turn 请求依赖 global tier，大部分后续请求仍然在 GPU local tier 中完成 KV 复用。

Overload Guard for Growing Sessions
仅仅平衡 first-turn 并不能保证负载始终均匀，因为 scheduler 在 session 刚开始时并不知道它最终会增长到多长。

例如，两个最初都很短的 session 可能被分配到同一个实例。随着交互轮数增加，它们的上下文和输出逐渐变长，原本均衡的实例最终也可能变成热点。

因此，SMETRIC 在执行 session stickiness 之前加入了一个 overload guard。

设 KV 命中最多的目标实例为 
![](https://www.zhihu.com/equation?tex=s)，其当前负载为 
![](https://www.zhihu.com/equation?tex=l_s)，集群平均负载为：

![](https://www.zhihu.com/equation?tex=+%5Cbar%7Bl%7D+%3D++%5Cfrac%7B1%7D%7BN%7D+%5Csum_%7Bi%3D1%7D%5E%7BN%7Dl_i+)

只有在下面的条件成立时，follow-up 请求才继续留在实例 
![](https://www.zhihu.com/equation?tex=s)：

![](https://www.zhihu.com/equation?tex=+l_s+%5Cleq+%5Ctext%7BOVERLOAD%7D%5Ccdot%5Cbar%7Bl%7D+)

其中，
![](https://www.zhihu.com/equation?tex=%5Ctext%7BOVERLOAD%7D%3E1) 是允许实例偏离平均负载的阈值。

如果该条件不成立，说明原实例已经明显过载。此时 SMETRIC 暂时放弃 session affinity，重新选择负载最低的实例：

![](https://www.zhihu.com/equation?tex=+i%5E%2A+%3D++%5Carg%5Cmin_i+l_i+)

从效果上看，这相当于将 session 的后续执行迁移到另一个实例。由于 session 的 KV 仍然可以通过 global tier 获取，这种迁移通常不会完全失去历史 KV reuse，只是会增加一次 global fetch。

这个 guard 处理的不是常态，而是 first-turn placement 无法提前预测的长尾情况：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BBalanced+Initial+Placement%7D+%5Cnot%5CRightarrow+%5Ctext%7BBalanced+Future+Execution%7D+)

Cache-Eviction Guard for Inactive Sessions
Session stickiness 只有在原实例仍然保存对应 KV Cache 时才有价值。

如果一个 session 长时间没有发出新请求，它的 KV 可能已经从 GPU local tier 中被驱逐。此时继续把请求发送到原实例，并不会获得预期的 local hit，反而会限制负载均衡的选择空间。

SMETRIC 通过比较实际命中长度和预期命中长度来判断这种情况。

设：

- 
![](https://www.zhihu.com/equation?tex=c_s)：请求在最佳实例 
![](https://www.zhihu.com/equation?tex=s) 上的实际 local KV hit length；
- 
![](https://www.zhihu.com/equation?tex=%5Cwidehat%7Bc%7D)：根据请求历史估算的 expected hit length。由于标准 LLM API 中的 follow-up 请求通常携带完整对话历史，如果 session 的 KV 没有被驱逐，那么实际命中应该覆盖大部分历史内容：

![](https://www.zhihu.com/equation?tex=+c_s+%5Capprox+%5Cwidehat%7Bc%7D+)

这里的 
![](https://www.zhihu.com/equation?tex=%5Cwidehat%7Bc%7D) 只包括此前已经出现的 conversation history，不包括当前请求中新追加、尚未被缓存的 turn。

SMETRIC 使用下面的条件判断缓存是否仍然有效：

![](https://www.zhihu.com/equation?tex=+c_s++%3E++%5Ctext%7BHIT_RATIO%7D%5Ccdot%5Cwidehat%7Bc%7D+)

其中，
![](https://www.zhihu.com/equation?tex=%5Ctext%7BHIT_RATIO%7D%3C1)，用于容忍 tokenization、缓存块粒度或上下文处理造成的小幅误差。

如果实际命中长度明显低于预期：

![](https://www.zhihu.com/equation?tex=+c_s+%5Cleq+%5Ctext%7BHIT_RATIO%7D%5Ccdot%5Cwidehat%7Bc%7D+)

SMETRIC 就认为该 session 的 local KV 已经被驱逐，不再坚持把请求送回原实例，而是将其视为一个新的 placement opportunity，按照负载重新调度。

这时继续追求 locality 已经没有意义：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BNo+Local+KV%7D+%5CRightarrow+%5Ctext%7BNo+Benefit+from+Session+Stickiness%7D+)

Stateless Session-Turn Inference
实现上述策略需要知道一个请求是 first-turn 还是 follow-up turn。最直接的方法是在 router 中维护：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BSession+ID%7D+%5Crightarrow+%5Ctext%7BServing+Instance%7D+)

但这会让全局 router 变成一个有状态组件。

Router 需要记录所有活跃 session 的位置，处理并发更新，并在 session 结束后回收状态。更麻烦的是，agent 通常不会显式发送 session-end 信号，因此系统很难准确判断一条记录何时可以删除。

SMETRIC 避免维护这张 session table。它直接从请求自身推断 turn information。

标准 LLM API 是无状态的：模型服务不会保存上一轮对话，因此客户端需要在每次调用中重新发送历史 messages。于是，router 可以根据请求中的历史消息数量判断其位置：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BNo+Historical+Interaction%7D+%5CRightarrow+%5Ctext%7BFirst+Turn%7D+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BContains+Conversation+History%7D+%5CRightarrow+%5Ctext%7BFollow-Up+Turn%7D+)

这种方法不要求修改外部 agent framework，也不需要 router 记录此前的请求。对每个新请求，调度结果都可以仅由当前输入、KV 命中情况和实例负载计算得到：

![](https://www.zhihu.com/equation?tex=+i%5E%2A+%3D%3D%3D++f%28%5Ctext%7Brequest%7D%2C%5Cmathbf%7Bc%7D%2C%5Cmathbf%7Bl%7D%29+)

当然，一些 agent 可能会压缩或删除历史消息，使 router 将其误判为新的 first-turn。但这种误判通常是可接受的：一旦历史内容被删除，请求本身也很难复用完整的 session KV，因此重新做负载均衡通常正是合理的选择。

Load Metrics under Different Serving Architectures
SMETRIC 的总体路由逻辑不依赖具体的 serving architecture，但负载指标 
![](https://www.zhihu.com/equation?tex=l_i) 会根据部署方式变化。

在 prefill-decode colocation 中，一个请求的 prefill 和 decode 都在同一实例上完成。此时，论文使用实例当前承载的 request count 作为负载指标：

![](https://www.zhihu.com/equation?tex=+l_i+%3D%3D%3D++%5Ctext%7BNumber+of+Requests+on+Instance+%7Di+)

这是一个相对简单的近似，因为实例上的请求数量同时反映了 batching 压力和持续 decode 的并发程度。

在 prefill-decode disaggregation 中，SMETRIC 主要负责 prefill 集群内的路由。由于不同请求的输入长度差异较大，仅统计请求数量不足以表示真实计算量，因此论文使用尚未完成 prefill 的 token 数：

![](https://www.zhihu.com/equation?tex=+l_i+%3D%3D%3D++%5Ctext%7BUnprefilled+Tokens+on+Instance+%7Di+)

此时，请求会被发送到 pending prefill token 最少的实例：

![](https://www.zhihu.com/equation?tex=+i%5E%2A+%3D%3D%3D++%5Carg%5Cmin_i+l_i+)

因此，SMETRIC 的核心策略保持不变：

- first-turn 按负载分布 session；
- follow-up turn 优先保持 local KV affinity；
- overload 或 cache eviction 发生时回退到负载均衡。变化的只是“负载”在不同执行架构下如何定义。

Putting the Pieces Together
将以上机制合并后，SMETRIC 的调度流程可以写成：

![](https://www.zhihu.com/equation?tex=+s+%3D++%5Carg%5Cmax_i+c_i+)

![](https://www.zhihu.com/equation?tex=+i%5E%2A%3D+%5Cbegin%7Bcases%7D+s%2C+%26+t%3E0+%5Cland+l_s%5Cleq%5Calpha%5Cbar%7Bl%7D+%5Cland+c_s%3E%5Cbeta%5Cwidehat%7Bc%7D+%5C+%5Carg%5Cmin_i+l_i%2C+%26+%5Ctext%7Botherwise%7D+%5Cend%7Bcases%7D+)

其中：

- 
![](https://www.zhihu.com/equation?tex=t) 表示请求所在的 session turn；
- 
![](https://www.zhihu.com/equation?tex=c_i) 表示实例 
![](https://www.zhihu.com/equation?tex=i) 上的 local KV hit length；
- 
![](https://www.zhihu.com/equation?tex=l_i) 表示实例 
![](https://www.zhihu.com/equation?tex=i) 的当前负载；
- 
![](https://www.zhihu.com/equation?tex=%5Calpha) 对应 
![](https://www.zhihu.com/equation?tex=%5Ctext%7BOVERLOAD%7D)；
- 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 对应 
![](https://www.zhihu.com/equation?tex=%5Ctext%7BHIT_RATIO%7D)；
- 
![](https://www.zhihu.com/equation?tex=%5Cwidehat%7Bc%7D) 表示从 conversation history 估算的 expected hit length。这套方法的重点并不在于设计一个更复杂的统一评分函数，而是先识别请求的 session role，再采用不同策略：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BSession+Entry%7D+%5Crightarrow+%5Ctext%7BLoad+Balance%7D+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BSession+Continuation%7D+%5Crightarrow+%5Ctext%7BLocal+KV+Reuse%7D+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BAbnormal+Session+State%7D+%5Crightarrow+%5Ctext%7BFallback+to+Load+Balance%7D+)

因此，SMETRIC 将原本需要逐请求反复权衡的 locality 与 load balance 问题，转化成了一个更清晰的 session placement 问题。

Evaluation

Experimental Setup
作者基于 vLLM、Mooncake 和 LMCache 实现了 SMETRIC，并使用真实生产环境中的 agent request trace 进行回放。实验覆盖两种 serving 架构：

- Prefill-decode colocated：prefill 和 decode 在同一实例执行；
- Prefill-decode disaggregated：prefill 和 decode 分别由不同集群处理。实验使用 Qwen3-Coder-30B-A3B 和 Qwen3-235B-A22B-FP8 两种模型，并与三类调度策略对比：

- Load Balance：只考虑实例负载；
- LMetric：综合考虑 KV hit 和负载；
- BAILIAN：更倾向于保留 local KV hit；
- SMETRIC：first-turn 负责均衡 session 分布，follow-up turn 优先复用本地 KV。核心指标是满足 TTFT 和 TPOT 服务等级目标下的最大吞吐量，即 maximum TPS within SLO。

Overall Results
在 colocated serving 中，只要系统配置了 global KV tier，SMETRIC 相比最强 baseline 的最大 TPS 提升约10；与此同时，SMETRIC 的 local KV hit ratio 与 BAILIAN 基本相同：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BLocal+Hit%7D_%7B%5Ctext%7BSMETRIC%7D%7D%3D64%25+)

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BLocal+Hit%7D_%7B%5Ctext%7BBAILIAN%7D%7D%3D65%25+)

但 SMETRIC 的实例负载更加均衡。因此，它的性能提升并不是依赖更多 global KV fetch，而是在保留主要 local reuse 的同时，减少了少数实例上的请求堆积。

![](https://pic4.zhimg.com/v2-2fcb3295b78b0ea215be43d851080709_r.jpg)
![](https://pic1.zhimg.com/v2-40e71644c4cd3f671b85363e08891c74_r.jpg)
![](https://pic2.zhimg.com/v2-6cc0c5ebe0b5e3e81e9ac1b4e69ed4cf_r.jpg)在更大的 Qwen3-235B 模型上，SMETRIC 的最大 TPS 相比 BAILIAN 提升 
![](https://www.zhihu.com/equation?tex=8%25)，相比同一负载点下的 LMetric 提升 
![](https://www.zhihu.com/equation?tex=20%25)。其 median TTFT 和 P90 TTFT 分别下降 
![](https://www.zhihu.com/equation?tex=24%25) 和 
![](https://www.zhihu.com/equation?tex=26%25)。

![](https://pic4.zhimg.com/v2-ec95a8271f399ef6f09b6e9a15b79acd_r.jpg)
![](https://pic1.zhimg.com/v2-add947c3f96181a739f70da5537ba96c_r.jpg)
![](https://picx.zhimg.com/v2-dcbe836e2f33a2d0060d284449d3140f_r.jpg)在 prefill-decode disaggregated 场景中，SMETRIC 相比最强 baseline 的 prefill TPS 提升了2；其 P50 TTFT 从 BAILIAN 的 
![](https://www.zhihu.com/equation?tex=1.8) 秒降低到 
![](https://www.zhihu.com/equation?tex=1.1) 秒，下降 
![](https://www.zhihu.com/equation?tex=37%25)；P90 和 P99 TTFT 也分别获得了 
![](https://www.zhihu.com/equation?tex=18%25) 和 
![](https://www.zhihu.com/equation?tex=7%25) 的改善。

这说明在计算更加密集的 prefill 阶段，session-level load balancing 能够更直接地减少实例饱和和排队延迟。

![](https://pic1.zhimg.com/v2-7b5338b4f790d07c33761bf9f6646392_r.jpg)
![](https://pic2.zhimg.com/v2-2ad01dd984be1acbca1b616636cd98eb_r.jpg)
![](https://pic2.zhimg.com/v2-82757fab4fd3a3e91792a63f1edb6677_r.jpg)
Validating the Design
这些结果主要验证了 SMETRIC 的两个设计判断。

首先，first-turn 的调度确实可以影响整个 session 的负载分布。将新 session 分散到不同实例后，大部分 follow-up 请求会因为 KV locality 自然留在原实例，不需要每一轮都重新进行复杂的负载权衡。

其次，只对 first-turn 更积极地使用 global KV tier，可以避免纯负载均衡策略产生的大量 remote KV fetch。SMETRIC 最终实现了：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BBetter+Load+Balance%7D+%2B+%5Ctext%7BHigh+Local+KV+Reuse%7D+)

两个 guard 的消融实验进一步表明，overload detection 和 cache-eviction detection 对平均吞吐量的影响较小，但能够明显降低 P90 和 P99 尾部延迟。它们主要负责处理少数长 session 聚集和 KV 已被驱逐的异常情况。

![](https://picx.zhimg.com/v2-c25d929678dd1bf3432433c15fc63239_r.jpg)整体来看，实验支持了论文的核心观点：相比为每个请求统一计算 KV locality 与实例负载的综合分数，按照 session turn 区分调度目标，可以更简单地同时获得负载均衡和 KV 复用。

总结
写到这里思绪万千：这篇工作引入自然，实验全面，面向主要问题，思想简洁大气，有充足的资源，对我的taset而言有很大启发，Cache和Load的Balance问题如此建模也可以给真实的生产环境一些启发。

台风来了，杭州平安。