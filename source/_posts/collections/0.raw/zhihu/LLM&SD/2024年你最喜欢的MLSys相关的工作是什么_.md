---
title: 2024年你最喜欢的MLSys相关的工作是什么?
date: "2024-12-27 00:00:00"
updated: "2024-12-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/2024年你最喜欢的MLSys相关的工作是什么_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/7370558713/answer/65109878557
---


<strong>SageAttention2</strong>

大模型中，线性层的低比特量化已经逐步落地；然而，对于注意力模块，目前几乎各个模型都还在用高精度（例如FP16或FP32）的注意力运算进行训练和推理。并且，随着大型模型需要处理的序列长度不断增加，Attention（注意力运算）的时间开销逐渐成为主要开销。

此前，清华大学陈键飞团队提出的8-Bit的即插即用Attention（SageAttention），将Attention中的 
$QK^\top$量化至INT8，将PV保持为FP16精度并使用FP16精度的矩阵乘法累加器，同时提出Smooth K技术保持了量化Attention的精度。实现了2倍加速于 FlashAttention2，且在各类大模型上均保持了端到端的精度表现。SageAttention已经被业界及社区广泛的使用于各种开源及商业的大模型中，比如CogvideoX，Mochi，Flux，Llama3，Qwen等。

近日，清华大学陈键飞团队进一步提出了4-Bit的即插即用Attention（SageAttention2）。实现了<strong>3</strong>倍以及<strong>4.5</strong>倍相比于FlashAttention2和xformers的<strong>即插即用</strong>的推理加速，且在视频、图像、文本生成等大模型上<strong>均保持了端到端的精度表现</strong>。（注意FlashAttention3只能在Hopper显卡上运行，即使在Hopper显卡(无INT4)上，SageAttention2 8-bit版本也比 FlashAttention3 加速两倍；甚至比 FlashAttention3 的8-bit版本速度略快，更重要的是SageAttn2 8-bit的精度远好于FlashAttention3 的8-bit版本； 除Hopper外的显卡，SageAttn2就更是乱杀） 

