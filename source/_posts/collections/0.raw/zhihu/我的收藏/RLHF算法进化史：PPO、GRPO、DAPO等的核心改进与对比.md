---
title: RLHF算法进化史：PPO、GRPO、DAPO等的核心改进与对比
date: "2025-10-13 00:00:00"
updated: "2025-10-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/RLHF算法进化史-PPO、GRPO、DAPO等的核心改进与对比/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1959981457079506045
---


本文主要梳理了一些用于LLM post-training的RLHF算法，以PPO为起点，总结了DPO，GRPO，Dr.GRPO，DAPO，VAPO，DCPO，GSPO等方法的改进思路，重点关注了不同方法在优势函数计算，clip处理，loss设计等方面的差异。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ae33766702c.jpg)

不同RLHF算法间的改进关系
### 基础

#### 涉及的模型

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0af82d17227a.jpg)

PPO与GRPO早期的RLHF（PPO）需要同时load 四个模型，但后续的一些优化算法旨在减少同时load的模型数量从而降低RLHF的门槛。

- Actor Model：用来训练的目标模型
- Critic Model： 产生预估总收益 V_t
- Reward Model：产生计算即时收益 R_t
- Reference Model：在RLHF阶段给语言模型增加一些“约束”，防止语言模型训歪

#### GAE

广义优势估计（GAE）是强化学习中的一种优势函数估计方法，该方法旨在平衡偏差和方差之间的权衡，以提高学习过程的稳定性和效率。该方法主要是通过控制超参数 \lambda 在MC的低偏差和TD的低方差之间找到一个平衡点。其公式为：

$A_t^{\text{GAE}} = \delta_t + \gamma \lambda A_{t+1}^{\text{GAE}} \\$

\delta_t 表示每一步的TD误差，\gamma 是折扣因子， \lambda 是用于加权的超参数，控制了TD和MC的折中。

#### 损失函数

RLHF 的标准目标函数，都是在参考模型 \pi_{ref} 的约束下，最大化由奖励模型 r(x,y) 评定的期望奖励，即：

$\max_{\pi} \mathbb{E}_{x \sim \mathcal{D}, y \sim \pi(y|x)} \left[ r(x, y) \right] - \beta D_{KL} \left( \pi(y|x) || \pi_{\text{ref}}(y|x) \right) \\$

#### 损失函数的sequence-level和token-level

sequence-leveltoken-level定义在序列级别上进行优化，即整个生成序列作为一个整体来评估和优化在 token 级别上进行优化，即每个生成的 token 都会根据即时的偏好反馈进行调整特点1. 全局优化**2. 计算效率高，是整个序列进行一次优化
## 3. 适合生成任务中对整体质量要求较高的场景1. 细粒度控制，能够在每个生成步骤上进行细粒度的调整

## 2. 计算效率相对较低，是每生成一个token进行一次评估

## 3. 能够更精细地对齐人类偏好，适合需要逐步推理的任务适合的任务新闻文章、故事生成等如数学题解题过程，代码生成，需要逐步推理和精确控制生成内容目前几乎所有的RLHF框架都能够兼容sequence-level和token-level的损失函数，只需要配置即可


### PPO

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5520f5ac7770.jpg)

PPO算法的演进
#### 数据准备

- 原始数据集中只需要准备prompt
- 训练过程中需要使用old model采样response

#### 涉及的模型

- reward model[不训、及时奖励]、
- reference model[不训、计算KL散度、降低训偏风险]、
- critic/value model[训练、状态价值，是否生成人类偏好的评估，用于预测期望总收益]，
- actor/policy model[训练、目标模型，优化其按照人类偏好生成能力]

#### 采样过程

- 利用old model对每个prompt采样单个response，没有特殊要求限制。

#### 涉及计算：

- <strong>计算reward</strong>：通过训练好的reward model对生成的response打分，输出为 R_t \in [0,1] 。
- <strong>计算value</strong>：<strong>用于预测期望总收益</strong>，通过评估response来估计动作价值期望 V_t
$- <strong>计算优势函数 A_t</strong> ：**当前动作产生的实际价值估计 [R_t + \gamma * V_{t+1}] 与当前状态下执行所有可能动作的期望价值 V_t 的差值**: A_t=(R_t+\gamma*V_{t+1})-V_t 。加上GAE就是： \hat{A}_t \stackrel{GAE}{=} (R_t + \gamma * V_{t+1} - V_t) + \gamma * \lambda * V_{t+1}，其中 \lambda 是GAE一个超参数，用来调节偏差和方差的。$
- <strong>计算return</strong>：<strong>利用后续N步的实际结果反推当前状态的实际收益</strong>，而非估计收益，主<strong>要是用来训练critic model</strong>，即：return_t=\hat A_t+V_t
- <strong>KL散度</strong>：防止模型训偏，分为两部分：

