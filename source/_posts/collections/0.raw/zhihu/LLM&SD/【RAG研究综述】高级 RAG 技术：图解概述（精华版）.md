---
title: 【RAG研究综述】高级 RAG 技术：图解概述（精华版）
date: "2025-06-25 00:00:00"
updated: "2025-06-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【RAG研究综述】高级-RAG-技术-图解概述(精华版)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/674906924
---


### 高级RAG(Advanced RAG)

下图展示了涉及的核心步骤和算法的图表。为了保持图表的可读性，省略了一些逻辑循环和复杂的多步骤<strong>智能体行为（Agentic Behaviours）。</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9afd92149d4b.jpg)

高级 RAG 架构中的一些关键组成部分图表中的绿色元素是接下来将要讨论的核心RAG技术，蓝色元素代表文本。并非所有高级RAG的想法都能在单一图表上轻松可视化，比如各种上下文扩展方法都在上图中被省略了。

#### 1. 分块和向量化（Chunking & Vectorisation）

首先，我们需要创建一个向量索引，代表我们文档的内容，然后在运行时搜索与查询向量最接近的语义含义。

<strong>分块（Chunking）</strong>

Transformer模型有固定的输入序列长度，即使输入上下文窗口很大，一个句子或几个句子的向量也比几页文本的平均向量更能代表它们的语义含义（这取决于模型，但通常是这样）。因此，需要对数据进行分块——将初始文档分割成一定大小的块，同时不丢失它们的意义（例如，将文本分割成句子或段落，而不是将单个句子切成两部分）。有各种文本分割器实现可以完成这项任务。

