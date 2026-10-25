---
title: "(1 条消息) COSP: 一种自适应的大模型prompt设计方案，从此摆脱人工撰写示例的烦恼"
date: "2023-11-11 00:00:00"
updated: "2023-11-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/COSP_-一种自适应的大模型prompt设计方案,从此摆脱人工撰写示例的烦恼/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/666358822"
---


<strong>提纲</strong>

1 简介

2 问题定义

3 COSP

4 实验结论

5 讨论

参考文献


### 1 简介

    众所周知，大模型的few-shot性能对于示例demonstration的选择非常敏感，只有人工精心设计的demonstration才保证使用效果。而大模型的zero-shot能力，虽然不需要人工介入，但是性能上会相对受限。基于此，COSP(Consistency-based Self adaptive Prompting)作为一种新的prompt设计方案被提出，COSP不依赖于人工撰写的response或者真实标签，通过自定义规则，利用大模型的zero-shot能力构建了相应的“伪”样例，然后以这些伪样例作为指导，利用大模型的few shot能力来提升预测的准确性。<strong>换言之，COSP就是利用大模型的zero-shot能力才生成demonstration，然后通过in-context leanring利用大模型的few-shot能力来提升生成结果质量。</strong>


### 2 问题定义

    给定一个测试集D，D中的每个数据只包含question，没有对应的answer（也就是没有ground-truth标签）。在给定大模型跟某个特定的测试问题x下，我们希望能找到一个合适的demonstration集合S（每个demonstration都包含来源于D的question，生成的推理路径r跟生成的预测结果y） ,通过in-context learning使得大模型做出更加准确的预测。也就是说，<strong>这个任务的目标就是在不知道测试数据集中真实answer的前提下，构建一个高质量的demonstration集合S，使得大模型在特定场景下能有更好的性能。</strong>


### 3 COSP


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_15aae589c7d6.jpg)

图1: COSP框架

整个COSP的具体流程分为两个阶段，详情如下：

 1. 为每个问题问题x多个推理路径跟最终结果，并通过特定规则构建demonstartion集合<strong>对于测试集D中每个问题x，利用Chain-of-Thought的方式让大模型生成对应的的推理路径r跟最终回复y，每个问题采样m次。于是每个问题x可以得到m个{r, y}的预测结果。</strong>通过第一阶段可以构建了一个demonstration候选池，里面每个元素为{x, r, y}，每个问题x都有多个{r, y}与之对应。这一过程主要是利用大模型的zero shot能力为了给x生成合适的r跟y。**

    紧接着只保留每个问题中预测结果占比最多的y跟跟对应的推理路径，移除那些不常见的预测结果y（借鉴了self-consistency的做法）。移除掉这部分长尾数据在于这些生成结果模型对此没有太高的置信度，有更大概率的模型预测错误可能，而错误的生成结果如果被采纳的话会误导大模型的预测。<strong>然后</strong>根据两个基本规则定义了一个评分函数，这两个基本规则，其一是偏好更加一致的预测结果，就是同个问题下，生成结果相对集中的数据，其二是对生成结果存在重复问题（出现重复的词语或者句子）进行惩罚，从而鼓励模型生成结果更加多样化。按照贪心策略，从零开始构建demonstration集合，每次往其中添加一个增加最多得分的元素，直到demonstration集合数量达到K为止。<strong>这一过程主要是为构建一个高质量的demonstration集合，为后续的in-context leanring作准备。</strong>

<strong>2.利用上一步的demonstration集合，通过in-context learning重新生成测试集中所有问题的回复。</strong>

    利用构建好的demonstration集合，针对测试集中的每个问题x，通过in-context learning的方式指导大模型生成对应的答复，通过m次采样获得m个生成结果，结合第一步中的多个生成结果，按照多数表决原则得到最终的结果，这就是COSP的全过程。在实际使用中也可以根据问题的难度合适选择demonstration的个数（越难的问题需要更多的样例示范），这就是COSP+。


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d1c90dbd3455.jpg)

图2: COSP算法流程图

### 4 实验结论

    a) COSP带来的收益超过明显超过基于self-consistency的zero-shot方法，在多数任务上可以媲美传统的few-shot方法。它可以给更小规模的模型带来更显著的性能提升，从而缩小大模型跟小模型之间的差距，在真实场景下可能有更大的实用性（但是看起来距离大模型还是有蛮大的差距）。


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6c203429f88e.jpg)

图3: 在两个不同规模的语言模型上效果对比

    b) 通过消融实验验证了COSP中各个设计的必要性，包括构建demonstration集合的规则（C+D），综合考虑两个阶段的预测结果（S1+2），以及自适应选择in-context leanring中的样例个数。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f64c84370ab9.jpg)

图4: 消融实验

### 5 讨论

<strong>COSP主要是针对大模型在few shot跟zero shot用法上存在性能差距的问题，期望通过生成合理的“伪”样例，构建高质量的demonstration集合，实现在zero shot场景下大模型也能达到few shot的性能，在zero shot场景跟few shot场景都具有一定的潜力，尤其是面对那些场景数量众多的业务，再也不用耗费大量时间跟人力去撰写高质量的response以及构建demonstration了。</strong>


参考文献

1 Better Zero-shot Reasoning with Self-Adaptive Prompting

[https://arxiv.org/pdf/2305.14106.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.14106.pdf)
