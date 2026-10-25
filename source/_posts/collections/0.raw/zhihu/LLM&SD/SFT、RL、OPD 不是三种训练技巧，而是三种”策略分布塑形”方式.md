---
title: SFT、RL、OPD 不是三种训练技巧，而是三种”策略分布塑形”方式
date: "2026-05-30 00:00:00"
updated: "2026-05-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/SFT、RL、OPD-不是三种训练技巧,而是三种”策略分布塑形”方式/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2044017882586206645
---


2023-2026.05 真实论文时间线复盘
如果你只看 `pass@1`，会觉得 RLVR 当然赢了；如果你把 `pass@k`、`coverage`、`retention`、`steerability` 一起放上来，结论就开始变复杂。
过去两年，后训练研究真正发生变化的，不是”谁更强”，而是”到底是谁在改模型的策略分布”。

 结论：
<strong>SFT 在改外部数据集上的 token 分布，RL/RLVR 在改学生自己会访问到的 state distribution，OPD/OPSD 则是在 on-policy 状态上挂上更密的 teacher 信号。</strong>
所以这场争论的核心，不是 loss 名字，而是监督落在哪个分布上。
先把三者放到同一张图里

![](https://pic3.zhimg.com/v2-366528f662c725269113a4d06021018a_r.jpg)
![](https://pic3.zhimg.com/v2-36b23b6b15065a9448c1d7d29d2aeb1e_r.jpg)
![](https://pic3.zhimg.com/v2-b1686716443238ca5f41c6145e0bc2dc_r.jpg)范式训练时的数据从哪来监督信号是什么它最像在做什么典型风险SFT固定数据集 statestoken-level cross-entropy把模型直接拉向外部示范分布容易遗忘，且高分不一定可持续RL / RLVR学生自己采样的 statesreward / verifier在学生可达区域里做局部改写可能只是重加权已有路径，pass@1 升但多样性掉OPD / OPSD学生自己采样的 statesteacher logits / verbal feedback / privileged context在 on-policy 状态上做 dense supervision可能 mode collapse，或对 style token 过更新
![](https://picx.zhimg.com/v2-52551c8c32a61a9ed76803c1a5318f1d_r.jpg)

这也是为什么，近两年的争论越来越不像”RL 到底有没有用”，而更像”它到底是扩展了支持集，还是只把概率质量搬到了旧路径上”。

我核验到的相关论文，按研究方向统计
 统计口径：只算与 `SFT / RL / OPD` 分布争论直接相关、且可在一手来源核验到的论文。
截至 `2026-05-29`，我核验到 `16` 篇直接相关代表作。
![](https://picx.zhimg.com/v2-a8939d4964511a70ed639e03c0dda741_r.jpg)

![](https://pic4.zhimg.com/v2-f9d9709ef0038ed65ea074f3f3af7821_r.jpg)

时间线：这场争论是怎么一路演化到今天的

![](https://pic1.zhimg.com/v2-b3894126199a5a2536a55bfaa02834ae_r.jpg)

时间论文这篇把争论往哪推2023-06 / ICLR 2024On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes把 on-policy 蒸馏作为正式范式提出，核心是让学生在自己会遇到的轨迹上学习2025-06 / EMNLP 2025Rewarding the Unlikely: Lifting GRPO Beyond Distribution Sharpening直接点出 GRPO 的 rank bias，说明它可能更像”分布锐化”而不是”发现新解”2025-07 / AI4Math@ICML25 OralDoes Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?把 RLVR 的上限问题讲得非常直白：大 k 下 base model 反而更强，当前 RLVR 更像在重排已有路径2025-10 / ICLR 2026Quagmires in SFT-RL Post-Training: When High SFT Scores Mislead and What to Use Instead说明高 SFT 分数不一定能预测后续 RL 效果，训练数据的”好看”不等于后训练的”好用”2025-10 / ICLR 2026Spectrum Tuning: Post-Training for Distributional Coverage and In-Context Steerability把问题从”答对没”扩展到”能不能覆盖足够多的有效输出分布”2025-11 / NeurIPS 2025Q#: Provably Optimal Distributional RL for LLM Post-Training把 LLM 后训练进一步理论化成 KL-regularized distributional RL，说明”分布视角”已经不只是口号2025-12 / ICLR 2026Whatever Remains Must Be True: Filtering Drives Reasoning in LLMs, Shaping Diversity直接把 RL 解释成 mode-seeking / reverse KL 的过滤过程，强调它会压缩多样性2026-01OVD: On-policy Verbal Distillation把 token-level 对齐改成 verbal feedback，试图降低 on-policy 蒸馏的显存和对齐成本2026-01Self-Distilled Reasoner: On-Policy Self-Distillation for Large Language Models把教师和学生合并到同一模型里，用 privileged context 实现 OPSD2026-02Fast and Effective On-Policy Distillation from Reasoning Prefixes发现 OPD 的信号常集中在 prefix，说明”只蒸馏前缀”可能足够高效2026-03Entropy-Aware On-Policy Distillation of Language Models指出 reverse KL 在高 entropy teacher 上会伤害多样性，提出 forward+reverse 的折中2026-05On-Policy Self-Distillation with Sampled Demonstrations Reduces Output Diversity给 OPSD 加了一个现实警报：强 pass@1 不代表强 diversity，甚至可能更窄2026-05Rethinking On-Policy Self-Distillation for Thinking Models进一步提醒 privileged self-distillation 可能损伤长预算推理行为2026-05Rethinking RL for LLM Reasoning: It&#39;s Sparse Policy Selection, Not Capability Learning把 RL 的有效更新压缩到少量高熵决策点，提出几乎无 RL 的替代方法2026-05Post-Training is About States, Not Tokens: A State Distribution View of SFT, RL, and On-Policy Distillation把分歧重新统一到 state distribution：监督打在哪些状态上，比只看 token loss 更重要
证据表：哪些论文真正改变了讨论方式
论文关键实验 / 现象直接含义局限On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes学生在自己的轨迹上学习，明显减少 train-inference mismatchon-policy 不是细节，而是 OPD 的核心几何约束仍然依赖 teacher 信号，不等于”发现新能力”Rewarding the Unlikely...GRPO 会偏向高概率解，低概率但正确的证明被忽略“分布锐化”不是比喻，是可测的 rank bias主要在 theorem proving，外推到所有任务要谨慎Does RL Really Incentivize...大 k 下 base model 反超 RLVR，reasoning boundary 反而收缩当前 RLVR 更多是 reweighting，而不是扩展支持集说的是”当前方法”，不是 RL 的全部可能性Reinforcement Learning with Verifiable Rewards...CoT-Pass@K 下，RLVR 对正确推理链的提升比单看答案更清楚pass@1 低估了推理质量，CoT-Pass@K 更接近真实 reasoning依赖 verifier / judge 的定义Quagmires in SFT-RL Post-Training...高 SFT 分数不一定带来更好 RL 结果，数据组成很重要SFT 质量不能只看 SFT 自己的分数，要看它对后续 RL 的可塑性需要大量实验才能做稳健预测Post-Training is About States, Not Tokens...mild SFT、stress SFT、OPD、RL 的 retention 差异，和 state locality 强相关真正重要的是”监督落在哪些 state 上”目前还是小规模 study，但方向感非常强Spectrum Tuning... + Whatever Remains Must Be True...当前 post-training 会损害 coverage / steerability，RL 还会压缩 diversity后训练不只是”把正确答案抬高”，还要保住输出空间多答案任务与单答案任务的评估逻辑不同
六维雷达图：SFT / RL / OPD 谁在哪个维度强

![](https://pic2.zhimg.com/v2-eaa94595bb1c5c2d1c767edb7ec6bb33_r.jpg)

几个直观观察：

- <strong>SFT 的致命短板是 off-policy</strong>——信号密度最高，但训练和推理的状态分布不匹配
- <strong>RL/RLVR 的致命短板是信号稀疏</strong>——on-policy 程度最高，但只有标量 reward，没有逐 token 指导
- <strong>OPD/OPSD 看起来最均衡</strong>——但 2026 年 5 月的两篇论文敲了警钟：多样性可能比 RL 还差
核心权衡：密度 x On-Policy x 多样性

![](https://pic1.zhimg.com/v2-b3894126199a5a2536a55bfaa02834ae_r.jpg)这张图是整篇文章最想传达的信息：

- <strong>SFT</strong>：信号密，但 off-policy → 训练时学的状态，推理时碰不到
- <strong>RL/RLVR</strong>：on-policy，但信号稀 → 只知道”这条路径好不好”，不知道”哪里好、哪里差”
- <strong>OPD/OPSD</strong>：密 + on-policy → 看起来最理想，但多样性塌缩是真实风险
- <strong>Spectrum Tuning</strong> 和 <strong>Entropy-Aware OPD</strong>：开始往右上角（理想区域）挪，但都只走了一步<strong>未来最重要的方向，就是怎么同时拿到密度、on-policy、和多样性。</strong>

这条线的真实结论，已经慢慢收敛成什么样了？

1. `RLVR` 更像”分布重加权”，不是凭空发明新策略
这点是争论中心。
`Does RL Really Incentivize...` 这类工作告诉我们，当前很多 RLVR 方法在大 `k` 上并没有显著扩大 base model 的支持集，更多是在已有路径里把正确答案的概率往上搬。
`Rewarding the Unlikely...` 则进一步说明，`GRPO` 甚至可能偏爱”本来就更容易被采样到”的高概率证明，忽略低概率但正确的解。

2. 但 `RLVR` 也不是”只有分布锐化”
`RLVR Implicitly Incentivizes...` 的意义在于，它提醒我们不能只看最终答案。
如果加入 `CoT-Pass@K`，RLVR 在正确推理链上的改善会更清楚。
所以更准确的说法是：<strong>当前 RLVR 往往先改变概率质量分布，再逐步影响推理链质量；但它是否真的”扩展能力边界”，仍然依赖具体算法、训练长度和评估口径。</strong>

3. `OPD / OPSD` 的关键，不是 teacher 多强，而是 state 属于谁
`OPD` 系列论文有一个非常统一的信号：
只要训练发生在学生自己会访问的状态上，很多”老师与学生差很多”的现象都会被抹平。
这就是为什么 `OPD` 的学生有时会比 teacher 更稳，甚至在 retention 上超过 teacher。
换句话说，<strong>teacher 负责给信号，state distribution 负责决定信号打到哪里。</strong>

4. 后训练未来真正的战场，是 `density × unbiasedness × on-policy × diversity`
现在的各条路线，基本都只占了其中两项：

- `SFT`：密，但 off-policy。
- `RL/RLVR`：on-policy，但稀疏。
- `OPD`：密，也 on-policy，但容易带来偏差和多样性塌缩。
- `Spectrum Tuning` 和 `Whatever Remains...`：开始把 `coverage` 和 `steerability` 当成最重要优化点。
- `Entropy-Aware OPD` 和 `OVD`：开始从工程上修补高 entropy、显存和对齐成本。后训练的本质，已经从”改 token”变成”改 state distribution”。可以总结为三句话：

- <strong>SFT、RL、OPD 的本质差别，不是”用什么 loss”，而是”监督落在哪个分布上”。</strong>

- **RLVR 当前更像在 base model 支持集内做概率重分配，是否能真正”发现新推理能力”，要看大 `k`、`CoT-Pass@K` 和 diversity。**

- **未来最重要的指标，不会只有 `pass@1`，而会是 `pass@k + CoT-Pass@K + coverage + steerability + retention` 的组合。**

参考文献

- Agarwal, R., et al. “On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes.” ICLR 2024. [链接](https://link.zhihu.com/?target=https%3A//proceedings.iclr.cc/paper_files/paper/2024/hash/5be69a584901a26c521c2b51e40a4c20-Abstract-Conference.html)
- Setlur, A., et al. “Rewarding the Unlikely: Lifting GRPO Beyond Distribution Sharpening.” EMNLP 2025. [链接](https://link.zhihu.com/?target=https%3A//aclanthology.org/2025.emnlp-main.1298.pdf)
- Yue, Y., et al. “Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?” NeurIPS 2025 Oral, AI4Math@ICML25 Oral. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DupehLVgq1b)
- Wen, X., et al. “Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs.” ICLR 2026. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DjGbRWwIidy)
- “Quagmires in SFT-RL Post-Training: When High SFT Scores Mislead and What to Use Instead.” ICLR 2026. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DuLM3BfKo19)
- “Q#: Provably Optimal Distributional RL for LLM Post-Training.” NeurIPS 2025. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DMrRdupucYb)
- “Spectrum Tuning: Post-Training for Distributional Coverage and In-Context Steerability.” ICLR 2026. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3Dulvp7cbZeU)
- “Whatever Remains Must Be True: Filtering Drives Reasoning in LLMs, Shaping Diversity.” ICLR 2026. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DpPWQUdhYSV)
- “Black-Box On-Policy Distillation of Large Language Models.” arXiv:2511.10643, 2025. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2511.10643)
- “OVD: On-policy Verbal Distillation.” arXiv:2601.21968, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.21968)
- “Self-Distilled Reasoner: On-Policy Self-Distillation for Large Language Models.” arXiv:2601.18734, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.18734)
- “Fast and Effective On-Policy Distillation from Reasoning Prefixes.” arXiv:2602.15260, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2602.15260)
- “Entropy-Aware On-Policy Distillation of Language Models.” arXiv:2603.07079, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2603.07079)
- “On-Policy Self-Distillation with Sampled Demonstrations Reduces Output Diversity.” ICLR 2026 submission. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DPAz606dOEx)
- “Rethinking On-Policy Self-Distillation for Thinking Models.” ICLR 2026 submission. [链接](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DVhCJItwQHn)
- “Rethinking RL for LLM Reasoning: It’s Sparse Policy Selection, Not Capability Learning.” arXiv:2605.06241, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.06241)
- “Post-Training is About States, Not Tokens: A State Distribution View of SFT, RL, and On-Policy Distillation.” arXiv:2605.22731, 2026. [链接](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.22731)<strong>框架参考（非论文引用）：</strong>

[SFT, RL, and On-Policy Distillation Through a Distributional Lens](https://link.zhihu.com/?target=https%3A//nrehiew.github.io/blog/sft_rl_opd/)
- [在分布视角下看 SFT / RL / On-Policy Distillation](https://link.zhihu.com/?target=https%3A//syt-nju.github.io/files/visual-reading/post-training-distributional-view/)（NJU 可视化页）
- [Fast and Effective On-policy Distillation from Reasoning Prefixes](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2602.15260)