---
title: (1 条消息) 语音合成大模型：Mega-TTS 1/2
date: "2024-02-07 00:00:00"
updated: "2024-02-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/语音合成大模型-Mega-TTS-1_2/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/681615103
---


各位朋友们，大家好久不见。前段时间忙于工作，无暇写作。今天，笔者继续与大家分享语音合成大模型研究领域的典型工作。今天分享的是字节跳动做的Mega-TTS和Mega-TTS 2。

在前面的知乎文章中，笔者分享了基于[自回归模型](https://zhuanlan.zhihu.com/p/672852107)和[扩散模型](https://zhuanlan.zhihu.com/p/672986204)的语音合成大模型。自回归模型的典型代表是微软的VALL-E，利用Encodec从原始语音数据中直接提取离散的acoustic tokens(声学词元，类似于NLP中的单词)，然后利用自回归的语言模型建模这些aocustic tokens的上下文分布。扩散模型的的典型代表则是微软的NaturalSpeech2和字节跳动的AudioLDM2，大体上都是遵循LDM(Latent Diffusion Model, 潜在扩散模型)来做的。

仔细分析一下上面的工作，它们遵循的内在逻辑其实是一致的：<strong>直接将原始的语音数据作为一个整体编码成低维度的潜在表征(latent representations)，然后进行生成式建模</strong>。但是，语音和文本、图像还不一样，语音不仅仅包含文本内容，也包含音色、韵律、情感、口音、语速等声学信息。一个人在说话的时候，他的音色基本上保持不变的。像VALL-E和NaturalSpeech2这样简单粗暴地将语音的所有属性混在一起压缩成低维标注，然后再统一建模的方式，不是很明智，很容易浪费的模型的参数，对训练数量的要求也会更大，不是那么data-efficient。

<strong>既然这样，那就对语音的各种属性分而治之，对每种属性采用最为合适的建模方法。</strong>这就是MegaTTS这篇论文的核心思想。在下面的部分，我们重点关注以下两个问题：

- 语音可以分解为哪些内在属性？
- 对这些内在属性分别采用什么方法建模？

### <strong>Mega-TTS：好钢用在刀刃上！</strong>

文章链接：[Mega-TTS: Zero-Shot Text-to-Speech at Scale with Intrinsic Inductive Bias](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.03509)

代码仓库：不开源

#### 问题1：语音分解为哪些属性？

文中将语音分解为四种属性：内容(content)、音色(timbre)、韵律(prosody)和相位(phase)。文章认为，相位变化快，与说话内容无关，对感知质量几乎无影响，没必要用模型参数去建模它；同一说话人的音色特征相对稳定，用一个恒定不变的全局向量来建模就足够了(其实不然，就算是同一说话人，在说一大段话的时候，音色也是会发生变化的)；说话的韵律，也就是说话的节奏和语调，通常具有局部依赖性和长距离依赖性，随时间变化迅速，很适合用语言模型来建模，只不过建模的基础对象由文字变成了音素(phoneme)；另外，语音合成任务中的文本内容和语音是要单调对齐的，如果也用语言模型来建模的话，可能用导致错字、漏字、多字的问题，鲁棒性不是很好。笔者在使用诸如VALL-E这样的自回归模型合成长文本对应的音频时，笔者就观察到了不鲁棒的现象。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8eebc0183ee6.jpg)

图1：对不同语音属性的论述
#### <strong>问题2：对不同属性的建模方法</strong>

在问题1中，我们明确将语音分解为四种内在属性：内容、音色、韵律和相位。那么，对这四种属性，我们应该如何建模呢？从简单到复杂，我们一个一个来看。

<strong>首先是相位。</strong>不同于VALL-E和NaturalSpeech2，论文选用梅尔频谱作为语音的中间表征。相比于原始数据，梅尔频谱直接剔除了与说话内容无关、对感知质量影响甚微的相位特征。

<strong>接着是内容</strong>。对于这一块的处理，其实有很多的TTS工作可以参考。估计是基于鲁棒性与合成速度的考量，论文参考了[FastSpeech](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1905.09263)对文本内容的处理方法。用Transformer将内容对应的音素序列编码为内容表征 H_{content} 。为了建模语音和文本之间的单调对齐关系，引入了duration predictor和length regulator。为了解决TTS中的一对多问题，也将韵律信息作为duration predictor的输入。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e259dee49196.jpg)