块的大小是一个需要考虑的参数——它取决于你使用的向量模型及其在token上的容量。标准的变换器编码器模型，如基于BERT的<strong>语句转换器(Sentence Transformers)</strong>，最多处理512个token，OpenAI的ada-002能够处理更长的序列，如8191个token。但这里的折中是为LLM提供足够的上下文进行推理，与执行搜索时足够具体的文本向量。关于块大小选择的研究可以在《[LLM应用中的分块策略](https://zhuanlan.zhihu.com/p/675474411)》一文中找到。在LlamaIndex中，这是通过<strong>NodeParser类</strong>实现的，提供了一些高级选项，如定义自己的文本分割器、元数据、节点/块关系等。

<strong>向量化（Vectorisation）</strong>

下一步是选择一个模型来向量化我们的块，作者选择了像[bge-large](https://link.zhihu.com/?target=https%3A//huggingface.co/BAAI/bge-large-en-v1.5)或[E5](https://link.zhihu.com/?target=https%3A//huggingface.co/intfloat/multilingual-e5-large)这样的向量家族来搜索优化模型，读者也可以查看[MTEB排行榜](https://link.zhihu.com/?target=https%3A//huggingface.co/spaces/mteb/leaderboard)以获取最新更新。

关于分块和向量化步骤的端到端实现，可以查看LlamaIndex中完整数据摄取管道的示例。

这部分内容详细介绍了在RAG管道中进行分块和向量化的过程，这是提高检索效率和生成质量的关键步骤。通过这两个步骤，可以确保RAG系统能够快速地从大量数据中检索到最相关的信息，并基于这些信息生成准确、相关的回答。

#### 2. 搜索索引（Search Index）

<strong>向量存储索引(Vector Store Index)</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_38b8311131b0.jpg)

在这个方案的介绍以及文中的其他部分里，作者为了简化方案省略了Encoder模块，直接将查询发送到索引。当然，查询总是首先被向量化。同样，索引检索的是前k个向量而不是块，但作者将它们替换为块，因为获取它们很简单。RAG管道的关键部分是搜索索引，它存储了前一步骤中获得的向量化内容。最简单的实现使用了<strong>平面索引(flat index)</strong>——在查询向量和所有块向量之间进行直接距离计算。

一个适合在10000+元素规模上进行高效检索的搜索索引是<strong>向量索引(vector index)</strong>，如faiss、[nmslib](https://link.zhihu.com/?target=https%3A//github.com/nmslib/nmslib)或[annoy](https://link.zhihu.com/?target=https%3A//github.com/spotify/annoy)，使用一些<strong>近似最近邻(Approximate Nearest Neighbours, ANN)</strong>实现，如聚类、树或HNSW(Hierarchical Navigable Small World)算法。

还有一些托管解决方案，如OpenSearch或ElasticSearch，以及向量数据库，它们在后台处理了前面描述的数据摄取管道，如Pinecone、Weaviate或Chroma。

根据索引选择、数据和搜索需求，用户还可以在存储向量的同时存储<strong>元数据(metadata)</strong>，然后使用元数据filter来搜索某些日期或来源内的信息。

LlamaIndex支持许多向量存储索引，但也支持其他更简单的索引实现，如列表索引、树索引和关键词表索引——作者将在<strong>融合检索(Fusion Retrieval)</strong>部分讨论后者。

<strong>多层索引(Hierarchical Indices)</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9a2bc071d96d.jpg)

多层索引检索流程如果需要从很多文档中检索，那就需要能够高效地搜索其中的相关信息，找到有用的并将其合成为带有来源引用的单一答案。在处理大型数据库的情况中，要高效做到这一点的方法是<strong>创建两个索引</strong>——<strong>一个由摘要组成，另一个由文档块组成</strong>，并进行两步搜索，首先通过摘要筛选出满足相关性要求的文档，然后仅在这些文档内继续深入搜索。

<strong>假设问题和假设向量文档(Hypothetical Questions and HyDE)</strong>

另一种方法是让LLM为每个块生成问题，并将这些问题以向量形式嵌入，在运行时对这些问题向量索引执行查询搜索（在我们的索引中用问题向量替换块向量），然后在检索后路由到原始文本块，并将它们作为上下文发送给LLM以获取答案。

这种方法通过在查询和假设问题之间的更高语义相似性来提高搜索质量，与我们对实际块所拥有的相比。

还有一种逆向逻辑方法称为<strong>假设向量文档(Hypothetical Document Embeddings, HyDE)——用户可以让LLM为给定的查询生成一个假设性响应，然后使用它的向量以及查询向量来增强搜索质量</strong>。

<strong>上下文增强(Context Enrichment)</strong>

这里的概念是检索较小的块以提高搜索质量，但增强上下文内容语境以供LLM推理。

上下文增强有两套方案，一是利用在较小检索块附件的句子来扩展上下文，二是递归地将文档分割成包含更小子块的更大父块。

- <strong>句子窗口检索(Sentence Window Retrieval)</strong>
在这个方案中，文档中的每个句子都被单独向量化，这为查询与上下文的<strong>余弦距离(cosine distance)</strong>搜索提供了极高的准确性。

为了在获取最相关的单个句子后更好地推理所找到的上下文，我们通过在检索到的句子前后各扩展k个句子来扩展上下文窗口，然后将这个扩展的上下文发送给LLM。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6a19bba1a999.jpg)

绿色部分是在索引中找到的句子向量，而整个黑色+绿色段落被提交给LLM以在推理所提供的查询时扩大其上下文。

- <strong>自动合并检索器(Auto-merging Retriever，又称父文档检索器 Parent Document Retriever)</strong>
这里的想法与句子窗口检索器非常相似——搜索更颗粒度更细的信息，然后在将检索到的上下文送给LLM推理前扩展上下文窗口。文档被递归地分割成更大父块中更小的子块。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_680e61cc0a0f.jpg)

文档被分割成一个多层结构的块，然后最小的叶子块被发送到索引。在检索时，我们首先检索k个叶子块，如果在前k个检索到的块中有n个块指向同一个父块，我们用这个父块替换送给LLM的上下文这个过程就像将几个检索到的子块自动合并到一个更大的父块一样。需要注意的是——搜索仅在子节点索引中执行。有关<strong>递归检索器+节点引用</strong>的更深入探讨，请查看LlamaIndex教程。

<strong>融合检索或混合搜索(Fusion Retrieval or Hybrid Search)</strong>

一个相对早期的想法是用户可以结合基于关键词的传统搜索，比如词频-逆文档频率(Term Frequency-Inverse Document Frequency, TF-IDF)或搜索行业标准BM25等<strong>稀疏检索算法(sparse retrieval algorithm)</strong>和最新的<strong>语义搜索(semantic search)</strong>和<strong>向量搜索(vector search)</strong>，生成一个最优的检索结果。

