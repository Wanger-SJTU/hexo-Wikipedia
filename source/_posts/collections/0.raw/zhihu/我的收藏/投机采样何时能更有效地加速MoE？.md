---
title: "投机采样何时能更有效地加速MoE？"
date: "2025-09-22 00:00:00"
updated: "2025-09-22 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/投机采样何时能更有效地加速MoE/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1953404630793977905"
---


<strong>MoESD: Unveil Speculative Decoding's Potential for Accelerating Sparse MoE</strong>

论文链接：[[2505.19645] MoESD: Unveil Speculative Decoding's Potential for Accelerating Sparse MoE](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2505.19645)

投机采样（Speculative decoding, SD）是一种近年来流行的对LLM推理进行无损加速的方法，其加速的核心思想是：首先采用低成本模型（draft model）快速猜测若干draft tokens，然后原本的大模型（target model）再并行验证并保留正确的token。相比于标准的auto-regression解码，SD相当于实现了推理一次就能产生多个token的效果。然而，SD主要被运用在dense模型中，现有观点认为在MoE上SD性能会下降（如[EAGLE](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.15077)中的实验，dense模型上普遍有3~4倍加速，而MoE上只有1.5倍左右）。

然而，这就是SD for MoE的全貌吗？我们刚刚接受为NeurIPS 2025 spotlight的论文对上述问题进行了深入讨论，发现居然有时候SD能给MoE带来比dense模型更好的加速效果。希望能为投机采样和MoE推理加速这两个热门领域带来一些新的思考角度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_175ab8c311a3.jpg)

#### 核心贡献

- 基于理论分析，<strong>挑战了现有SD加速MoE的观点：</strong>传统观点认为SD更适合dense，本文则指出在中等batch下，SD反而会更适合MoE。
- 以此为契机，<strong>提出了评价SD的系统层面新指标（target efficiency）</strong>：现有工作往往用接收率（acceptance rate）来评价SD。然而，即使接受率相同，SD的性能也会很显著地变化，这意味着还有其他因素没有被发掘。我们的新指标填补了上述空白。
- <strong>设计了对于SD加速MoE的建模方法</strong>：既然有了理论分析，是否能直接模拟出SD加速MoE各种负载下的性能呢？我们对上述问题进行了尝试并得到了比较匹配的情况。
- 使用场景分析：我们的结论可被直接用于加速私有部署、SLO紧、或者MoE专家被offload等情况。

#### 1. 为什么之前的工作观察到了SD在MoE上的性能下降？

SD加速可以formalize成以下形式。其中， T_{AR} 表示auto-regression解码的时间，等于生成序列长度 S 乘以target model前向一次的时间 T_T(B,1) （下标 T 表示target model，括号内 B 表示负载的batch size，1代表AR每次只处理一个词）。 T_{SD} 表示投机解码的时间，等于执行的轮数 R 乘以每轮的时间。每轮时间可以具体表达成： \gamma 次draft model前向推理的时间 T_D(B,1) ，加一次target model并行验证的时间 T_T(B,\gamma) ，加reject sampling的时间 T_{reject} 。

$$Speedup = \frac{T_{AR}}{T_{SD}} = \frac{S \cdot T_{T}(B,1)}{R \cdot \Big(\gamma \cdot T_D(B,1) + T_T(B,\gamma) + T_{reject}\Big)} \\     = \frac{S}{R} \cdot \frac{1}{\gamma \cdot \frac{T_D(B,1)}{T_T(B,1)}+\frac{T_T(B,\gamma)}{T_T(B,1)}+\frac{T_{reject}}{T_T(B,1)}} $$

$$当 B 较小时，LLM是<strong>memory-bound</strong>，执行时间主要受参数量影响，dense模型的 \frac{T_T(B,\gamma)}{T_T(B,1)}\approx 1  。然而，对于MoE模型，由于需要同时验证 \gamma 个token，会激活更多的专家，从而需要加载更多的参数，导致  1">\frac{T_T(B,\gamma)}{T_T(B,1)}> 1 ，这下Speedup就减小了。下面是从eagle中截取的实验结果，和上述分析匹配。$$

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8d884fbd2bea.jpg)

左边是各种dense模型，加速比在3倍左右；右边是Mixtral 8x7B，加速比下降到1.5x
#### 2. 为什么SD又能有效加速MoE了？

分析清楚上面SD不适合MoE的原因后，找到SD能有效加速MoE的区间也很直接，就是想办法减小 \frac{T_T(B,\gamma)}{T_T(B,1)} ，使其再接近1附近。具体来说，即通过增加batch size B ，使原本一次AR推理就激活<strong>所有</strong>专家。如此一来，验证 B\times \gamma 个token则不会带来更多的专家加载，从而使该值下降。给定 t 个计算的token，其激活的专家数 N(t) 表达式如下（ E 表示模型的总专家数， K 表示路由专家数），具体推导过程可以看论文。

$$N(t) = E\times(1-(\frac{E-K}{E})^t) $$

