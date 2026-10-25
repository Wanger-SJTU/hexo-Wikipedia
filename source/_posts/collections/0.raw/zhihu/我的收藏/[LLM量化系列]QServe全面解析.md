---
title: "[LLM量化系列]QServe全面解析"
date: "2024-11-11 00:00:00"
updated: "2024-11-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[LLM量化系列]QServe全面解析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/700538726
---


QServe是MIT Han-Lab和NVIDIA合作推出的W4A8KV4量化新作，笔者觉得是近期算法和工程结合地非常紧密的一篇文章，里面干货很多，有大量的实现细节，而且每个部分都有很多延展。本文主要是结合自己的理解对它做一个比较全面的解析，权当做学习笔记。

论文地址：[QServe: W4A8KV4 Quantization and System Co-design for Efficient LLM Serving](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.04532)
代码地址：[https://github.com/mit-han-lab/qserve](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/qserve)
### Introduction

目前业界主流的量化算法可以分成三类：W8A8，W4A16，W4A4。

其中W4A16是研究的比较早的，因为其只对权重做量化可以在压缩模型的同时保持较好地模型精度。W8A8对权重和激活值都进行了INT8量化，在模型加速方面取得了更好的效果。而W4A4因为可以利用4bit Tensor Core，理论上可以带来更大吞吐量，然而实际上目前SOTA的W4A4算法Atom却比W4A16和W8A8算法性能低了20-25%，这是为什么呢？

论文揭露了一个非常重要的观察：当前的4bit量化方法在GEMM计算中partial sum反量化过程中有着显著的overhead**，范围从20%到90%不等。原来是反量化的锅！

对于W4A4量化，为了实现合理的精度，W4A4方法必须对权重和激活同时应用per-group量化(这比W4A16使用的per-channel开销要大很多)，而这个过程和对应反量化是需要在CUDA Core上执行，CUDA Core的执行效率和Tensor Core的执行效率不可同日而语，在A100上一个CUDA Core和50个INT4 Tensor Core操作耗时等效。

因此，减少CUDA Core的开销对于在LLM服务中实现最佳吞吐量至关重要。论文提出<strong>QoQ算法</strong>，一个W4A8KV4量化算法，核心主要包含(内容后面再详细介绍，先记住梗概)：

- 渐进式 group quantization， FP16 -> INT8 -> INT4。
- SmoothAttention(在KV Cache INT4 量化前进行平滑)。
- 激活感知的channel reordering、rotation、weight clipping、smooth等通用手段。
同时提出了包含了QoQ算法实现的<strong>QServe系统</strong>，主要是以下几点工程优化：

- 提出计算感知的weight reordering，以在W4A8 GEMM操作中最小化CUDA Core上的指针计算开销。
- 基于渐进式 group quantization和先乘后减计算顺序，带来的全寄存器级并行INT4->INT8反量化。
- 推迟CUDA Core roofline转折点，同时降低KV4 attention的计算强度，保证落在memory-bound区域。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7c0d49518502.jpg)

*注：per-group量化通过对每一行中的各group-size列使用不同的scale和zeropoint，进一步减少了参数共享的程度，是比per-channel更精细的量化方法，量化效果更好但开销也更大。*

### Motivation

这部分主要是介绍为什么作者选择W4A8KV4精度进行量化。

首先进行了roofline模型分析，关于roofline的介绍可以参考这个篇文章[Michael Yuan：Roofline Model与深度学习模型的性能分析](https://zhuanlan.zhihu.com/p/34204282)。

因为在LLM中Attention和GEMM操作占大头，所以我们集中分析这2个操作。在LLM中计算密度主要被batch_size影响，batch_size越大计算密度越大。如下图所示，<strong>在计算密度较小时，主要是memory-bound，memory带宽主要被weight占据，因此占用内存更低的W4A16的吞吐量会比W8A8要高；在计算密度较大时，主要是compute-bound，这时因为能够充分利用INT8 Tensor Core，W8A8的吞吐量会更高</strong>。而W4A8可以认为兼具两者优势，不论计算密度是高是低，它都能保持最优的计算吞吐量。

而LLM Decoding阶段attention的计算密度很低(每个token逐步回归迭代)，这个阶段还是memory-bound，所以KV Cache的load越快计算吞吐就越高，采用KV4可以得到KV8的两倍峰值性能。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3af4fac4cfd3.jpg)

