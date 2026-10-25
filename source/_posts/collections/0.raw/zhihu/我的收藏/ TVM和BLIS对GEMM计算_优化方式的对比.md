---
title: (1 条消息) TVM和BLIS对GEMM计算/优化方式的对比
date: "2022-04-21 00:00:00"
updated: "2022-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/TVM和BLIS对GEMM计算_优化方式的对比/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/494347227
---


前段时间做了点用TVM对深度模型进行优化的事情。最近很空，因为觉得TVM比较有趣，就研究了一下TVM对GEMM的优化，并和BLIS库的实现进行了对比，记录如下。

#### 1. GEMM在CPU上的优化

        GEMM是指General Matrix Multiply，C=alpha<strong>AB+beta</strong>C，是神经网络中的核心运算。因为其计算的规律性，通过一定的技巧，在现代架构的CPU上可以得到比较好的优化。

        BLAS的计算库（MKL、penBLAS、BLIS等）一般对GEMM的计算进行手工优化。TVM、MLIR、Halide等则是将中间语言表示的GEMM运算编译生成执行的机器码来计算。

        本文对BLIS手工优化的GEMM计算代码和TVM编译生成的计算代码进行了对比分析。

#### 2. 相关代码及性能测试

[matmul_perf_test](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test)分别使用BLIS库和TVM进行1024x1024x1024的单精度（float32）和双精度（float64）矩阵乘法运算，并统计了单线程和多线程下的计算时间。

        测试机器：

                测试在一台机械革命笔记本上完成，机器配置参数如下：

                             CPU Model: AMD Ryzen 7 4800H with Radeon Graphics

                             CPUs: 16

                             主频：Max 2900, Min 1400, CPU调频未关闭

                             L1d cache:  256 KiB

                             L2 cache:  4 MiB

                             L3 cache:  8 MiB

                            OS: Ubuntu 20.04.1 64位

        测试结果：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4b57e3d1baaa.jpg)

Numpy（MKL），TVM和BLIS进行1024x1024x1024的单精度矩阵乘法的性能测试![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9a9f2192556f.jpg)

Numpy（MKL），TVM和BLIS进行1024x1024x1024的双精度矩阵乘法的性能测试        说明：

```text
            * [tvm_without_tune](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_without_tune.py)使用TVM的How to optimize GEMM on CPU例子计算方案并使用固定参数运行

            * [tvm_autotvm](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autotvm_tune.py)使用TVM的autotvm对tvm_without_tune的计算方案参数调优

            * [tvm_autoscheduler](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autoscheduler_tune.py)使用TVM的auto_scheduler自动搜索计算方案和最优参数

            * [blis](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/blis.cpp)调用本地编译的blis库进行计算，编译是使用 --enable-cblas -t openmp CC=clang CXX=clang++选项

            * numpy使用后端MKL支持的conda中的numpy binary进行同样的矩阵运算
```


#### 3. 使用TVM生成GEMM计算代码并对参数调优（TVM对GEMM的编译及优化）

        TVM官方How To Guids里面的How to optimize GEMM on CPU介绍了如何优化CPU上进行的GEMM运算。

        TVM官方 User Tutorial里面的Optimizing Operators with Schedule Templates and AutoTVM介绍了使用AutoScheduler模块对矩阵乘法调优的例子。

        TVM官方 User Tutorial里面的Optimizing Operators with Auto-scheduling介绍了使用AutoScheduler模块对矩阵乘法调优的例子。

        参考三篇文章，写了三个测试程序[tvm_without_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_without_tune.py)、[tvm_autotvm_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autotvm_tune.py)和[tvm_autoscheduler_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autoscheduler_tune.py)，分别使用How to中的例子代码固定分块大小等参数、使用AutoTVM调优和使用AutoScheduler调优生成C=AB的矩阵乘法计算计算代码并用MxKxN为1024x1024x1024的矩阵运算对比。

        速度方面：[tvm_autoscheduler_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autoscheduler_tune.py) > [tvm_autotvm_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autotvm_tune.py) > [tvm_without_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_without_tune.py)

        计算路径和优化方式方面：

