---
title: (1 条消息) Transformer模型的基础演算
date: "2023-05-19 00:00:00"
updated: "2023-05-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Transformer模型的基础演算/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/628820408
---


![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_498bf2050c0a.jpg)

**本文主要介绍与Transformer计算和内存使用相关的基本数学知识。

作者 | Quentin Anthony、Stella Biderman、Hailey Schoelkopf**

**OneFlow编译**

**翻译 | 贾川、徐佳渝、杨婷**

**

### 引言

Transformer语言模型的许多基本重要信息可以通过简单计算得出。不幸的是，这些计算公式在自然语言处理（NLP）社区中并不广为人知。AI非营利研究组织EleutherAI收集整理这些公式，并介绍这些公式的来源和重要性。

注：本文主要关注显存（VRAM）主导的训练成本。有关推理成本和时延方面的类似讨论，[请参见此前发布的《](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491309%26idx%3D1%26sn%3D407fefb7ec76a2c9fdfe1ae960f7de4d%26chksm%3Dfe4190dbc93619cd0b9bfecb979e142a125fd8548d323dd9bdc2cbeb619400202e6e1affced0%26scene%3D21%23wechat_redirect)[大型语言模型的推理演算》](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491309%26idx%3D1%26sn%3D407fefb7ec76a2c9fdfe1ae960f7de4d%26chksm%3Dfe4190dbc93619cd0b9bfecb979e142a125fd8548d323dd9bdc2cbeb619400202e6e1affced0%26scene%3D21%23wechat_redirect)**。

*（本文经授权后由OneFlow编译发布，译文转载请联系OneFlow获得授权。原文：https://blog.eleuther.ai/transformer-math/）*

### 计算需求

Transformer模型的训练成本可通过以下基本公式计算得出：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_516bdefc1c16.jpg)

其中：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_aa2970333455.jpg)

这些公式由OpenAI的论文[《Scaling Laws for Neural Language Models》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2001.08361)和DeepMind的论文[《Training Compute-Optimal Large Language Models》](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2203.15556)提出并经实验证实。如需更多信息，请参阅各自论文。

**

值得一提的是C的单位问题。 C是对总计算量的度量，可以用多种单位来表示，例如：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_cdf80ea5f5c0.jpg)

Actual FLOPs是一个值得注意的有用概念。GPU加速器白皮书通常会宣传它们的理论FLOPs，但在实际情况下这些值往往无法实现（特别是在分布式设置下）。下面的“计算成本”部分指出了在分布式训练设置中Actual FLOPs的常见报告值。

备注：我们使用了吞吐量-时间版本（throughput-time version）的成本公式，这个公式已在一篇关于LLM训练成本的文章中使用。

#### 参数与数据集权衡（Tradeoffs）

严格来说，你可以使用任意数量的token训练Transformer模型。然而，训练的token数量会对计算成本和最终模型的性能产生很大影响，因此找到一个合适的平衡点非常重要。

让我们从关键问题“计算最优（compute optimal）”语言模型入手。**关于参数数量的理论“Chinchilla scaling laws”指出，一个计算最优的语言模型拥有的参数数量和数据集大小需满足一个近似等式：   。这在特定意义上是最优的：假设使用1,000个GPU运行1小时的成本与使用1个GPU运行1,000小时的成本相同，如果你的目标是在最小化GPU训练成本的同时最大化模型性能，你就应该使用上面提到的公式。

**

我们不建议训练小于200B个token的大型语言模型。**虽然对于许多模型来说这样才能达到“Chinchilla最优”，但最终的模型效果通常非常差。针对所有应用程序，我们建议要确定用例的可接受推理成本，然后尽可能地训练最大的模型，以使得尽可能多的token的训练保持在这一推理成本下。

**

#### 计算成本的工程实践要点

Transformer模型通常用GPU-hours或FLOP-seconds来表示计算成本。

