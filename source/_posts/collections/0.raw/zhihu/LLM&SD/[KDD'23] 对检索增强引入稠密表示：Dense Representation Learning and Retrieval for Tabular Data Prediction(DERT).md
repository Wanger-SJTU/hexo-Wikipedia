---
title: "[KDD'23] 对检索增强引入稠密表示：Dense Representation Learning and Retrieval for Tabular Data Prediction(DERT)"
date: "2024-10-24 00:00:00"
updated: "2024-10-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/[KDD'23]-对检索增强引入稠密表示-Dense-Representation-Learning-and-Retrieval-for-Tabular-Data-Predicti/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/667183064
---


(本篇论文是原班人马基于RIM进行改进，RIM的检索器使用的是BM25算法，是对稀疏向量的检索。故将其改进成基于稠密表示的检索，即embedding-based的检索)

### Motivation

- 现有的方法仅考虑单条样本，他们忽视了相似样本的辅助信息。
- 一些基于检索增强的方法将数据视为稀疏向量来执行检索过程，这将导致无法利用好表格数据的语义信息。(e.g. 一个单值特征“City”，它可能的值范围有“Shanghai”,“New York”，“Boston”。对于BM25会把不匹配视作相同，即“New York”和“Shanghai”间的不同 与 “New York”和“Boston”间的不同视作相同情况。然而，从现实世界上看，“New York”和“Boston”是属于同一个国家，在语义信息上他们之间更接近。这种情况就要基于embedding。)

### Contribution

- 提出了DERT，一个对表格数据来学习稠密向量表示并用检索样本来增强预测。这是第一个对表格数据运用稠密检索的工作。
- 利用可学习的稠密向量，接着使用了一个对比学习作为辅助损失函数。对检索出的检索样本中标签和目标样本一样的，缩小它们的距离。不一样的，则扩大它们的距离。
- 在预测器中，设计了一个细粒度的特征交互和特征-标签交互模块来提升预测能力。
术语表：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2ee909543171.jpg)

### Method

#### Overview

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_02cacd26b0f4.jpg)

上图显示了DERT和传统的单样本模型，和基于BM25的检索增强的模型(RIM)的区别。

首先训练对目标样本 X_t 和检索池的所有样本 D_{retrieval} 训练同一个encoder E ，接着对 D_{retrieval} 构建一个稠密向量索引作为检索器，具体实现使用一个开源库：快速相似度匹配FAISS(Facebook AI Similarity Search)。

在运行时，给定一个目标样本 X_t ，我们使用encoder E 将其从稀疏向量 X_t 转化为d维的稠密向量 x_t ，接着使用稠密向量 x_t 去 D_{retrieval} 中检索top K 个检索样本。在获得目标样本和检索样本的稠密向量表示 x_t 和 S_t 后，我们将其喂入预测器。在预测器中，有一个使用注意力机制的聚合层来对检索样本 S_t 进行聚合操作(特征域和标签都进行)。接着将聚合后的结果和目标样本的embedding x_t 共同传入MLP中进行预测。

DERT整体结构图如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_69407ba840b8.jpg)

#### Encoder

$Encoder E_{\omega} 将原始样本 X 映射到 d 维的向量，encoder的参数在所有的train,test,retrieval数据集中共享。对一个样本 X_{z}=\{c_{i}^{z}\}_{i=1}^{F} ，其中 c_z 是对样本 X_z 的第 i 列特征域的类别值。对它们编码成embedding后concat起来再过MLP：$

$$x_z=E_\omega(X_z)=MLP(\|_{i=1}^Fe_i(c_i^z)) $$

其中 e_i 是embedding矩阵。

训练encoder使用了监督学习和无监督学习。

- Supervised learning loss
只使用 D_{train} 来对encoder进行训练，损失函数使用交叉熵：