$$- 在采样数据时计算<strong>old model和ref model之间的KL散度：</strong>** \begin{aligned}KL[Actor_{old}(X) \,\|\, Ref(X)] = \mathbb{E}_{x \sim Actor_{old}(x)} \left[ \log \frac{Actor_{old}(x)}{Ref(x)} \right] \\= log\_probs_{old} - ref\_log\_probs\end{aligned} \\$$
$$- off policy训练过程中计算new model和ref model之间构建KL散度：**** \begin{aligned}KL[Actor_{new}(X) \,\|\, Ref(X)] = \mathbb{E}_{x \sim Actor_{new}(x)} \left[ \log \frac{Actor_{new}(x)}{Ref(x)} \right] \\= log\_probs_{new} - ref\_log\_probs\end{aligned} \\$$

常采用第一种方式将其作为reward（奖励函数）的一部分

$$- <strong>重要性采样</strong>：PPO本身是on-policy的RL方法，但是一般是off-policy训练的，通过重要性采样近似on-policy：**r_t=\frac{p_{new}(a_t|s_t)}{p_{old}(a_t|s_t)}=\frac{\theta_{new}(a_t|s_t)}{\theta_{old}(a_t|s_t)} \\$$
- Clip处理**：PPO还有一种PPO-Clip形式，可以约束两个policy间的差异，即：
 $$J^{\theta'}_{\text{PPO-CLIP}}(\pi_\theta) = \mathbb{E}_{(s_t,a_t) \sim \pi^{\theta'}} \left[ \min \left( \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)} A^{\theta'}(s_t,a_t), \,\text{clip}\left( \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)}, 1 - \epsilon, 1 + \epsilon \right) A^{\theta'}(s_t,a_t) \right) \right] \\$$

#### Loss

