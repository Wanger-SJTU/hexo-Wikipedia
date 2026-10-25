---
title: 大模型推理算子性能分析入门：compute bound、memory bound、roofline、MFU、MBU
date: "2026-07-30 00:00:00"
updated: "2026-07-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/大模型推理算子性能分析入门-compute-bound、memory-bound、roofline、MFU、MBU/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2066036349120123080
---


前言
本文主要介绍 计算强度、roofline、MFU、MBU 等算子性能评估和分析的工具。

先给大局观：

- 计算强度和 roofline 给了我们“纸上谈兵”地评估算子性能的能力，它让我们可以在算子实现出来之前就评估整体的性能、ROI 等数据，也可以给最终算子的性能做一个预期。但是一定要记住，<strong>“勿以辩说为必然”</strong>，这些工具都只是某种评估或者计算，最终的实际效果要去看实现的最终情况。
- 而 MFU、MBU 则是在算子实现后我们关注的指标，它定义了算子的性能，帮助我们给出性能优化的思路。本文对于 MFU 和 MBU 的介绍会很少，主要聚焦 roofline。
从算子 bound 在哪到计算强度和 roofline
 和 roofline model 原始论文《Roofline: An Insightful Visual Performance Model for Floating-Point Programs and Multicore Architectures》相比，笔者会采用一种循序渐进的方式推导出 roofline 的定义，所以直到本章节最后我们才会引出什么是 roofline，请读者稍安勿躁。
楔子：算子的 bound 点
我们希望回答一个问题：一个算子在某一个硬件架构上的最小执行时间，到底受什么因素影响。注意下，“最小执行时间”考察的是最优的情况，因此这里探究的是，哪怕我们请来了 Jeff Dean 做了极致的优化，我们的算子的性能最好只能到多少、也就是执行时间最短能多短。

我们都知道一个算子可以分成访存和计算，这两个部分可以尝试并行。而一个不带任何并行的算子其最终执行时间就是访存时间+计算时间，一个理论完美做到访存计算并行的算子，其最终执行时间就是访存时间和计算时间的最大值。我们用公式表达这个关系：

