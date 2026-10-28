---
title: "[LLM性能优化]聊聊长文本推理性能优化方向"
date: "2024-08-16 00:00:00"
updated: "2024-08-16 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/[LLM性能优化]聊聊长文本推理性能优化方向/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/698308542"
---


近期，LLM 的长文本能力越来越受到关注。LLM 处理长文本的能力可以应用在多个应用场景中，例如 LLM Agent 场景：假设 Agent 会调用不同的工具解决用户给出的任务，当用户对 Agent 提出一个任务时，Agent 会先调用一次 LLM，对给定的任务生成一系列的 Function Call，然后依次调用不同的 Function，Agent 将 Function  的所有输出结果作为输入，再调用一次 LLM，生成最终呈现给用户的自然语言。其中，通过 Function 返回的结果可能很长，多个Function结果拼起来可能是一个很长的输入，这样 Agent 模型就需要具备长文本处理能力。除了 Agent 以外，RAG、文本摘要、多模态都需要 LLM 模型具备长文本处理能力，这些应用在落地时需要 LLM 推理服务具备很高的长文本推理效率。笔者之前在介绍 [vLLM 的文章中](https://zhuanlan.zhihu.com/p/656939628) 介绍过与 LLM 推理服务性能最关键的因素：KVCache 显存大小。KVCache 显存占用的计算公式为：

$KVCacheMemroyCostPerToken= 2×L×H×N×D(1)KVCacheMemroyTotalCost= T×KVCacheMemroyCostPerToken(2)" role="presentation">KVCacheMemroyCostPerToken= 2×L×H×N×D(1)KVCacheMemroyTotalCost= T×KVCacheMemroyCostPerToken(2)\begin{equation} \begin{aligned}  KVCacheMemroyCostPerToken =& \ 2 \times L \times H \times N \times D &(1) \\ KVCacheMemroyTotalCost =& \ T \times KVCacheMemroyCostPerToken &(2) \\  \end{aligned} \end{equation}  $

其中:

- L" role="presentation">LL 表示模型层数（Layers）。
- H" role="presentation">HH 表示头维度大小（HeadDim）。
- N" role="presentation">NN 表示头数量（NumHeads）。
- D" role="presentation">DD 表示数据类型大小（DataType）。
- T" role="presentation">TT 表示总 Token 数（Tokens）。
通过公式（1）我们可以看到， LLM 推理服务为每个 Token 分配了显存空间，其显存空间大小与模型层数、头维度、头数量以及KVCache存储的数据类型大小四个维度相关。通过公式（2）我们可以看到，KVCache 的总显存开销与 LLM 推理服务处理的总 Token 数以及每个 Token 所占的显存开销相关。在长文本推理服务场景中，我们的目标是在给定显存空间，推理服务要处理的 Token 数尽可能的多，即 T 尽可能的大。通过公式 2 可知，提升 T 有两种策略：

- 对 T 维度进行压缩，用较少的 token 信息表示全量  token 信息；
- 对 L、H、N、D 四个维度进行压缩，降低每个 token 的显存开销。
下面将分别介绍这两种策略相关的工作。

### 1. 压缩 KVCache 长度

LLM 最核心的模块是 Attention：通过 Q 、 K 两个矩阵进行矩阵乘，计算O(T^2)大小的注意力得分矩阵，并使用注意力得分矩阵对 V 矩阵求加权平均值，得到注意力层的输出矩阵。其中注意力得分矩阵每一行表示 Q 中每个 Token 和 K 中每个 Token 的相关性得分，注意力层输出矩阵的每一行表示每个 Token 与其他 Token 的加权平均值。即然是加权平均，说明每个 Token 的重要性并不相同，有的 Token 权重更大，而有的 Token 权重更小。那么为了压缩 KVCache 长度，可以将 KVCache 中一些权重小的 Token 剔除，不参与注意力计算，在保证模型效果的前提下压缩 KVCache 长度，从而在一定量的显存下保存更多的 Token，提高长文本的推理效率。那么压缩 KVCache 长度的问题就可以转化为寻找重要性 Token，通过算法设计找出一个序列中相关性更高的 Token。

####  1.1 静态 Token 稀疏化

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bf8628eb0c40.jpg)

 去年底 MIT 提出一种叫 StreamingLLM 的压缩 KVCache 长度的方法，并分析了四种 Attention 实现：

