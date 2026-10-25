---
title: (2 条消息) 从ROPE到Yarn, 一条通用公式速通长文本大模型中的位置编码
date: "2025-03-22 00:00:00"
updated: "2025-03-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/从ROPE到Yarn,-一条通用公式速通长文本大模型中的位置编码/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/15311461897
---


从Qwen2.5到Deepseek V3, Yarn几乎已经是各家LLM做长文本外推的标配组件 （相比Pretrain微乎其微的资源消耗获得至少16倍的长度外推）。 然而我最近在和很多做LLM的朋友交流发现大家对长文本的认知还停留在ROPE的时代。本文尝试用一条通用公式，带你以最简洁的方式彻底理解ROPE及其演化的变种逻辑，梳理以下长文本外推的方法本质：

- ROPE
- Position Interpolation
- NTK-Aware Interpolation
- Dyanmic NTK Interpolation
- NTK-by-parts Interpolation
- Yarn
后续ROPE的各类变体会不断更新记录在本文，欢迎点赞关注追踪最新进展。

#### 1. 位置编码的通用公式

无论是ROPE还是它的所有变种，本质上都可以被以下公式所统一：

f′W(xm,m,θd)=fW(xm,g(m),h(θd))

f_W'(x_m, m, \theta_d) = f_W(x_m, g(m), h(\theta_d)) \\

这里：

-  x_m  是输入向量。
-  m  是位置索引。
$- θd" role="presentation">θd \theta_d  是频率参数。$
-  g(m)  和  h(\theta_d)  是可调函数，分别描述位置和频率的变换逻辑。
在原始 Transformer Self-Attention 中，通用公式中的  f_W  表示将输入向量  x_m  和位置相关信息（ g(m)  和  h(\theta_d) ）结合后，进行的进一步变换。具体来说：

```text
f_W(x_m, g(m), h(\theta_d)) = W(x_m + \text{PE}_m) \\
```


这里：

-  x_m : 输入向量。

```text
-  \text{PE}_m : 位置编码，具体由 \sin 和 \cos 构成，基于  g(m)  和  h(\theta_d)  计算：\text{PE}_m[2d] = \sin(m \cdot h(\theta_d)), \quad \text{PE}_m[2d+1] = \cos(m \cdot h(\theta_d)) \\ 
```

-  W : 线性投影矩阵，用于变换向量。
因此， f_W  具体对应的是将位置编码 \text{PE}_m 加到输入向量  x_m ，再通过投影矩阵  W  处理后， 输入self-attention经典公式前的部分。

这条公式背后隐藏的逻辑是：如何通过适配  g(m)  和  h(\theta_d)  来在固定上下文长度的限制下延展语言模型的能力。接下来，我们基于这条公式逐一拆解各个变种。

#### 2. ROPE：一切的起点

在Transformer模型中，位置编码是连接输入序列与模型结构的重要桥梁。<strong>Rotary Position Embedding (ROPE)</strong> 是一种基于旋转变换的相对位置编码方法，它以极其优雅的方式将位置索引转化为模型内部的旋转信息。其核心数学公式如下：

ROPE的定义可以直接映射到通用公式：

```text
g(m) = m 

h(\theta_d) = \theta_d 
```


因此，ROPE的具体实现为（这里求简只考虑二维情况）：

```text
f_W(x_m, m, \theta_d) =  \begin{bmatrix} \cos(m\theta_d) & -\sin(m\theta_d) \\ \sin(m\theta_d) & \cos(m\theta_d) \end{bmatrix} W x_m \\
```


其中：

-  x_m  是输入向量。
-  m  是输入向量的位置索引。
$-  \theta_d  是频率参数，定义为  \theta_d = b^{-2d/D}  。$
-  W  是映射矩阵，将输入向量投影到高维空间。

#### 2.1 复数空间的直观解释

为了更直观地理解这个公式，ROPE的旋转可以被视为复数域上的变换：

$f_q(x_m, m) = e^{im\theta} W_q x_m, \quad f_k(x_n, n) = e^{in\theta} W_k x_n \\$

其中，e^{im\theta} 是复数域中的旋转操作，W_q 和 W_k 是将输入向量投影到查询（query）和键（key）空间的权重矩阵。

在这种表示方式下，两个位置 m 和 n 的点积形式为：

$\text{Re}(f_q(x_m, m)^* \cdot f_k(x_n, n)) = \text{Re}(x_m^* W_q^* W_k x_n \cdot e^{i\theta(m-n)}) \\$

