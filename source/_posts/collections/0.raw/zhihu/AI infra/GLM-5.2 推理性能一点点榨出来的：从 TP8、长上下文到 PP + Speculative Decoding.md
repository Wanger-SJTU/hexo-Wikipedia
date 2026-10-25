---
title: GLM-5.2 推理性能一点点榨出来的：从 TP8、长上下文到 PP + Speculative Decoding
date: "2026-08-14 00:00:00"
updated: "2026-08-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/GLM-5.2-推理性能一点点榨出来的-从-TP8、长上下文到-PP-Speculative-Decoding/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2071678642959258406
---


我最近是怎么把 GLM-5.2 推理性能一点点榨出来的：从 TP8、长上下文到 PP + Speculative Decoding
最近一段时间，我主要在折腾 GLM-5.2 的推理优化。

环境比较有意思：<strong>单机 8×H200 PCIe，没有 NVLink</strong>。

这和很多公开 benchmark 使用的 H100/H200 SXM + NVLink 环境差别很大。模型能跑起来并不难，真正困难的是：

<strong>GPU 利用率看起来不低，但生成速度就是上不去。</strong>一开始我也把主要注意力放在 GEMM、FP8、Attention Kernel 上。后来实际用 Nsight Systems、NCCL trace 和服务端 metrics 一层层拆下来之后，发现问题远不只是“算子够不够快”。

GLM-5.2 这种超大 MoE 模型的推理性能，本质上是：

<strong>计算 + GPU 间通信 + KV Cache + 调度 + Speculative Decoding + CUDA launch overhead</strong>

共同决定的。

这篇文章记录一下我最近做的几轮优化。

一、第一版：TP=8，能跑，但不是最优解
最开始采用的是非常自然的方案：

```text
TP = 8
PP = 1
```

也就是把整个模型 Tensor Parallel 到 8 张 H200 上。

在 NVLink 机器上，这通常没有太大问题。

但我的环境是：

8 × H200 PCIe
No NVLink
实际拓扑里，不同 GPU 之间甚至存在：

PIX
NODE
SYS
不同级别的 PCIe 路径。

于是问题来了。

Tensor Parallel 并不是“把矩阵切成 8 份算完就结束”。

每一个 Transformer Layer 内部都可能出现：

GEMM
 ↓
AllGather / ReduceScatter
 ↓
GEMM
 ↓
AllReduce
也就是说，<strong>TP 通信直接插在计算关键路径里面。</strong>

模型有几十层，这种延迟会不断累积。

所以即使看到：

SM Active 很高
GPU Util 也不低
也不能证明 GPU 真正一直在有效计算。

它可能在：

计算
→ 等 NCCL
→ 计算
→ 等 NCCL
→ kernel launch gap
→ 再计算
这也是我后来越来越少只看 `nvidia-smi GPU Util` 的原因。

二、最大的调整：从 TP8 转向 TP4 + PP2
后来我做了一个比较关键的调整：

TP8 PP1

       ↓

TP4 PP2
也就是说，把 8 张 GPU 分成两个 Pipeline Stage。

例如：

GPU 0 1 2 3
   │
   └── PP Stage 0

GPU 4 5 6 7
   │
   └── PP Stage 1
每个 stage 内只做 TP4。

这么做最大的收益不是减少模型计算量，而是减少 <strong>TP collective 的规模以及通信参与 GPU 数量</strong>。

对于没有 NVLink 的 PCIe 机器，这一点尤其重要。

TP8 相当于很多层都让 8 张 GPU 频繁同步。

TP4 + PP2 后，则更多变成：

Stage 0 内 TP4
      ↓
Pipeline Send/Recv
      ↓
Stage 1 内 TP4
相比每层都进行 TP8 collective，Pipeline 通信的频率低很多。

这是一个非常重要的经验：

<strong>GPU 越多，不代表 TP 开得越大越快。</strong>尤其是 PCIe-only 节点。

在这种机器上，PP 有时候比继续提高 TP 更有价值。

三、长上下文真正的问题，不只是 KV Cache
GLM-5.2 我测试过：

context-length = 524288
也就是 512K 上下文。

后来为了稳定性和吞吐，也切过：

