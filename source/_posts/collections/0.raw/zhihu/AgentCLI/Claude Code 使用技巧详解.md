---
title: Claude Code 使用技巧详解
date: "2026-03-02 00:00:00"
updated: "2026-03-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AgentCLI/Claude-Code-使用技巧详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2011882791802004093
---


### [https://github.com/ykdojo/claude-code-tips](https://link.zhihu.com/?target=https%3A//github.com/ykdojo/claude-code-tips)

### Claude Code 使用技巧详解（Tips 0-9）

### 一、自定义状态栏（Status Line）

Claude Code 底部的 **状态栏** 可以高度定制化，用于显示关键工作信息：

- **当前模型**（如 Opus 4.5）
- **当前目录** 和 **Git 分支**
- **未提交文件数** 和 **与 origin 的同步状态**
- **Token 使用量进度条**（如 `██░░░░░░░░ 18% of 200k tokens`）
- **最后一条消息摘要**，便于快速回忆当前会话主题
** 实用场景：在长时间多任务切换中，状态栏帮助你始终掌握 上下文消耗量** 和 **当前工作状态** ，避免上下文超限或迷失方向。支持 10 种颜色主题（orange、blue、teal、green 等），通过自定义脚本 `context-bar.sh` 实现。

### 二、必备斜杠命令（Slash Commands）

在 Claude Code 中输入 `/` 可查看所有可用命令，以下是最常用的几个：

命令功能/usage查看 速率限制 （当前会话用量、本周用量等），可在标签页中持续监控/chrome开关 Claude 的 原生浏览器集成/mcp管理 MCP（Model Context Protocol）服务器/stats查看使用统计，包含 GitHub 风格的活动热力图、总 Token 数、最长会话时长、连续活跃天数等/clear清空当前会话 ，重新开始
### 三、语音输入提升效率

**核心观点** ：语音输入比打字 **更快** ，尤其在已经练习过口语表达的情况下。

#### 推荐工具

- **superwhisper** ：Mac 端付费方案
- **MacWhisper** ：Mac 端方案
- **Super Voice Assistant** ：开源方案，支持 Parakeet v2/v3

#### 关键要点

- **本地模型已足够** ：即使转录有错误（如把 “exclamation mark” 转录成 “ExcelElanishMark”），Claude 足够聪明可以正确理解意图
- **嘈杂环境也可用** ：使用耳机小声说话即可，甚至在飞机上也能正常工作
- **思维模型** ：把与 Claude Code 的交互想象成 **给朋友发语音消息** ，而不是打电话——只是快速发送语音片段

### 四、将大问题拆解为小问题

** 这是使用 Claude Code 最重要的概念之一，与传统软件工程中的 问题分解** 原则完全一致。
#### 方法论

如果 Claude Code 无法 **一次性解决** 一个复杂问题：

- 让它 **拆分为多个子任务**
- 逐个解决每个子任务
- 如果子任务仍然太难，继续拆分为 **更小的子问题**
- 最后将所有解决方案 **组合** 起来
`直接方式：   A ────────────────→ B  （容易失败）
分步方式：   A → A1 → A2 → A3 → B  （成功率高）`

#### 实例

构建语音转录系统时，不要一次性要求 Claude 实现”模型下载 + 键盘快捷键 + 转录 + 光标定位 + UI”。而是：

- 先做一个 **只下载模型** 的可执行文件
- 再做一个 **只录音** 的可执行文件
- 再做一个 **只转录预录音频** 的可执行文件
- 最后 **组合** 起来
**软件工程技能在 AI 编程时代依然高度相关** ——你的问题分解能力和架构思维会让 Claude Code 更加强大。
### 五、Git 与 GitHub CLI 高效使用

#### Git 操作自动化

直接让 Claude 处理 Git 任务：

- **自动提交** ：省去手写 commit message
- **分支管理** 、pull、push 等
**安全建议** ：**允许自动 pull** 但 **不允许自动 push** ——pull 不会污染远端仓库，而 push 有风险。
#### GitHub CLI（`gh`）进阶

- **创建 Draft PR** ：让 Claude 自动创建草稿 PR，你审核完毕后再标记为 Ready for Review，风险极低
- **GraphQL 查询** ：`gh` 支持发送任意 GraphQL 请求，例如查询 PR 描述的编辑历史时间线

#### 禁用署名归属

默认情况下 Claude Code 会在 commit 中添加 `Co-Authored-By` 以及在 PR 中添加归属页脚。可通过 `~/.claude/settings.json` 关闭：

`{
  "attribution": {
    "commit": "",
    "pr": ""
  }
}`

### 六、上下文如同鲜奶——越新鲜越好

**核心原则** ：Claude Code 在 **新会话开头表现最好** ，因为没有历史上下文的干扰。

- 随着对话越来越长，**上下文膨胀** 会导致性能下降
- **每个新话题都应开启新会话**
- 当感觉性能下降时，也应 **及时开启新会话**

### 七、从终端导出输出内容

当你需要复制 Claude Code 的输出时，有多种方式：

方法说明/copy最简单——将 Claude 的最后回复以 Markdown 格式复制到剪贴板pbcopy让 Claude 用 pbcopy（Mac/Linux）直接将内容送入剪贴板写入文件让 Claude 将内容写入文件，再用 VS Code 打开（可指定行号）打开 URL让 Claude 用 open 命令在浏览器中打开链接GitHub Desktop让 Claude 用 GitHub Desktop 打开当前仓库，特别适合在非根目录下工作时使用
#### 组合技巧

编辑 GitHub PR 描述时，不要让 Claude 直接修改（容易出错），而是：

- 让 Claude 将 PR 内容复制到 **本地文件**
- 在本地文件中编辑
- 确认无误后再 **粘贴回** GitHub PR

### 八、设置终端别名

由于 Claude Code 是终端工具，设置短别名可以 **大幅加速** 日常操作：

