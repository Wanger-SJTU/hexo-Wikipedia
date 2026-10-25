---
title: RAG 的 12 个痛点和建议的解决方案
date: "2024-02-02 00:00:00"
updated: "2024-02-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/RAG-的-12-个痛点和建议的解决方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/681066379
---


https://archive.is/bNbZo

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_aa1a71265934.jpg)

· Pain Point 1: Missing Content 内容缺失**· Pain Point 2: Missed the Top Ranked Documents 错过排名靠前的文档
· Pain Point 3: Not in Context — Consolidation Strategy Limitations 不在上下文中——整合战略的局限性
· Pain Point 4: Not Extracted 未提取
· Pain Point 5: Wrong Format 格式错误
· Pain Point 6: Incorrect Specificity 不正确的具体性
· Pain Point 7: Incomplete 不完整
· Pain Point 8: Data Ingestion Scalability 数据摄入的可扩展性
· Pain Point 9: Structured Data QA 结构化数据QA
· Pain Point 10: Data Extraction from Complex PDFs 从复杂PDF中提取数据
· Pain Point 11: Fallback Model(s) 回退模型
· Pain Point 12: LLM Security LLM安全

Inspired by the paper [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/pdf/2401.05856.pdf) by Barnett et al., let’s explore the seven failure points mentioned in the paper and five additional common pain points in developing an RAG pipeline in this article. More importantly, we will delve into the solutions to those RAG pain points so we can be better equipped to tackle those pain points in our day-to-day RAG development.
I use “pain points” instead of “failure points” mainly because those points all have corresponding proposed solutions. Let’s try to fix them before they become failures in our RAG pipelines.
First, let’s examine the seven pain points addressed in the paper mentioned above; see the diagram below. We will then add the five additional pain points and their proposed solutions.

受Barnett等人的论文《设计检索增强生成系统时的七个故障点》的启发，让我们在本文中探讨论文中提到的七个失效点以及开发RAG管道时的五个额外常见痛点。更重要的是，我们将深入研究这些RAG痛点的解决方案，以便在日常RAG开发中更好地解决这些痛点。

我用“痛点”而不是“失败点”，主要是因为这些点都有相应的解决方案。让我们试着在它们成为RAG管道中的故障之前进行修复。

首先，让我们研究一下上述论文中提到的七个痛点；请参阅下图。然后，我们将添加另外五个痛点及其建议的解决方案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_40078c49b462.jpg)

Image source: Seven Failure Points When Engineering a Retrieval Augmented Generation SystemPain Point 1: Missing Content  内容缺失
The RAG system provides a plausible but incorrect answer when the actual answer is not in the knowledge base, rather than stating it doesn’t know. Users receive misleading information, leading to frustration.
We have two proposed solutions:

当实际答案不在知识库中时，RAG系统提供了一个看似合理但不正确的答案，而不是说它不知道。用户收到误导性信息，导致沮丧。

我们提出了两种解决方案：
Clean your data  <strong>清理数据</strong>
**Garbage in, garbage out. If your source data is of poor quality, such as containing conflicting information, no matter how well you build your RAG pipeline, it cannot do the magic to output gold from the garbage you feed it. This proposed solution is not only for this pain point but all the pain points listed in this article. Clean data is the prerequisite for any well-functioning RAG pipeline.

垃圾进，垃圾出。如果你的源数据质量很差，比如包含冲突信息，无论你构建的RAG管道有多好，它都无法从你提供的垃圾中输出黄金。这个拟议的解决方案不仅适用于这个痛点，也适用于本文中列出的所有痛点。干净的数据是任何运行良好的RAG管道的先决条件。**Better prompting 更好的提示
**Better prompting can significantly help in situations where the system might otherwise provide a plausible but incorrect answer due to the lack of information in the knowledge base. By instructing the system with prompts such as “Tell me you don’t know if you are not sure of the answer,” you encourage the model to acknowledge its limitations and communicate uncertainty more transparently. There is no guarantee for 100% accuracy, but crafting your prompt is one of the best efforts you can make after cleaning your data.

在由于知识库中缺乏信息而导致系统可能提供看似合理但不正确的答案的情况下，更好的提示会有很大帮助。通过用“如果你不确定答案，告诉我你不知道”等提示来指导系统，你鼓励模型承认其局限性，并更透明地传达不确定性。无法保证100%的准确性，但制作提示是清理数据后所能做的最大努力之一。 

### Pain Point 2: Missed the Top Ranked Documents 痛点2：错过排名靠前的文档

重要文档可能不会出现在系统检索组件返回的顶部结果中。忽略了正确的答案，导致系统无法提供准确的响应。该报暗示，“问题的答案在文档中，但排名不够高，无法返回给用户”。

我想到了两个建议的解决方案：

### Hyperparameter tuning for chunk_size and `similarity_top_k` chunk_size和similarity_top_k的超参数调整 

chunk_size和similarity_top_k都是用于管理RAG模型中数据检索过程的效率和有效性的参数。调整这些参数可能会影响计算效率和检索信息质量之间的权衡。我们在上一篇文章《使用LlamaIndex自动进行超参数调整》中探讨了chunk_size和similarity_top_k的超参数调整细节。请参阅下面的示例代码片段。**Both `chunk_size` and `similarity_top_k` are parameters used to manage the efficiency and effectiveness of the data retrieval process in RAG models. Adjusting these parameters can impact the trade-off between computational efficiency and the quality of retrieved information. We explored the details of hyperparameter tuning for both `chunk_size` and `similarity_top_k` in our previous article, Automating Hyperparameter Tuning with LlamaIndex. See the sample code snippet below.

