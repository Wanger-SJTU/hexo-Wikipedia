---
title: (2 条消息) [LLM量化系列]从StreamingLLM到Massive Outlier、IntactKV和PrefixQuant
date: "2024-12-02 00:00:00"
updated: "2024-12-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[LLM量化系列]从StreamingLLM到Massive-Outlier、IntactKV和PrefixQuant/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/9814639857
---


自从Tim Dettmers在NeurIPS 2022提出的[LLM.int8()](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2208.07339)后，LLM PTQ量化的关注点就开始围绕Outlier Activation进行，一系列优秀的量化算法如不断涌现出来，从早期的SmoothQuant、AWQ，到后来的RPTQ、OmniQuant、ATOM、QUICK、QuaRot、SpinQuant、QServe等，研究者们在Outlier Activation的发现和处理优化上逐步精细化、完备化。本文试图梳理Outlier中的一种类型Massive Outlier的处理发展历程，期望能够触发一些思考。

### 一、开端：StreamingLLM Attention Sink

LLM在2022年底开始火爆后，处理长上下文成为各个MaaS厂商PR的一个热点，而[StreamingLLM](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.17453)的初衷就是试图优化长文本在LLM中的推理过程。届时window attention是一个不错的优化方案，即对长文本来说保持一个滑动的推理计算窗口(而不是全量q/k/v)能够有效地减少计算量和存储量，可以稳定地输出结果。但同时不可避免也会带来精度下降的问题(毕竟做了很大程度的裁剪)。针对这个问题，StreamingLLM首次发现了<strong>attention sink</strong>现象，即<strong>保持几个初始token的KV值在很大程度上可以恢复window attention的精度</strong>，并利用这个现象保证了长文本下window attention的推理精度，如下图最右图所示（黄色一列即为attention sink）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4d192c4c8805.jpg)

这个现象非常有趣，作用也很显著。尽管初始token大多缺乏很强的语义，<strong>但它们收集了显著的注意力分数</strong>，如下图所示。StreamingLLM有分析背后的原因，它将其归因为<strong>自回归模型语言建模的特性</strong>，即<strong>初始token对几乎所有后续的token都是可见的</strong>，因此最初的token更容易被训练成为注意力汇集点，吸引一些不必要的注意力。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8d00b40e48c5.jpg)

**

### 二、发展：Massive Outlier

StreamingLLM之后，CMU和Meta的研究人员又做了进一步的分析，在[Massive Activations in Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.17762)一文中提出了Massive Outlier**的概念，即这些初始token和一些低语义token对应的激活值呈现出高于均值几个数量级的大小，这在Llama系列等LLM模型上是普遍存在的。而这种巨量离群值对模型效果影响很大，同时对模型量化也有很大的影响。

研究人员将massive activation分别设置为0和massive均值后发现，设置为0时模型几乎不可用，而设置为均值时效果几乎没有变化，因此表明这里的massive activation非常重要，但并不是具体精确值重要，而是<strong>作为一个偏置项bias对整体计算非常重要</strong>（其实在StreamingLLM中已经提到过，初始token KV的重要性可以理解成模型学习到的关于绝对位置上的一份偏置bias）

基于此研究人员将massive activation和普通activation在计算attention output时进行了区分，得到了如下图。massive activation给最终结果带来的变化非常固定，为此作者引入了可学习的参数k/v试图替换massive activation，晒一下公式。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5c7e18d29127.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ae0aaf59dd21.jpg)

令人惊喜的是使用它们进行训练可以消除LLM学习massive activation的需要，在最终效果上几乎一致，使得激活值非常平滑，从而利于量化处理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eb36d2f7c19f.jpg)

**

### 三、应用：PrefixQuant

基于Massive Activation中提到的偏置等效替换的做法可以做很多应用，[PrefixQuant](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.05265)就是其中之一。它可以认为是针对weight/activation等效处理方法的集大成者，针对Massive Outliers也是类似的做法。PrefixQuant识别了Massive Token后，离线地将他们放在了KVCache的前缀中，防止在推理过程中产生Massive Outlier。

具体来说，给定一个LLM模型，PrefixQuant首先计算N个异常token数，然后在KVCache中选择Top-N个高频离群token作为前缀，如下图所示。这样再结合smooth、rotate、reorder等经典等效操作后剩下的outlier就可以忽略不计了，这样针对activation就可以用per-tensor量化来替换per-token量化，从而在保证推理精度的前提下提升了推理速度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6f7bdd3dce45.jpg)

 

### 四、应用：IntactKV

[IntactKV](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2403.01241)也是该思想的延续者，它意识到了这类token的重要性，论文中将初始的一些token称作pivot token，在LLM量化中它的做法稍有不同。

它以离线的方式从全精度模型中生成pivot token的无损KVCache，通过保持pivot token的KVCache精度，在其余的解码步骤中连接其他token的量化KVCache，可以有效地减轻在self-attention输出上积累的量化误差，如下图所示。本质上是以混合精度的方式来存储KVCache来达到提高推理结果精度的目标**。在pivot token的选取上，采用了经验的[BOS]、system prompt等token，它们的KVCache也可以作为可训练参数来通过校准获得。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0e60fb8c0648.jpg)

### 五、总结

经过这两年的发展，研究人员们对激活值中的离群值已经有了更深的理解，本文主要介绍了Massive Outlier这种类型的离群值以及它的一些处理和应用，将其等价成偏置的思想非常精彩，对推理损耗很低同时效果又不错，相信马上也会变成一种事实标准被各大框架集成。