---
title: "LLM近期重大架构进化一览：从Gemma 4到DeepSeek V4"
date: "2026-05-19 00:00:00"
updated: "2026-05-19 00:00:00"
layout: "post"
permalink: "/collections/wechat/2026-05-19-LLM近期重大架构进化一览-从Gemma-4到DeepSeek-V4/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "LLM"
  - "架构"
  - "Gemma"
  - "DeepSeek"
---


> 来源：[机器之心](https://mp.weixin.qq.com/s/wRtvQK0P0o4cvVTlRq0LXA)
> 原文：[Recent Developments in LLM Architectures: KV Sharing, mHC, and Compressed Attention](https://magazine.sebastianraschka.com/p/recent-developments-in-llm-architectures) — Sebastian Raschka, PhD

---

## 背景

过去一段时间，很多人对大模型都有一个明显感受：token 总是不够用。用户想大模型更「聪明」更连贯，上下文窗口只会越来越大。而在模型背后，长上下文是相当「奢侈」的。用户 token 消耗翻倍，其实是模型更大的 KV cache 和更高的 attention 计算成本。

从 Google 的 Gemma 4，到 Poolside 的 Laguna XS.2、Zyphra 的 ZAYA1-8B，再到 DeepSeek V4，这些模型在 Transformer 内部做了各种「省钱设计」，试图围绕长上下文推理降低计算和存储成本。

---

## 一、Gemma 4：跨层 KV 共享 + Per-Layer Embeddings

Gemma 4 整个系列大致可以分为三类：

- <strong>E2B / E4B</strong>：面向移动端与小型本地（嵌入式）设备（IoT）
- <strong>26B</strong>：MoE 架构，面向高效本地推理
- <strong>31B</strong>：Dense 架构，追求更高模型质量与更便捷后训练流程

### 1.1 共享 KV Cache 机制（Cross-Layer Attention）

<strong>核心思路</strong>：后续层复用前面层已经计算出的 Key-Value 状态，降低长上下文场景下的显存占用与计算成本。

这不是 Gemma 4 首创——NeurIPS 2024 论文《Reducing Transformer Key-Value Cache Size with Cross-Layer Attention》已提出类似思路。但 Gemma 4 是第一次将其大规模应用于主流开源架构中。

<strong>为什么 KV Cache 如此重要？</strong>

当前 LLM 架构设计的核心主题就是「缩小 KV Cache」。缩小 KV Cache 的根本目的，是降低模型运行所需的显存占用，从而支持更长的上下文窗口——这在推理模型和 Agent 时代尤其重要。

Grouped Query Attention（GQA）通过让多个 Query Head 共享同一组 Key-Value（KV）Head 来减少 KV Cache 的大小。

<strong>Gemma 4 的跨层 KV 共享</strong>：

除了 GQA 中不同 Query Head 之间的 KV 共享之外，Gemma 4 还进一步在不同 Transformer Layer 之间共享 KV Projection，而不是像传统做法那样在每一层 Attention 模块中分别计算自己的 KV。这种机制也被称为 <strong>Cross-Layer Attention（CLA）</strong>。

Gemma 4 E2B 采用了普通 GQA 与 Sliding Window Attention 按照 4:1 的方式组合使用（更准确地说，实际使用的是 MQA，即 GQA 中只有一个 KV Head 的特殊情况）。

<strong>KV 共享的具体方式</strong>：后续层不再单独计算自己的 Key 和 Value Projection，而是直接复用最近一个、同类型且未共享层所生成的 KV Tensor。

- Sliding Window Attention 层会复用前面某个 Sliding Window 层的 KV
- Full Attention 层则会复用前面某个 Full Attention 层的 KV

每一层仍然会计算自己的 Query Projection，因此不同层依然可以形成各自不同的 Attention Pattern；但代价最高、最占显存的 KV Cache，则会被多个层共同复用。

<strong>参数量对比</strong>：
- Gemma 4 E2B 共 35 层 Transformer Layer，但只有前 15 层会真正计算自己的 KV Projection；后面的 20 层则直接复用之前同类型层的 KV Tensor
- Gemma 4 E4B 共 42 层，其中 24 层负责计算 KV，最后 18 层采用共享机制

<strong>资源节省效果</strong>：由于大约有一半的 KV 在不同层之间被共享，KV Cache 的整体大小也大致减少了一半。

- E2B 在 128K 长上下文、bfloat16 精度下，可节省约 <strong>2.7GB</strong> 显存
- E4B 在同样条件下，可节省约 <strong>6GB</strong> 显存

KV Sharing 的缺点是：它本质上是一种对完整 Attention 计算的「近似」，会削弱模型容量。不过，根据 Cross-Layer Attention 论文中的实验结果，在被测试的小规模模型上，这种影响可以非常有限。

### 1.2 Per-Layer Embeddings（PLE）与「有效参数量」

Gemma 4 E2B 与 E4B 版本还引入了第二种以效率为导向的设计：<strong>Per-Layer Embeddings（PLE，逐层嵌入）</strong>。

PLE 关注的是参数效率（parameter efficiency）：它让小尺寸的 Gemma 4 模型能够携带更多 token-specific information，但又不会让整个 Transformer 主干像同参数量 Dense 模型那样昂贵。

「E」代表「effective」（有效参数量）：

- <strong>Gemma 4 E2B</strong>：标注为 2.3B effective parameters，但如果把 embedding 参数也算进去，总参数量实际上达到 5.1B
- <strong>Gemma 4 E4B</strong>：effective parameters 为 4.5B，包含 embedding 后则约为 8B

换句话说，在这些「E」系列模型中，真正负责主要计算的 Transformer Stack，其计算规模更接近前面的较小数字；而后面的总参数量，则包含了额外的 embedding table。

<strong>PLE 的工作方式</strong>：

## 1. token IDs 经过 per-layer embedding lookup

## 2. 正常的 token embeddings 经过线性投影到同一个 PLE 空间

## 3. 这两部分相加、缩放、reshape 成一个 tensor，每层一个 slice


每个 transformer block 仍然走相同的 attention 和 feed-forward 路径，但 Gemma 4 在 feed-forward 分支之后添加了一个小的 layer-specific token vector，通过 embedding 参数和小型投影来增加表征容量。这增加了计算开销，但避免了将整个 transformer stack 扩展到更大参数量所需的成本。

---

## 二、Laguna XS.2：逐层 Attention 预算分配

Laguna 是欧洲公司 Poolside 发布的首个开源模型（专注于代码应用）。

Laguna XS.2 有 40 层，其中 30 层使用 Sliding Window Attention（局部窗口 512 tokens），10 层使用 Global/Full Attention。Sliding Window 层更便宜但无法访问完整上下文窗口；Global 层更贵但保留了访问所有上下文信息的能力。

<strong>创新点：Per-Layer Query Head 数量变化</strong>

之前 Sliding Window + Global/Full Attention 的混合模式并不罕见，但 Laguna XS.2 的新之处在于使用 per-layer query-head counts。Hugging Face 的 config.json 中包含了 `num_attention_heads_per_layer` 设置，允许不同层拥有不同数量的 query heads，同时保持 KV cache 形状兼容。

具体来说：
- Full Attention 层使用 <strong>6 个 query heads per KV head</strong>
- Sliding Window Attention 层使用 <strong>8 个 query heads per KV head</strong>

KV heads 固定为 8，但 query heads 的分配在不同层类型间有所不同——这才是真正的逐层 head 预算分配。

---

## 三、ZAYA1-8B：压缩卷积 Attention

（原文此处有详细技术分析，内容涉及卷积压缩机制，待完整整理）

---

## 四、DeepSeek V4：mHC + 压缩 Attention

（原文此处有详细技术分析，内容涉及 Multi-Head Latent Attention 改进与压缩机制，待完整整理）

---

## 附录

- Sebastian 的 LLM Architecture Gallery：https://sebastianraschka.com/llm-architecture-gallery/
- Gemma 4 从零实现代码：https://github.com/rasbt/LLMs-from-scratch/tree/main/ch05/17_gemma4
- 《Reducing Transformer Key-Value Cache Size with Cross-Layer Attention》：https://arxiv.org/abs/2405.12981