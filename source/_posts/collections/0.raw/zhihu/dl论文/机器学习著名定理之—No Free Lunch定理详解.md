---
title: 机器学习著名定理之—No Free Lunch定理详解
date: "2022-03-11 00:00:00"
updated: "2022-03-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/机器学习著名定理之—No-Free-Lunch定理详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/479235186
---


### 1. 引言

谈到机器学习一个非常著名的定理，那就不得不提No Free Lunch定理了。该定理核心思想是没有一种通用的学习算法可以在各种任务中都有很好的表现，需要对具体问题进行具体的分析。从原理出发去理解AI算法可以能够对AI相关的问题有更深刻的认识，像这种基于严格数学证明推导出的结论，尤其值得重视。翻阅了大量的相关材料力求让该定理的证明过程更加完整（需要注意的是该定理核心证明步骤中用到了一个修改版本的马尔可夫不等式），相关的材料列在文末。

### 2. No Free Lunch定理证明

<strong>定理1（No Free Lunch）：</strong>假定 A" role="presentation">A\mathcal{A} 是一个在域 X" role="presentation">X\mathcal{X} 的二分类任务中任意一个机器学习算法，其损失函数为 0\text{-}1 损失。令 n" role="presentation">nn 是一个大小为 |X|/2" role="presentation">|X|/2|\mathcal{X}|/2 的训练集，存在域 X" role="presentation">X\mathcal{X} 中的分布 D" role="presentation">D\mathcal{D}，则有：

$- 存在一个函数 f:X→{0,1}" role="presentation">f:X→{0,1}f:\mathcal{X}\rightarrow \{0,1\}，且有 LD(f)=0" role="presentation">LD(f)=0L_\mathcal{D}(f)=0。** $
$- 对于子列 S∼Dn" role="presentation">S∼Dn\mathcal{S\sim D}^n，则概率不等式 P(LD(A(S))≥:S∼Dn)≥" role="presentation">P(LD(A(S))≥:S∼Dn)≥P(L_\mathcal{D}(\mathcal{A}(\mathcal{S}))\ge : \mathcal{S}\sim\mathcal{D}^n)\ge  成立。$
 
证明：

$- 令 C" role="presentation">C\mathcal{C} 表示域 X" role="presentation">X\mathcal{X} 中大小为 2n" role="presentation">2n2n 的一个子集。主要的证明思路是只利用数据集 C" role="presentation">C\mathcal{C} 一半的数据样本点并不能给出剩下一半数据点的信息。假定 H" role="presentation">H\mathcal{H} 表示数据集 C" role="presentation">C\mathcal{C} 到标签集合 {0,1}" role="presentation">{0,1}\{0,1\} 所有可能的函数集合，且 T" role="presentation">TT 表示的是函数集合的基数，其中 H={f1,⋯,fT}" role="presentation">H={f1,⋯,fT}\mathcal{H}=\{f_1,\cdots,f_T\}，T=22n" role="presentation">T=22nT=2^{2n}。对于 H" role="presentation">H\mathcal{H} 中每一个函数假设，令 Di" role="presentation">Di\mathcal{D}_i 是 C×{0,1}" role="presentation">C×{0,1}\mathcal{C}\times\{0,1\} 中的分布：$

```text
Di({(x,y)})={mif y=fi(x)0otherwise

\mathcal{D}_i(\{(x,y)\})=\left\{\begin{array}{ll}m & \mathrm{if}\text{ } y=f_i(x)\\0& \mathrm{otherwise}\end{array}\right. \\
```


$进而可知存在函数 fi" role="presentation">fif_i，在数据分布 Di" role="presentation">Di\mathcal{D}_i 上则有 LDi(fi)=0" role="presentation">LDi(fi)=0L_{\mathcal{D}_i}(f_i)=0。$

2. 主要证明的关键在于即对任意的学习算法 \mathcal{A} 有：

$\max\limits_{i \in [T]}\mathbb{E}_{\mathcal{S}\sim \mathcal{D}_i^n}[L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}))]\ge 1 / 4 \\$

首先从 \mathcal{C}\times \{0,1\} 中采样出 n 个样本构造一个训练集，其中采样出的样本可以重复，进而可知有 k=(2n)^n 中可能的样本序列。令这些样本序列分别表示为 \mathcal{S}_1,\mathcal{S}_2,\cdots,\mathcal{S}_k。

