---
title: 推测解码技术演进
date: "2026-07-10 10:01:27"
updated: "2026-07-10 10:01:27"
layout: post
permalink: /collections/wechat/推测解码技术演进-Medusa到JetSpec/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 推测解码技术演进

<strong>作者</strong>: 青稞AI
<strong>原始链接</strong>: https://mp.weixin.qq.com/s/tuACi4VhtoVMRSjqXmjALA
<strong>知乎原文</strong>: https://zhuanlan.zhihu.com/p/2055675996611912757

---

主页：http://qingkeai.online/

 

作者：橘子bro

https://zhuanlan.zhihu.com/p/2055675996611912757

 

 

推测解码（Speculative Decoding）技术的局部演进,本文梳理了从 Medusa 到 DSpark、JetSpec 七篇核心推测解码论文的发展脉络，分析每篇论文的洞察、创新与效果。

脉络概览 （究极速通）

1.

原始推测解码的核心困境在于

：难以找到合适的 draft model——它本身就是一个参数量不小的 Transformer 模型，训练成本高、与 target model 存在分布偏移、多模型部署复杂。

2.

Medusa的解决思路是

：彻底去掉独立draft model，在LLM顶部附加多个轻量MLP预测头并行预测后续token，并提出Tree-Attention 机制同时验证多条候选链路。缺陷在于：每个预测头独立工作，忽略了位置间的依赖关系，预测精度有限（约0.6），且随预测距离增加精度急剧下降。

3.

EAGLE-1的洞察是

：特征层本身已隐含大量未来token的信息，应该被利用起来。因此引入目标模型的 second-to-top-layer 特征作为条件，基于轻量 Transformer Decoder 设计预测头，并用静态树并行验证。缺陷在于：假设所有上下文的接受率只与位置有关，使用固定形状的验证树，造成低概率分支的算力浪费。

4.

EAGLE-2发现

：不同链路被接受的概率天差地别，静态树会浪费大量算力在低概率分支上。因此用动态树替代静态树：根据draft model的置信度分数动态决定每层的扩展数量，剪掉低概率预测。缺陷在于：仍然依赖特征级预测，受限于特征预测的约束，难以从扩大训练数据中受益。

5.

EAGLE-3 的核心发现是

：EAGLE-1/2 为了让预测头输出拟合 token 的特征分布，在训练时用损失函数约束输出，但这反而限制了预测头的表达力，锁死性能上限。因此去掉了对特征分布的数值约束，改为直接预测 token；同时通过融合 Transformer 多层之间的特征数据来弥补中间信息的缺失，并引入Training-Time Test 解决训练-推理不一致的问题。

6.

DFlash 跳出了"自回归 drafting"的范式

：之前的 draft model（包括 EAGLE 系列）本质仍是自回归的，必须逐步生成 draft token，是延迟瓶颈。DFlash 用一个 Block Diffusion 模型直接在单次前向传播中并行解码16个token，从根本上消除了串行依赖。缺陷在于：Block内所有token完全并行预测，缺乏位置间依赖的建模。

7.

DSpark认为DFlash 太极端了

——完全并行的 block 内没有任何位置信息传递，导致质量受限。DSpark的折中方案是：先用扩散模型并行解码一个block内的多个token，只在最后LM Head层使用自回归解码（Markov Head）来弥补位置信息的缺失，在draft速度和质量之间做了trade-off。

8.

JetSpec同样认为DFlash太极端

，但它没有走 DSpark 的半自回归路线，而是另辟蹊径：用一个因果掩码（Tree-Causal Mask）在单次前向传播中并行预测所有树节点，同时让每个节点的分布都基于其祖先路径条件化。这样既不破坏并行计算的效率，又弥补了位置信息的缺失，在 draft 速度和因果质量之间实现了两全。

9.

背景与问题

大语言模型采用自回归解码（Autoregressive Decoding），每一步生成都依赖前一步的输出。这带来两个根本问题：

• 1.

计算效率低下

：每次前向传播只生成一个 token，需要将完整模型参数从 HBM 搬到缓存，GPU 算力严重闲置（memory-bound）。

• 2.

难以并行

：token 间的串行依赖从根本上限制了推理速度。

推测解码（Speculative Decoding）的核心思想是"先猜后验"：用一个快速的 draft model 猜测一段 token 序列，然后用原始大模型一次性并行验证，从而在保持输出分布不变的前提下减少解码步数。

