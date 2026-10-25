---
title: From RAG to Devv
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/LLM/From-RAG-to-Devv/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


![Pasted image 20240313215833.png](/images/collections/assets/Pasted%20image%2020240313215833.png)

一个最小的 RAG 系统就是由 3 个部分组成的： 
1. 语言模型 
2. 模型所需要的外部知识集合（以 vector 的形式存储） 
3. 当前场景下需要的外部知识

## 语言模型 
为什么 2020 年的这篇论文直到今年才火起来？一个主要的原因就是之前的基座模型能力不够。 如果底层模型很笨，那么即使给到了 丰富的外部知识，模型也不能基于这些知识进行推演。 从论文的一些 benchmark 上也可以看出效果有提升，但是并没有特别显著。
![Pasted image 20240313220850.png](/images/collections/assets/Pasted%20image%2020240313220850.png)
## 模型所需要的外部知识集合 

现在应该大家都了解了 embedding 模型了，包括 embedding 数据的召回。 embedding 本质上就是把数据转化为向量，然后通过余弦相似度来找到最匹配的两个或多个向量。 knowledge -> chunks -> vector user query -> vector

![Pasted image 20240313220934.png](/images/collections/assets/Pasted%20image%2020240313220934.png)
### 这个模块分成两个部分： 
1. embedding 模型 
2. 存储 embedding vector 的数据库 

前者基本上都使用 OpenAI 的 embedding 模型，后者可选方案非常多，包括 Pinecone，国内团队的 Zilliz，开源的 Chroma，在关系型数据库上构建的 pgvector 等。

 但是从第一性原理思考，模块 2 个目的是为了存储外部的知识集合，并在需要的时候进行召回。 这一步并不一定需要 embedding 模型，传统的搜索匹配在某些场景下可能效果更好（Elasticsearch）。

> <strong>RAG 的核心在 R 不在 G</strong>,  
> 基于此来看，是不是召回的准确度对LLM影响是什么？需要精排吗？

[http://devv.ai](https://t.co/AgfDhVEASK) 采用的方式是 <strong>embedding + 传统的 relation db + Elasticsearch</strong>。 并在每个场景下都做了很多优化，<strong>一个思路是在 encoding knowledge 的时候做的工作越多，在 retrieve 的时候就能够更快 & 更准确</strong>（先做工 & 后做工的区别）。


使用 Rust 构建了整套 knowledge index 包括： 
- GitHub 代码数据 
- 开发文档数据 
- 搜索引擎数据

## 更好地召回当前场景下需要的外部知识 

根据优先做工的法则，我们在 encoding 的时候对于原始的 knowledge 数据做了很多处理：
- 对代码进行程序分析 
- 对开发文档进行<strong>逻辑级别</strong>的 chunk 分块 
- 对网页 <strong>信息提取 & page ranking 优化</strong>

做完了上面的工作之后保证了<strong>我们在 retrieve 的时候获取到的数据本身就是结构化</strong>的了，不需要做太多的处理，而且可以提升召回的准确率。

每一步骤都没有最佳实践，例如 embedding chunk size，是否需要接搜索引擎，都需要根据实际的业务场景来多试。 相关的论文非常多，但是并不是每篇论文里面提到的方法都是有用的。

https://a16z.com/emerging-architectures-for-llm-applications/

![Pasted image 20240313221609.png](/images/collections/assets/Pasted%20image%2020240313221609.png)





![Pasted image 20240313215246.png](/images/collections/assets/Pasted%20image%2020240313215246.png)


- <strong>RAG 的核心在 R 不在 G</strong>
- <strong>Agent 中 action 的memory 核心也不在于R，在于 context preserve</strong>，这个应该是一个条件概率生成。（promts 在头尾的影响）
- 

