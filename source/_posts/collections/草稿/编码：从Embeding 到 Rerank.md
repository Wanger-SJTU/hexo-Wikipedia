---
title: 编码：从Embeding 到 Rerank
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: post
permalink: /collections/草稿/编码-从Embeding-到-Rerank/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


通常在计算机里里面，所有的文字、图像都以一种特定的编码格式存储在硬盘和内存中，这些信息编码的目的就是希望编码后计算机认识、解码后人也认识，但缺少一种编码后NN 网络认识的方式。
像已有的编码表示如JPEG、UTF等都是方便计算机处理的离散编码格式，虽然方便处理，但是对于NN的神经网络来说直接理解就有很大困难了，这就需要将已经编码后的文字、图像从离散的向量空间映射到一个连续的向量空间。于是，有了embedding 的技术。
## Word Embedding

假设我们有了下面这些记单词，和一个二维的映射表，那理想中的各个语义相近单词应该距离也很接近。
```
Banana  Basketball  Bicycle  Building  Car  Castle  Cherry  House  Soccer Strawberry  Tennis  Truck
```
![embedings](https://cohere.com/_next/image?url=https%3A%2F%2Fcohere-ai.ghost.io%2Fcontent%2Fimages%2F2024%2F05%2F329efd5-image.png&w=2048&q=75)
列举一下一个好的词嵌入应该具备的一些属性：
- 相似的单词应该对应于接近的点
- 不同的单词应该对应于较远的点

word embeding 有很多种表示方法，在前DL时代就有很多方法，在NN方法大热后也迎来来新一轮的研究热潮。

### Frequency based embedding
这类方法的基本出发点都是统计在指定文档范围下的不同单词的出现频率。以此作为单词的语义表示。
####  count vector

在这里输入要转换的内容假设有一个语料库C，其中有D个文档：{d1, d2, …, dD}，C中一共有N个word。这N个word构成了原始输入的dictionary，我们据此可以生成一个矩阵M，其规模是$D \times N$

![Pasted image 20240602220627.png](/images/collections/assets/Pasted%20image%2020240602220627.png)

- TF-IDF 
上面的count word的方法总体来说还是有点太机械，对不同文档的适用性不是很强。于是就有了基于文档词频的方法。

> 对于一个word，如果在特定文档出现的频率高，而在整个文档库里出現的频率低，那么这个word对当前文档的重要性就比较高。

因此可以引入逆文档频率IDF（Inverse Document Frequency）的概念：$IDF=\log(\frac{N}{n})$ 。其中，N代表文档库中文档的总数，n代表某个word在几个文档中出现过；当一个word出現地越频繁，那IDF就越小。

- tf (term frequency )：词频，计算该词语在文章所出现的次数
$$
TF_{i,j} = \frac{n_{i,j}}{\sum^k n_{k,j}}
$$

- idf ( inverse document frequency )：逆文档词频，出现的次数与文档数目比值的对数，用来衡量该字词的重要性
$$

```text
IDF_i=\lg \frac{|D|}{|\{j:t_i \in d_j\}|}
```

$$
那么有：
$$
TFIDF{i,j} = TF_{i,j} \times IDF_i
$$

举个例子，下面有三句话：
- He is Walter.
- He is William.
- He isn’t Peter or September.
就以 he、 is、 or为例。He出现了三次，is出现了两次，or只出现了一次。
计算TF
- [0.33, 0.33, 0.33]
- [0.33 0.33 0.33]
- [0.20 0.20 0.20 0.20 0.20]
IDF:
- He: $log\frac{3}{3}=0$
- is: $\log \frac{3}{2}=0.17$
- or: $\log \frac{3}{1}=0.471$
所以每句话的embeding就有：
- [1. , 1.1761 , 1.4771 , 0. , 0. , 0. , 0. , 0.],
- [1. , 1.1761 , 0. , 1.4771 , 0. , 0. , 0. , 0.],
- [1. , 0. , 0. , 0. , 1.4771 , 1.4771, 1.4771 , 1.4771],
需要说明一点的是，He的IDF 值是0，or在第一句里面没出现也该是0，这里区分就是最常见的设置为1.
ref：
- https://medium.com/ml-note/word-embedding-3ca60663999d
- https://towardsdatascience.com/word-embedding-techniques-word2vec-and-tf-idf-explained-c5d02e34d08

### word2vec

Word2Vec是一种用于自然语言处理的算法，它能够将单词转换成数值型向量，使得语义上相似的单词在向量空间中距离更近。Word2Vec由Google的Tomas Mikolov等人在2013年提出，主要有两种模型架构：连续词袋（CBOW）和跳跃式（Skip-Gram）模型。
- 连续词袋（CBOW）模型：该模型的目标是根据上下文单词来预测目标单词。给定一个目标词，CBOW模型会考虑目标词周围的几个词作为上下文，并尝试预测目标词。
- 跳跃式（Skip-Gram）模型：与CBOW相反，Skip-Gram模型的目标是使用目标词来预测上下文单词。给定一个目标词，模型会尝试预测它周围的几个词。
Word2Vec的训练过程涉及以下步骤：
1. 初始化一个词汇表，并将每个单词映射到一个向量。
2. 通过训练数据集，利用梯度下降等优化算法调整向量，使得模型的预测尽可能准确。
3. 在训练过程中，模型学习到的单词向量能够捕捉到单词之间的语义和语法关系。
Word2Vec的优点包括：
- 能够生成高质量的单词向量表示，这些向量可以用于各种下游任务，如文本分类、情感分析、机器翻译等。
- 训练速度快，可以处理大规模数据集。
- 模型简单，易于实现和理解。
Word2Vec的缺点可能包括：
- 向量空间的维度需要预先设定，且找到最优维度可能需要一些实验。
- 模型可能无法捕捉到所有类型的语义关系，特别是一些复杂的、依赖上下文的语义。


词的表示中如果蕴含了上下文信息，那么将会更加接近自然语言的本质；并且，由于相似的词有相似的表示方法，甚至可以进行一些运算，例如：<strong>人类-男人=女人</strong>。但是，上述讨论中，有一个很大的缺陷，那就是词的向量表示维度过大，一个词要用大量其余的词来表示，为后续运算带来了很大的麻烦。因此，我们需要找到一种更好的表示方法，这种方法需要满足如下两点要求：

- <strong>携带上下文信息</strong>
- <strong>词的表示是稠密的</strong>

事实证明，通过神经网络来进行建模，可以满足这两点要求。主流的建模方法又有两种：<strong>CBOW</strong>和<strong>Skip – Gram</strong>，下面分别介绍其思想。

### 2.2.1 CBOW（continues bag of words）

<strong>CBOW</strong>的全称是<strong>continuous bag of words</strong>。其本质是通过<strong>context</strong>来预测<strong>word</strong>。  

![](//upload-images.jianshu.io/upload_images/1635417-2c8fb2b4b8c1e003.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/286/format/webp)

CBOW语料库

  
如上图所示，首先语料库内的每个<strong>word</strong>都可以用<strong>one-hot</strong>的方式编码。假设选取<strong>Context Window</strong>为<strong>2</strong>，那么模型中的一对<strong>input</strong>和<strong>target</strong>就是：

- <strong>input</strong>：<strong>He</strong>和<strong>is</strong>的<strong>one-hot</strong>编码
- <strong>target</strong>：<strong>a</strong>的<strong>one-hot</strong>编码

接着通过一个浅层神经网络来拟合该结果，如下图所示：

![](//upload-images.jianshu.io/upload_images/1635417-fa622b7f024a39d3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/700/format/webp)

CBOW.png

过程简单介绍如下（实际算法会用到哈夫曼编码等降维技巧，这里仅以理解为目的简介基本原理）：

1. 输入为<strong>C</strong>个<strong>V</strong>维的<strong>vector</strong>。其中<strong>C</strong>为上下文窗口的大小，<strong>V</strong>为原始编码空间的规模。例如，示例中的<strong>C=2</strong>，<strong>V=4</strong>.两个<strong>vector</strong>分别为<strong>4</strong>维的<strong>He</strong>和<strong>is</strong>的<strong>one-hot</strong>编码形式；
2. 激活函数相当简单，在输入层和隐藏层之间，每个<strong>input vector</strong>分别乘以一个<strong>VxN</strong>维度的矩阵，得到后的向量各个维度做平均，得到隐藏层的权重。隐藏层乘以一个<strong>NxV</strong>维度的矩阵，得到<strong>output layer</strong>的权重；
3. 隐藏层的维度设置为理想中压缩后的词向量维度。示例中假设我们想把原始的<strong>4</strong>维的原始<strong>one-hot</strong>编码维度压缩到<strong>2</strong>维，那么<strong>N=2</strong>；
4. 输出层是一个<strong>softmax</strong>层，用于组合输出概率。所谓的<strong>损失函数</strong>，就是这个<strong>output</strong>和<strong>target</strong>之间的的差（<strong>output</strong>的<strong>V</strong>维向量和<strong>input vector</strong>的<strong>one-hot</strong>编码向量的差），该神经网络的目的就是最小化这个<strong>loss</strong>；
5. 优化结束后，隐藏层的<strong>N</strong>维向量就可以作为<strong>Word-Embedding</strong>的结果。

如此一来，便得到了既携带上下文信息，又经过压缩的稠密词向量。

  
  
作者：泰克尼客  
链接：https://www.jianshu.com/p/2a76b7d3126b  
來源：简书  
简书著作权归作者所有，任何形式的转载都请联系作者获得授权并注明出处。
  
### bert embeding
上面介绍的编码方式可以认为是一种静态编码方式，也就是说一旦训练完成，每个词对应的embeding向量就是固定的了，在处理语义随着上下文发生变化的情况，静态编码就无能为力了。比如 苹果和香蕉、苹果和谷歌。在不同的上下文语境下苹果代表了完全不同的语义信息。

## sentence embeding

![](https://dagshub.com/blog/content/images/size/w1600/2024/03/Screenshot-2024-03-08-at-3.58.29-PM.png)

![](https://dagshub.com/blog/content/images/size/w1600/2024/03/Screenshot-2024-03-08-at-3.59.01-PM.png)

https://dagshub.com/blog/how-to-train-a-custom-llm-embedding-model/
## image Embeding

## rerank


https://www.pinecone.io/learn/series/rag/rerankers/