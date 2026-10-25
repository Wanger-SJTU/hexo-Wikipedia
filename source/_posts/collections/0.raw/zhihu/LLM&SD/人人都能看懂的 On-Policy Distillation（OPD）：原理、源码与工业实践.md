---
title: "人人都能看懂的 On-Policy Distillation（OPD）：原理、源码与工业实践"
date: 2026-05-18
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2039659658575656354

---

人人都能看懂的 On-Policy Distillation（OPD）：原理、源码与工业实践
大家好，DeepSeek V4 的技术报告放出来，看完之后我最大的感受不是它把 context 拉到了 1M、也不是它的 1.6T MoE 架构有多花哨，而是 post-training 那一段的设计——**V3.2 时代那一整套 mix RL pipeline，被 V4 几乎整个换成了 OPD（On-Policy Distillation）**。

具体做法是：先在 math、code、agent、instruction following 等 10 多个 domain 上各自独立训练一个 specialist 模型（每个都是 SFT + GRPO 单独跑出来的），然后用 multi-teacher OPD 把这 10 多个专家的能力**蒸馏回一个统一的 student 模型**——并且这次 DeepSeek 用的还不是工业默认的 sampled-token，而是直接上了 **full-vocabulary OPD + reverse KL**。这种做法和传统的&#34;一次性大 mix RL&#34;路线在工程哲学上是反过来的。

实际上 OPD 这个方向并不是 V4 才开始火。早在 2025 年 10 月，Thinking Machines Lab 就发过一篇科普帖把这套思路推到了大众视野；之后 Qwen3 的 Technical Report Table 21 给出了「OPD 用 1/10 算力打平 RL」的对比；再后来今年的 MiMo-V2-Flash、GLM-5 也都把它写进了 post-training 的关键阶段。但直到 DeepSeek V4 这一波，OPD 才真正从「替代 RL 的一种 trick」升格为「主流玩家敢押注的 post-training 主菜」。

所以我打算趁这个时机，把 OPD 这个东西从头到尾啃一遍。我把过去两个月相关的几篇 paper（`Rethinking On-Policy Distillation`、`Uni-OPD`、`Learning to Foresee` 以及 Agarwal 那篇 GKD 老前辈）翻了一遍，又把清华开源的 `thunlp/OPD` 训练框架的源码扒了一通，整理出下面这些问题：

- OPD 到底是 RL 还是 SFT？loss 长什么样？
- 它和 GKD、MiniLLM 这些 2023 年的旧方法到底有什么区别？
- Sampled-Token / Top-k / Full-Vocab 三种实现方式，区别在哪？为什么 DeepSeek V4 偏要选最贵的 full-vocab？
- 它显存吃多少？算力吃多少？teacher 要不要做 decode？
- 工业界为什么突然集体跑步入场？【❤️ 如果觉得本文有帮助，欢迎点赞、在看、转发 ～】

整体内容如下：

【一、为什么我们需要 OPD：从 SFT 和 RL 的两个原罪谈起】 1.1 先复习两种 post-training 范式的差别 1.2 SFT 的原罪：分布偏移 + 学到一身大师腔 1.3 RL 的原罪：奖励太稀，token 算账靠瞎猜 1.4 OPD 的全新交易：on-policy 的轨迹 + dense 的反馈

【二、OPD 的数学骨架】 2.1 一句话定义 OPD 2.2 KL 散度的两个方向：Forward KL vs Reverse KL 2.3 词表选择：Sampled-Token / Top-k / Full-Vocab，到底用哪个？

【三、源码级解读：OPD 一步步是怎么算出来的】 3.1 整体训练 loop：verl 是怎么&#34;复用 RL&#34;做 OPD 的 3.2 Teacher 只做一次 prefill，不做 decode 3.3 reward 怎么算：`rm_scores = -kl_val * weights` 3.4 advantage 怎么算：直接令 `advantage = reward` 3.5 actor loss 怎么算：复用 PPO 的 importance sampling

【四、工业实践：五家技术报告里的 OPD 怎么用】 4.1 DeepSeek-V4：直接把 mix RL 的位置交给 OPD（最新最重的一次押注） 4.2 Qwen3：那张让所有人重新审视 OPD 的对比表 4.3 MiMo-V2-Flash：Multi-Teacher OPD（MOPD） 4.4 GLM-5：on-policy 跨阶段蒸馏，专治&#34;能力衰退&#34; 4.5 Thinking Machines Lab：把 OPD 推到大众视野的那篇博客

【五、OPD 的四篇相关论文：从 2023 年的源头到 2026 年的最新进展】 5.1 GKD（Agarwal et al., ICLR 2024）：OPD 范式的&#34;源头活水&#34; 5.2 Rethinking OPD（2026.04，清华）：系统盘点失败模式 + 两条简单可操作的 Recipe 5.3 Uni-OPD（2026.05，腾讯 × 浙大）：Dual-Perspective 救赎&#34;学生探索不足 + teacher 反着给信号&#34; 5.4 Learning to Foresee（2026.05，中科大 × 腾讯）：用参数动力学解释 OPD 的&#34;预见性&#34;，顺手提速 3×

【六、全文小结】 【七、参考文献与系列导航】

一、为什么我们需要 OPD：从 SFT 和 RL 的两个原罪谈起

1.1 先复习两种 post-training 范式的差别
在正式聊 OPD 之前，我们先把&#34;训学生模型&#34;的两种基本范式过一遍。这一节没啥新东西，纯粹为了帮大家把符号和概念对齐，**有 RL 基础的朋友可以直接跳到 1.4**。

post-training（也就是把一个会说人话的预训练模型，进一步训练成一个会做题、会聊天、会调用工具的&#34;专家&#34;）大致可以分成两条主路：

- **off-policy training**：训练数据来自&#34;别人&#34;——可能是人类标注，可能是更强的 teacher 模型生成的轨迹。学生只负责&#34;模仿&#34;。最典型的代表就是 SFT（supervised fine-tuning），以及它的近亲 off-policy distillation。
- **on-policy training**：训练数据来自学生模型自己——也就是说，学生**先自己跑出来一条 response**，再由某个外部信号告诉它&#34;你这条跑得好不好&#34;。最典型的代表就是 RLHF/RLAIF/RLVR 这一系列以 PPO、GRPO 等算法为骨架的方案。我们用一张表把它们的关键差别画出来（这张表我直接借用 Thinking Machines Lab 那篇博客里的，因为它精炼得太好了）：

方法Sampling 来源Reward 信号Supervised fine-tuning (SFT)off-policydense（每个 token 都有 label）Reinforcement learning (RL)on-policysparse（一条 response 才一个分数）On-Policy Distillation (OPD)on-policydense是不是看完这张表，OPD 的&#34;心动指数&#34;瞬间就上去了？on-policy 又 dense，简直是把 SFT 的&#34;信息量大&#34;和 RL 的&#34;轨迹真实&#34;两个优点抢过来揉在一起。但凡有点工业开发经验的人，看到这张表第一反应一定是——**这么完美的东西，它一定有代价。代价是什么？**

我们先不急着回答这个问题，先来复习一下 SFT 和 RL 各自的原罪，这样后面看 OPD 的时候才会有&#34;原来如此&#34;的快感。

1.2 SFT 的原罪：分布偏移 + 学到一身大师腔
SFT 大家都熟，不用多讲。它的训练流程极其简单：拿一批 `(prompt, response)`，把 response 当成标准答案，做一次极大似然估计（teacher-forcing 方式），就完了。

但 SFT 有两个非常严重的问题，**第一个问题是分布偏移（distribution shift）**：

 在训练时，每一步的输入 `(prompt, response_<t)` 都是来自 teacher 的真实轨迹；但在推理时，每一步的输入 `(prompt, response_<t)` 是来自学生**自己生成**的轨迹。
 也就是说，**学生在训练阶段从来没见过自己会犯什么错，所以它也不知道犯了错该怎么自救**。一旦推理时它在第 5 个 token 上踩了一个 teacher 永远不会犯的坑，剩下的 token 就全在 teacher 没见过的状态里&#34;自由发挥&#34;了，错误会一路滚雪球。

这个问题在长序列（比如 reasoning 类任务）上特别要命，CV 圈搞过 imitation learning 的朋友肯定一秒就反应过来——这就是经典的 **compounding error**，也就是 [DAGGER](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1011.0686)（Ross et al., 2010）那篇老论文要解决的问题。

**第二个问题更微妙：学生学到了 teacher 的&#34;风格&#34;和&#34;自信&#34;，但没学到 teacher 的&#34;事实正确性&#34;。**

这一点 [Gudibande et al., 2023](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.15717) 那篇 The False Promise of Imitating Proprietary LLMs 已经实证过了。直觉上你也很容易理解：teacher 之所以能输出一段好的 response，背后是它的**整套世界知识 + 推理能力**在支撑；而 SFT 学生只看到那串 token 序列，它能模仿的只是&#34;长得像&#34;的部分。

举个不那么严谨但很形象的类比：

 这就好比一个新手棋手在反复观看大师的对局录像，棋谱看了上千张，确实能背出大师在每一种局面下的下法。但**真到他自己下棋的时候，对手摆出的局面往往是大师从来不会陷入的**——比如开局莫名其妙被偷一个兵——这时新手脑子里没有任何录像可以参考，只能瞎下。这就是 SFT 学生的真实处境。
 
1.3 RL 的原罪：奖励太稀，token 算账靠瞎猜
聊完 SFT，我们来看 RL（这里我们就用 PPO 系作为代表，DPO 这种 off-policy 的不在本节讨论范围）。

RL 解决了 SFT 的第一个问题（分布偏移）：**因为它的训练数据就是学生自己跑出来的**。所以在训练时学生看到的状态分布，和它推理时看到的状态分布是同一个。这一点极其重要，是 PPO 等方法之所以能纠正&#34;复合错误&#34;的根本原因。

但 RL 引入了一个新的、同样致命的问题——**奖励信号太稀疏（sparse reward）**。

我们看一个最常见的例子。假设我们要让模型解一道奥数题，学生跑了一条长达 5000 个 token 的 reasoning 链，最后给出了答案 &#34;21&#34;。我们用一个验证器（或人类，或 teacher）告诉学生：

 &#34;你这条 response 的答案不对，reward = 0。&#34;
 这一句话作为 reward，对应的信息量大概只有 1 个 bit（对/不对）。然后这 1 个 bit 的反馈，要被均摊回 5000 个 token 上去做 credit assignment。直觉上你也能想象，这种&#34;算账&#34;非常含糊：**学生只知道自己输了，但不知道是中盘的哪一步走错了，是 step 17 算错了，还是 step 235 推理跳跃太大，亦或是 step 4823 加减号写反了**。

这就是 RL 的原罪。它在每条轨迹上能给出的 supervision 是 O(1) 的（哪怕你的 reward model 设计得再花哨，本质上每条轨迹也只能给出几个标量），但 token 数是 O(T) 的。Thinking Machines Lab 在博客里把这个特点讲得很形象：

 RL provides very sparse feedback, teaching a fixed number of bits per training episode regardless of the number of tokens used.
 我们再回到学下棋的类比上来：

 RL 的训练方式相当于，你和别人下了一整盘棋，下完之后只有一个结果——赢或者输。**没有任何人告诉你哪几步走得好，哪几步是昏招**。你只能凭&#34;我赢了&#34;或&#34;我输了&#34;这一个信号，自己琢磨这盘棋的得失。
 这种学习方式当然有用，但效率确实拉胯。OpenAI o-系列、DeepSeek-R1 这些靠 RL 起家的推理模型，背后都是吃了**几十万到几百万**条 prompt 的 rollout 才把模型练出来的。算力账单是天文数字。

