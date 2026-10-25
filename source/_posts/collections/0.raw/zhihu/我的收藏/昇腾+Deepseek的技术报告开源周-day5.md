---
title: (2 条消息) 昇腾+Deepseek的技术报告开源周-day5
date: "2025-05-25 00:00:00"
updated: "2025-05-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/昇腾-Deepseek的技术报告开源周-day5/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1909889130176947091
---


第五天发布的昇腾亲和硬件感知创新算子，基于昇腾的大量创新算子实现，来支撑在推理场景中模型侧和框架侧的极致性能实现，

repo地址：[https://gitcode.com/ascend-tribe/ascend-inference-cluster/blob/main/OptimizedOps](https://link.zhihu.com/?target=https%3A//gitcode.com/ascend-tribe/ascend-inference-cluster/blob/main/OptimizedOps)

主要包括以下三个：

- **AMLA**：以加代乘的高性能昇腾MLA算子。针对昇腾优化MLA算子，性能优于FlashMLA实现。
- **大模型推理中昇腾算子融合技术与设计原理**。首次披露了基于昇腾的融合算子的设计原则。
- **SMTurbo**：面向高性能原生LoadStore 语义加速。介绍了基于CloudMatrix384集群的Load/Store语义加速方案。**我们一个个来学习下。
（1）AMLA**

AMLA（即Ascend MLA，昇腾MLA），它 是针对 MLA 在华为昇腾芯片（Ascend）上高效实现的一种优化版算子。它借鉴 Flash Attention 的思想，对在线 Softmax 和中间变量计算过程进行重新设计，核心技术是：**以加代乘（Add-Multiply Replacement, AMLA）：通过浮点数的位级变换，把原本需要乘法操作的地方，用加法操作来实现，进而减少核外数据搬运，提高性能。**

以下为这个AMLA算法优化的主要区别和示意：减少计算单元到内存单元的搬运。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_028c228eae49.jpg)

为理解上述以加代乘的本质，论文对Flash Attention 计算流程进行梳理归纳为四部分：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_973453dcc8aa.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5ba8a908aec5.jpg)

这里理解了一下，VEC2阶段并不是矩阵乘，而是对前一轮的累积结果 O_{i-1} 做一个 逐元素缩放（乘以一个**缩放**因子），是**每一行向量 × 一个标量。**

论文中提到AMLA 算法，基于 2 的整数次幂逼近以及以加代乘技术，实现了 FA 中VEC2 阶段的存内计算，消除额外搬运的同时保证了数值稳定。中间的数学公式转换有点硬，需要后面再好好学习一下。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2b786e358af7.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_bbe47a097140.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_23771faa90e9.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_1e5090241e03.jpg)

初步理解，这种以加代乘还是需要在高精度时进行近似转换的情况下，对精度影响较小，如果是FB8或者FP4，则不太适用。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_102cf979b271.jpg)

论文中也是基于FP32和BF16进行效果验证。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_64a6b61c277c.jpg)

精度结果基本一致：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_cf5f094c0dc9.jpg)

Deepseek在4月24日对FlashMLA的优化也再次更新[https://github.com/deepseekai/FlashMLA/blob/main/docs/20250422-new-kernel-deep-dive.md](https://link.zhihu.com/?target=https%3A//github.com/deepseekai/FlashMLA/blob/main/docs/20250422-new-kernel-deep-dive.md)，有兴趣的童靴也可以再看一下。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_6494d4841064.jpg)

**（2）大模型推理中昇腾算子融合技术与设计原理**

这里主要介绍了多类典型融合算子，包括MLAProlog融合算子、昇腾亲和的MLA融合算子、串行向量算子融合等。这些融合算子通过算法与硬件的协同优化，显著提升了模型的计算效率和推理性能。

- **MLAProlog 融合算子** MLAProlog 融合算子作为 MLA 计算的前序处理单元，实现了多个关键计算的深度融合。
- **MLA 融合算子（即AMLA）**，如第一章描述，利用以加代乘减少计算单元到内存单元的搬运。
- **串行向量算子融合**，包括AddRmsNormQuant 算子 和• DequantSwigluQuant 算子。
- **量化 MatMul 与反量化算子融合，**通过将矩阵乘与量化/反量化操作合并，利用张量-向量计算并行流水显著提升算子效率。
**1）MLAProlog 融合算子**

MLAProlog处理是为后续的注意力计算准备 query 和 key（含 latent 和 rotary 两部分），并预先将一部分结果写入 cache，从而加速推理。

它融合了 Query、Key、Value 的下投影计算，以及 Query 和 Key 的上投影计算等多个矩阵乘法运算，以及 RmsNorm 归一化算子、RoPE 旋转位置编码和 KVCache 更新等向量运算。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b8a8fe7330d9.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d4816d3d5fce.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_fb15b3bf3759.jpg)

