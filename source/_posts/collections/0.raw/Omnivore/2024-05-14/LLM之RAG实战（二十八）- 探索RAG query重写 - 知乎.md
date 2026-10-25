---
title: "LLM之RAG实战（二十八）| 探索RAG query重写 - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-05-14/LLM之RAG实战(二十八)-探索RAG-query重写-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 7572f409-cc55-4c91-b526-1767cb8537d9
---

# LLM之RAG实战（二十八）| 探索RAG query重写 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/llm-rag-rag-query-18f75da7dfd)
[Read Original](https://zhuanlan.zhihu.com/p/685981587)



发布于 2024-03-08 15:53・IP 属地北京 ，编辑于 2024-03-08 15:53・IP 属地北京

 在检索增强生成（RAG）中，我们经常遇到用户原始查询的问题，如措辞不准确或缺乏语义信息，比如“The NBA champion of 2020 is the Los Angeles Lakers! Tell me what is langchain framework?”这样的查询，如果直接进行搜索，那么LLM可能会给出不正确或无法回答的回答。

 因此，将用户查询的语义空间与文档的语义空间对齐是至关重要的。<strong>查询重写</strong>技术可以有效地解决这一问题，其在RAG中的作用如图1所示：

![](https://proxy-prod.omnivore-image-cache.app/1080x680,srXSa7E7tGEIZaSbe0xP2Wjmp9Nyl6WzDpQ41R5BFkyg/https://pic2.zhimg.com/v2-d50c9dda003409c51dcc5f1306913391_b.jpg)

 从RAG流程的角度来看，<strong>查询重写是一种预检索方法</strong>。请注意，此图大致说明了查询重写在RAG中的位置。在下面的部分中，我们将介绍一些重写常见算法的改进过程。

<strong>查询重写是对齐查询和文档语义的关键技术。例如：</strong>

```text
   * **Hypothetical Document Embeddings (HyDE) ：**通过假设文档来对齐查询和文档的语义空间。
   * **Rewrite-Retrieve-Read：**提出了一个不同于传统的检索和阅读顺序的框架，专注于查询重写。
   * **Step-Back Prompting：**允许LLM基于高级概念进行抽象推理和检索。
   * **Query2Doc：**使用LLM的一些提示创建伪文档。然后，它将这些查询与原始查询合并，以构建一个新的查询。
   * **ITER-RETGEN：**提出了一种将先前生成的结果与先前查询相结合的方法。随后检索相关文档并生成新结果。此过程重复多次以获得最终结果。
```


让我们深入研究一下这些方法的细节。

## 一、假设文档嵌入（HyDE）

 论文《Precise Zero-Shot Dense Retrieval without Relevance Labels》\[1\]提出了一种基于假设文档嵌入（HyDE）的方法，主要过程如图2所示：

![](https://proxy-prod.omnivore-image-cache.app/1080x306,smIJz_Eq_1M1sO_bvbtf4pI6Sdlmi8jPSpjF5i2Zh1P4/https://pic1.zhimg.com/v2-088baf0a7573bd16dcb2f81223b8b6b4_b.jpg)

该过程主要分为四个步骤：

1.使用LLM基于查询生成k个假设文档。这些生成的文件可能不是事实，也可能包含错误，但它们应该于相关文件相似。此步骤的目的是通过LLM解释用户的查询。

2.将生成的假设文档输入编码器，将其映射到密集向量f(dk)，编码器具有过滤功能，过滤掉假设文档中的噪声。这里，dk表示第k个生成的文档，f表示编码器操作。

3.使用给定的公式计算以下k个矢量的平均值，

![](https://proxy-prod.omnivore-image-cache.app/938x220,sORelD--_x3DQr6g_QHJNAaMkNV5Y5R5Mq5hNvG064hQ/https://pic3.zhimg.com/v2-031fc42d73e1f21f2fbcedccd875ddea_b.jpg)

我们还可以将原始查询q视为一个可能的假设：

![](https://proxy-prod.omnivore-image-cache.app/1042x206,siXrX4kBt-Pbsdv3iEbJCqjseGFEQlxmJlKa9G1gXcU4/https://pic3.zhimg.com/v2-50f606254bc9a7ab525ec6e00bdcb77e_b.jpg)

4.使用向量v从文档库中检索答案。如步骤3中所建立的，该向量保存来自用户的查询和所需答案模式的信息，这可以提高回忆。

 我对HyDE的理解如图3所示。HyDE的目标是生成假设文档，以便最终查询向量v与向量空间中的实际文档尽可能紧密地对齐。

![](https://proxy-prod.omnivore-image-cache.app/1080x464,s7smsNBvd0xZGStR9MPFG0b1qJP5JSUUNCxU2WH_Xf-s/https://pic1.zhimg.com/v2-6bffefb8fbce87cbd81ac590770529dc_b.jpg)

 HyDE在LlamaIndex和Langchain中都支持。以下以LlamaIndex为例说明HyDE的实现过程。

 将文件\[2\]放在YOUR\_DIR\_PATH中。测试代码如下（安装的LlamaIndex I版本为0.10.12）：

```routeros
import os
os.environ["OPENAI_API_KEY"] = "YOUR_OPENAI_API_KEY"
​
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.indices.query.query_transform import HyDEQueryTransform
from llama_index.core.query_engine import TransformQueryEngine
​
# Load documents, build the VectorStoreIndex
dir_path = "YOUR_DIR_PATH"
documents = SimpleDirectoryReader(dir_path).load_data()
index = VectorStoreIndex.from_documents(documents)
​
​
query_str = "what did paul graham do after going to RISD"
​
# Query without transformation: The same query string is used for embedding lookup and also summarization.
query_engine = index.as_query_engine()
response = query_engine.query(query_str)
​
print('-' * 100)
print("Base query:")
print(response)
​
​
# Query with HyDE transformation
hyde = HyDEQueryTransform(include_original=True)
hyde_query_engine = TransformQueryEngine(query_engine, hyde)
response = hyde_query_engine.query(query_str)
​
print('-' * 100)
print("After HyDEQueryTransform:")
print(response)
```

首先，查看LlamaIndex中的默认HyDE提示\[3\]：

```clean
############################################
# HYDE
##############################################
​
HYDE_TMPL = (
    "Please write a passage to answer the question\n"
    "Try to include as many key details as possible.\n"
    "\n"
    "\n"
    "{context_str}\n"
    "\n"
    "\n"
    'Passage:"""\n'
)
​
DEFAULT_HYDE_PROMPT = PromptTemplate(HYDE_TMPL, prompt_type=PromptType.SUMMARY)
```

HyDEQueryTransform类的代码如下所示：

 def\_run函数的目的是生成假设文档，在def\_run功能中添加了三条调试语句来监视假设文档的内容。

```python
class HyDEQueryTransform(BaseQueryTransform):
    """Hypothetical Document Embeddings (HyDE) query transform.
​
    It uses an LLM to generate hypothetical answer(s) to a given query,
    and use the resulting documents as embedding strings.
​
    As described in `[Precise Zero-Shot Dense Retrieval without Relevance Labels]
    (https://arxiv.org/abs/2212.10496)`
    """
​
    def __init__(
        self,
        llm: Optional[LLMPredictorType] = None,
        hyde_prompt: Optional[BasePromptTemplate] = None,
        include_original: bool = True,
    ) -> None:
        """Initialize HyDEQueryTransform.
​
        Args:
            llm_predictor (Optional[LLM]): LLM for generating
                hypothetical documents
            hyde_prompt (Optional[BasePromptTemplate]): Custom prompt for HyDE
            include_original (bool): Whether to include original query
                string as one of the embedding strings
        """
        super().__init__()
​
        self._llm = llm or Settings.llm
        self._hyde_prompt = hyde_prompt or DEFAULT_HYDE_PROMPT
        self._include_original = include_original
​
    def _get_prompts(self) -> PromptDictType:
        """Get prompts."""
        return {"hyde_prompt": self._hyde_prompt}
​
    def _update_prompts(self, prompts: PromptDictType) -> None:
        """Update prompts."""
        if "hyde_prompt" in prompts:
            self._hyde_prompt = prompts["hyde_prompt"]
​
    def _run(self, query_bundle: QueryBundle, metadata: Dict) -> QueryBundle:
        """Run query transform."""
        # TODO: support generating multiple hypothetical docs
        query_str = query_bundle.query_str
        hypothetical_doc = self._llm.predict(self._hyde_prompt, context_str=query_str)
        embedding_strs = [hypothetical_doc]
        if self._include_original:
            embedding_strs.extend(query_bundle.embedding_strs)
​
        # The following three lines contain the added debug statements.
        print('-' * 100)
        print("Hypothetical doc:")
        print(embedding_strs)
​
        return QueryBundle(
            query_str=query_str,
            custom_embedding_strs=embedding_strs,
        )
```

测试代码的操作如下：

```sql
(llamaindex_010) Florian:~ Florian$ python /Users/Florian/Documents/test_hyde.py 
----------------------------------------------------------------------------------------------------
Base query:
Paul Graham resumed his old life in New York after attending RISD. He became rich and continued his old patterns, but with new opportunities such as being able to easily hail taxis and dine at charming restaurants. He also started experimenting with a new kind of still life painting technique.
----------------------------------------------------------------------------------------------------
Hypothetical doc:
["After attending the Rhode Island School of Design (RISD), Paul Graham went on to co-found Viaweb, an online store builder that was later acquired by Yahoo for $49 million. Following the success of Viaweb, Graham became an influential figure in the tech industry, co-founding the startup accelerator Y Combinator in 2005. Y Combinator has since become one of the most prestigious and successful startup accelerators in the world, helping launch companies like Dropbox, Airbnb, and Reddit. Graham is also known for his prolific writing on technology, startups, and entrepreneurship, with his essays being widely read and respected in the tech community. Overall, Paul Graham's career after RISD has been marked by innovation, success, and a significant impact on the startup ecosystem.", 'what did paul graham do after going to RISD']
----------------------------------------------------------------------------------------------------
After HyDEQueryTransform:
After going to RISD, Paul Graham resumed his old life in New York, but now he was rich. He continued his old patterns but with new opportunities, such as being able to easily hail taxis and dine at charming restaurants. He also started to focus more on his painting, experimenting with a new technique. Additionally, he began looking for an apartment to buy and contemplated the idea of building a web app for making web apps, which eventually led him to start a new company called Aspra.
```

 <strong>embedding\_strs</strong>是一个包含两个元素的列表。第一个是生成的假设文档，第二个是原始查询。它们被组合成一个列表，以便于矢量计算。

 在这个例子中，HyDE通过准确地想象Paul Graham在RISD之后所做的事情，显著提高了输出质量（参见假设文档）。这提高了嵌入质量和最终输出。当然，HyDE也有一些失败案例。感兴趣的读者可以访问此网页\[4\]进行测试。

 HyDE似乎是无监督的，没有在HyDE中训练任何模型：生成模型和对比编码器都保持不变。

 总之，虽然HyDE引入了一种新的查询重写方法，但它确实有一些局限性。它不依赖于查询嵌入相似性，而是强调一个文档与另一个文档的相似性。然而，如果语言模型不精通该主题，它可能并不总是产生最佳结果，这可能会导致错误的增加。

## 二、重写-检索-读取

 这个想法来自于论文《Query Rewriting for Retrieval-Augmented Large Language Models》\[5\]。论文认为，在真实世界的场景中，原始查询可能并不总是LLM检索的最佳查询。因此，本文建议我们应该首先使用LLM来重写查询，然后再进行检索和生成答案，而不是直接从原始查询中检索内容并生成答案。论文思路如图4（b）所示：

![](https://proxy-prod.omnivore-image-cache.app/1080x569,s0fKABFRQk5j97qQ6N_SWjW_4iWUvuWMpj0rJFhXAs54/https://pic3.zhimg.com/v2-180cf92034dcdbfa183d76344488fa4e_b.jpg)

 为了说明查询重写如何影响上下文检索和预测性能，请考虑以下示例：查询“The NBA champion of 2020 is the Los Angeles Lakers! Tell me what is langchain framework?”需要通过重写准确处理的。

 这是使用Langchain实现的，安装所需的基本库如下：

```sql
pip install langchain
pip install openai
pip install langchainhub
pip install duckduckgo-search
pip install langchain_openai
```

 环境配置和库导入：

```moonscript
import os
os.environ["OPENAI_API_KEY"] = "YOUR_OPEN_AI_KEY"
​
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI
```

 构建一个链并执行简单的查询：

```python
def june_print(msg, res):
    print('-' * 100)
    print(msg)
    print(res)
​
​
base_template = """Answer the users question based only on the following context:
​
<context>
{context}
</context>
​
Question: {question}
"""
​
base_prompt = ChatPromptTemplate.from_template(base_template)
​
model = ChatOpenAI(temperature=0)
​
search = DuckDuckGoSearchAPIWrapper()
​
​
def retriever(query):
    return search.run(query)
​
chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | base_prompt
    | model
    | StrOutputParser()
)
​
query = "The NBA champion of 2020 is the Los Angeles Lakers! Tell me what is langchain framework?"
​
june_print(
    'The result of query:', 
    chain.invoke(query)
)
​
june_print(
    'The result of the searched contexts:', 
    retriever(query)
)
```

结果如下：

```monkey
(langchain) Florian:~ Florian$ python /Users/Florian/Documents/test_rewrite_retrieve_read.py 
----------------------------------------------------------------------------------------------------
The result of query:
I'm sorry, but the context provided does not mention anything about the langchain framework.
----------------------------------------------------------------------------------------------------
The result of the searched contexts:
The Los Angeles Lakers are the 2020 NBA Champions!Watch their championship celebration here!Subscribe to the NBA: https://on.nba.com/2JX5gSN Full Game Highli... Aug 4, 2023. The 2020 Los Angeles Lakers were truly one of the most complete teams over the decade. LeBron James' fourth championship was one of the biggest moments of his career. Only two players from the 2020 team remain on the Lakers. In the storied history of the NBA, few teams have captured the imagination of fans and left a lasting ... James had 28 points, 14 rebounds and 10 assists, and the Lakers beat the Miami Heat 106-93 on Sunday night to win the NBA finals in six games. James was also named Most Valuable Player of the NBA ... Portland Trail Blazers star Damian Lillard recently spoke about the 2020 NBA "bubble" playoffs and had an interesting perspective on the criticism the eventual winners, the Los Angeles Lakers, faced. But perhaps none were more surprising than Adebayo's opinion on the 2020 NBA Finals. The Heat were defeated by LeBron James and the Los Angeles Lakers in six games. Miller asked, "Tell me about ...
```

结果表明：基于搜索的上下文，关于“langchain”的信息非常少。

现在就开始构建重写器来重写搜索查询。

```python
rewrite_template = """Provide a better search query for \
web search engine to answer the given question, end \
the queries with ’**’. Question: \
{x} Answer:"""
rewrite_prompt = ChatPromptTemplate.from_template(rewrite_template)
​
​
def _parse(text):
    return text.strip("**")
​
rewriter = rewrite_prompt | ChatOpenAI(temperature=0) | StrOutputParser() | _parse
june_print(
    'Rewritten query:', 
    rewriter.invoke({"x": query})
)
```

结果如下：

```applescript
----------------------------------------------------------------------------------------------------
Rewritten query:
​What is langchain framework and how does it work?
```

构造rewrite\_retrieve\_read\_chain并利用重写后的查询。

```1c
rewrite_retrieve_read_chain = (
    {
        "context": {"x": RunnablePassthrough()} | rewriter | retriever,
        "question": RunnablePassthrough(),
    }
    | base_prompt
    | model
    | StrOutputParser()
)
​
june_print(
    'The result of the rewrite_retrieve_read_chain:', 
    rewrite_retrieve_read_chain.invoke(query)
)
```

结果如下：

```routeros
----------------------------------------------------------------------------------------------------
The result of the rewrite_retrieve_read_chain:
LangChain is a Python framework designed to help build AI applications powered by language models, particularly large language models (LLMs). It provides a generic interface to different foundation models, a framework for managing prompts, and a central interface to long-term memory, external data, other LLMs, and more. It simplifies the process of interacting with LLMs and can be used to build a wide range of applications, including chatbots that interact with users naturally.
```

到目前为止，通过重写查询，我们已经成功地获得了正确的答案。

## 三、Step-Back提示

 STEP-BACK PROMPING是一种简单的提示技术，使LLM能够从包含特定细节的实例中抽象、提取高级概念和基本原理。其思想是将“step-back问题”定义为从原始问题派生出的更抽象的问题。

 例如，如果查询包含大量细节，LLM很难检索相关事实来解决任务。如图5中的第一个例子所示，对于物理问题“如果温度增加2倍，体积增加8倍，理想气体的压力P会发生什么？”在直接推理该问题时，LLM可能会偏离理想气体定律的第一原理。

 同样，由于特定的时间范围限制，“Estella Leopold在1954年8月至1954年11月期间上过哪所学校？”这个问题很难直接解决。

![](https://proxy-prod.omnivore-image-cache.app/1080x771,sAOTZ33t-7kKobYoYBtam3zkyEJJmRWsp187D7QL8gy0/https://pic3.zhimg.com/v2-080730a28b92b0fc5f5bc0d05c4fabda_b.jpg)

 在这两种情况下，提出更广泛的问题可以帮助模型有效地回答特定的查询。与其直接问“Estela Leopold在特定时间上了哪所学校”，我们可以问“Estella Leopoold的教育史”

 这个更广泛的主题涵盖了原始问题，可以提供所有必要的信息来推断“Estela Leopold在特定时间上过哪所学校”。需要注意的是，这些更广泛的问题通常比原始的特定问题更容易回答。

 从这种抽象中派生的推理有助于防止在图5（左）所示的“思想链”中间步骤中出现错误。

总之，STEP-BACK PROMPING包括两个基本步骤：

<strong>抽象</strong>：最初，我们提示LLM提出一个关于高级概念或原理的广泛问题，而不是直接响应查询。然后，我们检索关于所述概念或原理的相关事实。

<strong>推理</strong>：LLM可以根据这些关于高级概念或原理的事实推导出原始问题的答案。我们称之为抽象推理。

 为了说明step-back提示如何影响上下文检索和预测性能，这里是用Langchain实现的演示代码。

 环境配置和库导入：

```moonscript
import os
os.environ["OPENAI_API_KEY"] = "YOUR_OPEN_AI_KEY"
​
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
```

 构建一个链并执行原始查询：

```python
def june_print(msg, res):
    print('-' * 100)
    print(msg)
    print(res)
​
​
question = "was chatgpt around while trump was president?"
​
base_prompt_template = """You are an expert of world knowledge. I am going to ask you a question. Your response should be comprehensive and not contradicted with the following context if they are relevant. Otherwise, ignore them if they are not relevant.
​
{normal_context}
​
Original Question: {question}
Answer:"""
​
base_prompt = ChatPromptTemplate.from_template(base_prompt_template)
​
search = DuckDuckGoSearchAPIWrapper(max_results=4)
def retriever(query):
    return search.run(query)
​
base_chain = (
    {
        # Retrieve context using the normal question (only the first 3 results)
        "normal_context": RunnableLambda(lambda x: x["question"]) | retriever,
        # Pass on the question
        "question": lambda x: x["question"],
    }
    | base_prompt
    | ChatOpenAI(temperature=0)
    | StrOutputParser()
)
​
​
june_print('The searched contexts of the original question:', retriever(question))
june_print('The result of base_chain:', base_chain.invoke({"question": question}) )
```

 结果如下：

```vbnet
(langchain) Florian:~ Florian$ python /Users/Florian/Documents/test_step_back.py 
----------------------------------------------------------------------------------------------------
The searched contexts of the original question:
While impressive in many respects, ChatGPT also has some major flaws. ... [President's Name]," refused to write a poem about ex-President Trump, but wrote one about President Biden ... The company said GPT-4 recently passed a simulated law school bar exam with a score around the top 10% of test takers. By contrast, the prior version, GPT-3.5, scored around the bottom 10%. The ... These two moments show how Twitter's choices helped former President Trump. ... With ChatGPT, which launched to the public in late November, users can generate essays, stories and song lyrics ... Donald Trump is asked a question—say, whether he regrets his actions on Jan. 6—and he answers with something like this: " Let me tell you, there's nobody who loves this country more than me ...
----------------------------------------------------------------------------------------------------
The result of base_chain:
Yes, ChatGPT was around while Trump was president. ChatGPT is an AI language model developed by OpenAI and was launched to the public in late November. It has the capability to generate essays, stories, and song lyrics. While it may have been used to write a poem about President Biden, it also has the potential to be used in various other contexts, including generating responses from hypothetical scenarios involving former President Trump.
```

 结果显然是不正确的。

 开始构建step\_back\_question\_chain和step\_back\_chain以获得正确的结果。

```python
# Few Shot Examples
examples = [
    {
        "input": "Could the members of The Police perform lawful arrests?",
        "output": "what can the members of The Police do?",
    },
    {
        "input": "Jan Sindel’s was born in what country?",
        "output": "what is Jan Sindel’s personal history?",
    },
]
# We now transform these to example messages
example_prompt = ChatPromptTemplate.from_messages(
    [
        ("human", "{input}"),
        ("ai", "{output}"),
    ]
)
few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)
​
step_back_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an expert at world knowledge. Your task is to step back and paraphrase a question to a more generic step-back question, which is easier to answer. Here are a few examples:""",
        ),
        # Few shot examples
        few_shot_prompt,
        # New question
        ("user", "{question}"),
    ]
)
step_back_question_chain = step_back_prompt | ChatOpenAI(temperature=0) | StrOutputParser()
june_print('The step-back question:', step_back_question_chain.invoke({"question": question}))
june_print('The searched contexts of the step-back question:', retriever(step_back_question_chain.invoke({"question": question})) )
​
​
​
response_prompt_template = """You are an expert of world knowledge. I am going to ask you a question. Your response should be comprehensive and not contradicted with the following context if they are relevant. Otherwise, ignore them if they are not relevant.
​
{normal_context}
{step_back_context}
​
Original Question: {question}
Answer:"""
response_prompt = ChatPromptTemplate.from_template(response_prompt_template)
​
​
step_back_chain = (
    {
        # Retrieve context using the normal question
        "normal_context": RunnableLambda(lambda x: x["question"]) | retriever,
        # Retrieve context using the step-back question
        "step_back_context": step_back_question_chain | retriever,
        # Pass on the question
        "question": lambda x: x["question"],
    }
    | response_prompt
    | ChatOpenAI(temperature=0)
    | StrOutputParser()
)
​
june_print('The result of step_back_chain:', step_back_chain.invoke({"question": question}) )
```

 结果如下：

```applescript
----------------------------------------------------------------------------------------------------
The step-back question:
When did ChatGPT become available?
----------------------------------------------------------------------------------------------------
The searched contexts of the step-back question:
OpenAI released an early demo of ChatGPT on November 30, 2022, and the chatbot quickly went viral on social media as users shared examples of what it could do. Stories and samples included ... March 14, 2023 - Anthropic launched Claude, its ChatGPT alternative. March 20, 2023 - A major ChatGPT outage affects all users for several hours. March 21, 2023 - Google launched Bard, its ... The same basic models had been available on the API for almost a year before ChatGPT came out. In another sense, we made it more aligned with what humans want to do with it. A paid ChatGPT Plus subscription is available. (Image credit: OpenAI) ChatGPT is based on a language model from the GPT-3.5 series, which OpenAI says finished its training in early 2022.
----------------------------------------------------------------------------------------------------
The result of step_back_chain:
No, ChatGPT was not around while Trump was president. ChatGPT was released to the public in late November, after Trump's presidency had ended. The references to ChatGPT in the context provided are all dated after Trump's presidency, such as the release of an early demo on November 30, 2022, and the launch of ChatGPT Plus subscription. Therefore, it is safe to say that ChatGPT was not around during Trump's presidency.
```

 我们可以看到，通过将原始查询“后退”到更抽象的问题，并使用抽象查询和原始查询进行检索，LLM提高了其遵循正确推理路径找到解决方案的能力。

 正如Edsger W.Dijkstra所说，“抽象的目的不是模糊，而是创造一个新的语义层次，在这个层次上可以绝对精确。”

## 四、Query2doc

 《Query2doc: Query Expansion with Large Language Models》\[6\]提出了Query2doc方法来进行query改写，它使用LLM的一些提示生成伪文档，然后将它们与原始查询组合以创建新的查询，如图6所示：

![](https://proxy-prod.omnivore-image-cache.app/736x866,sN6aGqStbjhUdJ2bQIQw6dWQ-UDjas0bqFeVK3-D2EeU/https://pic4.zhimg.com/v2-5b41676316d11b331a6fe674b1f916bf_b.jpg)

 在密集检索中，新查询表示为q+，是原始查询（q）和伪文档（d'）的简单级联，由\[SEP\]分隔：q+=concat（q，\[SEP\]，d'）。

 Query2doc认为，HyDE隐含地假设groundtruth文档和伪文档用不同的单词表达相同的语义，这可能不适用于某些查询。

 Query2doc和HyDE之间的另一个区别是，Query2doc训练有监督的密集检索器，如论文所述。

 目前，在Langchain或LlamaIndex中未找到query2doc的实现。

## 五、迭代

 《Enhancing Retrieval-Augmented Large Language Models with Iterative Retrieval-Generation Synergy》\[7\]提出了ITER-RETGEN方法，它使用生成的内容来指导检索。它在检索-读取-检索-读取流中迭代地实现“检索增强的生成”和“生成增强的检索”。

![](https://proxy-prod.omnivore-image-cache.app/1080x414,ssX_SkKkkQzQdjsBu3dbBCdmW4jfajuUurvI-nUAxWIY/https://pic2.zhimg.com/v2-7305a4e01f6fb1d28c26b4c1aeaf2099_b.jpg)

 如图7所示，对于给定的问题q和检索语料库D={D}，其中D表示一个段落，ITER-RETGEN连续执行T次检索生成迭代。

 在每次迭代t中，我们首先使用上一次迭代的生成yt-1，将其与q组合，并检索前k个段落。接下来，我们提示LLM生成输出yt，该输出yt将检索到的段落（表示为Dyt-1||q）和q合并到提示中。因此，每个迭代可以公式化如下：

![](https://proxy-prod.omnivore-image-cache.app/782x100,suc5vRHKSb4hK9TY5t3g8lt0iSLLHanem39aIpWzeC_A/https://pic2.zhimg.com/v2-761bc016a3be27574d3587ba3ada2d61_b.jpg)

 最后的输出yt将作为最终响应而产生。

 与Query2doc类似，目前，在Langchain或LlamaIndex中，尚未找到实现。

## 六、结论

 本文介绍了各种查询重写技术，包括一些技术的代码演示。

 在实践中，这些查询重写方法都可以尝试，使用哪种方法或方法组合取决于具体效果。

 然而，无论采用何种重写方法，调用LLM都需要进行一些性能权衡，这需要在实际使用中加以考虑。

 此外，还有一些方法，如查询路由、将查询分解为多个子问题等，它们不属于查询重写，但它们是预检索方法，这些方法将来将有机会引入。

## 参考文献：

\[1\] <https://arxiv.org/pdf/2212.10496.pdf>

\[2\] <https://raw.githubusercontent.com/run-llama/llama%5Findex/main/docs/examples/data/paul%5Fgraham/paul%5Fgraham%5Fessay.txt>

\[3\] <https://github.com/run-llama/llama%5Findex/blob/v0.10.12/llama-index-core/llama%5Findex/core/prompts/default%5Fprompts.py#L336>

\[4\] <https://docs.llamaindex.ai/en/stable/examples/query%5Ftransformations/HyDEQueryTransformDemo.html#failure-case-1-hyde-may-mislead-when-query-can-be-mis-interpreted-without-context>

\[5\] <https://arxiv.org/pdf/2305.14283.pdf>

\[6\] <https://arxiv.org/pdf/2303.07678.pdf>

\[7\] <https://arxiv.org/pdf/2305.15294.pdf>

发布于 2024-03-08 15:53・IP 属地北京 ，编辑于 2024-03-08 15:53・IP 属地北京

