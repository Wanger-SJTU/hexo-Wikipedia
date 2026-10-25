---
title: "一文详看Langchain框架中的RAG多阶段优化策略：从问题转换到查询路由再到生成优化"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-19/一文详看Langchain框架中的RAG多阶段优化策略-从问题转换到查询路由再到生成优化/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: c9625c4f-a5eb-498b-9152-800fd7f5f899
---

# 一文详看Langchain框架中的RAG多阶段优化策略：从问题转换到查询路由再到生成优化
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-mp-weixin-qq-com-s-p-k-2-br-lr-wp-ekkip-fh-ut-gvcg-18f8f179d6c)
[Read Original](https://mp.weixin.qq.com/s/pK2BRLrWpEKKIPFhUtGvcg)



![cover_image](https://proxy-prod.omnivore-image-cache.app/0x0,sdEuGnSYx567UPMKNgodHGVaUamIIIlL11izn5z72LgA/https://mmbiz.qpic.cn/sz_mmbiz_jpg/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG0uB9ltRibQJolaIibA6wbILFA3ib4PYaQfELcoibVPF82Xfu5LcCLh5cpA/0?wx_fmt=jpeg) 

原创  刘焕勇  老刘说NLP _2024-05-19 11:48_ _上海_ 

今天是2024年5月19日，星期日，北京，天气晴。

昨天，我们讲了知识图谱增强RAG问答时候可以做的几个阶段性注入的方案。

今天，我们系统性的看看RAG在真实langchain中实践的一些策略，推荐大家看看。

## 一、关于RAG的整体架构设计

关于RAG，可以看看langchain出品的RAG系列，地址在：https://github.com/langchain-ai/rag-from-scratch系列，其做了很细致的拆分和讲解，并且有对应的代码，如下概览：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s_2_0XfciqBaWUsx6cnGU-ZACSOSYZSC7rMun6KCN8NY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGV7Ygq3LepOPGWPrdP5hSxkHjaC6alurPC4oOlicoDHYQ8iaABhDia5Kzg/640?wx_fmt=png&from=appmsg)

<strong>大体可以切分成如下部分：</strong>

一个是索引Indexing部分：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sZZytAEii2FjAI-MMCd1O1-4Xi6-2zKRNdtXAPJVFqEs/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGYvMdgY8GkLyZA2s7eAdkVGM0xmXQC9SibW0Ag0Pd7RZ3ibib7ezMXWSSQ/640?wx_fmt=png&from=appmsg)

另一个是生成Generation部分：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s70HW6CxbIrrCY6PqNDr78prGtnv7IbB9pgskW8dSNhw/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGbpZSGs92aBDX4W0ISE9YibgiacDfVOrylyDHjdETk0IR1cU6PE2ib7lpg/640?wx_fmt=png&from=appmsg)

## 二、Query Transformations优化策略

Query Transformations查询转换侧重于重写和/或修改问题以便检索，整体流程如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sbNYTGUrgxJwdd8toULD12oIYyt6fntzg6TPkyzt-K_4/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGWWdOsctxoaoFrbric6IzfjiaibatK1Rlyf9r9S4XgUn184tt5n6bdLlSg/640?wx_fmt=png&from=appmsg)

其中重要的流程如下：

<strong>1、Multi Query多查询策略</strong>

该方法从多个角度重写用户问题，为每个重写的问题检索文档，返回所有查询的唯一文档。在实现上，将一个查询变成多个查询：https://python.langchain.com/docs/modules/data\_connection/retrievers/MultiQueryRetriever

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sbZ9XBk3VuWEMl0OKoQ5PvpuxXm9Y2VTk3pImFWYjqkw/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGmHiaOnoFJKrIhW0G0sDFicqTb4opuGicZfuN9ZLfDUHDqibL9YzsYdW02w/640?wx_fmt=png&from=appmsg)

对应的代码具象化如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sDLqgoKju5gPhkhpgr52kYs6GccRCKjARYWQFoiHVhrU/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG1icM6Atk8k5uHVpdbaXeyv0EnuX8UWaIKxEQZMYRoJUJH6W4BGMlnew/640?wx_fmt=png&from=appmsg)