- GPT-NeoX在Normal Attention下实现了150 TFLOP/s/A100，而在Flash Attention下实现了180 FLOP/s/A100。这与其他高度优化的库在规模上是相符的，例如Megatron-DS的报告是在137至163 TFLOP/s/A100之间。
- 就经验来看，我们应该始终能够达到120 FLOP/s/A100的计算性能。如果计算性能低于115 FLOP/s/A100，那么很可能是模型或硬件配置出了问题。
- 使用高质量的互连技术（例如 InfiniBand），我们可以在数据并行维度上实现线性或亚线性扩展（sublinear scaling，即增加数据并行度应该近乎线性地增加总吞吐量）。下图展示了在Oak Ridge National Lab的Summit超级计算机上测试GPT-NeoX库的结果。注意：x 轴上是 V100，但文章中大部分数值示例针对的都是A100。
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_553e0618e661.jpg)

### 内存需求

通常，Transformer模型的规模是以其参数数量为指标的。然而，在确定一个模型是否可以匹配特定计算资源时，我们需要知道模型将占用多少字节空间。这样才能弄清楚多大的模型适合在本地GPU上进行推理，或者在一定的总加速器内存下可以训练多大的模型。

#### 推理

#### 模型权重

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_528081bc3170.jpg)

大多数Transformer都是以混合精度训练的，不是fp16 + fp32 就是 bf16 + fp32。这减少了训练模型所需的内存量，以及运行推理所需的内存量。我们可以将语言模型从fp32转换为fp16甚至int8，而不会产生实质性的性能损失。这些数字指的是单个参数所需的位（bits）大小。由于一个字节（Byte）有8位，我们把这个数除以8，看看每个参数需要多少字节。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b6e3fb47812b.jpg)

这里还有少量的额外开销，但通常与确定GPU所匹配的最大模型无关。根据经验来看，此额外开销≤ 20%。

#### 总推理内存

除了存储模型权重所需的内存外，在实际前向传递过程中还会有少量额外开销。根据经验来看，此额外开销≤ 20%，并且通常与确定GPU所匹配的最大模型无关。

总的来说，可通过以下公式来“判断一个模型是否适合进行推理”：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_04f7bbf330c6.jpg)

本文不会探讨这种额外开销的来源，这部分内容将会在其他文章中详细介绍。接下来将继续谈谈模型训练的内存。如果想了解更多关于推理所需的计算，[请查看此前发布的《](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491309%26idx%3D1%26sn%3D407fefb7ec76a2c9fdfe1ae960f7de4d%26chksm%3Dfe4190dbc93619cd0b9bfecb979e142a125fd8548d323dd9bdc2cbeb619400202e6e1affced0%26scene%3D21%23wechat_redirect)[大型语言模型的推理演算》](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491309%26idx%3D1%26sn%3D407fefb7ec76a2c9fdfe1ae960f7de4d%26chksm%3Dfe4190dbc93619cd0b9bfecb979e142a125fd8548d323dd9bdc2cbeb619400202e6e1affced0%26scene%3D21%23wechat_redirect)**。

#### 训练

除了模型参数之外，训练还需要在设备内存中存储优化器状态和梯度。这就是为什么当问及“我需要多少内存来拟合模型 X”时，会立即得到“这取决于训练或推理”的答案。通常情况下，训练需要的内存比推理更多。

**

#### 模型参数

首先，可以在纯fp32或fp16中训练模型：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_94bd245e4470.jpg)

除了推理中讨论的常见模型权重数据类型外，训练还引入了混合精度训练，例如AMP。 该技术旨在保持收敛性的同时最大化GPU张量核心的吞吐量。现代深度学习训练领域经常使用混合精度训练，因为：1) fp32训练稳定，但内存额外开销高且不能利用NVIDIA GPU张量核心； 2) fp16训练稳定但难以收敛。有关混合精度训练的更多信息，请阅读tunib-ai的这篇笔记。注意：混合精度需要在内存中存储模型的fp16/bf16和fp32版本，因此需要：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2a1a490a7e22.jpg)

再加上在优化器状态中计算的模型副本，大小为(4 bytes/param) • (#params)。

#### 优化器状态

Adam很神奇，但它的内存效率非常低。除了要求拥有模型参数和梯度参数的副本外，还需要额外保留三个梯度参数副本。 所以，

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2da4ee535e47.jpg)

