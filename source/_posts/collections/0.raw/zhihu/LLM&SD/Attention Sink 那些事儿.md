---
title: Attention Sink 那些事儿
date: "2026-01-01 00:00:00"
updated: "2026-01-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/Attention-Sink-那些事儿/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1990116555888035411
---


Attention Sink 这一概念的正式出现，是 2023 年 9 月在 arxiv 上发布的论文《[Efficient Streaming Language Models with Attention Sinks](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DNG7sS51zVF)》（2024 年 ICLR 收录）中被提出。但实际上，在 2023 年的 4 月份，空门在研究 Llama 时已经发现了该现象 [Perpetual Sampling with LLaMA-30B - 空门的文章 - 知乎](https://zhuanlan.zhihu.com/p/619703849)。

<strong>问</strong>：那么，什么是 attention sink 呢？

<strong>Attenion Sink（注意力汇聚、黑洞、沉井，我更喜欢翻译为锚点）</strong>是一种在 Transformer 架构语言模型中出现的现象，特指模型在处理序列时，<strong>初始位置的 token 会吸收大量与语义无关的注意力权重的现象</strong>。这种现象在自回归语言模型中尤为明显。

![](https://pic2.zhimg.com/v2-b6a203cb4c92791caf0b1c6755c9abc7_r.jpg)如上图（左）所示，在 decoder-only 架构的 casual 注意力得分矩阵的可视化图中可以发现，序列中后续 token 对初始位置的 token 给予较高的注意力分数。换言之，<strong>后续 token 的 Q 与初始位置 token 的 K 的内积值很高，因此在经过 softmax 和 scale 之后，继续保持很高的占比</strong>。

![](https://www.zhihu.com/equation?tex=Attention%28Q%2C+K%2C+V%29+%3D+softmax%28%5Cfrac%7BQK%5ET%7D%7B%5Csqrt%7Bd_k%7D%7D%29V+%5Ctag%7B1%7D) <strong>那么，StreamingLLM 是如何发现 attention sink？以及 attention sink 有什么影响？</strong>

[Efficient Streaming Language Models with Attention Sinks](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DNG7sS51zVF) 这篇论文的核心并不是在介绍 attention sink，而是为了缓解 long context 场景下性能急剧下降的问题。<strong>在多轮对话等需要长互动的流式应用中部署 LLMs，迫切需要解决两个主要挑战。首先，在解码阶段，缓存先前 token 的状态</strong>（<strong>KV</strong>，self-attention 中的 K 和 V 向量，在 LLM 的推理优化中常被简称为 kv，与之相关的概念是 kv cache）<strong>会消耗大量显存</strong>（关于 LLM 显存的计算可参阅 [分析transformer模型的参数量、计算量、中间激活、KV cache](https://zhuanlan.zhihu.com/p/624740065)）。<strong>其次，流行的 LLMs 无法泛化到比训练序列长度更长的文本</strong>。

为了控制 long context infer 的显存，大家开始尝试使用窗口注意力，该方法会预先设置窗口的大小，当 context 超过窗口大小时，就会移动窗口来吸纳新的 token，同时丢弃前面的 token，始终将 token 数控制窗口大小内，其中 L 小于 T。但窗口注意力仍然会出现 PPL 爆炸的问题。

![](https://pic3.zhimg.com/v2-8b6ef69ea4c20a0530e800f8ab3d2cda_r.jpg)图 - 流式 LLM 与现有方法的对比该语言模型在长度为 L 的文本上进行预训练，预测第 T 个 token（T >> L）。

- (a) 窗口注意力具有 O(T^2) 的时间复杂度和不断增加的缓存大小。当文本长度超过预训练文本长度时，其性能会显著下降。
- (b) 窗口注意力通过缓存最近的 L 个 token 的 KV 来提高效率，但在推理中会因重新计算而性能急剧下降。
- (c) 滑动窗口注意力结合了最近的 L 个 token 和重新计算的 KV 状态，用于稳定的关注计算。虽然它在长文本上的表现良好，但其 O(TL^2) 的复杂度，源于上下文中重新计算的注意力，使其速度明显变慢。
- (d) 流式 LLM 保持了 attention sink（几个初始 token），以确保稳定的注意力计算，并结合最近的 token。它在扩展文本上表现出色，提供了稳定的性能。StreamingLLM 观察到一个有趣的现象，即<strong>保持初始 token 的 KV 状态可以显著恢复窗口注意力的性能</strong>。他们做了一个实验：测试不同模型和方法在 20K token 文本上的 PPL。

![](https://pica.zhimg.com/v2-0289d4d9b46c78227cb108d169a4d734_r.jpg)图 - 在包含 20K token 的文本上，不同 LLM 的语言建模 PPL<strong>实验结论</strong>：

- 当输入长度超过模型预训练时的 context length 时，dense 注意力机制失效。
- 当输入长度超过 kv cache 大小时，窗口注意力机制失效。作者认为这是由于初始 token 在窗口内被移除所致。这表明，无论初始 token 与预测 token 的距离有多远，它们对于保持 LLM 的稳定性都至关重要。
探究 attention sink 现象
<strong>问</strong>：为什么在去除初始 token 的 KV 时 LLM 会崩溃？

![](https://picx.zhimg.com/v2-d9bf2af0998ce41460ad7f866f1d864d_r.jpg)从 Llama2-7B 模型的所有层和头中可视化注意力矩阵，可以发现，在所有层和头中，除了最底层（layer 0）之外，模型一致地集中在初始 token 上。这意味着：<strong>去除这些初始 token 的 KV 将减少 softmax 函数中的分母部分，从而导致注意力分数分布发生显著变化</strong>，偏离正常推理设置下的预期分布。

![](https://www.zhihu.com/equation?tex=SoftMax%28x%29_i+%3D+%5Cfrac%7Be%5E%7Bx_i%7D%7D%7Be%5E%7Bx1%7D+%2B+%5Csum_%7Bj%3D2%7D%5EN+e%5E%7Bx_j%7D%7D%2C+%5Cquad+x1+%3E%3E+x_j%2C+j+%5Cin+2%2C+%5Cldots%2C+N+) 

那么，这些初始 token 到底对当前位置 token 的注意力加权和带来了什么？有两种可能的解释：（1）它们的语义至关重要；（2）模型学习了对这些 token 绝对位置的偏爱。

为赋新词强说愁：语义不重要
对于第（1）种解释“它们的语义至关重要”这难以解释得通，因为在 decoder-only casual language model 架构中，初始 token 能“看到”的 token 非常有限，甚至有些初始 token 就是首个 token，它仅能看到自己。对于首个 token 来说，多层 transformer block 仅仅是 MLP 的堆叠，它没有和其他 token 有任何信息上的交互。虽然先前有 prefix-tuning 和 p-tuning 之类的方法，在 prompt 开头预设 token，用该预设 token 来替代 instruction 以及将生成限定在特定的子空间。但初始 token 在通用场景上都能提供有价值的信息，这未免过于强大。无论如何，我们只需要查看一下初始 token 的 V 向量即可知道它到底提供了些什么。

![](https://pica.zhimg.com/v2-7d6346c349add1fefe2f62523b5decac_r.jpg)图：在 LLaMA3-8B 基础模型中，（上）首个 token 的 hidden states 具有显著更大的 L2 范数，但其 key、value 的 L2 范数远小于其他 token 的平均值；（下）余弦相似度而非范数乘积对 attention sink 产生的贡献。论文[《WHEN ATTENTION SINK EMERGES IN LANGUAGE MODELS: AN EMPIRICAL VIEW》](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2410.10781)对此做了实验，如上图（上）红色框区域所示，首个 token 的 K、V 的 L2 范数远小于其他 token 的平均值。我们再回到 self-attention 的计算公式，<strong>虽然首个 token 的 K 和后续 token 的 Q 的内积值很高，softmax 和 scale 之后被分配了更高的权重，但由于其 V 向量的值远小于其他 token，因此加权和之后的影响反而很小</strong>。也就是说，首个 token 或者说 attention sink token 的语义并非至关重要，反而无关紧要。

按照论文的方式，笔者在 Qwen2.5-14B-Instruct 上实践了下，也观察到类似的情况：

![](https://pica.zhimg.com/v2-e4e1211bf375a00ecaaf76626a3da10a_r.jpg)图：Qwen2.5-14B-Instruct sink token V hidden states L2-norm进一步研究为什么 attention sink token 的 
![](https://www.zhihu.com/equation?tex=QK%5ET) 值很高，我们知道向量内积等于两个向量长度的乘积与它们之间夹角余弦值的乘积。在图（下）第二和第三张图的可视化结果上可以发现，后续 token Q 和首个 token K 这两个向量长度的乘积远小于 Q 和其他 token K 的乘积值，余弦值远大于其他 token。也就是说，是夹角起了主导作用，使得 attention sink token 的 
![](https://www.zhihu.com/equation?tex=QK%5ET) 值很高。

![](https://pica.zhimg.com/v2-06f195600973bd032f5970019034af44_r.jpg)论文[《MAGICPIG: LSH SAMPLING FOR EFFICIENT LLM GENERATION》](https://link.zhihu.com/?target=https%3A//openreview.net/pdf%3Fid%3DALzTQUgW8a)绘制了 attention sink token 的 K 向量和其他 token 平均 K 向量和 Q 向量的几何结构。attention sink token 的 K 向量几乎与其他 token 相反，且其方向对输入 token 的依赖性出人意料地不敏感。其他 token 的 Q 向量靠近 sink token K 向量，从而形成 attention sink，通常位于一个远离的狭窄锥体中。

向阳花木易为春：位置很重要
[《Efficient Streaming Language Models with Attention Sinks》](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DNG7sS51zVF)论文在滑动窗口注意力上做了一个实验，将窗口的长度设置为 1024。实验结果如下表所示，当窗口滑动到将开头 4 个 token 丢弃时，PPL 开始爆炸。作者将窗口长度设置为 1020，并将初始的 4 个 token 始终放置在窗口的开头位置，PPL 就稳定在 5.40。作者尝试用换行符“\n" 来替换最初的 4 个 token，PPL 几乎没有变化。这表明，<strong>初始 token 的绝对位置比语义更重要</strong>。

![](https://pic2.zhimg.com/v2-aac3bf2ab1c3edfa2cee406cd9d2dec5_1440w.jpg)为什么 attention sink token 要选择开头的位置呢？一个直观且直接的推测是：<strong>首个或者初始几个位置上的 token 能被后续 token“看到”</strong>。

旧浪未平新浪至：新的问题
既然语义不重要，位置很重要，那么：

- 为什么首个 token 的 K 向量会如此的“与众不同”？
- 语义不重要，那么是不是其他 token 放在首位也会成为 attention sink？论文[《Why do LLMs attend to the first token?》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.02732)研究了 Gemma-9B 模型，该模型在 tokenizer 过程中会默认在开头添加 <bos> token。对于第一个问题“首个 token 为何如此与众不同，是否 <bos> token 与 sink 结构有特殊性？”，作者认为答案是否定的——<strong>若 sink 结构仅为防止混合而存在，那么其唯一重要属性是应位于序列首位，从而有效阻止后续 token 的混合</strong>。

![](https://picx.zhimg.com/v2-7e1ee090bc5cdcdd6393583d16dce85b_r.jpg)表：数据打包和注意力掩码对 attention sink 形成的影响。其中 * 表示推理过程中 ⟨bos⟩ 和 ⟨eos⟩ 相同作者使用多种不同的策略进行预训练。如果模型在训练时始终将 ⟨bos⟩ 置于第一个 token 处，在推理过程中移除 ⟨bos⟩ 会移除 attention sink。也就是说，模型依赖于 ⟨bos⟩ 来形成 sink。相反，<strong>如果训练过程中没有 ⟨bos⟩，sink 无论如何都会在第一个 token 处形成，但强度会略弱</strong>。预训练中的选择会直接影响模型构建 attention sink 的方式，但它们在训练过程中的形成似乎是不可避免的。这也验证了我们的直觉：无论使用何种预训练打包策略，attention sink 似乎总是在第一个 token 处形成。

《Why do LLMs attend to the first token?》作者认为 attention sink 总是在第一个 token 处形成，这不绝对。在将 Qwen2.5-14B 模型的注意力矩阵可视化后，发现 attention sink 在 index = 2。为什么不是 index = 0 位置的 token 呢？一个猜测：<|im_start|> 有其赋予的语义作用和角色。同理，index = 1 位置的 system 同样有其专属的语义作用和角色。因此，index = 2 的“\n”作为了 Qwen 系列模型的 attention sink。

论文[《Active-Dormant Attention Heads: Mechanistically Demystifying Extreme-Token Phenomena in LLMs》](https://link.zhihu.com/?target=https%3A//openreview.net/pdf/49a8508d8795d96a3e05a1609b7c93f69a838246.pdf)进行了一个输入打乱实验：位置 0 的 token 被替换为随机词（如未大写的非常用词），attention sink 仍稳定出现在位置 0。

![](https://pica.zhimg.com/v2-d147de330b667ee9838e66b36ee3c4f6_r.jpg)图：打乱前 OLMo 第 24 层的注意力矩阵可视化结果
![](https://pic1.zhimg.com/v2-969176d66a4a5379673f5b102a5667da_r.jpg)图：打乱前后 OLMo 第 24 层的注意力矩阵可视化结果论文[《Unveiling and Constrolling Anomalous Attention Distribution In Transformers》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.01601)提到：在 MLP 中，由于权重固定，第一层（embedding 层）输出中首个 token 向量的特征分布应为有限值，更精确地说，应等于词汇表的大小。该分布应与其他 token 的分布存在显著差异，称之为非混合分布。因此，<strong>理论上，在注意力混合层之后的所有全连接层都能学习到使这些非混合分布与其他分布产生差异化的变化模式</strong>。

上述加粗句子要如何理解呢？从目前的实验结论来看，所有 token 只要位于首位都会成为 sink token。在首位能够被其他 token attend，并且在 casual 注意力中，首位 token 只能看到自己，多层 transformer block 只是 MLP 的堆叠，<strong>它没有“变数”，不会因为 context 的不同以及 token 间的交互变得不一样</strong>。那么，模型完全可以将词汇表内的所有 embedding token 在经过 
![](https://www.zhihu.com/equation?tex=W_K) 时将其转换为 
![](https://www.zhihu.com/equation?tex=K_%7Bsink%7D) 。

注意力的蓄水池
让我们来总结一下，attention sink token 通常位于首个或者初始几个位置上，且它的 K 与后续 token 的 Q 的内积值非常高，但 V 值非常小。那么，attention sink 的作用呼之欲出——“消耗多余的注意力权重”（sink token 的 V 值非常小，即使当前 token 给予 sink token 的注意力权重高，但 sink token 对最终的加权和结果的影响很小，这就起到了“消耗多余”注意力权重的作用）。

<strong>问</strong>：为什么要“消耗多余的注意力权重”呢？

attention block 的恒等变换
对于 LLMs 来说，层往往很深，动则 42 层起步。在 decode 过程中，<strong>一些简单 token 的生成往往在模型的中间层就已经有较高的置信度，此时需要的是恒等变换，即需要 self-attention 根据 context 不输出任何变化的能力，为了满足 Transformer 层对“上下文感知恒等变换”（Context-Aware Identity Layer）的需求</strong>。

Transformer 的每个 block 都包含一个残差连接，其计算公式可简化为`Output = Input + Attention_Output + MLP_Output`。在某些情况下，模型可能判断一个 token 的当前表征（Input）已经足够完善，不需要通过 self-attention 进行 token 间的信息交互。此时，该 block 需要执行一次近似的“恒等变换”，即让`Attention_Output`的值等于 0。

![](https://www.zhihu.com/equation?tex=MultiHead%28Q%2C+K%2C+V%29+%3D+Concat%28head_1%2C+%5Cldots%2C+head_h%29W%5EO+%5C%5C+where+head_i+%3D+Attention%28QW_i%5EQ%2C+KW_i%5EK%2C+VW_i%5EV%29) 

由于每个 token 每一层是否要恒等的情况不一样（有些 token 不需要获取新的信息，有的 token 需要），所以不能靠 W_o = 0 这样的静态参数来一刀切。因此，必须靠 softmax attention 来实现 token 级别的精准识别，也就是 K 空间内必须存在一个特殊的 K0，在某个 token 想要输出 0 的时候可以被精确 attend 到。这也意味着模型必须给这个特殊的 K0 分配一个单独的子空间，和所有其他 token 的 K 都是正交或者负相关，这样可以保证 Q 和 K0 夹角很小时，QK0^T 的内积值最高，实现 attend 到 sink token 并输出 0。同时，K0 的模长也必须小，这样在不需要恒等变换时，对正常 attntion 结果产生尽量小的影响。—— [尝试终结Attention Sink起因的讨论](https://zhuanlan.zhihu.com/p/1932066570714215838)
PS：2026-01-12 经 [Parachutes](https://www.zhihu.com/people/zheng-ming-wu-10) 大佬提醒，本处内容学习自 [尝试终结Attention Sink起因的讨论](https://zhuanlan.zhihu.com/p/1932066570714215838)，受益匪浅、所学内容经久不忘而落笔时多有雷同，遗漏引用非常抱歉。
不需要过多的信息
<strong>attention sink 的本质是模型应对深层 Transformer 信息过混合（over-mixing）的自适应策略</strong>。Attention 机制和前馈神经网络（Feed-Forward Network，FFN）层分别在不同的维度上进行操作，可以理解为分别执行 token-mixing 和 channel-mixing。

![](https://pic2.zhimg.com/v2-c6adcd515e9037bffeaa330acdf06de1_r.jpg)图：MLP-Mixer: An all-MLP Architecture for Vision 论文 Figure 1
- <strong>token-mixing</strong>：自注意力机制（Self-Attention）主要作用于序列的 token 维度，即它主要处理序列中不同位置的 token 之间的关系。具体来说，自注意力机制通过计算每个 token 与其他所有 token 的相似度（即注意力权重），来整合和重新分配信息，使模型能够捕捉到序列中远距离 token 之间的依赖关系。这一过程可以看作是 token-mixing，因为它混合了来自不同位置的 token 信息。
- <strong>channel-mixing</strong>：FFN 层主要作用于每个 token 的通道（channel）维度。换句话说，FFN 层对每个 token 的特征向量（embedding）进行逐位置的非线性变换和线性变换，而不考虑 token 之间的关系。每个 token 的特征向量在通道维度上进行变换，使模型能够捕捉到每个 token 内部特征维度上的复杂关系。因此可以看作是 channel-mixing。简单来说，就是 Attention 主要起到的是 token-mixer 的作用，早期很多工作表明 Attention 换成 MLP-mixer 效果也还行，甚至 MetaFormer 说换成 Pooling 就可以（某些任务），所以可以预估 Attention 本身带来的是弱非线性（softmax 函数带来的），因此就需要额外的 FFN 来补足它的非线性能力。—— 摘自苏剑林的回答此外，随着模型规模扩大或在更长的上下文中训练，它们本质上更容易受到此类扰动的影响，将大量注意力集中到 sink token 上，有助于<strong>降低模型对 token 扰动的敏感度</strong>。

产生原因
在上一节“注意力的蓄水池”中我们似乎已经讲明白了为什么会出现 attention sink——模型为了应对深层 Transformer 信息过混合（over-mixing）的自适应策略。但可以继续深挖其根源，且有论文提出并非所有 decoder-only 架构 LLMs 都会出现 attention sink。这么看来，仍然有我们不知道的因素，它们在幕后让 LLMs 必须借助 attention sink 来避免信息过混合。

根因：SoftMax 强制归一化约束
模型需要通过 attention sink 来吸纳“多余”的注意力权重，这是由于<strong>标准的 attention 机制要求所有 token 的注意力分数之和为 1</strong> ——> 标准 SoftMax 的强制归一化约束特性。<strong>即使当前 token 的 Q 与前面所有 token 的 K 相关性都非常弱时，仍然需要将注意力分配给某些位置</strong>，而初始位置的 token 因对后续所有 token 可见，顺理成章地承担了 attention sink 的职责。

SoftMax 函数的性质防止所有被关注的 token 都为 0，这需要在所有层中的所有头中聚合来自其他 token 的一些信息，即使当前 embedding 已经具有足够的 self-contained 信息用于预测。因此，模型倾向于向特定 token“倾倒”不必要的注意力。类似观察也在量化异常领域中提出，并提出了一种 SoftMax-Off-by-One 作为潜在的解决方案。 —— [《Efficient Streaming Language Models with Attention Sinks》](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DNG7sS51zVF)

<strong>核心</strong>：非归一化或者非正定 Kernel 会消除 sink。

![](https://pic1.zhimg.com/v2-880e2b94eba5e14d22e723fbf09c8f88_r.jpg)论文[《WHEN ATTENTION SINK EMERGES IN LANGUAGE MODELS: AN EMPIRICAL VIEW》](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2410.10781)提到，不存在 attention sink 机制的 LLMs 通常会放松 token 对注意力分数的内在依赖性。这些模型在预训练阶段的注意力分数可能为负值或总和不为 1。这表明 attention sink 机制（至少部分）源于此类内在依赖性。作者还观察到上述 LLMs 不存在 massive activations。

![](https://pic3.zhimg.com/v2-af694648e5e62f9d7ee88dcd2b7ece82_r.jpg)作者可视化了 
![](https://www.zhihu.com/equation?tex=h_1%5El) 的 L2 范数比值与 
![](https://www.zhihu.com/equation?tex=h_%7Bt+%5Cne+0%7D%5El) 的均值。

- 左图：在注意力分数非负且总和为 1 的 LLMs 中存在 massive activations。
- 中图：在注意力分数相互独立的 LLMs 中不存在 massive activations。
- 右图：当模型规模缩减至 1B 时，采用 sigmoid 注意力机制（未归一化）的 LLMs 仍未出现 massive activations 现象。换言之，作者使用非正定核（如 MLP kernel 和 Sigmoid kernel）打破归一化约束，模型不再需要为 sink token 分配额外的注意力分数。同时，因为允许负数注意力的存在，在实验中发现 massive activations 消失。massive activations 的消失对于模型量化是好事，不需要专门针对 massive activations 做处理。

![](https://pic3.zhimg.com/v2-be68d7c3d21a84f5176f74c5a25d132a_r.jpg)OpenAI 于 2025 年 8 月开源的 GPT-oss 也采用了类似的技术：每个注意力头在 softmax 的分母中都具有可学习的 bias，类似于 off-by-one 注意力机制（SoftMax-Off-by-One）和 attention sink，这使得注意力机制能够忽略任何 token。GPT-oss 的技术报告可参阅 [传送门](https://link.zhihu.com/?target=https%3A//cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf)。

Massive Activations
在 LLM 中，研究者发现<strong>隐藏层的少数神经元会出现极高的激活值，其数量极少却远高于其他激活的数量级，这类异常激活被称为 massive activations</strong>。它们通常呈现出输入无关（即在不同输入上几乎保持相同的数值），但对模型的整体行为却有显著影响。

2024 年，论文《[Massive Activations in Large Language Models](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DF7aAhfitX6)》首次系统化地提出 massive activations 概念，指出其在多个 LLM（如 GPT-2、LLaMA2）中普遍存在。实际上，在 2022 年的 LLM 量化领域内已经发现激活值幅度过大的问题。

论文《LLM.int8()：8-bit Matrix Multiplication for Transformers at Scale》的摘要部分提到作者已经发现了 transformer 架构中高度系统化的“突现特征”，并且这些特征主导了注意力和 transformer 的预测性能。只是当时还是将其称之为“突现特征”或“离群点、异常值”。

![](https://picx.zhimg.com/v2-645679072165a4291f6fae38c753d973_r.jpg)论文《Massive Values in Self-Attention Modules are the Key to Contextual Knowledge Understanding》在第 3.6 小节评估 massive activations 对三种成熟量化方案 AWQ、SmoothQuant 和 GPTQ 的影响。

![](https://pic3.zhimg.com/v2-eb1f02678507876f96d90be801e03e06_r.jpg)AWQ 和 SmoothQuant 在量化过程中明确保留了 massive value，因此在所有任务中均保持了强劲性能。AWQ 通过在量化过程中选择性保护“重要”权重实现这一目标，而 SmoothQuant 则采用平滑因子 (S) 通过数学等效变换重新分配激活函数中的 massive value。相比之下，未专门保护 massive value 的 GPTQ 在上下文知识理解任务中表现显著退化，尤其在 GSM8K 和 AQUA 数据集上（标准化准确率降至约 75%），但在参数化知识检索任务（城市、体育、名人）中仍保持可比性能。这种性能差异具有重要启示：<strong>保护离群点的量化方法在上下文知识理解任务中保持良好且稳健的性能，而未保护极端值的方法则在该类任务中特别吃力</strong>。

从 LLM.int8() 论文以及《Massive Values in Self-Attention Modules are the Key to Contextual Knowledge Understanding》第 3.6 小节中的结论来看，“保护”离群点也就是维持 massive value 可以保持 LLM 的性能，尤其在上下文知识理解任务。那么，为什么会这样呢？

Massive Values 在哪里？
首先，顾章节名思义，massive values 会出现在 activations 中，在 transformers 架构中，activations 往往指代 hidden states。《Massive Activations in Large Language Models》论文证明了 massive activations 在各类 LLMs 中普遍存在，并定位了其分布位置。如下图所示，将短句输入该模型，可视化 LLaMA2-7B 模型中间层隐藏状态的激活幅度（z 轴）、序列维度 x 轴和特征维度 y 轴。每条蓝色行对应一个 token 的特征 embedding。

![](https://picx.zhimg.com/v2-f259de68e30d629b069b5775cabdec47_r.jpg)图：LLaMA2-7B 模型中的 massive activations观察到两个固定特征维度（1414、2533）出现 massive activation，且涉及两种 token 类型 —— 起始 token 以及首个句号（.）或换行符（\n）。最大激活值（约 2000）约为中位数幅度（约 0.2）的 10,000 倍。这些巨大的激活值使其在其他激活中“脱颖而出”。因此，作者将这些特殊激活成为 massive activations。

![](https://pica.zhimg.com/v2-9565d25c81c2e8328932820f006f3a5a_r.jpg)图：LLaMA2-13B 模型中的 massive activations在 Llama2-13B 中也有相同的观察结果：massive activations 出现在两个固定特征维度（2100，4743），且仅限于起始 token。并且，在 Mixtral-8x7B 以及 Phi 等模型中也观察到类似的现象。

作者总结了 massive activations 的两个主要特性。

- 最显著的特性是这些激活值具有巨大数值，其幅度远大于其他激活值，通常比中位数大几个数量级。
- 另一特性是其数量极其稀少。例如在 LLaMA2-7B 模型中，每个呈现的隐藏状态约有 40,000 个激活，但最多仅能识别出 4 个 massive activations。同时给出一个宽泛的定义：<strong>当激活幅度超过 100 且至少达到或接近其隐藏状态中位数幅度的 1000 倍时，即可视为 massive activations</strong>。

![](https://pic4.zhimg.com/v2-af4c23c74642668a5965622e3087326f_r.jpg)表：三种 LLMs 在隐藏状态下的 top-5 激活值、前 1% 激活值、前 10% 激活值及中位数激活值<strong>注意</strong>：被视为 massive activations 的激活值以粗体标出。

作者进一步探究：这些 massive activations 是每一层都有，还是只出现在特定层？于是从 RedPajama 数据集中收集了 100 个文本序列（每个序列包含 4096 个 token），并收集每层的隐藏状态。

![](https://pic4.zhimg.com/v2-2fc1b1d7045386d396add3068ef6e7cf_r.jpg)图：LLMs 中各层的 top 3 激活幅度值及中位数幅度值上图可视化了每个层中激活幅度最大的三个值以及隐藏状态输出的中位数，结果是基于 100 个序列的平均值。考察了三个模型：LLaMA2-7B、13B 和 Phi-2。在所有情况下，绝大多数中间层的前三项激活值均来自隐藏状态中的相同位置。总体而言，观察到以下现象：<strong>massive activations 在大部分中间层中存在并保持基本恒定。它们在初始层中出现，并在最后几层开始减弱</strong>。

在 LLaMA2-7B 模型中，massive activations 首先出现在第 2 层，并保持近乎恒定的数值直至第 30 层。值得注意的是，对于 LLaMA2-7B 和 13B 模型，<strong>massive activations 会从特定计算层（例如分别是第 2 层和第 4 层）极快地涌现。这表明它们并非通过多层逐步累积形成，而是由截然不同的机制所驱动</strong>。至于是什么机制，先按下不表。

![](https://pic4.zhimg.com/v2-4fbf5f42172826b60912eacbdba20ae7_r.jpg)图：decoder-only 架构 transformer block 以及 self-attention 注意力机制示意图<strong>注意</strong>：左图 Post-LN 是虚线框，下文以 Qwen 系列为主，使用 Pre-LN。

将两篇论文（[《WHEN ATTENTION SINK EMERGES IN LANGUAGE MODELS: AN EMPIRICAL VIEW》《WHEN ATTENTION SINK EMERGES IN LANGUAGE MODELS: AN EMPIRICAL VIEW》](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2410.10781)和《Massive Values in Self-Attention Modules are the Key to Contextual Knowledge Understanding》）中关于 transformer 结构的图拼接到一块。从上文的分析过程可知，左图每层 transformer block 入口的 hidden states H^{l-1} 存在 massive values（sink token）。在 LLM 中，输入的 hidden states 会过一层 Pre-LN，即 RMSNorm。

<strong>问</strong>：存在 massive values 的 hidden states 经过 RMSNorm 之后会变成什么样子，还有 massive values 吗？

很显然，相交于其他 token，sink token 的 hidden states 经过 RMSNorm 之后不会再有 massive values，都被 RMSNorm 归一化了。但在 token embedding 的微观层面上，特征间的对比仍然存在“massive values”。这要怎么理解呢？

假设输入的 hidden stats 中，有 4095 个维度的值是正常的（比如在 -1 到 1 之间），但有 1 个维度的值是巨大的（比如 100）。这个巨大的值会瞬间拉高整个向量的方差，在做除法时，4095 个正常特征会被巨大的方差除得几乎接近于 0。而巨大的特征值虽然也被除了，但依然保留了显著的数值（相对其他 4095 个特征值）。结果就是：经过 RMSNorm 的方差爆炸和挤压之后，<strong>sink token 的向量变得极其稀疏或者说极其纯粹 —— 几乎只剩下了那个带有 massive values 对应的特征，其他的语义噪声全被抹平</strong>。就像是一个 one-hot 纯粹、方向极度单一的信号发射器。

论文《Massive Activations in Large Language Models》4.2 节对此做了研究，需要注意的是，论文中使用 LayerNorm 作为 Pre-LN。

![](https://pic2.zhimg.com/v2-c8ec7c47305473c2c4efebeee2f341e3_r.jpg)图：(a) 从 hidden stats 到 query、key 和 value states。(b) LLaMA2-7B 模型第 3 层 QKV 矩阵以及 hidden states layernorm 三个过程上图（b）可视化了（a）中计算的所有隐藏状态（LLaMA2-7B，第 3 层）。在所有阶段，与 massive activations 相关的两个 token 特征都与其他 token 截然不同。具体而言，<strong>在首次归一化后，这两个 token 的 embedding 表现为稀疏向量，仅包含两个非零元素</strong>。并且，QKV 状态在每个 embedding 向量内部的方差幅度显著缩小。所以，这也解释了为什么 sink token K 向量的 L2 范数小于其他 token。

<strong>问</strong>：Q、K 和 V 中存在 massive values 吗？

论文《Massive Values in Self-Attention Modules are the Key to Contextual Knowledge Understanding》提出：<strong>在多种现代基于 Transformer 的 LLMs 中，这些高度集中的 massive values 始终出现在特定的 Q、K 区域，而 V 区域则不存在此类模式</strong>。

Massive value 在每个注意力头中，某些维度呈现出显著的巨大值，这些值往往聚集在特定的维度区域（如下图中黑框所示）。此外，在不同的注意力头之间，这些巨大值通常出现在相似的位置。

![](https://pic2.zhimg.com/v2-977576a65a89972f804db8bd39f9c34f_r.jpg)图：展示了 Llama-2-7B 模型第 10 层和第 20 层，Q、K 嵌入向量的情况
![](https://pic1.zhimg.com/v2-8cd0e2cfbcd905f6d75964625d831782_r.jpg)图：Gemma2-9B 第 20 层 Q、K 和 V 嵌入向量的情况横轴表示注意力头，纵轴表示每个注意力头的维度。作者沿序列维度计算 L2 范数，获得每个注意力头各维度特征的 L2 范数值。从上图中可以发现，massive values 主要集中于 Q、K 注意力头的高维。除了论文正文部分提到的 Llama-2-7B 和 Gemma2-9B 外，在附录 C 中陈列了一系列带有 RoPE 位置编码大模型的 Q、K、V 嵌入向量图，Q、K 中都存在 massive values，V 中没有。

遗憾的是，论文没有针对 sink token 和非 sink token 的 Q、K 嵌入向量进行统计。因此，笔者在 notebook 上用 Gemma2-9b-It-SimPo 尝试复现结果。

input_ids = tokenizer("中国首都是哪里？", return_tensors="pt")["input_ids"]
input_ids = input_ids.to("cuda:0")
    
with torch.no_grad():

```python
    output = model(input_ids, output_attentions=True, output_hidden_states=True)

def get_qkv_matrix(output, model, layer: int = 0, is_split: bool = True):
    q = model.model.layers[layer].self_attn.q_proj(output.hidden_states[layer])
    k = model.model.layers[layer].self_attn.k_proj(output.hidden_states[layer])
    v = model.model.layers[layer].self_attn.v_proj(output.hidden_states[layer])
    batch_size, seq_len, hidden_dim = q.shape
    num_heads: int = model.config.num_attention_heads
    num_key_value_heads: int = model.config.num_key_value_heads
    head_dim: int = hidden_dim // num_heads
    if is_split:
        q = q.view(batch_size, seq_len, num_heads, head_dim)
        k = k.view(batch_size, seq_len, num_key_value_heads, head_dim)
        v = v.view(batch_size, seq_len, num_key_value_heads, head_dim)
    return q, k, v
```


q, k, v = get_qkv_matrix(output, model, 20)
同样取 Gemma2-9B 模型的第 20 层 Q、K、V，按照我们先前的结论，Gemma2 系列模型会在序列的开头添加 <bos> token，该 token 会作为 sink token。因此，我们单独查看 sink token 和非 sink token Q、K 的结果。

![](https://pic3.zhimg.com/v2-22f8f6b1c30ac79d919874f6d0195f1e_r.jpg)图：Gemma2-9B 第 20 层 Q sink token 和其他 token L2 范数
![](https://pic2.zhimg.com/v2-cebd5bd2fa90491b5b5c7c97042e69f5_r.jpg)图：Gemma2-9B 第 20 层 K sink token 和其他 token L2 范数可以看到 sink token Q、K 高维特征的值比非 sink token 更大，且 K 高维特征的值大于低维特征的值。

为什么 Q、K 向量的高维特征值会高于低维特征值呢？

念念不忘跨越时间的横崖
论文将其归结为 RoPE 位置编码的影响，在讲清楚 RoPE 和 massive values 关系之前，我们需要先知道 RoPE 位置编码是什么（假设读者们已经了解什么是 RoPE，不知道的可以去看知乎大佬们写的 RoPE 解读或者苏神的博客）。

论文《Massive Values in Self-Attention Modules are the Key to Contextual Knowledge Understanding》提出 RoPE 助力 massive value 集中出现在 Q、K 特定特征。

<strong>证据 1</strong>：RoPE 仅作用于 Q 和 K，而不作用于 V。此设计将位置信息专门融于 Q 和 K，使其内积能够本质上捕捉到相对位置关系。如图 7 所示，massive value 集中出现在 Q 和 K，而 V 中则完全没有。所有采用 RoPE 位置编码的 LLMs 都观察到该模式。

![](https://pica.zhimg.com/v2-a4a69beefd8c7a2cbd2a024215d58186_r.jpg)图：OPT-350M 第 20 层的 K、Q 和 V，其中 massive value 没有集中出现在某个特定区域<strong>证据 2</strong>：为验证 RoPE 与 massive value 关联的假设，作者对不同模型架构进行了对比分析。首先考察未采用 RoPE 的模型，包括 OPT 和 GPT-2。正如预期，其 embedding 向量图谱未显示任何有序 massive value 的迹象，其中 OPT-2.7B 的 embedding 向量（如上图所示）尤为混乱无序。相比之下，观察到采用 RoPE 的模型呈现出一致的 massive value 模式，其影响范围不仅限于传统语言模型，更延伸至多模态架构，例如，LLaVA 和 Qwen2-VL。

作者基于现有的研究和实证证据，<strong>提出：集中式 massive value 是 RoPE 实现机制的内在结果</strong>。

![](https://pic3.zhimg.com/v2-8b6ef69ea4c20a0530e800f8ab3d2cda_r.jpg)让我们再次回到《Efficient Streaming Language Models with Attention Sinks》这篇论文的观察现象与实验结果。在滑动注意力窗口中，一旦 sink token 从滑动窗口中离开，模型的 PPL 就会爆炸。按照先前的分析和解释，我们知道是因为失去了 sink token，失去了吸收注意力的“黑洞”，从而无法实现恒等变换。而 RoPE 相对位置编码存在远程衰减的特性，一旦 Q、K 的相对位置变长，RoPE 位置编码的内积值会震荡衰减，持续变小。即使，sink token 仍然在“目之所及”的位置，但它们 Q、K 的内积值也已不是“彼此唯一”。<strong>为了“战胜”远程衰减的特性，Q、K 中必须在特定维度上存在 massive values，使其内积之后的值远大于其他 K，从而继续将大部分注意力消耗在 sink token</strong>。<strong>之所以选择高维，是因为高维特征的</strong> **
![](https://www.zhihu.com/equation?tex=%5Ctheta_i) 的角度小、旋转地慢，相应的远程衰减也就更慢**。并且，RoPE 位置编码的设计初衷就是低维关注局部特征、高维特征关注远程依赖。

<strong>总结</strong>：Massive Activations 是模型为了“对抗” RoPE 的距离衰减特性，强行“留住” Attention SInk 而产生的一种补偿机制。

冥冥之中自有定数
我们接着上一个小节的总结继续延伸，把这个逻辑拆解为“RoPE 特性”、“模型的困境”和“暴力的解决方案”三步来理解。

- RoPE 的特性：RoPE 有一个内在的倾向，即两个 token 距离越远，它们向量点积的期望值往往越小（或者越不稳定），关注度自然衰减。这种特性通常是好的，因为它符合语言学的直觉——我们通常更关注附近的词，而不是几千个词之前的词。
- 模型的困境：sink token 是最远的，但又是最重要的。这里就出现一个巨大的矛盾：sink token 通常位于序列的最开始，当模型生成到第 1000、10000 个 token 时，当前 token 与 sink token 的距离时最大的。按照 RoPE 的数学特性，sink token 应该是因为距离太远而被完全忽略。但我们之前分析过，模型必须依赖 sink token 作为一个“安全避难所（no-op）”来处理 softmax 的强制归一化约束来维持恒等变换。模型必须关注 sink token，但 RoPE 却在不断地试图切断这种关注。
- 暴力的解决方案：为了在 RoPE 的“衰减诅咒”下依然能“看清”远在天边的 Sink Token，模型在训练过程中学会了一种暴力的补偿策略——在某些特定的特征维度上生成数值极大的激活值。普通的数值经过 RoPE 的长距离旋转后，内积结果可能就接近 0，但 massive values 即使经过旋转，但因为在旋转很慢的高维特征上，它们依然能保持巨大的数值影响力。结果就是——这些 massive value 强行提升了当前 token Q 与 sink token K 之间的内积数值，哪怕 RoPE 试图降低权重，由于基础数值实现太大，最终的 attention score 依然足够高，使得 sink token 仍然能够被 attend。
![](https://pica.zhimg.com/v2-06f195600973bd032f5970019034af44_r.jpg)再来看 sink token 特殊的 K 向量，在前面的研究分析中，Ksink 的方向与其他 token 的 K 截然相反，反而与 Q 向量接近。sink token 的 hidden states 内存在 massive value，在经过 LayerNorm 之后会得到一个除了某几个维度外全是 0 的向量，Wk 可以针对该向量映射到 Ksink，这就使得生成的 Ksink 向量非常稳定，不像其他 token 的 K 向量那样随着语义变来变去，<strong>它是一个固定的、特异的“指纹”</strong>。再加上 sink token K 和其他需要消耗大量注意力 token 的 Q 在高维特征上存在 massive values，这些 massive values 主导了 Q、K 向量在向量空间的方向，因此使得 Q、K 的方向相近、夹角更小。

当后续 token 生成 Q 时，如果模型处于“迷茫”状态，就让 Q 的高维特征值大一些，让它去和 sink token K 向量进行内积（attend），从而消耗掉注意力。这也是论文《Massive Activations in Large Language Models》提到的另一个视角 —— <strong>massive activations 会引发隐性注意力 bias</strong>，并提出显性注意力偏好可以消除 massive activations。

另外，为什么 sink token K 和其他 token K 的方向相反？一个符合直觉的猜测是：其他 token K 需要编码语义（猫、狗、苹果），它们分布在语义空间中。sink token 的 K 主要由 massive activations 驱动，分布在“功能空间”或“位置空间”中。这种<strong>方向上的本质隔离，保证了 sink token 永远不会意外地干扰正常的语义匹配</strong>。只有当 Q 真的找不到语义匹配时，才会显露出与 sink token 的“默认方向”的联系。

<strong>问</strong>：不是说 sink token K 向量的 L2 范数比其他 token 小吗？但 sink token K 向量内存在 massive values，这不是自相矛盾吗？

L2 范数（Norm）计算的是向量中所有元素平方和的平方根： 
![](https://www.zhihu.com/equation?tex=%7C%7C+K+%7C%7C+%3D+%5Csqrt%7B%5Csum_%7Bk_i%5E2%7D%7D) 。

- <strong>sink token：</strong>
- <strong>特点：</strong> 存在 Massive Values，且极其集中（稀疏）。
- <strong>假设：</strong> 维度 d = 4096。其中 2 个维度是 Massive Value（例如 20），其余 4094 个维度被 LayerNorm 挤压得极小（例如 0.01）。
- <strong>范数计算</strong>： 
![](https://www.zhihu.com/equation?tex=%5Csqrt%7B2+%5Ctimes+20%5E2+%2B+4094+%5Ctimes+0.01%5E2%7D+%3D+%5Csqrt%7B800+%2B+0.4%7D+%5Capprox+28.3) 
- <strong>普通 token</strong>：
- <strong>特点</strong>：没有 Massive Values，语义丰富，信息分布稠密。
- <strong>假设</strong>：维度 d = 4096。所有维度都承载语义信息，数值适中且分布均匀（例如平均为 0.5）。
- <strong>范数计算</strong>： 
![](https://www.zhihu.com/equation?tex=%5Csqrt%7B4096+%5Ctimes+0.5%5E2%7D+%3D+%5Csqrt%7B4096+%5Ctimes+0.25%7D+%5Capprox+32.0) 虽然 sink token 里有“20”这样惊人的 Massive Value（远超情形 B 的 0.5）。但普通 token 的<strong>整体 L2 范数（32.0）依然大于</strong> sink token（28.3）。

<strong>最后</strong>，让我们来将以上的内容都整合总结一下。

<strong>核心动机：为什么必须要有 Sink Token？</strong>

本质是模型需要实现恒等变换（大模型由于层更宽、更多，更需要这种恒等变换来避免“污染”残差流），但由于 softmax 的强制归一化约束，使得模型为了实现恒等变换，必须要找一个“黑洞”来“吞噬”多余的注意力。而序列开头的 token 在 decoder-only 架构的 LLM 中因为得天独厚的地理位置（可以被后续所有 token 关注）而成为了“巫妖王”（sink token），并且其 V 向量没有丝毫语义，是无操作的（No-Op）。sink token 为了对抗 RoPE 的远程衰减特性，在训练过程中诞生了 massive values，来让距离非常远的 token 也能通过高维特征的巨大内积值来实现关注。

<strong>生成机制：Massive Activations 关键角色</strong>

- 第一阶段：LayerNorm 之前的 hidden states。模型在特定的特征维度上产生 massive values，这些大值是为了在 LayerNorm 中“生存”下来。由于 LayerNorm 是基于方差进行归一化，massive values 会拉高方差，导致其他普通语义特征被“挤压拍平”成接近 0 的数值。结果就是 sink token 的特征向量被“格式化”，变成了一个极其稀疏的信号——只有几个特定的维度有值，其他维度几乎空白。
![](https://pic1.zhimg.com/v2-4ee0d8d184ef818e0cde6d6afadfff30_r.jpg)
- 第二阶段：
![](https://www.zhihu.com/equation?tex=W_k) 投影与 RoPE。虽然经过了 Norm，但 
![](https://www.zhihu.com/equation?tex=W_k) 矩阵通过学习，在输出的 K 向量中重新放大了特定的维度。这些被放大的维度不是随机的，而是精确集中在 RoPE 的高维特征（低频）上。而低频维度旋转极慢，几乎不受位置变化的影响。把 massive value 放在这里，就像在旋转木马上找到了圆心，无论序列多长，它都是一个<strong>永恒稳定的灯塔</strong>。<strong>推理过程：attention 是一种“锁与钥匙”</strong>

当模型在推理时，如果当前 token 还需要语义（如找“苹果”），其 Q 向量会在低维高频特征活跃，去匹配普通 token。如果此时不需要再进行信息交互，Bias 会驱动 Q 向量在 RoPE 高维低频特征产生 massive values 来主导方向，与 sink token 的 K 角度一致 + 数值巨大，内积得到巨大的 attention score，并克服 RoPE 的远程衰减特性。

sink token 拿走了 90% 的概率。

- 加权求和： 
![](https://www.zhihu.com/equation?tex=0.9+%5Ctimes+V_%7Bsink%7D%28%5Capprox+0%29+%2B+0.1+%5Ctimes+V_%7Bothers%7D) 。
- 最终效果： 模型安全地执行了“跳过”操作，输出了干净的 Hidden State 给下一层。<strong>Attention Sink 是模型为了对抗 RoPE 的长距离衰减并维持 Softmax 稳定性而进化出的一种机制：它通过 LayerNorm 筛选出稀疏特征，并在 K 向量的 RoPE 高维重构出 Massive Values，从而制造了一个“整体范数很小（不干扰语义）但局部数值极大（能被强力捕捉）”的稳定锚点</strong>。

附录

附录：论文列表

- [《Efficient Streaming Language Models with Attention Sinks》](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DNG7sS51zVF)
- [《WHEN ATTENTION SINK EMERGES IN LANGUAGE MODELS: AN EMPIRICAL VIEW》](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2410.10781)
- [《MAGICPIG: LSH SAMPLING FOR EFFICIENT LLM GENERATION》](https://link.zhihu.com/?target=https%3A//openreview.net/pdf%3Fid%3DALzTQUgW8a)
- [《Why do LLMs attend to the first token?》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.02732)
- [《Active-Dormant Attention Heads: Mechanistically Demystifying Extreme-Token Phenomena in LLMs》](https://link.zhihu.com/?target=https%3A//openreview.net/pdf/49a8508d8795d96a3e05a1609b7c93f69a838246.pdf)
- [《Unveiling and Constrolling Anomalous Attention Distribution In Transformers》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.01601)
- GPT-OSS 技术报告：[https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf](https://link.zhihu.com/?target=https%3A//cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf)
- [《Gated Attention for Large Language Models: Non-linearity, Sparsity, and Attention-Sink-Free》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2505.06708)
- [《Massive Activations in Large Language Models》](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DF7aAhfitX6)
附录：SoftMax-Off-by-One 方案
<strong>背景</strong>：Evan Miller 在 2023 年首次指出标准 SoftMax 在注意力机制中的设计缺陷——模型应有权“不关注”，而非强制分配概率。

SoftMax-Off-by-One 是标准 SoftMax 函数的一种改进形式，主要用于解决 Transformer 模型（如 LLM）中注意力机制的归一化约束问题。

- <strong>标准 SoftMax</strong>：将输入向量转换为概率分布，要求所有输出值之和严格为 1。
![](https://www.zhihu.com/equation?tex=SoftMax%28x%29_i+%3D+%5Cfrac%7Be%5E%7Bx_i%7D%7D%7B%5Csum_%7Bj%3D1%7D%5EN+e%5E%7Bx_j%7D%7D) 

- <strong>SoftMax-Off-by-One</strong>：在分母中添加常数 1，使输出值之和小于 1，不再强制归一化到 1。
![](https://www.zhihu.com/equation?tex=SoftMax%28x%29_i+%3D+%5Cfrac%7Be%5E%7Bx_i%7D%7D%7B1+%2B+%5Csum_%7Bj%3D1%7D%5EN+e%5E%7Bx_j%7D%7D) 

<strong>关键改进</strong>：允许模型在某些情况下不分配注意力（即输出可趋近于 0）。

标准 SoftMax 的核心特性是<strong>归一化约束</strong>：所有输出概率之和必须为 1。该约束的问题在于，即使输入样本属于<strong>未知类别</strong>（不在输出的 N 个已知类别中），模型也必须将概率“强行分配”给已知类别，导致对未知样本的错误分类（例如，将一个完全陌生的样本硬分到某个已知类别中，且可能给出较高的“虚假置信度”）。

SoftMax-Off-by-One 的关键修改是：<strong>在归一化分母中增加一个固定的额外项（通常为 1，对应 exp(0)）</strong>，相当于为模型引入一个“隐含的额外类别”（无需显式定义其输入 z）。显然，SoftMax-Off-by-One 的概率之和小于 1，且差值为 1 / S + 1 —— 这部分“未分配的概率”可被视为模型对“当前样本可能属于未知类别”的置信度。例如，当所有已知类别的输入都较小时，S 较小，1 在其中的占比变大，表明模型认为样本更可能是未知的。

<strong>解决的问题</strong>

- <strong>注意力机制中的异常值（Outliers）</strong>：标准 SoftMax 要求所有注意力分数之和为 1，即使某些位置无需关注（如标点、空白符），模型仍被迫分配注意力值。这导致异常权重集中在无意义的 token 上（如句首的逗号），产生难以量化的异常激活值。
- <strong>后果</strong>：异常值增加模型部署的难度（如量化压缩困难）。
- <strong>长文本处理的性能衰减</strong>：在 StreamingLLM（无限长文本推理）场景中，标准注意力机制因窗口滑动丢弃初始 token，导致性能崩溃。而 SoftMax-Off-by-One 通过引入<strong>虚拟 token（Zero Sink）</strong>稳定注意力。
- 分母的“+1”等价于添加一个全零 Key/Value 的虚拟 token，其注意力得分固定为 1，作为 attention sink 吸收多余注意力。
- <strong>作用</strong>：避免模型将冗余注意力强加给真实 token（如句首 token），维持长文本生成的稳定性。