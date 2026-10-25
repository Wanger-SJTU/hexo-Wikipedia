---
title: "如何理解与看待在cvpr2020中提出的circle loss？"
date: 2026-04-23
tags: [知乎]
source: https://www.zhihu.com/question/382802283/answer/1114719159
---

知乎用户
​​​
深度学习（Deep Learning）话题下的优秀答主

收录于 · happynear技术博客

我觉得这篇文章最大的贡献并不是统一了triplet loss和softmax ce loss这两种形式，在17年的NormFace和ProxyTriplet文章里已经提出了这两者的统一形式。

这篇文章最有意思的点其实就在本问题某个回答里原作者 @孙奕帆
 所提到的multiple positive情况下该如何改造softmax的问题，其实也就是论文一开始的公式：

乍一看这个公式好像是把positive与negative分离开了，但直接看这个公式会带来一个疑问：不论是triplet loss还是softmax ce loss，都是正负平衡的loss，positive similarity和negative similarity拿到的梯度都是相等的，而这个loss里正样本有K个，负样本有L个，还平衡吗？

要回答这个问题，得首先回顾一下我之前的文章（最好把一整个系列都看了）：https://zhuanlan.zhihu.com/p/45014864

在这篇文章中，我提到了Softmax中使用的LogSumExp函数是max函数的一个平滑近似：

LSE(\mathbf{x};\gamma) = \frac{1}{\gamma}\log\sum_i\exp(\gamma x_i)\approx \max(\mathbf{x}) ，

其中 \gamma 越大，近似效果越好。

通过加一个负号，我们可以使LSE也能够近似min函数：

NLSE(\mathbf{x};\gamma) = -\frac{1}{\gamma}\log\sum_i\exp(-\gamma x_i)\approx \min(\mathbf{x}) 。

类似的有，softplus函数是relu函数的一个近似：

Softplus(x)=\log(1+e^x)\approx \max(x,0)=[x]_+ 

利用这两个公式来改写一下公式(1)：

\begin{aligned} L_{uni}    \approx [\log\sum_{j=1}^{L}\exp(\gamma(s_n^j+m))\sum_{i=1}^{K}\exp(\gamma(-s_p^j))]_+ \\  =[\log\sum_{j=1}^{L}\exp(\gamma(s_n^j+m)) + \log\sum_{i=1}^{K}\exp(\gamma(-s_p^i))]_+\\   =\gamma[LSE(s_n)-NLSE(s_p)+m]_+\\  \approx \gamma[\max(s_n) - \min(s_p) + m]_+ \end{aligned} 

对比AM Softmax做同样转化后的形式(详见https://zhuanlan.zhihu.com/p/52108088)：

L_{am} \approx \gamma[\max(s_n) - s_p + m]_+ 。

这两者的区别就在于 L_{uni} 用 min(s_p) 替代了 L_{am} 里单个的 s_p 。

之前我们说过，AM Softmax的目标函数用文字描述是：

使同类相似度比最大的非同类相似度更大。类似的，替代之后的文字描述变为：

使最小的同类相似度比最大的非同类相似度更大。这个说法也等价于：

所有同类相似度都比所有非同类相似度更大。仔细品一下这几个句子就会发现其实这几个说法都是等价的。不管哪个说法，都完成了我们想要做到的目标：让同类相似度与非同类相似度之间拉开一定的margin。

另外注意到LSE函数有一个很有意思的性质：它的梯度恰好是softmax函数。也就是说，LSE的梯度是按softmax的指数下降来分配的。而从上边的公式可以看出，不论 s_n 拿到多少梯度， s_p 也都会拿到同等大小的相反的梯度。这样我一开始提出的问题就解决了，实际上这个损失函数不管K和L的差距有多大，同类和非同类的相似度都会拿到一样多的梯度，保持了梯度平衡性。这一点也在我的softmax系列文章之二中有比较直观的讲解：https://zhuanlan.zhihu.com/p/45368976 。

=================我是分界线=====================

@Yifan Sun
 提到了一个错误的做法：

L_{wrong}= -\log\frac{\sum e^{s_p}}{\sum e^{s_p} + \sum{e^{s_n}}} 

下面我们来看看这个公式错在哪里：

\begin{aligned} L_{wrong}  = -\log\frac{\sum e^{s_p}}{\sum e^{s_p} + \sum{e^{s_n}}} \\   = \log(1+\frac{\sum e^{s_n}}{\sum{e^{s_p}}})\\   = \log(1+e^{\log\sum e^{s_n} -\log{\sum{e^{s_p}}}})\\   \approx [LSE(s_n) - LSE(s_p)]_+ \\   \approx [max(s_n) - max(s_p)]_+ \end{aligned} 

上边我们提到 L_{uni} 是在优化 s_p 的下界和 s_n 的上界，以达到所有的 s_p 与 s_n 分开的目的，而这个 L_{wrong} 实际上是在优化 s_p 的上界和 s_n 的上界，能达到.......我也不知能达到一个什么目的，强行编的话，只能说它让已经分对了的 s_p 分得更对，而把本来分得不好的 s_p 给忽略掉，emmm....

总之可以看到，在去掉各种smooth后，我们还原了这些损失函数的本来面目，这样我们就更容易理解其本质，L_{wrong}的错误之处就显而易见了。

阅读全文​
​赞同 1365​​87 条评论​1456 ​132 ​分享