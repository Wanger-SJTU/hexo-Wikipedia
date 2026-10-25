---
title: "Skill 太多了，Agent 不会选怎么办？SkillRouter 论文深度解读"
date: "2026-03-26 00:00:00"
updated: "2026-03-26 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AgentCLI/Skill-太多了,Agent-不会选怎么办-SkillRouter-论文深度解读/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2020599834457940987"
---


Skill 太多了，Agent 不会选怎么办？SkillRouter 论文深度解读

JustBeClaw

AI 全干工程师

收录于 · AI 论文解读

14 人赞同了该文章

论文来源: YanZhao Zheng, ZhenTao Zhang, Chao Ma 等 / Alibaba Group 
arXiv: 2603.22455 (2026.03) 
面向读者: ML 从业者 — 熟悉 PyTorch/Transformer，关注实现细节和实验设计
一句话总结
当 LLM Agent 面对 8 万个技能时，技能的”源代码”（body）比”名字+描述”重要得多——一个仅 1.2B 参数的检索+重排序 pipeline 就能达到 74% 的 top-1 路由准确率，超越所有 8B 级基线。

## 1. 为什么需要 Skill Routing？


### 1.1 背景：Agent 技能池的爆炸增长

Claude Code、Codex CLI 等 LLM 编程助手越来越依赖社区贡献的技能生态。这些”技能”本质上就是 agent 可以调用的工具/插件——类似于你在 VS Code 里安装的扩展，但面向 AI Agent。

问题来了：当社区贡献的技能数量达到数万甚至数十万时，你不可能把所有技能的描述塞进 LLM 的上下文窗口。这就像让一个开发者在不搜索的情况下，仅凭记忆从 npm 的 200 万个包里选出最合适的那个。

### 1.2 核心挑战：功能重叠（Functional Overlap）

社区技能库的一个显著特征是大量技能在名称和描述上高度相似，但实际实现完全不同。比如可能有 10 个技能都叫某种 “video processor”，描述也差不多，但有的是做视频剪辑，有的是提取字幕，有的是格式转换。

这意味着传统的基于关键词或简单语义匹配的方法会大量误判。

### 1.3 Hidden-Body Asymmetry（隐藏体不对称性）

这篇论文提出了一个关键概念：Hidden-Body Asymmetry（隐藏体不对称性）。

Agent 侧（使用技能时）:     只能看到 name + description（上下文有限）
路由侧（选择技能时）:       可以访问 name + description + body（完整代码）
这不是设计偏好，而是现实约束——Agent 的上下文窗口装不下所有技能的完整源码。但路由系统作为一个独立组件，完全可以离线处理这些信息。这个不对称性正是 SkillRouter 的设计基石。

## 2. 核心发现：Skill Body 是决定性信号

这是全文最重要的实证贡献。作者通过系统的消融实验证明：技能的实现代码（body）才是检索成功的关键，而不是名字和描述。

### 2.1 定量证据

Table 1: 去掉 body 对检索精度的毁灭性影响
 

几个惊人的数据点：

方法仅 name+desc完整文本差值BM25（词匹配）0.0%34.7%+34.7ppQwen3-Emb-0.6B22.7%58.7%+36.0ppQwen3-Emb-8B30.7%65.3%+34.6ppCross-Encoder (8B×8B)24.0%68.0%+44.0ppBM25 在 name+desc 模式下精度为零——因为用户查询和技能名称/描述之间几乎没有词汇重叠。即使是 8B 参数的 Encoder，没有 body 时（30.7%）也远不如 0.6B 有 body 时（58.7%）。换句话说，13 倍的参数量也弥补不了缺失 body 的损失的四分之一。

更有意思的是：没有 body 的 Reranker 反而会帮倒忙。最佳的 nd reranker 组合仅 33.3%，远低于 encoder-only 的 56.0%。因为 reranker 会”自信地”基于表面的名称相似度重排序，把本来排对的结果搞乱。

### 2.2 注意力分析：91.7% 的注意力在 Body 上

Figure 1: Skill body 是决定性信号的可视化证据 左图展示了去除 body 带来的精度暴跌；右图展示了 cross-encoder 的注意力分布。
 

