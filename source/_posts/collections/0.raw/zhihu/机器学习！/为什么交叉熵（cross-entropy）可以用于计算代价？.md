---
title: 为什么交叉熵（cross-entropy）可以用于计算代价？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/为什么交叉熵(cross-entropy)可以用于计算代价/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/65288314/answer/244557337
---


通用的说，熵(Entropy)被用于描述一个系统中的不确定性(the uncertainty of a system)。在不同领域熵有不同的解释，比如热力学的定义和信息论也不大相同。

<strong>要想明白交叉熵(Cross Entropy)的意义，可以从熵(Entropy) -> KL散度(Kullback-Leibler Divergence) -> 交叉熵这个顺序入手。</strong>当然，也有多种解释方法[1]。

先给出一个“接地气但不严谨”的概念表述：

- 熵：可以表示一个事件A的自信息量，也就是A包含多少信息。
- KL散度：可以用来表示从事件A的角度来看，事件B有多大不同。
- 交叉熵：可以用来表示从事件A的角度来看，如何描述事件B。
一句话总结的话：<strong>KL散度可以被用于计算代价，而在特定情况下最小化KL散度等价于最小化交叉熵。而交叉熵的运算更简单，所以用交叉熵来当做代价</strong>。

我知道你现在看着有点晕，但请保持耐心继续往下看。**为了通俗易懂，我没有严格按照数学规范来命名概念，比如文中的“事件”指的是“消息”，望各位严谨的读者理解。*

### <strong>1. 什么是熵(Entropy)？</strong>

放在信息论的语境里面来说，就是一个事件所包含的信息量。我们常常听到“这句话信息量好大”，比如“昨天花了10万，终于在西二环买了套四合院”。

这句话为什么信息量大？<strong>因为它的内容出乎意料，违反常理。</strong>由此引出：

- <strong>越不可能发生的事件信息量越大，</strong>比如“我不会死”这句话信息量就很大<strong>。而确定事件的信息量就很低，</strong>比如“我是我妈生的”，信息量就很低甚至为0<strong>。</strong>
- <strong>独立事件的信息量可叠加。</strong>比如“a. 张三今天喝了阿萨姆红茶，b. 李四前天喝了英式早茶”的信息量就应该恰好等于a+b的信息量，如果张三李四喝什么茶是两个独立事件。
$因此熵被定义为 S(x) = -\sum_{i}P(x_{i})log_{b}P(x_{i}) ， x 指的不同的事件比如喝茶， P(x_{i}) 指的是某个事件发生的概率比如和红茶的概率。对于一个一定会发生的事件，其发生概率为1， S(x) =- log(1) * 1 = -0*1=0 ，信息量为0。$

### <strong>2. 如何衡量两个事件/分布之间的不同（一）：KL散度</strong>

我们上面说的是对于一个随机变量x的事件A的自信息量，如果我们有另一个独立的随机变量x相关的事件B，该怎么计算它们之间的区别？

<strong>此处我们介绍默认的计算方法：KL散度，有时候也叫KL距离，一般被用于计算两个分布之间的不同</strong>。看名字似乎跟计算两个点之间的距离也很像，但实则不然，因为KL散度<strong>不具备有对称性</strong>。在距离上的对称性指的是A到B的距离等于B到A的距离。

举个不恰当的例子，事件A：张三今天买了2个土鸡蛋，事件B：李四今天买了6个土鸡蛋。我们定义随机变量x：买土鸡蛋，那么事件A和B的区别是什么？有人可能说，那就是李四多买了4个土鸡蛋？这个答案只能得50分，因为忘记了"坐标系"的问题。换句话说，对于张三来说，李四多买了4个土鸡蛋。对于李四来说，张三少买了4个土鸡蛋。<strong>选取的参照物不同，那么得到的结果也不同</strong>。更严谨的说，应该是说我们对于张三和李四买土鸡蛋的期望不同，可能张三天天买2个土鸡蛋，而李四可能因为孩子满月昨天才买了6个土鸡蛋，而平时从来不买。

<strong>KL散度的数学定义：</strong>

