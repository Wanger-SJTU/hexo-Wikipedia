---
title: "格灵深瞳开源量化算法 EasyQuant"
date: "2020-06-28 00:00:00"
updated: "2020-06-28 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/格灵深瞳开源量化算法-EasyQuant/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/151383244"
---


深度学习给人工智能算法带来了跃阶式的突破，引领了近几年的AI繁荣发展。相应的，“AI+”和“+AI”落地应用在各产业领域遍地开花。而深度网络模型的嵌入式应用和加速，则是人工智能落地的重要方向。

为了实现深度网络模型的加速，量化是一种常用的优化方式。量化后需要的资源只有原来的1/4，这样就可以使用更多的并行指令，从而实现加速。

量化是将原本用高精度float32表示的模型，转化成用低精度Int8或更低比特位表示的模型，并且要做到模型精度基本一致，而实现这一目标的算法即量化算法。

Int8 量化已经被证明可以满足应用上对精度和速度的需求，但是形形色色的 Int8 量化算法要么是逻辑复杂难以实现，要么是精度保持差。那么是否存在一种低成本、无需训练、任务无关、易用简单且精度保持比较好的量化方法呢？

答案是 YES。

格灵深瞳最近开源的量化算法 EasyQuant，就突破了量化算法鱼和熊掌不可兼得的瓶颈。

<strong>关于 EasyQuant</strong>
EasyQuant 可以通过精细搜索每层量化参数 Scale 值，来实现量化精度的提升。我们的实验表明，即使是在 Int7 或更低比特的量化条件下，EasyQuant 也能达到接近 Int8 和 Float32 的性能。基于当前 arm NEON 指令集，更低的 Int7 量化，也会带来更快的推理速度，且更容易减少溢出问题的产生。

![](https://pica.zhimg.com/v2-2f210b6c2ac3e38dd036c5c336dfde2e_r.jpg)

EasyQuant 需要的样本量极低，在用 KLD 方法得到初始量化值后，一般只需要 50 张左右的典型样本就可以完成整个量化调优过程。由于这是一个非训练量化（Post Training Quantization）的方法，所以它也是一个任务无关的方法，不需要考虑各种各样任务相关的 Loss 函数和数据 Label，相对于其它需要搭建完整的训练流程才能达到量化目标的方法来说，EeayQuant 在应用上更加的简单友好。

为了验证EasyQuant方法的鲁棒性，我们在主流任务(人脸识别、目标检测、目标分类)、主流网络框架(MobilenNet、SqueezeNet、VGG、ResNet等)和主流arm平台上(RK3399)进行了详细的对比实验，均得到了理想的结果。

<strong>EasyQuant 应用</strong>
EasyQuant 已经被工业界其它公司所应用，并得到了对易用性和量化效果的肯定。

Open AI Lab公司的Tengine（[http://github.com/OAID/Tengine](https://link.zhihu.com/?target=http%3A//github.com/OAID/Tengine)）团队在市场调研中发现，目前市面上大多数 NPU 均采用TFLite Uint8 的量化策略，精度下降比较明显。虽然TensorFlow提供了QAT（Quantization Aware Training）的 Finetune 精度补偿方案，但在实际部署环境中，较难具备 Finetune 的条件。因此它们基于EasyQuant中提到的策略，针对某型号NPU提供的离线量化策略PTQ（Post Training Quantization）进行改进，取得了较好的精度补偿结果，促进了NPU在实际项目中快速稳定落地。部分实验结论如下：

<strong>分类任务</strong>

![](https://picx.zhimg.com/v2-a275648ecd4b1a0c5b02d1d984636a91_r.jpg)（ImageNet2012, Top1）

<strong>检测任务</strong>

![](https://pic3.zhimg.com/v2-311e0f6418c16e42940a0aadcaa312c8_r.jpg)（实际部署场景的某个人脸检测模型, AP）

最后，希望 EasyQuant 独特的量化方式可以被更多的工业界朋友所使用，也希望能给学术界在量化方法的探索上提供一个有价值的参考。

欢迎点击下方地址登录Github查看。 

[https://github.com/deepglint/EasyQuant](https://link.zhihu.com/?target=https%3A//github.com/deepglint/EasyQuant)