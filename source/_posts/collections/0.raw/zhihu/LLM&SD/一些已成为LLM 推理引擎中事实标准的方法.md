---
title: 一些已成为LLM 推理引擎中事实标准的方法
date: "2024-10-18 00:00:00"
updated: "2024-10-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/一些已成为LLM-推理引擎中事实标准的方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/685706549
---


本文主要是记录目前在各个LLM推理引擎中经常使用的一些方法，算是一个备忘录吧，会持续更新进行补充。

### 一、模型架构优化

#### MQA(Multi-Query Attention)

出自Noam Shazeer大神19年的paper：[Fast Transformer Decoding One Write-Head is All You Need](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1911.02150)，这篇文章对全量和增量的MHA进行了代码级的介绍，然后提出了全量和增量的MQA，并给出数学公式和实验上的证明在复杂度上的收益，MQA针对MHA结构上的改动非常简单就是多个head共享一份key/value。

使用MQA的模型包括[PaLM](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2204.02311)、StarCoder、Gemini等。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_6840e1816d45.jpg)

MHA和MQA实现对比**

#### GQA(Grouped-Query Attention)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_512bea6d7b62.jpg)

出自[GQA:Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2305.13245)，提出了一种介于MHA和MQA之间的变种Attention GQA，看上图便可一目了然，这种折中的想法也很自然，至于这里设置多少个group就要看实践的技巧了。

