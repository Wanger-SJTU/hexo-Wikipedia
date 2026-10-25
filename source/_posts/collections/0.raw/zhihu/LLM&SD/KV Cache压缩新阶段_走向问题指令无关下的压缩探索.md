---
title: KV Cache压缩新阶段:走向问题指令无关下的压缩探索
date: "2025-02-04 00:00:00"
updated: "2025-02-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/KV-Cache压缩新阶段_走向问题指令无关下的压缩探索/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/21106979890
---


最近在和朋友交流中，经常就会聊到了KV Cache压缩这个方向现在变得比较卷，许多Cache压缩方法都已经变得非常无损，很难进一步提升，继续研究的意义不大之类的问题。我也曾被这个问题困扰过，但近期和NVIDIA kvpress开源团队合作中，对这个问题有了一些新的思考。写一些东西宣传一下最近工作的进展，同时分享一下自己的看法：**KV Cache压缩未来的研究重点可以尝试关注在摆脱问题指令依赖性方面，这里仍有很大的研究空间。** 

我们之前的KV Cache头间预算调度工作[AdaKV](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.11550)受到关注后，不管是在学术界还是和工业界都受到了邀请进行了许多交流，其中常常提到的一个话题就是**现有压缩方法对于问题（指令）的依赖性：即在没有问题的情况下，现有的KV Cache压缩方法是否依旧能够表现出色？ 我的想法是：现有的方法是不能的，且有着很大的提升空间。**

在[NVIDIA kvpress](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/kvpress) [Blog](https://link.zhihu.com/?target=https%3A//huggingface.co/blog/nvidia/kvpress)这个开源项目中，它提供了一种很好的问题指令无关的压缩评估方法：首先将问题从上下文中剔除，此时KV Cache压缩方法对上下文（比如一个很长的文档）进行压缩，在压缩完成后输入问题评估LLM的生成质量，这样子就可以很好的模拟在问题未知的情况下Cache压缩的性能。我们和NVIDIA团队的合作，将我们Ada-KV（以及未来即将到来的工作）纳入到这一场景下进行了充分评估，发现利用Ada-KV头间调度就可以很好的缓解指令依赖性问题，通过增强现有方法达到了该Benchmark下的最高分数。

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_8bc1226e8d53.jpg)

NVIDIA团队在Blog中给出的问题指令无关评估结果（其中使用Ada-KV增强后的SnapKV和Expected Attention均有着显著提升，其中Ada-KV增强后的Expected Attention成为了全新的SOTA method）同时也宣传一下自己的工作：

[paper]:[[2407.11550] Ada-KV: Optimizing KV Cache Eviction by Adaptive Budget Allocation for Efficient LLM Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.11550) 我们更新了最新版本的Ada-KV论文，包含了我们自己对指令依赖性这个场景下的细致评估。欢迎大家关注，从结果来看Ada-KV在问题指令相关和问题指令无关的场景下提升都非常明显。 

许多朋友想要follow Ada-KV这种注意力头间预算调度的场景，但感觉由于需要写kernel比较繁琐，使得研究起来困难。我们提供了如下多个codebase，仅需要少量的代码就能够实现定制化的压缩算法，供你快速迭代算法：

