---
title: 大模型检索增强生成（RAG）有哪些好用的技巧？
date: "2023-12-08 00:00:00"
updated: "2023-12-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/大模型检索增强生成(RAG)有哪些好用的技巧/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/625481187/answer/3318443854
---


<strong>教你如何解决RAG中类似PDF中表格等内容精准向量化的难题​</strong>

Independent Health、LangChain 和 Unstructured 的协作努力。
与大多数医疗保险公司一样，Independent Health 不断在迷宫般的合规要求和文档中导航。对于投保人来说，一份重要的文件是“承保凭证”（CoC），其中详细说明了医疗保健提供者提供承保的范围、限制和条件。这是一份复杂的文件，概述了福利、承保范围限制和提出索赔的程序。由于 CoC 的复杂性，理解和管理 CoC 对于保险公司和客户来说都是令人生畏的，通常跨越一百多页，其中包含复杂的部分、子部分和表格。

认识到需要清晰高效地管理这些广泛的文档，LangChain和Unstructured与纽约独立健康组织合作，探索如何利用基于检索增强生成（RAG）的架构来更轻松地快速回答有关保险单的问题。

认识到需要清晰高效地管理这些广泛的文档，LangChain和Unstructured与纽约独立健康组织合作，探索如何利用基于检索增强生成（RAG）的架构来更轻松地快速回答有关保险单的问题。

下面概述的见解强调了利用非结构化和LangChain优化RAG架构以处理来自Independent Health的CoC的半结构化内容的价值。在 RAG 架构的上下文中，半结构化数据结合了结构化和非结构化数据的元素，通常涉及穿插自然语言文本的结构化表，例如需要专门预处理的 PDF 文件格式。

我们将纯文本基线 RAG 与由非结构化和 LangChain 工具增强的细致入微的半结构化 RAG 架构进行了比较。我们利用 Unstructured 的数据摄取和预处理功能，将半结构化数据转换为对 LLM 友好的格式。我们还使用LangChain的多向量检索来编排数据检索。使用LangChain的评估平台LangSmith，我们评估了两种架构的性能。为此，我们用相同的四个问题提示每个人，将他们的回答与预期的解决方案进行比较。基线 RAG 在四个案例中仅成功了一个，而半结构化 RAG 成功回答了四个问题中的三个。

<strong>免责声明：为保密起见，本博文中的数据已被更改。我们使用了替代数据，并进行了与实际数据相同的严格分析，以确保我们见解的完整性和相关性。</strong>

用于转换半结构化数据的创新工具
非结构化带来了尖端的预处理和转换工具。这些文档旨在摄取和处理最具挑战性的技术文档，并将其转换为支持 ML 的结构化 JSON 格式。

与此相辅相成的是，LangChain的Multi-Vector Retriever工具改变了游戏规则；它将用于答案综合的文档与用于检索的参考文献分离。其实用性的一个典型例子是总结详细的文档，以针对基于向量的相似性搜索对其进行优化。它同时确保将整个文档传递到大型语言模型 （LLM） 中，保留每一个细微差别并防止在答案合成过程中丢失任何上下文。这种双管齐下的方法确保医疗保健提供者能够快速浏览 CoC，最终增强他们为投保人提供的服务。

应对 RAG 架构中半结构化数据的挑战
半结构化数据的特点是文本和表格的组合，既不符合结构化数据库的僵化性，也不符合非结构化数据的自由形式。传统的 RAG 系统在面对半结构化文档时经常会磕磕绊绊，主要有两个原因：

-  文本拆分：在文本拆分过程中，它们经常会无意中破坏表格的完整性，导致数据检索不完整。
 
-  表嵌入：RAG 上下文通常依赖于语义相似性搜索来查询数据库中的相关内容。这在表格的情况下特别具有挑战性，因为表格不仅仅是纯文本；它们是结构化数据，其中每条信息的重要性通常由其位置（行和列）及其与表中其他数据点的关系决定。
 我们通过结合Unstructured的摄取和预处理转换工具以及LangChain的Multi-Vector Retriever来应对这些挑战，以增强传统RAG架构在处理半结构化数据时的能力。

从 PDF 中摄取和处理数据
准确解析文档是解决半结构化数据挑战的第一步。本案例研究的独立健康文档采用 PDF 格式。这些文档很大程度上依赖于目录、列表和表格等元素；已知会给传统的 PDF 分区包带来麻烦的元素。请参阅以下示例。

