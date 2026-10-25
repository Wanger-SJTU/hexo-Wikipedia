---
title: 爱可可 AI 前沿推介(2.17)
date: "2024-02-17 00:00:00"
updated: "2024-02-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/爱可可-AI-前沿推介(2.17)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682480353
---


>  LG - 机器学习 CV - 计算机视觉 CL - 计算与语言 AS - 音频与语音 RO - 机器人

1、[CL] Chain-of-Thought Reasoning Without Prompting
2、[CL] A Human-Inspired Reading Agent with Gist Memory of Very Long Contexts
3、[CL] Generative Representational Instruction Tuning
4、[LG] DoRA：Weight-Decomposed Low-Rank Adaptation
5、[CL] How to Train Data-Efficient LLMs

摘要：无需提示进行LLM的思维链推理、基于人类启发式超长上下文要点记忆的阅读Agent、生成式表示性指令微调、权重分解低秩自适应、LLM数据高效预训练方法

#### 1、[CL] Chain-of-Thought Reasoning Without Prompting

X Wang, D Zhou
[Google DeepMind]

无需提示进行LLM的思维链推理

要点:

- 研究了大型语言模型是否可以在没有明确提示(如少样本或零样本提示)的情况下生成链式思维推理。
- 实验表明，虽然贪心解码通常无法从大型语言模型中引出链式思维推理，但在解码时探索替代的top-k词汇可以揭示语言模型内在的链式思维推理路径。
- 解码轨迹中链式思维推理路径的存在与模型对最终答案的置信度增加相关。
- 根据这一发现，提出CoT解码来从语言模型中提取具有链式思维的可靠解码路径，在推理任务上优于贪心解码。
- CoT解码在预训练数据中有充分表示的任务上效果良好，但在缺乏预训练数据的复杂合成任务上则表现欠佳，对于这类任务，提示技术可能仍然是必需的。
- CoT解码在不需要提示的情况下引出推理，因此可以评估语言模型内在的推理能力，也避免了提示技术带来的混淆。
- 实验表明，在数学、语言和符号推理基准测试中，相较于贪心解码，CoT解码极大地提高了预训练的PaLM和Mistral模型的推理性能。
动机：之前的研究主要关注通过特定的提示技术来增强大型语言模型(LLM)的推理能力，但这些方法通常需要手动进行提示工程。本文旨在探索是否可以在不进行提示的情况下，使LLM有效地进行推理。
方法：通过改变解码过程，从预训练LLM中提取出隐含链式推理路径。具体方法是通过研究前 个备选token，而不是传统的贪婪解码，发现这些序列中经常存在链式推理路径。
优势：该方法既避免了提示的混淆因素，也能评估LLM的内在推理能力。此外，研究还观察到，在解码路径中存在链式推理时，模型对解码答案的置信度更高。在各种推理基准测试中，提出的链式推理解码方法明显优于传统的贪婪解码。

一句话总结：
通过改变解码策略，从预训练LLM中提取出隐含链式推理路径，避免了提示的混淆因素，同时提高了模型的推理性能。

>  In enhancing the reasoning capabilities of large language models (LLMs), prior research primarily focuses on specific prompting techniques such as few-shot or zero-shot chain-of-thought (CoT) prompting. These methods, while effective, often involve manually intensive prompt engineering. Our study takes a novel approach by asking: Can LLMs reason effectively without prompting? Our findings reveal that, intriguingly, CoT reasoning paths can be elicited from pre-trained LLMs by simply altering the \textit{decoding} process. Rather than conventional greedy decoding, we investigate the top-kk alternative tokens, uncovering that CoT paths are frequently inherent in these sequences. This approach not only bypasses the confounders of prompting but also allows us to assess the LLMs' \textit{intrinsic} reasoning abilities. Moreover, we observe that the presence of a CoT in the decoding path correlates with a higher confidence in the model's decoded answer. This confidence metric effectively differentiates between CoT and non-CoT paths. Extensive empirical studies on various reasoning benchmarks show that the proposed CoT-decoding substantially outperforms the standard greedy decoding.
 

