---
title: 大模型稀疏化技术原理：DoubleSparse
date: "2025-07-07 00:00:00"
updated: "2025-07-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/大模型稀疏化技术原理-DoubleSparse/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1912877769827783344
---


近年来，随着Transformer、MOE架构的提出，使得深度学习模型轻松突破上万亿规模参数，从而导致模型变得越来越大，因此，我们需要一些大模型压缩技术来降低模型部署的成本，并提升模型的推理性能。 模型压缩主要分为如下几类：

- 模型稀疏化
- 知识蒸馏
- 模型量化
本系列将针对一些常见大模型稀疏化方案（LLM-Pruner、SliceGPT、SparseGPT、Wanda）进行讲述。

- [大模型稀疏化技术原理：概述](https://www.zhihu.com/question/652126515/answer/3457652467)
- 大模型稀疏化技术原理：Double Sparsity
- 大模型稀疏化技术原理：LLM-Pruner、SliceGPT
- 大模型稀疏化技术原理：SparseGPT、Wanda
- 大模型稀疏化技术原理：总结
** 另外，我撰写的大模型相关的博客及配套代码**均整理放置在Github：[llm-action](https://link.zhihu.com/?target=https%3A//github.com/liguodongiot/llm-action/tree/main)，有需要的朋友自取。** 而本文将介绍一种新型的训练后稀疏注意力技术 Double Sparsity。

### 简介

大语言模型的推理过程速度慢且内存密集，一个最关键的原因是访问键值（KV）缓存的次数过多。Double Sparsity 通过减少对 KV 缓存的内存访问来加速 LLM 推理。

Double Sparsity 结合了token稀疏和通道稀疏的方法，token稀疏专注于仅使用重要token进行自注意力计算，而通道稀疏则通过使用重要特征通道来识别重要token。其关键见解是通道稀疏的模式相对静态，因此可以通过离线校准，使其能在运行时高效，从而准确高效地识别重要的token。此外，该方法可以与卸载技术结合使用，以显著减少内存使用。

实验结果表明，Double Sparsity 在各种任务中实现  的Token和通道稀疏的同时，对准确性的影响最小，这些任务包括 wiki-2 困惑度、key-value检索以及使用 Llama2-7B、Llama-2-70B 和 Mixtral-8x7B 模型进行长上下文基准测试。其注意力运算上取得了高达 14.1 倍的加速，端到端推理速度提高了 1.9 倍。通过卸载技术，它在序列长度为 256K 时，与最先进的解决方案相比，解码速度加速了 16.3 倍。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_4e8b5ec874e5.jpg)

### 技术原理

整体的方案分为

- 离线校准：通过离线的方式筛选出重要 Channel并保存至 Label Cache。
- 在线前向计算：基于Label Cache进行前向计算。

#### 离线校准

离线校准通过离线的方式识别出重要的 Channel，比如：识别出 Channel 0 和 Channel 2 是重要的 Channel。

AWQ 利用离线校准来识别对模型性能有显著影响的显著权重通道。受此方法的启发，Double Sparsity 采用离线校准来预先确定对注意力分数影响最大的通道（Outlier Channel）。仅使用少量样本数据，通过离线的方式识别哪些 Channel 更加重要（PS：这里不同 Layer 的 Channel 可能是不一样的）。

此外，这里有几种不同的策略：

- Activation Outlier：根据 Activation 中的 Outlier 来识别重要的 Channel，红色部分。
- Q-Outlier：根据 Query 中的 Outlier 来识别重要的 Channel，绿色部分。
- K-Outlier：根据 Key 中的 Outlier 来识别重要 Channel，蓝色部分。
- QK-Outlier：根据 Query * Key 来识别重要 Channel，紫色部分。
![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_59cd4cb960ce.jpg)

为了验证通过离线校准识别的异常通道的有效性，对离线校准得到的异常通道索引和在线解码过程中确定的异常通道索引进行了比较，两组之间的显著重叠证明了离线校准异常值的可靠性。

作者进行消融实验发现，当重要 Channel 的占比达到 0.25 时，通过离线方式确定的 Outlier Channel 与通过在线推理方式获得的 Outlier Channel 的重合度达到了 0.95。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_c41496079ba1.jpg)

