---
title: FlashAttention v2核心代码解析(一）
date: "2024-09-16 00:00:00"
updated: "2024-09-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/FlashAttention-v2核心代码解析(一)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/686225377
---


FlashAttention v2核心代码解析(一）

进击的Killua

MLSys，深度学习加速

收录于 · 深度学习加速

158 人赞同了该文章

​目录

本文旨在对FlashAttention具体代码实现的核心部分进行详细的解释，也是对自己的查漏补缺吧，在阅读本文前必须掌握以下这几个知识点才能完全理解代码的含义：

- 了解FlashAttention V2算法本身的设计，虽然本文还会再举例说明但还是强烈建议阅读下原paper或之前的这篇文章进击的Killua：FlashAttention v2论文温故
- 由于Tri Dao版本的FlashAttention是基于cute来实现的，所以必须对cute有足够的了解，否则是看不懂代码的，中文推荐阅读reed大佬的cute系列文章CUDA高性能编程
- 由于代码中还支持了很多其他算法的实现，所以建议阅读进击的Killua：一些已成为LLM InferEngine中事实标准的方法及其延展paper补充一些基础知识。
算法流程
MHA的基础概念就不介绍了，针对于QKV的Tensor表示(batch_size, head_num, seq_len, hidden_dim)很容易在batch_size和head_num维度上进行并行，毕竟他们之间毫无依赖。FlashAttention V2将seq_len维度也进行了并行化，于是整个算法实现的并行性又得到了进一步提高，所以总的并行维度是(batch_size, head_num, seq_len)，老规矩还是上图吧。

在batch_size和head_num并行化后，每个ThreadBlock应该要处理计算的逻辑如下图所示：

基础的attention计算流程FlashAttention在seq_len也并行化后，每个ThreadBlock需要处理计算的逻辑如下图所示，其中kBlockM是seq_len_q中分块后的其中一块。

FlashAttention中每个threadBlock需要处理的逻辑基于上图逻辑，在ThreadBlock内部针对需要计算的逻辑进行了多轮迭代，就是将seq_len_k的维度进行了拆分(FlashDecoding中将这一维度也拆到了不同ThreadBlock中进行计算，而这里是在同一个ThreadBlock中通过for循环来计算，不拆的原因是这里并行度够大了)，逐步计算一小块的结果不断累积到最后的output中，如下图所示。这里其实每一轮迭代都能输出完整shape的output，只不过迭代过程中的output是中间结果，只有到最后一轮迭代累积后才会输出真正的output。

FlashAttention一个ThreadBlock里每次迭代需要处理的逻辑最后整个执行过程就是paper中的下图流程，外层for循环在不同的ThreadBlock间并行执行(即每一个Qi在不同ThreadBlock中计算)，内层for循环在ThreadBlock内部串行执行(如上图所示)。

代码详解
本文主要介绍FlashAttention代码中的compute_attn_1rowblock kernel函数，源码：地址，这个kernel函数完成了上图所示(kBlockM, hidden_dim)大小的Attention output计算，下面按照函数的执行流程顺序介绍。

- 入参 基本变量介绍
- early exit处理
- QKVPS数据预处理
- 数据拷贝
- 带mask的主体计算
- 不带mask的主体计算
- 结果写入全局内存
1.入参 基本变量
首先介绍下函数的入参，这里会涉及到causal mask、window attention、alibi这些方法，都是比较基础的概念，causal mask因果掩码保证在token计算时只能看到之前出现的token， window attention限定了qk计算时的计算范围，alibi是一种对外延性支持度较高的位置编码，注释如下所示，详细介绍可以参考 进击的Killua：一些已成为LLM 推理引擎中事实标准的方法

/*

每个threadblock负责生成(kBlockM, kHeadDim) output

Is_causal 
    是否需要应用causal_mask, 与Is_local互斥，计算公式 i+k-q

```text
    If causal=True, the causal mask is aligned to the bottom right corner of the attention matrix.
    For example, if seqlen_q = 2 and seqlen_k = 5, the causal mask (1 = keep, 0 = masked out) is:
        1 1 1 1 0
        1 1 1 1 1
    If seqlen_q = 5 and seqlen_k = 2, the causal mask is:
        0 0
        0 0
        0 0
        1 0
        1 1
```


Is_local

```text
    是否应用sliding_window_local_attention, =(params.window_size_left  = 0 || params.window_size_left  = 0)    !Is_causal
    query位置i对应的key计算范围 [i + seqlen_k - seqlen_q - window_size[0], i + seqlen_k - seqlen_q + window_size[1]]
    (window_size_left,window_size_left) 到本函数有四种取值：
    -1,-1
    seq_len_k,  =0
     =0, seq_len_k
     =0,  =0
```


Has_alibi

```text
    是否加上alibi斜率偏置，=params.alibi_slopes_ptr != nullptr
    (-alibi_slope * |i + seqlen_k - seqlen_q - j|) is added to the attention score of query i and key j.
```


Is_even_MN
    用kBlockM和kBlockN对seqlen_q和seqlen_k进行分块后是否能被整除，params.seqlen_k % Kernel_traits::kBlockN == 0    params.seqlen_q % Kernel_traits::kBlockM == 0

Is_even_K
    headDim是否是32的倍数，模板对headDim进行了32,64,96,128,160,192,224,256的向上取整，=params.d == Kernel_traits::kHeadDim
*/ 

```cpp
template typename Kernel_traits, bool Is_dropout, bool Is_causal, bool Is_local, bool Has_alibi, bool Is_even_MN, bool Is_even_K, bool Return_softmax, typename Params 
inline __device__ void compute_attn_1rowblock(const Params  params, const int bidb, const int bidh, const int m_block) 
```


函数开始是一些基本变量的定义，这里对kBlockM、kBlockN进行了解释，如下所示：

```cpp
    // cutlass::half_t
    using Element = typename Kernel_traits::Element;
    // float
    using ElementAccum = typename Kernel_traits::ElementAccum;
    // int64_t
    using index_t = typename Kernel_traits::index_t;

    // Shared memory.
    extern __shared__ char smem_[];

    // The thread index.
    const int tidx = threadIdx.x;
    // eg. Flash_fwd_kernel_traits Headdim, 128, 32, 4, false, false, T 
    // seqlen_q 维度按kBlockM进行划分，每个threadblock处理kBlockM大小的q，eg. 128
    constexpr int kBlockM = Kernel_traits::kBlockM;
    // seqlen_k 维度按kBlockN进行划分，每个threadblock处理完整的seqlen_k，按kBlockN大小切分后迭代计算，eg.32
    constexpr int kBlockN = Kernel_traits::kBlockN;
    // 每个head处理的维度，eg. 32,64,96,128,160,192,224,256
    constexpr int kHeadDim = Kernel_traits::kHeadDim;
    // 一个threadblock中的设置的warps数量，eg.4
    constexpr int kNWarps = Kernel_traits::kNWarps;
```


2. early exit处理
接着是early exit的处理，在对QK矩阵进行block分块后，对于某些block其实是不需要处理的。例如在window attention、causal mask等场景存在n_block_max  = n_block_min的情况(这里通过计算n_block_min和n_block_max来确定K方向上需要计算的最大块号和最小块号)，这种情况下这个线程块其实是不需要进行计算的，直接输出结果即可。比如下图causal mask场景下，深色Q block对应的ThreadBlock就不需要进行计算(因为全是0)，可以直接写入存储返回。

其中n_block_min和n_block_max的计算逻辑如下，

```cpp
    const BlockInfo /*Varlen=*/!Is_even_MN  binfo(params, bidb);
    // m_block is blockIdx.x; (params.seqlen_q + Kernel_traits::kBlockM - 1) / Kernel_traits::kBlockM;
    if (m_block * kBlockM  = binfo.actual_seqlen_q) return;

    // 本thread block内 k方向上从哪个块开始计算（按kBlockN进行划分）
    const int n_block_min = !Is_local ? 0 : std::max(0, (m_block * kBlockM + binfo.actual_seqlen_k - binfo.actual_seqlen_q - params.window_size_left) / kBlockN);
    // 本thread block内 k方向上可以计算到的最后一个块（按kBlockN进行划分）
    int n_block_max = cute::ceil_div(binfo.actual_seqlen_k, kBlockN);
    // 因果或者sliding-window场景下对最后一块有更多限制
    // 最后需要计算的范围是[n_block_min, n_block_max)， 前闭后开。
    if (Is_causal || Is_local) {
        n_block_max = std::min(n_block_max,
                               cute::ceil_div((m_block + 1) * kBlockM + binfo.actual_seqlen_k - binfo.actual_seqlen_q + params.window_size_right, kBlockN));
        // if (threadIdx.x == 0    blockIdx.y == 0    blockIdx.z == 0) {
        //     printf("m_block = %d, n_block_max = %d\n", m_block, n_block_max);
        // }
    }
```


满足条件即可写入显存然后提前返回，这里运用到了大量的CUTLASS CUTE  API：Tensor、Layout、copy等等，在代码中做了比较详细的注释。

```cpp
    // 这里在因果、local-attention和MN维度非整除的三种情况下存在不需要计算的可能，即 n_block_max  = n_block_min
    // 直接设置为0后即可返回，这里使用了封装了cute::copy的flash::copy，从register 复制到 global memory。
    if ((Is_causal || Is_local || !Is_even_MN)    n_block_max  = n_block_min) {
        // 计算偏移量，回顾下q的shape定义： (batch_size, seqlen, nheads, headdim)
        const index_t row_offset_o = binfo.q_offset(params.o_batch_stride, params.o_row_stride, bidb)
            + m_block * kBlockM * params.o_row_stride + bidh * params.o_head_stride;
        // (batch_size, nheads, seqlen)
        const index_t row_offset_lse = (bidb * params.h + bidh) * params.seqlen_q + m_block * kBlockM;
        // 将output组织为cute::Tensor, shape是（kBlockM, kHeadDim）
        Tensor gO = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.o_ptr) + row_offset_o),
                                Shape Int kBlockM , Int kHeadDim  {},
                                make_stride(params.o_row_stride, _1{}));
        // 将LSE组织为cute::Tensor, shape是（kBlockM）
        Tensor gLSE = make_tensor(make_gmem_ptr(reinterpret_cast ElementAccum * (params.softmax_lse_ptr) + row_offset_lse),
                                  Shape Int kBlockM  {}, Stride _1 {});

        // 按线程对Tensor进行partition，每个线程处理其中一部分
        // 这里GmemTiledCopyO 线程模型shape(16,8)；每个线程从global memory写入8个元素，写入元素shape(16, 64)；每个元素(half_t)2个字节，所以每个线程write 8*2*8=128 bit
        typename Kernel_traits::GmemTiledCopyO gmem_tiled_copy_O;
        auto gmem_thr_copy_O = gmem_tiled_copy_O.get_thread_slice(tidx);
        // (MMA, MMA_M, MMA_K)
        Tensor tOgO = gmem_thr_copy_O.partition_D(gO);
        // 定义和线程相同shape的register tensor并清空。
        Tensor tOrO = make_tensor Element (shape(tOgO));
        clear(tOrO);
        // Construct identity layout for sO
        // 该tensor仅使用其形状和关于layout的计算结果，没有存储实体
        Tensor cO = make_identity_tensor(make_shape(size 0 (gO), size 1 (gO)));    // (BLK_M,BLK_K) -  (blk_m,blk_k)
        // Repeat the partitioning with identity layouts
        Tensor tOcO = gmem_thr_copy_O.partition_D(cO);
        // 表示（kBlockM, kHeadDim）经过tiled拆分后，在纵向各列上是否需要进行拷贝处理，避免冗余操作。
        Tensor tOpO = make_tensor bool (make_shape(size 2 (tOgO)));
        if (!Is_even_K) {
            #pragma unroll
            // get 1 (tOcO(0, 0, k) 返回(0,k)索引的tiled的列偏移量
            for (int k = 0; k   size(tOpO); ++k) { tOpO(k) = get 1 (tOcO(0, 0, k))   params.d; }
        }
        // Clear_OOB_K must be false since we don't want to write zeros to gmem
        // 按tiled分块大小进行逐个copy
        flash::copy Is_even_MN, Is_even_K, /*Clear_OOB_MN=*/false, /*Clear_OOB_K=*/false (
            gmem_tiled_copy_O, tOrO, tOgO, tOcO, tOpO, binfo.actual_seqlen_q - m_block * kBlockM
        );
        // 逐行设置lse的结果为infinity，这里没有用cute而是直接赋值了。
        #pragma unroll
        for (int m = 0; m   size 1 (tOgO); ++m) {
            // get 0 (tOcO(0, m, 0)) 返回(m,0)索引的tiled的行偏移量
            const int row = get 0 (tOcO(0, m, 0));
            if (row   binfo.actual_seqlen_q - m_block * kBlockM    get 1 (tOcO(0, m, 0)) == 0) { gLSE(row) = INFINITY; }
        }
        return;
    }
```


其中flash对copy进行了封装，在tiling化后的两层循环上进行了数据拷贝，如下所示。看懂这里基本上对cute的数据拷贝过程应该了解的差不多了。

```cpp
template  bool Is_even_MN=true, bool Is_even_K=true, bool Clear_OOB_MN=false, bool Clear_OOB_K=true,
          typename TiledCopy, typename Engine0, typename Layout0, typename Engine1, typename Layout1,
          typename Engine2, typename Layout2, typename Engine3, typename Layout3 
__forceinline__ __device__ void copy(TiledCopy tiled_copy, Tensor Engine0, Layout0  const  S,
                            Tensor Engine1, Layout1   D, Tensor Engine2, Layout2  const  identity_MN,
                            Tensor Engine3, Layout3  const  predicate_K, const int max_MN=0) {
    CUTE_STATIC_ASSERT_V(rank(S) == Int 3 {});
    CUTE_STATIC_ASSERT_V(rank(D) == Int 3 {});
    CUTE_STATIC_ASSERT_V(size 0 (S) == size 0 (D));                     // MMA
    CUTE_STATIC_ASSERT_V(size 1 (S) == size 1 (D));                     // MMA_M
    CUTE_STATIC_ASSERT_V(size 2 (S) == size 2 (D));                     // MMA_K
    // There's no case where !Clear_OOB_K    Clear_OOB_MN
    static_assert(!(Clear_OOB_MN    !Clear_OOB_K));
    #pragma unroll
    // 遍历tiled后的每一行
    for (int m = 0; m   size 1 (S); ++m) {
        // 处理元素行号需在max_MN之内
        if (Is_even_MN || get 0 (identity_MN(0, m, 0))   max_MN) {
            #pragma unroll
            // 遍历tiled后的每一列
            for (int k = 0; k   size 2 (S); ++k) {
                // 根据传入的predicate_K判断是否需要复制tiled数据
                if (Is_even_K || predicate_K(k)) {
                    cute::copy(tiled_copy, S(_, m, k), D(_, m, k));
                } else if (Clear_OOB_K) {
                    cute::clear(D(_, m, k));
                }
            }
        } else if (Clear_OOB_MN) {
            cute::clear(D(_, m, _));
        }
    }
```


3. QKVPS数据预处理
接下来的代码对后续即将用到的QKVP数据进行Tensor化和partition划分，主要也是应用cute进行处理，这里有个小trick，就是后面会倒着block进行迭代，所以这里初始化时偏移量直接到了最后一个block。

```cpp
    // We iterate over the blocks in reverse order. This is because the last block is the only one
    // that needs masking when we read K and V from global memory. Moreover, iterating in reverse
    // might save us 1 register (we just need n_block instead of both n_block and n_block_max).   
 /* 
        这段利用cute对QKVP的数据进行Tensor化和拆分
        S=QK, P=softmax(S), O=PV
        计算偏移量 -  得到全局内存Tensor -  得到共享内存Tensor -  得到本线程需要的全局和共享内存分片Tensor -  得到本线程需要的寄存器分片Tensor

        q: (batch_size, seqlen_q, nheads, headdim)
        k: (batch_size, seqlen_k, nheads_k, headdim)
        v: (batch_size, seqlen_k, nheads_k, headdim)
        p: (batch_size, nheads_k, seqlen_q, seqlen_k)
    */
    const index_t row_offset_q = binfo.q_offset(params.q_batch_stride, params.q_row_stride, bidb)
        + m_block * kBlockM * params.q_row_stride + bidh * params.q_head_stride;
    // We move K and V to the last block.
    // 倒着来，最后几个block会做mask，前面的不用
    const index_t row_offset_k = binfo.k_offset(params.k_batch_stride, params.k_row_stride, bidb)
        + (n_block_max - 1) * kBlockN * params.k_row_stride + (bidh / params.h_h_k_ratio) * params.k_head_stride;
    const index_t row_offset_v = binfo.k_offset(params.v_batch_stride, params.v_row_stride, bidb)
        + (n_block_max - 1) * kBlockN * params.v_row_stride + (bidh / params.h_h_k_ratio) * params.v_head_stride;
    const index_t row_offset_p = ((bidb * params.h + bidh) * params.seqlen_q_rounded
        + m_block * kBlockM) * params.seqlen_k_rounded + (n_block_max - 1) * kBlockN;

    Tensor gQ = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.q_ptr) + row_offset_q),
                            Shape Int kBlockM , Int kHeadDim  {},
                            make_stride(params.q_row_stride, _1{}));
    Tensor gK = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.k_ptr) + row_offset_k),
                            Shape Int kBlockN , Int kHeadDim  {},
                            make_stride(params.k_row_stride, _1{}));
    Tensor gV = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.v_ptr) + row_offset_v),
                            Shape Int kBlockN , Int kHeadDim  {},
                            make_stride(params.v_row_stride, _1{}));
    Tensor gP = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.p_ptr) + row_offset_p),
                            Shape Int kBlockM , Int kBlockN  {},
                            make_stride(params.seqlen_k_rounded, _1{}));

    Tensor sQ = make_tensor(make_smem_ptr(reinterpret_cast Element * (smem_)),
                            typename Kernel_traits::SmemLayoutQ{});
    // Careful we're using the same smem for sQ and sK | sV if Share_Q_K_smem;
    Tensor sK = make_tensor(sQ.data() + (Kernel_traits::Share_Q_K_smem ? 0 : size(sQ)),
                            typename Kernel_traits::SmemLayoutKV{});
    // 同一块地址，最终使用sVtNoSwizzle
    Tensor sV = make_tensor(sK.data() + size(sK), typename Kernel_traits::SmemLayoutKV{});
    Tensor sVt = make_tensor(sV.data(), typename Kernel_traits::SmemLayoutVtransposed{});
    Tensor sVtNoSwizzle = make_tensor(sV.data(), typename Kernel_traits::SmemLayoutVtransposedNoSwizzle{});

    typename Kernel_traits::GmemTiledCopyQKV gmem_tiled_copy_QKV;
    auto gmem_thr_copy_QKV = gmem_tiled_copy_QKV.get_thread_slice(tidx);

    Tensor tQgQ = gmem_thr_copy_QKV.partition_S(gQ);
    Tensor tQsQ = gmem_thr_copy_QKV.partition_D(sQ);
    Tensor tKgK = gmem_thr_copy_QKV.partition_S(gK);  // (KCPY, KCPY_N, KCPY_K)
    Tensor tKsK = gmem_thr_copy_QKV.partition_D(sK);
    Tensor tVgV = gmem_thr_copy_QKV.partition_S(gV);  // (VCPY, VCPY_N, VCPY_K)
    Tensor tVsV = gmem_thr_copy_QKV.partition_D(sV);

    typename Kernel_traits::TiledMma tiled_mma;
    auto thr_mma = tiled_mma.get_thread_slice(tidx);
    Tensor tSrQ  = thr_mma.partition_fragment_A(sQ);                           // (MMA,MMA_M,MMA_K)
    Tensor tSrK  = thr_mma.partition_fragment_B(sK);                           // (MMA,MMA_N,MMA_K)
    Tensor tOrVt  = thr_mma.partition_fragment_B(sVtNoSwizzle);                // (MMA, MMA_K,MMA_N)

    Tensor tSgS  = thr_mma.partition_C(gP);

    Tensor acc_o = partition_fragment_C(tiled_mma, Shape Int kBlockM , Int kHeadDim  {});  // MMA, MMA_M, MMA_K

    //
    // Copy Atom retiling
    //
    // 使用cute::copy 对QKV进行共享内存的copy partition
    auto smem_tiled_copy_Q = make_tiled_copy_A(typename Kernel_traits::SmemCopyAtom{}, tiled_mma);
    auto smem_thr_copy_Q = smem_tiled_copy_Q.get_thread_slice(tidx);
    // if (cute::thread0()) {smem_thr_copy_Q.print_all();}
    Tensor tSsQ = smem_thr_copy_Q.partition_S(sQ);
    // if (cute::thread0()) {print(tSsQ.layout()); printf("\n");}

    auto smem_tiled_copy_K = make_tiled_copy_B(typename Kernel_traits::SmemCopyAtom{}, tiled_mma);
    auto smem_thr_copy_K = smem_tiled_copy_K.get_thread_slice(tidx);
    Tensor tSsK = smem_thr_copy_K.partition_S(sK);

    auto smem_tiled_copy_V = make_tiled_copy_B(typename Kernel_traits::SmemCopyAtomTransposed{}, tiled_mma);
    auto smem_thr_copy_V = smem_tiled_copy_V.get_thread_slice(tidx);
    Tensor tOsVt = smem_thr_copy_V.partition_S(sVt);

    //
    // PREDICATES
    //

    // Construct identity layout for sQ and sK
    // 本质上是用来计数的tensor
    Tensor cQ = make_identity_tensor(make_shape(size 0 (sQ), size 1 (sQ)));    // (BLK_M,BLK_K) -  (blk_m,blk_k)
    Tensor cKV = make_identity_tensor(make_shape(size 0 (sK), size 1 (sK)));    // (BLK_N,BLK_K) -  (blk_n,blk_k)

    // Repeat the partitioning with identity layouts
    Tensor tQcQ = gmem_thr_copy_QKV.partition_S(cQ);       // (ACPY,ACPY_M,ACPY_K) -  (blk_m,blk_k)
    Tensor tKVcKV = gmem_thr_copy_QKV.partition_S(cKV);   // (BCPY,BCPY_N,BCPY_K) -  (blk_n,blk_k)

    // Allocate predicate tensors for k
    // 最后一个维度即dim维度
    Tensor tQpQ = make_tensor bool (make_shape(size 2 (tQsQ)));
    Tensor tKVpKV = make_tensor bool (make_shape(size 2 (tKsK)));

    // Set predicates for k bounds
    if (!Is_even_K) {
        #pragma unroll
        for (int k = 0; k   size(tQpQ); ++k) { tQpQ(k) = get 1 (tQcQ(0, 0, k))   params.d; }
        #pragma unroll
        for (int k = 0; k   size(tKVpKV); ++k) { tKVpKV(k) = get 1 (tKVcKV(0, 0, k))   params.d; }
    }
```


4. 数据拷贝
因为这里使用到了流水线的方式来overlap 数据拷贝和计算，所以在首次迭代前进行初始数据的异步拷贝。

```cpp
    // We don't need to clear the sQ smem tiles since we'll only write out the valid outputs
    // 将Q从 global memory 异步 读取到 shared memory中， threadblock内拷贝一次即可
    flash::copy Is_even_MN, Is_even_K (gmem_tiled_copy_QKV, tQgQ, tQsQ, tQcQ, tQpQ,
                                       binfo.actual_seqlen_q - m_block * kBlockM);
    if (Kernel_traits::Is_Q_in_regs) { cute::cp_async_fence(); }

    // 如果QK使用同一块共享内存，则先将Q从共享内存拷贝到寄存器中，挪出位置来给后面的K
    if (Kernel_traits::Share_Q_K_smem) {
        flash::cp_async_wait 0 ();
        __syncthreads();
        Tensor tSrQ_copy_view = smem_thr_copy_Q.retile_D(tSrQ);
        CUTE_STATIC_ASSERT_V(size 1 (tSsQ) == size 1 (tSrQ_copy_view));            // M
        cute::copy(smem_tiled_copy_Q, tSsQ, tSrQ_copy_view);
        __syncthreads();
    }

    int n_block = n_block_max - 1;
    // We don't need to clear the sK smem tiles since we'll mask out the scores anyway.
    // 将K从 global memory 异步 读取到 shared memory中
    flash::copy Is_even_MN, Is_even_K (gmem_tiled_copy_QKV, tKgK, tKsK, tKVcKV, tKVpKV,
                                       binfo.actual_seqlen_k - n_block * kBlockN);
    cute::cp_async_fence();
    // if (threadIdx.x == 0    blockIdx.y == 0    blockIdx.z   2) { print(tKgK); }
    // __syncthreads();

    // 如果Q需要在寄存器中且qk不公用共享存储，则将Q从共享内存拷贝到寄存器中
    if (Kernel_traits::Is_Q_in_regs    !Kernel_traits::Share_Q_K_smem) {
        flash::cp_async_wait 1 ();
        __syncthreads();
        Tensor tSrQ_copy_view = smem_thr_copy_Q.retile_D(tSrQ);
        CUTE_STATIC_ASSERT_V(size 1 (tSsQ) == size 1 (tSrQ_copy_view));            // M
        cute::copy(smem_tiled_copy_Q, tSsQ, tSrQ_copy_view);
    }

    clear(acc_o);
```


5. 带mask的主体计算
接下来进入到计算的主体，代码中拆成2个连续的循环，前一个循环处理有mask的block，后一个循环处理无mask的block。如下图简单例子所示，对于左下角block不需要mask(全部需要计算)，右下角block需要mask（部分参与计算）。

首先介绍第一个循环，后一个循环流程差不太多，有些细节区别。循环里基本上就是QKVPS和output的相关计算，也就是P=Q*K，S=softmax(mask(P)), O=P*V，注释中有详细介绍。

```cpp
 // acc_o shape: (MMA, MMA_M, MMA_K)
    flash::Softmax 2 * size 1 (acc_o)  softmax;

    const float alibi_slope = !Has_alibi || params.alibi_slopes_ptr == nullptr ? 0.0f : reinterpret_cast float * (params.alibi_slopes_ptr)[bidb * params.alibi_slopes_batch_stride + bidh] / params.scale_softmax;
    flash::Mask Is_causal, Is_local, Has_alibi  mask(binfo.actual_seqlen_k, binfo.actual_seqlen_q, params.window_size_left, params.window_size_right, alibi_slope);

    // For performance reason, we separate out two kinds of iterations:
    // those that need masking on S, and those that don't.
    // We need masking on S for the very last block when K and V has length not multiple of kBlockN.
    // We also need masking on S if it's causal, for the last ceil_div(kBlockM, kBlockN) blocks.
    // We will have at least 1 "masking" iteration.

    // If not even_N, then seqlen_k might end in the middle of a block. In that case we need to
    // mask 2 blocks (e.g. when kBlockM == kBlockN), not just 1.
    constexpr int n_masking_steps = (!Is_causal    !Is_local)
        ? 1
        // causal 场景根据右下方阵mask定义，会有kBlockM/kBlockN个block需要应用mask
        : ((Is_even_MN    Is_causal) ? cute::ceil_div(kBlockM, kBlockN) : cute::ceil_div(kBlockM, kBlockN) + 1);
    #pragma unroll
    for (int masking_step = 0; masking_step   n_masking_steps; ++masking_step, --n_block) {
        Tensor acc_s = partition_fragment_C(tiled_mma, Shape Int kBlockM , Int kBlockN  {});  // (MMA=4, MMA_M, MMA_N)
        clear(acc_s);
        // 异步流水线，等待上一轮copy完成
        flash::cp_async_wait 0 ();
        __syncthreads();

        // Advance gV
        // 将V从global memory拷贝到shared memory中，非首个V则向前移动
        if (masking_step   0) {
            tVgV.data() = tVgV.data() + (-int(kBlockN * params.v_row_stride));
            flash::copy /*Is_even_MN=*/true, Is_even_K (gmem_tiled_copy_QKV, tVgV, tVsV, tKVcKV, tKVpKV);
        } else {
            // Clear the smem tiles to account for predicated off loads
            flash::copy Is_even_MN, Is_even_K, /*Clear_OOB_MN=*/true (
                gmem_tiled_copy_QKV, tVgV, tVsV, tKVcKV, tKVpKV, binfo.actual_seqlen_k - n_block * kBlockN
            );
        }
        cute::cp_async_fence();
        // S=Q*K，在flash::gemm中拷贝到寄存器中进行cute::gemm运算
        flash::gemm /*A_in_regs=*/Kernel_traits::Is_Q_in_regs (
            acc_s, tSrQ, tSrK, tSsQ, tSsK, tiled_mma, smem_tiled_copy_Q, smem_tiled_copy_K,
            smem_thr_copy_Q, smem_thr_copy_K
        );
        // if (cute::thread0()) { print(acc_s); }

        // 对S应用Mask
        // 仅对当前线程关联的位置mask进行赋值改变acc_s
        mask.template apply_mask Is_causal, Is_even_MN (
            acc_s, n_block * kBlockN, m_block * kBlockM + (tidx / 32) * 16 + (tidx % 32) / 4, kNWarps * 16
        );

        flash::cp_async_wait 0 ();
        __syncthreads();
        // 提前将下一轮的K从global memory 拷贝到 shared memory
        if (n_block   n_block_min) {
            // Advance gK
            tKgK.data() = tKgK.data() + (-int(kBlockN * params.k_row_stride));
            flash::copy /*Is_even_MN=*/true, Is_even_K (gmem_tiled_copy_QKV, tKgK, tKsK, tKVcKV, tKVpKV);
            // This cp_async_fence needs to be in the if block, otherwise the synchronization
            // isn't right and we get race conditions.
            cute::cp_async_fence();
        }

        // TODO: when we have key_padding_mask we'll need to Check_inf
        // 对S应用softmax得到P(acc_s)，同时对acc_o进行校准
        masking_step == 0
            ? softmax.template softmax_rescale_o /*Is_first=*/true,  /*Check_inf=*/Is_causal || Is_local (acc_s, acc_o, params.scale_softmax_log2)
            : softmax.template softmax_rescale_o /*Is_first=*/false, /*Check_inf=*/Is_causal || Is_local (acc_s, acc_o, params.scale_softmax_log2);

        // Convert acc_s from fp32 to fp16/bf16
        Tensor rP = flash::convert_type Element (acc_s);
        int block_row_idx = m_block * (kBlockM / 16) + tidx / 32;
        int block_col_idx = n_block * (kBlockN / 32);
        if (Return_softmax) {
            Tensor rP_drop = make_fragment_like(rP);
            cute::copy(rP, rP_drop);
            dropout.template apply_dropout /*encode_dropout_in_sign_bit=*/true (
                rP_drop, block_row_idx, block_col_idx, kNWarps
            );
            cute::copy(rP_drop, tSgS);
            tSgS.data() = tSgS.data() + (-kBlockN);
        }
        if (Is_dropout) {
            dropout.apply_dropout(rP, block_row_idx, block_col_idx, kNWarps);
        }

        // Reshape rP from (MMA=4, MMA_M, MMA_N) to ((4, 2), MMA_M, MMA_N / 2)
        // if using m16n8k16 or (4, MMA_M, MMA_N) if using m16n8k8.
        Tensor tOrP = make_tensor(rP.data(), flash::convert_layout_acc_Aregs Kernel_traits::TiledMma (rP.layout()));
        // if (cute::thread0()) { print(tOrP); }
        // 前面对output进行校准后再叠加本轮PV结果，O += P * V，原公式拆成了2步骤进行
        flash::gemm_rs(acc_o, tOrP, tOrVt, tOsVt, tiled_mma, smem_tiled_copy_V, smem_thr_copy_V);
        // if (cute::thread0()) { print(scores); }

        // This check is at the end of the loop since we always have at least 1 iteration
        if (n_masking_steps   1    n_block  = n_block_min) {
            --n_block;
            break;
        }
    }
```


在对其中使用的softmax和mask函数代码进行下详细介绍。

softmax的实现中对算法的校准部分进行了诠释，这里再贴下算法图，可以对着注释看。

```cpp
template  int kNRows 
struct Softmax {

    using TensorT = decltype(make_tensor float (Shape Int kNRows  {}));
    TensorT row_max, row_sum;

    __forceinline__ __device__ Softmax() {};
    // flash-attention v2 中内循环除S=QK部分外的具体实现
    template bool Is_first, bool Check_inf=false, typename Tensor0, typename Tensor1 
    __forceinline__ __device__ void softmax_rescale_o(Tensor0  acc_s, Tensor1  acc_o, float softmax_scale_log2) {
        // Reshape acc_s from (MMA=4, MMA_M, MMA_N) to (nrow=(2, MMA_M), ncol=(2, MMA_N))
        Tensor scores = make_tensor(acc_s.data(), flash::convert_layout_acc_rowcol(acc_s.layout()));
        static_assert(decltype(size 0 (scores))::value == kNRows);
        if (Is_first) {
            flash::template reduce_max /*zero_init=*/true (scores, row_max);
            flash::scale_apply_exp2(scores, row_max, softmax_scale_log2);
            flash::reduce_sum(scores, row_sum);
        } else {
            // 记录前面迭代所产生的row_max
            Tensor scores_max_prev = make_fragment_like(row_max);
            cute::copy(row_max, scores_max_prev);
            // 产生本轮迭代的row_max
            flash::template reduce_max /*zero_init=*/false (scores, row_max);
            // Reshape acc_o from (MMA=4, MMA_M, MMA_K) to (nrow=(2, MMA_M), ncol=(2, MMA_K))
            Tensor acc_o_rowcol = make_tensor(acc_o.data(), flash::convert_layout_acc_rowcol(acc_o.layout()));
            static_assert(decltype(size 0 (acc_o_rowcol))::value == kNRows);
            #pragma unroll
            for (int mi = 0; mi   size(row_max); ++mi) {
                float scores_max_cur = !Check_inf
                    ? row_max(mi)
                    : (row_max(mi) == -INFINITY ? 0.0f : row_max(mi));
                // 计算得到校准值
                float scores_scale = exp2f((scores_max_prev(mi) - scores_max_cur) * softmax_scale_log2);
                // 对之前row_sum进行校准
                row_sum(mi) *= scores_scale;
                #pragma unroll
                // 对之前的output进行校准
                for (int ni = 0; ni   size 1 (acc_o_rowcol); ++ni) { acc_o_rowcol(mi, ni) *= scores_scale; }
            }
            // 根据最新row_max计算本轮exp(i-max)
            flash::scale_apply_exp2(scores, row_max, softmax_scale_log2);
            Tensor scores_sum_cur = make_fragment_like(row_sum);
            // 计算本轮row_sum
            flash::reduce_sum(scores, scores_sum_cur);
            // 添加到累计row_sum中
            #pragma unroll
            for (int mi = 0; mi   size(row_sum); ++mi) { row_sum(mi) += scores_sum_cur(mi); }
        }
    };

    // 外循环中对Output的统一校准，除以rowsum(这里为乘以rowsum的倒数)
    template bool Is_dropout=false, bool Split=false, typename Tensor0 
    __forceinline__ __device__ TensorT normalize_softmax_lse(Tensor0  acc_o, float softmax_scale, float rp_dropout=1.0) {
        TensorT lse = make_fragment_like(row_sum);
        Tensor acc_o_rowcol = make_tensor(acc_o.data(), flash::convert_layout_acc_rowcol(acc_o.layout()));
        static_assert(decltype(size 0 (acc_o_rowcol))::value == kNRows);
        #pragma unroll
        for (int mi = 0; mi   size 0 (acc_o_rowcol); ++mi) {
            float sum = row_sum(mi);
            float inv_sum = (sum == 0.f || sum != sum) ? 1.f : 1.f / sum;
            lse(mi) = (sum == 0.f || sum != sum) ? (Split ? -INFINITY : INFINITY) : row_max(mi) * softmax_scale + __logf(sum);
            float scale = !Is_dropout ? inv_sum : inv_sum * rp_dropout;
            #pragma unroll
            for (int ni = 0; ni   size 1 (acc_o_rowcol); ++ni) { acc_o_rowcol(mi, ni) *= scale; }
        }
        return lse;
    };
};
```


mask部分的逻辑，这里要结合cute的拆分逻辑来看，四层for循环分别对应行和列的各2个维度，每个线程都会对mask tensor的内容进行赋值。

```cpp
    // Causal_mask: whether this particular iteration needs causal masking
    template  bool Causal_mask=false, bool Is_even_MN=true, typename Engine, typename Layout 
    __forceinline__ __device__ void apply_mask(Tensor Engine, Layout   tensor_,
                                               const int col_idx_offset_,
                                               const int row_idx_offset,
                                               const int warp_row_stride) {
        static_assert(!(Causal_mask    Is_local), "Cannot be both causal and local");
        static_assert(Layout::rank == 3, "Only support 3D Tensor");
        static_assert(decltype(size 0 (tensor_))::value == 4, "First dimension must be 4");
        static constexpr bool Need_masking = Has_alibi || Causal_mask || Is_local || !Is_even_MN;
        // if (cute::thread0()) { printf("Has_alibi = %d, Causal_mask=%d, Is_local=%d, Is_even_MN = %d, Need_masking = %d\n", Has_alibi, Causal_mask, Is_local, Is_even_MN, Need_masking); }
        if constexpr (Need_masking) {
            // Reshape tensor_ from (MMA=4, MMA_M, MMA_N) to (nrow=(2, MMA_M), ncol=(2, MMA_N))
            // 转换成行方向2个维度(2, MMA_M)，列方向2个维度(2, MMA_N)
            Tensor tensor = make_tensor(tensor_.data(), flash::convert_layout_acc_rowcol(tensor_.layout()));
            // Do we need both row and column indices, or just column incides?
            // 对于非local、非causal的场景只需要根据列维度进行赋值操作
            static constexpr bool Col_idx_only = !(Has_alibi    !Is_causal)    !Is_local    !Causal_mask;
            const int lane_id = threadIdx.x % 32;
            const int col_idx_offset = col_idx_offset_ + (lane_id % 4) * 2;
            if constexpr (Col_idx_only) {
                #pragma unroll
                for (int nj = 0; nj   size 1, 1 (tensor); ++nj) {
                    const int col_idx_base = col_idx_offset + nj * 8;
                    #pragma unroll
                    for (int j = 0; j   size 1, 0 (tensor); ++j) {
                        const int col_idx = col_idx_base + j;
                        #pragma unroll
                        for (int mi = 0; mi   size 0 (tensor); ++mi) {
                            // No causal, no local
                            // alibi 叠加上斜率乘以偏移量
                            if constexpr (Has_alibi) {
                                tensor(mi, make_coord(j, nj)) += alibi_slope * col_idx;
                            }
                            if constexpr (!Is_even_MN) {
                                if (col_idx  = max_seqlen_k) { tensor(mi, make_coord(j, nj)) = -INFINITY; }
                            }
                        }
                    }
                }
            } else {
                // 针对 causal、local、alibi三种场景设置maskß
                // 行方向2个维度(2, MMA_M)，列方向2个维度(2, MMA_N)，按这四个维度进行展开
                #pragma unroll
                for (int mi = 0; mi   size 0, 1 (tensor); ++mi) {
                    const int row_idx_base = row_idx_offset + mi * warp_row_stride;
                    #pragma unroll
                    for (int i = 0; i   size 0, 0 (tensor); ++i) {
                        const int row_idx = row_idx_base + i * 8;
                        const int col_idx_limit_left = std::max(0, row_idx + max_seqlen_k - max_seqlen_q - window_size_left);
                        const int col_idx_limit_right = std::min(max_seqlen_k, row_idx + 1 + max_seqlen_k - max_seqlen_q + window_size_right);
                        #pragma unroll
                        for (int nj = 0; nj   size 1, 1 (tensor); ++nj) {
                            const int col_idx_base = col_idx_offset + nj * 8;
                            #pragma unroll
                            for (int j = 0; j   size 1, 0 (tensor); ++j) {
                                const int col_idx = col_idx_base + j;
                                 // alibi 叠加上斜率乘以偏移量
                                if constexpr (Has_alibi) {
                                    // 区分是否是causal的场景
                                    if constexpr (Is_causal) {
                                        tensor(make_coord(i, mi), make_coord(j, nj)) += alibi_slope * col_idx;
                                    } else {
                                        tensor(make_coord(i, mi), make_coord(j, nj)) -= alibi_slope * abs(row_idx + max_seqlen_k - max_seqlen_q - col_idx);
                                    }
                                }
                                // causal_mask 主要看右边界,赋值为负无穷
                                if constexpr (Causal_mask) {
                                    if (col_idx  = col_idx_limit_right) {
                                        tensor(make_coord(i, mi), make_coord(j, nj)) = -INFINITY;
                                    }
                                }
                                // local 检查左右边界，赋值为负无穷
                                if constexpr (Is_local) {
                                    if (col_idx  = col_idx_limit_right || col_idx   col_idx_limit_left) {
                                        tensor(make_coord(i, mi), make_coord(j, nj)) = -INFINITY;
                                    }
                                }
                                if constexpr (!Causal_mask    !Is_local    !Is_even_MN) {
                                    // Causal and Local already handles MN masking
                                    if (col_idx  = max_seqlen_k) {
                                        tensor(make_coord(i, mi), make_coord(j, nj)) = -INFINITY;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
```


6. 不带mask的主体计算
这块的代码其实和上个循环差不多，注意下最后单独对全局进行了数据校准，对应paper里这个部分。

```cpp
    // These are the iterations where we don't need masking on S
    for (; n_block  = n_block_min; --n_block) {
        Tensor acc_s = partition_fragment_C(tiled_mma, Shape Int kBlockM , Int kBlockN  {});  // (MMA=4, MMA_M, MMA_N)
        clear(acc_s);
        flash::cp_async_wait 0 ();
        __syncthreads();
        // Advance gV
        tVgV.data() = tVgV.data() + (-int(kBlockN * params.v_row_stride));
        flash::copy /*Is_even_MN=*/true, Is_even_K (gmem_tiled_copy_QKV, tVgV, tVsV, tKVcKV, tKVpKV);
        cute::cp_async_fence();

        // shared memory中Q是一开始拷贝的，K是每一轮迭代的上一轮异步拷贝的
        flash::gemm /*A_in_regs=*/Kernel_traits::Is_Q_in_regs (
            acc_s, tSrQ, tSrK, tSsQ, tSsK, tiled_mma, smem_tiled_copy_Q, smem_tiled_copy_K,
            smem_thr_copy_Q, smem_thr_copy_K
        );

        flash::cp_async_wait 0 ();
        __syncthreads();
        if (n_block   n_block_min) {
            // Advance gK
            tKgK.data() = tKgK.data() + (-int(kBlockN * params.k_row_stride));
            flash::copy /*Is_even_MN=*/true, Is_even_K (gmem_tiled_copy_QKV, tKgK, tKsK, tKVcKV, tKVpKV);
            // This cp_async_fence needs to be in the if block, otherwise the synchronization
            // isn't right and we get race conditions.
            cute::cp_async_fence();
        }
        // 这里其实也应用了mask，和前面不同的是这里没有causal mask，但还是需要处理alibi和local的场景
        mask.template apply_mask /*Causal_mask=*/false (
            acc_s, n_block * kBlockN, m_block * kBlockM + (tidx / 32) * 16 + (tidx % 32) / 4, kNWarps * 16
        );

        softmax.template softmax_rescale_o /*Is_first=*/false, /*Check_inf=*/Is_local (acc_s, acc_o, params.scale_softmax_log2);

        Tensor rP = flash::convert_type Element (acc_s);
        int block_row_idx = m_block * (kBlockM / 16) + tidx / 32;
        int block_col_idx = n_block * (kBlockN / 32);
        if (Return_softmax) {
            Tensor rP_drop = make_fragment_like(rP);
            cute::copy(rP, rP_drop);
            dropout.template apply_dropout /*encode_dropout_in_sign_bit=*/true (
                rP_drop, block_row_idx, block_col_idx, kNWarps
            );
            cute::copy(rP_drop, tSgS);
            tSgS.data() = tSgS.data() + (-kBlockN);
        }
        if (Is_dropout) {
            dropout.apply_dropout(rP, block_row_idx, block_col_idx, kNWarps);
        }

        // Reshape rP from (MMA=4, MMA_M, MMA_N) to ((4, 2), MMA_M, MMA_N / 2)
        // if using m16n8k16 or (4, MMA_M, MMA_N) if using m16n8k8.
        Tensor tOrP = make_tensor(rP.data(), flash::convert_layout_acc_Aregs Kernel_traits::TiledMma (rP.layout()));
        flash::gemm_rs(acc_o, tOrP, tOrVt, tOsVt, tiled_mma, smem_tiled_copy_V, smem_thr_copy_V);
    }

    // Epilogue
    // 最后再统一校准，乘以rowsum倒数
    Tensor lse = softmax.template normalize_softmax_lse Is_dropout (acc_o, params.scale_softmax, params.rp_dropout);
```


7. 结果写入全局内存
最后将output输出到全局内存中，这里流程是 寄存器- 共享内存 -  寄存器 -  全局内存，这样做的目的是对数据重新排列后最大化寄存器输出到全局内存的写入带宽。

```cpp
    // Convert acc_o from fp32 to fp16/bf16
    Tensor rO = flash::convert_type Element (acc_o);
    Tensor sO = make_tensor(sQ.data(), typename Kernel_traits::SmemLayoutO{});    // (SMEM_M,SMEM_N)
    // Partition sO to match the accumulator partitioning
    auto smem_tiled_copy_O = make_tiled_copy_C(typename Kernel_traits::SmemCopyAtomO{}, tiled_mma);
    auto smem_thr_copy_O = smem_tiled_copy_O.get_thread_slice(tidx);
    Tensor taccOrO = smem_thr_copy_O.retile_S(rO);        // ((Atom,AtomNum), MMA_M, MMA_N)
    Tensor taccOsO = smem_thr_copy_O.partition_D(sO);     // ((Atom,AtomNum),PIPE_M,PIPE_N)

    // sO has the same size as sQ, so we don't need to sync here.
    if (Kernel_traits::Share_Q_K_smem) { __syncthreads(); }
    // 将结果output从寄存器拷贝到shared memory，这里复用了Q的shared memory，因为两者shape一致
    cute::copy(smem_tiled_copy_O, taccOrO, taccOsO);

    const index_t row_offset_o = binfo.q_offset(params.o_batch_stride, params.o_row_stride, bidb)
        + m_block * kBlockM * params.o_row_stride + bidh * params.o_head_stride;
    const index_t row_offset_lse = (bidb * params.h + bidh) * params.seqlen_q + m_block * kBlockM;
    Tensor gO = make_tensor(make_gmem_ptr(reinterpret_cast Element * (params.o_ptr) + row_offset_o),
                            Shape Int kBlockM , Int kHeadDim  {},
                            make_stride(params.o_row_stride, _1{}));
    Tensor gLSE = make_tensor(make_gmem_ptr(reinterpret_cast ElementAccum * (params.softmax_lse_ptr) + row_offset_lse),
                              Shape Int kBlockM  {}, Stride _1 {});

    typename Kernel_traits::GmemTiledCopyO gmem_tiled_copy_O;
    auto gmem_thr_copy_O = gmem_tiled_copy_O.get_thread_slice(tidx);
    Tensor tOsO = gmem_thr_copy_O.partition_S(sO);        // ((Atom,AtomNum),ATOM_M,ATOM_N)
    Tensor tOgO = gmem_thr_copy_O.partition_D(gO);

    __syncthreads();

    Tensor tOrO = make_tensor Element (shape(tOgO));
    // 将shared memory结果又拷贝回寄存器中，这里寄存器的shape和全局输出的shape一致
    cute::copy(gmem_tiled_copy_O, tOsO, tOrO);

    Tensor caccO = make_identity_tensor(Shape Int kBlockM , Int kHeadDim  {});    // (BLK_M,BLK_K) -  (blk_m,blk_k)
    Tensor taccOcO = thr_mma.partition_C(caccO);                           // (MMA,MMA_M,MMA_K)
    static_assert(decltype(size 0 (taccOcO))::value == 4);
    // Convert to ((2, 2), MMA_M, MMA_K) then take only the row indices.
    Tensor taccOcO_row = logical_divide(taccOcO, Shape _2 {})(make_coord(0, _), _, 0);
    CUTE_STATIC_ASSERT_V(size(lse) == size(taccOcO_row));                     // MMA_M
    if (get 1 (taccOcO_row(0)) == 0) {
        #pragma unroll
        for (int mi = 0; mi   size(lse); ++mi) {
            const int row = get 0 (taccOcO_row(mi));
            if (row   binfo.actual_seqlen_q - m_block * kBlockM) { gLSE(row) = lse(mi); }
        }
    }

    // Construct identity layout for sO
    Tensor cO = make_identity_tensor(make_shape(size 0 (sO), size 1 (sO)));    // (BLK_M,BLK_K) -  (blk_m,blk_k)
    // Repeat the partitioning with identity layouts
    Tensor tOcO = gmem_thr_copy_O.partition_D(cO);                           // (ACPY,ACPY_M,ACPY_K) -  (blk_m,blk_k)
    Tensor tOpO = make_tensor bool (make_shape(size 2 (tOgO)));
    if (!Is_even_K) {
        #pragma unroll
        for (int k = 0; k   size(tOpO); ++k) { tOpO(k) = get 1 (tOcO(0, 0, k))   params.d; }
    }
    // Clear_OOB_K must be false since we don't want to write zeros to gmem
    // 将寄存器的结果拷贝到全局内存的结果中
    flash::copy Is_even_MN, Is_even_K, /*Clear_OOB_MN=*/false, /*Clear_OOB_K=*/false (
        gmem_tiled_copy_O, tOrO, tOgO, tOcO, tOpO, binfo.actual_seqlen_q - m_block * kBlockM
    );
```


总结
本文描述的是(batch_size, head_num, seq_len, hidden_dim)定长输入batch情况的计算逻辑，对于变长句子组batch的varlen逻辑也是类似的，区别在于利用输入数据(total, nheads, headdim) + cu_seqlens_q + cu_seqlens_k生成偏移量和qk实际长度k_offset,q_offset,actual_seqlen_k,actual_seqlen_q的逻辑，这里也比较简单直接就不再详细叙述了。

回顾下Tri Dao对FlashAttention的实现，除了对其paper中tiling并行化设计思路实现外，还采用了cute库对数据拷贝和gemm运算的加速、early exit、流水线并行、最大化全局内存写入等技巧，足以看出设计和实现之间还是存在较大操作空间的，triton对FlashAttention的实现就更简单一些，不过这些其实都适合做推理和部署加速的同学学习和借鉴，只能说路漫漫其修远兮。

编辑于 2024-09-16 17:28・浙江
flashattention

LLM推理

推理部署技术

​赞同 158​​21 条评论​333 ​10 ​分享

​申请转载​​

未登录用户

21 条评论

默认
最新

DefTruth

is_causal那里，可以这样理解。友情补图

2024-03-18 · 广东

​回复​4

进击的Killua

作者

谢大佬赐图

2024-03-26 · 浙江

​回复​2

展开其他 2 条回复​

Jayce

大佬您好，我有一个疑惑，就是我不太能搞懂tKsK，tSsK这些都代表什么，就是我没搞懂这些Tensor的命名规则，后面的sK我能明白是在shared memory上的，但是前面的tK，tS具体含义是什么呢

2024-03-23 · 北京

​回复​2

进击的Killua

作者

Jayce

可以这么理解，比如这个gemm

```text
// S=Q*K

flash::gemm /*A_in_regs=*/Kernel_traits::Is_Q_in_regs (
            acc_s, tSrQ, tSrK, tSsQ, tSsK, tiled_mma, smem_tiled_copy_Q, smem_tiled_copy_K,
            smem_thr_copy_Q, smem_thr_copy_K
        );
```


t代表thread，S代表计算目标，r代表register，s代表shared memory， QK代表计算源。

2024-03-26 · 浙江

​回复​4

展开其他 4 条回复​

Jayce

还有个问题大佬们，这个算几级流水线啊，脑子有点蒙了，两级嘛

2024-03-24 · 北京

​回复​1

进击的Killua

作者

两级，tile内和tile间。

2024-03-26 · 浙江

​回复​1

PicoPika

大佬您好, 关于结果写回部分想请教您一下. 
写回部分正如您文中提到的, 矩阵 O 是从 REG- SMEM- REG- GMEM 的写回顺序. 我看源码中, SmemCopyAtomO (R- G使用) 和 GmemTiledCopyO (S- R 和 R- G 使用)都是使用的  AutoVectorizingCopyWithAssumedAlignment 128   作为拷贝操作的, 该操作应该是最大 128 比特的向量化访存, 但实际 R- S 应该是达不到 128 比特的, 请问如何确定实际访存时的向量化访存粒度呢?
我尝试打印了有关的变量:

smem_tiled_copy_O:TiledCopy
  Tiler_MN:       (_64,_16)
  TiledLayout_TV: ((_4,_8,_4),((_2,_2),(_1,_2))):((_128,_1,_16),((_64,_8),(_0,_512)))
Copy_Atom
  ThrID:        _1:_0
  ValLayoutSrc: (_1,_1):(_0,_0)
  ValLayoutDst: (_1,_1):(_0,_0)
  ValLayoutRef: (_1,_1):(_0,_0)
  ValueType:    16b

gmem_tiled_copy_O:TiledCopy
  Tiler_MN:       (_16,_64)
  TiledLayout_TV: ((_8,_16),_8):((_128,_1),_16)
Copy_Atom
  ThrID:        _1:_0
  ValLayoutSrc: (_1,_1):(_0,_0)
  ValLayoutDst: (_1,_1):(_0,_0)
  ValLayoutRef: (_1,_1):(_0,_0)
  ValueType:    16b

taccOrO:ptr[16b](0x7f24bdfffa68) o ((_1,(_4,_2)),_2,_8):((_0,(_1,_8)),_4,_16)
taccOsO:smem_ptr[16b](0x7f2500000400) o ((_1,(_2,_2,_2)),_2,((_2,_2),_2)):((_0,(_1,_512,8)),_4096,((16,32),_8192))
tOsO:smem_ptr[16b](0x7f2500000400) o ((_1,_8),_8,_2):((_0,_1),_1024,_8192)
tOrO:ptr[16b](0x7f24bdfffb70) o ((_1,_8),_8,_2):((_0,_1),_8,_64)
tOgO:gmem_ptr[16b](0x7f2499fa4e00) o ((_1,_8),_8,_2):((_0,_1),7680,_64)根据 Copy_Atom 似乎看不出访存的粒度, 这里 ValLayoutSrc 和  ValLayoutDst 的 shape 大小都是 1. 
如果根据寄存器的 layout 的话, 比如 S- R 时 taccOrO 的 layout 在 (0,1,0) 位置的 stride 是 1 shape 是 4, 是不是可以认为拷贝时是 4 个 FP16 的向量化访存呢? 再比如 R- G 的时候 tOrO 的 layout 在 (0, 1) 位置的 stride 是 1 shape 是 8, 这时候拷贝是 8 个 FP16 的向量化访存. 不知道这么理解对不对? 或者有什么更正确的判断的方法呢?
 此外想问您一下, 写回时 FA 写到 SMEM 后没有直接写回 GMEM 而是先写回了 REG, 请问这是为什么? 我理解的是, 一般 SMEM- GMEM 如果不是 cp.async 的话好像都会经过寄存器, 这里为了便于边界处理显示写到寄存器了, 不知道这么理解对不对.
希望您有时间回复一下

2025-06-02 · 湖北

​回复​喜欢

一个孤独的神

请教一下，(MMA=4, MMA_M, MMA_N)这个shape怎么理解呢

2025-04-16 · 上海

​回复​喜欢

BComplex

大佬，请问本文的代码解析是基于哪个版本的flash-attn做的？

2025-03-26 · 浙江

​回复​喜欢

古月方源

想问问大佬，为什么thread block计算内循环的时候要从右往左呢？

2024-12-05 · 浙江

​回复​喜欢

NormalQ

图中的 hidden_dim 应该是指 head dim？

2024-10-20 · 上海

​回复​喜欢

海阔凭鱼跃

he causal mask is aligned to the bottom right corner of the attention matrix.这句话怎么理解呢？

2024-06-11 · 江苏

​回复​喜欢

进击的Killua

作者

可以理解为mask最后一行全1，然后向上每行减一个1。

2024-09-11 · 浙江

​回复​喜欢

你似乎很急啊

split_kv这个推理版本有时间可以分享一下嘛？

2024-03-11 · 广东

​回复​喜欢

进击的Killua

作者

安排。

2024-03-12 · 浙江

​回复​1

未登录用户

关于作者

进击的Killua
MLSys，深度学习加速

回答
16
文章
36
关注者
3,653

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

FlashAttention-3 代码分析
前几篇文章 Gluon-0a-Attention-Forward ，FlashAttention 2 代码分析：Triton 与 CuTile 实现 分析了 FA 的 Triton/CuTile/Gluon 实现，本文来分析 FlashAttention-3 的 CUTLASS 实现，主…

slowlyC

FlashMLA与FlashAttention之间的区别与联系
Deepseek今天开源了Multi-head Latent Attention(MLA) forward CUDA kernel https://github.com/deepseek-ai/FlashMLA，FlashMLA主体框架采用flash decoding方法，采用分而治之的策略，将KV…

行知

深入解析FlashAttention-V3之Hopper GPU版创新设计 (上篇)
不归牛顿管的熊猫

Flashattention 源码 takeaway
之前从FA源码中抽出来的一些随记。 Flashattn2 计算需要多少个 k block输入 bidb (当前正在计算哪个 batch)，bidh(当前正在计算哪个 head)，m_block(目前计算的 query block 编号)这个 q 块…

nought