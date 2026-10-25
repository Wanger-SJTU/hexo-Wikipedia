---
title: ByteScale：12,000 GPU 上的 2M 长序列高效训练方案 from 字节跳动
date: "2025-03-22 00:00:00"
updated: "2025-03-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/ByteScale-12,000-GPU-上的-2M-长序列高效训练方案-from-字节跳动/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/32047821042
---


ByteScale：12,000 GPU 上的 2M 长序列高效训练方案 from 字节跳动

Alex不在成都

让学过的比忘记的多一些~

收录于 · AIoT and more

98 人赞同了该文章

今天来介绍一下字节跳动最近的一篇 paper。万卡实验安排，有牌面！

ByteScale: Efficient Scaling of LLM Training with a 2048K Context Length on More Than 12,000 GPUs

Intro

-  大模型序列长度日益增加：GPT4o 128k，Claude3 200k，Gemini-1.5 Pro 2M
 
-  长序列训练的瓶颈：分布式的 Attention 计算很慢
 
- Attention 计算复杂度是 O(N^2），FA 利用 online softmax，把存储复杂度降为 O(N)。但序列长度过长之后，还是需要在序列长度维度上做切分

- 理论上，Context Parallel 通信量 O(N)，计算量是  O(N^2) ，在 N 很大的时候，应该是可以掩盖住 O(N) 通信的。但 profiling 出来发现盖不住，还是 communication-bound 了，因为 CP ranks 数量太多了

-  ByteScale：主要解决的问题是，如何提高 “由短序列拼成的长序列“ 的训练效率（sequence packing），提出了 Hybrid Data Parallism（HDP）
 
- 其核心思想是把 DP 和 CP 融合，统一进行调度。比如，能够上图中把 256 CP ranks 减小为了 39 HDP ranks，让 computation 能够盖住 communication

- 原始的 DP+DP 方案还会引发 Imbalanced Computation，导致快的 DP 组必须等待慢的 DP 组。其根本原因是：虽然都是 1M 序列，但 1k 个 1k 下三角计算量之和，小于 1个 1M 下三角的 attention 计算量
Background：序列维度上的并行方案

- TP + SP（Sequence-Parallel）：
- 把 dropout 和 LayerNorm 的激活沿序列维度切分了，减少了内存
- TP：正向 f=NULL，g=all-reduce；反向 f=all-reduce，g=NULL
- SP：正向 f=AG，g=RS；反向 f=RS，g=AG
2. DeepSpeed Ulysses：https://zhuanlan.zhihu.com/p/4496065391

- Attention 层内是切 head，Attention 层外是切序列 
- QKV 在进 Attention 之前是切 sequence，然后做了 a2a，变为切 hidden，送进 Attention
- Attention 之后，再通过 a2a 变回切 sequence
- 优缺点：通信量小。但序列并行在 attention 里面是和 tp 一起去切 head，对 GQA 不友好
3.  Colossal AI / Ring Attention 方案：https://zhuanlan.zhihu.com/p/689067888

- 在 attention 之外，是实打实的切分了序列
- 在 attention 内，按序列切分了 KV，利用 ring-self attention（RSA）的思想： 
-  每个节点接收临近的 k_i，然后计算 qk_i^T，然后 allgather 得到 qk^T
-  每个节点接收临近的 v_i，然后计算 (qk^T)v_i，然后 allgather 得到 output
-  优缺点：不受 head 数限制。通信量更大
 4. Nvidia mCore Context Parallel（CP）：https://docs.nvidia.com/megatron-core/developer-guide/latest/api-guide/context_parallel.html

- 从原理上是 SP + CP（在 Ring-Self-Attention 基础上有一些额外优化） 
-  黄色的 AG/RS 是 SP 引入的
-  深蓝的 AG/RS 是 CP 引入的
- 前向的 AG 是为了收集完整的 KV 序列，对应其反向的 RS
- 图中反向的额外 AG （Attn ouput 之前那个）是用于从切分后的 KV 做重计算，为了减少激活内存占用
-  AG/RS 在唤醒拓扑下，可以用 P2P 通信实现

ByteScale Motivation
1）Imbalanced Computation

通常情况下，8k/32k 等训练长度，一般都是多个样本（sample） 拼在一起得到一个序列（sequence），这个过程叫 sequence packing

但由于 Attention 的 O(n^2) 计算量，如果 packing 到一个序列中的 sample 有长有短， 那整个序列的计算时间其实会浮动的。例如，由 2 个 16k 拼成的 32k，计算时间会比 32 个 1k 拼成的 32k 序列计算时间更长。

这可能会导致下图的 dp bubble（快的 dp 组要等慢的 dp 组）。其中可以看到，第一个 dp 组的 pp bubble 明显也比第二个 dp 组的更长

2）Redundant Communication

再者，如果是短样本拼起来的长序列，由于 packig 的 reset_attention_mask，多个样本之间是隔离的，其实不需要做完整的 CP 通信的。

例如，假设每张 GPU 只能放下 8k 的序列长度，要训练 1M，需要 128卡 CP 并行。但对于拼成这 1M 中序列的短于 8k 的样本，其实可以把这个 8k 的样本安排在一张卡上，那这张卡只需要做 local computation，不需要和别的卡做 CP 通信了

ByteScale 的方法

结合 Ablation study 来看，主要有 4 个优化：

① Dynamic Communication，② Selective Offloading，③ Balance Strategy，④ Remote Dataloader 

其中 ① 和 ② 都归属于 Communication Optimier，两个一起叫做 Naive HDP Solution，用能优化 2.01x。

③ 和 ④ 都归属在 Balance Scheduler 里面，也都用上的话，能提速 3.89x

核心模块一：Communication Optimizer
两个优化点 ① Dynamic Communication，② Selective Offloading

- Dynamic Communication 的意思是，对于一个 1M 序列（由 768k + 32×8k 拼起来的），HDP 可以用 96 ranks 处理其中的一个 768K 样本，剩下的 32 ranks 独立处理各自的 8K 样本。这样后面的 32 ranks 是不需要参与 CP 通信的
- Selective Offloading，通过把一些 qkv 的激活 offload 到 CPU Memory，提升每个 rank 能处理的序列长度，从而减小 HDP ranks，缓解 communication bound
- 具体算法上 
- 核心是，对于长序列用了公式 (3) 和 Algorithm 1 的 1-6 行，去算出一个 offloading ratio，以及这个长序列最少需要多少个 HDP ranks 去并行切分
- 而对于短序列，7-9行，直接 packing 喂给一个 rank 就行

- 实现上：在 CP group 内，还是让不同 cp rank 去切分了每个 packed sample，避免 P2P 之间的通信量的不均等

核心模块二：Balance Scheduler

也是两个优化点 ① Balance Strategy ，② Remote Dataloader

- Balance Strategy 

- 重新定义了 micro batch：根据训练数据，按 flops 而不是写死的数来分割 micro batch，并且每个 micro batch 的 CP 可以是不同

- 如果用了 pp ，尽可能让不同 HDP ranks 同时跑完 pp。实现上，对于单个 micro batch 平均执行时间较长的，分配更多 micro batches；反之亦然（Figure 12 上下分别是 8、18 个 micro batches）

- 如果没用 pp，只用了 dp：那就把长度差不多的样本分散给到各个 HDP ranks，同时也允许不同 HDP ranks 有不同 micro batch 的值

- Remote Dataloader：为了实现 balance strategy，所有 HDP ranks 都要获取整个 global batch 的 metadata。所以，需要一个单独的 Remote Dataloader 服务于 balance sceduler，用于提供实时的全局数据分布信息，也能有一定提速
总结 讨论

-  整片文章一环扣一环，很精彩，实验非常 solid
 
-  预训练大部分时间还是用 8k~32k 进行。序列长度扩增阶段，ByteScale 应该能够帮到，但这部分计算量在整个预训练算力中的比例可能不是很大
 

-  对于不同数据集的加速比是不一样的：Github 上的效果优于 Byted
 
-  可以看到 HDP 在 Github 上，随着序列长度增加，token per second 下降不多。但在 Byted 数据集上，下降就蛮多的，相比 baseline 提升也缩小了些

-  这是因为 Github 数据集上，短序列占比更高（原 paper Figure 4，这里不列出了）。对于 “真正的“ 长序列，也就是一个样本自身就 1M 长度那种，ByteScale 也是无能为力的

-  文中没有列出所用的 GPU 是什么卡（The specific information regarding the productive cluster, suchas the number and type of GPUs, is hidden due to business and confidential concerns.）
 
- 但通过一些估算：模型参数量 N ~ 12lsh^2，每个 token 一次前向计算量 24lsh^2+4bhs^2 ~ 2N(1+ s/6h)，而训练计算量约等 3 次前向 ~ 6N(1+s/6h)
- 文中实验结果，256k 序列下 LLama 70B 在 8K 集群能达到 7e5 tokens/s，已经超过了 A100 的理论算力值上限，所以应该是 Hopper 系列了（MFU 大约 50%）

编辑于 2025-03-22 23:49・广东
大模型

DeepSeek

​赞同 98​​2 条评论​195 ​2 ​分享

​申请转载​​

未登录用户

2 条评论

默认
最新

还有风景线

请问Balance Scheduler和HDP的关系是什么呢，算法1不是已经把seq分配给了HDP rank了吗，为什么Balance Scheduler还可以重新分配micro batch，有点没想清楚

2025-03-31 · 安徽

​回复​喜欢

四葉木

我理解是这样：Balance Scheduler分配sequence到HDP rank上组成batch，这步目的是解决计算不均衡的问题，最小化DP bubble和PP bubble；而HDP本身的灵活通信特征一直都在，根据分配的sequence实际情况进行通信即可。它俩的特性应该是这样：Communication Optimizer解决冗余通信问题（短序列-HDP；长序列-选择性卸载）；Balance Scheduler解决计算不均问题（DP、PP），减少bubble。调度（或者分配）应该只有Balance Scheduler一次

2025-08-28 · 中国香港

​回复​喜欢

关于作者

Alex不在成都
让学过的比忘记的多一些~

回答
17
文章
29
关注者
738

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器504 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费329 万热
伊朗最新局势314 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷256 万
中将军衔很厉害吗247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

操作系统学习2 x86寄存器、汇编伪指令与程序调试
AI头条发表于操作系统学...

XDOJ（智慧平台）--分配宝藏（用动态规划dp算法解决）(C语言)
humoooor

计算机存储的大端法和小端法
哪有岁月静...发表于暴躁程序员...

一分钟搞懂的算法之BPE算法
zenRR...发表于深度学习自...