---
title: "Memory Bound、Compute Bound 和 Latency Bound"
date: "2023-12-27 00:00:00"
updated: "2023-12-27 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/Memory-Bound、Compute-Bound-和-Latency-Bound/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/673957960"
---


在对 GPU 计算进行性能优化时，清楚地定位优化对象的性能瓶颈是一切优化的基础。一般而言，GPU 计算中的性能瓶颈可以被归纳为两类：Compute Bound 和 Memory Bound，其中后者又可以细分为 Memory Bandwidth Bound 和 Memory Latency Bound。

#### Compute Bound

在计算和访存可以良好重叠的情况下，程序的执行时间主要花费在等待计算完成。一种观点认为，性能优化本质上是在尽可能地增加程序运行在 compute bound 下的时间，因为一般来说我们可以减少访问内存的开销，但是几乎不能减少对应的计算量（除非更换算法）。

硬件发展中计算能力的提升要显著快于内存带宽的提升，这使得我们越来越难以充分发挥全部的计算性能，compute bound 通常只出现在计算大规模矩阵乘法时。也正因如此，越来越多的机器学习加速器（GPU、TPU等）都提供了专门用于计算矩阵乘法的计算单元，如 Nvidia GPU 中的 Tensor Core。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_38ae33d5c9bd.jpg)

Nvidia A100 GPU Specifications从上表可以看出，对于 FP32 而言，如果我们不进行矩阵乘法，我们的计算能力只能达到 19.5TFLOPS 而不是通常声称的 312TFLOPS（即使是 19.5TFLOPS 也是考虑了 FMA 专用硬件，实际计算能力可能只有 9.75TFLOPS）。我们也许会担心这是否会影响其他算子的计算呢？答案是不会。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f427fa843549.jpg)

Proportions for operator classes in PyTorch从上表可以看出，相较于矩阵乘法运算（Tensor Contraction），非矩阵乘法运算需要的 FLOP 仅为 0.2%，因此对应计算性能相差  并不会产生计算瓶颈。同时我们也注意到，非矩阵乘法运算花费的时间远大于他们对应的计算量，其中原因便是下面要介绍的 Bandwidth Bound。

#### Memory Bandwidth Bound

广义上的 memory bandwidth cost 包括所有将数据从一个地方转移到另一个地方的开销，包括从一个节点到另一个节点，从节点内的 CPU 到 GPU，从 GPU 的全局内存到共享内存等。前两者常常出现在分布式系统的性能优化中，且常常使用网络开销（network cost）和数据传输开销（data transfer cost）具体指代；第三个则是通常讨论的狭义的 memory bandwidth cost。

GPU 上的内存分为全局内存（DRAM）和共享内存（SRAM）两种，前者空间更大但是访问速度更慢，后者空间更小但是访问速度更快。一个通常的计算流程是，首先将需要计算的数据从 DRAM 加载到 SRAM 中，随后基于 SRAM 上的数据进行计算，最后将 SRAM 的数据写回到 DRAM 中。假如在这个过程中，因为 DRAM 和 SRAM 之间的带宽有限，我们从 DRAM 中加载数据和将数据写回到 DRAM 中的时间占据了整个过程的绝大部分时间，我们的程序就属于 memory bandwidth bound。

算子融合（Operator Fusion）是解决 memory bandwidth bound 的常用方法，也是深度学习编译器（NVFuser、XLA等）中最重要的优化手段。其核心思路是将多个算子的计算融合进入一次数据在 DRAM 和 SRAM 的往返之间。

比如说，下面是对 x 计算两次 cos 函数的两种方式：

# Method 1

```text
x1 = x.cos() # Read from x in global memory, write to x1
x2 = x1.cos() # Read from x1 in global memory, write to x2
```


# Method 2
x2 = x.cos().cos() # Read from x in global memory, write to x2

第一种写法中，我们对全局内存进行了 4 次访问，而第二种写法中我们只进行了 2 次。在实际执行中，计算一次 x.cos().cos() 的时间和计算一次 x.cos() 的时间几乎一致（几乎所有的激活函数花费的时间都差不多），因此第二种写法可以获得更好的性能。

当然不是所有的算子都像上述 element-wise 那样简单，实际中我们可能需要将 element-wise 算子融入 reduction 或 matmul 运算中，甚至 matmul 本身也可以看作是 broadcast multiply 和 reduction 的融合。

#### Memory Latency Bound

> Bandwidth is money. Latency is physics.

对于一个 bandwidth bound 的程序，我们可以通过在更大的集群上运行使其变得更快；但对于一个 latency bound 的程序则不然，除非新的集群有着不同架构和更低的延迟。

假如我们想要向一个 1GB 的数组中写入 0：当一个处理器的带宽是 40GB/s 时，这个过程需要花费 25ms；而当我们使用两个这样的处理器同时写入时，这个过程将花费 12.5ms，因为我们的带宽变成了 80GB/s。

再假如我们想要访问 32MB 的指针链（1,000,000 个随机顺序的指针）：当使用桌面级处理器时，这个过程通常需要花费 100,000,000 个周期，而当使用服务器级处理器时，这个过程则只需要花费 50,000,000 个周期。二者的区别在于桌面级处理器的片上缓存空间不足以存放下全部的指针链，而服务器级处理器可以，访问片上缓存所花费的周期小于访问主存。

在第一个例子中，我们取得加速不是因为使用了不同的技术，而单纯因为使用了更多的带宽资源；而第二个例子中，我们取得加速只能通过使用不同的硬件。事实上这两个例子就分别对应着 HPC Challenge benchmark 中的 PTRANS（Parallel Transpose）和 Random Access，一般而言优化前者比后者更容易。

很多性能优化本质上是将 latency bound 转化为 bandwidth bound，比如常见的访存连续化，就是将多次不连续的访存合并为一次连续的访存，从而只花费一次访存的 latency 而增加对 bandwidth 的利用。

#### 参考资料

What is the difference between latency-bound and bandwidth-bound applications in high performance computing? - Quora

Making Deep Learning go Brrrr From First Principles (horace.io)

[[2007.00072] Data Movement Is All You Need: A Case Study on Optimizing Transformers (arxiv.org)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2007.00072)
