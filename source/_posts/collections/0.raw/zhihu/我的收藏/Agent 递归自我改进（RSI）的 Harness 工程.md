---
title: "Agent 递归自我改进（RSI）的 Harness 工程"
date: 2026-08-02
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2067214030054467237
---

原文标题：Harness Engineering for Self-Improvement（翁荔, Lil&#39;Log, 2026-07）。

翁荔的这篇长文 从一个老问题切入：**递归自我改进（RSI）**——系统用现有能力去改进「产生能力的机制」。Good (1965) 谈 ultraintelligent machine，Yudkowsky (2008) 把 RSI 说成明确的反馈环。翁荔在当下的理解是：改进不一定等于 **模型当场改写权重**；更现实的路径包括改 **训练 pipeline**、改 **部署系统**，从而得到更强的后继模型。她特意强调，**部署系统**——从基座模型到真实任务之间的那一层——重要性可能不亚于预训练结束时的 eval；Claude Code、Codex 等产品，价值大量在 **harness** 里。

若你读过 Anthropic 的 长程 agent harness，那篇讲的是长任务里用 git、进度文件、feature list 做 **轮次交接**。翁荔这篇问的是另一件事：harness 怎么参与 **自我改进**，以及优化对象怎样从 prompt 迁到 workflow、再迁到 harness 代码与搜索。

**Harness 是什么：早年的「Agent = LLM + 工具」不够用了**
早期 agent 框架常写成：**LLM + memory + tools + planning + action**。翁荔认为，**harness engineering** 还要加上：workflow 设计（含 loop engineering）、evaluation、权限控制、持久状态管理——更接近 **运行时与软件系统设计**：模型如何观察、行动、记忆、自检、迭代。

设计宜 **刻意保持简单、通用**，以便泛化；她借 **操作系统** 类比：复杂逻辑封装在系统内，接口保持简单；工具协议、配置格式也在走向行业标准化。

对工程师而言，一个可操作的定义是：**harness = 包裹 base model 的部署系统**——决定它如何思考与规划、如何调工具、如何感知与管理上下文、如何存 artifact、如何用 verifier 评结果。它和「写一段 system prompt」不是同一层东西；prompt 往往是 harness 里的一小块可编辑面。

**三个反复出现的设计模式**
**Pattern 1：Workflow automation。** 给模型一条可 plan → execute → observe/test → improve 的闭环，直到目标达成或向用户澄清。Karpathy 的 autoresearch 被当作干净范例：目标导向 loop，而不是静态 prompt 模板。Codex agent 一类产品也是 tool 调用 → tool 结果回灌 context → 再生成的循环；关键在 **agent runtime** 里分析自己的 trajectory 与失败，而非一次性 prompt。

**Pattern 2：File system as persistent memory。** 长程 rollout 里，实验日志、diff、论文摘要、错误栈、历史 trajectory 往往长于模型训练时的 context 习惯。Harness 不应把全流程塞进 context，而应把 durable state 放在文件里；读写在文件系统上（常见经 bash）是 foundation skill，也会随 core model 变强而受益。

**Pattern 3：Sub-agent and backend jobs。** 主 agent 可并行 spawn 子 agent、挂后台任务，父进程像小型 process manager：启动、看 log、取消失败 run、把结果合并回主线程。设计要点是并行 **可 inspect**：子 agent 输出若只留在 transient chat 里会迅速不可见；落成文件、日志、状态记录，中断后才能恢复并在执行史上继续推理。

**Coding agent 的稳定接口。** 翁荔用 Claude Code、Codex、OpenCode、Cursor 一类产品说明：核心 loop 已趋同——文件发现/读写/patch、shell、git、MCP/Skills、web、子 agent 调度等。工具面与 loop 已趋同，差别主要在 harness 策略与 eval 设计。

**优化对象在迁移：从 prompt 到 harness 代码**
翁荔给出一条粗粒度 progression：**instruction prompts → structured context → workflow → harness code → optimizer code**。模型越强，越值得把优化目标抬到更复杂、更 generic 的结构上——这与 prompt engineering 的经验一致：手工 trick 的重要性下降，但目标、约束、上下文、评估并未消失，只是被系统化了。