$$\mathcal{L}_{\mathrm{label}}=-\frac{1}{|\mathcal{D}_{\mathrm{train}}|}\sum_{\mathcal{D}_{\mathrm{train}}}(y_{z}\log\bar{y}_{z}+(1-y_{z})\log(1-\bar{y}_{z})) $$

\bar{y}_z=\mathrm{sigmoid}(w^\top x_z+b) 

其中 y_z 是目标样本 z 的真实标签，如果任务是回归任务，则将损失函数改为MSE。

注意：尽管我们用训练集的标签来有监督地训练encoder，但是我们不直接用encoder来进行预测。相反，encoder只是一个产生稠密向量来传递给检索器和预测器的中间过程。

- Contrastive learning loss
对文本和图像领域可能很难判别两个样本是否在同一个组里，但是对表格数据，可以通过特征域来判断。接下来是对正负样本的采样方法介绍。

给定一个 D_{train} 中的样本 X_{z}=\{c_{i}^{z}\}_{i=1}^{F} ，我们将根据相似度来检索出 k 个最相似的样本：

$\operatorname{Relevance}(X_z,X_j)=\sum_{i=1}^F\operatorname{IDF}(c_i^z)\cdot1(x_i^z=x_i^j) $

$$\mathrm{IDF}(x_i^z)=\log\frac{N-N(c_i^z)+0.5}{N(c_i^z)+0.5} $$

$其中 \mathbf{1}(\cdot) 是指示函数， N 是 D_{train} 里的样本个数， N(c_i^z) 是 D_{train} 中含有特征 c_i^z 的样本个数。此处实现都基于RIM对这部分的实现。$

$令 \hat{S}_{z} 是根据目标样本检索出的采样样本集，对目标样本 X_z 和采样样本 \hat{S}_{z} 的标签进行比较。对二分类任务，我们将 \hat{S}_{z} 分为正负样本集 \hat{S}_{z}^+ 和 \hat{S}_{z}^- 。即标签相同为正样本，不同为负样本。此外根据SimCSE对 x_z 生成一个 x'_z 以保证一定有一个正样本。至此对比学习损失为：$

$$\mathcal{L}_\text{contra}=-\log\sum_{|\mathcal{D}_\text{train}|}\frac{e^{\mathrm{dist}(x_z,x_z^{\prime})/\tau}+\sum_{X_j^+\in\hat{S}_z^+}e^{\mathrm{dist}(x_z,x_j^+))/\tau}}{\epsilon+\sum_{X_j^-\in\hat{S}_z^-}e^{\mathrm{dist}(x_z,x_j^-)/\tau}} $$

其中距离函数dist(,)可以使用L2距离。

综上，encoder部分的整体训练目标为：

$\mathcal{L}_{\mathrm{encoder}}=\mathcal{L}_{\mathrm{label}}+\lambda\mathcal{L}_{\mathrm{contra}} $

#### Retriever

检索器的目标是给定目标样本 X_t 从 D_{retrieval} 中去检索最相近的样本，首先都是过embedding后的特征表示：

\mathbb{D}_\text{retrieval}=\{E_\omega(X):X\in\mathcal{D}_\text{retrieval}\} 

$给定目标样本 X_t ，将其过embedding x_{t}=E_{\omega}(X_{t}) 。对 D_{retrieval} 中使用根据embedding后的特征进行点积来检索top K 的检索样本：$

$\sin(x_t,x_i)=x_t^\top x_i,x_i\in\mathbb{D}_{\mathrm{retrieval}} $

检索步骤使用了最大内积搜索(Maximum Inner Product Search，MIPS)，使用了FAISS提供的高效实现方式。

#### Predictor

给定目标样本 X_t  和其embedding x_t 。检索样本的embedding \mathbb{S}_{t} 和样本 \mathbb{Y}_{t} 。

- Attention weight computation
首先计算注意力值，给定 \mathbb{S}_t=\{x_1,x_2,...,x_k\} 和 \mathbb{Y}_{t}=\{y_{1},y_{2},...,y_{k}\} 公式定义如下：

