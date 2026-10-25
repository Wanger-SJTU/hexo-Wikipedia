---
title: "[NeurIPS'25 Spotlight] 清华/MIT/伯克利联合推出，自适应、层级化的Top-p 稀疏注意力 Twilight"
date: "2025-11-04 00:00:00"
updated: "2025-11-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/[NeurIPS'25-Spotlight]-清华_MIT_伯克利联合推出,自适应、层级化的Top-p-稀疏注意力-Twilight/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1965053340472809384
---


在沉淀了半年后，Twilight 终于被 NeurIPS 2025 接受并且分数还挺高，拿了个 Spotlight，我也是终于可以把这篇在 Sparse Attention 沉淀了这么久的心得体会给大家写出来。最新版本的论文和代码如下，欢迎Star/讨论 😘：

- [Twilight: Adaptive Attention Sparsity with Hierarchical Top-$p$ Pruning](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.02770)
- [https://github.com/tsinghua-ideal/Twilight](https://link.zhihu.com/?target=https%3A//github.com/tsinghua-ideal/Twilight)
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b05261534380.jpg)

### 稀疏注意力综述

上半年在 Deepseek NSA 大火的时候我刚好也在相关问题下[水了一篇回答](https://www.zhihu.com/question/12616022631/answer/104511247956)，不过这里还是重新复习一下。这里推荐一个 Efficient Attention 的 Survey，个人感觉写得很好。TL'DR 的话，对于加速注意力我们有一类稀疏注意力算法，它们的本质原理都是在 sequence length 维度做 pruning。稀疏注意力也可以细分为不同的类别。我一般会分为四类：

- <strong>加速 Prefill</strong>的 [MInference](https://link.zhihu.com/?target=https%3A//github.com/microsoft/MInference)、[SpargeAttn](https://link.zhihu.com/?target=https%3A//github.com/thu-ml/SpargeAttn) 等，这类主要是加速平方 Attention 的计算过程，同时可以用于 LLM 的 Prefill 和视频生成模型的 Attention，注意这类算法做完 Prefill 后还是有完整的 KV Cache，因此对后续的 decoding 没有收益，当然这也意味着它们是正交的。
- <strong>压缩 KV Cache</strong>的[SnapKV](https://link.zhihu.com/?target=https%3A//github.com/FasterDecoding/SnapKV) 等，这类不加速 Prefill，但是会在 Prefill 做特殊处理使得 KV Cache 得到某些程度的压缩，这样后续的 Decoding 都能得到加速，同时由于压缩了 KV Cache 使得我们也节省了 GPU 存储空间。
- <strong>加速 Decoding</strong>的 [Quest](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/Quest)、[DoubleSparse](https://link.zhihu.com/?target=https%3A//github.com/andy-yang-1/DoubleSparse) 等。这类不加速 Prefill，但会在 Decoding 阶段选择性地 load KV Cache，由于自回归阶段众所周知是 memory-bound 的，节省 loading 就相当于加速时间。这类方法不省 GPU 存储，因为我们还是把所有的 tokens 都存在 GPU Dram 中。
上面的方法都属于 training-free 的或者需要一点点训练新引入的部分（如 [SeerAttention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.13276)）。此外，还有第四种（论外）方法，即 Trainable Sparse Attention。这类方法相当于对模型架构的修改，在训练中即使用 Sparse Attention，例如 [NSA](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.11089)、[MoBA](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.13189) 以及 Deepseek V3.2 的 [DSA](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepSeek-V3.2-Exp)。这些算法的设计上其实也受到了不少上面三种方法的启发。不过本文重点关注加速 Decoding 的中间两种做法。

首先，我们有一个结论：第二种压缩 KV Cache（例如丢弃 tokens 等）一般都比第三种选择性地 loading KV cache 在 accuracy 上差，这是因为你无法预测将来是否还会用到被你丢掉的 tokens 的信息，我们论文的 Appendix 里也有和这类方法进一步比较。不过第二种方法的好处就是省显存——但在有了 GQA、MLA 的今天，KV Cache 的存储似乎没那么着急了，因此我们再把视角放到第三种注意力中。

### Top-k 稀疏注意力

我们可以把这类注意力统一成如下架构：

- Token Selector，负责用某些算法来选出一个 indices。一般会通过一个非常快速的 Q*K 操作估计出 attention weights，然后喂给 topk 算法选出前 k 大的元素及其 indices。我们把这个 indices 的大小称为 Budget 或者是 Top-k 里的 k。不同的算法一般都是在 Token Selector 上玩的比较花。
- Sparse Attention，负责接收 indices 并进行计算，这里其实一般直接复用成熟的 Paged Attention 实现就可以了，读者很容易会发现这个接口和 PA 是差不多的。
我们会发现这类算法的收益来源是 Sparse Attention 只需要算 k 个 tokens，而 Token Selector 作为额外引入的 overhead 一般很小。实际部署时，一般会指定一个固定的 k 或者固定的 ratio（k=ratio*seq_len）。但由于实际的分布往往变化很大，固定的 k 并不高效，这一问题在我们把稀疏算法部署到 Serving Engine 里问题更大，因为你要在启动 Engine 的时候决定 k，那么这个固定的 k 在 Engine 运行时就都没法改。

因此，学术界就有一系列 Adaptive Budget<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1) <span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2) <span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3) <span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4) <span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)的工作。就以 [PyramidKV](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.02069) 为例，它观察到 Transformer 的不同层需要不同 Budget，因此拟合出了一个调整 Budget 的策略（其实就是等差数列递减）。 [DuoAttention](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.10819) 则提出的是不同的 head 需要不同 Budget，不过它提出 head 间主要是两极分化，即一部分用 full，一部分用 streaming 即可取得不错的效果。除了不同 layers、不同 heads，不同 queries、不同 prompts 也都会影响这个 Budget。因此这不由得让我们思考：这个动态 Budget 的本质是什么？

