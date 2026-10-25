---
title: 陈天奇新书《modern-gpu-programming-for-mlsys》在RTX 5090跑不起来？我写了CUDA C++版本
date: "2026-07-12 00:00:00"
updated: "2026-07-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/陈天奇新书《modern-gpu-programming-for-mlsys》在RTX-5090跑不起来-我写了CUDA-C-版本/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2059730024626905589
---


1 背景
看了这本书,觉得是一个入门AI编译器和算子优化的绝佳书籍，火速开始上手。

2 问题
但目前遇到一个问题，第二章Part II Introduction to TIRx，无法在非B200之外的其他blackwell芯片上适用，例如我在国内各大云服务厂商，只能租赁得到RTX 5090系列（black well）但是其内部是采用sm120a架构，而非书中推荐的sm100a架构，因此TIRx的例子跑不起来。

3 解决方案
由于本人也是初学者（入门ai编译器1年左右），现在将自己能够通过的CUDA C++替代方案，放到网上，希望吸引志同道合的人交流。  

3.1 原因
由于租不到 B100/B200 GPU，而 RTX 5090 的 Tensor Core 硬件本身是完好的（通过 HMMA 路径走 `mma.sync`），我们写了一个 CUDA C++ 版本的 GEMM kernel，绕过 TIRx 框架直接在 SM120 上跑 Tensor Core。

3.2 核心设计
设计选择说明MMA 指令wmma::mma_sync（走 HMMA 路径，SM120 原生支持）累加器warp 级寄存器 fragment（wmma::fragment<accumulator, ...>）Shared MemoryA: [128][64] row-major；B: [64][128] 转置存储Warp 布局M 维 8 warps × N 维 4 warps = 32 warps = 1024 threads/blockTile 大小128×128×64（每个 warp 算 2 个 N-tile，128÷16=8 warps in M，128÷16÷2=4 warps in N）K 循环累加器在 K 循环外初始化，跨 K 分块累加
3.2 代码
&#34;&#34;&#34;
SM120 (RTX 5090) 兼容的 GEMM kernel。

TIRx 0.25 的 Tx.gemm_async 仅支持 tcgen05 (SM100/B100/B200)，
RTX 5090 (SM120) 没有 TMEM 不支持 tcgen05。

因此这里用 CUDA C++ 的 mma.sync (HMMA) tensor core 指令来替代，
通过 torch.utils.cpp_extension.load_inline JIT 编译。

运行:
  LD_LIBRARY_PATH=&#34;<conda_lib>:<tvm_ffi_lib>:<tvm_lib>&#34; python tirx_kernels/gemm.py
&#34;&#34;&#34;

import math
import time
import torch
from torch.utils.cpp_extension import load_inline

# ============================================================
# CUDA kernel: SM120 Tensor Core GEMM (HMMA via mma.sync)
# ============================================================
CUDA_SOURCE = r&#34;&#34;&#34;
#include <torch/extension.h>
#include <cuda_fp16.h>
#include <cuda_bf16.h>
#include <mma.h>

using namespace nvcuda;

// SM120 (RTX 5090) tensor core MMA: m16n16k16 for fp16 (HMMA path)
// Each warp computes a 16x16 tile per MMA step
#define MMA_M 16
#define MMA_N 16
#define MMA_K 16

// Block tile sizes — must be multiples of MMA dimensions
// Use 128x128 blocks with warp-level tiling
#define BLK_M 128
#define BLK_N 128
#define BLK_K 64

// Warp layout: 8 warps M, 4 warps N = 32 warps = 1024 threads
// Each warp covers 16x16, so:
//   8*16 = 128 (covers BLK_M)
//   4*16 = 64  (covers only 64 of BLK_N — each warp does 2 tiles in N)
#define WARPS_M 8
#define WARPS_N 4
#define TILES_PER_WARP_N 2  // each warp handles 2 tiles in N-dim
#define THREADS_PER_WARP 32

