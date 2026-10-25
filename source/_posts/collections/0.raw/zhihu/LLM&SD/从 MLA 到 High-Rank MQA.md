---
title: 从 MLA 到 High-Rank MQA
date: "2026-04-25 00:00:00"
updated: "2026-04-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/从-MLA-到-High-Rank-MQA/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2031149621397935813
---


DeepSeek-V4 的论文里已经基本看不到 MLA 形式的表述了，attention 部分是以原生 shared-KV MQA 的形式出现的，而且这个 MQA 还是 head_num=128(64)，head_dim=512 的 high-rank MQA（通常模型 head_num*head_dim 这个值是和 hidden_size 一个量级，但是 DeepSeek-V4  MQA 已经基本上是8倍了）。

看论文这个部分的时候脑中还是会不断浮现出 MLA的影子，回顾一下过往的历史还挺有意思的。

- <strong>原始的MLA 的 MHA & MQA 两种模式</strong>：在原始的MLA中，算法上本质上是一个 low rank 版本的 MHA；MQA 模式更多是利用矩阵乘法结合律做出的计算重排，主要服务于 decode 阶段的 KV cache 和带宽优化；它并不意味着 MLA 在模型表达上原生就是 MQA。
- <strong>DSA 的 Sparse MQA 模式</strong>：但是Sparse Attention的工作 DSA 中，可以发现 MLA 有一个很重要计算形态：由于 KV 被所有 query heads 共享，单个 query token 上的计算强度已经足够高，MQA 形式下计算强度已经足够高可以接近达到计算bound的区域了。因此 token-level sparse attention 在工程上开始变得可行，不一定非要像传统 GQA block sparse 那样依赖较大的连续 block 来提高 Tensor Core 利用率。这样即使在 prefill 阶段使用 Sparse MQA 形式依然可以将算力打的比较高。这种方式缺点是 head_dim 从192/128 变成了 576/512，FLOPs 增加了接近 4倍，计算效率比 dense attention 更低，还增加了indexer、topk、并行的复杂度等。但 sparse attention 在序列维度大幅减少了参与计算的 KV 数量，因此可以在长上下文场景下抵消这部分额外开销。
- <strong>纯 MQA 形式</strong>：到了这一步，长上下文prefill 、decode 甚至长文训练都已经可以变成 Sparse MQA 形式，只是在短文 prefill/训练 dense MHA 才更有优势。到了这个程度，特别是1 Million 这种上下文目标下，不太需要保留 MLA 的 MHA/MQA 两种模式，直接使用原生 shared-KV sparse/compressed attention MQA 更自然。
- <strong>其他优化</strong>：再叠加一些之前我看到过的技术观点，比如 KVShared（[文章](https://link.zhihu.com/?target=https%3A//www.spaces.ac.cn/archives/11111)），large head_dim MQA([​文章1](https://link.zhihu.com/?target=https%3A//www.spaces.ac.cn/archives/10907)[​](https://link.zhihu.com/?target=https%3A//www.spaces.ac.cn/archives/11111) [文章 2](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2412.19255v1))，VO ROPE（[文章](https://link.zhihu.com/?target=https%3A//www.spaces.ac.cn/archives/10862)），compressed block（[文章](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.11089)）后，我看到这样一个 head_num=128，head_dim=512 的 MQA 反而觉得推导逻辑挺自然的(虽然自然并不一定代表最合理)。至少从工程架构来看，MLA 这种 prefill-decode 不一致的复杂实现确实需要迭代的；但是事后来看 MLA 也确实引出了比较独特的 attention 迭代路径。当然我不清楚 DeepSeek 内部真实的迭代轨迹，这里只是从一个第三者的视角来看到的回顾。

之前在讲 SWA 参数选择的时候，我提过一个[思路](https://www.zhihu.com/pin/2001833604834154442)，那就是对于 SWA 这种缩小上下文的 attention 实现，可以考虑增加query head、KV head、甚至head_dim来补足效果。从这个角度来看，head_num=128，head_dim=512的 MQA 更像是这个思路在 sparse attention 下的一个极致参数选择。当然没有 MLA，我觉得我是大概率不会想到去尝试 shared-KV 这个思路的。