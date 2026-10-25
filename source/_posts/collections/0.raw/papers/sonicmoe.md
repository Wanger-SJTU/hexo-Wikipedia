---
title: "SonicMoE: A Hardware-Efficient and Software-Extensible Blueprint for Fine-Grained MoEs"
date: 2026-05-05
tags:
  - MoE
  - GPU Kernels
  - Blackwell
  - Grouped GEMM
  - Tri Dao
origin: https://tridao.me/blog/2026/sonicmoe-blackwell/
github: https://github.com/Dao-AILab/sonic-moe
arxiv: https://arxiv.org/abs/2512.14080
mathjax: true
---

# SonicMoE: A Hardware-Efficient and Software-Extensible Blueprint for Fine-Grained MoEs

> 博客原文：https://tridao.me/blog/2026/sonicmoe-blackwell/  
> 论文：https://arxiv.org/abs/2512.14080  
> GitHub：https://github.com/Dao-AILab/sonic-moe  
> PyPI：https://pypi.org/project/sonic-moe/

## 核心结论

- **激活内存与 expert granularity 解耦**：通过算法重新设计，反向传播不再需要缓存 O(TKd) 大小的张量（Y、dY、gathered X、gathered dO），直接等价于同激活参数量的 dense 模型，**无需 GEMM 重算**
- **IO 成本降低**：同样的算法重构，减少了多次 HBM 读写
- **跨架构统一抽象**：基于 QuACK（继承自 CUTLASS），一份代码覆盖 Hopper (SM90) 和 Blackwell (SM100)，Hopper→Blackwell 移植只需改 ~500 行 epilogue，不改核心 fusion logic
- **性能**：1.87-4.04x 加速比（vs ScatterMoE/MoMoE），Blackwell 上前向/后向分别比 DeepGEMM 高 54%/35% TFLOPS

---

## 1. Fine-Grained MoE 的问题和机会

### 两个维度

- **Granularity** $G = d/n$：专家相对于模型宽度的尺寸。$G$ 越大 = 专家越小、越多（fine-grained）
- **Sparsity** $\rho = K/E$：每个 token 激活的专家比例。$\rho$ 越小越稀疏

行业趋势：Mixtral 8x22B ($G=0.38, \rho=0.25$) → DeepSeek V3.2 ($G=3.50, \rho=0.03$) → Qwen3-Next ($G=4.00, \rho=0.02$)，每一代都更细粒度、更稀疏。

### 两个硬件代价

**问题 1：激活内存随 granularity 线性增长**

现有 kernel（ScatterMoE、MoMoE）需要缓存 down-proj 输出 $Y$（大小 $TKd$），granularity 增大时线性增长。MoMoE 的解法是反向时重算 GEMM（trade 内存 for FLOPs），但 SonicMoE 问：**能不能不重算也不缓存？**

**问题 2：IO 成本随 granularity 和 sparsity 增长**

算术强度 $\text{Arithmetic Intensity} = O\left(\min\left(\frac{d}{G}, T\rho\right)\right)$

例子：Qwen3-Next-80B 的 microbatch=16K tokens 时，算术强度只有 210，而同参数量的 dense SwiGLU MLP 是 2570（**12x 更低**）。这意味着 kernel 运行时被 IO 统治而非计算吞吐量。

---

## 2. MoE as Grouped GEMM

MoE 的核心运算是 Grouped GEMM：

- **varlen-M Grouped GEMM**：前向和反向激活梯度，每个 expert 的 $N, K$ 固定，$M$（每个 expert 的 token 数）可变
- **varlen-K Grouped GEMM**：反向权重梯度，$M, N$ 固定，$K$ 可变

标准 MoE forward 发射 6 个独立 kernel：gather → up-proj Grouped GEMM → SwiGLU → down-proj Grouped GEMM → scatter → expert aggregation。每个中间变量都物化到 HBM。

**关键洞察**：标准实现在前向和反向中需要缓存 $X$（gathered）、$Y$（down-proj output）、$Y$（scattered），以及反向时的 $dY$ 和 gathered $dO$，全部是 $O(TKd)$ 尺寸。

---

## 3. SonicMoE 算法重构

### 核心思路

绕过所有 $O(TKd)$ 张量的缓存需求：

- **Gathered $X$ 和 $dO$**：在每个 kernel 运行时 gather，从不缓存
- **Scattered $Y$**：融合到 expert aggregation 操作中
- **$Y$ 和 $dY$**：重新设计反向路径，从 $dO$ 和 $H$ 直接算出 $dS$ 和 $dH$，完全不需要 $Y$ 和 $dY$

### $dS$ 的收缩顺序交换

标准路径（需要缓存 $Y$）：
$$dS_{t,e} = \langle dO_t, Y_{e,t}\rangle$$

SonicMoE 路径（不需要 $Y$）：
$$dS_{t,e} = \langle dO_t, A_e W_{2,e}\rangle = \langle dO_t W_{2,e}^\top, A_{e,t}\rangle = \langle dA'_{e,t}, A_{e,t}\rangle$$

### 前向和反向工作流对比

SonicMoE 前向只缓存 $X$ 和 $H$，后向同样避免所有 $O(TKd)$ 激活。

---

## 4. QuACK 软件抽象

> QuACK = Quantized + ACuTe + Customizable Kernels？文章没说，但应该是他们自研的 CUTLASS-style CuTe DSL 库

