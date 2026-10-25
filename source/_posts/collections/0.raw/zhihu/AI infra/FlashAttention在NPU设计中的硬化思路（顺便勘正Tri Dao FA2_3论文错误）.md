---
title: "FlashAttention在NPU设计中的硬化思路（顺便勘正Tri Dao FA2/3论文错误）"
date: 2026-06-20
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2051636583225468285

---

最近在做自研 NPU 的架构及建模设计，就免不了 FlashAttention 的近似 asic 流水化来提高计算效率。本篇作为专栏首篇，先大致介绍一下整体思路。

0. 开篇
看 FlashAttention 的时候，很多人第一反应是：它是不是用了某种近似 attention？

答案显然是否定的。FlashAttention 的结果仍然是精确 attention。它真正厉害的地方在于：**不显式保存完整的 **
![](https://www.zhihu.com/equation?tex=N+%5Ctimes+N)** attention matrix，也能在分块计算中得到和标准 softmax 等价的结果。**

这里的关键就是 Online Softmax，这篇文章先讨论一下整个计算流程，后续文章再具体探讨 设计 NPU 时怎么把它跑满。顺便也解释一下 FlashAttention-3 早期算法伪代码截图里第 21 行的一个容易误导的地方。

![](https://pica.zhimg.com/v2-a065f0ebbde3e17c02b89e5772d8f884_r.jpg)FlashAttention-3 Algorithm 1 截图，注意第 21 行的缩放项这个错误困扰了我几个小时，和自己推导结果不一致，翻遍了 arxiv 和 tri dao 的网站发现 FA2-3 均出现该错误。最终在 [猛猿](https://www.zhihu.com/people/lemonround) 大佬这里找到了答案，证明确实是作者笔误或是其他原因：

**可能在有些朋友下载的 V2 论文中，第十行这里 O 前面的因子项是** 
![](https://www.zhihu.com/equation?tex=diag%28...%29%5E%7B-1%7D) **，这个公式应该是错误的**（大家动手推一下就可知，初次看到时让我困扰了很久）。在作者个人主页的[论文链接](https://link.zhihu.com/?target=https%3A//tridao.me/publications/flash2/flash2.pdf)中，这个 typo 已经被修正。[图解大模型计算加速系列：Flash Attention V2，从原理到并行计算](https://zhuanlan.zhihu.com/p/691067658)
1.标准 Attention 公式
标准 attention 可以写成：

![](https://www.zhihu.com/equation?tex=+%5Coperatorname%7BAttention%7D%28Q%2CK%2CV%29+%3D+%5Coperatorname%7Bsoftmax%7D%5Cleft%28%5Cfrac%7BQK%5ET%7D%7B%5Csqrt%7Bd_k%7D%7D%2BM%5Cright%29V+)

其中 
![](https://www.zhihu.com/equation?tex=M) 是 mask。自回归大模型里常见的是 causal mask，用来屏蔽未来 token。

这篇文章主要关注 softmax 的分块问题，下面先省略缩放因子和 mask，简化成：

![](https://www.zhihu.com/equation?tex=+O%3D%5Coperatorname%7Bsoftmax%7D%28QK%5ET%29V+)

分解为三步：

![](https://www.zhihu.com/equation?tex=+S%3DQK%5ET+) 

![](https://www.zhihu.com/equation?tex=+P%3D%5Coperatorname%7Bsoftmax%7D%28S%29+) 

![](https://www.zhihu.com/equation?tex=+O%3DPV+)
为了防止数据溢出，一般会采用 safe softmax，其公式为： 

![](https://www.zhihu.com/equation?tex=+softmax%28%5Cboldsymbol%7Bz_i%7D%29+%3D+%5Cfrac%7Be%5E%7Bz_i-z_m%7D%7D%7B%5Csum_%7Bj%3D1%7D%5EK+e%5E%7Bz_j-z_m%7D%7D+)

其中 
![](https://www.zhihu.com/equation?tex=z_m) 为 
![](https://www.zhihu.com/equation?tex=z_i) 中的最大值，这里的 
![](https://www.zhihu.com/equation?tex=z_i) 就是 
![](https://www.zhihu.com/equation?tex=score) 。这个操作不改变 softmax 结果，因为分子分母同时乘了同一个系数。按照常规思路，我们就需要遍历所有的 
![](https://www.zhihu.com/equation?tex=z_i) 找到最大值。普通 attention 如果直接生成完整的 
![](https://www.zhihu.com/equation?tex=S) 和 
![](https://www.zhihu.com/equation?tex=P)，中间矩阵都是 
![](https://www.zhihu.com/equation?tex=N+%5Ctimes+N)。序列长度一大，显存占用和 HBM 读写都会非常重。

FlashAttention 的思路是：**把 **
![](https://www.zhihu.com/equation?tex=Q%2FK%2FV)** 分块搬到片上 SRAM/SMEM，边算边更新 softmax 的中间统计量，不把完整 **
![](https://www.zhihu.com/equation?tex=S%2FP)** 写回片外内存。**FlashAttention 的 Online Softmax 就是在分块过程中动态维护这个 局部最大值。

2.  FA3 的算法及工程计算步骤

![](https://pic2.zhimg.com/v2-bfaaf8caab853d42d776ac23a2dace85_r.jpg)FlashAttention-3 Algorithm 1 截图，注意第 21 行的缩放项这里补充更工程上的计算过程：

![](https://www.zhihu.com/equation?tex=for+%5C+i+%3D+1%5C++to+%5C+N%5C+do++) 
![](https://www.zhihu.com/equation?tex=+%5Cbegin%7Baligned%7D+x_i+%26%5Cleftarrow+Q%5Bk%2C%3A%5D+K%5E%5Ctop%5B%3A%2Ci%5D+%5C%5C+%5C+%5C+m_i+%26%5Cleftarrow+%5Cmax%28m_%7Bi-1%7D%2C%5C%3B+x_i%29+%5C%5C+d_i%27+%26%5Cleftarrow+d_%7Bi-1%7D%27+%5C%2Ce%5E%7Bm_%7Bi-1%7D-m_i%7D+%2B+e%5E%7Bx_i+-+m_i%7D+%5C%5C+%5Ctilde%7Bo%7D_i%27+%26%3D+%5Ctilde%7Bo%7D_%7Bi-1%7D%27+%5C%2Ce%5E%7Bm_%7Bi-1%7D-m_i%7D+%2B+e%5E%7Bx_i+-+m_i%7D+V%5Bi%2C%3A%5D++%5Cend%7Baligned%7D) 
![](https://www.zhihu.com/equation?tex=+end++) 
![](https://www.zhihu.com/equation?tex=++%5Cbegin%7Baligned%7D+o_N%27+%26%3D+%5Cfrac%7B%5Ctilde%7Bo%7D_N%27%7D%7Bd_N%27%7D+%5C%5C+O%5Bk%2C%3A%5D+%26%5Cleftarrow+o_N%27+%5Cend%7Baligned%7D+)

公式的具体推导可参靠知乎其他文章，本篇重点为硬件流程。

3. FA 在 AI 推理芯片/NPU 中的硬化思路
FA3 的算法是针对 GPU 的，那么在自研 AI 芯片/NPU 中，有没有办法更高效的完成 FlashAttention 计算呢？

答案肯定是有的，那就是把 online softmax 粗指令拆解为各种 矩阵乘 规约 EXP RECIP 等指令，加以合理的流水线编排，实现 FlashAttention 的全流水计算。 

结合上述算法和工程计算步骤，这里给出适配 AI 推理芯片/NPU 的简要计算过程，可结合下图进行理解：

![](https://pic1.zhimg.com/v2-955169f767f18af6d58bf9c1df3cfb5e_r.jpg)当j为2时的FlashAttention计算步骤
![](https://pic4.zhimg.com/v2-125267422d7970d2bb28dd1be6ef9387_r.jpg)简化版流程补充说明：

1.在硬件设计时，规约 max，规约 add 的并行度取决于 vector engine，如果并行度小于 Bc，则需要将 j 小块再拆分为与并行度粒度相配套的更小块。假设 vector 是 32 lane 的，而分的小块尺寸 Bc 是 256，那么 vector 一次规约可以算 64 个数据，也就是需要将 Bc 拆分为 4 个 64 的更小块。那么一个 j 小块的规约计算就需要 4 次才能完成，做成全流水的差不多 6+3 拍完成。

2.在 AI 推理芯片的硬件设计中，上述的规约计算 矩阵计算 以及 exp 计算 等均可以做成全流水的以最大化吞吐率 。

3.可以发现，在上述计算过程中，K 小块和 V 小块矩阵不需要同时存在，可以先 load K 小块到 SMEM 完成相关计算，然后在 K 小块完成所有计算之前提前 load V 小块。该方法比直接 load KV 小块可节省一半的 SMEM 使用量，进而可以将每个 KV 小块分的大一些。

这里留个悬念，其中步骤 6 的第二个公式按照常规思路是没办法全流水的，吞吐率会砍半，可以思考下为什么有这个问题，下篇文章会针对这个问题展开。

4.  FA3 算法 21 行原文错误
Arxiv 和 tri dao 个人博客上 FlashAttention-3 伪代码截图里，第 21 行写成了：

![](https://www.zhihu.com/equation?tex=+%5Coperatorname%7Bdiag%7D%28%5Cexp%28m_i%5E%7Bold%7D-m_i%29%29%5E%7B-1%7DO_i+)

从 Online Softmax 推导看，这里不应该有 
![](https://www.zhihu.com/equation?tex=%5E%7B-1%7D)。

新的 block 加入后，旧的结果需要进行缩放。假设旧 block 已经处理完，旧最大值是：

![](https://www.zhihu.com/equation?tex=+m%5E%7Bold%7D+)

旧的部分和是：

![](https://www.zhihu.com/equation?tex=+%5Cell%5E%7Bold%7D+%3D+%5Csum_%7Bx%5Cin+old%7D%5Cexp%28x-m%5E%7Bold%7D%29+)

现在来了一个新 block，新的最大值变成：

![](https://www.zhihu.com/equation?tex=+m%5E%7Bnew%7D+%3D+%5Cmax%28m%5E%7Bold%7D%2C%5Coperatorname%7Browmax%7D%28S%5E%7Bnew%7D%29%29+)

旧 block 里的每个 score 
![](https://www.zhihu.com/equation?tex=x)，原来是按 
![](https://www.zhihu.com/equation?tex=m%5E%7Bold%7D) 缩放：

![](https://www.zhihu.com/equation?tex=+%5Cexp%28x-m%5E%7Bold%7D%29+)

但现在全局 softmax 要统一按 
![](https://www.zhihu.com/equation?tex=m%5E%7Bnew%7D) 缩放，所以旧项要改成：

![](https://www.zhihu.com/equation?tex=+%5Cexp%28x-m%5E%7Bnew%7D%29+)

两者关系是：

![](https://www.zhihu.com/equation?tex=+%5Cexp%28x-m%5E%7Bnew%7D%29+%3D+%5Cexp%28x-m%5E%7Bold%7D%29%5Cexp%28m%5E%7Bold%7D-m%5E%7Bnew%7D%29+)

因此旧部分和要乘：

![](https://www.zhihu.com/equation?tex=+%5Cexp%28m%5E%7Bold%7D-m%5E%7Bnew%7D%29+)

而不是文章里写的除。

5. 小结
Online Softmax 的核心是维护：

![](https://www.zhihu.com/equation?tex=+m%2C%5Cquad+%5Cell%2C%5Cquad+O+)

每加入一个新 block，就更新 row max：

![](https://www.zhihu.com/equation?tex=+m%5E%7Bnew%7D%3D%5Cmax%28m%5E%7Bold%7D%2C%5Coperatorname%7Browmax%7D%28S%5E%7Bnew%7D%29%29+)

然后把旧部分和 和旧输出统一缩放到新尺度：

![](https://www.zhihu.com/equation?tex=+%5Cexp%28m%5E%7Bold%7D-m%5E%7Bnew%7D%29+)

所以：

![](https://www.zhihu.com/equation?tex=+%5Cell%5E%7Bnew%7D+%3D+%5Cexp%28m%5E%7Bold%7D-m%5E%7Bnew%7D%29%5Cell%5E%7Bold%7D+%2B+%5Coperatorname%7Browsum%7D%28%5Ctilde+P%5E%7Bnew%7D%29+) 

![](https://www.zhihu.com/equation?tex=+O%5E%7Bnew%7D+%3D+%5Cexp%28m%5E%7Bold%7D-m%5E%7Bnew%7D%29O%5E%7Bold%7D+%2B+%5Ctilde+P%5E%7Bnew%7DV%5E%7Bnew%7D+)

最后：

![](https://www.zhihu.com/equation?tex=+O_%7Bfinal%7D%3D%5Cfrac%7BO%7D%7B%5Cell%7D+)

如果只记一句话：

 FlashAttention 能分块算出精确 attention，是因为 Online Softmax 每次都会把旧结果重新缩放到新的 row max 尺度下，而不是简单把每个 block 的 softmax 结果相加。刚才留了个悬念，下篇文章将会介绍 当把这套算法放到推理芯片/NPU 上时，
![](https://www.zhihu.com/equation?tex=%5Cell_i%3Da_i%5Cell_%7Bi-1%7D%2Br_i) 这种递推会怎样影响全流水吞吐率，以及如何通过 lookahead 展开把它做成等价一拍一个输出的高吞吐结构。

[如何在NPU设计中加速 FlashAttention 计算](https://zhuanlan.zhihu.com/p/2051710181810103708)参考：

- FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision：[HTTPS://arxiv.org/abs/2407.08608](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.08608)
- Dao-AILab/flash-attention 官方实现：[HTTPS://GitHub.com/Dao-AILab/flash-attention](https://link.zhihu.com/?target=https%3A//github.com/Dao-AILab/flash-attention)