[https://arxiv.org/abs/2402.10200](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10200)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_890864f8f1d8.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_02288d74cc8a.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ec421e6ad2ae.jpg)

#### 2、[CL] A Human-Inspired Reading Agent with Gist Memory of Very Long Contexts

K Lee, X Chen, H Furuta, J Canny, I Fischer
[Google DeepMind & Google Research]

基于人类启发式超长上下文要点记忆的阅读Agent

要点:

- 目前的大型语言模型在文本长度和长文本处理上存在局限性。
- 提出ReadAgent，一个类似人类阅读的LLM智能体系统，主要包含以下3个步骤： 1) 分页：将长文本按自然断点分成若干页或片段。 2) 摘要：将每个页面压缩成一个短小的“要点”式摘要。 3) 查阅：在解决任务时，根据要点选择性查阅原始页面。
- ReadAgent在QuALITY、NarrativeQA和QMSum等长文档阅读理解数据集上优于检索基线。
- 它将有效上下文长度扩大了3-20倍，同时取得了更高的准确率和ROUGE得分。
- ReadAgent只需要提示一个预训练好的语言模型如PaLM或GPT-3就比较简单实现。
- 未来的工作仍需解决语言模型在文本长度和使用上的根本局限性。
动机：当前的大型语言模型(LLM)在上下文长度和处理长输入方面存在限制，而人类能阅读和理解非常长的文本。本文受到人类阅读长文本的启发，提出一种使用LLM的阅读Agent系统ReadAgent，通过实现简单的提示系统，增加了LLM的有效上下文长度，以更有效地处理长文本。
方法：所提出的ReadAgent系统通过三个主要步骤实现：(1)分割成片段，根据LLM的提示决定在连续文本中的何处暂停，形成片段；(2)摘要记忆，将每个片段压缩成更短的摘要，关联上下文信息；(3)交互查找，在给定任务和完整的摘要记忆中，决定查找哪些片段，将摘要与原始文本结合，解决任务。ReadAgent系统可以通过提示经过训练的LLM来实现。
优势：在三个长文档阅读理解任务上评估了ReadAgent系统，并与其他基线方法进行比较。结果显示，ReadAgent在所有三个任务上优于基线方法，并且能将有效上下文窗口长度扩展3到20倍。ReadAgent系统的实现简单，并且具有可扩展性和良好的性能。

一句话总结：
提出一种受人类阅读长文本启发的阅读Agent系统ReadAgent，通过使用LLM的提示功能，将有效上下文长度扩展到3-20倍，在长文档阅读理解任务上优于基线方法。

>  Current Large Language Models (LLMs) are not only limited to some maximum context length, but also are not able to robustly consume long inputs. To address these limitations, we propose ReadAgent, an LLM agent system that increases effective context length up to 20x in our experiments. Inspired by how humans interactively read long documents, we implement ReadAgent as a simple prompting system that uses the advanced language capabilities of LLMs to (1) decide what content to store together in a memory episode, (2) compress those memory episodes into short episodic memories called gist memories, and (3) take actions to look up passages in the original text if ReadAgent needs to remind itself of relevant details to complete a task. We evaluate ReadAgent against baselines using retrieval methods, using the original long contexts, and using the gist memories. These evaluations are performed on three long-document reading comprehension tasks: QuALITY, NarrativeQA, and QMSum. ReadAgent outperforms the baselines on all three tasks while extending the effective context window by 3-20x.
 

