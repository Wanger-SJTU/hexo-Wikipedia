---
title: "(1 条消息) 机器学习中的高性能计算（二）SSE优化"
date: "2021-09-14 00:00:00"
updated: "2021-09-14 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/机器学习中的高性能计算(二)SSE优化/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/409973153"
---


在上篇文章中的最后，我们介绍了SIMD指令，最后留了一个小尾巴，今天补充完整。上文链接：[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a4bfe64df6ab.jpg)陈震：机器学习中的高性能计算（一）CPU优化316 赞同 · 16 评论 文章](https://zhuanlan.zhihu.com/p/384654825)

#### 8 SSE指令集介绍

目前，绝大多数的CPU都支持SIMD，不同的CPU架构和厂商提供了不同的SIMD指令集来支持，以常用的x86架构来说，我们可以通过SSE指令集来使用x86架构下的SIMD能力。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_50020c116ca4.jpg)

以SSE为代表的多种SIMD指令集SSE指令集是对普通指令集的扩充，其使用方法可以归纳为：“接-化-发”，即：

- 使用SSE专门的LOAD指令从内存加载一个向量到寄存器。
- 使用SSE专门的OP指令对两个向量进行某种计算
- 使用SSE专门的STORE指令把计算结果从寄存机写回到内存
在实际写代码中，我们可以直接使用汇编调用SSE相关的指令，但是更常见的方式还是用Intel提供的C/C++的指令集内联函数intrinsics，详细的文档见：Intel® Intrinsics Guide。比如跟LOAD指令相关的内联函数就有这么多，主要功能是从内存地址mem_addr处，加载128bit的数据到寄存器。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d2cc18feef6e.jpg)

Intel intrinsics中与load相关的指令集函数之所以有这么多种，首先由于支持的数据类型不同。其中__m128表示128bit的单精度浮点数；__m128h表示半精度；__128d表示128bit的双精度浮点数；__m128i表示128bit的整数型。

其次，函数签名不同。SSE指令的函数从命名上，主要分成三部分，以_mm_loadu_pd为例：

- 第一部分均以_mm开头，表示属于SSE指令集;
- 第二部分表明操作类型，比如load，add，store等。但部分指令后面跟有[l|h|u|r]等字母，比如u表示mem_addr不需要内存对齐，r表示反向读取等；
- 第三部分主要包括两个字母，大部分以[p|s]开头，p表示packed即对128bits的数据全部执行相同的操作，s表示scalar，只对128bit中的第一组数据执行操作，如下图所示。而第二个字母往往和数据类型相关，比如[d|h|s]等，分别表示双精度、半精度、单精度等。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_da3f168417a9.jpg)

由于SSE指令集发展多年，有SSE、SSE2、SSE3、SSEE3、SSE4.1、AVX等众多版本，但是命名上主要遵循上面的规则。在真正使用时可以查阅Intel® Intrinsics Guide 了解细节。

#### 8 SSE指令集优化

接下来尝试使用SSE指令集对原来的代码进行优化。由于SSE指令集操作的单位都是128bit，即可同时操作四个32bit的单精度float数据，为了编程方便，我们修改blur操作的kernel大小，从3*3修改为3*4，代码执行的流程如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8e53603a7a7a.jpg)

利用SSE指令集修改计算流程

- 通过三次_mm_loadu_ps操作，分别内存加载3*4个元素到寄存器。
- 通过两次_mm_add_ps操作，对寄存器中的数据执行packed加法操作，执行完成后寄存器中每一小部分都累积了结果。（类似于Ring AllReduce中的ScatterReduce操作）
- 接下来通过两次_mm_hadd_ps操作把集群器中的四个结果再次累加，_mm_hadd_ps操作比较特别，它会把相邻的两个数相加，然后把结果写到最高两位。（类似于Tree Reduce操作）
- 最后通过一次_mm_store_ss操作，把结果写回内存。由于寄存器中的四个元素的值都是最终的结果，因此只需要执行一次scalar操作即可。
此外，我们仍然可以用openmp，在循环的最外层进行并行计算加速，详细代码如下：

