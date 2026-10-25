---
title: "LangChain - RAG: 做 RAG 的天选打工人，拿这几个指标找老板加薪！"
date: "2023-11-15 00:00:00"
updated: "2023-11-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/LangChain-RAG_-做-RAG-的天选打工人,拿这几个指标找老板加薪/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/656990524
---


#### 先说结论：

<strong>做所有的工作之前，想好如何评估结果、制定好北极星指标至关重要!!! Ragas（[RAGAS: Automated Evaluation of Retrieval Augmented Generation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.15217)）  把  RAG  系统的评估指标拆分为三个维度如下，这可不是 Benz 的标...</strong>

- <strong>实时性（faith fullness）</strong>
- <strong>答案相关性（answer relevance）</strong>
- <strong>上下文相关性（context relevance，又细分为 Precision 和  Recall，所以可以看到有些类似的框架引入了 F1  指标）</strong>
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_eb48cf5e6ca2.jpg)

图一：Ragas  针对  RAG  系统的三个评估维度**

做开发的同学不管用没用过，对 TDD(Test-Driven Development)的大名总归是听过的，类似的，开发大模型应用的时候也应该有个对应的 MDD(Metrics-Driven Development) 的概念，最舒服的姿势肯定是预先定义好业务的场景、用到的数据、设定的指标以及需要达到的分值，然后按部就班的实现既定目标，员工士气高老板也开心！

但理想和现实之间总是如此纠缠，对大部分的大模型开发任务来讲，更常见的情况是场景定义不清楚，数据光清洗就累死三军，至于需要的指标和目标？想都没想过！这样的情况对我等天选打工人来讲是极其不利的，老板定战略、总监拍产品、产品讲理想，最终产品上线，总要有一些量化的东西可以写进婆婆特，写进周报、日报、调薪报告，这一次，我们来补上本应该在最最开始的就考虑的，大模型应用如何量化业务指标，具体的，如何量化的证明，你的  RAG  就是比隔壁老王他们组的牛？到底该拿哪些量化的指标去说服同行、老板高看你一眼、给你升职加薪？

#### 影响 RAG  系统性能的四个方面：

- 位置偏见：** LLMs 有可能对文本中特定位置的内容给予更高的关注，比如位于段落开头和结尾的内容更容易被采纳。
- <strong>偏爱整数：</strong>LLMs 更偏爱含有整数的答案，即便该答案不一定更合适也是一样爱。另外，某些特定的数字也可能成为 LLMs 的喜好，其它上下文相同的情况下，LLMs 可能会更倾向于选择「<strong>自己喜欢的数字</strong>」（又是人教的？<strong>比如我们不喜欢 4、不喜欢 13，这些「臭毛病」可能也被 LLMs  学去了</strong>...）。
- <strong>偏爱自己生成的内容</strong>：LLMs  倾向于选择符合自己生成风格的内容，如果同时有两份针对同一问题的答案，前者是 LLMs  生成，后者是人类生成，即便后者跟问题更加符合，LLMs 也会倾向于选择前者（<strong>其实也好理解，因为人类作为一个群体，也选择了更加符合其「族群」风格的，后者</strong>）。
- <strong>生成结果的随机性</strong>：这点比较好理解，即便每次输入的内容都一样，LLMs  的每次的输出也不相同，这给建立一个统一的，关于输出的评价量化指标带来了不小的麻烦。

#### 来具体看下  Ragas  的工作：

- RAGAs( Retrieval Augmented Generation Assessment)，愿景是专注于LLM  和 RAG  的指标驱动开发工作（MDD），从量化指标和监控指标两个方面来辅助  RAG 和 LLM  的开发工作：

- 通过量化北极星指标来指导迭代工作，避免在错误的方向上浪费时间。
- 通过监控迭代工作中的中间生成数据，获得新的优化方向，或者针对已有数据新的洞察，为下一步工作设计新实验提供思路。

