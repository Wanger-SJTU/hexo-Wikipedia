---
title: "再深挖DeepSeek-R1: Reward is Enough"
date: "2025-11-01 00:00:00"
updated: "2025-11-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/再深挖DeepSeek-R1_-Reward-is-Enough/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/20053834500
---


我是小冬瓜AIGC，原创超长文知识分享，原创课程已帮助多名同学速成上岸LLM赛道。  
研究方向：LLM、RL、RLHF*Reward is Enough.*

### 前言

我们在前日对`DeepSeek-R1`进行了解读，更多关注实现的方法和成效

[![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1649a72079f6.png)小冬瓜AIGC：【解读】DeepSeek-R1：RL前真的不需要SFT了吗???168 赞同 · 13 评论 文章](https://zhuanlan.zhihu.com/p/19623772462)

仔细想来仍有较多值得玩味的地方，我们以端到端视角看`DeepSeek-R1-zero`, 数学推理场景下为什么Reward is Enough。

### 导读问题

我们设置以下问题，来帮助理解，会更多的阐明概念、问题和动机来剖析 Reasoning

- Post-Training的目标是什么？为什么要解决数学问题？推理能力与通用能力之间的关系是什么？
- `DeepSeek-R1-Zero` RL训练学习到的到底是什么？CoT过程一定是正确的吗？能否部署？
- `DeepSeek-R1-Zero` 为什么不愿在RL前SFT？能否在后续增加指令微调？RL时base模型是如何采样的？`R1`冷启动是否是为了解决什么问题
- `DeepSeek-R1-Zero` 对于`DeepSeek-R1` 是否是前置必要的？
- `DeepSeek-R1` 为什么仍要SFT和Preference Learning？通用SFT数据存在的意义是什么？
- `DeepSeek-R1` 在应用部署时是否是多模型？
- 什么是`Long-CoT`? 能否不用RL也能实现Long-CoT?
- ReFT(Reinforcement Learning Finetune) 是否是一种端到端学习？
- 为什么会有“Aha Moment” 行为？为什么不显式教授Reasoning技巧？
- “Aha Moment”是否就一定能强化推理能力？
- PRM和MCTS是否是Reasoning的错误路径？
- MCTS在LLM场景的真实瓶颈在哪里？
- “MATH推理”到“通用任务推理的泛化”的距离有多远？

### 1. `DeepSeek-R1-Zero`启示

#### 1.1 推理任务问题定义和目标

我们通常接触到的语言模型分两类，一种是通用模型(General), 一种是特定任务模型。 前者代表如ChatGPT可以在创意写作、代码协作和翻译等任务中都有出色表现，后者指特定场景任务下能够有出色表现比如代码模型，如果将“推理（reasoning）“定义为一种具体能力，那么”数学“就是体现”推理“能力的一种具体任务，数学问题通常需要有严密的逻辑推导或证明，才能得到正确的答案。

在数学任务里，我们有两种问题形式，主要分为：

- 选择题/填空题：特指我们只要答对答案就可以，特点是答案是客观的，无歧义的，答案形式如`` 或 `0.5` ，意义也是准确的，比如你在一个几何题里你用量尺直接得到答案，只要撞对ground truth，也能够得分，这个打分的判别是`Answer-Check` 
- 解答题：根据题干我们需要有解答过程，推导出正确答案，我们才能拿到分数，那么这里的解答过程Solution，在严格的评判标准里，推导的过程也是要计算分数的。这个打分的判别是`Solution-Answer-Check` 的
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_efba7cc72c66.jpg)

DeepSeek-R1-Zero 所训练的数据形式是：Close-form Answer-Check的这种有客观答案的问题我们定义为`close-form`的问题， 当前主流的LLM数学能力评判其实是`Answer-Check`， 就意味着评判LLM的能力不关心解答过程Solution。而主流的数学推理能力需要思维链(Chain-of-thought)生成solution，只是一种提高answer的准确性的手段。

对于通用任务问题，如果是`open-form`的，比如文本续写，仍要求模型有“推理”能力，能够续写出逻辑一致的文本，所以能力是可以在不同任务体现的. 而不同的任务又有对应特点，普遍认为数学任务就是能够更直接方便去学习到推理的能力，体现在

- `close-form`问题比`open-form`更容易监督，
- `Answer-Check` 较`Solution-Answer-Check`进一步简化标签，更易监督。
 
所以现在Post-Training的目标是使得模型通用能力提高，而通用里面的瓶颈是推理难题，解决数学难题的好处在于：

- 模型的逻辑推理能力提升
- 数学推理能力能够泛化到其他领域
- 学习到的推理形式能够加强模型结构化推理

