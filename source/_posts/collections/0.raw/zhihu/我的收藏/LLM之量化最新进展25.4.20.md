---
title: (2 条消息) LLM之量化最新进展25.4.20
date: "2025-04-20 00:00:00"
updated: "2025-04-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/LLM之量化最新进展25.4.20/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1897066489246376792
---


### [VPTQ](https://link.zhihu.com/?target=https%3A//github.com/microsoft/VPTQ)

[VPTQ: Extreme Low-bit Vector Post-Training Quantization for Large Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2409.17066)
[https://github.com/microsoft/VPTQ](https://link.zhihu.com/?target=https%3A//github.com/microsoft/VPTQ)
[LLM量化迎来“革命性突破” | 17小时将405B模型量化成1~2比特，吞吐量提升1.8倍！](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/-54RAQjooDipEO-tz9qmfw)
[LLM极低比特量化VQ方法解析：从AQLM、GPTVQ到VPTQ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/2uWK_7hIaEgY-OsIOT0zvw%3Fpoc_token%3DHCULiWej2cNKkqVVXWuxllLn4BIa2_EPeJ_z5NF0)统的标量量化方法由于数值表示的限制，难以实现如此低比特的量化。因此，论文提出了一种新的矢量后训练量化（VPTQ）方法，用于实现LLMs的极低比特量化，以减少模型大小、优化存储成本并降低推理时的内存带宽需求。

#### GPTQ原理推导

> [akaihaoshuai：从0开始实现LLM：6.1、模型量化（AWQ/SqueezeLLM/Marlin）](https://zhuanlan.zhihu.com/p/697992170)
[akaihaoshuai：从0开始实现LLM：6、模型量化理论+代码实战（LLM-QAT/GPTQ/BitNet 1.58Bits/OneBit）](https://zhuanlan.zhihu.com/p/686161543)

一般认为当某个变量权重更新时，用 \Delta L=W*X-(W+\Delta_w)*X 作为loss，然后更新剩下的权重即可。但是考虑到每个权重对模型的影响是不同的，因此根据对全局影响从小到大来量化权重，可以最大程度减小模型的权重变化，最大程度保留模型的原始能力。

那么就需要计算每个权重的影响力（显著性），也就是更新前后的loss差。loss差最小的权重，可以最先考虑量化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b30e3b19dccd.jpg)

上面公式其实就是将\Delta L=f(w*x)-f((w+\Delta w)*x)  \\  \Rightarrow argmin(\left| (f(w*x)-f((w+\Delta w)*x) ) \right|)  \\  \Rightarrow argmin((f(w*x)-f((w+\Delta w)*x) )^2) 

因此可以输入一批数据，对每个模型参数计算 \Delta L 。对 \Delta L进行排序，从小到大进行更新。

对这个公式引入拉格朗如因子将优化问题转化为无约束优化问题，并求解得到最优量化误差更新公式。

> [如何理解拉格朗日乘子法？ - 马同学的回答 - 知乎](https://www.zhihu.com/question/38586401/answer/457058079)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f2ac5825b32d.jpg)

对于模型量化有如下。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cc42a78f742d.jpg)

后来GPTQ做了一些尝试，发现逐层量化和按照 \Delta L 从小到大量化没有什么区别，但loss计算方法和权重更新内容没有改变。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fa643265c0e0.jpg)

#### AQLM原理

[Extreme Compression of Large Language Models via Additive Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.06118)
[GitHub - Vahe1994/AQLM: Official Pytorch repository for Extreme Compression of Large Language Models via Additive Quantization https://arxiv.org/pdf/2401.06118.pdf and PV-Tuning: Beyond Straight-Through Estimation for Extreme LLM Compression https://arxiv.org/abs/2405.14852](https://link.zhihu.com/?target=https%3A//github.com/Vahe1994/AQLM)自称是第一篇将RVQ方法应用到对LLM权重压缩中的工作。

> [大模型低比特量化新思路 AQLM](https://zhuanlan.zhihu.com/p/706103629)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_862938373864.jpg)

本质上就是用多个Codebook来拟合一组vector。

#### VPTQ讲解

QuIP#引入了在VQ之前对权重矩阵使用随机化Hadamard变换的非相干处理。处理后的权重矩阵近似于亚高斯分布，允许用微小的码本进行压缩。然而，不相干处理需要大量的计算，尽管QuIP #能够以低精度下降将LLM压缩到极低的比特。与原始LLM相比，它需要更多的推理计算，从而导致低推理吞吐量。

VPTQ主要就是在GPTQ的基础上，将张量量化变成了矢量量化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a420c5245e08.jpg)

由于VQ可以使用更大的码本来存储量化数据，因此与GPTQ的标量量化相比，它覆盖更宽范围的数值分布，从而实现更好的精度。

从下图可以看出，大致流程和GPTQ是差不多的，只不过weight是向量化表示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9a2040081d7a.jpg)

https://github.com/microsoft/VPTQ/blob/algorithm/vptq/vptq.py对于每一列，使用矢量量化（VQ）找到与原始向量最接近的码本向量（即最近邻向量），从而最小化量化误差。量化后，将当前量化误差传播到未量化的列中，以更新后续列的量化误差。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f81d9742bcba.jpg)

可以看出在低bit下( [FlatQuant: Flatness Matters for LLM Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.09426)
[https://github.com/ruikangliu/FlatQuant](https://link.zhihu.com/?target=https%3A//github.com/ruikangliu/FlatQuant)
[FlatQuant & SpinQuant: 学习更好的等价变换来做 LLM 量化](https://zhuanlan.zhihu.com/p/7058974168)
[[LLM量化系列] DuQuant、AffineQuant和FlatQuant](https://zhuanlan.zhihu.com/p/6652357695)

由于 LLM 中存在异常值，因此必须平坦化权重和激活，以最小化具有等间距量化点的量化误差。
先前的研究探索了各种预量化变换以抑制异常值，但变换后的权重和激活仍然可能保持陡峭和扩散。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6b688aaf510c.jpg)

本文提出了一种新的训练后量化方法 FlatQuant（快速且可学习的仿射变换），可增强权重和激活的平坦度。方法确定了针对每个线性层量身定制的最佳仿射变换，并通过轻量级目标在数小时内进行校准。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_93310d686778.jpg)

方法就是对于输入x和权重w，乘上矩阵P后进行量化，量化前后的结果基本一致的情况下，求解矩阵P的最佳权重。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_377e5c9c1fa8.jpg)

最终效果看来还不错

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_307467f85af3.jpg)

总结：**首先对每个linear层训练一个旋转矩阵，减少原始权重的outliers，从而使后续的GPTQ的效果更好。


### [BitNet a4.8: 4-bit Activations for 1-bit LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.04965)

本文是在1-bit LLMs的基础上，通过引入4-bit激活（activations）来减少量化误差，同时提高推理效率。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7519f91c4981.jpg)