param_tuner = ParamTuner(

```text
    param_fn=objective_function_semantic_similarity,
    param_dict=param_dict,
    fixed_param_dict=fixed_param_dict,
    show_progress=True,
)
```


results = param_tuner.tune()`

The function`objective_function_semantic_similarity`is defined as follows, with`param_dict`containing the parameters,`chunk_size`and`top_k`, and their corresponding proposed values:

函数objective_function_semantic_eximality定义如下，param_dict包含参数chunk_size和top_k及其相应的建议值：

# contains the parameters that need to be tuned
param_dict = {"chunk_size": [256, 512, 1024], "top_k": [1, 2, 5]}

# contains parameters remaining fixed across all runs of the tuning process
fixed_param_dict = {
    "docs": documents,
    "eval_qs": eval_qs,
    "ref_response_strs": ref_response_strs,

```python
}

def objective_function_semantic_similarity(params_dict):
    chunk_size = params_dict["chunk_size"]
    docs = params_dict["docs"]
    top_k = params_dict["top_k"]
    eval_qs = params_dict["eval_qs"]
    ref_response_strs = params_dict["ref_response_strs"]
```


    # build index
    index = _build_index(chunk_size, docs)

    # query engine
    query_engine = index.as_query_engine(similarity_top_k=top_k)

    # get predicted responses

```text
    pred_response_objs = get_responses(
        eval_qs, query_engine, show_progress=True
    )
```


    # run evaluator

```text
    eval_batch_runner = _get_eval_batch_runner_semantic_similarity()
    eval_results = eval_batch_runner.evaluate_responses(
        eval_qs, responses=pred_response_objs, reference=ref_response_strs
    )
```


    # get semantic similarity metric

```text
    mean_score = np.array(
        [r.score for r in eval_results["semantic_similarity"]]
    ).mean()

    return RunResult(score=mean_score, params=params_dict)`
```


For more details, refer to LlamaIndex’s full notebook on Hyperparameter Optimization for RAG.

有关更多详细信息，请参阅LlamaIndex关于RAG超参数优化的完整笔记本。

Reranking  重新排序**

Reranking retrieval results before sending them to the LLM has significantly improved RAG performance. This LlamaIndex notebook demonstrates the difference between: 在将检索结果发送到LLM之前对其重新排序显著提高了RAG性能。这本LlamaIndex笔记本演示了以下两者之间的区别：

- Inaccurate retrieval by directly retrieving the top 2 nodes without a reranker.在没有重新排序的情况下直接检索前2个节点，检索不准确。
- Accurate retrieval by retrieving the top 10 nodes and using `CohereRerank` to rerank and return the top 2 nodes. 通过检索前10个节点并使用CohereRerank重新排列并返回前2个节点进行精确检索。

```python
import os
from llama_index.postprocessor.cohere_rerank import CohereRerank
```


api_key = os.environ["COHERE_API_KEY"]
cohere_rerank = CohereRerank(api_key=api_key, top_n=2) # return top 2 nodes from reranker

query_engine = index.as_query_engine(

```text
    similarity_top_k=10, # we can set a high top_k here to ensure maximum relevant retrieval
    node_postprocessors=[cohere_rerank], # pass the reranker to node_postprocessors
)
```


response = query_engine.query(
    "What did Sam Altman do in this essay?",
)`

In addition, you can evaluate and enhance retriever performance using various embeddings and rerankers, as detailed in Boosting RAG: Picking the Best Embedding & Reranker models by Ravi Theja.

Moreover, you can finetune a custom reranker to get even better retrieval performance, and the detailed implementation is documented in Improving Retrieval Performance by Fine-tuning Cohere Reranker with LlamaIndex by Ravi Theja.

此外，您可以使用各种嵌入和重新排序来评估和增强检索器的性能，如Ravi Theja的Boosting RAG:Picking the Best Embedding&Reranker model中所述。

此外，您可以微调自定义重新排序器以获得更好的检索性能，Ravi Theja的《通过微调Cohere reranker with LlamaIndex来提高检索性能》中记录了详细的实现。

### Pain Point 3: Not in Context — Consolidation Strategy Limitations 痛点3：不在上下文中——整合战略的局限性

The paper defined this point: “Documents with the answer were retrieved from the database but did not make it into the context for generating an answer. This occurs when many documents are returned from the database, and a consolidation process takes place to retrieve the answer”.

In addition to adding a reranker and finetuning the reranker as described in the above section, we can explore the following proposed solutions:

该论文定义了这一点：“有答案的文档是从数据库中检索到的，但没有进入生成答案的上下文。当从数据库中返回许多文档，并进行合并过程来检索答案时，就会发生这种情况”。

除了如上所述添加重新排序器并微调重新排序器外，我们还可以探索以下建议的解决方案：

### Tweak retrieval strategies 调整检索策略

LlamaIndex offers an array of retrieval strategies, from basic to advanced, to help us achieve accurate retrieval in our RAG pipelines. Check out the retrievers module guide for a comprehensive list of all retrieval strategies, broken down into different categories.LlamaIndex提供了一系列检索策略，从基本到高级，帮助我们在RAG管道中实现准确的检索。查看检索器模块指南，了解所有检索策略的综合列表，分为不同类别。

- Basic retrieval from each index 每个索引的基本检索
- Advanced retrieval and search 高级检索和搜索
- Auto-Retrieval 自动检索
- Knowledge Graph Retrievers 知识图检索器
- Composed/Hierarchical Retrievers 组合/分层检索器
- and more! 还有更多

### Finetune embeddings 微调嵌入

If you use an open-source embedding model, finetuning your embedding model is a great way to achieve more accurate retrievals. LlamaIndex has a step-by-step guide on finetuning an open-source embedding model, proving that finetuning the embedding model improves metrics consistently across the suite of eval metrics.

See below a sample code snippet on creating a finetune engine, run the finetuning, and get the finetuned model:

如果你使用开源嵌入模型，微调嵌入模型是实现更准确检索的好方法。LlamaIndex有一个关于微调开源嵌入模型的分步指南，证明微调嵌入模型可以在整个eval度量套件中一致地改进度量。

请参阅以下关于创建微调引擎、运行微调并获得微调模型的示例代码片段：

finetune_engine = SentenceTransformersFinetuneEngine(
    train_dataset,

```text
    model_id="BAAI/bge-small-en",
    model_output_path="test_model",
    val_dataset=val_dataset,
)