#### 1.2 分析

#### 1.2.1 `DeepSeek-R1-Zero`目标

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_48b25155da7c.jpg)

我们先简要说明`DeepSeek-V3-Base` 到`DeepSeek-R1-Zero` 的RL训练目标

- 在`Close-form`的数学问题上得到高的`Answer-Check`高分，而Answer与Label的判别是具体客观的，也就是ruled-based 判别
- 那么在训练过程中，我们只需要准备好数学问题集，我们可以让模型在线采样出CoT Solution，最后的答案用`$\boxed{}$ `来包裹；
- RL过程中on-policy采样出来的CoT Solution，是否是step-by-step，是否是每一步都正确，是否是逻辑连贯，是否是乱码，是否是混合语言，是否是格式混乱，是否是Aha Moment，都不重要，只要Final Answer是正确，那么哪怕solution是乱码，每个token都是有益的正反馈（通过adavatage形式）
- 在Answer-Check的问题设置里，`open-form`开放问题是没法在这一套`GRPO`框架训的，因为生成结果不能rule-based判别，也没有reward model。所以`R1-Zero`只是在close-form和answer-Check的特殊问题上进行训练的。
Q: `DeepSeek-R1-Zero` CoT过程一定是正确的吗？能否部署？

A:  CoT过程不一定是正确的，没有严格要求；未经过指令微调和偏好对齐，是不适用在部署通用应用里的，R1-Zero是个特异的模型

#### 1.2.2  RL激发“Aha Moment”是必然的

R1-Zero` 纯Reasoning RL训练过程中会采样出“Aha Moment”(顿悟), 我认为有两点原因：

- `V3-Base`模型强（即`DeepSeek-V3`本身MATH-500就是高分90.1）
- `GRPO` on-policy采样时相较`PPO`，会Rejection Sampling 出多个output（即`GRPO`是一种探索，或者理解为MC rollout），哪怕探索出的答案都是错的，那么RL训练能抑制这一批推导错误的生成。如果有多个正反馈，那么也能某种程度保证模型输出多样性。手撕GRPO：
[](https://zhuanlan.zhihu.com/p/20812786520)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b9899a93a06a.jpg)

所以“Aha Moment”本质是搜索，我们有足量的搜索，一定能顿悟，搜索出错误答案对于RL那就避免这个行为产生，搜索出错误的答案对于训练也是有用的(learning from mistake) 。

在过去我们可以尝试用规则或者模型来控制推理行为：如Self-evaluate、Self-Reflection、Self-Improve等，我们所说RL能激发“Aha-Moment” 指的是我们并没有引入“先验”，就探索到提高准确率对应的推理技巧， 至于是什么推理技巧，我们去讨论并没有实质的意义。

我们再引入新的问题，后续解答：<strong>一定要RL才能激发“Aha-Moment”吗？</strong>

在“Aha Moment”里我们不能直接量化过程推理能力， 而是通过观测CoT采样 Solution的token 序列长度(test-time computation increases, 产生越长的token需要的计算量越多)来对等判别的

`DeepSeek-R1-Zero` naturally acquires the ability to solve increasingly complex reasoning tasks by leveraging extended test-time computation.这里实际不make sense，如果产生了重复思考，那么越长的token长度不等于推理能力就提升了。

Aha Moment有什么弊端？ 

- 过度思考
- 重复思考

#### 1.2.3 SFT数据质量影响

我们可以进一步对比`DeepSeek-V3-Base`系列模型，来做进一步分析RL前的SFT是否必要。

- `DeepSeek-R1-Zero` 纯Reasoning RL在AIME取得显著提升(39.2->71.0)，我们可以审视`DeepSeek-V3` 的SFT训练的影响。
- `DeepSeek-R1` 也有SFT但是产生了更高的分数，我们能知道所用的数据包含600k的long-CoT推理数据。
SFTRLMATH-500(pass@1)AIME 2024(pass@1)DeepSeek-V3✅✅90.239.2DeepSeek-R1-Zero✅95.971.0DeepSeek-R1✅✅96.379.8*[注]美国数学邀请赛（*AIME*，American Invitational Mathematics Examination）*

所以做个不严格的结论：SFT是没问题的，也不存在SFT无用论，数据质量影响可能远大于方法本身。

<strong>那么训练的数据瓶颈就变为了收集或者合成复杂问题的“Long-CoT” solution，过程中有错误也能接受，毕竟无法让人类手写出600k条高质量的solution</strong>

而`DeepSeek-R1-Zero` 的尝试或者存在的目的，是为了合成高质量的Long-CoT

#### 1.2.4 R1-Zero纯Reasoning RL为什么不用SFT

在过去一直被诟病SFT或者其他对齐方法，会对整体性能产生“遗忘”或“性能退化”，我们总结下SFT的弊端：

- 满血的base更强
- 现有的数据Long-CoT少
 
- 哪怕是从o1采样的数据去蒸馏，也只是强行适配o1的模型的分布。
 
- 现有的solution仍不够复杂，比如是人类写出的solution，大多是抛弃掉了“草稿纸演算”后的简洁解答，或者是没有显式的写出思考的“心路历程”，我们在复杂数学问题上，写在试卷里的解答过程，实际上是跳过了思维的精华。
 
- 人类教授的推理技巧，可能是在帮助模型先走捷径再探索，而不是纯RL先探索再走捷径。
另外缺少人类的先验，那么产生的解答“可读性差”并不奇怪，R1-Zero的目标是最大化准确率，并不是给人用的，也不是用于产品部署的。我们仍需要有通用能力的模型。

那么我们可以留下问题：

- `R1-Zero`没有SFT训练，RL初期`GRPO`采样时有Few-shot/CoT prompt？会不会难以采样到正确答案使得训练缓慢或不稳定？
- 能否在`R1-Zero`之后进行指令微调？
- 能否将通用问题和推理问题一起从base模型做RL？
- 为什么`R1`还要重起炉灶，从base训仍要SFT？

#### 1.2.5 R1需要什么样的SFT数据

我们先说为什么要Cold-Start SFT？

- 加快RL训练
- 引入人类先验
- 控制reasoning 回答格式
R1`的训练是四个阶段，实际上可以分成两部份，两个部分都要SFT+RL，按照这两个主要阶段说明数据源

