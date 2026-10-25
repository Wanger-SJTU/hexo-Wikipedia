---
title: "llm的检索rag-1-通过交互阅读突破上下文限制"
date: "2023-10-24 00:00:00"
updated: "2023-10-24 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/llm的检索rag-1-通过交互阅读突破上下文限制/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/662804785"
---


Walking Down the Memory Maze: Beyond Context Limit through Interactive Reading

走出记忆迷宫：通过交互阅读突破上下文限制

论文链接：[https://arxiv.org/pdf/22310.05029](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/22310.05029)


MEMWALKER可以超越上下文限制，LLM主动地处理长文本的重要部分，忽略无效部分，而无需额外的微调。

### 简介

> Large language models (LLMs) have advanced in large strides due to the effectiveness of the self-attention mechanism that processes and compares all tokens at once. 

由于自我注意机制的有效性，大型语言模型（LLM）一次处理和比较所有标记，取得了长足的进步。

> However, this mechanism comes with a fundamental issue — the predetermined context window is bound to be limited. 

然而，这种机制伴随着一个基本问题——预先确定的上下文窗口必然是有限的。

> Despite attempts to extend the context window through methods like extrapolating the positional embedding, using recurrence, or selectively retrieving essential parts of the long sequence, long-text understanding continues to be a challenge.

尽管尝试通过外推位置嵌入、使用递归或选择性检索长序列的重要部分等方法来扩展上下文窗口，但长文本理解仍然是一个挑战。

> We propose an alternative approach which instead treats the LLM as an interactive agent, allowing it to decidehow to read the text via iterative prompting. 

我们提出了一种替代方法，将LLM视为交互式代理，允许它通过迭代提示来决定如何阅读文本。

> We introduce MEMWALKER, a method that first processes the long context into a tree of summary nodes. Upon receiving a query, the model navigates this tree in search of relevant information, and responds once it gathers sufficient information.

我们引入了MEMWALKER，这是一种首先将长上下文处理成摘要节点树的方法。在接收到查询后，模型导航该树以搜索相关信息，并在收集到足够信息后做出响应。

> On long-text question answering tasks our method outperforms baseline approaches that use long context windows, recurrence, and retrieval. 

在长文本问答任务中，我们的方法优于使用长上下文窗口、递归和检索的基线方法。

> We show that, beyond effective reading, MEMWALKER enhances explainability by highlighting the reasoning steps as it interactively reads the text; pinpointing the relevant text segments related to the query

我们表明，除了有效阅读之外，MEMWALKER还通过在交互式阅读文本时突出显示推理步骤来增强可解释性；精确定位与查询相关的相关文本段

### 相关工作

Context window scaling/Recurrence/Retrieval./Reasoning agents.

长文本/循环（循环架构已被广泛研究以解决长序列问题）/检索/智能体

这里说一下循环

循环架构已被广泛研究以解决长序列问题，从基于循环神经网络的模型到基于现代变压器的模型。然而，每个重复步骤都会导致信息丢失，并且训练目标不会指导关于下游任务的“如何压缩”。通常，这种压缩意味着与最近的信息相比，对旧序列信息的召回较弱

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0802bb3efb16.jpg)

adapting language models tocompress context论文23.05像上图的论文，就是通过循环的架构，压缩过长的上下文，来提炼压缩作为模型输入

### 方法

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7f2899d563f6.jpg)

MEMWALKER的两阶段过程。顶部（阶段1）：构建内存树。底部（阶段2）：给定一个查询，LLM通过迭代提示导航树结构，并找到包含相关段的节点以形成答案。MEMWALKER的两阶段过程：

<strong>顶部（阶段1）：构建内存树。</strong>

将长文本拆分为预定大小的段，每个段首先汇总成一个摘要节点。摘要节点递归地汇总成更高级别的节点，直到到达根。

<strong>summ9 = LLM(summ7, summ8)</strong>迭代LLM生成sum树 

<strong>底部（阶段2）：查询/导航</strong>

给定一个查询，LLM通过迭代提示导航树结构，并找到包含相关段的节点以形成答案。

<strong>reasoning, action = LLM(summ, query)</strong>LLM根据文本和问题进行回答，在回答同时会产生一个动作，这个动作用来指示/导航模型向哪里继续搜索

为了回答用户查询，LLM从树的根节点开始导航。它遍历树，检查文本的各个部分以识别与回答查询相关的路径和段。并且如果LLM选择了错误的路径或手头的段不相关（虚线红色箭头），则LLM可以选择恢复动作返回父节点。

<strong>这里的导航方法是重点，不仅要尽量找到子树中正确路径，还要可以找错路后回退，还要存储路径信息。</strong>

<strong>有关显示启用导航的LLM提示的详细示例，请参见表1（下表）</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d3843de14919.jpg)