$$- 对于<strong>离散事件</strong>我们可以定义事件A和B的差别为(2.1)： \begin{equation*} D_{KL}(A||B) = \sum_{i}P_{A}(x_i) log\bigg(\frac{P_{A}(x_i)}{P_{B}(x_i)} \bigg) = \sum_{i}P_{A}(x_i)log(P_{A}(x_i ))- P_{A}(x_i)log(P_{B}(x_i)) \end{equation*}$$
$$- 对于<strong>连续事件</strong>，那么我们只是把求和改为求积分而已(2.2)。\begin{equation*} D_{KL}(A||B) = \int a(x) log\bigg(\frac{a(x)}{b(x)} \bigg) \end{equation*}$$
从公式中可以看出：

- <strong>如果</strong> P_A=P_B ，即两个事件分布完全相同，那么KL散度等于0。
- <strong>观察公式2.1，可以发现减号左边的就是事件A的熵，请记住这个发现</strong>。
- 如果颠倒一下顺序求 D_{KL}(B||A)，那么就需要使用B的熵，答案就不一样了。<strong>所以KL散度来计算两个分布A与B的时候是不是对称的，有“坐标系”的问题</strong>，D_{KL}(A||B)\ne D_{KL}(B||A)
换句话说，KL散度由A自己的熵与B在A上的期望共同决定。当使用KL散度来衡量两个事件(连续或离散)，上面的公式意义就是求 A与B之间的对数差 在 A上的期望值。 

### <strong>3. KL散度 = 交叉熵 - 熵？</strong>

如果我们默认了用KL散度来计算两个分布间的不同，那还要交叉熵做什么？

事实上交叉熵和KL散度的公式非常相近，其实就是KL散度的后半部分(公式2.1)：A和B的交叉熵 = A与B的KL散度 - A的熵。 D_{KL}(A||B) = -S(A)+H(A,B) 

对比一下这是KL散度的公式：

$$\begin{equation*} D_{KL}(A||B) = \sum_{i}P_{A}(x_i) log\bigg(\frac{P_{A}(x_i)}{P_{B}(x_i)} \bigg) = \sum_{i}P_{A}(x_i)log(P_{A}(x_i ))- P_{A}(x_i)log(P_{B}(x_i)) \end{equation*}$$

这是熵的公式：

$$S(A) = -\sum_{i}P_A(x_{i})logP_A(x_{i})$$

这是交叉熵公式：

$\begin{equation*} H(A,B)= -\sum_{i}P_{A}(x_i)log(P_{B}(x_i)) \end{equation*}$

<strong>此处最重要的观察是，如果</strong> S(A)<strong>是一个常量，那么</strong> D_{KL}(A||B) = H(A,B)  ，<strong>也就是说KL散度和交叉熵在特定条件下等价。这个发现是这篇回答的重点。</strong>

同时补充交叉熵的一些性质：

- 和KL散度相同，交叉熵也不具备对称性：  H(A,B) \ne H(B,A) ，此处不再赘述。
- 从名字上来看，Cross(交叉)主要是用于描述这是<strong>两个事件</strong>之间的相互关系，对自己求交叉熵等于熵。即 H(A,A) = S(A) ，注意只是非负而不一定等于0。

### *<strong>4. 另一种理解KL散度、交叉熵、熵的角度（选读）-  可跳过</strong>

那么问题来了，为什么有KL散度和交叉熵两种算法？为什么他们可以用来求分布的不同？什么时候可以等价使用？

<strong>一种信息论的解释是</strong>：

- 熵的意义是对A事件中的随机变量进行编码所需的最小字节数。
- KL散度的意义是“额外所需的编码长度”如果我们用B的编码来表示A。
- 交叉熵指的是当你用B作为密码本来表示A时所需要的“平均的编码长度”。
对于大部分读者，我觉得可以不用深入理解。感谢评论区@王瑞欣的指正，不知道为什么@不到他。

<strong>一些对比与观察：</strong>

- KL散度和交叉熵的不同处：交叉熵中不包括“熵”的部分
- KL散度和交叉熵的相同处：a. 都不具备对称性 b. 都是非负的
- <strong>等价条件（章节3）：当 A 固定不变时，那么最小化KL散度 D_{KL}(A||B) 等价于最小化交叉熵 H(A,B) 。</strong> D_{KL}(A||B) = H(A,B) 
<strong>既然等价，那么我们优先选择更简单的公式，因此选择交叉熵。</strong>

### <strong>5. 机器如何“学习”？</strong>

机器学习的过程就是希望在训练数据上<strong>模型学到的分布</strong> P(model) 和<strong>真实数据的分布</strong> P(real) 越接近越好，那么我们已经介绍过了....怎么最小化两个分布之间的不同呢？<strong>用默认的方法，使其KL散度最小</strong>！