Medusa：去掉独立 Draft Model

论文: Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads 

作者: Tianle Cai, Yuhong Li, Zhengyang Geng 等 

时间: 2024.01  

arXiv: 2401.10774

洞察

传统推测解码依赖一个独立的 draft model（小模型），但：

• 预训练小模型成本高昂（如 TinyLLaMA 需 3000B tokens）

• draft model 与 target model 之间存在分布偏移

• 多模型部署在分布式环境中复杂度极高

创新

不引入独立 draft model，而是在原始 LLM 顶部"长"出多个预测头。

• 

Medusa Heads

：在 LLM 最后一层隐藏状态上叠加 K 个轻量解码头（单层 FFN + 残差连接），第 k 个头负责预测第 (t+k+1) 个 token。 ----预测头非常轻量级！！！

• 

Tree Attention

：每个 head 取 top-s 预测，通过笛卡尔积构建候选树，用改造的 attention mask 并行验证所有候选路径。 ----并行验证多条链路！！！

• 

Typical Acceptance

：放弃 rejection sampling，改用原始模型自身的概率阈值筛选"合理"候选，无条件接受第一个 token，后续 token 根据阈值决定是否接受。

两种训练策略

策略

训练方式

加速比

适用场景

Medusa-1

冻结 backbone，只训练 heads

~2.2x

资源有限、即插即用

Medusa-2

联合训练 backbone + heads

2.3-3.6x

有算力、追求极致速度

效果

• Vicuna-7B/13B/33B 上实现 2.3x-2.8x 加速

• 生成质量无损（使用 rejection sampling 时）

• 支持 Self-Distillation：无训练数据时用模型自身生成数据

局限

• Medusa Heads 的预测精度有限（约 0.6），因为每个 head 独立预测，忽略了位置间的依赖关系

• 随着预测距离增加，精度急剧下降

EAGLE：在特征层做推测

论文: EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty 

作者: Yuhui Li, Fangyun Wei, Chao Zhang, Hongyang Zhang 

时间: 2024.01

arXiv: 2401.15077

洞察

两个关键观察：

1.

特征级自回归比token级更简单

：token是离散的自然语言符号，而 second-to-top-layer 的特征是连续向量，规律性更强。在特征层做自回归预测比直接预测 token 更准确。

2.

采样引入的不确定性约束了性能

：token采样的随机性导致后续特征序列存在歧义。例如 "I" 后面可能是 "am" 也可能是 "always"，对应的特征序列完全不同。Medusa在预测t+2位置时，不确定 t+1 位置的真实目标是什么。

创新

在特征层做自回归预测，并用"提前一个时间步的 token"消除不确定性。

Draft Model结构

：Embedding层+单层 Transformer Decoder +LMHead

• Embedding 和 LM Head

直接复用

目标模型的参数（不训练）

• 只训练一个轻量的 Autoregression Head（对 70B 模型仅 0.99B 参数）

输入

：特征序列 (f₁, f₂, ..., fₜ) +

提前一步的 token 序列

 (t₂, t₃, ..., tₜ₊₁)

• 提前的 token 包含了采样结果，消除了特征预测的歧义

训练损失

：Smooth L1回归损失（预测特征+Cross-Entropy 分类损失（预测 token），权重比约0.1:1

数据增强

：训练时对特征添加均匀噪声(-0.1, 0.1)，缓解推理时的误差累积

效果

模型

温度=0 加速比

温度=1 加速比

平均接受长度

Vicuna 7B

3.33x

2.39x

4.29

Vicuna 13B

3.58x

2.65x

4.39

Vicuna 33B

3.67x

2.76x

4.28

LLaMA2-Chat 70B

3.52x

2.92x

4.42

• 训练成本极低：70B 模型用 4×A100 训练 1-2 天，仅需 2-4B tokens

• 与 gpt-fast 结合，LLaMA2-Chat 7B 在单张 RTX 3090 达到 160.4 tokens/s

• 输出分布理论保证不变（lossless）

局限

• 使用

静态 draft tree

，假设接受率只与位置有关

• 仅复用

顶层特征

，信息量受限

• 特征预测约束了模型表达力，难以从扩大训练数据中受益

EAGLE-2：上下文感知的动态 Draft Tree

论文: EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees

