---
title: (2 条消息) OpenAI o1复现——清华大学提出 ReST-MCTS*
date: "2025-09-27 00:00:00"
updated: "2025-09-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/OpenAI-o1复现——清华大学提出-ReST-MCTS_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/14200380598
---


打个小广告 ☻，知乎专栏**《大模型前沿应用》**的内容已经收录在新书**《揭秘大模型：从原理到实战》**中。感兴趣的朋友可以购买，多谢支持！♥♥

[![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_33b7de100ccc.jpg)广告

揭秘大模型：从原理到实战

京东

¥39.90

去购买​

](https://union-click.jd.com/jdc?e=jdext-1955201411202670849-0-1&p=JF8BAUwJK1olXwIEU15fCE4VBV8IHlIdXwEKU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYHXVZfD0MQHDZNRwYlI1hbEQJeXBR3BzMWGhsQAH0LJywhaEcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kMElMXWgQHV1xZDHsXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVVQIGV19dDUsXAG4LHF0UVAMKSF9BCHsUAm0NGFIdWAEEOltdCUsUAm8KElp7XwYDVVdZDkoRA18IK1glA2gDB1hfCRhDVgFUTVtIDQBGFzBeDEoeBGkKEmsXXAcAVm5tOBVBYhx-QxMSHgdAAikgbDNNYBJhExp0DmgAFxsPdT93QAZLE1NLIHNVCS1tDXsXBW8KKw)**

论文链接：[ReST-MCTS∗ : LLM Self-Training via Process Reward Guided Tree Search](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2406.03816)

GitHub 地址：[GitHub - THUDM/ReST-MCTS: ReST-MCTS*: LLM Self-Training via Process Reward Guided Tree Search (NeurIPS 2024)](https://link.zhihu.com/?target=https%3A//github.com/THUDM/ReST-MCTS)

项目地址：[ReST-MCTS*: LLM Self-Training via Process Reward Guided Tree Search](https://link.zhihu.com/?target=https%3A//rest-mcts.github.io/)

本文介绍一下清华的一篇文章： ReST-MCTS***，该方法通过**蒙特卡罗树搜索**（Monte Carlo Tree Search, **MCTS**）自动生成高质量的推理轨迹，并利用这些轨迹来训练**策略模型**（Policy Model）和**过程奖励模型**（Process Reward Model, PRM）。ReST-MCTS* 的核心思想是通过树搜索自动生成每个推理步骤的标签，从而避免了传统方法中对人工标注的依赖。

划重点：**训练过程奖励模型 PRM 不需要人工标注每步是否正确**。

下面我们就来详细介绍一下 **ReST-MCTS***。

### **简化版**

由于 Rest-MCTS* 的内容较多，为了便于理解，我们先给出一个简单的介绍。

首先介绍一下 Rest-MCTS* 的完整训练过程，训练完成之后，我们会得到一个策略模型和一个过程奖励模型。

#### 1. Rest-MCTS* 训练流程

- **step0：初始化训练过程奖励模型**
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2f57ad0ac9b5.jpg)

step0：初始化训练过程奖励模型

- **step1：MCTS* 算法生成多条推理路径**
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a0eb848a27d8.jpg)

step1：MCTS* 生成多条推理路径

- **step2：从 step2 返回的搜索树中生成训练数据，用于策略模型和过程奖励模型的自训练**
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_80be1ba0084c.jpg)

step2：从MCTS*结果中生成新一轮的训练数据（用于训练策略模型和过程奖励模型）

- **step3：重复 step1 和 step2，最终得到训练好的策略模型和过程奖励模型**

#### 2. Rest-MCTS* 推理

Rest-MCTS* 在推理回答新问题时，使用的是 MCTS* 搜索，过程和上面的 step1 类似。最终会选择质量值最大的一条路径。下图是具体流程：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3ede848eb254.jpg)

