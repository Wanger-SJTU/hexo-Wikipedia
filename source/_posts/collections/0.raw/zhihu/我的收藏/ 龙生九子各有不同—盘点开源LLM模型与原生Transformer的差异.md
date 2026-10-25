---
title: (1 条消息) 龙生九子各有不同—盘点开源LLM模型与原生Transformer的差异
date: "2023-09-11 00:00:00"
updated: "2023-09-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/龙生九子各有不同—盘点开源LLM模型与原生Transformer的差异/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/637837856
---


总所周知，当今大热的LLM模型大都是基于transformer模型演化而来。但龙生九子各有不同，这些LLM模型在许多细节实现上却与原生的transformer模型存在差异。本文将从模型结构，位置编码方法，激活函数和layer norm方法等四个方面盘点当前比较火的LLM模型与原生transformer模型差别，并尝试给出这些LLM模型对原生结构进行优化的原因。 

下表整体给出了本文比较的模型在各个维度的差异。  

模型结构位置编码激活函数layer norm方法原生TransformerEncoder-DecoderSinusoidal编码ReLUPost layer normBERTEncoder绝对位置编码GeLUPost layer normLLaMACausal decoderRoPESwiGLUPre RMS NormChatGLM-6BPrefix decoderRoPEGeGLUPost Deep NormBloomCausal decoderALiBiGeLUPre Layer Norm**

  1.  模型结构** 

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5f5ee993cc03.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_01699586f56d.jpg)

 	对于模型具体结构的实现，如上图所示，主要分成encoder-decoder，纯decoder的LM结构以及predix-LM结构。原生transformer是一个encoder-decoder结构的模型，其主要原因是原生的transformer是为机器翻译任务所设计的，因此设计了一个编码器处理源语言输入，并通过解码器输出目标语言翻译结果。这种模型结构非常适合做自然语言生成任务，后续的LLM例如T5，BART等均采用此类结构。但对于BERT这样的偏向于理解类的模型而言，decoder并不是必须的，因此此类模型通常使用的是一个仅包含encoder部分的模型。而当前GPT系列的模型通常是将NLP任务建模成一个语言模型任务，对于语言模型任务，其仅需要对于给的前文生成下文，因为该类任务并不需要单独设计encoder，仅需要一个decoder即可完成。近期开源的LLM如LLaMA等大都沿用了GPT系列模型的结构，也是采用的纯decoder结构（也称为Causal decoder）。 	

值得注意的是，由于纯decoder结构对于自然语言理解类任务的处理并不友好（例如对于简单的序列标注同样需要采用自回归的方式依次生成输入对应标注结果），因此出现了prefix-LM结构，这类结构通常是去改变attention的mask矩阵，通过控制mask矩阵实现控制输入token的可见视野，从而满足模型同时对自然语言理解和生成两类任务的处理。ChatGLM模型便是基于prefix-LM结构实现的。   

2.  **位置编码** 

在LLM的实现上，位置信息编码同样也是一个主要的差异点。原生的transformer使用的是Sinusoidal编码方式，这是一种不可学习的位置编码方法，具体方法如下所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ed41cc53c8ff.jpg)

该方法通过使用sin和cos函数对位置进行编码，通过sin和cos函数的周期性，这种编码方式可以蕴含部分相对位置的信息。          

BERT模型对于位置信息使用的是可学习的向量去表示。具体的，对于每个位置均初始化一个向量表示该位置的信息，该向量会随着模型的训练一起更新，这是一种绝对位置编码方法。该方法的局限性为位置信息的外延性很差，即为在训练时如果使用了指定长度的序列进行训练，在推理时无法超过该长度。 	那么如何优化长度的外推性呢，相对位置编码方式是一个可行的解决方案。此类编码方式在位置建模时仅考虑当前token与计算token之间的相对位置信息，因此不会受到绝对长度信息的影响。目前开源的主流LLM模型大都采用的都是此类位置编码方法。其中应用较为广泛的是苏神提出的RoPE，该方法是在attention的QK计算时乘以了一个代表位置信息的矩阵以实现位置信息的编码，具体原理本文不再赘述，推荐看苏神的文章【1】。

