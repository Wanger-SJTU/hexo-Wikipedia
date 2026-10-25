---
title: 从 Claude Code 看 Harness Engineer 的设计
date: "2026-04-13 00:00:00"
updated: "2026-04-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/从-Claude-Code-看-Harness-Engineer-的设计/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2021603278606087058
---


几乎每一个认真用过 Claude Code 的人，都经历过同一个阶段：开始疯狂往 CLAUDE.md 里写东西。

起因通常是某一次 Claude 做出了一个”不应该犯的低级错误”——直接 push 到了 main 分支，改了不该改的配置文件，用 npm 而不是 bun，在没有跑测试的情况下声明”完成”。你当下的反应很自然：把这条规矩写进去，让 Claude 记住。

于是 CLAUDE.md 开始膨胀。从几行变成几十行，再变成几百行，覆盖各种”下次不能再犯的错误”。

然后你发现：它还是会犯。

不完全是同一个错误，而是变种——你在 CLAUDE.md 里写了”不要直接 push”，它不直接 push 了，但开始在奇怪的时机 commit；你写了”必须先跑测试”，它跑了测试，但跑的是一个不相关的测试文件。这种感觉很像在管一个永远找到漏洞的实习生。

你的第一反应也许是：这个模型不够好，换一个更强的试试。

但换了之后，同样的问题出现了，只是犯错的方式更隐蔽了。

这时候你开始意识到一件事：<strong>问题不在 prompt，也不在模型。问题在别的地方。</strong>

这个”别的地方”，就是 Harness Engineering 想讲的东西。

Harness 是马具。马具不让马跑得更快，但它精确地将马的能量引导到正确方向，防止失控，让骑手保持控制权。Harness Engineering 对 LLM 的作用同理：不提升模型能力，而是设计<strong>让模型能力被可靠驾驭的运行系统</strong>。

CLAUDE.md 写得再好，本质上仍然是语言请求——你在用文字告诉一个语言模型”应该怎么做”。语言请求是概率性的，它的可靠性随着任务复杂度和 context 长度的增加而衰减。你往 CLAUDE.md 里堆的每一条规则，都在跟 context 的自然遗忘赛跑。

真正的 Harness 设计，是用<strong>系统结构</strong>来保证行为，而不是用语言描述来期望行为。

Claude Code 是理解这件事的一个难得入口——因为它是一个<strong>把自己的 Harness 设计暴露给用户的系统</strong>。MCP、Skill、Hook、Subagent，这四个机制不是随意叠加的功能，而是 Anthropic 工程团队把 Harness Engineering 的核心原则编码进产品的结果。

把这四个机制的设计逻辑读懂，你就读懂了 Harness Engineering 实际上在解决什么问题。

### 第一个洞察：能力边界应该由架构决定

用 Claude Code 一段时间后，很多人会开始加 MCP Server——GitHub、数据库、内部服务……

但一开始加 MCP 的动机，通常是”让 Claude 能做更多事”。这个出发点是对的，但只理解了 MCP 的一半价值。

MCP 更深的价值，是它划出的<strong>边界</strong>，而不是它提供的能力。

没有 MCP 时，Claude 要连接数据库，它会自己想办法——推断连接字符串的格式，猜认证方式，自己拼 SQL 查询。这个过程不一定会出错，但每次执行路径都是 Claude 现场推断出来的，这意味着它是不确定的、不可重现的。

加了 MCP 之后，Claude 调用 `query_database(sql: string)` 就够了。它不需要知道数据库在哪、怎么认证、连接失败怎么处理。这些实现细节在 MCP Server 里，是确定性的代码，不是概率性的推理。

这就是 Harness Engineering 的第一条原则：<strong>工具的接口是 Agent 与外部世界的契约，这个契约必须由你来定义，不能交给 Agent 自由推断。</strong>

更反直觉的一面是：MCP 工具集的设计，也是在主动限制 Claude 的行动范围。Claude 没有 `delete_user_data` 这个工具，这个操作就在技术层面不可能发生——不是因为你在 prompt 里写了”不要删除用户数据”，而是因为这个能力根本不存在于工具集里。<strong>能力边界即架构边界</strong>。这和软件工程里的最小权限原则是同一件事，只是被应用到了 Agent 的工具设计上。

还有一个容易忽视的细节：MCP 工具的返回值，是被注入 Claude context 的数据。一个返回完整数据库记录的工具，会把大量无用信息塞进 context，污染后续推理，加速 context 窗口的消耗。好的 MCP 工具在服务端完成信息筛选，只返回 Claude 这次真正需要的内容。<strong>工具的出口设计和入口设计同样重要</strong>，这是 Harness 工具层的完整职责，不是实现细节。

### 第二个洞察：你脑子里的知识，Claude 不知道