<strong>但我们没有真实数据的分布，那么只能退而求其次，</strong>希望<strong>模型学到的分</strong>布和<strong>训练数据的分布</strong> P(training) 尽量相同，<strong>也就是把训练数据当做模型和真实数据之间的代理人</strong>。假设训练数据是从总体中独立同步分布采样(Independent and identically distributed sampled)而来，那么我们可以利用最小化训练数据的经验误差来降低模型的泛化误差。简单说：

- 最终目的是希望学到的模型的分布和真实分布一致： P(model) \simeq P(real )
- 但真实分布是不可知的，我们只好假设 训练数据 是从真实数据中独立同分布采样而来： P(training) \simeq P(real )
- 退而求其次，我们希望学到的模型分布至少和训练数据的分布一致 P(model) \simeq P(training)
由此非常理想化的看法是如果<strong>模型(左)</strong>能够学到<strong>训练数据(中)</strong>的分布，那么应该近似的学到了<strong>真实数据(右)</strong>的分布： P(model) \simeq P(training) \simeq P(real)

### <strong>6. 为什么交叉熵可以用作代价？</strong>

接着上一点说，最小化模型分布 P(model) 与 训练数据上的分布 P(training) 的差异 等价于 最小化这两个分布间的KL散度，也就是最小化 KL(P(training)||P(model)) 。

比照第四部分的公式：

- 此处的A就是数据的真实分布： P(training)
- 此处的B就是模型从训练数据上学到的分布： P(model)
巧的是，<strong>训练数据的分布A是给定的</strong>。那么根据<strong>我们在第四部分说的，因为A固定不变，那么求 D_{KL}(A||B) 等价于求 H(A,B) ，也就是A与B的交叉熵</strong>。<strong>得证，交叉熵可以用于计算“学习模型的分布”与“训练数据分布”之间的不同。当交叉熵最低时(等于训练数据分布的熵)，我们学到了“最好的模型”。</strong>

<strong>但是，完美的学到了训练数据分布往往意味着过拟合，因为训练数据不等于真实数据，我们只是假设它们是相似的，而一般还要假设存在一个高斯分布的误差，是模型的泛化误差下线。</strong>

### <strong>7. 总结</strong>

因此在评价机器学习模型时，我们往往不能只看训练数据上的误分率和交叉熵，还是要关注测试数据上的表现。如果在测试集上的表现也不错，才能保证这不是一个过拟合或者欠拟合的模型。交叉熵比照误分率还有更多的优势，因为它可以和很多概率模型完美的结合。

<strong>所以逻辑思路是，为了让学到的模型分布更贴近真实数据分布，我们最小化 模型数据分布 与 训练数据之间的KL散度，而因为训练数据的分布是固定的，因此最小化KL散度等价于最小化交叉熵。</strong>

<strong>因为等价，而且交叉熵更简单更好计算，当然用它咯 ʕ•ᴥ•ʔ</strong>

[1] 不同的领域都有不同解释，更传统的机器学习说法是似然函数的最大化就是交叉熵。<strong>正所谓横看成岭侧成峰，大家没必要非说哪种思路是对的，有道理就好</strong>。

[![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c197b69ecf41.jpg)广告

信息论：基础理论与应用（第4版）

京东

¥44.60

去购买​

](https://union-click.jd.com/jdc?e=jdext-1241908738887417856-0&p=AyIGZRprFQIVA1wTXhUyVlgNRQQlW1dCFFlQCxxKQgFHRE5XDVULR0UVAhUDXBNeFR1LQglGa2hXG34nS14LYHl1KlMfHUd3Ui1aKWUOHjdVElsXChMGVRxYJQITBlUfXhYBFAZlK1sQMkRpVRpaFAMTAlUeWCUDIgdRElIcBBcHVRxTEgMiB10fa8OshtLdpIKlp8St%2B87WpdebrIGl3SUyIgRlQA5BS1cbVRheFQoTDlMZUhwLFAJVHVIRBQ4GZRtaFAEVA1MZXR1sEAdWE1oSbBAGVBtfFQYQAVwrWyUBIlk7GgtGBhMCARw1TwpbBAlDEhxsFQZTGlgXCxI3VxpaFwA%3D)

[编辑于 2020-05-08 01:55](//www.zhihu.com/question/65288314/answer/244557337)

​​3926 ​481 ​分享

​​

收起​