CUTLASS 的分层编程模型：mainloop（tile MMA） + epilogue（结果写回前的后处理）。QuACK 继承这个模型并扩展为模块化组件。

**SonicMoE 的 GEMM kernel 都是同一结构的不同配置**：
- producer-consumer GEMM mainloop：数据加载和 MMA 重叠
- parameterizable epilogue：fusion 逻辑直接在 accumulator 上应用，不用写回 HBM

### 可定制 Epilogue

每个 Grouped GEMM kernel 的差异只在于：
1. producer 如何加载数据（contiguous vs. gathered）
2. epilogue consumer 对 accumulator 做什么

```cpp
epi_visit_subtile // 这一个方法是所有 fusion logic 的注入点
```

一个 88 行的 `GemmDGatedMixin` 继承类就实现了 SonicMoE 最重的 dH kernel。全部 6 个 kernel 加起来 ~200 行代码（vs 之前 Hopper 版本 3k+ 行）。

### 架构适配

- **跨架构**：Hopper (SM90) 和 Blackwell (SM100) 共用同一套 epilogue 逻辑，只需改 warp layout、accumulator movement、硬件资源管理
- **SM120 (Blackwell GeForce)**：只需加一个 ~500 行的 base GEMM class，不改 epilogue
- **TMA gather4 for Blackwell**：只改 copy atoms 和 SMEM layout，~100 行，不碰 MMA warps

---

## 5. Blackwell 硬件特性

### TMEM（Tensor Memory）

Blackwell 新增 256KB/SM 的 on-chip TMEM，MMA 结果直接写入 TMEM（而非寄存器），和寄存器文件完全分离。TMEM 分 128 行 × 512 列（32-bit），可容纳两个独立的 256 列 accumulator stage。

### Ping-Pong 双缓冲

MMA warp 往 stage 1 写时，epilogue warps 同时从 stage 0 读出做后处理；交替进行，带来了真正的计算-IO 重叠。

### 2CTA MMA

两个 CTA 合作执行一个 MMA 指令，tile 的 M 维度翻倍（128→256）。关键好处：**B tile 在两个 CTA 间共享**，每个 CTA 只加载一半的 B 数据，SMEM 流量减半。

### Cluster Launch Control (CLC)

Blackwell 的硬件动态 tile scheduler，通过 `clusterlaunchcontrol.try_cancel` PTX 指令查询下一个 tile 坐标，无需 GMEM 原子操作。比 Hopper 的 static 调度更好地处理 expert token 分布不均匀的情况。

---

## 6. IO 优化三原则

### Gather Fusion

多个 varlen-M GEMM 从任意位置 gather token。SonicMoE 把 gather 直接融合进 GMEM→SMEM 加载：

- Hopper：cp.async gather
- Blackwell：TMA gather4（`cp.async.bulk.tensor.2d.shared::cta.global.tile::gather4`）

**L2 Cache 局部性**：gather fusion 从紧凑源张量读取，而 pre-gathered contiguous load 需要读取 K 倍大的张量（每个 token 在 K 个不同地址重复），working set 超出 L2 容量。虽然算法 IO 相同，但 gather fusion 的 L2 cache hit rate 更高，实际 HBM 流量更低。

### SwiGLU / dSwiGLU Fusion

激活函数在寄存器内应用，然后通过 async TMA store 写回，不占关键路径。

### dH Kernel：IO 与 MMA 重叠

dH 是最重的 kernel（需要同时算出 $dH$、$dS$、$A'$），通过 epilogue warps 和 MMA warp 分时复用 TMEM 资源来隐藏 IO。

Nsight Compute 分析显示：dH kernel 的 HBM 流量增加 24%（6.33→7.86 GB），但 Tensor Core 利用率只从 98% 降到 88%（TFLOPS 从 1213 降到 1078，只降 11%）。**IO 增长不直接正比于 runtime 增长**。

---

## 7. Benchmark 结果

6 个真实开源 MoE 配置（7B~685B），B300 GPU：

| 配置 | 前向 TFLOPS 提升 | 后向 TFLOPS 提升 |
|------|----------------|----------------|
| 平均（vs DeepGEMM） | +54% | +35% |
| vs ScatterMoE/MoMoE | 经常 **2x** | 经常 **2x** |
| vs Triton official | +21% | - |

token rounding 在高稀疏设置下额外加速 1.16x。

---

## 附：Token Rounding

这是论文摘要里提到但博客里没细说的 trick。核心思想是：Grouped GEMM 中每个 expert 的 token 数不一样，会有 padding 浪费。Token rounding 通过把 token 数对齐到某个值，减少 padding，在高稀疏场景（每个 expert token 数很少）效果明显。

---

## 核心 Takeaway

1. **Fine-grained MoE 时代需要新 kernel 设计**：ScatterMoE/MoMoE 为粗粒度 MoE 设计，不适合现在的细粒度稀疏趋势
2. **算法重构比硬件技巧更根本**：改反向传播的数据流路径，同时解决激活内存和 IO 成本两个问题，且不需要 GEMM 重算
3. **统一抽象降低维护成本**：Hopper→Blackwell 的工作量从零开始重写 → ~500 行 override，代码量从 3k+ 降到 200 行
4. **硬件特性（TMEM、2CTA、CLC）配合算法特性（gather fusion、epilogue fusion）才能最大化性能**