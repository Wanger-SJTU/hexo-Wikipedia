---
title: "Deformable Convolution  v1, v2 总结"
date: "2019-08-18 00:00:00"
updated: "2019-08-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/Deformable-Convolution-v1,-v2-总结/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/77644792"
---


最近在复现其它文章时，发现他们用了 DCN 的网络。这里就总结下 Jifeng Dai 的关于 Deformable Convolution  的这两篇文章。文章挺有 insight 的。

                                                   Deformable Conv v1
这篇文章其实比较老了，是 2017 年 5 月出的

## 1. Motivation


### 1.1 Task 上的难点

视觉任务中一个难点就是如何 model 物体的几何变换，比如由于物体大小，pose, viewpoint 引起的。一般有两类做法：

- 在数据集上做文章，让 training dataset 就包含所有可能的集合变换。通过 affine transformation 去做 augmentation>
- 另一种就是设计 transformation-invariant (对那些几何变换不变）的 feature 和算法。比如 SIFT 和 sliding window 的方式。文章说上述两种方式有问题，几何变换我们是事先知道的，这种不能 generalize 到其它场景和任务中。以及 hand-crafted 的设计适应不了负责场景。

### 1.2 CNN 的缺陷

对于geometric transformation 的问题，目前的 CNN 主要是通过 data augmentation 和一些手工设计，比如 max-pooling 解决的（max-pooling 只能解决一些很小程度的变化，比如字母 A 稍微倾斜了一下)。

CNN 的主要问题就在于它的采样操作是 fixed 的。每个点的 receptive field 是一样大的，对 high-level 的语义不太好。

## 2. Controbution & Details

主要提出了两个模块，Deformable Conv 和 Deformable Pooling。他们的优点是很方便的嵌入的已有的模型中，不需要额外的监督信号。

