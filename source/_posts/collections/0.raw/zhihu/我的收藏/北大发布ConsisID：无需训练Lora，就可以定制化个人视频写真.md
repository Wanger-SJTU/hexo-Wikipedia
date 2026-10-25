---
title: (2 条消息) 北大发布ConsisID：无需训练Lora，就可以定制化个人视频写真
date: "2024-11-30 00:00:00"
updated: "2024-11-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/北大发布ConsisID-无需训练Lora,就可以定制化个人视频写真/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/10004384702
---


![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8598ef15be9c.jpg)

**

这两天，北京大学等研究团队发布了一个视频生成的可控生成工作：ConsisID**。ConsisID可以实现无需训练Lora的保持参考人脸一致性的文生视频，类似之前图像生成的IP-Adapter-Face和InstantID等工作。虽然之前也有类似的工作，但是ConsisID在效果更上一个台阶。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ec5580cf42d2.jpg)01:30

而且，ConsisID的模型、代码以及训练数据已经开源：

- 模型：[https://huggingface.co/BestWishYsh/ConsisID-preview](https://link.zhihu.com/?target=https%3A//huggingface.co/BestWishYsh/ConsisID-preview)
- 代码：[https://github.com/PKU-YuanGroup/ConsisID](https://link.zhihu.com/?target=https%3A//github.com/PKU-YuanGroup/ConsisID)
- 训练数据：[https://huggingface.co/datasets/BestWishYsh/ConsisID-preview-Data](https://link.zhihu.com/?target=https%3A//huggingface.co/datasets/BestWishYsh/ConsisID-preview-Data)
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d4a0dff0ead8.jpg)

**

ConsisID是基于目前主流的DiT**来实现的，准确地说是基于目前开源的文生图视频模型**CogVideoX-5B**。首先，作者团队发现**DiT架构相比之前的UNet架构有一些不同**。对于DiT架构，有两处比较关键的发现：首先低级（例如，浅层）特征对于扩散模型中的像素级预测任务至关重要，这有助于促进模型训练；然后是transformer对高频信息的感知有限，而这对于可控生成非常重要。基于这些发现，ConsisID在实现上将人物ID特征解耦为高频和低频部分，并将它们注入到特定位置，实现了有效的保持身份一致性的文本到视频生成。具体架构如下所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d3528e8044b4.jpg)

可以看到，ConsisID包含两个部分的特征提取。首先是一个全局的面部特征提取，这里采用的是裁剪的人脸图以及人脸的5个关键图RGB图，并采用视频VAE提取latent tokens，和视频的带噪音的latent tokens拼接在一起送入DiT模型中。然后是一个局部的面部特征提取，这里是采用CLIP和人脸识别模型分别提取人脸特征，并通过一个Q-Former模块来融合特征，并在DiT的Attention和FFN之间新插入Corss Attention来注入融合的特征。

在训练策略上，ConsisID除了采用扩散模型常规的MSE loss，还额外设计了两种loss。首先是Dynamic Mask Loss，这个主要是在训练过程以一定的概率只训练人脸区域的loss，让模型更专注于学习人脸特征。然后是Dynamic Cross-face Loss，这个主要是为了防止生成视频中人脸的“复制-粘贴”问题，具体是策略是训练过程中的参考人脸图像有一定概率不是来源于要生成的视频中。

在效果上，ConsisID相比之前的方法比如ID-Animator可以生成人脸更一致的视频，而且视频的质量和文本响应也更好。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3d66aedec017.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8ac301819078.jpg)

这里也放一些官方给的demo，整体上给人的感觉还不错。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_60165f2d83e2.jpg)

参考人脸

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7ffb484aafa4.jpg)00:06

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d527f36972f0.jpg)00:06

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9b66082a4f2b.jpg)00:06

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_91fc1fb6a8d9.jpg)00:06

另外，目前还有一个HuggingFace上的体验demo：[https://huggingface.co/spaces/BestWishYsh/ConsisID-preview-Space](https://link.zhihu.com/?target=https%3A//huggingface.co/spaces/BestWishYsh/ConsisID-preview-Space)。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_757a6600e4ae.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_4bbaca626ffb.jpg)00:06