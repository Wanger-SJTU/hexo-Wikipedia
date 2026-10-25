---
title: "LLM提示词工程学习笔记"
date: "2023-12-04 00:00:00"
updated: "2023-12-04 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/LLM提示词工程学习笔记/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/666572032"
---


#### 提示词工程（Prompt Engineering）是什么

<strong>提示词工程（Prompt Engineering）</strong> ，也叫做<strong>上下文提示（In-Context Prompting）</strong>，指的是<strong>通过结构化文本等方式来完善提示词，引导LLM输出我们期望的结果</strong>。通过提示词工程可以在不更新模型权重的情况下，让LLM完成不同类型的任务。其主要依赖于经验，而且提示词工程方法的效果在不同的模型中可能会有很大的差异，因此需要大量的实验和探索。

有关提示词的介绍可以参考此篇笔记：[LLM提示词详解及最佳实践](https://zhuanlan.zhihu.com/p/665288276)

#### 提示词工程基础

#### Zero-shot

Zero-shot指的就是不提供示例，直接输入指令或者问题，当然可以包含上下文信息、输出格式等内容，获取更好的结果，具体可见[LLM提示词详解及最佳实践](https://zhuanlan.zhihu.com/p/665288276)。

#### Few-shot

Few-shot指的是提供一些示例，引导LLM给出更高质量的结果，有很多关于如何构建in-context示例的研究，结果发现<strong>提示词格式、训练示例和示例顺序的选择可能会导致显著不同的效果</strong>。

[Improving Few-Shot Performance of Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2102.09690)这篇论文介绍了基于GPT-3的实验发现的LLM在few-shot场景中存在的几个偏差：

（1）*多数标签偏差（majority label bias）*，示例中出现的标签频率分布不均衡会影响LLM的结果，出现频率高的标签，在结果中也会有更高的预测概率，如Fig. 1中左图所示，当P（positive）示例较多的时候（例如[P N P P] ），预测出P的概率要明显高于N； 

（2）*近期偏差（recency bias）*，LLM有重复prompt示例中最后出现的标签的趋势，如Fig. 1中右图所示，当示例是以两个N标签结束，那么预测是N的概率明显高于P； 

（3）*常见token偏差（common token bias）*，相较于稀有token，LLM更倾向于产生在训练数据中更常见的token。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cddb372e6937.jpg)

*Fig. 1. [多数标签和近期偏差](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2102.09690.pdf)*

#### 示例选择方法

假设有一个示例库，针对如何选择合适的示例集放到prompt中，也有一些研究： 

- 在嵌入空间（embedding space）中使用k-NN聚类选择语义上与测试示例相似的示例。（[What Makes Good In-Context Examples for GPT-3](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2101.06804)） 
- 根据样本之间的余弦相似性构建一个图，基于这个图选择一组多样且具有代表性的示例。（[ Selective Annotation Makes Language Models Better Few-Shot Learners](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2209.01975)） 
- 通过对比学习来进行样本选择。（[Learning To Retrieve Prompts for In-Context Learning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2112.08633)） 
- 通过Q-Learning来做样本选择。（[Active Example Selection for In-Context Learning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.04486)） 
- 在多个抽样实验中标识具有高分歧或熵的示例，在prompt中使用这些示例。（[Active Prompting with Chain-of-Thought for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.12246)）

#### 示例排序方法

- 通用方法是在保证所选示例多样性的前提下，进行随机排序，避免多数标签和近期偏差。
- LLM参数量的提升或者增加更多的示例并不能降低示例排序对结果的影响。相同的排序在不同的LLM可能或得到差异巨大的结果，可以通过探测方法来找到效果较好的排序。（[Fantastically Ordered Prompts and Where to Find Them: Overcoming Few-Shot Prompt Order Sensitivity](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2104.08786)）

#### 思维链提示（Chain-of-Thought (CoT) Prompting）

<strong>思维链提示</strong>（[Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2201.11903)）也叫做推理链，指的是逐步描述推理逻辑，引导LLM得出最终答案。推理能力是LLM参数量不断提升后，涌现出的一个重要能力，CoT的好处在使用LLM解决<strong>复杂推理任务</strong>时更明显，对简单任务的提升效果有限。

#### CoT类型

#### Few-shot CoT

通过在prompt中包含高质量的推理链的示例，来让LLM完成推理，这些示例可以是自己编写的，或者由模型生成的。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ca8776db1b4c.jpg)

