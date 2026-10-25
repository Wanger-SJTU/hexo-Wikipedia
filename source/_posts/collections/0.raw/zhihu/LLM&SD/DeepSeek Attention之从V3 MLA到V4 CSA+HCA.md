---
title: DeepSeek Attention之从V3 MLA到V4 CSA+HCA
date: "2026-04-25 00:00:00"
updated: "2026-04-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/DeepSeek-Attention之从V3-MLA到V4-CSA-HCA/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2031133178354716993
---


本文为DeepSeek infra的第二篇

[DeepSeek-V4技术报告解析之第3章Expert parallel+批不变性+确定性kernel](https://zhuanlan.zhihu.com/p/2031052302870651066)上篇文章讲了专家并行EP和batch invariant和确定性的必要性，本文讲讲attention架构的演进。

V3 MLA=>V4 CSA+HCA
注意到V4 由MLA架构过度到了CSA+HCA架构，我们先回忆下传统的 KV Cache ，每个 Token 都要存一堆Key 和 Value 向量，比如 4096 维。序列越长，存的 Token KV 越多。对于MLA，它把原本 4096 维的庞大特征，用一个LORA矩阵压缩成了一个小维度的潜向量（Latent Vector 
![](https://www.zhihu.com/equation?tex=c_t)，比如 512 维）。在推理时，显存里只存这个玩意，计算时再还原成多头的 K 和 V，这是MLA的做法，它本质是压缩的kv特征，但是token数量还是那么多，那个时候V3还没有声称100万token

但如果token数量多到100万，那MLA的做法还是吃不消，100万Token 的超长上下文已成为Agent和复杂推理的标配，百万上下文的KV cache给显存的负担非常难受，所以为了解决这个问题， DeepSeek-V4 attention采用Hybrid Attention，由压缩稀疏注意力CSA和重度压缩注意力HCA构成，极致压缩token数量，同时又捕获重要且必不可少的信息。

本文将会结合DeepSeek-V4论文中的附图和公式，深入拆解一下它的运转机制。

压缩稀疏注意力 CSA
如论文图 3所示，CSA 先在物理维度压缩，再在逻辑维度稀疏寻址，计算过程分为以下三个阶段：

- 物理层面的 KV 压缩 (公式 9-12) 设输入隐藏状态序列为 
![](https://www.zhihu.com/equation?tex=H+%5Cin+%5Cmathbb%7BR%7D%5E%7Bn+%5Ctimes+d%7D)（
![](https://www.zhihu.com/equation?tex=n) 为序列长度，
![](https://www.zhihu.com/equation?tex=d) 为隐藏层维度）。CSA 并不是直接把 
![](https://www.zhihu.com/equation?tex=H) 存进 KV Cache，而是先用两个投影矩阵计算出两组特征 
![](https://www.zhihu.com/equation?tex=C_a%2C+C_b) 和两组对应的压缩权重 
![](https://www.zhihu.com/equation?tex=Z_a%2C+Z_b)（论文中公式9, 10），其实这里也是沿用了V3的投影思想： 
![](https://www.zhihu.com/equation?tex=C_a+%3D+H+%5Ccdot+W_a%5E%7BKV%7D%2C+%5Cquad+C_b+%3D+H+%5Ccdot+W_b%5E%7BKV%7D)

![](https://www.zhihu.com/equation?tex=Z_a+%3D+H+%5Ccdot+W_a%5E%7BZ%7D%2C+%5Cquad+Z_b+%3D+H+%5Ccdot+W_b%5E%7BZ%7D)接下来，模型将每 
![](https://www.zhihu.com/equation?tex=m) 个 Token（压缩率，比如 4）压缩为一个单一的 KV 条目。为了让压缩后的条目融合前后文信息，压缩得分 
![](https://www.zhihu.com/equation?tex=S_a) 和 
![](https://www.zhihu.com/equation?tex=S_b) 会通过带有可学习位置偏置（
![](https://www.zhihu.com/equation?tex=B_a%2C+B_b)）的 Softmax 计算得出（公式11）。最终，第 
![](https://www.zhihu.com/equation?tex=i) 个压缩条目 
![](https://www.zhihu.com/equation?tex=C_i%5E%7BComp%7D) 由 
![](https://www.zhihu.com/equation?tex=S_a) 和 
![](https://www.zhihu.com/equation?tex=S_b) 与原始特征做哈达玛乘积（
![](https://www.zhihu.com/equation?tex=%5Codot)）再求和得到下式（公式12），这里的加数非常有意思，左加数的mi 和 m(i+1)-1这两个下标定义了当前压缩块 i所对应的原始 Token 区间，右加数的m(i-1) 和 mi-1这两个下标定义了上一个压缩块 i-1所对应的原始 Token 区间，一杂交起来，让相邻的压缩块之间产生了平滑的过渡，避免了硬切分带来的边界信息丢失： 
![](https://www.zhihu.com/equation?tex=C_i%5E%7BComp%7D+%3D+%5Csum_%7Bj%3Dmi%7D%5E%7Bm%28i%2B1%29-1%7D+S_%7Ba%2Cj%7D+%5Codot+C_%7Ba%2Cj%7D+%2B+%5Csum_%7Bj%3Dm%28i-1%29%7D%5E%7Bmi-1%7D+S_%7Bb%2Cj%7D+%5Codot+C_%7Bb%2Cj%7D)
![](https://pic2.zhimg.com/v2-a0e94631b7e1bcb4ce9ca1c357e5ceb7_r.jpg)论文图3这一步将 KV Cache 的物理长度缩短为原来的 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B1%7D%7Bm%7D)，对应论文图 3 中间的 <strong>Token-Level Compressor</strong>。

2. 压缩完之后，序列依然很长，为了进一步榨干，CSA 引入Lightning Indexer 来挑选最相关的KV块。 首先，通过对 Query state 
![](https://www.zhihu.com/equation?tex=h_t) 进行低秩投影, 先降维到潜向量 
![](https://www.zhihu.com/equation?tex=c_t%5EQ)，再升维, deepseek常规操作，生成用于索引的查询向量 
![](https://www.zhihu.com/equation?tex=q_t%5EI)（论文公式13, 14，对应论文图3的indexer queries）。 接着，计算 Query 
![](https://www.zhihu.com/equation?tex=t) 与之前所有的压缩块 
![](https://www.zhihu.com/equation?tex=s) 之间的索引得分 
![](https://www.zhihu.com/equation?tex=I_%7Bt%2Cs%7D)。这个得分是通过加权求和所有注意力头的 ReLU 激活内积得到的（如下）： 

![](https://pic1.zhimg.com/v2-fe0b672120db326a01aa4bbc528d5a08_r.jpg)
![](https://www.zhihu.com/equation?tex=I_%7Bt%2Cs%7D+%3D+%5Csum_%7Bh%3D1%7D%5E%7Bn_h%5EI%7D+w_%7Bt%2Ch%7D%5EI+%5Ccdot+%5Ctext%7BReLU%7D%28q_%7Bt%2Ch%7D%5EI+%5Ccdot+K_%7BI%2Cs%7D%5E%7BComp%7D%29)
 最后，采用Top-k 选择器，保留得分最高的 
![](https://www.zhihu.com/equation?tex=k) 个压缩 KV 块（
![](https://www.zhihu.com/equation?tex=C_t%5E%7BSprsComp%7D)），对应论文图3的selected compressed kv entries

3. Shared KV MQA,（论文公式 18-19) ，选出了最核心的 
![](https://www.zhihu.com/equation?tex=k) 个压缩块后，进入注意力计算，Query 向量 
![](https://www.zhihu.com/equation?tex=q_t) 依然是从刚才的潜向量 
![](https://www.zhihu.com/equation?tex=c_t%5EQ) 升维得到的（论文Eq 18）。而在进行多查询注意力（MQA）时，那些被选出来的压缩特征块 
![](https://www.zhihu.com/equation?tex=C_t%5E%7BSprsComp%7D)，同时充当了 Key 和 Value（论文Eq 19）： 
![](https://www.zhihu.com/equation?tex=o_%7Bt%2Ci%7D+%3D+%5Ctext%7BCoreAttn%7D%28%5Ctext%7Bquery%7D%3Dq_%7Bt%2Ci%7D%2C+%5C%2C+%5Ctext%7Bkey%7D%3DC_t%5E%7BSprsComp%7D%2C+%5C%2C+%5Ctext%7Bvalue%7D%3DC_t%5E%7BSprsComp%7D%29)
 Key 和 Value 的共享进一步节省了显存带宽，且借由前置的latent vector复用，将计算量压到了最低。

重度压缩注意力 HCA
如 图 4 所示，对于网络中的某些特征抽象层，模型不需要像CSA那样去精细地做 Top-k 稀疏筛选，而是直接祭出HCA来做极致的物理压缩，HCA 的处理方式与 CSA 类似，不同在于它采用了一个极其庞大的压缩率 
![](https://www.zhihu.com/equation?tex=m%27)（例如 
![](https://www.zhihu.com/equation?tex=m%27%3D128)）。这意味着每 128 个 Token 的缓存会通过计算压缩权重（论文公式22）被暴力加权折叠成 1 个entry（论文Eq 23）。 

![](https://pic3.zhimg.com/v2-6e417a291cc7b697eec775d47e3f8642_r.jpg)因为长度直接缩小了 128 倍，剩下的KV块数已经极少。因此，Query 生成后（Eq 24, 25），直接与所有这些重度压缩的块进行全量的稠密注意力计算（Dense Attention）（Eq 26），省去了复杂的 Indexer 寻址开销。 

但论文发现，不管是压缩（CSA的合并）还是稀疏（Top-k的截断），都非常容易让模型丢失最近期的局部细节。 所以在论文图 3 和 图 4 中都可以看到，在Core Attention的计算环节，除了送入被压缩的特征块外，系统还会拼接一个 Sliding Window KV Entries，这相当于给每个 Query 额外加了点活，但是不给加班工资，最近的 
![](https://www.zhihu.com/equation?tex=n_%7Bwin%7D) 个 Token（如 128 个）完全不压缩、不稀疏，保持原汁原味地参与注意力计算。这保证了模型在具备宏观百万视野的同时，依然能看清眼前的每一个字。 

解决的问题与最终效果 
DeepSeek-V4 将这套混合架构（CSA + HCA）在 Transformer 的不同层交替排布，并配合 FP4 量化的lightning indexer， 计算成本断崖式下跌： 在百万级上下文下，庞大的 DeepSeek-V4-Pro 的单 Token 推理 FLOPs，仅为前代 V3.2 版本的 27%。而参数更为轻量的 Flash 版本，甚至只需 V3.2 的 10%。 KV Cache依靠 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B1%7D%7Bm%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cfrac%7B1%7D%7Bm%27%7D) 的极致物理压缩，辅以 BF16+FP8 的混合存储，V4-Pro 的 KV Cache 直接缩小到了前代的 10%（Flash 版本为 7%）。相比业界主流的 GQA 架构，显存消耗只有其约 2%。  且以往由于显存爆炸，跑满 1M 上下文需要惊人的多卡集群成本。CSA 和 HCA 架构使得 KV Cache 瘦身十倍以上，使得 100万 Token 的推理变得可以常态化、低成本地部署。这也呼应了论文首页摘要的主图

<strong>DSV4-Pro和DSV4-Flash是如何交替CSA和HCA</strong>

- 以包含 61 层的 DeepSeek-V4-Pro 为例，前 2 层使用 HCA 来对输入进行快速的特征提取与重度压缩；而在随后的几十层中，CSA 和 HCA 采用交替（Interleaved）的方式一层层排布（例如：第 3 层 CSA，第 4 层 HCA，第 5 层 CSA……）。
- 在参数更少的 V4-Flash 中，前 2 层使用纯 SWA（滑动窗口注意力），后续层同样交替使用 CSA 和 HCA。