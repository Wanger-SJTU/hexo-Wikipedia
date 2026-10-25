---
title: 长文本外推——详解RoPE的功过是非
date: "2025-03-06 00:00:00"
updated: "2025-03-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/长文本外推——详解RoPE的功过是非/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/14369935885
---


现在开源社区对 RoPE 的评价是两种一边倒，要么只褒，要么只贬。更加遗憾的是，这些褒贬都站在 RoPE 原文的理论框架之下，缺少更多信息量。本文将站在波、频域、傅里叶变换的角度，在不一样的视角详解 RoPE 的功过是非。
### TL; DR

- <strong>功：</strong>RoPE 使用三角函数对语义编码进行变换，实现了可周期延拓的 Attention，为长度外推提供了可能性；
- <strong>过：</strong>RoPE 设定了过于理想的假设，即“Hidden States 的每一维只存在单一频率的语义”。由于这个假设在LM中并不成立，导致 RoPE 必须依靠微调、内插等算法才能发挥周期延拓性；
- <strong>是：</strong>RoPE 使用“周期性编码”或者说“频域编码”来改进 Attention，实现了长度外推；
- <strong>非：</strong>

- ① 基于 RoPE 的模型中，并非只有 Attention 才影响长度外推，线性层和激活函数也会产生影响（并且影响是负面的）；
- ② RoPE 的长距离衰减对长度外推并没有帮助，甚至可能有负面影响；
- ③ 许多工作认为 RoPE 本身存在高频和低频分量，但是这里的“高/低频”只是相对而言，因为RoPE的最高频率在数字域仍然属于低频段，这种低通滤波属性也部分帮助了长度外推；

### 引言

试想，如果<strong>语言模型（LM，Language Model）</strong>可以处理无限长度的输入文本，我们可以预先把所有参考资料都喂给LM，或许LM在应对人类的提问时就变得无所不能。这个畅想主要依赖的技术被称为检索增强生成<strong>（RAG，Retrieval-Augmented Generation）</strong>，在很多落地的LM产品中都有应用。 

但这个畅想被很多LM的不理想特性阻挠，其中之一是 LM 不擅于处理无限长度的输入。这个问题主要由两种原因导致：① 过长的文本会让每个词汇都显得过于渺小，导致 LM 无法精确地获取所需信息；② 受限于硬件资源，LM 训练时的输入窗长比较短，当惯了“井底之娃”，LM 无法理解“更辽阔的世界”中各个词汇之间的关系；（这两个问题都很重要，但本文只讨论第二个问题） 

针对第②个问题，研究者们通常从<strong>位置编码（PE，Position Embedding）</strong>的角度去解决。具体来讲，LM 会为输入文本中的每个词汇设置一个编号，用来区分不同词汇的位置。但是，在固定窗长下进行训练时，LM 可能产生过拟合，只学习到指定范围内的编号之间的关系，但是无法理解没学习过的编号和位置。那么，如果存在某种 PE，当 LM 只学习它的一部分编号之间的关系之后，就能自然而然地领悟更多编号之间的关系，就可以帮助 LM 缓解这个问题。 

### 周期延拓带来长度外推

“周期性编码”就恰好具备上面这个特点，因为每间隔一定距离，这类编码就会出现数值重复。于是，我们可以让LM学习一个周期内的词汇关系，因为PE在下一个周期呈现同样的变化规律，所以LM可以使用之前周期学习到的经验处理后面周期的词汇，实现<strong>周期延拓（Periodic Extension）</strong>。如果我们使用函数 h 表示这种处理能力，并假设 h 是具有频率 \omega 和周期 N_\omega=2\pi/\omega 的周期函数，那么自然有：

\widetilde{h_\omega}(n+N_\omega)=\widetilde{h_\omega}(n) (1)

所以这种能力可以被周期性地推广到更长的距离。 

#### 正弦位置编码（Sinusoidal Position Embedding）

其实，这类编码的先驱早在初代Transformer中就被提出，引入了正弦函数这种最常见的周期函数来编码不同的位置，这种编码也被称为<strong>正弦位置编码（SPE，Sinusoidal Position Embedding）</strong>。如果假设输入的 Hidden States 是向量 x_m，SPE 会依据向量所处维度 m 和所处位置 n 将它旋转：

