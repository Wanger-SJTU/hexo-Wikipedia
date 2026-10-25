---
title: 检索增强RAG中有哪些好用的Chunk切分方法？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-10/检索增强RAG中有哪些好用的Chunk切分方法-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 4cd114bf-8af1-40f2-9b21-568dbc320a1f
---

# 检索增强RAG中有哪些好用的Chunk切分方法？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-chunk-18ec5b6b86c)
[Read Original](https://www.zhihu.com/question/650635197/answer/3460530301)



[![](https://proxy-prod.omnivore-image-cache.app/0x0,sj2-9G7OozPX6cteo8pg6LYFUgkOcgxSfhuSQ6A4Owsw/https://pic1.zhimg.com/v2-92176dfd4ccf50aa6b0909cdf447d03d_l.jpg?source=1def8aca)Wayne Y](https://www.zhihu.com/people/runwean-67)

[LLM](https://www.zhihu.com/topic/20660508)

[rag](https://www.zhihu.com/topic/28698063)

[检索增强生成](https://www.zhihu.com/topic/28779274)

有哪些切分chunk的好逻辑及方法呢？显示全部 ​

关注者

**57**

被浏览

**2,998**

创建时间：2024-03-29 00:03:07

最后编辑：2024-03-29 00:03:07

已关注​写回答

​邀请回答

​好问题 1

​添加评论

​分享

​修改问题

​

[![ketchum](https://proxy-prod.omnivore-image-cache.app/0x0,s2TdoPyDQ7iwP5o1ThDcIHI6mIRlkrrCi9x75oNHKBFQ/https://pic1.zhimg.com/v2-febb4f5d889fde58e51c8a7ca1f20a97_l.jpg?source=2c26e567)](https://www.zhihu.com/people/ketchum-23)

[ketchum](https://www.zhihu.com/people/ketchum-23)

[​](https://www.zhihu.com/question/48510028)

信息技术行业 从业人员

​ 关注

1 人赞同了该回答

[发布于 2024-04-10 08:40](https://www.zhihu.com/question/650635197/answer/3460530301)・IP 属地上海

开源RAGflow引擎：打造无幻觉、高精度的文档理解与生成体验

RAGflow，这个新兴的开源RAG（Retrieval-Augmented Generation）引擎，正以其独特的深度文档理解能力，为大型语言模型的应用带来了革命性的变革。在处理PDF文件时，我们经常面临提取干净数据的挑战，而RAGflow的出现，恰恰解决了这一问题，它能够提供准确无误且无幻觉的生成结果。

github地址：[GitHub - infiniflow/ragflow: RAGFlow is an open-source RAG (Retrieval-Augmented Generation) engine based on deep document understanding.](https://github.com/infiniflow/ragflow?tab=readme-ov-file)

![](https://proxy-prod.omnivore-image-cache.app/1870x954,sBpWc4ej0HQBJtxjehnr3DqRwnUwbPW9aVBa9Cwpq6TE/https://pic1.zhimg.com/50/v2-b01a816391b2885d47220935a82f8d3c_720w.jpg?source=2c26e567)

RAGflow的核心在于其检索增强型生成算法，这一算法不仅提升了生成内容的准确性，还增强了语言模型生成结果的可靠性。简单来说，RAGflow拥有一个深入的知识检索系统，当提供上下文信息时，它能够高效地处理非结构化或大量数据，并基于所提供的知识，智能生成准确、合理的内容。

![](https://proxy-prod.omnivore-image-cache.app/7680x4320,sYNtIRc9gbxq3Bxc9GhcH5hiqyzjHdzyYaScygCGBT58/https://picx.zhimg.com/50/v2-dd833188eeaebeeab03001f460dbd674_720w.jpg?source=2c26e567)

RAGflow的另一个亮点是其数据提取的进步。它不仅对我们来说非常有价值，而且这只是开始。我们将探索如何开始使用RAGflow，并深入了解其更多功能。例如，RAGflow具有高质量输入和输出的特点，这意味着它内部有一个基于深度文档理解的知识提取系统，能够从复杂格式的非结构化数据中提取知识，确保高质量的结果输出。

此外，RAGflow还提供基于模板的数据分块方法，使用户能够通过多种模板灵活、可定制地分块数据。它还兼容各种数据格式，包括Word文件、幻灯片、Excel、文本、图像、扫描副本、结构化数据以及网页，显示出RAGflow的多功能性和与各种数据源的无缝集成能力。

为了减少生成文本中的幻觉现象，RAGflow还提供了基于引用的定位功能，允许用户在必要时进行文本分块的可视化和人工干预。最后，RAGflow的自动化和无缝的RAG工作流程，使其能够满足个人和大型企业的需求，提供可配置的大型语言模型，并允许与嵌入模型一起工作，具有多重回忆能力、拒绝重排以及直观的API，方便集成到任何现有工作流程中。

![](https://proxy-prod.omnivore-image-cache.app/1304x930,s2OCChEFef_T2xtqhk9gjHXRY14RmnkzD1n14fCv_I1Q/https://pic1.zhimg.com/50/v2-e09fe841008fb42f6d74e84b4b36852b_720w.jpg?source=2c26e567)

总的来说，RAGflow是一个强大的工具，它不仅能够提供准确的数据提取和生成，还能够确保生成内容的可靠性和准确性。对于那些希望从文件或PDF中获取最佳潜力的个人和企业来说，RAGflow无疑是一个值得尝试的解决方案。

[发布于 2024-04-10 08:40](https://www.zhihu.com/question/650635197/answer/3460530301)・IP 属地上海

​赞同 1​​添加评论

​分享

​收藏​喜欢

​

收起​

[![吕阿华](https://proxy-prod.omnivore-image-cache.app/0x0,sRHrVQnRBuATzUjCSyj8z8T27FHVztHCsJmrXgMv_mAM/https://pic1.zhimg.com/v2-29cf06ed797ec398180c3f3bdb6c9e36_l.jpg?source=1def8aca)](https://www.zhihu.com/people/luyunhua)

[吕阿华](https://www.zhihu.com/people/luyunhua)

[​](https://www.zhihu.com/question/48510028)

浙江大学 计算机硕士

​ 关注

[发布于 2024-03-31 15:53](https://www.zhihu.com/question/650635197/answer/3449808067)

17 人赞同了该回答

分块(chunking)是将大文本分解成更小片段的过程。这是一种基本技术，使用LLM进行内容嵌入有助于优化从[向量数据库](https://www.pinecone.io/learn/vector-database/)中检索的内容的相关性。**分块的目的主要是为了确保在内容向量化时尽可能减少噪声，同时保持语义相关性。**例如，在**语义搜索(semantic search)**中为一个包含特定主题信息的文档语料库建立索引。可以通过应用有效的分块策略，确保搜索结果准确捕捉用户查询的真实意图。如果分块太小或太大，可能导致搜索结果不精确或错过表面相关内容。作为经验之谈，如果文本块在没有周围上下文的情况下对人类来说可读可理解，它对语言模型也同样有意义。因此，找到语料库中文档的最佳块大小对于确保搜索结果的准确性和相关性至关重要。

另一个例子是**对话智能体(conversational agents)**在使用向量块来构建基于知识库的对话智能体上下文的情况下，选择正确的分块策略很重要，原因有二：首先，它将决定上下文是否真正与用户的prompt相关。其次，它将决定是否能够在将检索到的文本发送给外部模型供应商（例如，OpenAI）之前，在满足token数量的限制的前提下将检索到的文本放入上下文语境中。**在使用具有32k上下文窗口的GPT-4时，除了分块实在过大的极端情况，大部分分块策略都能满足需求**。

分块内容在大多数情况下相对简单，但在特定情况下可能存在挑战。没有通用的分块解决方案，因此需要根据具体用例选择合适的方法。

《LLM应用中的分块策略》一文介绍了几种有效的chunking方案，章节如下：

* 长短不一的内容向量化
* 分块考虑因素
* 分块方法
* 固定大小分块
* 内容感知分块
* 确定适用于应用的最佳块大小

## 原文地址

[吕阿华：《LLM应用中的分块策略》精华摘译13 赞同 · 2 评论文章![](https://proxy-prod.omnivore-image-cache.app/0x0,sHmup0wbB3d_b4U2eNsNu2e0G8VxJdkGor9do8R7h7S0/https://pic4.zhimg.com/v2-164d0e1afeb077c0fa20ece84d0ed753_180x120.jpg)](https://zhuanlan.zhihu.com/p/675474411)

## 相关阅读

[吕阿华：学习检索增强生成(RAG)技术，看这篇就够了——热门RAG文章摘译(9篇)98 赞同 · 7 评论文章![](https://proxy-prod.omnivore-image-cache.app/0x0,s2hzL3nDl2wLku8nSP1Dw5dl-2xLcUE3DUXmp-uBqWyQ/https://pic1.zhimg.com/v2-f67e136fa97c18a685f05bf1971640e4_180x120.jpg)](https://zhuanlan.zhihu.com/p/673392898)

[发布于 2024-03-31 15:53](https://www.zhihu.com/question/650635197/answer/3449808067)

​赞同 17​​添加评论

​分享

​收藏​喜欢

​

收起​

[![Alston](https://proxy-prod.omnivore-image-cache.app/0x0,sW-i_Elj_9uglVCrtkviLuvgs0Vmd-jTZ5dwG-IaYYsE/https://picx.zhimg.com/v2-45c629da4ed97672478025d5b3dccd9c_l.jpg?source=1def8aca)](https://www.zhihu.com/people/alston-54)

[Alston](https://www.zhihu.com/people/alston-54)

喜欢在等实验的时候摸鱼: )

​ 关注

[发布于 2024-04-07 14:51 ，编辑于 2024-04-09 10:47](https://www.zhihu.com/question/650635197/answer/3457305336)

**可以参考：**

一个比较意识流的指引：  
<https://www.pinecone.io/learn/chunking-strategies/>

怎么确定一个合适的分块大小：

[Evaluating the Ideal Chunk Size for a RAG System using LlamaIndex](https://blog.llamaindex.ai/evaluating-the-ideal-chunk-size-for-a-rag-system-using-llamaindex-6207e5d3fec5)

多种分块方法实践：

[RetrievalTutorials/tutorials/LevelsOfTextSplitting/5\_Levels\_Of\_Text\_Splitting.ipynb at main · FullStackRetrieval-com/RetrievalTutorials](https://github.com/FullStackRetrieval-com/RetrievalTutorials/blob/main/tutorials/LevelsOfTextSplitting/5%5FLevels%5FOf%5FText%5FSplitting.ipynb)

[How to Chunk Text Data — A Comparative Analysis](https://towardsdatascience.com/how-to-chunk-text-data-a-comparative-analysis-3858c4a0997a)

[发布于 2024-04-07 14:51 ，编辑于 2024-04-09 10:47](https://www.zhihu.com/question/650635197/answer/3457305336)

​赞同 21​​添加评论

![微信二维码](https://proxy-prod.omnivore-image-cache.app/0x0,s7A8gf0WY2LYAcjg_TBPNFRFgrRjUJhGntgjWzM0Ro2I/https://www.zhihu.com/qrcode?url=https%3A%2F%2Fwww.zhihu.com%2Fanswer%2F3457305336%23showWechatShareTip)​分享

​收藏​喜欢

​