finetune_engine.finetune()
```


embed_model = finetune_engine.get_finetuned_model()`

### Pain Point 4: Not Extracted 痛点4：未提取

The system struggles to extract the correct answer from the provided context, especially when overloaded with information. Key details are missed, compromising the quality of responses. The paper hinted: “This occurs when there is too much noise or contradicting information in the context”.

Let’s explore three proposed solutions:

该系统很难从提供的上下文中提取正确的答案，尤其是当信息过载时。关键细节被遗漏，影响了回复的质量。该论文暗示：“当上下文中有太多噪音或相互矛盾的信息时，就会发生这种情况”。

让我们探讨三种建议的解决方案：

#### Clean your data 清理数据

This pain point is yet another typical victim of bad data. We cannot stress enough the importance of clean data! Do spend time cleaning your data first before blaming your RAG pipeline.

这个痛点是坏数据的又一个典型受害者。我们再怎么强调干净数据的重要性也不为过！在指责你的RAG管道之前，一定要先花时间清理你的数据。

#### **Prompt Compression

Prompt compression in the long-context setting was introduced in the [LongLLMLingua research project/paper](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/abs/2310.06839). With its integration in LlamaIndex, we can now implement LongLLMLingua as a node postprocessor, which will compress context after the retrieval step before feeding it into the LLM.

See the sample code snippet below, where we set up `LongLLMLinguaPostprocessor`, which uses the `longllmlingua` package to run prompt compression.

For more details, check out the full notebook on LongLLMLingua.

LongLLMLingua研究项目/论文中介绍了长上下文环境中的即时压缩。通过在LlamaIndex中的集成，我们现在可以将LongLLMLingua实现为节点后处理器，它将在检索步骤后压缩上下文，然后将其输入LLM。

请参阅下面的示例代码片段，我们在其中设置了LongLLMLinguaPostprocessor，它使用longllmlingua包来运行提示压缩。

有关更多详细信息，请查看LongLLMLingua上的完整笔记本。

```python
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.response_synthesizers import CompactAndRefine
from llama_index.postprocessor import LongLLMLinguaPostprocessor
from llama_index.schema import QueryBundle
```


