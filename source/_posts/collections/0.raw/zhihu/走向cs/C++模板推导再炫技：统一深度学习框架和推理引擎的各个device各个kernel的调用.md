---
title: C++模板推导再炫技：统一深度学习框架和推理引擎的各个device各个kernel的调用
date: "2024-03-20 00:00:00"
updated: "2024-03-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/C-模板推导再炫技-统一深度学习框架和推理引擎的各个device各个kernel的调用/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/688135917
---


最近迷恋上了模板，看了很多模板推导，模板偏特化，模板特化，变长参数模板的例子，之前也发过一些模板的文章，比如[这篇paddle的](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzg2ODk4MzE2MQ%3D%3D%26mid%3D2247484113%26idx%3D1%26sn%3D047f740a448f3d15ca3eceff32cd3615%26chksm%3Dcea54ac7f9d2c3d1e7e6e3c83fba79068b8ef76b51150bd8b8029969da55e89b26825d6b3737%26scene%3D21%23wechat_redirect)，本文会比paddle的这篇略简单一点，另外，准备后面几期文章再带来几个C++模板与深度学习应用结合的case。[原文位于此](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzg2ODk4MzE2MQ%3D%3D%26mid%3D2247484289%26idx%3D1%26sn%3Dbbbfefaa2232ca61ecee18c91663e032%26chksm%3Dcea54b97f9d2c281a2db6e01b6e7ee10254e29505dab7d8c074247a38c7659c489b10429d2e2%26token%3D416700032%26lang%3Dzh_CN%23rd)

### 背景和问题

cpu和gpu的gemm实现肯定是不同的，以调库为例，一个是可以调cblas，一个是可以调cublas甚至cutlass，因为cblas和cublas的参数比较类似，所以本文选择cublas作为例子来讲。

那么问题来了，成熟的深度学习框架或者深度学习推理引擎都支持好几个后端device，比如IntelCPU armCPU AMDCPU NVGPU AMDGPU NPU XPU FPGA..etc, 那么我该如何实现一套优雅的自动化机制或接口，使得上层指定一个类型为某某device，就可以自动分发到指定device的不同gemm实现，而不是hard code直接调用某个device的gemm实现，如果把不同device的gemm实现比作人类的各个部位，那么上层指定device的输入就可比作大脑的指令，这套自动化机制和接口就是血液，优雅的流到不同的部位。

### 方法

废话不多说，直接show code。

我的最上层接口要调用matmul：

```cpp
template typename T, typename Device>
void MatmulKernel(const Device& dev,
        ...) {
  //初始化名为blas的这个handle，本质就是初始化了一个叫做Blas的类
  auto blas = GetBlasDevice, T>(dev);
  // handle调用matmul，完事
  blas.MatMul(args...);
}
```


这就是最上层的调用接口，只需要指定计算类型和Device，那就会自动分发到底层若干device的若干类型的gemm实现

接下来一步步接口第5行和第7行的神秘面纱：

第5行：不出所料，其实就是个构造函数的调用