<strong>2、RAG-Fusion多查询结果融合策略</strong>

从多个角度重写用户问题，检索每个重写问题的文档，并组合多个搜索结果列表的排名，以使用倒数排名融合(RRF)生成单一、统一的排名。其思想在于：将多个召回查询的结果进行合并：https://github.com/langchain-ai/langchain/blob/master/cookbook/rag\_fusion.ipynb?ref=blog.langchain.dev，https://towardsdatascience.com/forget-rag-the-future-is-rag-fusion-1147298d8ad1

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sCPr7IkJyl2WjT0H825q3QKRe9ubnO37ya3axjTg3Jyk/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGIPeesAAgcr1c32RmMVoGiaLAIzK3ZjxJOB64ktbFJ1ZvBe7KtsH2YaA/640?wx_fmt=png&from=appmsg)

对应代码实现：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,szureAtLaLHL5QVK37J-sEnRdUPNkKpaTb-v-vcMTZ-s/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG2QQ08s0n9uPjKwW2e12R6pZBRia1AibNqnGzQRsd1gxDXqAa8CylwLkg/640?wx_fmt=png&from=appmsg)

<strong>3、Decomposition问题分解策略</strong>

Decomposition问题分解将一个复杂问题分解成多个子问题，将问题分解为一组子问题/问题，可以按顺序解决（使用第一个问题的答案+检索来回答第二个问题），也可以并行解决（将每个答案合并为最终答案），这个是向下分解，与Multi Query是不同的方案，

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,syPa7lHIEwRmpQDE9wydTEj-RlJJTXBdR7cxSpaA24sY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGSq9rOibdn6ZnqAQnzW8M0mDJ9Hg7xPBe0BzWAmx3aTl2VOxDxiavBkIQ/640?wx_fmt=png&from=appmsg)

<strong>1）Answer recursively迭代式回答</strong>：在问题分解的基础上，逐步迭代出答案，将上一步问题的答案，与下一步骤的答案进行拼接，送入大模型进行问答：https://arxiv.org/pdf/2205.10625.pdf，https://arxiv.org/abs/2212.10509.pdf

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sdNmz-RkNIlQsJUrJEz2pSWRYJA1z47H50PYM3PAJjF4/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGcNia446I7YmibMd23qrvEzcP9ibQjpSPCzbfKvibyfjghrg4nOovIvxjtw/640?wx_fmt=png&from=appmsg)

对应prompt形式化如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sC7Ftckywh_NlkpyCY6uQBIiFS0QXYGxYr9YftvI5H94/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG7GeyIgEnMmiblw6Bm2IOpLCuIDpEFMcQLiacjh92BGnHFl3qicGL2ZQyg/640?wx_fmt=png&from=appmsg)

<strong>2）Answer individually，当然，也可以让每个subquery分别进行处理</strong>，然后得到答案，然后再拼接成一个QA pairspprompt最终形成答案。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sK0v2IGhjlVkfU_5cTgKOX9Hw5YUxxtN52enKJHFSjHs/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGdrUPbaZOTA3ZPial9IxUY6dUjmGW1G7IsVWL97qqdWwUUXhCIicH9oLQ/640?wx_fmt=png&from=appmsg)

如具体实现如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sPFtKIEXLi7Nj6PrIc9S2OaC6ioKGRpinomnR4uVl-C4/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGpicZnPWBdwIfo11xQJtKG9Fpt7Y03ibLRxFtTJTcfQudacVwVxSbRXwA/640?wx_fmt=png&from=appmsg)

<strong>4、Step Back问答回退策略</strong>

