---
title: "LLM 参数稀疏化的抽卡效应"
date: "2025-12-10 00:00:00"
updated: "2025-12-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/LLM-参数稀疏化的抽卡效应/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1982161335891551883"
---


LLM 参数稀疏化的抽卡效应

极客博哥
​
公众号“边际效应”，独立博客  yangwenbo.com

收录于 · 边际效应

24 人赞同了该文章

现在很多模型都采用了 MoE 架构，也有很多模型在探索稀疏 Attention，但我们会发现激活参数量、激活 Token 量和最终的性能不是那么地线性相关，甚至有时候反而性能会劣化。

探究其中的原因，其实这些稀疏化措施落实在真实的计算中，可能没那么稀疏。这里我以显存访问为例，估算稀疏化实际能减少的显存访问量。我将每次稀疏化选择（TopK）当作一次抽卡，每次抽 K 张卡，预估 N 次以后会抽到多少张不重复的卡。

你会发现，多次抽卡和一次抽卡，集卡总数有着数倍的差异，我把它叫做抽卡效应。

MoE
MoE 里要抽的卡就是专家，在每一层总共 N 个专家，每次 TopK 计算抽 K 个。在 Decode 阶段，Batch 中的每个 Deocde Token 就是一次抽卡，那在整个 Batch 计算中，被激活的总专家数，就是 B 次抽到的不重复卡数。

这个数该怎么估计呢？假设这个抽卡的概率是均匀的，也就是每个专家被激活的概率相同，随便扔给一个模型，应该就能给出下面这个公式：

总共有 N 张卡，每次抽 K 张，经过 B 次后，抽到的不重复卡的期望是多少？

通过这个公式，我们就可以计算出，不同的 Batch Size 下，在一步 Decode 计算中，MoE 被激活的专家数期望（概率均值）是多少。我根据这个公式，画出下面两幅图：

DeepSeek-R1 在不同 Batch Size 下 Decode 一步激活的专家数期望值（假设概率相等）
Qwen3-A3B 在不同 Batch Size 下 Decode 一步激活的专家数期望值（假设概率相等）尤其是 Qwen3-A3B，我们可以看到，当 Batch Size 为 32 时，激活的专家数已经达到 111.8，相当于总专家数的 87%。也就是说，虽然每个 token 只激活了 3B，但 Batch 32 时，解码计算中激活的总参数量至少高达 26B。

只是这些参数的计算规模会小一点，但你至少要将它们从显存中读取一次。在 Decode 这种 memory bound 的计算场景下，并不是一个小的开销。

这也是我们为什么不能把 A3B 的吞吐等同于一个 Dense 3B 的吞吐。在实际追求吞吐的场景中，A3B 大概是和一个约 9B 的 Dense 模型性能相当。

在 prefill 计算中，相当于 Batch*Seqlen 次抽卡，那激活的专家数就更多了。

Sparse Attention
稀疏 Attention 里要抽的卡是 KV Cache，所以它和 Batch 无关，只和 Seqlen 有关，重复抽卡主要发生在 prefill 阶段。假设这里使用的是 DeepSeek Sparse Attention，序列长度为 N，每次通过 indexer 抽取 TopK，但是每个 Token 只能抽自己前面的 Token。被激活的总 Token 数，就是 N 次抽卡的抽到的不重复 token 数。

这个数该怎么估计呢？假设这个抽卡的概率是均匀的，还是扔给模型：

假设初始有 K 张卡，每次抽 K 张，每抽 1 次，增加 1 张卡，总共抽 N-K 次，抽到的不重复卡的期望是多少？
模型给我的都是非常简洁的答案，比如：E = N - 2 或者 E = N * K / (K+1)，总之非常接近 N，我也懒得验算了。

也就是说，在 DSA 的 prefill 计算中，仍然几乎所有 Token 的 kv 都会参与到计算中，区别仍然是计算强度。但别忘了，indexer 也有自己的 kv 计算，也有自己的 kv cache。计算强度下降，访存还增加了，也许有可能导致 prefill 从 compute bound 变成 memory bound（瞎写的，没测算）。

DeepSeek V3.2 Exp 的报告里有这样一句：

Note that for short-sequence prefilling, we specially implement a masked MHA mode to simulate DSA, which can achieve higher efficiency under short-context conditions.应该也是应对在短上下文场景下，稀疏化反而导致性能劣化严重的情况。

发布于 2025-12-10 18:56・北京
​赞同 24​​2 条评论​33 ​喜欢​分享

​申请转载​​

未登录用户

2 条评论

默认
最新

momo

对大厂来说，通常会通过大batch size把MoE部分也推到memory-compute bound交界点

2025-12-15 · 上海

​回复​1

zeeeee

我觉得这可能得看情况吧？大moe可以组大集群去做load balance，但小moe在不牺牲延迟的情况下只能靠单卡硬抗，后者自然效率不够高。不过有一类特殊情况，比如端侧大容量低带宽的内存，这时候假如对批大小要求不高，那moe仍然是相对划算的
2025-12-15 · 美国

​回复​1

关于作者

极客博哥​
公众号“边际效应”，独立博客  yangwenbo.com

回答
66
文章
35
关注者
1,931

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

【图解LLM · RL】之：模型加速/量化/剪枝/梯度累积/梯度重计算
叶子哥AI发表于【图解LL...

LLM 大模型学习必知必会系列(六)：量化技术解析、QLoRA技术、量化库介绍使用（AutoGPTQ、AutoAWQ）
LLM 大模型学习必知必会系列(六)：量化技术解析、QLoRA技术、量化库介绍使用（AutoGPTQ、AutoAWQ）模型的推理过程是一个复杂函数的计算过程，这个计算一般以矩阵乘法为主，也就是涉及到了并…

汀丶人工智...发表于NLP

LLM开源模型：deepseek V3 学习
akaih...发表于LLM(大...

LLM CoT 数据合成方法
思维链（CoT）数据的质量直接决定了大语言模型（LLM）的逻辑推理能力，目前学术界已形成多条成熟的自动化合成路径。一种主流方式是利用黑盒模型或高性能教师模型进行蒸馏，例如通过多样化提…

wuuu