---
title: Popping the GPU Bubble - Moondream Photon 推理引擎优化
date: "2026-06-06 00:00:00"
updated: "2026-06-06 00:00:00"
layout: post
permalink: /collections/moondream/popping-the-gpu-bubble/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - inference
  - gpu-optimization
  - pipelining
  - vlm
source_url: https://moondream.ai/blog/popping-the-gpu-bubble
---


# Popping the GPU Bubble

**作者**: Moondream Engineering
**发布**: 2026-06-04

Photon, Moondream's inference engine, achieves near-realtime VLM inference (~33ms on NVIDIA B200). This is a peek into how it delivers up to 35% higher decode throughput by optimizing how the GPU works.

## 核心问题：GPU Bubble

AI 模型生成文本时，每次产出一个 token（自回归），每步都涉及 CPU-GPU 往返。GPU 做大量计算产出下一个 token，但 CPU 也需要做不少工作：选择下一个请求、设置元数据、从输出中提取 token、记录等。

问题是：一步 GPU 工作量很小，而 CPU 的 housekeeping 是固定开销。如果 GPU 必须等 CPU 完成后才能开始下一步，GPU 就会闲置。这就是 GPU bubble。

## 解决方案：Pipelined Decoding

将 CPU 和 GPU 的工作重叠：在 CPU 还在处理上一步的结果时，启动下一步的 GPU forward。上一步采样的 token 不需要离开 GPU，下一步 forward 直接从 GPU 显存读取。

## 三个关键机制

### Mechanism 1: Ping-pong Slots

每步 decode 需要一组缓冲区（输入、输出 logits、采样 token、KV cache）。为避免 runtime 分配导致的同步和气泡，缓冲区预分配复用。用 CUDA Graph 捕获 decode step 减少内核启动开销。这套缓冲叫 DecodeSlot。

pipelining 需要两步并行，所以用两个 slot 交替（ping-pong）。两个 slot 的 forward 在同一个 compute stream 上（串行），但 D2H copy 走独立 copy stream，可以在 GPU 跑下一步 forward 时并行传输。

slot 在 CPU 读取完结果后才释放（不是 GPU 完成就释放），防止 copy 传输中途被覆盖。

### Mechanism 2: Forward Now, Sample Later

受限解码（结构化输出如坐标、检测框）需要在采样前设置 mask（屏蔽不允许的 token），而 mask 依赖上一步的 token。

但依赖在采样，不在 forward。所以：

1. **Launch** forward t+1（不依赖 mask，立即执行）
2. **Commit** step t（等待 D2H copy，推进解码状态，决定 t+1 的 mask）
3. **Finalize** sampling t+1（基于更新后的状态构建 mask 并采样）

forward 先跑，sampling 等上一步 commit 完。GPU 闲不住。

### Mechanism 3: Zombies - Finalize Early, Release Late

当序列在 step t 命中 stop token 时，step t+1 的 forward 已经发射了（因为我们在 t 之前就决定了 batch）。不能取消 GPU work。

Photon 用两个 per-sequence 字段处理：

- `finalized`: 命中 EOS 或长度上限后为 True
- `inflight_refs`: 引用该序列的在飞步骤数（0、1 或 2）

step t commit 时标记 finalized 并发射结果，但不拆除（inflight_refs 非零）。step t+1 commit 时跳过（已 finalized）。当 inflight_refs 归零时才释放 KV 页和 LoRA slot。

僵尸税：单流约 1%（L≈110 时浪费一个 forward），batch 时几乎为零（memory-bound，多一行不增加成本）。

## Prefill 共用 Pipeline

Photon 不分离 prefill 和 decode。prefill 也走同一个 pipeline，短输出请求（大部分时间在 prefill）同样受益。

## 实测数据

| 配置 | Blocking (ms) | Pipelined (ms) | L | 预测提升 | 实测提升 |
|------|--------------|----------------|---|---------|---------|
| 3090 · 1流 | 5.44 | 5.10 | 104 | +5.7% | +6.5% |
| 3090 · 8流 | 7.52 | 6.97 | 113 | +7.6% | +7.8% |
| 3090 · 32流 | 11.74 | 10.52 | 113 | +11.1% | +11.6% |
| B200 · 1流 | 3.11 | 2.63 | 115 | +17.2% | +17.6% |
| B200 · 8流 | 4.04 | 3.30 | 115 | +22.2% | +21.9% |
| B200 · 32流 | 5.55 | 3.98 | 104 | +39.1% | +35.4% |

三个关键观察：

1. **GPU 越快收益越大** — 3090 最多 +11.6%，B200 最多 +35.4%。bookkeeping 开销与 GPU 速度无关，forward 越短 bubble 占比越高
2. **僵尸税真实但小，且会摊薄** — 单流约 1%，batch 时几乎为零
3. **只有 bubble 真的能被隐藏时才有效** — 如果 copy stream 意外变成同步的，收益直接消失

## 总结

Pipelined decoding 不是单一优化，而是与 Photon 整个 serving stack 中其他优化（图像 resize/tiling、自定义 kernel、调度排序等）共同叠加。没有任何单一技巧是全部答案，足够多的细节对齐才能让整个 stack 变快。

Photon 2.0 即将发布。
