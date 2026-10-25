---
title: "啥是TV-L1 OpticalFlow"
date: "2019-03-16 00:00:00"
updated: "2019-03-16 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/机器学习/啥是TV-L1-OpticalFlow/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/42537928"
---


该算法沿革还是比较长的啦，要系统了解，推荐阅读以下论文：

[[1992]Nonlinear  total  variation  based  noise  removal  algorithmsciteseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.117.1675&rep=rep1&type=pdf](https://link.zhihu.com/?target=http%3A//citeseerx.ist.psu.edu/viewdoc/download%3Fdoi%3D10.1.1.117.1675%26rep%3Drep1%26type%3Dpdf)

[[2004]An Algorithm for Total Variation Minimization and Applicationswww.uni-muenster.de/AMM/num/Vorlesungen/MathemBV_SS16/literature/Chambolle2004.pdf](https://link.zhihu.com/?target=https%3A//www.uni-muenster.de/AMM/num/Vorlesungen/MathemBV_SS16/literature/Chambolle2004.pdf)

[[2007]A Duality Based Approach for Realtime TV-L1 Optical Flowwww-pequan.lip6.fr/~bereziat/cours/master/vision/papers/zach07.pdf](https://link.zhihu.com/?target=https%3A//www-pequan.lip6.fr/~bereziat/cours/master/vision/papers/zach07.pdf)

<strong>论文关系：</strong>

1992年论文提出了基于TV（啥是TV下文会探讨）的降噪方法；

2004年论文年给出了更高效的求解方法；

2007年论文基于2004年的算法，将其应用在稠密光流求解上；

2009年论文则用于解决大位移光流计算的实际问题上；


光流的求解方法及其变体有很多相关研究，针对稀疏光流，稠密（dense）光流**也有不同解法（稀疏光流对部分特征点进行光流解算，稠密光流则针对的是所有点的偏移）。本文要讨论的TV-L1即可针对稠密光流进行快速求解。

### 0. Optical Flow 光流

有关光流的介绍都是蛮多的，主要参看 维基百科-光流 和 OpenCV: Optical Flow，总结下：

<strong>光流</strong> 是用来描述一个场景中的物体，由于运动（物体本身运动，相机运动）而在连续两帧间动态变化的方法。其本质是一个<strong>二维向量场</strong>，每个向量表示了场景中该点从前一帧到后一帧的位移。那对于光流的求解，即输入两张连续图象（图象像素），输出二维向量场的过程。


光流方程（Optical Flow equation）：

使用光流法通常基于三个个前提假设：

<strong>① 前后帧光照能量保持不变（亮度以及所有通道值都恒定）；</strong>

<strong>② 相邻帧之间同一像素点运动较小；</strong>

<strong>③ 相邻像素点运动相似（</strong>Lucas-Kanade方法求解<strong>）。</strong>

来分析下，第一条即确保无需考虑匹配点在前后帧中RGB值的变换，只需要考虑其位移就行了；第二条即明确前后帧是小动态运动。为啥会有这两个前提呢，或者说这三个前提假设有什么用？一起来推下光流方程就能有所体会：

设某点在第一帧中的光照能量表示为 f(x, y, t) ，其中 x, y 是像素坐标， t 是时间，那么经过时间 dt ，该点运动了 dx, dy 的距离，根据 <strong>假设1</strong>，可以得出等式：

f(x, y, t) = f (x+dx, y+dy, t+dt)                        (式0.0)

那我们感兴趣的自然是 dx, dy 了，怎么求解呢？对等式右边进行一阶泰勒开去掉余项：

$$f(x , y, t) = f(x, y, t) + \frac{\partial f}{\partial x}dx + \frac{\partial f}{\partial y}dy + \frac{\partial f}{\partial t}dt     （式0.1）$$

$$于是乎就有了：  \frac{\partial f}{\partial x}dx + \frac{\partial f}{\partial y}dy + \frac{\partial f}{\partial t}dt = 0 ，再两边同除 dt 即得到<strong>光流方程</strong>:$$

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_479defde49e8.jpg)

其中：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0a430e607bcb.jpg)

现在再试想为什么上面的（式0.1）能够成立呢？不就是因为<strong>假设2</strong>，确保了 dx, dy 都是较小值。那么假设2就决定了单纯运用以上方法是很难在移动幅度较大情况下取得好效果的。在解决这个问题之前，我们先来看看Horn-Schunck方法：


Horn-Schunck 方法：

实际上仅通过上述光流方程很难求得准确光流场，因其是一个 <strong>不适问题(ill-posed)</strong>，具体到我们现在的场景就是面临着 <strong>孔径问题(aperture problem)</strong>。这里再插嘴一以下，来聊聊啥是不适问题和孔径问题。

先来看看 <strong>适定问题(well-posed)</strong>，满足下面三个要求：

① 解是存在的；

② 解是唯一的；

③ 解连续依赖于定解条件，即解是稳定的。

而这三个要求中，只要有一个不满足，则称之为不适定问题。其和 <strong>病态/良态问题(ill/well conditioned)</strong>是有区别的，之前看到知乎好像有关于二者区别的提问，所以又多嘴一句。只要知道，<strong>即使是适定问题，其任然有可能是个病态问题，体现在其输入端极小的误差，也可能导致输出值的巨大误差</strong>。关于病态/良态问题，请参看 <strong>数值分析一下咯（一）</strong>， 页面下检索 病态问题。

那么这个不适问题在我们求解光流时候具体体现在<strong>孔径问题</strong>上，即通过上述光流方程很难准确判断实际运动方向。直观的还是看图吧：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_41158fba170c.jpg)

