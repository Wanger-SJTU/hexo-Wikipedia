---
title: AMOS ISCA 2022
date: "2022-06-19 00:00:00"
updated: "2022-06-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/AMOS-ISCA-2022/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/530626092
---


纽约时间今天早八点，第49届ISCA会议就将在美国纽约开幕了。在本次会议上，我有一篇文章得以发表，题目是AMOS: Enabling Automatic Mapping for Tensor Computations On Spatial Accelerators with Hardware Abstraction。作为一种记录，这里简要介绍一下AMOS是什么，解决什么问题。

### 1. AMOS idea

AMOS这个工作，其实很早就开始做了，我们设计代码生成工作，希望多考虑硬件特点。我发现GPU上新出的Tensor Core是一种新的硬件特性，而且当时TVM这种深度学习编译器对Tensor Core这类特殊指令的支持还比较原始，依靠手写tensorize schedule完成，对于输入的compute也有限制（比如要求卷积的layout是NHWC，batch, channel维度要能整除Tensor Core WMMA接口的问题规模）。所以当时我就想那我做一个允许前面compute更随意、后面tensorize自动化的工作，是不是就兼顾了软件优化和硬件特点呢。<strong>AMOS的idea就是希望能够提供合理的抽象和自动化算法，将多种多样的前端软件映射到后端定制硬件上。</strong>

### 2. AMOS实现

在接下来的几天里，我快速熟悉了如何用TVM的tensorize接口使用Tensor Core，并且想到不能只针对Tensor Core一个硬件优化，我还得更通用点，于是把带有特殊指令的其它硬件也一起放进来，初步构思了一个框架

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_6854ef1e793f.jpg)

在这个框架里，第一个要解决的问题就是如何从一个比较普通的输入compute里知道哪一部分是可以使用特殊指令的呢，其实这里就是一个匹配问题，比如说给定一个以下的NCHW卷积定义

`def conv2d(N, C, H, W, K, R, S, stride, padding, dilation):
    kH = (R - 1) * dilation + 1
    kW = (S - 1) * dilation + 1
    pH = H + 2 * padding
    pW = W + 2 * padding
    A = tvm.te.placeholder([N, C, H, W], dtype="float16", name="A")
    B = tvm.te.placeholder([K, C, R, S], dtype="float16", name="B")

    Pad = tvm.te.compute(
        [N, C, pH, pW],
        lambda n, c, h, w: tvm.tir.if_then_else(
            tvm.tir.all(h >= padding, h - padding  H, w >= padding, w - padding  W),
            A[n, c, h - padding, w - padding],
            tvm.tir.const(0.0, A.dtype),
        ),
        name="Pad",
    )

    rc = tvm.te.reduce_axis([0, C], name="rc")
    rr = tvm.te.reduce_axis([0, kH], name="rr")
    rs = tvm.te.reduce_axis([0, kW], name="rs")

    P = (pH - kH) // stride + 1
    Q = (pW - kW) // stride + 1
    Conv = tvm.te.compute(
        [N, K, P, Q],
        lambda n, k, p, q: tvm.te.sum(
            (
                Pad[n, rc, p * stride + rr * dilation, q * stride + rs * dilation]
                * B[k, rc, rr, rs]
            ).astype("float32"),
            axis=[rc, rr, rs],
        ),
        name="Conv",
    )
    return [A, B, Conv]

N, H, W, K, C, R, S, stride, padding, dilation = batch, 28, 28, 128, 128, 3, 3, 1, 1, 1
A, B, Conv = conv2d(N, C, H, W, K, R, S, stride, padding, dilation)`

这个程序写得没有为Tensor Core做任何特殊处理，和平时用在CUDA Core上的程序没什么区别，那我应该怎么对它使用Tensor Core优化呢？

这个问题我思考了几天，一般来说大家都会选择把卷积转换成矩阵乘法，然后映射到Tensor Core上，我就想这个变换是一定要做的么，如果换一个compute，那这种变换又会是怎样的呢？思考的结果就是我发现，其实卷积转矩阵乘法的方式可以不是唯一的，常用的im2col只是一个特殊情形。而将卷积转化为矩阵乘的过程，其实就是一个循环映射的过程，比如上面代码里我们用[n,k,p,q,rc,rr,rs]七个变量代表卷积七个循环，用[x,y,z]代表矩阵乘法的三个循环，那么im2col就是说要把n,p,q三个维度映射到x，rc,rr,rs三个维度映射到z，k维度映射到y。那么其实还有别的映射方式，比如只映射n维度到x，rc维度到z，k维度到y。这些所有的不同映射方式可以被系统化地表示为基本映射的组合，所谓基本映射，就是循环到循环的一对一映射，不考虑多个循环映射到一个维度的情形，比如卷积映射到矩阵乘法的基本映射，有七种基本映射

