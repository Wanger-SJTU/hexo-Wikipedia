---
title: "为什么我还是无法理解transformer？"
date: "2023-10-24 00:00:00"
updated: "2023-10-24 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/为什么我还是无法理解transformer/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/596771388/answer/3263001703"
---


要理解和熟悉一个新的技术/新模型，比较好的方式是通过以下框架结构来熟悉：

<strong>为什么：</strong>一个新模型的诞生，一般是解决了现有的模型不能解决的一些问题。因此需了解该技术提出的背景和创新点。

<strong>是什么 ：</strong>熟悉这个模型的内容和架构、训练过程等。

<strong>怎么用：</strong>了解模型的应用场景，将模型为我们所用。

接下来就从这三步骤来聊聊Transformer。

为什么
Transformer最早是Google在2017年的[Attention Is All You Need](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1706.03762)论文中提出，用于解决解决传统的序列到序列（sequence-to-sequence，Seq2Seq）模型在<strong>处理可变长序列</strong>时遇到的问题。

序列到序列（Seq2Seq）：指的是模型的输入是一段序列，模型输出也是序列；比如语音识别中给模型一段中文语音序列，让模型给出中文文字序列在传统的序列建模方法中，如循环神经网络（RNN）和卷积神经网络（CNN），在处理长序列均存在限制：RNN在处理长序列时容易出现梯度消失或梯度爆炸的问题，<strong>模型难以捕捉到长距离的依赖关系，</strong>不能并行计算；而CNN卷积操作通常要求输入具有固定的尺寸，在处理可变长序列时，为了使序列具有相同的长度，需要对较短的序列进行填充，导致<strong>计算效率低下</strong>。

而Transformer通过自注意力机制（self-attention）来解决这些问题。

自注意力机制（self-attention）
自注意力机制是一种用于处理序列数据的机制，它能够在序列中的每个位置上计算该位置与其他位置之间的关联程度，并根据这些关联程度来加权组合序列中的信息。

