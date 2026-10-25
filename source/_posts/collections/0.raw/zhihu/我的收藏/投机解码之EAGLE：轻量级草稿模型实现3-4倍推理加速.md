---
title: 投机解码之EAGLE：轻量级草稿模型实现3-4倍推理加速
date: "2025-07-04 00:00:00"
updated: "2025-07-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/投机解码之EAGLE-轻量级草稿模型实现3-4倍推理加速/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1924418553764901931
---


相关历史文章（有非常全面的理论推导，帮助大家更好地理解投机解码）：

[大模型推理加速之Speculative Decoding/投机解码(上)](https://zhuanlan.zhihu.com/p/1922687688307377206)

[大模型推理加速之Speculative Decoding/投机解码(下)](https://zhuanlan.zhihu.com/p/1922694145484498033)

### 写在前面

在投机解码内容分享中，我们提到选择与目标模型同系列的参数量小几个数量级的LLM作为草稿模型，就能比较好地平衡推理速度以及推理精度，从而获得一定的加速比。

但是，不是所有模型都能找到这样一个合适的草稿模型，而完全重新训练一个的代价又比较大，这种情况下又该怎么做呢？

带着这个疑问，我们一起来看今天分享的论文EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty[1]，这篇论文提出一种构建草稿模型的方法，核心思想是利用目标模型的feature，并在feature层面进行自回归，从而保证生成质量实现加速。

关键词：投机解码、Eagle、自回归、草稿模型

<strong>本文首发于：公众号：AI算法小喵</strong>

[投机解码之EAGLE：轻量级草稿模型实现3-4倍推理加速](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/8GHrSIeOJQVFAbSQ7JGi_Q)

### 1. LLM推理耗时原因

<strong>LLM推理阶段是受内存带宽限制的</strong>（所谓的memory-bandwidth bound。简单地说就是<strong>计算比IO操作快</strong>，所以每次推理的时间大部分其实是消耗在了数据搬移上，即把LLM的参数等从GPU搬到高速缓存上。显然这个<strong>问题的严重性会随着LLM规模的增大而增大</strong>。

传统的自回归解码是逐个token生成，每个解码步在生成下一个token都需要依赖前面已经生成的所有token，都需要重复搬移LLM的参数以及kv cache。也就是说，花了半天时间把计算需要的数据准备好，结果只出了一个token，下一次又继续这样的操作...

既然one-by-one很耗时，那么如果一次能生成多个token就能减少推理时间。假设生成长度是10，one-by-one需要解码10次，即LLM参数读取10次；假设一次可以生成5个token，那么只需要解码2次，只需要搬移LLM参数2次。在搬移所消耗的时间上，我们就可以变成以前的 \frac{1}{5}。

投机解码就是这样一种通过缩短推理步骤来进行推理加速的解决方案。

### 2. 投机解码

#### 2.1 回顾

<strong>投机解码是一种加速LLM的推理过程的方法，包括草稿、验证两个阶段</strong>：

- <strong>草稿阶段</strong>：用一个较小的 M_q（Draft Model：草稿模型）快速生成 \gamma 个token，就像打草稿一样。** 
- 验证阶段<strong>：用 M_p（Target Model/Main Model：目标模型/主模型）并行验证这些token，主要是通过比较二者的概率分布来决定接受或者拒绝。经过验证的token作为当前解码步的解码结果。</strong> 
因为草稿阶段用到的草稿模型比目标模型小得多，推理过程所消耗的时间几乎可以忽略，而验证阶段是并行的（只用调用一次目标模型），哪怕只有一个token被接受(实际生成了2个token)，都能实现加速。也就是说投机解码利用每个解码步中target model计算的并行性，减少了总的解码步数（减少了LLM参数的反复读写），从而实现推理加速**。

另一方面，投机解码能保证它的<strong>正确性</strong>，即结合投机解码从 M_q,M_p 中采样的token的分布和直接从 M_p 中采样的token的分布一致。也就是说，保证了生成文本的质量和直接从 M_p 生成相同。正所谓又快又正确。

#### 2.2 难点

投机解码中加速比：

$$\frac{1-\alpha^{\gamma+1}}{(1-\alpha)(c\gamma+1)} \\$$

$c 是调用一次 M_q、M_p 的耗时比，一定程度上衡量了 M_q 的规模；\alpha 是平均接受率，\alpha=E(\sum_x min(p(x),q(x)))=1-E(D_{LK(p(x),q(x))})，\alpha衡量了两个模型的近似程度。$

显然，哪怕没有这个理论公式，直觉上为了实现加速，M_q 的选择也是需要平衡 c 和 \alpha。换句话说，M_q 一方面要够小(够快)，另一方面生成的token也要尽量贴近目标模型的输出来保证验证阶段不会出现大量token被拒绝的情况，也就是要平衡推测精度(被接受的token数)与推测耗时。

在Fast Inference from Transformers via Speculative Decoding[2]一文中提到选择与目标模型同系列的参数量小几个数量级的LLM作 M_q 就可以达到比较好的 \alpha 和 c 的平衡，实验结果显示加速比可达到3左右。这种策略也就是<strong>Independent Drafting</strong>，独立的草稿模型。好处是可以直接利用现有的模型资源，不需要进行额外的训练。为什么可行呢？因为同系列的模型在模型的结构、所用的分词方法、训练语料和训练流程等方面都是相近的，这样的 M_q 天然就和 M_p 之间存在一定的“相似性“（alignment）。

但是，这种策略并不适用于小模型，比如 M_p 是7B左右的模型时无法找到一个合适的 M_q。完全重新训练一个代价又太大（语料需求大，训练耗时）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_67cf2c5ec863.jpg)

不同方法加速比对比针对这个问题，Eagle提出了一种构建 M_q 的方法，个人认为可以把Eagle分类到<strong>Self-Drafting</strong>，即<strong>利用自己进行“高效推测”</strong>。这类方法思想就是：既然M_p 够准确，那么就把它利用起来。比如在M_p 最后一层decoder layer之上引入多个额外的FFN Heads来推理multi next token；比如把最后一层decoder layer的输出作为M_q的输入，并在这上进行featuer层面的自回归(Eagle)...

### 3. Eagle

#### 3.0 一些定义

- t_i：第 i 个token** 
- e_i：第 i 个token经过embedding层后的向量化表征
 
- f_i：经过倒数第二层的隐藏层表征（feature），即在LM-Head层前的输出
 
- p_i：经过LM-Head后的第 i 个位置对应的token的概率分布，有：p_i=LM\_Head(f_{i-1})
 
- T_{i:j}=\{t_i,t_{i+1},...,t_{j}\}
 
- E_{i:j}=\{e_i,e_{i+1},...,e_{j}\}
 
- F_{i:j}=\{f_i,f_{i+1},...,f_{j}\}
 
作为对比，

自回归过程一轮：T_{1:j} \rightarrow E_{1:j} \rightarrow f_j \rightarrow p_{j+1} \rightarrow t_{j+1}

Speculative decoding一轮:

$- M_q 在草稿阶段生成：T_{1:j} \rightarrow \hat{P}_{j+1:j+\gamma}, \hat{T}_{j+1:j+\gamma}$
 
$- M_p 在验证阶段验证: T_{1:j+\gamma} \rightarrow P_{j+1:j+\gamma+1}$
 

$$- 接受概率：min(1,\frac{p_{j+1}}{\hat{p}_{j+1}})$$
 
$- 若拒绝，则调整分布重新采样并丢弃被拒绝token后的所有token：norm(max(0,p_{j+1}-\hat{p}_{j+1}))$
 

#### 3.1 Eagle核心思想

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a4f74a51e1c0.jpg)