$\mathcal{S}_j^i=((x_1,f_i(x_1)),\cdots,(x_n,f_i(x_n))) 表示的是函数 f_{j} 在样本序列 S_j 中的数据集合，则有：$

$$\mathbb{E}_{\mathcal{S}\sim \mathcal{D}_i^n}[L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}))]=\frac{1}{k}\sum\limits_{j=1}^k L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}^i_j)) \\$$

又因为 \mathrm{"maximum"}\ge \mathrm{"average"}\ge \mathrm{"minimum"}，所以则有：

$$\begin{aligned}\max\limits_{i\in [T]}\frac{1}{T}\sum\limits_{j=1}^k L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}_j^i))&\ge \frac{1}{T}\sum\limits_{i=1}^T\frac{1}{k}\sum\limits_{j=1}^kL_{\mathcal{D}_i}(\mathcal{A(\mathcal{S}_j^i)})\\&=\frac{1}{k}\sum\limits_{j=1}^k\frac{1}{T}\sum\limits_{i=1}^T L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}^i_j))\\& \ge \min\limits_{j \in [k]}\frac{1}{T}\sum\limits_{i=1}^T L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}_j^i))\end{aligned} \\$$

现固定 j \in [k]，令 \mathcal{S}_j=\{x_1,\cdots,x_n\}，C \backslash \mathcal{S}_j=\{v_1,\cdots,v_p\}，其中 p\ge n 是剩余没有采样的样本数。对于每一个函数 h:C \rightarrow\{0,1\}，i\in[T] 有：

$$\begin{aligned}L_{\mathcal{D}_i}(h)&=\frac{1}{2n}\sum\limits_{x \in C}\mathbb{I}(h(x)\ne f_i(x))\\&=\frac{1}{2n}\left(\sum\limits_{l=1}^n \mathbb{I}(h(x_l)\ne f_i(x_l))+\sum\limits_{r=1}^p \mathbb{I}(h(v_r)\ne f_i(v_r))\right)\\&\ge \frac{1}{2n}\sum\limits_{r=1}^p \mathbb{I}(h(v_r)\ne f_i(v_r))\\&\ge \frac{1}{2p}\sum\limits_{r=1}^{p}\mathbb{I}(h(v_r)\ne f_i(v_r))\end{aligned}\\$$

所以

$$\begin{aligned}\frac{1}{T}\sum\limits_{i=1}^T L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}_j^i))& \ge \frac{1}{T}\sum\limits_{i=1}^T\frac{1}{2p}\sum\limits_{r=1}^p \mathbb{I}(\mathcal{A(\mathcal{S}^i_j)(v_r)\ne f_i(v_r)})\\&=\frac{1}{2p}\sum\limits_{r=1}^p\frac{1}{T}\sum\limits_{i=1}^T \mathbb{I}(\mathcal{A}(\mathcal{S}^i_j)(v_r)\ne f_i(v_r))\\&\ge \frac{1}{2}\min\limits_{r \in [p]}\frac{1}{T}\sum\limits_{i=1}^T\mathbb{I}(\mathcal{A}(\mathcal{S}_j^i)(v_r)\ne f_i(v_r))\end{aligned} \\$$

对于给定的 r\in [p]，因为 T 是所有可能函数映射的基数，所以总有成对存在的 a,b\in [T] 有：

```text
\mathbb{I}(\mathcal{A}(\mathcal{S}^i_j)(v_r)\ne f_a(v_r))+\mathbb{I}(\mathcal{A}(\mathcal{S}^i_j)(v_r)\ne f_b(v_r))=1 \\
```


进而则有：

$$\begin{aligned}\mathbb{E}_{\mathcal{S}\sim \mathcal{D}_i^n}[L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}))] &= e \frac{1}{T}\sum\limits_{i=1}^T L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}^i_j))\\&\ge \frac{1}{2}\min\limits_{r \in [p]}\frac{1}{T}\sum\limits_{i=1}^T \mathbb{I}(\mathcal{A}(\mathcal{S}^i_j)(v_r)\ne f_i(v_r))\\&=\frac{1}{2}\cdot \frac{1}{T}\cdot \frac{T}{2}=\frac{1}{4}\end{aligned} \\$$

<strong>根据马尔可夫不等式的修改版可知，给定一个随机变量 X \in[0,1]，给定一个常数 a\in [0,1]，进而则有：</strong>

