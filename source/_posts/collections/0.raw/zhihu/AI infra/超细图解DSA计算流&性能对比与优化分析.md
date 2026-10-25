---
title: 超细图解DSA计算流&性能对比与优化分析
date: "2025-10-27 00:00:00"
updated: "2025-10-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/超细图解DSA计算流-性能对比与优化分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1963371483985319543
---


DSA(DeepSeek Sparse Attention)的计算在Prefill、Decode阶段存在差异，本文结合MLA模块绘制了一版DSA的计算流图，同时根据该结构还分析了DSA计算性能情况，包括如下问题：

- <strong>DSA对比MLA算力相差多少，Indexer占比有多大？</strong>
- <strong>存储/访存的变化如何？</strong>
- <strong>DSA的KV cache保存如何变化？</strong>
- <strong>DSA有何不足之处？推理性能如何优化？</strong>
<strong>1 整体计算流图</strong>
<strong>MQA模式</strong>

![](https://picx.zhimg.com/v2-8b31070dabb1ffc1a3e8c94e571c1841_r.jpg)Decode数据为例高清图地址：https://github.com/CalvinXKY/InfraTech/tree/main/models/deepseek_v3_2<strong>MHA模式</strong>

![](https://picx.zhimg.com/v2-97d73d610d0f3ac720b9fe8cc093b4ad_r.jpg)Prefill数据为例高清图地址：https://github.com/CalvinXKY/InfraTech/tree/main/models/deepseek_v3_2
- 符号含义：<strong>直角长方</strong>形表示计算或者操作；<strong>圆角长方形</strong>表示数据<strong>T(Tensor)</strong>。有矩阵乘的位置标记了<strong>W(Weight)</strong>，满足<strong>Tensor_n = T x W</strong>
- 注意：图中几处输入的投影计算能够合并，这里分开是为了更清晰的区分。比如MLA的下QKV的下采样可以合并、MLA的Q上采样可与Indexer的Q采样合并。在DeepSeek-V3.2-Exp的技术报告中提到<strong>DSA是基于MQA版MLA的改进</strong>。对于模式的选择问题，prefill在Top-K内用MHA模式、超过Top-K后用MQA模式，decode用MQA模式。DSA[官方示例](https://link.zhihu.com/?target=https%3A//huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp/blob/main/inference/model.py)中prefill采用的MHA模式。考虑到算力特点的介绍，文中prefill用MHA版本、decode用MQA版本。

DSA的原理可参看：

[用注意力知识分析DSA(DeepSeek Sparse Attention)的设计逻辑](https://zhuanlan.zhihu.com/p/1962162900111172920)
2 DSA计算流细节

2.1 Lightning Indexer
DSA在MLA(Multi-Head Latent Attention)的基础上多了下图中红色框的模块（后面简称为Indexer），

![](https://pica.zhimg.com/v2-73d1f09795ee5ffef2ccb4029b2471be_r.jpg)使用DeepSeekV3.2 671B配置的参数：

```text
{
    "vocab_size": 129280,
    "dim": 7168,
    "inter_dim": 18432,
    "moe_inter_dim": 2048,
    "n_layers": 61,
    "n_dense_layers": 3,
    "n_heads": 128,
    "n_routed_experts": 256,
    "n_shared_experts": 1,
    "n_activated_experts": 8,
    "n_expert_groups": 8,
    "n_limited_groups": 4,
    "route_scale": 2.5,
    "score_func": "sigmoid",
    "q_lora_rank": 1536,
    "kv_lora_rank": 512,
    "qk_nope_head_dim": 128,
    "qk_rope_head_dim": 64,
    "v_head_dim": 128,
    "dtype": "fp8",
    "scale_fmt": "ue8m0",
    "index_n_heads": 64,
    "index_head_dim": 128,
    "index_topk": 2048
}
```

其中Indexer模块相关的参数：index_n_heads、index_head_dim、index_topk。以Prefill模式为例(序列长度为4096)，把Indexer加入细节后如下：

![](https://pic1.zhimg.com/v2-26c45155749feb57795e7a40f87d1ca0_r.jpg)
- Indexer从左到右主要的三条计算通道分别是w、q、k;
- q和k需要计算RoPE，采用采样后拆分单独计算pe后再cat构成整体的q和k;
- q、k需要量化处理到FP8，量化值用于计算相关性logits值，由FP8 -> FP32；
- k需要做缓存处理，保存量化值和量化比例(scale)；
- q的量化scale会先与w进行乘法运算得到q_s, q_s与ReLU的结果相乘；
- k的量化scale与Sum相乘；
- 每个token会有一个topk值，topk默认取2048。当小于该值时，序列全部保留，Indexer模块的计算可以直接绕过。Decode阶段的Indexer处理流的区别是seq_len=1；k cache的处理方式也不一样，需要从结合历史数据，假设长度为4095，细化后如下所示：

![](https://picx.zhimg.com/v2-c4ae4653c1663b2d3791a099c0d93b4b_r.jpg)在Indexer最后选取的Topk会用于MLA部分的select计算，这就是DSA中提到的Top-k Selector模块。

2.2 MLA部分
DSA的MLA部分与之前基本保持一致，主要的差异点是在KV通道上引入了一个选择操作，该操作对输入到MHA/MQA的序列tokens进行处理，选择Indexer算出来的topk个值。

Prefill阶段，select的位置需要结合attention运算：

![](https://pic3.zhimg.com/v2-821d5c2f9ac7c5630952663b3d11c796_r.jpg)Prefill阶段Q的序列长度>1。当序列长度较长时，KV所有tokens都机会被选中，所以Attention计算时，所有的tokens的KV cache都有概率被访问。

![](https://pica.zhimg.com/v2-c345487744d3f9927061a497f3a602d4_r.jpg)不同q选中的k位置不一样KV cache稀疏的实现：

方式1：选择数据加载。若Prefill采用MHA模式，对于每个q token进行QK运算时，需要分头计算。在运算时需要拆解成Q=[1, head_dim]，K=[top-k, head_dim]的AxB矩阵运算，每个头的运算依然独立。如果采用MQA模式，K的head=1，拆解成Q=[heads, 1, head_dim]，K=[top-k, head_dim]的矩阵运算。

![](https://pic1.zhimg.com/v2-26e7dd276394b19117ce09a58d549266_r.jpg)MHA模式注意:两种模式下Attention算子的效率存在差异，若是NV的GPU需要考虑GEMM算子tile的矩阵维度MKN对计算核（Tensor core）的影响，长序列下可能GQA更优（见评论）。

方式2：通过Mask修改scores，这种方式比较容易实现，但不会节约计算量，不做展开。

<strong>Decode阶段</strong>：MLA部分的变化主要是，在KV cache拼接后选择topk个序列进入MQA运算，由于seq_len=1，其它参数不变，所以Decode状态下，当序列长度超过topk设定长度时，<strong>MLA部分的计算量不会再增加！</strong>

![](https://pic3.zhimg.com/v2-5a8c36675a510ac5cfd81062c57a0dd8_r.jpg)
3 性能对比分析&优化

3.1 计算量变化
DSA相比MLA的主要计算差异点：

a> 矩阵乘法KV_scores、PV计算复杂度从 
![](https://www.zhihu.com/equation?tex=O%28L%5E%7B2%7D%29) 到 
![](https://www.zhihu.com/equation?tex=O%28Lk%29) ，其中L是序列长度，k是topk长度。这个两个乘法的flops计算式：

```text
kv_scores = 2 * bs * heads * seq_len * (seq_len + cache_len) * (qk_head_dim + qk_rope_head_dim) / causal_mask_cof
qkv = 2 * bs * heads * seq_len * (seq_len + cache_len) * v_head_dim / causal_mask_cof
```

其中(seq_len + cache_len)表示序列总长度，cache_len是指缓存序列长度。将该项换成top_k，得到DSA中对应的算式为：

```text
kv_scores = 2 * bs * heads * seq_len * top_k * (qk_head_dim + qk_rope_head_dim) / causal_mask_cof
qkv = 2 * bs * heads * seq_len * top_k * v_head_dim / causal_mask_cof
```

b> 增加Indexer计算模块。忽略一次项计算（比例/加法/量化），主要考虑几个线性映射计算、logits矩阵乘法求解,flops计算式如下：

# 线性投影flops：

```text
q_linear = 2 * bs * seq_len * q_lora_rank * index_n_heads * index_head_dim
k_linear = 2 * bs * seq_len * h_dim * index_head_dim
w_linear = 2 * bs * seq_len * h_dim * index_n_heads
context_len = seq_len + cache_len
```

# FP8 logits flops：
logits = 1 * bs * index_n_heads * seq_len * context_len * index_head_dim / causal_mask_cof
prefill阶段cache_len为常数，linear(q_linear 、k_linear 、w_linear)与seq_len成线性关系，复杂度
![](https://www.zhihu.com/equation?tex=O%28L%29)。logits计算与seq_len平方相关，复杂度 
![](https://www.zhihu.com/equation?tex=O%28L%5E%7B2%7D%29) 。对比算量与序列关系，图中横坐标是序列总长度(sequence length或者context length)等于seq_len + cache_len长度。当序列超过~6.2k时，logits运算量占主导。

![](https://pic2.zhimg.com/v2-7c6e3b3dad2e5a8ef87e2a965689ac63_r.jpg)decode阶段seq_len=1，linear计算量恒定，logits计算与cache_len线性相关，复杂度
![](https://www.zhihu.com/equation?tex=O%28L%29)。

![](https://picx.zhimg.com/v2-2b0c6e18abda942115a4220f299693b3_r.jpg)结合MLA的公式可以计算出整体的flops的差异：

<strong>Prefill阶段：</strong>DSA模块（MLA部分+Indexer部分）与未稀疏的MLA计算量对比如下，随着序列的长度增加，DSA的算量成倍下降。

![](https://pica.zhimg.com/v2-eaf0294cac437b1cf823fdec92c6d894_r.jpg)进一步，可以拿Indexer计算量与DSA模块（MLA部分+Indexer部分）计算量做个对比。下图中序列长度内，Prefill阶段的Indexer计算量占比不超过20%。

![](https://picx.zhimg.com/v2-f7f2a1232e0811742cc9a08c8a76cbf9_r.jpg)<strong>Decode阶段</strong>：DSA模块（MLA部分+Indexer部分）与未稀疏的MLA计算量对比如下，随着序列的长度增加，DSA基本维持不变，而MLA线性增加。

![](https://pica.zhimg.com/v2-37f9555684859aa4a58e53132bda195c_r.jpg)Decode的Indexer计算量占比也不高，但序列超过Topk时，MLA部分算力需求保持恒定，其flops的增长来自Indexer的计算。

![](https://pic2.zhimg.com/v2-5fd4339c15f8d9d681cbba33d08287a1_r.jpg)
<strong>3.2  显存变化</strong>
从DSA的结构图，显存用量的变化一方面是静态显存和激活值的变化，另一方面是KV cache的变化。

<strong>3.2.1 静态显存与激活值</strong>

MLA部分，静态存储不变，MHA/MQA attention的KV的输入激活值变为之前的topk/seq_len倍；

Indexer部分：静态存储增加线性层权重w、q、k，按照默认参数配置，大小为(FP16)：

![](https://www.zhihu.com/equation?tex=Mem+%3D+2+%2A+%287168%2A64+%2B+1536%2A64%2A128+%2B+7168%2A128%29%2F%281024%2A1024%29+M) 

大小约为26.6MB，而激活值主要关注prefill阶段的峰值位置：

-  激活值logits大小与seq_len^2 相关，FP32或者FP16格式；
-  top-k计算：输入值是mask、index_scores大小与seq_len^2 相关；输出topk_indices大小与 seq_len* top_k相关。
![](https://picx.zhimg.com/v2-53517368b657a037072e2b77a21edd31_r.jpg)当输入序列值比较大时，这些值都不容忽视，取极端长度128K分析，FP32格式数据：

![](https://www.zhihu.com/equation?tex=Mem_%7Blogits%7D+%3D+4+%2A+64+%2A+128%2A1000+%2A+128+%2A+1000+%2F+%281024%2A1024%2A1024%29+GB) 

大小达到了<strong>3906.25GB</strong>，若用<strong>FP8</strong>格式大小降低到1/4变为约976.6GB(<strong>很显然一张显卡放不下！</strong>)。

indexer score是求和后的结果，按照量化后为<strong>FP16</strong>格式计算：

![](https://www.zhihu.com/equation?tex=Mem_%7Bindex+scores%7D+%3D+2+%2A+128%2A1000+%2A+128+%2A+1000+%2F+%281024%2A1024%2A1024%29+GB) 

计算得大小为30.51GB。虽然prefill输入序列长度很少取到128K，但<strong>超长序列情况下</strong>，Indexer激活值需要的存储空间大，影响<strong>不容忽视</strong>！

<strong>3.2.2 KV cache</strong>

- MLA部分：保持不变。
- Indexer部分：增加k_cache和k_scale保存；KV cache访存：数据量变为之前的topk/seq_len倍；当过了topk拐点后访存大小维持恒定（Decode阶段），所以<strong>访存不再是MLA-Decode的瓶颈；</strong>但KV cache存储空间依然保持线性增长，这点与MLA一致。

3.3 推理性能优化思路(浅谈)
通常情况下，MLA的Prefill阶段的状态是算力受限(compute bound)，Decode是存储受限(memory bound)。<strong>变为DSA后算力和访存问题得到改善，但存储空间问题恶化</strong>。如果采用DSA，这里提几个推理相关的优化思路：

<strong>算力方面</strong>：DSA算力需求相比之前的MLA有大幅下降，Prefill算力依然保持近似线性增长，Decode变化不大。算力优化主要关注Prefill。

![](https://pic2.zhimg.com/v2-704d86ed7cb053a5491a6b153fb03b65_r.jpg)计算优化关注的位置：

-  将MLA的QKV下采样与Indexer的wk的采样计算进行合并，用一个Linear操作；
- 没有开TP情况下，Q的下采样与Indexer的q采样合并，用一个Linear操作；
- MLA的Select操作结合attention运算进行优化；
- 分布式推理中，Indexer的logits运算采用TP并行(head维度)，后面的sum运算替换成集合通信reduce。
- qk的量化操作与logits操作合并，减少算子下发次数；
- Indexer本身的计算量不应该占比超过总体的20%，若超过太多则需要考虑<strong>放弃使用</strong>，否则得不偿失。
- topk的功能设置开关，当序列长度小于topk时，保持原有MLA的逻辑，<strong>直接去掉Indexer运算</strong>。<strong>显存方面</strong>：主要关注超长序列情况，显存考虑的优化点：

- logits运算按照head分开，即开启TP；
- index score存储格式选用FP8，或者FP16；
- 考虑不采用mask传入的方式，因为会构造一个同大小的临时变量；
- top-k的排序运算采用原地操作。如果有SP采用分散数据的排序，避免gather所有数据的排序。
- 若采用分布式推理，因Indexer无序列维度的耦合运算，对整体开启SP；
- 当超长序列场景下引入额外显存太多时，考虑<strong>设置开关</strong>切回普通的MLA模式。
![](https://picx.zhimg.com/v2-53e85bce559405281b5f442ae0e836b7_r.jpg)Indexer显存优化的位置点
<strong>附1：对推理部署影响</strong>
<strong>KV cache的管理</strong>

对于推理框架而言KV cache的管理在逻辑层基本上可以保持一致，新增加的Indexer的cache与MLA的KV cache从tokens维度保持一致；主要是物理层空间的处理，需要增加一个额外存储空间。主要考虑修改位置：<strong>KV cache物理显存开辟</strong>、<strong>prefix cache</strong>、<strong>PD分离时KV cache的传递</strong>。

在vLLM当前的解决方案：对于Indexer的K cache开启单独的一个空间存储，所占的block与MLA的block一一对应。

![](https://pic4.zhimg.com/v2-f8fbffaf046496651d34ce0a27c0e193_r.jpg)FP8的存储方式，GPU中以64block size为单位存储（64个tokens为一个block）；K cache与其scale值分开存储，规则：

# 数据存储：
x_fp8[ :, : block_size * head_dim] = x_scaled.view(num_blocks, block_size * head_dim).view(dtype=torch.uint8) 
# 接着是scale存储
x_fp8[ :, block_size * head_dim :] = scales.view(num_blocks, block_size).view(dtype=torch.uint8)
<strong>新增Indexer相关算子：</strong>

# logits计算kernel
logits = deep_gemm.fp8_mqa_logits(q_fp8, kv_fp8, weights, ks, ke)
query序列长度为：q_seq_len； 序列总长度为：c_seq_len,

其中ks，ke表示序列计算的开始（start）和结束（end），当有n个请求处理时：

- q的尺寸：[q_seq_len_0+q_seq_len_1+..q_seq_len_n，head，head_dim]
- ks: [0] * q_seq_len_0 +  [q_seq_len_0 ] * q_seq_len_0 +..，其中“*”python操作，表示重复。
- ke：list(range(c_seq_len_0 - q_seq_len_0), c_seq_len_0  , 1) +...
附2：MLA+Indexer的简单版
# 地址： https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp/blob/main/inference/model.py

```python
class Indexer(torch.nn.Module):
    def __init__(self, args: ModelArgs):
        super().__init__()
        self.dim: int = args.dim
        self.n_heads: int = args.index_n_heads
        self.n_local_heads = args.index_n_heads // world_size
        self.head_dim: int = args.index_head_dim
        self.rope_head_dim: int = args.qk_rope_head_dim
        self.index_topk: int = args.index_topk
        self.q_lora_rank: int = args.q_lora_rank
        self.wq_b = Linear(self.q_lora_rank, self.n_heads * self.head_dim)
        self.wk = Linear(self.dim, self.head_dim)
        self.k_norm = LayerNorm(self.head_dim)
        self.weights_proj = Linear(self.dim, self.n_heads, dtype=torch.get_default_dtype())
        self.softmax_scale = self.head_dim ** -0.5
        self.scale_fmt = args.scale_fmt

        self.register_buffer("k_cache", torch.zeros(args.max_batch_size, args.max_seq_len, self.head_dim, dtype=torch.float8_e4m3fn), persistent=False)
        self.register_buffer("k_scale_cache", torch.zeros(args.max_batch_size, args.max_seq_len, self.head_dim // block_size, dtype=torch.float32), persistent=False)

    def forward(self, x: torch.Tensor, qr: torch.Tensor, start_pos: int, freqs_cis: torch.Tensor, mask: Optional[torch.Tensor]):
        bsz, seqlen, _ = x.size()
        end_pos = start_pos + seqlen
        q = self.wq_b(qr)
        q = rearrange(q, 'b s (h d) -> b s h d', d=self.head_dim)
        q_pe, q_nope = torch.split(q, [self.rope_head_dim, self.head_dim - self.rope_head_dim], dim=-1)
        q_pe = apply_rotary_emb(q_pe, freqs_cis)
        q = torch.cat([q_pe, q_nope], dim=-1)
        k = self.wk(x)
        k = self.k_norm(k)
        k_pe, k_nope = torch.split(k, [self.rope_head_dim, self.head_dim - self.rope_head_dim], dim=-1)
        k_pe = apply_rotary_emb(k_pe.unsqueeze(2), freqs_cis).squeeze(2)
        k = torch.cat([k_pe, k_nope], dim=-1)
        q = rotate_activation(q)
        k = rotate_activation(k)
        q_fp8, q_scale = act_quant(q, block_size, self.scale_fmt)
        k_fp8, k_scale = act_quant(k, block_size, self.scale_fmt)
        self.k_cache[:bsz, start_pos:end_pos] = k_fp8
        self.k_scale_cache[:bsz, start_pos:end_pos] = k_scale
        weights = self.weights_proj(x) * self.n_heads ** -0.5
        weights = weights.unsqueeze(-1) * q_scale * self.softmax_scale
        index_score = fp8_index(q_fp8.contiguous(), weights, self.k_cache[:bsz, :end_pos].contiguous(), self.k_scale_cache[:bsz, :end_pos].contiguous())
        if mask is not None:
            index_score += mask
        topk_indices = index_score.topk(min(self.index_topk, end_pos), dim=-1)[1]
        topk_indices_ = topk_indices.clone()
        dist.broadcast(topk_indices_, src=0)
        assert torch.all(topk_indices == topk_indices_), f"{topk_indices=} {topk_indices_=}"
        return topk_indices

class MLA(nn.Module):
    """
    Multi-Head Latent Attention (MLA) Layer.
    Attributes:
        dim (int): Dimensionality of the input features.
        n_heads (int): Number of attention heads.
        n_local_heads (int): Number of local attention heads for distributed systems.
        q_lora_rank (int): Rank for low-rank query projection.
        kv_lora_rank (int): Rank for low-rank key/value projection.
        qk_nope_head_dim (int): Dimensionality of non-positional query/key projections.
        qk_rope_head_dim (int): Dimensionality of rotary-positional query/key projections.
        qk_head_dim (int): Total dimensionality of query/key projections.
        v_head_dim (int): Dimensionality of value projections.
        softmax_scale (float): Scaling factor for softmax in attention computation.
    """
    def __init__(self, args: ModelArgs):
        super().__init__()
        self.dim = args.dim
        self.n_heads = args.n_heads
        self.n_local_heads = args.n_heads // world_size
        self.q_lora_rank = args.q_lora_rank
        self.kv_lora_rank = args.kv_lora_rank
        self.qk_nope_head_dim = args.qk_nope_head_dim
        self.qk_rope_head_dim = args.qk_rope_head_dim
        self.qk_head_dim = args.qk_nope_head_dim + args.qk_rope_head_dim
        self.v_head_dim = args.v_head_dim

        self.wq_a = Linear(self.dim, self.q_lora_rank)
        self.q_norm = RMSNorm(self.q_lora_rank)
        self.wq_b = ColumnParallelLinear(self.q_lora_rank, self.n_heads * self.qk_head_dim)
        self.wkv_a = Linear(self.dim, self.kv_lora_rank + self.qk_rope_head_dim)
        self.kv_norm = RMSNorm(self.kv_lora_rank)
        self.wkv_b = ColumnParallelLinear(self.kv_lora_rank, self.n_heads * (self.qk_nope_head_dim + self.v_head_dim))
        self.wo = RowParallelLinear(self.n_heads * self.v_head_dim, self.dim)
        self.softmax_scale = self.qk_head_dim ** -0.5
        if args.max_seq_len > args.original_seq_len:
            mscale = 0.1 * args.mscale * math.log(args.rope_factor) + 1.0
            self.softmax_scale = self.softmax_scale * mscale * mscale

        self.indexer = Indexer(args)

        self.register_buffer("kv_cache", torch.zeros(args.max_batch_size, args.max_seq_len, self.kv_lora_rank), persistent=False)
        self.register_buffer("pe_cache", torch.zeros(args.max_batch_size, args.max_seq_len, self.qk_rope_head_dim), persistent=False)
        self.dequant_wkv_b = None

    def forward(self, x: torch.Tensor, start_pos: int, freqs_cis: torch.Tensor, mask: Optional[torch.Tensor]):
        """
        Forward pass for the Multi-Head Latent Attention (MLA) Layer.
        Args:
            x (torch.Tensor): Input tensor of shape (batch_size, seq_len, dim).
            start_pos (int): Starting position in the sequence for caching.
            freqs_cis (torch.Tensor): Precomputed complex exponential values for rotary embeddings.
            mask (Optional[torch.Tensor]): Mask tensor to exclude certain positions from attention.
        Returns:
            torch.Tensor: Output tensor with the same shape as the input.
        """
        bsz, seqlen, _ = x.size()
        end_pos = start_pos + seqlen
        qr = self.q_norm(self.wq_a(x))
        q = self.wq_b(qr)
        q = q.view(bsz, seqlen, self.n_local_heads, self.qk_head_dim)
        q_nope, q_pe = torch.split(q, [self.qk_nope_head_dim, self.qk_rope_head_dim], dim=-1)
        q_pe = apply_rotary_emb(q_pe, freqs_cis)
        kv = self.wkv_a(x)
        kv, k_pe = torch.split(kv, [self.kv_lora_rank, self.qk_rope_head_dim], dim=-1)
        kv = self.kv_norm(kv)
        k_pe = apply_rotary_emb(k_pe.unsqueeze(2), freqs_cis)
        self.kv_cache[:bsz, start_pos:end_pos] = kv
        self.pe_cache[:bsz, start_pos:end_pos] = k_pe.squeeze(2)
        if mask is not None:    # MHA prefill
            q = torch.cat([q_nope, q_pe], dim=-1)
            kv = self.wkv_b(kv)
            kv = kv.view(bsz, seqlen, self.n_local_heads, self.qk_nope_head_dim + self.v_head_dim)
            k_nope, v = torch.split(kv, [self.qk_nope_head_dim, self.v_head_dim], dim=-1)
            k = torch.cat([k_nope, k_pe.expand(-1, -1, self.n_local_heads, -1)], dim=-1)
            scores = torch.einsum("bshd,bthd->bsht", q.float(), k.float()) * self.softmax_scale
```


            # indexer

```text
            topk_indices = self.indexer(x, qr, start_pos, freqs_cis, mask)
            index_mask = torch.full((bsz, seqlen, seqlen), float("-inf"), device=x.device).scatter_(-1, topk_indices, 0)
            index_mask += mask
            scores += index_mask.unsqueeze(2)

            scores = scores.softmax(dim=-1, dtype=torch.float32)
            x = torch.einsum("bsht,bthd->bshd", scores.type_as(x), v)
        else:                   # MHA decode
            if self.dequant_wkv_b is None and self.wkv_b.scale is not None:
                self.dequant_wkv_b = weight_dequant(self.wkv_b.weight, self.wkv_b.scale)
            wkv_b = self.wkv_b.weight if self.dequant_wkv_b is None else self.dequant_wkv_b
            wkv_b = wkv_b.view(self.n_local_heads, -1, self.kv_lora_rank)
            q_nope = torch.einsum("bshd,hdc->bshc", q_nope, wkv_b[:, :self.qk_nope_head_dim])
            scores = (torch.einsum("bshc,btc->bsht", q_nope.float(), self.kv_cache[:bsz, :end_pos].float()) +
                      torch.einsum("bshr,btr->bsht", q_pe.float(), self.pe_cache[:bsz, :end_pos].float())) * self.softmax_scale
```


            # indexer

```text
            topk_indices = self.indexer(x, qr, start_pos, freqs_cis, mask)
            index_mask = torch.full((bsz, 1, end_pos), float("-inf"), device=x.device).scatter_(-1, topk_indices, 0)
            scores += index_mask.unsqueeze(2)

            scores = scores.softmax(dim=-1, dtype=torch.float32)
            x = torch.einsum("bsht,btc->bshc", scores.type_as(x), self.kv_cache[:bsz, :end_pos])
            x = torch.einsum("bshc,hdc->bshd", x, wkv_b[:, -self.v_head_dim:])
        x = self.wo(x.flatten(2))
        return x
```

参考内容：

- [https://github.com/deepseek-ai/DeepSeek-V3.2-Exp/blob/main/DeepSeek_V3_2.pdf](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepSeek-V3.2-Exp/blob/main/DeepSeek_V3_2.pdf)
- [https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp/tree/main/inference](https://link.zhihu.com/?target=https%3A//huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp/tree/main/inference)
- [DeepSeek-V3.2-Exp in vLLM: Fine-Grained Sparse Attention in Action](https://link.zhihu.com/?target=https%3A//blog.vllm.ai/2025/09/29/deepseek-v3-2.html)<strong>文中不足/错误，请留言！</strong>[@kaiyuan](https://www.zhihu.com/people/da4e6b50eb50d6f120b604f6cf15b33e)<strong>，欢迎关注</strong>