GQA最知名的使用者，大概是Meta开源的LLAMA2-70B，以及LLAMA3全系列，此外使用GQA的模型还有TigerBot、DeepSeek-V1、StarCoder2、Yi、[ChatGLM2](https://link.zhihu.com/?target=https%3A//github.com/THUDM/ChatGLM2-6B)、[ChatGLM3](https://link.zhihu.com/?target=https%3A//github.com/THUDM/ChatGLM3)等，相比使用MQA的模型更多。

#### MLA(Multi-head Latent Attention)

来自[https://github.com/deepseek-ai/DeepSeek-V2](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepSeek-V2)提出的KVCache优化结构，和RoPE一样是国产之光。MLA的提出主要就是减少推理过程的KV Cache，从而实现在更少的设备上推理更长的Context，或者在相同的Context长度下增大batch size，实现更快的推理速度或者更大的吞吐总量，最终降低推理成本。MLA的好处来源于两个方面，一个是kv cache的显著降低(只缓存共享压缩变量)**，另一个是**权重矩阵的合并和吸收(事实上是伪吸收，在推理的时候重计算的效率会更高，本质上是改变了几个矩阵online乘法的计算顺序，避免生成大矩阵，从而降低计算量。**参考[ZHANG Mingxing：DeepSeek-V2 高性能推理 (1)：通过矩阵吸收十倍提速 MLA 算子](https://zhuanlan.zhihu.com/p/700214123))。MLA的核心是对keys和values进行低秩联合压缩来减少KV Cache的size，如下图所示。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_fd31673a7798.jpg)

核心计算流程如下所示，对RoPE做了一定的兼容，通过追加补充的方式完成位置编码的添加，方框为cache部分。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_cc5b91b3b2ad.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_6f01326eaecf.jpg)

大佬们的经典文章：

**[苏剑林：缓存与效果的极限拉扯：从MHA、MQA、GQA到MLA](https://zhuanlan.zhihu.com/p/700588653) 
[ZHANG Mingxing：DeepSeek-V2 高性能推理 (1)：通过矩阵吸收十倍提速 MLA 算子](https://zhuanlan.zhihu.com/p/700214123)
[BBuf：大模型KV Cache节省神器MLA学习笔记（包含推理时的矩阵吸收分析）](https://zhuanlan.zhihu.com/p/703862723) 
[rainbow：还在用MHA？MLA来了DeepSeek-v2的MLA的总结和思考](https://zhuanlan.zhihu.com/p/697781431)
#### 
Sliding Window Attention

Mistral sliding window attention**

这个是Mistral AI中使用的sliding window attention，详细可见[https://github.com/mistralai/mistral-src?tab=readme-ov-file#sliding-window-attention](https://link.zhihu.com/?target=https%3A//github.com/mistralai/mistral-src%3Ftab%3Dreadme-ov-file%23sliding-window-attention)。**针对long context非常有效，是一种local化的attention，在每层attention layer中只对固定的window size计算attentionScore，如下图所示。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_70b3c7995410.jpg)

这样经过多层的迭代其实可以覆盖完整的seq_len，这个想法在CV领域的很多算法上也有类似实现。下图是官方的配图，一开始不是很理解于是手撸了一个window_size=2的4层迭代，确实都覆盖到了。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_fa4ee79171e9.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_04089c4df268.jpg)

Longformer sliding window attention**

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_bb833f210519.jpg)

[Longformer The Long-Document Transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2004.05150.pdf)中的sliding window attention提供了window attention的较多玩法，固定长度的window、扩散长度的window、不同层变化长度的window和全局+window，也是按需使用吧。其中不同层变化长度的window， 在底层使用较小的滑窗，以构建局部信息；越上层滑窗越大，以扩大感受野。

**

#### ALiBi

来自[Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2108.12409)，作为位置编码的替代现在也是有很多推理引擎提供了支持，在extrapolation inference上效果确实不错。实现上很简单就是在计算attentionScore前加上一个基于位置的bias，从而通过位置信息影响其attention贡献值，如下图所示。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_0cbef3049938.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_4bc8e17b8531.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_8d25a269e416.jpg)

#### Rotary Position Embedding(RoPE)

旋转位置编码（Rotary Position Embedding，RoPE）是苏神论文[Roformer: Enhanced Transformer With Rotray Position Embedding](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2104.09864.pdf)提出的一种能够将相对位置信息依赖集成到 self-attention 中并提升 transformer 架构性能的位置编码方式。和相对位置编码相比，RoPE 具有更好的外推性，和ALiBi类似，目前是LLM相对位置编码中应用最广的方式之一。

为了能利用上 token 之间的相对位置信息，假定 query 向量\bm{q}_m和 key 向量\bm{k}_n之间的内积操作可以被一个函数g表示，该函数g的输入是词嵌入向量\bm{x}_m，\bm{x}_n和它们之间的相对位置m-n。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_3132a5e6ceb3.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_556278380c83.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_917385a0a9ee.jpg)

总结来说，RoPE 的 self-attention 操作的流程是：对于 token 序列中的每个词嵌入向量，首先计算其对应的 query 和 key 向量，然后对每个 token 位置都计算对应的旋转位置编码，接着对每个 token 位置的 query 和 key 向量的元素按照两两一组**应用旋转变换（在query和key各自内部进行旋转），最后再计算 query 和 key 之间的内积得到 self-attention 的计算结果。

**

#### Speculative Decoding

投机解码是Google和DeepMind在2022年几乎同时发现的LLM推理加速方法，能够在保证推理结果一致的前提下尽可能降低生成耗时，后续也逐步演进出Medusa、LookaheadDecoding等方法。

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2302.01318)

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2211.17192)

它的设计思想也比较简单直接，用小模型来进行大胆推理假设，用大模型来进行假设验证，小模型可以由大模型蒸馏、量化得到，具体流程如下：

1.用小模型做自回归采样连续生成r个tokens和它们的logits。

2.把生成的r个tokens和prefix拼接一起送进大模执行一次prefill推理，得到r个token的logits。

3.使用大、小模型对r个token的logits结果做比对，如果大模型的概率更大则接受，否则则以一定概率拒绝这个token的生成，从一个新的概率分布生成下个token。

4.如果小模型生成结果都满意，则用大模型采样下一个token。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_4bc094d29b3a.jpg)

### 二、系统工程优化

#### KVCache

KVCache目前已被广泛应用于各大LLM推理框架中，本质上还是空间换时间的思想，目前关于KVCache的研究发现主要还是集中在量化压缩上，毕竟这东西是随着SeqLen增长的，能够占到GPU显存30%以上，优化压缩它对提升吞吐量很有帮助，这几篇文章都有大量篇幅提到KVCache。