在确定了异常通道索引之后，高效访问这些通道变得至关重要。直接从Key Cache中读取这些通道可能会导致非连续的内存访问，从而显著降低带宽利用率。为缓解非连续内存访问问题，作者利用Label Cache来存储预先确定的重要权重通道值。这使得在计算近似注意力时（后文会提到）能够进行连续内存访问，避免了从Key Cache中检索非连续片段的需要。在预填充阶段，所有重要权重通道值从 Key Cache 存储到 Label Cache 中；在解码阶段，只需添加新Token的重要权重通道值**。

注意：这里除了存储全量的 Key Cache，还要存储 Label Cache（新增的部分），所以增加了显存占用。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_3281f20fdda9.jpg)

由于近似注意力对精度不敏感，可以将Label Cache以 4 位的形式存储。这种方法使其能够维护一个仅为 Key Cache 大小  的 Label Cache，从而实现连续内存访问并显著提高 L1/L2 缓存的命中率，进而优化推理速度和效率。

#### 在线前向计算

Double Sparsity 的解码过程及伪代码如下所示，整个计算过程分为以下几步：

第一步：根据重要 Channel 的 Index 提取 Query，同样要连续存储。

第二步：使用稀疏但连续存储的 Query 与 Key Cache 计算近似注意力值（Attention Score）。

第三步：根据 Attention Score 选出 Top-k 的重要 Token（Key/Value Cache），然后使用这些重要的 Token 进行 Attention 计算。（PS：这里使用的 Query，Key，Value 都不是 Channel 稀疏，这也就是为什么依旧要存储完整的 Key/Value Cache）

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_7da1a72543fe.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_d7d5fd7c0348.jpg)

> 【丹摩智算周年庆】算力限时放血，囤到就是赚到！RTX 4090：0.99元/时、A800仅3.66元/时，每充500返100，周充500即可参与“送1台4090*1个月使用权”限时抽奖。秒杀入口：https://damodel.com/register?source=9B270E50

### 实验细节

Wiki-2的困惑度是一个从维基百科文章中得出的基准，它提供了一个包含广泛词汇和真实文本特征的全面测试。分数越低，说明模型的表现越好。下表展示了每个模型在不同稀疏度水平下的困惑度变化。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_01927c1fac05.jpg)

同时，为了验证 Double Sparsity 的鲁棒性和稀疏度的有效性，在各种模型配置和条件下进行了一系列消融实验。下表展示了在稀疏度下，Double Sparsity 在各种模型大小、注意力机制和MoE配置中的有效性。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_dc3493a7e4c0.jpg)

通过使用 Llama-2-7B 模型在多个长文本基准测试中评估了Double Sparsity技术在不同稀疏水平下的性能。下图展示了 Double Sparsity 在  的稀疏水平下能够保持性能几乎不下降，并且在准确性方面优于其他技术（StreamingLLM 和 H2O）。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_6186be0a22ac.jpg)

key-value 检索基准测试旨在评估模型的上下文检索能力，下图结果表明，Double Sparsity 在 key-value 检索任务中显著优于其他技术（ H2O、StreamingLLM 和 RTN 量化）。值得注意的是，Double Sparsity和Double Sparsity-Offloading在性能上表现相当，这表明卸载机制几乎没有造成性能损失。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_ff8a96a22021.jpg)

下图展示了在不同批量和序列长度下，Double Sparsity 与scaled_dot_product_attention （FA2）在延迟和加速方面的全面对比。在A10G GPU上，每种情况至少提速了五倍，超过一半的情况提速超过九倍。值得注意的是，Double Sparsity 在序列长度为4096且批量较大的情况下实现了线性加速。在A100 GPU上，几乎所有情况的处理速度至少提高了四倍，批量更大的甚至可以达到十倍。A10G上小批量加速更明显，可能是因为Triton内核的启动时间，当A100上的内核执行时间较短时，这个时间变得很重要。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_d3f6c6eb2243.jpg)