作者分析了 SR-Rank-0.6B 中最终预测 token 的注意力分布（聚合了 28 层 × 16 头 × 75 个 query）：

- Body: 91.7% ← 几乎全部注意力
- Name: 7.3%
- Description: 1.0%逐层来看，注意力呈现出一个有趣的 body→name→body 模式：

层组Body 注意力Name 注意力解读早期 (0-6)97.3%~2%Token 级内容理解中期 (7-20)~70%峰值 26.3% (L19)语义匹配——用名称作锚点晚期 (21-27)91.7%~7%最终相关性决策Description 在所有层都 ≤1.4%，基本被忽略。

Figure 5: 逐层注意力分布 展示了 body→name→body 的注意力迁移模式，Layer 19 是 name 注意力的峰值。
 

### 2.3 为什么 Body 如此重要？

直觉上理解：当 8 万个技能中有大量”视频处理”“数据转换”“文本分析”类技能时，名称和一句话描述完全不够区分。但一旦看到完整实现——比如某个技能内部调用了 whisper 进行语音转文字，另一个调用了 ffmpeg 进行格式转换——差异立刻清晰。

类比：这就像你在 GitHub 上搜索库。光看 README 的标题和一句话描述，10 个相似的库可能看起来一模一样。但打开源码一看，有的是真正的生产级实现，有的只是 demo wrapper。

## 3. SkillRouter 方法详解


### 3.1 整体架构

Figure 2: SkillRouter Pipeline 架构 左侧展示训练流程（Encoder 和 Reranker 分别训练），中间是推理流程（两阶段），右侧是 Agent 应用场景。
 

SkillRouter 是一个经典的 检索+重排序（Retrieve-and-Rerank） 两阶段管线：

~80K 技能池
    │
    ▼
┌─────────────────────────┐
│  Stage 1: Bi-Encoder     │  SR-Emb-0.6B
│  （独立编码 query   skill）│  预先离线编码所有技能
│  ANN 搜索取 Top-20        │  推理时只需编码 query + 向量检索
└───────────┬─────────────┘
            │  20 个候选
            ▼
┌─────────────────────────┐
│  Stage 2: Cross-Encoder  │  SR-Rank-0.6B
│  （联合编码 query-skill对）│  逐一对 20 个候选打分
│  输出最终排名             │  交叉注意力捕捉深层语义
└───────────┬─────────────┘
            │
            ▼
     Top-K 技能 → 注入 Agent 上下文
为什么两阶段？ 这是信息检索领域的经典范式。Bi-encoder 快（可以 ANN 近似搜索，亚线性时间），但精度有限；Cross-encoder 准（query 和文档的完整交叉注意力），但慢（需要逐一过每个候选）。两者结合：先快速缩小范围，再精确排序。

### 3.2 Stage 1: Bi-Encoder 检索（SR-Emb-0.6B）

基座模型: Qwen3-Emb-0.6B（decoder-based embedding model）

核心思路: 将 query 和每个 skill 的完整文本（name + description + body）分别编码为向量，通过余弦相似度检索最相似的 top-20。

训练数据构建

- 37,979 个 (query, skill) 对
- 技能来自 ~80K 开源技能池（51 个功能类别）
- Query 由 GPT-4o-mini 合成生成，平均 160 词
- 训练集和评估集完全不相交Table 2: Query 生成 prompt 模板 LLM 收到技能的完整信息，生成不含技能名称的自然任务描述。
 

Hard Negative Mining（难负例挖掘）
每个 query 挖掘 10 个难负例，来源多样化：

来源数量/query策略语义负例4基模型 cosine 相似度 top-50词法负例3BM25 检索得分高的分类负例2同类别不同技能随机负例1不同类别随机采样
假阴性过滤（False Negative Filtering）—— 关键贡献
在大规模技能池中，hard negative mining 会不可避免地选中功能相同但名称不同的技能作为”负例”。这些假阴性会严重干扰训练。

三层过滤管线：

- 名称去重: 名称完全匹配的技能不作为负例（过滤 24,879 个）
- Body 重叠: trigram Jaccard 相似度   0.6 的不作为负例（过滤 13,860 个）
- Embedding 相似度: cosine   0.92 的不作为负例（过滤 326 个）总共过滤了 ~39,000 个假阴性，约占全部挖掘负例的 10%。