> [Young：大模型推理性能优化之KV Cache解读](https://zhuanlan.zhihu.com/p/630832593) 
[Efficient Memory Management for Large Language Model Serving with PagedAttention](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2309.06180.pdf) 
TensorRT-LLM KV Cache FP8 [MODEL TELLS YOU WHAT TO DISCARD: ADAPTIVE KV CACHE COMPRESSION FOR LLMS](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2310.01801.pdf)

#### FlashAttention

Tri Dao的2篇大作[FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.08691) 和 [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2205.14135)，其热度已经奠定了FlashAttention的江湖地位，目前基本上各家都会说自己也使用了FlashAttention的处理方式。

可以参考笔者写的几篇文章：

> [进击的Killua：FlashAttention v2论文温故](https://zhuanlan.zhihu.com/p/682441154) [进击的Killua：FlashAttention v2核心代码解析(一）](https://zhuanlan.zhihu.com/p/686225377) [进击的Killua：FlashAttention v2核心代码解析(二）](https://zhuanlan.zhihu.com/p/688345042)

#### PagedAttention

出自大名鼎鼎的vLLM，相关论文[https://arxiv.org/abs/2309.06180](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.06180)在SOSP 2023提出，本质上是一种存储优化技术，借鉴了操作系统中的分页思想来解决显存碎片化问题。随着long-request时代到来显存变得比算力更金贵了，大量的存储需求（比如KVCache）很容易就把系统打满，如何充分地利用显存空间来提升系统吞吐能力成为一个研究热点，PagedAttention算是比较早期的一个作品。

推理场景中prefill和decode阶段处理的sequence通常都是变长的，早期存储KVCache的方式比较简单粗暴的，就是静态地分配一个固定长度max_seq_len 空间，可想而知在组batch的场景下会有大量的碎片存储空间导致浪费，于是一个比较直接的想法就是利用动态分页的思想将逻辑空间和物理空间分离开来再通过一个map来映射**，这样逻辑上处理KVCache仍旧是连续的，在物理上block是非连续存储组织的，如此空间肯定是最大化利用了，处理流程上会有一些overhead但设计实现的好的话可以基本忽略。下面这张图可以清楚地表达分block映射的流程，详细的内容可参考：

**https://blog.vllm.ai//20/vllm.html https://docs.vllm.ai/en/latest/dev/kernel/paged_attention.html#value 
[SiriusNEO：LLM 高速推理框架 vLLM 源代码分析 / vLLM Source Code Analysis](https://zhuanlan.zhihu.com/p/641999400)![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_cd6bbae411ef.jpg)

#### Continuous Batching

Continuous Batching现已成为大模型推理框架的必备技术，像vLLM,TensorRT,FastGen等都有集成，最早在osdi22上以ORCA之名出道 https://www.usenix.org/system/files/osdi22-yu.pdf，在PD分离时代其广泛应用于Decode stage中。

它通过将多个在线请求进行批处理，可以提高 GPU 的使用效率，如下图所示。与传统的组batch方式不同的是其将粒度由request-level变成iteration-level。上图为request粒度的组batch，可以看到由于最长处理序列的存在造成了大量的空闲时刻；下图为iteration粒度组batch，每个迭代可以是一次prefill的运行也可以是decode阶段的一次token生成，分成共存派（每个iteration中既有prefill又有decode）和独立派（每个iteration中只有prefill或decode），这样在完成一个request的处理后可以马上调度新的request进来进行计算一轮iteration计算，从而消灭空闲时刻。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_bf310b94efed.jpg)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_3464ab383803.jpg)

由于Attention机制的原因，不同seqlen、处在不同step的请求没法合并成一个batch进行运算，于是把运算的流程拆成可以batch运算的QKV Linear、分开运算的attention和可以batch运算的Out Linear三部分，也就是论文提到的Selective batching，**更详细的描述还可以参考以下大佬的文章。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_ebac4553c560.jpg)

[](https://zhuanlan.zhihu.com/p/676109470)

**

#### Prefill &amp; Decode分离

随着近期Moonshot这波公开[技术分享](https://link.zhihu.com/?target=https%3A//github.com/kvcache-ai/Mooncake)，Prefill和Decode分离的技术方案已经被干成事实标准，大家对long context应用分离架构已基本达成共识。

起因：

Prefill和Decode的Compute Intensity存在巨大差异(前者compute-bound后者memory-bound)

影响：

- 单个实例上同时运行会互相干扰影响。
2. 对硬件有不同的诉求。

3. 对并行方法(TP、PP)有不同的诉求。

4. 对batch_size有不同诉求。

5. 对响应时间有不同诉求。

PD分离是个比较大的topic，从早期的SplitWise的7个insight，到提出Goodput概念并对PD应用不同并行策略的DistServe，再到系统化、工程化程度更高的DéjàVu、TetriInfer、MemServe、Mooncake，延展了非常多内容，系统复杂性逐步攀高，如下图所示感受下mooncake的架构图。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_04363a116cc0.jpg)

系统演进过程中逐渐形成了一些固定组件，比如Global/Local Scheduler、Prefill Instance、Decode Instance、KVCache Manager等，这些组件在设计和实现过程中会涉及到很多因素，例如

Scheduler：调度分配request时考虑KVCache reuse程度,PD实例负载情况, SLO等。

Prefill Instance: 考虑最大化reuse shared prefix kvcache， 同时最大化并行度采用Pipeline Parallel,chunked Prefill等手段。

Decode Instance： 考虑最大化throughput, 采用continuous batching

KVCache Manager: 考虑分布式memory pool布局, paged方式管理, radixTree/hashTable进行match, 充分利用不同level的存储、网络设备(DRAM,SRAM,VRAM,SSD,RDMA,PCIE), Layer-wise KVCache异步流式传输等。

目前大家普遍都认为KVCache对于服务调度至关重要，KVCache压缩共享技术也在快速发展，我们也期待后续还有更细粒度的拆分。

> [阿杰：[LLM 推理服务优化] DistServe速读——Prefill & Decode解耦、模型并行策略&GPU资源分配解耦](https://zhuanlan.zhihu.com/p/698341542) 
[哆啦不是梦：打造高性能大模型推理平台之Prefill、Decode分离系列（一）：微软新作SplitWise，通过将PD分离提高GPU的利用率](https://zhuanlan.zhihu.com/p/701772045) 
[ZHANG Mingxing：Mooncake (1): 在月之暗面做月饼，Kimi 以 KVCache 为中心的分离式推理架构](https://zhuanlan.zhihu.com/p/705754254)
[方佳瑞：Mooncake阅读笔记：深入学习以Cache为中心的调度思想，谱写LLM服务降本增效新篇章](https://zhuanlan.zhihu.com/p/706097807) 
[手抓饼熊：大模型推理分离架构五虎上将](https://zhuanlan.zhihu.com/p/706218732)

#### Prefix Cache

Prefix Cache的主要思想是充分复用请求间的共享prompt前缀从而减少计算开销，也是一种空间换时间的方法，在2023年由SGLang论文[SGLang: Efficient Execution of Structured Language Model Programs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2312.07104)提出，在论文中被称为RadixAttention，目前已经被各类推理引擎集成。

MaaS厂商每天需要处理海量的LLM并发请求，这个场景其实和互联网场景类似，一些在互联网场景沉淀下来的方法也可以尝试往MaaS上迁移(比如分布式缓存、多级缓存等)。这种海量的请求势必会有大量重复的prefix，而重复的内容意味着重复的计算，可以将重复的内容计算的中间结果(KVCache)缓存下来反复使用，如此便可省去这部分计算时间，从而缩短响应时间提高吞吐量。SGLang设计是把中间结果KVCache做缓存，如此一来扩大了KVCache的生命周期，不再是请求结束就释放了，这样就催生了对缓存空间的精细化管理，包括增删改查等基操，这个在传统的系统工程领域已经非常成熟了。

论文提出使用radixTree来维护缓存空间(所以取名RadixAttention)，radixTree可以理解成一个压缩前缀树，对于prefix token的存储具有更高的空间利用率，可以快速完成缓存的插入和查询，再配合LRU算法来进行缓存的淘汰，如下图所示，详细流程和代码介绍可以参考下面大佬文章。

[](https://zhuanlan.zhihu.com/p/693556044)

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_d9881c7b1d41.jpg)

#### Chunked Prefill

chunked prefill解决的是用continuous batch后在long context请求中prefill阶段执行时间过长导致的decode响应抖动的问题，如下所示。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_31cf2f9f6373.jpg)

其最早由论文[SARATHI: Efficient LLM Inference by Piggybacking Decodes with Chunked Prefills](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2308.16369)提出，解决方法也比较直接就是对long context进行拆分处理，如下图所示，在prefill和decode分离时代，chunked prefill还可用于优化prefill阶段的gpu利用率，使单gpu处理long context成为可能。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_efadf8a1b388.jpg)

论文提出的拆分方式只在causal mask模式下有效，由于casual mask的存在，prefill阶段在计算每个chunk的attention时仅需使用当前chunk的kv和之前chunk的kvcache便可完成(不依赖后续chunk的kv)，如下图所示，展示了分拆为4个chunk后第三个chunk的计算需要的数据和流程(这里简化了softmax的计算)，最终通过4个串行的chunked prefill阶段处理完成整个序列的attention运算**。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_8d6ff7442606.jpg)

详细还可以看这篇大佬文章的解析，还有伪代码非常清楚。

[](https://zhuanlan.zhihu.com/p/658443665)

#### Sequence Parallel

各种并行推理技术大多是从训练过程延续过来的，比如常规的流水线并行、张量并行、序列并行等，数据并行对应推理过程就是组batch了，这里的序列并行就是对long context从seqlen维度进行拆分然后并行推理，业界主流主要是两套方案，DeepSpeed Ulysess和RingAttention，大佬已经给大家总结分析对比了 [方佳瑞：大模型训练之序列并行双雄：DeepSpeed Ulysses & Ring-Attention](https://zhuanlan.zhihu.com/p/689067888)，还提出了两者的混合体双刀流USP(Ulysess切，Ulysess切，Ulysess切完RingAttention切)，还是有些厉害的，大家快去学习吧。

**Ulysess**

Ulysses在论文[https://arxiv.org/abs/2309.14509](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.14509)中提出，是序列并行的经典之作，它以通信量低、泛化性好闻名。流程上对分块后的Q、K、V，它不着急运算，而是采用All2All的通信原语把三个分布式矩阵变成沿hidden_size维度切分了，之后就可以进行正常的softmax(QK^T)V计算，可以用FlashAttention加速，得到结果再通过All2All转置回来，如下图所示。这里的亮点是2次All2All操作，把原本需要拿到全局KV才能计算的局部attention转换为单卡内attention计算闭环，就说妙不妙吧。在单卡内的计算可理解为完整序列在部分head上的attention计算，大大减少了运算量和存储量。

当然Ulysses也有个明显的缺点，就是切的份数不能超过head_num，否则All2All转置后单卡上的拆分hidden_size就不是一个完整的head_size了，需要卡间通信完成计算，在MQA场景比较吃亏（当然在USP里还可以用RingAttention继续切）。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_2f9df2001262.jpg)

**RingAttention**

Ring Attention可以理解成分布式多卡版本的flashattention，将原本单卡内多block粒度的qkv运算并行变成了多卡间并行，而卡间通过ring的形式进行p2p的KV数据的同步，**从而完成每一张卡上local q和累积的global KV的attention运算，得到local output**。每张卡加载部分的QKV进行计算，这样就可以把长文本跑下来了，流程如下图所示。

这里比较巧妙的是有个overlap，即KV Block数据传输和QKV attention运算的时间重叠，理论上确实可以做到没有时间消耗增量。具体的实现细节可以看论文[Ring Attention with Blockwise Transformers for Near-Infinite Context](https://link.zhihu.com/?target=https%3A//browse.arxiv.org/pdf/2310.01889)，也可以看下面大佬写的高赞文，对seqlen的切分也做了一些优化使得负载更加均衡 。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_3d8e666d253f.jpg)

[](https://zhuanlan.zhihu.com/p/683714620)
