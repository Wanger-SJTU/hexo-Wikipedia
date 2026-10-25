---
title: "AttrPrompt：让LLM生成的数据更加多样、更少Bias的一种思路"
date: "2023-10-25 00:00:00"
updated: "2023-10-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/AttrPrompt-让LLM生成的数据更加多样、更少Bias的一种思路/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/663371079"
---


### 引言

让LLM生成数据不难，难的是生成高质量的数据。

什么叫高质量的数据？以下两点很重要：

- <strong>多样</strong>，而不是千篇一律；
- <strong>bias较少</strong>，尽量不包含对某些群体的偏见。
假设你要生成新闻标题，如果直接写简单的Prompt：*请生成一个有关体育的新闻标题*，那么你大概率无法得到高质量的数据。

以<strong>智谱清言[1]</strong>为例，虽然chatglm能够生成篮球、足球、网球等多类赛事的标题（已经不错了），但仍有以下问题：

- 结构和语气比较类似（多样性低）；
- 主要是“中国体育”范畴内的新闻（有bias）。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5915eac14966.jpg)

为何如此？因为<strong>你提供的Prompt没有足够的信息量，不满足Write clear instructions[2]原则</strong>。LLM只是把Encode到的高频信息（即bias）返回给你而已；且这种bias通过调整temperature也无法消除。

本文首先介绍一种更多样、更少bias的数据生成方法：<strong>AttrPrompt</strong>，源自NIPS 2023的论文：<strong>Large Language Model as Attributed Training Data Generator: A Tale of Diversity and Bias[3]</strong>；随后笔者将谈谈实践工作（包括OpenAI的内容审核、知乎博主的Style Transfer尝试），最后提到对AttrPrompt本质的思考，希望对读者有启发。

### 何谓AttrPrompt

一句话：明确告诉LLM，你想要生成的文本在<strong>哪些维度（Attribute）</strong>上、有怎样的 <strong>具体要求（Value）</strong>。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f814736b4671.jpg)

原论文举的是NYT新闻数据集的例子，其使用的Attribute有4个：

- <strong>subtopic</strong>，子主题；
- <strong>length</strong>，长度范围；
- <strong>style</strong>，写作风格；
- <strong>location</strong>，新闻发生的地点。
每个Attribute对应着一个Value集合，NYT新闻数据集上使用的Value集合如下。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f71c93d04a67.jpg)

<strong>如何进行Data Augmentation呢？</strong> 对每一个Attribute，从Value集合中随机取一个值，构建Prompt让LLM生成数据即可。

<strong>如何得到Attribute、以及对应的Value集合？</strong> 论文采取了人机协同的方法：

- 向ChatGPT提问，询问在生成此类数据时，需要考虑哪些Attribute；
- 人工筛选，保留必要的Attribute；
- 再向ChatGPT提问，让它给出每个Attribute的Value集合；
- 再次人工筛选，保留必要的Value，并且去掉那些可能带来歧义的Value（作者称之为`CAF`过程）。
其Workflow如下图所示。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_304bd2a90fe7.jpg)

补充：在实践中，想得到更加详细的Attribute，还需要更多的工作、以及更多的专业知识。
### 效果如何

衡量合成数据主要看两方面：

- <strong>合成数据本身的质量如何</strong>；
- <strong>合成数据加入训练后，对模型增益如何</strong>。
对于<strong>第一点</strong> -- 合成数据本身的质量，作者主要关注diversity和bias两方面。

在<strong>diversity衡量方面</strong>，作者对比了Gold（真实数据集）、SimPrompt（简单Prompt，仅指明了topic）、AttrPrompt 这三种方法生成数据的<strong>vocabulary size</strong>，size越大说明越多样。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_66ce2c585617.jpg)

从结果来看，AttrPrompt无论是在整体、还是各个类别上（Class Avg），<strong>多样性都好于SimPrompt，但是离Gold还有不小距离</strong>，说明在提升合成数据多样性上，还有很大的空间。

除了对比vocabulary size，作者还使用<strong>sentence-BERT[4]</strong>评估相同类别样本间的cosine similarity，结果如下图。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ff49132c7be6.jpg)

基本结论没变：<strong>AttrPrompt的多样性好于SimPrompt，但离Gold还有距离</strong>。

在<strong>bias衡量方面</strong>，作者在NYT新闻数据集上，比较了不同方法生成的样本在location上的分布。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ff4244dfe7cf.jpg)

