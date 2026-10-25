---
title: LLM 系列超详细解读 (九)：MobileLLM：优化 1B 参数之下的语言模型
date: "2024-07-03 00:00:00"
updated: "2024-07-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/LLM-系列超详细解读-(九)-MobileLLM-优化-1B-参数之下的语言模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/689006901
---


<strong>本系列已授权极市平台，未经允许不得二次转载，如有需要请私信作者。</strong>

### 专栏目录

[](https://zhuanlan.zhihu.com/p/625926419)

### 本文目录

<strong>1 MobileLLM：优化 1B 参数之下的语言模型</strong> **(来自 Meta) 
1.1 背景：缩小语言模型的规模势在必行
1.2 优化 1B 参数之下的语言模型的路线图
1.3 前馈网络选择
1.4 架构宽度和深度
1.5 嵌入层共享
1.6 Heads 的数量
1.7 层共享
1.8 实验结果
#### 太长不看版

本文着眼于大语言模型的延时和开发云成本不断增长的问题，希望探索轻量化且高质量的大语言模型，这里着重强调的是参数量小于 1B 的模型，这种配置也是移动部署中实用的选择。

与强调大模型数据质量和参数量的很多工作普遍强调的点不同，本文的研究着力于模型架构对 1B 参数量级别的 LLM 的重要性。本文提出的模型称为 MobileLLM，它的架构是 Deep and thin 的，且结合了词嵌入的共享和分组查询注意机制，比之前的 125M/350M 最先进的模型获得了显著的 2.7%/4.3% 的准确率提升。

本文最终得到的是一个新的模型家族：MobileLLM，SOTA 性能，在一系列 zero-shot 任务中，比之前的 SOTA 125M/350M 模型高出 2.7%/4.3%。

此外，本文还提出了一种直接的 Block 级别的权重共享方法，不增加模型大小，且延迟开销小幅增加。用这种方法训练的模型 MobileLLM-LS，精度比 MobileLLM 125M/350M 进一步提高了 0.7%/0.8%。此外，MobileLLM 模型家族的性能也有显著的改进，而且在 API 调用任务中的精度也与 LLAMA-v2 7B 很接近，这就证明了小模型对于端侧设备的能力。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_d5dae729690e.jpg)

图1：MobileLLM 精度与其他模型对比
#### 本文得出了哪些具体的结论

1) 网络架构：**

- 与 Scaling Law<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)相反，本文证明了深度比宽度对于小的 LLM 更加重要。一个 deep-and-thin 的模型结构擅长捕捉抽象概念，从而获得更好的最终性能。
- 重新思考了 OPT<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)中提出的 Embedding sharing 方法，并将 Grouped Query Attention<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)实现在小的 LLM 中。
<strong>2) 推理策略：</strong>

- 本文提出 Block-wise 的权重共享，用于内存移动成为延时瓶颈的情形。两个相邻 Block 之间的权重共享避免了移动权重这样的费时操作，只需要计算同一个 block 两次就可以，这样一来就可以降低延迟的开销。

### 1 MobileLLM：优化 1B 参数之下的语言模型

<strong>论文名称：MobileLLM: Optimizing Sub-billion Parameter Language Models for On-Device Use Cases</strong><strong>论文地址：</strong>

[](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2402.14905.pdf)

- <strong>1 MobileLLM</strong> <strong>论文解读：</strong>
<strong>1.1 背景：缩小语言模型的规模势在必行</strong>

大语言模型 (LLM) 已经渗透到人类生活的各个方面，不仅影响人们交流和工作的方式，还影响日常娱乐体验。领先的 LLM 产品，如 ChatGPT 和 Perplexity AI，主要在云环境中运行。ChatGPT4 等领先模型超过1万亿个参数，那么我们可以设想这样的一个未来的场景：人类在前端对话界面以及后端推荐系统中广泛地依赖于 LLM，它们甚至占据了人们每天时间的约 5%。在这个假设的场景中，以 50 tokens/s 的处理速度使用 GPT-4 需要部署大约 100 万个 算力为 60 TFLOPs/s 的 H100 GPU。这样的计算规模，不包括通信和数据传输开销，就已经与足足160 个 Meta 相当了。随之而来的能源消耗和二氧化碳排放将带来惊人的环境挑战。

因此，我们必须缩小 LLM。

