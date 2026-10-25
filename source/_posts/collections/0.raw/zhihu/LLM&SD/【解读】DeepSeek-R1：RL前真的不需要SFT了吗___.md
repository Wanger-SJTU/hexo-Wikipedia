---
title: 【解读】DeepSeek-R1：RL前真的不需要SFT了吗???
date: "2025-10-26 00:00:00"
updated: "2025-10-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【解读】DeepSeek-R1-RL前真的不需要SFT了吗___/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/19623772462
---


**我是小冬瓜AIGC，原创超长文知识分享，原创课程已帮助多名同学速成上岸LLM赛道。 
研究方向：LLM、RL、RLHF先回答：

`DeepSeek-R1-Zero` 不需要`SFT`

`DeepSeek-R1` 需要`SFT` 

### TL;DR

>  DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning

发布模型：

- DeepSeek-R1-Zero：疯狂的CoT推理机器，无SFT纯RL训练，不管输出格式，解答不做summarization，阅读性差无格式
- DeepSeek-R1：带冷启动(Cold Start) SFT，然后做RL训练，控制输出格式，有summarization，是部署的版本。
- DeepSeek-R1-Distill：基于Qwen和Llama作为Base从R1数据蒸馏成小模型
整体流程为

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_f831ec5d7b4d.jpg)

### 导读问题

- `DeepSeek-R1-Zero` 里的Zero含义？
- 不做SFT和RM训练，纯RL训练的效果？
- 模型的Aha Moment 行为有什么意义
- `DeepSeek-R1-Zero` 存在什么问题？优劣势？
- `DeepSeek-R1` 训练流程？
- 什么是冷启动，R1训练的两个RL区别在哪？
- 蒸馏R1比从零RL训练是否更好？
- 在R1上PRM和MCTS是否有用？

### 1. `DeepSeek-R1-Zero` 纯RL训练

#### 1.1 简介

>  However, these works heavily depended on supervised data, which are time-intensive to gather. In this section, we explore the potential of LLMs to develop reasoning capabilities without any supervised data**, focusing on their self-evolution through a pure **reinforcement learning** process.

Zero来自Alpha Zero，**特指无需人类数据**，即可从零实现模型自我迭代。

Deepseek-V3-base模型不做SFT就可以RL训练，“问题是RL的数据和reward如何获得？”

#### 1.2 RL算法

[](https://zhuanlan.zhihu.com/p/20812786520)

(1) GRPO：对于一个prompt在线采样N条回答成组，根据(3)式得到优势，按照下式来优化。不需要value model，按照一组的相对分数作为优势。奖励都是Sentence-level的，但可以以同个advantage赋值到每个token上。

(2) KL散度：采用方差较小无偏的KL变种，KL项是Token-Level的, 推导见

(3) 对于有多个奖励，做归一化，体现相对性。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_9e6d9df827fd.jpg)

好处：1.不需要Value Model，2. 优势估计是无偏的

#### 1.3 数据

以下为提示词模版，可以见到有特定的标签如`` 和``

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_39a781a2ada0.jpg)

在RL训练时，可以仅收集数学题和正确答案(作为Label)，不需要解答（RL训练过程可以在线采样）

存在问题：base模型如何在RL初始阶段就能采样符合指令的推理CoT？论文并没有提及，这里会造成前期的训练稳定性差，毕竟没有提前做一次SFT。

#### 1.4 奖励

对于数学题这种有确定答案的场景，那么通过匹配答案正确性就可以得到奖励，比如

** question: find the minimal value of x^2 - 4x + 1 = 0
 ....
 Answer: \boxed{-3}(` $\boxed{-3}`)
 ground truth： -3， 那么可以通过规则匹配上就可以得到奖励1，匹配不上为奖励-1， 特别的要处理 和0.5 这种同值不同形式的匹配

不需要训练奖励模型，因为容易reward hacking**

** We do not apply the outcome or process neural reward model in developing DeepSeek-R1-Zero, because we find that the neural reward model may suffer from reward hacking** in the large-scale reinforcement learning process另外：要求模型在线采样的数据必须有`` 和``标签, 也作为格式奖励。

#### 1.5 R1 效果分析

性能比肩DeepSeek-R1-Zero

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_73dfc936971a.jpg)

在RL训练过程的在线采样中，可见输出长度逐渐增加，越来越多的CoT解答，另外自发的产生自省、revisits和revaluate行为

** Behaviors such as reflection—where the model revisits and reevaluates its previous steps—and the exploration of alternative approaches to problem-solving arise spontaneously![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_19063320d6a5.jpg)

意味着不需要人为的数据教授模型CoT** ，模型通过规则奖励和人工数据，就能产生思维类风格的输出。

#### 1.6 Aha Moment

将RL过程中的Checkpoint 进行采样生成，发现一些有趣的“自言自语”式的文本，而这些思考的文本，是模型自己的采样输出。

