---
title: 挑战 Transformer：全新架构 Mamba 详解
date: "2025-09-23 00:00:00"
updated: "2025-09-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/挑战-Transformer-全新架构-Mamba-详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/684231320
---


打个小广告 ☻，知乎专栏<strong>《大模型前沿应用》</strong>的内容已经收录在新书<strong>《揭秘大模型：从原理到实战》</strong>中。感兴趣的朋友可以购买，多谢支持！♥♥

[![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d0c6b624226d.jpg)广告

揭秘大模型：从原理到实战

京东

¥39.90

去购买​

](https://union-click.jd.com/jdc?e=jdext-1953867897207234694-0-1&p=JF8BAUwJK1olXwIEU15fCE4VBV8IHlIdXwEKU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYHXVZfD0MQHDZNRwYlPnhcND47QTt3YjcASDhTQ3trAjogXkcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kMElwVVAMDUldfCHsXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVVQIAXVlbAUMRAG4OGFkQWg4HSF9BCHsUAm0NGFIdWAEEOltdCUsUAm8KElp7XwYDVVdZDkoRA18IK1glA2gDB1hfCRhDVgFUTB1GFkQDBjBYDUweBmgLGGsXXAcAVm5tOBVBYhx-QxMSHgdACggeWzgVYBpQSCBpL2gAFxsPdT93QAZLE1NLIHNVCS1tDXsXBW8KKw)**

### 背景

> 屹立不倒的 Transformer 迎来了一个强劲竞争者。

自 2017 年被提出以来，Transformer 已经成为 AI 大模型的主流架构，但随着模型规模的扩展和需要处理的序列不断变长，Transformer 的局限性也逐渐凸显。一个很明显的缺陷是：Transformer 模型中自注意力机制的计算量会随着上下文长度的增加呈平方级增长，比如上下文增加 32 倍时，计算量可能会增长 1000 倍，计算效率非常低。

为了克服这些缺陷，研究者们开发出了很多注意力机制的高效变体，但这往往以牺牲其有效性特为代价。到目前为止，这些变体都还没有被证明能在不同领域发挥有效作用。

而就在最近，一名为 Mamba 的架构似乎打破了这一局面。

与类似规模的 Transformer 相比，Mamba 具有 5 倍的吞吐量<strong>，</strong>而且 Mamba-3B 的效果与两倍于其规模的 Transformer 相当**。性能高、效果好，Mamba 成为新的研究热点。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a75536ef4a51.jpg)

图1 Mamba 在推理过程中的吞吐量对比本文将详细的解读 Mamba 架构，由于 Mamba 是基于 SSM->HiPPO->S4->Mamba 演化过来的，而 HiPPO、S4、Mamba 的一作者都是卡内基梅隆大学机器学习系助理教授<strong>Albert Gu</strong>。因此，本文将从标准 SSM 开始，逐步介绍 HiPPO、S4、Mamba。

图2总结了SSM、HiPPO、S4、Mamba的主要区别，以及各个模型的主要内容。本文内容也将按图中内容展开。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c2ab19a3af5e.jpg)

图2-2：HiPPO、S4、Mamba
### 一、现有架构问题

序列建模的核心问题是：同时解决<strong>有效</strong>和<strong>高效</strong>。有效是指能够选择性记忆历史信息，解决<strong>长距离依赖</strong>（Long-Range Dependencies，LRDs）问题；高效是指计算高效。

尽管传统的模型如循环神经网络（RNNs）、卷积神经网络（CNNs）和 Transformers 在处理长距离依赖方面有专门的变体，但它们在<strong>处理超过 10000 步的极长序列时仍然面临挑战</strong>。

#### 1.1 Transformer 问题

Transformer 的一个主要优点是，无论它接收到多长的输入，它都使用序列中的所有 token 信息（无论序列有多长）来对输入数据进行处理。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a55a9c315fa2.jpg)

图1-1：Transformer会查看过去所有 token但是为了获得全局信息，注意力机制在长序列上非常耗费显存。注意力创建一个矩阵，将每个 token 与之前的每个 token 进行比较。矩阵中的权重由 token 对之间的相关性决定。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_18fafb9c659e.jpg)

图1-2：Transformer 会计算每个 token 之间的 Attention在训练过程中，Attention 计算可以并行化，所以可以极大地加快训练速度。但是在推理过程中，当生成下一个 token 时，我们需要重新计算整个序列的注意力。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_066d832d207f.jpg)

图1-3：生成新 token 时需要重新计算整个序列的注意力长度为 L 的序列生成 token 大约需要 L² 的计算量，如果序列长度增加，计算量会平方级增长。因此，<strong>需要重新计算整个序列是 Transformer 体系结构的主要瓶颈</strong>。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f193eb65cadf.jpg)

图1-4：Transformer 训练快、推理慢
#### 1.2 RNN 的问题

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8a994c3e9261.jpg)

图1-5：循环神经网络 RNN在生成输出时，RNN 只需要考虑之前的隐藏状态和当前的输入。这样不会重新计算以前的隐藏状态，这正Transformer 不具备的。

这种结构可以让 RNN 进行<strong>快速推理</strong>，并且理论上可以无限扩展上下文长度，因为每次推理只取一个隐藏状态和当前输入，内存占用非常稳定。

RNN 的每个隐藏状态都是之前所有隐藏状态的聚合。但是这里会有一个问题，在生成 token "Liang" 时，最后一个隐藏状态不再包含关于 token "Hello" 的信息。这会导致随着时间的推移，RNN 会忘记更久的信息，因为它只考虑前一个状态。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e8af4acdcd86.jpg)

图1-6：只考虑前一个 hidden state并且 RNN 的这种顺序性产生了另一个问题。<strong>训练不能并行进行</strong>，因为它需要按顺序完成每一步。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b3d89c08211a.jpg)

图1-7：RNN 训练不能并行RNN的统一定义为：

$\bm{x}_t=f\left( \bm{u}_t,\bm{x}_{t-1};\theta \right)\tag1$

其中 \bm{x}_t 是每一步的输出，它由当前输入 \bm{u}_t 和前一时刻输出 \bm{x}_{t-1} 共同决定，而θ则是可训练参数。那么参数θ的梯度可以表示为：

$$\nabla_{\theta}\bm{x}_{t}=\frac{\partial \bm{x}_t}{\partial \bm{x}_{t-1}}\nabla_{\theta}\bm{x}_{t-1}+\frac{\partial \bm{x}_t}{\theta}\tag2$$

可以看到，当前梯度依赖上个 token 的梯度。

与 Transformer 相比，RNN 的问题完全相反！它的<strong>推理速度非常快，但不能并行化导致训练很慢</strong>。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3e810c0a470b.jpg)

图1-8：RNN 和 Transformer对比<strong>人们一直在寻找一种既能像 Transformer 那样并行化训练，能够记住先前的信息，又能在推理时时间是随序列长度线性增长的模型，Mamba 就是这样应运而生的</strong>。解下来我们从 SSM 开始，逐步介绍 Mamaba。

### 二、状态空间模型 SSM

#### 2.1 什么是 SSM

$状态空间模型（State Space Models，SSM）由简单的方程（3）定义。它将一维输入信号 u\left( t \right)\in\mathbb{R} 映射到 N 维潜在状态 \bm{x}\left( t \right)\in \mathbb{R}^{N} ，然后再投影到一维输出信号 y\left( t \right) 。$

$$\begin{align} \frac{d\bm{x}\left( t \right)}{dt} &=\bm{Ax}\left( t \right)+\bm{B}{u}\left( t \right)\in \mathbb{R}^N \\  {y}\left( t \right) &=\bm{C}\bm{x}\left( t \right) +Du\left( t \right)\in \mathbb{R} \end{align}\tag3其中， \bm{A}\in\mathbb{R}^{N\times N} 是状态转移矩阵， \bm{B}\in \mathbb{R}^{N\times 1} 是输入到状态的矩阵， \bm{C}\in \mathbb{R}^{N\times 1} 是状态到输出的矩阵，D是直接从输入到输出的参数（很多时候取 D = 0）。$$

#### 2.2 SSM 架构

下图是 SSM 的架构，主要包含两个部分：状态更新方程和输出方程。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4020eeca1420.jpg)

图2-1：SSM结构SSM 可以简化为以下结构：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7ec3fa7d4dfe.jpg)