[tvm_without_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_without_tune.py)主要使用了How To中介绍的Unroll（循环展开）、Blocking（矩阵分块）、Vectorization（SIMD）、Loop Permutation（调整分块的计算顺序）、Array Packing（数据重排）、Write cache for blocks（为写操作数据块创建连续内存缓存）Parallel（并发运算）几种手段。

[tvm_autotvm_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autotvm_tune.py)使用与tvm_without_tune.py相同的计算方式构建Operator并使用AutoTVM搜索了分块大小，块的计算顺序，是否使用unroll和vectorization等参数，生成计算代码。所以和tvm_without_tune.py使用了相同的优化方式。

[tvm_autoscheduler_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autoscheduler_tune.py)只使用TE构建了最基础的C=AB的计算表达式，auto_scheduler自动搜索包括Array Packing和Write cache for blocks等的优化方案和参数，生成计算代码。通过对比tvm_autoscheduler_tune.py和tvm_without_tune.py生成的IR，发现auto_scheduler搜索出来的优化方案，与tvm_without_tune.py里面的优化方案相同，并搜索出来针对测试机器更优的分块参数等。

下图对比了auto scheduler调优方案生成的IR（[tvm_autoscheduler_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_autoscheduler_tune.py)），与How to例子代码提供的固定方案和参数生成的IR（[tvm_without_tune.py](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/tvm_without_tune.py)）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9be4b0100cf7.jpg)

Auto Scheduler调优IR和TVM How to中的IR对比        因为上述三份TVM对应的代码使用的优化方案基本相同，而autoscheduler的结果有最优的速度，所以后续会拿autoscheduler调优的方案和参数与BLIS的实现进行对比。

下面是auto scheduler调优后的生成的IR

@main = primfn(A_1: handle, B_1: handle, C_1: handle) -> ()

```cpp
  attr = {"from_legacy_te_schedule": True, "global_symbol": "main", "tir.noalias": True}
  buffers = {C: Buffer(C_2: Pointer(float32), float32, [1024, 1024], []),
             B: Buffer(B_2: Pointer(float32), float32, [1024, 1024], []),
             A: Buffer(A_2: Pointer(float32), float32, [1024, 1024], [])}
  buffer_map = {A_1: A, B_1: B, C_1: C} {
  allocate(auto_scheduler_layout_transform: Pointer(global float32), float32, [1048576]), storage_scope = global {
    for (ax0.ax1.fused.ax2.fused: int32, 0, 64) "parallel" {
      for (ax4: int32, 0, 1024) {
        for (ax7: int32, 0, 16) {
          auto_scheduler_layout_transform[(((ax0.ax1.fused.ax2.fused*16384) + (ax4*16)) + ax7)] = (float32*)B_2[(((ax4*1024) + (ax0.ax1.fused.ax2.fused*16)) + ax7)]
        }
      }
    }
    for (i.outer.outer.j.outer.outer.fused: int32, 0, 16) "parallel" {
      allocate(C.local: Pointer(local float32x16), float32x16, [4]), storage_scope = local;
      for (i.outer.inner: int32, 0, 128) {
        for (j.outer.inner: int32, 0, 8) {
          for (i.c.inner.init: int32, 0, 4) {
            C.local[ramp((i.c.inner.init*16), 1, 16)] = broadcast(0f32, 16)
          }
          for (k.outer: int32, 0, 1024) {
            for (i.c.inner: int32, 0, 4) {
              C.local[ramp((i.c.inner*16), 1, 16)] = ((float32x16*)C.local[ramp((i.c.inner*16), 1, 16)] + (broadcast((float32*)A_2[((((floordiv(i.outer.outer.j.outer.outer.fused, 8)*524288) + (i.outer.inner*4096)) + (i.c.inner*1024)) + k.outer)], 16)*(float32x16*)auto_scheduler_layout_transform[ramp((((floormod(i.outer.outer.j.outer.outer.fused, 8)*131072) + (j.outer.inner*16384)) + (k.outer*16)), 1, 16)]))
            }
          }
          for (i.inner: int32, 0, 4) {
            C_2[ramp((((((floordiv(i.outer.outer.j.outer.outer.fused, 8)*524288) + (i.outer.inner*4096)) + (i.inner*1024)) + (floormod(i.outer.outer.j.outer.outer.fused, 8)*128)) + (j.outer.inner*16)), 1, 16)] = (float32x16*)C.local[ramp((i.inner*16), 1, 16)]
          }
        }
      }
    }
  }
}
```


