---
title: "隐藏状态漂移时：KV缓存能否拯救长程投机解码？"
date: "2026-05-01 23:01:38"
updated: "2026-05-01 23:01:38"
layout: "post"
permalink: "/collections/0.raw/papers/KVShot-隐藏状态漂移与KV缓存拯救投机解码-arXiv2604.26412/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 隐藏状态漂移时：KV缓存能否拯救长程投机解码？

<strong>作者</strong>：Tianyu Liu<sup>1,2</sup>, Yuhao Shen<sup>1,3</sup>, Xinyi Hu<sup>1</sup>, Baolin Zhang<sup>1</sup>, Hengxin Zhang<sup>1</sup>, Jun Dai<sup>1</sup>, Jun Zhang<sup>1,3</sup>\*, Shuang Ge<sup>1</sup>\*, Lei Chen<sup>1</sup>, Yue Li<sup>1</sup>, Mingcheng Wan<sup>1</sup>

<strong>机构</strong>：
## 1. 阿里巴巴通义千问应用业务团队（Qwen Applications Business Group of Alibaba）

## 2. 中国科学技术大学（University of Science and Technology of China）

## 3. 浙江大学（Zhejiang University）


<strong>来源</strong>：https://arxiv.org/abs/2604.26412

---

## 摘要

投机解码（Speculative Decoding）加速了大语言模型的推理，但当前最先进的基于隐藏状态（hidden-state）的草稿模型（如EAGLE3和MTP）存在<strong>长程衰减（long-range decay）</strong>问题：随着投机步数增加，草稿准确率逐步下降。现有工作将这种衰减归因于训练-推理不匹配，并提出使用自回归测试时训练（TTT）作为解决方案，但我们观察到，即使在经过TTT训练的草稿模型中，长程衰减依然存在。我们从<strong>上下文信息保持</strong>的角度重新审视长程衰减。在隐藏状态复用中，我们认为目标隐藏状态充当了一种<strong>有偏的上下文压缩</strong>：它根据当前解码位置的注意力查询聚合历史token信息，产生一个为即时下一个token预测优化的紧凑表示。这种压缩会压制与当前查询相关性较低、但对后续投机步重要的信息。相比之下，目标模型的KV缓存充当了<strong>显式上下文</strong>，保留了完整的逐token KV表示，而不是将历史压缩为单一隐藏表示。因此我们提出<strong>KV复用假设（KV-Reuse Hypothesis）</strong>：允许草稿模型复用目标KV缓存可以为长程起草提供更丰富的条件信号。为验证这一假设，我们引入<strong>KVShot</strong>，一个诊断框架，在三种复用范式下进行比较：<strong>纯隐藏态</strong>、<strong>纯KV</strong>和<strong>混合</strong>。在Qwen3-8B上的广泛评估表明，KV复用提高了长程接受率，尽管在当前训练流程下端到端加速效果仍不明显。我们的分析识别出两个关键的结构性瓶颈：浅层草稿模型难以准确估计目标查询，以及草稿侧KV投影收到的梯度信号稀疏。这些发现表明，实现KV感知解码的潜力需要超越自回归TTT，转向块级（block-wise）训练范式。通过揭示这些瓶颈，KVShot提供了一个基础性的诊断测试平台，并为设计下一代推理架构提供了清晰的路线图。

---

## 1. 引言

大语言模型（LLM）中的自回归解码本质上是顺序的，这使得推理延迟成为即使在高度优化的内核下也持续存在的瓶颈。投机解码通过让一个轻量级草稿模型提出多个候选token，然后由一个更大的目标模型在单次前向传播中验证，从而缓解了这一问题——将顺序生成的代价分摊到多个token上（Leviathan et al., 2023; Chen et al., 2023; Miao et al., 2024; Chen et al., 2025; Xia et al., 2024）。

在各种草稿模型设计中，<strong>隐藏状态复用</strong>已成为主导范式。EAGLE风格草稿模型（Li et al., 2025b, 2024, 2025c）将目标模型的内部隐藏状态输入到一个单层草稿模型中，以低成本预测多个未来token。多token预测（MTP）草稿模型采用类似的复用策略，已在生产系统中采用（Cai et al., 2024; Gloeckle et al., 2024; DeepSeek-AI, 2024）。尽管取得了实际成功，这些基于隐藏状态的草稿模型有一个共同弱点：<strong>长程衰减</strong>。草稿准确率随着投机步数 \(k\) 增加而逐步下降（图1），这直接限制了可行草稿树的深度和投机解码能带来的最大端到端加速。

长程衰减的标准解释是<strong>训练-推理不匹配</strong>。训练时草稿模型以目标隐藏状态为条件，但推理时它必须依赖自己递归生成的隐藏状态，这些状态在每一步都会进一步偏离目标分布。首次由HASS（Zhang et al., 2025）提出、后来被集成到EAGLE-3（Li et al., 2025c）中的自回归测试时训练（TTT）通过让草稿模型在训练过程中暴露于自身的漂移轨迹来解决这一差距。虽然TTT可测量地提高了草稿接受率，但图1b说明即使在经过TTT训练的草稿模型中，长程衰减依然存在，表明训练-推理不匹配本身并不能完全解释这一现象。

在本文中，我们从<strong>上下文信息保持</strong>的角度来处理剩余的衰减。我们认为隐藏状态是一种有偏的上下文压缩。在隐藏状态计算过程中，目标模型的注意力机制根据当前解码位置的查询来聚合值向量，该查询针对即时下一个token预测进行了优化。与该预测相关性较弱的历史token获得较小的注意力权重，导致它们的信息在结果隐藏状态中被大幅压制。这种压缩非常适合短程预测，但会削弱后续投机步所需的信号。接收这种压缩表示的草稿模型在预测范围扩大时面临越来越困难的信息恢复问题。

相比之下，目标模型的KV缓存充当了显式的上下文记忆，保留了per-position键值对在被注意力聚合之前的完整集合。给定这些键值对，草稿模型可以用自己估计的未来查询重新关注前缀，使每个前缀位置都明确可访问。因此挑战从恢复被压制的信息转变为准确估计未来查询，将任务框架为函数逼近问题而非信息恢复问题。这种对比催生了KV复用假设：由于KV缓存在注意力聚合之前保留了token级前缀信息，KV复用应该比纯隐藏态复用更好地保持上下文信息，因此KV纯复用应该在更长的投机步上衰减得更平缓。

测试这一假设需要隔离复用表示本身的效果。尽管跨注意力风格的KV复用已出现在先前的投机解码系统中（Du et al., 2024; Yang et al., 2026），但尚未有系统地将其与隐藏状态复用作为解释长程衰减的机制进行比较。为填补这一空白，我们构建了KVShot，这是一个诊断框架，在与EAGLE-3相同的自回归TTT流程下评估KV复用起草。我们围绕三种复用设置来组织比较：<strong>纯隐藏态复用</strong>（由EAGLE-3和MTP代表，目标隐藏状态被拼接到草稿输入）；<strong>纯KV复用</strong>（目标KV缓存被注入草稿注意力）；以及<strong>混合复用</strong>（隐藏状态提供主要锚点，KV复用通过门控delta校正做出贡献）。我们在Qwen3-8B（Qwen Team et al., 2025）上比较KV纯复用和混合草稿模型与匹配的纯隐藏态EAGLE-3基线，从而将表示选择的效果与其他混淆因素隔离开来。