然而，上面这种方法同样是有限制的。如果 B 特别大，则有可能使得AR或者SD验证进入<strong>compute-bound</strong>的区间。此时，GPU运行时长主要受计算量影响， \frac{T_T(B,\gamma)}{T_T(B,1)}  又可能增长并趋于 \gamma 。幸好，当专家全部激活时，MoE相比dense模型实际上更加memory-bound，而且需要更多的token才能转换入compute-bound的区间。也就是说，<strong>在batch size较大时，SD会更加适合MoE而不是dense模型</strong>。这和传统的结论形成了鲜明的对比。

实验的情况验证了我们的想法。可以看见，虽然 B 较小时SD的加速比在dense模型上更大，但是 B 增加后SD在MoE上的加速比实现了反超。反超的程度略有不同，这主要是因为不同temperature和draft length下SD的猜测准确率有所不同。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6446be6e45d0.jpg)

随着batch size的增加，SD speedup for MoE v.s. SD speedup for Opt
#### 3. 影响SD性能的原因归纳和新指标的提出

可以看到，在上文的分析中， \frac{T_T(B,\gamma)}{T_T(B,1)} 这个比值一直是我们关注的核心。这个值增加，就带来SD speedup的下降。因此，我们将这个值的倒数定义成一个新的指标，<strong>target efficiency</strong>，用于从系统的角度理解SD的效果。其中的target指的是target model，因为这个指标只和target model的模型结构和负载有关，而和小模型/训练程度等其他因素无关。

以往的SD算法工作关注acceptance rate，其回答的问题是：

<strong>给定一个大模型，如何得到一个小模型</strong>使其得到更好的加速？而这个metric回应的问题实际是：

<strong>给定了算法优化的水平，什么样的负载或者目标模型</strong>更加<strong>偏好</strong>投机采样这种加速方法？在实际开发中，研究人员可能需要分析，如果acceptance rate可以训练到特定水平，此时SD预期能获得多少收益；若大小模型对齐程度已经很高，SD潜在的系统瓶颈在哪。target efficiency都有助于揭示其深层原因。

下图体现了target efficiency和SD speedup确实有很强的关联。相比之下，现有的acceptance rate这个指标在不同batch size下仅有微小浮动，难以解释SD如此剧烈的性能变化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0e1023b9d51b.jpg)

提出的新指标，target efficiency和speedup的匹配程度良好。相比之下，现有指标acceptance rate则完全无法反应SD speedup在不同batch size下如此剧烈的性能变化（不同batch size下acceptance rate没有什么显著变化）。
#### 4. 建模验证

在有了上述理论分析的基础上，我们还做了一个尝试，即对SD加速MoE进行建模。这样做的动机有两个：

- 如果建模能和实际情况匹配，则进一步验证了理论分析的正确性；
- 建模之后，SD加速MoE的过程将变得更加透明、容易分析。实际上，在初期实验中我们观察到了违背预期的情况，而这个模型正是在分析该意外情况时逐渐建立起来的。GPU运算时，除MoE特有的稀疏专家结构，Attention部分也有影响（Amdahl's Law），需要综合考虑。
建模时首先通过profiling确定了一些和系统/算子实现的有关的超参，然后将超参代入理论分析可得完整的SD speedup建模。建模的细节、模型如何辅助分析受篇幅所限请参考论文，下面展示了建模和实际测量的匹配情况，基本上描述了各种情况下的走势。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e6c3ae097350.jpg)

#### 5. 使用场景分析

本文的工作主要是一个发现而非设计了新的算法。下面讨论了一下这个发现可以被运用在哪些情况以取得明显的推理加速：

- 私有部署场景下。此时batch size不会像公共LLM serving那么大，但是又比边端大得多。
- SLO非常紧的时候。此时，很大的batch size会导致latency违例，因此也只能运行中等batch。
- 当GPU显存非常有限，expert被offload到CPU memory上时。此时，如果还希望使用GPU的高算力，则需要忍受PCIe的低带宽，系统变得更加memory-bound。
另一方面，从模型的角度说，中等batch实际上也是MoE成本偏高的一个区间：小batch下，加载的专家少计算量少；大batch下，提供了足够的计算任务以充分利用GPU计算资源；而中batch下，一方面要加载所有参数，另一方面又没有足量计算。典型的expert caching或prefetching等技术也会失效。本文则指出，此时SD是一种行之有效的无损加速手段，填补了MoE模型在这个区间的成本缺陷。

#### 总结

这个工作重新思考了SD加速MoE的问题，为社区对SD的理解增加了新的角度。我们新归纳出的target efficiency的指标有助于研究者从系统层面理解SD的性能影响因素。我们尝试了对SD speedup建模以定量理解各个组成部分的tradeoff，取得了不错的效果。“在中等batch下SD能很有效地加速MoE”的结论也使其可以被运用在私有部署、SLO很紧的serving或者GPU显存很受限等情况下。

#### 题外话

- 论文的结论看似反直觉，实际上并没有脱离“SD更适用于memory-bound场景”这一条SD使用准则。
- 整体上看，当专家全部激活时，MoE相比dense模型，有更少的计算和更多的参数，这也就意味着此时MoE会更加memory-bound。
- SD是我很喜欢的一种加速方法，但是未来也面临很多挑战。新模型的词表越来越大，这意味着猜测准确率更容易下滑。准确率的下降相当于GPU峰值算力直接减少。因此，从这个意义上，我更看好简短的猜测策略。