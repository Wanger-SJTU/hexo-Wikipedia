---
title: Anthropic最新博客定调技术焦点：一次缓存失误，成本为何瞬间膨胀120倍
date: "2026-05-03 00:00:00"
updated: "2026-05-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AgentCLI/Anthropic最新博客定调技术焦点-一次缓存失误,成本为何瞬间膨胀120倍/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2034367229135937946
---


**导读**：2026年4月底，Anthropic工程师Thariq Shihipar发布了一篇内部复盘博客，披露Claude Code如何在prompt caching上构建整个产品。这篇看似技术细节的文章，实际上揭示了长周期Agent产品得以存续的经济学基础。
 
 **你将学到**：什么是逐字节匹配的缓存规则 → 为什么DeepSeek的定价让缓存失误成本膨胀120倍 → 怎样用4行代码接入Anthropic缓存 → 大厂踩过的6个反直觉坑 → 如何调试&#34;明明加了缓存为什么账单没变&#34; → 何时该用Tiered Caching、何时不必过度工程
 
一、What：Prompt Caching 是什么

1.1 一句话定义
Prompt caching（提示词缓存）的本质是**前缀复用**：当多轮LLM请求共享相同的前缀内容（system prompt、工具定义、对话历史等）时，API提供商在第一次请求后把这些前缀对应的KV Cache（Key-Value缓存状态）保存下来，后续请求只需发送**新增的部分**，服务器直接复用已计算好的前缀状态，跳过最耗时的prefill阶段。

一个通俗类比：模型处理长prompt就像**组装一套复杂的乐高模型**。第一遍你需要从零件袋里一个个找、一块块拼（prefill阶段，计算每个token的KV状态）。拼好后，你把成品拍照存起来（写入缓存）。下一轮有人让你在同一个模型基础上加几块新积木，你不需要重新拆开重拼——直接把照片调出来，从已有的成品继续往上搭（命中缓存，跳过prefill）。但如果有人说&#34;把说明书第三页的某个字改一下&#34;，你就得从头重拼（缓存失效）。

用工程界的行话来说：

**&#34;Cache Rules Everything Around Me&#34;** —— Anthropic工程师在博客开篇引用
 
1.2 逐字节匹配：命中与否的唯一标准
Prompt caching不是&#34;意思差不多&#34;就能命中。它的匹配规则极其严苛：**你的请求前缀与服务器已缓存的前缀必须逐字节（byte-for-byte）完全一致。**

Request 1: &#34;You are a helpful assistant.&#34;    → Cache created
Request 2: &#34;You are a helpful assistant.&#34;    → Cache hit ✓
Request 3: &#34;You are a helpful assistant &#34;    → Cache miss ✗ (多了一个末尾空格)
Request 4: &#34;You are a Helpful assistant.&#34;    → Cache miss ✗ (Helpful首字母大写)

Anthropic的官方文档反复强调：

 &#34;A single byte difference at position N invalidates the cache for all breakpoints at positions ≥ N.&#34; （位置N的一个字节差异，会使位置≥N的所有断点缓存全部失效。）
 这意味着：**一个逗号的变化、字段顺序的调整、空格的增减，都会导致缓存失效。** 这也是后文所有工程教训的核心出发点。

但这句话本身是抽象的。让我们用**四个具体场景**来看清楚&#34;位置N的差异使N之后失效&#34;到底是什么意思：

**场景A：只有当前用户输入变了（正常多轮对话）**

上一轮: [系统提示][工具定义][消息1][消息2]
本轮:   [系统提示][工具定义][消息1][消息2][用户新输入]
          ──────────全部命中──────────  ↑断点  新增（无缓存）

- 系统提示、工具定义、消息1、消息2 → **与上轮逐字节相同 → 全部命中**
- 只有新增的&#34;用户新输入&#34; → 没缓存过，需要重新计算
- **结论：正常多轮对话中，前面所有内容都被复用，只有新增token需要付费**这就是&#34;system_and_3&#34;断点策略的智慧——断点放在最新消息末尾，让前面绝大部分内容始终命中。

**场景B：系统提示里埋了时间戳，时间变了（悲剧）**

上轮: [系统提示含时间10:00][工具定义][消息1][消息2]
本轮: [系统提示含时间10:01][工具定义][消息1][消息2]
       ↑差异在位置N=50
       ──❌──从位置50开始全部失效──❌──❌──❌──

- 时间从&#34;10:00&#34;变成&#34;10:01&#34; → 差异出现在位置50
- **位置50之后的所有内容（工具定义、消息1、消息2）全部无法命中**
- 100K tokens的前缀，因为一个时间戳失效了99.9%**场景C：消息1的内容变了（历史被编辑/回滚）**

上轮: [系统提示][工具定义][消息1旧][消息2]
本轮: [系统提示][工具定义][消息1新][消息2]
                         ↑差异在位置N=5000
       ───命中───         ──❌──从5000开始失效──❌──

- 系统提示 + 工具定义（位置0-4999）→ **完全没变，命中**
- 消息1新 + 消息2（位置5000之后）→ 变了，需要重新计算
- **结论：局部变化只影响变化点之后的部分，前面的仍然复用****场景D：4个断点的作用——把请求切成&#34;缓存区域&#34;**

Anthropic允许你在4个content block上放置`cache_control`，相当于把前缀切成5个可独立管理的缓存区域：

区域1 [系统提示+工具] ↑断点1  区域2 [消息1] ↑断点2  区域3 [消息2] ↑断点3  区域4 [消息3] ↑断点4  区域5 [当前输入]
    ←──可缓存──→        ←──可缓存──→       ←──可缓存──→       ←──可缓存──→       ←──每轮新增──→

如果**区域2的消息1**内容变了：

- 区域1（系统提示+工具）→ **仍然命中**（在变化点之前）
- 区域2-5 → 需要从消息1开始重新计算断点的意义就是：**让变化只影响它所在的区域及之后的区域，而不是整个请求全部失效。**

**一句话总结**：&#34;位置N的差异使N之后失效&#34;不是&#34;用户输入破坏了前面的缓存&#34;——用户输入本来就在末尾，它只会让新增部分无缓存。**真正致命的是：如果在很早的位置（如系统提示）发生了变化，那么从那个变化点开始，后面所有内容（包括原本可以复用的历史消息）都跟着失效。** 保护好前缀开头（位置0到第一个断点）之间的内容，是让缓存命中率最大化的第一性原理。
 理解缓存需要先理解模型推理的两个阶段：

阶段操作耗时缓存的作用Prefill（预填充）处理整个输入prompt，计算每个token的KV状态占输入阶段90%+时间被跳过Decoding（解码）基于KV状态自回归生成输出token与输出长度成正比不受影响在没有缓存的情况下，每一轮对话都要重新执行prefill——即使system prompt和工具定义与上一轮完全相同。当上下文达到100K token时，这意味着每一轮都要重新计算10万token的KV状态。

