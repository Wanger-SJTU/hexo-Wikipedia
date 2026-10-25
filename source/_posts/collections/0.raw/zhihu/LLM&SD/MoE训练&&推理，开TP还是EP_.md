---
title: MoE训练&&推理，开TP还是EP?
date: "2026-04-12 00:00:00"
updated: "2026-04-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/MoE训练-推理,开TP还是EP_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2026763517529695535
---


### 摘要

在MoE(Mixture-of-Experts)模型的大规模训练和推理过程中，Feed-Forward Network（FFN）层（即专家层）是参数量和计算量的主要来源。为了在多GPU集群上高效并行化专家计算，通常采用TP（张量并行）或者EP（专家并行）两种策略。本文从通信、计算、显存占用三个角度分析EP和TP的优劣，为实际选择提供理论基础。

### TP与EP的基本工作原理

#### Tensor Parallelism (TP)

- 对每个 expert 内部的权重矩阵沿 hidden dimension 进行切分。假设并行度为 n" role="presentation">n  n  ，每个 GPU 持有所有 experts 的 1/n" role="presentation">1/n  1/n   部分权重。
- 优点：每个 expert 的计算在所有 GPU 上同步进行，负载`**天然均衡**`。
- 缺点：每个 GPU 只能做部分矩阵乘法（小 GEMM），且需要频繁的 AllReduce(RING AllReduce通过Reduce-Scatter+All-Gather实现）通过同步激活值。

#### Expert Parallelism (EP)

- 按照expert维度进行切分，把不同的 experts 完整分配到不同 GPU 上（每个 GPU 持有 E/n" role="presentation">E/n  E/n   个完整 experts，其中 E" role="presentation">E  E   为专家总数）。 每个 token 通过 router 选择 top-k 个 experts 后，被 dispatch 到对应 GPU 上完成完整计算，再 combine 回来。 
- 优点：每个 GPU 上进行完整的大 GEMM，计算效率高；利用 MoE 的稀疏激活特性，**通信量与 k" role="presentation">k  k   强相关。 **
- 缺点：需要 All-to-All 通信进行 token 路由，**负载均衡依赖 router 设计**。

### 通信量对比：EP 在 top-k 较小时显著占优

通信是 MoE 执行的最大瓶颈。假设 batch 相关 token 数量为 b" role="presentation">b  b  ，序列长度为 s" role="presentation">s  s  ，hidden dimension 为 h" role="presentation">h  h  ，并行度为 n" role="presentation">n  n  ，激活数据规模记为 bsh" role="presentation">bsh  b s h  。则TP和EP的单卡通信量如下（参考OSDI2024  字节跳动Seed团队发表文章**MegaScale-MoE: Large-Scale Communication-Efficient Training of Mixture-of-Experts Models in Production**）：

TP 的通信量：

$$2 \, b s h \, \frac{(n-1)}{n}$$

 EP 的通信量（注：EP通信量不好定性分析，与每张卡上的专家数量M有关，M越大，EP通信量越少，M约小EP通信量越大。这里先确定EP通信量的上下界，假定每个GPU上只有一个专家，确定EP通信量的上界，假定每个GPU拥有所有专家，确定EP通信量的下界为0，退化为DP），这里给出EP单卡通信量的上界为（**这也是论文里面写到的，但是论文没强调条件，如果每张卡上的专家不为1，下面公式就可能不对**）：

$$2 \frac{k}{n} \times b s h \, \frac{(n-1)}{n}$$

**

解释：**

- **TP的通信量**

- TP需要调用AllReduce，如果采用Ring AllReduce实现AllReduce的方式，用Reduce-Scatter和Allgather实现AllReduce，Reduce-Scatter和Allgather通信量相同，均为 bsh(n-1)/n *，故平均单卡通信量为* 2bsh(n-1)/n 
- 为什么要除以n? TP切分后，每张卡只处理 totalsize/n 份数据
- 为什么要乘以 n-1 ?不管Reduce-Scatter还是Allgather，环上每块需要传递 n-1 次

- **EP的通信量**

- **All2All通过dispatch和combine完成，dispathe和combine通信量一致**
- **每张卡初始本地token数 =**   {bsh}  
$$- **每张卡需要发送的token-expert assignment总数=**  \frac{kbsh}{n}   $$
- **token-expert assignment 发送到本地的概率=** {1/n} 
- **token-expert assignment 发送到别的卡的概率(跨卡通信的概率) = **{1-1/n} 
$$- **dispatch or combine总体通信量= **\frac{k}{n} \times b s h \, \frac{(n-1)}{n} $$
$$- **总体通信量为=** 2 \frac{k}{n} \times b s h \, \frac{(n-1)}{n} $$

- **EP通信量的验证：**

- n=1时，退化成DP，通信量 = 0，正确（全本地）。
- n很大时，通信量(只考虑dispatch 或combine，下同) ≈   \frac{kbsh}{n}  ，接近每卡处理的全部token都需要通信（本地概率极低）
$$- k=1时，通信量 ≈    \dfrac{bsh (n-1)}{n^{2}}  ，即单卡发送约   \frac{bsh}{n} \times \frac{n-1}{n}   个token。$$
$$- k很大，趋近于n时，公式仍成立，通信量 ≈    {bsh} \times \frac{n-1}{n}   $$

所以TP和EP的关键差异在于   k/n   因子：

- TP 的通信量与 top-k 无关，每次都要在   n   个 GPU 间全量同步激活（All-Reduce 性质。
- EP 的通信量正比于   k/n  ，因为每个 token 只激活   k   个 experts，而 experts 均匀分布在   n   个 GPU 上。平均每个 GPU 仅需接收全局   k/n   比例的激活数据（其余在本地处理）
- 由此我们知道，EP与TP的通信量之比上界为   k/n   ，也就是说当kn时，EP的通信量是不是就比TP大呢？那在推理场景下，假设topk选取8，此时我用4卡做推理，是不是意味着一定要用TP呢？那为什么在推理场景经常可以看到k>n时，仍然采用EP且EP的性能比TP更好呢？

其实不然，因为以上我们的推论都是基于一个条件，即每张卡上只有一个专家，在实际情况，假如k>n，一张卡上的专家数量一定大于1，也就是说，一张GPU上有多个专家，此时如果同一token的选中的多个专家落在同一卡上，此时这个token只需要被传一次就行了，不需要多次传输，比如假定GPU0上有专家1和专家2，假定GPU1上的token t1选择的专家是专家1和专家2，那么只需要把t1发送到GPU0上即可，只需要传输一次即可完成，不需要传输两次，因此，我们上面讨论时通信量上界，而实际场景中，EP的通信量要小于该值。

### 计算量（GEMM 效率）对比：EP 保持完整大矩阵

TP 将每个 expert 的 hidden dimension 切分，导致每个 GPU 上的矩阵乘法规模缩小为   (h/n)  ，GEMM kernel 利用率大幅下降（GPU 对大矩阵更友好）。 EP 则让每个 expert 的完整权重和激活都在同一 GPU 上完成：

矩阵规模保持   b' \times h \to h \times h  （  b'   为路由到该 expert 的 token 数），充分利用 Tensor Core。 实测中，EP 的 GEMM 吞吐量显著高于 TP，尤其在 expert 数量多、hidden dim 大的 MoE 模型中。

### 显存使用对比

TP：每个 GPU 仍需存储所有 experts 的 1/n 部分权重，总体负载比较均衡。

EP：在负载不均衡的情况下，某个 rank 上分配的 token 可能过多，导致显存使用激增，甚至出现 OOM。因此在长文本训练中，如果 EP 出现显存溢出，可以考虑使用 TP。

因此从显存角度看，TP 具有更大优势，它的显存占用更少且更稳定。

### EP和TP对比总结

- **通信量**：TP 通信固定且与topk的大小无关；EP的通信量与topk和每张卡上的专家数有关，EP的通信量也与EP的工程实践密切相关，一般而言，在 topk < n，也就是topk < parallel size 的情况下，EP 比 TP 的通信量更小，此时EP更占优。
- **计算效率**：TP 牺牲 GEMM 性能；EP 充分利用 GPU 计算能力，实际 FLOPs 利用率更高
- **显存使用**：TP总体显存使用量比较均匀，负载比较均衡。但EP会存在负载不均的问题，很可能出现某个rank上显存OOM进而导致整个程序崩溃的问题。