- <strong>Dense Attention</strong>：即最原始的 Attention 实现。其计算复杂度为 O(T^2)，KVCache 存储复杂度为O(T)。由于复杂度比较高，T 在预训练的时候会比较小。在推理的时候，当文本长度超过了预训练时的长度，模型效果就会大幅降级，所以表现出来的 PPL 值也比较大；
- <strong>Window Attention</strong>：通过我们平时语言习惯中可以知道，一段话中每个字之间的相关性差别很大，一般来说越相近的字相关性越强。基于这个假设，Window Attention 就被提出。每个 Token 只和邻近的 Token 做 Attention 计算，所以计算复杂度为 O(TL) ，KVCache 存储复杂度为O(L)，其中 L 为窗口大小，是一个常数。这种方法极大的降低了 KVCache 的存储开销，从线性复杂度降低到常数复杂度。虽然KVCache的长度被压缩了，但是模型效果却不好，主要原因是最初始的 Token 被丢弃了。作者通过一些统计方法发现这种 Token 的重要性其实非常高，丢弃会严重影响模型效果。
- <strong>Sliding Window Attention with recomputation</strong>：这种 Attention 与 Window Attention 类似，区别是 Sliding Window 不缓存窗口的 Tokens，而是重新计算窗口内的 KVCache。这种方法的计算复杂度为 O(TL^2)，KVCache 存储复杂度为O(L)。计算效率下降了，但模型效果对比Window Attention 高，PPL 值远低于 Window Attention。主要原因是重计算把窗口中的 Tokens 作为初始 Tokens 了，这样既保留初始 Tokens 又保证计算只在一个窗口内，大大降低了KVCache 存储复杂度。
- <strong>StreamingLLM</strong>：这种策略在 Window Attention 的基础上，保留整个序列的初始 Tokens。每个 token 只和窗口内的 Tokens 以及序列的初始 Tokens 进行 Attention 计算，这样既保留 Window Attention的特性，即保证 KVCache 存储复杂度为O(L)，计算复杂度为 O(TL) ，同时保证了模型效果不因丢失初始 Tokens 而大幅下降，PPL 和 Sliding Window Attention with recomputation 相似。
总的来说，上述提到的稀疏化方法都是<strong>静态的</strong>，即 Token 之间的相关性是一种<strong>固定的范式</strong>，每个 Token 的相关的 Token 都是固定距离的。

#### 1.2 动态 Token 稀疏化

静态 Token 稀疏化存在一个问题：Token 候选集过于固定。这种 Token 候选集的设计源于作者通过观察某些数据集中 Token 之间的相关性发现的规律。这种规律明显不能保证具备普适性，不能适用于所有场景。动态 Token 稀疏化本质是为当前处理 Token 维护一个相关性高的历史 Token 集合，但与静态 Token 稀疏化不同，这个集合的构造不再由 Token 距离或者固定 Token 决定，而是设计一种算法去筛选历史的 Token。静态 Token 稀疏化是动态 Token 稀疏化的子集，所以理论上动态 Token 稀疏化的模型效果会比静态 Token 稀疏化更高。动态 Token 稀疏化主要有两个工作：[H2O](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2306.14048) 以及 [Quest](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2406.10774)。

- <strong>H2O</strong>
为了维护历史 Token 集合， [H2O](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2306.14048) 提出了一种贪心的历史 Token 驱逐算法，具体流程如下：

- 初始化相关性历史 Token 集合 S_0 ，设置集合最大容量 k 。
- 开始迭代更新历史 Token 集合：

- 当历史 Token 集合大小等于最大容量  k 时，将当前 Token 加入历史 Token 集合中；
- 当历史 Token 集合大小大于等于最大容量时，计算当前 Token 和历史 Token 集合中所有 Token 的相关性得分，分数越高相关性越低，将最低分的 Token 从集合中剔除，将当前 Token 加入到集合中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_089cf7fa7410.jpg)

相关性得分的计算开销很小，所以该方法的计算复杂度为 O(TL) ，KVCache 存储复杂度为 O(L)。作者也和StreamingLLM 对比了模型效果，在 QA 任务以及文档摘要任务均优于 StreamingLLM。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7c28b6998089.jpg)

