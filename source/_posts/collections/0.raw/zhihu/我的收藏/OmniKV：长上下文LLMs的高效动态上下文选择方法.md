---
title: (2 条消息) OmniKV：长上下文LLMs的高效动态上下文选择方法
date: "2025-07-11 00:00:00"
updated: "2025-07-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/OmniKV-长上下文LLMs的高效动态上下文选择方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1927141897853465859
---


### 摘要

在大型语言模型（LLMs）的推理阶段，长上下文会导致GPU显存中KV Cache占用过大。传统方法通过丢弃不重要的token来缓解这一问题，但本文提出的 **OmniKV** 摒弃了这种“丢弃”策略，提出了一种无token丢弃且无需训练的推理方法。OmniKV利用了层间注意力相似性（Inter-Layer Attention Similarity）这一创新性洞察，实现了在不损失性能的前提下，推理速度提升1.68倍，并将KV Cache显存占用显著降低了75%。

#### 背景与动机

长上下文LLMs在聊天机器人、智能体等多种应用中展现出强大能力。然而，长上下文也带来了巨大的GPU显存消耗，尤其是KV Cache的内存占用随序列长度线性增长。例如，Llama-3-8B在128K上下文长度下，KV Cache可占用超过134GB的GPU显存。

现有研究主要通过丢弃不重要的token来减少KV Cache，这些方法基于注意力分数的稀疏性。然而，本文作者指出，在多步推理场景中，token的重要性会随着推理步骤的变化而变化。仅仅依赖当前的注意力分数来丢弃token可能会导致关键信息丢失，影响后续推理。

#### OmniKV的核心洞察

OmniKV的设计基于以下三个关键洞察：

- **层内注意力稀疏性 (Intra-Layer Attention Sparsity)**：LLMs层内的注意力矩阵本身就存在稀疏性，这意味着LLMs可以通过关注一小部分token来产生几乎相同的输出。
- **层间注意力相似性 (Inter-Layer Attention Similarity)**：一个固定子集的token在特定层中获得显著关注后，在后续层中仍能保持其重要性。这种现象揭示了不同层之间稀疏模式的高度相似性，因此OmniKV只需在少量“过滤层”上计算完全注意力，即可获取后续层的稀疏模式。
- **token间注意力可变性 (Inter-Token Attention Variability)**：重要的token在LLMs的生成过程中是动态变化的，特别是在多任务或多步推理场景（如思维链CoT）中。基于此，OmniKV保留了所有KV Cache以确保性能不受影响。

#### 技术路线

OmniKV是一个无token丢弃、无需训练的推理方法，包含两个核心模块：**上下文银行 (Context Bank)** 和 **上下文选择器 (Context Selector)**。整个推理过程分为预填充（Prefill）和解码（Decode）两个阶段。

#### 1. 预填充阶段 (Prefill Stage)

在预填充阶段，OmniKV的上下文银行会根据层间注意力相似性，将大部分“非过滤层”的KV Cache存储到CPU内存中，而将少量“过滤层”的全部KV Cache保留在GPU内存中。

#### 2. 解码阶段 (Decode Stage)

在解码阶段，OmniKV的核心机制发挥作用：

#### 2.1 上下文选择器 (Context Selector)

上下文选择器在“过滤层”中动态识别KV Cache（K，V）的重要子集  T_i 。其工作原理如下：

$首先，通过注意力投影矩阵 W_{i}^{q} 和  W_{i}^{k} ，将观察窗口h_{i}^{w}和完整上下文h_{i}^{c}转换为查询  Q_i  和键 K_i ： Q_{i}=W_{i}^{q}h_{i}^{w} \quad K_{i}=W_{i}^{k}h_{i}^{c} $

接着，计算注意力分数 $ A_i $： A_{i} = \text{Softmax}\left(\frac{Q_i K_i^T}{\sqrt{d}}\right) 其中，$ A_{i}\in\mathbb{R}^{H\times|h_{i}^{w}|\times|h_{i}^{c}|} $，H表示注意力头数量，d表示每个注意力头的隐藏大小。

$然后，通过对注意力分数A_i进行Reduce-Max操作并结合加权向量  \alpha  进行加权求和，得到分数向量  S_i ： S_{i}=\sum_{j=0}^{|h_{i}^{w}|-1}\alpha_{j}\max_{0\le h 其中， S_{i}\in\mathbb{R}^{|h_{i}^{c}|} 。  \alpha  可以根据不同的策略（Uniform, Exponential, Last Token）设置，以赋予观察窗口中不同token不同的权重。$

$最后，利用 `topk` 操作从分数向量 S_i 中识别出重要的token集合  T_i ： T_{i}=\text{arg top }k(S_{i}) 其中，T_{i}\in\mathbb{R}^{k} 。$

#### 2.2 上下文银行 (Context Bank)

上下文银行将上下文选择器识别出的重要token $T_i$ 传播到“非过滤层”。由于“非过滤层”之间共享相同的token索引 $T$，因此可以将一系列连续的稀疏注意力层的KV Cache打包，从CPU内存一次性加载到GPU内存。这种“打包加载”的方式显著减少了PCIe传输开销。

整个注意力机制的计算可以表示为： \mathfrak{ut}_{i}=\begin{cases}Attention_{i}(h_{i}^{l},K_{i},V_{i}) & \text{if } i\in\mathbb{L} \text{ or } i-1\in\mathbb{L} \text{ or } i 其中， h_{i}^{l} $表示最后一个token的隐藏状态， \mathbb{L}  是“过滤层”的集合， \mathbb{L}_{0}  是一个浅层阈值。

#### 实验结果与优势

OmniKV在Llama-3-8B-262K、Yi-9B-200K和Llama-3.1-70B-Instruct等LLMs上进行了广泛实验。主要优势包括：

- **性能无损加速**：在长文本场景下，推理效率提升1.7倍，且不损失模型性能。
- **显著降低显存占用**：与Offloading技术高度兼容，可将KV Cache显存占用显著降低高达75%。
- **扩展上下文长度**：使用单个A100 GPU，将Llama-3-8B的最大上下文长度从128K扩展到450K。
- **多步推理场景优势**：在思维链（Chain-of-Thoughts）等多步推理场景中表现出特别的优势。
- **降低计算和数据传输成本**：通过动态选择和打包加载，减少了计算量和CPU与GPU之间的数据传输量。

#### 结论

OmniKV为长上下文LLMs的推理效率提供了一种创新且实用的解决方案。它通过洞察层间注意力相似性，实现了无token丢弃且无需训练的高效推理，显著提升了速度并降低了内存消耗。该方法易于实现，在实际应用中具有广阔前景。

#### 了解更多

- 论文代码地址: [https://github.com/antgroup/OmniKV.git](https://link.zhihu.com/?target=https%3A//github.com/antgroup/OmniKV.git)
希望这篇技术帖子能帮助您更好地理解OmniKV！