*Fig. 2. [Chain-of-Thought prompting](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2201.11903.pdf)*

#### Zero-shot CoT

触发LLM的推理能力并不一定要提供示例，也可以通过一些话术来实现，例如 *Let's think step by step.* ([Large Language Models are Zero-Shot Reasoners](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2205.11916)) 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2d41deb9d6f8.jpg)

*Fig. 3. [Zero-Shot Reasoners](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2205.11916)*

或者类似的*Let's work this out in a step by step way to be sure we have the right answer.* ([Large Language Models Are Human-Level Prompt Engineers](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.01910)) 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7155948f291a.jpg)

*Fig. 4. [Different Zero-Shot CoT Trigger Prompt](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.01910)*

#### CoT拓展

#### 自洽抽样（[Self-Consistency Sampling](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2203.11171)）

<strong>自洽抽样</strong>通过设置temperature > 0来获取多个不同输出，然后选择最佳答案，通常的选择方法是进行多数投票，即选择出现次数最多的答案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_849ea4eb6a96.jpg)

*Fig. 5. [Self-Consistency Sampling](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2203.11171.pdf)*

#### 推理加强集成（[Rationale-Augmented Ensembles](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2207.00747)）

<strong>推理加强集成</strong>通过改变prompt中的示例顺序，或者使用模型生成的推理来代替人工编写的推理，从而在多个样本试验中引入随机性，然后在这些结果中以多数票选举法得到最终答案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_006a37633bda.jpg)

*Fig. 6. [Rationale-Augmented Ensembles](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2207.00747.pdf)*

#### 渐进提示（[Progressive-Hint Prompting](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2304.09797)）

上文提到的<strong>自洽抽样</strong>和<strong>推理加强集成</strong>是多样本并行推理，然后通过多数票选举的方式得到最终结果，<strong>渐进提示</strong>是一个串行处理，将基础的prompt输入到LLM中获得第一个结果，然后将结果作为提示加回到prompt再次输入到LLM中获取第二个结果，如果第二个结果与第一个不同，那么再将第二个加回到prompt继续迭代，直到相邻两次结果相同为止，“收敛”到最终结果。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_75bb619b6e48.jpg)

*Fig. 7. [Progressive-Hint Prompting](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2304.09797.pdf)*

#### 复杂推理提示（[Complexity-Based Prompting](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.00720)）

<strong>复杂推理提示</strong>证明了更高的推理复杂度可以获得更好的推理表现，复杂度通常指的是推理的步骤数，同时可以结合自洽抽样方法，在选择最佳答案时，只针对复杂推理的结果进行多数投票选举。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3a35bace2348.jpg)

*Fig. 8. [Complexity-Based Prompting for Multi-Step Reasoning](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.00720.pdf)]*

#### 自提问（[Self-Ask](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03350)）

<strong>自提问</strong>指的是通过反复提示LLM提出后续问题，或者子问题，来迭代构建CoT，获得最终结果。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b8749b32043c.jpg)

*Fig. 9. [Self-ask](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.03350.pdf)*

更进一步，构建CoT过程中的这些子问题也可以通过搜索引擎来获取最新的答案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0da04a4b4ce1.jpg)

*Fig. 10. [Self-ask + search engine](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.03350.pdf)*

类似方法还有将CoT生成步骤和信息检索步骤交错使用的[IRCoT](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2212.10509)。 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2a2d242852e2.jpg)

*Fig. 11. [IRCoT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2212.10509.pdf)*

#### 推理与行为协同（[ReAct](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03629)）

