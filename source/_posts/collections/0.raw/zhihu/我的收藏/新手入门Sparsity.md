---
title: "新手入门Sparsity"
date: "2025-05-11 00:00:00"
updated: "2025-05-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/新手入门Sparsity/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1903645364210341650"
---


今天花了一些时间研究了一下LLM inference中的sparsity，大致搞明白了sparse attention在解决什么问题。本文针对对LLM有一定了解，想要快速理解sparsity的人群。

### 一句话概括sparsity要解决的问题

sparsity主要是在decoding阶段中，对当前token产生的query( Q" role="presentation">QQ ), 选择之前的部分token产生的key( K" role="presentation">KK )进行attention计算，使得：

- 推理计算复杂度下降
- attention内存占用减少
- 精度下降在可接受范围内
选择之前的token主要包括两个部分：

- token的数量，比如top-K选择之前的K个token
- token的位置，即哪些token，比如在“A is B, C is D” 这个sequence中选择B代表的token
算法侧的paper集中于这两个问题。系统侧的paper还会关于比如sparse attention下KV loading cost或者VRAM上KV management cost之类的问题。下面我们将以[Quest](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2406.10774), [ARKVALE](https://link.zhihu.com/?target=https%3A//openreview.net/pdf%3Fid%3D4oAt5L4lYe) (偏算法)以及[PSA](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2503.00392v1) , [RetroInfer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2505.02922) (偏系统)为例展开说明

### LLM推理的两个阶段

现在的LLM推理主要分为两个阶段，prefill和decode。如下图所示，

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bf9280051bd3.jpg)

Prefill阶段产生全量KV Cache![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b35f1e4940f7.jpg)

Decode阶段利用之前prefill和decode产生的KV Cache减少计算Prefill阶段会对一个prompt产生全量的KV Cache，在attention中执行matrix-matrix multiplication得到attention score。Decode阶段则利用之前prefill阶段以及之前decode产生的KV Cache，在attention中执行vector matrix-matrix multiplication

### 为什么有sparsity这个问题

这里我们引用一下quest以及arkvale里面的motivation，主要有以下三点

- long context inference需求：为了支持更多的新应用和场景，现在LLM能支持的context length越来越长，因此需要system能够支持这一类请求的inference
- 计算复杂度：decode阶段attention计算复杂度为 O(L) ，每个decode step的时间随着序列的增长而增加
- 空间复杂度：每个token都产生固定大小的KV Cache，随着context length增加，存KV cache需要的空间也是 O(L) . 当序列太长，GPU VRAM就存不下了，甚至CPU DRAM也可能不足
另外还有一点paper里提了一下，本文中提到的sparsity主要针对long context中prompt短，generation长的情况。long context summarization之类的问题（prompt长，generation短），则需要进一步配合chunked prefill等技术。这一方面的工作可以参考Microsoft的[minference](https://link.zhihu.com/?target=https%3A//github.com/microsoft/MInference)。本人目前还了解的不多，以后会补充。

### Sparsity算法侧解决的问题

Sparsity在算法侧主要解决下面两个问题

- 选择哪些token的KV Cache与当前token的query做attention
- 选择多少个token的KV Cache与当前token的query做attention
Quest和Arkvale这两篇paper主要的contribution都是针对1，即在每一层attention中，选择哪些token的KV Cache做attention。这两个工作都属于dynamic sparsity，即每一步decode中选择的token都是不一样的，attention每一层中选择的都可能是不一样的。这背后的原因直观上也很好理解，随着decode的进行，当前token会关注之前不同的token，不同层的attention会关注不同的特征。具体的motivation实验paper里都有提到就不在此重复了，感兴趣的可以查阅。这里主要说明一下选择token的方法。我们这里不关注static sparsity，因为这类方法精度下降严重几乎没什么研究了。

#### Quest

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_02704c091260.jpg)

