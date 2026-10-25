---
title: Chunkwise Parallel 详解：如何将 O(L) 顺序计算变成 O(L/C)
date: "2026-04-03 00:00:00"
updated: "2026-04-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Chunkwise-Parallel-详解-如何将-O(L)-顺序计算变成-O(L_C)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2022071052365301640
---


<strong>本文深入解析 Gated DeltaNet 的 Chunkwise Parallel 算法，从数学推导到实现细节，帮你理解这个让”无法并行”的算法变得高效的关键技术。TL;DR</strong>: GDN 的 delta rule 存在严格顺序依赖，无法用 Parallel Scan。Chunkwise Parallel 的解法是：将序列分成 L/C 个 chunk，<strong>chunk 内用矩阵乘法</strong>（Tensor Core 友好），<strong>chunk 间顺序传递状态</strong>。这样顺序步骤从 O(L) 降到 O(L/C)，同时获得 Tensor Core 加速。

#### 一、问题背景：为什么 GDN 无法直接并行？

#### 1.1 GDN 的递推公式

Gated DeltaNet 的核心是一个状态递推：

$St=gt&#x22C5;St&#x2212;1+&#x0394;t&#x22C5;kt&#x22A4;" role="presentation" style="font-size: 100%; display: inline-block; position: relative;">St=gt⋅St−1+Δt⋅kt⊤ S_t = g_t \cdot S_{t-1} + \Delta_t \cdot k_t^\top $

其中：

$- St&#x2208;Rd&#x00D7;d" role="presentation">St∈Rd×dS_t \in \mathbb{R}^{d \times d} 是状态矩阵$
$- gt&#x2208;R" role="presentation">gt∈Rg_t \in \mathbb{R} 是衰减门控$
$- &#x0394;t=&#x03B2;t(vt&#x2212;St&#x2212;1kt)" role="presentation">Δt=βt(vt−St−1kt)\Delta_t = \beta_t (v_t - S_{t-1} k_t) 是增量更新$
$- kt,vt&#x2208;Rd" role="presentation">kt,vt∈Rdk_t, v_t \in \mathbb{R}^d 是 key 和 value 向量$

#### 1.2 顺序依赖链

$关键问题在于 &#x0394;t" role="presentation">Δt\Delta_t 的计算：$

old_v = S_{t-1} @ k_t     # 必须知道 S_{t-1}
delta = beta * (v - old_v) # 依赖 old_v
S_t = g * S_{t-1} + outer(delta, k)  # 更新状态`

这形成了严格的依赖链：

`S₀ → old_v₀ → Δ₀ → S₁ → old_v₁ → Δ₁ → S₂ → ...`

<strong>每个 token 必须等待前一个 token 完成状态更新</strong>，导致 O(L) 的顺序步骤。

#### 1.3 Parallel Scan 为什么不行？

$理论上，形如 St=AtSt&#x2212;1+Bt" role="presentation">St=AtSt−1+BtS_t = A_t S_{t-1} + B_t 的递推可以用 Parallel Scan 并行化。但 GDN 的问题是：$

$&#x0394;t=&#x03B2;t(vt&#x2212;St&#x2212;1kt&#x23DF;&#x4F9D;&#x8D56;&#x72B6;&#x6001;)" role="presentation" style="font-size: 100%; display: inline-block; position: relative;">Δt=βt(vt−St−1kt⏟依赖状态) \Delta_t = \beta_t (v_t - \underbrace{S_{t-1} k_t}_{\text{依赖状态}})  $

\Delta_t <strong>本身就依赖</strong>S_{t-1}，不是预先可知的常数。这打破了 Parallel Scan 的前提条件。

#### 二、Chunkwise Parallel 的核心思想

#### 2.1 分而治之

既然 token 级别无法并行，我们退而求其次：<strong>chunk 级别并行</strong>。

原始序列 (L=256 tokens):
t₁ t₂ t₃ ... t₆₄ | t₆₅ t₆₆ ... t₁₂₈ | t₁₂₉ ... t₁₉₂ | t₁₉₃ ... t₂₅₆
└────Chunk 1────┘ └────Chunk 2─────┘ └───Chunk 3───┘ └───Chunk 4───┘

处理方式:
1. Chunk 1 内部：顺序处理 64 个 token → 得到 S₆₄
2. Chunk 2 内部：以 S₆₄ 为初始状态，顺序处理 → 得到 S₁₂₈
3. ...依此类推