#### 4. BLIS GEMM计算的算法简介

        项目中的[blis.cpp](https://link.zhihu.com/?target=https%3A//github.com/billmuch/matmul_perf_test/blob/main/blis.cpp)使用BLIS库做C+=AB的运算。参考介绍BLIS GEMM算法的[tutorial](https://link.zhihu.com/?target=https%3A//github.com/flame/blislab/blob/master/tutorial.pdf)，BLIS的计算方式如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c5ab6671c8c3.jpg)

#### 5. <strong>TVM和BLIS</strong>分块及计算路径的对比

<strong>BLIS分块</strong>

         参考BLIS [tutorial](https://link.zhihu.com/?target=https%3A//github.com/flame/blislab/blob/master/tutorial.pdf)和BLIS代码，BLIS分块方式和计算路径如下图示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5c46383de1fc.jpg)

```text
          BLIS（单线程）将C矩阵分成多个Cb(144 x 1024)的block（还有一些剩余的m != 144的块），A分成多个Ab(144 x 256)block，B分成多个Bb(256 x 1024)的block，按照需要将Ab的多个block与对应的不同的Bb相乘，将结果加回对应的Cb中。

          对其中的每一个Cb += Ab x Bb，后续会将Cb分为许多更小的Cr(6 x 16)的小块，对每一个Cr和对应的Ar和Br中的每一个k，使用Cr(6 x 16) += Ar(6 x 1) * Br(1 x 16)的kernel进行计算。
```


<strong>TVM分块</strong>

          根据TVM auto scheduler生成的IR，搜索出的算法计算路径如下图示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_50a847c00c8e.jpg)

```text
          TVM将C矩阵分成多个Cb(512 x 128)的block，A分成多个Ab(512 x 1024)block，B分成多个Bb(1024 x 128)的block，按照需要将Ab的多个block与对应的不同的Bb相乘，将结果加回对应的Cb中。

          对其中的每一个Cb += Ab x Bb，将Cb分为许多更小的Cr(4 x 16)的小块，对每一个Cr和对应的Ar和Br中的每一个k，使用Cr(4 x 16) += Ar(4 x 1) * Br(1 x 16)的kernel进行计算。        
```


#### 6. TVM和BLIS kernel计算方式

 BLIS将需要计算的矩阵按照前述方式分成大块后，在我的机器上将每块再次分成多个6x16小块，并调用手工优化的内核对每个小块进行计算。核心计算代码如下：

```x86asm
	mov(var(k_iter), rsi) // i = k_iter;
	test(rsi, rsi) // check i via logical AND.
	je(.SCONSIDKLEFT) // if i == 0, jump to code that
	// contains the k_left loop.

	label(.SLOOPKITER) // MAIN LOOP

	// iteration 0
	prefetch(0, mem(rax, 64*4))

	vbroadcastss(mem(rax, 0*4), ymm2)
	vbroadcastss(mem(rax, 1*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm4)
	vfmadd231ps(ymm1, ymm2, ymm5)
	vfmadd231ps(ymm0, ymm3, ymm6)
	vfmadd231ps(ymm1, ymm3, ymm7)

	vbroadcastss(mem(rax, 2*4), ymm2)
	vbroadcastss(mem(rax, 3*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm8)
	vfmadd231ps(ymm1, ymm2, ymm9)
	vfmadd231ps(ymm0, ymm3, ymm10)
	vfmadd231ps(ymm1, ymm3, ymm11)

	vbroadcastss(mem(rax, 4*4), ymm2)
	vbroadcastss(mem(rax, 5*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm12)
	vfmadd231ps(ymm1, ymm2, ymm13)
	vfmadd231ps(ymm0, ymm3, ymm14)
	vfmadd231ps(ymm1, ymm3, ymm15)

	vmovaps(mem(rbx, -2*32), ymm0)
	vmovaps(mem(rbx, -1*32), ymm1)

	// iteration 1
	vbroadcastss(mem(rax, 6*4), ymm2)
	vbroadcastss(mem(rax, 7*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm4)
	vfmadd231ps(ymm1, ymm2, ymm5)
	vfmadd231ps(ymm0, ymm3, ymm6)
	vfmadd231ps(ymm1, ymm3, ymm7)

	vbroadcastss(mem(rax, 8*4), ymm2)
	vbroadcastss(mem(rax, 9*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm8)
	vfmadd231ps(ymm1, ymm2, ymm9)
	vfmadd231ps(ymm0, ymm3, ymm10)
	vfmadd231ps(ymm1, ymm3, ymm11)

	vbroadcastss(mem(rax, 10*4), ymm2)
	vbroadcastss(mem(rax, 11*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm12)
	vfmadd231ps(ymm1, ymm2, ymm13)
	vfmadd231ps(ymm0, ymm3, ymm14)
	vfmadd231ps(ymm1, ymm3, ymm15)

	vmovaps(mem(rbx, 0*32), ymm0)
	vmovaps(mem(rbx, 1*32), ymm1)

	// iteration 2
	prefetch(0, mem(rax, 76*4))

	vbroadcastss(mem(rax, 12*4), ymm2)
	vbroadcastss(mem(rax, 13*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm4)
	vfmadd231ps(ymm1, ymm2, ymm5)
	vfmadd231ps(ymm0, ymm3, ymm6)
	vfmadd231ps(ymm1, ymm3, ymm7)

	vbroadcastss(mem(rax, 14*4), ymm2)
	vbroadcastss(mem(rax, 15*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm8)
	vfmadd231ps(ymm1, ymm2, ymm9)
	vfmadd231ps(ymm0, ymm3, ymm10)
	vfmadd231ps(ymm1, ymm3, ymm11)

	vbroadcastss(mem(rax, 16*4), ymm2)
	vbroadcastss(mem(rax, 17*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm12)
	vfmadd231ps(ymm1, ymm2, ymm13)
	vfmadd231ps(ymm0, ymm3, ymm14)
	vfmadd231ps(ymm1, ymm3, ymm15)

	vmovaps(mem(rbx, 2*32), ymm0)
	vmovaps(mem(rbx, 3*32), ymm1)

	// iteration 3
	vbroadcastss(mem(rax, 18*4), ymm2)
	vbroadcastss(mem(rax, 19*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm4)
	vfmadd231ps(ymm1, ymm2, ymm5)
	vfmadd231ps(ymm0, ymm3, ymm6)
	vfmadd231ps(ymm1, ymm3, ymm7)

	vbroadcastss(mem(rax, 20*4), ymm2)
	vbroadcastss(mem(rax, 21*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm8)
	vfmadd231ps(ymm1, ymm2, ymm9)
	vfmadd231ps(ymm0, ymm3, ymm10)
	vfmadd231ps(ymm1, ymm3, ymm11)

	vbroadcastss(mem(rax, 22*4), ymm2)
	vbroadcastss(mem(rax, 23*4), ymm3)
	vfmadd231ps(ymm0, ymm2, ymm12)
	vfmadd231ps(ymm1, ymm2, ymm13)
	vfmadd231ps(ymm0, ymm3, ymm14)
	vfmadd231ps(ymm1, ymm3, ymm15)

	add(imm(4*6*4), rax) // a += 4*6  (unroll x mr)
	add(imm(4*16*4), rbx) // b += 4*16 (unroll x nr)

	vmovaps(mem(rbx, -4*32), ymm0)
	vmovaps(mem(rbx, -3*32), ymm1)

	dec(rsi) // i -= 1;
	jne(.SLOOPKITER) // iterate again if i != 0.

         BLIS在计算时使用了一个6x16的内核来计算。在一个C(6x16)的计算中，C的所有数据常驻寄存器ymm4~ymm15；k从0到256（KC=256），对每一个k值ki，将b（1x16)的值加载到ymm0和ymm1中；将ki对应的a(6x1)中的a0，a1值作为一组，load到ymm2和ymm3中，与ymm0，ymm1相乘后加回C对应行数据所在的寄存器中，之后再计算第二组a2，a3和第三组a4，a5。
```


        从代码中可以注意到，a, b数组内数据全部连续存放。（每次的vbroadcastss数据地址连续）

        如下图示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0dd90a4a246f.jpg)