__global__ void hgemm_sm120_kernel(
    const half* __restrict__ A,
    const half* __restrict__ B,
    half* __restrict__ C,
    int M, int N, int K
) {
    // Shared memory: As[M][K] row-major; BsT[K][N] row-major (transposed B)
    __shared__ half As[BLK_M][BLK_K];
    __shared__ half BsT[BLK_K][BLK_N];

    // Thread indexing
    int tid = threadIdx.x;
    int warp_id = tid / THREADS_PER_WARP;
    int warp_m = warp_id / WARPS_N;  // which warp in M dimension (0..7)
    int warp_n = warp_id % WARPS_N;  // which warp in N dimension (0..3)

    // Block indexing
    int blk_m = blockIdx.y * BLK_M;
    int blk_n = blockIdx.x * BLK_N;

    // Accumulators — one per N-tile per warp, persist across K-blocks
    wmma::fragment<wmma::accumulator, MMA_M, MMA_N, MMA_K, float> acc_frag[TILES_PER_WARP_N];
    for (int n_tile = 0; n_tile < TILES_PER_WARP_N; n_tile++) {
        wmma::fill_fragment(acc_frag[n_tile], 0.0f);
    }

    // Pre-compute row/col offsets for this warp&#39;s tiles
    int a_row = warp_m * MMA_M;
    int b_col[TILES_PER_WARP_N];
    for (int n_tile = 0; n_tile < TILES_PER_WARP_N; n_tile++) {
        b_col[n_tile] = (warp_n + n_tile * WARPS_N) * MMA_N;
    }

    // Main loop over K dimension
    for (int k_block = 0; k_block < K; k_block += BLK_K) {
        // Cooperative load: A tile [128][64] into shared memory (row-major)
        for (int i = tid; i < BLK_M * BLK_K; i += blockDim.x) {
            int row = i / BLK_K;
            int col = i % BLK_K;
            int g_row = blk_m + row;
            int g_col = k_block + col;
            As[row][col] = (g_row < M && g_col < K) ? A[g_row * K + g_col] : __float2half(0.0f);
        }
        // Cooperative load: B tile into BsT[K][N] (transposed: BsT[k][n] = B_global[n][k])
        for (int i = tid; i < BLK_N * BLK_K; i += blockDim.x) {
            int k_idx = i / BLK_N;
            int n_idx = i % BLK_N;
            int g_row = blk_n + n_idx;
            int g_col = k_block + k_idx;
            BsT[k_idx][n_idx] = (g_row < N && g_col < K) ? B[g_row * K + g_col] : __float2half(0.0f);
        }
        __syncthreads();

        wmma::fragment<wmma::matrix_a, MMA_M, MMA_N, MMA_K, half, wmma::row_major> a_frag;
        wmma::fragment<wmma::matrix_b, MMA_M, MMA_N, MMA_K, half, wmma::row_major> b_frag;

        for (int k_inner = 0; k_inner < BLK_K; k_inner += MMA_K) {
            // One A load per k_inner step (same across all N-tiles)
            wmma::load_matrix_sync(a_frag, &As[a_row][k_inner], BLK_K);

            for (int n_tile = 0; n_tile < TILES_PER_WARP_N; n_tile++) {
                // B: KxN row_major from BsT[k][n]; ldb=BLK_N
                wmma::load_matrix_sync(b_frag, &BsT[k_inner][b_col[n_tile]], BLK_N);
                // C[i][j] += sum_k A[i][k] * B_global[j][k]
                wmma::mma_sync(acc_frag[n_tile], a_frag, b_frag, acc_frag[n_tile]);
            }
        }
        __syncthreads();
    }

    // Store accumulated results to global memory
    for (int n_tile = 0; n_tile < TILES_PER_WARP_N; n_tile++) {
        int g_row = blk_m + a_row;
        int g_col = blk_n + b_col[n_tile];
        if (g_row < M && g_col < N) {
            wmma::fragment<wmma::accumulator, MMA_M, MMA_N, MMA_K, half> c_frag;
            for (int i = 0; i < acc_frag[n_tile].num_elements; i++) {
                c_frag.x[i] = __float2half(acc_frag[n_tile].x[i]);
            }
            wmma::store_matrix_sync(&C[g_row * N + g_col], c_frag, N, wmma::mem_row_major);
        }
    }
}