详细的算子接口可以参考链接：

[https://www.hiascend.com/document/detail/zh/canncommercial/81RC1/apiref/aolapi/context/aclnnMlaProlog.md](https://link.zhihu.com/?target=https%3A//www.hiascend.com/document/detail/zh/canncommercial/81RC1/apiref/aolapi/context/aclnnMlaProlog.md)

**2）串行向量算子融合**

AddRmsNormQuant 算子 ：该算子融合了残差累加（Add）、归一化运算（RmsNorm）和动态量化运算（DynamicQuant），主要用于 MLA 层以及 FFN/MoE 层的**头部处理**。AddRmsNormQuant算子将RmsNorm前的Add算子以及RmsNorm后的Quantize算子融合起来，减少搬入搬出操作。大白话就是：“AddRmsNormQuant相当于把张量加法、归一化运算、量化运算三合一，更高效快速。”

DequantSwigluQuant 算子：该算子由反量化（Dequantization）、Swish 激活函数、元素乘法（Mul）和动态量化（DynamicQuant）融合而成，主要应用于 **FFN/MoE 层内的计算**。该算子在Swish门控线性单元激活函数前后添加dequant和quant操作，实现x的DequantSwigluQuant计算。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_54e5b03ead54.jpg)

**3）量化 MatMul 与反量化算子融合**

该融合通过将矩阵乘与量化/反量化操作合并，利用张量-向量计算并行流水显著提升算子效率。尤其在 **Prefill 阶段**，由于高计算密度的矩阵乘计算可以更好地掩盖内存瓶颈的反量化运算，该融合可获得较 Decode 阶段更高的性能收益。

上述的相关算子在接口文档中说明基本都需要FP16/BF16、FP32等的数据类型。

**（3）SMTurbo**

每个昇腾芯片上有多个 AICORE，每个 AICORE 由两个 AIVector（AIV）计算核（通用向量计算任务）与一个 AICube(AIC)（矩阵乘计算任务） 计算核组成。Outstanding 在一个 AICORE 内共享，但读写分离且独立。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_de12155e90b9.jpg)

利用昇腾芯片微架构上同一 AICore Outstanding 共享、但读写分离的架构特点，华为专家提出了ShmemTurbo Concurrent Push & Pull (SMTurbo-CPP) 读写并发方案——将 Load/Store 在读和写两个方向上并行，从而最大化利用 AICORE 读写两个方向上独立的 Outstanding 资源，提升线程吞吐率。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_c4054f3d1299.jpg)

SMTurbo-CPP 把读写两个线程分别绑定到同一个 AICORE 下的两个 AIV 上，再透过流水的精巧编排实现两个线程的协作，同时消耗 AICORE 的读写两个方向上独立的Outstanding 资源。

在测试结论中，也特别说明目前SMTurbo-CPP 对于线程少的情况，CPP方案收益较高。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a218333cac0d.jpg)

其实在实际大模型应用过程中，对算子的直接调用和优化是比较少的，但是理解这些算子原理可以更好的理解大模型推理优化方案实现。

好了，今天的学习就先到这里了，加油。