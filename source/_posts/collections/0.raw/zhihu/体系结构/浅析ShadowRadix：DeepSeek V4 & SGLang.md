---
title: 浅析ShadowRadix：DeepSeek V4 & SGLang
date: "2026-04-26 00:00:00"
updated: "2026-04-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/浅析ShadowRadix-DeepSeek-V4-SGLang/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2031708802161046746
---


当GPT-5.5, Claude Opus 4.7等模型接连登场时，DeepSeek V4的压轴亮相，以其对推理内存和计算的极致优化，或许为这一轮模型大战打响了最后一枪。SGLang对DeepSeek的支持更是其提升真实部署能力的关键。两天前，DeepSeek V4发布。非常激动看到SGLang在发布的Day-0就对DS的新架构和技术进行了支持，具体如下：

![](https://pic1.zhimg.com/v2-435c81c2e84bc8c290b3a553c9948528_r.jpg)对Sparse和RL Training理解尚浅，这篇文章我就简单对**ShadowRadix**进行解析，同时许愿在RadixTree上做的这篇推理加速工作中稿！

![](https://pica.zhimg.com/v2-e2304d9d84a3ff7a536ad25b9f75aab4_1440w.jpg)
DeepSeek V4发布 —— 主流模型大战的最后一枪
风云变幻，两周左右的时间之内，Qwen-3.6, GLM-5.1, Opus-4.7, GPT-5.5, GPT-image2先后发布，DeepSeek虽迟但到，在前天发布了V4模型。之前对模型的更新并没有深入研究，更关注实际的使用体验；但是昨天月球大叔直播了SGLang对DS的支持更新，其中提到了我比较熟悉的RadixTree KVCache的架构支持，遂Deep Research一下。

Paper: 

[DeepSeek_V4.pdf · deepseek-ai/DeepSeek-V4-Pro at main](https://link.zhihu.com/?target=https%3A//huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf)
![](https://pic3.zhimg.com/v2-a8cd77c146e0a699cd8595c1dcf4403c_r.jpg)
DeepSeek V4 -- 性能跃迁

![](https://pic3.zhimg.com/v2-7d150b3811b32c86faa49e2356adabee_r.jpg)在benchmark上跟御三家分庭抗礼；推理时占用的内存和计算资源大幅下降，带来了上下文窗口的提升，已经**支持1M的context**。实际使用的体验来看，**用户感知的推理速度**也有了提升。

Hybrid Attention Architecture
DeepSeek V4使用了混合的注意力架构：

**CSA: Compressed Sparse Attention**

**HCA: Heavily Compressed Attention**

**SWA: Sliding Window Attention**

其中SWA的设计是为了访问block内部的token，解决了两个问题：（1）block内部的token信息丢失（2）block中token互相不可见。
下面看看CSA和HCA，然后引出正题。

CSA

![](https://pic4.zhimg.com/v2-4633f9c12f247b8b94febaa8d8b5495d_r.jpg)Core Architecture of CSACSA的核心思想是：先压缩KV，再按照打分看最重要的top-k blocks，目标是降低计算和内存压力

Step1: 每 m 个 token → 压成 1 个 KV   -->  Step2: 每个 query → 只看 top-k 个压缩块

其中压缩，打分机制和注意力计算的细节内容请参考paper。其中负责打分的indexer本质上是lightweight的ANN；最终的系统只需要存储CSA KV: n / m和indexer KV: n / m tokens。

HCA

![](https://pic2.zhimg.com/v2-ce274ad630bd03c67858f652d98b9695_r.jpg)Core Architecture of HCA直觉上理解：CSA 是压缩 + 选 top-k ；而HCA 是更强的压缩（m&#39; >> m） 但不做筛选（dense attention）；同样这部分的技术细节也请参考paper。

SWA, CSA, HCA的协同设计实现了面对长上下文，**粗细结合**，“**盲选”和“精筛”结合的design insights**；同时这种架构也天然对KVCache的存储设计提供了耦合的接口。

DeepSeek V4 KV Cache Storage
使用GPT-image2画了一张Arch图，感觉不错：

![](https://pica.zhimg.com/v2-56f2b64b6bc1d65e475527090bf96bce_r.jpg)DeepSeek-V4 的 KV cache 分成两类：**State Cache** 和 **Classical KV Cache**。

1. State Cache
State Cache 存储与当前 sequence 状态相关的内容，每个请求分配一个固定大小的 cache block。

主要包含：

- **SWA KV**
 
- 存最近 `n_win` 个 token 的未压缩 KV
- 用于 Sliding Window Attention

- **Uncompressed Tail State**
 
- 存 CSA / HCA 中尚未形成完整压缩块的尾部 token
- 这些 token 需要暂存，直到可以执行压缩
2. Classical KV Cache
Classical KV Cache 存储已经压缩完成的 CSA / HCA KV entries。

主要包含：

- **CSA KV**
 
- 每 `m` 个原始 token 压缩成 1 个 KV entry

- **CSA Indexer KV**
 
- 用于 lightning indexer 计算 top-k 选择

- **HCA KV**
 
- 每 `m&#39;` 个原始 token 压缩成 1 个 KV entry
- 其中 `m&#39; >> m` 
3. Block 对齐方式
Classical KV Cache 中，每个 cache block 覆盖：

L = lcm(m, m’)

因此每个 block 产生：

CSA compressed entries: k1 = L / m 

HCA compressed entries: k2 = L / m’

SGLang ShadowRadix 
SGLang官方issue：

[[Feature] UnifiedRadix support hicache for DeepSeekV4 · Issue #23639 · sgl-project/sglang](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/issues/23639)
![](https://pica.zhimg.com/v2-d936fd14481600088b272160bebf5c92_r.jpg)4.25 直播切片 ShadowRadix从图中我们可以看出，Shadow这个名字很帅气直接：RadixTree中的存储可以映射不同状态的KV上。

传统 RadixAttention 的逻辑
SGLang 原本的 RadixAttention 很好理解。多个请求如果有相同的前缀，比如相同的 system prompt、相同的 few-shot examples、相同的工具描述，系统就不需要反复 prefill 这些内容。

传统模型里的 KV Cache 大致是这样的：

![](https://pic3.zhimg.com/v2-c4072165cc84d0f9277fb6708c2e8b56_r.jpg)Traditional KVCache所以 radix tree 只需要维护：prefix tokens → KV cache indices

请求来了之后，SGLang 在 radix tree 里找最长公共前缀。如果命中，就直接复用这段 prefix 对应的 KV Cache，只计算后面新增的 suffix。

这个机制对普通 dense attention 模型非常有效。它的核心前提是 KV Cache 基本同质，每个 token 在每一层都有一份结构相似的 K/V 状态。

但是由上文，DeepSeek V4中的token prefix有下面几种状态：

- CSA compressed KV      
- CSA indexer KV         
- HCA compressed KV     
- SWA uncompressed KV    
- tail state         推理引擎需要管理：prefix → compressed KV + indexer KV + SWA state + tail recovery boundary

这就是 ShadowRadix 出现的背景。

ShadowRadix 的核心思想
ShadowRadix 最关键的设计是：**radix tree 层面只维护 full-token logical prefix，不直接把异构的物理状态作为 tree key。**

可以理解成两层：

逻辑层：原始 token prefix负责 prefix identity 和最长前缀匹配
物理层：根据 logical prefix 派生出 c4 / c4_indexer / c128 / SWA / tail state

也就是说，ShadowRadix 不是给每种 KV 状态都单独建一棵树，而是统一用完整 token 序列作为逻辑身份。

图示如下：

![](https://pic4.zhimg.com/v2-aeb3fa729b5a4f7d1b03112ae59aa81d_r.jpg)ShadowRadix这种设计避免了一个很麻烦的问题：同一个 prefix 在不同物理 cache view 里的长度是不一样的；如果分别索引，cache consistency 会变得非常难维护。ShadowRadix 选择用 full-token logical span 作为唯一身份，然后从这个逻辑 span 派生底层物理 KV 的位置。

ShadowRadix 和 HiCache 的配合
SGLang 的 HiCache 是一个分层 KV Cache 机制，会把 KV Cache 从 GPU 扩展到 CPU memory 和外部存储。普通场景下，它解决的是 GPU 显存装不下所有 prefix KV 的问题。

在 DeepSeek-V4 上，HiCache 和 ShadowRadix 的配合更复杂。当前公开设计中，HiCache 主要 offload compressed KV path，而不offload SWA。原因是SWA体积过大，如果频繁读写会导致较大延迟，无法更新。

从用户输入prompts，全流程的多级KVCache管理执行过程如下：

![](https://pica.zhimg.com/v2-3c2122e7a8062d4bfe06e137c695b5d0_r.jpg)Hicache Management这个对KVCache多级管理方案的支持为其部署能力提升做出贡献，也为异构注意力下的KVCache管理提供更多的研究基础。在agent繁荣的时代里，long-context就是需要快好省的全栈架构，真正让模型能力转化为生产力。

优化前景
首先，hybrid下的correctness boundary 复杂很多。普通 prefix cache 只需要保证 token prefix 一致。DeepSeek-V4 还要处理 compression boundary、SWA window boundary、tail incomplete block、page alignment、GPU/CPU/storage tier 等问题。任何一个边界处理错，都可能出现“看起来命中 prefix，但恢复出的 attention state 不完整”的问题。

其次，SWA不offload，会带来额外的计算延迟。减少存储和 I/O 压力的代价是 prefix 命中后仍然需要 replay 一段 token 来恢复 SWA 状态。意味着 cache hit latency 由三部分组成：compressed KV load latency + replay latency + suffix prefill latency；个人感觉其中存在读写加速/replay加速的优化策略。