$\tilde{f}(x_m, n)=x_me^{i\omega_mn} (2)$

$其中，旋转频率的取值为 \omega_m=\theta^{-2(k-1)/M}, k\in[1, 2, ...,M/2]，\theta 是人为设置的底数（如10000）。$

可惜的是，初代 Transformer 只在模型的第一层使用了 SPE，并且为<strong>语义编码（Semantic Embedding）</strong>和 SPE 设置了两个独立的 Hidden States，并让二者直接相加来得到后层的输入。这两种处理的弊端在于：① 随着前向传播，位置信息可能在后面的层逐渐丢失（毕竟位置信息通常没有语义信息重要）；② LM 只在区分位置的能力上实现了周期延拓，但是在处理语义信息的能力上并没有实现周期延拓（但后者才是 LM 最关键的能力）。 

#### 旋转位置编码（Rotary Position Embedding）

如果希望位置信息在前向传播过程中不丢失，那就在每一层都使用一遍位置编码。 

如果希望 LM 在处理语义信息的能力也实现周期延拓，最朴素的想法就是——让语义信息也随着位置进行周期性变化。这个想法实现起来也并不复杂，把语义编码和正弦位置编码相乘即可。 

结合上述两个处理之后，大名鼎鼎的<strong>旋转位置编码（RoPE，Rotary Position Embedding）</strong>就诞生了。如果给定第 m 维的 Query 向量 Q_m和 Key 向量 K_m，RoPE 将这些向量进行和 SPE 类似的旋转：

$\begin{cases}  \widetilde{q_m}(n)=Q_me^{i\omega_mn} \\  \widetilde{k_m}(n)=K_me^{i\omega_mn}  \end{cases} (3)$

这种旋转将为 Attention Weight 带来周期性。我们假设位置 n_a 和 n_b 的两个词汇距离为 n，那么他们之间的  Attention Weight 将满足：

$\widetilde{h_m}(n)=\widetilde{q_m}(n_a)\widetilde{k_m}^*(n_b)=H_me^{i\omega_m n} (4)$

$$h(n)=\sum\limits_{m=0}^{M-1}\widetilde{h_m}(n)=\sum\limits_{m=0}^{M-1}H_me^{i\omega_m n} (5)$$

可以看到，每一维的 Attention Weight 自带周期性，而整体的 Attention Weight 同样会继承这样的特性。所以理论上，RoPE 可以实现无限长度的周期延拓，这至少可以让LM处理语义的能力在一定长度内带来泛化。但奇怪的是，使用 RoPE 的 LM 依然难以直接在训练长度之外起效，必须依靠其他算法（如YARN）来辅助其进行外推。 

那么，到底是什么限制了 RoPE 的周期延拓，进而限制了 LM 的长度外推呢？ 

### 频谱损坏限制周期延拓

回顾刚刚的公式(1)和公式(4)后不难发现，“Hidden States的每一维只存在单一频率的语义”是周期延拓起效的前提。如果这个假设不成立，周期延拓将失效。我们假设维度 m 中除了频率 \omega_m，还存在其他频率 \omega_o，并且二者的占比满足1-\sigma:\sigma，那这一维度中的 Attention Weight 将变为： 

$h'_m(n)=H_m[(1-\sigma)e^{i\omega_mn}+\sigma e^{i\omega_on}] (6)$

显然，N_{\omega_m}不是频率 \omega_o 的周期，所以原本假设的周期性将被破坏： 

$$h'_m(n+N_{\omega_m})\neq h'_m(n) (7)$$

遗憾的是，在使用 RoPE 的 LM 中，这个假设只在 LM 的第一层中成立，但在后面所有层中都不成立。因为后面所有层中，每一维中都掺杂了除主频之外的其他频率分量，这个现象可以被称作<strong>频谱损坏（Spectrum Damage）</strong>。频谱损坏主要有三个来源：① 线性函数；②激活函数；③时域截断。 

注：上述结论成立的前提，是承认 RoPE 矢量化了 Hidden States，让 Hidden States 的每一维不再单纯是数字，而是和一个三角函数对应，作为这个三角函数的系数。这一假设将在文末的公式(12)~(13) 进行证明，我们不妨先认为这一假设成立。 

