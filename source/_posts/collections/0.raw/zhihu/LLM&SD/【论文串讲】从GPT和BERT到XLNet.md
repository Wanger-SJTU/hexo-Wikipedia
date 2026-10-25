---
title: 【论文串讲】从GPT和BERT到XLNet
date: "2022-04-05 00:00:00"
updated: "2022-04-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【论文串讲】从GPT和BERT到XLNet/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/182377100
---


文字长度: ★★★★☆

阅读难度: ★★★☆☆

原创程度: ★★★★★

本文是本专栏即将发表的文本预训练系列里面的一个章节，主要讲了XLNet的思路和具体实现细节，之所以叫XLNet是因为它以Transformer-XL为基础。XLNet是一种广义的自回归预训练模型，它提出了Permuted Language Model的思路，将BERT和GPT的各自优点结合在一起。为了解决实现一个细节上的问题，它还创新地提出了“双流自注意力机制”。那么具体是怎么展开的，就来一起看看吧。

论文链接: [XLNet: Generalized Autoregressive Pretraining for Language Understanding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1906.08237)

<strong>在开头先列出本文中涉及到的名词缩写:</strong>

- <strong>LM</strong>: Language Model，语言模型
- <strong>AR</strong>: Auto-Regressive，自回归
- <strong>AE</strong>: Auto-Encoding，自编码
- <strong>MLM</strong>: Masked Language Model
- <strong>PLM</strong>: Permuted Language Model
- <strong>NLU</strong>: Natural Language Understanding
- <strong>NLG</strong>: Natural Language Generation

### <strong>1. GPT</strong>

- <strong>关键词:</strong>单向信息，NLU的pretrain-finetune差异
优化目标是单向(从左到右或者从右到左)建模序列的联合概率，是传统意义上的语言模型，后预测的词以先预测的词为条件，比较适合文本生成任务，但是缺陷是只使用了单向的语言表征信息，无法获取双向上下文信息表征，而文本理解任务中经常需要用到双向的上下文信息(比如，完形填空)，因此，这就带来了pre-train阶段和下游任务的不一致。

$$p(x_{1:T})=\prod_{t=1}^{T}p(x_{t}|x_{0:t-1})$$

### <strong>2. BERT</strong>

- <strong>关键词:</strong>双向信息，独立性假设，NLG的pretrain-finetune差异
将一段序列部分“损坏”，优化目标是部分损坏的序列恢复到原始序列的独立概率之积。其优点是获取了双向上下文信息表征，缺点之一是引入了“<strong>独立性假设</strong>”，也即每一个被mask的token都是独立被重建的；缺点之二是预训练阶段的[MASK] token在下游任务的finetune中并没有出现过，这也会造成pretrain阶段和下游生成类任务的不一致。

$$p(x_{1:T})\approx\prod_{t=1}^{T}p(x_{t}|\tilde{x})^{m_{t}}$$

- 如果当前token被mask，则m_{t}=1否则m_{t}=0
- \tilde{x}为部分损坏的序列

### <strong>3. XLNet (AR + MLM -> PLM)</strong>

GPT和BERT的对比如下图所示

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_50533ef5d23e.jpg)

<strong>我们的核心的关注点是: 如何取两者之长，避两者之短</strong>。首先要提到的就是XLNet这篇工作：XLNet是一种广义的Auto-Regressive模型，它可以看作将序列的联合概率分布按照打乱的顺序重新因式分解，其将LM的<strong>顺序拆解推广到随机拆解</strong>，token之间的自回归关系不再是基于在<strong>天然序列</strong>中的前后顺序，而是基于<strong>打乱后的序列</strong>中的前后顺序。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_aac24511701d.jpg)

LM顺序拆解(左)和乱序拆解(右)