图2-2：简化的SSM结构下面我们看一下更详细的结构，首先是状态更新，如下所示：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6e525aeeaba8.jpg)

图2-3：状态更新详细结构<strong>备注</strong>：图中的输入 \bm{u}_\left( t \right)\in \mathbb{R}^D ，表示输入的信号是 D 维的。 SSM 也可以用于处理多维信号输入。

然后是输出方程，详细机构如下所示：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b3ac26ec20a7.jpg)

图2-4：输出方程详细结构
#### 2.3 SSM 例子：弹簧振子

下面举一个描述弹簧振子系统的 SSM 例子。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3704f3fc8815.jpg)

图2-5：弹簧振子考虑一个质量为 m 的物体，它连接在一个劲度系数为 k 的弹簧上，并且受到阻尼系数为 c 的阻尼力作用。当物体从平衡位置偏离时，它会在弹簧力的作用下进行振动。我们可以用状态空间模型来描述这个系统的动态。

状态变量可以选择为物体的位移 s\left( t \right) 和速度 v\left( t \right) 。输入 \bm{u}\left( t \right) 在这个例子中可以为零，因为我们没有外部力作用在物体上。输出 y\left( t \right) 可以是我们感兴趣的位移 s\left( t \right) 。

状态向量定义为： \bm{x} \left( t \right)= \begin{bmatrix} s(t) \\ v(t) \end{bmatrix}\tag4输入向量为：

\bm{u} \left( t \right)= \begin{bmatrix} 0 \\ 0 \end{bmatrix}\tag5

输出位移 s\left( t \right) 。弹簧振子的状态空间方程可以表示为：

$$\begin{align} &\frac{d}{dt} \begin{bmatrix} s(t)\\ v(t) \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -\frac{k}{m}  & -\frac{c}{m} \end{bmatrix} \begin{bmatrix} s(t) \\ v(t) \end{bmatrix} + \begin{bmatrix} 0 \\ 0 \end{bmatrix} \bm{u}(t) \\ &y(t) = \begin{bmatrix} 1 & 0 \end{bmatrix} \begin{bmatrix} s(t) \\ v(t) \end{bmatrix} \end{align} \tag6 在了解 SSM 基本概念之后，接下来我们介绍基于 SSM 的 HiPPO 架构。$$

### 三、HiPPO（High-order Polynomial Projection Operators）

HiPPO 是 Albert Gu 于2020年在论文 [HiPPO: Recurrent Memory with Optimal Polynomial Projections](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2008.07669.pdf) 中提出的新架构。HiPPO 主要为了解决<strong>如何在有限的存储空间中有效地解决序列建模的长距离依赖问题。</strong>

HiPPO 通过函数逼近产生状态矩阵 A 的最优解，有效的解决了长距离依赖问题。

<strong>问题背景：</strong>在处理序列数据时，一个核心问题是如何在增量方式下表示累积的历史信息。这涉及到如何在有限的存储空间中有效地更新和维护历史数据的表示。

<strong>HiPPO框架</strong>：作者介绍了一个名为 HiPPO（High-order Polynomial Projection Operators）的通用框架，它通过将连续信号和离散时间序列投影到多项式基上，实现了在线数据压缩。

<strong>重要性度量</strong>：HiPPO 框架考虑了一个度量，用于指定过去每个时间步的重要性。这个度量帮助HiPPO产生在线函数逼近问题的最优解。

<strong>理论贡献</strong>：HiPPO 框架不仅提供了对现有记忆单元的简短推导，还推广了循环神经网络（如GRUs）中普遍存在的门控机制。

<strong>新的记忆更新机制</strong>：作者提出了一个新的记忆更新机制（HiPPO-LegS），它能够随时间扩展以记住所有历史信息，避免了对时间尺度的先验假设。

<strong>理论优势</strong>：HiPPO-LegS 具有时间尺度鲁棒性、快速更新和有界梯度的理论优势。

<strong>实验结果</strong>：在基准测试中，HiPPO-LegS 在打乱的 MNIST 数据集上达到了98.3%的新最佳准确率。在一个新的轨迹分类任务中，HiPPO-LegS 在处理分布外时间尺度和缺失数据方面，比其他 RNN 和神经 ODE（一阶常微分方程）基线模型的性能提高了25-40%的准确率。

下面介绍 HiPPO 实现的具体细节。

#### 3.1 HiPPO 架构：高阶多项式投影

<strong>3.1.1 HiPPO问题设置</strong>

<strong>问题定义</strong>

$给定一个在时间 t\geq 0 上的输入函数 u\left( t \right)\in \mathbb{R} ，需要在每个时间点操作累计历史 u^{\leq t}:=u\left( x \right)|x\leq t ，以便理解到目前为止看到的输入并对未来进行预测。$

由于函数空间的庞大，无法完美记住整个历史，因此需要将其进行压缩，HiPPO 提出了将历史投影到有界维数的子空间的一半方法。

<strong>函数逼近与度量</strong>

$为了评估逼近的质量，需要在函数空间中定义一个距离。任何在 \left[ 0,\infty \right) 上的概率度量 \mu 都可以为平方可积函数空间提供内积 _{\mu}=\int_{0}^{\infty}u\left( x \right)g\left( x \right)d\mu\left( x \right)">_{\mu}=\int_{0}^{\infty}u\left( x \right)g\left( x \right)d\mu\left( x \right) ，从而诱导出一个希尔伯特空间 H_{\mu} 和相应的范数 ^{}_{\mu}">||u||_{L^2\left( \mu \right)}=^{}_{\mu} 。$

为了选择合适的子空间，需要一个度量来量化历史的重要性。这个度量 \mu\left( t \right) 随时间变化，支持在 \left[ -\infty,t \right) 上，因为 u^{\leq t} 只在时间t之前定义。

<strong>多项式基展开</strong>

任何 N 维的函数子空间 G 都是逼近的合适候选。参数 N 对应于逼近的阶数，或者说压缩的大小；投影的历史可以通过G的任何基的N个系数来表示。

论文中使用多项式作为自然基，因此G是小于N阶的多项式的集合。

<strong>在线逼近</strong>

$由于我们关心在每个时间 t 对 u^{\leq t} 的逼近，我们也让度量 \mu\left( t \right) 随时间变化。总体上，我们寻找一个 g\left( t \right)\in G ，使得 ||u^{\leq t}-g\left( t \right)||_{L^2\left( \mu\left( t \right) \right)} 最小。直观上，度量 \mu 控制输入域各部分的重要性。$

<strong>挑战</strong>

挑战在于如何在给定度量 \mu\left( t \right) 的情况下以封闭形式解决优化问题，以及在 t\rightarrow \infty 时如何线性地维护这些系数。

<strong>3.1.2 HiPPO 通用架构</strong>

<strong>通过连续动态系统计算投影</strong>

这部分是 HiPPO 的关键步骤，它涉及到将输入函数 u\left( t \right) 在时间 t 投影到一个多项式空间上，以便在线更新记忆表示。

<strong>投影的表示</strong>：投影可以通过输入函数 u\left( t \right) 在时间 t 的限制 u^{\leq t} 的 N 个系数来表示。这些系数是通过在多项式空间的基上展开u^{\leq t}得到的。

<strong>正交多项式基</strong>：为了选择合适的基，作者利用了正交多项式的性质。正交多项式为 u\left( t \right) 提供了一个自然的基，使得 u^{\leq t} 的投影可以表示为这些基的线性组合。

$<strong>系数的计算</strong>：投影的系数 \bm{x}\left( t \right) 是通过内积 _{\mu\left( t \right)}">_{\mu\left( t \right)} 计算得到的，其中 g_n 是正交多项式基的元素。$

$$<strong>连续动态系统</strong>：为了在线更新这些系数，作者提出了一个连续动态系统，这个系统描述了系数 \bm{x}\left( t \right) 是如何随时间 t 变化的。这种动态系统可以表示为 \frac{d}{dt}\bm{x}\left( t \right)=\bm{A}\left(t \right)\bm{x}\left( t \right)+\bm{B}\left( t \right){u}\left( t \right) ，其中 \bm{A}\left( t \right),\bm{B}\left( t \right) 是依赖于时间的矩阵。$$

$<strong>投影操作符</strong>：作者定义了一个投影操作符 \text{proj}_t ，它将 u^{\leq t} 映射到 G （多项式空间）中的 g\left( t \right) ，使得 ||u^{\leq t}-g\left( t \right)||_{L^2\left( \mu\left( t \right) \right)} 最小化。这个操作符是 HiPPO 框架的核心。$