图2：FastSpeech的整体结构到这里，Mega-TTS的整体架构其实已经比较清晰了，无非就是韵律输入和音色输入还没有添加进来而已。我们先不管音色和韵律具体是如何建模的，先将timbre encoder和prosody encoder添加进来，可以很容易地画出Mega-TTS的整体框图。对比图1和图2，图2除了多出韵律输入和音色输入，还多出了一个GAN Discriminator。这其实也是语音合成领域较为通用的做法：为了保证语音的合成质量，论文在梅尔频谱的输出上加了一个GAN Discriminator。然后，我们来看论文对韵律和音色的处理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5008613bd7b9.jpg)

图3：Mega-TTS的整体架构<strong>然后是音色</strong>。音色的提取方法也很简单，就是抓住一条先验知识：同一个说话人的音色基本上保持不变。那建模方法其实也很简单，收集同一说话人的语音数据，一起输入到音色编码器，然后对输出在时间上进行平均就可以了。音色编码器的设计采用了典型的卷积模块。

<strong>最后是韵律</strong>。语音的韵律特征变化迅速，和文字一样，同时具备局部依赖性和长距离依赖性，比较适合使用语言模型来进行建模。这里其实有个问题：语言是离散的，但语音的梅尔频谱是连续的，无法直接用语言模型来做。解决方案其实也很简单：使用一个VQGAN将梅尔频谱转换为离散的latent code，然后再用语言模型来做。这种解决思路其实和VALL-E是非常像的，不同地是，VALL-E所用的Encodec是RVQ-GAN，是更为精细化的VQGAN，它处理的对象是原始的、高维的音频数据；更为粗糙的VQGAN处理的则是已经压缩降维后的梅尔频谱数据，因而也就不会存在码率和codebook容量的矛盾问题。韵律的建模方法可用图4来概括。这里还有一点要值得注意：文章为了更好地将韵律和音色、内容剥离开，VQ层仅处理梅尔频谱的低频部分(每个频谱帧的前20个区域)，因为这部分几乎包含了所有的韵律信息，同时相比于全频段来说，包含的音色、内容信息更少。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_eec87fb53f1d.jpg)

图4：韵律的建模讲到这里，我们其实已经将四种属性的建模方式给讲完了。最后，我们用形式化的语言总结一下模型各个部分做的事情，用 (y_p,x_p) 和 (y_t,x_t) 表示提示语音(prompt speech)-转录对和目标语音(target speech)-转录对。我们的目标是：给定 y_p,x_p 和 x_t ，合成高质量的目标语音 y_t ，并且要求目标语音的音色与提示语音相同。

$- 编码： \begin{align} u&=E_{prosody}(y_p) \\ H_{content}&=E_{content}(x_p) \\ \tilde{H}_{timbre}&=H_{timbre}=E_{timbre}(y_p)  \tag{1} \\ \tilde{H}_{content}&=E_{content}(x_t) \end{align} $
$- 韵律预测：\tilde{u}=f(\tilde{u}|u,H_{content},\tilde{H}_{timbre},\tilde{H}_{content};\theta) \tag{2}$
$- 解码： \hat{y}_t=D(\tilde{u},\tilde{H}_{timbre},\tilde{H}_{content}) \tag{3}$
其中， E_{prosody}、E_{timbre}、E_{content} 和 D 分别代表韵律编码器、音色编码器、内容编码器和梅尔频谱的解码器； u 是提示语音的韵律词元(prosody tokens)， \tilde{u} 是预测出的目标语音的prosody tokens， f 是韵律预测函数，用decoder-only的Transformer架构来实现， \theta 则是该语言模型的参数， y_t 是生成的语音。

#### 模型的训练

模型的训练共计包含两个阶段：

$第一阶段：模型训练的损失函数包括VQVAE的损失 \mathcal{L}_{VQ} 和GAN的判别器损失 \mathcal{L}_{Adv} 。 $

$\begin{align} \mathcal{L}_{VQ}&=||y_t-\hat{y}_t||^2+||sg[E(y_t)]-z_q||^2_2+||sg[z_q]-E(y_t)||_2^2 \tag{4}  \\ \mathcal{L}&=\mathbb{E}[\mathcal{L}_{VQ}+\mathcal{L}_{Adv}] \tag{5}   \end{align} $

第二阶段：韵律语言模型的训练，用的是teacher forcing，损失函数是交叉熵。

不过，这里有两个疑问：

- 第一，模型第一阶段的训练不包含韵律信息，第二阶段仅仅训练韵律语言模型，这种做法貌似不是最优的？笔者认为，可能还有第三阶段的训练：把训练好的韵律语言模型也放到Mega-TTS的输入侧一起训练？
- 第二，基于VQGAN的TTS模型的训练的steps数(320k)要多于韵律语言模型(100k)，讲道理，韵律的变化不是会更加复杂吗？应该要用的训练步数吧，为什么训练的步数反而还更少了呢？

