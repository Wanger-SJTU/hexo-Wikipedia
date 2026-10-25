---
title: AI Agent 深度学习指南
date: "2026-02-25 00:00:00"
updated: "2026-02-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AgentCLI/AI-Agent-深度学习指南/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2009766290772993640
---


### Claude opus4.6生成的AI Agent 深度学习指南

从”会调 SDK”到”真正理解 Agent”的完整学习路径
### 目录

- [Agent 的本质](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#1-agent-%E7%9A%84%E6%9C%AC%E8%B4%A8)
- [手写 Agent 循环](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#2-%E6%89%8B%E5%86%99-agent-%E5%BE%AA%E7%8E%AF%E4%B8%8D%E7%94%A8-sdk)
- [Prompt Engineering for Agents](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#3-prompt-engineering-for-agents)
- [工具设计的学问](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#4-%E5%B7%A5%E5%85%B7%E8%AE%BE%E8%AE%A1%E7%9A%84%E5%AD%A6%E9%97%AE)
- [核心论文与思维模式](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#5-%E6%A0%B8%E5%BF%83%E8%AE%BA%E6%96%87%E4%B8%8E%E6%80%9D%E7%BB%B4%E6%A8%A1%E5%BC%8F)
- [记忆与上下文管理](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#6-%E8%AE%B0%E5%BF%86%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E7%AE%A1%E7%90%86)
- [多 Agent 编排](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#7-%E5%A4%9A-agent-%E7%BC%96%E6%8E%92)
- [可靠性工程](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#8-%E5%8F%AF%E9%9D%A0%E6%80%A7%E5%B7%A5%E7%A8%8B)
- [评估 (Evals)](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#9-%E8%AF%84%E4%BC%B0-evals)
- [实战项目建议](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#10-%E5%AE%9E%E6%88%98%E9%A1%B9%E7%9B%AE%E5%BB%BA%E8%AE%AE)
- [推荐资源](https://zhuanlan.zhihu.com/p/2009766290772993640/edit#11-%E6%8E%A8%E8%8D%90%E8%B5%84%E6%BA%90)

### 1. Agent 的本质

#### 一句话定义

Agent = LLM + 工具调用 + 循环

没了。所有框架（Vercel AI SDK、LangChain、CrewAI）封装的都是这个东西。

#### 伪代码

```js
function agent(userMessage, tools, maxSteps):
    messages = [systemPrompt, userMessage]
```


    for step in 1..maxSteps:
        response = LLM(messages, tools)

        if response.hasToolCalls:
            for toolCall in response.toolCalls:

```text
                result = execute(toolCall.name, toolCall.input)
                messages.append(toolCall)       // 记录模型想调什么
                messages.append(toolResult)     // 记录工具返回了什么
        else:
            return response.text   // 模型不再调工具，输出最终回答

    return "达到最大步数，停止"`
```


#### 关键洞察

模型并不”知道”自己在当 agent。** 它只是在做一件事：根据当前的 messages 数组，预测下一个 token。当 messages 里包含工具定义时，模型可能生成工具调用格式的输出；当工具结果被追加到 messages 后，模型基于新的上下文继续生成。

所谓的”自主决策”，其实是：

- 模型看到了工具的 description，知道有哪些能力可用
- 模型根据用户问题和已有的工具结果，判断还需不需要调工具
- 如果不需要了，就直接生成文字回答
<strong>没有任何魔法。</strong>

### 2. 手写 Agent 循环（不用 SDK）

这是最重要的一步。不依赖任何框架，直接用 HTTP 请求实现 agent。

#### 2.1 基础版：单次工具调用

```python
// src/manual-agent-basic.ts
// 手写 agent 循环 - 理解 SDK 背后在做什么

import "dotenv/config";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = "https://api.deepseek.com/v1";

// ----- 定义工具 -----
const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "getWeather",
      description: "获取指定城市的当前天气信息",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市名称" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "执行数学计算",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "数学表达式" },
        },
        required: ["expression"],
      },
    },
  },
];

// ----- 工具实现 -----
const toolImplementations: Record any> = {
  getWeather: ({ city }: { city: string }) => {
    const data: Record = {
      北京: { temp: 5, condition: "晴", humidity: 30 },
      东京: { temp: 8, condition: "小雨", humidity: 75 },
    };
    return data[city] ?? { temp: 20, condition: "未知", humidity: 50 };
  },
  calculate: ({ expression }: { expression: string }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().% ]/g, "");
    return { result: new Function(`return (${sanitized})`)() };
  },
};

// ----- 核心：Agent 循环 -----
```

async function callLLM(messages: any[]) {

```js
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      tools: toolDefinitions,
    }),
  });
  const data = await response.json();
  return data.choices[0].message;
}
```


async function runAgent(userMessage: string, maxSteps = 10) {

```js
  console.log(`\n🧑 用户: ${userMessage}\n`);

  // 这就是 agent 的全部状态 —— 一个 messages 数组
  const messages: any[] = [
    { role: "system", content: "你是一个有用的助手，请用中文回答。" },
    { role: "user", content: userMessage },
  ];

  for (let step = 1; step 
```


运行这段代码，你会清楚看到：

- <strong>每次 LLM 调用的输入</strong>是整个 messages 数组（包括之前的工具调用和结果）
- <strong>模型的”记忆”</strong>就是这个数组，没有任何其他状态
- <strong>SDK 做的事情</strong>就是帮你管理这个数组 + 执行这个循环

#### 2.2 动手练习

<strong>练习 1：</strong> 运行上面的代码，在每次 `callLLM` 前打印完整的 `messages` 数组，观察它是如何增长的。

<strong>练习 2：</strong> 故意把某个工具的 `description` 写得很模糊，观察模型是否还能正确选择工具。

<strong>练习 3：</strong> 把 `maxSteps` 设为 1，观察模型在只能执行一步时会怎么做。

### 3. Prompt Engineering for Agents

普通聊天的 prompt engineering 和 agent 场景有本质区别。聊天只需要模型回答好，agent 还需要模型<strong>正确地选择和调用工具</strong>。

#### 3.1 System Prompt 的要素

你是一个 [角色描述]。

## 能力
你可以使用以下工具：
- getWeather：查询天气。当用户问到天气相关问题时使用。
- calculate：数学计算。当需要精确计算时使用，不要自己心算。
- searchKnowledge：搜索知识库。当用户问到你不确定的事实时使用。

## 行为准则
1. 先思考是否需要使用工具，不要盲目调用
2. 如果一个工具的返回结果不够，可以再调用其他工具补充
3. 得到所有需要的信息后，给出完整的中文回答
4. 如果工具返回了错误或空结果，告诉用户而不是编造答案

## 限制
- 不要编造工具不存在的功能
- 不要在一次回答中调用超过 5 次工具`

#### 3.2 常见问题与解法

问题现象解法模型不调工具用户问天气，模型直接编一个回答在 prompt 里强调”必须使用工具获取实时信息，不要猜测”模型乱调工具用户随便聊天，模型也去调工具在 prompt 里说明”只在需要时使用工具”参数错误模型传了错误的参数格式改善工具的 description 和参数 description无限循环模型反复调用同一个工具设置 maxSteps + 在 prompt 里说”不要重复调用相同工具”忽略工具结果工具返回了数据但模型没用在 prompt 里强调”基于工具返回的实际数据回答”
#### 3.3 高级技巧：思维链 (Chain of Thought)

## 回答流程
在每次决定是否调用工具前，先用  标签思考：
1. 用户想知道什么？
2. 我目前已经知道哪些信息？
3. 还缺少什么信息？需要调用哪个工具？
4. 如果信息足够了，直接回答。`

这会让模型的工具选择更加可控和可解释。

### 4. 工具设计的学问

工具设计直接决定 agent 的能力上限。模型是通过工具的 description 和 schema 来理解工具的，而不是通过代码。

#### 4.1 好工具 vs 差工具

<strong>差的设计：</strong>

tool({
  description: "数据库操作",  // 太模糊，模型不知道什么时候该用
  inputSchema: z.object({

```text
    sql: z.string(),  // 让模型写 SQL？灾难
  }),