损失函数
标准的 InfoNCE loss（带 in-batch negatives）：

\mathcal{L}_{enc} = -\frac{1}{B} \sum_{i} \log \frac{\exp(\text{sim}(q_i, s_i^+)/\tau)}{\sum_j \exp(\text{sim}(q_i, s_j)/\tau)}

温度 τ = 0.05，batch size 8，梯度累积 4 步（有效 batch 32），学习率 2×10⁻⁵，cosine schedule，单 GPU 训练 1 epoch。

### 3.3 Stage 2: Cross-Encoder 重排序（SR-Rank-0.6B）

基座模型: Qwen3-Reranker-0.6B（decoder-based cross-encoder）

输入格式: 将 query 与候选 skill 的 name+description+body 拼接后联合编码（flat-full format）。

训练数据

- 32,283 个训练 query
- 每个 query 配 SR-Emb-0.6B 的 top-20 候选 + 二值相关性标签
- 同样应用假阴性过滤
Listwise vs Pointwise：30.7pp 的巨大差距
这是一个关键的设计决策。作者比较了两种损失函数：

Listwise CE（最终采用）: 

\mathcal{L}_{LW} = -\log \frac{\exp(f(q, s^+)/\tau)}{\sum_j \exp(f(q, s_j)/\tau)}

Pointwise BCE（对照）: 

\mathcal{L}_{PW} = -\frac{1}{K}\sum_j [y_j \log\sigma(f_j) + (1-y_j)\log(1-\sigma(f_j))]

Listwise CE 把 20 个候选放在一起比较，强制模型做候选间对比。Pointwise 则独立判断每个候选是否相关。

结果: Listwise 74.0% vs Pointwise 43.3% — 差 30.7 个百分点。Pointwise 甚至不如不加 reranker（65.4%）！

为什么 Pointwise 如此糟糕？ 在高度同质的技能池中，所有候选技能都”看起来相关”，sigmoid 输出会收敛到一个很窄的区间，排序变成几乎随机的。而 Listwise 通过 softmax 归一化强制拉开差距。

## 4. 评测体系


### 4.1 Benchmark 构建

技能池规模: ~80K 技能（来自 SkillBench + 社区开源技能，覆盖 51 个功能类别）

测试 Query: 75 个专家验证的查询（24 个单技能、51 个多技能）

两个难度级别:

- Easy (78,361 skills): 基础池，所有元数据完整
- Hard (79,141 skills): Easy 池 + 780 个 LLM 生成的干扰技能（主题相关但功能不同）Table 11: Easy 和 Hard 级别的数据示例 展示了 ground-truth 技能和 Hard 级别中的干扰技能对比。
 

### 4.2 评估指标


- Hit@1（主指标）: top-1 结果是否正确
- MRR@10: 前 10 个结果中正确答案的平均倒数排名
- nDCG@10: 归一化折损累积增益
- Recall@K (K=10,20,50): 前 K 个结果中召回了多少 ground-truth 技能
- FC@10: 前 10 个结果中所有 ground-truth 技能都被覆盖的比例
### 4.3 基线模型

覆盖面广泛：

- 稀疏: BM25
- 传统 encoder: E5-Large-v2 (335M), GTE-Large-v1.5 (434M), BGE-Large-v1.5 (335M)
- Decoder-based: Qwen3-Emb-0.6B/8B, NV-Embed-v2 (7B)
- 商业 API: text-embedding-3-large, gemini-embedding-001
- Reranker: Qwen3-Reranker-0.6B/8B, GPT-4o-mini, GPT-5.4-mini
## 5. 实验结果


### 5.1 Encoder 检索结果

Table 4: 全量技能池 Encoder 检索结果 ~80K 技能，75 query/tier，全部使用完整技能文本。
 

关键发现：

模型参数量Hit@1BM25-31.4%BGE-Large-v1.5335M60.0%Qwen3-Emb-0.6B (base)0.6B56.0%Qwen3-Emb-8B (base)8B64.0%SR-Emb-0.6B (ours)0.6B65.4%SR-Emb-8B (ours)8B68.0%微调弥合了规模差距: SR-Emb-0.6B 用 0.6B 参数超越了 Qwen3-Emb-8B 的 64.0%（13 倍参数的模型）。这意味着领域特定的训练数据比堆参数更有价值。

