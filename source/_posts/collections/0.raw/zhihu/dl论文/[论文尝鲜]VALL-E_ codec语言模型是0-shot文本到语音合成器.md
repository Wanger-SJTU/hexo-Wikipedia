---
title: "[论文尝鲜]VALL-E: codec语言模型是0-shot文本到语音合成器"
date: "2023-04-27 00:00:00"
updated: "2023-04-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/[论文尝鲜]VALL-E_-codec语言模型是0-shot文本到语音合成器/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/624876242
---


### 读一篇获奖的文章

[https://arxiv.org/pdf/2301.02111.pdf](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2301.02111.pdf)

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_bec7c8ceb77b.jpg)

不少作者都认识看到这个Sheng Zhao就想吐，现在还记得，多年前被其卡着要我们check in源代码的丑恶嘴脸。

【追加一下，我当时是**一行自己写的代码都没有checkin到这人单独建立的git branch上**。组里的新来的日本人，倒是把他的代码checkin了。所以说，这人的色厉内荏，对我根本不起作用。】

以后开会的时候，别被我碰到，肯定找机会找回来场子！当时手腕不够硬，怎么就和这样的货色有交集了？？？

按照“被讨厌的勇气”的逻辑，我讨厌的是无能的没有反击的当时的自己而已，所以先记着这个事情。

**

### 摘要

本文训练了一个neural codec language model (VALL-E)，使用的是：

discrete codes derived from an off-the-shelf neural audio codec model

离散的代码（码本），源于一个现有的neural audio codec model（这个还真不知道是啥玩意儿）。。。

把tts当成一个条件语言模型任务，而不是之前的工作的连续的信号回归任务！

训练数据用了6万小时英文语音，远远大于已有的tts用的语音长度（一般是10小时-20小时就不错了！）

牛的地方：VALL-E体现出来了in-context learning的能力，可以基于三秒语音（未知人物角色），来生成高质量的个性化语音。这个还是很牛气的。相当于说，有了三秒的语音，就可以克隆出来一个新人的tts“模型”了。算一下，三秒还不一定囊括了一个语言的所有的元音和辅音呢。。。不知道是否夸张了一些。

另外，对于英文之外的，其他语言，是否也可以3秒就可以克隆语音出来？？？

此外，作者们发现，vall-e可以保持（蕴含在acoustic prompt-3秒语音提示，中的）说话人的情感，以及语音学的环境。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_ff7b3a999387.jpg)

vall-e的系统框图，包括了7个部分先前工作的流程是：

音素->梅尔谱->波形**

**

而vall-e的工作流程是：

音素->离散code -> 波形**

中间的叫什么：discrete audio codec codes，实在还不知道这个是个啥玩意儿。。。

【可以简单粗暴的理解为，对音频进行了“无监督”的“词表”化，类似于“聚类”的思想，让相似波形的一段语音，对应到一个离散的id上，也就是类似对音频段落，按照相似度，进行“聚堆”了。】

上面的1 text prompt是输入的文本信息，而输出的7 则是这个 text prompt对应的语音信息。

3 acoustic prompt可以看成是 参照“物”。整体的架构还是很有意思的。

**

整体而言，vall-e还点开了如下：

#### 技能点：

- zero-shot tts
- speech editing
- content creation，和其他已有的类似于gpt-3的生成ai模型的联合使用（例如text prompt来自gpt-3的生成之类的）。

### 1 介绍

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_bd07353eaf74.jpg)

vall-e和已有的架构的对比，算是很好的直接用6万小时的语音，来搞事情了

架构方面变了，所以很多故事就容易讲了。

#### 贡献如下：

• 我们（=作者们，下同）提出了VALL-E，这是第一个与GPT-3 一样（说一样，就有点大了。。。gpt-3催生了chatgpt，vall-e是要搞一个voice chatgpt吗？应用面没有这么广。。。如果再追加一个文本控制序列，就更牛一些了。。。后来和shujie大神问了一下，他们后续会很快支持一大波tts之外的其他的应用任务的）**具有强大上下文学习能力的TTS 框架，它将TTS 视为一种语言模型任务，以音频编解码器代码作为中间表示，以取代传统的梅尔声谱图。 它具有上下文学习能力，并支持基于提示的零样本 TTS 方法，不需要像以前的工作那样进行额外的结构工程、预先设计的声学特征和微调。

如下图所示：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_3682288378d3.jpg)

