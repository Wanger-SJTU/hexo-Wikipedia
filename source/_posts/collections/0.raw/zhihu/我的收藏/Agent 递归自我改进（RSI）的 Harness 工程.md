---
title: Agent 递归自我改进（RSI）的 Harness 工程
date: "2026-08-02 00:00:00"
updated: "2026-08-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Agent-递归自我改进(RSI)的-Harness-工程/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2067214030054467237
---


原文标题：Harness Engineering for Self-Improvement（翁荔, Lil'Log, 2026-07）。

翁荔的这篇长文 从一个老问题切入：<strong>递归自我改进（RSI）</strong>——系统用现有能力去改进「产生能力的机制」。Good (1965) 谈 ultraintelligent machine，Yudkowsky (2008) 把 RSI 说成明确的反馈环。翁荔在当下的理解是：改进不一定等于 <strong>模型当场改写权重</strong>；更现实的路径包括改 <strong>训练 pipeline</strong>、改 <strong>部署系统</strong>，从而得到更强的后继模型。她特意强调，<strong>部署系统</strong>——从基座模型到真实任务之间的那一层——重要性可能不亚于预训练结束时的 eval；Claude Code、Codex 等产品，价值大量在 <strong>harness</strong> 里。

若你读过 Anthropic 的 长程 agent harness，那篇讲的是长任务里用 git、进度文件、feature list 做 <strong>轮次交接</strong>。翁荔这篇问的是另一件事：harness 怎么参与 <strong>自我改进</strong>，以及优化对象怎样从 prompt 迁到 workflow、再迁到 harness 代码与搜索。

<strong>Harness 是什么：早年的「Agent = LLM + 工具」不够用了</strong>
早期 agent 框架常写成：<strong>LLM + memory + tools + planning + action</strong>。翁荔认为，<strong>harness engineering</strong> 还要加上：workflow 设计（含 loop engineering）、evaluation、权限控制、持久状态管理——更接近 <strong>运行时与软件系统设计</strong>：模型如何观察、行动、记忆、自检、迭代。

设计宜 <strong>刻意保持简单、通用</strong>，以便泛化；她借 <strong>操作系统</strong> 类比：复杂逻辑封装在系统内，接口保持简单；工具协议、配置格式也在走向行业标准化。

对工程师而言，一个可操作的定义是：<strong>harness = 包裹 base model 的部署系统</strong>——决定它如何思考与规划、如何调工具、如何感知与管理上下文、如何存 artifact、如何用 verifier 评结果。它和「写一段 system prompt」不是同一层东西；prompt 往往是 harness 里的一小块可编辑面。

<strong>三个反复出现的设计模式</strong>
<strong>Pattern 1：Workflow automation。</strong> 给模型一条可 plan → execute → observe/test → improve 的闭环，直到目标达成或向用户澄清。Karpathy 的 autoresearch 被当作干净范例：目标导向 loop，而不是静态 prompt 模板。Codex agent 一类产品也是 tool 调用 → tool 结果回灌 context → 再生成的循环；关键在 <strong>agent runtime</strong> 里分析自己的 trajectory 与失败，而非一次性 prompt。

<strong>Pattern 2：File system as persistent memory。</strong> 长程 rollout 里，实验日志、diff、论文摘要、错误栈、历史 trajectory 往往长于模型训练时的 context 习惯。Harness 不应把全流程塞进 context，而应把 durable state 放在文件里；读写在文件系统上（常见经 bash）是 foundation skill，也会随 core model 变强而受益。

<strong>Pattern 3：Sub-agent and backend jobs。</strong> 主 agent 可并行 spawn 子 agent、挂后台任务，父进程像小型 process manager：启动、看 log、取消失败 run、把结果合并回主线程。设计要点是并行 <strong>可 inspect</strong>：子 agent 输出若只留在 transient chat 里会迅速不可见；落成文件、日志、状态记录，中断后才能恢复并在执行史上继续推理。

