---
title: 两个多元正态分布的KL散度、巴氏距离和W距离
date: "2024-03-07 00:00:00"
updated: "2024-03-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/两个多元正态分布的KL散度、巴氏距离和W距离/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/387938179
---


最佳排版请看原链接：

两个多元正态分布的KL散度、巴氏距离和W距离 - 科学空间|Scientific Spaceskexue.fm/archives/8512

正态分布是最常见的连续型概率分布之一。它是给定均值和协方差后的最大熵分布（参考**《“熵”不起：从熵、最大熵原理到最大熵模型（二）》**），也可以看作任意连续型分布的二阶近似，它的地位就相当于一般函数的线性近似。从这个角度来看，正态分布算得上是最简单的连续型分布了。也正因为简单，所以对于很多估计量来说，它都能写出解析解来。

本文主要来计算两个多元正态分布的几种度量，包括KL散度、巴氏距离和W距离，它们都有显式解析解。

### **正态分布**

这里简单回顾一下正态分布的一些基础知识。注意，仅仅是回顾，这还不足以作为正态分布的入门教程。

#### **概率密度**

正态分布，也即高斯分布，是定义在Rn" role="presentation">Rn\mathbb{R}^n上的连续型概率分布，其概率密度函数为

$$p(x)=1(2&#x03C0;)ndet(&#x03A3;)exp&#x2061;{&#x2212;12(x&#x2212;&#x03BC;)&#x22A4;&#x03A3;&#x2212;1(x&#x2212;&#x03BC;)}" role="presentation" style="font-size: 100%; display: inline-block; position: relative;">p(x)=1(2π)ndet(Σ)exp⁡{−12(x−μ)⊤Σ−1(x−μ)}p(\boldsymbol{x})=\frac{1}{\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma})}}\exp\left\{-\frac{1}{2}(\boldsymbol{x}-\boldsymbol{\mu})^{\top}\boldsymbol{\Sigma}^{-1}(\boldsymbol{x}-\boldsymbol{\mu})\right\}\\ 这里的x,&#x03BC;&#x2208;Rn" role="presentation">x,μ∈Rn\boldsymbol{x},\boldsymbol{\mu}\in\mathbb{R}^n，&#x03BC;" role="presentation">μ\boldsymbol{\mu}即均值向量（本文的向量默认情况下都为列向量），而&#x03A3;&#x2208;Rn&#x00D7;n" role="presentation">Σ∈Rn×n\boldsymbol{\Sigma}\in\mathbb{R}^{n\times n}即为协方差矩阵，它要求是正定对称的。可以看到，正态分布由\boldsymbol{\mu}和\boldsymbol{\Sigma}唯一确定，因此不难想象它的统计量都是\boldsymbol{\mu}和\boldsymbol{\Sigma}的函数。当\boldsymbol{\mu}=\boldsymbol{0}, \boldsymbol{\Sigma}=\boldsymbol{I}时，对应的分布称为“标准正态分布”。  $$

#### **基本性质**

  $通常来说，基本的统计量就是均值和方差了，它们对应着正态分布的两个参数： \begin{aligned} \mathbb{E}_{\boldsymbol{x}}\left[\boldsymbol{x}\right]=&\int p(\boldsymbol{x}) \boldsymbol{x} dx=\boldsymbol{\mu}\\ \mathbb{E}_{\boldsymbol{x}}\left[(\boldsymbol{x}-\boldsymbol{\mu})(\boldsymbol{x}-\boldsymbol{\mu})^{\top}\right]=&\int p(\boldsymbol{x}) (\boldsymbol{x}-\boldsymbol{\mu})(\boldsymbol{x}-\boldsymbol{\mu})^{\top} dx=\boldsymbol{\Sigma}\\ \end{aligned}\\$

由此也可以推出二阶矩的结果：

$\mathbb{E}_{\boldsymbol{x}}\left[\boldsymbol{x}\boldsymbol{x}^{\top}\right]=\boldsymbol{\mu}\boldsymbol{\mu}^{\top} + \mathbb{E}_{\boldsymbol{x}}\left[(\boldsymbol{x}-\boldsymbol{\mu})(\boldsymbol{x}-\boldsymbol{\mu})^{\top}\right]=\boldsymbol{\mu}\boldsymbol{\mu}^{\top} + \boldsymbol{\Sigma}\\$

还有一个常用的统计量是它的熵：

$$\mathcal{H} = \mathbb{E}_{\boldsymbol{x}}\left[-\log p(\boldsymbol{x})\right]=\frac{n}{2}(1 + \log 2\pi) + \frac{1}{2}\log \det(\boldsymbol{\Sigma}) \\$$

其计算过程可以参考后面KL散度的推导。

#### **高斯积分**

概率密度函数意味着\int p(\boldsymbol{x}) d\boldsymbol{x} = 1，这就可以推出：

$$\begin{aligned} \sqrt{(2\pi)^n \det(\boldsymbol{\Sigma})} =& \int\exp\left\{-\frac{1}{2}(\boldsymbol{x}-\boldsymbol{\mu})^{\top}\boldsymbol{\Sigma}^{-1}(\boldsymbol{x}-\boldsymbol{\mu})\right\}d\boldsymbol{x} \\ =& \int\exp\left\{-\frac{1}{2}\boldsymbol{x}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{x}+\boldsymbol{\mu}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{x}-\frac{1}{2}\boldsymbol{\mu}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{\mu}\right\}d\boldsymbol{x} \end{aligned}\\$$

$设\boldsymbol{\omega} = \boldsymbol{\Sigma}^{-1}\boldsymbol{\mu}，那么得到高斯积分$

$$\int\exp\left\{-\frac{1}{2}\boldsymbol{x}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{x}+\boldsymbol{\omega}^{\top}\boldsymbol{x}\right\}d\boldsymbol{x} = \sqrt{(2\pi)^n \det(\boldsymbol{\Sigma})}\exp\left\{\frac{1}{2}\boldsymbol{\omega}^{\top}\boldsymbol{\Sigma}\boldsymbol{\omega}\right\}\label{eq:g-int} \\$$

利用它我们可以算出正态分布的特征函数

$$\mathbb{E}_{\boldsymbol{x}}\left[\exp\left(\boldsymbol{\omega}^{\top}\boldsymbol{x}\right)\right]=\exp\left(\boldsymbol{\omega}^{\top}\boldsymbol{\mu}+\frac{1}{2}\boldsymbol{\omega}^{\top}\boldsymbol{\Sigma}\boldsymbol{\omega}\right)\\ \\$$

特征函数可以用来算正态分布的各阶矩。

### **线性代数**

这里补充一些线性代数基础，它们在后面的推导中会频繁用到。同样地，这仅仅是“回顾”，并不能作为线性代数教程。

#### **内积范数**

首先，我们来定义内积和范数。对于向量\boldsymbol{x}=(x_1,\cdots,x_n)和\boldsymbol{y}=(y_1,\cdots,y_n)，内积按照

$\langle\boldsymbol{x},\boldsymbol{y}\rangle = \sum_{i=1}^n x_i y_i \\$

$来定义，而模长定义为\Vert \boldsymbol{x}\Vert = \sqrt{\langle\boldsymbol{x},\boldsymbol{y}\rangle}。对于m\times n的矩阵\boldsymbol{A}=(a_{i,j}),\boldsymbol{B}=(b_{i,j})，我们按照类似的方式定义：$

$\langle\boldsymbol{A},\boldsymbol{B}\rangle_F = \sum_{i=1}^m\sum_{j=1}^n a_{i,j} b_{i,j} \\$

这称为Frobenius内积，对应的\Vert \boldsymbol{A}\Vert_F = \sqrt{\langle\boldsymbol{A},\boldsymbol{B}\rangle_F}称为Frobenius范数。不难看到，Frobenius内积和范数，事实上就是把矩阵展平为向量后，当作常规的向量来运算。

关于Frobenius内积，最关键的性质之一是成立恒等式

$\langle\boldsymbol{A},\boldsymbol{B}\rangle_F = \text{Tr}\left(\boldsymbol{A}^{\top}\boldsymbol{B}\right) = \text{Tr}\left(\boldsymbol{B}\boldsymbol{A}^{\top}\right) = \text{Tr}\left(\boldsymbol{A}\boldsymbol{B}^{\top}\right) = \text{Tr}\left(\boldsymbol{B}^{\top}\boldsymbol{A}\right)  \\$

也就是说，矩阵的Frobenius内积可以转化为矩阵乘法的迹，并且交换相乘顺序不改变结果（不改变迹的结果，但是矩阵乘法的整体结果会改变）。

#### **正定对称**

$接着，来看正定对称矩阵的一些性质。\boldsymbol{\Sigma}是一个正定对称矩阵，对称说的是\boldsymbol{\Sigma}^{\top}=\boldsymbol{\Sigma}，正定说的是对于任意非零向量\boldsymbol{\xi}\in\mathbb{R}^n，都有 0">\boldsymbol{\xi}^{\top}\boldsymbol{\Sigma}\boldsymbol{\xi} > 0。可以证明，如果\boldsymbol{\Sigma}_1,\boldsymbol{\Sigma}_2都是正定对称矩阵，那么\boldsymbol{\Sigma}_1^{-1},\boldsymbol{\Sigma}_2^{-1},\boldsymbol{\Sigma}_1+\boldsymbol{\Sigma}_2也都是正定对称矩阵。如果\boldsymbol{C} = \boldsymbol{B}^{\top}\boldsymbol{A}\boldsymbol{B}，\boldsymbol{B}是可逆阵，那么\boldsymbol{C}是正定对称的当且仅当\boldsymbol{A}是正定对称的。$

$此外还有半正定的概念，指对于任意非零向量\boldsymbol{\xi}\in\mathbb{R}^n，都有\boldsymbol{\xi}^{\top}\boldsymbol{\Sigma}\boldsymbol{\xi} \geq 0，也就是说可能存在非零向量\boldsymbol{\xi}使得\boldsymbol{\xi}^{\top}\boldsymbol{\Sigma}\boldsymbol{\xi} = 0。不过考虑到正定矩阵在半正定矩阵中稠密，所以我们不严格区分正定和半正定了，统一按照正定矩阵来处理。$

正定对称矩阵有一个重要的性质，那就是它的SVD分解跟特征值分解一致，即具有下述形式的分解

$\boldsymbol{\Sigma} = \boldsymbol{U}\boldsymbol{\Lambda}\boldsymbol{U}^{\top} \\$

其中\boldsymbol{U}是正交矩阵，而\boldsymbol{\Lambda}是对角阵，并且对角线上的元素都是正的。该结果的一个直接推论是：正定对称矩阵都可以“开平方”，其平方根为\boldsymbol{\Sigma}^{} = \boldsymbol{U}\boldsymbol{\Lambda}^{}\boldsymbol{U}^{\top}，其中\boldsymbol{\Lambda}^{}是指将对角线上的元素都开平方，可以检验平方根矩阵也是正定对称的。反过来，可以开平方的对称矩阵，一定也是正定对称矩阵。

#### **矩阵求导**

最后，在求Wasserstein距离的时候，还需要用到一些矩阵求导公式，如果不了解的读者，可以直接参考维基百科的“**Matrix Calculus**”。当然，其实也不难，主要用到了

$$\frac{\partial\,\text{Tr}\left(\boldsymbol{X}\boldsymbol{A}\right)}{\partial \boldsymbol{X}} = \boldsymbol{A} \\$$

剩下的可以结合迹的运算公式来派生出来，比如

$$\frac{\partial\,\text{Tr}\left(\boldsymbol{A}\boldsymbol{X}\boldsymbol{B}\right)}{\partial \boldsymbol{X}} = \frac{\partial\,\text{Tr}\left(\boldsymbol{X}\boldsymbol{B}\boldsymbol{A}\right)}{\partial \boldsymbol{X}} = \boldsymbol{B}\boldsymbol{A} \\$$

### **KL散度**

作为第一个尝试，我们来算两个高斯分布的**KL散度（Kullback-​Leibler divergence）**。KL散度算是最常用的分布度量之一了，因为它积分之前需要取对数，这对于指数簇分布来说通常能得到相对简单的结果。此外它还跟“熵”有着比较紧密的联系。

#### **计算结果**

两个概率分布的KL散度定义为

$$KL(p(\boldsymbol{x})\Vert q(\boldsymbol{x}))=\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\log \frac{p(\boldsymbol{x})}{q(\boldsymbol{x})}\right]=\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\log p(\boldsymbol{x})\right]+\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[-\log q(\boldsymbol{x})\right] \\$$

