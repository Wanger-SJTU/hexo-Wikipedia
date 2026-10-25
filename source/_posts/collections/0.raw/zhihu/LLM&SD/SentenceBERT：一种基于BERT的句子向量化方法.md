---
title: SentenceBERT：一种基于BERT的句子向量化方法
date: "2021-02-09 00:00:00"
updated: "2021-02-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/SentenceBERT-一种基于BERT的句子向量化方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/350228423
---


上个季度工作中需要做通用的句子向量表示，为了保留BERT对句子理解的完整性，同时又要兼顾向量在迁移任务上的泛化能力，使用了Siamese-BERT的结构去做了句子向量化。工作中多种任务数据上验证都比官方BERT、词Word2Vec向量平均要提升明显。后来通过公众号了解到，原来这个思路已经写成了论文<strong>Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks</strong>并发表在了IJCNLP2019。这个思路确实创新型并不是很足，大概是因为这个原因没有发表到三大顶会吧，不过用来做sentence-embedding效果确实是挺不错的，非常实用，原文链接：

[https://arxiv.org/pdf/1908.10084.pdfarxiv.org/pdf/1908.10084.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1908.10084.pdf)

官方代码地址：

[https://github.com/UKPLab/sentence-transformersgithub.com/UKPLab/sentence-transformers](https://link.zhihu.com/?target=https%3A//github.com/UKPLab/sentence-transformers)

由于这个模型我是先实现并应用后看的论文，下面我将把论文内容联系我的使用感受来逐步进行分析。

### 1 框架设计

如下图所示便是论文中使用的两种Siamese结构，整个的结构设计非常的简单，左图为训练模型时的结构，右图为推理时的结构。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5f0aaa8e164e.jpg)

论文中结构图
#### 1.1 训练阶段

A和B两个sentence分别进入同一个BERT模型得到各自的poolout向量u,v，通过计算 |u−v|" role="presentation">|u−v||u-v| 对u,v向量提取交叉特征，并和u,v向量concat到一起进入fusion layers得到预测结果。这种在u,v后面加入fusion layers的方式会让预测结果更准，但也会让u,v向量与预测结果的关联性变弱。

#### 1.2 推理阶段

对于两个sentence A和B，分别进入训练好的BERT模块得到各自的sentence-embedding表示u和v，计算u和v向量的cosine-sim评分作为sentence A和B的预测概率。

### 2 实验评估

实验分成了无监督和有监督两组，文中所指无监督可以理解成一个迁移学习的评估方式，即在数据集A上训练，在数据集B上评估，效果越好更能体现sentence-embedding向量的迁移能力和泛化性能；有监督则是使用数据集A的训练集参与训练，数据集A的验证集进行评估，下面来看文中展示的实验效果，效果越好表示sentence-embedding在具体子任务的适应能力更好。

#### 2.1 无监督

下图所示即为文中无监督部分的实验结果，可以看出，基于Siamese结构的SBERT在指标上大幅度完胜了其他sentence-embedding方法，证明了用SBERT做通用sentence-embedding的可行性。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2cbba9a69f8d.jpg)

#### 2.2 有监督

有监督部分的实验结果SBERT表现一般，可以看到三种评估方式的两种效果都不如官方BERT模型。对于“有监督”方式的评估，其实可以理解为在具体任务上面“刷指标”，SBERT参与训练的fusion layers并不参与推理，这会造成训练目标和评估目标之间存在一个很大gap，即训练目标是sentence-embedding向量评估目标是相似性，因此具体任务上SBERT表现不如官方BERT还是比较正常的。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_528ae0ecc0ea.jpg)

### 3 总结

- SBERT有能力得到迁移性强的通用sentence-embedding；
- 但具体任务上的表现并不一定比原始BERT好。
