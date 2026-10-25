---
title: "Understanding Kimi3 (1): Linear Attention, Sparse Attention, and the Architecture War at Million-Token Scale"
date: "2026-07-23 08:38:18"
updated: "2026-07-23 08:38:18"
layout: "post"
permalink: "/collections/0.raw/kimi3-architecture-analysis/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---


# Understanding Kimi3 (1): Linear Attention, Sparse Attention, and the Architecture War at Million-Token Scale

## The Question That Matters

At million-token context lengths, the cost structure of AI inference fundamentally shifts. Our previous analysis showed that <strong>storage (KV-Cache) dominates the bill</strong> — 67-78% of total cost across vendors. This reality makes one question critical: <strong>which model micro-architecture can deliver the best quality-cost tradeoff at extreme sequence lengths?</strong>

Two paths have emerged:

| Path | Representative | KV Strategy | Scaling Claim |
|------|---------------|-------------|---------------|
| <strong>Linear Attention</strong> | Kimi3, Qwen3, Xiaomi SWA | Compress via linear attention | ~linear with context |
| <strong>Sparse Attention (DSA)</strong> | DeepSeek V4, GLM52, LongCat | Sparse index + compression | ~near-linear with index |

This post dives deep into Kimi3's architecture, compares it with the DSA path, and offers a perspective on which approach has the higher scaling ceiling.

---

## 1. Kimi3 Architecture: The Linear Attention Frontier

### 1.1 Hybrid Architecture: KDA + ResNet + MLA

Kimi3 employs a <strong>layerwise hybrid architecture</strong> combining three components:

| Component | Role | Sequence Scaling |
|-----------|------|-----------------|
| <strong>KDA (Kimi Delta Attention)</strong> | Linear attention module | O(1) per token — constant via recurrent state |
| <strong>MLA (Multi-head Latent Attention)</strong> | Compressed full attention | Compressed attention (32× memory reduction; compute depends on latent dimension) |
| <strong>ResNet</strong> | Gradient path stabilization | Independent of sequence |

The key innovation is the <strong>3:1 ratio of KDA to MLA</strong> — three linear attention layers for every one full attention layer. This hybrid design claims to reduce computation by <strong>75%</strong> compared to pure full attention, while maintaining quality through strategic full-attention checkpoints.

### 1.2 KDA: The Core Linear Attention Module

At the heart of Kimi3 lies <strong>Kimi Delta Attention (KDA)</strong>, a hardware-efficient linear attention module that extends Gated DeltaNet with a <strong>channel-wise forget gate</strong>.

Traditional linear attention uses a single scalar forget gate per head. KDA introduces finer-grained control:

```
Standard: gate ∈ ℝ (1 value per head)
KDA: gate ∈ ℝ^C (per-channel, C = channel dim)
```

This channel-wise gating allows the model to selectively retain or forget information at a granular level — critical for long-context tasks where different channels may carry information at different timescales.

### 1.3 MoE Sparsity: 1.8% Activation

Kimi3 pushes MoE sparsity to extreme levels:

| Model | Activated Params | Total Params | Sparsity |
|-------|-----------------|--------------|----------|
| <strong>Kimi3</strong> | 3B | 48B | <strong>1.8%</strong> |
| DeepSeek V4 Flash | — | — | ~1.8% |
| Typical MoE | 10-30% | — | 10-30% |

This ultra-low sparsity means only 1.8% of parameters are active per token — a design choice that trades training efficiency for inference cost savings.

---

## 2. The Two Architecture Paths

### 2.1 Linear Attention Path

<strong>Adopters:</strong> Kimi3, Qwen3 series, Xiaomi SWA

<strong>Core idea:</strong> Replace O(n²) full attention with O(1) per-token linear attention, using fixed-size recurrent state.

<strong>Strengths:</strong>
- <strong>O(1) per token</strong> via recurrent state (fixed size, independent of sequence)
- No index structure needed
- Simpler hardware utilization

<strong>Weaknesses:</strong>
- <strong>Must retain full attention layers</strong> to maintain quality (the 3:1 KDA:MLA ratio)
- Full attention layers are the <strong>scaling bottleneck</strong> — they remain O(n²)
- Cross-media coordination (HBM → DRAM → SSD) is extremely difficult due to bandwidth requirements

### 2.2 DSA (Dense-Sparse Attention) Path

<strong>Adopters:</strong> DeepSeek V4, GLM52, LongCat

<strong>Core idea:</strong> Use sparse indexing to select only the most relevant tokens, achieving near-linear scaling while preserving full-attention quality.

<strong>Strengths:</strong>
- <strong>Near-linear scaling</strong> with sparse index (index computation is the optimization focus for GLM52, LongCat, DeepSeek V4)
- Naturally suited for <strong>cross-media coordination</strong> (HBM/DRAM/SSD)
- DeepSeek V4 demonstrates real-world viability

<strong>Weaknesses:</strong>
- Sparse indexing introduces <strong>random memory access</strong> patterns
- Index computation adds overhead (optimization focus for GLM52, LongCat, DeepSeek V4)
- Hardware support for gather/scatter still maturing

