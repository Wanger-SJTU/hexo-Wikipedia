---
title: 线性注意力机制：Linear Attention->Lightning Attention->Minimax模型
date: "2025-04-21 00:00:00"
updated: "2025-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/线性注意力机制-Linear-Attention-_Lightning-Attention-_Minimax模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1896380352202794899
---


前言：最近看了下MiniMax模型的技术报告，发现其采用了线性注意力（Linear Attention）思想。为此，学习了Linear Attention机制的相关算法，本次也系统总结下。总结流程是Linear Attention->闪电注意力（Lightning Attention）->Minimax模型。

### 一、Linear Attention（线性注意力）

线性注意力机制起源于2020年的ICML顶会的一篇论文"Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention"。文章目标是提升长序列下transformer的计算速度。

从传统基于softmax的注意力机制出发，线性注意力的诞生流程可归纳为下图1-1：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f4a78ab2739b.jpg)

图1-1：从softmax注意力到线性注意力**图1中提到了多项式注意力多项式注意力和RBF核注意力，这里也介绍下：
1）多项式注意力：是一种通过对输入向量进行多项式变换来计算注意力权重的方法。这种机制一般会将输入向量经过一个多项式函数（如二次函数*f*(*x*)=*ax^*2+*bx*+*c*或三次函数）来增强或抑制特定的特征，优点在于它能够捕捉输入数据中更复杂的非线性关系。注意：多项式函数的参数a/b/c会在训练中不断更新。
2）RBF核注意力：一种基于径向基函数（Radial Basis Function）的注意力机制。RBF 核是一种常用的核函数，可以用于度量向量之间的相似性。RBF 核的一个典型形式是高斯核：K(x,y) = exp⁡(−||x−y||^2 / σ^2)，其中，σ是一个可调的参数，控制核函数的“宽度”。在图1-1中，最终的线性注意力机制写成了  \color{blue}{\left( \phi(Q) \phi(K)^T \right) V = \phi(Q) \left( \phi(K)^T V \right)}  ，其中，文章将 \phi 设置为elu(⋅)函数，不设置为relu⁡(⋅)是为了避免在x为负时梯度为0。

那线性注意力的复杂度到底降低了多少呢？见下图1-2，可以看到从Softmax Attention到Linear Attention，复杂度从O(n*n*d)降低为了O(n*d*d)。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a42cb84ad14f.jpg)

图1-2：softmax attention vs linear attention的复杂度为了更清楚softmax attention的复杂度和 linear attention的复杂度哪个大，什么时候大，以两者的差值绘制了函数f(n) 的图像，如下图1-3所示。其中，d=768（表示token的隐藏维度），n的变化为100-1000，图像的最低点表示两个复杂度相等时的n值，即d/2=384。然而，随着LLM的发展，n越来越大，最近的Llama4已经达到了10w~100w的长度。因此，降低复杂度也是很有意义的。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3b78f75b6dcc.jpg)

图1-3：f(n) = (softmax attention的复杂度 - linear attention的复杂度)然而，文本生成任务时一个自回归模型，需要考虑因果掩码（Causal Masking）计算，即当前token不能看到后面的token。因此，计算过程演变为图1-4。因此，在实现上需要cumsum（累加求和），无法使用高效的并行方式进行计算。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_616b29de025b.jpg)

图1-4：linear attention的因果掩码形式总结一下，相比Softmax Attention，Linear Attention的改进点如下：

- 替换原始的softmax为其他激活函数
- Attention的计算由左乘改为右乘，将复杂度由O(n*n*d)降低为O(d*d*n)

### 二、Lightning Attention（闪电注意力）

Lightning Attention的基本思想是Linear Attention，根据时间顺序，先后出了两个版本，即V1和V2，分别解决了线性注意力机制的2个问题，如下：

- GPU 上的内存访问（I/O）可能影响Attention计算的整体速度；
- 因果注意力下，所需的累积求和（cumsum）操作使其无法达到理论训练速度。

#### 2.1 Lightning Attention-V1