<strong>系数提取操作符</strong>：除了投影操作符，作者还定义了一个系数提取操作符\text{coef}_t ，它将多项式g\left( t \right) 映射到其对应的系数 \bm{x}\left( t \right) 。

<strong>在线更新</strong>：通过这个连续动态系统，HiPPO 框架能够在线更新记忆表示，即随着新数据的到来，系统能实时地调整系数\bm{x}\left( t \right) 。

<strong>在线函数逼近</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_98e40551d666.jpg)

图3-1：HiPPO框架图2-6展示了 HiPPO 框架，首先需要找到投影\text{proj}_t ，将输入 \bm{u}\left( t \right) 投影到多项式空间；然后将投影通过一组系数\bm{x}\left( t \right)来表示，这些系数捕捉了函数\bm{u}\left( t \right)的历史信息；使用连续时间下的一阶常微分方程来表示系数\bm{x}\left( t \right)如何随时间 t 动态变化；最后，将连续时间的动态变换转化为离散时间的递归关系（比如双线性变换），这允许 HiPPO 在每个时间步 k 更新系数 \bm{x}_k 。

<strong>3.1.3 高阶投影：度量方法以及 HiPPO 动态系统</strong>

$$作者定义了两种度量方法，分别是 LegT 和 LagT。LegT 度量为最近的历史信息分配均匀的权重，表示如下： \textbf{LegT: }\space \mu^{\left( t \right)}\left( x \right)=\frac{1}{\theta} \mathbb{I}_{\left[ t-\theta,t \right]}\left( x \right) \tag7 LagT 度量使用指数衰减的方式来衡量历史信息的重要性，表示如下：$$

$t \end{cases} \end{equation} \tag8">\textbf{LagT: }\space \mu^{\left( t \right)}\left( x \right)=e^{-\left( t-x \right)}\mathbb{I}_{\left[ -\infty,t \right]}\left( x \right) = \begin{equation} \begin{cases} e^{x-t}& \text{if } x \leq t \\ 0 &\text{if }x>t \end{cases} \end{equation} \tag8 对于 LegT 和 LagT，系数\bm{x}\left( t \right)可以使用 ODE（一阶常微分方程）来表示：$

$$\frac{d}{dt}\bm{x}\left( t \right)=\bm{A}\bm{x}\left( t \right)+\bm{B}{u}\left( t \right)\tag9 其中 A 和 B 是与度量 \mu\left( t \right) 相关的矩阵。这个 ODE 描述了系数\bm{x}\left( t \right)如何随时间 t 和输入函数 {u}\left( t \right) 变化。$$

备注：公式（9）是 HiPPO 框架的关键部分，<strong>具体推导可以参看论文中的附录 D</strong>。

对于 LegT 度量，矩阵 A 和 矩阵 B 可以表示如下：

$$k \end{cases} \end{equation}, \space B_n=\frac{1}{\theta}\left( 2n+1 \right)\left( -1 \right)^n \tag{10}">\textbf{LegT: }A_{nk}=-\frac{1}{\theta} \begin{equation} \begin{cases} \left( -1 \right)^{n-k}\left( 2n+1 \right)& \text{if } n \geq k \\ 2n+1 &\text{if }n>k \end{cases} \end{equation}, \space B_n=\frac{1}{\theta}\left( 2n+1 \right)\left( -1 \right)^n \tag{10}对于 LagT 度量，可以表示如下：$$

$$k \end{cases} \end{equation} ,\space B_n=1 \tag{10}">\textbf{LagT: }A_{nk}=-\frac{1}{\theta} \begin{equation} \begin{cases} 1& \text{if } n \geq k \\0 &\text{if }n>k \end{cases} \end{equation} ,\space B_n=1 \tag{10}<strong>3.1.4 HiPPO 框架中的连续时间动态转换为离散时间递归关系</strong>$$

由于我们处理的输入往往是离散的，因此我们需要将公式（9）的 ODE 离散化。ODE 离散化是一种常用的数据技术，它将<strong>连续时间的常微分方程转换为离散时间的差分方程</strong>。这通常涉及到选择一个合适的时间步长（或步长Δt），并使用数值方法（如欧拉方法、双线性）来近似连续微分。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_89c5b82402e8.jpg)

图3-2：连续信号离散化使用双线性离散化，如下所示：

$$\begin{align} x\left( t +\Delta t\right)-\frac{\Delta t}{2}Ax\left( t+\Delta t \right)=\left( I+\Delta t/2A \right)x\left( t \right)+\Delta t B u\left( t \right)\\ x\left( t +\Delta t\right)=\left( I-\Delta t/2A \right)^{-1}\left( I+\Delta t/2A \right)x\left( t \right)+\Delta t\left( I-\Delta t/2A \right)^{-1} B u\left( t \right) \end{align} \tag{11}结合公式（9）和公式（11），我们可以得到离散化的状态更新公式，表示如下： \begin{align} &\bm{x}_{k}=\bar{\bm{A}}\bm{x}_{k-1}+\bar{\bm{B}}{u}_k,\quad\bar{\bm{A}}=\left( \bm{I}-\Delta /2\cdot \bm{A} \right)^{-1}\left( \bm{I}+\Delta /2\cdot \bm{A} \right)\\ &{y}_k=\bar{\bm{C}}\bm{x}_k \quad \bar{\bm{B}}=\left( \bm{I}-\Delta /2\cdot \bm{A} \right)^{-1}\bm{B}\quad \bar{\bm{C}}=\bm{C} \end{align} \tag{12}$$

离散化之后的 SSM 结构可以表示如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4de67f610a21.jpg)

$图3-3：离散化 SSM在每个时间步长，我们计算当前输入( \bar{\bm{B}}{u}_k )如何影响前一个状态( \bar{\bm{A}}\bm{x}_{t-1} )，然后计算预测输出( \bar{\bm{C}}\bm{x}_k )。$

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c7877052fc5c.jpg)

图3-4：每个时间步的计算这种表示看起来是不是有点熟悉？其实他的处理方法和RNN一样。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c1ecb14d2d4e.jpg)

图3-5：离散化后和RNN类似
#### 3.2 HiPPO-LegS

HiPPO-LegS 是作者基于新的度量提出的全新架构，具有时间鲁棒性、有界梯度、有界近似误差、长时间记忆等效果。

$$新的度量表示为 \mu^{\left( t \right)}=\frac{1}{t}\mathbb{I}_{\left[ 0,t \right]} ，在新的度量下，矩阵 A 和矩阵 B 可以表示如下：  k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n\textbf{LegS: }A_{nk}=-\frac{1}{\theta} \begin{equation} \begin{cases} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{}& \text{if } n > k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n $$

<strong>具体推导在论文的附录 D.3 部分</strong>。

<strong>更好的学习长期依赖</strong>

<strong>HiPPO-LegS 是专门为记忆而设计的</strong>，它通过其独特的结构和更新机制来避免梯度消失问题。LegS 通过使用Legendre 多项式作为基函数，并结合时间尺度不变的度量，来保持梯度的稳定性。

对于任何时间 t_0 ，HiPPO-LegS 在时间 t_1 的输出相对于时间 t_0 的输入的梯度范数为 O\left( 1/t_1 \right) ，这意味着梯度随着时间的增加而减小，但是衰减的速度比 RNN 的指数级慢的多。

这个性质使得 HiPPO-LegS 能够有效地缓解 RNN 中的梯度消失问题。即使在长序列中，梯度也不会迅速衰减到0，这有助于网络在训练中更好地学习长期依赖。

<strong>近似有界误差</strong>

$HiPPO-LegS 在时间 t 的近似误差 ||u^{\leq t}-g||=O\left( t^kN^{1-k}/2 \right) 。其中 N 是多项式的最高阶。这表明随着多项式的阶 N 的增加，误差逐渐减小。$

#### 3.3 实验