Quest中对每个page产生一个element-wise min key以及一个element-wise max key，用query跟这两个key分别做element-wise乘，再对这个乘的结果做一个element-wise max，最后sum over all elements得到一个分数。按照分数从高到低排序选K 页进行attentionQuest中按照page来组织KV Cache，每个paper包括N个token的Key。如上图每个page包括4个token的Key。Quest首先对每个page 产生一个elemet-wise min key和max key。这里的element-wise指的是对每个channel产生一个数，即head dim中的每个dimension产生一个数。min key和max key的dim都是`[1, head_dim]` 。然后query和min key max key分别做element-wise product，然后把这两个product的结果合成一个per channel max vector，其中每个element取这两个product中大的数。这样做的intuition是最后这个 \Sigma(per-channel\ max\ vector) 是一个当前query和这个page上的K产生的attention score的上界。quest 通过这个上界来评估哪些page上的Key和这个query最近似，会对有大的贡献。

在KV cache的数量上，Quest在对sum排序后使用Top-K选择分数最高的K个页，与当前Query进行attention

#### Arkvale

Arkvale针对的问题跟Quest类似，也是选哪些页。本质上选哪些页（即页上token的key）是计算页上token的key和当前query的相似度，也就是下图中b里面的importance score。下面先看一下arkvale 工作流程，这个工作流程也可以被视为传统dynamic sparsity的工作流程。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0282cf4e2f19.jpg)

Arkvale中的系统设计arkvale的工作流程没有什么特别的，首先产生的KV cache异步传回CPU，然后对每个包含key的page产生一个importance score 。排序之后只用Top-K确定哪些page需要来做attention。把在GPU上不需要的page evict到cpu，把cpu上需要的page recall回GPU。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0a4d6474cbf8.jpg)

把一个页上的向量组成一个高维球或者立方arkvale给出了几个不同方法估计importance score。核心思想如上图所示就是把page上多个key vector看成是高维空间上的一个球（sphere）或者立方（cuboid），然后在这个球上或者立方上找一个跟当前query相似度最高的vector（内积最大）作为代表vector，内积的结果就作为importance score。不同方法的区别在于球和立方半径的估算，在此也不多叙述，感兴趣的可以查阅。

#### PSA

PSA跟上面两个工作的不同之处在于它关注选多少token而不是怎么选token。PSA没有像之前两个一样使用每层attention固定的top-K去选择K个页或者token，而是使用一个动态算法确定每层选择多少个页。这基于PSA的一个观察，对不同层，得到95% attention score（即要求的精度，可以理解为SLO）需要的token数量是不一样的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d659463f73ef.jpg)

这个图说的是，给定K个Token（x轴）的KV Cache，在decode过程中，有多少个query token能够满足attention score至少95%。L1需要至少100个Token的KV cache，Layer4 给10个token就能有60%的decode token达到比较好的精度于是PSA在排序后不是用static的topk，而是每次加载一个batch (line 9)，算一下attention (line 10)，得到output和相应的attention score，跟之前得到的output加权平均得到新的output (line 11)。更新累计的Attention Score 和最小的Attention Score (line 12, 13)。由于在对所有 KV 块执行注意力计算之前，总Attention Score是未知的*。 *为了知道算完这个batch之后attention的占比，PSA 记录迄今为止遇到的最小块级Attention Score估算占比，直到占比超过threshold结束加载。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7bbcac3e0b94.jpg)

PSA 动态KV Cache加载算法
#### RetroInfer

我个人认为Retroinfer和上面几个工作相比更进了一步，因为它关注到了未被选上的token对最终输出精度的影响。它除了选一部分token做attention之外，还引入了estimated attention，即对没选上的token做attention估计。这个文章在实验部分指出估计的这一部分对最终精度十分重要。

具体来说，Retroinfer将所有的token分成了三部分，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3124f86e1d6d.jpg)

Retroinfer splits all tokens into 3 parts. Steady zone where attention is computed precisely with KV always on GPU. Retrieval zone where KV has to be fetched from on-GPU cache or on CPU KV store. Estimation zone where attention is estimated using the centroid of each clustersteady zone 中token的KV cache一直保留在GPU上，在attention计算时会精准计算。这部分的token包括开头和结尾的token。很多算法paper都指出这部分的token对最终attention score的贡献非常大，因此在任何情况下都应该保留。

接下去是retrieval zone和estimation zone. Retrieval zone 顾名思义需要把这部分token的KV cache从CPU中拿进来再进行计算。estimation zone则只是选择代表向量进行attention估计。下面我们仔细展开这两个zone里面token是如何选取的，以及代表向量是如何生成的。

