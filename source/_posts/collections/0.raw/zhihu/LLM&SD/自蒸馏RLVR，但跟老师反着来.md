---
title: "自蒸馏RLVR，但跟老师反着来"
date: 2026-05-18
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2039831154942006308

---

卷友们好，我是rumor。

RLVR(Reinforcement Learning with Verifiable Rewards)目前是reasoning模型的标配训练范式。但它有一个老问题：**奖励信号是稀疏的**——一条几千token的推理轨迹，最后只给一个0/1的对错信号，根本不知道是哪几个token真正起了作用，这就是经典的信用分配难题。

最近几个月，研究者们提出通过自蒸馏（self-distillation）来解决稀疏奖励问题，核心的招数是：让**同一个模型同时当student和teacher——teacher多看到一些核心信息，靠师生概率差给student在token层面做信用分配**。由此衍生了不同方法，差异其实就三件事：teacher看到的privileged context是什么、师生差异怎么落成advantage上的per-token weight、在哪些rollout上apply（r=0/r=1/全部）。

![](https://pic2.zhimg.com/v2-2055f18c3ed385d8b525a1f58714237f_r.jpg)如上表所示，近期出了多个标志性工作：

- **SDPO[1]：第一篇把自蒸馏接到RLVR上的工作。teacher的privileged context是学生自己写出的一条正确rollout**——用&#34;完成态&#34;反过来教&#34;过程态&#34;。另外在代码生成等任务中，SDPO 、还可以用运行时错误、LLM judge的评价文本作为教师的上下文。loss形式是**logit-level KL散度
![](https://www.zhihu.com/equation?tex=%5Ctext%7BKL%7D%28P_T+%5C%2C%5C%7C%5C%2C+P_S%29)，加到GRPO的surrogate loss上，在所有rollout**上apply。
- **SRPO[2]：在SDPO基础上加了sample routing。teacher还是看正确rollout、loss还是logit KL，但只在错误轨迹（r=0）上用SDPO loss，正确轨迹（r=1）退回GRPO**，配一个entropy-aware的动态权重。直觉很朴素：**学生做错的时候才需要老师指，做对的时候让学生自己跑**——其实已经预示了&#34;成功轨迹上teacher该退场&#34;的思路，但没把它当一等设计原则。
- **RLSD[3]：换了一种完全不同的写法。teacher的privileged context不再是rollout而是ground-truth answer**——让teacher&#34;知道标准答案后&#34;重新对每个token打概率。loss也不用KL了，把师生token概率比直接当advantage上的per-token weight。这里
![](https://www.zhihu.com/equation?tex=%5Ctext%7Bsign%7D%28A%29)是group-relative advantage的符号。即**verifiable reward决定update方向，teacher只决定magnitude（每个token该被加权多少）**，所有rollout都apply。到这里这条baseline谱系的三个关键设计已经穷举完一轮：teacher看rollout还是ground truth（SDPO/SRPO选rollout，RLSD选ground truth）、weight是logit KL还是token ratio（SDPO/SRPO选KL，RLSD选ratio）、在哪些rollout上apply（SDPO/RLSD全部，SRPO只在r=0）。但**所有方法的update direction都指向同一个方向：把student往teacher拉**——SDPO/SRPO是分布拉近，RLSD是token概率拉近，本质都是alignment。

直到最近微软和KAIST联手出了一篇RLRT[4]，第一次把update direction整个反过来，把RLSD版token权重的分子分母对调，且**只在正确轨迹（r=1）上apply**——错误轨迹完全退回GRPO，不动。

从「在所有轨迹上奖励教师偏好的token」变成「**在成功轨迹上奖励学生偏离教师选的token**」。仅仅这么一个翻转，Qwen3-4B-Base在6个数学benchmark上比标准GRPO涨了18%。

![](https://picx.zhimg.com/v2-760569c9fcc7e167bfa15af15ba109cd_r.jpg)
RLRT

为什么反着来
作者的关键洞察是一个被忽略的事实：**在成功轨迹上，学生已经做对了，这时候教师反而是冗余信息**。

RLSD在成功轨迹上加权教师偏好的token，逻辑是&#34;教师条件了更多上下文，所以教师偏好的大概率更好&#34;。但如果学生在关键位置选了一个**反常识但正确**的token（比如先试一个看似不优雅的路径，最后绕回正确答案），教师因为多看到了标准解法，**根本不会选这个token**——它会选课本里的标准做法。RLSD会把&#34;教师偏好的标准token&#34;加权，把&#34;学生自己摸出来的反常识token&#34;压低，**每一次成功后都磨掉一点学生独有的多样性**。

论文用&#34;information asymmetry&#34;（信息不对称）把这个机制讲清楚：

- **位置级不对称** 
![](https://www.zhihu.com/equation?tex=%5Cbar%7BD%7D_t+%3D+%5Ctext%7BKL%7D%28P_S+%5C%2C%5C%7C%5C%2C+P_T%29)：哪些token位置上师生分布差异最大——这些是critical positions，token选择对最终结果影响最大。
- **Token级不对称** 
![](https://www.zhihu.com/equation?tex=%5Chat%7BD%7D_t+%3D+%5Clog%28P_S+%2F+P_T%29)：在采样的token上差异指向哪方。正数=学生选了教师没选的（self-driven），负数=教师选了学生没选的。
![](https://pic2.zhimg.com/v2-398bffddb3877d5fcbfea843bb4117d3_r.jpg)上图给了一个清晰的可视化：reasoning trajectory里大部分token的
![](https://www.zhihu.com/equation?tex=%5Cbar%7BD%7D_t)都很小（无所谓的位置），但少数高
![](https://www.zhihu.com/equation?tex=%5Cbar%7BD%7D_t)位置是真正的分水岭。比如分水岭上教师选`use`/`conclude`（exploit方向），学生选了`try`/`consider`（explore方向）。RLSD把学生的`try`/`consider`当噪声压掉。RLRT反过来——**这是金矿，是学生独有的推理能力，必须重点强化**。

完整advantage重权公式
开头给的是token权重的本体形式，落到GRPO的advantage上还要加mixing系数
![](https://www.zhihu.com/equation?tex=%5Clambda)和clip范围
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon_w)。正确轨迹上advantage重写为：

![](https://www.zhihu.com/equation?tex=A_t%5E%7B%5Ctext%7BRLRT%7D%7D+%3D+A+%5Ccdot+%5Cbig%5B%281-%5Clambda%29+%2B+%5Clambda+%5Ccdot+%5Ctext%7Bclip%7D%28w_%7B%5Ctext%7BRLRT%7D%7D%5Et%2C%5C%2C+1-%5Cvarepsilon_w%2C%5C%2C+1%2B%5Cvarepsilon_w%29%5Cbig%5D+%5C%5C)

![](https://www.zhihu.com/equation?tex=%5Clambda)控制反向信号强度（
![](https://www.zhihu.com/equation?tex=%5Clambda%3D0)完全退回GRPO，
![](https://www.zhihu.com/equation?tex=%5Clambda%3D1)完全用反向weight），
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon_w)控制每个token的扰动上限。错误轨迹完全退回vanilla GRPO。

**学生做错的时候本来就缺少有效探索方向，GRPO自己能处理；做对的时候他独有的推理路径才是稀缺资源，必须保护**。

实验结果
论文在6个数学benchmark上做对比，训练集DAPO-Math-17k，作者采用了3种基座来检验方法的有效性：base模型(Qwen3-4B/8B-Base)、instruction-tuned模型(Qwen3-4B-Instruct)和thinking-tuned模型(Qwen3-8B)。

![](https://picx.zhimg.com/v2-8e939a2e2c99c18ce309d981835de6c5_r.jpg)
![](https://pica.zhimg.com/v2-f9c96134322ae1e855699889ea146540_r.jpg)可以看到，在base模型上的提升比较显著，明显大于精调过的模型。base模型没什么&#34;思维路径&#34;上的偏向，反向信号能挖出来的&#34;自驱探索&#34;空间大；而精调过模型已经收敛到某种推理模式上了，再强化&#34;偏离教师&#34;的token边际效用就低。

总结
最近有篇nrehiew的blog[5]做了一个对照实验：用SFT teacher和RL teacher分别去做OPD，结果两个OPD学生表现几乎一样，都略微超越自己的RL teacher——作者的猜测是**on-policy采样比teacher能力更重要**。

把这个发现和RLRT放在一起看，一条关于教师角色的隐秘进化链清晰浮现：

- 经典SFT时代：教师是绝对的标准答案提供者，学生的唯一任务就是精准复刻
- 传统知识蒸馏时代：教师进化为软标签提供者，传递的是更细腻的分布信息而非死板的对错
- 自蒸馏RLVR时代：教师的指导价值开始被系统性剥离，SRPO让教师只在学生犯错时出手，RLSD让教师退化为更新幅度的调节器而RLRT把这个趋势推到了最激进的终点：它彻底清零了教师的指导功能，只保留了最纯粹的鉴别能力。教师不再告诉学生 &#34;应该选什么token&#34;，只负责标记&#34;哪些token是学生独立做出的选择&#34;。更新方向甚至与教师的偏好完全相反：**越是教师不看好的路径，只要学生靠自己走通了，就越要被重点强化**。

 [1] Reinforcement Learning via Self-Distillation: [https://arxiv.org/abs/2601.20802](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.20802)

[2] Unifying Group-Relative and Self-Distillation Policy Optimization via Sample Routing: [https://arxiv.org/abs/2604.02288](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.02288)

[3] Self-Distilled RLVR: [https://arxiv.org/abs/2604.03128](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.03128)

[4] Rebellious Student: Reversing Teacher Signals for Reasoning Exploration with Self-Distilled RLVR: [https://arxiv.org/abs/2605.10781](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.10781)

[5] SFT, RL, and OPD: [https://nrehiew.github.io/blog/sft_rl_opd/](https://link.zhihu.com/?target=https%3A//nrehiew.github.io/blog/sft_rl_opd/)

---
欢迎初入大模型领域的小伙伴们加入[rumor](https://www.zhihu.com/search?q=rumor&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A1650139426%7D)建立的「**LLM卷王养成群**」一起学习，添加微信「**leerumorrr」**备注**知乎LLM**即可，群里的讨论氛围非常好～另外欢迎白嫖我整理的「[大模型知识点汇总](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzAxMTk4NDkwNw%3D%3D%26mid%3D2247494425%26idx%3D1%26sn%3D04878e6d5f764a30418576837a6d410d%26chksm%3D9bba627daccdeb6ba5b98621c1b83a55e194618cf25d21c202c133989eb8f19dcf4295178358%26token%3D1990196404%26lang%3Dzh_CN%23rd)」

![](https://pic3.zhimg.com/v2-0b0689320f8c37788efc94600c87488e_r.jpg)