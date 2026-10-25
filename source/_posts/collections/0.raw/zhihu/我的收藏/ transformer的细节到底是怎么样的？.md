---
title: (1 条消息) transformer的细节到底是怎么样的？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/transformer的细节到底是怎么样的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/362131975/answer/3297483297
---


这里是@TopGeeky，持续输出计算机相关优质好文，如果觉得文章对你有用的话，不如点赞、收藏、关注三连；关注不迷路，持续输出优质文章~

<strong>“Attention is all you need”</strong> 初闻这句话的时候，觉得这篇论文太狂了

时隔多年，再回头，不禁为<strong>“Attention is all you need”</strong>拍手叫好。

注意，这篇文章不是科普文章，而是手把手带你尽可能理解Transformer的整体结构，并理解当时作者构建Transformer的思路和想法，不仅仅能够手写Transformer更多的是理解这个天才一般的想法是如何诞生。

Transformer最早在2017年的[Attention Is All You Need](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1706.03762)论文中提出，用于解决传统的序列到序列（sequence-to-sequence，Seq2Seq）模型在<strong>处理可变长序列</strong>时遇到的问题。

** 作为Seq2Seq模型，指的是输入一段序列，模型输出也是一段序列，比如最常见的翻译模型，输入一段文本序列，输出一段翻译后的文本序列。
### RNN的困境

一个新技术尤其是革命性的技术诞生出来，注定是为了解决某项长期存在、难以解决的问题。RNN不可避免的存在这三个问题：

- 传统 RNN 在训练过程中存在梯度消失和梯度爆炸**问题，虽然有 LSTM、GNU 等神经单元和 batch normalization、梯度截断等方法能缓解和解决。
- 传统 RNN 由于训练过程中一个神经单元的输入依赖上一个神经单元的输出，无法进行<strong>并行化计算</strong>
- 由于在类似于 seq2seq 等实际场景中，句法/行文风格等差异，导致不同位置对结果贡献会有差异。但是 <strong>RNN 由于是固定权重</strong>，需要较大的成本去适应复杂多变的句法和行文风格。
这三点也就导致无法将RNN广泛应用，在这RNN走不出的困境中，诞生出来Transformer模型。

**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_30a44fc1c479.jpg)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_636b2d962349.webp)

RNN基本结构

### Transformer模型核心思想

Transformer模型的核心思想是使用自注意力机制（Self-Attention）来实现对输入序列的建模。自注意力机制允许模型为序列中的每个位置分配不同的权重，以便模型可以更好地捕捉序列中的更重要的部分。相较于RNN的困境而言，更有如下优点：

长期依赖：**自注意力机制允许模型直接考虑序列中任意两个位置之间的关系，因此可以更好地捕捉序列中的长期依赖关系。

<strong>并行计算：</strong>自注意力机制允许模型并行计算，从而加速了模型的训练速度。

<strong>全局信息：</strong>自注意力机制允许模型在整个序列上进行建模，从而可以更好地捕捉全局信息。

吹完Transformer现在就开始扒开Transformer的外衣，聊一聊Transformer到底是什么

### Transformer

千万不要对Transformer的模型结构给吓倒了，其实简单了来看，也就划分为Encoder和Decoder两个模块，左边是Encoder部分将数据进行编码，右边是Decoder部分对左边编码后的数据进行解码，得到最终的输出结果。接下来我们只需要一步一步揭开Encoder和Decoder内部结构就可以完全剖析Transformer结构啦。

**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b9c26185aab1.jpg)

Transformer结构

#### Transformer的直观感受

前面提到Transformer主要由Encoder和Decoder两部分组成。在Transformer的论文中，Encoder和Decoder均由6个Encoder和Decoder，通常我们称之为Encoder Block。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b17b368a237d.jpg)

Encoder-Decoder模型

再来直观感受一下每一个Encoder和Decoder的内部抽象结构简图。

对于一个Encoder包含两层，一个是self-aation层一个前馈神经网络，self-attention能帮助当前节点不仅仅只关注当前的词，从而能获取到上下文的语义。

