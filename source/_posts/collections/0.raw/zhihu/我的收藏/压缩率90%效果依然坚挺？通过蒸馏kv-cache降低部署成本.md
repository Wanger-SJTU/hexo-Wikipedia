---
title: (2 条消息) 压缩率90%效果依然坚挺？通过蒸馏kv-cache降低部署成本
date: "2025-03-18 00:00:00"
updated: "2025-03-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/压缩率90-效果依然坚挺-通过蒸馏kv-cache降低部署成本/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/30901350014
---


<strong>论文标题</strong>

KV-Distill: Nearly Lossless Learnable Context Compression for LLMs

<strong>论文地址</strong>

[https://arxiv.org/pdf/2503.10337](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2503.10337)

<strong>代码地址</strong>

官方仓库：[https://github.com/vnchari/kv-distill](https://link.zhihu.com/?target=https%3A//github.com/vnchari/kv-distill)

AI复现：[https://github.com/guoqixin1/kv-distill](https://link.zhihu.com/?target=https%3A//github.com/guoqixin1/kv-distill)

<strong>作者背景</strong>

约翰斯·霍普金斯大学，微软

### 前言

KV-Cache是当前常用的推理加速手段，通过空间换时间的方式提高大模型推理速度。然而这一置换也导致了严重的显存开销，尤其是在长上下文场景下，部署成本极大。于是作者想要舍弃掉部分token的kv缓存，然后通过蒸馏的方式让模型保持原本性能


### 相关工作：H2O kv驱逐算法

有一篇类似的前置工作：[https://arxiv.org/pdf/2306.14048](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2306.14048)

它先是证明了：即使是稠密模型，在推理时也仅由少数重要token贡献大部分价值（这些token被称为Heavy Hitter, H2），并提出了kv驱逐算法，简单来说有以下实现方式：

<strong>1. H2I (H2 question-Independent)</strong>

在不知道未来问题的情况下，对上下文KV-Cache进行压缩：当超过缓存预算时，舍弃（驱逐）累积注意力最低的token

<strong>2. H2A (H2 question-Aware)</strong>

在知道未来问题的情况下，对上下文KV-Cache进行压缩：当超过缓存预算时，舍弃（驱逐）问题token对上下文token的注意力最低的token

除了通过上述两种方法保存重要token外，还需要保留一部分最近产生的token，相当于引入“邻近的信息也很重要”这一先验知识


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6e8ad61f197e.jpg)

### 本文方法

相对于上述kv驱逐算法，主要有以下改动：

1. 使用一个可学习的FFN层计算每个token被保留下来的概率

2. 在Attention Block中的Q和O矩阵旁添加Lora分支，这些新参数用于帮助模型适应：【基于部分token得到最终结果】

说明：在某些实现中，注意力计算完成后，多头的结果拼接在一起，然后会乘以一个矩阵，此矩阵被称为O

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d0a5e9702d98.jpg)

3. 模型需要计算两个输出分布：一是所有token经过原始主干模块的输出（相当于教师模型输出），二是被FFN选中的token经过带Lora模块的输出（相当于学生模型输出），如下图所示

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cfb36e65ab40.jpg)

4. 模型训练的目标为：最小化上述两个分布差异；整个过程中只有FFN和Lora模块需要更新，其他部分都冻结参数

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a4781124156a.jpg)

消融实验结论：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b5fdeb474f19.jpg)

同时使用正向和反向 KL 散度的组合目标函数能够获得最佳性能。仅使用正向或反向 KL 散度的模型性能显著下降，而使用自编码和语言建模目标（如 ICAE 和 DODO）的模型性能则更差


### 实验效果

#### 一、大海捞针测试


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1987e7151c5b.jpg)

与H2I方法相比，KV-distill保持了较好的长上下文检索能力，即使是在压缩率90%时也能保持较好的准确性

#### 二、抽取式问答测试


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_052b4a45d996.jpg)

应用到各个模型中，长文本抽取式问答的zero-shot准确率均好于对照组

#### 三、理解性问答测试


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_82ed257baeb1.jpg)

在长文本理解性问答测试中（需要深入理解上下文才能回答问题），KV-Distill方法即使是在90%的压缩率下，也保持了和原始模型相当的性能

#### 四、摘要生成测试

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0b9cae2f3a81.jpg)

    在长文本生成摘要的任务中，表现依然良好

### 往期同话题文章

[](https://zhuanlan.zhihu.com/p/1883321997322335705)

[](https://zhuanlan.zhihu.com/p/29007609465)

[](https://zhuanlan.zhihu.com/p/28736668087)