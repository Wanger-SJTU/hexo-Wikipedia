---
title: "(2 条消息) [LLM 稀疏]Quest：动态选择关键 kv 加速 Decode"
date: "2025-07-29 00:00:00"
updated: "2025-07-29 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/[LLM-稀疏]Quest-动态选择关键-kv-加速-Decode/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1933253949143613737"
---


论文名：Quest: Query-Aware Sparsity for Efficient Long-Context LLM Inference

论文地址：[https://arxiv.org/abs/2406.10774](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.10774) 

github：[https://github.com/mit-han-lab/Quest](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/Quest) 

单从时间+ star 来看的话，llm+sparse 热度似乎还不如 Diffusion + sparse 啊，Radial 才开源没多久就 445 star 了。看了很多 Diffusion 中的稀疏注意力，也来学习一下 LLM 中的稀疏。

[](https://zhuanlan.zhihu.com/p/1926372534066061776)

[](https://zhuanlan.zhihu.com/p/1926021638207567139)

[](https://zhuanlan.zhihu.com/p/1930319106265035886)

Quest 这篇论文与streaming llm 以及之前 Diffusion 优化中列过的 Sparse VideoGen、[radial-attention](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/radial-attention) 稀疏加速、[smoothquant](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/smoothquant)、[svdquant](https://link.zhihu.com/?target=https%3A//github.com/nunchaku-tech/nunchaku) 量化加速，还有做自驾同学不会陌生的[bevfusion](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/bevfusion) ，都来自 [mit-han-lab](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5c3bde6c10e5.jpg)

> 看 github主页还发现有一篇 x-attention，也是做block sparse attention 的，还是同时兼容 llm 和 diffusion 视频生成...有点夸张哦。

### 背景

#### LLM 长文推理

随着多轮对话和长文档查询需求的增加，LLMs的最大上下文长度已从2K大幅增长到1M甚至更高，但处理长上下文请求带来了显著的挑战（推理速度随着序列长度的增长而显著下降）

LLM 在推理阶段，根据计算特性的不同，可以明确地分为 Prefill 和 Decode 两个阶段。一般情况下， Prefill 是 Compute-bound；Decode 阶段的query 的 seq_len 就是为 1 了，计算特性一般为 memory-bound。在这两个阶段应用稀疏的目的是有区别的：

- 在 Prefill 阶段使用稀疏注意力主要是为了降低计算量，和 Diffusion 视频生成的出发点一致。
- 在 Decode 阶段，使用稀疏注意力则可能包括多种目的，比如：

- 减少kv cache 存储的显存占用。
- 减少计算阶段的kv cache 加载量，加快Decode 速度。

#### 稀疏注意力

大量研究表明，在大型语言模型（LLM）的注意力机制中，只有一小部分“关键Token”在计算中起主导作用。这一发现给稀疏注意力优化提供了支撑：我们只需保留这些关键Token的键值对（Key-Value Pair），就可以在基本不影响模型准确性的前提下，显著降低推理的计算量和时间消耗。

与Diffusion模型中的处理方式相类似，LLM中的稀疏注意力也可以根据其选择关键Token的策略，分为静态选择和动态选择这两种模式，静态方法中最典型是 [Streaming LLM](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2309.17453)，使用 Window Attention + Attention Sink ，思路简单高效，且取得了相对不错的 效果。

> 和 Diffusion  视频生成相比，我个人认为 LLM 中 静态的稀疏 pattern 没那么好找，视频生成模型中的 3D Full Attention 可以观察出比较明显的时空特性。LLM 中虽然像streaming llm、x-attention等也展示了attention map 的分析， 不过我用 [Qwen2.5-Coder-32B-Instruct](https://link.zhihu.com/?target=https%3A//huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct)  和 [Llama-3.1-8B-Instruct](https://link.zhihu.com/?target=https%3A//huggingface.co/meta-llama/Llama-3.1-8B-Instruct) 实际简单试了一下，和 attention score 在不同数据集的随机性比 DiT 要强很多。
这大概也是 LLM 的稀疏方法热度的原因之一？

Quest 作者进行了 profiling 分析，如图3所示，除了模型的前两层，仅需要不到10%的token就可以达到相似的准确性。这表明对剩余的token执行注意力计算是不必要的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_267209c9e4ea.jpg)

Quest进一步观察到，token的关键性与当前 query 高度相关。例如图2 对于不同的 query，kv 的关键性是动态变化的，对于 “A is B. C is D. A is” 这个 case：

- 当模型被“D” query时，token “B”的注意力分数很低，表明它不关键。
- 然而，当被“is” query时，token “B”却获得了很高的注意力分数，因为它对于生成正确答案“B”是关键的。
这明确展示了 token 的关键性与当前查询 token 紧密相关。所以需要一种动态且高效的方法来确定KV缓存的哪些部分需要被关注。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2dd4c79129fe.jpg)

Quest 提出了一种查询感知的关键性估算算法，不会丢弃 KV 缓存，而是根据当前的查询动态地选择 KV 缓存中关键的部分来执行自注意力。

通过这种方式，Quest 能够保持接近全注意力模型的召回率，有效地处理长距离依赖任务，并显著优于其他基于历史信息或有限窗口的基线方法。因此，预先确定 token 的关键性是具有挑战性的，这促使 Quest 引入了查询感知的稀疏性方法。

#### Quest 稀疏方法

####  两阶段评估

Quest 算法的工作流程主要分为两个阶段：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5571f2f87339.jpg)

- 阶段 1：估计关键Page (Estimate Critical Pages)

- Quest 基于 PageAttention 开发，并以 Page为粒度来管理和选择 KV 缓存页面。
- 元数据复用：Quest 会追踪 KV 缓存页面中每个 Key Channel维度的最小值（mi）和最大值（Mi）作为元数据，以代表该 Page 上所有的 token 信息。
- 关键性估计： 

- 在推理过程中，Quest 结合当前的查询（Query）向量和这些元数据来估计每个页面的关键性。其核心思想是选择包含最高注意力权重的Page。
- Quest 通过计算一个近似的注意力分数来实现这一点：对于每个通道 i，它计算 Ui = max(Qimi, QiMi)，其中 Qi 是查询向量的第 i 个分量，mi 和 Mi 是对应 Key 向量通道的最小值和最大值。Ui 总是大于 Qi 与该页面中任何 Key 值 Ki 的乘积。
- 将所有 Ui 累加，即可得到该页面上所有 Key 向量的注意力权重上限**，以此作为页面关键性的估计值。

- 选择 Top-K Page：计算出所有页面的关键性分数后，Quest 会选择得分最高的 Top-K 个页面（ K 味预设超参，例如 128 或 256）来进行后续的近似自注意力计算。
- Quest 和 Oracle 的思路高度吻合。

伪代码如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_88c7fe0508ca.jpg)

- 阶段 2：执行稀疏注意力 (Compute Sparse Attention)

- 选择性加载：只有在阶段 1 中被选为 Top-K Page的 KV cache 才会被加载。
- Quest 会在这些被选中的页面上执行正常的自注意力计算。
- 访存开销从整个 KV  cache 减少到 仅top-k 的 budget + 元数据，Quest 能够大幅加速decode。
- 由于模型的前两层稀疏度较低（如图 3 所示，低于 10%），Quest 和所有基线方法都只在模型后期层应用稀疏化，以更好地保持模型准确性。这一选择与 KV 缓存选择算法本身是独立的。

Quest 的这一动态估计方法解决了传统 KV 缓存淘汰算法可能错误丢弃未来关键信息的问题，因为它不会丢弃 KV 缓存，而是根据当前的查询来动态识别并关注关键部分。这使得 Quest 在维持高准确率的同时，大幅减少了自注意力操作所需的内存加载和计算量。

#### 访存量分析

Quest 不再需要加载整个 KV 缓存，而是仅加载所需数据的一小部分，其显存读写分为以下部分：

- 在关键性估计阶段：Quest 会加载每个页面的最大值和最小值向量作为元数据。如果假设每个 Key 或 Value 向量是 M 字节，KV 缓存包含 L 个 token，每个页面包含 S 个 KV 对（页面大小），需要从显存(Global Memory)加载 2M * L Byte。
- 在执行稀疏自注意力阶段：Quest 只对 Top-K 个关键页面执行正常的自注意力计算。这部分需要从显存加载 2M * K * S Byte。
整个 KV 缓存的原始大小是 2M * L 字节。Quest 加载的总内存是元数据加载量与 Top-K 页面加载量之和。

即 Quest 加载的总 KV 缓存比例为 1/S + K * S/L。这个公式也可以表示为 1/Page Size + K/Page Num。例如，如果使用每页 16 个 KV 对，上下文长度为 64K token，并且选择了 Top 4K 个页面，Quest 将能够将内存加载量减少 8 倍。

另外，这种内存加载减少是普遍适用于所有模型的，并且与现有的量化机制兼容。

### 实验

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fb13dc9a203c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7cb704c2f2c1.jpg)

精度大幅优于其他稀疏方法，而且很多数据集比 Full 还好。

> 我记得CNN 的剪枝方法很多就可以做到在评测集效果更好，不过个人对 LLM 稀疏的实际用户体验持怀疑态度。而且 LongChat-v1.5-7b这个模型在 Qasper这些数据集 上 full 的精度本身就比较低了

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_30a061cf377c.jpg)

性能

- 如图 8a 所示，随着序列长度的增加，关键性估计的相对延迟降低至 FlashInfer 的 1/Page Size。
- 如图 8b 所示，在给定的 token budget 下，其延迟是基本恒定的，与总序列长度无关，在 budget 未满的情况下，和 Flashinfer kernel 的 latency 曲线基本重合（说明 append kv + metadata 的实现没有引入太多性能开销）。
- 如图 9 所示，关键性估计+ top-k 选择的 kernel 耗时占比比较小
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_39458bf36d23.jpg)