- <strong>Quest</strong>
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_439552298dba.jpg)

 H2O 的方法是一种贪心算法，每生成一步会将当前 Token 相关性最低的历史 Token <strong>永久剔除</strong>，被剔除的历史 Token 将不会参与后续任何一个 Token 的 Attention 计算。但是存在一种情况，在前面生成过程中被剔除的 Token 可能与当前的 Token 有着较高的相关性，但因为 Token 在前面的生成过程中已经被剔除导致无法把 Token 召回和当前 Token 完成 Attention 计算。例如在 LLaMA-7B 模型中，当输入的 Prompt 为 “A is B. C is D. A is”，第16层 TransformerLayer 的某个头的 Attention 相关性表如上图所示。纵轴为 Query 的 Token，也可以理解为每一步的当前 Token，横轴为 Key 的 Token，表示历史 Token。当当前 Token 是 “D” 时，历史 Token “B” 相关性很低，不是关键 Token，所以按照 H2O的算法将会被剔除掉；当当前 Token 为 “is” 时，历史 Token “B” 相关性很高，是关键 Token，但由于前面当前 Token 为 "D" 时把 “B” 剔除掉，所以 “B” 不会与 “is” 进行 Attention 计算，潜在影响模型效果。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_66e997ecc9cf.jpg)

为了量化不同的 Attention 算法对相关性 Token 利用率，作者采用 Top-10 召回率衡量，统计每一种 Attention 算法对前十个 Token 的召回情况，如上图所示。标准的 Full Attention 算法的召回率是 1，因为标准算法不会丢弃任何 Token；而作者提出 Quest 算法召回率随着 Token Budget （表示参与 Attention 计算的历史 Token 数最大值）的增加也无限接近 Full Attention，一直保持 90%以上；而  H2O 算法的  Top-10 召回率在 50% 徘徊。<strong>Top-10召回率越低，丢失的信息量越高，模型效果越差。</strong>所以解决上述模型效果问题最重要是提高历史相关性高的 Token 召回率。为了提高召回率，Quest 提出动态构建 Token 候选集。 与 H2O 不同的是，Quest 不会在每轮迭代的时候剔除一个历史 Token，而是保留全量的历史 Token， 每轮计算当前 Token 和历史所有 Token 的相关性，并用 TopK 算法选取相关性最高的 K 个 Token 参与 Attention 计算。但是如果以 Token 粒度计算相关性，那么在进行Attention 前就需要加载全量的 KVCache，与降低计算量以及 KVCache 的访存量的初衷背道而驰。所以 Quest 提出了一种 Page 粒度的高效 Token 相关性估算算法，如下图所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_24db8699be6d.jpg)

Quest 使用 KVCache 页中最大和最小 Key 向量的信息估算一页 KVCache 和当前输入 Query 向量的相关性。该  Attention 算法流程如下：

- 生成 KVCache 时，将新增的 KVCache 保存到常规 KVCache 显存池，并且计算新增的 KVCache 页的最大最小 Key 向量，将最大最小向量保存到 MetaKVCache 显存池中；
- 开始进行 Attention 算法。包含两个阶段：

- 打分阶段：给每个历史 Page 打分。从 MetaKVCache 中加载最大最小 Key 向量，当前的 Query 向量分别和最大最小 Key 向量进行 Elementwise 乘法，得到两个向量结果。对两个向量结果进行 Elementwise Max，得到一个向量结果，再求和，得到该 Page 的得分；根据得分选择 Top K 个 Page 作为 Token 集。
- Attention计算阶段：当前的 Query 向量和 Top K 个 Page 的 KVCache 进行稀疏 Attention 计算。

通过这种 Attention 算法，Quest 对比 Full Attention 大大降低了 KVCache 的访存量。假设每一个 KV 向量的大小为 M 字节，KVCache 的 Token 数为  L ，每一页的 KVCache 有  S 个 Token（页大小），L/S 为页数， K 为 历史 Token 候选集大小。那么在第一阶段的访存量为 2M*L/S 字节，而第二阶段的访存量为 2M*K*S 字节，所以 Quest 算法总的 KVCache 访存量为 2M*L/S + 2M*K*S 。Full Attention 的访存量为 2M*L 字节，所以 Quest 算法和 Full Attention 算法的访存比为 \frac{1}{page\ size} + \frac{K}{page\ num} 。当页大小设为 16，K 设为 256，历史 Token 数为 64K 时，Quest 的访存量仅约为 Full Attention 访存量的 \frac{1}{8} 。

