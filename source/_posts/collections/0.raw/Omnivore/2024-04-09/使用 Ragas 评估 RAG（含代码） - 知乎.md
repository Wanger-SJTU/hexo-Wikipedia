---
title: 使用 Ragas 评估 RAG（含代码） - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-09/使用-Ragas-评估-RAG(含代码)-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 9f3d0852-7958-4328-bd42-67b2fbf0c25d
---

# 使用 Ragas 评估 RAG（含代码） - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/ragas-rag-18ec2e759df)
[Read Original](https://zhuanlan.zhihu.com/p/689730410)



![](https://proxy-prod.omnivore-image-cache.app/0x0,sgm3lRZXj38guPpmK3xf86gqaBfvof5Q7zYih2jqPjhw/https://picx.zhimg.com/80/v2-bc4ce1050e1a31f653d94da90744cfcf_1440w.png)

你经常看 人工智能 话题的内容

发布于 2024-03-29 14:34・IP 属地广东 ，编辑于 2024-04-01 10:56・IP 属地广东

![](https://proxy-prod.omnivore-image-cache.app/1080x370,seAvqCqkEIhnakBTBY6hnj5Lks8er1FIaWX68exM1Zog/https://pic4.zhimg.com/v2-7bebd9c1129524c0a323a0e70d97ba3f_b.jpg)

> Github：<https://github.com/mcks2000/llm%5Fnotebooks/tree/main/notebooks/ragas>

检索作为生成人工智能系统的基石，仍然具有挑战性。检索增强生成（Retrieval Augmented Generation，简称 RAG）是一种构建人工智能驱动的聊天机器人的方法。这些机器人根据人工智能模型所训练的数据回答问题，并通过您自己的数据片段进行增强，通常通过近似最近邻（ANN）矢量搜索检索。

来自 WikiEval 等来源的评估数据显示自然语言检索准确性非常低。这意味着在部署 GenAI 系统之前，您可能需要进行实验来调整 GenAI 系统的 RAG 参数。然而，在进行 RAG 实验之前，您需要一种方法来评估哪些实验具有最佳结果！

![](https://proxy-prod.omnivore-image-cache.app/1080x652,smHKNejo9Gzj1n3_lp4HEpiDRF30jNYn6A-tCMZzaTp8/https://pic3.zhimg.com/v2-38cd638369de89984d184b8855e5f5ee_b.jpg)

## RAG评估

使用大型语言模型 (LLM)作为评判在现代 RAG 评估中已经得到了重视。这种方法涉及使用强大的语言模型（例如 OpenAI 的 GPT-4）来评估 RAG 系统中组件的质量。LLM 作为评委，评估 RAG 系统生成的答案的相关性、准确性、对指示的遵守情况以及整体质量。

要求一名 LLM 评估另一名 LLM 似乎很奇怪。根据研究，GPT-4 在 80% 的情况下与人类标记者一致。显然，人类（在人工智能术语中称为“贝叶斯极限”）彼此的一致性不超过 80%！使用“ LLM 作为评判”的方法可以自动化并加快评估速度，并提供可扩展性，同时节省人工标记的成本和时间。

LLM 作为 RAG 评估的评判有两种主要风格：

1. MT-Bench 使用 LLM 来判断仅被验证为人类基本事实的问答对。在 LLM 使用 80 个 QA 对评估不同的解码器（生成 AI 组件）之前，人类最初会审查问题和答案，以确保问题足够复杂以进行有价值的测试。
2. Ragas 的理念是， LLM 可以通过形成范式来有效地评估自然语言输出，这些范式克服了直接使用 LLM 作为评判者的偏见，并提供可解释且直观易懂的连续分数。

拉加斯利用了这样的概念：事实答案应该在统计抽样中表现出更高的稳定性。也就是说，事实答案的样本在语义上应该比幻觉答案的样本更相似。利用这一原理，Ragas 可以使用 LLM 和嵌入以及一小部分手工策划的问答对（约 10 个）来自动化评估过程，而不是数百个手工策划的 QA 对（或 80 个）。

根据 Ragas 文档，您的 RAG 管道评估将需要四个关键数据点。

1. 问题：提出的问题。
2. 上下文：数据中最符合问题含义的文本块。
3. 答案：RAG 聊天机器人针对该问题生成了答案。
4. 真实答案：问题的预期答案。

## 拉格斯评估指标

![](https://proxy-prod.omnivore-image-cache.app/1080x461,sVkSjzoHA7h7pjNsLmjVkhFgJjJY3qWEaHHJiodalmHA/https://pic3.zhimg.com/v2-26ec3a33d9bd65c8767af0079812469e_b.jpg)

您可以在文档中找到每个指标的说明，包括其基本公式。例如，忠诚。一些指标是：

1. 上下文精度：使用question和retrieved contexts来测量信噪比。
2. Context Recall：使用ground truth和retrieved contexts检查是否检索到答案的所有相关信息。
3. 忠实度：使用retrieved contexts机器人bot answer答案来衡量答案中的主张是否可以从上下文中推断出来。
4. 答案相关性：使用question和 来bot answer评估答案是否解决了问题（不考虑事实性，但会惩罚不完整或冗余的答案）。
5. 答案正确性：使用ground truth和bot answer首先计算每个句子的 TP、FP、FN，然后计算“正确性”作为这些组件的 F1 指标。文档中给出了一个很好的例子。事实真相：爱因斯坦 1879 年出生于德国。机器人答案：爱因斯坦于 1879 年出生于西班牙。TP（真阳性）：\[爱因斯坦出生于 1879 年\] FP（假阳性）：\[爱因斯坦出生于西班牙\] FN（假阴性）：\[爱因斯坦出生于德国\]
6. 答案相似度：使用ground truth和bot answer嵌入向量本身来评估两个答案之间的语义相似性（余弦向量距离）。

## RAG 评估代码示例

此评估代码假设您已经有 RAG 演示。在我的演示中，我使用Milvus 技术文档和 Milvus 矢量数据库进行检索创建了一个 RAG 聊天机器人。我的演示RAG 笔记本和 Eval 笔记本的完整代码位于 github 上。

使用该 RAG 演示，我向它提出问题，从 Milvus 获取 RAG 上下文，并从 LLM 生成机器人响应（下面的“上下文”和“答案”列）。此外，我还提供了相同问题的 “ground\_truth” 答案。

您需要安装 openai、(HuggingFace) 数据集、ragas、langchain 和 pandas。

```haskell
# !pip install openai dataset ragas langchain pandas
import pandas as pd
eval_df = pd.read_csv("data/milvus_ground_truth.csv")
display(eval_df.head())
```

![](https://proxy-prod.omnivore-image-cache.app/1080x154,s_cgh4Ev9cnfII5MSAmqe32vQjYcQlNX2L7SlA7veCLs/https://pic3.zhimg.com/v2-0a2bae295c55e055979bc8b3eb4ad3ca_b.jpg)

将 pandas 数据框转换为 HuggingFace 数据集。

```nix
from datasets import Dataset
def assemble_ragas_dataset(input_df):
    question_list, truth_list, context_list = [], [], []


    question_list = input_df.Question.to_list()
    truth_list = eval_df.ground_truth_answer.to_list()
    context_list = input_df.Custom_RAG_context.to_list()
    context_list = [[context] for context in context_list]
    rag_answer_list = input_df.Custom_RAG_answer.to_list()


    # Create a HuggingFace Dataset from the ground truth lists.
    ragas_ds = Dataset.from_dict({"question": question_list,
                            "contexts": context_list,
                            "answer": rag_answer_list,
                            "ground_truth": truth_list
                            })
    return ragas_ds


# Create a Ragas HuggingFace Dataset from the pandas df.
ragas_input_ds = assemble_ragas_dataset(eval_df)


display(ragas_input_ds)
```

Ragas 使用的默认 LLM 模型是 OpenAI 的 “gpt-3.5-turbo-16k”，默认嵌入模型是 “text-embedding-ada-002”。由于 ragas 使用 LangChain，因此您可以将这两个模型更改为 LangChain 支持的任何模型。

我将把 LLM-as-judge 模型更改为固定的 “gpt-3.5-turbo”，因为 OpenAI 的最新博客宣布这是最便宜的。我还将嵌入模型更改为 “text-embedding-3-small”，因为博客指出这些新嵌入支持压缩模式。

在下面的代码中，我仅使用 RAG 上下文评估指标，专注于衡量检索质量。

```nix
import os, openai, pprint
from openai import OpenAI


# Save the api key in an env variable.
openai_api_key=os.environ['OPENAI_API_KEY']


# Choose the metrics you want to see.
from ragas.metrics import ( context_recall, context_precision, faithfulness, )
metrics = ['context_recall', 'context_precision', 'faithfulness']


# Change the llm-as-critic.
from ragas.llms import llm_factory
LLM_NAME = "gpt-3.5-turbo"
ragas_llm = llm_factory(model=LLM_NAME)


# Also change the embedding model.
from langchain_openai.embeddings import OpenAIEmbeddings
from ragas.embeddings import LangchainEmbeddingsWrapper
lc_embeddings = OpenAIEmbeddings( 
    model="text-embedding-3-small", 
    dimensions=512 )
ragas_emb = LangchainEmbeddingsWrapper(embeddings=lc_embeddings)


# Change the default models used for each metric.
for metric in metrics:
    globals()[metric].llm = ragas_llm
    globals()[metric].embeddings = ragas_emb


# Evaluate the dataset.
from ragas import evaluate
ragas_result = evaluate( ragas_input_ds,
    metrics=[ context_precision, context_recall, faithfulness, ],
    llm=ragas_llm,)


# View evaluations.
ragas_output_df = ragas_result.to_pandas()
ragas_output_df.head()
```

![](https://proxy-prod.omnivore-image-cache.app/1080x335,s7-0GwJ_HzJzL-8YbNT9XvyZ1pSMxzZhpjeqTA57bbOQ/https://pic3.zhimg.com/v2-b791f68e5272253330b9a03a5ea83a12_b.jpg)

## 结论

本文我们探讨了自然语言 AI 检索增强生成 (RAG) 中持续存在的挑战。需要进行实验，通过评估来优化 RAG 参数。目前，RAG 评估可以使用大型语言模型 (LLM) 作为评委来实现自动化。

我讨论了一些关键的 RAG 评估指标及其计算，以及使用 Milvus 矢量数据库和 Ragas 包的实现。

感谢 Exploding Gradients 存储库和 Ragas 论文的作者 Shahul Es 和 Jithin James 提供的反馈并帮助编写此博客和演示。

## 资源

* Github：<https://github.com/mcks2000/llm%5Fnotebooks/tree/main/notebooks/ragas>
* Ragas：检索增强生成的自动评估：<https://arxiv.org/abs/2309.15217>
* 使用 MT-Bench 和 Chatbot Arena 评审 LLM-as-a-Judge：<https://arxiv.org/pdf/2306.05685.pdf>
* MT-Bench 浏览器：<https://huggingface.co/spaces/lmsys/mt-bench>
* 爆炸梯度存储库：<https://github.com/explodinggradients/ragas>
* Milvus 开源向量数据库：<https://github.com/milvus-io/milvus>
* 矢量数据库的背景资料：<https://zilliz.com/learn/what-is-vector-database>
* 矢量嵌入的背景资料：<https://zilliz.com/learn/Sentence-Transformers-for-Long-Form-Text>

---

<strong>点赞关注 [二师兄 talk](https://www.zhihu.com/people/dev-daddy)</strong> 获取更多资讯，并在 知乎 上阅读我的短篇技术文章

发布于 2024-03-29 14:34・IP 属地广东 ，编辑于 2024-04-01 10:56・IP 属地广东