- 主要做法是<strong>通过自己构建一个小的数据集，通过人工介入标注的方式确定实时性、答案相关性、上下文相关性三个维度的标准基线，来对生成的文本进行打分评估</strong>。这里需要引起注意的是，<strong>且不管从这三个维度评估是否全面、准确，引入经验丰富的人工介入标注，行程基线标准是最值得借鉴的思路</strong>。
- 代码公开到了  github： [GitHub - explodinggradients/ragas: Evaluation framework for your Retrieval Augmented Generation (RAG) pipelines](https://link.zhihu.com/?target=https%3A//github.com/explodinggradients/ragas)
- 对主流的工具，比如 LangChain 和 LLama-Index 提供了内置支持。

#### LangChain  里面的具体实现：

*之前有同学后台私信抱怨代码不完整，这次完整的  colab  在这里：https://colab.research.google.com/drive/1kIxU6J07XilW2eZvC-kCA4NoKDM2qyry?usp=sharing，*

下面捡重要的说一下：

- 首先这里用 LangSmith 作为实验结果的分析平台，所以先去 http://smith.langchain.com 申请好 proj，生成好 key：
import os
os.environ['OPENAI_API_KEY'] = "your-openai-key"
os.environ['LANGCHAIN_TRACING_V2']='true'
os.environ['LANGCHAIN_ENDPOINT']='https://api.smith.langchain.com'
os.environ['LANGCHAIN_API_KEY'] = 'your-langsmith-key'
os.environ['LANGCHAIN_PROJECT']='ragas-demo'`

- 测试语料用 wikipedia 的，首先用 LangChain 的 wikipedia loader  载入内容，指定查询「Ney York City」相关的内容：

```python
from langchain.document_loaders import WikipediaLoader
from langchain.indexes import VectorstoreIndexCreator
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
```


loader = WikipediaLoader('New York City')
docs = loader.load()`

- 默认是用  Chroma  来保存向量，OpenAI  的  emb api  生成  embedding，组合成一个  qa chain：
index = VectorstoreIndexCreator().from_loaders([loader])

# temperature 设成 0，尽量让 llm 不要乱讲话
llm = ChatOpenAI(temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm,

```text
    retriever=index.vectorstore.as_retriever(),
    return_source_documents=True,
```

)`

- 稍微测试一下检索效果：
question = "How did New York City get its name?"
result = qa_chain({"query": question})
result["result"]`

结果还成：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_65de9e308b6e.jpg)

图一：qa retrieval  结果 测试

- 接下来生成测试对照用的「标准答案」：
eval_questions = [
    "What is the population of New York City as of 2020?",
    "Which borough of New York City has the highest population?",
    "What is the economic significance of New York City?",
    "How did New York City get its name?",
    "What is the significance of the Statue of Liberty in New York City?",
]

eval_answers = [
    "8,804,190",
    "Brooklyn",
    "New York City's economic significance is vast, as it serves as the global financial capital, housing Wall Street and major financial institutions. Its diverse economy spans technology, media, healthcare, education, and more, making it resilient to economic fluctuations. NYC is a hub for international business, attracting global companies, and boasts a large, skilled labor force. Its real estate market, tourism, cultural industries, and educational institutions further fuel its economic prowess. The city's transportation network and global influence amplify its impact on the world stage, solidifying its status as a vital economic player and cultural epicenter.",
    "New York City got its name when it came under British control in 1664. King Charles II of England granted the lands to his brother, the Duke of York, who named the city New York in his own honor.",
    "The Statue of Liberty in New York City holds great significance as a symbol of the United States and its ideals of liberty and peace. It greeted millions of immigrants who arrived in the U.S. by ship in the late 19th and early 20th centuries, representing hope and freedom for those seeking a better life. It has since become an iconic landmark and a global symbol of cultural diversity and freedom.",
]