### 2.3 The Scaling Ceiling: A Quantitative View

| Architecture | Type | Compute Scaling | Memory Scaling | Cross-Media | Practical Ceiling |
|-------------|------|----------------|----------------|-------------|-------------------|
| Full Attention | Pure | O(n²) | O(n) | Poor | ~128K |
| <strong>Kimi3</strong> | <strong>Hybrid</strong> (75% linear + 25% MLA) | O(1) per token (linear) + MLA (compressed attn) | O(n) | Poor | <strong>~500K (estimated)</strong> |
| DSA (DeepSeek V4) | Sparse index | Sparse index + selective attention | O(n) | <strong>Good (offloadable)</strong> | <strong>~1M+</strong> |

> <strong>Key insight:</strong> Kimi3 is a <strong>hybrid</strong> architecture — its 25% MLA (full attention) layers become the scaling ceiling. At 1M tokens, the MLA layers are computationally expensive. <strong>Memory scaling is the same for both Kimi3 and DSA (O(n))</strong>, but DSA can <strong>offload during decode</strong> via sparse indexing, while Kimi3 cannot. DSA's sparse index has a higher ceiling because it avoids the full-attention wall entirely.

---

## 3. Efficiency Numbers: What Kimi's Linear Paper Actually Shows

### 3.1 The 2× Decoding Speedup Claim

From the Kimi Linear paper:

> "Our proposed KDA delivers competitive performance compared to the full-attention baseline (Table 3) and achieves <strong>over a 2× decoding speedup</strong> at the one-million-token context (Figure 7b)."

<strong>Experimental setup:</strong>
- Model: 3B activated / 48B total parameters
- Baseline: Full attention
- Context: 1M tokens

<strong>Critical analysis:</strong>
- 2× speedup at 1M is modest — full attention at 1M is nearly infeasible, so the baseline is already degraded
- The comparison is against full attention, not against DSA architectures
- Real-world deployment constraints (batch size, memory bandwidth) are not captured

### 3.2 The 6× Decoding Throughput Claim

> "For decoding at 1M context length, Kimi Linear is <strong>6× faster</strong> than full attention."

<strong>Experimental setup:</strong>
- Same 3B/48B model
- Pretrained on 1.4T tokens
- Batch size: 1 (2.2× speedup), larger batches show 6×

<strong>Critical analysis:</strong>
- 6× at batch=1 is impressive, but batch=1 is not production-realistic
- The comparison baseline (full attention at 1M) is already impractical
- No comparison against DSA architectures (DeepSeek, GLM, LongCat)

### 3.3 The 1.16× Computational Efficiency Claim

> "Kimi Linear achieves ∼<strong>1.16× computational efficiency</strong> compared to the MLA baselines with compute-optimal training."

<strong>What this means:</strong> To achieve the same model quality, Kimi Linear requires 1.16× less compute than MLA baselines.

<strong>Critical analysis:</strong>
- This is a training efficiency metric, not inference efficiency
- The 1.16× improvement is modest — within noise for most practical purposes
- Compute-optimal training involves many hyperparameters; the fair comparison is unclear
- <strong>This metric is not what inference engineers should care about</strong>

### 3.4 Summary of Efficiency Claims

| Claim | Value | Baseline | Relevance |
|-------|-------|----------|-----------|
| Decoding speedup @1M | 2× | Full attention | Modest — baseline already degraded |
| Decoding throughput @1M | 6× | Full attention (BS=1) | Good but not production-realistic |
| Compute efficiency | 1.16× | MLA (training) | Low — training metric, not inference |

> <strong>Bottom line:</strong> Kimi3's efficiency claims are real but measured against weak baselines. The absence of DSA comparisons makes it impossible to assess relative merit.

---

## 4. Deployment Reality: Actual Sequence Lengths

### 4.1 Advertised vs Actual

| Model | Advertised | Actual Deployment | Notes |
|-------|-----------|-------------------|-------|
| DeepSeek V4 | 1M | Unknown | System-level data published |
| GLM52 | 1M | Unknown | — |
| LongCat 2.0 | 1M | <strong>600K+</strong> (实测可推高) | Can push higher |
| Kimi3 | 1M | Unknown | Not yet widely deployed |