![](https://pic1.zhimg.com/v2-69ebb5db3790104bae626dae7023bd36_r.jpg)这张图很好的诠释了 deformable conv 是怎么做的

### 2.1 Deformable Convolution


![](https://pic2.zhimg.com/v2-0506ad3d76292047ddf69a35e3989a67_r.jpg)这个操作很好理解，用另一个一样大小的卷积去学 offset, channel 数是 2N。 N 是 kernel 的面积。比如说，对于 3x3 卷积，也就是说每个 output 点，在 Input feature map 上都有 9 个点要算，N=9, 对于每个点，都有 x 和 y 方向上的 offset。

这里的 N 实际上是 kernel 里的 sampling location 数。如果 3 x 3 的 kernel 的话，N = 9。 在deformable conv v2 的 paper 解释的比较清楚。网上的[文章](https://zhuanlan.zhihu.com/p/37578271)里的解释，其实是错误的。

如果你去看它的代码的话，会发现它还有一个参数，叫 deformable_group,  这个参数在 paper 里是没有被提到了，具体的解释可以参考这个[issue 回答](https://link.zhihu.com/?target=https%3A//github.com/msracver/Deformable-ConvNets/issues/268)。

这里稍微不好想是怎么求反传导数

![](https://pic4.zhimg.com/v2-110fa8121db0117ba10d20c13decc861_r.jpg)
![](https://pic4.zhimg.com/v2-3cbd9946a25f35d2137b58a69e892c6d_r.jpg)
![](https://pic3.zhimg.com/v2-d22bab929c2b87b0ed2af8acffb16b14_r.jpg)
![](https://picx.zhimg.com/v2-02abba237c47a6abe96032375438e95b_1440w.png)这里是 forward 的形式，之前的铺垫公式笔记简单，读者可自己看一下。这里，\delta p 就是 offset。用 bilinear sampling 来计算任意位置的 feature 大小。反传公式在这里

![](https://pic1.zhimg.com/v2-cc7da5d9a77a5b2a62cd0c7f0e6379ce_r.jpg)

但是具体在算 offset 的时候，用了几个 conv, 有什么 trick， 它并没有提，需要看 code。

### 2.2 Deformable Pooling


![](https://pic3.zhimg.com/v2-5a9f67b040c068422f8a5f136eb58592_r.jpg)这个操作其实是相似的，每个小区域都有一个 offset。 

先用标准的 ROI pooling 生成真正的 pooled feature maps, 然后一个 fc layer 生成 normalized offsets(作者说这个想让 offset 的学习不依赖于 ROI 的大小），最后的 offset 是 normalized offset 乘上 ROI 的 size（指的是 pooling 之前的区域的大小）。

之后还介绍了 position-sensitive（PS) ROI Pooling，也是有疑问，感觉作者想的非常不清楚。在 PS ROI pooing 里，先得到原图大小的 offset field, 那 ROI 里的一个小区域里的 offset 是怎么得到的？

## 3. Experiments 

conv 和 fc layer 一开始是 zero weights.  fc layer 的 learning rate 是该层的 0.01，conv 层不变。

论文说在网络的最后 3 层（ kernel >1 的层）加 deformable conv 比较有效果。

## 4. Performance 

他们对 detection 和 segmentation 任务都有帮助。

![](https://pic1.zhimg.com/v2-4493f732d6d0d54dae5e48ca82da0f74_r.jpg)
![](https://pic4.zhimg.com/v2-b84a92678fe69f7e7f91d274eb8c4e87_r.jpg)上面的 visulization 做得很好，如果一个点往回推算，可以看到 sampling 点是不规则的，都集中指定的物体部分。

数值上

![](https://pic1.zhimg.com/v2-5644a03708e35b231da3bdc14249d716_r.jpg)可以看到在 stage5 的最后三层放 deformable conv，就已经饱和了。在 Faster R-CNN 上有 0.6 个点的提高，AP@0.7 上有 2 个点提升(以 0.7 为阈值算正类，说明预测的 bbounding box 更准确了）。 这上面看好像只有一个点的提升。

文中定义了一个新的 metric,  叫 effective dilation，但是没有完全看懂。

如果把标准 resnet 最后几层的 conv kernel 里的 dilation 变大，效果会更好。

![](https://pic2.zhimg.com/v2-a2e8bc2799c5721529274fb767be0d67_r.jpg)可以看到 deformable conv 涨了 0.5 个点，再加上 deformable pooling 涨了 0.7 个点。 总共能涨 1.2 个点左右。

![](https://pic4.zhimg.com/v2-a76c9920a108f2e7f0ac189e4bff63ed_r.jpg)在 params 和速度上的比较。可以看到，param 上的 overhead 其实并不多，说明性能的提升是来自于方法上的优势，而不是 params 上的增加。

总体来说，实验上验证了 deformable conv 的有效性：

- 1) 直接在 resnet 上加，尝试不同位置 
- 2) ablative study 上验证了 deformable conv 和 deformable pooling 
- 3) 尝试了在大小物体上验证，这个我没想到
- 4) 和之前的方法对比，比如 dilated conv, 验证是灵活的 dilated conv，这个也没想到
- 5) 计算了 param 的复杂度，和运行时间

## 5. Discussion


- 文章也提到了，它和 STN 以及 Deformable part models 有点像。STN 的细节我还不是特别了解，希望以后有空能仔细看一下。 文章把这个相似性放在 intro 的最后说，写作上值得学习。
- 我们其实可以把图片想象成连续空间，只是我们的相机做了规则的采样。
- 文中引用了一篇 Raquel 的文章，说有效的 receptive field 其实并没有我们想象的那么大。随着 layer 数 N 的增加，它是以 sqrt_root(N) 增长的。
- 应该用更小的网络试试，deformable conv 是否可以把网络深度降下来，这样其实等价节约参数，在小网络上可以试一试。
- [这篇文章](https://www.zhihu.com/question/57493889/answer/153146259)认为是稀疏约束的作用，就是说加了 offset 之后，相当于用了更大 kernel 的标准卷积，但是采样的数量是非常少的。deformable conv 就不用在 weight 上加约束了。
- 另外我也想到了用采样来代替权重的方法，但是这样的话，权重就都是正值了。这个需要再想一下。
- 另一个思路是，从 kernel 的角度看，输入的 feature 其实是形变了（把 offset 得到的点，又变回 3x3 的矩形，这样就认为把输入给形变了，只不过这样的形变是局部的，每个 local 上的形变可能不一样，不是全局形变）
## 6. 问题


- 在 bilinear sampling 中，每个任意点是受邻居四个点影响的，但是如果 weight 的更新让他们进入了另一个 grid 中，他们的值会发生非常大的变化。这样会不会让训练不稳定？ 难道网络倾向于让 offset 在同一个 grid 中更新？   (来自这篇[文章](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/daihengchen/p/6880774.html)）
## 7. Future 


- 在视频上是不是可以用一下，时间维度上的 offset ? 可是是文中提到的 [2] ?
- 在 figure 7 那张图里，其实 offset 后，反而有些小区域是遗漏的。这会让网络总是看一写区域。
- offset 是不是得学类别不同的，或者应该 channel 不同? 

                                                  Deformable Conv v2
说完了 v1, 聊一个新出的 v2。 Deformable Conv v1 貌似没有怎么调参，所以 performance 其实是不高的，在 v2 中他们的 performance 非常好了。发现 Naiyan Wang 在这篇对 v1 的[文章](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/Ulu8Kw4FDty-dMOu7qNxxQ)里提到过这个建议，然后 v2 就采用了。

## 1. Motivation

文章分析了 v1 版本中的问题，在使用了 deformable conv 后，还是会覆盖到 irrelevant context,  影响 performance。 所以 v2 的 contribution 基本上围绕如何消除 irrelevant context 的影响上。

为了分析 network 的 receptive field, 作者用了三个指标：

- <strong>Effective receptive fields</strong>: 它是看在原始 image 上，对每个 pixel 的扰动会对 node response 产生多大影响。
- <strong>Effective sampling / bin locations：</strong> 看对 sampling location 的扰动，能对 response 有多大影响。
- <strong>Error-bounded saliency regions:</strong> 能让 node 保持同样 response 的最小区域。在附录里，作者给了详细的介绍。在 figure(1) 中，就可以看出他们的不同。这个[回答](https://www.zhihu.com/question/303900394)中也说明了其它 paper 发现了同样的问题。

## 2. Controbution & Details


### 2.1 更多的 deformable conv

在 conv 3-5 都用了 deformable conv

### 2.2 modulated deformable conv

为了减少 irrelevant 区域的影响，我们就想办法消除这些区域。通过学习 weight, 我们可以让这些区域的 weight 变得比较小。

![](https://pic4.zhimg.com/v2-700bd1aa43f118c233273c09f19cac47_r.jpg)所以在学习 offset 的同时，我们又学习一个权重。这个权重是对每个 location 不同的。同样的操作也适用于 deformable RoIpooling。

### 2.3 R-CNN Feature Mimicking 

mimicking 的方式也是为了避免 irrelevant 信息的影响，为什么会有 irrelevant 信息，因为我们的 receptive fields 比较大，会受到 object 周围信息的影响。但是在 RCNN 中，它的输入是 cropped patch, 这个 patch 已经将不少背景信息 remove 了，如果我们让 faster-rcnn 学出来的 feature 和这个 patch 得到的 feature 靠近，就可以一定程度上消除他们带来的影响。

![](https://pic3.zhimg.com/v2-feaf1a69076f1eabe3cdaac959895d44_r.jpg)上图是 mimicking 的网络。用 mimicking 的工作，很巧妙的把 inference 时间提快了。

## 3. Experiments

在标准的 mask-rcnn 上修改，替换成 modulated deformable conv 和 deformable RoIPooling。

注意这里 input image 的 short side 变成了 1000，figure 4 说明了这个。对于更多的图像，因为 network 层数是固定的，所以 receptive field 没有那么多，效果变差。

文章在后面还在 imagenet 上 pretrain 了，提供了基础模型。

## 4. Performance 


![](https://pic4.zhimg.com/v2-f0b8dbec2fbe4fdde5377992bd1d0e93_r.jpg)
![](https://pic3.zhimg.com/v2-d55420a082744754b318eedb608a3fee_r.jpg)可以看到替换成 modulated deformable conv 后，区域更集中了。但是即使是 modulated conv, 还是会覆盖到一些 irrelevant 的物体上。

数值上
测试了多增加 deformable conv 层

![](https://pic4.zhimg.com/v2-b7ac49251f6f7264ca8db3f8dc645f09_r.jpg)可以看到，多增加 dconv 有 2-3 点的提升。这个在 v1 中却说 performance 会饱和，和奇怪。换成 mdeconv 能有 0.7 的提升(bbox), 0.3 个点的提升(mask)。这里应该单独看下 mdpool 的效果，以及只在 stage 5 用 mdconv 的效果。

再测了下不同 backbone 上面的

![](https://pic1.zhimg.com/v2-69cf111b8a358d695a74bc4a6d7f8a78_r.jpg)

总体上比 v1 有 2 个点的提升。

## 5. Discussion


- STN 对 feature map 做全局 affine transformation,  deformable conv 是对 local 在做。
- modulated deformable conv 是 attention 的特例。标准的 attention 对全图所有的 pixel 算 weight, 但 modulated deformable conv 只对 kernel 覆盖的区域（3x3) 算 weight, 其它区域是 0。
- 文章应该 show 一下，mdconv 学出来的 weight, 可以在 figure 1 里画出来。
- 这个[回答](https://www.zhihu.com/question/303900394)中提到对于小物体来说，增加 context 并不一定会让它变好，小物体应该通过放大物体来解决。
- 这个[回答](https://www.zhihu.com/question/303900394/answer/540956977)里说 deformable conv 仅仅比 roi align 好一点, table 1 里面可以看出来。
## 6. 问题


## 7. Future 


- 其实 modulated 那个对普通 conv 也可以用？ 不知道表现怎么样？
- 比较想知道，在对 modulated deformable conv 算完 weights 后，那些高的点，是不是是 offset 移动之前离中心近的点？ 这样就可以知道，他们到底有没有学 local context。
- 如果在 offset 和 weight 上做 dropout 会有怎样的效果呢？

Reference:

[1] [https://blog.csdn.net/u014380165/article/details/88072737](https://link.zhihu.com/?target=https%3A//blog.csdn.net/u014380165/article/details/88072737)

不得不说，deformable conv 是很 solid 的工作