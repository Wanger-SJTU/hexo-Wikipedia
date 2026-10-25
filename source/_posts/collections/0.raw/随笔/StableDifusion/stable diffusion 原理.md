---
title: stable diffusion 原理
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/StableDifusion/stable-diffusion-原理/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

https://jalammar.github.io/illustrated-stable-diffusion/

#stablediffusion

Stable Diffusion（SD） 是一种广泛应用的技术，能够以多种不同的方式使用。本文的原理介绍中，首先关注仅从文本生成图像（text2img）的任务。除了文本到图像的应用，另一个主要的用途是通过输入文本和图像来改变图像，这时候的输入就是图像+文字。
![Pasted image 20230610212802.png](/images/collections/assets/Pasted%2520image%252020230610212802.png)

## SD 的组成部分
与其他DL模型的通常单一模型就可以完成任务， Stable Diffusion 是一个由多个组件和模型组成的系统。 

当我们深入观察时，我们可以做的第一个观察是有一个文本理解组件，它将文本信息转换为数字表示，捕捉文本中的想法。

![Pasted image 20230610212906.png](/images/collections/assets/Pasted%2520image%252020230610212906.png)

我们从一个高级视图开始，我们将在本文后面介绍更多机器学习细节。 但是，我们可以说这个文本编码器是一种特殊的 Transformer 语言模型（技术上：CLIP 模型的文本编码器）。 它获取输入文本并输出代表文本中每个单词/标记的数字列表（每个标记一个向量）。

然后将该信息呈现给图像生成器，图像生成器本身由几个组件组成。
![Pasted image 20230610212935.png](/images/collections/assets/Pasted%2520image%252020230610212935.png)

图像生成器经历两个阶段：

### 1-图像信息创建者

该组件是稳定扩散的秘诀。 与以前的模型相比，它实现了很多性能提升。

该组件运行多个步骤以生成图像信息。 这是 Stable Diffusion 接口和库中的步数参数，通常默认为 50 或 100。

图像信息创建者完全在图像信息空间（或潜在空间）中工作。 我们将在后面的帖子中详细讨论这意味着什么。 此属性使其比以前在像素空间中工作的扩散模型更快。 从技术上讲，这个组件由一个 UNet 神经网络和一个调度算法组成。

“扩散”这个词描述了这个组件中发生的事情。 正是信息的逐步处理导致最终生成高质量图像（由下一个组件，图像解码器）。

![Pasted image 20230610213019.png](/images/collections/assets/Pasted%2520image%252020230610213019.png)

### 2-图像解码器
图像解码器根据从信息创建者那里获得的信息绘制一幅图画。 它只在过程结束时运行一次以生成最终像素图像。
![Pasted image 20230610213046.png](/images/collections/assets/Pasted%2520image%252020230610213046.png)

有了这个，我们就可以看到构成稳定扩散的三个主要组件（每个组件都有自己的神经网络）：
- ClipText 用于文本编码。
	- 输入文本。
	- 输出：77 个标记嵌入向量，每个向量有 768 个维度。

- UNet + Scheduler 逐步处理/扩散信息（潜在）空间中的信息。
	- 输入：文本嵌入和由噪声组成的起始多维数组（结构化数字列表，也称为张量）。
	- 输出：处理后的信息数组

- 使用处理后的信息数组绘制最终图像的自动编码器解码器。
	- 输入：处理后的信息数组（维度：（4,64,64））
	- 输出：生成的图像（尺寸：(3, 512, 512) 为（红/绿/蓝，宽，高））

![Pasted image 20230610213145.png](/images/collections/assets/Pasted%2520image%252020230610213145.png)

## 到底什么是扩散？
扩散是发生在粉红色“图像信息创建者”组件内部的过程。 具有表示输入文本的标记嵌入和随机起始图像信息数组（这些也称为潜在），该过程生成一个信息数组，图像解码器使用该信息数组绘制最终图像。
![Pasted image 20230610213210.png](/images/collections/assets/Pasted%2520image%252020230610213210.png)

这个过程以循序渐进的方式发生。 每一步都会添加更多相关信息。 为了直观地了解这个过程，我们可以检查随机潜在数组，看看它是否转化为视觉噪声。 在这种情况下，目视检查是将其通过图像解码器。

![Pasted image 20230610213226.png](/images/collections/assets/Pasted%2520image%252020230610213226.png)

扩散发生在多个步骤中，每个步骤都对输入的潜在数组进行操作，并产生另一个更类似于输入文本的潜在数组以及模型从训练模型的所有图像中获取的所有视觉信息。

![Pasted image 20230610213241.png](/images/collections/assets/Pasted%2520image%252020230610213241.png)

