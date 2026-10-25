---
title: 一文读懂VAE的底层逻辑
date: "2024-03-17 00:00:00"
updated: "2024-03-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/一文读懂VAE的底层逻辑/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/686158547
---


跟之前一样，还是录了一个视频版讲解，比文章中讲的会更细致一点，包括加入了VAE和latent diffusion之间异同的思考，大家有兴趣的可以看一下，一个视频看懂VAE的原理以及关于latent diffusion的思考_哔哩哔哩_bilibili

### 一、前言

VAE虽然是2013年提出的生成模型，但是它的原理可以说和GAN、扩散模型比更加复杂，因为里面牵扯了比较多的统计推断的知识。我之前浏览了很多网上的博客，有的讲述逻辑比较乱，有的更是难以自恰，这篇文章将以顺序的逻辑来推导VAE究竟为什么要这么设计，并给出简单的数学证明。

### 二、问题解析

首先，对于生成模型来说，一般都需要一个先验概率 p(z)" role="presentation">p(z)p(z) ，其中 z" role="presentation">zz  为隐空间向量（latent space vector）。我们一般假设数据（e.g. 图像）都是从一个无法观测的隐空间点，通过一系列随机过程生成的。因此，图像生成的过程，我们一般会理解成，随机在latent space中采样一个sample点 zi" role="presentation">ziz_i ，然后通过某个条件分布 p(x|z)" role="presentation">p(x|z)p(x|z)  ，得到我们想要的图像 xi" role="presentation">xix_i 。一般来说，这个先验概率 p(z)" role="presentation">p(z)p(z) 我们是不知道的，但是在大部分主流生成模型中（如VAE、GAN、扩散模型），我们都将其假设成了性质最好的标准正态分布。

那么现在可能有人说了，那还不简单吗，我们直接训练一个解码器，从标准正态分布中抽取一个 zi" role="presentation">ziz_i ，然后解码，得到 xi&#x005E;" role="presentation">xi^\hat{x_i} ，再去和数据集中的 xi" role="presentation">xix_i 计算重构损失，反向传播优化解码器，不就好了吗？这其实是一个最平凡的想法，但是这里面有一个核心的问题，就是我们不知道对于我们数据集中的 xi" role="presentation">xix_i 这个图像，它对应在隐空间中的隐向量到底是不是我们取出来的这一个zi" role="presentation">ziz_i，如果不是，我们就不能去计算重构损失，因为我们取出来的 z" role="presentation">zz 和 xi" role="presentation">xix_i 可能根本就不对应。

那我们不如再换个角度想问题，就是给定 xi" role="presentation">xix_i ， z" role="presentation">zz 的分布会是什么样子？这个分布可以表示为 p(z|x=xi)" role="presentation">p(z|x=xi)p(z|x=x_i) 。换句话说，如果我们可以求得这个后验分布，再从这个分布里采样得到的 z_i 大概率就是 x_i 对应的 z 。然后经过解码得到的 \hat{x_i} 就可以放心地和 x_i 去计算重构误差从而优化解码器了。

首先，后验概率可以写作：

$$p(z|x)=\displaystyle\frac{p(x|z)p(z)}{p(x)} $$

其中，边界似然 p(x)=\int p(x|z)p(z)dz ，而这个积分是一个高维infinite summation，因此是intractable（很难求出闭式解，closed-form solutions）。因此我们无法使用EM算法。那么我们改怎么求呢？

### 三、变分贝叶斯

维基百科上提到，变分贝叶斯方法的使用目的主要是两个：

> *1. To provide an analytical approximation to the posterior probability of the unobserved variables, in order to do statistical inference over these variables.*
*2. To derive a lower bound for the marginal likelihood of the observed data. This is typically used for performing model selection, the general idea being that a higher marginal likelihood for a given model indicates a better fit of the data by that model and hence a greater probability that the model in question was the one that generated the data.*

大白话翻译到VAE里就是，1. 提供了一个关于 z 的后验概率近似分布以进行一些统计推断，2. 为图像 x 的边界似然提供一个下界，从而进行模型选择，背后的逻辑就是一个模型带来更高的边界似然，说明这个模型对我们的数据拟合的更好，说明我们大概率选的这个模型是对的 i.e. 就是生成这批数据的模型。

我们刚才说了， z 的后验概率是intractable的，那么变分贝叶斯方法正好解决了这个问题，因为他的关注点不再是真实后验概率，而是提供了一个后验概率的近似分布 q_{\phi}(z|x) ，而上面说的第二点，也恰好通过最大边界似然的方法，帮忙找到了最优的 p(x|z)。一举两得！因此变分贝叶斯看起来就是我们正在寻找的解决办法。

$因此，我们首先设 q_{\phi}(z|x) 为真实后验概率 p_{\theta}(z|x) 的近似，且规定q_{\phi}(z|x) 来自正态分布族，即$

$q_{\phi}(z|x)\sim N(\mu, \sigma^2) $

$我们希望 q_{\phi}(z|x) 与 p_{\theta}(z|x) 越接近越好，因此，我们用KL散度作为两个分布间相似度的度量方法，我们希望最小化 KL(q_{\phi}(z|x)||p_{\theta}(z|x)) $

进行如下推导