<strong>Coding agent 的稳定接口。</strong> 翁荔用 Claude Code、Codex、OpenCode、Cursor 一类产品说明：核心 loop 已趋同——文件发现/读写/patch、shell、git、MCP/Skills、web、子 agent 调度等。工具面与 loop 已趋同，差别主要在 harness 策略与 eval 设计。

<strong>优化对象在迁移：从 prompt 到 harness 代码</strong>
翁荔给出一条粗粒度 progression：<strong>instruction prompts → structured context → workflow → harness code → optimizer code</strong>。模型越强，越值得把优化目标抬到更复杂、更 generic 的结构上——这与 prompt engineering 的经验一致：手工 trick 的重要性下降，但目标、约束、上下文、评估并未消失，只是被系统化了。

她预测 near-term RSI 路径大概是：其一，harness 朝 <strong>meta-methodology</strong> 演化——改进的是「得到更好答案的机器」，而不只是单次答案；少堆人工特例（heuristic），多靠可复用的通用机制（验收循环、有界编辑、状态落盘、对 harness 做搜索/进化等）。其二，成熟的 harness 支撑 auto-research 与模型改进 loop；更强的模型又反过来避免 harness 过度工程化，维持可持续。

长远看，部分 harness 行为可能被内化进模型；但与外部工具、环境的接口仍会存在——类似 instruction tuning 后仍要指定任务与验收。

<strong>上下文工程：从 playbook 到「优化 harness 的 harness」</strong>
长程 Agent 的 context 很容易越堆越长——tool 输出、历史对话、中间结论全塞进 prompt，很快爆窗，且反复让模型「重写整段 system prompt」时，常见两种退化：<strong>context collapse</strong>（旧要点被挤没）和 <strong>brevity bias</strong>（越改越短、丢细节）。下面三条研究线，都是在改 <strong>怎么维护 context</strong>，而不只是多塞字。

<strong>ACE：把 context 当成「可增删的操作手册」</strong>
<strong>Agentic Context Engineering（ACE, Zhang et al. 2025）</strong> 不把 context 当作一整块 prompt，而当作 <strong>playbook（操作手册）</strong>：许多条独立要点，每条有编号和说明，像 `(identifier, description)`。

三个角色分工如下：

<strong>Generator（执行）</strong> 拿着 <strong>当前手册</strong> 去跑真实任务，留下完整 <strong>trajectory</strong>（轨迹）——从接到任务到结束的全过程记录：调了哪些 tool、哪步失败、最后 verifier 过没过。

<strong>Reflector（复盘）</strong> 读这些轨迹，从 <strong>成功和失败</strong> 里提炼经验，例如「这类错误常因没先读 log」「某类任务要先查 X 再写 Y」，输出可写入手册的 <strong>insight</strong>。

<strong>Curator（更新手册）</strong> 负责改 playbook，但 <strong>禁止</strong> 让模型把整本手册重写一遍。它只做 <strong>增量更新</strong>：新增或修订一条条 `(编号, 说明)`；再用 <strong>deterministic merge</strong>（按固定程序规则合并条目，不靠 LLM 自由发挥重写全文）；并 <strong>周期性 dedupe</strong>（去掉重复、过时条目）。这样 playbook 会随任务演化，又不容易越改越空。

<strong>MCE：外层进化「怎么管 context」，内层填「context 里有什么」</strong>
<strong>Meta Context Engineering（MCE, Ye et al. 2026）</strong> 在 ACE 之上再拆两层：

- <strong>机制</strong>：用什么流程维护 context（检索、筛选、格式化、写文件等）
- <strong>内容</strong>：具体 prompt 片段、知识库、代码库、rollout 数据等一个 <strong>skill</strong> 定义一套 context 函数：静态部分 (\rho)（prompt、知识库、代码库等）加动态算子 (F)（检索、筛选、格式化等）。<strong>内层优化</strong> 在训练集上，固定某个 skill，把 context 内容调到最好；<strong>外层优化</strong> 在验证集上，从多个 skill 里选 <strong>管 context 的方式</strong> 最好的一套。meta-agent 还会对历史 skill 做 <strong>crossover</strong>（交叉组合），生成新 skill；base-level agent 根据 rollout 反馈更新具体 context。

