---
title: DeepSeek押注的Harness，被这篇最新综述彻底讲透了
date: "2026-06-03 00:00:00"
updated: "2026-06-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/DeepSeek押注的Harness,被这篇最新综述彻底讲透了/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2045588090547447756
---


大家好，我是PaperAgent，不是Agent！

最近<strong>DeepSeek Harness团队</strong>开始招人了，团队使命：

- Model+Harness=Agent；
- 把前沿模型变成领先的Agent产品；
- <strong>Harness=模型之外全部工作</strong>。
![](https://picx.zhimg.com/v2-f6d577835e8d92a33560755b79cd30e5_r.jpg)https://x.com/wquguru/status/2057852569054278045<strong>Agent Harness Engineering的时代，刚刚开始</strong>。

那么究竟什么是 <strong>Agent Harness Engineering</strong>，这篇最新的综述把这个问题彻底讲透了！

![](https://pic3.zhimg.com/v2-4291b0efa8203b9fdb5ff266d052f8fa_r.jpg)CMU, Yale, JHU, NEU等联合提出 <strong>ETCLOVG 七层架构</strong>，用 170+ 开源项目的实证数据证明：<strong>Harness Engineering 才是 LLM Agent 工业落地的下一个主战场</strong>。

![](https://picx.zhimg.com/v2-7d0c34b0af40cf3f26ce8443a1ae1c29_r.jpg)Harness系统时间线
<strong>01 Harness，而非模型，才是可靠性的"绑定约束"</strong>
过去两年，学术界默认"Agent能力 = 模型能力"——只要模型够强，配上好Prompt就能搞定一切。但这篇Survey用三个硬核证据推翻了这个假设：

![](https://pic3.zhimg.com/v2-c5e0dc09c418a71a6c8be9aac3345d94_r.jpg)Prompt/Context/Harness三阶段对比
- <strong>Bölük (2026a)</strong> 只改动了编辑工具的格式和 surrounding harness，<strong>15个模型的编码基准提升高达10倍</strong>，模型权重零改动；
- <strong>Trivedy (2026)</strong> 固定使用 GPT-5.2-Codex，仅通过系统提示重构、中间件上下文注入和自验证钩子，Terminal-Bench 2.0 成绩从 <strong>52.8% → 66.5%</strong>（+13.7pp）；
- <strong>Meta-Harness (Lee et al., 2026)</strong> 纯自动化优化Harness结构，在 Terminal-Bench-2 上达到 <strong>76.4%</strong>，超越所有手工设计。作者将这一现象命名为 <strong>Binding-Constraint Thesis（绑定约束论）</strong>：<strong>对于长程任务，基准方差由执行Harness驱动，而非模型本身</strong>。这些Harness-only增益远超模型迭代通常带来的2-4pp提升。

<strong>02 三阶段演进：从"写好Prompt"到"设计好系统"</strong>
2022-2026年的Agent工程呈现清晰的三阶段跃迁：

阶段时间核心问题优化范围Prompt Engineering2022-2024模型输入是什么？单调用文本优化Context Engineering2025模型每一步看到什么？多步信息流的动态管理Harness Engineering2026模型如何在系统中可靠运行？跨层基础设施整合

Harness Engineering 并非取代前两阶段，而是<strong>包含并超越</strong>它们。它要求工程师同时治理执行环境、工具协议、上下文状态、编排逻辑、可观测性、评估反馈和安全策略。

![](https://picx.zhimg.com/v2-7d0c34b0af40cf3f26ce8443a1ae1c29_r.jpg)Harness系统时间线
<strong>03 ETCLOVG七层架构：Harness工程的"OSI模型"</strong>
<strong>Figure 2</strong>: ETCLOVG七层架构图。E/T/C/L构成系统结构支柱，O提供全系统监控，V提供跨组件评估反馈，G实施全系统治理约束。

![](https://pica.zhimg.com/v2-43fe5f43d540ce00b22712badadfe35c_r.jpg)

为了系统化这个领域，作者提出 <strong>ETCLOVG 七层分类法</strong>：

- <strong>E</strong>xecution Environment & Sandbox（执行环境与沙箱）
- <strong>T</strong>ool Interface & Protocol（工具接口与协议）
- <strong>C</strong>ontext & Memory Management（上下文与记忆管理）
- <strong>L</strong>ifecycle & Orchestration（生命周期与编排）
- <strong>O</strong>bservability & Operations（可观测性与运维）
- <strong>V</strong>erification & Evaluation（验证与评估）
- <strong>G</strong>overnance & Security（治理与安全）前四层是<strong>结构核心</strong>；后三层是<strong>控制平面</strong>。特别值得注意的是，作者将 <strong>O（可观测性）</strong> 和 <strong>G（治理）</strong> 从传统的Lifecycle Hooks中独立出来，因为生产环境中它们拥有独立的工具栈（Langfuse/OpenTelemetry vs. 权限引擎/审计管道）和独立的负责团队。

![](https://pica.zhimg.com/v2-c8d56d052b5b24fd693b36f68e488ae6_r.jpg)<strong>Figure 4</strong>: Harness Engineering的详细分类树，每层展开为具体子类别。

<strong>04 第一层 E：执行环境与沙箱——Agent的"硬件抽象层"</strong>
在Agent时代，沙箱不再是传统多租户代码执行的附属品，而是同时服务于<strong>三重目的</strong>：

- <strong>安全</strong>：LLM生成的代码不可预测、不可审计，Prompt注入可将 benign Agent 变为攻击向量；
- <strong>可复现</strong>：长程任务和评估需要状态重置到已知基线（如SWE-bench、OSWorld）；
- <strong>活性（Liveness）</strong>：没有沙箱，每个风险动作都需人工授权，导致用户要么放弃使用，要么反射性全部批准。Anthropic报告，为Claude Code引入沙箱后，<strong>权限提示减少84%</strong>，同时保持安全性。

![](https://pic1.zhimg.com/v2-6dec0123c5a8c0eb14f77b41f33558e4_r.jpg)<strong>Figure 6</strong>: Agent沙箱的七大类别：通用托管沙箱、Computer-Use基础设施、代码专用沙箱、框架集成运行时、浏览器评估环境、OS级权限沙箱、沙箱抽象层。

<strong>05 第二层 T：工具接口与协议——Agent的"系统调用层"</strong>
工具层定义Agent如何发现、描述和调用外部能力。生产系统反复报告：<strong>"工具菜单过大"会直接降低可靠性、增加Token开销并放大规划错误</strong>。

![](https://pic1.zhimg.com/v2-ca21093b0a23010411e232e55af1647c_r.jpg)<strong>Figure 7</strong>: 工具接口与协议层的四大方向：协议标准、工具描述/发现/选择、工具增强训练、可扩展性与会话管理。

<strong>协议标准的四个集成边界</strong>

边界代表标准作用Model↔FunctionFunction Calling, OpenAPI结构化调用Agent↔CapabilityMCP, OpenAPI运行时解耦Agent↔AgentA2A, ACP/ANP跨进程委托Agent↔Repo/EnvAGENTS.md, AGENT.md版本控制策略

![](https://pic3.zhimg.com/v2-b1b2fba90d0ed5e5f42356b1fd980780_r.jpg)<strong>Table 1</strong>: 按集成边界划分的工具/接口标准矩阵，对比了Wire格式、类型系统、运行时发现、长运行支持等维度。

<strong>06 第三层 C：上下文与记忆管理——Agent的"内存子系统"</strong>
这一层的核心矛盾是：<strong>上下文窗口不是越大越好</strong>。Transformer的二次注意力成本、U型注意力曲线（中间信息遗忘）、以及Context Rot现象（Hong et al., 2025）都证明——<strong>信息放置比信息存在更重要</strong>。

<strong>三层记忆架构</strong>

![](https://pic2.zhimg.com/v2-cebea611cfcc9b8fca73b3c62fa5adbd_r.jpg)
![](https://picx.zhimg.com/v2-152e9476c1518db697db2355b6130eff_r.jpg)<strong>Figure 8</strong>: 上下文与记忆管理层的五大类别：短期活跃窗口、中期会话状态、长期持久记忆、长程技术、上下文漂移与限制。
<strong>07 第四层 L：生命周期与编排——Agent的"进程调度器"</strong>
编排层解决"任务如何跨多次模型调用、工具调用、失败和修订持续推进"的问题。它将<strong>执行流</strong>与<strong>操作状态</strong>统一处理，这是早期框架常忽略的关键。

<strong>三层组织</strong>

- <strong>单Agent内循环</strong>：ReAct范式的工程化实现（OpenCode, Claude Code, Codex CLI, Aider, SWE-agent）
- <strong>多Agent编排</strong>：层级编排（DeerFlow, AutoGen, OpenAI Agents SDK）、团队编排（oh-my-claudecode）、图组合（LangGraph, Hive）、扇出（Emdash）
- <strong>全生命周期流水线</strong>：从Issue到PR的端到端工作流（Vibe Kanban, Symphony, GitHub Agentic Workflows）
![](https://picx.zhimg.com/v2-9975e862bc5d7f12bd702851c32a3feb_r.jpg)<strong>Figure 9</strong>: 生命周期与编排层的三大类别：单Agent内循环、多Agent编排模式、全生命周期流水线。

![](https://pic1.zhimg.com/v2-76bf1c25e92780e178ac0f1f4214c5f6_r.jpg)<strong>Table 2</strong>: 代表性编排系统对比，按编排层级、主要模式、执行模型（无状态回放/有状态/混合）分类。
<strong>08 第五层 O：可观测性与运维——Agent的"Telemetry层"</strong>
为什么将可观测性独立成层？因为它已孕育出完整的独立生态：Langfuse/Arize Phoenix/OpenLLMetry 做追踪，Prometheus/Jaeger/Grafana 做指标，成本归因、异常检测、可靠性工程各有独立实践。

<strong>四大方向</strong>

![](https://pic4.zhimg.com/v2-cfe87d3460e58d48eb2cf579c7eba105_r.jpg)
![](https://pic3.zhimg.com/v2-4177731918d7a4171a7f43d311d112f4_r.jpg)<strong>Figure 10</strong>: 可观测性与运维层的五大类别：追踪与监控、Agent专用运维平台、成本追踪与优化、可靠性工程、统一可观测性。

<strong>09 第六层 V：验证与评估——Agent的"质量体系"</strong>
<strong>Figure 12</strong>: Harness评估的五阶段Task-to-Feedback生命周期。评估不应只报告最终成功率，而应诊断失败来源并反馈给Harness改进。

![](https://picx.zhimg.com/v2-263bbe298bbf5fcd5d97ac488facc491_r.jpg)传统LLM评估打分最终输出；Agent评估必须评判<strong>整个执行episode</strong>。作者提出 <strong>五阶段Task-to-Feedback生命周期</strong>：

- <strong>任务与基准锚定</strong>：环境状态、可用工具、成功准则的定义（SWE-bench, WebArena, GAIA）
- <strong>执行前就绪验证</strong>：沙箱/依赖/工具/上下文/权限/预算/评估器是否就绪？
- <strong>受控执行与追踪捕获</strong>：记录模型输出、工具调用、环境变更、错误、重试、成本
- <strong>多级判断与故障归因</strong>：结果级（是否完成）、轨迹级（路径是否高效合规）、评估器级（评估器本身是否可信）
- <strong>持续回归与部署反馈</strong>：将失败转化为回归测试，驱动Harness迭代
![](https://pica.zhimg.com/v2-023733041796264d3d27b34e06ecd258_r.jpg)<strong>Figure 11</strong>: 验证与评估层的五大类别，对应Task-to-Feedback生命周期的五个阶段。

<strong>10 第七层 G：治理与安全——Agent的"访问控制与审计层"</strong>
Agent现在执行Shell命令、发邮件、提交代码、调用第三方API。治理层回答：<strong>"在什么约束下行动？约束失败时谁负责？"</strong>

<strong>五大机制</strong>

![](https://pic1.zhimg.com/v2-7cb8a43b7aed0aa9347ab9d3200b535c_r.jpg)
![](https://pic2.zhimg.com/v2-1d2b6f4afcef8ceb98ab8c9f49eb4f55_r.jpg)<strong>Figure 13</strong>: 治理与安全层的六大类别：权限模型、生命周期Hook、组件加固、声明式宪法、审计基础设施、Agent安全全景。

![](https://picx.zhimg.com/v2-11383b4fafa00d1cbeb96df5458ef82b_r.jpg)<strong>Figure 14</strong>: 单次工具使用周期中的四个治理Hook点：H1输入护栏、H2动作护栏、H3后执行信息流控制、H4人在回路。

![](https://pic1.zhimg.com/v2-4e9445ccb7ee5ccd93048853d0e5ea3a_r.jpg)<strong>Table 3</strong>: 治理机制与Kim et al. (2026)的七类风险（R1-R7）的映射关系。

https://openreview.net/pdf?id=eONq7FdiHa
Agent Harness Engineering: A Survey
https://picrew.github.io/LLM-Harness/