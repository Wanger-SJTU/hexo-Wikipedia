---
title: "IJCV | 利用Uncertainty修正Domain Adaptation中的伪标签"
date: 2020-04-14
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/130220572

---

论文题目: Rectifying Pseudo Label Learning via Uncertainty Estimation for Domain Adaptive Semantic Segmentation 

**Paper 已经被 IJCV 接收了，感谢大家的意见和帮助，真的真的真的非常感谢。 **

论文地址: [https://arxiv.org/pdf/2003.03773.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2003.03773.pdf)

作者：Zhedong Zheng, Yi Yang

代码： [https://github.com/layumi/Seg_Uncertainty](https://link.zhihu.com/?target=https%3A//github.com/layumi/Seg_Uncertainty)

![](https://pic1.zhimg.com/v2-bd93e389007b4db3ae17688f03694ed8_r.jpg)朗读版：

[](https://www.zhihu.com/zvideo/1322108221906567168)What: 

- 本文研究的是领域迁移问题中错误的伪标签(Pseudo Label)的问题，探讨了如何**自动设定阈值**来修正这种伪标签学习。
- 之前的伪标签往往通过人为**卡阈值(Threshold)** 的方式来学高置信度的伪标签(Pseudo Label)，而忽略低置信度的标签。 但是这个阈值(Threshold) 往往很难决定。
- 我们思考如何定这个阈值，其实会发现这个阈值取决于 source 和 target 有多接近，如果source域 和 target 域 **完全一样**，那么阈值甚至可以卡到0.999，大多数data都有很确定的label，那全部样本都可以拿来训练； 但如果source域 和 target 域 **完全不一样，** 那么阈值再怎么卡，都没有用，因为所有的pseudo label都是noisy的。
- 所以在做domain adpation的问题就在于 在实际场景中，我们往往只能凭经验来 提前设置阈值 让模型来学伪标签。这是不合理的，或者卡得太高或者太低都会影响模型学习的。所以本文我们提出用不确定性来作为阈值，等同于自动**学一个阈值出来。**How:

- 其实本质思想很简单，我们利用了分割模型中的辅助分类器（本来只是用来防止梯度消失的）。结构如下图：有一个主分类器接在res5c后面，一个辅助分类器接在res4b22. （本文研究的是图像分割， 如果您研究的是图像分类，也可以对应到分类问题中InceptionNet 系列，包括NASNet也是需要浅层辅助分类器的。）
![](https://pic2.zhimg.com/v2-f91d99ab30289b3c9fd37a9f143af777_r.jpg)
- 我们观察到 伪标签错误的地方，往往是 两个分类器预测不同结果的地方（Prediction Variance）。如下图：
![](https://picx.zhimg.com/v2-3bd56489b1ea6387b8e32af57ee07169_r.jpg)
- 所以很自然的我们对于cross-entropy loss做了一个修正：其中D{kl} 就是主分类器和辅助分类器预测结果的KL距离(也可以叫作Prediction Variance)，如果差异大，则这个距离也就大，那么Lrect 对于这种不确定的样本，就不惩罚（因为pseudo label很可能是错的）。如果没有后面+D_{kl} 这一项，模型很懒，会趋向把所有pseudo label都说成是不确定的，那么Lrect就等于0了。为了避免这种情况，所以我们加了一个+D_{kl} 。
![](https://pic1.zhimg.com/v2-5880b9a3b0d260711aa2e4db7fab1732_r.jpg)
![](https://pica.zhimg.com/v2-9c42d6613811798e5b71764c005382c6_r.jpg)
- 我们可以杠一下，其实原来的取阈值，是基于confidence， confidence高，model就学这种pseudo label，我们这边能不能用 confidence呢？ 答案是不太好。
- 因为pseudo label训练的时候就是增加这个pseudo label的confidence。 这样还是无法决定哪些样本可信。最后实验里，我也可视化了一下，confidence 和uncertainty的对比，如下图：（我们用的uncertainty 本质是 prediction variance，和错误pseudo label的区域有更明显的overlapping ）
![](https://pica.zhimg.com/v2-471e0a57787c793dc9d988b49bdf4846_r.jpg)
- 同时，我们方法对于一些segmentation里面占得面积小的类别有奇效。因为传统方法按照confidence一刀切。往往数量小的类别（自行车Bike和骑行人Rider）这种类别吃亏，因为confidence score往往只有0.7，0.8，会被0.9的硬阈值卡掉。
- 最后我们的方法可以在 两个常用benchmark （GTA5->Cityscapes 和 SYNTHIA -> Cityscapes）上有提升。并且和其他方法是互补的关系。 在一个小数据集上也有提升，但是由于类别比较少，所以提升不是很明显 (Cityscapes->Oxford RobotCar)。 
![](https://picx.zhimg.com/v2-c2c05c1c50e02f58a8b2af5d29cb059d_r.jpg)
![](https://picx.zhimg.com/v2-58357e1273cf70101ff53e9e3396f8c3_r.jpg)
![](https://pic2.zhimg.com/v2-7d7894f702607cedb6f0afb6e6f60e17_r.jpg)

感谢看完～～ 欢迎点赞转发评论~~也可以check我的一些其他文章

[郑哲东：NVIDIA/悉尼科技大学/澳洲国立大学新作解读：用GAN生成高质量行人图像，辅助行人重识别](https://zhuanlan.zhihu.com/p/66408913)[郑哲东：用CNN分100,000类图像](https://zhuanlan.zhihu.com/p/33163432)[郑哲东：【新无人机数据集】从 行人重识别 到 无人机目标定位](https://zhuanlan.zhihu.com/p/110987552)[Pytorch有什么节省显存的小技巧？](https://www.zhihu.com/question/274635237/answer/573633662)本文有一处勘误，公式7的 KL Divergence 中多加了负号，目前已在arXiv上更新了。感谢 [@王晋东不在家](https://www.zhihu.com/people/4548fa13d3ec9a64b413b79d0893a238) 提出的意见和帮助。