实现上，context 常是 <strong>目录里的一组文件</strong>（例如 `skill.md` 加 rollout 数据）；meta 层和 base 层都在 Read/Write/Edit/Bash 等 coding agent 工具里完成，而不是只改一段 chat prompt。

<strong>Meta-Harness：优化「决定存什么、取什么的代码」</strong>
<strong>Meta-Harness（Lee et al. 2026）</strong> 再深一层：优化对象不再是 context 条目本身，而是 <strong>决定哪些信息写入、读取、如何呈现给模型的 harness 代码</strong>——即「优化 harness 的 harness」。Proposer 本身是 coding agent；每个候选 harness 在文件系统里，含源码、分数、trajectory、状态更新；外层 loop 不断生成新候选，只保留 <strong>Pareto 前沿</strong> 上合格的。执行历史放在文件里，用 grep/cat 按需读，而不是全部塞进一个 prompt。Terminal-Bench-2 实验从 <strong>已经很强的 harness 种子</strong> 起步——读提升数字时要记得 baseline 不低。

三条线的递进关系：ACE 用 <strong>固定三角色流程</strong> 维护条目化 playbook；MCE 让 <strong>维护 context 的 skill 本身</strong> 也可搜索、进化；Meta-Harness 把 <strong>整段 harness 逻辑</strong> 放进可搜索的代码空间。共同点是：harness 设计一旦可执行、可 eval，强 coding agent 就能在人工程师同一套 design space 里搜索——但 ACE 的更新规则仍偏人工设定，后两者才把「改机制」推得更自动化。

<strong>Workflow 搜索：从手工 pipeline 到 meta-agent 写代码</strong>
领域专家仍可手工设计 workflow。翁荔举 AI Scientist（Lu et al. 2026）：提案、写码、实验、分析、写稿、审稿；ScientistOne（Meng et al. 2026）强调可验证性与 chain-of-evidence。Autodata（Kulikov et al. 2026）用 challenger / weak solver / strong solver / verifier 合成「难度刚好」的数据——weak 失败、strong 成功；原文指出局限：若 loop 不能迭代改进 strong model，更像间接蒸馏，RSI 味道较淡。

当 workflow 设计空间过大，就把它形式化为搜索。<strong>ADAS</strong>（Hu et al. 2025）用 archive 存 workflow，meta-agent 用代码提案新 agent，self-refine 查新颖性，eval 后回填。<strong>AFlow</strong>（Zhang et al. 2025）把 workflow 表示为图，用 MCTS 扩展与评估；在 QA、代码、数学任务上报告相对手工 workflow 与 ADAS 的提升——仍是特定 benchmark setting，不宜 extrapolate 到所有 Agent 产品。

<strong>自改进 harness：改「改进器」、可观测、与有界编辑</strong>
<strong>Self-Taught Optimizer（STOP, Zelikman et al. 2023）</strong> 是较早的「递归改脚手架」例子。先分清两层对象：

- <strong>任务解</strong>：某道题当前的答案（一段代码、一个方案等）
- <strong>改进器（improver）</strong>：一段程序或 prompt 流程，输入「当前解 + 评分标准」，输出 <strong>更好的解</strong>STOP <strong>不</strong> 只盯着把某一道题的答案打磨到最好，而是让 <strong>改进器本身</strong> 变强：在一大批下游任务上，看「用这个改进器改出来的解，平均能拿多少分」——这叫 <strong>meta-utility（元效用）</strong>；优化目标就是把这个 <strong>平均分</strong> 抬高。更新也递归：用上一代的改进器，去 <strong>改进</strong> 下一代改进器。

实验里，进化后的改进器会自动「长出」遗传搜索、问题分解、bandit 选 prompt、模拟退火等策略——说明 <strong>workflow 本身</strong> 也可以被当成搜索对象。原文 caveat：GPT-4 上平均表现随迭代上升，<strong>GPT-3.5 / Mixtral 上 meta-utility 反而下降</strong>——光有递归结构不够，base model 得足够强才撑得住「改机制」；harness 能释放部署潜力，但 <strong>模型智力仍是底座</strong>。