**有了缓存后**：服务器只需处理本轮新增的token（可能只有几百个），然后立即进入解码阶段。100K的前缀被&#34;瞬间加载&#34;。

**vLLM的自托管实现**使用**父哈希链（parent hash chaining）**：每个KV cache block的哈希编码了从prompt开头到该block的完整历史。如果block 2的哈希匹配，block 0和1的匹配是**被保证的**——因为它们的历史已经被编码在block 2的哈希中。

Block 0: &#34;The capital&#34;       hash = hash(&#34;The capital&#34;)
Block 1: &#34;of France&#34;         hash = hash(block0_hash + &#34;of France&#34;)
Block 2: &#34;is Paris&#34;          hash = hash(block1_hash + &#34;is Paris&#34;)

1.4 四大平台实现方式对比
2026年，主流平台的prompt caching实现差异显著，选型直接影响工程复杂度：

维度Anthropic ClaudeOpenAI GPTGoogle GeminiDeepSeek控制方式显式标记 (cache_control)全自动（无需标记）显式创建缓存对象内置前缀缓存最低Token阈值1,024-4,096（因模型而异）1,02432,768不明确最大断点数每请求4个无（自动管理）无限制不明确缓存命中折扣90%（读取=10%原价）50%75%98-99.2%写入溢价125%（5分钟）/ 200%（1小时）无溢价按小时收存储费不明确TTL5分钟（默认）/ 1小时（可选）5-10分钟（不保证）最长24小时不明确隔离级别Workspace级（2026.2起）Organization级Project级不明确**选型建议**：如果你需要精确控制缓存边界（Agent场景强烈推荐），Anthropic的显式标记是目前最成熟的方案——官方文档对`cache_control`的每个参数、限制条件和边界情况都有详尽说明。OpenAI的自动缓存适合快速上线但缺乏调优空间。Gemini的32K最低阈值使其更适合大文档分析而非对话式Agent。

**关于DeepSeek**：DeepSeek的模型权重和推理代码是开源的（你可以基于vLLM自建完整的缓存体系），其商业API也提供前缀缓存能力。但与Anthropic的显式控制模式不同，DeepSeek采用**全自动前缀匹配**——无需`cache_control`标记，系统自动识别可缓存前缀。这种模式的优点是接入零成本，缺点是开发者无法精确控制缓存边界、无法从API响应中读取逐请求的缓存命中状态（如Anthropic的`cache_read_input_tokens`字段），调试未命中原因时需要更多黑箱推断。如果你需要可观测性和精细控制，Anthropic目前更成熟；如果你追求极简接入和极致折扣，DeepSeek的全自动模式是合理选择。

二、Why：为什么说&#34;Prompt Caching is Everything&#34;

2.1 成本经济学：从90%折扣到120倍杠杆
Anthropic的定价给出了一个基准：缓存读取成本仅为基础输入成本的 10%（写入成本为125%）。一个100K token上下文、80%命中率的会话，每次请求成本仅为完全未缓存状态的 **1/8**。

但这只是开始。2026年4月24日，DeepSeek发布V4系列，随后在**48小时内连续两次降价**：4月25日V4-Pro开启限时2.5折促销，4月26日又将全系列**输入缓存命中价格降至首发价的1/10**。

最终定价对比（截至2026年4月底）：

厂商/模型缓存命中输入缓存未命中输入命中折扣力度命中vs未命中倍数DeepSeek V4 Flash$0.0028 / 1M$0.14 / 1M98%1:50DeepSeek V4 Pro（促销至5/31）$0.003625 / 1M$0.435 / 1M99.2%1:120DeepSeek V4 Pro（标准价）$0.0145 / 1M$1.74 / 1M99.2%1:120Anthropic Claude基础价的10%基础价90%1:10OpenAI GPT系列基础价的50%基础价50%1:2这组数字揭示了一个残酷的工程现实：**在DeepSeek V4的定价体系下，一次缓存未命中的代价是命中状态的50倍甚至120倍。**

如果你设计的Agent系统因为一次prompt结构调整、一个时间戳注入、或一次模型切换而打破了缓存，你的成本不是&#34;稍微多一点&#34;，而是**瞬间膨胀50-120倍**。在100K token级别的长会话中，一次缓存重建足以吃掉月度配额的近10%。

**一个具体的月账单算例**（以Anthropic Claude Sonnet 4.6为例，假设日均1000次请求，每次平均80K token前缀）：

场景月均Token数单价月均成本无缓存（每次全价计算）240M input$3.00/1M$72080%命中率（理想状态）48M未命中 + 192M命中3.00 + 0.30/1M$201.6**命中率从80%跌到60%**（一次架构失误）96M未命中 + 144M命中3.00 + 0.30/1M$331.2完全命中破坏（0%命中率）240M全价$3.00/1M$720从上表可以看到：**命中率每下降10个百分点，月成本上升约20%。一次架构失误让命中率从80%跌到60%，每月多烧$130——这还只是中等规模的Agent。** 当规模扩大到日均10万次请求时，这个差距会变成每月$13,000。对于按量付费的初创团队，这可能是生与死的差别。

2.2 延迟改善：TTFT与用户体验
Prompt caching不仅省钱，还**加速**。复用KV Cache意味着跳过prefill阶段，首token延迟（Time-To-First-Token, TTFT）直接改善。PwC研究论文测得：**13%-31%的TTFT改善**，在长对话中这个差距会被用户直接感知。

2.3 学术验证：PwC的独立对照实验
2026年1月PwC研究团队发表的论文《An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks》提供了独立验证。

研究团队在**DeepResearch Bench**（需要自主执行多轮网页搜索的Agent基准）上评估了三种策略：

策略成本节省TTFT改善稳定性Full context caching41%-80%13%-31%动态工具结果写入缓存但几乎不复用，可能paradoxically增加延迟System prompt only caching41%-80%13%-31%最稳定收益Excluding dynamic tool results41%-80%13%-31%中等核心结论：**仅缓存system prompt**的策略在成本和延迟两个维度上提供了最稳定的收益。盲目启用full-context缓存有时反而增加延迟，因为动态工具调用结果被写入缓存但几乎不会被复用，产生纯写入开销而无读取收益。

2.4 没有缓存就没有Agent产品：商业模式的根基
Claude Code作为一个需要与用户进行**数十轮甚至上百轮交互**的编程助手，每一次对话都可能携带数十万token的上下文。如果没有prompt caching，每一轮都要重新计算整个上下文——包括系统提示、工具定义、CLAUDE.md、历史对话和代码库快照。

这种重复计算在经济学上几乎不可持续。Prompt caching从来不是&#34;可选项&#34;，它是Agent产品的**经济生命线**——直接决定了你的产品能否在定价上规模化，能否为用户提供足够慷慨的速率限制，能否在长会话中保持可用。