她预测 near-term RSI 路径大概是：其一，harness 朝 **meta-methodology** 演化——改进的是「得到更好答案的机器」，而不只是单次答案；少堆人工特例（heuristic），多靠可复用的通用机制（验收循环、有界编辑、状态落盘、对 harness 做搜索/进化等）。其二，成熟的 harness 支撑 auto-research 与模型改进 loop；更强的模型又反过来避免 harness 过度工程化，维持可持续。

长远看，部分 harness 行为可能被内化进模型；但与外部工具、环境的接口仍会存在——类似 instruction tuning 后仍要指定任务与验收。

**上下文工程：从 playbook 到「优化 harness 的 harness」**
长程 Agent 的 context 很容易越堆越长——tool 输出、历史对话、中间结论全塞进 prompt，很快爆窗，且反复让模型「重写整段 system prompt」时，常见两种退化：**context collapse**（旧要点被挤没）和 **brevity bias**（越改越短、丢细节）。下面三条研究线，都是在改 **怎么维护 context**，而不只是多塞字。

**ACE：把 context 当成「可增删的操作手册」**
**Agentic Context Engineering（ACE, Zhang et al. 2025）** 不把 context 当作一整块 prompt，而当作 **playbook（操作手册）**：许多条独立要点，每条有编号和说明，像 `(identifier, description)`。

三个角色分工如下：

**Generator（执行）** 拿着 **当前手册** 去跑真实任务，留下完整 **trajectory**（轨迹）——从接到任务到结束的全过程记录：调了哪些 tool、哪步失败、最后 verifier 过没过。

**Reflector（复盘）** 读这些轨迹，从 **成功和失败** 里提炼经验，例如「这类错误常因没先读 log」「某类任务要先查 X 再写 Y」，输出可写入手册的 **insight**。

**Curator（更新手册）** 负责改 playbook，但 **禁止** 让模型把整本手册重写一遍。它只做 **增量更新**：新增或修订一条条 `(编号, 说明)`；再用 **deterministic merge**（按固定程序规则合并条目，不靠 LLM 自由发挥重写全文）；并 **周期性 dedupe**（去掉重复、过时条目）。这样 playbook 会随任务演化，又不容易越改越空。

**MCE：外层进化「怎么管 context」，内层填「context 里有什么」**
**Meta Context Engineering（MCE, Ye et al. 2026）** 在 ACE 之上再拆两层：

- **机制**：用什么流程维护 context（检索、筛选、格式化、写文件等）
- **内容**：具体 prompt 片段、知识库、代码库、rollout 数据等一个 **skill** 定义一套 context 函数：静态部分 (\rho)（prompt、知识库、代码库等）加动态算子 (F)（检索、筛选、格式化等）。**内层优化** 在训练集上，固定某个 skill，把 context 内容调到最好；**外层优化** 在验证集上，从多个 skill 里选 **管 context 的方式** 最好的一套。meta-agent 还会对历史 skill 做 **crossover**（交叉组合），生成新 skill；base-level agent 根据 rollout 反馈更新具体 context。

实现上，context 常是 **目录里的一组文件**（例如 `skill.md` 加 rollout 数据）；meta 层和 base 层都在 Read/Write/Edit/Bash 等 coding agent 工具里完成，而不是只改一段 chat prompt。

**Meta-Harness：优化「决定存什么、取什么的代码」**
**Meta-Harness（Lee et al. 2026）** 再深一层：优化对象不再是 context 条目本身，而是 **决定哪些信息写入、读取、如何呈现给模型的 harness 代码**——即「优化 harness 的 harness」。Proposer 本身是 coding agent；每个候选 harness 在文件系统里，含源码、分数、trajectory、状态更新；外层 loop 不断生成新候选，只保留 **Pareto 前沿** 上合格的。执行历史放在文件里，用 grep/cat 按需读，而不是全部塞进一个 prompt。Terminal-Bench-2 实验从 **已经很强的 harness 种子** 起步——读提升数字时要记得 baseline 不低。