对于两个正态分布来说，计算结果是

$$KL(p(\boldsymbol{x})\Vert q(\boldsymbol{x}))=\frac{1}{2}\left[(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)-\log \det(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p) + \text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p\right) - n\right] \\$$

特别地，当q是标准正态分布时，结果简化为

$$KL(p(\boldsymbol{x})\Vert q(\boldsymbol{x}))=\frac{1}{2}\left[\Vert\boldsymbol{\mu}_p\Vert^2-\log \det(\boldsymbol{\Sigma}_p) + \text{Tr}(\boldsymbol{\Sigma}_p) - n\right]\\$$

#### **推导过程**

$从KL散度的定义知道，我们主要把\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[-\log q(\boldsymbol{x})\right]算出来就行了：$

$$\begin{aligned} \mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[-\log q(\boldsymbol{x})\right] =&\, \mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\frac{n}{2}\log 2\pi + \frac{1}{2}\log \det(\Sigma_q) + \frac{1}{2}(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q)\right]\\ =&\,\frac{n}{2}\log 2\pi + \frac{1}{2}\log \det(\boldsymbol{\Sigma}_q) + \frac{1}{2}\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q)\right] \end{aligned}\\$$

现在，关于迹的恒等式就可以派上用场了：

$\begin{aligned} \mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q)\right]=&\,\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\text{Tr}\left((\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q\right)\right]\\ =&\,\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q\right)(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\right]\\ =&\,\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[(\boldsymbol{x}-\boldsymbol{\mu}_q)(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\right]\right)\\ =&\,\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\mathbb{E}_{\boldsymbol{x}\sim p(\boldsymbol{x})}\left[\boldsymbol{x}\boldsymbol{x}^{\top}-\boldsymbol{\mu}_q\boldsymbol{x}^{\top} - \boldsymbol{x}\boldsymbol{\mu}_q^{\top} +  \boldsymbol{\mu}_q\boldsymbol{\mu}_q^{\top}\right]\right)\\ =&\,\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\left(\boldsymbol{\Sigma}_p + \boldsymbol{\mu}_p\boldsymbol{\mu}_p^{\top}-\boldsymbol{\mu}_q\boldsymbol{\mu}_p^{\top} - \boldsymbol{\mu}_p\boldsymbol{\mu}_q^{\top} +  \boldsymbol{\mu}_q\boldsymbol{\mu}_q^{\top}\right)\right)\\ =&\,\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p + \boldsymbol{\Sigma}_q^{-1}(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)^{\top}\right)\\ =&\,\text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p\right) + (\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)\\ \end{aligned}\\$

