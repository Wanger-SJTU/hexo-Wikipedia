---
title: "线性注意力与稀疏注意力：Lightning Attention、NSA、InfLLM-v2、MiniCPM‑SALA"
date: 2026-04-22
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2028600546257301718
---

线性注意力和稀疏注意力都是非传统注意力，它们都是为了解决传统注意力计算耗时的问题。

本文将按照这些非传统注意力的发展脉络时间顺序依次介绍线性注意力Lightning Attention、DeepSeek的NSA稀疏注意力、面壁智能的INFLLM-V2和集大成者MiniCPM‑SALA。

Lightning Attention
v1论文：[TransNormerLLM: A Faster and Better Large Language Model with Improved TransNormer](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.14995)

v2论文：[Lightning Attention-2: A Free Lunch for Handling Unlimited Sequence Lengths in Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.04658)、[Various Lengths, Constant Speed: Efficient Language Modeling with Lightning Attention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.17381v1)

代码：[https://github.com/OpenNLPLab/lightning-attention](https://link.zhihu.com/?target=https%3A//github.com/OpenNLPLab/lightning-attention)

相关论文：[https://filecdn.minimax.chat/_Arxiv_MiniMax_01_Report.pdf](https://link.zhihu.com/?target=https%3A//filecdn.minimax.chat/_Arxiv_MiniMax_01_Report.pdf) （minimax-01是把线性注意力  scale up的工作，证明了线性注意力也满足scaling law）

本人所指的Lightning Attention默认是Lightning Attention-v2。我看Lightning Attention-v1里的“Algorithm 3 Lightning Attention Forward Pass”，感觉主要还是借鉴了flash attention的分块计算思想而已，里面的注意力还是Q跟K先相乘，应该还不能算线性注意力。而Lightning Attention-v2就包含了K跟V先相乘，但也包含了Q跟K先相乘，下面细说。

背景
众所周知，在传统的transformer注意力中，是Q和K先相乘，然后再和V相乘，一种kernel trick就是让K和V先相乘，然后再和Q相乘，两种计算方式输出的张量形状是一样。但因为QKV的张量形状不同，两种计算方式的计算量是不一样的，第一种的计算复杂度是 
![](https://www.zhihu.com/equation?tex=O%28n%5E2d%29) ，第二种的计算复杂度是 
![](https://www.zhihu.com/equation?tex=O%28nd%5E2%29) ，因为跟序列长度 
![](https://www.zhihu.com/equation?tex=n) 呈线性关系，所以也被叫做线性注意力。

你可能之前看到过有的文章说要在 
![](https://www.zhihu.com/equation?tex=Q) 和 
![](https://www.zhihu.com/equation?tex=K) 上面套上激活函数来代替softmax的非负性，还有，QK相乘之后还要除以分母 
![](https://www.zhihu.com/equation?tex=%5Csqrt%7Bd%7D) 以使得分布的标准差仍然是1左右，但是我看DeltaNet的作者Songlin Yang在[这里](https://www.zhihu.com/question/9740764576/answer/80735153803)说：

在[The Devil in Linear Transforme](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.10340)r 中证明了分母带来数值问题，所以在最近的linear attention中几乎全部去掉了，取而代之的是加上output normalization。另外，[Fine-Tuning Pre-trained Transformers into Decaying Fast Weights](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.04243)发现QK的activation啥也不设就good enough，后续的RetNet/GLA也不用激活函数，所以这两个term都省掉了。假设 
![](https://www.zhihu.com/equation?tex=K) 的形状是 
![](https://www.zhihu.com/equation?tex=%28n+%5Ctimes+d%29)，
![](https://www.zhihu.com/equation?tex=V) 的形状也是 
![](https://www.zhihu.com/equation?tex=%28n+%5Ctimes+d%29) ，那么 
![](https://www.zhihu.com/equation?tex=K%5ET+%5Ccdot+V) 的形状是 
![](https://www.zhihu.com/equation?tex=d+%5Ctimes+d) ，可以看到序列长度 
![](https://www.zhihu.com/equation?tex=n) 消去了，也就是说不管输入的序列长度是 1k 还是 100k，
![](https://www.zhihu.com/equation?tex=K%5ET+%5Ccdot+V) 永远是一个 
![](https://www.zhihu.com/equation?tex=d+%5Ctimes+d) 的固定大小矩阵。这个
![](https://www.zhihu.com/equation?tex=d+%5Ctimes+d) 的矩阵就像是模型里的一块小脑，它的脑容量/记忆就是固定这么大，不会随着输入序列的增长而增长。像传统注意力里的kv cache，每次新生成的token都会添加到kv cache里，那kv cache记的东西就越来越多。

我们定义 
![](https://www.zhihu.com/equation?tex=S+%3D+K%5ETV) ，叫S为状态矩阵，当预测完第t个token，我们就要更新这个状态矩阵，更新方法为：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_%7Bt%7D%3D%5Cgamma+%5Cmathbf%7BS%7D_%7Bt-1%7D%2B++%5Cmathbf%7Bk%7D_%7Bt%7D%5E%7B%5Ctop%7D+%5Cmathbf%7Bv%7D_%7Bt%7D+%5Cquad+%5Cin+%5Cmathbb%7BR%7D%5E%7Bd+%5Ctimes+d%7D) 

其中 
![](https://www.zhihu.com/equation?tex=+0+%3C+%5Cgamma+%3C1) 是decay系数，如果不把 
![](https://www.zhihu.com/equation?tex=%7BS%7D_%7Bt-1%7D) 乘以一个小于1的系数，那么随着不断累加， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_%7Bt%7D) 可能会大到爆炸。另外，因为 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 跟输入数据无关，所以叫data-independent decay。

许多论文就是在如何更新 
![](https://www.zhihu.com/equation?tex=S_t) 上下功夫。

然后在实现线性注意力的路上，还有一个问题，自回归训练时我们还要考虑加入casual mask后怎么办，这也是Lightning Attention要解决的一个问题。

**要解决什么问题**
线性注意力面临三个问题：1）效果较差，这个就不用多说了。 2.1）训练速度慢：GPU访存速度也是一个瓶颈，这个在Lightning Attention-1已经解决了。 2.2）训练速度慢：由于更新状态矩阵 
![](https://www.zhihu.com/equation?tex=S) 需要使用累积求和操作（cumsum），而这个操作在因果场景中使它无法并行训练。其实这个问题在《[Transformer Quality in Linear Time](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2202.10447)》这篇论文就已经被提出来了，而且那时候作者也已经提出了解决方案，我猜Lightning Attention-v2应该就是借鉴了里面的解决方案。

怎么解决问题
Lightning Attention为了解决上面的2.2问题，采用了“分而治之”的思想，简单来说，就是先将QKV各自分成一块块的，然后将注意力计算分为块内和块间，对于块内使用传统的注意力，对于块间使用线性注意力。这样的话原本要做 
![](https://www.zhihu.com/equation?tex=n) 次cumsum，现在只需要对块间进行累加求和，该操作次数降到了 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7Bn%7D%7BC%7D) ，C是chunk size，比如=256，那就是减少了256倍！此外，前向和后向过程都采用了平铺（tiling）技术，以充分利用 GPU 硬件的特性。整个算法过程如下所示：

![](https://picx.zhimg.com/v2-ec404d229974962a73956ef8cfe5598b_r.jpg)再配个文字版了解图中每个字母的含义：

![](https://pic1.zhimg.com/v2-f73a5090e1ce06f58735dd75825d2e9a_r.jpg)反向传播和它们的推导可见原论文。

DeepSeek的NSA
论文：[Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.11089)

背景
上面说的线性注意力是为了降低传统注意力的计算量，下面要说的稀疏注意力也是为了降低计算量。

稀疏注意力的稀疏指的是QK计算得到的attention map上非零数很稀疏，这是因为Q只选择跟部分K做注意力计算。那怎么选择这部分K就是各大稀疏注意力算法研究的地方。毕竟如果K选得不好，可能会丢失重要信息，导致模型变笨。

要解决什么问题
大多数稀疏注意力主要在推理过程中应用稀疏性，但是使用的仍然是预训练的完全注意力模型，这种训练-推理时的不一致限制了稀疏注意力最大程度发挥它的能力。实现稀疏注意力的训练，不仅可以让推理效果更好、推理速度更快，还可以让训练速度更快，因为现在大语言模型在后训练阶段一般会用长文本进行微调，这时候如果用上了稀疏注意力，就可以加快这种长序列的训练效率。所以我们要解决的一个问题是实现训练稀疏注意力。

尽管有些算法在注意力计算理论层面实现了稀疏性，但实际推理延迟并没有真正减少，这主要是因为：

1）之前的工作有的只在预填充阶段应用稀疏注意力，有的只在自回归解码阶段应用稀疏注意力

2）有些稀疏注意力无法与MQA和GQA兼容

3）没有进行硬件友好的算法设计，以减轻内存访问和硬件调度瓶颈

怎么解决问题
NSA，全称是Native Sparse Attention，名字里的原生意思就是说：NSA是使用带稀疏注意力的模型结构从零开始训练出来的，天生就适应稀疏注意力机制。

为了解决上面的问题，NSA从算法设计与核优化两方面入手。 

**算法设计**

在介绍 NSA 算法设计之前，我们先想一下我们的阅读习惯是怎样的：给你一本书，翻到某一页，让你介绍其中一个专有名词的概念，你会从第一页第一个字开始，逐字逐句认真读到最后吗？肯定不会，你的大脑大概率会这么做：

**1.略读：** 对大部分无关紧要的章节，你会快速阅读，只保留一个模糊的印象，知道这部分大概是在讲什么。
**2.精读：** 当略读时你突然看到与问题相关的关键词时，你会集中注意力，逐字逐句地分析这一段。
**3.当下：** 这个专有名词前面的上文大概率与这个问题有关，这部分你也需要仔细看。
1和2组合起来的目的就是为了找到与当前位置比较遥远的重要信息，对应attention map上非对角线附近的高分数位置，3的目的就是找到当前位置比较临近的重要信息，对应attention map上对角线附近的高分数位置。

同理，NSA 也是通过这3步来计算稀疏注意力，如下图所示：

![](https://pic1.zhimg.com/v2-9aa9db259a43877a20c85380a15802e6_r.jpg)NSA首先将 
![](https://www.zhihu.com/equation?tex=k_%7B%3At%7D%2C+v_%7B%3At%7D) 原始token序列分割成一个个block块，然后执行三条分支的稀疏注意力计算，最后汇总输出，具体来说：

**(1) Compression：粗看**

这一步NSA先使用MLP把每个block压缩成1个compressed token，而每个block里面其实是有多个（比如 
![](https://www.zhihu.com/equation?tex=l%3D32) ）token的，表示为 
![](https://www.zhihu.com/equation?tex=%5Cmathbb%7BR%7D%5E%7Bl+%5Ctimes+d%7D+%5Cxrightarrow%7B%5Ctext%7Bcompress%7D%7D+%5Cmathbb%7BR%7D%5E%7B1+%5Ctimes+d%7D) 。这里的MLP是可学习的，而且给block里的每个token都带上了位置编码，所以这里体现了NSA所说的原生可训练。

压缩得到每个block的compressed token之后，然后用Query去跟这些compressed token计算相似度，得到注意力分数，论文中也叫重要性分数。

此时模型一目十行，快速扫描全局，脑海中大概知道了哪些位置含有比较重要的信息。

对应论文里的Fig2，每8个蓝色小方块组成一个block，总共有4个block，压缩后得到了4个compressed token，对应图中蓝色深浅不一的矩形块，然后用橙色方块 
![](https://www.zhihu.com/equation?tex=q_t) 去跟compressed tokens计算，得到4个重要性分数，对应图中绿色深浅不一的的矩形块。

**(2) Selection：挑着看**

利用上面计算得到的重要性分数，NSA会选出 Top-K 个它认为最重要的block的索引，然后用这些索引去原始序列中找到对应block里的原始token。接着将这几个block里的原始token concat起来，去和
![](https://www.zhihu.com/equation?tex=q_t) 做attention。

压缩后的token是粗粒度的，原始token是细粒度的，NSA将两者相结合，实现了全局上下文感知和局部精度。从粗粒度到细粒度的检索策略，让模型能快速准确地定位到重要信息。

对应论文里的Fig2，NSA挑出Top-2个最重要的block索引：1和3，然后找到1号block和3号block，把它们里面的原始token concat起来，去和 
![](https://www.zhihu.com/equation?tex=q_t) 做attention。2号和4号block里的原始token则被忽略掉了。

**3)Sliding：盯着眼前看**

我们肯定不能舍近求远，光顾着找远处的重要信息，不用说也知道，当前位置 
![](https://www.zhihu.com/equation?tex=t) 前面的几百个（比如512）的token也是非常重要的信息。 这个窗口的截取的位置可以表示为 
![](https://www.zhihu.com/equation?tex=%5Ctilde%7BK%7D_%7Bt%7D%5E%7B%5Ctext+%7Bwin+%7D%7D%3D%5Cmathbf%7Bk%7D_%7Bt-w%3A+t%7D%2C+%5Ctilde%7BV%7D_%7Bt%7D%5E%7B%5Ctext+%7Bwin+%7D%7D%3D%5Cmathbf%7Bv%7D_%7Bt-w%3A+t%7D) 

因为随着next token prediction的进行，这个窗口会一步一步往前滑动，所以叫滑动窗口。

对应论文里的Fig2，NSA挑出了当前位置前面的6个原始token，去参与注意力计算。

**Gated Output**

上面三步会用 
![](https://www.zhihu.com/equation?tex=Q) 和稀疏的KV（ 
![](https://www.zhihu.com/equation?tex=%5Ctilde%7BK%7D_t%5E%5Cmathrm%7Bcmp%7D%2C%5Ctilde%7BV%7D_t%5E%5Cmathrm%7Bcmp%7D%3B%5Ctilde%7BK%7D_t%5E%5Cmathrm%7Bslc%7D%2C%5Ctilde%7BV%7D_t%5E%5Cmathrm%7Bslc%7D%3B%5Ctilde%7BK%7D_t%5E%5Cmathrm%7Bwin%7D%2C%5Ctilde%7BV%7D_t%5E%5Cmathrm%7Bwin%7D) ）去计算出
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bcmp%7D) 、 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bslc%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bwin%7D)，然后到了这一步，可以表示为 
![](https://www.zhihu.com/equation?tex=%5Cmathrm%7BOutput%7D%3Dg%5E%5Cmathrm%7Bcmp%7D%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bcmp%7D%2Bg%5E%5Cmathrm%7Bslc%7D%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bslc%7D%2Bg%5E%5Cmathrm%7Bwin%7D%5Cmathbf%7BO%7D%5E%5Cmathrm%7Bwin%7D) ，其中门控得分 
![](https://www.zhihu.com/equation?tex=g%5E%5Cmathrm%7Bcmp%7D) 、 
![](https://www.zhihu.com/equation?tex=g%5E%5Cmathrm%7Bslc%7D) 和 
![](https://www.zhihu.com/equation?tex=g%5E%5Cmathrm%7Bwin%7D) 是通过 MLP 和 sigmoid 激活从输入特征 Q 生成的，所以这一步也是可训练学习的。

**Kernel Design**

为了在训练和预填充期间实现 FlashAttention 级别的加速，NSA团队用 Triton 上实现了硬件对齐的稀疏注意力内核。鉴于 MHA 是内存密集型且解码效率低下，团队专注于具有共享 KV cache的 GQA 和 MQA。虽然第1个分支的压缩和第3个分支的滑动窗口的注意力计算很容易与现有的 FlashAttention-2 内核兼容，但NSA的第2个分支-选择机制，如果遵循 FlashAttention 将时间连续的Query块加载到 SRAM 中，则会导致内存访问效率低下，因为块内的Query可能需要不连续的 KV 块。为了解决这个问题，NSA的关键优化在于不同的Query分组策略：对于Query序列上的每个位置，我们将 GQA 组内的所有Query头（它们共享相同的稀疏 KV 块）加载到 SRAM 中。下面的图 3 说明了NSA的前向传播实现：

![](https://pic2.zhimg.com/v2-9f86e2becd8142d1176097279ab5f17f_r.jpg)
InfLLM-V2
论文：[InfLLM-V2: Dense-Sparse Switchable Attention for Seamless Short-to-Long Adaptation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2509.24663)

代码：[https://github.com/OpenBMB/infllmv2_cuda_impl](https://link.zhihu.com/?target=https%3A//github.com/OpenBMB/infllmv2_cuda_impl)

背景
InfLLM-V2就是为了改良NSA存在的一些问题。

要解决什么问题
面壁智能团队认为NSA 存在以下问题：

- 如果输入的是一个短序列，这时候如果还强制计算所有三个模块，就有点矫枉过正了，不仅效果可能变差，还引入了额外的计算开销，试想一下，此时三个分支检索到的KV可能是一样的，那就重复计算了。
- NSA的三个分支都会输出attention output，为此引入了三组KV projection（ 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BW%7D_%7BK%7D%5E%7B%5Cmathrm%7Bcmp%7D%7D%2C+%5Cmathbf%7BW%7D_%7BV%7D%5E%7B%5Cmathrm%7Bcmp%7D%7D%2C+%5Cmathbf%7BW%7D_%7BK%7D%5E%7B%5Cmathrm%7Bslc%7D%7D%2C+%5Cmathbf%7BW%7D_%7BV%7D%5E%7B%5Cmathrm%7Bslc%7D%7D%2C+%5Cmathbf%7BW%7D_%7BK%7D%5E%7B%5Cmathrm%7Bwin%7D%7D%2C+%5Cmathbf%7BW%7D_%7BV%7D%5E%7B%5Cmathrm%7Bwin%7D%7D) ）和gated output，迫使模型突然从单输出注意力切换到多输出注意力架构，这种不匹配会破坏训练的稳定性，消除模型已经学到的知识，而且还额外增加了计算量。计算三个attention output多此“两”举了。
- 引入了太多可训练参数，除了上面的KV projection和gated output里的MLP，还有压缩分支里的MLP，坏处跟上面一样，会破坏训练的稳定性，多此一举。
怎么解决问题
针对以上问题，面壁智能的InfLLM-V2是这么解决的，搭配着下图看：

![](https://pic1.zhimg.com/v2-4def83195d8259f5ceb00b0968d46632_r.jpg)NSA VS InfLLM-v21.先判断序列长度是长还是短，长的话就走稀疏注意力，短的话就走传统的密集注意力。见上图中的Switch。这样即使InfLLM-V2 在经过长文本微调后，依然可以在处理短序列时无损地切换回传统密集注意力模式，避免了任何性能衰退和额外计算开销。

2.将NSA里的“Compressed Attention”、“Selected  Attention”、“Sliding Attention”合三为一，也就是说InfLLM-V2只有一个attention output。具体来说，首先压缩阶段，就只提供重要性分数，不输出attention output了，接着就是把Sliding Attention融入到Selected  Attention，怎么做，很简单，最邻近的token肯定是重要的token，那就把sliding index也合并到top k index里面，所以上图中写了Fused Selected & Sliding。上图中还演示把Init block index也纳入重要token，论文中用以下等式来表示这个过程：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BI%7D_%7B%5Ctext+%7Binit+%7D%7D%3D%5Cleft%5C%7B1%2C2%2C+%5Cldots%2C+N_%7B%5Ctext+%7Binit+%7D%7D%5Cright%5C%7D%2C+%5Cquad+%5Cmathcal%7BI%7D_%7B%5Ctext+%7Blocal+%7D%7D%28i%29%3D%5Cleft%5C%7Bb_%7Bi%7D-N_%7B%5Ctext+%7Blocal+%7D%7D%2B1%2C+%5Cldots%2C+b_%7Bi%7D-1%2C+b_%7Bi%7D%5Cright%5C%7D+.) 

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BI%7D%28i%29%3D%5Cmathcal%7BI%7D_%7B%5Cmathrm%7Binit%7D%7D%5Ccup%5Cmathcal%7BI%7D_%7B%5Cmathrm%7Blocal%7D%7D%28i%29%5Ccup%5Cmathcal%7BI%7D_%7B%5Cmathrm%7Btopk%7D%7D%28i%29) 

其中 
![](https://www.zhihu.com/equation?tex=b_%7Bi%7D%3D%5Clfloor%5Cfrac%7Bi-1%7D%7BB%7D%5Crfloor%2B1) 是block的索引， 
![](https://www.zhihu.com/equation?tex=B) 是block size。为了让 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BI%7D_%7B%5Ctext+%7Blocal+%7D%7D%28i%29) 能覆盖到滑动窗口里的所有token，要求 
![](https://www.zhihu.com/equation?tex=N_%7Blocal%7D+%E2%89%A5+%E2%8C%88+%5Cfrac%7Bw%7D%7BB%7D+%E2%8C%89+%2B+1) ，所以上图中写了More local。

论文中还用一张图描述了这个融合过程：

![](https://pic3.zhimg.com/v2-769b02f27bce835c2adb5e0f4f8bdcfe_r.jpg)另外，因为只有一个attention output，NSA里的三组KV projection和gated output在InfLLM-V2这里都省掉了。

再用论文中的一张图来总结这里NSA和InfLLM-V2的差异：

![](https://pic3.zhimg.com/v2-0507d407b96868d13c2b4cd247d74fb4_r.jpg)3. 由于我们消除了 Compression Attention Output，因此使用 MLP 进行 token 压缩将不会收到梯度。于是InfLLM-V2用更简单高效的、无参数的平均池化来替换它。但不是直接简单地用一个很大的平均池化一步就搞定了，如下图的1-stage token-level所示，因为这样做并不能捕获粗粒度的信息。于是，InfLLM-V2采用的是下图中的3-stage group-level的方法：

![](https://pic1.zhimg.com/v2-62aa06626b68ed45887fd70d06325dfa_r.jpg)上图的操作可以用以下等式表示：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BK%7D_i%5E%7BC_1%7D%3D%5Cmathrm%7BMean%7D%28%5Cmathbf%7BK%7D_%7Bi%5Ccdots_%7BC_1%7D%3Ai%5Ccdots_%7BC_1%7D%2Bl_%7BC_1%7D%7D%29.%5Cquad%284%29) 

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathbf%7BS%7D%5E%7BC_1%7D+%26+%3D%5Cmathrm%7BSoftmax%7D%28%5Cmathbf%7BQ%7D%28%5Cmathbf%7BK%7D%5E%7BC_1%7D%29%5E%5Ctop%29.+%26+%285%29+%5Cend%7Baligned%7D) 

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+%5Cmathbf%7BS%7D%5E%7B%5Cmathrm%7Bshared%7D%7D+%26+%3D%5Csum_%7Bh%3D1%7D%5EG%5Cmathbf%7BS%7D%5E%7BC_1%7D%28h%29.+%26+%286%29+%5Cend%7Baligned%7D) 

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D_i%5E%5Cmathrm%7Bcmp%7D%3D%5Cmathrm%7BMax%7D%28%5Cmathbf%7BS%7D_%7Bi%5Ccdots%3Ai%5Ccdots%2Bl%7D%5E%5Cmathrm%7Bshared%7D%29.++%5Cquad+%287%29) 

以上计算步骤理论上看起来很简单，但真正实现时，为了最大化GPU利用率，就得对齐GPU硬件的特性。

作者发现将第一阶段注意力分数 
![](https://www.zhihu.com/equation?tex=S%5E%7BC1%7D) 存储到慢速 GPU HBM 中所需的大量 I/O。受到 FlashAttention的启发，作者设计了融合头组求和（Fused Head Group Summation），它将第二阶段压缩所需的头组求和直接融合到 FlashAttention 的基于 SRAM 的计算循环中。之后，我们只需要将注意力分数 
![](https://www.zhihu.com/equation?tex=S%5E%7Bshared%7D) 存储到GPU HBM中，写入量变小了。为了解决online softmax（[介绍](https://zhuanlan.zhihu.com/p/638788074)） 与head group求和的计算顺序冲突，作者采用了一种两遍（two-pass）方法，也就是两个for循环：第一遍使用一个更加粗粒度（ 
![](https://www.zhihu.com/equation?tex=s_%7BC_2%7D%3D4s_%7BC_1%7D%5Cmathrm%7B~and~%7Dl_%7BC_2%7D%3D4l_%7BC_1%7D) ）的键表示 
![](https://www.zhihu.com/equation?tex=K%5E%7BC2%7D) 来近似计算 Softmax 的归一化项（log-sum-exp, lse），第二遍则利用这个 lse 来计算精确的注意力分数、在 SRAM 内完成头组求和，并最终只将聚合后的分数写回 HBM。这种LSE 近似（LSE Approximation）方法将计算开销从 2 倍降低到 1.25 倍。

算法流程如下：

![](https://pic2.zhimg.com/v2-03b846f6569cf89f56139ea6384f89e9_r.jpg)

MiniCPM-SALA
论文：[https://arxiv.org/pdf/2602.11761](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2602.11761)

推理代码：[https://huggingface.co/openbmb/MiniCPM-SALA/blob/main/modeling_minicpm_sala.py](https://link.zhihu.com/?target=https%3A//huggingface.co/openbmb/MiniCPM-SALA/blob/main/modeling_minicpm_sala.py)

微调代码：[https://github.com/OpenBMB/MiniCPM/tree/main/minicpm_sala](https://link.zhihu.com/?target=https%3A//github.com/OpenBMB/MiniCPM/tree/main/minicpm_sala)

权重：[https://huggingface.co/openbmb/MiniCPM-SALA](https://link.zhihu.com/?target=https%3A//huggingface.co/openbmb/MiniCPM-SALA)

背景
MiniCPM-SALA的大部分内容是基于之前的两篇工作：Infllm-v2和 HypeNet（[论文链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.22156)）。Infllm-v2上面已经介绍过了，HypeNet这篇论文里主要提出了HALO (Hybrid Attention via Layer Optimization)和HyPE（Hybrid Position Encoding），HALO是一种把预训练的Transformer模型蒸馏到混合模型，而且只需少量数据，HyPE顾名思义，混合了RoPE和NoPE，而NoPE就是没有位置嵌入的意思，它仅依赖因果掩码带来的隐式位置信息，在论文中，作者是看中了NoPE的长度泛化能力，Kimi-Linear把NoPE应用在了MLA层中，关于NoPE的更多资料，可以看苏剑林的这篇[博客](https://link.zhihu.com/?target=https%3A//spaces.ac.cn/archives/10347)。

正文
MiniCPM-SALA是面壁智能在2026年2月开源的一款9B大语言模型，它的目标是能够在消费级显卡跑通1百万 Token 上下文。

- 能力上，与 Qwen3-8B 等全注意力模型相当
- 推理速度上，在 NVIDIA A6000D GPU 和256K token序列长度的条件下，推理速度是Qwen3-8B的3.5倍
- 显存消耗上，在 NVIDIA A6000D GPU（48GB显存）和1M token序列长度的条件下，Qwen3-8B会out-of-memory，而MiniCPM-SALA不会。那MiniCPM-SALA是如何实现如此快的推理速度+支持如此巨大的上下文的+效果不减呢？答案来自于以下贡献点：

- 本文采用了稀疏注意力和线性注意力混合的机制，这也是它名字中SALA（Sparse Attention and Linear Attention）的由来，具体来说，它集成了 25% 的InfLLM-V2 和 75%的 Lightning Attention，通过利用稀疏注意力对局部细节的聚焦和线性注意力的高效率，以在吞吐量和精度之间取得平衡。2.本文采用了混合位置编码HyPE(Hybrid Positional Encoding)来有效地协调短上下文和长上下文的性能。模型架构混合了，位置编码也跟着混合了。

3.本文提出了一种针对混合架构模型的高效训练策略，叫Transformer-to-hybrid，这种方法不是从头开始训练混合架构模型，而是把预训练的标准注意力模型权重转换到混合架构模型上，从而规避了冷启动训练的低效率，将总训练预算减少到大约 25%。

**模型架构**

MiniCPM-SALA架构图：

![](https://pic2.zhimg.com/v2-a5f995a434550a074b1994dc0cb3b0b9_r.jpg)MiniCPM-SALA采用稀疏注意力层和线性注意力层交错的混合架构。受到Qwen3-Next和Kimi-Linear等工作的启发，MiniCPM-SALA也采用了1：3的混合比例，即25％的层采用稀疏注意力，75​​％的层采用线性注意力。这种混合配置利用了两种注意力机制的互补优势。

MiniCPM-SALA没有简单地均匀交错两种注意力变体，而是使用HypeNet提出的层选择机制（详见HypeNet论文里的4.3. Attention Layer Selection）确定稀疏注意力模块的位置。 

HyPE (Hybrid Positional Encoding): MiniCPM-SALA将旋转位置嵌入 (RoPE)应用于线性注意力层以促进位置敏感建模，另一方面，我们在稀疏注意力层中删除了 RoPE，即NoPE ，这么做是为了防止 RoPE 的长距离信息衰减，从而能够对长上下文进行更精确的召回。

Output gates: 此外，我们在每个注意力块（稀疏和线性）之后放置一个输出门。这么做是因为有论文证明说输出门可以有效缓解attention sink等问题。

**模型训练**

MiniCPM-SALA 的训练由五个阶段组成，如表 1 所示

![](https://picx.zhimg.com/v2-6ad96b51b12c64a36b52353266fbce85_r.jpg)MiniCPM-SALA 的 Transformer 到 Hybrid 训练大约消耗 2T token。这相当于从头开始训练 MiniCPM-4.0 所需数据量的大约 25%（8T token）。

Architecture Conversion (HALO)第一阶段使用 HALO 将 Transformer 模型从全注意力架构转换为混合架构。但MiniCPM-SALA 在两个方面与标准 HALO 方法不同。首先，关于层选择，我们保持第一层和最后一层不转换，以提高训练稳定性。对于其余层，我们利用 HALO 选择算法来确定哪些层被保留为 softmax 注意力层。这些保留的 softmax 注意力层随后在后期被训练为稀疏注意力。与标准 HALO 的第二个区别是我们不执行原始 HALO 过程的最后微调步骤。相反，我们进行更广泛的持续预训练和后训练。

Continual Stable-Training第二阶段是持续稳定训练。我们使用前一阶段的检查点作为起点，使用 MiniCPM-4.0 预训练数据集进一步训练。此阶段的主要目标是促进转换后的线性注意力层和其他模型组件（包括完全注意力层、FFN 层）之间更好的协调。由于序列长度仍然相对较短，因此在此阶段禁用稀疏注意力以保持计算效率

Short-Decay Training第三阶段是短衰减训练。此阶段涉及 1T token的训练，是整个训练流程中最广泛的数据量。该阶段旨在利用高信息密度的训练数据来增强通用能力和逻辑推理能力，实现海量知识的高效压缩和内化。

Long-Decay Training第四阶段，长衰减，逐渐将上下文长度从 4K 扩展到 32K、160K，最后是 520K token。鉴于稀疏注意力在较长序列上的计算优势越来越大，我们在这个阶段启用稀疏注意力机制并保持全参数训练，从而使模型能够有效地学习稀疏注意力和线性注意力之间的协同作用。

Supervised Fine-Tuning该阶段的SFT语料库由高质量的推理密集型数据组成，涵盖代码、数学、知识、函数调用和一般对话。此外，我们还专门合成了长上下文数据，以提高扩展序列中信息检索和跨文档理解的精度。

**我的其他文章**：

[加速扩散模型生成的算法：Rectified Flow和PeRFlow](https://zhuanlan.zhihu.com/p/715104559)

[LOOPY和CYBERHOST论文阅读笔记](https://zhuanlan.zhihu.com/p/718781938)

[2D数字人(talking face)算法EchoMimic和Hallo论文解读](https://zhuanlan.zhihu.com/p/714539499)

[快手2D数字人驱动算法LivePortrait技术报告解读](https://zhuanlan.zhihu.com/p/713539828)

[快手可图文生图模型-Kolors技术报告解读](https://zhuanlan.zhihu.com/p/712714695)

[腾讯混元文生图模型-HunYuanDiT技术报告解读](https://zhuanlan.zhihu.com/p/712712557)

[AI生成视频算法AnimateDiff原理解读](https://zhuanlan.zhihu.com/p/669814884)

[扩散模型中的v-prediction推导](https://zhuanlan.zhihu.com/p/678942992)

[通俗易懂地理解Gumbel Softmax](https://zhuanlan.zhihu.com/p/633431594)

[2D数字人经典算法Wav2Lip和SadTalker简介](https://zhuanlan.zhihu.com/p/666033822)

[vscode 有哪些让人眼前一亮的插件?](https://www.zhihu.com/question/311803609/answer/3434154856)

[如何最简单、通俗地理解Transformer？](https://www.zhihu.com/question/445556653/answer/3336319134)

[大白话用复数的几何意义证明欧拉公式（顺便扯一下旋转位置编码RoPE）](https://zhuanlan.zhihu.com/p/646598747)