[https://arxiv.org/abs/2402.09727](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.09727)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d3ddf1fcb8a4.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_40d6e14a203d.jpg)

#### 3、[CL] Generative Representational Instruction Tuning

N Muennighoff, H Su, L Wang, N Yang, F Wei, T Yu, A Singh, D Kiela
[ Contextual AI & The University of Hong Kong & Microsoft Corporation]

生成式表示性指令微调

要点:

- 提出GRIT(生成式表示性指令微调)，将文本嵌入和文本生成统一到一个单一的模型中。
- 目前的模型只能在文本嵌入(将文本表示为向量/张量)或文本生成中表现出色，但不能两者兼顾，GRIT通过区分不同的指令，使一个单一的模型在两者上都能取得最佳效果。
- 结果模型GRITLM在文本嵌入基准测试中创造了新记录，同时也优于之前同大小的生成模型，是第一个在嵌入和生成上同时达到顶级性能的模型。
- GRIT通过嵌入和生成的数据以及各自的损失函数来训练大型语言模型，使其可以匹配专门的仅嵌入模型和仅生成模型的性能。
- 好处包括提高了效率，因为只需要一个模型处理两种任务，而不需要分开的模型。例如，在增强检索生成(RAG)中，可以在检索器和生成器之间缓存计算，因为它们是同一个模型，这加速了推理。
- 单一的模型也简化了基础设施需求，不再需要维护不同的模型。
- 大量的切片实验为嵌入和生成建模提供了见解，因果语言模型微调中，双向注意力和均值池化可提高嵌入质量，语言模型在微调前的生成表现并不能预测微调后嵌入的表现等。
动机：当前的语言模型在处理文本生成和嵌入任务时表现良好，但很少有模型能在两者之间达到最佳效果。本文旨在引入生成表示指导调整(GRIT)方法，通过使用指令来训练一个大型语言模型，使其能够同时处理生成和嵌入任务。
方法：使用生成式表示性指令微调(GRIT)方法，通过指令将大型语言模型训练为能处理生成和嵌入任务，GRIT通过使用不同的损失函数和指令来区分生成和嵌入任务，并在模型中实现统一。
优势：GRIT模型在生成任务和嵌入任务上表现出色，与其他开放模型相比，在Massive Text Embedding Benchmark(MTEB)上取得了最新的最佳性能，并在多个生成任务上超越了同等规模的模型。此外，GRIT模型的统一性能加速检索增强生成(RAG)模型，对于长文档，速度提升超过60%。同时，GRIT模型的统一性还简化了基础设施需求，减少了负载均衡、存储和服务软件的复杂性。

一句话总结：
提出生成表示性指令微调(GRIT)方法，通过使用指令训练一个统一的语言模型，使其能同时处理生成任务和嵌入任务，从而在性能、效率和简单性方面带来了多个优势。

>  All text-based language problems can be reduced to either generation or embedding. Current models only perform well at one or the other. We introduce generative representational instruction tuning (GRIT) whereby a large language model is trained to handle both generative and embedding tasks by distinguishing between them through instructions. Compared to other open models, our resulting GritLM 7B sets a new state of the art on the Massive Text Embedding Benchmark (MTEB) and outperforms all models up to its size on a range of generative tasks. By scaling up further, GritLM 8x7B outperforms all open generative language models that we tried while still being among the best embedding models. Notably, we find that GRIT matches training on only generative or embedding data, thus we can unify both at no performance loss. Among other benefits, the unification via GRIT speeds up Retrieval-Augmented Generation (RAG) by > 60% for long documents, by no longer requiring separate retrieval and generation models. Models, code, etc. are freely available at this https URL.
 

[https://arxiv.org/abs/2402.09906](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.09906)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0eabe0f0fd88.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c5abc75ca71a.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c8420d34db17.jpg)

#### 4、[LG] DoRA: Weight-Decomposed Low-Rank Adaptation

S Liu, C Wang, H Yin, P Molchanov, Y F Wang, K Cheng, M Chen
[NVIDIA & HKUST]

DoRA：权重分解低秩自适应

要点:

- 通过将权重分解成幅值和方向两个组成部分，分析了全微调(FT)和低秩自适应(LoRA)的学习模式，分析发现FT可以在幅值或方向上进行细微调整，而LoRA倾向于同步改变两者。
- 提出一种称为权重分解低秩自适应(DoRA)的新方法，将预训练权重分解成幅值和方向，并专门对方向组件进行LoRA微调。
- DoRA展现出更类似于FT的学习模式，并在各种任务和模型上持续优于LoRA，包括常识推理、视觉指令调整，以及图像/视频-文本理解。
- 与LoRA相比，DoRA不会带来额外的推理开销，因为分解后的组件可以在部署前合并回来。
- 总体而言，文章证明了DoRA相比LoRA更强大的学习能力，以及其跨语言、视觉和多模态模型的广泛适用性，权重分解分析也对FT和LoRA之间的内在差异提供了新见解。
动机：传统的参数高效微调方法存在一定的准确性差距，本文希望通过研究Fine-tuning(FT)和Low-Rank Adaptation(LoRA)之间的内在差异，提出一种新的微调方法来提高LoRA的学习能力和训练稳定性。
方法：引入一种新的权重分解分析方法，将预训练权重分解为大小和方向两个组成部分，用LoRA进行方向更新，以有效减少可训练参数的数量。
优势：通过使用所提出的Weight-Decomposed Low-Rank Adaptation(DoRA)方法，可以提高LoRA的学习能力和训练稳定性，同时避免额外的推理开销。在各种下游任务上，如常识推理、视觉指令调优和图像/视频-文本理解，DoRA始终优于LoRA。

一句话总结：
通过权重分解和方向更新，提出的DoRA方法在保持推理效率的同时，提高了Low-Rank Adaptation的学习能力和训练稳定性。

>  Among the widely used parameter-efficient finetuning (PEFT) methods, LoRA and its variants have gained considerable popularity because of avoiding additional inference costs. However, there still often exists an accuracy gap between these methods and full fine-tuning (FT). In this work, we first introduce a novel weight decomposition analysis to investigate the inherent differences between FT and LoRA. Aiming to resemble the learning capacity of FT from the findings, we propose Weight-Decomposed LowRank Adaptation (DoRA). DoRA decomposes the pre-trained weight into two components, magnitude and direction, for fine-tuning, specifically employing LoRA for directional updates to efficiently minimize the number of trainable parameters. By employing DoRA, we enhance both the learning capacity and training stability of LoRA while avoiding any additional inference overhead. DoRA consistently outperforms LoRA on fine-tuning LLaMA, LLaVA, and VL-BART on various downstream tasks, such as commonsense reasoning, visual instruction tuning, and image/video-text understanding. We will release the code and models upon acceptance.
 

[https://arxiv.org/abs/2402.09353](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.09353)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e2738e7a0e5f.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f59114a94f10.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c9b16d40054a.jpg)

#### 5、[CL] How to Train Data-Efficient LLMs

N Sachdeva, B Coleman, W Kang, J Ni, L Hong, E H. Chi, J Caverlee, J McAuley, D Z Cheng
[Google DeepMind]

LLM数据高效预训练方法

要点:

- 研究了数据高效的大语言模型(LLM)预训练方法，以优化模型质量和训练数据/计算使用量之间的权衡。
- 提出了两种新采样方法：ASK-LLM，使用LLM直接评估每个训练样本的质量和信息量；DENSITY，通过模拟数据分布最大化对多样主题/流派的覆盖。
- 在对19种采样方法和数百次预训练运行的广泛比较中，ASK-LLM和DENSITY分别成为质量和覆盖采样的最佳方法。
- 在ASK-LLM数据上训练的模型，即使删除90%的数据，其性能也始终优于完整数据集训练，同时收敛更快。DENSITY可以恢复完整数据集的性能。
- 分析显示，与困惑度过滤相比，ASK-LLM做出更细微的决定，并包含其他方法所缺乏的上下文推理。更大的LLM评分模型进一步改进了ASK-LLM。
- 结果表明，基于LLM的质量评分对数据高效预训练非常有效，这表明在低数据环境下，质量应优先于覆盖。
动机：大规模语言模型(LLM)的训练成本高昂，本文研究数据高效的预训练方法，旨在优化模型质量和训练资源/数据消耗的帕累托前沿。
方法：提出两种数据选择方法：ASK-LLM 使用零样本推理评估训练样例质量，DENSITY 采样通过建模数据分布来选择多样化样本。
优势：ASK-LLM 和 DENSITY 方法在各自的类别中表现最佳。ASK-LLM 可以训练出更好的模型，即使删除了高达90%的训练样例；而 DENSITY 采样可以恢复全数据的性能，且使用 ASK-LLM 数据训练的模型在收敛速度上比全数据训练快达到70%。

一句话总结：
提出基于质量评估和多样化采样的数据高效预训练方法，通过实验证明在大规模语言模型的训练中，质量评估方法能够显著提升模型性能，而多样化采样方法可以在保证性能的前提下节省数据和训练时间。

>  The training of large language models (LLMs) is expensive. In this paper, we study data-efficient approaches for pre-training LLMs, i.e., techniques that aim to optimize the Pareto frontier of model quality and training resource/data consumption. We seek to understand the tradeoffs associated with data selection routines based on (i) expensiveto-compute data-quality estimates, and (ii) maximization of coverage and diversity-based measures in the feature space. Our first technique, ASK-LLM, leverages the zero-shot reasoning capabilities of instruction-tuned LLMs to directly assess the quality of a training example. To target coverage, we propose DENSITY sampling, which models the data distribution to select a diverse sample. In our comparison of 19 samplers, involving hundreds of evaluation tasks and pre-training runs, we find that ASK-LLM and DENSITY are the best methods in their respective categories. Coverage sampling can recover the performance of the full data, while models trained on ASK-LLM data consistently outperform full-data training—even when we reject 90% of the original dataset, while converging up to 70% faster.
 

[https://arxiv.org/abs/2402.09668](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.09668)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_40289c5e319a.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1fc7fc1ada08.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b5f243c5ae69.jpg)

#### 另外几篇值得关注的论文

#### [CL] Data Engineering for Scaling Language Models to 128K Context

[https://arxiv.org/abs/2402.10171](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10171)
研究了将语言模型上下文长度扩展到128K的连续预训练方法，重点在于数据工程。本文认为长上下文建模，特别是在任意输入位置利用信息的能力，主要已经通过大规模预训练获得，并且这种能力可以通过轻量的连续预训练在训练期间看到的上下文长度显著超过训练期间看到的上下文长度(如4K到128K)的适当数据混合上进一步扩展。研究了连续预训练所需的数据的数量和质量：(1)对于数量，本文表明5亿到50亿个标记足以使模型在128K的上下文中从任何位置检索信息；(2)对于质量，结果同样强调了领域平衡和长度上采样。通过对这些数据进行连续预训练，可以有效且经济地将语言模型的上下文长度扩展到128K，超过了强大的开源长上下文模型，并接近GPT-4 128K等前沿模型的性能。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8b12ae20116d.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6f8eb04f87c0.jpg)

#### [CL]  OpenMathInstruct-1: A 1.8 Million Math Instruction Tuning Dataset

[https://arxiv.org/abs/2402.10176](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10176)
OpenMathInstruct-1是一个包含180万个问题-解决方案对的数学指令数据集，通过生成流行的数学推理基准问题的代码解释器解决方案来构建。该数据集填补了闭源和开源语言模型之间的差距，并取得了竞争性的性能。OpenMathInstruct-1比现有数据集大4倍，并以宽松的许可证发布。通过精调模型的性能证明了数据集的质量。本文还讨论了训练数据的合成和使用少样本提示来提高覆盖范围的方法。本文公开发布了代码、模型和数据集，以支持开源工作的发展。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c2c8d91a6186.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8dce4a86a436.jpg)

#### [LG] Self-Play Fine-Tuning of Diffusion Models for Text-to-Image Generation

[https://arxiv.org/abs/2402.10210](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10210)
介绍了一种名为SPIN-Diffusion的自弈微调算法，用于扩展扩散模型。通过与早期模型竞争，促进了迭代的自我改进过程。与传统的监督微调和强化学习策略相比，该方法显著改善了模型性能和对齐性。实验结果表明，SPIN-Diffusion在人类偏好对齐和视觉吸引力方面优于现有的监督微调方法，使用更少的数据即可超越基于强化学习的方法。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_af673242138a.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_feaea310ff3f.jpg)

#### [LG] BitDelta: Your Fine-Tune May Only Be Worth One Bit

[https://arxiv.org/abs/2402.10193](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10193)
BitDelta是一种能够将微调模型的权重压缩到1bit的简单方法，不仅揭示了微调过程中添加信息的潜在冗余性，还对微调模型的服务和存储具有重要影响。通过使用高精度基础模型和多个1bit的增量，BitDelta大幅减少了GPU内存需求，提高了多用户设置下的生成延迟。通过对Llama-2和Mistral模型系列进行实验证明，BitDelta在所有测试设置中都显示出最小的性能下降。这一发现打破了以往对微调模型信息增量的认知。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7c971bcf6ccd.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_610391445288.jpg)

#### [LG] Hierarchical State Space Models for Continuous Sequence-to-Sequence Modeling

[https://arxiv.org/abs/2402.10211](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.10211)
Hierarchical State Space Models (HiSS)提出一种用于连续序列预测的新技术。HiSS利用堆叠的结构化状态空间模型来创建时间层次结构，在真实世界的传感器数据集上的性能比最先进的序列模型提高了至少23%。这种方法在处理非线性传感器、外部变量和数据相关漂移方面尤为有效。HiSS还展示了对较小数据集的高效扩展性，并与现有的数据过滤技术兼容。发布了CSP-Bench，一个用于处理真实世界传感器数据的连续序列预测的基准数据集，并提供了代码、数据集和视频供进一步探索。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3dace1606eba.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ef8cd17fe1ba.jpg)