注意\boldsymbol{\mu}_q=\boldsymbol{\mu}_p,\boldsymbol{\Sigma}_q=\boldsymbol{\Sigma}_p时，上式就等于n，此时就对应正态分布的熵。所以最终得到

$$\begin{aligned} KL(p(\boldsymbol{x})\Vert q(\boldsymbol{x}))=&\,\frac{1}{2}\left[n\log 2\pi + \log \det(\boldsymbol{\Sigma}_q) + \text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p\right) + (\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)\right] \\ &\,\qquad- \frac{1}{2}\left[n\log 2\pi + \log \det(\boldsymbol{\Sigma}_p) + n\right]\\ =&\,\frac{1}{2}\left[(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{\mu}_p-\boldsymbol{\mu}_q)-\log \det(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p) + \text{Tr}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Sigma}_p\right) - n\right] \end{aligned}\\$$

### **巴氏距离**

然后，我们来看看**巴氏距离（Bhattacharyya distance）**，它定义为

BD(p(\boldsymbol{x}), q(\boldsymbol{x})) = -\log \int \sqrt{p(\boldsymbol{x}) q(\boldsymbol{x})} d\boldsymbol{x} \\

$$与之相关的还有一个叫做“**Hellinger距离**”的概念，它的平方定义为 \frac{1}{2}\int\left(\sqrt{p(\boldsymbol{x})} - \sqrt{q(\boldsymbol{x})}\right)^2 d\boldsymbol{x}，展开后就能发现跟巴氏距离本质是等价的。$$

#### **计算结果**

对于两个正态分布来说，它们的巴氏距离为

$$BD(p(\boldsymbol{x}), q(\boldsymbol{x})) = \frac{1}{2}\log \frac{\det(\boldsymbol{\Sigma})}{\sqrt{\det(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)}} + \frac{1}{8}(\boldsymbol{\mu}_p - \boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}^{-1}(\boldsymbol{\mu}_p - \boldsymbol{\mu}_q) \\$$