template typename Device, typename T>
inline BlasDevice, T> GetBlas(const Device& dev) {

```text
  return BlasDevice, T>(dev);
}
```


第7行：Blas这个类包含了如下GEMM和Matmul等等一系列(重载)成员函数，用于handle不同输入参数的矩阵乘法需求。可以看出，Blas这个类其实就是一个wrapper类，负责承上启下的模板推导，推导到不同device的gemm实现

```cpp
template typename Device, typename T>
class Blas {
 public:
  explicit Blas(const Device& dev) : dev_(dev) {}

  void GEMM(bool transA,
            bool transB,
            int M,
            int N,
            int K,
            T alpha,
            const T* A,
            int lda,
            const T* B,
            int ldb,
            T beta,
            T* C,
            int ldc) const;

  void MatMul(Tensor& mat_a,
              bool trans_a,
              Tensor& mat_b,
              bool trans_b,
              T alpha,
              Tensor* mat_out,
              T beta) const;
   ......
}
```


那么我们接下来就可以上不同device的gemm具体实现，本质上就是模板偏特化和模板特例化，这是模板世界的IfThenElse，此处只给了CPU和GPU的特化，如果还有其它设备那么接着针对此设备特化实现即可

```cpp
template typename T>
void BlasCPU, T>::GEMM(CBLAS_TRANSPOSE transA,
                                 CBLAS_TRANSPOSE transB,
                                 int M,
                                 int N,
                                 int K,
                                 T alpha,
                                 const T *A,
                                 const T *B,
                                 T beta,
                                 T *C) const {
  int lda = (transA == CblasNoTrans) ? K : M;
  int ldb = (transB == CblasNoTrans) ? N : K;
  int ldc = N;
  CBlasT>::GEMM(CblasRowMajor,
                 transA,
                 transB,
                 M,
                 N,
                 K,
                 alpha,
                 A,
                 lda,
                 B,
                 ldb,
                 beta,
                 C,
                 ldc);
}

template typename T>
void BlasGPU, T>::GEMM(bool transA,
                                 bool transB,
                                 int M,
                                 int N,
                                 int K,
                                 T alpha,
                                 const T *A,
                                 int lda,
                                 const T *B,
                                 int ldb,
                                 T beta,
                                 T *C,
                                 int ldc) const {
  // Note that cublas follows fortran order, so the order is different from
  // the cblas convention.
  cublasOperation_t cuTransA = transA ? CUBLAS_OP_T : CUBLAS_OP_N;
  cublasOperation_t cuTransB = transB ? CUBLAS_OP_T : CUBLAS_OP_N;
```


  CUBlasT>::GEMM_EX(&cuda_ctx,
                       cuTransB,
                       cuTransA,
                       N,
                       M,
                       K,
                       &alpha,
                       B,
                       CUDA_R_32F,
                       ldb,
                       A,
                       CUDA_R_32F,
                       lda,
                       &beta,
                       C,
                       CUDA_R_32F,

```text
                       ldc);
```


### 番外篇1

在现有的大模型推理引擎里面，包括FT，lmdeploy，llama.cpp等等，说实话都是hard code到不同的device或kernel实现，并没有一个统一的接口来发牌，包括我的课程三里面，也是如此，还没有实现这一套模板推导机制，我计划后面把这样一个模板推导的优雅思想加入自己课程三中。

### 番外篇2

NV现有的把C++模板推导运用到极致的案例就是cutlass，它支持多个GPU架构多个数据类型多个计算单元多条计算指令多个epilogues的实现，假如我手里只有V100，我怎么利用cutlass调到v100 1st gen tensorcore来做HGEMM，假如我手里有A100, 我怎么利用cutlass调到A100 3rd gen tensorcore来做HGEMM，并且融合bias和relu这俩epilogues，假如我手里有H100, 我怎么利用cutlass调到H100 4rd gen tensorcore来做FP8 GEMM，并且采用splitK的K维度处理策略。以上cutlass是怎么分发的？当然是模板推导！！yep！！

有一个类叫做DefaultGemm，这个就是个典型的负责模板推导的类，类似于上文的Blas，推导到各个case的偏特化/特例化实现。

比如下面这个针对volta gpu作的偏特化实现

```cpp
/// Partial specialization for Volta architecture
template 
  /// Element type for A matrix operand
  typename ElementA,
  /// Layout type for A matrix operand
  typename LayoutA,
  /// Access granularity of A matrix in units of elements
  int kAlignmentA,
  /// Element type for B matrix operand
  typename ElementB,
  /// Layout type for B matrix operand
  typename LayoutB,
  /// Access granularity of B matrix in units of elements
  int kAlignmentB,
  /// Element type for C and D matrix operands
  typename ElementC,
  /// Element type for internal accumulation
  typename ElementAccumulator,
  /// Threadblock-level tile size (concept: GemmShape)
  typename ThreadblockShape,
  /// Warp-level tile size (concept: GemmShape)
  typename WarpShape,
  /// Epilogue output operator
  typename EpilogueOutputOp,
  /// Threadblock-level swizzling operator
  typename ThreadblockSwizzle,
  /// If true, kernel is configured to support serial reduction in the epilogue
  bool SplitKSerial,
  /// Operation performed by GEMM
  typename Operator,
  /// Use zfill or predicate for out-of-bound cp.async
  SharedMemoryClearOption SharedMemoryClear,
  /// Gather operand A by using an index array
  bool GatherA,
  /// Gather operand B by using an index array
  bool GatherB,
  /// Scatter result D by using an index array
  bool ScatterD
```

>

```text
struct DefaultGemm
  ElementA, LayoutA, kAlignmentA,
  ElementB, LayoutB, kAlignmentB,
  ElementC, layout::RowMajor,
  ElementAccumulator,
  arch::OpClassTensorOp,
  arch::Sm70,
  ThreadblockShape,
  WarpShape,
  GemmShape8, 8, 4>,
  EpilogueOutputOp,
  ThreadblockSwizzle,
  2,
  SplitKSerial,
  Operator,
  SharedMemoryClear,
  GatherA,
  GatherB,
  ScatterD
```

>

最后，感谢读者点赞和收藏，欢迎关注我的公众号“AI不止算法**”。