Eagle的自回归上图展示了Eagle和其他方法最主要的区别，其实也就是Eagle的核心思想。lookahead、Medusa不熟悉没关系，我们直接看Speculative Decoding和Eagle：

- Speculative Decoding中，由 t_1,t_2,t_3 推出 t_4；然后由 t_1,t_2,t_3,t_4 推出 t_5。
 
- Eagle中，f_1,f_2 在 t_2,t_3 的辅助下得到特征 \hat{f}_3，再由 \hat{f}_3 推出 t_4；然后 f_1,f_2,\hat{f}_3 在 t_2,t_3,t_4 的辅助下得到特征 \hat{f}_4，再由 \hat{f}_4 推出 t_5。
 
如果说，Speculative Sampling的自回归是在token层面的，那么Eagle的自回归就是既在feature又在token层面<strong>。或者说是</strong>在feature层面添加了token信息的自回归<strong>，此时token起到</strong>辅助**作用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_886e6ff1757c.jpg)

其实加入token的信息是很自然的，因为feature层面进行自回归推 f_i 的最终目的是基于 f_i 推 p_{i+1}，从而采样出 t_{i+1}，而 t_i 在推 t_{i+1} 前是已知信息。在分享MTP时已经提过了，我们人说话是一个字一个字往外蹦的，有了前一个字的信息，推下一个字会更准确。

