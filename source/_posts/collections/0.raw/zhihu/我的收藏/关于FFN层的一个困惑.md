---
title: (2 条消息) 关于FFN层的一个困惑
date: "2025-11-19 00:00:00"
updated: "2025-11-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/关于FFN层的一个困惑/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1942160792649721494
---


在上一篇[文章](https://zhuanlan.zhihu.com/p/1942003084193694560)中，我们谈到了，无论是对于MHA还是MLA来说，如果在decode中使用矩阵吸收（或者我自己更喜欢的称呼：矩阵连乘计算顺序优化）来做性能加速，就会发现一个问题，那就是v_proj和o_proj是两个连续的线性操作，二者之间没有非线性操作。正是因为这个，理论上这两个矩阵可以吸收成为一个矩阵，虽然从工程性能的角度这样做并不划算。这个问题还困扰了我挺久的，因为两个可以学习的参数居然能直接吸收到一起，这个听上去不太合理，因此我之前一直好奇qkv的结果是不是应该加一个类似激活函数之类的非线性操作，最近看到了[文章](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2505.06708)，解答了我的疑问，作者在qkv的计算结果和o-proj之间加了一个gate操作，实现了非线性，而且取得了效果提升。

下面说<strong>FFN层一个类似困扰了我很久的地方</strong>：FFN层可以实现一种特殊形式的up_proj和down_proj的权重矩阵吸收操作。

在FFN层，对于hidden_states输入来说，先经过一个up_proj和gate_proj，然后将二者的结果做elementwise乘法，得到的immediate tensor再执行一次down_proj。对应如下的计算：

`hidden =  torch.randn(1, H, device="cuda")
up_proj = torch.randn(H, 4*H, device="cuda")
gate_proj = torch.randn(H, 4*H, device="cuda")
down_proj = torch.randn(4*H, H, device="cuda")

```python
def ffn_native():
    up = torch.matmul(hidden, up_proj)
    gate = torch.matmul(hidden, gate_proj)
    gate = torch.nn.functional.silu(gate)
    immediate = up * gate
    down = torch.matmul(immediate, down_proj)
    return down`
```


$为了描述方便，下面我们用 H" role="presentation">HH 代表hidden_size，使用 4&#x22C5;H" role="presentation">4⋅H4\cdot H 代表immedate size，假设只有一个token做FFN，即hidden states的shape是 [1,H]" role="presentation">[1,H][1, H] 。 $

我们发现可以做如下两次变换：

1. 在原先的计算中，up_proj计算结果(shape: [1, 4\cdot H] )是和gate_proj计算结果(shape: [1, 4\cdot H] )一起做elementwise乘法的。但是我们可以交换一下顺序，将up_proj的计算结果(shape: [1, 4\cdot H] )直接和down_proj权重矩阵本身（shape: [4\cdot H,H]）做elementwise的乘法，计算结果shape是 [4\cdot H,H] ，将得到的结果和gate_proj计算结果（shape是 [1, 4\cdot H] ）做矩阵乘法。

2. 对up_proj计算结果(shape: [1, 4\cdot H] )和down_proj矩阵（shape: [4\cdot H,H]）的elementwise乘法进一步拆解：这个流程包括hidden states和up_proj做矩阵乘法，得到的结果和down_proj做elementwise乘法。这个可以进一步交换一下顺序，先将up_proj权重矩阵（shape: [H, 4\cdot H]）和down_proj权重矩阵（shape: [4\cdot H,H]）通过吸收成为一个shape为 [H, 4\cdot H, H]  的tensor，称为up_down_proj，然后hidden states和这个up_down_proj做矩阵乘法，同样得到一个 [4\cdot H, H] 的矩阵，最后将这个结果和gate_proj计算结果（shape是 [1, 4\cdot H] ）做矩阵乘法。

整体对应如下的代码：

`def ffn_absorb():
    # gate计算保持不变

```text
    gate = torch.matmul(hidden, gate_proj)
    gate = torch.nn.functional.silu(gate)

    up_down_proj = up_proj.view(H, 4*H, 1) * down_proj.view(1, 4*H, H)
    up_down_proj = up_down_proj.view(H, 4*H*H)
    up_down = torch.matmul(hidden, up_down_proj)
    up_down = up_down.view(4*H, H)
    down = torch.matmul(gate, up_down)

    return down`
```


很容易验证上述两种计算的结果是一致的。当然上述吸收计算从工程上是非常不划算的，因为up_down_proj这个是一个shape非常大 [H, 4\cdot H, H] 的tensor。我的困惑点在于，通过上述方式，也可以让up_proj和down_proj两个权重在计算上可以做吸收，或者说他们可以直接做某种形式的交互。当然，up_proj和down_proj的吸收方式和attention层的吸收不太一样，attention层v_proj和o_proj的吸收就是一次矩阵乘法，但是up_proj和down_proj的吸收更接近于外积计算，所以shape直接变成了 [H, 4\cdot H, H] 这样一个非常大的tensor。所以我没有想明白的是，这种吸收从数学上是说明了FFN层的表达能力，还是意味着FFN层计算有一些改进空间，还是没有说明任何东西。