---
title: "停止在旧基准刷分: KV Cache压缩改进空间在哪里？"
date: "2026-02-06 00:00:00"
updated: "2026-02-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/停止在旧基准刷分_-KV-Cache压缩改进空间在哪里/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2003133660560377265
---


投完ICML，借着休息的机会来分享一下KV Cache压缩领域中自己认为的Top-1重要的点：<strong>恰当评估是算法改进的基石，如果没有适当的评估基准，就很难有算法改进。</strong>如果我们只是在已经过时的评测中卷一两个点的增量，那么不管付出多少努力，算法的真实价值和贡献其实是被严重限制的。那么在KV Cache压缩的领域中，许多研究者会认为现有KV Cache领域能做的几乎都差不多了，现有的很多文章中似乎压缩到5%几乎无损，哪里还会有改进的空间呢？

<strong>PS：</strong>针对下面讲的KV Cache压缩评测缺陷，我们在最新 <strong>ICLR 2026</strong> 工作 DefensiveKV ：[Taming the Fragility of KV Cache Eviction in LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2510.13334)开源代码中提供了全新评测体系一键运行的评估方案，欢迎使用。过几天有时间还想要写一篇博客讲解一下Defensive这个工作，个人感觉很有趣，直接challenge了底层假设，仅仅只需要两行就在现有算法上就带来显著的提升，欢迎关注。

下面进入正题！

其实我在一年前的知乎博客中提出过一个全新且更贴近现实场景下评估方式or研究方向：<strong>问题指令无关下的Cache压缩</strong>。现在回头来看其实这个观点还是比较前瞻的，当下一些新的感觉很有趣的工作比如KVZip (NeurIPS Oral) 包括我们最新 ICLR 26的中的[DefensiveKV: Taming the Fragility of KV Cache Eviction in LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2510.13334), 都在这个全新的方向中做出了显著的提升。虽然这一视角，我们在之前的AdaKV以及这次ICLR26的工作都展示了充分全面的评测，但仍有审稿人会有疑问：为什么在你的文章中会有这么大的算法提升空间？