后续与动态 Token 稀疏化相关的工作可能会继续聚焦于模型效果方面，比如得分函数的设置以及剔除策略的改进。计算复杂度已经到线性复杂度，KVCache 存储复杂度已经到了常量复杂度，难以继续优化。

#### 1.3 Prefix Caching 工程优化

Prefix Caching 是最近比较火的工程优化，其原理是复用 Tokens 的KVCache。LLM 推理服务在完成一个 request 计算后，不会马上将其 KVCache 释放，而是先缓存。当下一个请求到达时，不会直接进行 Prefill 计算，而是先在缓存中寻找最长公共前缀的 Tokens。如果存在，则直接复用缓存中的 KVCache，仅对剩余 Tokens 计算注意力以及 KVCache。通过复用 KVCache，可以达到两大目的：

- 提升 Prefill 效率。由于参与 Prefill 的 Tokens 数减少，所以计算量下降，Prefill 的延时也就下降，直接提升 TTFT 性能。特别适合优化多轮对话场景的性能。
- 节省显存。当前大部分 LLM 应用在构造输入时一般遵循 system prompt + user prompt 范式。大部分的 system prompt 都是一致，这样不同的请求也就有相同的前缀，可以避免出现多个冗余的 system prompt KVCache，能提高服务的极限吞吐。
在实现高效的 Prefix Caching 功能时，需要考虑两个问题：

- 如何管理缓存 Tokens？应该保留哪些前缀？
- 能否针对 Prefix Caching 实现高效的 CUDA 算子？
<strong>Radix Attention</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2ee226e91079.jpg)

针对第一个问题，lmsys 提出了 Radix Attention，设计了一种基于 LRU 的 Radix Tree 去管理前缀 Tokens。如上图所示，新到达的请求会先从 Radix Tree 中匹配最长前缀，寻找最远的一个节点。当请求仍有 Tokens 没匹配到已有的前缀，则会新增 Token 子节点。每次新增 Token 时，将新增 Token 节点标记为绿色，并将其前缀的节点标记为蓝色。这种标记主要是更新节点的访问时间，当缓存空间不足时，会将最近没被访问的节点清除。

<strong>Cascade Inference</strong>