顺序步骤: O(L) → O(L/C) = O(4) when C=64`

但这只是最朴素的分块，还没有利用并行。真正的 Chunkwise Parallel 更精妙。

#### 2.2 关键洞察：Chunk 内部可以矩阵化

在一个 chunk 内部，虽然 token 间有依赖，但我们可以把整个 chunk 的计算<strong>重新表述为矩阵运算</strong>。

设 chunk 大小为 C，chunk 内的输入为：

$- Q \in \mathbb{R}^{C \times d} (queries)$
$- K \in \mathbb{R}^{C \times d} (keys)$
$- V \in \mathbb{R}^{C \times d} (values)$
$- G \in \mathbb{R}^{C} (gates)$
$- B \in \mathbb{R}^{C} (betas)$
目标是计算：

$- O \in \mathbb{R}^{C \times d} (outputs)$
$- S_{out} \in \mathbb{R}^{d \times d} (chunk 结束时的状态)$

#### 三、数学推导：Chunk 内的矩阵形式

#### 3.1 展开递推

设 chunk 的初始状态为 S_0，我们逐步展开每个 token 的状态更新：

<strong>Token 1:</strong> 

 \begin{align} \text{old\_v}_1 &= S_0 k_1 \\ \Delta_1 &= \beta_1 (v_1 - \text{old\_v}_1) \\ S_1 &= g_1 S_0 + \Delta_1 k_1^\top \end{align} 

**

Token 2:** 

 \begin{align} \text{old\_v}_2 &= S_1 k_2 = (g_1 S_0 + \Delta_1 k_1^\top) k_2 \\ &= g_1 S_0 k_2 + \Delta_1 (k_1^\top k_2) \\ \Delta_2 &= \beta_2 (v_2 - \text{old\_v}_2) \\ S_2 &= g_2 S_1 + \Delta_2 k_2^\top \\ &= g_2 g_1 S_0 + g_2 \Delta_1 k_1^\top + \Delta_2 k_2^\top \end{align} 

**

#### 3.2 归纳出模式

对于 token t 在 chunk 内，我们可以写出：

 $S_t = \underbrace{\left(\prod_{i=1}^{t} g_i\right)}_{\gamma_t} S_0 + \sum_{j=1}^{t} \underbrace{\left(\prod_{i=j+1}^{t} g_i\right)}_{\gamma_{j:t}} \Delta_j k_j^\top $

其中：

$- \gamma_t = \prod_{i=1}^{t} g_i 是累积衰减因子$
$- \gamma_{j:t} = \prod_{i=j+1}^{t} g_i 是从 token j 到 t 的衰减$

#### 3.3 输出的矩阵形式

输出 o_t = S_t q_t 可以分解为两部分：

 $o_t = \underbrace{\gamma_t (S_0 q_t)}_{\text{来自初始状态}} + \underbrace{\sum_{j=1}^{t} \gamma_{j:t} \Delta_j (k_j^\top q_t)}_{\text{来自 chunk 内更新}}  $

关键观察<strong>：第二项可以写成</strong>因果注意力**的形式！

定义：

$- A_{tj} = \gamma_{j:t} (k_j^\top q_t) 为”衰减注意力分数”$
- 这是一个<strong>下三角矩阵</strong>（因果性：t 只能看到 j \leq t）
则： 

 $O = \underbrace{\Gamma \cdot (S_0 Q^\top)^\top}_{\text{状态贡献}} + \underbrace{\text{CausalAttn}(\Delta, K, Q, G)}_{\text{Chunk 内交互}} $

**

#### 3.4 转化为 Tensor Core 友好的形式

上述公式中的 CausalAttn 可以进一步转化为矩阵乘法：

# 伪代码：Chunk 内计算

```python
def chunk_forward(Q, K, V, G, B, S_init):
    C, d = Q.shape

    # Step 1: 计算累积衰减矩阵 Γ (下三角)
    # Γ[i,j] = prod(g[j+1:i+1]) for j 
```


#### 四、完整算法：两阶段 Chunkwise Parallel

#### 4.1 阶段一：Intra-Chunk（Chunk 内并行）

每个 chunk 独立计算，可以并行处理所有 chunk**：

```python
def intra_chunk_parallel(chunks, S_init_per_chunk):
    """
    输入:
      chunks: List of (Q, K, V, G, B), 每个 shape [C, d]
      S_init_per_chunk: 每个 chunk 的初始状态 [num_chunks, d, d]
```

    
    输出:
      outputs: [num_chunks, C, d]
      S_finals: [num_chunks, d, d]
    """