作者还列了一个在相同精度约束下的耗时对比：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2c9c6fe1fe02.jpg)

### 代码实现

作者的开源实现中，精度测试和速度测试是两套代码...我感觉稍显抽象，而且和 InfiniteHiP 一样，都是自己实现了一个简易的 KV Cache 结构。

> 说明把稀疏注意力适配到 SGLang 或者 vllm 这些框架的成本，比自己写一套单独的 kv 管理还高？

#### pred(精度测试)

```python
def old_llama_decoder_layer_forward(
    self,
    hidden_states: torch.Tensor,
    attention_mask: Optional[torch.Tensor] = None,
    position_ids: Optional[torch.LongTensor] = None,
    past_key_value: Optional[Tuple[torch.Tensor]] = None,
    output_attentions: Optional[bool] = False,
    use_cache: Optional[bool] = False,
    padding_mask: Optional[torch.LongTensor] = None,
```

) -> Tuple[torch.FloatTensor, Optional[Tuple[torch.FloatTensor, torch.FloatTensor]]]:

```text
    residual = hidden_states

    hidden_states = self.input_layernorm(hidden_states)
```


    # Self Attention

```text
    hidden_states, self_attn_weights, present_key_value = self.self_attn(
        hidden_states=hidden_states,  # （1, 1, 4096）
        attention_mask=attention_mask,  # None
        position_ids=position_ids,
        past_key_value=past_key_value,   # k : [1, 32, 4007, 128]
        output_attentions=output_attentions,  #False
        use_cache=use_cache,         # True
        padding_mask=padding_mask,
    )
    hidden_states = residual + hidden_states
```


    # Fully Connected

