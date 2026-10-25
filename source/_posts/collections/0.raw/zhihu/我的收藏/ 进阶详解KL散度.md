---
title: (1 条消息) 进阶详解KL散度
date: "2022-07-26 00:00:00"
updated: "2022-07-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/进阶详解KL散度/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/372835186
---


#### 　　1、KL散度的概念

　　KL散度（Kullback-Leibler Divergence）一般用于度量两个概率分布函数之间的“距离”，其定义如下（参考文献[2]、[4]）：

$$KL[P(X)||Q(X)]=&#x2211;x&#x2208;X[P(x)logP(x)Q(x)]=Ex&#x223C;P(x)[logP(x)Q(x)]" role="presentation">KL[P(X)||Q(X)]=∑x∈X[P(x)logP(x)Q(x)]=Ex∼P(x)[logP(x)Q(x)]KL\left[ P\left( X \right)  || Q \left( X \right) \right] = \sum_{x\in X}{\left[ P\left( x \right)log\frac{P\left( x \right)}{Q\left( x \right)} \right]} = E_{x\sim P\left( x \right)}\left[ log\frac{P\left( x \right)}{Q\left( x \right)} \right]$$

　　由于KL散度的计算公式中对 x" role="presentation">xx 进行了积分（连续型随机变量）或求和（离散型随机变量），因此KL与 x" role="presentation">xx 的某个具体取值无关，因此也可以记为 KL[P||Q]" role="presentation">KL[P||Q]KL\left[ P || Q \right] ，本文后面为了便于读者理解会混用这两种表示。

　　$注意到KL散度的定义中 KL[P(X)||Q(X)]" role="presentation">KL[P(X)||Q(X)]KL\left[ P\left( X \right)  || Q \left( X \right) \right] 关于 P(X)" role="presentation">P(X)P\left( X \right) 、 Q(X)" role="presentation">Q(X)Q\left( X \right) 并不对称。根据公式，KL散度不满足对称性，即： KL[P(X)||Q(X)]&#x2260;KL[Q(X)||P(X)]" role="presentation">KL[P(X)||Q(X)]≠KL[Q(X)||P(X)]KL\left[ P\left( X \right)  || Q \left( X \right) \right] \ne KL\left[ Q \left( X \right)  || P \left( X \right) \right] ，因此，KL散度显然不是数学意义上的“度量”。$

　　KL散度的典型应用场景如下：假设某优化问题中, P(X)" role="presentation">P(X)P\left( X \right) 是真实分布（true distribution）， Q(X)" role="presentation">Q(X)Q\left( X \right) 是一个用于拟合 P(X)" role="presentation">P(X)P\left( X \right) 的近似分布（approximate distribution），我们尝试通过修改 Q(X)" role="presentation">Q(X)Q\left( X \right) 使得二者间的KL[P(X)||Q(X)]" role="presentation">KL[P(X)||Q(X)]KL\left[ P\left( X \right)  || Q \left( X \right) \right] 尽可能小来实现用 Q(X)" role="presentation">Q(X)Q\left( X \right) 拟合 P(X)" role="presentation">P(X)P\left( X \right) ，如下图所示（参考文献[4]）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c871b04d7f50.jpg)

　　在上面的概率拟合应用场景下， KL\left[ P\left( X \right)  || Q \left( X \right) \right] 也被称为<strong>前向KL散度</strong>（forward Kullback-Leibler Divergence），将 KL\left[ Q \left( X \right)  || P \left( X \right) \right] 称为<strong>反向KL散度</strong>（reverse Kullback-Leibler Divergence）。

　　这里需要注意的是，只有在概率拟合的应用场景下（也就是确定了真实分布和拟合分布两个角色之后），前向KL散度 KL\left[ P || Q \right] 和反向KL散度 KL\left[ Q || P \right] 的定义才是有意义的，否则二者只是相同公式改变正负号、并交换 P 和 Q 符号表示之后的平凡结果。

### 　　2、两类KL散度拟合效果的定性分析

<strong>极小化前向KL代价下的拟合行为特性：寻找均值（Mean-Seeking Behaviour）</strong>

　　前向KL的计算式中， P\left( x \right) 和 Q\left( x \right) 在每个样本点 x 上的差异程度被 P\left( x \right) 加权平均，我们基于此对前向KL的特性进行分析。

