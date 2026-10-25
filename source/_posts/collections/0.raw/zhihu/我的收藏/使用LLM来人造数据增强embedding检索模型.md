---
title: (2 条消息) 使用LLM来人造数据增强embedding检索模型
date: "2024-05-23 00:00:00"
updated: "2024-05-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/使用LLM来人造数据增强embedding检索模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/699299481
---


### 前言：

今天介绍一篇META发表的一个论文[LLM-Augmented Retrieval: Enhancing Retrieval Models Through Language Models and Doc-Level Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2404.05825)。旨在通过大语言模型来人造数据，增强检索模型的能力。此外，它提出了一种新的模型无关的文档级embedding框架。

**

笔者锐评：其实看这篇文章，学习下人造数据的prompt，以及使用人造数据的时候和真实的检索数据区分下（可以参考作者调试出来的权重参数以及做的消融实验）**。此外，它介绍了两种策略，一种是难负例挖掘的改进，一种是loss的改进。

**

### 人造数据：

motivation：**

query和doc一般是异构的，因此，通过LLM为doc人造一个query，充当一个query和doc的中间媒介，可以降低query检索到对应doc的难度。

**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0058f7433d81.jpg)

主要工作：**

使用LLM为每个doc生成人造title，以及人造query。另外，把长doc切分为多个chunks(passages)来进行检索。(这里直接使用原文)。

**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f68b498aa55b.jpg)

生成人造query和title的prompt如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_580228625d0b.jpg)

### doc-level embedding框架：

把doc的文本拆分为三种embedding：synthetic queries, title and chunk。

其中如下图所示，人造query以及chunk有多个，而title只有一个。作者认为：这样可以从不同的角度来表示doc的语义。有利于检索。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b66dcfe06394.jpg)

#### 双塔模型的应用：

本质上就是在这种框架下，如何计算query和doc的相似度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_555d1d301ed8.jpg)

s是相似度函数，一般为余弦相似度。

左边的这一项目：是当前doc检索常用的一种方法。把doc切分为chunk，计算queyr和第i个chunk的相似度，然后取query与所有chunk中，相似度最大值，作为query和doc的相似度。**

**

右边的求和是query和三种不同的doc表示(e_f)来进行相似度的计算。（synthetic queries, title and chunk）**

w_f是0-1之间的权重参数，代表不同表示的重要性。

其中synthetic queries和chunk有多个，title只有一个：

<strong>有多个的也会有多个embedding，因此作者的做法是把多个synthetic queries(chunk)先抽取固定维度的向量，然后再进行一个mean poolling。再来和query计算相似度。</strong>

**

另外，因此相似度函数(点积和余弦相似度是线性的，因此，上述的公式可以被简化为：**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ed31d8b7ca6e.jpg)

<strong>因此，每个chunk有自己的一个embedding即可，同时，也可以用ANN搜索。</strong>

#### <strong>colbert模型的应用：</strong>

<strong>作者认为，因为colbert是token级别的计算相似度(query的一个token的embedding，会去和doc所有token的embedding去计算相似度，然后取最大)，因此将doc的不同表示</strong>synthetic queries, title and chunk，拼接起来就行。他们会参与query与doc的计算。**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b7751b3c29cc.jpg)

### 实验：

因为是模型无关的改进，因此作者选择了多个基准模型模型，

双塔：Contriever;DRAGON

交互式模型：ColBERTv2.

细节参数：**

Contriever：w_query=1,w_title=0.5,w_chunk=0.1

DRAGON:     w_query=0.6,w_title=0.3,w_chunk=0.3**

chunk_size=64

主要实验：**

<strong>双塔：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ca508f264d3b.jpg)

<strong>迟交互：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bda9061a7166.jpg)

实验结论：使用这种doc-levl embedding框架，相比原来的结果，都有较大提升。

**

消融实验：**

只使用doc的一种表示，并且权重设置为1。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bd6eae543ba5.jpg)

实验结论：<strong>大多数情况下，人造query带来的提升比其他两种大，另外，合并三种不同的doc表示的提升一般最大。</strong>

**

### 训练技巧：

动态的难负例采样：**

之前的难负例挖掘(采样top n中不是 ground truth)一般是静态的，作者认为，可以在训练过程中变成动态的，然后更新训练集中的难负例。具体方法：定期重新计算训练集中的难负例。

For each query (or batch of queries), it is necessary to re-compute the embedding for all doc contexts to identify the top negative examples. These doc context embedding cannot be pre-calculated due to the continuous updating of the model parameters during training, which correspondingly alters the doc context embedding. To address this issue, we can periodically pre-calculate and update the top negative samples for multiple training batches simultaneously.

<strong>Loss Function：</strong>

**

作者认为，二分类的交叉熵loss不适合检索的排序任务，因为其主要是做分类，最大化query和正例的分值，以及最小化query和负例的分值。**

<strong>检索的排序任务，主要关注的是相对的序以及正例和负例之间的差距。因此，他们采用了</strong>margin ranking loss。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f452423032c.jpg)

作者的实验展示，这种margin loss优于交叉熵loss，再具体数据的微调中。

**

### 总结：

还是有收获的，对于长doc，更好的理解和表示doc的内容，可以将更好的将异构的doc检索到。这篇工作的着力点：是利用的LLM来更好的表示doc。

广告时间：**

<strong>笔者发起了一个RAG检索模型的开源项目。欢迎大家给个star。</strong>

传送门：[GitHub - NLPJCL/RAG-Retrieval: Unify Efficient Fine-tuning of  RAG Retrieval, including Embedding, ColBERT,Cross Encoder](https://link.zhihu.com/?target=https%3A//github.com/NLPJCL/RAG-Retrieval)

此外，最近从社区招聘了几个开发人员，一起参与开发一些新的特性，有一个roadmap，大家可以看看。也欢迎大家参与贡献，可以私信联系我。

[](https://link.zhihu.com/?target=https%3A//www.notion.so/RAG-Retrieval-Roadmap-c817257e3e8a484b8850cac40a3fcf88)

RAG-Retrieval 提供了全链路的RAG检索微调(train)和推理(infer)代码。

- 对于微调，支持微调任意开源的RAG检索模型，包括向量（embedding）、迟交互式模型（colbert）、交互式模型（cross encoder）。
- 对于推理，RAG-Retrieval专注于排序(reranker)，开发了一个轻量级的python库rag-retrieval,提供统一的方式调用任意不同的RAG排序模型