---
title: "超强半监督学习 MixMatch"
date: "2019-05-21 00:00:00"
updated: "2019-05-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/机器学习/超强半监督学习-MixMatch/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/66281890"
---


人类的学习方法是半监督学习，他们能从大量的未标记数据和极少量的标记数据学习，迅速理解这个世界。半监督学习最近有没有什么大的突破呢？我的Twitter账号被这篇 《The Quiet Semi-Supervised Revolution》【1】博客刷屏了。这篇博客介绍了 DeepMind 的 MixMatch 【2】方法，此方法仅用少量的标记数据，就使半监督学习的预测精度逼近监督学习。深度学习领域的未来可能因此而刷新。

以前的半监督学习方案，一直以来表现其实都很差。你可能会想到 BERT 和 GPT，这两个超强的自然语言预训练模型。但这两个模型的微调只能算迁移学习，而非半监督学习。因为它们最开始训练的时候，使用了监督学习方法。比如通过语言模型，输入前言，预测后语；输入语境，完形填空；输入前言和后语，预测是否前言不搭后语。这几种方法，很难称作无监督学习。

下面这几种大家很容易想到的半监督学习方法，效果都不是很好。比如使用主成分分析PCA，提取数据中方差最大的特征，再在少量标记数据上，做监督学习；又比如使用自编码机 AutoEncoder，以重建输入图像的方式，获得数据潜在表示，对小数据监督学习；再比如使用生成对抗网络 GAN，以生成以假乱真图像的方式，获得数据潜在表示，对小数据做监督学习。半监督训练很久的精度，还比不上直接在小数据上做监督学习的精度！大家的猜测是，这些非监督方法学到的特征可能并不是分类器真正需要的特征。

什么才是半监督学习的正确打开方式呢？近期的一些半监督学习方法，通过在损失函数中添加与未标记数据相关的项，来鼓励模型举一反三，增加对陌生数据的泛化能力。

<strong>第一种方案是自洽正则化（Consistency Regularization）【3，4】</strong>。以前遇到标记数据太少，监督学习泛化能力差的时候，人们一般进行训练数据增广，比如对图像做随机平移，缩放，旋转，扭曲，剪切，改变亮度，饱和度，加噪声等。数据增广能产生无数的修改过的新图像，扩大训练数据集。<strong>自洽正则化的思路是，对未标记数据进行数据增广，产生的新数据输入分类器，预测结果应保持自洽。即同一个数据增广产生的样本，模型预测结果应保持一致。</strong>此规则被加入到损失函数中，有如下形式，

$** ‖p model (y| Augment (x);θ)−p model (y| Augment (x);θ)‖22" role="presentation">‖p model (y| Augment (x);θ)−p model (y| Augment (x);θ)‖22\| \mathrm{p}_{\text { model }}(y | \text { Augment }(x) ; \theta)-\mathrm{p}_{\text { model }}(y | \text { Augment }(x) ; \theta) \|_{2}^{2} $

其中 x 是未标记数据，Augment(x) 表示对x做随机增广产生的新数据， θ" role="presentation">θ\theta 是模型参数，y 是模型预测结果。注意数据增广是随机操作，两个 Augment(x) 的输出不同。这个 L2 损失项，约束机器学习模型，对同一个图像做增广得到的所有新图像，作出自洽的预测。

MixMatch 集成了自洽正则化。数据增广使用了对图像的随机左右翻转和剪切（Crop）。

第二种方案称作 最小化熵（Entropy Minimization）【5】。**许多半监督学习方法都基于一个共识，即分类器的分类边界不应该穿过边际分布的高密度区域。具体做法就是强迫分类器对未标记数据作出低熵预测。实现方法是在损失函数中简单的增加一项，最小化 \mathrm{p}_{\text { model }}(y | x) 对应的熵。

MixMatch 使用 "sharpening" 函数，最小化未标记数据的熵。这一部分后面会介绍。

<strong>第三种方案称作传统正则化（Traditional Regularization）。</strong>为了让模型泛化能力更好，一般的做法对模型参数做 L2 正则化，SGD下L2正则化等价于Weight Decay。MixMaxtch 使用了 Adam 优化器，而之前有篇文章发现 Adam 和 L2 正则化同时使用会有问题，因此 MixMatch 从谏如流使用了单独的Weight decay。

最近发明的一种数据增广方法叫 Mixup 【6】，从训练数据中任意抽样两个样本，构造混合样本和混合标签，作为新的增广数据，