```text
\begin{aligned}\mathbb{E}[X]&=\int_0^1 x p(x)dx\\&= \int_0^a x p(x)dx + \int_a^1xp(x)dx\\&\le a \int_0^a  p(x)dx + \int^1_a p(x)dx\\&=a(1-p\{X\ge a\})+p\{X\ge a\}\\&=a+(1-a)P\{X\ge a\}\end{aligned} \\
```


马尔可夫不等式为：

$$P\{X\ge a\}\ge \frac{\mathbb{E}[X]-a}{1-a} \\$$

利用马尔可夫不等可知：

$$\begin{aligned}P(L_\mathcal{D}(\mathcal{A}(\mathcal{S}))\ge : \mathcal{S}\sim\mathcal{D}^n)&=\frac{\mathbb{E}_{\mathcal{S}\sim \mathcal{D}_i^n}[L_{\mathcal{D}_i}(\mathcal{A}(\mathcal{S}))]-}{1-}\\& \ge \frac{-}{1-}=\frac{1}{7}\end{aligned}\\$$

### 3. No Free Lunch和先验知识

训练一个分类器的时候经常会用到一些先验知识，那No Free Lunch定理与先验知识有什么关系呢？考虑一个ERM（Empirical Risk Minimization）分类器，其所有分类映射 X \rightarrow \{0,1\} 组成了集合 \mathcal{H}。这类映射集合 \mathcal{H} 缺乏先验知识，则根据No Free Lunch 定理可知，给定一个学习算法，会在一些学习任务中学习失败，所以可以推知，该类学习算法 \mathcal{H} 不是PAC（Probably Approximately Correct）学习的。

$<strong>定义1（PAC）：</strong>如果一个学习算法集合 \mathcal{H} 是PAC学习的，存在一个计数函数 m_{\mathcal{H}}:(0,1)^2\rightarrow \mathbb{N}。一个学习算法对于任意的 \epsilon,\delta \in(0,1)，任意的在域 \mathcal{X} 中的分布 \mathcal{D} 和任意的打标函数 f:\mathcal{X}\rightarrow \{0,1\}，则有该类学习算法数 m \ge m_{\mathcal{H}}，并存在一个学习算法 h，满足以下概率公式：$

$P(L_{(\mathcal{D},f)}(h)\le \epsilon)\ge 1-\delta \\$

根据PAC学习的定义和No Free Lunch定理可知，则有如下推论：

<strong>推论1：</strong>令 \mathcal{X} 是一个无限域集，\mathcal{H} 是所有 \mathcal{X}\rightarrow \{0,1\} 的函数集合，则 \mathcal{H} 不是PAC可学习的。

<strong>证明：</strong>该推论可以利用反证法来证明。假定 \mathcal{H} 是PAC可学习的。选取 \epsilon  和 \delta 。通过PAC的定义可知，一定存在学习算法 \mathcal{A}，其数量为 m=m(\epsilon,\delta)，对于任意在 \mathcal{X}\times\{0,1\} 上生成的数据分布，如果对于一些函数 f:\mathcal{X} \rightarrow \{0,1\}，使得 L_\mathcal{D}(f)=0，并且当 \mathcal{A} 在采样出 m 个样本的数据集合 S 上，有：

```text
P(L_\mathcal{D}\mathcal{A}(\mathcal{S}) \le \epsilon) \le 1 -\delta\\
```


然后由No Free Lunch定理可知，当  2m">|\mathcal{X}|> 2m，对于每一个学习算法，存在分布 \mathcal{D} 使得：

```text
 \epsilon) \ge \delta > \\">P(L_\mathcal{D}\mathcal{A}(\mathcal{S}) \ge > \epsilon) \ge \delta > \\
```


所以出现矛盾。

那要如何防止这种失败？通过使用对特定学习任务的先验知识，可以避免No Free Lunch定理所预见的风险，从而避免在学习该任务时那些导致失败的分布的出现，所以可知先验知识主要通过限制学习算法类\mathcal{H}的范围。

### 4. 误差分解

$令 h_{\mathcal{S}} 是一个 \mathrm{EMR}_{\mathcal{H}} 映射，则可以 \mathrm{EMR}_{\mathcal{H}} 误差可以由如下公式表示：$