$$这里\boldsymbol{\Sigma}=\frac{1}{2}(\boldsymbol{\Sigma}_p + \boldsymbol{\Sigma}_q)。可以看到结果是对称的，这是因为巴氏距离的定义本身就是对称的。$$

当两者之一为标准正态分布时，结果并没有明显简化，所以这里就不单独写出来了。

#### **推导过程**

 $$按照定义，两个正态分布的巴氏距离，是下述积分的负对数： \begin{aligned} &\qquad\int \sqrt{p(\boldsymbol{x}) q(\boldsymbol{x})} d\boldsymbol{x}=\frac{1}{\sqrt[4]{(2\pi)^{2n}\det(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)}}\times \\ &\int \exp\left\{-\frac{1}{4}(\boldsymbol{x}-\boldsymbol{\mu}_p)^{\top}\boldsymbol{\Sigma}_p^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_p)-\frac{1}{4}(\boldsymbol{x}-\boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{x}-\boldsymbol{\mu}_q)\right\}d\boldsymbol{x} \end{aligned}\\ 记\boldsymbol{y}=\boldsymbol{x}-\boldsymbol{\mu}_p, \boldsymbol{\Delta}=\boldsymbol{\mu}_p - \boldsymbol{\mu}_q，积分部分可以换元为 \begin{aligned} &\int \exp\left\{-\frac{1}{4}\boldsymbol{y}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{y}-\frac{1}{4}(\boldsymbol{y}+\boldsymbol{\Delta})^{\top}\boldsymbol{\Sigma}_q^{-1}(\boldsymbol{y}+\boldsymbol{\Delta})\right\}d\boldsymbol{y}\\ =&\int \exp\left\{-\frac{1}{4}\boldsymbol{y}^{\top}\left(\boldsymbol{\Sigma}_p^{-1}+\boldsymbol{\Sigma}_q^{-1}\right)\boldsymbol{y}-\frac{1}{2}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}_q^{-1}\boldsymbol{y} - \frac{1}{4}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Delta}\right\}d\boldsymbol{y}\\ =&\int \exp\left\{-\frac{1}{2}\boldsymbol{y}^{\top}\left(\boldsymbol{\Sigma}_p^{-1}\boldsymbol{\Sigma}\boldsymbol{\Sigma}_q^{-1}\right)\boldsymbol{y}-\frac{1}{2}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}_q^{-1}\boldsymbol{y} - \frac{1}{4}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Delta}\right\}d\boldsymbol{y}\end{aligned}\\ 这里\boldsymbol{\Sigma}=\frac{1}{2}(\boldsymbol{\Sigma}_p + \boldsymbol{\Sigma}_q)。按照前面介绍的高斯积分公式\eqref{eq:g-int}，积分结果是 \begin{aligned} &\,\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma}_p^{-1}\boldsymbol{\Sigma}\boldsymbol{\Sigma}_q^{-1})^{-1}}\exp\left\{\frac{1}{8}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Delta}\right)^{\top}\left(\boldsymbol{\Sigma}_p^{-1}\boldsymbol{\Sigma}\boldsymbol{\Sigma}_q^{-1}\right)^{-1}\left(\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Delta}\right)-\frac{1}{4}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}_q^{-1}\boldsymbol{\Delta}\right\}\\ =&\,\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}^{-1}\boldsymbol{\Sigma}_p)}\exp\left\{\frac{1}{8}\boldsymbol{\Delta}^{\top}\left(\boldsymbol{\Sigma}^{-1}\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q^{-1} - 2\boldsymbol{\Sigma}_q^{-1}\right)\boldsymbol{\Delta}\right\}\\ =&\,\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}^{-1}\boldsymbol{\Sigma}_p)}\exp\left\{\frac{1}{8}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}^{-1}\left(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q^{-1} - 2\boldsymbol{\Sigma}\boldsymbol{\Sigma}_q^{-1}\right)\boldsymbol{\Delta}\right\}\\ =&\,\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}^{-1}\boldsymbol{\Sigma}_p)}\exp\left\{-\frac{1}{8}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{\Delta}\right\} \end{aligned}\\ 所以最终 \begin{aligned} BD(p(\boldsymbol{x}), q(\boldsymbol{x})) =&\, -\log \frac{\sqrt{(2\pi)^n \det(\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}^{-1}\boldsymbol{\Sigma}_p)}}{\sqrt[4]{(2\pi)^{2n}\det(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)}}\exp\left\{-\frac{1}{8}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{\Delta}\right\} \\ =&\, -\log \frac{\sqrt[4]{\det(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)}}{\sqrt{\det\left(\boldsymbol{\Sigma}\right)}}\exp\left\{-\frac{1}{8}\boldsymbol{\Delta}^{\top}\boldsymbol{\Sigma}^{-1}\boldsymbol{\Delta}\right\}\\ =&\,\frac{1}{2}\log \frac{\det(\boldsymbol{\Sigma})}{\sqrt{\det(\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)}} + \frac{1}{8}(\boldsymbol{\mu}_p - \boldsymbol{\mu}_q)^{\top}\boldsymbol{\Sigma}^{-1}(\boldsymbol{\mu}_p - \boldsymbol{\mu}_q) \end{aligned} \\$$

### **W距离**

如果读者还想看了解更多关于概率散度的内容，可以参考书籍**《Statistical Inference Based on Divergence Measures》**。现在我们转向另一类概率度量——基于最优传输的W距离（Wasserstein距离）。

沿用**《从Wasserstein距离、对偶理论到WGAN》**中的记号，W距离的定义如下：

$\mathcal{W}[p,q]=\inf_{\gamma\in \Pi[p,q]} \iint \gamma(\boldsymbol{x},\boldsymbol{y}) d(\boldsymbol{x},\boldsymbol{y}) d\boldsymbol{x}d\boldsymbol{y}=\inf_{\gamma\in \Pi[p,q]} \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})} [d(\boldsymbol{x},\boldsymbol{y})] \\$

