---
title: 推荐系统中的常用评价指标：NDCG，Recall，AUC，GAUC - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-13/推荐系统中的常用评价指标-NDCG,Recall,AUC,GAUC-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 3d280752-083e-43e4-a198-d940edf53f29
---

# 推荐系统中的常用评价指标：NDCG，Recall，AUC，GAUC - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/ndcg-recall-auc-gauc-18f6f8101b9)
[Read Original](https://zhuanlan.zhihu.com/p/431704675)



小夏又来分享小知识点辣，喜欢的小伙伴可以给个三连哈，感谢支持

更多内容可以关注公众号：秋枫学习笔记

混淆矩阵用于反映预测和真实的对应样本数，例如TP反映预测为真的样本也是正样本的样本数。

## 1\. 召回阶段

## 1.1 Recall

召回率（Recall）是推荐系统在召回阶段常用的评价指标。在其他领域我们也经常会看到Recall作为评价指标，其含义为<strong>在正样本中有多少被预测为真</strong>，recall\=TPTP+FNrecall=\\frac{TP}{TP+FN}。那么在推荐系统中，我们通常可以通过recallu\=|R(u)∩T(u)||T(u)|recall\_u=\\frac{|R(u)\\cap T(u)|}{|T(u)|}。其中u为用户，R(u)为模型预测出的需要推荐的item的集合，T(u)表示真实的测试集中被推荐的集合。对每一个用户求得recall后求平均就可以得到整个数据集上的recall。

## 1.2 Precision

Precision的含义为<strong>预测为真的样本中有多少为正样本</strong>，Prec\=TPTP+FPPrec=\\frac{TP}{TP+FP}。在推荐系统中可以计算为Precu\=|R(u)∩T(u)||R(u)|Prec\_u=\\frac{|R(u)\\cap T(u)|}{|R(u)|}。对每个用户求得prec后求平均就可以得到整个数据集上的prec。

## 1.2 NDCG

这个评价指标名为Normalized Discounted cumulative gain直接翻译为归一化折损累计增益。它有一些前辈，我们先来介绍一下他的前辈们，然后再来介绍NDCG。

### 1.2.1 CG

cumulative gain（CG）可翻译为累积增益，改评价指标只考虑相关性而没有考虑位置的影响。其计算方式也比较简单，对搜索相关性进行求和，公式如下，在推荐系统中，relirel\_i表示第i个位置的item是否是用户喜欢的，喜欢为1，否则为0。CG只能反映总体情况，即反映该页面中推荐的所有item的总分是好是坏。

```text
CG\=∑i\=1preliCG=\\sum\_{i=1}^{p}{rel\_i} \\\\
```


### 1.2.2 DCG

discounted CG简称为DCG，这对CG的问题，DCG的计算方式考虑了位置因素。例如，被推荐的item排在第1位和排在第10位，他们的影响力是不同的，肯定是第1位的影响力更大。因为用户进去第一眼就能看到第1位的item。计算公式如下，第1位不需要衰减，而随着位次不断靠后，其影响力也不断减弱。

```text
DCG\=rel1+∑i\=2prelilog2iDCG=rel\_1+\\sum\_{i=2}^{p}{\\frac{rel\_i}{log\_2 i}} \\\\
```


还有一种计算DCG常见的公式，如下式所示：

```text
DCG\=∑i\=1p2reli−1log2(i+1)DCG=\\sum\_{i=1}^{p}{\\frac{2^{rel\_i}-1}{log\_2(i+1)}} \\\\
```


### 1.2.3 NDCG

ok，千呼万唤始出来，终于来到我们的主角了。搜索结果，或者召回结果，推荐结果等，这些结果是一个集合，对于不同的关键词，或者不同的用户系统返回的结果数量是不同的。而上面的CG和DCG他们只是单纯的进行求和，无法进行不用用户之间的对比，因此需要对其进行标准化，从而诞生了NDCG。 这里对DCG进行标准化的方式是对其处以IDCG，公式如下：

```text
NDCG\=DCGIDCGNDCG=\\frac{DCG}{IDCG} \\\\IDCG\=∑i\=1|REL|2reli−1log2(i+1)IDCG=\\sum\_{i=1}^{|REL|}{\\frac{2^{rel\_i}-1}{log\_2(i+1)}} \\\\
```


其中REL表示将原始的召回集合R按照得分从大到小排序后的集合，将排序后的集合计算DCG得到IDCG。标准化后得到的NDCG是一个相对值，从而使得即使不同的用户之间可以进行比较。IDCG表示的是召回的集合中的item用户都喜欢的最理想情况。所以IDCG中的分子部分其实都是1。

## 2\. 排序阶段

## 2.1 AUC

AUC（area under Curve），是ROC曲线下的面积，具体概念这里不赘述了。<strong>AUC能反映模型的排序能力，他反应的是一个相对性，即item a排在item b之前的能力；但是它不反应绝对性，例如，0.9排在0.1前面和0.5排在0.1前面对他来说是一样的</strong>。推荐系统中AUC可以通过下式计算，其中R为推荐的item集合，δ(x)\\delta(x)表示当x为true时，它为1；反之为0。

AUC(R)n\=1|R|(n−|R|)∑r∈R∑r′∈({1,…,n}∖R)δ(r<r′)\=n−|R|−12−1|R|∑r∈Rrn−|R|

```text
\\begin{aligned} \\operatorname{AUC}(R)\_{n} &=\\frac{1}{|R|(n-|R|)} \\sum\_{r \\in R} \\sum\_{r^{\\prime} \\in(\\{1, \\ldots, n\\} \\backslash R)} \\delta\\left(r < r^{\\prime}\\right) \\\\ &=\\frac{n-\\frac{|R|-1}{2}-\\frac{1}{|R|} \\sum\_{r \\in R} r}{n-|R|} \\end{aligned}\\\\
```


## 2.2 GAUC

AUC他是从总体上反应模型的性能，但是无法从更加个性化的角度进行分析。<strong>推荐系统本身是针对不同用户进行个性化推荐，因此有时候我们在进行分析的时候不能只看整体的AUC。GAUC是AUC的改进版，将样本进行分组后，在组内计算AUC</strong>。计算公式如下，其中w为每个分组中的对应的权重，可以是点击次数，观看时长，停留时间等。

```text
GAUC\=∑giwgi∗AUCgi∑wgiG A U C=\\frac{\\sum\_{g\_{i}} w\_{g\_{i}} \* A U C\_{g\_{i}}}{\\sum w\_{g\_{i}}} \\\\
```


这里举个栗子：（来源<strong><https://blog.csdn.net/hnu2012/article/details/87892368></strong>） 假设有两个模型A，B；有两个用户甲、乙；+表示正样本，-表示负样本，我们按照预测值从小到大排序后得到下表

| 模型A | 甲- | 甲+ | 乙- | 甲+ | 乙+ |
| --- | -- | -- | -- | -- | -- |
| 模型B | 甲- | 甲+ | 甲+ | 乙- | 乙+ |

则可以计算得到总体的AUC为：AUC(A)=0.833，AUC(B)=0.667。但是如果我们分人群的话，对于甲乙而言，两个模型是一样好的。大家可以自己计算一下分人群后的AUC。

## 2.4 LogLoss

通常还会计算一下LogLoss来进行对比，这里就不赘述了，LogLoss就是我们在训练模型用到的损失函数。

​