#### 模型的推断

$针对不同的下游任务，模型的推断方法会有所不同。对于TTS任务，韵律语言模型使用prosody tokens u 、 H_{content}、\tilde{H}_{timbre} 和 \tilde{H}_{content} 来生成目标语音的prosody tokens \tilde{u} (其实就是公式(2)所做的事情)。然后，加上内容 \tilde{H}_{content} 和音色 \tilde{H}_{timbre} ，一起输入到梅尔频谱解码器 D 中生成目标语音 y_t 。$

对于语音编辑(speech editing)任务，用的是类似BERT的先mask后预测的方法。将待编辑的区域mask掉，然后用Mega-TTS生成新的语音来填补，填补的时候要保证语音的平滑过渡，这样挺起来会比较自然。模型优化的目标是：  \begin{align} \mathrm{max}_{i \in [1, N]} \prod_{t=L}^R p(u_t^i|u_{ 该如何理解这一公式呢？首先，将mask的左侧区域视作提示，使用top-k采样策略生成 N 条候选路径；其次，使用 N 个生成的路径作为新的提示，生成mask右侧区域的概率矩阵，并使用真实韵律词元来获取来获取概率矩阵中每个解码步骤的概率；最后，计算候选路径每个解码步骤的对数概率之和。取最大概率的路径作为预测结果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_84a110231f1f.jpg)

图5：Mega-TTS的推断方法
#### 实验

除了方法上的不同，Mega-TTS在数据集的选取与VALL-E和NaturalSpeech2也有所不同，论文将GigaSpeech和WenetSpeech作为训练语料，共计包含20k小时的多领域语音，domain不再仅仅局限于有声书，语言上也同时覆盖了中文和英文。由于Mega-TTS需要显式地对抽取音色属性，因而多了一个speaker diarization的处理步骤，也就是语音片段打上说话人标签。文章用的是开源模型[pyannote](https://link.zhihu.com/?target=https%3A//huggingface.co/pyannote/speaker-diarization)来打标签。在数据处理上相比VALL-E和NaturalSpeech2要更为复杂。

既然是做的工作是语音合成大模型，那我们也必须关注模型的超参数配置，对模型大小有一个感性的认知。

- 韵律编码器、音色编码器和梅尔频谱解码器都是由5个卷积块组成，隐藏维度为320，卷积核大小为5；
- 内容编码器：4层的Transformer，2个注意力头，隐藏维度为320，卷积滤波器个数为1280，卷积核大小为5；
- 时长预测器：3层卷积，有ReLU激活函数和layer normalization，隐藏维度为320；
- 韵律语言模型：Decoder-only Transformer架构，8层，8个注意力头，隐藏维度为512，卷积滤波器个数为2048，卷积核大小为5；
模型的总参数量为222.5M，介于BERT-base和BERT-large之间，不算很大。

在实验结果上，论文关注语音质量、韵律质量和说话人相似度等指标，对比了YourTTS和VALL-E等模型。先将主要的实验结果摘录如下。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_06b7dc956f02.jpg)

图6：Mega-TTS在质量、韵律以及说话人相似度上均超过了baseline再看鲁棒性方面。因为Mega-TTS用了如同FastSpeech一样的非自回归结构，在鲁棒性的表现会比自回归的Tacotron和VALL-E要更好。而且，我们在上文中也提到，Mega-TTS的整体结构继承自FastSpeech，然后额外添加了韵律输入和音色输入，再用大量的语音数据进行训练。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5138ae16f433.jpg)

图7：Mega-TTS和baseline在鲁棒性上的表现
#### <strong>算法总结</strong>

本文提出的Mega-TTS可以看成是大模型时代下增强版的非自回归FastSpeech，除开韵律属性的语言建模，其他属性的建模方式都较为传统。不过，因为其非自回归的结构，本文的Mega-TTS在语音合成的速度和鲁棒性上相比于自回归的VALL-E会更有优势，这一点在实验中已经得到了证明。

然后再谈谈Mega-TTS的局限性，主要有以下这么几点：

- Mega-TTS未与NaturalSpeech2做比较，NaturalSpeech2用的也是非自回归的建模方式，鲁棒性上也有优势，但二者孰优孰劣呢？
- 尽管训练数据在覆盖领域和语言上有了突破，但数据时长依旧在万小时级别，不能覆盖绝大多数人的说话风格；
- Mega-TTS的规模也依旧在BERT级别，相比于其他的语音合成大模型，并没有大的突破；
- 论文中关于音色恒定的论述不一定成立，一个人的说话音色随着情感的变化也会发生变化的；
- 语音提示只是秒级别的，无法全面表现说话人的语音特征，语音合成模型无法精确、细致地模仿说话人的说话特征，这一点和LLM的长上下文窗口问题有点像；
- FastSpeech的Duration建模仅仅依赖当前的文本内容和预测出的韵律，并不是最优的；