可以发现，Gold和SimPrompt中的新闻都<strong>主要发生在北美</strong>，这是一种location bias，而AttrPrompt的结果<strong>更为均匀</strong>（毕竟location作为Attribute，已在Prompt中被指明了）。

对于<strong>第二点</strong> -- 加入合成数据后模型的效果提升，实验结果如下。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0e397dcc8240.jpg)

从结果来看，在4个文本多分类数据集上，<strong>AttrPrompt方法合成的数据，都能带来比SimPrompt更好的效果，但和Gold还有差距</strong>。说明更多样的生成样本，的确能带来更好的模型训练效果。

补充：要进一步提升合成数据的多样性，可以再增加Attribute的数量、Value的范围；论文提供了一种在生成中减少bias的思路 -- 将可能产生bias的维度作为Attribute，在Prompt中指明，然后通过随机采样来消除这个bias。
### 发散一下

至此，AttrPrompt的主要内容已讲完，意犹未尽的朋友可以阅读原论文，以了解更多细节。

接下来，到了笔者的发散时间：）

笔者有以下几点想法：

<strong>第一点</strong>，在Data Augmentation场景，OpenAI其实早已在用AttrPrompt的思路来生成“不良样本”、以增强<strong>内容审核算法[5]</strong>了。从下图可以看出，OpenAI使用了8个Attribute，以生成多样的数据，这体现了<strong>对业务的深刻理解</strong>；

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4aa3c7f0df93.jpg)

<strong>第二点</strong>，在AIGC产品中，许多创业者应该早就在用类似的思路了，AttrPrompt的思路不过是<strong>Prompt Engineering中的一环</strong>而已；更有甚者，早在用类似的方法在做<strong>Style Transfer</strong>了，例如这篇今年3月的<strong>知乎文章[6]</strong>，即说明了如何分析一篇种草文的Attribute（角色、风格、语气、长度、段落和emoji使用），然后据此生成<strong>相同风格、但不同内容</strong>的种草文，很有启发性；

<strong>第三点</strong>，受前文提及的<strong>知乎文章[6]</strong>及其评论启发，笔者认为AttrPrompt生成样本的过程非常类似于`Latent Generative Model`，<strong>Attribute可以类比于隐向量中的embedding index，而Value对应那个index的具体值</strong>，因此AttrPrompt做的事，就是找到<strong>能描述这个文本分布的 结构化自然语言表征</strong>（示意图如下），在此种视角下，Data Augmentation = 从表征分布中随机采样，Style Transfer = 基于表征的可控文本生成。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_633703590178.jpg)

<strong>总结</strong>

本文首先介绍了AttrPrompt，一种在Prompt中定义Attribute + Value，从而生成更多样、更少bias的数据的方法，在Data Augmentation场景展现了良好的效果。

随后笔者进行了发散思考，提到了两个实践工作，包括OpenAI在内容审核场景的应用、知乎博主的Style Transfer尝试，最后提出AttrPrompt的本质是学习文本分布的结构化自然语言表征。

### 关注笔者

笔者将定期分享论文解读、技术实践等内容，欢迎读者朋友关注笔者的知乎账号，也欢迎关注笔者的公众号（二维码如下）。

http://weixin.qq.com/r/6RM6IgLEQ188rUZB90b7 (二维码自动识别)

### 欢迎交流

如果你对本文感兴趣、或者对NLP的学习或实践感兴趣，欢迎与笔者进行交流，关注公众号后即可获得微信号。期待和你一起进行有趣的探索：）

#### 参考资料

[1] 智谱清言: *https://chatglm.cn/*

[2] Write clear instructions原则: *https://platform.openai.com/docs/guides/gpt-best-practices/write-clear-instructions*

[3] Large Language Model as Attributed Training Data Generator: A Tale of Diversity and Bias: *[https://arxiv.org/abs/2306.15895](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.15895)*

[4] sentence-BERT: *https://aclanthology.org/D19-1410.pdf*

[5] A Holistic Approach to Undesired Content Detection in the Real World: *https://ojs.aaai.org/index.php/AAAI/article/view/26752*

[6] ChatGPT 技巧 | Prompt 逆向工程: *[https://zhuanlan.zhihu.com/p/617524191](https://zhuanlan.zhihu.com/p/617524191)*