也就是说，不同的token带着当前的feature往不同的方向去推理下一个feature。比如上图中，我们基于 f_I 去推下一个feature时，am和always这两个可能的token对feature的引导是不一样的，一个引向了 f_{always}，另一个引向了 f_{am}，再经过 LM\_Head 后得到的是两个非常不同的分布：如果I后面的token是am，那么下一个token更可能是ready、excited；如果I后面是always，那么下一个token更可能是begin、look。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_16dd24cff16a.jpg)

不同输入加速比也许这个地方会产生一定的疑问，为啥这么麻烦，feature层面自回归也脱离不了token的信息，那为什么不直接token层面自回归？

个人觉得主要是因为 M_q 的规模非常小，完全由 M_q 在已经生成的token上来进行自回归，结果可能非常糟糕。一个如此小规模的模型拿什么去对齐 M_p，强行用的结果就是推理得快但大都推错，必然在验证阶段会被大量拒绝，等于做无用功。

既然不能，那么就<strong>利用 M_p 在推理时产生的中间结果</strong>，比如在进入LM_Head前的隐藏层表征（高维feature）。加上推理token其实就是计算出进入LM_Head前的隐藏层表征，然后送入LM_Head转换成token的概率分布，再采样。那么 M_q 只要保证在feature层面自回归推出的feature和 M_p 的一致，再用同一个LM_Head不就能在理论上保证推理的token的正确性了吗？

简单一句话，feature层面自回归是为了<strong>推得快的同时保证生成质量</strong>。

#### 3.2 Eagle模型结构及算法流程

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_672eab9b6672.jpg)

Eagle模型结构Eagle的模型结构非常简单，就三个模块：Embedding layer、Autoregression Head、LM Head。其中 Embedding layer、LM Head和target model共用，不用训练。下面看一看Eagle的输入和数据流。

- <strong>输入</strong>：** 

$- 特征序列 F_{1:n}=\{f_1,f_2,...,f_n\},F_{1:n}\in R^{n*h}$
 
- token序列 T_{2:n+1}=\{t_2,t_3,...,t_{n+1}\}
 

- 数据流<strong>：</strong> 

- 向量化：t_2,t_3,...,t_{n+1} 经过embedding layer后变成embedding序列 e_2,e_3,...,e_{n+1}
 
- 拼接：特征序列与embedding序列（错开一位）拼接，f_1',f_2',...,f_n'，其中 f_i'=concat(f_i,e_{i+1})
 
- 降维：因为拼接以后维度就是 [b,s,2h]，所以经过一层全连接层即FC层，降维到 [b,s,h]
 
$- 特征推理：一层decoder layer推测当前步的feature \hat{f}_{n+1}。$
 
$- token推理：利用LM Head获得下一个token的概率分布，即 \hat{p}_{n+2}=LM\_Head(\hat{f}_{n+1})，再利用特定的采样策略比如argmax等采样即可获得第 n+1 个token。$
 

 每一步中推理出的feature和token即 \hat{f}_{n+1}、t_{n+2} 将在下一步中作为增加的输入。也就是我们前面说的Eagle在特征和token两个层面进行自回归。另外，这里降维中的FC层和特征推理中decoder layer组合起来就是所谓的Autoregression Head（自回归头）。
 

#### 3.3 损失函数

前面说了，Eagle含三个模块，其中只有Autoregression Head需要训练，那么损失函数是什么呢？

首先，Eagle在feature层和token层进行自回归，那么自然地我们可以把我们的目标拆成两块儿，即feature准不准，token准不准：

- 针对feature准不准，可以比较从Autoregression Head出来的featurej即 \hat{f}_{i+1} 与从target model出来的对应feature即 f_{i+1} 相近程度，因为feature本身是一个向量，所以可以用L1 loss：
$$L_{reg} = Smooth L1(f_{i+1},\hat{f}_{i+1}) \\ \hat{f}_{i+1}=Draft\_Model(T_{2:i+1},F_{1:i}) \\$$

