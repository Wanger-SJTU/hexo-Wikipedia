---
title: "使用LLM来人造数据增强embedding检索模型 - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-24/使用LLM来人造数据增强embedding检索模型-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 6dae27b8-afb7-4c77-9ed4-f11060c85e98
---

# 使用LLM来人造数据增强embedding检索模型 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-zhuanlan-zhihu-com-p-699299481-18fa6323f4a)
[Read Original](https://zhuanlan.zhihu.com/p/699299481)



## 前言：

今天介绍一篇META发表的一个论文[LLM-Augmented Retrieval: Enhancing Retrieval Models Through Language Models and Doc-Level Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2404.05825)。旨在通过大语言模型来人造数据，增强检索模型的能力。此外，它提出了一种新的模型无关的文档级embedding框架。

笔者锐评：<strong>其实看这篇文章，学习下人造数据的prompt，以及使用人造数据的时候和真实的检索数据区分下（可以参考作者调试出来的权重参数以及做的消融实验）</strong>。此外，它介绍了两种策略，一种是难负例挖掘的改进，一种是loss的改进。

## 人造数据：

<strong>motivation：</strong>

query和doc一般是异构的，因此，通过LLM为doc人造一个query，充当一个query和doc的中间媒介，可以降低query检索到对应doc的难度。

![](https://proxy-prod.omnivore-image-cache.app/1226x1170,seS5bW3U8NdMxgrGh6QhTA6b_VIqgEI06rZ9MOjYeYac/https://pic4.zhimg.com/v2-459d5b4d58f47b6df9785ffa1dc990a7_b.jpg)

<strong>主要工作：</strong>

使用LLM为每个doc生成人造title，以及人造query。另外，把长doc切分为多个chunks(passages)来进行检索。(这里直接使用原文)。

![](https://proxy-prod.omnivore-image-cache.app/1356x1152,sMAFy2TMFHe0b99znfeOJ_zxf3tuFbISSIzb8qsBQJ3E/https://pic4.zhimg.com/v2-bcd092580d6816529aef085df8111acf_b.jpg)

生成人造query和title的prompt如下：

![](https://proxy-prod.omnivore-image-cache.app/1386x570,s1y9jSYBbwc7SYk7avJNfh0mfzC-BTM_HPBladxMz7LU/https://pic3.zhimg.com/v2-ca48f9ded34f6157283bcfd9c07420e2_b.jpg)

## doc-level embedding框架：

把doc的文本拆分为三种embedding：synthetic queries, title and chunk。

其中如下图所示，人造query以及chunk有多个，而title只有一个。作者认为：这样可以从不同的角度来表示doc的语义。有利于检索。

![](https://proxy-prod.omnivore-image-cache.app/1248x1080,s6jcBwMUPhVWH8A1zS4JCWOYc44avOR01_DIKoqll8fw/https://pic4.zhimg.com/v2-8753ef2122a89ca913ab16fa8d3f2e27_b.jpg)

### 双塔模型的应用：

本质上就是在这种框架下，如何计算query和doc的相似度。

![](https://proxy-prod.omnivore-image-cache.app/1238x152,sARHWd7EXWmHnUSELGa6sZRLKw26YnVg5dsV1G2eXBgI/https://pic4.zhimg.com/v2-56052891ca6d17b5e5957af163cf8117_b.jpg)

s是相似度函数，一般为余弦相似度。

<strong>左边的这一项目：是当前doc检索常用的一种方法。把doc切分为chunk，计算queyr和第i个chunk的相似度，然后取query与所有chunk中，相似度最大值，作为query和doc的相似度。</strong>

<strong>右边的求和是query和三种不同的doc表示(e\_f)来进行相似度的计算。（synthetic queries, title and chunk）</strong>

w\_f是0-1之间的权重参数，代表不同表示的重要性。

其中synthetic queries和chunk有多个，title只有一个：

<strong>有多个的也会有多个embedding，因此作者的做法是把多个synthetic queries(chunk)先抽取固定维度的向量，然后再进行一个mean poolling。再来和query计算相似度。</strong>

<strong>另外，因此相似度函数(点积和余弦相似度是线性的，因此，上述的公式可以被简化为：</strong>

![](https://proxy-prod.omnivore-image-cache.app/1338x160,sZKoVW6oRWJr3Mjp2HnshVzN7ERk0NJcf02zOEYrEDsI/https://pic4.zhimg.com/v2-8120072f6deea248e1bbb0351ae8f74f_b.jpg)

<strong>因此，每个chunk有自己的一个embedding即可，同时，也可以用ANN搜索。</strong>

### colbert模型的应用：

<strong>作者认为，因为colbert是token级别的计算相似度(query的一个token的embedding，会去和doc所有token的embedding去计算相似度，然后取最大)，因此将doc的不同表示</strong>synthetic queries, title and chunk，拼接起来就行。他们会参与query与doc的计算。  

![](https://proxy-prod.omnivore-image-cache.app/886x174,sUY3oUd95TsaCMUVJ61Pl3lIDYiQcCzZ5N44FNqEAAQo/https://pic1.zhimg.com/v2-46a6888e224b36038e7c5e427cfa0ed4_b.jpg)

## 实验：

因为是模型无关的改进，因此作者选择了多个基准模型模型，

双塔：Contriever;DRAGON

交互式模型：ColBERTv2.

<strong>细节参数：</strong>

Contriever：w\_query=1,w\_title=0.5,w\_chunk=0.1

DRAGON: w\_query=0.6,w\_title=0.3,w\_chunk=0.3  

chunk\_size=64

<strong>主要实验：</strong>

<strong>双塔：</strong>

![](https://proxy-prod.omnivore-image-cache.app/1870x782,shLNHSBiNenCjA44u8TIN_As07RVpZZAZiXvoVX-jBNc/https://pic2.zhimg.com/v2-bc29dd1cd0d39b83d04c8afe9ef289cd_b.jpg)

<strong>迟交互：</strong>

![](https://proxy-prod.omnivore-image-cache.app/1904x772,sXqBiAfFLpH7ugTZ4_0vBgmcpHEQUlW_-GYCRBo-0fbg/https://pic1.zhimg.com/v2-eda6d4774c02f08645c9627341afb1b0_b.jpg)

实验结论：使用这种doc-levl embedding框架，相比原来的结果，都有较大提升。

<strong>消融实验：</strong>

只使用doc的一种表示，并且权重设置为1。

![](https://proxy-prod.omnivore-image-cache.app/2026x1094,sdiP0sB3lUoyTg51_4MFNoqm0OidOobIEA8ahSW15cqM/https://pic4.zhimg.com/v2-b774c9c4059aad16e7295c49d37851ef_b.jpg)

实验结论：<strong>大多数情况下，人造query带来的提升比其他两种大，另外，合并三种不同的doc表示的提升一般最大。</strong>

## 训练技巧：

<strong>动态的难负例采样：</strong>

之前的难负例挖掘(采样top n中不是 ground truth)一般是静态的，作者认为，可以在训练过程中变成动态的，然后更新训练集中的难负例。具体方法：定期重新计算训练集中的难负例。

For each query (or batch of queries), it is necessary to re-compute the embedding for all doc contexts to identify the top negative examples. These doc context embedding cannot be pre-calculated due to the continuous updating of the model parameters during training, which correspondingly alters the doc context embedding. To address this issue, we can periodically pre-calculate and update the top negative samples for multiple training batches simultaneously.

<strong>Loss Function：</strong>

<strong>作者认为，二分类的交叉熵loss不适合检索的排序任务，因为其主要是做分类，最大化query和正例的分值，以及最小化query和负例的分值。</strong>

<strong>检索的排序任务，主要关注的是相对的序以及正例和负例之间的差距。因此，他们采用了</strong>margin ranking loss。

![](https://proxy-prod.omnivore-image-cache.app/888x134,somPoNDhcJblrGsP_lB8S5KOWMnZHGnXh9BfcAFgQ4Nw/https://pic2.zhimg.com/v2-9e3a13a5291188f0ac433abf4dc6a299_b.jpg)

作者的实验展示，这种margin loss优于交叉熵loss，再具体数据的微调中。

## 总结：

还是有收获的，对于长doc，更好的理解和表示doc的内容，可以将更好的将异构的doc检索到。这篇工作的着力点：是利用的LLM来更好的表示doc。

<strong>广告时间：</strong>

<strong>笔者发起了一个RAG检索模型的开源项目。欢迎大家给个star。</strong>

传送门：[GitHub - NLPJCL/RAG-Retrieval: Unify Efficient Fine-tuning of RAG Retrieval, including Embedding, ColBERT,Cross Encoder](https://link.zhihu.com/?target=https%3A//github.com/NLPJCL/RAG-Retrieval)

此外，最近从社区招聘了几个开发人员，一起参与开发一些新的特性，有一个roadmap，大家可以看看。也欢迎大家参与贡献，可以私信联系我。

RAG-Retrieval 提供了全链路的RAG检索微调(train)和推理(infer)代码。

```text
* 对于微调，支持微调任意开源的RAG检索模型，包括向量（embedding）、迟交互式模型（colbert）、交互式模型（cross encoder）。
* 对于推理，RAG-Retrieval专注于排序(reranker)，开发了一个轻量级的python库rag-retrieval,提供统一的方式调用任意不同的RAG排序模型
```


