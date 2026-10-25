---
title: 跟李沐读论文系列——CLIP
date: "2023-02-22 00:00:00"
updated: "2023-02-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/跟李沐读论文系列——CLIP/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/593661212
---


CLIP 是OpenAI 在2021年初的一篇工作：[Learning Transferable Visual Models From Natural Language Supervision](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2103.00020.pdf) 。它是一个 zero-shot 的视觉分类模型，预训练的模型在没有微调的情况下在下游任务上取得了很好的迁移效果。作者在30多个数据集上做了测试，涵盖了 OCR、视频中的动作检测、坐标定位等任务。

在引言的最后一段，作者特意强调了 CLIP 的效果：没有在 ImageNet 上做微调的CLIP，竟然能和已经在 ImageNet 上训练好的 Resnet 50 打成平手，简直不可思议。CLIP 为什么能取得如此好的效果？它又有哪些不足之处？CLIP 论文逐段精读【论文精读】 这个视频里朱神带给你答案。

### 预训练阶段

论文标题中有一个重要的点——自然语言监督。这说明 CLIP 是涉及文字和图片的多模态领域的工作，它从文本中得到监督信号，引导视觉分类的任务。

其实，预训练网络的输入是文字与图片的配对，每一张图片都配有一小句解释性的文字。将文字和图片分别通过一个编码器，得到向量表示。这里的文本编码器就是 Transformer；而图片编码器既可以是 Resnet，也可以是 Vision transformer，作者对这两种结构都进行了考察。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_9145da14aae3.jpg)

预训练网络结构假设现在分别得到了 N 个图片和 N 个文本的编码。接下来，我们需要对它们进行对比学习（contrastive learning）。对比学习需要一些正样本和负样本。在这里，配对的句子和文本就是一对正样本（也就是对角线上的）；反之，不配对的就是负样本（对角线之外的）。预训练网络的目标，就是最大化正样本对的余弦相似度，并最小化负样本的余弦相似度。

这种无监督的训练方式需要大量的数据。后面我们会提到，OpenAI 专门收集了四亿个样本对的巨无霸数据集。真是有钱任性啊。

### 推理过程

接下来是 zero-shot 的推理过程。给定一张图片，如何利用预训练好的网络去做分类呢？这里作者很巧妙地设置了一道“多项选择”。具体来说，我给网络一堆分类标签，比如cat, dog, bird，利用文本编码器得到向量表示。然后分别计算这些标签与图片的余弦相似度；最终相似度最高的标签即是预测的分类结果。

作者提到，相比于单纯地给定分类标签，给定一个句子的分类效果更好。比如一种句子模板 `A photo of a ...`，后面填入分类标签。这种句子模板叫做 `prompt`（提示）。这也很好理解：预训练时模型看到的大多是句子，如果在推理时突然变成单词，效果肯定会下降。作者还说，句子模板的选择很有讲究，还专门讨论了`prompt engineering`，测试了好多种类的句子模板。 

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_16bd81a44a1a.jpg)

推理过程中最关键的一点，在于我们有很高的自由度去设置“多项选择题”。从前的分类网络的类别数量是固定的，一般最后一层是跟着 softmax 的全连接层；如果要更改类别数量，就要更换最后一层；并且预测的内容是固定的，不能超过训练集的类别范围。

但对于 CLIP 来说，提供给网络的分类标签不仅数量不固定，内容也是自由的。如果提供两个标签，那就是一个二分类问题；如果提供1000个标签，那就是1000分类问题。标签内容可以是常规的分类标签，也可以是一些冷门的分类标签。我认为这是 **CLIP 的一大主要贡献——摆脱了事先定好的分类标签**。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_0517e65d1974.jpg)

CLIP 的官方博客 上举了一个例子，说明 CLIP 迁移能力的强大。尽管 Resnet101 在 Imagenet 上的准确度很高，但如果迁移到其他数据集上，它对于香蕉的识别准确度就大幅下降。但反观 CLIP，它可以识别动漫里的、表情包里的、素描画里的各种类型的香蕉，迁移能力很强。

### 数据集