映射一映射二映射三映射四映射五映射六映射七xnnnppqqykkkkkkkzrcrrrsrcrsrcrr这七种基本映射相互组合可以产生复合映射，比如im2col是七种基本映射共同组合的结果，如果只组合七种映射的某几个，就会产生一些以前没探索过的处于“中间态”的映射，它们都是合法的。基于这种想法，我在AMOS里设计了匹配基本映射的功能（本质是AST匹配，等价于布尔矩阵运算，也就是当前paper里呈现的形式），并且可以基于这些基本映射自动生成复合映射。

有了自动生成映射的能力，下一个要解决的问题就是如何基于某个选定好的映射自动进行tensorize。tensorize有几个必要的操作：构建符合硬件存储层次的流水线，使用定制的数据搬移指令准备给特殊计算单元计算的数据，调用特殊计算单元的指令。这些步骤体现在Tensor Core GPU上就是从global memory把输入数据搬到shared memory，再从shared memory用load_matrix_sync搬到fragment，然后调用mma_sync进行计算，最后再store_matrix_sync到global memory。其它加速器基本都符合这种流程，而且更简单，比如Mali GPU可以不考虑搬移数据的特殊指令。这些流程不完全可以用TVM schedule primitive完成，而是需要结合compute的rewrite。为了解释这一点，我们可以看一下AMOS对上面二维卷积输入生成的CUDA代码