不同的d(\boldsymbol{x},\boldsymbol{y})会得到不同的结果，为了得到较为简单的解，这里选择

d(\boldsymbol{x},\boldsymbol{y}) = \Vert \boldsymbol{x} - \boldsymbol{y}\Vert^2 \\

#### **计算结果**

有意思的是，关于两个正态分布的W距离的结果，流传着两个不同的版本，这两个版本都有一定的认知度，但却没有看到有明确说两者等价的资料。两个版本出自不同的论文，还被冠以了不同的名字。

#### **版本1**

首先第一个流传相对较广的版本（很多文献包括维基百科也使用这个版本）：

$\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \text{Tr}(\boldsymbol{\Sigma}_p) + \text{Tr}(\boldsymbol{\Sigma}_q) - 2\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{})\label{eq:w-v1}\\关于这个结果，有的读者可能困惑于“怎么关于p,q不是对称的”，事实上，它关于p,q是对称的，因为 \begin{aligned}\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{})=&\,\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-}\boldsymbol{\Sigma}_q^{-}\boldsymbol{\Sigma}_q^{}\boldsymbol{\Sigma}_p^{})\\ =&\,\text{Tr}(\boldsymbol{\Sigma}_q^{}\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-}\boldsymbol{\Sigma}_q^{-}) \end{aligned}\\$

$然后我们可以直接验证(\boldsymbol{\Sigma}_q^{}\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-}\boldsymbol{\Sigma}_q^{-})^2=\boldsymbol{\Sigma}_q^{}\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q^{}，所以有\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{})=\text{Tr}((\boldsymbol{\Sigma}_q^{}\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q^{})^{})。$

#### **版本2**

第二个看起来稍微简单一些的版本，结果是：

\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \text{Tr}(\boldsymbol{\Sigma}_p) + \text{Tr}(\boldsymbol{\Sigma}_q) - 2\text{Tr}((\boldsymbol{\Sigma}_p\boldsymbol{\Sigma}_q)^{})\label{eq:w-v2} \\

这个版本通常被称为“**Fréchet距离**”。GAN中经常使用的评价指标FID（**[Frechet Inception Distance](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1706.08500)**），就是基于这个公式进行计算的。可以模仿前面证明它关于p,q的对称性，当然也可以从下面的等价性讨论中直接得出。

#### **等价性**

事实上，证明两者的等价性并不难：

$\begin{aligned}\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{})=&\,\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-}\boldsymbol{\Sigma}_p^{})\\ =&\,\text{Tr}(\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-}) \end{aligned}\\$

$然后直接验证(\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{}\boldsymbol{\Sigma}_p^{-})^2=\boldsymbol{\Sigma}_p \boldsymbol{\Sigma}_q即可。$

#### **特殊时**

特别地，如果\boldsymbol{\Sigma}_p,\boldsymbol{\Sigma}_q的乘法可以交换，那么将会简化为非常直观的形式：

\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \Vert \boldsymbol{\Sigma}_p^{} - \boldsymbol{\Sigma}_q^{}\Vert_F^2\label{eq:w-jiaohuan} \\

为什么说它非常直观呢？因为正态分布的参数为\boldsymbol{\mu},\boldsymbol{\Sigma}，所以比较正态分布的差异其实就是比较\boldsymbol{\mu},\boldsymbol{\Sigma}的差异，按照机器学习的习惯，一个很容易相当想到的指标是平方误差

\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \Vert \boldsymbol{\Sigma}_p - \boldsymbol{\Sigma}_q\Vert_F^2 \\

但从物理角度来看，这个指标是不妥的，因为如果将\boldsymbol{\mu}看成是长度量纲，那么\boldsymbol{\Sigma}就具有长度平方的量纲，所以\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2和\Vert \boldsymbol{\Sigma}_p - \boldsymbol{\Sigma}_q\Vert_F^2是具有不同量纲的两个量，不能相加。而为了使得量纲一致，直观的想法就是把\boldsymbol{\Sigma}“开平方”后再算平方误差，这就得到了式\eqref{eq:w-jiaohuan}。

特别地，当q为标准正态分布时，结果简化为

\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p\Vert^2 + \Vert \boldsymbol{\Sigma}_p^{} - \boldsymbol{I}\Vert_F^2 \\

#### **推导过程1**

现在介绍第一个证明，主要参考了论文**《A class of Wasserstein metrics for probability distributions》**。另外**《The distance between two random vectors with given dispersion matrices》**也提供了一个类似的证明，也可以参考。

下面的推导过程则是经过笔者简化的，相对原论文的证明来说简单一些，但依然不可避免地会涉及到较多的线性代数知识，我们将分几个部分介绍。

#### **去均值**

不失一般性，我们可以只考虑均值为0的分布p,q。因为如果p,q的均值不为0，那么设对应的均值为0的分布为\tilde{p},\tilde{q}，此时有

$\begin{aligned} &\,\mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\Vert \boldsymbol{x} - \boldsymbol{y}\Vert^2\right] \\ =&\, \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\tilde{\gamma}(\boldsymbol{x},\boldsymbol{y})}\left[\Vert (\boldsymbol{x} + \boldsymbol{\mu}_p) - (\boldsymbol{y} +\boldsymbol{\mu}_q)\Vert^2  \right]\\ =&\,\mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\tilde{\gamma}(\boldsymbol{x},\boldsymbol{y})}\left[\Vert \boldsymbol{x} - \boldsymbol{y}\Vert^2 + \Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + 2\langle\boldsymbol{x} - \boldsymbol{y}, \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\rangle\right]\\ =&\,\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\tilde{\gamma}(\boldsymbol{x},\boldsymbol{y})}\left[\Vert \boldsymbol{x} - \boldsymbol{y}\Vert^2  \right] \end{aligned}\\$

