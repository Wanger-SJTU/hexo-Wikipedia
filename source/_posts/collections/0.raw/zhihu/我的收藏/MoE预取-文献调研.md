---
title: "MoE预取-文献调研"
date: "2026-06-02 00:00:00"
updated: "2026-06-02 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/MoE预取-文献调研/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2045187571597174770"
---


近期在研究MoE预取，阅读了近些年的顶会论文，有这样几篇似乎比较好。

概述

- 为什么要做MoE预取：在GPU的memory不够用的场景下，放不下所有的专家权重。比如边缘计算，或者3090等消费级显卡。（那么孪生的问题就是如何做卸载，预取来的权重要保留多久。这就可以认为GPU-HBM是高速缓存，CPU-DRAM是低速缓存，可以参考已有cache的工作）（所以从系统角度就存在trade-off：缓存的memory大小-整体的latency，当然这里面还包含了缓存什么内容，维持多久，通算重叠等一系列系统优化问题。从算法角度就存在，预测正确性问题，考虑更多信息，使用更好的方法就更准，但是可能预测就慢）

## 2. MoE预取的trade-off是什么：


预测开销-准确性

<strong>Taming Latency-Memory Trade-Off in MoE-Based LLM Serving via Fine-Grained Expert Offloading（Eurosys26）</strong>
已有方法是请求级做预测（coarsed grained）。比如MoE-infinity。本文是layer级做预测（fine-grained）。预测准确性如下图所示

![](https://picx.zhimg.com/v2-4f0bf0979f887a35c12331abd0aac4d5_r.jpg)
![](https://pic3.zhimg.com/v2-a648e1d9e2bc906d29bcc26190a81746_r.jpg)上图是system design。我们收集历史信息，形成expert map。然后每次对此map进行搜索。以此决定如何预取和卸载。场景是prefill和decode（好像没有区分开来讨论啊，这俩的特点应该是不一样的）

![](https://pic1.zhimg.com/v2-ff6e459c7e79a2fc9bcff5a1290507d2_r.jpg)这是design的细节。在最开始几层，我们直接利用embedding信息，去历史数据库里寻找。在后续层里我们基于预测概率信息，去历史数据库里寻找。

讨论：

- 本文自己承认的问题：没有用大模型来做分析，而是用公式做分析。没有针对prefill/decoding分别讨论。
- 没有讨论自己的trade-off啊。比如预测开销（时间开销，计算资源开销等）和准确性的关系。那要是开销允许无限大的话，我能不能引入几百B的大模型来做每一步的预测？准确性是不是爆表了。
- 实验是6个3090

<strong>Fate: Fast Edge Inference of Mixture-of-Experts Models via Cross-Layer Gate（WWW26）</strong>
最主要的创新就是用相邻层的hidden state差不多这一特性，直接用这一层的hidden来预测下一层的routing（注意routing本身也有权重的）

其次是，区分了decoding和prefill。prefill更看重所有token都最喜欢的专家是谁，毕竟token多。decoding更看重单个token马上要算哪些专家，毕竟就一个token。所以预测器结构稍有不同。

此外还考虑了专家缓存（多放一点专家，就算预测没那么准也留有余地）；通算重叠。

讨论：

有一点大杂烩啊。。。

实验在1个3090上跑的。

<strong>CommitMoE: Efficient Fallback-Free MoE Inference with Offloading Under GPU Memory Constraints(AAAI26)</strong>

![](https://pic1.zhimg.com/v2-f30bca7f0acdde621f7d6949ffc8cb02_r.jpg)有点绷不住啊。。拿4090跑MoE，是要打入PC市场吗，那只有加密需求内部部署才用得到吧，但是为什么不搞个小集群呢。感觉市场好小啊，不是很有趣啊。。。commitmoe是有损的方法！意思是，如果我们预测错了再回去cpu重新搬运的开销太大了。如果说，预测的置信度比较低，那我们将错就错也行。举例：

我们先用预测器做预测，搬运-》真的开始计算了，结果我们错误的搬来了expert2（置信度0.2），事实上应该是expert1（置信度0.2）-》这俩置信度都低，那将错就错吧，凑合拿expert2算也行。

讨论：

1. 算法的会好短啊。。怎么才7页，我们系统的会都是12页的啊。。。

## 2. 实验是1个4090


综合讨论：
1。 以上这些论文都是用cpu做调度的。行吧，反正权重都要从cpu搬过来。

2. 怎么都没有仔细讨论trade-off啊！预测开销（包括时长，计算资源，内存资源）-预测准确度。其实也稍微讨论了一点点，比如说多高一点专家缓存备份着。但是没有系统性分析这其中的trade-off。没分析trade-off就说明要么是这个领域还特别新，要么就是研究不深入。。