三条线的递进关系：ACE 用 **固定三角色流程** 维护条目化 playbook；MCE 让 **维护 context 的 skill 本身** 也可搜索、进化；Meta-Harness 把 **整段 harness 逻辑** 放进可搜索的代码空间。共同点是：harness 设计一旦可执行、可 eval，强 coding agent 就能在人工程师同一套 design space 里搜索——但 ACE 的更新规则仍偏人工设定，后两者才把「改机制」推得更自动化。

**Workflow 搜索：从手工 pipeline 到 meta-agent 写代码**
领域专家仍可手工设计 workflow。翁荔举 AI Scientist（Lu et al. 2026）：提案、写码、实验、分析、写稿、审稿；ScientistOne（Meng et al. 2026）强调可验证性与 chain-of-evidence。Autodata（Kulikov et al. 2026）用 challenger / weak solver / strong solver / verifier 合成「难度刚好」的数据——weak 失败、strong 成功；原文指出局限：若 loop 不能迭代改进 strong model，更像间接蒸馏，RSI 味道较淡。

当 workflow 设计空间过大，就把它形式化为搜索。**ADAS**（Hu et al. 2025）用 archive 存 workflow，meta-agent 用代码提案新 agent，self-refine 查新颖性，eval 后回填。**AFlow**（Zhang et al. 2025）把 workflow 表示为图，用 MCTS 扩展与评估；在 QA、代码、数学任务上报告相对手工 workflow 与 ADAS 的提升——仍是特定 benchmark setting，不宜 extrapolate 到所有 Agent 产品。

**自改进 harness：改「改进器」、可观测、与有界编辑**
**Self-Taught Optimizer（STOP, Zelikman et al. 2023）** 是较早的「递归改脚手架」例子。先分清两层对象：

- **任务解**：某道题当前的答案（一段代码、一个方案等）
- **改进器（improver）**：一段程序或 prompt 流程，输入「当前解 + 评分标准」，输出 **更好的解**STOP **不** 只盯着把某一道题的答案打磨到最好，而是让 **改进器本身** 变强：在一大批下游任务上，看「用这个改进器改出来的解，平均能拿多少分」——这叫 **meta-utility（元效用）**；优化目标就是把这个 **平均分** 抬高。更新也递归：用上一代的改进器，去 **改进** 下一代改进器。

实验里，进化后的改进器会自动「长出」遗传搜索、问题分解、bandit 选 prompt、模拟退火等策略——说明 **workflow 本身** 也可以被当成搜索对象。原文 caveat：GPT-4 上平均表现随迭代上升，**GPT-3.5 / Mixtral 上 meta-utility 反而下降**——光有递归结构不够，base model 得足够强才撑得住「改机制」；harness 能释放部署潜力，但 **模型智力仍是底座**。

**Harness updating 与 harness benefit（Lin et al. 2026）** 把「自我进化 harness」拆成 **两轴能力**，不要混为一谈：

轴问的是什么类比updating（会不会改）模型能不能 提出有用的 harness 编辑——改 system prompt、写 skill、调 tool 描述、补 workflow 步骤等会不会 改操作手册benefit（会不会用）换上手 更新后的 harness，跑 长程任务 时，分数/通过率是否真的 变好会不会 按新手册正确干活

Lin 的实验现象 counter-intuitive：**updating** 从 Qwen3.5-9B 到 Claude Opus 4.6 **曲线几乎拉平**——9B 也能写出与 Opus **结构同构** 的 skill（改法看起来像样）。但 **benefit非单调**：往往 **中间档模型提升最大**——太大可能本来就会，太小可能 tool 调用、长程跟随跟不上新 harness。

所以对 Agent 产品的含义：**「小模型也能写 harness patch」≠「小模型跑起来就更强」**；进化 loop 里既要评 **改得好不好**，也要在 **目标模型** 上评 **用不用得上**。会用仍是瓶颈。

**Self-Harness：挖弱点 → 有界改 harness → 回归验收**
**Self-Harness（Zhang et al. 2026）** 让 Agent **改自己的 harness**，但每一步都有边界，避免乱改一整包配置。三步如下：

