---
title: 主流Agent Harness实现对比——Memory篇
date: "2026-06-03 15:02:31"
updated: "2026-06-03 15:02:31"
layout: post
permalink: /collections/wechat/2026-06-03-agent-harness-memory-comparison/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# 主流Agent Harness实现对比——Memory篇

<strong>原始链接</strong>: https://mp.weixin.qq.com/s/qhwEhvE3IJqwYO088zfoYA

<strong>首发时间</strong>: 2026-06-03

---

系列前言目前大家虽然关注Agent Harness，但目前公开材料对于这些对比比较缺乏，感觉不少人也没有关注过这些方面，所以在想做一个系列来进行一下横向对比。这个事情的工作量比较大，尤其第一篇Memory的部分，工作量超过我预想很多。后面我视精力情况来看，希望能把这个坑填完。

Agent框架还有一些基础工作但读者可能并不感兴趣，所以这个系列会先讲一些大家更有兴趣的，然后穿插一些更基础的部分。

## A1、Memory

这次本来想找个大家有兴趣的话题来先写，所以选了Memory作为第一篇，但调研完发现其实实装了Memory的Agent CLI/harness并不多，OpenCode、Pi、Kimi Code都没有，所以额外加了有代表性的OpenClaw来凑数。但调研完发现OpenClaw的实现是这里最差的，有些华而不实，但受限于时间因素也不好再补充其他方案了，Claude Code和Codex作为代表也已经足够了。

本节讨论的项目的版本为：
- Claude Code 2.1.156（基于发布的压缩后js逆向分析）
- Codex 2026-06-01 的 main 分支快照
- openai-agents-js 0.11.6
- OpenCode 1.15.13（无原生Memory）
- Pi 0.78.0（无Memory）
- Kimi Code 2026-06-02 快照（无Memory）
- （番外）OpenClaw 2026.6.2

Memory方案的主体大多是Prompt直接描述的，而且Claude Code的Prompt写得挺好了，不太冗余也有说明意图，让我感觉没有太多必要画蛇添足。所以本文我更多采用贴Prompt中英文对照版的方式介绍，就不再重新描述prompt中包含的设计了。在此之外，我还会做一些补充描述和评论。

## 1、综述

Memory最主要的功能是提供跨Session（对话历史）的信息传递。本篇主要讨论自动管理的Memory，这个Memory可以被人工编辑，但不应该依赖被人工编辑。

在这个标准下Claude.md、Agents.md、项目中的文档等都不算是自动Memory的范围。但从实际上的角度上它们都是重要的Memory信息，并且是由人管理的。实际上在 AI Coding的软件工程（1）如何实现复利 这篇文章的思路之后，自动Memory和人工维护的文档Memory可以统一起来，它们都是Memory，差别和边界在于人工控制的有无。项目目录中的文档都默认是人工控制和干预的，而自动Memory中的内容是不属于人工干预的。

虽然自动Memory中经常会记录一些用户明确的习惯偏好等，但从复利一文的思路来说这并非好的设计。人明确的要求等应该放在人控制的范围中，也就是不应该仅放在自动Memory中，而是应该放在人工监控范围内。当然从实际使用场景来说，随着人越来越懒、越来越多的把决定权交给Agent，目录中的文档和代码也并非都属于人强控制的范围。所以才有了复利一文中的设计，在目录中进一步对于人工的干预面位置进行设计，明确区分人工干预的部分和交给Agent自行设计的层面。

本文除了Memory方案设计的一些原则外，主要讲了Claude Code、Codex/OpenAI Agents SDK、OpenClaw三个方案。总体来说，我更推荐Claude Code的方式，Codex的思路也有可取之处，但实现的细节量过大。这两种方式也可以融合一下，同时有快慢记忆的方式，不过这次对比覆盖的范围中没有这样的设计。

## 2、Memory的读与写

我之前文章提到，如果自己做具体业务场景的Memory设计重点就是在设计Memory的写和读，写就是生成和维护，读就是召回和使用。在很多场景下，具体来说难做的是：Memory的生成、Memory的更新/融合/冲突消除/过期淘汰、Memory的召回。

如果读者有过做笔记的经验，那么会知道单纯的不断产生Memory并非好的方式，在未来，大部分Memory/笔记的价值并不大，并影响对于有价值内容的使用。

目前来讲现在通用Agent Harness的Memory大多是基于文本文件的，可能配合一个类似目录的索引，也就是书籍的组织模式。实际上就是后来的LLM wiki的一种简化实现。

值得一提的是，Coding Agent主流方案大多没有实现一个传统RAG形式的向量存储和召回方式。一方面向量召回方式并不适合所有场景，在过去有一些过誉，现在算是回归正常。另一方面，通用Agent Harness一般并没有这种大量同类内容记忆和召回的场景，以及单个项目workspace中需要记忆的内容量往往也没有特别大。又由于这种场景下的Memory比RAG时代的文档等更为珍贵，所以召回质量方面要求更高，所以目前仍然是这种类LLM wiki的方式。

Memory的读写都是有额外成本的，而且不同方案的成本也有明显差异，在Agent Harness中，尤其是交互性的Agent场景下，延时是非常重要的因素，在这个条件下一般有两类实现范式：

- 使用类似Tool的方式和Prompt来引导LLM模型主动进行Memory记录和召回。相对轻一些，但很难做复杂的Memory整合，以及仍然会占用tool call轮次，拉长响应时间。
- 异步离线的Memory重新梳理和整合，也就是Claude Code的Dream功能，这种方式较慢、成本较高、而且由于是周期性异步执行的所以不方便实现快速记忆更新。需要说明的是这种方式虽然叫Dream，但只是记忆整合，最多包含skill级别的增加，无法做到像人一样的重新训练、内化为直觉。