```text
    outputs = []
    S_finals = []
```

    
    # 这个循环可以完全并行！

```text
    for chunk_idx, (Q, K, V, G, B) in enumerate(chunks):
        S_init = S_init_per_chunk[chunk_idx]
```

        
        # Chunk 内计算（矩阵运算，Tensor Core）

```text
        O, S_final = compute_chunk(Q, K, V, G, B, S_init)

        outputs.append(O)
        S_finals.append(S_final)

    return stack(outputs), stack(S_finals)`
```


#### 4.2 阶段二：Inter-Chunk（Chunk 间传递）

Chunk 间必须顺序传递状态，但只有 L/C 步：

```python
def inter_chunk_sequential(S_finals, initial_state):
    """
    输入:
      S_finals: 每个 chunk 的"局部最终状态" [num_chunks, d, d]
      initial_state: 序列的初始状态 [d, d]
```

    
    输出:
      S_corrected: 修正后的最终状态 [num_chunks, d, d]
    """

```text
    num_chunks = len(S_finals)
    S_prev = initial_state
    S_corrected = []

    # O(L/C) 顺序步骤
    for i in range(num_chunks):
        # 修正：考虑之前 chunk 的状态传递
        S_curr = propagate_state(S_prev, S_finals[i])
        S_corrected.append(S_curr)
        S_prev = S_curr

    return stack(S_corrected)`
```


#### 4.3 整体流程图

输入序列 (L tokens)
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1: 分块                                           │
│  [t₁...t_C] [t_{C+1}...t_{2C}] ... [t_{L-C+1}...t_L]   │
│    Chunk 1      Chunk 2      ...      Chunk N          │
└─────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: Intra-Chunk 并行 (Tensor Core)                 │
│                                                         │
│  ┌─────────┐ ┌─────────┐     ┌─────────┐               │
│  │ Chunk 1 │ │ Chunk 2 │ ... │ Chunk N │  ← 并行！     │
│  │ MatMul  │ │ MatMul  │     │ MatMul  │               │
│  └────┬────┘ └────┬────┘     └────┬────┘               │
│       │           │               │                     │
│    (O₁,S₁)     (O₂,S₂)        (O_N,S_N)                │
└───────┼───────────┼───────────────┼─────────────────────┘
        │           │               │
        ▼           ▼               ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: Inter-Chunk 顺序传递 (O(L/C) 步)               │
│                                                         │
│  S_init → S₁' → S₂' → ... → S_N'                       │
│           │      │           │                          │
│           ▼      ▼           ▼                          │
│          修正   修正        修正                        │
│          O₁     O₂          O_N                        │
└─────────────────────────────────────────────────────────┘
        │
        ▼
   最终输出 O`

#### 五、复杂度分析

#### 5.1 时间复杂度

操作朴素递推Chunkwise Parallel顺序步骤O(L)O(L/C)并行计算-O(C²d) per chunk总计O(Ld²) sequentialO(L/C) sequential + O(LC·d) parallel当 C = 64，L = 4096 时：

- 朴素方法：4096 顺序步骤
- Chunkwise：64 顺序步骤 + 并行矩阵乘法
<strong>加速比：64x 顺序步骤减少！</strong>

#### 5.2 空间复杂度

存储项大小说明Chunk 状态O(L/C · d²)每个 chunk 一个 d×d 矩阵注意力矩阵O(C²) per chunk下三角因果掩码总计O(Ld²/C + C²)远小于 O(Ld²)
#### 5.3 Tensor Core 利用率

Intra-Chunk 阶段的核心操作是：

- A = Q K^\top：[C, d] × [d, C] = [C, C] matmul
- O = A V：[C, C] × [C, d] = [C, d] matmul
当 C = 64, d = 128 时：

- 矩阵大小完美适配 Tensor Core (16×16 或 8×16 tiles)
- 可以达到接近峰值的 Tensor Core 吞吐

#### 六、实现细节与技巧

#### 6.1 处理 Delta 的依赖

$最棘手的部分是 \Delta_t 依赖 S_{t-1}。有两种处理方式：$

<strong>方式 A：迭代求解（精确）</strong>