到这里，我们突然联想到了一个同属于 LLM 组件，但是位置不太一样的地方：sampling，即把 logits 分布转换为 output token 的最后一步。我们其实面临一个和 Sampling 之前很像的境遇：之前的 top-k sampling 也是由于固定的 k 无法适应动态的分布，随后引入了 top-p sampling（nucleus sampling<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6)）。 基于此我们进一步思考：Budget 的定义是<strong>“达到某个目标的最小预算”</strong>，因此研究 Budget 本质就是在研究这个目标是什么。最根本的当然是长文能力，俗一点说就是 benchmark 上的点，不过这里肯定没法直接反馈到注意力上。因此我们根据注意力的 output error 给了一个 bound，我们发现我们可以用所选 tokens 的 attention weights 之和来 bound 住这个 output error——这个之和刚好就是 top-p 里的 p。因此这个目标虽然不是最终目标，但是起码也有了个 bound，故也说明了 top-p 的初步合理性。我们基于 oracle top-p 评估了一个具体 LLM 的实际 budget 情况，果然观察到了不同层级的 budget dynamism（见 Appendix A）：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0141bc113292.jpg)

可以看到不同层级的 Budget dynamism 都被我们统一衡量出来了，并且我们还观察到了 Head-level 的 dynamism 是最大的，这也和之前工作的一些观察比较吻合需要注意的是，不止我们注意到了 Top-k 注意力的局限性。[MagicPIG](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.16179) 也同样打破了 Top-k 的局限性，而且它还不受制于 selection-based，即它并不是选择部分 tokens 进行计算。我们也与其进行了比较，同样发现它相比 Top-k attention 是好上不少的。

### Twilight 的设计与实现

一开始其实故事到这里，可能就是直接实现又一个 Sparse Attention 算法了。不过我当时想的是，能不能做一个通用的优化把现有的 Top-k 稀疏算法转化为 Top-p。这个一开始想了很久都没解决，因为 Top-k 算法的 Token Selector 太多样了，很难抽出一个统一的部分然后改改，非要说统一的地方就是它们都会输出一个 indices。但我这时注意到一个比较关键的点：<strong>Token Selector 这部分的开销和你的 Budget 基本没关系</strong>。这是啥意思呢？举个例子，我用 Quest 的 Selector 帮我筛 top-2048 个最重要的 tokens，和我用它筛 top-256 个，其实开销是基本一样的。这是因为 Selector 时间主要还是花在一个类似 GEMV 的操作，它一般都会把整个 context 读进去，至于 Budget 可能会影响 top-k 算子，但一是影响不大，二是 top-k 本身很快。

那么一个初步的想法就有了：我们先用基础算法的 Selector 做粗筛，budget 设成  sparsity 或者更大，然后我再插入一个 Top-p 做精筛，这被我们称作<strong>Select-then-Prune</strong>架构。这里的合理性在于虽然 top-k 有我们上面说的问题，但是当你把 budget 拉的很大的时候，它基本还是能选出大部分重要的 tokens 的。另一方面这个架构又和 sampling 阶段的 topk-topp-sampling 不谋而合，实在不错。

不过具体实现起来也有很多困难，这部分甚至占了我们 Paper 的一大部分（Sys Paper 实锤了 x）。首先是我们如何做一个高效的 Top-p Pruner。大体过程和 Top-k 肯定一样，先做一个 lightweight 的 QK，再喂给 Top-p 算子。这里 lightweight 的意思一般会把 K cache 做一些压缩（因为这一步也是 memory bound），然鹅我们发现 Top-k 能用的压缩率在 Top-p 完全不行。DoubleSparse 里可以把 K cache 压到 2bit 再加上  的 channel pruning 达到 16x 的压缩，但是我们来看 Top-p 上的实验：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ef90a6a8fca1.jpg)

