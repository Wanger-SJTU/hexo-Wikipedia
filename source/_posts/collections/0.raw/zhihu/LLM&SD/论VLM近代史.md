---
title: 论VLM近代史
date: "2025-08-26 00:00:00"
updated: "2025-08-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/论VLM近代史/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1941628951534470646
---


很久没更新，最近做视频生成的工作偏多。看到GLM-4.5的发布不禁感叹VLM的发展真有够迅速，暂且抛开功能性，至少新工作的更新速度真的很快。

这篇文章是一个随笔，其实主要是我也要开始秋招了，虽然之前实习有深度接触过一些VLM的模型，但是最近又想好好看看VLM的一些设计，可能会有不少新的发现。最近工作量比较饱和之后也感觉做算法对于我这个bg来说真的不太容易，虽然可能有一定coding能力，但是各企业不断提高的招人要求和算法岗的内卷程度让我一方面担心和我一样并不太出众bg的同学以后如果想做算法的困难度，另一方面也对他们能够坚持做自己想做的工作产生敬佩之情。

以上是本人的一些废话。

本篇文章由于是随笔，大白话居多。如有理解偏差欢迎讨论，我也在学习中，不对的地方多多指正。

更新记录：

<strong>20250827 更新Seed1.5-VL</strong>

<strong>20250828 更新GLM及CogVLM</strong>

<strong>20250911 更新MIMO-VL</strong>

<strong>20250920 更新ERINE-4.5</strong>

<strong>20251007 更新Qwen3-VL</strong>

第一阶段：Old模型探路

Step1：绕不开的CLIP
Link：[[2103.00020] Learning Transferable Visual Models From Natural Language Supervision](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2103.00020)

