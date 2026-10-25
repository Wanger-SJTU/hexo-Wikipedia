---
title: (1 条消息) [分析] ROPE的不同实现：llama&palm
date: "2023-05-07 00:00:00"
updated: "2023-05-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/[分析]-ROPE的不同实现-llama-palm/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/627536105
---


看到苏神的[Rotary Position Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2104.09864)在Meta的llama和Google的palm里面都被采用了，非常佩服。细心的朋友可能发现，llama和palm对ROPE的实现有点细微的差别。

#### 实现差异

下面分别是llama和palm对ROPE的实现：

- [llama](https://link.zhihu.com/?target=https%3A//github.com/facebookresearch/llama/blob/main/llama/model.py)
llama显然是仔细看了苏神的论文推导，直接按照复数运算的方式进行实现，代码非常简洁。

`def precompute_freqs_cis(dim: int, end: int, theta: float = 10000.0):

```python
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: (dim // 2)].float() / dim))
    t = torch.arange(end, device=freqs.device)  # type: ignore
    freqs = torch.outer(t, freqs).float()  # type: ignore
    freqs_cis = torch.polar(torch.ones_like(freqs), freqs)  # complex64
    return freqs_cis

def apply_rotary_emb(
    xq: torch.Tensor,
    xk: torch.Tensor,
    freqs_cis: torch.Tensor,
```

) -> Tuple[torch.Tensor, torch.Tensor]:

```text
    xq_ = torch.view_as_complex(xq.float().reshape(*xq.shape[:-1], -1, 2))
    xk_ = torch.view_as_complex(xk.float().reshape(*xk.shape[:-1], -1, 2))
    freqs_cis = reshape_for_broadcast(freqs_cis, xq_)
    xq_out = torch.view_as_real(xq_ * freqs_cis).flatten(3)
    xk_out = torch.view_as_real(xk_ * freqs_cis).flatten(3)
    return xq_out.type_as(xq), xk_out.type_as(xk)`
```


- [palm](https://link.zhihu.com/?target=https%3A//github.com/lucidrains/PaLM-pytorch/blob/main/palm_pytorch/palm_pytorch.py)
palm是将复数运算展开之后，在实数上用三角函数进行运算的，方便修改一些，也不算复杂。

`class RotaryEmbedding(nn.Module):

```python
    def __init__(self, dim):
        super().__init__()
        inv_freq = 1.0 / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        self.register_buffer("inv_freq", inv_freq)

    def forward(self, max_seq_len, *, device):
        seq = torch.arange(max_seq_len, device=device, dtype=self.inv_freq.dtype)
        freqs = einsum("i , j -> i j", seq, self.inv_freq)
        return torch.cat((freqs, freqs), dim=-1)

def rotate_half(x):
    x = rearrange(x, "... (j d) -> ... j d", j=2)
    x1, x2 = x.unbind(dim=-2)
    return torch.cat((-x2, x1), dim=-1)

def apply_rotary_pos_emb(pos, t):
    return (t * pos.cos()) + (rotate_half(t) * pos.sin())`
```


但稍作验证就会发现同样的输入，这两者得到的输出是不一致的。

原因在于两者将输入拆成两个部分的方式不一致，llama将最后一维度dim拆成(dim//2, 2)，而palm将最后一维度dim拆成(2, dim//2)，熟悉torch的朋友知道这两者差别很大。

那到底谁是对的呢？抱着这个问题我仔细读了一下苏神关于Positional Embeddings的一系列博客，结论是都对，llama的实现和苏神原始的切分方式一致，且实测运算更快（可能是复数运算算子融合的缘故）。

#### Rotary Position Embedding回顾

苏神在参考1提到了Transformer中Position Embedding的意义：“破坏Transformer结构的完全对称性”。可以这样理解，假设做一个文本分类任务，输入经过Transformer得到输出embedding，然后global pooling再去分类。如果没有Position Embedding，打乱原来句子的顺序会得到同样的结果，这显然是不对的。

然后苏神在参考1中分析了Google第一版本Position Embedding形式的初衷：“通过绝对位置编码来表达相对位置信息“，并在参考2中第一次给出了Rotary Position Embedding的形式，形式上其和Google第一版本Position Embedding最大的差别是将“加性Position Embedding“改为”乘性Position Embedding“，使得 QK^T  计算的结果中蕴含 Q 和 K  的相对位置信息，具体见参考2的推导。展开之后的格式如下所示：

$\begin{equation}\begin{pmatrix}q_0 \\ q_1 \\ q_2 \\ q_3 \\ \vdots \\ q_{d-2} \\ q_{d-1}  \end{pmatrix}\otimes\begin{pmatrix}\cos m\theta_0 \\ \cos m\theta_0 \\ \cos m\theta_1 \\ \cos m\theta_1 \\ \vdots \\ \cos m\theta_{d/2-1} \\ \cos m\theta_{d/2-1}  \end{pmatrix} + \begin{pmatrix}-q_1 \\ q_0 \\ -q_3 \\ q_2 \\ \vdots \\ -q_{d-1} \\ q_{d-2}  \end{pmatrix}\otimes\begin{pmatrix}\sin m\theta_0 \\ \sin m\theta_0 \\ \sin m\theta_1 \\ \sin m\theta_1 \\ \vdots \\ \sin m\theta_{d/2-1} \\ \sin m\theta_{d/2-1}  \end{pmatrix}\end{equation}  $

可以看到，苏神是将原始向量相邻的两两为一组，而palm则是将前和后分为两组，但这样的分组方式并不会改变Rotary Position Embedding的初衷，依然可以保证计算结果中蕴含有相对位置信息。

#### 参考

- <strong>Transformer升级之路：1、Sinusoidal位置编码追根溯源</strong>
- <strong>让研究人员绞尽脑汁的Transformer位置编码</strong>
- <strong>Transformer升级之路：2、博采众长的旋转式位置编码</strong>