262144
很多人看到长上下文首先想到：

KV Cache 显存够不够？这当然重要，但实际线上还有另一个问题：

<strong>Prefill 会霸占整个调度器。</strong>

比如一个 100K+ token 请求进来，如果一次性做完整 prefill：

100K tokens
      ↓
几十层 Transformer
      ↓
长时间占用 GPU
这时候后面的 decode 请求就会被堵住。

所以我后来把重点放到了 <strong>Chunked Prefill</strong>。

例如：

--chunked-prefill-size 16384
也测试过：

8192
思路其实很简单：

把一个：

128K Prefill
拆成：

16K
16K
16K
16K
...
然后让 Scheduler 有机会在 chunk 之间插入 decode。

这对线上服务特别重要。

因为真正需要优化的不是：

某一个 request 的最短 TTFT
而是：

Prefill
Decode
Prefill
Decode
混合 workload 下的整体吞吐和尾延迟。

四、我主动把并发从 256 降了下来
这是一个比较反直觉的优化。

很多推理框架的默认思路都是：

Batch 越大，GPU 利用率越高，吞吐越高。但对 GLM-5.2 + 长上下文来说，并不一定成立。

我之前试过非常高的并发。

最后反而主动压到：

--max-running-requests 64
一些 PP 实验甚至进一步下降到：

```text
--max-running-requests 6
--max-queued-requests 24
```

为什么？

因为大模型长上下文场景里，request 多了之后，争抢的不只是算力。

还包括：

KV Cache
GPU Memory
MoE communication
Attention workspace
Scheduler slot
Prefill bandwidth
Batch 无限增大，很容易从：

提高 GPU occupancy
变成：

KV Cache 压力上升
→ memory fragmentation
→ 调度变差
→ request 互相阻塞
→ P99 latency 爆炸
所以后来我的调优目标不再是：

<strong>把 GPU 塞到 100%。</strong>

而是：

<strong>让每个 decoding step 尽可能稳定。</strong>

五、Speculative Decoding：不是 draft 越多越好
GLM-5.2 上我也花了不少时间折腾 Speculative Decoding。

早期配置比较激进：

```text
speculative steps = 5
draft tokens      = 6
```

后来逐渐收缩到：

```text
steps = 1
draft = 2
```

原因很现实。

Speculative Decoding 的收益可以粗略理解成：

收益
≈ 一次验证接受的 token 数
  - Draft Model 成本
  - Verify 成本
  - 调度开销
  - 跨 PP Stage 通信
如果 draft 6 个 token，最后只接受两个，那么剩下的计算基本都浪费了。

尤其加入 Pipeline Parallel 以后，这件事情会变得更复杂。

因为 speculative decoding 不再只是：

Draft
 ↓
Target Verify
而变成：

Draft
 ↓
PP Stage 0
 ↓
Send
 ↓
PP Stage 1
 ↓
Verify
 ↓
Scheduler
所以最后我越来越倾向于：

<strong>先提高 acceptance rate，再增加 speculative depth。</strong>而不是简单把 draft token 数量拉满。

六、为了 PP + Spec，我甚至改了 SGLang
后来这部分已经不只是“调启动参数”了。

我开始直接改 SGLang。

因为 PP 场景下 Speculative Decoding 会暴露出很多 TP-only 模式下看不到的问题。

我实际遇到过一个非常典型的问题：

PP Stage 1
RoPE position tensor
shape mismatch

14 tokens
vs
15 tokens
本质原因是 speculative decoding 后，不同 Pipeline Stage 对当前 batch 中：

real token
draft token
verify token
的理解出现了偏差。

对于普通 decode：

1 request
→ 1 token
很好处理。

但 Speculative Decode 变成：

1 request
→ 1 + N candidate tokens
如果 Scheduler、PP metadata 和 position tensor 没有完全同步，就会出现：

token 数量对不上
RoPE position 对不上
KV 写入位置对不上
这个问题最后需要从 Pipeline metadata、position 构造和 speculative batch 逻辑一起修。

这也是我最近给 SGLang 做 PP + Speculative Decoding 支持时，花时间比较多的一块。

七、另一个隐藏问题：Scheduler Watchdog
还有一次问题更有意思。

请求大概是：