下面给出LLaMa中关于RoPE的具体实现，另外值得注意的是LLaMA把位置编码用到了attention的每一层。 [https://github.com/facebookresearch/llama/blob/main/llama/model.py](https://link.zhihu.com/?target=https%3A//github.com/facebookresearch/llama/blob/main/llama/model.py)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_1fe8aba0af15.jpg)

此外，还有一种相对简单的相对位置编码方法是Bloom使用的ALiBi方法。如下所示，该方法直接在QK计算结果矩阵上加入了一个相对位置编码矩阵，其中m为超参数。该方法在论文中展示了在1024序列长度训练的13亿参数的模型，如果外推到2048序列长度可以和sinusoidal 位置编码训练得到的预训练模型有相同的困惑度。  

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_58c5ad452974.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_cfb3d71f7fb2.jpg)

3.  **激活函数** 

此处激活函数主要是指的FFN层的使用的激活函数，通过transformer原文可以知道FFN层的计算过程主要是y = f(Wx+b)W+b，主要是f的选取即为激活函数的选取。transfomer原文使用的是ReLU激活函数，即为y = max(0, Wx+b)W+b。而在BERT中引入了GeLU激活函数，该激活函数中引入了随机正则的思想。具体的，GELU对于输入乘上了一个以0，1组成的mask，而该mask的生成则是基于伯努利分布的随机生成的。这么选择是因为神经元的输入趋向于正态分布，这么设定使得输出在随机依赖于输入的同时，若输入减小，则输出会有一个更高的概率被dropout掉，具体计算过程如下所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b617e408b2ed.jpg)

很多实验都证明GeLU可以学习的更快更好。 	近期出现的LLM很多也会使用基于门线性单元（Gated Linear Unit, GLU）的激活函数。具体如下：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9ab646138c8a.jpg)

如上门控机制使得GLU能够选择性地过滤输入向量的某些部分，并根据输入的上下文来调整输出。门控部分的作用是将输入进行二分类，决定哪些部分应该被保留，哪些部分应该被抑制，可以有效地减少噪声和不相关信息的影响，提高网络的表达能力和泛化能力。 基于GLU的激活函数常见的主要包括两个SwiGLU和GeGLU，与原生GLU的区别在于用GeLU与Swish代替GLU中的sigmoid，具体如下所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3d92b5d2837f.jpg)

值得注意的是该部分只替换上文的f(Wx+b)部分，因此会增加权重矩阵V，为保证整体参数量和原生FFN一致，W和V的第二维度是原生FFN中间维度的三分之二。  

4.  **layer norm** 

在原生transofmer层中layer norm的计算过程为：计算输入各个维度均值、方差，原始输入减去均值并除以方差，此过程中会引入两个超参数。此外，在原生的transformer中，layer norm发生在残差连接之后，一般称为post-norm，该过程会导致随着层数的增大，原始输入的权重越小，导致模型难以训练。具体的分析此处搬运来自苏神的详细推导【2】。

 	为了解决该问题，研究者们提出使用pre-norm，这也是当前较多LLM模型使用的norm方式。具体的，该方式把norm放在了残差链接之前，即先对attention或ffn的输入做norm，其与post-norm的区别如下图所示（左post-norm，右pre-norm）。值得一提的是，由于pre-norm会更加强调残差输入的作用，会导致多层展开后无形地增加了模型的宽度而降低了模型的深度，从而造成效果会略差于post-norm。  

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5c77298dec47.jpg)

 	除了post和pre的优化之外，更好的norm方法也在不同的LLM中被尝试。其中RMS Norm是一种常见的方法，该方法认为norm中缩放性起的作用更大，因此去除了计算过程中的平移性（减去均值的过程），只保留了缩放。具体而言，该方法首先计算输入各维度的平方和再开根号，接着输入再除以该值后乘以超参。另外还一种用的较多的norm方法是deep Norm，该方法把模型更新限制在常数，缓解参数爆炸式模型更新的问题。具体实现的时候是在norm之前的残差输入乘了一个scale。 

**参考文献** 

【1】[Transformer升级之路：2、博采众长的旋转式位置编码](https://zhuanlan.zhihu.com/p/359502624) 

【2】浅谈Transformer的初始化、参数化与标准化 

【3】[开源LLM大模型位置编码探索](https://zhuanlan.zhihu.com/p/631003833)

 【4】[Layer Norm、RMS Norm、Deep Norm](https://zhuanlan.zhihu.com/p/620297938)

 【5】[ReLU、GeLU、SwiGLU、GeGLU](https://zhuanlan.zhihu.com/p/621058772) 

更多内容可关注公众号：自然语言处理与推荐系统  

http://weixin.qq.com/r/Bx3x6TLEo2-crXaK90gV (二维码自动识别)