针对第二个问题，FlashInfer 团队提出了 [Cascade Inference](https://link.zhihu.com/?target=https%3A//flashinfer.ai/2024/02/02/cascade-inference.html)，用于提升多个请求共享前缀的 Batch Decoding 过程。在介绍 Cascade Inference 前，我们先了解下 Batch Decoding Attention 的 CUDA 实现原理。

- <strong>朴素 Batch Decoding Attention CUDA 实现原理：</strong>先考虑 MHA。对于 Attention 运算，设 Q 在 T 维度上长度为 q\_len ， K 、 V 在 T 维度上长度为 kv\_len ，那么 Attention 的三个输入矩阵的 Shape 分别为 [B, N, q\_len, H]、[B, N, kv\_len, H]、[B, N, kv\_len, H]。其中 [B, N] 两个维度是 Batch 维度，可以并行计算，所以 Attention 算子的 CUDA Kernel 会将 Grid Size 设置为 [B, N]，一个 Thread Block 计算一个序列的单个头注意力，所以一个 Thread Block 的三个输入矩阵 q,k,v 的 Shape 为 [q\_len, H]、[kv\_len, H]、[kv\_len, H]。Attention 计算可以简单分解为以下三步：

- s=qk^T，对 q,k 进行矩阵乘，得到 Shape 为 [q\_len, kv\_len] 的中间变量 s 。
-  s=softmax(s) ，对步骤 1 得到的中间变量 s 在 kv\_len  维度执行归一化操作，得到 Shape 为 [q\_len, kv\_len] 的中间变量 s 。
- o=sv^T，对步骤 2 得到的中间变量 s 和  v 进行矩阵乘，得到 Shape 为 [q\_len, H]的最终结果 o 。
在 Decoding 阶段，q\_len 为 1，所以上述提到的中间变量大小较小，可以放到 Shared Memory 中保存，那么 Batch Decoding Attention 的算术强度可以表示为：

Arithmetic\ intensity= \frac{2 * q\_len*kv\_len * H + q\_len*kv\_len}{  2 *q\_len * H + 2 * kv\_len*H} \\ 通过上述公式可以观察到，Batch Decoding Attention 的算术强度接近 1，属于 Memory Bound 计算。其主要的访存开销在 KVCache 上。当 Thread Block 在加载 [1, H] 大小的 q 矩阵时，需要加载 2 个 [kv\_len,H] 大小的 k、v 矩阵。所以，为了提升 Batch Decoding Attention 的性能，需要提升其算术强度。从公式可以观察到，当 kv\_len 固定时，算术强度随着 q\_len 上升而上升。<strong>所以只要可以在一个 Thread Block 中加载相同大小的</strong>k、v<strong>矩阵情况下，加载多个</strong>q<strong>矩阵，并计算多个</strong>q<strong>矩阵对应的结果，就能提升性能</strong>。那么针对多个请求共享前缀的场景，能否利用这个特性提高 CUDA Kernel 的性能呢？在解决共享前缀问题前，我们先看看 MQA 的优化思路。

如上文介绍，MHA 算子是 Q 矩阵一个序列的一个头与 K 、 V 矩阵一个序列的一个头进行计算。而 MQA 算子则不同，是 Q 矩阵一个序列的多个头与 K 、 V 矩阵一个序列的一个头进行计算，其输入的 Q 、K 、 V 三个矩阵的 Shape 分别为 [B, N, q\_len, H]、[B, 1, kv\_len, H]、[B, 1, kv\_len, H]。假如将 MQA Kernel 的 Grid Size 设置为 [B, N]，那么 K 、 V 矩阵在第二维度则需要 “expand” 操作，即将 1 份 [kv\_len,H]  大小的 k、v 矩阵拷贝  N  份，这样算术强度与 MHA 一样，在CUDA Kernel 层面没有任何性能提升。但是，如果我们利用 MQA 共享头的特性，<strong>将 Grid Size 设置为</strong>[B]<strong>，那么一个 Thread Block 的三个输入矩阵</strong>q,k,v<strong>的 Shape 将为</strong>[N*q\_len, H]<strong>、</strong>[kv\_len, H]<strong>、</strong>[kv\_len, H]<strong>，</strong>q\_len<strong>相比 MHA 实现"提升"了</strong>N<strong>倍，算术强度也提升接近</strong>N<strong>倍，可以降低访存开销。并且由于</strong>q\_len<strong>提升</strong>N<strong>倍， Attention 中的两个 GEMV 变为 GEMM，可以使用 TensorCore 进一步提升 Kernel 性能。</strong>

- <strong>共享前缀 Batch Decoding Attention CUDA 实现原理</strong>：回到共享前缀的场景。当 Batch Decoding Attention 所有输入请求的前缀完全一致时，输入的 Q 、K 、 V 三个矩阵的 Shape 分别为 [B, N, q\_len, H]、[1, N, shared\_kv\_len, H]、[1, N, shared\_kv\_len, H]。<strong>类似 MQA ，GridSize 可以设置为</strong>[N]<strong>，那么一个 Thread Block 的三个输入矩阵</strong>q,k,v<strong>的 Shape 将为</strong>[B*q\_len, H]<strong>、</strong>[shared\_kv\_len, H]<strong>、</strong>[shared\_kv\_len, H]<strong>，</strong>q\_len<strong>相比 MHA 实现"提升"了</strong>B<strong>倍，算术强度也提升接近</strong>B<strong>倍，同样可以降低访存开销。</strong>以下是 Decoding 阶段的 MHA、MQA 以及 BatchPrefixAttention（BPA）的对比：
Attention 类型Grid Size设置算术强度MHA[B, N]O(1)MQA[B]O(N)BPA[N]O(B)但 BPA 这个算子只适用于前缀完全一样时的 Decoding，当输入多个请求的后缀不同时，仍然需要使用常规的 Decoding Attention 算子，计算后缀的注意力的局部结果，然后使用类似 FlashAttention 将前缀、后缀的注意力局部结果进行合并。这就是 Cascade Inference 的做法。具体流程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_74df005e482d.jpg)

