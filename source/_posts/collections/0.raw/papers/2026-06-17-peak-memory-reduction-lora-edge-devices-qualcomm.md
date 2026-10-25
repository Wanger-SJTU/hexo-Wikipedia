---
title: 面向边缘设备 LLM LoRA 微调的峰值显存降低技术
date: "2026-06-21 16:16:53"
updated: "2026-06-21 16:16:53"
layout: post
permalink: /collections/0.raw/papers/2026-06-17-peak-memory-reduction-lora-edge-devices-qualcomm/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 面向边缘设备 LLM LoRA 微调的峰值显存降低技术

> <strong>原文</strong>: Techniques for Peak Memory Reduction for LoRA Fine-tuning of LLMs on Edge Devices
> <strong>作者</strong>: Hassan Dbouk†, Matthias Reisser†, Prathamesh Mandke*, Likhita Arun Navali, Christos Louizos
> <strong>机构</strong>: Qualcomm AI Research
> <strong>提交日期</strong>: 2026-06-17
> † 共同第一作者, * 在 Qualcomm 期间完成的工作
> <strong>原文图片</strong>: [查看](2026-06-17-peak-memory-reduction-lora-edge-devices-qualcomm.jpg)

---

## 摘要

使用低秩适应（LoRA）在终端用户数据上微调大语言模型（LLM）可以提供个性化体验，同时保持数据私密性，但在消费级硬件上面临严重的内存限制。微调过程中的峰值内存经常超出设备限制，尤其是对于具有数十亿参数和长上下文训练数据的模型。本文引入了一套互补技术来降低内存占用，同时不牺牲模型质量：

1. <strong>基模型量化 + 在线反量化</strong>
2. <strong>内存高效的检查点机制</strong>（结合选择性激活缓存和磁盘卸载）
3. <strong>基于语义相关 token 子集的 Softmax 近似</strong>
4. <strong>Logits 掩码</strong>

在 Llama-3.2 3B 和 Qwen-2.5 3B 上的实验表明，峰值内存最高可分别降低 <strong>26× 和 28×</strong>，使得在资源受限设备上进行微调成为可能。

---

## Table 1: 不同方法下的峰值内存对比

单次前向+反向传播的峰值内存（batch size = 1, FP32 计算），在 NVIDIA A100 GPU 上测量，涵盖不同上下文长度。

| 模型 | 方法 | 1024 | 2048 | 4096 | 8192 | 16384 (tokens) |
|------|------|------|------|------|------|------|
| <strong>Llama-3.2 3B</strong> | FP32 基线 | 27.60 | 29.97 | 47.96 | OOM | OOM |
| | + LoRA (r=16) | 19.10 | 26.20 | 40.41 | 68.83 | OOM |
| | + 量化 | 8.80 | 14.68 | 27.48 | 53.07 | OOM |
| | + 检查点 | 2.37 | 3.33 | 6.29 | 12.21 | 24.05 |
| | + Softmax 近似 | 1.30 | 2.43 | 5.41 | 11.58 | 23.79 |
| | + Logits 掩码 | <strong>0.70</strong> | <strong>1.02</strong> | <strong>1.59</strong> | <strong>3.24</strong> | <strong>6.95</strong> |
| <strong>Qwen-2.5 3B</strong> | FP32 基线 | 27.11 | 35.25 | 57.87 | OOM | OOM |
| | + LoRA (r=16) | 21.68 | 30.51 | 48.38 | OOM | OOM |
| | + 量化 | 11.21 | 19.46 | 36.03 | 69.17 | OOM |
| | + 检查点 | 2.06 | 3.79 | 7.29 | 14.27 | 28.24 |
| | + Softmax 近似 | 1.26 | 3.03 | 6.58 | 13.79 | 27.98 |
| | + Logits 掩码 | <strong>0.66</strong> | <strong>1.01</strong> | <strong>1.71</strong> | <strong>3.90</strong> | <strong>8.34</strong> |

> 单位: GB。OOM = 内存溢出。

---

## 技术亮点

### 1. 基模型量化（Quantization）
- 将预训练的基模型权重存储为低精度格式（如 INT8/INT4）
- 在前向/反向传播时进行在线反量化（on-the-fly dequantization）
- <strong>效果</strong>: 内存从 ~27GB 降至 ~9-11GB（约 2.5-3× 压缩）

### 2. 内存高效检查点（Checkpointing）
- 选择性激活缓存：只缓存关键层的激活值，其余层在反向传播时重新计算
- 磁盘卸载：将部分激活值转移到磁盘/闪存
- <strong>效果</strong>: 内存进一步从 ~9-11GB 降至 ~2-4GB（额外 3-5× 压缩）
- <strong>原理</strong>: 以计算换内存（trade compute for memory）

### 3. Softmax 近似（SM Approximation）
- Attention 中的 softmax 计算是峰值内存的重要贡献者
- 使用语义相关的 token 子集代替完整 token 序列进行 softmax
- <strong>效果</strong>: 额外节省 ~30-50% 内存

### 4. Logits 掩码（Logits Masking）
- 在反向传播时，对不需要更新的 logits 位置进行掩码
- 避免计算和存储完整的 logits 梯度
- <strong>效果</strong>: 最终阶段将内存压到 1GB 以下（短上下文）

---

## 关键数据

- Llama-3.2 3B + LoRA + 2048 tokens: <strong>26.20 GB → 1.02 GB（25.7× 压缩）</strong>
- Llama-3.2 3B + LoRA + 16384 tokens: <strong>原本 OOM → 6.95 GB（可行）</strong>
- Qwen-2.5 3B 整体最高达 <strong>28× 压缩</strong>

## 意义

- <strong>端侧个性化成为现实</strong>: 手机/NPU（2-4GB 内存）上可以微调 3B 模型
- <strong>隐私保护</strong>: 数据不出设备，本地完成个性化微调
- <strong>长上下文突破</strong>: 16K tokens 的微调在消费级硬件上可行
- <strong>四种技术正交互补</strong>: 每种技术解决不同层面的内存瓶颈，组合使用效果叠加

---

*翻译时间: 2026-06-21*
