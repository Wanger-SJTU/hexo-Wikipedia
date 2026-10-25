---
title: CVPR 2024 | Apple提出MobileCLIP：通过多模态强化训练快速图像文本模型
date: "2024-03-08 00:00:00"
updated: "2024-03-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/CVPR-2024-_-Apple提出MobileCLIP-通过多模态强化训练快速图像文本模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/685965289
---


改进CLIP！MobileCLIP：一个针对运行时性能进行优化的新的高效图像文本模型系列，并提出一种新颖且高效的训练方法，即多模态强化训练，在零样本分类和检索等任务上性能表现SOTA！代码刚刚开源！

<strong>点击关注</strong> @CVer官方知乎账号<strong>，可以第一时间看到最优质、最前沿的CV、AI、AIGC工作~</strong>

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_b10a0386f95a.jpg)

### MobileCLIP

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_78b714a27deb.jpg)

<strong>MobileCLIP: Fast Image-Text Models through Multi-Modal Reinforced Training</strong>

单位：Apple

代码：[https://github.com/apple/ml-mobileclip](https://link.zhihu.com/?target=https%3A//github.com/apple/ml-mobileclip)

论文：[https://arxiv.org/abs/2311.17049](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2311.17049)

CVPR 2024 论文和开源项目合集请戳—>[https://github.com/amusi/CVPR2024-Papers-with-Code](https://link.zhihu.com/?target=https%3A//github.com/amusi/CVPR2024-Papers-with-Code)

图像文本基础模型（例如 CLIP）的对比预训练表现出了出色的零样本性能，并提高了在各种下游任务上的鲁棒性。 然而，这些模型利用基于Transformer的大型编码器，具有显著的内存和延迟开销，这给移动设备上的部署带来了挑战。

在这项工作中，我们介绍了 MobileCLIP——一个针对运行时性能进行优化的新的高效图像文本模型系列，以及一种新颖且高效的训练方法，即多模态强化训练。 

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_b8310f200a50.jpg)

所提出的训练方法利用图像caption模型和强大的 CLIP 编码器集合的知识迁移来提高高效模型的准确性。 我们的方法通过将额外的知识存储在强化数据集中来避免训练时的计算开销。 

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_09bedadfed62.jpg)

#### 实验结果

MobileCLIP 为多个数据集上的零样本分类和检索任务设置了新的最先进的延迟精度权衡。与之前基于 ViT-B/16 的最佳 CLIP 模型相比，我们的 MobileCLIP-S2 变体速度提高了 2.3 倍，同时更加准确。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_8c935b87c86d.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_7fd2eedaf2f3.jpg)

我们通过训练基于 ViT-B/16 图像主干的 CLIP 模型，进一步证明了多模态强化训练的有效性，并在 38 个评估基准上实现了 +2.9% 的平均性能提升，与之前的最佳结果相比。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_117a7c3f88cd.jpg)

此外，我们表明，与非强化 CLIP 训练相比，所提出的方法实现了 10×-1000× 的学习效率提高。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_75a10e6c24da.jpg)

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_01fa29fb8460.jpg)

<strong>现在点击关注</strong>@CVer官方知乎账号<strong>，可以第一时间看到最优质、最前沿的CV、AI工作~</strong>涨点神器、LLM、AIGC(图像/视频/3D生成)、多模态、医学影像、分类、检测、分割、跟踪、扩散、CNN、Transformer、NeRF、3DGS、low-level、自动驾驶、ReID、遥感等方向通通拿下！

<strong>CVPR 2024 论文和开源项目合集请戳—></strong>

[](https://link.zhihu.com/?target=https%3A//github.com/amusi/CVPR2024-Papers-with-Code)