#### 线性函数

$如果我们假设线性层的权重为 W\in\mathbb{R}^{M\times M}，其对输入 X\in\mathbb{R}^M 进行处理得到输出 Y\in\mathbb{R}^M，那么每一维输出将由每一维输入的线性组合构成： $

$$Y_m=\sum\limits_{k=0}^{M-1}W_{km}X_k (8)$$

考虑到每一维输入所对应的频率是不一样的，那么 Y_m 将掺杂输入中的所有频率分量。

#### 激活函数

根据高等数学的知识，给定一个含有两个频率的函数 x(n)=\cos\omega_1n+\cos\omega_2n，以及任意一个与时间无关的非线性函数 g，x(n) 被函数 g 作用后得到的输出将存在多个频率分量，这些频率将是输入频率的线性组合： 

$g(x(n))=\sum\limits_{j\in\mathbb{N}}\sum\limits_{k\in\mathbb{N}}a_{j,k}\cos(j\omega_1+k\omega_2)n (9)$

这个结论可以通过泰勒展开进行简单证明（详见文末），也可以任意地推广到存在更多频率的情况。可以看到，经过线性层之后，每一维本就掺杂了多种频率。在经过激活函数之后，这种掺杂会变得更加严重。 

#### 时域截断

给定一个被截断为长度 N 的单频率函数 

$N \end{cases}">x_m(n)= \begin{cases} e^{i\omega_mn} &n\leq N \\ 0 &n>N \end{cases} (10)$

通过傅里叶变换可以得到（详见文末）这个函数的频谱是： 

$$X(\omega)=\alpha\delta(\omega_m)+\frac{\sin[(N-\alpha N_m)(\omega-\omega_m)]}{\omega-\omega_m} (11)$$

$$其中，\alpha=\lfloor\frac{N}{N_{\omega_m}}\rfloor是截断长度与周期长度相除后向下取整的整数值，\delta(\omega_m)是在 \omega_m 处无限大但积分为1、在其他位置取值均为0的奇异函数。$$

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_02b89fe419e8.jpg)

Sa函数示意图（中心频率等于0时）可以看到，时域截断会让主要频率 \omega_m 的强度向周围的频率扩散，降低信噪比。如果该函数的周期 N_{\omega_m} 大于截断长度 N，这个信噪比将变得很低，会极大地抑制对只要频率的学习。巧合的是，RoPE 中其实使用了大量频率低、周期长的分量，所以这个问题尤为严重。 

### 长度外推的关键——更好的频域鲁棒性

那么频谱损坏究竟是不是基于RoPE的语言模型无法实现长度外推的主要原因呢？如果是的话，这些问题又该如何解决？下面这篇论文给出了详细的理论分析，通过实验证明了频谱损坏确实是限制 RoPE 长度外推的关键原因。同时，这篇论文提出了<strong>傅里叶位置编码（FoPE，Fourier Position Embedding）</strong>来改善 RoPE 的频域属性，显著提高了长度外推能力。 

[](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2412.17739)

FoPE 的核心思想是“打不过就加入”。考虑到线性层和激活函数可以带来更强的表征能力，时域截断又是受到硬件限制无法改变，FoPE 索性就仍然保留了各层中的频谱损坏，转而提出了对于频谱损坏更加鲁棒的位置编码。鲁棒性的提升主要源于两方面：① 既然每一维中不可避免的混杂其他频率的分量，那就干脆在一开始就把每一维都建模成一个傅里叶级数（Fourier Series）。即使这样的建模不会避免频谱破坏，FoPE却可以在每一维中分解出更多频率的信息（利用三角函数的正交性），从而让更多的频率分量保持周期延拓性；② 既然极低频的分量周期过长，会导致这些频率分量的周期特性无法被学习到，那就将他们裁剪成频率为0的直流分量。考虑到直流分量的良好性质（既可以看作周期无限短，又可以看作周期无限长），这个新加入的频率既保证了周期性，又可以让每个词汇的信息向无限远的词汇传递； 

### 讨论——关于 RoPE 的误区

#### ❌ **RoPE 只给 Attention 内部带来位置信息