#### 梯度

梯度可以以fp32或fp16存储（注意，梯度数据类型通常与模型数据类型相匹配。因此，在使用fp16混合精度训练时，梯度通常以fp16存储），因此它们对内存额外开销的贡献为：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_78e4f65fda46.jpg)

#### 激活（Activations）和批量大小

对于大型语言模型的训练来说，现代GPU通常受制于内存而非浮点运算。因此，激活重计算（activation recomputation又称checkpointing）是一种非常流行的方法，可以用减少的内存成本换取额外的计算成本。激活重计算的工作原理是重新计算某些层的激活，而不是将它们存储在GPU内存中。内存的减少取决于我们在决定清除哪些层时所作的选择，但Megatron的选择性重计算方案如下图所示：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_0fb6ea4c288a.jpg)

其中，红色虚线表示 A100-80GB GPU 的内存容量，“present work”表示应用选择性激活重计算后的内存需求。更多有关信息和下列公式的推导，请参阅[Reducing Activation Recomputation in Large Transformer Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2205.05198)。

存储Transformer模型激活所需内存的基本公式如下：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_50b94d822995.jpg)

此外，所需的额外重计算也取决于方法的选择性，但它受限于完整的额外前向传递。因此，前向传递的更新成本由以下公式给出：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3b6697258ead.jpg)

#### 总训练内存

因此，有关“模型是否适合训练”的较好的启发式答案如下：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_cc278277c73e.jpg)

#### 分布式训练

#### 分片（Sharded）优化器

优化器的大量内存额外开销是 ZeRO 和 FSDP 等分片优化器的主要动机。这种分片策略将优化器额外开销降低了    No.GPUs倍，这就是给定模型配置可能适合大规模但OOM适合小规模的原因。如果要计算使用分片优化器进行训练所需的内存额外开销，则需要包含下图中的公式。有关分片优化的示例计算，请参见ZeRO论文中的下图（注意，PosPos+g和Pos+g+p通常分别表示为 ZeRO-1、ZeRO-2、ZeRO-3。ZeRO-0 通常意为“ZeRO 禁用”）：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_40853ca7491d.jpg)

在本博文中（假定为混合精度和Adam优化器）：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_9ff13dada81d.jpg)

除非应用流水并行和/或张量并行, 否则（DP Degree）就只是（No.GPUs）。相关详细信息，请参阅 分片优化器 + 3D 并行部分。

注意，ZeRO-3引入了一组实时参数，因为ZeRO-3引入了一组配置选项（stage3_max_live_parameters、stage3_max_reuse_distance、stage3_prefetch_bucket_size、stage3_param_persistence_threshold），用于控制一次GPU内存中的参数量（参数越大，需要的内存就越多，但需要通信会减少）。此类参数会对总GPU内存产生重大影响。

注意，ZeRO还可以通过ZeRO-R对数据并行列（ranks）上的激活进行分区。这也会使Memory(activation)在张量并行度t的上面。有关更多详细信息，请阅读相关[ZeRO论文](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1910.02054)和配置选项（注意在GPT-NeoX中，这是partition_activations标志）。如果你正在训练巨型模型，想以一些内存额外开销换取额外的通信成本，那么激活会成为瓶颈问题。将ZeRO-R与ZeRO-1一起使用的示例如下：

#### 3D并行

LLM有3种主要并行方式：

数据并行：**在模型副本（可能是模型并行的副本）之间划分（split）数据 

**流水或张量/模型并行：**这些并行方式将模型的参数划分到GPU之间。此类方案需要大量通信的额外开销，但它们的内存的减少大约为：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_adb453ee937e.jpg)

**

注意，此等式是近似值，原因如下：

（1） 流水并行不会减少激活的内存占用；

（2） 流水并行需要所有GPU存储全部传输中的micro-batches激活，这对于大型模型非常重要；

（3） GPU 需要临时存储并行方案所需的额外通信缓冲区。

#### 分片优化器 + 3D 并行

