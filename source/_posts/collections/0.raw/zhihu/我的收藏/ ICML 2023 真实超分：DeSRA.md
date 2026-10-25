---
title: (1 条消息) ICML 2023 真实超分：DeSRA
date: "2024-01-07 00:00:00"
updated: "2024-01-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/ICML-2023-真实超分-DeSRA/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/676307954
---


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_93c8ad0868f8.jpg)

paper：[https://arxiv.org/pdf/2307.02457.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2307.02457.pdf)

董超组 & 腾讯ARC Lab ICML的新作，思路也是非常好的一篇真实超分工作。


#### Motivation

GAN-SR模型会产生伪影，作者将其分为两类：

GAN-training artifacts

训练阶段产生的伪影，产生原因是GAN训练的不稳定与SR的ill-posed特性（这里可以理解为SR的目标解不是确定的，因此可能会产生除了GT之外的值，这里就是伪影）。这些伪影可以用GT做监督，改善训练过程从而尽可能去除。

代表方法LDL(CVPR 2022)，这篇文章的解析可以参考我的另一篇文章：

[](https://zhuanlan.zhihu.com/p/673945670)

<strong>GAN-inference artifacts</strong>

推理阶段在测试数据上产生的域外伪影，由于这些伪影在训练阶段无法被合成，因此用处理合成数据训练阶段伪影的方法无法处理这些推理阶段的伪影，并且模型的泛化能力无法处理这些域外伪影。

由于真实超分的最终目标就是处理测试数据，因此解决第二种伪影才是更为关键的且富有实际意义的。


#### Preliminary

SR方法可以分为MSE-based和GAN-based，MSE-based方法是只用reconstruction loss去尽可能让SR results接近GT，减小二者的像素距离；而GAN-based方法是用GAN去提升感知质量。

由于GAN训练不稳定，很多GAN-SR的方法都是先只用Reconstruction loss预训练一个MSE-based SR模型，然后加上GAN loss（perceptual+adversial）fintune得到最终的模型。

#### Method

MSE-based方法会导致图像过于平滑，GAN在产生细节的同时会产生伪影，有的甚至比MSE-based方法还要多，如下图。并且这些伪影很复杂。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a57336d56c98.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ec628c44185d.jpg)

GAN-inference artifacts有以下两个特性：

- 这些伪影没有出现在MSE-SR模型，也就是说这些伪影是训练GAN产生的。这样可以通过MSE-SR的结果去判断测试数据的伪影。
- 这些伪影占的区域较大并且很明显，可以一眼看出。那么处理这些伪影可以显著提升可视化结果。
关于GAN-inference artifacts出现原因的探索：

一些能够轻微改变退化的操作，比如加噪声、缩放等，可以减少伪影。这些操作实际上是将真实场景退化更加接近合成数据退化，因此可以看出这个伪影产生的部分原因是out-of-distribution。同时，训练的不稳定也会导致这样的伪影的出现。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_367dd71cbdd1.jpg)

Automatically Detect GAN-inference Artifacts

由于缺少GT，因此使用MSE-SR的结果和GAN-SR的结果进行比较用于检测伪影。

比较的是两种结果patch之间的标准差差异。一般而言，具有相似纹理的结果标准差差异较大意味着存在伪影。

$$\sigma(i, j)=s d\left(P\left(i-\frac{n-1}{2}: i+\frac{n-1}{2}, j-\frac{n-1}{2}: j+\frac{n-1}{2}\right)\right) $$

d(x, y)=\left(\sigma_x-\sigma_y\right)^2 

但是这样会有一个问题，如果一个patch本身纹理较为复杂，那么计算出的标准差会很大，那么相对而言两个结果之间patch的标准差也会较大，这样可能会造成误判。如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ea9fd9d8efe.jpg)

a行是具有相似纹理的两对结果，上面的结果没有伪影，计算出标准差差异较小，下面的结果有伪影，计算出的标准差差异较大；b行是不同纹理的两对结果，标准差差异都较大，但是上面的树没有伪影而下面的楼房有伪影，这就涉及到之前LDL中提到的B类与C类纹理的区别，b类树的纹理比较无规则，没有明显的结构先验，更为复杂多变，因此本身标准差就较大，差异也相对较大；c类楼房的存在明显、清晰、规则的纹理变化和结构先验，因此标准差差异大意味着存在伪影。那么单纯使用标准差差异去判断伪影则可能会产生误判，因此要做一个归一化，去除本身纹理复杂性带来的方差差异，从一个绝对标准差差异得到一个相对标准差差异。

$$d^{\prime}(x, y)=\frac{\left(\sigma_x-\sigma_y\right)^2}{2 \sigma_x \sigma_y} $$

$$进行一个类似SSIM的变换：** d^{\prime \prime}(x, y)=\frac{1}{1+\frac{\left(\sigma_x-\sigma_y\right)^2}{2 \sigma_x \sigma_y}}=\frac{2 \sigma_x \sigma_y}{\sigma_x^2+\sigma_y^2} $$

$$D=\frac{2 \sigma_x \sigma_y}{\sigma_x^2+\sigma_y^2+C} $$

注意，这里由于做了变换，原本是值越大越有可能存在伪影，变换后的值越小越可能产生伪影。

Semantic-aware adjustment

这里提到了一个perceptual tolerance rate，具体而言就是LDL中提到的B,C区域的区别，复杂的无规则纹理，比如树、毛发等，伪影不容易被看到，perceptual tolerance rate较大；而规则的纹理出现的伪影容易被看到，如天空、海面等，perceptual tolerance rate较小。那么根据perceptual tolerance rate，需要对原来的纹理差异评估进行修改，直观的方法就是对于perceptual tolerance rate较大的，也就是复杂无规则纹理，其伪影的判别条件也应该更为宽松；而对于perceptual tolerance rate较小的，也就是有规则纹理，其伪影的判别条件应该偏向严格。这里宽松与严格的控制就需要一个adjustment weight。