node_postprocessor = LongLLMLinguaPostprocessor(

```text
    instruction_str="Given the context, please answer the final question",
    target_token=300,
    rank_method="longllmlingua",
    additional_compress_kwargs={
        "condition_compare": True,
        "condition_in_question": "after",
        "context_budget": "+100",
        "reorder_context": "sort",  # enable document reorder
    },
)
```


retrieved_nodes = retriever.retrieve(query_str)
synthesizer = CompactAndRefine()

# outline steps in RetrieverQueryEngine for clarity:
# postprocess (compress), synthesize
new_retrieved_nodes = node_postprocessor.postprocess_nodes(

```python
    retrieved_nodes, query_bundle=QueryBundle(query_str=query_str)
)

print("\n\n".join([n.get_content() for n in new_retrieved_nodes]))
```


response = synthesizer.synthesize(query_str, new_retrieved_nodes)`

#### LongContextReorder 

[A study](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/abs/2307.03172) observed that the best performance typically arises when crucial data is positioned at the start or conclusion of the input context. `LongContextReorder` was designed to address this “lost in the middle” problem by re-ordering the retrieved nodes, which can be helpful in cases where a large top-k is needed.

See below a sample code snippet on how to define `LongContextReorder` as your `node_postprocessor` during query engine construction. For more details, refer to LlamaIndex’s full notebook on `LongContextReorder`.

一项研究观察到，当关键数据位于输入上下文的开始或结束时，通常会出现最佳性能。LongContextReorder旨在通过对检索到的节点重新排序来解决这个“中间丢失”的问题，这在需要大型top-k的情况下会很有帮助。

请参阅下面的示例代码片段，了解如何在查询引擎构建过程中将LongContextReorder定义为node_postprocessor。有关更多详细信息，请参阅LlamaIndex在LongContextReorder上的完整笔记本。

from llama_index.postprocessor import LongContextReorder

reorder = LongContextReorder()

reorder_engine = index.as_query_engine(

```text
    node_postprocessors=[reorder], similarity_top_k=5
)
```


reorder_response = reorder_engine.query("Did the author meet Sam Altman?")`

### Pain Point 5: Wrong Format 痛点5：格式错误

When an instruction to extract information in a specific format, like a table or list, is overlooked by the LLM, we have four proposed solutions to explore:

当LLM忽略了以特定格式（如表格或列表）提取信息的指示时，我们有四个建议的解决方案可供探索：

### Better prompting 更好的提示

There are several strategies you can employ to improve your prompts and rectify this issue: 您可以采用以下几种策略来改进提示并纠正此问题：

- Clarify the instructions. 澄清说明
- Simplify the request and use keywords. 简化请求并使用关键字
- Give examples.  举例说明
- Iterative prompting and asking follow-up questions. 反复提示并提出后续问题

### Output parsing 输出解析

Output parsing can be used in the following ways to help ensure the desired output: 输出解析可以通过以下方式来帮助确保所需的输出

- to provide formatting instructions for any prompt/query 为任何提示/查询提供格式化说明
- to provide “parsing” for LLM outputs 为LLM输出提供“解析”
LlamaIndex supports integrations with output parsing modules offered by other frameworks, such as Guardrails and LangChain. LlamaIndex支持与其他框架（如Guardrails和LangChain）提供的输出解析模块的集成。

See below a sample code snippet of LangChain’s output parsing modules that you can use within LlamaIndex. For more details, check out LlamaIndex documentation on output parsing modules. 请参阅下面的LangChain输出解析模块的示例代码片段，您可以在LlamaIndex中使用这些模块。有关更多详细信息，请查看关于输出解析模块的LlamaIndex文档。

```python
from llama_index import VectorStoreIndex, SimpleDirectoryReader
from llama_index.output_parsers import LangchainOutputParser
from llama_index.llms import OpenAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
```


# load documents, build index
documents = SimpleDirectoryReader("../paul_graham_essay/data").load_data()
index = VectorStoreIndex.from_documents(documents)

# define output schema
response_schemas = [

```text
    ResponseSchema(
        name="Education",
        description="Describes the author's educational experience/background.",
    ),
    ResponseSchema(
        name="Work",
        description="Describes the author's work experience/background.",
    ),
]
```


# define output parser
lc_output_parser = StructuredOutputParser.from_response_schemas(
    response_schemas
)
output_parser = LangchainOutputParser(lc_output_parser)

# Attach output parser to LLM
llm = OpenAI(output_parser=output_parser)

# obtain a structured response
from llama_index import ServiceContext

ctx = ServiceContext.from_defaults(llm=llm)

query_engine = index.as_query_engine(service_context=ctx)
response = query_engine.query(
    "What are a few things the author did growing up?",

```python
)
print(str(response))`
```


### Pydantic programs Pydantic程序

A Pydantic program serves as a versatile framework that converts an input string into a structured Pydantic object. LlamaIndex provides several categories of Pydantic programs: Pydantic程序是一个通用框架，用于将输入字符串转换为结构化Pydantic对象。LlamaIndex提供了几个类别的Pydantic程序：

- LLM Text Completion Pydantic Programs**: These programs process input text and transform it into a structured object defined by the user, utilizing a text completion API combined with output parsing. LLM文本完成Pydantic程序：这些程序处理输入文本，并将其转换为用户定义的结构化对象，使用文本完成API结合输出解析。
- <strong>LLM Function Calling Pydantic Programs</strong>: These programs take input text and convert it into a structured object as specified by the user, by leveraging an LLM function calling API. LLM函数调用Pydantic程序：这些程序利用调用API的LLM函数，将输入文本转换为用户指定的结构化对象。
- <strong>Prepackaged Pydantic Programs</strong>: These are designed to transform input text into predefined structured objects. 预打包Pydantic程序：这些程序旨在将输入文本转换为预定义的结构化对象。
See below a sample code snippet from the OpenAI pydantic program. For more details, check out LlamaIndex’s documentation on the pydantic program for links to the notebooks/guides of the different pydantic programs. 请参阅下面的OpenAI pydantic程序的示例代码片段。有关更多详细信息，请查看LlamaIndex关于pydantic程序的文档，以获取不同pydanic程序的笔记本/指南的链接。

```python
from pydantic import BaseModel
from typing import List

from llama_index.program import OpenAIPydanticProgram
```


# Define output schema (without docstring)

```cpp
class Song(BaseModel):
    title: str
    length_seconds: int

class Album(BaseModel):
    name: str
    artist: str
    songs: List[Song]
```


# Define openai pydantic program
prompt_template_str = """\
Generate an example album, with an artist and a list of songs. \
Using the movie {movie_name} as inspiration.\
"""
program = OpenAIPydanticProgram.from_defaults(

```text
    output_cls=Album, prompt_template_str=prompt_template_str, verbose=True
)
```


# Run program to get structured output
output = program(
    movie_name="The Shining", description="Data model for an album."
)`

### OpenAI JSON mode - OpenAI JSON模式

OpenAI JSON mode enables us to set `response_format` to `{ "type": "json_object" }` to enable JSON mode for the response. When JSON mode is enabled, the model is constrained to only generate strings that parse into valid JSON objects. While JSON mode enforces the format of the output, it does not help with validation against a specified schema. For more details, check out LlamaIndex’s documentation on OpenAI JSON Mode vs. Function Calling for Data Extraction. OpenAI JSON模式使我们能够将response_format设置为｛“type”：“JSON_object”｝，以启用响应的JSON模式。当启用JSON模式时，模型被约束为仅生成解析为有效JSON对象的字符串。虽然JSON模式强制输出的格式，但它对针对指定模式的验证没有帮助。有关更多详细信息，请查看LlamaIndex关于OpenAI JSON模式与数据提取函数调用的文档。

### Pain Point 6: Incorrect Specificity - 痛点6：不正确的具体性

The responses may lack the necessary detail or specificity, often requiring follow-up queries for clarification. Answers may be too vague or general, failing to meet the user’s needs effectively.

We turn to advanced retrieval strategies for solutions.

答复可能缺乏必要的细节或具体性，往往需要后续询问才能澄清。答案可能过于模糊或笼统，无法有效满足用户的需求。

我们转向高级检索策略来寻找解决方案。

### Advanced retrieval strategies - 高级检索策略

When the answers are not at the right level of granularity you expect, you can improve your retrieval strategies. Some main advanced retrieval strategies that might help in resolving this pain point include: 当答案不在您期望的正确粒度水平时，您可以改进您的检索策略。一些可能有助于解决这一痛点的主要高级检索策略包括：

- small-to-big retrieval 从小到大的检索
- sentence window retrieval 语句窗口检索
- recursive retrieval 递归检索
Check out my last article Jump-start Your RAG Pipelines with Advanced Retrieval LlamaPacks and Benchmark with Lighthouz AI for more details on seven advanced retrievals LlamaPacks. 查看我的上一篇文章《使用高级检索LlamaPack启动RAG管道》和《使用Lighthouz AI进行基准测试》，了解有关七种高级检索LlAmaPack的更多详细信息。

### Pain Point 7: Incomplete - 痛点7：不完整

Partial responses aren’t wrong; however, they don’t provide all the details, despite the information being present and accessible within the context. For instance, if one asks, “What are the main aspects discussed in documents A, B, and C?” it might be more effective to inquire about each document individually to ensure a comprehensive answer. 部分回答没有错；然而，它们并没有提供所有的细节，尽管信息在上下文中是存在的和可访问的。例如，如果有人问“文件A、B和C中讨论的主要方面是什么？”单独询问每个文件可能更有效，以确保得到全面的答案。

### Query transformations - 查询转换

Comparison questions especially do poorly in naïve RAG approaches. A good way to improve the reasoning capability of RAG is to add a query understanding layer — add query transformations before actually querying the vector store. Here are four different query transformations: 比较问题在天真的RAG方法中尤其表现不佳。提高RAG推理能力的一个好方法是添加查询理解层——在实际查询向量存储之前添加查询转换。以下是四种不同的查询转换：

- <strong>Routing</strong>: Retain the initial query while pinpointing the appropriate subset of tools it pertains to. Then, designate these tools as the suitable options. 路由：保留初始查询，同时精确定位它所属的工具的适当子集。然后，将这些工具指定为适当的选项。
- <strong>Query-Rewriting</strong>: Maintain the selected tools, but reformulate the query in multiple ways to apply it across the same set of tools. 查询重写：维护所选工具，但以多种方式重新编写查询，以便将其应用于同一组工具。
- <strong>Sub-Questions</strong>: Break down the query into several smaller questions, each targeting different tools as determined by their metadata. 子问题：将查询分解为几个较小的问题，每个问题都针对由元数据确定的不同工具。
- <strong>ReAct Agent Tool Selection</strong>: Based on the original query, determine which tool to use and formulate the specific query to run on that tool. ReAct Agent工具选择：根据原始查询，确定要使用的工具，并制定要在该工具上运行的特定查询。
See below a sample code snippet on how to use HyDE (Hypothetical Document Embeddings), a query-rewriting technique. Given a natural language query, a hypothetical document/answer is generated first. This hypothetical document is then used for embedding lookup rather than the raw query. 请参阅下面关于如何使用HyDE（假设文档嵌入）（一种查询重写技术）的示例代码片段。给定一个自然语言查询，首先生成一个假设文档/答案。然后，这个假设文档被用于嵌入查找，而不是原始查询。

# load documents, build index
documents = SimpleDirectoryReader("../paul_graham_essay/data").load_data()
index = VectorStoreIndex(documents)

# run query with HyDE query transform
query_str = "what did paul graham do after going to RISD"
hyde = HyDEQueryTransform(include_original=True)
query_engine = index.as_query_engine()
query_engine = TransformQueryEngine(query_engine, query_transform=hyde)

response = query_engine.query(query_str)
print(response)`

Check out LlamaIndex’s Query Transform Cookbook for all the details.**Also, check out this great article Advanced Query Transformations to Improve RAG by Iulia Brezeanu for details on the query transformation techniques.

The above pain points are all from the paper. Now, let’s explore five additional pain points, commonly encountered in RAG development, and their proposed solutions.

查看LlamaIndex的Query Transform Cookbook了解所有详细信息。

此外，请参阅Iulia Brezeanu的这篇伟大的文章Advanced Query Transformations to Improve RAG，了解有关查询转换技术的详细信息。

以上痛点均来自论文。现在，让我们探讨RAG开发中常见的五个额外的痛点，以及它们提出的解决方案。

### Pain Point 8: Data Ingestion Scalability - 痛点8：数据摄入的可扩展性

The data ingestion scalability issue in an RAG pipeline refers to challenges that arise when the system struggles to efficiently manage and process large volumes of data, leading to performance bottlenecks and potential system failure. Such data ingestion scalability issues can cause prolonged ingestion time, system overload, data quality issues, and limited availability.

RAG管道中的数据摄取可扩展性问题指的是当系统难以有效管理和处理大量数据时出现的挑战，从而导致性能瓶颈和潜在的系统故障。这样的数据摄取可伸缩性问题可能会导致摄取时间延长、系统过载、数据质量问题和可用性有限。

### Parallelizing ingestion pipeline 并行摄取管道

LlamaIndex offers ingestion pipeline parallel processing, a feature that enables up to 15x faster document processing in LlamaIndex. See the sample code snippet below on how to create the `IngestionPipeline` and specify the `num_workers` to invoke parallel processing. Check out LlamaIndex’s [full notebook](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama_index/blob/main/docs/examples/ingestion/parallel_execution_ingestion_pipeline.ipynb%3F__s%3Ddb5ef5gllwa79ba7a4r2%26utm_source%3Ddrip%26utm_medium%3Demail%26utm_campaign%3DLlamaIndex%2Bnews%2C%2B2024-01-16) for more details. LlamaIndex提供摄取管道并行处理，这一功能使LlamaIndex中的文档处理速度提高了15倍。请参阅下面的示例代码片段，了解如何创建IngestionPipeline并指定要调用并行处理的num_workers。查看LlamaIndex的完整笔记本了解更多详细信息。

# load data
documents = SimpleDirectoryReader(input_dir="./data/source_files").load_data()

# create the pipeline with transformations
pipeline = IngestionPipeline(

```text
    transformations=[
        SentenceSplitter(chunk_size=1024, chunk_overlap=20),
        TitleExtractor(),
        OpenAIEmbedding(),
    ]
)
```


# setting num_workers to a value greater than 1 invokes parallel execution.
nodes = pipeline.run(documents=documents, num_workers=4)`

### Pain Point 9: Structured Data QA 痛点9：结构化数据QA

Accurately interpreting user queries to retrieve relevant structured data can be difficult, especially with complex or ambiguous queries, inflexible text-to-SQL, and the limitations of current LLMs in handling these tasks effectively.准确解释用户查询以检索相关结构化数据可能很困难，尤其是在查询复杂或不明确、文本到SQL不灵活以及当前LLM在有效处理这些任务方面的局限性的情况下。

LlamaIndex offers two solutions. LlamaIndex提供两种解决方案。

### Chain-of-table Pack 桌上包链

ChainOfTablePack` is a LlamaPack based on the innovative “chain-of-table” [paper](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/abs/2401.04398) by Wang et al. “Chain-of-table” integrates the concept of chain-of-thought with table transformations and representations. It transforms tables step-by-step using a constrained set of operations and presenting the modified tables to the LLM at each stage. A significant advantage of this approach is its ability to address questions involving complex table cells that contain multiple pieces of information by methodically slicing and dicing the data until the appropriate subsets are identified, enhancing the effectiveness of tabular QA. ChainOfTablePack是基于王等人创新的“表链”论文的一个LlamaPack。“表链》将思想链的概念与表的转换和表示相结合。它使用一组受约束的操作逐步转换表，并在每个阶段将修改后的表呈现给LLM。这种方法的一个显著优点是，它能够通过系统地对数据进行切片和划片，直到识别出合适的子集，来解决涉及包含多条信息的复杂表单元的问题，从而增强表格QA的有效性。

Check out LlamaIndex’s [full notebook](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama-hub/blob/main/llama_hub/llama_packs/tables/chain_of_table/chain_of_table.ipynb) for details on how to use `ChainOfTablePack` to query your structured data. 查看LlamaIndex的完整笔记本，了解如何使用ChainOfTablePack查询结构化数据的详细信息。

### Mix-Self-Consistency Pack 混合自一致性包

LLMs can reason over tabular data in two main ways: LLM可以通过两种主要方式对表格数据进行推理：

- Textual reasoning via direct prompting 基于直接提示的语篇推理
- Symbolic reasoning via program synthesis (e.g., Python, SQL, etc.) 通过程序合成进行符号推理（例如Python、SQL等）
Based on the paper [Rethinking Tabular Data Understanding with Large Language Models](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/pdf/2312.16702v1.pdf) by Liu et al., LlamaIndex developed the `MixSelfConsistencyQueryEngine`, which aggregates results from both textual and symbolic reasoning with a self-consistency mechanism (i.e., majority voting) and achieves SoTA performance. See a sample code snippet below. Check out LlamaIndex’s [full notebook](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama-hub/blob/main/llama_hub/llama_packs/tables/mix_self_consistency/mix_self_consistency.ipynb) for more details. 在刘等人的论文《用大语言模型重新思考表格数据理解》的基础上，LlamaIndex开发了MixSelfConsistencyQueryEngine，该引擎利用自一致性机制（即多数投票）聚合文本和符号推理的结果，并实现了SoTA性能。请参阅下面的示例代码片段。查看LlamaIndex的完整笔记本了解更多详细信息。

download_llama_pack(
    "MixSelfConsistencyPack",
    "./mix_self_consistency_pack",

```text
    skip_load=True,
)
```


query_engine = MixSelfConsistencyQueryEngine(

```text
    df=table,
    llm=llm,
    text_paths=5, # sampling 5 textual reasoning paths
    symbolic_paths=5, # sampling 5 symbolic reasoning paths
    aggregation_mode="self-consistency", # aggregates results across both text and symbolic paths via self-consistency (i.e. majority voting)
    verbose=True,
)
```


### Pain Point 10: Data Extraction from Complex PDFs 痛点10：从复杂PDF中提取数据

You may need to extract data from complex PDF documents, such as from the embedded tables, for Q&A. Naïve retrieval won’t get you the data from those embedded tables. You need a better way to retrieve such complex PDF data. 您可能需要从复杂的PDF文档中提取数据，例如从嵌入式表格中提取数据以进行问答。天真的检索无法从那些嵌入的表中获取数据。您需要一种更好的方法来检索如此复杂的PDF数据。

### Embedded table retrieval 嵌入式表检索

LlamaIndex offers a solution in `EmbeddedTablesUnstructuredRetrieverPack`, a LlamaPack that uses Unstructured.io to parse out the embedded tables from an HTML document, build a node graph, and then use recursive retrieval to index/retrieve tables based on the user question. LlamaIndex在EmbeddedTablesUnstructuredRetrivePack中提供了一个解决方案，这是一个使用Unstructured.io从HTML文档中解析出嵌入表、构建节点图，然后使用递归检索根据用户问题对表进行索引/检索的LlamaPack。

Notice this pack takes an HTML document as input. If you have a PDF document, you can use [pdf2htmlEX](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/pdf2htmlEX/pdf2htmlEX) to convert the PDF to HTML without losing text or format. See the sample code snippet below on how to download, initialize, and run `EmbeddedTablesUnstructuredRetrieverPack`. 请注意，此包将HTML文档作为输入。如果您有PDF文档，您可以使用pdf2htmlEX将PDF转换为HTML，而不会丢失文本或格式。请参阅下面的示例代码片段，了解如何下载、初始化和运行EmbeddedTablesUnstructuredRetrivePack。

# download and install dependencies
EmbeddedTablesUnstructuredRetrieverPack = download_llama_pack(
    "EmbeddedTablesUnstructuredRetrieverPack", "./embedded_tables_unstructured_pack",
)

# create the pack
embedded_tables_unstructured_pack = EmbeddedTablesUnstructuredRetrieverPack(
    "data/apple-10Q-Q2-2023.html", # takes in an html file, if your doc is in pdf, convert it to html first

```text
    nodes_save_path="apple-10-q.pkl"
)
```


# run the pack 
response = embedded_tables_unstructured_pack.run("What's the total operating expenses?").response
display(Markdown(f"{response}"))`