CoT与行为（Action）相结合，根据CoT中每一步的任务来决定采取什么样的行动，行动可能是使用工具（搜索引擎、计算器等），调用API或者生成一段内容等，然后把行动结果加回到prompt中，让LLM自己判断（observe）下一步的任务，如此迭代得出CoT的最终结果。ReAct目前在业界使用比较广泛，Langchain默认Agent类型也是采用ReAct。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_50bf018cb7be.jpg)

*Fig. 12. [ReAct: Synergizing Reasoning and Acting in Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.03629.pdf)*

#### 思维树（[Tree of Thoughts, ToT](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.10601)）

ToT是对CoT的一个延展，在每一个步骤上不再只有一个推理结果，而是探索多种推理可能性，从一个链结构变成一个树结构，可以通过BFS或者DFS来进行搜索，每个状态由分类器或者多数投票来决定。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_145af191941e.jpg)

*Fig. 13. [Tree of Thoughts](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2305.10601.pdf)*

#### 自动化提示词设计

#### APE（[Automatic Prompt Engineer](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.01910)）

APE目的是自动化进行指令生成和选择，通过LLM生成指令，将这些生成的指令放到一个指令池中，选择一个打分函数对这些指令进行打分，然后选择出分数最高的指令，工作流如下所示：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_66f23bebe003.jpg)

*Fig. 14. [APE workflow](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.01910.pdf)*

#### Automate-CoT（[Automatic Prompt Augmentation and Selection with Chain-of-Thought](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.12822)）

<strong>Automate-CoT</strong>主要通过两个步骤来实现自动化地构建CoT提示词： 

（1）扩充和裁剪：给定一个问题，通过手写示例的few-shot CoT或者zero-shot CoT构建prompt输入到LLM获得带有中间推理步骤的结果，筛选出正确结果对应的prompt放到示例池中； 

（2）选择：通过优化一组潜在变量，来选择最有用、最合适的带思维链的样本。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4eed0807c4de.jpg)

*Fig. 15. [Automate-CoT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2302.12822.pdf)*

#### Auto-CoT（[Automatic Chain of Thought Prompting in Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.03493)）

Zero-Shot CoT这种简化的方法类似黑盒操作，存在局限性，例如LLM可能给出错误的思考过程，而Few-Shot CoT需要手动构建高质量的示例，操作成本较高，因此就有了Auto-CoT，自动化地构建问题和推理链的示例，主要包含两个步骤： 

（1）问题聚类：对问题进行向量计算并通过k-means算法实现聚类； 

（2）示例采样：从每个聚类中选择一个具有代表性的问题，并使用简单启发式的Zero-Shot CoT生成其推理链来构建few-shot prompt。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2a66388a2ba1.jpg)

*Fig. 16. [Auto-Cot](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2210.03493.pdf)*

#### LLM能力增强

为了进一步增强LLM能力，通常的策略是触发其推理能力和使用外部工具，前者可以把一个复杂任务分解成更简单的子任务来分步完成，核心主要是针对CoT能力的增强，后者则是可以调用外部工具、模型或者API来完成各种精细化的操作。Meta AI团队曾发布过一个比较详细的[调研报告](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.07842)。下面介绍几个具体场景下LLM能力增强的案例。

#### 检索（Retrieval）增强

由于LLM是预训练模型，其训练数据的知识具有滞后性，信息检索主要是针对那些需要使用最新知识或信息的任务，常见的如用Google或Bing搜索引擎来获取最新信息。

#### [WebGPT](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2112.09332)

OpenAI团队fine-tune了一个可以搜索和浏览网页的GPT-3模型，并且通过人工反馈来优化回答问题的效果。 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d9629546aa5d.jpg)

*Fig. 17. [WebGPT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2112.09332.pdf)*

#### 通过few-shot进行检索增强（[Internet-augmented LLM through few-shot prompting](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2203.05115)）