$\begin{array}{ll}{\tilde{x}=\lambda x_{i}+(1-\lambda) x_{j},} & {\text { where } x_{i}, x_{j} \text { are raw input vectors }} \\ {\tilde{y}=\lambda y_{i}+(1-\lambda) y_{j},} & {\text { where } y_{i}, y_{j} \text { are one-hot label encodings }}\end{array} $

其中 \lambda 是一个 0 到 1 之间的正数，代表两个样本的混合比例。MixMatch 将 Mixup 同时用在了标记数据和未标记数据中。

### MixMatch 方案

MixMatch 偷学各派武功，取三家之长，补三家之短，最终成为天下第一高手 -- 最强半监督学习模型。这种 MixMatch 方法在小数据上做半监督学习的精度，远超其他同类模型。比如，在 CIFAR-10 数据集上，只用250个标签，他们就将误差减小了4倍（从38%降到11%）。在STL-10数据集上，将误差降低了两倍。 方法示意图如下，

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_b13dca197b1b.jpg)

MixMatch 实现方法：对无标签数据，做数据增广，得到 K 个新的数据。因为数据增广引入噪声，将这 K 个新的数据，输入到同一个分类器，得到不同的预测分类概率。MinMax 利用算法（Sharpen），使多个概率分布的平均（Average）方差更小，预测结果更加自洽，系统熵更小。注：Google原文并未比较 MixMatch 和使用生成对抗网络GAN做半监督学习时的表现孰好孰坏。但从搜索到的资料来看，2016年 OpenAI 的 Improved GAN 【8】，使用4000张CIFAR10的标记数据，做半监督学习得到测试误差18.6。2017年，GAN做半监督学习的测试误差，在4000张CIFAR10标记数据上，将测试误差降低到14.41 【10】。2018年，GAN + 流形正则化，得到测试误差14.45。目前并没有看到来自GAN的更好结果。对比 MixMatch 使用 250 张标记图片，就可以将测试误差降低到 11.08，使用4000张标记图片，可以将测试误差降低到  6.24，应该算是大幅度超越使用GAN做半监督学习的效果。

### 具体步骤：

$- 使用 MixMatch 算法，对一个 Batch 的标记数据 \mathcal{X} 和一个 Batch 的未标记数据 \mathcal{U}  做数据增广，分别得到一个 Batch 的增广数据  \mathcal{X}^{\prime} 和 K 个Batch的 \mathcal{U}^{\prime}  。$
 $\mathcal{X}^{\prime}, \mathcal{U}^{\prime} =\operatorname{MixMatch}(\mathcal{X}, \mathcal{U}, T, K, \alpha) $

其中 T， K， \alpha  是超参数，后面会介绍。MixMatch 数据增广算法如下，

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_70451a159ec5.jpg)

MixMatch 算法。<strong>算法描述：</strong>for 循环对一个Batch的标记图片和未标记图片做数据增广。对标记图片，只做一次增广，标签不变，记为 p 。对未标记数据，做 K 次随机增广（文章中超参数K=2），输入分类器，得到平均分类概率，应用温度Sharpen 算法（T 是温度参数，此算法后面介绍），得到未标记数据的“猜测”标签 q 。此时增广后的标记数据 \mathcal{\hat{X}} 有一个Batch，增广后的未标记数据 \mathcal{\hat{U}} 有 K 个Batch。将 \mathcal{\hat{X}} 和 \mathcal{\hat{U}} 混合在一起，随机重排得到数据集 \mathcal{W} 。最终 MixMatch 增广算法输出的，是将 \mathcal{\hat{X}} 与 \mathcal{W} 做了MixUp() 的一个 Batch 的标记数据 \mathcal{X'} ，以及 \mathcal{\hat{U}} 与 \mathcal{W} 做了MixUp() 的 K 个Batch 的无标记增广数据 \mathcal{U'} 。

## 2. 对增广后的标记数据 \mathcal{X'} ，和无标记增广数据 \mathcal{U'} 分别计算损失项，


$$### \begin{aligned} \mathcal{L}_{\mathcal{X}} &=\frac{1}{\left|\mathcal{X}^{\prime}\right|} \sum_{x, p \in \mathcal{X}^{\prime}} \mathrm{H}\left(p, \mathrm{p}_{\text { model }}(y | x ; \theta)\right) \\ \mathcal{L}_{\mathcal{U}} &=\frac{1}{L\left|\mathcal{U}^{\prime}\right|} \sum_{u, q \in \mathcal{U}^{\prime}}\left\|q-\mathrm{p}_{\text { model }}(y | u ; \theta)\right\|_{2}^{2} \\ \end{aligned} $$