这里关键的技巧是正确地结合具有不同相似度得分的检索结果——这个问题通常通过<strong>互惠排名融合(</strong>Reciprocal Rank Fusion, RRF<strong>)</strong>算法解决，对检索结果进行重新排序以得出最终输出。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a02c006c3ad3.jpg)

融合检索/混合搜索流程在LangChain中，这是在Ensemble Retriever类中实现的，结合了用户定义的一系列检索器，例如基于faiss的向量索引和基于BM25的检索器，并使用RRF进行重新排序。在LlamaIndex中的实现方式也非常的相似。

混合或融合搜索通常提供更好的检索结果，因为两种互补的搜索算法被结合在一起，同时考虑了查询与存储文档之间的语义相似性和关键词匹配。

#### 3. 重新排序和过滤(Reranking & Filtering)

通过上述任何一种算法获得了检索结果，在这个阶段可以通过过滤、重新排序或某种转换来提炼它们。在LlamaIndex中，有各种可用的<strong>后处理器(Postprocessors)</strong>，根据相似度得分、关键词、元数据过滤结果，或者使用其他模型（如LLM、<strong>句子转换器交叉编码器(sentence-transformer cross-encoder)</strong>、Cohere重新排序端点）或基于元数据（如日期最新性）重新对它们进行排序，能想到的方式LlamaIndex基本都能支持。

这是将检索到的上下文提交给LLM以获得最终答案前的最后一步。

接下来文章要进入更复杂的RAG技术，如<strong>查询转换(Query Transformation)</strong>和<strong>查询路由(Query Routing)</strong>，这两个技术都涉及到LLM，并且表现出了明显的<strong>智能体行为(Agentic Behaviour)</strong>——在RAG管道中融合了LLM推理能力的一些复杂逻辑。

#### 4. 查询转换(Query Transformations)

查询转换是一系列技术的总称，使用LLM作为推理引擎来修改用户输入，以提高检索质量。有几种不同的方法可以做到这一点。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7bf02e008a0d.jpg)

查询转换原则示意图如果查询很复杂，LLM可以将其分解为几个子查询。例如，如果用户问：“*在Github上，Langchain和LlamaIndex哪个更优秀？*”，而我们不太可能在语料库中的某些文本中找到直接的比较，所以将这个问题分解为两个子查询是有意义的，假设更简单、更具体的信息检索：“*Langchain在Github上有多少星星？*”“*Llamaindex在Github上有多少星星？*”它们将并行执行，然后将检索到的上下文合并到一个提示中，供LLM合成对初始查询的最终答案。

这两个库都实现了这个功能——在Langchain中作为<strong>多查询检索器(Multi Query Retriever)</strong>，在Llamaindex中作为<strong>子问题查询引擎(Sub Question Query Engine)</strong>。

