---
title: "大模型的幻觉问题调研: LLM Hallucination Survey"
date: "2023-07-19 00:00:00"
updated: "2023-07-19 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/大模型的幻觉问题调研_-LLM-Hallucination-Survey/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/644541524"
---


幻觉问题是LLM的实际落地应用中大家非常关注的一个问题。推荐一个前人写的比较全面的综述，但这篇Survey较少涉及2023年以后LLM时代的幻觉问题工作。


[Survey of Hallucination in Natural Language Generationarxiv.org/abs/2202.03629](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2202.03629)

笔者也整理了一些相关的最新工作（主要是大模型相关），在如下仓库：

[Reading list of hallucination in LLMs.github.com/HillZhang1999/llm-hallucination-survey](https://link.zhihu.com/?target=https%3A//github.com/HillZhang1999/llm-hallucination-survey)

### 幻觉的定义

定义**：当模型生成的文本不遵循原文（Faithfulness）或者不符合事实（Factualness），我们就可以认为模型出现了幻觉的问题。

***the generated content that is nonsensical or unfaithful to the provided source content*什么是Faithfulness and Factualness：**

- <strong>Faithfulness</strong>：是否遵循input content；
- <strong>Factualness</strong>：是否符合世界知识；
***Joshua Maynez, Shashi Narayan, Bernd Bohnet, and Ryan McDonald. 2020. On faithfulness and factuality in abstractive summarization. In Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics.*针对不同任务，幻觉的定义也可能出现差异：**

- <strong>数据源（source）不一致</strong>：

- 例如：摘要的数据源是document，data-to-text的数据源是data table，对话的数据源是对话历史，而开放域对话的数据源可以是世界知识。

- <strong>容忍幻觉的程度不一致</strong>：

- 在摘要、data-to-text任务中，非常看重response的Faithfulness，因此这些任务对幻觉的容忍程度很低；
- 而像开发域对话任务中，只需要response符合事实即可，容忍程度较高；

<strong>在传统任务里，幻觉大都是指的是Faithfulness：</strong>

- <strong>Intrinsic Hallucination（信息冲突）</strong>: LMs在生成回复时，与输入信息产生了冲突，例如摘要问题里，abstract和document的信息不一致。
- <strong>Extrinsic Hallucination（无中生有）:</strong> LMs在生成回复时，输出一些并没有体现在输入中的额外信息，比如邮箱地址、电话号码、住址，并且难以验证其真假。（PS: 按照此定义，Extrinsic Hallucination有可能是真的信息，只是需要外部信息源进行认证）
<strong>而面向LLMs，我们通常考虑的幻觉则是Factualness：</strong>

- 因为我们应用LLM的形式是open-domain Chat，而不是局限于特定任务，所以数据源可以看做任意的世界知识。LLMs如果生成了不在input source里的额外信息，但是符合事实的，这种情况也可能是对我们有帮助的。

### 幻觉的原因

#### 数据层面

在数据工程层面可能出现一些问题，导致幻觉问题：

- 训练数据收集过程中，众包/爬虫检索的数据可能包含虚假信息，从而让模型记忆了错误的知识；
- 过多的重复信息也可能导致模型的知识记忆出现bias，从而导致幻觉：
***Katherine Lee, Daphne Ippolito, Andrew Nystrom, Chiyuan Zhang, Douglas Eck, Chris Callison-Burch, and Nicholas Carlini. 2021. Deduplicating training data makes language models better. arXiv preprint arXiv:2107.06499 (2021).*潜在的研究方向：**

- Building High-quality Training Corpus is essential.
- Data verification/ Data filter/ Data selection.

#### 模型层面

即使有了高质量训练数据，LLMs仍然可能表现出幻觉现象。

- <strong>模型结构</strong>：如果是较弱的backbone（比如RNN）可能导致比较严重的幻觉问题，但在LLMs时代应该不太可能存在这一问题；
- <strong>解码算法</strong>：研究表明，如果使用不确定性较高的采样算法（e.g.，top-p）会诱导LMs出现更严重的幻觉问题。甚至可以故意在解码算法中加入一些随机性，进一步让LMs胡编乱造（可以用该方法生成一些negative samples）
*Nayeon Lee, Wei Ping, Peng Xu, Mostofa Patwary, Mohammad Shoeybi, and Bryan Catanzaro. 2022. Factuality enhanced language models for open-ended text generation. arXiv preprint arXiv:2206.04624 (2022).*

- 暴露偏差**：训练和测试阶段不匹配的exposure bias问题可能导致LLMs出现幻觉，特别是生成long-form response的时候。
*Chaojun Wang and Rico Sennrich. 2020. On exposure bias, hallucination and domain shift in neural machine translation. In Proceedings of the 2020 Annual Conference of the Association for Computational Linguistics. 3544–3552.*

- 参数知识：**LMs在预训练阶段记忆的错误的知识，将会严重导致幻觉问题。
*Shayne Longpre, Kartik Perisetla, Anthony Chen, Nikhil Ramesh, Chris DuBois, and Sameer Singh. 2021. Entity-based knowledge conflicts in question answering. In Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing (EMNLP’21). 7052–7063.*
### 幻觉的评估

现有的传统幻觉评估指标和人类结果的相关性往往较低，同时大都是task-specific的。

> *Artidoro Pagnoni, Vidhisha Balachandran, and Yulia Tsvetkov. 2021. Understanding factuality in abstractive summarization with FRANK: A benchmark for factuality metrics. In Proceedings of the 2021 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (NAACL-HLT’21). 4812–4829*

#### Reference-based

Reference-based的指标有两类：

- 基于Source Information和Target Reference**：利用一些统计学指标，比如ROUGE、BLEU来评估输出结果和Source/Target信息的重叠度。
- <strong>基于Source Information</strong>：由于NLG任务里，Target输出往往是多种多样的，因此许多工作只基于Source信息进行幻觉的评估。比如Knowledge F1。
*基于Reference的评价指标，基本上只能评价Faithfulness，而无法评价Factualness，因此通常不适用于LLMs。*

#### Reference-Free

- <strong>基于IE</strong>：将知识限定于可以用三元组形式表示的关系和事件，基于额外的IE模型进行抽取，接着使用额外模型进行验证。

- <strong>缺点：</strong>

- 可能存在IE模型的错误传播问题。
- 知识被限定在三元组形式。

- <strong>基于QA</strong>：第一步先基于LM生成的回复，使用一个QG(question generation)模型生成一系列QA pairs；第二步给定Source Information，让QA模型对上一步生成的Question进行回复；第三步则是通过对比第一步的answers和第二步的answers，计算匹配指标，衡量模型的幻觉问题；

- <strong>缺点</strong>：

- 同样存在QA/QG模型的错误传播问题。
- 难以评估Factualness，因为上述第二步里面，Source Information不可能包含全部的世界知识，因此对于一些问题难以生成可靠的回复。

*Esin Durmus, He He, and Mona Diab. 2020. FEQA: A question answering evaluation framework for faithfulness assessment in abstractive summarization. In Proceedings of the 58th Annual Meeting of the ACL. 5055–5070.*

- 基于NLI**：基于NLI的方法通过NLI模型评估是否Source Information可以蕴含Generated Text，从而评估是否出现了幻觉现象。

- <strong>缺点</strong>：

- Off-the-shelf NLI模型用于核查事实效果不是很好；

*Nouha Dziri, Hannah Rashkin, Tal Linzen, and David Reitter. 2021. Evaluating groundedness in dialogue systems: The BEGIN benchmark. In Findings of the Association for Computational Linguistics. Association for Computational Linguistics, 1–12.*

- 无法评估需要世界知识的幻觉问题：仅能依赖于Source进行核查；
- 都是sentence-level的，无法支撑更细粒度的幻觉检查；

> *Tanya Goyal and Greg Durrett. 2020. Evaluating factuality in generation with dependency-level entailment. In Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing: Findings. 3592–3603.*

- 幻觉问题和蕴含问题实际并不等价：

- 例子：Putin is president. -> Putin is U.S. president (可以蕴含，但是是幻觉)

- 基于Factualness Classification Metric**：标注/构造一批和幻觉/事实有关的数据，训练检测模型，利用该模型评估新生成文本的幻觉/事实问题。
*Emily Dinan, Stephen Roller, Kurt Shuster, Angela Fan, Michael Auli, and Jason Weston. 2018. Wizard of Wikipedia: Knowledge-powered conversational agents. In Proceedings of the International Conference on Learning Representations.*

- 人工评估：**目前为止最靠谱的，此外还可以依靠LLM打分（比如利用GPT4，但是GPT4也存在着严重的幻觉问题，即使经过retrival-augment，检索回来的信息也有可能是错误的）

### 幻觉的缓解

#### 基于数据的工作

<strong>构建高质量数据集</strong>

- <strong>人工标注</strong>

- <strong>训练数据</strong>：LLM上不可行，只适用于task-specific的幻觉问题
- <strong>评测数据</strong>：构建细粒度的幻觉评估benchmark用于分析幻觉的严重程度和原因

*Saadia Gabriel, Asli Celikyilmaz, Rahul Jha, Yejin Choi, and Jianfeng Gao. 2021. GO FIGURE: A meta evaluation of factuality in summarization. In Findings of the Association for Computational Linguistics: ACL-IJCNLP 2021. Association for Computational Linguistics, 478–487.*
*Or Honovich, Leshem Choshen, Roee Aharoni, Ella Neeman, Idan Szpektor, and Omri Abend. 2021. Q2: Evaluating factual consistency in knowledge-grounded dialogues via question generation and question answering. In Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing. 7856–7870*

- 自动筛选**：

- 利用<strong>模型筛选</strong>出可能导致幻觉的数据并剔除；
- 预训练时给更faithful的<strong>数据加权</strong>（wiki vs. fake news），或者不使用可靠来源的数据（比如只选用经过人工审查的数据源，如wiki或者教科书，预训练）


[](https://zhuanlan.zhihu.com/p/626544154)

#### 模型层面的工作

模型结构

- 模型结构层面的工作往往focus在设计更能充分编码利用source information的方法，比如融入一些人类偏置，如GNN网络。
- 或者在解码时减少模型的<strong>生成随机性</strong>，因为diversity和Faithfulness往往是一个trade-off的关系，减少diversity/randomness可以变相提升Faithfulness/Factuality。
*Nayeon Lee, Wei Ping, Peng Xu, Mostofa Patwary, Mohammad Shoeybi, and Bryan Catanzaro. 2022. Factuality enhanced language models for open-ended text generation. arXiv preprint arXiv:2206.04624 (2022).*

- 检索增强**被证明可以显著减少幻觉问题，e.g., llama-index。
***Peng, Baolin, Michel Galley, Pengcheng He, Hao Cheng, Yujia Xie, Yu Hu, Qiuyuan Huang et al. "Check your facts and try again: Improving large language models with external knowledge and automated feedback."arXiv preprint arXiv:2302.12813(2023).*训练方式**

- <strong>可控文本生成</strong>：将幻觉的程度作为一个可控的属性，利用可控文本生成技术进行控制。
*Hannah Rashkin, David Reitter, Gaurav Singh Tomar, and Dipanjan Das. 2021. Increasing faithfulness in knowledgegrounded dialogue with controllable features. In Proceedings of the 59th Annual Meeting of the Association for Computational Linguistics and the 11th International Joint Conference on Natural Language Processing. 704–718.*
*Zeqiu Wu, Michel Galley, Chris Brockett, Yizhe Zhang, Xiang Gao, Chris Quirk, Rik Koncel-Kedziorski, et al. 2021. A controllable model of grounded response generation. In Proceedings of the AAAI Conference on Artificial Intelligence. 14085–14093.*

- 提前规划骨架，再生成**：sketch to content
*Ratish Puduppully, Li Dong, and Mirella Lapata. 2019. Data-to-text generation with content selection and planning. In Proceedings of the AAAI Conference on Artificial Intelligence*

- 强化学习：**假设是基于word的MLE训练目标，只优化唯一的reference，可能导致暴露偏差问题。现有工作将减轻幻觉的指标作为强化学习的reward函数，从而减轻幻觉现象。
*Yangming Li, Kaisheng Yao, Libo Qin, Wanxiang Che, Xiaolong Li, and Ting Liu. 2020. Slot-consistent NLG for task-oriented dialogue systems with iterative rectification network. In Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics. 97–106.*
*Mohsen Mesgar, Edwin Simpson, and Iryna Gurevych. 2021. Improving factual consistency between a response and persona facts. In Proceedings of the 16th Conference of the European Chapter of the Association for Computational Linguistics. 549–562.*

- 多任务学习**: 通过设计合适的额外任务，可以达到减轻幻觉的效果。
- <strong>后处理</strong>：设计一个小模型专门用于fix幻觉错误。
*Sihao Chen, Fan Zhang, Kazoo Sone, and Dan Roth. 2021. Improving faithfulness in abstractive summarization with contrast candidate generation and selection. In Proceedings of the 2021 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies (NAACL-HLT’21). 5935–5941.*
### 可能的后续方向

- 更细粒度的幻觉评估：

- token/phrase level instead of sentence level
- 更精细的幻觉分类体系：

- Intrinsic
- Extrinsic
- 其他类别：

- 按幻觉产生的原因分类（调用知识出错，还是缺少相应知识）
- 主观/客观幻觉
- 幻觉可能和时间（temporal）有关

- <strong>知识的定义和诱导</strong>：

- 怎么知道模型是否具备某一类知识，只是没有调用好？
- 知识的定义：

- 传统工作大都将wikipedia视作知识库，但它仅仅是世界知识的很小一部分
- 如果将整个互联网当做世界知识，又不可避免的会有虚假信息的问题

- <strong>幻觉消除：</strong>

- 检索增强：互联网/外挂知识库(llama Index)
- 强化学习（RLHF）
- 知识诱导/注入
- 直接修改LLM中错误记忆的知识：Model Editing工作，如ROME，MEMIT等

### LLM时代的幻觉研究

下面针对ChatGPT时代的针对LLM的幻觉工作做简单的总结。

#### 幻觉评估

<strong>TruthfulQA</strong>


一个很重要的用于评估LLM是否能够生成符合事实的答案的QA基准，被后续的LLM工作，如GPT4采用评估。

包含了817个作者手写的问题，这些问题是精心设计，往往是模型或者人类都很容易回答错误的陈述。

作者发现：

- 与人类相比(94%)，当前较好的LLMs(GPT3)也只能诚实地回答58%的问题而不进行编造。
- 更大的模型更容易编造回答。
- 微调后的GPT3可以有效分辨是否回答是truthful的。
HaluEval benchmark


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.11747)

- Benchmark搭建**：人工标注了35,000条数据，5000条chatgpt的general query（alpaca data），30000条chatgpt的任务回复（问答、摘要、知识对话）

- 让chatgpt生成更有可能出现幻觉的文本：数据过滤，prompt工程；
- 每个任务的幻觉还有不同类型：

- QA： comprehension, factualness, specificity, and inference；
- knowledge-grounded dialogue：extrinsic-soft, extrinsic-hard, and extrinsic-grouped
- text summarization： factual, non-factual, and intrinsic

- <strong>幻觉评估</strong>：

- Chatgpt倾向于在回复中生成无法被验证的内容（幻觉），占比约11.4%
- 当前强大的LLM，如Chatgpt，都很难精准检测出文本中出现的幻觉问题
- 通过提供外部知识和增加推理步数，能够提升LLM检测幻觉的能力

<strong>ChatGPT/GPT4生成不真实回复的评估、机理</strong>


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2304.10513)

