# Your Agent Spends 99% of Its Tokens Carrying the Workshop, Not Doing the Work

> **Author**: Praveen Vijayan  
> **Date**: 2026-07-14  
> **Source**: https://praveenvijayan.substack.com/p/your-agent-spends-99-of-its-tokens

## 核心发现

一个真实的 agentic coding session：agent 关闭一个 GitHub issue（读 issue → 编辑 98 行 server.mjs → 跑测试 → commit → 开 PR），实际产出的 reasoning 和 generation 约 10,304 tokens，但整个 session 处理了约 **155 万 tokens**。

**工作 vs 开销比 = 1:150**。agent 不是在"思考"155 万 tokens，而是在"搬运"它们——每轮都重读自己的整个环境。

## Token 去了哪里

按体量排序：

1. **MCP 工具名 dump（最大块）** — 连接了 9 个 MCP server、~260 个工具。其中 github 和 code-graph server 在 session 中途加入，注入了完整工具目录（一个 server 就 ~180 个工具名）。一次触发，永不离开对话历史。
2. **Skills 目录（每轮税）** — 几十个 skills，每个都有多句描述，每轮都加载。不像工具 dump 是一次性成本，这是持续性的，不 spike，只抬高 baseline。
3. **系统提示、安全策略、工具 schema** — 固定成本，每轮必付。agent 还没做任何事之前，每轮 baseline 就可能超过 10 万 tokens。
4. **实际任务** — issue 文本、文件、diff、测试输出、PR body。总共几千 tokens。和目录相比微不足道。

**通用规律：agent session 中上下文增长的主导因素是你连接了什么，不是你在做什么。**

## 如何测量

1. **读 API usage block** — 每个响应都有 `output_tokens`、`input_tokens`、`cache_read_input_tokens`。cache-read 就是累计历史。作者的 session：~10.3k output, ~9.9k fresh input, **~153.5 万 cache reads**。
2. **用 /context 命令** — 显示当前窗口占用情况，能发现每轮固定成本。
3. **接入 pipeline 代理** — 作者用 Headroom 本地代理。一周数据：10,678 请求，7.13 亿 tokens in，95.1% cache 命中率，平均 103 条消息/会话（最长 607）。

## 优化措施（按实际效果排序）

| 措施 | 效果 | 说明 |
|------|------|------|
| **过滤 CLI 输出** | **46.9%**（~6800 条命令省 270 万 tokens） | 工具输出是 agent 上下文的"原污水"——完整测试日志、verbose git 输出。薄的过滤层是最高杠杆 |
| **禁用不用的 MCP server** | 最大单次 win，零工程量 | 最胖的工具 dump 来自一个从未调用的 server。按任务连接，不要永久连接 |
| **约束输出风格** | ~65% 输出 token 减少 | 强制简洁回复。输出 token 是贵的，agent 喋喋不休大多是仪式不是信号 |
| **压缩陈旧历史** | 仅 4.2% | 全面压缩 underdeliver。真正机会是 10+ 轮前的旧文件读取——targeted，不是 blanketed |
| **mid-session /compact** | blunt instrument | 几百条消息后 squash 历史。丢保真度，保预算 |
| **尊重 cache** | 95.1% 命中率 | 前缀稳定性是成本特性。任何改变 prompt 前缀的操作都重置 cache 曲线 |

## 关键教训

1. **比率才是指标** — 不是总 token 数，是任务 token vs 环境 token 的比率。1:150 的比率下，任何"prompt engineering"都是零头。
2. **每个连接的工具都是固定费用** — 260 个工具听起来像能力，实际上是 model 永远在重读的目录，还会降低工具选择准确率。
3. **一次性成本和每轮成本需要不同处理** — 工具 dump 是一次性的（连接更少即可修复）；skills 目录是每轮的（加载更少即可修复）。混淆两者会优化错方向。
4. **先测量再优化** — 直觉的修复通常是第三好的。作者猜历史压缩是第一，实际只 4.2%；CLI 过滤直觉排最后，实际 46.9%。
5. **输出 token 少但贵，cache token 多但便宜** — 砍输出冗余省钱；砍上下文膨胀省延迟、上下文腐化和 cache-write spike。

## 核心结论

行业对话围绕"更大的上下文窗口"。数据显示瓶颈不是窗口大小——是窗口卫生。一个 100 万 token 的窗口如果 99% 填的是工具目录和过期测试日志，那不是一个更有能力的 agent，而是一个更贵的、对真正重要的 1% 记忆更差的 agent。

**在追求更大模型或更大窗口之前：读你的 usage block，数你连接的工具，过滤你的 shell 输出。最便宜的百万 token，是你从未发送的那些。**