$$\begin{array}{rl} KL(q_{\phi}(z|x)||p_{\theta}(z|x))&=\displaystyle\int q_{\phi}(z|x)\log\frac{ q_{\phi}(z|x)}{p_{\theta}(z|x)}dz\\ &=\displaystyle\int q_{\phi}(z|x)\log q_{\phi}(z|x)dz-\int q_{\phi}(z|x)\log p_{\theta}(z|x)dz\\ &=\mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x)]-\int q_{\phi}(z|x)\log p_{\theta}(z,x)dz+\int q_{\phi}(z|x)\log p_{\theta}(x)dz\\ &=\mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x)]-\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(z,x)]+\mathbb{E}_{q_{\phi}(z|x)}\log p_{\theta}(x)\\ &=-ELBO+\log p_{\theta}(x)\\ \end{array} $$

$如上所示，其中 \mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x)]-\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(z,x)] 为 -ELBO  ，即Evidence Lower Bound。为什么叫做lower bound呢？我们不妨将上式移项，化为：$

$\log p(x) = KL(q_{\phi}(z|x)||p_{\theta}(z|x))+ELBO $

由KL散度的非负性可知， \log p_{\theta}(x) 的下界为ELBO。我们可以将问题转换为最大ELBO。那么有人可能会问，KL散度不管了吗？主要是因为他里面有 p_{\theta}(z|x) ，是intractable的，我们正是要避开这个后验概率，才使用的变分贝叶斯，通过最大化ELBO来隐式的最小化KL散度

### 四、训练过程

已知对于数据集中的N个数据来说，

$\log p_{\theta}(x)=\sum\limits_{i=1}^{N}\log p_{\theta}(x_i) $

于是为了方便讲解，我们只关注单个 x_i  。上面说了，我们的目标就是最大ELBO，且ELBO可以进行如下变化

$$\begin{array}{rl} -\mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x_i)]+\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(z,x_i)]&=-\mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x_i)]+\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(z)p_{\theta}(x_i|z)]\\ &=-\mathbb{E}_{q_{\phi}(z|x)}[\log q_{\phi}(z|x_i)]+\mathbb{E}_{q_{\phi}(z|x)}[\log p(z)]+\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(x_i|z)]\\ &=-KL(q_{\phi}(z|x_i)||p(z))+\mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(x_i|z)] \end{array} $$

$于是乎，我们的目标函数就化为了两项，1. 最小化 KL(q_{\phi}(z|x_i)||p(z)) ，2. 最大化 \mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(x_i|z)] ，我们的训练过程就呼之欲出。$

由于我们假设了 p(z) 是标准正态分布，而 q_{\phi}(z|x_i) 即是通过神经网络的encoder学来。于是在训练时，encoder先将输入图像进行编码，目的是为了预测一个分布，而由于我们在上一节中说了，q_{\phi}(z|x_i) 来自正态分布，因为我们只需要预测正态分布的两个参数 \mu,\sigma 即可。得到 \mu,\sigma 后，我们便得到了高斯分布 N(\mu,\sigma^2) ，于是，我们可以从中随机抽样得到 z_i ，再通过decoder进行重构图像。注意，这里为什么要每次都随机抽样而不是得到固定的 z_i ，原因是目标函数的第二项最大化的不是 \log p_{\theta}(x_i|z) ，而是期望值 \mathbb{E}_{q_{\phi}(z|x)}[\log p_{\theta}(x_i|z)] 。同时，不断地抽样不同的 z_i ，也可以当作一种数据增强，来提高解码器的鲁棒性。

损失函数的话，重构用的是常用的L1/L2损失，而KL散度的损失函数可以化简为下式：

$$\displaystyle\frac{1}{2}\sum\limits_{j=1}^J (1+\log((\sigma_j)^2)-(\mu_j)^2-(\sigma_j)^2) $$

原论文的appendix有推导，不做赘述。

### 五、推理过程

最后一个问题，推理的时候怎么做。由于我们假设了 p(z) 为标准正态分布，因此我们在使用VAE生成图像时，只需要在标准正态分布中采样一个样本点，送入解码器，就能够得到一张新的图像。

这里面其实有一点可能会给大家造成困惑，就是我们在训练过程中，我们一直在最小化KL散度KL(q_{\phi}(z|x_i)||p(z)) ，那是不是说明 q_{\phi}(z|x_i) 到最后都趋近于标准正态分布呢？并不是的，我在另一篇外文博客中看到了一幅分布图，可以很清晰的解释这个问题

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_ce40f490d3c3.jpg)

这个图上不同10种不同的颜色代表的是MNIST数据中10个不同的数字对应的隐空间分布。首先，左图是只使用了重构loss，其实就是传统的AutoEncoder（AE），可以看到，整体分布没有规律，很难进行抽样生成新图像。中间的图是只使用了KL散度，当训练较好的前提下，每个数字对应的隐空间分布均近似为标准正态分布。而右图才是VAE的隐空间分布，可以看到，由于有了重构loss的加入，不同颜色在整体空间分布上已经有了区域性划分，这说明重构图像需要学到不同数字的不同特征，这些特征可能造成了不同数字的隐空间分布的区域差异性，但有了KL散度作为loss，又使得隐空间分布的整体趋向于标准正态分布，方便后续采样生成新的图像。