### 0.6B→8B 的提升（+2.6pp）远小于微调带来的提升（+9.4pp over 0.6B base），进一步说明数据和训练方法比模型规模更重要。


### 5.2 端到端 Pipeline 结果

Table 5: Encoder × Reranker 完整结果 Top-20 候选，75 query/tier。这是最全面的结果表。
 

核心对比：

Pipeline参数量Hit@1Qwen3-Emb-8B (encoder only)8B64.0%Qwen3-Emb-8B × Qwen3-Rank-8B (zero-shot)16B68.0%SR-Emb-0.6B × GPT-4o-mini0.6B+API67.3%SR-Emb-0.6B × Qwen3-Rank-8B (zero-shot)0.6B+8B71.4%SR-Emb-0.6B × SR-Rank-0.6B1.2B74.0%SR-Emb-8B × SR-Rank-8B16B76.0%SkillRouter 1.2B 达到 74.0%，超越了最强的 16B 零样本 pipeline（68.0%）6 个百分点，也超越了使用 GPT-4o-mini 作为 reranker 的方案。

有趣的是：SR-Rank-0.6B (fine-tuned) 比 Qwen3-Rank-8B (zero-shot) 更强——再次证明微调比规模更重要。

### 5.3 方向稳定性

Table 6: 在不同难度和查询类型上的稳定性
 

SkillRouter 的优势在 Easy/Hard 两个 tier 和 Single/Multi 两种查询类型上都保持一致，没有”偏科”现象。

### 5.4 单技能 vs 多技能查询

Table 3: 单技能 vs 多技能查询的评估对比
 

多技能查询（一个任务需要多个技能协作）明显更难——FC@10 指标（所有 ground-truth 技能都在 top-10 中）只有 35% 左右。这也指出了未来的改进方向。

## 6. 消融实验：什么设计真正有用？


### 6.1 假阴性过滤

Table 7: 假阴性过滤消融
 

设置Easy Hit@1Hard Hit@1Avg Hit@1清洁负例66.7%64.0%65.3%原始负例64.0%58.7%61.3%Δ-2.7pp-5.3pp-4.0pp假阴性过滤贡献了 +4.0pp Hit@1。在 Hard tier（有大量干扰技能）上影响近乎翻倍（5.3pp vs 2.7pp），说明这个机制在高同质性环境中特别重要。影响集中在精度指标（Hit@1: -4.0pp）而非召回（R@50: -0.7pp）。

### 6.2 损失函数

Table 8: Reranker 损失函数消融

配置Hit@1SR-Rank-0.6B (Listwise)74.0%Qwen3-Rank-0.6B (zero-shot)70.7%FT-PW (Pointwise fine-tuned)43.3%Encoder-only (无 reranker)65.4%Pointwise 训练是灾难性的: 不仅没有提升，反而比不加 reranker 还差 22 个百分点。这个结果非常有启发性——在候选高度同质的场景下，Listwise 对比学习是必须的。

### 6.3 Reranker 贡献分解

Table 9: Per-query Hit@1 分解
 

 Figure 3: Reranker 贡献可视化 绿色 = reranker 救回的查询，红色 = reranker 搞砸的查询。净贡献 +8.7pp。
 

类别数量比例两阶段都对9261.3%Reranker 救回1912.7%Reranker 搞砸64.0%两阶段都错3322.0%Reranker 的净贡献是 +8.7pp（12.7% - 4.0%）。值得注意的是，22% 的查询两阶段都无法解决——这些可能需要多步推理或组合理解才能匹配。

## 7. 补充分析


### 7.1 Top-K 候选数量的影响

Table 12   Figure 4: Top-K 候选数量对 Hit@1 的影响 K=20 是最优值，平衡了召回和重排序精度。
 

K=20 时 SR-Emb-0.6B 的平均 Recall@20 为 75.4%，意味着 top-20 中覆盖了 75.4% 的 ground-truth 技能。K=50 时达到 81.4%，但 K 更大时 reranker 的负担增加且收益递减。

### 7.2 统计置信度