### Mega-TTS 2: 解决Mega-TTS的遗留问题

文章标题：[Mega-TTS 2: Zero-Shot Text-to-Speech with Arbitrary Length Speech Prompts](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.07218)

在上文关于Mega-TTS的总结中，我们谈到了一些关于Mega-TTS的局限性。字节跳动其后出品了续作Mega-TTS 2，旨在解决其中的一些遗留问题。

Mega-TTS 2关注的遗留问题包括：

- 同一人音色恒定的论述不成立；
- 秒级别的短语音提示无法精确、细致地模仿说话人的语音特征；
- 语音时长建模问题；
- 语音合成模型的参数规模和训练语料；
对于前三个问题，Mega-TTS 2在模型上给出了对应的解决方案，对于最后一个模型规模和训练语料的问题，Mega-TTS 2也做了不同以往的配置。我们先来看前三个问题的解决方案。

#### 问题1：同一说话人音色恒定？

解决方案的核心思想是很简单，一个参考音色不够描述说话人的音色特征，那就同时给出多个参考音频，让模型自行选择，选择与文本内容最为相关的音频信息。

这样说来，这个音色编码器的输入就不仅包含多个参考音频，还要包含文本输入(接在Content Encoder后面)，还要有多头注意力模态来选择与文本输入最为相关的音频特征。为了照顾到全局的音频特征，Mega-TTS中的音色编码器也要保留。根据上述的要求，不难得到如图所示的音色编码器——多参考音色编码器(Multi-Reference Timbre Encoder, MRTE)。MRTE由梅尔频谱编码器、梅尔频谱到音素的的注意力模块和长度调节器组成。工作流程如下：首先，梅尔频谱经过编码器变成隐藏状态；然后文本对应的编码向量通过注意力模块提取与之相关的细粒度音素信息；为了照顾到全局的信息，作者还使用了一个全局音色编码器来提取时不变的音色信息；最后，通过时长预测器将拼接后的音色向量展开到帧级别。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0c2b16cecae8.jpg)

图8：MRTE的结构
#### 问题2：短语音提示的局限性

对于这个问题，我们其实可以参考LLM(大语言模型)解决长上下文窗口的方法。尽管学术界提出了很多解决长上下文窗口的奇技淫巧，<strong>但其实最为本质的方法还是直接拿长文本过来硬train一下就行了</strong>。本文解决短语音提示的方法也是这么朴素。

具体而言，将同一说话人的语音沿着时间轴全部拼接起来。然后放在一起来训练韵律语言模型。在一个batch中，梅尔频谱帧的个数最大值为32000。直接使用交叉熵损失和teacher-forcing来续联decoder-only Transformer模型。和Mega-TTS相比，Mega-TTS 2仅仅在训练数据的组织排布上做了改变，来充分利用Transformer模型强大的上下文学习能力。说白了，其实就是利用同一说话人的所有句子得到一个综合的韵律。

$我们将这一过程形式化一下，令 H_{CT} 表示编码了内容和音色的向量， u_t 表示 t 时刻的prosody tokens，有： \begin{align}  p(u|H_{CT};\theta)=\prod_{t=0}^T p(u_t|u_{ $

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9b639ed08a0e.jpg)

图9：Mega-TTS 2中的韵律语言模型
#### 问题3：时长建模也要利用上下文学习能力

考虑到零样本TTS中提示的时长信息，我们提出了一个音素级自回归时长模型（ADM）来通过整合自回归模型的强大上下文学习能力，增强时长建模。ADM的整体架构与PLM保持一致，只是把分类的交叉熵损失改造回归的MSE损失。

这里的建模思想和上一部分的韵律建模非常类似，韵律建模是利用同一说话人的所有句子学习到一个综合的韵律，时长建模则是通过同一说话人的所有句子学习到一个综合的时长。

解决了上述三个问题之后，我们就能得到如图所示的Mega-TTS 2的整体结构。与Mega-TTS相比，不同之处就在于三点：

- 音色编码器变成了多参考音色编码器MRTE，以便同时参考说话人的多条音频；
- 韵律语言模型的训练方式进行了调整，以便利用任意时长的语音提示；
- 语音时长建模方式由FastSpeech的非自回归方式改成了自回归方式，以便充分利用上下文学习能力；
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_45cd80d0968d.jpg)