<strong>Harness updating 与 harness benefit（Lin et al. 2026）</strong> 把「自我进化 harness」拆成 <strong>两轴能力</strong>，不要混为一谈：

轴问的是什么类比updating（会不会改）模型能不能 提出有用的 harness 编辑——改 system prompt、写 skill、调 tool 描述、补 workflow 步骤等会不会 改操作手册benefit（会不会用）换上手 更新后的 harness，跑 长程任务 时，分数/通过率是否真的 变好会不会 按新手册正确干活

Lin 的实验现象 counter-intuitive：<strong>updating</strong> 从 Qwen3.5-9B 到 Claude Opus 4.6 <strong>曲线几乎拉平</strong>——9B 也能写出与 Opus <strong>结构同构</strong> 的 skill（改法看起来像样）。但 <strong>benefit非单调</strong>：往往 <strong>中间档模型提升最大</strong>——太大可能本来就会，太小可能 tool 调用、长程跟随跟不上新 harness。

所以对 Agent 产品的含义：<strong>「小模型也能写 harness patch」≠「小模型跑起来就更强」</strong>；进化 loop 里既要评 <strong>改得好不好</strong>，也要在 <strong>目标模型</strong> 上评 <strong>用不用得上</strong>。会用仍是瓶颈。

<strong>Self-Harness：挖弱点 → 有界改 harness → 回归验收</strong>
<strong>Self-Harness（Zhang et al. 2026）</strong> 让 Agent <strong>改自己的 harness</strong>，但每一步都有边界，避免乱改一整包配置。三步如下：

<strong>第一步：Weakness mining（挖弱点）</strong>
用 <strong>当前 harness</strong> 在任务集上跑 eval，收集 <strong>trace（执行轨迹）</strong>。Verifier 只告诉你过/不过（例如 timeout、缺 artifact），<strong>同一种失败表象</strong> 可能有 <strong>不同根因</strong>——一次是真不会调 tool，一次是 prompt 没要求先读 log。所以要存 <strong>足够 rich 的失败记录</strong>（verifier 判词 + 行为因果 + 抽象机制标签），再 <strong>聚类</strong> 成若干 <strong>失败模式</strong>，且每个模式都能追溯到 verifier，而不是模型自说自话。

<strong>第二步：Bounded harness proposal（有界提案）</strong>
同一个模型在 <strong>可编辑面</strong> 内提案改 harness——例如只允许改 system prompt 某段、某个 skill 文件，<strong>不能</strong> 动 verifier、换模型、改 reasoning budget。提案上下文 <strong>有界</strong>，通常包括四块：① 当前哪些文件/组件能改；② 上一步挖出的失败模式；③ 哪些 <strong>已通过</strong> 的行为必须保留；④ 以前改翻过、效果如何的摘要。优先改 <strong>反复出现、且窄修改能修</strong> 的模式，并产出 <strong>彼此不同</strong> 的若干候选 patch。

<strong>第三步：Proposal validation（验收合并）</strong>
每个候选 patch 都要 <strong>回归测试</strong>，分两套数据：<strong>held-in</strong>（原来失败的那批）看弱点有没有缓解；<strong>held-out</strong>（别的题）看有没有 <strong>引入新问题</strong>。只有 <strong>两边都不退化</strong> 才 merge 进下一代 harness；否则只记日志， <strong>不动</strong> 线上 harness。

在 Terminal-Bench-2 上，Self-Harness 能为 <strong>不同 base 模型</strong> 学到 <strong>不同的</strong> harness 补丁（各模型弱点不同）。翁荔提醒：<strong>可编辑面</strong> 和 <strong>权限</strong> 必须由 loop 外的人/design 定好——若允许改 verifier、换模型，等于破坏抽象边界，reward hacking 风险仍在。