$将 HiPPO 和 RNN 相结合，当前状态 \bm{h}_{t}\in \mathbb{R}^d 不仅和上一个状态 \bm{h}_{t-1}\in \mathbb{R}^d 有关，还和 HiPPO 状态 \bm{x}_{t-1}\in \mathbb{R}^N 有关，如下所示：\begin{align} &\bm{h}_t=\tau\left( \bm{h}_{t-1},\left[ \bm{x}_{t-1},\bm{u}\left( t \right) \right] \right)\in \mathbb{R}^{d} \\ &f_t=\mathcal{L}\left( \bm{h}_t \right) \in \mathbb{R}^1\\  &\bm{x}_t=\text{hippo}_t\left( f \right)=\bm{A}_t\bm{x}_{t-1}+\bm{B}_tf_t\in \mathbb{R}^{N} \end{align} \tag{14}$

模型结构如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_70cbc5a436e5.jpg)

图3-6：HiPPO和RNN结合下面是pMINIST 数据集上的结果，可以看到 LegS 的效果要好于 LagT 和 LegT，同时 HiPPO 的效果好于之前的其它模型。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_194864454004.jpg)

图3-7：HiPPO实验结果备注：<strong>pMNIST（permuted MNIST）是一个经过修改的MNIST数据集</strong>，它用于测试和评估机器学习模型在处理序列数据和学习长期依赖关系方面的能力。在 pMNIST 中，原始 MNIST 图像的像素被重新排列。这意味着图像的像素不再是按照自然顺序（从左到右，从上到下）呈现，而是按照一个固定的、随机的排列顺序。这种排列方式使得模型必须学习像素之间的长期依赖关系，而不能简单地依赖于局部空间结构。

### 四、S4 (Structured State Space Model)

S4 是 HiPPO 的后续工作，论文名称为：[Efficiently Modeling Long Sequences with Structured State Spaces](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2111.00396.pdf)。

S4 的主要工作是将 HiPPO 中的矩阵 A（称为 <strong>HiPPO 矩阵</strong>）转换为正规矩阵（正规矩阵可以分解为对角矩阵）和低秩矩阵的和，以此提高计算效率。

S4 通过这种分解，将计算复杂度降低到了 O\left( N+L \right) ，其中 N 是 HiPPO 矩阵的维度，L 是序列长度。

在处理长度为 16000 的序列的语音分类任务中，S4 模型将专门设计的语音卷积神经网络（Speech CNNs）的测试错误率降低了一半，达到了1.7%。相比之下，所有的循环神经网络（RNN）和 Transformer 基线模型都无法学习，错误率均在70%以上。

下面我们就来介绍一下这篇工作。

#### 4.1 HiPPO 解决了长期依赖

作者讨论了如何处理长距离依赖（Long-Range Dependencies，LRDs）的问题，LRDs 是序列建模中的一个关键挑战，因为它们涉及到在序列中跨越大量时间步的依赖关系。

<strong>作者指出，基本的 SSM 在实际应用中表现不佳，特别是在处理 LRDs 时。这是因为线性一阶常微分方程（ODEs）的解通常是指数函数，这可能导致梯度在序列长度上呈指数级增长，从而引发梯度消失或爆炸的问题。</strong>

为了解决这个问题，作者利用了 HiPPO 理论。<strong>HiPPO 理论指定了一类特殊的矩阵 A，当这些矩阵被纳入 SSM 的方程中时，可以使状态 x(t) 能够记住输入 u(t) 的历史信息。这些特殊矩阵被称为 HiPPO 矩阵，它们具有特定的数学形式，可以有效地捕捉长期依赖关系。</strong>

<strong>HiPPO 矩阵的一个关键特性是它们允许 SSM 在数学和实证上捕捉 LRDs</strong>。例如，通过将随机矩阵 A 替换为 HiPPO 矩阵，可以在序列 MNIST 基准测试上显著提高 SSM 的性能。

HiPPO 矩阵表示如下：

 $k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n\textbf{HiPPO矩阵}\quad A_{nk}=- \begin{equation} \begin{cases} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{}& \text{if } n > k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n$

#### 4.2 在线推理：使用递归形式

S4 在推理时，使用公式（12）的递归形式，每次只需要和上一个状态进行计算，具有和 RNN 相似的推理效率。

#### 4.3 训练 S4：卷积表示

由于离散时间 SSM 的递归性质，它在硬件上进行训练时存在效率问题。因此，作者将离散时间 SSM 的<strong>递归方程转换为离散卷积的形式</strong>。通过展开递归方程，可以得到一个卷积核，这个卷积核可以用来在序列数据上应用卷积操作。这种转换允许 SSM 利用快速傅里叶变换（FFT）等高效的卷积计算方法，从而在训练过程中提高计算效率。

\begin{align} &\bm{x}_0=\bar{\bm{B}}{u}_0\quad \bm{x}_1=\bar{\bm{A}}\bar{\bm{B}}{u}_0+\bar{\bm{B}}{u}_1\quad \bm{x}_2=\bar{\bm{A}}^2\bar{\bm{B}}{u}_0+\bar{\bm{A}}\bar{\bm{B}}{u}_1+\bar{\bm{B}}{u}_2\quad &...\\ &{y}_0=\bar{\bm{C}}\bar{\bm{B}}{u}_0\quad {y}_1=\bar{\bm{C}}\bar{\bm{A}}\bar{\bm{B}}{u}_0+\bar{\bm{C}}\bar{\bm{B}}{u}_1\quad {y}_2=\bar{\bm{C}}\bar{\bm{A}}^2\bar{\bm{B}}{u}_0+\bar{\bm{C}}\bar{\bm{A}}\bar{\bm{B}}{u}_1+\bar{\bm{C}}\bar{\bm{B}}{u}_2\quad &... \end{align} \tag{16}上面式子可以转化为卷积的形式：

$\begin{align} &{y}_k=\bar{\bm{C}}\bar{\bm{A}}^k\bar{\bm{B}}{u}_0+\bar{\bm{C}}\bar{\bm{A}}^{k-1}\bar{\bm{B}}{u}_1+\cdot \cdot \cdot +\bar{\bm{C}}\bar{\bm{A}}\bar{\bm{B}}{u}_{k-1}+\bar{\bm{C}}\bar{\bm{B}}{u}_k\\ &\bm{y}=\bar{\bm{K}}\ast{u}\\ & \bar{\bm{K}}\in \mathbb{R}^L:=\mathcal{K}_L\left( \bar{\bm{A}},\bar{\bm{B}},\bar{\bm{C}} \right)=\left( \bar{\bm{C}}\bar{\bm{A}}^i\bar{\bm{B}} \right)_{i\in \left[ L \right]}=\left( \bar{\bm{C}}\bar{\bm{B}},\bar{\bm{C}}\bar{\bm{A}}\bar{\bm{B}},...,\bar{\bm{C}}\bar{\bm{A}}^{L-1}\bar{\bm{B}} \right) \end{align} \tag{17}其中， \bar{\bm{K}} 是一个与 SSM 的参数（A, B, C）相关的卷积核，可以通过离散傅里叶变换（DFT）和逆变换（IDFT）来计算。这种卷积表示不仅在理论上是可行的，而且在实践中也是非常有效的，因为它允许在保持模型性能的同时，显著减少训练过程中的计算和内存需求。$

作者在这一节中还讨论了如何计算 SSMn卷积核，这是他们技术贡献的关键部分。通过这种卷积表示，SSM 可以被有效地训练，同时保持其在处理长距离依赖（LRDs）方面的能力。这种表示形式为 SSM 在各种序列建模任务中的应用提供了灵活性，包括图像处理、语音识别和时间序列分析等。 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4a57a77761af.jpg)

图4-1：SSM 卷积核形式下面是一个具体的例子，如何使用卷积核生成输出。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_bf951a0202fa.jpg)

图4-2：使用卷积核生成输出卷积的一个主要好处是它可以并行训练。但是由于核大小是固定，它们的推理不如 RNN 快速并且对序列长度有限制。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_fd12397b6c4e.jpg)

图4-3：递归 SSM 和 卷积 SSM 的对比这里可以使用一个简单的技巧，即根据任务选择表示。在训练过程中使用可以并行化的卷积表示，在推理过程中，我们使用高效的循环表示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_edff2294be15.jpg)

图4-4：递归推理、卷积训练
#### 4.4 为什么对角化可以减少 SSM 计算复杂度

为了进一步提升计算效率，作者讨论了对角化在计算离散时间状态空间模型（SSM）中的应用，以及为什么直接应用对角化方法在实践中并不可行。

对角化是一种线性代数技术，它可以将一个矩阵转换为对角形式，从而简化矩阵的乘法和其他运算。在 SSM 的上下文中，对角化可以显著减少计算复杂度，因为对角矩阵的幂运算（如在递归方程中出现的）可以通过简单的元素指数运算来完成。