BLIS Kernel做如下计算![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_02049ac2f63f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0572e3683700.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_08b952bb4b1f.jpg)

        TVM auto scheduler生成的kernel对应的汇编代码如下：

.LBB3_8:

```text
	vmovaps	(%rsi), %ymm8
	vmovaps	32(%rsi), %ymm9
	vbroadcastss	-8192(%rdx,%rbx), %ymm10
	vfmadd231ps	%ymm9, %ymm10, %ymm7
	vfmadd231ps	%ymm10, %ymm8, %ymm6
	vbroadcastss	-4096(%rdx,%rbx), %ymm10
	vfmadd231ps	%ymm9, %ymm10, %ymm5
	vfmadd231ps	%ymm10, %ymm8, %ymm4
	vbroadcastss	(%rdx,%rbx), %ymm10
	vfmadd231ps	%ymm9, %ymm10, %ymm3
	vfmadd231ps	%ymm10, %ymm8, %ymm2
	vbroadcastss	4096(%rdx,%rbx), %ymm10
	vfmadd231ps	%ymm9, %ymm10, %ymm1
	vfmadd231ps	%ymm8, %ymm10, %ymm0
	addq	$64, %rsi
	addq	$4, %rbx
	jne	.LBB3_8

        在一个C(4x16)的计算中，C的所有数据常驻寄存器ymm0~ymm7；k从0到1024，对每一个k值ki，将b（1x16)的值加载到ymm8和ymm9中；将ki对应的a(4x1)中的4个a值，分4次load到ymm10中，与ymm8和ymm9相乘后加回C对应行数据所在的寄存器中。

        从代码中可以注意到，对于同一个b数组的所有数据是连续存放的（pack_b)，而a中的两个数据相距4096（vbroadcasts的数据地址相距4096，对应A的一行），没做任何pack。
```


        如下图示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3f425a937ad.jpg)