Step Back问答回退，首先提示LLM提出一个关于高级概念或原则的通用后退问题，并检索有关它们的相关事实，使用此基础来帮助回答用户问题。构成上包括抽象abstracton和推理reasoning两个步骤，来源于工作https://arxiv.org/pdf/2310.06117.pdf，比如给定一个问题，需要提示大模型，找到回答该问题的一个前置问题。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,svUTyd8anbuBuG-pLSO04x_K3kIdBnBwE82Lv6xWODVY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGYTCFQnQR4xpRMmibu0IoVGXGhWibiaNeAEeDwLNePVo2nibk2eicZLMA6Sg/640?wx_fmt=png&from=appmsg)

得到前置问题及其答案后，再将其整体与当前问题进行合并，最后送入大模型进行问答，得到最终答案：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sPNxmXwO4Xj9-R1ozbG0_WQrz_6zzSmnqiR36i8dETzA/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGljfZUGn1y2Cb9PzZMxf9yccgibEPnYV8G88WLB1JelgR9iaQh9A11VWQ/640?wx_fmt=png&from=appmsg)

对应的prompt如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sWNFukzwb2Q3mobpwumsmmChx8QKyPL8UFYx0ACCWuJg/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGJzT8ftb85uTWKQSHhBLVxic4nTyoAyrUsVZzhf2FlINWvpy5kGx9q9w/640?wx_fmt=png&from=appmsg)

<strong>5、HyDE混合策略</strong>

该策略思想为：LLM将问题转换为回答问题的假设文档。使用嵌入的假设文档检索真实文档，前提是doc-doc相似性搜索可以产生更多相关匹配。由于query与doc之间是不对称检索，因此这个时候，可以先根据query生成一个doc，然后根据doc生成对应的embedding，再跟原先documents进行检索：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sqt-vKnFFziwu-kNKQWdcvxwP3utaxAVjAtGMA7aRCDE/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGLn6Y2P30Mj2ZAUWBZ44ic3O90a8H3RYSEQuy2uiaCdpQ9qXic0ahRts9A/640?wx_fmt=png&from=appmsg)

例如下图中的query，每个有对应的instruction，通过chatgpt生成generated doument，然后以此进行召回，最后生成real document；

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sglM7CI0p5U5Gv92QQlb680IKf9GNbCPmowiGFTcfth8/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGR2CyV6yAQbPlTOrBpfnEW6guEeB6NbzksHJxYnEJiaZBoicnXetpeTGA/640?wx_fmt=png&from=appmsg)

具体对应的具象化实现可以看看：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sEr0onXIITp_MXwf493ETtqyKU2MsqwOdyMsmh4Q_jc4/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG95F2kG8GhHZl185E5eZsiaRvCLMNfYiaHh2c2HrCKLClXbibHaaGNVYnA/640?wx_fmt=png&from=appmsg)

对应的文档和论文可以查看:https://github.com/langchain-ai/langchain/blob/master/cookbook/hypothetical\_document\_embeddings.ipynb，https://arxiv.org/abs/2212.10496

## 三、Routing路由优化策略

RAG Routing路由，主要解决的是从获取query之后，所需要执行的问题意图分类的问题，处理的是问题域选择问题：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,srwyzATWLvAqCLzXKZ9q7f4s4xe5vfnqkeDqALyeqADc/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGwGaIiacjhRpUp45RHFkem8B4WRQIBxmVvzohiaxgiaGK0Whxq5SWdRt2A/640?wx_fmt=png&from=appmsg)

可用的方案包括，Logical and Semantic routing，基于逻辑规则和语义的路由分发：https://python.langchain.com/docs/use\_cases/query\_analysis/techniques/routing#routing-to-multiple-indexes

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sAuoA-qHBzqyxg_IIjlbvIOUFlXgoTCrMbR1N8LY-7SY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGQMdXsMsbxicErYaoicAUGmQ3dht58C2rrHIEaOujo4qwgmfnic9dicGC9Q/640?wx_fmt=png&from=appmsg)

对应的具象化实现如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sVLNVPyiCCO_YyYn0ip179oW404V5UfFhgfKCVRnBc2s/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGU5qIdMXuYozI8DwyWMD2e4PxldIjbo9q9xlWo61iaSAd6RbSkNI8tdQ/640?wx_fmt=png&from=appmsg)