我们的实验表明，KV复用在更长的起草步上比隐藏状态复用衰减得更平缓。然而，这些收益仍然太小，无法产生显著的端到端加速。我们对这一差距进行了详细分析，并识别出当前自回归TTT流程的结构性限制，这些限制阻止了它有效地学习利用KV缓存。我们的发现表明，实现KV复用的潜力可能需要替代训练范式，例如与KV学习更好对齐的块级训练（Chen et al., 2026）。

<strong>总结来说，本文做出以下贡献</strong>：

1. <strong>长程衰减的新信息保持视角</strong>。我们表明长程衰减不仅仅是训练-推理不匹配的效果，还取决于复用哪种目标模型表示。通过将隐藏状态分析为依赖于查询的压缩摘要，我们解释了为什么纯隐藏态复用会压制后续起草步所需的上下文。这引出了KV复用假设：由于KV缓存在注意力聚合之前保留了token级前缀信息，KV纯复用应该在更长的起草视界上衰减得更平缓（第2节）。

2. <strong>表示复用的统一诊断框架</strong>。我们引入KVShot，一个在相同自回归TTT流程下系统比较纯隐藏态复用、纯KV复用和门控混合复用的控制框架。这一设计将表示选择的效果与投机解码中的其他混淆因素隔离开来（第3节）。

3. <strong>KV复用起草的结构性瓶颈分析</strong>。我们表明KV复用提高了长程接受率，但在当前自回归TTT下仍然受限。我们的分析识别出查询估计困难和稀疏KV投影梯度作为两个关键瓶颈，推动与块级KV学习更好对齐的训练范式（第4节）。

论文结构如下：第2节展示我们的信息保持分析。第3节介绍KVShot框架并评估其经验性能。第4节深入检查与KV复用自回归TTT相关的瓶颈。然后在第5节讨论相关工作，最后在第6节总结。

---

## 2. 长程衰减的上下文信息保持视角

本节通过比较隐藏状态复用和KV复用在上下文信息保持方面的表现来形式化这一直觉，并推导出KV复用假设以及后续实验的三个可测试预测。

### 2.1 隐藏状态作为有偏的上下文压缩

为隔离关键机制，我们聚焦于Transformer块的注意力聚合组件。完整的隐藏状态还包括输出投影、残差连接、层归一化和前馈子层；为清晰起见我们省略这些，因为压缩论点专门适用于注意力步骤。

考虑目标模型某一层 \(\ell\) 的单个注意力头。给定前缀 \(x_1, ..., x_t\)，位置 \(t\) 处的注意力输出是对值向量的加权聚合：

$$
h_{\ell t} = \sum_{i=1}^{t} \alpha_i v_{\ell i}, \quad \alpha_i = \frac{\exp(q_{\ell t}^{\top} k_{\ell i})}{\sum_{j=1}^{t} \exp(q_{\ell t}^{\top} k_{\ell j})}
\tag{1}
$$

权重 \(\{\alpha_i\}\) 由当前查询 \(q_{\ell t}\) 决定，该查询针对预测 \(x_{t+1}\) 进行了优化。如果某个历史token \(x_k\) 与该预测相关性较弱，则对应权重 \(\alpha_k\) 接近零，特征 \(v_{\ell k}\) 实际上从 \(h_{\ell t}\) 中被丢弃。

这意味着 \(h_{\ell t}\) 是一种<strong>依赖于查询的压缩</strong>：它保留了用于即时下一个token预测的信息，但削弱了可能对预测更远的token（\(x_{t+2}, x_{t+3}, ...\)）至关重要的信息。当草稿模型收到 \(h_{\ell t}\) 作为输入并尝试预测多个未来token时，它面临一个困难的恢复问题：被压制的 \(v_{\ell k}\) 必须从一个权重已被压至接近零的混合物中分离出来。一般来说，这种恢复本质上是病态的：随着注意力更激进地集中在少数几个位置上，下游模型重建被削弱成分的难度就越来越大。

这一分析也解释了为什么最近的草稿模型如EAGLE-3（Li et al., 2025c）融合多层隐藏状态而不是仅依赖顶层。不同层关注输入的不同方面，因此在某一层被压制（\(\alpha_k \approx 0\)）的token可能在另一层获得实质性权重。因此多层融合部分恢复了任何单层压缩丢失的信息。然而这仍然是一种部分补救：融合表示仍然是固定维度的聚合，在所有融合层中始终未被注意的信息仍然难以恢复。

图2对比了两种复用范式。在隐藏态范式（a）中，token \(x_2\) 在目标聚合过程中获得接近零的权重（\(\alpha_2 = 0.01\)），其信息在 \(h_3\) 中基本丢失。然而草稿模型对未来预测给同一token分配了最高权重（\(\alpha_2 = 0.65\)），说明了目标压缩掉的内容与草稿所需内容之间的不匹配。KV缓存范式（b）避免了这种丢失：草稿模型用自己的查询 \(q_4\) 重新关注完整的目标键值对集合，因此每个位置都保持可访问。

### 2.2 KV缓存作为无先前聚合的重新注意力

