---
title: MiroThinker：scale up 更多的交互轮次
date: "2026-01-23 00:00:00"
updated: "2026-01-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/MiroThinker-scale-up-更多的交互轮次/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1998096980543562428
---


MiroThinker 用 30B 模型跑出了 SoTA 的 Agentic 性能，并提出了 Agentic 时代一个新的 scale up 维度：交互轮次。本文结合其技术报告和代码，从上下文工程、数据合成、模型训练三个角度，来看 MiroThinker 是如何打造一个 SoTA 的 Agent 系统的。

### 上下文工程

在 Agent 系统中，随着工具调用轮次的不断增加，将会有越来越多的冗余信息挤占上下文窗口。上下文工程（Context Engineering），核心就是设计合理的上下文管理机制，将不多不少最合适的上下文（just the right infomation, karpathy’s post）给到模型。

MiroThinker 采用的是最常见的的 ReAct 范式：给定一个查询 q" role="presentation">qq，模型交替进行思考、工具调用、得到工具结果的循环，直到得到最终的回复输出。我们先来简单定义一下符号。

$第 t" role="presentation">tt 轮开始时，agent 的上下文窗口中是这样一条轨迹：Ht={(T1,A1,O1),&#x2026;,(Tt&#x2212;1,At&#x2212;1,Ot&#x2212;1)}" role="presentation">Ht={(T1,A1,O1),…,(Tt−1,At−1,Ot−1)}H_t=\{(T_1,A_1,O_1),\dots,(T_{t-1},A_{t-1},O_{t-1})\}，其中 Ti,Ai,Oi" role="presentation">Ti,Ai,OiT_i,A_i,O_i 分别表示模型思考、工具调用和工具结果（观察）。在第 t" role="presentation">tt 轮，模型首先进行思考 Tt=f&#x03B8;(q,Ht)" role="presentation">Tt=fθ(q,Ht)T_t=f_\theta(q,H_t)，基于思考结果决定调用何种工具并给出对应参数 At=&#x03C0;&#x03B8;(q,Ht,Tt)" role="presentation">At=πθ(q,Ht,Tt)A_t=\pi_\theta(q,H_t,T_t)，随后会得到一个来自环境的工具调用结果 Ot=tool(At)" role="presentation">Ot=tool(At)O_t=\text{tool}(A_t)，这样第 t" role="presentation">tt 轮就完成了，拼起来即得到第 t+1" role="presentation">t+1t+1 轮的起始轨迹 Ht+1={(T1,A1,O1),&#x2026;,(Tt&#x2212;1,At&#x2212;1,Ot&#x2212;1),(Tt,At,Ot}" role="presentation">Ht+1={(T1,A1,O1),…,(Tt−1,At−1,Ot−1),(Tt,At,Ot}H_{t+1}=\{(T_1,A_1,O_1),\dots,(T_{t-1},A_{t-1},O_{t-1}),(T_t,A_t,O_t\}。$

这样迭代循环进行思考、工具调用、得到工具结果的循环，直到模型的回复中不在包括工具调用 At=&#x2298;" role="presentation">At=⊘A_t=\oslash，此时模型会基于已有的轨迹结果，生成最终回答 y=g&#x03B8;(Ht)" role="presentation">y=gθ(Ht)y=g_\theta(H_t)。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1f4b11ad3c5c.jpg)

#### 工具集

可用的工具集，也是模型上下文的重要部分，MiroThinker 为 Agent 提供了常用的工具，主要包括 Linux 沙盒环境、信息检索能力，以及其他的多模态处理、思考等工具。

Miro 使用 e2b Linux 沙盒为 Agent 提供隔离的环境，来运行命令或代码。Agent 可以在沙盒中执行 `create_sandbox`、`run_command`、`run_python_code` 等操作，也支持本地与沙盒环境的文件上传下载 `upload_file_from_local_to_sandbox`、`download_file_from_sandbox_to_local` 和网络文件下载 `download_file_from_internet_to_sandbox`