各精度类型roofline那么为什么不用W4K4KV4呢？W4A4可以利用INT4 Tensor Core，所以理论上可以获得更高的计算吞吐，但是之前的研究都<strong>忽视了W4A4 GEMM per-group反量化上的固定开销</strong>。首先看下GPU上Tensor Core是如何完成GEMM运算的，如下图所示通过在K维度上进行迭代Tiling化的子矩阵乘，然后对部分和进行累加获得结果矩阵Tiling分块的结果，主体耗时和计算体现在K维度上的每个迭代。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f26b30c173a3.jpg)

m x n x k GEMM然后看下W8A8的GEMM运算流程，主体循环内使用INT8的Tensor Core矩阵乘，部分累加使用INT32存储，迭代计算完成后在epilogue中使用CUDA Core完成INT32到FP16的反量化，可以看到主体循环中是比较简洁的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_86d0fbcdf73d.jpg)

W8A8作为对比再看下W4A16和W4A4的GEMM运算流程。在W4A16的主体循环中，需要先用CUDA Core把weight从INT4反量化为FP16，再使用FP16的Tensor Core进行矩阵乘运算，用FP32保存部分和结果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a1c56f59a263.jpg)

W4A16而在 ATOM W4A4主循环中会先用INT4 Tensor Core完成矩阵乘得到INT32结果，<strong>再用CUDA Core完成部分和从INT32到FP16的反量化，最后再用FP32存储部分和，总共需要使用两套寄存器INT32(临时)和FP32(累计)来存储部分和</strong>，开销很大。同时可以看出在主循环中都夹杂着相对Tensor Core耗时更高的CUDA Core运算。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8751b67d46cf.jpg)

W4A4而在论文中提到的W4A8实现中，<strong>先反量化INT4 weight到INT8(做了些寄存器级的并行优化详见后文)</strong>，降低计算开销，然后<strong>采用INT8 Tensor Core进行矩阵乘运算</strong>，<strong>仅使用INT32来存储部分和</strong>，降低寄存器需求，最后在epilog中完成INT32到FP16的反量化。<strong>W4A8中占大头的CUDA Core部分计算开销明显少于W4A4中对应的CUDA Core部分，因此W4A8的吞吐量理论上应该强于W4A4和W4A16，但是略弱于W8A8。</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_791b00c895f3.jpg)

W4A8
### QoQ算法

#### 渐进式 group quantization

为了提高低比特量化weight的精度，经常会需要使用per-group策略，但是如上文所述它的反量化开销很大，为此作者提出了渐进式group quantization，流程上是<strong>先用per-channel做FP16->INT8的对称量化，再用per-group进行INT8->UINT4的非对称量化</strong>，如下公式所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e1d52007a403.jpg)

  INT8反量化为FP16![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_876ea69c046b.jpg)

UINT4反量化为INT8因为在8bit到4bit的量化过程中使用了per-group量化，所以它的精度有一定保证；而在计算W4A8 GEMM的时候，mainloop里只需要完成<strong>UINT4->INT8的数值反量化计算</strong>便可进行INT8的Tensor Core运算，然后在epilogue里完成到FP16的反量化，相较于ATOM W4A4 GEMM中的I<strong>NT32->FP16类型转换</strong>和<strong>FP16数值反量化</strong>操作要简单不少。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_38d9a65077df.jpg)

但是这种两阶段的量化方法有个潜在的问题，即UINT4在反量化回INT8的时候可能会发生数值溢出，于是作者经过精密的计算对FP16->INT8量化的结果范围做了保护限定，局限在[-119,119]之间，<strong>同时允许将具有全寄存器级并行性的反量化操作融合到W4A8 GEMM内核中</strong>，最小化CUDA Core开销。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4780c83e4144.jpg)

#### SmoothAttention

直接将KVCache降低到4bit会显著降低LLM的精度，通过可视化统计数据作者发现<strong>Value矩阵没有显示出显著的离群值模式，而Key矩阵倾向于在每个头部都有固定的离群值通道</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9e8c875046f3.jpg)