**第一步：Weakness mining（挖弱点）**
用 **当前 harness** 在任务集上跑 eval，收集 **trace（执行轨迹）**。Verifier 只告诉你过/不过（例如 timeout、缺 artifact），**同一种失败表象** 可能有 **不同根因**——一次是真不会调 tool，一次是 prompt 没要求先读 log。所以要存 **足够 rich 的失败记录**（verifier 判词 + 行为因果 + 抽象机制标签），再 **聚类** 成若干 **失败模式**，且每个模式都能追溯到 verifier，而不是模型自说自话。

**第二步：Bounded harness proposal（有界提案）**
同一个模型在 **可编辑面** 内提案改 harness——例如只允许改 system prompt 某段、某个 skill 文件，**不能** 动 verifier、换模型、改 reasoning budget。提案上下文 **有界**，通常包括四块：① 当前哪些文件/组件能改；② 上一步挖出的失败模式；③ 哪些 **已通过** 的行为必须保留；④ 以前改翻过、效果如何的摘要。优先改 **反复出现、且窄修改能修** 的模式，并产出 **彼此不同** 的若干候选 patch。

**第三步：Proposal validation（验收合并）**
每个候选 patch 都要 **回归测试**，分两套数据：**held-in**（原来失败的那批）看弱点有没有缓解；**held-out**（别的题）看有没有 **引入新问题**。只有 **两边都不退化** 才 merge 进下一代 harness；否则只记日志， **不动** 线上 harness。

在 Terminal-Bench-2 上，Self-Harness 能为 **不同 base 模型** 学到 **不同的** harness 补丁（各模型弱点不同）。翁荔提醒：**可编辑面** 和 **权限** 必须由 loop 外的人/design 定好——若允许改 verifier、换模型，等于破坏抽象边界，reward hacking 风险仍在。

**AHE：瓶颈在「看不清」，所以要三维可观测**
**Agentic Harness Engineering（AHE, Lin et al. 2026）** 和 Self-Harness 一样自动改 harness，但强调：**进化 loop 的卡点往往是可观测性（observability）**——一次 rollout 挂了，若说不清 **是 harness 里哪一块** 导致的，补丁就会瞎改（改 prompt 其实该改 tool 描述，或反过来），失败也无法沉淀成可复用证据。

AHE 用 **三根柱子** 把「看清 → 改对 → 验真」钉死：

**① Component observability（组件可观测）**
把 harness 拆成 **7 类可编辑组件**，每类在文件系统里有 **明确文件/目录**——system prompt、tool 描述、tool 实现、middleware、skill、sub-agent 配置、长期记忆等。每次失败模式 **尽量映射到单一组件**：「这类 timeout 多半来自 tool 描述不清」，而不是笼统「Agent 不行」。

**② Experience observability（经验可观测）**
每个 harness 配置跑多条 trace，raw 日志 **按任务一个文件** 存。再用 debugger agent 先写 **单任务根因报告**，再聚合成 **benchmark 总览**；需要时下钻 raw trace。这样进化 agent **不用** 把百万 token 轨迹全塞进 prompt，也能拿到 **分层证据**。

**③ Decision observability（决策可观测）**
每一次 harness edit 都是 **文件级、可证伪的声明**：引用了哪条失败证据、推断根因是什么、改哪一组件、 **预测** 下一轮哪些题会好、哪些题可能回归。下一轮 eval 用来 **验证预测**。同时 **硬隔离**：只能改 harness 工作区；runs 目录、tracer、verifier、LLM 配置 **只读**——防止「关 verifier、换更强模型」假装 harness 变好了（reward hacking）。

Terminal-Bench-2 上 AHE 报告优于多种 human-designed harness；**冻结** harness 迁到 SWE-bench Verified 仍有效——源文据此认为学到的是 **可迁移工程经验**，而非单 benchmark 过拟合。Hard tier 等仍有例外，读榜需看 tier 与 baseline。

**进化搜索：程序、prompt 与 harness 仓库**
进化搜索适合 **fitness（适应度）能自动打分** 的对象：程序对不对、kernel 快不快、通过率多少——分数清楚，才能「留下好的、淘汰差的」。