在以往的几乎所有工作中，研究者们都认为只有 Attention 会处理位置信息，而线性层和激活函数则只处理每个token的语义信息。这个观点非常符合直觉，因为只有 Attention 才会涉及不同 token 间的相似度计算，而线性层和激活函数的操作对不同 token 是完全等价的。

但是，RoPE 打破了这种等价性，因为 <strong>RoPE 为 Hidden States 引入了“波动性”</strong>。在 RoPE 的作用下，Hidden States 的每一维都与一个频率的正弦波相绑定，不同 token 之间的相互作用也将由这些正弦波进行周期性的传递。因此，虽然线性层和激活函数只对每个 token 自身的 Embedding 进行操作，但这种操作会被这些正弦波传递到其他的 token 那里。

于是，神奇的现象发生了：<strong>线性层和激活函数竟然也隐式地处理了位置信息！</strong>只不过这种处理是借由 token 之间的“波动性”进行传递。

那么，怎么能够形式化地描述出这些影响呢？上文中的公式(6)~(11)已经给出了解答。线性层和激活函数会为每一维带来杂频，从而干扰主频的传播，这会为长文本外推带来负面影响。

#### ❌ **RoPE 的远距离衰减对长文本外推有帮助

Roformer 的原论文中曾经指出，RoPE 可以带来远距离衰减——token 间的注意力权重会随着距离变远而逐渐衰减。虽然原论文并没有指出远距离衰减对长文本外推有帮助，后续的工作却把“远距离衰减”作为提升长文本外推的必要性质。

但是，经过初步的实验观察，<strong>远距离衰减对长文本外推并没有明显帮助，甚至会有负面影响！</strong>

一方面，RoPE 中频率接近0的极低频分量提供了远程衰减性（读者可自行画图验证）；另一方面，上文中的公式(10)~(11)指出这些极低频分量会对长文本外推带来极度负面的影响。所以，至少 RoPE 的“远距离衰减”对长文本外推没有帮助。再结合 FoPE 原论文中 Sec 5.5 中的拆解实验，可以基本验证 RoPE的远距离衰减甚至对长文本外推有负面影响。

#### ❌ **RoPE 中频率接近 1 的部分是高频段

RoPE的频率通常设置为 (0,1] （1可以取到、0会取比较接近的小数）。所以，现在的学术社区中通常将频率接近1的部分称为RoPE的高频段，频率接近0的部分称为RoPE的低频段。

但是，这个描述却很容易引起误解：<strong>因为数字域的最高频率其实是 \pi ，一个比3都要大的数字。所以，通常频率小于 \pi/2 才能被称作比较低。RoPE 只能算是数字域的低通滤波器！</strong>

同时，也正是RoPE的低通滤波特性，让Attention可以倾向于关注频率更低、波长更长的波，也就是关注距离更远的token之间的关系。这很可能是RoPE效果好的关键成因之一。

但是，错误地把频率为1就称为高频，容易限制学术社区对该算法的改进。基于RoPE的模型由于高频信息的缺失，通常对于短距离信息的捕捉并没有那么敏锐（随意颠倒一些相邻词汇的顺序，模型会给出接近的答案）。这个现象是好是坏仍有待探讨，但至少它可能会限制模型的推理能力和细节处理能力。

### 补充证明

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_e4f6762676ee.jpg)

傅里叶变换示意图
#### 证明 1：RoPE-based LM 的 Hidden States 是频谱系数

Hidden States 一般有两个维度，不妨设为 n 和 m 。其中，n\in[0,N-1] 通常与词汇一一绑定，N 代表句子长度。但是，m\in[0,M-1]到底有什么物理含义其实并不清楚。下面将证明，Hidden States中的每一个m分别对应一个频率的频谱系数。

给定一个有限长度的连续函数 x ，以及对于这个函数的等间隔采样序列 {x_n}:=x_0,x_1,...,x_{N-1}，<strong>离散傅里叶变换（DFT，Discrete Fourier Transform）</strong>将他们变换到了等间隔的频谱序列，而原信号可以由其逆变换恢复：

$$\begin{cases} X_m=\sum\limits_{n=0}^{N-1}x_ne^{-i2\pi\frac{n}{N}m} \\ x_n=\frac{1}{M}\sum\limits_{m=0}^{M-1}X_me^{i2\pi\frac{m}{M}n} \end{cases} (12)$$

