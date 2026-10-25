---
title: "从理论角度理解Adam算法的自适应性"
date: "2022-08-24 00:00:00"
updated: "2022-08-24 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/从理论角度理解Adam算法的自适应性/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/556290131"
---


本文章是对我们最近一篇工作["Provable Adaptivity in Adam"](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2208.09900) 的简要介绍，全文近三千字。

TLDR: 我们从优化器全局收敛性分析的角度提供了Adam训练速度快于SGD的原因。

### 1. 问题背景介绍

Adam优化器自从2014年由Kingma & Ba [1]提出后，因其收敛速度快而被深度学习领域广泛采用。在这里为了方便讨论我们给出Adam算法的更新公式：

$$\boldsymbol{m}(t)=\beta_1\boldsymbol{m}(t-1)+(1-\beta_1) \hat{\mathcal{L}} (\boldsymbol{w}(t)), \\ \boldsymbol{\nu}(t)=\beta_2\boldsymbol{\nu}(t-1)+(1-\beta_2) \hat{\mathcal{L}} (\boldsymbol{w}(t))^2, \\ \boldsymbol{w}(t+1)=\boldsymbol{w}(t)-\eta_t \frac{\boldsymbol{m}(t)}{\sqrt{\boldsymbol{\nu}(t)}+\varepsilon}. $$

可与之相对的，Adam的理论理解方面还存在着很多的谜团。其中一个非常重要的问题是：

为什么Adam在训练上表现得这么好？当然，说表现好就要有个与之对比的baseline，这里对标的则是另一个主流算法 --- 随机梯度下降(SGD)。虽然由于Adam广受欢迎，其收敛性分析从来就不少，但是现有Adam的收敛速度最多只能和SGD持平，无法体现Adam相较于SGD的优势 --- 一方面，这是合理的。已有工作 Arjevani et al.[2]表明，在非凸优化分析中一些常见的假设下，SGD的收敛速度可以达到所有只基于随机梯度信息的算法的下界，因此已经是最优了。但另一方面，为什么在实际中我们观察到Adam这么快？

### 2. 寻找突破口 -- 更符合实际的光滑性假设

上文我们提到了“非凸优化分析中一些常见的假设”。一个自然而然的想法则是：是不是我们的假设和深度学习实际并不相符，所以没办法解释实际中Adam的快速收敛？特别地，一个非凸优化中的核心假设是目标函数服从 L -光滑性，即目标函数的梯度服从 L - Lipschitz性质。

> 更正式地，一个 \mathbb{R}^d上的可微函数 f 满足 L- 光滑性是指，对于 \mathbb{R}^d 上的任何两点 \boldsymbol{w}_1 和 \boldsymbol{w}_2 ， \Vert \nabla f(\boldsymbol{w}_1)-\nabla f(\boldsymbol{w}_2)\Vert\le L\Vert \boldsymbol{w}_1- \boldsymbol{w}_2\Vert  成立。

容易看出，如果我们更进一步去假设目标函数二阶可导，这一性质实际是在要求目标函数的二阶导数在 Rd" role="presentation">Rd\mathbb{R}^d 一致有界。从而，要求目标函数服从 L" role="presentation">LL 光滑性其实是限制了函数在任一方向上的增长只能不超过二次函数这一量级的 --- 这对于神经网络来说有点不太贴切，因为就算是使用线性激活函数的全连接网络，其output也是权重参数的多元高次函数。更进一步地，Zhang et al. [3]对实验中训练经过的参数点附近的光滑性进行观察，发现在整个训练过程中局部光滑性的变化可能会比较剧烈。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_72ecaa81efee.jpg)

Zhang et al. [3]中的对训练过程中梯度大小和光滑性的变化进行的观察。具体实验细节可以参照[3]中的图5和我们文章的图1，3。那么，什么是合理的光滑性假设呢？Zhang et al. [3]发现，在Adaptive Method更常被使用的深度学习任务上(比如自然语言处理), 局部光滑性与局部梯度模长呈正相关关系。更近一步地，他们发现，在这些任务上局部光滑性可以被局部梯度模长的线性函数控制，并提出了 (L_0,L_1) -光滑性。

$$> 一个 \mathbb{R}^d上的可微函数 f 满足 (L_0,L_1)- 光滑性是指，对于 \mathbb{R}^d 上的任何满足 \Vert \boldsymbol{w}_1-\boldsymbol{w}_2\Vert \le \frac{1}{L}的两点 \boldsymbol{w}_1 和 \boldsymbol{w}_2 ， \Vert \nabla f(\boldsymbol{w}_1)-\nabla f(\boldsymbol{w}_2)\Vert\le (L_1\Vert \nabla f(\boldsymbol{w}_1)\Vert +L_0)\Vert \boldsymbol{w}_1- \boldsymbol{w}_2\Vert  成立。$$

值得一提的是，(L_0,L_1)- 光滑性是一个比 L -光滑性更弱的条件（L_1=0 时 (L_0,L_1)- 光滑性退化为 L_0 光滑性）。相较于 L 光滑性要求函数不能以超过二次函数的速度变化，服从 (L_0, L_1)-光滑性的函数包括任意次数的多项式函数甚至指数函数，因此也从某种程度上解释了为什么 (L_0,L_1)-光滑性能够很好地刻画一些深度学习任务的目标函数。