`extern "C" __global__ void default_function_kernel3(float* __restrict__ Conv_vmap_output, float* __restrict__ memcpy_dst) {
  for (int n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner = 0; n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner  4; ++n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner) {
    Conv_vmap_output[(((((((int)blockIdx.x) * 512) + (n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner * 128)) + (((int)threadIdx.y) * 32)) + ((int)threadIdx.x)))] = memcpy_dst[(((((((((((((int)blockIdx.x) * 512) + (n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner * 128)) + (((int)threadIdx.y) * 32)) + ((int)threadIdx.x)) % 784) >> 3) * 1024) + ((((((((int)blockIdx.x) * 512) + (n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner * 128)) + (((int)threadIdx.y) * 32)) + ((int)threadIdx.x)) / 25088) * 256)) + ((((int)threadIdx.x) & 7) * 32)) + ((((((((int)blockIdx.x) * 512) + (n_output_k_output_fused_p_output_fused_q_output_fused_outer_outer_inner * 128)) + (((int)threadIdx.y) * 32)) + ((int)threadIdx.x)) % 25088) / 784)))];
  }
}

extern "C" __global__ void default_function_kernel1(half* __restrict__ B_vmap_input_cmap_input, half* __restrict__ B) {
  for (int j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner = 0; j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner  4; ++j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner) {
    B_vmap_input_cmap_input[((((((((((((int)blockIdx.x) * 16) + (j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner * 4)) + ((int)threadIdx.y)) / 48) * 1536) + ((((int)blockIdx.x) % 3) * 512)) + (j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner * 128)) + (((int)threadIdx.y) * 32)) + ((int)threadIdx.x)))] = B[(((((((((((((int)blockIdx.x) * 16) + (j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner * 4)) + ((int)threadIdx.y)) / 1152) * 36864) + (((int)threadIdx.x) * 1152)) + ((((((((int)blockIdx.x) * 16) + (j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner * 4)) + ((int)threadIdx.y)) % 1152) / 48) * 48)) + (j_o_input_rk_o_input_fused_rs_main_input_fused_rk_input_fused_j_input_fused_outer_outer_inner * 12)) + (((int)threadIdx.y) * 3)) + (((int)blockIdx.x) % 3)))];
  }
}

extern "C" __global__ void default_function_kernel2(half* __restrict__ Pad_vmap_input_cmap_input, half* __restrict__ B_vmap_input_cmap_input, float* __restrict__ memcpy_dst) {
    nvcuda::wmma::fragmentnvcuda::wmma::accumulator, 8, 32, 16, float> Conv_vmap_main_cmap_main[1];
  __shared__ half Pad_vmap_input_cmap_input_shared[1536];
  __shared__ half B_vmap_input_cmap_input_shared[6144];
    nvcuda::wmma::fragmentnvcuda::wmma::matrix_a, 8, 32, 16, half, nvcuda::wmma::row_major> memcpy_dst1[2];
    nvcuda::wmma::fragmentnvcuda::wmma::matrix_b, 8, 32, 16, half, nvcuda::wmma::row_major> memcpy_dst2[2];
  (void)nvcuda::wmma::fill_fragment(Conv_vmap_main_cmap_main[0], 0.000000e+00f);
  for (int rk_o_main_outer_outer = 0; rk_o_main_outer_outer  4; ++rk_o_main_outer_outer) {
    for (int rs_main_main_outer_outer = 0; rs_main_main_outer_outer  3; ++rs_main_main_outer_outer) {
      __syncthreads();
        ((uint1*)(Pad_vmap_input_cmap_input_shared + (((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 128) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + ((((((((((int)blockIdx.x) >> 1) * 18432) + (rk_o_main_outer_outer * 2304)) + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0];
        ((uint1*)(Pad_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 128) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 256))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + (((((((((((int)blockIdx.x) >> 1) * 18432) + (rk_o_main_outer_outer * 2304)) + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 768))))[0];
        ((uint1*)(Pad_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 128) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 512))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + (((((((((((int)blockIdx.x) >> 1) * 18432) + (rk_o_main_outer_outer * 2304)) + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 1536))))[0];
        ((uint1*)(Pad_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 128) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 768))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + (((((((((((int)blockIdx.x) >> 1) * 18432) + (rk_o_main_outer_outer * 2304)) + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)) + 9216))))[0];
        ((uint1*)(Pad_vmap_input_cmap_input_shared + (((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1024) / 768) * 768) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) + 2) * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + (((((((((((int)blockIdx.x) >> 1) * 18432) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1024) / 768) * 9216)) + (rk_o_main_outer_outer * 2304)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) + 2) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0];
        ((uint1*)(Pad_vmap_input_cmap_input_shared + (((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1280) / 768) * 768) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) + 4) * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0] = ((uint1*)(Pad_vmap_input_cmap_input + (((((((((((int)blockIdx.x) >> 1) * 18432) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1280) / 768) * 9216)) + (rk_o_main_outer_outer * 2304)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) >> 7) + 4) * 384)) + (rs_main_main_outer_outer * 128)) + ((((((int)threadIdx.y) * 4) + (((int)threadIdx.x) >> 3)) & 7) * 16)) + ((((int)threadIdx.x) & 7) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + (((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 256))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 256))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 512))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 1536))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 768) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 768) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1024))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 3072))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1280) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1280) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1536))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 4608))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1792) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1792) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2048))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 6144))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2304) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2304) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2560))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 7680))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2816) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2816) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3072))))[0] = ((uint1*)(B_vmap_input_cmap_input + ((((((((((int)blockIdx.x) & 1) * 73728) + (rk_o_main_outer_outer * 9216)) + (rs_main_main_outer_outer * 512)) + (((int)threadIdx.y) * 64)) + (((int)threadIdx.x) * 2)) + 36864))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3328) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3328) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 256) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3584))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3584) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 512) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((int)threadIdx.y) * 64) + ((((int)threadIdx.x) >> 4) * 32))) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3840) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 3840) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 768) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4096))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4096) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1024) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((int)threadIdx.y) * 64) + ((((int)threadIdx.x) >> 4) * 32))) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4352) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4352) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1280) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4608))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4608) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1536) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((int)threadIdx.y) * 64) + ((((int)threadIdx.x) >> 4) * 32))) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4864) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 4864) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 1792) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5120))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5120) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2048) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((int)threadIdx.y) * 64) + ((((int)threadIdx.x) >> 4) * 32))) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5376) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5376) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2304) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5632))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5632) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2560) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((int)threadIdx.y) * 64) + ((((int)threadIdx.x) >> 4) * 32))) + ((((int)threadIdx.x) & 15) * 2)))))[0];
        ((uint1*)(B_vmap_input_cmap_input_shared + ((((((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5888) >> 9) * 512) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0] = ((uint1*)(B_vmap_input_cmap_input + (((((((((((int)blockIdx.x) & 1) * 73728) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 5888) / 3072) * 36864)) + (rk_o_main_outer_outer * 9216)) + (((((((int)threadIdx.y) * 64) + (((int)threadIdx.x) * 2)) + 2816) >> 9) * 1536)) + (rs_main_main_outer_outer * 512)) + ((((((int)threadIdx.y) * 2) + (((int)threadIdx.x) >> 4)) + 8) * 32)) + ((((int)threadIdx.x) & 15) * 2)))))[0];
      __syncthreads();
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[0], ((half *)Pad_vmap_input_cmap_input_shared + (((((int)threadIdx.y) >> 1) * 768))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[1], ((half *)Pad_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) >> 1) * 768) + 128))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[0], ((half *)B_vmap_input_cmap_input_shared + (((((int)threadIdx.y) & 1) * 3072))), 32);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[1], ((half *)B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) & 1) * 3072) + 512))), 32);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[0], memcpy_dst2[0], Conv_vmap_main_cmap_main[0]);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[1], memcpy_dst2[1], Conv_vmap_main_cmap_main[0]);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[0], ((half *)Pad_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) >> 1) * 768) + 256))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[1], ((half *)Pad_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) >> 1) * 768) + 384))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[0], ((half *)B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) & 1) * 3072) + 1024))), 32);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[1], ((half *)B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) & 1) * 3072) + 1536))), 32);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[0], memcpy_dst2[0], Conv_vmap_main_cmap_main[0]);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[1], memcpy_dst2[1], Conv_vmap_main_cmap_main[0]);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[0], ((half *)Pad_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) >> 1) * 768) + 512))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst1[1], ((half *)Pad_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) >> 1) * 768) + 640))), 16);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[0], ((half *)B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) & 1) * 3072) + 2048))), 32);
      (void)nvcuda::wmma::load_matrix_sync(memcpy_dst2[1], ((half *)B_vmap_input_cmap_input_shared + ((((((int)threadIdx.y) & 1) * 3072) + 2560))), 32);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[0], memcpy_dst2[0], Conv_vmap_main_cmap_main[0]);
      (void)nvcuda::wmma::mma_sync(Conv_vmap_main_cmap_main[0], memcpy_dst1[1], memcpy_dst2[1], Conv_vmap_main_cmap_main[0]);
    }
  }
  (void)nvcuda::wmma::store_matrix_sync(((float *)memcpy_dst + ((((((((int)blockIdx.x) >> 1) * 2048) + ((((int)threadIdx.y) >> 1) * 1024)) + ((((int)blockIdx.x) & 1) * 512)) + ((((int)threadIdx.y) & 1) * 256)))), Conv_vmap_main_cmap_main[0], 32, nvcuda::wmma::mem_row_major);
}`