![](https://pic1.zhimg.com/v2-dc459a2feab2a7ede6a934b31f1ab77f_r.jpg?source=2c26e567)图源：[1]如图所示，<strong>a</strong>为输入的序列<strong>，</strong>中间的方框是self attention操作，最终输出的<strong>b</strong>为依据<strong>a</strong>每个位置与其它位置关联程度加权后输出的序列<strong>。</strong>

从细节来说，需要理解几个概念：

- 查询（Query）：查询是你想要了解的信息或者你想要从文本中提取的特征。它类似于你对文本中的某个词语提出的问题或者你想要了解的内容。
- 键（Key）：键是文本中每个词语的表示。它类似于每个词语的标识符或者关键信息，用于帮助计算查询与其他词语之间的关联程度。
- 值（Value）：值是与每个词语相关的具体信息或特征。它类似于每个词语的具体含义或者特征向量。在自注意力机制中，具体步骤是：

<strong>Step 1：</strong>从<strong>输入值a</strong>乘以矩阵Wq、Wk和Wv（这三个矩阵是模型参数，需要通过训练数据来学习）<strong>获取查询（Q）、键（K）、值（V）</strong>

<strong>Step 2：</strong>通过<strong>计算查询（Q）与键（K）之间的点积</strong>，来衡量查询与其他词语之间的关联程度，

然后，通过对这些关联程度进行<strong>归一化处理</strong>（一般采用softmax归一化），得到每个词语的注意力权重。

<strong>Step 3：</strong>最后，根据这些注意力权重，<strong>对每个词语的值（V）进行加权求和</strong>，得到一个新的表示，该表示会更加关注与查询相关的信息。

![](https://picx.zhimg.com/v2-9ef932222cef95f955df8f445dc3c54d_r.jpg?source=2c26e567)图源：[1]如图所示， 
$\alpha_{1，1}$ 是q1和k1点积计算并归一化后得到的关联程度，以此类推，最后再用关联程度与所有v进行加权求和，就能获得到与q1关联最大的信息b1,而其它的b2、b3、b4也是同样的计算方式。

最终，从矩阵的角度运算的角度，整个过程可以被表示为：

![](https://pica.zhimg.com/v2-07a2073b7d05c2e61704b11706a74822_r.jpg?source=2c26e567)图源：网络此外，这里没有考虑到输入的位置信息，因为对每个位置的输入操作都是一样的。而有时，序列的位置信息也很重要，因此，还需对输入使用位置编码（<strong>Positional Encoding），</strong>将位置信息给到输入。

由于sin和cos函数包含位置信息，Transformer中，使用了sin函数和cos函数进行了位置编码：

![](https://pic1.zhimg.com/v2-cf94f4d27269f3d52cee4e3b9c704c63_r.jpg?source=2c26e567)计算得到位置向量后，将位置向量与输入<strong>a</strong>相加后再计算对应的Q、K、V，这样就考虑了输入的位置。

![](https://pica.zhimg.com/v2-08d699863fd1b75703dd5576d65d89db_r.jpg?source=2c26e567)图源：[1]我们可以将Self Attention层的输出给全连接神经网络（Fully-Connected Network），学习更多的信息，最终的结构可以如下：

![](https://picx.zhimg.com/v2-421b476fc1354be743c4ca597db13ea2_r.jpg?source=2c26e567)图源：[1]可以看出，自注意力机制通过直接建模词与词之间的关联程度，可以更好地捕捉到远距离的依赖关系；它可以进行并行计算，在处理大规模数据时具有较高的计算效率。

多头自注意力机制（Multi-head self attention）
多头注意力机制是一种在自注意力机制基础上的扩展，它允许模型同时关注不同的表示子空间，以更好地捕捉输入序列中的不同关系和特征。

在传统的自注意力机制中，你只能使用一组查询（Q）、键（K）和值（V）来计算注意力权重。但是，在多头注意力机制中，你可以使用多组不同的Q、K和V来进行计算。

![](https://pic1.zhimg.com/v2-9bcbe1ec4e872a5562c78dba76c0edf3_r.jpg?source=2c26e567)图源：网络每个注意力头都有自己独立的一组Q、K和V，它们通过独立的线性变换来生成。这样，每个注意力头可以关注文本中不同的方面和特征，从而提取更丰富的信息。最后，多个注意力头的结果会被拼接在一起，并通过另一个线性变换进行整合，得到最终的输出。

通过使用多头注意力机制，模型可以同时关注不同的表示子空间，从而捕捉到输入序列中更多的关系和特征。这种并行处理的方式可以提高模型的表达能力和泛化能力，使得模型更好地理解和处理复杂的输入数据。

我们也可以利用大模型给我们通俗的解释注意力机制~

![](https://pica.zhimg.com/v2-a31ab19f5ab17ec1a9e3763b3b4a7d7f_r.jpg?source=2c26e567)大模型正是基于Transformer实现的强大工具。这里有门大模型的免费公开课，在两天的课程中，我们可以了解<strong>大模型发展历程与训练方法、Prompt Engineering、利用LangChain+Fine-tune定制大模型应用</strong>等知识，最终利用大模型为我们赋能。推荐大家体验~

是什么
以下是Transformer完整的架构，总体来看，它由<strong>编码器（Encoder）</strong>和<strong>解码器（Decoder）</strong>两部分组成。

![](https://picx.zhimg.com/v2-6d4547a13a10575164a9533f92861a33_r.jpg?source=2c26e567)图源：网络
编码器（Encoder）
左边是编码器部分，主要作用是将输入数据编码成计算机能理解的高维抽象表示。

它的结构也就是前面一节我们所说的<strong>多头注意力机制+ 全连接神经网络</strong>的结构。此外，这里用了<strong>残差连接（Residual connection）</strong>的方式，将输入和多头注意力层或全连接神经网络的输出相加，再传递给下一层，避免梯度递减的问题。

解码器（Decoder）
右边是解码器的部分，主要作用是利用高维表示信息生成目标序列。它的结构大致与编码器相同，不同的有两点：

<strong>第一，采用了掩码多头自注意力（Masked-Multi-head self attention）</strong>，即在计算注意力得分时，模型只能关注生成内容的当前位置之前的信息，避免未来信息的泄漏。

比如，这里计算输出b2时，就只使用了a1、a2两个位置的注意力得分进行加权。

![](https://picx.zhimg.com/v2-4f51b3cad07f9221dbc8070a8e096c7f_r.jpg?source=2c26e567)图源：[1]采用这种方式的原因是，模型需要按照顺序逐步生成序列（a1、a2），因此不能提前获取到未来a3、a4的信息。

<strong>第二，中间部分，利用了Encoder的输出结果计算交叉注意力（Cross Attention）。</strong>同之前的注意力机制类似，Cross Attention通过计算解码器当前位置（Q）的表示与编码器上下文表示（K）之间的注意力权重，将编码器上下文表示（V）加权，然后将该加权表示与解码器当前位置的表示进行融合。

训练过程
Transformer的训练过程和深度神经网络模型类似。以中文翻译成英文的翻译任务为例：

<strong>数据准备：</strong>首先，需要准备训练数据集，包括大量中文序列和人工标注的正确英文序列。

<strong>输入表示</strong>：将中文源语言句子和英语句子进行编码，并进行适当的标记和嵌入处理。常见的编码方式是使用词嵌入（Word Embedding）将每个词转换为向量表示，并添加位置编码（Positional Encoding）以保留序列的顺序信息。注意在训练时，Decoder的输入是人工标注为正确的英文序列，而不是Decoder自己生成的英文序列。

<strong>确定模型架构：</strong>构建Transformer模型的架构，包括编码器和解码器层数、注意力机制和前馈神经网络层数等等。

<strong>训练模型：</strong>定义适当的损失函数来衡量模型在训练过程中的性能。对于机器翻译任务，常用的损失函数是交叉熵损失函数，用于比较模型生成的英语句子与正确的英语句子之间的差异。训练过程中，通过反向传播算法和优化器（如Adam优化器）来更新模型的参数（如全连接神经网络的参数、注意力机制中的Wk、Wq、Wv参数），以最小化损失函数。通常会使用小批量（mini-batch）的方式进行训练，即将训练数据划分为多个批次，每个批次包含一定数量的样本。

<strong>验证和调优：</strong>使用验证数据集评估模型的性能，进一步进行超参数调整、模型结构调整等操作，提升模型的性能。

<strong>推理和应用：</strong>训练完成后，使用已训练好的模型将中文句子翻译成英文句子。

注意，Transformer所需的训练数据量通常在数百万到数十亿个tokens（输入向量）之间，因此个人训练Transformer是很困难的，最好直接使用预训练好的模型。

怎么用
目前Transformer被广泛使用在机器翻译、文本生成、语义理解、语音识别、对话系统等多个领域。尤其现在比较火的GPT、New Bing等大语言模型都是基于Transformer架构进行改进和研发的。

不是所有人都需要去细致研究Transformer，更多的情况下我们只是希望能便捷的使用预训练好的模型来帮助我们提高效率，而现在基于Transformer的最新的技术便是大模型。

可以了解下这门大模型的免费公开课，添加助教老师微信还能获取大模型资料包和好用的大模型工具网址 ~

如果你想自己应用Transformer，也可以去Github参考学习一些热门的Transformer的开源代码。比如下面这个<strong>Hugging Face Transformers</strong>: 

![](https://pic1.zhimg.com/v2-138e2708772f70b7c416863cada38f67_r.jpg?source=2c26e567)它是个基于PyTorch、TensorFlow和JAX的自然语言处理模型库，提供了数千个预训练模型，支持多种任务，包括文本分类、信息提取、问答、摘要、翻译、文本生成等。

看到这里，最后再看原论文这张图，是不是能很好的理解了呢？

![](https://picx.zhimg.com/v2-8643559c6f3a811fcaf6ec39d8105de3_r.jpg?source=2c26e567)图源：[2]参考文献：

[1] [Hung-yi Lee-Transformer](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DugWDIIOHtPA%26list%3DPLJV_el3uVTsOK_ZK5L0Iv_EQoL1JefRL4%26index%3D61)

[2] [Attention Is All You Need](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1706.03762)

[3] [What Is a Transformer Model? | NVIDIA Blogs](https://link.zhihu.com/?target=https%3A//blogs.nvidia.com/blog/2022/03/25/what-is-a-transformer-model/%23tdsub)

[4] [A Survey of Transformers (arxiv.org)](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2106.04554.pdf)

我是等壹，上海交大工学硕士，多年机器学习研究，现某大厂码农一枚。

既是文艺青年，也是技术极客，希望人生尽兴有趣~

我会定期分享人工智能和大数据技术、学习技巧、职场等内容，欢迎关注！