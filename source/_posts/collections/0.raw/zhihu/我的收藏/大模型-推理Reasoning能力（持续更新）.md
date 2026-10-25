---
title: 大模型-推理Reasoning能力（持续更新）
date: "2025-03-19 00:00:00"
updated: "2025-03-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/大模型-推理Reasoning能力(持续更新)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/6928807952
---


#### 1. DeepSeek-R1

- 参考资料：

- deepSeek-R1 技术报告：[https://zhuanlan.zhihu.com/p/19744278380](https://zhuanlan.zhihu.com/p/19744278380)
- R1 技术报告，github：[https://github.com/deepseek-ai/DeepSeek-R1?tab=readme-ov-file](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepSeek-R1%3Ftab%3Dreadme-ov-file)

- 为什么反响很大？

- R1 展现出解决复杂问题的推理能力。
- 通往 AGI 的 5 个阶段：聊天 -> 推理 -> Agent（工具）-> 创新 -> 组织。

#### 1.1. 基础知识

- R1-Zero 是基于预训练模型（deepseek-v3） 基础上，使用 GRPO 强化学习训练得到的。

- 亮点： 验证“纯强化学习”的可行性。
- 缺点：没有经过 SFT 训练，导致可读性差、多语言混杂。

- 从宏观角度理解 R1：

- 数学、代码领域：使用规则驱动方式实现大规模强化学习
- 推理能力的泛化：深度推理 SFT 数据（60W）和通用 SFT 数据（20W），以及做强化学习训练实现了推理能力的跨任务泛化。

#### 1.2. deepSeekV3 架构

- 为什么 V3 架构的推理成本很低？

- 模型选择：Moe，专家适合并行训练、推理阶段仅激活部分参数。

- 备注：在 V3 之前，Moe 已经有广泛使用。V3 做了进一步的效果优化（专家负载均衡、网络通信负载均衡）。

- 推理优化：Prefill（适合并行计算，首包延时）、decode（调用 KV 显存密集型）分成两个阶段，做分离部署。
- 训练优化：fp16 -> fp8

#### 1.3. deepSeek-R1 训练（4 阶段）

- 1. cold-start：使用数千条（人工标注等多种方法收集）高质量数据做冷启动，进一步提升性能。
- 2. Reasoning-RL：基于 Rule-Reward 的方式，增强代码、数学领域的推理能力。
- 3. RejectSampling、SFT：增强通用能力，如：写作、角色扮演

- reasoning-data：60W 数据。基于第二阶段模型，做数据推理生成。使用 deepseek-v3 作为 reward 模型（因为 rule-reward 模型没办法识别通用数据的“好坏”），通过拒绝采样，得到高质量数据。
- non-reasoning-data：20W 数据。写作、简单 QA，天然没有推理阶段。则使用 deepseek-v3 生成前置的 COT，填充到 Prompt。（个人理解：强制添加了思考过程？）

- 4.RLHF：全域强化学习。数学能力：rule-based 奖励。通用能力：奖励模型。基于奖励模型、多样型的数据分布，保证模型的有效型、无害性。
- 参数量： R1-Zero、R1 是稀疏模型，参数量是 671B（Moe 架构）； 激活运算 37B（相当于 72B 模型的一半）

#### 1.4. GRPO

参考材料：

- 代码实现：[https://github.com/huggingface/trl/blob/main/trl/trainer/grpo_trainer.py#L604](https://link.zhihu.com/?target=https%3A//github.com/huggingface/trl/blob/main/trl/trainer/grpo_trainer.py%23L604)
- 整体介绍：[https://www.zhihu.com/question/10766825126](https://www.zhihu.com/question/10766825126)
- huggignFace 介绍：[https://huggingface.co/docs/trl/main/en/grpo_trainer#grpo-trainer](https://link.zhihu.com/?target=https%3A//huggingface.co/docs/trl/main/en/grpo_trainer%23grpo-trainer)
基础知识：

- 优势函数：给定 Prompt，选择某个动作 Action 相比于预期平均回报的优势。

- Reward 模型：[bs,seq,1] 一般只使用最后 Token 的值，再加上 KL 散度的值。
- Critic 模型：[bs,seq,1] 是当前 Token 到终止 Token 的奖励。

- Actor 模型：基于重要性采样*优势函数，最大化奖励值来指导模型训练。
- GRPO 优化目标：

- 重要性采样（新旧策略的 tokens_prob 的比值） * 优势函数 + KL 散度
- 优势函数 ：对同一个 Prompt 推理 K 次，通过 rule 计算奖励。接着对每条数据的奖励做 Normlization，就得到每条的数据归一化奖励。

相比于 PPO，GRPO 的优势函数的特点

- 不再使用 Critic 模型作为 BaseLine，使用相同的 Prompt 多次推理，计算均值、方差，做标准化。
- 奖励：使用规则判定，而不是模型。
- 缺点：数学类型使用“rule-rewards”是没问题的，但是换成通识问答领域呢？（仍是需要 reward 模型）

#### 1.5. 未来方向

R1 输出的 Cot 内容非常长、而且有冗余内容。直观来看，这部分文本可以尝试“稀疏”Attention，节省运算算力。

#### 2. 逐渐过期 --- 低频关注

#### 2.1. Test-Time Scaling

Test-Time Scaling vs Model-Parameters Scaling

- 参考源：

- [https://zhuanlan.zhihu.com/p/8147928532](https://zhuanlan.zhihu.com/p/8147928532)
- [https://zhuanlan.zhihu.com/p/14949386849](https://zhuanlan.zhihu.com/p/14949386849)

- 平衡预训练、推理的计算量：简单问题、中等难度问题，可以通过增加推理时间来提升准确率。困难问题是需要增加预训练的计算量来解决。
- 如何选择正确的答案：

- Majority：投票，选择众数。
- Verification-Model：OPM、PRM 两种打分机制，效果均优于 Majority 投票方案。

- 搜索方式：Best-of-N、Beam-Search、Lookahead-Search。在简单问题，用Best-of-N。中等难度问题，优选Beam-Search。

#### 2.2. openAI o1

一句话概括：设计 Prompt 范式（“反思”、“回溯纠正”等思考因子）来推动模型主动反思。

参考材料：

- 知乎：[https://zhuanlan.zhihu.com/p/721952915](https://zhuanlan.zhihu.com/p/721952915)
- 理解围棋 MCTS 搜索： [https://blog.csdn.net/fearlesslpp/article/details/134342648](https://link.zhihu.com/?target=https%3A//blog.csdn.net/fearlesslpp/article/details/134342648)
推理阶段

- step1 将 Cot 片段作为 MCTS 搜索的输入 ，选择“最优”的思考因子。（否定猜测、自我修正等等）
- step2 将之前的 Cot 片段 和 新的思考因子，通过 LLM 模型继续生成 Cot Tokens。
- step3 针对 step2 也可以使用 Best-of-N 采样多组结果。然后用 Reward 模型选择最优片段。
- step4 循环到 step1
- step5 将以上结果做摘要总结，展示给用户。（摘要总结模型）
训练阶段

- pre-trianing：代码、推理的文本数据。
- SFT：大量的带有CoT的数据（代码合成、数学合成）进行SFT，使Base Model获得基本的CoT能力。
- PPO：指令遵循、内容安全性。
- MCTree 的训练：P策略网络 的学习目标是对应状态 MCST 搜索到的“思考因子”概率分布pai（Action 的行为空间），价值网络 的学习目标是 Output Reward（正确答案）。

- 训练数据格式：S（Cot 片段）、Pai（一轮模拟游戏，累计思考因子被选择次数。用于训练 P 网络）、Reward（答案正确与否，用于训练 v 网络）。
- 根据 output reward做回溯，把 P 网络（思考因子的概率分布）、V 网络（最终胜出的概率）做训练和更新。
- 训练损失函数：P 网络使用 KL 散度/交叉熵损失、V 网络使用 MSE 损失。

system-2（慢思考的实现方式）

P 网络、Q 网络是如何更新的？

#### 2.3. rStar - 增强小模型推理能力

- 一句话概括：Generator推理得到多条路径，通过 mask 一部分内容，让 Discriminator 重新推理每一条数据，如果两者结果一致，则更倾向于得到正确的内容。
- 优点：Generator、Discriminator 都是小模型，无需训练。
- 参考来源：

- 使用MCTS增强推理能力：[https://zhuanlan.zhihu.com/p/864190605](https://zhuanlan.zhihu.com/p/864190605)
- 代码实现：[https://github.com/zhentingqi/rStar](https://link.zhihu.com/?target=https%3A//github.com/zhentingqi/rStar)

如何构造 Generator 的推理路径

一句话概括：通过设计 5 个思考因子，不断 Rollout，最终构造出搜索树。

- 树节点的定义：

- 思考因子： A1（一步一步推理得到结果）、A2（直接生成结果）、A3（划分子问题并生成答案）、A4（判断 A3 结果是否正确）、A5（重新复述原始问题）。
- ChildrenNode（子节点）：根结点可以选择的子节点是 A1、A2、A3、A5。A1 可以选择 A1、A2。A2 可以选择。。。。，通过人工设定规则，限制可选择的子节点。
- LeafNode（终止节点）：A2、A3
- SolutionsNode：A1、A2、A3

- 搜索树定义：

- Rollout：

- select：探索新路径。每次都寻找第一个未被探索过的节点。
- expand：
- simulate：遇到 Leaf-Node 则会终止。

- Reward ：

- 个人理解：leaf-Node 并行推理多次，按照“最多出现”的答案的占比，作为 Reward 分数。

- BackPropagation：

- 回溯。按照 UCT 计算公式，更新每一个节点的值。

- 终止条件：到达 Leaf-Node。

推理阶段，如何选择最优路径

方式1: 采用投票机制，作为reward，得到每一个节点的UCT值。最终能得到最优的路径。

方式2: 使用discriminator评估整条路径，再通过mask方式，筛选结果一致的作为最优路径。

- mask 方式：返回 4 组结果，从结尾开始 mask 掉 20%、40%、60%、80%
思考&疑惑

- 定义 5 个思考因子，这 5 个因子都是有效的么？
- A1 节点能否成为 Leaf-Node：对于A1 Node的来说，后续是选做A1，但是必做A2，所以Terminal A1 node还会执行一遍A2，这时候把A2当做Leaf Node就可以了。 但是solution Node的定义是会包含Terminal A1 node。
MCTS代码实现

[https://gist.github.com/qpwo/c538c6f73727e254fdc7fab81024f6e1](https://link.zhihu.com/?target=https%3A//gist.github.com/qpwo/c538c6f73727e254fdc7fab81024f6e1)

自定义函数：

- Reward：定义某个节点的价值。