---
title: 大模型RAG框架llama-index技术调研 - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-09/大模型RAG框架llama-index技术调研-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 3d585dce-facc-4509-baa2-0bf4b5fe5269
---

# 大模型RAG框架llama-index技术调研 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-llama-index-18ec2e8d083)
[Read Original](https://zhuanlan.zhihu.com/p/691175526)



发布于 2024-04-07 22:48・IP 属地广东 ，编辑于 2024-04-08 10:44・IP 属地广东

> 该技术调研的核心来自对官方文档的解读：[https://docs.llamaindex.ai](https://docs.llamaindex.ai/)，基于当前llama-index最新版本v0.10.0，如后续有升级的部分,请大家自行比对差异。

## 1\. 引言

RAG(Retrieval Augmented Generation)系统，代表“检索增强生成”，现阶段发展如火如荼，最新的[RAG综述](https://arxiv.org/abs/2312.10997)详细阐述了RAG的的发展历程，现状以及技术展望，强烈建议大家阅读。  

![](https://proxy-prod.omnivore-image-cache.app/1966x0,soKBAlFxvnlFWR94503j5t6o0zR0xeTVKF7SVCnx5Mq0/https://pic4.zhimg.com/v2-31cb311d08d54e9074b25c3deda614bf_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/720x0,skZ8jPmP15hxcYGirQfVJpPjGcmmqvm6oh4SUGaeYAZU/https://pic1.zhimg.com/v2-f14334fadecbd3b7b889aab883586630_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/2219x1294,s1mcg1qt0zk31Ec4S2t_sJUXC193F9GfpoaD2S0rUAb0/https://pic1.zhimg.com/v2-7eb54d185d6a0a3521b9a94066af3274_b.jpg)

LlamaIndex 是一个基于[LLM](https://en.wikipedia.org/wiki/Large%5Flanguage%5Fmodel)的应用程序的数据框架，该应用程序受益于上下文增强，是典型的RAG系统。LlamaIndex 提供了必要的抽象，可以更轻松地摄取、构建和访问私有或特定领域的数据，以便将这些数据安全可靠地注入 LLM 中，以实现更准确的文本生成。

> 如果对比RAG综述里面关于RAG的描述，显然llamaIndex属于Modular RAG的范畴。

##   
2\. 基本概念

### 2.1 RAG基本流程

![](https://proxy-prod.omnivore-image-cache.app/672x309,sth5e5GzzVUCg1TyXLaCfDrjJP_WiRx-orB5gk_OVjas/https://pic4.zhimg.com/v2-b2d2a92e6c9546e96ae0c152c60bb263_b.jpg)

  
详细展开如下：  

![](https://proxy-prod.omnivore-image-cache.app/1474x711,sFWE-Ql_TN3kAq1w6cxl9ilIE5YTPLkrH39UaQdx2-hs/https://pic4.zhimg.com/v2-acfcb956dc8674cd507420c835d7e8df_b.jpg)

  
大型语言模型（LLMs）在庞大的数据集上进行训练，但它们并未针对您的数据进行训练。检索增强型生成（Retrieval-Augmented Generation，简称RAG）通过将您的数据添加到LLMs已经可以访问的数据中，解决了这个问题。  
在RAG中，您的数据被加载并准备好以供查询或“索引”。用户查询作用于索引，将您的数据过滤到最相关的上下文。然后，这个上下文和您的查询一起伴随着提示发送给LLM，LLM会提供一个响应。

### 2.2 RAG关键步骤

![](https://proxy-prod.omnivore-image-cache.app/674x91,s-by-tCj-9_rX4f-MBhJaE3ulTHdL3iTx7Zt_8vQ1i1o/https://pic4.zhimg.com/v2-ad91f3f4e902bf96ecdea895fe929afb_b.jpg)

  
RAG 中有五个关键阶段，这将成为您构建的任何大型应用程序的一部分。这些都是：  

* <strong>加载</strong>：这是指将数据从其所在位置（无论是文本文件、PDF、其他网站、数据库还是 API）获取到您的管道中。[LlamaHub](https://llamahub.ai/)提供数百种连接器可供选择。
* <strong>索引</strong>：这意味着创建一个允许查询数据的数据结构。对于大模型来说，这几乎总是意味着创建`vector embeddings`数据含义的数字表示，以及许多其他元数据策略，以便轻松准确地找到上下文相关的数据。
* <strong>存储</strong>：一旦数据被索引，您几乎总是希望存储索引以及其他元数据，以避免重新索引。
* <strong>查询</strong>：对于任何给定的索引策略，您可以通过多种方式利用 LLM 和 LlamaIndex 数据结构进行查询，包括子查询、多步查询和混合策略。
* <strong>评估</strong>：任何管道中的关键步骤是检查它相对于其他策略的有效性，或者何时进行更改。评估提供客观衡量您对查询的答复的准确性、忠实度和速度。

> 思考：很多人知道RAG的一般流程，但鲜有人深入研究实现RAG所需的关键步骤，特别最后一步评估（比如我最近面试的好多同学对RAG的评估都是一知半解），很少有人认真关注。如果这一步不能得到充分重视，那作为算法工程师的最后阵地也将失去。

## 3\. 加载

在您的选定的大型语言模型（LLM）可以对您的数据进行操作之前，您首先需要处理并加载这些数据。这个过程与机器学习（ML）领域中的数据清洗/特征工程流程，或传统数据环境中的ETL（提取-转换-加载）流程相似。这个加载（ingestion）流程通常包括三个主要阶段：加载数据、转换数据以及索引和存储数据。我们将在后续章节中详细介绍索引/存储。在本指南中，我们主要讨论加载器和转换。  
3.1 <strong>加载器</strong>

在您的选定的大型语言模型可以对您的数据进行操作之前，您需要加载数据。LlamaIndex通过数据连接器来实现这一点，这些连接器也被称为读取器。数据连接器从不同的数据源读取数据，并将数据格式化为Document对象。Document是一个包含数据（目前是文本，未来可能包括图像和音频）以及关于这些数据的元数据的集合。  

1. 使用SimpleDirectoryReader进行加载

最简单的读取器是SimpleDirectoryReader，它可以从给定目录中的每个文件创建文档。它是LlamaIndex内置的，能够读取多种格式，包括Markdown、PDF、Word文档、PowerPoint幻灯片、图像、音频和视频。

```autohotkey
```python from llama_index.core import SimpleDirectoryReader documents = SimpleDirectoryReader("./data").load_data() ```
```

  
2\. 使用[LlamaHub](https://llamahub.ai/?tab=readers)中的读取器

因为有太多可能的数据来源，它们并不是全部内置的。相反，您可以从我们的数据连接器注册表LlamaHub中下载它们。在这个例子中，LlamaIndex下载并安装了一个名为DatabaseReader的连接器，它对SQL数据库运行查询，并将结果的每一行作为Document返回：

```lua
```python from llama_index.core import download_loader from llama_index.readers.database import DatabaseReader reader = DatabaseReader(     scheme=os.getenv("DB_SCHEME"),     host=os.getenv("DB_HOST"),     port=os.getenv("DB_PORT"),     user=os.getenv("DB_USER"),     password=os.getenv("DB_PASS"),     dbname=os.getenv("DB_NAME"), ) query = "SELECT * FROM users" documents = reader.load_data(query=query) ```
```

[LlamaHub](https://llamahub.ai/?tab=readers)上有数百个连接器可供使用！

  
3\. 直接创建Document

除了使用加载器，您还可以直接使用Document。

```autohotkey
```python from llama_index.core import Document doc = Document(text="text") ```
```

### **3.2 转换**

数据加载后，您需要在将其放入存储系统之前对数据进行处理和转换。这些转换包括分块、提取元数据以及为每个分块嵌入。这是为了确保数据可以被检索，并能够被大型语言模型优化使用。转换的输入/输出是Node对象（Document是Node的子类）。转换也可以被堆叠和重新排序。  
3.2.1 高级别转换API

索引有一个\`.from\_documents()\`方法，它接受一个Document对象数组，并正确地解析和分块它们。但是，有时您会希望对文档的分割方式有更大的控制权。

```reasonml
```python from llama_index.core import VectorStoreIndex vector_index = VectorStoreIndex.from_documents(documents) vector_index.as_query_engine() ```
```

  
在底层，这将您的Document分解为Node对象，这些对象类似于Documents（它们包含文本和元数据），但与它们的父Document有关系。如果您想要定制核心组件，比如文本分割器，通过这种抽象，您可以传入一个自定义的转换列表或应用到全局Settings中：

```routeros
```python from llama_index.core.node_parser import SentenceSplitter text_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=10) # global from llama_index.core import Settings Settings.text_splitter = text_splitter # per-index index = VectorStoreIndex.from_documents(documents, transformations=[text_splitter]) ```
```

  
3.2.2 低级别转换API

您也可以明确地定义这些步骤。您可以通过使用我们的转换模块（文本分割器、元数据提取器等）作为独立组件，或在我们的声明式TransformationPipeline接口中组合它们来实现这一点。

1. **将文档分割为Nodes**

处理文档的一个关键步骤是将它们分割为“块”/Node对象。核心思想是将数据分割成可以被检索/提供给大型语言模型的小块。  
LlamaIndex支持多种文本分割器，从段落/句子/基于标记的分割器到基于文件的分割器，如HTML、JSON。这些可以单独使用或作为加载流程的一部分。

```nix
```python from llama_index.core import SimpleDirectoryReader from llama_index.core.ingestion import IngestionPipeline from llama_index.core.node_parser import TokenTextSplitter documents = SimpleDirectoryReader("./data").load_data() pipeline = IngestionPipeline(transformations=[TokenTextSplitter(), ...]) nodes = pipeline.run(documents=documents) ```
```

<strong>2\. 添加元数据</strong>

您也可以选择为您的文档和节点添加元数据。这可以通过手动添加或使用自动元数据提取器来完成。这里有关于1）如何定制Document，和2）如何定制Nodes的指南。

```autohotkey
```python document = Document(text="text", metadata={"filename": "<doc_file_name>", "category": "<category>"}) ```
```

**3\. 添加嵌入**

要将节点插入向量索引中，它应该有一个嵌入。有关更多详细信息，请参阅我们的加载流程或嵌入指南。  
**4\. 直接创建和传递节点**

如果您愿意，您可以直接创建节点，并将Nodes列表直接传递给索引器：

```reasonml
```python from llama_index.core.schema import TextNode node1 = TextNode(text="text_chunk", id_="<node_id>") node2 = TextNode(text="text_chunk", id_="<node_id>") index = VectorStoreIndex([node1, node2]) ```
```

## 4\. 索引

在 LlamaIndex 术语中，Index是一种由对象组成的数据结构Document，旨在支持 LLM 进行查询。您的索引旨在补充您的查询策略。  
LlamaIndex 提供了丰富的索引类型。

###   
4.1 摘要索引  

1. 节点存储方式

摘要索引只是将节点存储为顺序链。  

![](https://proxy-prod.omnivore-image-cache.app/491x144,sv7QCmiDQeed-L8ubfZOx0OaBwVegpz8hXXQtcYP-YHI/https://pic4.zhimg.com/v2-59dc1a5bb35d0f9b47688d463c4a93f3_b.jpg)

  
2\. 查询策略

在查询期间，如果没有指定其他查询参数，LlamaIndex 只会将列表中的所有节点加载到我们的响应综合模块中。  

![](https://proxy-prod.omnivore-image-cache.app/516x197,sV_lMPgQeGVf4xQ0EmppswIVwLyL2Nim2RsdYumtbUXo/https://pic4.zhimg.com/v2-89ed676e7900301944855e535cf86207_b.jpg)

  
摘要索引确实提供了多种查询摘要索引的方法，可以通过基于嵌入的查询获取 top-k 邻居，或者添加关键字过滤器，如下所示：  

![](https://proxy-prod.omnivore-image-cache.app/511x212,sf5S_ADHdK2wh3iXYcWR0g0orwbMPnuUiG0rh3ciyh-0/https://pic2.zhimg.com/v2-abfcfc55e068e5ef6e0453c91aff70f5_b.jpg)

###   
4.2 向量存储索引  

1. 节点存储方式

[向量存储索引存储每个节点以及向量存储](https://docs.llamaindex.ai/en/stable/community/integrations/vector%5Fstores/#using-a-vector-store-as-an-index)中相应的嵌入。  

![](https://proxy-prod.omnivore-image-cache.app/444x188,sBDozsP27qkgtq-sDvfFwGiAvkNuFrbRNcKRxbsLu9k8/https://pic2.zhimg.com/v2-5724c18a396a51be61fdd5aa8f9b0f99_b.jpg)

2\. 查询策略

查询向量存储索引涉及获取前 k 个最相似的节点，并将它们传递到我们的响应综合模块中。  

![](https://proxy-prod.omnivore-image-cache.app/730x533,saGAXfE4pTe0ktLCFAI9kXjJ7IMQeWgEnHzO8Rtk1xL4/https://pic2.zhimg.com/v2-c8681d34d7d5b6a4d3642e93d69ab149_b.jpg)

### 4.3 树索引  

1. 节点存储方式

树索引从一组节点（成为该树中的叶节点）构建层次树。  

![](https://proxy-prod.omnivore-image-cache.app/696x530,sizC48vQjQCPt12zdI-uy6iElRpUgXw00-uB51j1SaXo/https://pic3.zhimg.com/v2-365610ad9dcf46fb2921c36b111bce9e_b.jpg)

2\. 查询策略

查询树索引涉及从根节点向下遍历到叶节点。默认情况下，( `child_branch_factor=1`) 查询会在给定父节点的情况下选择一个子节点。如果`child_branch_factor=2`，则查询为每个级别选择两个子节点。  

![](https://proxy-prod.omnivore-image-cache.app/873x362,shas0ggqMM9qq5SDjbpjkEgjMWe5TnOfcMQXf5vsUc_8/https://pic3.zhimg.com/v2-866e07f3b8390e6cc919adce877fee1a_b.jpg)

### 4.4 关键字表索引  

1. 节点存储方式

关键字表索引从每个节点中提取关键字，并构建从每个关键字到该关键字对应节点的映射。  

![](https://proxy-prod.omnivore-image-cache.app/739x314,seiuXIHNrD-SVP0K904U2vHC46RXD_barwzBljZNaB_c/https://pic2.zhimg.com/v2-56c5a09b8a4a07d37585e98bbc9eb821_b.jpg)

  
2\. 查询策略

在查询期间，我们从查询中提取相关关键字，并将其与预先提取的 Node 关键字进行匹配以获取相应的 Node。提取的节点被传递到我们的响应合成模块。  

![](https://proxy-prod.omnivore-image-cache.app/805x426,s05B4gsinYh9qsUQip30dHWJ-b-YXfSk8KQW-06n9je4/https://pic1.zhimg.com/v2-7fb16c5be3e1b928ebfee06f400c13b8_b.jpg)

### 4.5 知识图谱索引  

1. 节点存储方式

知识图谱索引的存储结构与向量索引一致，如下所示。  

![](https://proxy-prod.omnivore-image-cache.app/404x186,swnmDMgws4jFEjolweLP696Bt7ys23X5I2ggC-mfNw6Q/https://pic1.zhimg.com/v2-eff2b93a1b7af6d9fe465e5646a01528_b.jpg)

> llama\_index淡化了传统知识图谱构建以及知识图谱应用的概念，知识图谱构建隐含在知识图谱索引阶段，知识图谱应用则在查询阶段完成。这里引申一下，我们看到RAG里的很多概念都源自传统搜索与传统NLP领域，属于新瓶装旧酒。比如RAG目前发展最先进的检索策略（粗召回-精排序）与传统搜索以及faq技术如出一辙，粗召回一般结合关键词检索和双塔语义检索，精排序一般结合关键词匹配和单塔交互型语义匹配。但是又要反思一下新瓶装旧酒有没有意义？我认为是有意义，大模型时代如果还守着旧的概念，技术就很难得到快速发展。  
> 知识图谱节点索引内部的prompt如下：

```applescript
 Some text is provided below. Given the text, extract up to {max_knowledge_triplets} knowledge triplets in the form of (subject, predicate, object). Avoid stopwords.
 ---------------------
 Example:Text: Alice is Bob's mother.Triplets:
 (Alice, is mother of, Bob)
 Text: Philz is a coffee shop founded in Berkeley in 1982.
 Triplets:
 (Philz, is, coffee shop)
 (Philz, founded in, Berkeley)
 (Philz, founded in, 1982)
 ---------------------
 Text: {text}
 Triplets:
```

2\. 查询策略

查询向量存储索引涉及获取前 k 个最相似的节点，并将它们传递到我们的响应综合模块中。  

![](https://proxy-prod.omnivore-image-cache.app/623x452,sinrZc5qTQt05Zh1_g2tzF7STbLjRAySw4iOGdJsge0Q/https://pic4.zhimg.com/v2-454eee5f08e75159c520132c694f6b77_b.jpg)

## 5\. 存储

### 5.1 存储概念

LlamaIndex是一个提供高级接口用于嵌入、索引和查询外部数据的工具。它支持可互换的存储组件，允许用户自定义不同类型的存储方式，包括文档存储、索引存储、向量存储、图存储和聊天存储。  
文档存储是用于存储被索引的文档（即Node对象）的地方。  
索引存储用于存储索引元数据。  
向量存储用于存储嵌入向量。  
图存储用于存储知识图谱（例如Knowledge Graph Index）。  
聊天存储用于存储和组织聊天消息。  
文档和索引存储依赖于一个通用的键值存储抽象，该抽象也详细说明了如何使用。LlamaIndex支持将数据持久化到任何由fsspec支持的存储后端，已经确认支持的存储后端包括本地文件系统、AWS S3、Cloudflare R2等。  

![](https://proxy-prod.omnivore-image-cache.app/547x408,sH1HiWwrbzUSuOXnJY5blybDNYUwokY_WZlhIHhHmY1Y/https://pic3.zhimg.com/v2-15cb918b15d6afb6a98ed6b3e82a8d3e_b.jpg)

> 这里的Index Store可能不熟悉llama-index的同学比较困惑，为什么存储里面还又嵌套了个索引，其实这里的索引存储是源数据的意思，就是llama-index统一了数据源，考虑到有些数据源已经是向量化的，所以存在这个Index Store概念。

### 5.2 使用方法

许多向量存储（除了FAISS）会同时存储数据和索引（嵌入），这意味着用户不需要使用单独的文档存储或索引存储。这也意味着用户不需要显式地持久化这些数据，因为这会自动发生。构建新索引或重新加载现有索引的使用方法如下所示。首先，从LlamaIndex的核心模块导入所需的类和函数，然后构建向量存储并自定义存储上下文。接着，加载文档并构建索引。如果要重新加载现有索引，可以直接从向量存储中加载。代码如下所示：

```reasonml
## build a new index from llama_index.core import VectorStoreIndex, StorageContext from llama_index.vector_stores.deeplake import DeepLakeVectorStore  # construct vector store and customize storage context vector_store = DeepLakeVectorStore(dataset_path="<dataset_path>") storage_context = StorageContext.from_defaults(vector_store=vector_store) # Load documents and build index index = VectorStoreIndex.from_documents(     documents, storage_context=storage_context )   ## reload an existing one index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
```

## 6\. 查询

### 6\. 1 查询概念

查询是LLM应用中非常重要的一部分。简单来说，查询就是向LLM发出请求，这可以是一个简单的问题和答案，也可以是请求摘要，或者是更复杂的指令。更复杂的查询可能涉及重复/链式提示+LLM调用，甚至在多个组件间进行推理循环。  
所有查询的基础是查询引擎（QueryEngine）。获取查询引擎的最简单方式是通过索引创建一个，如下所示：  
query\_engine = index.as\_query\_engine() response = query\_engine.query("Write an email to the user given their background information.") print(response)  
<strong>查询的三个阶段</strong>

* <strong>检索（Retrieval）</strong>：在索引中查找并返回与查询最相关的文档。常见的检索类型是“top-k”语义检索，但也存在许多其他检索策略。
* <strong>后处理（Postprocessing）</strong>：检索到的节点（Nodes）可以选择性地进行排名、转换或过滤，例如要求节点具有特定的元数据，如关键词。
* <strong>3\. 响应合成（Response Synthesis）</strong>：将查询、最相关数据和提示结合起来，发送给LLM以返回响应。

llama-index针对查询提供了丰富的定制化操作，具体如下：

1. <strong>自定义查询阶段</strong>  
LlamaIndex提供了一个低级组合API，允许你对查询进行细粒度控制。例如，你可以自定义检索器使用不同的top\_k数量，并添加一个后处理步骤，要求检索到的节点达到最小相似度分数才能被包括在内。
2. <strong>配置检索器和节点后处理器</strong>  
你可以在LlamaIndex中学习到各种各样的检索器。此外，LlamaIndex支持高级节点过滤和增强，这可以进一步提高检索到的节点的相关性，帮助减少LLM调用的时间/数量/成本，或提高响应质量。例如，可以添加关键词过滤或基于相似度分数的过滤。
3. <strong>配置响应合成</strong>  
检索器获取相关节点后，基础合成器通过结合信息合成最终响应。你可以配置它，例如：  
query\_engine = RetrieverQueryEngine.from\_args(retriever, response\_mode=response\_mode)
4. <strong>支持的响应模式</strong>
* 默认："create and refine" 通过顺序处理每个检索到的节点来创建和完善答案；适用于更详细的答案。
* 紧凑："compact" 在每个LLM调用中压缩提示，尽可能多地填充节点文本块。
* 树总结："tree\_summarize" 递归构建树并返回根节点作为响应；适用于总结目的。
* 无文本：只运行检索器来获取节点，而不实际发送它们。
* 累积：对每个文本块应用查询并累积响应到一个数组中。

<strong>5\. 结构化输出</strong>  
如果你希望输出是结构化的，可以参考LlamaIndex的查询引擎和Pydantic输出，了解如何从查询引擎类中提取Pydantic对象。  
6\. <strong>创建自己的查询流水线</strong>  
如果你想设计复杂的查询流程，你可以在许多不同的模块之间组合你自己的查询流水线，包括提示/LLMs/输出解析器/检索器到你自己的自定义组件。有关详细信息，可以参考LlamaIndex的查询流水线模块指南。  

![](https://proxy-prod.omnivore-image-cache.app/1169x628,sXr_mXDQ6mD7S2QlipU5L1KWCtWeFcCsxtDIEYypUs2A/https://pic3.zhimg.com/v2-dfdeb62025c84664669c58d931570c76_b.jpg)

### 6\. 2 生产级查询策略

构建 RAG 应用程序原型很容易，但使其高性能、健壮且可扩展至大型知识库却很困难。  
构建生产级RAG 应用程序最终目标是优化您的检索和生成性能，以准确且无幻觉地回答对更复杂数据集的更多查询。下面是一些通用技术。

1. <strong>解耦检索和合成使用的块</strong>

为了更好的检索，关键是将用于检索的块与用于合成的块解耦。这是因为检索的最佳块表示可能与合成所需的考虑不同。例如，原始文本块可能包含LLM用于合成更详细答案所需的细节，但它可能包含填充词或信息，这可能会偏见嵌入表示，或者可能缺乏全局上下文，在相关查询到来时无法被检索。  

![](https://proxy-prod.omnivore-image-cache.app/600x462,sQlkA8YtxKB-K8tlZoVEobErEJ2UG3MO0--0S1R6I6xA/https://pic1.zhimg.com/v2-066ba6ab885c4e732b2bcb062c123204_b.jpg)

<strong>2\. 为更大的文档集进行结构化检索</strong>

标准RAG堆栈（top-k检索+基本文本分割）在文档数量增加时表现不佳。在这种情况下，可以使用结构化信息来帮助更精确的检索。例如，如果问到只与两个PDF相关的问题是，可以使用结构化信息确保这两个PDF在基于块的语义相似性之外被返回。  

![](https://proxy-prod.omnivore-image-cache.app/1068x598,sVY5ayElk2RZKooiCEq4N7hGPnGbU4WM4bS5KW9E3ano/https://pic4.zhimg.com/v2-296e6ad2323f3bd591189844eb422047_b.jpg)

3\. <strong>根据任务动态检索块</strong>

RAG不仅仅是关于特定事实的问答，用户可能会问各种问题。这些问题可能包括要求特定事实的问答，如“告诉我这家公司2023年的D&I计划”或“叙述者在谷歌期间做了什么”，也可能包括摘要，如“你能给我一个高层次的文档概述吗”，或者是比较“你能比较/对比X和Y吗”。这些用例可能需要不同的检索技术。  

![](https://proxy-prod.omnivore-image-cache.app/973x762,sVH89gli66jkN7NbUbZWTbsr7opsaQUJb6qn7LH4cpsE/https://pic4.zhimg.com/v2-fc521ddab4a127c6a66eb263b451209b_b.jpg)

<strong>4\. 上下文嵌入微调</strong>

这块儿主要涉及原子能力的优化，预训练模型可能无法捕捉到与用例相关的数据的显著特性。因此还可以尝试对嵌入模型进行微调。llama-index集成了微调模块。该部分主要由3个部分组成。  

1. 准备数据（`generate_qa_embedding_pairs`函数使这变得简单）
2. 微调模型（使用`SentenceTransformersFinetuneEngine`，基底模型可以选择bge等）
3. 在验证知识库上评估模型（命中率等）

> llama-index提供了自动构建训练embedding所需数据的大模型方法，promt配置如下：
> 
> Context information is below.
> 
> \---------------------  
> {context\_str}  
> \---------------------
> 
> Given the context information and not prior knowledge.  
> generate only questions based on the below query.
> 
> You are a Teacher/ Professor. Your task is to setup \\  
> {num\_questions\_per\_chunk} questions for an upcoming \\  
> quiz/examination. The questions should be diverse in nature \\  
> across the document. Restrict the questions to the \\  
> context information provided."
> 
> 现在基本上主流的RAG框架都支持embedding微调以及大模型lora微调，比如QAnything都支持，详细参考这篇：[有道 QAnything 背后的故事 --- 关于 RAG 的一点经验分享](https://xie.infoq.cn/article/2ae5eb5668425d625647fd718)

  
<strong>6.2.1 基本查询策略</strong>

1. <strong>Prompt Engineering</strong>：当你遇到与大型语言模型（LLM）相关的问题，如幻觉或格式错误的输出时，优化提示（prompt）工程是你应该首先尝试的方法之一。这包括检查并定制你在RAG管道中使用的提示，例如问答提示，并尝试添加提示函数，以便动态地注入少量示例或处理注入的输入。
2. <strong>Customizing Prompts</strong>：高级提示可以帮助你更好地控制生成的输出。例如，你可以添加提示函数来动态地注入少量的示例或者处理输入，这样可以提高输出的质量和相关性。
3. <strong>Embeddings</strong>：选择合适的嵌入模型对整体性能起着重要作用。如果你需要比OpenAI提供的默认文本嵌入模型（如ada-002）更好的性能，或者你需要一个特定于某种语言的嵌入模型，你可以考虑使用MTEB Leaderboard上的排名来选择最佳的嵌入模型。请注意，更换嵌入模型后，你需要重新索引数据，并确保索引和查询时使用相同的嵌入模型。
4. <strong>Chunk Sizes</strong>：根据你索引的数据类型或检索结果，你可能需要定制块大小或块重叠。文档被索引时会被分割成带有特定重叠量的块。默认块大小为1024，块重叠为20。改变这些参数会影响计算出的嵌入。较小的块大小意味着嵌入更精确，而较大的块大小可能更一般化，但可能会错过细粒度的细节。
5. <strong>Hybrid Search</strong>：混合搜索是指结合语义搜索（即嵌入相似性）和关键词搜索（bm25等）的结果。由于嵌入并不完美，可能会在检索步骤中遗漏与关键词匹配的文本块。解决这个问题的方法是实现混合搜索。如图所示：

![](https://proxy-prod.omnivore-image-cache.app/722x341,sLP9WwairTwAQXtV3wr4sWnDQfg08533KFDxVoeGxEhY/https://pic1.zhimg.com/v2-fec09a6b453258833ec448478311a1dc_b.jpg)

混合检索目前看的的方法有两种，一种是后交互型，一种是前交互型。

   1. 后交互型是说检索器分别检索出结果，然后对结果进行交互融合，主要采用的技术是倒数排名融合（[RRF](https://hyper.ai/wiki/29130)）算法。

![](https://proxy-prod.omnivore-image-cache.app/366x188,sUSPcQR5b_J12UWTyZGIjlrfxtEFVlNBvTsWMnBJPI4I/https://pic4.zhimg.com/v2-8b0c33d0da40c39a96638a742e51ff87_b.jpg)

 D是文档在各种检索（关键词检索，语义检索）的结果集合，r(d)是文档d在当前检索器里的排名，k是常数。

 举例：

![](https://proxy-prod.omnivore-image-cache.app/518x257,sLi4K4dsv1_oc11Ag66I08NVIL60AdXlD3UZaF0dB8pc/https://pic1.zhimg.com/v2-2177f3bd14eac37d11a53882bdd5dee0_b.jpg)

   1. 前交互型则将语义检索和关键词搜索通过embedding的方式进行前置融合（有点儿像图文融合的概念）然后进行向量检索，下面是Pinecone的[Hybrid Search](https://www.pinecone.io/learn/hybrid-search-intro/)官方例子：

![](https://proxy-prod.omnivore-image-cache.app/958x270,s8egCMkqyqnQKr5ZBfs7k-ggH1pbriVONsY8QvKJVb-U/https://pic4.zhimg.com/v2-edd40170012169ca3e4ddf228066c423_b.jpg)

> 后交互型目测用的比较多，前交互型代价似乎有点儿高，对向量存储库有较高的要求，这块儿后续有待验证。

<strong>6\. Rerank:</strong> 对前面检索到的topK进行重排序。rerank的概念源自传统搜索，其与传统faq问答用到的排序模型的概念是一致的。rerank模型一般在RAG系统的位置如图所示：

![](https://proxy-prod.omnivore-image-cache.app/1147x615,sTfxg-tTeB7i8iyov2PH3HYNefZ-97S-GZuNbVpwNPJU/https://pic3.zhimg.com/v2-4a44860a5cae798f811e0f619eff2b8a_b.jpg)

rerank模型一般采用的是交互型语义检索模型。如下所示：

![](https://proxy-prod.omnivore-image-cache.app/659x232,s37ipI9vgX0BacDzuGJxGhj2aKIBSm0gL2idxmXn7l1M/https://pic4.zhimg.com/v2-9f77bf40ebf3dcc49ca05b0a625f3603_b.jpg)

这里回顾一下前面检索环节用到的embedding模型，其一般采用双塔结构，如图所示：  

![](https://proxy-prod.omnivore-image-cache.app/627x288,sqS_ZODaLgaLmHNw09dO_KkhSYNUE8JI4w9sQSZBRxIo/https://pic1.zhimg.com/v2-d47cdeca393829dd4ec674dbd6c4dbcc_b.jpg)

> 官方没有对rerank单独抽出来讲解，但在最新的一节[Boosting RAG: Picking the Best Embedding & Reranker models](https://blog.llamaindex.ai/boosting-rag-picking-the-best-embedding-reranker-models-42d079022e83)博客特别大的篇幅论证rerank的重要性以及实际效果。在别的RAG框架rerank甚至是标配可选项，比如Qanything以及低代码平台Dify。  
> 很多同学会问前序检索的topK已经有了排序信息为什么还要再次排序？这里我列几点原因：  
> 1\. 模型准确率的问题，我们知道交互型模型的准确率是要大于双塔模型的。  
> 2\. 向量检索引擎的检索机制，向量检索引擎的突出优点就是<strong>快</strong>，快一定程度上的代价是降低准确率。如milvus等内部普遍采用HNSW算法，其是ANN（Approximate Nearest Neighbor）算法（推荐大家看这篇讲解[向量数据库技术鉴赏](https://www.bilibili.com/video/BV1BM4y177Dk/?spm%5Fid%5Ffrom=333.337.search-card.all.click&vd%5Fsource=621f9d1fd1f57a8c330d665f3690e553)），其排序结果存在不严格性。  
> 3\. 如前所述前序可能存在多个排序（向量以及bm25）结果，如果前面做了融合还好，如果没有做融合加个排序就显得尤为重要。  
> 4\. 排序的意义某种程度上降低了前序检索的精准率要求，而更期望于召回更多的有用数据，粗召回+精排序的两级检索策略使得整体检索质量得到提高。

<strong>7\. Metadata</strong>：在将文档投入向量索引之前，附加元数据可能是有用的。这些元数据稍后可以用来帮助追踪响应对象中答案的来源，也可以用来在查询时过滤数据，以便在执行前k相似性搜索之前过滤数据。

<strong>8\. Multi-Tenancy</strong>：在RAG系统中实现多租户是确保数据安全的关键。它允许用户独占访问其索引的文档，防止未经授权的共享并保护数据隐私。搜索操作被限制在用户自己的数据上，保护敏感信息。通过使用Vector Store Index和VectorDB提供商的元数据过滤器，可以实现这一点。

<strong>6.2.2 高级查询策略</strong>  
llama-index的高级查询策略被称为Agentic strategies。  
您可以在现有的LlamaIndex RAG（检索-分析-生成）流程之上构建代理，以赋予其自动化决策能力。许多模块（如路由、查询转换等）本质上就是代理性的，因为它们使用大型语言模型（LLMs）来进行决策。  
1\. <strong>Simpler Agentic strategies</strong>  
更简单的代理策略包括路由和查询转换。  
路由  
查询转换  
子问题查询引擎（Intro）  
2\. <strong>数据代理</strong>  
本指南将向您展示如何部署一个完整的代理循环，它能够在现有的RAG查询引擎之上进行思维链和查询规划，作为更高级决策的工具。确保查看我们关于数据代理的完整模块指南，它突出了这些用例以及更多内容。我们的低级代理API向您展示了代理的工作原理（分步骤执行）。  
下面的示例指南（使用OpenAI函数调用）：  
OpenAI代理  
带有查询引擎的OpenAI代理  
OpenAI代理检索  
OpenAI代理查询烹饪指南  
OpenAI代理查询规划  
OpenAI代理上下文检索

## 7\. 评估

llama-index在RAG评估这块儿目测应该是业内做的最完善。很多后起的RAG框架都引用llama-index的评估策略和方法。

### 7.1 评估概念

<strong>7.1.1 组件评估（Component Wise Evaluation）</strong>

为了更深入地评估你的流程，将其分解为对单个组件的评估是有帮助的。例如，某个特定的失败案例可能是由于未能检索到正确的文档，以及大型语言模型（LLM）误解上下文并幻想出错误结果的结合。能够单独隔离和处理这些问题可以帮助降低复杂性，并指导你逐步获得更满意的整体结果。  
1\. <strong>利用公共基准</strong>  
在进行初始模型选择时，查看模型在标准化、多样化的领域或任务集上的表现是很有帮助的。对于嵌入来说，一个有用的基准是MTEB排行榜。  
2\. <strong>评估检索</strong>

BEIR数据集

BEIR对于基准测试一个检索模型是否能在零样本设置中很好地泛化到特定领域是有用的。由于大多数公开可用的嵌入和检索模型已经针对BEIR进行了基准测试（例如，通过MTEB基准），当你有一个独特的模型想要评估时，使用BEIR更有帮助。例如，在你在自己的数据集上对嵌入模型进行微调后，查看其在多样化领域上的表现是否有所下降，以及下降了多少，这可能是数据漂移影响你检索准确性的一个指示，比如如果你在你的RAG系统之外添加了文档，而这些文档不在你的微调训练分布中。这里有一个笔记本展示了如何将BEIR数据集与你的检索流程一起使用。  
3\. <strong>评估查询引擎组件（无检索）</strong>  
在这种情况下，我们可能想要评估查询引擎的特定组件（可能会生成子问题或后续问题的组件）在标准基准上的表现。这可以帮助表明你的检索流程与替代流程或模型相比是落后还是领先。  
HotpotQA数据集用于评估需要多个检索步骤的查询是有用的。例如：HotpotQAEval 限制：HotpotQA是在Wikipedia语料库上评估的。LLMs，特别是GPT-4，倾向于相对很好地记住Wikipedia的信息。因此，这个基准对于评估知识型模型如GPT-4的检索+重排系统并不特别有用。

  
<strong>7.1.2 端到端评估（End-to-End Evaluation）</strong>

端到端评估是一种衡量方法，用于指导你的RAG（检索式生成）应用程序的性能——即你的处理流程是否能在给定的数据源和一系列查询的基础上生成正确的响应。虽然最初单独检查每个查询和响应是有帮助的，但随着你处理更多的失败案例和边缘情况，这种做法可能变得不可行。相反，定义一套总结性指标或自动化评估可能更有帮助，这样可以为你提供直观的理解，告诉你它们可能告诉你什么，以及你可能需要深入探究的领域。  
1\. <strong>建立评估集</strong>  
拥有一个小型但多样化的查询集是有益的起点，并在发现有问题的查询或交互时逐步增加更多示例。我们创建了一些工具，可以根据一组文档自动为你生成数据集进行查询。（见下面的示例）  
2\. <strong>问题生成</strong>  
在未来，我们也将能够针对工具自动创建数据集。  
3\. <strong>评估选项的范围</strong>  
定量评估在评估有正确答案的应用程序时非常有用——例如，验证工具及其输入的选择是否正确，或者在给定计划的基础上检索特定的信息片段，或者尝试产生某种特定模式（例如JSON字段）的中间输出。  
定性评估在生成长篇响应时非常有用，这些响应旨在有帮助，但不一定完全准确。评估选项的范围从指标、更便宜的模型、更昂贵的模型（如GPT-4）到人工评估。  
以下是一些批量评估模块：  
\- 正确性评估（CorrectnessEval）  
\- 信仰评估（FaithfulnessEval）  
\- 指导评估（GuidelineEval）  
\- 成对评估  
\- 相关性评估（RelevancyEval）  
\- 语义相似性评估（SemanticSimilarityEval）  
\- 发现性-敏感性测试（Discovery-SensitivityTesting）  
4\. <strong>敏感性测试</strong>  
在处理复杂的处理流程时，可能不清楚哪些部分正在影响你得到的结果。敏感性测试可以是一个很好的起点，用于选择哪些组件进行单独测试或更细致的调整，或者哪些部分的数据集（例如查询）可能产生有问题的结果。关于如何使用敏感性测试等方法自动发现问题，我们将在后续更新中提供更多细节。在更传统的机器学习领域，这方面的例子包括Giskard。  
5\. <strong>指标集成</strong>  
使用GPT-4进行评估可能会很昂贵，尤其是当你的开发集变大时。指标集成使用一系列较弱的信号（精确匹配、F1、ROUGE、BLEU、BERT-NLI和BERT相似度）来预测更昂贵的评估方法的输出，这些方法更接近金标准（人工标记/GPT-4）。它的目的是两个方面：  
\- 在开发阶段，快速、经济地评估大数据集的变化。  
\- 在生产监控阶段，标记异常值以进行进一步评估（GPT-4/人工警报）。  
我们还希望指标集成是可解释的——相关性和权重分数应该能够指示哪些指标最能捕捉评估标准。我们将在后续的更新中进一步讨论这个方法论。

### 7.2 评估策略

LlamaIndex 的目的是将你的数据与你的LLM（大型语言模型）应用连接起来。有时候，即使通过查看追踪来诊断和修复错误，还需要更细致的评估来系统地诊断问题。LlamaIndex 旨在提供这些工具，使识别问题和接收有用的诊断信号变得简单。评估与实验和实验跟踪的概念密切相关。  
1\. <strong>一般策略</strong>  
在开发你的LLM应用时，首先定义一个端到端的评估工作流程可能会有所帮助。一旦你开始收集失败案例或特殊情况，并对于哪些方面做得好或不好有了直观感受，你可能会想要更深入地评估和改进特定组件。这与软件测试中的集成测试和单元测试的类比。你可能会在开始处理单个组件时开始编写单元测试。同样，判断各个部分是否协同工作的良好标准是集成测试。这两者都非常重要。  
2\. <strong>E2E 或组件评估 - 我应该从哪个开始？</strong>  
如果你想在迭代过程中获得系统整体表现的大致概念，那么以E2E评估为中心开始是有意义的，作为一个整体的健全性/感觉检查。如果你对正在做的事情有了一定的了解，并希望逐步迭代每个组件，逐步构建，那么你可能会想要从组件评估开始。然而，这样做可能会带来过早优化的风险——在没有评估整体应用需求的情况下进行模型选择或参数选择。在创建最终应用时，你可能需要重新审视这些选择。  
3\. <strong>深入评估</strong>  
评估是一个有争议的话题，随着NLP（自然语言处理）领域的发展，评估方法也在不断变化。在一个强大的基础模型现在比人类标注者更好地执行标注任务的世界里，评估的最佳实践不断变化。以前用于引导和评估当今模型的评估方法，如BLEU或F1，已被证明与人类判断的相关性较差，需要谨慎应用。通常，生成性重、开放式任务需要判断意见，比事实问题更难自动评估，因为它们的性质是主观的。我们将致力于为特定场景提供更多适当的方法指南和案例研究。  
4\. <strong>标准指标</strong>  
针对标注数据集，无论是你自己的数据还是学术基准，都有一些标准指标需要了解：

* 完全匹配（EM）：查询被完全正确回答的百分比。
* 召回率：查询被正确回答的百分比，不考虑返回的答案数量。
* 精确度：查询被正确回答的百分比，除以返回的答案数量。
* F1：F1分数是精确度和召回率的调和平均数。因此，它在一个指标中对称地代表了精确度和召回率，考虑了假阳性和假阴性。

更详细的NDCG、MAP和MRR这样的技术指标参见：[RAG评价指标](https://towardsdatascience.com/ranking-evaluation-metrics-for-recommender-systems-263d0a66ef54)  
5\. <strong>案例研究和资源</strong>

* (Course) [Data-Centric AI (MIT), 2023](https://www.youtube.com/playlist?list=PLnSYPjg2dHQKdig0vVbN-ZnEU0yNJ1mo5)
* [Scale's Approach to LLM Testing and Evaluation](https://scale.com/llm-test-evaluation)
* [LLM Patterns by Eugene Yan](https://eugeneyan.com/writing/llm-patterns/)

## 8\. langchain对比

LlamaIndex的重点放在了Index上，也就是通过各种方式为文本建立索引，有通过LLM的，也有很多并非和LLM相关的。LangChain的重点在 Agent 和 Chain 上，也就是流程组合上。可以根据你的应用组合两个，如果你觉得问答效果不好，可以多研究一下LlamaIndex。如果你希望有更多外部工具或者复杂流程可以用，可以多研究一下LangChain。  
尽管LlamaIndex和LangChain在它们的主要卖点上有很多重叠，即数据增强的摘要和问答，但它们也有一些区别。LangChain提供了更细粒度的控制，并覆盖了更广泛的用例。然而，LlamaIndex的一个很大的优势是能够创建层次化的索引，这在语料库增长到一定大小时非常有帮助。  
总的来说，这两个有用的库都很新，还在发展阶段，每周或每月都会有比较大的更新。

## 9\. 总结与展望

llama-index 不仅具备丰富的功能，而且作为一个Python库，它仍在不断发展和完善。它极大地便利了与大语言模型相关的应用程序开发。相关文档可在官方网站查阅，代码也是开源的。如遇问题，您还可以直接查看源代码以深入了解。  
实际上，llama-index 提供了一种创新的大语言模型应用设计模式。它通过先为外部资料库建立索引，再在每次提问时从资料库中搜索相关内容，最后利用AI的语义理解能力基于搜索结果回答问题。  
引用一下开头[RAG综述](https://arxiv.org/abs/2312.10997)中相关介绍，其特别提到llama-index框架，内容如下"在 RAG 的技术生态系统中，相关技术栈的发展起着推动作用。例如，随着 ChatGPT 的流行，LangChain 和 LLamaIndex 迅速成为知名技术，它们提供丰富的 RAG 相关 API，成为大模型时代的关键技术之一...技术栈的发展与 RAG 的进步相互促进。新技术对现有技术栈提出了更高的要求，而技术栈功能的优化又进一步推动了 RAG 技术的发展。综合来看，RAG 工具链的技术栈已经初步建立，许多企业级应用逐步出现。然而，一个全面的一体化平台仍在完善中。"  
个人认为对于算法工程师来说，不需要从头搭一个包罗万象的RAG框架，回归到算法本身，我们应该充分了解现有的各种RAG查询策略的不足，把重心放在<strong>核心查询策略的构建优化</strong>以及<strong>核心模型的研发</strong>上面，放在使用RAG技术<strong>解决具体业务问题</strong>上。

一句话：把llama-index当成脚手架，而不是杀手锏，对于AI企业,杀手锏永远掌握在自己手上。

发布于 2024-04-07 22:48・IP 属地广东 ，编辑于 2024-04-08 10:44・IP 属地广东

