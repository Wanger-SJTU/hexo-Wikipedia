---
title: CVPR 2018：用于图像分割网络的Lovasz loss学习笔记
date: "2019-08-06 00:00:00"
updated: "2019-08-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/CVPR-2018-用于图像分割网络的Lovasz-loss学习笔记/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/76825379
---


Lovasz loss是在[kaggle的分割比赛中被推荐](https://www.zhihu.com/question/272988870/answer/562262315)的loss，据说比Dice loss要好一些，作者给了代码，虽然拿过来就能套着用，但里面的用到的数学工具不是很trival，看了三四遍文章第二部分的方法介绍，还是没完全吃透，在此记录下学习笔记，把看懂的记录下，后面有新的理解随时更新。

[bermanmaxim/LovaszSoftmax](https://link.zhihu.com/?target=https%3A//github.com/bermanmaxim/LovaszSoftmax)
1. 本文的loss解决了什么问题
IoU (intersection-over-union，也叫jaccard index)是自然图像分割比赛中常用的一个衡量分割效果的评价指标，所以一个自然的想法就是能否将IoU作为loss function来直接优化。

![](https://pic4.zhimg.com/v2-36e1726b75a8981ac79c5e1bf1618a95_r.jpg)用公式表述就是想要直接将(4)作为loss function。但是公式(4)的定义是离散的loss，不能直接求导，所以无法直接用来作为loss function。为了克服这个离散的问题，本文将其做了光滑的延拓(smooth extensions)，从而可以使得其作为分割网络的loss function。

2. 如何对离散的(4)做光滑延拓？
对公式(4)做简单的改写得到公式(6)， 
![](https://www.zhihu.com/equation?tex=M_c) 即网络对第 
![](https://www.zhihu.com/equation?tex=c) 类的分割结果和label不匹配的部分。

![](https://pic3.zhimg.com/v2-ced1559a2a943586ca8d353cb8ace564_r.jpg)公式(6)即为目前想要优化的loss function，记为 
![](https://www.zhihu.com/equation?tex=%5CDelta_%7BJ_c%7D) ，其自变量为网络分割结果和label不匹配的集合 
![](https://www.zhihu.com/equation?tex=M_c) ，定义域为 
![](https://www.zhihu.com/equation?tex=%5C%7B0%2C1%5C%7D%5Ep) , 
![](https://www.zhihu.com/equation?tex=p) 表示pixel数量。

将公式(6)做光滑的延拓不是一件简单的事情，更一般的说，对任意的离散函数找到其光滑的延拓很难。好在作者发现公式(6)是submodular的，

![](https://pic2.zhimg.com/v2-53d682af51bc3e79acee8368e5ea3a11_r.jpg)submodular的函数已经有成熟数学工具可以将其做光滑延拓，而且延拓后的函数总是凸的，这样就大大方便了优化。该数学工具即为<strong>lovasz extension</strong>

![](https://picx.zhimg.com/v2-8607c8f942ad8d09e7ed0335908a0e6b_r.jpg)注意这时候新函数 
![](https://www.zhihu.com/equation?tex=%5Cbar%7B%5CDelta%7D) 的定义域已经从离散的 
![](https://www.zhihu.com/equation?tex=%5C%7B0%2C1%5C%7D%5Ep) 变到了连续的 
![](https://www.zhihu.com/equation?tex=R%5Ep)， 
![](https://www.zhihu.com/equation?tex=%5Cbar%7B%5CDelta%7D) 此时已经是连续、piecewise linear的，能直接对误差 
![](https://www.zhihu.com/equation?tex=m) 求导，而且导数很简洁，就是 
![](https://www.zhihu.com/equation?tex=g%28m%29) 。

g(m)这里目前还不懂上面是介绍了本文整体的思路，一句话概括就是：采用lovasz extension这个数学工具将离散的Jaccard loss (eq. 4/6)变得光滑化(eq. 8-9)，从而可以直接求导。

3. 具体实现：二类分割
在两类分割任务中，只考虑前景，忽略背景。

![](https://pic3.zhimg.com/v2-6d5b8e2f2ceb7b1d404f64c4503a42e8_r.jpg)
![](https://pic4.zhimg.com/v2-7c5cf3716e193e842e37d2a26f4c750f_r.jpg)
4. 具体实现：多类分割

![](https://pic2.zhimg.com/v2-c7273955694db1cbec09f80d0975a21d_r.jpg)这里 
![](https://www.zhihu.com/equation?tex=f_i%28c%29) 是第c类softmax后的概率值。

![](https://pic2.zhimg.com/v2-897d384c45b0046a29c3a9097c4c4771_r.jpg)

<strong>目前对公式(6)中的g理解还不深刻，因此对(10&12)也是一知半解，最近会持续啃这篇paper，等弄懂了再来完善。</strong>

几个可能的疑问

- 为什么用这么复杂，看起来也不简单的数学工具来对Jaccard loss进行smooth extension，直接像Dice loss那样计算Jaccard loss不行吗？基于该想法的工作已经在16年发表了出来[Optimizing Intersection-Over-Union in Deep Neural Networks for Image Segmentation](https://link.zhihu.com/?target=https%3A//www.cs.umanitoba.ca/~ywang/papers/isvc16.pdf)，虽然本文没有与其进行比较，但作者在github中说本文对Jaccard loss光滑延拓得到的loss要比Dice loss那样简单的光滑化(连续画处理)效果好。
- Jaccard loss通过lovasz extension后的函数是凸的，是否意味着整个神经网络的优化是凸优化？不是的！loss function 是凸的并不意味整个神经网络是凸的，因为网络中多层非线性操作组合得到的函数是非凸的，更准确的说，公式(6)中的 
![](https://www.zhihu.com/equation?tex=M_c) 以及公式(8)中的 
![](https://www.zhihu.com/equation?tex=m_i) 是非凸的。
- 本文的Lovasz loss一定比医学图像分割中常用的Dice loss好吗？不一定！[作者的学生](https://link.zhihu.com/?target=https%3A//icerm.brown.edu/video_archive/%3Fplay%3D1894)在医学图像数据集上做了比较，尽管lovasz loss在数学上有很好的性质，但跟Dice loss比没有发现具有统计意义的优势。
![](https://pic3.zhimg.com/v2-4e29fd7959f7bc2e516891def647bc9e_r.jpg)
- 使用注意事项作者在[代码首页](https://link.zhihu.com/?target=https%3A//github.com/bermanmaxim/LovaszSoftmax)提到，最好跟cross entropy组合使用，或者先用cross entropy训练网络，然后在用本文的lovasz loss finetune.
参考资料

- [Submodularity and the Lovász extension](https://link.zhihu.com/?target=https%3A//sudeepraja.github.io/Submodular/) 
- [Step by step exlanation of the important steps of the lovasz loss code](https://link.zhihu.com/?target=https%3A//www.kaggle.com/c/tgs-salt-identification-challenge/discussion/67791)
- [Iou is not a submodular function](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1809.00593.pdf)
- [Yes, IoU loss is submodular](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1809.01845.pdf)