该结果意味着

\mathcal{W}[p,q]=\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2 + \mathcal{W}[\tilde{p},\tilde{q}] \\

所以，只需要算出均值都为零时的Wasserstein距离，然后加上\Vert \boldsymbol{\mu}_p - \boldsymbol{\mu}_q\Vert^2就得到了一般情况的结果。

#### **纯代数**

现在我们假设p,q的均值均为0，然后计算

$\begin{aligned} \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\Vert \boldsymbol{x} - \boldsymbol{y}\Vert^2\right] =&\, \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\boldsymbol{x}^{\top} \boldsymbol{x} + \boldsymbol{y}^{\top} \boldsymbol{y} - 2\boldsymbol{y}^{\top} \boldsymbol{x}\right]\\ =&\, \mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\text{Tr}\left(\boldsymbol{x} \boldsymbol{x}^{\top} + \boldsymbol{y} \boldsymbol{y}^{\top} - 2\boldsymbol{x}\boldsymbol{y}^{\top} \right)\right]\\ =&\, \text{Tr}\left(\mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\boldsymbol{x} \boldsymbol{x}^{\top} + \boldsymbol{y} \boldsymbol{y}^{\top} - 2\boldsymbol{x}\boldsymbol{y}^{\top}\right]\right)\\ =&\, \text{Tr}(\boldsymbol{\Sigma}_p) + \text{Tr}(\boldsymbol{\Sigma}_q) - 2\text{Tr}(\boldsymbol{C}) \end{aligned}\\$

其中

$\boldsymbol{\Sigma}_{\gamma}= \begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{C}\\ \boldsymbol{C}^{\top} & \boldsymbol{\Sigma}_q\end{pmatrix}=\mathbb{E}_{(\boldsymbol{x},\boldsymbol{y})\sim\gamma(\boldsymbol{x},\boldsymbol{y})}\left[\begin{pmatrix}\boldsymbol{x} \\ \boldsymbol{y}\end{pmatrix}\begin{pmatrix}\boldsymbol{x}^{\top} & \boldsymbol{y}^{\top}\end{pmatrix}\right] \\$

$构成联合分布\gamma的协方差矩阵。我们知道协方差矩阵是正定对阵矩阵，所以从代数的角度看，问题变成了： 已知\boldsymbol{\Sigma}_{\gamma}= \begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{C}\\ \boldsymbol{C}^{\top} & \boldsymbol{\Sigma}_q\end{pmatrix}为正定对称矩阵，求\text{Tr}(\boldsymbol{C})的最大值。$

#### **舒尔补**

为此，我们需要利用下述关于“舒尔补”的恒等式：

$\begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{C}\\ \boldsymbol{C}^{\top} & \boldsymbol{\Sigma}_q\end{pmatrix} = \begin{pmatrix} \boldsymbol{I} & \boldsymbol{0}\\ \boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1} & \boldsymbol{I}\end{pmatrix} \begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{0}\\ \boldsymbol{0} & \boldsymbol{\Sigma}_q - \boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C}\end{pmatrix} \begin{pmatrix} \boldsymbol{I} & \boldsymbol{\Sigma}_p^{-1}\boldsymbol{C} \\ \boldsymbol{0} & \boldsymbol{I}\end{pmatrix} \\$

$其中对称矩阵\boldsymbol{S} = \boldsymbol{\Sigma}_q - \boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C}称为“**舒尔补（Schur Complement）**”，该分解具有\boldsymbol{B}^{\top}\boldsymbol{A}\boldsymbol{B}的形式，要想它是正定的，那么\boldsymbol{A}要是正定的，而\boldsymbol{\Sigma}_p已经是正定的，所以\boldsymbol{S}需要是正定的。$

#### **分参数**

$我们尝试分离参数，即从\boldsymbol{S} = \boldsymbol{\Sigma}_q - \boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C}中把\boldsymbol{C}解出来。首先移项得到\boldsymbol{\Sigma}_q - \boldsymbol{S} = \boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C}，由于\boldsymbol{\Sigma}_p是正定对称的，所以\boldsymbol{\Sigma}_p^{-1}也是，从而\boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C}也是正定对称的，那么它具有正定对称的平方根，即存在正定对称矩阵\boldsymbol{R}，使得$

$\boldsymbol{C}^{\top}\boldsymbol{\Sigma}_p^{-1}\boldsymbol{C} = \boldsymbol{R}^2\quad\Leftrightarrow\quad \left(\boldsymbol{\Sigma}_p^{-}\boldsymbol{C}\boldsymbol{R}^{-1}\right)^{\top}\left(\boldsymbol{\Sigma}_p^{-}\boldsymbol{C}\boldsymbol{R}^{-1}\right)=\boldsymbol{I} \\$

$这说明\boldsymbol{\Sigma}_p^{-}\boldsymbol{C}\boldsymbol{R}^{-1}是正交矩阵，记为\boldsymbol{O}，那么\boldsymbol{C} = \boldsymbol{\Sigma}_p^{}\boldsymbol{O}\boldsymbol{R}。$

#### **乘子法**

$此时，变量分别是\boldsymbol{O}和\boldsymbol{R}，求\text{Tr}(\boldsymbol{C})=\text{Tr}(\boldsymbol{\Sigma}_p^{}\boldsymbol{O}\boldsymbol{R})的最大值。我们先固定\boldsymbol{R}，求取最大值时的\boldsymbol{O}，此时相当于在\boldsymbol{O}^{\top}\boldsymbol{O}=\boldsymbol{I}的约束下，求\text{Tr}(\boldsymbol{\Sigma}_p^{}\boldsymbol{O}\boldsymbol{R})的最大值，我们用“**拉格朗日乘子法**”：引入新参数矩阵\boldsymbol{W}，转化为下述无约束极值问题$