作者: Yuhui Li, Fangyun Wei, Chao Zhang, Hongyang Zhang

时间: 2024.06

arXiv: 2406.16858

洞察

EAGLE和Medusa都使用

静态draft tree

（每层的branching factor固定），隐含假设：draft token的接受率只与其在树中的位置有关。

但实验发现：

• 

接受率高度依赖上下文

：同一位置在不同 query 下的接受率差异巨大（方差可达 0.3 以上）

• 有些 token 很简单（如 "10+2=" 后面的 "1"），不需要多个候选；有些 token 很难，需要更多分支

创新

利用 draft model 的置信度估计接受率，动态调整 draft tree 形状。

• 

发现 Draft Model 是 Well-Calibrated 的

：draft model 输出的置信度（概率）与实际接受率高度正相关（置信度 &gt;0.95 的 token 接受率约 0.98）

• 

Expansion Phase

：在每一层选择全局接受概率（value = 路径上所有节点置信度的乘积）最高的 top-k 个节点进行扩展

• 

Reranking Phase

：扩展后重排所有节点，选择 value 最高的 top-m 个形成最终 draft。由于置信度 ∈ [0,1]，深层节点的 value 天然更小，浅层高置信度节点会被优先保留。

效果

模型

EAGLE 加速比

EAGLE-2 加速比

提升

Vicuna 7B

2.90x

3.62x

0.25

Vicuna 13B

3.07x

4.26x

0.39

LLaMA2-Chat 7B

2.78x

3.43x

0.23

LLaMA2-Chat 70B

3.01x

3.51x

0.17

• 平均接受长度从 

3.9 提升到 

4.7

• 

无需额外训练

：直接复用 EAGLE 的 draft model，仅改变推理时的树构造策略

局限

• 仍然依赖特征级预测，受限于特征预测的约束

• 树结构的调整是局部的（按层扩展），非全局最优

EAGLE-3：突破特征预测的瓶颈

论文: EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test

作者: Yuhui Li, Fangyun Wei, Chao Zhang, Hongyang Zhang

时间: 2025.03

arXiv: 2503.01840

洞察

LLM社区的趋势是扩大训练数据以提升模型能力而不增加推理成本。但 EAGLE 面临一个关键瓶颈：增加训练数据对 EAGLE 的改进极为有限。---即，eagle1、2为了拟合特征分布，预测头的上限锁死

原因分析：

• EAGLE 的损失函数包含特征预测损失（L_fea）和 token 预测损失（L_token）

• 特征预测作为

中间约束

，限制了 draft model 的表达力

• 即使数据量增加，模型仍需"分心"去拟合特征，无法全力优化 token 预测

创新

两个核心架构变革：

5.1 放弃特征预测，直接预测 token

• 移除特征预测损失（L_fea），只保留 token 预测损失

• Draft model 的输出不再需要拟合目标模型的顶层特征，而是直接预测下一个 token 的分布

5.2 Training-Time Test

放弃特征预测带来新问题：推理时 draft model 的输入可能是自身上一轮的预测输出（â），而非目标模型的真实特征（f）。训练时若只用真实特征，会导致训练-推理不一致。

解决方案

：训练时模拟推理过程——第一轮用真实特征，后续轮次用 draft model 自身的预测输出作为输入。

训练 Step 1: 输入 = [f₁, f₂, ..., fₜ, e(t₁)] → 预测 âₜ₊₁

训练 Step 2: 输入 = [f₁, f₂, ..., fₜ, âₜ₊₁, e(t₂)] → 预测 âₜ₊₂

...

5.3 多层特征融合

不再仅依赖顶层特征，而是融合目标模型的低、中、高层特征：

• 从目标模型的多个层（如 5 层均匀采样）提取隐藏状态

• 拼接后通过 FC 层降维，得到融合特征 g

• 融合特征包含更丰富的语义信息

效果

模型

EAGLE-2

EAGLE-3

提升

Vicuna 13B

4.26x

5.58x

0.31

LLaMA3.1 8B

3.16x

4.40x

0.39

LLaMA3.3 70B

2.83x

4.11x

0.45

DeepSeek-R1-Distill 8B

2.92x

4.05x

0.39

• 

发现 Scaling Law

：训练数据量增加 → 加速比持续提升（EAGLE-3 用 8x 数据训练）

• HumanEval 上最高达到 