可以通过function call来实现：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s3_nys07jk10ewDNveXN2el5nYQ1LJwrtsCZop7g9BTY/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGyMjicwzMbdArBRETSaSqicMTzxn0WXCkToN7WfxNkkzjDVEHOmxdfpMw/640?wx_fmt=png&from=appmsg)

也可以基于语义来实现分发Semantic routing，https://python.langchain.com/docs/expression\_language/cookbook/embedding\_router

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sLEdeXEmOnSYMMj7TsBNNmiEVm6B2B1DG2ya_oSOrnFM/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGfxRre8UrqhISxz7OwIyzlicPUTH6ZibgZibhvqsyLLL1nKnOk9RGPgFVg/640?wx_fmt=png&from=appmsg)

在实现上，可以为每个意图都设定一个prompt，然后进行判定，一个具象化的实现如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sXRZF2Y1rrch-Mu2YGylD8vFDyBQ5dd5iCVo8gmZrMzE/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGMQpFThvLSaKyE3UR9VR0EEgxiaTkwdaZM2xBYACDNazQfvMtRRzq2lg/640?wx_fmt=png&from=appmsg)

## 四、Query Construction问题构建优化策略

<strong>Query Construction，主要解决的问题是不同检索知识库，如mysql数据库、图数据库GraphDB、向量化数据库vectorDB的查询转换。使用LLM将自然语言转换为其中DSL是一种与给定数据库（SQL、Cypher等）交互所需的领域特定语言</strong>：https://blog.langchain.dev/query-construction/，https://blog.langchain.dev/enhancing-rag-based-applications-accuracy-by-constructing-and-leveraging-knowledge-graphs/![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sLuOjf36zA7j1JKJY4WznvzG4d_CMMtFdyCSqeNyljgo/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGxlsYjWNicUOIibrpQg9aib7OlHHn0dxLfkYCEzkp4yHOc8k3YqlM8ibywA/640?wx_fmt=png&from=appmsg)

正在具体实现上，可以查看的方案，可以如下：

Query structuring for metadata filters，基于元数据过滤器的问题构建，例如，许多向量化存储都包含元数据字段，例如：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sB3rsQJ2QutqLdcNB-urR2W63bhFN0DPdONa7PAJcul8/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG74x02ItwbF0CpOxdlRotE6mk0G8O6QncyNq0V3uGMDNZFLcCjcr4JQ/640?wx_fmt=png&from=appmsg)

这样就可以根据元数据过滤特定的数据chunk：https://python.langchain.com/docs/use\_cases/query\_analysis/techniques/structuring

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sUtBkx5C-AKC3crPeULAAqM1IUWFplNYs4DrNq60DEkc/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGYGu0zPqmTr3DhHQNVTGeOPbeHDjQNHI4vk2enqyPuWawxR5Xjeiad0Q/640?wx_fmt=png&from=appmsg)

## 五、Indexing不同的索引优化策略

关于文档chunk切分这个事情，索引的组织其实也是一个很有趣的话题，这块在切分上可以做优化，也可以做多种表达方式的索引<strong>multi-representation indexing、特定化的embedding或者层级性的索引</strong>：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sUPaIPq7JLIuTvyXhOPNS9iS8cgArMx_xnZ_6VudnPTk/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG05eaOtQPFyOspI1laJoUPlLYibQSUyWqW5zL0icXp6HrgAhGnmvdupuw/640?wx_fmt=png&from=appmsg)

例如<strong>Multi-representation Indexing，使用LLM生成针对检索进行优化的文档摘要（“命题”）。嵌入这些摘要以进行相似性搜索，但将完整文档返回给LLM进行生成</strong>:https://blog.langchain.dev/semi-structured-multi-modal-rag/，https://python.langchain.com/docs/modules/data\_connection/retrievers/multi\_vector，https://arxiv.org/abs/2312.06648

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s2pDGrovCQoXg7FsLVV_SbMUulp1kTrMoXpAJFT6QoxU/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGRxxkxibBeuSwLKPwkA2gFaialOcDt3Ur6UDudtYI2S2kMeJkgvPq0liag/640?wx_fmt=png&from=appmsg)

