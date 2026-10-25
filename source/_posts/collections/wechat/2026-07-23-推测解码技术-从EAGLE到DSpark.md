---
title: draft model 怎么训练、DSpark 如何做动态 verify？从 EAGLE 到 DSpark，拆解最新的推测解码技术
date: "2026-07-23 00:00:00"
updated: "2026-07-23 00:00:00"
layout: post
permalink: /collections/wechat/2026-07-23-推测解码技术-从EAGLE到DSpark/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 推测解码
  - speculative-decoding
  - EAGLE
  - DSpark
  - draft-model
  - LLM-inference
---


# draft model 怎么训练、DSpark 如何做动态 verify？从 EAGLE 到 DSpark，拆解最新的推测解码技术

<strong>作者</strong>：SuSun | <strong>公众号</strong>：青稞AI | <strong>知乎</strong>：[原文链接](https://zhuanlan.zhihu.com/p/2061569158689698340)

感谢 openinfer team 的小伙伴们的支持，共同编写了 openinfer 的推测解码代码和该博客。

我们已经在 OpenInfer[1] 的 Qwen3-4B 上支持 DFlash 和 DSpark 推测解码。单张 RTX 5090 的 ShareGPT 测试中，DSpark 把单流吞吐从 170 提高到 381 token/s，TPOT 从 5.83 ms 降到 2.96 ms；并发为 4 时，吞吐也从 576 提高到 1288 token/s，同时保持输出无损。

这篇文章会拆解推测解码技术本身：draft model 怎么训练，为什么 draft 和 verify 都不是越长越好，以及最新的 DSpark 是怎么做动态 verify 的。

## 大模型 decode 受限于内存带宽

每输出一个 token，都要把全部权重从显存完整读一遍。8GB 的 dense 模型、800GB/s 带宽，读一遍就是 10ms，单请求极限在 100 token/s。

这个上限和请求多少无关，请求复杂度无关，也和 kernel 写得好不好关系不大——带宽利用率无法超越物理极限，一次 forward 就要读取这么多数据。想更快，只有一个办法：让一次 decode forward 吐出不止一个 token。

## LLM decode forward 为什么只能吐一个 token？

主流 LLM 都是 decoder-only 的 Transformer，attention 带 causal mask，每个位置只能看到自己和左边的 token，整个模型的训练目标就是"给定文本，预测下一个 token"。

所以一次 forward 里，真正产出新东西的只有序列最后一个位置——它给出下一个 token 的分布，采样出的 token 拼回序列末尾，才能开始下一次 forward。输出依赖上一步的输出，天然串行。

有个直觉是：模型输出每个 token 的"费力程度"其实并不一致。比如它在写 Rust 的时候，换行之后第一个 token 是 "l"（当然 tokenizer 可能没切那么细），接下来大概率是 "e"、"t"，然后是空格：

```
let a = 1;
let b = 2;
```

有没有一种办法，能识别出某种 pattern，然后提前猜出模型之后可能输出什么？前提是精度不变：模型拿到这些 hint 后，最终输出仍然要和原始模型一致。

简单的 idea 是：在某一次 decode step 之前，先用某种机制生成若干个后续 tokens，交给模型验证。如果模型接受了 3 个 token，就相当于一次 decode forward 生成了 3 个 token。

先暂时忽略 draft 阶段和 verify 阶段的额外开销，那就相当于 10ms 生成 3 个 token，意味着接近 3 倍吞吐，单请求 tps 从 100 token/s 变成 300 token/s。

## 我们怎么近似衡量一个 token 的输出难易程度？

模型本质上输出 logits，不直接输出 tokens。logits 归一化后可以理解为模型选择某个词的概率，比如 `{"a": 0.99, "b": 0.01}`，这代表模型有非常强烈的选 "a" 这个 token 的倾向。如果 "a" 和 "b" 各自都是 0.5，那说明模型也不知道该输出什么，存在一定犹豫。

我们将模型每一个输出位置的 logits 都算一次熵 H = -Σ p_i * log(p_i)，这个指标大致表示"平均不确定性"，越小可能代表越确定。

以 Qwen3 4B 为例，收集一些 prompt 下模型输出过程中的 logits，观察输出每个 token 时熵的变化。

四个典型负载：
- <strong>coding</strong>：来自 HumanEval
- <strong>math</strong>：来自 GSM8K
- <strong>prose</strong>：来自 r/WritingPrompts
- <strong>chat</strong>：来自 MT-Bench Q81 + Alpaca

## 熵分析实例

以 math 题为例：

> Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?

模型回复中逐 token 的熵：

| Token | H | p1 | 说明 |
|-------|---|----|------|
| 'N' | 0.244 | 0.946 | 要不要先复述题面 |
| 'atal' | 0.000 | 1.000 | 开始复述，熵很低 |
| ' **' | 0.315 | 0.905 | 要不要给数字加粗 |
| '4' | 0.000 | 1.000 | 输出数字 |
| ' friends' | 0.040 | 0.993 | |

大部分结构性输出，一旦模型决定了复述和格式，之后的输出就非常确定，熵很低。这意味着我们大概率能用一个小模型，在这些熵低的位置保持较高准确率，一次猜测若干个 token。

code 和 math 的熵更低，输出更确定；chat 和 prose 则更发散。

## 贪心解码的验证

贪心解码下，target model 全程取 argmax，存在一条唯一确定的"标准答案"序列。spec decode 在 greedy 下的"无损"，就是输出和这条标准序列逐 token 完全一致，只是 forward 次数变少了。

<strong>draft 阶段</strong>：用小模型自回归吐 K 个候选 d1...dK，这是 K 次小模型 forward，代价很小。

<strong>verify 阶段</strong>：把整条喂进 target model，只跑一次 forward。

为什么一次 forward 就能拿到多个位置的 verify？利用 causal mask 机制。mask 规定位置 i 只能看 1..i，看不到未来。所以可以把多个 draft token 一起塞进去，每个位置的输出都只依赖它自己和左边的 token；每个 token 的计算和正常 decode 时没有差别。

```
喂进去:   x_{1:t}   d1    d2    d3    d4
            │      │     │     │     │
预测下一位: p0     p1    p2    p3    p4    ← 一次 forward，5 个分布
```

关键是 p_i 是 target 真实的条件分布，没有任何损失。mask 让 p_i 只 attend 到 x_{1:t} 和 d_{<i}，所以它就等于"假如 d_{<i} 真被喂了这个前缀，它会给出的 next-token 分布"。verify 这一步没有任何近似——在一次 forward 里算出了它在每个位置的真实 argmax，这就是无损的来源。

接受的判定也很简单：遍历一遍，一直比到第一个不一致。

## Sampling 下的推测解码

如果同时开启推测解码和 sampling，针对同一个请求生成很多回复，这些回复的分布并不等价于 base model 自己的 sampling 结果。比如开了 top_k=2，"a" 和 "b" 都合法，但如果 draft 只给 "b"，无脑接受就会丧失 sampling 给予 model 本身的随机性。

<strong>DeepMind 的 Speculative Sampling</strong> 方案：对每一个具体的 token，看主模型想要它的频率 q(x) 和 draft 提议它的频率 p(x)。

- draft 提得比主模型想要的少 (p < q)：全收，剩下的缺口 (q-p) 自己补上
- draft 提得比主模型想要的多 (p > q)：每提一次只按 q/p 的概率留下

<strong>工程化方案</strong>（OpenInfer 的方式）：先让主模型按自己的 sampling 采出一个 token，再和 draft 给出的 token 对比；相同就接受，不同就丢弃。实测影响较小。

## 如何训练 draft model：以 EAGLE 为例

Naive 做法：基于 token 去做，类似纯函数，接受率不太高。

<strong>EAGLE</strong>：使用 logits 之前的 hidden state，加上往前挪一个时间步的 token embedding，作为输入。本体是一个单层自回归 Transformer，直接预测 hidden state，之后用主模型的 lm_head 完成 hidden → logits → token 的转换。

训练数据：用 target LLM 跑训练文本，收集 hidden state。EAGLE 论文显示，用固定数据集 prefill 可实现 2.78 倍加速；用 target 自己生成的 decode 数据可实现 2.88 倍。

损失函数：
```
L = L_reg + 0.1 * L_cls
L_reg = SmoothL1(f, f̂)
L_cls = CE(p, p̂) = -Σ_k p[k] * log(p̂[k])
```
前者保证 hidden state 预测准确性，后者保证 draft 和 target 的 token 分布接近。

也可以把 draft 换成 diffusion model，一次生成多个 token，例如 DFlash。

## 推测解码收益计算

假设 draft 一次生成 K 个 token，每个位置被接受的概率都是 α。

一轮 verify 的期望产出：
```
E[accepted] = Σ_{k=1}^{K} α^k + 1
```

当 α < 1 时，总产出趋近 1/(1-α)。α=0.5 时不管 draft 多长，一轮平均不超过 2 个 token；α=0.9 时上限提高到 10 个。

加速比近似为：
```
speedup ≈ (Σ_{k=1}^{K} α^k + 1) / (c_d * K + c_v(K))
```

分母表示每多 draft 一个 token，都要支付一份近似固定的成本。第 k 个 draft token 带来的期望收益只有 α^k，收益越来越小，成本却不会消失。当边际收益抵不过增加的 draft 和 verify 开销时，继续拉长 draft 反而会降低加速比。因此 K 继续增大不一定更好，通常存在一个最优值。

<strong>低 batch</strong>（内存带宽限制）：verify 一次处理 K 个位置与处理一个相近（c_v ≈ 1），只要前几个 K 的收益大于 draft 额外成本就能加速。

<strong>高 batch</strong>（计算受限）：verify 成本随位置数增长，加速比很快跌到 1 以下。

## 动态 verify 长度：DSpark

vLLM 实测：动态缩短 verify 长度让 acceptance length 下降 4.5%，吞吐提高 59.8%、TPOT 降低 41.2%。

<strong>DSpark 的方案</strong>：为每个请求、每个位置分别预测接受概率，动态决定多少个值得送给 target model 验证。

在 draft model 上增加一个 <strong>confidence head</strong>，输入当前位置的 hidden state 和前一个 draft token 的 embedding，经过一次线性投影和 sigmoid，预测当前位置的条件接受率。

训练数据直接用 draft 和 target 在该位置的分布差异计算，不需要真的采样很多次来统计。

<strong>事后校准</strong>：给每个位置一个 T 去压低置信度，因为 confidence head 高估时会放大 verify 成本（连乘效应）。

<strong>调度器优化</strong>：

假设 batch 里有 N 个请求，请求 i 验证 k_i 个 draft token 时，target model 一共要处理 Σk_i 个位置。调度器优化的是系统期望吞吐：

```
maximize: throughput(B_total) × E[accepted_per_step]
```

把所有请求的候选位置一起比较，按边际收益从高到低逐个加入 verification batch。每加入一个 token，更新 B_total 并查询新的 throughput。当继续加入 token 不能带来更高吞吐时停止。

高 confidence 的请求会得到更长的 verify prefix，低 confidence 的会更早截断。低负载时调度器保留更长前缀；负载升高后最优验证长度自动缩短。

## 引用

- [1] OpenInfer: https://open-infer.org/models/qwen3-4b/#dspark-speculative-decoding
- [2] Accelerating Large Language Model Decoding with Speculative Sampling: https://arxiv.org/abs/2302.01318
- [3] 推测解码解释: https://zhuanlan.zhihu.com/p/1908249002421511962
- [4] JetSpec: https://arxiv.org/abs/2606.18394
- [5] DFlash: https://arxiv.org/pdf/2602.06036

原文链接: https://mp.weixin.qq.com/s?__biz=MzI1MzEwMzIwOQ==&mid=2247517847&idx=1&sn=ba12a4ca727669d7fa6ee17574e38d57