- <strong>[回退提示(Step-back prompting)](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2310.06117.pdf%3Fref%3Dblog.langchain.dev)</strong>使用LLM生成一个更普适的查询，检索它我们获得一个更普适或更高层次的上下文语境，有助于支撑初始查询的答案。初始查询的检索同时被执行，两个上下文都被提交到LLM以便在最后一步生成答案。这里可以看到[LangChain的实现](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain/blob/master/cookbook/stepback-qa.ipynb%3Fref%3Dblog.langchain.dev)。
- <strong>查询重写(Query re-writing)</strong>使用LLM重新构造初始查询以提升检索效率。[LangChain](https://link.zhihu.com/?target=https%3A//github.com/langchain-ai/langchain/blob/master/cookbook/rewrite.ipynb%3Fref%3Dblog.langchain.dev)和LlamaIndex都有实现，作者的观点是LlamaIndex的解决方案更强大。

#### 参考引用(Reference citations)

当前这个条目作者没有给它编号，因为这项技术更像是一种工具，而不是检索改进技术，尽管它确实非常重要。

如果用户使用多个检索来源生成答案，无论是因为初始查询的复杂性（用户不得不执行多个子查询，然后将检索到的上下文合并为一个答案），还是因为在不同文档中找到了某个查询的相关上下文，那么就会出现一个问题，即Generator是否能准确地显示所使用的引用来源。

有几种方法可以做到这一点：

- <strong>将这个显示引用源的任务插入到prompt中</strong>，要求LLM说明所使用的引用源编号。
- <strong>将生成的答案部分与索引中的原始文本块匹配</strong>——LlamaIndex为这种情况提供了一种高效的<strong>[模糊匹配解决方案(fuzzy matching based solution)](https://link.zhihu.com/?target=https%3A//github.com/run-llama/llama-hub/tree/main/llama_hub/llama_packs/fuzzy_citation)</strong>(<strong>模糊匹配(fuzzy matching)</strong>是一种非常强大的字符串匹配技术)。

#### 5. 聊天引擎（Chat Engine）

要构建一个能够对单个查询多次执行操作的高效RAG系统，下一个重要步骤是实现聊天逻辑，这与经典聊天机器人在LLM时代之前处理对话上下文的方式类似。采用这种方式是为了支持后续问题、指代解析或与之前对话上下文相关的任何用户指令。解决这一问题的方法是通过<strong>查询压缩(query compression)</strong>技术，同时考虑聊天上下文和用户查询。

在上下文压缩方面，有几种方法可供选择：

- 一种比较流行且相对简单的方法是使用ContextChatEngine，它首先检索与用户查询相关的上下文，然后将其连同聊天历史记录从内存缓冲区取出发送给LLM，以便LLM在生成下一个答案时能够了解之前的上下文。
- 另一种相对复杂的情况是CondensePlusContextMode，在这种模式下，每次交互中的聊天记录和最后一条消息被压缩成一个新的查询，然后这个查询被发送到索引里，并把检索到的上下文连同原始用户消息一起传递给LLM以生成答案。
值得注意的是，LlamaIndex还支持基于OpenAI智能体聊天引擎，提供了更灵活的聊天模式，而Langchain也支持OpenAI的功能性API。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_73ab0c6b8517.jpg)

两种类型聊天引擎的原理示意图聊天引擎是RAG系统中的一个关键组件，它不仅处理用户的直接查询，还能够理解和响应与之前对话上下文相关的内容。通过这种方式，RAG系统能够提供更连贯、更自然的对话体验。

#### 6. 查询路由(Query Routing)

查询路由是指针对用户的查询，由LLM来决定下一步操作的决策步骤。通常的选择包括总结信息、对某些数据索引进行搜索，或尝试多种不同的路径并将它们的输出合成为唯一的答案。

<strong>查询路由器(Query Routers)</strong>还用于选择索引，或者更通俗地说是选择执行用户查询命令的数据源。无论是拥有多个数据源（比如经典的向量存储、图形数据库或关系数据库），还是拥有多层索引结构（比如处理在多文档存储的时候，一个典型的索引创建方案很可能是一个由摘要组成的索引和另一个由文档块向量组成的索引），都需要进行查询路径选择。

<strong>定义查询路由器时需要包括设置其可以做出的选择</strong>。路由选项的选择是通过LLM调用来执行的，返回结果采用预定义格式，用于将查询路由到给定的索引，或者在涉及智能体行为的情况下，路由到子链或其他智能体，如<strong>多文档智能体方案</strong>中所示。

LlamaIndex和LangChain都支持查询路由器。

文章这部分内容详细介绍了查询路由在RAG系统中的应用，查询路由器不仅处理用户的直接查询，还能够根据查询的性质和上下文，选择最合适的数据处理路径，从而优化RAG系统的整体性能。

#### 7. RAG中的智能体（Agents in RAG）

Langchain和LlamaIndex从第一个LLM API发布以来就都支持<strong>Agents——一个能够进行推理、提供一系列工具和一个完成特定任务的LLM</strong>。智能体提供的工具可能包括如各种语言代码功能，各种外部API，甚至各种其他智能体——这种LLM链式的想法是LangChain名字的由来。

智能体本身就是一个庞大的概念，要在RAG概述中深入探讨是不可能的，因此作者选择继续讨论基于代理的多文档检索案例，并会稍微着重介绍一下OpenAI Assistants(这是一个崭新的概念，最近在OpenAI开发者大会上以GPTs的形态展示给用户)，并在文章后面所描述的RAG系统的底层发挥作用。

OpenAI Assistants基本上实现了LLM周边之前在开源项目中已经存在的各种工具——聊天历史记录、知识存储、文档上传界面，以及最重要的函数调用API。这个API提供了将自然语言转换为使用API调用外部工具或数据库查询的能力。

在LlamaIndex中，有一个OpenAIAgent类，将这种高端逻辑与ChatEngine和QueryEngine类结合在一起，提供基于外部知识库和上下文感知的聊天功能，以及在一次对话中调用多个OpenAI函数的能力，真正实现了拥有足够智慧的智能体行为(Agentic Behaviour)。

接下来看一下<strong>多文档智能体(Multi-Document Agents)</strong>的方案——一个相当复杂的设置，涉及为每个文档初始化一个OpenAIAgent的智能体，用来实现文档摘要和传统问答机制，以及一个负责将查询分配到对应文档智能体并合成最终答案的<strong>顶层智能体</strong>。每个文档智能体都有两个索引——一个向量存储索引和一个摘要索引，根据查询路由决定使用哪一个。对于顶层智能体来说，所有文档智能体都是其工具。

这个方案展示了一个高级RAG架构，其中每个智能体都做出了许多路由决策。<strong>这种方法的好处是能够比较在不同文档及其摘要中有所描述的解决方案或实体</strong>，同时也适用于传统的单文档摘要和问答机制——以上基本上涵盖了大多数与文档集合聊天的案例。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5d96f4d58be7.jpg)

