---
title: "为什么只有基于Transformer的大模型，而没有其他的？"
date: "2024-02-21 00:00:00"
updated: "2024-02-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/为什么只有基于Transformer的大模型,而没有其他的/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/682990234"
---


其它模型效果不好，全文完（不是）。

<strong>1、transformer效果一骑绝尘</strong>

<strong>（1）基于transformer架构的bert一统江湖</strong> BERT首次提出时，它在11种不同的NLP任务中都取得了当时的SOTA（State-of-the-Art）结果，包括推断任务、情感分析、问答以及其他。BERT性能的显著提升归因于其强大的双向上下文表示能力。

<strong>（2）以ELMo为代表的基于blstm的模型后续发展乏力</strong>ELMo在其提出时也实现了多项任务上的性能提升，但其后出现的无论是bert还是gpt1, 它都打不过。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8a4fad534056.jpg)

bert vs ELMo![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_992153da685e.jpg)

ELMo vs gpt1<strong>（3）众多研究“用脚投票”</strong> 很多研究已经证明了 Transformer 提取特征的能力是要远强于 LSTM 的，当前ai届统治者openai说了：lstm相比transformer在总集上掉5.6个点，只有一个集不掉点。

we analyze the effect of the Transformer by comparing it with a single layer 2048 unit LSTM using the same framework. We observe a 5.6 average score drop when using the LSTM instead of the Transformer. The LSTM only outperforms the Transformer on one dataset – MRPC![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_58054df06730.jpg)

2、transformer处理长距离依赖更有效

虽然RNN/lstm结构上能将信息一步一步向后传递，但这种结构极难训练，容易出现梯度消失、梯度爆炸问题，导致远距离的信息容易丢失。有论文表示基于lstm的大模型只能捕捉近200个token的内容。为了追求实用性，市面上动辄要求模型能处理几千token，因此这几乎是<strong>致命缺陷</strong>。但transformer不同。通过attention机制，transformer抹去了距离的概念，相隔遥远的两个token之间的关系可以被捕捉到。

<strong>3、transformer支持并行计算</strong>

与顺序处理的RNN和LSTM不同，Transformer允许数据的批量处理，这意味着可以更有效地利用现代GPU和TPU等硬件来训练模型，导致其训练速度和推理速度都较快。

Transformer架构容易进行扩展，且满足scaling law，方便观察性能。这就是为什么现在我们看到如BERT、GPT、T5和XLNet等大小不一的巨型Transformer模型。lstm层数高了容易崩。

灵活性和适应性：Transformer模型可以很容易地适应不同大小和规模的数据集，并对不同的任务和语言进行训练。

<strong>4、强大的语言表征能力带来了泛化性</strong>

<strong>ELMo</strong>: 预训练时，模型学习到词汇的上下文化表示，但这些表示仍然相对独立于特定的任务。

<strong>BERT</strong>: 使用MLM和NSP任务在训练阶段就捕获深度的双向上下文信息。训练完毕后，BERT模型可以直接用于微调各种下游任务。

<strong>GPT：</strong>具有zero-shot能力。而lstm在zero-shot上方差太大，表现不行。transformer的归纳偏置让其更容易迁移。

> We also observe the LSTM exhibits higher variance in its zero-shot performance suggesting that the inductive bias of the Transformer architecture assists in transfer
