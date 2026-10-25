---
title: "欢迎来到项目实战"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/zh/projects/index/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# 欢迎来到项目实战

这里是 Learn Harness Engineering 的动手实践部分。仅仅阅读讲义是不够的，你需要亲自搭建环境，观察 Codex 或 Claude Code 等 Agent 在不同规则下的真实表现。

## 项目概览

本课程包含 6 个渐进式的实战项目，带你从零开始构建一个完整的 Agent 工作环境：

1. <strong>提示词驱动 vs 规则驱动</strong>：对比一个纯 Prompt 驱动的 Agent 和带有基础 Harness 的 Agent 在表现上的差异。
2. <strong>让项目可读并接住上次工作</strong>：学习如何重构代码仓库结构，使其对 AI 更加友好，并建立工作交接机制。
3. <strong>跨会话工作连续性</strong>：设计状态文件和初始化脚本，让 Agent 可以在多次对话中断后无缝恢复工作。
4. <strong>运行反馈与行为修正</strong>：引入运行时反馈机制，让 Agent 能够自己检查代码是否能跑通，并修正错误。
5. <strong>工作评审与自我验证</strong>：建立独立的评审与验证环节，防止 Agent 产生“幻觉”或提前宣告胜利。
6. <strong>综合 Agent 工作环境</strong>：搭建一套完整的、带有可观测性的最终 Agent 工作环境（综合演练）。

## 如何进行

每个项目文件夹中通常包含：
- `starter/`：你的起始工作区。
- `solution/`：参考的最终实现（如果你卡住了可以参考）。
- 相关的指导文档，说明本次任务的具体背景和目标。

请使用你习惯的 AI Coding Agent（如 Claude Code、Cursor、Trae 等）在每个项目的 `starter/` 目录下完成任务。