而且，对可移植性和计算成本的考虑也推动了在智能手机和移动设备上部署 LLM 的必要性。在现代的移动设备技术中，由于 DRAM 容量的限制，将 LLaMA V2 7B<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)等具有8位权重的 LLM 集成到移动设备中是非常昂贵的。下图2展示了移动设备中流行的内存层次结构。iPhone 15 的 DRAM 容量约 6GB，而 Google Pixel 8 Pro 的约为 12GB。而且，原则是<strong>移动应用程序</strong>所占的空间不应超过 DRAM 的 10%<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)，因为 DRAM 还要放<strong>操作系统</strong>和<strong>其他应用程序</strong>。而且 LLM 的能耗也是一个很大的问题：7B 参数的 LLM 的能耗为 0.7 J/token。一个充满电的 iPhone 手机大约有 50kJ 的能量，可以以 10 tokens/s 的速度在对话中使用这个模型 2h，每次生产 64 个 tokens 就会耗掉 0.2% 的电池电量。

这些问题其实都可以归结为我们需要更加紧凑的 LLM 模型来在手机设备上面运行。比如一个参数量为 350M 的 8-bit 模型，仅消耗 0.035 J/token，那么 iPhone 就可以支持其使用一整天。而且，解码速度可以显着增强：比如一个 125M 的模型的解码速度可以达到 50 tokens/s。而最先进的 iPhone App MLC Chat 使用的是 LLaMA 7B 模型，解码速度仅为 3∼6 tokens/s。鉴于这些考虑，本文的动机是设计参数低于 1B 的 LLM 模型。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_247fdf205dbb.jpg)

图2：流行的移动设备中的内存层次结构。尽管有足够的 Flash 存储，但是执行高速应用程序主要依赖于 DRAM，通常限制为 6-12GB 大小**

1.2 优化 1B 参数之下的语言模型的路线图**

下面开始介绍从参数量为 1B 以下的 Baseline 的 LLM 到最终模型的整个过程，如图3所示。作者尝试了 125M 和 300M 这两种尺寸的模型，对于一些模型大小是主要限制条件的设备而言，如何高效分配模型的参数非常关键。本文探索的结论可以概括为：

- 采用 SwiGLU FFN。
- 采用 Deep-and-thin 的架构。
- 采用 OPT<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)中提出的 Embedding sharing 方法。
- 采用 Grouped Query Attention<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)。
- 提出 Block 级别的权重共享策略，进一步提高了精度，而且不会产生任何额外的内存开销。
探索实验在 32 A100 GPU 上面进行，训练长度是 120k iterations，文本是 0.25T tokens。评测方法是在零样本常识推理任务上评估，还有问答和阅读理解任务。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_69846a6de498.jpg)

图3：探索实验结果。前景和背景分别代表 125M 和 300M 的模型的 Zero-Shot 的常识推理任务的结果**

1.3 前馈网络选择**

作者首先把原始的 FFN (FC →ReLU → FC) 替换为了 SwiGLU，这使得 125M 模型 Zero-Shot 推理任务的平均性能从 42.6 提高到 43.9。因此，作者以后都使用 SwiGLU 进行实验。

**

1.4 架构宽度和深度**

一个普遍存在的认知是 Transformer 模型的性能主要由参数数量、训练数据集的大小和训练迭代次数决定。这个认知假设架构设计对变压器模型的性能的影响是可以忽略不计的。但本文的研究结果表明，这对于较小的模型可能不成立。本文的实验结果，尤其是对于容量有限的小模型，表明深度对于提高模型的性能非常重要。

本文的研究涉及 19 个模型的训练，包括 9 个具有 ∼125M 参数的模型和 10 个具有 ∼350M 参数的模型。每个模型都的设计大小相似，但在深度和宽度方面有所不同。作者在 8 个 Zero-Shot 的尝试推理任务以及问答和阅读理解的基准上进行了实验。实验的结果如下图4所示。更深的模型在大多数 Zero-Shot 的推理任务中都表现出了更加卓越的性能，这些任务包括 ARC-easy、ARC-challenge、PIQA、HellaSwag、OBQA、Winogrande 等。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_fd34b0d6baa4.jpg)

图4：在相似的模型大小下，更深更薄的模型通常在各种任务中都优于更广泛和更浅的模型，例如零样本常识推理、问答和阅读理解而且，这种趋势在 TQA 和 RACE 数据集上更为明显，如下图5所示。对于大小为 125M 的 Transformer 模型，具有 30 甚至 42 层的模型比具有 12 层的模型表现得更好。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ac2163512a2e.jpg)