论文提出了BitNet a4.8，采用了一种混合量化和稀疏化策略来解决低比特激活带来的量化误差问题。具体方法如下：

- 混合量化和稀疏化策略**：对于输入到注意力层和前馈网络（FFN）的激活，使用4-bit量化；而对于中间状态，则采用8-bit量化结合稀疏化处理。这种策略可以有效减少异常通道带来的量化误差。
- <strong>训练方法</strong>：BitNet a4.8采用两阶段训练方法。第一阶段使用8-bit激活进行训练；第二阶段切换到4-bit激活，并采用混合量化和稀疏化策略。这种方法仅需少量训练token即可适应低比特激活，且性能损失可忽略。
- <strong>梯度近似</strong>：使用直通估计器（STE）进行梯度近似，并采用混合精度训练更新参数。在反向传播中绕过非可微函数（如量化函数和Top-K稀疏化函数），同时在前向传播中动态量化参数为1.58-bit。
- <strong>浮点量化</strong>：对于浮点量化，仅将FFN下投影的输入保留为8-bit整数，其余激活量化为FP4，使用MinMax量化器。这种量化方式可以处理激活的长尾分布。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b3b711450bf2.jpg)


### [QuEST](https://link.zhihu.com/?target=https%3A//github.com/IST-DASLab/QuEST)（低位QAT）

> [QuEST: Stable Training of LLMs with 1-Bit Weights and Activations](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.05003)

PTQ方法已经很流行，目前少有效果比较好的低位量化训练方法，本文方法可以在极低精度（1位到4位）下稳定训练大规模语言模型（LLMs），还能在模型大小更小的情况下获得与标准精度相当甚至更好的准确率。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e0a64a1572c9.jpg)

#### 准确且快速的量化（Distribution Fitting）

- Hadamard预处理**：在量化之前，使用Hadamard变换对权重和激活进行预处理。Hadamard变换是一种快速的正交变换，能够使权重分布更接近高斯分布，从而提高量化效果。具体来说，将目标张量通过Hadamard矩阵变换，然后进行量化。
- <strong>高斯拟合</strong>：使用均方根（RMS）归一化将权重和激活的分布与标准高斯分布对齐，然后选择一个MSE最优的缩放因子α*，使得量化后的分布与原始分布的误差最小化。具体公式为：
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2ca9f6dae68c.jpg)