矩形里的圆形区域上看到同样的运动轨迹，但实际上的运动方向可能并不是一定的，即解不是唯一的。那怎么办呢？增加新的约束：

1981年，Horn 和 Schunck 在基于 <strong>光流在整个图像上平滑变化，即速度的变化率趋于零</strong>的假设下，提出了一个<strong>全局</strong>优化方程：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_65ca530a59fc.jpg)

这里 I_{0}, I_{1} 表示前后帧图象， u = (u_{1}(x), u_{2}(x))^{T} 即点 x 的二维位移场。那么先看后半段，即光流数据约束项了，见（式0.0）。前半段即基于新的假设提出的正则项，用以保持平滑变化。由于正则项和数据项都是二次的，比较好求解，但是缺点也明显：

① <strong>鲁棒性较差</strong>，无法准确处理原本图象梯度较大的边界区域；

② <strong>并没有解决</strong>我们先前提出的针对<strong>变化幅度比较大</strong>情况下如何准确求解光流的问题。于是乎有了Coarse-to-Fine方法：


Coarse-to-Fine 方法

Coarse-to-Fine 方法基本思想是首先运用图象金字塔分层，从顶层开始，原先较大幅度的变化，在顶层上显得不那么大了，从而能够进行原先基于泰勒展开的光流求解，然后插值再迭代，这样使得每一次计算都满足<strong>假设2</strong>。看图会比较清楚：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_ba1e0e6a6f1d.jpg)

http://eric-yuan.me/coarse-to-fine-optical-flow/然而，Coarse-to-Fine方法依然有 其局限性：

① 图象分层方法和插值方法的选择对结果有着极大的影响；

② 由于在Coarse的过程中，原本图象中较为精细结构被忽略了，故而导致对精细结构的估算也就不准确。

如本文开篇的配图：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_2b645acc9592.jpg)

左边开始，第一张图为第二帧的原始图象，第二张图是根据第一帧及通过Coarse-to-Fine方法后，再还原出来的图象，可以看到，相对大结构的手还原还是不错的，而小结构的球则几乎消失了。至于第三张图，则是 Large displacement optical flow computation without warping 作者提出的算法，也是我们后面要讨论的方法。

在讨论TV-L1之前，先了解下TV是啥，总不会是电视机吧。。。

### 1. Total Variation （TV）全变分

或叫总变差，总变分... 用来<strong>描述函数值变化的累计</strong>。看图更直接：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_6d205f8de597.jpg)

如上图，若 f 代表曲线，则其全变分就是在其定义域内遍历，即绿球的运动，其在y轴上的投影走过的<strong>路程</strong>的总和。数学表示自然可以用积分了，注意是走过的所有路程值的总和，故而是绝对值的积分（以下直接截图自 <strong>维基百科-总变差</strong> ）：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_0666b0d65d4b.jpg)

那么全变分在本文中起到什么作用呢？


Total Variation Regularization

另一种叫法是 total variation denoising ，即降噪，是不是更make sense一点，去掉不需要的细节，保留重要细节。

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_50b5b2e2f673.jpg)

上图中，中间那个噪点很多，图象局部变化很大，可想而知其总变差是比较大的，那么加了 TV  Regularization 后，则保证其平滑，起到了降噪的作用。回想之前讨论过的Horn-Schunck 方法，其正则项：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_70bb3efd7c5c.jpg)