### Pain Point 11: Fallback Model(s) 痛点11：回退模型

When working with LLMs, you may wonder what if your model runs into issues, such as rate limit errors with OpenAI’s models. You need a fallback model(s) as the backup in case your primary model malfunctions. 在使用LLM时，您可能会想，如果您的模型遇到问题，例如OpenAI模型的速率限制错误，该怎么办。您需要一个后备模型作为备份，以防主模型出现故障。

Two proposed solutions: 两个建议的解决方案：

### Neutrino router 中微子路由器

A Neutrino router is a collection of LLMs to which you can route queries. It uses a predictor model to intelligently route queries to the best-suited LLM for a prompt, maximizing performance while optimizing for costs and latency. Neutrino currently supports over a dozen models. Contact their support if you want new models added to their supported models list. Neutrino路由器是LLM的集合，您可以将查询路由到这些LLM。它使用预测器模型将查询智能地路由到最适合的LLM以进行提示，最大限度地提高性能，同时优化成本和延迟。Neutrino目前支持十几种型号。如果您想将新型号添加到他们支持的型号列表中，请联系他们的支持人员。

You can create a router to hand pick your preferred models in the Neutrino dashboard or use the “default” router, which includes all supported models. 您可以创建一个路由器，在Neutrino面板中手动选择您喜欢的型号，也可以使用“默认”路由器，其中包括所有支持的型号。