- 顺序拆解(左): P(T_1T_2T_3)=P(T_3|T_1T_2)P(T_2|T_1)P(T_1)
- 乱序拆解(右): P(T_1T_2T_3)=P(T_2|T_1T_3)P(T_1|T_3)P(T_3) ，( T_3  \rightarrow T_1 \rightarrow T_2 )
正是因为这种“打乱”(permutation)的机制，模型既可以保留AR的优点，规避AE的缺点(独立性假设；引入[MASK])，又可以保留AE的优点: 使得每个位置的token可以获取到双边的信息(因为序列被打乱了)。这样的建模方法，也叫做<strong>Permuted Language Model</strong>(PLM)。

#### 3.1 通过attention去实现Permutation

在具体的实现上，我们并不需要真正地去打乱序列的顺序，只需记住Transformer框架下的序列中token的位置和它对应的position encoding<strong>唯一绑定</strong>(请参考[潘小小：【经典精读】Transformer模型深度解读](https://zhuanlan.zhihu.com/p/104393915) positional encoding那一节的内容)。所以，只需要设计合适的attention mask就可以实现对因式分解顺序的打乱。

论文里有这么一段，解释了具体是如何去实现"Permutation"的

<strong>we keep the original sequence order</strong>, use the <strong>positional encodings</strong> corresponding to the original sequence, and rely on a <strong>proper attention mask</strong> in Transformers to achieve permutation of the factorization order.

- 举例来详细解释一下，如下的3张图分别对应了不同的permutation，前2张图是同样目标序列输出对应的不同permutation顺序的输入，第3张图(从右向左)和前两张(从左向右)的目标序列不同(注意第3张图的解码实际顺序是it-read-to-like-，不是图中画的从下到上的顺序)。同理我们也可以得出"like-to-read-it-I"->"I-like-to-read-it"等permutation的mask。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_842d161ba004.jpg)

decoder 输入 I-like-to-read-it, target输出 I-like-to-read-it![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d9e20cd7ef43.jpg)

decoder 输入 it-read-to-like-I, target输出I-like-to-read![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f8f70d91fb3b.jpg)

decoder 输入 it-read-to-like-I, target输出it-read-to-like-I

- 作者也提供了一张图来解释这个机制：下图都是同一序列不同因式分解顺序，在解码 x_3 时的示意图。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_80fac6e31f0f.jpg)

<strong>XLNet的优化目标函数</strong>