例如，可以针对一个text，切分形成多个检索单位retrieval units，包括：passages、sentences,propositions

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sTRWVl_osNyPCU5CUS63kYy2axCM77ICgSFfdNVNge9c/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG92Vu07Im5btH36YWMBbnzutZxBxeXRzuLia9q70dGRYJ4eeefAqCTvw/640?wx_fmt=png&from=appmsg)

<strong>可以通过小的chunk，来实现对父级documents的索引</strong>，查看：https://python.langchain.com/v0.1/docs/modules/data\_connection/retrievers/parent\_document\_retriever/

<strong>此外，也可以进一步来看看关于层级性索引的方案：RAPTOR</strong>，https://arxiv.org/pdf/2401.18059.pdf，对应的代码放在：https://github.com/langchain-ai/langchain/blob/master/cookbook/RAPTOR.ipynb，其思想在于对文档进行生成聚类摘要，然后将设计成层级性。具体实现上，将语料库中的文档聚类，并递归地总结相似的文档。将它们全部编入索引，生成较低级别的文档和摘要，可以检索这些文档和摘要来回答从详细到更高级别的问题。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sIaZJ_d2e1LlROKac_aRoEjheQAGkW2ziZ-1Gps5ja5g/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGRK6xIiaCzNicS8cbLfMic4y2kJYdOGjsEGo3gOoHuYibEmIz7vGH2Jkf1g/640?wx_fmt=png&from=appmsg)

<strong>但以上还是停留在文本层级，也可以做token到text级</strong>，这里可以使用ColBERT，为段落中的每个token生成一个受上下文影响的向量，ColBERT同样为查询中的每个token生成向量，然后，每个文档的得分就是每个查询嵌入与任意文档嵌入的最大相似度之和，这块可以看：https://hackernoon.com/how-colbert-helps-developers-overcome-the-limits-of-rag

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s6kHJIIT0Ex8idYvOtStH1cA7XQYMGw6HjEUwTjkBZ6Y/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGxjBmwdJpfbY2ZaPg5oAbMoHWaWGUvkTFjfZP5icpDZib7c2jnzwaaWRg/640?wx_fmt=png&from=appmsg)

## 六、Retrieval检索优化策略

在完成对问题的改写、不同知识库查询的构建以及意图分发、查询对象索引的构建之后，我们可以进一步优化Retrieval检索，包括ranking、refinement增强以及自适应检索adaptive retrival。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sApdCcd_fbVAmWLI9tSdyaN1gtQYQVvUfBP-KppjmtYQ/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGSUOEMQLHY82JVB8UN4Bx9vmMgHqeGz88vWrjonOP8aPU5BQiaAfblJg/640?wx_fmt=png&from=appmsg)

具体采用的方案可以如下：

Re-ranking，<strong>这个可以作为rag fusion的替换方案，当做一个过滤筛子进行排序</strong>，示意图如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sXQqMFKYZZfQrWYHkvhvUR6dot4pfg0gTjW8RP8mEgwA/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG1Xcql8xbhqtdibmnEXcfd9unfP56gz65WDwPTsicnQicZI5rqyYK1H5Aw/640?wx_fmt=png&from=appmsg)

在具体实现上，可以使用Cohere Re-Rank方案，https://python.langchain.com/v0.1/docs/integrations/retrievers/cohere-reranker/#doing-reranking-with-coherererank， https://cohere.com/blog/rerank![图片](https://proxy-prod.omnivore-image-cache.app/0x0,ssf1CCivYYNSey3cr6kMPLXYUD2yN8XxD-mjYZkOztKs/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGVKGJBS17mY6fvKJ4RO63ibyhjdRlPZ5DSKibicp96QHduLcek5iaL3vsiaQ/640?wx_fmt=png&from=appmsg)

