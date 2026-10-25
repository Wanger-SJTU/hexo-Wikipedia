---
title: 检索增强生成（RAG）有什么好的优化方案？
date: "2023-12-11 00:00:00"
updated: "2023-12-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/检索增强生成(RAG)有什么好的优化方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/628651389/answer/3321989558
---


RAG优化分为两个方向：RAG基础功能优化、RAG架构优化。我们分别展开讨论。

一、RAG基础功能优化
对RAG的基础功能优化，我们要从RAG的流程入手[1]，可以在每个阶段做相应的场景优化。

![](https://pic1.zhimg.com/v2-1348c243eee5fbe59e890d56df8a5736_r.jpg?source=2c26e567)图1  RAG工作流程（with memory）从RAG的工作流程看，能优化的模块有：文档块切分、文本嵌入模型、提示工程优化、大模型迭代。下面针对每个模块分别做说明（备注：以下内容部分参考了 [@雪飘雨飞](https://www.zhihu.com/people/e5e6563f8942eed17eab7974934c0ea7) [@旺知识](https://www.zhihu.com/people/23244a8877ed6cac02968f2705f2f922) 先前的回答）。

- 文档块切分：设置适当的块间重叠、多粒度文档块切分、基于语义的文档切分、文档块摘要。
- 文本嵌入模型：基于新语料微调嵌入模型、动态表征。
- 提示工程优化：优化模板增加提示词约束、提示词改写。
- 大模型迭代：基于正反馈微调模型、量化感知训练、提供大context window的推理模型。此外，还可对query召回的文档块集合进行处理，比如：元数据过滤[7]、重排序减少文档块数量[2]。

二、RAG架构优化

2.1 Vector+KG RAG
经典的RAG架构中，context增强只用到了向量数据库。这种方法有一些缺点，比如无法获取长程关联知识[3]、信息密度低（尤其当LLM context window较小时不友好）。

![](https://pic1.zhimg.com/v2-aecd70f39f76eb31371f5796708e76c2_r.jpg?source=2c26e567)图2  跨chunk的关联知识向量库无法获取那此题是否可解？答案是肯定的。一个比较好的方案是增加一路与向量库平行的KG（知识图谱）上下文增强策略。其技术架构图大致如下[4]：

![](https://pic1.zhimg.com/v2-971de4e9e7562db93ba913111f0dfba5_r.jpg?source=2c26e567)图3  基于KG+VS进行上下文增强图3中query进行KG增强是通过NL2Cypher模块实现的。根据我的实践，我们可用更简单的图采样技术来进行KG上下文增强。具体流程是：根据query抽取实体，然后把实体作为种子节点对图进行采样（必要时，可把KG中节点和query中实体先向量化，通过向量相似度设置种子节点），然后把获取的子图转换成文本片段，从而达到上下文增强的效果。

 LangChain官网提供了一个通过Graph对RAG应用进行增强的DevOps的例子，感兴趣的读者可以详细研究[5]。

2.2 Self-RAG
经典的RAG架构中（包括KG进行上下文增强），对召回的上下文无差别地与query进行合并，然后访问大模型输出应答。但有时召回的上下文可能与query无关或者矛盾，此时就应舍弃这个上下文，尤其当大模型上下文窗口较小时非常必要（目前4k的窗口比较常见）。

那有解决办法吗？答案又是肯定的，一个较好的解决方案是Self-RAG技术。由于篇幅所限，此处介绍其推理过程，训练过程需要借助GPT4进行辅助打标，就不展开说了。详细过程可参考我对Self-RAG的总结[6]。

![](https://picx.zhimg.com/v2-2e448a93735ae307fb164a2e69851c04_r.jpg?source=2c26e567)图4  RAG vs Self-RAG如图4所示，右侧就是Self-RAG的工作流程。首先，根据query判断是否需要检索。如果需要，才检索若干passage，然后经一系列处理生成若干next segment候选。最后，对这些候选segment进行排序，生成最终的next segment。

Self-RAG的推理过程相对训练较简单，其算法内容如下：

![](https://picx.zhimg.com/v2-075507ea3604369c0309bf6b896c6fd0_r.jpg?source=2c26e567)图5  Self-RAG推理算法推理过程输入是：prompt 
![](https://www.zhihu.com/equation?tex=x)和前置生成 
![](https://www.zhihu.com/equation?tex=y_%7B%3Ct%7D)，输出是下一时间步的segment 
![](https://www.zhihu.com/equation?tex=y_t)。注意这里的生成任务是segment粒度，而不是token粒度，主要是出于计算性能方面的考量。

首先由语言模型M预测Retrieve token的值。如果为No，按标准语言模型范式由
![](https://www.zhihu.com/equation?tex=x+)生成 
![](https://www.zhihu.com/equation?tex=y_t)，当
![](https://www.zhihu.com/equation?tex=y)生成完成或到达
![](https://www.zhihu.com/equation?tex=y_T)时，再预测IsUSE token的值。如果Retrieve token为Yes的话，通过Retriever检索出若干个上下文，用D表示。针对每个上下文d，先预测IsREL token的值，以此表达上下文与prompt是否相关；同时生成下一时间步的segment 
![](https://www.zhihu.com/equation?tex=y_t%E3%80%82)然后预测上下文d对
![](https://www.zhihu.com/equation?tex=y_t)的支持程度，接着对每个d对应的输出
![](https://www.zhihu.com/equation?tex=y_t)进行排序挑选出最优者。最后等
![](https://www.zhihu.com/equation?tex=y)生成结束时，再预测IsUSE的值。

2.3 多向量检索器多模态RAG
本小节涉及三种工作模式[7]，具体为：

- 半结构化RAG（文本+表格）
- 多模态RAG（文本+表格+图片）
- 私有化多模态RAG（文本+表格+图片）1）半结构化RAG（文本+表格）

![](https://picx.zhimg.com/v2-9c020106e3110dc2766f8bc843d58e59_r.jpg?source=2c26e567)图6  半结构化RAG此模式要同时处理文本与表格数据。其核心流程梳理如下[8]：

- 将原始文档进行版面分析（基于Unstructured工具[9]），生成原始文本 和 原始表格。
- 原始文本和原始表格经summary LLM处理，生成文本summary和表格summary。
- 用同一个embedding模型把文本summary和表格summary向量化，并存入多向量检索器。
- 多向量检索器存入文本/表格embedding的同时，也会存入相应的summary和raw data。
- 用户query向量化后，用ANN检索召回raw text和raw table。
- 根据query+raw text+raw table构造完整prompt，访问LLM生成最终结果。2）多模态RAG（文本+表格+图片）

对多模态RAG而言，有三种技术路线[10]，见下图：

![](https://pica.zhimg.com/v2-24d258300a89b24e14d3f3cc1a644572_r.jpg?source=2c26e567)图7  多模态RAG如图7所示，对多模态RAG而言有三种技术路线，如下我们做个简要说明：

- 选项1：对文本和表格生成summary，然后应用多模态embedding模型把文本/表格summary、原始图片转化成embedding存入多向量检索器。对话时，根据query召回原始文本/表格/图像。然后将其喂给多模态LLM生成应答结果。
- 选项2：首先应用多模态大模型（GPT4-V、LLaVA、FUYU-8b）生成图片summary。然后对文本/表格/图片summary进行向量化存入多向量检索器中。当生成应答的多模态大模型不具备时，可根据query召回原始文本/表格+图片summary。
- 选项3：前置阶段同选项2相同。对话时，根据query召回原始文本/表格/图片。构造完整Prompt，访问多模态大模型生成应答结果。3）私有化多模态RAG（文本+表格+图片）

如果数据安全是重要考量，那就需要把RAG流水线进行本地部署。比如可用LLaVA-7b生成图片摘要，Chroma作为向量数据库，Nomic's GPT4All作为开源嵌入模型，多向量检索器，Ollama.ai中的LLaMA2-13b-chat用于生成应答[11]。

参考资料

- [Chatbots |  ️  Langchain](https://link.zhihu.com/?target=https%3A//python.langchain.com/docs/use_cases/chatbots)
- [Rerankers and Two-Stage Retrieval | Pinecone](https://link.zhihu.com/?target=https%3A//www.pinecone.io/learn/series/rag/rerankers/)
- [Custom Retriever combining KG Index and VectorStore Index](https://link.zhihu.com/?target=https%3A//docs.llamaindex.ai/en/stable/examples/index_structs/knowledge_graph/KnowledgeGraphIndex_vs_VectorStoreIndex_vs_CustomIndex_combined.html)
- [Enhanced QA Integrating Unstructured Knowledge Graph Using Neo4j and LangChain](https://link.zhihu.com/?target=https%3A//neo4j.com/developer-blog/unstructured-knowledge-graph-neo4j-langchain/)
- [https://blog.langchain.dev/using-a-knowledge-graph-to-implement-a-devops-rag-application/](https://link.zhihu.com/?target=https%3A//blog.langchain.dev/using-a-knowledge-graph-to-implement-a-devops-rag-application/)
- [AI pursuer：揭秘Self-RAG技术内幕](https://zhuanlan.zhihu.com/p/669030475)
- Multi-Vector Retriever for RAG on tables, text, and images：[Multi-Vector Retriever for RAG on tables, text, and images](https://link.zhihu.com/?target=https%3A//blog.langchain.dev/semi-structured-multi-modal-rag/)
- [https://github.com/langchain-ai/langchain/blob/master/cookbook/Semi_Structured_RAG.ipynb?ref=blog.langchain.dev](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain/blob/master/cookbook/Semi_Structured_RAG.ipynb%3Fref%3Dblog.langchain.dev)
- [Unstructured | The Unstructured Data ETL for Your LLM](https://link.zhihu.com/?target=https%3A//unstructured.io/%3Fref%3Dblog.langchain.dev)
- [https://github.com/langchain-ai/langchain/blob/master/cookbook/Semi_structured_and_multi_modal_RAG.ipynb?ref=blog.langchain.dev](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain/blob/master/cookbook/Semi_structured_and_multi_modal_RAG.ipynb%3Fref%3Dblog.langchain.dev)
- [https://github.com/langchain-ai/langchain/blob/master/cookbook/Semi_structured_multi_modal_RAG_LLaMA2.ipynb?ref=blog.langchain.dev](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain/blob/master/cookbook/Semi_structured_multi_modal_RAG_LLaMA2.ipynb%3Fref%3Dblog.langchain.dev)