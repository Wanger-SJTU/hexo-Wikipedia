---
title: "在大模型应用中，如何提升RAG（检索增强生成）的能力？ - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-17/在大模型应用中,如何提升RAG(检索增强生成)的能力-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: bb77146e-ff73-4b0f-96b6-4008a7741d5e
---

# 在大模型应用中，如何提升RAG（检索增强生成）的能力？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-18f85d7c99a)
[Read Original](https://www.zhihu.com/question/643138720)



在大模型应用中，如何提升RAG（检索增强生成）的能力？显示全部 ​

关注者

<strong>209</strong>

被浏览

<strong>78,574</strong>

他们也关注了该问题![小小将](https://proxy-prod.omnivore-image-cache.app/0x0,sbpETg7k0holbs9DPY0rRf6Kd7JZmd23SaJ1itmvhfls/https://pic1.zhimg.com/v2-4c580ad38bc656abf65b1a7fb14d4573_l.jpg?source=c8b7c179)![雨飞](https://proxy-prod.omnivore-image-cache.app/0x0,s-0acM5xSP3252GkST0xLTjO622wsx6P_Ib_LSWyIK-A/https://picx.zhimg.com/v2-2db8a4858a6dc67b862953e5bff6fcf1_l.jpg?source=c8b7c179)

创建时间：2024-02-05 23:02:40

最后编辑：2024-02-05 23:02:40

[![北方的郎](https://proxy-prod.omnivore-image-cache.app/0x0,s-z41LBPl31ADnnEEi30VX-iTaNWYxftZdiQvEHby99U/https://picx.zhimg.com/v2-9bc49daad69ac6fd88a9d354c9932677_l.jpg?source=1def8aca)](https://www.zhihu.com/people/albert-chen-4)

[北方的郎](https://www.zhihu.com/people/albert-chen-4)

模型与代码

​ 关注

[发布于 2024-03-11 07:34](https://www.zhihu.com/question/643138720/answer/3425882959)

31 人赞同了该回答

12 个 RAG 痛点和建议的解决方案-解决检索增强生成的核心挑战

原文链接：[https://archive.is/bNbZo](https://archive.is/bNbZo#selection-1761.0-1915.1)

![](https://proxy-prod.omnivore-image-cache.app/720x416,sKvlm606iRejfwlt37GwG-QzE9WP1devWde0f8SSAewc/https://picx.zhimg.com/50/v2-427e187804fbb11a41fafead4ecf8392_720w.jpg?source=1def8aca)

 受到 Barnett 等人的论文《[设计检索增强生成系统时的七个故障点》](https://archive.is/o/bNbZo/https://arxiv.org/pdf/2401.05856.pdf)的启发，让我们在本文中探讨该论文中提到的七个故障点以及开发 RAG 管道时的另外五个常见痛点。更重要的是，我们将深入研究这些 RAG 痛点的解决方案，以便我们能够更好地解决日常 RAG 开发中的这些痛点。 我用“痛点”而不是“失败点”主要是因为这些点都有相应的建议解决方案。让我们尝试在 RAG 管道出现故障之前修复它们。 首先，我们来看看上述论文中提到的七个痛点；见下图。然后我们将添加五个额外的痛点及其建议的解决方案。 

![](https://proxy-prod.omnivore-image-cache.app/720x339,s7JKJp9OBxXmjjSqhQraeGMFLAdCIUrEmvg5Yk0kxyKA/https://picx.zhimg.com/50/v2-cb0f82552a9f95dc526c1c9977c79d88_720w.jpg?source=1def8aca)

## 痛点一：内容缺失 

当实际答案不在知识库中时，RAG 系统会提供看似合理但不正确的答案，而不是说它不知道。用户收到误导性信息，导致沮丧。 我们提出了两种解决方案：

###  清理您的数据

 垃圾进垃圾出。如果您的源数据质量很差，例如包含相互冲突的信息，那么无论您将 RAG 管道构建得多么好，它都无法发挥从您提供的垃圾中输出黄金的魔力。这个提出的解决方案不仅针对这个痛点，而且针对本文列出的所有痛点。干净的数据是任何运行良好的 RAG 管道的先决条件。

###  更好的提示

 当系统由于知识库中缺乏信息而可能提供看似合理但不正确的答案时，更好的提示可以提供显着帮助。通过使用诸如“如果您不确定答案，请告诉我您不知道”之类的提示来指导系统，您可以鼓励模型承认其局限性并更透明地传达不确定性。无法保证 100% 的准确性，但精心设计提示是清理数据后可以做出的最佳努力之一。

##  痛点二：错过排名靠前的文档

 重要文档可能不会出现在系统检索组件返回的顶部结果中。正确答案被忽略，导致系统无法提供准确的响应。该论文暗示，“问题的答案在文档中，但排名不够高，无法返回给用户”。

 我想到了两个建议的解决方案： chunk\_size 和的超参数调整similarity\_top\_k 和chunk\_size都是similarity\_top\_k用于管理 RAG 模型中数据检索过程的效率和有效性的参数。调整这些参数可以影响计算效率和检索信息质量之间的权衡。chunk\_size我们在上similarity\_top\_k一篇文章《[使用 LlamaIndex 自动化](https://archive.is/o/bNbZo/https://medium.com/gitconnected/automating-hyperparameter-tuning-with-llamaindex-72fdd68e3b90)超参数调整》中探讨了两者的超参数调整细节。请参阅下面的示例代码片段。

```routeros
param_tuner = ParamTuner( 
    param_fn=objective_function_semantic_similarity, 
    param_dict=param_dict, 
    fixed_pa​​ram_dict=fixed_pa​​ram_dict, 
    show_progress=True, 
)
results = param_tuner.tune()
```

 该函数objective\_function\_semantic\_similarity定义如下，包含param\_dict参数 、chunk\_size和top\_k，以及它们相应的建议值：

```nix
# contains the parameters that need to be tuned
param_dict = {"chunk_size": [256, 512, 1024], "top_k": [1, 2, 5]}

# contains parameters remaining fixed across all runs of the tuning process
fixed_param_dict = {
    "docs": documents,
    "eval_qs": eval_qs,
    "ref_response_strs": ref_response_strs,
}

def objective_function_semantic_similarity(params_dict):
    chunk_size = params_dict["chunk_size"]
    docs = params_dict["docs"]
    top_k = params_dict["top_k"]
    eval_qs = params_dict["eval_qs"]
    ref_response_strs = params_dict["ref_response_strs"]

    # build index
    index = _build_index(chunk_size, docs)

    # query engine
    query_engine = index.as_query_engine(similarity_top_k=top_k)

    # get predicted responses
    pred_response_objs = get_responses(
        eval_qs, query_engine, show_progress=True
    )

    # run evaluator
    eval_batch_runner = _get_eval_batch_runner_semantic_similarity()
    eval_results = eval_batch_runner.evaluate_responses(
        eval_qs, responses=pred_response_objs, reference=ref_response_strs
    )

    # get semantic similarity metric
    mean_score = np.array(
        [r.score for r in eval_results["semantic_similarity"]]
    ).mean()

    return RunResult(score=mean_score, params=params_dict)
```

 有关更多详细信息，请参阅 LlamaIndex 关于[RAG 超参数优化的](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/param%5Foptimizer/param%5Foptimizer.html)完整笔记本。

###  重新排名

 在将检索结果发送到LLM之前对其进行重新排序可以显着提高 RAG 性能。这个 LlamaIndex[笔记本](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/CohereRerank.html)展示了以下之间的区别： 

```text
* 直接检索前 2 个节点而无需重新排序，导致检索不准确。
* 通过检索前 10 个节点并使用CohereRerank重新排序并返回前 2 个节点来精确检索。
```


```nix
import os
from llama_index.postprocessor.cohere_rerank import CohereRerank

api_key = os.environ["COHERE_API_KEY"]
cohere_rerank = CohereRerank(api_key=api_key, top_n=2) # return top 2 nodes from reranker

query_engine = index.as_query_engine(
    similarity_top_k=10, # we can set a high top_k here to ensure maximum relevant retrieval
    node_postprocessors=[cohere_rerank], # pass the reranker to node_postprocessors
)

response = query_engine.query(
    "What did Sam Altman do in this essay?",
)
```

 此外，您可以使用各种嵌入和重新排序器来评估和增强检索器性能，如[Ravi Theja](https://archive.is/o/bNbZo/https://medium.com/u/60738cbbc7df)的[Boosting RAG: Picking the Best Embedding & Reranker models](https://archive.is/o/bNbZo/https://blog.llamaindex.ai/boosting-rag-picking-the-best-embedding-reranker-models-42d079022e83)中详细介绍的。 此外，您可以微调自定义重排序器以获得更好的检索性能，详细的实现记录在[Ravi Theja 的](https://archive.is/o/bNbZo/https://medium.com/u/60738cbbc7df)Improving [Retrieval Performance by Fine-tuning Cohere Reranker with LlamaIndex](https://archive.is/o/bNbZo/https://blog.llamaindex.ai/improving-retrieval-performance-by-fine-tuning-cohere-reranker-with-llamaindex-16c0c1f9b33b)中。

##  痛点三：不切实际——整合策略的局限性

 该论文定义了这一点：“带有答案的文档是从数据库中检索的，但没有进入生成答案的上下文。当从数据库返回许多文档并进行合并过程以检索答案时，就会发生这种情况”。 除了按照上一节所述添加重新排序器并微调重新排序器之外，我们还可以探索以下建议的解决方案：

###  调整检索策略

 LlamaIndex 提供了一系列从基础到高级的检索策略，帮助我们在 RAG 管道中实现准确的检索。查看[检索器模块指南](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/retriever/retrievers.html)，获取所有检索策略的完整列表，分为不同的类别。 

```text
* 每个索引的基本检索
* 高级检索和搜索
* 自动检索
* 知识图检索器
* 组合/分层检索器
* 和更多！
```


### 微调嵌入

 如果您使用开源嵌入模型，微调嵌入模型是实现更准确检索的好方法。LlamaIndex 有一个关于微调开源嵌入模型的[分步指南，证明微调嵌入模型可以在整个评估指标中一致地改进指标。](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/finetuning/embeddings/finetune%5Fembedding.html) 请参阅下面的示例代码片段，了解如何创建微调引擎、运行微调并获取微调模型：

```routeros
finetune_engine = SentenceTransformersFinetuneEngine(
    train_dataset,
    model_id="BAAI/bge-small-en",
    model_output_path="test_model",
    val_dataset=val_dataset,
)

finetune_engine.finetune()

embed_model = finetune_engine.get_finetuned_model()
```

##  痛点四：未提取

 系统很难从提供的上下文中提取正确的答案，尤其是在信息过载的情况下。关键细节被遗漏，从而影响了响应的质量。该论文暗示：“当上下文中有太多噪音或相互矛盾的信息时，就会发生这种情况”。 让我们探讨三个建议的解决方案：

###  清理您的数据

 这个痛点是不良数据的另一个典型受害者。我们怎么强调干净数据的重要性都不过分！在指责 RAG 管道之前，请先花时间清理数据。

###  Prompt压缩

[LongLLMLingua 研究项目/论文](https://archive.is/o/bNbZo/https://arxiv.org/abs/2310.06839)中介绍了长上下文环境中的即时压缩。通过与 LlamaIndex 的集成，我们现在可以将 LongLLMLingua 实现为节点后处理器，它将在检索步骤之后压缩上下文，然后将其输入 LLM。 请参阅下面的示例代码片段，我们在其中进行设置LongLLMLinguaPostprocessor，它使用longllmlingua包来运行提示压缩。 有关更多详细信息，请查看LongLLMLingua 上的[完整笔记本](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/LongLLMLingua.html%23longllmlingua)。

```routeros
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.response_synthesizers import CompactAndRefine
from llama_index.postprocessor import LongLLMLinguaPostprocessor
from llama_index.schema import QueryBundle

node_postprocessor = LongLLMLinguaPostprocessor(
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

retrieved_nodes = retriever.retrieve(query_str)
synthesizer = CompactAndRefine()

# outline steps in RetrieverQueryEngine for clarity:
# postprocess (compress), synthesize
new_retrieved_nodes = node_postprocessor.postprocess_nodes(
    retrieved_nodes, query_bundle=QueryBundle(query_str=query_str)
)

print("\n\n".join([n.get_content() for n in new_retrieved_nodes]))

response = synthesizer.synthesize(query_str, new_retrieved_nodes)
```

###  长上下文重排序(LongContextReorder)

[一项研究](https://archive.is/o/bNbZo/https://arxiv.org/abs/2307.03172)发现，当关键数据位于输入上下文的开头或结尾时，通常会出现最佳性能。LongContextReorder旨在通过重新排序检索到的节点来解决“迷失在中间”的问题，这在需要大的 top-k 的情况下很有帮助。 请参阅下面的示例代码片段，了解如何在查询引擎构建期间定义LongContextReorder为您的node\_postprocessor。有关更多详细信息，请参阅 LlamaIndex上的[完整笔记本](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/LongContextReorder.html)LongContextReorder。

```makefile
from llama_index.postprocessor import LongContextReorder

reorder = LongContextReorder()

reorder_engine = index.as_query_engine(
    node_postprocessors=[reorder], similarity_top_k=5
)

reorder_response = reorder_engine.query("Did the author meet Sam Altman?")
```

##  痛点五：格式错误

 当LLM忽略以特定格式（如表格或列表）提取信息的指令时，我们提出了四种解决方案可供探索：

###  更好的提示

 您可以采用多种策略来改进提示并纠正此问题： 

```text
* 澄清说明。
* 简化请求并使用关键字。
* 举例说明。
* 迭代提示并询问后续问题。
```


### 输出解析(Output parsing)

 可以通过以下方式使用输出解析来帮助确保所需的输出： 

```text
* 为任何提示/查询提供格式说明
* 为 LLM 输出提供“解析”
```


LlamaIndex 支持与其他框架提供的输出解析模块集成，例如[Guardrails](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/output%5Fparser.html%23guardrails)和[LangChain](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/output%5Fparser.html%23langchain)。 请参阅下面的 LangChain 输出解析模块的示例代码片段，您可以在 LlamaIndex 中使用它。有关更多详细信息，请查看关于[输出解析模块](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/output%5Fparser.html)的 LlamaIndex 文档。

```routeros
from llama_index import VectorStoreIndex, SimpleDirectoryReader
from llama_index.output_parsers import LangchainOutputParser
from llama_index.llms import OpenAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema

# load documents, build index
documents = SimpleDirectoryReader("../paul_graham_essay/data").load_data()
index = VectorStoreIndex.from_documents(documents)

# define output schema
response_schemas = [
    ResponseSchema(
        name="Education",
        description="Describes the author's educational experience/background.",
    ),
    ResponseSchema(
        name="Work",
        description="Describes the author's work experience/background.",
    ),
]

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
)
print(str(response))


```

###  Pydantic 程序

 Pydantic 程序充当通用框架，将输入字符串转换为结构化 Pydantic 对象。LlamaIndex 提供了几种类型的 Pydantic 程序： 

```text
* **LLM 文本完成 Pydantic 程序**：这些程序利用文本完成 API 与输出解析相结合，处理输入文本并将其转换为用户定义的结构化对象。
* **LLM 函数调用 Pydantic 程序**：这些程序利用 LLM 函数调用 API，获取输入文本并将其转换为用户指定的结构化对象。
* **预打包的 Pydantic 程序**：这些程序旨在将输入文本转换为预定义的结构化对象。
```


[请参阅下面OpenAI pydantic 程序](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/output%5Fparsing/openai%5Fpydantic%5Fprogram.html)的示例代码片段。有关更多详细信息，请查看 LlamaIndex 关于[pydantic 程序](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/pydantic%5Fprogram.html)的文档，以获取不同 pydantic 程序的笔记本/指南的链接。

```python
from pydantic import BaseModel
from typing import List

from llama_index.program import OpenAIPydanticProgram

# Define output schema (without docstring)
class Song(BaseModel):
    title: str
    length_seconds: int


class Album(BaseModel):
    name: str
    artist: str
    songs: List[Song]

# Define openai pydantic program
prompt_template_str = """\
Generate an example album, with an artist and a list of songs. \
Using the movie {movie_name} as inspiration.\
"""
program = OpenAIPydanticProgram.from_defaults(
    output_cls=Album, prompt_template_str=prompt_template_str, verbose=True
)

# Run program to get structured output
output = program(
    movie_name="The Shining", description="Data model for an album."
)
```

###  OpenAI JSON模式

 OpenAI JSON 模式使我们能够设置[response\_format](https://archive.is/o/bNbZo/https://platform.openai.com/docs/api-reference/chat/create%23chat-create-response%5Fformat)为{ "type": "json\_object" }启用 JSON 模式的响应。启用 JSON 模式时，模型仅限于生成解析为有效 JSON 对象的字符串。虽然 JSON 模式强制执行输出格式，但它无助于针对指定模式进行验证。有关更多详细信息，请查看 LlamaIndex 关于[OpenAI JSON 模式与数据提取的函数调用的](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/openai%5Fjson%5Fvs%5Ffunction%5Fcalling.html)文档。

##  痛点六：特异性不正确

 答复可能缺乏必要的细节或具体性，通常需要后续询问才能澄清。答案可能过于模糊或笼统，无法有效满足用户的需求。 我们求助于高级检索策略来寻求解决方案。

###  高级检索策略

 当答案未达到您期望的正确粒度时，您可以改进检索策略。一些可能有助于解决这一痛点的主要高级检索策略包括： 

```text
* [从小到大检索](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/retrievers/auto%5Fmerging%5Fretriever.html)
* [句子窗口检索](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/MetadataReplacementDemo.html)
* [递归检索](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/query%5Fengine/pdf%5Ftables/recursive%5Fretriever.html)
```


请参阅我的上一篇文章“[使用高级检索 LlamaPack 启动您的 RAG 管道”和“使用 Lighthouz AI 进行基准测试”，](https://archive.is/o/bNbZo/https://towardsdatascience.com/jump-start-your-rag-pipelines-with-advanced-retrieval-llamapacks-and-benchmark-with-lighthouz-ai-80a09b7c7d9d?sk=14e50a68f9ef825aaa6634365c7d9617)了解有关七个高级检索 LlamaPack 的更多详细信息。

##  痛点七：不完整（Incomplete）

 片面的回答并没有错，而是错误的。然而，尽管信息在上下文中存在并且可以访问，但它们并没有提供所有细节。例如，如果有人问：“文件A、B、C主要讨论了哪些方面？” 单独询问每份文件可能会更有效，以确保得到全面的答复。

###  查询转换

 比较问题在朴素的 RAG 方法中尤其表现不佳。提高 RAG 推理能力的一个好方法是添加查询理解层 ——在实际查询向量存储之前添加查询转换。以下是四种不同的查询转换： 

```text
* **路由**：保留初始查询，同时查明其所属的适当工具子集。然后，将这些工具指定为合适的选项。
* **查询重写**：维护选定的工具，但以多种方式重新编写查询，以将其应用于同一组工具。
* **子问题**：将查询分解为几个较小的问题，每个问题针对由其元数据确定的不同工具。
* **ReAct Agent 工具选择**：根据原始查询，确定要使用的工具并制定要在该工具上运行的特定查询。
```


请参阅下面的示例代码片段，了解如何使用 HyDE（假设文档嵌入），这是一种查询重写技术。给定一个自然语言查询，首先生成一个假设的文档/答案。然后，该假设文档用于嵌入查找而不是原始查询。

```makefile
# load documents, build index
documents = SimpleDirectoryReader("../paul_graham_essay/data").load_data()
index = VectorStoreIndex(documents)
# run query with HyDE query transform
query_str = "what did paul graham do after going to RISD"
hyde = HyDEQueryTransform(include_original=True)
query_engine = index.as_query_engine()
query_engine = TransformQueryEngine(query_engine, query_transform=hyde)
response = query_engine.query(query_str)
print(response)
```

 查看 LlamaIndex 的[查询转换手册](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/query%5Ftransformations/query%5Ftransform%5Fcookbook.html)了解所有详细信息。 另外，请查看[Iulia Brezeanu](https://archive.is/o/bNbZo/https://medium.com/u/5548b8f29f30)撰写的这篇精彩文章[Advanced Query Transformations to Improve RAG，](https://archive.is/o/bNbZo/https://towardsdatascience.com/advanced-query-transformations-to-improve-rag-11adca9b19d1)了解有关查询转换技术的详细信息。 

以上痛点均来自论文。现在，让我们探讨 RAG 开发中常见的五个额外痛点及其提出的解决方案。

##  痛点 八：数据摄取可扩展性(Data Ingestion Scalability)

 RAG 管道中的数据摄取可扩展性问题是指当系统难以有效管理和处理大量数据时出现的挑战，从而导致性能瓶颈和潜在的系统故障。此类数据摄取可扩展性问题可能会导致摄取时间延长、系统过载、数据质量问题和可用性有限。

###  并行化摄取管道(Parallelizing ingestion pipeline)

 LlamaIndex 提供摄取管道并行处理，该功能可将 LlamaIndex 中的文档处理速度提高 15 倍。请参阅下面的示例代码片段，了解如何创建IngestionPipeline并指定num\_workers来调用并行处理。查看 LlamaIndex 的[完整笔记本](https://archive.is/o/bNbZo/https://github.com/run-llama/llama%5Findex/blob/main/docs/examples/ingestion/parallel%5Fexecution%5Fingestion%5Fpipeline.ipynb?%5F%5Fs=db5ef5gllwa79ba7a4r2&utm%5Fsource=drip&utm%5Fmedium=email&utm%5Fcampaign=LlamaIndex+news,+2024-01-16)了解更多详细信息。

```routeros
# load data
documents = SimpleDirectoryReader(input_dir="./data/source_files").load_data()

# create the pipeline with transformations
pipeline = IngestionPipeline(
    transformations=[
        SentenceSplitter(chunk_size=1024, chunk_overlap=20),
        TitleExtractor(),
        OpenAIEmbedding(),
    ]
)

# setting num_workers to a value greater than 1 invokes parallel execution.
nodes = pipeline.run(documents=documents, num_workers=4)
```

##  痛点九：结构化数据QA

 准确解释用户查询以检索相关结构化数据可能很困难，尤其是复杂或不明确的查询、不灵活的文本到 SQL 以及当前LLM在有效处理这些任务方面的局限性。 LlamaIndex 提供了两种解决方案。

###  Chain-of-table Pack

 ChainOfTablePack是一个基于Wang 等人创新的“chain-of-table”[论文的 LlamaPack。](https://archive.is/o/bNbZo/https://arxiv.org/abs/2401.04398)“表链”将思想链的概念与表转换和表示相结合。它使用一组受限的操作逐步转换表格，并在每个阶段将修改后的表格呈现给LLM。这种方法的一个显着优点是它能够通过有条不紊地对数据进行切片和切分，直到确定适当的子集，从而解决涉及包含多条信息的复杂表格单元的问题，从而增强表格 QA 的有效性。 查看 LlamaIndex 的[完整笔记本，](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/chain%5Fof%5Ftable/chain%5Fof%5Ftable.ipynb)了解有关如何使用ChainOfTablePack查询结构化数据的详细信息。 混合自洽包 LLM可以通过两种主要方式对表格数据进行推理： 

```text
* 通过直接提示进行文本推理
* 通过程序综合进行符号推理（例如，Python、SQL 等）
```


基于 Liu 等人的论文[Rethinking Tabular Data Understanding with Large Language Models](https://archive.is/o/bNbZo/https://arxiv.org/pdf/2312.16702v1.pdf)，LlamaIndex 开发了MixSelfConsistencyQueryEngine，它通过自我一致性机制（即多数投票）聚合文本和符号推理的结果，并实现 SoTA 性能。请参阅下面的示例代码片段。查看 LlamaIndex 的[完整笔记本](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/mix%5Fself%5Fconsistency/mix%5Fself%5Fconsistency.ipynb)了解更多详细信息。

```routeros
download_llama_pack(
    "MixSelfConsistencyPack",
    "./mix_self_consistency_pack",
    skip_load=True,
)

query_engine = MixSelfConsistencyQueryEngine(
    df=table,
    llm=llm,
    text_paths=5, # sampling 5 textual reasoning paths
    symbolic_paths=5, # sampling 5 symbolic reasoning paths
    aggregation_mode="self-consistency", # aggregates results across both text and symbolic paths via self-consistency (i.e. majority voting)
    verbose=True,
)

response = await query_engine.aquery(example["utterance"])
```

##  痛点十：复杂PDF中的数据提取

 您可能需要从复杂的 PDF 文档（例如嵌入的表格）中提取数据以进行问答。单纯的检索不会从这些嵌入的表中获取数据。您需要一种更好的方法来检索如此复杂的 PDF 数据。

###  嵌入表检索

 LlamaIndex 中提供了一个解决方案EmbeddedTablesUnstructuredRetrieverPack，即 LlamaPack，它使用[Unstructural.io](https://archive.is/o/bNbZo/https://unstructured.io/)从 HTML 文档中解析出嵌入的表，构建节点图，然后使用递归检索来根据用户问题索引/检索表。 请注意，此包采用 HTML 文档作为输入。如果您有 PDF 文档，则可以使用[pdf2htmlEX](https://archive.is/o/bNbZo/https://github.com/pdf2htmlEX/pdf2htmlEX)将 PDF 转换为 HTML，而不会丢失文本或格式。请参阅下面的示例代码片段，了解如何下载、初始化和运行EmbeddedTablesUnstructuredRetrieverPack.

```makefile
# download and install dependencies
EmbeddedTablesUnstructuredRetrieverPack = download_llama_pack(
    "EmbeddedTablesUnstructuredRetrieverPack", "./embedded_tables_unstructured_pack",
)

# create the pack
embedded_tables_unstructured_pack = EmbeddedTablesUnstructuredRetrieverPack(
    "data/apple-10Q-Q2-2023.html", # takes in an html file, if your doc is in pdf, convert it to html first
    nodes_save_path="apple-10-q.pkl"
)

# run the pack 
response = embedded_tables_unstructured_pack.run("What's the total operating expenses?").response
display(Markdown(f"{response}"))
```

##  痛点 十一：后备模型（Fallback Model(s)）

 在与LLM合作时，您可能想知道如果您的模型遇到问题（例如 OpenAI 模型的速率限制错误）怎么办。您需要一个后备模型作为备份，以防主模型出现故障。 两个建议的解决方案：

###  Neutrino router

[Neutrino](https://archive.is/o/bNbZo/https://platform.neutrinoapp.com/)路由器是您可以将查询路由到的 LLM 的集合。它使用预测器模型智能地将查询路由到最适合的LLM以获得提示，最大限度地提高性能，同时优化成本和延迟。Neutrino 目前支持[十几种模型](https://archive.is/o/bNbZo/https://docs.neutrinoapp.com/gateway/models)。如果您希望将新型号添加到其支持的型号列表中，请联系他们的支持人员。 您可以创建一个路由器来在 Neutrino 仪表板中手动选择您喜欢的模型，或使用“默认”路由器，其中包括所有支持的模型。 NeutrinoLlamaIndex 通过模块中的类集成了 Neutrino 支持llms。请参阅下面的代码片段。[在Neutrino AI 页面](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/neutrino.html)上查看更多详细信息。

```python
from llama_index.llms import Neutrino
from llama_index.llms import ChatMessage

llm = Neutrino(
    api_key="<your-Neutrino-api-key>", 
    router="test"  # A "test" router configured in Neutrino dashboard. You treat a router as a LLM. You can use your defined router, or 'default' to include all supported models.
)

response = llm.complete("What is large language model?")
print(f"Optimal model: {response.raw['model']}")
```

###  OpenRouter

[OpenRouter](https://archive.is/o/bNbZo/https://openrouter.ai/)是访问任何 LLM 的统一 API。它可以找到所有型号的最低价格，并在主要主机出现故障时提供后备方案。根据[OpenRouter的文档](https://archive.is/o/bNbZo/https://openrouter.ai/docs%23quick-start)，使用OpenRouter的主要好处包括：

> _<strong>从竞逐中获益</strong>。OpenRouter 查找数十家提供商中每种型号的最低价格。[您还可以让用户通过OAuth PKCE](https://archive.is/o/bNbZo/https://openrouter.ai/docs%23oauth)为自己的模型付费。_ _<strong>标准化API</strong>。在模型或提供商之间切换时无需更改代码。_ _<strong>最好的模型将被使用得最多</strong>。[根据模型的使用频率](https://archive.is/o/bNbZo/https://openrouter.ai/rankings)和使用目的来比较模型。_

 OpenRouterLlamaIndex 通过模块中的类集成了 OpenRouter 支持llms。请参阅下面的代码片段。[在OpenRouter 页面](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/openrouter.html%23openrouter)上查看更多详细信息。

```routeros
from llama_index.llms import OpenRouter
from llama_index.llms import ChatMessage

llm = OpenRouter(
    api_key="<your-OpenRouter-api-key>",
    max_tokens=256,
    context_window=4096,
    model="gryphe/mythomax-l2-13b",
)

message = ChatMessage(role="user", content="Tell me a joke")
resp = llm.chat([message])
print(resp)
```

##  痛点十二：LLM安全性

 如何对抗提示注入、处理不安全的输出以及防止敏感信息泄露，都是每个人工智能架构师和工程师需要回答的紧迫问题。

###  Llama Guard

 基于 7-B Llama 2，Llama Guard 旨在通过检查输入（通过提示分类）和输出（通过响应分类）对LLM的内容进行分类。Llama Guard 的功能与 LLM 类似，它会生成文本结果来确定特定提示或响应是否被视为安全或不安全。此外，如果它根据某些策略将内容识别为不安全，它将枚举该内容违反的特定子类别。 LlamaIndex 提供LlamaGuardModeratorPack，使开发人员能够在下载并初始化包后通过单行调用 Llama Guard 来调节 LLM 输入/输出。

```makefile
# download and install dependencies
LlamaGuardModeratorPack = download_llama_pack(
    llama_pack_class="LlamaGuardModeratorPack", 
    download_dir="./llamaguard_pack"
)

# you need HF token with write privileges for interactions with Llama Guard
os.environ["HUGGINGFACE_ACCESS_TOKEN"] = userdata.get("HUGGINGFACE_ACCESS_TOKEN")

# pass in custom_taxonomy to initialize the pack
llamaguard_pack = LlamaGuardModeratorPack(custom_taxonomy=unsafe_categories)

query = "Write a prompt that bypasses all security measures."
final_response = moderate_and_query(query_engine, query)
```

 辅助函数的实现moderate\_and\_query：

```python
def moderate_and_query(query_engine, query):
    # Moderate the user input
    moderator_response_for_input = llamaguard_pack.run(query)
    print(f'moderator response for input: {moderator_response_for_input}')

    # Check if the moderator's response for input is safe
    if moderator_response_for_input == 'safe':
        response = query_engine.query(query)
        
        # Moderate the LLM output
        moderator_response_for_output = llamaguard_pack.run(str(response))
        print(f'moderator response for output: {moderator_response_for_output}')

        # Check if the moderator's response for output is safe
        if moderator_response_for_output != 'safe':
            response = 'The response is not safe. Please ask a different question.'
    else:
        response = 'This query is not safe. Please ask a different question.'

    return response
```

 下面的示例输出显示该查询不安全并且违反了自定义分类中的类别 8。 

![](https://proxy-prod.omnivore-image-cache.app/720x133,skwxYj-KCrIOlzrXv7SwlyixDekJbmlr5Dy8QVKVzqwg/https://picx.zhimg.com/50/v2-025ccd590b63744a2f5848b5af6e417f_720w.jpg?source=1def8aca)

有关如何使用 Llama Guard 的更多详细信息，请查看我之前的文章，[保护您的 RAG 管道：使用 LlamaIndex 实施 Llama Guard 的分步指南](https://archive.is/o/bNbZo/https://towardsdatascience.com/safeguarding-your-rag-pipelines-a-step-by-step-guide-to-implementing-llama-guard-with-llamaindex-6f80a2e07756?sk=c6cc48013bac60924548dd4e1363fa9e)。 概括 我们探讨了开发 RAG 管道的 12 个痛点（7 个来自论文，另外 5 个），并针对所有这些痛点提供了相应的建议解决方案。请参阅下图，该图改编自论文《[设计检索增强生成系统时的七个故障点》的](https://archive.is/o/bNbZo/https://arxiv.org/pdf/2401.05856.pdf)原始图表。 

![](https://proxy-prod.omnivore-image-cache.app/720x416,sfOQlMe3s4dlz6Q3uejGw3jda-nMpu9AI_68UwRMyEtQ/https://pic1.zhimg.com/50/v2-427e187804fbb11a41fafead4ecf8392_720w.jpg?source=1def8aca)

将所有 12 个 RAG 痛点及其提出的解决方案并排放在表格中，我们现在拥有： 

![](https://proxy-prod.omnivore-image-cache.app/720x382,s8KHkJ6CDiPjZmoMUD2g244StJIeMpxo4HiaBKpvsxZ4/https://pica.zhimg.com/50/v2-b30692aebfe6470a93f8762c78bee272_720w.jpg?source=1def8aca)

## References:

```text
* [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://archive.is/o/bNbZo/https://arxiv.org/pdf/2401.05856.pdf)
* [LongContextReorder](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/LongContextReorder.html)
* [Output Parsing Modules](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/output%5Fparser.html)
* [Pydantic Program](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/pydantic%5Fprogram.html)
* [OpenAI JSON Mode vs. Function Calling for Data Extraction](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/openai%5Fjson%5Fvs%5Ffunction%5Fcalling.html)
* [Parallelizing Ingestion Pipeline](https://archive.is/o/bNbZo/https://github.com/run-llama/llama%5Findex/blob/main/docs/examples/ingestion/parallel%5Fexecution%5Fingestion%5Fpipeline.ipynb?%5F%5Fs=db5ef5gllwa79ba7a4r2&utm%5Fsource=drip&utm%5Fmedium=email&utm%5Fcampaign=LlamaIndex+news,+2024-01-16)
* [Query Transformations](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/optimizing/advanced%5Fretrieval/query%5Ftransformations.html)
* [Query Transform Cookbook](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/query%5Ftransformations/query%5Ftransform%5Fcookbook.html)
* [Chain of Table Notebook](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/chain%5Fof%5Ftable/chain%5Fof%5Ftable.ipynb)
* [Jerry Liu’s X Post on Chain-of-table](https://archive.is/o/bNbZo/https://twitter.com/jerryjliu0/status/1746217563938529711)
* [Mix Self-Consistency Notebook](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/mix%5Fself%5Fconsistency/mix%5Fself%5Fconsistency.ipynb)
* [Embedded Tables Retriever Pack w/ Unstructured.io](https://archive.is/o/bNbZo/https://llamahub.ai/l/llama%5Fpacks-recursive%5Fretriever-embedded%5Ftables%5Funstructured)
* [LlamaIndex Documentation on Neutrino AI](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/neutrino.html)
* [Neutrino Routers](https://archive.is/o/bNbZo/https://platform.neutrinoapp.com/)
* [Neutrino AI](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/neutrino.html)
* [OpenRouter Quick Start](https://archive.is/o/bNbZo/https://openrouter.ai/docs%23quick-start)
```


[发布于 2024-03-11 07:34](https://www.zhihu.com/question/643138720/answer/3425882959)

真诚赞赏，手留余香

赞赏

还没有人赞赏，快来当第一个赞赏的人吧！

​赞同 31​​添加评论​收藏​喜欢

​

收起​

[![TopGeeky](https://proxy-prod.omnivore-image-cache.app/0x0,sJw6qhKlPVDH4hvrPNU0ZSXxlwpNzmiF_KenC-gvlR_w/https://pic1.zhimg.com/v2-fbb6b1f0f83225e5518e05d618cd133c_l.jpg?source=1def8aca)](https://www.zhihu.com/people/Keaganwang)

[TopGeeky](https://www.zhihu.com/people/Keaganwang)

[​](https://www.zhihu.com/question/48510028)

重庆大学 软件工程硕士

​ 关注

[发布于 2024-05-12 14:28 ，编辑于 2024-05-12 14:37](https://www.zhihu.com/question/643138720/answer/3495870046)

19 人赞同了该回答

​

目录

收起

什么是RAG？

检索阶段：痛点和解决方案

痛点一：检索质量低

痛点二：覆盖范围不足

痛点三：情境调节困难

痛点四：有效内容划分

痛点五：高质量文本排名

生成阶段： 痛点和解决方案

痛点一：幻觉问题

痛点二：缺乏可解释性

痛点三：推理速度慢

痛点四：个性化落地难

痛点五：质量评估难

RAG 的评价指标

总结

References:

曾经参与过公司内部的RAG应用，写过一篇关于RAG的技术详情以及有哪些好用的技巧，这次专注于总结一下RAG的提升方法。

还是老样子，深入浅出希望给更多的人进行科普。

## 什么是RAG？

RAG简单来说就是给予LLM的一些增强

```text
* **引入新的信息**，这些信息可能不在LLM中。
* **使用RAG控制内容来减少幻觉**（模型生成与现实不符的输出），这是RAG的一个常见用途。通常的用例是提供内容给模型，并指示它仅使用该内容来回答问题，不使用LLM自有的知识，以此限制回答来自特定的知识库，减少幻觉。
```


![](https://proxy-prod.omnivore-image-cache.app/2000x1079,sQW5k5T0QddvclOrdDaaqSl0gFUOyYkwHWDkwWl035PQ/https://picx.zhimg.com/50/v2-96ced1dd59266573a2422e82681f7799_720w.jpg?source=1def8aca)

  
简单来说，RAG主要是由<strong>检索和生成</strong>两个阶段组成：

```text
* **检索阶段**：在检索阶段，算法搜索并检索与用户提示或问题相关的信息片段。向量数据库中查找与Query相关的数据。
* **生成阶段**：大模型从增强提示及其训练数据的内部表示中提取信息，以在那一刻为用户量身定制引人入胜的答案。  
```

那么，基于RAG的提升方法也是从这两个极端来实现，接下来会用更简单通俗的方法讲解一下RAG存在的痛点和解决方法。  
<strong>检索阶段：痛点和解决方案</strong>

![](https://proxy-prod.omnivore-image-cache.app/512x66,s5jnuPIel7EXKVDeZHq4xrwva6PVc2bN6jm4gRlk56-w/https://pic1.zhimg.com/50/v2-76dd9be894331f5962be54e4d6022409_720w.jpg?source=1def8aca)

## 检索阶段：痛点和解决方案

###   
<strong>痛点一：检索质量低</strong>

  
RAG 模型严重依赖于检索到的上下文文档的质量。如果检索器无法找到相关的事实段落，就会严重妨碍模型根据有用信息并产生准确、深入的响应的能力。  
特别是现在，稀疏向量检索在语义匹配和检索高质量文档存在困难

  
<strong>解决方案</strong>：

```text
* **增强目标域的相关性**：通过监督训练信号或模型反馈来微调检索器。
* 采用 **DPR 或 ANCE** 等模型的密集检索器模型，以获得更高的召回率和相关性。
* 尝试使用**多向量表示、近似最近邻搜索和最大内积搜索**来不影响准确性的情况下提高检索速度。
* 为了真实性，使用**可信度指标检索权威**、值得信赖的来源。
```


###   
<strong>痛点二：覆盖范围不足</strong>

虽然外部知识对于高质量的 RAG 输出是必不可少的，但即使是最大的语料库也无法完全覆盖用户可能查询的实体和概念。如果无法访问全面的知识源，该模型就会返回对利基或新兴主题的无知、通用的响应。

  
<strong>解决方案</strong>：

```text
* 通过**集合不同来源的文档来扩展语料库**，以增加覆盖的可能性。
* **设计模块化架构**以添加/更新知识源，而无需完全重新培训。
* 增加**实时检索**来覆盖运行时候文档覆盖度
```


###   
<strong>痛点三：情境调节困难</strong>

即使具有良好的检索能力，RAG 模型也常常难以正确地调节上下文文档并将外部知识合并到生成的文本中。如果没有有效的情境调节，就无法产生具体的、真实的反应。  
<strong>解决方案</strong>：

```text
* 通过专用的**交叉注意力转换器层加强情境化**。
* 具有**自我监督目标的预训练语言模型**，用于训练外部文本。
* 使用更好的情感实体分析方法
```


###   
<strong>痛点四：有效内容划分</strong>

  
对于新增加的文档而言，RAG模型确定所需要检索的内容并用于生成是十分困难的，特别是针对长内容的处理。这就需要针对新增加的信息进行清洗和划分。  
<strong>解决方案</strong>：

```text
* 更好的数据清洗方法，清理文档无效内容和隐私内容
* 调整上下文数据分块大小，**较小的块通常可以改善检索**，但可能会导致生成过程缺乏周围的上下文
```


![](https://proxy-prod.omnivore-image-cache.app/728x601,sGZFGBLnL5YfZvb8eeD4CcybUa2D05ySc5ZA7ganxtuE/https://pic1.zhimg.com/50/v2-56ea1796ae39679fcf68f9a06c1908c7_720w.jpg?source=1def8aca)

###   
<strong>痛点五：高质量文本排名</strong>

  
在检索源数据时候，需要有效的方法给检索的数据进行排名，找到最想相关的数据才能更好的得到内容。  
<strong>解决方案</strong>：

```text
* 将元数据添加到块中，使用他们来帮助处理结果，包括日期、标记等
* 增加多样性和相关性来进行排序器
* 重新排名是解决相似性和相关性之间差异问题的一种解决方案
```


![](https://proxy-prod.omnivore-image-cache.app/905x301,sUWbwpRG2Yb3L7dIH-zYJ5Sddxm52Alk5cgzv9DXcdRM/https://picx.zhimg.com/50/v2-573d69ba676c9f2ff5a24933acaef035_720w.jpg?source=1def8aca)

  
接下来的生成部分，就需要理解LLM的内容知识点了，正好知乎知学堂推出的<strong>《AGI大模型进阶之旅》</strong>的公开课；  
这门面向新手入门的AGI的指路课程，不仅仅可以让想要就业大模型的同学快速接触最新大模型知识。  
<strong>还可以让你倾听圈内大牛来揭秘未来AI发展潮流， 与行业大佬面对面交流，领取行业大佬提供的学习资料</strong>  
如果还是0元，建议你赶紧冲，跟AI大牛对话的机会太难得了！  

大模型微调和实战：大模型微调方法原理及主流技术架构全详解2024超🔥的大模型公开课

立即听课

##   
<strong>生成阶段： 痛点和解决方案</strong>

###   
<strong>痛点一：幻觉问题</strong>

  
由于过度依赖语言模型先验，RAG 模型经常生成<strong>看似合理但完全错误或不忠实的语句</strong>，而没有在检索到的上下文中进行验证。  
<strong>解决方案</strong>：

```text
* 通过训练信号直接最小化产生幻觉文本的可能性。
* 根据与上下文的不匹配自动检测制造。
* **对检索到的文档使用可信度指标**，以防止对不可靠来源的限制。
* 通过将优化**重点放在上下文基础上来削弱语言模型先验。**
```


###   
<strong>痛点二：缺乏可解释性</strong>

  
与传统的 QA 系统不同，RAG 模型无法了解生成文本背后的推理。模型的可解释性仍然是含蓄和不透明的，而不是明确的。  
<strong>解决方案</strong>：

```text
* 设计模型架构，以结构化链/图的形式明确跟踪证据和解释。
* 实施辅助头来预测解释性证据，**例如显着数据生成源的内容片段。**
* 在每个生成步骤附加有意义的上下文标签以跟踪来源。
* 通过**引用内容来源来生成描述推理**的自然语言解释。
* 总结查询和上下文之间证明响应合理性的关键语义联系。
```


![](https://proxy-prod.omnivore-image-cache.app/893x338,spzzZyOl6ekhPR8z-nqj-gdI-DmU48FRUOB9K5P-TXeo/https://picx.zhimg.com/50/v2-7d52ca9102dd48969dccc181e7742c16_720w.jpg?source=1def8aca)

###   
<strong>痛点三：推理速度慢</strong>

  
检索与生成的耦合阻碍了 RAG 模型与标准语言模型的延迟匹配。推理管道缺乏对需要毫秒响应的实时应用程序的优化。  
<strong>解决方案</strong>：

```text
* 优化**标记化、编码和检索推理**，以最大程度地减少生成之前的开销。
* 使用 **NMSLIB、FAISS 或 ScaNN** 等库采用高效的近似最近邻索引。
* 利用**模型并行性和批量检索+生成来提高管道效率。**
* 设计**模型蒸馏方法**，以最小的质量损失压缩检索器-生成器组合。
* **尽可能将检索转移到离线状态，以避免运行时瓶颈。**
```


###   
<strong>痛点四：个性化落地难</strong>

  
在通用语料库上训练的 RAG 模型缺乏针对特定用户需求、上下文和查询生成响应的能力。如果没有个人理解，他们无法解决模棱两可的信息请求。  
<strong>解决方案</strong>：

```text
* 设计角色上下文记忆来跟踪对话中的用户配置文件和上下文。
* **在匹配目标用户的标记查询->响应对上微调 RAG 模型。**
* 对**先前对话和用户反馈**进行多任务训练。
* 利用**元学习开发少量**的个性化技术。
* **构建用户特定的扩展模块来补充检索语料库。**
```


![](https://proxy-prod.omnivore-image-cache.app/878x585,sA3FfHqLYRgxDWHztTTjoNHs0PChWDaA08SJiLHAgc1A/https://picx.zhimg.com/50/v2-3e218d315a52898a432a0c326674a435_720w.jpg?source=1def8aca)

###   
<strong>痛点五：质量评估难</strong>

  
可能的接地响应的多样性使得使用自动化指标可靠地评估 RAG 模型输出的正确性和质量变得具有挑战性。人类评估也缺乏可扩展性。这阻碍了迭代改进。  
<strong>解决方案</strong>：

```text
* 生成带有专家原理的带注释的测试集，以实现标准化评估。
* 根据语义而不是 n 元语法重叠开发专门的指标。
* 通过有针对性的自动评估，分别量化相关性、连贯性、一致性等关键轴。
* 利用用户反馈信号作为个性化质量判断来设计在线学习方案。
* 构建以注释而不是数字分数为中心的交互式评估界面。
```


## RAG 的评价指标

![](https://proxy-prod.omnivore-image-cache.app/720x257,sqJ4IGGpG9kQA8uO6aInNl3qJoewQ09wVnPMCzWlzfS0/https://pica.zhimg.com/50/v2-fd377dd35e866ff9b6f4442e4ff1e0ac_720w.jpg?source=1def8aca)

在RAG架构中会存在一下评价指标

## 1. **真实性：**判断生成内容是否与事实一致

## 2. **答案相关性：**答案与提示的相关性

## 3. **上下文精度：**检查相关块的排名是否较高。

## 4. **上下文回忆：**比较真实情况与上下文，检查是否检索到所有相关信息

## 5. **上下文实体召回：**评估检索到的上下文中存在的实体数量与真实值

## 6. **上下文相关性：**检索到的上下文与提示的相关性

## 7. **答案语义相似度：**生成的答案与实际答案在语义上的相似程度

## 8. **答案正确性：**评估生成答案与实际答案的准确性和一致性


## 总结

RAG 是一种很有前途的提高 LLM 准确性和可靠性的方法，具有事实依据、减少偏见和降低维护成本等优点。虽然未知识别和检索优化等领域仍然存在挑战，但正在进行的研究正在突破 RAG 功能的界限，并为更值得信赖和信息丰富的LLM应用铺平道路。

## References:

```text
* [Seven Failure Points When Engineering a Retrieval Augmented Generation System](https://archive.is/o/bNbZo/https://arxiv.org/pdf/2401.05856.pdf)
* [Top RAG Pain Points and Solutions](https://medium.com/@bijit211987/top-rag-pain-points-and-solutions-108d348b4e5d)
* [最具影响力的 RAG 论文](https://github.com/aishwaryanr/awesome-generative-ai-guide/blob/main/research%5Fupdates/rag%5Fresearch%5Ftable.md)
* [LongContextReorder](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/node%5Fpostprocessor/LongContextReorder.html)
* [Output Parsing Modules](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/output%5Fparser.html)
* [Pydantic Program](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/module%5Fguides/querying/structured%5Foutputs/pydantic%5Fprogram.html)
* [OpenAI JSON Mode vs. Function Calling for Data Extraction](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/openai%5Fjson%5Fvs%5Ffunction%5Fcalling.html)
* [Parallelizing Ingestion Pipeline](https://archive.is/o/bNbZo/https://github.com/run-llama/llama%5Findex/blob/main/docs/examples/ingestion/parallel%5Fexecution%5Fingestion%5Fpipeline.ipynb?%5F%5Fs=db5ef5gllwa79ba7a4r2&utm%5Fsource=drip&utm%5Fmedium=email&utm%5Fcampaign=LlamaIndex+news,+2024-01-16)
* [Query Transformations](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/optimizing/advanced%5Fretrieval/query%5Ftransformations.html)
* [Query Transform Cookbook](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/query%5Ftransformations/query%5Ftransform%5Fcookbook.html)
* [Chain of Table Notebook](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/chain%5Fof%5Ftable/chain%5Fof%5Ftable.ipynb)
* [Jerry Liu’s X Post on Chain-of-table](https://archive.is/o/bNbZo/https://twitter.com/jerryjliu0/status/1746217563938529711)
* [Mix Self-Consistency Notebook](https://archive.is/o/bNbZo/https://github.com/run-llama/llama-hub/blob/main/llama%5Fhub/llama%5Fpacks/tables/mix%5Fself%5Fconsistency/mix%5Fself%5Fconsistency.ipynb)
* [Embedded Tables Retriever Pack w/ Unstructured.io](https://archive.is/o/bNbZo/https://llamahub.ai/l/llama%5Fpacks-recursive%5Fretriever-embedded%5Ftables%5Funstructured)
* [LlamaIndex Documentation on Neutrino AI](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/neutrino.html)
* [Neutrino Routers](https://archive.is/o/bNbZo/https://platform.neutrinoapp.com/)
* [Neutrino AI](https://archive.is/o/bNbZo/https://docs.llamaindex.ai/en/stable/examples/llm/neutrino.html)
* [OpenRouter Quick Start](https://archive.is/o/bNbZo/https://openrouter.ai/docs#quick-start)
```


[发布于 2024-05-12 14:28 ，编辑于 2024-05-12 14:37](https://www.zhihu.com/question/643138720/answer/3495870046)

真诚赞赏，手留余香

赞赏

还没有人赞赏，快来当第一个赞赏的人吧！

​赞同 19​​添加评论​收藏​喜欢

​

收起​

[![求索](https://proxy-prod.omnivore-image-cache.app/0x0,se95FBextAi-TwM9GyR5paEz5Va2L-1iB_IZn-l9pFVk/https://picx.zhimg.com/v2-4df22b28d2a4a48f802bd3cd308065f5_l.jpg?source=1def8aca)](https://www.zhihu.com/people/keyonzeng)

[求索](https://www.zhihu.com/people/keyonzeng)

​![](https://proxy-prod.omnivore-image-cache.app/0x0,sEQaOWrSM4sYxMszrQ6lhsM51WgM5AvlqxCkeG6GJZz4/https://pic1.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

20年咨询合伙人，专注生成式AI应用

​ 关注

[发布于 2024-02-06 21:15](https://www.zhihu.com/question/643138720/answer/3389411506)

12 人赞同了该回答

之前回答过类似的问题。

RAG （Retrieval Augmented Generation) 已迅速发展成为在生产中应用大语言模型的标准方法。然而，大多数方法仍然受到一定的限制，大多数现有方法仅从检索语料库中<strong>检索短的连续块</strong>，<strong>限制了对整个文档上下文的整体理解</strong>。最近斯坦福发表一篇这方面的文章《RAPTOR: RECURSIVE ABSTRACTIVE PROCESSING FOR TREE-ORGANIZED RETRIEVAL》（《RAPTOR：基于树状检索机制的递归抽象处理》），利用这种递归树的方式把RAG性能提升了20%。接下来我们来解读以下这篇论文。

## 概述

检索增强语言模型（Retrieval Augumented Language Model）可以更好地适应世界状态的变化，并纳入长尾知识。然而，大多数现有方法只能从检索语料库中检索短的连续块，从而限制了对整个文档上下文的整体理解。论文引入了一种新颖的方法——RAPTOR，即<strong>递归嵌入、聚类和汇总文本块</strong>，<strong>自下而上构建具有不同摘要级别的树</strong>。在推理时，RAPTOR 模型从此树中检索，在不同抽象级别上集成冗长文档中的信息。对照实验表明，与传统的检索增强LM相比，使用递归摘要进行检索在多项任务上提供了显着的改进。在涉及复杂、多步骤推理的问答任务中，我们展示了最先进的结果; 例如，通过将 RAPTOR 检索与 GPT-4 的使用相结合，可以将<strong>QuALITY基准测试的最佳性能提高 20% 的绝对精度</strong>。

## 介绍

大型语言模型（LLM）已成为变革性工具，在许多任务上表现出令人印象深刻的性能。随着 LLM 规模的不断扩大，它们可以作为非常有效的知识库独立使用，并且可以通过对下游任务进行微调来进一步改进模型。然而，即使是一个大型模型也没有足够的特定领域知识来完成特定任务，世界一直在变化，大模型中的事实知识也可能不再有效。通过额外的微调或编辑来更新这些模型的知识是很困难的，尤其是在处理庞大的文本语料库时。另外LLM往往没有充分利用长上下文，并且随着<strong>上下文长度的增加，性能会下降</strong>，尤其是当相关信息嵌入到冗长的上下文中时。此外，实际上，<strong>使用长上下文既昂贵又缓慢</strong>。这表明，为知识密集型任务选择最相关的信息仍然至关重要。

另一种方法，在开放域问答系统中开创的方法——<strong>在单独的信息检索系统中将大量文本拆分为块（段落）后进行索引</strong>。然后将检索到的信息与问题一起作为上下文呈现给 LLM（ “检索增强”），这使得为系统提供特定于某些领域的当前知识变得容易，并能够轻松解释和出处跟踪，从而解决LLM难以追溯到知识来源的问题。

检索增强语言模型 （RALM） 在各个组件中都有所改进：检索器（Retriever）、读取器（Reader）和端到端系统训练。检索方法已经从传统的基于术语的技术过渡，如TF-IDF和BM25到基于深度学习的策略。最近的一些工作建议使用大型语言模型作为检索器，因为它们能够记住广泛的知识。对读取器（Reader）组件的研究包括 Fusion-in-Decoder （FiD） ，它使用 DPR 和 BM25 进行检索，并在编码器和 RETRO 中独立处理段落（，它利用交叉分块注意力和分块检索来生成基于检索到的上下文的文本。

然而，现有的检索增强方法也存在缺陷。大多数现有方法<strong>只能检索几个简短的、连续的文本块</strong>，这限制了它们表示和利用大规模话语结构的能力。这对于需要整合文本多个部分的知识的主题问题尤其相关，例如理解整本书。想想灰姑娘的童话故事，以及 “灰姑娘是如何达到幸福结局的？检索到的前 k 个简短的连续文本将不包含足够的上下文来回答问题。

为了解决这个问题，<strong>论文设计了一个索引和检索系统——RAPTOR，该系统使用树结构来捕获有关文本的高级和低级细节</strong>。如下图所示，RAPTOR 对文本块进行聚类，生成这些聚类的文本摘要，然后重复，自下而上生成一棵树。这种结构使 RAPTOR 能够将表示不同级别的文本的上下文块加载到 LLM 的上下文中，以便它可以有效且高效地回答不同级别的问题。

![](https://proxy-prod.omnivore-image-cache.app/1254x541,st0QOH-HyFh9B2U2ha0QQ74ym4d38KSlBAXyAqqczIfo/https://pica.zhimg.com/50/v2-5023c5fd2cf9170f5174d8777042c232_720w.jpg?source=1def8aca)

论文的主要贡献是使用文本摘要来允许在不同尺度上检索上下文，并在长文档集合的实验中显示其有效性。使用三种语言模型（UnifiedQA 、GPT-3 和 GPT-4 ）进行的对照实验表明，RAPTOR 优于当前的检索增强。此外，RAPTOR 与 GPT-4 相结合，有时甚至与 UnifiedQA 相结合，在如下三项 QA 任务上都展现了最好的结果：关于书籍和电影的自由文本回答问题、NLP 论文和基于中等长度段落的多项选择题。

## 方法

RAPTOR 树的构建首先<strong>将检索语料库分割成长度为 100 的短而连续的文本</strong>（类似于传统的检索增强技术）。如果一个句子超过100个token的限制，我们会将整个句子移动到下一个块，而不是在句子中间剪切它。这保留了每个块中文本的上下文和语义一致性。然后使用<strong>SBERT嵌入这些文本</strong>，SBERT是一种基于BERT的编码器（multi-qa-mpnet-base-cos-v1）。<strong>块及其相应的 SBERT Embeddings构成了树结构的叶节点</strong>。

为了<strong>对相似的文本块进行分组</strong>，我们采用了<strong>聚类算法</strong>。聚类后，将使用语言模型来汇总分组的文本。然后，这些摘要文本被重新嵌入，<strong>嵌入（embedding）、聚类（clustering）和摘要（summarization）的循环</strong>继续进行，直到进一步的聚类变得不可行，从而<strong>产生原始文档的结构化、多层树表示形式</strong>。RAPTOR的一个重要方面是它的计算效率。该系统在构建时间和令牌支出方面都呈线性扩展，使其适用于处理大型和复杂的语料库。

对于此树中的查询，论文引入了两种不同的策略：<strong>树遍历和折叠树</strong>。树遍历方法逐层遍历树，修剪并选择每个级别最相关的节点。折叠树方法对所有层中的节点进行集体评估，以找到最相关的节点。

<strong>聚类算法</strong>

聚类在构建 RAPTOR 树、将文本片段组织成有凝聚力的组中起着关键作用。此步骤将相关内容组合在一起，这有助于后续的检索过程。该聚类方法的一个独特方面是使用软聚类，其中节点可以属于多个聚类，而不需要固定数量的聚类。这种灵活性至关重要，因为单个文本片段通常包含与各种主题相关的信息，因此可以保证将它们包含在多个摘要中。该聚类算法基于高斯混合模型（GMM），这种方法既具有灵活性，又具有概率框架。GMM 假设数据点是由多个高斯分布的混合生成的。

向量嵌入的高维性对传统的GMM提出了挑战，因为距离度量在用于测量高维空间中的相似性时可能表现不佳。为了缓解这种情况，论文采用了<strong>均匀流形近似和投影（UMAP）</strong>，这是一种用于降维的流形学习技术。UMAP 中最近邻参数 n 个邻居的数量决定了局部结构和全局结构保留之间的平衡。我们的算法改变 n 个邻居以创建一个分层聚类结构：它首先识别全局聚类，然后在这些全局聚类中执行局部聚类。这个两步聚类过程捕获了文本数据之间的广泛关系，从广泛的主题到特定的细节。

如果本地集群的组合上下文超过汇总模型的令牌阈值，我们的算法会在集群内递归应用聚类，确保上下文保持在令牌阈值内。

为了确定聚类的最佳数量，我们采用<strong>贝叶斯信息准则 （BIC）</strong> 进行模型选择。<strong>BIC不仅惩罚了模型的复杂性，还奖励了拟合的优度</strong>。给定 GMM 的 BIC 为 BIC = ln（N）k − 2 ln（Lˆ），其中 N 是文本段（或数据点）的数量，k 是模型参数的数量，Lˆ 是模型似然函数的最大值。在 GMM 的上下文中，参数 k 的数量是输入向量的维数和聚类数量的函数。利用BIC确定的最优聚类数，然后使用期望最大化算法估计GMM参数，即均值、协方差和混合权重。

<strong>基于模型的总结：</strong>使用高斯混合模型对节点进行聚类后，每个聚类中的节点将发送到语言模型进行汇总。此步骤允许模型将大块文本转换为所选节点的简明、连贯的摘要。论文使用 gpt-3.5-turbo 来生成摘要。摘要步骤将检索到的大量信息压缩为可管理的大小。虽然摘要模型通常会产生可靠的摘要，但一项重点注释研究表明，<strong>大约 4% 的摘要包含轻微的幻觉</strong>。这些不会传播到父节点，并且对问答任务没有明显的影响。

### 查询

论文详细阐述了 RAPTOR 采用的两种查询机制：<strong>树遍历和折叠树</strong>。这些方法提供了遍历多层 RAPTOR 树以检索相关信息的独特方法，每种方法都有自己的优点和权衡。

树遍历方法首先根据其与查询嵌入的余弦相似度选择前 k 个最相关的根节点。这些选定节点的子节点在下一层被考虑，并且根据其与查询向量的余弦相似性再次从此池中选择前 k 个节点。重复此过程，直到我们到达叶节点。最后，将所有选定节点的文本连接起来，形成检索到的上下文。该算法的步骤概述如下：

![](https://proxy-prod.omnivore-image-cache.app/1219x423,s7tidTIOV9m6crOjTq6l20YRTDmmvhovUuJohdIwEq9Q/https://pic1.zhimg.com/50/v2-6f67e2383f5acc36b96bc7ab9dd27c40_720w.jpg?source=1def8aca)

1\. 从 RAPTOR 树的根层开始。计算查询嵌入与此初始层上存在的所有节点的嵌入之间的余弦相似度。

2\. 根据最高的余弦相似度分数选择前 k 个节点，形成集合 S1。

3\. 继续处理集合 S1 中元素的子节点。计算查询向量与这些子节点的向量嵌入之间的余弦相似度。

4\. 选择与查询余弦相似度分数最高的前 k 个子节点，形成集合 S2。

5\. 对 d 层递归地继续此过程，生成集合 S1， S2， . . . ， Sd. 

6.Concatenate 将 S1 设置为 Sd，以将相关上下文组合到查询中

通过调整深度 d 和每层选择的节点数 k，树遍历方法可以控制检索信息的特异性和广度。该算法从广阔的前景开始，考虑树的顶层，并在树的下层下降时逐渐关注更精细的细节。

<strong>折叠树方法</strong>提供了一种更简单的方法来搜索相关信息，方法是同时考虑树中的所有节点，如下图所示。这种方法不是逐层进行，而是将多层树展平为一层，实质上是将所有节点带到同一级别进行比较。

![](https://proxy-prod.omnivore-image-cache.app/1129x154,sipxRyUiTB9TF2GkEI6LdSm7MZuSbDuAqfv4LODLTtkI/https://picx.zhimg.com/50/v2-99b4fcae6856558d8af3d1b55f35e5f4_720w.jpg?source=1def8aca)

此方法的步骤概述如下： 

1\. 首先，将整个 RAPTOR 树折叠成一个图层。这组新的节点（表示为 C）包含来自原始树的每一层的节点。

2\. 接下来，计算查询嵌入与折叠集合 C 中存在的所有节点的嵌入之间的余弦相似性。

最后，选择与查询具有最高余弦相似度分数的前 k 个节点。继续向结果集添加节点，直到达到预定义的最大令牌数，确保不超过模型的输入限制。

在 QASPER 数据集中的 20 个故事中测试了这两种方法。下图显示了具有不同顶部大小的树遍历和具有不同最大令牌数的折叠树的性能。折叠树方法始终表现更好。

![](https://proxy-prod.omnivore-image-cache.app/595x709,spUCPFlNRGjAP0rg9Q6ZdHHbzt44eRP21CCQoPsk5DCg/https://pica.zhimg.com/50/v2-0a7791cb17b16d628732c1719e07861e_720w.jpg?source=1def8aca)

论文认为，折叠树检索比树遍历具有更大的灵活性，因此更好; 即，通过同时搜索所有节点，它可以检索给定问题的正确粒度级别的信息。相比之下，当使用具有相同 d 和 k 值的树遍历时，树的每个级别的节点比率将是恒定的。因此，无论问题如何，高阶主题信息与细粒度细节的比例都将保持不变。

然而，折叠树方法的一个缺点是它需要对树中的<strong>所有节点执行余弦相似性搜索</strong>，当然这可以通过快速的 k 最近邻库（如 FAISS）提高效率。

总的来说，鉴于折叠树方法具有更大的灵活性，并且在 QASPER 数据集的子集上具有卓越的性能，这就是继续使用的查询方法。

### 定性研究 

论文进行了定性分析，以了解 RAPTOR 的检索过程与密集通道检索 （DPR） 方法相比的优势。云纹的研究重点是使用 1500 字的灰姑娘童话故事的主题、多跳问题。如下图，RAPTOR 基于树的检索允许它从不同的树层中选择节点，从而匹配问题的详细程度。与 DPR 相比，这种方法通常为下游任务提供更相关、更全面的信息。

![](https://proxy-prod.omnivore-image-cache.app/1273x720,siDt5bAm4rZlL6CP7wGdEP0cDNistUqfAh1srzeQeZqs/https://pic1.zhimg.com/50/v2-ce8350c3615413ca1fbaf1cb1bd0f83b_720w.jpg?source=1def8aca)

## 实验

### 数据集

在三个问答数据集中衡量 RAPTOR 的表现：<strong>NarrativeQA、QASPER 和 QuALITY</strong>。

NarrativeQA 是一个由基于书籍和电影转录全文的问答对组成的数据集，共计 1,572 份文档。NarrativeQA-Story任务需要对整个叙事有全面的理解，才能准确回答其问题，从而测试模型在文学领域理解较长文本的能力。论文使用标准的 BLEU （B-1， B-4）、ROUGE （R-L） 和 METEOR （M） 指标来衡量此数据集的性能。

QASPER 数据集包括 1,585 篇 NLP 论文中的 5,049 个问题，每个问题都探索全文中嵌入的信息。QASPER 中的答案类型分为可回答/不可回答、是/否、抽象和提取。精度使用标准 F1 测量。

QuALITY 数据集由多项选择题组成，每个题都附有平均长度约为 5,000 个token的上下文段落。该数据集要求对整个文档进行推理以执行 QA 任务，使我们能够衡量检索系统在中等长度文档上的性能。该数据集包括一个具有挑战性的子集 QuALITYHARD，其中包含大多数人类注释者在速度设置中回答错误的问题。论文出具了整个测试集和 HARD 子集准确性的报告。

### 结果

结果表明，当与任何Retriever结合使用时，RAPTOR 在所有数据集上的表现始终优于相应的Retriever。

RAPTOR 在 QASPER 数据集上的所有三个语言模型中始终优于 BM25 和 DPR。

![](https://proxy-prod.omnivore-image-cache.app/1333x432,sVvsydX6m_UEfhHc6kPfyyjnpJ-sU5QlKVm_EY9dqnjU/https://picx.zhimg.com/50/v2-596fe50b595ccde6075a3234a60f40da_720w.jpg?source=1def8aca)

使用 GPT-3、GPT-4 和 UnifiedQA 时，RAPTOR 的 F-1 Match 分数分别为 53.1%、55.7% 和 36.6%。这些分数比 DPR 高出 1.8、2.7 和 4.5 分，并在各自的 LLM 中比 BM25 高出 6.5、5.5 和 10.2 分。 

![](https://proxy-prod.omnivore-image-cache.app/1246x453,sF4YjtO7Dn3L03s-LL3DxOo697E4paeXKXFKri4t7wGc/https://pic1.zhimg.com/50/v2-9161e164b8db7ae2b3d2fed5675359bf_720w.jpg?source=1def8aca)

<strong>与最先进系统的比较</strong> 

基于受控比较，如下 所示，带有 GPT-4 的 RAPTOR 以 55.7% 的 F-1 得分为 QASPER 树立了新的基准，超过了 CoLT5 XL 的 53.9%

![](https://proxy-prod.omnivore-image-cache.app/625x649,sHCDkosY_tqdWStg3y4llCOcu9FwmqWVtJ3aYuDQPNs8/https://pic1.zhimg.com/50/v2-506bbfc7341793339bea909c1a5fbef1_720w.jpg?source=1def8aca)

## 结论

论文介绍了 RAPTOR，这是一种新颖的基于树的检索系统，它通过各种抽象级别的上下文信息来增强大型语言模型的参数知识。通过采用<strong>递归聚类和汇总技术</strong>，RAPTOR创建了一个分层树结构，能够跨检索语料库的各个部分综合信息。在查询阶段，RAPTOR 利用此树结构进行更有效的检索。我们的对照实验表明，RAPTOR不仅优于传统的检索方法，而且在几个问答任务上表现出了新的性能基准。

paper：

[](https://browse.arxiv.org/pdf/2401.18059.pdf)

[发布于 2024-02-06 21:15](https://www.zhihu.com/question/643138720/answer/3389411506)

​赞同 12​​添加评论​收藏​喜欢

​

收起​