```

})`

<strong>好的设计：</strong>

tool({
  description: "根据用户ID查询用户信息，返回姓名、邮箱、注册时间",
  inputSchema: z.object({

```text
    userId: z.string().describe("用户的唯一标识符，格式如 user_123"),
  }),
```

})`

#### 4.2 工具设计原则

<strong>原则 1：单一职责</strong>

❌ processData(action: "create" | "read" | "update" | "delete", ...)
✅ createUser(name, email)
✅ getUser(userId)
✅ updateUser(userId, fields)
✅ deleteUser(userId)`

<strong>原则 2：description 是给模型看的文档</strong>

- 说明什么时候应该用这个工具
- 说明输入参数的含义和格式
- 说明返回值包含什么信息
<strong>原则 3：参数设计要降低模型犯错概率</strong>

❌ date: z.string()  // 模型可能给出 "明天"、"2024-01-01"、"Jan 1" 等各种格式
✅ year: z.number(), month: z.number(), day: z.number()  // 结构化，不容易出错`

<strong>原则 4：返回值要有足够的上下文</strong>

// 差：模型不知道单位，可能误解
❌ return { temp: 5 }

// 好：自包含，模型能正确理解和转述
✅ return { temp: 5, unit: "°C", city: "北京", condition: "晴" }`

#### 4.3 工具粒度的权衡

粒度优点缺点适合场景细粒度（多个小工具）灵活组合，容易测试模型需要更多步骤，可能选错通用 agent粗粒度（少量大工具）步骤少，不容易出错灵活性差，功能写死特定业务流程
### 5. 核心论文与思维模式

#### 5.1 ReAct (Reasoning + Acting)

<strong>论文：</strong> *ReAct: Synergizing Reasoning and Acting in Language Models* (2022)

这是当前 agent 工具调用模式的理论基础。

核心思想：让模型交替进行「推理」和「行动」。

用户：北京和东京哪个更热？

Thought: 我需要知道两个城市的温度才能比较。先查北京。
Action: getWeather(city="北京")
Observation: {temp: 5, condition: "晴"}

Thought: 北京是 5°C。现在查东京。
Action: getWeather(city="东京")
Observation: {temp: 8, condition: "小雨"}

Thought: 北京 5°C，东京 8°C，东京更热。我有足够信息了。
Answer: 东京（8°C）比北京（5°C）更热，温差 3°C。`

<strong>为什么重要：</strong> 目前所有主流 agent 框架的工具调用循环，本质上都是 ReAct 模式的实现。

#### 5.2 Plan-and-Execute

与 ReAct 的「走一步看一步」不同，Plan-and-Execute 是「先规划完，再执行」。

用户：帮我调研 React 和 Vue 的区别，写一份对比报告

Plan:
  1. 搜索 React 的核心特点
  2. 搜索 Vue 的核心特点
  3. 搜索两者的性能对比数据
  4. 搜索社区生态对比
  5. 综合以上信息撰写报告

Execute:
  Step 1: search("React 核心特点 2024") → ...
  Step 2: search("Vue 核心特点 2024") → ...
  ...`

<strong>适用场景：</strong> 复杂任务、多步骤任务、需要全局规划的任务。

#### 5.3 Reflexion（自我反思）

让 agent 在失败后反思原因，并改进下一次尝试。

Attempt 1:
  Action: search("Python 排序") → 结果不相关
  Reflection: 搜索太宽泛，应该具体到算法名称

Attempt 2:
  Action: search("Python quicksort 实现") → 得到有效结果`

#### 5.4 必读论文清单

论文年份核心贡献ReAct2022推理+行动交替，奠定 agent 基础模式Toolformer2023让模型自己学会什么时候调工具Reflexion2023自我反思与迭代改进Plan-and-Execute2023先规划后执行的 agent 架构LATS (Language Agent Tree Search)2023将树搜索引入 agent 决策Voyager2023Minecraft 里的自主 agent，展示终身学习能力
### 6. 记忆与上下文管理

#### 6.1 问题：Context Window 是有限的

DeepSeek 的 context window 大约 64K-128K tokens。看似很大，但在 agent 场景下：

System Prompt:        ~500 tokens
工具定义 (3 个工具):    ~800 tokens
用户消息:              ~100 tokens
每轮工具调用+结果:      ~300-1000 tokens
─────────────────────────
10 轮交互后:           ~5000-10000 tokens`

如果是长期运行的 agent（比如编程助手），几十轮交互后就会逼近上限。

#### 6.2 解法一：对话压缩

// 当 messages 太长时，用另一个 LLM 调用来压缩历史
async function compressHistory(messages: Message[]): Promise {

```js
  const summary = await generateText({
    model: deepseek("deepseek-chat"),
    prompt: `总结以下对话的关键信息，保留所有重要的事实和决策：
    ${JSON.stringify(messages)}`,
  });

  return [
    messages[0],  // 保留 system prompt
    { role: "system", content: `之前的对话摘要：${summary.text}` },
    ...messages.slice(-4),  // 保留最近 4 条消息
  ];
```

}`

#### 6.3 解法二：RAG (检索增强生成)

不把所有信息塞进 context，而是用向量数据库存储，需要时检索。

用户提问 → 向量搜索相关文档 → 把相关片段塞进 context → LLM 生成回答

```js
// 概念示意
const relevantDocs = await vectorDB.search(userQuery, { topK: 5 });
const context = relevantDocs.map((d) => d.content).join("\n");

const response = await generateText({
  model: deepseek("deepseek-chat"),
  system: `基于以下参考资料回答问题：\n${context}`,
  prompt: userQuery,
```

});`

#### 6.4 记忆的三个层次

层次实现方式生命周期示例工作记忆messages 数组单次对话当前对话的上下文短期记忆数据库/文件跨对话（天/周）用户偏好、最近的任务长期记忆向量数据库永久知识库、历史决策
### 7. 多 Agent 编排

单个 agent 有能力上限。当任务复杂时，需要多个 agent 协作。

#### 7.1 模式一：顺序链 (Pipeline)

Planner Agent → Executor Agent → Reviewer Agent
     规划            执行            检验

```js
// 概念示意
const plan = await plannerAgent.generateText({
  prompt: "用户想要一个 Todo API，请制定实现计划",
});

