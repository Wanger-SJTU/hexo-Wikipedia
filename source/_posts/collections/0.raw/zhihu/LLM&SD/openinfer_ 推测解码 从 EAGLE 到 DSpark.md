---
title: "openinfer: 推测解码 从 EAGLE 到 DSpark"
date: "2026-07-17 00:00:00"
updated: "2026-07-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/openinfer_-推测解码-从-EAGLE-到-DSpark/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2061569158689698340
---


感谢 openinfer team 的小伙伴们的支持，共同编写了 openinfer 的推测解码代码和该博客。

我们已经在 [OpenInfer](https://link.zhihu.com/?target=https%3A//open-infer.org/models/qwen3-4b/%23dspark-speculative-decoding) 的 Qwen3-4B 上支持 DFlash 和 DSpark 推测解码。单张 RTX 5090 的 ShareGPT 测试中，DSpark 把单流吞吐从 170 提高到 381 token/s，TPOT 从 5.83 ms 降到 2.96 ms；并发为 4 时，吞吐也从 576 提高到 1288 token/s，同时保持输出无损。

这篇文章会拆解推测解码技术本身：draft model 怎么训练，为什么 draft 和 verify 都不是越长越好，以及最新的 DSpark 是怎么做动态 verify 的。

大模型 decode 受限于内存带宽：每输出一个 token，都要把全部权重从显存完整读一遍。8GB 的 dense 模型、800GB/s 带宽，读一遍就是 10ms，单请求极限在 100 token/s。这个上限和请求多少无关，请求复杂度无关，也和 kernel 写得好不好关系不大——带宽利用率无法超越物理极限，一次 forward 就要读取这么多数据。想更快，只有一个办法：让一次 decode forward 吐出不止一个 token。

LLM decode forward 为什么只能吐一个 token？主流 LLM 都是 decoder-only 的 Transformer，attention 带 causal mask，每个位置只能看到自己和左边的 token，整个模型的训练目标就是“给定文本，预测下一个 token”。所以一次 forward 里，真正产出新东西的只有序列最后一个位置——它给出下一个 token 的分布，采样出的 token 拼回序列末尾，才能开始下一次 forward。输出依赖上一步的输出，天然串行。

有个直觉是：模型输出每个 token 的“费力程度”其实并不一致。比如它在写 Rust 的时候，换行之后第一个 token 是 “l”（当然 tokenizer 可能没切那么细），接下来大概率是 “e”、”t”，然后是空格：

```js
let a = 1;
let b = 2;
```

有没有一种办法，能识别出某种 pattern，然后提前猜出模型之后可能输出什么？前提是精度不变：模型拿到这些 hint 后，最终输出仍然要和原始模型一致。

简单的 idea 是：在某一次 decode step 之前，先用某种机制生成若干个后续 tokens，交给模型验证。如果模型接受了 3 个 token，就相当于一次 decode forward 生成了 3 个 token。先暂时忽略 draft 阶段和 verify 阶段的额外开销，那就相当于 10ms 生成 3 个 token，意味着接近 3 倍吞吐，单请求 tps 从 100 token/s 变成 300 token/s。

我们怎么近似衡量一个 token 的输出难易程度？模型本质上输出 logits，不直接输出 tokens。logits 归一化后可以理解为模型选择某个词的概率，比如 `{"a": 0.99, "b": 0.01}`，这代表模型有非常强烈的选 “a” 这个 token 的倾向（虽然这不能直接等同于困难程度）。如果 “a” 和 “b” 各自都是 0.5，那说明模型也不知道该输出什么，存在一定犹豫。

我们将模型每一个输出位置的 logits 都算一次熵，
$H = -\sum_i p_i \log p_i$，这个指标大致表示“平均不确定性”，越小可能代表越确定。

我们以 Qwen3 4B 为例，收集一些 prompt 下模型输出过程中的 logits，观察输出每个 token 时熵的变化。

再次澄清，我不认为这里的“熵”能等价于模型认为输出这个 token 的难度，但两者应该存在一定关系。

我们看一下典型的四个负载

<strong>coding</strong> 来自 HumanEval，prompt 例子如下

 Complete the body of this Python function. Output only the function. def has_close_elements(numbers: List[float], threshold: float) -> bool: …（含 docstring + doctest，OpenAI 代码补全标配）
 Write a Python function is_prime(n) that returns True if n is a prime number and False otherwise.<strong>math</strong> 来自 GSM8K

 Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?<strong>prose</strong> 来源：r/WritingPrompts。刻意避开名著，让模型自由进行创作

 Write a short story based on this writing prompt: You are the last human alive on Earth. Suddenly, you hear a knock on the door.<strong>chat</strong> 来源：MT-Bench Q81 + Alpaca 首条指令

 Compose an engaging travel blog post about a recent trip to Hawaii, highlighting cultural experiences and must-see attractions.之后我们让 Qwen3 4B 贪心生成，每生成一个 token 时，我们记录全词表的 logits，并计算熵。

在展示完整分析之前，我们先看一个来自 math 领域的具体例子，问题是这样的：

 Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?（中文：Natalia 四月把发夹卖给了 48 个朋友，五月卖出的发夹是四月的一半。四月和五月加起来，Natalia 一共卖了多少个发夹？）

模型的回复是这样的

Natalia sold clips to <strong>48 friends</strong> in <strong>April</strong>.

In <strong>May</strong>, she sold <strong>half as many</strong> clips as in April:

$$
\frac{48}{2} = 24
$$

So, in <strong>May</strong>, she sold <strong>24 clips</strong>.

Now, add the number of clips sold in both months:

$$
48 + 24 = 72
$$

<strong>Answer:</strong> Natalia sold <strong>72 clips</strong> altogether in April and May.
我们摘出第一句 “Natalia sold clips to 48 friends in April.”，逐个 token 按生成顺序看它的熵（H 越大越犹豫，p1 是 top-1 概率）：

'N'        H=0.244 p1=0.946   # 要不要先复述题面
'atal'     H=0.000 p1=1.000   # 开始复述，熵很低
'ia'       H=0.000 p1=1.000
' sold'    H=0.000 p1=1.000
' clips'   H=0.050 p1=0.991
' to'      H=0.000 p1=1.000
' **'      H=0.315 p1=0.905   # 要不要给数字加粗
'4'        H=0.000 p1=1.000   # 输出数字
'8'        H=0.000 p1=1.000
' friends' H=0.040 p1=0.993
'**'       H=0.074 p1=0.986
' in'      H=0.000 p1=1.000
' **'      H=0.269 p1=0.924   # 还得加粗
'April'    H=0.000 p1=1.000   # 重复题面
'**'       H=0.002 p1=1.000
'.\n\n'    H=0.040 p1=0.993
大部分结构性输出，比如简单复述题面、复述数字，一旦模型决定了复述和格式，之后的输出就非常确定，熵很低。这意味着我们大概率能用一个小模型，在这些熵低的位置保持较高准确率，一次猜测若干个 token，从而让主模型在一个 forward 里输出多个 token。

![](https://pica.zhimg.com/v2-618fe029ea2d0cadd15f4f9d778acaec_r.jpg)

上左图展示了四个负载下，模型生成回复时的熵变化。code 和 math 的熵更低，输出更确定；chat 和 prose 则更发散。这说明我们也许能在 code 和 math 场景下拿到比较不错的收益。

上右图是理想加速。我们把输出 `top1_prob > 0.9` 标记为模型很确定，找出这样连续的片段。比如第 48 -> 72 个 token，就是连续 24 个 token 都很确定，意味着我们可以 draft 24 个 token 出去给模型验证。在 coding 和 math 场景下，这个数量很大；在 chat 和 prose 下只有 3、2 个，但这只是相对值。

上面的实验验证了一件事：在 code 和 math 场景下，确实有很多输出的难度比较低，我们可以用小模型猜中。

但猜归猜，我们到底怎么保证准确性？怎么保证无损？

我们先从贪心解码说起，也就是采样永远选择概率最大的那个 token。

贪心的验证很简单也很确定：target model 
$M$ 全程取 argmax，所以存在一条<strong>唯一确定</strong>的“标准答案”序列——就是 
$M$ 自己一步步贪心吐出来的那串 token。spec decode 在 greedy 下的“无损”，就是输出和这条标准序列逐 token 完全一致，只是 
$M$ 的 forward 次数变少了。

我们从实际例子出发，假设当前 context 是 
$x_{1:t}$。draft 阶段，我们用小模型 
$q$ 自回归吐 
$\gamma$ 个候选 
$d_1,\dots,d_\gamma$，这是 
$\gamma$ 次小模型 forward，代价很小。verify 阶段，把 
$[x_{1:t}, d_1, \dots, d_\gamma]$ 整条喂进 
$M$，<strong>只跑一次 forward</strong>。

为什么一次 forward 就能拿到多个位置的 verify 呢？我们利用了 causal mask 机制。causal mask 规定位置 
$i$ 只能看 
$1..i$，看不到未来——技术上是把 attention 矩阵指向未来的权重压成 
$-\infty$（softmax 后为 0）。

所以我们可以把多个 draft token 一起塞进去。每个位置的输出都只依赖它自己和左边的 token；有了 mask，每个 token 的计算和正常 decode 时没有差别。比如 draft 了 4 个 token，这次 forward 就像在序列维度上并行处理 5 个 decode 位置。换句话说，这一次 forward 在序列维度上<strong>并行</strong>地、互相隔离地算出了 
$\gamma+1$ 个分布——每个 draft token 所在位置的 hidden state 都在预测它的下一个 token：

喂进去:   x_{1:t}   d1    d2    d3    d4
              │      │     │     │     │
预测下一位: p0     p1    p2    p3    p4      ← 一次 forward，5 个分布
关键在于 
$p_i = M(\cdot \mid x_{1:t}, d_1..d_i)$ 是 
$M$ <strong>真实的</strong>条件分布，没有任何损失。mask 让 
$p_i$ 只 attend 到 
$x$ 和 
$d_1..d_i$，所以它就等于“假如 
$M$ 真被喂了这个前缀，它会给出的 next-token 分布”。verify 这一步没有任何近似， 
$M$ 在一次 forward 里算出了它在每个位置的真实 argmax，这就是无损的来源。

接受的判定也很简单：就是遍历一遍，一直比到第一个不一致。

用前文 Rust 的例子，context 停在换行处，
$M$ 的贪心续写真值是 `let` `␣a` `␣=` `␣1` `;`，draft（
$\gamma=4$）猜了 `let` `␣a` `␣=` `␣2`。

let ␣a ␣=` 三个全中，到 `␣2` 发现不对，因为模型选择了 1，没有选择 2，于是接受前 3 个，再把 `␣1` 当作额外的奖励（因为已经 forward 出来，是对的选择），所以这一轮吐出 `let ␣a ␣= ␣1`，<strong>4 个 token / 1 次 forward</strong>。

所以，<strong>验证的正确性和 draft 怎么来的完全无关。</strong> 
$d_1..d_\gamma$ 是小模型贪心、小模型采样、n-gram 抄上文，还是随机 token，都不影响输出正确性，只影响接受率 
$\alpha$。

但如果我们加上 sampling，比如 top-k、top-p，验证就会变得棘手一些，因为合法输出不止一个。我们对“无损”的定义可能要变成：是否开启推测解码，在用户层面感知不到区别；反复生成很多次后，两者的输出分布应该一致。

比如开了 `top_k=2`，那么 “a” 或者 “b” 都可能是合法输出。但如果 draft 只给 “b”，因为它合法，我们就无脑接受，就会丧失 sampling 给予 model 本身的随机性。换句话说，如果同时开启推测解码和 sampling，针对同一个请求生成很多回复，这些回复的分布并不等价于 base model 自己的 sampling 结果。

所以我们该怎么解决这个问题呢？第一个解决方案来自 DeepMind 的论文 [Accelerating Large Language Model Decoding with Speculative Sampling](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.01318)。

这个方案的直觉其实不复杂。draft 会按它自己的分布 
$q$ 不停提议 token，而我们真正想要的是 target 的分布 
$p$。对每一个具体的 token，就看两个东西：主模型想要它的频率 
$p$，和 draft 提议它的频率 
$q$。

draft 提得比主模型想要的少（
$q < p$）：那很简单，它每次提我们都收，剩下的缺口 
$(p-q)$ 自己会补上就行。

反过来，如果 draft 提得比我们想要的多（
$q > p$）：全收下这个 token 肯定是“有损”的。所以它每提一次，我们只按 
$p/q$ 的概率留下，正好凑够 
$p$。

用数学的话说是这样的

对于**某一种货 
$x$**，只有两个比例：

- 
$p$ = 标准量，我们想要的比例。
- 
$q$ = 机器量，自动补货机习惯堆的比例。关键恒等式，一行：

$$\underbrace{\min(p,q)}_{\text{重叠}} + \underbrace{(p-q)_+}_{\text{缺口}} = p$$


- <strong>重叠</strong> 
$\min(p, q)$：取两者里小的那个，也就是机器供得上、我也正好要的部分。
- <strong>缺口</strong> 
$(p - q)_+$：下标 `+` 的意思是负数归零，也就是我还想要、但机器没堆够的部分。为什么一定成立？

- **机器堆得不够（
$p > q$）**：机器堆的我全收（重叠 
$= q$），剩下差的我自己补（缺口 
$= p - q$），加起来正好 
$p$。
- **机器堆得过多（
$p < q$）**：我够用了，要多少只用多少（重叠 
$= p$），不缺，所以缺口 
$= 0$，加起来还是 
$p$。机器多堆的那块不在这个等式里，它是收货时要按概率退掉的部分，不进货架。另一种更工程化的方式，也是现在 OpenInfer 的方式：先让主模型按自己的 sampling 采出一个 token，再和 draft 给出的 token 对比；相同就接受，不同就丢弃。这样做会轻微影响接受率，但实测影响较小。除非 sampling 参数很“开放”，大部分时候模型输出会集中在少数 token 上，接近 greedy。

但这取决于实际的负载和实际的 MTP，包括实际服务时收到的 sampling 参数。

如何训练一个 draft model：以 EAGLE 为例
传统或者比较 naive 的做法，就是基于 token 去做，类似一个纯函数：给定一个 token list，输出一个 token list，在 token 层面去预测。这种做法虽然比较直观，但接受率不太高。

[EAGLE](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.15077) 一开始使用了 logits 之前的 hidden state，加上往前挪一个时间步的 token embedding（也就是上一步实际采样出来的 token），作为 draft model 的输入。本体是一个单层自回归 Transformer。它直接预测 hidden state，之后仍然用主模型的 `lm_head` 完成 hidden -> logits -> token 的转换。

这样的话，训练也很简单：用 target LLM 跑训练文本，收集 hidden state，构造训练样本。这里可以选择让 target LLM 跑真实文本集的 prefill 来获取 hidden state，也可以选择让它生成回答，获取 decode 阶段的 hidden state 作为训练数据。根据 EAGLE 论文，先用固定数据集（回答也是数据集里的）生成就可以实现 2.78 倍加速；如果将回答替换为 target 自己生成，可以实现 2.88 倍，虽然有上涨，但不大。

损失函数是这样定义的

```text
L = L_reg + 0.1 * L_cls

L_reg = SmoothL1(f, f̂)

L_cls = CE(p, p̂) = - Σ_k p[k] * log(p̂[k])
```

前者保证 hidden state 预测的准确性，后者保证 draft model 和 target model 的 token 分布接近。两者都是为了同一个目的：提高接受率。我觉得这里 loss 没有走第一性原理去定义，这也是后面 EAGLE-3 的一个动机。

这里还有一个问题：draft 生成的是一条链，token 1、2、3、4。如果 token 1 就被拒绝，2、3、4 也就作废了。我们可以一个位置猜多个，生成一个 tree，也就是多条链，这样提升被接受的可能，见这篇[解释](https://zhuanlan.zhihu.com/p/1908249002421511962)。

虽然基于 tree 能把接受长度拉到很高，在小 batch size 下可以大幅提升吞吐。但 tree 也不是越大越好：[JetSpec](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2606.18394) 把 budget 从 128 加到 256 时，每 100 个额外验证节点换来的 accepted token 比上一档少了约 
$81\%$。

![](https://pic4.zhimg.com/v2-af9a0d1e471381ad70757bba95de5b69_r.jpg)

EAGLE-3 会同时拿三层 hidden：
$l,m,h$，然后用一个全连接降至“单层”，从而获得一个整合了不同层级信息的特征。同时，EAGLE-3 的训练目标只看 token 分布，这使得 EAGLE-3 更容易 scale。

也可以把这个 draft 换成 diffusion model，一次生成多个 token，例如 [DFlash](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2602.06036)，也就是 OpenInfer 接入的 DFlash。

DSpark 的 loss 也是两部分，一方面要猜得准，另一方面分布要接近。

推测解码收益计算
假设 draft 一次生成 
$\gamma$ 个 token，每个位置被接受的概率都是 
$\alpha$。第一个 token 能带来 
$\alpha$ 个期望产出，第二个必须在前两个都被接受时才有用，贡献是 
$\alpha^2$，第 
$i$ 个的贡献则是 
$\alpha^i$。此外，无论 draft 在哪里失败，target 都会给出一个修正 token。因此一轮 verify 的期望产出是

$$\mathbb{E}(n) =1+\alpha+\alpha^2+\cdots+\alpha^\gamma =\frac{1-\alpha^{\gamma+1}}{1-\alpha}.$$


简单说就是：draft 越长，后面的 token 越难被接受。每增加一个 draft token，只多得到 
$\alpha^\gamma$ 的期望产出；当 
$\gamma\to\infty$ 时，总产出也只会趋近 
$1/(1-\alpha)$。例如当 
$\alpha=0.5$ 时，不管 draft 多长，一轮平均都不会超过 2 个 token；
$\alpha=0.9$ 时，上限才会提高到 10 个。

一轮能产出多少 token，还不能直接等同于加速多少，因为生成 draft 和 verify 都要花时间。把普通 decode 生成一个 token 的耗时作为 1，假设 draft model 生成一个 token 的相对成本是 
$c$，一次验证 
$\gamma+1$ 个位置的相对成本是 
$v_\gamma$。那么一轮推测解码总共花掉 
$\gamma c+v_\gamma$ 份时间；同样的时间，普通 decode 可以生成 
$\gamma c+v_\gamma$ 个 token，而推测解码平均生成 
$\mathbb{E}(n)$ 个。因此加速比近似为

$$S(\gamma) \approx \frac{\mathbb{E}(n)}{\gamma c+v_\gamma} = \frac{1+\alpha+\cdots+\alpha^\gamma}{\gamma c+v_\gamma}.$$


分母表示：每多 draft 一个 token，都要支付一份近似固定的成本，而且成本可能随着 decode 越来越偏向 compute bound 而变大（斜率增长）。但第 
$i$ 个 draft token 带来的期望收益只有 
$\alpha^i$。收益越来越小，成本却不会随之消失；当下一个 token 的边际收益抵不过它增加的 draft 和 verify 开销时，继续拉长 draft 反而会降低加速比。因此 
$\gamma$ 继续增大不一定更好，通常存在一个最优值。

低 batch 时系统通常受内存带宽限制，verify 一次处理 
$\gamma+1$ 个位置，与普通 decode 处理一个位置的耗时相近，即 
$v_\gamma\approx1$。此时

$$S(\gamma)\approx\frac{1+\alpha+\cdots+\alpha^\gamma}{1+\gamma c}.$$


只要前几个 
$\alpha^i$ 带来的收益大于 draft 的额外成本，就能获得加速。以 
$\alpha=0.9,\gamma=4,c=0.15$ 为例，加速比约为 
$4.1/1.6\approx2.6$。

高 batch 时系统逐渐转为计算受限，verify 的成本会随位置数增长，
$v_\gamma\approx\gamma+1$。这时分母近似线性增长，分子却逐渐收敛，被拒绝的 draft token 都变成了无效计算，加速比很快跌到 1 以下。

动态 verify 长度
在采用 DFlash style 的 draft model 后，draft 也许已经不是成本的大头，真正昂贵的是 target model 的 verify。

[vLLM 的一组实测](https://link.zhihu.com/?target=https%3A//github.com/vllm-project/vllm/pull/45953%23issuecomment-4759625267)里，动态缩短 verify 长度让 acceptance length 下降 
$4.5\%$，吞吐提高 
$59.8\%$、TPOT 降低 
$41.2\%$。

![](https://pic4.zhimg.com/v2-f1c85a744ba74b270e276271a42b524b_r.jpg)一个实际方案是 DSpark 的动态 verify。前面为了方便建模，我们假设每个位置的接受概率都是同一个 
$\alpha$；DSpark 则为每个请求、每个位置分别预测接受概率，再动态决定其中多少个值得送给 target model 验证。

具体来说，DSpark 在 draft model 上增加了一个 confidence head，输入当前位置的 hidden state 
$h_{r,j}$ 和前一个 draft token 的 embedding，经过一次线性投影和 sigmoid，预测当前位置的条件接受率：

$$c_{r,j} =\sigma\!\left(w^\top[h_{r,j};W_1[x_{r,j-1}]]\right) \approx P(\text{第 }j\text{ 个被接受}\mid\text{前面的 token 都被接受}).$$


它的训练数据集也不需要真的采样很多次来统计，而是直接用 draft 和 target 在这个位置的分布差异计算：

$$c_{r,j}^{*}=1-\frac{1}{2}\left\|p_{r,j}^{d}-p_{r,j}^{t}\right\|_1.$$


 它预测的是：在当前上下文和 draft 分布下，从这个位置采样一个 token，平均有多大概率通过 target verification。也就是 speculative sampling 在该位置的期望接受率。因此每个请求、每个 draft 位置都会有一个 confidence，但每个位置只输出一个标量。

confidence head 也许能判断 token 是否靠谱，但不一定知道到底有多靠谱。它报 0.9，真实接受率可能只有 0.8。

而后续做决定时需要把 c 连乘，如果高估，会放大 verify 成本。所以 DSpark 有一次事后校准，给每个位置一个 T 去压低置信度（当然感觉是训练的问题，需要算法哥发力，我自己觉得这个方案不太优雅）。

$c_{r,j}$ 是第 
$j$ 个 token 在“前面的 token 都通过”的条件下，自己被接受的概率。但第 
$j$ 个 token 真正能派上用场，必须从第一个位置开始一路都通过，因此它的前缀生存概率是

$$a_{r,j}=\prod_{i=1}^{j}c_{r,i}.$$


例如 
$c_{r,1}=0.9,c_{r,2}=0.8,c_{r,3}=0.7$，那么第三个 token 真正能产生收益的概率是

$$a_{r,3}=0.9\times0.8\times0.7=0.504.$$


怎么选择 verify 长度
假设当前 batch 里有 
$R$ 个请求，调度器为每个请求选择验证长度

$$\ell_r\in\{0,\ldots,\gamma\}.$$


请求 
$r$ 验证 
$\ell_r$ 个 draft token 时，target model 一共要处理 
$1+\ell_r$ 个位置。整个 verification batch 的位置数是

$$B=\sum_{r=1}^{R}(1+\ell_r),$$


一轮的期望产出则是

$$\tau =\sum_{r=1}^{R} \left(1+\sum_{j=1}^{\ell_r}a_{r,j}\right).$$


如果只最大化 
$\tau$，答案永远是把所有 draft token 都送去 verify，因为这没有考虑 target forward 会随着 
$B$ 增大而变慢。

所以我们需要 verify 的成本，DSpark 会在引擎初始化时，实际测出 target model 在不同 
$B$ 下每秒能执行多少个 forward step，记作 
$\operatorname{SPS}(B)$。这是针对当前模型和硬件 profile 出来的一张查找表。

调度器真正优化的是系统期望吞吐：

$$\Theta=\tau\cdot\operatorname{SPS}(B).$$


多验证一个 token，可能会增加期望产出 
$\tau$，但也会扩大 
$B$、降低 
$\operatorname{SPS}(B)$。动态 verify 要找的，就是这两者乘积最高的位置。

怎么找到最优长度
DSpark 把所有请求的候选位置 
$(r,j)$ 一起比较，每个位置的边际收益就是 
$a_{r,j}$，然后按 
$a_{r,j}$ 从高到低逐个加入 verification batch。每加入一个 token，就更新 
$B$ 和 
$\tau$，查询新的 
$\operatorname{SPS}(B)$，再计算一次 
$\Theta$。

因为连乘且置信度 <= 1，所以同一个请求里

$$a_{r,j}\leq a_{r,j-1},$$


不会出现选了某个请求的第三个 token，却没有选它前两个 token 的情况。

最终，高 confidence 的请求会得到更长的 verify prefix，低 confidence 的请求会更早截断。

低负载时，多验证几个 token 几乎不影响 
$\operatorname{SPS}(B)$，调度器会保留更长的前缀；负载升高后，额外 token 会挤占 batch capacity，最优验证长度就会自动缩短。

在逐个加入候选 token 的时候，如果发现

$$\Theta\leq\Theta_{\text{best}},$$


就停止继续扩大 verification batch。简单说，如果继续加入 token 不能带来更高吞吐，就停下。

但有时真实硬件的 
$\operatorname{SPS}(B)$ 曲线是不平滑的，可能突然跨过某个 kernel 或并行度的台阶，吞吐反而变好。如果在第一次下降时就停止，容易停在局部最优点。

后续还可以维护更多 profile 信息，思路类似数据库 CBO：用代价模型避免停在局部最优。