Retroinfer指出，找当前query的近似向量本质上是一个ANNS(Approximate Nearest Neighbour Search)问题，天然就可以跟MIPS(Maximum Inner Product Search)算法链接上。在这一类问题中，如果能够给被搜索的Key Vector低成本的建立一个相对准确的索引，可以极大降低Query Vector的搜索代价。

于是Retroinfer基于ANNS常用的算法，K-means聚类算法，设计了一个叫做wave index的数据结构进行token选择，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4cbf77abd328.jpg)

Tokens after prefill are split into segments. Retroinfer use K-means within each segments to generate clusters. Then it stores the centroid of each cluster, the number of tokens in each cluster, and the sum of value vectors of each cluster into the meta index on GPU. 在Prefill阶段结束后，所有的token除了开头结尾位于steady zone的token之外，被切分成固定大小（8k）的segment。Retroinfer在每个segment内执行K-means算法进行聚类。聚类会得到每个cluster的中心向量（Centroid, averaged over all key vectors in a cluster），每个cluster的大小（token的数量），以及每个cluster中token的Value Vector的sum。这三个重要的metatdata会保存在位于GPU上的Meta Index里。Meta Index将会被用来决定对当前Query Vector，哪些cluster中的Key Vector是在Retrival zone里需要加载进GPU，哪些则只需要进行估计。

比如在上图中，黄色的token组成一个cluster，centroid为C1。红色的是另一个cluster，Centroid为C0。绿色和蓝色则分别为C500和C501。

当一个新的decode token产生的Query Vector来了之后，这个Query Vector跟所有的这些Centroid做内积，然后对内积结果进行排序，选择前 r\%（实验中用的是1.8%） 的cluster作为retrieve zone，剩下的作为estimation zone。在retrieve zone里token的KV vector需要从CPU或者GPU cache中载入，这些vector和Query Vector进行precise attention calculation。剩下在estimation zone里的cluster则使用centroid和Query Vector做estimated attention计算。比如在上图中cluster 1，cluster 501， cluster 0是重要的（Token important这一行越黑越重要），需要拿进GPU做准确的attention计算；Cluster 500和cluster 2则不重要，进行estimated计算。

$$接下去我们来说一下estimation是怎么算的。这也是我认为很巧妙的部分。Estimation以cluster粒度进行。如下面的公式所示，attention直接就用centroid vector代替，这是因为根据jensen不等式，用centroid key vector计算是使用所有在这个cluster中的key vector计算的一个lower bound ( C_i = \frac{\sum_{j=1..s_i}K_j}{s_i}, e^{\frac{q\cdot C^T_i}{\sqrt{d}}} \leq \frac{\sum_{j=1..s_i} e^{\frac{q\cdot K_j^T}{\sqrt{d}}}}{s_i} , 其中 C_i  为第i个cluster的centroid， s_i  为这个cluster的token数量, K为这个cluster中token的key vector，d为head dim)。$$

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d867a9ab86cd.jpg)

对每个处于estimation zone中的cluster的estimated attention score，其中p指的是steady zone 中token数量，m指的是聚类完总共cluster的数量，S_j 是cluster_j 中token数量，C_j 是cluster_j 中key vector的centroid。q为当前query vector，d为head size。而最后的attention output ( \tilde{o_i} )就只需要用这个centroid得到的attention score ( \tilde{a_i} )乘上这个cluster中所有value vector的sum(即图里面meta index中保存的 \sum(v) ) 得到。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_32fc966ba6eb.jpg)

由于centroid和 \sum(v) 都保存在GPU中，而且相比原来全部的token小的多，estimated attention计算可以在GPU上很快进行。这个是算法和系统结合的非常巧妙的地方。

Retroinfer还进行了专门的系统设计来尽量降低Retrieve Zone部分的传输代价（Latency Reduction），并且overlap传输和计算（Latency Tolerance）。我将会在系统层面解决的问题进一步展开。

### Sparsity 系统层面解决的问题

除了算法上的挑战之外，sparsity还会在系统层面带来挑战。这部分将以PSA和Retroinfer为例展开。

