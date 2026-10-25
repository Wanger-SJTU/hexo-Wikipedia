---
title: 【手撕LLM- GRPO 】你只管给Reward, 剩下的交给RL（附代码）
date: "2025-10-26 00:00:00"
updated: "2025-10-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【手撕LLM-GRPO-】你只管给Reward,-剩下的交给RL(附代码)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/20812786520
---


**我是小冬瓜AIGC，原创超长文知识分享，原创课程已帮助多名同学速成上岸LLM赛道。  
 研究方向：LLM、RL、RLHF

*你只管给Reward, 剩下的交给RL***

### 前置阅读

我们在前三篇分别从实现方法和实现思想解读了DeepSeek-R1：

[小冬瓜AIGC：【解读】DeepSeek-R1：RL前真的不需要SFT了吗???](https://zhuanlan.zhihu.com/p/19623772462)

[小冬瓜AIGC：再深挖DeepSeek-R1: Reward is Enough](https://zhuanlan.zhihu.com/p/20053834500)

[小冬瓜AIGC：X-R1: 不到50元，人人都能复现0.5B Aha Moment](https://zhuanlan.zhihu.com/p/23301339895)

本文涉及到的GRPO-loss代码开源⬇️，X-R1复现Aha Moment开源

[https://github.com/dhcode-cpp/grpo-loss](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/grpo-loss)

[GitHub - dhcode-cpp/X-R1: minimal-cost for training 0.5B R1-Zero](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)

### 1. 问题设置

#### 1.1 问题定义和评价标准

在DeepSeek-R1-Zero中，仅通过RL算法就能提升模型的数学推理能力。我们给定数学问题q" role="presentation">qq，让模型进行回答o" role="presentation">oo，再将回答与标签y" role="presentation">yy判别正确性I(o=y)" role="presentation">I(o=y)\mathbb{I}(o=y)，给定n" role="presentation">nn个问题，模型能够答对k" role="presentation">kk 个，则准确率为acc=k/n" role="presentation">acc=k/n\text{acc}=k/n， 那么我们的评判模型推理能力的标准是有更高的准确率.

对于选择题来说，模型的回答o 可以直接输出\{A,B,C,D\}之中的限定一个，但是对于数学解答题来说，模型要生成一个客观自由形式的答案如o=, 如果标签为y=0.5 , 那么我们的指示函数的判别应等于1:

\mathbb{I}(=0.5)=1 \\

以上的数学问题是特定形式的，即一个问题对应于一个客观的答案，但是客观的答案有多种表达形式，所生成答案与标签的数学含义是相等的，才能算是正确，这种特性我们简称为答案的一致性。并非严格意义上要求字符串匹配或者是token序列匹配，比如0.5和 判别为错误，那么将误导模型的学习，造成收敛困难。

为了方便我们提取最终答案，我们可以要求模型输出正确答案时，以`$\boxed{}$` latex格式进行包裹。

#### 1.2 CoT与LongCoT

对于一个算术问题，我们通常有如下“提示词工程”手段来推断出模型的答案：

- 直接问答：让模型直接输出预测的最终答案，但通常准确率低。** 
- In-context Learning：在提示词增加example，来进行引导，比如在MMLU选择题中，让base模型参考例子来生成\{A,B,C,D\} 中的一个选项
 
- 提示词工程Chain-of-Thought(CoT)：在提示词中，加入一种结构化的解答形式的例子，来帮助模型进行推断，使得模型能够生成相似的结构化解答形式，增加回答正确答案的可能性。
 
- Auto-CoT：在3中我们针对不同类型的问题需要特定的示例，Auto-CoT提出一种“Let‘s think step-by-step”的提示词，让模型自动化生成结构化的解答。
 
上述都是基于提示词工程的角度，不同程度的增强模型的推理能力。另外

- 我们也可以收集问题和结构化解答的回答(CoT形式的回答), 对Base模型进行SFT训练，将结构化推理能力训入到模型参数里，在实际使用模型时，我们可以使用zero-shot的方式，得到CoT式的解答。
我们比较方法(2,3,4)与(5)的方法最大的差异在于模型的参数是否发生了改变，前者是从输入提示词里进行即时的学习，后者是将解答形式永久的学习(模型参数发生了改变)。

综上我们希望，能够让模型内在的学会推理，即面对一个数学问题时，inference时能够CoT形式推导出正确的答案；

当问题较为复杂，模型生成的内容可能具有反复的猜想、推理和验证的推理属性，通常会产生大量的token，这里的量级我们用长度来衡量，即是Long-CoT。二者实际上没有本质的区别，都是为了推导出最终答案而服务的，缺陷在于Long-CoT需要耗费更多的inference decoding资源，需要注意：

- CoT的推理过程可能具有错误
- CoT推理过程有错误也可能回答到正确答案。
- CoT推理过程可能不能回答到任何答案。
- Long-CoT/CoT并无明确的长度定义的区分标准
- Long-CoT实际上依然考究模型的long-context能力，要在复杂的上下文中推导出正确答案
- 模型智能到达一定程度，或许可以跳过CoT直接给出答案
好的模型，应该有更简短的CoT和高的准确率。一味的追求Long-CoT并不是最理想的，其带来的成本增长是有差异的，比如生成1w长度的Token和生成2w长度的Token，推理的成本并非是线性增长的。

#### 1.3 输入和输出

我们在进行训练时，通常需要准备问题集，和每个问题对应的答案标签。

模型输入：问题

模型输出：CoT解答和最终答案

判别：最终答案和标签的一致性。

#### 1.4 GRPO优化算法

GRPO优化算法概述如下，GRPO优化过程仅需要加载两个模型，一个是目标优化模型，一个是ref模型。由于有规则reward的判别，并不需要reward model。（如果判别是由奖励模型，那么仍需要，比如用GRPO做RLHF需要peference reward model）

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b9899a93a06a.jpg)

$$\mathcal{L}_{\text{GRPO}}(\theta) = - \frac{1}{G} \sum_{i=1}^G \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left[ \min \left( \frac{\pi_\theta(o_{i,t} \mid q, o_{i,\text{\mathbb{D}_{\text{KL}}\left[\pi_\theta \|\pi_{\text{ref}}\right] = \frac{\pi_{\text{ref}}(o_{i,t} \mid q, o_{i,\text{\hat{A}_{i,t} = \frac{r_i - \text{mean}(\mathbf{r})}{\text{std}(\mathbf{r})}  \\$$

- 对于模型\pi_\theta 给定一个问题q 进行采样生成多个回答o_i,i=1,2,3,\ldots,G , G为group数量，而每个回答有不同的长度为|o_{i}|
 
$- \pi_\theta(o_{i,t} \mid q, o_{i, 为在1的采样解答o_{i,t} 解码的第t 个词元的策略概率。$
 
- KL项约束\pi_\theta策略分布与原始策略\pi_\text{ref}分布不能差异太大，这里采用一种优化的KL项，具有无偏且方差小的特性。
 
$- \textbf{r}=\{r_1,r_2,\ldots,r_G\} , 而\hat{A}_{i,t} 为组相对的优势。t 意味着一个回答的每个token的优势都是一样的。$
 

### 2. 在线采样

#### 2.1 格式化prompt

我们给定常规的问答模版, 比如我们问询：“如何写python程序”，通常需要进行格式化处理，并附上模型发言的前缀`#ASSISTANT:`

`#SYSTEM:你需要友善的回答用户的问题
#USER: 如何写python程序
#ASSISTANT:`

对于数学问题我们可以如下定义模版，在问题后面附上``. 所以我们输入到模型里面的内容，也声明了回答的格式，仍要求模型具备一定的指令跟随能力。

`#SYSTEM:你需要在标签后面思考以结尾，
答案前后分别使用和，最终答案以$\boxed{}$来处理。
#USER:求解f(x)=x^3+e^x+1的最小值
`

基于上述的提示词，我们可以对模型\pi_\theta进行采样出多条回答o_i。回答的类型可能有

- 没有``
- 没有``
- 没有``
- 答案没有`$\boxed{}$` 框住
上述四种情况都为未遵循指令要求的格式输出。正确的模型输出格式为：

`THINK>{SOLUTION} \THINK> 
ANSWER> the final answer is $\boxed{}$ \answer>`

#### 2.2 说明

这里\pi_\theta 是on-policy采样, 在GRPO相关论文里，采样的数量G=64 ，采样过程实际上为一种探索,，如果能够探索到正确答案，得到正的奖励。

所以在数学问题的GRPO优化里，我们不需要提前准备好解答过程`{SOLUTION}`，只需要让模型去采样(合成）数据.

在上述生成过程里如果能够生成` {SOLUTION} ` ，`{SOLUTION}`指代模型的 `CoT` 推理。

我们讨论两种情况, 对于GRPO算法来说，哪个是好的采样？

- 生成的解答过程是对的，但是答案错误，即`$\boxed{}$`
 
- 生成的解答过程是错的，但是答案正确,  即`$\boxed{}$`
 
答案是2， 因为该形式的数学问题，分数是结果导向的，而非过程。

那么又产生了新的疑问：

Q1: 上述采样1判别是否合理？

Q2: 采样2的解答过程是否会随着RL训练，采样的解答过程越来越严谨？

### 3. 奖励函数和优势

奖励通常有两种：

- model-base：通常需要有神经网络或带学习参数的算法，对数据进行打分，如preference reward，PRM
- ruled-base：指的是按照一定的规则就能确认，如选择题的ABCD选项、字符串匹配和算术题数字、以及围棋，均可以通过确定的规则进行判别。
第二种，并没有参数其判别更加直接且客观。

#### 3.1 规则奖励

在模型的回答o_i里我们要提取 ，与最终的结果比较0.5

`{SOLUTION}  
 the final answer is $\boxed{}$ `

这里涉及到答案的一致性判别，为了方便实现我们可以严格的要求字符串等同，但效率太差。

我们看open-r1早期实现判别：

`def accuracy_reward(completions, ground_truth, **kwargs):
    """Reward function that checks if the completion is the same as the ground truth."""
    # Regular expression to capture content inside \boxed{}
    contents = [completion[0]["content"] for completion in completions]
    answers = [extract_boxed_content(content) for content in contents]
    # Reward 1 if the content is the same as the ground truth, 0 otherwise
    return [1.0 if answer == gt else 0.0 for answer, gt in zip(answers, ground_truth)]`

当前实现hf写了个库做一致性判别`huggingface/Math-Verify`, 可以通过调包来判别。但是具体的math_verify未探究

`from math_verify import LatexExtractionConfig, parse, verify
def accuracy_reward(completions, solution, **kwargs):
    """Reward function that checks if the completion is the same as the ground truth."""
    contents = [completion[0]["content"] for completion in completions]
    rewards = []
    for content, sol in zip(contents, solution):
        gold_parsed = parse(sol, 
                            extraction_mode="first_match", 
                            extraction_config=[LatexExtractionConfig()])
        if len(gold_parsed) != 0:
            # We require the answer to be provided in correct latex (no malformed operators)
            answer_parsed = parse(
                content,
                extraction_config=[
                    LatexExtractionConfig(
                        ....
                            boxed=True, # 提取box
                        ....
                        ),
                        # Ensures that boxed is tried first
                        boxed_match_priority=0,
                        try_extract_without_anchor=False,
                    )
                ],
                extraction_mode="first_match",
            )
            # Reward 1 if the content is the same as the ground truth, 0 otherwise
            reward = float(verify(answer_parsed, gold_parsed)) # 进行正确性判别`

#### 3.2 SimpleEval判别

那么我们也可以用LLM-As-Judge的形式进行判别，参照OpenAI的[SImpleEval](https://link.zhihu.com/?target=https%3A//github.com/openai/simple-evals)的实现， 判别模版如下，即让GPT-4模型in-context learning来判别。

`# simple-evals/common.py

EQUALITY_TEMPLATE = r"""
Look at the following two expressions (answers to a math problem) and judge whether they are equivalent. Only perform trivial simplifications

Examples:

    Expression 1: $2x+3$
    Expression 2: $3+2x$

Yes

    Expression 1: 
    Expression 2: 1.5

Yes

    Expression 1: $x^2+2x+1$
    Expression 2: $y^2+2y+1$
.....

No
(these are actually equal, don't mark them equivalent if you need to do nontrivial simplifications)

    Expression 1: 2/(-3)
    Expression 2: -

Yes
(trivial simplifications are allowed)

    Expression 1: 72 degrees
    Expression 2: 72

Yes
(give benefit of the doubt to units)
....

---

YOUR TASK

Respond with only "Yes" or "No" (without quotes). Do not include a rationale.

    Expression 1: %(expression1)s
    Expression 2: %(expression2)s
""".strip()
`

根据上述的LLM-As-Judge，我们得到YES或者NO，那么对应的奖励分数为1和0.

那么一组采样数据里，我们得到对应的规则奖励为：

\textbf{r}=\{r_1,r_2,\ldots,r_G\}\in\{0,1\} \\

奖励是sentence-level的，奖励是标量值。

#### 3.3 手撕Advantage

在上述的奖励函数所得到的奖励，可以直接使用，我们根据GRPO的优势函数公式计算

$$\hat{A}_{i,\color{red}{t}} = \frac{r_i - \text{mean}(\mathbf{r})}{\text{std}(\mathbf{r})} \\$$

其中\hat{A}_{i,t} 里的t 对应token-level优势，即一个句子中，每个token对应的优势是一样的。这种方式的好处在于，估计都是从真实的环境reward计算得来，而不是通过价值估计计算而得。

对应的代码实现为:

`def grpo_advantage(rewards):
    epsilon = 0.00001
    rewards = torch.tensor(rewards, dtype = torch.float) 
    A = (rewards - rewards.mean()) / (rewards.std() + epsilon)
    return A`

测试, 我们假设采样6条输出，对应6个奖励，我们看case2里，正确项相对上的优势估计更大。而错误的回答将得到负的值。当全错和全对时，优势是无效的，那么可以skip掉，如果base模型差无法采样到正确反馈，那么优化将会非常缓慢和不稳定。

`A = grpo_advantage([0,0,0,0,0,0])
# A tensor([-0., -0., -0., -0., -0., -0.])

A = grpo_advantage([1,0,0,0,0,0])
# A tensor([ 2.0468, -0.4094, -0.4094, -0.4094, -0.4094, -0.4094])

A = grpo_advantage([1,0,0,0,1,0])
# A tensor([ 1.2905, -0.6452, -0.6452, -0.6452,  1.2905, -0.6452])

A = grpo_advantage([1,0,0,1,1,0])
# A tensor([ 0.9094, -0.9094, -0.9094,  0.9094,  0.9094, -0.9094])

A = grpo_advantage([1,1,1,1,1,1])
# A tensor([0., 0., 0., 0., 0., 0.])`

我们再测64个样本只有1个回答正确

`reward_batch = [0] * 64
reward_batch[0] = 1
A = grpo_advantage(reward_batch)
print(A)`

输出

`tensor([ 7.8887, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252,
        -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252, -0.1252])`

#### 3.4 格式奖励

通过正则表达式即能判别回答是否遵循格式，若遵循返回1，否则为0。

`# open-r1
def format_reward_func(completions, **kwargs):
    """Reward function that checks if the completion has a specific format."""
    pattern = r"^.*?.*?$"
    completion_contents = [completion[0]["content"] for completion in completions]
    matches = [re.match(pattern, content) for content in completion_contents]
    return [1.0 if match else 0.0 for match in matches]`

### 4. GRPO KL

#### 4.1 GRPO KL 无偏小方差

KL通常用于衡量两个概率分布的差异情况。标准的KL项为：

$$\mathbb{D}_{KL}[\pi_{\theta} || \pi_{ref}]=- \log\frac{\pi_{ref}(o_{i,t}|q,o_{i, \text{$$

GRPO采用以下形式的KL，相较上式无偏小方差，将在下节分析

$$\mathbb{D}_{KL}\left[\pi_{\theta} || \pi_{ref}\right] = \frac{\pi_{ref}(o_{i,t}|q,o_{i,\text{$$

$$将\gamma=\frac{\pi_{ref}(o_{i,t}|q,o_{i,\text{,则$$

$\mathbb{D}_{KL}\left[\pi_{\theta} || \pi_{ref}\right] = (\gamma - 1) - \log \gamma \\$

#### 4.2 手撕GRPO KL

GRPO KL是token-level的

`def grpo_kl(pi_logprob, pi_ref_logprob):
    return pi_ref_logprob.exp() / pi_logprob.exp()- (pi_ref_logprob - pi_logprob) - 1

pi = torch.randn(3, 5) # batch, sequence
pi_ref = torch.randn(3, 5) # batch, sequence
pi_logprob = torch.nn.functional.log_softmax(pi, dim = 1)
pi_ref_logprob = torch.nn.functional.log_softmax(pi_ref, dim = 1)
print(grpo_kl(pi_logprob, pi_ref_logprob))`

实现上，我们通常存储logprob，而不需要完整的输出分布来计算KL，减少存储占用。

输出

`tensor([[0.1465, 0.0457, 0.5321, 0.0793, 0.0728],
        [1.1576, 3.0678, 0.5285, 0.3712, 0.0817],
        [0.0031, 0.8179, 2.4575, 0.1597, 0.0221]])`

均为正数。与PPO不同，不产生reward shaping： R = r-KL

#### 4.3 无偏小方差KL

根据John Schulman：Approximating KL Divergence

$$- k1（naive estimator）：\log \frac{q(x)}{p(x)} = -\log r，其中r = \frac{p(x)}{q(x)}。$$
 

- 这个估计器是无偏的，但方差很大，因为它对一半的样本是负的即q(x)\text{，将导致估计值波动非常大。
 
- 当q(x)和p(x) 差异大时，对数值也可能产生很大的变化。 

$$- k2（low variance estimator）：\frac{1}{2}(\log \frac{p(x)}{q(x)})^2 = \frac{1}{2}(\log r)^2。$$
 

- 这个估计器是有偏的，但方差较低.
- 并且实证偏差很小。因为保证所有样本的值都是正的

- k3（unbiased low variance estimator）：(r - 1) - \log r。这个估计器是无偏的，并且方差较低。
 

- 在k1基础上增加(r-1)项，减少方差
- r-1是无偏的
- } \log r">r-1 \text{>} \log r, 保证 k3 都是正值

#### 4.4 手撕KL

`import torch.distributions as dis
p = dis.Normal(loc=0, scale=1)
q = dis.Normal(loc=0.1, scale=1)
x = q.sample(sample_shape=(10_000_000,))
truekl = dis.kl_divergence(p, q)
print("true", truekl)
logr = p.log_prob(x) - q.log_prob(x)
k1 = -logr
k2 = logr ** 2 / 2
k3 = (logr.exp() - 1) - logr
for k in (k1, k2, k3):
    print((k.mean() - truekl) / truekl, k.std() / truekl)`

打印

>  Now let’s compare the bias and variance of the three estimators for KL[q,p]KL[*q*,*p*]. Suppose q=N(0,1)*q*=*N*(0,1), p=N(0.1,1)*p*=*N*(0.1,1). Here, the true KL is 0.005.

结果为如下，常规的KL有较大的方差

bias/truestdev/trueK1020K20.0021.42K301.42>  Now let’s try for a larger true KL divergence. p=N(1,1)*p*=*N*(1,1) gives us a true KL divergence of 0.5.

bias/truestdev/trueK102K20.251.73K301.7
#### 4.5 无KL版本的GRPO

[](https://zhuanlan.zhihu.com/p/25067791857)

 $$在`trl`[#2806](https://link.zhihu.com/?target=https%3A//github.com/huggingface/trl/pull/2806)里，@ingambe 大胆的提出要把GRPO里的KL项去掉，去掉ref-model，并且实验work了。可以快速验证就是把KL项的\beta 置为0\mathcal{L}_{\text{GRPO\_trl}}(\theta) = - \frac{1}{G} \sum_{i=1}^G \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left[  \frac{\pi_\theta(o_{i,t} \mid q, o_{i,\text{$$

我在[X-R1](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)上测试是可行的，对比有KL和无KL的版本，无KL竟然高了10个点左右

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0f59fb58796c.jpg)

#### 4.6 KL项分析

- 去除KL项, 意味着不需要ref-model, 减少一个模型的显存，减少一次前向ref_policy的计算。
- 没有KL的约束，那么可以将过大的梯度进行裁剪(max_grad_norm)，避免优化的不稳定性(这也是另一种层面的clip)。
- 没有KL的约束，参数的优化更加自由，更容易探索到好的回答

### 5. GRPO损失

#### 5.1 GRPO损失项分析

GRPO loss看起来复杂，实际上，仅包含三部分：

- 第一个连加的G 为一个样本的采样数量，第二个|o_i| 是第i条输出的采样长度
- 在\min(\cdot, \cdot) 里，与标准PPO差异不大，这里的advantage我们已经提前计算好了，在一条采样回答数据中对于不同的t 优势值都一样的。另外这里的ratio对比的是新旧策略。 这个式子是token-level的。
- KL项\beta因子控制约束力度，KL计算的是新策略和参考策略。
$$\mathcal{L}_{\text{GRPO}}(\theta) = - \frac{1}{G} \sum_{i=1}^G \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left[ \min \left( \frac{\pi_\theta(o_{i,t} \mid q, o_{i,$$

上述的优化目标是最小化，那么实际训练过程会产生

- 初始阶段Loss为0
- 训练过程Loss存在负值的情况
- 训练过程由于目标优化模型的策略会远离ref模型，还可能导致loss上升的趋势，那么进一步分析
[](https://zhuanlan.zhihu.com/p/28326620566)

#### 5.2 手撕GRPO

我从自己实现了全流程的GRPO里，摘选出关键的Loss函数，帮助大家理解算法，代码能对应原公式。

[](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/grpo-loss)

`def grpo_loss(pi_logprob, pi_old_logprob, pi_ref_logprob, advantage, input_len, len_oi):
    epsilon = 0.2
    beta = 0.01

    bs, seq_len = pi_logprob.shape
    # skip计算采样的每条采样长度
    len_oi = torch.tensor([len_oi] * group_num, dtype = torch.long)
    # 设定mask, 仅对response 为 1， 算loss
    mask = torch.zeros(bs, seq_len)
    mask[:, input_len:] = 1

    # GRPO loss
    ratio = torch.exp(pi_logprob - pi_old_logprob)
    ratio_clip = torch.clamp(ratio, 1 - epsilon, 1 + epsilon)
    advantage = advantage.unsqueeze(dim = 1) # [a, b ,c] -> [[a], [b], [c]]
    policy_gradient = torch.minimum(ratio * advantage , ratio_clip * advantage)
    kl = grpo_kl(pi_logprob, pi_ref_logprob)

    loss = (policy_gradient -  beta * kl) * mask
    loss = (-1 / group_num ) * (1/len_oi.unsqueeze(dim = 1)) * loss  
    loss = loss.sum()

    return loss`

调用输出

`# 输出分布
pi_logits = torch.randn(3, 5, 32) # batch, seq_len, vocab_size
pi_ref_logits = torch.randn(3, 5, 32)
pi_old_logits = torch.randn(3, 5, 32)

# 获取log prob
pi_logprob = F.log_softmax(pi_logits, dim = -1)
pi_ref_logprob = F.log_softmax(pi_ref_logits, dim = -1)
pi_old_logprob = F.log_softmax(pi_old_logits, dim = -1)

# group data
token_ids = torch.tensor([[11, 12, 13, 14, 15], # 输入为11,12,13, 输出为:14, 15
                          [11, 12, 13, 15, 16],
                          [11, 12, 13, 16, 17],])

# 获取policy
pi_logprob = torch.gather(pi_logprob, dim=-1, index=token_ids.unsqueeze(-1)).squeeze(-1)
pi_ref_logprob = torch.gather(pi_ref_logprob, dim=-1, index=token_ids.unsqueeze(-1)).squeeze(-1)
pi_old_logprob = torch.gather(pi_old_logprob, dim=-1, index=token_ids.unsqueeze(-1)).squeeze(-1)
loss = grpo_loss(pi_logprob, pi_old_logprob, pi_ref_logprob, A, 3, 2)
print(loss)`

输出

`tensor(0.0033)`

可见，GRPO仅需通过在线采样和规则奖励，就能进行RL训练。

#### 5.3 TRL GRPO算法实现

截止到 `Trl-0.15.0` GRPO当前未实现clip ratio, 如下所示:

$- 如果不clip，那么直接算新旧ratio， 这里的新旧ratio的 \pi_\theta 和 \pi_{\theta_\text{old}} 的参数是一样的。$
- 这里的新旧policy的 ratio 恒为 1
$$\mathcal{L}_{\text{GRPO}}(\theta) = - \frac{1}{G} \sum_{i=1}^G \frac{1}{|o_i|} \sum_{t=1}^{|o_i|} \left[ \min \left( \frac{\pi_\theta(o_{i,t} \mid q, o_{i,$$

我们先看trl的实现

`advantages = inputs["advantages"]
# x - x.detach() allows for preserving gradients from x 
# 这段代码能否计算出梯度？
per_token_loss = torch.exp(per_token_logps - per_token_logps.detach()) * advantages.unsqueeze(1)
per_token_loss = -(per_token_loss - self.beta * per_token_kl)
loss = ((per_token_loss * completion_mask).sum(dim=1) / completion_mask.sum(dim=1)).mean()`

首先模型得到的是`per_token_logps`, 这里概率是`logprob` 形式的, 工程上不容易溢出。

$$r=\frac{\pi_\theta}{\pi_{\theta_\text{old}}} = \exp{\log(\frac{\pi_\theta}{\pi_{\theta_\text{old}}})}=\exp(\log(\pi_\theta)-\log(\pi_{\theta_\text{old}}))=\exp(0)=1 $$

`# 以下恒为0
per_token_logps - per_token_logps.detach() == 0

# torch.exp(0) == 1 恒为 1
ratio = torch.exp(per_token_logps - per_token_logps.detach())

# 等价于
per_token_prob = torch.exp(per_token_logps)
per_token_prob_old = torch.exp(per_token_logps.detach())
ratio = per_token_prob / per_token_prob_old`

 这里我们来分析关键代码`x-x.detach()`，是否无法更新梯度。 

- 前向时：ratio恒为1， 那么前向如果advantage不为0，那么 `ratio*advantage` 不为0
- 反向时：由于 `per_token_prob_old` 已经detach，那么如果有梯度的话，我们可以参考[GitHub - dhcode-cpp/grpo-loss](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/grpo-loss) ， 可以计算出`per_token_logps` 是有梯度的。 
`policy = torch.tensor([0.5])
old_policy = torch.tensor([0.5])
ratio = policy/old_policy
print(ratio)

ratio = torch.exp( policy.log() - old_policy.log())
print(ratio)

gradient = -0.2 # 假设反传误差
policy_gradient = - gradient * ( 1 / old_policy)
print(policy_gradient)`

那么我们可以看见，在x-x.detach()是能正常计算梯度的。但是相当于new-policy只更新一次。

总的来说，标准的写法是在：

$- t=1 时刻，根据 \theta_{t=1} 获取old policy和new policy， 这两者ratio为1， 参数更新 \theta_{t=2} $
$- t=2 时刻，获取 \theta_{t=2} 获取new policy， 这两者ratio可能不为1, ... 以此类推$
而TRL的实现在t=1更新完梯度，就完成了当前批次的参数优化。

总结：Trl简化了GRPO的loss计算，但是仍然能work， 我们在[X-R1](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)实验中，用这一套方法也能训练并且训出效果。

#### 5.4 GRPO算法分析

我们分析GRPO的流程：

- 模型在线采样时，实际上是生成CoT用于推断最终的答案
- GRPO则通过规则反馈，引导模型参数调整
两者经过不断的迭代，能够产生越来越强的CoT，或者说是更长的Long-CoT

我们回到问题part2遗留问题：

- 生成的解答过程是对的，但是答案错误，即`$\boxed{}$`
- 生成的解答过程是错的，但是答案正确,  即`$\boxed{}$`
Q1: 上述采样1判别是否合理？

A： 合理，在规则奖励的设计就是辨别最终答案与标签的一致性。解答过程不参与规则奖励的判别

Q2: 采样2的解答过程是否会随着RL训练，采样的解答过程越来越严谨？

A：采样2的解答最终答案正确，错误的推断初期虽然会被强化，随着RL训练模型权重调整，CoT的推理的模式就会越来越严谨。但是初期可能会造成非常大的不稳定性。

### 6. 总结

- 当前的数学推理问题形式，可以端到端的进行学习中间的reasoning能力，即通过RL调整模型参数，生成高质量的CoT，从而能够推导出最终正确的答案。
- 在采样时，如果一个问题难以采样到正确的答案，由于没有正反馈，将导致难以有效优化，初期RL可能存在训练缓慢和不稳定问题。
- 早期有ReMax和RLOO等方法均有相似去除value-model的思想，GRPO虽然减少Reward Model，但在线采样仍然考验系统效率。
- 我们按照数学的问题形式，可以思考在垂直领域中，收集问题和答案，也可以无脑的做RL，也就是Reinforcement Fine-Tune(ReFT)

#### 7. 手撕GRPO & R1-Zero复现

本文涉及到的GRPO-loss代码开源⬇️

[](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/grpo-loss)

在彻底理解GRPO算法后，我们可以通过以下仓库，进行R1-Zero复现能够出现

[](https://zhuanlan.zhihu.com/p/23301339895)

[](https://link.zhihu.com/?target=https%3A//github.com/dhcode-cpp/X-R1)

### 拓展阅读

### Reference

DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models

DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning

Back to Basics: Revisiting REINFORCE Style Optimization for Learning from Human Feedback in LLMs

ReMax: A Simple, Effective, and Efficient Reinforcement Learning Method for Aligning Large Language Models

Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

John Schulman：Approximating KL Divergence

OpenAI's Reinforcement Fine-Tuning Research Program

git: huggingface/open-r1

git: openai/simple-evals

*《手撕RLHF》*** 解析如何系统的来做LLM对齐工程

[小冬瓜AIGC：GRPO的Loss为什么会有负值？](https://zhuanlan.zhihu.com/p/28326620566) 🔥

[小冬瓜AIGC：GRPO简化Tricks, 性能暴涨10%, 只改一个参数?](https://zhuanlan.zhihu.com/p/25067791857) 🔥

[小冬瓜AIGC：再深挖DeepSeek-R1: Reward is Enough](https://zhuanlan.zhihu.com/p/20053834500) 🔥

[小冬瓜AIGC：【解读】DeepSeek-R1：RL前真的不需要SFT了吗???](https://zhuanlan.zhihu.com/p/19623772462) 🔥

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

[小冬瓜AIGC: 【手撕LLM-Generation】Top-K+重复性惩罚](https://zhuanlan.zhihu.com/p/667025336)

[小冬瓜AIGC：【手撕LLM-KVCache】显存刺客的前世今生--文末含代码](https://zhuanlan.zhihu.com/p/667763542)

> 我是小冬瓜AIGC，原创超长文知识分享，原创课程已帮助多名同学速成上岸LLM赛道。
研究方向：LLM、RL、RLHF