```text
    residual = hidden_states
    hidden_states = self.post_attention_layernorm(hidden_states)
    hidden_states = self.mlp(hidden_states)
    hidden_states = residual + hidden_states

    outputs = (hidden_states,)
```


    if output_attentions:
        outputs += (self_attn_weights,)

    if use_cache:

```text
        outputs += (present_key_value,)

    return outputs
```


再下一层会调用：quest/evaluation/quest_attention.py

quest_attention

前两层的话，直接走 dense

if q_len > 1 or self.layer_id 

sparse 的计算逻辑如下：

## 1. qkv proj


```text
query_states = (
        self.q_proj(hidden_states)
        .view(bsz, q_len, self.num_heads, self.head_dim)
        .transpose(1, 2)
    )
    key_states = (
        self.k_proj(hidden_states)
        .view(bsz, q_len, self.num_key_value_heads, self.head_dim)
        .transpose(1, 2)
    )
    value_states = (
        self.v_proj(hidden_states)
        .view(bsz, q_len, self.num_key_value_heads, self.head_dim)
        .transpose(1, 2)
    )
```


## 2. 从 kv cache 获取 kv_seq_len


# 新缓存格式

```text
if isinstance(past_key_value, DynamicCache):
    kv_seq_len = past_key_value.get_seq_length()
```

