---
title: 推荐系统常用指标（续）MRR、HR、MAP，Fscore - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-13/推荐系统常用指标(续)MRR、HR、MAP,Fscore-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: a631977e-1d0c-4e3c-9a0c-46f282104536
---

# 推荐系统常用指标（续）MRR、HR、MAP，Fscore - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/mrr-hr-map-fscore-18f6f80de95)
[Read Original](https://zhuanlan.zhihu.com/p/433081516)



上回和大家分享了推荐算法中的常见指标Precision、Recall、AUC、GAUC等，此次继续和大家分享一些推荐系统中常见的评价指标，包括：MRR、HR、MAP等。这次分享的一些指标会用到上回介绍的一些内容，因此有不了解的小伙伴可以先看一下

## MRR

平均倒数排名（Mean Reciprocal Rank,MRR），该指标反应的是我们找到的这些item是否摆在用户更明显的位置，强调位置关系，顺序性。公式如下，N表示推荐次数，pip\_i表示用户真实访问的item在推荐列表中的位置，如果没在推荐序列中，则p为无穷大，1/p为0。

MRR\=1N∑i\=1N1piMRR=\\frac{1}{N}\\sum\_{i=1}^{N}{\\frac{1}{p\_i}} \\\\

举个栗子：加入我们去top-5，推荐\[1,2,3,4,5\]这5个item，然后测试数据中对应的访问的item为3，则1/p=1/3。

## HR

命中率（Hit Rate，HR），它反映的是在推荐序列中是否包含了用户真正点击的item，公式如下，N表示推荐次数，hit()函数表示是否命中，即用户选择的item是否在推荐序列中，存在则为1，反之则为0。

HR\=1N∑i\=1Nhit(i)HR=\\frac{1}{N}\\sum\_{i=1}^{N}{hit(i)} \\\\

## MAP

平均精度均值（Mean Average Precision，MAP），该指标在目标检测、多标签等领域也都有应用，是一个应用很广的评价指标。MAP是计算AP（Average Precision）的均值，因此我们需要先知道如何计算AP。

首先简单介绍一下AP，我们在用评价指标进行评估的时候，Precision和Recall都只能从一个方面来反映模型的性能，最理想的是我们希望Precision和Recall都能很高，但是通常情况下，两者会相互影响，因此可以把Precision看成是Recall的函数，P=f(R)。那么假设R从0到1，我们就可以得到对应的P的值，可以在R上进行积分，得到P的期望，如下式。

 AP \=∫01P(r)dr\\text { AP }=\\int\_{0}^{1} P(r) d r \\\\

当然在推荐场景下他是离散的，可以写成下式，其中hit就是之前HR中的hit函数值域为{0,1}，而这边的p就是在MRR中和位置相关的p。

AP\=1N∑i\=1Nhit(i)×1piAP=\\frac{1}{N}\\sum\_{i=1}^{N}{hit(i)\\times \\frac{1}{p\_i}} \\\\

举个栗子：假设两个推荐系统甲、乙，分别对a,b,c三个item进行推荐，

结果为: 

系统 推荐item 位置系数1/p 

甲： \[0,1,0\]， \[1/1,1/2,1/3\] 

乙： \[0,0,1\] \[0, 1/2,1/3\] 

则我们可以计算得到AP(甲)=1/2，AP(乙)=1/3，因此甲更优。 可以发现AP是在单个user或者说单次推荐中进行计算的，将所有User或者说多次推荐后的AP进行平均就是MAP。公式如下，

MAP\=1|U|∑i\=1|U|APiMAP=\\frac{1}{|U|}\\sum\_{i=1}^{|U|}{AP\_i} \\\\

## F-Score

刚刚我们提到同时考虑Precision和Recall的MAP，这里还有一个可以同时考虑P和R的指标就是F-score。这个指标其实也很常用，这里就不过多介绍了。公式如下，

F\=2PRp+RF=\\frac{2PR}{p+R} \\\\

​