$$- critic loss：优化critic model，<strong>目的是为了使critic 对每个状态价值更准确的预测</strong>，即使实际价值 return 与预测价值 V 越接近越好，用MSE loss即可：**critic\_loss_t=MSE(V_t-return_t)=\frac{1}{2}(V_t-return_t)^2 \\也有使用Clip裁剪防止偏离过大，即：$$
$$\stackrel{clip}{V_t}=clip({V}_t,\stackrel{old}{V_t}-\delta,\stackrel{old}{V_t}+\delta)\\     critic\_loss_{clip}=MSE(\stackrel{clip}{V_t}-return_t)=\frac{1}{2}(\stackrel{clip}{V_t}-return_t)^2\\     critic\_loss=max(critic\_loss_t,critic\_loss_{clip}) \\$$
$$- actor loss：优化actor model，目的是鼓励模型采取能够产生更多的价值的动作<strong>，即 0">A_t>0 时，应该鼓励actor模型多产生这样的动作，当 A_t 应该尽量让 actor model少产生这样的动作。即： （</strong>这里的Loss没有KL散度，是因为将KL散度放在了A中<strong>）</strong>          \begin{aligned}     actor\_loss      &= \hat{\mathbb{E}} \left[      \min \left(      \frac{\pi_{\theta}(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)} \hat{A}_t , \,     \text{clip}\left(      \frac{\pi_{\theta}(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)}, \, 1 - \epsilon, \, 1 + \epsilon      \right) \hat{A}_t     \right)      \right] \\     &= \frac{1}{G} \sum_{t=1}^{G}      \min \left(      \frac{\pi_{\theta}(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)} \hat{A}_t , \,     \text{clip}\left(      \frac{\pi_{\theta}(a_t|s_t)}{\pi_{\theta'}(a_t|s_t)}, \, 1 - \epsilon, \, 1 + \epsilon      \right) \hat{A}_t     \right)     \end{aligned} \\ 写成token-level形式的则是：$$
 $$\mathcal{T}^{PPO}(\theta) = \frac{1}{G} \sum_{t=1}^{G} \left[ \frac{1}{|o|} \sum_{t=1}^{|o|} \min \left( \frac{\pi_{\theta}(o_t \mid q, o_{$$
- 最后用于backward的loss：

```text
- 联合loss**：一种是将critic loss 以一定权重加入到 actor loss 上进行联合优化，这样actor loss 也会优化critic ，同样critic loss 也会优化actor。（verl实现）即：**         loss_{backward} = actor\_loss + \delta \ast critic\_loss \quad (\text{ppo_merge_loss}) \\
```

- 分别优化**：即两个loss分别进行backward，将对方的值作为其中的常量处理。即critic loss 只优化critic model参数。 actor loss 只优化actor model参数（trl实现）。

#### 工作过程

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e562353a81da.jpg)

PPO的训练过程

- <strong>样本收集</strong>：先基于旧策略收集样本，生成多条轨迹（经验），并存入回放缓冲区，供后续训练使用，轨迹中包括：  

- 将prompt输入Refer模型获取 Ref(X)
- 将prompt输入Actor模型获取 Actor_{old}(X)
- 将prompt和 Actor_{old}(X) 输入到Reward模型计算奖励Reward
- 将prompt和 Actor_{old}(X) 输入Critic模型计算预估价值value
- Ref(X) 和 Actor_{old}(X) 计算KL散度
- 为奖励Reward添加KL散度惩罚，得到综合奖励
- 综合奖励与预估价值value一起，通过GAE算法得出优势进而得到目标价值
- 上述为一个样本的经验收集过程，将<strong>prompt，response， Actor_{old}(X) ，优势，目标价值</strong>放入缓冲区。

- <strong>多轮PPO训练</strong>：将回放缓冲区中的所有样本随机打散，并划分为多个mini-batches，对于每个mini-batch，都进行一次训练和参数更新。如果设置的ppo_epochs > 1，则重复利用回放缓冲区中的所有样本，再次随机打散并切分为小批次，重复上述训练过程ppo_epochs轮。  

$$- 计算策略概率比，即： r_t=\frac{p_{new}(a_t|s_t)}{p_{old}(a_t|s_t)}=\frac{\theta_{new}(a_t|s_t)}{\theta_{old}(a_t|s_t)}$$
- 计算actor loss，基于 r_t 和该样本的优势计算 actor_loss
- critic模型估计新的价值，将prompt和旧模型的response一起输入到新的critic模型计算新价值
- 计算critic loss，基于新价值和目标价值计算loss
- 计算总loss

- 不断循环

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### DPO

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_40a2fa788b9d.jpg)

#### 数据准备

- 数据集中包含prompt，一个被人类偏好的“获胜”回答(chosen response）和一个不被偏好的“落败”回答(rejected response）两个答案

#### 涉及模型：

- reference model[不训、计算KL散度、降低训偏风险，甚至可以把ref model输出保存下来重复使用]
- actor/policy model[训练、目标模型，优化其按照人类偏好生成能力]

#### 采样过程：

- 利用actor/policy model对每个prompt采样单个response，没有特殊要求限制。

#### 涉及计算

$$- <strong>计算reward</strong>：DPO不用事先学习一个奖励函数 r(x,y) ，而是一个从 \pi_{\theta} 和 \pi_{ref} 反解出的隐式奖励函数：**r_\theta(x, y) = \beta \log \left( \frac{\pi_\theta(y | x)}{\pi_{\text{ref}}(y | x)} \right) + \beta \log(Z(x)) \\其中 Z(x) 项仅与提示 x 有关，在比较同一提示下的两个不同回答时，这一项可以被抵消$$
- 计算value：** 无value模型，不算
- <strong>计算return</strong>：无value模型，不算
- <strong>计算优势函数</strong>：没有显式地使用传统强化学习中的优势函数
$- <strong>计算KL散度</strong>：DPO中的KL散度约束actor模型和ref模型间的接近度，防止优化过大：**\mathbb{D}_{KL} \left[ \pi(y \mid x) \middle\| \middle\| \pi_{\text{ref}}(y \mid x) \right] \\$
- 重要性采样**： 无
- <strong>clip处理</strong>：无clip限制，其中直接使用对数概率比更容易导致梯度爆炸，这也是DPO训练更不稳定的原因

#### loss

- DPO Policy loss：** 直接优化策略，拉开正负样本差距，使其更符合人类偏好标注的数据。
$$\mathcal{T}_{\text{DPO}}(\theta) = \mathbb{E}_{(s, a^+, a^-) \sim D} \left[ \log \sigma \left( \beta \left( \log \frac{\pi_{\theta}(a^+ \mid s)}{\pi_{\text{ref}}(a^+ \mid s)} - \log \frac{\pi_{\theta}(a^- \mid s)}{\pi_{\text{ref}}(a^- \mid s)} \right) \right) \right] \\\mathcal{T}_{\text{DPO}}(\pi_{\theta}; \pi_{\text{ref}}) = \mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}} \left[ \log \sigma \left( \beta \log \frac{\pi_{\theta}(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_{\theta}(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right] \\$$
- Token-level DPO loss 为（大部分的DPO loss 为token-level的）：
$$L_{DPO}(\theta) = - \sum_{t=1}^{T} \log \sigma \left( \beta \left( \log \frac{\pi_\theta(y_w^{(t)} | x^{(t)})}{\pi_\theta(y_l^{(t)} | x^{(t)})} - \log \frac{\pi_{\text{ref}}(y_w^{(t)} | x^{(t)})}{\pi_{\text{ref}}(y_l^{(t)} | x^{(t)})} \right) \right) \\$$
- 超参数 \beta 是 DPO 中最关键的超参数之一，控制着优化目标中两个部分的权重:一是最大化获胜回答与落败回答之间的概率差距(即遵循人类偏好)，二是保持与参考模型的接近度(即 KL 散度约束)。较小的 \beta 值意味着更强的 KL 约束，模型会更保守;较大的 \beta 值则会更激进地拟合偏好数据，但可能牺牲生成的多样性和质量

#### 工作过程

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_df394f6f8790.jpg)

DPO训练过程
#### Reference

- DPO存在的问题：[为什么dpo算法的泛化性不如ppo？](https://www.zhihu.com/question/1905728020439868255/answer/1919449001603863027)
- [DPO 为何销声匿迹？GRPO 凭什么成为大模型新宠算法？](https://zhuanlan.zhihu.com/p/1945892634217407564)

### GRPO

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cc7feb09f4f5.jpg)

#### 数据准备

- 原始数据集中只需要准备prompt
- 训练过程中需要使用old model采样response。每次每条prompt在PPO只需采样一个，但在<strong>GRPO每次每条prompt要采样更多的response，用来计算优势函数。</strong>

#### 涉及的模型

<strong>不需要value/critic model，只需要训练actor/policy model</strong>

- reward model[不训、及时奖励]
- reference model[不训、计算KL散度、降低训偏风险]
- actor/policy model[训练、目标模型，优化其按照人类偏好生成能力]

#### 采样过程

- 利用old model对每个prompt采样一组response。

#### 涉及计算：

- <strong>计算reward</strong>：可以用PPO中的Reward model进行打分，但<strong>实际上多采用基于规则的打分</strong>。采用<strong>多种打分规则加权</strong>获得最终的reward结果。（trl中就是这样实现的）
- <strong>计算value：</strong>无value模型，不算
- <strong>计算return</strong>：无value模型，不算
$$- <strong>计算优势函数</strong>：GRPO是利用多个采样结果进行投票仲裁的方式进行计算，基于当前response的奖励相对均值的大小进行估计，而不是PPO的value等反推逻辑进行计算：**A_i=\frac{r_i-mean(\{r_1,r_2,...,r_G\})}{std(\{r_1,r_2,...,r_G\})} \\$$
$$- 计算KL散度<strong>：</strong>使用近似器估计KL散度，<strong>该近似器的思想散通过对当前策略和参考策略的概率比值的简单变换来估计KL散度</strong> \mathbb{D}_{KL} \left( \pi_{old} \| \pi_{ref} \right) = \frac{\pi_{ref}(o_i \mid q)}{\pi_{old}(o_i \mid q)}- \log \frac{\pi_{ref}(o_i \mid q)}{\pi_{old}(o_i \mid q)} - 1 \\$$
- 重要性采样**：同PPO
- <strong>clip处理</strong>：同PPO

#### Loss

<strong>GRPO中不涉及value model的训练，所以训练过程中只涉及到actor loss计算和更新。</strong>

GRPO论文中的损失函数定义如下：

$$\mathcal{T}^{GRPO}(\theta) = \frac{1}{G} \sum_{i=1}^G \left( \min\left( \frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)} A_i, \operatorname{clip}\left( \frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)}, 1 - \varepsilon, 1 + \varepsilon \right) A_i \right) \right. \\ \left. - \beta \mathbb{D}_{KL}(\pi_\theta \parallel \pi_{\text{ref}}) \right) \\$$

<strong>以下是token-level 的loss，当前大部分GRPO实现中的loss是token-level形式的</strong>

RL早期版本代码实现中，使用的是这种形式，没有使用clip：

$$\mathcal{T}^{GRPO}(\theta) =  \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left\{ \frac{\pi_\theta (o_{i,t} \mid q, o_{i,$$

加上clip后的token-level loss 损失函数如下（Verl代码实现中就是这样的）：

$$\mathcal{T}^{GRPO}(\theta) =  \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \frac{\pi_\theta (o_{i,t} \mid q, o_{i,$$

$$GRPO主要按照上式的 \frac{1}{G} \sum_{i=1}^G \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} 方式进行计算的loss，即所谓的”token-level loss“$$

#### 工作过程

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f30cd6833b6.jpg)

- <strong>准备数据和模型</strong>：一个batch中的数据右对齐（不等长的序列填充左侧）；准备policy model， refer model，reward策略/reward model
- <strong>生成补全（Generating completions）：在每一步训练中，抽样一个batch的prompt并为每个提示生成一组G个补全</strong>（completions）
- <strong>计算优势 （Computing the advantage</strong>）：在每个prompt样本的一组补全内，使用奖励模型（reward model）计算每一个补全的奖励（reward），然后基于公式 $A_i=\frac{r_i-mean(\{r_1,r_2,...,r_G\})}{std(\{r_1,r_2,...,r_G\})}$ 计算相对奖励
- <strong>估计KL散度（Estimating the KL divergence）：</strong>通过近似器估计KL散度，将policy模型的输出作为refer模型的输入再算一次每个token的logits
- <strong>计算损失（Computing the loss）：</strong>这一步的目标是最大化优势，同时确保模型保持在参考策略附近。基于优势和KL散度计算损失

#### Reference

[DeepSeek的GRPO算法是什么？](https://www.zhihu.com/question/10766825126/answer/88583863333)

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### Dr.GRPO

#### 数据准备

<strong>与GRPO相同</strong>

#### 涉及模型

<strong>与GRPO相同</strong>

#### 采样过程

<strong>与GRPO相同</strong>

#### 涉及计算

- <strong>计算reward</strong>：同GRPO
- <strong>计算value：</strong>无value模型，不算
- <strong>计算return</strong>：无value模型，不算

```text
- **计算优势函数**：取消了GRPO中的std归一化操作，即：**A_i=r_i-mean(\{r_1,r_2,...,r_G\}) \\
```

$$- 计算KL散度<strong>：</strong>使用近似器估计KL散度，<strong>该近似器的思想是通过对当前策略和参考策略的概率比值的简单变换来估计KL散度</strong>\mathbb{D}_{KL} \left( \pi_{old} \| \pi_{ref} \right) = \frac{\pi_{ref}(o_i \mid q)}{\pi_{old}(o_i \mid q)}- \log \frac{\pi_{ref}(o_i \mid q)}{\pi_{old}(o_i \mid q)} - 1 \\$$
- 重要性采样**：同PPO，GRPO
- <strong>clip处理</strong>：同PPO，GRPO

#### Loss

Dr.GRPO 本文认为GRPO中对序列按 token 数进行平均（即使用 \frac{1}{O_i}）会因响应长度不同而导致每个 token 在整体损失中的权重不一致，从而可能不当弱化或强调某些 token 的影响。因此，Dr.GRPO 去掉了 \frac{1}{O_i}，改用最大响应长度 M 进行统一加权平均，以消除长度差异带来的偏差。loss为：

$$\mathcal{T}^{Dr.GRPO}(\theta) = \frac{1}{G*M} \sum_{i=1}^{G} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \frac{\pi_\theta (o_{i,t} \mid q, o_{i,$$

#### 工作过程

与GRPO相同

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### DAPO

结合Dr.GRPO, 在GPRO的基础上进行改进。

#### 数据准备

同GRPO

#### 涉及模型：

同GRPO

#### 采样过程：【动态采样】

<strong>PPO中是一个prompt采样一个response即可；而GRPO中是一个prompt 没有特殊要求地采样一组response；DAPO采用的是动态采样</strong>

- 动态采样：利用old model对每个prompt采样一组G>1[DAPO=16]个response，同时<strong>要求G个response中必须同时包含正负样本</strong>且根据Reward方式进行丢弃或加权，否则对应prompt重新采样[限定次数]或被直接丢弃[DAPO做法]，候补其他prompt进行采样。 即：
0 

#### 涉及计算

- <strong>计算reward</strong>：在GRPO的基础上，<strong>增加对长度惩罚项或超长过滤</strong>

- overlong filter: <strong>超过最大长度的response直接丢弃</strong>，或在训练计算loss时利用mask方式将其设置为0
- <strong>Soft Overlong Punishment</strong> [软超长惩罚机制]：对过长内容进行惩罚，作为reward的一部分，即：
$$R_{\text{length}}(y) = \begin{cases} 0, & |y| \leq L_{\text{max}} - L_{\text{cache}} \\ \frac{(L_{\text{max}} - L_{\text{cache}}) - |y|}{L_{\text{cache}}}, & L_{\text{max}} - L_{\text{cache}} $$

- <strong>计算value：</strong>无value模型，不算
- <strong>计算return</strong>：无value模型，不算

```text
- **计算优势函数**：取消了GRPO中的std归一化操作，即：**A_i=r_i-mean(\{r_1,r_2,...,r_G\}) \\
```

- 计算KL散度<strong>：</strong>不使用KL惩罚**，认为不应该用KL限制其模型的探索空间
- <strong>重要性采样</strong>：动态采样
- <strong>clip处理</strong>：<strong>扩大上限，增加低分区间上限，提供更多样性的探索空间（还是固定的上下限）。</strong>

$- 认为当 \pi_{\theta_{old}} 越低时，允许模型在低分值的探索空间上限过小。所以<strong>有必要提升clip的上限，做法是</strong>增加低分段的探索空间上限，做法是分别设置 \varepsilon 的值，即<strong>： ( \varepsilon_{low}=0.2, \varepsilon_{high}=0.28)</strong>$

$#### \text{clip}(r_{i,t}(\theta), 1 - \varepsilon_{\text{low}}, 1 + \varepsilon_{\text{high}}) \\loss$

论文中提到DAPO是token-level loss计算，GRPO是sample-level loss计算，但在verl代码中实际上GRPO、PPO也是token level计算

$$L^{DAPO}(\theta) = \frac{1}{\sum_{i=1}^{G} |o_i|} \sum_{i=1}^{G} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \frac{\pi_\theta (o_{i,t} \mid q, o_{i,$$

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### VAPO

#### 数据准备

- 原始数据集中只需要准备prompt

#### 涉及模型

同PPO

- reward model[不训、及时奖励]、
- reference model[不训、计算KL散度、降低训偏风险]、
- critic/value model[训练、状态价值，是否生成人类偏好的评估，用于预测期望总收益]，<strong>在正式训练前先使用MC法采样 return 训练 Value Model，直到损失和方差足够低</strong>
- actor/policy model[训练、目标模型，优化其按照人类偏好生成能力]

#### 采样过程

提出了Group-Sampling，与GRPO相似，每一个 prompt 采样多个回答，以获得更丰富的对比信号。

#### 涉及计算

- <strong>计算reward</strong>：通过训练好的reward model对生成的response打分，输出为 R_t \in [0,1] 。
- <strong>计算value：</strong>计算过程与PPO相同，<strong>但Value-Pretraining 先行训练了Value Model</strong>
- <strong>计算return</strong>：与PPO相同
$$- <strong>计算优势函数</strong>：提出了<strong>Decouple-GAE</strong>，<strong>policy model 和 value model 使用不同的折扣因子</strong>，\lambda_{critic} = 1.0 用于缓解长距离衰减问题， \lambda_{policy} = 0.95 用于保证policy快速收敛 。更进一步地：提出<strong>Length-Adaptive GAE</strong>，让 \lambda_{policy} 和输出序列长度  l 成正比： \lambda_{policy} = 1- \frac {1}{\alpha l}$$
- <strong>计算KL散度</strong>： ****同PPO
- <strong>重要性采样</strong>：与PPO相同
- <strong>clip处理</strong>：与DAPO相同，解耦 \varepsilon_{low}，\varepsilon_{high}，扩大上限 <strong>\varepsilon_{high}</strong> ，增加低分区间上限，提供更多样性的探索空间（还是固定的上下限）

#### Loss

对于原始PPO loss，其中的损失平均计算会导致来自较长序列的token对最终损失值的贡献较小。因此使用DAPO的<strong>Token-Level Policy Gradient Loss</strong>，对于同一个batch所有token均被赋予相同的权重，从而能够以更高的效率解决长序列带来的问题，即：

$$\mathcal{L}_{\mathrm{PPO}}(\theta) = -\frac{1}{\sum_{i=1}^{G} |o_i|} \sum_{i=1}^{G} \sum_{t=1}^{|o_i|} \min \left( r_{i,t}(\theta) \hat{A}_{i,t}, \mathrm{clip} \left( r_{i,t}(\theta), 1-\varepsilon, 1+\varepsilon \right) \hat{A}_{i,t} \right) \\$$

还提出<strong>Positive Example LM Loss</strong>提高positive samples的利用率：

$$\mathcal{L}_{\mathrm{NLL}}(\theta) = -\frac{1}{\sum_{o_i \in \mathcal{T}} |o_i|} \sum_{o_i \in \mathcal{T}} \sum_{t=1}^{|o_i|} \log \pi_{\theta} \left( a_t | s_t \right) \\$$

最后：

$\mathcal{L}(\theta) = \mathcal{L}_{\mathrm{PPO}}(\theta) + \mu * \mathcal{L}_{\mathrm{NLL}}(\theta) \\$

critic loss与PPO相同

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### GSPO

与PPO、GRPO、DAPO、Dr.GRPO主要区别在于，<strong>GSPO中的clip从token维度转换为sequence维度，并针对MOE做了router。</strong>

作者认为toke-level的GRPO更关注每个token的精细优化，适合需要精准控制生成细节的任务，但可能受异常token影响较大。而sequence-level的GSPO通过句子级平均平滑了 token 级波动，训练更稳定，适合以句子整体质量为导向的任务（如摘要生成、问答），但牺牲了部分 token 级优化精度，因此也提供了token-level级别的GSPO。

#### 数据准备

同GRPO、Dr.GRPO、DAPO

#### 涉及模型：

同GRPO、Dr.GRPO、DAPO

#### 采样过程：

同GRPO、Dr.GRPO、没有采用DAPO的动态采样

#### 涉及计算

- <strong>计算reward</strong>：与GRPO、Dr.GRPO等相同，未采用DAPO对response长度进行惩罚的策略
- <strong>计算value：</strong> 无value模型，不算
- <strong>计算return</strong>：无value模型，不算
- <strong>计算优势函数</strong>：与GRPO、Dr.GRPO等相同，未采用DAPO对response长度进行惩罚的策略
- <strong>计算KL散度</strong>：<strong>不使用KL惩罚</strong>
- <strong>重要性采样</strong>：同GRPO
- <strong>clip处理</strong>：可分为sequence-level 和token-level两种

- sequence-level：以sequence为单位，整体进行clip剪切
$$s_i(x) = \exp \left( \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \log \frac{\pi_\theta(o_{i,t} | \mathbf{q}, \mathbf{o}_{i,$$

$$- token-level：为token为单位，就是将对应的 s_i 剔除梯度，并将token自身对大小做归一 s_t^i(x) = sg[s_i(\theta)]\cdot\frac{\pi_\theta(o_{i,t}|\mathbf{q}, \mathbf{o}_{i,$$

#### loss

根据clip的处理也可以 sequence-level loss 和 token-level loss 两种：

- sequence-level：
$$\mathcal{T}^{\text{GSPPO}}_{sequence}(\theta) = \frac{1}{G} \sum_{i=1}^{G} \min \left( s_i(\theta) \hat{A}_i, \text{clip}(s_i(\theta), 1 - \varepsilon_{\text{low}}, 1 + \varepsilon_{\text{high}}) \hat{A}_i \right) \\$$

- token-level：
$$\mathcal{T}^{\text{GSPO}}_{token}(\theta) = \left[ \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \min \left( s_{i,t}(\theta) \hat{A}_{i,t}, \ \text{clip} \left( s_{i,t}(\theta), 1 - \varepsilon_{\text{low}}, 1 + \varepsilon_{\text{high}} \right) \hat{A}_{i,t} \right) \right] \\$$

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)

### DCPO

主要解决主流RL中普遍存在的问题：1）固定CLIP范围对低概率token不友好，导致模型在高熵”rare token“上探索能力不足；2）现有advantage计算只考虑当前生成的response簇，而生成过程中存在很大随机性，导致相同reward时梯度为零以及随机性生成的response归一化后的advantage会波动更大，对模型训练稳定性不友好问题。

#### 数据准备

同GRPO、Dr.GRPO、DAPO

#### 涉及模型：

同GRPO、Dr.GRPO、DAPO

#### 采样过程：

同GRPO、Dr.GRPO、没有采用DAPO的动态采样

#### 涉及计算

- <strong>计算reward</strong>：基于规则的reward

```text
R_j^i = \begin{cases} 1, & \text{答案和格式正确} \\0, & \text{格式正确，答案不正确} \\-1, & \text{格式错误}\end{cases} \\
```


- <strong>计算value：</strong> 无value模型，不算
- <strong>计算return</strong>：无value模型，不算
$$- <strong>计算优势函数</strong>：针对当前reward相同导致advantage为零以及随机采样对相同reward在不同step中抖动问题，考虑累计生成reward的归一化进行平滑**\hat{A}_{\text{new},j}^i = \frac{\left( R_j^i - \mu_{\text{new}}^i \right)}{\sigma_{\text{new}}^i} \quad \text{(current_advantage)}\\ \hat{A}_{\text{total},j}^i = \frac{\left( R_j^i - \mu_{\text{total}}^i \right)}{\sigma_{\text{total}}^i} \quad \text{(cumulative_advantage)} \\ 对于同一个prompt，基于当前reward计算advantage和基于累计reward计算advantage。利用步数加权。$$
$$\hat{SA}_{\text{new},j}^i = \frac{i-1}{i} \hat{A}_{\text{new},j}^i + \frac{1}{i} \hat{A}_{\text{total},j}^i \quad (\text{smooth-advantage}) \\  其中 \hat{SA}_{\text{total},j}^i = \frac{1}{i} \hat{A}_{\text{new},j}^i + \frac{i-1}{i} \hat{A}_{\text{total},j}^i \\ 为稳定advantage波动性，参与模型训练的advantage取其绝对值最小值$$
$$\hat{A}_j^i = \begin{cases} \hat{SA}_{\text{new},j}^i, & \text{when } |\hat{SA}_{\text{new},j}^i|  这样做的好处是：当reward相同时，将以 \frac{1}{i}\hat{A}_{total,j}^i 权重参与模型更新过程中，即保留了response参与模型更新，又限制了其以很小的权重参与模型更新$$
- 计算KL散度<strong>：</strong>不使用KL惩罚**
- <strong>重要性采样</strong>：同GRPO
$$- <strong>clip处理</strong>：使用动态自适应clip（<strong>Dynamic-Adaptive Clipping</strong>）。从动态采样方差的偏差出发，推导出对应不同概率的上下限范围，<strong>使clip剪切范围随着概率的变化成反比变化</strong>，在低旧概率时，可参与模型训练的新概率范围越大，这使模型在低概率高熵域有极大的探索空间。Dynamic-Adaptive Clipping的公式为：**0.5 + \frac{1}{2} \sqrt{\max \left( 1 - \frac{4 \epsilon_{\text{low}}}{q(x)}, 0 \right)} \leq r(x) \leq 0.5 + \frac{1}{2} \sqrt{1 + \frac{4 \epsilon_{\text{high}}}{q(x)}} \\ 经典设置为：\epsilon_{\text{low}}=0.16，\epsilon_{\text{high}}=0.2，r(x)_{max}=10$$

#### loss

在GRPO的sequence-level loss基础上删除batch之间的平均**，因为在计算Advantage标准化时已经获得了标准化关系，所有response如果进行batch平均，相应的标准化结果将被削弱，在模型更新时未充分发挥

$$\mathcal{T}^{DCPO}(\theta) = \frac{1}{G} \sum_{i=1}^{G} \sum_{t=1}^{|o_i|} \left\{ \min \left[ \frac{\pi_{\theta}(o_{i,t} \mid \mathbf{q}, \mathbf{o}_{i,$$

#### Reference

[一文详细对比PPO、GRPO、DAPO、GSPO、DCPO的核心差异](https://zhuanlan.zhihu.com/p/1888311680880080185)