注意，点积中与位置 m 和 n 相关的部分仅依赖于它们的<strong>相对距离</strong> m-n。这意味着，ROPE天然具有对相对位置的敏感性，无需额外编码绝对位置。**

2.2 数学推导中的频率参数 \theta_d 

（注意这部分是理解后续各种ROPE变体的基础，所以在这里单独列了一个章节来讲述）
ROPE的核心亮点是每个隐藏维度的旋转频率由 \theta_d 决定。

\theta_d 定义为：

$\theta_d = b^{-2d/|D|} \\$

这里：

- b 是一个固定的基数（通常取 b=10000）。
- |D| 是隐藏层的维度数。
- d 表示隐藏层的某一具体维度。
频率参数 \theta_d 决定了每个维度的旋转速度：

对于低维度（即  d  值较小的维度），
 $\theta_d = b^{-2d/D}  更接近于 1<strong>。</strong>对于高维度（即  d  值较大的维度），$
 \theta_d  会迅速衰减到接近 0**。

旋转角度  m \cdot \theta_d  决定了频率，

- 当  \theta_d  <strong>接近 1</strong>（低维度）， m \cdot \theta_d  的变化较大，<strong>旋转更快</strong>。
- 当  \theta_d  <strong>接近 0</strong>（高维度）， m \cdot \theta_d  的变化较小，<strong>旋转更慢</strong>。
因此低维度具有更快的旋转（对应局部细节捕捉），高维度具有更慢的旋转（对应长距离依赖）。这种设计巧妙地结合了长距离和短距离的信息编码能力。

#### 2.3 为什么ROPE直接外推在长文本外推中受限？

尽管ROPE在预训练窗口范围内表现优异，其主要限制在于：

- <strong>频率不变性</strong>：\theta_d 在预训练时被固定，无法适应更长的上下文长度。
- <strong>频率分布的刚性</strong>：所有维度的频率分布固定，不支持动态调整，导致当序列长度超出预训练范围时，旋转编码出现混乱。
当上下文窗口从预训练的 L 扩展到 L' 时，相对位置 m-n 的值可能远超预期范围。此时，旋转频率无法捕捉新的位置信息，导致模型性能显著下降。

#### 3. Position Interpolation (PI)：均匀拉伸的位置插值，也叫线性内插

PI尝试通过重新定义  g(m) 将位置索引拉伸到预训练窗口内：

- g(m) = m/s，其中 s = L'/L 是上下文扩展比例。
- h(\theta_d) = \theta_d，保持频率参数不变。
这使得每个位置索引被均匀拉伸到预训练窗口内，公式变为：

$$f_W'(x_m, m, \theta_d) = f_W(x_m, \frac{m}{s}, \theta_d) \\ $$

<strong>优点</strong>：简单有效，训练开销小。<strong>缺点</strong>：对所有维度频率统一缩放，导致高频信息丢失，影响局部关系建模。

#### 4. NTK-Aware Interpolation：非均匀频率缩放，介于直接外推和线性内插之间的平滑方法

NTK-Aware方法对 h(\theta_d) 引入动态调整，g(m) 保持不变：

g(m) = m 

$h(\theta_d) = b^{-2d/|D|} \cdot s^{-2d/|D|} $

这里 d=0时，h(\theta_d) = 1 ，有没有 s都不影响，因此也叫直接外推。

$这里 d=|D|/2时，h(\theta_d) = b^{-1} \cdot s^{-1} ，变成了线性内插。$

所以该方法可以理解为介于直接外推和线性内插之间的平滑方法。 它主要通过对低频维度更大幅度地插值，高频维度保持不变，保留了更多高频细节。

<strong>优点</strong>：在未微调模型中显著提升长文本建模能力。<strong>缺点</strong>：部分频率超出预训练范围，可能引发性能不稳定。

#### 5. Dynamic Scaling：动态适配插值比例， NTK-Aware Interpolation升级版

Dynamic Scaling进一步动态调整 s 以适配不同上下文长度：

g(m) = m 

$h(\theta_d) = b^{-2d/|D|} \cdot (as-a+1)^{-2d/|D|} \tag{1} $

或者采用指数形式调整：

$h(\theta_d)  = b^{-2i/d} \cdot \exp(-a \cdot (2i + 1)^b) \tag{2} $

