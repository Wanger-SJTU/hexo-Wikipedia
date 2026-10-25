---
title: "【Triton】 入门学习与matmul个人解读"
date: "2025-12-14 00:00:00"
updated: "2025-12-14 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/【Triton】-入门学习与matmul个人解读/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1898846353355944605"
---


Triton的学习需要会GPU架构：[复习GPU架构 以及 Triton 课程](https://zhuanlan.zhihu.com/%E5%A4%8D%E4%B9%A0GPU%E6%9E%B6%E6%9E%84%20%E4%BB%A5%E5%8F%8A%20Triton%20%E8%AF%BE%E7%A8%8B.md)

#### Matrix Multiplication详解

官方文档的 mat_mul 实现为： MatMul

- 基本的 matmul 函数实现；
- L2 Cache 优化；

- triton 以程序块的方式运行，比如 `pid = tl.program_id(axis=0)`  程序号 id
- 意思就是以分块的方式执行会比原来的少 load 次数；其实就是如何决定乘法的顺序；

然而官方的解释并不全，有一些其他的分享：[知乎分享](https://www.zhihu.com/question/622685131)

这篇文章以 mat_mul 代码为例，详解了 triton的编程，并有一些自己的想法。

- program_id的个人理解。从CUDA的角度来说，一个 grid 内部可以分为多个 block，其中 block 的排布可以是一维的、二维的、三维的。Triton 通常是以块为单位进行调度计算，那么 program_id 指的是某一个块的全局索引。（也可以理解成循环，如果只有一个SM，就要让该SM循环执行所有的 Block。）那么我们可以通过 `pid = tl.program_id(axis=0)` 和 `pid = tl.program_id(axis=1)`  来获得某个块在某个维度的索引。
<strong>Block-wise编程，Block上面的归用户，Block内部的归Triton compiler自动化处理</strong>与CUDA对应，Triton 以 Block 为单位，因此获得的是块的索引。CUDA是以 Thread 为单位，因此需要获得现成的索引。

-  pid = tl.program_id(axis=0)  表示当前执行的 程序块序号；该值可能是持续增加的，但是核函数内具体的 pid_m 和 pid_n 则是通过 pid 计算出来的，比如在 row_major中 计算为：         `python         pid_m = pid // num_pid_n         pid_n = pid % num_pid_n`         在group_major中计算为：         ```python          pid_m = first_pid_m + (pid % group_size_m)          pid_n = (pid % num_pid_in_group) // group_size_m
-  stride 的理解（以pytorch为例）：`a =torch.rand([3,6])     a.stride()     # (6, 1)`
 第一个维度的 `stride` 为6 ， 表示从 `a[m,k]` 的地址到`a[m+1, k]` 的地址，中间差了6个元素。第二个维度 stride为1，表示从 `a[m,k]`  的地址到 `a[m,k+1]` 的地址，中间差了1个元素。可以帮助更方便找到每个元素的 pointer
 
-  meta中虚拟“循环”
 

- 通过 grid 函数将分为需要处理的线程块，数量为 grid 个；
- grid = lambda META: (triton.cdiv(M, META['BLOCK_SIZE_M']) * triton.cdiv(N, META['BLOCK_SIZE_N']), ) 来定义 Triton 网格的大小。

-  示例中每个小方块是一个线程块，每个线程块的大小是 `BLOCK_SIZE_M * BLOCK_SIZE_N`。
 
- 对组的理解：在示例中，组沿着M维度的大小 `group_size_m` 是 3，然后在N维度上是所有的线程数，因此一个组一共是 `num_pid_in_group = GROUP_SIZE_M * num_pid_n`,正如知乎中所说的红色方框内的是一组。
-  还是以官方教程中的图示为例说明一下我个人的理解：每个核函数负责执行的仍然是一个线程块（如图中的小方格为例）。所有的分组等操作都是为了改变每个 warp 所负责的计算结果。row-wise 实例中，相邻的9个warp负责的是C矩阵的一行；block-wise实例中，相邻的9个warp 负责的是C矩阵的一个块。具体如何分配是通过 `pid =tl.program_id(axis=0)`的全局线程块索引 通过某些引导步骤 获得 需要计算的数据指针范围，以此让线程块与实际负责的数据分块对应，线程块的实际排布可以通过 `pid++`的方式来模拟相邻程序块与数据分块的对应。 通常若干个 warp 会被组织到一个SM中，底层编译器会自动根据warp 与数据块的对应关系 load 对应的数据，会放到L2 Cache中。因此如果想要尽量减少 load次数，就是让若干连续的 warp 负责 分大块后的数据块。 
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_45c58d224054.jpg)

文章配图

-  阅读该文章时遇到一个比较关键的点，输出矩阵中的某个元素（官方的图中）表示一个 block，每一个黄色输出元素的大小是 `BLOCK_SIZE_M × BLOCK_SIZE_N` ，正好是一个warp的大小，说明一个核函数表示一个warp执行的大小。那么后面具体是row-major或者grouped ordering 都是表示每个核函数内 或者每个 warp内通过什么顺序计算的。那么每个block都表示一个可以通过线程处理的，那么可以通过 pid 来定位 具体在warp中的坐标，从而进行相应的计算。
 
- OPs 融合

- 将激活函数融合入 kernel，减少多次load 的时间；

#### 提高 cache hit rate

>  一句话概括, 计算一般是没办法省的, 主要是优化内存的使用, 尽可能的用高速但是比较小的 shared memory, 尽可能的提高 cache hit rate. 

[https://www.zhihu.com/question/613405221/answer/3129776636](https://www.zhihu.com/question/613405221/answer/3129776636)

在上面的小节学习中，MAT_MUL 核函数实际计算时内部使用group-major的方式改变warp内 gropram的计算顺序，从而减少 load 和 store次数从而 提高 Cache Hit Rate。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_70488fde08d8.jpg)

文章配图

SRAM（share memory）是比较快的，但是比较小，所以基本原则是： 每次在往 SRAM 中移动数据时，尽可能的多用这个数据，避免来回的移动数据。（flash attention正是基于此的idea ）

#### 其他有价值的博客

OpenAI Triton MLIR 第一章 Triton DSL - GiantPandaCV

>  Triton操作的粒度是一个Block级别。而CUDA是对每个线程进行精细的编程。

Triton DSL能够帮助用户做什么样的事情？ - Embedded In Python: 使用python的装饰器来定义需要优化的kernel - Pointer Arithmetics: 使用pointer arithmetic的方式去操作DRAM上的多维数据 - Optimizing Compiler：以Block为粒度的编程方式，为用户隐藏更多的优化细节，将这些优化工作交给编译器

Triton DSL 做矩阵乘法

- 定义 Kernel 准备工作

- 关于 grid 的定义；
- 关于核函数的定义；

- kernel核函数

- 定义输入参数；通过 @triiton.jit进行装饰；
- 将id对应到输出tensor的每个block上；

- 通过 super-grouping 技术减少读写操作；

Triton 的自动调优

- 定义不同的搜索空间 ——> 能够提高 matmul 的 TFLOPS；
- 通过 @triton.autotune 进行装饰；
- 需要对自动调优中的部分参数进行一定的调整，才能有比较好的性能上界；
OpenAITriton MLIR 第二章 Batch GEMM benchmark - GiantPandaCV

-  Batch GEMM 算子
 

- 在 GEMM基础之上添加一个 axis 表示 batch维度并行；针对每个数组的变化由单batch到多batch，增加一个大小为 size的 stride 偏置；

OpenAI-Triton MLIR 第三章 Triton-shared开箱 - GiantPandaCV
 triton-share**** 提供一个胶水一样的中间层，通过对 middle-layer的设计方便我们的编程语言或者编译器对接到下游的不同硬件生态。
 

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fbf324ede12b.jpg)