![](https://pic1.zhimg.com/v2-ed60c1ab2aa90227b20de4ab0497d905_r.jpg?source=2c26e567)<strong>论文标题：SageAttention2: Efficient Attention with Thorough Outlier Smoothing and Per-thread INT4 Quantization</strong>

<strong>论文链接：</strong>

[SageAttention2: Efficient Attention with Thorough Outlier Smoothing and Per-thread INT4 Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.10958)<strong>开源代码：</strong>

[GitHub - thu-ml/SageAttention: Quantized Attention that achieves speedups of 2.1-3.1x and 2.7-5.1x compared to FlashAttention2 and xformers, respectively, without lossing end-to-end metrics across various models.](https://link.zhihu.com/?target=https%3A//github.com/thu-ml/SageAttention)
<strong>即插即用举例</strong>
SageAttention2实现了高效的Attention算子，可以实现即插即用的推理加速。即输入任意Q, K, V矩阵，SageAttention2可以快速返回Attention Output (O)。

![](https://picx.zhimg.com/v2-ddcc392b5bfb29d381cfd977f77271fc_r.jpg?source=2c26e567)具体来说，SageAttention2使用起来很方便，克隆仓库（git clone [https://github.com/thu-ml/SageAttention](https://link.zhihu.com/?target=https%3A//github.com/thu-ml/SageAttention)）并执行<strong>python setup.py install</strong>后，只需一行代码便可以得到Attention的输出，可以使用该接口方便地替换任意模型中的Attention函数：

![](https://pic1.zhimg.com/v2-7006de00ee8d44e4b49c0cde6e86c86d_r.jpg?source=2c26e567)

效果上，以开源视频生成模型CogvideoX-1.5-5B为例，使用SageAttention2可以端到端加速<strong>1.8</strong>倍，且生成的视频无损：

使用全精度Attention (1040秒）：

[
![](https://pic1.zhimg.com/v2-57a78ba496f4b72fe0601ae1373338ec.jpg?source=382ee89a)使用全精度Attention (1040秒）https://www.zhihu.com/video/1855920895832489985](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/1855920895832489985)使用SageAttention2（无损加速至577秒）：

[
![](https://picx.zhimg.com/v2-96efb76729244d7a6c89f18d08358d63.jpg?source=382ee89a)使用SageAttention2（只需577秒https://www.zhihu.com/video/1855921052208721920](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/1855921052208721920)SageAttention2还提供了比SageAttention更广泛的硬件支持。除在RTX 4090可以加速3倍加速于FlashAttention外，在L20，L40，L40S可实现了2倍的加速, 在A100，A800，A6000上可实现1.45-1.6倍的加速（基于SageAttention）。

详细介绍
接下来，将从前言，挑战，方法，以及实验效果四个方面介绍SageAttention2（总体流程图如下图）。

![](https://pic1.zhimg.com/v2-204150b08260e513119b43ab2a97ca6c_r.jpg?source=2c26e567)

<strong>前言</strong>
随着大模型需要处理的序列长度越来越长，Attention的速度优化变得越来越重要。下图展示了一个标准的Transformer模型中各运算的时间占比随序列长度的变化：

![](https://pic1.zhimg.com/v2-086afc36268d77753ae4de77acf937f1_r.jpg?source=2c26e567)

 为了方便指代注意力运算中的矩阵，我们先回顾一下注意力的计算公式：

![](https://pica.zhimg.com/v2-3e69909ad9f7020888a61d68e29b21a0_r.jpg?source=2c26e567)尽管SageAttention提出将Q，K量化至INT8，将P，V保持FP16精度且采用FP16的矩阵乘法累加器来加快Attention的速度。然而，这样的缺点是：（1）INT8的矩阵乘法只达到了一半的INT4矩阵乘法的速度。（2）使用FP16精度的乘法累加器的FP16精度的矩阵乘法的加速只在RTX4090和RTX3090显卡上有效。

为了克服上述缺点，SageAttention2提出将Q, K量化至INT4，并将P, V量化至FP8来加速Attention。然而，这样做的挑战是很大的。

<strong>4-Bit注意力量化有什么问题？</strong>
研究团队发现直接将注意力运算中的Q, K量化为INT4后将会导致在几乎所有模型和任务上都会得到极差的结果，例如，在CogVideoX文生视频模型中，会得到完全模糊的视频；Llama2-7B进行四选一选择题任务上得到25%的准确率。

![](https://picx.zhimg.com/v2-7558e7e88bc15efa804258e899222f5f_r.jpg?source=2c26e567)经过仔细分析后，研究团队发现主要是两个原因导致了量化注意力的不准确：

（1） INT4的数值范围相比INT8非常小，导致其量化误差在Q，K矩阵中出现一些异常值时会变得十分明显，恰好大多模型都在Q, K中表现出来了较大的通道维度的异常值。这极大削减了QK^⊤矩阵乘法的精度。

![](https://picx.zhimg.com/v2-c790285f5baa159103f0d738af4b00e4_r.jpg?source=2c26e567)（2） 研究团队发现Nvidia的显卡上，FP8的矩阵乘法指令(mma.f32.f8.f8.f32)的乘法累加器并不是官方宣称的FP32精度，而是只有FP22精度，这导致了PV矩阵乘法出现较大的累加误差。 

![](https://pica.zhimg.com/v2-d0e143740a1209a337dba1f7c65d3c93_r.jpg?source=2c26e567)
<strong>技术方案</strong>
为了解决上述的两个挑战，研究团队提出了对应的解决办法。

（1） 保留SageAttention中对K进行平滑处理的同时，提出对Q进行平滑处理：Q – mean(Q)。其中mean(Q) 是沿着通道维度的平均值向量。完成该平滑操作后需要在Attention计算过程中将mean(Q)和K^T的向量与矩阵乘法的结果补偿到S中。

![](https://pic1.zhimg.com/v2-ce8e8c7e8888101e5ac195cd7ecce295_r.jpg?source=2c26e567)这使得相比直接量化Q, K至INT4的准确度有质的改变，如下表展示了对比了该方法和直接量化Q, K至INT4在Cogvideo和Llama3.1上的端到端表现。

![](https://pica.zhimg.com/v2-4cce224847454f9405dcdf0704aa7332_r.jpg?source=2c26e567)

矩阵Q平滑前后的数据分布可视化的结果如下，可以发现平滑后的Q对INT4数据范围的利用度更高：

![](https://picx.zhimg.com/v2-6ce2ebf0bf44009d388dd7e75b909dc1_r.jpg?source=2c26e567)（2） 对Q, K进行Per-thread量化。对于矩阵Q, K，SageAttention2 采用了根据 mma 指令对矩阵内存排布的要求，对 Q，K 中的 Token 按照 GPU 线程进行分组，使量化粒度比 SageAttention 中的 per-block 细化 16 倍，极大提高了4Bit的 
$QK^\top$乘法的准确度的同时不引入任何额外开销。具体来说，在 SageAttention 中，每个Q的块将被划分为 c_w 个段，由GPU流处理器（SM）中的 c_w 个 GPU Warp 处理。然后，每个包含32个线程的 Warp 会使用NVIDIA的 mma.m16n8k64 PTX 指令来执行 
$QK^\top$运算。根据这一指令的布局要求，研究团队发现一个 Warp 内的 Q[8×(n%8)] 可以共用一个量化缩放参数，而一个 Warp 内的 K[8×(n%8)] 和 K[8×(n%8+1)] 也可以共用一个量化缩放参数，其中 n 是 Token 索引。这种量化方法更为细致且不增加额外开销。这是因为它根据 MMA 指令的布局将不同的GPU线程分配到不同的量化Token组，每个线程只对应一个量化缩放参数进行反量化。而非 Per-token 量化那样，每个线程对应多个量化缩放参数。

![](https://picx.zhimg.com/v2-4f2c57b272e5b42e6a1cf962af855d18_r.jpg?source=2c26e567)如下表所示，可以发现per-thread量化的准确度比SageAttention中采用的per-block量化高的多，准确度和per-token量化几乎没有差别。

![](https://picx.zhimg.com/v2-47eed76c5220efb7f37f739c1aa078a3_r.jpg?source=2c26e567)（3） 对FP8的PV矩阵乘法采用FP32的寄存器将每次FlashAttention分块粒度的PV的FP22的乘法结果累加起来。这种做法可以有效的避免FP22的乘法累加器沿着序列长度累积过多的误差，将FP22累加器带来的误差控制在FlashAttention分块的粒度中，提高了FP8的PV乘法的准确度。 

（4）针对P和V，研究团队对比了多种量化的数据类型，对比发现使用E4M3数据格式的FP8精度最准确，基本接近了FP16的准确度。因此采用将P和V量化至E4M3。

![](https://pica.zhimg.com/v2-62bc4c698254fafb0f865a0b5c90c990_r.jpg?source=2c26e567)下图展示了SageAttention2的算法流程：

![](https://picx.zhimg.com/v2-ff8afb622984c695432cdfaee0388dfc_r.jpg?source=2c26e567) SageAttention2共实现了两种Kernel，区别在于对Q, K进行INT4量化还是INT8量化：

![](https://pic1.zhimg.com/v2-7d031e0281e2574a1cd0b7c405d6dac8_r.jpg?source=2c26e567)此外，SageAttention2还提出一种可选的对矩阵V进行平滑处理的技术，可以进一步提高PV矩阵乘法的准确度。具体来说，当某些模型中V矩阵具有通道维度的偏移时，可以将V减去其通道维度的平均值mean(V) 来去除偏移，之后进行正常的量化Attention运算。只需要对最终Attention的Output加上mean(V) 即可保持计算的正确性。

![](https://picx.zhimg.com/v2-82bb302f445b75be5bd1aff251c50cf7_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-aa5cb4887644fe7cfcccc0cc7458aaae_r.jpg?source=2c26e567)这种做法可以提升准确度的原因如下图所示。在FP22的表示范围内，数值越大，相比FP32的误差越大。而P的范围是0～1之间，那么当V矩阵的列有较大的数值偏移时，PV的FP22累加器的精度就越差，通过平滑V去除偏移后，就可以加强PV矩阵乘法的准确度。

![](https://pic1.zhimg.com/v2-7b6e6d90b89369127257af9c4f951888_r.jpg?source=2c26e567)

<strong>实验效果</strong>
SageAttention实现了底层的GPU CUDA Kernel，在算子速度以及各个模型端到端准确度上都有十分不错的表现。 

具体来说，算子速度相比于FlashAttention2 和 xformers 有大约3倍以及4.5倍的加速，并且可以适用于绝大部分显卡：

![](https://pic1.zhimg.com/v2-20f0e677418fddba8d897909d763b9a5_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-e8ca5d22337925062d3467845d9ab94f_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-e9e97bf6517f621586b6c927718a832e_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-093484d5de75b0a8085240f7eb3315b8_r.jpg?source=2c26e567)算子的准确度方面也是比对Q, K进行SmoothQuant和Hadamard变换要更加准确：

![](https://pica.zhimg.com/v2-d996bec6422c1d211c0cd548158f962c_r.jpg?source=2c26e567)

<strong>各模型在真实场景的端到端精度表现中，在视频、图像、文本生成等大模型上均保持了端到端的精度表现：</strong>

下图是在HunyuanVideo中的可视化实例：

![](https://picx.zhimg.com/v2-a3d6638dca8f0ca00493421b7f7a261e_r.jpg?source=2c26e567)下图是在Cogvideo中的可视化实例：

![](https://pic1.zhimg.com/v2-3c76265ebf5ee0897d6801613963c9b6_r.jpg?source=2c26e567)SageAttention2(8-bit) 精度上也远比<strong>只能</strong>在 Hopper 显卡上运行的 FlashAttention3(8-bit) <strong>好很多</strong>，速度也略快： 

![](https://picx.zhimg.com/v2-438c13ece64ef2bf0fa3cc8041553494_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-0b58d32b35b9632aa161d06aa8208f0c_r.jpg?source=2c26e567)
![](https://pic1.zhimg.com/v2-1f8b742a0e932dc487b19f9b617f95d5_r.jpg?source=2c26e567) 下表展示了各个语言、视频、图像生成模型中<strong>SageAttention2的端到端精度表现</strong>：

![](https://picx.zhimg.com/v2-346f454c2aa73dbbb42c6b81a42fb692_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-8b1323cc5344046d52d5808128ec66e6_r.jpg?source=2c26e567)

<strong>端到端的速度表现上</strong>，SageAttention2两个Kernel的实现均可以有效的对长序列的模型进行加速，比如可以端到端<strong>1.8</strong>倍加速CogVideoX1.5-5B，其他模型上也均有<strong>1.6</strong>到<strong>1.8</strong>倍的提速：

![](https://picx.zhimg.com/v2-1e4d56594ebc08ba2996825dcfbfd0b6_r.jpg?source=2c26e567)

<strong>再次欢迎并感谢大家使用并引用我们的工作！：</strong>
Github:
[GitHub - thu-ml/SageAttention: Quantized Attention that achieves speedups of 2.1-3.1x and 2.7-5.1x compared to FlashAttention2 and xformers, respectively, without lossing end-to-end metrics across various models.](https://link.zhihu.com/?target=https%3A//github.com/thu-ml/SageAttention)
<strong>Paper:</strong>

[SageAttention2: Efficient Attention with Thorough Outlier Smoothing and Per-thread INT4 Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.10958)