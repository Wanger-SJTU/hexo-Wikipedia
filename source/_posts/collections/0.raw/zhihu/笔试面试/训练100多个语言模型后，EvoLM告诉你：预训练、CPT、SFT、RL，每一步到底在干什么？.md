---
title: "训练100多个语言模型后，EvoLM告诉你：预训练、CPT、SFT、RL，每一步到底在干什么？"
date: 2026-04-06
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2024394597879619874

---

论文：EvoLM: In Search of Lost Language Model Training Dynamics (NeurIPS 2025) 
作者：Zhenting Qi, Fan Nie, Alexandre Alahi, James Zou, Himabindu Lakkaraju, Yilun Du, Eric Xing, Sham Kakade, Hanlin Zhang 
机构：Harvard, Stanford, EPFL, CMU大家有没有这样的困惑：现在开源模型动不动就是 pretrain → CPT (continued pre-training)→ SFT → RL 四段式训练，但每一步到底贡献了什么？多训一点好还是少训一点好？SFT和RL的数据该怎么分配？

NeurIPS 2025 Oral文章 EvoLM: In Search of Lost Language Model Training Dynamics 做了一件非常”笨”但极有价值的事：**从头训练了100多个1B和4B参数的语言模型**，系统地控制变量，把预训练到RL每个阶段的scaling行为摸了个遍。EvolLM所有模型、数据、代码全部开源，非常点赞👍。