其中， \omega_m=2\pi\frac{m}{M} 是变换得到的频率分量。经过DFT的变换，原函数 x 被表示为了有限个周期函数的线性组合，可以看作是对 x 的一种近似估计。

但是，只有当原函数x中恰好只存在这些频率时，这个估计才是完全无偏的。为了得到更加精确的估计，我们可以根据函数x的特性任意地选取频率 {\omega_m}:=\omega_0, \omega_1, ..., \omega_{M-1} 。这种推广版的DFT被称为<strong>非均匀离散傅里叶变换（NUDFT，Non-Uniform DFT）</strong>：

$$\begin{cases} X_m=\sum\limits_{n=0}^{N-1}x_ne^{-i\frac{M}{N}\omega_mn} \\ x_n=\frac{1}{M}\sum\limits_{m=0}^{M-1}X_me^{i\omega_mn} \end{cases} (13)$$

下面我们重温上文中介绍过的

$- 公式(4)：\widetilde{h_m}(n)=\widetilde{q_m}(n_a)\widetilde{k_m}^*(n_b)=H_me^{i\omega n}$
$- 公式(5)：h(n)=\sum\limits_{m=0}^{M-1}\widetilde{h_m}(n)=\sum\limits_{m=0}^{M-1}H_me^{i\omega n}$
不难发现，RoPE 隐式地实现了 NUDFT 的逆变换。所以，Attention 中的 Hidden States 可以被认为是时域信号，而 Attention 外部的 Hidden States 可以被看作是不同频率分量的频谱系数。其中，每一个m分别对应一个频率的频谱系数。这样的话，Attention 外的线性层和激活函数都将直接对频谱系数进行操作，产生频谱损坏。

#### 证明 2：非线性函数对频谱的影响

将任意一个非线性函数 g(x) 可以进行泰勒展开：

$g(x)=\sum\limits_{p\in\mathbb{N}}a_px^p (14)$

若输入是含有两个频率的函数 x(n)=\cos\omega_1n+\cos\omega_2n ，那么输出可以表示为：

$g(x(n))=\sum\limits_{p\in\mathbb{N}}a_p(\cos\omega_1n+\cos\omega_2n)^p (15)$

为了方便理解，让我们考虑 p=2 的最简单分量：

(\cos\omega_1n+\cos\omega_2n)^2=(\cos\omega_1n)^2+(\cos\omega_2n)^2+2\cos\omega_1n\cos\omega_2n (16)

$$根据积化和差 \cos\alpha\cos\theta=\frac{1}{2}[\cos(\alpha-\theta)+\cos(\alpha+\theta)] ，上式可以化作下面的形式：$$

$$(\cos\omega_1n+\cos\omega_2n)^2=1+\frac{1}{2}\cos2\omega_1n+\frac{1}{2}\cos2\omega_2n+\cos(\omega_1-\omega_2)n+\cos(\omega_1+\omega_2)n (17)$$

可以看到，除了最开始的频率 \omega_1 和 \omega_2 之外，还有很多其他频率产生。

#### 证明 3：时域截断单频率函数的傅里叶变换

给定一个矩形脉冲函数：

T \end{cases}">r(t)= \begin{cases} 1, |t|\leq T \\ 0, |t|>T \end{cases} (18)

它的傅里叶变换是Sa函数：

$$R(\omega)=\int^{T}_{-T}e^{-i\omega t}dt=2\frac{\sin(\omega T)}{\omega} (19)$$

$给定一个单频率函数 f(t)=e^{i\omega_mt} ，它的傅里叶变换是：$

$F(\omega)=\int^{+\infty}_{-\infty}e^{i\omega_mt}e^{-i\omega t}dt (20)$

这等价于频域的冲激函数：

\delta(\omega_m)= \begin{cases} 1, \omega=\omega_m \\ 0,\omega\neq\omega_m \end{cases} 

因为时域截断的单频率函数可以被看作是上述两个函数的乘积：

x(t)=f(t)r(t) 

所以这个被截断的单频率函数的傅里叶变化就是上文中所介绍的公式(11)。
