---
title: 像LLM一样对齐Agents
date: "2024-06-12 00:00:00"
updated: "2024-06-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/像LLM一样对齐Agents/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/702517309
---


近日来自微软剑桥大学研究中心的研究者们发表了“Aligning Agents like LLMs”，在这个项目中，他们研究了如何通过遵循现代大型语言模型 (LLM) 对齐流程来训练代理（Agent），其中包括 Xbox 游戏《Bleeding Edge》上的无监督预训练、监督微调和基于人类反馈 (RLHF) 的强化学习。

论文地址：[https://arxiv.org/abs/2406.04208](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.04208)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_f4d097229e30.jpg)

项目介绍：[https://adamjelley.github.io/aligning-agents-like-llms/](https://link.zhihu.com/?target=https%3A//adamjelley.github.io/aligning-agents-like-llms/)

### 动机

通过模仿学习训练代理提供了一种可扩展的方法，可以通过高维视觉信息（像素）学习如何在复杂的 3D 环境中表现。然而，模仿代理在部署时并不总是能够执行所需的行为！

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_984501178c47.jpg)

> 一个 103M 参数的 GPT 风格的 Transformer Agent，在 1.12 年的《Bleeding Edge》人类游戏中通过模仿学习进行训练。并非所有模仿行为都是可取的！

请注意，视频并不代表典型的游戏玩法。

在这项工作中，作者考虑一个说明性示例，其中代理在具有三个跳跃垫（上述视频中的黄色坡道）的岛屿上生成。他们希望代理直接导航到左侧（或右侧）跳板。他们发现通用模仿学习代理有时会执行此行为，但并不可靠，并且超过 40% 的时间根本无法到达任何跳跃垫。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_20621c8faeae.jpg)

> 一般模仿学习代理jumppad成功率高。

作者将模仿学习代理的不良行为与不一致的LLM的无益反应进行类比。未对齐的LLM（仅通过无监督预训练进行训练）包含大量知识，但经常产生无用的响应，并且必须与后续的有监督预训练和来自人类反馈（RLHF）阶段的强化学习保持一致，以使其有用。类似地，虽然扩大模型和数据可以提供改进的游戏知识和通用性，但它无法让代理区分专家行为和新手行为（或者更一般地说，期望的行为和不期望的行为）。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ae6eab6f32c1.jpg)

> LLM 对齐的艺术插图。来源：[https://huyenchip.com/2023/05/02/rlhf](https://link.zhihu.com/?target=https%3A//huyenchip.com/2023/05/02/rlhf)

通过遵循现代 LLM 对齐流程，作者希望对齐他们的基础模仿模型，以可靠地执行所需的行为，并使其有用。更一般地说，这可能包括调整代理的能力，以获得不同的游戏风格或个性，或者只是为了实现更类似于人类的行为。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_15a918f6b477.jpg)

> 对齐提高了跨语言模型大小的感知有用性 (InstructGPT)。来源：[https://openai.com/index/instruction-following](https://link.zhihu.com/?target=https%3A//openai.com/index/instruction-following)

### 监督微调

首先在直接前往跳跃垫的策划轨迹上微调基础模仿代理。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_c8ba3fe44755.jpg)

> Agent前往左、中、右跳板的演示轨迹。

作者发现经过微调的代理到达所有三个跳跃垫的成功率有所提高。然而，智能体仍然没有对特定跳板的偏好，并且以大致均匀的比例到达所有三个跳板（正如训练数据所预期的那样）。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3d4ea3bb1ab9.jpg)

> 微调模仿学习代理跳板的成功率。

虽然这些演示轨迹可以成功地用于微调代理，但作者发现在这些有限的轨迹上从头开始训练代理的效果并不好。例如，预训练使智能体在超出微调轨迹的分布时更加稳健，因为智能体从预训练中获得了有关如何返回所需轨迹分布的附加信息。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_05ad530c2f06.jpg)

> 一般预训练的智能体（左）比仅经过微调的智能体（右）对分布外的鲁棒性更强。这个简单的示例演示了将大规模数据与无监督预训练相结合的好处。

### 偏好建模

仍然遵循 LLM 对齐流程，作者现在训练一个奖励模型来捕获他们对微调代理行为的偏好。使用综合偏好来研究性能如何随偏好标签（人类标签时间的代理）而变化。作者发现，使用预先训练的代理初始化奖励模型使奖励模型能够更准确地捕获他们的偏好，从而以相对较少的偏好标签实现强大的性能。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_6c604bfc5c39.jpg)

> 奖励模型测试表现。

### 与强化学习的结合（综合 RLHF）

现在，作者可以使用奖励模型通过强化学习进一步微调代理，从而使代理与他们的偏好保持一致。作者发现，通过对标有最大奖励的轨迹进行首次微调，能够显着提高对齐效率。这类似于为 LLM 对齐引入的强化自我训练 (ReST)（Gulcehre 等人，2023） 。作者将这种额外的对齐步骤称为*偏好微调*。

通过这种改进的对齐程序，能够在有限的计算预算内可靠地对齐代理，以到达左侧和右侧的跳板。

### 左跳板对齐

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d99ac1ea3b64.jpg)

> 特工已对齐以始终到达左侧跳板。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_1d56c4c59345.jpg)

> 左对齐特工跳板成功率。

### 右跳板对齐

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_f1e389e901b0.jpg)

> 或者，特工可以对齐以始终到达右侧跳板。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_74f67e0b69b1.jpg)

> 右对齐特工跳板成功率。

### 对齐总结

下面显示了对齐过程的摘要以及每个对齐阶段的代理轨迹热图。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7eaa5723ed7e.jpg)

> 调整代理的程序概述。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_abc22581579e.jpg)

> 代理在每个对齐阶段的轨迹热图。

### 结论

论文证明了现代LLM训练程序可用于可靠地调整代理以在复杂环境中执行所需的行为。仅靠任何一个阶段的训练都很难实现这些行为。本文的分析表明，当前LLM训练程序中的许多最新发展也可以应用，并且对培训代理具有类似的好处。