A. 特定推理能力的SFT和RL，相较`R1-Zero`，实际上是为了引人人类先验，帮助模型在特定特例场景下控制输出格式提升可读性，SFT有prompt engineering产生的CoT数据、从`R1-Zero`采样并且人工处理、Markdown格式控制数据、摘要数据收集，RL增加一致性奖励等。

B. 当模型能够输出可读性好的reasoning数据（合成数据），才开始进入到最终的`R1`训练，最终的问题我们要思索的是为什么R1引入了通用数据训练，会比`R1-Zero`推理性能更好？直觉的猜测为：

- 通用的数据部分可能也有较强的推理属性，如代码、谜题、摘要和脑经急转弯等，丰富了推理的模式
- 格式化组织数据，使得数据表征更高效。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_002d0374bf9f.jpg)

#### 1.2.6 R1 工程部署优势

- 提示词工程决定“deepthink”模式
> we call DeepSeek-V3 to generate a potential chain-of-thought before answering the question by prompting. However, for simpler queries, such as “hello” we do not provide a CoT in response.

2. 不用额外的模型， 即可做summarization

<strong>we design a readable pattern</strong> that includes a summary at the end of each response and filters out responses that are not reader-friendly3. 虽然对prompt提示词敏感，但解决问题可以纯zero-shot

<strong>we recommend users directly describe the problem and specify the output format using a zero-shot</strong> setting for optimal results.
#### 1.3 小结

- 从`GRPO`的on-policy采样角度看“Aha-Moment”是合理的，顿悟是探索的结果。
- SFT是否必要？如果是通用能力我们仍需要SFT。如果是特定任务，SFT要不要做取决于数据质量。
- AIME的结果表明了R1-Zero的纯RL-Reasoning的超强能力，尽管上线的是`R1`，而`R1-Zero`的影响也是非常重大的

### 2. End-to-End Reasoning Learning

在`R1-Zero`的训练过程里，并没有过程监督，是通过结果来监督的，实际上是一种端到端的学习。更具体的我们可以称为：端到端的推理能力学习。我们所知道的自动驾驶里：

- 端到端：输入获取传感器信息，输出控制信息
- 非端到端：传感器获取视频，视频信息里track 车道线、汽车、红绿灯等，然后做出规划和决策等，每步都进行拆解，相较端到端，learning过程里的标签的获取成本高。
至于Learning的具体算法，用的PPO、`GRPO`甚至SFT其实都没关系，只要solution是在线采样的。

#### 2.1 Reward is enough

在`R1-Zero`的实践表明，仅靠规则reward是足够的，reward足够与具体的问题类别有关如：

- close-form数学问题：有标准的答案
- 代码：运行代码，执行器反馈对错，或者Leetcode提交代码后的平台反馈。
我们看下更早的是`AlphaGo-Zero`， 围棋的奖励是终局的规则判别，经过大量的self-play仅靠胜负反馈就能学习到超越人类的“围棋推理能力”。