目前的Claude Code同时支持这种两种方式，算是做了一个不错的延迟、短期效果、长期积累效果的平衡，但每个单独维度的得分都仍然有很大提升空间。这是目前Agent Memory方案的天然限制。不仅Agent不行，人也需要睡眠来更新长期记忆和内化能力。

## 3、Memory的质量要求

不成熟的Memory设计往往只关注于要记录下信息，但目前现在的Memory方案大多没有太好的淘汰方式，所以一旦Memory记录错误或者有偏，甚至只是记录下了一些用户的偶然选择，或者对于用户的偶然选择做了错误的解释，导致偏离用户意图和认知的Memory被记录下来，那么就会对后续造成持续的负面影响。可以说每次犯错都可能导致后续100次的负面影响。所以实际上Memory的生成/筛选是一个需要很很小心的工作，我们会在后续实际方案中不断的看到这点。

可以说一个优秀的Memory方案大多都会包含这部分。即使是后面列的做得比较差的OpenClaw，实际上也能通过历史日记不断过时和降权来旧记忆。某种意义上来说，Memory的设计重点在于不记什么和不信什么（记忆）。

## 4、Claude Code

目前Claude Code的记忆是保存在$HOME目录下的，不是在项目目录中，在迁移机器时候需要注意。Memory的组织方式为一个MEMORY.md索引文件+多个item记忆md文件，目前从结果来看每个item记忆文件的内容比较长。

Claude Code的Memory有两层scope：
- <strong>private</strong>：仅在与当前用户的对话之间持续存在
- <strong>team</strong>：由所有在该项目目录中工作的用户共享并共同贡献

### 4.1、Memory的快速写入

Memory条目有多种类型：
- <strong>user（始终 private）</strong>：关于用户的角色、目标、职责和知识
- <strong>feedback（默认 private）</strong>：用户给的关于如何开展工作的指导
- <strong>project（强烈倾向 team）</strong>：无法从代码或git历史推导的项目信息
- <strong>reference（通常 team）</strong>：指向外部系统中信息所在位置的指针

写入时机有2个：主Session中模型主动更新，以及对话round结束后产生fork session自动提取。这两种方式之间做了互斥处理。

### 4.2、Memory的召回

Claude Code的Memory不是默认注入Session Context中的，只有语义索引MEMORY.md被注入，需要LLM进行主动召回。时间超过1天的记忆会附"这是某时刻的观察、不是实时状态，请对照当前代码核实"的提醒。

### 4.3、Memory整合（Dream）

Dream功能做异步离线记忆整合，目前默认未开启。分为4个阶段：Orient → Gather recent signal → Consolidate → Prune and index。需要结合session历史来实现。

### 4.4、总评

Claude Code的Memory方案算是做的比较标准了。除了记忆条目的设计之外，大量内容是限制记忆的内容，对于召回的内容保持怀疑，还有dream中对于整个记忆的重新review。不算Dream的部分，目前Claude Code的Memory方案是个不错的baseline，想要进行Memory方案设计的人应该要揣摩很多限制为什么要这么加。

## 5、Codex 与 OpenAI Agents SDK

Codex和OpenAI Agents SDK在Memory的实现上几乎一样。Codex的Memory设计与Claude Code明显不同，Memory作为一种事后挖掘，而不是memory tool。

### 5.1、Phase 1：并行提取

新会话启动时对历史对话进行memory提取，第一阶段使用mini模型进行并行提取。有严格的NO-OP门控——如果没什么值得记的，就返回空。高信号记忆聚焦于：
1. 稳定的用户操作偏好
2. 高杠杆的流程性知识
3. 可靠的任务地图与决策触发器
4. 关于用户环境与工作流的持久证据

### 5.2、Phase 2：整合

把原始记忆整合进基于文件的memory folder，支持渐进式披露。文件夹结构包括：
- memory_summary.md（始终加载进系统prompt）
- MEMORY.md（手册条目，用于grep）
- raw_memories.md（临时文件）
- skills/（可复用流程）
- rollout_summaries/（rollout回顾）

增量更新与遗忘机制通过git diff来实现。

### 5.3、召回

Quick memory pass：先读MEMORY_SUMMARY提取关键词 → grep MEMORY.md → 按需深入rollout_summaries。预算控制在4-6个搜索步骤。对于未现场核实的记忆事实必须标注可能过时。

### 5.4、总评

Codex的Memory相关流程超长，信息密度感觉并不很高，更像是AI直接撰写的。批量挖掘的方式更稳定、质量高但学习过程偏慢；Claude Code的增量编辑响应速度快但可能混杂低质量内容。实际上可以混合这两种策略来做快慢记忆的平衡。

## 6、OpenCode、Pi、Kimi Code

这三个都没有原生的自动Memory方案。OpenCode有一些第三方Memory插件（opencode-supermemory、opencode-mem），其中opencode-mem实现了向量召回。

## 7、OpenClaw

OpenClaw目前有2套Memory方案：RAG Memory（默认）和LLM wiki（默认关闭）。

### 7.1、RAG Memory

默认方案套了2层Memory设计，大量依赖RAG做效果。每日有日记式Memory + SQLite索引。挖掘整合方案由心跳触发，分light/REM/deep三阶段，但<strong>没有使用LLM</strong>，主要是文本切分chunk、关键词匹配和文本相似度计算。实现质量较差。额外生成DREAMS.md（第一人称散文体日记，不作为Memory召回源）。

### 7.2、memory-wiki

独立功能，默认关闭，使用类似知识图谱的方式组织，显式维护实体和概念。

---

<strong>交流与合作</strong>: 请加微信，联系方式见专栏简介