可以看到 生成了一些额外的kernel用于layout转换，比如NCHW layout的卷积转成矩阵乘法的过程中的layout变换，就是利用这些kernel完成的。这些kernel也可以inline，这样就是implicit的操作，也可以不inline，这样就是explicit的操作，AMOS在后面搜索的时候会探索该不该inline。这些layout转换的操作需要改compute才能实现，原始的compute里没有这些操作的。为了实现这个改compute的操作，我设计了两步变换过程（对应文章里介绍的virtual mapping和physical mapping）。用卷积的例子简单说就是第一步先把要转换为矩阵乘的循环都展开、合并了，第二步再进行张量切分，把这些合并的大矩阵切成适合Tensor Core的小块（也会处理一些padding问题，这样就不会限制输入的形状了）。compute rewrite实现好了，剩下的就是靠schedule primitive进行优化，所以我实现了一个auto-scheduler，专门针对特殊指令自动进行schedule。

能自动生成映射、并根据映射进行auto-schedule，最后用TVM生成代码，整个流程基本就走通了，差的就是个DSE模块，也就是如何进行搜索。注意到现在我们面对的搜索空间是分两层，一层是选映射的，决定了怎么改compute，另一层是选schedule的，决定了怎么优化的。我对于搜索的设计就比较简单，没把重点放在这里，实现了一下启发式的类似模拟退火的算法结合两层结构的搜索空间进行树状搜索。

### 3. AMOS Talk

ISCA会议正在召开，由于疫情原因，我不能亲自到现场给talk，但是我提前准备好了talk video，在北京时间6月22日晚11:30，我的视频将在ISCA Session 10A Learning III播放，同时我也会在线回答问题，欢迎围观。

附加信息：

ISCA主页：https://iscaconf.org/isca2022/

AMOS视频地址：https://www.youtube.com/watch?v=w-s7AX4jHW0
