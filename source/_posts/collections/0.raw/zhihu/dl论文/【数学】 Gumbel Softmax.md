---
title: "【数学】 Gumbel Softmax"
date: 2020-03-23
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/115386452

---

原文传送门
ICLR 2017：[Jang, Eric, Shixiang Gu, and Ben Poole. &#34;Categorical reparameterization with gumbel-softmax.&#34; arXiv preprint arXiv:1611.01144 (2016).](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1611.01144.pdf%2520http%3A//arxiv.org/abs/1611.01144.pdf)

特色
对于离散变量，最常用的分布就是 categorical 分布，这种分布下需要用 reparameterization trick 来求导的话，就需要用到 Gumbel Softmax 这种方法。在离散版本的 soft actor critic 的实现中需要使用到这种功能技术。

过程

1、Reparameterization Trick
深度学习里面经常会使用神经网络 A 生成一个概率分布，这个分布一般是事先规定好的，神经网络只需要生成这个分布的 statistical parameter D 即可，接下来会从这个概率分布里面采样得到一个样本 S，然后再把这个样本输入到后续的神经网络 B 里面处理，并且计算得到一个可导的损失函数 L。但是由于这个采样步骤的存在，没有办法做到 end-to-end 的训练。我们可以得到 L 关于 S 的导数，也可以得到 D 关于 A 参数的导数；但是一般来说无法得到 S 关于 D 的导数。要得到 S 关于 D 的导数就需要我们使用 reparameterization trick。

![](https://pic3.zhimg.com/v2-f8b64d40a8be7f2af833e64a87074cb4_r.jpg)这里的 f 相当于神经网络 B，z 是采集得到的样本 S，theta 相当于神经网络 A 的参数。这里第一个等式相当于把样本 z 写作了一个固定分布采样得到的样本 epsilon 和与参数有关的函数。对于高斯分布来说 
![](https://www.zhihu.com/equation?tex=%5Cepsilon+%5Csim+%5Cmathcal%7BN%7D%280%2C1%29) ， 
![](https://www.zhihu.com/equation?tex=g%28%5Ctheta%2C+%5Cepsilon%29+%3D+%5Cmu_%5Ctheta+%2B+%5Csigma_%5Ctheta+%5Ccdot+%5Cepsilon) 。

2、使用 Gumbel-Max Trick 实现样本对于 Statistical Parameter 的求导
可以使用 Gumbel-Max trick 从一个 categorical distribution 中采样，给定每个类的采样概率 
![](https://www.zhihu.com/equation?tex=%5Cpi_1%2C+%5Ccdots%2C+%5Cpi_k) ，采集的样本可以表示为

![](https://picx.zhimg.com/v2-b6ddf5b55994441ff234e88dad3d8eb1_r.jpg)其中 
![](https://www.zhihu.com/equation?tex=g_i) 是从 Gumbel(0,1) 分布中采集的样本。注意到一个样本表示为一个 k 维的 one-hot 向量。Gumbel(0,1) 的 PDF 函数定义如下

![](https://pic2.zhimg.com/v2-0799d44105998a2b11008c9f60e4cff9_r.jpg)Gumbel(0,1) 的生成方法如下

![](https://pic2.zhimg.com/v2-e5db5407aaaab8eb05dadd0c40b6babb_r.jpg)为了使得样本能够对于 statistical parameter 的求导，还需要解决掉其中不可求到的 arg max 部分。这里使用 softmax 来代替 one_hot(arg max (·))，这样采集的样本可以写作

![](https://pic2.zhimg.com/v2-f830bf412425fff4b85c4c44f158fafd_r.jpg)其中 
![](https://www.zhihu.com/equation?tex=%5Ctau) 是温度参数。如下图所示，它越小温度越低，采样的期望更接近 arg max 的结果，并且采样得到的样本也更接近 one-hot 向量，但是其对应的 gradient estimator 的方差也越大哦；它越大代表更高的温度，采样的期望则更平均，而且采样得到的期望也更不 one-hot，但是其对应的 gradient estimator 的方差会比较小。

![](https://picx.zhimg.com/v2-90f75140056af9a6c34ba20fc29a4b19_r.jpg)在实际应用中为了平衡这个 trade-off，一般可以在训练过程中逐步减小温度；当然也可以把它作为一个参数来学习。

3、相关工作
考虑这样一个问题，有一个损失函数

![](https://pic3.zhimg.com/v2-38f5c4498df1d11d0b8a9b19539e09a2_1440w.png)希望求到它对于参数 theta 的导数

![](https://pica.zhimg.com/v2-8068fa5668e03420cfd5c337575041e0_1440w.png)该问题有如下的做法。第一张图表示，如果没有采样的过程，那么可以直接求导。在第二张图中有了一个采样的过程，因此求导无法从样本到分布上。第三张图表示 score function estimator，其方法类似于 REINFOCE。该方法可以表示为

![](https://pic1.zhimg.com/v2-95d358e7bd5da116caac5d2a66de7d56_r.jpg)该方法甚至可以不要求 f 可以求导，直接把 f 的数值作为权重来产生一个无偏估计。该方法的缺点是 variance 大，图片下方括号中给出了在此基础上的一系列降低 variance 的方法。第四张图表示 Straight-Through（ST）方法，即直接认为 z 关于 statistical parameter 的导数为 1，这种功能方法只能适用于 Bernoulli 分布（或者 categorical 分布），因为不难看出，这里至少要求分布的 statistical parameter 的维度和样本 z 的维度相同。最后一张图表示本文中使用的一类方法叫做 path derivative estimator 或者 reparametrization trick。其主要思想是把随机采样这个步骤放到梯度回传的路径之外。

![](https://pic4.zhimg.com/v2-9dbf6f439854485009fb9dc8971d93ef_r.jpg)