---
title: 【笔记】Stable Diffusion模型优化入门级介绍 - LoRA vs Dreambooth vs Textural Inversion vs Hypernetworks
date: "2023-03-13 00:00:00"
updated: "2023-03-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/【笔记】Stable-Diffusion模型优化入门级介绍-LoRA-vs-Dreambooth-vs-Textural-Inversion-vs-Hypernetworks/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/612992813
---


22年9月份一个获奖作品使AI绘画引爆全网，10月我在本地部署了一个StableDiffusionWebUI程序，然后，就没有然后了。看着我本地生成的一张张垃圾图，从小就喜欢画画又没有天赋的我心里默默留下了泪水。

控制力是AIGC是否能够落地产业应用的关键，ControlNet的出现看上去让AI绘图在工业应用上前进了一大步，但AI绘图的最基础 —— 即StableDiffusion模型，在这短短几个月的时间内也进化了很多。如果你和我一个样是个刚接触AI绘图的新手，或者想尝试自己训练一个定制化的模型，那不妨看看这篇<strong>精短而浅显</strong>的笔记，使得你对于当前主流的优化（fine-tuned）模型有一个基本的了解。

毕竟，一个血的教训是：一个好的模型随便出的图，可能会比你费劲心血、测试修改上百遍的Prompt所输出的结果还要好。

原视频链接：https://www.youtube.com/watch?v=dVjMiJsuR5o

本视频介绍目前四种主流的优化(Fine Tuning) Stable Diffusion模型的方法（Dreambooth, LoRA, Textual Inversion, Hypernetwork）。通过这部视频，你将对模型训练的原理与过程有个基础的认知、了解这四种训练模型的优缺点，最终你将知道如何选用最适合你需求的SD优化模型。文中的理论面向外行人，可能并不准确但十分浅显易懂，如果你在阅读完还是不能完全理解，建议再阅读这篇 Stable Diffusion工作原理 文章，保证你在使用SD工具时不再彷徨。

### Dreambooth

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_64621be7b6f4.jpg)

Dreambooth通过直接修改整个原始模型来对模型输出结果进行调校

<strong>训练内容主要是两个输入</strong>

1. 你要训练的"概念"（Concept）。
在图中的示例里，我们有一张柯基犬的图片。在实际训练时，我们需要给出关于这只柯基狗的更多的图片，  以此才能训练模型对这个”柯基犬“的图像有认知。
2. 与这个“概念”相关联的关键词。
在图中的示例里，这个关键词是SKS。Dreambooth所训练的事情，就是将柯基犬的图片与关键词SKS建立起关联关系来。

训练的过程：

  1. 给训练图片添加n步噪声，使其变成较为嘈杂的图片（测试图左侧的噪声图）。*【即正向Diffusion过程，详见*Stable Diffusion原理简介*】*

  2. 另外再给训练图片添加较少一点的噪声(n-1)，使其成为一张校准图片（测试图右侧的图片）。

  3. 然后我们来训练SD模型以左侧较嘈杂的图片作为输入，再加上特殊关键词指令的输入，能输出右侧较为清晰的图片。

  4. 一开始，由于模型可能根本就不识别新增的特殊关键词SKS，他可能输出了一个不是很好的结果。此时我们将该结果与目标图片（右侧较少噪声的图片）进行比较，得出一个loss结果，用以描述生成图像与目标图像的差异程度。

  5. 接着Dreambooth会做一步被称为<strong>Gradient Update</strong>的事情。有关<strong>Gradient Update</strong>的事情实在是过于复杂了，你可以简单理解为，如果Loss高的话它将惩罚模型，如果Loss低的话它将奖励模型。

  6. 当训练重复了一段时间后，整个模型会逐渐认识到：当它收到SKS的词语输入时，生成的结果应该看起来比较像训练者所提供的柯基犬的图片，由此我们便完成了对模型的调校。

Dreambooth最核心的一点，就是它将训练出一个完整的新模型出来。因此从效果上来说，他是用于将一个新的概念添加到SD模型中最合适的训练方案。当然这也意味着它将占据相当大的存储空间，不过总体来说，Dreambooth还是最好的。

### Textual Inversion

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_740f1bde7064.jpg)

示例中我们仍然是训练柯基犬图像与SKS关键词的关联，整个过程的大部分步骤都与Dreambooth是一样的。

唯一的区别是，在比较训练结果后，<strong>Gradient Update</strong>将作用于SKS在语言处理模型中对应的参数向量（Embedding Vector）。

参数向量简单来说就是关键词SKS经过语言模型处理后所得到的一个向量数据，后续的Diffusion Model将使用这些由输入指令“A photo of SKS”转换而来的一组向量数据作为实际的输入参数，来影响并指导Diffusion生成图像的过程。

通过训练，Textual Inversion为SKS关键词找到了一个最合适的向量*【训练前，如果语言模型原本不认识SKS的话会给他分配一个唯一的新向量，如果认识的话会有一个固定的唯一向量】*，使用该向量即可指导原始的Diffusion模型输出与柯基犬所匹配的图像。

仅仅通过调整一个向量的值就能产生这种效果可能令你难以置信，但是其背后确实是有理论依据的。想要更深入的理解其原因，以及所谓Embedding Vector究竟是什么，可以参阅 这篇文章 获取更详细的说明。

另外由于Textual Inversion本身并没有修改原始的Diffusion模型，它并不能教会Diffusion模型渲染其没有见过的图像内容。你可以更形象地将其训练结果理解成一个单词（SKS）向一个指令（A photo of Corgi Dog）的映射。