所以受[SmoothQuant](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.10438)算法启发，作者提出<strong>在Key缓存中按每个通道因子λ来缩小Key缓存中的离群值通道，为了保持等效性在Query上按通道因子λ放大</strong>(延展到之前的Linear层weight)，如下所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_56cb14beb1c5.jpg)

为了减少开销，需要把这个操作融合到已有算子里，考虑到LLM大多使用了RoPE，作者在设计时充分考虑了RoPE层的影响，添加了一个强制限制，这样便可以和之前层的weight运算进行融合。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4cc9610244c7.jpg)

#### 一些通用的LLM量化优化方法

- 针对QKV Projection和 FFN首层，参考[Quarot](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.00456)中的方法，通过乘以旋转矩阵来旋转块输入激活，并以相反的方向相应地旋转相应的权重保持数学一致性。旋转后每个通道的激活是所有其他通道的线性组合，因此有效地抑制了离群通道。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f67f50bb28ca.jpg)

2. 针对Output Projection和FFN第二层，参考[SmoothQuant](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.10438)的方法，通过将它们除以每个通道的平滑因子来平滑块的中间激活值。文中还提到通过实践发现平滑因子λ主要由权重而不是激活值决定，这与SmoothQuant中的观察结果有很大的不同，这块还是值得深究一下。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b048cc6a3ab9.jpg)

3. 激活值感知的channel reorder，之前的很多研究已经表明保持重要weight的FP16能够显著提高精度，通常可以通过激活值来鉴别重要的weight，通过重排可以将重要程度相似的weight放在同一个group进行量化，有利于保持精度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_37ba5b9558ba.jpg)

4. weight裁剪，这是另一种流行的量化优化技术，之前的很多研究([GPTQ](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.17323)、ATOM、Quarot等)都采用grid search方法寻找裁剪ratio \alpha 来最小化量化误差，作者也采用类似的方法来最小化层输出误差。

### QServe系统

讲解完QoQ算法就开始描述具体的实现QServe，这部分涉及到非常多的硬件细节，论文作者里有NVIDIA的同学，所以少不了在GPU上做一些深度优化。

#### QServe的运行时

QServe中的所有GEMM层都在W4A8输入上进行操作，利用INT8 TensorCore进行计算，并生成FP16输出。所有的attention层都在FP16中的CUDA核上进行计算。为了确保每个GEMM都接受了INT8的激活值，作者将激活量化融合到QKV projection前的layernorm层和第一个FFN层中，整体如下图所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f332b6ac9fd2.jpg)

QServe运行时精度在内存管理方面也是借鉴了之前研究的成果，比如vLLM的paged KV Cache和in-flight batching，同时为了提升精度稍微做了些调整，KV量化改成per-head维度和动态量化。

#### W4A8 GEMM实现

W4A8的GEMM实现是QServe系统的核心，做了一系列优化比如计算感知的权重重排、per-channel和per-group维度的快速反量化和一些其他通用策略，目的只有一个就是<strong>减少main loop的开销</strong>。

<strong>计算感知的权重重排</strong>

在反量化和Tensor Core计算之前，在每次main loop迭代中，操作数必须从全局内存加载到L1共享内存中，这个加载过程并不能忽视，因为Tensor Core内部在计算前需要每个线程的有固定的分层布局。对于计算和存储类型相同的操作，用ldmatrix指令可以很好地解决这个问题，如下图所示它可以高效地完成数据的迁移匹配TensorCore对数据layout的需求。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f57fb838594d.jpg)

但是存储和计算类型不同(W4A8)的时候ldmatrix就无法正常工作了，也就是说<strong>ldmatrix不能用于W4A8 GEMM，</strong>所以作者通过对计算感知的权重重新排序来解决这个问题。关键的方法是<strong>按照计算过程（就是TensorCore）中需要使用的顺序来存储权重</strong>。将整个GEMM问题划分为多个32×32 tile，在每个tile中线程0负责输入channel 0-3和16-19以及输出channel0、8、16和24的数据，这样32个channel刚好组成了128bit，可以通过一次寻址和一次事务就完成了数据拷贝，实测下来指针算数运算的开销和ldmatrix处在一个量级。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3aef9540533e.jpg)