加了 MCP，Claude 有了可靠的工具。但你发现它还是经常做出”不符合你们团队习惯”的决定——用了你们已经废弃的 API 版本，没有遵循 Repository 模式，写了和你们代码风格完全不同的注释……

这时候你通常会做的事，是把这些规范补进 CLAUDE.md。

这个方向是对的，但 CLAUDE.md 不是最好的载体。

Harness Engineering 里有一个洞察：<strong>每一次 Agent 的失败，都是某条隐性知识还没有被显式编码进系统的信号。</strong> 工程团队的大量知识是隐性的——存在于老成员的脑子里，存在于约定俗成的习惯里，存在于代码 review 时的口头反馈里。这些知识不写在文档里，Claude 当然不知道。但如果把它们堆进 CLAUDE.md，它会变成一个巨大的、所有场景共用的全局文档，每次会话都要全量加载，和具体任务无关的规范也在占用 context。

Skill 是更好的答案。Skill 文件存放在 `.claude/skills/` 目录里，随代码库版本控制，只在触发相关任务时才被加载。你可以把”写 API 端点时的规范”、”处理生产告警时的排查流程”、”提交 PR 时的检查清单”各自写成独立的 Skill——每个 Skill 只在需要它的时候出现，不会互相污染。

Skill 还有一个强大的特性：`!`shell command`` 语法在 Skill 加载时先执行 shell 命令，把输出注入进来。这意味着 Skill 可以感知当前的系统状态——告警列表、服务健康状况、当前 git 分支——在 Claude 开始推理之前，Harness 已经把它需要知道的世界状态注入进去了。

<strong>Skill 的本质，是把组织的隐性知识显式化为可执行的规范，并精确地在需要它的时候注入。</strong> OpenAI 内部有个项目，团队设置了一条极端约束：禁止任何人手动输入代码。这条约束的真实效果是倒逼——当你绝对不能自己动手时，你必须把所有隐性的工程知识显式地写进系统，否则 Agent 根本无法工作。Skill 机制背后的设计哲学和这条约束是一样的：让你没有藏着隐性知识不写进系统的余地。

### 第三个洞察：把”希望”变成”强制”

到这里，你已经有了 MCP（可靠的工具）和 Skill（精准的规范）。Claude 应该能做得很好了。

但你仍然会偶尔遇到：Claude 说”完成了”，但你一检查，测试没有跑，或者跑了错误的测试集。

原因在于：<strong>“请确保测试通过”是语言请求，而不是机械约束。</strong> 语言请求的可靠性是概率性的，在长任务的末尾、context 被大量消耗之后，它的权重会被稀释。Claude 不是故意不遵守，而是在复杂推理链的末端，它”觉得”应该没问题就声明完成了。

Hook 解决这个问题。

Hook 挂载在 Claude Code 生命周期的特定节点上——工具调用之前（`PreToolUse`）、工具执行之后（`PostToolUse`）、Claude 声明完成时（`Stop`）、context 被压缩后（`PostCompact`）——在这些节点运行你定义的外部逻辑。

Stop` Hook 的作用是：Claude 说”完成了”时，自动运行测试套件，测试失败就把错误信息反馈给 Claude，要求它继续修复。这不是在”提醒”Claude 跑测试，而是测试失败时系统直接拒绝它声明完成。<strong>失败就是失败，没有语言空间可以绕过。</strong>

PreToolUse` Hook 的作用是：工具调用之前拦截，检查操作是否合规。`exit 2` 是阻断信号——系统直接拦截，让这个操作在技术层面无法完成。比在 CLAUDE.md 里写”不要 push 到 main”有效一个数量级，因为这是架构层面的阻止，不是语言层面的告诫。

