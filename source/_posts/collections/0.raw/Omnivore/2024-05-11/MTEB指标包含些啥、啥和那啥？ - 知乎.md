---
title: MTEB指标包含些啥、啥和那啥？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-11/MTEB指标包含些啥、啥和那啥-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: dfe9ef61-c5e0-4056-a995-ccc01d207a40
---

# MTEB指标包含些啥、啥和那啥？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/mteb-18f65c80466)
[Read Original](https://zhuanlan.zhihu.com/p/676495018)



MTEB（Massive Text Embedding Benchmark）是一堆衡量文本嵌入模型的评估指标合集，与之对应的中文评估指标是 C-MTEB （flag-embedding开源项目）。这里面包含了一堆任务，这些任务是些啥？语料是些啥？评估指标是啥？

如果你有这些疑问，相信我，通读本篇文章，您会得到这些问题的答案。

![](https://proxy-prod.omnivore-image-cache.app/662x447,s4kkANq6wykI2EEQlMej8TKTNjJyDH0qgmHNyl91bxhs/https://pic1.zhimg.com/v2-32c6311037b4107cddb922a84f173ec4_b.jpg)

C-MTEB中的数据集，来自C-Pack

C-MTEB中的数据集非常的丰富，包含6种任务类型，35个数据集！因此，用该benchmark来衡量一个文本嵌入模型的性能，不能说是非常完美，但也可以说是非常中肯了。

那我们看benchmark时，我们应该关注哪些指标呢？我们一起来看看吧

## 这些任务是啥？

在说每种任务是什么前，我们先提纲挈领的总结一下：

```text
* 分类，一段文本，指标：准确率（多分类）或精确率（二分类）
* 聚类，多段文本，指标：V-Measure
* 查询类，一段文本查多段文本
   * 在有限集合中查询
      * Re-Ranking，指标：MAP（mean average precision）
   * 在无限集合中查询
      * Retrival，指标：NDCG@10
* 一段文本与另一段文本的关系（这类需要一群样本）
   * 相似性，STS，指标：Spearman秩相关性系数
   * 判别性，Pair-classification，指标：AP（average precision）
```


那具体到某中任务和其指标的含义，我们再分别看一下吧

### Retrival

NDCG@10: NDCG（Normalized Discounted Cumulative Gain）是信息检索领域中用于评估排名质量的一种指标。NDCG@k 是 NDCG 的一个变种，其中 "@k" 表示考虑排名的前 k 个文档。

NDCG@k\=DCG@kIDCG@k NDCG@k=\\frac{DCG@k}{IDCG@k} 

其中，IDCG（Ideal Discounted Cumulative Gain）：

IDCG@k\=Σi\=1k2relideal,i−1log2(i+1) IDCG@k=\\Sigma\_{i=1}^{k}\\frac{2^{rel\_{ideal,i}}-1}{log\_2(i+1)} 

比如，查询10个文档，其相关性为，1 0 1 0 1 1 0 0 0 0，则排序后为 1 1 1 1 0 0 0 0 0 0 

21−1log22+21−1log23+21−1log24+21−1log25\= \\frac{2^1 - 1}{log\_2^2} + \\frac{2^1 - 1}{log\_2^3} + \\frac{2^1 - 1}{log\_2^4} + \\frac{2^1 - 1}{log\_2^5} = 2.5616063116448506 

使用python实现如下：

```angelscript
def calc_IDCG(correlations: List[bool]):
    corrs = sorted(correlations, reverse=True)

    acc = 0
    for i in range(len(corrs)):
        if corrs[i]:
            acc += 1 / math.log2(i + 2)
        else:
            break
    return acc

print(calc_IDCG([1,0,1,0,1,1,0,0,0,0])) 
```

其中，DCG（Discounted Cumulative Gain）

DCG@k\=∑i\=1k2reli−1log2⁡(i+1) DCG@k = \\sum\_{i=1}^{k} \\frac{2^{rel\_i} - 1}{\\log\_2(i + 1)} 

继续上面的例子： 

21−1log22+21−1log24+21−1log26+21−1log27\=2.243059994342564 \\frac{2^1 - 1}{log\_2^2} + \\frac{2^1 - 1}{log\_2^4} + \\frac{2^1 - 1}{log\_2^6} + \\frac{2^1 - 1}{log\_2^7}= 2.243059994342564 

代码实现如下：

```properties
def calc_DCG(correlations: List[bool]):
    acc = 0
    for i in range(len(correlations)):
        if correlations[i]:
            acc += 1 / math.log2(i + 2)
    return acc
```

最终，这个例子的NDCG是 0.8756458727267334。

### Re-Ranking

MAP（Mean Average Precision），计算一组文档重排的指标。其衡量的是，是否能够根据query，正确的区分正样本和负样本。其代码实现如下：

首先，MAP，是AP的均值，公式是：

MAP\=1n\_queriesΣ1nAP MAP = \\frac{1}{n\\\_queries} \\Sigma\_{1}^{n} AP 

那AP（Average Precision，平均查准率）如何计算呢？每个样本embedding的结果是一组浮点数，首先，我们需要计算样本对的余弦相似度，从而获取正负样本的分数。然后，我们将分数作为阈值，绘制PR曲线，并求得曲线下面的面积。其公式如下：

AP\=∑n(Rn−Rn−1)Pn \\text{AP} = \\sum\_n (R\_n - R\_{n-1}) P\_n 

其中， Rn 是召回率（recall），TP：真正例，FN：假负例。正例中被预测正确的比例。

R\=TPTP+FN R = \\frac{TP}{TP+FN} 

其中，Pn 是查准率（precision），TP：真正例，FP：假正例。真正例在所有预测为正例的样本中所占的比例。

P\=TPTP+FP P = \\frac{TP}{TP+FP} 

代码如下：

```makefile
from sklearn.metrics import average_precision_score

query="蜂巢取快递验证码摁错怎么办"
positives=["...", "...."]
negatives=["...", "....", "..."]

# 计算相似度
positive_scores = [similarity(query, i) for i in positives]
negative_scores = [similarity(query, i) for i in negatives]

# 计算 average precision，多组样本取平均则是MAP
ap = average_precision_score([1,1,0,0,0], positive_scores + negative_scores)
```

### STS (Semantic Textual Similarity)

语义文本相似度，其数据形式是一对文本，标签是其是否相关。该类任务的关键指标采用的是Spearman秩相关性系数，文本对的标签有两类，相关是1，不相关是0。当采用该指标时，需同时计算很多对文本对。

Spearman秩相关性系数的公式如下：

ρ\=1−6∑di2n(n2−1) \\rho = 1 - \\frac{6\\sum d\_i^2}{n(n^2 - 1)} 

其中，$d\_i$ 是第i个变量秩次之间的差异，秩次指的是从小到大排列后从1开始的次序，比如 \[0.1, 0.3, 0.2\] 的秩次是 \[1, 3, 2\]。

代码如下：

```angelscript
from scipy.stats import pearsonr, spearmanr
from sklearn.metrics.pairwise import paired_cosine_distances

# 这里省略了embeddings1和embeddings2的推理逻辑
# 其分别是样本组1和样本组2的嵌入向量
cosine_scores = 1 - (paired_cosine_distances(embeddings1, embeddings2))
cosine_spearman, _ = spearmanr([0,0,1,0,1], cosine_scores) # 这里假定有5对句子，相关关系分别是：否、否、是、否、是
```

### Classification 

分类的语料比较简单，基本上都是一段文本对应一个标签。我们将embedding模型视为特征提取工具，然后用这些特征训练一个线性分类器，训练完成后，预测新数据上的标签，根据分类的结果计算 average precision（二分类） 或 accuracy （多分类）。AP的计算方法上面已经说到了，不再赘述。

其中，准确率的公式如下：

```text
accuracy(y,ˆy)\=1nsamples∑nsamples−1i\=01(ˆyi\=yi) \\texttt{accuracy}(y, \\hat{y}) = \\frac{1}{n\_\\text{samples}} \\sum\_{i=0}^{n\_\\text{samples}-1} 1(\\hat{y}\_i = y\_i) 
```


代码如下：

```makefile
from sklearn.linear_model import LogisticRegression

# 训练一个线性分类器
clf = LogisticRegression()
X_train = np.asarray(model.encode(sentences_train, batch_size=32))
clf.fit(X_train, self.y_train)

# 预测测试集上的标签
y_pred = clf.predict(X_test)
# 计算准确率
accuracy = accuracy_score(self.y_test, y_pred)
```

### Pair-classification

在对分类中，问题的定义是给定一对文本，判断其是否具有相同含义。衡量指标指标是AP（average precision）。公式前面已经给定，这里直接看代码：

```angelscript
from sklearn.metrics import average_precision_score
from sklearn.metrics.pairwise import paired_cosine_distances

left_embeddings=[[...], [...]]
right_embeddings=[[...], [...]]

# 计算相似度
scores = paired_cosine_distances(left_embeddings, right_embeddings)

# 计算 average precision，1表示是同一类，0表示是不同类
ap = average_precision_score([1,1,0,0,0], scores)
```

### Clustering 

文本的聚类任务比较常见，其语料一般是个多分类的问题。计算聚类指标时，一般使用的是v-measure指标，它能比较好的衡量聚类的一致性和完整性。需要注意的是，计算该指标时，需要使用小批量的方式训练模型。

v-measure  V = \\frac{2 \\times \\text{同质性} \\times \\text{完整性}}{\\text{同质性} + \\text{完整性}} 

其中，同质性为：

 \\text{同质性} = 1 - \\frac{H(C|K)}{H(C)} 

其中，H(C|K) 表示给定聚类结果K的条件下类别 C 的条件熵，H(C) 表示类别的熵。而完整性为： 

 \\text{完整性} = 1 - \\frac{H(K|C)}{H(K)} 

其中，H(K|C) 表示给定类别C的条件下聚类结果K的条件熵，H(K) 表示聚类结果的熵。

实际中，我们不需要自己实现，只需要调用sklearn库就可以了：

```makefile
# encoding
corpus_embeddings = np.asarray(model.encode(sentences))

# 聚类
clustering_model = sklearn.cluster.MiniBatchKMeans(n_clusters=n_labels, batch_size=32)
clustering_model.fit(corpus_embeddings)

# 计算指标，label是文本对应的标签
v_measure = sklearn.metrics.cluster.v_measure_score(labels, clustering_model.labels_)
```

## 结语

最后，向大家推荐一下再C-MTEB是效果拔群的一个开源模型，其名称是BGE（BAAI General Embedding）模型，大家可以再huggingface上下载到，指标如下：

![](https://proxy-prod.omnivore-image-cache.app/908x372,sDfDld_CCN827hi9UwPxekY5_JOuMAqiU_8jms272lUk/https://pic3.zhimg.com/v2-241295a7ce651163fb17297bf9727a5e_b.jpg)

BGE模型的指标，来自C-Pack论文

其经历了如下的训练方式：

```text
* 大规模语料的预训练
* 通用意图的微调（对比学习的方式）
* 任务特定的微调（使用有标签的数据）
```


![](https://proxy-prod.omnivore-image-cache.app/1328x162,shX6ccg7RX-YjTZYX-VhjbFLRJZXP9kRsY6xj9YWUm50/https://pic2.zhimg.com/v2-77a1543a082ba925ac05bf8d402d6085_b.jpg)

BGE模型的训练方法，来自C-Pack论文

引用：

1. C-Pack: Packaged Resources To Advance General Chinese Embedding

