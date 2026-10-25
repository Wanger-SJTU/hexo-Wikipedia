---
title: Flash Attention个人理解
date: "2025-10-26 00:00:00"
updated: "2025-10-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/Flash-Attention个人理解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1965867186716407094
---


由于前两天面试一家百亿私募被问到简历里的attention，空间复杂度是 
![](https://www.zhihu.com/equation?tex=O%28n%5E2%29) 该如何优化显存，自己支支吾吾的在问attention的时候回答出来了去年大一暑假时上课讲的flash attention，但是面试时只记得flash attention可以加速，不记得加速原理和可以优化空间复杂度，遂写一篇文章记录一下

Flash Attention降低时空复杂度原理
我自己的理解是通过将 
![](https://www.zhihu.com/equation?tex=QK%5ET) 这个大矩阵<strong>分块</strong>，一方面降低了空间复杂度，另一方面可以让torch从GPU的 
![](https://www.zhihu.com/equation?tex=HBM%EF%BC%88High+Bandwidth+Memory%EF%BC%89) 进入到 
![](https://www.zhihu.com/equation?tex=SRAM%EF%BC%88Static+Random-Access+Memory%EF%BC%89) ，众所周知SRAM具有更快的访问速度和更低的延迟，同时可以降低HBM的访问量，达到提升速度的效果

（果然当知道了原理，我就不会被flash这个单词迷惑，认为他单纯只是加速而没有降低空间复杂度了）

Flash Attention计算原理

1. 标准注意力机制回顾
对于查询向量 
![](https://www.zhihu.com/equation?tex=q) （ 
![](https://www.zhihu.com/equation?tex=Q)的一行），键矩阵 
![](https://www.zhihu.com/equation?tex=K)和值矩阵
![](https://www.zhihu.com/equation?tex=V) ，标准注意力的输出为：

![](https://www.zhihu.com/equation?tex=o%3D%5Cfrac%7B%5Csum_%7Bj%3D1%7D%5E%7BN%7D%7B%5Cexp%28s_j%29v_j%7D%7D%7B%5Csum_%7Bj%3D1%7D%5E%7BN%7D%7B%5Cexp%28s_j%29%7D%7D+%5Ctag%7B1%7D) ​​

其中 
![](https://www.zhihu.com/equation?tex=s_j%3Dq%E2%8B%85k_j%5ET%2F%5Csqrt%7Bd_k%7D) ​​，​ 
![](https://www.zhihu.com/equation?tex=k_j) 和  
![](https://www.zhihu.com/equation?tex=v_j) 分别是 K和 V 的第 j 行。为了数值稳定性，通常引入最大值 
![](https://www.zhihu.com/equation?tex=m+%3D+max_js_j) ​：

![](https://www.zhihu.com/equation?tex=o+%3D+%5Cfrac%7B%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Cexp%28s_j+-+m%5E%2A%29+v_j%7D%7B%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Cexp%28s_j+-+m%5E%2A%29%7D+%5Ctag%7B2%7D) 令 
![](https://www.zhihu.com/equation?tex=a+%3D+%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Cexp%28s_j+-+m%5E%2A%29+v_j%EF%BC%8C+l+%3D+%5Csum_%7Bj%3D1%7D%5E%7BN%7D+%5Cexp%28s_j+-+m%5E%2A%29) 这样最终的输出就转化为了 
![](https://www.zhihu.com/equation?tex=o+%3D+%5Cfrac%7Ba%7D%7Bl%7D) 

2.分块（ tiling ）计算
分块计算里面有两个问题，一个是 
![](https://www.zhihu.com/equation?tex=softmax) 函数是按整行计算的，所以如果切成两个小块分别计算再拼起来是不准确的（因为分母不一样），所以必须想到一种办法可以让不断的更新全局最大值

这自然而然就想到了类似动态规划的计算方法，每次都记录最大值并且更新输出，只要更新到最后，我的 
![](https://www.zhihu.com/equation?tex=output) 和原始的使用整个矩阵相乘是一样的，下面我们一步一步来看

先将 
![](https://www.zhihu.com/equation?tex=K+%E3%80%81V+) 切成 
![](https://www.zhihu.com/equation?tex=B) 个 
![](https://www.zhihu.com/equation?tex=blocks%3A+K+%3D+%5BK_1%2C+K_2%2C+%5Cldots%2C+K_B%5D%2C+V+%3D+%5BV_1%2C+V_2%2C+%5Cldots%2C+V_B%5D) 

我们对于每个块 
![](https://www.zhihu.com/equation?tex=i) 维护三个状态量

- 
![](https://www.zhihu.com/equation?tex=m%28i%29) ：处理前 
![](https://www.zhihu.com/equation?tex=i+) 个块后的全局最大值。
- 
![](https://www.zhihu.com/equation?tex=l%28i%29) ：处理前 
![](https://www.zhihu.com/equation?tex=+i+) 个块后的调整指数和（基于 
![](https://www.zhihu.com/equation?tex=m%28i%29) ）。
- 
![](https://www.zhihu.com/equation?tex=o%28i%29) ：处理前 
![](https://www.zhihu.com/equation?tex=i+) 个块后的部分输出（未归一化，相当于调整后的分子）。初始化时 
![](https://www.zhihu.com/equation?tex=m%5E%7B%280%29%7D+%3D+-%5Cinfty%EF%BC%8C+l%5E%7B%280%29%7D+%3D+0+%EF%BC%8C+o%5E%7B%280%29%7D+%3D+0%EF%BC%8C+) 

对于每个块 
![](https://www.zhihu.com/equation?tex=i%3D1) 到 
![](https://www.zhihu.com/equation?tex=B) ：

1.计算当前块的分数： 
![](https://www.zhihu.com/equation?tex=s_i+%3D+q+%5Ccdot+K_i%5ET+%2F+%5Csqrt%7Bd_k%7D) 

2.计算当前块的最大值： 
![](https://www.zhihu.com/equation?tex=m_i+%3D+%5Cmax_%7Bj+%5Cin+%5Ctext%7B%E5%9D%97%7D+i%7D+s_j)

3.更新全局最大值： 
![](https://www.zhihu.com/equation?tex=m%5E%7B%28i%29%7D+%3D+%5Cmax%28m%5E%7B%28i-1%29%7D%2C+m_i%29)

4.计算调整因子： 
![](https://www.zhihu.com/equation?tex=%5Calpha_%7B%5Ctext%7Bold%7D%7D+%3D+%5Cexp%28m%5E%7B%28i-1%29%7D+-+m%5E%7B%28i%29%7D%29++%5C%5C+%5Calpha_%7B%5Ctext%7Bnew%7D%7D+%3D+%5Cexp%28m_i+-+m%5E%7B%28i%29%7D%29+%5Ctag%7B3%7D) 

5.更新指数和： 
![](https://www.zhihu.com/equation?tex=l_%7B%5Ctext%7Bold%7D%7D+%3D+l%5E%7B%28i-1%29%7D+%5Ccdot+%5Calpha_%7B%5Ctext%7Bold%7D%7D+%5C%5C+++++l_i+%3D+%5Csum_%7Bj+%5Cin+%5Ctext%7B%E5%9D%97%7D+i%7D+%5Cexp%28s_j+-+m_i%29+%5C%5C+++++l_i%5E%7B%5Ctext%7Badj%7D%7D+%3D+l_i+%5Ccdot+%5Calpha_%7B%5Ctext%7Bnew%7D%7D+%5C%5C+++++l%5E%7B%28i%29%7D+%3D+l_%7B%5Ctext%7Bold%7D%7D+%2B+l_i%5E%7B%5Ctext%7Badj%7D%7D+%5Ctag%7B4%7D) 

6.更新输出：

![](https://www.zhihu.com/equation?tex=o_%7B%5Ctext%7Bold%7D%7D+%3D+o%5E%7B%28i-1%29%7D+%5Ccdot+%5Calpha_%7B%5Ctext%7Bold%7D%7D+%5C%5C+++++o_i+%3D+%5Csum_%7Bj+%5Cin+%5Ctext%7B%E5%9D%97%7D+i%7D+%5Cexp%28s_j+-+m_i%29+v_j+%5C%5C+++++o_i%5E%7B%5Ctext%7Badj%7D%7D+%3D+o_i+%5Ccdot+%5Calpha_%7B%5Ctext%7Bnew%7D%7D+%5C%5C+++++o%5E%7B%28i%29%7D+%3D+o_%7B%5Ctext%7Bold%7D%7D+%2B+o_i%5E%7B%5Ctext%7Badj%7D%7D+%5Ctag%7B5%7D) 

处理完所有块后，最终输出为： 
![](https://www.zhihu.com/equation?tex=o+%3D+%5Cfrac%7Bo%5E%7B%28B%29%7D%7D%7Bl%5E%7B%28B%29%7D%7D) 

3.通过数学归纳法证明并计算一下
我们证明对于任意  
![](https://www.zhihu.com/equation?tex=i) ，以下关系成立： 
![](https://www.zhihu.com/equation?tex=o%5E%7B%28i%29%7D+%3D+%5Csum_%7Bj%3D1%7D%5E%7Bn_i%7D+%5Cexp%28s_j+-+m%5E%7B%28i%29%7D%29+v_j+%5C%5C+l%5E%7B%28i%29%7D+%3D+%5Csum_%7Bj%3D1%7D%5E%7Bn_i%7D+%5Cexp%28s_j+-+m%5E%7B%28i%29%7D%29+%5Ctag%7B6%7D)
![](https://www.zhihu.com/equation?tex=i+%3D0) 时显然成立，上面两个量都为0

假设对 
![](https://www.zhihu.com/equation?tex=i-1) 成立，则对 
![](https://www.zhihu.com/equation?tex=i%E6%9C%89) ：

![](https://www.zhihu.com/equation?tex=o_%7B%5Ctext%7Bold%7D%7D+%3D+o%5E%7B%28i-1%29%7D+%5Ccdot+%5Cexp%28m%5E%7B%28i-1%29%7D+-+m%5E%7B%28i%29%7D%29+%5C%5C+%3D+%5Csum_%7Bj%3D1%7D%5E%7Bn_%7Bi-1%7D%7D+%5Cexp%28s_j+-+m%5E%7B%28i%29%7D%29+v_j+%5C%5C+o_i%5E%7B%5Ctext%7Badj%7D%7D+%3D+%5Csum_%7Bj+%5Cin+%5Ctext%7B%E5%9D%97%7D+i%7D+%5Cexp%28s_j+-+m%5E%7B%28i%29%7D%29+v_j+%5Ctag%7B7%7D) 因此：

![](https://www.zhihu.com/equation?tex=o%5E%7B%28i%29%7D+%3D+o_%7B%5Ctext%7Bold%7D%7D+%2B+o_i%5E%7B%5Ctext%7Badj%7D%7D+%3D+%5Csum_%7Bj%3D1%7D%5E%7Bn_i%7D+%5Cexp%28s_j+-+m%5E%7B%28i%29%7D%29+v_j+%5Ctag%7B8%7D) 

Flash Attention torch代码

```python
import torch
import math

def flash_attention_forward(Q, K, V, block_size=256):
```


    """
    参数:

```text
        Q: 查询张量, shape (batch_size, seq_len, d_k)
        K: 键张量, shape (batch_size, seq_len, d_k)
        V: 值张量, shape (batch_size, seq_len, d_v)
        block_size: 分块大小, 控制内存使用
```

        
    返回:

```text
        O: 注意力输出, shape (batch_size, seq_len, d_v)
    """

    batch_size, seq_len, d_k = Q.shape
    d_v = V.shape[-1]

    O = torch.zeros_like(V)          # 输出张量, 初始化为零
    L = torch.zeros(batch_size, seq_len, device=Q.device)  # 指数和统计量
    M = torch.full((batch_size, seq_len), -torch.inf, device=Q.device)  # 最大值统计量

    # 计算缩放因子 (1/sqrt(d_k))
    scale = 1.0 / math.sqrt(d_k)
```

    
    # 外层循环: 按块处理键/值序列

```text
    for j in range(0, seq_len, block_size):
        # 获取当前键块和值块
        K_block = K[:, j:j+block_size, :]  # [batch_size, block_size, d_k]
        V_block = V[:, j:j+block_size, :]  # [batch_size, block_size, d_v]
```

        
        # 计算查询与键块的相似度分数

```text
        S_j = torch.matmul(Q, K_block.transpose(-2, -1)) * scale  # [batch_size, seq_len, block_size]

        # 计算当前块的最大值 (按最后一个维度)
        m_j = torch.max(S_j, dim=-1).values  # [batch_size, seq_len]
```

        
        # 更新全局最大值

```text
        M_new = torch.maximum(M, m_j)  # [batch_size, seq_len]

        # 计算调整因子 (指数部分)
        # 旧部分的调整因子: exp(M_prev - M_new)
        exp_old = torch.exp(M - M_new)  # [batch_size, seq_len]
        # 新块的调整因子: exp(m_j - M_new)
        exp_new = torch.exp(m_j - M_new)  # [batch_size, seq_len]

        # 使用当前块的局部最大值计算指数 (数值稳定性)
        # P_j = exp(S_j - m_j)
        P_j = torch.exp(S_j - m_j.unsqueeze(-1))  # [batch_size, seq_len, block_size]
```

        
        # 计算当前块的指数和
        l_j = P_j.sum(dim=-1)  # [batch_size, seq_len]
        
        # 计算当前块的加权和输出

```text
        # O_j = P_j @ V_block
        O_j = torch.matmul(P_j, V_block)  # [batch_size, seq_len, d_v]

        # 调整旧输出: O_prev * exp(M_prev - M_new)
        O = O * exp_old.unsqueeze(-1)  # 保持维度一致

        # 调整新块输出: O_j * exp(m_j - M_new)
        O_j_adjusted = O_j * exp_new.unsqueeze(-1)

        # 更新输出: O = O_prev_adjusted + O_j_adjusted
        O = O + O_j_adjusted

        # 调整旧指数和: L_prev * exp(M_prev - M_new)
        L = L * exp_old

        # 调整新块指数和: l_j * exp(m_j - M_new)
        l_j_adjusted = l_j * exp_new

        # 更新指数和: L = L_prev_adjusted + l_j_adjusted
        L = L + l_j_adjusted
```

        
        # 更新全局最大值

```text
        M = M_new

    # 最终归一化: O = O / L
    O = O / L.unsqueeze(-1) 

    return O
```

在pytorch2.0以上的版本F.scaled_dot_product_attention融合了Flash Attention的算子，不过经过评论区大佬 [@shenjingwa33](https://www.zhihu.com/people/fdb860fe88410c80c6106880bd6eaa22) 的指正这里的适用范围很其实狭窄，合适的硬件和对应的编译文件都配套才可以，看来还是不能偷懒了：

import torch.nn.functional as F

output = F.scaled_dot_product_attention(
    query, key, value,

```text
    attn_mask=None,
    dropout_p=0.0,
    is_causal=False
)
```

Flash Attention通过数学和工程上的简单优化，达到了即降低运行时间，又降低显存占用，可谓十分优雅，确实是太强了