![](https://pic4.zhimg.com/v2-3bbc294eac3bf1747904a79e49b8bce9_r.jpg)CLIP架构个人觉得CLIP更像是一个超大的检索系统，用很简单结构和大量数据构建了一个对比矩阵去“记忆”图像embedding和文本embedding的联系。在推理的时候给一张图像然后去查最接近的embedding就可以了。接下来是经典的训练伪代码：

![](https://pic3.zhimg.com/v2-4377e2b088aa303548a7bc8b5cdec348_r.jpg)经典伪代码整体来说就是图像和文本经过各自的编码器获得embedding，然后归一化+做一下带温度系数的指数运算，为啥要这样做其实就是为了（1）归一化到0-1，后面损失好算，因为GT的关系矩阵就是对角全为1的矩阵（2）平滑矩阵分布，为了更好收敛，本来就是对比分布，很多基于交叉熵的训练也是会平滑分布的

CLIP作为所谓一些“开集”任务的基础模型，其实就是通过庞大的类别和对应图像学习一个检索矩阵，只需要给定文本类别，然后给图像，他就能做到zero-shot的分类。但这个“开集”本身就只是一个巨大的闭集，只是因为类别太多能够覆盖大部分自然图像对应的类别以至于能够zero-shot泛化上去，这一点当你把CLIP迁移到小领域之后就会发现这一点，实际就是老生常谈的OOD问题了，只能用新数据迁移过去。

CLIP细粒度的问题也很明显，在初期有很多工作想直接用CLIP去做检测、分割之类的low-level工作，结果发现效果奇拉。这一点实际上是因为CLIP用交叉熵去学这个分布，本质上就是分类任务（实际也是做分类占大多数）。大伙应该都有对backbone做热力图可视化的经验，我们会发现分类任务的训出来的backbone做可视化都是集中在一些很凌乱、视觉上意义不明的部分，其实这部分是作为proxy token完成分类任务，cls token在后期主要就是从proxy token去“吸收”注意力，完成最终的分类任务。所以为什么从很早开始就有FPN，ASPP这种去融合backbone输出的多尺度特征图再送到任务头的操作。究其本质就是分类这种非密集预测任务与密集预测任务的区别。

相反，密集预测任务更习惯用DINO、DINOv2这种通过自监督训练的backbone（最近出了DINOv3，还没有看，后面看了如果觉得有意思再补充）

DINOv2：[[2304.07193] DINOv2: Learning Robust Visual Features without Supervision](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2304.07193)

因为是从图像自监督的各种网络理解的细节信息去让网络学习图像的显著表征，没有抽象语义的标签去做强约束，所以DINO学出来的特征图会从视觉上更偏向于人类直觉想要关注的区域。当然这些都是为了理解CLIP的一些特点和缺点，更多细节网上有数不清的博客解析，感兴趣可自己查看。

总而言之，CLIP在我看来并不算我们想要的VLM，他只能作为VLM的一个辅助来提供图像或者文本的理解。CLIP现在最多的就是用他的编码器去提特征之类的操作。

Step2：SigLIP
Link：[2303.15343](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2303.15343)

SigLIP的提出是为了减少CLIP的训练成本，这涉及到Sigmoid和Softmax处理后的对比矩阵，这个就不细讲了，把他当成优化版CLIP即可。

Step3：BLIP和BLIP2
BLIP和BLIP2其实思路基本都差不多，所以这里直接照着BLIP2来讲。

Link：[[2301.12597] BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2301.12597)

![](https://pic3.zhimg.com/v2-3f6a4b192fcdbd8e1bcace1adf6b9d44_r.jpg)BLIP2架构图从BLIP开始VLM才有现在VLM的影子。BLIP系列应该是结构最为复杂的几个VLM之一。他构建了三个任务去学提出的Q-former。三个任务分别是：图文匹配（ITM），图文对比（ITC）和文本生成（ITG）。这三个任务到底在干啥？相比讲他中间的工作流程，我更倾向于大伙去了解每个任务的输入输出在干什么就行，不然会越看越难懂。

先讲下Q-former的输入输出：输入是图像经过vision encoder的img embedding、一组learnable query、text。img embedding作为一个额外condition去督促learnable query的学习，可以理解为learnable query是增强版的vision token。

ITC：既然是图文对比，我们很自然想到CLIP的对比学习，实际BLIP也差不多，ITC做的就是计算我learnable query和text token的相似度。成对的数据应该匹配相似度越高，选最高的当相似度。他们之间的信息交流为0，用了uni-model的mask方案，为了防止信息之间的相互泄露。

ITM：图文匹配，对比有了，匹配是要干啥？这里相当于一个二分类任务，每对img和text只有匹配或者不匹配两种结果，所以在ITM的末尾有一个二分类的任务头来判断和我输入的文本是否匹配。这里因为要匹配嘛，假如互相看不见信息，怎么判断匹不匹配呢？所以这里的mask用的bidirectional的双向可见以交互img和text的信息。

ITG：文本生成，这个生成来干什么？这里其实就是输入文本和图像，生成文本。就跟我们现在的自回归LLM一样，我把图像的token送给text这边当条件，根据这个条件和我输入的text，transformer decoder去预测接下来要生成什么文本。这里的信息交互用了单向mask的attention，为了从图像token获得信息。为什么text token能够从图像token获得信息而不允许图像token从text token获得信息，可能是为了防止文本的信息把图像token带偏从而对后面的结果产生误差累积。

所以这个Q-Former到底是来干嘛的？二阶段的训练给了我们答案，learnable query的存在实际上就是为了对齐图像和文本的语义空间，两个空间本身差距较大，如果我们想把他们拼起来送到LLM中去生成文本，那就需要做语义对齐。第一阶段就训练这个Q-former，第二阶段在Q-former后接上LLM，Q-former输出的就是learnable query（也就是对齐后的图像token，语义空间已经和text token一样了），和本身的text token拼起来送到LLM，最终生成答案。

BLIP2劈里啪啦设计一大堆的很大原因其实是因为想用成对的图文匹配数据去做VLM，也就是先从text token给语义空间的先验给img token，为了更好地对齐这个空间。

Step4：Flamingo
Link：[2204.14198](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2204.14198)

![](https://pic3.zhimg.com/v2-0fc992645b985735392ad07840f968a8_r.jpg)Flamingo架构图Flamingo的提出主要是注意到BLIP系列都是用图文成对的数据去训练，这样会导致一个很致命的问题就是上下文严重缺乏理解，连贯性非常差，几乎只能做单轮的对话理解，你要是输入两张图也不行，任务限制非常大。

Flamingo根据这点去收集了图文交织的数据，如上面图所示，不限制图的数量，反正交织数据被切分为文本+图像的形式。文本用<image>的占位符去填充图像的位置，这个文本就是一段连贯但又少一些东西的话，少的那一部分就是整个模型需要预测的。

image的编码也很简单，有点像Q-Former，也是用learnable query去增强img token的表达能力，具体如下：

![](https://pic1.zhimg.com/v2-415c941f3d4d89595ad18fbfdec4189e_r.jpg)Perceiver Resampler所有的图像（不管是视频各帧还是不同的图像）都经过Vision Encoder先获得 
![](https://www.zhihu.com/equation?tex=X_f) 这个img token，如果是视频帧还会加绝对时间编码上去，然后learnable query 
![](https://www.zhihu.com/equation?tex=X) （对应图中的learned latent queries）作为Q， 
![](https://www.zhihu.com/equation?tex=X_f) 和 
![](https://www.zhihu.com/equation?tex=X) 在length上拼接起来作为K和V，然后通过Self-attn综合特征，然后送到FFN，没什么特别的设计。输出的Query会送到LM里面的GATED-XATTN-DENSE，结构如下：

![](https://pic1.zhimg.com/v2-79c59a2c9957895326405252e375656e_r.jpg)GATED-XATTN-DENSE也是很简单的一个结构，就是Self-attn block在前侧加上一个带Tanh的门控CrossAttn，没什么好说的，人家代码都给放论文里了，也就这么几行。

Flamingo相比与BLIP2，考虑到了视频的理解，还有我们最自然的想让VLM做的事就是输入一堆图，让他理解后面应该生成什么话，整个训练流程也是采用类似文本续写的方式。这个方式为后面的利用caption+Instruction组织指令遵循数据做了铺垫，这个时候已经有现在VLM的味道了。

Step5：LLaVa
Link：[arxiv.org/pdf/2304.08485](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2304.08485)

LLaVa的出现其实算是打了BLIP系列的脸，BLIP设计这么大一堆为了对齐语义空间的结构，结果LLaVa一个Linear，塞一堆数据上去也能直接对齐。

![](https://pic4.zhimg.com/v2-24be2b69aa8f09b124210e900f8f12ab_r.jpg)LLaVa架构LLaVa的架构真的是简单得不知道怎么形容，img token直接用一个linear和text token的hidden dim去做对齐。没有任何花里胡哨。

数据方面进化成了instrustion-following data。模型根据instrustion+img token来回答问题，这个就是指令跟随。最简单的例子就是Describe this image. 然后你输入一张图，模型就开始balabala说There is a cat in the grass啥的回答。他们做数据的方式可以供小领域做多模态去参考，后面大部分模型的数据pipeline也是这种方式的各种细化。

![](https://pic4.zhimg.com/v2-6538e53a469980596da3cf1488f8a8e5_r.jpg)instrustion-following data很简单，收集的数据有caption有box，然后确定集中instruction的模型，LLaVa就是确定了三种大致的instruction，对应途中conversation、detailed description、complex reasoning。根据这些类型去生成问答的方式，然后剩下的就交给gpt，让gpt根据问题和caption自动关联生成一系列问答模式的instrustion-following data。由于当时好用的VLM很少，所以主要是获得caption和box比较麻烦，现在vlm百家争鸣，caption的获得也比较多样了，直接用自动化打标的方式也能获得质量不错的caption，前提是prompt足够好，限制也足够多。一般都是用一些样例让vlm用few-shot的方式生成想要的caption。

个人认为，从LLaVa开始就正式进入了现在我们常使用的VLM的时代，VLM的角色更像是一个助手，帮助我们对图像或者视频进行各种理解，以及做一些简单的视觉任务。

第二阶段：BaseModel的百家争鸣
这个阶段各家公司主要开始用大量数据+一些前置处理去解决几个事：

- OOD问题：扩大训练集能够拟合的分布，减少OOD问题，实际就是疯狂加数据，让大模型形成一个巨大的拟合状态（只要你过拟合的场景多范围大，那就等于泛化性超强）
- 如何处理高分辨率图像、多张图像、帧数较多的视频：基本都是压缩token或者把图片做一下缩放和拼接的处理
- 如何在一些表现不佳的任务上进行优化（这个与企业布局有关）
- Post-Training如何提高basemodel上限其实不管是哪家的VLM，发展历程都是非常的相似，基本遵从下面的架构

初代：BLIP2架构--->LLaVa类似架构

修改：适应各种其他的任务，强化弱项，在数据上下的功夫比较多

发展到现在：Post-Training提高模型回答能力，CoT优化，各种RL方法的小优化和叠加使用，减少infer时间和训练成本...

LLaVa系列（微软）
LLaVa推出以后同年又推出了LLaVa-1.5，Link：[https://arxiv.org/pdf/2310.03744](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2310.03744)。

LLaVa-1.5的结构也是很简单，直接把LLaVa的linear改成了两层MLP，然后对高分辨率的图像做了以下处理：

![](https://pic3.zhimg.com/v2-42039353e97db5335e546aa0595c3fc2_r.jpg)LLaVa-1.5-HD把高分辨率的图像拆为patch，把patch用vision encoder编码成token，同时把原图resize成patch大小，也通过vision encoder编码成token，最后把这些token都在length上拼起来然后送入LLM。这样的设计其实是因为他预训练的ViT是强制在一个分辨率上训的，所以只能拆成这样去组成，resize再encode就是为了防止分patch之后全局的空间信息丢了，所以为了保证全局空间信息的保留做了resize。

数据处理：

数据量增大到665K，这个数据量放到现在来是不多的，LLaVa前期一直走的少量数据训练的路线，到后面发现实在是打不过超大量数据训出来的模型，后期也加了数据。instrustion-following data数据的种类也更加多样，有了GPT之后生成的数据多样性也是越来越好。

除此之外，LLaVa1.5的数据还针对BLIP和LLaVa对简短问题回答不好的现象做了调整。BLIP回答不好问题是因为视觉token长度实际上很大部分是收到learnable query的长度影响，这个长度在训练的时候就定下来了，很简单的道理，从直觉来讲，不管什么输出什么图像，LLM获得的视觉token都是长度固定的一组query然后作为前缀送进去，加上BLIP都没有对LLM进行微调，一直都是冻结着的。这样LLM就会倾向于生成长度模式比较固定的回答，很难平衡长回答还是短回答。而LLaVa则是因为问答数据对输出格式没有进行格式限制，所以会倾向于回答得特别简短以至于忽略其中一些命令。LLaVa1.5就在instruction后面加入了输出格式的限制（其实也就基本加了一句话）

![](https://pic1.zhimg.com/v2-629be530822d3827cf356c2bbd54e744_r.jpg)针对简短问题设计的指令遵循格式简短问题就可以用原本的问答数据进行分解，直接ChatGPT就能解决。

后续LLaVa也很快推出了NEXT版本和OneVision版本，主要就是在一些专用问题上进行性能优化，加入这些领域的数据，优化高质量的指令遵循数据，更多样化的QA数据等等。然后对于超高分辨率的图片和视频，在分patch encode后又通过插值去减少视觉token的数量。因为之前分patch实际上只是为了适应ViT的预训练分辨率，并没有进行token数量的优化，当分辨率上去之后token数量暴增，训练成本也会增加。

LLaVa的优化也为别的basemodel训练提供了思路，后续很多模型其实都遵从了类似LLaVa的模型设计，主要是在数据清洗和高质量数据筛选上做的工作会比较多。LLaVa-OneVision的训练数据量约9M，其实相比其他模型也是算比较少的，主打一个简单，少量（虽然现在效果也算比较拉的）。

InternVL系列（上海AI Lab）
Project Link：[GitHub - OpenGVLab/InternVL: [CVPR 2024 Oral] InternVL Family: A Pioneering Open-Source Alternative to GPT-4o. 接近GPT-4o表现的开源多模态对话模型](https://link.zhihu.com/?target=https%3A//github.com/OpenGVLab/InternVL)

InternVL系列作为较为初代能够给大部分研究者部署和微调训练的VLM（至少本人一开始就是用InternVL做一些toy项目玩），在使用上体验感还是不错的。

<strong>InternVL-1.0</strong>

InternVL-1.0和BLIP2算是几乎同期的工作，Link：[[2312.14238] InternVL: Scaling up Vision Foundation Models and Aligning for Generic Visual-Linguistic Tasks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.14238)

InternVL-1.0在做的事情在标题就说清楚了：扩展视觉基础模型。所以它的一个点就是把vision encoder扩展到了和text encoder差不多的参数，虽然这一点到后面又改回了300M的vision encoder。

看下论文，整体架构如下：

![](https://pic2.zhimg.com/v2-d768568d74166f7750058552da27bfcd_r.jpg)InternVL1.0的训练框架整体和BLIP2很像，但是把vision encoder scaling up到6B，毕竟当时数据scaling之后可能自然想着把vision encoder也scaling上去。具体训练思路如下：

![](https://pic1.zhimg.com/v2-5de2582307ac356abe0bd40706550430_r.jpg)InternVL1.0的训练思路第一步是用vision encoder和llama-7b用CLIP的架构去做对比损失训练vision encoder让他有初步的语义理解能力（粗粒度），这个时候可以做zero-shot的图像分类和图文检索，和CLIP能做的任务是一样的。

第二步将训练好的vision encoder冻结，把图像的vision token输入到Qllama结构里面，这个Qllama也是llama改进而来的，<strong>QLLaMA 是在预先训练的多语言 LLaMA 的基础上开发的、并新增了 96 个可学习查询层和交叉关注层（原文），训练的时候Qllama冻结，只训练CrossAttention，这一部分其实就是为了研究空间对齐</strong>。具体的训练可以参考上面写的BLIP2，没有什么大区别，只是把Q-former换成了Qllama后，原本llama带有的caption能力是能够让整个流程完成caption任务的。这一部分训练出来能够实现的功能是：

输入：图片
输出：图片的caption
第三步将vision encoder+Qllama+CrossAttention都冻结，因为此时具备了将视觉空间对齐到文本空间的能力，然后在Qllama后面接MLP并连到Vicuna-13B上，同时vision encoder也会后接一个MLP连到Vicuna-13B上，这里是为了在最终的LLM之前再做一次语义空间对齐（因为Qllama和Vicuna是两个组件，即使都是LM，也会有语义空间上的差别，LM到LM也需要对齐），最终输出最后的结果。很自然，在这种架构上训出来的模型是能够进行多模态对话任务和VQA的。这一部分训练出来能够实现的功能是：

输入：图片+Text（可选Text）
Qllama中间输出：图片caption
Vicuna接受的输入：图片+图片caption+Text（可选Text）
输出：答案/对话/...
整个InternVL-1.0的训练过程逐步递进，任务从简单到复杂，并且整个训练过程相对“安全”，对齐也做了两次，当然训练成本也相对较大。

<strong>InternVL-1.1</strong>

1.1版本相对1.0，把Qllama取消了，换成了LLaVa一样的MLP（这里进化路线就基本一样了）

![](https://pic1.zhimg.com/v2-51974e2d2b735204b73275eee14b2d82_r.jpg)InternVL-1.1训练的vision encoder还是1.0的InternViT-6B，但是把训练整体的分辨率往上拉到了448，分辨率高带来的问题就是patch大小不变的同时token数量的成倍增长，为了提高计算的效率，1.1在encode后进行了Pixel Shuffle，这也是后续版本经常会使用到去减少视觉token的操作。另一个改动就是把Vicuna-13B的LLM换成了LLaMA2-13B（因为Vicuna真的是拉得一批。。）

Pixel Shuffle代码：

def pixel_shuffle(self, x, scale_factor=0.5):
        n, w, h, c = x.size()
        # N, W, H, C --> N, W, H * scale, C // scale
        x = x.view(n, w, int(h * scale_factor), int(c / scale_factor))
        # N, W, H * scale, C // scale --> N, H * scale, W, C // scale
        x = x.permute(0, 2, 1, 3).contiguous()
        # N, H * scale, W, C // scale --> N, H * scale, W * scale, C // (scale ** 2)
        x = x.view(n, int(h * scale_factor), int(w * scale_factor),
                   int(c / (scale_factor * scale_factor)))
        if self.ps_version == &#39;v1&#39;:
            warnings.warn(&#34;In ps_version &#39;v1&#39;, the height and width have not been swapped back, &#34;
                          &#39;which results in a transposed image.&#39;)
        else:
            x = x.permute(0, 2, 1, 3).contiguous()
        return x
其实就是在空间上压缩到四分之一，然后把这个空间上的压缩补到通道上，通道变成了以前的四倍。这样相当于更多的信息被压到了channel中，后续MLP会对齐需要的维度。在通道和token数的权衡中明显减少token数带来的运算量要少很多（主要考虑infer的成本）。

1.1的训练则简化到了两个阶段

![](https://pica.zhimg.com/v2-1dfd951b68688807c8151c7269faeffa_r.jpg)InternVL-1.1的训练第一阶段只训练vision encoder+MLP，这一阶段用了72M的样本去训练vision encoder，第一是适应分辨率，第二是训练能对齐语义空间的MLP。

第二阶段就是主要提升整个model的中文理解能力还有指令跟随能力，这一阶段只训练MLP+LLM。

后面还有1.2版本，我个人认为没有太大声音，所以1.2我直接跳过了，有兴趣可自行查阅官方blog，Link：[InternVL 1.2: Scaling up LLM to 34B](https://link.zhihu.com/?target=https%3A//internvl.github.io/blog/2024-02-21-InternVL-1.2/)

<strong>InternVL1.5</strong>

Link：[2404.16821](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2404.16821)

![](https://picx.zhimg.com/v2-f8fa491dd1dbb93df53828c4b04b159f_r.jpg)InternVL-1.5架构其实从1.1开始，整个InternVL的架构就没有发生特别多的变化，还是以vision encoder+MLP+LLM的架构为核心。1.5的版本在原本的vision encoder上做了一些结构上的精简，去除了某些他们认为不重要的层，虽然参数还是6B。encode后还是用pixel shuffle去减少token数量。在输入端，对于不同的分辨率的高分辨率图像采用了Dynamic High Resolution去输入各种448分辨率的tiles。具体过程图下：

![](https://pic1.zhimg.com/v2-6fbe1e53e2bad080cc7b8a84b66a75ce_r.jpg)Dynamic High Resolution对于一张分辨率较大的图片，先根据预先定义的长宽比（一共有35个）去match一个和输入图片分辨率最接近的长宽比，如果匹配到两个长宽比比如1：1和2：2，会优先处理不超过输入图像面积两倍的那个长宽比，从而避免过度放大低分辨率图像，然后把他们分成448分辨率的tiles。在分块之后还会用resize获得一个thumbnail也就是整个高分辨率图的缩略图以补充全局信息。

最后是训练阶段，和之前版本一样两个训练阶段：第一阶段训vision encoder+mlp，第二阶段全参SFT（v1.2就改成这样了）

<strong>InternVL-2.0</strong>

Link：[InternVL2](https://link.zhihu.com/?target=https%3A//internvl.github.io/blog/2024-07-02-InternVL-2.0/)

InternVL-2.0把模型的scaling range扩大了，从1B到108B的模型基本能完全覆盖大中小的体量。在1B到8B的模型中InternVL-2.0扔掉了那夸张的6B vision encoder，将它优化到了300M。算是对InternVL1.0的vision encoder scaling up的推倒重建。

其他结构上并没有什么新的东西出现，只是在输出端支持了医学图像和video。也还是沿用了pixel shuffle和Dynamic High Resolution。

![](https://pic2.zhimg.com/v2-f1ebf53324fb74b76a632f7f2daca603_r.jpg)InternVL-2.0训练阶段依旧两段式：第一阶段直接scaling数据之后在1.5版本上只训练MLP，第二阶段收集了各种高质量双语数据在一阶段基础上进行全参SFT。

<strong>InternVL-2.5</strong>

Link：[2412.05271](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2412.05271)

Trick1：结构小改动

以论文形式发布的2.5版本引入了一些trick（但其实这些trick在1.5版本就有，只是当时都是blog形式发的，整合到2.5的论文里的）。首先是vision encoder，虽然仍然是6B和300M的尺寸，但是里面有一些结构修改。6B的vision encoder将QK-norm的LN改成了RMSnorm（RMSnorm也是目前主流的norm方式了），RMSnorm比起LN少了减去均值的步骤，可以提高norm的计算效率，除此之外不减去均值能够保证QK之间的方向关系，和RoPE、Attention的计算更加适配，可以更好地适配语义上的匹配，举个例子：

假如有个向量q为 
![](https://www.zhihu.com/equation?tex=%5B100%2C101%2C102%5D) ，这个方向其实差不多接近 
![](https://www.zhihu.com/equation?tex=%5B1%2C1%2C1%5D) 的方向，如果减去均值，那就是 
![](https://www.zhihu.com/equation?tex=%5B-1%2C0%2C1%5D) ，那么这个方向其实和 
![](https://www.zhihu.com/equation?tex=%5B1%2C1%2C1%5D) 的差别就挺大的了，虽然这个例子比较极端但是确实存在这个问题。这样在计算attention中的 
![](https://www.zhihu.com/equation?tex=QK%5E%7BT%7D%3D%7CQ%7C%2A%7CK%7C%2Acos%28%5Ctheta%29) 的时候就会引起比较大的偏差。

当然，其实主要还是为了降低效率，LN也能训出来。而300M的Vision encoder仍然是用的LN。

Trick2：整合的训练策略

训练策略：single model training+Progressive Scaling Strategy

![](https://picx.zhimg.com/v2-3baadb9c244b91c9eb6f7e18213b4e0f_r.jpg)整个训练流程有这张图其实是因为作者发现即使先在一个小的LLM上训练出来的vision encoder也可以学习到强大的通用视觉能力，所以先用single model training去训好vision encoder。single model training一共分三个阶段：第一阶段只训MLP，叫做mlp warmup。第二阶段训vision encoder+mlp，第三阶段全参SFT。ok这三个阶段一过，初具VLM形态，之后如果LLM要scaling到更大LLM的话，这个vision encoder可以直接拿过去用，这就是Progressive Scaling Strategy，其实就是Progressive LLM。第一阶段也还是训MLP，第二阶段直接打开全参训。这样就能scaling到更大的LLM上。

Trick3：训练中的数据增强和loss设计

随机JPEG压缩：以75到100的质量（满分100）压缩图像，以适应含有噪声的图像，降低过拟合风险。

loss设计：先分析了现在的两种NTP loss（其实就是交叉熵）的范式，如下：

![](https://pica.zhimg.com/v2-80f5b72a9a2700e16bc4c76f14ded958_r.jpg)token averaging loss和sample averaging先说文中提到的token averaging的劣势，因为每个token都是平等的，所以模型会倾向于长回答。这是为什么，我们假设一个batch就只有两个sample，一个长回答A一个短回答B。如下所示：

A：
token数量100，每个token的loss为0.5
B：
token数量10，每个token的loss为1.5
我们来计算一下这个batch的总loss： 
![](https://www.zhihu.com/equation?tex=L+%3D+100%5Ctimes0.5%2B10%5Ctimes1.5%3D65) ，A的loss占了 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B50%7D%7B65%7D) 而B的loss只占了 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B15%7D%7B65%7D) ，A占了这个batch的大部分loss，所以在反向传播的时候，模型会倾向去降低A的loss，B的作用被缩小了，但是其实B每个token的loss比A大得多，我们希望B也能得到足够的重视，但因为A的loss占了绝大部分，所以B这种loss大但是短的回答优化就会出现问题。

好了那么sample averaging呢？我们还是用上面的AB回答来举例，sample averaging是先计算整个样本内的平均loss，那么A的loss就是0.5，B的loss就是1.5，这个时候B的loss占了75%，模型会倾向于优化B回答，但是其实我们也不希望A被过分忽视。这里就引出了InternVL-2.5改进的Loss Reweighting。

注意到上面的问题，loss reweighting的思路就是把上面公式的 
![](https://www.zhihu.com/equation?tex=w%5E%7Bi%7D) 赋值为 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B1%7D%7B%5Csqrt%7Bx%7D%7D) ，这个 
![](https://www.zhihu.com/equation?tex=x) 就是token数量，还是以上面的例子算一下reweighting的loss， 
![](https://www.zhihu.com/equation?tex=L%5E%7B%27%7D+%3D+%5Csqrt%7B100%7D%5Ctimes0.5%2B%5Csqrt%7B10%7D%5Ctimes1.5) ，算下来他们的占比都比较平均（至少比token averaging和sample averaging要均衡得多了）。

个人认为数据collection和filter就不需要讲了，follow一下最新版本的比较好。

<strong>InternVL-3</strong>

Link：[2504.10479](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2504.10479)。四月的新模型

InternVL-3的结构和2.5几乎一样，vision encoder仍然采用了300M和6B两个参数级。LLM则采用了Qwen2.5和 InternLM3-8B，其中只有9B的模型用的InternLM3-8B，其他都是Qwen。

此外采用了<strong>V2PE</strong>的位置编码，V2PE可以扩大vision token的外推能力，让mllm有更长的上下文。讲下这个V2PE，假如有一个sample为 
![](https://www.zhihu.com/equation?tex=X%3D%28x_%7B1%7D%2C...%2Cx_%7Bn%7D%29)，在vlm里面这个 
![](https://www.zhihu.com/equation?tex=X) 输入肯定是text or vision token的混合，正常来说PE编码就是如下：

![](https://pic3.zhimg.com/v2-5cbd891d0f7f0ae11daf67b3ed4a3478_r.jpg)PE计算索引正常的话，不管是text token还是vision token，只要位置往后都是正常的递增（也就是这个索引是没有区分text和vision的）。那么V2PE就把这个稍作区分，变成了：

![](https://pic3.zhimg.com/v2-ea74a0703c7bc732c916f7536b2aebf6_r.jpg)V2PE的index计算如果是text token就正常+1，如果是vision token就用一个更小的 
![](https://www.zhihu.com/equation?tex=%5Cdelta) 来加到index上，这个 
![](https://www.zhihu.com/equation?tex=%5Cdelta) 是从下面的值里面随便选的。

![](https://picx.zhimg.com/v2-bb16835bc228a99311cfc88cc8a4c3a3_r.jpg)vision token的smaller index<strong>训练流程的优化</strong>：InternVL-3直接采用交叉的多模态数据+纯文本数据（纯文本数据的加入是为了缓解多模态数据中短回答带来的问题）进行全参的微调，论文里说的是为了让模型直接适应多模态的各种任务，像之前使用的多阶段pretrain其实是将任务分离开始，一步一步从简单任务到复杂任务调整。而InternVL-3直接在2.5的基础上用多模态数据进行全参微调，直接力大砖飞了。

<strong>Post-Training</strong>：SFT+MPO，InternVL-3用上RL了。第一阶段是SFT，这里没什么好说的，直接上原文描述，就是上了更多样化+更精细的数据。

SFT 阶段与 InternVL2.5 相比，InternVL3 中 SFT 阶段的主要进步在于使用了更高质量和更多样化的训练数据。具体来说，我们进一步扩展了工具使用、三维场景理解、图形用户界面操作、长上下文任务以及其他任务的训练样本、
GUI 操作、长语境任务、视频理解、科学图表、创意写作和多模态推理。
MPO（Mixed Preference Optimization）：提出的前提是一个普遍比较认可的概念，distribution shift。意思就是在train的时候模型预测的第t个token是根据前面t-1个token得到的，而这t-1个token是ground truth获得的，所以不管你预测的第几个token，只要在train时期的先验都是ground truth里面来的，是正确的信息。而在推理的时候就不是这样的了，推理的时候第t个token虽然也是根据前面t-1个token来预测的，但是这个时候这t-1个token就全是预测的，其中可能有预测错误或者预测偏差，这样就会导致越长的回答的累积误差越来越大，特别是在CoT推理的时候，这种现象会被放大很多倍。

为了应对这种现象，MPO将三个loss按各自的weight组合到一起，如下：

![](https://pic1.zhimg.com/v2-337210d0b49e9b00edfc7d2ab6866e82_r.jpg)MPO loss其中 
![](https://www.zhihu.com/equation?tex=L_%7Bp%7D) 为偏好损失， 
![](https://www.zhihu.com/equation?tex=L_%7Bq%7D) 为质量损失， 
![](https://www.zhihu.com/equation?tex=L_%7Bg%7D) 为生成损失。

偏好损失用的就是DPO的损失，如下：

![](https://pic4.zhimg.com/v2-72bf1639dae844657a373e72780063c3_r.jpg)DPO lossDPO这里就不细讲了，总的来说这个loss的意义就是让模型去学会判断哪个回答更好，往好回答去靠。

质量损失采用的是BCO loss，如下：

![](https://pic4.zhimg.com/v2-f9c459aa4101fec152a43d50021621cf_1440w.jpg)BCO loss
![](https://pic4.zhimg.com/v2-fa3a3aa9e944cb7cd86c7b5f22f3dc77_r.jpg)BCO loss各项其中这个 
![](https://www.zhihu.com/equation?tex=%5Cdelta) 叫做reward shift，以之前奖励的移动平均值计算，用来稳定训练，loss和DPO loss很像但又不同，BCO loss计算的是这个回答本身好不好，是一个绝对值。简而言之，BCO loss体现了一个回答好不好，而DPO loss是为了让模型选哪个更好，一个是填空题，一个是选择题。 为什么要这样设计？很简单的道理，假设有两个回答A和B，A的回答是烂，B的回答是很烂，我用DPO loss只会让我的模型倾向于选择A和B中没那么烂的B，而没办法判断这个回答本身是不是烂，加入BCO loss就相当于告诉模型：虽然A比B要好，但是A也很烂！。这种相对+绝对的判断方式会缓解模型摆烂负优化的问题（这个问题在GRPO中也出现）。

至于剩下的生成loss，就是单纯的NTP loss了，最基础的loss，没什么好说的。MPO的整体目标大概就是这样。所以MPO究极目的就是：假如前面的token预测得不好，通过DPO和BCO loss的打分和偏好，可以在预测中减少累计误差。

<strong>Test-Time Scaling：</strong>推理的时候采用VisualPRM去对多个推理结果打分，最终输出一个好的结果。这个VisualPRM是专门针对回答去训练的，用的VisualPRM400K的数据以及上面训练流程训好的InternVL-3的回答去训这个模型。然后推理的时候实际上会生成N个回答，通过这个模型去确定到底该输出哪个回答。

<strong>InternVL-3.5</strong>

Link：[InternVL3.5: Advancing Open-Source Multimodal Models in Versatility, Reasoning, and Efficiency](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2508.18265)

在写这篇文章的同一天，InternVL-3.5发布了，先来浅读一下。看下榜单，GLM-4.5V刚出来没多久又被踩了一脚。不得不说现在基模的榜刷的真的很快。

![](https://pic3.zhimg.com/v2-916fcc8fe2a4c7672d1e67641c9a7d80_r.jpg)VLM刷分榜（截至20250826）InternVL-3.5变成了MoE模型（其实是因为Qwen3是MoE），有以下模型：

![](https://pic3.zhimg.com/v2-054fff86b8c8b91f993984ff535ba3e6_r.jpg)InternVL-3.5的各种大小看来就是把LM换成了Qwen3，然后之前的MLP有一定调整，上图。

![](https://pica.zhimg.com/v2-3b67ec859635df49a3b5d6dc47bbd934_r.jpg)InternVL-3.5模型结构除了之前版本的老几样，把MLP的名字换成了Vision-Language Connect，其实就是分成了两个版本，第一个版本和以前一样是MLP，这个整体就是InternVL-3.5，第二个版本是采用了一个Visual Resolution Router，叫做InternVL-3.5-Flash。这个router的作用就是对每一个Patch出来的token（本来是1024个，经过pixel shuffle变成256个）进行一次语义丰富度的判断，确定一个最佳压缩率，语义丰富的压缩率低，不丰富的使劲压缩，然后用这个压缩率再对这个patch进行一次pixel shuffle，声称是又减少了50%的token，并且保持了几乎100%的性能。

<strong>Pretrain</strong>：扩展了数据量，照样NTP loss训。

<strong>Post-Training</strong>：分了三个阶段，如下

![](https://pic4.zhimg.com/v2-a57b35970c50d2a6918b701d8470dfa7_r.jpg)InternVL-3.5的三阶段post-trainingSFT就是更多样化更好的数据去训，没啥好说的。RL部分变成了Cascade的RL，主要用了MPO和GSPO去做。MPO是offline的RL，就是我们在3.0讲的内容，没有变化，可以跳回去看，offline RL可以快速收敛，先获得一个初始性能。接下来是online RL的GSPO，GSPO是Qwen在7月提出来的RL算法，这里不讲特别多细节，只讲个大概，主攻post-training的同学可以查看：[Group Sequence Policy Optimization](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2507.18071)。

![](https://pic1.zhimg.com/v2-8ad28b953c86fdbb6ee08ed3520661da_r.jpg)GSPOGSPO的核心就是对序列长度进行了考虑，因为PPO和GRPO都是对序列长度比较敏感的，序列长度不同，方差就大，导致了训练不稳定。而GSPO改用对数空间平均进行重要性采样，对每个 token 的log ratio取平均，再指数还原，相当于对seq做了归一化，减少了序列长度来的差异，对每个长度的序列都能够接近平等得对待。然后InternVL-3.5发现在MPO之后，GSPO的收敛会比较快速也比较稳定，这点也比较好解释，因为MPO的偏好数据是收集好的，并且有BCO loss的存在，它会判断回答好坏的绝对值，这样可以很好抑制reward hacking。

ps：reward hacking就是模型倾向于输出一个过程不一定对但结果较正确的结果去骗过reward模型以获得高reward，实际上这个回答的分数是虚高的。

然后在MPO的基础上训GSPO，会保证模型会有一定的高质量回答，避免回答集体摆烂的情况。个人认为MPO是核心，GSPO在这里面算是一个点缀（毕竟要跟热点）。

<strong>Visual Consistency Learning：</strong>这一阶段是为了训Flash版本的InternVL-3.5。它们额外引入了一个reference model来训，整体训练目标如下：

![](https://pica.zhimg.com/v2-ee93df4e61c303079a0495e56b2ba424_r.jpg)Visual Consistency Learning loss其中reference model是冻结的，并且压缩率一直保持1/4。而policy model是更新的，压缩率是随机从1/16和1/4中选一个，这就意味着reference model一直都是用256个vision token，而policy model可能会出现64个token。那么这个训练目标就很好理解了，我要让policy model和reference model的差距缩小，让64 token和256 token的对比越来越接近，从而让64 token的Flash版本性能接近256 token，整个过程就是一个蒸馏。

<strong>Router training：</strong>这部分是去训router，这个router是一个二分类器，输出结果决定这个patch以高或者低分辨率压缩。

![](https://pic4.zhimg.com/v2-289c4581408f48c98ab3251607d25db5_r.jpg)Router training先计算一个比率 
![](https://www.zhihu.com/equation?tex=r_%7Bi%7D) ，这个算出来的值域是0-1，代表着压缩token的代价，越高则代表代价越大，这个patch就越不该被压缩。然后有一个动态阈值 
![](https://www.zhihu.com/equation?tex=%5Ctau) ，这个基于历史 
![](https://www.zhihu.com/equation?tex=r_%7Bi%7D) 值的滑动窗口，取第k百分位数来动态获得的。如果大于这个阈值那就给这个patch的router标签赋为1，代表不该被压缩，反之为0，代表该被压缩。然后训这个router就是把其他所有的参数都冻结，只训练这个部分，通过二分类的交叉熵loss去训就ok。由于这是个二分类器，基本不占参数和计算量，所以靠这个决定压缩可以明显提升推理速度。

<strong>Test-Time Scaling：</strong>在之前的基础上强制开启了Deep Thinking模式，强制生成CoT回答，必须一步一步获得。Deep Thinking的同时去获得Best-of-N的回答，然后用VisualPRM-v1.1去判断最优回答。这部分和3.0的区别也不太大。

其余内容是关于推理和训练优化，这部分我不太懂，所以就不解读以免造成误解了。

最后看下3.5的效果吧。

![](https://pic1.zhimg.com/v2-fe3290df9ed6c13e84226364a7bf1692_r.jpg)随便扯了一张指标相比3.0的模型都略有提升，但其实在使用上个人感觉应该相差不大了（还没测）。顺带一提，老师咱们家Qwen3-VL多久更新啊，一直被鞭尸。。。

Qwen-VL系列（阿里-通义）
看完了InternVL系列，该讲讲Qwen-VL了，毕竟InternVL从老早开始就开始用Qwen当LM了，但是Qwen-VL更新速度反而还没InternVL快，很疑惑到底是在憋大的还是一直没训出好东西来。还是比较期待Qwen-VL3的。

<strong>初代Qwen-VL</strong>

Link：[arxiv.org/pdf/2308.12966](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2308.12966)

![](https://picx.zhimg.com/v2-948c851c111a6227ccd79a0400cc3395_r.jpg)

初代的Qwen-VL是采用了CrossAttention去做视觉-文本语义空间的对齐，Vision encoder采用OpenCLIP训练的ViT-bigG，LM用的Qwen-7B用一组Learnable query去强化和对齐。训练阶段分三部分，pretraining只训练vision encoder和crossattention，进行初步对齐和视觉感知能力的扩展，为了快速收敛就先用低分辨率图像。multi-task pretraining直接全参训，这个时候送入的image变成了高分辨率的图像，finetune一下。最后的SFT就冻结vision encoder，训LM和crossattention。

初代的Qwen-VL没有特别多内容可说，主要是作为初步尝试。后续更新了Qwen-VL-Max和Plus版本，应该还是对数据做了scaling。

<strong>Qwen2-VL</strong>

Link：[2409.12191](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2409.12191)

和其他厂的更新速度不同，Qwen2-VL是初代后一年才推出的，这次直接对标的是GPT-4o。并且从结构上也抛弃了Crossattention+Learnable query的类Q-former思路。结构如下：

![](https://pic4.zhimg.com/v2-38e6d9062d25307fd6c6cd94c53c0d5f_r.jpg)Qwen2-VL结构LM采用了Qwen2，Vision encoder采用了600M左右的ViT，这个ViT是支持image和video的输入的。此外和初代不同，Qwen2-VL支持任意分辨率，就是因为提出的Native Resolution input。这个的作用就是保持图像原本的分辨率，然后还是按照14的大小去分patch进而压成token，为了适应token数量的变化，ViT的PE被改成了2D-RoPE，能够适应token数量变化带来的外推问题并且对patch相对位置关系更加敏感。当然，为了限制token数量过大，Qwen2-VL会对图文交织数据的vision token进行打包和截断，限制最大token数量，并且后接了一个MLP将相邻的2×2个token压缩成1个，进一步减少显存占用。

<strong>M-RoPE：</strong>为了适应多模态输入，Qwen2-VL还引入了M-RoPE对所有模态的token都采用这一套RoPE策略，这里不要和上面说的2D-RoPE搞混了，M-RoPE是送入LM的时候用的，而2D-RoPE只是vision encoder采用。直接用他的原图进行讲解：

![](https://pic4.zhimg.com/v2-b0078d904f14c8b2700fb781ca7a0fbf_r.jpg)M-RoPE示意图很简单，M-RoPE把所有模态的数据都看作有3个维度，T H W，对于单张图片来说T的index是不动的，H W随着位置变化会变二维index；对于视频的话，每一帧的T的index是往后递增的；对于文本来说，默认T H W都是相等的，就如同图中的This 和Video，This的index是 
![](https://www.zhihu.com/equation?tex=%284%2C4%2C4%29) ，既然T H W都一样的话，那下一个单词Video就是所有维度往后加1，变成 
![](https://www.zhihu.com/equation?tex=%285%2C5%2C5%29) 。通过把所有模态都统一到一种维度上赋index后，在PE上就可以统一编码了。

<strong>统一了image和video的理解：</strong>简而言之，Qwen2-VL是将image和video都当作video去处理。先说video，为了尽可能保持连续性，所有的视频都是每一秒采样2帧，30s的视频就会有60帧的信息，所以就排除了fps的影响。当然时长长的视频采样出来的帧就会变多，为了平等对待大部分的视频，Qwen2-VL对时长比较长的视频的分辨率进行了下采样，短视频就保持原本分辨率，每个视频token数量都严格限制在16384之内。并且Video是带有时间信息的，所以ViT其实是用的3D-Conv，在时间上也做了卷积，能够更多地保持时空关系。

好了现在来说图像，因为都当作video处理，其实Qwen2-VL就直接把图像repeat了一次，把它当作1s的视频去做的。这样处理也能适应3D-conv了，可以用image和video对ViT进行统一训练。

<strong>训练阶段：</strong>和Qwen-VL一模一样。

<strong>数据格式：</strong>ChatML的指令跟随数据集（Openai同款）

![](https://pica.zhimg.com/v2-19a99e529274da162468d6255e74df6e_r.jpg)ChatML格式数据集用<|im_start|>和<|im_end|>来标记语句段的结束，用<|vision_start|>和<|vision_end|>来为image输入占位。

对于Grounding任务，所有的坐标在尽量保证原生分辨率的前提下被放到0-1000之内。

<strong>Qwen2.5-VL</strong>

Link：[[2502.13923] Qwen2.5-VL Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.13923)

Qwen2.5-VL实际上也没有特别多的改进，结构如下：

![](https://pica.zhimg.com/v2-ac9540d5093a4beddf160d017411dffe_r.jpg)Qwen2.5-VL结构LM部分更新到Qwen2.5，然后Vision Encoder依旧保持2里面的原生分辨率（其实也不原生，会放缩到14和28的倍数以方便送到ViT里面去），2D-RoPE依旧使用，里面的大部分Block被改成了Window Attention（ViT办成了大半个Swin）。然后MLP还是用来压缩token的，对应原图位置的2×2位置的token被压缩成一个token，但其实channel数量也是增加了的（为了防止信息丢失太多），如下图

![](https://pica.zhimg.com/v2-f45e6cdb7bd9a1900b0f086c20052090_r.jpg)MLP的通道变化<strong>动态FPS+绝对时间编码叠加M-RoPE：</strong>在2的讲解中我们提到2是每秒采2帧去处理视频，但是总不可能所有的视频都是这样做，如果本身的fps较大，那么丢失的信息就特别多。2.5在此基础上提出了动态FPS联合时间维度的绝对PE去优化这个问题。2.5抛弃了用帧去确定index的方式，而是用绝对时间的文本时间戳去确定index，也就是第一秒的index是1，第二秒的index是2这种概念。那么这个时候FPS的选取就可以变成动态的了，因为人的直觉就是一个动作从第几秒开始做，所以这样做的好处是，不管fps是多少，模型都能知道第几秒是什么内容，只需要把帧和绝对时间对齐即可。

<strong>Qwen3-VL</strong>

经过大半年的沉淀，Qwen3-vl在今年的云栖大会上进行了开源，目前是有235B-A22B的instruct版本和thinking版本，在2.5-VL的基础上进行了一些结构上的调整，如下：

![](https://pic4.zhimg.com/v2-caf2f3021f28dd435487a4053025e797_r.jpg)Qwen3-VL结构第一个改进点是改进了M-RoPE的实现，改成了<strong>MRoPE-Interleave</strong>，这个方案与今年的一篇video-generation的论文非常相似（Lumos-1），link：[https://arxiv.org/abs/2507.08801](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2507.08801)。有兴趣可以详细看看。

原本的M-RoPE在twh三个维度上按顺序来划分，举个例子，假如有128维，t分64维，w32维，h32维，RoPE是按照维度index来给基频的，在前面的维度旋转基频越高代表周期越短，这一部分也就是高频部分，在这里t信息只用高频分量来编码就会导致高频分量周期短，容易出现周期性重复，导致远距离的时间位置编码变得相似，进一步恶化了长时间间隔之间帧的识别。

为了解决这个问题，MRoPE-Interleave让thw交错分布而不是连续且按顺序分布，也就是在维度上按thw thw thw这样分布，这样做的好处就是每个交错块都能同时利用高频和低频的旋转分量，thw三个维度都可以吃到高低频的旋转分量。MRoPE-Interleave的设计主要是为了针对长视频理解。

MRoPE-Interleave的代码，这里原始代码跳得比较多，我以偏伪代码的方式来示例一下：

第一步：读配置
self.mrope_section = config.rope_scaling.get(&#34;mrope_section&#34;, [24, 20, 20])
mrope_section 定义了THW各自占用的维度数量（单位是组，每组3维），默认是[24, 20, 20]表示：T占24×3=72维，H占60维，W占60维，总共192维。

第二步：原始频率生成
freqs = (inv_freq_expanded.float() @ position_ids_expanded.float()).transpose(2, 3)
# freqs shape: (3, batch, seq_len, head_dim // 2)
# freqs[0]->T, freqs[1]->H, freqs[2]->W

第三步：Interleave
reqs = self.apply_interleaved_mrope(freqs, self.mrope_section)
def apply_interleaved_mrope(self, freqs, mrope_section):
    freqs_t = freqs[0]  # 以T为主干
    for dim, offset in enumerate((1, 2), start=1):  # H=1, W=2
        length = mrope_section[dim] * 3
        idx = slice(offset, length, 3)
        freqs_t[..., idx] = freqs[dim, ..., idx]
    return freqs_t

最后形成：[T0, H0, W0, T1, H1, W1, T2, H2, W2, ...,]这样的格式
第二个改进点是加入了deepstack，deepstack先把vision encoder中的低中高层的vision token都取出来然后分层注入到llm的各层中，这个操作很熟悉啊，感觉跟以前cnn大火的时候各种多尺度融合的操作非常相似，所以vlm其实也是老路新走而已。然后从low-level vision token到high-level vision token都会有一个proj去对齐到llm里面。

核心代码如下：

在vision encoder中：
deepstack_feature_lists = []
for layer_num, blk in enumerate(self.blocks):
    hidden_states = blk(...)
    if layer_num in self.deepstack_visual_indexes:
        deepstack_feature = self.deepstack_merger_list[...](hidden_states)#要用merger也就是mlp去处理不同层的vision token
        deepstack_feature_lists.append(deepstack_feature)

在llm侧：
for layer_idx, decoder_layer in enumerate(self.layers):
    hidden_states = decoder_layer(...)
    if deepstack_visual_embeds is not None and layer_idx in range(len(deepstack_visual_embeds)):
        hidden_states = self._deepstack_process(
            hidden_states, visual_pos_masks, deepstack_visual_embeds[layer_idx]
        )
def _deepstack_process(self, hidden_states, visual_pos_masks, visual_embeds):
    hidden_states[visual_pos_masks, :] += visual_embeds
    return hidden_states

#其中visual_pos_masks视觉占位符<image>，在LLM的第layer_idx层，将对应层的视觉特征加到vision token 的hidden states上。
第三个改进点是把T-RoPE改成了文本时间戳-视频帧的交错输入，直接用文本去显式编码时间戳，格式类似：[0.0s] [frame_0] [0.1s] [frame_1] [0.2s] [frame_2]，这样还有一个好处就是llm本身就能很自然地支持时间信息，让LLM 在生成答案时，能像读普通词一样读取时间戳，从而在输出中精准地引用。

Qwen3-VL在大部分的视觉任务上都取得了很高的成绩，并且纯文本能力也基本对标Qwen3-235B-A22B-2507。更多的训练细节会在技术报告公开后继续解读。

Seed1.5-VL系列（字节-Seed）
<strong>20250827更新</strong>

宏大的技术报告，77页，Link：[Seed1.5-VL Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2505.07062)。

先来看看结构。

![](https://pic1.zhimg.com/v2-51dafd4dead0de1727626c69be1464d6_r.jpg)Seed1.5-VL结构结构上还是主流的vision encoder+MLP+LLM。其中Seed-ViT和Qwen2-VL一样在vision encoder采用了2D-RoPE，在vision encoder输出后用2×2的pooling对相邻的patch进行下采样，然后通过两层的MLP adapter进行语义空间对齐。

Seed-ViT：先把Qwen2-VL和InternVL-2.5喷了一遍，说他们用的ViT是在预训练权重的基础上去fix分辨率，这样会丢失细粒度特征的感知能力，这里感觉就是试出来的而已。Seed-ViT是直接重新训的一个ViT，毕竟每个厂在训练细节中都会有很大的不同，也算是一个厂的逻辑吧，至于喷其他模型做得不好的地方，见仁见智吧，毕竟这种模型用户的体验反馈是最真实的。

Seed-ViT的训练分为3个阶段，

![](https://pic2.zhimg.com/v2-48951a84b35475f5ec9519f3a2701d35_r.jpg)Seed-ViT的训练流程<strong>第一阶段Masked Image Modeling（MIM）</strong>：用2D-RoPE的ViT训练，整个过程类似自监督MAE+蒸馏的方式。把Seed-ViT当作student，EVA02-CLIP-E当作teacher。student的image patch随机屏蔽75%，然后将student屏蔽位置的特征和teacher对应位置的特征输出做一个余弦相似度loss，整个任务当成重建任务进行。

<strong>第二阶段Native-Resolution Contrastive Learning</strong>：采用EVA02-CLIP-E的文本编码器，整个过程当作CLIP训。loss是SigLip loss+Superclass loss。为什么联合使用也很简单，我这里就不细讲SigLip loss了，就把他当作对比损失的优化版（更稳定，bs能开更高）就行，那么Superclass loss解决的问题是：谁像谁。顾名思义，SigLip的对比损失只让模型知道cat是cat，dog是dog，但是不能让模型知道cat和dog都是animal。superclass loss的引入就是为了构建多层次的语义标签，让模型知道cat不仅是cat，还是animal，还可以是其他类别的一个子类。具体实现可以参考原论文，也是字节提出来的：[2411.03313](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2411.03313)。后续会再详细解释一下superclass loss。

<strong>第三阶段Omni-modal Pre-training：</strong>这部分是全模态训练，加了audio。整个过程是MiCo的训练框架，ViT 对video和audio编码，而单独的text encoder则处理caption，最后进行对齐。

整个训练阶段最重要的其实是第二阶段，第二阶段用了91.2%的token去训练，为了让这个ViT获得更强的base能力。

接下来是视频encode，对于video数据采用了<strong>Dynamic Frame-Resolution Sampling</strong>。其实这点很像Qwen2.5-VL的处理方式。对于不同的任务比如视频理解，fps就等于1去采样视频；对于动作识别这种需要一些动态信息的就让fps=2；高动态的任务就用fps=5。采样出帧后，会对所有的帧前面加一个文本时间戳，如下

![](https://pic1.zhimg.com/v2-2cf9c1ebf42d96589cbcc2bd0556a998_r.jpg)帧前加文本时间戳上面的例子是fps=1的时候，fps=2的时候每帧的时间戳间隔就变成0.5 second，以此类推，fps=5间隔就是0.2 second，这样做也是为了让模型理解绝对时间的概念，比如动作识别，让他知道第几秒做了什么动作，如果只用帧index是完全不可能实现这个任务的。

接下来是预训练阶段：

![](https://pic2.zhimg.com/v2-b6f07bbce56935bc90782658409ba15d_r.jpg)pre-training三个stage，第一个stage只训MLP，第二个stage开全参+高质量多模态语料库数据（包括Grounding、OCR等数据）训，第三个stage也是全参，但是sequence length增加，增强上下文记忆和长距离依赖能力，数据进行了进一步的清洗和平衡，加入了video understanding、3d understanding等数据。

Post-Training阶段：Seed1.5-VL在post-training上做了比较多的尝试

![](https://pic3.zhimg.com/v2-84594abcd08358cc32bd9053d892f2a0_r.jpg)post-training pipeline<strong>SFT阶段：</strong>收集数据就为了两个目的，第一是指令跟随，用指令跟随数据去训以生成简要、准确的回答，用的数据并不是很多，但是经过了大量的清洗并保证了每个任务的数据分布尽量均衡。第二是LongCoT（Thinking）数据收集，通过prompt engineering和rejection sampling来收集这类数据。这个数据处理pipeline我个人觉得应该讲一下。指令跟随数据集怎么来的？

- <strong>第一步</strong>，爬+筛+人工标-->13000条高质量，覆盖各种任务的指令跟随数据集，然后用这个13000条微调第一版模型，让他具备完成各任务的能力。
- <strong>第二步</strong>，从开源的150w里筛3w，怎么筛？先用image-text embedding model对所有数据进行任务语义上的聚类，把他们聚类到不同任务上，区分任务类别，然后针对数据的长尾分布进行降采样，保证质量，数量不用太在乎。然后用第一步调出来的模型对这个降采样之后的子集进行多轮的回答生成（叫roll-outs，后面都用这个词方便表达），生成的回答一方面用LLM-as-a-Judge进行评估，评估内容大概就是  <strong>这个回答是否正确？为什么 ，</strong>然后输出带解释的评分，提升筛选可信度，同时用一个reward model去判断最符合人类偏好的回答。最后选出了3w对数据。实际整个过程就是rejection sampling的自动化版。我们在第二步提到了用一个reward model去判断最符合人类偏好的回答，这个reward model也是一个vlm，他页用初步STF之后的model去初始化。正常大部分使用的reward model是给回答输出一个标量打分，这种方式很显然是缺乏上下文的理解的，所以Seed1.5-VL使用的reward model是直接让模型输出一个特殊的token来表示偏好选择，类似我问他A和B哪个回答好，他回答“Answer A is better.”这种偏好决策更加自然，也更符合llm的自回归方式。这个reward model的数据收集方式也比较多样：

人工标注：

- 生成人工标注需要的偏好回答对：通过内部模型生成多个回答，用top-p采样多个回答，这些回答会经过二次筛选以确保内容差距比较大、语义重复性较低并且长度差不多
- 怎么标注？对所有回答打分排序（1-5分），并且指出哪个回答只需少量修改就能变好 ，并且提供这个回答在哪方面不足的原因，比如幻觉、格式错误、信息不足、回答不完整等原因，提高标注信息丰富度，因为reward model是vlm嘛，所以理论上越详细越好
- 排序可以通过其他模型加速，给人工提供参考排序后直接上手标注合成数据：

- 选择具有明确 ground-truth的任务，比如数学题、OCR 识别等，要求输出按照指定的格式比如Final Answer: [答案]；对每个prompt，让模型生成K个回答然后用其他vlm去判断各个回答的好坏；这个好坏用了一个简单的list-wise偏好判别：（1）正确格式+答案正确（优秀）（2）正确格式+答案错误（中等）（3）错误格式+答案错误（差）；对于caption类任务，就用人类和模型打的caption作为正负对以减少幻觉；最后通过Preference Strength去refine，让模型不止知道好和坏，还要知道好了多少，坏了多少
- 这里Seed1.5-VL提出了一个观点，为什么不修改正确回答或者drop掉一些属性去做负样本，给的理由是这样模型不是在学“什么是好回答“，而是在学“哪个是人工改过的”。其实也很好理解，你单纯从一个回答去删一些东西，其他部分其实没怎么改动，多样性非常匮乏，而模型很容易过拟合这种模式，导致它只学会了很浅显的内容表示，而不是本质上有语义区别的问答对。<strong>RLHF阶段：</strong>Seed1.5-VL是用PPO训的（嗯。。财大气粗），RLHF这部分训练所用的prompt来自之前构建的偏好数据集，为了保证这个部分的任务也能比较全面并且均衡的覆盖，他们先训了一个tagging model首对prompt进行能力分类，并且加了分层采样平衡各类任务分布，之后生成多个候选回答并基于奖励模型的评分方差过滤掉区分度低的prompt，保留能有效激发奖励差异的高质量提示；在训练初期对reward和KL散度快速上升的简单prompt进行降采样，防止模型过拟合于简单任务。

<strong>Reinforcement Learning with Verifiable Rewards（RLVR）阶段：</strong>这个环节是对于需要精确答案的领域进行确定性的reward给定，暂时忽略掉。待我仔细阅读后更新。

<strong>Hybird RL：</strong>Seed1.5-VL采用基于PPO衍生了一个混合强化学习框架，融合 RLHF 与 RLVR 两种范式。大致分为几个部分：（1）格式reward：训练中采用预定义格式 `<think>{thought}</think>{solution}` 并对不符合格式响应给予0奖励或惩罚；（2）混合reward：在训练的每个epoch都对通用和需要verify的prompt进行shuffle，对思考进行截断，都只关注结果，忽略思考过程带来的reward，这样关注结果不关注过程的方式可以让思考过程更多样化（有可能过程错，结果对，不过这部分在前面数据过滤部分进行了严格的筛选，概率比较低）；（3）共享critic：reward model和verifier都共用一个critic，因为两边的reward实际上都是在[0,1]的区间，所以可以共用一个critic来计算value。（4）PPO的KL惩罚系数：通用prompt的问题采用小KL系数（具体参数报告有）以减少reward hacking，而需要verify的问题不加惩罚提供更多可能性。（5）不同prompt的roll-outs不同：难度更高的问题采样次数更多，简单问题更少。

说了这么多，其实这个流程就是<strong>“RL → 收集优质回答 → 更新SFT模型 → 再RL”</strong>的过程。先用冷启动（少量的LongCoT数据+in-context prompting生成的少部分可用LongCoT数据）微调一下SFT模型。然后就送到PPO里面训一版有LongCoT能力的模型，针对这个模型，在一些很难的，模型回答很边界的问题上进行挑选，用现在最强的RL模型去获得这些问题正确的回答，并且CoT也要正确。把这些数据筛选（去除重复思考）后加入新一轮训练去训第二版RL模型，以此类推。这整个过程就是<strong>self-improvement</strong>的范式<strong>。</strong>

Infra就不讲了，不是特别懂这部分。

不得不说Seed1.5-VL在训练上有非常多的trick，并且在数据清洗和标注上都花了很大的功夫。这些工程上的细节很值得我们学习。截至现在Seed1.5-VL貌似也还是VLM榜单第一。

GLM及CogVLM系列（智谱）
<strong>20250828更新</strong>

<strong>CogVLM</strong>

Link：[[2311.03079] CogVLM: Visual Expert for Pretrained Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2311.03079)

CogVLM第一代是23年的工作，整个模型结构也是LLaVa类似的ViT-MLP-LLM的范式，如下：

![](https://pic4.zhimg.com/v2-0343ccb33f711c704db6c4e09b5b7939_r.jpg)CogVLM结构大致结构和前面系列的模型差不太多，需要讲的是CogVLM认为在纯文本数据上训好的LLM如果在训VLM的时候打开全参去训会导致灾难性遗忘，作者做了一个实验来验证这一点，如下：

![](https://pic3.zhimg.com/v2-2b399f2c8f55ef55971085760075fc00_r.jpg)灾难性遗忘的验证实验用LAION去训VLM的时候，虽然training loss在降低，但是对于纯文本的MMLU上的score也下降很快，用这个来解释会发生灾难性遗忘，其实我认为这是一个比较以偏概全的实验，首先LAION的数据也并不是特别干净，此外LLM的pretraining数据本身从分布和数量上都会有比较大的shift，应该至少把VLM训练时的数据量Scaling到和LLM pretraining数据差距不大的量级，并且配上图文交织数据会更有说服力，既然Qwen2-VL、InternVL-2.5能够以这种方式训出来，那至少能说明把数据scaling上去是能解决或者极大缓解这个问题的。

不过这个实验也给了我们在工程上的思路，如果数据量较少的情况下做冻结参数的finetune类似lora、p-tuning这种方式会比较好，不然可能会超级过拟合。

言归正传，CogVLM为了缓解灾难性遗忘，在原本LLM的基础block上分支出来一个block专门做视觉感知，也就是结构图的（b），再放一下：

![](https://pic4.zhimg.com/v2-350408b1c54cd12f0a99d6365e9bb4c7_r.jpg)额外的vision block，只处理image token就直接外接一个q、k、v的Linear和FFN，Attention是不变的，其实就是把image token做了二次语义对齐。这里linear和FFN的初始化方式就是直接从LLM的原始权重初始化，这进一步说明了原本模型就是有处理vision token的能力的。Attn的casual mask也照样用在vision token上（作者也做了实验，说明保持LLM原生的结构效果会更好）。不得不说智谱的模型还都喜欢用这种类似于MMDiT的架构去做。。。

<strong>训练阶段：</strong>

- 预训练：预训练有两个stage，第一个stage是用1.5B的图文对去训练获得模型的caption能力，NTP loss为主。第二个stage是用很简单的grounding数据（问题+直接回答坐标）去训练，并且也是用NTP loss。整个预训练比较粗糙，不过早期模型基本都这样。模型在这个阶段获得图文检索和简单grounding的能力。
- 对齐：其实就是指令跟随数据的Finetune，CogVLM训练了两个专有的模型一个是CogVLM-Chat专注对话VQA任务，一个是CogVLM-Grounding专注grounding任务。CogVLM-Chat用上了当时大部分的多轮对话数据集包括LLaVa-Instruct，并且修正了里面的一些错误。CogVLM-Grounding加入了四种类型的grounding数据集：（1）caption内每个名词都有对应bbox的（2）bbox内内容都用对应text的（3）text内容都和bbox对应的（4）VQA问答形式的grounding数据，还有少部分是CoT的。从附录披露的训练细节来看，pretraining和finetune基本都是按照23年那种正常流程训得，主要还是数据的作用。

<strong>CogVLM2及GLM-4V</strong>

Link：[arxiv.org/pdf/2408.16500](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2408.16500)

CogVLM2和GLM-4V是一起发布的，并且放在同一个报告里，区别就是GLM-4V能够支持双语理解（中英）。CogVLM family基本是共享一个结构，如下：

![](https://pic3.zhimg.com/v2-872829a089d9f7f72c2ce48ea63c884c_r.jpg)CogVLM FamilyViT-MLP-LLM的范式，已经说烂了。相比第一代来说，CogVLM2的也加上了对patch的2×2+SwiGLU的卷积层去减少token数量；此外LLM换成了LLaMa3-8b。结构上就没变化了。

<strong>训练阶段：</strong>

- pretraining阶段：好了，把自己在第一代用的LAION喷了一遍说人家质量太低，所以开发了Iterative Refinement的pipeline去过滤数据（先用public dataset训一个，然后用这个模型打标，再人工修正）；其他数据就是合成数据，高质量合成，用GLIPv2去搞grounding数据，反正就是疯狂自动打标再疯狂洗，把数据量和质量都scaling上去。pretraining阶段用了三种方式去训练：（1）渐进式解冻：先训练Crossattention之类的外部组件（CogAgent），后面再解冻vision encoder和visual expert。就是保证先对齐，再细化vision token的表达，这在其他厂的VL里也很常见。（2）一开始就解冻全部参数，这个的前提是数据必须是混合的，这个和（1）是不冲突的，但这种训练是特别吃数据质量的，基本上每个batch都有纯text数据和img-text的成对数据，不然很容易出现灾难性遗忘（3）分辨率递增，这个也是大家都惯用的思路，先在低分辨率图像上训，再提高token数量在高分辨率图像上训
- Post-Training阶段：scaling了大量的VQA数据，并且发现简短回答是会影响模型性能的（可能不是因为短回答本身，而是因为短回答太多，因为之前我微调很多VLM都发现如果数据在很多维度上都属于长尾分布的话，训出来的模型很容易被拉偏为那种模式的回答），所以在简短回答的前面都加了 <strong>&#34;Short Answer&#34;</strong>这个前缀表达；此外还自己标注了300K的图文数据，还有50K的偏好数据。post-training有两个阶段，第一阶段用全量VQA数据+300K自标注数据去SFT，第二阶段用高质量VQA子集+50K偏好数据去模拟人类偏好去SFT。SFT的训练中都是全参训得，其中vision encoder的lr是其他部分lr的十分之一。<strong>额外版本：</strong>

CogVLM2还额外训了CogVLM2-Video版本，支持video understanding，实在224分辨率的base CogVLM2上训的，每个视频采了24帧去做理解，数据分为videoQA数据+videoGrounding数据（Grounding数据是通过采帧Grounding+GPT-4o过滤场景变化小的数据获得的），先训QA，lr为4e-6，后训Grounding，lr为1e-6。这个lr很保险，也是智谱一贯风格。

至于GLM-4V就不讲了，除了加了中文语料其他和CogVLM2是一样的。

<strong>GLM-4.1V-Thinking及GLM-4.5V</strong>

Link：[[2507.01006] GLM-4.5V and GLM-4.1V-Thinking: Towards Versatile Multimodal Reasoning with Scalable Reinforcement Learning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2507.01006)

终于扣题了，首尾呼应，其实开始写第一行的时候InternVL-3.5还没发，还在跟GLM-4.5V的report，结果八月26就被kuku刷下去了。不过还是来看看这个7月的相对热乎的VLM在干什么。

![](https://pic2.zhimg.com/v2-00c5ca66a853339418f1dba2b7c5b93f_r.jpg)GLM-4.1V-Thinking及GLM-4.5V的结构还是那个牢范式，好用也是真好用。此外，vision encoder和Qwen2-VL一样加入了2D-RoPE，并且把2d-conv换成了3d-conv去处理视频，用这个3d-conv实现temporal上的2倍down sampling，单张图片还是repeat成2帧视频处理，简直就是Qwen2.5-VL翻版。除了加入2D-RoPE之外，还保留了ViT预训练的learnable absolute PE，并且在训练的时候会通过bicubic interpolation去适应可变分辨率，并且从原本的位置表采样得到适配后的位置embedding。过程如下：

![](https://pic3.zhimg.com/v2-9d459607f3334db664cd80faa38b5256_r.jpg)learnable absolute PE扩展分辨率其实就是把坐标归一化到一个可以无视patch块位置的范围，然后把原本的patch grid根据分辨率变化做映射，映射到新的grid的坐标上去，这样分辨率就可以scaling上去了。为什么要叠加这个？虽然GLM的ViT和Qwen2-VL一样，但人家Qwen2.5-VL是重头训了，GLM在预训练的224分辨率ViT上改就要尽可能保持原本的一些结构参数，这样训练收敛更快，也更稳定，符合智谱求稳的风格。

LLM部分也跟Qwen一样用了M-RoPE，不过GLM叫3D-RoPE，改了个名。

对于Video输入，看图就行，和Seed1.5-VL一样的，以时间戳为index去标记。

接下来是训练阶段：

- <strong>Pretraining：</strong>这个data pipeline比起CogVLM2可谓是超大号升级，这里我就简略写一下有哪些。（1）img-caption数据：根据分辨率、clip-score、去长尾分布（参考metaCLIP思路）、caption重写提高信息密度；（2）img-text交错数据，网页+电子书，主要排除广告、clip-score筛图文不想关、优先保留信息密度大的图表类信息；（3）OCR；（4）Grounding数据，还是CogVLM2思路，也补充了很多生成数据；（5）视频数据：学术、内部、网页；（6）指令跟随数据：先构建任务层级标签然后均匀采样、复杂场景的合成数据（长文档理解之类）、数据污染检查（多少会有点污染，人工+自动化查）；预训练有两个阶段：第一阶段多模态预训练，除了视频数据全部shuffle，按8k上下文训，第二阶段长上下文训练，32k的上下文，然后加入视频、高分辨率图像、长交错数据去拉大上下文，不过这个上下文长度比起其他厂略少了一点。

- <strong>SFT：</strong>这个阶段是比较重要的，因为cold-start SFT的效果是非常影响Thinking模式下的效果的，并且如果cold-start数据差，会导致训练崩溃或者RL越训越崩。这个阶段是先自己构建了长CoT语料库，包括需要verify的任务和比较简单的指令跟随任务，主要是为了让模型把已经有的视觉-语言理解对齐到有效的长思考模型以及严格的回答风格，并且为后面RL提供好的basemodel。具体的回答风格如下：
![](https://pic1.zhimg.com/v2-18e981072ef8ed8125436d80d71065d0_r.jpg)Thinking模式的回答风格其中think里面放思考内容，answer里面放简介回答。

经过一次cold-start后为RL提供basemodel，然后RL训出来的ckpt又提供了rejection sampling的素材，用这些素材进行best-of-N的数据筛选，再人工筛，出来的高质量数据又可以作为cold-start的数据进行SFT，所以SFT和RL是一种迭代更新的策略。

对于GLM-4.1-Thinking来说只能支持thinking模式，而GLM-4.5V是都支持，所以SFT的时候把CoT数据和非CoT数据都加入进行混合训练，非思考模式的数据只需要加一个<nothink>的token就行了，然后模型的回答think部分给空就行。

- <strong>RL：</strong>和Seed1.5-VL差不多的流程都是RLVR+RLHF，但是细节上出入较大。整体的RL算法用的GRPO，具体细节就不太详细讲了，大概从数据、reward设计、training方面写下大概在做啥：数据：先把所有任务拆成可以verify的子问题，把选择题改成填空题（更符合自回归的逻辑），用离线pass@k+人工标注给每题打1-5级难度；训练时实时统计模型在各子域的答对率，把难度分布作为在线监控指标，每 50 步按“过易、适中、过难”重新分配采样权重，确保始终喂给模型最能产生梯度的样本。

reward：建立双层的verifier。底层共享函数统一做格式检查、答案抽取（<|begin_of_box|>…<|end_of_box|>之间抽取）和精确匹配，如果匹配不上；上层按域插入定制模块——数学用 SymPy 数值容差，物理/化学再判定单位，图表先数值后语义，OCR 用编辑距离，Grounding用IoU，GUI 用动作+IoU双指标。为防止reward hacking，任何回答如果混语言、重复、空 box 或被检测到万金油答案（如“指出0-10 间的某个整数”回答“接近光的速度”）直接给0分；非verify任务在出现box标记也惩罚。

Training：在 GRPO 基础上加 RLCS（Reinforcement Learning with Curriculum Sampling）。先以 4-8 倍 oversample 做 rollout，用 EMA 动态调整 oversample 系数 = 1/(1−无效比例)；无效样本指整批全对或全错。长思维被截断时插入；强制输出答案，避免零奖励浪费。去掉 KL 和熵正则，top-p 设为1减少罕见 token 欠学，采用per-sample loss替代per-token loss。实验显示 RLCS 可在 3000 步内把整体多模态基准再提 2-4 个点，且跨域泛化良好。

ps：pass@k就是在训之前就离线完成的sample难度评估，让一个模型或者多个模型去解题，统计至少有一次答对的概率，也就是说pass@k如果为0，那就是很难，pass@k如果为1，那就是很简单，然后人工阈值分一下，就能分出难度等级，在GLM-4.5V的每次RL的时候都会根据问题的难度去筛数据，提出超简单或者超难样本，让这个RL阶段更好学。

剩下的infra照例跳过。总的来说，GLM-4.5V和GLM-4.1-Thinking主要是在数据上做了较大改进，清洗流程多样，然后RL和cold-start联动起来，也是现在VLM做RL的常规思路，在设计RL细节上有自己独特的一套思路，加了很多小trick去优化RL的训练过程，稳定训练过程。

总的来说，从CogVLM到GLM-4.5V，智谱的思路就是在稳中求进步，相比与力大砖飞的思路，更适合大部分人学习。（没有贬低力大砖飞的意思，有这个资源可以做，只要能训出来好模型就行。）

MIMO-VL（小米）
<strong>20250911更新，休息了一阵，继续更新，大家久等了</strong>

Link：[[2506.03569] MiMo-VL Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2506.03569)

Mimo-VL其实从大体结构上也没有特别多的改进，主要还是那一套范式，结构如下：

![](https://pic1.zhimg.com/v2-18ab2364a88f1dc2345a52b64d0057f6_r.jpg)Mimo-VL的结构vision encoder是一个原生分辨率的ViT，有两种结构，一个是自己训的，一个是Qwen2.5-VL的ViT。MLP是随机初始化的，LLM是Mimo-7B。

预训练用了2.4亿的token，任务类型覆盖较全。

做预训练数据花了很多时间，简单讲一下整个数据处理的逻辑，首先需要通过图像感知哈希配合文本去重剔除重复样本再结合内容过滤排除信息贫乏格式异常或存在安全隐患的数据确保基础纯净度；重标注机制一集合成增强手段例如利用专业的captioner模型重新生成caption；设计复杂指代表达构建跨平台标准化动作轨迹以提升语义深度与任务挑战性；依据语言一致性知识密度图文互补性时序对齐精度等多维指标对样本进行评分筛选保留最具教学价值的内容。总的来说，原则就是“多样、精准”。

预训练和SFT的过程加起来一共分四个阶段，如下：

![](https://pica.zhimg.com/v2-8fc9c97e43e3cc3a9e0912f22b44ae9c_r.jpg)mimo-vl pretraining stagestage1主要是mlp的warmup，和很多厂的思路差不多，先用img-caption对去简单训一下mlp。stage2就是连着ViT和mlp一起训，还加了图文交织的数据。stage3就开始大力训所有params，然后数据也加入了各种任务需要的数据。stage4最后就是用长text，各种pdf文件，高分辨率图像，视频，长推理去扩展模型的上下文，依然是训所有params。最后的这个模型是Mimo-vl-7B-SFT，后面的post-training都用这个模型为basemodel。

Post-training主要用了Mixed On-policy Reinforcement Learning (MORL)的思路，也就是RLVR+RLHF，也和大多数厂的思路大差不差。

RLVR里面主要针对了5项任务：

- 视觉推理：从开源社区与自有的K-12题库中收集了多样化的可验证 STEM 问题。引导大语言模型筛选出需证明过程的题目，并将原本为选择题、答案为数字或符号的题目改写为开放作答形式，以减少模型“奖励作弊”的可能性。进一步利用VLM评估题目难度，剔除那些本身就很好的模型（类似Gemini2.5-pro？这里作者也没有说明）也无法解答或过于简单的题目，MiMo-VL-7B 的首次尝试通过率超过百分之九十。同时，移除了那些即使不看图像也能解答的问题。经过数据清洗与类别均衡后，构建了一个包含八万道题目的视觉推理数据集。评估时使用基于规则的 Math-Verify 库来判定回答是否正确。2. 文本推理：作者认为有些长文本推理的难题是更难的，所以加入了纯文本的题来进一步训练，奖励计算同样使用 Math-Verify 库，确保视觉与文本推理任务的评估标准一致。

3. 图像定位：在 RLVR 框架中同时纳入通用图像定位与图形界面定位任务，对于边界框预测，奖励根据预测框与真实框之间的广义交并比GIoU计算；对于点坐标输出，奖励则根据预测点是否落在真实框内判定。这整个过程就是目标检测那一套方案来做的。以前我想过在VLM的SFT阶段去接入古早的检测头去同时做location的任务，但这个过程实际上会影响训好的vit，进而造成整个vlm的遗忘，归根到底还是因为vlm是token预测，和以前的目标检测任务的概念有本质上的训练差异，所以RLVR的方式去训成了一个比较普遍的共识。

4. 视觉计数：类似数一下这张图里面有几个人，奖励依据模型预测数量与真实数量是否一致来计算。

5. 视频时序定位：引入视频时序定位任务，要求模型根据文本的查询定位对应的视频片段。模型必须要以 [分:秒, 分:秒] 格式输出目标片段的起止时间。奖励根据预测时间段与真实时间段的交并比IoU计算。

OK接下来是RLHF阶段，数据构建原文写的很清楚：采用基于嵌入向量聚类问题并分析聚类模式等技术。尤为关键的是，在最终构建问题集之前，我们会平衡中文与英文问题的比例，以及侧重“有用性”与“无害性”的问题比例。对于每个选定的问题，我们会让MiMo-VL-7B与多个其他顶尖视觉语言模型分别生成回答，再由一个先进的视觉语言模型对这些回答进行两两比较排序，从而构建出最终用于奖励模型训练的高质量数据集。总结就是用好模型+开源+闭源的数据来构建reward model的训练数据集。reward model用了两个模型，一个是mimo-7b用于纯文本问题，一个mimo-vl-7b用于多模态问题，把两种问题给区分开来了。

注意，这里用来训reward model的数据集在RLHF也用了，共享数据集能够减少问题分布的偏移，如果训练reward model的数据和RLHF的数据差异较大的话，reward model会出现比较严重的幻觉，进一步导致出现高分但是幻觉严重的结果，这就是reward hacking。

reward model的训练就是简单的Bradley-Terry奖励建模，简单来讲就是让model识别两个回答哪个更好。这个咱们有空再细讲。

下面是MORL了，主要用来同时优化RLVR和RLHF。如下：

![](https://pic1.zhimg.com/v2-3906d01c1bb816849fd905fb697466f2_r.jpg)MORL pipeline整个过程用GRPO去优化，但是又有所改动，变成了fully on-policy，也就是每次更新策略所用的数据，都是当前策略刚刚生成的，不保留旧数据。这保证了训练数据始终和当前模型能力匹配，避免“用老数据教新模型”的分布偏移问题。又因为每一步都是新模型，训练本身就比较稳定，所以不需要用KL散度去clip了。此外还有3个小trick，第一个是动态采样，会根据模型当前能力动态调整采样温度或生成长度，避免总生成简单或者重复回答；第二个是重采样，对于reward很低或者reward很模糊的样本，重新生成新回答再评估，提升数据质量；第三个是自动跳过模型已熟练掌握的太简单问题，聚焦难样本，提升训练效率。

训练过程也用了RaaS（Reward-as-a-Service），简单来说就是RaaS能自动识别任务类型，调用对应评分器，很快返回0~1的统一奖励分数，为RL提供稳定的训练信号。主要是训练流程上的优化。

最后看下实验结果：

![](https://pic4.zhimg.com/v2-077b5bf95364f32fd796c7806aec80eb_r.jpg)各种benchmark的对比在同量级的模型中表现比较亮眼，缺点也是没有更多可选的量级，不过工作较扎实。

ERINE（百度-文心一言）
Link：[ERNIE_Technical_Report.pdf](https://link.zhihu.com/?target=https%3A//ernie.baidu.com/blog/publication/ERNIE_Technical_Report.pdf)

Official Blog：[Announcing the Open Source Release of the ERNIE 4.5 Model Family | ERNIE Blog](https://link.zhihu.com/?target=https%3A//ernie.baidu.com/blog/posts/ernie4.5/)

ERINE 4.5的结构如下：

![](https://pic4.zhimg.com/v2-1f4dd58e2fad45a5cd889fec5c1ebf05_r.jpg)带有异构MoE及多模态expert的架构这个结构大致和现在的范式相同，主要是在FFN部分引入了experts。通过引入vision experts和share experts进行了一定的信息交互，单模态可以单独处理，也可以和其他模态共享处理。

vision encoder就是一个支持原生分辨率的vit（通过resize到patch_size最近的倍数分辨率）+2D-RoPE。老操作，各厂基本统一结构了。对于video，采用了adaptive frame-resolution sampling strategy，简而言之就是先按照固定的fps去采样帧，保持原始分辨率进行encode，如果encode之后的token数量达到设置的上限，就把视频分辨率降低知道token数量达到下限，实在太多的话会下采样帧数量。

对于video来说用了绝对时间戳代替PE和类似Seed1.5-VL的文本时间戳，一开始比较好奇就看了下源码：

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

cur_directory = Path(__file__).parent.absolute()
FONT_PATH = os.path.join(cur_directory, &#34;Roboto-Regular.ttf&#34;)

def render_single_image_with_timestamp(
    image: Image, number: str, rate: float, font_path: str = FONT_PATH
):
    &#34;&#34;&#34;
    Function: Renders a timestamp to the image of pil.image
    The timestamp size is the rate of min(width, height)
    The font color is black, the outline is white, and the outline size is 10% of the font
    Returns an Image object
    &#34;&#34;&#34;
    draw = ImageDraw.Draw(image)
    width, height = image.size
    font_size = int(min(width, height) * rate)
    outline_size = int(font_size * 0.1)
    font = ImageFont.truetype(font_path, font_size)
    x = 0
    y = 0

    # Draw a black timestamp with a white border
    draw.text(
        (x, y),
        number,
        font=font,
        fill=(0, 0, 0),
        stroke_width=outline_size,
        stroke_fill=(255, 255, 255),
    )

    return image

def timestamp_converting(time_stamp_in_seconds):
    &#34;&#34;&#34;
    convert timestamp format from seconds to hr:min:sec
    &#34;&#34;&#34;
    # get hours
    hours = 0
    while time_stamp_in_seconds >= 3600:
        hours += 1
        time_stamp_in_seconds -= 3600
    # get minutes
    mins = 0
    while time_stamp_in_seconds >= 60:
        mins += 1
        time_stamp_in_seconds -= 60
    time_hours = f&#34;{int(hours):02d}&#34;
    time_mins = f&#34;{int(mins):02d}&#34;
    time_secs = f&#34;{time_stamp_in_seconds:05.02f}&#34;
    fi_time_stamp = time_hours + &#34;:&#34; + time_mins + &#34;:&#34; + time_secs

    return fi_time_stamp

def render_frame_timestamp(frame, timestamp, font_rate=0.1):
    &#34;&#34;&#34;
    Function, given a frame, render the index in order
    Logic: render the index to the upper left corner of the image
    frame: frame, PIL.Image object
    timestamp: timestamp, in seconds
    font_rate: the ratio of font size to min(wi, hei)
    &#34;&#34;&#34;
    time_stamp = &#34;time: &#34; + timestamp_converting(timestamp)
    new_frame = render_single_image_with_timestamp(frame, time_stamp, font_rate)

    return new_frame
原来是直接在图像的左上角写了一个格式为HH:MM:SS.xx的时间戳信息，然后完全依赖vision encoder的能力去提取时间信息。这个操作还挺吃vision encoder的能力的，在pretraining的时候vision encoder就从有文本的图像中获得了能够读取图像中文本的能力（OCR）。但这种方案感觉并没有文本时间戳显式，主要还是为了避免文本时间戳带来的token数量变多的问题。

在vision encoder之后img token还会经过一个adapter，他用于空间+时间维度的压缩，首先是空间压缩，2×2不重叠的patch压缩成一个，然后时间维度采用了internvl最爱的pixel shuffle再次压缩。最后经过mlp对于text token的hidden dim。

对齐各模态之后，3D-RoPE发力，具体参考QwenVL的M-RoPE，几乎没区别。

进入<strong>预训练阶段</strong>，数据构建每个厂都有自己的一套pipeline，就不细讲了，量大+均衡+干净是最终目的。预训练主要分了三个部分：

![](https://pic3.zhimg.com/v2-419745fb41a422a905365995f7a3b1f2_r.jpg)三阶段pretraining<strong>stage1</strong>是主要用于训练LLM，首先是以8k的上下文对大量文本数据进行训练（这里的报告文字写的8K上下文，但是表里是4K上下文，应该是作者的笔误），然后把上下文提升到32K，rope的频率 
![](https://www.zhihu.com/equation?tex=%5Ctheta) 从10k提升到160k，目的是为了防止上下文长度增加导致原本的rope出现周期性重复。最后再从32K的上下文扩充到128k的上下文，rope的频率 
![](https://www.zhihu.com/equation?tex=%5Ctheta) 从160k提升到500k。

<strong>stage2</strong>主要是训视觉表征，采用了三阶段渐进式对齐策略，首先预训练视觉编码器（配合小语言模型，利用大量图文对学习丰富视觉表征），接着进行视觉预对齐（冻结LLM与ViT，仅训练从头初始化的Adapter、由文本专家剪枝而来的视觉专家及路由模块，实现视觉模块与语言主干的无缝衔接）；最后进入视觉融合阶段（解冻视觉编码器，并对高质量图文对如标题、替代文本进行上采样，强化视觉与语言表征的空间对齐）。

<strong>stage3</strong>就是直接训full model，实现多模态对齐。首先在8K上下文下进行full tuning，加强模态对齐，然后将上下文扩展至128K上下文，在保持多模态理解能力的同时，让模型能够处理超长视频、复杂图文文档、跨模态长程推理等长上下文任务。

预训练出现的问题：

（1）vision experts、shared experts、text experts的负载不均衡。负载不均衡的意思是某些专家被频繁调用而某些又几乎不用。

（2）在多模训练的时候梯度不稳定。

erine4.5引入了几个改进来解决上面两个问题。

对于负载不均衡：首先出现这个问题的原因就是expert之间的分工不明确，有一个相似的token可能被分给了很多个专家，那这些专家其实作用就重叠了，造成了计算的冗余。最后就导致了这几个专家FFN的权重其实是差不多的。并且在训练和推理中都会被同时激活。所以基于这个现象呢，erine4.5提出了Router Orthogonalization Loss，也就是让每个FFN的权重都要正交。整个loss的公式如下：

![](https://pic4.zhimg.com/v2-45b9a05d134bf4489c0c13ecaa7f4719_r.jpg)Router Orthogonalization Loss其中这个 
![](https://www.zhihu.com/equation?tex=w) 就是这个专家的路由权重向量，然后对不同专家的
![](https://www.zhihu.com/equation?tex=w)进行归一化之后做点积，计算两个向量的余弦角，然后 
![](https://www.zhihu.com/equation?tex=%5Cdelta_%7Bij%7D) 就是一个Kronecker delta，通俗来讲就是i=j的时候这个值为1，i≠j的时候等于0。整个loss就是矩阵正交惩罚的公式，很简单。

对于梯度不稳定的问题，咱们先分析一下为什么多模训练相比于纯LLM训练会不稳定，对于原始的NTP loss也就是ce，公式是：

![](https://pic4.zhimg.com/v2-4922038d7f4dd816261c9dee4d882605_r.jpg)常规训练损失其中这个 
![](https://www.zhihu.com/equation?tex=U_i) 就代表了有效token的集合，什么是有效的token，就是我输入img+prompt之后模型吐出来的response，在整个token序列（img token+prompt token+response token）中response token就是有效token。对于纯文本LLM预训练来说，很难出现有response比prompt短很多的情况，但不能说没有，只能说轻度存在。但是在多模训练里，举个极端例子，我输入一个高分辨率视频，prompt是：里面的人在做什么动作，response是：他在跳舞。但是这个时候img toke就占了整个序列的一大部分，response的比例占比就更少了！所以出现这个问题的根本原因就是在多模训练的时候img或者video占的token数量较多导致的。然后我们再倒回去看上面的公式，假设我们的response A有效token只有10个，相比于response B的1000个有效token的回答， 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B1%7D%7BU_i%7D) 的系数就会导致A的梯度比B大100倍，短response的loss占主导就会让模型更倾向回答更短的response。

这里其实我认为报告里没有说清楚的一点是：不管是不是多模训练，这个loss都和除了response的token没关系，那为什么LLM不用这个？其实也能用。但是从直觉上讲，img token偏多，我们是更需要response能够生成较长回答的，并且数据里面短回答可能是偏多的，在数据并没有这么精细的caption情况下，要想在pretraining阶段训出一个能够覆盖长短回答的model，这个loss是能起到作用的。

ERINE-4.5还做了一个关于EMA的实验以论证EMA与学习率衰减的等效性，这个有时间就放在最后面再讲。

<strong>Post-training阶段</strong>：这里我只讲VLM的post-training，LLM部分的话有空再讲一下。VLM的post-training遵从下面的pipeline：

![](https://picx.zhimg.com/v2-947c25071502654e67b6b6db9759e2a9_r.jpg)VLM的post-training pipeline第一步主要是要构建数据，文心团队是发现经过CPT阶段的VLM在一些难度较高的视觉任务例如拼图测试、几何题、图表解读等表现很差，根本原因还是预训练的数据太粗糙，很少密集且精确的caption，所以数据的构建核心要点一直就是要让VLM能够获得图像细粒度结构的感知能力。也是可控合成+数据重标注来进行高质量数据筛选，其中重标注还设计了一个约束，就是获得的caption必须能够让llm给出正确答案，不然不能算是高质量caption（那其实这一步就很吃LLM的推理能力，同时也可能卡死VLM对于复杂视觉问题处理的上限，有待验证）。此外还过滤掉了直接OCR可以获得答案的那种数据。

然后进入SFT stage，首先是用高质量且较复杂任务纯文本的长推理数据去冷启动，作者还发现了一个现象，原文是这样“尽管该模型仅在精心筛选的文本数据上训练，从未接触过任何视觉输入，它却自发涌现出多模态推理行为，例如生成反思性提示：“让我再看一下图片。”“。我个人理解这算是从纯文本-->多模态推理的一个过渡，因为不管是VLM还是LLM本质上都是在拟合一种统计模式，我不否认这可能是多模态能力的涌现时刻，但是这正好证明了一点：我在没有视觉信息的输入的情况下模型想要再去看一下图，但这个信息根本就不存在，说明这种数据模式在以前的数据中极有可能已经被模型学到了。这到底是模型变聪明的时刻还是出现幻觉的时候，目前无从得知，有待考证。

回到正题，第二步是拒绝采样，这个就是老生常谈了，在步骤1模型的基础上，为STEM、理解任务、图表与文档分析、创意写作等复杂视觉相关任务生成推理数据。第三步是用第二步生成的推理数据和非推理数据进行联合训练。对于所有非推理数据在回复前添加空的<think>token，并将这些标签掩码，不参与梯度更新；此外将非思考模型中的多模态专家迁移至“思考模型”中，创建统一模型，实验结果是表示这种方法能够保证非推理能力。（就是DeepSeek-R1T-Chimera的方案）。

最后一步是混合推理的RL，经典的RLVR+RLHF，采用GRPO+DAPO的联合RL，reward model采用ERNIE-4.5-Base，reward model接收 prompt+response+可能的 verifier score，输出一个自适应融合后的奖励值。DAPO的论文我还没看，因为不是做RL的所以可能过段时间再去了解。

整个训练过程就这样，后面infra及部署我不太懂就跳过了。整体来说erine 4.5的训练基本和目前的主流方案大差不差，具体区别可能就在数据积累和RL算法选择上。

Skywork-R1V系列
Link：[Skywork-R1V/Skywork_R1V3.pdf at main · SkyworkAI/Skywork-R1V · GitHub](https://link.zhihu.com/?target=https%3A//github.com/SkyworkAI/Skywork-R1V/blob/main/Skywork_R1V3.pdf)

 

Keye-VL（快手）
TO DO

MiniCPM-V 4.5
TO DO