```python
def compute_deltas_iterative(K, V, G, B, S_init):
    """Chunk 内迭代计算 Δ"""
    C, d = K.shape
    S = S_init.clone()
    deltas = []

    for t in range(C):
        old_v = S @ K[t]
        delta = B[t] * (V[t] - old_v)
        deltas.append(delta)
        S = G[t] * S + outer(delta, K[t])

    return stack(deltas)  # [C, d]`
```


$这仍然是 O© 顺序，但 C \gamma_t = \prod_{i=1}^{t} g_i 可能非常小（当 g  时）。建议：$

# 使用 log-space 计算
log_gamma = cumsum(log(G))
gamma = exp(log_gamma)

# 或使用 float32 累积
gamma = cumprod(G.float()).to(G.dtype)`

#### 6.3 Memory-Efficient 实现

为了避免 O(C²) 的注意力矩阵，可以使用 <strong>Flash Attention 风格</strong>的分块：

```python
def memory_efficient_chunk(Q, K, V, G, B, S_init, BLOCK=16):
    """分块计算，避免 O(C²) 显存"""
    C, d = Q.shape
    O = zeros(C, d)

    for i in range(0, C, BLOCK):
        q_block = Q[i:i+BLOCK]  # [BLOCK, d]
```

        
        # 只计算需要的注意力块

```text
        for j in range(0, i + BLOCK, BLOCK):
            k_block = K[j:j+BLOCK]
            v_block = V[j:j+BLOCK]
```

            
            # 局部注意力 + 因果掩码

```text
            a_block = q_block @ k_block.T  # [BLOCK, BLOCK]
            # ... apply mask and accumulate

        O[i:i+BLOCK] = ...

    return O`
```


#### 七、与其他方法的对比

#### 7.1 vs Parallel Scan

特性Parallel ScanChunkwise Parallel适用条件S_t = A_t S_{t-1} + B_t, A,B 预知状态依赖的更新GDN 可用❌ (Δ 依赖 S)✅并行度O(log L) depthO(L/C) sequential + full parallelTensor Core有限充分利用
#### 7.2 vs Flash Attention

特性Flash AttentionGDN Chunkwise算法类型标准 Attention递归 + Delta Rule内存O(L) → O(1)O(Ld²) → O(Ld²/C)IO 优化Tiling + RecomputationTiling + State Propagation复杂度O(L²d)O(LCd + Ld²/C)
#### 7.3 vs 纯递推

特性纯递推Chunkwise Parallel顺序步骤O(L)O(L/C)Tensor Core❌✅吞吐~1 M tok/s~10+ M tok/s实现复杂度低中
#### 八、实际效果

#### 8.1 Prefill 性能对比

在 NVIDIA B200 GPU 上的 GDN Prefill 测试：

方法序列长度耗时 (ms)吞吐 (M tok/s)纯递推40963.311.24Chunkwise (C=64)4096~0.5~8.2Chunkwise + Tensor Core4096~0.3~13.6<strong>加速比：6-10x！</strong>

#### 8.2 Chunk Size 的选择

Chunk Size优点缺点C=32更少顺序步骤矩阵太小，Tensor Core 利用率低C=64平衡推荐C=128Tensor Core 利用率高更多顺序步骤C=256最高并行度内存压力大，顺序步骤多通常 <strong>C=64 或 C=128</strong> 是最优选择。

#### 九、总结

#### 核心思想

<strong>Chunkwise Parallel 的本质是将”无法并行”的 token 级递推，转化为”可以高效并行”的 chunk 级矩阵运算。</strong>
#### 三个关键步骤

- <strong>分块</strong>：将长度 L 的序列分成 L/C 个 chunk
- <strong>Intra-Chunk 并行</strong>：每个 chunk 内部用矩阵乘法（Tensor Core）
- <strong>Inter-Chunk 顺序</strong>：chunk 之间顺序传递状态（O(L/C) 步）

#### 适用场景

- <strong>Training / Prefill</strong>：处理长序列，需要高吞吐
- <strong>不适用于 Decode</strong>：Decode 每次只处理 1 个 token，无法 chunk

#### 实现建议

- Chunk size 选择 64 或 128
- 使用 Flash Attention 风格的分块避免 O(C²) 显存
- 在 log-space 计算累积衰减保证数值稳定

#### 十、实战经验：我们的 Prefill 优化之路

** 以下内容来自我们在 NVIDIA B200 上优化 GDN Prefill 内核的实践经验。
#### 10.1 问题起点：朴素实现的瓶颈

最初的 Triton 实现采用最直接的方式——逐 token 顺序扫描：

@triton.jit

```python
def _prefill_kernel_naive(Q, K, V, State, ...):
    # 加载初始状态 [D, D]
    S = tl.load(State + ...)  