examples = [

```text
    {"query": q, "ground_truths": [eval_answers[i]]}
    for i, q in enumerate(eval_questions)
]
```


# 再测试一下 retrieval 效果：
result = qa_chain({"query": eval_questions[1]})
result["result"]

# >>The borough of Brooklyn has the highest population in New York City.

# 很满意！`

- 正主终于要上场！从  ragas  引入 RagasEvaluatorChain(参考源码：[https://github.com/explodinggradients/ragas/blob/main/src/ragas/langchain/evalchain.py#L20](https://link.zhihu.com/?target=https%3A//github.com/explodinggradients/ragas/blob/main/src/ragas/langchain/evalchain.py%23L20))，

```python
from ragas.langchain.evalchain import RagasEvaluatorChain
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
```


# create evaluation chains
faithfulness_chain = RagasEvaluatorChain(metric=faithfulness)
answer_rel_chain = RagasEvaluatorChain(metric=answer_relevancy)
context_rel_chain = RagasEvaluatorChain(metric=context_precision)
context_recall_chain = RagasEvaluatorChain(metric=context_recall)`

参考文首开始的图，还记得 ragas  对 RAG  的几个评测指标吗？

- 事实准确度
- 答案相关度
- 上下文相关性之准确率
- 上下文相关性之召回率
仔细看下各个结果：

# 事实准确度
eval_result = faithfulness_chain(result)
eval_result["faithfulness_score"]
# >>1.0

# 上下文相关性之召回率
eval_result = context_recall_chain(result)
eval_result["context_recall_score"]
# >>0.6666666666666666

# ------------------------------
# 还支持 batch 操作
predictions = qa_chain.batch(examples)

# evaluate
print("evaluating...")
r = faithfulness_chain.evaluate(examples, predictions)
r`

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_32d115f16b5c.jpg)

图二：batch  操作到这里，ragas 的评测就完成了，如果对 langsmith 不感兴趣可以就此打住...

ragas 的评测需要先创建一个可信的、基准的数据集，langsmith  给提供了一个可以存放这些数据集，并保留每次评测结果、中间结果、报表的服务（这个思路说来话长，可以翻一下之前的文章专门整理过关于 mlflow、wandb、comet、neptune...），一步步来：

- 首先创建并上传  dataset：
# dataset creation

```python
from langsmith import Client
from langsmith.utils import LangSmithError
```


client = Client()
dataset_name = "NYC test"

try:
    # check if dataset exists

```python
    dataset = client.read_dataset(dataset_name=dataset_name)
    print("using existing dataset: ", dataset.name)
```

except LangSmithError:
    # if not create a new one with the generated query examples

```python
    dataset = client.create_dataset(
        dataset_name=dataset_name, description="NYC test dataset"
    )
    for e in examples:
        client.create_example(
            inputs={"query": e["query"]},
            outputs={"ground_truths": e["ground_truths"]},
            dataset_id=dataset.id,
        )

    print("Created a new dataset: ", dataset.name)
```


# factory function that return a new qa chain

```python
def create_qa_chain(return_context=True):
    qa_chain = RetrievalQA.from_chain_type(
        llm,
        retriever=index.vectorstore.as_retriever(),
        return_source_documents=return_context,
    )
    return qa_chain
```


# 用上面这个工厂函数来创建要测试的 chain，
from langchain.smith import RunEvalConfig, run_on_dataset

evaluation_config = RunEvalConfig(

```text
    custom_evaluators=[
        faithfulness_chain,
        answer_rel_chain,
        context_rel_chain,
        context_recall_chain,
    ],
    prediction_key="result",
)
```


result = run_on_dataset(
    client,
    dataset_name,
    create_qa_chain,

```text
    evaluation=evaluation_config,
    input_mapper=lambda x: x,
```

)`

执行到这里，创建好的  dataset、生成的结果都已经乖乖上传到了 smith.langchain.com:

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_57a61886041c.jpg)

图三：smith  帅帅的后台![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_605204a29543.jpg)

图四：三个维度、四个指标![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3ecfa101fa09.jpg)

图五：langsmith  的好处就是啥啥都留下来了...正如开始我们提到的，针对 LLMs  生成的内容进行检测评估至关重要！尽早发现冗余、无关的信息并在送入 LLMs 之前把这些信息过滤掉不仅影响到 token  的消耗（经费在燃烧）；也关系到整个  RAG 系统的效率和质量。

最终，我们要算一个单一指标，ragas  里面采用的是「调和平均数」（the harmonic mean），奇怪的是 RagasEvaluatorChain 返回的结果里面并没有这个值，不过没关系我们可以调用  statistics  的 harmonic_mean 方法自己算一个

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6e7ff8d8aab4.jpg)

图六：RagasEvaluatorChain 里面记录的  project  名字有了上面这个名字就可以去  smith.langchain.com 里面找到对应的结果，如下：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ec2c01e83ac8.jpg)

图七：RagasEvaluatorChain 返回的四个指标自己算一下调和平均数：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6bd7a5f14bad.jpg)

图八： 最终的单一指标<strong>至此！终于！可以拿着一个谁都容易理解的指标去找老板加薪了！！！</strong>
