---
title: "(2 条消息) [ICML 2024 Oral] ExCP：大模型Checkpoint极致压缩，精度无损存储降低70倍"
date: "2024-06-19 00:00:00"
updated: "2024-06-19 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/[ICML-2024-Oral]-ExCP-大模型Checkpoint极致压缩,精度无损存储降低70倍/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/704158815"
---


- 论文地址：
[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.11257)

- 开源代码：
[](https://link.zhihu.com/?target=https%3A//github.com/Gaffey/ExCP)

### 一、引言

大型语言模型最近成为人工智能领域的研究热点，然而它们的训练过程耗费巨大的计算和存储资源。因此，高效压缩存储模型的checkpoint文件显得尤为关键。我们提出了一种创新的模型checkpoint压缩方案（ExCP），该方案能够在保持性能几乎不受损失的前提下，显著降低训练过程中的存储开销。首先，我们通过计算相邻checkpoint的残差值来捕获关键但稀疏的信息，从而提高压缩比。接下来，我们实行权重和优化器动量的联合压缩，利用优化器存储的动量信息实现更高效的压缩，并通过压缩优化器动量进一步去除checkpoint中的冗余参数。最终，我们采用非均匀量化及编码压缩策略进一步减小checkpoint文件的存储尺寸。在从410M到7B不同规模的模型上测试我们的压缩框架，特别是在Pythia-410M模型上，我们实现了近乎无损的性能下达到约70倍的压缩比例。

### 二、方法

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_694f3295b201.jpg)

<strong>1. Checkpoint残差</strong>

在训练过程中，当前的参数可以看作上一个checkpoint存储的权重加上逐次迭代时梯度更新的总和，这部分是相对稀疏的，包含的信息量较少，因此我们对这一残差进行压缩，可以获得更好的压缩比例。而与此相反的，优化器中存储的动量是梯度一阶矩和二阶矩的滑动平均值，对于一阶矩来说，它的滑动平均默认的参数是0.9，在数百到数千个迭代之后与上一次checkpoint存储的内容已经没有太大的关联，所以我们对于优化器直接压缩其本身的值而非残差。最终待压缩的checkpoint我们表示为

$\Delta \mathcal P_t = \{\Delta \mathcal W_t, \mathcal O_t\} = \{\mathcal W_t-\mathcal W_{t-1}, \mathcal O_t\}. $

<strong>2. 权重-优化器动量联合压缩</strong>

目前已有的模型压缩相关的工作中，大家一般只关注于模型的推理性能，或者是模型最终存储checkpoint的大小，而不关注模型在整个训练过程中对储存空间的开销。因而已有工作只对权重进行压缩，而忽略了Adam等常见优化器中实际上存储了两倍于权重数量的动量。我们的工作一方面将两者一起进行了压缩，显著提升了整体的压缩比例；另一方面也利用了权重和优化器动量的关联性，进一步提升彼此的压缩比例。

<strong>权重剪枝</strong>：由于我们剪枝的权重是残差值，优化器动量的二阶矩可以大致表示在过去一段时间内权重残差值的变化幅度，所以我们可以使用优化器动量的二阶矩作为指标来确定不同层的剪枝比例。我们的剪枝策略如下文公式所示

 $$r_w}.">r_w = \frac{\alpha}{\sqrt{m_t}} \times \text{median}(\mathcal{W}),\\ \mathcal{M}_w(i) = {1}_{w_{t}(i) > r_w}. $$

式中， \mathcal{W} 和 {m_t} 分别表示权重和二阶矩。

<strong>优化器动量剪枝</strong>：对于动量剪枝，我们可以使用一阶矩作为指示器来进行剪枝，论文中有关于可收敛性的一个简要证明。同时，如果一个位置的权重已经被剪枝，那么对应位置的优化器动量也应该同步被处理，所以我们的剪枝策略如下文公式所示

 $r_o~\text{and}~\mathcal{M}_w(i)=1}.">r_o = \beta \times \text{mean}(v_t),\\ \mathcal{M}_o(i) = {1}_{v_{t}(i) > r_o~\text{and}~\mathcal{M}_w(i)=1}. $

式中， v_t 表示一阶矩。

<strong>3. 整体压缩流程</strong>

我们的整体压缩流程如Algorithm 1所示，依次进行计算权重残差/联合压缩/非均匀量化/编码压缩等步骤，得到最终的压缩结果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_290005b098fa.jpg)

而恢复出checkpoint完整文件的流程则如Algorithm 2所示，进行解压缩之后，首先从非均匀量化后存储的码本和下标中恢复出浮点结果，然后再与基准权重（上一个checkpoint的原始权重或恢复出的重建权重）相加，得到checkpoint完整文件。而恢复出整个训练流程中的checkpoint文件的流程如Algorithm 3所示，我们在完成训练后只保存初始化权重的随机种子和每个checkpoint存储的压缩结果，然后依次对checkpoint进行恢复以得到完整的checkpoint序列，以供从其中选择某个或多个checkpoint恢复训练/进行测试等。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3a8613d47605.jpg)

### 三、实验结果

<strong>1. 大语言模型</strong>

我们在Pythia和PanGu-π上验证了我们的压缩效果，其中Pythia-410M上我们选取了Pile数据集的一个1/20的子集进行基准模型训练和带压缩的模型训练以进行对比，而PanGu-π上我们遵从了原论文的训练策略。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7d03eb39d8d9.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cb8528e3e5c6.jpg)

可以看到，我们的结果对比原始模型几乎没有损失，同时实现了25-70倍的高倍率整体压缩。同时，我们也提供了在Pythia-410M上的训练loss曲线和checkpoint文件尺寸变化曲线。可以看到带压缩的训练loss曲线与无压缩的训练基本保持一致，损失只有非常微小的增加。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_899410a261c5.jpg)

<strong>2. 视觉模型</strong>

此外，为了方便与现有方法进行对比，我们在ViT-L32模型上进行了实验，同时比较了其他SOTA方法以及我们的不同剪枝策略。为了进行公平比较，我们根据权重和优化器动量的尺寸大小估算了其他方法的整体压缩率。但需要注意的是，即使是用其他方法在权重上的压缩率与我们的整体压缩率比较，我们仍然要高出很多。表里的消融也证明了我们联合剪枝策略的有效性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d2ac238b75c9.jpg)

<strong>3. 消融实验</strong>

我们进一步在Pythia-410M上进行了消融实验，尝试去除压缩流程中的不同步骤以评估各部分的效果。结果表明，直接对权重而非权重残差进行压缩时，精度损失会比较严重，联合使用残差计算、剪枝和量化能够取得最好的压缩比例和精度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4b557c9a2c51.jpg)

### 四、总结

我们提出了一个大模型Checkpoint压缩框架（ExCP），通过Checkpoint残差、权重与优化器动量的联合剪枝，以及非均匀量化等策略，在保持性能几乎不受损失的前提下，显著降低训练过程中的存储开销。我们在大型语言模型和视觉模型上均对此方法进行了评估，证实了方法的有效性。