- 针对token准不准，可以比较LM_head由两个feature推理token的差异，所以可以用交叉熵损失，即：
$$L_{cls} = Cross\_Entropy(p_{i+2},\hat{p}_{i+2}) \\ p_{i+2}=LM\_Head(f_{i+1}) \\ \hat{p}_{i+2} = LM\_Head(\hat{f}_{i+1}) \\$$

最终的损失是这两个损失的加权和 L=L_{reg}+w_{cls} L_{cls}，其中权重 w_{cls}=0.1 平衡了这两个损失值的数量级差异。

#### 3.4 Eagle的tree-structured draft与其验证

除了在设计的Autoregression Head中引入target model的上下文特征从而实现feature层面的自回归外，Eagle在草稿构建上也有所不同**：

- 传统的Speculative Decoding在每个位置上只采样一个token，从而构成了一个<strong>链式结构的草稿序列</strong>，即<strong>chain-structured draft</strong>。** 
- Eagle则在每个位置上采样多个token，从而构成了多个草稿序列。通过共享前缀的方式可以将这多个候选token序列变成一个树形结构的草稿<strong>，即</strong>tree-structured draft<strong>，或者简称</strong>Token Tree<strong>。Token Tree的每一个分支就是一个草稿序列。</strong> 
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_154eda278c63.jpg)

Chain-structured draft vs Tree-structured draft如何采样多个token则是与采样策略有关。比如每一步采样 k 个可能的token，比如greedy采样策略下，就是top k个token，非greedy采样策略，就是随机采样 k 个token。

在验证时，通过引入tree attention**可以进行并行验证所有草稿序列，也就是并行的验证 Token 树中所有 Token 的正确性。

Token Tree很早之前就有文章提出了，不算新的东西，具体与Token Tree相关的内容就不在这里展开了。

### 4. Eagle Vs MTP in Deepseek-v3

Eagle其实和Deepseek-V3中的MTP非常像，都用到了 M_p 的最后一个隐藏层状态的信息，即<strong>都用了 M_p 出来的feature与错开一位的token的embedding拼接</strong>，然后再经过FC层降维，再经过一个模块（一层Transformer block），最后再经过LM_Head。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_029e0c39a474.jpg)

Eagle vs MTP in Deepseek-v3重点来看看二者的区别。如上图所示，除了在在拼接前加了Norm这种细节之外，最主要的不同点在于：

- MTP in Deepseek-V3在<strong>多步推理时是串行的</strong>，用到了多个MTP Module。每个MTP Module有自己的FC层和decoder。** 
- Eagle 在多步推理时是自回归的<strong>，仅用了一个模型做自回归推理。这个模型仅有一个FC层和一个decoder。</strong> 
另外，正因为在Eagle中只有一个模型，那么推多个next token其实只用进行一次prefill，后面都是decode。相反，对于MTP来说，每个MTP Module都要进行一次prefill，并且它们之间是串行的：

- 先进行 Main Model 的 prefill 拿到输出LM_Head前的隐层表征（feature）以及推理的新token后，才能进行第 1 个 MTP Module的 prefill；
 
- 拿到第一个 MTP 输出的feature以及新token后，才能进行第 2 个 MTP 的 prefill；
 
- ...
 
那么，每增加 1 个 MTP Module，就要多一次 prefill，多一份 kv cache。

### 总结

今天给大家分享了Eagle，一种利用目标模型的feature，并在feature层面结合token信息进行自回归的从而保证生成质量实现加速的草稿模型构建方法，并在结尾对比了与之非常相似的MTP。论文的实验部分，没有细看，留给大家线下精读了。

[1] EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty: *[https://arxiv.org/pdf/2401.15077](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2401.15077)*

[2] Fast Inference from Transformers via Speculative Decoding: *[https://arxiv.org/pdf/2211.17192](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2211.17192)*

版权声明**<strong>欢迎转载分享</strong>，<strong>请在文章中注明作者和原文链接，感谢您对知识的尊重和对本文的肯定。</strong>

**原文作者：AI算法小喵（知乎ID）
原文链接：[https://zhuanlan.zhihu.com/p/1924418553764901931](https://zhuanlan.zhihu.com/p/1924418553764901931)
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处，侵权转载将追究相关责任版权声明**