<strong>AHE：瓶颈在「看不清」，所以要三维可观测</strong>
<strong>Agentic Harness Engineering（AHE, Lin et al. 2026）</strong> 和 Self-Harness 一样自动改 harness，但强调：<strong>进化 loop 的卡点往往是可观测性（observability）</strong>——一次 rollout 挂了，若说不清 <strong>是 harness 里哪一块</strong> 导致的，补丁就会瞎改（改 prompt 其实该改 tool 描述，或反过来），失败也无法沉淀成可复用证据。

AHE 用 <strong>三根柱子</strong> 把「看清 → 改对 → 验真」钉死：

<strong>① Component observability（组件可观测）</strong>
把 harness 拆成 <strong>7 类可编辑组件</strong>，每类在文件系统里有 <strong>明确文件/目录</strong>——system prompt、tool 描述、tool 实现、middleware、skill、sub-agent 配置、长期记忆等。每次失败模式 <strong>尽量映射到单一组件</strong>：「这类 timeout 多半来自 tool 描述不清」，而不是笼统「Agent 不行」。

<strong>② Experience observability（经验可观测）</strong>
每个 harness 配置跑多条 trace，raw 日志 <strong>按任务一个文件</strong> 存。再用 debugger agent 先写 <strong>单任务根因报告</strong>，再聚合成 <strong>benchmark 总览</strong>；需要时下钻 raw trace。这样进化 agent <strong>不用</strong> 把百万 token 轨迹全塞进 prompt，也能拿到 <strong>分层证据</strong>。

<strong>③ Decision observability（决策可观测）</strong>
每一次 harness edit 都是 <strong>文件级、可证伪的声明</strong>：引用了哪条失败证据、推断根因是什么、改哪一组件、 <strong>预测</strong> 下一轮哪些题会好、哪些题可能回归。下一轮 eval 用来 <strong>验证预测</strong>。同时 <strong>硬隔离</strong>：只能改 harness 工作区；runs 目录、tracer、verifier、LLM 配置 <strong>只读</strong>——防止「关 verifier、换更强模型」假装 harness 变好了（reward hacking）。

Terminal-Bench-2 上 AHE 报告优于多种 human-designed harness；<strong>冻结</strong> harness 迁到 SWE-bench Verified 仍有效——源文据此认为学到的是 <strong>可迁移工程经验</strong>，而非单 benchmark 过拟合。Hard tier 等仍有例外，读榜需看 tier 与 baseline。

<strong>进化搜索：程序、prompt 与 harness 仓库</strong>
进化搜索适合 <strong>fitness（适应度）能自动打分</strong> 的对象：程序对不对、kernel 快不快、通过率多少——分数清楚，才能「留下好的、淘汰差的」。

<strong>AlphaEvolve：程序池 + LLM 写 diff</strong>
<strong>AlphaEvolve</strong>（Novikov et al. 2025）把 <strong>coding agent + 进化算法</strong> 结合，优化的是 <strong>程序代码</strong>（也可以是算法片段），不是模型权重。

流程可以这么读：

- 
<strong>候选程序池</strong>
维护一批程序变体（population）。每个变体跑 eval，按分数留优、淘汰劣，再 <strong>变异</strong> 出下一代。

- 
<strong>冻结 LLM 生成 diff</strong>
大模型 <strong>不改权重</strong>（frozen），只当 <strong>提案机</strong>：读当前父程序、跑分结果、任务说明，输出 <strong>代码 diff</strong>（补丁），而不是每次重写整个仓库。

- 
**`# EVOLVE-BLOCK-START/END` 标记可改区域**
源码里用注释标出 <strong>允许进化</strong> 的区间；LLM <strong>只能改块内代码</strong>，块外保持稳定。避免「为了提分动到接口/测试框架」这类失控修改。

- 
<strong>meta-prompt 与 solution 共进化</strong>
<strong>solution</strong> = 被优化的程序；<strong>meta-prompt</strong> = 告诉 LLM「该怎么改、关注什么」的上层指令。两者 <strong>一起进化</strong>——不只程序在变，「怎么 mutate 程序」的提示也在变。
<strong>适合什么任务？</strong> 矩阵乘法、GPU kernel、调度算法等 <strong>fitness 易量化</strong> 的场景：能自动判对错、比快慢。eval 慢、标准模糊、靠人眼看的工作，进化 loop 很难高效运转——翁荔在后文「开放问题」里也会回到这一点。