#### 信任梯度估计（Trust Gradient Estimation）

- <strong>基本投影的信任估计器</strong>：在反向传播中，传统的直通过估计器（STE）可能会导致较大的梯度估计误差。QuEST提出了一种信任估计器，通过引入一个“信任掩码”来减少这种误差。信任掩码根据量化误差的大小来决定是否信任某个权重的梯度估计。具体来说，如果量化误差小于某个阈值T（如*α*∗/2*b*−1），则认为该权重的梯度估计是可信的，否则不可信。
- <strong>Hadamard投影的信任估计器</strong>：将信任估计器与Hadamard变换结合，在Hadamard域中进行梯度估计。这样可以更好地处理权重分布中的异常值，并且保持梯度的流动。具体公式为：
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9ef97bce57ba.jpg)

QuEST在所有测试的精度和模型大小下都能稳定收敛，而PACT在低精度下（如低于INT4）难以收敛，LSQ虽然能收敛但性能不如QuEST。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8b5580a89af9.jpg)


### [rsq](https://link.zhihu.com/?target=https%3A//github.com/ylsung/rsq)

> [https://github.com/ylsung/rsq](https://link.zhihu.com/?target=https%3A//github.com/ylsung/rsq) [RSQ: Learning from Important Tokens Leads to Better Quantized LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.01820)

论文提出了一种名为 RSQ (Rotate, Scale, then Quantize)** 的方法，通过以下三个步骤来解决量化问题：

1. <strong>Rotate（旋转）</strong>

- <strong>目标</strong>：减少权重中的异常值。
- <strong>方法</strong>：利用 Transformer 的计算不变性（computational invariance），通过正交变换（旋转）来调整权重。具体来说，将权重矩阵 *W* 通过一个随机化的 Hadamard 矩阵 *Q* 进行旋转，即 *W*→*WQ*⊤。这种变换不会改变模型的输出，但可以减少权重的异常值，从而提高量化效果。
2. <strong>Scale（缩放）</strong>

- <strong>目标</strong>：根据标记的重要性对输入标记进行加权。
- <strong>方法</strong>：传统的量化方法对所有标记的重建损失进行均匀优化，而 RSQ 通过引入一个对角矩阵 *R* 来对每个标记的特征进行缩放。具体来说，优化目标从 ∥*WX*−*W*~*X*∥22​ 改为 ∥(*WX*−*W*~*X*)*R*∥22​，其中 *R* 的对角元素 *ri*​ 表示第 *i* 个标记的重要性。论文探索了多种计算标记重要性的方法，最终选择了基于注意力分数的 <strong>AttnCon</strong> 方法。
3. <strong>Quantize（量化）</strong>

- <strong>目标</strong>：使用 GPTQ 框架对旋转和缩放后的权重进行量化。
- <strong>方法</strong>：在量化过程中，使用缩放后的标记特征来计算 Hessian 矩阵 *H*RSQ​=2*XR*2*X*⊤，并将其应用于权重更新公式。最终，通过 GPTQ 框架对旋转后的权重进行量化，从而完成整个量化过程。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_94bdf1bcc195.jpg)

实验表明，RSQ 在多个下游任务和长文本基准测试中均优于现有的量化方法，特别是在低量化位数时表现更为出色。此外，RSQ 在不同模型大小、校准数据集和量化方法上均表现出良好的泛化能力。


### [Sigma: Differential Rescaling of Query, Key and Value for Efficient Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2501.13629)

关注于如何通过优化注意力机制中的查询（Query, Q）、键（Key, K）和值（Value, V）来提高模型的推理效率，同时保持或提升模型性能。

差异化压缩KV（Differentially Compressed KV）

- <strong>动机</strong>：模型对K和V的压缩敏感度不同。实验表明，模型性能对V的压缩更为敏感，无论是维度还是头数。因此，论文提出对K进行更激进的压缩，而对V进行较轻的压缩。
- <strong>方法</strong>：在DiffQKV中，K的头数（nh_k）和维度（dh_k）被显著减少，而V的头数（nh_v）保持不变或减少较少。例如，在SIGMA-1.5B模型中，K的头数从16减少到4，而V的头数保持为16。此外，K的维度可以减少到V维度的一半（dh_k = dh_v/2），并通过一个可训练的前馈层将K的维度调整为与V相同，以计算注意力分数。
- <strong>效果</strong>：这种差异化的压缩策略在保持模型性能的同时，显著减少了KV缓存的大小，从而提高了推理效率。
<strong>增强Q（Augmented Q）</strong>