图中上半部分描述了常规的 Decoding Attention 的做法，下半部分描述了 Cascade Inference 的思想。Cascade Inference 主要包含三个步骤：

- MQA。对共享前缀部分使用 MQA 算子，提高算术强度；
- Batch Decode Attention。对不同的后缀使用常规的 Decoding Attention 算子，计算后缀的注意力；
- Merge State。以上两步仅完成序列中一部分的 Attention 结果，需要将 Attention 结果进行合并，合并方式与FlashAttention 类似。
下面是 Cascade Attention 的源码：

```python
class BatchDecodeWithSharedPrefixPagedKVCacheWrapper:
    def forward(
        self,
        q: torch.Tensor,
        k_shared: torch.Tensor,
        v_shared: torch.Tensor,
        unique_kv_data: torch.Tensor,
        allow_fp16_qk_reduction=False,
        sm_scale: Optional[float] = None,
        rope_scale: Optional[float] = None,
        rope_theta: Optional[float] = None,
    ):
        # MQA
        V_shared, S_shared = single_prefill_with_kv_cache_return_lse(
            q,
            k_shared,
            v_shared,
            causal=False,
            pos_encoding_mode="NONE",
            kv_layout=self._kv_layout,
            allow_fp16_qk_reduction=allow_fp16_qk_reduction,
            sm_scale=sm_scale,
            rope_scale=rope_scale,
            rope_theta=rope_theta,
        )
        # Batch Decode Attention
        V_unique, S_unique = self._batch_decode_wrapper.forward_return_lse(
            q,
            unique_kv_data,
            pos_encoding_mode="NONE",
            sm_scale=sm_scale,
            rope_scale=rope_scale,
            rope_theta=rope_theta,
        )
        # Merge State
        merge_state_in_place(V_shared, S_shared, V_unique, S_unique)
        return V_shared
```


#### 1.4 小结

在压缩 KVCache 长度方面，主要包括两大类工作：

- Token 稀疏化。这是一种算法层面的优化，直接降低了计算。但由于舍弃了部分 Token 的注意力计算，所以理论上是有损的，可能需要训练侧保证模型效果。而 Token 稀疏化也大致分为两类：动态稀疏化和静态稀疏化。两种稀疏化共同点是在计算预测下一个 Token 时，只维护一个窗口大小的历史 Token 信息。静态稀疏化的窗口内的 Token 是固定的，而动态稀疏化是不固定的。
- Prefix Caching。这是一种工程优化，算法层面上是一种无损优化，无需训练侧介入。
这两类工作是正交的，可以叠加使用。

### 2. 压缩每个 Token 的 KVCache 

前文提到，每个 Token 的 KVCache 由四大因素决定：Layers、NumHead、HeadDim、以及 KVCache 数据类型决定的。所以压缩每个 Token 的 KVCache 大小就有四大方向，其中 NumHead、HeadDim实际上是HiddenSize维度，下面将这两个因素合并成一个方面聊聊。

#### 2.1 Layers

在思考压缩前，我们都可以问一个问题：需要压缩的对象是否存在冗余信息？是否需要全量执行？如果可以，应该怎么挑选重要性，压缩对象最重要的部分，在保证模型效果不会有大幅降低的前提下提升推理的性能？所以，第一个实验就是找出最关键的层。

<strong>LayerSkip</strong>

LayerSkip 作者在设计 LayerSkip 前做了一个实验，观察整个 Transformer 每一层到底完成什么事情。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0636ff6dab6a.jpg)

作者使用 LLaMA 7B 测试 HumanEval 代码测试集，主要用于代码生成。实验时在 LLaMA -7B 每层 TransformerLayer 后都接入 LM Head 层，统计整个生成过程中，每一层 TransformerLayer 生成每一个 Token 的概率分布。通过上图右侧表格可以观察到两个现象：

