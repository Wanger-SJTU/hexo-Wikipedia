---
title: "RAG知识库优化之Rerank应用 - AiFly - 博客园"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-04-15/RAG知识库优化之Rerank应用-AiFly-博客园/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: e73dcc67-8164-4272-afed-448f7ff1d6c9
---

# RAG知识库优化之Rerank应用 - AiFly - 博客园
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-rerank-ai-fly-18ee0e7aef2)
[Read Original](https://www.cnblogs.com/softlin/p/18134322)



 前面几篇文章介绍了最基本的<strong>RAG</strong>实现，也了解了RAG的基本原理。最基本的RAG 流程为用户Query问题，RAG应用在向量库查询出Context，然后将Query与 Context喂到LLM，LLM生成满足Query的Response答案。  
 从这里可以存在三元组： <strong>Query、Context 和 Response</strong>，如要想进一步提升RAG的性能还可在Context(上下文)上做文章，目前得到的Context很可能与Query(问题)之间的相关度不高，通过<strong>Rerank</strong>可以对Context进行评分排序，去掉分数较低相关度较低的数据从而避免其对上下文信息的污染。下图为基本的RAG流程图；

![](https://proxy-prod.omnivore-image-cache.app/0x0,sqLHWw3JVs1Oq7XUJRhkCYMmYBAvU15GeMZXgmUIwbOg/https://img2024.cnblogs.com/blog/84976/202404/84976-20240414164104680-203925307.png)

 在未引入Rerank时可以看到从向量库中得到的上下文中包含了大量的问题相关度较低的信息，造成不相干信息对上下文的干扰。下图为未进行重排时的上下文；

![](https://proxy-prod.omnivore-image-cache.app/0x0,sDoStSRpVCc0vnoOxrQYyPiOb3z3OvuzFj_bfjKGom0c/https://img2024.cnblogs.com/blog/84976/202404/84976-20240414164123618-1705118011.png)

 Rerank模型使用了bge-reranker-base模型和embedding模型不同，Reranker模型使用问题和文档作为输入，直接输出相似度而不是embedding。本文通过向Reranker输入查询和段落来获得相关性分数。Reranker是基于交叉熵损失进行优化的相关性得分不受特定范围的限制，bge-reranker-base适用于中英文的双语场景。如果有更多语言需求可使用最新发布的BGE Re-Ranker v2.0模型。  
 Rerank模型可以在不牺牲准确性的情况下加速LLM的查询并可能提高准确率，Rerank通过从上下文中删除分数较低(相关性较低)的数据，Rerank通过重新排序上下文得以实现。下图为引入Rerank后的RAG流程图。  
![](https://proxy-prod.omnivore-image-cache.app/0x0,s60kdJONgo7JS8WKlHkbHXUOIzgxC7JzgW6C7GHzfdUA/https://img2024.cnblogs.com/blog/84976/202404/84976-20240414164144045-1193280819.png)

 在引入Rerank后可以看到上下文信息与问题的相关度提高了不少，不相干信息对上下文的干扰基本解决。下图为进行重排后的上下文；

![](https://proxy-prod.omnivore-image-cache.app/0x0,s9Sj2Wo4fAGsNA4eW8uPfdXZuiH59gj0b1O4WSueQUfM/https://img2024.cnblogs.com/blog/84976/202404/84976-20240414164154297-1754606415.png)

## Rerank模型使用

```routeros
embedding_model_name = 'maidalun1020/bce-embedding-base_v1'
embedding_encode_kwargs = {
              'normalize_embeddings': True
            }
embed_model = HuggingFaceEmbeddings(
  model_name="./bge-base-zh-v1.5",
  encode_kwargs=embedding_encode_kwargs
)

reranker_args = {
             'model_name': '/mnt/d/software/dev/gpt/bge-reranker-base', 
             'top_n': 5
                 }
reranker = BgeRerank(model_name='/mnt/d/software/dev/gpt/bge-reranker-base',top_n=3)

# init documents
db =  Chroma(persist_directory='chroma_DB',embedding_function=embed_model)
retriever =db.as_retriever(search_type="similarity",search_kwargs={"k": 10})

compression_retriever = ContextualCompressionRetriever(
    base_compressor=reranker, base_retriever=retriever
)

qa_chain = RetrievalQA.from_chain_type(llm, retriever=compression_retriever
, chain_type_kwargs={"prompt": PROMPT})

```

 引入Rerank模型后的retrieval引擎能够去除上下文不相关的污染数据、提供更精准的上下文信息。重排后(Rerank)精准的上下文不仅可减少了token的使用量进而还可能提高LLM推理速度与准确率。

posted @ [AiFly](https://www.cnblogs.com/softlin)阅读(10) 评论() [编辑](https://i.cnblogs.com/EditPosts.aspx?postid=18134322)收藏 举报