- <strong>动机</strong>：由于Q在自注意力中不需要缓存，增加Q的参数对内存使用和数据传输的影响较小，但可以有效提升模型的表示能力和性能。
- <strong>方法</strong>：通过增加Q头的维度（dh_q），为模型提供更多的参数来学习复杂的表示。例如，在SIGMA-1.5B中，Q头的维度被设置为3072，是隐藏状态维度的1.5倍。
- <strong>效果</strong>：增强Q可以显著提升模型性能，尤其是在K和V被高度压缩的情况下。实验表明，增强Q对推理速度的影响较小，但能有效抵消KV压缩带来的性能下降。

### [MixLLM: LLM Quantization with Global Mixed-precision between Output-features and Highly-efficient System Design](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2412.14590)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_af04a96b25c9.jpg)

量化设计和决策

- <strong>混合精度量化（Mixed-Precision Quantization）</strong>：MixLLM 在权重的输出特征之间引入混合精度量化，根据全局重要性（salience）分配不同的位宽。具体来说，对于高重要性的输出特征分配8位，对于其他特征分配4位。这种设计利用了不同输出特征对模型输出的不同贡献，从而在保持低内存消耗的同时实现高准确性。
- <strong>全局重要性识别（Global Salience Identification）</strong>：与现有方法不同，MixLLM 不是在单个层内识别高重要性特征，而是从全局角度识别。通过计算每个输出特征对模型最终损失的影响来确定其重要性，从而更准确地分配位宽。
- <strong>量化配置决策（Quantization Configuration）</strong>：MixLLM 选择了8位对称量化用于激活，4位非对称量化用于权重，这种配置在准确性和系统效率之间取得了良好的平衡。
<strong>全局精度搜索算法</strong>

MixLLM 使用一种全局精度搜索算法来确定哪些输出特征需要更高的位宽。具体步骤如下：

- 对所有线性层的输出特征计算其重要性（salience），通过泰勒展开近似模型损失函数。
- 将所有特征按重要性排序，选择前N个特征分配8位，其余分配4位。
- 这种方法确保了位宽分配的全局最优性，而不是局部最优性。
<strong>高效量化计算系统</strong>

- <strong>两步反量化（Two-Step Dequantization）</strong>：为了利用GPU的int8 Tensor Core进行高效计算，MixLLM设计了一种两步反量化方法。首先将量化后的权重部分反量化为整数，然后使用Tensor Core进行矩阵乘法，最后应用比例因子完成反量化。
- <strong>快速整数到浮点转换（Fast Int-to-Float Conversion）</strong>：通过一种基于范围依赖的快速转换方法，将整数转换为浮点数，避免了昂贵的I2F指令。
- <strong>端到端软件流水线（End-to-End Software Pipeline）</strong>：设计了一种软件流水线，将内存访问、反量化计算和矩阵乘法重叠执行，从而最大化系统效率。

### [70% Size, 100% Accuracy: Lossless LLM Compression for Efficient GPU Inference via Dynamic-Length Float](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.11651)（BF16的无损压缩）

> [GitHub - LeanModels/DFloat11](https://link.zhihu.com/?target=https%3A//github.com/LeanModels/DFloat11)

论文分析了BFloat16各组成部分（符号位、指数位和尾数位）的信息效率，发现指数位的熵约为2.6位，远低于其分配的8位，表明存在显著的压缩机会。论文利用这一特性，通过霍夫曼编码对指数位进行压缩，从而实现无损压缩。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d18599df3712.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9e2490e97bfd.jpg)

#### Dynamic-Length Float：LLMs无损压缩框架

高效解码与紧凑查找表（LUTs）

- 传统的霍夫曼解码需要逐位遍历霍夫曼树，不适合GPU的并行架构。论文提出将单个大型查找表（LUT）分解为多个紧凑的LUTs，存储在GPU的SRAM中，以实现快速访问。具体来说，将一个2^32大小的LUT分解为四个2^8大小的LUTs（LUT1、LUT2、LUT3和LUT4），每个LUT占用1024字节，加上CodeLengths表的256字节，总共占用1280字节，适合存储在GPU的SRAM中。
- 解码时，从编码序列中读取第一个字节，用作LUT1的索引。如果对应的霍夫曼码长度为8位或更短，则LUT1返回有效的解码符号，解码完成。否则，返回一个保留值R，表示代码尚未完全解析。然后继续读取下一个字节，用作LUT2的索引，依此类推，直到返回非R值，表示霍夫曼码已成功解码。