可以发现用 2bit 估出的 Attention Weights 去筛 top-p 会灾难性地下滑。4bit 表现倒是不错，这也比较合理：Top-p 的精度要求夹在 Top-k 和 Full Attention 之间。[SageAttention 2](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.10958) 用的也是 4bit，跑的也不错。因此我们这里就敲定用 4bit 精度，虽然这样会导致开销比 16x 的压缩慢，但是由于 Top-p 是精筛，刚好 seq len 也没那么长。做到这里其实能感受到这个方法的一点美感：最上层的 TopK 精度差，所以 Budget 选大一点； TopP 落在中间层，Seqlen 中等，但是精度也中等；最下层的 Attention 需要 fp16 的值，但是 Budget 最小。刚好是一个 trade-off。我们收益就是在赌 Twilight 的额外开销（Top-p Pruner）要比我们在 Attention 部分节省的多。这里我特地画了一张图来描述这部分的收益，但是最后没放进去，就在这里用一下吧：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_369412f628e3.jpg)

然后下一步就是要实现一个高效的 Top-p 算子。由于灵感是 sampling 那边来的，我就魔改了FlashInfer top-p sampling 的实现，具体是通过一个二分查找来实现的，不需要排序，实际跑下来还挺快就没继续改。不过 FlashInfer 最近还改进了它们的算法：Sorting-Free GPU Kernels for LLM Sampling，并且很荣幸地 Twilight 在其中被提到了hahaha。在这里也给 FlashInfer 打个广告，想比 Triton 更快又想魔改注意力，请第一时间认准！

最后，在 Sparse Attention 阶段，我们也可以直接复用 Paged Attention 来算。不过这里由于 top-p 会导致不同 heads 的 budget 不同，得做一点处理。这里我们和同期工作 [Tactic](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.12216)（有点撞车，他们也是 top-p attention，不过它们是一个单独的算法而不是 optimizer，区别主要在没有 hierarchy 结构，但是 selector 做的更 light）差不多，都选择把 num_heads 给 flatten 掉。实际测下来这样喂给 FlashInfer 的 decode kernel 性能还是可以的，不过到现在可能要 rethink 一下了，因为现在 decode kernel 也用上了 Tensor Core，有可能打不满（注意，FlashInfer 现在的 decode.cuh 要被删了，decode 的实现在 prefill.cuh 里）。这也是 Top-p 的一个 general 的可能的劣势：太 Dynamic，导致形状很不规则，有可能与 hardware 非常不 align。

### Kernel 优化的更多细节

其实到这里差不多就可以结束了，但是作为一个在 CUDA 的神秘问题上磨了很久的人，还是在这里补充一些细节实现（这部分内容可以参照论文的 Appendix B）。

#### FP16 INT4 SpGEMV

首先是实现 FP16 乘 INT4 的 GEMV，由于这里 INT4 Key Cache 有 Paged，因此我们叫 Sparse GEMV，其实就是 Paged Attention 的一半。这和 DSA 里的 lightning indexer 其实有点像，不过我暂时没看到它们的 paged 版本。计算流程主要是通过 cp.async（一个 NVPTX 指令）把 Key Cache 从 Global Memory 加载到 Shared Memory，然后做 qk的 dot。注意这里要做好 load/compute 的 pipeline。由于之前是在 A100 上做的，也没有 TMA 的事了。但这里的 dot 没有用 Tensor Core，直接用的 `fma.fp16x2`，如果加上的应该会更好。作为一个混精度乘法计算，这里主要有两点要注意：