看着不就是一个 TV-L^{2}_{2} 哇。


### 2. TV-L1 Optical Flow

再回看之前的Horn-Schunck 方法，看能不能针对其两个缺陷改进下哇？

首先是不鲁棒，那最简单的鲁棒方法就是 L^1_1 norm 了，至于为啥那简单说下：


L1, L2 鲁棒性分析：

L2方法，其loss都是二次后的，意味着对一些小的变化都很敏感，对于存在离群数据的情况下，体现的就是鲁棒性较差了；而L1方法就对离群值不怎么敏感，表现出较好的鲁棒性。相对的L2则比L1表现出更好的平滑性。


所以把原Horn-Schunck改为L1好了：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_c38223f78bc3.jpg)

注意这里的 |\nabla u| = |\nabla u_1| + |\nabla u_2| ，即为一个 TV-L1 正则项。看起来似乎很不错啊！但重点来了，怎么解？

求解过程：

<strong>1.</strong> 对于上式中的 I_{1}(x + u(x)) ，其在 x+u_{0} 处的一阶泰勒展开：

$$I_{1}(x + u) = I_{1}(x + u_{0}) + (u - u_{0})\nabla I_{1}(x + u_{0}) = I_{1}(x + u_{0}) + u \nabla I_{1}(x + u_{0}) - u_{0} \nabla I_{1}(x + u_{0}) $$

$$<strong>2.</strong> 再令 \rho(u) = I_{1}(x + u_{0}) + u \nabla I_{1}(x + u_{0}) - u_{0} \nabla I_{1}(x + u_{0}) - I_{0}(x)    (式2.0)$$

原公式即变为：

$E = \int_{\Omega} \{|\nabla u| + \lambda|\rho(u)|\}dx    （式2.1）$

<strong>3.</strong> 引入一个辅助变量 v 和常量 \theta ，在（式2.1）基础上构建如下优化方程：

$$E_{\theta} = \int_{\Omega} \{|\nabla u| + \frac{1} {2\theta}(u - v)^2 + \lambda|\rho(v)|\}dx    （式2.2）$$

这里当 \theta 是一个很小的常数， v 则逼近于 u 。

<strong>4.</strong> 那么原先的优化可以转换为：

<strong>4.1</strong> 固定 v ，求解由开头提到的[1992]年论文提出的TV-L1：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_a9d8046e4bd5.jpg)

开篇提及的[2007]年论文直接给出了推导结果：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_ab5c61b6e179.jpg)

(关于迭代不动点（FPI）方法可参看 数值分析一下咯（一） - CSDN博客）

<strong>4.2</strong> 以及，另一个可以直接求解的：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_5c4697976b21.jpg)

固定 u 求得 v :

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_b1eb30609f06.jpg)


5.** 到这可能有点懵逼，怎么就得出以上结果呢？p 是哪来的？ \theta, \tau 又是啥？

对于4.1，结合[2004]论文，试着一起推导下（以下还<strong>只是部分推导</strong>，有些地方还没读，有些地方也还没读懂... 尴尬，以后补上吧... 推荐读原文）：

<strong>5.1</strong>首先明确一些定义和定理：

$上文<strong>全变分定义</strong>，可知 J(u) = \int_{\Omega}|\nabla u| 的完整定义是 :$

$J(u) = sup\{\int_{\Omega} u(x)div\varphi(x)dx: \varphi \in C^{1}_{c}(\Omega; \mathbb{R}^2), |\varphi(x)| \leq 1 \forall x\in \Omega\} $

$用维基百科的原话，这里的 C^{1}_{c} 是有界区域 \Omega\subset \mathbb{R}^2 中<strong>紧支集</strong> 上全体<strong>连续可微向量函数</strong>构成的集合。$

div 即散度算子啦，关于<strong>散度</strong>，推荐阅读 ：