**AlphaEvolve：程序池 + LLM 写 diff**
**AlphaEvolve**（Novikov et al. 2025）把 **coding agent + 进化算法** 结合，优化的是 **程序代码**（也可以是算法片段），不是模型权重。

流程可以这么读：

- 
**候选程序池**
维护一批程序变体（population）。每个变体跑 eval，按分数留优、淘汰劣，再 **变异** 出下一代。

- 
**冻结 LLM 生成 diff**
大模型 **不改权重**（frozen），只当 **提案机**：读当前父程序、跑分结果、任务说明，输出 **代码 diff**（补丁），而不是每次重写整个仓库。

- 
**`# EVOLVE-BLOCK-START/END` 标记可改区域**
源码里用注释标出 **允许进化** 的区间；LLM **只能改块内代码**，块外保持稳定。避免「为了提分动到接口/测试框架」这类失控修改。

- 
**meta-prompt 与 solution 共进化**
**solution** = 被优化的程序；**meta-prompt** = 告诉 LLM「该怎么改、关注什么」的上层指令。两者 **一起进化**——不只程序在变，「怎么 mutate 程序」的提示也在变。
**适合什么任务？** 矩阵乘法、GPU kernel、调度算法等 **fitness 易量化** 的场景：能自动判对错、比快慢。eval 慢、标准模糊、靠人眼看的工作，进化 loop 很难高效运转——翁荔在后文「开放问题」里也会回到这一点。

**Promptbreeder / GEPA** 等走的是 **更窄的一条进化路**：优化对象主要是 **prompt 文本**（任务说明、变异指令等），不是整包 harness。

- **Promptbreeder**：用进化算法 **变异 prompt**；连「怎么变异 prompt 的 meta-prompt」也一起进化（self-referential）。
- **GEPA**：在 trial-and-error 的 **轨迹** 上做 **reflection（反思）**，让模型根据「哪步错了、为什么」 **提议 prompt 修改**，再与进化搜索结合选优。它们和 AlphaEvolve、Self-Harness、AHE **同一套路**：**LLM 或搜索算法提案 → 自动 eval 打分 → 留下好的、迭代坏的**。差别只在 **改的是什么**：

粒度典型工作改什么最细Promptbreeder / GEPA主要是 prompt 字句中AlphaEvolve程序代码（marked blocks）较粗Self-Harness / AHEharness 组件（prompt、tool、skill、middleware…）最粗DGM整份 harness 代码库

所以说「和 harness 全栈优化 **同一谱系、不同粒度**」：**方法论一样**（进化/搜索 + eval），**搜索空间大小不同**——只改 prompt 最便宜、最窄；改整包 harness 最贵、最宽。Prompt 进化可以看作 harness 自改进的 **子问题**，不是替代关系。

**DGM：进化整个 harness 代码库**
**Darwin Gödel Machine（DGM, Zhang et al. 2025）** 比 Self-Harness / AHE 更「整库」：**coding agent 可以改自己运行所依赖的那份 harness 源码**（tool  loop、脚本、配置组织方式等），而不只是改几个组件文件。模型权重 **固定**（实验里常用 Claude 3.5 Sonnet），变的是 **外面的 agent 实现**。

循环大致如下：

- 
**Agent pool（代理池）**
池里存多个 **coding agent 版本**，每个版本 = 一套 harness 代码 + 它在 benchmark 上的历史分数。

- 
**按性能选 parent**
每一轮从池里挑一个 **父代**：分数高的更容易被选中；已经 **生出很多子代** 的 parent 会被降权，避免一家独大、保持多样性。

- 
**读 benchmark log，自提案**
父代 agent **读自己的评测日志**（哪题过、哪题挂、错误类型），用 coding 工具（bash、读/写/编辑文件） **改自己的 harness 代码库**，产出一个 **新的 agent 版本**。

- 
**eval 通过后入库**
新 agent 在 benchmark 上 **重新跑分**；只有 **足够好** 的才 **加入 pool**，差的丢弃。如此反复，直到达到停止条件。
**实验结果（源文 setting）**：从 **简单初始 harness** 出发，在 SWE-bench Verified、Polyglot 等上有报告提升（例如 SWE-bench Verified 约 20%→50% 量级，Polyglot 约 14%→31% 量级——读数字务必回原文图表与初始配置）。

