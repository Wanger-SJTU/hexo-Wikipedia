---
title: CUDA 学习：FlashAttention-2 (Part 1)
date: "2025-12-01 00:00:00"
updated: "2025-12-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/CUDA-学习-FlashAttention-2-(Part-1)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1973861893090321085
---


CUDA 学习：FlashAttention-2 (Part 1)

手残青年

AI-Infra入门中，求职ing

收录于 · AI-infra学习

37 人赞同了该文章

​目录

0x0、前言
本文旨在通过对从零开始实现 Flash Attention 第 2 部分：基础构建模块这篇博客的学习和思考过程进行整理，所有引用段落和图片都进行了标注，如有理解不对的地方希望能得到大家能够指正，强烈推荐大家阅读原文，良心文章！

0.1、文章脉络
这篇博客是整个系列的第二部分，主要介绍了在A100上构建Flash-attention算子涉及到的最优数据搬运和矩阵计算相关PTX指令的封装，以及一些精度转换操作。 

作者从一个典型的Flash-attention计算分块的出发，从单个 batch、单个 head 的情况简单分析了一下Attention操作的计算强度，这时 Q/K/V 都可以看成 2D 矩阵,这里不再进行赘述了。 

64的算术强度使得 Flash Attention 成为TensorCore的完美搭档。这些专用计算单元比常规浮点运算单元提供显著更高的吞吐量，但只有在计算量远超内存访问时才能达到峰值性能。理想情况下TensorCore可以持续忙于执行矩阵运算，而内存传输则在后台进行。极高的算术强度意味着，只有让 Tensor Core 始终保持饱和，才能真正最大化利用硬件的计算性能。因此，Kernel 设计的重心不仅在于线程映射要适配 Tensor Core 相关指令的物理布局，更关键的是要构建一条高效的数据流水线,确保数据从多级缓存传输到寄存器支持TensorCore上的运算。

下面这篇Nvidia技术开放日的讲座中讲的更加深入透彻，强烈推荐：

分层Tiling使得我们能够将数据在更高内存带宽的内存层级上进行复用，然后数据一定是从HBM开始进行流动的，从SMEM和寄存器读取都会存在延迟。TensorCore如果在某一时候等待数据，那么就不会进行计算。这里先不考虑各种手动控制计算和访存异步操作的情况，GPU本身就有一定的指令并行性。只有利用当前硬件上最优的访存指令（更少的指令周期一次性搬运更多数据），才能最大化降低访存延迟，从而提升Attention kernel的Flops。

（引用）访存延迟使TensorCore利用率下降的示意图既然CUDA代码会编译成PTX指令，那么也可以通过内敛汇编的方式直接使用PTX指令进行编程来最大化Kernel的性能。下面这篇博客中将PTX编程的目标和动机概况的很清晰：

只是内联原来CUDA代码编译得到的PTX并不会比原来代码更快，只有当手写的 PTX 比编译器生成的更好时才有作用。PTX指令直接暴露了最底层的数据布局，因此有机会可以做到下面几点，来进一步优化Kernel：

- 减少生成的 PTX 指令总数
- 精确指定所需的 PTX 指令
- 通过限定符调整指令 和 应用编译器缺失或受 C++语言扩展限制的优化在原博客中上面的思路均有体现。

0x1、高吞吐量矩阵运算: MMA 
Attention计算上无非是多几个矩阵相乘，核心仍然是分块矩阵乘法。 这里通过MMA指令对TensorCore进行编程。 这里有三个概念：操作数，fragment，线程映射

1.1、How Attention Tensors Map to MMA Operands
\text{MMA 执行的操作是 } D = A B^T + C 

A的形状为(m, k)  
B的形状为(n, k) 
C和D的形状为(m, n)，且可指向内存中的同一位置这里将 A, B, C, D称为操作数（Operands） 