<strong>Promptbreeder / GEPA</strong> 等走的是 <strong>更窄的一条进化路</strong>：优化对象主要是 <strong>prompt 文本</strong>（任务说明、变异指令等），不是整包 harness。

- <strong>Promptbreeder</strong>：用进化算法 <strong>变异 prompt</strong>；连「怎么变异 prompt 的 meta-prompt」也一起进化（self-referential）。
- <strong>GEPA</strong>：在 trial-and-error 的 <strong>轨迹</strong> 上做 <strong>reflection（反思）</strong>，让模型根据「哪步错了、为什么」 <strong>提议 prompt 修改</strong>，再与进化搜索结合选优。它们和 AlphaEvolve、Self-Harness、AHE <strong>同一套路</strong>：<strong>LLM 或搜索算法提案 → 自动 eval 打分 → 留下好的、迭代坏的</strong>。差别只在 <strong>改的是什么</strong>：

粒度典型工作改什么最细Promptbreeder / GEPA主要是 prompt 字句中AlphaEvolve程序代码（marked blocks）较粗Self-Harness / AHEharness 组件（prompt、tool、skill、middleware…）最粗DGM整份 harness 代码库

所以说「和 harness 全栈优化 <strong>同一谱系、不同粒度</strong>」：<strong>方法论一样</strong>（进化/搜索 + eval），<strong>搜索空间大小不同</strong>——只改 prompt 最便宜、最窄；改整包 harness 最贵、最宽。Prompt 进化可以看作 harness 自改进的 <strong>子问题</strong>，不是替代关系。

<strong>DGM：进化整个 harness 代码库</strong>
<strong>Darwin Gödel Machine（DGM, Zhang et al. 2025）</strong> 比 Self-Harness / AHE 更「整库」：<strong>coding agent 可以改自己运行所依赖的那份 harness 源码</strong>（tool  loop、脚本、配置组织方式等），而不只是改几个组件文件。模型权重 <strong>固定</strong>（实验里常用 Claude 3.5 Sonnet），变的是 <strong>外面的 agent 实现</strong>。

循环大致如下：

- 
<strong>Agent pool（代理池）</strong>
池里存多个 <strong>coding agent 版本</strong>，每个版本 = 一套 harness 代码 + 它在 benchmark 上的历史分数。

- 
<strong>按性能选 parent</strong>
每一轮从池里挑一个 <strong>父代</strong>：分数高的更容易被选中；已经 <strong>生出很多子代</strong> 的 parent 会被降权，避免一家独大、保持多样性。

- 
<strong>读 benchmark log，自提案</strong>
父代 agent <strong>读自己的评测日志</strong>（哪题过、哪题挂、错误类型），用 coding 工具（bash、读/写/编辑文件） <strong>改自己的 harness 代码库</strong>，产出一个 <strong>新的 agent 版本</strong>。

- 
<strong>eval 通过后入库</strong>
新 agent 在 benchmark 上 <strong>重新跑分</strong>；只有 <strong>足够好</strong> 的才 <strong>加入 pool</strong>，差的丢弃。如此反复，直到达到停止条件。
<strong>实验结果（源文 setting）</strong>：从 <strong>简单初始 harness</strong> 出发，在 SWE-bench Verified、Polyglot 等上有报告提升（例如 SWE-bench Verified 约 20%→50% 量级，Polyglot 约 14%→31% 量级——读数字务必回原文图表与初始配置）。

<strong>和 AlphaEvolve 一样的域限制</strong>：<strong>自动 eval 又快又清楚</strong> 时，进化 loop 才转得动——单元测试、通过率、可重复 benchmark 属于这类。eval <strong>很慢</strong>（一次要跑几小时）、<strong>很模糊</strong>（靠人眼看「像不像科学」）的任务，pool 很难快速筛优劣，DGM 也会 <strong>struggle（吃力）</strong>。这和翁荔后文「弱 verifier 是 RSI 瓶颈」是同一逻辑。

