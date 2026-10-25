---
title: 探索 AI Agent 的认知架构及记忆的实现机制，AI Agent 如何更新其记忆以适应环境变化？
date: "2025-10-14 00:00:00"
updated: "2025-10-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/探索-AI-Agent-的认知架构及记忆的实现机制,AI-Agent-如何更新其记忆以适应环境变化/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/663077797/answer/1961431306731754778
---


青稞社区：[https://qingkeai.online](https://link.zhihu.com/?target=https%3A//qingkeai.online)

原文：[周四晚8点！一起来聊聊Agent Memory的实现路径](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/3tsruIuIaKOaQ2GhqywEuw)

![](https://picx.zhimg.com/v2-3d6b05dc1235475656261da336081daa_r.jpg?source=2c26e567)为了突破现有Agent记忆机制的瓶颈，新加坡国立大学的研究团队最新提出了MemGen框架。

论文：MemGen: Weaving Generative Latent Memory for Self-Evolving Agents
链接：https://arxiv.org/abs/2509.24704
代码：https://github.com/KANABOON1/MemGen

![](https://pic1.zhimg.com/v2-e915317126c2eb4a36260043b125f033_r.jpg?source=2c26e567)该框架引入了一种动态的、生成式的隐式记忆（Latent Memory）机制。MemGen的核心由记忆触发器（Memory Trigger）与记忆编织器（Memory Weaver)构成，二者协同作用，在推理时按需生成并整合与当前认知状态高度相关的隐式记忆。

![](https://picx.zhimg.com/v2-26b3aad9d28361017565ec234e0b20e9_r.jpg?source=2c26e567)在不对主模型进行任何任何微调的前提下，MemGen只将外部知识注入到外部记忆模块，并在解码时动态注入，所实现的性能最高超过全参数量微调的GRPO高达13.4%。

更多解读请阅读：[最新成果！Agent记忆的第三种可能：生成式隐式记忆](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/pqCPoUw0p2oTsnMUj9t2mw)

**10月16日（周四）晚8点**，青稞Talk 第81期，新加坡国立大学博士生张桂彬，将直播分享最新成果《**MemGen：生成式隐式记忆，Agent Memory 的第三种可能**》。

**分享嘉宾**
张桂彬是新加坡国立大学计算学院博士研究生，导师为颜水成教授，研究方向为Multi-Agent System，Agent Memory和Self-Evolving Agent，目前在NeurIPS、ICML、ICLR、KDD、TKDE等顶级会议/期刊发表论文十余篇。

他发表了Graph for Agent系列工作，包括G-Designer【ICML 2025 Oral】，G-Safeguard【ACL 2025】，以及G-Memory。其他工作如MaAS【ICML 2025 Oral】，AgentPrune【ICLR 2025】也受到关注。

**主题提纲**
MemGen：生成式隐式记忆，Agent Memory 的第三种可能

1、什么是 Agent Memory
2、现有 Agent Memory 范式的实现路径及局限
3、第三种可能：动态、生成式的记忆框架 MemGen
4、MemGen 的评估及 Agent Memory 未来探讨

**直播时间**
10月16日20:00 - 21:00

**如何观看**
Talk 将在青稞社区【视频号：**青稞AI**、Bilibili：**青稞AI**】上进行，欢迎预约！