WebGPT提供的方法需要对模型进行fine-tune，这无疑限制了回答问题的范围以及实现成本，因此DeepMind团队又提出了一个通过few-shot进行互联网信息增强的方法，而不需要进行任何的fine-tune。为了提升信息抽取的有效性，对搜索引擎返回的结果（文档形式）进行一个切分，每个段落包含6个句子，通过TF-IDF余弦相关性算法进行搜索内容与请求的相似性排序，选取最相关的段落加入到prompt中，输入给LLM获取答案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3c82faf47827.jpg)

*Fig. 18. [Internet-augmented LLM](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2203.05115.pdf)*

#### 编程增强

目前已经有一些针对编程的fine-tuned模型，例如Meta的Code Llama以及早期OpenAI的Codex，但这些都涉及对模型参数的修改，通过prompt engineering也有一些方法可以提升代码生成质量。

#### PAL（[Program-aided Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.10435)）

PAL方法的核心是在prompt的自然语言指令中，通过在中间推理步骤中加入代码行（例如Python代码）来引导LLM通过使用Python来输出结果，而不是仅基于自然语言的推理，本质也是对CoT的一种改进。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d879a0ef3140.jpg)

*Fig. 19. [PAL](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.10435.pdf)*

#### PoT（[Program of Thoughts Prompting: Disentangling Computation from Reasoning for Numerical Reasoning Tasks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.12588)）

PoT的思想同PAL类似，原始的CoT是通过LLM进行推理和计算，而PoT是将推理和计算拆分开，将CoT中每一步的计算放到外部的代码执行器中执行，再将结果放回到prompt中。 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6d7a7b98b738.jpg)

*Fig. 20. [PoT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.12588.pdf)*

PoT与PAL十分类似，最大区别在于PoT的prompt中的每一步都是用编程语言描述，PAL是自然语言与编程语言混合在一起，作者也给出了PoT与PAL在一些测试集上的对比结果，不分伯仲吧： 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e2b4f0945529.jpg)

*Fig. 21. [PaL vs PoT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.12588.pdf)*

#### 外部APIs增强

调用外部APIs，能极大地拓展LLM的能力边界，实现此类增强也有两种方式，一种是在基础模型上进行fine-tune，例如<strong>TALM</strong>（[TALM: Tool Augmented Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2205.12255)）和<strong>Toolformer</strong>（[Toolformer: Language Models Can Teach Themselves to Use Tools](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.04761)），另一种是通过prompt让LLM给出需要执行的API及其参数，然后通过自定义程序去调用API，本篇文章重点讨论后者。

#### HuggingGPT（[Solving AI Tasks with ChatGPT and its Friends in Hugging Face](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2303.17580)）

HuggingGPT是将LLM（ChatGPT）当做一个控制器，首先对用户的请求任务进行规划，拆分成不同的子任务，然后根据不同AI模型的功能描述来选择使用哪个模型来完成子任务，最终将结果汇总返回给用户。其中AI模型均来自Hugging Face提供的开源模型库，在实际使用过程中只需要在context中包含可能用到的模型描述（此步需要进行模型选择，例如根据模型下载量和任务相关性进行排序，选择top-K模型放到prompt里），而不需要对LLM进行fine-tune。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_dec5a44650d5.jpg)

*Fig. 22. [HuggingGPT](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2303.17580.pdf)*

#### 总结

本文主要是针对prompt engineering的学习总结，如上介绍的这些方法和技术，都是基于实验的探索，而且很多情况下，应用于不同LLM得到的效果也会有所差别，所以更多的是给我们提供了一些prompt优化的思路和方向，需要我们自己去尝试，并没有通用的最优方法。

在实际应用中，考虑到实现成本，我们会优先通过优化prompt来使LLM返回更精准的结果，但是当prompt engineering无法满足我们的需求的时候，就要考虑fine-tune模型来进一步提升LLM的使用效果了。

#### 部分参考资料

[1] https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/ 

[2] https://www.promptingguide.ai/ 

[3] https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/advanced-prompt-engineering?pivots=programming-language-chat-completions 

[4] https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/chatgpt?tabs=python&pivots=programming-language-chat-completions