<strong>Per-Channel W4A8 GEMM快速反量化</strong>

数据到了L1 shared memory后就可以开始反量化了，这个是在main loop中的操作，所以需要重点关注。如前文所述，在进行INT8 TensorCore运算前，需要将UINT4反量化回INT8，这过程其实也是拆成两步来进行：UINT4 到UINT8和UINT8 到SINT8。

对于UINT4 到UINT8，主要是数据类型的转换，不涉及到数值的转换，所以可以理解为一个unpack的流程(4bit->8bit)，为了提高unpack的并行度，作者对weigh进行了交错重排，这里设计的非常巧妙，通过一些高效指令来完成数据重排。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_07787a698f0d.jpg)

weight reorder对于UINT8 到SINT8，涉及到数值计算，作者提出将反量化计算中的减法移出main loop的方法来减少计算开销。即通过一系列的等效计算将减法移到了乘法的后面，如下公式所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ddb30634f74c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_06a3e347e03b.jpg)

<strong>通用的优化策略</strong>

通用的优化策略主要有：多级流水线并行、异步存储拷贝的overlapping、L1shared memory的swizzle和split-k拆分，可以参考之前写的[进击的Killua：cute Swizzle细谈](https://zhuanlan.zhihu.com/p/684250988)、[进击的Killua：CUTLASS CuTe实战(二)-应用](https://zhuanlan.zhihu.com/p/692078624)

#### KV4 Attention实现

Attention计算也占据了LLM推理中的很大一部分，理论上KV4相对KV8应该有2倍的加速比，但实际运行下来在A100上KV4甚至还比KV8要慢，原因就出在反量化运行在速度更慢的CUDA Core上。从KV Cache中反量化单个INT4数字需要5个ALU操作(mask,shift,type conversion,mul,sub)，这样一来KV4 attention在A100这样的GPU上落到了compute-bound区间，居然受限于硬件算力了。

作者做了一些优化来移到memory-bound区间，比如<strong>将所有FP32操作替换成FP16</strong>的，这样就把算力double了下。同时对反量化的融合算子应用了个非常厉害的优化，<strong>本质上就是使用性能更好的位操作(PRMT指令)和数学运算指令(SUB指令)，替代原来的低性能的数值转换指令(CVT指令)，</strong>可以显著的降低计算密度，具体内容可以参考这篇文章的讲述[DefTruth：[LLM推理优化] WINT8/4-(00): 通俗易懂讲解-快速反量化算法](https://zhuanlan.zhihu.com/p/657072856)，最终在TensorRT-LLM上得到了1.5倍的加速比。

### Evaluation

作者围绕perplexity、accuracy、speed和throughput做了比较多的对比实验，对比的基本都是之前SOTA的算法实现，比如GPTQ、QuaRot、Atom、AWQ等，基础模型选的也比较有代表性Llama(美)、Mistral(欧)和Yi(中)。

PPL上看可以和QuaRot掰掰手腕，其它的就有些惨了，不过离FP16相比还是有一些空间呀。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_91d7d2a53bb8.jpg)

speed和througput有点一骑绝尘的味道，毕竟Nvidia也下场了嘛，也是论文的核心卖点。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5253ec54636d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7722ae1d5216.jpg)

Zero-shot accuracy上数据还是比较好看的，小模型上还是得上per-group。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8488d27a3cc9.jpg)

最后再看下消融实验，可以清晰地看到每个优化策略的影响，工作做的很细致。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d88d3d2179ea.jpg)

反量化的开销显著下降！这也是论文重点优化的部分。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_877953740a2d.jpg)

### Conclusion

QServe是一个算法和系统工程协同设计的系统，旨在将大型语言模型量化到W4A8KV4精度，帮助它们在GPU上的高效部署。

在算法方面，设计了以渐进式量化为特征的QoQ量化方法，使W4A8 GEMM操作能够在INT8 TensorCore上执行，同时进行了SmoothAttention，显著减少了KV4量化造成的精度损失。

在QServe系统中，利用在渐进量化中建立的取值范围保护实现了无溢出的INT4到INT8反量化，这个过程利用全寄存器级并行和先乘法后减法的计算序列进行加速。此外，还实现了计算感知的weight重排，最小化了指针计算相关的开销。