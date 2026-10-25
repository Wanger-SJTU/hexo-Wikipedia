---
title: "为什么要压缩模型，而不是直接训练一个小的CNN？"
date: 2018-12-07
tags: [知乎]
source: https://www.zhihu.com/question/303922732/answer/547325762

---

专门做这个方向的，说一下自己的观点吧。

首先，“直接训练一个小的CNN”这个说法并不是很恰当，因为你需要一个前提：已经有一个设计好了的小模型（VGG19 ResNet152这种大模型并不是石头里面蹦出来的，也是人家精心设计、试错才推出来的）。所以这边就涉及到了一个问题：如何设计一个小模型。

然鹅，整个模型加速算法体系中就有一个分支专门研究这个问题，美其名曰：**精简网络设计**。典型的代表就是 SqueezeNet MobileNet v1/v2 ShuffleNet v1/v2 IGC v1/v2/v3。看起来很多，本质上都是在group卷积的前提下工作的。

其次，压缩/加速一个模型是为了更好地让其进行部署，譬如部署到手机，FPGA，无人机上去。一个是pretrained model，一个是 the compact version，两者精度一般差不多，后者功耗会低很多，当然要压缩/加速模型。（如何保证精度差不多那是算法的事情）

再者，使用一些加速压缩算法去push一个模型，不但可以得到更快更小的模型，而且精度还可以超出所给的pretrained model（这个一般通过加速压缩算法中的**distillation**技术实现）。显然地，锦上添花的一件事情。

更锦上添花的事情：压缩算法还可以将模型push到 low-bit（通过**quantization**实现），实现硬件级别的加速。典型的工作，BinaryConnect、BNN、XNOR-Net。这方面的工作以后势必会合深度学习芯片协同设计，更是可以极大地加速一个模型，很具有实际意义。

最后，模型加速算法体系中的各个分支算法可以叠加使用，譬如你先过一遍pruning再来一次quantization，加速效果嗖嗖的。

忘了说，这个体系一般分：**1）pruning 2）quantization 3） knowledge distillation 4）low-rank decomposition 5）compact architecture design 这几个分支的方法。**（还有其他的比较小众而且实际意义不是很大的就不提了）

贴两篇综述：**A Survey of Model Compression and Acceleration for Deep Neural Networks （**[[1710.09282] A Survey of Model Compression and Acceleration for Deep Neural Networks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1710.09282)**）**

**Recent Advances in Efficient Computation of Deep Convolutional Neural Networks（**[[1802.00939] Recent Advances in Efficient Computation of Deep Convolutional Neural Networks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1802.00939)**），**总结地还是很不错的。