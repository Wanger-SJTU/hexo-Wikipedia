---
title: (2 条消息) 投机采样在MoE模型推理上的问题
date: "2025-09-30 00:00:00"
updated: "2025-09-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/投机采样在MoE模型推理上的问题/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1956326731205026560
---


大语言模型是Auto Regressive Decoding的，也就是每次模型forward，只能生成一个Token，我认为这个问题是大语言模型推理低效的本质。所以从23年开始，我就比较看好parallel decoding这个方向，相关方向的经典工作有[speculative decoding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.17192)，还有不需要独立部署draft model的self speculative decoding（medusa、eagle系列）。从部署的简易性出发，我们更倾向于self speculative decoding。speculative decoding本质上是增加了decoding的Q dimension，让一次forward可以输出多个token，从而增加了推理效率。引入的overhead是draft model，相对较小。

投机采样的理论收益空间：

$benifit=acceptlen∗T(fwd1token)−T(fwddraftlentokens)−DraftModelOverHead" role="presentation">benifit=acceptlen∗T(fwd1token)−T(fwddraftlentokens)−DraftModelOverHeadbenifit = acceptlen * T(fwd_{1 token}) - T(fwd_{draft len tokens}) - DraftModelOverHead $

通俗讲，投机采样的收益上限bs=1 forward accept length次的耗时减去bs=draft length forward 1次的时间，再扣除投机采样的overhead。overhead主要有两方面组成，一个部分是draft length由于猜测准确率有限，往往大于accept length，所以verification有额外开销；第二部分是draft model本身的开销，这部分相对较少。

到MoE推理，Eagle本身还是可以有与Dense相匹配的接受率，但是verification的overhead却大幅提高了，主要在MoE MLP层，每个verification token都需要被路由到TopK个expert上，成TopK倍增加了通信量和Expert计算量。在<strong>已经具备一定decoding batch size的前提</strong>下，有可能投机采样的收益会衰减。

目前我们在实际业务中，就遇到了投机采样在MoE推理时收益不符合预期的难点。在此调研一下业界有没有较好的解决方法。

[MoESD](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2505.19645) 对上述问题进行了更细致的建模

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aa021f5822fe.jpg)

证明在中等 batch 下 MoE 比 dense 更能从 speculative decoding 中受益，并给出建模（target-efficiency）来衡量“acceptance rate + 验证成本”对加速的影响，从而帮助选择什么时候/在哪些层做 speculation。讨论了为何高 acceptance rate 仍可能因为验证成本而失速

优化方向大致有两个

- 提升accept rate，降低accept len 和 draft len的gap
- 降低verfication的开销
[Speculative MoE](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2503.04398v2) 通过预测 token 的 expert routing 路径并预先把 token/expert 安排到设备上，可以大幅削减运行时的 all-to-all 通信与 reroute 导致的 overhead，从而降低每次 verify 的成本。

[Jakiro](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2502.06282)  源头上提高接受率，从而降低总的 verify 量（减少触发 MoE 验证的次数） 

如果大家在实战中遇到相关问题，欢迎一起讨论！

[](https://zhuanlan.zhihu.com/p/29101694086)