---
title: "Understanding Transformer from the Perspective of Associative Memory 论文学习笔记"
date: "2026-01-12 00:00:00"
updated: "2026-01-12 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/Understanding-Transformer-from-the-Perspective-of-Associative-Memory-论文学习笔记/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1986946791497819070"
---


这篇文章是近期读过比较有趣的一篇，它主要是从联想记忆的角度对于当前 Transformer 结构做了一个解读。其中将 context 视为一种动态的记忆，然后将模型的参数视为一种静态的记忆并不是一种很新颖的观点。它的独特的看法在于，通过核函数的方式将模型的表达式重构，然后提出了 Associate Matrix 以及 Memory Update 的角度。

（由于个人部分相关内容背景知识比较薄弱，因此可能一些对于我来说比较新的东西在相关领域已经是共识了，欢迎大佬指正批评）

这里首先对于其中的一些概念进行梳理

### 基础概念

#### Associate Matrix

联想矩阵这个概念是从心理学中借鉴并数学化的一个概念，其心理学背景就是指信息加工的过程是由”通过建立知识单元间的联系实现信息存储与提取“。 那么这个最简单的表示方式就是 o=Sq" role="presentation">o=Sqo = Sq ，即直接用一个线性矩阵 S" role="presentation">SS 去存储记忆，然后获取记忆的结果就是他俩一个操作的结果。

然后在这篇文章当中，作者通过使用<strong>核函数</strong> κ(⋅,⋅)" role="presentation">κ(⋅,⋅)\kappa(\cdot ,\cdot) 将整个 Transformer 里面的 FFN 和 Attention 部分都写成了 o=Sϕ(q)" role="presentation">o=Sϕ(q)o = S\phi(q) 的形式，其中 ϕ" role="presentation">ϕ\phi 是核函数 κ" role="presentation">κ\kappa 对应的特征映射, 其对应的原始核， S" role="presentation">SS 中也包含着核函数最后二者可以合并消掉还原成一些我们更熟悉的方式，然后 q" role="presentation">qq 呢就是当前的 token 的表征。然后具体怎么处理的我们后文再展开。

#### 记忆容量

这里是用来评估一个联想矩阵可以存储多少信息，这里作者的创新之处是通过评估信噪比 SNR 来看到底能够存储多少信息。

#### 记忆更新

其实就是这里的 S" role="presentation">SS 的迭代规则，怎么从 St−1" role="presentation">St−1S_{t-1} 更新到 St" role="presentation">StS_t ，这一部分主要是针对 Attention 来处理的。

### 从 Transformer 到 Associate Matrix

现在让我们来一下作者是怎么将 FFN 和 Attention 这两个部分全都写成 o=Sϕ(q)" role="presentation">o=Sϕ(q)o = S\phi(q) 的形式的，并且这两者具体长什么样子。

#### Attention 部分

$首先我们将整个 Attention 的计算公式写开，这里我们先忽略底下的归一化项，并且将 ϕ" role="presentation">ϕ\phi 通过拆开这里的分子得到，即 exp(ki⊤qt/dk)=ϕ(ki)⊤ϕ(qt)" role="presentation">exp(ki⊤qt/dk)=ϕ(ki)⊤ϕ(qt)exp(k_i^\top q_t/\sqrt d_k)=\phi(k_i)^\top \phi(q_t) 。$

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_25f4549cb043.jpg)

attention 展开的表达式，注意这里的推导无视了分母的归一化项然后这样就有

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3cf767b2a41f.jpg)

从这个式子从，我们可以注意到 S 实际上就是 \sum_i v_i\phi(k_i)^\top 的形式，也就是可以在一个或许有限或许无穷维（因为 \phi 可能映射到无穷维）里的多个秩为1 的矩阵之和。

#### FFN

那么一个自然的问题是，对于 FFN  来说我们能不能写出来一个类似的表达式，最好长的越像越好。那么作者顺着这条道出发，对于最基础的 MLP，即 y = W_{down}ReLU(W_{up}x) 来说，我们首先将上面的 kv 的符号想办法带入进去，就可以获得 y = W_v^\top ReLU(W_k x) 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cbd662c78a11.jpg)

 $然后注意到这里的非线性函数 ReLU 实际上也能拆成两个特征映射，那么实际上就有 S = \sum_i W^\top_{V_i}\phi(W_{K_i}) ,然后实际上也是\sum_i v_i\phi(k_i)^\top的形式。$

