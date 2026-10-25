---
title: "RL Scaling Laws for LLMs"
date: "2026-04-21 00:37:04"
updated: "2026-04-21 00:37:04"
layout: "post"
permalink: "/collections/0.raw/web/RL-Scaling-Laws-for-LLMs-Cameron-Wolfe/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# RL Scaling Laws for LLMs

> 来源：https://cameronrwolfe.substack.com/p/rl-scaling-laws
> 作者：Cameron R. Wolfe, Ph.D.
> 发布：2026-04-20
> 标签：#RL #ScalingLaws #LLM #GRPO #Reasoning

---

## 概述

本文综述了 LLM 的强化学习（RL）缩放定律，从预训练缩放定律的基础知识出发，逐步深入到 RL 训练的缩放特性。核心问题是：如何像预训练那样，为 RL 训练建立可预测的性能-计算关系。

## 预训练缩放定律基础

### 幂律关系

预训练缩放定律基于<strong>逆幂律</strong>：`y = a × (1/x)^p`

两个关键量：
- <strong>x</strong>：计算量 C = 6 × N × D（N=参数量，D=token数）
- <strong>y</strong>：测试损失（交叉熵损失）

### 核心论文

## 1. **Neural Scaling Laws [Kaplan et al., 2020]**

   - 发现性能随模型参数、数据量、计算量平滑提升
   - 在计算受限时，<strong>大模型 + 少数据</strong>（不完全收敛）效果最好

## 2. **Chinchilla [Hoffmann et al., 2022]**

   - 模型参数和数据量应<strong>等比例增加</strong>
   - 之前的大多数模型都<strong>训练不足</strong>

## RL 基础：GRPO 算法

Group Relative Policy Optimization（GRPO）是目前推理模型 RL 训练的主流算法（DeepSeek-R1 使用）。

### 与 PPO 的区别
- <strong>去掉价值模型</strong>：用组内奖励统计量估计优势函数
- 优势计算：`A_i = (r_i - mean) / std`
- 减少 GPU 显存和计算开销

### GRPO 变体

| 变体 | 核心改进 | 解决问题 |
|------|---------|---------|
| <strong>GSPO</strong> | 序列级重要性比率 | token级比率方差过高 |
| <strong>DAPO</strong> | clip higher + 动态采样 + token级loss聚合 | 熵崩溃 + 训练噪声 |
| <strong>Dr. GRPO</strong> | 固定MAX_TOKENS除法 + 去除std | 响应长度偏差 + 问题难度偏差 |
| <strong>TIS</strong> | 截断重要性采样校正引擎差异 | 推理/训练引擎概率不匹配 |
| <strong>CISPO</strong> | 修改裁剪方式，保留所有token梯度贡献 | 重要推理token被clip后丢失 |

## RL 缩放定律研究

### 论文1: The Art of Scaling RL Compute [ScaleRL]

<strong>缩放模型</strong>：S 形曲线（Sigmoidal）

```
Reward Gain = A / [1 + (C_mid/C)^B]
```

- A：渐近性能天花板
- B：计算效率指数
- C_mid：达到中点的计算量

<strong>ScaleRL 配方</strong>：
- CISPO loss + PipelineRL（异步RL）+ 全精度LM head
- 过滤零方差 prompt + 移除通过率>90%的 prompt
- DAPO 风格 loss 聚合

<strong>关键发现</strong>：
- 异步 RL（PipelineRL）效率更高，但需限制异步度（K=8）
- 更长上下文初期慢但最终性能更高
- 大 batch 提升渐近性能
- 8K GPU小时的缩放曲线可准确预测100K GPU小时的表现

### 论文2: Scaling Behaviors of LLM RL Post-Training

<strong>缩放模型</strong>：对数-线性幂律

```
L(N, X) = a × K(N)^(-1) × X^(-α)
```

- L：测试损失（错误率）
- N：模型大小
- X：计算量或数据量
- K(N)：学习效率（随模型增大饱和）

<strong>关键发现</strong>：
- <strong>模型间外推</strong>：小模型（0.5B-32B）可预测大模型（72B）表现
- <strong>模型内外推</strong>：早期训练轨迹可预测完整训练结果
- 32B 在低计算预算下优于 72B（学习效率饱和导致）
- 数据量固定时，大模型样本效率始终更好
- RL 训练对<strong>数据复用</strong>惊人地鲁棒（τ=25 才显著退化）

### 论文3: Optimally Scaling Sampling Compute

<strong>核心问题</strong>：如何分配采样计算（B_p × n × M）？

<strong>关键发现</strong>：
- <strong>增加每个 prompt 的 rollout 数 n</strong> 比增加训练步数更有效
- n 的最优值随计算预算增加而增加，最终饱和
- 难题的最优 n 更小
- B_p 对性能影响适中，主要影响训练稳定性
- 正则化策略依赖难度：
  - 简单题：熵奖励 + KL 散度
  - 难题：无正则化

<strong>实用建议</strong>：
## 1. 低计算预算下 sweep B_p 和 n

## 2. 拟合缩放律推断最优 n

## 3. 选最小稳定 B_p

## 4. 剩余计算用于增加训练步数 M


## RL vs 预训练缩放定律对比

| 维度 | 预训练 | RL |
|------|--------|-----|
| 性能指标 | 交叉熵损失（稳定） | 奖励/准确率（噪声大） |
| 计算定义 | C=6ND（清晰） | 混合（GPU小时/FLOPs） |
| 外推类型 | 模型间 | 模型间 + 模型内 |
| 标准化程度 | 高 | 低（高度定制） |

## 实用建议总结

## 1. RL 缩放行为在给定设置下**可预测**

## 2. 早期训练阶段可用于判断配置可行性

## 3. 设计决策影响不同：效率 vs 渐近性能

## 4. 大模型总是更好，但计算受限时小模型可能更优

## 5. 增加采样计算（更多 rollout）比增加训练步数更有效

## 6. RL 对数据复用鲁棒，受益于大 batch

## 7. 每个 prompt 的 rollout 数是最关键的调参方向


## 参考文献

## 1. Khatri et al. "The art of scaling RL compute for LLMs" (2025)

## 2. Tan et al. "Scaling behaviors of LLM RL post-training" (2025)

## 3. Cheng et al. "IsoCompute Playbook: Optimally Scaling Sampling Compute for LLM RL" (2026)

## 4. Shao et al. "DeepSeekMath: GRPO" (2024)

## 5. Zheng et al. "GSPO" (2025)

## 6. Yu et al. "DAPO" (2025)

## 7. Liu et al. "Dr. GRPO" (2025)

## 8. Chen et al. "MiniMax-M1: CISPO" (2025)

## 9. Yao et al. "TIS" (2025)