在Agent时代，产品的竞争壁垒不再仅仅是模型能力，而是**围绕模型构建的 harness**——context window管理、system prompt工程、caching策略、compaction机制、tool编排。正如Google Vertex AI工程师Patrick Marlow所说：模型终将商品化（fast, good, and cheap）。**区分胜者的，是模型周围的生态系统。**

三、How：从实现到生产的完整指南

3.1 实现路径：代码层面的接入

Anthropic 的 `cache_control` 用法
Anthropic的prompt caching通过一个JSON参数 `cache_control` 控制。这是目前生产环境使用最广泛的机制。

import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model=&#34;claude-sonnet-4-6&#34;,
    max_tokens=1024,
    system=[
        {
            &#34;type&#34;: &#34;text&#34;,
            &#34;text&#34;: &#34;你是一个专业的代码审查助手。遵循以下规则：...&#34;,  # 长system prompt
            &#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;}  # ← 缓存断点
        }
    ],
    messages=[{&#34;role&#34;: &#34;user&#34;, &#34;content&#34;: &#34;请审查这段代码&#34;}]
)

**关键点**：

- `cache_control` 加在**content block级别**（不是message级别），表示&#34;从请求开头到此处为止全部缓存&#34;
- `ephemeral` 是唯一支持的类型，表示临时缓存
- 每个请求最多在**4个content block**上放置`cache_control`标记（可理解为4个缓存断点，将前缀分割成最多5个缓存区域）
- 只有 `/v1/messages` 端点支持，OpenAI兼容模式不支持**TTL 控制（2026年更新）**：

# 默认5分钟TTL，写入成本1.25x
&#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;}

# 1小时TTL，写入成本2x，适合长会话
&#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;, &#34;ttl&#34;: &#34;1h&#34;}

5分钟TTL在2次缓存命中后回本，1小时TTL在3次命中后回本。对于Agent场景，如果用户交互间隔可能超过5分钟，1小时TTL通常是更经济的选择。

**Scope 控制（Beta，2026.1起）——API层面的后来进化**：

需要特别注意时间线：Claude Code博客中分享的六大教训（如&#34;不在中途增减工具&#34;&#34;用消息而非system prompt传递更新&#34;），是团队**在没有这些高级API参数的早期阶段**通过Prompt Engineering硬蹚出来的经验。`scope`参数是Anthropic在2026年1月基于这些生产经验推出的API进化——它让开发者可以更精细地控制缓存的生命周期范围，但博客中的工程教训发生在它之前。

# turn级：仅在当前对话轮次有效
&#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;, &#34;scope&#34;: &#34;turn&#34;}

# global级：跨轮次共享（默认）
&#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;, &#34;scope&#34;: &#34;global&#34;, &#34;ttl&#34;: &#34;1h&#34;}

注意：`scope` 字段需要 `prompt-caching-scope-2026-01-05` beta header，且目前**不支持AWS Bedrock和Vertex AI**——这些平台会因未知字段直接返回400错误。

自动缓存 vs 显式缓存
2026年2月起，Anthropic在Messages API上默认启用**自动缓存**——系统会自动识别长且稳定的前缀并在最后一个可缓存block上放置断点，无需手动标记。

# 自动缓存：无需任何标记，系统自行判断
response = client.messages.create(
    model=&#34;claude-opus-4-6&#34;,
    max_tokens=1024,
    system=&#34;你是一个客服助手...&#34;,
    messages=conversation_history
)

但生产环境中，**显式缓存仍被推荐**，原因有三：

- 自动缓存占用4个断点配额中的1个，且不可控
- 复杂的Agent prompt需要精确规划多个断点位置
- 自动缓存的命中行为不透明，调试困难最佳实践是**混合模式**：对简单场景用自动缓存快速上线，对长会话Agent用显式断点精细控制。

多轮对话的断点策略：system_and_3
Anthropic建议的 &#34;system_and_3&#34; 策略是Agent场景的黄金标准：

Breakpoint 1: System prompt（全部工具定义+角色指令）     ← 跨会话稳定
Breakpoint 2: 倒数第3条非system消息                    ← 滚动窗口
Breakpoint 3: 倒数第2条非system消息                    ← 滚动窗口
Breakpoint 4: 最后一条非system消息                      ← 当前轮次

代码实现：

def apply_cache_breakpoints(messages, system_prompt):
    &#34;&#34;&#34;为Anthropic API消息序列应用缓存断点&#34;&#34;&#34;
    import copy
    msgs = copy.deepcopy(messages)

    # Breakpoint 1: System prompt（在调用时通过system参数传递）

    # Breakpoint 2-4: 在消息历史中的滚动断点
    non_system_msgs = [i for i, m in enumerate(msgs) if m[&#34;role&#34;] != &#34;system&#34;]

    for idx in non_system_msgs[-3:]:
        content = msgs[idx][&#34;content&#34;]
        if isinstance(content, list) and content:
            content[-1][&#34;cache_control&#34;] = {&#34;type&#34;: &#34;ephemeral&#34;}
        elif isinstance(content, str):
            msgs[idx][&#34;content&#34;] = [
                {&#34;type&#34;: &#34;text&#34;, &#34;text&#34;: content,
                 &#34;cache_control&#34;: {&#34;type&#34;: &#34;ephemeral&#34;}}
            ]
    return msgs

这种策略的优势：system prompt始终被缓存（最大收益区），消息历史通过滚动窗口逐步建立新的缓存层，避免整段历史失效。

最低Token阈值与模型差异
不是所有内容都值得缓存。Anthropic对不同模型设置了不同的最低缓存门槛：

模型最低缓存Token数Claude Haiku系列4,096Claude Sonnet 4.5+2,048Claude Opus系列4,096Claude Mythos系列4,096如果你的system prompt不足最低阈值，可以通过padding（填充few-shot示例或扩展指令）来达到要求——这同时能提升模型输出质量。

TypeScript/Node实现
对于使用Vercel AI SDK的开发者：

import { anthropic } from &#39;@ai-sdk/anthropic&#39;;
import { generateText } from &#39;ai&#39;;

const result = await generateText({
  model: anthropic(&#39;claude-sonnet-4-6&#39;),
  system: SYSTEM_PROMPT,
  messages: conversationHistory.map((msg, idx, arr) => ({
    ...msg,
    ...(idx === arr.length - 1 ? {
      providerOptions: {
        anthropic: { cacheControl: { type: &#39;ephemeral&#39; } }
      }
    } : {})
  })),
});

AI SDK会自动将message-level的 `providerOptions` 转换为Anthropic API所需的block-level `cache_control`。

 ⚠️ **端点警告（极易踩坑）**：无论使用Python SDK还是Vercel AI SDK，底层调用的必须是Anthropic原生 `/v1/messages` 端点。如果你通过OneAPI、New API等中转站，或显式指定了 `/v1/chat/completions`（OpenAI兼容端点），`cache_control` 会被**静默丢弃**——请求不会报错，缓存也不会生效，账单上永远看不到折扣。这是国内开发者最常遇到的&#34;加了缓存但死活不生效&#34;的根因。
 
3.2 架构设计：Claude Code团队的六大反直觉教训
Anthropic在博客中分享的六条教训，每一条都来自真实的生产故障和SEV（Site Event）复盘。DeepSeek V4虽然定价激进，其缓存机制的本质与Claude完全一致（前缀匹配、字节级一致、逐token计费）——以下法则在全球所有Agent开发者中通用。

教训1：提示词的「物理顺序」比内容更重要
Claude Code的提示词结构被精心设计成四层递进：

1. System instructions & Tools      ← 全局缓存（最稳定）
2. CLAUDE.md & Memory               ← 按项目缓存（项目根目录的`CLAUDE.md`文件，类似项目专属的系统提示）
3. Session context（env/MCP/风格）   ← 按会话缓存（MCP = Model Context Protocol，模型上下文协议标准）
4. Messages（对话历史）              ← 每轮增长（动态部分）

这个顺序遵循一条铁律：**静态内容尽可能靠前，动态内容严格靠后。**

Anthropic坦承他们曾多次因为微小的顺序错误而打破缓存：在静态system prompt中嵌入详细时间戳、非确定性地打乱工具定义的顺序、更新工具参数（例如Agent Tool可调用的子代理列表）。

**实战启示**：在设计Agent的prompt结构时，先画一张「缓存友好性」架构图，确认哪些块是绝对静态的。任何需要变更的信息，都必须被推到缓存断点之后。

教训2：用Messages传递更新，而非修改System Prompt
当会话中的信息过时（例如时间变化、用户修改了文件），工程师的本能反应是更新system prompt。但这会**立即导致整个前缀缓存失效**。

Claude Code的解决方案是在**下一轮对话的消息中**注入更新，使用`<system-reminder>`标签：

<system-reminder>
  用户刚刚修改了 src/config.js 文件。
  当前时间是 2026-05-02 14:30 UTC。
</system-reminder>

**实战启示**：把system prompt视为「宪法」——极少修改；把messages视为「日报」——频繁追加。不要让宪法因为日常新闻而重写。

**一个值得思考的 trade-off**：将时间戳等动态信息从 system prompt 迁移到 message 中，虽然保护了缓存，但模型对 message-level 信息的&#34;重视程度&#34;是否会低于 system prompt？目前社区尚无大规模 A/B 测试给出定论。如果你的 Agent 对实时信息（如&#34;当前股价&#34;&#34;截止时间&#34;）的精确性极度敏感，建议保留一份最小化的、不含动态变量的 system prompt 架构，同时通过更显眼的 message 格式（如 XML 标签、重复强调）来补偿潜在的权重差异。缓存与质量之间的最优平衡点，可能是每个 Agent 产品都需要自己丈量的课题。
 
教训3：绝不在会话中途切换模型或增减工具
Prompt cache是**模型专属**的。如果你在100K token对话中从Opus切换到Haiku，你以为会省钱，实际上Haiku需要从零重建整个缓存。在高上下文量下，**全价重建Haiku缓存的成本可能超过继续用Opus的缓存价格**。

同理，增减工具也会破坏缓存，因为工具定义属于前缀的一部分。

Claude Code的Plan Mode就是一个围绕缓存约束设计的经典案例。直觉上，进入Plan Mode时应该只保留只读工具。但如果这样做，每次切换都会破坏缓存。

Claude Code的解法：**所有工具始终保留在请求中**，但`EnterPlanMode`和`ExitPlanMode`本身是两个工具调用。当用户开启Plan Mode时，系统通过消息告知模型当前处于计划模式（只读、不编辑文件），工具定义从未改变。这个设计还有一个额外收益：模型可以在检测到难题时**自主调用EnterPlanMode**，无需任何外部指令，同时保持缓存完好。

对于工具过多的场景（Claude Code可能加载数十个MCP工具），他们采用`defer_loading`策略：发送轻量级工具stub（仅名称），模型通过tool search发现需要时再加载完整schema。前缀始终保持相同的stub列表。

**实战启示**：在架构设计阶段就锁定模型和工具集。如果需要多模型协作，用**子代理（subagent）**而非切换当前会话模型。

教训4：Compaction必须「缓存安全」
当对话接近上下文窗口上限时，需要compaction（压缩/总结历史）。直觉的做法是发起一个全新的API调用来总结：用一个专门的system prompt（比如&#34;请总结这段对话&#34;），不带任何工具。但这样做的问题是——这个总结请求的前缀与主对话完全不同，**缓存完全失效**。你不得不为整个长对话支付全价输入费用，而对话越长，这个总结调用越贵。

Claude Code的解决方案是**cache-safe forking**：

- 使用与父对话完全相同的system prompt
- 完全相同的user context、system context和工具定义
- 将父对话的历史messages前置
- 在最末尾追加compaction指令作为新的user message

从API视角看，这个请求与父对话的最后一轮请求几乎完全一致——相同前缀、相同工具、相同历史。缓存前缀被完全复用，**仅需为compaction prompt本身和summary输出支付新token费用**。当然，这需要预留一个「compaction buffer」（压缩缓冲区）。

好消息是，Anthropic已经将这些经验内化，把**compaction直接 built-in 到API层面**。

**实战启示**：任何fork操作（compaction、summary、skill execution）都必须使用与父上下文**逐字节一致的前缀参数**。

教训5：像监控Uptime一样监控缓存命中率
在Claude Code团队，缓存命中率是**一级服务指标**。他们会对缓存中断（cache break）发起告警，并视其为SEV（严重事故）处理。原因很简单：几个百分点的缓存未命中率，会直接转化为**显著的成本飙升和延迟退化**。

2026年4月，Anthropic发布了一份详尽的postmortem，承认Claude Code出现质量下降的原因并非模型本身，而是一系列围绕模型的系统变更——包括prompt调整、caching bugs和reasoning机制修改——在短时间内集中上线，产生了复合效应。这份复盘揭示了一个关键事实：**产品层面的变更（prompt、context、caching策略）对用户体验的影响，可能远大于模型版本迭代。**

**实战启示**：在生产环境建立三级监控——cache hit rate、cost per session、time-to-first-token（TTFT）。当任一指标出现异常波动时，优先排查是否有人在未通知的情况下修改了prompt结构或工具集。

教训6：TTL是隐形的成本杀手
Prompt cache并非永久有效，它有TTL（Time-To-Live）。根据2026年社区的多方验证和官方行为：

用户层级TTL备注Pro Plan / API按量付费5分钟需要持续交互维持Max Plan1小时长会话更友好这意味着：如果你离开键盘5分钟（Pro用户）或1小时（Max用户），整个累积的上下文缓存会完全失效。当你回来发送第一条消息时，系统需要重写整个缓存——这个写入成本是基础输入成本的1.25倍。

一位Pro用户通过分析119,000条日志发现，在极端情况下，**单次缓存重建可能消耗高达9%的月度配额**。

社区推荐的防御性做法：

- 短暂离开前，发送一条轻量消息（如&#34;总结我们目前的进度&#34;），重置TTL计时器
- 如果预计离开较久，主动结束会话，回来时开启新会话可能比重建缓存更划算
- 避免在会话中途使用`/clear`——这会摧毁缓存并强制全额重建
3.3 规模化生产实战：社区经验
**阅读提示**：本节涉及子代理架构、多副本集群 Tiered Caching 等方案，属于**进阶选修内容**，适用于已跨越单 Agent 原型阶段、面临规模化成本与延迟瓶颈的团队。如果你的产品目前仍处于 MVP 阶段或月 API 费用未成为主要约束，可先通读建立直觉，不必急于落地——避免&#34;为了省 100 块钱的缓存费，多雇一个架构师&#34;。
 
子代理架构中的缓存约束传播
当系统引入子代理（sub-agent）架构时，prompt caching的约束会以不易察觉的方式传播。yage.ai 2026年4月的技术分析揭示了三个&#34;盲区&#34;：

**盲区一：子代理的缓存冷启动。** 每个子代理启动时都会建立自己的API会话，拥有独立的缓存前缀。主代理精心维护的缓存对子代理完全无效。**每一个短生命周期的子代理都意味着一次缓存冷启动。**

**盲区二：`reasoning_effort` 参数破坏缓存共享。** 某些harness在派发简单子任务时将推理力度设为`low`，但`reasoning_effort`的变化可能改变API请求的参数签名，导致与正常请求的缓存无法共享。**看似在节省成本，实际上因为cache miss反而付出了更多。**

**盲区三：子代理system prompt的&#34;微差异&#34;陷阱。** 如果主代理和子代理共享一部分system prompt（通用安全规则、行为准则），这部分内容必须放在子代理messages的最前面，并且保持与主代理**逐字节一致**。任何差异——哪怕是为了&#34;简化&#34;而删除几行——都意味着子代理无法复用主代理的缓存，也无法与其他子代理共享缓存。

**解决方案**：在设计子代理策略时，必须在任务分解粒度与缓存复用潜力之间做数据驱动的权衡。测量子代理的实际缓存命中率和冷启动成本占比。

多副本部署：Tiered Prompt Caching
当业务从单副本扩展到多副本集群时，**round-robin负载均衡会让缓存命中率线性衰减。** DigitalOcean 2026年4月的分析揭示：在N个副本的集群中，一个携带相同前缀的请求只有**1/N的概率**命中已缓存该前缀的副本。缓存命中率从单副本的90%+，跌到10副本集群的不到10%。

**解决方案：分层缓存架构**

Tier 1（任务级前缀缓存）：按任务类型分组副本（summarization、code gen、QA），
                         每组独立缓存该任务的system prompt和工具定义
Tier 2（会话级前缀缓存）：在副本组内部，使用一致性哈希将特定会话固定到特定副本
Tier 3（热点前缀的全局缓存）：对所有副本共享的通用前缀（base safety rules），
                         推送到所有副本的本地缓存或共享KV cache存储

**什么时候需要Tiered Prompt Caching？一个简单的判断矩阵：**

你的现状建议单副本部署，月API费用 <$500不需要。把精力放在prompt结构优化和基础缓存上2-5副本，命中率从90%跌到30-50%考虑Tier 2。一致性哈希比全Tiered架构简单得多5+副本，多任务类型混部，命中率<20%需要完整Tiered。成本节省通常能在1-2个月内覆盖工程投入已有K8s + 专职SRE + 多模型路由必须Tiered。这是你的基础设施本来就该做的事
成本优化实战：三级叠加策略
Martin Kostov 2026年4月分享了一个完整的生产级成本优化案例，通过**三级策略叠加**，将LLM API成本削减67%：

**第一级：应用层精确匹配缓存（35%节省）**。对最高频、最低方差的端点实施精确匹配缓存。如果输入完全相同，直接返回缓存结果，零API调用。

**第二级：Prompt Caching（25%节省）**。对多轮对话和Agent任务启用provider-level prefix caching，将长system prompt、工具定义、项目文档等静态内容稳定前置。

**第三级：Prompt压缩（41%长度削减）**。在缓存之外，对输入prompt进行压缩：RAG相关性预算检索（按阈值动态截止，不固定K个chunk）、跨chunk去重、chunk压缩（只提取相关句子而非完整chunk）。

**关键洞察**：这三级策略不是&#34;选一个&#34;，而是**叠加使用**——语义缓存兜底高频查询，前缀缓存优化长上下文，prompt压缩减少所有路径上的token基数。

3.4 调试与避坑：怎样才算命中？

从API账单读取命中状态
Anthropic API的响应包含三个关键字段，这是判断命中与否的唯一可靠方式：

{
  &#34;usage&#34;: {
    &#34;input_tokens&#34;: 500,                    // 全新输入token（未命中部分）
    &#34;cache_creation_input_tokens&#34;: 120000,   // 本次写入缓存的token数
    &#34;cache_read_input_tokens&#34;: 0             // 本次命中缓存读取的token数
  }
}

**三种状态解读**：

状态cache_creationcache_read含义首次建立> 0= 0服务器正在处理并写入缓存。这是正常的第一轮行为命中成功= 0> 0服务器直接复用了缓存前缀！你在省钱完全未命中> 0= 0本该命中的前缀被打破了，服务器被迫全价重建健康的多轮会话应该呈现这样的模式：

第1轮: cache_creation = 120K, cache_read = 0    ← 首次建立，付费1.25x
第2轮: cache_creation = 0,    cache_read = 120K  ← 命中！付费0.1x
第3轮: cache_creation = 0,    cache_read = 120K  ← 命中！付费0.1x
第4轮: cache_creation = 0,    cache_read = 120K  ← 命中！付费0.1x

如果多轮对话中`cache_read`始终为0，说明**缓存从未被命中**。

真实悲剧：OpenClaw的10.5%命中率
OpenClaw项目在2026年3月记录了一个教科书级的缓存失败案例（143次连续API调用，同一会话）：

指标数值cacheWrite > 0138/143 (96%)cacheRead > 015/143 (10.5%)平均每次cacheWrite~118K tokens**诊断**：缓存几乎在每次请求都被写入，但几乎从未被读取。系统在拼命建缓存、又拼命扔掉——因为system prompt被包在**单一块**中，时间戳/运行时信息等动态内容毒化了整个120K tokens的前缀。

**修复方案**：将system prompt拆分为多个content block，只在静态块上加`cache_control`，动态块不加。时间戳变化只影响它自己所在的block，不会毒化前面的静态前缀。

六大静默命中破坏者

破坏者表现形式影响范围时间戳/日期datetime.now()嵌入system prompt整个system prompt缓存失效非确定性JSON序列化Python json.dumps()字段顺序随机变化每次请求的system prompt前缀都不同工具描述中的随机IDAgent SDK的Bash工具描述中嵌入UUID每次query()整个缓存重建字段顺序变化messages列表中的字段顺序不一致前缀逐字节不匹配空格/换行/大小写末尾空格、大小写差异逐字节不匹配，缓存miss图片附件变化图片base64编码细微差异前缀不匹配
四步调试法：当cache_read始终为0时
**Step 1: 检查是否达到最低Token阈值**

- Claude Haiku系列: 4,096 tokens
- Claude Sonnet 4.5+: 2,048 tokens
- Claude Opus系列: 4,096 tokens
- 低于阈值 → 缓存不会激活（静默不缓存，无报错）**Step 2: 检查前缀逐字节一致性**

import difflib
diff = list(difflib.unified_diff(
    request1_system.encode(), request2_system.encode(), lineterm=&#39;&#39;
))
if diff:
    print(&#34;前缀不一致！&#34;, diff[:10])

**Step 3: 检查`cache_control`位置**

- 是否在**content block级别**（不是message级别）
- 是否在**静态内容**上（不是动态内容）
- 是否超过了4个断点的限制**Step 4: 检查TTL**

- 默认TTL 5分钟：如果两次请求间隔>5分钟，缓存已过期
- 可选TTL 1小时：检查是否显式指定了1小时
&#34;伪命中&#34;陷阱
如果`cache_creation_input_tokens`在多轮对话中持续>0，同时`cache_read_input_tokens`始终≈0，这就是&#34;**伪命中**&#34;状态：你的请求前缀在变化（比如system prompt中的时间戳），所以系统每次都在创建新缓存条目，但永远不会命中上一次的缓存。**缓存池被动态内容污染，大量存储被浪费，但没有任何命中。**

3.5 监控与可观测性
生产级prompt caching必须有专门的监控体系。

**主流工具对比**：

工具类型核心能力适用场景Langfuse开源/自托管Trace链路、Prompt版本管理、Session聚合需要数据自主权的团队Helicone代理/托管零代码集成（改base URL即可）、内置缓存、成本追踪快速上线、不想改代码PortkeyAI网关统一路由、缓存、guardrails、40+属性日志多模型统一管理层Braintrust全栈平台实时监控+CI/CD集成eval、A/B测试、成本归因严肃的生产Agent系统LangWatch端到端Agent仿真测试、多步trace可视化、连续质量控制复杂Agent工作流**必须监控的核心指标**：

{
  &#34;timestamp&#34;: &#34;2026-05-03T10:00:00Z&#34;,
  &#34;model&#34;: &#34;claude-sonnet-4-6&#34;,
  &#34;prefix_cache_hit_rate&#34;: 0.87,
  &#34;semantic_cache_hit_rate&#34;: 0.42,
  &#34;input_tokens_cached&#34;: 125000,
  &#34;input_tokens_fresh&#34;: 15000,
  &#34;cache_creation_tokens&#34;: 0,
  &#34;cost_usd&#34;: 0.023,
  &#34;ttft_ms&#34;: 120,
  &#34;prompt_version&#34;: &#34;v2.3.1&#34;,
  &#34;session_id&#34;: &#34;sess_abc123&#34;
}

**告警阈值建议**：

指标健康值警告严重Prefix Cache Hit Rate>80%75-80%<75%Semantic Cache Hit Rate30-60%20-30%<20%Cost per 1K requests基准20-30%30-50%>50%TTFT改善率50-85%30-50%<30%Cache重建频率<5%/天5-10%/天>10%/天
四、行动清单与前瞻

4.0 先诊断：你目前处于哪个阶段？
不必急于执行全部checklist。先对照下表定位你的产品成熟度，再决定优先级：

阶段特征你的现状当前最优先的1-2件事预计投入阶段0：还没接入缓存月API费用<$200，或刚完成MVP① 接入provider-level自动缓存 ② 移除system prompt中的动态变量1-2天阶段1：已接入但命中率低cache_read长期≈0，cost居高不下① 逐字节diff排查前缀一致性 ② 实施system_and_3断点策略3-5天阶段2：命中但架构不灵活每次加功能都怕打破缓存① 画出缓存层级图 ② 建立prompt变更评审流程1-2周阶段3：多副本/子代理规模化集群部署，命中率随副本数衰减① 评估Tiered Caching必要性 ② 测量子代理冷启动成本占比2-4周阶段4：成本精细化运营月API费用>$10K，每1%命中率都值钱① 三级叠加策略（语义+前缀+压缩）② 引入Helicone/Braintrust监控持续迭代**自测**：如果你不确定自己处于哪个阶段，打开最近7天的API账单，计算 `cache_read_input_tokens / (cache_read + cache_creation + input_tokens)`。如果这个比例<50%，你大概率在阶段0或1；>75%且cost仍是痛点，你大概在阶段3或4。
 
4.1 开发者行动清单
**架构设计阶段**

- 画出prompt的「缓存层级图」，明确哪些块是绝对静态的
- 建立「system prompt = 宪法」的共识，任何变更必须经过缓存影响评审
- 设计状态切换（如Plan Mode）时，优先使用工具调用而非prompt变更**实现阶段**

- 静态内容全部前置，动态内容（用户输入、时间戳、session ID）严格后置
- 使用`<system-reminder>`或等效机制在messages中注入实时更新
- 对于长会话，集成API级别的compaction机制，预留compaction buffer
- 对Anthropic实现&#34;system_and_3&#34;多断点策略**运维阶段**

- 监控cache hit rate、cost per session、TTFT，设置PagerDuty级别告警
- 对prompt变更实施A/B测试，量化缓存影响后再全量上线
- 定期审计第三方工具/integration的缓存行为，确保它们没有隐式破坏前缀匹配
- 对子代理架构测量实际缓存命中率和冷启动成本占比
4.2 2026年前沿演进

- **DeepSeek的激进定价重塑成本基准**：2026年4月24日DeepSeek V4发布，26日将全系列输入缓存命中价格降至首发价的1/10。V4 Flash缓存命中低至$0.0028/1M tokens。这使得缓存失效的代价被放大到50-120倍，prompt caching从&#34;优化项&#34;升格为&#34;生死线&#34;
- **自动缓存（Auto-caching）**：2026年2月19日，Anthropic宣布Messages API支持自动prompt caching，降低了正确实现的门槛
- **Compaction API内置化**：开发者可以直接调用API级别的context compaction，无需自己处理cache-safe forking
- **TTL控制精细化**：Claude Code CLI在v2.1.108版本中开始提供更细粒度的prompt caching TTL控制
- **OpenAI的竞争响应**：OpenAI提供自动缓存（1024token以上提示自动触发，50%折扣），但策略性边界控制仍是Anthropic生态更成熟一个值得关注的趋势是：**中国厂商在缓存定价上的激进策略正在倒逼全球开发者提升缓存工程能力。**当DeepSeek V4 Flash的缓存命中价格（0.0028/1M）仅为Claude Opus 4.6缓存读取价格（0.50/1M）的约1/178时，Agent产品间的成本差距正在从&#34;谁选了更便宜的模型&#34;转向&#34;谁的缓存命中率更高&#34;。

**模型选择与缓存架构是并行的两大核心竞争力**——前者决定&#34;能不能做好&#34;（效果、推理质量、多模态能力），后者决定&#34;做不做得起&#34;（成本、延迟、规模化）。好模型配烂缓存，效果好但成本高到无法持续；烂模型配好缓存，成本极低但效果差到没人用。只有两者兼得，Agent产品才能同时赢得用户和利润。

延伸阅读路线图
如果你读完本文觉得&#34;不过瘾&#34;，建议按以下路径继续深入：

- **想动手验证缓存效果** → 从 Anthropic 官方 Cookbook 的 `prompt_caching` 示例开始（30分钟可跑通第一个缓存命中）
- **想系统学习提示词工程** → 阅读 Anthropic 的《Prompt Engineering Overview》和《Long Context Prompting》指南
- **想优化 RAG 场景的缓存效率** → 研究 PwC 论文中的 &#34;Excluding dynamic tool results&#34; 策略，以及 Martin Kostov 的 chunk 压缩 pipeline
- **想自建缓存监控体系** → 从 Helicone（零代码，改 base URL 即可）或 Langfuse（自托管，数据自主）选一个快速接入
- **想理解 vLLM 的自托管缓存** → 直接阅读 vLLM 官方文档 &#34;Automatic Prefix Caching&#34; 章节，只需一个 flag**收藏建议**：把本文的&#34;四、行动清单&#34;打印出来贴在团队白板或 Notion 上，每完成一项打勾。缓存优化不是一次性任务，而是需要持续审计的纪律。
 
结语：缓存即架构，不分中外
Anthropic这篇博客的标题是&#34;Prompt caching is everything&#34;，这不是修辞夸张，而是字面意义上的工程真理。

2026年4月DeepSeek V4的连续降价，把这个真理用更赤裸的数字写在了每一个开发者面前：当缓存命中与未命中的差价达到**50倍乃至120倍**时，一次愚蠢的缓存破坏——比如在system prompt里加个时间戳，或者在会话中途切换模型——不再是&#34;小失误&#34;，而是&#34;经济灾难&#34;。

在Agent时代，产品的竞争壁垒不再仅仅是模型能力，而是**围绕模型构建的 harness**——context window管理、system prompt工程、caching策略、compaction机制、tool编排。这些系统层面的决策，直接决定了你的产品能否在经济上规模化，能否在延迟上满足用户预期，能否在长会话中保持上下文一致性。

而在中国市场的语境下，这个逻辑同样成立，甚至更加尖锐。当DeepSeek把缓存命中的token价格打到几乎可以忽略不计（0.025元/百万tokens）时，Agent应用的成本结构被彻底改写——但同时，缓存失效的惩罚也被同比放大。没有精心的缓存架构设计，再便宜的模型也会因为你的工程失误而变得昂贵。

Prompt caching就是这个生态系统中最具杠杆效应的支点。理解它、敬畏它、从Day One围绕它设计架构——这是2026年每一个Agent开发者的必修课，无论你用的是Claude、DeepSeek，还是任何即将发布的下一代模型。

参考资料与延伸阅读

- Anthropic官方博客：Lessons from building Claude Code: Prompt caching is everything (2026-04-30)
- PwC研究论文：An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks (arXiv:2601.06007)
- Anthropic Postmortem (2026-04-28)：Prompt changes, caching bugs and reasoning adjustments compound effect
- Claude Code CLI Changelog v2.1.108：TTL controls, session recap, rate limit error improvements
- The Register (2026-04-13)：Anthropic prompt caching TTL changes and community analysis
- Introl Blog (2026-03-17)：Prompt Caching Infrastructure — LLM Cost & Latency Reduction Guide
- DeepSeek官网：Models & Pricing (2026-04-26)，输入缓存命中价格降至首发价1/10
- 36氪 (2026-04-26)：DeepSeek不需要永远强，它只需证明这条路走得通 — V4 Flash调用量单日环比增长62.2%
- TokenMix Research Lab (2026-04-30)：DeepSeek Cache Hit Pricing 2026: V4 98% Input Savings Guide
- yage.ai Harness分析 (2026-04)：Sub-agent caching blind spots in production Agent systems
- DigitalOcean分析 (2026-04)：Tiered prompt caching at scale — why round-robin breaks cache
- youngju.dev (2026-04)：Prompt caching best practices — four proven patterns for production
- Martin Kostov (2026-04)：How we cut LLM API costs by 67% — semantic + prefix + compression
- OpenClaw项目复盘 (2026-03)：Why our cache hit rate was only 10.5% — a postmortem
- [http://promptbuilder.cc](https://link.zhihu.com/?target=http%3A//promptbuilder.cc) (2025-11)：Top 5 prompt caching gotchas that silently drain your budget
附录：原文完整中文翻译
 以下译文基于 Anthropic 官方博客 Lessons from building Claude Code: Prompt caching is everything（2026-04-30），由 Thariq Shihipar 撰写，原文链接：[https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything](https://link.zhihu.com/?target=https%3A//claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything)
 
构建 Claude Code 的经验教训：Prompt Caching 决定一切
**类别**：Claude Code / **产品**：Claude Code / **日期**：2026年4月30日 / **阅读时间**：5分钟

工程界有句话常说「Cache Rules Everything Around Me」（缓存支配我身边的一切），这条法则对智能体（agent）同样适用。

像 Claude Code 这样需要长期运行的智能体产品，之所以可行，全靠 **prompt caching**（提示词缓存）。它让我们能够复用上一轮往返计算的结果，显著降低延迟和成本。

在 Claude Code 中，我们把整个系统架构都建立在 prompt caching 之上。高的缓存命中率能降低成本，也帮助我们为订阅方案提供更宽裕的速率限制。因此，我们会针对 prompt cache hit rate（缓存命中率）设置告警，如果命中率过低，甚至会直接升级为 SEV（严重事故）。

以下是我们在大规模优化 prompt caching 过程中学到的（往往反直觉的）经验。

为缓存而设计提示词结构

![](https://pic3.zhimg.com/v2-96a98d1280135b4782aac82fb81e93d2_r.jpg)Claude Code 的提示词分为四个层级：系统指令和工具定义（全局级）、CLAUDE.md（项目根目录记忆文件）和记忆（项目级）、系统上下文（会话级）、以及对话本身的消息（动态级）。我们按照这个从「最静态」到「最动态」的顺序排列，并据此设置 `cache-control`。

但这种方式出奇地脆弱。我们曾经因为各种原因破坏过这个顺序，包括：在静态系统提示中嵌入了详细的时间戳、非确定性地打乱工具定义的顺序、以及更新工具参数（例如 Agent 工具可以调用哪些子代理）。

用消息来传递更新，而非修改提示词
有时，你放入提示词的信息会过时——比如时间变了，或者用户修改了文件。这时候你很自然地想去更新提示词，但这会导致缓存失效（cache miss），对用户来说可能非常昂贵。

不妨考虑在智能体的下一轮对话中，通过消息来传递这些信息。在 Claude Code 中，我们会在下一轮用户消息或工具结果中添加一个 `<system-reminder>` 标签，把更新后的信息喂给模型。这样做有助于保护缓存不被破坏。

不要在会话中途切换模型
Prompt cache 是模型专属的，这一点会让 prompt caching 的账算起来非常反直觉。

举个例子：如果你已经和 Opus 进行了 10 万 token 的对话，现在想提一个很容易回答的问题，你可能会觉得切换到 Haiku 更省钱。但实际上，这样做反而更贵——因为我们需要为 Haiku 重建整个 prompt cache。

如果你确实需要切换模型，最好的方式是使用**子代理（subagent）**。延续上面的例子：你可以部署一个子代理，让 Opus 先准备一份「交接消息」，把当前任务需要完成的事项交代给另一个模型。我们在 Claude Code 的 Explore 代理中经常这么做，它们使用的就是 Haiku。

绝不要在会话中途增减工具
在对话中途改变工具集，是人们破坏 prompt caching 最常见的方式之一。这种做法看起来合情合理——你只应该给模型它当下需要的工具。但正因为工具属于缓存前缀的一部分，增加或移除任何一个工具，都会导致整段对话的缓存全部失效。

用 Plan Mode 设计绕过缓存约束的功能
**Plan Mode（计划模式）** 就是一个围绕缓存约束设计功能的绝佳例子。直觉上的做法可能是：当用户进入计划模式时，把工具集替换成只读工具。但这会破坏缓存。

我们的做法是：**所有工具始终保留在请求中**，但把 `EnterPlanMode` 和 `ExitPlanMode` 本身也设计成工具。当用户开启计划模式时，代理会收到一条系统消息，告知它当前处于计划模式以及对应的指令：浏览代码库、不要编辑文件、计划完成后调用 `ExitPlanMode`。工具定义从头到尾从未改变。

这带来了一个额外的好处：因为 `EnterPlanMode` 是模型自己可以调用的工具，它能够在检测到难题时**自主进入计划模式**，无需任何外部指令，缓存也完好无损。

用「工具搜索」来延迟加载，而不是移除工具
同样的原则也适用于我们的**工具搜索工具**。Claude Code 可能加载了数十个 MCP 工具，如果每次请求都带上全部工具会很贵，但如果在对话中途移除它们又会破坏缓存。

我们的解决方案是 `defer_loading`（延迟加载）。我们不移除工具，而是发送轻量级的 stub（仅包含工具名称，并标记 `defer_loading: true`）。模型可以通过工具搜索在需要时「发现」这些工具，而完整的工具 schema 只在模型选中它之后才会加载。这样一来，缓存前缀始终保持稳定——因为相同的 stub 始终按相同的顺序存在。

你也可以通过我们的 API 直接使用**工具搜索工具**来简化这个过程。

在不破坏缓存的前提下压缩上下文（Compaction）

![](https://pic3.zhimg.com/v2-9b7399b4e5a0993abfe89ced6e74c5bc_r.jpg)当上下文窗口快要满时，Claude Code 会 fork 一个缓存过的调用来总结当前对话，然后用这个摘要替代原始消息继续对话。

**Compaction** 指的是当你耗尽上下文窗口时，对到目前为止的对话进行总结，然后用这个总结开启一个新的会话继续。

Compaction 与 prompt caching 的交互方式非常容易出错。要压缩一段对话，你必须把整段对话发给模型让它写摘要。最简单的做法是用一个全新的 API 调用：换上专门的系统提示（比如「请总结这段对话」）、不带任何工具——但这里正是成本陷阱所在。Prompt caching 只有在请求的前缀与已缓存内容**逐字节匹配**时才生效。你的主对话缓存基于一套系统提示和工具集；而总结调用使用了不同的系统提示、没有工具，前缀在第一个 token 处就分叉了，缓存完全无法复用。你不得不为整段对话支付全价的、未缓存的输入费率——而且对话越长（也就是你越想压缩的时候），这一笔调用的费用就越贵。

**解决方案：缓存安全的 Fork（cache-safe forking）**

我们在执行 compaction 时，使用与父对话**完全相同**的系统提示、用户上下文、系统上下文和工具定义。我们把父对话的消息历史前置，然后在末尾追加一条 compaction 指令作为新的用户消息。

从 API 的视角看，这个请求与父对话的上一轮请求几乎完全一致——相同的前缀、相同的工具、相同的历史——因此缓存前缀被完整复用。唯一新增的只是 compaction 提示本身。

当然，这意味着我们需要预留一个「compaction buffer」（压缩缓冲区），确保上下文窗口有足够的空间容纳 compaction 消息和摘要输出的 token。

Compaction 很棘手，但好消息是——基于我们在 Claude Code 上的这些经验，我们已经把 **compaction 直接内置到了 API 中**，你可以直接在自己的应用里复用这些模式，无需自己踩坑。

经验总结
以下是我们在构建智能体时发现的、对优化 prompt caching 非常有用的几条模式：

- 
**Prompt caching 是前缀匹配。** 前缀中任何位置的任何改动，都会导致其后所有缓存失效。你的整个系统都要围绕这一约束来设计。顺序对了，大部分缓存就能自动生效。
 
- 
**用消息来替代 system prompt 的修改。** 你可能很想通过编辑 system prompt 来实现进入计划模式、更新时间等操作，但实际上，把这些信息插入到对话消息中才是更好的做法。
 
- 
**不要在会话中途切换工具或模型。** 用工具来建模状态转换（比如计划模式），而不是去改变工具集。用延迟加载代替移除工具。
 
- 
**像监控可用性一样监控缓存命中率。** 我们对缓存中断设置告警，并视为事故处理。几个百分点的缓存未命中率，就会对成本和延迟产生巨大影响。
 
- 
**Fork 操作必须共享父会话的前缀。** 如果你需要运行旁路计算（compaction、摘要、skill execution），使用与父上下文完全一致的缓存安全参数，确保在父前缀上获得缓存命中。
 Claude Code 从第一天起就围绕 prompt caching 构建；如果你也想构建一个智能体，我们建议你也这么做。

(结束)

![](https://pic1.zhimg.com/v2-6f29f8455d5d42e03b0823155abac22a_r.jpg)