下面我们解释下，为什么对角化可以减少 SSM 计算复杂度。

首先，我们引入论文中的定理 3.1

<strong>（Lemma 3.1）：共轭是 SSM 中的等价关系，即：</strong>

$\left( \bm{A},\bm{B},\bm{C} \right)\sim \left( \bm{V}^{-1}\bm{A}\bm{V},\bm{V}^{-1}\bm{B},\bm{C}\bm{V} \right)\tag{18}也就是将矩阵 \bm{A},\bm{B},\bm{C} 变为 \bm{V}^{-1}\bm{A}\bm{V},\bm{V}^{-1}\bm{B},\bm{C}\bm{V}  ，最后得到的输出 {y} 保持不变。那么如果矩阵 \bm{V}^{-1}\bm{A}\bm{V} 是对角矩阵，则输出 {y} 的计算复杂度将从 O\left( N^2 \right) 变成 O\left( N \right) 。只要 Lemma 3.1 成立，我们就能使用对角化技术，降低计算复杂度。下面我们看一下 Lemma 3.1 的证明。$

证明可以从 SSM 的两种表达形式出发。首先，有两个 SSM，其状态分别用 \bm{x} 和 \tilde{\bm{x}} 表示。

第一个 SSM：

$\begin{align} &\bm{x}'=\bm{Ax}+\bm{B}u\\ &{y}=\bm{Cx} \end{align} \tag{19}第二个 SSM： \begin{align} &\tilde{\bm{x}}=\bm{V^{-1}AV}\tilde{\bm{x}}+\bm{V^{-1}B}u\\ &{y}=\bm{CV\tilde{x}} \end{align} \tag{20}通过 \bm{V} 将第二 SSM 乘以 \bm{V} 后，变成如下形式：$

\begin{align} &\bm{V}\tilde{\bm{x}}=\bm{A}\left( \bm{V}\tilde{\bm{x}} \right)+\bm{B}u\\ &{y}=\bm{C}\left( \bm{V\tilde{x}} \right) \end{align} \tag{21}可以看到当  \bm{x}=\bm{V\tilde{x}}，两个 SSM 变得一样， 即 \bm{x}=\bm{V\tilde{x}} 。因此，这两个 SSM 计算的相同的操作符 {u}\rightarrow {y} ，只是通过 \bm{V} 对状态 \bm{x} 进行了变换。

通过共轭将 \bm{A} 转换为其它形式，理想情况下这种形式结构更清晰，并且允许更快的计算。例如，如果 \bm{V}^{-1}\bm{A}\bm{V} 是对角矩阵，那么所需的计算将变得容易得多。

<strong>备注：</strong>Lemma 3.1 是非常重要的结论，这意味着只要矩阵 \bm{E} 和矩阵 \bm{A} 相似（即满足 \bm{E}=\bm{V}^{-1}\bm{A}\bm{V} ），那么就可以使用 Lemma 3.1 中的方法替换矩阵 \bm{A},\bm{B},\bm{C} ，替换后的输出 {y} 保持不变。

#### 4.5 直接对角化 HiPPO 矩阵导致数值溢出

上面提到，如果 \bm{A} 能对角化，那么 SSM 递归计算的复杂度将从 O\left( N^2 \right) 变成 O\left( N \right) 。

然而，作者指出，直接对角化 HiPPO 矩阵（用于处理长距离依赖的特殊矩阵）会导致数值问题。这是因为 HiPPO 矩阵的对角化涉及到的矩阵元素在状态大小 N 增大时会呈指数级增长，这使得对角化在数值上变得不稳定和不可行。

$<strong>Lemma 3.2</strong> 将 HiPPO 矩阵 \bm{A}  直接对角化为矩阵 \bm{V}_{ij}=C_{i+j}^{i-j} ，那么 \bm{V}_{3i,i}=C_{4i}^{2i}\approx 2^{4i} ，因此直接对角化会导致数值溢出。$

下面证明下这个结论。

首先我们可以找到矩阵 \bm{A} 的一个相似矩阵，表示如下：

$\tilde{\bm{A}}=\left[   \begin{array}{cccc}   1 &  &  &  \\   -1 & 2 &  &  \\   1 & -3 & 3 &  \\   \vdots & \vdots & \vdots & \ddots \\   \end{array}   \right]  \tag{22}**其中：  k \\ k+1 &\text{if }n=k\\ 0 &\text{if } n\tilde{\bm{A}_{nk}}=\begin{equation} \begin{cases} \left( -1 \right)^{\left( n-k \right)}\left( 2k+1 \right)& \text{if } n > k \\ k+1 &\text{if }n=k\\ 0 &\text{if } n那么可以找到一个可逆矩阵：$

$\bm{V}=\left( C_{i+j}^{i-j} \right)_{ij}=\left[   \begin{array}{cccc}   1 &  &  &  \\   1 & 1 &  &  \\   1 & 3 & 1 &  \\   \vdots & \vdots & \vdots & \ddots \\   \end{array}   \right]  \tag{24}使得 \bm{V}^{-1}\tilde{\bm{A}}\bm{V} 是对角矩阵。比如考虑 N=3 ，那么： \bm{V}^{-1}\tilde{\bm{A}}\bm{V}=\left[   \begin{array}{cccc}   1 &  &  &  \\   1 & 1 &  &  \\   1 & 3 & 1 &   \\   \end{array}   \right]^{-1}\left[   \begin{array}{cccc}   1 &  &  &  \\   -1 & 2 &  &  \\   1 & -3 & 3 &  \\   \end{array}   \right]\left[   \begin{array}{cccc}   1 &  &  &  \\   1 & 1 &  &  \\   1 & 3 & 1 &   \\   \end{array}   \right]=\left[   \begin{array}{cccc}   1 &  &  &  \\    & 2 &  &  \\    &  & 3 &   \\   \end{array}   \right] \tag{25}即然无法直接对 \bm{A} 矩阵进行对角化，那么是否可以将其转化为低秩矩阵或者其它可以对角化的矩阵？解下来我们介绍下如何将其转换为正规矩阵+低秩矩阵。$

#### 4.6 S4 参数化：正规矩阵+低秩矩阵

虽然矩阵 \bm{A} 不能直接对角化，但是可以表示为正规矩阵+低秩矩阵。

$Theorem 1**：HiPPO 矩阵\bm{A} 可以表示为正规矩阵+低秩矩阵的形式，即： \bm{A}=\bm{V}^{-1}\bm{\Lambda V}-\bm{P}\bm{Q}^{T}=\bm{V}^{-1}\left(  \bm{\Lambda}-\left( \bm{VP} \right)\left( \bm{P}^{T}\bm{V}^{-1} \right)\right)\bm{V}\tag{26}其中 \bm{V}\in \mathbb{R}^{N\times N} ， \bm{\Lambda} 是对角矩阵， \bm{P,Q}\in \mathbb{R}^{N\times r} 是低秩矩阵。$

下面简单证明下这个定理。

已知 HiPPO 矩阵 \bm{A} 可以表示为：

 $$k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n\bm{A}_{nk}=- \begin{equation} \begin{cases} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{}& \text{if } n > k \\ n+1 &\text{if }n=k\\ 0 &\text{if } n那么 \bm{A}_{nk}+\frac{1}{2}\left( 2n+1 \right)^{}\left( 2k+1 \right)^{} 表示为：$$

 $$k \\ \frac{1}{2} &\text{if }n=k\\ - \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{} &\text{if } n- \begin{equation} \begin{cases} \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{}& \text{if } n > k \\ \frac{1}{2} &\text{if }n=k\\ - \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{} &\text{if } n虽然这个矩阵不是<strong>反对称矩阵</strong>（反对称矩阵可以对角化），但是可以表示为 -\frac{1}{2}\bm{I}-\bm{S} ，其中 \bm{S} 是反对称矩阵，矩阵 \bm{A} 可以重新表示为：  k \\ 0 &\text{if }n=k\\ - \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{} &\text{if } n\begin{align} &\bm{A}=-\frac{1}{2}\bm{I}-\bm{S}-\bm{PP}^{\text{T}}\\ &\bm{S}_{nk}=- \begin{cases} \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{}& \text{if } n > k \\ 0 &\text{if }n=k\\ - \frac{1}{2} \left( 2n+1 \right)^{}\left( 2k+1 \right)^{} &\text{if } n由于 \bm{S} 可以对角化，因此 -\frac{1}{2}\bm{I}-\bm{S} 也可以对角化，因此：$$

