---
title: "为什么 MobileNet、ShuffleNet 在理论上速度很快，工程上并没有特别大的提升？"
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/优化/为什么-MobileNet、ShuffleNet-在理论上速度很快,工程上并没有特别大的提升/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/343343895/answer/2437588261"
---


OpenPPL

高性能深度学习推理平台，QQ 群：627853444

​ 关注

很有意思的话题，分享下我组在工程方面的实践 —— 如何通过合理的优化手段，来实现模型推理速度的提升。ShuffleNet[1] 是一种高效的 CNN 结构，可在保持准确率的前提下极大地减少计算量。 ShuffleNet 架构中主要利用了两个新的操作：逐点分组卷积（pointwise group convolution）和通道重排（channel shuffle）。 

然而这种轻量型的模型结构设计，在高算力小带宽的高性能平台中发挥却会受限。

OpenPPL 通过图优化改善 ShuffleNet 的访存瓶颈，使其拥有在超高计算能力（18 核 CPU）的平台上也具备高效推理的能力，加速比高达 1.99 倍。本文将展示如何通过合理的优化手段，来实现模型推理速度的提升。

一、ShuffleNet 的瓶颈
以 torchvision model[2]提供的 shufflenetv2_x1_0 结构为例，我们分析一下它的各类算子数量，以及各类算子在推理中的耗时占比。

我们的平台是 Intel i9-10980XE@3GHz@18-core/16GBx4DDR4@3000MT/s，推理配置为 shufflenetv2_x1_0@16-batch/16-thread，统计结果如下图。

OpenPPL 已事先将 Reshape-Transpose-Reshape 的结构融合成 ChannelShuffle 

图表显示 Concat，Split 和 ChannelShuffle 三种操作占据了推理时间的半壁江山。同时，这三种操作都是数据搬移类的操作，在 16-batch 的情境下，数据量很容易因为超过 CPU 的 Cache 容量而导致带宽受限于内存带宽。 

在 16-batch 的 shufflenetv2_x1_0 推理中，出现的 ChannelShuffle 算子的数据大小有三种：16x116x56x56，16x232x28x28，16x464x14x14。其中 16x116x56x56 的输入输出数据（约 44MB）加起来已经超过了 10980XE 的 L3 Cache（约 25MB）容量，16x232x28x28 的输入输出数据（约 22MB）基本接近 L3 Cache 的容量。 

二、ShuffleNet 图优化
在 ShuffleNet 中，Concat，Split 和 ChannelShuffle 三种操作通常是同时出现的。 

OpenPPL 中通过将 Concat-ChannelShuffle-Split 以及 Concat-ChannelShuffle 这样的算子组合进行融合，以及提供相应的融合实现，将他们合并以减少内存搬运操作，从而将整个 ShuffleNet 的计算访存比（FLOP/Bytes）提高。 

根据之前在《深度学习模型大小与模型推理速度的探讨》的理论分析，提高 FLOP/Bytes 可以提高模型在机器上能够发挥的性能上限。

在 10980XE 上，优化之前 ShuffleNet 的 FLOP/Bytes 可能只是处于 Roofline 的半山腰上，无法得到很高的推理峰值性能（Inference Peak）。而进行融合之后，FLOP/Byte 变高了，得到的 Inference Peak 可以更加逼近 10980XE 16 核心下的理论浮点峰值！

关于机器的浮点峰值，可以参考《干货 | 浮点峰值那些事儿》优化收益如下图所示  

优化收益

三、性能展示
根据前面的数据，我们不难得出 —— 优化后的 shufflenetv2_x1_0 减少了 29 个算子，推理时间理论上也会减少 39%，理论加速比达到 1.63 倍。而实际上，融合后的 ChannelShuffle 算子速度再次得到了提升，加速比实际达到了 1.99 倍。 

诚然，单纯的算子融合是一件比较简单的事情，但却让模型推理速度得到了相当大的提升。所以本文旨在通过一个推理优化的小例子，强调在推理优化的过程中结合目标机器的算力和各级访存带宽等数据，以及目标模型本身的计算量、访存量和模型结构来进行合理的优化的重要性。

最后我们展示一下经过图优化之后的 ShuffleNet 在不同配置和不同设备上的表现，下面是 X86 CPU 以及 NVIDIA GPU 平台的优化结果展示：

关注我们的开源项目：

交流 QQ 群：627853444，入群密令 OpenPPL

参考

- ^ShuffleNet: https://arxiv.org/pdf/1707.01083.pdf https://arxiv.org/pdf/1707.01083.pdf
- ^torchvision model: https://github.com/pytorch/vision/tree/main/torchvision/model https://github.com/pytorch/vision/tree/main/torchvision/model

阅读全文​
​赞同 104​​1 条评论​265 ​25 ​分享