下图(a)(b)展示了 Double Sparsity 和 gpt-fast 在各个批量和序列长度下的吞吐量比较，单位是每秒处理的token数量。通过部署了Llama-2-7B模型，并尽可能最大化内存使用，以达到高负载条件。结果显示，Double Sparsity 在所有测试条件下都能带来至少1.3倍的速度提升。在某些情况下，速度提升甚至接近两倍，这展示了双稀疏的整体效率。

下图(c)(d)展示了在受限内存占用下，Double Sparsity-Offload 与 FlexGen 的吞吐量对比。两种技术均采用双缓冲区进行异步数据复制。结果表明，在常规工作负载下，Double Sparsity-Offload 实现了对 FlexGen 的 4 到 8 倍加速，在处理长文本（序列长度从 64K 到 256K）的场景下，加速比达到了 16 倍。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_2a3549a7ddf3.jpg)

### SGLang 中应用 Double Sparsity

目前，SGLang 集成了Double Sparsity 可以直接使用，具体见：`https://github.com/sgl-project/sglang/pull/1459` 。

下面是使用 SGLang 中测试离线推理吞吐量的脚本，基于此，可以直接测试 Double Sparsity 的具体吞吐性能。基于SGLang最新版本实测下来，通过Triton实现的Double Sparsity相比于FA3或FlashInfer后端，其性能稍微要更差一些，不过GPU型号（A800、H20、H200）差异不一致。

`model_path=/global/models/Qwen2.5-32B-Instruct
dataset_path=/workspace/data/ShareGPT_V3_unfiltered_cleaned_split.json
ds_channel_path=/workspace/outputs/DoubleSparse-qwen25/models/Qwen2.5-32B-Instruct.json

CUDA_VISIBLE_DEVICES=3 python3 -m sglang.bench_offline_throughput \
    --model-path ${model_path} \
    --dataset-name random \
    --random-input 8192 \
    --random-output 128 \
    --random-range-ratio 1 \
    --dataset-path  ${dataset_path} \
    --num-prompts 1000 \
    --mem-fraction-static 0.9 \
    --attention-backend triton \
    --ds-channel-config-path ${ds_channel_path} \
    --enable-double-sparsity \
    --ds-heavy-channel-num 16 \
    --ds-heavy-channel-type k \
    --ds-heavy-token-num 256 \
    --ds-sparse-decode-threshold 0
`

参数说明：

- --enable-double-sparsity：启动 Double Sparsity
- --ds-channel-config-path：Double Sparsity 通道配置的路径
- --ds-heavy-channel-num：Double Sparsity 注意力中重要通道的数量
- --ds-heavy-token-num：Double Sparsity 注意力中重要Token的数量
- --ds-heavy-channel-type：Double Sparsity中识别重要通道的策略
- --ds-sparse-decode-threshold：使用Double Sparsity进行解码的阈值。如果同一批次的最大序列长度小于该值或者最小序列长度小于重要Token的数量（heavy_token_num），不使用Double Sparsity。
其中，Double Sparsity 的重要通道信息（--ds-channel-config-path）通过如下代码（`https://github.com/andy-yang-1/DoubleSparse/blob/main/config/offline_calibration.py`）生成即可，比如：

`python3 offline_calibration.py \
--model_path  /global/models/Qwen2.5-7B-Instruct \
--output_dir  /workspace/outputs/DoubleSparse-qwen25-7b
`

### 总结

本文介绍了一种新型的训练后稀疏注意力技术 Double Sparsity。其结合了token稀疏和通道稀疏的方法，token稀疏专注于仅使用重要token进行自注意力计算，而通道稀疏则通过使用重要特征通道来识别重要token。受AWQ的启发，Double Sparsity 采用离线校准来预先确定对注意力分数影响最大的通道。同时为了避免不连续内存访问导致的性能下降问题，需使用 Label Cache 存储筛选后的重要 Channel。这里除了存储全量的 Key Cache，还要存储 Label Cache（新增的部分），因此，也增加了显存占用。

参考：

- [Post-Training Sparse Attention with Double Sparsity](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2408.07092)
- [DoubleSparse源码](https://link.zhihu.com/?target=https%3A//github.com/andy-yang-1/DoubleSparse)