6.47x

 加速，平均接受长度 7.54 tokens

• 在 SGLang 框架 batch_size=64 时仍提升 

38%

 吞吐量

• 在 vLLM 框架 batch_size=56 时仍有 

1.01x

 吞吐提升

DFlash：用扩散模型打破串行瓶颈

论文: DFlash: Block Diffusion for Flash Speculative Decoding

作者: Jian Chen, Yesheng Liang, Zhijian Liu 

时间: 2026.02

arXiv: 2602.06036

ICML 2026

洞察

现有推测解码方法（包括 EAGLE 系列）的 draft model 仍然是

自回归的

——必须逐步生成 draft tokens。这带来根本矛盾：--没有解决 draft模型 仍然是 自回归模型 的痛点

• 要加速比高 → 需要更多 draft tokens → 自回归 draft 时间线性增长

• 要 draft 时间短 → 模型必须很浅 → 预测精度低 → 接受率下降

扩散模型天然支持并行生成

：可以在单次前向传播中同时去噪所有位置。

创新

用 Block Diffusion 模型替代自回归模型作为 draft model。

6.1 推理流程

1.目标模型 prefill 后，提取多层隐藏状态 → 投影融合为 context feature

2.Draft model（5层Transformer）在单次前向中

并行预测一个 block（16 个）的 masked tokens

3.目标模型并行验证整个 block

4.接受前缀后，继续下一个 block

6.2 KV Injection

关键设计：将目标模型的 context feature 

注入 draft model 每一层的 KV cache

（而非仅作为初始输入）。

• 随着 draft model 深度增加，context 信息不会衰减

• 接受长度可以随 draft 层数增加而有效扩展

6.3 训练策略

• 

随机Anchor采样

：从response 中随机选 anchor token 作为 block 起点，直接匹配推理行为

• 

Sparse Attention Mask

：block内双向注意力+block间无注意力，支持多个block联合训练

• 

Loss 衰减

：对block内位置 k 施加 exp(-(k-1)/γ) 的权重，强调靠前的 token（错误会传播）

• 共享目标模型的 Embedding和LM Head（冻结），只训练draft Transformer 层

效果

模型

EAGLE-3 (tree=60)

DFlash (block=16)

DFlash 提升

Qwen3-4B

2.08x

4.91x

2.36x

Qwen3-8B

2.02x

4.86x

2.41x

LLaMA3.1-8B (SGLang)

1.9x

2.4x

2.6x

• 在 SGLang 中 concurrency=1 时最高 

5.1x

 加速

• 即使在 concurrency=32 时仍保持 

2.2x-3.1x

 加速

• 支持长上下文适配：4K 训练的模型经微调后可扩展到 32K

局限

• Block size 是固定的，不够灵活

• 扩散模型的训练收敛可能比自回归模型慢

• 需要存储目标模型的隐藏状态（存储开销）

DSpark：半自回归 + 置信度调度

论文: DSpark: Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation

作者: DeepSeek & 北京大学 

时间: 2026.06 

链接: http://github.com/deepseek-ai/DeepSpec

洞察

推测解码领域存在两种范式：

• 

自回归式

（EAGLE 系列）：draft 质量高但串行，延迟大

• 

全并行式

（DFlash）：延迟低但 block 内 token 间无依赖建模 ----大白话：缺乏位置信息

能否结合两者优势？

Block间自回归（保证质量），block内并行（保证速度）。

创新

7.1 半自回归 Block 结构

• 将 draft 序列分成多个 block（如 block_size=7）

• Block 间自回归：block i 依赖 block i-1 的输出

• Block 内并行：一个 block 内的所有 token 同时预测

7.2 Markov Head

在标准Transformer backbone之上，引入

Markov Head

建模 block 内的条件依赖关系：

类型

机制

特点

Vanilla Markov

基于上一个 token 的 embedding 加偏置

简单高效，无状态

Gated Markov

用 backbone 隐藏状态门控偏置

自适应调节

RNN Head

GRU 循环状态跨位置传递

最强表达力，可捕获长程依赖

Markov Head 的输出作为 logits 偏置叠加到 backbone 的 logits 上：

final_logits[k]=backbone_logits[k] + markov_bias(token_{k-1}, hidden_state_k)

7.3 Confidence Head

预测每个 draft token 的接受率，用于：

• 验证时的优先级排序

