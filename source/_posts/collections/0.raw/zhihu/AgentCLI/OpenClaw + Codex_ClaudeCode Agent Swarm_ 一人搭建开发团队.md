---
title: "OpenClaw + Codex/ClaudeCode Agent Swarm: 一人搭建开发团队"
date: "2026-02-26 00:00:00"
updated: "2026-02-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AgentCLI/OpenClaw-Codex_ClaudeCode-Agent-Swarm_-一人搭建开发团队/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2010324070751826756
---


我现在不再直接使用 Codex 或 Claude Code 了。

** 我使用 OpenClaw 作为我的编排层。我的编排器 Zoe 会生成代理、编写它们的提示、为每个任务选择合适的模型、监控进度，并在 PR 准备合并时通过 Telegram 通知我。 过去四周的证明要点：
 

- 一天 94 次提交 。我最高效的一天——我进行了 3 次客户通话，一次都没有打开过编辑器。平均每天大约 50 次提交。
- 30 分钟内 7 个 PR。从想法到生产非常快，因为编码和验证大多是自动化的。
- 提交 → MRR: 我用它来构建一个真实的 B2B SaaS——将其与创始人领导的销售捆绑，以实现大多数功能请求的当日交付。速度将潜在客户转化为付费客户。
![](/images/collections/0.raw/zhihu/AgentCLI/asset/img_61dd157376b5.jpg)

1 月前：仅 CC/codex | 1 月后：Openclaw 协调 CC/codex&lt;br&gt;>  我的 git 历史看起来就像我刚雇佣了一个开发团队。实际上，我只是从管理 Claude code，转变为管理一个 Openclaw 代理，该代理管理着一支其他 Claude code 和 Codex 代理的舰队。
 

`成功率`：该系统几乎无需任何干预就能一次性完成几乎所有中小型任务。

`成本`：约 100 美元/月用于 Claude，90 美元/月用于 Codex，但你可以从 20 美元开始。 这是为什么这种方式比直接使用 Codex 或 Claude Code 效果更好的原因：

>  Codex 和 Claude Code 对你的业务几乎没有上下文信息。 它们看到的是代码，而不是你业务的完整图景。
 

OpenClaw 改变了这一局面。`它作为你与所有智能体之间的协调层——它将我的业务上下文（客户数据、会议笔记、过往决策、哪些有效、哪些失败）保存在我的 Obsidian 知识库中，并将历史上下文转化为精确的提示，供每个编码智能体使用。智能体专注于代码。协调者则保持在高策略层面`。 系统的高层次工作原理如下：

![](/images/collections/0.raw/zhihu/AgentCLI/asset/img_ad92bef44930.jpg)

上周 Stripe 写了一篇关于他们后台智能体系统"Minions"的文章——由集中式协调层支持的并行编码智能体。我无意中构建了同样的系统，但它运行在我的 Mac mini 上。

在告诉你如何设置这个系统之前，你应该知道为什么需要智能体协调器。

### 为什么一个 AI 无法两者兼顾

上下文窗口是有限的 。你必须选择放入的内容。

>  填满代码→没有空间容纳业务上下文。填满会话历史→没有空间容纳代码库。这就是双层系统有效的原因：每个 AI 都加载了它所需的内容。
 

OpenClaw 和 Codex 的上下文差异极大：

![](/images/collections/0.raw/zhihu/AgentCLI/asset/img_d158f0017d45.jpg)

通过上下文实现专业化，而非通过不同的模型。

### 完整的8步工作流程

让我通过上周的一个真实案例来讲解。

#### 第 1 步：客户请求→使用 Zoe 进行范围界定

我接到了一个机构客户的电话。他们希望重用团队已经设置好的配置。

通话后，我和 Zoe 讨论了这项请求。由于我所有的会议笔记都会自动同步到我的 Obsidian 库中，我这边无需做任何解释。我们一起梳理了功能范围——最终确定了一个模板系统，让他们能够保存和编辑现有的配置**。

然后 Zoe 做了三件事：

- 1.充值积分以立即解除客户限制——她有管理员 API 访问权限
- 2.从生产数据库中获取客户配置  — 她有只读的生产数据库访问权限（我的 Codex 代理永远不会拥有这种权限），用于检索他们现有的设置，这些设置会包含在提示中
- 3.生成一个 Codex 代理——带有包含所有上下文的详细提示

#### 步骤2：生成agent

每个代理都有自己的工作树（隔离分支）和 tmux 会话：

`# Create worktree + spawn agent
git worktree add ../feat-custom-templates -b feat/custom-templates origin/main
cd ../feat-custom-templates && pnpm install

tmux new-session -d -s "codex-templates" \
  -c "/Users/elvis/Documents/GitHub/medialyst-worktrees/feat-custom-templates" \
  "$HOME/.codex-agent/run-agent.sh templates gpt-5.3-codex high"
`

