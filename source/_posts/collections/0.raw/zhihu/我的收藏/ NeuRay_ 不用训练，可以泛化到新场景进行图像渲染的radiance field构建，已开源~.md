---
title: "(1 条消息) NeuRay: 不用训练，可以泛化到新场景进行图像渲染的radiance field构建，已开源~"
date: "2022-04-09 00:00:00"
updated: "2022-04-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/NeuRay_-不用训练,可以泛化到新场景进行图像渲染的radiance-field构建,已开源~/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/495709285
---


厚着脸皮来宣传一下我们CVPR2022的论文：Neural Rays for Occlusion-aware Image-based Rendering。这篇论文主要是用于新视角图像合成（Novel View Synthesis，NVS）任务：给定一些关于某个场景的图片，合成其他任意视角下关于这个场景的图片。我们的目标主要是提出一种不用在新场景上训练，而能够直接泛化到新场景下进行新视角图像合成的方法。

下面是我们模型泛化到一个新场景(我女票的手办们)的效果。这里我拍了大概35张图片，然后通过合成新视角图片得到的一个视频。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_413a969615c2.jpg)00:10

新场景下NeuRay渲染效果

论文链接：

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_960a86f39fe0.jpg)Neural Rays for Occlusion-aware Image-based Renderingarxiv.org/abs/2107.13421](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2107.13421)

论文主页：

论文代码：（包含如何生成上述视频的介绍）

[](https://link.zhihu.com/?target=https%3A//github.com/liuyuan-pal/NeuRay)

<strong>太长不看 (tl; dr)</strong>：给定输入图像，我们通过提取图像特征并且进行特征匹配在线构建了一个radiance field用于渲染新视角图片（与已有工作IBRNet，PixelNeRF，MVSNeRF，GRF，SRF类似）。我们的主要贡献是：针对场景中的复杂遮挡关系导致的渲染不准确问题，我们提出一种新的表达NeuRay；它通过编码每个输入图像到空间点的可见性，能够快速有效地帮助推断遮挡关系、提高渲染质量。

下面我简要介绍一下我们paper的motivation。

<strong>背景：</strong>提到新NVS，就不得不提最近两年非常火的NeRF。NeRF将场景建模为一个由MLP编码的radiance field；这个MLP将输入一个3D点坐标(x,y,z)映射为该点的density和RGB颜色；然后NeRF利用volume rendering技术从这个radiance field渲染图片。NeRF取得了非常好的效果，但是有个问题是这个MLP是和给定的场景绑定的，所以对于每个新的场景都需要重新训练NeRF。

是否能够设计一种可以泛化到新场景的NeRF呢？答案是肯定的。有一系列工作IBRNet、PixelNeRF、MVSNeRF、GRF，他们都是通过类似多视图重建（MVS）的方法，构建一个radiance field，去计算每个点的density和RGB颜色。如下图所示，给定一个3D点，这些方法首先把这个点投影到所有的输入图像上，看看这个点在各个图像上的局部特征是不是一致的。如果是，那么这个点就应该有比较大的density，表示这里有一个表面；如果不是，那么这一点的density就应该为0，表示这里没有表面。同时，该点的颜色可以通过投影到各个view下的投影点的颜色决定。最后通过volume rendering渲染得到光线对应像素的颜色。通过这种在线构建radiance field的方式，这些方法能够直接利用输入图片去渲染新视角下的图片，从而泛化到新场景下。但是这样泛化到新场景情况下的效果依然不够好，存在比较多的错误。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a836a72df4a8.jpg)

通过判定局部图像特征是否一致，我们能够得到一个点是否存在表面（图片来自Stereo Radiance Field [CVPR2021]）<strong>分析：</strong>我们分析了一下这些模型，发现难以处理的问题大多集中在存在遮挡的边缘。如下图所示，(a) 所有输入图片对某个点的局部特征都一致，那么它肯定是一个表面、拥有比较大的density，但是如果他们并不是特别一致如(b) (c)所示，那么这里的不一致可能是由于遮挡导致的（依然有比较大的density），也可能这一个点并不是一个表面（没有density）。这就容易让模型比较困扰，到底要多不一致就算这一点没有density呢？这尤其在我们这个新视角图像合成的任务中会比较困难，因为我们并没有场景几何的真值用来做监督信号。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ced7a175e1c.jpg)