信息检索方面，Miro 使用了谷歌搜索 `google_research` 和网页内容抓取 `scrape_and_extract_info` 两个工具，其中网页抓取工具还会内置一个轻量的 LLM，来提取与 agent 指定主题相关的内容，这样可以提高搜索结果的相关性，并降低无关内容对上下文窗口的占用。

除了这两大类之外，Miro 还为 Agent 提供了视觉、音频处理 `tool-vqa(-os)`、`tool-transcribe(-os)` 来处理多模态的内容，以及可以调用外部模型辅助思考推理 `tool-reasoning(-os)`。这些能力默认使用 OpenAI 或 Anthropic 的服务，如果是 `-os` 则使用开源模型。此外，还通过 markitdown 提供了将其他类型的文档转换为 Markdown 的工具。

作为一个通用 Agent，基本上常用就是这些工具，Miro 通过 MCP 的形式提供。具体可以参阅 GitHub 相关仓库：[MiroFlow Tools](https://link.zhihu.com/?target=https%3A//github.com/MiroMindAI/MiroThinker/tree/878d394e03d610499ac7a387000c95c0edcd1829/libs/miroflow-tools)。

#### 上下文管理

上下文管理是 Agent 系统的核心，Miro 提到了两种上下文管理的策略，对工具调用结果进行修剪。

第一个上下文管理的策略，是<strong>只保留最近的工具结果</strong>。在标准的 ReAct 范式中，所有的工具调用结果都会保留在消息历史中，这会占用大量的上下文空间，尤其是在 Research 类 Agent 中，工具结果中包含大量长篇幅的召回文档，如果不作处理，很快上下文空间就占满了。Miro 认为，在实际中模型的下一个动作其实主要就取决于最近几次工具调用的结果，很久之前的工具结果一般都没什么用了。因此，Miro 会只保留最近 K 次的工具结果，对久远的轮次，只保留思考 T_i 和工具调用 A_i，而丢掉工具结果 O_i。从而，历史轨迹为： 

 $\hat{H}_t=\{(T_i,A_i,\hat{O}_i)\}_{i=1}^{t-1},\quad \hat{O}_i\triangleq \begin{cases} O_i\quad i\ge K-1 \\ \oslash \quad\ \ \text{otherwise} \end{cases} \notag \\ $

保持完整的 thinking 和 action 的轨迹，保留最近的工具结果，这样就能在保存完整思路的同时，节约上下文空间，从而实现更多轮的工具调用。在实际[代码](https://link.zhihu.com/?target=https%3A//github.com/MiroMindAI/MiroThinker/blob/878d394e03d610499ac7a387000c95c0edcd1829/apps/miroflow-agent/src/llm/base_client.py%23L202-L218)中，会将之前几轮的工具结果替换为一句 `Tool result is omitted to save tokens.`。

第二个上下文处理的策略，是<strong>截断过长的工具结果</strong>。比如在沙盒中执行命令或代码的工具，有时会返回超级长的信息，大部分是无用的，Miro 会对超过设定长度的工具结果进行截断，并加一个 `[Result truncated]` 提示。[相关代码](https://link.zhihu.com/?target=https%3A//github.com/MiroMindAI/MiroThinker/blob/878d394e03d610499ac7a387000c95c0edcd1829/apps/miroflow-agent/src/io/output_formatter.py%23L119-L120)。

两个简单的策略，但很有效，最终可以在 256K 的上下文窗口中执行多达 600 次工具调用。

### 数据构建

为了训练更强的 Agentic 模型，Miro 构建了一个大规模的合成数据集。该数据集包括两个部分：1. 多文档 QA，2. Agent 轨迹合成，从而使得模型能够提升事实定位和推理能力。

#### 多文档 QA 数据合成

Miro 设计了一个问答数据合成 pipeline，将相互关联的网页文档转换为复杂的多跳问答对。整个流程分为多个阶段，具体如下所述。

<strong>文档数据构建</strong> 首先基于 Wikipedia、CommonCrawl 这种事实可靠且存在丰富超链接的互联网语料库，构建文档数据库。只保留文档页面中的超链接，去除其他文本内容，这样就构建了多文档的推理链的基础。并通过元数据提取+主题建模，将文档分类到广泛的知识领域中，方便在后续阶段支持按类别采样。

<strong>文档采样与图构建</strong> 首先从语料库中采样文档节点，在此过程中需要保持不同类别的均衡，来保证不同领域的知识都有被覆盖到。根据采样到种子文档的内部超链接，构建一个知识图谱。具体来说，对每个文档随机选择一个内部超链接，多次递归，从而构建出一个相关文档的子图。

<strong>文档合并</strong> 构建文档图后，将每个文档转换为 Markdown 格式并进行链接剪枝，移除所有指向所选子图之外文档的超链接，确保整合后的文章仅在当前上下文中保持连贯的引用。然后将预处理后的文档连接成一篇涵盖多个相关主题的综合文章，同时通过保留的内部引用保持逻辑流畅性。

<strong>事实提取</strong> 对于构建图中的每个文档，识别出其中与种子文档确立的主题相关的关键事实，确保收集的事实构成一个连贯的知识网络，而非孤立的信息片段。优先考虑那些需要跨文档推理才能发现或验证的事实，从而为那些无法仅根据单一文档解答的问题奠定基础。这些提取出的事实共同代表了回答我们数据集中复杂问题所需的多跳知识。

<strong>约束混淆</strong> 为了构建更困难的推理场景，对提取到的事实，会通过将其转换为间接的表述来进行混淆。具体的混淆策略根据信息的类型而定：对于时间和空间的信息，会将转换为更宽泛的表达（如 March 15, 2023 → in the spring of the 2020s、Paris → a European capital），而其它的实体或概念则会通过使用相关属性或上下文描述的间接引用来表达。这样就能迫使模型进行多步相关推理，整合多个信息源中的知识，而非简单地依赖直接的事实检索。

<strong>问题生成</strong> 最后，让一个 LLM 来生成问题。模型需要通过在事实库里选择、组合多条混淆约束，生成多样、多领域、且需要综合多个不同文档中信息的问题，保证生成的问题真的需要多跳推理，而不是简单的模式匹配或单文档检索就能回答。

这么复杂的数据合成流程，核心就是想<strong>要构建复杂、多跳的任务。Agent 不仅需要简单的信息检索和总结，还需要对多轮、多文档中的信息进行深入的理解和推理</strong>，才能正确地回答这些问题。

#### Agentic 轨迹数据生成

为了生成高质量且多样的 Agentic 轨迹，Miro 的轨迹数据生成集成了多种 agent 范式、工具调用机制和 SoTA 的 LLM。

- <strong>智能体范式</strong>：包括经典的 <strong>ReAct 单智能体</strong>以及支持多智能体协作的 <strong>MiroFlow 框架</strong>。
- <strong>工具调用机制</strong>：同时支持结构化 <strong>Function Calling</strong> 与更灵活的 <strong>Model Context Protocol (MCP)</strong>，使采样轨迹更贴近真实人机交互模式。
- <strong>驱动模型</strong>：集成 GPT-OSS、DeepSeek-V3.1 等多种先进模型进行轨迹生成，避免单一模型偏差，提升数据多样性与覆盖度。

#### 开源数据

除了合成数据外，Miro 还使用了一些开源数据集，包括 MuSiQue、HotpotQA、WebWalkerQA-Silver、MegaScience、TaskCraft、QA-Expert-Multi-Hop-V1.0、OneGen-TrainDataset-MultiHopQA、WikiTables、WebShaper、WebDancer、Toucan-1.5M。只保留数据集的 QA 对，然后用上述介绍的 Agentic 轨迹合成路径来生成数据。

同时，为了保持模型的通用对话能力，还使用了 AM-Thinking-v1-Distilled 和 Nemotron-Post-Training-Dataset 等后训练数据，来保证通用的推理能力和对话格式。

### 训练 Pipeline

MiroThinker 基于 Qwen 2.5、3模型，进行 SFT、DPO、RL 三阶段的后训练来强化 Agentic 能力。

#### Agentic SFT

$如前所述，构建 SFT 数据集 \mathcal{D}_\text{sft}=\{(x_i,H_i\}_{i=1}^N，其中 x_i 是任务要求。H_i 是专家轨迹，包含了一系列模型思考、工具调用动作和观察的三元组 \{T,A.O\}。$

即使是使用最强的模型，在生成的 SFT 原始数据中，也会有一些噪声，比如重复、错误的工具调用等。这里 Miro 也采用了严格的数据过滤和修复，保证数据质量。

在模型训练时，每条轨迹数据本质上就是 user 和 assistant 之间的一组多轮对话，user 给出任务要求 x 和所需工具执行的结果 O_t，assistant 则是不断进行思考推理 T_t，并按需调用工具 A_t。训练时工具并不会真的执行，而是直接给出数据中预先记录的结果。

在 Agentic SFT 中，我们只对模型输出的思考过程 T 和工具调用 A 计算损失： 

 $\mathcal{L}_\text{SFT}(\theta)=-\mathbb{E}_{(x,H)}\left[\sum_{t=1}^{T_H}\log\pi_\theta(T_t,A_t|x,H_{$

#### Agentic DPO

训练的第二阶段是采用 DPO 来精调模型的决策能力，所用偏好数据是由 SFT 后的模型生成得到。DPO 的训练需要任务指令 x 和对应的偏好数据 H^+,H^-，其损失函数为：

 \mathcal{L}_\text{DPO}(x,H^+,H^-)=-\log\sigma(\beta[\log\pi_\theta(H^+|x)-\log\pi_\theta(H^-|x))-(\log\pi_\text{ref}(H^+|x)-\log\pi_\text{ref}(H^-|x))])\notag \\ 

超参数 \beta 用于调控对参考模型 \pi_\text{ref} 的偏离程度。在 Miro 的偏好训练阶段，整体损失是在 DPO 损失的基础上再加上偏好正样本的 SFT 损失： 

 $\mathcal{L}_\text{PO}(\theta)=\mathbb{E}_{(x,H^+,H^-)}[\mathcal{L}_\text{DPO}(x,H^+,H^-)]+\lambda\mathcal{L}^{(+)}_\text{SFT}(\theta) \notag \\ $

#### Agentic RL

最后一个阶段的训练是强化学习，通过交互和探索，使模型模型适应多样的真实世界环境。Miro 采用了 GRPO 算法， 且强调是完全的 on-policy 算法，每次 rollout 出的轨迹仅更新模型一次。

<strong>环境搭建</strong> 搭建了丰富的工具组（就是上面提到的网络搜索、网页抓取、总结、Linux 沙盒、Python 代码执行等工具），可以支持上千并发的 agentic rollout。还使用 LLM  Judge，来验证 Agent 的最终结果是否正确。

<strong>流式 rollout 加速</strong>  不同于 math、reasoning 等单轮的 RL 任务，agentic RL 需要 LLM 与环境进行多轮交互，尤其是 Miro 致力于实现交互轮次的 scaling，通常可达上百轮的交互。这导致不同轨迹的完成时间呈现严重的长尾性。Miro 将 rollout 实现为，每个 agent 进程以流式方式从任务队列接收 prompt，直到收集到足够多的完整轨迹以完成此批次的任务。所有未完成的任务都会被推回任务队列，以供下一次迭代使用。

<strong>奖励设计</strong>  Miro 的奖励包括正确性和格式两部分：R(x,H)=\alpha_cR_\text{correct}(H)+\alpha_fR_\text{format}(H) 。

<strong>轨迹过滤</strong> 为了保证训练数据质量，Miro 过滤掉了有噪声的正确轨迹和无关紧要的错误轨迹。因为这些轨迹数据反映的都不是模型能力的问题，而是环境不稳定的问题。

- 具体来说，对于正确的轨迹，过滤掉带有明显异常行为的样本，比如连续的 API 调用失败、统一动作冗余的重试、环境超时等，
- 对于错误的轨迹，则会丢弃因简单的格式问题、无意义重复循环的工具调用、过早终止的样本。
$<strong>训练目标</strong> GRPO 通过对每个 prompt 采样多条轨迹，计算相对组内平均水平的优势，来优化策略模型。具体来说，对于每个指令 x，使用当前模型 \pi_\theta 在线地采样 G 条样本 \{H_1,H_2,\dots,H_G\},\ H_i=\{(T_{i,t},A_{i,t},O_{i,t})\}_{t=1}^{T_i}。轨迹 H_i 的优势为： $

 $$\hat{A}_i=R(x,H_i)-\frac{1}{G}\sum_{j=1}^R(x,H_j)  \notag \\ $$

 GRPO 训练目标最大化期望优势的同时，用 KL 约束策略模型与参考模型的差异： 

 $\mathcal{L}_\text{GRPO}(\theta)=\mathbb{E}_{x\sim \mathcal{D}}\mathbb{E}_{H\sim\pi_\theta(\cdot|x)}[\hat{A}(x,H)\cdot\log\pi_\theta(H|x)-\beta_\text{KL}\cdot D_\text{KL}(\pi_\theta(\cdot|x)||\pi_\text{ref}(\cdot|x))] \notag \\ $

### 实验

MiroThinker 在 BrowseComp、HLE、GAIA 等多个数据集上进行了评估，取得了 SoTA 的性能，就不一一贴了。值得关注的是这样一张图，展示了 MiroThinker 在 scale up 交互轮次上的效果，以及对应的性能提升。

下图第一行，展示的是轮次的分布，明显 RL 模型比 SFT 模型分布更靠右，即 RL 后模型倾向于用更多轮次来完成任务。第二行，展示的是任务完成的累积分布，可以看到，RL 模型分布更靠右，这也是说明 RL 模型会在更多的轮次后完成任务。另外可以看到，RL 模型的 Acc 比 SFT 模型在四个 benchmark 上普遍高了 10 个点左右。<strong>也就是说，Miro 通过 DPO 和 RL 训练成功地引导模型在交互轮次的维度 scale up，用更多的轮次去全面地收集信息、验证结果，并且随着轮次的增多，也真的大幅提升了最终的任务成功率。验证了 interact scale up 的有效性</strong>。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9833066cd2e9.jpg)

### 局限性

作者在最后提到了目前 MiroThinker 的几个问题，可以作为未来的优化方向。最关键的，是工具调用的质量/效率问题。虽然 RL 训练后，模型调用的工具更多，scale up 交互轮次也确实能提高 agent 的最终性能，但是工具调用的质量还有问题，有相当一部分工具调用带来的贡献其实不大，所以说，还可以进一步对工具调用的质量和效率进行优化。

此外，作者还提到了过长的 CoT、语言混杂、沙盒工具使用能力差等问题，也有待进一步改进。

### 总结

MiroThinker 是从数据构建、后训练到上下文工程，完整开源的一个 Agentic 系统，实测表现也确实不错。提出的 interact scaling，小参数模型可以通过更多轮次的交互来弥补自身参数不足和知识缺失，是一个有意思的角度。另外，多跳检索数据构建的思路也值得参考，引导模型对多文档进行深度的理解和推理，而非仅仅是对检索信息的简单聚合。