`alias c='claude'           # 最常用
alias ch='claude --chrome'  # 带浏览器集成
alias gb='github'           # GitHub Desktop
alias co='code'             # VS Code
alias q='cd ~/Desktop/projects'  # 快速跳转到项目目录`

#### 与参数组合

- **`c -c`** ：继续上一次对话
- **`c -r`** ：显示最近的对话列表供恢复
- 同样适用于 `ch -c` 和 `ch -r`

### 九、主动压缩上下文（Proactive Compaction）

#### 背景知识

- Claude Code 内置 **`/compact`** 命令，可压缩会话上下文
- Opus 4.5 的 **总上下文窗口为 200k Token** ，其中 **45k 预留** 给自动压缩
- 约 **10%（~20k）** 被系统提示、工具、记忆、动态上下文占用
- **自动压缩** 在上下文满时触发，但作者建议 **关闭自动压缩** ，改用手动控制，以获得更大的可用空间和更精确的控制

#### 推荐做法：Handoff 文档

在需要切换上下文前，让 Claude 编写一份 **交接文档（HANDOFF.md）** ：

** “把剩余计划写入 HANDOFF.md。说明你尝试过什么、什么有效、什么无效，让下一个新上下文的 agent 只需加载这个文件就能继续工作。”Claude 会生成结构化的交接文档，包含：

- 目标（Goal）**
- **当前进度（Progress）**
- **已尝试的方法及结果**
- **下一步计划**
新会话中只需提供文件路径即可：

`> experiments/system-prompt-extraction/HANDOFF.md`

#### 替代方案：Plan Mode

- 通过 **`/plan`** 或 **Shift+Tab** 进入计划模式
- 让 Claude 收集所有相关上下文，生成 **全面的计划**
- 完成后可选择 **“清除上下文并自动接受编辑”** ，新 Claude 实例仅看到计划，不携带旧会话的负担
- 新实例也会获得旧会话记录文件的链接，必要时可查阅细节

### 十、完成写入-测试循环以支持自主任务

#### 核心原则

要让 Claude Code **自主运行任务** ，必须给它一个 **验证结果的方式** ——即 **完整的写入-测试循环（Write-Test Cycle）** ：

`编写代码 → 运行 → 检查输出 → 重复`

#### 使用 tmux 测试交互式终端

对于需要交互式终端的任务（如测试 Claude Code 自身），可以使用 **tmux** ：

`tmux kill-session -t test-session 2>/dev/null
tmux new-session -d -s test-session
tmux send-keys -t test-session 'claude' Enter
sleep 2
tmux send-keys -t test-session '/context' Enter
sleep 1
tmux capture-pane -t test-session -p`

这种模式下，Claude Code 可以自动运行 **`git bisect`** ，逐个测试每个 commit 直到找到引入 bug 的那个。

#### 创造性的测试策略

工具/方法适用场景特点Playwright MCP大多数 Web 测试任务基于 无障碍树（Accessibility Tree） ，结构化数据，表现更稳定Claude 原生浏览器集成 (/chrome)需要 已登录状态 或 基于坐标的视觉点击使用截图+坐标点击，可能不太精准，速度较慢Chrome DevTools MCP高级调试场景尚未被作者充分测试**默认建议** ：

- **默认关闭** Claude 原生浏览器集成
- 仅在需要时通过 `ch`（`claude --chrome`）别名启用
- 在 CLAUDE.md 中配置 Chrome 使用 **ref 而非坐标** 来点击元素：
`# Claude for Chrome
- Use `read_page` to get element refs from the accessibility tree
- Use `find` to locate elements by description
- Click/interact using `ref`, not coordinates
- NEVER take screenshots unless explicitly requested by the user`

#### 跨平台测试策略

- **无法本地构建时** ：本地构建 wheel 文件，手动上传到 Google Colab 测试；或使用 **monkey patching** 快速验证
- **无法本地测试目标平台时** （如 Mac 上测试 Windows）：创建 **Draft PR** + 启用目标平台 CI 的分支，通过 CI 直接测试
**关键洞察** ：软件工程知识（如 `git bisect` 、CI 策略、跨平台测试思路）在 AI 编程时代依然极其有价值——你不是被替代，而是在用新方式应用这些知识。
### Claude Code 使用技巧详解（Tips 10-21）

### 一、Cmd+A / Ctrl+A 全选大法

**核心思路** ：当 Claude Code 无法直接访问某个 URL 时，用 **全选 → 复制 → 粘贴** 的方式手动”喂”内容给它。

#### 适用场景

- **私有页面** ：不是公开可访问的内容（非敏感数据，只是未公开）
- **受限站点** ：如 Reddit 等 Claude Code 的 WebFetch 工具无法抓取的页面
- **终端输出** ：Claude Code 自身或其他 CLI 程序的输出，也可以全选复制后粘贴回去

#### 特殊页面处理技巧

有些页面直接 Cmd+A 效果不好，可以先 **转换到更友好的视图** ：

- **Gmail 邮件串** ：点击 **Print All** 获取打印预览（取消实际打印），打印预览页面会展开所有邮件，此时再 Cmd+A 即可完整复制整个对话
- 此技巧 **适用于所有 AI 工具** ，不限于 Claude Code

### 二、用 Gemini CLI 作为受限站点的回退方案

Claude Code 的 **WebFetch 工具** 无法访问某些站点（如 Reddit），但可以通过 **Gemini CLI** 作为中间层来绕过限制。

#### 实现方式

- 创建一个 **Skill 文件** ，路径为 `~/.claude/skills/reddit-fetch/SKILL.md`
- Skill 中定义当 Claude 遇到受限站点时，通过 **tmux** 调用 Gemini CLI 进行抓取
- 使用与 Tip 9 相同的 **tmux 模式** ：启动会话 → 发送命令 → 捕获输出

#### Skill vs CLAUDE.md 的对比