<strong>与权重联合优化：方向有趣，证据仍薄</strong>
前面几节都在改 <strong>harness（部署层）</strong>，<strong>不动模型权重</strong>。<strong>SIA</strong>（Self Improving AI, Hebbar et al. 2026）尝试把两条路 <strong>放进同一个 loop</strong>：这一轮失败，究竟 <strong>改 harness</strong>，还是 <strong>改模型权重</strong>（通过训练 pipeline 或 continual learning 等）？

SIA 有三个角色：

- <strong>Meta-Agent</strong>：提出 <strong>初始 harness</strong>
- <strong>Task-Specific Agent</strong>：在 harness 下 <strong>干具体任务</strong>
- <strong>Feedback-Agent</strong>：读最近若干条 <strong>trajectory（轨迹）</strong>，决定下一轮 <strong>更新 harness 还是更新权重</strong>也就是说，Feedback-Agent 像 <strong>分叉开关</strong>：外挂工程不够就调 harness；觉得瓶颈在模型能力就触发权重更新——理论上接近「完整 RSI」：外面和里面都能动。

翁荔 <strong>明确降调</strong> 这篇的证据，理由大致三条：

- <strong>干活模型远弱于决策模型</strong>——Task Agent 用的模型比 Meta / Feedback 弱很多（源文对比里 task 侧与 meta/feedback 侧 <strong>不是同一量级</strong>），很难分清提升来自「harness 改对了」还是「决策/执行模型本来就不匹配」。
- <strong>baseline 偏弱</strong>——对照组设置简单，和 Self-Harness、AHE 等 <strong>不好横向比</strong>。
- <strong>结论难解读（hard to interpret）</strong>——同一 loop 里两种更新混在一起，很难归因。她的结论是：<strong>方向值得继续看</strong>（harness 与权重不必永远二选一），但 <strong>证据尚不充分（evidence provisional）</strong>；训练稳定性、Goodhart 效应等仍是开放问题。读 SIA 宜当 <strong>概念演示</strong>，不宜当「已经跑通的完整 RSI 方案」。

<strong>边界：科学 Agent 与开放问题</strong>
翁荔肯定 AI Scientist 一类工作，但写论文不等于科学发现。Trehan & Chopra (2026) 用极简工具尝试自主研究：专家只选少量 idea 跑全流程，仅一例完整成稿。六种 recurring failure 包括：训练数据默认偏见、实现 drift、长程 memory 退化、过度乐观（噪声仍 declare success）、领域 craft 不足、科学品味弱。

走向完整 RSI 仍要面对：eval 弱且 fuzzy、context/memory 生命周期、negative results 难保留、diversity collapse、reward hacking（evaluator 宜在 loop 外）、coding agent 对 repo 长期健康关注不足、以及 human oversight 应上移栈——翁荔列出的开放题并未闭合。她的判断是：自改进 loop 在可测 objective 上最顺；研究品味与长期价值难 verifier；人不应被移出 loop。

<strong>收尾</strong>
翁荔这篇把 auto-research、self-improving agent、evolutionary search 收拢到 harness engineering 与 RSI：近 term 更现实的是改部署系统与优化器；优化对象正从 prompt 滑向 workflow 与 harness 代码；层层 meta 的趋势与 Lin 两轴分解、STOP 的弱模型 caution 并存——会改 harness 不等于任务变好，eval 与权限必须是外环。

若你在做 Agent 产品，可对照：durable state 是否在文件而非 chat；失败能否定位到单一 harness 组件；进化 loop 是否只读 verifier 与模型配置。Anthropic 长程 harness 管 <strong>下一棒交接</strong>；翁荔这篇管 <strong>harness 能否、以及如何被自动改进</strong>。

<strong>延伸阅读</strong>

- Harness Engineering for Self-Improvement — Lil'Log
- Effective harnesses for long-running agents — Anthropic Engineering
- Building effective agents — Anthropic Engineering