当 ZeRO 与张量和/或流水并行结合时，生成的并行策略会形成如下所示的网格：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_690e877cf0c6.jpg)

一个重要的题外话：数据并行度（DP degree)对于计算训练的全局批量大小至关重要。数据并行度取决于完整模型副本数量：

虽然流水并行和张量并行与ZeRO的所有阶段兼容（例如，张量并行的ZeRO-3会先对张量切片，然后在每个张量并行单元中应用 ZeRO-3），但只有 ZeRO-1 倾向于与张量和/或流水并行结合使用时表现良好，这是因为梯度并行策略相互冲突（流水并行和 ZeRO-2是划分梯度）（张量并行和ZeRO-3是划分模型参数），从而造成大量通信的额外开销。

将所有内容放在一起，进行典型的带有激活分区的3D并行ZeRO-1运行：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_3c149adaed88.jpg)

### 总结

EleutherAI的工程师们经常使用上述启发式方法规划高效的模型训练以及调试分布式运行。我们希望澄清这些经常被忽视的实现细节。

其他人都在看

- [大型语言模型的推理演算](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491309%26idx%3D1%26sn%3D407fefb7ec76a2c9fdfe1ae960f7de4d%26chksm%3Dfe4190dbc93619cd0b9bfecb979e142a125fd8548d323dd9bdc2cbeb619400202e6e1affced0%26scene%3D21%23wechat_redirect)
- [向量嵌入：AutoGPT的幻觉解法](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491455%26idx%3D1%26sn%3D28708a6e196149c588d071a4df860c82%26chksm%3Dfe419149c936185f48561f06e3e0847733aa9eec358c4f85f8e7a509278890b5ff1abe2ce31f%26scene%3D21%23wechat_redirect)
- [John Schulman：通往TruthGPT之路](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491538%26idx%3D1%26sn%3D99ceba3fe2ddde6efd101bbf23374969%26chksm%3Dfe4191e4c93618f2fc63bbd92cd93ffe85b9db24fd71b864d293ea930e8e6527cecbadd8f4d9%26scene%3D21%23wechat_redirect)
- [复杂推理：大型语言模型的"北极星"能力](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491550%26idx%3D1%26sn%3D1594ad46d9fcf924826428995886d208%26chksm%3Dfe4191e8c93618fe17a8d24cb8c1345285c41942cca1f46090d73f2d02eabb7a6c52a0a78b1e%26scene%3D21%23wechat_redirect)
- [为什么ChatGPT用强化学习而非监督学习](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247491548%26idx%3D1%26sn%3D45c78ba578e450e1ad81f5ca89bd0e31%26chksm%3Dfe4191eac93618fc92cb3bc221f407960a50c98d2aea1f94431b21b6fd7dc49cae770f5532d6%26scene%3D21%23wechat_redirect)
- [OneEmbedding:单卡](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247488841%26idx%3D1%26sn%3D6c5de6713dbce2bd25d60db742879368%26chksm%3Dfe419b7fc93612690a667bec72a258ac837c2454cd180c2432c1c190bc236743cf7e4dd0dfee%26scene%3D21%23wechat_redirect)[训练TB级推荐模型不是梦](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247488841%26idx%3D1%26sn%3D6c5de6713dbce2bd25d60db742879368%26chksm%3Dfe419b7fc93612690a667bec72a258ac837c2454cd180c2432c1c190bc236743cf7e4dd0dfee%26scene%3D21%23wechat_redirect)
- [GLM训练加速：性能最高提升3倍，显存节省](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzU5ODY2MTk3Nw%3D%3D%26mid%3D2247490555%26idx%3D1%26sn%3D280c4ac043a31170236a9d8fba5fc2d2%26chksm%3Dfe4195cdc9361cdb6db1cb3b77c66b45c353b2fb65c4d082fbae9b72fe0b3a441ab9101cb147%26scene%3D21%23wechat_redirect)
欢迎Star、试用OneFlow: **

[](https://link.zhihu.com/?target=http%3A//github.com/Oneflow-Inc/oneflow/)