Rest-MCTS* 推理：新问题使用MCTS*搜索生成推理路径
### **详细版**

### 一、ReST-MCTS* 方法

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_4e13ed0582a7.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_60f7df01ce62.jpg)

图1：左边部分展示了过程奖励引导的树搜索。右边部分表示过程奖励模型和策略模型的自训练。备注：

- 图1中的 s_i 表示第 i 个推理步骤
- w 表示单步加权奖励（Weighted Reward for a Single Step），后面会介绍如何计算
- v 表示部分解决方案的价值，后面会介绍如何计算
- Q 表示问题
- Q_{i,s_{ 表示基于问题 Q_i 生成的推理路径 p_{t-1}=\left[ s_1,s_2,...,s_{t-1} \right] 
- v_{i}^{-} 表示错误推理路径对应的**质量值**，v_{i}^{+} 表示正确推理路径对应的质量值
$- \tau_{i}^{+} 和 \tau_{i}^{-} 分别表示正确路径和错误路径。$
**主要组件**

ReST-MCTS*方法由四个主要组件组成：

- **MCTS***：在过程奖励模型（PRM）引导下进行树搜索。
- **过程奖励模型（PRM）**：评估部分解决方案的质量，并指导 MCTS* 的搜索过程。
- **策略模型（Policy Model）**：为每个问题生成多个中间推理步骤。
- **LLM自训练（LLM Self-Training）**：使用 MCTS* 生成的推理轨迹，训练策略模型和过程奖励模型。

#### 1.1 基于搜索的推理策略（MCTS*）

**1.1.1 部分解决方案的价值（Value for a Partial Solution）**

**定义**：部分解决方案 p_{k}=\left[ s_1,s_2,...,s_{k} \right] 的价值 v_k 应满足以下基本性质：

- **有限限制**： v_k 被限制在特定范围内，通常为 \left[ 0,1 \right] 。
- **正确性概率**： v_k 反映了部分解决方案是完整且正确的概率。 v_k 值越高，表示质量越好或更接近正确答案。
- **步骤贡献**： v_k 不仅考虑步骤的正确性，还考虑其对最终答案的贡献。
**1.1.2 推理距离（Reasoning Distance）**

- **定义**：推理距离 m_k 表示从部分解决方案 p_k 开始，到达正确答案所需的最小推理步骤数。
- **作用**： m_k 反映了当前步骤的进展情况以及后续推理的难度。
**1.1.3 单步加权奖励（Weighted Reward for a Single Step）**

**定义**： w_k 表示单步加权奖励，用于反映当前步骤 s_k 的质量，基于常见的 PRM 奖励 r_{s_k} 和推理距离 m_k 。

$$**公式**： w_{s_k}=\frac{1-v_{k-1}}{m_k+1}\left( 1-2r_{s_k} \right),k=1,2,...\tag1$$

其中：

- v_{k-1} 是前一步 s_{k-1} 的质量值。
- m_k 是推理距离。
- r_{s_k} 是 PRM 对当前步骤的预测得分。
随着 k 的增加， m_k 减少，说明需要更少的推理步骤才能得到正确答案。这导致当前步骤的加权奖励 w_k  被赋予更高的权重。

**1.1.4 质量值 **v_k** 的更新公式**

质量值 v_k 融合了当前奖励 w_k 以及前一步 s_{k-1} 的质量值 v_{k-1} ，计算方式为：

\begin{equation} 	v_k=\left\{ 	\begin{aligned} 		&0 , & k=0\\ 		 &\text{max}\left( v_{k-1}+w_k,0 \right), & \text{else} 	\end{aligned} 	\right. \end{equation} \tag2质量值 v_k 和单步加权奖励具有如下性质：

- 如果从 p_k 开始的推理路径需要更多步数才能得到正确答案，那么单步加权奖励 w_k 较低。
- 单步加权奖励 w_k 和 PRM 奖励分正相关。
- v_k\rightarrow 1\Leftrightarrow r_{sk}\rightarrow 0,m_k=0 ，即当 s_k 达到正确答案时， v_k 收敛到上界 1。
基于 v_k 和 w_k 的特征，一旦我们有了精确的 PRM 和 m_k 的预估，我们就可以直接预测部分解决方案 p_k 的质量值 v_k 并引导搜索。

**备注**：论文中并不是分别训练模型来预测 r_{s_k} 和 m_k ，而是简单地训练一个过程奖励模型 V_{\theta} 来预测 v_k ，作为常见 PRM 的一种变体。由于奖励 r_{s_k} 已经结合到 v_k 的计算中，因此不需要单独训练奖励模型，从而为答案选择节省了大量工作。后面我们会介绍如何训练变种的过程奖励模型 V_{\theta} 。

**1.1.5 过程奖励模型引导的树搜索（MCTS*）**

MCTS* 是一种改进的蒙特卡洛树搜索算法，使用质量值 v_k 作为值目标，指导树搜索过程。MCTS* 包含了建树和树搜索的过程。

**具体步骤**：

- **节点选择 (Node Selection)**：从根节点开始，使用 UCB（Upper Confidence Bound）策略选择子节点。
- **思维扩展 (Thought Expansion)**：如果当前节点 C 的质量值 v_C **低于**阈值 l ，则扩展新的推理步骤。
- **贪婪蒙特卡洛展开 (Greedy MC Rollout)**：对扩展的节点进行模拟，选择最有价值的推理路径。
- **值回传 (Value Backpropagation)**：从选择的节点开始，回传质量值，更新父节点的质量值。

#### 1.2 过程奖励模型：训练集初始化

为了引导树搜索，那么我们就需要一个过程奖励模型，而为了训练一个过程奖励模型，那么就需要 \left( p_C,v_C \right) 。其中 p_C 是部分步骤， v_C 是目标值。

**1.2.1 数据来源**

- MATH数据集
- 科学数据集：使用 [SciInstruct](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2401.07950) 中的精简科学数据集 D_{\text{sci}}。该数据集由 11,554 个问题组成，每个问题都配有正确的分步解决方案。
**1.2.2 生成解决方案轨迹**

- **MATH 数据集**

- **模型选择**：[Mistral-7B: MetaMATH](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2309.12284)
- **生成方法**：

- 采用简单的广度优先搜索（Breadth-First Search, BFS）方式生成解决方案轨迹。
- 对于每个数学问题 q^{\left( i \right)} ，从初始状态开始，逐步生成推理步骤。
- 每次生成多个可能的推理步骤，形成一颗搜索树 T_q^{\left( i \right)} 。

- **验证答案**：

- 在生成搜索树 T_q^{\left( i \right)} 后，验证所有叶节点的答案是否正确。
- 对于每个叶节点，将其生成的最终答案与正确答案 a^{\left( i \right)}_{*}进行比较。
- 通过简单的字符串匹配或 LLM 判断，确定生成的答案是否正确。（在**附录F**中会介绍使用 LLM 判断）

- **科学数据集**：

- **模型选择**：ChatGLM2
- **生成方法**：

- **正样本构建**：对于 D_{\text{sci}} 中的每个问题 q^{\left( i \right)}\left( i=1,2,...,N \right) 和相应的解决方案 s^{\left( i \right)}=s^{\left( i \right)}_{1,2,...,K} ，提取所有部分解决方案以形成样本 d_k^{\left( i \right)}=\left[ q^{\left( i \right)},s_{1,2,...,k}^{\left( i \right)} \right]\left( k=1,2,..,K_i \right) 。
- **负样本构建**：，论文选择了一个比较差的模型 ChatGLM2 用来生成错误步骤，为了简化起见，**将 ChatGLM2 生成的步骤全部视为错误**。总共收集了 473.4k 个样本用于训练初始过程奖励模型。之后，使用所有样本 d_{k,j}^{\left( i \right)} (ChatGLM2生成的错误样本) 和 d_k^{\left( i \right)} 构建过程奖励模型的初始训练数据集 D_{V_0} 。

**1.2.3 构建训练样本**

从验证后的搜索树 T_q^{\left( i \right)} 中提取部分解决方案及其对应的目标质量值。

- 对于每个部分解决方案 p_k ，计算其推理距离 m_k (即从该部分解决方案开始到达正确答案所需的最小推理步骤数)。
使用硬估计（Hard Estimation）方法计算每个推理步骤的 PRM 奖励(其中 r_{s_k}^{HE} 表示该步骤是否能够到达正确答案)： r_{s_k}=1-r_{s_k}^{HE}\\ 

- 根据 m_k 和 r_{s_k} ，计算部分解决方案的质量值 v_k 和加权奖励 w_k 。
**1.2.4 目标值计算**

- **质量值计算**：使用以下公式计算部分解决方案的质量值： \begin{equation} 	v_k=\left\{ 	\begin{aligned} 		&0 , & k=0\\ 		 &\text{max}\left( v_{k-1}+w_k,0 \right), & \text{else} 	\end{aligned} 	\right. \end{equation}\\ 其中 v_{k-1} 是前一步的质量值， w_k 是当前步骤的加权奖励。
$$**加权奖励计算**：使用以下公式计算加权奖励： w_{s_k}=\frac{1-v_{k-1}}{m_k+1}\left( 1-2r_{s_k} \right),k=1,2,...\\ $$

**1.2.5 构建训练集**

将所有提取的部分解决方案及其对应的质量值 v_k 和加权奖励 w_k 组合成训练集 D_{V_{0}} 。这些数据用于训练初始值过程奖励模型 V_{\theta} ，使其能够评估部分解决方案的质量。

**1.2.6 目标值计算示例**

上面我们介绍了如何构建过程奖励模型训练数据的目标值（也叫质量值），下面我们通过一个例子，看一下具体的计算过程，如下图所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_89d1ec33a92d.jpg)

图2: 初始化构建过程奖励模型的目标值（v_i）在图 2 中，初始化的 m=3 ，即到达正确答案的最小步骤数是 3，质量值为 v=0 。

$$**最左边的 Step 1**：由于它的子节点为错误步骤，所以它仍然需要与父节点相同的步骤数才能得到正确答案（一步用于纠正计算错误），那么它到达正确答案的路径是：**一步纠正错误(最左边的Step1)到达中间的 Step 1 -> 中间的 Step 2 -> 中间的 Step 3（最终正确答案）**。因此最左边 Step 1 的 m=3 ，由于从这个节点开始没有正确答案，因此 r_{s_k}=1 。于是 :w=\frac{1-0}{3+1}\left( 1-2\times1 \right)=-0.25\\ v=\text{max}\left(0-0.25,0 \right)=0\\ $$

- **中间的 Step 1**：到达正确答案的最少步骤为 m=2 （中间 Step 2 -> 中间 Step 3）。由于这个节点在正确路径上，因此 r_{s_k}=0 ，于是：
$$w=\frac{1-0}{2+1}\left( 1-2\times0 \right)=0.33\\ v=\text{max}\left(0+0.33,0 \right)=0.33\\ $$

$$**最左边的 Step 3**：最左边的 Step 3 为错误节点，所以它仍然需要与父节点相同的步骤数才能得到正确答案（一步用于纠正计算错误），那么它到达正确答案的路径是：**一步纠正错误(最左边的Step3)到达中间的 Step 3（最终正确答案）**。因此最左边 Step 3 的 m=1 ，由于从这个节点开始没有正确答案，因此 r_{s_k}=1 。于是 :w=\frac{1-0.67}{1+1}\left( 1-2\times1 \right)=-0.17\\ v=\text{max}\left(0.67-0.17,0 \right)=0.5\\ $$

#### 1.3 过程奖励模型：初始化训练

上面我们提到已经构建好了训练集 D_{V_{\theta}}，下面就是如何进行训练。由于训练集中的标签（**质量值**）是连续值，因此不能再使用一般的交叉熵损失函数。论文中使用  AdamW 优化器和 MSE 损失进行优化，最终得到一个可以初步评估过程 p_k 价值的奖励模型： 

$\mathcal{L}_{\text{MSE}}=\mathbb{E}_{\left( q,p,v \right)\sim D_{V_o}}\left| V_{\theta}\left( p|q \right)-v \right|^2\tag4使用 14k 个数据样本进行评测，评估函数为：$

$$\text{Accuracy}=\frac{1}{t}\sum_{i=1}^{t}{\text{I}\left( \left| \text{clip}\left( V_{\theta}\left( p_i|q_i \right),0,1 \right)-v_i^{*} \right|$$

其中 t 是样本数量， q_i 是样本 i 的问题， p_i 是样本 i 的部分解， v_i^* 是样本 i 的目标值（也就是前面计算的质量值）。

初始化训练之后，过程奖励模型的准确率为 **69.3%。**

#### 1.4 自训练：过程奖励模型和策略模型的相互自训练

**迭代训练**：在每次迭代中，使用上一次迭代生成的数据训练过程奖励模型 V_{\theta} 和策略模型 \pi 。

**流程**：

- 使用策略模型 \pi_{S_{i-1}} 和过程奖励模型 V_{i-1} （**这个并没有用过程奖励模型的预估值**）进行 MCTS* 搜索，生成推理轨迹。
- 验证推理轨迹的正确性，并提取训练数据 D_{G_i} 和 D_{V_i}。
- 使用 D_{G_i} 训练策略模型，使用 D_{V_i} 训练过程奖励模型。
- 重复上述步骤，进行多轮迭代。
**备注：**关于过程奖励模型的具体原理和实现，可以参考下面的文章：

[](https://zhuanlan.zhihu.com/p/1246547399)

**下图是自训练的具体流程：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9363f4497174.jpg)

图3: 过程奖励模型和策略模型的相互自训练
#### 1.5 MCTS* 算法细节

在图 3 的步骤 5 中，MCTS*** 用于为策略模型和过程奖励合成训练数据，也是整个自训练算法中最核心的部分。下面我们介绍下技术细节。

**MCTS***（Monte Carlo Tree Search）是** ReST-MCTS*** 方法中的核心算法，用于生成高质量的推理轨迹。***MCTS***通过树搜索和过程奖励模型的结合，自动生成推理轨迹并评估每一步骤的质量。以下是 **MCTS* **的详细构造过程：

**1.5.1 树结构**

**搜索树**：**MCTS*** 使用一棵搜索树 T_q 来表示推理过程。树的每个节点代表一个部分解决方案 p_C，包含以下信息：

- **部分解决方案** p_C ：当前推理步骤的序列 \left[ s_1,s_2,...,s_k \right] 。
- **访问次数** n_C ：该节点被访问的次数。
- **质量值** v_C ：该节点的质量值，反映部分解决方案的正确性和完整性。
**节点表示**：每个节点 C 可以表示为一个三元组 C=\left( p_C,n_C,v_C \right) 。

**1.5.2 搜索过程**

**迭代搜索**：**MCTS*** 通过多次迭代（通常为50次）来构建搜索树，每次迭代包含以下五个阶段：

- **节点选择**：从根节点开始，选择一个子节点进行扩展。
- **自我判断**：判断当前步骤是否正确以及推理是否结束（结束标记：**EoI**）。这个是作为**基于质量值判断的补充**，目的是判断如果当前步骤是错误步骤，就终止搜索，避免不明智的探索。
- **思维扩展**：扩展新的推理步骤，生成新的节点。
- **贪婪蒙特卡洛展开**：对扩展的节点进行模拟，选择最有价值的推理路径。
- **值回传**：从选择的节点开始，回传质量值，更新父节点的质量值。
下面详细介绍下上面五个阶段的具体细节。

**1.5.3 MCTS* 的五个阶段**

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_e42aad715def.jpg)

图4：MCTS*算法流程**阶段一：节点选择 (Node Selection)**

- **目标**：从根节点开始，选择一个子节点进行扩展。
- **选择策略**：使用UCB（Upper Confidence Bound）策略选择子节点，公式如下：
$$UCB\left( C \right)=v_C+\epsilon \sqrt{\frac{\text{ln }n_{parent}}{n_C}}\tag6 其中：$$

- v_C ：当前节点 C  的质量值。
- n_{parent} ：父节点的访问次数。
- n_C ：当前节点的访问次数。
- \epsilon ：探索常数，用于平衡探索和利用。

- **选择过程**：从根节点开始，逐层选择 UCB 值最大的子节点，直到到达一个叶节点。
**阶段二：自我判断（Self-Critic）**

除了使用过程奖励模型预估的奖励值，论文中还使用了自我判断机制。

**尽管过程奖励模型为部分解决方案提供了准确的评估，但它无法始终如一地发出逻辑终止信号**，尤其是在推理模型得出错误结论时。因此，**即使生成了错误的最终答案，在这个节点下仍然可能进行进一步的探索**，导致搜索效率降低。因此，我们建议使用自我评判来提供额外的及时逻辑终止信号，以避免不明智的探索，并深入了解更深入的搜索。具体来说，我们在每个扩展阶段之前提示推理模型根据现有的部分解决方案 p 生成**推理结束**(EoI) 信号或提供下一步探索建议。思维扩展和贪婪蒙特卡洛扩展如果收到**EoI**信号，就跳过。否则，建议将在后续扩展阶段作为推理提示的一部分被利用。关于自我判断是如何实现的，我们放在后面的**附录 F **中。

**阶段三：思维扩展 (Thought Expansion)**

- **目标**：扩展新的推理步骤，生成新的节点。
- **扩展条件**：如果当前节点的质量值 v_C 低于阈值（通常设置为0.9），则扩展新的推理步骤。
- **扩展过程**：

$- 使用策略模型 \pi_{S_0} 生成新的推理步骤 s_{k+1,i} （ i=1,2,..,b ），其中 b 是生成的分支数。$
$为每个新生成的节点 C_i (上面的 s_{k+1,i} )分配质量值 v_{C_i} ，通过过程奖励模型 V_{\theta} 进行评估： v_{C_i}\leftarrow V_{\theta}\left( p_{C_i}|q \right) \\ $

- 将新生成的节点 C_i  添加到搜索树中。
**阶段四：贪婪蒙特卡洛展开 (Greedy MC Rollout)**

**目标**：对扩展的节点进行模拟，选择最有价值的推理路径。

**模拟过程**：

- 从扩展的节点 C' 开始，逐步生成推理步骤，并使用过程奖励模型 V_{\theta} 评估每一步的质量值。
- 记录模拟过程中获得的最大质量值 v_{max} 。
$- 使用加权平均方法更新节点的质量值： v_{C'}\leftarrow \alpha v_{C'}+\left( 1-\alpha \right)v_{max} \\ 其中 \alpha 是权重参数，通常设置为0.5。$
更新节点的访问次数： n_{C'}\leftarrow n_{C'}+1 \\ 

**阶段五：值回传 (Value Backpropagation)**

- **目标**：从选择的节点 C' 开始，回传质量值，更新父节点 C 的质量值。
- **回传过程**：

- 从选择的节点 C' 开始，逐层回传质量值，更新父节点的质量值。
$使用加权平均方法更新父节点的质量值： v_C\leftarrow \alpha v_C+\left( 1-\alpha \right)v_{C'}\\ $

更新父节点的访问次数： n_C\leftarrow n_C+1\\ 

**1.5.4 MCTS* 的终止条件**

- **终止条件**：当节点的质量值 v_C 达到或超过阈值（通常设置为0.9）时，认为该节点已经接近正确答案，终止搜索并返回该节点的部分解决方案作为最终输出。
- **终止信号(EoI)**：如果策略模型的自我判断生成了 EoI，则终止搜索。

#### **1.6 贪婪蒙特卡洛展开（Greedy MC Rollout）**

之所以要把**贪婪蒙特卡洛展开（Greedy MC Rollout）**单独讲一下，是因为在 ReST-MCTS* 方法中，**Greedy MC Rollout** 是树搜索过程中的一个关键步骤，用于对扩展的节点进行模拟，选择最有价值的推理路径。**Greedy MC Rollout **通过逐步生成推理步骤，并使用过程奖励模型评估每一步的质量，从而选择最有价值的推理路径。

以下是 **Greedy MC Rollout** 的详细实现过程：

- **初始化**

- **输入**：

- 当前节点 C ：包含部分解决方案 p_C=\left[ s_1,s_2,...,s_k \right] 。
$- 策略模型 \pi_{S_0} ：用于生成新的推理步骤。$
- 过程奖励模型 V_{\theta} ：用于评估每一步的质量值。
- 模拟步数限制 m ：模拟的最大步数。
- 分支数 d ：每次生成推理步骤时的分支数。

- **输出**：

- 最大质量值 v_{max} ：模拟过程中获得的最大质量值。
- 更新后的节点质量值 v_C 。

- **模拟过程**

- **初始化**：

- 从当前节点 C 开始，初始化部分解决方案 p=p_C 。
- 初始化最大质量值 v_{max}=0 。

- **模拟推理步骤**：对于每一步 k （最多 m 步）：

$- 使用策略模型 \pi_{S_0} 生成 d 个可能的推理步骤 s_{k+1,i} （ i=1,2,..,d ）。$
- 对于每个生成的推理步骤 s_{k+1,i} ，计算新的部分解决方案 p_i=\left[ s_1,s_2,...,s_k,s_{k+1,i} \right] 。
$- 使用过程奖励模型 V_{\theta} 评估每个新部分解决方案的质量值 v_i=V_{\theta}\left( p_i|q \right) 。$

$选择质量值最高的部分解决方案 p_{best} 和对应的质量值 v_{best} ： p_{best},v_{best}=\mathop{\text{arg max }}\limits_{p_i,v_i}{v_i}\\ $

- 更新部分解决方案 p\leftarrow p_{best} 。
- 更新最大质量值 v_{max}\leftarrow \text{max}\left( v_{best},v_{max} \right) 。

$- **更新节点质量值**：使用加权平均方法更新当前节点的质量值： v_C\leftarrow \alpha v_C+\left( 1-\alpha \right)v_{max}\\ 其中 \alpha 是权重参数，通常设置为0.5。$

**更新节点访问次数**：更新当前节点的访问次数： n_C\leftarrow n_C+1\\ 

**Greedy MC Rollout的作用**

- **选择最有价值的推理路径**：通过模拟推理步骤，Greedy MC Rollout 能够选择质量值最高的推理路径，从而提升推理轨迹的质量。
- **更新节点质量值**：通过模拟过程，Greedy MC Rollout 能够更新节点的质量值，为后续的搜索过程提供更准确的指导。
- **提升搜索效率**：Greedy MC Rollout 通过选择最有价值的推理路径，减少了搜索空间，提升了搜索效率。

### 二、实验结果

**参数设置**：

- 对于 ReST-MCTS*，判断搜索是否结束的质量值阈值设置为 l=0.9 
- 贪婪蒙特卡洛扩展的最大步数为 m=2 
- 迭代次数 T=50 
- 每次生成推理步骤的分枝数 d=3 
首先是在 MATH、GPQA、CEval-Hard 上的评测，如下图所示。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_700714aa555b.jpg)

图5：自训练方法效果对比下面是奖励模型的对比，奖励模型用于验证模型回答是否正确。在 MATH500 上的准确率还是比较低。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5eb0e09a2204.jpg)

图6：奖励模型准确率对比论文中提到，增加 MCTS* 采样次数，准确率会显著提升。此外，Rest-MCTS* 自训练两轮的效果会远好于一轮。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b95763e2f4ae.jpg)

图7：增加MCTS*采样次数以及自训练轮次，准确率会显著提升下图是不同搜索算法的时间和效果对比。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_404f1ad12ad8.jpg)

图8：不同搜索算法的时间和准确率
### 附录 F

前面我们有提到，ReST-MCTS* 在搜索过程中会使用策略模型**扩展新的推理步骤（阶段二：扩展思维）**，以及使用策略模型**判断当前步骤是否到达终点（自我判断self-critic）**。此外，在 MCTS 搜索结束后，还会使用策略模型**验证最终答案是否正确**。

要实现这些功能，就需要设计特殊的指令。下面是 ReST-MCTS∗ 在自训练过程中使用的指令示例。

- **节点扩展指令（生成新的推理步骤）**：用于 MCTS* 算法中为当前节点生成子节点。
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_e3859832c774.jpg)