[](https://www.zhihu.com/question/24591127/answer/28341708)

[](https://www.zhihu.com/question/21912411/answer/177976053)


注意：**对于论文中直接给出的 div = - \nabla^{*}，我觉得对于解法的理解还是挺重要的，所以我们尝试证明下。这里的 \nabla^{*} 表示 \nabla 的 伴随算子， 即要证明的是  = "> =  ，其中 f 是标量场， F 是向量场；

这里首先明确一个重要变换： div(fF) = f(div F) + (\nabla f)F ，可在 Vector calculus identities 查看到，证明也比较简单，这里就略了；

假设有 V 是某开集的一有界区域， S 即为其边界。以三维空间为例， V 是个闭的三维球体，而 S 即为球面，则有：

$\int_V div(fF)dV = \int_{V} [f(div F) + (\nabla f)F]dV = \int_V f(div F)dV + \int_V (\nabla f)FdV $

根据 高斯散度定理 / 斯托克斯定理： \int_V div(fF)dV = \int_S (fF)\vec{n} dS ，其中 \vec{n} 为球面 S 上每点的法向量；

带入则有： \int_S (fF)\vec{n} dS = \int_V f(div F)dV + \int_V (\nabla f)FdV 

那么拓展下，如果这个 V 是无界的呢，则认为 \int_S (fF)\vec{n} dS = 0 ，因为此时 S = \emptyset 。则有：

- \int_V f(div F)dV = \int_V (\nabla f)FdV ，即 \int_V f( - div F)dV = \int_V (\nabla f)FdV 得证。


若对 J(u) 进行 Legendre–Fenchel变换 （<strong>凸共轭</strong>）**，即有：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_5b47da3881d5.jpg)

若 u \in X ，则 v\in X^* ，这里的 X^* 表示 X 的 <strong>对偶空间</strong>。

关于对偶空间及对偶问题推荐阅读：

[](https://www.zhihu.com/question/38464481/answer/235672121)


[](https://www.zhihu.com/question/58584814)

针对绝对值的凸共轭：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_3ddb41367de4.jpg)

又因 J^{**} = J ，就有了： 

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_9601cbd496af.jpg)

$其中 K 是\{div \varphi:\varphi \in C^{1}_{c}(\Omega; \mathbb{R}^2), |\varphi(x)| \leq 1 \forall x\in \Omega\} 的闭集。$

另 依据总变分离散化的定义，可以给出 p ，使得 ：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_a15d5d795cc1.jpg)

依据之前得证的，这里就有  = "> =  

### 5.2** 下面就是对形如以下问题的推导了：


![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_04170a899df6.jpg)

取导数为0，即 u - g + \lambda \partial J(u) = 0 ，即 \partial J(u) = (g - u)/\lambda ，再由勒让德变换，则有：

$u = \partial J^{*}((g- u )/\lambda) ，经整理有：$

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_4b06dd0f686c.jpg)

$令 w = (g - u) /\lambda ，即 g/\lambda = \omega + (1/\lambda)\partial J^{*}(\omega) ，可以发现， w = (g - u) /\lambda 正是以下方程的 min 最优解：$

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_6e9176cc1217.jpg)

所以最初的问题（6）和以上问题等价。

又通过（3），若存在 div\ p = w ， |p|^2 \leq 1 ，即右边是0，又因 w = (g - u) /\lambda 则问题可等效为： min|| \lambda w - g ||^2 ，即 min f(p) = \{||\lambda div \ p - g ||^2: |p|^2 \leq 1\}    .......... (8)

对于问题（8）即是带有约束条件( c(p) = |p|^2 - 1\leq 0 )的非线性规划问题，令 \alpha 是拉格朗日乘数，文中依据 KKT条件 ([非线性优化中的 KKT 条件该如何理解？ ](https://www.zhihu.com/question/23311674/answer/235256926))，得到 -(\nabla (\lambda div\ p - g) ) +ap = 0 

此时 a = |\nabla (\lambda div\ p - g)| 能够同时满足条件 a =0 , c(p)  （此时 \nabla (\lambda div\ p - g) = 0 ）或 0，c(p) = 0">\alpha > 0，c(p) = 0 ；

即满足 \nabla (\lambda div\ p - g) = |\nabla (\lambda div\ p - g)| p     ......... (9)

$取<strong>步长</strong>  0">\tau > 0 ，初值 p^{0} = 0 ，对于迭代步骤 n \geq 0 ，使用(semi-implicit)梯度下降:$

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_d4b8473f5b82.jpg)

整理下就有：

![](/images/collections/0.raw/zhihu/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%EF%BC%81/asset/img_f7964b280f13.jpg)

后文还有收敛证明，略了...

### 3. References & Acknowledgements

Coarse-to-fine Optical Flow (Lucas & Kanade)

Optical flow - Wikipedia

OpenCV: Optical Flow

数值分析一下咯（一） - CSDN博客

IPOL Journal · TV-L1 Optical Flow Estimation

Why is negative divergence an adjoint of gradient?

Karush-Kuhn-Tucker conditions

Why is negative divergence an adjoint of gradient?

Duality (optimization)

Karush-Kuhn-Tucker conditions

Please explain the intuition behind the dual problem in optimization.

Chambolle
