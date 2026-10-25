---
title: 大语言模型Attention模块的文本并行(CP)
date: "2026-06-27 00:00:00"
updated: "2026-06-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/大语言模型Attention模块的文本并行(CP)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2053363290093401434
---


使用Agent做编程开发是目前业界主流Agent使用场景，这类场景中，往往需要将大量的源码做为Prompt喂给大模型，文本长度长达几百K，这导致Prefill阶段需要实现长序列推理。大模型长序列推理中，**上下文并行（Context Parallelism, CP）**是突破单卡显存限制、支持超长上下文的关键技术。根据推理阶段的不同，CP 通常被分为**PCP（Prefill Context Parallelism，预填充上下文并行）**和**DCP（Decode Context Parallelism，解码上下文并行）**。

下面重点介绍 PCP 的两种典型方案，并简要说明 DCP 的基本思路：

PCP：预填充阶段的上下文并行
在预填充（Prefill）阶段，一个长 Prompt 一次性输入模型，计算产生全部 KV Cache。此阶段序列长度大、计算密集，是并行化的主要对象。

PCP 的核心思路是切分序列长度维度，让多张卡并行处理不同的 Token 段，因为整个大模型的计算只在Attention中需要Token之间的计算，其他模块像RMSNorm，MoE，FFN，Embedding都是Token-Wise计算。

根据 KV Cache 是否也切分，分为两种方案：

切分Q，保留完整KV Cache
核心思路就是：

- **Q切分：**将模型Prefill阶段输入序列分成多段，每个 Rank 计算自己那一段的 Q（Query），在进入Attention之前，所有算子都是Token-Wise操作，切分Sequence多GPU推理不影响精度。
- **K 和 V 不切分**：Prefill阶段做Linear-K,Linear-V同样只计算自己那一段K,V，在进入Attention之前，使用AllGather方式让所有Rank拥有全部KVCache，所有 Rank 都持有或接收到**完整的 K、V**。
- **Attention计算：**各 Rank 用自己的局部 Q 与完整的 K、V 做注意力运算，得到自己那段序列Attention的输出，Attention之后的FFN,RMSNorm又是Token-Wise操作，不影响算子计算的正确性，直到LM-Head计算完，使用采用取最后一个Token的中概率最大就是Prefill阶段生成的首Token。
**这种方案有以下几个特点：**

- **优点**：注意力计算完全独立，**仅有一个通信开销，仅在Prefill阶段将每个Rank的KVCach做AllGather**，延迟低，实现简单。
- **缺点**：每个 Rank 都要存储**完整的 KV Cache**，显存占用随序列长度线性增长，无法通过增加卡数来降低单卡 KV Cache 大小，扩展性受限。
- **适用**：当序列长度不太大，单卡显存放得下完整 KV Cache，但计算需要加速时使用。
- **Decode：**Decode阶段每个请求都是单Token输入，Decode推理几乎无影响。如下图是以Qwen3-32B的Attention模块示例，如何实现只切分Q的PCP：

其中S表示序列长度也就是Sequence Length，P表示并行的Rank个数也就是要将Prompt切成几段。

通过流程图我们可以看到每个Rank先计算局部的K与V，再通过AllGather得到所有的K与V。

在Attention计算过和中，局部的Q与全局的K/V计算当前Rank的部分输入Prompt的注意力分数。

