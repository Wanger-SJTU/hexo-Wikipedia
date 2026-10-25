---
title: "SpeechTokenizer: 首个针对构建Speech Language Model而设计的语音tokenizer - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-19/SpeechTokenizer-首个针对构建Speech-Language-Model而设计的语音tokenizer-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: dded644a-5084-4a1a-a783-e22ec90d7c77
---

# SpeechTokenizer: 首个针对构建Speech Language Model而设计的语音tokenizer - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-zhuanlan-zhihu-com-p-653816943-18f8c99740e)
[Read Original](https://zhuanlan.zhihu.com/p/653816943)



## 背景

目前的Speech Langauge Model(speech LM)大多依赖于语音的离散表示。具体来说，这些模型首先将连续的语音信号转换成离散的tokens，进而像处理文本一样以自回归的方式进行训练，再通过一个解码器将离散tokens恢复为语音。

比较常用的语音离散表示大致可分为两种：semantic token和acoustic token\[1\]。token如其名，通常认为semantic token建模语音中较为global的内容信息，它们来自于以mask langauge modeling为training objective的自监督预训练模型，比较常见的有HuBERT\[2\], W2VBERT\[3\]等；acoustic token建模语音中的局部声学细节，通常来自于以reconstruction为training objective的neural audio codec，比较常见的有SoundStream\[4\], EnCodec\[5\]。

基于这两种token，目前已有的speech LM建模范式大致可分为三类：

1. <strong>Semantic language models:</strong> 基于semantic token的自回归模型，常外接一个unit-vocoder来恢复语音，比如SpeechGPT\[6\]。这类模型虽然可以完成一些语音内容相关的任务，但是它们产生的音质比较一般，并且无法完成一些副语言学相关的任务，比如音色转换等。
## 2. **Acoustic language models:** 基于acoustic token的speech LM，比如VALL-E\[7\]。这类模型产生的语音音质比较好，并且可以较好地完成一些比如zero-shot TTS的任务，但是会存在内容不准确的问题。

3. <strong>Hierarchical speech language models:</strong> 这类模型由Semantic language models和Acoustic language models 级联而成，既可以产生比较精确的内容，也可以产生较好的音质，比如AudioPaLM\[8\]。但是这类模型，建模阶段太多，较为复杂，需要两种tokenizer的参与；而且在semantic token和acoustic token之间其实存在有很大的信息冗余，会带来一些不必要的建模难度。

因此，如果想要打造好的speech LM，需要有一个理想的speech tokens，它应该具有以下两个特征：

## 1. 和文本的对齐程度比较高

## 2. 保留了语音中各个方面的信息


但是现有的speech tokens都不是专门为构建speech LM而设计的，并不清楚它们和speech LM的适配性。因此我们建立了SLMTokBench来评估不同类型speech token在构建speech LM方面的适用性。它从文本对齐程度和信息保留程度两个方面来量化分析speech tokens，具体评测方法可以看我们论文。通过SLMTokBench，我们发现semantic tokens和文本的对齐程度比较高，但是损失了语音中很大一部分说话人信息。acoustic tokens保留了语音中的各个方面信息，但是和文本的对齐程度不够高。因此，他们都不适合于构建speechLM。

## 方法

基于此，我们想统一semantic token和acoustic token，我们提出了SpeechTokenizer，它基于EnCodec架构，在不同的RVQ层上对语音信息进行解耦和分层建模，从而让第一层token建模语音中的内容信息，剩下几层token补充除内容信息之外的其他信息，如下图。这是首个专为speech LM设计的语音离散化工具。

![](https://proxy-prod.omnivore-image-cache.app/1998x756,s8JgziPxkX42pfibSc5dyjWEEqpxhiLmYc6erydPyisA/https://pic2.zhimg.com/v2-613686f4761d15f41d4eb3c2245af5c5_b.jpg)

具体实现方法为在EnCodec的整体框架上，使用HuBERT representation对RVQ-1的quantized output进行semantic guidance，从而达到第一层token建模语音中的内容信息的效果，并且残差结构会使得剩下的几层来补充内容信息之外的其他信息。

![](https://proxy-prod.omnivore-image-cache.app/1792x1188,svV4u_ew8qj1sIlBrlLEM0D44DCsKnAA0b-XMb6fz3Is/https://pic3.zhimg.com/v2-61624350cc268662285dafb9ad1c1962_b.jpg)

并且基于SpeechTokenizer，我们可以统一上面讲的三种speech LM建模范式，从而构建unified speech language model(USLM),模型结构如下图：

![](https://proxy-prod.omnivore-image-cache.app/2018x802,sD58QEnDLk7o2CW1s2J1NWXLh8StDH_EDPDHXZ8OsFyk/https://pic4.zhimg.com/v2-7c2482d69a4940d02e30e18b30419aab_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/2006x564,sCfCrh55UarSwyBo5Vxj5saCB61sVcOk6pxXafICA49Y/https://pic3.zhimg.com/v2-29545de8b8be925fe1cb5d0e08b64d6e_b.jpg)

我们在zero-shot TTS任务上验证了USLM的优势。

## 实验

### 语音重建

可以去我们demo page上听，我们的音质要好于EnCodec

![](https://proxy-prod.omnivore-image-cache.app/1538x600,stb3ldwWQtZdcVa4NU5umJ9Xo16zH6X2TkSP9eNbDWmk/https://pic2.zhimg.com/v2-88ea7985b02bd20aaae9275368ee8afd_b.jpg)

## Performance on SLMTokBench

从下表可以看出我们在文本对齐程度和信息保留程度上都表现的比较好。

![](https://proxy-prod.omnivore-image-cache.app/1846x988,s7lvaEVO0wjSiKPhB4CIq84oJnDppO_8nGjm8xEbuDQ4/https://pic1.zhimg.com/v2-2c6be45e93c5cdf96542f588031e0b34_b.jpg)

### Zero-shot TTS

可以看到USLM在内容精度和音色保留程度上都要优于VALL-E。

![](https://proxy-prod.omnivore-image-cache.app/1330x384,sgMuYFoJNPeSNBXLCWc97KGFl2zrQBGnfMvq5-lHNl4o/https://pic2.zhimg.com/v2-9d4af3d889feff4f19d0f300c39e9115_b.jpg)

## 分析

### RVQ token中信息解耦的效果如何？

我们做了one-shot voice conversion的实验。具体做法为把source speech的RVQ-1 token和reference speech的RVQ-2:8 token拼在一起送到decoder中得到converted speech。我们发现这种简单拼接RVQ token的做法也可以有不错的音色转换的效果，说明信息解耦是比较成功的。可以到我们的demo page上听效果。

### SpeechTokenizer能否直接应用到unseen langauge上？

SpeechTokenizer在训练过程中只见过英语，我们直接用它直接来tokenize 德语和中文speech。发现RVQ-1送到decoder得到的speech比较机械，没有音色和韵律，说明也有比较好的解耦效果，大家可以去project page听demo。从下面频谱图也可以看出RVQ-1得到的语音丢掉了一些如共振峰等特征。

![](https://proxy-prod.omnivore-image-cache.app/1220x1160,s0C63ndEJj5SxLkDANlFvKquOJHmmSlCA1D0KkFqw4hk/https://pic1.zhimg.com/v2-eafc8fe6fd42d0672b64dc9c0abf9174_b.jpg)

## 传送门

Paper:

Project page:

github:

## Refrence:

\[1\] Borsos, Zalán, et al. "Audiolm: a language modeling approach to audio generation."_IEEE/ACM Transactions on Audio, Speech, and Language Processing_(2023)

\[2\] Hsu, Wei-Ning, et al. "Hubert: Self-supervised speech representation learning by masked prediction of hidden units."_IEEE/ACM Transactions on Audio, Speech, and Language Processing_29 (2021): 3451-3460.

\[3\] Chung, Yu-An, et al. "W2v-bert: Combining contrastive learning and masked language modeling for self-supervised speech pre-training."_2021 IEEE Automatic Speech Recognition and Understanding Workshop (ASRU)_. IEEE, 2021.

\[4\] Zeghidour, Neil, et al. "Soundstream: An end-to-end neural audio codec."_IEEE/ACM Transactions on Audio, Speech, and Language Processing_30 (2021): 495-507.

\[5\] Défossez, Alexandre, et al. "High fidelity neural audio compression."_arXiv preprint arXiv:2210.13438_(2022).

\[6\] Zhang, Dong, et al. "Speechgpt: Empowering large language models with intrinsic cross-modal conversational abilities."_arXiv preprint arXiv:2305.11000_(2023).

\[7\] Wang, Chengyi, et al. "Neural codec language models are zero-shot text to speech synthesizers."_arXiv preprint arXiv:2301.02111_(2023).

\[8\] Rubenstein, Paul K., et al. "AudioPaLM: A Large Language Model That Can Speak and Listen."_arXiv preprint arXiv:2306.12925_(2023).