$(h_{\mathcal{S}})=\epsilon_{\mathrm{app}}+\epsilon_{\mathrm{est}},\quad \epsilon_{\mathrm{app}}=\min\limits_{h\in \mathcal{H}}L_{\mathcal{D}}(h),\quad \epsilon_{\mathrm{est}}=L_{\mathcal{D}}(h_{\mathcal{S}})-\epsilon_{\mathrm{app}} \\$

$\mathrm{EMR}_{\mathcal{H}} 误差分解为两部分，一个是近似误差，另一个是估计误差。$

- <strong>近似误差：</strong>近似误差是一种归纳偏差，它不取决于训练样本集的大小，而是由所由训练出的分类器的映射所决定。增大映射的范围可以减小近似误差。在可实现性假设下，近似误差为零。然而，在不可知论的情况下，近似误差可能很大。** 
- 估计误差：<strong>近似误差和ERM预测值所获得的误差之间的差值。估计误差的产生是因为经验风险（即训练误差）只是对真实风险的估计，因此最小化经验风险的预测器只是最小化真实风险的预测器的估计。这种估计的质量取决于训练分类器的训练集大小以及复杂性。</strong> 
由于目标是将总损失降至最低，因此就需要面临着一种权衡，称为偏差-复杂性权衡。一方面，分类器集合 \mathcal{H} 越大（模型的容量过大，自由度过高）会减少近似误差，但同时可能会增加估计误差，因为丰富的 \mathcal{H} 可能会导致过度拟合。反之，一个非常小的集合（即模型容量不够大，或者没有涵盖到真实的目标函数）会减少估计误差，但可能会增加近似误差，或者换句话说，可能会导致拟合不足。No Lunch Theorem 定理指出，没有通用的学习算法，每个学习算法都必须被指定完成某项任务，并使用有关该任务的一些先验知识。

相关资料：

- <strong>https://www.youtube.com/watch?v=DxaK8OSnxvE&list=UUaJUsUVO8sj71H5gCVgh7sw&index=41</strong>** 
- https://www.youtube.com/watch?v=wilz_c07ImI&list=UUaJUsUVO8sj71H5gCVgh7sw&index=40**** 
- https://en.wikipedia.org/wiki/No_free_lunch_theorem**** 
- https://ti.arc.nasa.gov/m/profile/dhw/papers/78.pdf

#投 稿 通 道#

如何才能让更多的优质内容以更短路径到达读者群体，缩短读者寻找优质内容的成本呢？ <strong>答案就是：你不认识的人。</strong>

总有一些你不认识的人，知道你想知道的东西。PaperWeekly 或许可以成为一座桥梁，促使不同背景、不同方向的学者和学术灵感相互碰撞，迸发出更多的可能性。

PaperWeekly 鼓励高校实验室或个人，在我们的平台上分享各类优质内容，可以是<strong>最新论文解读</strong>，也可以是<strong>学术热点剖析</strong>、<strong>科研心得</strong>或<strong>竞赛经验讲解</strong>等。我们的目的只有一个，让知识真正流动起来。

<strong>来稿标准：</strong>

• 文章确系个人<strong>原创作品</strong>，未曾在公开渠道发表，如为其他平台已发表或待发表的文章，请明确标注

• 稿件建议以 <strong>markdown</strong> 格式撰写，文中配图以附件形式发送，要求图片清晰，无版权问题

• PaperWeekly 尊重原作者署名权，并将为每篇被采纳的原创首发稿件，提供<strong>业内具有竞争力稿酬</strong>，具体依据文章阅读量和文章质量阶梯制结算

<strong>投稿方式：</strong>

• 方法一：在PaperWeekly知乎专栏页面点击“投稿”，即可递交文章

• 方法二：发送邮件至：hr@paperweekly.site ，所有文章配图，请单独在附件中发送

• 来稿请备注即时联系方式（微信），以便我们在稿件选用的第一时间联系作者

• 您也可以直接添加小编微信（<strong>pwbot02</strong>）快速投稿，备注：姓名-投稿

### 关于PaperWeekly

PaperWeekly 是一个推荐、解读、讨论、报道人工智能前沿论文成果的学术平台。如果你研究或从事 AI 领域，欢迎在公众号后台点击<strong>「交流群」</strong>，小助手将把你带入 PaperWeekly 的交流群里。

<strong>加入社区：</strong>http://paperweek.ly

<strong>微信公众号：PaperWeekly</strong>

<strong>新浪微博：@PaperWeekly</strong>