TVM Kernel做如下计算![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_75979ddd67a7.jpg)

TVM kernel计算步骤
#### 7. <strong>TVM和BLIS的</strong>Pack和Write Back Cache

<strong>TVM</strong>

        TVM在所有计算开始前，将原先行主序1024x1024的B矩阵重排成每1024x16一组的行主序的小矩阵连续存放，称为B_Pack：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ee0e55e48bbf.jpg)

        TVM IR声明了一个4x16大小的连续内存，作为C Write Back Cache使用。在kernel计算每个C(4x16)的块时，将C数据放到这部分连续的内存中。但是因为最终的优化算法将C(4x16)的数据常驻寄存器，并且将K从0到1024一次性计算完成（代表C(4x16)的数据一次性全部计算完成，不用重复加载），所以这部分C Write Back Cache并没有增加收益。

<strong>BLIS</strong>

        参考介绍BLIS的[tutorial](https://link.zhihu.com/?target=https%3A//github.com/flame/blislab/blob/master/tutorial.pdf)和BLIS代码，BLIS在loop 4中对B的一条Bp（256x1024）做了pack，pack的方式和TVM中一样，将Bp中的数据按照每16列一组的方式重排。BLIS还在loop 3中对A的每一块Ab（144x256）做了非常精细的重排，让Ab中的所有数据按照在kernel中的访问顺序顺序排列。（对于6x16的kernel，Ab的pack顺序是每6行为一组，按照列顺序重排，排完一组再排下6行）如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cfde0acf8ac5.jpg)

#### 8. <strong>TVM和BLIS的</strong>多线程

<strong>TVM</strong>

        跟据TVM IR的代码，TVM在最外层循环可以将计算划分到16个线程中计算。运行后观察，没有看到有cpu迁移现象，应该在代码中做了绑核。代码根据TVM_NUM_THREADS生成一个或多个线程进行计算。

<strong>BLIS</strong>

        根据BLIS的[Multithreading](https://link.zhihu.com/?target=https%3A//github.com/flame/blis/blob/master/docs/Multithreading.md)文档，BLIS会根据问题的大小（M、N和K的大小）和可用线程数，在5层loop其中的4层中，将问题分解到多个线程中计算。BLIS库可以使用pthread或者openmp，我本地编译时指定使用openmp。调试观察到，设置的可用线程数（BLIS_NUM_THREADS）也会影响blocking时的分块大小。设置环境变量可控制绑核。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_59a270d34c38.jpg)

BLIS 影响线程的环境变量
#### 9. 单精度GEMM时，TVM与BLIS的对比

- <strong>计算kernel的对比：</strong>
                对比两部分kernel的代码可以看出：

                 1. BLIS的6x16的kernel用满了16个ymm寄存器，TVM的4x16的kernel使用了11个。BLIS的核更充分的利用了硬件资源；

                 2. BLIS在进行计算时顺序加载两个a到ymm2和ymm3中（vbroadcast)，再分别和ymm0, ymm1相乘后写入另外两个不同的寄存器中（vfmadd）。而TVM的代码将一个a加载到ymm10后马上调用vfmadd指令后，计算结束后再次加载数据到ymm10。BLIS的代码具有更高的throughput（vfmadd和vbroadcast的latency大于1的话）；

                 3. BLIS代码在进行一段数据计算前，会提前调用prefetch加载下一阶段计算要使用的数据到L1Cache中，可以使数据加载更少的stall CPU。（prefetch指令可能会失效，硬件会使用预设的prefetch策略预加载数据）

- <strong>分块方式对比：</strong>

- BLIS的分块和计算：

```text
                单线程的时候，BLIS将乘法先分成大的block mc(144 x 1024) += ac(144 x 256) * bc(256 x 1024)，在计算大block的乘法时，再把三个块进一步分成小的block乘法 mr(6 x 16) += ar(6 x 256) * br (256  x 16)解决。

                进行一次大block计算时，一个mc 576K，一个ac 144K，一个bc 1M。两次相邻的大block计算，会共用同一个bc，所以需要2 **576 + 2 * *144 + 1024 = 2464K数据。每个CPU有4M的L2 Cache，所以所有数据都可以存在在L2 Cache中。

                进行小block的计算时，mr (6x16)的数据384 Bytes常驻ymm寄存器，一个ar 6144 Bytes，一个br 16 K。两次相邻的小block计算，会共用同一个br，共需要2 *384 + 2 * 6144 + 16384 = 28.75 K。每个CPU有256 K的L1 Cache，所以所有数据都可以存在在L1 Cache中。
```


2. TVM的分块和计算： 

                TVM将C矩阵分为16个大块后，对每一个大块，再分成mc (4 x 16) += ac(4 x 1024) * bc (1024 x 16)的小块乘法操作。一次小block计算时，mc有256 Bytes数据常驻ymm寄存器，一个ac 16K数据，一个bc 64K数据。两次相邻的block计算，会共用同一个ac，共需要256  * 2 + 16K  + 64K * 2 约为145K数据。每个CPU有256K的L1 Cache，所有数据都可以存在在L1 Cache中。

3. 关于BLIS的MC=144的分块方式：

                BLIS使用6x16的kernel，144是6的倍数，所以可以看到BLIS选择了144来做对M分大块时的参数。

                我在测试时使用1024x1024x1024的MKN的矩阵让TVM autoscheduler搜索6000次，没搜索出m=6的kernel。

                很有趣的是，矩阵乘法与 SIMD这篇文章使用144x144x144的MKN进行TVM的优化方案和参数搜索，搜索出了更高效的6x16的kernel。生成的汇编代码几乎与BLIS的计算方式一样，只是只使用了15个ymm寄存器。TVM中这段代码反复将A块的一个元素vbroadcast到ymm14，再做fmadd运算；而BLIS中会将A块的两个元素分别vbroadcast到两个ymm寄存器中，因为vbroadcast有大于1的latency，BLIS多用一个寄存器后可以得到更好的性能。

参考关于sgemm_hsw的一点解释说明，CPU的register renaming技术可能有硬件将这段代码中引用的逻辑寄存器ymm14实际mapping到不同的物理寄存器上以提高并行性。好的编译器也可能可以对这部分进行优化。
编辑于2022.4.19                下面代码是矩阵乘法与 SIMD文章使用144x144x144的MKN搜索出的6x16的kernel。

vbroadcastss    -2324(%rdx,%rbx), %ymm14

```text
vmovaps (%rbp), %ymm13
vmovaps 32(%rbp), %ymm12
```

vfmadd231ps     %ymm13, %ymm14, %ymm10
vfmadd231ps     %ymm14, %ymm12, %ymm11
vbroadcastss    -1748(%rdx,%rbx), %ymm14
vfmadd231ps     %ymm13, %ymm14, %ymm8
vfmadd231ps     %ymm14, %ymm12, %ymm9
vbroadcastss    -1172(%rdx,%rbx), %ymm14
vfmadd231ps     %ymm13, %ymm14, %ymm6
vfmadd231ps     %ymm14, %ymm12, %ymm7
vbroadcastss    -596(%rdx,%rbx), %ymm14
vfmadd231ps     %ymm13, %ymm14, %ymm4
vfmadd231ps     %ymm14, %ymm12, %ymm5
vbroadcastss    -20(%rdx,%rbx), %ymm14
vfmadd231ps     %ymm13, %ymm14, %ymm2
vfmadd231ps     %ymm14, %ymm12, %ymm3
vbroadcastss    556(%rdx,%rbx), %ymm14
vfmadd231ps     %ymm13, %ymm14, %ymm0
vbroadcastss    -2320(%rdx,%rbx), %ymm13
vfmadd231ps     %ymm12, %ymm14, %ymm1

-         Pack方式对比：
                1. BLIS对A矩阵数据按照访问顺序做了重排，而TVM没有。

                      a. BLIS重排A可以让prefetch指令和硬件prefetch更有效的工作。对比TVM kernel核心计算代码，没有显示的prefetch指令加载，硬件prefetch也不会预加载4k外的data，此时的cache miss肯定会stall CPU。

                      b. BLIS重排A可以提高L1 cache的利用率。对于4*x的kernel，BLIS只需要2个cache line（一个加载当前使用的A的4个元素，另一个预加载下一批不在cache中的连续4个元素）。因为TVM的两个被连续访问的A中的元素相距4k，则需要4个cache line。如果调用prefetch预加载后续4个元素，则需要8个cache line。

                      c. 同b，重排A可以提高TLB的利用率。还是举例4*x的kernel，对于连续的A中元素的访问，BLIS只需要2个TLB entries（一个给当前计算的数据使用，一个给下一组计算的数据使用）；当OS使用4k的Page Size时，因为TVM的两个被连续访问的A中的元素相距4k，需要两个entries，则做和BLIS相应的两组4*x的数据计算，需要8个TLB entries。

                      但是因为测试时使用的Zen2架构cpu的TLB L1有64个entries足够大，所以对于TVM的4*16的kernel，TLB并不是瓶颈。

                      使用perf统计了BLIS和TVM在做float32的1024x1024x1024的GEMM时候的dTLB-loads和dTLB-load-misses，并没有明显差别。

blis_float32tvm_float32dTLB-loads199,895,991168,586,332dTLB-load-misses4,610,995（2.31%）4,790,574（2.84%）                      d. 对于每一个BLIS的分块A（mc x kc），重排数据相比TVM多了2 x mc x kc次memory operations （一次读一次写）。但是合理安排做重排A的代码的位置，使数据被重排后可以马上被用来参与计算，这样就可以让多出来的内存读写只发生在L1 Cache和L2 Cache之间（重排后，还在L2 Cache没被换出时就被用来计算）。

                2. BLIS和TVM对B矩阵做了相同的重排。不同的地方是BLIS将B矩阵重排分为多个块嵌入到矩阵乘法计算线程中执行，而TVM将B重排放在所有计算开始之前整块一次性执行（利用多线程）。

                TVM的所有矩阵计算线程需要等待B Pack矩阵全部重排完后再开始（虽然重排也是多线程执行的）。BLIS的每个工作线程可以等待自己需要用到的块重排完后马上开始。

                因为BLIS的B重排有更小的块和合适的代码位置，让重排后的数据马上参与运算，应该可以更好的利用L2 Cache中的数据。

                3. TVM的Write Cache for C block因为c的数据常驻寄存器，似乎是无效的优化。

- <strong>线程策略对比：</strong>
                TVM在最外层循环对数据分块使用多线程计算。BLIS使用了更为精致的线程划分策略：可以在5层循环的1，2，3，5层中对划分的块用多线程计算。并且可以根据计算规模大小（MKN大小）和可用线程多少动态决定在哪些层的划分块那里使用多线程计算。

                TVM代码已经绑核，BLIS需要设置环境变量绑核。

                论文Anatomy of High-Performance Many-Threaded Matrix Multiplication对在什么维度做多线程调用做了讨论。

#### 10. 对比小结

         通过对比可以看出，对于类似GEMM的计算，TVM可以自动搜索出性能还不错的计算方式和参数。

        TVM对在CPU上进行GEMM计算生成的代码，相比针对特定平台手工优化的代码，仍然显得粗糙一些，性能也会稍微差一些。

#### 参考文献

- Anatomy of High-Performance Matrix Multiplication https://www.cs.utexas.edu/users/flame/pubs/GotoTOMS_final.pdf
-  blislab tutorial [https://github.com/flame/blislab/blob/master/tutorial.pdf](https://link.zhihu.com/?target=https%3A//github.com/flame/blislab/blob/master/tutorial.pdf)
- How to optimize GEMM on CPU https://tvm.apache.org/docs/how_to/optimize_operators/opt_gemm.html
- TVM AutoTVM 教程 https://tvm.apache.org/docs/tutorial/autotvm_matmul_x86.html
- TVM Auto-scheduling 教程 https://tvm.apache.org/docs/tutorial/auto_scheduler_matmul_x86.html
- How to optimize gemm [https://github.com/flame/how-to-optimize-gemm](https://link.zhihu.com/?target=https%3A//github.com/flame/how-to-optimize-gemm)
- 矩阵乘法与 SIMD 矩阵乘法与 SIMD
- 单核矩阵乘法性能测试 [https://github.com/mmperf/mmperf](https://link.zhihu.com/?target=https%3A//github.com/mmperf/mmperf)
- 浮点峰值那些事儿 [https://zhuanlan.zhihu.com/p/28226956](https://zhuanlan.zhihu.com/p/28226956)
- 关于sgemm_hsw的一点解释说明 关于sgemm_hsw的一点解释说明-技术圈
- Wiki Register renaming https://en.wikipedia.org/wiki/Register_renaming
