---
title: "如何评价华为盘古 5050 亿参数的 openPangu-2.0-Pro 模型及技术报告正式开源上线？"
date: "2026-08-01 00:00:00"
updated: "2026-08-01 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/如何评价华为盘古-5050-亿参数的-openPangu-2.0-Pro-模型及技术报告正式开源上线/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/2066567142019786000/answer/2066697831432320385"
---


盘古大模型，堂堂复活！

火速整理了一版华为 openPangu 2.0 技术报告解读与技术溯源。

完整 HTML/PDF 文档在 GitHub： [https://github.com/ACEEE-1222/technical-report-notes](https://link.zhihu.com/?target=https%3A//github.com/ACEEE-1222/technical-report-notes)

![](https://pic1.zhimg.com/v2-4fa71385f52063fbaa6309c9351d2e6a_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-fd8263b16c2208ab580b497f6cd90e9a_r.jpg?source=2c26e567)
![](https://pic1.zhimg.com/v2-e25d927d4cb5de94ffe71763ad8b08f5_r.jpg?source=2c26e567)这篇报告的信息量挺大：不仅介绍了 505B/18B active 的 Pro、92B/6B active 的 Flash，还包含一款 30B/2B active 的端侧模型。技术路线也覆盖得很完整，从 MLA、DSA–SWA 混合注意力、PAS、ModAttn、MoE、mHC、MTP、Muon，一直讲到 34.4T token 的预训练、后训练和昇腾推理系统

部署部分也是这篇报告很值得看的地方。我专门梳理了 Felix CP、W8A8、融合算子、MoE 通信、Omni Cache、多级缓存、异步调度和 LoPT，尽量把模型架构设计与在 Ascend 适配串在一起。

和前两篇一样，这次也做了技术溯源，并继续区分：

——报告明确采用、建立或扩展的技术

——结构或思想相近，但无法确认直接来源的工作

——仅作为横向比较、报告并未确认采用的系统

例如哪些设计明确来自 MLA、DSA、mHC、Muon，哪些只能说与 DeepSeekMoE、Mamba、Mooncake 等工作存在可比较之处，文中都会标明证据边界，尽量不把个人推测写成确定事实。

HTML 页面这次采用了华为红白配色，引用了很多报告原图。更推荐在线阅读版：带章节导航，论文、前序工作、模型配置和部署仓库都可以直接跳转；PDF 版则适合下载、收藏和离线阅读。

如果想系统了解 openPangu 2.0，或者对大模型在国产算力上的训练与部署优化感兴趣，可以从这份解读入手

觉得有帮助的话欢迎点个 Star，后续继续更新更多大厂技术报告解析和技术溯源。