对LLM生成的不符合事实的错误的类型进行分类和统计：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a64e44ac7443.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f842558d3cd2.jpg)

定义了三个能力，可能导致幻觉的：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cb51d2c30a9e.jpg)

- 知识记忆
- 知识调用
- 知识推理
通过实验，对大模型生成可靠回复给出了一些建议：

- 提供更多的背景知识（检索）
- 提供更细粒度的背景知识（分析）
- 把问题进行分解（CoT)

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.04023)

早期的工作，包括了对ChatGPT幻觉现象的评估：

- ChatGPT有能力识别虚假信息，并能够在无法识别时回复不知道；
- ChatGPT仍然会被TruthfulQA内的问题误导；
- ChatGPT同样可能出现intrinstic/extrinsic hallucination的case；
Retrieval-augment LLM评估

Retrieval有助于显著减少LLM的幻觉现象。


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.06311)

自OSU的两个工作，主要是研究了给定retrieval reference的情况下，LLM的遵循能力。

- 前一个工作首先定义了自动评估一个reference能否支撑generation的任务，然后研究了LLMs（prompt/finetuned）的完成这一任务的能力

- automatic attribution evaluation的效果都不好
- 小的finetuned模型可以超过大的zero-shot模型
- 模型容量和评估效果并不完全正相关
- 使用额外的其他任务训练，可以提升automatic attribution evaluation的能力（QA/NLI/FC）

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_92ba64946ce2.jpg)