$其中 \left|\mathcal{X}^{\prime}\right| 等于 Batch Size, \left|\mathcal{U}^{\prime}\right|等于 K 倍 Batch Size，L 是分类类别个数， H(p, p_{\rm model}) 是简单的 Cross Entropy 函数， x, p 是增广的标记数据输入和标签， u, q 是增广的未标记数据输入以及猜测的标签。$

对未标记数据损失 \mathcal{L_{U}} 使用 L2 Loss 而不是像 \mathcal{L_{X}} 一样使用 Cross Entropy Loss 的原因文章中没有提到。但在引用的NVIDIA文章【3】第三页提供了一个解释。即 L2 Loss 比 Cross Entropy Loss 更加严格。原因是 Cross Entropy 计算是需要先使用 Softmax 函数，将Dense Layer输出的类分数 z_i 转化为类概率，

$${\rm softmax} (z_i) = \frac{\exp(z_i)}{\sum_j \exp (z_j)} $$

而 softmax 函数对于常数叠加不敏感，即如果将最后一个 Dense Layer 的所有输出类分数 z_i 同时添加一个常数 c, 则类概率不发生改变，Cross Entropy Loss 不发生改变。

$${\rm softmax} (z_i + c) = \frac{\exp(z_i + c)}{\sum_j \exp (z_j + c)} = \frac{\exp(z_i )}{\sum_j \exp (z_j )} = {\rm softmax} (z_i ) $$

因此，如果对未标记数据使用 Cross Entropy Loss, 由同一张图片增广得到的两张新图片，最后一个Dense Layer的输出被允许相差一个常数。使用 L2 Loss, 约束更加严格。

## 3. 最终的整体损失函数是两者的加权，


$\mathcal{L} =\mathcal{L}_{\mathcal{X}}+\lambda_{\mathcal{U}} \mathcal{L}_{\mathcal{U}}  $

$其中 \lambda_{\mathcal{U}} 是非监督学习损失函数的加权因子，这个超参数的数值可调，文章使用 \lambda_{\mathcal{U}} = 100 。$

在上面的步骤描述中，还有另外两个超参数，温度 T 和 \alpha  。T 被用在 Sharpening 过程中， \alpha 是 Mixup 的超参数。下面分别解释这两个超参数的来历。

不是说未标记数据没标签吗？我们可以用分类器“猜测”一些标签。算法描述中的这一步，就是分类器对 K 次增广的无标签数据分类结果做平均，猜测的“伪”标签。对应示意图中 Average 分布。但这个平均预测分布比较平坦，就像在猫狗二分类中，分类器说，这张图片中 50% 几率是猫，50%几率是狗一样，对各类别分类概率预测比较平均。

$$\overline{q}_{b}=\frac{1}{K} \sum_{k} \mathrm{p}_{\mathrm{model}}\left(y | \hat{u}_{b, k} ; \theta\right) $$

MixMatch 使用了 Sharpen，来使得“伪”标签熵更低，即猫狗分类中，要么百分之九十多是猫，要么百分之九十多是狗。做法也是前人发明的，

$$\text { Sharpen }(p, T)_{i} :=p_{i}^{\frac{1}{T}} / \sum_{j=1}^{L} p_{j}^{\frac{1}{T}} $$

$其中， p 是类别概率，在 MixMatch 中对应 \overline{q}_{b} 。T 是温度参数，可以调节分类熵。调节 T 趋于0， \text { Sharpen }(p, T)_{i}  趋近于 One-Hot 分布，即对某一类别输出概率 1，其他所有类别输出概率0，此时分类熵最低。注： 熵 = - \sum_{i=1}^{c} p_i \log p_i , 可以计算得到，在二分类中，两个类的输出概率是One-Hot时 (p_0=1, p_1=0)  的熵远小于输出概率比较平均 (p_0=0.5, p_1=0.5)  的熵。在 MixMatch 中，降低温度T，可以鼓励模型作出低熵预测。$

最后一个尚未解释的超参数 \alpha 被用在 Mixup 数据增广中。与之前的 Mixup 方法不同，MixMatch方法将标记数据与未标记数据做了混合，进行 Mixup。对应算法描述中的混合与随机重排。

MixMatch 修改了 Mixup 算法。对于两个样本以及他们的标签 (x_1, p_1) 和 (x_2, p_2), 混合后的样本为，

