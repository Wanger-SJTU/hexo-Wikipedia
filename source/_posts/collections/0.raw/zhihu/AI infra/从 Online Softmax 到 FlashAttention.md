---
title: 从 Online Softmax 到 FlashAttention
date: "2026-03-16 00:00:00"
updated: "2026-03-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/从-Online-Softmax-到-FlashAttention/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2016897558933426874
---


翻译自 [https://courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf](https://link.zhihu.com/?target=https%3A//courses.cs.washington.edu/courses/cse599m/23sp/notes/flashattn.pdf)
 FlashAttention 核心创新在于采用了与 Online Softmax 类似的思想，对自注意力计算进行分块计算。从而我们可以融合整个多头注意力层，不用去访问 GPU 全局内存来存储中间的 logits 和注意力分数。这篇笔记中，我将简要的解释下为什么分块 self-attention 计算并非易事，如何驱动 FlashAttention 计算从 online softmax 这个技巧。

Self-Attention
Self-Attention 计算可以被总结为（这里忽略 heads 和 batchs，因为这两个维度可以被完全并行计算，为了简单这里也忽略 masks 和 scales factor
$\frac{1}{\sqrt{D}}$）：

$$O = softmax(Q K^T) V$$


这里
$Q$,
$K$,
$V$,
$O$的维度都是
$(L, D)$，这里的
$L$是序列长度，
$D$是每个 head 的维度（别名 head dim），softmax 作用到最后一个维度（列维度）。

$X=QK^T$, 
$A = softmax(X)$, 
$$O=AV$$


我们称
$X$为预 softmax logits，
$A$矩阵是 attention 打分，
$O$矩阵是输出。

关于 FlashAttention，一个惊人的事实是我们不需要实例化
$X$和
$A$矩阵在全局Safe Softmax内存中。相反我们融合整个计算在单个内核中。这需要我们设计一个谨慎管理片山内存的算法，因为 NVIDIA 的 GPU 共享内存是很小的。

对于经典算法如矩阵乘，tiling 被用来确保片上内存不会超过硬件限制。图中展示了一个例子。在 kernel 执行期间，仅有 
$3T^2$ 的元素被存储在片上，无论矩阵形状如何。这个分片方法是有效的，因为<strong>加法满足结合律</strong>，这使得我们可以将整个矩阵乘法<strong>分解</strong>为多个分块矩阵乘法的<strong>和</strong>。

![](https://picx.zhimg.com/v2-b8109ba10cca0c5b6a850b5677b62129_r.jpg)

这张图主要是介绍了如何对矩阵乘法
$C=A\times B$的输入和输出进行分片。矩阵被分为
$T\times T$块。对于每个输出块，我们从左到右遍历 A 相关块，从上到下遍历 B 的相关块，加载数据从全局内存中给到片上内存，整体片上内存占用大小
$O(T^2)$，对于逐片部分矩阵乘，针对位置
$(i, j)$我们加载该分块内所有 k 对应的
$A[i, k]$和
$B[k, j]$（红色标注），然后再片上内存中将
$A[i,k] \times B[k, j]$累加到
$C[i, j]$。在一个分块处理完成后，我们将
$C$的片上数据写回主存中，然后移动到下一个分块上继续计算，
$[i, j]$所有分块都计算完成后，此分块的最终结果也就算是得到了。

然而，自注意力机制中包含了 <strong>softmax 算子</strong>，而它<strong>不具备直接的结合律</strong>，这使得我们难以像图 1 那样简单地对自注意力进行分块计算。那么，是否存在一种方法能让 softmax 满足结合律呢？

Safe Softmax
首先让我们回想下 softmax 运算，下面是 softmax 计算通用公式。 
$\text{softmax}(\{x_1, \dots, x_N\}) = \left\{ \frac{e^{x_i}}{\sum_{j=1}^{N} e^{x_j}} \right\}_{i=1}^N$ 注意这里的
$x_i$也可能非常大，
$e^{x_i}$很容易就溢出了。例如，float16 最大值支持 65536。这意味着
$x>=11$的时候就要超过有效表示范围了。这里通常会采用个小技巧， 
$$\frac{e^{x_i}}{\sum_{j=1}^{N} e^{x_j}} = \frac{e^{x_i - m}}{\sum_{j=1}^{N} e^{x_j - m}}$$


为了减少这个问题，这里通常会采用个小技巧，

这里的
$m = \max_{j=1}^{N} (x_j)$，这样
$x_i-m<=0$，就保证了指数运算符不会溢出。

然后，我们可以总结 saft softmax 的计算作为以下的 3-pass 算法。

3-pass safe softmax 算法
注释

$\{m_i\}$:
$\max_{j=1}^{N} \{x_j\}$，初始值为
$$m_0=-\infty$$


$\{d_i\}$: 
${\sum_{j=1}^{N} e^{x_j - m_N}}$，
$d_0=0$，
$d_N$是 saft softmax 的分母。

$\{a_i\}$: 最终的 softmax 值

![](https://pic3.zhimg.com/v2-d68120d6f5ac2a1fe6e569c371861a3c_r.jpg)这个算法需要迭代
$[1, N]$三次。自注意力中，
$\{x_i\}$是 softmax 前的 logits，由
$QK^T$得出。这意味着我们无法保存全部的 logit 值（没有足够的片上 SRAM 来存储它们）。就必须三次访问 Q 和 K（以便在计算时重新生成 logit），而这种方式的 I/O 效率很低。

Online Softmax
如果我们将公式 7，8，9 融合到一个单步循环中，我们就可以减少全局内存访问次数从 3 次到 1 次。不幸的是我们不能融合 7，8 在同一个循环中，因为 8 中依赖
$m_N$，这个只有在第一次循环完成时才能确认。

我们创建了另外一个公式
$d_i' := \sum_{j=1}^{i} e^{x_j - m_i}$作为原来的替代公式 8
$d_i := \sum_{j=1}^{i} e^{x_j - m_N}$的替代，这里移除了对 
$N$的依赖。这两个公式第N个项目是相同的
$d_N=d'_N$，因此我们可以完全替代公式9中的
$d_N$使用
$d'_N$，我们也发现了
$d'_i$和
$d'_{i-1}$ 的关系：

![](https://picx.zhimg.com/v2-680d1cec61cf4793cb416c0b0a08a725_r.jpg)这个递归仅依赖于
$m_i$和
$m_{i-1}$，我们可以计算
$m_j$和
$d'_j$在同一个循环中。

![](https://pic1.zhimg.com/v2-32a86cabd8654f54cce204f753cb156a_r.jpg)这个就是 Online Softmax 算法。然而这个仍需要两步完成 softmax 计算，我们可以减少到一步吗？

FlashAttention
不幸的是，对于 Softmax 减少到一步答案是不可以的，但是 Self-Attention 是可以的。我们最终的目标不是 Attention 矩阵得分
$A$，而是矩阵
$O$，这个等于
$A\times V$。对于
$O$来讲，我们可以找到一步递归形式么？

让我们来尝试推导 self-attention 计算的第
$k$行推导为递归算法（所有行的计算相互独立，为简化起见，我们只说明一行的计算）：

Self-Attention 多步算法

![](https://pic2.zhimg.com/v2-e0b0ee85ee9d1ddf4365395a6f340cab_r.jpg)让我们用等式 11 定义的替换等式 12 中的
$a_i$：

![](https://pic1.zhimg.com/v2-d139cfa5b1cfb07043f0c62db2a039b4_r.jpg)公式能依赖于
$m_N$和
$d'_N$，这两个需要前边循环结束才能确定下来。这里我们仍然可以利用之前替代的小技巧，通过创建替代序列
$o'$：

![](https://pic2.zhimg.com/v2-7ca32e870073732fd5e8365d0d5f6df3_1440w.jpg)
$o$和
$o'$的第
$n$个元素是相同的：
$o'_N=o_N$，这样我们就找到了
$o'_i$和
$o'_{i-1}$递归关系：

![](https://pic2.zhimg.com/v2-9e26380b8bc92c34042692df4848f899_r.jpg)这里的
$o'_i$仅依赖
$d'_i$、
$d'_{i-1}$、
$m_{i-1}$、
$m_i$和
$x_i$，因此我们可以融合 Self-Attention 所有计算放到一步中。

FlashAttention 算法

![](https://pic2.zhimg.com/v2-754ca81e057e42df44457107d6ccc463_r.jpg)状态
$x_i$，
$m_i$，
$d'_i$和
$o'_i$占用空间很小，可以轻松的放到 GPU 共享内存中。因为所有操作都满足交换律，所以很容易使用 tiling。如果我们计算按 tile 切换计算状态，那么算法就变为如下了：

分块 FlashAttention 算法

![](https://pic1.zhimg.com/v2-64b1e48a0989d3575db53f78893b727c_r.jpg)
![](https://picx.zhimg.com/v2-5decf7320868033a8bf7d9bfcabc1ed1_r.jpg)
![](https://pic3.zhimg.com/v2-e8fb41260aff63f343e314e082066950_r.jpg)这张图介绍了 FlashAttention 如何在硬件上计算的。蓝色块表示放在 SRAM 中的分块，而红色的块表示第
$i$行。
$L$表示的是序列长度，可以很大（例如 16k），
$D$表示的是 head 维度，通常很小（GPT3 为 128），
$B$是可以控制的区块 block size。

值得注意的是，总得 SRAM 占用空间大小仅仅依赖于
$B$和
$D$，而不依赖于
$L$。因此算法可以扩展到很长的上下文，也不会遇到内存上的问题。计算过程中，我们对
$K^T$和
$A$从左到右遍历分块，从上到下遍历
$V$，分别更新状态
$m$，
$d$，
$O$。