- 后一个工作

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.13300)

研究了给定reference情况下对LLM生成结果的影响：

- 使用一个5步走的框架进行knowledge elicitation

- parametric memory：模型内部的知识
- counter-memeory：与模型内部知识相反的内容

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5873247f8736.jpg)

- 当只有一个单一的知识源时：

- 简单的通过entity替换的counter-memory无法诱骗模型，但是让LLM自己生成的可以

- 当有多个知识来源时：

- LLM倾向于相信更流行的知识；
- LLM对于知识的顺序很敏感，倾向于相信先出现的知识；
- LLM相信更长的知识；
- LLM随大流，相信占据大多数的知识

LLM幻觉的滚雪球现象


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.13534)

本文作者认为：LLM出现幻觉现象，很多情况下并不是因为它们缺少对应的知识，而仅仅是在调用知识的过程中出错。他们发现：LLMs如果在回复一开始做出了错误的判断，那么它们随后会给出错误的解释（幻觉）。他们称这一现象为幻觉的滚雪球现象。但是，当仅给定错误的解释时，LLMs往往可以成功判断它是不正确的。这证明LLMs其实具备相应的知识，只是被早期的错误断言给误导了。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e83e4ba7ae97.jpg)

作者也探索了一些缓解幻觉滚雪球问题的方法：