文章配图 当用户写完 triton DSL（Domine Specify Language）翻译为 python 的AST（Abstract Snytax Tree，抽象语法树）;之后再到Triton Dialect（方言）。
 中间： 当转为 Triton GPU Dialect时正式进入MLIR这套生态；triton支持nv GPU；当从triton gpu dialect开始，走向标准的LLVM代码生成，之后从 LLVM IR 一直到lower到 PTX（Parallel Thread eXecution，一种中间指令集），再到SASS（SASS 是实际在 NVIDIA GPU 上执行的机器代码），最终可以运行在NV的GPU上。
 

OpenAI Triton MLIR 第四章 ROCm-triton配置 - GiantPandaCV

AMD优化GEMM

https://openai.com/index/triton/

https://triton-lang.org/main/index.html

#### Warp 是Triton并行执行的基本单位

通常一个 warp 中有32个 threads，一个warp内的thread 执行相同的 instrution，在 triton.Config 函数中，num_warps的数量表示该 kernel 会在多少 个 warp上并行的 execute 。

triton.Config 是 Triton中用于配置内核的对象，允许用户设置不同的元参数，定义搜索tune空间，以优化内核性能。

在 triton 中并不需要对线程块进行编写，只需要指定 num_warps的数量，即warps是并行执行的基本单位，表示该核函数有多少个warp并行的执行。Triton 会自动管理这些线程的调度核执行，确保它们能够有效利用GPU资源。