考虑到因果mask的情况下右乘的计算很低效，在训练过程中，作者继续沿用了传统的左乘版本。同时，为了加速Attention计算，受到FlashAttention（可参考笔者[另一篇文章](https://zhuanlan.zhihu.com/p/1890132185966682238)的介绍）的启发，论文引入了Lightning Attention 算法，使Linear Attention具有更好的IO交互性。算法流程见图2-1。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a974d3fbd402.jpg)

图2-1：Flash Attention-V2 vs Lightning Attention-V1的算法流程从算法流程俩看，外层Q循环，内层K、V循环，一个计算示例见图2-2。其中，所有的参数配置在图中右上角，且仅展示了第二个外层的计算示意图。

> 注意：示例中最后的A和V的分块计算可以理解为[笔者另一篇文章](https://zhuanlan.zhihu.com/p/1884044137625548534)中提及的张量并行——行并行计算。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e58da6206eab.jpg)

图2-2：Lightning Attention-V1的计算流程示例（外层以第2个raw block为例）然而，这并没有充分利用线性注意力的"右乘"优点。

#### 2.2 Lightning Attention-V2

V1版本的不足在V2版本得到了解决，具体算法见图：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3b64e595000f.jpg)

图2-3：Lightning Attention-V2算法的计算流程看了图2-3之后，不禁让人感到疑惑——为什么块内（intra）、块间（inter）之间能这么计算呢？

要回答这个问题，就要继续看算法的推导了，图下图2-4（按照公式标号顺序看即可）：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_dcb122a03585.jpg)

图2-4：Lightning Attention-V2算法的公式推导代码：**相关代码见论文提供的github地址，包括[核心代码](https://link.zhihu.com/?target=https%3A//github.com/OpenNLPLab/lightning-attention/blob/main/lightning_attn/ops/triton/lightning_attn2.py)和[示例](https://link.zhihu.com/?target=https%3A//github.com/OpenNLPLab/lightning-attention/blob/main/tests/ops/test_lightning2.py)（点击即可跳转）。

### 三、MiniMax模型

这里是指MiniMax-Text-01，笔者在[之前的文章](https://zhuanlan.zhihu.com/p/24657349318)已经提及过它，其架构的核心点如下：

- <strong>Attention模块：</strong>集成了Lightning Attention和Softmax Attention，以结构化的方式组合。具体来说：每7个transnormer块（见下图3-1即可）的Lightning Attention之后跟随一个带有Softmax Attention的transformer块，共80层；每个Attention模块由64个head组成，每个head的维度为128。
- <strong>共享KV：</strong>采用GQA，且分组大小为8。
- <strong>残差：</strong>采用DeepNorm，即 output = \alpha \times Layer(input) + input ，以保持训练过程中梯度的稳定性。
- <strong>位置编码：</strong>采用RoPE，并将其应用于一半的注意力head维度，基频设置为10000。
- <strong>FFN模块：</strong>采用MOE，模型的hidden size被设置为6144，每个layer包含32个专家，采用top-2路由策略。每个专家中FFN的hidden size为9216。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b07acc7c0b7f.jpg)

图3-1：MiniMax-Text-01模型架构最终，MiniMax-Text-01包含456B参数，其中有45.9B的激活参数。在最后的实验中，作者证明该模型的效果能够在各项任务中匹敌GPT-4o和Claude-3.5-Sonnet等模型，见下图3-2。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2f27a4dc24eb.jpg)

图3-2：MiniMax-Text-01模型的实验结果
### 四、参考文献

- Linear Attention论文：[https://arxiv.org/pdf/2006.16236](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2006.16236)
- MiniMax技术报告：https://filecdn.minimax.chat/_Arxiv_MiniMax_01_Report.pdf
- [https://zhuanlan.zhihu.com/p/20473885314](https://zhuanlan.zhihu.com/p/20473885314)
- Lightning Attention-v1论文：[https://arxiv.org/pdf/2307.14995](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2307.14995)
- Lightning Attention-v2论文：[https://arxiv.org/pdf/2401.04658](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2401.04658)
- transnormer的论文：[https://arxiv.org/pdf/2210.10340](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.10340)