KV缓存保留了完整的键值对集合 \(\{(k_{\ell i}, v_{\ell i})\}_{i=1}^{t}\)，没有任何有损聚合。如果给草稿模型访问这些对，它可以生成自己的查询 \(q'\) 并执行新的重新注意力：

$$
a' = \sum_{i=1}^{t} \alpha_i(q') v_{\ell i}, \quad \alpha_i(q') = \frac{\exp(q'^{\top} k_{\ell i})}{\sum_{j=1}^{t} \exp(q'^{\top} k_{\ell j})}
\tag{2}
$$

在草稿查询 \(q'\) 非常接近某个未来位置 \(t + k\) 处的真实目标查询 \(q_{\ell t+k}\) 的简化情况下，\(a'\) 接近目标注意力输出。与隐藏状态复用不同，没有先前聚合步骤丢弃信息。在这个简化设置中，近似质量主要由查询估计误差决定，我们粗略地写成：

$$
E_{\text{KV}} \approx E_q \quad \text{（查询误差主导情况）}
\tag{3}
$$

公式(3)是一个概念分解而非正式界：它隔离了简化KV复用设置中的主要误差源，旨在为后续实验提供动机，而非作为严格不等式来理解。同时，一个自然的反对意见是隐藏状态和KV缓存并非根本不同的信号。我们将在第2.3节处理这一反对意见。

### 2.3 隐藏状态和KV缓存是否等价？

一个自然的反对意见是隐藏状态和KV缓存并非根本不同的信号。在标准Transformer块中，第 \(\ell+1\) 层的KV缓存来自第 \(\ell\) 层的隐藏状态，通过归一化和线性投影得到：

$$
k_{\ell+1 t} = W_{K}^{\ell+1} \text{Norm}(h_{\ell t}), \quad v_{\ell+1 t} = W_{V}^{\ell+1} \text{Norm}(h_{\ell t})
\tag{4}
$$

这表明KV \(_{\ell+1}\) 是 \(h_{\ell}\) 的简单函数，似乎削弱了KV复用提供有意义不同信息的说法。三个观察阐明了为什么在实践中这种区别仍然重要。

<strong>1. 最后一层信息缺口。</strong> 考虑一个 \(L\) 层目标模型，其顶层隐藏状态 \(h_{L t}\) 被草稿模型复用。第 \(L\) 层的KV缓存在第 \(L\) 层已经被注意力机制消耗以产生 \(h_{L t}\)，这是一个严格受公式(1)有偏压缩支配的过程。没有第 \(L+1\) 层其KV缓存会对应于 \(h_{L t}\)。由于先前工作一致发现顶层携带最强的预测信号（Cai et al., 2024; Li et al., 2025b），顶层KV信息的丢失可能因此特别重要。

<strong>2. 投影缺口。</strong> 即使在中间层，从隐藏状态恢复KV也不是免费的。投影 \(W_K\) 和 \(W_V\) 是非平凡的变换；在具有分组查询注意力的模型中，隐藏维度通常比per-head KV维度大4～8倍。接收 \(h_{\ell}\) 而不是预计算的 \((k_{\ell+1}, v_{\ell+1})\) 的草稿模型必须隐式地学习这些投影，这对只有一两层的草稿模型施加了额外负担。

<strong>3. 容量竞争。</strong> 在KV复用下，草稿模型的主要任务是查询估计：生成接近目标查询的 \(q'\)。在隐藏状态复用下，相同的浅层草稿模型必须同时执行查询估计和从接收到的隐藏状态隐式重建KV投影。这两个任务竞争草稿模型有限的表示容量。KV复用通过直接提供预计算的键值对来消除其中一个责任，将所有容量集中在查询估计上。从经验上可以观察到这种投影缺口：直接复用目标KV显著优于一种必须通过学习投影从隐藏状态派生KV的变体（附录D，"隐藏态→KV跨投影"）。

### 2.4 两种误差机制的比较

在隐藏状态复用下，我们将草稿模型在步 \(k\) 处的预测误差表示为 \(E_{\text{HS}}^{(k)}\)，可粗略分解为两个耦合来源：

$$
E_{\text{HS}}^{(k)} \approx \underbrace{E_{\text{comp}}}_{\text{压缩损失}} + \underbrace{E_{\text{drift}}^{(k)}}_{\text{递归漂移}}
\tag{5}
$$

第一项 \(E_{\text{comp}}\) 捕获由目标模型注意力聚合引起的信息损失。它在 \(k=1\) 时就已存在，不取决于草稿模型的容量或质量。第二项 \(E_{\text{drift}}^{(k)}\) 捕获随着草稿模型递归地以其自身预测为条件时，目标与草稿隐藏状态之间累积的不匹配，因此随 \(k\) 增加。这两个来源是耦合的，因为压缩的目标隐藏状态为草稿递归提供了初始条件，所以聚合丢弃的任何信息都可以通过后续漂移传播和放大。通过TTT的训练-推理不匹配主要针对 \(E_{\text{drift}}^{(k)}\)，但无法减少 \(E_{\text{comp}}\)，因为这种压缩发生在目标模型内部。

在KV复用下，在公式(3)背后的简化视角中压缩分量减少了，因为没有先前聚合步骤在草稿模型看到之前丢弃信息。主要挑战然后变成 \(E_q\)，即草稿模型产生有效查询的能力。这将困难从信息恢复问题（有损压缩的分离）转变为函数逼近问题（估计未来目标查询），同时保持底层键值对可用。因此实际启示很简单：KV复用可以保留更多相关前缀信息，但只有当草稿模型能够从有限的深度和训练信号中形成有用的未来查询时，它才有帮助。

### 2.5 KV复用假设

前述分析表明一个简单假设：由于KV缓存在注意力聚合之前保留token级前缀信息，KV复用应该比隐藏状态复用为长程投机起草提供更稳健的信号。同时，利用这一信号需要草稿模型估计有用的未来查询，这可能引入新的瓶颈。这一假设引出三个可测试预测，指导第3-4节的实验：

<strong>预测1 长程优势。</strong> 随着投机步 \(k\) 增加，KV复用应该比隐藏状态复用衰减得更平缓。随着 \(k\) 增长，未来查询 \(q_{t+k}\) 进一步偏离当前查询 \(q_t\)。因此，专门针对 \(q_t\) 调整的隐藏状态压缩越来越容易丢弃 \(q_{t+k}\) 所需的信息。KV复用绕过了这种不匹配，因此其相对优势应该在后续步（\(k \geq 3\)）最明显。

<strong>预测2 查询估计瓶颈。</strong> KV复用的好处取决于草稿模型估计 \(q'\) 的好坏。非常浅的草稿模型——其查询是输入嵌入的线性投影——将表现不佳，因为它缺乏近似目标查询所需的深度，而目标查询是通过多层非线性变换产生的。

<strong>预测3 短程劣势。</strong> 在 \(k=0\) 或 \(k=1\) 时，隐藏状态复用可能仍然是首选：当预测下一个token相关的信息也是被最多注意的信息时，\(E_{\text{comp}}\) 很小，而且隐藏状态比馈送给基于KV的草稿模型的原始输入嵌入携带更丰富的语义内容。

如果所有三个预测都成立，实际含义是KV复用在结合隐藏状态复用的混合设计中最有价值，而且训练流程必须提供足够的容量和梯度信号让草稿模型学习有效查询。

---

## 3. KVShot：测试KV复用假设

本节报告基于KVShot框架构建的实验研究（如图3所示）。在整个本节中，KVShot指的是整体诊断设置而非单一模型；我们将特定模型家族称为KV纯草稿模型和混合草稿模型。

### 3.1 实验设置

<strong>目标模型和数据。</strong> 所有实验使用Qwen3-8B（Qwen Team et al., 2025）作为目标模型。初始消融（第3.2-3.4节）在ShareGPT（∼70k样本，3个epoch）上训练以进行快速迭代。第3.5节的端到端评估扩展到280k样本（ShareGPT + UltraChat），并使用目标模型重新生成的响应。

<strong>训练。</strong> 我们在SpecForge（Li et al., 2025a）之上实现实验，并使用EAGLE-3（Li et al., 2025c）使用的自回归测试时训练（TTT）目标训练所有草稿模型，这与推理时隐藏状态漂移的训练保持一致。

<strong>指标。</strong> 我们报告步进草稿接受率 \(\alpha_k\)（\(k = 0, ..., 6\)）和期望平均接受token数 \(\text{MAT} = 1 + \sum_{k=0}^{K} \alpha_k\)。对于端到端评估，我们额外报告使用HuggingFace投机解码流程（草稿树配置为(8, 10, 60)）测量的MAT。

<strong>基线。</strong> 主要基线是1层EAGLE-3草稿模型，在与每个KV变体相同的设置下训练。

### 3.2 KV纯复用：重新注意力有帮助吗？

<strong>设计。</strong> 如图3(a)所示，我们完全替换隐藏状态输入，将目标KV缓存注入草稿模型的注意力。我们比较两种处理多层目标KV的注入策略：①<strong>头拼接</strong>，通过因子 \(L_s\) 扩展草稿KV头并拼接来自 \(L_s\) 个采样目标层的KV；②<strong>线性投影</strong>，通过学习矩阵 \(W_K^{\text{proj}}, W_V^{\text{proj}} \in \mathbb{R}^{d_{\text{kv}} \times L_s \cdot d_{\text{kv}}}\) 将拼接的多层KV映射回单层表示。线性投影破坏了已经通过RoPE编码的位置信息；③我们测试在投影后重新应用RoPE的变体。

<strong>结果。</strong> 表1显示结果。三个发现很突出：(1) 目标KV提供了明确的信号：完全移除它（"No target info"）将MAT从1.84降至1.31。(2) 线性投影显著优于头拼接（MAT 1.83 vs 1.78），表明强制单个查询跨 \(L_s\) 个不相交的KV空间对单层草稿模型来说太困难了。(3) 在投影后重新应用RoPE只带来边际增益（1.84 vs 1.83），表明位置损坏不是主要的性能瓶颈。

尽管有这些改进，所有KV纯变体仍远低于EAGLE-3基线（MAT 2.37）。特别是 \(\alpha_0\) 从未超过0.50，而EAGLE-3为0.64。这与第2.5节的<strong>预测3</strong>一致：在短程，隐藏状态比KV纯草稿模型必须依赖的原始输入嵌入携带更丰富的语义内容。同时，"No target info"与KV复用变体之间的差距表明目标KV确实重要，这推动了下一个<strong>预测2</strong>的测试：更好的查询估计是否能解锁更多这种信号。保留列因此应与绝对接受率一起阅读：基本平坦但普遍较低的"No target info"曲线产生名义上的99.6%保留率，但整体表现仍然差得多。

### 3.3 深度缩放：查询估计是瓶颈吗？

<strong>设计。</strong> 本小节直接测试第2.5节的<strong>预测2</strong>：KV复用只有在草稿模型能够估计有用查询时才有帮助。1层草稿模型的查询是输入嵌入的线性投影，缺乏近似目标查询的深度。因此我们逐步将草稿模型从1层增加到4层，所有都使用带RoPE重新应用的线性投影注入。

<strong>结果。</strong> 表2支持查询估计作为一个主要瓶颈。从1层到2层产生了最大的单一增益（\(\Delta\text{MAT} = +0.39\)），因为第二层给了草稿模型一个上下文感知的查询而不是输入嵌入的线性变换。收益迅速递减：3层和4层只分别增加+0.08和+0.03。即使4层KV纯草稿模型（MAT 2.34）也只接近但未超过1层EAGLE-3基线（MAT 2.37）——而成本显著更高。这种递减返回模式可能部分反映了更深KV纯草稿模型的优化难度，而非纯粹的容量限制。尽管如此，从1层到2层的急剧跳跃强烈表明，给草稿模型足够的深度来形成上下文感知查询是瓶颈的主要部分。

保留列使长程模式更加明确。随着深度增加，KV纯保留率 \(\alpha_6 / \alpha_0\) 从71.5%上升到80.6%，最终超过EAGLE-3基线（73.5%）。这正是<strong>预测1</strong>预期的行为：一旦查询估计足够强，KV复用在跨投机步时衰减得更不严重，即使其短程准确率仍然落后于隐藏状态复用。

值得注意的是，在 \(k=6\) 时，4层KV纯草稿模型（0.495）确实超越了EAGLE-3（0.469），支持了<strong>预测1</strong>预期的长程优势，而在 \(k=0\) 时仍然低于EAGLE-3（0.614 vs 0.638），如<strong>预测3</strong>所预期。这两个效果在总体MAT中大致相互抵消。换句话说，深度缩放研究共同支持所有三个预测：更好的查询估计有帮助，KV复用在长程变得更竞争，隐藏状态复用仍然保持短程优势。

### 3.4 混合复用：KV能否补充隐藏状态？

KV纯实验现在更清楚地解决了第2.5节的预测模式。<strong>预测1</strong>出现在长程，KV复用变得更竞争。<strong>预测3</strong>出现在短程，隐藏状态复用保持更强。如果两个效应都是真实的，自然的下一步是保持隐藏状态锚点用于早期步、让KV复用在更长范围提供校正的混合草稿模型。

#### 3.4.1 门控Delta规则

如图3(b)所示，我们用跨注意力路径补充EAGLE-3自注意力路径到目标KV，通过门控delta规则合并。设计直觉很简单：隐藏状态路径应该保持EAGLE-3的强短程行为，而KV路径应该在更长范围重新注意力变得有用时提供校正。给定草稿token表示 \(x_i\)，我们计算：

$$

```text
n_i = \text{SelfAttn}(x_i) \quad \text{（EAGLE-3路径）}
```

\tag{6}
$$

$$

```text
o_i = \text{CrossAttn}(x_i, M_i) \quad \text{（KV路径）}
```

\tag{7}
$$

其中 \(M_i\) 包含已验证前缀token的目标KV缓存和后续位置草稿生成的KV。跨注意力输出被视为校正：

$$
\Delta_i = o_i - n_i
\tag{8}
$$

共享门控控制应用多少这种校正：

$$

```text
g_i = \sigma(W_g [n_i; o_i; \Delta_i] + b_g)
```

\tag{9}
$$

$$
h_i = n_i + g_i \odot W_\Delta \Delta_i
$$

其中 \(\sigma\) 是sigmoid函数，\(W_g, b_g\) 在所有起草步上共享。当 \(g_i \approx 0\) 时，模型简化为标准EAGLE-3；当 \(g_i\) 较大时，跨注意力校正将表示移向重新注意力目标KV所建议的内容。该设计将短程预测锚定在自注意力分支上，同时允许跨注意力分支作为长程校正项。

模型可以从随机初始化训练，也可以从现有EAGLE-3检查点热启动。在后一种情况下，自注意力分支和所有共享模块（输入投影、MLP、层归一化）继承预训练权重，而新添加的跨注意力投影、门控和delta投影随机初始化。Cross-only变体遵循相同的初始化方案，但从完全前向传递中移除自注意力输出；底层投影仍然从EAGLE-3检查点继承，所以与混合草稿模型的唯一架构区别是形成 \(h_i\) 时省略了 \(n_i\)。

#### 3.4.2 结果

表3提供了本研究中第一个明确的正向步进结果。从EAGLE-3检查点热启动的混合草稿模型达到MAT 2.54，超过EAGLE-3基线（2.37）0.17。改进在所有步上都可见：\(\alpha_0\) 从0.638上升到0.665（+4.2%），\(\alpha_6\) 从0.469上升到0.514（+9.6%），表明KV校正在更长范围特别有帮助。保留率明确显示相同模式：EAGLE-3的73.5%上升到检查点初始化混合草稿模型的77.3%。

两个额外发现值得注意：(1) <strong>检查点初始化很重要</strong>：从EAGLE-3检查点热启动（MAT 2.54）显著优于随机初始化（2.44），表明强自注意力锚点加速了跨注意力校正的学习。(2) <strong>自注意力锚点是必不可少的</strong>：移除它（"Cross-only"）将MAT降至2.34-2.35，低于EAGLE-3基线，即使底层投影仍然从EAGLE-3检查点继承。这表明跨注意力单独无法替代隐藏状态路径，并支持门控delta设计——KV信息作为校正而非替代品做出贡献。这正是第2.5节三个预测所暗示的混合含义：KV复用在补充隐藏状态复用时帮助最大，而不是试图替代它。

### 3.5 端到端评估：收益是否 surviving开销？

表3中步进接受率改进表明第2.5节的预测在per-step水平上是广泛正确的。然而实际问题在于这些经过验证的步进效应一旦训练扩大并将起草开销纳入端到端代理后是否 surviving。因此我们以两种方式扩大训练。数据集从∼70k增长到280k样本（ShareGPT + UltraChat），目标响应由Qwen3-8B自身重新生成，使训练分布与推理分布匹配。评估使用HuggingFace投机解码流程，草稿树形状为(8, 10, 60)（深度8，每层top-k 10，总计≤60个候选token）。本节我们将HF测量的MAT作为主要端到端代理，而非直接墙壁时钟吞吐量测量。

表4给出了本研究的中心负面结果。在控制比较中（都从相同检查点训练），混合草稿模型仅将HF测量的MAT从5.01提高到5.04（+0.6%）。我们的进一步分析表明，额外的跨注意力路径引入了大约5-10%的额外起草延迟。综合来看，这些数字不支持在当前流程中有意义的端到端加速声明，并表明任何墙壁时钟增益充其量是边际的。

KV收益从步进评估中的+0.17 MAT缩小到端到端代理中的+0.03 HF MAT，可能是因为几个因素在端到端设置中复合。首先，EAGLE-3基线本身从更大、重新生成的 dataset中获益良多（MAT从现有检查点的4.43上升到重新训练时的5.01）。这表明门控KV路径在小规模上校正的部分在给予隐藏状态基线更多和更好对齐的训练数据时也是可恢复的。其次，HF MAT是在形状为(8, 10, 60)的树验证下计算的，这已经利用了多条候选路径，并倾向于压缩步进曲线差异较小的草稿模型之间可见的差异。我们不认为任何一个因素完全解释了这种缩小，但它们共同使小的端到端差距与 nontrivial步进差距一致。

这一结果并不否定第2节的信息保持分析：表3中的步进改进表明添加KV校正路径可以帮助长程预测。相反，它表明当前自回归TTT流程无法有效地利用这一信号来克服增加的成本。换句话说，验证预测1-3尚不足以支持端到端加速声明。下一节分析这种缩小的更深层次流程级原因。

---

## 4. 为什么当前自回归TTT不能很好地适配KV复用？

第3节的实验在步进水平上广泛验证了第2.5节的预测。KV纯复用在后续起草步变得相对更竞争（预测1），更深的KV纯草稿模型显著改善（预测2），隐藏状态复用保持短程优势（预测3）。剩余问题是为什么这些步进效应在当前流程下仍然只缩小为边际的端到端增益。在本节中，我们分析三个流程级瓶颈，它们共同解释了那种差距，并讨论它们对未来工作的影响。

### 4.1 查询估计比看起来更难

第2节的信息保持分析将查询估计（记为 \(E_q\)）隔离为KV剩余的主要剩余困难。原则上这是一个纯粹的函数逼近问题。然而在实践中，目标模型在位置 \(t+k\) 处的查询是整个前缀上 \(L\) 层非线性变换的输出。只有一两层的浅层草稿模型在近似这些查询方面从根本上受到容量限制。

第3.3节的深度缩放实验提供了直接证据：从1层到2层产生大的MAT跳跃（+0.39），但即使4层也无法匹配1层EAGLE-3基线。这意味着准确的查询估计需要比准确预测下一个隐藏状态多得多的模型容量，因为草稿必须复制产生目标查询的多层组合结构，而不是从上一层隐藏状态预测一层的输出。

### 4.2 草稿侧KV投影的稀疏优化

第二个不那么明显的瓶颈在于草稿模型自身KV投影（公式7中 \(W_K^{\text{cross}}\) 和 \(W_V^{\text{cross}}\)）的训练动态。简言之，在训练期间看到的大多数KV缓存直接从目标模型复制，因此草稿侧KV路径仅由少量草稿token更新。

在自回归TTT下，每个训练步处理 \(K\) 个草稿token的序列。对于跨注意力分支，只有草稿生成的部分KV缓存会通过 \(W_K^{\text{cross}}\) 和 \(W_V^{\text{cross}}\) 反向传播。前缀部分从目标复制，不通过这些参数反向传播。实际上，草稿token的数量（通常 \(K \leq 7\)）相对于完整前缀长度非常小。因此只有很小比例的注意力计算为草稿侧KV投影贡献梯度。优化因此是稀疏和不平衡的：查询投影 \(W_Q\) 从每个位置接收密集梯度，而KV投影仅由少数草稿位置更新。

我们尝试通过将KV投影梯度缩放50×来缓解这一点，但观察到没有有意义的改善（相同设置下MAT 2.21 vs 2.18；详见附录D）。这表明问题本质上不是梯度幅度，而是训练信号的多样性：相同的少数草稿token模式被重复用于训练KV路径，阻止其泛化。

### 4.3 门控诱导的梯度饥饿

第三个不同的瓶颈出现在混合草稿模型本身的训练动态中。回想融合输出（公式9）将门控校正 \(g_i \odot W_\Delta \Delta_i\) 添加到自注意力输出 \(n_i\)。在"EAGLE-3 ckpt"变体中，自注意力分支用强预训练权重热启动，而跨注意力投影、门控和 \(W_\Delta\) 随机初始化。在这种配置中，我们一致地观察到训练过程中平均门控值 \(\bar{g} = \mathbb{E}[\mathbf{1}^\top g_i / d]\) 的特征轨迹（如图4所示）。

该轨迹与门控残差优化失败模式一致。在初始化时跨注意力分支是随机的，因此其输出相对于预训练的 \(n_i\) 接近噪声。减少损失最快的局部方向是将 \(\bar{g}\) 推向零，有效地抑制跨注意力分支并恢复EAGLE-3基线。然而一旦门关闭，通过跨注意力分支的梯度本身按 \(g_i\) 缩放，因此随机初始化的投影仅接收弱训练信号。这创造了一个自我强化的低注入状态。门不会重新打开直到跨注意力学到有用的东西，而跨注意力在门保持小的时候难以学习。从0.02到0.10的缓慢、嘈杂的恢复在实践中就是这种饥饿的样子。

两个限定值得明确陈述。首先，小 \(\bar{g}\) 不等于"跨注意力分支被忽略"：\(\bar{g}\) 是逐元素门控的平均值，表3中比EAGLE-3高+0.17的MAT正值表明即使 \(\bar{g} \approx 0.1\) 也足以在ShareGPT-70k规模注入有用的校正。其次，门控饥饿本身并不能完全解释表4中的小端到端差距，后者也受到再生280k数据下更强EAGLE-3基线和树验证压缩可见步进差异的影响。尽管如此，轨迹识别出第三个流程级瓶颈，该瓶颈特定于通过学习门融合热启动分支和随机初始化分支的架构，这是无法通过改善查询估计或使KV投影梯度密集化来解决的。

### 4.4 对未来训练流程的启示

所有三个瓶颈最终追溯到同一个根本原因。自回归TTT流程一次生成一个草稿token。这种顺序结构限制了查询计算的深度，限制了可用于训练草稿侧KV路径的token数量。此外，在门控融合架构中，它在训练的关键早期阶段严重削弱了跨注意力分支接收的梯度。

最近关于非自回归起草的工作表明了潜在的解决方案。DFlash（Chen et al., 2026）用块扩散适配器替代自回归起草，该适配器并行预测整个token块。这些设计选择与解决上述至少前两个瓶颈是一致的，尽管我们在这里尚未通过控制比较验证该假设：

- 更深的草稿模型（DFlash中5层）为更准确的查询估计提供了容量，而mask-token并行性摊销了额外的推理成本。
- 块级训练每步生成许多草稿token，因此KV投影从多样化位置集接收密集梯度，而不是自回归TTT的稀疏信号。

我们的发现与此可能性一致。KVShot的诊断价值恰恰在于精确指出当前流程在哪里 faltered。问题不在于第2.5节的预测在步进水平上失败；那些预测大多得到支持。问题在于训练设置无法将那种步进优势转化为高效的端到端系统。因此我们将块级训练流程视为一个有前途的下一步方向，使KV复用成为投机解码中的实用选项。

---

## 5. 相关工作

<strong>投机解码。</strong> 投机解码作为无损加速策略被同时引入，使用轻量级草稿流程提出多个未来token供目标模型并行验证（Leviathan et al., 2023; Chen et al., 2023）。后续系统工作大大扩展了这一设计空间。SpecInfer将草稿候选组织成token树进行并行验证（Miao et al., 2024），Sequoia通过树优化和硬件感知调度提高了可扩展性和硬件适应性（Chen et al., 2025）。Draft & Verify研究自投机解码，其中目标模型使用自己的中间层进行起草和验证（Zhang et al., 2024）。SWIFT将此扩展到on-the-fly自投机解码（Xia et al., 2025），KNN-SSD通过最近邻层集优化进一步研究动态自投机解码（Song et al., 2026）。PEARL研究自适应起草长度控制（Liu et al., 2025），TALON构建置信度感知的token树（Liu et al., 2026b），SpecBranch为混合起草引入回滚感知分支并行性（Shen et al., 2026b）。基于检索的变体如LogitSpec和Double通过使用检索到的候选或双检索并行性进一步拓宽了设计空间以加速投机（Liu et al., 2026a; Shen et al., 2026a）。HIPPO通过整体感知设计将并行投机解码扩展到视频大语言模型（Lv et al., 2026）。像Lookahead Decoding这样的并行精确替代方案完全取消了辅助草稿模型，以每步额外计算换取更少的顺序解码步（Fu et al., 2024）。最近的调查总结了这一更广泛的领域（Xia et al., 2024）。

<strong>复用目标隐藏状态的草稿模型。</strong> 第二类工作专注于草稿模型本身。Medusa用多个解码头增强目标模型以并行预测多个未来token（Cai et al., 2024），多token预测（MTP）采用类似的训练时目标，现在作为推理时草稿模型在生产LLM中广泛部署（Gloeckle et al., 2024; DeepSeek-AI, 2024）。EAGLE（Li et al., 2025b）将起草从token预测转向隐藏状态预测，表明复用内部目标模型特征可以大幅降低起草成本，EAGLE-2用动态草稿树扩展了这一思路（Li et al., 2024）。HASS通过协调目标和上下文对齐解决训练-解码一致性问题（Zhang et al., 2025），EAGLE-3进一步将测试时训练集成到草稿模型并融合多层特征（Li et al., 2025c）。

<strong>复用目标KV缓存的草稿模型。</strong> 一条较小的线路让草稿模型通过跨注意力子层直接消费目标的KV缓存。GLIDE+CAPE（Du et al., 2024）将跨注意力插入浅层草稿模型，使草稿查询能够关注前一个验证块中目标的顶层KV，并使用标准教师强制交叉熵从头训练草稿模型。LongSpec（Yang et al., 2026）采用类似的跨注意力到目标KV设计，动机是长上下文推理：由于目标的KV本来就要存储，重新关注它的草稿使草稿内存随上下文增长保持有界，并与锚点偏移位置索引和闪光噪声训练配对以处理长前缀。这些工作确立了跨注意力风格KV复用是一种实用的草稿模型设计。我们的工作与两者的区别在于三个方面：(i)重点是长程衰减和信息保持，而非低成本起草（GLIDE）或长上下文内存效率（LongSpec）；(ii)我们在单一训练设置下运行KV复用和隐藏状态复用之间的对照头对头比较，包括混合设计结合两种信号，而非将KV复用作为固定设计选择；(iii)我们在EAGLE-3使用的自回归TTT目标下评估基于KV的草稿模型，而非标准教师强制训练，这正是揭示第4节讨论的训练流程级瓶颈的原因。

<strong>超越自回归起草。</strong> 我们分析为什么KV复用在自回归TTT下表现困难的分析与最近的非自回归和块级起草方向相关。DFlash（Chen et al., 2026）用块扩散适配器替代自回归起草，并认为并行块起草绕过了自回归TTT流程的梯度稀疏问题。我们的经验发现与此一致：表明KV复用的主要瓶颈至少与训练设置的选择一样多，而非复用表示的选择。

---

## 6. 结论

本文研究了复用目标模型的KV缓存是否能比现行隐藏状态复用范式更好地缓解投机解码中的长程衰减。我们从两个方向处理这个问题：从上下文信息保持分析提供的概念分解，以及在Qwen3-8B上使用KVShot框架的系统实验研究。

我们的分析表明，隐藏状态复用可以视为引入压缩损失——被目标模型自己的注意力削弱的特征对于下游草稿模型难以恢复——而KV复用可以通过重新注意力保持对完整键值对集合的访问。在简化的KV复用视图中，主要困难转向查询估计，这是一个函数逼近问题而非信息恢复问题。

实验以细致的方式支持这一图景。KV纯草稿模型在更长的起草步上变得相对更竞争，结合KV和隐藏状态信号的混合草稿模型比EAGLE-3基线提高了草稿接受率（MAT 2.54 vs 2.37）。然而端到端代理仍然很小：HF测量的MAT仅从5.01上升到5.04，而起草延迟增加了5-10%。

我们将这一差距追踪到自回归TTT特有的三个瓶颈：浅层草稿模型查询估计的困难、草稿侧KV投影可用的稀疏梯度信号，以及热启动混合草稿模型中门控诱导的梯度饥饿效应，其中学习到的门在早期关闭以抑制随机初始化的分支，然后难以重新打开。这三个都源于自回归起草的顺序、token-by-token性质。生成多个并行草稿token的块级训练流程可能更适合这些限制，值得在未来的KV感知草稿模型中进行直接评估。

这项工作的诊断价值在于分离可用信息和训练流程是否能学习使用它。KV缓存确实为长程起草携带有用的信号；挑战在于构建能够有效利用它的训练设置。

---

## 参考文献

Tianle Cai, Yuhong Li, Zhengyang Geng, Hongwu Peng, Jason D. Lee, Deming Chen, and Tri Dao. Medusa: Simple LLM inference acceleration framework with multiple decoding heads. In Proceedings of the 41st International Conference on Machine Learning, ICML'24. JMLR.org, 2024.

Charlie Chen, Sebastian Borgeaud, Geoffrey Irving, Jean-Baptiste Lespiau, Laurent Sifre, and John Jumper. Accelerating large language model decoding with speculative sampling, 2023.

Jian Chen, Yesheng Liang, and Zhijian Liu. DFlash: Block diffusion for flash speculative decoding. arXiv preprint arXiv:2602.06036, 2026.

Zhuoming Chen, Avner May, Ruslan Svirschevski, Yuhsun Huang, Max Ryabinin, Zhihao Jia, and Beidi Chen. Sequoia: Scalable, robust, and hardware-aware speculative decoding, 2025.

DeepSeek-AI. DeepSeek-V3 technical report. arXiv preprint arXiv:2412.19437, 2024.

Cunxiao Du, Jing Jiang, Yuanchen Xu, Jiawei Wu, Sicheng Yu, Yongqi Li, Shenggui Li, Kai Xu, Liqiang Nie, Zhaopeng Tu, and Yang You. GLIDE with a CAPE: A low-hassle method to accelerate speculative decoding. In Proceedings of the 41st International Conference on Machine Learning, ICML'24. JMLR.org, 2024.

Yichao Fu, Peter Bailis, Ion Stoica, and Hao Zhang. Break the sequential dependency of LLM inference using lookahead decoding. In Proceedings of the 41st International Conference on Machine Learning, ICML'24. JMLR.org, 2024.

Fabian Gloeckle, Badr Youbi Idrissi, Baptiste Rozière, David Lopez-Paz, and Gabriel Synnaeve. Better & faster large language models via multi-token prediction, 2024.

Yaniv Leviathan, Matan Kalman, and Yossi Matias. Fast inference from transformers via speculative decoding. In Proceedings of the 40th International Conference on Machine Learning, volume 202 of Proceedings of Machine Learning Research, pp. 19274–19286. PMLR, 23–29 Jul 2023.

Shenggui Li, Yikai Zhu, Chao Wang, Fan Yin, Shuai Shi, Yubo Wang, Yi Zhang, Yingyi Huang, Haoshuai Zheng, and Yineng Zhang. SpecForge: Train speculative decoding models effortlessly. https://github.com/sgl-project/specforge, 2025a.

Yuhui Li, Fangyun Wei, Chao Zhang, and Hongyang Zhang. EAGLE-2: Faster inference of language models with dynamic draft trees. In Proceedings of the 2024 Conference on Empirical Methods in Natural Language Processing, pp. 7421–7432, Miami, Florida, USA, November 2024. Association for Computational Linguistics.

Yuhui Li, Fangyun Wei, Chao Zhang, and Hongyang Zhang. EAGLE: Speculative sampling requires rethinking feature uncertainty, 2025b.

Yuhui Li, Fangyun Wei, Chao Zhang, and Hongyang Zhang. EAGLE-3: Scaling up inference acceleration of large language models via training-time test, 2025c.

Tianyu Liu, Yun Li, Qitan Lv, Kai Liu, Jianchen Zhu, Winston Hu, and Xiao Sun. PEARL: Parallel speculative decoding with adaptive draft length, 2025.

Tianyu Liu, Qitan Lv, Hao Li, Xing Gao, Xiao Sun, and Xiaoyan Sun. LogitSpec: Accelerating retrieval-based speculative decoding via next next token speculation, 2026a.

Tianyu Liu, Qitan Lv, Yuhao Shen, Xiao Sun, and Xiaoyan Sun. TALON: Confidence-aware speculative decoding with adaptive token trees, 2026b.

Qitan Lv, Tianyu Liu, Wen Wu, Xuenan Xu, Bowen Zhou, Feng Wu, and Chao Zhang. HIPPO: Accelerating video large language models inference via holistic-aware parallel speculative decoding, 2026.

Xupeng Miao, Gabriele Oliaro, Zhihao Zhang, Xinhao Cheng, Zeyu Wang, Zhengxin Zhang, Rae Ying Yee Wong, Alan Zhu, Lijie Yang, Xiaoxiang Shi, Chunan Shi, Zhuoming Chen, Daiyaan Arfeen, Reyna Abhyankar, and Zhihao Jia. SpecInfer: Accelerating large language model serving with tree-based speculative inference and verification. In Proceedings of the 29th ACM International Conference on Architectural Support for Programming Languages and Operating Systems, Volume 3, ASPLOS '24, pp. 932–949, New York, NY, USA, 2024. Association for Computing Machinery.

Qwen Team, An Yang, Anfeng Li, Baosong Yang, Beichen Zhang, Binyuan Hui, Bo Zheng, Bowen Yu, Chang Gao, Chengen Huang, Chenxu Lv, Chujie Zheng, Dayiheng Liu, Fan Zhou, Fei Huang, Feng Hu, Hao Ge, Haoran Wei, Huan Lin, Jialong Tang, Jian Yang, Jianhong Tu, Jianwei Zhang, Jianxin Yang, Jiaxi Yang, Jing Zhou, Jingren Zhou, Junyang Lin, Kai Dang, Keqin Bao, Kexin Yang, Le Yu, Lianghao Deng, Mei Li, Mingfeng Xue, Mingze Li, Pei Zhang, Peng Wang, Qin Zhu, Rui Men, Ruize Gao, Shixuan Liu, Shuang Luo, Tianhao Li, Tianyi Tang, Wenbiao Yin, Xingzhang Ren, Xinyu Wang, Xinyu Zhang, Xuancheng Ren, Yang Fan, Yang Su, Yichang Zhang, Yinger Zhang, Yu Wan, Yuqiong Liu, Zekun Wang, Zeyu Cui, Zhenru Zhang, Zhipeng Zhou, and Zihan Qiu. Qwen3 technical report, 2025.

ShareGPT. ShareGPT. https://huggingface.co/datasets/Aeala/ShareGPT_Vicuna_unfiltered, 2023.

Yuhao Shen, Tianyu Liu, Junyi Shen, Jinyang Wu, Quan Kong, Li Huan, and Cong Wang. Double: Breaking the acceleration limit via double retrieval speculative parallelism, 2026a.

Yuhao Shen, Junyi Shen, Quan Kong, Tianyu Liu, Yao Lu, and Cong Wang. SpecBranch: Speculative decoding via hybrid drafting and rollback-aware branch parallelism, 2026b.

Mingbo Song, Heming Xia, Jun Zhang, Chak Tou Leong, Qiancheng Xu, Wenjie Li, and Sujian Li. KNN-SSD: Enabling dynamic self-speculative decoding via nearest neighbor layer set optimization. In Findings of the Association for Computational Linguistics: EACL 2026, pp. 641–655, Rabat, Morocco, March 2026. Association for Computational Linguistics.

Heming Xia, Zhe Yang, Qingxiu Dong, Peiyi Wang, Yongqi Li, Tao Ge, Tianyu Liu, Wenjie Li, and Zhifang Sui. Unlocking efficiency in large language model inference: A comprehensive survey of speculative decoding. arXiv preprint arXiv:2401.07851, 2024.

Heming Xia, Yongqi Li, Jun Zhang, Cunxiao Du, and Wenjie Li. SWIFT: On-the-fly self-speculative decoding for LLM inference acceleration, 2025.

Penghui Yang, Cunxiao Du, Fengzhuo Zhang, Haonan Wang, Tianyu Pang, Chao Du, and Bo An. LongSpec: Long-context lossless speculative decoding with efficient drafting and verification, 2026. Accepted to ACL 2026.

Jun Zhang, Jue Wang, Huan Li, Lidan Shou, Ke Chen, Gang Chen, and Sharad Mehrotra. Draft&Verify: Lossless large language model acceleration via self-speculative decoding. In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), pp. 11263–11282. Association for Computational Linguistics, 2024.

Lefan Zhang, Xiaodan Wang, Yanhua Huang, and Ruiwen Xu. Learning harmonized representations for speculative sampling. In The Thirteenth International Conference on Learning Representations, 2025.

---

## 附录A：训练细节

所有草稿模型使用EAGLE-3（Li et al., 2025c）的自回归测试时训练（TTT）目标进行训练。始终使用Qwen3-8B（Qwen Team et al., 2025）作为目标模型。

<strong>目标KV层。</strong> 除非另有说明，KVShot测试平台从 \(L_s = 3\) 个均匀分布的目标层采样KV缓存，匹配EAGLE-3融合的层数。附录D显示改变这一选择影响可忽略。

<strong>数据。</strong> 消融实验（第3.2-3.4节）在ShareGPT（∼70k样本，3个epoch）上训练。端到端评估（第3.5节）扩展到280k样本（ShareGPT + UltraChat），响应由目标模型重新生成以确保分布对齐。

<strong>评估。</strong> 我们在留出子集上计算步进接受率 \(\alpha_k\)。使用HuggingFace投机解码流程（草稿树配置(8, 10, 60)）测量端到端MAT。

## 附录B：门控KV融合：架构细节

<strong>输入表示。</strong> 每个草稿token的输入 \(x_i \in \mathbb{R}^d\) 遵循EAGLE-3构造：输入嵌入和目标隐藏状态被拼接并投影。我们不修改此输入路径；所有更改都限制在单草稿层内的注意力子模块中。

<strong>跨注意力记忆。</strong> 跨注意力分支在每个起草步关注不同的混合记忆 \(M_i\)。对于已验证前缀token（\(j \leq t\)），\(M_i\) 包含直接从目标模型复制的KV对。对于后续草稿位置（\(j > t\)），草稿模型通过学习的投影 \(W_K^{\text{cross}}\) 和 \(W_V^{\text{cross}}\) 生成自己的KV。此设计镜像标准自回归KV缓存结构：前缀部分是"免费的"（无需估计），而草稿生成的键和值必须学习。

<strong>为什么是门控delta而非直接求和？</strong> 天真的残差组合 \(h_i = n_i + o_i\) 允许跨注意力分支覆盖自注意力输出，可能破坏EAGLE-3路径提供的短程准确率。门控delta公式（公式8-9）反而将跨注意力输出视为校正：首先通过 \(W_\Delta\) 投影差异 \(\Delta_i = o_i - n_i\)，然后通过学习门 \(g_i \in [0, 1]^d\) 进行逐元素缩放。当 \(g_i \approx 0\) 时，输出坍缩到自注意力路径；跨注意力分支仅在门控认为校正有益的地方做出贡献。

<strong>共享门控。</strong> 门控参数 \(W_g \in \mathbb{R}^{d \times 3d}\) 和 \(b_g \in \mathbb{R}^d\) 在所有起草步上共享。我们选择共享门控而非per-step门控有两个原因：(1)此阶段的主要问题是门控delta机制是否有效，而非per-step门控是否进一步改进；(2)共享减少了参数数量并稳定了训练，这在跨注意力分支随机初始化时很重要。

<strong>从EAGLE-3检查点初始化。</strong> 当从预训练EAGLE-3检查点热启动时，自注意力分支和所有共享模块（输入投影、MLP、层归一化）直接加载现有权重。新添加的跨注意力投影（\(W_Q^{\text{cross}}, W_K^{\text{cross}}, W_V^{\text{cross}}, W_O^{\text{cross}}\)）、门控（\(W_g, b_g\)）和delta投影（\(W_\Delta\)）随机初始化。这允许模型从强自注意力锚点开始训练，同时逐步学习跨注意力校正。

对于表3中的Cross-only变体，EAGLE-3检查点设置使用相同的热启动方案：继承的查询/键/值/输出投影和MLP从EAGLE-3检查点加载，但在前向传递中完全移除自注意力输出 \(n_i\)，使 \(h_i\) 仅依赖于跨注意力分支。这将隐藏状态路径的贡献与初始化选择隔离。

## 附录C：完整步进接受率

主文中的表1-3报告代表性检查点而非完整7步曲线。表5提供了主文所有实验的完整7步接受率（\(\alpha_0\) 到 \(\alpha_6\)）。

完整曲线使两种模式更清晰。首先，Gated KV (ckpt)模型的衰减曲线在每一步都统一高于EAGLE-3基线，表明改进不集中于单个步。其次，Head concat变体在早期步衰减明显更快（\(\alpha_1\)：0.393 vs 0.425），表明跨 \(L_s\) 个不相交KV空间 attend的困难立即显现，而非仅在长程才出现。

## 附录D：额外消融

表6收集了正文中引用但从主表中省略的消融实验。所有行使用2层纯KV草稿模型（线性投影和RoPE重新应用）作为基线（第3.3节）。

<strong>目标KV配置。</strong> 将采样目标层数从3增加到4仅产生边际增益（MAT 2.24 vs 2.23），表明草稿模型的瓶颈在于查询估计而非KV输入的丰富度。

<strong>投影仪架构。</strong> 用两层MLP替换线性投影仪（有无LayerNorm）略微损害性能（MAT 2.20和2.19 vs 2.23）。增加的表达能力不能抵消优化难度，与第4.2节的稀疏梯度分析一致。一个更有说明性的变体——将目标隐藏状态投影到KV空间而非直接复用预计算KV对——产生显著较低的MAT（2.04），表明预计算KV表示本身很重要。

<strong>训练制度。</strong> 从在线TTT切换到离线训练——即以目标隐藏状态为条件但没有自回归漂移对齐——将MAT从2.23降低到2.18，表明TTT的漂移对齐即使对基于KV的草稿模型也有好处。将KV投影梯度缩放50×仅恢复差距的一小部分（MAT 2.21），强化了第4.2节的结论：核心问题是训练信号多样性，而非梯度幅度。QK-Norm没有产生可测量的变化（MAT 2.23）。