$$\bm{A}=-\frac{1}{2}\bm{I}-\bm{S}-\bm{PP}^{\text{T}}=\bm{V}^{-1}\bm{\Lambda V}-\bm{P}\bm{P}^{T}\tag{29}其中 \bm{P} \in \mathbb{R}^{N\times 1} 是低秩矩阵。$$

$$<strong>备注：</strong>之前整个矩阵 \bm{A} 加上了 \frac{1}{2}\left( 2n+1 \right)^{}\left( 2k+1 \right)^{} ，所以最后需要减去，而这一块更好是 \bm{PP}^{T} 。因为 \bm{PP}^{\text{T}} 第 n 行第 k 列为 P_nP_k=\left( n+\frac{1}{2} \right) ^{}\left( k+\frac{1}{2} \right) ^{}=\frac{1}{2}\left( 2n+1 \right)^{}\left( 2k+1 \right)^{} 。$$

这样我们就将矩阵 \bm{A} 转换为了正规矩阵+低秩矩阵的形式。下面我们看一下转换之后的递归计算和卷积计算的复杂度。

#### 4.7 S4 的计算复杂度

经过正规矩阵+低秩矩阵分解后，我们再来考虑 S4 的计算复杂度有什么变化。我们同时考虑推理时递归计算的复杂度以及训练时卷积计算的复杂度。

先给出结论：

- S4 的递归计算复杂度为 O\left( N \right) MVM = O\left( N^2 \right) 。其中 MVM 表示矩阵向量乘法（Matrix-Vector Multiplications）。
- S4 的卷积复杂度从 O\left( LN^2 \right)降低到 \tilde{O}\left(  N+L\right) Cauchy 矩阵-向量乘法，空间复杂度为 O\left( N+L \right) 。
可以看到，递归计算的复杂度没有变化，而卷积的复杂度从 O\left( LN^2 \right)降低到 \tilde{O}\left(  N+L\right) Cauchy 矩阵-向量乘法。

这里的 Cauchy 矩阵-向量乘法复杂度表示如下：

$$\tilde{O}\left( N \right)= \begin{equation} \begin{cases} O\left( N^2 \right)& \text{朴素方法 } \\ O\left( N\text{log}^2N \right) &\text{精确计算}\\ O\left( N\text{log}N\text{log}\frac{1}{\varepsilon} \right) &\text{精度为}\varepsilon \end{cases} \end{equation} $$

如果Cauchy 矩阵-向量乘法按照精确计算，那么 S4 的卷积复杂度为 O\left( \left( N+L \right)\text{log}^2\left( N+L \right) \right) ，也是小于之前的复杂度 O\left( LN^2 \right) 。

解下来我们详细介绍 S4 计算复杂度的分析过程，首先介绍递归计算复杂度。

<strong>递归计算复杂度</strong>

$公式（26）表示矩阵 \bm{A} 可以分解为 \bm{V}^{-1}\left(  \bm{\Lambda}-\left( \bm{VP} \right)\left( \bm{P}^{T}\bm{V}^{-1} \right)\right)\bm{V} ，结合前面的 <strong>Lemma 3.1</strong>，那么矩阵 \bm{A} 可以变换为 \bm{\Lambda}-\left( \bm{VP} \right)\left( \bm{P}^{T}\bm{V}^{-1} \right) ，可以表示为 \bm{\Lambda}-\bm{PQ}^{\text{T}} 的形式。$

由于：

$$\begin{align} &\bar{\bm{A}}=\left( \bm{I}-\Delta /2\cdot \bm{A} \right)^{-1}\left( \bm{I}+\Delta /2\cdot \bm{A} \right)\\ & \bar{\bm{B}}=\left( \bm{I}-\Delta /2\cdot \bm{A} \right)^{-1}\bm{B}\end{align} \tag{30}先考虑  \bm{I}+\Delta /2\cdot \bm{A}  ：  \begin{align}  \bm{I}+\Delta /2\cdot \bm{A} &= \bm{I}+\Delta /2\left( \bm{\Lambda}-\bm{PQ}^{\text{T}} \right)\\ &= \frac{\Delta}{2}\left[ \frac{2}{\Delta}+ \left( \bm{\Lambda}-\bm{PQ}^{\text{T}} \right)\right]\\ &=\frac{\Delta}{2}\bm{A}_0 \end{align} \tag{31}$$

**

$然后计算 \left(  \bm{I}-\Delta /2\cdot \bm{A}  \right)^{-1} ：$

 $$\begin{align}  \left( \bm{I}-\Delta /2\cdot \bm{A}  \right)^{-1}&= \left( \bm{I}-\Delta /2\left( \bm{\Lambda}-\bm{PQ}^{\text{T}} \right) \right)^{-1}\\ &= \frac{2}{\Delta}\left[ \frac{2}{\Delta}-  \bm{\Lambda}+\bm{PQ}^{\text{T}} \right]^{-1}\\ &= \frac{2}{\Delta}\left[ \bm{D}-  \bm{DP}\left( \bm{I}+\bm{Q}^{\text{T}}\bm{DP} \right)^{-1}\bm{Q}^{T}D \right]^{-1}\\ &=\frac{2}{\Delta}\bm{A}_1 \end{align} \tag{32}其中 \bm{D}=\left( 2/\Delta-\bm{\Lambda} \right)^{-1} 也是对角矩阵，因此上式中的 \bm{I}+\bm{Q}^T\bm{DP} 相当于对低秩矩阵乘法 \bm{Q}^T\bm{P} 做了缩放，计算复杂度仍然为 O\left( N \right) 。$$

$$现在，我们可以将公式（30）重新表示为下面的形式： \begin{align} &\bar{\bm{A}}=\bm{A}_1\bm{A}_0\\ &\bar{\bm{B}}=\frac{2}{\Delta}\bm{A}_1\Delta\bm{B}=2\bm{A}_1\bm{B} \end{align} \tag{33} 公式（12）的 SSM 可以重新表示为：$$

$\begin{align} &\bm{x}_k=\bar{\bm{A}}\bm{x}_{k-1}+\bar{\bm{B}}{u}_k=\bm{A}_1\bm{A}_0\bm{x}_{k-1}+2\bm{A}_1\bm{B}{u}_k\\ &{y}_k=\bm{Cx}_k \end{align} \tag{34}可以看到矩阵 \bm{A}_1 和矩阵 \bm{A}_0中的乘法运算都是矩阵-向量乘法（Matrix-Vector Multiplications，MVM）。因为它们都是对角矩阵+低秩矩阵，因此计算复杂度为 O\left( N \right) MVM。$

卷积计算复杂度**

这一块就不再具体介绍了，感兴趣的可以直接去看原论文，在论文的附录 C.3 有详细的分析过程。

结论就是卷积的复杂度为： \tilde{O}\left(  N+L\right) Cauchy 矩阵-向量乘法。

最后作者对比了 S4 和原始卷积、递归、Attention 之间的计算复杂度，可以看到 S4 是最低的，如下图所示：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_deb7c6d60faa.jpg)

图4-5：计算复杂度对比图中 L 表示序列长度，B 表示 batch size，H 表示隐藏维度。

<strong>备注</strong>：图中的 \bm{\tilde{L}},\bm{\tilde{H}} 表示的是 \bm{L、H} 个 Cauchy 矩阵-向量乘法开销。比如 Cauchy 矩阵-向量乘法使用精确计算，那么 \tilde{\bm{H}}=\bm{H}\text{log}^2\bm{H} 。

#### 4.8 实验结果

<strong>推理效率</strong>

在图 4-15 中，显示了 S4 的推理复杂度为 O\left( H^2 \right) ，而 Transformer 的推理复杂度为 O\left( L^2H+LH^2 \right) ，我们看一下具体的测试对比，如下图所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3296ca350e13.jpg)

图4-6：推理速度对比序列长度为 1024 时，S4 的推理速度是 Transformer 的 1.58 倍；序列长度为 4096 时，是 Transformer 推理速度的 5.19 倍，由于不需要 KV cache，因此内存占用非常小。

<strong>S4 作为生成模型的效果</strong>

将 S4 应用在生成模型中，实验结果如下图所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f4718c83bb10.jpg)