方式加载时机Token 效率Skill 文件 （推荐）按需加载 ，仅在需要时才被引入高CLAUDE.md每次对话都加载 ，无论是否用到低**前提条件** ：需要预先安装 **Gemini CLI** 。速度不快（需与 Gemini 多次交互），但生成的报告质量出人意料地好。
### 三、投资你自己的工作流

**核心理念** ：花时间优化你使用的工具，是对生产力的 **长期投资** 。

#### 投资的层次

- **高投入** ：用 Swift 从零创建语音转录应用、用 Bash 定制状态栏、优化 Claude Code 系统提示词
- **低投入但同样有效** ：  

- 精心维护 **CLAUDE.md** 文件，确保尽可能 **精简** 同时覆盖你的目标
- 学习各种技巧和工具特性
- 了解 Claude Code 的核心功能

**

>  不需要做到极致，但 至少花一些时间** 在工具优化上。

### 四、搜索历史对话记录

Claude Code 的对话历史 **存储在本地** ，路径为 `~/.claude/projects/`，文件夹名基于项目路径（斜杠替换为短横线）。

#### 存储结构

项目路径 `/Users/yk/Desktop/projects/claude-code-tips` 对应存储位置：

`~/.claude/projects/-Users-yk-Desktop-projects-claude-code-tips/`

每个对话是一个 **`.jsonl` 文件** 。

#### 常用搜索命令

`# 查找所有提到 "Reddit" 的对话文件
grep -l -i "reddit" ~/.claude/projects/-Users-yk-Desktop-projects-*/*.jsonl

# 查找今天关于某主题的对话
find ~/.claude/projects/-Users-yk-Desktop-projects-*/*.jsonl -mtime 0 -exec grep -l -i "keyword" {} \;

# 提取某对话中的用户消息（需要 jq）
cat ~/.claude/projects/.../conversation-id.jsonl | jq -r 'select(.type=="user") | .message.content'`

**更简单的方式** ：直接问 Claude Code “今天我们讨论了关于 X 的什么内容？”，它会自动搜索历史记录。
### 五、终端标签页多任务管理

#### 核心原则

- 多实例运行时， **组织管理** 比具体技术设置更重要
- 建议同时关注 **最多 3-4 个任务**

#### “级联”（Cascade）方法

- 每启动一个新任务，在 **最右边开新标签页**
- 从 **左到右扫视** ，左边是最旧的任务，右边是最新的
- 保持一致的方向感，仅在需要检查特定任务时跳转

#### 典型布局示例

标签位置任务内容最左常驻 的语音转录系统第二个设置 Docker 容器第三个检查本地磁盘使用第四个工程项目开发第五个（当前）正在编写文档
### 六、精简系统提示词以节省 Token

Claude Code 的 **系统提示词 + 工具定义** 在对话开始前就占用约 **19k tokens** （约占 200k 上下文的 10%）。通过补丁系统可以将其 **缩减至约 9k tokens** ，节省约 **50%** 的开销。

#### 节省详情

组件补丁前补丁后节省系统提示词3.0k1.8k1,200 tokens系统工具定义15.6k7.4k8,200 tokens总计~19k~9k~10k tokens (~50%)
#### 补丁原理

- 修剪 **冗余示例** 和 **重复文本** ，保留所有核心指令
- 修改 CLI bundle 的 **压缩后 JavaScript 文件**
- 支持 **npm 安装** 和 **原生二进制** （macOS/Linux）

#### 使用体验

- 感觉更 **原始、更强大** ，但监管感略弱（因为系统指令更短）
- **最大优势** ：起始上下文更低 → 对话可以 **持续更长时间** 再触及上限

#### 重要配置：禁用自动更新

补丁后需要 **禁用自动更新** ，否则更新会覆盖补丁：

`{
  "env": {
    "DISABLE_AUTOUPDATER": "1"
  }
}`

将此配置添加到 `~/.claude/settings.json`，对所有 Claude Code 会话生效（包括交互式、非交互式、tmux）。

#### MCP 工具惰性加载

如果配置了 **MCP 服务器** ，其工具定义默认会加载到 **每个对话** 中，即使不使用也会占用 Token。

开启 **惰性加载** ：

`{
  "env": {
    "ENABLE_TOOL_SEARCH": "true"
  }
}`

添加到 `~/.claude/settings.json`。Claude 会在 **需要时才搜索和加载** MCP 工具。从 v2.1.7 开始，当 MCP 工具描述超过上下文窗口的 10% 时会 **自动启用** 。

### 七、Git Worktrees 并行分支工作

#### 什么是 Git Worktree

**Git Worktree = 分支 + 独立目录** 。普通 Git 工作流中，项目文件夹同一时刻只能切换到一个分支；而 Worktree 允许你在 **不同目录中同时操作不同分支** 。

`传统方式：
  项目文件夹 → main 或 feature-branch-1（一次只能一个）

Worktree 方式：
  原始项目文件夹 → main
  新目录           → feature-branch-1  ← 可以同时工作！`

#### 使用方式

- 直接让 Claude Code 创建 git worktree 即可，不需要记忆具体语法
- 可与 **级联标签页方法** 叠加使用，实现更高效的多任务并行

### 八、手动指数退避（Manual Exponential Backoff）

#### 核心概念

**指数退避** 是软件工程中的经典技术，用于轮询长时间运行的任务。让 Claude Code **手动执行** 这一策略：以递增的间隔检查任务状态。

#### 工作方式

`检查 #1 → 等 1 分钟
检查 #2 → 等 2 分钟
检查 #3 → 等 4 分钟
检查 #4 → 等 8 分钟
...持续直到任务完成`

#### 适用场景

- **Docker 构建**
- **GitHub CI 流水线**
- 任何 **长时间运行的后台任务**

#### 为什么不用 `gh run watch`

`gh run watch` 会 **持续输出大量行** ，浪费 Token。而手动指数退避配合 `gh run view  | grep ` 更加 **Token 高效** 。