我们可以将这些潜在的一组可视化，以查看在每个步骤中添加了哪些信息。

![Pasted image 20230610213257.png](/images/collections/assets/Pasted%2520image%252020230610213257.png)

The process is quite breathtaking to look at.
- [video1](https://jalammar.github.io/images/stable-diffusion/diffusion-steps-all-loop.webm)
- [video2](https://jalammar.github.io/images/stable-diffusion/stable-diffusion-steps-2-4.webm)

## 扩散如何运作
使用扩散模型生成图像的中心思想依赖于我们拥有强大的计算机视觉模型这一事实。 给定足够大的数据集，这些模型可以学习复杂的操作。 扩散模型通过将问题框定如下来处理图像生成：

假设我们有一张图像，我们会产生一些噪声，并将其添加到图像中。
![Pasted image 20230610213722.png](/images/collections/assets/Pasted%2520image%252020230610213722.png)

现在可以将其视为训练示例。 我们可以使用相同的公式来创建大量训练示例来训练图像生成模型的核心组件。
![Pasted image 20230610213743.png](/images/collections/assets/Pasted%2520image%252020230610213743.png)

虽然此示例显示了从图像（数量 0，无噪声）到总噪声（数量 4，总噪声）的一些噪声量值，但我们可以轻松控制要添加到图像中的噪声量，因此我们可以将其分布在数十个 步骤，为训练数据集中的所有图像为每个图像创建数十个训练示例。

![Pasted image 20230610213758.png](/images/collections/assets/Pasted%2520image%252020230610213758.png)
有了这个数据集，我们可以训练噪声预测器并最终得到一个很好的噪声预测器，它在特定配置下运行时实际创建图像。 如果您接触过 ML，训练步骤应该看起来很熟悉：
![Pasted image 20230610213820.png](/images/collections/assets/Pasted%2520image%252020230610213820.png)

## 通过去除噪声来绘制图像
经过训练的噪声预测器可以采用噪声图像和去噪步骤的数量，并且能够预测一片噪声。
![Pasted image 20230610213843.png](/images/collections/assets/Pasted%2520image%252020230610213843.png)
采样的噪声是预测的，因此如果我们从图像中减去它，我们得到的图像更接近于训练模型的图像（不是确切的图像本身，而是分布——天空通常是像素排列的世界） 蓝色，在地面之上，人有两只眼睛，猫以某种方式看——尖尖的耳朵，显然不为所动）。
![Pasted image 20230610213858.png](/images/collections/assets/Pasted%2520image%252020230610213858.png)
如果训练数据集是美观的图像（例如，LAION Aesthetics，Stable Diffusion 是在其上进行训练的），那么生成的图像往往会美观。 如果我们在徽标图像上训练它，我们最终会得到一个徽标生成模型。
![Pasted image 20230610213914.png](/images/collections/assets/Pasted%2520image%252020230610213914.png)

这总结了扩散模型对图像生成的描述，主要如去噪扩散概率模型中所述。 现在你对扩散有了这种直觉，你不仅知道 Stable Diffusion 的主要组成部分，还知道 Dall-E 2 和 Google 的 Imagen。

请注意，到目前为止我们描述的扩散过程生成图像时没有使用任何文本数据。 所以如果我们部署这个模型，它会生成漂亮的图像，但我们无法控制它是金字塔、猫还是其他任何东西的图像。 在接下来的部分中，我们将描述如何将文本合并到流程中以控制模型生成的图像类型。

## 速度提升：压缩（潜在）数据而不是像素图像的扩散

为了加快图像生成过程，Stable Diffusion 论文不是在像素图像本身上运行扩散过程，而是在图像的压缩版本上运行。 该论文称其为“离开潜在空间”。

这种压缩（以及后来的解压缩/绘画）是通过自动编码器完成的。 自动编码器使用其编码器将图像压缩到潜在空间中，然后使用解码器仅使用压缩信息重建它。

![Pasted image 20230610213946.png](/images/collections/assets/Pasted%2520image%252020230610213946.png)

现在正向扩散过程是在压缩潜能上完成的。 噪声切片是应用于那些潜在的噪声，而不是像素图像。 因此，噪声预测器实际上经过训练以预测压缩表示（潜在空间）中的噪声。
![Pasted image 20230610214000.png](/images/collections/assets/Pasted%2520image%252020230610214000.png)

正向过程（使用自动编码器的编码器）是我们生成数据以训练噪声预测器的方式。 训练完成后，我们可以通过运行反向过程（使用自动编码器的解码器）来生成图像。![Pasted image 20230610214019.png](/images/collections/assets/Pasted%2520image%252020230610214019.png)

这两个流程在 LDM/Stable Diffusion 论文的图 3 中显示：
![Pasted image 20230610214034.png](/images/collections/assets/Pasted%2520image%252020230610214034.png)

该图还显示了“调节”组件，在本例中是描述模型应生成的图像的文本提示。 因此，让我们深入研究文本组件。

## 文本编码器：一种转换器语言模型
Transformer 语言模型用作语言理解组件，它接受文本提示并生成标记嵌入。 发布的 Stable Diffusion 模型使用的是 ClipText（一种基于 GPT 的模型），而论文使用的是 BERT。

Imagen 论文表明语言模型的选择很重要。 与较大的图像生成组件相比，交换较大的语言模型对生成的图像质量的影响更大。

![Pasted image 20230610214102.png](/images/collections/assets/Pasted%2520image%252020230610214102.png)

早期的 Stable Diffusion 模型只是插入了 OpenAI 发布的预训练 ClipText 模型。 未来的模型可能会切换到新发布的更大的 OpenCLIP CLIP 变体（2022 年 11 月更新：足够真实，Stable Diffusion V2 使用 OpenClip）。 这个新批次包括大小高达 354M 参数的文本模型，而不是 ClipText 中的 63M 参数。

### CLIP 是如何训练的
CLIP 在图像及其说明的数据集上进行训练。 想象一个看起来像这样的数据集，只有 4 亿张图片及其说明：
![Pasted image 20230610214138.png](/images/collections/assets/Pasted%2520image%252020230610214138.png)
实际上，CLIP 是根据从网络上抓取的图像及其“alt”标签进行训练的。

CLIP 是图像编码器和文本编码器的组合。 它的训练过程可以简化为考虑拍摄图像及其标题。 我们分别使用图像和文本编码器对它们进行编码。
![Pasted image 20230610214151.png](/images/collections/assets/Pasted%2520image%252020230610214151.png)

然后我们使用余弦相似度比较生成的嵌入。 当我们开始训练过程时，相似度会很低，即使文本正确地描述了图像。

![Pasted image 20230610214204.png](/images/collections/assets/Pasted%2520image%252020230610214204.png)

我们更新这两个模型，以便下次嵌入它们时，生成的嵌入是相似的。
![Pasted image 20230610214217.png](/images/collections/assets/Pasted%2520image%252020230610214217.png)

通过在数据集中重复此操作并使用大批量大小，我们最终使编码器能够生成嵌入，其中狗的图像和句子“a picture of a dog”是相似的。 就像在 word2vec 中一样，训练过程也需要包括图像和说明不匹配的反例，并且模型需要为它们分配低相似度分数。

### 将文本信息输入图像生成过程
为了使文本成为图像生成过程的一部分，我们必须调整噪声预测器以使用文本作为输入。
![Pasted image 20230610214251.png](/images/collections/assets/Pasted%2520image%252020230610214251.png)
我们的数据集现在包含编码文本。 由于我们在潜在空间中操作，因此输入图像和预测噪声都在潜在空间中。
![Pasted image 20230610214305.png](/images/collections/assets/Pasted%2520image%252020230610214305.png)
为了更好地了解文本标记在 Unet 中的使用方式，让我们深入了解 Unet。

### Unet 噪声预测器的层（无文本）

我们先来看一个不使用文本的扩散Unet。 它的输入和输出看起来像这样：
![Pasted image 20230610214337.png](/images/collections/assets/Pasted%2520image%252020230610214337.png)

在里面，我们看到：

- Unet 是一系列用于转换潜在数组的层
- 每一层都对前一层的输出进行操作
- 一些输出被（通过剩余连接）馈送到网络稍后的处理中
- 时间步长被转换为时间步长嵌入向量，这就是在层中使用的

![Pasted image 20230610214400.png](/images/collections/assets/Pasted%2520image%252020230610214400.png)

### 带文本的 Unet 噪声预测器层
现在让我们看看如何改变这个系统以包括对文本的关注。
![Pasted image 20230610214442.png](/images/collections/assets/Pasted%2520image%252020230610214442.png)
我们需要添加对文本输入的支持（技术术语：文本调节）的系统的主要变化是在 ResNet 块之间添加一个注意力层。

![Pasted image 20230610214456.png](/images/collections/assets/Pasted%2520image%252020230610214456.png)
请注意，ResNet 块不会直接查看文本。 但是注意力层将这些文本表示合并到潜在的。 现在，下一个 ResNet 可以在其处理过程中利用合并的文本信息。

## 结论
我希望这能让您对稳定扩散的工作原理有一个良好的第一印象。 涉及许多其他概念，但我相信一旦您熟悉了上面的构建块，它们就会更容易理解。 下面的资源是我发现有用的重要后续步骤。 如有任何更正或反馈，请在 Twitter 上与我联系。