如果追加文本控制指令（文本序列），会更有意思一些，不然直接把text for synthesis的部分，追加上文本控制？至少，你需要告诉系统，你是想搞tts，是想搞语音编辑，语音歌唱？等等。。。还是想搞其他的什么任务。。。• 我们通过利用大量的半监督数据在说话人维度中构建了一个通用的 TTS 系统，这表明对于 TTS 而言，简单的放大半监督数据被低估了。

【相当于用一个wav2vec的东西，对大规模弱标注的语音数据，进行预训练。】

**

• VALL-E 能够以相同的输入文本提供不同的输出，并保持声音提示的声学环境和说话者的情绪。

【这块儿不难，就是从acoustic prompt中学出来的，提取出来的了】

• 我们验证VALL-E 通过在零样本场景中提示来合成具有高说话人相似度的自然语音。 评估结果表明，VALL-E 在 LibriSpeech 和 VCTK 上明显优于最先进的零样本 TTS 系统。

【这个效果还不错，就是距离chatgpt那种惊艳，还差一些。。。就不要一开始就说gpt-3了。。。人家啥数据量，啥模型参数规模？？？！！！尴尬，有气了，看到这个zhao sheng ，没有收住，我冷静！】

【另外：后来和shujie大神问了一下，他们后续会很快支持一大波tts之外的其他的应用任务的】

### 2 相关工作

略略略了

### 3 背景-语音量化

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_53aecd630ca7.jpg)

大概搞懂一点意思了，这不就是类似vqvae在图片那边的使用吗。。。另外wav2vec中也用到了codebook量化codebook，其他如hubert里面也有通过聚类的方法来搞这个事情仔细看看上面的图。

就是左边encode，对语音进行离散化压缩；成类似1 30 5 78 这样的离散的序列；简单粗暴的理解的话，就是相当于用一个可学习的“词表”来表示输入的语音序列了。

speech-to-speech翻译里面的 unit to unit翻译的常规操作而已。

右边的则是decoder，是从离散的unit的序列，到语音的解码器。

然后中间很多vq，就是语音量化模块了，以及一个个的残差连接。

如果公开代码的话，会容易理解一些，不过看目前，估计要等等。。。只有看到demo。

### 4 vall-e

#### 问题定义

D = {xi, yi}**

其中，**y是一个语音样本；**

**x={x0, ..., xL}是长度为L+1（？你是不是想说是L?）的音素转录序列；**

使用预训练好的neural codec model来对y进行编码：

**Encodec(y) = C ^ {T * 8}，【这个记法儿，其实有点不好理解】**

$Encodec(y) = C^{[T\times 8]} 【如果把这里的8，泛化为使用的codebook的数量，感觉更High-level一些，即T * B, where B = 8】$

这里，C是一个（**二维的，这个词有误导性，matrix本来就是两个维度的）acoustic code matrix**，矩阵；

T是下采样的utterance length，是从L+1 -> T过来的（可以参考unsupervised ASR里面的常规操作，有个nearby segment merging的操作，类似的效果了）。

**

c[t, :]表示的是，对于frame t来说，八个codes；也就是说，一个位置，用8个离散的codes表示？？？

c[:, j]表示的是，来自第j个codebook的code sequence。。。j={1, ..., 8}。【就是相当于codebook number =8】这个8，是可调节的超参数。至于到底用几个码本codebooks，是实验结果决定的。太少了，表达能力不够，太多了，不好学习。。。

即，词表太大，太小都不好。

八个codebooks，相当于一个辞典被分成了八分，然后他们的“笛卡尔积”**作为最后的词表大小。。。

拿2个codebook举个例子吧：

假如说，我有两个codebook，即，两个码本，每个只有两个词，例如：[0, 1], [2, 3]，那么联合起来，他们可以表示四个不同的词：

0 2

0 3

1 2

1 3

同样的道理。如果是有8个codebooks，假设每个codebook里面包括10个词id，那么他们的笛卡尔积的集合的大小，就是：

8个10的连乘，即1,0000,0000 = 一亿个不同的“词条”。

【故此，其实需要一些详细的分析和消融实验，来证实，为啥这个8个codebooks一定是最好的。。。

假如，我使用4个codebooks，使用其他数量的codebooks，每个codebooks里面的entry-词条id的数量，也是可调的】

**

#### 训练

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_98c8f93f3a62.jpg)

先是搞第一个量化器c[:, 1]，对应第一个codebook。非自回归。然后是第2-8个codebook，都是自回归的。上面的这个设计，是一趟自回归，后面是7趟非自回归。这个背后的motivation，需要好好讲明白。。。

