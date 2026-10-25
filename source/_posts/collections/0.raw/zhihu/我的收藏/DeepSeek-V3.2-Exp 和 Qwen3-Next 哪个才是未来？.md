---
title: (2 条消息) DeepSeek-V3.2-Exp 和 Qwen3-Next 哪个才是未来？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/DeepSeek-V3.2-Exp-和-Qwen3-Next-哪个才是未来/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1956137082197083536/answer/1956419187820962012
---


这里准确说不是 sparse_attention 和 linear attention 之争，而是 sparse_attention 和 linear hybrid attention 之争。

我对 linear attention 分析比较少，业内的共识基本是如果仅有 linear attention 会在 long context 长上下文召回上效果差，所以实际落地的 llm 走向了  linear + full hybrid attention 的混合路线。这里隐藏着2个问题：

- 为什么如果仅有 linear attention 会在 long context 召回上效果差？ 
- 为何  linear + full hybrid attention 效果好，接近 full attention 呢 ？
我的粗浅的理解（举例）是：

- linear attention ，比如 Mamba 的 SSM，表征当前token之前语义的 state 的 tensor size 是固定的，并不随着 context length 增加而 size 容量增加，而 full_attention （包括 sparse attention DSA) 是随着 context length kvcache 线性增加的。虽然加了一些 gated delta 变体追求更好的遗忘和记忆，但不改变 size 容量。好比我家里有一个10平米的藏书室，linear attention 每天都买市面上最新的书籍填充其中，当放不下时将觉得用处不大的旧的书籍扔出房间，而full_attention 相当于当快要放不下时我不断加大藏书室，变成一个更大的图书馆，旧的书籍也不需要扔出房间。当某一天遇到特殊情况需要某本旧书时，linear attention 的 state 可能已经丢掉了，而 full_attention 的 kvcache 还一直保留着。如何构建 benchmark 可以测试这类情况呢？
-   linear + full hybrid attention 为什么效果会接近 full attention 呢？ 最近有很多研究在重提 self_attention 低秩的问题，本质是 multi-head self_attention MHA/GQA/MQA 将 hidden_state 分为 num_head * head_dim 后，每个 head 独立完成 attention 计算后concat 成  hidden_state，从 num_head 个子空间（维度 head_dim） concat 到 num_head * head_dim  更大的空间，从低维到高维， 表现在 self_attention 是一个低秩表达。17 年 《Attention Is All You Need》 提到 MHA 每个 head 可以学习到不同的表达，但实际上学习到的共性的内容会更多。20年 《Talking-Heads Attention》 在尝试解决此问题，但是效率明显不如 FlashAttention 实现的 MHA， 今年的 《QUALITY OVER QUANTITY IN ATTENTION LAYERS WHEN ADDING MORE HEADS HURTS》 做了更理论的工作，提到 MHA 不如 一个大的 single head attention。之前做 LLM pretrain 的公司有发现相同参数量下 model 加宽不如加深有效，本质也是用更多层attention来减弱低秩的问题，如果attention低秩问题解决掉，则model 加宽带来的层数减少可以大幅减少 kvcache，降低推理成本。hybrid attention 中层数减少到必要的 full attention 后，是否还需要 linear attention 呢？ 
sparse attention write kvcache 的数量跟 full_attention 一样，但是 read selected kvcache 则少很多，类似图书馆里有全量的书你都权限借阅，但每次最多取 10 本到自己家里。很适合现在多层存储体系，从 gpu mem offload 到 cpu mem ，再到 SSD disk。通过 offload 到更便宜的存储上， DeepSeek/Claude/GPT  都推出了Context Caching ，在 hit 后价格可以降10倍。可以基本认为 write 无限，read 有限，而推理阶段如果 memory bound ，则去优化有限的read 即可。这就是 sparse attention 可以在大幅提高推理效率的前提下还能保持跟 full_attention 近似性能的关键。

[编辑于 2025-10-01 10:11](//www.zhihu.com/question/1956137082197083536/answer/1956419187820962012)・中国香港

​13 条评论​207 ​9 ​分享

​​

收起​