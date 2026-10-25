---
title: Reasonix 源码分析：为缓存命中而生的 Agent Loop
date: "2026-05-31 00:00:00"
updated: "2026-05-31 00:00:00"
layout: post
permalink: /collections/wechat/2026-05-31-reasonix-source-code-analysis/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - Reasonix
  - DeepSeek
  - Agent
  - 缓存优化
  - 架构分析
source_url: https://github.com/esengine/DeepSeek-Reasonix
---


# Reasonix 源码分析：为缓存命中而生的 Agent Loop

> "Cache stability isn't a feature you turn on; it's an invariant the loop is designed around."

## 1. 项目概况

<strong>Reasonix</strong>（`esengine/DeepSeek-Reasonix`）是一个 DeepSeek 原生的终端 AI coding agent，TypeScript 实现，MIT 协议，GitHub 14.5k stars，2026-04-21 创建，43天不到即成为顶级 Agent 框架。

核心卖点只有一个：<strong>prefix-cache 命中率</strong>。实测 4.35 亿 input tokens，99.82% cache hit，同样工作量无缓存要 $61，实际只花了 $12。

## 2. 为什么缓存命中率如此重要

DeepSeek 的自动 prefix caching 机制有个苛刻条件：<strong>必须是精确的字节前缀匹配</strong>。也就是说，如果上一轮请求的前 N 个字节和这一轮的前 N 个字节完全一致，这 N 个字节对应的 tokens 就只收 10% 的价格。

大多数 Agent 框架的问题在于：它们在每轮对话中会重排、重写、注入时间戳，导致实际的 cache hit rate 只有不到 20%。Reasonix 的整个架构就是为了让这个命中率逼近 100%。

## 3. 核心架构：三区模型

Reasonix 把 LLM 的上下文严格分成三个区域：

```
┌─────────────────────────────────────────┐
│ IMMUTABLE PREFIX                        │ ← 会话期间固定不变
│   system + tool_specs + few_shots        │   缓存命中的主力区
├─────────────────────────────────────────┤
│ APPEND-ONLY LOG                         │ ← 只追加，不修改
│   [assistant₁][tool₁][assistant₂]...    │   保留先前轮次的前缀
├─────────────────────────────────────────┤
│ VOLATILE SCRATCH                        ← 每轮重置
│   R1 思考过程、临时计划状态               │   从不发送给上游 API
└─────────────────────────────────────────┘
```

### 3.1 Immutable Prefix（不可变前缀）

包含 system prompt、工具定义、few-shot 示例。这三个部分在会话开始时计算一次，hash 后锁定。会话期间任何修改都会导致整个前缀缓存失效。

源码中的体现（`CacheFirstLoop` 构造函数）：
- `prefix` 对象在整个会话生命周期中只读
- `prefix.toMessages()` 每次调用返回相同的字节序列
- `prefix.diagnosticHashes()` 用于检测前缀是否被意外修改
- `clearLog()` 时接受 cache miss 的代价来重建 system prompt（应对 REASONIX.md 编辑）

### 3.2 Append-Only Log（只追加日志）

这是最精妙的设计。所有的 assistant 回复、tool 调用结果，都是<strong>纯追加</strong>的，永远不会重写。这意味着第 N 轮请求的前缀天然就是第 N-1 轮请求的超集——已有的前缀自动保持稳定。

源码中的保证机制：
- `AppendOnlyLog` 类只暴露 `append()` 方法，没有 `rewrite()` 或 `delete()`
- `compactInPlace()` 是唯一的"删除"操作，但它在物理上是用新数组替换，会触发 cache miss（这是有意的，因为 context 太长时必须压缩）
- 所有消息通过 `appendAndPersist()` 统一入口写入，包含内存持久化到 JSONL
- `replaceTailAssistantMessage()` 是唯一的例外——用于 storm 自纠正，会重建 session 文件

### 3.3 Volatile Scratch（易失草稿区）

模型在思考过程中产生的中间状态（R1 reasoning_content、临时计划）放在 Scratch 区，<strong>不会发送给 API</strong>。只有经过 distill 处理后的信息才会被 fold 到 Log 中。

这就是为什么 Reasonix 可以在 thinking 模式下保持缓存稳定——reasoning tokens 虽然很长，但它们不进入上下文，不影响前缀匹配。

## 4. Tool-Call Repair：四道防线

DeepSeek R1 在 agent 场景有一些已知的 failure mode，Reasonix 设计了四层修复机制：

### 4.1 Flatten（扁平化）
当工具 schema 超过 10 个参数或嵌套深度 >2 时，自动转换为点记法展示给模型。dispatch 时再嵌套回去。

```typescript
// 注册时检测
if (leafParams > 10 || depth > 2) {
  // 用 dot-notation 形式展示给模型
}
// dispatch 时 re-nest
```

### 4.2 Scavenge（拾荒）
用正则 + JSON parser 扫描 `reasoning_content`（`<thinker>` 标签里的内容），找出模型"忘记"发出的 tool calls。这是最常见的 DeepSeek bug——模型在思考中写了 tool call，但没有放到最终的 `tool_calls` 字段。

### 4.3 Truncation（截断修复）
检测 JSON 不完整的情况（`max_tokens` 用完导致截断），自动补全闭合括号或请求 continuation。

### 4.4 Storm（风暴抑制）
滑动窗口内检测完全相同的 `(tool, args)` 重复调用，自动抑制并注入反思 turn。避免 DeepSeek 在某些场景下反复调用同一个工具的死循环。

