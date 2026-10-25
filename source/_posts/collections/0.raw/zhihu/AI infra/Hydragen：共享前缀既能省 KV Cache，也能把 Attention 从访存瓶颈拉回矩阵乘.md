---
title: Hydragen：共享前缀既能省 KV Cache，也能把 Attention 从访存瓶颈拉回矩阵乘
date: "2026-07-18 00:00:00"
updated: "2026-07-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/Hydragen-共享前缀既能省-KV-Cache,也能把-Attention-从访存瓶颈拉回矩阵乘/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2061773314687868962
---


📌 本文为论文 Hydragen: High-Throughput LLM Inference with Shared Prefixes 的中文解读、转述、提炼与译者评注，并非逐字翻译。论文作者为 Jordan Juravsky、Bradley Brown、Ryan Ehrlich、Daniel Y. Fu、Christopher Ré、Azalia Mirhoseini，机构包括 Stanford University、University of Oxford、University of Waterloo，arXiv 版本为 2024-05-13。原文链接：[https://arxiv.org/pdf/2402.05099](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2402.05099) ，代码链接：[https://github.com/jordan-benjamin/hydragen](https://link.zhihu.com/?target=https%3A//github.com/jordan-benjamin/hydragen) ，版权归原作者所有。

导读
很多 LLM 推理请求天然共享同一段前缀。聊天服务有共同 system prompt，few-shot 推理有共同示例，代码生成和竞赛编程会从同一个题目 prompt 采样多份候选答案，长文档问答里多个问题也会共享同一篇文档上下文。现有系统通常会想到 KV cache 去重：共享前缀的 KV 不要为每个 sequence 存一份。

Hydragen 指出，KV 存储去重还不够。即使 PagedAttention 这类系统避免了重复存储，共享前缀的 K/V 仍可能在每个 sequence 的 attention 里被反复从 GPU memory 读取。大 batch、长前缀场景下，attention 会退化成大量独立 matrix-vector product，难以充分使用 tensor cores。

Hydragen 的核心设计是把 attention 拆成两部分：共享 prefix 上的 attention 和每个 sequence 独有 suffix 上的 attention。共享 prefix 的 K/V 对一批 sequence 相同，因此可以把多个 query 合成一个 inter-sequence batch，把许多 matrix-vector 操作转成硬件更喜欢的 matrix-matrix 操作。suffix 部分仍按常规方式处理，最后用 log-sum-exp 合并两个 softmax 分区的结果，保持 exact attention。

论文的数字很有指向性：在 CodeLlama-13B 上，Hydragen 相比 vLLM 等强 baseline 最高提升 32 倍端到端吞吐；当 batch size 很大时，共享前缀从 1K 增到 16K token，Hydragen 吞吐下降小于 15%，而 baseline 下降超过 90%；长文档问答中，Hydragen 处理 256 个问题的时间少于 FlashAttention baseline 处理 64 个问题；在树形共享 prompt 的 APPS 编程任务里，两级 Hydragen 相比单级还能额外降低 55% 推理时间。

正文

## 1. 问题：共享前缀让 KV 重复，也让内存读取重复

标准自回归解码每轮只为每个 sequence 生成一个新 token。对 Transformer attention 来说，这意味着 query 很少，K/V 很长。batch decoding 能让 MLP、projection 等模块形成更大的矩阵乘，但 attention 仍然常常是每个 sequence 独立读取自己的 KV cache，做 matrix-vector product。

如果一个 batch 中 1024 个 sequence 共享同一段 2K 或 16K token 的前缀，朴素实现会为每个 sequence 读取一遍前缀 K/V。PagedAttention 能避免前缀 KV 的重复存储，提升显存利用率和 cache hit，但 attention kernel 在计算时仍要反复访问前缀。换句话说，存储层面共享了，计算层面还没有真正共享。

这类场景在今天的 LLM 服务里很多。多用户聊天有相同 policy/system prompt；RAG 或长文档 QA 会让多个问题共享文档；self-consistency、best-of-n、代码生成会对同一 prompt 采样许多候选。batch 越大、共享前缀越长，attention 访存浪费越明显。

## 2. 设计机制：Attention Decomposition + Inter-Sequence Batching

Hydragen 的第一步是 attention decomposition。对每个 sequence，把 K/V 分成共享 prefix 和独有 suffix 两段，分别计算 prefix attention 和 suffix attention。难点在 softmax：完整 attention 的归一化分母跨 prefix 和 suffix，全序列 softmax 不能简单把两个输出相加。

论文利用 blocked softmax 的思路。分别计算 prefix 和 suffix attention 时，同时保存各自 attention score 的 log-sum-exp。合并时用两个分区的 LSE 重建完整 softmax denominator，再对两个分区的输出做重新缩放，得到和完整 attention 一致的结果。因此 Hydragen 是 exact implementation，没有引入近似 attention。

第二步是 inter-sequence batching。因为一批 sequence 的 prefix K/V 完全相同，每个 sequence 当前 token 的 query 都可以一起对同一份 prefix K/V 做 attention。这样 Nq 从每个 sequence 的 1 个 query 变成跨 sequence 的一批 query，算子从很多 matrix-vector product 变成 matrix-matrix product。读 prefix K/V 的成本被 batch 摊薄，tensor cores 也能参与计算。

suffix attention 无法这样处理，因为每个 sequence 的 suffix 不同。Hydragen 的收益主要来自共享部分，所以共享前缀越长、batch 越大、独有 suffix 越短，收益越明显。若 suffix 很长，后续生成 token 越来越多，suffix KV 读取会逐渐成为主要成本，Hydragen 的加速也会下降。

## 3. 实现细节：不用自定义 CUDA，但要知道哪里共享

论文实现面向 Llama 系列模型。作者强调 proof-of-concept 没有写自定义 CUDA，而是用 PyTorch 加 fast attention primitive：prefix attention 使用 flash-attn 2.3.6，suffix attention 使用 xformers 的 Triton kernel。非层级输入中，作者还写了一个 Triton kernel 用于合并 softmax denominator。

这个实现选择很有意思。PagedAttention 这类系统需要 bespoke GPU kernel 来管理 paged KV cache，Hydragen 则把优化放在 attention 分解和 batching 形式上。它更像一种 kernel 调用编排和数学重写，对硬件迁移更友好。论文也提到，TPU 这类有高速矩阵乘单元的平台也可能受益。

代价是当前 Hydragen 需要用户或上层系统明确告诉它哪些序列共享哪些 token。在线 serving 中，请求连续到达，不会天然排成整齐的共享前缀 batch。真正接入生产推理框架，需要 scheduler 动态识别 prompt overlap，或者让业务层显式声明 system prompt、document context、few-shot examples、candidate group 等共享结构。

Hydragen 还支持树形共享。比如竞争性编程中，一批请求共享 few-shot prompt；同一道题的 128 个 candidate program 又共享题目描述。Hydragen 可以在树的每个节点做 decomposition，在不同层级做 inter-sequence batching。这比单一 prefix-suffix 模型更贴近真实任务，因为 prompt overlap 经常是层级化的。

从系统接口看，Hydragen 需要一层共享结构描述。最直接的形式是把 batch 表示成一棵 prompt tree：每个节点保存一段 token 和对应 KV，叶子表示具体 sequence。Kernel 调用时按节点分组，把同一节点上的 query 合并处理。这样做要求调度器在请求进入时维护共享关系，知道哪些 prefix 可以跨请求复用，哪些 suffix 必须独立保存。

这层 metadata 会影响缓存系统。传统 prefix cache 常用 hash 匹配一段 token；Hydragen 需要知道共享 prefix 在 batch 内的拓扑，以及每个 sequence 当前 decode 位置。若再叠加 LoRA adapter、不同 sampling 参数、不同租户权限，合批条件会更复杂。两个请求 token 前缀相同，但 adapter 不同或安全上下文不同，也不能简单放进同一个 attention batch。

## 4. 实验结果：长前缀、大 batch 场景收益最大

端到端实验使用 CodeLlama-13B，在 8 张 A100-40GB 上做 tensor parallel。作者比较 FlashAttention、vLLM、去掉 detokenization 的 vLLM，以及 no-attention 上界。prefix 固定 2048、每个 completion 生成 128 token 时，小 batch 下各方法接近；batch 增大后，Hydragen 开始明显超过 baseline，因为 prefix attention 成本被摊薄。

另一个实验固定 batch size 为 1024，增加共享 prefix 长度。vLLM 从 1024 token 前缀时接近 5K tokens/s，掉到 16256 token 前缀时低于 500 tokens/s；Hydragen 在同样前缀增长下吞吐下降很小，并且所有测量点都在 no-attention 上界的 70% 以内。论文摘要总结为：1K 到 16K prefix 时，Hydragen 吞吐下降小于 15%，baseline 下降超过 90%。

长文档问答实验使用 Yi-6B-200k，共享前缀约 19947 token，包括文档和 5 个 few-shot QA 示例，在 4 张 A100-40GB 上运行。Hydragen 处理 256 个问题的时间少于 FlashAttention baseline 处理 64 个问题。这个结果说明 Hydragen 除了服务 system prompt，也适合“同一长文档、多问题”的批处理。

树形共享实验用 CodeLlama-7B 在 APPS 的 120 个编程题上采样，每题 128 个 candidate program。单级 Hydragen 只共享 few-shot prompt；两级 Hydragen 还共享每道题的问题描述。在相同 batch size 下，两级共享降低 18% 评估时间；因为减少冗余存储后可以增大 batch，最终额外降低 55% 推理时间。

## 5. 边界与代价

Hydragen 适合 attention 成为主要瓶颈的场景。小 batch、短上下文、短 prefix、模型参数读取占主导时，收益有限。使用 multi-query attention 或 grouped-query attention 的模型 KV cache 已经更小，Hydragen 仍可能有收益，但幅度取决于 batch size、prefix/suffix 比例和硬件 compute/memory bandwidth 比。

Hydragen 当前只是 attention fast path。它不处理请求 admission、continuous batching、KV eviction、故障恢复、prefix cache 生命周期、多租户隔离，也不自动发现共享结构。它更适合成为 vLLM、TensorRT-LLM、SGLang 或内部推理框架里的一个加速模块。

还有一个工程约束：共享结构要稳定。如果 scheduler 为了凑共享前缀而让请求等待太久，TTFT 可能变差；如果多个租户共享 system prompt 但权限、adapter、采样参数不同，能否合批要更严格地检查。共享前缀是性能机会，也会把调度和安全边界带进 attention kernel 之前。

Hydragen 对生成长度也敏感。刚开始 decode 时，suffix 很短，prefix attention 占比高，收益明显；生成越久，每条 sequence 的 suffix KV 越长，suffix attention 重新成为主要成本。长 completion、少量并发请求、prefix 短的 workload，可能更应该优先做 paged KV、speculative decoding 或 prefill/decode 分离。

它还要求结果保持 exact。很多长上下文系统会用稀疏 attention、滑动窗口或 KV 压缩换取性能，Hydragen 没有改变模型输出分布。对线上服务来说，这一点很重要：它可以作为透明性能优化接入，不需要重新评估近似 attention 对质量的影响。真正需要评估的是调度带来的排队时间和 batch 组成变化。

译注

- Hydragen 把“prefix cache”从存储优化推进到算子优化。共享 KV 应该少存一份，也应该少读很多次。
- 它和 PagedAttention 是互补关系。PagedAttention 管 KV cache 的内存布局和 paging，Hydragen 管共享前缀 attention 的计算形态。两者组合后，既能少存，也能少搬、少做低效矩阵向量计算。
- 对 RAG 和长文档 QA，Hydragen 的启发很直接：同一文档上的多问题应尽量成组调度。把每个问题当独立请求，会浪费大量共享上下文。
- 对代码生成、self-consistency、best-of-n，树形共享比单前缀更重要。few-shot prompt、题目描述、候选后缀形成天然 tree，推理系统应该识别这种结构。
- 生产落地的关键在 scheduler。只有 kernel 优化还不够，上层要能把共享请求组织到一起，同时控制等待时间、租户隔离和输出参数差异。
- Hydragen 也给 KV cache 系统一个信号：未来 cache metadata 可能要记录共享树，block table 或 prefix hash 只是其中一部分。
- 对 Agent 系统也有价值。多个工具调用、多个候选计划、多个检索文档评分任务常共享长 system prompt 和任务说明，适合在批处理中显式构造共享树。
- 它对成本模型的影响也要单独算。共享前缀越长，Hydragen 越可能把瓶颈从 attention 访存转移到模型权重读取、suffix attention 或调度等待，优化重点会随负载移动。
术语简表
Shared prefix：一批序列共同拥有的输入前缀，例如 system prompt、few-shot 示例、长文档。

KV cache：LLM attention 中保存历史 token key/value 的缓存。

Attention decomposition：把完整 attention 拆成共享 prefix 和独有 suffix 两部分计算。

Inter-sequence batching：跨多个 sequence 合并 query，一起对同一份 prefix K/V 做 attention。

Prompt tree：描述多级共享 prompt 的树结构，节点代表共享 token 段，叶子代表具体生成序列。

Matrix-vector product：矩阵向量乘，解码 attention 常见但硬件利用率较低。

Matrix-matrix product：矩阵矩阵乘，更容易使用 tensor cores。

Log-sum-exp：softmax 分区合并时保存归一化分母所需的数值稳定统计。

Tree-shaped sharing：多层共享结构，例如全局 few-shot prompt + 每道题的题目描述。