具象化的例子如下：![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s25EjgzGWMqWlB270iMQd5PwweAOM1R9UDNkxewMWB6M/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGy7Oib16s0j6xI9HE1La8bz3F3Zmomxqymdun36CdWibjK9LjMPaHyHRw/640?wx_fmt=png&from=appmsg)

一个对比的效果如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sKaYbZVlMo4k8leSg4zR_ofrnZwTssCF21VF2E9e9Ifg/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG8cEkrlCicu5AazDuOCDAcFsJhKsRdoJvv1ibRwoia2BbGPRxqZA8D5JJA/640?wx_fmt=png&from=appmsg)

此外，也可以使用<strong>CRAG（Corrective-RAG，CRAG）</strong>，地址：https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph\_crag.ipynb，https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph\_crag\_mistral.ipynb，https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph\_crag\_local.ipynb，其本质上是一种adaptive-RAG策略，实现方式为<strong>在循环单元测试中自我纠正检索错误，以确定文档相关性并返回到网络搜索</strong>，即纠对检索文档的自我反思/自我评分，主要采用如下步骤：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,scHVMj2IPZqMmHD6YQcOpHKBMmeFwLWjgG9CtIYHj_g0/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGiay2at8cb6pKchVD9cDuLZKVc9JR3IOGXvSZjI0oh2x1oQ2kc6TU1Ng/640?wx_fmt=png&from=appmsg)

如果至少有一个文档超过了相关性阈值，则进入生成阶段，在生成之前，进行知识细化 将文档划分为<strong>知识条带(knowledge strip)</strong> ， 对每个知识条进行分级，过滤不相关的知识条，如果所有文档都低于相关性阈值，或者分级者不确定，那么框架就会寻找额外的数据源，并使用网络搜索来补充检索。

## 七、生成Generation优化策略

关于生成阶段，大家最常见的，就是Self-RAG(https://arxiv.org/pdf/2310.11511)，对应地址可以参考：https://github.com/langchain-ai/langgraph/tree/main/examples/rag，https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph\_self\_rag\_mistral\_nomic.ipynb，其基本思想在于：<strong>使用循环单元测试自行纠正RAG错误，以检查文档相关性、答案幻觉和答案质量。</strong>

其实现流程如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,so8drVgxnJCDKEhl_v4HdkyI1pf0r1lq02xoeGGmfGyI/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGpGyWkb7x13gIF9UcQQ8sibGxo5KC8xdShhKPicRjmREBgd3oJic5HF9LA/640?wx_fmt=png&from=appmsg)

其思想在于，对检索到的文件和世代进行自我反思/自我评分。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sfv0XdMzF90qm9x1tHzNl4OGHQGy6b9pPadT4cr_IEfQ/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFGCq5OatVrcFsejcpktOlndQLSS0IvpPwicibpcDoQXfJWo54Rg4w6V5BA/640?wx_fmt=png&from=appmsg)

整个过程可以进一步形式化如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s31pjUHDUwsiYJK0y5jN0n2XS3p8Vzg2cYuh_XivaqVQ/https://mmbiz.qpic.cn/sz_mmbiz_png/fUBU1yiaEmJjk76AhbhArx9TvMIfrGWFG3eLZ8yVW1nDQEQicldPmrRDqiaBfhI9zne4oTiaYpT5qYOwg6EDUia4LTw/640?wx_fmt=png&from=appmsg)

## 总结

本文主要围绕langchain这个RAG实现项目中所提到的一些优化策略，这些方案做了阶段性的划分，也有对应的实践代码，可以进一步提升大家的认知，感兴趣的可以多看看。

## 参考文献

1、https://github.com/langchain-ai/rag-from-scratch

## 关于我们

老刘，刘焕勇，NLP开源爱好者与践行者，主页：https://liuhuanyong.github.io。

老刘说NLP，将定期发布语言资源、工程实践、技术总结等内容，欢迎关注。

<strong>对于想加入更优质的知识图谱、事件图谱、大模型AIGC实践、相关分享的，可关注公众号，在后台菜单栏中点击会员社区->会员入群加入。</strong>