```typescript
// Storm breaker
if (identical (tool, args) within sliding window) {
  suppress call;
  inject reflection turn;
}
```

## 5. Cost Control：四层成本控制

### 5.1 Flash-First 分层（v0.6 新增）

| 模式 | 模型 | 成本倍率 |
|---|---|---|
| `flash` | v4-flash | 1× |
| `auto`（默认） | flash → hard turn 时自动切 pro | 1-3× |
| `pro` | v4-pro | ~12× |

所有辅助调用（摘要、子 agent、修复重试）都强制使用 `v4-flash + effort=high`。

### 5.2 Turn-End Auto-Compaction
超过 3000 tokens 的 tool result 在 turn 结束时被压缩。模型在读取时看到了完整内容，后续轮次只看到摘要——需要时可以重新 read_file。

主动在 40% context 比例时触发压缩，而不是等到 80% 的紧急阈值。

### 5.3 模型自报告升级（`<<<NEEDS_PRO>>>`）
模型自己判断任务难度是否超出当前 tier。如果需要更强的推理，在响应开头发出 `<<<NEEDS_PRO>>>` 标记，系统会中断当前 flash 调用，在 pro 上重试。

```typescript
function parseNeedsProEscalation(content: string): boolean {
  return /^\s*<<<NEEDS_PRO(?::\s*[^>\n]{1,150})?>>>/.test(content);
}
```

### 5.4 成本透明
每个 turn 和整个 session 的成本都在 TUI 的 StatsPanel 中实时显示，用颜色编码。

## 6. 并行 Tool Dispatch

只读工具（`read_file`, `list_directory`, `search_files`, `web_search` 等）标记为 `parallelSafe`，连续的只读调用会被分组并行执行。写操作作为"串行屏障"确保读写顺序。

```typescript
// 工具声明
readonly parallelSafe: boolean; // default false
```

通过 `Promise.allSettled` 并行，但结果仍然按声明顺序追加到 Log 中，模型看到的消息格式和串行执行完全一致。

## 7. Session 持久化与恢复

每个会话保存为 JSONL 文件。恢复时的关键设计：

## 1. **Heal-on-load**：加载历史消息时自动修复过大的 tool result（避免下次请求 400）

## 2. **Stats carry-forward**：恢复会话后，累计成本、token 计数从 meta 文件继续

## 3. **Reasoning retention**：thinking 模式的 `reasoning_content` 在 tool-call turn 中保留（用于 repair），在纯文本 turn 中丢弃（节省 tokens）

## 4. **Session archive**：`/new` 命令清空内存但归档磁盘，保持 session name 不变以维持前缀缓存热度


## 8. Desktop 端现状与 PR 方向

### 现有 Desktop

已有官方的 Tauri desktop client（prerelease），但 README 描述的 UI 功能比较基础——多 tab、右侧文件面板、底部 cost/cache/token 仪表盘。核心 loop 和 CLI 完全一致。

### 可贡献的 PR 方向

基于源码分析，以下是几个有价值 PR 方向：

## 1. **文件差异可视化** — 目前 Desktop 右侧面板只显示 agent 读过的文件列表，可以增加 diff viewer，展示 SEARCH/REPLACE 的预览和 `/apply` 后的实际变更

## 2. **会话管理增强** — 目前 session 只有 JSONL 格式，Desktop 可以添加 session 列表视图、搜索、标签

## 3. **MCP Server 可视化配置** — 现在配置 MCP 需要手动编辑 JSON，可以做成 GUI 表单

## 4. **Memory 浏览器** — `~/.reasonix/memory/` 的 `remember`/`recall_memory` 数据可视化

## 5. **Cost 分析面板** — 利用已有的 `SessionStats` 和 `cacheDiagnostics` 数据，做按时间/按工具的成本分解图表


## 9. 源码质量观察

几个印象深刻的工程实践：

- <strong>单文件大小控制严格</strong>：最大模块 `App.tsx` 2K 行（从 2931 行重构下来的），每个 slash handler ≤200 行
- <strong>四层修复管道可组合</strong>：flatten → scavenge → truncation → storm，每个 pass 独立可测
- <strong>Cache diagnostic 闭环</strong>：每轮都记录 prefix hash、cache hit/miss tokens，用于 debug cache miss 的根因
- <strong>Heal-on-load 防御性编程</strong>：加载 session 时主动修复可能导致下次 400 的过大 payload
- <strong>Storm breaker 的 read-after-write 豁免</strong>：`read → edit → verify` 不会被误判为重复调用

## 10. 总结

Reasonix 的核心 insight 很简单：<strong>如果你能保证发送给 API 的请求前缀字节级稳定，DeepSeek 就帮你省 90% 的输入成本</strong>。

但实现这个"简单"的 insight 需要在整个 agent loop 的每一层做取舍：
- 前缀锁死 → system prompt 不能动态变化
- 日志只追加 → 修复错误的代价是丢弃整个 log 重写
- Scratch 区不发送 → 模型丢失了"思考过程"的上下文（由 repair pipeline 补偿）
- Flash-first → 默认不用最强模型（由 `<<<NEEDS_PRO>>>` 补偿）

每一步都是"为了缓存命中"这个单一目标做的刻意设计。14.5k stars 说明这条路线是对的——在一个 API 价格敏感的市场里，便宜就是王道。
