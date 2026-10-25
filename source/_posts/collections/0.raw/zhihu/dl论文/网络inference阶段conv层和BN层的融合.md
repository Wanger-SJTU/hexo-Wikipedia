---
title: "网络inference阶段conv层和BN层的融合"
date: 2018-10-30
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/48005099

---

现在很多的网络结构都将BN层直接放在卷积层和激活层之间，这种做法可以在网络的inference阶段，将BN层的运算直接嵌入到卷积层中，减少运算量，提升网络的运行速度。

在inference阶段，已知某层卷积层的kernel参数 
![](https://www.zhihu.com/equation?tex=w)， 
![](https://www.zhihu.com/equation?tex=b) ，以及输入 
![](https://www.zhihu.com/equation?tex=x) ，紧随其后的BN层参数（已学习到）：尺度参数 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 、偏移参数 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 、以及样本均值 
![](https://www.zhihu.com/equation?tex=%5Chat%7Bu%7D) 和标准差 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Csigma%7D) 。

- 则卷积层输出为： 
![](https://www.zhihu.com/equation?tex=w%5Cast+x++%2B+b) 
- bn层输出为： 
![](https://www.zhihu.com/equation?tex=%5Cgamma+%5Cfrac%7Bw%5Cast+x%2Bb-%5Chat%7Bu%7D%7D%7B%5Csqrt%7B%5Csigma%5E2%2B%5Cepsilon%7D+%7D%2B%5Cbeta) bn层的输出可以化为如下形式：

![](https://www.zhihu.com/equation?tex=%5Cgamma+%5Cfrac%7Bw%5Cast+x+%2Bb-%5Chat%7Bu%7D%7D%7B%5Csqrt%7B%5Csigma%5E2%2B%5Cepsilon%7D+%7D%2B%5Cbeta%3D%5C%5C+%28%5Cfrac%7B%5Cgamma%7D%7B%5Csqrt%7B%5Csigma%5E2%2B%5Cepsilon%7D%7Dw%29%5Cast+x+%2B+%5Cfrac%7B%5Cgamma%7D%7B%5Csqrt%7B%5Csigma%5E2%2B%5Cepsilon%7D%7Db+-+%5Cfrac%7B%5Cgamma%7D%7B%5Csqrt%7B%5Csigma%5E2%2B%5Cepsilon%7D%7D%5Chat%7Bu%7D+%2B++%5Cbeta+%3D++kw%5Cast+x+%2Bb%27+)

所以，在inference阶段，如果BN直接跟在卷积层后，可以将BN层直接嵌入到卷积层的计算中，相当于将卷积核缩放一定倍数，并对偏置进行一定改变。

将BN层如何到卷积层中，就相当于对卷积核进行一定的修改，并没有增加卷积层的计算量，同时整个BN层的计算量都省去了。