** It underscores the power and beauty of reinforcement learning: rather than explicitly teaching the model on how to solve a problem, we simply provide it with the right incentives, and it autonomously develops advanced problem-solving strategies![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_950ba598bc72.jpg)

#### 1.7 `DeepSeek-R1-Zero`弊端

由于没有人工的指令微调，模型的输出并不会遵循输出格式， 另外复杂的CoT过程，实际上存在“语种混乱“和”可读性差“

>  For instance, DeepSeek-R1-Zero struggles with challenges like poor readability, and language mixing
 在实际产品应用部署中并不合适用R1-Zero

那么为什么会出现CoT语种混乱？由于V3和R1预训练数据源主要是中英，有概率生成到其他语种。

### 2.  `DeepSeek-R1` 训练

DeepSeek-R1-Zero在早期从Base训练存在不稳定问题，那么仍然需要冷启动**做SFT，那么问题在于

** Can reasoning performance be further improved or convergence accelerated by incorporating a small amount of high-quality data as a cold start?
How can we train a user-friendly model that not only produces clear and coherent Chains of Thought (CoT) but also demonstrates strong general capabilities? 

- 并入少量的人工SFT数据是否会加速推理性能的收敛？
- 如何能够产生简洁的CoT和保持通用能力？
我们根据原文实现重绘流程图帮助理解

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_af74368970f3.jpg)

#### 2.1 Cold Start

什么是冷启动？为什么要冷启动？

- 指的是RL前先对模型进行有监督对齐
- 冷启动数据有人类先验，但是原文解释比较直觉
>  By carefully designing the pattern for cold-start data with human priors, we observe better performance against DeepSeek-R1-Zero. We believe the iterative training is a better way for reasoning models.

冷启动数据收集, 从DeepSeek-R1-Zero few-shot prompt 采样再人工后处理修改千条数据。

>  few-shot prompting with a long CoT as an example, directly prompting models to generate detailed answers with reflection and verification, gathering DeepSeek-R1-Zero** outputs in a readable format, and refining the results through **post-processing by human annotators.**

为了解决Deepseek-R1-Zero问题，那么收集cold-start保证回答模式“可阅读性”和“总结”性非常有必要

- 增加`` 特殊token
- 增加` ` 提高阅读性，所以**R1并不需要额外的摘要模型**
** we design a readable pattern that includes a summary at the end of each response and filters out responses that are not reader-friendly. Here, we define the output format as |special_token||special_token| ``, where the reasoning process is the CoT for the query, and the summary is used to summarize the reasoning results.
 
#### 2.2  Reasoning-oriented Reinforcement Learning**

在Cold-start SFT后，进入到类似`Deepseek-R1-Zero` 类的RL训练，不同的是增加“语言一致性奖励”, 减轻输出混合。

**To mitigate the issue of language mixing, we introduce a language consistency reward** during RL training, which is calculated as the proportion of target language words in the CoT
#### 2.3 Rejection Sampling and Supervised Fine-Tuning

是否仍需要CoT, 为了提高通用能力，仍需要收集数据做SFT

** which primarily focuses on reasoning, this stage incorporates data from other domains to enhance the model’s capabilities in writing, role-playing, and other general-purpose tasks.重点在于数据收集

Reasoning Data：**

- 可以根据rule-based来采集数据
- 增加额外的数据
- 过滤long-cot里的混合语种、难于阅读和代码块的数据
总共收集600K

**Non-Reasoning data**

收集常规的指令数据200K，另外由于存在回答模式切换场景，可以用提示词工程来判别是否进入到reasoning模式：

** we call DeepSeek-V3 to generate a potential chain-of-thought before answering the question by prompting. However, for simpler queries, such as “hello” we do not provide a CoT in response.混合数据有800K对Base 模型做SFT, 注意，阶段1和2的训练过程，只是为了给真正的R1模型训练收集数据，真正微调的仍是DeepSeek-V3-Base**，而非训练阶段1和2的中间模型

** We fine-tune DeepSeek-V3-Base** for two epochs using the above curated dataset of about 800k samples.
#### **2.4. Reinforcement Learning for all Scenarios**

最后真正的通用RL训练, 混合了rule-based reward和preference reward。在GRPO算法里可以采样group回复

但是没有透露这两种reward如何混合？

** For reasoning data, we adhere to the methodology outlined in DeepSeek-R1-Zero, which utilizes rule-based rewards to guide the learning process in math, code, and logical reasoning domains. For general data, we resort to reward models to capture human preferences in complex and nuanced scenarios.**所以Preference Leanring 仍是需要的。

### 3. 蒸馏

先说方法，基于dense模型从R1蒸馏，8B左右效果就已经很好，纯sft蒸馏。

** For distilled models, we apply only SFT and do not include an RL stage, even though incorporating RL could substantially boost model performance.![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_cfe2e4569501.jpg)

