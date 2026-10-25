---
title: From Sparse to Soft Mixtures of Experts
date: "2023-09-03 00:00:00"
updated: "2023-09-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/From-Sparse-to-Soft-Mixtures-of-Experts/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/653976943
---


From Sparse to Soft Mixtures of Experts

Taki
​
清华大学 电子信息硕士

22 人赞同了该文章

link：https://arxiv.org/pdf/2308.00951.pdf

TL,DR: Despite their success, MoEs suffer from a number of issues: training instability, token dropping, inability to scale the number of experts, or ineffective finetuning. In this work, we propose Soft MoE, a fully-differentiable sparse Transformer that addresses these challenges, while maintaining the benefits of MoEs.

常规的 MOE 方法大多为 Sparse 的形式。先学习一个稀疏的 router 算法，然后借助这个 router 算法将输入的数据分配给不同的Expert 专家

但是这种方法存在training instability, token dropping, inability to scale the number of experts, or ineffective fine-tuning 等问题，作者通过将输入进行混合的形式来让不同的专家看到更多的信息。简单来说就是：

原本的 token 就是给定一个 Expert 看。现在的做法是，将其他token 的信息先集成到这个 token 上，然后再输入到一个 expert 之中。核心就是如何计算将信息集成到一个 token 的权重。这里的权重一般来说，不是所有的token 都有（如果都有的话，就是 Dense MoE）。

如何获得权重呢？文章的做法是引入可学习的参数：

使用可学习的参数计算 weights，然后用到两部分。列的维度上归一化，将token 信息融合。行的维度归一化，将输入的 slot 信息输出集成到 token 上。

现在来看看，SoftMoE 是怎么解决最开始提到的 Sparse MoE 的那些问题的。

第一个可导很好理解。Sparse  MoE 通过取 Top-k 等形式来聚合信息。天然是不可导的，这里使用更柔和的方法来聚合信息，成为可导。

第二就是No token dropping and expert unbalance. token dropping 指的是有的 token 没有被分配到任意一个 expert 上。expert unbalance指的是不同的 expert 的负载不一样。the popular Top-k or “Token Choice” router这两种问题都存在。Expert Choice这种 router 存在 token dropping 的问题，不存在 expert unbalance 的问题。Soft MoEs are basically immune to token dropping and expert unbalance since every slot is filled with a weighted average of all tokens.

第三点是更快。slots 的数量决定了Soft MoE 的速度。Expert 的数量不影响复杂度。少了 top-k 等操作，SoftMoE 也更快。

第四点是序列的可分性。传统的方法：Under capacity constraints, all Sparse MoE approaches route tokens in groups of a fixed size and enforce (or encourage) balance within the group. When groups contain tokens from different sequences or inputs, these tokens often compete against each other for available spots in expert buffers. As a consequence, the model is no longer deterministic at the sequence-level, but only at the batch-level, as some input sequences may affect the final prediction for other inputs. 来自不同的序列的 tokens 相互竞争，进而互相影响到了输出结果。因此，模型不再具备序列维度上的可分行。Soft MoE combines all tokens in each input sequence, we just set the group size to be a single sequence，因此具备可分性。

编辑于 2023-09-03 14:46・中国香港
LLM（大型语言模型）

​赞同 22​​8 条评论​18 ​6 ​分享

​申请转载​​

未登录用户

8 条评论

默认
最新

一只滑行的蜗牛

效果不佳，感觉

2024-01-02 · 北京

​回复​2

一只滑行的蜗牛

Taki

嗯

2024-01-03 · 北京

​回复​喜欢

一只滑行的蜗牛

Taki

在私有1000w数据上跑的实验

2024-01-03 · 北京

​回复​喜欢

展开其他 1 条回复​

妈妈叫我小星星

这算不算是用卡和时间堆出来的工作啊？我看着他们的实验给吓着了，训练时间100多天的都有，专家数几千个？？？  

2024-07-15 · 北京

​回复​喜欢

西红柿炒番茄

效果如何
2023-12-28 · 北京

​回复​喜欢

科技猛兽

​

非常精辟

2023-09-03 · 中国香港

​回复​喜欢

Taki

作者​

偷懒了，很多细节没写

2023-09-03 · 中国香港

​回复​喜欢

关于作者

Taki
THU本硕HKU博 wutaiqiang.github.io

​清华大学 电子信息硕士

回答
376
文章
594
关注者
13,311

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

【简读】Dense-to-sparse Gate for Mixture-of-experts
20211230 第123篇 arxiv.org/pdf/2112.14397.pdf作者：Xiaonan Xie, Shijie Cao, Xupeng Miao, Lingxiao Ma, Jilong Xue, Youshan Miao, Zichao Yang, Zhi Yang, Bin Cui Affiliations: Pek…

Zehao...发表于ML Th...

首篇MoE工作-Adaptive mixtures of local experts(1991)
Jacobs R A, Jordan M I, Nowlan S J, et al. Adaptive mixtures of local experts[J]. Neural computation, 1991, 3(1): 79-87.最近在学MoE这一块的技术，所以对最早的MoE思想比较感兴趣，…

uihcg...发表于论文笔记

Mixture of Experts（MoE）学习笔记
1 学习动机第一次了解到MoE（Mixture of experts），是在GPT-4模型架构泄漏事件，听说GPT-4的架构是8个GPT-3级别大小的模型以MoE架构（8*220B）组合成一个万亿参数级别的模型。不过在这之后…

Verlo...发表于前沿技术学...

mini-batch 在优化算法中的意义
深度学习的优化算法，说白了就是梯度下降。每次的参数更新有两种方式。 第一种，遍历全部数据集算一次损失函数，然后算函数对各个参数的梯度，更新梯度。这种方法每更新一次参数都要把数据…

海瑞先生