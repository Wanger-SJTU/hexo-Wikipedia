---
title: RNN的隐藏层需要非线性吗？
date: "2023-04-10 00:00:00"
updated: "2023-04-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/RNN的隐藏层需要非线性吗/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/615672175
---


**Update: 
其实很多前人的工作早就意识到了这一点. See: RNN 中学习长期依赖的三种机制 - Quokka的文章 - 知乎 [https://zhuanlan.zhihu.com/p/34490114](https://zhuanlan.zhihu.com/p/34490114)![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_f0a7ce3a3aa9.jpg)

RNN 中学习长期依赖的三种机制 - Quokka的文章 - 知乎 https://zhuanlan.zhihu.com/p/34490114

### TL;DR

No

### 前言 

上周DeepMind发布的 [Resurrecting recurrent neural networks for long sequence](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2303.06349) 受到了广泛的关注，外国友人对RNN文艺复兴喜闻乐见

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_7d24b04d0d48.jpg)

喜登Trending其主要的动机是从当前大火的Deep State Space Model(SSM) 出发。既然SSM的离散形式能写成线性RNN的形式：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_97f138c93517.jpg)

SSM连续形式![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_f583b861c586.jpg)

SSM的离散形式可以看成是一个inear RNN并且具有非常强的捕捉长距离依赖的能力（在知名长距离依赖测评benchmark LRA中SOTA），那么究竟是什么限制了传统的RNN的能力呢？作者为了研究这个原因，对RNN进行了逐步改造向离散形式的SSM靠拢。首先，SSM中间的循环是没有非线性的，所以作者移除了RNN的非线性，发现结果非但没有下降，反而有提升 （即插即用是吧）：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_d9b2548394ef.jpg)

非线性负优化（确信 作者对此的猜测是隐藏层的非线性不利于梯度下降的优化（Recurrent nonlinearities slow down gradient descent）

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_4d3152540c40.jpg)

Why nonlinearity fails那么大家可能会问，移除了非线性会不会对模型的表达能力有害呢？答案也是No。因为整个模型不是完全非线性的，在输入层和输出层都有非线性，只是在中间循环的地方扔去了非线性。作者通过Koopman operator theory证明表达能力是足够强的：

> Leveraging a spectral analysis and Koopman operator theory (Koopman and Neumann, 1932), we discuss how interleaving linear RNN layers with nonlinear feedforward blocks is sufficient to approximate highly nonlinear systems. A key observation in our analysis is that position-wise nonlinearities effectively transfer signal information to higher frequencies, enabling the system to go beyond linearity in the spectral domain and increasing the layer capacity
chatgpt翻译：通过使用谱分析和库普曼算子理论（Koopman和Neumann，1932），我们讨论了如何通过将线性的RNN层与非线性的前馈块交错堆叠来逼近高度非线性的系统。我们分析的一个关键观察是，位置上的非线性效果将信号信息有效地传递到更高的频率，使系统能够在谱域中超越线性，并增加层的容量。

### 线性RNN的两大好处

除了删掉非线性原地涨点的好处，线性RNN的好处还有两点：

#### 高并行性

非线性的RNN只能递归运算，所以训练速度经常让人诟病，这也是RNN之后被Transformer全面取代的一个主要原因：缺乏并行性。但是移除了非线性的RNN是可以并行运算的！可以用到Parallel Scan的算法：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_4837b23cd0ec.jpg)

Parallel scan大意主要的思想是 我们没有必要循环来算，而是可以两两合并，用一种hierarical reduction的方式来计算。整体的并行复杂是 O(N) 。笔者对Parallel Scan这个算法最早是从[Torch-Struct](https://link.zhihu.com/?target=https%3A//github.com/harvardnlp/pytorch-struct) 这个库里知道的，Parallel scan可以用与 linear-chain CRF 或者 HMM的forward算法的加速 （ Linear-chain CRF 和 HMM的forward算法其实也可以理解成一个线性RNN）。另外值得一提的是，Parallel Scan也被用到了 S5 (Simplified State Space Layers for Sequence Modeling) 的运算中。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_1d36c5c8e5d1.jpg)

parallel scan的up-sweep过程， O(N) work step ![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_8cb018dc3e8f.jpg)

parallel scan的down-sweep过程， O(N) work step

既然中间的非线性没了，那么，RNN的计算过程可以写成矩阵幂的形式：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_f0a4e9bb0eaa.jpg)

如果我们对 A 进行特征值分解（aka 谱分解，对角化）： A=P \Lambda P^{-1} ，那么矩阵幂就会好算很多了:

A^j=P \Lambda^j P^{-1} 。这样，在中间的循环层计算中，就不涉及到任何矩阵-向量的点乘，全部计算都可以用element-wise的向量相乘搞定！如果隐藏层的维度是d, 那么计算复杂度可以从 O(d^2) 降到 O(d) 。 

最后值得一提的是，deepmind的这篇工作（以及其他很多SSM的工作）允许中间出现complex number的特征值来增强表达能力（否则A只能是实对称矩阵，极大的限制了A的范围）。另外，为了防止矩阵幂爆炸，一个很自然的想法是限制特征值的模长小于1，所以deepmind在这篇里提出了一种稳定的参数化方式：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_1a7c6b61e094.jpg)

这样模长就直接限制死了小于1，这种方式跟控制学科里的 "*keep your roots on the left-hand side of the plane." 有着异曲同工之妙*

### 跟其他工作的联系

Deepmind这篇工作是首个提出循环层的非线性不重要的吗？笔者对此进行了一些考古。

首先在ICLR'18的Parallelizing Linear Recurrent Neural Nets Over Sequence Length 当中也用到了parallel scan的形式：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_4652218e2d6a.jpg)

第三行的 h_t 的递归运算是线性的**，输入层经过非线性层提供门控单元g_t 

> A GILR layer applies the same non-linear transform to each sequence element and then accumulates the sequence elements with a non-linear gating mechanism. Gate gt uses the sigmoid activation function to give values in [0,1] for reasonable gating semantics, while impulse it can use any activation function τ . Stacking GILR layers allows for rich non-linear dependence on previous events while still taking advantage of fast parallel sequence evaluation.
chatGPT翻译：一个GILR层对每个序列元素应用相同的非线性变换，然后使用非线性门控机制累积序列元素。门控gt使用sigmoid激活函数来给出在[0,1]范围内的值，以实现合理的门控语义，而激发τ可以使用任何激活函数。堆叠GILR层允许在仍然利用快速并行序列评估的同时，对先前事件进行丰富的非线性依赖。

其作者强烈暗示

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_7c43e932f271.jpg)

nonlinear recurrence是相当没有必要的，并且给出了相当多的引用来说明 linear recurrence也能work的很好：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_c664505eace8.jpg)

这篇的作者提供了parallel scan的cuda kernel实现，能够加速一些已有的工作：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_cbbd647826d3.jpg)

另外，RWKV (see[我的介绍](https://zhuanlan.zhihu.com/p/614311961)) 也可以理解成中间循环之间没有非线性层的网络。

### 结束语

Linear recurrence其实也可以看成Token mixing的一种方法，MetaFormer里显示很多很简单的token mixing都能work的很好，那么linear recurrence work的很好简直是天经地义。