问题：从零R1训练小模型 VS 蒸馏R1到小模型，哪个推理能力更强

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_2b578d8cc525.jpg)

记住结论：

- 使用R1蒸馏比纯RL效果好
- 蒸馏虽好可不要贪杯，base模型要求仍要好（看1.5B和7B的对比）
另外：

蒸馏的层级是text的话，那么就不需要考虑词表适配的问题。

### 4. 不成功的尝试

结论：PRM和MCTS都没达到预期效果

#### 4.1 PRM

- 在reasoning任务中如何显式定义step，比如以`\n` 还是以推理逻辑来划分step
- 如何定义step正确性，将影响step labeler来高效标注
- PRM容易reward hacking
另外PRM在搜索作用怎么样？

>  In conclusion, while PRM demonstrates a good ability to rerank the top-N responses generated by the model or assist in guided search, its advantages are limited** compared to the additional computational overhead it introduces during large-scale reinforcement learning process in our experiments

#### 4.2 MCTS

- LLM比象棋搜索空间大太多
- MCTS价值影响模型生成质量（不如纯CoT采样）
** First,unlike chess, where the search space is relatively well-defined, token generation presents an exponentially** larger search space. To address this, we set a maximum extension limit for each node, but this can lead to the model getting stuck in local optima.** Second, the value model directly influences the quality of generation** since it guides each step of the search process.** MCTS仍有非常大的挑战，并不能否定这一条路

>  In conclusion, while MCTS can improve performance during inference when paired with a pre-trained value model, iteratively boosting model performance through self-search remains a significant challenge.**

### 总结

- R1-Zero是纯RL训练，不需要SFT，不需要reward model和value model，RL硬训，缺点在于生成数据可读性差。** 
- R1主要分为4个阶段，前两个阶段cold start和reasoning-oriented RL训练是为了给第3阶段产生SFT数据，在第四阶段混合rule-reward和peference reward做RL训练，解决R1-Zero问题，具有格式化、语言统一、推理模式判别、cot摘要功能。相较R1-Zero最大的特点是R1增加了对齐**** 
- R1方案里没有step、prm、MCTS、树推理，一路做SFT和RL训练就够了；并不用精心设计提示词来加入推理技巧如：self-reflection、revisit和self-evaluate等，模型CoT能探索到"Aha-moment"
 
- 另外R1缺少大量合成数据细节，将会增加复现难度；总的来说，越简单的处理流程越能scaling；
 
继续畅读

[](https://zhuanlan.zhihu.com/p/20053834500)

[](https://zhuanlan.zhihu.com/p/20812786520)

我们可以通过以下仓库，进行R1-Zero复现能够出现Aha Moment

[](https://zhuanlan.zhihu.com/p/23301339895)

[](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)

*《手撕RLHF》*** 解析如何系统的来做LLM对齐工程

[小冬瓜AIGC：【手撕LLM-GRPO】你只管给Reward, 剩下的交给RL（附代码）](https://zhuanlan.zhihu.com/p/20812786520)

[小冬瓜AIGC：再深挖DeepSeek-R1: Reward is Enough](https://zhuanlan.zhihu.com/p/20053834500)

[小冬瓜AIGC：【OpenAI o3安全对齐方案】坏消息：RLHF里的HF无了!!](https://zhuanlan.zhihu.com/p/14792481053)

[小冬瓜AIGC：【o1推理】Scaling LLM Test-Time：谁说类o1推理一定要用RL?!](https://zhuanlan.zhihu.com/p/877197813)

[小冬瓜AIGC：为什么DPO里Chosen和Rejected概率会同时下降???](https://zhuanlan.zhihu.com/p/6327313416)

[小冬瓜AIGC：【手撕RLHF-DPO】step-by-step公式推导及实验分析](https://zhuanlan.zhihu.com/p/692991235)

[小冬瓜AIGC：【手撕RLHF-Aligner】7B模型外挂，暴涨GPT4安全性26.9%](https://zhuanlan.zhihu.com/p/682627363)

[小冬瓜AIGC：【手撕RLHF_Weak-to-Strong】OpenAI超级对齐新思路（含代码解析）](https://zhuanlan.zhihu.com/p/674714374)

[小冬瓜AIGC：【手撕RLHF-Safe RLHF】带着脚镣跳舞的PPO](https://zhuanlan.zhihu.com/p/670288679)

[小冬瓜AIGC：【手撕RLHF-Rejection Sampling】如何优雅的从SFT过渡到PPO](https://zhuanlan.zhihu.com/p/669397860)

[小冬瓜AIGC：【手撕RLHF-LLaMA2】 Reward Model PyTorch实现](https://zhuanlan.zhihu.com/p/679012951)

***《手撕LLM》***系列文章+原创课程：LLM原理涵盖Pretrained/PEFT/RLHF/高性能计算
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