1.4 OPD 的全新交易：on-policy 的轨迹 + dense 的反馈
现在我们终于可以聊 OPD 了。

OPD 的核心 idea 极其朴素，几乎可以一句话讲完：

**让学生自己跑一条 response（on-policy 拿到轨迹），然后用一个 teacher 模型，去逐 token 地给这条 response 打分（dense 的反馈）。**
 继续用下棋的类比：OPD 相当于，你和别人下了一整盘棋之后，找了一个特级大师**逐步给你做复盘**——这一步是&#34;妙手&#34;（蓝色），这一步是&#34;小失误&#34;（黄色），这一步是&#34;大昏招&#34;（红色）。每一步的反馈都是密集的、定向的、有 actionable insight 的。

![](https://pic4.zhimg.com/v2-4d97a068554ee9b334856570c6722455_r.jpg)hoz1ybThinking Machines Lab 那篇博客里贴了一张 [http://chess.com](https://link.zhihu.com/?target=http%3A//chess.com) 的复盘截图，几乎是我能想到的对 OPD 最贴切的可视化：每个 move 都被打上了从&#34;blunder&#34;到&#34;brilliant&#34;的标签。**OPD 干的事情，就是把这种 [http://chess.com](https://link.zhihu.com/?target=http%3A//chess.com) 风格的复盘，引入到 LLM 的 post-training 里**。

那么问题来了：

- **谁来打分**？答：另一个更强的 teacher 模型。
- **打分的依据**？答：teacher 在这个位置上认为&#34;应该&#34;输出什么，和学生实际输出的，二者的概率分布差异。差异越大，扣分越多。
- **怎么定义差异**？答：KL 散度。到这里你可能已经隐隐觉得有点眼熟了——把 reward 定义成 KL 散度？这不就是 PPO 里那个 KL penalty 的拓展吗？

**对的。OPD 的精髓就是：把 KL 散度从一个&#34;配菜性质的正则项&#34;提升为&#34;主菜性质的 reward 信号&#34;，并且让它逐 token 地稠密生效。**

后面我们会看到，这种设计带来一个非常工业化的好处：**整个 OPD 的训练 pipeline 可以几乎&#34;无侵入式&#34;地复用现有的 PPO/GRPO 训练框架**——你只需要把&#34;reward model&#34;换成&#34;teacher model&#34;，把 reward 的计算方式从&#34;标量奖励&#34;改成&#34;-KL&#34;，其他基本不动。这也是为什么我们看 `thunlp/OPD` 这个开源仓库时，会发现它就是个魔改过的 verl（一个 RL 训练框架）——核心改动也就那几百行。

好，到这一步为止，我们已经把 OPD 出现的&#34;动机&#34;讲清楚了。**一句话总结**：OPD = 学生自己 rollout（继承 RL 的 on-policy）+ teacher 在每个 token 上打分（继承 SFT 的 dense supervision）。它的存在意义就是把 SFT 和 RL 的优点缝合起来，规避两者的原罪。

接下来我们就该深入到数学骨架里去了。

二、OPD 的数学骨架

2.1 一句话定义 OPD
为了避免歧义，我们先把符号定义清楚（这套符号在全文都用，绝不中途换）：

- 
![](https://www.zhihu.com/equation?tex=%5Cpi_%5Ctheta)：student 模型（待训练，参数 
![](https://www.zhihu.com/equation?tex=%5Ctheta)）。
- 
![](https://www.zhihu.com/equation?tex=%5Cpi_T)：teacher 模型（参数冻结）。
- 
![](https://www.zhihu.com/equation?tex=x+%5Csim+%5Cmathcal%7BD%7D)：来自训练集的 prompt。
- 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D+%3D+%28%5Chat%7By%7D_1%2C+%5Cdots%2C+%5Chat%7By%7D_T%29+%5Csim+%5Cpi_%5Ctheta%28%5Ccdot+%5Cmid+x%29)：student 对 prompt 
![](https://www.zhihu.com/equation?tex=x) 自回归采样出的一条完整 response。注意这里 
![](https://www.zhihu.com/equation?tex=T) 是序列长度。
- 
![](https://www.zhihu.com/equation?tex=p_t%28v%29+%5Ctriangleq+%5Cpi_%5Ctheta%28v+%5Cmid+x%2C+%5Chat%7By%7D_%7B%3Ct%7D%29+)：student 在第 
![](https://www.zhihu.com/equation?tex=t) 个位置上对词表中 token 
![](https://www.zhihu.com/equation?tex=v) 的预测概率分布。
- 
![](https://www.zhihu.com/equation?tex=q_t%28v%29+%5Ctriangleq+%5Cpi_T%28v+%5Cmid+x%2C+%5Chat%7By%7D_%7B%3Ct%7D%29+)：teacher 在**同一个位置、同一个 prefix** 下对 token 
![](https://www.zhihu.com/equation?tex=v) 的预测概率分布。
- 
![](https://www.zhihu.com/equation?tex=V+%3D+%7C%5Cmathcal%7BV%7D%7C)：词表大小（论文里有时记作 
![](https://www.zhihu.com/equation?tex=M)，本文统一用 
![](https://www.zhihu.com/equation?tex=V)）。
- 
![](https://www.zhihu.com/equation?tex=B)：batch size。上面这些定义里，**有一个细节非常关键，请你停 5 秒钟读三遍**：

 teacher 算的是&#34;在 student 自己生成的 prefix 上&#34;的下一个 token 分布。也就是说，**teacher 永远是在评判一个由 student 决定的状态**，而不是在自由生成。
 理解了这一点，OPD 整个训练流程就剩三步：

- **Rollout（贵的一步）**：student 拿到 prompt 
![](https://www.zhihu.com/equation?tex=x)，自回归生成完整的 response 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D)。
- **Score（便宜的一步）**：teacher 拿到 
![](https://www.zhihu.com/equation?tex=%28x%2C+%5Chat%7By%7D%29)，做**一次** forward pass（也就是一次 prefill），就能并行地拿到所有 
![](https://www.zhihu.com/equation?tex=t) 位置上的 
![](https://www.zhihu.com/equation?tex=q_t%28%5Ccdot%29)。
- **Update**：用 
![](https://www.zhihu.com/equation?tex=p_t) 和 
![](https://www.zhihu.com/equation?tex=q_t) 之间的 KL 散度构造 token-level reward，反传更新 student。第 3 步是这篇文章后面的全部主菜。我们接下来就一节节啃。

2.2 KL 散度的两个方向：Forward KL vs Reverse KL
KL 散度大家应该都熟，但它是一个**有方向**的距离度量，方向选错，行为就会完全不一样。

我们先把两种方向的式子写清楚：

**Forward KL**（从 teacher 到 student）：

![](https://www.zhihu.com/equation?tex=D_%7B%5Ctext%7BKL%7D%7D%28q_t+%5C%2C%5C%7C%5C%2C+p_t%29+%3D+%5Cmathbb%7BE%7D_%7Bv+%5Csim+q_t%7D%5Cleft%5B%5Clog+%5Cfrac%7Bq_t%28v%29%7D%7Bp_t%28v%29%7D%5Cright%5D+%3D+%5Csum_%7Bv+%5Cin+%5Cmathcal%7BV%7D%7D+q_t%28v%29+%5Clog+%5Cfrac%7Bq_t%28v%29%7D%7Bp_t%28v%29%7D+%5C%5C)

**Reverse KL**（从 student 到 teacher）：

![](https://www.zhihu.com/equation?tex=D_%7B%5Ctext%7BKL%7D%7D%28p_t+%5C%2C%5C%7C%5C%2C+q_t%29+%3D+%5Cmathbb%7BE%7D_%7Bv+%5Csim+p_t%7D%5Cleft%5B%5Clog+%5Cfrac%7Bp_t%28v%29%7D%7Bq_t%28v%29%7D%5Cright%5D+%3D+%5Csum_%7Bv+%5Cin+%5Cmathcal%7BV%7D%7D+p_t%28v%29+%5Clog+%5Cfrac%7Bp_t%28v%29%7D%7Bq_t%28v%29%7D+%5C%5C)

我相信你现在已经看出来了：两个式子最大的差别在于，**期望是在哪个分布下取的**。这一点决定了它们的&#34;性格&#34;完全不同。

![](https://pic3.zhimg.com/v2-37fe9242eccc0566c657866da8ebb08e_r.jpg)kBn01C**先看 Forward KL，它的性格叫 Mean Seeking（找均值）**：

它要求 student 的分布 
![](https://www.zhihu.com/equation?tex=p_t) 尽量&#34;覆盖&#34; teacher 分布 
![](https://www.zhihu.com/equation?tex=q_t) 中所有非零的位置。原因是：只要某个 
![](https://www.zhihu.com/equation?tex=v) 满足 
![](https://www.zhihu.com/equation?tex=q_t%28v%29+%3E+0) 而 
![](https://www.zhihu.com/equation?tex=p_t%28v%29+%5Capprox+0)，那 
![](https://www.zhihu.com/equation?tex=%5Clog%28q_t+%2F+p_t%29) 就会爆炸成一个超大正数，loss 直接起飞。所以 Forward KL 的 student **不敢&#34;漏掉&#34;任何一种 teacher 可能采纳的回答**，结果就是它会把概率&#34;均匀&#34;地涂在 teacher 出现过的所有 mode 上——哪怕这些 mode 互相矛盾。

谨慎的你可能此时想问：那这有什么不好？student 多吸收点知识不是好事吗？

不好。不好就在于，**LLM 的输出空间是离散的、模式之间互斥的**。你让一个 student 在&#34;用文言文回答&#34;&#34;用英文回答&#34;&#34;用代码回答&#34;这三个 teacher 出现过的 mode 之间均摊概率，结果就是你跑出来的回答在三种风格之间来回横跳，**输出质量降到地板**。

**再看 Reverse KL，它的性格叫 Mode Seeking（找众数）**：

期望是在 student 自己的分布 
![](https://www.zhihu.com/equation?tex=p_t) 下取的，所以**只要 student 自己不去采那个 token，teacher 在那个 token 上有多大概率根本不重要**。反过来，只要 student 把概率压在某个 token 上，那 teacher 在那个 token 上的概率最好别太低，否则 
![](https://www.zhihu.com/equation?tex=%5Clog%28p_t+%2F+q_t%29) 就要起飞了。

直觉上看，Reverse KL 鼓励 student **挑一个 teacher 也认可的 mode，然后 all-in 进去**。这正是 LLM 后训练梦寐以求的效果——别贪心，挑一种最好的回答方式，然后稳定地输出。

**一句话总结**：Forward KL 让你&#34;什么都学一点（mean seeking）&#34;，结果学得稀里糊涂；Reverse KL 让你&#34;挑一种学到精（mode seeking）&#34;，结果输出干脆利落。**所以 OPD 的工业默认选择，几乎一边倒地用 Reverse KL**。

不过 Reverse KL 还有一个非常工业化的好处，几乎被所有 OPD 实现选中：

 因为它的期望是在 
![](https://www.zhihu.com/equation?tex=p_t) 下取的，所以可以用 student 自己采的那一个 token 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D_t) 直接做无偏的 Monte Carlo 估计：
 
![](https://www.zhihu.com/equation?tex=%5Cwidehat%7BD_%7B%5Ctext%7BKL%7D%7D%7D%28p_t+%5C%7C+q_t%29+%5Capprox+%5Clog+p_t%28%5Chat%7By%7D_t%29+-+%5Clog+q_t%28%5Chat%7By%7D_t%29+%5C%5C)

也就是说，**Reverse KL 不需要你对整个词表求和，只需要 gather 出 student 实际生成的那一个 token 的 log-prob 就行**。这正是下一节要讲的 Sampled-Token OPD 的合理性来源。Forward KL 因为期望在 
![](https://www.zhihu.com/equation?tex=q_t) 下，用 student 采的样本就不再无偏了，所以工业实现里**很难做出&#34;sampled-token 版&#34;的 forward KL**——这一点后面我们会再回过头来强调。

2.3 词表选择：Sampled-Token / Top-k / Full-Vocab，到底用哪个？
确定了用 Reverse KL 之后，我们还要面对一个非常工程化的决策：**算 KL 的时候，要不要把整个词表 
![](https://www.zhihu.com/equation?tex=V) 都拿来求和？**

直觉上，词表越大、参与计算的 token 越多，KL 估计就越准。但 V 通常是 100k 量级（Qwen3 的词表是 151936），把整个词表都拉进 loss 计算意味着显存会爆炸。所以业界根据&#34;取多少 token 进入 KL 求和&#34;，演化出了三种 OPD 变体：

- **Sampled-Token OPD**：只用 student 实际采到的那一个 token 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D_t) 做 Monte Carlo 估计。每个位置只看 1 个 token。
- **Top-k OPD**：从 student 或 teacher 的分布中挑 top-k 个 token 进入 KL 求和。每个位置看 k 个 token。
- **Full-Vocabulary OPD**：把整个词表都拿来求 KL 求和。每个位置看 
![](https://www.zhihu.com/equation?tex=V) 个 token。直觉上你可能觉得&#34;算的 token 越多越准&#34;，所以应该上 Full。但**实际工业默认却是 Sampled-Token**。这背后的取舍很有意思，我们一项一项拆开来看。

2.3.1 三者计算量 / 显存对比
我们先搞清楚一个最容易被搞混的点：

 不论你选哪种变体，**teacher 都只需要对 student 的完整 response 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D) 做一次 forward pass（即 prefill）**，就能得到一个 shape 为 `[B, T, V]` 的 logits 张量，从中可以拿到所有位置 
![](https://www.zhihu.com/equation?tex=t) 的完整 teacher 分布 
![](https://www.zhihu.com/equation?tex=q_t%28%5Ccdot%29)。
 teacher 不需要做 decode（autoregressive 生成），因为 prefix $\hat{y}_{ 

所以三种变体在**前向计算量**（teacher forward 的 FLOPs）上完全一样。差别在于：拿到这个 `[B, T, V]` 张量之后，loss 计算阶段对它的处理方式不同。

变体Teacher 前向 FLOPsLoss 计算 FLOPsLoss 计算显存Sampled-Token一次 prefillO(BT)（gather 即可）O(BT)Top-k一次 prefillO(BTk)O(BTk)Full-Vocab一次 prefillO(BTV)O(BTV)显存压力一目了然：**Full-Vocab 比 Sampled-Token 多消耗大约 
![](https://www.zhihu.com/equation?tex=V) 倍的显存**——以 Qwen3 那种 V≈150k 的词表，这是**五个数量级**的差距。在 8×80G 的 A100 集群上，Full-Vocab 经常一上来就 OOM。

严格来说&#34;计算量完全一样&#34;略有出入：teacher 的 transformer forward FLOPs 三者一样，但 loss 部分 Full-Vocab 还要做 
![](https://www.zhihu.com/equation?tex=O%28BTV%29) 的 element-wise 运算（reduce sum、log、subtract）。不过相对于 transformer forward 的 FLOPs，这部分通常被 forward 的开销主导，所以**实际墙钟时间的差别主要来自显存而不是算力**。

2.3.2 Sampled-Token OPD 真的够用吗？
读到这里你肯定有一个疑问：

**Sampled-Token OPD 一个 token 就能估出来？这未免也太省了，会不会损失精度？**
 `Rethinking On-Policy Distillation` 这篇论文（也就是 `thunlp/OPD` 仓库背后的论文）在 §6.3 给了一组实证：

 Sampled-Token OPD 的最终性能跟 Top-k OPD（k≥4）几乎一样，只有 Top-1（也就是 argmax 采样、有偏估计）会明显变差。
 也就是说，**只要你不退化到 Top-1，Sampled-Token 在显存最省的同时几乎不损失最终效果**。这是个非常香的结论，也是 Qwen3、MiMo-V2-Flash、Tinker（Thinking Machines Lab 自家训练框架）等大多数工业实现的默认选择。

但凡事都有反例。**DeepSeek V4 这次就头铁地用了 Full-Vocabulary OPD**——也就是 
![](https://www.zhihu.com/equation?tex=V+%5Capprox+130k) 量级的全词表逐 token 求和。这个选择我们在第四节展开聊，目前你只需要知道：他们这么选不是因为不知道 sampled-token 更省，而是因为 multi-teacher consolidation 的特殊场景下需要把多个 teacher 的完整分布对齐起来——sampled-token 的 Monte Carlo 估计在多 teacher 场景下方差会被放大，而 full-vocab 能给出&#34;一锤定音&#34;的精确 KL，省心。代价就是显存——不过对于 1.6T MoE 这种规模的训练集群来说，反正显存也不缺，不如把估计量做精。

2.3.3 一个容易踩坑的事实：Forward KL 没有&#34;sampled-token 版&#34;
我在 2.2 节最后埋了一个伏笔，这里展开。

Forward KL 的期望是在 
![](https://www.zhihu.com/equation?tex=q_t)（teacher 分布）下取的：

![](https://www.zhihu.com/equation?tex=D_%7B%5Ctext%7BKL%7D%7D%28q_t+%5C%7C+p_t%29+%3D+%5Csum_v+q_t%28v%29+%5Clog+%5Cfrac%7Bq_t%28v%29%7D%7Bp_t%28v%29%7D+%5C%5C)

如果你想用 Monte Carlo 估计这个期望，**你需要从 
![](https://www.zhihu.com/equation?tex=q_t) 里采样**——也就是说，你需要让 teacher 自己采一个 token 来做 estimator。但 OPD 的整套设计是 student 来跑 rollout、teacher 不做 decode，**你压根没有 teacher 采的 token**。

所以你只能强行用 student 采的 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D_t) 来代替（off-policy），但这是有偏的，估出来的不是真正的 forward KL。**结果就是 forward KL 很难做出真正合理的 sampled-token 版**，工业上一般只能做 full-vocab 或 top-k。

也就是说，KL 方向的选择和词表选择是耦合的：

- 想做 sampled-token？只能选 reverse KL。
- 想做 forward KL？只能选 top-k 或 full-vocab。好，到这一步为止，OPD 的数学框架就基本理清楚了。**总结一下到目前为止我们的设计选择**：

- KL 方向：主流用 reverse KL（mode seeking + 支持 sampled-token）。
- 词表选择：**single-teacher 场景下默认 sampled-token**（显存最省 + 实证不掉点，Qwen3 / MiMo / Tinker 都是这么做的）；**multi-teacher consolidation 场景下倾向 full-vocab**（DeepSeek V4 走的就是这条路）。
- teacher 行为：只做一次 prefill，不做 decode（成本压到很低）。接下来我们就要把这些抽象的设计落实到代码里了。

三、源码级解读：OPD 一步步是怎么算出来的
这一节我们以清华开源的 `thunlp/OPD` 仓库为蓝本，把 OPD 在工业框架里到底是怎么跑的，从源码层面捋一遍。这个仓库底层用的是 [verl](https://link.zhihu.com/?target=https%3A//github.com/volcengine/verl)（字节开源的 RL 训练框架），所以你能看到 OPD 在工程上其实是**对 PPO/GRPO 的一次极小改动**。

先放一段它的训练入口脚本（`on_policy_distillation.sh`）的核心部分：

export ADV_ESTIMATOR=token_reward_direct       # OPD 的关键 advantage estimator
export N_RESPONSES=4                           # 每条 prompt 跑 4 条 rollout
export LOG_PROB_TOP_K=16                       # Top-k OPD 的 k；设为 0 就退化成 Sampled-Token
export TOP_K_STRATEGY=&#34;only_stu&#34;               # top-k 集合从 student 还是 teacher 选
export REWARD_WEIGHT_MODE=&#34;student_p&#34;          # token 间的加权方式
export ACTOR_MODEL_PATH=model/DeepSeek-R1-Distill-Qwen-1.5B   # student
export REWARD_MODEL_PATH=model/JustRL-DeepSeek-1.5B           # teacher（注意：这里它复用了 reward_model 的位置）

光从这几行配置我们就能看出几个关键事实：

- **teacher 模型是塞在 `reward_model` 这个槽位里的**——这就是&#34;复用 RL pipeline&#34;的工程意义：原本 RL 里塞 reward model 的位置，OPD 直接把 teacher 塞进来。
- **整套训练脚本是 GRPO 风格**（每条 prompt 跑 N 条 rollout）。
- `LOG_PROB_TOP_K=0` 时退化为 Sampled-Token OPD，这一点和我们 2.3 节的结论完全对应。接下来我们沿着训练 loop 一步步看代码。

3.1 整体训练 loop：verl 是怎么&#34;复用 RL&#34;做 OPD 的
verl 的训练主循环（`verl/trainer/ppo/ray_trainer.py`）是标准的 RL fit loop。OPD 在这个 loop 里只改了 reward 计算的那一段：

# verl/trainer/ppo/ray_trainer.py（节选，伪代码化以便阅读）
for batch in dataloader:
    # 第一步：student rollout，拿到 on-policy 轨迹
    batch = self.actor_rollout_wg.generate_sequences(batch)

    # 第二步：student 自己再 forward 一遍 response，记录 log_prob
    # （这一步顺便记录 student 的 top-k ids，留给 teacher 后面用）
    batch = self.actor_rollout_wg.compute_log_prob(batch)

    # 第三步：teacher 一次 forward，算出 reverse KL，组装成 token-level reward
    teacher_data = self.rm_wg.compute_rm_score(batch)
    batch = batch.union(teacher_data)

    # 第四步：advantage estimator —— OPD 直接用 token-level reward 当 advantage
    batch = compute_advantage(batch, adv_estimator=&#34;token_reward_direct&#34;)

    # 第五步：正常的 PPO actor update（importance sampling loss）
    actor_output = self.actor_rollout_wg.update_actor(batch)

是不是很眼熟？这就是一个标准的 RL loop。OPD 的所有&#34;特殊性&#34;，都集中在第 3 步和第 4 步上。我们一步步来看。

3.2 Teacher 只做一次 prefill，不做 decode
第 3 步是 OPD 的&#34;成本秘密&#34;。我们看 `verl/workers/fsdp_workers.py` 里 `compute_rm_score` 调用 teacher 的部分（节选关键代码）：

# verl/workers/fsdp_workers.py（节选）
# rm_logits_resp 就是 teacher 对 student 整条 response 做完一次 forward 后的 logits
# shape = [B, T, V]
teacher_on_student_log_probs = torch.gather(
    rm_logits_resp, dim=-1, index=student_top_k_ids
)
teacher_logsumexp = torch.logsumexp(rm_logits_resp, dim=-1, keepdim=True)
teacher_on_student_log_probs = teacher_on_student_log_probs - teacher_logsumexp

**这段代码就是整个 OPD 训练里 teacher 唯一做的事情**：

- 对 student 整条 response 
![](https://www.zhihu.com/equation?tex=%5Chat%7By%7D) 做一次 prefill，拿到 logits 张量 `[B, T, V]`；
- 用 `gather` 在词表维度上把 student 关心的那些 token id 挑出来；
- 算一下 logsumexp 做归一化，得到这些 id 在 teacher 分布下的 log-prob。**没有 decode，没有 autoregressive 生成，只有一次 prefill**。这就是为什么我们说 teacher 在 OPD 里很便宜——它只承担了一次 forward 的成本，剩下的工作全在 student 那一侧。

现在你应该能理解为什么前文反复强调&#34;teacher 只做一次 prefill&#34;了：这是 OPD 比&#34;用 reward model 打分的 RL&#34;省得多的根本原因——后者经常需要 reward model 也做 long-context decode（比如 process reward model 那种逐步打分）。

3.3 reward 怎么算：`rm_scores = -kl_val * weights`
接下来看最核心的那一行。在 `verl/workers/actor/dp_actor.py` 中，针对 `only_stu` 策略（也就是 top-k 从 student 选），reward 的计算公式是：

# verl/workers/actor/dp_actor.py（关键代码段）
if strategy == &#34;only_stu&#34;:
    # S_logp:  student 在 top-k token 上的 log-prob，shape (B, T, K)
    # T_on_S:  teacher 在 student 选出的同样这些 top-k token 上的 log-prob
    kl_val = S_logp - T_on_S          # 这就是 reverse KL 的逐 token 估计：log p - log q
    valid_mask = torch.ones_like(S_logp, dtype=torch.bool)
    norm_weights = compute_reward_weights(S_logp, T_on_S, valid_mask, reward_weight_mode)
    rm_scores = -kl_val * norm_weights   # reward = -reverse_KL，再用 student_p 做加权

我们逐行拆解：

- `kl_val = S_logp - T_on_S` —— 这就是 2.2 节给出的 reverse KL 的逐 token Monte Carlo 估计 
![](https://www.zhihu.com/equation?tex=%5Clog+p_t%28%5Chat%7By%7D_t%29+-+%5Clog+q_t%28%5Chat%7By%7D_t%29) 的多 token 推广。
- `rm_scores = -kl_val * norm_weights` —— **reward 直接定义为负的 reverse KL**。KL 越小（说明 student 的输出和 teacher 越像），reward 就越大；反之，reward 是个大负数，会狠狠惩罚 student。
- `norm_weights` —— 在 top-k 的版本里，多个 token 之间需要加权。`reward_weight_mode = &#34;student_p&#34;` 时就用 student 自己的概率做归一化权重，相当于按 student 的&#34;在意程度&#34;加权——student 越在意的 token，KL 偏差对它的影响越大。谨慎的你可能想问：**为什么用 student 的概率做加权，而不是 teacher 的？**

直觉解释是：你想让 student 学的，是&#34;它自己在意但 teacher 不认可&#34;的那些 token。这些 token 才是真正驱动学生分布偏离 teacher 的&#34;罪魁祸首&#34;。如果用 teacher 的概率加权，反而会去关注那些 student 根本不会输出、但 teacher 觉得理所当然的 token——这些 token 对修正 student 的当下行为意义不大。

这个 reward 公式还隐含了一个非常优雅的性质：**它是&#34;unhackable&#34;的**。

什么意思？常见的 reward model 都有 reward hacking 的问题——student 学着学着，就学会了一些&#34;刷分但没意义&#34;的奇怪行为，把 reward model 本身的偏差当真值给拟合住了。但 OPD 的 reward 是 -KL：**KL 越小，意味着 student 越像 teacher，没有任何&#34;作弊空间&#34;**。除非 teacher 本身就是个废物。

Thinking Machines Lab 的博客也专门强调了这一点：

 Unlike most reward models in practice, the reverse KL is &#34;unhackable&#34; in the sense that low KL always corresponds to a high probability of desirable behavior from the teacher model&#39;s point of view.
 
3.4 advantage 怎么算：直接令 `advantage = reward`
按照 PPO/GRPO 的常规设计，下一步应该是 GAE（Generalized Advantage Estimation）。但 OPD 在这里做了一个非常激进的简化——**它直接让 advantage = reward**。

# verl/trainer/ppo/core_algos.py
@register_adv_est(&#34;token_reward_direct&#34;)
def compute_token_reward_direct_advantage(
    token_level_rewards: torch.Tensor,    # (B, T) 或 (B, T, K)
    response_mask: torch.Tensor,          # (B, T)
    config: Optional[AlgoConfig] = None,
    **kwargs,
) -> tuple[torch.Tensor, torch.Tensor]:
    &#34;&#34;&#34;直接把 token-level reward 当作 advantage 的最简 estimator。&#34;&#34;&#34;
    with torch.no_grad():
        if token_level_rewards.dim() == 3:
            response_mask = response_mask.unsqueeze(-1)
        advantages = token_level_rewards * response_mask
        returns = advantages.clone()
    return advantages, returns

读到这里你可能会想：**啊？这也太草率了吧？没有 critic？没有 GAE？甚至 returns 直接等于 advantages？**

对，就是这么草率。但这恰恰是 OPD 设计上的一个精妙之处。我们对照 PPO 复习一下为什么 RL 需要那一套花里胡哨的东西：

 PPO 之所以需要 critic 和 GAE，是因为 reward 信号是 sparse 的（只有 episode 结束时才能算）。GAE 干的事就是把这个稀疏的&#34;未来收益&#34;折现回每一个 token。
 但 OPD 的 reward 信号本身就是 dense 的——**每个 token 都已经有了一个独立、有意义的 reward 值**（就是那个 -KL）。这种情况下根本不需要 GAE 来&#34;拼凑&#34;出 token-level advantage，直接拿 reward 当 advantage 用就行。Thinking Machines Lab 也用了同样的思路，他们博客里的伪代码是：

# 来自 Thinking Machines Lab 博客（精简版）
teacher_logprobs = teacher_client.compute_logprobs(trajectories)
reverse_kl = sampled_logprobs - teacher_logprobs
trajectories[&#34;advantages&#34;] = -reverse_kl
training_client.forward_backward(trajectories, loss_fn=&#34;importance_sampling&#34;)

完全一致。**一句话总结**：OPD 之所以可以省掉 critic 和 GAE，是因为它的 reward 已经稠密到了每个 token，不需要额外做折现。

3.5 actor loss 怎么算：复用 PPO 的 importance sampling
最后一步，actor 是怎么更新的？答案非常无聊——**直接复用 PPO 的 importance sampling loss**。OPD 在这一步几乎没做任何特殊处理。

我们简单回忆一下 PPO 的 actor loss 长什么样（对 PPO 完全没概念的朋友强烈建议先翻一下猛猿的 [图解大模型 RLHF 系列：人人都能看懂的 PPO 原理与源码解读](https://zhuanlan.zhihu.com/p/677607581)，下面我只简短复述）：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D_%7B%5Ctext%7Bactor%7D%7D+%3D+-%5Cmathbb%7BE%7D_t%5CBig%5B%5Cmin%5Cbig%28r_t%28%5Ctheta%29+%5Ccdot+A_t%2C+%5C+%5Ctext%7Bclip%7D%28r_t%28%5Ctheta%29%2C+1-%5Cepsilon%2C+1%2B%5Cepsilon%29+%5Ccdot+A_t%5Cbig%29%5CBig%5D+%5C%5C)

其中：

- 
![](https://www.zhihu.com/equation?tex=r_t%28%5Ctheta%29+%3D+%5Cpi_%5Ctheta%28%5Chat%7By%7D_t+%5Cmid+x%2C+%5Chat%7By%7D_%7B%3C+t%7D%29+%2F+%5Cpi_%7B%5Ctheta_%7B%5Cmathrm%7Bold%7D%7D%7D%28%5Chat%7By%7D_t+%5Cmid+x%2C+%5Chat%7By%7D_%7B%3C+t%7D%29) 是 importance sampling 比率；
- 
![](https://www.zhihu.com/equation?tex=A_t) 就是上一节的 advantage（在 OPD 里 = 
![](https://www.zhihu.com/equation?tex=-%5Ctext%7BKL%7D_t)）。这个 loss 的直觉是：**当 advantage 是正的（即 KL 小，student 表现得像 teacher），就提升这个 token 的概率；当 advantage 是负的（KL 大，student 偏离 teacher），就压低这个 token 的概率**。clip 项的作用和 PPO 完全一致，是防止单步更新过猛。

有没有发现一件很有意思的事？

**OPD 的 actor 更新公式，和 PPO 在数学结构上完全一样。区别只在于 advantage 的来源：**

- PPO 的 advantage 来自 reward model + critic + GAE 这条复杂链路；
- OPD 的 advantage 来自 teacher 的逐 token KL，简单直接。这就是为什么 OPD 可以&#34;无侵入式&#34;地复用 verl/Tinker 这类 RL 框架——它本质上**就是一种 RL，只不过 reward 的来源换成了 teacher 的 logits**。

好，我们把这一章捋一遍：

- student 跑 rollout，拿到 on-policy 轨迹（贵）；
- teacher 做一次 prefill，拿到所有位置的 log-prob（便宜）；
- reward = -KL = -(student_logp - teacher_logp)，用 student_p 做归一加权；
- advantage 直接 = reward，不需要 critic、不需要 GAE；
- actor 用 PPO 的 importance sampling loss 做更新，几乎零修改。读到这里，如果你之前训过 PPO，应该会有种&#34;原来如此&#34;的轻松感。**OPD 在工程上，本质上就是把 PPO 的 reward 换成 -KL 的一个特例**。

四、工业实践：五家技术报告里的 OPD 怎么用
把原理和源码讲完之后，我们终于可以来看一下：今年这一波 OPD 风潮，**各家厂商在自己的旗舰模型里到底是怎么用它的？**

我把这五个 case 按&#34;对工业的影响力&#34;和&#34;出现时间&#34;重新排了一下顺序——从最新最重的 DeepSeek V4 讲起，回溯到去年 Thinking Machines Lab 那篇科普为这个方向做的奠基。

4.1 DeepSeek-V4：直接把 mix RL 的位置交给 OPD
DeepSeek V4 是这一波 OPD 风潮里**最激进的玩家**。如果说前面几家都还是把 OPD 当成 post-training pipeline 里的&#34;补丁&#34;或者&#34;中间阶段&#34;，那么 V4 干脆**把 V3.2 时代用过的整套 mix RL 流程，整个换成了 OPD**。

它的整体思路可以画成两步：

Stage 1 ── 对每个 domain 单独训练一个 specialist
           （math / code / agent / instruction following 等 10+ 个）
           每个 specialist = SFT + GRPO 单独跑

Stage 2 ── Multi-Teacher OPD
           student 自己 rollout
           10+ 个 specialist 同时当 teacher 给 student 的 token 打分
           Full-Vocabulary + reverse KL，把所有专家&#34;行为级&#34;地合并回 student

谨慎的你可能会问：**为什么不像 V3.2 那样，对所有 domain 同时跑一次大 mix RL？这样不就一步到位了吗？**

DeepSeek V4 给出的解释（你也可以理解成它对工业界的暴论）大概是：

 大模型的 post-training 不是&#34;教模型新东西&#34;，而是&#34;在已经存在的预训练权重里，把每个 domain 对应的 expert mode 找出来&#34;。一次性的 mix RL 等于让 actor 同时往多个目标方向跑，目标之间互相打架，最后落到一个折中、平庸的 mode 上。**不如先各跑各的（Stage 1），再用 OPD 的稠密 KL 信号把多个 mode 蒸馏回同一个 student（Stage 2）**——后者是&#34;行为级&#34;的合并，比传统的参数加权 merging 优雅得多。
 这里还有一个非常工程化的细节值得拎出来：**DeepSeek V4 用的不是工业默认的 sampled-token，而是 full-vocabulary OPD**。

我们在第二节里说过，sampled-token 在 single-teacher 场景下显存最省、效果几乎不掉。但 V4 这次的场景是 multi-teacher consolidation——**一个 token 位置上要同时和 10+ 个 teacher 的分布对齐**，sampled-token 的 Monte Carlo 估计在多 teacher 上的方差会被显著放大。所以他们的折中是：直接上 full-vocab 把估计量做精，反正 1.6T MoE 这种规模训练集群也不缺显存。

**一句话总结**：DeepSeek V4 的 post-training 哲学，就是用&#34;独立 specialist + 多教师 OPD&#34;这种&#34;先分后合&#34;的范式，去取代&#34;一次性 mix RL&#34;这种&#34;all-in-one&#34;的范式。这是今年 OPD 在工业落地里最重磅的一次背书。

4.2 Qwen3：那张让所有人重新审视 OPD 的对比表
时间往回拨到 2025 年，Qwen3 大概是把 OPD&#34;打&#34;上工业舞台的关键玩家。他们的技术报告里 Table 21 给出了一组被反复转发的对比数字：

方法AIME&#39;24GPQA-DiamondGPU HoursOff-policy distillation（SFT）55.0%55.6%Unreported+ Reinforcement learning67.6%61.3%17,920+ On-policy distillation74.4%63.3%1,800注意中间那一行和最后一行：**OPD 不仅在 AIME&#39;24 上比 RL 高 6.8 个点，所用的 GPU 时数还只是 RL 的 1/10**。

如果你在做基础设施账单审批，看到这个数字会激动到什么程度？这一张表也是后面 MiMo、GLM-5、DeepSeek V4 都跟进 OPD 的直接导火索。

不过 Qwen3 的 OPD 用法也带来了一些&#34;传染病&#34;。在 [Qwen3 GitHub Discussion #1798](https://link.zhihu.com/?target=https%3A//github.com/QwenLM/Qwen3/discussions/1798) 和 Issue #1799 里，社区反馈了 OPD 在 strong-to-weak 蒸馏（也就是大 teacher 教小 student）场景下，如果不加任何稳定化机制（比如 sentence-level importance weighting、ratio clipping），student 的错误会逐步放大，最终训练崩溃。这一点 Qwen3 团队在自己的实现里有处理，但具体细节没完全公开。后来这一系列稳定化技巧也成为后续多篇论文的重点（我们在第五节里再讲）。

4.3 MiMo-V2-Flash：Multi-Teacher OPD（MOPD）
小米的 MiMo-V2-Flash（309B 总参 / 15B activated 的 MoE 模型）把 OPD 升级成了 **Multi-Teacher On-Policy Distillation（MOPD）**。

![](https://pic1.zhimg.com/v2-1c3ba6763a24d954cf57f71f8020205e_r.jpg)46qF1k它的玩法是这样的：

- **先用 RL 训练一组 domain-specialized teachers**——一个 math 专家、一个 code 专家、一个 reasoning 专家。
- **再用 MOPD 把这些 teacher 的能力，统一蒸馏回一个 student 模型**。听起来是不是和 DeepSeek V4 思路非常像？**对的，本质就是同一个范式**——只是 MiMo 是 2026 年初先趟出来的，DeepSeek V4 在它后面把这个范式推到极致（10+ 个 specialist + full-vocab OPD）。

MOPD 的位置很有意思——它被放在 post-training 的**中间阶段**，介于 mid-training 和 large-scale agentic RL 之间。这暗示了一个新的 post-training 范式正在出现：

Pre-training → Mid-training → Multi-Teacher OPD → Agentic RL
                                  ↑
                  把多个 RL 专家的能力先汇聚到一个 student
                  再在这个 student 上做 agentic RL

从 benchmark 上看，MOPD + 后续 Agentic RL 让 MiMo-V2-Flash 在 SWE-Bench、AIME 等任务上达到 SOTA，**用 15B activated 的参数干掉了一系列 30B+ 的 dense 模型**。

4.4 GLM-5：on-policy 跨阶段蒸馏，专治&#34;能力衰退&#34;
智谱（z.ai）在 2026 年 2 月放出的 GLM-5（744B 参数 MoE）技术报告里，把 OPD 用在了一个非常聪明的位置：**post-training 的最后一步，专门用来防止前面几个阶段训练之后产生的能力倒退（capability regression）**。

![](https://picx.zhimg.com/v2-0ffe3d55a674310eeaa5cb3cd06a3aab_r.jpg)SlMUUxGLM-5 的 post-training pipeline 一共四个阶段：

- Reasoning RL（带IcePop 技术）
- Agentic RL（异步、解耦的训练基础设施）
- General RL（混合 reward 信号）
- **On-policy cross-stage distillation**——这就是 OPD 的位置直觉上你可能想问：前面三个阶段都是 RL，效果应该越练越好，为什么最后还要补一刀 OPD？

答案是 **catastrophic forgetting**（灾难性遗忘）。RL 在某个特定 domain 上越练越强的同时，会无意识地损害模型在其它 domain 上的能力。这一点在 [Mukherjee et al., 2025] 的 Reinforcement Learning Finetunes Small Subnetworks in Large Language Models 里已经被实证过——RL 只调整了模型的一小部分子网络，特别&#34;脆弱&#34;。

GLM-5 的解法就是：**在四个阶段之间，用 on-policy distillation 让模型&#34;对齐&#34;到自己之前的某个能力 snapshot 上，把丢掉的通用能力捞回来**。这是 OPD 在工业链路里非常有代表性的一种用法——不是用来&#34;学新东西&#34;，而是用来&#34;防止丢老东西&#34;。

4.5 Thinking Machines Lab：把 OPD 推到大众视野的那篇博客
最后回到这个方向的&#34;科普源头&#34;——Thinking Machines Lab（TML，Mira Murati 创立的那家）。他们在 2025 年 10 月那篇 [On-Policy Distillation 博客](https://link.zhihu.com/?target=https%3A//thinkingmachines.ai/blog/on-policy-distillation) 里，把 OPD 的整个原理用「下棋复盘」这种最朴素的类比讲了一遍，可以说是这一波 OPD 出圈的关键传播节点。

除了科普价值，他们还提出了一个我个人觉得特别精妙的 use case——**用模型旧版本的自己当 teacher**。

具体场景是这样的：他们有一个 Qwen3-8B（已经是 RL post-trained 的版本，IF-eval 跑 85%）。他们想让这个模型学会&#34;内部公司文档&#34;这个新 domain，于是先做了一轮 mid-training（在内部文档上 SFT）。结果发现：

 mid-training 之后，模型确实学到了内部文档的知识（Internal QA: 18% → 43%），但 IF-eval 从 85% 暴跌到 45%——之前的 instruction-following 能力几乎全废了。
 怎么办？他们的解法是 **用 mid-training 之前的 Qwen3-8B 自己当 teacher**，跑一轮 OPD（用 Tulu3 prompts 做 instruction-following 任务）。结果：

模型Internal QAIF-evalQwen3-8B（原版）18%85%+ midtrain（70% 文档 + 30% chat）36%79%+ OPD（用旧版自己当 teacher）41%83%**Internal QA 没掉、IF-eval 几乎完全恢复，新知识 + 老能力都保住了**。

这个用法对持续学习（continual learning / test-time training）的意义是巨大的：你可以**周期性地用模型的旧 snapshot 给当前模型做 OPD**，每次往新方向训练之后，都能把丢掉的老能力捞回来。这套思路其实和 GLM-5 的&#34;on-policy cross-stage distillation&#34;在精神上是相通的——TML 7 个月前就把这个 pattern 写出来了，可以看作是对今年这一波工业实践的一次&#34;先验科普&#34;。

到这一步，五个工业 case 我们就过完了。**总结一下，OPD 在工业里的几种典型定位**：

- **替代 mix RL**：先分后合的&#34;specialist + multi-teacher OPD&#34;取代一次性 mix RL（DeepSeek V4，今年最激进的一次押注）。
- **替代 RL（同 domain 内）**：用 1/10 算力跑出更好的 reasoning 性能（Qwen3 那张 Table 21）。
- **多专家融合**：把多个 RL 专家压缩到一个 student（MiMo-V2-Flash MOPD）。
- **跨阶段保活**：防止 RL 阶段之间发生能力衰退（GLM-5）。
- **持续学习**：用旧版自己做 teacher，新知识 + 老能力两不误（TML）。可以说，OPD 已经从一个&#34;备选 post-training trick&#34;，进化为今年新一代 post-training 工艺的**默认核心组件**。

五、OPD 的四篇相关论文：从 2023 年的源头到 2026 年的最新进展
读到这里你可能已经觉得 OPD 完美无缺了。**但谨慎的你应该已经在心里盘算**：这种东西，肯定也有训不动的时候吧？工业 case 跑得这么漂亮，背后的 paper 是怎么解释这件事的？

这一节我把目前 OPD 方向最值得读的四篇论文按时间顺序串起来，每一篇都从「它到底回答了什么问题、关键观察是啥、给出了什么 recipe / 工具」三个角度展开。读完之后你应该能在自己的项目里判断：**OPD 在我这个场景里到底能不能 work、要怎么 work、值不值得 work**。

为了方便对照，先列一下四篇文章的&#34;分工&#34;：

论文时间角色核心贡献GKD（Agarwal et al.）2023.06，ICLR&#39;24源头第一次系统性地把&#34;on-policy + token-level KD&#34;提出来，并讨论散度选择Rethinking OPD（清华）2026.04诊断指出 OPD 之所以能 work 的两条隐藏假设，给出失败救赎 recipeUni-OPD（腾讯×浙大）2026.05实践 recipe从&#34;学生探索不足 + teacher 信号不可靠&#34;两个角度做 dual-perspective 优化Learning to Foresee（中科大×腾讯）2026.05机理 + 加速用参数动力学解释&#34;OPD 为啥这么快&#34;，顺手提速 3×四篇刚好构成一个完整闭环：**GKD 立起来这个范式 → Rethinking OPD 告诉你它什么时候会失败 → Uni-OPD 告诉你失败时怎么修 → Learning to Foresee 告诉你为啥它本身就快、顺便再加速 3 倍**。下面一篇一篇讲。

5.1 GKD（Agarwal et al., 2023）：OPD 范式的&#34;源头活水&#34;
要讲 OPD 的&#34;前世&#34;，绕不开 Google DeepMind 在 2023 年 6 月放出的这篇 On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes（[arxiv 2306.13649](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.13649)，后来被 ICLR 2024 接收）。这是历史上第一次有人**把&#34;on-policy + token-level KL&#34;这套配方用现在我们熟悉的形式写下来**——可以说今天工业界谈的所有 OPD，本质上都是这篇 paper 提出的 GKD（Generalized Knowledge Distillation）框架的某种特例。

它要解决什么问题？
Agarwal 等人开篇就说，传统的 LM 蒸馏方法只有两条路：

- **SeqKD**：先让 teacher 在 prompt 上 decode 出一批完整 response，然后把这些 response 当成 SFT 数据训学生。问题是 decode 一批高质量数据非常贵，而且训练分布和推理分布对不上（distribution mismatch）。
- **Supervised KD**：在一个固定的 `(prompt, response)` 数据集上，用 teacher 的 token-level 概率作为 soft label 训学生。问题还是同一个——response 是别人写的，不是学生自己跑的。直觉上你也能感觉到，这两条路其实就是我们前面讲的 SFT 范式的不同变体——**学生从来不在自己生成的轨迹上学习**。Agarwal 把这件事直接挑明：

 KD for auto-regressive sequence models can be viewed as an **imitation learning problem with an interactive expert** (Ross et al., 2011).
 也就是说，**LM 的蒸馏在数学上就是一个 imitation learning 问题**——而 imitation learning 的经典结论是：要解决 distribution shift，就必须让学生在自己的轨迹上学习（DAGGER 那篇老论文的核心论点）。

GKD 的两个核心创新
基于这个观察，GKD 同时改动了两个地方：

**改动 1：训练样本来自 student 自己**。把传统 KD 的 loss

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D%7B%5Cmathrm%7BSFT-KD%7D%7D+%3D+%5Cmathbb%7BE%7D%7B%28x%2Cy%29+%5Csim+%5Cmathcal%7BD%7D%7D+%5Cleft%5B+%5Cmathcal%7BD%7D%7B%5Cmathrm%7BKL%7D%7D+%28p_T%28%5Ccdot%7Cy%7B%3C+t%7D%2Cx%29+%5Cparallel+p_S%28%5Ccdot%7Cy_%7B%3C+t%7D%2Cx%29%29+%5Cright%5D+%5C%5C)

里的 `(x, y)` 数据集采样，换成 student 自己 rollout 的 on-policy 样本：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D%7B%5Cmathrm%7BGKD%7D%7D%5E%7B%5Cmathrm%7Bon-policy%7D%7D+%3D+%5Cmathbb%7BE%7D%7Bx+%5Csim+%5Cmathcal%7BX%7D%2C+y+%5Csim+p_S%28%5Ccdot%7Cx%29%7D+%5Cleft%5B+%5Cmathcal%7BD%7D%28p_T%28%5Ccdot%7Cy_%7B%3C+t%7D%2Cx%29+%5Cparallel+p_S%28%5Ccdot%7Cy_%7B%3C+t%7D%2Cx%29%29+%5Cright%5D+%5C%5C)

注意区别：**外层期望里的 `y` 是从 student 自己采的**，但 inner 的 token-level loss 还是和传统 KD 一样——teacher 在每个 prefix 上给出一个分布，学生去对齐。这就是后来工业界所说的 OPD 的最简形态。

**改动 2：散度函数可以换**。GKD 第一次系统讨论了&#34;用 forward KL、reverse KL 还是 generalized JSD&#34;这件事。它指出：

- **forward KL** `D_KL(p_T || p_S)` 是 mean-seeking 的，会让 student 试图覆盖 teacher 所有的 mode；当 student 容量不够时，结果就是分布被&#34;摊平&#34;，看起来啥都像但其实啥都不像。
- **reverse KL** `D_KL(p_S || p_T)` 是 mode-seeking 的，会让 student 在 teacher 高概率的少数几个 mode 上&#34;挑一个深耕&#34;；这正好契合 student 容量比 teacher 小的现实。
- **generalized JSD(β)** 介于两者之间，β→0 趋近 forward KL，β→1 趋近 reverse KL，且数值上有界。这一点对今天的工业 OPD 有决定性影响——**你看到的所有 2026 年的 OPD 实现（包括 DeepSeek V4、verl 里的 thunlp/OPD），默认都用 reverse KL**，就是这篇 paper 拍下来的工程默认。

实证结果：on-policy 是真的有用
GKD 在 T5-small / T5-base / T5-large（3 个学生规模）+ T5-XL（teacher）上做了三类任务（XSum 摘要 / WMT 翻译 / GSM8K 数学），结论非常一致：

 相比 baseline KD 方法，**on-policy GKD 在摘要上带来 2.1× 的相对提升、在翻译上 1.7×、在 arithmetic reasoning 上 1.9×**（GKD 的 Figure 1）。
 更关键的是：GKD 还首次展示了 **on-policy distillation 可以无缝叠加 RL fine-tuning**。这一点直接预言了 2026 年我们看到的&#34;OPD + 后续 agentic RL&#34;的范式（MiMo、GLM-5 都在这么做）。

为啥它在 2023 年没有火？
Agarwal 这篇 paper 概念上已经把今天的 OPD 讲明白了，但它真正出圈是要等到 2025 年下半年才发生。原因是 2023 年那个时间点上：

- 当时大家都在堆 RLHF 的 PPO / DPO，post-training 的注意力被这两个方向吸走了。
- T5 这个 backbone 实在太老（GKD 的实验里最大的 student 才 770M），论文里的绝对数字不能 carry 出&#34;OPD 比 RL 更划算&#34;这种工业冲击力。
- 当时还没有 Qwen3 那张「1/10 算力打平 RL」的对照表来给这个范式背书。这就是为啥 2025 年 Thinking Machines Lab 那篇博客出来的时候，很多人是&#34;哦原来还有这个范式&#34;的感觉——其实它已经默默存在两年多了，只是 2025 年下半年到 2026 年这一波算力 / 规模 / 任务的变化恰好触发了它的拐点。

**一句话总结 GKD 这篇 paper**：所有今天工业界用的 OPD = **GKD 论文里 `(on-policy 样本 + reverse KL + token-level)` 的那个特定配置**。读完它你才能真正理解现在的 OPD 不是凭空冒出来的，而是站在三年前那篇被低估的工作上长出来的。

5.2 Rethinking OPD（2026.04，清华）：系统盘点失败模式 + 两条简单可操作的 Recipe
GKD 把 OPD 立起来之后，接下来一个非常自然的问题是：**这玩意儿真的对所有场景都能 work 吗？什么时候会失败？**

清华 thunlp 团队 2026 年 4 月放出的 Rethinking On-Policy Distillation of Large Language Models: Phenomenology, Mechanism, and Recipe（[arxiv 2604.13016](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2604.13016)，也就是 `thunlp/OPD` 仓库背后的论文）就是专门回答这个问题的。这篇 paper 的方法论很有意思——它**不发明新算法**，反而是用几十个对照实验，把 OPD 在工业里&#34;什么时候 work、什么时候不 work&#34;摸了个遍。

![](https://picx.zhimg.com/v2-9e02e5db4aa5d158510f92192e5a773b_r.jpg)qjtrPz
关键观察：两个根本前提
论文先识别出了 OPD 想成功，**必须同时满足的两个条件**：

 (i) the student and teacher should share **compatible thinking patterns**;
 (ii) even with consistent thinking patterns and higher scores, the teacher must offer **genuinely new capabilities** beyond what the student has seen during training.
 我用大白话翻译一下：

- **前提 1：thinking pattern 兼容**——student 和 teacher 在&#34;思考方式&#34;上得能对得上号。比如 teacher 喜欢用代码块写 reasoning，而 student 习惯用自然语言推理，那它们的 token-level 分布天然就差异巨大，OPD 算出来的 KL 全是噪音。
- **前提 2：teacher 真的要有 student 没见过的能力**——如果 teacher 只是个&#34;分数高一点&#34;的同家族小弟，从 student 视角看它的分布根本没什么&#34;新意&#34;，OPD 学不到任何新东西。
关键实证：weak-to-strong reverse distillation
前提 2 听起来挺直觉的，但论文给出了一个非常巧妙的反向对照实验，叫 **weak-to-strong reverse distillation**——故意让弱模型当 teacher 去蒸强模型，看会发生什么：

 在同家族（比如 Qwen2.5 系列）的 1.5B 和 7B 之间做 OPD，无论方向是 7B → 1.5B 还是 1.5B → 7B，**student 学到的最终分数几乎一样**——也就是说强弱方向几乎不影响蒸馏效果。
 这个发现非常反直觉。它说明：**同家族的不同尺寸模型，在 student 视角下的 token-level 分布是 distributionally indistinguishable 的**。换句话说，&#34;7B 比 1.5B 强&#34;这件事在 reasoning benchmark 上是真实的，但在 token-level KL 这个度量下却不成立——teacher 没什么 student &#34;没见过&#34;的东西可教。

把这两个前提合在一起，paper 给出的诊断结论是：**很多人在自己的项目里跑 OPD 跑不出 Qwen3 那种&#34;1/10 算力打平 RL&#34;的效果，原因不是 OPD 不行，而是 teacher / student 配对不满足上面两个前提**。

Recipe 1：off-policy cold start
针对前提 1（thinking pattern 不兼容）的修复方案：

 在跑 OPD 之前，先用 teacher 生成一批数据，对 student 做一轮短期的 SFT（也就是 off-policy distillation），让 student 的输出分布先&#34;挪&#34;到 teacher 附近。然后再开始 OPD。
 直觉很简单：让 student 的 thinking pattern 先在 SFT 阶段被 teacher 拉过来一点，使得后续 OPD 阶段算出来的 KL 是&#34;有意义的&#34;，而不是&#34;两个完全不同的人在自说自话&#34;。

这一招其实也是 Thinking Machines Lab 那篇博客里的标准做法——他们博客里反复强调：&#34;we generally apply on-policy distillation to models that have already been mid-trained on specific domain knowledge&#34;。

Recipe 2：teacher-aligned prompt selection
针对前提 2（teacher 没新东西可教），论文提出了 **teacher-aligned prompt selection**：

 不是所有 prompt 都值得用 OPD 训练。要专门挑那些&#34;teacher 答得好、student 答得不好&#34;的 prompt——因为只有这种 prompt 上才存在真正的 teacher → student 知识落差。
 工程实现非常直白：**先用 teacher 和 student 各把训练集跑一遍，按 score 差排序，只取差距最大的那批做 OPD**。其他 prompt 学不到东西，纯属浪费算力。

一个反直觉的副产品：dense reward 不是免费午餐
论文在最后还抛出一个挺反直觉的发现，被原文称为 &#34;free lunch of dense token-level reward comes at a cost&#34;：

 在 long-horizon distillation（特别是长 reasoning chain）上，OPD 的优势会被稀释——dense 的 token-level KL 鼓励 student 在每一个 token 上都向 teacher 靠拢，但这种&#34;事事跟随&#34;在长链上反而抑制了学生的探索能力，使得 OPD 学到的不是 teacher 的&#34;reasoning 策略&#34;，而是 teacher 的&#34;局部 token 习惯&#34;。
 这一点和 5.4 节我们要讲的 Learning to Foresee 那篇 paper 互相印证——OPD 之所以快，是因为它早早地把&#34;更新方向&#34;锁死了。但锁定方向的另一面就是探索受限，所以在需要&#34;野生&#34;探索的 long-horizon 任务上，OPD 就需要和 RL 配合使用，而不是单打独斗。

**一句话总结 Rethinking OPD**：它把 OPD &#34;什么时候能 work、什么时候不能&#34; 用大量受控实验给摸出来了——给了你两条非常实用的 recipe（cold start + prompt selection），同时也提醒你 OPD 不是 RL 的全场替代品。

5.3 Uni-OPD（2026.05，腾讯×浙大）：Dual-Perspective 救赎&#34;探索不足 + teacher 信号不可靠&#34;
Rethinking OPD 给了你&#34;训不动的时候怎么办&#34;的 recipe，但它聚焦在**训练前置阶段**（cold start、prompt selection）。一个很自然的下一步问题是：**如果训练已经开始了，过程中又出现了问题，能不能在 loss / 数据层面动手脚去救？**

腾讯和浙大 2026 年 5 月放出的 Uni-OPD: Unifying On-Policy Distillation with a Dual-Perspective Recipe（[arxiv 2605.03677](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2605.03677)，[代码](https://link.zhihu.com/?target=https%3A//github.com/WenjinHou/Uni-OPD)）就是来回答这个问题的。它的方法论比 Rethinking 更&#34;工程化&#34;——直接动 loss、动数据采样，而且把目标场景从单 LLM 扩展到了 **MLLM（多模态 LLM）**。

![](https://pica.zhimg.com/v2-13e98b9a4313634ae13832e4ececf22c_r.jpg)1H4SUR
关键观察：OPD 训练时的两个&#34;实时瓶颈&#34;
Uni-OPD 把 OPD 训练时的可观察问题归结成两个：

- 
**Insufficient exploration of informative states**——student 在 rollout 时容易陷在&#34;自己擅长的简单 prompt&#34;上，没充分接触到那些既难又有信息量的中间状态。
 
- 
**Unreliable teacher supervision for student rollouts**——teacher 在 student 跑出来的&#34;奇怪轨迹&#34;上打分往往不可靠。一个典型 failure mode 是：teacher 在一条**错误的 rollout** 上给出了高分；另一种 failure mode 是 teacher 在一条**正确的 rollout** 上给出了低分。
 第一个问题说的是数据侧——student 探索不够。第二个问题说的是 teacher 侧——它给的 token-level 信号在某些 rollout 上方向是反的。这两个问题恰好对应&#34;学生&#34;和&#34;老师&#34;两个角色，所以论文管自己的 recipe 叫 **dual-perspective**：一个角度修学生、一个角度修老师。

Recipe 学生侧：双重 data balancing
学生这一侧的 recipe 是 &#34;offline + online&#34; 两道 data balancing：

- **Offline difficulty-aware balancing**：训练前先用 teacher 给所有 prompt 打 difficulty 标签，按难度分桶采样，让训练 batch 里既有简单题也有难题，避免 student 反复磨同一档题目。
- **Online correctness-aware balancing**：训练中实时根据 student rollout 的对错，动态调整 batch——如果当前 batch 全对/全错，就 oversample 对面那一类。直觉是：**对错混合的 batch 才能给 student 提供&#34;正负对比&#34;的学习信号**。这两道操作合在一起，本质上是在保证 student 看到的 informative state 是够丰富的——避免学生在 OPD 这个 on-policy 范式下&#34;自闭&#34;。

Recipe 教师侧：outcome-guided margin calibration
教师这一侧的 recipe 是这篇 paper 的核心创新，叫 **outcome-guided margin calibration**。核心思路是：**用 outcome reward（最终答对没）作为锚点，校准 teacher 给出的 token-level KL 信号**。

具体操作如下。论文先定义了一个轨迹级的 OPD 回报：

![](https://www.zhihu.com/equation?tex=G_%7B%5Cmathrm%7BOPD%7D%7D%28q%2C+%5Ctau%29+%3D+%5Cfrac%7B1%7D%7B%7C%5Ctau%7C%7D%5Csum_%7Bt%3D1%7D%5E%7B%7C%5Ctau%7C%7D%28%5Clog+%5Cpi_T%28o_t+%7C+q%2C+o_%7B%3C+t%7D%29+-+%5Clog+%5Cpi_%5Ctheta%28o_t+%7C+q%2C+o_%7B%3C+t%7D%29%29+%5C%5C)

直觉上，`G_OPD > 0` 表示 teacher 在这条轨迹上给的 confidence 比 student 高（&#34;teacher 鼓励学生学这条&#34;），反之则是劝退。

然后定义&#34;order consistency&#34;：**对同一个 prompt q，正确轨迹的 G_OPD 应该 ≥ 错误轨迹的 G_OPD**。如果违反这个关系，就说明 teacher 的信号是&#34;反着给&#34;的——给错的轨迹分高了，或者给对的轨迹分低了。

为了量化这种违反，他们定义了一个 prompt-level margin：

![](https://www.zhihu.com/equation?tex=m%28q%29+%3D+%5Cmin_%7B%5Ctau+%5Cin+S_%2B%28q%29%7D+G_%7B%5Ctext%7BOPD%7D%7D%28q%2C+%5Ctau%29+-+%5Cmax_%7B%5Ctau+%5Cin+S_-%28q%29%7D+G_%7B%5Ctext%7BOPD%7D%7D%28q%2C+%5Ctau%29+%5C%5C)

`S_+` 是所有正确 rollout 的集合，`S_-` 是错误 rollout 的集合。`m(q) ≥ 0` 表示**最差的正确轨迹也比最好的错误轨迹分高**——这是 order consistency 的最严苛条件。

当 `m(q) < δ`（一个安全 margin）时，他们提供两个 calibration 策略：

- **Margin mask**：直接把这个 prompt 的整个 group 丢掉，不参与训练。保守做法。
- **Margin shift**：给所有正确轨迹的 G_OPD 加一个常数 `λ(q) = δ - m(q)`，恢复 order consistency。激进做法。ablation 实验里这两个差别不大，但 margin shift 略好（论文 Table 6：margin mask 47.7 vs margin shift 48.1）——主实验最终用的是后者。

实证结果
Uni-OPD 在 5 个 domain（math/code/逻辑推理/文档理解/cross-modal）的 16 个 benchmark 上做了系统对比，结论很整齐：

设定OPD baselineUni-OPDLLM 单 teacher（math）47.048.5LLM 单 teacher（code）60.263.6LLM 多 teacher（math/code）+0/+0+1.5/+3.4Strong-to-weak（30B → 4B）41.242.9Strong-to-weak（30B → 1.7B）23.825.0Cross-modal（文本→图）62.763.9论文 Table 5 的 ablation 里，**margin calibration 这个组件单独贡献了 +0.7 到 +2.4 的提升**，是三个组件里贡献最大的一个。

一个特别值得记的结论
Uni-OPD 在 takeaways 里有一句话非常戳：

**Teacher value comes from the capability gap, not absolute strength alone.**
 也就是说，OPD 的提升上限并不取决于 teacher 有多大、多强，而是取决于 **teacher 和 student 之间存在多少 student 没见过的能力差**。这个观点和 Rethinking OPD 的&#34;前提 2&#34;是完全一致的——只是 Uni-OPD 把它从&#34;前提&#34;升级成了&#34;可量化的 takeaway&#34;。

**一句话总结 Uni-OPD**：当 OPD 在你的项目里训得不太对劲时，**先看是不是 student 探索不足**（用 dual data balancing 修），**再看是不是 teacher 给的 token 信号方向是反的**（用 outcome-guided margin calibration 修）。这两招几乎不增加额外算力，可以直接 plug-in 到现有 OPD pipeline 里。

5.4 Learning to Foresee（2026.05，中科大×腾讯）：用参数动力学解释 OPD 的&#34;预见性&#34;，顺手提速 3×
到目前为止我们讨论的都是&#34;现象级&#34;的问题——什么时候 OPD 能 work、不能 work、怎么修。还有一个非常基础的问题没人答：**为什么 OPD 比 RL 高效？**

Qwen3 那张表的 1/10 算力，单纯靠&#34;dense supervision 比 sparse 信息量大&#34;是不足以解释的——dense 信号在 SFT 里也存在，但 SFT 并没有比 RL 高效 10 倍。所以一定还有别的什么在起作用。

中科大和腾讯 2026 年 5 月放出的 Learning to Foresee: Unveiling the Unlocking Efficiency of On-Policy Distillation（[arxiv 2605.11739](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2605.11739)，[代码](https://link.zhihu.com/?target=https%3A//github.com/caiyuchen-ustc/EffOPD)）就专门回答这个问题。它给出的解释非常优雅，可以浓缩成一个词——**&#34;foresight&#34;（预见性）**。

![](https://picx.zhimg.com/v2-a4eff3bd095d4176c4a841d08122b5a7_r.jpg)yeOgjs
这篇 paper 的核心论点
 OPD 之所以快，是因为它在训练**早期**就把&#34;最终最优解的方向&#34;找到了，剩下的训练只是沿着这个方向在做 magnitude 上的累加。RL 则相反——它在训练过程中一直在&#34;换方向&#34;，浪费了大量算力在并不通往最终解的路上。
 这就像两个人去同一个目的地：OPD 一开始就找准了正确的小路，剩下只是匀速走过去；RL 则是一路上不停地拐弯探索，虽然最后也能到，但总路程远了 3-10 倍。

为了把这个&#34;foresight&#34;这个概念严格化，论文提出了两条 property，分别从**模块层级**和**更新方向层级**给出证据。

Property 1：Functional Redundancy Avoidance（模块层面的预见性）
第一个证据来自模块层级的对比实验。论文做了一个非常聪明的对照：

 把 OPD 和 RL 训完的同一个 base model 的参数差 `ΔW_OPD` 和 `ΔW_RL`，**rescale 到同样的 norm**，再加回 base 模型，测最终的 reasoning 准确率。
 如果纯粹是&#34;OPD 算得多&#34; → &#34;更新更大&#34;的话，那 norm 拉齐之后 OPD 应该和 RL 打平。但实验发现：**在同样的 norm 预算下，OPD 的最终性能比 RL 高得多**（论文 Figure 2a）。这说明 OPD 的更新方向本身的&#34;信息密度&#34;就比 RL 高。

进一步，论文用 sliding-window intervention 把模型分成 embedding / 中间 MLP / 中间 attention / 顶部 等几个区段，分别测每段的&#34;reasoning 贡献度&#34;。结论是（论文 Figure 3b）：

- **中间层 MLP 是 reasoning 的主要承载者**（symbolic 知识和 relational reasoning），呈现倒 U 字形。
- 但 **RL 在贡献度低的底层和顶层注入了大量 update norm**——也就是说 RL &#34;瞎更新&#34;了很多对 reasoning 没用的参数。
- **OPD 自动避开了这些 low-utility 模块**，把 update norm 集中到中间层 MLP 上。论文管这个性质叫 **Functional Redundancy Avoidance**——OPD 能&#34;预见&#34;哪些模块对最终任务有用，把更新集中在那里。

Property 2：Early Low-Rank Lock-in（方向层面的预见性）
第二个证据来自更新矩阵的 SVD 分析。论文对 `ΔW` 做奇异值分解，看 update matrix 的&#34;主方向&#34;：

度量（OPD vs RL，8B 模型）RLOPDSpectral / Frobenius Norm Ratio (↑)32.7%36.8%Effective Rank (↓)27542341Top-1% Subspace Norm Ratio (↑)88.5%94.7%可以看到：**OPD 把 update 集中在更少几个主方向上，能量分布更&#34;低秩&#34;**。

更关键的是，论文进一步追踪训练动态——把每个 checkpoint 的 update 主方向，和**最终 checkpoint** 的主方向做余弦相似度。结果是（论文 Figure 5b）：

 OPD 在训练**早期 0%–30%** 阶段，主方向就已经和最终方向高度对齐了，而且后续保持稳定。RL 则需要到 60%–80% 才能稳定下来，且方向对齐度始终低于 OPD。
 最反直觉的一个实验是 magnitude scaling：

 取 OPD **训练只跑了 10%** 的 checkpoint，按 module-wise 把它的 update norm 拉到最终 checkpoint 的水平——只调 magnitude，方向不动。结果这个&#34;早 checkpoint + 后 magnitude&#34; 的模型能恢复 **80% 的最终性能**！
 这就直接证明了：**OPD 的方向在 10% 训练时就基本定型了，剩下 90% 的训练只是在沿着这个方向把幅度堆上去**。

论文管这个性质叫 **Early Low-Rank Lock-in**——OPD 在很早就&#34;锁死&#34;了一个低秩的、最终性能相关的更新子空间。

EffOPD：把&#34;预见性&#34;翻译成可工程化的 3× 加速
既然 OPD 在 10% 进度时方向就稳了，那为啥还要老老实实把剩下 90% 跑完？这就是 **EffOPD** 的由来。它的核心做法非常朴素：

- 在指数间隔的 checkpoint `t=2^n`（也就是 1, 2, 4, 8, 16... 步）触发一次 extrapolation。
- 用最近两个 exponential checkpoint 的差 `Δ_n = W_{2^n} - W_{2^{n-1}}` 作为&#34;局部更新方向&#34;。
- 沿这个方向构造 5 个 candidate `W̃_{n,k} = W_{2^n} + 2k · Δ_n`，k=1,...,5。
- 用一个**只有 50 条样本**的 mini validation set 评估每个 candidate，从小到大测，一旦掉点就停。
- 接受最大的那个仍然涨点的 candidate，作为新的 W。整套机制不需要训新模块、不需要复杂超参，可以 plug-in 到任何 OPD pipeline 里。论文在 1.5B / 4B / 14B / 32B 四个尺度，code 和 math 两个 domain 上的实验显示：**EffOPD 平均比 vanilla OPD 快 3×**（论文 Figure 6），有些场景下 4 步训练就达到了 vanilla OPD 30 步的水平。

这篇 paper 对 OPD 整体认识的修正
Learning to Foresee 给出了一个非常重要的&#34;机理级&#34;理解，它**修正了我们对 OPD 的几个朴素认知**：

旧认知Learning to Foresee 的修正OPD 快是因为 dense supervision真正的原因是它早期就锁定了正确的更新方向（dense supervision 只是表象）OPD 训 100 个 step 比 10 个 step 好10% 的训练已经把方向定下来了，后面只是在堆 magnitude——不如直接 extrapolateOPD 和 RL 优化的是同一个目标，只是路径不同OPD 自动避开了 RL 大量浪费的 low-utility 模块（embedding / 顶层 / 底层），所以效率本质就是不同这套理论也反过来呼应了 5.2 节 Rethinking OPD 提到的 &#34;dense reward 不是免费午餐&#34; 那个发现——**OPD 的&#34;早期锁定方向&#34;是双刃剑：在 reasoning 这种结构化任务上是优势（早早收敛到正确的小子空间），在需要长程探索的 agentic 场景下就成了束缚（探索空间被锁死了）**。

**一句话总结 Learning to Foresee**：它把&#34;OPD 为啥快&#34;这件事从&#34;因为 dense&#34;提升到了&#34;因为早期就锁定了低秩主方向&#34;，并基于这个洞察给出了一个零超参、3× 加速的 plug-in 方法 EffOPD——可以说是把&#34;为什么&#34;和&#34;怎么用得更好&#34;在同一篇论文里都解决了。

到此为止，OPD 方向最值得读的四篇论文都过完了。**简单回顾一下这一节给你留下的东西**：

- **GKD（2023）告诉你 OPD 长什么样**——`on-policy 样本 + reverse KL + token-level KD` 这套配方早在三年前就已经写好。
- **Rethinking OPD（2026.04）告诉你 OPD 什么时候不能用**——thinking pattern 不兼容用 cold start 救，teacher 没新东西教用 prompt selection 救。
- **Uni-OPD（2026.05）告诉你 OPD 训练中的具体瓶颈怎么修**——student 探索不足用 dual data balancing，teacher 信号反向用 outcome-guided margin calibration。
- **Learning to Foresee（2026.05）告诉你 OPD 为什么快，以及怎么更快**——它早期就锁定了低秩主方向，所以 EffOPD 可以 plug-in 提速 3×。把这四篇串起来读，你会得到一种很完整的感觉：**OPD 这个范式的&#34;成立条件、失败模式、修复手段、底层机理&#34;今年都有了相对扎实的答案**——这比起 Qwen3 出来时大家&#34;哎这个新 trick 真好用&#34;的状态，已经成熟了一大截。

六、全文小结
我们从 OPD 的动机出发，一路走到了它的工业实践、四篇底层论文和方法机理。把全文最重要的几个结论再排一遍：

- **OPD 的本质就是 &#34;on-policy 轨迹 + dense KL reward&#34;**——它把 SFT 的稠密信号和 RL 的真实分布缝合在一起，规避了两者各自的原罪。
- **数学上 OPD 用 reverse KL 做 mode seeking**，且默认用 sampled-token 的 Monte Carlo 估计——既能保住 mode、又显存最省、还能无偏。
- **工程上 OPD 是 PPO 的一个特例**：teacher 做一次 prefill 拿 logits，reward = -KL，advantage 直接等于 reward，actor 用 PPO 的 importance sampling 更新。verl 这类 RL 框架只需要换一下 advantage estimator 就能跑 OPD，几乎零侵入。
- **工业实践里 OPD 至少有 5 种典型用法**：替代 mix RL（DeepSeek V4）、替代单 domain RL（Qwen3）、多专家融合（MiMo MOPD）、跨阶段保活（GLM-5）、持续学习（TML）。今年所有旗舰模型几乎都在用。
- **OPD 这个范式在论文层面今年也成熟了**：GKD（2023）立起范式 → Rethinking OPD（2026.04）盘点失败模式 + 给 cold start / prompt selection 两条 recipe → Uni-OPD（2026.05）从学生侧（dual data balancing）和教师侧（outcome-guided margin calibration）双管齐下修训练中的瓶颈 → Learning to Foresee（2026.05）用参数动力学解释&#34;OPD 为啥快&#34;，并给出 EffOPD 这个 plug-in 的 3× 加速方法。
- **OPD 的 &#34;free lunch&#34; 也有代价**——它的强模仿性 + 早期低秩锁方向，意味着探索空间是受限的。在 long-horizon / agentic 这类需要野生探索的任务上，OPD 最好放在 RL 之前做高效热身，而不是单打独斗。回到本文最开始提的几个问题，现在应该都能在脑子里轻松回答了：

- OPD 既不是 SFT 也不是 RL，它在数学上是 **dense KL-constrained RL 的一个特例**（这一点 G-OPD 那篇论文给出了严格证明）。
- 它和 GKD 等老方法的关键区别是：**通过 sampled-token / top-k 这些工程实现，把 full-vocab KL 的显存压力降到工业可承受范围**。
- 工业界突然集体入场是因为 Qwen3 那张表——**1/10 算力打平 RL 的诱惑实在太大了**；而 DeepSeek V4 这一波直接把 mix RL 整个换成 OPD，给这个方向钉了最重一颗钉子。
- Sampled-Token 是 single-teacher 场景下的工业默认（[实证](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.13016) 上和 Top-k (k≥4) 几乎没差距）；但在 multi-teacher consolidation 场景下，DeepSeek V4 给出了 Full-Vocab 这个反例，权衡的核心是&#34;显存 vs 估计方差&#34;。
- teacher 在整个 OPD 训练里只做一次 prefill，不做任何 decode，这是它比&#34;RL with reward model&#34;省得多的根本原因。至此，关于 OPD 的动机、数学骨架、源码实现、工业实践和底层论文就讲完了。如果有硬件条件，强烈建议：

- 把 `thunlp/OPD` 仓库 clone 下来跑一跑，特别是 `verl/workers/actor/dp_actor.py` 里 `compute_reward_weights` 那段，对应不同的 `top_k_strategy`（`only_stu` / `only_tch` / `intersection` / `union`）会算出完全不同的 reward，值得逐行细读。
- 读一下 Tinker cookbook 里的 `[distillation/train_on_policy.py](https://link.zhihu.com/?target=https%3A//github.com/thinking-machines-lab/tinker-cookbook/blob/main/tinker_cookbook/recipes/distillation/train_on_policy.py)`，对比一下 verl 和 Tinker 在 OPD 实现上的工程取舍。
- 把 [EffOPD](https://link.zhihu.com/?target=https%3A//github.com/caiyuchen-ustc/EffOPD) 接到现有 OPD 训练里试一下&#34;3× 加速&#34;是不是真的——它对原 pipeline 的侵入性很小，主要就是在 exponential checkpoint 上插一个 extrapolation hook。OPD 这个方向后面还有几个值得继续追的点（也是接下来想继续学的方向）：

- **G-OPD / ExOPD**（[arxiv 2602.12125](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2602.12125)）——它给出了&#34;超越 teacher&#34;的 reward extrapolation 方法（`λ > 1`），从理论上证明了 OPD 的 student 可以通过适当 reward 外推**反超** teacher，这一点在 multi-teacher consolidation 上特别有意义。这一节的篇幅没装下，留给独立的一篇文章再展开。
- **OPD 在 agentic / multi-turn 场景下的扩展**——目前业界还没收敛到稳定方案。Uni-OPD 在 takeaways 里也明确把这件事列为 future work，留个 TODO 等更多公开实现出来再补。
- **DeepSeek V4 的 Full-Vocab + Multi-Teacher 这套组合在更小规模复现时的稳定性**——不是所有团队都有 V4 那种显存预算，这块工程上需要更多实测案例。
- **OPD + RL 的最优组合**——MiMo 和 GLM-5 都把 OPD 放在 agentic RL 之前做&#34;热身&#34;，但具体的 step 配比、过渡策略还没有共识。这部分等更多 ablation 数据出来。
七、参考文献与系列导航

论文

- **Rethinking On-Policy Distillation of Large Language Models: Phenomenology, Mechanism, and Recipe**（`thunlp/OPD` 仓库背后的论文）—— [arxiv 2604.13016](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2604.13016)
- **Uni-OPD: Unifying On-Policy Distillation with a Dual-Perspective Recipe** —— [arxiv 2605.03677](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2605.03677)
- **On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes**（Agarwal et al., GKD，ICLR 2024）—— [arxiv 2306.13649](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2306.13649)
- **Learning to Foresee: Unveiling the Unlocking Efficiency of On-Policy Distillation** —— [arxiv 2605.11739](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2605.11739)
- **Learning beyond Teacher: Generalized On-Policy Distillation with Reward Extrapolation**（G-OPD / ExOPD）—— [arxiv 2602.12125](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2602.12125)
- **MiniLLM: Knowledge Distillation of Large Language Models**（Gu et al., 2023）—— [arxiv 2306.08543](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.08543)
- **Reinforcement Learning Finetunes Small Subnetworks in Large Language Models**（Mukherjee et al., 2025）—— [arxiv 2505.11711](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2505.11711)
工业技术报告

- **Qwen3 Technical Report** —— [arxiv 2505.09388](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2505.09388)，特别是 Table 21（OPD vs RL 对比）
- **MiMo-V2-Flash Technical Report**（Xiaomi MiMo）—— [arxiv 2601.02780](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2601.02780v1) + [GitHub](https://link.zhihu.com/?target=https%3A//github.com/XiaomiMiMo/MiMo-V2-Flash)
- **GLM-5: from Vibe Coding to Agentic Engineering**（Zhipu / z.ai）—— [arxiv 2602.15763](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2602.15763)
- **DeepSeek-V4-Pro Technical Report** —— [HuggingFace 仓库](https://link.zhihu.com/?target=https%3A//huggingface.co/deepseek-ai/DeepSeek-V4-Pro)
- **On-Policy Distillation**（Thinking Machines Lab 博客）—— [thinkingmachines.ai/blog/on-policy-distillation](https://link.zhihu.com/?target=https%3A//thinkingmachines.ai/blog/on-policy-distillation)
开源代码

- **thunlp/OPD**（清华开源，本文源码解读对象）—— [github.com/thunlp/OPD](https://link.zhihu.com/?target=https%3A//github.com/thunlp/OPD)
- **Tinker Cookbook** （Thinking Machines Lab 的训练框架）—— [github.com/thinking-machines-lab/tinker-cookbook](https://link.zhihu.com/?target=https%3A//github.com/thinking-machines-lab/tinker-cookbook)
- **verl** （字节开源的 RL 训练框架，OPD 的底层）—— [github.com/volcengine/verl](https://link.zhihu.com/?target=https%3A//github.com/volcengine/verl)【❤️ 如果觉得本文有帮助，欢迎点赞、在看、转发 ～】