该代理在 tmux 会话中运行，并通过脚本实现完整的终端日志记录。 我们启动代理的方式如下：

`# Codex
codex --model gpt-5.3-codex \
  -c "model_reasoning_effort=high" \
  --dangerously-bypass-approvals-and-sandbox \
  "Your prompt here"

# Claude Code  
claude --model claude-opus-4.5 \
  --dangerously-skip-permissions \
  -p "Your prompt here"
`

我以前使用 codex exec 或 claude -p，但最近切换到 tmux：

tmux 要远好得多，因为任务中途重定向功能强大。代理跑偏了方向？不要杀死它：

`# Wrong approach:
tmux send-keys -t codex-templates "Stop. Focus on the API layer first, not the UI." Enter

# Needs more context:
tmux send-keys -t codex-templates "The schema is in src/types/template.ts. Use that." Enter
`

任务在 .clawdbot/active-tasks.json 中被跟踪：

`{
  "id": "feat-custom-templates",
  "tmuxSession": "codex-templates",
  "agent": "codex",
  "description": "Custom email templates for agency customer",
  "repo": "medialyst",
  "worktree": "feat-custom-templates",
  "branch": "feat/custom-templates",
  "startedAt": 1740268800000,
  "status": "running",
  "notifyOnComplete": true

```text
}
```

`

完成后，它会更新 PR 编号和检查状态。（更多内容见步骤 5）

`{
  "status": "done",
  "pr": 341,
  "completedAt": 1740275400000,
  "checks": {
    "prCreated": true,
    "ciPassed": true,
    "claudeReviewPassed": true,
    "geminiReviewPassed": true

```text
  },
  "note": "All checks passed. Ready to merge."
}
```

`

#### 步骤3：循环监控

一个 cron 任务每 10 分钟运行一次来照看所有代理。这基本上就像一个改进的 Ralph 循环，后面会详细说明。

但它不会直接轮询代理——那会非常昂贵。相反，它运行一个脚本，该脚本读取 JSON 注册表并检查：

`.clawdbot/check-agents.sh
`

该脚本是完全确定性的，并且极其高效：

- 检查 tmux 会话是否存活
- 检查跟踪分支上的打开的 PR
- 通过 gh cli 检查 CI 状态
- 如果 CI 失败或关键评审反馈，自动重新生成失败的agent（最多 3 次尝试）
- 只有在需要人工关注时才发出警报
** 我不看终端。系统会告诉我何时查看。
 
#### 步骤 4：代理创建 PR

agent通过`gh pr create --fill`提交、推送并打开 PR。此时我不会收到通知——单独的 PR 并未完成。

完成的定义（非常重要，你的代理需要知道这一点）：

- 创建了 PR
- 分支已同步到主分支（无合并冲突）
- 持续集成通过（代码风格检查、类型检查、单元测试、端到端测试）
- Codex 审查通过
- Claude Code 审查通过
- Gemini 审查通过
- 包含截图（如果 UI 有变化）

#### 步骤5：自动代码审查

每个 PR 都会由三个 AI 模型进行审查。它们捕捉到不同的事物：

- `Codex Reviewer` — 在边缘案例方面表现优异。进行最彻底的审查。能捕捉逻辑错误、缺失的错误处理、竞态条件。误报率非常低。
- `Gemini Code Assist Reviewer` — 免费且极其有用。能捕捉其他代理遗漏的安全问题、可扩展性问题。并建议具体的修复方案。安装毫无疑虑。
- `Claude Code Reviewer` — 基本无用——倾向于过度谨慎。大量建议"考虑添加..."，通常属于过度设计。除非标记为关键，否则我直接跳过。它很少能自行发现关键问题，但会验证其他审查者标记的问题。 所有三个帖子评论都直接针对该拉取请求。

#### 第六步：自动化测试

我们的 CI 流水线运行大量自动化测试：

- 代码风格检查和 TypeScript 检查
- 单元测试
- 端到端测试
- 在预览环境中运行 Playwright 测试（与生产环境相同）
>  上周我添加了一条新规则：如果 PR 修改了任何 UI，必须在 PR 描述中包含截图。否则 CI 会失败。这大大缩短了审查时间——我可以直接看到具体的变化，无需点击预览<strong>。</strong> 

#### 步骤 7：人工审查

现在我看到 Telegram 通知："PR #341 已准备好进行审核。" 此时：

- CI 通过
- 三位 AI 审核员批准了代码
- 截图展示了 UI 的变化
- 所有边界情况都在审核评论中记录 我的审核需要 5-10 分钟。我合并很多 PR 时不需要阅读代码——截图展示了我所需要的一切

#### 步骤8：合并

PR 合并。每天有一个 cron 任务清理孤立的 worktrees 和任务注册 json。

### The Ralph Loop V2