Textual Inversion所训练出来的结果实际上就是一个单词与其对应向量的映射记录，是一个非常非常小的数据，一般只有十几K。

Textual Inversion非常的轻量化，也非常的酷，它以一种易于理解的方式来为你的图像增加特定的元素或风格，不过从总体效果上来说Dreambooth还是更好一些。

### LoRA

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_fd85656aa027.jpg)

全称Low Rank Adaption，想要理解它的原理首先非常非常概括的介绍下AI模型的内部实现。

现今AI模型所使用的神经网络结构大多是由许多的计算层叠加而成的。你的输入输出首先传入第一层，经过其计算，生成一组新的数据，再作为数据传入第二层，依次计算传递，最终由最后一层给出结果。随着层数的叠加，整个模型逐渐的能够理解你所输出数据的含义并最终给出期望的结果，这就是神经网络的一个大致的描述。 

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_ae8279a7679c.jpg)

LoRA并不是AI绘画专有的技术，其原本是针对于LLM（大语言模型）所开发的技术，旨在解决避免将整个模型参数拷贝下来才能对模型进行调校的问题。（相较于SD，LLM的模型参数量完全是另外一个级别的了，比如ChatGPT3据说有1750亿参数，如果每次修改都要拷贝整个模型出来，那就有点太难以调校了）

LoRA采用的方式是向原有的模型中插入新的数据处理层，这样就避免了去修改原有的模型参数，从而避免将整个模型进行拷贝的情况，同时其也优化了插入层的参数量，最终实现了一种很轻量化的模型调校方法。

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_d2f1f15189d1.jpg)

因此，与前面方法一样，通过训练，我们最终将训练出一整套新数据处理层的参数，而这些参数插入进原有的SD模型中，将会使输出结果与SKS产生我们所期望的关联关系，即SKS - 柯基犬图像。

LoRA训练相较于Dreambooth更快且使用更少的VRAM，其数据大小相较于完整模型要小很多（150M左右）。

### Hypernetwork

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_192270e44e0a.jpg)

Hypernetwork的训练原理与LoRA差不多，目前其并没有官方的文档说明*【据传其来源于被泄密的代码】*。视频作者通过阅读AUTOMATIC1111 WebUI中使用的Hypernetwork插件代码来分析其作用原理。

与LoRA不同的是，Hypernetwork是一个单独的神经网络模型，该模型用于输出可以插入到原始Diffusion模型的中间层。

因此通过训练，我们将得到一个新的神经网络模型，该模型能够向原始Diffusion模型中插入合适的中间层及对应的参数，从而使输出图像与输入指令SKS之间产生柯基犬概念的关联关系。*【按这种说法，可以将其简单理解为间接版的LoRA】*

视频作者认为Hypernetwork实质上是个破产版的LoRA，但LoRA技术的背后其实是有很深的数学理论做支撑的，对于如何最优化其训练速度及参数量都有着详实的研究理论及数据支撑，而通过训练一个神经网络去再去生成LoRA的参数这种间接方式，可能最终得到的结果并不是最有效或最优的。

从训练产出上来说，Hypernetwork的训练结果同LoRA一样，也就是一个大概150M左右的小模型，非常便于传输与分享

### 技术比较

四种训练方式的基准数据：*【实际取决于你的设备和训练参数，这块视频作者并没有给出，但是可以作为相对值进行参考】*

训练方式输出大小（MB）所需最小显存（GB）训练用时（分钟）Dreambooth20008.045Hypernetwork1148.070Textual Inversion0.00138.060LoRA1457.015CivitAI上对这四种模型的偏好程度：

类型平均下载量平均评分平均点赞数平均评分同类中Top100数量Checkpoint5,156.479.82291.374.92100hypernetwork426.961.3239.012.7173textual-inversion1,127.582.7586.4286.42100LoRA181.451.1820.732.7011*<strong>【注意视频发布于/15，现在的统计应该不是这样了，仍然是做相对参考。Checkpoint是完整模型的文件格式，可以理解为其等价于Dreambooth】</strong>*

- 可以看出<strong>Dreambooth</strong>是目前使用最广泛的优化模型，他的下载量、喜好与评分都是排名第一，这虽然并不一定意味着他就是最好的优化方式，但这证明了其目前拥有最活跃的使用群体。当你想要尝试自己调整模型时，你可以较为轻易的找到很多与Dreambooth相关的使用与技术文章。
- <strong>Textual Inversion</strong>排名第二，其在用户喜好上甚至略高于Dreambooth。
- <strong>LoRA</strong>的数据不太好，不过由于其是一个很新的技术*【作者视频发布与/15】*，在统计中只有11个LoRA模型，所以其效果还有待于观察。
- <strong>Hypernetwork</strong>可以说是表现很糟糕了，无论从技术层面还是实际数据来看，可能你都不应该考虑使用他。
最终作者还是推荐使用Dreambooth，无论从原理还是实际用户反馈来看，他所获得的效果都是最好的。

另外作者推荐多尝试LoRA，他的优点在于其训练速度快，通常训练一个模型都是需要进行多次迭代的，其在速度上的优势会使其的训练迭代过程可以更多，更便于调整。*【从视频作者给出的原理分析来说，LoRA的发展潜力会更大，而且Hypernetwork应该会被直接取代。而如果我们像ChatGPT一样给SD添加出超过某一阈值的天量参数网络出来，其结果会不会再次震惊到我们？】*