torch::Tensor hgemm_sm120(torch::Tensor A, torch::Tensor B) {
    TORCH_CHECK(A.dtype() == torch::kFloat16, &#34;A must be float16&#34;);
    TORCH_CHECK(B.dtype() == torch::kFloat16, &#34;B must be float16&#34;);
    TORCH_CHECK(A.size(1) == B.size(1), &#34;K dimension must match&#34;);
    TORCH_CHECK(A.dim() == 2 && B.dim() == 2, &#34;A and B must be 2D&#34;);

    int M = A.size(0);
    int N = B.size(0);  // B is NxK
    int K = A.size(1);

    auto C = torch::empty({M, N}, A.options());

    dim3 block(WARPS_M * WARPS_N * THREADS_PER_WARP);  // 8*4*32 = 1024 threads
    dim3 grid((N + BLK_N - 1) / BLK_N, (M + BLK_M - 1) / BLK_M);

    hgemm_sm120_kernel<<<grid, block>>>(
        reinterpret_cast<const half*>(A.data_ptr<at::Half>()),
        reinterpret_cast<const half*>(B.data_ptr<at::Half>()),
        reinterpret_cast<half*>(C.data_ptr<at::Half>()),
        M, N, K
    );
    cudaDeviceSynchronize();
    return C;
}
&#34;&#34;&#34;

CPP_SOURCE = &#34;&#34;&#34;
#include <torch/extension.h>
torch::Tensor hgemm_sm120(torch::Tensor A, torch::Tensor B);
&#34;&#34;&#34;

# ============================================================
# 编译 & 测试
# ============================================================

def main():
    print(&#34;=&#34; * 60)
    print(&#34;SM120 (RTX 5090) Tensor Core GEMM — mma.sync (HMMA)&#34;)
    print(&#34;=&#34; * 60)
    print()

    print(&#34;\U0001f527 Compiling CUDA kernel with nvcc via load_inline...&#34;)
    module = load_inline(
        name=&#34;hgemm_sm120&#34;,
        cpp_sources=[CPP_SOURCE],
        cuda_sources=[CUDA_SOURCE],
        functions=[&#34;hgemm_sm120&#34;],
        extra_cuda_cflags=[&#34;-O2&#34;, &#34;-arch=sm_120&#34;],
        verbose=False,
    )
    print(&#34;   Done.&#34;)
    print()

    device = torch.device(&#34;cuda&#34;)
    torch.cuda.empty_cache()

    # --- 正确性测试 ---
    M, N, K = 256, 256, 256
    torch.manual_seed(42)
    A = torch.randn(M, K, dtype=torch.float16, device=device)
    B = torch.randn(N, K, dtype=torch.float16, device=device)

    C = module.hgemm_sm120(A, B)
    C_ref = A @ B.T

    max_err = float((C - C_ref).abs().max())
    print(f&#34;   正确性测试 ({M}x{N}x{K}):&#34;)
    print(f&#34;     max_error = {max_err:.6f}&#34;)
    is_close = max_err < 0.02 or torch.allclose(C, C_ref, rtol=0.02, atol=0.01)
    print(f&#34;     {&#39;✅ PASS&#39; if is_close else &#39;❌ FAIL&#39;}&#34;)
    print()

    # --- 性能测试 ---
    M, N, K = 2048, 2048, 2048
    torch.manual_seed(42)
    A_bench = torch.randn(M, K, dtype=torch.float16, device=device)
    B_bench = torch.randn(N, K, dtype=torch.float16, device=device)

    total_flops = 2 * M * N * K
    print(f&#34;   性能测试: A({M}x{K}) x B({N}x{K})^T → C({M}x{N})&#34;)
    print(f&#34;   总 FLOPS: {total_flops / 1e9:.1f} GFLOPS&#34;)
    print()

    def benchmark(fn, warmup=5, repeat=20):
        for _ in range(warmup):
            fn()
        torch.cuda.synchronize()
        t0 = time.perf_counter()
        for _ in range(repeat):
            fn()
        torch.cuda.synchronize()
        elapsed = (time.perf_counter() - t0) / repeat
        return elapsed, total_flops / elapsed / 1e12

    t_kernel, tflops_kernel = benchmark(lambda: module.hgemm_sm120(A_bench, B_bench))
    t_torch, tflops_torch = benchmark(lambda: A_bench @ B_bench.T)

    print(&#34;  ┌─────────────────────┬────────────┬──────────┐&#34;)
    print(&#34;  │ 版本                 │ 耗时 (ms)   │ TFLOPS   │&#34;)
    print(&#34;  ├─────────────────────┼────────────┼──────────┤&#34;)
    print(f&#34;  │ hgemm_sm120 (mma)   │ {t_kernel*1000:10.3f} │ {tflops_kernel:8.4f} │&#34;)
    print(f&#34;  │ PyTorch (cuBLAS)    │ {t_torch*1000:10.3f} │ {tflops_torch:8.4f} │&#34;)
    print(&#34;  └─────────────────────┴────────────┴──────────┘&#34;)
    print()

    speedup = t_kernel / t_torch
    print(f&#34;  📊 cuBLAS 比本 kernel 快 {speedup:.1f}x &#34;
          f&#34;(cuBLAS 用了更多高级优化如 TMA、warp specialization 等)&#34;)
    print()
    print(&#34;  💡 这个 kernel 用 wmma::mma_sync 在 SM120 的 HMMA 路径上跑。&#34;)
    print(&#34;     SM120 不支持 tcgen05/TMEM，但支持 mma.sync (HMMA/QMMA/OMMA)。&#34;)
    print(&#34;     相比 03_matmul.py 的 shared-memory tiling，这个版本用了 Tensor Core。&#34;)

if __name__ == &#34;__main__&#34;:
    main()

核心 kernel 结构：

__global__ void hgemm_sm120_kernel(
    const half* __restrict__ A,
    const half* __restrict__ B,
    half* __restrict__ C,
    int M, int N, int K
) {
    // Shared memory: As[M][K], BsT[K][N] (transposed)
    __shared__ half As[128][64];
    __shared__ half BsT[64][128];

    // Warp-level indexing
    int warp_m = (threadIdx.x / 32) / 4;   // 0..7
    int warp_n = (threadIdx.x / 32) % 4;   // 0..3

    // Accumulators persist across K-blocks — THIS IS THE KEY FIX
    wmma::fragment<accumulator, 16, 16, 16, float> acc[2];
    for (int t = 0; t < 2; t++) wmma::fill_fragment(acc[t], 0.0f);

    for (int k_block = 0; k_block < K; k_block += 64) {
        // Cooperative load A[128][64] and BsT[64][128] into shared memory
        // ...

        for (int k_inner = 0; k_inner < 64; k_inner += 16) {
            wmma::load_matrix_sync(a_frag, &As[warp_m*16][k_inner], 64);
            for (int t = 0; t < 2; t++) {
                wmma::load_matrix_sync(b_frag, &BsT[k_inner][(warp_n + t*4)*16], 128);
                wmma::mma_sync(acc[t], a_frag, b_frag, acc[t]);
            }
        }
    }
    // Store to global memory...
}

3.3 B 矩阵转置存储的关键设计
B 的原始存储是 `B[N][K]`（row-major）。对于 `wmma::mma_sync`，matrix_b 是 `K×N` 的：

MMA:  C[i][j] = Σ_k A[i][k] · B[k][j]
GEMM: C[i][j] = Σ_k A[i][k] · B_orig[j][k]
要让 `B[k][j] = B_orig[j][k]`，我们把 B 以 `[K][N]` 格式存入 shared memory：

// B_global is [N][K]; BsT[k][n] = B_global[n][k] (transpose on load)
BsT[k_idx][n_idx] = B[(blk_n + n_idx) * K + (k_block + k_idx)];
这样 `wmma::load_matrix_sync(b_frag, &BsT[k_inner][b_col], BLK_N)` 以 row_major 加载后：

B[k][j] = BsT[k_inner + k][b_col + j] = B_orig[blk_n + b_col + j][k_block + k_inner + k]
MM 的结果就是正确的 `C = A × Bᵀ`。

4. 运行结果

4.1 环境配置
运行前需要修复 CUDA 运行时库的版本兼容问题：

# TVM 的 pip 包需要 libcudart.so.13，但系统只有 CUDA 12.8
conda install -y cuda-cudart=13.0.96 cuda-nvrtc=13.0.88
pip install cuda-bindings==13.0.3

# 设置动态库搜索路径
export LD_LIBRARY_PATH=&#34;/root/miniconda3/lib:$LD_LIBRARY_PATH&#34;
export LD_LIBRARY_PATH=&#34;/root/miniconda3/lib/python3.12/site-packages/tvm_ffi/lib:$LD_LIBRARY_PATH&#34;
export LD_LIBRARY_PATH=&#34;/root/miniconda3/lib/python3.12/site-packages/tvm/lib:$LD_LIBRARY_PATH&#34;

python gemm.py

4.2 正确性测试
矩阵大小max_error结果256×256×2560.000000✅ PASS
4.3 性能测试
矩阵: A(2048×2048) × B(2048×2048)ᵀ → C(2048×2048)，17.2 GFLOPS

版本耗时TFLOPS相对 cuBLAShgemm_sm120 (mma.sync)0.534 ms32.218.2%PyTorch (cuBLAS)0.097 ms176.8100%
4.4 性能差距分析
cuBLAS 比本 kernel 快 5.5×，主要差距来自：

优化技术cuBLAS本 kernel影响TMA（硬件异步拷贝）✅❌减少 global→shared 延迟Double/Triple Buffer✅❌掩盖访存延迟Warp Specialization✅❌Load/Compute 并行寄存器优化✅基础更高 occupancyBank Conflict 处理✅未处理Shared memory 吞吐这些正是后续迭代优化的方向。

5. 总结

- **TIRx 0.25 只支持 SM100（B100/B200）**，原因是 `Tx.gemm_async` 的唯一调度实现（tcgen05）依赖 TMEM 和 warpgroup，这两者 RTX 5090（SM120）都不具备。
- **SM120 的 Tensor Core 硬件是完好的**，通过 `wmma::mma_sync`（HMMA 路径）可以正确调用，只是 TIRx 还没有对接。
- **本 CUDA C++ kernel 作为过渡方案**，在 RTX 5090 上实现了 32 TFLOPS 的 FP16 GEMM 性能，正确性验证通过（max_error = 0）。
- **给 TIRx 贡献 SM120 dispatch** 是可行的长期方向，需要参考 `tcgen05.py`（1052 行）的实现模式，在 TVM lowering pipeline 中新增 HMMA 代码生成路径。