![](https://pic1.zhimg.com/v2-76f5380a2bf2df1b6fa7a9b5fb3fb3dc_r.jpg)EvoLM概览：一个用于研究语言模型训练动态的透明模型套件，涵盖预训练、持续预训练（CPT）、监督微调（SFT）和强化学习（RL）四个阶段。该框架同时评估上游（语言建模）和下游（问题求解）性能，覆盖域内（如数学）和域外（如代码、逻辑）场景，从而支持对设计权衡与scaling行为的系统性分析。我仔细读完之后，觉得这篇论文的价值不在于单个发现有多惊人，而在于它用**极其透明和系统的方式**回答了一堆实践中大家”凭感觉”做的决定。下面我挑几个我觉得最有意思的发现聊聊。

一、预训练不是越多越好，甚至可能有害
EvoLM在FineWeb-Edu上从10B到320B tokens预训练了0.5B、1B、4B三个规模的模型。上游任务（HellaSwag、ARC等）的表现随tokens增加稳步上升，但在大约
![](https://www.zhihu.com/equation?tex=80)x到
![](https://www.zhihu.com/equation?tex=160)x模型参数量之后迅速出现diminishing returns。

更有意思的是下游表现：当他们在这些预训练模型上做SFT+RL之后，1B模型的ID Maj@16准确率从20BT时的
![](https://www.zhihu.com/equation?tex=8%5C%25)涨到80BT时的
![](https://www.zhihu.com/equation?tex=15%5C%25)，但继续训到320BT只涨到
![](https://www.zhihu.com/equation?tex=17%5C%25)。而OOD任务在160BT之后甚至开始下降。

![](https://picx.zhimg.com/v2-f4499a931e8089aff4f56f3d223e3015_r.jpg)这说明过度预训练不仅收益递减，还可能损害OOD泛化能力。作者称之为”excessive over-training”（超过
![](https://www.zhihu.com/equation?tex=16)x Chinchilla最优比）。

**Takeaway**：预训练tokens不是越多越好。在约
![](https://www.zhihu.com/equation?tex=80)x–
![](https://www.zhihu.com/equation?tex=160)x模型参数量时就已经饱和，继续堆tokens反而可能让后续post-training表现变差。

二、CPT是被低估的关键环节
很多人做domain-specific模型时直接在base model上SFT，跳过continued pre-training (CPT)。EvoLM的实验清楚表明这是个错误。

在1B-160BT的base model上，**不做CPT直接SFT，GSM8K-Platinum的Pass@1只有
![](https://www.zhihu.com/equation?tex=6.04%5C%25)**；做了50BT的FineMath CPT后涨到
![](https://www.zhihu.com/equation?tex=19.27%5C%25)；而最优配置（8BT replay + 42BT FineMath）达到了
![](https://www.zhihu.com/equation?tex=21.01%5C%25)。

但CPT也不是无代价的：它会导致catastrophic forgetting。作者发现一个简单的”replay”策略——在CPT数据中混入约
![](https://www.zhihu.com/equation?tex=5%5C%25)的原始预训练数据——就能有效缓解遗忘，同时保持下游性能。过少（1.6BT）或过多（16BT）的replay都不行。

![](https://pic3.zhimg.com/v2-cb89e9fb5c50ade99dfb59fb8a932e5e_r.jpg)更重要的是，**没有CPT的模型做RL时甚至会变差**（Maj@16、RM@16都下降）。只有在充足的domain CPT基础上，RL才能稳定地带来增益。这个发现很实用：如果你想做math reasoning模型，别跳过CPT这一步。

三、SFT和RL的微妙博弈
**SFT epochs**：
![](https://www.zhihu.com/equation?tex=100)K样本固定，从
![](https://www.zhihu.com/equation?tex=1)到
![](https://www.zhihu.com/equation?tex=32)个epoch。ID性能在约
![](https://www.zhihu.com/equation?tex=8)个epoch饱和，但OOD性能在
![](https://www.zhihu.com/equation?tex=2)–
![](https://www.zhihu.com/equation?tex=4)个epoch就到峰值然后下降。这验证了大家常用的”
![](https://www.zhihu.com/equation?tex=3) epoch”经验值。而且，**过度SFT会压缩RL的提升空间**：模型已经过度拟合SFT数据，RL就没什么可改进的了。

**SFT数据量**：从
![](https://www.zhihu.com/equation?tex=50)K到
![](https://www.zhihu.com/equation?tex=400)K样本。ID性能单调递增，但OOD性能波动甚至下降。

![](https://pic4.zhimg.com/v2-d0a663c7f4d19f2f4a93f4a70ea90243_r.jpg)**RL epochs/数据量**：RL在
![](https://www.zhihu.com/equation?tex=4)–
![](https://www.zhihu.com/equation?tex=8)个epoch或
![](https://www.zhihu.com/equation?tex=50)K–
![](https://www.zhihu.com/equation?tex=100)K样本时饱和。超过之后，一个很有意思的现象出现了——correct ratio持续上升，但Pass@16反而下降。这意味着RL主要是在**提高已经会做的题的正确率**，而不是让模型学会做更多的题。

**数据分配**：在总共
![](https://www.zhihu.com/equation?tex=100)K样本的约束下，SFT/RL分配为
![](https://www.zhihu.com/equation?tex=70)K/
![](https://www.zhihu.com/equation?tex=30)K时ID性能最好，而
![](https://www.zhihu.com/equation?tex=10)K/
![](https://www.zhihu.com/equation?tex=90)K时OOD性能最好。这是一个实际工程中非常有用的trade-off参考。

![](https://pica.zhimg.com/v2-aa684f72fb83c488d0063ccda8cd422a_r.jpg)
四、一个容易被忽视的方法论问题：中间checkpoint不可靠
很多研究用长训练run的中间checkpoint来代替”专门训
![](https://www.zhihu.com/equation?tex=x)B tokens的模型”。EvoLM的实验表明这是有问题的。

从一个160BT run中取出40BT处的checkpoint，和专门训40BT的模型相比，后者在MATH Level 1上的Pass@16达到
![](https://www.zhihu.com/equation?tex=17.96%5C%25)，而前者只有
![](https://www.zhihu.com/equation?tex=9.38%5C%25)。差距巨大。原因是中间checkpoint没有经历完整的learning rate decay。

**Takeaway**：研究training dynamics时，不要用中间checkpoint当替代品，要each with its own complete schedule地训练。

五、ORM Score：一个被低估的无监督验证指标
作者发现，validation perplexity和下游准确率之间几乎没有相关性（
![](https://www.zhihu.com/equation?tex=r%5E2)接近
![](https://www.zhihu.com/equation?tex=0)），但ORM score（用Skywork-Reward-Llama-3.1-8B打分）和Maj@16准确率之间有很强的相关性，
![](https://www.zhihu.com/equation?tex=r%5E2)在
![](https://www.zhihu.com/equation?tex=0.62)到
![](https://www.zhihu.com/equation?tex=0.84)之间。这意味着在缺少标注测试集的场景下，ORM score可以作为可靠的无监督代理指标来评估模型质量。

![](https://pic4.zhimg.com/v2-c2547a506c23b396296d78460d349911_r.jpg)不同任务上准确率与ORM分数之间的相关性。每个子图对应一个数据集，其中每个点代表一个模型变体。虚线表示线性趋势，各子图标题中报告了Pearson相关系数。
![](https://pic3.zhimg.com/v2-d9f6cac5c5076d7bde229dc153f767a8_r.jpg)不同任务上准确率与验证集困惑度（PPL）之间的相关性。每个子图对应一个数据集，其中每个点代表一个经过后训练的模型变体。虚线表示线性趋势，各子图标题中报告了Pearson相关系数。
六、与”RL到底有没有用”之争的联系
读完EvoLM，我不由得联想到最近关于RLVR的一场精彩争论。

**Yue et al. (NeurIPS 2025 Best Paper Runner-up) **在”Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?“中提出了一个尖锐的观点：RLVR并没有赋予模型新的推理能力。他们的核心证据是pass@
![](https://www.zhihu.com/equation?tex=k)指标：当
![](https://www.zhihu.com/equation?tex=k)较小时（如
![](https://www.zhihu.com/equation?tex=k%3D1)），RL模型优于base model；但当
![](https://www.zhihu.com/equation?tex=k)很大时（如
![](https://www.zhihu.com/equation?tex=k%3D256)），base model的pass@
![](https://www.zhihu.com/equation?tex=k)反而更高。这说明RL只是让模型更频繁地采样到已有的正确路径（提高了sampling efficiency），但并没有扩展模型能解决的问题集合（reasoning boundary）。换个比喻：RL没有教会模型新招式，只是让它更稳定地使出已有的招式。

**MSRA的反驳论文（ICLR 2026）**“Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs”则指出，Yue et al.的结论之所以成立，是因为pass@
![](https://www.zhihu.com/equation?tex=k)这个指标本身有缺陷——它只看最终答案是否正确，不管推理过程对不对。Base model可能通过错误的推理链”蒙对”答案，这种情况在大量采样时会被放大。MSRA提出了一个新指标CoT-Pass@
![](https://www.zhihu.com/equation?tex=K)，要求推理过程和最终答案都正确。在这个指标下，RLVR模型全面超过base model，说明RL确实在促进正确推理，而不仅仅是sampling efficiency的优化。他们还给出了理论分析，说明RLVR的reward虽然只基于最终答案，但训练过程会隐式地激励正确的推理路径。

**EvoLM的数据恰好为这场争论提供了一个独立的、从头训练的视角。** 具体来说：

- **EvoLM验证了Yue et al.的核心观察，但加了重要限定条件。** EvoLM的Takeaway 10明确指出：”Beyond saturation regime, RL primarily increases the probability of sampling high-quality rollouts but does not necessarily improve models’ fundamental reasoning capabilities.” 这和Yue et al.的结论方向一致。而且EvoLM观察到的现象更加细腻：correct ratio持续上升，但Pass@16反而下降——这恰恰是RL在”集中火力”于已有正确路径的表现。
- **但EvoLM也表明，RL的效果高度依赖前序阶段。** EvoLM发现**没有CPT的模型做RL甚至会变差**（Takeaway 4），而充足的CPT能让RL带来越来越大的增益（Takeaway 5）。这说明Yue et al.的结论可能部分源于实验设置：他们使用的是off-the-shelf base models直接做zero-RL，跳过了CPT这个关键环节。如果base model本身缺乏足够的domain knowledge，RL当然难以”激发”新能力——因为种子都没有。
- **EvoLM的ORM分析间接支持了MSRA的观点。** EvoLM发现ORM score（衡量solution quality而非仅仅answer correctness）和下游准确率高度相关，而validation perplexity则不相关。这暗示RL确实在改善solution quality——也就是推理过程本身——而不仅仅是优化最终答案的采样概率。这和MSRA用CoT-Pass@
![](https://www.zhihu.com/equation?tex=K)发现RL提升了推理正确性的结论是一致的。
- **EvoLM揭示了一个更深层的问题：RL的”天花板”不是固定的，而是由整个训练pipeline决定的。** Yue et al.的结论隐含地假设base model的能力边界是RL的上限。但EvoLM表明，通过调整预训练tokens、CPT数据量、replay策略、SFT数据分配，RL的”天花板”可以被显著移动。这意味着”RL到底有没有用”这个问题的答案不是简单的yes或no，而是”取决于你的training recipe”。总结一下这三篇论文的关系：Yue et al.指出了RL的局限性（在特定设置下），MSRA指出了度量标准的问题并证明RL确实激励了正确推理，而EvoLM则从更宏观的pipeline视角告诉我们: **RL的效果是整个训练流程共同决定的，孤立地讨论”RL有没有用”可能本身就是一个ill-posed的问题。**

总结
EvoLM这篇论文的最大贡献不是某个单一的发现，而是它提供了一个**完整、透明、可复现的实验框架**来理解LM训练的全生命周期。对于做模型训练的同学来说，里面有很多实用的工程指导：

- 预训练
![](https://www.zhihu.com/equation?tex=80)x–
![](https://www.zhihu.com/equation?tex=160)x模型参数量就够了，别盲目堆tokens
- CPT别跳过，
![](https://www.zhihu.com/equation?tex=5%5C%25)的replay可以有效防遗忘
- SFT 
![](https://www.zhihu.com/equation?tex=3)个epoch左右是sweet spot，多了ID还行但OOD会掉
- RL 
![](https://www.zhihu.com/equation?tex=4)–
![](https://www.zhihu.com/equation?tex=8)个epoch饱和，用更多epoch比用更多数据更稳定
- 想要ID性能就多给SFT数据，想要OOD泛化就多给RL数据
- ORM score是比validation PPL更好的无监督验证指标所有模型和数据都开源了，值得关注。