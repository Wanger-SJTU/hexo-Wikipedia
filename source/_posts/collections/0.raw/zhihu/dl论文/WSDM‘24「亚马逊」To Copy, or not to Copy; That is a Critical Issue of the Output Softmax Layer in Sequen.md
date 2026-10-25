---
title: WSDM‘24「亚马逊」To Copy, or not to Copy; That is a Critical Issue of the Output Softmax Layer in Sequen
date: "2024-02-28 00:00:00"
updated: "2024-02-28 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/WSDM‘24「亚马逊」To-Copy,-or-not-to-Copy;-That-is-a-Critical-Issue-of-the-Output-Softmax-Layer-/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/684422968
---


[To Copy, or not to Copy; That is a Critical Issue of the Output Softmax Layer in Neural Sequential Recommendersarxiv.org/pdf/2310.14079.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2310.14079.pdf)

这标题挺有趣的，to be, or not to be, that is the question。

不管在哪个app上，用户往往会有很多的重复行为。这篇文章利用一个分段的softmax函数--softmax-CPR（有点自引嫌疑），建模序列推荐中的重复商品。代码：[GitHub - iesl/softmax_CPR_recommend](https://link.zhihu.com/?target=https%3A//github.com/iesl/softmax_CPR_recommend)

### 1 引言

现有方法并不能很好地决定是否复制或排除用户历史行为中出现过的商品。本文从这个动机出发，确定了这个问题的根源在softmax层，并在缓解 softmax 的问题后得到了显着的性能改进。

在协同过滤中，softmax/矩阵分解层有几个优点：**它会鼓励相似的项目具有相似的emb，并且相似的输入序列会被编码为相似的用户emb。**比如可乐和雪碧在用户的历史行为中共现次数很多，神经网络会给共现次数多的商品有相近的emb映射。如下图所示，softmax函数会拉近分子，拉远分母。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_8d3e947397a2.jpg)

尽管softmax/矩阵分解层很有效，但其**相似性结构是全局的**，有时会阻止神经推荐器输出所需的分布。如下图所示，如果一个用户重复购买了尿布产品和苹果汁产品，则下一个商品很可能是尿布产品或苹果汁产品。为了输出分布，神经推荐器需要输出介于尿布嵌入和苹果汁嵌入之间的用户嵌入，这可能会意外地接近苹果味婴儿食品的嵌入和/或苹果汁的嵌入孩子们。在这种情况下，softmax 层中的单个隐藏状态嵌入和静态项目嵌入导致难以正确复制历史项目序列中的项目。当嵌入空间非常拥挤时（例如，项目数量很大），这个问题会变得更加严重。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_965effe86b85.jpg)

另一方面，相似性结构也可能迫使神经推荐器不正确地复制先前的项目。如下图所示，如果一个用户刚刚购买了《复仇者联盟》电影的 DVD，则该用户可能想观看其他漫威电影，例如《钢铁侠》或《美国队长》（即类似《复仇者联盟》的电影，但不是《复仇者联盟》本身） 。然而，接近所有其他漫威电影的用户嵌入将不可避免地接近复仇者联盟的嵌入，因为复仇者联盟电影与所有其他漫威电影相关。这可能会迫使神经推荐器继续推荐用户以前看过的电影。在这种情况下，softmax层会导致难以正确排除历史项目序列中的项目。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_738331827c61.jpg)

由于问题的本质在于softmax函数无法在copy和exclude之间有效切换，即所谓的softmax瓶颈问题，因此本文提出将softmax-CPR函数应用在序列推荐上。softmax-CPR最初提出是为了减少语言生成模型的幻觉。

### 2 方法 

softmax 层如下所示，会拉近分子，拉远分母：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_41f57f3d262c.jpg)

Softmax-CPR 包括三个部分：上下文分区、指针网络和Reranker分区。如下图所示：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_6809ff5985cb.jpg)

$**上下文分区。**将公式（1）中的 \mathrm{Logit}(x, i_n)=\underline{h}^T_{i_n}\underline{p}_x 改为分段函数：$

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_4042a5ed9f6b.jpg)

上式中， i_n=p_1^i...p_n^i 表示用户的行为序列， \underline{f}^T_{i_n,C},\underline{f}^T_{i_n,V} 是两个线性映射矩阵。上下文分区允许推荐器了解何时复制输入项以及何时排除输入项。例如，在图  (b) 中，推荐器可以将 \underline{f}_{i_n,C} 放置在苹果汁和尿布之间，而不会受到婴儿食品的干扰，因为 \underline{f}_{i_n,C} 是仅针对输入项的隐藏状态。类似地，在图（c）中，推荐器可以学习输出一个非常小的值 \underline{f}^T_{i_n,C}\underline{p}_x ，以排除所有以前看过的电影，同时将 \underline{f}_{i_n,V} 放在我们应该推荐的电影的中心。（p.s.这篇文章里 f 比较多，理解成一个函数就行了。）

$**指针网络。**指针网络与上下文分区类似，不同之处在于Logit的计算方式改为： \underline{f}_{i_n,p}^T \underline{f}_{x,i_n,L} $

**Reranker分区。**在上下文分区或指针网络中，我们仅使用投影隐藏状态单独计算输入项的逻辑。然而，接下来也可能会出现一些未探索的项目，并且它们也可能会遇到softmax瓶颈问题。为了缓解这个问题，Reranker分区使用另一个新的隐藏状态分别计算最可能的项目的逻辑： \underline{f}^T_{i_n,R1}\underline{p}_x 

最终Softmax-CPR函数的概率计算公式为：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_ede5180601b3.jpg)

### 3 实验

作者主要替换了SASRec和GRU4Rec两个base模型的softmax：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_b8118a978aaf.jpg)

### 4 相关方法

Repetition and Exploration in Sequential Recommendation sigir23
