---
title: "有没有什么比TPU更好的实现矩阵乘法的脉动阵列？"
date: "2026-05-23 00:00:00"
updated: "2026-05-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/有没有什么比TPU更好的实现矩阵乘法的脉动阵列/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/1907759496014571228/answer/2041310753362371733"
---


两年前我用 chisel 从头开始设计 NPU。当时想的很简单，做一个最简单的基于脉动矩阵的矩阵乘法单元，然后放在 FPGA 上面稍微验证一下。中间磕磕绊绊两年多，也因为自己个人的工作原因没有时间继续写。现在抽空终于在板子上面验证了，也就借着这个机会写个知乎分享一下自己的探索和尝试。

[https://github.com/mpskex/chisel-npu](https://link.zhihu.com/?target=https%3A//github.com/mpskex/chisel-npu)[https://chisel-opennpu.readthedocs.io/en/latest/](https://link.zhihu.com/?target=https%3A//chisel-opennpu.readthedocs.io/en/latest/)在做 NPU / systolic array 设计时，有三种经典 dataflow：

- 输入驻留 Input Stationary（不常见）
- 权重驻留 Weight Stationary（WS）
- 输出驻留 Output Stationary（OS）其中最常见的就是输出驻留了，因为现在的加速器都要考虑 Transformer 的结构，其中的注意力机制很难抽象成权重驻留的数据流。但是我们知道，输出驻留中输出的位置是一直固定不变的。那么也就造成了在调度的时候需要等待所有脉动的数据流全部流完脉动矩阵才可以写回。

但是我们一直说 输出驻留<strong>（OS）</strong>，但输出真的一定要驻留的吗？一定要等所有数据流干才可以写回吗？ 答案是：<strong>在空间上是，但在时间上不是，而且不需要等待数据流干也可以直接写回。</strong> 本篇文章将从以下几点来介绍

- 什么是脉动矩阵，什么又是输出驻留与权重驻留
- 如何让一切都脉动起来：在 <strong>时间-空间上</strong> 把矩阵乘法切开
 1. 矩阵乘法是什么？
先从最原始的定义开始： 
$$C=\sum_k A_{i,k} B_{j,k}$$


我们从数据关系的角度来看，会发现矩阵乘法虽然数据计算量很多，但是有很多地方可以重复使用数据。比如对于一个输出 
$C(i,j)$ 它依赖：

- A 的一整行：A(i, :) 
- B 的一整列：B(:, j)这意味着：

- A 会在 <strong>行方向被复用</strong>
- B 会在 <strong>列方向被复用</strong>所以设计 Matmul 器件可以被暴力理解为 <strong>数据复用 + 调度问题</strong>。解决数据通路的节拍和路径是设计 NPU 的最核心挑战。

## 2. 脉动矩阵 （Systolic Array） 在做什么？

脉动矩阵（Systolic array）本质上就是一种：用 <strong>空间结构</strong>来实现 <strong>数据复用</strong>以实现计算加速的器件设计。

一般的脉动矩阵会由 
$N\times N$ 个处理单元（Processing Element），又称作 PE 组成。每个处理单元只做一次乘法，一次加法：将由上方左方的两个输入相乘，并和累加器相加。同是处理单元会将这两个输入分别传递给下右临近的处理单元。

详细的脉动矩阵逐帧的演示就不过多赘述，相比各位都在学校或多或少学习过相关的知识了。

我推荐几篇写的比较好的知乎文章：

[计算机体系结构：脉动阵列](https://zhuanlan.zhihu.com/p/650209037)[【AI系统】谷歌 TPU v1-脉动阵列](https://zhuanlan.zhihu.com/p/5696668225)[GEMM的脉动阵列、内积、外积的硬件架构与特征比较](https://zhuanlan.zhihu.com/p/1997608528660153669)每个处理单元（Processing Elements：PE）会累加两个输入，并存储在累加器里面 （Accumulator）。对应的两个输入也会原封不动的传递到下一个邻近的单元里。

        ACCUM   IN_B
           \     |
            \    |
             \___v___
             | Proc  |
   IN_A ---->| Elem  |
              ¯¯¯|¯¯¯
                 |
                 v
                OUT (to TLB mapped memory)

$$\text{Acc}(i,j) = A(i,k) * B(j, k) + \text{Acc}(i,j)$$


处理单元有很多种设计方式。我们可以通过增加更多 ALU 来实现更多功能。有些器件厂商也把这种特殊 PE 的设计称作为三维脉动矩阵，在本文的考量范围里，如果脉动矩阵构建和组织的方式不是三维，那么就不能称之为拓扑意义上的三维脉动矩阵。所以通过扩大字宽来实现的只能算作特殊处理单元设计。

### 2.1 权重驻留 (Weight Stationary)

权重驻留顾名思义，就是权重保留在处理单元内部。数据流的一边（比如上方）固定在处理单元内部，另一边（比如左侧）流入。而部分求和结果会替代原来的两个输入的传递从上左方输入传递到下右方。

这种方式的优点就是对于权重小的网络来说，可以减少权重挪动的次数。但是缺点就是部分求和结果位宽比较大，对中间的寄存器的消耗相对较多。同时，对于现今大语言模型权重巨大的情景来说，是完全不适用的。

### 2.2 输出驻留（Output Stationary）

输出驻留更好理解，也就是每个 PE 负责一个输出位置的结果，并且一直保存直到写回。与权重驻留相反，两个输入都在脉动矩阵中从上左流动到下右。这样累加器的结果永远保持在同一个处理单元中，不需要全局的累加。但是缺点也是显而易见的，两个输入需要一直保持流入，而且流入的后面和写回的前面需要有 
$O(N)$ 的空泡。因为需要保证全部输入都流出干净，我们才能写回累加器的值。

这里就有一点很值得注意：

- 一定要等到所有的输入流入才能开始计算吗？
- 一定要等到所有的输出流出才能开始写回吗？实则不然，我们其实可以通过分析脉动矩阵计算的本质来设计器件，能够将矩阵乘法在时间上分解。这样分解以后的矩阵乘法在调度上更加干净，而且可以预测，同时还可以支持更连续的大矩阵计算。
 

## 3. 让一切都脉动起来！

我的英文原文写的更完善一点（两年前时间充裕），想看的可以看这里：

[https://chisel-opennpu.readthedocs.io/en/latest/implementations/SystolicArray/](https://link.zhihu.com/?target=https%3A//chisel-opennpu.readthedocs.io/en/latest/implementations/SystolicArray/)我们为了继续深入探讨输入流和输出留的时序，不妨在不同的时间上画几张图来方便理解：

![](https://pic1.zhimg.com/v2-35c6c7339d7aa477334595bb4ac1106c_r.jpg?source=2c26e567)其实在第1个时刻，真正参与计算的只有位置（0，0）。剩余的部分完全是空闲的。也就是我们所谓的计算气泡。

![](https://pica.zhimg.com/v2-a5d6ba6918603601bb016ef7f56eb556_r.jpg?source=2c26e567)对于 4x4 的脉动矩阵，第四个时刻的时候，其实已经有一个位置的累加器已经完成了所有位置的计算。那么在这个时刻，这个位置的累加器结果已经可以读出了。

![](https://pic1.zhimg.com/v2-a0175d0177b7822ec51cebfd61f78049_r.jpg?source=2c26e567)接着往下看，第五个时刻，已经有两个位置可以完成进行累加器的写回。

![](https://pic1.zhimg.com/v2-8bc2001603951937918ee31d0e726fc6_r.jpg?source=2c26e567)我们再看第七个时刻（上图）

我们会发现：诶？这个输出位置的模式好像有点规律可循，这些写回的样式也都是跟随着脉动矩阵流出的方向一点点传播的。那么问题就很简单了。我们要让一切都脉动起来！（没有广告费）

我们简单地为控制信号也创建一个一维的脉动矩阵

![](https://pic1.zhimg.com/v2-e7e1006615cf4979bfd54e277319821f_r.jpg?source=2c26e567)这样在第一个时刻到来时，第一个输入伴随着清空累加器的控制到来，随着脉动输入的流入，所有矩阵内的累加器都会被清空。同时当最后一个输入流入时，读出信号伴随输入流入。这样在流出过程中输出会一点点地从脉动矩阵中挤出来。所以通过这样的设计，我们可以获得完全流式的脉动矩阵实现：

![](https://pic1.zhimg.com/v2-aa093688afb6b65f5f8443bd24211ae3_r.jpg?source=2c26e567)wavedrom 图，原版在这里：https://chisel-opennpu.readthedocs.io/en/latest/implementations/SystolicArray/#mk-streaming-reduction把它翻译成NPU元语就是这样：

.code
main:

```text
    # prepare the registers for matrix A, bank0 - bank3 (vb0-vb3), 4x8bits per bank
    # prepare the registers for matrix B, bank4 - bank7 (vb4-vb7), 4x8bits per bank
    # prepare the registers for matrix C, bank8 - bank11 (vb8-vb11), 4x8bits per bank
    # prepare the registers for matrix Y, bank12 - bank15 (vb12-vb15), 4x8bits per bank
    mma         vb0, vb4, vb8, vb12
    mma         vb1, vb5, vb9, vb13
    mma         vb2, vb6, vb10, vb14
    mma.last    vb3, vb7, vb11, vb15
    nop
```

这样我们可以有更加细粒度的矩阵乘法调度了。也就意味着，通过合理的调度设计，完全可以完成一个节拍 Load，一个节拍输入，（空闲调度，可以分配并行向量计算），一个节拍 Store。并且整个流水线可以完全转起来，并且中间的调度气泡的时间时完全确定的。

![](https://picx.zhimg.com/v2-df86f6d76f5b08aee0b049c635d874ab_r.jpg?source=2c26e567)理论上这个器件可以支持任意长度的矩阵乘法（ 
$K \times N$ ）只要 K 大于等于 N。

具体的推导我准备专门结合发射前端设计来介绍。心急的同学可以先去看英文的文档：

[https://chisel-opennpu.readthedocs.io/en/latest/](https://link.zhihu.com/?target=https%3A//chisel-opennpu.readthedocs.io/en/latest/)
FPGA 验证
具体的先不讲太多了，现在很多地方没有定型。但我必须要吹一下，我这个 FPGA 是我捡垃圾淘来的。整个系统成本不到 400 块人民币。（我不卖硬件，但为了防止硬件价格水涨船高，具体配置感兴趣的同学可以问我...）

![](https://picx.zhimg.com/v2-e211ebc8a4bef3a2455a23e9020eec3e_r.jpg?source=2c26e567)32 x 32 的脉动矩阵完全可以运行在带有 XDMA IP 的 Xilinx 7-Series Kintex 480T 上。我手里的这块板子有 4GB DDR3 内存，所以完全可以使用 Xilinx XDMA Driver 通过直接读写 PCI BAR 和 AXI register 的方式控制 NPU 的计算。现在已经验证了上面的功能，欢迎各位来测！

相关阅读（感谢解读我的项目）
[FPGA前沿项目：FPGA开发者学习NPU的一条捷径 通过chisel-npu项目学习Chisel和NPU架构设计](https://zhuanlan.zhihu.com/p/710852593)