Decoder也包含Encoder提到的两层网络，但是在这两层中间还有一层attention层，帮助当前节点获取到当前需要关注的重点内容。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a911cca80ab5.jpg)

结构拆解

#### Self-Attention机制

`Self-Attention` 是 `Transformer`最核心的思想也是必须要理解的难点，这里将会花费大手笔去来详细解释和推导Self- Attention机制的过程。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f119727217ff.jpg)

Self Attention机制上面这个公式初看很难理解，也不知道最终的含义代表着什么。接下来紧跟我的思路，聊一聊这个公式的具体含义和过程。

首先这里我们先抛开已有Attention的设计思想，仅仅从数学角度来剖析一个公式：

Softmax(XX^T)X 

这个公式的含义理解后，便可以轻松知道Attention的设计原理。

#### 矩阵乘积 XX^T 表示什么？

先来理解向量的内积表示什么呢？ 

答：向量的内积表征两个向量的夹角，亦表征一个向量在另一个向量上的投影**。所谓投影就是表明两个向量之间的相关性，并且投影的值越大则两个向量的相关性越高。

另外可以考虑，如果两个向量的夹角为直角，就说明这两个向量线性无关。

把向量的知识带入到词向量当中，是不是说明两个词之间的相关性？

那么矩阵 XX^T 为一个方阵，里面保存了每个向量（单词）于其他向量（单词）进行内积的结果，也就是每个词直接的相关性的值。

<strong>这里也可以将相关性的值称之为词A对词B的关注值的大小</strong>

#### Softmax的妙用

都知道Softmax是一个将数值向量转换为概率分布的函数，将输入的原始数据转化为一个（0，1）之间的数值进行归一化的操作。在自注意力机制上，使用Softmax函数的作用就是将向量与向量之间的相关性通过概率分布的形式表现出来。

<strong>再来回顾一下Attention机制的核心 —— 加权求和</strong>

这里权就是通过Softmax函数归一化的权重，那么归一化后的数据矩阵与最后一个矩阵相乘的含义就呼之欲出啦。

通过计算权重在乘以自身原始数值，新的向量就是结合注意力机制后的向量。

说到这里就可以谈谈Self-Attention的自注意力机制啦

#### Self-attention的Q, K, V思想

这些Q、K、V矩阵本质上就是输入矩阵X经过先行变换得到的，其实不需要也可以；但是不通过线性变换得到就会缺少部分灵活性和模型的拟合能力。

这部分拟合能力来源于引入的三个参数矩阵。

为什么要取QKV这些名字。Q是Query（查询），K是Key（键/钥匙），V是Value（值）。在数据库中，我们希望通过一个查询Q去数据库中找出相应的值V，问题是，直接通过Query去搜索数据库中的V往往效果不好，我们希望每个V都对应一把可以找到它的钥匙K，这个K提取了V的特征，使得它更容易被找到。

因此Self-attention中的QKV思想，另一个层面是想要<strong>构建一个具有全局语义整合功能的数据库</strong>，所得到的最后矩阵就是输入矩阵X注意了上下文信息得到的在隐空间的语义矩阵。

**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_75135f198e36.jpg)

img

关于 \sqrt{(d_k)} 的含义，假设Q、K里的元素的均值为0，方差为1，那么 QK 中元素的均值为0，方差为d. 当d变得很大时， QK 中的元素的方差也会变得很大，如果 QK 中的元素方差很大，那么 Softmax（QK）的分布会趋于陡峭(分布的方差大，分布集中在绝对值大的区域)。总结一下就是 Softmax（QK）的分布会和d有关。因此QK 中每一个元素除以 \sqrt{(d_k)} 后，方差又变为1。这使得 Softmax（QK）的分布“陡峭”程度与d解耦，从而使得训练过程中梯度值保持稳定。

现在GPT4就是采用Transformer结果创建的AGI，还想了解风更多的话可以参加知乎知学堂推出的《程序员的AI大模型进阶之旅》一共2天的课程，可以帮助你梳理大模型领域的学习框架。****