$F = \text{Tr}(\boldsymbol{\Sigma}_p^{}\boldsymbol{O}\boldsymbol{R}) - \text{Tr}(\boldsymbol{W}(\boldsymbol{O}^{\top}\boldsymbol{O} - \boldsymbol{I})) \\$

求导：

$$\begin{aligned} &\frac{\partial F}{\partial \boldsymbol{O}} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{R}\boldsymbol{\Sigma}_p^{} = \boldsymbol{W}\boldsymbol{O}^{\top}\\ &\frac{\partial F}{\partial \boldsymbol{W}} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{O}^{\top}\boldsymbol{O} = \boldsymbol{I}\\ \end{aligned}\\$$

$首先留意到\boldsymbol{O}^{\top}\boldsymbol{O} - \boldsymbol{I}是对称的，因此对应的参数矩阵\boldsymbol{W}也是对称的，于是我们有：$

$\left(\boldsymbol{O}\boldsymbol{W}\boldsymbol{O}^{\top}\right)^2=\left(\boldsymbol{W}\boldsymbol{O}^{\top}\right)^{\top}\left(\boldsymbol{W}\boldsymbol{O}^{\top}\right)=\boldsymbol{\Sigma}_p^{}\boldsymbol{R}^2\boldsymbol{\Sigma}_p^{} \\$

$即\boldsymbol{O}\boldsymbol{W}\boldsymbol{O}^{\top}=(\boldsymbol{\Sigma}_p^{}\boldsymbol{R}^2\boldsymbol{\Sigma}_p^{})^{}，所以此时$

$\text{Tr}(\boldsymbol{\Sigma}_p^{}\boldsymbol{O}\boldsymbol{R})=\text{Tr}(\boldsymbol{O}\boldsymbol{R}\boldsymbol{\Sigma}_p^{})=\text{Tr}(\boldsymbol{O}\boldsymbol{W}\boldsymbol{O}^{\top})=\text{Tr}((\boldsymbol{\Sigma}_p^{}\boldsymbol{R}^2\boldsymbol{\Sigma}_p^{})^{}) \\$

#### **不等式**

最后需要把\boldsymbol{R}确定下来。回顾\boldsymbol{R}的定义，我们有\boldsymbol{R}^2=\boldsymbol{\Sigma}_q - \boldsymbol{S}，其中\boldsymbol{S}是正定矩阵。直觉上\boldsymbol{S}=\boldsymbol{0}时取得最大值，事实上也确实如此，这算是“**Weyl不等式**”的一个直接推论。

$根据Weyl不等式，如果矩阵\boldsymbol{A},\boldsymbol{B},\boldsymbol{A}+\boldsymbol{B}都是正定对称矩阵，它们的特征值从小到大排列分别为0\leq\lambda_1^{(A)} \leq \dots \leq \lambda_n^{(A)}、\lambda_1^{(B)} \leq \dots \leq \lambda_n^{(B)}和0\leq\lambda_1^{(A+B)} \leq \dots \leq \lambda_n^{(A+B)}，那么对于任意1\leq i \leq n，都有\lambda_i^{(A)}\leq \lambda_i^{(A+B)}和\lambda_i^{(B)}\leq \lambda_i^{(A+B)}，也就是说： 正定对称矩阵的和的特征值，一一对应地大于它们各自的特征值。$

有了这个结论，那就简单了，设\left(\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_q - \boldsymbol{S})\boldsymbol{\Sigma}_p^{}\right)^{}的特征值为0 \leq \lambda_1 \leq \dots \leq \lambda_n，那么它的迹就是\lambda_1 + \dots + \lambda_n，对应地，\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_q - \boldsymbol{S})\boldsymbol{\Sigma}_p^{}的特征值为0 \leq \lambda_1^2 \leq \dots \leq \lambda_n^2，注意\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_q - \boldsymbol{S})\boldsymbol{\Sigma}_p^{}是正定对称矩阵（对称是显然的，而因为它能开平方，所以正定），\boldsymbol{\Sigma}_p^{}\boldsymbol{S}\boldsymbol{\Sigma}_p^{}也是正定对称的（因为\boldsymbol{S}是正定对称的），所以它们的特征值，都不超过它们的和——也就是\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{}的特征值，所以说，\left(\boldsymbol{\Sigma}_p^{}(\boldsymbol{\Sigma}_q - \boldsymbol{S})\boldsymbol{\Sigma}_p^{}\right)^{}每个特征值的最大值（也就是迹的最大值），在\boldsymbol{S}=\boldsymbol{0}处取到。

至于Weyl不等式的证明，主要利用到了**Rayleigh quotient**和**Courant–Fischer定理**，有兴趣了解的读者自行查阅这两部分资料后，再查阅Wely不等式的证明就好。事实上，熟悉这两部分内容后，Weyl不等式基本上就“水到渠成”了。

#### **推导过程2**

这里继续介绍另一个更为简单的证明，原始证明可以在**《The Fréchet distance between multivariate normal distributions》**找到。相对而言该证明简单不少，尤其是不需要太多的纯线性代数知识。下面的推导过程依旧是经过笔者进一步简化的，比原始论文更好理解一些。

$在这个推导过程中，“去均值”、“纯代数”两个步骤跟“推导过程1”是一样的，不再重复。所以，此时问题已经被转化为 已知\boldsymbol{\Sigma}_{\gamma}= \begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{C}\\ \boldsymbol{C}^{\top} & \boldsymbol{\Sigma}_q\end{pmatrix}为正定对称矩阵，求\text{Tr}(\boldsymbol{C})的最大值。$

#### **分块阵**