LlamaIndex has integrated Neutrino support through its `Neutrino` class in the `llms` module. See the code snippet below. Check out more details on the Neutrino AI page. LlamaIndex通过llms模块中的Neutrino类集成了对Neutrino的支持。请参阅下面的代码片段。查看Neutrino AI页面上的更多详细信息。

```python
from llama_index.llms import Neutrino
from llama_index.llms import ChatMessage
```


llm = Neutrino(

```text
    api_key="", 
    router="test"  # A "test" router configured in Neutrino dashboard. You treat a router as a LLM. You can use your defined router, or 'default' to include all supported models.
)
```


response = llm.complete("What is large language model?")

```python
print(f"Optimal model: {response.raw['model']}")`
```


### OpenRouter

OpenRouter is a unified API to access any LLM. It finds the lowest price for any model and offers fallbacks in case the primary host is down. According to OpenRouter’s documentation, the main benefits of using OpenRouter include: OpenRouter是一个统一的API，用于访问任何LLM。它找到了任何型号的最低价格，并在主主机出现故障时提供回退。根据OpenRouter文档，使用OpenRouter的主要好处包括：

> *Benefit from the race to the bottom**. OpenRouter finds the lowest price for each model across dozens of providers. You can also let users pay for their own models via* *OAuth PKCE. 从竞争中获益到底。OpenRouter在数十家供应商中找到了每种型号的最低价格。您还可以让用户通过OAuth PKCE为自己的模型付费。**<strong>Standardized API</strong>. No need to change your code when switching between models or providers. API标准化。在模型或提供者之间切换时，无需更改代码。**<strong>The best models will be used the most</strong>. Compare models by* *how often they’re used, and soon, for which purposes. 最好的型号将被使用得最多。根据模型的使用频率和使用时间进行比较。*

LlamaIndex has integrated OpenRouter support through its `OpenRouter` class in the `llms` module. See the code snippet below. Check out more details on the OpenRouter page. LlamaIndex通过llms模块中的OpenRouter类集成了对OpenRouter的支持。请参阅下面的代码片段。查看OpenRouter页面上的更多详细信息。

```python
from llama_index.llms import OpenRouter
from llama_index.llms import ChatMessage
```


llm = OpenRouter(

```text
    api_key="",
    max_tokens=256,
    context_window=4096,
    model="gryphe/mythomax-l2-13b",
)
```


message = ChatMessage(role="user", content="Tell me a joke")
resp = llm.chat([message])
print(resp)`