图5：在相似的模型大小下，更深更薄的模型通常在各种任务中都优于更广泛和更浅的模型，例如零样本常识推理、问答和阅读理解**

1.5 嵌入层共享**

对于一个 1B 规模的语言模型而言，嵌入层 (Embedding Layer) 构成了参数量的很大一部分。对于一个嵌入维度为 512，词汇表大小为 32K 的模型而言，输入和输出的嵌入层各包含 16M 个参数，它们占据了 125M 参数模型规模的 20% 以上。相比之下，在更大的语言模型中，这个比例要低得多：输入和输出的嵌入层仅占 LLaMA-7B 模型中参数量总数的 3.7%，在 LLaMA-70B 模型中仅占 0.7%。

作者在小语言模型设计的工作中，重新回顾了嵌入层共享这一概念：

- LLM 模型的<strong>输入嵌入层 (Input Embedding)</strong>的作用是：把一个 token 的 id 映射为一个向量，其维度是：(vocab_size, embedding_dim)。
- LLM 模型的<strong>输出嵌入层 (Output Embedding)</strong> 的作用是：把一个向量反映射为 token 的 id，以转化成具体的词汇表的 logit 预测结果，其维度是：(vocab_size, embedding_dim)。
通过输入嵌入和输出嵌入层的权重共享，就可以得到更加高效和紧凑的模型架构。

作者在一个 30 层的大小为 125M 的模型上面进行了实验，结果如图6所示。可以看到输入和输出嵌入层的权重共享将参数量减少了 16M，占总参数量的 11.8%，而平均精度仅仅下降了 0.2。这个极小的精度下降我们可以通过额外加一些层来弥补。与原始的 135M 的模型相比，把层数增加至 24 可以带来约 0.4 的精度增益。在 350M 量级的模型里面仍然可以观察到类似的结果。这些发现也进一步表明，在给定有限的模型存储预算的前提下，可以通过权重共享来最大化权重的利用效率以提升模型性能。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_772f37afe328.jpg)

图6：使用 512 嵌入维度的 30 层模型进行输入输出嵌入共享的消融实验结果，任务是 Zero-Shot 的常识推理任务**

1.6 Heads 的数量**

作者接下来研究 Transformer 模型的最优 Head 数量。Head 数量少的话每个 head 的语义信息比较丰富，head 数量多的话多个 heads 可以非线性组合。本文发现 Grouped Query Attention，最初是为减少 LLM 中的 KV-cache 的大小而设计的，也可以有效地减少语言模型中 Key-Value heads 的冗余。Grouped Query Attention 可以视为权重共享的另一种形式，其中 Key-Value heads 的数量是 Query heads 的 1/n 倍。

作者探索了 125M 和 300M 两种大小的 Transformer 模型的最优 Head 数量，实验结果如图7所示。可以看到使用 16 个 query heads 获得的结果是最好的。而且，把 kv-heads 的数量从 16 个减少到 4 个不影响 125M 模型的性能，且只会使得 300M 模型的性能轻微下降 0.2，但却能够带来 10% 的参数量削减。通过使用 Grouped Query Attention，同时适当增加模型宽度以维持参数量，使得 125M 大小模型的精度进一步提升了 0.4。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1091c64f062e.jpg)

图7：Heads 数量和 kv-heads 数量的消融实验结果这一步得到的模型称之为 MobileLLM。

**

1.7 层共享**

上节的发现表面了层数的增加有益于小型 Transformer 模型，这也启发作者探索层共享 (Layer Sharing) 策略，即在不增加模型存储成本的前提下增加隐藏层的数量。这种方法特别适用于模型大小是一个主要约束的设备上场景。令人惊讶的是，本文的实验结果表明，可以通过简单地复制 Transformer Block，就能够提升模型的性能，而不需要修改架构或者缩放模型。本文作者尝试了下图8的四种方案。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5848afa1b8fe.jpg)

图8：(a) 不使用层共享的基线模型。(b) 连续层共享。(c) 重复层共享。(d) 逆向层共享实验结果如下图9所示。实验结果表明重复层共享的方式得到的结果是最好的。但是考虑到图2中的硬件的内存层次结构，用于计算的 SRAM 通常应小于 20M 左右。这样的量级通常只能容纳下一个 Transformer Block。因此，在 Cache 中存储权重，并且一次性立即计算两次可以避免把权重在 DRAM 和 SRAM 之间来回传递，从而提高自回归的 Transformer 模型整体的推理速度。因此，综合以上考量，本文最终选择的方案是连续层共享。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3065fc89a102.jpg)