多文档智能体的示意图，涉及查询路由和智能体的行为模式

这种复杂方案的缺点基本可以从上图中推测出来——由于涉及智能体内部的多次LLM迭代，所以执行效率有点低下。需要注意的是，LLM调用总是RAG管道中最费时的操作。因此，对于大型多文档存储，建议考虑对这个方案进行一些简化，以便提高其可扩展性。

#### 8. 响应合成器（Response Synthesiser）

这是每个RAG管道的最后一步——基于用户精心检索到的所有上下文和初始用户查询生成答案。最简单的方法是将所有检索到的上下文（高于某个相关性阈值）与查询一起连续地提交给LLM。但总有其他更复杂的方案，比如多次执行LLM调用来细化检索到的上下文，以生成更完美的答案。

响应合成的主要方法包括：

- 通过将检索到的上下文逐块提交给LLM来迭代优化答案**。
- <strong>摘要检索到的上下文</strong>以匹配prompt。
- 基于不同上下文块<strong>生成多个答案</strong>，然后将它们<strong>融合或摘要</strong>。
有关响应合成器模块的更多细节，请查阅相关文档。

这部分内容详细介绍了RAG系统中智能体的应用，展示了如何通过智能体来优化系统性能，确保用户查询得到最有效的处理。

### 编码器和LLM微调（Encoder and LLM Fine-Tuning）

这一段作者相对浮光掠影地介绍了可以对RAG管道产生优化作用的<strong>编码器微调(Encoder Fine-Tuning)</strong>，<strong>排名器微调(Ranker Fine-Tuning)</strong>，<strong>LLM微调(LLM Fine-Tuning)</strong>，有兴趣的读者可以去翻原文，楼主这边就不翻了。

### 评估(Evaluation)

这一段楼主也跳过，感兴趣的读者除了阅读作者原文外，还可以看[母贴](https://zhuanlan.zhihu.com/p/673392898)中两篇有关科学评估RAG的文章翻译：《Evaluating RAG Applications with RAGAs》和《Evaluating Verifiability in Generative Search Engines》


> *文章精华摘要到此结束，感谢同学们的认真阅读，如发现有错误或疑问请在评论区留言。
*翻译辛苦，码字不易，如果感觉有收获，欢迎赞同/喜欢/收藏本文，并关注楼主

### 原文地址

### 母贴地址

[](https://zhuanlan.zhihu.com/p/673392898)

### 子贴地址

[](https://zhuanlan.zhihu.com/p/675474411)