const code = await executorAgent.generateText({
  prompt: `按照以下计划实现代码：${plan.text}`,
});

const review = await reviewerAgent.generateText({
  prompt: `审查以下代码是否符合计划：\n计划：${plan.text}\n代码：${code.text}`,
```

});`

#### 7.2 模式二：分层委托 (Delegation)

一个 “管理者” agent 把子任务分配给专门的 agent。

Manager Agent

```text
        /      |      \
  Search Agent  Code Agent  Test Agent`
```


实现方式：把「调用其他 agent」作为管理者的工具。

```js
const managerTools = {
  delegateToSearchAgent: tool({
    description: "将搜索任务委托给搜索专家",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const result = await searchAgent.generateText({ prompt: query });
      return result.text;
    },
  }),
  delegateToCodeAgent: tool({
    description: "将编码任务委托给编码专家",
    inputSchema: z.object({ task: z.string() }),
    execute: async ({ task }) => {
      const result = await codeAgent.generateText({ prompt: task });
      return result.text;
    },
  }),
```

};`

#### 7.3 模式三：辩论/共识 (Debate)

多个 agent 从不同角度分析同一个问题，最后综合。

Agent A (乐观视角) ──┐
  Agent B (悲观视角) ──┤→ Synthesizer Agent → 最终结论
  Agent C (技术视角) ──┘`

#### 7.4 模式四：自主协作 (Swarm)

多个 agent 共享一个任务池，自主领取和完成任务。

Task Pool: [task1, task2, task3, task4, task5]
                    ↑
  Agent A (领 task1) | Agent B (领 task2) | Agent C (领 task3)`

#### 7.5 选择哪种模式？

场景推荐模式原因线性流程（写代码→测试→部署）Pipeline每步依赖上一步结果复杂项目（多模块并行开发）Delegation / Swarm可并行，需要协调需要深思熟虑的决策Debate多角度避免盲点明确的子任务分工Delegation管理者统一调度
### 8. 可靠性工程

这是 agent 从 demo 到生产的最大鸿沟。

#### 8.1 模型会犯的错

错误类型示例防御措施幻觉编造工具不存在的参数Zod schema 验证输入格式错误工具参数不是合法 JSONtry-catch + 重试选错工具该搜索时去算数改善工具 description忽略错误工具报错但模型当没看见在 prompt 里强调错误处理无限循环反复调同一个工具maxSteps + 重复检测过度调用简单问题也调一堆工具在 prompt 里引导”先思考是否需要”
#### 8.2 防御性编程

// 工具执行的 wrapper
async function safeExecute(
  toolName: string,
  args: unknown,
  impl: Function
): Promise {
  try {

```js
    const result = await Promise.race([
      impl(args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("工具执行超时")), 10000)
      ),
    ]);
    return JSON.stringify(result);
  } catch (error) {
    // 不要让工具错误崩掉整个 agent
    // 而是把错误信息返回给模型，让它决定怎么办
    return JSON.stringify({
      error: true,
      message: `工具 ${toolName} 执行失败: ${error}`,
    });
  }
```

}`

#### 8.3 输出校验

```python
// 用 Zod 校验模型的最终输出
import { z } from "zod/v4";
import { generateObject } from "ai";

// generateObject 强制模型输出符合 schema 的结构化数据
const { object } = await generateObject({
  model: deepseek("deepseek-chat"),
  schema: z.object({
    answer: z.string(),
    confidence: z.number().min(0).max(1),
    sources: z.array(z.string()),
  }),
  prompt: "...",
});
// object 一定是 { answer: string, confidence: number, sources: string[] }
// 不符合 schema 的输出会被拒绝并重试`
```


#### 8.4 可靠性 Checklist

- [ ] 所有工具都有超时处理
- [ ] 所有工具都有 try-catch
- [ ] 设置了合理的 maxSteps
- [ ] 关键输出用 schema 校验
- [ ] 有重试机制（API 偶尔会 500）
- [ ] 有日志记录每一步的输入输出
- [ ] 敏感操作（删除、支付）需要人工确认

### 9. 评估 (Evals)

Agent 的输出是不确定的。同一个问题跑两次可能得到不同的工具调用顺序和最终回答。怎么评估好不好？

#### 9.1 评估维度

维度衡量什么评估方法正确性最终答案是否正确人工标注 + 自动对比工具效率是否用最少的步骤完成统计平均步骤数工具准确性是否选了正确的工具与预期工具序列对比鲁棒性工具出错时能否恢复故意注入错误，观察表现延迟端到端耗时计时成本token 消耗量统计 token 用量
#### 9.2 简单的评估框架

interface TestCase {
  input: string;
  expectedToolCalls?: string[];    // 期望调用的工具名列表
  expectedOutputContains?: string[]; // 期望输出包含的关键词
  maxStepsAllowed?: number;          // 期望的最大步骤数

```text
}

const testCases: TestCase[] = [
  {
    input: "北京天气怎么样",
    expectedToolCalls: ["getWeather"],
    expectedOutputContains: ["北京", "°C"],
    maxStepsAllowed: 2,
  },
  {
    input: "北京和东京的温差",
    expectedToolCalls: ["getWeather", "getWeather", "calculate"],
    expectedOutputContains: ["温差", "3"],
    maxStepsAllowed: 5,
  },
];
```


async function runEval(testCases: TestCase[]) {

```js
  let passed = 0;
  for (const tc of testCases) {
    const { text, steps } = await runAgent(tc.input);
    const toolsCalled = steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));

    const toolsMatch = tc.expectedToolCalls
      ? JSON.stringify(toolsCalled) === JSON.stringify(tc.expectedToolCalls)
      : true;
    const outputMatch = tc.expectedOutputContains
      ? tc.expectedOutputContains.every((kw) => text.includes(kw))
      : true;
    const stepsOk = tc.maxStepsAllowed
      ? steps.length  ${tc.maxStepsAllowed}`);
    }
  }
  console.log(`\n结果: ${passed}/${testCases.length} 通过`);
```

}`

#### 9.3 LLM-as-Judge

用另一个 LLM 来评判 agent 的输出质量。

```js
const judgment = await generateText({
  model: deepseek("deepseek-chat"),
  prompt: `你是一个评判者。请评估以下 AI 助手的回答质量。
```


用户问题：${userQuestion}
助手回答：${agentAnswer}

评分标准（1-5 分）：
1. 准确性：回答是否基于工具返回的真实数据？
2. 完整性：是否回答了用户的所有问题？
3. 简洁性：是否有多余的废话？

请给出评分和理由。`,
});`

### 10. 实战项目建议

按难度递增排列。每个项目都会遇到不同的真实问题。

#### 项目 1：个人知识库问答 Agent

<strong>做什么：</strong> 读取本地 Markdown 文件，用 RAG 回答关于这些文件的问题。

<strong>你会学到：</strong>

- 文本分割 (chunking)
- 向量嵌入 (embedding)
- 相似度搜索
- 如何把检索结果融入 prompt
<strong>技术栈建议：</strong> AI SDK + 本地向量库（如 `vectra` 或 `orama`）

#### 项目 2：命令行编程助手

<strong>做什么：</strong> 一个能读写文件、执行命令的 CLI agent（类似简化版 Claude Code）。

<strong>你会学到：</strong>

- 危险操作的权限控制（不能让 agent 随便 rm -rf）
- 文件系统工具的设计
- 命令执行的沙箱
- 错误恢复
<strong>工具示例：</strong>

readFile(path) → 读文件
writeFile(path, content) → 写文件
runCommand(cmd) → 执行命令（需要确认）
listFiles(dir) → 列目录`

#### 项目 3：多 Agent 研究助手

<strong>做什么：</strong> 给定一个主题，自动搜索、阅读、总结、生成研究报告。

<strong>你会学到：</strong>

- 多 agent 编排
- 真实 API 调用（搜索引擎 API）
- 长文本处理
- 输出结构化
<strong>架构：</strong>

`Planner → [Searcher, Searcher, Searcher] (并行) → Synthesizer → Writer`

#### 项目 4：自我改进的代码生成 Agent

<strong>做什么：</strong> 给需求 → 生成代码 → 运行测试 → 如果失败则分析错误 → 修改代码 → 重试。

<strong>你会学到：</strong>

- Reflexion 模式
- 代码执行沙箱
- 测试驱动的 agent 循环
- 失败分析与恢复

### 11. 推荐资源

#### 论文

论文链接ReAct[https://arxiv.org/abs/2210.03629](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03629)Toolformer[https://arxiv.org/abs/2302.04761](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.04761)Reflexion[https://arxiv.org/abs/2303.11366](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2303.11366)Voyager[https://arxiv.org/abs/2305.16291](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.16291)LATS[https://arxiv.org/abs/2310.04406](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2310.04406)A Survey on LLM-based Agents[https://arxiv.org/abs/2308.11432](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2308.11432)
#### 文档

资源链接Vercel AI SDK 官方文档https://ai-sdk.devVercel AI SDK - Agents 章节https://ai-sdk.dev/docs/foundations/agentsOpenAI Function Calling 指南https://platform.openai.com/docs/guides/function-callingDeepSeek API 文档https://platform.deepseek.com/api-docsAnthropic Tool Use 指南https://docs.anthropic.com/en/docs/build-with-claude/tool-use
#### 开源项目（值得阅读源码）

项目为什么读它Vercel AI SDK (vercel/ai)理解 agent 循环的工业级实现LangChain.js理解 chain/agent/memory 的抽象设计AutoGPT早期自主 agent 的经典尝试，学习它的问题和局限OpenDevin开源编程 agent，学习工具设计和沙箱CrewAI多 agent 协作框架，学习编排模式
#### 课程与博客

资源说明DeepLearning.AI - AI Agents 系列课程Andrew Ng 的短课程，免费Lilian Weng 的博客OpenAI 研究员，写了很多 agent 综述文章Simon Willison 的博客LLM 实践经验，大量真实案例
### 总结

SDK 调用        → 入门（你已经在这里了）
手写 agent 循环  → 理解本质
工具设计         → 决定 agent 能力上限
Prompt 工程     → 决定 agent 稳定性
多 agent 编排   → 处理复杂任务
可靠性工程       → 从 demo 到生产
评估体系        → 量化改进方向`

最重要的一条建议：<strong>做一个解决你自己真实需求的 agent。</strong> 在 demo 里一切都很美好，只有真实场景才会暴露真正的挑战。
