---
title: "LLM：旋转位置编码（RoPE）的通俗理解"
date: "2024-12-03 00:00:00"
updated: "2024-12-03 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/LLM-旋转位置编码(RoPE)的通俗理解/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/690610231"
---


ChatGLM 和 LLaMA 中使用的<strong>旋转位置编码（RoPE）</strong>，原版论文中大段大段的公式推导实在是太绕了，看了脑壳疼。这篇文章我用能理解能记住的方式梳理一下。

我个人觉得关于 RoPE 的核心问题有两个，首先，为什么 LLM 普遍采用这种编码方式而不是其他的，其次，工程上的实现方式和论文公式是否严格一致。如果静下心来读一读，这两个问题都能解答。

【省流版直接看2.2小节】

原本论文：[RoFormer: Enhanced Transformer with Rotary Position Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2104.09864v4)
HuggingFace实现：[RoFormer](https://link.zhihu.com/?target=https%3A//huggingface.co/docs/transformers/model_doc/roformer)
### 1. 溯源“位置编码”

#### 1.1 什么是位置编码（Position Encoding）

预训练语言模型对序列位置的表示，分为两种。第一种是 Bert 使用的 Position Embedding<strong>，这是对位置信息的嵌入表示，将一切参数化，交给模型自动学习。第二种是 Transformer 使用的</strong>Position Encoding**，即通常所说的“位置编码”。对于序列下标为 k 的 token，在语义向量 x_k 上叠加一个波长为 \frac{2\pi}{k} 正余弦波。k 越大，波长越短，频率越高。具体一点，即在各个维度 t\in[1, \frac{d}{2}] ，分奇偶地加上一个正弦值 \text{sin}(k\theta_t) 或余弦值 \text{cos}(k\theta_t) 。写成公式如下：

$偶数位 ： x_{k,2t}=x_{k,2t}+\text{sin}(k\theta_t) \\ 奇数位 ： x_{k,2t+1}=x_{k,2t+1}+\text{cos}(k\theta_t) \\$

 $$其中 \theta_t=10000^{\frac{-2t}{d}}\in[10000^{\frac{-2}{d}},10000^{-1}]，当维度 d取值较大时，对应的取值范围大概是 [1, 0]。$$

#### 1.2 位置编码（Position Encoding）的优势

由于位置向量是通过三角函数直接计算得到，Position Encoding 相比于 Position Embedding，<strong>不需要额外的模型参数</strong>，而且<strong>具备良好的长度外推性</strong>。想要什么长度位置，就代入公式就能算出来，帮助 LLM 们摆脱了序列长度限制。继承自这一派的位置编码方法，都有这些特点（包括 RoPE）。

#### 1.2 绝对位置编码 -> 相对位置编码

原版的 Position Encoding 是一种对“绝对位置”的建模。它作用于 embedding 层，直接加在词向量 x 上。在这一层，模型的语义信息还没有开始做交互，无法引入“相对位置”信息。因此，后续的衍生版本将 Position Encoding 移动到了 self-attention 的 q^\textsf{T}k 中（*这里也是唯一能够获取到“相对位置”的地方*）。这样一来，Position Encoding 从原本的“<strong>只在embedding 层计算一次</strong>”，变为“<strong>每个 attention 层计算一次</strong>”。

### 2. 旋转位置编码

#### 2.1 相对位置编码的一般原理

普通的检索过程 q^\textsf{T}k 是位置无关的。要在其中引入相对距离，即对于位置为 m 的 q_m 和位置为 n 的 k_n ， q_m^\textsf{T}k_n 需要和 m-n 获得关联。沿用传统方式，在 q 和 k 上加入位置向量，可以获得如下多项式展开（省略权重矩阵）：

```text
q_m=x_m+p_m,k_n=x_n+p_n \\ q_m^\textsf{T}k_n=x_m^\textsf{T}x_n+x_m^\textsf{T}p_n+p_m^\textsf{T}x_n+p_m^\textsf{T}p_n \\接下来，使用相对位置向量 p_{m-n} 去替换 p_n ,并将 p_m 退化为位置无关的模型参数矩阵。各个相对位置编码算法采用的形式不尽相同，举一个极简的例子做参考：

q_m^\textsf{T}k_n=x_m^\textsf{T}x_n+x_m^\textsf{T}p_{m-n}+p_{m-n}^\textsf{T}x_n \\
```


#### 2.2 旋转位置编码（RoPE）的首要特征

在前述的相对位置编码方案，虽然在理论上是通过“语义向量和位置向量相加（<strong>加性</strong>）”来实现的，但实际计算中是“用「 q^\textsf{T}k 的调整 」代替「 q 和 k 的调整」”，导致 self-attention 的过程也被更改。

相反地，旋转位置编码改用了<strong>“</strong>语义向量和位置向量相乘（<strong>乘性</strong>）<strong>”</strong>，直接进行「 q 和 k 的调整」，保持 self-attention 的过程不变，融和地非常丝滑。<strong>这是 RoPE 和传统方法的最大区别</strong>。

#### 2.3 具体计算流程

原版论文中有大段的公式推导，并且套了一个“复变函数”的壳，特别费脑子。这里直接介绍一下实操做法，其实还是挺容易懂的。

<strong>a. 语义向量复数化</strong>

$对于语义向量（也就是 q 和 k ） x=[x_1,x_2,...,x_d] ，相邻维度一组，转换成复数形式。即，奇数维度为实部，偶数维度为虚部。对应的通项公式为 x_i^a=(x_{2i-1},x_{2i}),i\in[1,d/2]，整体记为：$

x^a=[x_1+ix_2,x_3+ix_4,...,x_{d-1}+ix_{d}] \\此处的 x_1+ix_2 为复数写法，相当于 (x1,x2) 。

<strong>维度可以进行任意位置的两两组合时，不需要严格执行奇偶交替。简便做法是取前半部分全部为实部分，后半部分全部为虚部。b. 计算各维度的基准旋角</strong>

$$和原版 Position Encoding 保持一致，取 \theta_i=10000^{\frac{-2i}{d}},i\in[1,d/2]，得到：$$

$\theta=[\theta_1,\theta_2,...,\theta_{d/2}] \\<strong>c. 对语义向量根据绝对位置进行旋转</strong>$

$对于绝对位置为 m 的语义向量 x_m ，按照 m\theta 进行旋转。即 x_i^b=(x_{2i-1},x_{2i})e^{im\theta} 。$

这里插入一个复变函数小知识。每个复数，都可以在表示成一个横轴为实部、纵轴也虚部的二维平面向量。对复数乘以 e^{i\theta} ，相当于把该向量逆时针旋转角度 \theta 。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_989fe8b847e0.jpg)