**和 AlphaEvolve 一样的域限制**：**自动 eval 又快又清楚** 时，进化 loop 才转得动——单元测试、通过率、可重复 benchmark 属于这类。eval **很慢**（一次要跑几小时）、**很模糊**（靠人眼看「像不像科学」）的任务，pool 很难快速筛优劣，DGM 也会 **struggle（吃力）**。这和翁荔后文「弱 verifier 是 RSI 瓶颈」是同一逻辑。

**与权重联合优化：方向有趣，证据仍薄**
前面几节都在改 **harness（部署层）**，**不动模型权重**。**SIA**（Self Improving AI, Hebbar et al. 2026）尝试把两条路 **放进同一个 loop**：这一轮失败，究竟 **改 harness**，还是 **改模型权重**（通过训练 pipeline 或 continual learning 等）？

SIA 有三个角色：

- **Meta-Agent**：提出 **初始 harness**
- **Task-Specific Agent**：在 harness 下 **干具体任务**
- **Feedback-Agent**：读最近若干条 **trajectory（轨迹）**，决定下一轮 **更新 harness 还是更新权重**也就是说，Feedback-Agent 像 **分叉开关**：外挂工程不够就调 harness；觉得瓶颈在模型能力就触发权重更新——理论上接近「完整 RSI」：外面和里面都能动。

翁荔 **明确降调** 这篇的证据，理由大致三条：

- **干活模型远弱于决策模型**——Task Agent 用的模型比 Meta / Feedback 弱很多（源文对比里 task 侧与 meta/feedback 侧 **不是同一量级**），很难分清提升来自「harness 改对了」还是「决策/执行模型本来就不匹配」。
- **baseline 偏弱**——对照组设置简单，和 Self-Harness、AHE 等 **不好横向比**。
- **结论难解读（hard to interpret）**——同一 loop 里两种更新混在一起，很难归因。她的结论是：**方向值得继续看**（harness 与权重不必永远二选一），但 **证据尚不充分（evidence provisional）**；训练稳定性、Goodhart 效应等仍是开放问题。读 SIA 宜当 **概念演示**，不宜当「已经跑通的完整 RSI 方案」。

**边界：科学 Agent 与开放问题**
翁荔肯定 AI Scientist 一类工作，但写论文不等于科学发现。Trehan & Chopra (2026) 用极简工具尝试自主研究：专家只选少量 idea 跑全流程，仅一例完整成稿。六种 recurring failure 包括：训练数据默认偏见、实现 drift、长程 memory 退化、过度乐观（噪声仍 declare success）、领域 craft 不足、科学品味弱。

走向完整 RSI 仍要面对：eval 弱且 fuzzy、context/memory 生命周期、negative results 难保留、diversity collapse、reward hacking（evaluator 宜在 loop 外）、coding agent 对 repo 长期健康关注不足、以及 human oversight 应上移栈——翁荔列出的开放题并未闭合。她的判断是：自改进 loop 在可测 objective 上最顺；研究品味与长期价值难 verifier；人不应被移出 loop。

**收尾**
翁荔这篇把 auto-research、self-improving agent、evolutionary search 收拢到 harness engineering 与 RSI：近 term 更现实的是改部署系统与优化器；优化对象正从 prompt 滑向 workflow 与 harness 代码；层层 meta 的趋势与 Lin 两轴分解、STOP 的弱模型 caution 并存——会改 harness 不等于任务变好，eval 与权限必须是外环。

若你在做 Agent 产品，可对照：durable state 是否在文件而非 chat；失败能否定位到单一 harness 组件；进化 loop 是否只读 verifier 与模型配置。Anthropic 长程 harness 管 **下一棒交接**；翁荔这篇管 **harness 能否、以及如何被自动改进**。

**延伸阅读**

- Harness Engineering for Self-Improvement — Lil&#39;Log
- Effective harnesses for long-running agents — Anthropic Engineering
- Building effective agents — Anthropic Engineering