下面具体看一下：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_3805213813a2.jpg)

一个自回归，后面是逐次搞了从1-&gt;2, 2-&gt;3, 3-&gt;4, 4-&gt;5, 5-&gt;6, 6-&gt;7, 7-&gt;8的七次非自回归。上面的图，没有啥难度。

g2p，代表的是从字形到phoneme的操作，有开源的代码：

[GitHub - Kyubyong/g2p: g2p: English Grapheme To Phoneme Conversion](https://link.zhihu.com/?target=https%3A//github.com/Kyubyong/g2p)

然后上面的公式二，也没有啥可说的。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_1da2d12656fc.jpg)

合并起来之后，看。

#### 自回归codec语言模型

其实就是unit离散序列下的一个自回归模型而已。。。

差点没有被所谓的codec给唬住。。。

这块只有文字描述，先不看了。

#### 非自回归codec语言模型

简单理解，和a b c -> a b c 没啥区别。就是序列长度不变了。学习的中间的类似self-attention的多层decoder模块。

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_96a93a20ca4f.jpg)

如果是选择codebook中的index的话，一般softmax无法直接传递，需要用一些平滑策略来搞。

#### inference

这个重点看一下：

上下文学习（in context learning）是基于文本的语言模型的一项令人惊讶的能力，它能够预测未见输入（unseen inputs，例如，在本文中，代表，之前没有见到过的speaker的语音prompt）的标签**，**而无需额外的参数更新**。

 对于 TTS，如果该模型

**无需微调即可为未知的说话人合成高质量的语音，则该模型被认为具有上下文学习能力**。【亮点！】

**

 然而，现有 TTS 系统的上下文学习能力并不强，因为它们要么需要额外的微调，要么会因“不可见的说话人”而显着降低。 【语音克隆能力不强】

对于语言模型，提示（prompts）对于在零样本场景中启用上下文学习是必要的。

 我们设计提示和推理如下。 

我们首先将文本转换为音素序列**，并将登记的录音编码为声学矩阵，形成：

- **音素提示，和**
**2. 声学提示**。 

**

这两种提示都用于 AR 和 NAR 模型。 

对于 AR 模型，我们使用以提示(prompts)为条件的基于采样的解码，因为我们观察到波束搜索可能导致 LM 进入无限循环[这个，作者们能展开说说吗？？？]**。 

**

此外，基于采样的方法可以显著增加输出的多样性。 

对于 NAR 模型，我们使用贪心解码来选择概率最高的标记tokens（units， code in codebooks）**。 

**

最后，我们使用神经"编解码器"解码器(neural codec decoder)**生成以八个代码序列为条件的波形。 

**

声音提示（acoustic prompts）在语义上可能与要合成的语音相关，也可能不相关，这导致两种情况： 

VALL-E：**我们的主要兴趣是为未知说话者生成给定的（语音序列）内容。 该模型被赋予：

- 一个文本句子 textual prompt、
- 一段已登记的语音（acoustic prompt）及
- 其相应的转录（可以得到“转录音素”）（acoustic prompt的对应的文本序列）。 
我们将“已登记语音”的“转录音素”添加到给定句子的音素序列中作为“音素提示”，并使用注册语音的第一层声学标记 c[:;1] 作为**声学前缀**。 

通过“音素提示”和“声学前缀”，VALL-E 为给定的文本，生成“声学标记”，从而最后可以，克隆该说话者的声音。

**

VALL-E-continual：**在此设置中，我们使用整个转录和话语的前 3 秒分别作为音素和声音提示，并要求模型生成延续。 推理过程与设置 VALL-E 相同，只是登记的语音和生成的语音在语义上是连续的。

**

### 5 实验

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_3b62b194174b.jpg)

按照asr的wer来衡量准确率了

下面是tts的效果（特别是未知说话人的）：

![](/images/collections/0.raw/zhihu/dl%25E8%25AE%25BA%25E6%2596%2587/asset/img_9e7d55f5e608.jpg)

效果很不错，比yourtts好很多了

其他就没啥说的了。

关键在于：

- 使用预训练的neural codec decoder来搞事情；
- 一层ar自回归，7层nar非自回归，
- prompt是多模态的，有语音，有音素的，整体还是有意思的。
希望以后看到更多类似的工作了。特别是多模态的，以及基于文本可控的“多任务”的，“多模态”，“多语言”的。感觉这个文章的确是很好的把chatgpt的那种in context learning，以及大模型预训练的思想，引入了语音的多个任务了。**

**未来可期！**

收工。
