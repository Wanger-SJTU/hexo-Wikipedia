---
title: "(1 条消息) HIFI-CODEC: GROUP-RESIDUAL VECTOR QUANTIZATION FOR HIGH FIDELITY AUDIO CODEC解读"
date: "2023-10-29 00:00:00"
updated: "2023-10-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/HIFI-CODEC_-GROUP-RESIDUAL-VECTOR-QUANTIZATION-FOR-HIGH-FIDELITY-AUDIO-CODEC解读/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/627261186
---


### Paper

[HIFI-CODEC: GROUP-RESIDUAL VECTOR QUANTIZATION FOR HIGH FIDELITY AUDIO CODEC](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.02765.pdf)

### GitHub

[AcademiCodec](https://link.zhihu.com/?target=https%3A//github.com/yangdongchao/AcademiCodec)

**

### 解读

#### 1. 动机

Audio codec **是一种被广泛使用的压缩audio的通信技术。

如今，audio codec 模型作为中间表征被用于生成任务中。例如：

        AudioLM[1]利用SoundStreamd[2]得到离散表征，用于audio生成

        VALL-E[3]利用Encodec[4] 作为中间表征用来帮助TTS任务

**

尽管Audio codec 对生成任务很有帮助，但有两个挑战：**

（1）训练audio codec 模型很难，因为没有公开可用的训练流程，并且需要大量的数据和GPU

（2）实现好的重构性能需要很多codebooks，增加了生成模型的压力

**

本文设计针对生成任务的audio codec 模型，目标有两个：**

（1）有很好的重构性能

（2）需要较少的codebook

为此，提出一个group-residual vector quantization (GRVQ)技术，并用它实现一个新的High Fidelity Audio Codec 模型，称为 HiFi-Codec，只需要四个codebooks。模型使用开源TTS数据集训练，例如LibriTTS, VCTK, AISHELL，大概有1000 小时，使用8个GPU。

此外，为未来促进audio codec 和生成任务的研究，开源[AcademiCodec](https://link.zhihu.com/?target=https%3A//github.com/yangdongchao/AcademiCodec)，这是第一次audio codec 工具集，提供了训练代码以及Encodec，SoundStream和HiFi-Codec的预训练模型。

实验结果表明尽管只使用4个codebooks，HiFi-Codec 在重构性能方面超过了Encodec。

**

#### 2. 方法

HiFi-Codec 的模型结果如下图所示，包括三个主要模块：**

（1）Encoder，将输入的audio 编码成一个latent feature representation z

（2)  Group-residual quantization （GRVQ） 层 ，生成压缩的表征Zq

（3）Decoder，从压缩的表征Zq重构回audio

**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3cb07e072a40.jpg)

模块介绍：**

（1）Encoder 和Decoder 参考了Encodec 和 SoundStream

（2）GRVQ 的设计

           设计动机： Encodec 和 SoundStream 中使用了Reisudal vector quantization (RVQ)，其中第一层的codebooks保留了最多的信息，例如，对speech数据来说，文本信息，音色信息可以只使用一个codebook恢复；剩余层包含了很少的细节信息，这些信息会影响audio的音质，并且这些信息在隐层空间中是稀疏和分散的。

          为此， 本文提出增加第一层的codebook的数量。具体做法是将latent feature representation z 平均分成若干个组（本文是将其分成两个组：z1, z2），然后使用多个RVQ量化每组的特征，最后将多个RVQ组的输出合并，得到最终的量化结果。整个算法流程如下：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_82b0eeca0064.jpg)

**

模型训练：**

使用三个discriminators: （1）Encodec中的 multi-scale STFT-based (MS-STFT)判别器，（2）HiFi-GAN vocoder 中的multi-period discriminator (MPD)  和 multi-scale discriminator (MSD)  

训练loss 有三部分：（1）重构loss，包含时域和频域两部分（2）perceptural loss，通过discriminators实现，（3）GRVQ commitment loss

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d357e7b5c784.jpg)

#### 3. 实验结果

使用speech enhancement 领域中的PESQ和STOI作为评估指标，实验结果如下表

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_046157a028be.jpg)

结果结论：

当使用4个codebooks时，HiFi-Codec 实现了很好的重构性能

最好的结果是当downsampe times为240，codebooks是8 （两层residual layer，每层4个codebooks）

复现的Encodec和SoundStream同样获得了与Encodec近似的结果

强烈建议读者使用4个codebooks的HiFi-Codec 来训练生成模型

#### 4. 总结

本文提出group-residual vector quantization 方法，用来构建一种新的audio codec 模型: HiFi-Codec。该模型的设计主要是针对生成任务。

当使用4个codebooks时，HiFi-Codec 实现了比Encodec更好的重构性能

#### 5. 局限

尽管HiFi-Codec 模型实现了很好的重构性能，但也有一些局限性：

（1）没有使用大规模的数据训练一个universal audio codec，生成能力没有得到很好的验证

（2）客观指标不能很准确的评估重构性能，主观评估是最好的选择，但这一部分目前还没有研究

（3）HiFi-Codec 的目的是辅助生成任务，单我们没有提供下游任务来评估其性能

#### References 

[1] Borsos, Z., Marinier, R., Vincent, D., Kharitonov, E., Pietquin, O., Sharifi, M., … Research, G. (n.d.). AudioLM: a Language Modeling Approach to Audio Generation.

[2] Zeghidour, N., Luebs, A., Omran, A., Skoglund, J., & Tagliasacchi, M. (2021). SoundStream: An End-to-End Neural Audio Codec.

[3] Wang, C., Chen, S., Wu, Y., Zhang, Z., Zhou, L., Liu, S., … Wei, F. (2023). Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers.

[4] D’efossez, A., Copet, J., Synnaeve, G., & Adi, Y. (2022). High Fidelity Neural Audio Compression.