#### PSA

PSA指出了下面几个问题

- 频繁的KV Cache加载造成GPU利用率下降：每一层选择的token不一样，需要的KV Cache不一样，而attention需要在KV cache准备好，加载进GPU之后才能开始算。在一层里多个batch之间也是如此
- 算attention score占比的开销：传统做法把attention weights sync回CPU，CPU 来排序和更新占比
- GPU memory utilization的问题：vLLM里面的page attention默认每层的KV cache是一样的，PSA会导致每层选择从CPU里加载进来的KV Cache的token不同。如果按照每层一样的管理会造成很多空洞和资源浪费。
PSA分别的解决方法是：

- 让传输和计算在不同线程不同CUDA stream，这样至少一层多个batch的传输和计算之间能overlap。（这一点paper里没仔细说，我个人认为只能在一层里overlap，同时代价是最后要多load一个batch。我认为在不同层之间是没法overlap的，qkv projection之后，必须先算importance score才知道哪些要加载进来算attention）
- 使用GPU kernel进行attention score的更新和占比估算
- 整个GPU VRAM 分配一个大tensor来存KV Cache，这个大tensor切成固定的小块，每个小块存一个token的一层KV Cache。代价是付出更多的索引overhead，包括时间和空间

#### RetroInfer

虽然WaveIndex把Retrieve Zone部分的token数量降了98%（主要还是看 r\% 怎么设 ），但是PCIe还是很慢，如果能进一步降低或者隐藏传输代价会更好。

Retroinfer主要通过两个方法来降低或者隐藏传输代价

- 使用了一个on-GPU的Block Cache来Cache一部分重要的KV Cache。Block Cache的设计主要基于基于temporal locality，即相邻decode token之间attend的重要的Key Vector发生的变化不会太大，所以 token_{n+1} 只需要在token_{n}的基础上从CPU里取一小部分，大部分主要是Block Cache hit。（不过这部分我个人认为pattern应该是，不怎么变，然后突然到了下一个语义的阶段发生很大变化，然后再不怎么变，再变化很大....）
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_074373076af3.jpg)

Cache replacement 主要由CPU上的buffer manager负责，GPU上用Block Cache存一部分重要的KV Vector，attention算完了最后异步更新。2. 如何overlap不同的步骤。这个在文章里没有说的特别明确，结合后面eval来看的话应该是按照如下的顺序(这部分按照我个人理解推测的，可能跟paper有一些出入)：

a. QKV Projection (GPU)

b. Access Meta Index (GPU): 这一步包括query和Centroids做inner product然后再排序

c. Estimation zone attention (GPU) 和Cluster Mapping Table 更新，加载on-CPU KV到GPU Block Cache(CPU)

d. Steady and retrieval zone attention 以及和estimation zone attention 合并(GPU)

e. admit missed data (CPU): 异步更新这一层的on-GPU block cache

#### Retroinfer中几个不太明确的点

- Steady zone什么时候更新：我个人认为随着decode不断的进行，steady zone是要不断更新的。这个部分可以是mechanical的，比如固定开头的N个token和最后的M个token
- 什么时候重新cluster：随着decoding产生越来越多的token，cluster需要在一定时间重新进行。paper里没说具体在什么时候重新cluster。我个人的猜测是先把decode的token加入之前已经产生的cluster之中。当decode到一个固定数量，比如8k，再重新异步做cluster
- 哪些步骤可以在CPU和GPU之间overlap：paper 实验中提到比如data copy，即上图的copy-3，和retrieval attention并行，我认为这里有dependency需要顺序执行。

### 值得继续研究了解的问题

我个人认为有一些问题值得继续研究一下。传统sparsity研究问题的范式相对固定，除了传统的卷怎么选token，选多少token之类的算法问题之外，可以关注一下

- 新的场景，比如multi modality
- 其他的算法，比如speculative decoding
- 系统层面的问题，比如怎么利用起来CPU，进行比如token选择，甚至计算

本文旨在抛砖引玉，如果有任何勘误欢迎批评指正。

=====================================

V1: 增加了RetroInfer。我个人认为这篇来自MSRA的文章在算法和系统层面都做了非常扎实的工作。