---
title: "小明许愿编程法：花一万美金烧香，然后怪AI菩萨不灵"
date: "2026-02-19 00:00:00"
updated: "2026-02-19 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AgentCLI/小明许愿编程法-花一万美金烧香,然后怪AI菩萨不灵/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2007656505554511663"
---


知乎上小明同学写了一篇[《Vibe Coding一年实践后的冷思考》](https://zhuanlan.zhihu.com/p/2003390589538956495)，自称花了一万美金token，用遍opus4.6、codex-5.3-xhigh、gemini3-pro等地球最强模型，得出结论：AI coding不行，要用Rust和Haskell，要给红黑树加形式化验证来"上强度学CS"。

一万美金。我重复一遍，一万美金。这位同学烧掉了50个月的Claude Max订阅费，最后开出的药方是回去学Haskell。

小明同学怎么用AI的呢？给agent交代任务就一句话"为当前Kotlin项目集成GCP Transcoding服务"，agent选了手动实现RESTful而不是包装Java SDK，他怪agent蠢。

测试呢？他自己说了："现在的test cases也是AI vibe出来的，agent又当裁判又当运动员，它说什么就是什么。"**Code review呢？他也说了："大部分时候review的是code style，作者讲一下设计思路，我们也就是大概一听就过了。"

上下文管理呢？"当前上下文越长，智力下降越明显。"

从头到尾，没有任务拆分，没有独立验证，没有角色分工，没有上下文管理。

我管小明同学这种做法叫"许愿编程法"。他们买一万美金一注的头香，虔诚的告诉菩萨自己想要娶扎热依，然后闭眼等奇迹发生，发现扎热依没有来求婚，就恨菩萨不灵，到处骂和尚是骗子。

许愿的人都这样。

### 许愿和工程的区别

Google Chrome团队的Addy Osmani专门区分了vibe coding和agentic engineering。前者的流程是：prompt，accept，run，看看能不能用。后者的流程是：plan，direct，review，test。小明同学的每一个失败案例，都精准的落在前者。

Osmani说得很直白：

The single biggest differentiator between agentic engineering and vibe coding is testing.测试。就这么简单。小明同学花了一万美金，测试是agent自己vibe出来的，"它说什么就是什么"。这不叫工程，这叫占卜。

### 一句话需求

小明给agent的任务是"为当前Kotlin项目集成GCP Transcoding服务"。agent通读文档，发现只有Java SDK，于是决定用ktor-client手动实现RESTful接口。小明说人类一眼就知道该包装SDK，"半天到一天就能上线"。

问题在哪？你一眼就知道，agent不知道。因为你没告诉它。你给一个新来的985毕业生说"把这个功能做了"，他也会自己选技术路线。你想让他包装SDK，你得说"封装现有Java SDK"。六个字，省你一万美金。

小明把这个案例当作agent能力不足的证据。恰恰相反，这恰恰证明agent很听话：你说集成，它就集成；你说封装，它就封装。你什么都不说，它只能猜。

### 又当裁判又当运动员

小明抱怨agent"写了几千行getter/setter的test case，最后测试全绿告诉我可以上生产环境发布了"。他还举了GCP Transcoding的例子："agent写错了可选字段的字段名，测试照样能过，因为测试也是它自己写的，错的一致就是'对'的。"

这个问题，软件工程界在二十年前就解决了，叫TDD。先写测试，再写代码。写测试的人和写代码的人分开。小明让同一个agent既写代码又写测试，相当于让同一个人既出卷又答题，然后惊讶的发现他每次都考满分。

我的实践是13个agents加7个skills的团队结构，tester和coder是独立角色。6996行代码，外部review只发现两个问题，还都是我自己手动干涉的结果。AI自己写的部分反而没问题。

Osmani说得更狠：

If your ability to 'read' doesn't scale at the same rate as the agent's ability to 'output,' you aren't engineering anymore — you're rubber stamping.小明连rubber stamp都算不上。他连盖章的对象都没看。

### "巧克力味的屎"

小明对AI代码的评价很生动："经常会被这第一层假象蒙蔽，放松警惕。主要是这个屎山有点难在review阶段发现，经常是上线后出了问题，回头细查的时候才发现是'巧克力味的屎'。"

他的诊断是AI代码风格好但质量差，以前靠code style判断质量的方法失效了。

这个诊断本身就是问题。以前靠code style判断质量，这种review本来就是烂的，只是以前侥幸管用而已。人类程序员碰巧style和质量正相关，AI打破了这个巧合，暴露了review流程本身的缺陷。

小明的CNC类比也很有意思。他说软件不像物理工件，"没法拿卡尺量一下这段代码的质量公差是多少"。实际上，软件的验证工具比物理制造丰富得多：单元测试、集成测试、属性测试、模糊测试、静态分析、类型检查、运行时监控、灰度发布。CNC操作员如果只量一次也会出废品。小明的问题不是没有卡尺，是他根本不会用，科班基础太差了。

### 初见即巅峰

小明观察到agent"初见即巅峰"：新项目惊艳，老项目拉垮。原因他自己也说了，上下文越长，agent越蠢。

这个现象有研究支撑。Chroma对18个LLM做了测试，发现模型对长上下文的注意力不均匀，到某个阈值后性能突然崩溃，有效容量通常只有标称最大值的60-70%。

小明知道这个现象，但他的应对是抱怨。他写了claude.md和agents.md，但显然没有做session拆分、任务边界控制、上下文清理。**在我们Agent管理学论坛社区，如果你触发了Claude Code的自动压缩，你基本就是个菜鸟。

你不会让一个人连续工作72小时然后怪他犯错。agent也一样。

### 强类型不是答案

小明的核心药方是强类型语言。他推荐Rust、Scala、Haskell，甚至建议给红黑树加形式化验证来"上强度"。

强类型能抓类型错误，但类型错误只是代码质量问题的一小部分。业务逻辑错了，类型系统不管。安全漏洞，类型系统不管。性能瓶颈，类型系统不管。架构决策失误，类型系统更不管。小明自己也承认"强类型能解决一部分问题，但不是全部"，然后还是把它当核心药方推荐给读者。

给红黑树加形式化验证来"上强度学CS"，就像让一个不会炒菜的人去研究分子料理。你连基本的TDD都不会，研究液氮冰淇淋有什么用？先学会把鸡蛋炒熟再说。

### 不许愿，该怎么办？

把AI coding当工程管理，而不是当魔法。**Addy Osmani、Martin Fowler、Agentic Coding Handbook，所有严肃的从业者都指向同一个方向：把AI当工程问题管理，plan、direct、review、test，而不是prompt、accept、pray。

小明的问题，归根结底是管理缺位。他把agent当成一个无所不能的黑盒，扔进去一个需求，等着出来一个成品。工程师的工作是拆解、组织、验证、迭代，从来都不是许愿。

我以前写过，软件行业可以从土木工程学很多东西。盖一栋楼，有甲方、设计院、施工队、监理，四方各司其职，互相制约。没有哪个包工头敢自己画图、自己施工、自己验收，然后告诉业主"放心住进去吧"。小明让同一个agent干所有事情，就是这个包工头。

AI时代，程序员需要培养的核心能力不是写更多代码，也不是学Haskell，而是管理能力。管理agent就像管理团队：你得会拆任务、分角色、定流程、建质量关卡。这些能力以前叫tech lead，现在叫AI coding的基本功。

许愿不灵的时候，答案不是换一个更贵的神灯，是停止许愿，开始工程化管理。

有兴趣讨论AI coding工程化的同好，欢迎在公众号给我留言。骂我也行，但请附上你的工程实践，不要只附上你的token账单。

### 写作也可以工程化

顺便说一句，本文是我用AI写的，但是95%的读者不会发现低劣的AI味道，因为我有一整套写作流程，模版，角色，质量关卡，非常工程化的写作。

### 引用来源

- 小明，《Vibe Coding一年实践后的冷思考》，知乎
[https://zhuanlan.zhihu.com/p/2003390589538956495](https://zhuanlan.zhihu.com/p/2003390589538956495)
- Addy Osmani, "Agentic Engineering"
https://addyosmani.com/blog/agentic-engineering/
- Addy Osmani, "The 80% Problem in Agentic Coding"
https://addyo.substack.com/p/the-80-problem-in-agentic-coding
- METR, "Early 2025 AI-Experienced OS Dev Study"
https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
- Chroma Research, "Context Rot"
https://research.trychroma.com/context-rot
- CodeRabbit, "State of AI vs Human Code Generation Report"
https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report
- Martin Fowler, "Context Engineering for Coding Agents"
https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html