• 提前终止低置信度分支

• 动态调整 block 大小

7.4 训练设计

• 从目标模型提取 5 层隐藏状态（均匀分布在浅层到深层），拼接融合

• 损失函数：CE Loss（权重 0.1）+ L1 Loss（权重 0.9）+ Loss Decay

• 支持多种目标模型（Qwen3 系列、Gemma4 系列等）

效果

• 在 DeepSeek-V4-Flash/Pro 上实现 

57%-85%

 加速

• 与 EAGLE-3 和 DFlash 互补，是 DeepSpec 框架中的三种可选算法

• 开源了完整的训练和评估框架（数据准备 → 训练 → 评测）

HyperDFlash：面向 Hyper-Connection 架构的 DFlash 适配

论文: HyperDFlash: Hyper-Connection-Aligned Block Speculative Decoding with Gated Residual Reduction

作者: Luxi Lin, Shuang Peng, Rui Ma 等 (ByteDance) 

时间: 2026.06

arXiv: 2606.26744

与主脉络的关系HyperDFlash并非方法论层面的范式创新，而是 

DFlash 在 DeepSeek-V4 特殊架构上的深度适配

。它解决的核心矛盾是：通用block-parallel drafting框架与Hyper-Connection (HC) 多路径残差流之间的

架构失配

。

说人话：DS-v4模型的hidden states是4个向量，而推测解码都是基于普通模型（hidden states是1个向量），因此这篇论文就是聚合 4 个向量，变成 1个向量，适配推测解码。

因此它不属于"Medusa→EAGLE→DFlash→DSpark"的主演进线，而是代表了一个重要的支线方向：

面向特定模型架构的推测解码适配优化

。

背景：DeepSeek-V4 的两大特性，DeepSeek-V4 引入了两个对推测解码有深远影响的架构设计：

1.

Hyper-Connections (HC)

 :每个token由m条并行残差路径表示（而非单一隐藏状态），预测前通过 

hc_head

 模块将多路径聚合为单向量送入LM Head。这种输入依赖的门控聚合机制（sigmoid per-path gating）与传统的静态线性投影本质不同。

2.

Multi-Token Prediction (MTP)

：原生支持多 token 预测，可直接用作 draft module。但 MTP 是

自回归式

的——后续位置依赖前面位置的预测输出，导致误差累积，接受率随位置急剧下降（Figure 1：位置 1 接受率 &gt;0.9，位置 6 降至 ~0.3）。

洞察

将 DFlash 直接迁移到 DeepSeek-V4 面临两个架构失配：

1.

条件信号错位

：DFlash 使用中间层特征拼接作为条件，但 HC 架构中中间层特征尚未经过多路径聚合，与最终预测路径不一致。

2.

路径压缩失效

：DFlash 使用通用线性投影（fc:ℝ^{md} → ℝ^d，约 67M 参数）压缩多路径残差，但目标模型的 

hc_head

 使用的是

输入依赖的门控聚合

（每个路径独立的 sigmoid 门），静态线性映射无法表达这种非线性、输入依赖的行为。

创新

8.1 Pre-Collapse Residual Conditioning（预坍缩残差条件）

不使用中间层特征，而是复用目标模型最终层的 pre-collapse HC 残差状态

（即 

hc_head

 的输入，也是 MTP 模块的 source）。

• 保留了完整的多路径结构信息

• 与目标模型预测路径严格对齐

• 无需额外计算（MTP 推理时已存储）

8.2 Inherited HC-Gate Reducer（继承式门控降维器）

核心设计：

用与目标模型 

hc_head

 相同函数形式的门控聚合替代通用线性投影

。

目标模型 hc_head 的聚合方式（DeepSeek-V4）:

x̃ = RMSNorm(vec(H)) # H 是 m 条路径的拼接

α = σ(W_f · x̃ + b) # 每条路径一个 sigmoid 门

y = Σ α_j · H_j # 加权求和

HyperDFlash 的 Reducer 采用完全相同的形式，且

参数从目标模型的 

hc_head

 权重初始化

：

设计

通用 fc Reducer

Inherited HC-Gate Reducer

坍缩机制

稠密线性投影

门控路径聚合

可训练参数

67M

65K（减少 1000x）

权重初始化

随机

继承自目标模型

目标对齐

从零学习

天然对齐