而在triton.Config中 BlOCK_SIZE 代表核函数中用于处理数据的块大小，同哈根用于优化矩阵运算或其他计算密集型任务。

例如： - `BLOCK_SIZE_M`<strong>: 处理 M 维度时每个块的大小，例如，128 表示每个块将处理 128 行数据。 -</strong>`BLOCK_SIZE_N`<strong>: 处理 N 维度时的块大小，影响列的处理量。 -</strong>`BLOCK_SIZE_K`**: 对于涉及多个维度的操作（如矩阵乘法），它通常表示 K 维度上的块大小。

在自动调优过程中，Triton 会探索不同的 BLOCK_SIZE 组合，以找到最佳的性能配置。这种你探索能够版主确定最适合特定硬件核输入数据特征的块大小，从而最大化执行效率。

#### Config中指定 num_warps 与 API函数中定义的 grid 的区别

在API函数中定义的 grid 通常为：（以 matmul函数为例）

```text
grid = lambda META: (
        triton.cdiv(M, META['BLOCK_SIZE_M']) * triton.cdiv(N, META['BLOCK_SIZE_N']),
    )
```

matmul_kernel[grid](
        a, b, c,
        M, N, K,

```text
        a.stride(0), a.stride(1),
        b.stride(0), b.stride(1),
        c.stride(0), c.stride(1),
        ACTIVATION=activation
    )
```


grid` 是一个函数，他的输入和 `matmul_kernel` 的输入相同，通过拿到 `matmul_kenel` 的输入 `kwargs` 来计算 `grid` 。这里的 `gird`  可以人做是通过 `M`  与 `N` 即数据块的大小计算出的实际需要分块的数量，即 warps 数量。比如这里将 M* N的数据分为了


![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f2f4d4c11454.jpg)

文章配图

的数量。假如计算出数值为32，表示整个计算任务被分为了32个独立的计算，可以由32个warps进行计算，表示了如何划分计算任务，也可以认为是分解后的数据块，每个数据块由一个 warp 进行处理。

而 `triton.Config` 中指定的 `num_warps` 参数表示每次核函数执行时可以实际并行处理的warp数量，实际影响了GPU的并行性能。

假如 `num_warps` 为1，表示 这32个 数据块由一个warp中的32个线程执行，当该warp执行结束之后才执行下一个warp。 

如果 `num_warps` 为4，表示同时可以有4个 warp 并行的执行。（猜测，与gpt 交流后的结果，未证实： 此时可能存在流水线调度问题：由于warp 可能处理不同的数据或者执行不同的操作，导致其执行时间不一致，有些 warp 可能在等待内存访问，而其他warp 可能在计算，总之时间上有差异。那么triton 内部会利用GPU的动态调度特性，有效管理多个warp执行，确保某些warp等待时，其他 warp 继续进行计算）

#### 关于 num_statges 参数理解

num_stages` 是 Triton 中用于控制计算流水线并行深度的关键参数。

num_stages` 定义了计算内核中异步操作的流水线阶段数量。每个阶段包含一组并行的内存加载（Load）、计算（Compute）和存储（Store）操作。

该参数直接对应 NVIDIA GPU 的 Shared Memory Bank 数量<strong>和 AMD GPU 的</strong>Wavefront 调度深度**，控制着计算单元与存储单元的交错执行节奏

- <strong>优化原理</strong>
`triton.Config({'BLOCK_M':128, 'BLOCK_N':256}, num_stages=3)`

- <strong>延迟隐藏</strong>
增加 num_stages 可以让更多计算操作覆盖内存访问延迟。当设置为3时，计算单元可以在等待第1阶段数据加载时，并行处理第2阶段的计算和第0阶段的存储

- 寄存器压力平衡
不同阶段数对应不同的寄存器分配策略：

- `num_stages=1`: 所有中间结果存寄存器 → 适合小尺寸计算
- `num_stages=3`: 分阶段释放寄存器 → 适合大尺寸矩阵运算