- [推荐 Official AdaKV] [FFY0/AdaKV:](https://link.zhihu.com/?target=https%3A//github.com/FFY0/AdaKV) 这是我们提供的官方的AdaKV的代码实现，AdaKV最近的进展会不断在这个仓库保持更新，最近更新了关于GQA的兼容以及Llama 3系列模型的兼容。如果你想要follow AdaKV遇到了困难，即使与这个仓库代码无关，也可以直接在上面提ISSUE，我会尽量提供帮助。 
- [推荐 Official NVIDIA kvpress]: [NVIDIA/kvpress: LLM KV cache compression made easy](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/kvpress)piwheels - kvpress 这是一个非常酷非常容易上手的开源项目，简单到你只需要pip install并创建一个pipeline就可以开始使用许多KV Cache压缩方法，同时在多个benchmark上进行方便的测试。在官方的代码中，[SimJeg](https://link.zhihu.com/?target=https%3A//github.com/SimJeg) 提供了一种**fake** compression的方式进行模拟AdaKV头间调度的性能，十分适合快速迭代算法，同时保证了非常优雅的代码结构，十分推荐新手使用。
- [推荐 Customed NVIDIA kvpress]: [FFY0/AdaKV-in-NVIDIA-kvpress](https://link.zhihu.com/?target=https%3A//github.com/FFY0/AdaKV-in-NVIDIA-kvpress). 这是我和我的合作者Junlin Lv 提供的在kvpress框架下实现的AdaKV版本，这个版本使用了cuda kernel实现了**真正**的头间预算压缩，其运算效率在相同的cache budget下和常规压缩方法持平。核心策略是使用了一种varlen-flash-attention，常被用于Dynamic Batch中移除attention中的Padding运算。
- [PyramidKV] [Zefan-Cai/KVCache-Factory](https://link.zhihu.com/?target=https%3A//github.com/Zefan-Cai/KVCache-Factory) 这是PyramidKV的作者Zefan Cai从PyramidKV源码升级到KVCache算法的统一评估库，覆盖的算法也十分全面，支持了包括AdaKV在内的许多方法的评估。
- [Cloudflare kvcompress] [IsaacRe/vllm-kvcompress](https://link.zhihu.com/?target=https%3A//github.com/IsaacRe/vllm-kvcompress)。这是由Cloudflare Isaac Rehg 提供了AdaKV算法在vLLM下的落地应用，其中提供了非常详细的进一步评估数据（比如大Batch吞吐，70B模型的性能提升），也通过兼容Paged attention很好的解决了显存碎片问题。

#### 下面是自己的一些看法：**现有的压缩方法以及评估方式对于问题指令严重依赖，仍是一个很有空间的研究方向。**

现在大家一般公认的比较SOTA的压缩方法往往是SnapKV这种范式下的，例如目前广泛使用的大海捞针任务或者LongBench这种真实任务上的评估，**许多论文中的评估结果显示往往可以将Cache大小压缩到也没有什么很明显的损失。但这实际上这些方法远远并没有看起来的这么强大**，这主要结果是由于直接将问题和上下文一起压缩造成的结果，然而在一些真实的应用场景中，比如chunked prefill以及多轮对话之类的，这种针对于特定问题的压缩显然是不实际的。

下面是分别在4k ruler上 13个数据集均分的评估，可以看到如果带着问题一起压缩，SnapKV的损失还是比较小的，50%的Cache性能还能够接近90分，然而一旦在压缩上下文时排除掉问题，性能就会骤降到69.8分。

**

![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_3b73c368b2ef.jpg)

问题指令对KV Cache压缩的影响（SnapKV和Ada-SnapKV（AdaKV强化后的SnapKV）在ruler上的均分）

那么这个时候其实一个很重要的研究方向就可以被提取出来：我们是否可以不依赖特定的问题的场景下，对上下文进行压缩呢？从目前来看的话至少有两个方向是可以做的：**

- **设计更合理的Cache 重要性指标：**例如一开始的NVIDIA评估结果中就展示了一种新的cache 压缩方法expected_attention，这个方法由NVIDIA kvpress团队提出放在了kvpress项目中开源，目前文章还没有公开。可以看到这个expected_attention在这种不依赖特定的问题的压缩场景下，其性能要高于SnapKV，这个就主要得益于它对于cache 重要性的估计更为精准。
- **注意力头间的压缩预算调度增强：**我们的AdaKV就是首个实现了注意力头间的预算调度的压缩方法，可以看到通过AdaKV增强后的expected_attention和snapkv都有了非常明显的性能提升，尤其是ada_expected_attention，在50%的压缩率下已经接近85分数。
![](/images/collections/0.raw/zhihu/LLM%2526SD/asset/img_b455ab9bd04a.jpg)

NVIDIA kvpress团队在ruler上不带问题压缩测试结果（使用了Ada-KV分别增强了snapkv和expected_attention，其中ada_expected_attention获得了这个benchmark上所有方法的最高分）**

KV Cache压缩方法在实际应用落地时的价值是什么？**

在之前和企业的合作交流中，我感觉依赖和非依赖问题的Cache压缩都是有着实际应用场景的，但可能二者具体场景是不一致的。其中非依赖指令的Cache压缩的场景是比较明确，比如关于长文档Cache的缓存之类的工作，或者共用前缀的压缩，甚至是更多的chunked prefill以及多轮对话，它的应用场景相对来说就不会受限。

而依赖问题的Cache压缩场景则会相对狭窄一些，但感觉在一些场景下还是有着特定的应用方式，比如在用户单问题问答的场景下，现有的压缩方法可以很好的降低峰值显存占用，有效的扩张单卡推理的极限长度，同时还可以加速decoding。但一旦面临多轮的问答，则会带来准确率的显著降低，这种问题感觉可以考虑通过Cache重算的方法解决这个问题。这种方式可以用作一些端侧的推理场景，允许用户去单次推理一些极长的序列，也不损失准确率。

**Cache压缩与动态稀疏性方法的关系是什么？**

目前，许多优秀的工作，例如Quest Minference，通过稀疏性运算显著加快了推理速度，并且通常能够保持良好的准确率。在交流中，许多朋友将Cache压缩视为一种静态稀疏性方法，并与动态稀疏性方法进行对比，认为它们是互斥的关系。然而，在我看来，它们更像是一种互补的关系。静态稀疏性一个比较大的优点是降低显存占用，而动态稀疏性则无法解决这一问题。此外，在相同的稀疏比例下，运算速度的收益也存在显著差异。例如，在1024预算下，SnapKV的速度要显著快于Quest。同时，我认为现有的静态稀疏性和动态稀疏性本质上是一种正交关系。在应用中可以先prefill KV Cache，然后进行部分Cache的静态抛弃，进一步使用Quest，从而同时获得两者的增益。

到这洋洋洒洒也写了不少hhh，希望能够帮助到大家，一起推动KV Cache压缩领域往前走。欢迎大家继续关注我们之前的工作AdaKV以及即将推出的新工作，我们的工作都会及时开源代码，并且会积极帮助后续研究者的代码上手复现！如果大家对KV Cache压缩或者相关其他有趣的领域感兴趣，想要继续交流，可以私信我或者给我发邮件，祝大家新年快乐，新的一年科研顺利 !

####  ref: 之前关于KV Cache压缩的文章分享

[分享最新ICLR25 Submissions中LLM KV Cache压缩领域部分工作（Budget Allocation in KV Cache Compression） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/3284687442)

[如何提升LLM KV Cache压缩质量？A Promising New Direction:Head-wise自适应压缩预算分配（高效LLM推理） - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/2095621211)
