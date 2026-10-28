---
title: "多模态大模型里面的语义一致性Tokenization"
date: "2024-06-16 00:00:00"
updated: "2024-06-16 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/多模态大模型里面的语义一致性Tokenization/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/703711019"
---


《Towards Semantic Equivalence of Tokenization in Multimodal LLM》是NTU、NUS和昆仑天工AI提出来的一个工作，探索了多模态大模型里面对视觉信息的Tokenization，同时提出了一个有效的Semantic-Equivalent Vision Tokenizer (SeTok)，通过动态聚类算法，将视觉特征划分为一个一个的语义单元，基于图像的复杂度灵活决定图片的token数目，这样可以更好地保留图片的语义完整性、低频和高频视觉特征，如图Fig 1所示。

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.05127)

[](https://link.zhihu.com/?target=https%3A//chocowu.github.io/SeTok-web/)

[](https://link.zhihu.com/?target=https%3A//github.com/ChocoWu/SeTok)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4fa42a98c1e3.jpg)

Fig 1 视觉Tokenization方法对比模型结构结构如图Fig 2所示，下面对模型的各个部分做简单的介绍。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3e37f6603769.jpg)

Fig 2
### Semantic-equivalent Vision Tokenizer

$输入图片是 I \in \mathbb{R}^{H\times H \times 3} ，经过Vision Encoder（ViT或者CNN之后）得到图片特征 \textbf{X}=\{x_{i,j}\}\in \mathbb{R}^{h\times w \times d} ，记下来需要进行视觉特征聚类，得到 assignment mask M\in \mathbb{R}^{h\times w \times k} 。$

聚类步骤如下：

- 选择一个还没有归属为任何一个cluster的位置 (i,j) ；
- 基于选择位置出的特征向量和其他所有位置出的特征向量的距离 \phi=\text{exp}(-||u-v||^2\cdot k\ln2) ，对选择的位置处的特征向量进行聚类归属；
- 重复上述的两个步骤，知道所有的特征向量归属完毕或者遇到一个stop criterion。
$$选择位置 (i,j) 的时候，是基于该位置处的密度峰值，即 \rho_{i,j}=\text{exp}(-\frac{1}{K}\sum_{x_{m,n} \in KNN(x_{i,j},X)}||x_{m,n}-x_{i,j}||^2) $$

$KNN(x_{i,j},X) 是 x_{i,j} 在 X 中的K-nearest邻居。接下来度量特征 x_{i,j} 和其他特征的距离 \delta_{i,j} ，$

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7b8734da8874.jpg)

最后每一个位置处的得分为 s_{i,j}=\rho_{i,j}\times \delta_{i,j} 。接下来便是选择得分最高的且没有归属于任何cluster的位置 (i,j) ，具体算法流程如图Fig 3所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_64de0638a18d.jpg)

$Fig 3接下来有一个Cluster Merge步骤，具体来说先是得到每一cluster的特征向量集合， \hat{X}_i=PE(X)\odot M_i+X\odot M_i ，flatten之后得到 \hat{X}_i=\{x_i\}\in \mathbb{R}^{N\times d} ， N 是每一个cluster的特征向量的数目，接下来通过average pooling（ u_i=\text{Avg}(\text{Merger}(\hat{X}_i))\in \mathbb{R}^d ）和Transformer得到图片的token特征 U=\{u_i\}\in \mathbb{R}^{k\times d} 。$

### Multimodal Training Scheme

训练分为三个阶段，每一个阶段使用到的数据如下图Fig 4所示，

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ead943e1debd.jpg)

Fig 4
#### Stage-I: Tokenizer Pretraining

如图Fig 2所示，首先是经过Cluster以及Merge之后的图像特征通过Q-Former之后，作为扩散模型的Unet模型的attention模块的key和value，或者说条件输入，引导图片的生成，损失如下图Fig 5所示

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a2c62dc46dc7.jpg)

Fig 5除此以外，经过Cluster以及Merge之后的图像特征也会通过一个mask decoder，和原来的图像特征进行dot-product，得到分割的mask，同时也会用前面得到的聚类mask \pi 和预测的mask计算KL散度，即

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d97497e11d3e.jpg)

$Fig 5\pi \in [0,1]^{h\times w\times k}, \sum_{n}\pi_{i,j,n}=1 $

训练分为两个phrase，第一个phrase固定住vision encoder，只对cluster merger、Q-former和Unet的key和value进行更新。第二个phrase则会对mask decoder部分的参数进行更新。

#### Stage-II: Multimodal Pretraining

这个阶段除了预测文本的下一个token的cross-entropy损失以外，也会包括计算特征重建误差的Mean Squared Error（MSE）。会有两个特殊的token [\text{Img}] 和 [\text{/Img}] ，判断图片的出现和结束。

#### Stage-III: Instruction Tuning

视觉指令微调，通过LoRA对LLM的参数进行更新。