8.3 LM-Head KL Distillation（早期位置 KL 蒸馏）

在标准 CE 损失之外，对 block 内前 P 个位置（P=2）添加 KL 蒸馏损失：

• 

Teacher

：目标模型 LM Head 在 ground-truth 隐藏状态上的输出分布

• 

Student

：Draft model 的 logits

• 

仅作用于前 2 个位置

：因为位置 k≥2 时，teacher 看到的中间 token 是 ground-truth，而 student 看到的是 mask token，条件不一致，强行匹配会产生高方差梯度

效果

在DeepSeek-V4-Flash上的结果（Non-thinking, Temperature=0）：

方法

平均接受长度 τ

平均加速比

MTP (3)

2.93

2.25x

MTP (6)

3.08

1.76x

Vanilla DFlash (6)

2.14

1.73x

HyperDFlash (6)

3.69

2.80x

关键发现：

• 

Vanilla DFlash 在 DeepSeek-V4 上表现不佳

（1.73x），甚至不如 MTP (3)（2.25x），说明通用设计无法直接迁移

• 

HyperDFlash 恢复并超越了 DFlash 的设计优势

，比 MTP (3) 提升 25% 加速比

• 在 Think-high 模式下同样有效（2.53x vs MTP 2.11x）

• 参数效率极高：Reducer 仅 65K 参数（vs 通用方案的 67M）

启示

HyperDFlash揭示了一个重要趋势：

随着LLM架构日益多样化（HC、MTP、MoE 等），推测解码框架需要与目标模型的架构特性深度对齐

，通用方案可能因架构失配而失效。这代表了一个新的研究方向——架构感知的推测解码设计。

JetSpec：打破"因果-效率"困境

论文: JetSpec: Breaking the Scaling Ceiling of Speculative Decoding with Parallel Tree Drafting

作者: Lanxiang Hu, Zhaoxiang Feng, Yulun Wu 等 (UC San Diego) 

时间: 2026.06 

arXiv: 2606.18394

洞察

前面的方法陷入了一个因果-效率困境（causality-efficiency dilemma）：

• 

自回归式 draft

（EAGLE 系列）：每个 token 都基于前面已选 token 条件化（path-conditioned），候选质量高，但 draft 成本随树深度线性增长

• 

全并行 draft

（DFlash）：一次前向生成所有 token，成本极低，但各位置独立预测，缺乏分支内因果条件——不同分支的 token 单独看都合理，组合在一起却互相矛盾（individually plausible yet mutually inconsistent），浪费验证预算

能否同时获得高效率和高因果性？

 即在单次前向传播中并行预测所有树节点，同时保证每个节点的分布都基于其祖先路径条件化。

创新

因果并行预测头（Causal Parallel Draft Head）+ Tree-Causal Attention Mask。

9.1 核心架构

JetSpec是一个 head-based 框架，从冻结的目标模型提取融合隐藏状态，用一个带

Tree-Causal Attention Mask

的Transformer预测头，在

单次前向传播

中并行预测所有树节点的logits。

关键设计——

Tree-Causal Mask

：每个树节点可以attend到原始前缀和它的所有祖先节点，但不能attend到后代或无关的兄弟分支：

这保证了每个节点的分布

都基于其

具体祖先路径

条件化，而非独立的per-position 分布。

9.2 为什么因果性如此重要

对于一条候选分支

，如果没有因果条件化，树构造依据的是一个"伪分布"：

 ← 各位置独立

而 JetSpec 产生的是分支条件化分布：

←每个节点基于祖先

后者与目标模型的自回归分解

 对齐，使得更大的draft budget能有效转化为更长的接受前缀。

9.3 训练：Forward KL 蒸馏

采用 

Forward KL 蒸馏

（而非硬标签 SFT）作为训练目标：

²

• Forward KL 鼓励 draft 分布覆盖目标模型的概率质量，保留软标签信息

• 实验发现 Reverse KL 表现差（过于 mode-seeking），Forward KL 略优于硬标签 SFT

• 从目标模型生成训练序列（on-policy distillation），在 anchor 位置构建训练 block

9.4 Parallel Tree Drafting+Verification

• 

Drafting

：单次前向获取所有深度的 logits → 每层取 top-W → 基于累积 log-probability 评分进行 best-best 扩展 → 填充至 budget B

• 

Verification