- Dequantization，这部分的开销其实会比预想中的大很多，因此这里要用到 fast dequantization 来加速，具体可以参照[DefTruth 大佬的blog](https://zhuanlan.zhihu.com/p/657072856)以及[NVIDIA FasterTransformer 的实现](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/FasterTransformer/blob/main/src/fastertransformer/cutlass_extensions/include/cutlass_extensions/interleaved_numeric_conversion.h)。此外，由于 dequantize 还要存一些额外参数：scales/zeros，这部分的存储和load也需要额外设计。
- Bit-packing，这里主要是针对 INT4，由于 C++ 寻址的最小单位是 byte/8 bits，因此这里在代码实现上有一些 tricks 要注意。具体来讲，我们传入的时候存储类型用的是 `uint8_t`，但是在逻辑处理上后续都当成 4bit 计算，最后 dequantize 到 fp16 参与计算。
在 qk dot 上，原先 FlashInfer 采用的是 fp32 的 q_vec/k_vec buffer，这里为了速度改用 fp16 的 buffer（accumulator 还是 fp32），实际测下来精度会有掉，但是由于我们本来就 int4 quantized 了，而且只是传给 top-p 用的，因此精度需求并不高。在具体实现中，参考了很多[QServe](https://link.zhihu.com/?target=https%3A//github.com/mit-han-lab/omniserve/tree/qserve)和[Atom](https://link.zhihu.com/?target=https%3A//github.com/efeslab/Atom/tree/main)的代码，在这里也深表感谢。注意，我们这里花大力气做计算的优化主要是因为如果不做好的话，这部分就不会 memory bound，导致 int4 可能还没有 int8 快。最后经过精心调优测量的结果也是比较 nice：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5b80133a1615.jpg)

#### GQA 兼容

GQA 和 Sparse Attention 八字不合已经不是什么新鲜事了，NSA 论文中就提出过这回事。主要原因是 Sparse Attention 的每个 query head 都要选不同的 indices，如果是 MHA 的话每个 head 都是独立的，离散地去 load 并没有啥问题；但是当 GQA 的时候如果同一个 group 的 query index 到了相同的 KV，那么就会有重复 load，最坏情况可能退化成 MHA。

Twilight 当然也不能免俗，因此我们采取了一个比较通用的做法：对同一个 group 的 query 取它们 indices 的 union。同时，我们上面提到过了由于不同 head budget 不同，Paged Attention Kernel 需要对 num_heads 做 flatten。这部分设计还要和 GQA 兼容做一些适配。最后我们对 GQA 的设计就是把 KV cache 的 num_heads flatten 掉，对于 query 则按 group 拆分，每个 group 是一个 sub-request，和对应的 KV cache 进行计算。大概设计可以看下图。不过这里还有个问题是这样对 Tensor Core 可能就没那么友好了，因此需要继续思考。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_123bdde890f1.jpg)

我们也做了一些简单的 evaluation，相比 Padded（即每个 head 都 pad 到最长）、Head Varlen（即对 GQA 仍然采用我们 MHA 中的方法，可能存在 repetitive loading），这个 Group-wise 的 dynamic budget 还是有收益的。

### 结语

Evaluation 部分就不放了，其实最后收益没那么大，在大 batch 的情况下 Quest-Twi 相比 Quest 在注意力部分最高达到 1.4x 的加速，放到 model 的 end-to-end 场景就更被稀释了（当然和 Full Attention 以及 PyTorch 比肯定还是随便十几x的）。感觉做了这么多还是以提一个新的 idea 为主吧，希望能给稀疏领域带来一些启发<span class="wikilink wikilink--missing" title="未导入的页面">7</span>(#ref_7)，看看 Top-p attention 能怎样在新的架构上发挥作用，同时试图去收敛 Adaptive Budget。同样也很高兴 Top-p 的 idea 也已经被 Video Generation 的稀疏算法<span class="wikilink wikilink--missing" title="未导入的页面">8</span>(#ref_8)用上了，希望不久的将来能看到诸如 Trainable Top-p Attention 这样的更神奇的操作！

### 参考

- [^](#ref_1_0)Ada-KV: Optimizing KV Cache Eviction by Adaptive Budget Allocation for Efficient LLM Inference [https://arxiv.org/abs/2407.11550](https://arxiv.org/abs/2407.11550)
- [^](#ref_2_0)DuoAttention: Efficient Long-Context LLM Inference with Retrieval and Streaming Heads [https://arxiv.org/abs/2410.10819](https://arxiv.org/abs/2410.10819)
- [^](#ref_3_0)PyramidKV: Dynamic KV Cache Compression based on Pyramidal Information Funneling [https://arxiv.org/abs/2406.02069](https://arxiv.org/abs/2406.02069)
- [^](#ref_4_0)PyramidInfer: Pyramid KV Cache Compression for High-throughput LLM Inference [https://arxiv.org/abs/2405.12532](https://arxiv.org/abs/2405.12532)
- [^](#ref_5_0)DynamicKV: Task-Aware Adaptive KV Cache Compression for Long Context LLMs [https://arxiv.org/abs/2412.14838](https://arxiv.org/abs/2412.14838)
- [^](#ref_6_0)The Curious Case of Neural Text Degeneration [https://arxiv.org/pdf/1904.09751v1](https://arxiv.org/pdf/1904.09751v1)
- [^](#ref_7_0)我就是传说中的灵感菇型reseracher，主打一个带来启发说是
- [^](#ref_8_0)Sparse VideoGen2: Accelerate Video Generation with Sparse Attention via Semantic-Aware Permutation [https://arxiv.org/abs/2505.18875](https://arxiv.org/abs/2505.18875)