```cpp
// 导入SSE指令集的头文件
#include 

void blur_mat_sse(const vector> &input,
                  vector> &output) {
  int height = input.size();
  int width = input[0].size();
#pragma omp parallel for
  for (int y = 0; y = height ? height - 1 : y + 1;
      int below_below = y + 2 >= height ? height - 1 : y + 2;
      // 三次数据加载
      __m128 vdata_1 = _mm_loadu_ps(&input[y][x]);
      __m128 vdata_2 = _mm_loadu_ps(&input[below][x]);
      __m128 vdata_3 = _mm_loadu_ps(&input[below_below][x]);
      // 两次逐元素相加，packed操作
      __m128 vres = _mm_add_ps(vdata_1, vdata_2);
      vres = _mm_add_ps(vres, vdata_3);
      // 两次相邻元素相加，packed操作
      vres = _mm_hadd_ps(vres, vres);
      vres = _mm_hadd_ps(vres, vres);
      // 写回内存，scalar操作
      _mm_store_ss(&output[y][x], vres);
      output[y][x] /= 12;
    }
  }
}
```


看一下动图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4048bcfd1cce.jpg)

实际编译运行看一下效果。由于使用了SSE指令集，在编译时需要显示指定编译选项-msse3：

`$ g++ cpu.cpp -O0 -o cpu -std=c++11 -fopenmp -msse3 && ./cpu`

经过SSE指令集的优化，我们代码的性能进一步提升到了130ms，相较于最原始的版本，加速了30倍。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4bf97962ae0b.jpg)

#### 9 小结

这篇文章里，我们通过实现一个blur滤波器，把原来需要执行3.9秒的一段代码逐步优化到只需要0.13秒，加速比超过了30倍。其背后的原理并不复杂，主要是

- 消除重复计算
- 考虑内存/缓存的本地性
- 利用多核CPU并行计算
- 利用Tiling机制
- 使用SIMD SSE指令
等几个技术。其中加速效果最好，显而易见的，就是多核并行计算和SIMD机制。

在机器学习、深度学习应用中，主要的计算类型包括GEMM（通用矩阵乘法）、Conv（卷积）、Pooling、Activation等，这些计算本质上都满足并行计算和SIMD的前提，因此基于并行计算的优化方法被大量应用到机器学习领域中。

另一方面，如今的通用CPU发展越来越受制于物理定律的限制，即CPU的核数、L1/L2的缓存大小都难以有数量级上的增长，而计算的需求却在指数级增长，单纯靠CPU已经难以满足计算的需求。此时，以GPGPU为代表的专用加速器以拯救者的身姿出现在我们面前，成为推动深度学习发展的功臣。如何利用GPGPU继续优化我们的代码，我们放到下一篇中介绍。

本文涉及的代码，见：

[](https://link.zhihu.com/?target=https%3A//github.com/zackchen/ParallelProgrammingInAction)


参考资料

- https://ucbrise.github.io/cs294-ai-sys-sp19/
- https://halide-lang.org/
- https://www.sciencedirect.com/topics/computer-science/single-instruction-multiple-data
- https://www.sciencedirect.com/topics/computer-science/single-instruction-multiple-data
- https://blog.csdn.net/qq_27825451/article/details/103934359
- https://ecatue.gitlab.io/gpu2018/pages/Cookbook/matrix_multiplication_cuda.html
- https://blog.csdn.net/Bruce_0712/article/details/65447608
- https://www.cnblogs.com/skyfsm/p/9673960.html

> 最后，再宣传一下我和 @张觉非

 合著的书籍，近一年下来读者的反馈还是很正面的，适合对机器学习算法基本原理和深度学习框架的工程实现感兴趣的同学。感谢大家捧场。

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_74d6afdf49f1.jpg)广告

用Python实现深度学习框架（图灵出品）

¥66.70起

​

](https://union-click.jd.com/jdc?e=jdext-1420819354284290048-0-1&p=JF8BAQ4JK1olXgECVFZZDEMfAV8IGFMdWAIGU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYBXFZYDE8QHDZNRwYlOg9dLwQcaUNyAQ1sbRlwDmJGCyE7aEcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2gKG18WVQAAVFlYD3sXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVWAUDXV5VCk8SAGYNGFMUXAMLSF9BCHsXAm4LGlMXWwEHOl8zCEMTBGcNE14XWjYCZF1tViUWUGkKG14RCmhYEQYFVh5TRQEIGFMVWwYEVG5fCUoVAV8)