PostCompact` Hook 解决另一个隐蔽的问题：Claude Code 在 context 接近上限时会自动压缩对话历史，这个过程会把早期注入的一些约束和背景知识覆盖掉。`PostCompact` Hook 在每次压缩后把关键约束文件重新注入，确保核心规范不会因为 context 压缩而消失。这是 Harness Engineering 里”状态外置”原则的具体实现——重要的状态不能只活在 context window 里，必须有外部持久化，能在任何时候重新注入。

Hook 的实现可以是 shell 脚本、HTTP 调用、甚至一个小型 LLM。选择哪种，有一条原则：<strong>越接近安全和强制性约束，越应该用确定性实现；越接近业务语义的判断，才考虑引入 LLM。</strong> 用 LLM 来判断”这条命令是否危险”是常见错误——安全护栏需要 bash 的确定性，不是模型的推理。

### 第四个洞察：限制不是缺陷，而是设计

Subagent 是四个机制里最容易被误用的——很多人把它理解为”让 Claude 更快”的工具，用来并行执行任务。这个理解没有错，但只触及了表面。

Subagent 更核心的设计意图，是<strong>主动限制每个执行单元的能力和上下文范围</strong>。

每个 Subagent 有独立的 context window，从干净状态开始，工具集可以独立配置。这意味着：

一个专门做代码审查的 Subagent，可以只开放读权限（`tools: Read, Grep, Glob`），工具集里没有 Edit 和 Write。这个 Subagent 不只是被”告知”不要修改文件——它根本没有修改文件的能力。对于高风险的重构任务，可以用 `isolation: worktree` 让 Subagent 在独立的 git 分支里工作，主工作区完全不受影响，满意后合并，不满意直接丢弃。

这背后是 Harness Engineering 里最反直觉的一条原则：<strong>约束不是缺陷，约束是可靠性的来源。</strong> 自由度越高，失控的可能性越大；解空间越收窄，行为越可预测。一个工具集只有五个工具的 Subagent，比一个工具集有五十个工具的 Subagent 更可靠——不是因为能力不够，而是因为出错的可能路径更少。

Context 隔离的意义也在这里。把探索、执行、验证拆成三个独立 Subagent，不只是为了节省主会话的 context——更是为了让每个 Agent 在一个目标单一、信息精炼的环境里工作，不被其他阶段的噪音干扰。Anthropic 自己的工程实践就是这样：初始化 Agent 搭建环境和任务列表，执行 Agent 每次只处理一个任务项，验证 Agent 定期扫描结果。每个 Agent 在自己的隔离环境里做好一件事，不需要处理其他 Agent 的历史。

### 把四个洞察放在一起

现在可以用一个场景把它们串起来。

你需要给后端服务加一个新 API 端点，要求文档更新、测试通过、代码风格符合规范。Harness 是这样工作的：

MCP 层提供内部 API 规范查询（认证逻辑封装在 MCP Server 里，Claude 看不到）和 GitHub Issue 读取。Skill `add-api-endpoint` 载入团队规范——错误码体系、Repository 模式要求、文档字段清单，以及用 shell 注入的当前服务状态。`PostToolUse` Hook 在每次文件修改后自动 lint 和格式化。`Stop` Hook 在 Claude 声明完成时运行测试，失败则拒绝完成声明。code-reviewer Subagent（只读权限）在修改完成后做最终审查。

你的输入只有一行。你没有说”请确保测试通过”，没有说”请遵循代码规范”，没有说”请不要直接 push 到 main”。

这些约束由 Harness 的结构保证，而不是由对 Claude 自觉性的期望保证。

### 为什么这不只是 Claude Code 的事

Claude Code 是一个透明的 Harness——它罕见地把工具层（MCP）、知识编码层（Skill）、验证层（Hook）、多 Agent 协调层（Subagent）都作为可配置的开放机制暴露出来。大多数 Harness 系统是黑盒，你看不到它的架构决策。Claude Code 是例外。

但这四条原则，在所有严肃的 Agent 框架里都有对应：LangGraph 的 Tool Node 是 MCP 的对应物，Conditional Edge 是 Hook 的对应物，Subgraph 是 Subagent 的对应物；AutoGen、CrewAI、OpenAI Agents SDK，名称不同，但解决的是同一批结构性问题——工具调用的不确定性、领域知识的缺失、执行结果的无法自验证、context 资源的有限性。

这些问题不属于任何一个工具，也不属于任何一个模型。<strong>它们是 Agent 工程的结构性挑战，在任何足够复杂的 Agent 系统里都会出现。</strong> 这就是为什么所有严肃的框架都在收敛到类似的架构模式。

理解了这一点，你学到的不是”如何更好地配置 Claude Code”。你建立的是一套<strong>用于思考所有 Agent 系统的设计语言</strong>——切换工具、切换模型，这套语言不需要重建。

### 最后

回到最开始那个把 CLAUDE.md 写得越来越长的工程师。

他做的事没有错，只是停在了错误的层次上。用语言约束语言模型，就像把”不要犯错”写进员工手册——有用，但远远不够。真正的工程答案，是给这位员工搭建一套工作系统：他能调用的工具是精确的，他遵循的规范是版本控制的，他完成任务时有自动的验证机制，他做高风险操作时有隔离的沙箱。

系统的可靠性不依赖于执行者的自觉，而来自于结构的保证。

这是软件工程几十年来的核心洞察，现在它需要被重新应用到 AI Agent 上。

Claude Code 给了你一个少见的机会：在一个真实的、可以动手的系统里，直接观察和练习 Harness Engineering 的设计思维。你在配置 MCP 的时候，其实在学习如何定义工具契约；你在写 Skill 的时候，其实在练习把隐性知识显式化；你在设计 Hook 的时候，其实在理解机械验证和语言请求的本质区别。

<strong>用 Claude Code 用得越深，你对 Agent 系统设计的直觉就越强。这是一个工具很少见的副产品。</strong>