$由于\boldsymbol{\Sigma}_{\gamma}是正定对称矩阵，所以它必然可以表达成\boldsymbol{D}\boldsymbol{D}^{\top}的形式，我们将\boldsymbol{D}表达为分块矩阵\begin{pmatrix}\boldsymbol{A} \\ \boldsymbol{B}\end{pmatrix}，其中\boldsymbol{A},\boldsymbol{B}\in \mathbb{R}^{n\times 2n}，此时$

$\begin{pmatrix} \boldsymbol{\Sigma}_p & \boldsymbol{C}\\ \boldsymbol{C}^{\top} & \boldsymbol{\Sigma}_q\end{pmatrix} = \begin{pmatrix}\boldsymbol{A} \\ \boldsymbol{B}\end{pmatrix} \begin{pmatrix}\boldsymbol{A}^{\top} & \boldsymbol{B}^{\top}\end{pmatrix} = \begin{pmatrix} \boldsymbol{A}\boldsymbol{A}^{\top} & \boldsymbol{A}\boldsymbol{B}^{\top}\\ \boldsymbol{B}\boldsymbol{A}^{\top} & \boldsymbol{B}\boldsymbol{B}^{\top}\end{pmatrix} \\$

$对应地有\boldsymbol{\Sigma}_p=\boldsymbol{A}\boldsymbol{A}^{\top}, \boldsymbol{\Sigma}_q=\boldsymbol{B}\boldsymbol{B}^{\top},\boldsymbol{C}=\boldsymbol{A}\boldsymbol{B}^{\top}。$

#### **乘子法**

$在上述参数化之下，问题转化为： 已知\boldsymbol{A}\boldsymbol{A}^{\top}=\boldsymbol{\Sigma}_p, \boldsymbol{B}\boldsymbol{B}^{\top}=\boldsymbol{\Sigma}_q，求\text{Tr}(\boldsymbol{A}\boldsymbol{B}^{\top})的最大值。$

这是一个带约束的最大值问题，我们用“**拉格朗日乘子法**”：引入新参数矩阵\boldsymbol{W}_p, \boldsymbol{W}_q，转化为下述无约束极值问题

$F = \text{Tr}(\boldsymbol{A}\boldsymbol{B}^{\top}) - \text{Tr}(\boldsymbol{W}_p(\boldsymbol{A}\boldsymbol{A}^{\top} - \boldsymbol{\Sigma}_p)) - \text{Tr}(\boldsymbol{W}_q(\boldsymbol{B}\boldsymbol{B}^{\top} - \boldsymbol{\Sigma}_q)) \\$

求导：

$$\begin{aligned} &\frac{\partial F}{\partial \boldsymbol{A}} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{B}^{\top} = \boldsymbol{A}^{\top}\boldsymbol{W}_p\\ &\frac{\partial F}{\partial \boldsymbol{B}} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{A}^{\top} = \boldsymbol{B}^{\top}\boldsymbol{W}_q\\ &\frac{\partial F}{\partial \boldsymbol{W}_p} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{A}\boldsymbol{A}^{\top} = \boldsymbol{\Sigma}_p\\ &\frac{\partial F}{\partial \boldsymbol{W}_q} = \boldsymbol{0} \quad \Rightarrow\quad \boldsymbol{B}\boldsymbol{B}^{\top} = \boldsymbol{\Sigma}_q\\ \end{aligned}\\$$

$注意到\boldsymbol{A}\boldsymbol{A}^{\top} - \boldsymbol{\Sigma}_p和\boldsymbol{B}\boldsymbol{B}^{\top} - \boldsymbol{\Sigma}_q都是对称的，所以对应的参数矩阵\boldsymbol{W}_p, \boldsymbol{W}_q也是对称的，此时$

$\boldsymbol{\Sigma}_q = \boldsymbol{B}\boldsymbol{B}^{\top} = \left(\boldsymbol{A}^{\top}\boldsymbol{W}_p\right)^{\top}\left(\boldsymbol{A}^{\top}\boldsymbol{W}_p\right)=\boldsymbol{W}_p\boldsymbol{A}\boldsymbol{A}^{\top}\boldsymbol{W}_p=\boldsymbol{W}_p\boldsymbol{\Sigma}_p\boldsymbol{W}_p\\ \\$

$令\boldsymbol{W}_p=\boldsymbol{\Sigma}_p^{-}\boldsymbol{R}\boldsymbol{\Sigma}_p^{-}，代入上式得\boldsymbol{\Sigma}_q=\boldsymbol{\Sigma}_p^{-}\boldsymbol{R}^2\boldsymbol{\Sigma}_p^{-}，即$

\boldsymbol{R} = (\boldsymbol{\Sigma}_p^{}\boldsymbol{\Sigma}_q\boldsymbol{\Sigma}_p^{})^{} \\

而

$\begin{aligned} \text{Tr}(\boldsymbol{A}\boldsymbol{B}^{\top}) =&\, \text{Tr}(\boldsymbol{A}\boldsymbol{A}^{\top}\boldsymbol{W}_p)=\text{Tr}(\boldsymbol{\Sigma}_p\boldsymbol{W}_p)\\ =&\,\text{Tr}(\boldsymbol{\Sigma}_p^{}\boldsymbol{R}\boldsymbol{\Sigma}_p^{-}) = \text{Tr}(\boldsymbol{R}\boldsymbol{\Sigma}_p^{-}\boldsymbol{\Sigma}_p^{})\\ =&\,\text{Tr}(\boldsymbol{R}) \end{aligned}\\$

### **文章小结**

本文详细计算了两个多元正态分布的KL散度、巴氏距离和W距离，给出了它们的显式解析解，这些结果在某些场景下可以作为隐变量的正则项使用，来规范隐变量的分布。此外，本文还可以作为比较有挑战性的线性代数练习题，供大家参考练习。