>  Ralph循环从内存中提取上下文，生成输出，评估结果，保存学习成果<strong>。但大多数实现每个周期运行相同的提示。提炼出的学习成果会改进未来的检索，但提示本身保持静态。</strong> 

我们的系统不同。当agent失败时，Zoe 不会用相同的提示重新生成它。她会查看完整的业务上下文，并找出如何解除阻塞它的方法：

- 代理上下文用完了？“只关注这三个文件。”
- 代理走错了方向？“停止。客户想要的是 X，不是 Y。这是他们在会议中说的话。”
- 代理需要澄清？“这是客户的电子邮件以及他们公司是做什么的。”
>  Zoe 帮助代理完成工作。她拥有代理所不具备的上下文信息——`客户历史记录、会议笔记、我们之前尝试过的方法以及失败的原因。她利用这些信息在每次重试时编写更好的提示`。
 

但她也不需要我分配任务。她会主动寻找工作：

- `早上`： 扫描 Sentry → 发现 4 个新错误 → 启动 4 个代理进行调查和修复**
- `会议后`： <strong>扫描会议笔记 → 标记 3 个客户提到的功能请求 → 启动3个Codex代理</strong>
- `晚上`： <strong>扫描 git 日志 → 启动 Claude Code 更新变更日志和客户文档</strong>
** 我接完客户电话后散步回来。回到 Telegram 上看到："7 个 PR 已准备好审核。3 个新功能，4 个 bug 修复。"
 当agent成功时，模式会被记录下来。"这种提示结构适用于计费功能。" "Codex 需要提前提供类型定义。" "始终包含测试文件路径。" 奖励信号是：CI 通过、所有三个代码审核通过、人工合并。任何失败都会触发循环。随着时间的推移，Zoe 写出的提示会更好，因为她记得哪些已经发布。

### 选择合适的agent

并非所有编程agent都一样。快速参考：

- 
Codex 是我的主力。后端逻辑、复杂错误、多文件重构、任何需要跨代码库推理的任务。它较慢但全面。我用于 90%的任务<strong>。</strong> 
- 
Claude Code 更快，更适合前端工作。它权限问题也更少，因此非常适合 git 操作。（我过去更多用它来驱动日常工作，但现在 Codex 5.3 明显更好、更快）**** 
- 
Gemini有不同的超能力——设计感。为了制作美观的 UI 界面，我会先让文生生成 HTML/CSS 规范，然后交给 Claude Code 在我们的组件系统中实现。Gemini负责设计，Claude 负责构建。
 
>  Zoe 为每项任务选择合适的代理，并在它们之间路由输出。账单系统错误会交给 Codex 处理。按钮样式修复交给 Claude Code。新的仪表板设计从 Gemini 开始。
 

### 如何设置

将这篇文章全部复制到 OpenClaw 中，并告诉它："为我实现这个代理群组设置。

它将读取架构，创建脚本，设置目录结构，并配置 cron 监控。10 分钟内完成。

### 意想不到的瓶颈

我现在遇到的瓶颈是：内存。

>  每个agent都需要自己的worktree。每个工作树都需要自己的 `node_modules`。每个代理运行构建、类型检查和测试。五个agent同时运行意味着五个并行运行的 TypeScript 编译器、五个测试运行器、五个依赖集被加载到内存中。
 

我的 16GB 内存 Mac Mini 在运行 4-5 个代理后会开始交换内存——而且我需要运气好，它们不会同时尝试构建。

所以我又购买了一台配备 M4 芯片、128GB RAM 的 Mac Studio Max（价格为 3,500 美元）来驱动这个系统。它将在 3 月底到货，如果值得的话我会分享。

### 接下来：单人创造的百万美元公司

从2026年开始，我们将看到大量单人创造的百万美元公司涌现。对于那些懂得如何构建递归自我改进代理的人而言，杠杆效应是巨大的。

>  这就是它的样子：一个 AI 协调器作为你自己的延伸（就像 Zoe 对我来说那样），将工作委托给处理不同业务功能的专门代理。工程。客户支持。运营。营销。每个代理专注于它擅长的领域。你保持激光般的专注和完全控制。
 

下一代企业家不会雇佣一个10人的团队去做一个拥有正确系统的人能做的事情。他们会这样构建——保持小规模，行动迅速，每日交付**。

现在 AI 生成的垃圾太多。围绕代理和"任务控制中心"的炒作太多，却没有构建任何真正有用的东西。没有实际效益的华丽演示。

<strong>我正在尝试做相反的事情：减少炒作，更多地记录实际业务的构建过程。真实客户、真实收入、真正交付到生产环境的提交，以及真实的损失</strong>。
 我正在打造什么？Agentic PR——一家挑战传统企业公关公司的单人公司。我们帮助初创公司获得媒体报道，而无需每月支付1万美元的顾问费。