图9：节点扩展指令（生成新的推理步骤）

- **自我批评指令：**用于生成 **EoI **信号或进一步搜索的建议。
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_59b495d54e63.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5702f88bba9e.jpg)

图10：自我批评指令（判断当前步骤是否到达最终答案）

- **LLM 结果验证指令：**当答案需要通过 LLM（论文中用的是 GPT-4）进行验证时，此指令在自训练的数据生成过程中被使用。
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_09527c2fe57a.jpg)

图11：结果验证指令
### 参考

[ReST-MCTS∗ : LLM Self-Training via Process Reward Guided Tree Search](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2406.03816)

[GitHub - THUDM/ReST-MCTS: ReST-MCTS*: LLM Self-Training via Process Reward Guided Tree Search (NeurIPS 2024)](https://link.zhihu.com/?target=https%3A//github.com/THUDM/ReST-MCTS)

[ReST-MCTS*: LLM Self-Training via Process Reward Guided Tree Search](https://link.zhihu.com/?target=https%3A//rest-mcts.github.io/)

[ReST-MCTS*：基于过程奖励引导树搜索的LLM自训练方法](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/ZtKZPezZu0KRRUFR6GcTTQ)

### 书籍推荐

最后，打个小广告。近期，由我和电子科技大学江维教授共同合作的新书：**《揭秘大模型：从原理到实战》**已经在京东上线。书中重点介绍了 GPT 系列模型、Llama 系列模型的架构和训练优化，感兴趣的可以去京东购买。

感谢各位知友！

[![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_6f6e99f381dd.jpg)广告

揭秘大模型：从原理到实战

京东

¥71.30

去购买​

](https://union-click.jd.com/jdc?e=jdext-1855716389458948096-0-1&p=JF8BAUgJK1olXwIFVFxeCUMfBV8IHlIdXwEKU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYHXVZfD0MQHDZNRwYlIgF3CSAVbiJyQD9IT1wPJHZdPS4hTkcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kKH1gVWwUFUVdeDnsXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVVAIGUl5aCkIfBmsBE14cXA4FSF9BCHsUAm0NGFIdWAEEOltdCUsUAm8KElp7XwYDVVdZDkoRA18IK1glA2gDB1lYD0tFVwFUH19GBwVbETBeDEoSAW8JElklXwcDVlxtOHtJVQ57bQNdWkUDXSU4SDYXdBJdGhJHO21sVh0YWjZjYyxhWFMdA3t3AwMuOE4n)