```

    
    # 逐 token 顺序处理

```text
    for i in range(seq_len):
        t = t_start + i
```

        
        # 加载当前 token 的 q, k, v

```text
        q = tl.load(Q + t * stride_q + ...)
        k = tl.load(K + t * stride_k + ...)
        v = tl.load(V + t * stride_v + ...)
```

        
        # GDN delta rule

```sql
        old_v = tl.sum(S * k[None, :], axis=1)  # S @ k
        delta = beta * (v - old_v)
        S = g * S + delta[:, None] * k[None, :]  # rank-1 update
```

        
        # 输出

```text
        o = scale * tl.sum(S * q[None, :], axis=1)  # S @ q
        tl.store(Out + t * stride_o + ..., o)`
```


实测结果 (B200)**:

- 单序列 4096 tokens: <strong>3.31 ms, 1.24 M tok/s</strong>
- 问题：完全顺序执行，Tensor Core 完全没用上

#### 10.2 第一次优化：V-Slice 并行

$我们发现：状态矩阵 S \in \mathbb{R}^{128 \times 128} 的不同<strong>行</strong>之间是独立的！$

状态矩阵 S [128, 128]:
┌─────────────────────────┐
│ Row 0:  s[0,0]...s[0,127]  │ ← 独立
│ Row 1:  s[1,0]...s[1,127]  │ ← 独立
│ ...                        │
│ Row 127: s[127,0]...       │ ← 独立
└─────────────────────────┘

Delta Rule 更新:
S[i,:] = g * S[i,:] + delta[i] * k[:]

每一行的更新只依赖于:
1. 自己的旧值 S[i,:]
2. 标量 delta[i]
3. 共享的 k[:]`

于是我们将 128 行分成多个 V-Block，每个 block 独立处理：

@triton.jit

```python
def _prefill_kernel(Q, K, V, State, ..., BLOCK_V: tl.constexpr):
    n  = tl.program_id(0)   # 序列索引
    h  = tl.program_id(1)   # v_head 索引
    vb = tl.program_id(2)   # V-block 索引 ← 新增！
    v0 = vb * BLOCK_V       # 本 program 负责的起始行
```

    
    # 只加载本 block 负责的 V-slice [BLOCK_V, D]

```text
    vi = tl.arange(0, BLOCK_V)[:, None]
    ki = tl.arange(0, D)[None, :]
    S = tl.load(State + ... + v0 * stride_s_v + vi * stride_s_v + ki)

    for i in range(seq_len):
        # 只处理 V-slice
        vv = tl.load(V + ... + v0 + tl.arange(0, BLOCK_V))  # [BLOCK_V]
```

        
        # 本 slice 的 delta rule

```text
        old_v = tl.sum(S * kv[None, :], axis=1)  # [BLOCK_V]
        delta = beta * (vv - old_v)
        S = g * S + delta[:, None] * kv[None, :]
```

        
        # 输出本 slice

```text
        ov = scale * tl.sum(S * qv[None, :], axis=1)
        tl.store(Out + ... + v0 + tl.arange(0, BLOCK_V), ov)`
```


<strong>Grid 配置</strong>:

# Grid: (N=num_seqs, H=8, V_BLOCKS)
V_BLOCKS = D // BLOCK_V  # 128 // 16 = 8 或 128 // 32 = 4

_prefill_kernel[(N, num_v_heads, V_BLOCKS)](...)`

<strong>效果</strong>：

- 并行度从 `N × H` 提升到 `N × H × V_BLOCKS`
- BLOCK_V=16 时，并行度提升 8x

#### 10.3 Adaptive BLOCK_V：根据 Batch Size 动态调整

我们发现不同 batch size 下，最优的 BLOCK_V 不同：

Batch SizeBLOCK_V=16BLOCK_V=32最优选择N=1✅ 更多并行❌ SM 占用低16N=4✅ 刚好⚠️ 略低16N=8+⚠️ 过多 programs✅ 平衡32<strong>实现</strong>：

```python
def kernel(q, k, v, state, ...):
    N = cu_seqlens.shape[0] - 1