input tokens  ≈ 31,841
max_new_tokens = 32,000
然后 PP Stage 1 长时间没有 output。

最后触发：

scheduler watchdog 300s
表面上看：

Pipeline 卡死了。实际上并不是传统意义上的 deadlock。

而是超长 request + pipeline + speculative scheduler 组合后，一个 stage 长时间没有产生框架预期的 progress event。

这类问题非常容易误判成：

NCCL deadlock
CUDA hang
GPU crash
最后必须同时看：

Scheduler state
PP queue
CUDA timeline
NCCL timeline
才能真正定位。

八、CUDA Graph：重点优化 Decode，不要什么都 Graph
另一个方向是 CUDA Graph。

对于大模型推理，我越来越认可一种策略：

Prefill：保持灵活
Decode：尽量 CUDA Graph
因为 prefill 的 shape 变化非常大：

1K
8K
32K
128K
256K
...
硬 Graph 化收益未必高。

而 decode 的 shape 非常稳定：

batch × 1 token
于是我后来更多采用类似：

FULL_DECODE_ONLY
的思路。

Decode 是大量小 kernel。

单个 kernel 可能只需要几十微秒。

这时候：

5 μs launch overhead
看起来很小。

但：

几十层
×
Attention
×
MoE
×
多个 GEMM
×
每秒几十个 decoding step
最终 CPU launch gap 会真正进入关键路径。

CUDA Graph 本质上是在减少这些碎片化 launch。

九、最后发现：优化大模型推理，不能只盯着 Tensor Core
这一轮 GLM-5.2 调优之后，我最大的感受是：

大模型推理已经越来越不像一个单纯的 GEMM 优化问题。

实际关键路径更像这样：

Scheduler
   ↓
CPU launch
   ↓
CUDA Kernel
   ↓
TP communication
   ↓
MoE communication
   ↓
Pipeline communication
   ↓
KV Cache
   ↓
Speculative Verify
   ↓
下一轮 Scheduler
任何一层出现 100 μs 的空洞，乘上几十层、几百个 kernel、几十个 decoding step，都可能直接影响最终 token/s。

所以我现在调优基本按照这个顺序：

1. 先看 GPU 拓扑
2. 再确定 TP / PP / EP
3. 控制 KV Cache 和并发
4. 做 Chunked Prefill
5. 优化 Decode CUDA Graph
6. 调 Speculative Decoding acceptance
7. 最后再深入 kernel / NCCL / PDL
而不是一上来就：

换一个更快的 GEMM Kernel

十、目前这套配置背后的核心逻辑
如果把最近几个月的实验压缩成几个关键词，大概就是：

TP8 → TP4 + PP2

512K → 根据 workload 控制到 256K/512K

大并发 → 控制 running requests

Long Prefill → Chunked Prefill

Spec 5×6 → 更保守的 1×2

Prefill + Decode 全 Graph
→ Decode 优先 CUDA Graph

只看 GPU Util
→ Nsight + NCCL + Scheduler 联合分析
最终目的其实只有一个：

<strong>减少 decoding critical path 上那些 GPU 没有真正产生 token 的时间。</strong>这也是为什么有时候一个优化：

Tensor Core utilization 没变化
甚至：

GPU Util 看起来也差不多
但 token/s 却明显提高。

因为真正被消掉的是：

kernel gap
NCCL wait
scheduler bubble
pipeline bubble
无效 speculative computation
这些在 `nvidia-smi` 里基本看不到。

最近也正在继续研究两个方向。

一个是 <strong>NCCL 2.30 hierarchical zero-SM All2All</strong>，看看能不能进一步减少 MoE communication kernel 和计算 kernel 抢 SM 的问题。

另一个是 Hopper 上的 <strong>Programmatic Dependent Launch（PDL）</strong>，尝试把相邻 decode kernel 之间的 launch gap 继续压缩。

对于现在这些几百 B、甚至 T 级别的 MoE 模型，我越来越觉得：

<strong>下一阶段的大模型推理优化，竞争的已经不只是 FLOPS，而是谁能把整个 GPU execution timeline 填得更满。</strong>

算子要快。

但更重要的是——

<strong>算子之间，不要有洞。</strong>