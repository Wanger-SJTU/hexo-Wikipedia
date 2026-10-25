---
title: 原创：两行代码，让 PostLN 成为 Transformer 的最优解（比 PreLN 收敛更快更准，且无需 warmup）
date: "2022-02-18 00:00:00"
updated: "2022-02-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/原创-两行代码,让-PostLN-成为-Transformer-的最优解(比-PreLN-收敛更快更准,且无需-warmup)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/466943663
---


我发现，PostLN 的初始收敛困难，不是中间层的梯度问题，而是最初的嵌入层的梯度问题。通过两行代码，可以让 PostLN 的初始收敛从蓝线变成绿线，比 PreLN 收敛快得多：

![](/images/collections/0.raw/zhihu/dl%E8%AE%BA%E6%96%87/asset/img_991083f035e9.jpg)

具体原因是，如果你 print 嵌入层，会发现，它在每步的移动大致是 lr 的程度，而它的初始值通常是 std=0.02 的正态分布，因此，网络需要很多步才能跳出初始的噪音嵌入，也容易被卡住。

`初始嵌入：
[[-0.0073  0.0062 -0.0261 ...  0.0086  0.0107 -0.008 ] ... ]
优化器 lr=4e-4 一步之后的嵌入，方向和初始嵌入仍然类似：
[[-0.0069  0.0066 -0.0265 ...  0.009   0.0111 -0.0084] ... ]`

解决方法是，应将嵌入层初始化为很小的随机值：

`if isinstance(module, (nn.Linear)):
	module.weight.data.normal_(mean=0.0, std=0.01) # I always use 0.01 instead of 0.02
if isinstance(module, (nn.Embedding)):
	module.weight.data.normal_(mean=0.0, std=1e-5) # tiny values, instead of 0.01`

然后优化器一步就可以跳出初始的噪音嵌入，立即走上正轨（虽然值也只改变一点，但是方向明显变化）。

我也测试过后续和最终收敛。对于各种 transformer 架构，调整嵌入层初始化后，PostLN 永远比 PreLN 强。<strong>最终如果炼到 2.x 的 loss 可以差 0.05~0.1（中文字符语言模型）。</strong>

<strong>代码：</strong>

[](https://link.zhihu.com/?target=https%3A//github.com/BlinkDL/SmallInitEmb)

这里的 PreLN 代码。PreLN 有个缺陷，|x| 会逐层增大，因此我一直认为它并非完美。

`x = x + self.att(self.ln1(x))
x = x + self.ffn(self.ln2(x))`

这里的 PostLN 代码。注意 ln1 ln2 都放在层前面，最后还会有个额外的输出 ln。这样所有层都拥有 ln。

`x = self.ln1(x) # 根据更多朋友的测试，把整个模型的第一个这个 LayerNorm 改成 FixedNorm 有时效果更好
x = x + self.att(x)
x = self.ln2(x)
x = x + self.ffn(x)
(there will be another layernorm after the final ffn)`

<strong>另外，这个方法对于 PreLN 也有效，只需在使用 stdev=1e-5 初始化的 emb 之后加上 LayerNorm（请试试 FixedNorm/ScaleNorm/RMSNorm/... 有时效果更好）。</strong>

<strong>如果用可训练的绝对位置编码，那么把绝对位置编码也加上 LayerNorm/FixedNorm/ScaleNorm/RMSNorm/... 然后再相加。可以自己试试哪种 Norm 效果最好。</strong>

补充：一个正常的语言模型，应该在几分钟内收敛到 2gram 的水准（也就是对齐嵌入层和输出层），也就是 loss 应该很快降到 4.x。如果 loss 在 5 以上，说明头尾的 matrix 都没有对齐。嵌入层的准确度，对于初始的收敛，非常关键。