图4-7：S4 作为生成模型的效果<strong>HiPPO 影响</strong>

这部分作者进行了一系列的消融实验（Ablations），以评估 HiPPO 矩阵在状态空间模型（SSM）中的重要性。这些实验旨在探究 HiPPO 矩阵在 S4 模型中的作用，以及它对于模型性能的影响。

HiPPO 矩阵是 S4 模型中用于处理长距离依赖（LRDs）的关键组件。在这一节中，作者通过以下几个方面的实验来验证 HiPPO 矩阵的重要性：

- HiPPO 初始化：作者首先研究了不同初始化方法对 SSM 性能的影响，包括随机高斯初始化、HiPPO 初始化以及随机对角高斯矩阵初始化。实验结果表明，HiPPO 初始化在提高模型性能方面起到了关键作用。
- HiPPO 矩阵是否可训练：作者还探讨了 HiPPO 矩阵固定以及可训练的效果。他们发现，固定 HiPPO 和可训练的差异不大。
- NPLR SSMs：作者进一步研究了在没有 HiPPO 矩阵的情况下，随机 NPLR（Normal Plus Low-Rank，正规+低秩矩阵）的表现。结果表明，即使在 NPLR 形式下，这些随机矩阵的性能仍然不佳，这验证了 HiPPO 矩阵在 S4 模型中的核心作用。
通过这些消融实验，作者强调了 HiPPO 矩阵在 S4 模型中的重要性。这些实验结果不仅证实了 HiPPO 矩阵在处理长距离依赖方面的有效性，而且也表明了它在提升模型整体性能方面的关键作用。这些发现对于理解 S4 模型的设计和优化至关重要。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_46531533777e.jpg)

图4-8：HiPPO 矩阵初始化效果远远高于其它矩阵初始化虽然 S4 在保证了计算效率的同时，优化了长距离依赖问题。但是由于矩阵 \bm{A},\bm{B},\bm{C} 是固定不变的，和输入 token 无关，这就导致了 S4 在一些合成任务上效果不佳，比如选择性复制任务。

而为了解决这些问题，作者提出了 Mamba 架构，通过选择性机制改进 S4，有效解决了这类问题。下面我们就来介绍下最近很火的 Mamba 结构。

### 五、Mamba

我们终于介绍完了理解 Mamba 所需要的基础知识。状态空间模型可用于建模文本序列，但仍有一系列我们想要避免的缺点。

在本节中，我们将介绍 Mamba 的两大主要贡献：

- 一种选择性扫描算法，该算法允许模型过滤（不）相关信息；
- 一种硬件感知算法，该算法允许通过并行扫描、内核融合和重新计算来高效存储（中间）结果。
它们共同创建了选择性 SSM 或 S6 模型，这些模型可以像自注意力一样用于创建 Mamba 块。

在探讨这两大主要贡献之前，让我们首先探讨一下为什么它们是必要的。

状态空间模型，甚至是S4（结构化状态空间模型），在某些对语言建模和生成至关重要的任务上表现不佳，即关注或忽略特定输入的能力。

我们可以通过两个合成任务来说明这一点，即选择性复制和归纳头。

在选择性复制任务中，SSM 的目标是复制输入的部分内容并按顺序输出它们：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d575f40861f7.jpg)

图5-1：选择性复制任务然而，由于（循环/卷积）SSM 是线性时间不变的，因此在这项任务中表现不佳。正如我们之前看到的，对于 SSM生成的每个 token，矩阵 A、B 和 C 都是相同的。

因此，由于固定的 A、B 和 C 矩阵，SSM 无法执行内容感知推理，因为它对每个 token 都一视同仁。这是一个问题，因为我们希望 SSM 能对输入（提示）进行推理。

SSM 表现不佳的第二项任务是归纳头，其目标是重现输入中发现的模式：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_784575ffcc5e.jpg)

图5-2：重现输入中发现的模式在上面的例子中，我们本质上是在执行一次提示，我们试图“教”模型在每个“Q:”之后提供一个“A:”的回应。然而，由于 SSM 是时间不变的，它无法选择从历史中回忆哪些之前的 token。

让我们通过关注矩阵 B 来说明这一点。无论输入 u 是什么，矩阵 B 都保持不变，因此与 u 无关：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0e15bb1233b7.jpg)

图5-3：矩阵 B 与输入 u 无关同理，无论输入是什么，A 和 C 也不变，这就是我们上面说的静态。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e7d9d4864e24.jpg)

图5-4：A 和 C 矩阵也和输入 u 无关相比之下，这些任务对于 Transformer 来说相对容易，因为它们会根据输入序列动态地改变自己的注意力。它们可以选择性地“查看”或“关注”序列的不同部分。

SSM 在这些任务上的糟糕表现说明了时间不变 SSM 的潜在问题，即矩阵 A、B 和 C 的静态性质导致内容感知方面的问题。

#### 5.1 通过选择机制改进 SSM

为了解决上面的问题，作者提出了一种新的选择性 SSM（Selective State Space Models，简称 S6 或 Mamba）。这种模型通过让 SSM 的矩阵 A、B、C <strong>依赖于输入数据</strong>，从而实现了选择性。这意味着模型可以根据当前的输入动态地调整其状态，选择性地传播或忽略信息。

Mamba 集成了 S4 和 Transformer 的精华，一个更加高效（S4），一个更加强大（Transformer）。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b65295cdb901.jpg)

图5-5：Mamba 集成了 S4 和 Transformer 各自的优点正如上面所提到的，它是通过有选择地将数据压缩到状态中来实现的。当你有一个输入句子时，通常会有一些信息，比如停用词，没有太多意义。

为了有选择地压缩信息，我们需要让参数依赖于输入。为此，我们首先来探讨一下 SSM 在训练过程中输入和输出的维度。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_af1af66f2ad7.jpg)

图5-6：SSM 输入（u）输出（y）维度<strong>备注</strong>：在前面的 HiPPO 和 S4 中，我们假设的输入信号 u\left( t \right) 是 1 维的，而实际应用中大多数都是多维的，后面我们默认是多维输入（默认维度为 D）。<strong>而且需要强调的是 S4 用的是 Single-input-single-output (SISO)，即对应于每一个输入的维度，都有一套独立的 SSM 参数 （传统的 RNN 是 MIMO，multiple-input-multiple-output, 很容易混淆）</strong>。

在 S4 中，矩阵 A、B 和 C 与输入无关，因为它们的维度 N 和 D 是静态的，不会改变。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_20cc861560dd.jpg)

图5-7：S4 中的矩阵A、B、C<strong>备注</strong>：实际上矩阵 \bm{A}\in \mathbb{R}^{N\times N}，但是通过对角化技术，可以转化为 N 维，因此图5-7中，每个输入维度对应的矩阵 A 维度为 N，输入一共是 D 维，因此矩阵 A 可以表示为 N \times D 的矩阵。

相反，Mamba 通过将输入序列的长度和批次大小结合起来，使矩阵 B 和 C，甚至步长 ∆ 都依赖于输入：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_bcf6193cff7f.jpg)

图5-8：Mamba 中的矩阵B、C和输入有关（L是序列长度）这意味着对于每个输入 token，我们现在有不同的 B 和 C 矩阵。

<strong>备注</strong>：这里矩阵 A 保持不变，因为我们希望状态本身保持静态，但影响它的方式 (通过 B 和 C) 是动态的。

它们一起选择性地决定在隐藏状态中保留什么和忽略什么，因为它们现在依赖于输入。

在 SSM 中，通过调整 ∆，模型可以控制对当前输入的关注度，从而实现类似于 RNN 门控的效果。例如，<strong>当 ∆ 较大时，模型倾向于关注当前输入并忽略之前的信息</strong>；而当∆较小时，模型则倾向于保留更多的历史信息：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_669f009e1b14.jpg)

图5-9：步长 ∆ 效果相当于门控下面我们看一下选择性 SSM 的完整过程，如下所示：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_366c5db7d71b.jpg)

图5-10：选择性 SSM 完整过程图 5-10 中的 Represents structured N\times N  matrix 说的就是原始 N\times N 的矩阵 \bm{A} 经过对角化之后变成维度 N 。

算法 2 展示了作者所使用的主要选择机制。这一套的思路由来已久，Transformers 里面的 QKV、LSTM里面的、Gating 都是类似的思想。