$\max _{\theta} \quad \mathbb{E}_{\mathbf{z} \sim \mathcal{Z}_{T}}\left[\sum_{t=1}^{T} \log p_{\theta}\left(x_{z_{t}} \mid \mathbf{x}_{\mathbf{z}_{$

- sequence \bold{x} 的长度为 T 
$- 所有permutation的集合是 \mathcal{Z}_{T} $

#### 3.2. Target-aware Representations

<strong>【问题】</strong>预测乱序中第t个token时，模型并不知道乱序中第t个对应的是原序列中的第几个。

$- 回顾一下XLNet的优化目标函数中的 p_{\theta}\left(X_{z_{t}}=x \mid \mathbf{x}_{z_{ ，这个部分描述的是在解码permutated sequence中第t个位置的token时的概率$
$p_{\theta}\left(X_{z_{t}}=x \mid \mathbf{x}_{z_{ ，其中 h_{\theta}\left(\mathbf{x}_{\mathbf{z} 代表 \mathbf{x}_{\mathbf{z} 经过<strong>按照permutation进行mask</strong>（上一节有讲怎么mask）之后的Transformer输出的hidden representation。$

$- 我们注意到h_{\theta}\left(\mathbf{x}_{\mathbf{z}和 X_{z_{t}} 的位置(也就是 z_{t} )没有关系。不管 z_{t} 是1到T中(总长度为T)的哪个，h_{\theta}\left(\mathbf{x}_{\mathbf{z}都完全一样。$
<strong>【解决方法】Target-aware Representations</strong>

既然模型不知道将要预测的token在原序列中的位置，那么我可不可以告诉它呢？答案是可以的，这就是Target-aware Representations。具体的做法就是在预测X_{z_{t}}的时候同时将z_{t} 作为输入传递给模型。

$那么这时候的 p_{\theta}\left(X_{z_{t}}=x \mid \mathbf{x}_{z_{ 就变成了$

$$p_{\theta}\left(X_{z_{t}}=x \mid \mathbf{x}_{z_{ $$

$- 其中 g_{\theta}\left(\mathbf{x}_{\mathbf{z}_{ 在h_{\theta}\left(\mathbf{x}_{\mathbf{z}的基础上，加上了关于position z_{t}的信息$

#### 3.3. 双流自注意力机制(Two-stream Self-attention)

**该机制的提出是为了实现上文所述的Target-aware Representations g_{\theta}\left(\mathbf{x}_{\mathbf{z}_{ 在考虑到使用上述Target-aware Representations来整个序列的解码过程时，发现了互相矛盾的两点:

$- 预测X_{z_{t}}时，g_{\theta}\left(\mathbf{x}_{\mathbf{z}_{应该只使用position z_{t}，而不该包含content x_{z_{t}} $
$- 预测t)">X_{z_{j}}(j>t)时，g_{\theta}\left(\mathbf{x}_{\mathbf{z}_{应该同时使用position z_{t}和content x_{z_{t}}$
作者的解决思路是提出一种“双流机制”，也就是

$- Query Representation:** g_{\theta}\left(\mathbf{x}_{\mathbf{z}_{ ，只看得到之前的token+position，当前的position，但是看不到当前的token$
$- <strong>Content Representation:</strong> h_{\theta}\left(\mathbf{x}_{\mathbf{z} ，可以看到之前的token+position，当前的token+position$
Query Representations和Content Representations的更新过程如下：

<strong>示意图</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_533002a65be2.jpg)

<strong>初始化</strong>

- Query Stream初始化为随机初始化： g_{i}^{(0)}=w 
- Content Stream初始化即相应的Word Embedding： h_{i}^{(0)}=e\left(x_{i}\right) 
<strong>更新的公式</strong>

- 如果self-attention有M层，对第m层
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b89985d8516b.jpg)

- 在finetune的时候，因为没有了permutation，也就不需要模型去预测z_{t}，因此此时只需要使用content stream就可以了。

#### 3.4. 部分打乱

一个长度为 T 的序列有 T! 种permutation，这会导致训练过程中收敛非常的慢，于是我们采取折中的做法：只对序列的末尾几个token进行打乱，而对前面的部分保留原序列顺序。

$c} \mid \mathbf{x}_{\mathbf{z}_{\leq c}}\right)\right]=\mathbb{E}_{\mathbf{z} \sim \mathcal{Z}_{T}}\left[\sum_{t=c+1}^{|\mathbf{z}|} \log p_{\theta}\left(x_{z_{t}} \mid \mathbf{x}_{\mathbf{z}_{\max _{\theta} \quad \mathbb{E}_{\mathbf{z} \sim \mathcal{Z}_{T}}\left[\log p_{\theta}\left(\mathbf{x}_{\mathbf{z}>c} \mid \mathbf{x}_{\mathbf{z}_{\leq c}}\right)\right]=\mathbb{E}_{\mathbf{z} \sim \mathcal{Z}_{T}}\left[\sum_{t=c+1}^{|\mathbf{z}|} \log p_{\theta}\left(x_{z_{t}} \mid \mathbf{x}_{\mathbf{z}_{ $

### 4. 总结

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6792fd641405.jpg)

GPT和BERT各自有其适用的场景: GPT适用于NLG任务，而BERT适用于NLU任务。XLNet试图使得一个预训练模型同时具备NLG和NLU的能力，于是它提出了Permuted Language Model的建模方法，迂回地解决了Auto-Regressive模型中缺乏双边信息的问题，使得模型在具有Auto-Regressive的建模能力的基础之上，还学到了bidirectional context。
