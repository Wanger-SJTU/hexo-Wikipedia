---
title: "Liquid小模型训练经验谈"
date: "2026-04-30 00:00:00"
updated: "2026-04-30 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/Liquid小模型训练经验谈/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2033146563766269442"
---


Liquid AI是一家专做小模型的AI公司，他们的LFM系列模型在业内一直很受认可。

![](https://pic4.zhimg.com/v2-e217c8d6d5c2f91a5dd5a4d44a4a63d7_r.jpg)最近在AI Engineer峰会上，Liquid的一个技术负责人分享了小模型训练的一些经验：

[Everything I Learned Training Frontier Small Models](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DfLUtUkqYHnQ%26list%3DWL%26index%3D1)首先，小模型适用的场景是怎样的？

有三个关键词：<strong>memory-bound</strong>, <strong>task-specific</strong>, <strong>latency-sensitive。</strong>

第一，硬件受限，GPU、内存有限，没有办法运行大模型，比如移动设备、车载系统。第二，面向特定任务。不要妄想小模型能胜任编程、复杂调研这种任务，把它们的能力聚焦在简单指令跟随、调用工具、结构化输出等简单又比较有价值的单项能力上。第三，面向需要即时反应、对延时比较敏感的任务。

![](https://pic2.zhimg.com/v2-66cfc7462ce07c655c1dd7a578776e73_r.jpg)在架构方面，小模型就是大模型的微缩版。但是，因为模型层数、注意力头数少，导致Embedding层次的参数比例非常高：

![](https://pic1.zhimg.com/v2-1fdbde56f026df2bfe4f925821a6ddf4_r.jpg)这种超多的Embedding参数，原因在于对大模型的蒸馏训练，把大模型的词汇表引入进来了。LFM2模型压缩了这一比例，把更多的参数留给能产生实际效用的层次：

![](https://pic2.zhimg.com/v2-ad4d6eaedf29e1d2dcce9fbd19523ee1_r.jpg)训练过程方面，小模型和大模型没有太大差别，后训练都是三段式：

- <strong>Supervised Fine-Tuning (SFT)</strong>
- <strong>Preference Alignment（using on-policy DPO）</strong>
- <strong>Reinforcement Learning (RL)</strong>虽然模型参数少，但是LFM使用了大量的预训练数据，远超Scaling Law建议的比例，效果还能持续提升：

![](https://pic3.zhimg.com/v2-4af9f5362b0904e18ffff01eebc783c2_r.jpg)小模型经常出现的一个问题是Doom Loops，就是进入一个语言的死循环跳不出来。小模型在推理、复杂任务的情况下，特别容易陷入这种Doom loops。

![](https://pica.zhimg.com/v2-71ca3cb1318a206809ce12f2fd422c5a_r.jpg)LFM在后训练阶段使用了针对这个问题的专项训练：

- 训练数据的有效过滤（LLM陪审团），保证训练数据中没有Doom loops。
![](https://pica.zhimg.com/v2-eb7624118698e979c70b4852e27161da_r.jpg)
- 设置了N-gram重复惩罚的RL，纠正Doom loops的倾向。
![](https://pic2.zhimg.com/v2-4802dde627a063b536502290de15fb39_r.jpg)可见这种训练的效果主要是RL阶段带来的：

![](https://pic2.zhimg.com/v2-9e7e913253a1c911d59d340e1c5e9c17_r.jpg)最后，小模型的智能虽然不高，但是借助于外部知识（搜索等工具），加上限制其Context长度，他们也能完成相当复杂的任务。这里面特别提到了RLM，这种递归调用、每个trace都很短的模式，特别适合小模型。

![](https://pic1.zhimg.com/v2-8cdc5ea59dcc4237d57738bebba040e0_r.jpg)Because small models have lower knowledge capacity, they are best utilized by augmenting them with <strong>agentic tools</strong>(such as web search or Python interpreters), which allows them to overcome memory limitations and excel in specific, high-stakes environments like on-device, automotive, or privacy-regulated deployments我的 [知识星球【AI Engineer】](https://link.zhihu.com/?target=https%3A//t.zsxq.com/XctMe)刚刚开通。以后会在上面更新一些深度的AI内容，主要面向热衷于AI技术、打算用AI做产品的小伙伴。也计划写一本关于AI Agent的书，在星球上同步更新章节，大纲已经拟好，等星球超过30个人就开始更新。可以用 <strong>知识星球微信小程序</strong>搜索名称<strong>【AI Engineer】</strong>找到。

首批入住优惠，6月1日恢复原价，优惠券在这里：[下载图片在微信里扫码](https://link.zhihu.com/?target=https%3A//raw.githubusercontent.com/RealHacker/system-prompts-visualizer/refs/heads/main/planet%2520coupon.png)。

![](https://pic4.zhimg.com/v2-b1a22fa22b808158be064bd9a1c3f165_r.jpg)