　　$考虑随机变量 X 的子集 X_{0}=\left\{ x|P\left( x \right)=0 \right\} ，由于 P\left( x \right) 是前向KL公式中的权重系数，因此 X_{0} 中的元素实际上对前向KL的值没有任何影响。换言之，对任意 x\in X_{0} ，无论 P\left( x_{0} \right) 与 Q\left( x_{0} \right) 相差多大都对前向KL的计算结果毫无影响，因此前向KL值不受 Q\left( x \right) 在子集 \left\{ x|P\left( x \right)=0 \right\} 上取值的影响。在极小化前向KL散度的过程中，每当 P\left( x \right)=0 时， Q\left( x \right) 就会被无视。从连续性角度推理，最小化前向KL散度倾向于忽视“ Q\left( x \right) 在满足 P\left( x \right) 近似为0的随机变量取值集合上的拟合精度”，而去更努力的实现“ Q\left( x \right) 在满足 0">P\left( x \right)>0的随机变量取值集合上的拟合精度”。上述分析结论总结如下（参考文献[4]）：$

***Wherever *P\left( \cdot \right) *has high probability, *Q\left( \cdot \right) *must also have high probability.*　　下图展示了使用前向KL散度代价拟合一个多峰（实际上是双峰）分布的效果示意图（参考文献[4]）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5e7e22960f58.jpg)

图中绿色曲线代表拟合分布Q，蓝色曲线是目标分布P　　前向KL散度的这种特性一般也被称为 *zero avoiding***，原因是它倾向于避免在任何 0">P\left( x \right)>0 的位置 x 使得 Q\left( x \right)=0 （参考文献[4]）。

<strong>极小化反向KL代价下的拟合行为特性：搜寻模态（Mode-Seeking Behaviour）</strong>

　　在反向KL中，差异加权求和时的权重系数是 Q\left( x \right) 。此时， P\left( x \right) 在子集 \left\{ x|Q\left( x \right)=0 \right\} 的取值不影响反向KL值的计算，而当 0">Q\left( x \right)>0 时， Q\left( x \right) 与 P\left( x \right) 的差异需要尽可能小以使得反向KL值尽可能小。上述分析结论总结如下（参考文献[4]）：

***Wherever *Q\left( \cdot \right)* has high probability, *P\left( \cdot \right)* must also have high probability.*　　下图展示了使用前向反向KL散度代价拟合一个多峰（实际是双峰）分布的效果示意图（参考文献[4]）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_693c42ca1db8.jpg)

图中绿色曲线代表拟合分布Q，蓝色曲线是目标分布P　　关于在前向KL拟合特性分析中，为什么说当 P\left( x \right) 近似为0时，无论 Q\left( x \right) 的取值如何（即使绝对值非常大）,一般都不会对前向KL散度计算产生影响的原因定性的论述如下。

　　首先，如果当 P\left( x \right)\rightarrow 0 时，Q\left( x \right) 并不趋近于0，用数学语言可以描述为：存在一个 0">\varepsilon>0 ,有 \varepsilon">Q\left( x \right)>\varepsilon ）。那么这时一定有

\left| P\left( x \right) log\left( Q\left( x \right) \right) \right| 

　　这说明，当概率分布Q\left( x \right) 有下大于0的下界（注意：由于 Q 是概率分布，所以 Q\left( x \right) 取值本就一定在 \left[ 0, 1 \right] 上）时， P\left( x \right) log\left( Q\left( x \right) \right) 在P\left( x \right) 近似为0时实际可忽略的。

　　其次，考虑如果 Q\left( x \right) 也趋向于０，也就是 \left| log \ Q\left( x \right) \right| \rightarrow \infty 时， P\left( x \right) log\left( Q\left( x \right) \right)的极限是否还是0？具体是如下问题：假设当 P\rightarrow0 时，也有 Q\rightarrow0 ，且二者趋于0的“速度”是相近的，求 P\left( x \right) log\left( Q\left( x \right) \right) 的极限。不妨将该问题按如下方法求解：

$$\lim_{x \rightarrow 0}{xlnx}=\lim_{n \rightarrow \infty}{\frac{1}{n}ln\frac{1}{n}}=-\lim_{n \rightarrow \infty}{\frac{ln\ n}{n}}=0 $$

　　上面的定性证明过程中的第一个等号左边的表达式，其实也可以使用洛必达法则（L'Hospital's rule）求解。该证明的意义在于说明：若 P log\ Q 中的 P 和 Q 以近似相同的速度趋向于0，则 P log\ Q 也会趋向于0。这背后隐含的意义是：只要 P\left( x \right) 在 x 处接近于0，那么 Q\left( x \right) 无论取何值（这里的“无论”是指 Q 有大于0的下界或至多是 P 的等价无穷小量），那么P\left( x \right) log\left( Q\left( x \right) \right)就是可忽略的。这也就定性的证明，在拟合中 Q 在在 P\left( x \right) 中接近于0的那部分自变量集合上花费精力基本是无意义的，因此拟合结果 Q 会表现为倾向于拟合 0">P>0 的那些区域。