- 更好的Prompt（CoT）：有效，但是CoT也存在着思维链内部的幻觉滚雪球问题。
- 解码算法：作者尝试了不同的解码算法，但并没有显著效果。
- 训练策略：构造更多的CoT训练数据，以及构造允许模型自我回溯（self-correct）的训练数据。
LLM幻觉的原子粒度评估


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.14251)

定义原子事实：仅包含一个信息的短句。

将LLM生成的内容（本文选用的内容是人物简介）分解为多个原子事实（instructGPT分解，人类校对），评估生成事实的精确度：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d91794301c0a.jpg)

人工标注常用LLMs的原子事实精确度后，发现：

- 所有LLM都会出现较为严重幻觉问题，特别是原子粒度上；
- 检索增强的LLM（perplexity AI）能够缓解事实错误；
- 在生成和罕见实体相关的回复时，LLM更容易犯错；
- 模型在生成回复的后期，更容易出现幻觉；
作者也研究了基于LLM自动评估原子事实精确度的可能性（不可能每次对新模型评估都靠人工标注）：

- 检索增强能显著提升评估的效果；
- 更大的LLM能够更好地评估。
最后，作者基于自动指标，评估了现阶段LLM的原子事实性：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_2725c3042949.jpg)

有一些有趣的发现：比如Dolly模型经常频繁提及Databricks公司，导致事实错误（因为dolly的训练语料是databricks公司员工手写的）