- 前面层生成的结果大部分和最终结果几乎毫无关系，主要原因是前面的层的权重和 LM Head权重没有适配过，所以生成效果很差；越到后面的层，生成的结果越接近最终结果，不断收敛到最终结果；
- 大部分情况下不需执行所有层，提前退出计算也可获得最终结果。
所以，针对以上两个现象，作者提出 LayerSkip，利用“早退”+ 投机采样优化推理性能，具体贡献为：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_21fc6854118e.jpg)

- 训练侧：早退层没有和 LMHead 适配，导致生成效果很差，所以在训练时候需要前面的层适应早退，具有一定的直接生成 Token 的能力，所以针对早退层添加了一个 Early Exit Loss，增强早退层的生成能力，如上图左侧所示；
- 推理侧：自投机解码策略。利用早退层推理速度快的特点，生成多个 draft tokens，然后验证阶段跑全量层，将通过验证的 draft tokens 返回。上图右侧所示的是自投机解码策略整体架构。浅绿色节点表示 缓存到显存的状态 KVCache，深绿色节点表示需要进行计算，透明节点表示跳过计算。通过图可得知，仅早退层及之前的层需要 KVCache，后续的层都不需要，所以 LayerSkip 有两大优化：加速预测性能；降低显存开销，潜在提升服务最大吞吐。
<strong>YOCO</strong>

上述提到的方法主要是用“裁剪”层方式，仅用部分层的 KVCache 完成全量结果的计算。除了“裁剪”层方式，还可以通过“共享”层方式压缩 KVCache。微软提出了 <strong>Y</strong>ou<strong>O</strong>nly <strong>C</strong>ache <strong>O</strong>nce（<strong>YOCO</strong>），通过多层共享 KVCache 的方式压缩。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d19cd0f3634d.jpg)

YOCO 模型架构与 LLaMa 等 Decoder Only 模型不同，YOCO 采用 Decoder-Decoder 模型架构，模型架构如上图所示。YOCO 主要由两大模块组成：Self-Decoder 和 Cross-Decoder。YOCO 的前 L/2 层由 Self-Decoder 层堆叠，由最后一层Self-Decoder 层输出 KVCache；后 L/2 层由 Cross-Decoder 层堆叠，由第一层加载 Cross-Decoder 层加载 KVCache，生成最终结果。由于只有一层 KVCache，所以推理时 Prefill 和 Decode 流程均和传统的 Transformer 不同。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_254c6793c131.jpg)

- Prefill 阶段：在传统的 Transformer 结构的模型中，每一层都会计算 KVCache，所以在 Prefill 阶段每一层都会运行，并且生成 KVCache；而 YOCO 只有 Self-Decoder 才会生成 KVCache，并且生成下一个 Token 取决于当前 Token 的值，所以在 Prefill 时所有输入的 Token 经过 Self-Decoder 计算后，仅最后一个 Token 需要运行后续 Cross-Decoder，完成首 Token 的生成。
- Decode 阶段：在该阶段，模型输入只有当前一个 Token，输出下一个 Token。所以在 Self-Decoder 仅对当前Token 进行 Attention 计算，类似对一个 Token 进行 Prefill，生成该 Token 的 KVCache，然后在 Cross-Decoder 进行Decode Attention计算，生成下一个 Token。

#### 2.2 HeadDim & NumHeads & HiddenSize

在这个维度上，主要的相关工作有 MQA、GQA 和 MLA，借用 DeepSeek V2技术报告的一张图解释下这三者的做法。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ef121baca72.jpg)