来自QuALITY数据集的示例轨迹。

LLM首先在根节点（图1中的summ 9）看到子节点的内容并生成响应（采取行动0输入summ 7）。当到达叶节点（summ 2）时，LLM确定没有足够的信息，因此采取行动恢复（行动-1）到父节点。在节点之间来回跳跃后，LLM提交到叶节点（summ 3）并回答问题。黄色表示分类提示，紫色表示§3中描述的叶提示。//后的文本表示LLM未处理的注释。


我们研究与长上下文问答相关的任务——给定一个长文本x和一个查询q，模型旨在生成响应r。MEMWALKER遵循两个步骤：1）内存树构造，其中长上下文被分解为树数据结构。这种构造不依赖于查询，因此如果序列数据事先可用，可以提前计算。2）导航，其中模型在接收到查询时导航此结构，收集信息以制作合适的响应。MEMWALKER假设访问底层LLM，并且构造和导航都是通过迭代LLM提示实现的

### 实验

#### 实验设置

我们在三个长上下文问答任务中评估了MEMWALKER，并显示出针对重复、检索和普通LLM基线的卓越性能。MEMWALKER还优于其他开放的长上下文系统，这些系统可以使用8,000到16,000个令牌。我们对MEMWALKER的有效性进行了分析，并表明它可以推理导航决策，在遍历过程中结合工作记忆，并从早期导航步骤中的错误中恢复过来。

QuALITY **是多项选择题回答数据集。该数据集包含来自古腾堡计划的长篇故事和由人类注释者注释的问题。我们使用187个示例的子集进行实验。

<strong>SummScreenFD</strong>是一个电视和电影剧本的数据集，最初设计用于总结演员之间的对话形式。我们将数据集重新用于问答任务，其中原始提供的地面实况摘要文本用于使用Stable Beluga 2生成“谁”问题，然后由人类专家检查答案。与原始长篇文本配对的问题成为306个示例的重新利用的QA任务。

<strong>GovReport</strong>政府报告数据集将国会研究服务中心和美国政府问责局的文件与专家提供的摘要一起聚合。我们将数据集重新用于包含101个示例的问答数据集，与SummScreenFD的方式相同。

所有三个数据集都具有每个示例不同长度的长上下文——一些较短的示例和一些较长的序列。因此，我们既报告原始数据集的结果，也报告每个任务仅包含较长序列的子集，以更好地评估更难、更长上下文情况下的内存访问。QuALITY的阈值高于8000个令牌，SummScreenFD的阈值高于6000个令牌，GovReport的阈值高于12000个令牌

model  :Stable Beluga 2 LLM，最大上下文长度为4,096令牌

baseline：我们比较了三种基于相同底层LLM的基线记忆技术，即稳定白鲸2:1）完整上下文窗口，2）重复和3）检索。完整上下文窗口基线利用完整的4,096个标记来处理长输入文本和生成。由于数据集中的实例经常超过上下文限制，我们在评估两种方法时，将文本右侧（最近）或左侧（最近）的长度截断为输入。对于检索，我们使用Contriever（Izacard et al.，2022）根据查询从长上下文中选择片段。得分最高的片段作为输入上下文连接到LLM，直到它们填满上下文。最后，我们实现了一个基线，该基线通过汇总将信息从以前的分段令牌递归到当前的分段令牌（徐等人，2022年），其中每个分段为2,500个令牌，最大汇总大小为500个令牌

#### 结果与分析

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7146fc649902.jpg)

Orig.表示使用整个数据集，Long表示较长序列的子集。顶部：与开源的长上下文模型的比较。底部：基线和MEMWALKER性能，所有方法都使用底层的Stable Beluga 2 LLM，最大上下文长度为4,096令牌。MEMWALKER在较长序列上的性能优于所有其他方法

还分析了不同模型、cot、不同上下文的左右截断、使用工作内容与否的影响

还分析了导航的准确率、误导率

探究了树状结构的不同配置参数之间的trade off

 

### 总结

我们提出了MEMWALKER，这是一种交互式阅读代理，它使用迭代LLM提示，根据自己的推理来决定应该仔细阅读内容的哪一部分。我们的方法首先在给定长上下文序列数据的情况下构建结构化内存，然后在给定查询的情况下对要阅读的相关部分做出导航决策。我们的方法在包括各种长上下文长度模型、检索和递归基线在内的大量基线上表现出卓越的性能，特别是对于较长序列的任务。详细的分析强调了许多重要因素，包括我们的方法对导航决策进行推理的能力、在必要时将导航恢复到不同路径的能力以及工作记忆的结合。未来的工作应该探索MEMWALKER开辟的许多新方向，特别是它对树以外的不同数据结构的应用，以及针对交互式阅读目标微调其性能。