<strong>1、目录</strong>
下图显示了健康保险政策手册中的目录。它包括描述政策覆盖范围不同方面的部分标题，每个部分都通过点引线链接到右对齐的页码，以实现视觉对齐。在这里，OCR 难以处理可变的图像质量、正确解释格式和字体以及区分标题和页码。

![](https://picx.zhimg.com/v2-0c1ecd4d22089fd86f2b785f70290169_r.jpg?source=2c26e567)
2、<strong>Nested List Items 嵌套列表项</strong>
从嵌套列表结构引入数据涉及几个挑战：

-  OCR 技术必须准确识别和区分主列表项和任何子项的层次结构。
 
-  文档格式的变化阻碍了对列表项的一致识别。
 
-  下游语义检索需要内联列表项与其周围上下文之间的关联。
 
![](https://picx.zhimg.com/v2-b4263cdf676defdff3784f85da94976e_r.jpg?source=2c26e567)
<strong>3、复杂表</strong>
在最简单的情况下，表遵循列中行的统一网格。这通常很容易提取。然而，在实践中，表格往往比这更复杂。下面提供了一个示例。从这些复杂表中引入数据涉及按部分检测和分组值。在某些情况下，辅助注释或说明放置在标准网格布局之外。这些数据点必须与表中的相应数据点相关联。OCR 系统还必须导航不同的文本格式，例如粗体标题和星号表示脚注或其他信息。这可能会影响数据提取过程的完整性。

![](https://picx.zhimg.com/v2-008d268e5fdb4ece83a52e2d8ddf99ba_r.jpg?source=2c26e567)​非结构化预处理工具经过微调，可以明确地解决这些问题。使用 partition_pdf，我们将原始 PDF 文档转换为 JSON，使表格和文本具有机器可读性。它还将丰富的元数据归因于文本和表格，这在后处理和下游 NLP 任务中特别有用。下面的代码就是这样做的。

```python
from pydantic import BaseModel
from typing import Any, Optional
from unstructured.partition.pdf import partition_pdf
```


# Load 
path = &#34;/Users/rlm/Desktop/IH-Unstructured/&#34;
file = &#34;IH_Policy_Doc.pdf&#34;

# Get elements
raw_pdf_elements = partition_pdf(

```sql
    filename=path+file,
    extract_images_in_pdf=False,
    infer_table_structure=True, 
    # Post processing to aggregate text once we have the title 
    chunking_strategy=&#34;by_title&#34;,
    # Chunking params to aggregate text blocks
    # Require maximum chunk size of 4000 chars
    # Attempt to create a new chunk at 3800 chars
    # Attempt to keep chunks > 2000 chars 
    max_characters=4000, 
    new_after_n_chars=3800, 
    combine_text_under_n_chars=2000,
    image_output_dir_path=path
)
```

输出是元素列表，每个元素都包含相应的文档文本和所有关联的元数据。非结构化按元素类型识别和标记所有元素（例如，文本与表格...等）。这允许用户或下游进程基于此属性进行筛选和操作。下面的代码演示如何按类型提取特定元素。

```text
class Element(BaseModel):
    type: str
    text: Any
```


# Categorize by type
categorized_elements = []
for element in raw_pdf_elements:

```text
    if &#34;unstructured.documents.elements.Table&#34; in str(type(element)):
        categorized_elements.append(Element(type=&#34;table&#34;, text=str(element)))
    elif &#34;unstructured.documents.elements.CompositeElement&#34; in str(type(element)):
        categorized_elements.append(Element(type=&#34;text&#34;, text=str(element)))
```


# Tables
table_elements = [e for e in categorized_elements if e.type == &#34;table&#34;]
print(len(table_elements)) 
# output: 28 elements in the PDF file

# Text
text_elements = [e for e in categorized_elements if e.type == &#34;text&#34;]
print(len(text_elements)) 
# output: 127 elements in the PDF file

存储文档：两种方法的故事
提取数据后，重点转移到存储上；请注意，这会显著影响检索性能。我们探讨了两种不同的方法：

<strong>方法 1：多向量检索器</strong>
使用多向量检索器将原始表和文本与摘要一起存储，这更有利于检索，有助于解决半结构化数据的复杂性。这战略性地构建了存储，以便于更有效的检索。

# The vectorstore to use to index the child chunks
vectorstore = Chroma(

```text
    collection_name=&#34;rag_with_summaries&#34;,
    embedding_function=OpenAIEmbeddings()
)
```


# The storage layer for the parent documents
store = InMemoryStore()
id_key = &#34;doc_id&#34;

# The retriever (empty to start)
retriever = MultiVectorRetriever(

```text
    vectorstore=vectorstore, 
    docstore=store, 
    id_key=id_key,
)
```


# Add texts
doc_ids = [str(uuid.uuid4()) for _ in texts]
summary_texts = [Document(page_content=s,metadata={id_key: doc_ids[i]}) for i, s in enumerate(text_summaries)]
retriever.vectorstore.add_documents(summary_texts)
retriever.docstore.mset(list(zip(doc_ids, texts)))

# Add tables
table_ids = [str(uuid.uuid4()) for _ in tables]
summary_tables = [Document(page_content=s,metadata={id_key: table_ids[i]}) for i, s in enumerate(table_summaries)]
retriever.vectorstore.add_documents(summary_tables)
retriever.docstore.mset(list(zip(table_ids, tables)))

# Prompt template

```text
template = &#34;&#34;&#34;Answer the question based only on the following context, which can include text and tables:
```

{context}
Question: {question}
&#34;&#34;&#34;
prompt = ChatPromptTemplate.from_template(template)

# LLM
model = ChatOpenAI(temperature=0,model=&#34;gpt-4&#34;)

# RAG pipeline
semi_structured_chain = (

```text
    {&#34;context&#34;: retriever, &#34;question&#34;: RunnablePassthrough()} 
    | prompt 
    | model 
    | StrOutputParser()
)
```


<strong>方法 2：基线向量存储（无表检索）</strong>
基线向量存储代表了传统方法。存储文档时不明确考虑表。该方法在我们的评估中充当对照，提供了一个基准，我们将其与多向量检索器进行比较。

# Baseline
vectorstore_baseline = Chroma.from_documents(

```text
    documents=all_splits,
    collection_name=&#34;baseline_rag&#34;,
    embedding=OpenAIEmbeddings()
)
```


retriever_baseline = vectorstore_baseline.as_retriever()

# Prompt template

```text
template = &#34;&#34;&#34;Answer the question based only on the following context, which can include text and tables:
```

{context}
Question: {question}
&#34;&#34;&#34;
prompt = ChatPromptTemplate.from_template(template)

# LLM
model = ChatOpenAI(temperature=0,model=&#34;gpt-4&#34;)

# RAG pipeline
baseline_chain = (

```text
    {&#34;context&#34;: retriever_baseline, &#34;question&#34;: RunnablePassthrough()} 
    | prompt 
    | model 
    | StrOutputParser()
)
```

现在，我们可以使用相应链的 invoke 函数查询这两种方法。

```text
semi_structured_chain.invoke(&#34;Can you explain what medical necessity is in relation to coverage?&#34;)
```


# output: &#34;Medical necessity in relation to coverage refers to the requirement that a health care service, procedure, treatment, test, device, prescription drug, or supply must be medically necessary for benefits to be provided. This means that they must be clinically appropriate in terms of type, frequency, extent, site, and duration, and considered effective for the patient&#39;s illness, injury, or disease. They must be required for the direct care and treatment or management of that condition, and the patient&#39;s condition would be adversely affected if the services were not provided. These services must be provided in accordance with generally-accepted standards of medical practice and should not be primarily for the convenience of the patient, their family, or their provider. They should also not be more costly than an alternative service or sequence of services that is at least as likely to produce equivalent therapeutic or diagnostic results. The fact that a provider has furnished, prescribed, ordered, recommended, or approved the service does not automatically make it medically necessary or mean that it has to be covered. The decision may be based on a review of the patient&#39;s medical records, medical policies and clinical guidelines, reports in peer-reviewed medical literature, reports and guidelines published by nationally-recognized health care organizations, professional standards of safety and effectiveness, and the opinions of health care professionals and attending providers.&#34;

构建评估数据集
LangSmith 是一个用于构建生产 LLM 应用程序的平台。它还具有测试和评估它们的嵌入式功能。为了评估我们方法的性能，我们首先使用问答 （QA） 对在 LangSmith 中构建一个评估集。下面可以看到一个示例及其输出。

df_curated = pd.read_json(&#39;../cleaned_json/curated_subset_table_eval_pairs_dbc_passport.json&#39;)
df_curated.head(3)

![](https://pica.zhimg.com/v2-18f76241f9cb534bac674c0a701e359c_r.jpg?source=2c26e567)​构建 QA 对后，我们将数据集上传到 LangSmith。

```python
import uuid
from langsmith import Client
```


# Dataset
client = Client()
dataset_name = f&#34;IH Policy Doc Curated QA {str(uuid.uuid4())}&#34;
dataset = client.create_dataset(dataset_name=dataset_name)

# Populate dataset
for _, row in df_curated.iterrows():
    # Get Q, A

```text
    q = row[&#39;question&#39;]
    a = row[&#39;answer&#39;]
    # Use the values in your function
    client.create_example(inputs={&#34;question&#34;: q}, 
                          outputs={&#34;answer&#34;: a}, 
                          dataset_id=dataset.id)
```


评估过程
评估过程采用系统方法来衡量和比较基线和半结构化 RAG 的性能。此过程对于量化多向量检索器和表分区策略的优点至关重要。

完整的LangSmith评估工作流程如下图所示。

![](https://pic1.zhimg.com/v2-ee640e6a440c559a9507d0271f092d94_r.jpg?source=2c26e567)​LangSmith 通过一系列步骤比较基线模型和高级模型：

-  评估集（评估集）：此步骤涉及收集将用于测试 RAG 系统的问答 （Q-A） 对。答案被认为是 RAG 系统输出的比较基本事实。
 
-  RAG 链：RAG 构建推理链或步骤链，以得出评估集中每个问题的答案。这代表了 RAG 系统生成答案的尝试。
 
-  评估器（LLM 评分器）：大型语言模型 （LLM） 评分器通过将 RAG 系统生成的答案与第 1 步中的真值答案进行比较来评估它们。
 
-  比较：根据答案比较基线 RAG 和高级 RAG 的性能。例如，基线 RAG 未能正确回答问题 #1，但成功回答了问题 #2。Advanced RAG 正确回答了这两个问题。
 
-  根本原因：最后一步涉及对每个 RAG 模型成功或失败的原因进行更深入的分析。它涉及比较检索到的文档、答案和 LLM 评分器响应。
 LangSmith 为 RAG 提供了各种评估器，可以确定模型响应与常见评估场景的相关性。在这种情况下，我们使用 QA 评估器来衡量对用户查询或问题的响应的正确性。具体来说，“qa”评估器（参考）指示 LLMChain 根据参考答案直接将响应分级为“正确”或“不正确”。

LangSmith 的“run_on_dataset”函数将在数据集上运行链或语言模型，并将跟踪存储到指定的项目名称。以下是运行该过程的方法：

from langchain.smith import RunEvalConfig

eval_config = RunEvalConfig(

```text
    evaluators=[&#34;qa&#34;],
)
```


_ = client.run_on_dataset(

```text
    dataset_name=dataset_name,
    llm_or_chain_factory=lambda: (lambda x: x[&#34;question&#34;]) | semi_structured_chain,
    evaluation=eval_config,
    project_name=&#34;IH Policy Doc: Semi-Structured RAG&#34;,
)
```


比较分析：一个明显的赢家出现
在测试中，我们用相同的问题提示基线 RAG 和半结构化 RAG。我们根据每个预期的正确解决方案评估了他们的反应。在四个问题中，Baseline RAG 只成功回答了其中一个问题。半结构化 RAG 对四个问题中的三个问题提供了正确的回答，这是一个明显的改进。对响应性质的更深入调查显示了多向量检索器方法的有效性，以及定制存储和检索策略以适应半结构化数据性质的重要性。

在本节中，我们将逐步介绍基线和半结构化 RAG 提出的一些问题和给出的答案。我们回顾了原始文件，以解释每个人是如何得出答案的。

<strong>问题 1：半结构化回答正确</strong>
<strong>问题：</strong>

<strong>使用非参与提供者进行 OBGYN 预防保健时，会员对费用分摊的责任是什么？</strong>

<strong>基线 RAG 答案：</strong> 该文件没有提供有关成员在使用非参与提供者进行 OBGYN 预防保健时费用分摊责任的具体信息？

<strong>半结构化 RAG 答案：</strong>

当使用非参与的妇产科预防保健提供者时，会员的费用分摊责任是免赔额后的 40% 共同保险。

<strong>参考文档中的表格：</strong>

![](https://picx.zhimg.com/v2-f606dcb7635cb590b1b45223a3e2282b_r.jpg?source=2c26e567)​<strong>分析：</strong>

基线 RAG 不会检索任何关键的相关表信息。因此，它以误导性的表示方式进行响应，即文档缺少此信息。通过非结构化预处理，半结构化 RAG 将整个表作为向量数据库中的单个记录进行检索。这为 RAG 提供了正确回答问题所需的完整上下文。

<strong>问题 2：两种方法的回答都不正确</strong>
<strong>问题：</strong>

使用参与提供者时，耳鼻喉科手术的费用分摊安排是什么？

<strong>基线 RAG 答案：</strong> 该文件没有提供有关使用参与提供者时耳鼻喉科手术费用分摊安排的具体信息。

<strong>半结构化 RAG 答案：</strong> 使用参与提供者时耳鼻喉科手术的费用分摊安排已全部涵盖。

<strong>正确答案：</strong>

使用参与提供者时，耳鼻喉科手术的费用分摊安排是“使用费用分摊提供适当的服务（鼻中隔偏曲；听力测试；麻醉）。

<strong>参考文档中的表格：</strong>

![](https://picx.zhimg.com/v2-bd2c06ad0aa57dd86a99297de1b98768_r.jpg?source=2c26e567)​<strong>分析：</strong>

基线 RAG 和半结构化 RAG 不正确，但原因不同。基线 RAG 检索器不会从相关表中提取任何信息，包括文本元素；事实上，它引用了来自其他不相关页面的文本。半结构化 RAG 可正确识别表。但是，表结构不那么干净，因此错误地回答了问题。这凸显了干净数据提取的重要性，以及 Unstructured 应该对其底层模型进行更多改进以重建表格格式和单元格的空间。

<strong>问题 3：两种方法都正确回答</strong>
<strong>问题：</strong>

当未按照 HIPAA 提供预防性服务时，会员的责任是什么？

<strong>基线 RAG 答案：</strong>

当未按照 HIPAA 提供预防性服务时，成员的成本分摊责任是将成本分摊用于适当的服务。这可能包括 PCP 访问、专家访问、血液检查、睡眠测试。

<strong>半结构化 RAG 答案：</strong>

当未按照 HIPAA 提供预防性服务时，成员的成本分摊责任是将成本分摊用于适当的服务。这可能包括 PCP 访问、专家访问、血液检查、睡眠测试。

<strong>参考文档中的表格：</strong>

![](https://picx.zhimg.com/v2-65dc9e61e6cbd21c532500040d51eb7a_r.jpg?source=2c26e567)​<strong>分析：</strong>

这两种方法都通过检索正确的表来正确回答这个问题。这个问题明显更具体，仅在参考表中得到解决，这就是为什么 Baseline RAG 也可以找到正确的文档。在半结构化情况下，正确的表是返回的第一个结果，这意味着更高的相似性。

结论
基线和半结构化 RAG 方法的比较分析揭示了它们各自处理半结构化数据能力的关键见解。这些示例展示了与基线 RAG 相比，半结构化 RAG 在准确利用表分区方面的熟练程度。这凸显了半结构化数据处理技术在 RAG 架构中的变革性影响。

RAG 架构中半结构化数据的挑战并非易事，但可以克服。用于文档解析的 Unstructured 和用于智能数据存储的 LangChain Multi-Vector Retriever 等工具是我们方法成功的关键。总而言之，这些工具能够提高检索精度，超越传统的RAG应用。这些进步为未来的数据检索和处理工作开创了先例。

Unstructured 是 LLM 数据预处理解决方案的领先提供商，使组织能够将其内部非结构化数据转换为与大型语言模型兼容的格式。通过自动转换 PDF、PPTX、HTML 文件等格式的复杂自然语言数据，Unstructured 使企业能够充分利用其数据的力量来提高生产力和创新能力。凭借关键的合作伙伴关系和超过 10,000 个组织的不断增长的客户群，Unstructured 正在推动全球企业 LLM 的采用。

原文来自：
[Streamlining Healthcare Compliance with AI – Unstructured](https://link.zhihu.com/?target=https%3A//unstructured.io/blog/streamlining-healthcare-compliance-with-ai)

​