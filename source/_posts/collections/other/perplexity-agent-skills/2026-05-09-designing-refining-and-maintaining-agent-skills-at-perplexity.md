---
title: Designing, Refining, and Maintaining Agent Skills at Perplexity
date: "2026-05-09 13:24:59"
updated: "2026-05-09 13:24:59"
layout: post
permalink: /collections/other/perplexity-agent-skills/2026-05-09-designing-refining-and-maintaining-agent-skills-at-perplexity/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 博客
  - Agent
  - Skill
  - Perplexity
source_url: https://research.perplexity.ai/articles/designing-refining-and-maintaining-agent-skills-at-perplexity
---


# Designing, Refining, and Maintaining Agent Skills at Perplexity

> 原文：https://research.perplexity.ai/articles/designing-refining-and-maintaining-agent-skills-at-perplexity
> 发布：2026年5月1日

## 核心观点

Perplexity 的前沿 Agent 产品建立在模块化的 **Agent Skills** 之上。这些 Skills 包含了驱动 Perplexity Computer 的通用工具，以及金融、法律、医疗等垂直领域的能力。

编写高质量 Skill 的直觉和最佳实践，与编写传统软件所需的截然不同。许多编写代码的有用模式，在 Skill 创建中会变成反模式。

## PEP20 vs Skill Zen

| Zen of Python | Zen of Skills |
|---------------|---------------|
| Simple is better than complex | **A Skill is a folder, not a file. Complexity is the feature.** |
| Explicit is better than implicit | Activation is implicit pattern matching |
| Sparse is better than dense | Context is expensive. Maximum signal per token |
| Special cases aren't special enough to break the rules | **Gotchas ARE the special cases (they're the highest-value content)** |
| If the implementation is easy to explain, it may be a good idea | **If it's easy to explain, the model already knows it. Delete it.** |

## Skill 是什么？

写 Skill 不是写传统软件——你在为模型和环境构建上下文。一个 Skill 是四样东西：

### 1. Skill 是一个目录

Skill 不只是单个 `SKILL.md` 文件。一个 Skill 目录可能包含：

- `SKILL.md` — frontmatter 和指令
- `scripts/` — agent 运行的代码
- `references/` — 重文档，按需加载
- `assets/` — 模板、schema、数据
- `config.json` — 首次运行的用户设置

多级目录结构可以帮助模型导航。例如，税务 Skill 使用了 3 层嵌套来处理 1945 个 IRS 条目——把所有内容塞进一个文件夹的效果比不加载 Skill 还差。

### 2. Skill 是一种格式

`SKILL.md` 的 frontmatter 必须包含 `name` 和 `description`。`description` 是路由触发器，不是内部文档。它的作用是告诉模型"何时加载这个 Skill"。

**常见失败点**：description 不是"这个 Skill 做什么"，而是"何时加载"。应该是"Load when..."而不是"This Skill does"。

### 3. Skill 是可调用的

Agent 在运行时加载 Skill。Computer 的 Skill 加载分为三层：

| Tier | 内容 | 预算 |
|------|------|------|
| Index | name + description（每个非隐藏 Skill） | ~100 tokens/Skill |
| Load | 完整 SKILL.md body | ~5000 tokens |
| Runtime | scripts/、references/、assets/、subskills | 无上限 |

每个 token 都有成本。如果 Skill 加载了但没有做正确的事，那就是浪费上下文。

### 4. Skill 是递进的

```python
Computer calls load_skill(name="...")
Computer copies the Skill directory into the isolated execution sandbox
Computer recursively auto-loads dependencies in the "depends:" tag
Computer then strips the frontmatter and the agent thus only sees the body
```

## 何时需要 Skill？

**需要 Skill 的情况：**
- Agent 没有特殊上下文会出错
- 需要跨运行高度一致的不确定性或非确定性
- 你的知识持久但不在训练数据中（截止日期、企业工作流、品味判断）

**不需要 Skill 的情况：**
- 模型已经知道该怎么做（比如一串 git 命令）
- 重复系统 prompt 的指令
- 频繁变化的远程 MCP 端点（会导致 drift）

**每个 Skill 都是一种税。** 问自己："没有这条指令，Agent 会出错吗？"如果不需要，就不能放在那里。

## 如何构建 Skill

### Step 0: 先写 Evals

从以下来源获取评估用例：
- 真实用户查询
- 已知失败（Agent 失败因为 Skill 不存在）
- 邻居混淆（接近你的领域边界但路由到另一个 Skill）

负例极其强大，可能比正例更重要。

### Step 1: 写 Description

这是最硬的一行。是路由触发器，不是文档。

**好的 description** 说工程师沮丧时会说的话，比如"babysit"、"watch CI"、"make sure this lands"。

快速检查清单：
- 以 "Load when..." 开头
- 目标 50 词或更少
- 描述用户意图
- 不总结工作流

### Step 2: 写 Body

跳过显而易见的东西。**不要写一串命令**。

不好的写法：
```
git log # find the commit; git checkout main; git checkout -b <clean-branch>; git cherry-pick <commit>
```

好的写法：
```
Cherry-pick the commit onto a clean branch. Resolve conflicts preserving intent. If it can't land cleanly, explain why.
```

关注 gotchas 和负例。这是极高信号的内容。

### Step 3: 使用目录结构

```
scripts/      — Agent 每轮都会重新发明的确定性逻辑
references/   — 重量级文档，仅在满足条件时加载
assets/       — Agent 复制填充的输出模板
config.json   — 首次运行用户设置
```

### Step 4: 迭代

先在主分支上无 Skill 做几轮迭代，收集 hero query set，然后跑一堆 evals。小的词改动在 description 上可能对路由有很大影响。

### Step 5: 发布

## 如何维护 Skill

### Gotchas Flywheel

Skill 是"几乎是只追加的"：

- Agent 在某事上失败 → 加一个 gotcha
- Agent 错误地加载 Skill → 收紧 description 并加负例 evals
- Agent 应该加载时没加载 → 加关键词和正例 evals
- 系统 prompt 变化 → 检查竞争或重复

### Eval 套件

Perplexity 运行多种 eval 套件：
1. **Skill loading evals** — 检查路由的精确率、召回率
2. **Skill file reads evals** — 检查正确的渐进加载
3. **End-to-end task evals** — 在完整 agent 循环中用 LLM judge 评分
4. **跨模型测试** — GPT、Claude Opus、Claude Sonnet 行为不同

## 关键结论

> "Self-generated Skills provide no benefit on average, showing that models cannot reliably author the procedural knowledge they benefit from consuming."

- **写 evals 先于 Skill**
- **Description 是最难的部分**："Load when..."（每个词都有成本）
- **Gotchas 是极高价值的内容**
- **从薄开始，随着 agent 失败而增长**
- **注意远距效应**：加新 Skill 可能破坏已有的 Skill（即使没碰它们）

---

更多示例见 [Agent Skills website](https://agent skills website)。

![](/images/collections/other/perplexity-agent-skills/asset/hr7cGJptEmhQmgDCyPXWQMxamIk.png)

![](/images/collections/other/perplexity-agent-skills/asset/StL77jSrvpQypM4nJ5omvZdkHQ.png)