其中，参数 a 和 b 的取值决定了缩放函数的动态灵活性。且 a,b需要满足 a (d/2)^b = \log k，且 b 的推荐范围为 [0.625, 0.75]，公式 (2) 可有效提升上下文适配能力。

相比于传统线性内插方法，公式 (1) 和 (2) 差不多可以实现 <strong>1%-2% 的性能增益</strong>，其优点在于：通过 a 和 b 调整缩放范围，位置索引从 [0, l] 被映射到更合理的区间范围，避免传统方式中索引越大越不充分的问题。

#### 6.2 NTK-by-parts Interpolation：基于波长局部分段插值

$$- <strong>基于波长的维度分类</strong>：“NTK-by-parts”方法着重考虑RoPE公式中定义的波长\lambda_d。对于每个隐藏维度d，计算其波长\lambda_d = \frac{2\pi}{\theta_d} = 2\pi b^{\frac{2d}{|D|}}（其中\theta_d = b^{-2d/|D|}，b = 10000）。根据波长与原始上下文大小L的比值r(d)=\frac{L}{\lambda_d}，将隐藏维度分为不同类别。$$
- <strong>不同类别维度的插值策略</strong>： 

- <strong>高频维度（</strong> \beta">r(d) > \beta<strong>）</strong>：对于波长明显小于上下文大小的维度 (波长越小，频率越高)，这些维度被认为包含较多高频信息。不进行任何插值，直接保留原始频率，以避免高频细节的丢失（如局部位置关系破坏）。
- <strong>低频维度（</strong>r(d) <strong>）</strong>：当波长大于等于上下文大小 (波长越大，频率越低)，对低频维度进行线性插值，避免外推带来的位置混淆（如绝对位置偏移）。
- <strong>中间维度</strong>：对于介于上述两种情况之间的维度，采用一种混合策略，通过引入一个 ramp 函数\gamma(r)来确定插值程度。具体而言，这些维度的插值是在原始频率和拉伸后的频率之间进行线性插值，插值程度由\gamma(r(d))决定。

$$**根据上述策略，“NTK-by-parts”方法对RoPE的修改可以用以下公式表示： 定义g(m) = m，保持位置索引不变； h(\theta_d) = (1 - \gamma(r(d))) \frac{\theta_d}{s} + \gamma(r(d))\theta_d，根据维度的不同类别对频率参数进行相应的变换。其中，ramp函数\gamma(r)定义为：  \beta \\ 1, & if\ r \gamma(r) = \begin{cases}0, & if\ r > \beta \\ 1, & if\ r $$

核心优势： 与之前的PI和“NTK-aware”插值方法相比，“NTK-by-parts”方法在处理RoPE维度时有更强的针对性。PI方法对所有维度同等插值，容易丢失高频信息；“NTK-aware”方法虽然尝试通过改变频率缩放方式来缓解问题，但会导致某些维度的外推，产生“越界”值，影响模型性能。而“NTK-by-parts”方法通过根据波长区分维度并采用不同插值策略，能够更好地平衡高频信息保留和位置关系理解，实验中可以表现的更好。关于参数取值逻辑可以参考DeepSeekV3：α=1 和 β=32。

#### 7. Yarn (NTK-aware + NTK-by-parts + Dynamic NTK)

YaRN是基于NTK-aware方法的进一步拓展，通过结合温度缩放和NTK-by-parts插值技术，全面提升长文本外推能力。它核心解决的问题是线性内插导致的self-attention 点积的值增大。由于线性内插会改变旋转向量转动的幅度，原来距离较远的q,k点积由于旋转幅度变小，他们的点积结果会增大，进而导致Softmax操作过于“锐化”，使得注意力分布集中于少数位置，削弱模型对全局上下文的关注能力。 Yarn在 NTK-by-parts 基础上，引入注意力温度因子 t 来调整注意力分布：

$$\text{softmax}\left(\frac{q_m^T k_n}{t \sqrt{|D|}}\right), \quad \sqrt{\frac{1}{t}} = 0.1 \ln(s) + 1 \\ $$

优点**：

- 超低训练成本（0.1%预训练数据）。
- 几乎兼容目前所有主流的Transformer实现。
- 性能优越，无论是否微调均能在128k上下文中表现出色。

#### 8 实验

最后放几张Yarn中的实验结果感受一下, Yarn无论在资源利用率还是128K长度性能上都超过其他PI, NTK 类方法，
无怪Yarn成为目前Long Context LLM的标配。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8f55cdd59ee0.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_daf6232df536.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_946a027e050c.jpg)