** 这不是传统意义上的程序化指数退避——是 AI 在 手动执行** 这个策略，但效果很好。
### 九、Claude Code 作为写作助手

#### 工作流

- **提供完整上下文** ：告诉 Claude 你要写什么
- **语音输入详细指令** ：用语音描述你的想法，获得 **第一稿**
- 如果不满意，尝试几次
- **逐行审核** ：和 Claude 一起逐行检查  

- “这行我喜欢，因为……”
- “这行应该移到那里”
- “这行需要这样修改”
- 也可以询问参考资料
**

#### 推荐布局

- 左侧** ：终端运行 Claude Code
- **右侧** ：代码编辑器查看文件
** 这种 来回迭代** 的过程效果非常好。
### 十、Markdown 是最佳写作格式

#### 为什么 Markdown 在 AI 时代价值更高

- **AI 之前** ：Markdown 已经很好用
- **AI 之后** ：与 Claude Code 配合使用时效率极高——语音输入 → 保存为 `.md` → 后续处理

#### 跨平台粘贴技巧

当目标平台不接受 Markdown 格式时：

- 将 Markdown 内容粘贴到 **Notion** 文档
- 从 Notion 复制内容
- 粘贴到目标平台（Notion 会自动转换格式）
- 如果还不行，尝试 **Cmd + Shift + V** （无格式粘贴）

### 十一、用 Notion 保留链接格式

**反向技巧** ：从带链接的文本（如 Slack 消息）复制时：

- **直接粘贴到 Claude Code** → 链接丢失
- **先粘贴到 Notion** → 再从 Notion 复制 → 得到 **包含链接的 Markdown** → Claude Code 可正常读取

### 十二、容器化运行长时间/高风险任务

#### 核心区分

运行方式适用场景特点常规会话方法性工作手动控制权限，仔细审核输出容器化 + --dangerously-skip-permissions长时间运行、可能有风险的任务无需逐一授权，自主运行，出错也被隔离
#### 实际案例

- **Reddit 研究** ：reddit-fetch skill 通过 tmux 与 Gemini CLI 反复交互，无人监督运行有风险，但在容器中完全隔离
- **系统提示词补丁迁移** ：新版 Claude Code 发布后，需要更新补丁。在容器中让 Claude Code 自主探索压缩后的 JavaScript、找到变量映射、创建新补丁文件——它甚至 **完全自主完成了迁移** ，包括尝试应用补丁、修复失败项、改进升级文档

#### SafeClaw 工具