操作数的形状和数据类型需要适配我们将要使用的特定 mma 指令。Ampere 架构为 16 位输入提供两种支持 32 位累加的操作指令：m16n8k8 和 m16n8k16。我们将选择 m16n8k16 指令，因为它的执行效率略高。一般情况下无脑选择当前硬件规格上Size最大的矩阵乘法指令即可。详情可见下面这个视频中提到的 CUTLASS 2.0编程 Tips 

作者提到了这里选择不使用WMMA指令是因为MMA的fragment layout是透明的 。WMMA相关的资料推荐飞鸟哥的这个系列

1.2、Fragment Definition
用 Tensor core 做矩阵乘法，硬件指令需要固定大小的一块矩阵。例如mma.sync.aligned.m16n8k16这条指令：一次只计算 A：16 \times 16、B：8 \times 16、C/D：16 \times 8，最后执行一小块乘加：D = A \times B^T + C。 

每个线程需要传入那自己那2 个数据在这些 fragment中的位置对应的寄存器，组成这些 fragment 的完整数据，Tensor Core 才能完成一次 tile 级的乘加

博客中给出的定义是：

在本文中，fragment 特指：跨整个 warp 存在于寄存器文件中的一个矩阵 tile —— 每个线程只存 2 个元素，整个 warp 一起构成这个 Tile，但整个Warp协同执行乘法运算,这是 tensor core 操作的基本单位。Operand矩阵整体大小“Fragments” 维度A16 × 162 × 2 fragmentsB8 × 161 × 2 fragmentsC/D16 × 82 × 1 fragments

1.3、How Attention Tensors Map to mma Operands
现在需要将用于计算Flash Attention 的 Tensor映射到MMA指令的操作数上 

Flash Attention 执行两个关键矩阵乘法：
 \mathbf{QK}^{\mathsf{T}}：计算查询向量与键向量之间的注意力分数
 \tilde{\mathbf{P}}\mathbf{V}：将注意力权重应用于值向量这里需要注意实际执行的运算要和MMA中使用B操作数的转置兼容

当映射到操作数 A 和 B 时，必须注意矩阵乘加运算将 B 视为其转置进行处理。这种映射会影响数据在寄存器和内存中的加载存储方式，以及计算优化策略。需要充分考虑这一特性，才能确保在不显式执行转置操作的前提下，使矩阵乘法在核心运算中产生正确结果当V对应的Fragment从SMEM读取到RF寄存器时，布局要转转换为转置后的 col-major* 

这里作者直接给出了用于计算的Tensor 在每一级存储中的布局：

（引用）Tensor 在每一级存储中的布

1.4、Fragment Storage and Distribution
这里有一个至关重要的机制需要明确：张量运算（Tensor Operations）并非由单个线程独立完成，而是由整个 Warp 以“锁步（Lockstep）”模式协同执行。

这意味着 Warp 内的所有线程必须同步执行同一条指令。鉴于 Fragment（片段）的数据是被分片存储在各个线程的寄存器中，我们必须深入理解 Fragment 在 Warp 线程间的分布布局（Layout）如果不涉及计算，单纯的内存搬运通常遵循“128字节对齐”原则（如每行8个线程）。但在 MMA指令部分，为了适配Tensor Core的输入要求，布局发生了变化

关键在于，一个Warp中的32个线程分成8组，其中每组4个线程，处理一个前面提到的 8x8 的tile 可以这样理解：这里的映射公式不再是为了凑齐 Cache Line，而是为了凑齐 Tensor Core 所需的逻辑结构。从而得到如下所 laneId → (row, col) 的映射。关于这部分数据高效传输的内容在后面进行展开。

（引用）MMA的Fragment线程布局示意图row = (tid % 32) / 4
col = (tid % 4) * 2

这里的 tid % 32 是经典的 lane ID的写法，把 block 内的线程号折算成 warp 内的 lane ID (0…31)，由于一行四个线程，最后再整除 4 就得到行号