![](https://pic3.zhimg.com/v2-5c566a516ce8e7764f5138ddca8f50f6_r.jpg)
切分Q，切分KV Cache
**核心思路就是：**

- **Q/K/V切分：**将模型Prefill阶段输入序列分成多段，每个 Rank 计算自己那一段的Q、K、V。
- **Attention计算：**每个Rank都只拥有局部的KVCache，局部KVCache与Q做注意力分数计算。
- **Ring Attention**：利用环形拓扑逐块传递 K、V，每个步骤计算部分注意力并使用LogSumExp算法累积。
- **Attention之后：**计算完成后，每个 Rank有当前Rank的分段序列对应完整KV的注意力输出，无需拼接，因为Attention之后O-Proj，RMSNorm，FFN都是Token Wise操作。**这种方案有以下几个特点：**

- **优点**：KV Cache 也被切分，**单卡显存占用与序列长度解耦**，可通过增加卡数支持任意长的序列。
- **缺点**：需要复杂的通信（点对点Ring Attention），**延迟较高**，实现难度大。
- **适用**：超长上下文推理（如数十万 token），单卡无法容纳完整 KV Cache 时必备。如下图是以Qwen3-32B的Attention模块,示例如何实现切分Q也切分KV的PCP：

这里以4卡CP并行为例，将输入序列S等分到四个卡上，在每卡上计算出部分Q，K，V，

再使用Ring Attention计算得到每卡当前序列的基于全部KVCache的完整注意力输出。

关于Ring Attention可以参考：

2023 Berkeley 论文 《**Ring Attention with Blockwise Transformers for Near-Infinite Context》**

![](https://pica.zhimg.com/v2-c42edab82cc42ff0e8952c02986b5648_r.jpg)
DCP：Decode阶段的上下文并行
在自回归解码（Decode）阶段，每步只生成一个 token，**Q 的输入序列长度固定为 1**，无法再切分 Q。

因此 DCP 的策略与 PCP 完全不同，并且根据Prefill阶段PCP实现两种方案，DCP实现方案也有差异：

Prefill阶段，切分Q，保留完整KV Cache
如果在Prefill阶段只切分了Q，每卡保留了完整的KVCache，那么Decode阶段就变换为DP并行。

因为每个请求的序列长度为1Token，可以将切分序列变成切分Batch，请求之间相互独立。

如下图以QWen3-32B的Attention模块的DP并行示例，其中B表示Batch，P表示并行数。

![](https://picx.zhimg.com/v2-575f6988fc61a6d8e7f760e8becf60fb_r.jpg)
Prefill阶段，切分Q，也切分KV Cache
如果Prefill阶段每卡切分KVCache，那Q不能切分，只需要将KVCache在Attention计算前AllGather，或者，每卡计算局部注意力AllReduce。

**主要流程如下：**

- **Q 不切分**：唯一的 Q token 被**广播或复制**到所有 Rank。
- **KV Cache 保持切分**：长序列的 KV Cache 早已在 Prefill 阶段被切成多份，分布在各个 Rank 上。
- **Attention计算：**每个 rank 用该 Q 与本地部分 KV 计算局部注意力（点积），得到局部分数。
- **完整注意力计算：**通过 **AllReduce（或 ReduceScatter + AllGather）** 合并各 rank 的局部注意力结果，LogSumExp算法累积得到完整的注意力。**DCP 的本质是：以复制 Q + 分片 KV 的方式，利用多卡显存共同支撑超长序列的逐 token 生成。**
这种方式使得单张卡不需要存下整个历史上下文，解码阶段也能获得线性扩展的显存收益。

同样以Qwen3-32B的Attention示例DCP：

![](https://pic1.zhimg.com/v2-e0316385f2674f56d473d1cff7a6d07a_r.jpg)
总结对比

方案阶段Q 切分KV 切分单卡 KV 占用通信模式适用场景PCP 方案一Prefill是（按段）否，完整复制极高（全量）一次复制，计算无通信中等长度，计算加速PCP 方案二Prefill是（按段）是（按段分片）低（1/N）环形传递/All-Gather超长上下文，显存扩展DCPDecode否（Q=1广播）是（按段分片）低（1/N）AllReduce 合并超长序列生成实际系统中，PCP 和 DCP 往往**组合使用**：Prefill 用方案二切分 KV 以容纳长序列，Decode 阶段则自动切换为 DCP，利用已有的分片 KV 进行低开销的逐 token 推理。这种协同设计是支撑百万 token 上下文推理的关键基础。