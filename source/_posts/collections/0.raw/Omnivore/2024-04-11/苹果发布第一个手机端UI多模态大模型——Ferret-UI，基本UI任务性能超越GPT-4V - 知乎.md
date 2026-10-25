---
title: "苹果发布第一个手机端UI多模态大模型——Ferret-UI，基本UI任务性能超越GPT-4V - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-04-11/苹果发布第一个手机端UI多模态大模型——Ferret-UI,基本UI任务性能超越GPT-4V-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 7507fdc6-5181-4caf-97ee-be0029591d17
---

# 苹果发布第一个手机端UI多模态大模型——Ferret-UI，基本UI任务性能超越GPT-4V - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-zhuanlan-zhihu-com-p-691581574-18ec8dc3fd8)
[Read Original](https://zhuanlan.zhihu.com/p/691581574)



苹果公司最近发布关于手机端多模态大模型的论文《Ferret-UI: Grounded Mobile UI Understanding with Multimodal LLMs》（《Ferret-UI：理解移动用户界面的多模态大语言模型》）。论文介绍一个名为Ferret-UI的多模态大型语言模型（MLLM），该模型专为提升移动用户界面（UI）屏幕的理解而设计。Ferret-UI具备指代（Referring）、定位（Grounding）和推理能力，能够与UI屏幕进行有效的互动。

Ferret-UI基于Ferret模型构建，该模型在自然图像中表现出强大的参照和定位能力。为了适应UI屏幕的不同宽高比，Ferret-UI集成了“任意分辨率”（any resolution，anyres）技术，将整个图像分成子图像，以便同时适应竖屏和横屏，能够灵活地适应各种屏幕长宽比，并且利用增强的视觉特征放大细节。

此外，研究者们从广泛的基本UI任务中精心收集训练样本，如图标识别、文本查找和控件列表，并为高级任务编制了数据集，包括详细描述、感知/交互对话和功能推断。这些样本被格式化为带有区域注释的指令遵循格式，以促进精确的参照和定位。

这篇论文的关键点总结如下：

```text
* **针对UI屏幕的定制化MLLM**：Ferret-UI是首个专为UI屏幕设计的MLLM，能够有效执行指定、定位和推理任务。
* **任意分辨率技术的集成**：通过将整个屏幕分成为子图像，**每个屏幕根据原始纵横比分为2个子图像**（即纵向屏幕的水平分割和横屏的垂直分割），以便**同时适应竖屏和横屏**，这样能够灵活地适应各种屏幕长宽比，并且利用增强的视觉特征放大细节，因此Ferret-UI能够更好地处理UI屏幕的细节。
* **广泛的训练样本收集**：研究者们为基本UI任务和高级任务生成了大量数据，这些数据涵盖了**从简单的语义和空间任务到复杂的推理任务**。
* **综合测试基准**：研究者们开发了一个包含**14种不同移动UI任务的全面测试基准**，用于评估模型的性能。
* **卓越的性能**：在评估中，Ferret-UI不仅超越了大多数开源的UI MLLMs，还在所有**基本UI任务上超过了GPT-4V（**复杂任务还是不如GPT-4V，估计还得在复杂任务的训练集上做文章）。
```


总的来说，Ferret-UI的提出为移动UI的自动化理解和交互提供了一种先进的解决方案，其在多个方面的创新和卓越性能使其成为一个引人注目的研究成果。

## 摘要

多模态大语言模型 （MLLM） 的最新进展值得注意，然而，这些通用域 MLLM 在理解用户界面 （UI） 屏幕并与之有效交互的能力方面往往不足。在本文中，作者引入了 Ferret-UI，这是一种新的MLLM，<strong>旨在增强对移动 UI 屏幕的理解，参考、定位和推理功能</strong>。鉴于 UI 屏幕通常表现出比自然图像更细长的纵横比，并且包含更小的感兴趣对象（例如图标、文本），我们在 Ferret 之上<strong>加入了“任何分辨率”来放大细节并利用增强的视觉功能</strong>。具体来说，每个屏幕根据原始纵横比分为 2 个子图像（即纵向屏幕的水平分割和横屏的垂直分割）。两个子图像在发送到 LLM 之前都是单独编码的。作者从广泛的基本 UI 任务中<strong>精心收集训练样本，例如图标识别、查找文本和小部件列表</strong>。这些示例的格式主要为了指令遵循，带有区域注释，以方便精确参考和定位。为了增强模型的推理能力，作者进一步编译了一个用于<strong>高级任务的数据集，包括详细描述、感知/交互对话和功能推理</strong>。在对精选数据集进行训练后，Ferret-UI 表现出对 UI 屏幕的出色理解和执行开放式指令的能力。对于模型评估，建立了一个包含上述所有任务的综合基准。Ferret-UI 不仅超越了大多数开源 UI MLLM，<strong>而且在所有基本 UI 任务上都超过了 GPT-4V</strong>。

Ferret-UI可以执行11种任务，从基本任务到复杂任务。它能够在移动UI屏幕上使用灵活的输入格式（点、框、涂鸦）执行任务（例如，小部件分类、图标识别、OCR）和定位任务（例如，查找小部件、查找图标、查找文本、小部件列表）。这些基本任务为模型提供了丰富的视觉和空间知识，使其能够在粗略和精细级别（例如各种图标或文本元素之间）区分 UI 类型。这些基础知识对于执行更高级的任务至关重要。具体来说，Ferret-UI不仅能够在详细描述和感知对话中讨论视觉元素，还可以在交互对话中提出面向目标的动作，并通过功能推理推断出屏幕的整体功能。

![](https://proxy-prod.omnivore-image-cache.app/1086x927,sK3ZzOo6tfhvVHNefMLQTaFdPbAtH3A4GcG1YB6qNrcs/https://pic3.zhimg.com/v2-04d1eb71b8260fef1a2005fd30bacf0e_b.jpg)

## 方法

Ferret-UI建立在Ferret的基础上，Ferret是一个MLLM，在不同形状和细节水平的自然图像中实现空间参考和基础。无论是点、框还是任何自由形式的形状，它都可以解释相应的区域或对象并与之交互。Ferret包含一个预训练的视觉编码器（例如，CLIP-ViT-L/14）和一个Decoder Only的语言模型（例如，Vicuna）。此外，Ferret还采用了一种独特的混合表示技术，该技术将指定区域转换为适合 LLM 处理的格式。从本质上讲，空间感知视觉采样器旨在熟练地管理不同稀疏度级别的区域形状的连续特征。

为了将 UI 专业知识灌输到 Ferret 中，作者进行了两个扩展来开发 Ferret-UI：

（i） <strong>UI指代和定位任务的定义和构建</strong>;

（ii）<strong>模型架构调整，以更好地处理屏幕数据</strong>。

具体来说，Ferret-UI包括广泛的、用于模型训练的<strong>UI指代任务（例如，OCR，图标识别，小部件分类）和定位任务（例如，查找文本/图标/小部件，小部件列表）</strong>，这为高级UI交互建立强大的UI理解基础。与以前需要外部检测模块或屏幕视图文件的MLLM不同，Ferret-UI是自给自足的，将原始屏幕像素作为模型输入。这种方法不仅促进了高级单屏交互，还为新的应用铺平了道路，例如提高可访问性。对数据集的初步探索得出了两个建模见解：

（i）UI屏幕的主要特征是与自然图像中的纵横比相比，纵横比更宽，如Table 1a所示

![](https://proxy-prod.omnivore-image-cache.app/1123x493,scjDW1pSlhos7HVTBOJJaDrvTOPsSJXh7PpIw2jAVLFs/https://pic1.zhimg.com/v2-63bed68457592d82a7b0481b502f4048_b.jpg)

（ii） 这些任务涉及许多感兴趣的对象（即图标和文本等 UI 小部件），这些对象明显小于自然图像中通常观察到的对象。例如，<strong>许多问题都集中在占据整个屏幕不到 0.1% 的图标上</strong>。因此，<strong>仅依靠单个直接调整大小的低分辨率全局图像可能会导致视觉细节的重大损失</strong>。

为了解决这个问题，将 SPHINX、LLaVA-NeXT和 Monkey中提倡的“任何分辨率”（anyres）的概念应用于 FerretUI。具体来说，选择了<strong>两种网格配置，1x2 和 2x1</strong>，它们是根据Table 1a 中描述的原始屏幕的纵横比选择的。<strong>给定一个屏幕，选择最接近其原始纵横比的网格配置</strong>。随后，<strong>屏幕大小调整以适合选定的网格配置，然后被划分为子图像</strong>。直观地说，<strong>纵向屏幕是水平划分的，而横向屏幕是垂直划分的</strong>。所有子图像都使用相同的图像编码器单独编码，并且 LLM 使用所有不同粒度的视觉特征以及完整的图像上下文和增强的细节。

## Ferret-UI-anyres（“任意分辨率”）架构

虽然 Ferret-UI-base是基于Ferret 的架构，但 Ferret-UI-anyres 包含额外的细粒度图像功能。特别是，<strong>预训练的图像编码器和投影层为整个屏幕生成图像特征</strong>。对于基于原始图像长宽比获得的每个子图像，都会生成额外的图像特征。对于具有区域参考的文本，视觉采样器会生成相应的区域连续要素。LLM 使用全图像表示、子图像表示、区域特征和文本嵌入来生成响应。

![](https://proxy-prod.omnivore-image-cache.app/1069x699,sCy8QkYicJvKHYvtMVZx8B2_lgykwdLqJB1uWN6ec66w/https://pic4.zhimg.com/v2-18a4e9ae7f1b79883bc9da9b9d01765f_b.jpg)

## 数据集

<strong>UI 屏幕集</strong>

为了构建一个能够感知移动屏幕并与之交互的模型，收集各种此类屏幕的集合至关重要。这项研究检查了 iPhone 和 Android 设备的屏幕。对于 <strong>Android 屏幕，使用 RICO 数据集的子集</strong> 。具体来说，考虑了 Spotlight中的任务，其数据是公开的，包括 screen2words、widgetcaptions 和 taperception。总共有 26,527 张训练图像和 3,080 张测试图像。

对于iPhone屏幕，使用AMP数据集，该数据集涵盖了广泛的应用。随机选择一个子集，并将其划分为训练和测试拆分。iPhone 屏幕有各种尺寸，总共有 84,685 张训练图像和 9,410 张测试图像。图像尺寸的细分总结在Table 1a中。

对于iPhone屏幕，我们使用AMP数据集\[58\]，该数据集涵盖了广泛的应用。随机选择一个子集，并将其划分为训练和测试拆分。iPhone 屏幕有各种尺寸，总共有 84,685 张训练图像和 9,410 张测试图像。图像尺寸的细分总结在表1a中。

<strong>UI 屏幕元素注释</strong>

在收集了Android和iPhone的屏幕后，作者使用<strong>基于预训练的基于像素的UI检测模型进一步从屏幕中收集细粒度的元素注释</strong>。对于每个检测到的 UI 元素，输出包括 <strong>UI 类型（按钮、文本、图标、图片等）、相应的边界框以及由 Apple Vision Framework 标识的文本</strong>（如果有）。进一步使用屏幕识别的启发式方法将单个检测分组为更大的单元，例如，将多行文本合并为一组，将图像与其标题分组等。

## 任务制定

 本节介绍如何将 UI 屏幕以及相关的检测数据转换为可用于训练 MLLM 的格式。详细阐述了为构建数据集而设计的三种不同方法。

<strong>重新格式化Spotlight</strong>

首先从现有的 Spotlight 任务 中获取 screen2words、widgetcaptions 和 taperception，并将它们格式化为对话式 QA 对。具体来说，GPT-3.5 Turbo 用于根据我们为各自任务编写的基本提示创建一组不同的提示：

 – Screen2words：提供此屏幕截图的摘要;

– widgetcaptions ：对于交互式元素 \[bbox\]，提供最能描述其功能的短语;

– Taperception：预测 UI 元素 \[bbox\] 是否可点击。对于每个训练示例，我们对相应任务的提示进行采样，并将其与原始源图像和真实答案配对。

### 基本任务

UI 检测器输出所有检测到的元素，以及每个元素的类型、文本和边界框。这些检测用于为基本任务创建训练样本。对于定位任务，使用所有元素检测来创建一个用于小部件列表的样本，而其余任务一次专注于一个元素。将元素分为图标、文本和非图标/文本小部件。对于每种类型，创建一个指代样本和一个定位样本。

![](https://proxy-prod.omnivore-image-cache.app/1081x585,svVU0ptphXjZgBRwDy-MRgijt5Xn7astaK3-O2XoFW24/https://pic1.zhimg.com/v2-4d1144b84f7a6ffd5749e6042c4d80ec_b.jpg)

### 复杂任务

首先从检测输出中归一化边界框坐标，然后将检测、提示和可选的单次示例发送到 GPT-4。对于详细的描述和函数推理，将生成的响应与预先选择的提示配对，以训练 Ferret-UI。对于对话任务，直接将 GPT-4 输出转换为多回合对话。

![](https://proxy-prod.omnivore-image-cache.app/1035x607,sFJ9rOZ57ZABXjDmDTvxgDP9YBIvOhCeLB0-ptDpcEZY/https://pic1.zhimg.com/v2-5d8b50e91a8b6d61ee6810b4a956d734_b.jpg)

## 结果

在简单任务完胜GPT-4V，如下图所示：

![](https://proxy-prod.omnivore-image-cache.app/1096x417,sKu0aDSSsy58zg7DqynOtvWZR7x2AbJtuWMng9aLRw3E/https://pic1.zhimg.com/v2-2fcbd2b72861df7260e54f11b73aef5c_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/1078x472,sZCEKlqiujDItGZ8S6PJcwRdgFQMWGkI3hbwEOyHV4RM/https://pic1.zhimg.com/v2-e02293a8387373c49129f505793ddd80_b.jpg)

复杂任务上还是不如GPT-4V，如下图所示：

![](https://proxy-prod.omnivore-image-cache.app/1086x408,sMBwlm2szbPZI6vM8_9PwgJaS4ImxB1znsYfnHZFXEKk/https://pic4.zhimg.com/v2-24609a1a776f08a12ef4d1dff561090f_b.jpg)

## 结论

在本论文中，作者介绍了 Ferret-UI，这是一种专门的 MLLM，旨在增强对移动 UI 屏幕的理解和交互。通过精心设计“任意分辨率”以适应各种屏幕纵横比，并策划包含各种基本和高级 UI 任务的训练样本，FerretUI 在指代、定位和推理方面表现出非凡的熟练程度。这些增强功能的出现有望为众多下游 UI 应用程序带来实质性的进步，从而扩大 Ferret-UI 在该领域提供的潜在优势。

paper：[2404.05719.pdf (arxiv.org)](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2404.05719.pdf)