> <strong>Note:</strong> The "200K wall" previously observed may be a client-side constraint (Claude Code's context window) rather than a model limitation. <strong>Actual reasons need further verification.</strong> LongCat 2.0 has been tested to push beyond 600K and can go higher.

### 4.2 System-Level Constraints (Speculative)

Even if the model supports 1M, the system stack may impose constraints <strong>that need verification</strong>:

## 1. **Client-side context window:** Claude Code may limit input

## 2. **Memory bandwidth:** At 1M tokens, reading recurrent state may saturate HBM bandwidth

## 3. **Latency:** Linear attention's recurrent state processing adds sequential latency

## 4. **Cost:** Storage cost scales linearly — at 1M tokens, $0.28/session for Kimi3


> <strong>Reality check:</strong> The gap between "supports 1M" and "usefully deploys at 1M" is vast. DeepSeek is the only vendor that has publicly demonstrated system-level scalability data.

---

## 5. The Cost of Memory: Why Architecture Choice Matters

### 5.1 The Agent Economy Is a Memory Economy

In multi-turn Agent scenarios:

| Metric | Value |
|--------|-------|
| Cache hit tokens | 480.4M (our measurement) |
| Compute tokens | 11.3M |
| Storage:Compute ratio | <strong>42.7:1</strong> |
| Cost share (Kimi) | <strong>78% storage</strong> |
| Cost share (DeepSeek) | 21% storage |

> At million-token scale, <strong>you're buying memory, not compute</strong>. The architecture that stores KV-Cache most efficiently wins.

### 5.2 DSA's Cross-Media Advantage

The memory hierarchy for million-token KV-Cache:

| Tier | Capacity | Bandwidth | Cost/GB | Architecture Fit |
|------|----------|-----------|---------|-----------------|
| <strong>HBM</strong> | 80-128GB | 3-5 TB/s | $$$ | Hot cache (recent tokens) |
| <strong>CXL/DRAM</strong> | 1-4 TB | 100-200 GB/s | $$ | Warm cache (recent context) |
| <strong>SSD/NVMe</strong> | 10+ TB | 5-15 GB/s | $ | Cold cache (historical context) |

<strong>DSA's advantage:</strong> Sparse indexing naturally maps to this hierarchy:
- Index resides in HBM (small, fast)
- Selected tokens fetched from DRAM/SSD on demand
- <strong>Random access patterns are tolerable</strong> with modern memory semantics

<strong>Linear attention's problem:</strong> Full-attention layers require <strong>all tokens in HBM simultaneously</strong>:
- No natural tiering — every token must be accessible
- Cross-media coordination requires massive bandwidth
- Latency-sensitive scenarios (real-time chat) are especially challenging
- <strong>Without DSA's sparse indexing</strong>, offloading attention computation to DDR/SSD is nearly impossible (MLA alone has minimal offloading capability)

### 5.3 The Full-Attention Bottleneck

Kimi3's 3:1 KDA:MLA ratio means 25% of layers use MLA (compressed full attention). At 1M tokens:

| Layer Type | Time Complexity | Why |
|-----------|----------------|-----|
| KDA (linear, 75% of layers) | O(L) total | Fixed-size recurrent state; O(1) per token |
| MLA (compressed, 25% of layers) | <strong>O(L²)</strong> | Same as standard attention; compression reduces dimension but not asymptotic complexity |

> <strong>Key insight:</strong> MLA's 32× compression reduces the constant factor, but <strong>time complexity remains O(L²)</strong>, identical to standard attention. This is the <strong>fundamental ceiling</strong> of hybrid linear architectures — compression cannot change asymptotic complexity.

---

## 6. The Road Ahead: Convergence or Divergence?

### 6.1 Kimi3's Own Prediction

From the Kimi3 paper's future work section:

> "Future work could explore <strong>hybrid models</strong> that integrate the strengths of both, leveraging the compression and generalization capabilities of linear attention with the fine-grained retrieval advantages of sparse attention."

This is a remarkable admission — the linear attention camp acknowledges that pure linear is not enough.

### 6.2 The Convergence Thesis

The industry is converging on a hybrid approach:

| Layer Type | Function | Scaling |
|-----------|----------|---------|
| <strong>DSA (Sparse)</strong> | Long-range retrieval | Sparse index (optimization focus) |
| <strong>MLA (Compressed)</strong> | Mid-range attention | Compressed (latent attention) |
| <strong>Linear (KDA)</strong> | Local processing | O(1) per token — recurrent state |

This hybrid combines:
- DSA's cross-media coordination capability
- MLA's compression efficiency
- Linear attention's local processing speed

### 6.3 Why DeepSeek Is Still Ahead

DeepSeek remains the only vendor that has demonstrated:

## 1. **System-level scalability data** — not just model claims

## 2. **Real-world deployment** at scale

## 3. **DSA + MLA + MTP integration** — all three innovations working together

## 4. **Industry adoption** — competitors are adopting DSA principles


> <strong>Bottom line:</strong> The architecture war is not over, but DSA has a higher ceiling. Linear attention (Kimi3) is impressive but faces fundamental limits at extreme scales. The future likely belongs to hybrid architectures that combine DSA's sparse indexing with linear attention's efficiency — and DeepSeek is best positioned to deliver this.

---

## 7. What's Next

In [Part 2](https://backyes.github.io/posts/kimi3-cost-efficiency.html), we quantify Kimi3's actual cost-efficiency:
- Deconstructing the 2×/6×/1.16× efficiency claims
- Building a cost model for million-token scaling
- The scaling ceiling: when does linear attention hit the wall?
- Kimi3 paper's own Discussion quote on hybrid future

---

*Based on Kimi Linear paper, DeepSeek V4 technical report, and real-world deployment data. All calculations reproducible — see data tables above.*

---

原文链接: https://backyes.github.io/posts/kimi3-architecture-analysis.html