[KV Cache压缩新阶段:走向问题指令无关下的压缩探索](https://zhuanlan.zhihu.com/p/21106979890)
这就必须讲到现有评估的三个缺陷严重掩盖了改进空间
现有主流的评估方式普遍遵从NeurIPS 24中很有影响力的SnapKV工作中的设定：将Longbench或者大海捞针中的样本输入给LLM，再每一层做完Prefilling之后压缩KV Cache到一个固定预算（128，512或者1024），这样可以有效降低峰值显存并同时加速decoding。这套评测在提出时有效促进了整个领域的进步，但在一年半以后来看存在三个严重的缺陷。

缺陷1：问题指令依赖性（Query-aware）
旧的评估设定中存在一个比较大的问题是：它们往往将上下文（Context）<strong>与特定的问题指令（Query）拼接后</strong>，同时输入给模型进行压缩。这种做法本质上是在已知问题的情况下进行压缩——<strong>算法只需保留与当前问题相关的信息即可，难度被大幅降低</strong>（有点类似于RAG？）。

然而，这种Query-Aware的设定与现实广泛的LLM应用场景（如<strong>Prefix Caching</strong>）有着很大的gap。比如在现实中，用户会上传一个离线文档（Context）作为前缀缓存，随后可能会针对该文档提出任意的、连续的多个问题。此时，如果文档上传后进行Prefilling成Prefix KV Cache，<strong>压缩算法根本无法预知用户未来会问什么</strong>。同样的道理多轮对话中的压缩也有这个问题。

解决这个问题的一个方法是采用多轮对话设定下的长上下文数据集，比如SCBench（一个非常全面的长上下文数据集），或者转换一个指令无关（Query-Agnostic）评估方式：<strong>强制将上下文单独输入模型进行Prefill和压缩，待压缩完成后，再输入问题指令进行推理。只有切断了压缩阶段对问题的感知，才能真正检验算法在面对未知任务时的鲁棒性。</strong>

上下文##########################################################
Task Template:Answer the question based on the given documents. Only give me the answer and do not output any
other words.The following are given documents.
Document 1:
{document-1}
......
Document x:
{document-x}
......
Document n:
{document-n}
问题指令###########################################################
Answer the question based on the given documents. Only give me the answer and do not output any
other words.
Question: {question}
Answer:

缺陷二：固定压缩预算引入偏差
目前主流评估中另一个严重的隐形陷阱在于<strong>固定预算设定</strong>。在诸如SnapKV等经典工作的设定中，通常会将KV Cache压缩到一个绝对数值（例如 1024 tokens）。这种做法乍看之下是为了统一显存开销，但在面对长短不一的真实数据分布（如LongBench）时，却引入了极大的<strong>评估偏差：因为样本长度极度不平衡，固定的Cache Size实际上导致了完全不同的压缩率。</strong>

![](https://pic3.zhimg.com/v2-770cbe4076d2e0b5a9d483f7b7b1cfd0_r.jpg)Longbench 不同数据集中样本长度分布统计以 LongBench 为例，如果我们统一设定 Cache Budget 为 1024：

- 在 <strong>Qasper</strong> 数据集上，平均保留了约 <strong>19.9%</strong> 的KV对；
- 在 <strong>Multi_News</strong> 数据集上，平均KV Cache size约为 <strong>38.9%</strong>；
- 而在 <strong>PR-en</strong> 数据集上，平均KV Cache size骤降至仅 <strong>8%</strong>。这种剧烈的波动揭示了两个严重的问题：

- <strong>掩盖了长文本上的失效：</strong>LLM 本身的一个特性是“上下文越长，性能往往越差”。如果一个数据集（如 Multi_News）中超过 92% 的样本长度都小于 5K tokens，甚至有 15.5% 的样本根本不需要压缩（长度 ≤ 1024），那么在这个数据集上，所有的压缩算法实际上都在“作弊”——它们在处理简单的短样本时保留了远超预期的信息量（甚至 Full Cache），从而拉高了平均分。这并不是算法真的在长序列中提取精华的能力有多强，而是<strong>测试样本中有大量实际上并未被深度压缩的短样本在撑腰</strong>。如果模型仅在短样本（≤1024）上有效，而在真正的长样本上崩盘，这种固定预算的评估方式会将两者混为一谈，导致我们也无法区分不同算法在极端压缩下的鲁棒性差异。
- <strong>失去了横向比较的公平基准：</strong>当不同数据集的实际压缩率从 8% 到 39% 不等时，我们在不同任务上比较算法性能就变得毫无意义。一个算法在 Multi_News 上表现好，可能仅仅是因为这个数据集上拥有更高的Cache size，而不是因为它在摘要任务上很强。因此，基于比例压缩（Ratio-Based）的评估才是更科学的方向。我们建议所有样本都处于相同的压缩压力下（例如统一保留 20% 或 10%），无论样本本身是 4K 还是 32K。只有在这种严格控制变量的设定下，不同算法对于关键信息的筛选能力才能被公平的对比。

缺陷三：单一、简单的大海捞针评测无法区分实际性能
大海捞针（Needle-in-a-Haystack）作为一种基于合成数据的长上下文评估方法，已被广泛采用。<strong>然而，如果仅仅停留在单一、简单的评估形式上，这类测试几乎无法区分不同方法的真实差异。</strong> 这正是为什么现有许多工作能够轻易宣称：KV Cache压缩方法即便压缩到千分之一（0.1%）的大小，依然能够保持&#34;近乎无损&#34;的性能。

<strong>但现实远非如此美好。</strong> 事实上，只需稍微改变一下测试条件——比如更换一个大海捞针的prompt措辞，或者切换到更困难的多针召回任务——这些看似完美的压缩方法的性能就会立刻崩掉。

<strong>我们的建议是采用 RULER Benchmark 进行更全面的评估。</strong> RULER 包含了丰富多样的大海捞针评估变体：从单针到多针，从简单提示到复杂指令形式，能够有效揭示不同算法在多样化任务中的真实表现。

举一个具体的例子：在 20% Cache size 的设置下，

- <strong>NIAH_Single_1</strong> 任务中，大部分压缩方法都能达到接近 100 分，几乎看不出损失；
- 但在 <strong>NIAH_multikey_3</strong>（多键召回）任务中，所有方法的得分都很难超过 30 分。<strong>这种巨大的性能落差清楚地表明：真正的提升空间并非不存在，而是被过于简化的评估方式所掩盖。</strong>

![](https://pica.zhimg.com/v2-147d72a73d934355b95c7e9342b5d184_r.jpg)任务指令无关下的Ruler 评估
我们提供的解决方案：
既然指出了旧Benchmark的三个致命缺陷，我们就必须拿出解决方案。在我们的最新 ICLR 2026 工作<strong>DefensiveKV:</strong>[Taming the Fragility of KV Cache Eviction in LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2510.13334)中，我们在NVIDIA KVPRESS仓库的基础上，开源了一个集成上述改进的全新评估方案。

<strong>💡 极速验证体验</strong>：即使只有一张<strong>RTX 4090</strong>，你也只需<strong>1小时</strong>，就能亲身体验到一个更真实、更残酷、也更有改进空间的评估环境。

<strong>📉 令人震惊的性能真相</strong>：在旧的Benchmark中，业界普遍认为20% Cache Size足以实现“无损压缩”。但在修正了上述三个缺陷后，真相浮出水面——经典的<strong>SnapKV</strong>在同样的20%压缩率下，均分仅剩<strong>39.01</strong>。这直接击碎了“无损”的幻象。

<strong>🚀 我们的进阶之路</strong>：正是因为有了这个更准确的“标尺”，我们才得以在后续的一系列工作中实现质的飞跃。从 <strong>AdaKV</strong> 到 <strong>AdaCriticalKV</strong>，再到最新的 <strong>DefensiveKV</strong>，我们一步步将分数从 <strong>39.01 拉升至 91.42</strong>！

值得一提的是，这三个工作分别从完全正交的视角切入解决问题，这意味着它们可以<strong>无缝衔接</strong>到你现有的压缩方法中，带来叠加收益。欢迎各位研究者关注我们的开源仓库，在这个全新的赛道上共同探索！

![](https://pic3.zhimg.com/v2-e68c0ffad3fcf294c7c26cd5bc780b22_r.jpg)20% Cache Size下，4K RULER中不同任务的评估结果[Github Repo] 欢迎Star~

[FFY0/DefensiveKV](https://link.zhihu.com/?target=https%3A//github.com/FFY0/DefensiveKV)[Our Paper]

[Ada-KV: Optimizing KV Cache Eviction by Adaptive Budget Allocation for Efficient LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.11550) NeurIPS 2025

CriticalKV: [Identify Critical KV Cache in LLM Inference from an Output Perturbation Perspective](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.03805) Arxiv

DefensiveKV: [Taming the Fragility of KV Cache Eviction in LLM Inference | OpenReview](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DnJgS06sX3O) ICLR 2026

ref: 之前关于KV Cache压缩的文章分享
[(1 封私信) KV Cache压缩新阶段:走向问题指令无关下的压缩探索 - 知乎](https://zhuanlan.zhihu.com/p/21106979890)

[分享最新ICLR25 Submissions中LLM KV Cache压缩领域部分工作（Budget Allocation in KV Cache Compression） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/3284687442)

[如何提升LLM KV Cache压缩质量？A Promising New Direction:Head-wise自适应压缩预算分配（高效LLM推理） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/2095621211)