而LLM里的数学是这种形式的问题场景，理论上能够套用MCTS到大Alpha-Zero时刻

#### 2.2 更早的端到端推理学习： STaR

STaR: Bootstrapping Reasoning With Reasoning在22年的STaR的文章里，已经有端到端推理思想了，只不过所用的训练方法是SFT

我们在以下选择题形式的问题里，我们可以在线采样出Rationale和Answer，这里的Rationale我们当成是CoT/Long-CoT来看待，那么如果采样出的Answer和Label匹配，那么这条采样数据我们保留，如果不匹配，那么剔除。所保留带CoT的数据，进行SFT训练。

通过这种端到端思想，就可以提高推理能力，弊端无一例外在于Rationale或CoT里推断的准确性是无法保证的。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4171d2f4781e.jpg)

#### 2.3 OpenAI强化学习微调ReFT

>  OpenAI's Reinforcement Fine-Tuning Research Program

在OpenAI 12day里提出了ReFT项目，实质上就是期望收集垂直领域专家级别问题和答案。

> Reinforcement Fine-Tuning excels at tasks where the outcome has an objectively  “correct”** answer that most experts would agree with.

样例来自OpenAI 12days: Day2 的视频demo ，我们按照`R1-Zero` RL训练需求数据，实际上要的专家级问题可以不用solution但是需要final answer ，仅需final answer “Answer”就可以进行监督，如下例的Correct Answer ： FOXE3

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a36bebc7481c.jpg)

不需要solution，仅需要收集问题和final answer
### 3. MCTS Search的挑战

与End-to-End（Outcome Supervision）相对应的是过程监督（Process Supervision），在Deepseek尝试里，PRM和MCTS并不理想。

#### 3.1 过程监督是否无效？

结论：无效

实际上LLM的过程定义是不具体的：

- 步骤不具体：按照换行符换分，按照段落划分，按照字符数量划分，按照逻辑部落划分，这里有很大的区别，另外不同的任务的定义有所区分，比如代码是否可以是function-level还是line-level
- 准确性判别：如果一个leetcode问题，生成导出使用暴力搜索的方法步骤， 或者我们输出一段代码能够运行，但是内存泄漏，我们能100%一致性标注出准确还是错误吗？
上述数据标签噪声大，那么所训PRM性能也受限。

另外自动化的标注可见方案，标注是建立在一定假设上的统计，而非是确定的正确性判别标签。