$\begin{array}{l}{x^{\prime}=\lambda^{\prime} x_{1}+\left(1-\lambda^{\prime}\right) x_{2}} \\ {p^{\prime}=\lambda^{\prime} p_{1}+\left(1-\lambda^{\prime}\right) p_{2}}\end{array} $

其中，权重因子 \lambda' 使用超参数 \alpha 通过 Beta 函数抽样得到，

$\begin{aligned} \lambda & \sim \operatorname{Beta}(\alpha, \alpha) \\ \lambda^{\prime} &=\max (\lambda, 1-\lambda) \end{aligned} $

文章使用超参数 \alpha = 0.75 , 如果将此 Beta 分布画图表示，则如下图所示，

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_ffb90e6db0fe.jpg)

$权重因子的分布。根据此 Beta(0.75, 0.75) 分布抽样，大部分数值落在接近 0 或 1 的区域。原始的 Mixup 算法中，第一步不变，第二步 \lambda' = \lambda 。MixMatch 做了极小的修改，使用 \lambda^{\prime} =\max (\lambda, 1-\lambda) 。如上图所示，根据 {\rm Beta} (\alpha=0.75, \alpha=0.75) 抽样得到的 \lambda 数值大部分落在 0 或 1 附近， \lambda^{\prime} =\max (\lambda, 1-\lambda) 函数则使得 \lambda^{\prime}  数值接近 1 。这样的好处是在 Mixup 标记数据 \mathcal{\hat{X}} 与混合数据 \mathcal{W}时，增加 \mathcal{\hat{X}}的权重；在 Mixup 未标记数据 \mathcal{\hat{U}} 与 \mathcal{W}时，增加 \mathcal{\hat{U}}的权重。分别对应于算法描述中的{\rm Mixup}( \mathcal{\hat{X}},  \mathcal{W}) 和 {\rm Mixup}( \mathcal{\hat{U}},  \mathcal{W})。$

细节：损失函数中使用了对未标记数据猜测的标签 q , 此标签依赖于模型参数 \theta 。遵循标准处理方案，不将 q 对 \theta 的梯度做向后误差传递。

### 半监督学习 MixMatch 训练结果

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_686375e53b78.jpg)

在 CIFAR-10 数据集上，使用全部五万个数据做监督学习，最低误差能降到百分之4.13。使用 MixMatch，250 个数据就能将误差降到百分之11，4000 个数据就能将误差降到百分之 6.24。结果惊艳。
### 更直观的效果对比

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9e1f694831d6.jpg)

MixMatch 算法测试误差用黑色星号表示，监督学习算法用虚线表示。观察最底下，误差最小的两条线，可看到 MixMatch 测试误差直逼监督学习算法！
### 解剖各部分贡献 （Ablation Test ）

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_fec9921aeecd.jpg)

可以看到对结果贡献最大的是对未标记数据的 MixUp，Average 以及 Sharpen。 
### 结论：

半监督学习是深度学习里面最可能接近人类智能的方法。这个方向的进展，这篇文章的突破，都是领域的极大进展。因未在其他公众号看到这篇文章的介绍，特此作此解读。

另有一篇文章，[Unsupervised Data Augmentation](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1904.12848.pdf)，貌似在4000张标记图片的CIFAR10上达到了 5.27 的测试误差，超过了 MixMatch 方法。如有时间，会进一步解读那篇文章。以观察两篇文章的方法是否可以一同使用。

### 参考文献：

- The Quiet Semi-Supervised Revolution 
- [MixMatch: A Holistic Approach to Semi-Supervised Learning](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1905.02249.pdf) 
- [Temporal ensembling for semi-supervised learning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1610.02242). ICLR, 2017.
- [Regularization with stochastic transformations and perturbations for deep semi-supervised learning](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1606.04586.pdf). NIPS, 2016. 
- Semi-supervised Learning by Entropy Minimization 
- [Mixup: Beyond empirical risk minimization](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1710.09412.pdf) 
- [Realistic Evaluation of Deep Semi-Supervised Learning Algorithms](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1804.09170.pdf) 
- Improved Techniques for Training GANs ,OpenAI 2016, get 18.6 test error using 4000 labeled images in CIFAR10.
- [SEMI-SUPERVISED LEARNING WITH GANS: REVISITING MANIFOLD REGULARIZATION](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1805.08957.pdf) , 2018, GAN + Manifold Regularization, get 14.45 test error using 4000 labeled images in CIFAR10.
- Good Semi-supervised Learning That Requires a Bad GAN , 2017, get 14.41 test error using 4000 labeled images in CIFAR10.
- [free online book] Semi Supervised Learning