：目标模型用 tree attention 并行验证所有节点 → 沿每条分支应用 speculative sampling 接受规则

效果

低预算区间（budget=16）

：JetSpec 与 DFlash 表现接近，说明短线性 draft 已足够覆盖大多数高概率续写。

高预算区间（budget=256, Qwen3-8B, Temperature=0)

 ：

方法

MATH-500

GSM8K

MT-Bench

EAGLE-3

2.36x

2.53x

2.19x

DDTree

8.78x

7.04x

4.26x

JetSpec

9.64x

7.82x

4.58x

• MATH-500 上平均接受长度 τ=10.76，远超 DDTree 的 9.81

• 在 vLLM 中 batch_size=1 时达到 

6.75x

 吞吐提升

• 

Budget 越大，JetSpec 优势越明显

——打破了推测解码的 scaling ceiling

1.技术演进总结

核心指标对比

方法

Draft 类型

并行度

最高加速

训练参数量

训练数据量

标准推测解码

自回归小模型

无

~2x

独立预训练

极大

Medusa

MLP Heads

树状

~3.6x

K 个 FFN

~60K samples

EAGLE-1

特征级自回归

树状

~3.5x

&lt;1B

2-4B tokens

EAGLE-2

特征级自回归

动态树

~4.3x

&lt;1B (复用)

2-4B tokens

EAGLE-3

Token 级自回归

动态树

~6.5x

&lt;1B

~8x EAGLE

DFlash

Block Diffusion

全并行

~6x+

5 层 Transformer

~800K samples

DSpark

半自回归 Block

Block 并行

~1.85x

5 层 + Markov

目标模型生成

JetSpec

Causal Parallel Head

全并行 + 因果

~9.64x

多层 Transformer Head

~780K samples

HyperDFlash

Block Diffusion + HC 适配

全并行

~2.8x (DeepSeek-V4)

5 层 + 65K Reducer

~450K samples

关键洞察演进

洞察

方法

效果

1

不需要独立 draft model

Medusa

简化部署

2

特征级预测 &gt; token 级预测

EAGLE

精度 0.6 → 0.8

3

采样不确定性约束性能

EAGLE

引入 shifted token

4

接受率依赖上下文

EAGLE-2

动态树替代静态树

5

特征预测约束表达力

EAGLE-3

发现 scaling law

6

顶层特征不够

EAGLE-3

多层特征融合

7

自回归 drafting 是瓶颈

DFlash

扩散模型全并行

8

Block 内可建模依赖

DSpark

半自回归 + Markov Head

9

并行与因果可以统一

JetSpec

Tree-Causal Mask + Forward KL 蒸馏

10

架构失配使通用 draft 失效

HyperDFlash

继承式门控降维 + 预坍缩残差

参考文献

1. Cai et al. "Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads." arXiv:2401.10774, 2024.

2. Li et al. "EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty." arXiv:2401.15077, 2024.

3. Li et al. "EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees." arXiv:2406.16858, 2024.

4. Li et al. "EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test." arXiv:2503.01840, 2025.

5. Chen et al. "DFlash: Block Diffusion for Flash Speculative Decoding." arXiv:2602.06036, 2026. (ICML 2026)

6. DeepSeek AI. "DSpark: Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation." DeepSpec Technical Report, 2026.

7. Lin et al. "HyperDFlash: Hyper-Connection-Aligned Block Speculative Decoding with Gated Residual Reduction." arXiv:2606.26744, 2026.

 

往期推荐

高德最新开源 ABot-M0.5: 统一移动操作的世界-动作模型

OPD 的 token 加权真的合理吗？也许早期 token 才是关键，均匀加权全错了！

当异步 Agentic RL 遇到“旧策略失忆”：重新理解 Off-Policy Correction

ICML 2026｜让 Agent 真正协同作战：GoS 为多智能体推理构建共享信念状态

 

加入青稞AI技术交流群

 

加入青稞AI技术交流群，不仅能与来自

MIT、港中文、CMU、UCLA、斯坦福、清华、阿里、腾讯

等名校名企AI研究员/开发者一起进行技术交流，同时还有一线青年AI研究员/开发者的

Talk分享

、

青稞Tea

、

论文精读

、

招聘内推

、

国内外硕/博申请

、

大模型技术报告解读

等。

备注：姓名+学校/公司+方向，暗号"

AI

"优先审核通过!