\texttt{row} = \left\lfloor \frac{\texttt{laneId}}{4} \right\rfloor \in \{0, \dots, 7\}. 

因为一个线程取连续两个half数据，因此列数计算如下： 

\texttt{colStart} = (\texttt{laneId} \bmod 4) \times 2 \in \{0, 2, 4, 6\}. 

（引用）Warp中线程对应数据的示意图如果一行中存在多个fragment，那么布局如下 
（引用）一行多个fragment的布局示意图

1.5、Register Storage for Different Operands
接下来作者给出了MMA使用的操作数在RF(寄存器)中的存储映射。

对于片段A和B，每个线程将 2 个元素存储在单个 32 位寄存器中。由于我们不需要直接修改它们，因此会将它们存储为单个uint32_t。对于操作数A和B，Tensor Core计算中，矩阵不是逐元素处理的，而是以Tile为单位进行处理

如果创建一个二维数组来存储这些值，使得 \mathbf{M}_{i,j} = \mathrm{M}[i][j]，其中 i 和 j 表示片段的索引：
0 \le i   \mathrm{rows}/8 \text{ and } 0 \le i   \mathrm{rows}/8 和
0 \le j   \mathrm{cols}/8 那么就得到了如下索引方式：uint32_t input[rows/8][cols/8]; 

- A（m×k=16×16）uint32_t Areg[16/8][16/8];  // Areg[2][2] → 4 个寄存器/线程

```text
// 约定：Areg[fr][fc] 分别对应四块 8×8： (fr,fc)∈{0,1}²
// 对应 PTX 里 a0,a1,a2,a3（顺序可约定为 [0][0],[0][1],[1][0],[1][1]）
```


- B（n×k=8×16）uint32_t Breg[8/8][16/8];   // Breg[1][2] → 2 个寄存器/线程
// 对应 PTX 里 b0,b1 ；横向两块 8×8

对于操作数C和D ，由于累加到fp32精度占用的字节数翻倍了。虽然逻辑上仍然按照 8x8 的Tile进行划分，但在寄存器存储中，单个 FP32的 Fragment只能覆盖 8行 × 4列 的区域（相比之下 FP16 可覆盖 8行 × 8列）。

因此为了表示一个完整的 8x8 输出块，需要在横向上需通过2 个 连续的Fragment进行拼接。最终横向的寄存器索引数量变为原来的两倍：

\underbrace{\frac{n}{8}}_{\substack{\text{几何上 } 8\times8 \\ \text{图块的数量}}} \times \underbrace{2}_{\substack{\text{FP32 需 } 2 \text{ 个} \\ \text{片段拼接}}} = \frac{n}{4} 

最终MMA指令在寄存器级别逻辑视图如下 

（引用） mma 运算的逻辑视图由于我们以行优先格式存储B，上图中的B1和B2片段实际上是沿行而非列获取的。MMA指令的 PTX 封装函数如下：

这里不包含D参数，因为始终会累加到C template  typename value_t 
__device__ void

```text
mma_m16n8k16_f32_accum(
	float  d1, float  d2, float  d3, float  d4,
```

 
    uint32_t const  a1, uint32_t const  a2,
    uint32_t const  a3, uint32_t const  a4,
 
    uint32_t const  b1, uint32_t const  b2,
 