S4 和 选择性 SSM 的核心区别在于，它们将几个关键参数（∆, B, C）设定为输入的函数，并且伴随着整个 tensor 形状的相关变化。特别是，这些参数现在具有一个长度维度 L，这意味着模型已经从时间不变（time-invariant）转变为时间变化（time-varying）。

$其中 :\begin{align} &S_B\left( x \right)=\text{Linear}_N\left( x \right)\\ &S_C\left( x \right)=\text{Linear}_N\left( x \right)\\ &S_{\Delta}\left( x \right)=\text{Broadcast}_D\left( \text{Linear}_1\left( x \right) \right)\\ &\tau_{\Delta}=\text{softplus} \end{align} \tag{35} \text{Linear}_d 表示将输入映射到 d 维。 S_{\Delta},\tau_{\Delta} 类似于 RNN 中的门控机制。$

最后作者选择把 \bm{A} 设成了与输入无关，作者给出的解释是离散化之后 \overline{\boldsymbol{A}}=\exp (\Delta \boldsymbol{A})  ，\Delta 的数据依赖能够让整体的 \overline{\boldsymbol{A}} 与输入相关。

#### 5.2 选择性 SSM 和门控之间的关系

<strong>时间步</strong>\Delta 

时间步 \Delta 和 RNN 的门控有很强的关联，<strong>依赖输入的</strong>\Delta<strong>跟 RNN 的遗忘门的功能类似</strong>。

$当 N=1,A=-1,B=1,S_{\Delta}=\text{Linear}\left( x \right),\tau_{\Delta}=\text{softplus} ，那么算法 2 中的选择性 SSM 可以表示如下：$

$\begin{align} &g_t=\sigma\left( \text{Linear}\left( x_t \right) \right)\\ &h_t=\left( 1-g_t \right)h_{t-1}+g_tx_t \end{align} \tag{36}可以看到这就是一个带门控的 RNN。$

<strong>矩阵 B 和 C</strong>

在 SSM 中，修改 B 和 C 以使其具有选择性，允许模型更精细地控制是否让输入进入状态 h 或状态进入输出 y，所以 B 和 C 类似于 RNN 中的输入门和输出门。

<strong>矩阵 A</strong>

<strong>A</strong> 有点类似于起到多尺度/细粒度门控的作用。虽然\Delta已经有点遗忘门的作用，但注意到对于每个输入维度来说，\Delta只是一个标量，而A\in\mathbb{R}^{N \times 1}，也就是说对应这个维度的 SSM 来说，A 在每个 hidden state 维度上的作用可以不相同，起到细粒度门控的作用，这也是 LSTM 网络里面用 element-wise product 的原因（LSTM 中遗忘门是跟隐藏层维度相同的一个向量，而不仅仅是一个标量）。

#### 5.3 Mamba 高效实现 

因为现在的参数 \bm{A},\bm{B},\bm{C} 都是输入相关了，所以不再是线性时间不变系统，也就失去了卷积的性质，不能用 FFT来进行高效训练了。

Mamba 作者采用了一种称为硬件感知的算法，实际上就是用三种经典技术来解决这个问题：<strong>内核融合（kernel fusion）</strong>、<strong>并行扫描（parallel scan）</strong>和<strong>重计算（recomputation）</strong>。

一般的实现会提前先把大小为 (B, L, D, N) 的 \overline{\boldsymbol{A}}, \overline{\boldsymbol{B}} 先算出来，然后把它们从 HBM (high-bandwidth memory 或 GPU memory) 读到SRAM，然后调用 scan 算子算出 (B, L, D, N) 的 output，写到 HBM 里面。再开一个kernel 把 (B, L, D, N) 的 output 以及(B,L,N) 的 C 读进来，multiply and sum with C 得到最后的 (B,L,D) output 。整个过程的读写是 O(BLDN) 。

而 Mambda 作者的方法是：

把 (\Delta, A, B, C) 读到 SRAM 里面，总共大小是 O(BLN+DN) 

在 SRAM 里面做离散化，得到 (B, L, D, N) 的 \overline{\boldsymbol{A}}, \overline{\boldsymbol{B}} 

- 在 SRAM 里面做 scan，得到(B, L, D, N) 的 output
multiply and sum with C，得到最后的(B,L,D) output 写入HBM  

整个过程的总读写量是 O(BLN) ，比之前省了 O\left( N \right) 倍。 backward 的时候就把 \overline{\boldsymbol{A}}, \overline{\boldsymbol{B}} 重算一遍，类似于flashattn 重算 attention 分数矩阵的思想。只要重算的时间比读 O(BLND) 快就算有效。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c38c523bf924.jpg)

图5-10：Mamba 的 scan 和其它方法对比Mamba 的实现比其它方法实现快很多倍，scan 在输入长度 2k 的时候就开始比 FlashAttention 快了，之后越长越快。同时 scan 也比 Convolution 快。

#### 5.4 Mamba 架构

下图是 Mamba 的模型结构：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b0ed55bcdeb2.jpg)

图5-11：Mamba 模型结构之前的 SSM 模型要 work，都会加上 output gating，之后再过个线性层 channel mixing，如上图的最左边所示。这两个部分跟 Gated MLP（上图中间）右边的支路和最上面的 channel mixing 是一样的。所以 SSM 层如果跟Gated MLP 合并的话，难免会感觉有点冗余，所以作者干脆把两个合二为一，把 token mixing 层和 channel mixing。

图 5-11 的 Mamba 可以作为一个块来实现，就像我们可以在解码器块中表示自注意力一样。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_394c2c1ebb26.jpg)

图5-12：Mamba 块与解码器一样，我们可以堆叠多个 Mamba 块，并使用它们的输出作为下一个 Mamba 块的输入：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3460bfcb9b7d.jpg)

图5-13：多个Mamba块组合使用它首先进行线性投影以扩展输入 embedding。然后，在应用选择性 SSM 之前进行卷积。选择性 SSM 具有以下属性：

- 通过离散化创建递归 SSM；
- 对矩阵 A 进行 HiPPO 初始化，以捕获远程依赖关系；
- 选择性扫描算法，有选择地压缩信息；
- 硬件感知算法，加速计算；
**下面是一个端到端（输入到输出）的例子：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_fad3ee3f5ae7.jpg)

图5-14：Mamba 架构端到端输出例子下面我们看一下 Mamba 和 Transformer 以及 RNN 的对比：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_54189ac840bc.jpg)

图5-15：Mamaba和Transformer以及RNN对比
#### 5.5 实验

之前提到 \Delta 的作用类似遗忘门，而遗忘门毫无疑问是 LSTM 里面最重要的门，下面这个消融实验结果就论证了 \Deltadata dependent 影响最大。**

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f12632009e5f.jpg)

图5-16：对不同参数data dependent的敏感性最后再看一下模型效果：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_bf76698bb515.jpg)

图5-17：Mamba和Transformer对比总结起来就是，效果最好，速度最快！

### 总结

融合 SSM 和 LSTM，将 LSTM 选择性的思想融入 SSM 中，全方位的实现优化，使得 Mamaba 即具备像 Transformer 高效训练的特点，又具备 S4 中支持长文本的优点，同时具备 LSTM 一样选择性记忆的特点。

实验证明了 Mamba 的优秀，但是还需要更长的时间检验，目前还没有 10B 以上的 Mamba 模型，就让时间来检验。

### <strong>参考</strong>

[Mamba: Linear-Time Sequence Modeling with Selective State Spaces](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2312.00752.pdf)

Mamba 作者博士论文

[S4: Efficiently Modeling Long Sequences with Structured State Spaces](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2111.00396.pdf)

[HiPPO: Recurrent Memory with Optimal Polynomial Projections](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2008.07669.pdf)

[deephub：Mamba详细介绍和RNN、Transformer的架构可视化对比](https://zhuanlan.zhihu.com/p/683513936)

A Visual Guide to Mamba and State Space Models

一文通透想颠覆Transformer的Mamba：从SSM、S4到mamba、线性transformer(含RWKV解析)_mamba模型-CSDN博客

[sonta：[线性RNN系列]  Mamba: S4史诗级升级](https://zhuanlan.zhihu.com/p/661237120)

《Mamba: Linear-Time Sequence Modeling with Selective State Spaces》阅读笔记

[看图学：大模型推理加速：看图学KV Cache](https://zhuanlan.zhihu.com/p/662498827)

Transformers KV Caching Explained

解析 Transformers 的 KV 缓存机制
