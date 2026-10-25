---
title: On-Policy Distillation 方法演进
date: "2026-07-21 00:00:00"
updated: "2026-07-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/On-Policy-Distillation-方法演进/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2062918960367120976
---


阶段时间代表工作主要问题核心改进相对前一阶段的递进奠基：从静态模仿到学生分布2023GKD；MiniLLM离线蒸馏存在 exposure bias，学生推理时会访问训练中未见的状态让学生生成轨迹，教师在学生访问的状态上提供监督；MiniLLM 强调 reverse KL从“模仿教师答案”转为“纠正学生自己的错误”工程化基线2025Thinking Machines OPD；Qwen3 实践RL 奖励稀疏，SFT 又是 off-policy学生采样 + 教师逐 token log-prob + sampled reverse KL将 on-policy 采样与密集 token 监督组合为可复现训练配方去除外部教师2026.01Self-Distilled Reasoner（OPSD）大教师在线推理昂贵，且要求同词表 logits同一模型分成 student/teacher 两个条件分布，teacher 额外看到正确推理或答案教师从“更大模型”变为“获得 privileged information 的自己”用反馈解释错误2026.01SDPORLVR 只有终局 0/1 reward，无法定位错误 tokenteacher 条件化环境反馈或成功 sibling rollout，再把反馈知情分布蒸回 student从“答案监督”推进到“反馈知情的细粒度信用分配”按样本路由2026.04SRPOSDPO 在正确样本上产生路径歧义，后期容易坍缩正确轨迹走 GRPO，错误轨迹走 SDPO；再按 teacher entropy 动态加权教师不再对所有样本一视同仁，只在失败时重点介入分离方向与强度2026.04RLSDprivileged teacher 直接决定梯度方向会造成信息泄漏verifier 决定更新正负方向，teacher 概率比只调 token 更新幅度将“是否奖励”与“奖励哪个 token 更多”解耦离线化2026.04Lightning OPD在线教师服务带来高算力与系统开销在 teacher consistency 条件下缓存 SFT 轨迹上的教师 log-prob从严格在线 OPD 放宽为可控偏差的 offline/on-distribution 蒸馏上下文自蒸馏2026.04OPSDL长上下文中的无关信息导致推理与引用证据不稳定长上下文 student 由同模型的相关短上下文 teacher 监督privileged information 从“答案”变成“更易处理的上下文”结果级校准2026.05Uni-OPDtoken KL 的累计分数可能与最终对错不一致outcome-guided margin calibration，并做离线难度与在线正确率均衡用 trajectory outcome 约束 token-level teacher signal 的排序按 advantage 分区2026.05AOPD负 advantage 高方差、零 advantage 无梯度正 advantage 保留 RL exploitation，非正区域改用局部 KL imitation在同一批轨迹内按学习信号可靠性切换 RL 与蒸馏解放教师接口2026.05ROPDlogit OPD 只能使用白盒且同词表教师从师生回答对比中生成 rubric，再用 rubric reward 做 on-policy 优化教师信号从概率分布扩展为结构化语义评价，可接黑盒模型Agent 步级门控2026.05SOD错误工具调用污染后续 observation，统一 token 权重放大噪声按工具 observation 切 step，以相邻 step 的师生 divergence 变化自适应衰减/恢复蒸馏可靠性控制从 sample 级细化到 agent step 级反向利用教师分歧2026.05RLRT成功轨迹仍被 teacher 拉回标准路径，损害学生独立探索仅在成功轨迹上强化“学生偏好、教师不偏好”的关键 token教师从模仿目标转为“学生独创路径探测器”训练前诊断2026.05Unmasking OPD不清楚哪种 teacher/context、哪些 token 真正有益用 ideal-gradient alignment 对 teacher、样本和 token 做无训练诊断从事后看总分转为训练前估计信号价值PI 适用边界2026.05Many Faces of OPDOPSD 在不同任务上结果矛盾区分 shared-rule PI 与 instance-specific PI，并修复 Top-K 梯度偏差、教师分布错配说明自蒸馏成功取决于 PI 结构，而不只是 loss多轮 Agent 非对称门控2026.05SDAR多轮误差复利；检索技能不完整时 teacher rejection 不可靠RL 为主目标，OPSD 仅作 sigmoid 门控辅助；强化 endorse，软化 reject从“是否用 teacher”推进到“教师正负信号采用不同信任度”Token 信任区域2026.06TrOPD师生分布差异大时 sampled reverse-KL 出现梯度 outlier可信区用 reverse KL，outlier 区用 teacher Top-K forward KL，并加入 teacher-prefix 冷启动对不同 token 区域动态选择散度，而非简单 mask对比去除风格漂移2026.06RLCSDPI-conditioned teacher 的差异集中在风格 token，导致坍缩或长度收缩正确 hint 与错误 hint 的 teacher gap 相减，抵消与正确性无关的风格变化把 teacher signal 分解为 task signal 与 privilege-induced style drift
1. 背景：OPD 到底改了什么
传统知识蒸馏通常在教师生成的固定轨迹上训练学生。训练时的 prefix 来自教师，而部署时的 prefix 来自学生自己；一旦学生早期推理的时候产生错误，后续状态会逐步偏离训练分布，这就是自回归生成中的 exposure bias。