$$\alpha_i=\frac{e^{x_i^\top Wx_t}}{\sum_{j=1}^ke^{x_j^\top Wx_t}} $$

$其中 W^{d\times d} .$

- Label-aware interaction layer
RIM对 \mathbb{S}_t 和 \mathbb{Y}_t 分别执行聚合操作，这导致缺乏了样本特征和标签间的成对交互，检索样本的特征-标签对的特征交互定义如下：

e_i=\text{interaction}(x_i,y_i) 

其中(,)操作使用PNN模型的操作方式。

最终整体的特征-标签对 特征表示定义为：

$e_\mathrm{agg}=\sum_{i=1}^k\alpha_ie_i $

- Output layer
检索样本的特征表示定义为：

$x_\mathrm{agg}=\sum_{i=1}^k\alpha_ix_i $

最终将 目标样本，检索样本聚合，检索特征-标签特征表示 整体concat起来送入MLP最终预测：

\hat{y}_z=\rho(\mathrm{MLP}([x_z,x_\mathrm{agg},e_\mathrm{agg}])) 

也会进行损失函数的计算。其中当任务是二分类任务时， \rho(\cdot) 是sigmoid函数，损失函数是交叉熵损失。当任务是回归任务时， \rho(\cdot) 是线性函数，损失函数是MSE。

整体总结一下整个方法：

- 首先训练一个encoder，它的目标是把所有数据从高维稀疏变为稀疏稠密(embedding)。它的训练目标有俩：①单纯地用encoder后的特征去做预测算损失 ②在 D_{train} 中采样正负样本做对比损失，采样方式使用BM25。它们的目标都是为了使训练出的encoder能更好地获得有区分度的embedding。
- 检索器使用样本做点积(做点积能更好地捕获语义信息，如开篇提到的“Shanghai”，“New York”，“Boston”的例子)来计算相似度去检索出检索样本。
- 预测器吸取了RIM的经验，提出一个特征-标签的交互方式，同作为特征全部传入预测层，[target,retrieval_feature,retrieval_feature_label]。训练目标就是正常的交叉熵。

#### Other things

作者提到了，在训练好encoder E_{\omega} 后， D_{retrieval} 的embedding可以离线做好并复用。并且encoder使用的是现有SOTA的RIM模型。

### Experiments

#### Performance

CTR任务

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f15f774474a4.jpg)

Top-N排序任务

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1c42e6e27b54.jpg)

#### Ablation Study

对对比学习和标签交互的消融，看起来这些模块的提升貌似也不是很大......。值得注意的是，消融标签交互指的是去掉了 特征-标签 的交互。但是此时还是会使用标签的特征，即对检索样本的标签使用聚合操作，此时模型这部分退化成RIM的形式。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cddfd7a37db6.jpg)

注意这里计算的是encoder的预测能力，AUC是计算encoder给出的预测值和ground truth的指标。其中NO CL值得是无对比学习的情况。这里的检索也是对目标样本在 D_{train} 中采样正负样本的检索。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e5967762322d.jpg)

#### Hyperparameter Study

对检索样本k的实验。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_42503662a1ee.jpg)

对encoder中计算总损失函数时的 \lambda 进行实验。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a8310f30c66b.jpg)

#### Study of Efficiency

RIM和DERT中预测器的推理时间。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9bb69515595e.jpg)

RIM和DERT的检索时间，检索时间相比RIM快了很多，应该也得益于使用FAISS的实现方式。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f5a5ed3885b2.jpg)

### Conclusion

本文提出了DERT，一个学习了稠密向量表示和基于检索增强提升预测性能的框架。和先前的检索增强方法相比，本文食欲稠密向量检索，这能更好地捕获语义信息之间的差异。同时采用对比学习来更好地区分正负样本，提高embedding的表示能力。
