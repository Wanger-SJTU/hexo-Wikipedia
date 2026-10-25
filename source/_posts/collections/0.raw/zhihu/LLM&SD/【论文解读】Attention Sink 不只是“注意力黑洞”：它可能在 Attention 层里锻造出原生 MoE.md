---
title: 【论文解读】Attention Sink 不只是“注意力黑洞”：它可能在 Attention 层里锻造出原生 MoE
date: "2026-06-20 00:00:00"
updated: "2026-06-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【论文解读】Attention-Sink-不只是“注意力黑洞”-它可能在-Attention-层里锻造出原生-MoE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2051751066975442836
---


![](https://picx.zhimg.com/v2-20277688d0854863b01473236aafdd15_r.jpg)最近读到一篇被ICML 2026接收的很有意思的论文：

<strong>Attention Sink Forges Native MoE in Attention Layers: Sink-Aware Training to Address Head Collapse</strong>

这篇文章讨论了一个大家已经比较熟悉的现象：

- <strong>Attention Sink</strong>，也就是大语言模型在生成时，经常会把大量注意力分配给第一个 token，即使这个 token 本身并没有太强的语义相关性。过去我们通常把 attention sink 看作一种“softmax 归一化带来的副作用”：

- 注意力权重必须加和为 1，当模型并不需要把全部权重分配给有效 token 时，多余的注意力就需要找一个地方“倒掉”。于是，第一个 token 就成了天然的 sink。但这篇文章提出了一个更有意思的视角：

 Attention Sink 不只是一个需要被消除的异常现象，它实际上在 Attention 层内部诱导出了一种类似 MoE 的结构。 多头注意力中的每个 head 可以看作一个 expert，而分配给 sink 的注意力权重，则隐式地扮演了 gating / routing 的角色。这也进一步解释了一个相关现象：<strong>Head Collapse</strong>。

- 也就是说，在很多模型中，真正持续发挥作用的注意力头只有少数几个，而大量 head 长期处于低激活状态。作者认为，这和 MoE 中常见的 expert collapse 有类似机制。下面是我对这篇文章的理解。

TL;DR
这篇论文针对大语言模型中常见的 Attention Sink 现象提出了一个新的统一视角：

- Attention Sink 不只是 softmax 归一化导致的“注意力黑洞”，它实际上会在 Attention 层内部诱导出一种 原生 MoE (Native MoE) 结构。具体来说，Vanilla Attention 中分配给第一个 token 的 sink 权重，或者 Sink Attention 中分配给 synthetic sink 的权重，都可以转化为一个隐式门控因子：

![](https://www.zhihu.com/equation?tex=+G_t%5E%7Bl%2Ch%7D%3D1-A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D+)

这意味着：

- 每个 attention head 都可以被看作一个 expert，而 sink-derived gate 则决定了该 head 的激活强度。Gated Attention 本质上则是把这种隐式门控显式化。基于这一视角，作者进一步解释了 Head Collapse：

- 少数 attention heads 长期高激活，而大量 heads 几乎不参与生成，类似 MoE 中的 expert collapse。为缓解这一问题，论文提出了 sink-aware auxiliary load balancing loss，通过均衡每层中不同 heads 的重要性，提升 head 利用率，并在 Vanilla Attention、Sink Attention 和 Gated Attention 下都带来了更稳定的训练和更好的模型性能。

![](https://pic1.zhimg.com/v2-825a730dbcc843adf11449bf1a12850c_r.jpg)
1. Attention Sink：为什么第一个 token 会吸走大量注意力？
在标准 Transformer Attention 中，第 
![](https://www.zhihu.com/equation?tex=h) 个 head 的输出可以写成：

![](https://www.zhihu.com/equation?tex=+O_t%5E%7Bl%2Ch%7D%3D%5Csum_%7Bj%3D0%7D%5E%7Bt%7D+A_%7Bt%2Cj%7D%5E%7Bl%2Ch%7Dv_j%5E%7Bl%2Ch%7D+)

其中 
![](https://www.zhihu.com/equation?tex=A_%7Bt%2Cj%7D%5E%7Bl%2Ch%7D) 是 token 
![](https://www.zhihu.com/equation?tex=t) 对 token 
![](https://www.zhihu.com/equation?tex=j) 的注意力权重。

由于 softmax 会强制所有注意力权重加和为 1，当某个 head 并不需要关注所有 token，甚至只需要很少的有效信息时，剩余的注意力权重仍然必须被分配出去。这个时候，模型往往会把多余的注意力分配给第一个 token。

但是，如果第一个 token 接收了大量无意义注意力，它就可能污染输出。为了避免这种影响，模型还会学到另一个现象：

- <strong>value drain</strong>。也就是说，第一个 token 对应的 value 向量会趋近于 0。这样即使第一个 token 获得很大的 attention weight，它对最终输出的贡献也很小。所以在 Vanilla Attention 中，attention sink 的逻辑可以理解为：

- softmax 要求注意力权重总和为 1；
- 多余的注意力需要一个“垃圾桶”；
- 第一个 token 由于 causal mask 下语义信息较少，天然适合作为垃圾桶；
- 模型进一步把第一个 token 的 value 向量压小，避免它影响输出。这就是 Attention Sink 的基本机制。

![](https://pic3.zhimg.com/v2-1507d268677ef54337babfce733283e2_r.jpg)
2. Sink Attention 和 Gated Attention：两种消除 sink 的方式
为了缓解 Attention Sink，近期有两类代表性方法。

第一类是 <strong>Sink Attention</strong>：

它直接在 softmax 分母中加入一个可学习的 sink 参数： 

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BSoftmax%7D_%7B%5Ctext%7Bsink%7D%7D%28x%29_i+%3D+%5Cfrac%7B%5Cexp%28x_i%29%7D+%7B%5Csum_j+%5Cexp%28x_j%29%2B%5Cexp%28%5Ctextbf%7Bsink%7D%29%7D+)

这个 synthetic sink 不对应任何真实 token，也没有 value 向量。因此，分配给它的注意力权重对输出严格没有贡献。它本质上是把 Vanilla Attention 中“第一个 token 作为垃圾桶”的机制显式化、参数化了。

第二类是 <strong>Gated Attention</strong>：

它为每个 attention head 引入一个显式 gate： 

![](https://www.zhihu.com/equation?tex=+G_t%5E%7Bl%2Ch%7D%3D%5Csigma%28x_t%5El+W_%5Ctheta%5E%7Bl%2Ch%7D%29+)

然后用这个 gate 缩放对应 head 的输出：

![](https://www.zhihu.com/equation?tex=+O_t%5El%3D%5Csum_%7Bh%3D1%7D%5E%7BH%7D%28G_t%5E%7Bl%2Ch%7D+%5Ccdot+O_t%5E%7Bl%2Ch%7D%29W_O%5E%7Bl%2Ch%7D+)

这里的关键是：

- 每个 head 都有自己的 gating factor。换句话说，Gated Attention 允许模型动态决定每个 head 在当前 token 上应该发挥多大作用。
3. 统一视角：Attention Sink 其实是隐式 Gate
这篇文章最核心的洞见，是把 Vanilla Attention、Sink Attention 和 Gated Attention 放到同一个框架下理解。

先看 Vanilla Attention 和 Sink Attention。记分配给 sink 的注意力权重为：

![](https://www.zhihu.com/equation?tex=+A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D+)

- 在 Vanilla Attention 中，它对应第一个 token 的注意力权重 
![](https://www.zhihu.com/equation?tex=A_%7Bt%2C0%7D%5E%7Bl%2Ch%7D)；
- 在 Sink Attention 中，它对应 synthetic sink 的注意力权重 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%5Cexp%28%5Ctext%7Bsink%7D%29%7D%7B%5Csum_j+%5Cexp%28x_j%29+%2B+%5Cexp%28%5Ctext%7Bsink%7D%29%7D)。由于 sink 的 value 贡献为 0 或近似为 0，即 
![](https://www.zhihu.com/equation?tex=A_%7Bt%2C+%5Ctext%7Bsink%7D%7D%5E%7Bl%2Ch%7D+%5Ccdot+v_%7B%5Ctext%7Bsink%7D%7D%5E%7Bl%2Ch%7D+%5Capprox+0)，因此有效输出可以写成：

![](https://www.zhihu.com/equation?tex=+O_%7Bt%7D%5E%7Bl%2C+h%7D%3D%5Csum_%7Bj+%5Cneq+%5Cmathrm%7Bsink%7D%7D+A_%7Bt%2C+j%7D%5E%7Bl%2C+h%7D+%5Ccdot+%5Cmathbf%7Bv%7D_%7Bj%7D%5E%7Bl%2C+h%7D%3D%5Cleft%281-A_%7Bt%2C+%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2C+h%7D%5Cright%29+%5Ccdot+%5Csum_%7Bj+%5Cneq+%5Cmathrm%7Bsink%7D%7D+%5Ctilde%7BA%7D_%7Bt%2C+j%7D%5E%7Bl%2C+h%7D+%5Ccdot+%5Cmathbf%7Bv%7D_%7Bj%7D%5E%7Bl%2C+h%7D+)

这里 
![](https://www.zhihu.com/equation?tex=%5Ctilde%7BA%7D_%7Bt%2Cj%7D%5E%7Bl%2Ch%7D) 是在非 sink token 上重新归一化后的 attention weight，定义为：
![](https://www.zhihu.com/equation?tex=%5Ctilde%7BA%7D_%7Bt%2Cj%7D%5E%7Bl%2Ch%7D+%3D+%5Cfrac%7BA_%7Bt%2Cj%7D%5E%7Bl%2Ch%7D%7D%7B1+-+A_%7Bt%2C+%5Ctext%7Bsink%7D%7D%5E%7Bl%2Ch%7D%7D%2C+j+%5Cneq+%5Ctext%7Bsink%7D)。

这一步非常关键。它说明：

![](https://www.zhihu.com/equation?tex=+1-A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D+)

<strong>自然地成为了整个 attention head 输出前面的缩放因子</strong>。

换句话说，Vanilla Attention 和 Sink Attention 中其实已经存在一个隐式 gate：

![](https://www.zhihu.com/equation?tex=+G_t%5E%7Bl%2Ch%7D%3D1-A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D+)

这个 gate 的含义很直观：

- 如果大量注意力被分配给 sink，那么 
![](https://www.zhihu.com/equation?tex=A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D) 很大，
![](https://www.zhihu.com/equation?tex=G_t%5E%7Bl%2Ch%7D) 就很小，这个 head 的输出被抑制；
- 如果 sink 吸收的注意力很少，那么 
![](https://www.zhihu.com/equation?tex=G_t%5E%7Bl%2Ch%7D) 较大，这个 head 就更活跃。更有意思的是，这个隐式 gate 还可以写成 sigmoid 形式：

- 对于 Sink Attention：
![](https://www.zhihu.com/equation?tex=+G_t%5E%7Bl%2Ch%7D%3D%5Csigma%28%5Cmathrm%7BLSE%7D-%5Cmathrm%7Bsink%7D%29+)

其中 LSE 是 token logits 的 log-sum-exp。

- 对于 Vanilla Attention：
![](https://www.zhihu.com/equation?tex=+G_t%5E%7Bl%2Ch%7D+%3D+%5Csigma%28%5Ctext%7BLSE%7D_%7B-0%7D+-+%5Cfrac%7Bq_t%5E%7Bl%2Ch%7Dk_0%5E%7Bl%2Ch%7D%7D%7B%5Csqrt%7Bd_h%7D%7D%29+)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathrm%7BLSE%7D_%7B-0%7D) 表示不包含第一个 token 的 log-sum-exp。

这就把三种 attention 机制联系起来了：

- Vanilla Attention：通过第一个 token 形成隐式 gate；
- Sink Attention：通过 synthetic sink 形成隐式 gate；
- Gated Attention：直接引入显式 gate。因此，attention sink 并不只是一个“注意力黑洞”，它还在 attention 层里诱导出了一种 head-level routing 机制。

4. 为什么说 Attention 层里有“原生 MoE”？
MoE 一般有两个核心组成：

- 多个相对独立的 expert；
- 一个决定 expert 激活程度的 router / gate。从这个角度看，多头注意力天然具备 MoE 的结构：

- 每个 attention head 可以看作一个 expert；
- 由 attention sink 导出的 
![](https://www.zhihu.com/equation?tex=G_t%5E%7Bl%2Ch%7D%3D1-A_%7Bt%2C%5Cmathrm%7Bsink%7D%7D%5E%7Bl%2Ch%7D) 可以看作 router / gate。因此，作者提出了一个很形象的说法：

 Attention Sink forges native MoE in attention layers.也就是说，哪怕模型没有显式引入 MoE 层，attention 层内部也可能已经形成了类似 MoE 的专家路由结构。

这个视角很有启发性。它把 attention sink、gated attention、多头注意力稀疏激活、head pruning 等现象联系到了一起。

5. 消除 Attention Sink 为什么有帮助？
既然 attention sink 能形成隐式 gate，那是不是 attention sink 就是好事？并不完全是：

- Attention Sink 会在激活值中诱发极端离群点，从而增加量化难度；（[Xiao et al., 2022](https://link.zhihu.com/?target=https%3A//proceedings.mlr.press/v202/xiao23c/xiao23c.pdf); [Bondarenko et al., 2023](https://link.zhihu.com/?target=https%3A//proceedings.neurips.cc/paper_files/paper/2023/file/edbcb7583fd8921dad78adecfe06a99b-Paper-Conference.pdf); [Zhao et al., 2023](https://link.zhihu.com/?target=https%3A//proceedings.mlsys.org/paper_files/paper/2024/file/5edb57c05c81d04beb716ef1d542fe9e-Paper-Conference.pdf)）
- Attention Sink 会降低模型的表达能力；（[Gu et al., 2024](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2410.10781); [Zuhri et al., 2025](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2504.20966)）
- 移除 Attention Sink 能够稳定提升上下文基准上的性能。（[Ramapuram et al., 2024](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2409.04431); [Qiu et al., 2025](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2505.06708)）作者进一步分析了 Vanilla Attention 中“第一个 token 作为 sink”的副作用。

问题在于，第一个 token 是一个真实 token。为了让它长期承担 sink 的角色，模型会对 query-key 几何结构施加额外约束。

论文通过 PCA 可视化 query 和 key 的分布，发现 Vanilla Attention 中会形成明显的 bipolar structure：

- 为了保持对第一个 token 的高注意力，后续 token 的 query 向量会聚集在 
![](https://www.zhihu.com/equation?tex=k_0) 附近；
- 为了避免其他 token 干扰 sink 机制，后续 token 的 key 向量又会被推离 
![](https://www.zhihu.com/equation?tex=k_0)。
![](https://pic3.zhimg.com/v2-83761094eb5f2a9d20799cd3bab9c8d2_r.jpg)这会带来一个问题：query 和 key 的有效表达空间被压缩了。

直观理解就是，模型为了维护“第一个 token 是垃圾桶”这个机制，不得不牺牲一部分 query-key 匹配的自由度。这样 softmax 在区分候选 token 时的精度会下降，尤其在长上下文场景中，注意力噪声会被放大，模型更难精确检索相关信息。

相比之下，Sink Attention 和 Gated Attention 解耦了 sink 和真实 token：

- Sink Attention 用 synthetic sink 替代第一个 token；
- Gated Attention 直接用显式 gate 控制 head 输出。因此，第一个 token 不再需要承担特殊角色，query-key 分布也更加自由，token 选择可以更加细粒度。

这解释了为什么去掉或显式化 attention sink，通常能改善长上下文任务和整体性能。

6. Head Collapse：Attention 层里的“专家塌缩”
有了“<strong>attention head = expert，sink-derived gate = router</strong>”这个视角后，作者进一步讨论了 <strong>Head Collapse</strong>。

所谓 Head Collapse，是指在训练或推理过程中，只有少数 attention head 长期保持高激活，而许多其他 head 的激活水平非常低。也就是说，模型虽然名义上有很多 head，但真正被充分利用的只是其中一小部分。

为了量化每个 head 的重要性，作者定义了 head importance：

![](https://www.zhihu.com/equation?tex=+%5Cmathrm%7BImp%7D%5E%7Bl%2Ch%7D+%3D+%5Cfrac%7B1%7D%7B%7C%5Cmathcal%7BT%7D%7C%7D+%5Csum_%7B%28i%2Ct%29%5Cin+%5Cmathcal%7BT%7D%7DG_%7Bi%2Ct%7D%5E%7Bl%2Ch%7D+)

也就是在一个 batch 的所有 token 上，对该 head 的 gating factor 求平均。

如果 
![](https://www.zhihu.com/equation?tex=%5Cmathrm%7BImp%7D%5E%7Bl%2Ch%7D) 越大，说明这个 head 被激活得越强，对该层输出贡献越大。

![](https://picx.zhimg.com/v2-cf43e0a982619b777955101b2ba22dd5_r.jpg)作者在 LLaMA、GPT-OSS、Qwen3-Next 等模型中观察到，head importance 呈现明显不均衡：<strong>少数 head 长期高激活，很多 head 低激活</strong>。这说明 Head Collapse 不是某一种 attention 机制的偶然现象，而是在 Vanilla Attention、Sink Attention、Gated Attention 中都存在。

进一步地，作者用每层内部 head importance 的变异系数 CV 来衡量 head load imbalance：

![](https://www.zhihu.com/equation?tex=+%5Cmathrm%7BHead%5C+Imbalance%7D+%3D+%5Cfrac%7B1%7D%7BN_L%7D+%5Csum_%7Bl%3D1%7D%5E%7BN_L%7D+%5Cmathrm%7BCV%7D+%5Cleft%28+%7B%5Cmathrm%7BImp%7D%5E%7Bl%2Ch%7D%7D_%7Bh%3D1%7D%5E%7BN_h%7D+%5Cright%29+)

CV 越大，说明该层的 head 利用越不均衡。

![](https://pic4.zhimg.com/v2-f340ede4f243f630d9b4289b70cac7d3_r.jpg)实验显示，随着训练推进，head imbalance 会逐渐上升并趋于稳定。这说明 head collapse 很可能是在优化过程中自然出现的：训练早期某些 head 率先变得重要，随后持续吸引更多更新，而其他 head 则长期处于低利用状态。

这和 MoE 中的 expert collapse 很像。

7. Sink-Aware Load Balancing：把 MoE 的负载均衡搬到 Attention Head 上
既然 head collapse 可以类比 MoE 中的 expert collapse，那么一个自然的想法是：能不能像 MoE 那样，对 attention head 也加负载均衡损失？

作者提出了一个 sink-aware auxiliary load balancing loss。

对于从零开始训练的模型，直接鼓励每一层内部各个 head 的 importance 更均衡：

![](https://www.zhihu.com/equation?tex=+%5Cmathcal%7BL%7D_%7B%5Cmathrm%7Baux%7D%7D+%3D+%5Clambda+%5Csum_%7Bl%3D1%7D%5E%7BN_L%7D+N_h+%5Cleft%5B+%5Cmathrm%7BCV%7D+%5Cleft%28+%5C%7B%5Cmathrm%7BImp%7D%5E%7Bl%2Ch%7D%5C%7D_%7Bh%3D1%7D%5E%7BN_h%7D+%5Cright%29+%5Cright%5D%5E2+)

总目标为：

![](https://www.zhihu.com/equation?tex=+%5Cmathcal%7BL%7D+%3D+%5Cmathcal%7BL%7D_%7B%5Cmathrm%7Bbase%7D%7D+%2B+%5Cmathcal%7BL%7D_%7B%5Cmathrm%7Baux%7D%7D+)

其中 
![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D_%7B%5Cmathrm%7Bbase%7D%7D) 是标准语言建模损失。

这个损失的作用很直接：如果某一层只有少数 head 很活跃，CV 就会变大，辅助损失就会惩罚这种不均衡。

8. 微调已有模型时：不能直接强行均衡
对于已经预训练好的模型，情况会更复杂。

![](https://pic3.zhimg.com/v2-e8fdb8bb4116ce137723396bd1a5e41e_r.jpg)预训练过程中，一些 head 可能已经变成 dominant heads，并承载了关键表示。如果微调时直接要求所有 head 均衡，很可能会破坏这些已经学好的行为。

作者把这个问题称为 <strong>head pinning effect</strong>：

- dominant heads 的 gate 倾向于“钉住”在高激活状态，不容易被降低。此时如果强行做均衡，其他 head 可能只是被迫提高激活来追赶 dominant heads，而不是真正形成合理分工。为了解决这个问题，作者借鉴 DeepSeek-MoE 中 shared expert 和 routed expert 的思想：

- 每层中 importance 最高的 top-(m) 个 head 被视为 shared heads；
- 这些 head 保留原有行为，不参与负载均衡；
- 剩下的 head 被视为 routed heads，只对它们施加负载均衡。对应损失为：

![](https://www.zhihu.com/equation?tex=+%5Cmathcal%7BL%7D_%7B%5Cmathrm%7Baux%7D%7D+%3D+%5Clambda+%5Csum_%7Bl%3D1%7D%5E%7BN_L%7D+%28N_h-m%29+%5Cleft%5B+%5Cmathrm%7BCV%7D+%5Cleft%28+%5C%7B+%5Cmathrm%7BImp%7D%5E%7Bl%2Ch%7D%3Ah%5Cnotin+%5Cmathcal%7BT%7D_m%5El+%5C%7D+%5Cright%29+%5Cright%5D%5E2+)

这样既能保护已有模型中的关键 head，又能提升其他 head 的利用率。

9. 实验结果：负载均衡确实能缓解 Head Collapse
论文主要做了两类实验。

9.1 从零训练
作者从零训练了 0.6B、1B、2B 三种规模的模型，分别使用 Vanilla Attention、Sink Attention 和 Gated Attention，并比较是否加入辅助负载均衡损失。

![](https://pic4.zhimg.com/v2-f340ede4f243f630d9b4289b70cac7d3_r.jpg)
![](https://pic4.zhimg.com/v2-40ac3f0453b8e3e54b20bff796686223_r.jpg)结果显示：

- Sink Attention 和 Gated Attention 整体上优于 Vanilla Attention；
- 加入辅助负载均衡损失后，三种 attention 机制在不同规模上通常都有性能提升；
- 负载均衡可以显著降低 head load imbalance；
- Gated Attention 的 collapse 发生得更早，因为它从训练一开始就有显式 gate；
- Vanilla Attention 和 Sink Attention 的 collapse 更慢，因为它们需要先形成 sink 或 value drain，再形成有效的隐式 gate。一个很有意思的观察是（Figure 5）：

- Vanilla Attention 的不均衡曲线比 Sink Attention 更振荡。原因可能是 Vanilla Attention 需要同时学两件事：一方面把注意力分配给第一个 token，另一方面把第一个 token 的 value 压到接近 0。这个过程比 synthetic sink 更复杂，因此训练动态也更不稳定。
9.2 微调已有模型

![](https://pica.zhimg.com/v2-17ed7f7db77290594ed63e4d93263370_r.jpg)作者还在 Qwen3-4B、Qwen3-8B 和 LLaMA3.1-8B 上进行 LoRA 微调，任务包括 reasoning 和 LongBench 长上下文理解。

结果显示，加入 sink-aware auxiliary loss 后，模型在 reasoning 和 long-context 任务上的平均表现都有提升。尤其是更大的模型，受益更加明显。这也符合 MoE 中的经验：当 expert/head 数量变多时，负载均衡的重要性会进一步放大。

此外，作者还提到实现上可以利用 Flash Attention 中已经计算出的 LSE 值来得到 gate，因此不需要显式 materialize 完整 attention matrix，额外训练开销小于 2%。

10. 我的理解：这篇文章最有价值的地方
我觉得这篇文章最有意思的地方不是单纯提出一个辅助损失，而是提供了一个统一解释框架：

 Attention Sink、Gated Attention、多头注意力稀疏激活、Head Collapse，其实可以用“Attention 层中的原生 MoE”统一起来理解。具体来说：

- Attention head 是 expert；
- Attention sink 诱导出的 
![](https://www.zhihu.com/equation?tex=1-A_%7B%5Cmathrm%7Bsink%7D%7D) 是隐式 gate；
- Gated Attention 是显式 gate；
- Head Collapse 对应 MoE 中的 expert collapse；
- Sink-aware load balancing 对应 MoE 中的负载均衡损失。这个视角把很多原本分散的现象串了起来。

它也启发我们重新理解多头注意力：

- 多头注意力可能并不是所有 head 都均匀协作，而更像是一个隐式稀疏专家系统。模型会根据 token 和上下文动态决定哪些 head 更重要，只是这种 routing 在 Vanilla Attention 中是通过 attention sink 间接实现的。
11. 局限
当然，这篇文章也有一些值得继续讨论的地方。

第一，作者主要用第一个 token 或 synthetic sink 来估计 head activation，但真实模型中可能存在多个 sink-like token。例如标点符号、局部低语义 token，甚至某些上下文 token 都可能吸收冗余注意力。因此，用单个 sink 来定义 gate 可能只是一个近似。

第二，Gated Attention 中虽然有显式 gate，但并不代表隐式 sink gate 完全消失。显式 gate 和隐式 gate 可能共同作用，head activation 未必只由单一因素决定。

第三，负载均衡并不一定总是越强越好。对于已经预训练好的模型，dominant heads 可能确实承载了重要功能，强行削弱它们会伤害性能。因此，作者提出 shared heads + routed heads 的微调策略是有必要的。

第四，目前实验已经覆盖 0.6B 到 2B 的从零训练，以及 Qwen3 / LLaMA3.1 的微调，但这个机制在更大规模、更长训练、更复杂 MoE 架构中的表现，仍然值得进一步验证。