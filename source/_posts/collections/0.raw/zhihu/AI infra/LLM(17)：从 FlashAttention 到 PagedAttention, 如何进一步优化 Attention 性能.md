---
title: LLM(17)：从 FlashAttention 到 PagedAttention, 如何进一步优化 Attention 性能
date: "2023-06-21 00:00:00"
updated: "2023-06-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/LLM(17)-从-FlashAttention-到-PagedAttention,-如何进一步优化-Attention-性能/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/638468472
---


一、FlashAttention 基本原理

1.1 GPU 硬件特点
由于 FlashAttention 计算 self-attention 的主要关键是有效的硬件使用，所以了解GPU内存和各种操作的性能特征是很有必要的。

以 A100 (40GB HBM) 为例，下面显示其内存层次结构的粗略图。SRAM内存分布在108个流式多处理器(SMs)上，每个处理器192KB。片上SRAM比HBM快得多，但比HBM小得多，在计算方面，使用Tensor Core的BFLOAT16 的理论峰值吞吐量为 312 TFLOPS。GPU 的典型操作方式是使用大量的线程来执行一个操作，这个操作被称为内核。输入从HBM加载到寄存器和SRAM，并在计算后写回HBM。

![](https://pic1.zhimg.com/v2-38840cb168ef0be1afc3850fb3932dfc_1440w.jpg)算法对于内存带宽的需求通常使用 <strong>计算强度</strong> (arithmetic intensity) 来表示，单位是 OPs/byte。意思是在算法中平均每读入单位数据，能支持多少次运算操作。它有助于理解操作的瓶颈，即计算约束(Compute-bound)或带宽约束(Bandwidth-bound, or Memory-bound)。

- <strong>算力</strong> 
![](https://www.zhihu.com/equation?tex=%5Cpi) ：也称为计算平台的<strong>性能上限</strong>，指的是一个计算平台倾尽全力每秒钟所能完成的浮点运算数。单位是 `FLOPS` or `FLOP/s`。
- <strong>带宽</strong> 
![](https://www.zhihu.com/equation?tex=%5Cbeta+) ：也即计算平台的<strong>带宽上限</strong>，指的是一个计算平台倾尽全力每秒所能完成的内存交换量。单位是`Byte/s`。
- <strong>计算强度上限</strong> **
![](https://www.zhihu.com/equation?tex=I_%7Bmax%7D+%3D+%5Cfrac%7B%5Cpi%7D%7B%5Cbeta%7D+)<strong>：两个指标相除即可得到计算平台的</strong>计算强度上限**。它描述的是在这个计算平台上，单位内存交换最多用来进行多少次计算。单位是`FLOPs/Byte`。
- **模型的理论性能 
![](https://www.zhihu.com/equation?tex=P)：<strong>我们最关心的指标，即模型</strong>在计算平台上所能达到的每秒浮点运算次数（理论值）**。单位是`FLOPS`or`FLOP/s`。如下图所示，Roof-line 描述了<strong>模型在一个计算平台的限制下，到底能达到多快的浮点计算速度</strong>，即<strong>算力</strong>决定“屋顶”的高度（绿色线段），<strong>带宽</strong>决定“房檐”的斜率（红色线段）。

![](https://pica.zhimg.com/v2-5e0342538c21a35d7aba472e22a5b468_r.jpg)Roof-line 划分出的两个瓶颈区域，即

![](https://www.zhihu.com/equation?tex=%5Cquad%5Cquad%5Cquad+%5Cquad%5Cquad%5Cquad+P+%3D+%5Cbegin%7Bcases%7D+%5Cbeta+%5Ccdot+I%2C+%26+~+when+~~+I+%3C+I_%7Bmax%7D+%5Cquad+%7B%5Ccolor%7Bred%7D%7B%5Ctextbf%7BMemory+Bound%7D%7D%7D%5C%5C%5B2ex%5D+%5Cpi%2C+%26+~+when+~~+I+%5Cgeqslant+I_%7Bmax%7D+%5Cquad+%7B%5Ccolor%7Bgreen%7D%7B%5Ctextbf%7BCompute+Bound%7D%7D%7D+%5Cend%7Bcases%7D+%5Cquad%5Cquad%5Cquad+%5Cquad%5Cquad%5Cquad+)

- <strong>计算约束</strong>——此时HBM访问所花费的时间相对较低，不管模型的计算强度 
![](https://www.zhihu.com/equation?tex=I) 有多大，它的理论性能 
![](https://www.zhihu.com/equation?tex=P) 最大只能等于计算平台的算力
![](https://www.zhihu.com/equation?tex=%5Cpi)。例如，具有较大内维数的矩阵乘法和具有大量通道的卷积。
- <strong>带宽约束</strong>——当模型的计算强度 
![](https://www.zhihu.com/equation?tex=I) 小于计算平台的计算强度上限 
![](https://www.zhihu.com/equation?tex=I_%7Bmax%7D) 时，由于此时模型位于“房檐”区间，因此模型理论性能 
![](https://www.zhihu.com/equation?tex=P) 的大小完全由计算平台的带宽上限 
![](https://www.zhihu.com/equation?tex=%5Cbeta)（房檐的斜率）以及模型自身的计算强度 
![](https://www.zhihu.com/equation?tex=I+) 所决定。例如，elementwise 操作 (如activation, dropout 等)  和 规约操作 (如sum, softmax, batch normalization, layer normalization等)。在 self-attention 中，计算速度比内存速度快得多，因此进程(操作)越来越多地受到内存(HBM)访问的瓶颈。因此，FlashAttention论文的目标是尽可能高效地使用SRAM来加快计算速度

1.2 FlashAttention 的核心思想及细节推导
首先我们回顾一下标准 Attention 的操作:

![](https://www.zhihu.com/equation?tex=%5Coperatorname%7BAttention%7D%28Q%2C+K%2C+V%29%3D%5Coperatorname%7Bsoftmax%7D%5Cleft%28%5Cfrac%7BQ+K%5E%7B%5Ctop%7D%7D%7B%5Csqrt%7Bd_k%7D%7D%5Cright%29+V+%5C%5C) 

其中 
![](https://www.zhihu.com/equation?tex=Q%2C+K%2C+V+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+d%7D) （ 
![](https://www.zhihu.com/equation?tex=N) 表示序列长度， 
![](https://www.zhihu.com/equation?tex=d) 表示维度），上述公式可拆解为：

![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D%3D%5Cmathbf%7BQ%7D+%5Cmathbf%7BK%7D%5E%7B%5Ctop%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D%2C+%5Cquad+%5Cmathbf%7BP%7D%3D%5Coperatorname%7Bsoftmax%7D%28%5Cmathbf%7BS%7D%29+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D%2C+%5Cquad+%5Cmathbf%7BO%7D%3D%5Cmathbf%7BP+V%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+d%7D) 

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D%2C+%5Cmathbf%7BP%7D) （对于decoder来说还有 mask）的空间复杂度都是 
![](https://www.zhihu.com/equation?tex=O%28N%5E2%29) ，另外还有几个带宽约束的操作：对 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BS%7D) 的 scale, mask 和 softmax 操作，对 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BP%7D) 的 dropout 操作。下图算法展示了 HBM 与 SRAM 之间的数据传输过程。

![](https://pic4.zhimg.com/v2-d80d34acc622ae03950cdb25d31fa665_r.jpg)<strong>1.2.1 FlashAttention 的优化思路</strong>

从上面的分析可以看出，
![](https://www.zhihu.com/equation?tex=O%28N%5E2%29)复杂度的矩阵对HBM及其重复读写是一个主要瓶颈。要解决这个问题，需要做两件主要的事情：

- 在不访问整个输入的情况下计算 softmax
- 不为反向传播存储大的中间 attention 矩阵为此 FlashAttention 提出了两种方法来分布解决上述问题：<strong>tiling 和 recomputation</strong>。

- tiling - 注意力计算被重新构造，将输入分割成块，并通过在输入块上进行多次传递来递增地执行softmax操作。
- recomputation - 存储来自前向的 softmax 归一化因子，以便在反向中快速重新计算芯片上的 attention，这比从HBM读取中间矩阵的标准注意力方法更快。由于重新计算，这确实导致FLOPs增加，但是由于大量减少HBM访问，FlashAttention运行速度更快(在GPT-2上高达7.6倍)。下面将详细推导 FlashAttention 的细节。

该算法背后的主要思想是分割输入，将它们从慢速HBM加载到快速SRAM，然后计算这些块的 attention 输出。在将每个块的输出相加之前，将其按正确的归一化因子进行缩放，从而得到正确的结果。

下面将分别讨论 <strong>tiling</strong> 和 <strong>recomputation</strong>的正确性：

<strong>1.2.2 Tiling 与前向计算</strong>

上述算法中除了线性操作和 elementwise 外，分块计算注意力的关键部分是 softmax 的分块计算。向量的 softmax 可以计算为

![](https://www.zhihu.com/equation?tex=m%28x%29%3A%3D%5Cmax+_i+x_i%5C%5C) 

![](https://www.zhihu.com/equation?tex=f%28x%29%3A%3D%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1-m%28x%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B-m%28x%29%7D+%5Cend%7Barray%7D%5Cright%5D%5C%5C) 

![](https://www.zhihu.com/equation?tex=%5Cell%28x%29%3A%3D%5Csum_i+f%28x%29_i%5C%5C) 

![](https://www.zhihu.com/equation?tex=+%5Coperatorname%7Bsoftmax%7D%28x%29%3A%3D%5Cfrac%7Bf%28x%29%7D%7B%5Cell%28x%29%7D%5C%5C) 

其中 
![](https://www.zhihu.com/equation?tex=x) 可分解为 
![](https://www.zhihu.com/equation?tex=x%3D%5Cleft%5Bx%5E%7B%281%29%7D+x%5E%7B%282%29%7D%5Cright%5D+%5Cin+%5Cmathbb%7BR%7D%5E%7B2+B%7D) ， 
![](https://www.zhihu.com/equation?tex=x%5E%7B%281%29%7D+%2C+x%5E%7B%282%29%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7B+B%7D) 那么则有

![](https://www.zhihu.com/equation?tex=m%28x%29%3Dm%5Cleft%28%5Cleft%5Bx%5E%7B%281%29%7D+x%5E%7B%282%29%7D%5Cright%5D%5Cright%29%3D%5Cmax+%5Cleft%28m%5Cleft%28x%5E%7B%281%29%7D%5Cright%29%2C+m%5Cleft%28x%5E%7B%282%29%7D%5Cright%29%5Cright%29%5C%5C) 

那么可以通过如下构造的方式，使得 
![](https://www.zhihu.com/equation?tex=f%28x%29) 的结果与分块前保持统一：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D+f%28x%29%26%3D%5Cleft%5B%5Cbegin%7Barray%7D%7Bll%7D+e%5E%7Bm%5Cleft%28x%5E%7B%281%29%7D%5Cright%29-m%28x%29%7D+f%5Cleft%28x%5E%7B%281%29%7D%5Cright%29+%26+e%5E%7Bm%5Cleft%28x%5E%7B%282%29%7D%5Cright%29-m%28x%29%7D+f%5Cleft%28x%5E%7B%282%29%7D%5Cright%29+%5Cend%7Barray%7D%5Cright%5D+%5C%5C+%26%3D%5Cleft%5B%5Cbegin%7Barray%7D%7Bll%7D+e%5E%7Bm%5Cleft%28x%5E%7B%281%29%7D%5Cright%29-m%28x%29%7D+%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1%5E%7B%281%29%7D-m%28x%5E%7B%281%29%7D%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B%5E%7B%281%29%7D-m%28x%5E%7B%281%29%7D%29%7D+%5Cend%7Barray%7D%5Cright%5D+%26+e%5E%7Bm%5Cleft%28x%5E%7B%282%29%7D%5Cright%29-m%28x%29%7D+%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1%5E%7B%282%29%7D-m%28x%5E%7B%282%29%7D%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B%5E%7B%282%29%7D-m%28x%5E%7B%282%29%7D%29%7D+%5Cend%7Barray%7D%5Cright%5D+%5Cend%7Barray%7D%5Cright%5D+%5C%5C+%26%3D+%5Cleft%5B%5Cbegin%7Barray%7D%7Bll%7D+%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1%5E%7B%281%29%7D-m%28x%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B%5E%7B%281%29%7D-m%28x%29%7D+%5Cend%7Barray%7D%5Cright%5D+%26++%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1%5E%7B%282%29%7D-m%28x%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B%5E%7B%282%29%7D-m%28x%29%7D+%5Cend%7Barray%7D%5Cright%5D+%5Cend%7Barray%7D%5Cright%5D+%5C%5C+%26%3D%5Cleft%5B%5Cbegin%7Barray%7D%7Blll%7D+e%5E%7Bx_1-m%28x%29%7D+%26+%5Cldots+%26+e%5E%7Bx_B-m%28x%29%7D+%5Cend%7Barray%7D%5Cright%5D+%5Cend%7Baligned%7D+) 

![](https://www.zhihu.com/equation?tex=%5Cell%28x%29+) 的构造方式同理：

![](https://www.zhihu.com/equation?tex=%5Cell%28x%29%3D%5Cell%5Cleft%28%5Cleft%5Bx%5E%7B%281%29%7D+x%5E%7B%282%29%7D%5Cright%5D%5Cright%29%3De%5E%7Bm%5Cleft%28x%5E%7B%281%29%7D%5Cright%29-m%28x%29%7D+%5Cell%5Cleft%28x%5E%7B%281%29%7D%5Cright%29%2Be%5E%7Bm%5Cleft%28x%5E%7B%282%29%7D%5Cright%29-m%28x%29%7D+%5Cell%5Cleft%28x%5E%7B%282%29%7D%5Cright%29%5C%5C) 

由此 
![](https://www.zhihu.com/equation?tex=+%5Coperatorname%7Bsoftmax%7D%28x%29) 的结果自然与分块前保持统一：

![](https://www.zhihu.com/equation?tex=+%5Coperatorname%7Bsoftmax%7D%28x%29%3D%5Cfrac%7Bf%28x%29%7D%7B%5Cell%28x%29%7D+%5C%5C) 

softmax 的分块计算解决后，实际上其他部分的分块计算就简单多了，那么我们可以看下完整的 decoder 的 attention 的计算过程：

![](https://www.zhihu.com/equation?tex=%281%29+%5Cquad+%5Cmathbf%7BS%7D%3D+%5Cmathbf%7BQ%7D+%5Cmathbf%7BK%7D%5E%7B%5Ctop%7D%2F%5Csqrt%7Bd%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D) 

![](https://www.zhihu.com/equation?tex=%282%29+%5Cquad+%5Cmathbf%7BS%7D%5E%7B%5Ctext+%7Bmasked+%7D%7D%3D%5Coperatorname%7BMASK%7D%28%5Cmathbf%7BS%7D%29+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D) 

![](https://www.zhihu.com/equation?tex=%283%29+%5Cquad+%5Cmathbf%7BP%7D%3D%5Coperatorname%7Bsoftmax%7D%5Cleft%28%5Cmathbf%7BS%7D%5E%7B%5Ctext+%7Bmasked+%7D%7D%5Cright%29+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D) 

![](https://www.zhihu.com/equation?tex=%284%29+%5Cquad+%5Cmathbf%7BP%7D%5E%7B%5Ctext+%7Bdropped+%7D%7D%3D%5Coperatorname%7Bdropout%7D%5Cleft%28%5Cmathbf%7BP%7D%2C+p_%7B%5Ctext+%7Bdrop+%7D%7D%5Cright%29%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+N%7D) 

![](https://www.zhihu.com/equation?tex=%285%29%5Cquad+%5Cmathbf%7BO%7D%3D%5Cmathbf%7BP%7D%5E%7B%5Ctext+%7Bdropped+%7D%7D+%5Cmathbf%7BV%7D+%5Cin+%5Cmathbb%7BR%7D%5E%7BN+%5Ctimes+d%7D) 

那么 FlashAttention 前向过程的算法可描述如下：

![](https://pic2.zhimg.com/v2-5a5338741dccd972ad8bf3578314c7c5_r.jpg)上述算法并没有增加额外计算（只是将大的操作拆成多个分块逐步计算），因此其算法复杂度仍为 
![](https://www.zhihu.com/equation?tex=O%28N%5E2d%29) ，另外由于增加了变量 
![](https://www.zhihu.com/equation?tex=%5Cell%2C+m) ，因此空间复杂度增加 
![](https://www.zhihu.com/equation?tex=O%28N%29) 。

其中第15行需要专门来推导一下，为简洁起见，先不考虑 mask 和 dropout 操作： 

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7D++%5Cmathbf%7BO%7D_i%5E%7B%28j%2B1%29%7D+%26%3D%5Cmathbf%7BP%7D_%7Bi%2C%3A+j%2B1%7D+%5Cmathbf%7BV%7D_%7B%3A+j%2B1%7D%3D%5Coperatorname%7Bsoftmax%7D%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2C%3A+j%2B1%7D%5Cright%29+%5Cmathbf%7BV%7D_%7B%3A+j%2B1%7D++%5C%5C+%26+%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Cexp+%5Cleft%28%5Cleft%5B%5Cbegin%7Barray%7D%7Bll%7D+%5Cmathbf%7BS%7D_%7Bi%2C%3A+j%7D+%26+%5Cmathbf%7BS%7D_%7Bi%2Cj%3A+j%2B1%7D+%5Cend%7Barray%7D%5Cright%5D-m%5E%7B%28j%2B1%29%7D%5Cright%29%5Cright%29%5Cleft%5B%5Cbegin%7Barray%7D%7Bc%7D+%5Cmathbf%7BV%7D_%7B%3A+j%7D+%5C%5C+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D+%5Cend%7Barray%7D%5Cright%5D+%5C%5C+%26+%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2C+%3Aj%7D-m%5E%7B%28j%2B1%29%7D%5Cright%29+%5Cmathbf%7BV%7D_%7B%3A+j%7D%2B%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2Cj%3A+j%2B1%7D-m%5E%7B%28j%2B1%29%7D%5Cright%29+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C+%26+%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28e%5E%7B-m%5E%7B%28j%2B1%29%7D%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2C+%3A+j%7D%5Cright%29+%5Cmathbf%7BV%7D_%7B%3A+j%7D%2Be%5E%7B-m%5E%7B%28j%2B1%29%7D%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2C+j%3A+j%2B1%7D%5Cright%29+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C+%26%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%29%7D%5Cright%29+e%5E%7Bm%5E%7B%28j%29%7D-m%5E%7B%28j%2B1%29%7D%7D+%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%29%7D%5Cright%29%5E%7B-1%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2C%3A+j%7D-m%5E%7B%28j%29%7D%5Cright%29+%5Cmathbf%7BV%7D_%7B%3A+j%7D%2Be%5E%7B-m%5E%7B%28j%2B1%29%7D%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2Cj%3A+j%2B1%7D%5Cright%29+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C+%26%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%29%7D%5Cright%29+e%5E%7Bm%5E%7B%28j%29%7D-m%5E%7B%28j%2B1%29%7D%7D+%5Cmathbf%7BP%7D_%7Bi%2C+%3A+j%7D+%5Cmathbf%7BV%7D_%7B%3A+j%7D%2Be%5E%7B-m%5E%7B%28j%2B1%29%7D%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2Cj%3A+j%2B1%7D%5Cright%29+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C++%26%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%29%7D%5Cright%29+e%5E%7Bm%5E%7B%28j%29%7D-m%5E%7B%28j%2B1%29%7D%7D+%5Cmathbf%7BO%7D_i%5E%7B%28j%29%7D%2Be%5E%7B%5Ctilde%7Bm%7D-m%5E%7B%28j%2B1%29%7D%7D+%5Cexp+%5Cleft%28%5Cmathbf%7BS%7D_%7Bi%2Cj%3A+j%2B1%7D-%5Ctilde%7Bm%7D%5Cright%29+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C+%26%3D%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%2B1%29%7D%5Cright%29%5E%7B-1%7D%5Cleft%28%5Coperatorname%7Bdiag%7D%5Cleft%28%5Cell%5E%7B%28j%29%7D%5Cright%29+e%5E%7Bm%5E%7B%28j%29%7D-m%5E%7B%28j%2B1%29%7D%7D+%5Cmathbf%7BO%7D_i%5E%7B%28j%29%7D%2Be%5E%7B%5Ctilde%7Bm%7D-m%5E%7B%28j%2B1%29%7D%7D++%5Cmathbf%7BP%7D_%7Bi%2Cj%3A+j%2B1%7D+%5Cmathbf%7BV%7D_%7Bj%3A+j%2B1%7D%5Cright%29+%5C%5C+++%5Cend%7Baligned%7D) 

其核心思想仍是使用分块的计算更新迭代以得到全局的结果。那么至此我们厘清了前向计算的整个过程，接下来我们将考虑反向计算的过程。

![](https://pic4.zhimg.com/v2-cdde694230620937cfa09039d40ea009_r.jpg)<strong>1.2.3 Recomputation 与 反向计算</strong>

FlashAttention 的 向后传递需要 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BS%7D) 和 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BP%7D) 矩阵来计算 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BQ%7D%2C++%5Cmathbf%7BK%7D%2C++%5Cmathbf%7BV%7D) 的梯度。然而由于空间复杂度是 
![](https://www.zhihu.com/equation?tex=O%28N%5E2%29) ，
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BS%7D) 和 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BP%7D) 没有显式存储。解决办法是使用输出 
![](https://www.zhihu.com/equation?tex=O) 和 softmax 归一化统计 
![](https://www.zhihu.com/equation?tex=%28m%2C%5Cell%29) ，我们可以利用SRAM中的 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BQ%7D%2C++%5Cmathbf%7BK%7D%2C++%5Cmathbf%7BV%7D)重新计算 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BS%7D) 和 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BP%7D) 矩阵。这个过程使用更多的flop，由于减少HBM访问，重新计算步长也加快了反向传播的速度。

首先回顾一下标准 Attention 的反向的求导过程：

注意力机制的公式为 
![](https://www.zhihu.com/equation?tex=+%5Cmathbf%7BO%7D%3D%5Ctext%7BSoftmax+%7D%7B%28%5Cfrac%7B%5Cbf+Q%5Cbf+K%5E%5Ctop%7D%7B%5Csqrt%7Bd_k%7D%7D%29%7D%5Cmathbf+V+) ，反向传播时，需要根据损失函数 
![](https://www.zhihu.com/equation?tex=+%5Cphi) 对模块输出的导数 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+O) ( 即
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BO%7D%7D) )，进而求出其对输入的导数 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+Q%2C+%5Ctext+d+%5Cmathbf+K+%2C%5Ctext+d+%5Cmathbf+V)(即 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BQ%7D%7D%2C+%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BK%7D%7D%2C+%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BV%7D%7D) )。这里，令 
![](https://www.zhihu.com/equation?tex=%5Cmathbf%7BP%7D+%3D+%5Ctext%7BSoftmax%7D%28%5Cmathbf+S%29%2C+%5Cmathbf+S+%3D%7B%5Cfrac%7B%5Cmathbf+Q%5Cmathbf+K%5E%5Ctop%7D%7B%5Csqrt+%7Bd_k%7D%7D%7D)， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf++O+%3D+%5Cmathbf+P%5Cmathbf+V) ，则其求导过程如下：

由 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5Cpartial+%5Cmathbf%7BO%7D%7D%7B%5Cpartial+%5Cmathbf%7BV%7D%7D+%3D+P%5ET) 则 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BV%7D%7D%3DP%5ET%5Cfrac%7B%5Cpartial+%5Cphi%7D%7B%5Cpartial+%5Cmathbf%7BO%7D%7D) ，即 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf%7BV%7D%3D%5Cmathbf+P%5E%5Ctop+%5Ctext+d%5Cmathbf+O+) ，其余算法类似

![](https://pic3.zhimg.com/v2-9bc55010184d1e6c5f3261f571e778a6_r.jpg)FlashAttention将 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+V) 的计算拆分成若干个子部分 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+V_j) 的计算，以使得可以使用Tiling技术：

![](https://www.zhihu.com/equation?tex=%5Ctext+d+%5Cmathbf+V_j%3D%5Cmathbf%28P%5E%5Ctop%29_j%5Ctextbf+d%5Cmathbf+O%3D%5Csum%5Climits_i%5Cmathbf+%28P%5E%5Ctop%29_%7Bji%7D%5Ctext+d+%5Cmathbf+O_i%3D%5Csum%5Climits_i%5Cmathbf++P_%7Bij%7D%5E%5Ctop%5Ctext+d+%5Cmathbf+O_i+%5C%5C)

![](https://www.zhihu.com/equation?tex=%5Cmathbf+P) 矩阵的大小是 
![](https://www.zhihu.com/equation?tex=O%28N%5E2%29) 量级，为了减小内存的消耗，<strong>FlashAttention在反向传播时重新计算</strong> **
![](https://www.zhihu.com/equation?tex=%5Cmathbf+P)** **而非在前向传播时保存：**

![](https://www.zhihu.com/equation?tex=%5Cmathbf+P_%7Bij%7D+%3D+%28%5Ctext+%7BSoftmax%7D%28%5Cmathbf+S%29%29_%7Bij%7D%3D%5Cfrac%7Be%5E%7B%5Cmathbf+S_%7Bij%7D-%5Cdelta%5E%5Ctop%28%7B%5Cmathbf+S_i%5E%7B%5Ctext%7Bmax%7D%7D%5Ctext+%7B%2C+%7D++C_N+%29%7D%7D%7D%7B%5Cdelta%5E%5Ctop%28%5Cmathbf+S_i%5E%7B%5Ctext%7Bsum%7D%7D%5Ctext%7B%2C++%7DC_N%29%7D%5C%5C)

式中 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+S_i%5E%5Ctext%7Bmax%7D%2C+%5Cmathbf+S_i%5E%5Ctext%7Bsum%7D) 由前向传播时保存，而 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+S_%7Bij%7D%3D%5Cfrac%7B%5Cmathbf+Q_i%28%5Cmathbf+K%5E%5Ctop%29_%7B.j%7D%7D%7B%5Csqrt%7Bd_k%7D%7D%3D%5Cfrac%7B%5Cmathbf+Q_i%5Cmathbf+K_%7Bj%7D%5E%5Ctop%7D%7B%5Csqrt%7Bd_k%7D%7D)

根据之前推到同理可得到中间变量 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+P) 的导数： 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+P%3D+%5Ctext+d+%5Cmathbf+O++%5Cmathbf+V%5E%5Ctop) 

而 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+s_i+%3D+%5Cfrac%7B%5Cmathbf+q_i%5Cmathbf+K%5E%5Ctop%7D%7B%5Csqrt+%7Bd_k%7D%7D) ， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+p_i+%3D+%5Ctext%7Bsoftmax%7D%28%7B%5Cmathbf+s_i%7D%29) ，于是：

![](https://www.zhihu.com/equation?tex=%5Ctext++d%5Cmathbf+q_i%3D%5Ctext++d%5Cmathbf+s_i+%5Ccdot+%5Cfrac%7B%5Cpartial+%5Cmathbf+s_i+%7D%7B%5Cpartial+%5Cmathbf+q_i+%7D%3D%5Ctext++d%5Cmathbf+s_i+%5Ccdot+%5Cfrac%7B%5Cmathbf+K%7D%7B%5Csqrt%7Bd_k%7D%7D)

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+s_i+%3D+%5Ctext+d%5Cmathbf+p_i+%5Ccdot+%5Cfrac%7B%5Cpartial+%5Cmathbf+p_i%7D%7B%5Cpartial+%5Cmathbf+s_i%7D+%5C%5C%3D+%5Ctext+d%5Cmathbf+p_i+%28%5Ctext+%7Bdiag%7D%28%5Cmathbf+p_i%29-%5Cmathbf+p_i%5E%5Ctop%5Cmathbf+p_i%29%5C%5C%3Dd%5Cmathbf+p_i+%5Codot+%5Cmathbf+p_i-%5Ctext+d%5Cmathbf+o_i+%5Cmathbf+o_i%5E%5Ctop%5Cmathbf+p_i)

拓展 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+q_i) 到 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+Q_i):

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+Q+_i%3D+%5Ctext+d%5Cmathbf+S_i%5Ccdot+%5Cfrac%7B%5Cmathbf+K%7D%7B%5Csqrt%7Bd_k%7D%7D%3D%5Csum_j%5Ctext+d%5Cmathbf+S_%7Bij%7D%5Ccdot%5Cfrac%7B%5Cmathbf+K_j%7D%7B%5Csqrt%7Bd_k%7D%7D) 

这里还需要求出 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+S_%7Bij%7D):

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+S_%7Bi%7D%3D%5Ctext+d%5Cmathbf+P_i+%5Codot+%5Cmathbf+P_i-%5Calpha%28%5Cbeta%5ET%28%5Ctext+d%5Cmathbf+O_i+%5Codot%5Cmathbf+O_i%29%2CN%29%5Codot%5Cmathbf+P_i%5C%5C%3D%28%5Ctext+d%5Cmathbf+P_i-%5Calpha%28%5Cbeta%5ET%28%5Ctext+d%5Cmathbf+O_i+%5Codot%5Cmathbf+O_i%29%2CN%29%29%5Codot%5Cmathbf+P_i)

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+S_%7Bij%7D%3D%28%5Ctext+d%5Cmathbf+P_%7Bij%7D-%5Calpha%28%5Cbeta%5ET%28%5Ctext+d%5Cmathbf+O_i+%5Codot%5Cmathbf+O_i%29%2CC_N%29%29%5Codot%5Cmathbf+P_%7Bij%7D) 

上式中， 
![](https://www.zhihu.com/equation?tex=%5Cmathbf+P_%7Bij%7D) 由重计算得到， 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+P_%7Bij%7D) 则可更具体表示为：

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+P_%7Bij%7D+%3D+%5Ctext+d%5Cmathbf+O_i%28%5Cmathbf+V%5E%5Ctop%29_%7B.j%7D%3D%5Ctext+d%5Cmathbf+O_i%5Cmathbf+V_j%5E%5Ctop)

最后是求 
![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+K_j) :

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+K%3D+%28%5Ctext+d%5Cmathbf+K%5E%5Ctop%29%5E%5Ctop%3D%5Ctext+d%5Cmathbf+S%5E%5Ctop%5Cfrac%7B%5Cmathbf+Q%7D%7B%5Csqrt%7Bd_k%7D%7D)

![](https://www.zhihu.com/equation?tex=%5Ctext+d%5Cmathbf+K_j+%3D+%28%5Ctext+d%5Cmathbf+S%5E%5Ctop%29_%7Bj%7D%5Ccdot+%5Cfrac%7B%5Cmathbf+Q%7D%7B%5Csqrt%7Bd_k%7D%7D%3D%5Csum_%5Climits+i%28%5Ctext+d%5Cmathbf+S%5E%5Ctop%29_%7Bji%7D%5Ccdot+%5Cfrac%7B%5Cmathbf+Q%7D%7B%5Csqrt%7Bd_k%7D%7D%3D%5Csum_%5Climits+i%5Ctext+d%5Cmathbf+S_%7Bij%7D%5E%5Ctop+%5Ccdot+%5Cfrac%7B%5Cmathbf+Q%7D%7B%5Csqrt%7Bd_k%7D%7D+) 

以上则完成反向过程的求导。

二、FlashAttention 实践与性能分析
在此采用 xformers 的 memory_efficient_attention 的实现，测试用例如下：

```python
import torch
from xformers import ops as xops
import time
```


bs = 32
seq_len = 512
n_head = 16
head_dim = 64

query_states = torch.randn((bs, n_head, seq_len, head_dim), dtype=torch.float16).cuda()
key_states = torch.randn((bs, n_head, seq_len, head_dim), dtype=torch.float16).cuda()
value_states = torch.randn((bs, n_head, seq_len, head_dim), dtype=torch.float16).cuda()

flash_query_states = query_states.transpose(1, 2)
flash_key_states = key_states.transpose(1, 2)
flash_value_states = value_states.transpose(1, 2)

start_time = time.time()
flash_attn_output = xops.memory_efficient_attention(
    flash_query_states, flash_key_states, flash_value_states,

```python
    attn_bias=xops.LowerTriangularMask()
)
print(f'flash attention time: {(time.time()-start_time)*1000} ms')
```

为验证其精确性，需要将其结果与标准 attention 对比精度，验证精度的代码如下：

```python
import math
import torch.nn as nn
```


attention_mask = torch.tril(torch.ones((seq_len, seq_len), dtype=torch.bool)).view(1, 1, seq_len, seq_len)
attention_mask = attention_mask.to(dtype=torch.float16).cuda()  # fp16 compatibility
attention_mask = (1.0 - attention_mask) * torch.finfo(torch.float16).min

```python
def standard_attention(query_states, key_states, value_states, attention_mask):
    attn_weights = torch.matmul(query_states, key_states.transpose(2, 3)) / math.sqrt(head_dim)
    attn_weights = attn_weights + attention_mask
```


    # upcast attention to fp32

```text
    attn_weights = nn.functional.softmax(attn_weights, dim=-1, dtype=torch.float32).to(query_states.dtype)
    attn_output = torch.matmul(attn_weights, value_states)
    attn_output = attn_output.transpose(1, 2)
    return attn_output
```


start_time = time.time()
attn_output = standard_attention(query_states, key_states, value_states, attention_mask)

```python
print(f'standard attention time: {(time.time()-start_time)*1000} ms')

print(torch.allclose(attn_output, flash_attn_output, rtol=2e-3, atol=2e-3))
```

下面比较二者的性能差异，即比较不同参数下二者 Latency 的差异(测试设备为1块A6000，Latency 数据为100次结果的平均值)：

batch sizeseq_lenn_headhead_dimstandard latency (ms)flash latency (ms)speedup3251216640.2420.1831.323x6451216640.5550.2722.041x12851216641.1720.4442.637x25651216645.0431.6443.067x6425616640.1120.1360.822x64102416645.4141.4603.707x642048166463.69043.6921.458x6451232641.1770.4422.663x6451240643.1791.0183.123x64512966422.0834.7714.628x64512161280.1380.09591.442x64512162560.1340.09931.357x
三、PagedAttention 原理及实践
vLLM 主要用于快速 LLM 推理和服务，其核心是 PagedAttention，这是一种新颖的注意力算法，它将在操作系统的虚拟内存中分页的经典思想引入到 LLM 服务中。在无需任何模型架构修改的情况下，可以做到比 HuggingFace Transformers 提供高达 24 倍的 Throughput。

3.1 PagedAttention 的基本原理
vLLM 具有诸多特点，其快速体现在:

- 最好的服务吞吐性能
- 使用 <strong>PagedAttention</strong>优化 KV cache 内存管理
- 动态 batch
- 优化的 CUDA kernels其易用性体现在:

- 与 HuggingFace 模型无缝集成（目前支持GPT2, GPTNeo, LLaMA, OPT 系列）
- 高吞吐量服务与各种 decoder 算法，包括并行采样、beam search 等
- 张量并行(TP)以支持分布式推理
- 流输出
- 兼容 OpenAI 的 API 服务<strong>PagedAttention：如何解决 GPU 显存瓶颈</strong>

该研究发现，在 vLLM 库中 LLM 服务的性能受到内存瓶颈的影响。在自回归 decoder 中，所有输入到 LLM 的 token 会产生注意力 key 和 value 的张量，这些张量保存在 GPU 显存中以生成下一个 token。这些缓存 key 和 value 的张量通常被称为 KV cache，其具有以下特点： 

- 显存占用大：在 LLaMA-13B 中，缓存单个序列最多需要 1.7GB 显存；
- 动态变化：KV 缓存的大小取决于序列长度，这是高度可变和不可预测的。因此，这对有效管理 KV cache 挑战较大。该研究发现，由于碎片化和过度保留，现有系统浪费了 60% - 80% 的显存。为了解决这个问题，该研究引入了 PagedAttention，这是一种受操作系统中虚拟内存和分页经典思想启发的注意力算法。与传统的注意力算法不同，PagedAttention 允许在非连续的内存空间中存储连续的 key 和 value 。具体来说，PagedAttention 将每个序列的 KV cache 划分为块，每个块包含固定数量 token 的键和值。在注意力计算期间，PagedAttention 内核可以有效地识别和获取这些块。

![](https://pic3.zhimg.com/v2-e8a2317d1bc7ba5670ca05f68196453e_r.jpg)PagedAttention：KV 缓存被划分成块，块不需要在内存空间中连续因为块在内存中不需要连续，因而可以用一种更加灵活的方式管理 key 和 value ，就像在操作系统的虚拟内存中一样：可以将块视为页面，将 token 视为字节，将序列视为进程。序列的连续逻辑块通过块表映射到非连续物理块中。物理块在生成新 token 时按需分配。

![](https://pic4.zhimg.com/v2-6035b0440dd9f0eb37bc9c221b977799_r.jpg)使用 PagedAttention 的请求的示例生成过程在 PagedAttention 中，内存浪费只会发生在序列的最后一个块中。这使得在实践中可以实现接近最佳的内存使用，仅浪费不到 4%。这种内存效率的提升被证明非常有用，允许系统将更多序列进行批处理，提高 GPU 使用率，显著提升吞吐量。

PagedAttention 还有另一个关键优势 —— 高效的内存共享。例如在并行采样中，多个输出序列是由同一个 prompt 生成的。在这种情况下，prompt 的计算和内存可以在输出序列中共享。

![](https://pic1.zhimg.com/v2-b22751a85181c355d4acaa222d781afe_r.jpg)并行采样示例PagedAttention 自然地通过其块表格来启动内存共享。与进程共享物理页面的方式类似，PagedAttention 中的不同序列可以通过将它们的逻辑块映射到同一个物理块的方式来共享块。为了确保安全共享，PagedAttention 会对物理块的引用计数进行跟踪，并实现写时复制（Copy-on-Write）机制。

![](https://pica.zhimg.com/v2-cab043f5f4d3ed2f4e369a542617fb22_r.jpg)对于对多输出进行采样的请求，它的示例生成过程是这样的PageAttention 的内存共享大大减少了复杂采样算法的内存开销，例如并行采样和集束搜索的内存使用量降低了 55%。这可以转化为高达 2.2 倍的吞吐量提升。这种采样方法也在 LLM 服务中变得实用起来。

PageAttention 成为了 vLLM 背后的核心技术。vLLM 是 LLM 推理和服务引擎，为各种具有高性能和易用界面的模型提供支持。

3.2 vLLM 及 PagedAttention 实践
<strong>3.2.1 核心模块解读及单元测试</strong>

vLLM 的核心是 PagedAttention ，而 PagedAttention 核心则是 `attention_ops.single_query_cached_kv_attention` op，下面首先了解该 op 的使用方法并验证其正确性，完整代码参见[vllm/tests/kernels/test_attention.py](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/blob/665c48963be11b2e5cb7209cd25f884129e5c284/tests/kernels/test_attention.py%23L8) 。

首先需要构造 `query, kv cache, block_tables` 等值，输入到上述 op 中，并将结果采用 inplace 的形式输出到`output` 中。 

```python
def run_single_query_cached_kv_attention(
    num_tokens: int,
    num_heads: int,
    head_size: int,
    block_size: int,
    num_blocks: int,
    dtype: torch.dtype,
```

) -> None:

```text
    qkv = torch.empty(num_tokens, 3, num_heads, head_size, dtype=dtype, device='cuda')
    qkv.uniform_(-1e-3, 1e-3)
    query, _, _ = qkv.unbind(dim=1)

    x = 16 // torch.tensor([], dtype=dtype).element_size()
    key_block_shape = (num_heads, head_size // x, block_size, x)
    key_cache = torch.empty(size=(num_blocks, *key_block_shape), dtype=dtype, device='cuda')
    key_cache.uniform_(-1e-3, 1e-3)
    value_block_shape = (num_heads, head_size, block_size)
    value_cache = torch.empty(size=(num_blocks, *value_block_shape), dtype=dtype, device='cuda')
    value_cache.uniform_(-1e-3, 1e-3)

    context_lens = [random.randint(1, MAX_SEQ_LEN) for _ in range(num_tokens)] 
    max_context_len = max(context_lens)
    context_lens = torch.tensor(context_lens, dtype=torch.int, device='cuda')

    max_num_blocks_per_seq = (max_context_len + block_size - 1) // block_size
    block_tables = []
    for _ in range(num_tokens):
        block_table = [random.randint(0, num_blocks - 1) for _ in range(max_num_blocks_per_seq)]
        block_tables.append(block_table)
    block_tables = torch.tensor(block_tables, dtype=torch.int, device='cuda')

    scale = float(1.0 / (head_size ** 0.5))
    output = torch.empty(num_tokens, num_heads, head_size, dtype=dtype, device='cuda')
    attention_ops.single_query_cached_kv_attention(
        output,
        query,
        key_cache,
        value_cache,
        scale,
        block_tables,
        context_lens,
        block_size,
        max_context_len,
    )
```

为了验证其正确性，需要将其结果与标准模式（其实现可参考源代码，在此不予赘述）产生的结果进行对比，如下： 

```text
    ref_output = torch.empty_like(query)
    ref_single_query_cached_kv_attention(
        ref_output,
        query,
        key_cache,
        value_cache,
        block_tables,
        context_lens,
    )
    # NOTE(woosuk): Due to the difference in the data types the two implementations use for attention softmax logits and accumulation there is a small difference in the final outputs. We should use a relaxed tolerance for the test.
    assert torch.allclose(output, ref_output, atol=1e-3, rtol=1e-5)
```

<strong>3.2.2 本地性能分析与对比</strong>

首先需要熟悉一下 vllm 运行完整大模型的方法，下面是一个极简版的运行 LLaMA-13B 模型的例子：

from vllm import LLM, SamplingParams

# Sample prompts.
prompts = [
    "Hello, my name is",
    "The president of the United States is",
    "The capital of France is",
    "The future of AI is",
]
# Create a sampling params object.
sampling_params = SamplingParams(temperature=0.8, top_p=0.95, max_tokens=128)

# Create an LLM.
llm = LLM(model="lmsys/vicuna-13b-v1.3")
# Generate texts from the prompts. The output is a list of RequestOutput objects that contain the prompt, generated text, and other information.
outputs = llm.generate(prompts, sampling_params)
# Print the outputs.
for output in outputs:

```python
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")
```

其输出结果为：

INFO 06-23 17:59:49 llm_engine.py:128] # GPU blocks: 1464, # CPU blocks: 327
Processed prompts: 100%|█████████████████████████████████████████████████████████████████████| 4/4 [00:05<00:00,  1.34s/it]
Prompt: 'The capital of France is', Generated text: 'Paris.</s>'
Prompt: 'The future of AI is', Generated text: "bright, and it's clear that it will continue to have a significant impact on the way we work, live, and play. The key to ensuring that AI is a force for good is to continue to develop and deploy it responsibly, with a focus on transparency, accountability, and fairness. By doing so, we can unlock the full potential of AI and create a future where it benefits everyone.</s>"
Prompt: 'Hello, my name is', Generated text: "Bastien and I'm a developer at BigCommerce, a leading eCommerce platform. I noticed your question about copying a BigCommerce store to another server, and I'd like to help you with that.\n\nTo move your BigCommerce store to a new server, you'll need to follow these steps:\n\n1. Export your data: First, you'll need to export your store data, including products, orders, customers, and other information. You can do this using the BigCommerce API or the store export tool in the BigCommerce Control Panel.\n2."
Prompt: 'The president of the United States is', Generated text: 'the head of state and head of government of the United States. The president leads the executive branch of the federal government and is the commander-in-chief of the United States Armed Forces.\n\nThe president is elected to a four-year term by the Electoral College, a body of electors chosen by the states. The president may be re-elected to a maximum of two terms. The president is required to be a natural-born citizen of the United States, at least 35 years old, and a resident of the United States for at least 14 years.\n\nThe president is'
基于此，可进行完整任务离线推理性能的比较，采用的代码为 [vllm/benchmarks/benchmark_throughput.py](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/blob/main/benchmarks/benchmark_throughput.py)，设备为 1*A6000，数据为 [ShareGPT_V3_unfiltered_cleaned_split.json](https://link.zhihu.com/?target=https%3A//huggingface.co/datasets/anon8231489123/ShareGPT_Vicuna_unfiltered/resolve/main/ShareGPT_V3_unfiltered_cleaned_split.json) 使用其中 1000 个 prompt 样本。

vllm 的运行命令为：

python3 benchmarks/benchmark_throughput.py --dataset benchmarks/ShareGPT_V3_unfiltered_cleaned_split.json 
HuggingFace 的代码运行命令为：

python3 benchmarks/benchmark_throughput.py --dataset benchmarks/ShareGPT_V3_unfiltered_cleaned_split.json --backend hf --hf-max-batch-size 4
二者 Throughput 的性能如下图所示，vllm 的性能约是HuggingFace 性能的 8.19 倍。

![](https://pic3.zhimg.com/v2-42b49269ea6a046c4e3308e6946d067c_r.jpg)同时，也可以选择使用 TP (Tensor Parallelism) 并行方式以加快速度，其使用方式如下：

python3 benchmark_throughput.py -tp 4 --dataset ShareGPT_V3_unfiltered_cleaned_split.json 
结果如下所示，TP 从 1 到 4 的过程中 Throughput 逐渐增大，这是因为 TP 加快了推理速度，当 TP 为 8 时性能反而下降，这是因为卡间通信的成本增加超过了 TP 的性能增益。

![](https://picx.zhimg.com/v2-6b465b380ec85b647294449c53f2a05f_r.jpg)<strong>3.2.3 服务端测评</strong>

在使用 vLLM 进行在线服务时，可以通过以下命令启动一个兼容 OpenAI API 的服务器。

python3 -m entrypoints.openai.api_server --model lmsys/vicuna-13b-v1.3
然后利用与 OpenAI API 相同的格式来查询服务器，命令如下：

```bash
curl http://localhost:8000/v1/completions \-H"Content-Type: application/json" \-d '{"model": "lmsys/vicuna-13b-v1.3","prompt": "San Francisco is a","max_tokens": 128,"temperature": 1.0 }'
```

输出结果如下：

{"id":"cmpl-4049e3ad12964d19b9f2810d0ea7a3df","object":"text_completion","created":1687519516,
"model":"lmsys/vicuna-13b-v1.3",
"choices":[{"index":0,"text":"city and county in California, United States, located on the northern end of the San Francisco Peninsula. It is the fourth most populous city in California and the 14th most populous city in the United States, with a population of 883,305 as of 2020.\n\nSan Francisco is known for its iconic landmarks, including the Golden Gate Bridge, Alcatraz Island, Fisherman's Wharf, the cable cars, and Chinatown, one of the largest Chinatowns in the world outside of Asia. It is also known","logprobs":null,"finish_reason":"length"}],"usage":{"prompt_tokens":5,"total_tokens":133,"completion_tokens":128}}
当然也可以进行本地部署

python3 -m entrypoints.api_server --model lmsys/vicuna-13b-v1.3
然后测试本地服务的性能

python3 benchmark_serving.py --dataset ShareGPT_V3_unfiltered_cleaned_split.json --tokenizer lmsys/vicuna-13b-v1.3
得到性能结果如下：

Throughput: 1.95 requests/s
Average latency: 240.29 s
Average latency per token: 0.91 s
Average latency per output token: 5.84 s

参考资料
[1] [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2205.14135.pdf)

[2] [xformers/xformers/ops/fmha/__init__.py at c14be66d1d5479b51d51ed4dfbae3abe7cb39a7b · facebookresearch/xformers (github.com)](https://link.zhihu.com/?target=https%3A//github.com/facebookresearch/xformers/blob/c14be66d1d5479b51d51ed4dfbae3abe7cb39a7b/xformers/ops/fmha/__init__.py%23L285)

[3] [FlashAttention图解（如何加速Attention） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/626079753)

[4] [https://shreyansh26.github.io/post/2023-03-26_flash-attention/](https://link.zhihu.com/?target=https%3A//shreyansh26.github.io/post/2023-03-26_flash-attention/)

[5] [Roofline Model与深度学习模型的性能分析 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/34204282)

[6] [FlashAttention 反向传播运算推导 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/631106302)

[7] [HazyResearch/flash-attention: Fast and memory-efficient exact attention (github.com)](https://link.zhihu.com/?target=https%3A//github.com/HazyResearch/flash-attention/tree/main)

[8] [vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention](https://link.zhihu.com/?target=https%3A//vllm.ai/)

[9] [https://github.com/vllm-project/vllm](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm)

[10] [Welcome to vLLM!](https://link.zhihu.com/?target=https%3A//vllm.readthedocs.io/en/latest/)

[11] [https://www.anyscale.com/blog/continuous-batching-llm-inference](https://link.zhihu.com/?target=https%3A//www.anyscale.com/blog/continuous-batching-llm-inference)

[12] [https://courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf](https://link.zhihu.com/?target=https%3A//courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf)

我志在寥阔，畴昔梦登天。摩娑素月，人世俯仰已千年。 —— 辛弃疾《水调歌头》