作者提到，现有的图像数据集都太小了。像 Imagenet 21k 才有 1400 万张图片。还有一些数据集虽然够大，但是标注质量很差。另外，虽然有谷歌的 JFT300 数据集（3亿个样本），但那是人家内部的，没有公开啊。所以 OpenAI 决定自己造一个超大号数据集。他们收集了 4亿个图片-文本对，构建了 `WebImageText` (WIT) 数据集。

这是个什么概念？我刚接触 CV 的时候，看到 Imagenet 有上千万的图片，觉得这真是个超大的数据集。现在呢？WIT 的规模已经是它的几十倍了。

#### 算力垄断

在 CLIP 之前，不是没有工作试图打通文本与图像的隔阂。但它们要么是模型不够大，要么是数据集不够好，总之效果都不够惊艳。CLIP 一方面构建了超大规模数据集，另一方面用了像 Vision Transformer 这种大模型，两相加持下，终于一鸣惊人。

这引发了一些人关于算力垄断的担忧。之前谷歌的工作——[Vision Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2010.11929.pdf) 之所以能取得成功，强大的算力是不可缺少的条件：如果用一个TPU v3 核跑模型，需要2500天。没有几家团队有能力部署这种规模的算力。来看看 [Vision Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2010.11929.pdf) 这篇论文里的原话吧：

**Most related to ours is the model of Cordonnier et al. (2020), which extracts patches of size 2 × 2 from the input image and applies full self-attention on top. This model is very similar to ViT, but our work goes further to demonstrate that large scale pre-training makes vanilla transformers competitive with (or even better than) state-of-the-art CNNs**. 你的模型效果不好，很有可能不是方法不行，而是数据不够多、模型不够大啊！

### 模型局限性

作者在第六章介绍了 CLIP 的局限性。

首先，虽然 CLIP 在 Imagenet 上与 Resnet 50 打成平手。但后者远远不是 state-of-art model。CLIP 离表现最好的模型还差了十几点精度。尽管大规模训练能够极大地促进模型精度，但作者预估，要媲美现今表现最好的模型，计算量至少要扩大 1000 倍。即使对于 OpenAI 来说，以现有的硬件也无法承担这个计算量。

另一个问题在于，如果做推理的数据真的和训练数据差得非常远 (out of distribution)，那么 CLIP 的泛化效果会很差。作者举了个例子，在MNIST数据集上（1-9手写数字图片），CLIP 只达到了88%的准确度，还不如一个作用在像素点上的逻辑回归。虽然 4 亿数据集很大，但是很有可能没有包含这种不常见的手写数字的图片。这就引起了一些疑虑：CLIP 的强大有多大程度上取决于这个高质量、大规模的数据集。

还有一点，CLIP 在推理阶段，需要我们手动地设置“多项选择题”。作者设想，如果能够让网络自动生成文本来描述图片就好了。另外作者还提到了数据利用效率不高的问题。最后，一个没有办法回避的问题——数据本身的偏见带来的模型的偏见。这个在 GPT-3 里就有所体现。对此我的看法是，如果人类社会中还有这种偏见，我们如何寄希望于人工智能，希望它能克服这种偏见呢？

### 总结

CLIP 的最大贡献在于打破了固定种类标签的桎梏，让下游任务的推理变得更灵活。并且在 zero-shot 的情况下，它的效果很不错。在这篇工作发表之后，涌现出了一大批在其他领域的应用，包括物体检测、物体分割、图像生成、视频动作检索等。在创新度、有效性、影响力方面都非常出色。

虽然 OpenAI 并没有开源预训练的代码，但他们开源了预训练好的模型和 API，可以直接拿来做下游任务的推理，大家可以去玩一玩。详见 [https://github.com/openai/CLIP](https://link.zhihu.com/?target=https%3A//github.com/openai/CLIP)

> 一门课程的大作业要求利用 CLIP 做 zero-shot prediction、微调 CLIP 网络，并在原来网络架构的基础上添加线性分类层。做完之后，加深了我对 CLIP 的理解。附上 Github 地址：[Final project_CLIP.ipynb](https://link.zhihu.com/?target=https%3A//github.com/yunhao-tech/Course_project/blob/master/Advanced%2520Machine%2520learning/Final%2520project_CLIP.ipynb)