![](https://www.zhihu.com/equation?tex=%5Cmax%28T_%7Bcomm%7D%2C+T_%7Bcalc%7D%29+%5Cle+T_%7Bkernel%7D+%5Cle+T_%7Bcomm%7D+%2B+T_%7Bcalc%7D)

这里：

- 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D)：通信时间。
- 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D)：计算时间。
- 
![](https://www.zhihu.com/equation?tex=T_%7Bkernel%7D)：kernel 最终执行时间。考察“最小执行时间”也就是 
![](https://www.zhihu.com/equation?tex=T_%7Bkernel%7D) 最小值，就是要考察 
![](https://www.zhihu.com/equation?tex=%5Cmax%28T_%7Bcomm%7D%2C+T_%7Bcalc%7D%29) 的值，也就是考察 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D) 和 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D) 中最大值。

这其实就是所谓的“memory bound”（通信约束）和“compute bound”（计算约束）。当 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D%5Cgt+T_%7Bcalc%7D) 时，
![](https://www.zhihu.com/equation?tex=T_%7Bkernel%7D) 最小也只能是 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D)，这时是 memory bound。当 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D%5Cgt+T_%7Bcomm%7D) 时，
![](https://www.zhihu.com/equation?tex=T_%7Bkernel%7D) 最小也只能是 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D)，这时是 compute bound。

所以，我们唯一要做的事是，探究 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D) 和 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D) 的关系，判断什么时候是 memory bound、什么时候是 compute bound。

通信时间的推导
先看 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D)。时间等于路程除以速度，那么在通信时间这件事上，路程和速度是什么呢？

- 路程：算子需要读取的数据量，本文用 
![](https://www.zhihu.com/equation?tex=M) 作为记号，单位字节（byte）。
- 速度：芯片的带宽，本文用 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 作为记号，单位字节每秒（byte/sec）。很明显：
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D+%3D+%5Cfrac%7BM%7D%7B%5Cbeta%7D)，单位秒（sec）。

计算时间的推导
我们只考察 GPU 这种 vector matrix 等算力的硬件。对于 NPU 这种 vector 和 matrix 有算力差的硬件，原理上其实差不多，但是因为 vector 算力和 matrix 算力不同，计算公式上会有很大的不同（甚至在一些实践中，为了简化问题，会只考虑 matrix 计算时间不考虑 vector 计算时间。笔者不是很想评价这种行为）。

如果我们看一些芯片 spec 的公开资料，会看到对于芯片算力使用 “FLOPS” 作为单位。比如 [NVIDIA H20 96GB Specs, FLOPS, Benchmarks | Flopper.io](https://link.zhihu.com/?target=https%3A//flopper.io/gpu/nvidia-h20-96gb) 里面显示的：

![](https://pic3.zhimg.com/v2-6e0e235bd9a2d323fadba2130b3e7e72_r.jpg)这里的 44.0 TFLOPS 就是 FP32 下的芯片算力。这里的 FLOPS 其实就是：“每秒多少次浮点计算”，也即”FLOP per Second”，而 TFLOPS 指“每秒进行多少 T 次浮点计算”，这里 
![](https://www.zhihu.com/equation?tex=1%5Cmathrm%7BT%7D+%3D+10%5E%7B12%7D) （T 是 Tera 的简写）。顺便，FLOP 是浮点计算，OP 则是指定点计算，所以 OPS 表示 “每秒多少次计算”。本文为了简洁，只讨论浮点的。

我们用“计算量”代指“多少次计算”，本文用 
![](https://www.zhihu.com/equation?tex=C) 代指计算量，单位 FLOPs（FLOP 的复数形式，要和 FLOPS 区分）；本文用 
![](https://www.zhihu.com/equation?tex=%5CPi) 代指芯片算力，单位 FLOP 每秒（FLOPS）。所以 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D%3D%5Cfrac%7BC%7D%7B%5CPi%7D)，单位 sec。

怎么理解计算量（或者说“多少次计算”）？我们看一个经典 mnk 矩阵乘：

- 输入 `A: [m, k] @ fp32`、`B: [n, k] @ fp32`，输出 `O: [m, n] @ fp32`，计算量就是，总共要进行多少次乘法和加法。
- 数学意义上，计算每一个 `O[i][j]` 需要 
![](https://www.zhihu.com/equation?tex=k) 次乘法和 
![](https://www.zhihu.com/equation?tex=k-1) 次加法，但是因为代码实现时一般是采用“初始化为 0 开始累加”的方式，同时也为了计算方便，会认为计算每一个 `O[i][j]` 需要 
![](https://www.zhihu.com/equation?tex=k) 次乘法和 
![](https://www.zhihu.com/equation?tex=k) 次加法。
- 所以总共需要计算量是 
![](https://www.zhihu.com/equation?tex=2%5Ctimes+m%5Ctimes+n%5Ctimes+k)。
- 所以对于 H20 的 fp32 mnk 矩阵乘计算，如果 mnk 分别是 128 1024 2048，那么 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D%3D%5Cfrac%7B2%5Ctimes+m+%5Ctimes+n+%5Ctimes+k%7D%7B%5CPi%7D%3D%5Cfrac%7B2%5Ctimes+128%5Ctimes+1024+%5Ctimes+2048%7D%7B44%5Ctimes+10%5E%7B12%7D%7D%3D1.22%5Ctimes+10%5E%7B-5%7D%5C%3B+%5Cmathrm%7Bsec%7D) 。
计算强度
有了 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D) 和 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D)，接下来我们就要评估这两个值的大小。

![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D%5Cbigcirc+T_%7Bcalc%7D%5CLeftrightarrow+%5Cfrac%7BM%7D%7B%5Cbeta%7D%5Cbigcirc+%5Cfrac%7BC%7D%7B%5CPi%7D%5CLeftrightarrow+%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D%5Cbigcirc+%5Cfrac%7BC%7D%7BM%7D)

可以看出，
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D) 和 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D) 的关系，就是 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BC%7D%7BM%7D) 的关系。这里，
![](https://www.zhihu.com/equation?tex=%5CPi) 和 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 其实都是芯片的特性，而 
![](https://www.zhihu.com/equation?tex=C) 和 
![](https://www.zhihu.com/equation?tex=M) 则都是算子的特性。所以，其实判断算子 bound 在哪，就是对芯片特性和算子特性做比较！

再进一步观察，可以看出 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BC%7D%7BM%7D) 其实都是有意义的。对于 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BC%7D%7BM%7D)，其实它表示的是，每 load 一个 byte 的数据，它会做多少次计算。对于 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)，其实它表示的是，芯片每 load 一个 byte 的数据，可以做多少次计算。它们都反映了计算的强度，所以我们用计算强度称呼它。本文用 
![](https://www.zhihu.com/equation?tex=I) 表示计算强度，单位 FLOPs 每字节（FLOP/byte）。

我们定义 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D%3D%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)，表示芯片的计算强度（至于为什么角标是 
![](https://www.zhihu.com/equation?tex=%5Cmax) ，等下就知道了。在实践中，有时会直接叫它芯片的 roofline），这是只和芯片硬件相关的量，不受算子影响。

我们定义 
![](https://www.zhihu.com/equation?tex=I_%7Bkernel%7D%3D%5Cfrac%7BC%7D%7BM%7D)，表示算子的计算强度，这是只和算子定义相关的量，不受硬件影响。

那么 
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D) 和 
![](https://www.zhihu.com/equation?tex=T_%7Bcalc%7D) 的大小可以进一步表示为：

![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D%5Cbigcirc+T_%7Bcalc%7D%5CLeftrightarrow+%5Cfrac%7BM%7D%7B%5Cbeta%7D%5Cbigcirc+%5Cfrac%7BC%7D%7B%5CPi%7D%5CLeftrightarrow+%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D%5Cbigcirc+%5Cfrac%7BC%7D%7BM%7D%5CLeftrightarrow+I_%7B%5Cmax%7D%5Cbigcirc+I_%7Bkernel%7D)

所以，我们可以得出结论了：当芯片的计算强度小于算子的计算强度（
![](https://www.zhihu.com/equation?tex=I_%7Bmax%7D%5Clt+I_%7Bkernel%7D)）时，算子是 compute bound（
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D%5Clt+T_%7Bcalc%7D)）；当芯片的计算强度大于算子的计算强度（
![](https://www.zhihu.com/equation?tex=I_%7Bmax%7D%5Cgt+I_%7Bkernel%7D)）时，算子是 memory bound（
![](https://www.zhihu.com/equation?tex=T_%7Bcomm%7D%5Cgt+T_%7Bcalc%7D)）。

直观上理解：当芯片的计算强度小于算子的计算强度时，芯片需要更努力地计算才行，所以是 compute bound。当芯片的计算强度大于算子的计算强度时，芯片需要更努力地搬数据才行，所以是 memory bound。

roofline
我们终于可以引出 roofline 了。

在已经明白算子 bound 在哪之后，我们会想进一步做另一件事：评估某一个算子在 memory bound 的情况下，芯片能发挥出来的算力最多到底是多少，我们称其为模型理论性能（或者说 算子理论最优性能），记号为 
![](https://www.zhihu.com/equation?tex=P)，单位 FLOPS（和 
![](https://www.zhihu.com/equation?tex=%5CPi) 是同类的）。

直接推导 
![](https://www.zhihu.com/equation?tex=P) 的表达式：

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Baligned%7DP%3D%5Cfrac%7BC%7D%7B%5Cmin%28T_%7Bkernel%7D%29%7D+%26%3D%5Cfrac%7BC%7D%7B%5Cmax%28T_%7Bcomm%7D%2C+T_%7Bcalc%7D%29%7D+%5C%5C+%26%3D%5Cbegin%7Bcases%7D%5Cfrac%7BC%7D%7BT_%7Bcomm%7D%7D+%26+I_%7B%5Cmax%7D+%5Cgt+I_%7Bkernel%7D+%5C%5C+%5Cfrac%7BC%7D%7BT_%7Bcalc%7D%7D+%26+I_%7B%5Cmax%7D%5Cle+I_%7Bkernel%7D%5Cend%7Bcases%7D+%5C%5C+%26%3D+%5Cbegin%7Bcases%7D%5Cfrac%7BC%7D%7BM%7D%5Ccdot+%5Cbeta+%26+I_%7B%5Cmax%7D%5Cgt+I_%7Bkernel%7D+%5C%5C+%5CPi+%26+I_%7B%5Cmax%7D%5Cle+I_%7Bkernel%7D%5Cend%7Bcases%7D+%5C%5C+%26%3D+%5Cbegin%7Bcases%7D+I_%7Bkernel%7D%5Ccdot%5Cbeta+%26+I_%7B%5Cmax%7D+%5Cgt+I_%7Bkernel%7D%26%5Ctext%7Bmemory+bound%7D+%5C%5C+%5CPi+%26+I_%7B%5Cmax%7D%5Cle+I_%7Bkernel%7D+%26+%5Ctext%7Bcompute+bound%7D%5Cend%7Bcases%7D%5Cend%7Baligned%7D)

我们画出 
![](https://www.zhihu.com/equation?tex=P) 随 
![](https://www.zhihu.com/equation?tex=I_%7Bkernel%7D) 的变化曲线，就可以得到：

![](https://pic2.zhimg.com/v2-9ee36729bffceb77b8ed0fe3f03e0dc1_r.jpg) 在本文中，
![](https://www.zhihu.com/equation?tex=%5Cpi) 会有其他含义，所以上图中的 
![](https://www.zhihu.com/equation?tex=%5Cpi) 请自行脑补换成本文用的 
![](https://www.zhihu.com/equation?tex=%5CPi)。之所以叫做 roofline model，就是因为图中的这条曲线很像一个房顶（房顶英文：roof）。

所以，现在知道为什么要用下标为 
![](https://www.zhihu.com/equation?tex=%5Cmax) 的 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D) 表示芯片的计算强度了吧：对于任何一个算子，它的理论最优算力 
![](https://www.zhihu.com/equation?tex=P) 在算子计算强度达到 
![](https://www.zhihu.com/equation?tex=I_%7Bmax%7D) 的时候达到最大 
![](https://www.zhihu.com/equation?tex=%5Cmax)，为芯片算力 
![](https://www.zhihu.com/equation?tex=%5CPi)。

roofline model 带来的就是这么一个洞见：算子最终能达成的理论最好性能是可以量化的，而最关键的变量就是，在某一个芯片的 roofline 图中，它在屋檐下（上图红区）还是屋顶下（上图绿区）。

图解 roofline
在使用 roofline 做一些理论分析实操之前，我们对 roofline 图本身做一些进一步的分析。

还是那个 roofline 经典图：

![](https://pic3.zhimg.com/v2-8f6167844af47811dc82618df07a879a_r.jpg)如果一个算子的计算强度是 
![](https://www.zhihu.com/equation?tex=I_%7BA%7D)（对应图中 A 青色长方体下的横坐标），那么此时它的最终实现的最优算力是 
![](https://www.zhihu.com/equation?tex=%5CPi)，但是最终是否能达到这个算力需要看实现。如果一个算子的计算强度是 
![](https://www.zhihu.com/equation?tex=I_%7BB%7D)（对应图中 B 青色长方形下的横坐标），那么此时它的最终实现的最优算力是青色长方形和红线的交点，但是最终是否能达到这个算力需要看实现。

如果一个算子通过切分等方式降低了计算强度，比如从图中的 A 青色长方形变到 B 青色长方形，就会导致从 compute bound 变成 memory bound，就会导致最优的算力下降。

练习题
在了解了这一些系列知识之后，是时候做一些题巩固下所学概念了。

问题：算出常用硬件的计算强度
笔者目前看到的主要硬件就是 A800 和 H20 ，我们分别算一下它们的 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D)，留一个印象。

A800 的带宽 1.94 TB/s，BF16 算力 311.84 TFLOPS，所以 
![](https://www.zhihu.com/equation?tex=I_%7BA800%7D%3D160)。

H20 的带宽 4 TB/s，BF16 算力 148.0 TFLOPS，所以 
![](https://www.zhihu.com/equation?tex=I_%7BH20%7D%3D37)。

实际上，笔者看到的大部分硬件计算强度都是 1000 以下，GPU 能到 200 以下，NPU 的则相对高一点。

问题：Prefill 和 Decode 阶段的 self-attention 分别是什么 bound
一个经典面试题，在学了计算强度之后，我们可以直接算出来 self-attention 的计算强度来分析这个问题。为了计算方便，我们假设做的是 fp8 的 self-attention。

对于 prefill，我们考虑多轮会话场景：当前历史有 
![](https://www.zhihu.com/equation?tex=l_%7Bhis%7D) 的 kv cache，这一次 prefill 新增 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 个 token（如果读者不了解多轮会话，直接令 
![](https://www.zhihu.com/equation?tex=l_%7Bhis%7D%3D0) 就行，不影响结论）。

对于 decode，我们考虑投机解码场景：当前历史有 
![](https://www.zhihu.com/equation?tex=l_%7Bhis%7D) 的 kv cache，这一次 decode 需要同时推 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 个 token （如果读者不了解投机解码，直接令 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D%3D1) 就行，不影响结论），一般 
![](https://www.zhihu.com/equation?tex=1+%5Cle+l_%7Binc%7D+%5Cle+8)，总之 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 很小。

只考虑 MHA（其他同理），head 数是 
![](https://www.zhihu.com/equation?tex=h)、head dim 是 
![](https://www.zhihu.com/equation?tex=d)。

对于 vector、matrix 同算力的 GPU，self-attention 大头都是在三个矩阵乘，所以方便起见，我们算计算量时只看这三个矩阵乘 
![](https://www.zhihu.com/equation?tex=C+%3D+3+%5Ctimes+2+%5Ctimes+l_%7Binc%7D%5Ctimes+%28l_%7Bhis%7D+%2B+l_%7Binc%7D%29+%5Ctimes+h+%5Ctimes+d)。

访存或者说数据写入写出就是 
![](https://www.zhihu.com/equation?tex=M%3D4%5Ctimes+%28l_%7Bhis%7D+%2B+l_%7Binc%7D%29%5Ctimes+h%5Ctimes+d)，这里的 4 是 qkv 三个输入加 o 一个输出的 4 个显存读写。

所以：

![](https://www.zhihu.com/equation?tex=I_%7B%5Ctext%7Bself-atten%7D%7D%3D+%5Cfrac%7BC%7D%7BM%7D%3D%5Cfrac%7B3+%5Ctimes+2+%5Ctimes+l_%7Binc%7D%5Ctimes+%28l_%7Bhis%7D+%2B+l_%7Binc%7D%29+%5Ctimes+h+%5Ctimes+d%7D%7B4%5Ctimes+%28l_%7Bhis%7D+%2B+l_%7Binc%7D%29%5Ctimes+h%5Ctimes+d%7D%3D%5Cfrac%7B3%7D%7B2%7Dl_%7Binc%7D)

对于 prefill 来说，
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 可以很大，算子的计算强度很大，因此是 compute bound；对于 decode 来说，
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 很小，算子的计算强度很小，因此是 memory bound。

问题：mnk 矩阵乘的计算强度是多少
只考虑 W8A8 的 mnk 计算。

![](https://www.zhihu.com/equation?tex=I_%7Bmnk%7D%3D+%5Cfrac%7BC%7D%7BM%7D+%3D+%5Cfrac%7B2mnk%7D%7Bmk+%2B+nk+%2B+mn%7D%3D%5Cfrac%7B2m%5Ctimes+nk%7D%7Bm%28k%2Bn%29%2Bnk%7D%3D%5Cfrac%7B2m%7D%7Bm%5Cfrac%7Bk%2Bn%7D%7Bnk%7D%2B1%7D)

问题：一系列 mnk 矩阵连乘的计算强度是多少
假设每一个 mnk 矩阵乘的参数是 
![](https://www.zhihu.com/equation?tex=m%2Cn_%7Bi%7D%2Ck_%7Bi%7D)，这里的 
![](https://www.zhihu.com/equation?tex=m) 不变是因为它确实不需要变，矩阵连乘不会改变这个维度。

![](https://www.zhihu.com/equation?tex=I_%7Bmnki%7D%3D%5Cfrac%7B%5Csum%5Climits_%7Bi%7D2mn_%7Bi%7Dk_%7Bi%7D%7D%7Bmk%27%2B%5Csum%5Climits_%7Bi%7Dn_%7Bi%7Dk_%7Bi%7D%2Bmn%27%7D%3D%5Cfrac%7B2m%5Csum%5Climits_%7Bi%7Dn_%7Bi%7Dk_%7Bi%7D%7D%7Bm%28k%27%2Bn%27%29%2B%5Csum%5Climits_%7Bi%7Dn_%7Bi%7Dk_%7Bi%7D%7D%3D%5Cfrac%7B2m%7D%7Bm%5Cfrac%7Bk%27%2Bn%27%7D%7B%5Csum%5Climits_%7Bi%7Dn_ik_i%7D+%2B+1%7D)

稍微解释下：
![](https://www.zhihu.com/equation?tex=k%27) 是指第一个矩阵乘的 
![](https://www.zhihu.com/equation?tex=k)，
![](https://www.zhihu.com/equation?tex=n%27) 是指最后一个矩阵乘的 
![](https://www.zhihu.com/equation?tex=n)。需要注意，在连乘的时候，中间结果可以 keep 在 HBM，所以只需要做一次 feature 的 load 和 store，对应只加了一次 
![](https://www.zhihu.com/equation?tex=mk%27) 和 
![](https://www.zhihu.com/equation?tex=mn%27)。

问题：一系列矩阵乘组合的融合算子计算强度是多少
在上一个问题的基础上考察一个更近一步的问题：对于一系列矩阵乘组成的算子，它的计算强度是多少。

计算量是不变的，有多少矩阵乘就有多少计算量：
![](https://www.zhihu.com/equation?tex=C%3D%5Csum%5Climits_%7Bi%7D2mn_ik_i%3D2m%5Csum%5Climits_%7Bi%7Dn_ik_i)。

访存则有变化。实际上可以分成两部分，一部分是权重 
![](https://www.zhihu.com/equation?tex=M_%7Bwt%7D%3D%5Csum%5Climits_%7Bi%7Dn_%7Bi%7Dk_%7Bi%7D)，另一部分则是输入输出的激活 
![](https://www.zhihu.com/equation?tex=M_%7Bact%7D%3D%5Csum%5Climits_%7Bj%7Dmn_j%27%2B%5Csum%5Climits_%7Bj%7Dmk_j%27%3Dm%5Csum%5Climits_%7Bj%7D%28n_j%27%2Bk_j%27%29)（和矩阵连乘的一样，矩阵乘的中间结果不需要和 DDR 交互，所以只有整个融合算子的输入输出需要考虑）。

所以其实，我们就可以得到这种融合算子的计算强度：

![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%3D%5Cfrac%7BC%7D%7BM_%7Bact%7D%2BM_%7Bwt%7D%7D%3D%5Cfrac%7B2m%5Csum%5Climits_%7Bi%7Dn_ik_i%7D%7Bm%5Csum%5Climits_%7Bj%7D%28n_j%27%2Bk_j%27%29%2B%5Csum%5Climits_%7Bi%7Dn_ik_i%7D%3D%5Cfrac%7B2m%7D%7B%5Cfrac%7Bm%5Csum%5Climits_%7Bj%7D%28n_j%27%2Bk_j%27%29%7D%7B%5Csum%5Climits_%7Bi%7Dn_ik_i%7D%2B1%7D%3D%5Cfrac%7B2m%7D%7B%5Cfrac%7BM_%7Bact%7D%7D%7BM_%7Bwt%7D%7D%2B1%7D)

在实际的 transformer 模型中，激活的数据量是远远比不过权重的，所以 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BM_%7Bact%7D%7D%7BM_%7Bwt%7D%7D%5Capprox+0)，因此 
![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%5Capprox+2m)

问题：除了 self-atten 之外，prefill 和 decode 分别是什么 bound
其实除了 self-atten 之外，transformer 基本就只有 matmul 了，上一个问题我们已经讨论了 matmul 融合算子的计算强度，所以直接用上一个问题的结论就行。唯一的区别就是，在 transformer 中，
![](https://www.zhihu.com/equation?tex=m) 实际上是 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D)。

所以基于 
![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%3D2m%3D2l_%7Binc%7D)，对于 prefill 来说， 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 可以很大，所以计算强度是很大的，往往就是 compute bound；而对于 decode 来说，
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 总是很小，所以计算强度是比较小的，往往就是 memory bound。

和 self-atten 的结论结合起来就是经典的：prefill compute bound、decode memory bound。

问题：如果有一个原生 4bit 计算的硬件，它的计算强度能提高几倍
这个问题的详细描述是，如果一个硬件支持了原生 W4A8 计算，也就是它的 matrix 计算单元支持输入 4bit 的权重（激活仍然 8bit），而在 W4A8 情况下硬件的 matrix 性能是 W8A8 的两倍，那么最终它的 W4A8 计算强度是提高了多少？

这里是为了澄清一个误区，可能会有人以为，对于 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D%27%3D%5Cfrac%7B%5CPi%27%7D%7B%5Cbeta%27%7D)，新的算力翻倍 
![](https://www.zhihu.com/equation?tex=%5CPi%27%3D2%5CPi)，而 4bit 的硬件传输速度也可以翻倍，所以 
![](https://www.zhihu.com/equation?tex=%5Cbeta%27%3D2%5Cbeta)，所以 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D%27%3D%5Cfrac%7B%5CPi%27%7D%7B%5Cbeta%27%7D%3D%5Cfrac%7B2%5CPi%7D%7B2%5Cbeta%7D%3D%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)。但是这是绝对错误的！我们考虑计算强度的时候，并不需要考虑最终计算的数据类型，只需要该数据类型的算力除以带宽就行！也就是 
![](https://www.zhihu.com/equation?tex=I_%7B%5Cmax%7D%27%3D%5Cfrac%7B%5CPi%27%7D%7B%5Cbeta%7D%3D2%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)，因此计算强度是翻倍的。

但是需要注意，这并不会导致 mnk 矩阵乘中，打满计算强度需要的 
![](https://www.zhihu.com/equation?tex=m) 也变大。在 W8A8 时，
![](https://www.zhihu.com/equation?tex=I_%7Bmnk%7D%3D%5Cfrac%7BC%7D%7BM%7D%3D%5Cfrac%7B2mnk%7D%7Bmk%2B+nk+%2B+mn%7D)，而 W4A8 时 
![](https://www.zhihu.com/equation?tex=I_%7Bmnk%7D%27%3D%5Cfrac%7BC%7D%7BM%27%7D%3D%5Cfrac%7BC%7D%7B%5Cfrac%7B1%7D%7B2%7DM%7D%3D%5Cfrac%7B4mnk%7D%7Bmk%2Bnk%2Bmn%7D)，所以：

![](https://www.zhihu.com/equation?tex=I_%7Bmnk%7D%3DI_%7B%5Cmax%7D%5CLeftrightarrow+%5Cfrac%7B2mnk%7D%7Bmk%2Bnk%2Bmn%7D%3D%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)

![](https://www.zhihu.com/equation?tex=I_%7Bmnk%7D%27%3DI_%7B%5Cmax%7D%27%5CLeftrightarrow+%5Cfrac%7B4mnk%7D%7Bmk%2Bnk%2Bmn%7D%3D2%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D%5CLeftrightarrow+%5Cfrac%7B2mnk%7D%7Bmk%2Bnk%2Bmn%7D%3D%5Cfrac%7B%5CPi%7D%7B%5Cbeta%7D)

也就是，原生 W4A8 和 W8A8 打满计算强度所需的 
![](https://www.zhihu.com/equation?tex=m) 其实是一样的。

问题：从公式看，驻留 HBM 的好处
在 GPU 的推理中，有一种极限的性能优化方法：在 decode 推理之前，将权重全部从 DDR load 进 HBM，而在具体的推理时不 load 权重了。我们不去考虑这种做法的实现细节问题（比如 HBM 没有那么大、DDR 2 HBM 的 load 和计算的并行在哪、kvcache 的 load 等等），我们只从 roofline 的角度分析，如果它能够达成，会有什么效果。

很简单，前文分析过 self-atten 的计算强度为 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D)，在 decode 阶段这个太小了。但是如果不需要 load，也就是 
![](https://www.zhihu.com/equation?tex=M%5Cto+0)，计算强度 
![](https://www.zhihu.com/equation?tex=I+%3D+%5Cfrac%7BC%7D%7BM%7D+%5Cto+%5Cinf)！换句话说，这样 decode 计算也成了 compute bound 了！

需要注意，这里只是一个很简单的讨论，实际这种推理方法的细节非常繁多，且最终也会是 load bound，笔者这里不展开聊为什么是 load bound 了，这里只抛出“引起读者思考”。

问题：TP 切分如何导致的计算强度变化
根据 
![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%3D2l_%7Binc%7D)、
![](https://www.zhihu.com/equation?tex=I_%7B%5Ctext%7Bself-attn%7D%7D%3D%5Cfrac%7B3%7D%7B2%7Dl_%7Binc%7D)，TP 切分不会改变计算强度。

问题：prefill 阶段将一个大 seqlen 切成多个 chunk，对性能的影响是什么
在 prefill 阶段，如果某一个 batch 极大，那么为了调度方便等原因会选择切 chunk。比如 16K 长度的输入被切成一系列 4K 长度的。

我们要回答的问题是，这个切 seqlen 是无损的吗？答案是：是也不是。

从 self-attention 来说，前文分析过 
![](https://www.zhihu.com/equation?tex=I_%7B%5Ctext%7Bself-atten%7D%7D%3D%5Cfrac%7B3%7D%7B2%7Dl_%7Binc%7D)，很明显如果我们的切分过于细碎（也就是 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D) 过小），是会导致 self-atten 的计算强度变小、最后变成 memory bound 的。

对于其他部分，
![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%3D2l_%7Binc%7D)，和 self-atten 部分结论一致。

但是一般来说其实不会切得细碎到变成 memory bound 的地步，所以其实大多数情况下不用担心这个。

问题：为什么需要攒 batch
在大模型 serving 的时候往往会倾向多个 batch 放在一起推理，这里还是从 roofline 角度考虑这个问题。

首先 prefill 我们直接跳过。。。因为它是 compute bound，多攒 batch 还是 compute bound，理论最优算力就是 
![](https://www.zhihu.com/equation?tex=%5CPi)，没有啥进步空间。

而 decode 阶段，对于 
![](https://www.zhihu.com/equation?tex=I_%7B%5Ctext%7Bself-atten%7D%7D%3D%5Cfrac%7B3%7D%7B2%7Dl_%7Binc%7D) 和 
![](https://www.zhihu.com/equation?tex=I_%7Bmatmuls%7D%3D2l_%7Binc%7D)，如果我们能攒 batch，理论上可以看作提高了 
![](https://www.zhihu.com/equation?tex=l_%7Binc%7D)，也就是提高了整个模型的计算强度，也会获得更高的理论最优算力。这就是攒 batch 的意义。

MFU
很简单，MFU 就是实际算力和芯片最高算力的比值。本文会用 
![](https://www.zhihu.com/equation?tex=%5Cpi) 记实际算力，用 
![](https://www.zhihu.com/equation?tex=f_%7B%5Ctext%7BMFU%7D%7D) 表示 MFU 值。所以 
![](https://www.zhihu.com/equation?tex=f_%7B%5Ctext%7BMFU%7D%7D%3D%5Cfrac%7B%5Cpi%7D%7B%5CPi%7D)。

需要注意，计算强度和 roofline 是不需要依赖真实的算子的，而 MFU 是衡量真实实现算子的指标。

在红色区域，MFU 受限于显存带宽，如果想要提升 MFU，基本只有打 batch、做权重量化、通过 HBM 存权重之类的对显存带宽做操作的方法。而在绿色区域，MFU 则已经没有受带宽限制了，如果还需要优化，就需要实际分析实现的细节了。

![](https://pic2.zhimg.com/v2-9ee36729bffceb77b8ed0fe3f03e0dc1_r.jpg)
MBU
和 MFU 类似，MBU 是实际带宽除以芯片最高带宽。