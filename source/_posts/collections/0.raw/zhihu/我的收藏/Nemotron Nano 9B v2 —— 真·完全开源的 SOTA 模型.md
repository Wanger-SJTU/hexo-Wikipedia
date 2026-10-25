---
title: "(2 条消息) Nemotron Nano 9B v2 —— 真·完全开源的 SOTA 模型"
date: 2025-08-28
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1944321797139985921
---

NVIDIA 近日完全开源了 **Nemotron Nano 9B v2** 模型，不仅释出了模型权重，还公开了训练数据及数据生成方法。仅从基准测试成绩来看，其表现已超过 **Qwen3 8B**。在架构设计上，Nemotron Nano 9B v2 采用 **Mamba 与 Global Attention 的混合方案**，实现了比 Qwen3 8B 更高的推理吞吐量。本文将对该模型的数据生成流程与训练流程进行系统梳理与总结。

[https://arxiv.org/pdf/2508.14444#page=1.53arxiv.org/pdf/2508.14444#page=1.53](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2508.14444%23page%3D1.53)

![](asset/img_15f8c71de645.jpg)

也可访问由 GPT-5 生成的阅读笔记

[https://chatgpt.com/s/t_68afaab6f3708191aa4ad91c821233d9](https://link.zhihu.com/?target=https%3A//chatgpt.com/s/t_68afaab6f3708191aa4ad91c821233d9)

### 一、总体流程概览（一句话）

预训练数据由**高质量爬取（Nemotron-CC v2）+ 专门的数学提取管道 + 大规模 GitHub 代码 + 合成 SFT/学术/长上下文 QA 数据**构成；对这些数据做**多级去重、质量分类、许可/安全过滤与 LLM 去污染**；在预训练后再用约 **80B（SFT）＋总计约 90B（post-training）** 的合成/生成数据做多阶段 SFT / DPO / GRPO / RLHF；最后在蒸馏/剪枝阶段再次组合不同数据（pre vs post）进行 KD。有关总体规模与训练安排见引言与 §2–§3。

### 二、预训练（curated）数据管线（详细步骤）

下面按数据类别分别说明 **输入来源 → 预处理/校验 → 过滤/去重 → 输出数据集**。

### 2.1 英文 Web Crawl（Nemotron-CC-v2）

- **输入来源**：Common Crawl （论文中明确加入了额外 8 个快照：CC-MAIN-2024-33 … CC-MAIN-2025-13），并加入 CC-NEWS（到 2025-04-23）作为补充知识源。** 
- 预处理/质量分类**：** 

-  使用 Nemotron-CC 的质量分类器将爬取文本分为多类：`crawl-medium`, `crawl-medium-high`, `crawl-high`, `syn-crawl-high`（合成质量的爬虫衍生）。论文按照质量为不同来源设定不同权重。
 

- 去重**：** 

-  CC-NEWS 和主库都做全局的 fuzzy 去重**（全局模糊去重）；总体去重采用 MinHash/LSH 等模糊散列方法（详见后文工具段落）。**

- 输出**：Nemotron-CC-v2（作为预训练集合的一部分，集合总量在预训练集合中）并被收录到 Nemotron-Pre-Training-Dataset 集合。

### 2.2 多语种爬取（15 种语言）

- **目标语言**：阿拉伯语、丹麦语、德语、西班牙语、法语、意大利语、葡萄牙语、荷兰语、波兰语、瑞典语、泰语、中文、日语、韩语、俄语。** 
- 快照**：使用三个 Common Crawl 快照：CC-MAIN-2024-51、CC-MAIN-2025-08、CC-MAIN-2025-18。** 
- 过滤**：由于缺乏多语种模型级质量分类器，采用**启发式过滤**（heuristics），并对某些语言禁用了会产生高误报的过滤器（即针对每种语言调校启发式规则）。去重采用与英文相同的策略。

### 2.3 数学（Math）高保真提取管线 ——（**非常关键**，步骤化）

论文给出专门管道，重点在保留数学符号、表达式与代码结构（传统工具会丢失或扭曲）：

- **起始 URL 集合**：汇集已有 math 相关数据集中的 URL 列表（例如 InfiMM-WebMath、OpenWebMath、FineMath、MegaMath 等）作为种子 URL 列表。** 
- 重新抓取（re-fetch）**：从 **98 个 Common Crawl 快照（2014–2024）** 重新抓取这些 URL 的原始 HTML。** 
- 渲染**：用 **lynx（text-based browser）** 渲染页面以保留版式和数学结构（避免 JS 渲染导致结构丢失）。** 
- LLM 清洗与标准化**：用 **Phi-4（14B）** 对渲染文本做去除 boilerplate、将符号/记法规范化为 LaTeX、修正不一致之处（自动规范化）。** 
- 质量分类**：用 **FineMath classifier**（引用自 Allal et al., 2025）筛选保留高质量文档。** 
- 去重**：对保留样本做**模糊去重（MinHash＋LSH）**，使用 NeMo-Curator 框架去实现。** 
- 去污染**（decontamination）：用 **LLM Decontaminator**（Yang et al., 2023）进一步清洗可能的测试集/敏感数据泄露。** 
- 产出数据集**：** 

- Nemotron-CC-Math-3+**：133B tokens（更大但质量分布参差）。** 
- Nemotron-CC-Math-4+**：52B tokens（从 3+ 中挑选得分最高的子集）。** 这两个集合在数学/代码/一般测试上显著提升表现。
 

### 2.4 代码（GitHub）管线（多阶段）

- 来源**：全部来自 GitHub（论文强调“所有源代码来自 GitHub”）。** 
- 许可过滤**：** 

-  使用类似 BigCode 的许可检测流程，但接受的许可更严格（更少）**；即移除不允许或可疑的许可文件。具体许可过滤规则见论文附录（Appendix A）。** 

- 去重**：** 

- 精确去重**（文件哈希）+ **模糊去重（MinHash LSH）**（因为代码在多个 repo 中完全复制很常见）。** 

- 注释/标注与启发式过滤**：** 

-  对每个文件进行注释（metadata、语言、行数、复杂度等）并用 OpenCoder 的启发式规则过滤掉“低价值 / 有害 / 垃圾”文件。
 

- 产出**：Nemotron-Pretraining-Code-v1（含多语言 code Q&A 数据，11 种编程语言）

### 2.5 学术/长文档（academic / long coherent docs）

-  对于学术文章与长文档，论文把这些视为“长上下文 seed”并在后续做长上下文合成（见 §2.6）。学术数据也被用于生成 long-context QA（下面单列说明）。

### 三、合成（synthetic）数据流与 SFT-style 数据生成（详细步骤）

论文在预训练之外，进行了大量合成数据生成来补强数学、STEM、基础推理、长上下文和 SFT 风格数据。下面按类别细分，并写明生成器、prompt、后处理、产量。

### 3.1 STEM / 数学问题合成（用于 SFT）

- **种子**：88.6k 个问题（来自 GSM8K、MATH、AoPS、Stemez2，以及开放课本 OpenStax/Open Textbook Library 等）。对教材中题目做抽取。** 
- 提取器**：使用 **Qwen2.5-VL-72B-Instruct** 从教科书练习区抽出问题（包含规则：删除题号、跳过需图像理解的问题、把公式格式化为 LaTeX）。随后对抽取结果**人工校正 OCR 错误**并删除不自包含题目（例如引用章节示例的题）。** 
- 扩展/变体合成**：用 **Qwen3-30B-A3B** 与 **DeepSeek-V3** 进一步合成类似问题与对应选项/答案。对每一题，先生成题目再用 DeepSeek-V3 生成 chain-of-thought (CoT)，最后用**多数投票**保留最终答案一致的样本。**产量**：DeepSeek-V3 生成约 4B tokens，Qwen3-30B 生成约 4.2B tokens（论文给出精确数字）。** 

### 3.2 Fundamental Reasoning SFT-style（FR-SFT）

- 输入**：把公开的 LSAT、LogiQA（改编）与 AQuA-RAT 等逻辑/读解/代数题目作为种子。** 
- 生成器**：用 DeepSeek-V3 与 Qwen3-30B-A3B 生成更多相似题目与对应的 CoT（生成链式思维并保留最终答案）。后处理做多数投票以保障答案一致性。最终产出的 FR-SFT 被用于替换部分 Common Crawl（论文在一组实验中把 5% 的 100B tokens 分配给合成 FR-SFT，并报告了性能提升）。

### 3.3 长上下文（Long-context）合成（Phase LC）

- **做法**：** 

-  从学术/长文档中选取 >32k tokens 的文档作为 seed。将文档分为 1,024 token 的块。
 
-  随机选择 10% 的块，用 Qwen-2.5-72B-Instruct** 生成基于该块的 QA 对（生成问题 + 回答）。** 
-  将这些 QA 对拼接并附加回原文末尾，形成“带问答的长文档样本”（用于训练 long-context 能力）。
 

- 规模与训练策略**：** 
-  Phase LC 做 continuous pretraining（CPT）使用 512k 的上下文长度，总计 Phase LC 为 18.9B tokens**（论文明确列出该数字）。合成数据占 Phase LC 的 20% 权重，其余按 Phase-3 比例等比例下降。该做法能显著提升 RULER（128k）分数。

### 3.4 多语种合成（post-training 的翻译策略）

- **方法**：对 English post-training 数据进行**逐行翻译**（line-by-line），跳过不可翻译的 code 段；使用“严格括号格式”以便可靠抽取；用语言识别过滤掉 off-target 翻译。此过程是为避免 LLM 在长上下文翻译时的幻觉和质量衰落。

### 3.5 Tool-calling / API 模拟合成

- **来源 Prompts**：xlam-function-calling-60k、glaive-function-calling-v2、NVIDIA-When2Call 等。** 
- 生成器 / 交互架构**：** 

-  使用 Qwen3-235B-A22B** 扮演三角角色（User-Agent、Assistant-Agent、API-Server-Agent），并配上随机 persona（Nemotron-Personas）来丰富对话。生成单轮、多轮与多步工具调用场景。API-Server-Agent 模拟参数校验并返回错误或正确输出。通过轻量规则验证层（rule-based verifier）只保留成功轨迹。

### 四、后处理：去重、去污染、许可与安全过滤（具体方法）

- **去重（deduplication）**：** 

- 精确去重**：哈希（用于代码文件等容易完全重复的样本）。** 
- 模糊去重**：MinHash + LSH（用于网页、数学文档）并通过 NeMo-Curator 框架执行模糊去重。** 

- 去污染（decontamination）**：使用 LLM Decontaminator（Yang et al., 2023）来检测并剔除可能与评测集重合或敏感的文本。数学、代码与通用爬虫数据均通过该流程进一步清洗。** 
- 许可检测（代码）**：基于 BigCode 的检测流程，但更严格——只接受明确信息开放且许可允许训练的文件类型；其余剔除或单独记录（详见附录）。** 
- 安全过滤（后训练 SFT）**：** 

-  Safety prompts 来自 Nemotron Content Safety Dataset V2、HarmfulTasks、RedTeam2K、gretel-v1；responses 用 DeepSeek-R1 生成；再通过 guard models（门控模型）做二次校验，确保生成回应安全合规。
 

### 五、数据混合策略与训练阶段（Curriculum）

- 三阶段数据混合（Phase 1 → Phase 2 → Phase 3）** 的做法：** 

-  Phase 1：强调多样性（更多爬虫和中等质量数据）。Phase 2/3：逐步偏向高质量 curator 数据（如 Wikipedia、syn-crawl-high、math、code-sft 等）。在训练进度中在 60% 点** 切入 Phase 2，**90% 点** 切入 Phase 3。** 

- 每阶段数据配比（论文 Figure 3，关键数值）**（我把每个 phase 的主要类别与百分比列出，便于快速对照）：** 

- Phase 1（多样性）**（部分）示例：`code 20.0%`、`crawl-medium 18.3%`、`syn-crawl-high 16.2%`、`crawl-medium-high 14.8%`、`crawl-high 11.1%`、`math 3.2%`、`stem-sft 3.1%` 等。** 
- Phase 2（更高质量）**（部分）：`syn-crawl-high 21.0%`、`crawl-high 16.0%`、`code 20.0%`、`math 9.5%`、`stem-sft 14.5%` 等。** 
- Phase 3（高质量+推理/SFT 强化）**（部分）：`stem-sft 32.0%`、`code 16.0%`、`math 11.0%`、`crawl-high 10.0%`、`code-sft 10.9%` 等。** 

- 长上下文阶段（Phase LC）**：在 Phase 3 之后做 Phase LC（512k CPT，见上文），把 Phase 3 数据权重降为 80%，将 20% 权重分配给长文档 QA 合成样本。

### 六、Post-training / Alignment（SFT、DPO、GRPO、RLHF）数据流

** 这是从 base model 到 aligned model 所用的数据与合成的具体流程（含 SFT 分阶段的具体处理）。
 
### 6.1 Post-training 数据分布（SFT dataset）

- 总体规模**：论文提到 post-training 总量大约 **90B tokens**，其中 SFT 阶段使用了大约 **80B tokens 的 prompt-response 对**（说明：后训里多数是单回合 prompt-response 形式）。** 
- 按域样本数（Table 7）**（用于 SFT 的样本计数）：** 

-  Math: 1.5M** 样本** 
-  Coding: 1.1M**** 
-  Science: 2.0M**** 
-  Tool-calling: 400K**** 
-  Conversational: 1.5M**** 
-  Safety: 2K**** 
-  Multilingual（所有域合计）: 5.0M**。

每一类都有种子数据（真实或公开数据集），然后通过大模型（Qwen3 / DeepSeek V3 系列）生成高质量答案，并且过滤。

### 6.2 SFT 三阶段（精细化策略）

- **Stage 1（Base SFT）**：** 

-  使用 §3.1 表格的完整 post-training 数据集（约 80B tokens）。
 
-  在这一步插入 约 10% 的样本把 reasoning traces 去掉**（使模型学会在“关掉思考”时产出直接答案）。** 
-  为了保留 long-context 能力，Stage 1 把样本拼接成约 128k token 的长序列**（concat）以减少 padding。** 

- Stage 2（Tool-calling 强化）**：** 

-  因为 Stage 1 的 128k 拼接破坏了工具调用模式（tool-calling），因此 Stage 2 不做拼接**，专门用完整的 tool-calling 数据（以及代表性子样本的其他域）训练以提升工具调用性能。** 

- Stage 3（长上下文与截断训练）**：** 

-  加入 long-context 数据（参照 Nemotron-H 的方法），并加入通过将 reasoning traces 截断为 1–2k tokens（但保留最终答案）** 的样本以增强“思考预算/截断场景”的健壮性（这是实现 inference 时可控 thinking-budget 的关键）。** 

### 6.3 DPO / GRPO / RLHF 与模型合并（训练数据如何生成与使用）

- DPO（Direct Preference Optimization）**：** 

-  在 WorkBench 环境中为每个 candidate checkpoint 生成 on-policy 数据（包含成功示例与失败示例），专门提升 multi-step / multi-turn 工具调用（评估基于 BFCL v3）。
 

- GRPO / RLHF**：** 

-  GRPO 用于训练 candidate checkpoints（HelpSteer3 英文上下文），RLHF 用于提升总体 helpfulness（Arena-Hard 基准）。训练时 rollouts 使用含/不含思考轨迹的输出，奖励模型以 Qwen-based reward model 为主。
 

- 模型合并（Checkpoint interpolation）**：** 

-  为了在“推理能力”与“聊天/友好性”间折中，论文采用线性插值模型权重：(1−α)·w1 + α·w2，并对 α 做扫参（0.1 到 0.9），大约 0.5 是可接受折衷。
 

### 七、蒸馏 / 剪枝阶段（数据选择与 KD 策略）

- 总体策略**：先做 depth-only pruning + KD（约 120B tokens，seq-len 8192），再做 width-pruning + KD（约 360B tokens，seq-len 8192），最后做长上下文 KD（约 2.5B tokens，seq-len 524,288）以灌输 long-context 能力。论文列出了多阶段 token 数量与序列长度。** 
- 用于 KD 的数据混合**：** 

-  对于某些 KD 阶段（例如：为了恢复精度），最佳混合为 70% post-training Stage-2 数据 + 30% pretraining 数据**（这是在表 11 / 实验结果中发现的最优混合之一）。对于在 262,144 序列长度下的 KD，使用 100% Stage-3 post-training 数据。** 

### 八、关键数值与产物清单（便于快速查阅）

-  Pretraining token horizon（总计）：20 trillion tokens（20T）**。** 
-  Long-context CPT（Phase LC）：18.9B tokens**（512k 上下文）。** 
-  Post-training 总量：约 90B tokens**（其中 SFT 使用约 80B tokens 的 prompt-response）。** 
-  Math 数据集产出：Nemotron-CC-Math-3+ = 133B tokens**；**Nemotron-CC-Math-4+ = 52B tokens**（4+ 为 top-scoring 子集）。** 
-  Fundamental Reasoning SFT 合成产量（示例）：DeepSeek-V3 生成 ~4B tokens**，Qwen3-30B 生成 ~**4.2B tokens**（用于 FR-SFT）。** 
-  Post-training 样本计数（Table 7）：Math 1.5M / Coding 1.1M / Science 2.0M / Tool-calling 400K / Conversational 1.5M / Safety 2K / Multilingual(all) 5.0M。

### 九、可复现实践清单（如果您要复现或实现类似管线）

下面给出按执行顺序**的“工程化步骤”，每步附带论文中使用的关键工具/模型建议。

- **准备爬虫原始数据**：抓取指定 Common Crawl 快照（论文列出的快照区间），抓取 CC-NEWS（到 2025-04-23）。** 
- 数学页面专用 re-fetch + 渲染**：以已有 math URL 列表为种子 → 用 lynx 渲染 HTML。** 
- 数学文本清洗与标准化**：用 Phi-4 做 boilerplate 去除与 LaTeX 标准化，再用 FineMath classifier 打分与筛选。** 
- 代码许可检测 & 注释**：从 GitHub 摘取源码 → 运行 license detector（BigCode-like）→ 精确哈希去重 → MinHash LSH 模糊去重 → 用 OpenCoder 启发式过滤。** 
- 模糊去重框架**：使用 NeMo-Curator 实现 MinHash/LSH pipeline（论文使用该框架）。** 
- 学术长文档 QA 合成**：选取 >32k 文档 → 块化（1,024）→ 随机 10% 块送入 Qwen-2.5-72B-Instruct 生 QA → 拼接回文档末尾。** 
- 合成 SFT（FR-SFT/ STEM）**：用 Qwen3-30B 与 DeepSeek-V3 生成问题与 CoT → 多数投票过滤 → 汇入 SFT 集合。** 
- tool-calling 合成**：构造三方交互（User/Assistant/API）脚本 → 用 Qwen3-235B 构建对话并用 rule-based verifier 检查轨迹成功性。** 
- 去污染**：对所有候选样本运行 LLM Decontaminator → 移除疑似测试集泄露或敏感内容。** 
- 数据混合 & curriculum**：按 Phase1/2/3 的配比混合数据（论文 Figure-3 中的配比），训练时在 60%/90% 切换阶段。

### 十、注意事项 / 工程陷阱（论文中提到的重要提示）

- **数学内容必须用特殊管线（lynx+LLM）渲染与标准化**，否则常规抓取工具会丢失或扭曲公式与代码结构。** 
- 代码严格去重与许可把关**：代码容易被大量复制（同一文件在多个 repo），必须做精确与模糊去重并严格做 license 判定以避免侵权风险。** 
- 拼接（concat）会损害某些行为学习（如工具调用）**：Stage1 用 128k 拼接提升 long-context 能力，但会使 tool-calling 模式变差，因而需要 Stage2 专门无拼接训练来修正。** 
- 合成数据要做一致性投票/验证**（多数投票、rule-based verifier、guard models），以降低 LLM 生成的幻觉与错误。**

### 十一、论文中已公开/可下载的资源（方便复现）

论文声明会在 Hugging Face 发布主要模型与数据集集合，包括 Nemotron-CC-v2、Nemotron-CC-Math-v1、Nemotron-Pretraining-Code-v1、Nemotron-Pretraining-SFT-v1 等（论文最后与 §1 中列出 Hugging Face 链接集合）。

[](https://link.zhihu.com/?target=https%3A//huggingface.co/collections/nvidia/nemotron-pre-training-dataset-689d9de36f84279d83786b35)

[](https://link.zhihu.com/?target=https%3A//huggingface.co/datasets/nvidia/Nemotron-Post-Training-Dataset-v2)

### 十二、一句话总结（快速回顾）

Nemotron Nano 2 的数据管线是多源（爬虫/数学/代码/学术）+ 专门提取（lynx+Phi-4）+ 严格去重/去污（MinHash/LSH、LLM-Decontaminator）+ 大规模合成（Qwen/DeepSeek 家族）**，并通过分阶段的 curriculum + SFT + preference-based RL（DPO/GRPO/RLHF）与细致的 KD/剪枝流程把数据价值最大化。