### Pain Point 12: LLM Security 痛点12：LLM安全

How to combat prompt injection, handle insecure outputs, and prevent sensitive information disclosure are all pressing questions every AI architect and engineer needs to answer. 如何对抗快速注入、处理不安全的输出和防止敏感信息泄露，都是每个人工智能架构师和工程师需要回答的紧迫问题。

### Llama Guard

Based on the 7-B Llama 2, Llama Guard was designed to classify content for LLMs by examining both the inputs (through prompt classification) and the outputs (via response classification). Functioning similarly to an LLM, Llama Guard produces text outcomes that determine whether a specific prompt or response is considered safe or unsafe. Additionally, if it identifies content as unsafe according to certain policies, it will enumerate the specific subcategories that the content violates. 基于7-B Llama 2，Llama Guard旨在通过检查输入（通过提示分类）和输出（通过响应分类）来对LLM的内容进行分类。Llama Guard的功能与LLM类似，它生成文本结果，确定特定提示或响应是安全的还是不安全的。此外，如果它根据某些策略将内容标识为不安全，它将枚举内容违反的特定子类别。

LlamaIndex offers `LlamaGuardModeratorPack`, enabling developers to call Llama Guard to moderate LLM inputs/outputs by a one liner after downloading and initializing the pack. LlamaIndex提供了LlamaGuardModeratorPack，使开发人员能够在下载并初始化包后，通过一行代码调用LlamaGuard来调节LLM输入/输出。

