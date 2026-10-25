---
title: CNN中，增加Padding过后，为我们带来的那些负面影响。
date: "2019-05-19 00:00:00"
updated: "2019-05-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/CNN中,增加Padding过后,为我们带来的那些负面影响。/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/66289618
---


![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_1f9eefbc95de.jpg)

如上图所示:

第一行为普通3x3卷积，步长1，padding 0,

第二行为普通3x3卷积，步长1，padding 1,

第三行为膨胀3x3卷积,dilation rate=3，步长1，padding 3.

上图箭头右向所指，为cnn底层在caffe 和darknet的底层实现，用c或c++，至于pytorch和tensorflow 是否也是这样实现cnn我不清楚，但是目前来讲，有效实现卷积的也就3种方式，

im2col(上图) ，winograd, FFT，但是还是im2col比较常见，winograd好像是商汤最近几年提出来的，通过特殊数学计算方式，减少计算量，目前该方法被应用在腾讯移动端深度学习框架NCNN中，至于FFT，还没见到用在深度学习种。

至于为什么使用im2col,这还是贾清扬大神在写caffe时提出来的，因为图像中，一个块内的像素点在内存中是地址不连续的，所以对于同一个块内的像素想要缓存到cache上，可能出现多次内存访问，效率极低，所以设计出im2co方式，提前将需要计算的像素点放在连续地址上。

因此，对于同一图像，除了原始图像在内存中占空间，使用im2col又会消耗另一份空间。

如上图所示,对于8x8的图像:

不加padding,计算量为9x36=324, 内存消耗为8x8=64,有效内存为=1

加padding=1,计算量为9x64=572,内存消耗为10x10=100,有效内存为=0.64

加dilation_rate=3,padding=1,计算量为9x64=572,内存消耗为14x14=196，有效内存为=0.32

在上图中可见，添加padding=1就可对内存造成1-0.64=0.36的内存损失，当使用dilation_rate=3时，内存损失为1-0.32=0.68

假如，我们为存储图像分配1个G大小空间，为使用im2col后的图像在分配1个G大小的空间，当我们使用dilation_rate=3之后，有效内存，也就是真正的像素所占的内存仅仅为2x0.32=0.64G。

以上例子为当图像或是特征大小为8x8的情况，假设我们的图像或是特征大小为100x100

那么使用dilation_rate=3，有效内存占比为（100x100）/(106x106)=0.88，有效内存还是挺客观的。

对于8x8的如此小的特征，在我们的网络中一般都出现在网络的深层，而对于100x100的特征，在我们的网络中一般都出现在网络的浅层。因此在网络不同的层中，合理使用dilation，

可以更高效的使用我们的内存。
