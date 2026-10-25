---
title: 为你的RAG选择最好的嵌入和排序模型 - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-09/为你的RAG选择最好的嵌入和排序模型-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 4fea7b3b-1612-41f0-8ab1-e87f0189ce01
---

# 为你的RAG选择最好的嵌入和排序模型 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-18ec2e7ab7d)
[Read Original](https://zhuanlan.zhihu.com/p/665044136)



发布于 2023-11-06 23:02・IP 属地北京 ，编辑于 2024-03-08 12:37・IP 属地北京

12.3日：译文更新了下jina结果，之前LlamaIndex的评测有点问题。

## 引言

在构建检索增强生成 (RAG) 系统时，一个关键组件是检索器。 我们有多种嵌入模型可供选择，包括 OpenAI、CohereAI 和 sentence transformers。 此外，CohereAI 和sentence transformers还提供多种重新排序模型。

但有了所有这些选项，我们如何确定最佳组合？ 我们如何知道哪种嵌入模型最适合我们的数据？ 或者哪个重新排名对我们的结果提升最大？

在这篇博文中，我们将使用 LlamaIndex 的检索评估模块来快速确定嵌入和重新排序模型的最佳组合。 让我们深入了解一下吧！

让我们首先了解检索评估中可用的指标

## 理解检索评估中的指标

为了评估我们检索系统的准确性，我们主要依靠两个广泛应用的指标：**命中率（Hit Rate）和平均倒数排名（MRR）**。 让我们深入研究这些指标，以了解它们的重要性以及它们的运作方式。

**Hit Rate:**

Hit Rate计算在前 k 个检索到的文档中找到正确答案的比例。

**平均倒数排名 (MRR)：**

对于每个查询，MRR 通过查看排名最高的相关文档的排名来评估系统的准确性。 具体来说，它是所有查询中这些排名的倒数的平均值。 因此，如果第一个相关文档是最高结果，则倒数排名为 1； 如果是第二，则倒数排名为1/2，以此类推。

**现在我们已经熟悉了评价的指标，是时候深入实验了。** 

## **生成评测数据的代码**

**设置环境：**

```mipsasm
!pip install llama-index sentence-transformers cohere anthropic voyageai protobuf pypdf
```

**设置keys：**

```ini
openai_api_key = 'YOUR OPENAI API KEY'
cohere_api_key = 'YOUR COHEREAI API KEY'
anthropic_api_key = 'YOUR ANTHROPIC API KEY'
openai.api_key = openai_api_key
```

**下载数据：**

**我们将使用 Llama2 的paper进行此实验。 让我们下载论文。**

```dockerfile
!wget --user-agent "Mozilla" "https://arxiv.org/pdf/2307.09288.pdf" -O "llama2.pdf"


```

**加载数据：**

让我们加载数据。 我们将使用从开始到 36 页进行实验，不包括目录、参考文献和附录。

然后，这些数据被解析并转换为节点，这些节点代表我们想要检索的数据块。 我们使用的chunk\_size 为 512。

```reasonml
documents = SimpleDirectoryReader(input_files=["llama2.pdf"]).load_data()

node_parser = SimpleNodeParser.from_defaults(chunk_size=512)
nodes = node_parser.get_nodes_from_documents(documents)
```

  
**生成问题-内容对：**

为了评测不同模型的性能，我们构造了一个问题-上下文对的数据集。 该数据集可以看作是我们数据中的一组问题及其相应的上下文。 为了消除嵌入（OpenAI / CohereAI）和Reranker（CohereAI）评估的偏差，我们使用Anthropic LLM来生成问题上下文对。

让我们初始化一个提示模板来生成问题-上下文对。

```smalltalk
# Prompt to generate questions
qa_generate_prompt_tmpl = """\
Context information is below.

---------------------
{context_str}
---------------------

Given the context information and not prior knowledge.
generate only questions based on the below query.

You are a Professor. Your task is to setup \
{num_questions_per_chunk} questions for an upcoming \
quiz/examination. The questions should be diverse in nature \
across the document. The questions should not contain options, not start with Q1/ Q2. \
Restrict the questions to the context information provided.\
```

```routeros
llm = Anthropic(api_key=anthropic_api_key)
qa_dataset = generate_question_context_pairs(
    nodes, llm=llm, num_questions_per_chunk=2
)
```

**清理数据集：**

```routeros
# function to clean the dataset
def filter_qa_dataset(qa_dataset):
    """
    Filters out queries from the qa_dataset that contain certain phrases and the corresponding
    entries in the relevant_docs, and creates a new EmbeddingQAFinetuneDataset object with
    the filtered data.

    :param qa_dataset: An object that has 'queries', 'corpus', and 'relevant_docs' attributes.
    :return: An EmbeddingQAFinetuneDataset object with the filtered queries, corpus and relevant_docs.
    """

    # Extract keys from queries and relevant_docs that need to be removed
    queries_relevant_docs_keys_to_remove = {
        k for k, v in qa_dataset.queries.items()
        if 'Here are 2' in v or 'Here are two' in v
    }

    # Filter queries and relevant_docs using dictionary comprehensions
    filtered_queries = {
        k: v for k, v in qa_dataset.queries.items()
        if k not in queries_relevant_docs_keys_to_remove
    }
    filtered_relevant_docs = {
        k: v for k, v in qa_dataset.relevant_docs.items()
        if k not in queries_relevant_docs_keys_to_remove
    }

    # Create a new instance of EmbeddingQAFinetuneDataset with the filtered data
    return EmbeddingQAFinetuneDataset(
        queries=filtered_queries,
        corpus=qa_dataset.corpus,
        relevant_docs=filtered_relevant_docs
    )

# filter out pairs with phrases `Here are 2 questions based on provided context`
qa_dataset = filter_qa_dataset(qa_dataset)
```

## 评测代码

为了确定最佳搜索系统，我们结合使用了嵌入模型和重排序器。 最初，我们建立一个基础VectorIndexRetriever。 在检索到的节点中，我们引入重新排序器以进一步细化结果。 值得注意的是，对于这个特定的实验，我们将similarity\_top\_k设置为 10，并使用 reranker 选择前 5 个。 但是，您可以根据具体实验的需要随意调整此参数。 我们在这里展示了 OpenAIEmbedding 的代码，请参阅笔记本以获取其他嵌入的代码。

```reasonml
embed_model = OpenAIEmbedding()
service_context = ServiceContext.from_defaults(llm=None, embed_model = embed_model)
vector_index = VectorStoreIndex(nodes, service_context=service_context)
vector_retriever = VectorIndexRetriever(index=vector_index, similarity_top_k = 10)
```

```python
class CustomRetriever(BaseRetriever):
    """Custom retriever that performs both Vector search and Knowledge Graph search"""

    def __init__(
        self,
        vector_retriever: VectorIndexRetriever,
    ) -> None:
        """Init params."""

        self._vector_retriever = vector_retriever

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Retrieve nodes given query."""

    retrieved_nodes = self._vector_retriever.retrieve(query_bundle)

    if reranker != 'None':
      retrieved_nodes = reranker.postprocess_nodes(retrieved_nodes, query_bundle)
       else:
          retrieved_nodes = retrieved_nodes[:5]
         
       return retrieved_nodes

    async def _aretrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Asynchronously retrieve nodes given query.

        Implemented by the user.

        """
        return self._retrieve(query_bundle)

    async def aretrieve(self, str_or_query_bundle: QueryType) -> List[NodeWithScore]:
        if isinstance(str_or_query_bundle, str):
            str_or_query_bundle = QueryBundle(str_or_query_bundle)
        return await self._aretrieve(str_or_query_bundle)

custom_retriever = CustomRetriever(vector_retriever)
```

**评估：**

```makefile
retriever_evaluator = RetrieverEvaluator.from_metric_names(
    ["mrr", "hit_rate"], retriever=custom_retriever
)
eval_results = await retriever_evaluator.aevaluate_dataset(qa_dataset)
```

## 结果：

我们测试了各种嵌入模型和重新排序器。 以下是我们测试的模型：

**Embedding Models**:

* [OpenAI Embedding](https://platform.openai.com/docs/guides/embeddings)
* [Voyage Embedding](https://www.voyageai.com/)
* [CohereAI Embedding](https://txt.cohere.com/introducing-embed-v3/) (v2.0/ v3.0)
* [Jina Embeddings](https://huggingface.co/jinaai/jina-embeddings-v2-small-en)
* [BAAI/bge-large-en](https://huggingface.co/BAAI/bge-large-en)

**Rerankers**:

* [CohereAI](https://txt.cohere.com/rerank/)
* [bge-reranker-base](https://huggingface.co/BAAI/bge-reranker-base)
* [bge-reranker-large](https://huggingface.co/BAAI/bge-reranker-large)

值得一提的是，这些结果提供了对该特定数据集和任务性能的深入了解。 然而，实际结果可能会因数据特征、数据集大小和其他变量（如 chunk\_size、similarity\_top\_k 等）而有所不同。

下表展示了基于命中率和平均倒数排名（MRR）指标的评估结果：

![](https://proxy-prod.omnivore-image-cache.app/915x258,sh5mr-iRHIM189a-8NnipsHnVeEWdqKJrGoCE6afPXkg/https://pic3.zhimg.com/v2-d25194f63f13345191b2d87fd02154c6_b.jpg)

## 分析：

嵌入性能：

OpenAI：展示了顶级性能，尤其是 CohereRerank（0.926966 命中率，0.865262 MRR）和 bge-reranker-large（0.910112 命中率，0.853993 MRR），表明与重排序工具具有很强的兼容性。

bge-large：通过重新排序器体验显着改进，CohereRerank 获得最佳结果（0.865169 命中率，0.805618 MRR）。

llm-embedder：从重新排名中获益匪浅，特别是 CohereRerank（0.887640 命中率，0.825843 MRR），它提供了显着的性能提升。

Cohere：Cohere 最新的 v3.0 嵌入优于 v2.0，并且通过原生 CohereRerank 的集成，显着提高了其指标，拥有 0.876404 的命中率和 0.832584 MRR。

Voyage：具有强大的初始性能，并被 CohereRerank 进一步放大（0.915730 命中率，0.847940 MRR），表明对重新排名的高响应性。

JinaAI：虽然从较低的基数开始，但 bge-reranker-large 取得了显着的收益（0.601124 命中率，0.578652 MRR），这表明重新排名显着提高了其性能。 其性能不佳的一个潜在原因可能是嵌入针对 8K 上下文长度进行了优化。

**重新排序的影响：**

WithoutReranker：这提供了每个嵌入的基线性能。

bge-reranker-base：通常可以提高嵌入的命中率和 MRR。

bge-reranker-large：此重新排序器经常为嵌入提供最高或接近最高的 MRR。 对于多个嵌入，其性能可与 CohereRerank 相媲美或超过。

CohereRerank：持续增强所有嵌入的性能，通常提供最佳或接近最佳的结果。

**重新排序的必要性：**

这些数据清楚地表明了重新排名器在优化搜索结果方面的重要性。 几乎所有嵌入都受益于重新排名，显示出命中率和 MRR 的提高。

重新排序器，尤其是 CohereRerank，已经证明了它们能够将表现一般的嵌入转变为具有竞争力的嵌入，正如 JinaAI 所看到的那样。

**综合优势：**

当同时考虑命中率和 MRR 时，OpenAI + CohereRerank 和 Voyage + bge-reranker-large 的组合成为顶级竞争者。

然而，CohereRerank/bge-reranker-large 重新排序器在各种嵌入中带来的持续改进使它们成为提高搜索质量的最佳选择，无论使用何种嵌入。

总之，为了在命中率和 MRR 方面实现峰值性能，OpenAI 或 Voyage 嵌入与 CohereRerank/bge-reranker-large 重新排序器的组合脱颖而出。

## 总结：

在这篇博文中，我们演示了如何使用各种嵌入和重新排序来评估和增强检索器的性能。 以下是我们的最终结论。

**嵌入**：OpenAI 和 Voyage 嵌入，尤其是与 CohereRerank/bge-reranker-large 重新排序器配合使用时，为命中率和 MRR 设定了黄金标准。

**重排序器**：重排序器（尤其是 CohereRerank/bge-reranker-large）的影响力怎么强调都不为过。 它们在提高许多嵌入的 MRR 方面发挥着关键作用，显示了它们在改善搜索结果方面的重要性。

**基础是关键**：为初始搜索选择正确的嵌入至关重要； 如果基本搜索结果不好，即使是最好的重新排名器也无济于事。

**合作**：为了充分利用检索器，找到嵌入和重新排序的正确组合非常重要。 这项研究表明仔细测试并找到最佳配对是多么重要。

翻译自：<https://blog.llamaindex.ai/boosting-rag-picking-the-best-embedding-reranker-models-42d079022e83>

发布于 2023-11-06 23:02・IP 属地北京 ，编辑于 2024-03-08 12:37・IP 属地北京

