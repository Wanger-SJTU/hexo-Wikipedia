---
title: "模型的agentic能力越强，除了做工程上的异常兜底外，harness还有哪些可以深入的地方？"
date: 2026-07-27
tags: [知乎]
source: https://www.zhihu.com/question/2063218151018518325/answer/2064984156581389572

---

可以看一下 [https://github.com/entropy-cloud/attractor-guided-engineering-template](https://link.zhihu.com/?target=https%3A//github.com/entropy-cloud/attractor-guided-engineering-template)

吸引子引导工程将Agent在仓库之上自主运行看作是一个动力系统问题，它强调的不是边界和护栏，而是引入新的概念体系：状态空间 -> 吸引子 -> 轨迹 -> 收敛。目前vibe coding长期操作后很容易产生屎山代码，甚至有人提出不应该用最强的模型去写代码，因为最强的模型写的代码它自己可能是无法调试的。这反映出AI编程中单元测试再多，可能也只是强制硬把错误趋势掰回来的结果，并不能保证系统内在逻辑和结构的一致性、稳定性。

吸引子引导工程则是充分利用领域内的知识，结合明确的结构规划（规范性文档和时效性文档分离），建立一个有利于agent自主运行时逐步收敛的拓扑地形。

参见

[从 Spec-Driven Development 到 Attractor-Guided Engineering](https://zhuanlan.zhihu.com/p/2040561935905776369)[Attractor Before Harness: AI 大规模开发的方法论](https://zhuanlan.zhihu.com/p/2040878707594770053)[吸引子引导与轨迹挖掘：AI Native Engineering 的收敛机制](https://zhuanlan.zhihu.com/p/2047333394128843580)