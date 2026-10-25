---
title: "HyperDFlash：给DeepSeek-V4的MHC架构量身定制的块级投机解码"
date: 2026-06-26
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2053896212118499517

---

这是我「块扩散投机解码」系列的第三篇。前两篇分别讲了 **DFlash 的原理与实测**、以及 **DFlash + DDTree 把推理推到 8× 无损加速**。这一篇聊聊字节最新的 **HyperDFlash**（arXiv:2606.26744，2026-06）——它要解决的问题很具体：**当 target 模型不再是普通 Transformer，而是 DeepSeek-V4 这种「多超连接（MHC）+ 原生 MTP」的新架构时，DFlash 那套块级起草还能不能用、怎么用。**论文：HyperDFlash: MHC-Aligned Block Speculative Decoding with Gated Residual Reduction（ByteDance）。 系列前篇：

[新一代投机解码 DFlash 原理详解及SGLang Spec V2/V1 实测](https://zhuanlan.zhihu.com/p/2050943022758630707)[DFlash+DDTree：把 LLM 推理推到 8× 无损加速](https://zhuanlan.zhihu.com/p/2038002645848339789)
- **HyperDFlash = 把 DFlash 块级起草「对齐」到 DeepSeek-V4 的 MHC 架构上**。不是又发明一个新 drafter，而是用三个紧凑设计修好「通用 DFlash 直接搬过来会水土不服」这件事。
- **三招**：① **前坍缩残差条件**——用 target 真正用于预测的「坍缩前多路径残差」做条件，且这玩意儿本来就为 MTP 缓存好了，零额外前向；② **继承式 HC-Gate 压缩器**——直接「继承」target 自带 `hc_head` 的门控坍缩方式来压多路径残差，参数从 **67M 砍到 65K**（小约 3 个数量级）；③ **早位 KL 蒸馏**——只在「师生条件一致」的前 1~2 个位置上做软标签蒸馏，提升关键早位草稿质量。
- **为什么需要它**：DeepSeek-V4 原生 MTP 是「起点高、尾巴塌」（Pos0 接受率 ~91%，到 Pos5 几乎归零）；而**直接套用的 vanilla DFlash 在 DeepSeek-V4 上甚至打不过原生 MTP**（平均接受长度 τ 只有 2.14，加速比 1.73×，还不如 MTP(3) 的 2.25×）。架构不对齐，块级起草的红利就拿不到。
- **结果（DeepSeek-V4-Flash，Non-think，温度 0，平均）**：HyperDFlash 把平均接受长度从 MTP(3) 的 **2.93 → 3.69**，平均加速比从 **2.25× → 2.80×**，全面超越原生 MTP 与 vanilla DFlash，在数学/代码/对话三类任务、两种推理模式、两个温度下**全程领先**。
- **一句话总结**：当 target 模型自己有特殊的、输入相关的内部机制（比如 MHC 的门控坍缩）时，**让 drafter「继承并对齐」这个机制，比让它从零学一个通用压缩器更香**——对齐带来质量，参数骤降只是顺带的红利。
0. 先回顾：投机解码的两个旋钮
投机解码的加速，本质就拧两个旋钮： 
![](https://www.zhihu.com/equation?tex=%5Ctext%7BSpeedup%7D+%3D+%5Cfrac%7BL_%5Ctext%7Btarget%7D%7D%7BT_%5Ctext%7Bdraft%7D%2F%5Ctau+%2B+T_%5Ctext%7Bverify%7D%2F%5Ctau%7D)

- 
![](https://www.zhihu.com/equation?tex=%5Ctau)：**平均接受长度**——每轮验证里，target 平均「白送」多少个 draft token。越大越好。
- 
![](https://www.zhihu.com/equation?tex=T_%5Ctext%7Bdraft%7D)：draft 一轮的开销。越小越好。**自回归 draft（EAGLE 系、原生 MTP）的硬伤**：起草成本随 token 数线性增长，为压延迟只能做得极浅，质量上不去；而且越往后越是「拿没验证过的 draft token 继续外推」，误差累积，接受率断崖式衰减。

**DFlash 的破法**：用 **块扩散（block diffusion）一次前向并行吐出一整块草稿**，起草延迟几乎与块大小无关；再把 **target 隐状态注入 draft**，让小 drafter 始终强条件于大模型的上下文。于是 
![](https://www.zhihu.com/equation?tex=T_%5Ctext%7Bdraft%7D) 几乎不随块长涨，
![](https://www.zhihu.com/equation?tex=%5Ctau) 还能随 draft 深度 scaling。这就是前两篇的主角。

**这一篇的问题是**：DFlash 的这套「锚点 token + 一堆 mask + 注入 target 特征 + 一次性预测整块」的接口，遇到 DeepSeek-V4 这种新架构会怎样？

1. DeepSeek-V4 带来的新难题

1.1 原生 MTP：起点高，但尾巴塌
DeepSeek-V4 自带 **MTP（Multi-Token Prediction）** 模块，天然可以当 drafter。但它是**顺序（自回归式）**地从「未经验证的 draft token」继续往后推，于是误差沿位置累积——**第 0、1 位接受率很高，越靠后掉得越狠**。

![](https://pic1.zhimg.com/v2-0c2efe919d27902d3706eb690d53e4b4_r.jpg)六个 draft 位置上 HyperDFlash vs MTP 的逐位接受率（论文 Figure 1）这张图是全文的动机图，把问题讲得很直白：

- **橙色（MTP）**：Pos0 约 91% → Pos1 约 68% → Pos2 掉到约 33% → Pos3 约 13% → Pos4/Pos5 几乎归零（~4% / ~1%）。典型的**断崖式衰减**。
- **蓝色（HyperDFlash）**：Pos0 约 88%（起点甚至比 MTP 略低一点点），但之后是**平滑缓降**：~72% → ~58% → ~47% → ~39% → ~31%。关键不在第 0 位谁更高，而在**整条曲线的尾巴塌不塌**。决定加速比的是「能连续接受多少个」，HyperDFlash 靠**尾部不塌**赢得了更长的可接受前缀——这正是块级一次性预测（DFlash 范式）相对自回归 MTP 的结构性优势。

1.2 直接把 DFlash 搬过来？两重错配
那直接上 vanilla DFlash 不就行了？**不行。** DeepSeek-V4 用的是 **多超连接（Multi-Hyper-Connection, MHC）残差流**：每个 token 在预测前**不是**用单一隐状态表示，而是由**多条并行残差路径**表示，这些路径要由 target 自带的 `hc_head` 模块在 LM head 之前**坍缩**成一条。

通用 DFlash 直接套上去，会撞上两重错配：

错配通用 DFlash 的做法为什么不对条件信号错配用「聚合的中间层特征」当条件偏离了 target 真正用于预测的最终状态，还多了冗余计算压缩方式错配用一个稠密线性投影把多路径残差压成一条完全忽略了 target 原生的、输入相关的路径聚合机制实验也印证了这点：**vanilla DFlash(6) 在 DeepSeek-V4 上 τ 只有 2.14、加速 1.73×，反而不如原生 MTP(3) 的 2.25×。** 块级起草的红利，在架构不对齐时直接蒸发了。

HyperDFlash 的整个设计，就是冲着这两重错配去的。

2. HyperDFlash 的三招
先看整体流水线（论文 Figure 2）。

![](https://picx.zhimg.com/v2-10efcdec7243b5cdd7fb319209b1c42d_r.jpg)HyperDFlash 架构总览（论文 Figure 2）从左到右读这张图：

- **左侧蓝块「Target Final MHC Block」（冻结）**：DeepSeek-V4 的最后一个 MHC 块。底部 
![](https://www.zhihu.com/equation?tex=x_l) 是多路径残差（画成堆叠卡片强调「多路径」），经 **Manifold-Constrained HC (MHC)** 得到 
![](https://www.zhihu.com/equation?tex=x_%7Bl%2B1%7D)，这是**坍缩之前**的多路径残差。左上角的 `HC_head` 和 `LM_head` 也是冻结的——它们是 target 自己用来坍缩并预测的模块。
- **`init` 箭头**：target 的 `HC_head` 权重通过 `init` 初始化中间的 **HC Gate reducer**——这就是「继承（Inherited）」的来源。
- **中间黄块「HC Gate reducer」（可训练）**：接收前坍缩多路径残差 
![](https://www.zhihu.com/equation?tex=x_%7Bl%2B1%7D)，经 **HC Gate Projection** 算出每条路径的标量门控 
![](https://www.zhihu.com/equation?tex=g%3D%5Bg_1%2Cg_2%2Cg_3%2Cg_4%5D)（图里 m=4 条路径），逐元素乘 
![](https://www.zhihu.com/equation?tex=%5Codot) 加权求和，得到压缩后的单路径表示。
- **右侧黄块「Draft Layer」（可训练）**：轻量 DFlash drafter。底部输入是 **1 个锚点 token（粉）+ 多个掩码 token（蓝）**，过 **Bidirectional Attention + MLP**，并以 **cross-attn** 把压缩后的 target 残差作为上下文注入；可堆叠多层。
- **顶部输出**：drafter 过冻结的 `LM_head` 一次性吐出整个 draft 块，交给 target 并行验证。一句话：**drafter 不再自己从零学怎么压多路径残差，而是直接「继承」target 的门控坍缩方式，并以 target 真正用于预测的前坍缩残差为条件。** 下面拆开三招。

2.1 第一招：前坍缩残差条件（Pre-Collapse Residual Conditioning）
传统 drafter 依赖「聚合的中间层特征」，既有冗余计算，又和 MHC 多路径残差流在结构上对不齐。HyperDFlash 改用 **target「最终、坍缩前」的 MHC 多路径残差状态** 作为 target 侧条件特征，而 drafter 输入仍沿用标准的「锚点 + 掩码」块格式。

这样做有两个好处：

- **保留原生多路径语义**，让 drafter 的条件信号与 target 的预测路径保持一致；
- **零额外开销**——这个前坍缩残差**本来就为 MTP 缓存了**，复用它不需要任何额外前向。
2.2 第二招：继承式 HC-Gate 压缩器（全文最核心）
要把多路径残差压成一条，关键是搞清楚 **target 自己是怎么压的**。答案是：它**不是**静态线性映射，而是**输入相关（input-dependent）的逐路径门控**：

![](https://www.zhihu.com/equation?tex=%5Ctilde%7Bx%7D_t+%3D+%5Cmathrm%7BRMSNorm%7D%5Cbig%28%5Cmathrm%7Bvec%7D%28H_t%29%5Cbig%29%2C%5Cquad+%5Calpha_t+%3D+%5Csigma%5Cbig%28W_f%5C%2C%5Ctilde%7Bx%7D_t+%2B+b%5Cbig%29%2C%5Cquad+y_t+%3D+%5Csum_%7Bj%3D1%7D%5E%7Bm%7D%5Calpha_%7Bt%2Cj%7D%5C%2CH_%7Bt%2Cj%7D)

其中 
![](https://www.zhihu.com/equation?tex=W_f%5Cin%5Cmathbb%7BR%7D%5E%7Bm%5Ctimes+md%7D)，每个 
![](https://www.zhihu.com/equation?tex=%5Calpha_%7Bt%2Cj%7D) 是作用于**整条路径** 
![](https://www.zhihu.com/equation?tex=H_%7Bt%2Cj%7D) 的**标量 sigmoid 门**（注意是各路径独立的 sigmoid，而不是跨路径的 softmax）。也就是说，给每条路径打一个 0~1 的「该信多少」的分，再加权合起来。

**通用 DFlash 的静态 
![](https://www.zhihu.com/equation?tex=fc%3A%5Cmathbb%7BR%7D%5E%7Bmd%7D%5Cto%5Cmathbb%7BR%7D%5E%7Bd%7D)**（DeepSeek-V4-Flash 上约 **67M 参数**）把多路径残差当成一根长向量、从零学一个稠密压缩——**根本表达不出这种输入相关的门控**，从一开始就和 target 错配。

HyperDFlash 的做法：用**和上式相同的输入相关门控形式**实例化一个 drafter 侧压缩器（额外加一层轻量逐路径 RMSNorm），并**用 target 的 `hc_head` 权重直接初始化门控参数**。于是 drafter 起步就站在一个「已经和 target 预测路径对齐」的坍缩上：

维度通用 fc 压缩器继承式 HC-Gate 压缩器坍缩机制稠密线性投影门控逐路径聚合可训练参数67M65K（约小 3 个数量级）权重初始化随机继承自 target 的 hc_head与 target 对齐从零学习天生对齐论文反复强调一个点：**参数量骤降是「架构对齐」的副产物，而不是目标本身。** 该压缩器是专用的——它假设来源是 `pre_hc_head`、且 target 与 draft 隐藏维度匹配；一旦不满足，就回退到通用 fc 投影。

2.3 第三招：LM-Head KL 蒸馏（只精修早位）
标准交叉熵（CE）只用 one-hot 离散标签监督，浪费了 target 语言模型建模的**整个概率分布**。HyperDFlash 加了一个辅助 **KL 蒸馏** 目标：用 target 的 LM head 在**已缓存的隐状态**上产生软监督信号（同样**无额外前向开销**）。

对齐方式：位置 
![](https://www.zhihu.com/equation?tex=p) 的 target 隐状态 
![](https://www.zhihu.com/equation?tex=h_p) 编码上下文 
![](https://www.zhihu.com/equation?tex=%5B0%3Ap%5D)，
![](https://www.zhihu.com/equation?tex=%5Cmathrm%7BLMHead%7D%28h_p%29) 预测第 
![](https://www.zhihu.com/equation?tex=p%2B1) 个 token。对锚定在位置 
![](https://www.zhihu.com/equation?tex=a) 的块，draft 第 
![](https://www.zhihu.com/equation?tex=k) 位（预测 
![](https://www.zhihu.com/equation?tex=a%2Bk)）的老师就是 
![](https://www.zhihu.com/equation?tex=%5Cmathrm%7BLMHead%7D%28h_%7Ba%2Bk-1%7D%29)，学生是 draft logits 
![](https://www.zhihu.com/equation?tex=z_k)：

![](https://www.zhihu.com/equation?tex=%5Cmathcal%7BL%7D_%7BKL%7D+%3D+%5Cfrac%7BT_%7BKD%7D%5E2%7D%7BP%7D%5Csum_%7Bk%3D1%7D%5E%7BP%7D%5Cmathbb%7BE%7D%5Cbig%5B%5Cmathrm%7BKL%7D%28p_k%5E%7BT_%7BKD%7D%7D+%5C%2C%5C%7C%5C%2C+q_k%5E%7BT_%7BKD%7D%7D%29%5Cbig%5D%2C%5Cqquad+%5Cmathcal%7BL%7D+%3D+%5Cmathcal%7BL%7D_%7BCE%7D+%2B+%5Calpha%5C%2C%5Cmathcal%7BL%7D_%7BKL%7D)

**为什么只蒸馏前几位？** 这是论文一个很关键的洞见：

- **k=1 时**，老师和学生条件相同（都基于 
![](https://www.zhihu.com/equation?tex=%5B0%3Aa%5D)），老师只是补上了 CE one-hot 缺失的完整分布，**最可靠**；
- **k≥2 时**，老师额外看到了**真实的中间 token** 
![](https://www.zhihu.com/equation?tex=a%2B1%2C%5Cdots%2Ca%2Bk-1)，而 drafter 在那些位置只看到掩码 token、本应建模的是这些位置的**边缘分布**。强行去匹配老师那种「逐样本、很尖锐」的条件分布，会带来**高方差、相互冲突的梯度**。所以作者只对**前两位**施加 KL，且用保守的 
![](https://www.zhihu.com/equation?tex=%5Calpha)（通常 0.1~0.2）。再加上当前实现里 KL 老师对 MHC 路径用的是**均值池化**（而非门控 `hc_head` 坍缩）这一偏差，更要把该辅助项的权重压小。

3. 实验结果
**设置速览**：target 是 DeepSeek-V4-Flash（单一 target）；两阶段训练（Stage 1 约 30 万条通用指令/对话/代码，Stage 2 约 15 万条任务导向数据，均 5 epoch、8×H20）；评测覆盖数学（GSM8K / MATH-500 / AIME25）、代码（HumanEval / MBPP / LiveCodeBench）、对话（MT-Bench）；吞吐全部在 **vLLM** 上测；报告 Non-think 与 Think-high 两种模式，温度 0 与 1。

四种 draft 配置：**MTP(3)**（原生 MTP 部署点，3 步）、**MTP(6)**（原生 MTP 但对齐到 6 步预算）、**Vanilla DFlash(6)**（通用 DFlash 直接适配）、**HyperDFlash(6)**（三招全开）。指标是相对「仅 target 自回归解码」的**加速比**与**平均接受长度 τ**。

3.1 主表（平均列）
**Non-thinking 模式：**

方法T=0 加速比T=0 τT=1 加速比T=1 τMTP (3)2.25×2.932.05×2.76MTP (6)1.76×3.081.54×2.89Vanilla DFlash (6)1.73×2.141.59×2.07HyperDFlash (6)2.80×3.692.46×3.45**Think-high 模式：**

方法T=0 加速比T=0 τT=1 加速比T=1 τMTP (3)2.11×2.761.96×2.56MTP (6)1.60×2.891.46×2.65Vanilla DFlash (6)1.57×2.011.49×1.91HyperDFlash (6)2.53×3.362.25×2.97
3.2 各基准明细（Non-think，T=0，HyperDFlash(6)）
基准GSM8KMATH-500AIME25HumanEvalMBPPLCBMT-Bench加速比3.80×2.93×2.62×2.74×3.02×2.38×2.07×τ4.043.953.434.294.013.402.72
3.3 四个关键观察

- **全面超越原生 MTP 部署点**。Non-think、T=0 下，平均接受长度从 MTP(3) 的 2.93 提到 **3.69**，平均加速从 2.25× 提到 **2.80×**。
- **同等 6 步预算下依然领先**，说明收益**不是靠「多草拟几个 token」换来的**：相对 MTP(6)，τ 从 3.08 → 3.69、加速 1.76× → 2.80×。反过来，把原生 MTP 单纯加长到 6 步（MTP(6)）会因尾部接受率太低而**拖慢**——加速比从 MTP(3) 的 2.25× 掉到 1.76×。
- **远超 Vanilla DFlash**。Vanilla DFlash(6) 的 τ 只有 2.14，**直接套 DFlash 对 DeepSeek-V4 是不够的**——MHC 感知的条件与路径压缩才是块级投机解码生效的关键。这条对照，等于把「架构对齐」的价值单独量化了出来。
- **跨场景稳健**，代码与数学收益最大，开放式对话（MT-Bench）收益最小——与「draft 越可预测、接受率越高」的一般规律一致。
4. 放到 DFlash → DDTree → HyperDFlash 这条线上看
把这三篇串起来，能看清块扩散投机解码这条线的演化逻辑：

DFlash        →  一次 forward 出整块草稿（解决「起草慢」+「上下文衰减」）
   │              —— 拧 T_draft 和 τ
   │
DDTree        →  把一次 forward 的 marginal 输出从「一条线」变「一棵概率最优树」
   │              —— 零参数纯算法，进一步拧 τ（tree verify）
   │
HyperDFlash   →  把 DFlash 块级起草「对齐」到 MHC/MTP 新架构（DeepSeek-V4）
                  —— 让块级范式在新架构上「能用且好用」
三者解决的是**正交**的问题，定位互不冲突：

方法改的是什么是否动 draft 网络DFlash「怎么用一次 forward 出整块草稿」是（块扩散 drafter）DDTree「拿到这块 marginal 后怎么把信息用尽」否（纯算法，verify 侧）HyperDFlash「块级起草怎么适配 target 的特殊架构」是（条件源 + 压缩器 + 训练目标）值得一提的是：**HyperDFlash 改的是「起草侧」，DDTree 改的是「验证侧」**，理论上两者可以叠加——在 DeepSeek-V4 上先用 HyperDFlash 把块级 marginal 起草做对，再用 DDTree 式的概率最优树把验证侧的接受长度榨干。这是个挺自然的后续方向（论文本身没做树验证，留了空间）。

5. 核心洞见 & 局限

三个可迁移的洞见

- **架构对齐 > 通用压缩**。当 target 自身有特殊的、输入相关的内部机制（如 MHC 的门控坍缩），让 drafter **继承并对齐**它，比从零学一个通用模块更有效。**质量是目标，参数骤降（67M → 65K）只是对齐的副产物。**
- **条件信号要对齐到「预测发生的地方」**。用 target 真正用于预测的**前坍缩残差**做条件，而不是随手抓中间层特征——而且复用 MTP 已缓存的状态，对齐和省钱可以兼得。
- **蒸馏不是越多越好**。只在「师生条件信息一致」的早位做 KL；后位老师看到真值中间 token、学生只看掩码，硬对齐会产生冲突梯度。**对监督信号的「适用范围」保持克制，本身就是一种设计。**
局限（作者自述）

- 只报了解码加速比，**缺少完整的生产级服务化拆解**（drafter 成本 / 验证成本 / batching 效应 / 端到端延迟），也没有与 MTP 的生产级延迟对比。
- **KL 目标没有单独消融**；且当前实现里 KL 老师对 MHC 路径用的是均值池化而非门控 `hc_head` 坍缩，存在偏差（靠压小权重缓解）。
- 继承式压缩器**有前提**（`pre_hc_head` 来源、target/draft 隐藏维匹配），否则回退通用投影。
- **只在单一 target（DeepSeek-V4-Flash）上验证**，且含不可公开复现的内部工作负载；在其他 MHC 架构上的泛化留待未来。
写在最后
如果说 DFlash 回答了「块扩散怎么一次出整块草稿」、DDTree 回答了「怎么把这块 marginal 的信息用尽」，那 **HyperDFlash 回答的是「当 target 换成 MHC 这类新架构，块级投机解码怎么不水土不服」**。

它的方法论其实朴素得有点反直觉：**不是给 drafter 加更强的通用能力，而是让它「认祖归宗」，去继承并对齐 target 自己的内部机制。** 结果是参数更少、对齐更好、接受长度更长。对所有想在「带特殊残差/路由结构的新模型」上做投机解码的人来说，这是一个很好的范例——**先看懂 target 自己是怎么算的，再决定 drafter 长什么样。**

 系列前篇：[新一代投机解码 DFlash 原理详解及 SGLang Spec V2/V1 实测](https://zhuanlan.zhihu.com/p/2050943022758630707)、[DFlash + DDTree：把 LLM 推理推到 8× 无损加速](https://zhuanlan.zhihu.com/p/2038002645848339789)。 图片来自论文 HyperDFlash（arXiv:2606.26744v1）Figure 1 / Figure 2。