这就是“旋转位置编码”这个名字的由来。

<strong>d. 复用原始 self-attention 流程</strong>

将旋转后的 q_m 和 k_n 代入原始的self-attention就算流程。此时，交互过程变为：

$q_m^\textsf{T}k_n=(x_me^{im\theta})^\textsf{T}x_ne^{in\theta}=(e^{im\theta}x_m)^\textsf{T}e^{in\theta}x_n=x_m^{\textsf{T}}e^{-im\theta}e^{in\theta}x_n=x_m^{\textsf{T}}e^{i(n-m)\theta}x_n \\ 可以看到， q_m^\textsf{T}k_n 只和相对位置 n-m 有关，和绝对位置 m 与 n 无关。当 m 和 n 相距越大， e^{i(n-m)\theta} 的实部越小，满足相对位置表征对距离的衰减性要求。$

### 3. RoPE的快速计算方法

#### 3.1 "旋转"的矩阵解法

如果去看 huggingface的 LLama 源码 [ [modeling_llama.py](https://link.zhihu.com/?target=https%3A//github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py) ]，你会发现"旋转"这个部分似乎不是按上面的流程在执行，有点难看懂。这里涉及到 RoPE 的快速矩阵算法，主要是对 x_i^b=(x_{2i-1},x_{2i})e^{im\theta} 进行改造。这在原始论文中也有提到。

根据复变函数的理论，任意一个复数 (x_{2i-1},x_{2i}) ，都对应着二维的一个角（\angle A），对应关系为：

$\text{cos}A = x_{2i-1},\text{sin}A=x_{2i} \\ 当对 (x_{2i-1},x_{2i}) 沿逆时针旋转 m\theta （ \angle B ），就变成了 \angle C=\angle A+\angle B。根据初中时候的三角函数“和角”公式：$

$\text{cos}(C)=\text{cos}A\text{cos}B-\text{sin}A\text{sin}B=x_{2i-1}\text{cos}m\theta-x_{2i}\text{sin}m\theta \\ \text{sin}(C)=\text{sin}A\text{cos}B+\text{cos}A\text{sin}B=x_{2i}\text{cos}m\theta+x_{2i-1}\text{sin}m\theta \\ 也可以按论文中那样，写成矩阵乘法的形式：$

$\begin{bmatrix} \text{cos}m\theta,-\text{sin}m\theta \\ \text{sin}m\theta,\text{cos}m\theta \\ \end{bmatrix}  \begin{bmatrix} x_{2i-1} \\ x_{2i} \end{bmatrix} $

这样一来，“旋转”的规程就变为，先构造旋角矩阵，再和复数矩阵相乘。

#### 3.2 HuggingFace的LLama实现

在实际的代码中，语义向量是 [batch_size, seq_length, head_num, head_dim] 四维的，我们只关注最后一维即可。

```python
def rotate_half(x):
    x1 = x[..., : x.shape[-1] // 2] # 实部, 对应x_2i-1
    x2 = x[..., x.shape[-1] // 2 :] # 虚部, 对应x_2i
    return torch.cat((-x2, x1), dim=-1)
```


首先，使用 rotate_half() 进行语义向量复数化。将前半部分划为实部，后办部分划为虚部。这里的负号，对应和角公式中的负号。计算旋角 m\theta 的过程此处省略。

```python
def apply_rotary_pos_emb(q, k, cos, sin, position_ids=None, unsqueeze_dim=1):
    cos = cos.unsqueeze(unsqueeze_dim)
    sin = sin.unsqueeze(unsqueeze_dim)
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed
```


将 rotate_half() 代入到 apply_rotary_pos_emb()，以 q=[x_1,x_2] 为例：

`q_embed = [x1, x2] * cos + [-x2, x1] * sin = [x1 * cos - x2 * sin, x2 * cos + x1 * sin]`

和3.1小节中的推导完全一致。self-attention的流程无需改动，用 q_embed 替换 q，用 k_embed 替换 k，即可。