　　其他示例**

　　前向KL和反向KL拟合效果的二维多峰（实际上是双峰 P ）分布情况示例（参考文献[1]）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_51f9646c9125.jpg)

图中蓝色等值线表示目标分布P，红色等值线代表拟合结果Q　　上面图中蓝色的轮廓线代表一个有两个高斯分布组成双峰分布 P\left(X \right) ，红色的轮廓线是使用单一高斯分布在最小化KL散度意义下对 P\left( X \right) 进行拟合得到的最佳结果。其中图(a)是拟合代价选择前向KL散度 KL\left( P||Q \right) 时的拟合效果，图(b)时拟合代价选择反向KL散度 KL\left( Q||P \right) 时的拟合效果，图(c)和图(b)使用相同的代价但展示的是到达反向KL散度代价的另外一个局部极小值点的效果。

###         3、两类KL散度拟合效果的数学推导

　　$考虑到需要用人工设计的近似分布 Q_{\theta}\left( X \right) 来拟合真实分布 P\left( X \right) ，这里下标 \theta 强调 Q 是一个受到参数 \theta 控制的分布。例如： Q 是正态分布 N\left( \mu, \sigma^{2} \right) ， P 是正态分布 N\left( \mu_{0}, \sigma_{0}^{2} \right) ，现在希望用 Q 来拟合 P ，其中 Q 的均值和方差 \left\{ \mu, \sigma^{2} \right\} 就是拟合过程中可以调整的参数 \theta 。于是基于前向KL和反向KL代价的分布拟合问题分别转化为以下两个优化问题（参考文献[4]）：$

$<strong>命题1</strong>. 极小化前向KL：\arg min_{\theta} KL\left( P||Q_{\theta} \right) 等价于对参数 \theta 的极大似然估计。$

$<strong>命题2</strong>. 极小化反向KL： \arg min_{\theta} KL\left( Q_{\theta}||P \right) 相当于在要求 Q_{\theta} 在拟合 P 的同时尽可能保持单一模态。$

　　首先，<strong>证明命题一</strong>，过程如下：

$arg\ min_{\theta} \ KL\left( P|| Q \right) $

 $= arg\ min_{\theta}\left( E_{X\sim P} \left[ -log \ Q_{\theta} \left( X \right) \right] \right) + H\left( P\left( X \right) \right) $

$=arg\ min_{\theta} \ E_{X\sim P} \left[ -log \ Q_{\theta} \left( X \right) \right]  $

$= arg\ max_{\theta} \ E_{X\sim P} \left[ log \ Q_{\theta} \left( X \right) \right]  $

$\approx arg\ max_{\theta} \ E_{X\sim P_{data}} \left[ log \ Q_{\theta} \left( X \right) \right]  $

　　$其中 H\left( P\left( X \right) \right) = -\sum_{x}{\left[ P\left( x \right) log P\left( x \right) \right]} ，代表信息熵（Entropy）。上述推导的最终结果正好就是极大似然代价的定义式。$

　　推导过程分析：上面的推导过程中，第2行到第3行利用了 H\left( P\left( X \right) \right) 是与优化自变量 \theta 无关的，故删除该项不会改变最优化问题的解，因此可以直接省略。第3行到第4行则是通过来将求最小值问题转化为求最大值问题消去负号。第4行到第5行利用了机器学习训练中一般假设特征在样本集上的分布可以被近似看作真实分布，即： P_{data} \left( X \right) \approx P\left( X \right) 。

　　综上命题1成立。

　　其次，<strong>证明命题2，</strong>推导如下：

$arg\ min_{\theta} \ KL\left( Q|| P \right) = arg\ min_{\theta}\left( E_{X\sim Q_{\theta}} \left[ -log \ P \left( X \right) \right] + H\left( Q_{\theta} \left( X \right) \right) \right)  $

　　$观察上面的等式右侧 arg \ min_{\theta} 中的两项：$

$E_{X\sim Q_{\theta}} \left[ -log \ P \left( X \right) \right] + H\left( Q_{\theta} \left( X \right) \right) $