# 旧缓存格式

```text
else:
    kv_seq_len = key_states.shape[-2]   # 1 
    if past_key_value is not None:
        assert isinstance(past_key_value, tuple)
        kv_seq_len += past_key_value[0].shape[-2]  #4008
```


## 3. rope


cos, sin = self.rotary_emb(value_states, position_ids.to(value_states.device))
query_states, key_states = apply_rotary_pos_emb(
    query_states, key_states, cos, sin, position_ids
)

## 4. 更新 kv cache


# New cache format

```sql
if isinstance(past_key_value, DynamicCache):
    if use_cache:
        key_states, value_states = past_key_value.update(key_states, value_states, layer_idx=self.layer_idx)
```

# Legacy cache format

```text
else:
    if past_key_value is not None:
        # reuse k, v, self_attention
        key_states = torch.cat([past_key_value[0], key_states], dim=2)
        value_states = torch.cat([past_key_value[1], value_states], dim=2)
    past_key_value = (key_states, value_states) if use_cache else None
```


## 5. GQA 适配


```text
key_states = repeat_kv(key_states, self.num_key_value_groups)
value_states = repeat_kv(value_states, self.num_key_value_groups)
```


## 6. 计算原始注意力权重


# query_states ([1, 32, 1, 128])
# key_states  ([1, 32, 4008, 128])

```text
attn_weights = torch.matmul(query_states, key_states.transpose(2, 3)) / math.sqrt(
    self.head_dim  # 128
)
```

# attn_weights [1, 32, 1, 4008]

## 7. 正负处理


```text
sign = (query_states > 0) + (~(query_states > 0)) * -1
max_key = key_states * sign  # [1, 32, 4008, 128]
postive_query = query_states * sign   #[1, 32, 1, 4008]
```


实现论文中的Ui = max(Qi*mi, Qi*Mi)：

- 当Qi > 0时，需要Ki的最大值
- 当Qi 

- 将序列长度填充到chunk_size的整数倍
- 填充值设为最小值，不影响max操作

## 9. 计算每个page 的最大值


```text
chunk_max_key = max_key.reshape(
    max_key.shape[0],
    max_key.shape[1],
    max_key.shape[2] // self.chunk_size,
    self.chunk_size,
    max_key.shape[3],
```

).amax(dim=-2)
# [1, 32, 251, 128]

## 10. 恢复chunk_max_key 的原始 shape


```text
chunk_max_key = chunk_max_key.unsqueeze(-2).repeat(1, 1, 1, self.chunk_size, 1)
chunk_max_key = chunk_max_key.reshape(
    chunk_max_key.shape[0], chunk_max_key.shape[1], -1, chunk_max_key.shape[-1]
```

)[:, :, :seq_length, :]
# [1, 32, 4008, 128]