那么下面分析一下计算adjustment weight的具体操作：

首先用DIV2K的训练集经过退化生成LR图像，然后分别生成MSE-SR结果和GAN-SR的结果，对结果计算D；接着用SegFormer对MSE-SR结果进行语义分割得到segmentation map，根据这个map和D，可以得到语义分割每个类别不同的D值，对每个类，降序排序D值，取85%的分位数作为该类的adjustment weight。

$A_k=P_{85}\left(D_k\right), k \in\{1,2, \ldots, K\} $

A_k 是第 k 类的adjustment weight， D_k 是第 k 类的所有D值。这个weight越低代表该类的perceptual tolerance rate越大，这一点在LDL中有一些解释，即A类纹理，Smooth areas / Large-scale structures，GAN复原的难度较低，不容易产生伪影，而B类Texture-like aliasing details和C类Fine-scale aliasing structures更容易产生伪影，相对来说最为复杂的B类最容易产生伪影，因此其85%分位数的D值最低，其次是C类，最高是A类，在DeSRA论文中展示的分别是tree，building，sky，如图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bd439ec1692f.jpg)

那么根据上面的adjustment weight得到的 the refined detected map如下：

M(i, j)= \begin{cases}0, & D(i, j) / A_k \geq \text { threshold } \\ 1, & D(i, j) / A_k 

相对而言，A的值较小，意味着容易出现伪影，但其perceptual tolerance rate较大，那么其伪影的判别条件也应该更为宽松，用A对D进行scale，会使得D值相对增大，不容易低于threshhold，那么就不容易被判定为伪影。

morphological manipulations

最后会加一些形态学操作，具体而言，主要是膨胀(dilation)与腐蚀(erosion)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ae30a0b94c53.jpg)

总体流程如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4cd1e4f40e9a.jpg)


Improve GAN-SR Models with Fine-tuning

检测出伪影之后，就是要去除伪影。这里有一个观点是："weak restoration without artifacts is even better than strong restoration with artifacts"，也就是说，相较于有伪影的好的复原（这里指可视化效果更好的GAN-SR结果），没有伪影的差的复原（这里指可视化效果较差的MSE-SR结果）更好。当然这一点并不是说明MSR-SR的结果比GAN-SR的结果要好，只是为了引出作者去除伪影的方法，即在存在伪影的部分用MSE-SR的结果去替代GAN-SR的结果，得到的是pseudo GT：

$\tilde{y}=M \cdot y_{M S E}+(1-M) \cdot y_{G A N} $

Finetune的过程如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a99aaee6e71e.jpg)


#### Experiments 

Model：**RealESRGAN, LDL，SwinIR

<strong>Datasets</strong>

提出了一个GAN-SR artifacts dataset，具体而言，选取ImageNet-1K的验证集作为LR，对每个模型（RealESRGAN, LDL, SwinIR）分别选200张带伪影的GAN-SR图像构建数据集。由于没有GT，因此人工标注伪影区域，如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8b1cd0cca28d.jpg)


Evaluation

由于没有GT，传统的有监督指标PSNR, SSIM就无法使用，并且作者发现了无监督指标NIQE, MANIQA不能很好地匹配可视化效果，因此作者提出了三个评价指标：IoU, precision和recall

<strong>IoU</strong>

计算检测出的伪影区域和GT伪影区域的IoU，使用验证集上平均IoU作为评价指标

$$\mathrm{IoU}=\frac{A \cap B}{A \cup B} ，A是检测出的伪影区域，B是GT伪影区域$$

<strong>Precision</strong>

检测出伪影区域的图像S中，正确检测T的占比。这里的正确检测定义为：

$$p\right\}">\mathrm{T}=\left\{z \in S \mid \frac{A \cap B}{A}>p\right\} $$

Precision= N_T / N_S 

<strong>Recall</strong>

GT伪影图像中，正确检出R的占比，这里正确检出定义为：

$$p\right\}">\mathrm{R}=\left\{z \in G \mid \frac{A \cap B}{B}>p\right\} $$

Recall= N_R / N_G 

注：可以理解为精确率关注被检测为伪影的区域中有多少是真正的伪影，而召回率关注于所有真正的伪影有多少被检测出来。


Results

具体实验是用NIQE, PAL4Inpainting, LDL*（这里把LDL的GT换成了MSE-SR结果），实验结果如下：

伪影检测的实验结果

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5c8f580027b8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_96066da69752.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8b5393923ae6.jpg)

伪影去除的实验结果

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5a57be748158.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7d7a6648a6b.jpg)

IoU的明显下降代表伪影被去除。


User Study

作者进行了用户调研，让参与者对Finetuned GAN-SR结果和GAN-SR，MSE-SR结果分别进行比较，主观判断哪一种伪影更少，结果如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8a96566552af.jpg)


Ablation Studies

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c1c56a3e4489.jpg)

#### 可视化结果

不同方法的detection map可视化

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a52be26bda83.jpg)

可以发现DeSRA最为准确

使用了DeSRA的伪影去除效果

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c13c0910c6e4.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_51145f1ff2cf.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dcfec491786e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6181de4dc688.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f6a7118fa7f4.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d5ecf41a7102.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5880ff8e27b0.jpg)

补充：NIQE与MANIQA的结果不能代表可视化效果：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2c2520a7919c.jpg)

可以发现左边一列的效果不如右边一列，但与指标的结果相反，因此这两个指标不能很好地反映可视化效果。