　　$要想令上面两项之和最小，就意味着要找到参数 \theta 的一个合适的取值，使得上面两项中的每一项 E_{X\sim Q_{\theta}} \left[ -log \ P \left( X \right) \right] 和 H\left( Q_{\theta} \left( X \right) \right) 都尽可能小。根据熵的性质可知，当Q_{\theta} 越接近于均匀分布（当 X 是连续随机变量时，若 X 是离散型随机变量便是离散取值的等概率分布，总之就是都可以看作等高多峰分布的极限情况）第二项 H\left( Q_{\theta} \left( X \right) \right) 的值越大，反之当 Q_{\theta} 越去向于单一模态分布（可以通俗理解为单峰分布） H\left( Q_{\theta} \left( X \right) \right) 的值越小。因此反向KL散度相当于在要求 Q_{\theta} 在拟合 P 的同时尽可能保持单一模态。$

　　综上命题2成立。

### 　　4、KL散度的应用

　　前面两节介绍了概率分布拟合意义下的两种不同类型KL散度的概念和特性，接下来的问题是：哪种KL散度更好？用一句老生常谈的话回答，就是“取决于具体问题”。就像第二节中所介绍的，两种KL散度各具特性，所以这个问题的答案取决于选择那种KL散度更适合所要解决的问题。

<strong>前向KL散度的应用场景</strong>

　　在监督学习领域，常常隐含使用前向KL作为训练代价（参考文献[4]），这是因为前面提到的前向KL散度代价与极大似然估计的等价性，这里不再重复说明。

<strong>反向KL散度的应用场景</strong>

　　在贝叶斯推理（Bayesian Inference）相关领域，特别是变分贝叶斯（Variational Bayes），反向KL被广泛使用。此外变分自编码机（VAE, Variational Autoencoder）的推导过程中也用到了反向KL（参考文献[2]），强化学习（参考文献[4]）中也用到了反向KL。

　　参考文献[1]给出了基于KL代价的拟合问题中倾向于选择反向KL散度的一种解释，大意如下：

> 实际应用中的真实分布 P 往往是多峰（multimodal）分布，即在拟合时KL代价存在多个局部极小值点，如果通过调整参数使得近似分布 Q 能够较好的拟合其中之一（反向KL代价作为优化目标时的特性）即可确保代价至少达到一个局部极小。而这正是。另一方面，代价的多个局部极小值对应的随机变量取值的平均值（前向KL代价作为优化目标时的特性）往往既不是代价的全局最小值也不是局部极小值，这显然不是我们所希望的。

### 　　KL散度的计算

　　考虑有两个样本分布 P 和 Q 如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9a409bccf97c.jpg)

　　由于 P 和 Q 中都在某个取值上概率为0，因此直接计算前向KL散度和反向KL散度

$$KL_{forward} \left( P||Q \right)=\sum_{i=1}^{4}{\left[ P\left( x_i \right)log\ \frac{P\left( x_i \right)}{Q\left( x_i \right)} \right]} $$

$$KL_{backward} \left( Q||P \right)=\sum_{i=1}^{4}{\left[ Q\left( x_i \right)log\ \frac{Q\left( x_i \right)}{P\left( x_i \right)} \right]} $$

　　都会由于遇到分母为0的问题导致不可行。为此，介绍计算KL散度的平滑（Smoothing）方法（参考文献[5]）：

　　引入一个微小常量 \varepsilon ，例如： \varepsilon=10^{-3} ，然后定义平滑的分布 P^{'} 和 Q^{'} 如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7630a8985619.jpg)

　　分别用 KL_{forward}\left( P^{'}||Q^{'} \right) 和 KL_{backward}\left( P^{'}||Q^{'} \right) 作为 KL_{forward}\left( P||Q \right) 和 KL_{backward}\left( Q||P \right) 的替代，这样正向KL和反向KL就都变得可以计算了。

#### 　　参考资料

- Christopher M. Bishop, Pattern Recognition and Machine Learning, Springer, 2006, 462-470.
- Dibya Ghosh, KL Divergence for Machine Learning, 2019, https://dibyaghosh.com/blog/probability/kldivergence.html
- Thushan Ganegedara, Intuitive Guide to Understanding KL Divergence, 2018, https://towardsdatascience.com/light-on-math-machine-learning-intuitive-guide-to-understanding-kl-divergence-2b382ca2b2a8
- Agustinus Kristiadi, KL Divergence: Forward vs Reverse?, 2016, https://wiseodd.github.io/techblog//21/forward-reverse-kl/
- Jiawei Han, KL-divergence.pdf, http://hanj.cs.illinois.edu/cs412/bk3/KL-divergence.pdf
- David M. Blei, Variational Inference, 2011, Lecture from Princeton, https://www.cs.princeton.edu/courses/archive/fall11/cos597C/lectures/variational-inference-i.pdf
- Roan Gylberth, Cross-entropy and Maximum Likelihood Estimation, 2019, https://medium.com/konvergen/cross-entropy-and-maximum-likelihood-estimation-58942b52517a