title简介Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human AnnotationsMath-Shepherd: 有较高的标注成本，且标注值为概率，而非准确性。Improve Mathematical Reasoning in Language Models by Automated Process SupervisionOmega-PRM 提出更宽松的假设，进行二分标注相对应的Search方法，实际上PRM的在难度等级5的数学题下，准确率低下。对于难题的解决的矛头仍指向：<strong>如何将推理能力训练到模型本身</strong>

Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameter[](https://zhuanlan.zhihu.com/p/877197813)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8155e3b7897f.jpg)

PRM-Search类的方法对于数学等级5的难题，聊胜于无PRM无法准确描述环境，那么在难题上的Search就是可有可无, R1的评价是“Limited”

>  its advantages are limited** compared to the additional computational overhead it introduces during large-scale reinforcement learning process in our experiments

#### 3.2 MCTS是否无效？

结论：无效

AlphaGo`和`AlphaGo-Zero`里的区别：AlphaGo的MCTS价值估计是rollout再回溯估计动作价值， 而`AlphaGo-Zero`是做价值估计。

围棋的难度相较LLM Next-Token generation式的MDP简单的多。另外价值网络也会直接影响生成的选择，LLM Next Token预测较围棋网络下子 inference成本大的多，工程受限下的MCTS试错成本高。

While AlphaGo’s core success relied on training a value model to progressively enhance its performance, this principle proves difficult to replicate in our setup due to the complexities of token generation.我们前面提到的`GRPO`也具有用了搜索的思想，在线采样实际上是MC Rollout，但是不做常规的动作或状态价值估计，从真实奖励进行估计优势，需要花费inference的成本。

### 4. 总结

- R1-Zero将推理难题转为close-form下的端到端学习问题，纯RL就能激发模型的顿悟，并且在AIME显著提升
- OpenAI的ReFT思路与R1应该大差不大，将math推理能力高效泛化到其他领域是下一个研究热点。
- o1类推理的方案又前进了一步，而DeepSeek的MCTS和PRM上的尝试，是非常有价值的经验分享，少走弯路

### 扩展阅读

[](https://zhuanlan.zhihu.com/p/20812786520)

可以通过以下仓库，进行R1-Zero复现能够出现Aha Moment

[](https://zhuanlan.zhihu.com/p/23301339895)

[](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)

*《手撕RLHF》*** 解析如何系统的来做LLM对齐工程

[](https://zhuanlan.zhihu.com/p/19623772462)

[小冬瓜AIGC：【OpenAI o3安全对齐方案】坏消息：RLHF里的HF无了!!](https://zhuanlan.zhihu.com/p/14792481053)

[小冬瓜AIGC：【o1推理】Scaling LLM Test-Time：谁说类o1推理一定要用RL?!](https://zhuanlan.zhihu.com/p/877197813)

[小冬瓜AIGC：为什么DPO里Chosen和Rejected概率会同时下降???](https://zhuanlan.zhihu.com/p/6327313416)

[小冬瓜AIGC：【手撕RLHF-DPO】step-by-step公式推导及实验分析](https://zhuanlan.zhihu.com/p/692991235)

[小冬瓜AIGC：【手撕RLHF-Aligner】7B模型外挂，暴涨GPT4安全性26.9%](https://zhuanlan.zhihu.com/p/682627363)

[小冬瓜AIGC：【手撕RLHF_Weak-to-Strong】OpenAI超级对齐新思路（含代码解析）](https://zhuanlan.zhihu.com/p/674714374)

[小冬瓜AIGC：【手撕RLHF-Safe RLHF】带着脚镣跳舞的PPO](https://zhuanlan.zhihu.com/p/670288679)

[小冬瓜AIGC：【手撕RLHF-Rejection Sampling】如何优雅的从SFT过渡到PPO](https://zhuanlan.zhihu.com/p/669397860)

[小冬瓜AIGC：【手撕RLHF-LLaMA2】 Reward Model PyTorch实现](https://zhuanlan.zhihu.com/p/679012951)

*<strong>《手撕LLM》</strong>*系列文章+原创课程：LLM原理涵盖Pretrained/PEFT/RLHF/高性能计算
[小冬瓜AIGC：【手撕NSA】DeepSeek新作-原生稀疏注意力-超长文(附代码)](https://zhuanlan.zhihu.com/p/24841366485)

[小冬瓜AIGC：【手撕DualPipe】让我们一步步把 MoE EP 通信 "消除"（附代码）](https://zhuanlan.zhihu.com/p/1910995677451912435)

[小冬瓜AIGC：【手撕LLM_Nv-Embed】英伟达LLM-as-Embedding, ICLR高分佳作, RAG检索有救了!!!](https://zhuanlan.zhihu.com/p/16854104123)

[小冬瓜AIGC：【手撕LLM-Cut Cross Entropy】ICLR高分：LLM训练交叉熵的Memory-Efficient优化](https://zhuanlan.zhihu.com/p/13548439339)

[小冬瓜AIGC：【手撕online softmax】Flash Attention前传，一撕一个不吱声](https://zhuanlan.zhihu.com/p/5078640012)

[小冬瓜AIGC：【手撕LLM-FlashAttention2】只因For循环优化的太美](https://zhuanlan.zhihu.com/p/670085985)

[小冬瓜AIGC：【手撕LLM-Flash Attention】从softmax说起，保姆级超长文！！](https://zhuanlan.zhihu.com/p/663932651)

[小冬瓜AIGC：【手撕LLM】长文本的Position Encoding的衰减性证明](https://zhuanlan.zhihu.com/p/709234529)

[小冬瓜AIGC：【手撕LLM-NTK RoPE】长文本“高频外推、低频内插“从衰减性视角理解](https://zhuanlan.zhihu.com/p/702964625/edit)

[小冬瓜AIGC：【手撕LLM - Mixtral-8x7B】Pytorch 实现](https://zhuanlan.zhihu.com/p/680361287)

[小冬瓜AIGC：【手撕LLM-Medusa】并行解码范式: 美杜莎驾到, 通通闪开！！](https://zhuanlan.zhihu.com/p/686000524)

[小冬瓜AIGC：【手撕LLM-Speculative Decoding】大模型迈向"并行"解码时代](https://zhuanlan.zhihu.com/p/671432448)

[小冬瓜AIGC:  【手撕LLM-Generation】Top-K+重复性惩罚](https://zhuanlan.zhihu.com/p/667025336)

[小冬瓜AIGC：【手撕LLM-KVCache】显存刺客的前世今生--文末含代码](https://zhuanlan.zhihu.com/p/667763542)

> 我是小冬瓜AIGC，原创超长文知识分享，原创课程已帮助多名同学速成上岸LLM赛道。      
研究方向：LLM、RL、RLHF
