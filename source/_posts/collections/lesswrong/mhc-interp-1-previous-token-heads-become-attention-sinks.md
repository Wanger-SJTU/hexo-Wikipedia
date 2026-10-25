---
title: "MHC Interp #1: Previous-Token Heads Become Attention Sinks Under Manifold-Constrained Hyper-Connections"
date: "2026-05-03 00:00:00"
updated: "2026-05-03 00:00:00"
layout: post
permalink: /collections/lesswrong/mhc-interp-1-previous-token-heads-become-attention-sinks/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - LLMs
  - mHC
  - AI
  - Mechanistic-Interpretation
source_url: https://www.lesswrong.com/posts/BBgZ4bCbP4dfKeRhk/mhc-interp-1-previous-token-heads-become-attention-sinks
---


## 背景

Manifold-Constrained Hyper-Connections (mHC) 是 Deepseek 在 Deepseek v4 中实现的新架构，是对 HC (Hyper-Connections) 梯度消失/爆炸问题的修复，同时保留了性能提升。HC 是一种在残差流上加权重和偏置来模拟更宽残差流的方法，但这样会让前面层的信号难以更新。mHC 通过 Sinkhorn-Knopp 算法使权重和偏置满足双随机矩阵约束（行和列和为1）。mHC-lite 则使用 Birkhoff-von Neumann 方法达到同样效果。

## 快速总结

- 用 [mhc-lite repo](https://github.com/Realmbird/mhc-lite-Dolma-781M) 训练了 mHC、mHC-lite 和非 mHC 模型（781M 参数）
- mHC 模型中 attention head 的形状和层位置会改变
- **Previous-token heads 在 mHC 模型中表现出高垂直性/峰度（kurtosis），变成了 attention sinks**
- Induction heads 和 prev-token heads 在 mHC 模型中出现在更早的层
- Duplicate heads 出现在更晚的层
- mHC 的残差流 1,2,3 在最后一层输出相同的 top-1 token，而 mHC-lite 的各残差流输出不同 token（sofa, floor, end）
- mHC 模型在更早的层就能预测某些 token（如 "same"）
- **mHC 模型中存在 3 角色甚至 4 角色的 attention head（如 mHC L7h15 是 4 角色 head）**
- 对于 mHC 模型，prev-token heads 无法用对角条纹检测，需要 ablation 和 path patching
- **mHC 模型中 prev-token heads 的行为类似于 receiver heads，表现为高 kurtosis**

## 实验设置

### 检测 Attention Head 的 Ablation 方法

| Probe | Prompt | Why it works |
|-------|--------|-------------|
| prev-token | "When Mary and John went to the store, John gave a drink to Mary" | 有重复名字，需要用位置/前一个 token 信息 |
| induction | [EOT] + R + R (R = 25 个随机 token) | 随机 token 重复两次，唯一解法是回看第一个 copy |
| duplicate | 同 induction | 重用随机重复结构 |
| successor | 3 个 prompt 平均：days ("... Friday" → " Saturday")、numbers ("... five" → " six")、letters ("... E" → " F") | 三个独立 probe 防止单 prompt 假象 |
| copy-suppression | "When John and Mary went to the store, John gave a drink to"，target = " Mary"，distractor = " John" | 测试 ablating head 是否让模型更可能预测重复名字 |

ΔNLL = NLL(target | ablated) − NLL(target | clean)

## 实验结果

### Logit Lens

- **mHC 在 L22 达到最终 top-1 准确率的 90%**（非 mHC: L31，mHC-lite: L35）
- KL(lens || final) 在 mHC 中 L24 就降到 0.5 以下（残差模型: L34）
- 三种模型在 L35 都收敛到 ~38.2% top-1

### Attention Heads

- **Induction heads 和 prev-token heads 在 mHC 模型中出现在更早的层**
- **Duplicate heads 出现在更晚的层**
- mHC 模型中存在 3+ 角色的 attention head（mHC L7h15 是 4 角色）
- mHC-lite L8h16 是唯一的 3 角色 head
- **对于 mHC 模型，prev-token heads 需要用高 kurtosis 而不是对角条纹来检测**
- mHC-lite 中 prev-token heads 的检测方法与 mHC 不同

## 核心发现

1. **Previous-token heads 在 mHC 模型中变成了 attention sinks**：它们的行为从正常的 prev-token pattern 变成了 receiver heads，表现为高 kurtosis 分数

2. **残差流行为差异**：mHC 的残差流 1,2,3 都预测相同的 token（floor），而 mHC-lite 的各残差流预测不同 token——获取双随机矩阵的方法影响了残差流的工作方式

3. **多层角色 attention head**：mHC 模型中存在 attention head 同时扮演 3-4 个角色，这在非 mHC 模型中不存在

## 未来工作

- 训练 SAE 来分析 feature
- 训练 auto encoder 预测一个残差流到另一个（RAE）
- 基于电路的解释方法
- 理解为什么 mHC-lite 残差流输出不同 token 而 mHC 不
- 理解为什么 induction heads 保持相似而 prev-token heads 不
- 多角色 attention head 的成因
- 残差流数量如何影响 head 外观和位置
- 用 Linear probes 确认 prev-token heads 结果

---

*AI附注：这是一篇关于 Deepseek mHC 架构的机制解释工作，作者 Realmbird 通过训练小模型并使用 ablation/path patching 等技术，发现 mHC 会让 previous-token heads 变成 attention sinks，且存在多层角色的 attention head。*