作者创建了 [SafeClaw](https://link.zhihu.com/?target=https%3A//github.com/ykdojo/safeclaw) 来简化容器化 Claude Code 的使用：

- 启动 **多个隔离会话**
- 每个会话带有 **Web 终端**
- 通过 **仪表板** 统一管理
- 集成了优化系统提示词、DX 插件、状态栏等定制

#### 进阶：编排容器内的 Worker Claude Code

本地 Claude Code 可以 **控制** 容器内的另一个 Claude Code 实例：

`本地 Claude Code
  └── tmux 会话
        └── 连接到容器
              └── Claude Code (--dangerously-skip-permissions)`

- 外层通过 `tmux send-keys` 发送指令
- 通过 `tmux capture-pane` 读取输出
- 任务完成后，外层拉取结果
- 出问题也完全 **沙盒隔离**

#### 进阶：多模型编排

不仅限于 Claude Code，可以在容器中运行 **不同的 AI CLI** ：

- **OpenAI Codex** ：用于代码审查效果不错
- **Gemini CLI** ：用于网页抓取
- 其他 AI CLI 工具
**核心价值** ：不是说这些 CLI 不能直接在主机上运行——当然可以。关键是 Claude Code 的 UX 足够流畅，可以作为 **中央调度接口** ，通过自然语言指挥不同模型、在容器和主机之间传输数据，避免手动切换终端和复制粘贴的繁琐操作。
### Claude Code 使用技巧详解（Tips 22-33）

### 一、最好的学习方式就是不断使用

**核心观点** ：学习 Claude Code 最有效的方式就是 **大量使用它** ，正如顶级攀岩选手被问到如何提高攀岩水平时回答的：”靠攀岩。”

#### “十亿 Token 法则”

类比传统的 **一万小时定律** ，作者提出了 **十亿 Token 法则（Billion Token Rule）** ：

- 想要真正建立对 AI 工作方式的 **直觉** ，最好的方法就是消耗大量 Token
- 如今这已经变得可行——尤其是 **Opus 4.5** ，性能强大且价格可接受
- 可以同时运行 **多个会话** ，不必过分担心 Token 用量
** 观看视频、阅读技巧当然有用，但这些都是 辅助手段** ，核心还是实操。
### 二、对话的克隆（Clone）与半克隆（Half-Clone）

#### 场景

在对话过程中，你可能想从某个节点 **分支出一条新路线** 尝试不同方案，同时保留原始对话。

#### 内置分叉功能（新版本已支持）

命令说明/fork在当前会话中 分叉--fork-session配合 --resume 或 --continue 使用，如 claude -c --fork-session由于 `--fork-session` 没有短选项，可以在 `~/.zshrc` 或 `~/.bashrc` 中添加函数将 `--fs` 映射为 `--fork-session`：

`claude() {
  local args=()
  for arg in "$@"; do
    if <span class="wikilink wikilink--missing" title="未导入的页面">&quot;$arg&quot; == &quot;--fs&quot;</span>; then
      args+=("--fork-session")
    else
      args+=("$arg")
    fi
  done
  command claude "${args[@]}"
}`

#### 自定义克隆脚本

- **`clone-conversation.sh`** ：完整复制对话，生成新 UUID，首条消息标记 `[CLONED ]`
- 设置方式：通过符号链接或 **dx 插件** 安装
- 在对话中输入 `/clone`（或 `/dx:clone`）即可触发

#### 半克隆（Half-Clone）——减少上下文

当对话变得 **过长** 时， **`half-clone-conversation.sh`** 仅保留 **后半部分** 的消息：

- **减少 Token 消耗** ，同时保留最近的工作进度
- 首条消息标记 `[HALF-CLONE ]`
- 相比 **auto-compact** 的优势：半克隆是 **确定性** 的，保留实际消息而非摘要，速度更快

#### 通过 Hook 自动触发半克隆

可以配置 **Hook** ，在上下文使用率超过 **85%** 时自动执行 `/half-clone`：

- 将 `check-context.sh` 复制到 `~/.claude/scripts/`
- 在 `~/.claude/settings.json` 中添加 **Stop Hook** ：
`{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/scripts/check-context.sh"
          }
        ]
      }
    ]
  }
}`

**前提** ：需要 **关闭 auto-compact** （`/config` > Auto-compact > false），否则 Claude Code 可能在 Hook 触发前就压缩了上下文。
#### 克隆脚本的权限配置

两个脚本都需要读取 `~/.claude` 目录，建议在全局设置中预先授权：

`{
  "permissions": {
    "allow": ["Read(~/.claude)"]
  }
}`

### 三、用 realpath 获取绝对路径

当需要告诉 Claude Code 另一个文件夹中的文件位置时，使用 **`realpath`** 命令获取完整绝对路径：

`realpath some/relative/path`

** 简单但实用，避免相对路径在不同工作目录下产生歧义。
### 四、CLAUDE.md vs Skills vs Slash Commands vs Plugins 深度对比

这四个概念容易混淆，以下是它们的核心区别与联系：

#### CLAUDE.md

- 最简单** 的配置方式
- 本质是一组文件，被视为 **默认提示词** ，在 **每次对话开始时自动加载**
- 项目级别：`./CLAUDE.md` ；全局级别：`~/.claude/CLAUDE.md`
- **优点** ：简单直接
- **缺点** ：无论是否需要，都会占用 Token

#### Skills（技能）

- **结构更好** 的 CLAUDE.md
- 可以被 Claude **自动识别并在相关时加载** ，也可以由用户手动通过斜杠调用（如 `/my-skill`）
- **Token 效率更高** ：仅在需要时加载
- 示例：一个在用户询问某种语言发音时自动打开 Google 翻译链接的技能

#### Slash Commands（斜杠命令）

- 与 Skills 类似，也是打包指令的方式
- 可由用户手动调用，也可由 Claude 自身调用
- **设计意图** ：主要面向 **用户** 使用，当你需要在精确时机、按自己节奏触发操作时更合适

#### Skills 与 Slash Commands 的融合

- 功能上非常相似，主要区别在于 **设计意图** ：Skills 偏向 Claude 使用，Slash Commands 偏向用户使用
- Anthropic 已在 **2.13 更新中合并了两者**

#### Plugins（插件）

- 一种 **打包格式** ，可以将 Skills、Slash Commands、Agents、Hooks 和 MCP 服务器捆绑在一起
- 插件不必使用所有组件——Anthropic 官方的 `frontend-design` 插件本质上只是一个 Skill
- **优势** ：易于安装和分发
特性CLAUDE.mdSkillsSlash CommandsPlugins加载时机每次对话按需按需按需主要使用者用户配置Claude 自动用户手动打包分发Token 效率低高高高复杂度最低中中最高
### 五、交互式 PR 审查

Claude Code 非常适合做 **PR Review** ，与传统 AI 的 **一次性审查** 不同，Claude Code 提供 **交互式审查** 体验：

#### 工作流

- 让 Claude Code 通过 **`gh`** 命令获取 PR 信息
- 按你想要的方式进行审查：  

- **整体审查** ：快速了解 PR 的总体结构
- **逐文件审查** ：一个文件一个文件地深入检查
- **带测试审查** ：让 Claude 同时运行相关测试
**

- 你控制节奏和深度** ——想要多详细就多详细
**关键区别** ：Claude Code 是一个 **可对话的 PR 审查员** ，而非只能给出一次性反馈的工具。
### 六、Claude Code 作为研究工具

Claude Code 本质上是一个 **增强版的搜索/深度研究工具** ，可以替代 Google 或专门的深度研究产品。

#### 研究能力来源

信息来源访问方式GitHubgh CLI 命令RedditGemini CLI 回退方案（Tip 11）私有信息Slack MCP 等任意网页Cmd+A 复制粘贴（Tip 10）难以加载的 URLPlaywright MCP 或原生浏览器集成（Tip 9）沙盒环境容器方式（Tip 21）** 作者甚至通过 Claude Code 做研究 节省了 10,000 美元** 。
### 七、验证 Claude Code 输出的多种方式

**核心原则** ：不要盲目信任 Claude Code 的输出，要建立多层验证机制。

#### 验证方法清单

- **让它写测试** ：检查测试逻辑是否合理
- **在 Claude Code UI 中逐步检查** 代码生成过程
- **使用可视化 Git 客户端** ：如 **GitHub Desktop** ，快速查看变更差异
- **生成 Draft PR** ：在 PR 页面审查内容，确认后再转为正式 PR
- **让它自我检查** ：  

- 问它 “你确定吗？请再检查一遍”
- **最佳提示词** ：”double check everything, every single claim in what you produced and at the end make a table of what you were able to verify”（逐条验证所有声明，最后制作验证结果表格）
**

### 八、Claude Code 作为 DevOps 工程师

#### GitHub Actions 故障排查

这是 Claude Code 表现 极其出色** 的场景之一：

- 将 GitHub Actions CI 失败的链接交给 Claude Code
- 让它 **深入挖掘根因** ：”dig into this issue, try to find the root cause”
- 持续追问细化：  

- 是某个特定 commit 导致的？
- 是某个 PR 引入的？
- 还是 **flaky test** （不稳定测试）？
**

- Claude Code 能够处理大量日志，这种工作 手动做极其痛苦**

#### 预置的 `/gha` 斜杠命令

`/gha `

自动执行：调查失败原因 → 检查是否为 flaky → 识别破坏性 commit → 建议修复方案

#### 完整修复流程

- `/gha` 识别问题
- 让 Claude 创建 **Draft PR**
- 验证输出（参考 Tip 28 的多种验证方法）
- 让 Claude 自我验证
- 确认后转为正式 PR

### 九、保持 CLAUDE.md 简洁并定期审查

#### 维护原则

- **从无到有** ：一开始 **不需要** CLAUDE.md
- **按需添加** ：当你发现自己 **反复告诉** Claude Code 同样的事情时，再将其加入 CLAUDE.md
- 可以通过 `#` 符号添加，也可以直接让 Claude Code 编辑对应的 CLAUDE.md 文件
- **尽可能精简** ：每条指令都在消耗 Token

#### 定期审查

- 过时的指令会 **浪费 Token** 并可能产生误导
- 使用 **`review-claudemd`** Skill 可以分析最近的对话，建议对 CLAUDE.md 进行改进

### 十、Claude Code 作为通用计算接口

**核心理念** ：Claude Code 不仅是编码工具，更是你与 **整个数字世界的通用接口** 。

#### 使用场景示例

场景Claude Code 的解决方式快速视频编辑通过 ffmpeg 命令行完成批量音频/视频转录使用 Whisper (Python)CSV 数据分析用 Python 或 JavaScript 进行可视化磁盘空间清理扫描文件夹，找出大文件（如 Final Cut Pro 项目文件），清理 Docker 缓存（docker system prune），清除遗留缓存GitHub Actions 调试自动遍历日志定位问题Reddit 情绪/市场分析通过 Gemini CLI 获取数据
#### 多”大脑”并行

- 计算机始于 **文本界面** ，如今又回到了文本界面
- 每个 Claude Code 终端标签页就是一个 **独立的”大脑”** ——你可以同时开 3、4、5、6 个
- 随着模型变强，可以把 **不重要、无聊、繁琐的任务** 委托给这些”大脑”
- 你只需关注 **真正重要的决策**

### 十一、选择合适的抽象层级

**核心观点** ： **Vibe Coding** （氛围编程）并非非黑即白——关键在于根据项目重要程度选择 **合适的深入程度** 。

#### 抽象层级光谱

`高空俯瞰（Vibe Coding）    ←———————————→    深海潜水（精细审查）
  - 不关心每行代码              - 逐行检查代码
  - 一次性项目                  - 核心生产系统
  - 非关键部分                  - 检查依赖项
  - 快速原型                    - 理解架构细节`

#### 冰山比喻

- **飞越冰山顶部** ：远距离快速检查（Vibe Coding 层级）
- **靠近观察** ：查看文件结构和函数签名
- **潜水模式** ：深入代码细节、检查依赖
- **深海探索** ：逐行审查、复制特定代码段或错误日志向 Claude Code 提出针对性问题
**软件工程技能依然重要** ——你的工程判断力决定了在何时需要深入到哪个层级。
### 十二、审计已批准的命令——cc-safe 工具

#### 风险背景

有用户的 Claude Code 执行了 `rm -rf tests/ patches/ plan/ ~/` ，**直接删除了整个 home 目录** 。这种事故并非只发生在新手身上——任何人都可能中招。

#### cc-safe 工具

**cc-safe** 是一个 CLI 工具，用于扫描 `.claude/settings.json` 文件中的 **危险已批准命令** 。

#### 检测的危险模式

- `sudo` 、 `rm -rf` 、 `Bash` （过于宽泛的权限）、 `chmod 777`
- `curl | sh` （管道执行远程脚本）
- `git reset --hard` （不可恢复的 Git 操作）
- `npm publish` （意外发包）
- `docker run --privileged` （特权容器）
- 更多模式……（容器感知，会跳过 `docker exec` 等安全命令）

#### 使用方式

`# 全局安装
npm install -g cc-safe
cc-safe ~/projects

# 或直接使用 npx
npx cc-safe .`

- **递归扫描** 所有子目录，可以指向项目根目录一次性检查
- 可手动运行，也可以让 Claude Code 代为执行

### Claude Code 使用技巧详解（Tips 34-45）

### 一、大量编写测试（并使用 TDD）

随着使用 Claude Code 编写的代码越来越多，引入 Bug 的概率也在增加。PR 审查和可视化 Git 工具能帮忙发现问题，但随着代码库增长， **编写测试** 变得至关重要。

#### AI 能测试自己写的代码吗？

- 有人认为 AI 无法有效测试自己的代码，但实际上 **可以**
- 原理类似于人脑的工作方式：编写测试时，你是在用 **不同的思维角度** 审视同一个问题
- AI 同样如此——生成代码和生成测试是两种不同的思考路径

#### TDD（测试驱动开发）与 Claude Code 的配合

**TDD 流程** 与 Claude Code 配合非常出色：

- **先写测试** ：定义预期行为
- **确认测试失败** ：验证测试本身是有效的
- **提交测试** ：将测试固化为”合约”
- **编写代码使测试通过** ：Claude Code 此时有了明确的 **目标靶心**
`传统流程：  写代码 → 写测试 → 修复 → 循环
TDD 流程：  写测试 → 确认失败 → 提交 → 写代码通过测试 ✅`

** 作者用这种方式构建了 cc-safe** 项目。通过在实现之前提交失败的测试，为代码应该做什么创建了 **清晰的合约** 。
#### 额外保险

- **亲自审查测试** ：确保测试不是在”作弊”（比如直接 `return true`）
- 测试的质量直接决定了你对 AI 代码的 **信任程度**

### 二、在未知领域更加勇敢——迭代式问题解决

**核心观点** ：Claude Code 让你能够自信地 **闯入不熟悉的技术领域** ，关键在于 **迭代式问题解决** 。

#### 实例一：React 前端问题

作者在 **Daft**（一个数据处理框架）工作时发现前端代码有问题，虽然 **不是 React 专家** ，但通过逐步向 Claude Code 提问代码库和问题本身，最终解决了问题。

#### 实例二：跨语言调试（Python + Rust）

遇到一个复杂问题：cloudpickle 在 Google Colab 上与 Pydantic 不兼容，以及 Python + Rust 代码在 JupyterLab 中打印行为与终端不一致。

**解决过程** ：

- Claude Code 给出初始方案 → **不够好**
- 同事建议直接禁用该部分 → 作者 **不接受回归**
- **放慢节奏** ，进入协作迭代模式：  

- Claude Code 提出潜在原因和解决方案
- 作者逐一实验
- 遇到死胡同就换方向
**

- 最终找到了一个 优雅的解决方案**

#### 关键方法论：控制速度与抽象层次

情况速度操作探索不同解决方案空间快让 Claude 自由探索代码库不同区域理解关键细节慢问”这一行到底是什么意思？”评估方案可行性中让 Claude 解释利弊，你做决策**启示** ：即使在完全未知的领域，使用 Claude Code 你能做到的 **远比想象的多** 。之前你可能不敢碰 Rust 代码，现在可以自信地去尝试。
### 三、后台运行 Bash 命令与子代理（Subagent）

#### Bash 命令后台化

当一个 Bash 命令运行时间 **超出预期** ，按 **`Ctrl+B`** 将其移到后台：

- Claude Code 知道如何管理后台进程
- 之后可以通过 **BashOutput 工具** 检查进度
- 可以配合 Tip 17 中提到的 **指数退避** 方法定期检查
- 或者让 Claude 在进程运行期间 **做其他事情**

#### 子代理的战略性使用

子代理（Subagent）不仅仅是后台工具，更是 **并行处理** 的利器：

**应用场景** ：

- **大型代码库分析** ：多个子代理 **并行** 分析代码库的不同部分
- **长时间研究任务** ：让代理在后台执行，你继续前台工作
- **周期性检查** ：让代理定期检查某些状态
**子代理的三个可定制维度** ：

维度说明数量告诉 Claude 你需要多少个子代理前台 vs 后台指定后台运行，或按 Ctrl+B 转后台模型选择根据任务复杂度选择 Opus 、 Sonnet 或 Haiku （默认 Sonnet）**示例** ：”分析这个代码库，用 3 个子代理分别分析前端、后端和数据库层，前两个用 Sonnet，数据库层用 Opus。”
### 四、个性化软件的时代已经到来

**核心观点** ：我们正在进入 **个性化、定制软件** 的时代。AI（尤其是 Claude Code）让个人能够快速构建 **只为自己服务** 的软件。

#### 作者的个性化软件实例

- **语音转录工具** ：每天用来与 Claude Code 对话
- **Claude Code 自定义脚本** ：状态栏、克隆工具等
- **数据可视化与分析** ：用 Python 完成，速度远超以前
- **Slack CLI** ：替代需要 Docker 的 Slack MCP Server（避免 Docker-in-Docker 的复杂性），直接用 Slack Node SDK 实现
- **演示幻灯片模板** ：单个 HTML 文件（CSS + JS），内嵌交互式持久终端

#### 实际案例：Slack CLI 的构建

- **问题** ：开源项目 `korotovsky/slack-mcp-server` 设计为 Docker 容器运行，在已有的 Docker 容器中使用（Docker-in-Docker）非常麻烦
- **解决** ：直接让 Claude Code 用 **Slack 的 Node SDK** 写一个 CLI，效果很好
- **耗时** ：数小时内完成
**核心理念** ：无论你想完成什么，如果规模足够小，你可以在 **一两个小时** 内用 Claude Code 构建出来。
### 五、输入框的导航与编辑快捷键

Claude Code 的输入框模拟了常见的 **终端 / readline 快捷键** ，对终端用户非常友好。

#### 导航快捷键

快捷键功能Ctrl+A跳转到 行首Ctrl+E跳转到 行尾Option+←/→ （Mac）/ Alt+←/→按 单词 前后跳转
#### 编辑快捷键

快捷键功能Ctrl+W删除 前一个单词Ctrl+U删除从光标到 行首Ctrl+K删除从光标到 行尾Ctrl+C / Ctrl+L清除 当前输入Ctrl+G在 外部编辑器 中打开当前提示词（适合粘贴长文本，终端直接粘贴会很慢）
#### 外部编辑器配置（Ctrl+G）

编辑器由 **`EDITOR`** 环境变量决定，两种设置方式：

`# 方式一：在 ~/.zshrc 或 ~/.bashrc 中
export EDITOR=vim      # 或 nano, code, nvim 等
// 方式二：在 ~/.claude/settings.json 中（需重启）
{
  "env": {
    "EDITOR": "vim"
  }
}`

#### 多行输入与图片粘贴

- **换行** ：输入 `\` 然后按 Enter；或运行 `/terminal-setup` 后使用 **`Option+Enter`** （Mac Terminal.app）
- **粘贴图片** ： **`Ctrl+V`** （Mac/Linux）或 **`Alt+V`** （Windows）  

- ⚠️ Mac 上是 **`Ctrl+V`** ，不是 `Cmd+V`

**

### 六、花时间规划，但也要快速原型验证

#### 规划的重要性

在让 Claude Code 写代码之前，先做好 高层决策** ：

- 使用什么 **技术栈**
- 项目应该如何 **组织结构**
- 每个功能应该 **放在哪里** 、哪些 **文件** 中
** 好的决策越早做出，后面的引导就越顺畅。
#### 原型验证辅助决策

快速原型** 可以帮助你验证技术选型：

- 作者在构建 diff viewer 时的经历：  

- 先尝试 **Bash + tmux + lazygit** 的简单原型
- 再尝试 **Ink + Node** 自建 Git viewer
- 遇到各种问题，最终都没发布
- 但通过这个过程 **验证了技术选型** ，学到了宝贵经验
**

#### Plan Mode

- 按 `Shift+Tab`** 切换到 **Plan Mode**
- 或者直接要求 Claude Code 在写代码前 **先制定计划**
- 在写代码的过程中也要 **持续引导** ，但开头的规划尤为关键

### 七、简化过度复杂的代码

#### 问题

Claude Code 有一个常见倾向—— **过度工程化** ：

- 写了 **比需要更多的代码**
- 做了你 **没有要求的改动**
- 代码虽然能正确运行，但 **难以维护** 和 **难以审查**

#### 应对方法

- **审查后要求简化** ：问 Claude “为什么做了这个改动？” 或 “为什么加了这一行？”
- **主动要求精简** ：直接说 “简化这段代码”
- **自己理解每一处** ：如果你对每个细节都提问，你实际上能 **比传统方式更快地** 理解代码
**反驳”AI 代码你永远不会理解”的论点** ：只有在你 **不问问题** 的时候才成立。如果你确保理解每一处，AI 反而成了 **加速理解的工具** 。
#### 同样适用于文字输出

Claude Code 在生成文字时有类似问题：

- 最后一段经常 **重新总结** 前面所有段落
- 最后一句经常 **复述** 前面的句子
- 大多数时候需要要求它 **删除或精简** 这些冗余内容

### 八、自动化的自动化（Automation of Automation）

**核心理念** ：不断寻找可以自动化的重复任务，然后 **用 Claude Code 自动化它们** ——这就是”自动化的自动化”。

#### 作者的自动化进化路径

`ChatGPT 复制粘贴命令 → 构建 Kaguya 插件自动执行
→ Claude Code 出现（无需自建工具）
→ 自动化打字过程 → 用 Claude Code 构建语音转录 App
→ 自动化重复指令 → 放入 CLAUDE.md
→ 自动化重复命令 → 放入 Skills 或创建脚本`

#### 识别自动化机会的信号

- 你发现自己 **重复执行** 同一个任务
- 你发现自己 **重复输入** 同一段话
- 你发现自己 **重复运行** 同一个命令
**法则** ：重复两三次是正常的，但如果一个动作被 **反复重复** ，就应该考虑自动化。这个过程不仅提高效率，而且 **非常有趣** 。
### 九、分享知识与社区贡献

#### 分享知识的双向价值

分享不是单向的——它是一个 **双向学习** 过程：

- 分享缩短系统提示的技巧 → 有人告知 **`--system-prompt`** 标志作为替代方案
- 分享斜杠命令与 Skills 的区别 → 从 Reddit 评论中学到新东西
- 在 Daft 公司内部举办了 AI 编程 Session → 获得同事反馈

#### 向 Claude Code 团队贡献

作者向 Claude Code 仓库提交了多个 Issue，在 **v2.0.67** 中看到多项建议被采纳：

- 修复了 `/permissions` 中删除权限规则后 **滚动位置重置** 的问题
- 为 `/permissions` 命令添加了 **搜索功能**
**团队响应极快** ，因为他们自己也在 **用 Claude Code 来构建 Claude Code** 。
### 十、持续学习的渠道

#### 四个推荐学习途径

渠道说明问 Claude Code 本身Claude Code 内置了一个专门回答自身功能问题的 专用子代理 ，涵盖斜杠命令、设置、Hook、MCP 等/release-notes查看当前版本的 更新日志 ，了解最新功能r/ClaudeAI 社区Reddit 上的 Claude AI 社区，学习其他用户的工作流Ado 的推文Anthropic 的 DevRel @adocomplete 发布的 “Advent of Claude” 系列及后续技巧
### 十一、dx 插件——一键安装多个技巧

本技巧合集同时也是一个 Claude Code 插件，名为 **dx** （Developer Experience），将多个技巧打包成一条安装命令。

#### 包含的功能

命令描述对应技巧/dx:gha 分析 GitHub Actions 失败Tip 29/dx:handoff创建交接文档保持上下文连续性Tip 8/dx:clone克隆对话以分支探索Tip 23/dx:half-clone半克隆减少上下文Tip 23/dx:reddit-fetch通过 Gemini CLI 获取 Reddit 内容Tip 11/dx:review-claudemd分析近期对话并改进 CLAUDE.mdTip 30
#### 安装命令

`claude plugin marketplace add ykdojo/claude-code-tips
claude plugin install dx@ykdojo`

**推荐搭配** ： **Playwright MCP** 用于浏览器自动化：

`claude mcp add -s user playwright npx @playwright/mcp@latest`

### 十二、快速配置脚本——一键设置

运行以下命令可一次性配置多项推荐设置：

`bash 

#### 配置项一览

**安装项** ：

- **DX 插件** ——斜杠命令和 Skills
- **cc-safe** ——扫描设置中的高风险命令（如 `rm -rf`、`sudo`）
**设置项** （`~/.claude/settings.json`）：

- **状态栏** ——显示模型、Git 分支、未提交文件、Token 使用量
- **禁用自动更新** ——防止 Claude Code 自动升级（便于系统提示词补丁管理）
- **懒加载 MCP 工具** ——仅在需要时加载 MCP 工具定义，节省上下文
- **`Read(~/.claude)` 权限** ——允许 clone/half-clone 命令读取对话历史
- **`Read(//tmp/**)` 权限** ——允许无提示读取临时文件
- **禁用署名** ——移除 commit 中的 Co-Authored-By 和 PR 中的归属信息
**Shell 配置** （`~/.zshrc` 或 `~/.bashrc`）：

- **别名** ：`c=claude`、`ch=claude --chrome`、`cs=claude --dangerously-skip-permissions`
- **Fork 快捷方式** ：`--fs` 展开为 `--fork-session`
** 脚本会显示所有配置项并让你 选择跳过** 任意项目，非常灵活。