<strong>两阶段内核和轻量级辅助变量</strong>

- 由于霍夫曼码的可变比特宽度和紧密打包，确定每个线程的起始解码位置和输出位置是一个挑战。论文采用两阶段内核设计：

- <strong>第一阶段</strong>：所有线程并行解码分配的编码序列部分，但不将输出写入全局内存。每个线程计算将解码的元素数量。然后，通过计算前缀和，从已知的块输出位置开始，计算每个线程的输出位置。
- <strong>第二阶段</strong>：每个线程重新解码相同的编码序列部分，并将解码结果写入HBM的正确输出位置。为了避免在两次传递中重复访问HBM，将编码的指数加载到SRAM中。

<strong>Transformer块级解压缩</strong>

- 单个权重矩阵的解压缩通常会浪费GPU资源，因为其相对较小。论文提出在Transformer块级别进行解压缩，将Transformer块中所有权重矩阵的解压缩批量处理，显著提高吞吐量并减少推理延迟。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ab882d5892f7.jpg)


#### 实验结果

- 模型大小压缩**：DFloat11将模型大小压缩至约70%，平均压缩比特宽度约为11位。例如，Llama-3.1-405B模型从811.71GB压缩至551.22GB，压缩比为67.91%。
- <strong>推理效率</strong>：与将部分未压缩模型卸载到CPU以满足内存限制的潜在替代方案相比，DFloat11在标记生成方面实现了1.9–38.8倍的更高吞吐量。在固定的GPU内存预算下，DFloat11使上下文长度比未压缩模型延长了5.3–13.17倍。特别值得一提的是，DFloat11能够在单个节点上，配备8×80GB GPU，实现810GB的Llama-3.1-405B模型的无损推理。
- <strong>准确性</strong>：DFloat11压缩后的模型在各种任务上的表现与原始BFloat16模型完全一致，包括在MMLU、TruthfulQA、WikiText和C4等标准基准测试中的准确性和困惑度评估。例如，Llama-3.1-8B-Instruct模型在MMLU任务上的准确率为68.010%，在TruthfulQA任务上的准确率为36.965%，在WikiText数据集上的困惑度为8.649，在C4数据集上的困惑度为21.677。压缩后的DFloat11模型在这些指标上与原始模型完全相同。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b8d3773b35fa.jpg)


### [LogQuant: Log-Distributed 2-Bit Quantization of KV Cache with Superior Accuracy Preservation](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.19950)

论文介绍了一种名为LogQuant的2-bit量化技术，用于优化大规模语言模型（LLM）推理中的KV缓存管理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_18ec32c6083e.jpg)

LogQuant通过以下方式实现：

- 基于对数分布的注意力模式**：观察到注意力分数的高值位置呈对数分布，越远离当前位置的tokens越稀疏。
- <strong>量化策略</strong>：选择保留最近的tokens，并以对数间隔选择其他tokens进行量化，以减少内存占用。
- <strong>位置无关的注意力计算</strong>：在解码阶段，KV缓存条目的原始位置可以忽略，从而优化量化/反量化过程的速度。

### [Q-Filters: Leveraging QK Geometry for Efficient KV Cache Compression](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.02812)

论文提出了一种名为Q-Filters的训练无关KV缓存压缩方法，通过利用Query和Key向量的几何特性来过滤掉不重要的KV对，从而减少KV缓存的大小。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_104cc85ed256.jpg)

具体方法如下：

<strong>1、探索Query-Key几何特性：</strong>

- 通过分析Query（Q）和Key（K）的分布，发现存在一个主方向（由Q的主特征向量定义），该方向能够编码每个头（head）的输入选择过程。通过这个方向，可以估计哪些输入对当前头来说是不重要的，从而可以丢弃这些输入，而对性能的影响最小。
- 通过奇异值分解（SVD）计算Q的主方向，并将其作为Q-Filters。这些Q-Filters能够估计Key向量在该方向上的投影，从而近似注意力分数。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3f73fb699fb8.jpg)

- 具体来说，对于每个头，计算Q的SVD，取第一个右奇异向量作为Q-Filter。在推理时，将Key向量投影到这个方向上，根据投影值的大小来决定哪些KV对可以被丢弃。
<strong>2、Q-Filters的计算和应用</strong>：

- 在模型训练完成后，通过一个小的校准数据集计算Q-Filters，这个过程只需要一次，计算开销很小。
- 在推理时，使用预计算的Q-Filters对Key向量进行投影，根据投影值的大小来过滤KV对，从而实现KV缓存的压缩。