（除此之外，作者实际上还对 moe 和 glu 的形式进行了探讨，但是我个人认为在那些形式下这里的这个 S 实际上就变成和当前的输入 q 有关了，这篇论文的各种分析对那种形式也不太适用，就没有必要展开了。）

### 记忆容量和记忆更新

按照作者的视角，Transformer 里面的两大核心模块已经都可以写成\sum_i v_i\phi(k_i)^\top的形式了。那么接下来我们就来分别介绍一下作者是如何在这个式子的基础上定义的记忆容量和更新规则。

#### 记忆容量

这里的记忆其实换句话说就是信息抽取的能力，而这个在这里的 qkv 的语境下实际上就是当我的 q 和某个 k 一样的时候，能不能把它对应的那个 v 尽可能地还原回来的能力。在这个视角下，作者考虑到 q=k 的情况，那么这个时候就可以做展开如下

$\begin{aligned} o = S\phi(k_i) &= v_i\phi(k_i)^\top \phi(k_i) + \sum_{i\neq j}v_j\phi(k_i)^\top\phi(k_j)\\ & = v_i\kappa(k_i, k_i) + \sum_{i\neq j}v_j\kappa(k_i,k_j) \\ \end{aligned}$

从这个式子中，我们可以看到，第一项的结果就是也就是完全取得了具体的 v_i 的方向信息记为 ，可以认为是<strong>信号</strong>，然后后面那一项就可以视为一个额外的<strong>噪声</strong>。此时，我们就可以定义出噪信比了，并且可以证明出其表达式如下。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_081c5e1b48ba.jpg)

作者证明出的噪信比的表达形式然后作者经过一通数学分析后，得到了以下几种核的 SNR^{-1} 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b1bb87187369.jpg)

核函数为 k^Tq 形式时的噪信比![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cf7eeaacc5ac.jpg)

核函数为exp(k^Tq)时候的噪信比![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1b33b647d08a.jpg)

核函数为ReLU(k^Tq)时候的噪信比不难看出，这里的 exp 的噪信比是指数形式的，而这个恰好就出现在 attention 的 softmax 里面，因此可以论证为什么这里哪怕每一个 head 的维度都那么低就可以有那么强的表达能力，而且哪怕将多头合一也不会有太大的提升，因为这里指数级已经容量非常大了，这一点在作者后面的试验中也有证实。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0d6a2fcd2bdd.jpg)

可以看到，图中的多头和单头（合在一起那种）的差距相对较小，表明每个头维度没有那么大效果就已经很好了
#### 记忆更新

在这个\sum_i v_i\phi(k_i)^\top的形式下，我们可以看到对于普通的 FFN 而言，这个是全程不会变的一个东西，与具体的 context 无关的。与之相对的，这里已经写成非常明显的 kv 的形式了，那么每一次加一个token都可以视为这里额外加了一个 kv 塞到这里 sum 形式的矩阵里面去，也就是写成 S_t = S_{t-1} + v_t\phi(k_t)^\top 

$$然后从这里出发可以推导出一个非常有趣的视角，就是这里这个迭代公式实际上可以对应一个loss。我们首先将后面那个部分视为一个梯度， \frac{\partial L_t}{\partial S_{t-1}} = -v_t\phi(k_t)^\top 。这里我们考虑最简单的形式，即 \phi(k_t) = k_t ，那么这个时候就可以有 ">L_t(S_{t-1}) = - 。$$

那么将上面那个更新公式推广开，我们就可以写成如下的形式，并得到在这种形式下的loss

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3494f3e1000f.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_85b9b9b421db.jpg)

然后这个时候就可以将之前的各种工作全都套到当前这个迭代的范式下

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_07d31f899328.jpg)

### 和 Delta rule 结合

写出来上面的那个 general 的形式后，作者就想我们能不能在之前的 softmax 的基础上加一下 delta rule，换句话说，就是结合一下deltanet和核函数，也就是下面这个形式

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5c863e7c1898.jpg)

然后经过一系列的推导后，可以得到如下的形式，其中 \kappa_1,\kappa_2 是两个可以自己选的函数，然后在特定的选择下可以完全退化回 deltanet。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_53d5fefaec92.jpg)

然后作者也从一些电路的角度出发，证明了这里提出的格式要比原始的表达能力更强一些

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_23302dc23ba5.jpg)

最后作者也在一个 toy model 上做了一些实验，证明了这里结合 delta rule 和 softmax attention 确实有一定的作用