当输入图像的局部特征不一致(inconsistency)的时候，我们比较难以判断这个3D点上到底有没有表面，是因为遮挡导致的？还是因为这一点就是非表面点？<strong>解决方案：</strong>我们的key idea很简单：如果我们知道了每个输入图片对空间中一个点是否是可见的，那么我们就可以比较容易的分辨这里的不一致是来自于(b)这种情况，还是(c)这种情况。基于这个idea，我们提出一个叫做Neural Rays （NeuRay）的场景表达。NeuRay表示为每张输入图像上的一个HxWxC的特征图。将空间中一个3D点投影到这张输入图像上，我们可以通过在这个HxWxC上插值得到这一点的特征向量，然后通过这个特征向量计算得到这个3D点对于这个输入图像的可见性(visibility)。最后，这个可见性会被放到前文提到的的radiance field构建中去判定consistency与inconsistency，从而更加准确的得到每个点density和color。确定了大致方案思路，我们依然还有一些问题没有解决：

问题1：NeuRay怎么来？计算可见性需要知道场景中哪里有表面存在，而可见性正好是为了去帮助更好判断哪里有表面存在，这就变成了一个蛋和鸡的问题。我们这里的解决办法是先利用一次MVS，例如在每个输入图像上利用MVSNet的方式构建一个cost volume。cost volume隐含了场景中的表面在哪，然后我们从这个cost volume里面提取出我们需要的NeuRay的特征图（我们把这个过程称为NeuRay的初始化。）。这样，特征图就包含了场景的几何信息，可以用来计算可见性了。我们再用可见性去帮忙构建radiance field。类似的，我们也可以先用COLMAP的dense reconstruction得到每张图的深度图，然后从中计算得到NeuRay的特征图。

问题2：如何参数化可见性？可见性应该是一个和光线射出距离相关的函数：想象一条光线从相机射出，这条光线没有打到任何表面的时候，它的可见性应该是1；当它打到某个不透明表面的时候，它的可见性应该迅速从1下降到0，可见性是单调递减的。我们这里直接用一个累计概率密度函数t(z)来表示可见性为1-t(z)。这里我们选取了mixture of logistics distributions的累计概率密度函数（只是因为它很好算，就是用sigmoid就行）。具体可以参考paper的内容。在paper中，我们讨论了为什么我们这里不能像nerf那样用MLP编码density去表示可见性，并且比较了我们这种基于累积密度函数的表达和NeRF基于density表达的区别和联系。

完整的pipeline如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01f1a8e143ae.jpg)

感兴趣的话，可以去看看paper。除了泛化到新场景外，我们还在paper中讨论了1）在某个特定场景内finetune时，NeuRay可以引入一个记忆的机制去记住场景的几何信息，从而进一步更好的重建整个场景。 2）NeuRay可以大致估计surface的位置去加速渲染。当然，我们现在的模型也还有很多提升空间：我们主要还是基于输入图像之间的特征匹配来构建用于渲染的场景表达；当特征匹配无法进行或者比较困难的时候（例如高光表面、繁杂重复纹理等），依然会出现artifacts。欢迎大家去尝试代码，关于论文或代码的任何问题也欢迎来讨论~

相关文献
[1] Wang Q, Wang Z, Genova K, et al. IBRNet: Learning multi-view image-based rendering. CVPR 2021.
[2] Chen A, Xu Z, Zhao F, et al. MVSNeRF: Fast generalizable radiance field reconstruction from multi-view stereo. ICCV 2021.
[3] Yu A, Ye V, Tancik M, et al. PixelNeRF: Neural radiance fields from one or few images. CVPR 2021.
[4] Chibane J, Bansal A, Lazova V, et al. Stereo Radiance Fields (SRF): Learning view synthesis for sparse views of novel scenes. CVPR 2021
[5] Trevithick A, Yang B. GRF: Learning a general radiance field for 3d representation and rendering. ICCV 2021.
[6] Yao Y, Luo Z, Li S, et al. MVSNet: Depth inference for unstructured multi-view stereo. ECCV 2018.