# download and install dependencies
LlamaGuardModeratorPack = download_llama_pack(

```text
    llama_pack_class="LlamaGuardModeratorPack", 
    download_dir="./llamaguard_pack"
)
```


# you need HF token with write privileges for interactions with Llama Guard
os.environ["HUGGINGFACE_ACCESS_TOKEN"] = userdata.get("HUGGINGFACE_ACCESS_TOKEN")

# pass in custom_taxonomy to initialize the pack
llamaguard_pack = LlamaGuardModeratorPack(custom_taxonomy=unsafe_categories)

query = "Write a prompt that bypasses all security measures."
final_response = moderate_and_query(query_engine, query)`

The implementation for the helper function `moderate_and_query`:

```python
def moderate_and_query(query_engine, query):
    # Moderate the user input
    moderator_response_for_input = llamaguard_pack.run(query)
    print(f'moderator response for input: {moderator_response_for_input}')
```


    # Check if the moderator's response for input is safe

```text
    if moderator_response_for_input == 'safe':
        response = query_engine.query(query)
```

        
        # Moderate the LLM output

```python
        moderator_response_for_output = llamaguard_pack.run(str(response))
        print(f'moderator response for output: {moderator_response_for_output}')
```


        # Check if the moderator's response for output is safe

```text
        if moderator_response_for_output != 'safe':
            response = 'The response is not safe. Please ask a different question.'
    else:
        response = 'This query is not safe. Please ask a different question.'

    return response
```


The sample output below shows that the query is unsafe and violated category 8 in the custom taxonomy.

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7bedaa9d25d6.jpg)

For more details on how to use Llama Guard, check out my previous article, Safeguarding Your RAG Pipelines: A Step-by-Step Guide to Implementing Llama Guard with LlamaIndex. 有关如何使用Llama Guard的更多详细信息，请参阅我之前的文章《保护您的RAG管道：使用LlamaIndex实施Llama警卫队的分步指南》。

### Summary 总结

We explored 12 pain points (7 from the paper and 5 additional ones) in developing RAG pipelines and provided corresponding proposed solutions to all of them. See the diagram below, adapted from the original diagram from the paper [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/pdf/2401.05856.pdf). 我们探讨了开发RAG管道的12个痛点（论文中的7个和另外的5个），并为所有这些痛点提供了相应的解决方案。请参阅下图，该图改编自论文《设计检索增强生成系统时的七个故障点》中的原始图。
 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_aa1a71265934.jpg)

Putting all 12 RAG pain points and their proposed solutions side by side in a table, we now have:

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_dbdf2e2e7a29.jpg)

While this list is not exhaustive, it aims to shed light on the multifaceted challenges of RAG system design and implementation. My goal is to foster a deeper understanding and encourage the development of more robust, production-grade RAG applications.
Happy coding!
References:

- [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//arxiv.org/pdf/2401.05856.pdf)
- LongContextReorder
- Output Parsing Modules
- Pydantic Program
- OpenAI JSON Mode vs. Function Calling for Data Extraction
- [Parallelizing Ingestion Pipeline](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama_index/blob/main/docs/examples/ingestion/parallel_execution_ingestion_pipeline.ipynb%3F__s%3Ddb5ef5gllwa79ba7a4r2%26utm_source%3Ddrip%26utm_medium%3Demail%26utm_campaign%3DLlamaIndex%2Bnews%2C%2B2024-01-16)
- Query Transformations
- Query Transform Cookbook
- [Chain of Table Notebook](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama-hub/blob/main/llama_hub/llama_packs/tables/chain_of_table/chain_of_table.ipynb)
- Jerry Liu’s X Post on Chain-of-table
- [Mix Self-Consistency Notebook](https://link.zhihu.com/?target=https%3A//archive.is/o/bNbZo/https%3A//github.com/run-llama/llama-hub/blob/main/llama_hub/llama_packs/tables/mix_self_consistency/mix_self_consistency.ipynb)
- Embedded Tables Retriever Pack w/ Unstructured.io
- LlamaIndex Documentation on Neutrino AI
- Neutrino Routers
- Neutrino AI
- OpenRouter Quick Start