图9：层共享策略的消融实验结果这一步得到的模型称之为 MobileLLM-LS。

**

1.8 实验结果**

MobileLLM 优化器 Adam，weight decay 使用 0.1，初始学习率为 2e-3，使用余弦衰减策略，最高精度的模型在 1T tokens 上面训练了 480k iterations。评估的任务包括 Zero-Shot 的常识推理任务、问答和阅读理解任务。

<strong>Zero-Shot 常识推理任务</strong>

实验结果如下图10所示。作者对比了 OPT<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6), BLOOM<span class="wikilink wikilink--missing" title="未导入的页面">7</span>(#ref_7), Galactica<span class="wikilink wikilink--missing" title="未导入的页面">8</span>(#ref_8), Cerebras<span class="wikilink wikilink--missing" title="未导入的页面">9</span>(#ref_9), GPT-neo<span class="wikilink wikilink--missing" title="未导入的页面">10</span>(#ref_10), Pythia<span class="wikilink wikilink--missing" title="未导入的页面">11</span>(#ref_11)和 RWKV<span class="wikilink wikilink--missing" title="未导入的页面">12</span>(#ref_12)这几个模型。对于 125M 大小的量级，MobileLLM 在相同模型尺寸下显著地优于其他模型，例如 OPT、GPT-Neo 和 Calaclafa。此外，MobileLLM-125M 的精度分别比 Pythia-160M 和 RWKV169M 高 3.8 和 2.7，同时分别小 22% 和 26%。此外，MobileLLM-LS 125M 模型使用层共享策略能进一步将精度提高 0.7。

值得注意的是，MobileLLM-LS-125M 取得了与之前大多数 350M 模型相当或更好的结果。对于 350M 大小的量级，MobileLLM 比之前的最先进的模型高出 4 个点往上。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a41694945da2.jpg)

图10：Zero-Shot 常识推理任务实验结果<strong>问答和阅读理解任务</strong>

作者在 TQA 问答的 benchmark 和 RACE 阅读理解的 benchmark 上进行了测评，实验结果如图11所示。对于 125M 大小的量级，MobileLLM-125M 在 TQA benchmark 上取得了 4.3 的显著改进。而且，MobileLLM-350M 模型提升大约 10 个点的精度。对于阅读理解任务也是这样，MobileLLM 系列模型的精度也比前面的小模型要好很多。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a6b54b85ac6b.jpg)

图11：问答和阅读理解任务实验结果<strong>量化实验结果</strong>

作者对 MobileLLM 和 MobileLLM-LS 模型进行了后训练量化 (Post-Training Quantization, PTQ) 实验，量化的模型是在 0.25T tokens 上面训练的 125M 和 350M 大小的模型。实验结果如图12所示，使用 W8A8 量化会带来小于 0.5 的精度损失，而且量化与层共享兼容。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_b476086bc8a8.jpg)

图12：量化实验结果

### 参考

- [^](#ref_1_0)Scaling Laws for Neural Language Models
- ^[a](#ref_2_0)[b](#ref_2_1)OPT: Open Pre-trained Transformer Language Models
- ^[a](#ref_3_0)[b](#ref_3_1)GQA: Training generalized multi-query transformer models from multi-head checkpoints
- [^](#ref_4_0)Llama 2: Open foundation and fine-tuned chat models
- [^](#ref_5_0)Towards energy-proportional datacenter memory with mobile DRAM
- [^](#ref_6_0)OPT: Open Pre-trained Transformer Language Models
- [^](#ref_7_0)BLOOM: A 176B-Parameter Open-Access Multilingual Language Model
- [^](#ref_8_0)Large Language Models for Science
- [^](#ref_9_0)Cerebras-GPT: Open Compute-Optimal Language Models Trained on the Cerebras Wafer-Scale Cluster
- [^](#ref_10_0)GPT-NeoX-20B: An Open-Source Autoregressive Language Model
- [^](#ref_11_0)Pythia: A Suite for Analyzing Large Language Models Across Training and Scaling
- [^](#ref_12_0)RWKV: Reinventing RNNs for the Transformer Era
