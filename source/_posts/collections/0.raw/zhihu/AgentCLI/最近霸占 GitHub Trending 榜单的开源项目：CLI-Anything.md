---
title: 最近霸占 GitHub Trending 榜单的开源项目：CLI-Anything
date: "2026-03-12 00:00:00"
updated: "2026-03-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AgentCLI/最近霸占-GitHub-Trending-榜单的开源项目-CLI-Anything/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2015432759355668382
---


CLI-Anything 是由香港大学数据科学实验室（HKUDS）开源的一个创新项目。它的核心目标是弥合 AI 智能体（Agents）与现有专业软件之间的鸿沟，通过自动将任何软件转化为“智能体原生”（Agent-Native）的命令行界面（CLI），让 AI 能够像人类使用图形界面一样熟练地操控复杂软件。

一行命令，让任意软件秒变 AI Agent 可控工具——GIMP、Blender、LibreOffice、OBS Studio……全部拿下。  发布仅 3 天，GitHub Star 数飙至 3.5k+，Fork 334 次，登上 GitHub Trending 榜单，还在飙升当中！  核心逻辑极其优雅：CLI 是人类和 AI Agent 的通用接口。与其让 Agent 去截图点击、对抗脆弱的 UI 自动化，不如直接把软件变成结构化命令行工具——JSON 输出、undo/redo、零配置安装，Agent 直接调用，稳如磐石。  全自动 7 阶段流水线：分析代码 → 架构设计 → 实现 CLI → 测试 → 文档 → 发布，一个命令全搞定。已覆盖 9 款专业软件，通过 1,436 项测试，不是 Demo，是真正生产级的工具。

**核心理念：为什么是 CLI？

在 AI 时代，软件的用户不再仅仅是人类，更多的是 AI 智能体。CLI-Anything 认为 CLI 是智能体与软件交互的最优解，原因如下：

•结构化与可组合性：文本命令天然符合大语言模型（LLM）的输出格式，且易于链式调用完成复杂工作流。

•轻量且通用：最小的开销，跨系统运行，无需复杂的图形界面依赖。

•自描述性：通过 --help 标志，AI 可以自动发现和学习工具的使用方法。

•确定性与可靠性：相比脆弱的 GUI 自动化（如模拟点击），CLI 提供了更稳定的执行路径。

•智能体优先设计：内置 JSON 输出格式，消除了 AI 解析输出的复杂性。

主要功能与特点**

**

特性详细说明全自动流水线提供 7 阶段自动化流程，从源码分析、CLI 设计、代码实现到测试验证及文档生成。广泛的软件支持已成功适配 GIMP、Blender、OBS Studio、LibreOffice、Audacity、Inkscape 等 11 款专业软件。无损能力转化直接调用软件后端（如渲染引擎），而非简化的替代方案，保留软件 100% 的专业能力。多平台集成原生支持 Claude Code、OpenCode 等主流 AI 编程智能体框架。迭代式改进提供 refine 命令，支持通过自然语言描述持续扩展 CLI 的功能覆盖范围。

自动化构建流程**（7 阶段）

当你对一个软件运行 /cli-anything 命令时，它会执行以下闭环流程：

1.🔍 分析 (Analyze)：扫描源代码，将 GUI 操作映射到底层 API。

2.📐 设计 (Design)：架构命令组、状态模型和输出格式。

3.🔨 实现 (Implement)：构建基于 Click 的 CLI，支持 REPL、JSON 输出和撤销/重做。

4.📋 测试计划 (Plan Tests)：创建包含单元测试和端到端测试的 TEST.md。

5.🧪 编写测试 (Write Tests)：实现全面的测试套件。

6.📝 文档化 (Document)：更新测试结果和使用说明。

7.📦 发布 (Publish)：创建安装脚本并集成到系统路径。

**

应用场景**

CLI-Anything 适用于多种领域的软件改造：

•创意与媒体：让 AI 操控 Blender 进行 3D 建模，或使用 GIMP 进行图像批处理。

•数据与分析：自动化 JupyterLab、Apache Superset 等工具的数据处理流。

•开发工具：将复杂的 DevOps 工具（如 Jenkins、SonarQube）转化为 AI 可直接调用的命令。

•办公与企业：让 AI 直接操作 LibreOffice 生成专业文档或表格。

•科学计算：自动化 ImageJ、FreeCAD 等科研软件的仿真和计算任务。

**

快速上手**

1. 在 Claude Code 中使用（推荐）

Bash

# 添加并安装插件 /plugin marketplace add HKUDS/CLI-Anything /plugin install cli-anything # 为目标软件生成 CLI（以 GIMP 为例） /cli-anything ./gimp

2. 使用生成的 CLI

生成的工具安装后，可以像普通命令一样使用：

Bash

# 查看帮助 cli-anything-gimp --help # 以 JSON 格式添加图层（AI 友好） cli-anything-gimp --json layer add -n "Background" --type solid --color "#1a1a2e" # 进入交互式 REPL 模式 cli-anything-gimp

CLI-Anything 不仅仅是一个工具，它提出了一套让软件进化为 Agent-Native 的标准方法论（详见其 HARNESS.md 规范）。它让 AI 不再受限于“看屏幕、点鼠标”的低效模式，而是通过结构化的指令集直接驱动专业软件，极大地提升了 AI 智能体在真实生产环境中的可用性和效率。

项目地址：[https://github.com/HKUDS/CLI-Anything](https://link.zhihu.com/?target=https%3A//github.com/HKUDS/CLI-Anything)
