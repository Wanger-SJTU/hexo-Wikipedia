---
title: DFlash 深度解读：用 Block Diffusion 把投机解码加速推到 6×
date: "2026-06-14 00:00:00"
updated: "2026-06-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/DFlash-深度解读-用-Block-Diffusion-把投机解码加速推到-6×/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2049539716261864313
---


**论文**：DFlash: Block Diffusion for Flash Speculative Decoding 
**作者**：Jian Chen, Yesheng Liang, Zhijian Liu（UC San Diego） **会议**：ICML 2026　|　**arXiv**: 2602.06036 
**项目主页**：[https://dflash.z-lab.ai](https://link.zhihu.com/?target=https%3A//dflash.z-lab.ai/) （含 Code 与 HuggingFace 模型）DFlash 把投机解码里那个一直是「自回归串行」的 draft 模型换成了**并行去噪的 block diffusion 模型**，并用 **KV 注入**把 target 模型的深层表征喂给草稿模型的每一层。结果是 Qwen3-8B 上 **>6× 无损加速**，比 SOTA 的 EAGLE-3 快约 **2.5×**（Figure 1）。

本文重点回答：为什么 DFlash 能比 EAGLE-3 加速更多？在以下几个维度展开：

- **核心机制**：为什么「并行 drafting + 全层 KV 注入」能同时撬动加速公式的两个杠杆（§3-4）
- **非 greedy**：Table 1 的 temperature=1 数据，DFlash 在采样下仍保持 4× 量级加速
- **长文本**：Table 4 的 LongBench 适配实验（base 退化 vs 微调恢复）
- **训推一致性**：random anchor sampling 和 block size 泛化是这篇论文做训推对齐的两个关键设计
1. 问题：投机解码的加速为什么卡在 2-3×？

1.1 先把加速公式摆出来
投机解码（speculative decoding）的逻辑是：一个轻量 draft 模型 
![](https://www.zhihu.com/equation?tex=M_q) 一次提议 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 个 token，target 模型 
![](https://www.zhihu.com/equation?tex=M_%7Btarget%7D) 并行验证。论文沿用了一个清晰的延迟公式（Section 3.1, Eq. 1）：

![](https://www.zhihu.com/equation?tex=+L+%3D+%5Cfrac%7BT_%7Bdraft%7D+%2B+T_%7Bverify%7D%7D%7B%5Ctau%7D+)

- 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D)：生成草稿 token 的耗时
- 
![](https://www.zhihu.com/equation?tex=T_%7Bverify%7D)：target 并行验证的耗时
- 
![](https://www.zhihu.com/equation?tex=%5Ctau+%5Cin+%5B1%2C+%5Cgamma%2B1%5D)：**每个 cycle 平均被接受的 token 数**（接受长度，含 target 产出的 bonus token）最终加速比 
![](https://www.zhihu.com/equation?tex=%5Ceta+%3D+L_%7Btarget%7D%2FL)。这个公式把设计目标说得很清楚（Section 3.1）：

**要么提高接受长度 
![](https://www.zhihu.com/equation?tex=%5Ctau)，要么降低 drafting 开销 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D)。**
1.2 EAGLE-3 的死结：两个杠杆互相掐脖子
EAGLE-3 这类 SOTA 方法的 draft 模型是**自回归**的——草稿 token 也得一个接一个串行生成。于是 drafting 开销（Section 3.2, Eq. 2）是：

![](https://www.zhihu.com/equation?tex=+T_%7Bdraft%7D+%3D+%5Cgamma+%5Ccdot+t_%7Bstep%7D+)

**草稿开销随草稿长度 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 线性增长**。这就形成了一个死结：

- 为了让 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 不爆炸，自回归草稿模型只能做得**极浅**（EAGLE-3 就是**单层 transformer**）。
- 但模型一浅，容量就不够，草稿质量上不去 → **接受长度 
![](https://www.zhihu.com/equation?tex=%5Ctau) 很快饱和**：你加大 
![](https://www.zhihu.com/equation?tex=%5Cgamma)，草稿开销涨了，可被接受的 token 数却不再增加。
- 两头受限的结果：论文指出自回归 drafting「effectively caps achievable speedups at approximately 2−3×」（Section 1）。EAGLE-2 用自适应草稿树、EAGLE-3 改训练目标，本质都是在「不敢把草稿模型做深」这个约束下榨性能。DFlash 的切入点是直接拆掉这个约束。

1.3 已有的 diffusion drafter 为什么也不行？
论文在 Related Work（Section 2.3）和引言里点名了几条已有路线，说明「用 diffusion 做草稿」并非新想法，但都不实用：

- **DiffuSpec / SpecDiff-2**：直接用大的预训练 dLLM（如 7B 参数）当草稿模型。接受长度确实长，但**草稿模型本身太大、drafting 延迟太高**，实际加速只有 3-4×（Section 1）。
- **PARD**：训练小的自回归模型去模仿 diffusion 式并行生成。但小模型缺乏 target 的建模能力，**接受长度受限，加速天花板约 3×**（Section 1）。能不能造一个**既轻量又高精度**的 diffusion 草稿模型？

2. 核心洞察：并行 drafting 改变了整个设计空间

2.1 Diffusion drafting 让 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 与 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 解耦
DFlash 用 **block diffusion** 草稿模型：一次 forward 就**并行去噪（denoise）整个 block 的所有 mask token**。于是草稿开销变成（Section 3.2, Eq. 3）：

![](https://www.zhihu.com/equation?tex=+T_%7Bdraft%7D+%3D+t_%7Bparallel%7D+)

其中 
![](https://www.zhihu.com/equation?tex=t_%7Bparallel%7D) 是一次 block 并行生成的延迟。论文的关键论断（Section 3.2）：

 现代 GPU 执行并行操作远比多次串行 forward 高效，所以 
![](https://www.zhihu.com/equation?tex=t_%7Bparallel%7D+%5Cll+%5Cgamma+%5Ccdot+t_%7Bstep%7D)；**对中等大小的 block，
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 几乎对 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 不敏感**。这就是「Flash」的来源——草稿开销不再随草稿长度线性增长，而是近似一个常数。

**Figure 3：DFlash 与 EAGLE-3 的草稿开销对比（核心证据图）** 横轴是草稿 token 数（4/8/16），纵轴是单次 drafting 延迟（ms）。灰色 EAGLE-3 的延迟随 token 数从 ~6ms 飙升到 ~25ms（线性增长）；而蓝/橙/绿三条 DFlash（1/3/5 层）几乎保持平坦，即使 5 层模型在 16 token 时也只有 ~5ms。
![](https://pic1.zhimg.com/v2-9126f7eef1d5b14c5cc381d20fbcf20a_r.jpg)**关键启示**：草稿开销与草稿长度解耦后，”把草稿模型做深”几乎不增加延迟。

2.2 解耦之后：可以放心把草稿模型做深
这是全文逻辑最漂亮的地方。一旦 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 不再随 
![](https://www.zhihu.com/equation?tex=%5Cgamma) 线性增长，设计空间就被彻底解放（Section 3.2 末 + Section 4.1）：

 diffusion drafters can afford **deeper, more expressive** architectures without sacrificing latency.论文给出的实测对比（Section 4.1）：

 一个 **5 层** DFlash 草稿模型生成 16 个 token，**延迟比生成 8 个 token 的单层 EAGLE-3 还低**（Figure 3），同时接受长度更高——把 DFlash 放到了一个更优的「草稿质量 vs 草稿开销」Pareto 前沿上。对比一下两条技术路线的根本差异，就能理解加速差距从哪来：

![](https://pica.zhimg.com/v2-7167de6ae463d9e466e849e16dcb0692_r.jpg)下一节展开第二个杠杆——光有「快」还不够，还得「准」（高 
![](https://www.zhihu.com/equation?tex=%5Ctau)），这就靠 target feature conditioning。

3. 第二个杠杆：让草稿模型「站在 target 的肩膀上」
并行 drafting 解决了「快」，但如果草稿质量不行、
![](https://www.zhihu.com/equation?tex=%5Ctau) 上不去，加速还是有限。DFlash 提高 
![](https://www.zhihu.com/equation?tex=%5Ctau) 的核心思想一句话概括（Section 1）：

**The target knows best.**
3.1 为什么用 target 的 hidden features，而不是从零推理
论文引用 Samragh et al. (2025) 的观察：大的自回归 LLM 的 **hidden features 隐式编码了多个未来 token 的信息**（Section 1, Section 4.1）。这些深层表征比 token 级 logits 携带的信息丰富得多——捕捉了长程依赖、任务语义，并且关键地，隐含了未来 token 的预测信息。

DFlash 的做法（Section 4.1）：

- target 模型对输入 prompt 做一次标准 prefill，生成第一个 token；
- 这一趟里，从 target 的 **5 个均匀采样的层**（论文实现：第 2 层到倒数第 3 层之间均匀取，Section 5 Implementation）抽取 hidden states；
- 把这些 hidden states 拼接，过一个轻量 projection 层融合跨层信息，得到一个紧凑的 **target context feature**；
- 用它来条件化（condition）草稿模型。于是草稿模型不必「from scratch 推理」，而是变成了 target 模型深层表征的一个 **diffusion adapter**——把 target 的推理能力和小 diffusion 草稿模型的并行速度融合在一起（Section 1 末）。

3.2 关键区别：KV 注入 vs 仅输入层 fuse（这是它赢 EAGLE-3 的第二个点）
这里是 DFlash 与 EAGLE-3 在「用 target feature」上的根本分歧，论文专门强调（Section 4.1, “Conditioning via KV injection enables acceptance scaling”）：

- **EAGLE-3 的做法**：也用 target 的 hidden features，但只把它和草稿模型的 token embedding 融合后**作为输入喂进去**。问题是：随着草稿模型变深，这个输入层的信息会**越来越稀释（diluted）**，导致「加草稿层数 → 接受长度的增益递减」。
- **DFlash 的做法**：把 target context feature 当作**持久的上下文信息**，直接注入到**每一层** draft layer 的 **Key / Value 投影**里，并在多次 drafting 迭代间复用（缓存在草稿模型的 KV cache 中）。**Figure 2：DFlash 推理设计** 左侧 target model 对 “Diffusion is good” 做 prefill，抽出的 hidden context features（蓝色）被融合后注入到 Draft Layer 1/2/… 的 KV Cache。每个 draft layer 内部是 Bidirectional Attention + MLP，对 mask token（紫色）并行去噪，最后过 target LM Head 输出草稿。
![](https://pic4.zhimg.com/v2-b9d717c506542cbea7412740a537490d_r.jpg)**关键**：蓝色的 target context feature 出现在每一层的 KV cache 里，而不只是输入端。

这个设计带来的好处（Section 4.1）：在整个草稿模型中提供**强且一致**的条件信号，使接受长度能**随草稿层数有效 scale**（而不是像 EAGLE-3 那样饱和）。

**Table 9：KV injection vs 输入层 fusion 的消融（拆分两个增益的关键证据）** 这张表把两个创新点解耦了。在**自回归 drafting** 下，把注入方式从 input 换成 KV（DFlash-AR），GSM8K 接受长度 τ 从 EAGLE-3-5L 的 4.2 升到 4.8；在 **block-diffusion drafting** 下，KV 注入（τ=3.3 on GSM8K）也优于 input fusion（τ=2.9）。
 
![](https://pica.zhimg.com/v2-7b14e3f5c60eee413b3703bbdefd57b4_r.jpg)Table 9 是理解「为什么更快」最重要的消融，它证明 DFlash 的两个增益**可以分离**：

- **KV injection**（更强的条件信号）——即使在自回归 drafting 上也能涨 τ，所以这个增益独立于 diffusion；
- **parallel diffusion drafting**（更快的草稿）——降 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D)，让你能堆深度。换句话说，DFlash 同时撬动了加速公式 
![](https://www.zhihu.com/equation?tex=L%3D%28T_%7Bdraft%7D%2BT_%7Bverify%7D%29%2F%5Ctau) 的**两个杠杆**：parallel diffusion 压低分子里的 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D)，KV injection 抬高分母里的 
![](https://www.zhihu.com/equation?tex=%5Ctau)。而 EAGLE-3 受限于自回归，两个杠杆互相牵制。这就是 2.5× 差距的机制性来源。

4. 训练设计：怎么把 diffusion 草稿模型训得和推理对齐
草稿模型要训得好，关键是**训练行为要匹配推理时的投机解码行为**。这部分与训推一致极其相关。论文在 Section 4.2 提了 5 个设计：

4.1 KV injection 训练
给定 prompt+response 的 clean 序列，先整段过 target 抽取并融合所有 token 的 hidden features，再把它们作为 Key/Value 注入草稿模型（Section 4.2, Figure 4）。即训练时就模拟推理时的注入路径。

4.2 Random anchor sampling（训推一致性的核心设计）
标准 block diffusion 训练是把 response 均匀切块、块内随机 mask。DFlash 不这么做（Section 4.2）：

 随机采样 **anchor tokens**，每个 anchor 作为一个 block 的**首位**，mask 掉块内其余位置，训练草稿模型并行预测后续 `block_size − 1` 个 token。为什么这样设计？因为它**直接匹配推理时的行为**——推理时草稿模型总是条件于一个由 target 产出的 clean token（即上一步验证的 bonus token）。随机化 anchor 位置还让草稿模型见到更多样的 target context feature，提升数据效率和覆盖度。

**Table 13** 验证了这个策略「substantially improves both acceptance length and speedup」（Section 4.2）。
 **Figure 4：DFlash 训练 attention mask** 左半（From Target Model）是 target 提供的 context features（蓝），条件化草稿模型；输入由 clean prompt token p 和 clean response token r 组成。每个 mask block 内，一部分 clean response token（黄）被随机采为 anchor，mask token（绿）标记并行预测的位置。白色表示 attention mask——强制因果一致性并防止 block 间信息泄漏。
![](https://pic2.zhimg.com/v2-7f08d0c87bcda592eecbb5b5532fb071_r.jpg)
4.3 Sparse attention mask 高效训练
所有 block 拼成一个序列联合处理（Figure 4）：token 在**同一 block 内双向 attend**、并 attend 对应的 target context feature；**跨 block 的 attention 被禁止**。这样能用一次 forward/backward（借助 Flex Attention, Dong et al. 2024）高效训练多个 block。

4.4 Loss weighting（位置加权，加速收敛）
论文观察「not all tokens are equal」——一个 block 里**靠前位置预测错了，后面所有 token 都作废**，所以早位置对接受长度的影响更大。于是用指数衰减权重加权交叉熵（Section 4.2, Eq. 4）：

![](https://www.zhihu.com/equation?tex=+w_k+%3D+%5Cexp%5Cleft%28-%5Cfrac%7Bk-1%7D%7B%5Cgamma%7D%5Cright%29+)

![](https://www.zhihu.com/equation?tex=k) 是 token 在 block 内的位置，
![](https://www.zhihu.com/equation?tex=%5Cgamma) 控制衰减率。早位置权重大 → 收敛更快、接受长度比均匀加权更高。

**Figure 5**：loss weighting 让训练「收敛更快也更好」——loss decay 曲线更低（Section 4.2, Figure 5）。
![](https://pic4.zhimg.com/v2-6e97a6bddc5d3f78ea7982ed29b39279_r.jpg)
4.5 共享 embedding 与 LM head
草稿模型**共享 target 的 token embedding 层和 LM head 并冻结**，只训练草稿 transformer 层（Section 4.2）。这减少了可训练参数，也鼓励草稿模型作为一个「轻量 diffusion adapter」紧密对齐 target 的表征空间。

5. 实验：加速到底有多少

5.1 主结果（Instruct 模型，Transformers 后端）
**Table 1：Qwen3-4B / 8B 上的加速与接受长度 τ** 覆盖 Math（GSM8K/MATH-500/AIME25）、Code（HumanEval/MBPP/LCB）、Chat（MT-Bench），分 temperature=0 和 temperature=1。EAGLE-3 给了两档：tree size 16（公平草稿预算）和 tree size 60（最大化接受长度）。
 
![](https://pic1.zhimg.com/v2-bb5a6b685f6ba3c1c67a8ea6940ddff4_r.jpg)提炼 Qwen3-8B 的关键数字（Table 1, Section 5.1）：

设置DFlash 平均 speedup对比 EAGLE-3temperature=0（greedy）4.9×比 EAGLE-3(16) 高 2.4×temperature=1（采样）4.1×比 EAGLE-3 高 2.2×最有说服力的一点（Section 5.1）：

 DFlash **甚至超过了 EAGLE-3 tree size 60** —— 在取得更高接受长度的同时，验证开销还显著更低。EAGLE-3 想提高 τ 只能加大草稿树（tree size 60），但更大的树意味着更高的 
![](https://www.zhihu.com/equation?tex=T_%7Bverify%7D)；DFlash 靠 KV injection 把 τ 提上去，同时靠并行 drafting 把 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 压下来，所以在 τ 和总开销上**双赢**。

5.2 非 greedy
Table 1 的 **temperature=1** 行显示：DFlash 在采样解码下 Qwen3-8B 仍保持 **4.1× 平均加速**，相对 EAGLE-3 的 **2.2× 优势**。绝对加速比 greedy（4.9×）略降，但相对 EAGLE-3 的领先幅度几乎不变。

投机解码本身是无损的（lossless），采样下加速下降是因为接受率天然降低——这点 DFlash 和 EAGLE-3 都逃不掉。但 DFlash 的相对优势在采样下基本保持（2.4× → 2.2×），说明它的接受率增益**不是只在 greedy 下成立的特例**，而是来自更本质的草稿质量提升。

5.3 Reasoning 模型（thinking mode）
**Table 2：开启 thinking mode 的 Qwen3-4B/8B** 在 GPQA / MATH-500 / AIME25 上，草稿模型用带 reasoning trace 的 target 输出训练。
![](https://pic2.zhimg.com/v2-ae365a1db2a5e21fd1b49054f5e9c59b_r.jpg)结果：thinking mode 下维持高接受长度，约 **4.5× 和 3.9×** 加速（Section 5.2），τ 在 5-5.8 量级。论文强调这对推理模型的实际部署尤其有价值——因为它们生成时间长，加速收益绝对值更大。

5.4 真实 serving 框架（SGLang + FA4）
**Table 3：SGLang（FlashAttention-4 后端，B200 GPU，开 Spec-v2 调度 overlap）的吞吐** 报告 token/s 吞吐、相对 baseline 的加速、平均 τ；并发度从 1 扫到 32。
 
![](https://pic3.zhimg.com/v2-e50878342526c0df228628225f325952_r.jpg)Qwen3-8B 上最高 **5.1× 加速**，并发 1→32 全程都有加速（Section 5.3）。

注意一个真实部署的规律：随并发升高，加速比下降（如 Qwen3-4B Math500 从并发 1 的 4.8× 降到并发 32 的 2.9×）。这是因为高并发下系统从 memory-bound 转向 compute-bound——投机解码的红利主要来自把 memory-bound 的串行解码变成并行，当 GPU 已经被高并发喂饱时，红利自然缩小。

5.5 长文本适配
**Table 4：base Qwen3.5-27B 草稿模型 vs 长文本微调后，在 LongBench 上不同 context 长度的接受长度**
![](https://picx.zhimg.com/v2-460b841d0192a4788ac801b29d7d7927_r.jpg)关键发现（Section 5.4）：base DFlash 草稿模型在 4K 以内训练，**context 超过 4K 后接受长度退化**；但用 1.6K 条 LongAlign-10K 样本微调 3 epoch 后，长文本上的接受长度**保持甚至提升**（如 gov_report 在 16K 从 base 的 2.67 升到 long 的 3.81，32K 仍有 3.56 而 base 已无法工作）。

这说明 DFlash 的长文本能力**不是免费的**——target context feature 的抽取机制在长序列上需要专门适配。好消息是适配成本很低（1.6K 样本）。结论是：草稿模型的长度泛化要单独训，而且代价不大。

5.6 关键消融汇总
消融表结论草稿层数 3/5/8Table 68 层 τ 最高但延迟增加，5 层综合 speedup 最优（质量 vs 开销平衡）target hidden features 3⁄5Table 75 个特征 > 3 个（更丰富语义/未来信息），但训练存储随特征数线性增加block size 训练/推理Table 8BS16 接受长度 > BS8；大 BS 训练能泛化到小 BS 推理，反之不行KV injection vs inputTable 9KV 注入在 AR 和 diffusion drafting 上都更优（见 §3.2）无 target conditioningTable 10纯 5 层 diffusion 草稿（不用 target feature）只有 2-3× → 证明 conditioning 是关键**Table 8：训练/推理 block size 的泛化（与训推一致性相关）**
![](https://pic1.zhimg.com/v2-61fc2105c3813d8493fdbea91a9c8388_r.jpg)Table 8 的非对称泛化（大 BS 训练→小 BS 推理 OK，反之不行）很有意思：训练时用**大于等于**推理时的 block size，能让一个模型支持推理时动态调整 block size。论文把「自适应 block size 调度」留作 future work。

Table 10 则是反证：把 target conditioning 拿掉，纯 5 层 block diffusion 草稿模型只能到 2-3×（Section 4.1）——和已有 diffusion drafter 一个水平。**这直接证明：DFlash 的加速不是 diffusion 本身带来的，而是「diffusion 并行 + target conditioning」的组合。**

![](https://pic4.zhimg.com/v2-abe8037daf53dbd4cdea40cac2ae0be3_r.jpg)
6. 总评：为什么 DFlash 能比 EAGLE-3 加速更多？
DFlash 赢 EAGLE-3 的本质，是它**第一次同时撬动了加速公式 
![](https://www.zhihu.com/equation?tex=L%3D%28T_%7Bdraft%7D%2BT_%7Bverify%7D%29%2F%5Ctau) 的两个杠杆**，而 EAGLE-3 受自回归架构所限，两个杠杆互相牵制：

![](https://pic4.zhimg.com/v2-dd8e5b71b75e5aa7708315b2646aa067_r.jpg)三个关键点串起来：

- **并行 drafting 解耦了 
![](https://www.zhihu.com/equation?tex=T_%7Bdraft%7D) 和 
![](https://www.zhihu.com/equation?tex=%5Cgamma)**（Figure 3）→ 草稿开销不再随草稿长度线性增长 → 可以放心把草稿模型做深（5 层）而几乎不加延迟。
- **全层 KV 注入 target context feature**（Figure 2, Table 9）→ 草稿模型站在 target 的深层表征上推理，τ 高且随深度 scale，甚至超过 EAGLE-3 的大草稿树（tree size 60）而验证开销更低。
- **两个增益可分离**（Table 9 + Table 10）→ 证明这不是 diffusion 的玄学红利，而是「并行架构 + 强条件信号」的工程化组合，缺一不可。
几点启示

- **训推一致性**：random anchor sampling（§4.2）和 block size 非对称泛化（Table 8）是这篇论文做训推对齐的两个可直接借鉴的设计——核心思想都是「训练时模拟推理时草稿模型条件于 target clean token 的行为」。
- **非 greedy**：DFlash 在采样下相对 EAGLE-3 的优势基本保持（2.2× vs greedy 2.4×），但论文没拆解采样下接受率的分布特性。
- **长文本**：长度泛化要单独微调，但成本很低（1.6K 样本，Table 4）。
- **一个值得思考的局限**：DFlash 需要 target 模型在 prefill 时额外抽取 5 层 hidden features，并维护草稿模型的 KV cache（Table 7 指出存储随特征数线性增加）。在极端 memory 受限或超高并发场景，这部分开销和「加速随并发下降」的现象（Table 3）值得在实际选型时纳入考量。