```

    
    # Adaptive BLOCK_V
    if N 

#### 10.4 GVA 处理：Query/Key 共享

Qwen3 使用 <strong>Grouped Value Attention (GVA)</strong>：

- num_q_heads = 4
- num_v_heads = 8
- 每 2 个 v_head 共享 1 个 qk_head
# GVA: 2 v-heads per qk-head
qk_h = h // 2  # h 是 v_head 索引 (0-7)，qk_h 是 qk_head 索引 (0-3)

# 加载 Q 和 K 时使用 qk_h
qv = tl.load(Q_ptr + t * stride_q_t + qk_h * stride_q_h + di)
kv = tl.load(K_ptr + t * stride_k_t + qk_h * stride_k_h + di)

# 加载 V 时使用 h
vv = tl.load(V_ptr + t * stride_v_t + h * stride_v_h + v0 + vd)`

#### 10.5 实测数据：优化效果

<strong>单序列吞吐 (确认顺序依赖)</strong>:

序列长度耗时 (ms)吞吐 (M tok/s)时间/token5120.421.210.82 μs10240.841.230.82 μs20481.661.230.81 μs40963.311.240.81 μs<strong>观察</strong>：时间与长度严格线性，每 token ~0.82 μs，这证实了顺序依赖。

<strong>Multi-Batch 吞吐 (并行收益)</strong>:

BatchTokens吞吐 (M tok/s)加速比N=140961.241.0xN=440964.703.8xN=16409611.389.2xN=32409614.1311.4xN=64409613.7011.1x<strong>观察</strong>：N=32 是甜点，超过后饱和（SM 数量限制）。

#### 10.6 关键洞察：为什么我们没用”真正的” Chunkwise Parallel？

你可能注意到，我们的实现<strong>仍然是逐 token 扫描</strong>，只是在 V 维度上做了并行。这是因为：

<strong>理论 vs 实践的 Gap</strong>:

理论 Chunkwise我们的实现Chunk 内 token 并行Chunk 内 token 顺序需要复杂的矩阵分解直接 delta rule利用 Tensor Core纯向量运算实现复杂度高实现简单<strong>为什么我们选择简单方案？</strong>

- <strong>正确性优先</strong>：复杂的 chunk 内矩阵求解容易出 bug
- <strong>Multi-Batch 足够</strong>：生产环境 batch 通常 >= 16，已经够快
- <strong>ROI 考量</strong>：Tensor Core 方案的收益 ~2-3x，但实现成本高
- <strong>FlashInfer 基线</strong>：官方实现也是类似方案（CuTe DSL，非 chunk 并行）

#### 10.7 未来优化方向

如果要进一步优化，可以考虑：

<strong>1. Chunk 内 Tensor Core（高收益，高难度）</strong>

目标：将 Chunk 内的多个 token 合并成矩阵乘法
预期收益：2-3x
难点：正确处理 delta 的状态依赖`

<strong>2. TMA + Double Buffering（中收益，中难度）</strong>

目标：异步预取下一 chunk 的数据
预期收益：1.3-1.5x
实现：cp.async.bulk.tensor 指令`

<strong>3. State 量化（低-中收益，低难度）</strong>

目标：FP32 状态 → FP8/BF16
预期收益：2-4x 带宽减少
风险：精度损失`

#### 十一、总结与建议

#### 核心思想回顾

<strong>Chunkwise Parallel 的本质是将”无法并行”的 token 级递推，转化为”可以高效并行”的 chunk 级矩阵运算。</strong>
#### 实践建议

场景建议方案理由快速原型V-Slice 并行 + Adaptive BLOCK_V简单可靠，效果不错生产部署Multi-Batch (N=16-32)最佳性价比追求极致完整 Chunkwise + Tensor Core但要准备好调 bug
#### 踩坑记录

- <strong>GVA 索引错误</strong>：qk_head 和 v_head 的映射关系要搞清楚
- <strong>状态布局</strong>：k-last vs v-last，搞反了 shape 完全不对
- <strong>Triton 的 constexpr</strong>：BLOCK_V 必须是编译期常量
- <strong>num_warps 选择</strong>：4 warps 通常最优，8 warps 反而更慢
*本文是 GDN 系列文章的第二篇。上一篇：*[深入理解 Qwen3.5 的 Gated DeltaNet](https://zhuanlan.zhihu.com/ZHIHU_GDN_INFERENCE.md)