最后作者研究了自动利用LLMs修复事实错误的可能性，发现在原子粒度纠正以及提供检索信息，能显著提高纠正的效果。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a01181793483.jpg)

除了模型生成事实的精确度外，还应该考虑召回度（即内容中的原子事实信息尽可能多），否则LLMs可能走捷径，生成一些无意义的废话。

#### 幻觉检测&修正

事实性增强的语言模型

面向LLM的事实/幻觉问题的早期工作(2022.6)。


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2206.04624)

本文首先基于FEVER数据集构建一个FactualPrompt数据集，包含了符合/不符合事实的提示，用于诱导LLM生成符合/不符合事实的下文。

评价指标：

- 幻觉实体率：对比生成内容和Golden Knowledge中实体的重叠率；
- 蕴含率：使用额外的NLI模型，评估生成内容有多少是被golden Knowledge蕴含的；
- 生成质量评估：除了幻觉现象外，还要确保生成的效果

- 流畅度：平均困惑度；
- 多样性：distinct n-grams；
- 重复度

从多个维度评估LLM生成的事实问题：

- 模型容量：更大的模型生成结果的事实性越好
- 提示类型：不符合事实的提示更可能诱导LLM生成不符合事实的内容；
- 解码算法：带有随机性的解码算法（如Top-P）显著比贪心解码生成的内容更不符合事实；

- 基于这个发现作者还提出了一个非常简单的top-p解码算法优化，在生成的diversity和factuality中寻求trade-off：

- p随时间步衰减（后期生成的内容更可能不符合事实），每次生成一个新句子（通过检测是否生成了句号）重新初始化p，并且p的衰减可以定一个下界；

作者还提出了一种继续预训练策略来提升事实性：

- 使用更权威的数据，如Wiki来训练；
- 给每个句子加上Wiki Document的名称：作者认为这能给句子提供额外的事实信息，比如解释句子里的代词（有点玄学）
基于外部知识和自动反馈提升事实性


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.12813)

通过外挂知识库和LLM自我审视，来提升LLM生成的事实性/效果：

- 主要包含以下部分：