```text
	float const  c1, float const  c2,
	float const  c3, float const  c4
```

) {

```cpp
    static_assert(std::is_same_v value_t, half  ||
                      std::is_same_v value_t, nv_bfloat16 ,
                  "value_t must be either half or nv_bfloat16");

    if constexpr (std::is_same_v value_t, nv_bfloat16 ) {
        asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32 "
                     " { %0, %1, %2, %3 }, "
                     " { %4, %5, %6, %7 }, "
                     " { %8, %9 }, "
                     " { %10, %11, %12, %13 }; "
                     : "=f"(d1), "=f"(d2), "=f"(d3), "=f"(d4)
                     : "r"(a1), "r"(a2), "r"(a3), "r"(a4), "r"(b1), "r"(b2),
                       "f"(c1), "f"(c2), "f"(c3), "f"(c4));
    } else {
        // FP16 variant
        asm volatile("mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 "
                     " { %0, %1, %2, %3 }, "
                     " { %4, %5, %6, %7 }, "
                     " { %8, %9 }, "
                     " { %10, %11, %12, %13 }; "
                     : "=f"(d1), "=f"(d2), "=f"(d3), "=f"(d4)
                     : "r"(a1), "r"(a2), "r"(a3), "r"(a4), "r"(b1), "r"(b2),
                       "f"(c1), "f"(c2), "f"(c3), "f"(c4));
    }
}
```


asm voiatile内联部分的逻辑如下：

```text
// 假设：
// A_regs[] 是 uint32_t 数组 (对应 input) -  使用 "r" 约束 (32-bit 通用寄存器)
// C_regs[] 是 float 数组 (对应 accum)    -  使用 "f" 约束 (32-bit 浮点寄存器)

asm volatile(
    // 1. PTX 指令字符串
    // 必须显式列出所有涉及的寄存器占位符，例如 {%0, %1...} 代表 C 矩阵的寄存器组
    "mma.sync.aligned.m16n8k16.row.col.f32.f16.f16.f32 "
    "{%0,  %1,  %2,  %3}, "    // 对应操作数 D (累加器输出)
    "{%4,  %5}, "              // 对应操作数 A (FP16x2 pack in uint32)
    "{%6,  %7}, "              // 对应操作数 B (FP16x2 pack in uint32)
    "{%0,  %1,  %2,  %3};"     // 对应操作数 C (累加器输入，通常与 D 相同)

    // 2. 输出约束列表 (Output Operands)
    // 注意：累加器通常是读写模式，所以使用 "+" 而不是 "="
    // "f" 表示绑定到 float 寄存器
    : "+f"(C_regs[0]), "+f"(C_regs[1]), "+f"(C_regs[2]), "+f"(C_regs[3])

    // 3. 输入约束列表 (Input Operands)
    // "r" 表示绑定到 32位通用寄存器 (存放 uint32_t 类型的 FP16x2 数据)
    : "r"(A_regs[0]), "r"(A_regs[1]),  // 对应 %4, %5
      "r"(B_regs[0]), "r"(B_regs[1])   // 对应 %6, %7

    // 4. 破坏描述 (Clobbers)
    // 在纯寄存器操作中通常留空，除非修改了内存或特定标志位
```


GCC扩展 asm 是按 “先输出、后输入” 的顺序给 %0, %1, %2, ... 编号的

: "=f"(d1), "=f"(d2), "=f"(d3), "=f"(d4)             // 输出：编号 0~3
: "r"(a1), "r"(a2), "r"(a3), "r"(a4),               // 输入：编号 4~7
  "r"(b1), "r"(b2),                                 // 输入：编号 8~9
  "f"(c1), "f"(c2), "f"(c3), "f"(c4)                // 输入：编号 10~13 

0x2、高效内存操作：保持高带宽利用率的数据移动原语
在解决完GEMM相关的操作后，需要考虑各个内存层级间的数据搬运，并且每一层级都需要考虑加载和写入的双向操作。在A100上，有些高效的内存拷贝指令对应的写回指令并不支持（作者在博客中强调），因此只能使用向量化访存的方式进行写回。

2.1、GMEM → SMEM: cp.async 
这里直接引用博客中整理的相关ptx指令内容 ，cp.async相关的指令包括了以下内容

cp.async：初始化拷贝操作 
cp.async.commit：将所有未提交的cp.async组合成一个可作为单一可等待的组
cp.async.wait_group n/cp.async.wait_all：等待直到最新n组之前的所有提交完成这里不进行展开了，其中用到的核心拷贝指令是：cp.async.cg.shared.global 

.cg (Cache Global)：这是 Ampere 的重要特性。它指示加载操作绕过 L1 Cache，直接从 L2 Cache 经过数据通路到 Shared Memory。 

当拷贝大小为 16 字节时，我们可以配置传输完全绕过 L1 缓存，减少缓存污染，并提供从 L2 到共享内存的更直接路径以及需要注意一些同步事项

cp.async.wait() 仅等待当前线程完成加载。如果线程通过共享内存进行通信，我们仍然需要一个适当作用域的屏障来实现正确的同步（如 __syncwarp() / __syncthreads() / cooperative_group.sync()）其PTX封装实现如下：

__device__ void cp_async_commit() { asm volatile("cp.async.commit_group;"); }
 
```cpp
template  int ngroups 
__device__ void cp_async_wait() {
    asm volatile("cp.async.wait_group %0;" ::"n"(ngroups));
}

template  int size, typename T 
__device__ void cp_async(T *smem_to, T *gmem_from) {
    static_assert(size == 16);

    uint32_t smem_ptr = __cvta_generic_to_shared(smem_to);
    // The .cg (cache-global) option bypasses the L1 cache, reducing cache 
    // pollution and providing a more direct path from L2 to shared memory.
    asm volatile("cp.async.cg.shared.global [%0], [%1], %2;"
                 :
                 : "r"(smem_ptr), "l"(gmem_from), "n"(size));
}
```


这里简单提一下上面使用到的这个cuda内置函数 ：

__cvta_generic_to_shared：用于将通用指针转换为共享内存空间的偏移量。如果不做这一步，直接传 64 位指针进汇编，会导致非法地址访问

可以参考官方PTX文档： 

Syntax: cp.async.cg.shared.global [dst], [src], size;

```text
dst (Destination):Shared memory destination address. Must be a 32-bit unsigned integer (offset).
src (Source): Global memory source address. Must be a 64-bit address.
```


2.2、SMEM → GMEM: Vectorized Stores
从共享内存到全局内存的传输中，与cp.async等效的st.async在安培架构上并不支持，因此将采用次优方案：16 字节向量化存储。我们只需确保指针指向 16 字节数据类型，且指针满足 16 字节对齐(addr % 16 == 0 reinterpret_cast uint4* (GMEM[dst])[0] = reinterpret_cast uint4* (SMEM[src])[0];

上述的向量化写法是cuda编程中比较常见的向量化读取方式，很多时候也会单独写成一个宏定义使用 

这里作者提到向量化写回的方式是次优的，在 Ampere 架构设计时，虽然引入了HBM到SMEM拷贝的cp.async系列指令。但是对应的写回路径的st.async在Hopper架构上才得到支持,因此只能使用 Load/Store Unit (LSU)，无法避免地SMEM到HBM的数据传输就得经过寄存器。

这里对LSU和cp.async拷贝方式的区别，总结就是会通过寄存器，并且相同数据搬运下的指令周期较长。具体可以看作者的下面这篇博客，大致示意图如下：

（引用）Comparing Synchronous vs Asynchronous Copy from Global Memory to Shared Memory
cp.async和LSU方式加载不同数据量的指令时钟周期对比图

2.3、Warp-Wide Transfers Between GMEM ↔ SMEM
这里需要考虑到warp 级别的访存合并，即 warp 内的连续的线程需要能够访问连续的地址空间，这样才能触发合并访存，因而布局方式以对齐128字节的缓存行为基准

在考虑线程束级别的数据传输时，我们需要确保内存合并以获得最佳性能。由于 GPU 缓存行为 128 字节，每个线程传输 16 字节，将 8 个线程分配给单行即可访问整个缓存行。因此，每个包含 32 个线程的线程束，其单次束级指令可传输（4，64）个内存块
（引用）GMEM ↔ SMEM 之间数据拷贝的线程布局

2.4、Copying from SMEM → RF 
我认为这里是整篇博客最核心的部分，SMEM到RF按照硬件加速的布局进行转换后进行了数据拷贝。理解这部分需要将 ldmatrix 指令的行为拆解为两个不对称的过程来看。

要将数据片段从SMEM传输到寄存器，我们可以让每个线程读取它们存储的元素。虽然这种方法可行，但每个片段需要多条指令。幸运的是，存在更高效的方案：ldmatrix 指令可以一次性加载多达 4 个fragment。相比使用RF[dst] = SMEM[src]手动加载片段，它的速度更快，但具有不同的布局方式。如果我们还想对元素进行转置操作，这一点尤为明显ldmatrix 一次可以加载 1、2 或 4 个 8×8 fragment，在使用这条PTX指令时warp内的线程需要按照 4 个 八元组（octet）来看。

具体内容可以参考Simons下面这篇对ldmatrix 行为分析的博客：

ldmatrix.x4 允许我们加载任意四个 8 \times 8 片段（fragments）。这意味着我们可以加载连续的 16 \times 16 或 32 \times 8 的tiles，甚至是一组随机的非连续片段。这会对生成的汇编代码产生影响。现在我们将选择每条指令传输连续元素的 16 \times 16 图块（即由 4 个 8 \times 8 片段组成的tiles）。在大多数情况下，这是标准且最优的布局。

（引用）ldmatrix指令所需的线程布局示意图这里需要结合前文通过cp.async从HBM往SMEM搬运数据的线程映射。为了让warp中的数据搬运能够访存合并，将连续warp内的8个线程映射为连续的128字节一行。此时 SMEM中的数据布局是服务于“搬运效率”的。

而通过ldmatric从SMEM向RF搬运数据时，需要遵循ldmatric指令的线程映射。此时的目标是满足 Tensor Core 的硬件指令格式。因此寻址端由少数线程发起，即Warp 中的 32 个线程被分为 4 组，每组 8 个线程负责加载一个 8 x 8 的矩阵，最多一次加载4个。大致的示意图如下。也可以参考Simons的上面这篇Blog，写的很清楚！

（引用）一次ldmatrix指令调用从SMEM到RF数据拷贝的线程布局ldmatric指令中的4个8元组需要的128字节数据，正好从一个warp从HBM到SMEM映射过程的8个线程。下面这张示意图可以看作：ldmatric将SMEM中每个线程的数据，拆分拆散进了很多不同线程的寄存器，而不是留在原来那个“提供指针的线程”里。

以此来将 SMEM中一个tile中包含的 16×16字节的 的 tile , 拆分映射为4 个 8×8 fragment交给ldmatric指令一次性搬运 

（引用）一个Warp中通过ldmatrix连续加载4个Fragment到RF线程布局的示意图对应的ptx指令封装如下：

```cpp
 template  typename T 
__device__ void ldmatrix_x4(
	T *load_from,
	uint32_t  a1,
	uint32_t  a2,
    uint32_t  a3,
    uint32_t  a4
```

) {

```text
    uint32_t smem_ptr = __cvta_generic_to_shared(load_from);
    asm volatile("ldmatrix.sync.aligned.x4.m8n8.shared.b16"
                 "{%0, %1, %2, %3}, [%4];"
                 : "=r"(a1), "=r"(a2), "=r"(a3), "=r"(a4)
                 : "r"(smem_ptr));
}
```


这里总结一下ldmatrix指令的大致执行流程：

- 1. 输入阶段 Warp 中各线程传入 load_from 指针，指向SMEM中16×16的Tile的对应行起始位置。
- 2. 指令执行 首先使用 __cvta_generic_to_shared 将指针转换为共享内存偏移地址。随后执行 ldmatrix 核心指令，将 Warp划分为 4 个 线程组；每组从 SMEM 连续读取 8×8 的 16-bit 矩阵块，并自动按照 MMA 硬件布局重排，将 64 个元素分发至全 Warp 线程的寄存器 (a1..a4) 中。
- 3. 输出结果 每个线程最终获得 4 个 32-bit寄存器，每个寄存器打包存储 2 个元素，精准对应 4 个 Fragment 中归属本线程的数据。这些数据随后即可直接作为 A/B 操作数传递给 mma.sync 指令进行计算。

2.5、ldmatrix Transpose
作者给出了针对 V分块的加载时，为了适配MMA指令的操作数而进行转置的处理。这里使用了ldmatrix的转置版本，来避免了显式的Transpose操作。

指令封装好了我们需要的线性代数操作即：

\begin{bmatrix} A   B \\ C   D \end{bmatrix}^T = \begin{bmatrix} A^T   C^T \\ B^T   D^T \end{bmatrix} 

为了得到正确的整体转置矩阵，我们需要把右上角和左下角的数据块对调。 在代码层面，a2 存储的是右上角的数据，a3 存储的是左下角的数据。因此，交换 a2 和 a3 的位置（或其逻辑含义），就等于完成了分块位置的互换。

（引用）带有转置的ldmatrix连续加载4个Fragment到RF线程布局的示意图

2.6、Copying from RF → SMEM
由于 Ampere 架构没有 stmatrix 指令，无法像 ldmatrix 那样“一键”将寄存器中的 Fragment 整块转存到共享内存。把数据从寄存器写回SMEM时，作者这边沿用了MMA的Fragment布局。每个线程将自己的两个16字节数据写回，即每个线程只做一次 4B 标准 store 就能把自己那 2 个元素写到共享内存里。
（引用）数据从RF写回SMEM的线程布局示意图

0x3、数据类型转换
这部分主要是考虑flash-attention计算的精度，因而需要在进行softmax操作时使用fp32的精度进行计算以确保数值稳定性，再将注意力分数矩阵P转为fp16精度，便于和V矩阵进行计算。

这里进一步使用到了cuda内置的数据精度转换函数

虽然 CUDA 提供了__float2bfloat16_rn()和__float2half_rn()等单值转换函数，但我们可以做得更好。由于我们的数据片段总是包含偶数个值，因此可以同时转换两个值：
- BF16：__float22bfloat162_rn()将float2转换为bfloat162
- FP16：__float22half2_rn()将float2转换为half2
这种配对方法效率更高，因为底层的 SASS 指令仅支持成对转换。即使是单值转换也会被编译为配对版本，未使用的槽位用零填充。
0x4、小结
这是Sonny博主Flash-attention博客的第二篇, 后面开始就是kernel的调优部分了。我觉得这一部分还是挺有帮助的和启发的，一些线程布局时的访存布局和PTX指令硬件布局兼容的问题也是之前没有思考过的。排版已经放弃了就这样吧，如有不对的地方希望大家能够指正。 

发布于 2025-12-01 01:40・广东
CUDA

AIInfra

​赞同 37​​添加评论​103 ​1 ​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

手残青年
AI-Infra入门中，求职ing

回答
0
文章
8
关注者
316

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

cuda编程 - Graphsurgeon
1.简单记录与交流，大佬勿喷 它是什么？ ONNX Graphsurgeon - 一个专门修改 ONNX 模型结构的工具库。严格来说这不是cuda编程，只是一个调试工具，但非常好用，为什么需要它？在将模型从训练…

行数

CUDA 开发者应该熟悉的数
这是一篇为 CUDA 开发者准备的博客，旨在总结 CUDA 编程中至关重要的硬件参数和延迟数据。 0. 序在高性能计算（HPC）和深度学习领域，写出“能跑”的 CUDA 代码并不难，但要写出“极致性能…

WingEdge777

CUDA Fortran：第一个程序
吟雪千夏发表于高精度NP...

cuda学习：学习nvcuda::wmma实现高效gemm
杨乔发表于杨乔的视觉...