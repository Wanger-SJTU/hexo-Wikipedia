---
title: 大模型推理优化RoadMap-持续更新
date: "2026-07-02 00:00:00"
updated: "2026-07-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/大模型推理优化RoadMap-持续更新/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2056050797784438492
---


![](https://pic3.zhimg.com/v2-cff12bdd9171ce51f5286075be25b0a6_r.jpg)
LLM推理优化技术路线

Attention优化

- [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://link.zhihu.com/?target=https%3A//github.com/dao-ailab/flash-attention) (Dao et al., 2022)  IO-aware 的精确注意力算法，大幅降低内存访问和计算成本，是实际推理优化的基础
- [Star Attention: Efficient LLM Inference over Long Sequences](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/Star-Attention)(Acharya et al., 2024)  块稀疏注意力机制，针对长序列推理优化。
- [Efficient Attention Mechanisms for Large Language Models: A Survey](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2507.19595) (Sun et al., 2025)  线性与稀疏注意力综述。
- [Progressive Sparse Attention: Algorithm and System Co-design for Efficient Attention in LLM Serving](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2503.00392)
KV Cache优化

- [KV Cache Optimization Strategies for Scalable and Efficient LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2603.20397) KV Cache优化综述[KV Cache Optimization Strategies for Scalable and Efficient LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2603.20397)[KV Cache Optimization Strategies for Scalable and Efficient LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2603.20397) KV Cache优化综述
- [KVQuant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2401.18079) KV Cache压缩以支持10M上下文
- [Scissorhands: Exploiting the Persistence of Importance Hypothesis for LLM KV Cache Compression](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.17118) (Liu et al., 2023) 基于重要性假设的 KV 压缩。
- [Infinite-LLM: Efficient LLM Service for Long Context with DistAttention and Distributed KVCache](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2401.02669v2) (Lin et al., 2024) 分布式 KV Cache 管理。
- [KV Cache Compression for Inference Efficiency in LLMs: A Review (2025)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2508.06297)  选择性 token、量化、注意力压缩等综述。
解码算法优化

- [SpeculativeDecodingPapers (GitHub 资源库)](https://link.zhihu.com/?target=https%3A//github.com/hemingkx/SpeculativeDecodingPapers) 投机解码领域必读论文与博客的持续更新合
- [A Theoretical Perspective for Speculative Decoding Algorithm (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2411.00841)
- [Fast Inference from Transformers via Speculative Decoding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.17192)(Leviathan et al., Google, 2022) arXiv:  经典投机解码算法，利用小模型草稿并行生成并由大模型验证，显著加速自回归生成且不改变输出分布。
- [Accelerating Large Language Model Decoding with Speculative Sampling](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.01318) 提供统计保证的投机采样框架，提升解码效率。
- [EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.15077)  基于特征级预测头的投机解码，无需独立草稿模型即可提高接受率。
- [A Theoretical Perspective for Speculative Decoding Algorithm (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.00841)从马尔可夫链角度理论分析投机解码的最优性与质量-速度权衡
模型量化压缩

- [A Survey on Model Compression for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2308.07633) (2024) 全面综述量化、剪枝和知识蒸馏等 LLM 压缩技术。
- [GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.17323) (ICLR 2023) 精准的后训练量化方法，广泛用于生成模型的实际部署。
- [AWQ: Activation-aware Weight Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.00978) (2024) 激活感知权重量化，针对生成阶段内存瓶颈进行优化。
- [SLIM: One-shot Quantization and Sparsity with Low-rank Approximation](https://link.zhihu.com/?target=https%3A//research.nvidia.com/publication/2025-06_slim-one-shot-quantization-and-sparsity-low-rank-approximation-llm-weight) (NVIDIA, 2025)  一_shot 集成量化、稀疏与低秩压缩，实现硬件友好加速。
- [Contemporary Model Compression on Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2409.01990)(2024)  从量化、蒸馏和剪枝三个视角讨论当代压缩技术。
并行策略优化

- [Seesaw: Dynamic Model Re-sharding for LLM Inference (2025)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.06433) 动态模型重分片策略，提升吞吐导向任务的并行效率。
服务化调度优化

- [vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention (2023)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.06180) 引入 PagedAttention 与连续批处理，实现高吞吐、低延迟 LLM 服务。
- [Sarathi-Serve (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2403.02310) Token-budget 感知的 chunked prefill 调度，平衡预填充与解码延迟。
- [Efficient LLM Scheduling by Learning to Rank (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2408.15792) 学习排序方法近似 Shortest Job First，大幅降低聊天延迟并提升吞吐。
- [Optimal Scheduling Algorithms for LLM Inference: Theory and Practice (2025)](https://link.zhihu.com/?target=https%3A//users.ece.utexas.edu/~gustavo/papers/BHD25j.pdf) 提供路由与调度的理论框架及实践混合调度算法。
- [Hybrid Offline-online Scheduling Method for Large Language Model Inference (2025)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.15763) 混合离线/在线调度优化系统吞吐和硬件利用率。
异构优化

- [Dovetail: A CPU/GPU Heterogeneous Speculative Decoding (2025)](https://link.zhihu.com/?target=https%3A//aclanthology.org/2025.emnlp-main.879.pdf) CPU-GPU 协作投机解码，利用异构设备特性降低通信开销。
- [High-Throughput LLM Inference on Heterogeneous Clusters (2025)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.15303) 针对异构集群的部署配置与资源建模，实现高吞吐推理服务。
- [Serving Models, Fast and Slow: Optimizing Heterogeneous LLM Inferencing (2026)](https://link.zhihu.com/?target=https%3A//www.microsoft.com/en-us/research/publication/serving-models-fast-and-slowoptimizing-heterogeneous-llm-inferencing-workloads-at-scale/) 针对混合延迟敏感/不敏感工作负载的异构资源动态分配框架。
- [Hybe: GPU-NPU Hybrid System for Efficient LLM Inference (2025)](https://link.zhihu.com/?target=https%3A//dl.acm.org/doi/10.1145/3695053.3731051) GPU 负责预填充、NPU 负责解码的混合系统，支持百万 token 上下文。
- [GUIDE: A Global Unified Inference Engine for Deploying LLMs in Heterogeneous Environments (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2412.04788) 统一异构环境下的 LLM 部署与性能预测引擎。
系统优化

- [A Survey on Efficient Inference for Large Language Models (2024)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.14294) 从数据、模型、系统三级分类的 LLM 高效推理全面综述。
- [A survey of optimization strategies for LLM inference on hardware platforms (2026)](https://link.zhihu.com/?target=https%3A//www.sciencedirect.com/science/article/abs/pii/S1383762126000081) 针对 GPU、FPGA、ASIC 和 PIM 等硬件平台的解码器 LLM 加速策略综述。
- [Taming the Titans: A Survey of Efficient LLM Inference Serving (2025)](https://link.zhihu.com/?target=https%3A//aclanthology.org/2025.inlg-main.32.pdf) 从实例级到集群级的 LLM 推理服务优化分层综述。
- [LLM-inference-optimization-paper Collection (持续更新)](https://link.zhihu.com/?target=https%3A//github.com/chenhongyu2048/LLM-inference-optimization-paper) 实用 LLM 推理优化论文与仓库的分类总结资源。
- [Mastering LLM Techniques: Inference Optimization (2023+)](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/) 工程实践总结，涵盖注意力、量化、并行等集成优化技术。