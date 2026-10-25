---
title: RAG系列07：当RAG遇上PDF表格，如何构建索引并使用大模型进行QA - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-14/RAG系列07-当RAG遇上PDF表格,如何构建索引并使用大模型进行QA-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 34393c01-5d0d-4ddb-bef4-9344053069af
---

# RAG系列07：当RAG遇上PDF表格，如何构建索引并使用大模型进行QA - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/rag-07-rag-pdf-qa-18f75dd5272)
[Read Original](https://zhuanlan.zhihu.com/p/696665455)



发布于 2024-05-13 22:58・IP 属地北京 ，编辑于 2024-05-13 22:58・IP 属地北京

_有效解析和理解非结构化文档中的表格时，设计 RAG 方案仍然是一大挑战。_ 以图片格式存在的表格情况下，这更困难，如扫描文件中的表格。这些挑战至少包含以下几个方面：

```text
* 扫描文档或图像文档的复杂性，如多样化的结构、包含非文本元素以及手写和打印内容的结合，为自动准确提取表格信息带来了挑战。不准确的解析可能会破坏表格结构，使用不完整的表格进行嵌入不仅可能无法捕获表格的语义信息，而且还很容易破坏 RAG 结果。
* 如何提取表格标题并有效地将它们链接到各自的表格。
* 如何设计一个索引结构来有效地存储表格的语义信息。 本文首先介绍管理 RAG 中表格的关键技术，然后回顾一些现有的开源解决方案，再提出并实施一个可能的解决方案。
```


## 关键技术

### Table Parsing（表格解析）

![](https://proxy-prod.omnivore-image-cache.app/1400x635,sbJ-18zUGjdsFP1-WNiH9ydEuyodhoazdurILIM_aAPg/https://pic2.zhimg.com/v2-3869dd9043f0cd446f14d2e184954d99_b.jpg)

这个模块的主要功能是从非结构化文档或图像中准确提取表格结构。最好能够提取相应的表格标题，并方便开发者将表格标题与表格关联起来。目前有以下几种方法:

1. 使用多模态 LLM（multimodal LLM）如 GPT-4V 来识别表格并从每个 PDF 页面中提取信息
2. 利用专门的标检测模型，如<strong>Table Transformer\[1\]</strong>来辨别表结构
3. 使用开源框架，如<strong>unstructured\[2\]</strong>或者其他框架，这些框架允许对整个文档进行全面分析，并从分析的结果中提取与表相关的内容。
4. 使用端到端模型（如 Nougat、Donut 等）解析整个文档并提取与表格相关的内容。此方法不需要 OCR 模型。 值得一提的是，无论使用何种方法提取表格信息，都应包含表格标题。这是因为在大多数情况下，表格标题是文档或论文作者对表格的简要描述，可以在很大程度上总结整个表格。在以上几种方法中，第四种可以相对较容易地对表格标题进行检测以及和表格进行关联。

### Index Structure

索引表格的方式大概可以分为以下几种

1. 仅对图像格式的表格进行索引
2. 仅对纯文本或 JSON 格式的表进行索引
3. 仅索引 LaTeX 格式的表格
4. 仅索引表的摘要（表的摘要通常可以使用 LLM 进行生成，也可以尝试使用多模态模型）
5. 从小到大或按照文档摘要索引结构（小块内容可以是表中的行，大块内容是图像、文本或者 LaTeX 格式表格），如下图所示

![](https://proxy-prod.omnivore-image-cache.app/1280x890,s6mVeWD2XSTWDY19KfgYCsxvZZ3fouVD7M8dpmYv-WIw/https://pic3.zhimg.com/v2-5528134c5146d23b7fb45c50ae2a84ea_b.jpg)

也有一些算法不需要对表进行解析，比如可以将相关的 PDF 页面（图像）和用户查询发送到 VQA 模型（如 DAN）或者多模态 LLM（如 GPT-4V），即可返回答案，如下图所示：

![](https://proxy-prod.omnivore-image-cache.app/1400x699,sj_dKOBTgkqO4zwGK_2kTp2lSj76QEfuTvqhepZS2nL4/https://pic2.zhimg.com/v2-fd0e2f1c1df65c0c83940e4d58321ef5_b.jpg)

同时，也可以将图片，文本块，用户查询发送到多模态 LLM 直接得到答案。值得注意的是，_并不是所有的方法都依赖于 RAG 流程_，比如：

```text
* 在特定数据集上进行训练，并使模型（类似 BERT 的 transformers）能够支持表理解的任务，如**TAPAS\[3\]**方法。
* 使用 LLM 采用预训练、微调或者提示词的方式，是的 LLM 可以执行表格理解任务，如 **GPT4Table\[4\]**方法。
```


## 现有开源解决方案

LlamaIndex 中提供了四种方法，其中前三种依赖多模态模型：

1. 检索相关图像，并将其发送到 GPT-4V 进行回复
2. 将每个 PDF 页面作为图像，让 GPT-4V 对每个页面进行 reasonings，并对其建立文本索引，然后根据 Image Reasoning Vector Store 进行查询答案
3. 使用 Table Transformer 从检索到的图像中裁切表信息，然后使用 GPT-4V 进行回答
4. 对裁剪后的表格图像 OCR 处理，将文本发送到 LLM 中进行回答 Langchain 中也有一些解决方案，有以下几类：
* <strong>半结构化 RAG\[5\]</strong>：首先使用 Unstructured 从 pdf 中解析文本和表格，然后使用 multi-vector retriever 存储原始的表格和文本，同时对表格进行总结，最后用 LCEL 实现问答链路。主要流程如下所示（实际上这里的最后一个 LLM 并不是多模态 LLM）

![](https://proxy-prod.omnivore-image-cache.app/1656x386,srPPwlmsvY1nwzAybWg953Ia7ZV2OSiStqBlJv9Z4o0s/https://pic1.zhimg.com/v2-3ab799f2d4fd9534db5242f77b6bca94_b.jpg)

* <strong>半结构化与多模态 RAG\[6\]</strong>：这个当中实际上提出了多种方案，如下图所示。 - _Option1_：和半结构化 RAG 类似，使用多模态 embedding（如 CLIP）对图像和文本进行 embedding，然后将原始图像和文本块传入到多模态 LLM 进行回答 - _Option2_：也是使用多模态 LLM，根据图像生成文本摘要，然后对文本进行 embedding，这样通过传统 RAG 链路即可进行 QA - _Option3_：从图像生成文本摘要，然后进行 embedding，但是 QA 的时候，根据 embedding 找到原始的图像，并使用多模态 LLM 进行回答

![](https://proxy-prod.omnivore-image-cache.app/1657x817,sO-3gHESvrcceZBpOpdxRikCbjWpU1z1hBX2wFyvYJqQ/https://pic1.zhimg.com/v2-4f03359ad55c68a16aa4c86b54c10ca8_b.jpg)

## 建议的方案

本文对关键技术和现有解决方案进行了总结、分类和讨论。基于此，我们提出了以下解决方案，如下图所示。为简单起见，这里省略了一些 RAG 模块，例如重新排名和查询重写。 

![](https://proxy-prod.omnivore-image-cache.app/1400x1928,sm2K9_qDsiZsq9_xQtUHLHgL6ZqjfHpp2dn5Qyqaendk/https://pic2.zhimg.com/v2-4319b9fbab245bd92db76429c60bab2d_b.jpg)

```text
* 表格解析：采用 Nougat，根据作者的描述，他的表检测功能比 unstructured 更强大，同时也能很好地提取表格标题，非常方便与表格进行关联
* 文档摘要索引：小块的内容包括表格摘要，大块的内容包括 LaTeX 格式的表格和标题，然后采用 Multi-Vector Retriever 策略存储
* 表格摘要：将表格和表格标题发送给 LLM 进行汇总
```


这里介绍一下<strong>Nougat\[7\]</strong>，它基于<strong>Donut\[8\]</strong>开发，不需要与 OCR 相关的模块，总体架构图为： 

![](https://proxy-prod.omnivore-image-cache.app/1400x352,sE6Br_pR6pSnIL8mJQ028gfIBYRpjtHwtJkJ68333-ck/https://pic4.zhimg.com/v2-3b852c269073e0fc7c5b8c4f6355624b_b.jpg)

 Nougat 解析公式表格的能力令人印象深刻，也能对表格标题进行关联（解析出来的表格式 LaTeX 格式），比如下面这个例子： 

![](https://proxy-prod.omnivore-image-cache.app/1400x405,sxY8ChTUnfEBlE5TQsb8RD1nSWxieTE-o8aqPphPAJpQ/https://pic4.zhimg.com/v2-bc787bfe7301ea97e20b591309cf719b_b.jpg)

采用 Nougat，有以下有缺点：

```text
* Pros（优点）
   * 可以将公示和表格等比较难解析的部分解析为 LaTeX 源码
   * 解析的结果是类似于 Markdown 的半结构化文档
   * 可以轻松获取表格标题并与表关联
* Cons（缺点）
   * 解析速度慢，大规模使用可能受限
   * Nougat 是基于科研论文进行训练的，因此对于类似格式比较友好，对于其他格式可能效果一般
   * 双栏中解析表格不如单栏中效果好
```


## 总结

本文讨论了 RAG 流程中表处理的关键技术和现有解决方案，并提出了解决方案及其实现。本文推荐使用 nougat 来解析表格。但是，如果有更快、更有效的解析工具可用，我们也建议对其进行替换。对工具的态度是先有正确的想法，然后找到工具来实现它，而不是依赖某个具体的工具。在本文中，我们将所有表内容输入到 LLM。但是，在实际场景中，我们应该考虑表超过 LLM 上下文长度的情况，比如通过有效地分块方法来在一定程度上解决这个问题。

## 参考资料

\[1\] Table Transformer: _<https://github.com/microsoft/table-transformer>_

\[2\] unstructured: _<https://unstructured-io.github.io/unstructured/best%5Fpractices/table%5Fextraction%5Fpdf.html>_

\[3\] TAPAS: _<https://aclanthology.org/2020.acl-main.398.pdf>_

\[4\] GPT4Table: _<https://arxiv.org/pdf/2305.13062.pdf>_

\[5\] 半结构化RAG: _<https://github.com/langchain-ai/langchain/blob/master/cookbook/Semi%5FStructured%5FRAG.ipynb?ref=blog.langchain.dev>_

\[6\] 半结构化与多模态RAG: _<https://github.com/langchain-ai/langchain/blob/master/cookbook/Semi%5Fstructured%5Fand%5Fmulti%5Fmodal%5FRAG.ipynb>_

\[7\] Nougat: _<https://arxiv.org/pdf/2308.13418.pdf>_

\[8\] Donut: _<https://arxiv.org/pdf/2111.15664.pdf>_

发布于 2024-05-13 22:58・IP 属地北京 ，编辑于 2024-05-13 22:58・IP 属地北京

