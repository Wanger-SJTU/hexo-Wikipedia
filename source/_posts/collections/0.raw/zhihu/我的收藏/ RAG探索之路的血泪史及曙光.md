---
title: (1 条消息) RAG探索之路的血泪史及曙光
date: "2023-11-10 00:00:00"
updated: "2023-11-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/RAG探索之路的血泪史及曙光/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/664921095
---


2023.11.02，受 @腾讯技术工程

 邀请做线上直播，聊了一下在实际业务落地 RAG 过程中，走过的弯路和经验。核心内容是：基于 embedding search的 RAG 方法在实际应用中存在诸多短板，本视频举出大量实际案例说明这些缺陷，并提出了多种行之有效的解决方案。

#### 分享大纲

- 广告词引发的“血案”：5 分钟搭建问答系统

- 大模型时代催生了：问答系统的重构
- 在传统问答模型的基础上，LLM 带来了哪些新的价值，新的影响
- 通用大模型在垂直领域的局限，进而介绍 RAG 的能力

- Embedding 召回方案及局限性分析

- 朴素的 RAG 实现，通过向量召回的诸多局限，比如：不精确、粒度粗、不支持条件查询/统计、不能替代信息提取等。
- 使用 LLM 做信息提取的几种方案和弊端。

- 意图识别优化：传统NLP不是“破落户”

- 基于词性标注和成分句法分析（Constituency Parsing、CON），解决并列关系的多实体、多条件提取问题。
- 意图识别的重要性
- 意图识别涉及的意图分类和槽位填充的解决方案。涉及：rule-based 、 BERT fine-tuning，DIET 等。
- 上下文补全的解决方案
- 复杂多轮对话中，如何与用户交互直到其补全所有信息。

- 检索优化：从向量到关系

- 知识库召回其实不仅仅是 vector store，还可以使用关系型数据库和图数据库
- vector store 使用 embedding 召回的上下文补全解决方案
- 关系型数据的查询方案：小型数据基于 pandas dataframe，大型数据基于 sql
- 图数据库应用：主要解决多度关系和推荐问题。

- 未来也许是 AI Agent？

- 提出我们当前 AI Agent 的涉及思想
- 简单示例

#### 内容摘要

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_da6d9e24711d.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d28135fa5d84.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2d80e87cc7ee.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_4d82af64d521.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_27033e707932.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9df27c5e4b5d.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_8650e5693793.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3ae66029f4a8.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9ef0ecbc1a8a.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_204d85b40684.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_4c820aed93b4.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5cb9ecd6f29d.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ef999c950f27.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7e7b19da1dc7.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a91e8c343078.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_50aad2d42c00.jpg)

#### 完整视频

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2b6370614d93.jpg)126:48

RAG 探索之路的血泪史及曙光

也可以关注 @腾讯技术工程

 后续释放的相关内容。
