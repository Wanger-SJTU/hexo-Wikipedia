---
title: "现在LLM 的大小为什么都设计成6/7B、13B和130B几个档次？【Scaling Law】"
date: "2023-12-10 00:00:00"
updated: "2023-12-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/现在LLM-的大小为什么都设计成6_7B、13B和130B几个档次-【Scaling-Law】/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/670046783"
---


除了文章题目，实践中也许会遇到以下问题：

给定模型大小，需要多少数据？给定数据大小，可以训多大的模型？给定卡数目（flops），模型大小和数据大小怎么确定？batch size怎么调？模型放大10倍数据放大多少？模型放大之后效果能提升多少？

这就是scaling law要回答的问题。

### 以下为论文翻译结果。

<strong>scaling law</strong>：语言模型性能主要和尺寸（scale）有关，和模型形状(宽度、深度)基本无关。scale主要说的是三个因素：参数量N（不包括embedding），数据集大小D，训练计算量C。大模型比小模型样本效率高，所以计算效率最高的方式是训练大模型早点停止，而不是训练小模型到收敛。

浮点运算量（FLOPs）C" role="presentation">CC、模型参数N" role="presentation">NN以及训练的token数D" role="presentation">DD之间存在关系：C∼6ND" role="presentation">C∼6NDC\sim6ND

N ∝ C^0.73

最优batch size B ∝ C ^ 0.24

最优训练步数 S ∝ C ^ 0.03

transformer 语言模型的核心结论：

1、<strong>模型性能主要和模型尺寸（scale）有关，和模型形状基本无关。</strong>scale主要说的是三个因素：参数量N（不包括embedding），数据集大小D，训练计算量C。性能基本和模型的宽度、深度没什么关系。

<strong>2、平滑幂律</strong>。性能和N、D、C中的每一个都有幂律关系（另外两个不受限制的情况下），趋势跨越了6个数量级。

下图的意思是N、D、C中每一个增加，模型loss都会平滑下降。为了获得最优模型性能，三个因素需要同时增加。幂律关系的前提是增加其中一个因素的时候，不受另外两个因素的限制。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a0ae712c1df5.jpg)

图1<strong>3、过拟合的通用性。</strong>N和D同时增加时模型性能会增加。但N和D有一个固定住时，另外一个增加，模型性能的增益会消失。模型大小增加时8倍时，数据至少要增加5倍。

<strong>4、训练通用性。</strong>训练的曲线遵循可预测的幂律关系，和模型大小无关。通过训练曲线早期部分，我们可以预测出训练后期的loss变化过程。

<strong>5、迁移测试性能</strong>。如果在一个和训练文本分布不同的测试集上评估模型，结果和训练集基本一致，只是多了个恒定的损失。

<strong>6、样本有效性。</strong>大模型比小模型更高效，达到同样的性能只需要更少的优化步骤和数据。

<strong>7、收敛效率低下</strong>。如果固定住训练预算C，但模型大小N和数据D没有限制，我们能够获得最优的性能的方式是训练一个很大的模型，不等到收敛就停止训练。

<strong>8、最优batch size</strong>。训练这些模型的理想批量大小大致仅是损失的幂，并且可以通过测量梯度噪声标度来确定


参考资料：

[[2001.08361] Scaling Laws for Neural Language Models (arxiv.org)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2001.08361)

[nghuyong：解析大模型中的Scaling Law](https://zhuanlan.zhihu.com/p/667489780)

公主号【walle优选笔记】，欢迎来玩

相关文章：

[喝拿铁的皮卡丘：大模型面经-transformer部分](https://zhuanlan.zhihu.com/p/659786905)

[喝拿铁的皮卡丘：大模型面经-强化学习部分](https://zhuanlan.zhihu.com/p/663145566)

[喝拿铁的皮卡丘：为什么现在的LLM都是Decoder-only架构？从理论、训练效率与工程实现等多维度分析](https://zhuanlan.zhihu.com/p/663853562)