Table 13: 95% 置信区间
 

SkillRouter 1.2B 的 Hit@1 置信区间为 [67.0%, 81.0%]（n=150），与最强零样本 8B 基线的区间 [61.0%, 75.0%] 基本不重叠，说明结论具有统计显著性。

### 7.3 下游 Agent 任务完成率估计

Table 15: 检索-使用部署下的平均 Agent 通过率估计
 

 Table 16: 按 Agent 细分的通过率
 

作者将 SkillRouter 的检索精度与 SkillsBench (2026) 的任务完成数据结合，估算了端到端场景下的 Agent 通过率。模型为：

P(完成) = P(检索正确) × P(完成 | 正确技能)
这给出了一个范围估计而非点估计。结论是 SkillRouter 在检索环节的提升能有效传导到下游任务完成率，但作者也诚实指出这只是情景分析，不是真正的端到端实验。

## 8. 实际部署考量


### 8.1 效率

总参数量仅 1.2B（0.6B encoder + 0.6B reranker），可以在消费级硬件甚至笔记本 CPU 上运行：

- 离线阶段: 所有 ~80K 技能预编码为向量（一次性）
- 在线推理:  
- 编码用户 query（0.6B 模型，毫秒级）
- ANN 向量搜索取 top-20（亚线性时间）
- 重排序 20 个候选（0.6B 模型，20 次前向传播）

### 8.2 与 LLM Judge 的对比

GPT-4o-mini 和 GPT-5.4-mini 作为 reranker 的表现并不突出（67.3% 和 66.0%），远低于微调的 0.6B reranker（74.0%）。这说明通用 LLM 的”常识”在高度专业化的技能路由任务上不如领域特定的小模型。

## 9. 局限与未来方向


已知局限

- 测试集规模有限: 仅 75 个 query（150 个 query-tier 组合），统计效力受限
- 单一 benchmark: 仅在 SkillBench 衍生的基准上验证
- 22% 的”不可解”查询: 两阶段都失败，可能需要多步推理
- 检索-使用假设独立性: 实际 Agent 行为中，检索和执行阶段可能有耦合
未来方向

- 更大规模的评估基准
- 将 LLM 推理能力与检索结合（而非仅做 judge）
- 在真实 Agent 框架中进行端到端评测
- 计划开源模型和评估工具
## 10. 核心 Takeaway


- Skill body 是王道: 在大规模技能池路由中，技能的实现代码是决定性信号。设计系统时一定要利用这个信息，即使 Agent 本身看不到它。
- 小模型 + 好数据   大模型: 0.6B 微调模型超越 8B 通用模型，1.2B pipeline 超越 GPT-5.4-mini。这对资源受限的部署场景是好消息。
- Listwise   Pointwise: 在候选高度同质的场景中，Pointwise 排序基本失效。如果你在类似场景中训练 reranker，务必使用 Listwise loss。
- 假阴性是大敌: 大规模高同质池中的 hard negative mining 一定要做假阴性过滤，否则模型会学到错误信号。
- 两阶段范式仍然有效: Retrieve-and-Rerank 在 Agent 技能路由这个新场景中依然是最实用的架构。

编辑于 2026-03-26 20:40・北京
​赞同 14​​添加评论​33 ​喜欢​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

JustBeClaw
AI 全干工程师

回答
20
文章
39
关注者
416

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

Agent tool use 演进史：从functional call、MCP到skills
一、导言Agent 的能力依赖工具调用机制不断演进。早期普遍采用 Function Calling，它轻量直接，适合快速集成，但每新增一个工具都需重复开发，维护成本高，难以复用。为解决这一“碎片化”…

cecilia

[分布式框架Ray] 框架原理 - WhitePaper 阅读
除了代码库，ray团队发布的技术白皮书是了解其设计原理和实现的最近途径之一 https://docs.google.com/document/d/1tBw9A4j62ruI5omIJbMxly-la5w4q_TjyJgJL_jN2fI/previewOverviewAPI设计目…

IMIser

Bert文本分类实践（一）：实现一个简单的分类模型
盛小贱吖

AI行业的动态20251117：Claude 开发者平台功能升级 — “结构化输出（Structured Outputs）” 公测
数据与AI爱好者