🔥技术岗高薪必学：AI大模型技术原理+应用开发+模型训练￥0.00就业无忧

如果还是0元，建议你赶紧冲，跟AI大牛对话的机会太难得了！除此以外，[数学公式]更能体验自主训练的机器学习模型，实践理论相结合。上面的链接就是公开课的链接！！另外，添加课程之后一定一定一定要添加助教小姐姐的微信，可以私聊助教领取今年最火最热的大模型学习资源！！**

Self-Attention的代码实现

`# Muti-head Attention 机制的实现

```python
from math import sqrt
import torch
import torch.nn

class Self_Attention(nn.Module):
    # input : batch_size * seq_len * input_dim
    # q : batch_size * input_dim * dim_k
    # k : batch_size * input_dim * dim_k
    # v : batch_size * input_dim * dim_v
    def __init__(self,input_dim,dim_k,dim_v):
        super(Self_Attention,self).__init__()
        self.q = nn.Linear(input_dim,dim_k)
        self.k = nn.Linear(input_dim,dim_k)
        self.v = nn.Linear(input_dim,dim_v)
        self._norm_fact = 1 / sqrt(dim_k)

    def forward(self,x):
        Q = self.q(x) # Q: batch_size * seq_len * dim_k
        K = self.k(x) # K: batch_size * seq_len * dim_k
        V = self.v(x) # V: batch_size * seq_len * dim_v

        atten = nn.Softmax(dim=-1)(torch.bmm(Q,K.permute(0,2,1))) * self._norm_fact # Q * K.T() # batch_size * seq_len * seq_len

        output = torch.bmm(atten,V) # Q * K.T() * V # batch_size * seq_len * dim_v

        return output`
```


#### 不可小觑的位置编码

对于任何一门语言，单词在句子中的位置以及排列顺序是非常重要的，它们不仅是一个句子的语法结构的组成部分，更是表达语义的重要概念。

<strong>I do not</strong> like the story of the movie, but I <strong>do</strong> like the cast. I <strong>do</strong> like the story of the movie, but I <strong>do not</strong> like the cast.上面两句话所使用的的单词完全一样，但是所表达的句意却截然相反。那么，引入词序信息有助于区别这两句话的意思。

相较于天生就包含了词在序列中的位置信息RNN神经网络，Transformer完全采用Attention来训练这就导致词序信息的丢失，就无法知道每个词在句子中的相对和绝对位置。

<strong>因此，有必要把词序信号加到词向量上帮助模型学习这些信息，位置编码（Positional Encoding）就是用来解决这种问题的方法。</strong>

#### 奇思妙想的位置编码

通常来说，一种好的位置编码方案需要满足以下几条要求：

- 它能为每个时间步输出一个独一无二的编码；
- 不同长度的句子之间，任何两个时间步之间的距离应该保持一致；
- 模型应该能毫不费力地泛化到更长的句子。它的值应该是有界的；
- 它必须是确定性的。
Transformer的作者们提出了一个简单但非常创新的位置编码方法，能够满足上述所有的要求。首先，这种编码不是单一的一个数值，而是包含句子中特定位置信息的d维向量（非常像词向量）。第二，这种编码没有整合进模型，而是用这个向量让每个词具有它在句子中的位置的信息。换句话说，通过注入词的顺序信息来增强模型输入。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a383cb320a2.jpg)

<strong>关于更多的详细解释可以看看这篇博客：</strong>

Transformer Architecture: The Positional Encoding

讲了这么多，Transformer的细节还是难以讲述完全，包括Encoder和Decoder的设计和实现，还有Feed Forward和Add & Norm层的设计与实现等等，不过最重要的核心还是理解Self-Attention的实现，理解了Attention机制就明白了设计初衷，在此基础上的设计都不过是锦上添花罢了，另一个让我觉得最震惊的就是不起眼的位置编码，以及如何设计、实现一个位置编码的过程。

送礼物

还没有人送礼物，鼓励一下作者吧

[发布于 2023-11-21 23:17](//www.zhihu.com/question/362131975/answer/3297483297)・上海

​​3480 ​294 ​分享

​​

收起​
