---
title: "Unlocking the Codex harness: how we built the App Server"
date: "2026-05-10 01:36:12"
updated: "2026-05-10 01:36:12"
layout: post
permalink: /collections/other/harness-engineering/2026-05-09-unlocking-codex-harness/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - Codex
  - App Server
  - 软件工程
  - Agent
  - Harness
---


*来源：[OpenAI](https://openai.com/index/unlocking-the-codex-harness/)，原文发表于 2026 年 2 月 4 日*

---

OpenAI 的 coding agent Codex 存在于许多不同的界面：[Web 应用](https://chatgpt.com/codex)、[CLI](https://github.com/openai/codex)、[IDE 扩展](https://developers.openai.com/codex/ide/)，以及[新的 Codex macOS 应用](/index/introducing-the-codex-app/)。在底层，它们都由同一个 Codex harness 驱动——即支撑所有 Codex 体验的 agent 循环和逻辑。它们之间的关键链接？[Codex App Server](https://developers.openai.com/codex/app-server)，一个对客户端友好的双向 JSON-RPC API。

在这篇文章中，我们将介绍 Codex App Server；分享目前关于将 Codex 能力带入你自己产品的最佳方式的所学。希望帮助你让你的用户超级充电他们的工作流程。我们将涵盖 App Server 的架构和协议，以及它如何与不同的 Codex 界面集成，以及利用 Codex 的技巧——无论你想把 Codex 变成代码审查者、SRE agent 还是编程助手。

## App Server 的由来

在深入架构之前，了解 App Server 的背景故事会很有帮助。最初，App Server 是一种在产品间重用 Codex harness 的实用方法，逐渐演变为我们的标准协议。

Codex CLI 始于 TUI（终端用户界面），意味着 Codex 通过终端访问。当我们构建 VS Code 扩展（一种更 IDE 友好的与 Codex agent 交互的方式）时，我们需要一种使用相同 harness 的方式，以便从 IDE UI 驱动相同的 agent 循环，而不需要重新实现它。这意味着支持丰富的交互模式超越请求/响应，例如探索工作空间、在 agent 推理时流式传输进度，以及发出 diffs。我们首先尝试将[Codex 暴露为 MCP server](https://github.com/openai/codex/pull/2264)，但以一种对 VS Code 有意义的方式维护 MCP 语义被证明是困难的。相反，我们引入了一个镜像 TUI 循环的 JSON-RPC 协议，这成为了 App Server 的[非官方第一个版本](https://github.com/openai/codex/pull/4471)。当时，我们没有期望其他客户端依赖 App Server，所以它没有被设计为稳定的 API。

随着 Codex 在接下来的几个月被采用，内部团队和外部合作伙伴希望能够在他们自己的产品中嵌入相同的 harness，以加速用户的软件开发工作流程。例如，JetBrains 和 Xcode 想要一个 IDE 级的 agent 体验，而 Codex 桌面应用需要并行编排许多 Codex agent。这些需求推动我们设计了一个我们的产品和合作伙伴集成可以安全地长期依赖的平台界面。它需要易于集成且向后兼容，这意味着我们可以发展协议而不破坏现有客户端。

接下来，我们将介绍如何设计架构和协议，以便不同客户端可以使用相同的 harness。

## Codex harness 内部

首先，让我们放大看看 Codex harness 的内部结构，以及 Codex App Server 如何向客户端暴露它。在我们之前的 Codex [博客](/index/unrolling-the-codex-agent-loop/)中，我们分解了协调用户、模型和工具之间交互的核心 agent 循环。这是 Codex harness 的核心逻辑，但完整的 agent 体验还有更多：

1. <strong>Thread 生命周期和持久化</strong>。Thread 是用户和 agent 之间的 Codex 对话。Codex 创建、恢复、分叉和归档 threads，并持久化事件历史，以便客户端可以重新连接并呈现一致的时间线。
2. <strong>配置和认证</strong>。Codex 加载配置、管理默认值，并运行"用 ChatGPT 登录"等认证流程，包括凭证状态。
3. <strong>工具执行和扩展</strong>。Codex 在沙箱中执行 shell/文件工具，并连接 MCP servers 和 skills 等集成，以便它们可以在一致的政策模型下参与 agent 循环。

我们这里提到的所有 agent 逻辑，包括核心 agent 循环，都住在 Codex CLI 代码库的一个叫做"[Codex core](https://github.com/openai/codex/tree/main/codex-rs/core)"的部分。Codex core 既是一个所有 agent 代码所在的库，也是一个可以启动来运行 agent 循环和管理一个 Codex thread（对话）持久化的运行时。

为了让 Codex harness 有用，它需要能够被客户端访问。这就是 App Server 的用武之地。

App Server 既是客户端和服务器之间的 JSON-RPC 协议，也是一个托管 Codex core threads 的长期运行的进程。从上图可以看出，一个 App Server 进程有四个主要组件：stdio reader、Codex 消息处理器、thread manager 和 core threads。Thread manager 为每个 thread 启动一个 core session，然后 Codex 消息处理器直接与每个 core session 通信，提交客户端请求并接收更新。

一个客户端请求可以产生许多事件更新，这些详细事件是我们能够在 App Server 之上构建丰富 UI 的原因。此外，stdio reader 和 Codex 消息处理器作为客户端和 Codex core threads 之间的翻译层。它们将客户端 JSON-RPC 请求翻译成 Codex core 操作，监听 Codex core 的内部事件流，然后将那些低级事件转换成一小套稳定的、UI 就绪的 JSON-RPC 通知。

客户端和 App Server 之间的 JSON-RPC 协议是全双工的。一个典型的 thread 有客户端请求和许多服务器通知。此外，当 agent 需要输入（如批准）时，服务器可以发起请求，然后暂停 turn 直到客户端响应。

## 对话原语

接下来，我们将分解对话原语——App Server 协议的构建块。为 agent 循环设计 API 很棘手，因为用户/agent 的交互不是简单的请求/响应。一个用户请求可以展开成一个结构化的动作序列，客户端需要忠实地表示：用户的输入、agent 的增量进度、沿途产生的 artifacts（例如 diffs）。为了让这种交互流易于集成并在 UI 间有弹性，我们确定了三个核心原语，边界和生命周期清晰：

1. <strong>Item</strong>：Item 是 Codex 中输入/输出的原子单元。Item 是类型化的（例如用户消息、agent 消息、工具执行、批准请求、diff），每个都有明确的生命周期：
   - `item/started` 当 item 开始时
   - 可选的 `item/*/delta` 事件随着内容流入（对于流式 item 类型）
   - `item/completed` 当 item 最终确定其最终 payload 时
   
   这个生命周期让客户端可以在 started 时立即开始渲染，在 delta 上流式传输增量更新，并在 completed 时最终确定。

2. <strong>Turn</strong>：Turn 是由用户输入发起的一个单位 agent 工作。它在客户端提交输入时开始（例如"运行测试并总结失败"），在 agent 完成产生该输入的输出时结束。一个 Turn 包含代表沿途的中间步骤和产生的输出的 item 序列。

3. <strong>Thread</strong>：Thread 是一个持久的容器，用于用户和 agent 之间的持续 Codex 会话。它包含多个 Turns。Threads 可以被创建、恢复、分叉和归档。Thread 历史被持久化，以便客户端可以重新连接并呈现一致的时间线。

现在，我们来看一个客户端和 agent 之间的简化对话，其中对话由原语表示：

在对话开始时，客户端和服务器需要建立 initialize handshake。客户端必须在任何其他方法之前发送一个 initialize 请求，服务器用响应确认。这给了服务器一个宣传能力的机会，让双方在实际工作开始之前就协议版本、功能标志和默认值达成一致。

当客户端发出新请求时，它会首先创建一个 thread，然后创建一个 turn。服务器将发送进度通知（`thread/started` 和 `turn/started`）。它还会发回它注册为 items 的输入，例如这里的用户消息。

工具调用也会作为 items 发回给客户端。此外，服务器可能在运行操作之前通过发送服务器请求要求客户端批准。批准将暂停 turn，直到客户端回复"allow"或"deny"。

最后，服务器发送 agent 消息，然后用 `turn/completed` 结束 turn。Agent 消息 delta 事件将消息片段流式传回，直到消息用 `item/completed` 最终确定。

## 与客户端集成

现在，让我们看看不同的客户端界面如何通过 App Server 嵌入 Codex。我们将介绍三种模式：本地应用和 IDE、Codex web runtime 和 TUI。

在这三种中，传输方式是 JSON-RPC over stdio（JSONL）。JSON-RPC 使得用你选择的语言构建客户端绑定变得简单。Codex 界面和合作伙伴集成已经用 Go、Python、TypeScript、Swift 和 Kotlin 等语言实现了 App Server 客户端。对于 TypeScript，你可以通过运行以下命令直接从 Rust 协议生成定义：

```
npx codex codegen typescript
```

对于其他语言，你可以生成一个 JSON Schema bundle 并将其输入到你喜欢的代码生成器中：

```
npx codex codegen schema
```

本地客户端通常捆绑或获取特定平台的 App Server 二进制文件，将其作为长期运行的子进程启动，并保持一个双向 stdio 通道用于 JSON-RPC。在我们的 VS Code 扩展和桌面应用中，例如，发布的 artifact 包含特定平台的 Codex 二进制文件，并与一个经过测试的版本绑定，这样客户端总是运行我们验证过的确切位。

并非每个集成都能频繁发布客户端更新。一些合作伙伴（如 Xcode）通过保持客户端稳定并允许它指向更新的 App Server 二进制文件来解耦发布周期。这样他们可以采用服务器端的改进（例如 Codex core 中更好的自动压缩或新支持的配置键）并在不等待客户端发布的情况下推出错误修复。App Server 的 JSON-RPC 界面被设计为向后兼容，所以较旧的客户端可以安全地与较新的服务器通信。

Codex Web 使用 Codex harness，但在容器环境中运行它。一个 worker 配置一个包含检入工作空间的容器，在其中启动 App Server 二进制文件，并通过 JSON-RPC over stdio 保持长期通道。Web 应用（在用户浏览器标签中运行）通过 HTTP 和 SSE 与 Codex 后端通信，流式传输 worker 产生的事件。这使得浏览器端 UI 保持轻量，同时在我们跨桌面和 Web 提供一致的运行时。

因为 Web 会话是临时的（标签关闭，网络掉线），Web 应用不能成为长期运行任务的真实来源。在服务器上保持状态和进度意味着即使标签消失，工作也能继续。流式协议和保存的 thread 会话使得新会话容易重新连接，从中断的地方继续，而不需要在客户端重建状态。

历史上，TUI 是一个"本地"客户端，与 agent 循环运行在同一个进程中，并直接与 Rust core 类型对话，而不是 app-server 协议。这使得早期迭代快速，但也使 TUI 成为特殊情况的界面。

现在 App Server 存在了，我们计划[重构 TUI](https://github.com/openai/codex/pull/10192) 来使用它，这样它就像任何其他客户端一样：启动一个 App Server 子进程，通过 stdio 说话 JSON-RPC，并渲染相同的流式事件和批准。这解锁了 TUI 可以连接到在远程机器上运行的 Codex 服务器的工作流程，将 agent 保持在计算附近，即使笔记本电脑睡眠或断开连接也能继续工作，同时仍在本地传递实时更新和控制。

## 选择正确的协议

Codex App Server 将是我们维护的头等集成方法，但也有其他功能更有限的其他方法。默认情况下，我们建议客户端使用 Codex App Server 与 Codex 集成，但值得看看不同的集成方法并了解它们的优缺点。以下是驱动 Codex 的最常见方式以及每种方式何时适合：

<strong>[MCP Server](https://developers.openai.com/codex/guides/agents-sdk/)</strong>：运行 `codex mcp-server` 并从任何支持 stdio servers 的 MCP 客户端连接。如果你已经有了一个基于 MCP 的工作流并想将 Codex 作为一个可调用工具，这是一个很好的选择。缺点是你只能获得 MCP 暴露的内容，所以依赖更丰富的会话语义的 Codex 特定交互（例如 diff 更新）可能无法干净地通过 MCP 端点映射。

<strong>[其他生态协议](https://openai.com/index/open-source-codex-orchestration-symphony/)</strong>：一些生态系统提供了一个可移植接口，可以针对多个模型提供者和运行时。如果你想要一个协调多个 agent 的抽象，这可能是一个很好的选择。代价是这些协议通常会在能力交集上收敛，这使得更丰富的交互更难表示，特别是当提供者特定的工具和会话语义很重要时。这个领域发展很快，我们预计随着我们弄清楚代表真实世界 agent 工作流的最佳原语，会出现更多通用标准（[skills](https://agentskills.io/home) 是一个很好的例子）。

<strong>App Server</strong>：当你想要将完整的 Codex harness 暴露为一个稳定的、对 UI 友好的事件流时选择 App Server。你既得到了 agent 循环的全部功能，也得到了其他支持功能，如用 ChatGPT 登录、模型发现和配置管理。主要成本是集成工作，因为你需要在你的语言中构建客户端 JSON-RPC 绑定。然而在实践中，如果你提供 JSON schema 和文档，Codex 能够完成很多繁重的工作。与我们合作的许多团队能够使用 Codex 快速实现一个工作集成。

<strong>CLI 非交互模式</strong>：用于一次性任务和 CI 运行的轻量级、可脚本化的 CLI 模式。当你想要一个单一命令运行完成、非交互式流式传输结构化输出用于日志，并以明确的成功或失败信号退出时，这是一个很好的选择。

<strong>Agents SDK</strong>：一个 TypeScript 库，用于在你自己应用内部从程序上控制本地 Codex agent。当你想要一个用于服务器端工具和工作流的原生库接口而不构建单独的 JSON-RPC 客户端时，这是最好的。因为它比 App Server 更早发布，目前支持更少的语言和更小的 surface area。如果有开发者兴趣，我们可能会添加额外的 SDK 来包装 App Server 协议，这样团队可以覆盖更多的 harness surface，而不需要编写 JSON-RPC 绑定。

## 总结

在这篇文章中，我们分享了我们如何设计一个与 agent 交互的新标准，以及如何将 Codex harness 变成一个稳定的、对客户端友好的协议。我们涵盖了 App Server 如何暴露 Codex core，让客户端驱动完整的 agent 循环，并为广泛的界面提供动力，包括 TUI、本地 IDE 集成和 web runtime。

如果这激发了将 Codex 集成到你自己的工作流程中的想法，值得尝试 App Server。所有源代码都在 Codex CLI 开源[仓库](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)中。随意分享你的反馈和功能请求。我们很乐意听取你的意见，继续让 agent 对每个人都更容易访问。

---

*AI 附注：这篇文章是 Harness Engineering 系列的技术补充，详细介绍了 Codex App Server 的架构设计。核心是：通过 JSON-RPC over stdio 协议，把 Codex core（agent 循环和逻辑）暴露给各种客户端（CLI、Web、IDE 扩展）。三个核心原语——Item（原子输入/输出单元）、Turn（一个用户输入触发的 agent 工作单元）、Thread（持久化的会话容器）——构成了整个交互模型的基础。*