新的光滑性假设的出现也给Adam的收敛性研究带来了突破口。对于SGD来说，它的收敛速度非常依赖于光滑性大小 --- 越大的光滑性则需要越小的步长（学习率）来保证收敛，而这会导致更慢的收敛速度（因为步长小了，直观上走的更慢）。特别地，对于服从 (L_0,L_1) -光滑性的目标函数来说，可能并不存在一个全局的光滑性上界。在这种情况下，如果SGD的优化轨迹经过了一些光滑性较差(即光滑性很大)的地方，SGD可能会收敛的非常慢（甚至不收敛）。从而，直观上如果我们能够在(L_0,L_1) 假设下给Adam一个较好的收敛保证，我们就能由此解释Adam表现优于SGD的原因。更具体地，我们落脚于以下问题：

> 我们能否在 (L_0, L_1) -光滑性条件下证明Adam的收敛性，并体现Adam收敛速度优于SGD的原因？

### 3. 主要结果

文章的主要结果可以分为两个部分。 

首先是Adam在 (L_0,L_1) -光滑性假设下的收敛。

> （主要结果1）**：（在一些和实际相符的超参选取下），Adam在 (L_0, L_1 ) -光滑性假设和梯度仿射方差(Affine Variance)假设下收敛到鞍点（Saddle Point）附近的一个邻域。

我们这里略去结果的证明。感兴趣的读者可以阅读原文，我们在原文中给了一个非常清晰的证明思路。这里我们主要来讨论结果的假设以及结果。

首先，梯度仿射方差(Affine Variance)是非凸随机优化中的一个非常弱的假设，即随机梯度的方差可以被梯度的线性函数控制。因此，我们的结果的适用范围较为广泛。需要指出的是，相较于以往的Adam收敛结果，我们不仅第一个在(L_0, L_1 ) -光滑性假设下证明了Adam的收敛性，并且采用了最贴合实际的超参设置以及最弱的假设（不需要有界梯度假设）；另一方面，我们的结果是最强的：我们的收敛是逐轨道意义下的，而不是现有工作中通常得到的期望收敛。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_bdbedc1b5b37.jpg)

论文中的表1列出了我们与现有工作所需假设和所得结论之间的比较。感兴趣的读者可以直接阅读原文。其次，细心的读者可能发现，我们的结果并不能说明Adam收敛到鞍点，而是鞍点周围的邻域。需要指出的是，这并不是我们证明没有做到位 --- 我们在文章中提供了一个满足我们所有假设的反例，在其上Adam确实无法收敛到鞍点而仅仅只能收敛到鞍点周围的一个邻域（参见论文中图2）。

但是值得庆幸的是，这一区域的大小随着 \beta_2（还记得它吗？它是控制自适应学习率的超参，参见本文刚开头时给出的Adam的更新公式） 趋于1而趋于0。实际中，Adam的 \beta_2 确实会选的非常接近1（常见的例如0.999, 0.98），从而这不会对算法的表现带来什么影响。


讲完了Adam我们再来讲讲SGD。我们文章中的另一个结果是SGD在同样的条件下存在发散的反例。

> （主要结果2）<strong>：存在反例满足</strong>主要结果1**中所有的假设，SGD在其上发散。

反例的详细构造可以参见文章。Zhang et al. [3]也给出了一族类似的反例，在其上SGD会收敛地任意慢。这些反例共同依赖的insight是: SGD对局部的光滑性信息特别敏感，对于服从 (L_0,L_1) -光滑性的函数局部光滑性可能任意差，从而使SGD表现很差。

<strong>主要结果1</strong>和<strong>主要结果2</strong>在一起提供了实际中Adam表现优于SGD的一种解释。

### 4. 总结&后记

本文通过理论上对比 (L_0,L_1) 光滑性假设下Adam和SGD的收敛性表现，提供了深度学习中Adam表现优于SGD的一种可能解释。

之前也注意到 @Summer Clover

 Zeke师兄的Adai这篇工作。尽管使用的分析手段不同(局部动力学分析 vs. 全局收敛性分析)，我们的工作与Adai的分析却有些相似的Insight：Adai这篇工作指出，Adam的鞍点逃逸速度与局部光滑性无关，而SGD则较为依赖局部光滑性。本文和Adai实际上都在一定程度上表明了Adam对于光滑性的不敏感是其快速收敛的一个原因。

第一次在知乎上写文，如有typo或表述不当之处，还望指出并海涵。

感谢所有合作者 Yushun Zhang, Huishuai Zhang, Qi Meng, Zhi-Ming Ma, Tie-Yan Liu, Wei Chen，至少对我来说这篇文章的产生过程特别exciting！

> 引用
[1]. King & Ba, Adam: A method for stochastic optimization
[2]. Arjevani et al., Lower bounds for non-convex stochastic optimization
[3]. Zhang et al., Why gradient clipping accelerates training: A theoretical justification for adaptivity
