---
title: "LangChain - Agent: 这次我们从最有趣的 LLMs 如何思考问题开始"
date: "2023-09-17 00:00:00"
updated: "2023-09-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/LangChain-Agent_-这次我们从最有趣的-LLMs-如何思考问题开始/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/655038870
---


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8901ccae354f.jpg)

图一：市面上主流的认知框架 LangChain 都做了支持认知框架，这词不小，既然已经在之前的介绍里面说了 LangChain Agents  是如何成为  LLMs  落地的当红方向，原理也大体提过了，这次我们就稍微深入一下  LangChain，看看这个「业界教科书」是怎样把当前  Agents 领域关于 LLM 认知框架的思考实现的。

LangChain 文档里面有一段关于  Chain  对象和  Agent 对象区别的说明，不仅解答了初学者关于二者不同的疑惑，也顺带手把这个方向的思路说清楚了：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cce7d022bc55.jpg)

图二：Agents 和 Chain 区别在于后者是人来决定执行逻辑，前者是大模型决定

- LLMs  的 Agents 思路，主要就是利用当前大模型超强的理解能力，了解清楚问题域和解决方案域之后，做出一系列的动作来解决问题
- Chain  对象和  Agent 对象的区别在于，Chain  是用户来思考问题并写好对应的  Chain  对象来解决问题；而  Agent  只是包装好解决方案域里面的工具，最终何时使用、如何使用是由大模型来决定的。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_eb9ab08ca844.jpg)

图三：一图对比 Agent 和 Chain 到这里我们搞清楚了为什么当下  Agent  方向这么火：

- 由于大模型本身的理解和生成能力已经达到或者部分超越了人，且不少大模型的已经通过不断增长的窗口能力获得了上下文记忆的能力
- 由于有了上面两个能力，使得大模型理解当前网络赛博空间的  APIs  和现实世界里面很多可控物理器件的使用成为了可能。
- 大模型一头理解了人类的意图，一头理解了网络空间和现实世界工具的使用，中间如何把意图拆解成大任务，再把大任务通过  map-reduce  的方式拆解成小任务最终收集结果合成大任务的执行结果？总得有这么个中间的桥梁或者胶水方案，这个方案就是  Agent
- 看到这里，现有的各种各样的企业解决方案里面是不是都可以用这种既简单效果又好的方案重新做一遍？此时此刻相信已经有非常多先知先觉的方案商已经默默撸起袖子干起来了，之所以还没有看到各行业应用的井喷，只是因为大家还没有开发完成，而已。
有了上面的铺垫，我们已经清楚了一点，<strong>只要是有 APIs  的工具，无论是网络上的还是现实世界里面的实体机器人，只要给大模型足够的「说明书」，大模型就可以把它纳入到解决方案工具箱，用来回答或者执行你用自然语言提出的问题  or  任务</strong>。如下图所示，前面文章里面提到的  RAG，其实也是 Agent  思路的一种：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2fa636d20bae.jpg)

图四：包括 RAG 在内，大模型在众多的应用场景下都可以发挥想象讲了这么多背景，接下来看一下到底如何让大模型在理解意图之后拆解任务并执行汇报结果的，也就是「认知框架」，Cognitive Architecture，老规矩上图：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a4de98cd601a.jpg)

图五：LangChain 里面内置的 Cognitive Architecture不要被表格吓到，说到底就是一条：<strong>给每个工具写好说明书，然后让大模型阅读理解，在然后通过「思考-执行-观察结果，再思考-执行-观察结果」这样的方式去解决问题</strong>。下图里面可以看到一个真实的  tool  长什么样，「ta」的说明书大体该怎么写：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d93dc4944401.jpg)

图六：一只真实的  tool  长什么样按照这个思路来看，其实对大部分的「应用层」开发者，也没有太大的必要去搞清楚什么是 CoT、什么是 ToT、GoT、AoT，只要记住不管什么方案，无论什么框架，最根本的是要把需要的工具说明书写好，至于最终的采用哪种认知框架并不重要，重要的是结果是否符合甚至超出预期。

补充一句，在图五的表格里面，不同的认知框架有些小差异，但  openai  的  functions-call  被高亮出来，原因是该方案跟其他不一样，一句话说明的话，类似 functions-call 这种是在 sft 的阶段就把如何调用各种  api  的技能内置进去，而其他方式是通过后面的  prompt  方式来外挂如何调用工具。<strong>前者是让大模型奔向 api，后者是让 api 奔向大模型</strong>，具体实施的时候各有利弊，这点可以自己琢磨一下，欢迎讨论。
