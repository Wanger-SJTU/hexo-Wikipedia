---
title: "DeepSeek-V4 技术解读：超长上下文背后的系统重构"
date: 2026-07-11
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2059328957376377036
---

本文整理自 PACMAN 组内 DeepSeek-V4 技术报告分享，作者 @郭旻坤。 相比逐项复述指标，本文更关心一个工程问题：1M token context 到底贵在哪里，DeepSeek-V4 又是怎么压缩性能成本，把这件事做进可用区间的。DeepSeek 背后有很深的 infra 积累，以至于每一次模型发布，组里就跟过年一样。到 DeepSeek-V4 这一代，它做的事情已经不只是把模型上下文窗口扩到 1M token，而是把超长上下文带来的成本问题拆到模型结构、训练稳定性、推理缓存、MoE 通信和产品链路里分别处理。

代码里，长上下文也许只是“把 `max_position_embeddings` 改大一点”；系统里，窗口变大意味着一串更实在的问题：

- attention 的计算量；
- KV cache 的显存和带宽；
- MoE 的跨节点通信；
- 长上下文训练的稳定性；
- 后训练阶段多种能力之间的互相干扰；
- Agent 产品形态里越来越长的工具调用和中间状态。DeepSeek-V4 的技术路线大致沿着这个方向展开：它没有把问题收敛到单个 attention 公式，同时调整了模型结构、训练方法、低精度 kernel、MoE infra、后训练和产品调用链路。V4 要解决的是 1M token context 的端到端成本问题，而不只是把窗口配置拉长。

报告中给出的模型有两档：

模型总参数激活参数原生上下文DeepSeek-V4-Pro1.6T49B1,048,576 tokenDeepSeek-V4-Flash284B13B1,048,576 token从名字看是“一个大模型 + 一个小模型”，从系统设计看，则是同一套长上下文路线在两个成本点上的实现：Pro 追能力上限，Flash 追常规服务成本。

1. 长上下文很贵
推理模型和 Agent 把 test-time scaling 推到了台前：模型在推理时可以写更长的思考链，调用更多工具，读更多检索材料，保留更多历史尝试，再用这些中间状态换取更强能力。

标准 attention 里，每个 token 都要和历史 token 发生联系。序列越长，计算和 KV cache 压力都会快速上升。对 decode 来说，模型每生成一个新 token，都要带着前面所有 KV cache 继续工作。上下文从 128K 拉到 1M，推理系统的内存、带宽和调度压力也会一起上去。

所以，工程上更关心的是：

- 放进去以后，每个新 token 还能不能便宜地生成；
- 训练时，模型能不能真的学会使用这么长的上下文；
- 服务时，KV cache、通信和调度能不能撑住；
- Agent 场景里，工具结果、历史 reasoning 和用户状态能不能被稳定管理。V4 报告给了一个关键效率对比：在 1M token 场景下，V4-Pro 相比 DeepSeek-V3.2 的单 token 推理 FLOPs 约为 **27%**，KV cache 约为 **10%**；V4-Flash 进一步降到约 **10% FLOPs** 和 **7% KV cache**。