图10：Mega-TTS 2的整体结构
#### <strong>问题4：参数规模和训练语料</strong>

本文在训练语料上做了扩展，使用了共计38k小时的中英多领域语料。语音对应的转录文本同样由ASR模型得到。同时，和Mega-TTS一样，也要做speaker diarization来提取说话人标签，也要抽取音素级别的对齐信息来为duration predictor的训练提供ground truth。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_131f7e8f4fa5.jpg)

图11：Mega-TTS 2的训练数据集本文在模型规模上也做了较大的扩展。主要模块的超参数设置如下：

- 韵律编码器、音色编码器和梅尔频谱解码器：5个卷积块，隐藏大小为512，卷积核为5；
- 内容编码器：8层Transformer，2个注意力头，隐藏维度为512，卷积滤波器个数为1024，卷积核为5；
- 韵律语言模型：Transformer Decoder，24层，隐藏维度为2048，卷积核大小为1，相比Mega-TTS的韵律语言模型大了很多；
- 时长预测器：Transformer Decoder，8层，隐藏维度为512。
模型的总参数量达到了1.2B，应该是第一个达到1B级别的语音合成模型。

#### 模型的训练

和Mega-TTS一样，同样是两阶段训练。

在第一阶段，在8块A100显卡上训练基于VQGAN的TTS模型，batch size为48，共计训练600k个step。在第二阶段，训练PLM和ADM，batch size是每个GPU 5000个音素，共计训练300k个step。

#### <strong>实验结果</strong>

合成质量。使用1秒的语音提示，Mega-TTS 2的效果就已经很好了，但说话人相似度略低，不过这可以通过加大语音提示的长度来解决。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3212b66d02df.jpg)

消融实验。自回归的时长建模和MRTE均非常重要。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ef631f88693f.jpg)

#### 算法总结

本文提出的Mega-TTS 2，无论是从训练语料、模型参数规模方面，还是从接受任意长度语音提示、多参考音色、任意源语音提示方面，都比较惊艳，工业风十足，基本上已经具备了落地的可行性。该模型也已经被集成到字节火山的语音合成产品中。

说到参数规模达到1B的语音合成模型，笔者近来在逛推特的时候看到一个：MetaVoice-1.2B。该模型由初创公司MetaVoice研发，号称使用100k小时的语音数据训练，支持少样本的英文语音合成，目前已经在[GitHub](https://link.zhihu.com/?target=https%3A//github.com/metavoiceio/metavoice-src)和[Huggingface](https://link.zhihu.com/?target=https%3A//huggingface.co/metavoiceio/metavoice-1B-v0.1)上开源。不过，从评论区的反馈来看，该模型的语音合成质量似乎并不高，比不过XTTS和11labs。Demo中给出的语音质量也非常一般，不如笔者在业务实践中使用其他更小的开源模型得到的合成效果。不过，既然开源界都已经出现了参数规模达到十亿的语音合成大模型，这就代表语音合成领域的大模型时代真的真的是要来了。

说了这么多关于Mega-TTS 2的优点和当前领域的研究，我们最后再来谈谈这个模型的缺点。笔者觉得，无论是Mega-TT还是Mega-TTS 2，其实都摆脱不了对参考音频的依赖，这导致我们在业务实践(比如说给在研游戏的角色进行配音)缺少了许多灵活性。在实际业务中，我们可能更加希望能够自行指定语音合成说话人的性别、情感、口音(比如英语的伦敦腔、日本口音、意大利口音、印度口音等)、语速、音高和说话场景(是否有环境回响、是否有背景噪音、朗读有声书还是闲聊等等)。更进一步地，如果我们希望合成的是长文本的话，我们还希望长文本的各个部分情感、语速、音高根据上下文的文本内容也会有所不同。这样的话，合成的语音才会更加自然、更加拟真。而一个参考音频，往往只能从整体的角度一下子将上面的所有东西都给定死了，灵活性比较差，不适合一些比较creative的业务场景。关于这个方面，其实有一些初步的工作是可以参考的，比如笔者在[以前的知乎文章](https://zhuanlan.zhihu.com/p/672986204)中分享的VoiceLDM。还有著名的开源模型tortoise-tts，似乎也可以支持在细粒度层面上指定合成的情感。近期，stability.ai出品的论文《Natural language guidance of high-fidelity text-to-speech models with synthetic annotations》算是这方面的最新进展(不过并不开源，感觉算是TTS领域的通病了)，单单从demo来看，算是实现了笔者一直期望的效果。笔者近期也会在知乎上分享这篇文章，敬请期待。