- LLM Agent
- 外部知识库：互联网、wiki百科等；
- 动作执行器：

- 知识检索：BM-25/Dense，通过给定prompt检索知识；
- Prompt引擎：基于用户输入/知识/历史信息/反馈信息等，构造prompt，融合信息生成新的回复；

- 策略选择器：

- 基于规则（是否通过utility模块）
- 可学习（T5-based）

- 效用检验模块：

- 打分器：用分数评估回复质量；
- 反馈器：用自然语言给出回复评估；

本质上，该系统是一个检索知识->生成回复->评估的反复迭代/决策的过程，能够通过外部知识库和检查模块，显著提升生成的各维度效果，包括事实性。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_59e4a2c521dd.jpg)

零资源黑盒LLM幻觉检测


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2303.08896)

作者认为传统的幻觉检测方法在当今LLM时代有如下的缺陷：

- 基于不确定度指标：这一类方法通过衡量LLM回复的熵/概率，来判断LLM对回复是否自信，越不自信越可能是编造的内容。但是该方法对闭源模型（如OpenAI）不友好。
- 基于事实验证指标：这一类方法需要外挂知识库，但是现在缺少涵盖所有世界知识的高质量知识库。
作者提出了SelfCheckGPT方法，核心的假设是：如果大模型非常肯定一个事实，那么它随机采样多次生成的回复，将对该事实有着近似的陈述（self-consistency）。如果多次采样，LLM都生成不同的陈述，那么很有可能是出现了幻觉。具体地，评估多个采样陈述是否一致，可以通过：1）BERTScore；2）QA-based；3）n-gram metric进行实现。

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.15852)

ETH-Zurich也有一篇类似的工作，着重关注LLM生成回复中的自相矛盾现象，包括评估、检测和消除。

零资源黑盒事实错误纠正


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.07982)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_81c8fed2eb7d.jpg)

提出了一个五步的零资源事实错误纠正流水线：

- Claim Answer抽取：从陈述中抽取关键信息；
- Question Generation：针对每个关键信息，生成一个问题；
- Question Answer：针对每个问题，将外部证据作为额外输入，进行回答；
- QA-to-claim：将QA-pair转回陈述；
- Correction scoring：额外打分器判断新的陈述是否合理。
工具增强的LLM自动纠正


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.11738)

MSRA的工作，本文允许LLM在自我检查答案正确性的过程中调用外部工具，比如知识库、搜索引擎和维基百科，从而缓解事实性和幻觉问题。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e92a923544b7.jpg)

通过推理时干预诱导LLM生成符合事实的答案


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.03341)

哈佛的工作，本文中作者提出了一种推理时干预的策略（ITI）提升LLM生成答案的事实性。

作者假设：LLMs know more than they say，LLM内部存在着隐藏的、可解释的结构，这些结构和事实性息息相关，因此可以通过干预：

- 作者探索了LLM的生成回复准确率（直接回答问题）和Probe准确率（用一个linear classifier基于中间状态选择回答）的关系，发现LLM很多情况下知道知识，但无法正确生成回复。
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1d900ffe09c2.jpg)

- ITI方法选择和事实知识紧密相关的head，进行干预，让激活值移动到truthful相关的方向，实验表明能够有效提升回复的事实性。
训练小模型后处理幻觉问题


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.14908)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_153314f449ea.jpg)

Google的工作，核心思想是用LLM自动对一个正确样本生成幻觉样本，组成平行语料，训练一个T5学会降噪：

- 根据文档、干净的陈述，利用LLM对陈述进行加噪，使其含有幻觉问题；
- 将文档和含有幻觉的文本作为输入，干净的文本作为输出，训练一个小模型用于降噪（去幻觉）
- 推理时，对给定的陈述，先使用QG模型生成一系列问题，再根据问题召回证据，将证据文档和陈述传入小模型进行幻觉的编辑和修正。
利用多智能体辩论显著提升LM的事实性和推理能力


[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.14325)

MIT&Google，利用多个智能体（LLM）相互辩论来解决事实性问题，相当于是一种变相的self-verify。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b07f53ee91f0.jpg)

人在回路的幻觉消除

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.13669)

本文提出基于人机交互，让LLM获得更好的知识-问题对齐，从而提升回复的事实性，减轻幻觉。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9d2f6682c043.jpg)

原文链接： [不关岳岳的事：大模型的幻觉问题调研: LLM Hallucination Survey](https://zhuanlan.zhihu.com/p/642648601)