对比维度Forward KLReverse KL形式D_KL​(pT​∥pS​)D_KL​(pS​∥pT​)期望基于谁采样教师分布 (p_T)学生分布 (p_S)核心关注学生是否覆盖教师认为可能的 token学生是否把概率放到了教师低概率区域最怕的问题教师有概率，但学生几乎不给概率学生有概率，但教师几乎不给概率优化倾向Mode-covering，尽量覆盖教师分布Mode-seeking，集中于教师高概率区域多峰分布表现倾向覆盖多个模式可能只选择其中一个主要模式输出特点分布更平滑、覆盖更广分布更尖锐、更确定潜在问题可能给次优 token 分配较多概率可能忽略教师的次要模式蒸馏中的直观理解“不要漏掉老师认为合理的答案”“不要生成老师认为不合理的答案”与 OPD 的关系常用于教师固定轨迹上的分布匹配常用于学生 on-policy 状态上的分布匹配OPD 将训练轨迹改为学生策略自己的采样：

![](https://www.zhihu.com/equation?tex=+y+%5Csim+%5Cpi_%5Ctheta%28%5Ccdot%5Cmid+x%29%2C+)

并在学生实际访问到的每个状态 
![](https://www.zhihu.com/equation?tex=+%28x%2Cy_%7B%3Ct%7D%29) 上，让教师提供 token-level 反馈。常见目标是 reverse KL：

![](https://www.zhihu.com/equation?tex=+%5Cmathcal+L_%7B%5Cmathrm%7BOPD%7D%7D+%3D%5Cmathbb+E_%7By%5Csim%5Cpi_%5Ctheta%7D+%5Cleft%5B+%5Cfrac%7B1%7D%7BT%7D%5Csum_%7Bt%3D1%7D%5E%7BT%7D+D_%7B%5Cmathrm%7BKL%7D%7D%5Cleft%28+%5Cpi_%5Ctheta%28%5Ccdot%5Cmid+x%2Cy_%7B%3Ct%7D%29+%5CVert+%5Cpi_T%28%5Ccdot%5Cmid+x%2Cy_%7B%3Ct%7D%29+%5Cright%29+%5Cright%5D.+) 

实际长序列训练常使用学生采样 token 的单点估计：

![](https://www.zhihu.com/equation?tex=+%5Chat+%5Cell_t+%3D%5Clog+%5Cpi_%5Ctheta%28y_t%5Cmid+x%2Cy_%7B%3Ct%7D%29+-%5Clog+%5Cpi_T%28y_t%5Cmid+x%2Cy_%7B%3Ct%7D%29.+) 

它同时具有两种性质：

- <strong>On-policy</strong>：监督发生在学生自己会访问的状态上，减轻训练—推理分布错位。
- <strong>Dense supervision</strong>：教师逐 token 给信号，比 RLVR 的序列级 0/1 reward 更容易做细粒度信用分配。这也是 OPD 相对 SFT 和 RLVR 的核心位置：

方法轨迹由谁生成反馈粒度主要优势主要缺陷SFT / off-policy KD教师或静态数据token-level稳定、工程简单exposure bias，难学会从自身错误恢复RLVR / GRPO学生sequence-level目标直接与最终正确性一致奖励稀疏、全错组无梯度、token 信用粗糙Vanilla OPD学生token-levelon-policy 且反馈密集，样本效率高默认教师在所有学生状态、所有 token 上都可靠后续所有OPD 改进工作，基本都在修正最后一个假设。

2. 一个统一分析框架
OPD 相关论文的主要模块：

- <strong>轨迹来源</strong>：学生在线采样、教师 prefix + 学生续写，还是离线缓存轨迹。
- <strong>教师来源</strong>：外部白盒模型、黑盒 API、同模型 self-teacher，还是不同上下文下的同一模型。
- <strong>教师可见信息</strong>：与学生同信息、正确答案、成功 rollout、环境反馈、检索技能或精简上下文。
- <strong>反馈形式</strong>：full-vocab logits、sampled-token log-ratio、rubric reward、文字反馈或 verifier reward。
- <strong>路由粒度</strong>：trajectory、step、token，或者 teacher signal 的正负极性。
- <strong>优化作用</strong>：教师决定更新方向、只决定更新幅度，还是仅作为辅助正则项。
3. 第一条主线：让 OPD 的目标更稳定、更符合最终结果

3.1 GKD 与 MiniLLM：确立 on-policy + reverse KL
GKD 将学生自身轨迹纳入蒸馏，并允许灵活选择散度；MiniLLM 则指出，对生成式模型而言，forward KL 容易迫使容量较小的学生覆盖教师的长尾模式，reverse KL 的 mode-seeking 特性往往更合适。二者奠定了后续 OPD 的基本形式。

但 reverse KL 并不是无条件稳定：当学生采到的 token 在教师下概率极低时，单点估计会产生极端 log-ratio；当教师分布包含多个合理模式时，reverse KL 又可能过度压缩多样性。

3.2 AOPD：按 advantage 符号切分 exploitation 与 imitation
AOPD 观察到标准 policy-gradient 式 OPD 在不同 advantage 区域的统计性质不同：

- 正 advantage 区域具有较可信的成功信号，适合继续做 RL exploitation；
- 零 advantage 区域梯度消失；
- 负 advantage 区域的策略梯度方差大，容易把整条失败轨迹粗暴压低。因此，AOPD 在正 advantage 样本上保留 policy gradient，在非正 advantage 区域改为局部散度最小化。论文报告在强、弱初始化下相对标准 OPD 的平均提升分别为 4.09 和 8.34 个点。它的本质是：<strong>环境结果较好时强化当前策略，结果不可靠时让教师负责纠偏。</strong>

3.3 Uni-OPD：用 outcome 约束 token-level 分数
Vanilla OPD 默认“逐 token 更像教师”与“最终答案更正确”方向一致，但两者并不必然等价。错误轨迹可能因为语言模式接近教师而得到更高的累计蒸馏回报。

Uni-OPD 定义轨迹级蒸馏回报：

![](https://www.zhihu.com/equation?tex=+G_%7B%5Cmathrm%7BOPD%7D%7D%28x%2C%5Ctau%29+%3D%5Cfrac%7B1%7D%7B%7C%5Ctau%7C%7D%5Csum_t+%5Clog%5Cfrac%7B%5Cpi_T%28y_t%5Cmid+s_t%29%7D%7B%5Cpi_%5Ctheta%28y_t%5Cmid+s_t%29%7D%2C+) 

并要求正确轨迹的分数至少比错误轨迹高一个 margin。若不满足，就对正确轨迹进行 outcome-guided margin calibration。同时，它从学生侧加入离线难度均衡和在线正确率均衡，使 rollout 覆盖更有信息量的状态。

这一工作指出：<strong>token-level teacher signal 需要由 trajectory-level outcome 做全局校准。</strong>

3.4 TrOPD：在可信区和 outlier 区使用不同散度
TrOPD 针对 sampled reverse-KL 的数值问题定义 token 级信任区域：

![](https://www.zhihu.com/equation?tex=+P_%7B%5Cmathrm%7Btrust%7D%7D%28y_t%29+%3D%5Cmin%5Cleft%28%5Cfrac%7B%5Cpi_T%28y_t%5Cmid+s_t%29%7D+%7B%5Cpi_%5Ctheta%28y_t%5Cmid+s_t%29%7D%2C1%5Cright%29.+) 

- 教师至少与学生同样认可的 token 位于可信区，继续使用 reverse KL；
- 学生明显偏好、教师几乎不认可的 token 被视作 outlier，不再直接使用高方差的 sampled reverse-KL；
- outlier 区改用教师 Top-K 上的 forward KL，而不是简单丢弃最有信息量的分歧位置。此外，TrOPD 用 teacher prefix + student continuation 进行早期 off-policy guidance，再逐渐把 teacher prefix 长度退火到零。这等价于给弱初始化学生一个可退出的“扶手”。

3.5 Unmasking OPD：先诊断，再决定哪些 token 值得蒸
Unmasking OPD 不直接提出一个固定 loss，而是构造理想梯度：最大化学生成功概率的参数更新方向。再用 distillation gradient 与理想梯度的 cosine alignment，按题目、教师和 token 估计蒸馏信号价值。

核心发现包括：

- 教师信号在失败轨迹上通常比成功轨迹上更有用；
- 成功轨迹中，学生本来已经具备有效策略，教师信号更容易成为噪声；
- 最佳 teacher/context 取决于学生容量和任务，不存在统一最优配置；
- “更强的教师”不一定“更可理解”，小模型有时从同分布 self-teacher 学得更好。这为 SRPO、SOD、RLRT 等路由思想提供了统一解释：<strong>监督密度不是越高越好，关键是有效梯度密度。</strong>

4. 第二条主线：重新定义教师及其可见信息

4.1 OPSD：同一模型在不同信息条件下自蒸馏
Self-Distilled Reasoner 将一份模型实例化为两个条件分布：

![](https://www.zhihu.com/equation?tex=+%5Cpi_S%28%5Ccdot%5Cmid+x%2Cy_%7B%3Ct%7D%29%2C%5Cqquad+%5Cpi_T%28%5Ccdot%5Cmid+x%2Cz%2Cy_%7B%3Ct%7D%29%2C+) 

其中 (z) 是训练期可用的正确答案或验证过的推理轨迹。学生先生成 rollout，teacher 再在同一 prefix 上、借助 (z) 重新评估 token 分布，梯度只回传 student 分支。

OPSD 相比 GRPO 有 4–8 倍 token efficiency，并发现：当 teacher 与 student 共享参数、没有容量差时，forward KL 反而可能比 reverse KL 更稳定；逐 token clipping 能抑制标点和连接词等高散度风格 token。

OPSD 的意义不只是省掉外部教师，而是将“教师”解释为：<strong>同一个模型在更充分信息条件下的后验分布。</strong>

4.2 Many Faces 与 RLSD：privileged information 不是总能被内化
OPSD 的关键风险是训练时 teacher 看得到 (z)，部署时 student 看不到。Many Faces of OPD 将 PI 分成两类：

- <strong>Shared-rule PI</strong>：系统提示词、价值偏好、风格规范等跨样本共享的潜在规则。对不同 PI 条件分布取边际后，仍可能得到可学习的公共规律。
- <strong>Instance-specific PI</strong>：某一道题的标准答案、某份特定文档、某条独有推理轨迹。不同样本的条件分布被边际化后，容易互相抵消或让 student 学到“参考答案似乎存在”的虚假相关性。RLSD 从信息论角度给出更强的诊断：当 teacher 的预测依赖 student 永远不可见的 PI 时，逐样本分布匹配存在不可消除的 mutual-information gap。早期有效信号占主导，模型快速上升；后期有益项减弱，PI 相关的逐样本噪声开始积累，表现为答案泄漏、KL 停滞和性能下降。

因此，自蒸馏不应只问“有没有正确答案”，而应先问：<strong>这份 PI 表示可跨样本内化的规律，还是部署时永远不可达的实例状态？</strong>

4.3 OPSDL：选择学生能理解的 privileged view
OPSDL 面向长上下文任务。学生在完整长上下文上生成，而 teacher 是同一个模型在抽取后的相关短上下文上的分布。这里 teacher 的优势不是看到答案，而是避开无关信息干扰。

这种设计有两个优点：

- teacher 的知识仍在 student 本身能力范围内，不引入明显容量鸿沟；
- privileged view 在部署时可由检索或上下文压缩模块构造，比 ground-truth PI 更接近可达状态。它与“comprehensibility”结论一致：教师的绝对分数不是唯一标准，教师信号是否落在学生可解释、可表达的分布支撑上同样重要。

4.4 ROPD：用 rubric 替代 logits
ROPD 不要求访问 teacher logits。对每个 prompt，它先比较若干 teacher 与 student 回答，让语言模型归纳 prompt-specific rubric，再用这些 rubric 对 student rollout 打分，最后把 rubric reward 交给 GRPO。

这将 OPD 的反馈从“词表级概率匹配”扩展为“on-policy 轨迹上的结构化语义评价”，带来三点变化：

- 可以使用闭源黑盒教师；
- teacher 与 student 无需共享 tokenizer 或模型家族；
- 监督重点从表面 token 偏好转向正确性、完整性、工具使用规范等可解释维度。论文报告最高 10 倍样本效率增益。代价是 rubric 生成与评分也可能有偏差，需要校准评分一致性、防止 reward hacking，并控制额外推理成本。

5. 第三条主线：把 OPD 与 RLVR 的职责重新拆分

5.1 SDPO：把环境反馈变成 dense teacher signal
SDPO 面向带有编译错误、执行日志、judge feedback 等丰富反馈的任务。student 完成尝试后，同一模型在额外看到反馈的条件下充当 teacher，将“事后知道哪里错”的分布蒸回原策略。

若环境只有 0/1 奖励，SDPO 可以选择同组成功 rollout 作为失败 rollout 的隐式反馈。这样即使一个 group 内大量样本失败，也能从成功 sibling 中获得 token-level 指导。

5.2 SRPO：成功样本交给 RL，失败样本交给蒸馏
SRPO 发现，把 SDPO 用在已经正确的 rollout 上，会强迫一条正确路径匹配另一条同样正确的 sibling 路径，制造无意义的偏好；并且 self-teacher 在训练后期熵升高，信号逐渐退化。

其路由规则很直接：

![](https://www.zhihu.com/equation?tex=+%5Cmathcal+L_i%3D+%5Cbegin%7Bcases%7D+%5Cmathcal+L_%7B%5Cmathrm%7BGRPO%7D%7D%2C+%26+r_i%3D1%2C%5C+%5Clambda_i%5E%7B%5Cmathrm%7Bent%7D%7D%5Cmathcal+L_%7B%5Cmathrm%7BSDPO%7D%7D%2C+%26+r_i%3D0.+%5Cend%7Bcases%7D+) 

正确轨迹由 verifier 的结果信号稳定强化；失败轨迹才使用 dense correction。论文在 Qwen3-8B 五个 benchmark 上，相比 GRPO 平均提升 3.4 个点，相比 SDPO 提升 6.3 个点。

5.3 RLSD：环境决定方向，教师只分配 token credit
RLSD 不再让 privileged teacher 成为分布匹配目标，而是计算 token 级 evidence ratio：

![](https://www.zhihu.com/equation?tex=+q_t%3D%5Cfrac%7B%5Cpi_T%28y_t%5Cmid+x%2Cz%2Cy_%7B%3Ct%7D%29%7D+%7B%5Cpi_S%28y_t%5Cmid+x%2Cy_%7B%3Ct%7D%29%7D.+) 

环境 advantage 决定更新方向，(q_t) 只决定同一轨迹内不同 token 的相对更新幅度，并通过 clipping 限制极端权重。这样 verifier 保留“最终对错”的决定权，而 teacher 提供细粒度 credit assignment。

这是一个非常重要的结构性改进：<strong>稀疏但可靠的信号负责方向，密集但可能有偏的信号只负责幅度。</strong>

5.4 RLRT：成功时反向读取教师信号
RLRT 进一步指出：在成功 rollout 上，student 选择了 teacher 不偏好的 token，可能恰好说明学生发现了一条非标准但有效的路径。如果仍按 teacher 偏好蒸馏，就会抹掉这种 self-driven exploration。

因此，RLRT 只在成功轨迹上寻找两类分歧：

- 位置级师生 KL 大：这是可能决定推理走向的 critical position；
- 被采样 token 上 
![](https://www.zhihu.com/equation?tex=%28%5Clog%28%5Cpi_S%2F%5Cpi_T%29%3E0%29) ：学生比 teacher 更偏好这一选择。方法重点强化同时满足这两个条件的 token。教师不再告诉学生“你应当模仿什么”，而是帮助识别“哪些成功选择是你自己探索出来的”。

5.5 RLCSD：通过正误提示对比消除风格信号
RLCSD 发现，teacher 看过正确 hint 后往往写得更短、更直接，导致 teacher-student gap 主要集中在连接词、格式和叙述风格，而不是数字、算符或关键推理 token。这种 privilege-induced style drift 会造成熵异常、响应变短甚至坍缩。

其核心信号为：

![](https://www.zhihu.com/equation?tex=+e_t%5E%7B%5Cmathrm%7Bctr%7D%7D+%3D%5Clog+%5Cpi_T%28y_t%5Cmid+x%2Cz%5E%2B%2Cy_%7B%3Ct%7D%29+-%5Clog%5Cleft%5B+%5Cfrac%7B1%7D%7BK%7D%5Csum_%7Bk%3D1%7D%5E%7BK%7D+%5Cpi_T%28y_t%5Cmid+x%2Cz_k%5E-%2Cy_%7B%3Ct%7D%29+%5Cright%5D.+) 

正确 hint 与错误 hint 使用相同模板，因此“只要看到 hint 就发生”的风格偏移会在相减中抵消，剩下的更接近任务相关信号。随后使用有界变换、强信号 token mask 和 sign-preserving clamp，保证 teacher 只调节幅度，不翻转 verifier 决定的方向。

6. 第四条主线：面向 Agent 长轨迹的可靠性控制

6.1 为什么 Agent OPD 比文本推理更难
纯文本推理中，一个错误 token 通常导致状态逐渐漂移；工具调用 Agent 存在不连续状态转移。一次错误 tool call 会返回错误 observation，之后的 reasoning、下一次 tool call 和环境状态都建立在污染上下文上。

因此，Agent OPD 有三个额外风险：

- <strong>状态污染</strong>：teacher 被迫在自己从未正常访问的异常环境状态上评分。
- <strong>误差复利</strong>：当前 action 会改变未来 observation，错误跨 step 或跨 turn 放大。
- <strong>反馈异质性</strong>：reasoning token、tool schema、tool argument、observation 后恢复 token 的可靠性不同。
6.2 SOD：以 step divergence 估计教师可信度
SOD 依据 tool observation 将轨迹切分为多个 reasoning step，定义第 (k) 步师生差异的轻量代理：

![](https://www.zhihu.com/equation?tex=+d_k%3D%5Cfrac%7B1%7D%7B%7CI_k%7C%7D+%5Csum_%7Bt%5Cin+I_k%7D+%5Cleft%7C+%5Clog%5Cpi_%5Ctheta%28y_t%5Cmid+s_t%29+-%5Clog%5Cpi_T%28y_t%5Cmid+s_t%29+%5Cright%7C.+) 

下一步权重由相邻 divergence 的相对变化决定：分歧扩大时降低蒸馏强度，重新对齐时恢复，同时设置上界防止放大。最终目标把 step-wise OPD 与 GRPO 结合：环境 reward 负责探索，可靠区域中的 teacher 提供 dense guidance。

相比“第一次工具错误后全部 mask”，SOD 的优势是允许模型在后续步骤恢复。论文在 AIME 2024/2025、GPQA 和 LiveCodeBench 上报告稳定提升，其中 Qwen3-0.6B 在 AIME 2025 达到 26.13% average@32，整体平均相对 OPD 提升 20.86%。

6.3 SDAR：将自蒸馏降级为非对称辅助门
SDAR 面向多轮 Agent，特别考虑 teacher 通过检索技能获得 privileged context 的场景。检索不完整时：

- teacher 提高某个 student token 的概率，可视为技能对该行为的 endorsement；
- teacher 降低某个 token 的概率，却不一定说明 student 错了，可能只是相关技能没有被检索到。因此，SDAR 保留 RL 为主优化目标，把 detached token gap 映射为 sigmoid gate：加强正向 endorsement，软性衰减负向 rejection，而不是对两者对称蒸馏。论文在 ALFWorld、WebShop 和 Search-QA 上相对 GRPO 分别报告约 9.4、10.2 和 7.0 个点的提升，并避免 naive GRPO+OPSD 的多轮不稳定。

6.4 SOD 与 SDAR 的关系
两者解决的是同一类根因，但落点不同：

方法可靠性代理门控粒度主要场景保留的信息SOD相邻 step 的师生 divergence 变化step工具调用、结构化多步推理允许错误后重新对齐并恢复 teacher 权重SDARteacher 对 student token 的 endorse/reject 极性token多轮 Agent、skill-conditioned self-teacher正向提示可信度高，负向拒绝只软抑制二者可以组合：先用 SOD 判断当前 step 是否处于污染状态，再用 SDAR 判断该 step 内 teacher 对具体 token 的正负信号是否可信。

7. 横向对比：这些工作到底改了哪个模块
方法轨迹级 outcome 锚点教师信号核心路由/加权教师的作用主要代价或限制Vanilla OPD可选白盒 logits均匀 token决定优化目标在线大教师、同词表、异常状态不可靠AOPDadvantage白盒 teacheradvantage 正负正区强化、非正区模仿依赖可靠 advantage 划分Uni-OPD强白盒 logits轨迹 margin + 数据均衡token 分数受 outcome 校准需要可用的结果奖励TrOPD可选白盒 logitstoken trust region可信区 RKL、异常区 FKLTop-K teacher 计算与超参ROPD强rubric / 黑盒输出轨迹级 rubric reward语义评分者评分成本、rubric 偏差与 reward hackingOPSD弱或无PI-conditioned self-teacher均匀或 clipping分布匹配目标instance-specific PI 泄漏风险SDPO可结合feedback-conditioned self-teacher全样本 dense correction解释环境反馈正确样本上有路径歧义，后期可能坍缩SRPO强self-teacher正确/错误 sample routing只纠正失败二值路由较粗，边界样本未细分RLSD强self-teacher 概率比token magnitude只决定幅度仍需 PI 与一次额外 forwardRLRT强反向 teacher gap仅成功轨迹关键 token探测学生独创路径依赖成功 rollout，冷启动阶段信号少RLCSD强正误 hint 对比task-token mask去风格后的幅度调节多次 teacher forward，负 hint 质量重要SOD强外部 teacher logitsstep divergence污染状态下动态降权只按 step 聚合，step 内仍较粗SDAR强skill-conditioned self-teacherendorse/reject gateRL 辅助项依赖 privileged skill/context 的质量Lightning OPD弱或可选缓存 logits离线固定数据on-distribution teacher不再严格跟随最新 student policy
8. 一些结论

8.1 “更强 teacher”不等于“更好 teacher”
真正重要的是：teacher 与 student 是否拥有兼容的推理模式、相近的表达风格和足够重叠的 token support。Rethinking OPD 指出，有效 OPD 需要教师既与学生的思维分布兼容，又能提供学生训练中尚未见过的新能力。Many Faces、Unmasking 和 RLCSD 也从不同角度显示，分布距离过大的强教师可能把监督预算消耗在风格与不可理解 token 上。

8.2 教师不应在所有时候决定更新方向
vanilla OPD 把 teacher 当作全程正确的目标；SRPO 让 teacher 只纠正失败；RLSD 让 teacher 只决定幅度；RLRT 在成功轨迹上甚至反向利用 teacher 信号。递进关系可概括为：

全程模仿 → 按样本选择模仿 → 环境定方向、教师定强度 → 成功时强化学生独有探索。
8.3 可靠性必须分层建模
仅有一个全局蒸馏系数不足以处理长轨迹：

- trajectory 层：结果是否正确，teacher score 与 outcome 是否同序；
- step 层：是否发生工具错误、环境状态是否被污染；
- token 层：是否处于师生支撑重叠区、是否是 task-bearing token；
- signal-polarity 层：teacher endorsement 和 rejection 是否同样可信。
8.4 自蒸馏的核心变量是 PI 结构
shared-rule PI 更适合直接内化；instance-specific PI 更适合用于信用分配、幅度调节或对比消噪，而不宜直接作为逐样本分布匹配目标。

8.5 OPD 与 RL 正在收敛为统一框架
OPD 可写成带隐式 token reward 的 policy gradient；RLSD、AOPD、Uni-OPD、SOD 等工作又把 outcome reward、advantage、KL 和 token weight 放进同一目标。未来更可能出现“多源反馈的分层路由”，而不是一个固定的 KL loss 取代所有方法。

参考资料

奠基与综述

- [On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes (GKD)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.13649)
- [MiniLLM: On-Policy Distillation of Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.08543)
- [On-Policy Distillation — Thinking Machines Lab](https://link.zhihu.com/?target=https%3A//thinkingmachines.ai/blog/on-policy-distillation/)
- [A Survey of On-Policy Distillation for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.00626)
- [Rethinking On-Policy Distillation of Large Language Models: Phenomenology, Mechanism, and Recipe](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.13016)
本文重点论文

- [Self-Distilled Reasoner: On-Policy Self-Distillation for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.18734)
- [Reinforcement Learning via Self-Distillation (SDPO)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2601.20802)
- [Unifying Group-Relative and Self-Distillation Policy Optimization via Sample Routing (SRPO)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.02288)
- [Self-Distilled RLVR (RLSD)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.03128)
- [Lightning OPD: Efficient Post-Training for Large Reasoning Models with Offline On-Policy Distillation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.13010)
- [OPSDL: On-Policy Self-Distillation for Long-Context Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2604.17535)
- [Uni-OPD: Unifying On-Policy Distillation with a Dual-Perspective Recipe](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.03677)
- [Asymmetric On-Policy Distillation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.06387)
- [Rubric-based On-policy Distillation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.07396)
- [SOD: Step-wise On-policy Distillation for Small Language Model Agents](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.07725)
- [Rebellious Student: Reversing Teacher Signals for Reasoning Exploration with Self-Distilled RLVR](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.10781)
- [Unmasking On-Policy Distillation: Where It Helps, Where It Hurts, and Why](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.10889)
- [The Many Faces of On-Policy Distillation: Pitfalls, Mechanisms, and Fixes](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.11182)
- [Self-Distilled Agentic Reinforcement Learning (SDAR)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.15155)
- [Trust Region On-Policy Distillation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2606.01249)
- [RLCSD: Reinforcement Learning with Contrastive On-Policy Self-Distillation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2606.11709)
- [原始参考文章：xOPD 演进](https://zhuanlan.zhihu.com/p/2039735648421163598)