MHA、GQA、MQA 以及 MLA 做法从左到右依次是 MHA、GQA、MQA 以及 MLA 。图中有阴影的长条表示会缓存到显存的结果。MHA、GQA、MQA 都需要将 KVCache 缓存到显存。MHA KVCache 在 NumHeads 这个维度和 Q 矩阵一样，属于“一对一”，而 GQA、MQA 在 NumHeads 维度比 Q 矩阵小，KVCache 一个头共享 Q 矩阵多个头，属于 “一对多”，与 MHA 相比 KVCache 显存占用降低到 \frac{1}{GroupSize} （GroupSize 表示共享 Q 矩阵的头数），理论上可以存储的 KVCache 最大 Tokens 数相比 MHA 可以提升 GroupSize 倍。与 GQA、MQA 直接压缩 KVCache 头维度不同，MLA 压缩 HiddenSize 维度。MLA 对输入的 HiddenState 会先做低秩转换，将一个 Shape 为  [S, H] 的 HiddenState 压缩到 Shape 为 [S, CH] 的 c_{t}^{KV} ，其中 CH\ll H 。MLA 会将 c_{t}^{KV}作为 KVCache 存储到长显存中。当 Decode 阶段需要进行 MHA 时，会将加载 c_{t}^{KV} ，然后做两个升秩转换，分别转换为 Shape 均为 [S, H] 的 K、V 矩阵，然后进行 MHA 计算。MLA 通过低秩转换方式压缩 KVCache，从公式来看引入了额外的升秩转换计算，并且需要存储升秩转换计算的激活值结果。但可以根据矩阵乘的交换率特性，将升秩转换的矩阵乘权重和其他权重融合，然后在 attention kernel 直接通过c_{t}^{KV}完成 attention 计算，无需引入额外的计算开销以及存储开销。以下是 MHA、GQA、MQA 以及 MLA 每个 Token 的 KVCache 存储成本。MLA 的 KVCache 存储成本约等于 GroupNum = 2.25 的 GQA 的 KVCache 存储成本。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_58efbed044ba.jpg)

#### 2.3 DataType

在这个维度压缩主要就是低比特量化。具体做法是将 BF16/FP16 的 KVCache 先量化为低比特类型，将量化后的结果和 Scale 存储在显存中。然后 Attention Kernel 在加载 KVCache 时会将其反量化为高精度的KVCache，再进行 Attention 计算。虽然 Attention 计算引入了反量化的计算开销，但是其访存开销也大幅降低，可以对冲反量化带来的计算开销。并且由于单 Token 的 KVCache 显存大幅度降低，可以在线能处理的 Tokens 数也大大增加，提升了长文本推理效率。常见的低比特类型有 INT8、INT4，使用 Per-Group 方式对 KVCache 进行量化。也有比较激进的 2-bits 量化，如 [KIVI](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2402.02750)。

### 3. 总结

为了解决 LLM 长文本推理性能问题，大部分工作聚焦于算法以及模型结构上的优化，工程优化大多是针对特定场景。要想获得超线性优化，压低推理成本理论上限，还得靠算法以及硬件上的突破。我个人推测后续会有更多如 YOCO、MLA 等模型架构上的亮眼创新，继续压低 LLM 推理成本理论上限。

### 4. 参考文献

- [https://yaofu.notion.site/Full-Stack-Transformer-Inference-Optimization-Season-2-Deploying-Long-Context-Models-ee25d3a77ba14f73b8ae19147f77d5e2#d03b8a2a583246cea5a1fdeb8f583586](https://link.zhihu.com/?target=https%3A//yaofu.notion.site/Full-Stack-Transformer-Inference-Optimization-Season-2-Deploying-Long-Context-Models-ee25d3a77ba14f73b8ae19147f77d5e2%23d03b8a2a583246cea5a1fdeb8f583586)
- [阿杰：vLLM & PagedAttention 论文深度解读（一）—— LLM 服务现状与优化思路](https://zhuanlan.zhihu.com/p/656939628)
- [MODEL TELLS YOU WHAT TO DISCARD: ADAPTIVE KV CACHE COMPRESSION FOR LLMS](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2310.01801)
- [H2O: Heavy-Hitter Oracle for Efficient Generative Inference of Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.14048)
- [Efficient Streaming Language Models with Attention Sinks](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.17453)
- [Confused with four attention mechanism and their performance mentioned by paper · Issue #33 · mit-han-lab/streaming-ll](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/streaming-llm/issues/33)
- [https://lmsys.org/blog/2024-01-17-sglang/](https://link.zhihu.com/?target=https%3A//lmsys.org/blog/2024-01-17-sglang/)
- [Cascade Inference: Memory Bandwidth Efficient Shared Prefix Batch Decoding](https://link.zhihu.com/?target=https%3A//flashinfer.ai/2024/02/02/cascade-inference.html)
- [LayerSkip: Enabling Early Exit Inference and Self-Speculative Decoding](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.16710)
- [You Only Cache Once: Decoder-Decoder Architectures for Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.05254)
- [KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2402.02750)