- 将chunk最大值复制chunk_size次
- 恢复到原始序列形状
## 11. 计算query 和 max_key 的权重


```text
quantized_weight = torch.matmul(
    postive_query.float(),    # [1, 32, 1, 128]
    chunk_max_key.transpose(2, 3),    # [1, 32, 128, 4008]
)  
```

# (1, 32, 1, 4008)

## 12. 应用 mask (当前没有）


if attention_mask is not None:

```text
    attn_weights = attn_weights + attention_mask
    attn_weights = torch.max(
        attn_weights, torch.tensor(torch.finfo(attn_weights.dtype).min)
    )
    quantized_weight = quantized_weight + attention_mask
    quantized_weight = torch.max(
        quantized_weight, torch.tensor(torch.finfo(quantized_weight.dtype).min)
    )
```


## 13. 选择 top-k


```text
token_budget = min(kv_seq_len, self.token_budget)  # 512
attn_weights_for_selection = quantized_weight  #(1, 32, 1, 4008)
```


if token_budget > 0:

```text
    mask_bottom = local_heavy_hitter_mask(
        attn_weights_for_selection, token_budget, self.chunk_size
    )  # [1, 32, 1, 4008]  bool 格式
else: 
    mask_bottom = torch.zeros_like(attn_weights_for_selection, dtype=torch.bool)
```


## 14. 应用 叠加 casual mask


`mask_bottom = torch.tril(mask_bottom, diagonal=position_ids[0][0].item())`

## 15. 应用 mask


`attn_weights[~mask_bottom] = torch.tensor(torch.finfo(attn_weights.dtype).min)`

## 16. 计算 softmax 和 PV 矩阵乘


```text
attn_weights = nn.functional.softmax(attn_weights, dim=-1, dtype=torch.float32).to(
    query_states.dtype
)
attn_output = torch.matmul(attn_weights, value_states)
```


## 17. 计算 o_proj


```text
attn_output = attn_output.transpose(1, 2)
attn_output = attn_output.reshape(bsz, q_len, self.hidden_size)

attn_output = self.o_proj(attn_output)
```


#### bench_textgen (速度测试)

作者在代码里插入了 nvtx，用 nsys 看起来执行逻辑和耗时都挺明确，不过不同 kernel 间存在不少执行 bubble，细节上还是有优化空间的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ad5e30781f59.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b7d68b958df3.jpg)

Sparse 层内 Attetnion 计算的流程：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a3c9a7bdb91d.jpg)

### Kernel 实现

作者的开源实现中，精度测试和速度测试是两套代码...我感觉稍显抽象，而且和 InfiniteHiP 一样，都是自己实现了一个简易的 KV Cache 结构。

> 说明把稀疏注意力适配到 SGLang 或者 vllm 这些框架的成本，比自己写一套单独的 kv 管理还高？

核心的Prefill/decode kernel 以及 append_kv 等是基于 Flashinfer 的修改的，此外对于estimate 和 top-k，也都做了 cuda 版本的实现。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_53e833ff5f50.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8037a12708ba.jpg)

不过和同样用 flashinfer 做稀疏的 Radial Attention 不同，因为 Quest 默认是按 Page 来选择重要 token，所以没办法用 BlockSparse 那个 flashinfer 的 kernel 去做，而是通过 metadata 去选择kv 的加载。

kernel 的计算逻辑不复杂，代码调用封装在：[https://github.com/mit-han-lab/Quest/tree/main/quest/ops/csrc](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/Quest/tree/main/quest/ops/csrc) 

不过貌似作者是基于 flashinfer 的模板改的，模板在：[https://github.com/mit-han-lab/Quest/tree/main/kernels/include](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/Quest/tree/main/kernels/include) ，调用逻辑我有点没整明白（不知道为什么要搞得这么复杂），后面可能需要深入看一下 llm 中的 kv cache，再回看这些 kernel 的设计了。