![](https://pic4.zhimg.com/v2-b984bf2e63de1b3732779716405f2c55_r.jpg)PPT 长上下文效率结果图中把 V4-Pro、V4-Flash 与 V3.2 在 1M context 下的单 token FLOPs 和 KV cache 做对比。重点是：V4 没有只追更大窗口，而是把每个 token 的增量推理成本显著压低。

![](https://pic4.zhimg.com/v2-ad3d18107839ab4f02c0f8b928350ca9_r.jpg)DeepSeek-V4 Figure 1：评测与长上下文效率这张图同时放了 benchmark 结果和长上下文效率曲线。左侧说明 V4-Pro-Max 的能力位置，右侧说明随着上下文拉长，V4 系列相对 V3.2 的 FLOPs 和 KV cache 曲线更平。

这组数字背后更值得追的是“为什么能省”。从报告看，答案更多来自整套设计的耦合，单个模块很难解释全部收益。

2. V4 继承了 V3 的地基，但把目标函数换了
DeepSeek-V3 的路线已经很清楚：用 MoE 降低激活参数，用 MLA 降低推理成本，用 auxiliary-loss-free load balancing 稳住专家负载，用 MTP 提供额外训练信号和投机解码空间，再用 DualPipe、定制 all-to-all、FP8 训练等 infra 支撑大规模训练。

![](https://pica.zhimg.com/v2-8e900a37398a7a5e9a4941de59cecd6a_r.jpg)DeepSeek-V3 Figure 2：MLA 与 DeepSeekMoE 基础架构V3 的基础架构可以看成两个核心部件：MLA 负责压缩 attention 侧的推理状态，DeepSeekMoE 负责在总参数规模很大的情况下控制每个 token 的激活成本。

V4 没有推翻这条路线。它仍然是 Transformer + MoE，也继续使用 DeepSeekMoE 和 MTP。变化在于：V4 把“百万 token 是否可用”提成了一等目标，于是几个关键组件都被重新设计。

维度DeepSeek-V3DeepSeek-V4变化含义AttentionMLACSA/HCA hybrid attention从压缩 latent attention 走向“压缩 + 稀疏选择 + 重压缩”的混合注意力残差连接常规 residualmHC给跨层信息流增加容量，并用约束控制稳定性MoE 早期层前若干 dense 层 + MoEHash(3) + MoE更彻底地 MoE 化，同时稳住早期层 routingMoE routersigmoidsqrtsoftplus改变 affinity 形式，配合新的路由稳定性设计每 token 专家数86专家池变大时控制激活成本优化器AdamW 为主大多数模块用 Muon，少数模块保留 AdamW用近似正交化更新改善收敛和稳定性上下文长度V3 config 约 160K 级1,048,576从“长上下文扩展”变成“百万 token 原生支持”从参数表看，V4-Pro 和 V3 一样是 61 层、hidden size 7168，但 V4-Pro 多了 `compress_ratios`、`index_topk`、`sliding_window`、`hc_mult` 等字段。V4-Flash 则在 43 层、hidden size 4096 的轻量配置里保留同一套长上下文机制。

这里能看出一个取舍：V4 没有盲目继续相信参数 scale。它的判断更接近“参数规模已经够大，接下来要把这些参数用得更有效”。相比继续增加训练成本，V4 更关注推理效率、上下文可用性和激活成本，把单位参数、单位 FLOP、单位 KV cache 的价值榨得更干净。

![](https://pic1.zhimg.com/v2-9c13b5e85b778210b42a1d9635cfb682_r.jpg)PPT 总体架构一览这页把 V3/V4 的结构差异放在一起：主干仍然是 MoE Transformer，但 attention、residual path、routing、optimizer 和上下文配置都换成了更面向 1M context 的版本。

3. CSA/HCA：长上下文 attention 的分层设计
V4 最核心的结构变化是 hybrid attention：CSA 和 HCA 交错出现，分别承担不同角色。

3.1 CSA：压缩后做稀疏选择
CSA，全称 Compressed Sparse Attention。可以先粗略理解成四步：

- 把连续 token 的 KV 沿序列维压缩成更少的 entry；
- 用 Lightning Indexer 判断当前 query 该看哪些压缩 entry；
- 只取 top-k 的压缩 KV entry 做 attention；
- 同时保留一个近期 sliding window，看未压缩的局部 token。在 V4 里，CSA 的典型压缩率是 `m = 4`。V4-Flash 的 `index_topk = 512`，V4-Pro 的 `index_topk = 1024`，同时保留 `sliding_window = 128` 的局部未压缩窗口。

![](https://pic2.zhimg.com/v2-4c9fe29a181751a63789bc2249d2bc03_r.jpg)DeepSeek-V4 Figure 3：CSA 核心结构CSA 的路径可以拆成三部分：compressor 把历史 KV 压成更短的 entry；Lightning Indexer 为 query 选择 top-k 压缩 entry；sliding window 保留近期 token 的原始 KV，用来覆盖局部依赖和压缩损失。

CSA 的直觉很朴素：长文档里，和当前 token 相关的远程信息通常是稀疏的。对代码仓库、长论文或多文档任务来说，模型需要在远距离上下文里定位相关片段，而不一定每次都全量访问所有历史 token。

这里有一个重要的兜底设计：indexer 可能漏选，压缩也可能损失细节，所以 CSA 保留了局部原始窗口。也就是说，远距离信息走“压缩后检索”，近期信息仍然走未压缩 attention。这样做会保留一部分局部精度，同时把远距离访问成本降下来。

3.2 HCA：低成本全局通道
HCA，全称 Heavily Compressed Attention。它压得更狠，典型压缩率是 `m&#39; = 128`，压缩后不做 top-k 稀疏选择，直接在高度压缩后的 KV entry 上做 dense MQA。

![](https://pic3.zhimg.com/v2-9d049f04c29920db95d4691a6cc88c70_r.jpg)DeepSeek-V4 Figure 4：HCA 核心结构HCA 的压缩率比 CSA 激进得多。它牺牲细粒度定位能力，换取极低成本的全局覆盖；同时也保留 sliding window，避免近期 token 只经过重压缩路径。

HCA 不擅长保留精确细节，它更偏向低成本全局覆盖。它的价值在于：不管上下文有多长，模型至少能有一条便宜的全局通道。

把 CSA 和 HCA 放在一起看，分工就很清楚：

机制压缩方式是否稀疏选择主要作用主要风险CSA每 4 个 token 级别压缩是，top-k远距离精确信息检索indexer 漏选、压缩损失HCA每 128 个 token 级别重压缩否，dense低成本全局覆盖细节损失明显Sliding window近期 token 不压缩不适用保留局部细粒度依赖窗口外仍依赖压缩机制V4 的 attention 设计可以这样理解：长上下文里，模型可以减少对所有 token 的均匀扫描，改为把“全局感知、远程检索、局部细节”分层处理。

4. mHC：把 residual stream 拆成多路
Transformer 里的标准残差连接可以写成：

x_{l+1} = x_l + F_l(x_l)
这里始终只有一条 residual stream：第 `l` 层读 `x_l`，算出一个增量 `F_l(x_l)`，再把它加回同一条状态里。这个设计非常成功，但它也把所有跨层信息都压在同一条通道上。

Hyper-Connections 的改法是维护多条 residual stream。设 `X_l` 是 `n_hc x d` 的状态矩阵，每一行是一条 `d` 维 residual stream。第 `l` 层不再直接读写单个 `x_l`，而是先从这些 stream 里混合出当前 block 的输入，再把 block 输出写回多条 stream：

X_{l+1} = B_l X_l + C_l F_l(A_l X_l)
按数据流拆开，这个公式里有四件事：

- `A_l X_l`：从多条 stream 中读出当前 block 的输入；
- `F_l(A_l X_l)`：正常经过 attention / MLP 等 block 计算；
- `C_l F_l(...)`：把 block 的输出写回多条 stream；
- `B_l X_l`：把旧的多条 stream 继续向后传，并允许它们之间发生混合。V4 配置中 `hc_mult = 4`，也就是维护 4 条 residual stream。这样做的好处是，跨层信息不必全挤在一条 `x_l` 里，不同层可以从多路状态中读取、写入和混合信息。

主要风险在 `B_l`。如果 `B_l` 是任意矩阵，多层堆叠后会出现一串矩阵乘积：

B_L B_{L-1} ... B_1
只要这些矩阵在某些方向上的增益略大于 1，经过几十层后就可能放大成明显的数值问题；如果某些方向持续小于 1，则对应信息会被压掉。mHC，也就是 Manifold-Constrained Hyper-Connections，主要是在约束这个跨 stream 的混合矩阵。

V4 把 `B_l` 约束到双随机矩阵集合上：

- 元素非负；
- 每行和每列都归一；
- 用 Sinkhorn-Knopp 投影实现约束；
- `A_l` 和 `C_l` 用 sigmoid 做有界非负约束；
- 配置中 `hc_sinkhorn_iters = 20`。双随机矩阵有一个有用的线性代数性质：根据 Birkhoff-von Neumann 定理，它可以看作若干置换矩阵的凸组合。置换矩阵只是在多条 stream 之间重排信息，本身不放大向量范数；凸组合之后，`B_l` 仍然更接近“重分配信息”，而不是任意拉伸信息。行归一保证每条输出 stream 是输入 stream 的加权平均；列归一限制每条输入 stream 被分出去的总量。这样 `B_l` 仍然能学到跨 stream mixing，但不会轻易引入无约束的尺度放大。

Sinkhorn-Knopp 投影就是把一个非负矩阵反复做行归一、列归一，近似投影到双随机矩阵集合。V4 里迭代 20 次，本质上是在每次参数化 `B_l` 时把它拉回这个受约束的集合。

![](https://pica.zhimg.com/v2-139c9a1c13a97a77e9bf0127bb19fb38_r.jpg)PPT mHC 机制页这页展示了从 standard residual 到 Hyper-Connections 再到 mHC 的变化：mHC 增加多路残差状态，同时用双随机约束限制跨通道混合，避免多层堆叠后信号尺度失控。

所以 mHC 解决的不是 token 间 attention 问题，而是跨层信息通路的问题：用多条 residual stream 增加表达容量，再用双随机约束把跨 stream 混合限制在一个尺度更可控的集合里。这一节更准确地说属于模型算法设计；它与 infra 的关系在于，模型结构越复杂，训练系统越需要稳定的数值路径，否则长上下文和 MoE 带来的 outlier 会更难处理。

5. Muon 与训练稳定性
V4 大多数模块使用 Muon，embedding、prediction head、RMSNorm、mHC 的部分静态 bias 和 gate 等模块保留 AdamW。Muon 并不是 DeepSeek-V4 才提出的优化器，它来自近两年关于 matrix-aware optimization 的一条路线：对二维权重矩阵的更新方向做近似正交化，让更新更接近“旋转/重排特征子空间”，而不是在某些奇异方向上过度拉伸。

传统 AdamW 对每个参数做逐元素自适应更新。Muon 关注的是矩阵整体结构：如果一个线性层权重是矩阵 `W`，梯度更新 `G` 也可以看成矩阵。Muon 会对 `G` 做近似正交化，得到一个谱范数和奇异值更受控的更新方向，再用它更新 `W`。这对大模型里的线性层很重要，因为线性层不是一堆互不相关的标量参数，而是在学习特征空间之间的映射。

V4 使用 hybrid Newton-Schulz 来做近似正交化：前 8 步快速把奇异值推近 1，后 2 步稳定到 1。Newton-Schulz 可以看成一种只用矩阵乘法近似计算矩阵逆平方根/极分解的迭代方法，适合在 GPU 上实现。它不需要完整 SVD，因此比直接做精确正交化便宜得多。

这套选择和 V4 的架构复杂度有关：mHC 引入多路残差混合，CSA/HCA 引入压缩和稀疏选择，MoE routing 又可能制造 outlier。每个机制都可能放大数值波动。一旦某个环节产生异常，后续模块可能继续放大，最终表现为 loss spike 或训练不稳定。

报告中还提到，V4 在 attention query 和 KV entry 上使用 RMSNorm 来避免 logits 爆炸，因此没有使用 QK-Clip。这个选择也说明，V4 的稳定性由优化器、归一化、路由、clamp 和训练 schedule 一起维持。

预训练也配合了渐进式 schedule。V4 的预训练数据超过 32T token，覆盖数学、代码、网页、长文档、多语种和高质量类别；上下文长度从 4K 逐步扩到 16K、64K、1M。Flash 先用 dense attention warmup 1T token，到 64K 阶段再引入 sparse attention；引入 CSA 时也先 warmup Lightning Indexer，再进入主体 sparse training。

稳定性部分，报告把问题主要归因于 MoE outlier 和 routing 放大效应，并给出两类经验方案：

- **Anticipatory Routing**：用历史参数提前计算 routing indices，在 loss spike 出现时触发短 rollback 并启用该模式，从而打断 routing 和 outlier 之间的恶性循环；
- **SwiGLU Clamping**：对 SwiGLU linear 分支 clamp 到 `[-10, 10]`，gate 分支上限为 10，用数值范围控制抑制异常值。这些方法有效，但理论机制仍不完整。很多大模型训练的稳定性技巧，本质上仍带有经验工程成分：它们能处理某些 loss spike，但对不稳定性的完整机制解释还不充分。

6. MoE：通信优化 与 kernel fuse
MoE 的纸面效率很好看：每个 token 只激活少数专家，所以激活参数远小于总参数。但到了训练和推理系统里，还要处理另一个成本：专家分布在不同设备上，token 要 dispatch 到对应专家，算完还要 combine。

这意味着 MoE 的效率不仅取决于矩阵乘有多快，也取决于跨节点通信能不能被计算覆盖。V3 已经在这个方向上做了很多工作：DualPipe、定制 all-to-all、FP8 训练，本质都是让大规模 MoE 在 H800 集群上可控。V4 继续往前推，尤其强调 Expert Parallelism 下的通信计算重叠。

![](https://pic2.zhimg.com/v2-2f7c4f3f9ef572d25111e0a21143e533_r.jpg)DeepSeek-V4 Figure 5：Expert Parallelism 通信计算重叠这张图展示了 expert parallelism 下的流水结构：dispatch、Linear-1、SwiGLU/FP8 cast、Linear-2、combine 被拆成 expert wave，让通信、计算和结果回传在不同 wave 之间重叠。

V4 的做法是设计 fused mega-kernel，把 Dispatch、Linear-1、SwiGLU/FP8 cast、Linear-2、Combine 组织成细粒度流水，并通过 expert wave 调度，让当前 wave 计算、下一 wave 通信、已完成结果回传并行发生。如果 MoE dispatch/combine 仍然是一串松散 kernel 串行执行，那么 attention 再省，端到端吞吐也会被通信拖住。V4 的 infra 思路是把通信、计算、低精度 cast 和专家调度合成一个更紧的执行图。

报告里还提到几个底层方向：

- **TileLang**：用于快速开发 fused kernels，连接原型迭代和底层性能优化；
- **Host Codegen**：把 Python host-side overhead 降到微秒级以下；
- **batch-invariant / deterministic kernels**：保证训练、后训练、推理之间 bitwise 对齐，方便复现 loss spike 和 debug；
- **FP4 QAT**：用于 MoE expert weights 和 CSA indexer QK path；
- **index score 低精度化**：从 FP32 到 BF16 可以加速 top-k selector，同时保持较高 KV entry recall。这些内容偏底层，但都和端到端可用性有关。CSA/HCA 和 MoE 这种复杂机制能不能落地，很大程度取决于 kernel、编译、量化、缓存和调度是否配套。

7. 后训练策略与产品链路
V4 后训练保留了 V3.2 管线基础，但核心变化是用 On-Policy Distillation，简称 OPD，替代 mixed RL。

流程可以概括成两步：

- 先训练多个领域专家，包括数学、代码、Agent、指令遵循等。每个专家先做高质量领域 SFT，再通过 GRPO 做领域 RL；
- 再用多个专家模型作为 teacher，让统一 student 在自己生成的 trajectory 上学习，目标是最小化 student 到多个 teacher 的 KL，并按专家重要性加权。这样做的原因是 mixed RL 容易出现能力互相干扰。数学、代码、Agent、指令遵循等任务的奖励信号并不完全一致，放在同一个优化阶段里，可能导致某些能力提升、另一些能力退化。OPD 避免直接在参数空间里硬合并，转而在 on-policy trajectory 上让 student 学习多个 teacher 的行为分布。

V4 还引入三种 reasoning effort：Non-think、Think High、Think Max。这样能力呈现从单点分数扩展成“模型大小 + 推理预算”的 trade-off 曲线。Flash 在增加 thinking budget 后可以接近 Pro 的部分 reasoning 表现，但知识密度、复杂 Agent 和长程任务仍然依赖 Pro 的模型容量。这对应了一种清晰的服务分层：Flash 是低成本常规路径，Pro 是高容量路径，Max 是高推理预算路径。

产品链路里，Tool-Call、Interleaved Thinking 和 Quick Instruction 几页也值得看。工具调用使用特殊标记 `|DSML|` 和 XML 风格 schema，降低 escaping failure 和 tool-call error。在工具调用场景下，V4 会保留完整 reasoning history，跨 user message 不丢弃，用 1M context 支撑长程 Agent 状态；普通对话场景则仍在新 user message 到来时丢弃旧 thinking，避免无意义地浪费上下文。

Quick Instruction 则把搜索触发、意图识别、query 生成、标题生成、URL 读取判断等辅助任务，用特殊 token 直接交给主模型完成。传统做法常用额外小模型处理这些任务，但小模型不能复用主模型已有 KV cache，会带来重复 prefill。Quick Instruction 的价值就在于复用已有 KV cache，降低用户感知 TTFT，同时减少维护额外小模型的复杂度。

从产品工程视角看，一旦 1M context 和 KV cache 复用足够便宜，模型会更自然地进入工具调度链路。它读状态、改状态、调用工具、记录失败，再继续下一轮。落到 infra 上，就是缓存一致性、调用格式、成本控制和失败恢复等问题。

8. 评测结果分析：agent仍然挑战重重
Base Model 评测支持两个结论：

- V4-Flash 虽然只有 13B 激活参数，但多项 benchmark 超过 V3.2-Base，说明架构和数据效率确实有效；
- V4-Pro-Base 在知识、推理、代码、长上下文上整体更强，符合其 49B 激活参数和更大专家池定位。PPT 中列出的部分 base 指标包括：

BenchmarkV3.2-BaseV4-Flash-BaseV4-Pro-BaseMMLU-Pro65.568.373.5SimpleQA verified28.330.155.2LongBench-V240.244.751.5标准后训练评测中，V4-Pro-Max 在开放模型中刷新多项知识、推理、长上下文和 Agent benchmark。PPT 的 Evaluation 页展示了 MRCR 1M、CorpusQA 1M、Terminal Bench 2.0、SWE Verified、MCPAtlas、Toolathlon 等指标。Reasoning effort 图也显示，Max 模式通常在 HLE、Terminal Bench 2.0 等难任务上优于 High/None。

![](https://pic2.zhimg.com/v2-c64cc7e003f8fc571383c121f7d93fb5_r.jpg)PPT Evaluation 总览这页把标准 benchmark、reasoning effort 和真实任务评测放在一起。需要注意的是，Max 模式的提升并不只来自 base model 能力，也来自更高推理预算。

但长上下文 benchmark 不能过度解读。它们能证明模型在 1M token 下仍保留检索和问答能力，和真实长程任务之间还有距离。真实 Agent 任务还涉及工具失败恢复、长期状态维护、格式约束、环境反馈、成本控制、沙箱安全和权限隔离。

报告中的真实任务评测，包括中文写作、搜索、白领任务和代码 Agent，更接近产品场景，也暴露了格式约束、长文压缩、PPT 视觉设计和复杂指令遵循仍有改进空间。所以，更稳妥的读法是：V4 证明了 1M context 可以进入可用区间，但没有证明“有了 1M context，Agent 问题就结束了”。窗口变大以后，系统问题不会消失，只会拥有更大的状态空间。

9. V4 的技术意义
DeepSeek-V4 的一个重要启发是：百万 token context 更适合被看作一条系统链路，不能只看成孤立模型参数。

在模型层，CSA/HCA 让远距离信息访问、全局概览和局部细节各司其职；mHC 让复杂深层结构有更稳定的信息通路；Muon、RMSNorm、clamping 等设计帮助控制训练动态。

在 infra 层，MoE mega-kernel、expert wave、TileLang、deterministic kernels、FP4 QAT、异构 KV cache 和 rollout/teacher 调度，把架构设计转化为可运行系统。V3 的 DualPipe、FP8、all-to-all kernel 等经验没有消失，继续成为 V4 加复杂度的地基。

在后训练层，专家训练 + OPD 反映了另一个趋势：单一 RL 阶段很难稳定合并所有能力。数学、代码、Agent、指令遵循、长上下文和工具调用都有自己的数据、奖励和失败模式。先专精，再蒸馏，可能比把所有目标混在一起更可控。

总结而言，V4有太多最前沿的算法和系统技术经验：

 CSA/HCA 让长上下文算得起，mHC 和 Muon 让复杂模型训得稳，MoE/TileLang/低精度 infra 让系统跑得动，OPD 和 Agent 设施让能力合得回一个统一模型。当模型复杂到一定程度，单点优化往往会牵动上下游。attention 变了，KV cache 变；KV cache 变，服务系统变；MoE 变，通信调度变；后训练目标变，数据和 rollout 系统也要变。

10. 局限和后续问题
V4 证明了一条强工程路线，但它也留下几个问题。

第一，架构复杂度很高。CSA/HCA、mHC、Muon、MoE mega-kernel、FP4 QAT、Anticipatory Routing、Quick Instruction 叠加后，系统很强，但也更难解释、复现和迁移。后续研究需要把这些经验设计提炼成更简洁的理论和模块。

第二，训练稳定性仍有经验成分。Anticipatory Routing 和 SwiGLU Clamping 很实用，但报告也明确说理论机制尚未完全清楚。对于更大规模、更长上下文或不同硬件环境，这些方法的边界仍需要验证。

第三，低延迟长上下文仍然困难。V4 显著降低了 FLOPs 和 KV cache，但 1M token 真实服务仍会受到 shared-prefix 复用率、SSD/内存带宽、KV 复用策略、动态 batching、工具调用频率等因素影响。

第四，Agent 能力不能只靠窗口长度解决。长程任务需要上下文，也需要规划、校验、恢复、权限隔离、沙箱安全和成本控制。V4 的 DSec sandbox、token-granular WAL、teacher scheduling 等 infra 已经朝这个方向走，但真实生产系统还会遇到更多非模型问题。

第五，多模态仍是未来方向。V4 主要围绕文本长上下文展开，而真实工作流往往包含网页、图片、PDF、表格、幻灯片、代码仓库和 GUI 状态。百万 token context 如果要成为通用工作记忆，还需要继续扩展到多模态和更结构化的状态表示。

结语
DeepSeek-V4 的价值在于，它把 1M token 的成本、训练稳定性、推理缓存、MoE 通信、后训练合并和 Agent 交互一起纳入设计。

它延续了 V3 的 MoE 和系统工程路线，并把优化目标从“高性价比大模型训练”进一步推向“长上下文智能的常规化服务”。这也是它值得技术分享的地方：百万 token 上下文涉及模型架构、训练系统、推理系统和产品交互的共同重构。

如果以后长程 Agent 真能稳定处理代码仓库、文档、工具调用和多轮任务，我们回头看，大概率会发现模型长上下文能力只占其中一部分，整条系统链路也需要学会怎么管理这些长期状态。

参考来源

- PACMAN 沙龙 DeepSeek-V4 技术报告分享。
- DeepSeek-AI. DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence.
- DeepSeek-AI. DeepSeek-V3 Technical Report.本文基于公开资料的整理与思考，不代表任何组织的立场。如有疏漏，欢迎指正。