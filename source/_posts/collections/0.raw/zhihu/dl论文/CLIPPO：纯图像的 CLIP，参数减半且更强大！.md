---
title: "CLIPPO：纯图像的 CLIP，参数减半且更强大！"
date: "2023-01-12 00:00:00"
updated: "2023-01-12 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/CLIPPO-纯图像的-CLIP,参数减半且更强大/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/598308737"
---


<strong>出品人：Towhee 技术团队 张晨（</strong>@橙子<strong>）、顾梦佳（</strong>@JJJael<strong>）</strong>

多模态模型变得越来越有效，部分原因在于统一的组件，例如 Transformer 架构。 然而，多模态模型仍然经常包含许多特定于任务和模态的部分和训练过程。 例如，CLIP 通过对比损失训练独立的文本和图像塔。 CLIPPO 选择使用对比损失进行训练，<strong>尝试使用纯像素模型来执行图像、文本和多模式任务</strong>。 CLIPPO 执行基于图像的任务，例如检索和 zero-shot 图像分类，几乎与 CLIP 一样好，参数数量只有一半，并且没有文本特定的塔或嵌入。 当通过图像-文本对比学习和下一句对比学习联合训练时，CLIPPO 可以在自然语言理解任务上表现出色，没有任何词级损失（语言建模或掩码语言建模），优于基于像素的先前工作。 令人惊讶的是，CLIPPO 只需将问题和图像一起渲染，就可以在视觉问答中获得很好的准确性。 由于 CLIPPO 不需要 tokenizer，它可以在不修改的情况下在多语言多模态检索上实现强大的性能。**

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_6328f988a976.jpg)

> CLIP vs. CLIPPO

CLIP 在具有对比目标的图像/替代文本对上训练单独的图像和文本编码器，每个编码器都具有特定于模态的预处理和嵌入。 而 CLIPPO 使用单个编码器来处理常规图像和渲染为图像的文本。CLIPPO 通过将替代文本渲染为图像，使用共享视觉编码器（在两个独立的前向传递中）对生成的图像对进行编码，并应用与 CLIP 相同的训练目标，来训练具有同等能力的纯像素模型。

相关资料：****

- 代码地址：[https://github.com/google-research/big_vision](https://link.zhihu.com/?target=https%3A//github.com/google-research/big_vision)
- 论文链接：[Image-and-Language Understanding from Pixels Only](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2212.08045v1)
如果你觉得我们分享的内容还不错，请不要吝啬给我们一些鼓励：点赞、喜欢或者分享给你的小伙伴！
活动信息、技术分享和招聘速递请关注：

如果你对我们的项目感兴趣请关注：
用于存储向量并创建索引的数据库 Milvus**<strong>用于构建模型推理流水线的框架 Towhee</strong>
