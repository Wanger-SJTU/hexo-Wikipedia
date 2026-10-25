---
title: 聊聊低 bit 训练
date: "2024-03-16 00:00:00"
updated: "2024-03-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/聊聊低-bit-训练/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/687306246
---


原文链接：

聊聊低 bit 训练mp.weixin.qq.com/s/mdEjby-qhUxpRTD3K0lsYA

最近比较新的一篇文章 The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits，前序是 BitNet：Scaling 1-bit Transformers for Large Language Models。还有之前微软的 FP8-LM: Training FP8 Large Language Models。大家的思想都是用低bit训练大模型，达到更好的 scaling law。

先讲讲 BitNet，用了比较激进的 1-bit 训练，提几点文章中比较关键的点

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5d0e5b9a5100.jpg)

1）还是有一个 fp16 的 master weight：`While the weights and the activations are quantized to low precision, the gradients and the optimizer states are stored in high precision to ensure training stability and accuracy` 

2）用低bit的乘法，代替了原来的 FFN。input x 的激活被缩放到 8-bit，权重 weight 被量化到 1 bit（只有正负1）。γ 就是激活 x 的范围，β 是weight一范数的均值，用于从矩阵计算结果中反量化，并保留方差。

3）分组的量化和归一化，避免不必要的通信

4）使用大 lr，`One challenge for the optimization is that a small update on the latent weights often makes no difference in the 1-bit weights` 

The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits 这个文章算是延伸版，做的改动主要是从 (+1,-1) 变到 （-1,0,1）了。log2(3)=1.58，题目的 1.58 bit也是这么来的

效果的话，文章对比了 fp16 下 训练的模型，总的来讲分数不是很高。LLaMA LLM 这个 fp16 的模型训练了 100B，但显然是 under-trained 了，没有完全训练到很收敛（LLaMA2 中训练 2T 数据也还可以继续训）

找了一下 GPT-3 的数据，2.6B 吃了 300B 的 GPT-3，可以达到的分数 LAMBADA 67.1，Hellaswag 62.8，PIQA 75.6，Winogrande 62.3。而这个吃了 100B 的3B，Hellaswag 43.3，PIQA 72.1，Winogrande 58.2。差距还是很大的。

所以总的来说，这种低比特训练，训练前期可能还行。而事实上，大模型训练到大后期对精度要求很高。所以这篇文章所提出的方法，主要也就是在训练前期有用，训练后期 loss 预估是很难降下去，文章也巧妙地避开了训练大后期的评测（>1T 数据）

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4d29f72ca451.jpg)

FP8-LM 做的比较 solid 一些，在 All-Reduce Communication、gradient scaling 上面都有一些设计。loss 曲线相比 fp16 没有明显的 gap，这一点比 BitNet 好。比较精细化的分配 fp8 的 scale，未来应该有在预训练阶段大规模应用的空间。

总结下：

- 用 低bit 优化推理没毛病。像 BitNet / 1.58 bit 在训练时考虑量化，肯定会比只做在推理时对 weight 和 activation 做 post-quant 效果会好一些，毕竟训练时演练过了。但真正要做产品的大模型基座，应该不会这么做：

- 模型预训练阶段：模型性能 >> 训练计算量。并且借用文章思想，如果想优化推理，`正常预训练 + 少量 post-quant finetuning，应该能做到几乎精度无损`，只是训练计算量变大了。基座模型预训练本来就是 giant 的游戏，训练量变大并不是很致命，除非 `低-bit 训练能展现出更陡峭的 scaling law` 
- <strong>低 bit 训练的方案，scability 和训练的大后期，可能存在问题。</strong>千亿+ 的模型训练对参数类型非常敏感，一些关键位置尽可能要用 fp32（例如非线性层、shortcut、softmax之类、embedding），可能直接导致不收敛（特别是当 loss 训练到小于 2 之后）

- 一个比较 promising 的方向是，看小模型吃足量数据、最好的超参，能达到几倍大小的 SOTA 大模型的水平（相比 chichilla-optimial 下参数量/数据量的配比） ，从而得到一个对推理最优的模型
