---
title: AWQ模型量化有什么特点？
date: "2026-04-14 00:00:00"
updated: "2026-04-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/AWQ模型量化有什么特点/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/645963779/answer/4841384841
---


[![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_90ef15a6c991.jpg)](//www.zhihu.com/people/alan-70-79-23)

[Chayenne Zhao](//www.zhihu.com/people/alan-70-79-23)

临战弹琴，遇事摸鱼，赶 paper 不急

​ 关注

这篇文章是 AWQ（activation-aware weight quantization）的阅读笔记，实际上这篇文章是 9 月 12 日我在从广州飞往洛杉矶的飞机上就开始读的。然而此后，因为学校手续等等事由，没能及时补充上读书笔记，而 SGLang 的文档自然也搁置了许久。无妨，从今天开始便要认真工作了。这篇工作是 MLsys 2024 的 best paper，可见其受欢迎程度。

### Intro

- 量化方法有诸多粗糙的分类。按照量化进行校准的时机，可以分为 Quantization-Aware Training（QAT，我称为训练中量化）和 Post-Training Quantization（PTQ，称为训练后量化）。
2. QAT 在训练过程中进行量化模拟，将量化误差作为训练的一部分来考虑。模型在训练时就能适应量化操作，尽可能减少量化带来的精度损失。效果较好，但是成本显著。一般而言，大模型几乎无法使用 QAT 方法。

3. PTQ 在模型训练完成后直接对模型进行量化的方法，它不涉及模型的再训练或优化。通常在模型部署前，使用少量校准数据来调整模型的量化参数。PTQ 相对高效，但是精度损失显著。一般而言，PTQ 更常见。

4. 与 AWQ 最接近的方法是 GPTQ（Accurate Post-Training Quantization for Generative Pre-trained Transformers）：使用二阶信息来执行误差补偿。GPTQ 可能会在重构过程中对校准集（calibration set）产生过拟合问题，从而在 out-of-distribution domains 上精度暴跌。此外，GPTQ 需要对某些模型进行重新排序（reordering），这在硬件实现上较为复杂。也正是因为 reorder 的问题，GPTQ 可能难以维持模型的 generalize 能力，更何谈 multi-modal。

[GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.17323)

5. 作者观察到，参数的重要程度不尽相同。存在极少量（0.1%~1%）的参数有显著作用（salient），对这些参数不进行量化能够显著减轻精度损失。作者指出，应该通过模型的激活值而非直接通过模型的参数去决定那部分参数是显著的。即便我们只进行 weight only quantization，关联到更大激活值的参数才是显著的。扩大保留的 salient 参数的比例能够有效减少精度损失。基于此，作者实现了 per-channel scaling method 来搜索到最佳的 salient 参数比例。AWQ 避免了硬件效率低下的混合精度实现，并保持了良好的模型泛化能力（甚至第一次实现了跨模态的量化），无需反向传播或重构。

在物理实现上，作者开发了 TinyChat 框架：

> To implement AWQ, we designed TinyChat, an efficient inference framework to convert theoretical memory savings from 4-bit LLM to measured speedup. Our framework significantly speeds up linear layers through on-the-fly dequantization. We also take advantage of efficient 4-bit weight packing and kernel fusion to minimize the inference overhead (e.g., intermediate DRAM access and kernel launch overhead), such that we can better realize the speed up from quantizing the weights to 4-bit, despite the computer is byte-aligned.

这里对一些名词进行阐述。

6. 通过实时解量化（on-the-fly dequantization），AWQ 框架（也即原文中实现的 TinyChat 框架）显著提高了线性层的推理速度：在推理过程中实时将低位量化的权重转换回高精度格式（如 FP16），而不必将解量化后的权重写入内存。通过将解量化操作与矩阵乘法等计算核混合，减少了中间数据的内存访问，提升了计算效率。

7. 4-bit weight packing：将多个 4 位权重打包到一个字节或更大的单元中，从而优化内存带宽。

8. Kernel fusion：将多个计算操作（kernel）合并到一个计算单元中，可以避免单独启动每个计算核所带来的开销，从而提升推理效率，减少内存访问次数和计算延迟。

9. Intermediate DRAM access：访问 DRAM 通常比寄存器或缓存存储器更慢，推理过程中如果频繁访问 DRAM，会降低计算速度。

10. Kernel launch overhead：在 GPU 上启动一个 kernal 所需的时间和资源开销。每次启动核时，都会涉及调度、初始化等操作，这些操作自然会引入不可忽略的延迟，尤其是在大量小规模计算任务的情况下。

11. 通过这些现代方法，TinyChat 实现了 AWQ 理论上能够带来的加速，即便存储时参数是 byte-aligned 的。

12. 通过测试 bbl 作为 metric，AWQ 达到了某种意义上的最优。此外，AWQ 具有不平凡的 generalizability，对于 instruction-tuned model 甚至 multi-modal model 都有不错的效果。

【特别强调】

<strong>这里测试 PPL 是值得质疑的。</strong>开 COLM 期间我和一些做 ML sys 的老哥聊了聊，我一直以为 LLM evaluate 已经非常好 hack 了，结果有业内人士给我说其实 ML sys 的 work 更好 hack。一个典例就是有的 quantization paper 会去测试 ppl。ppl 即便 maintain 的再好，对于下游任务也是 nonsense，因此但凡是测试 ppl 的 paper，一般都是很有问题的。

既然 PPL 不好，那么什么科学呢？实际上，业内人士表示，量化完了还是该去测试下指标，譬如跑个 GSM8K 看看效果。别无他法...

不过，我写完后觉得 AWQ 貌似没那么有问题。因为 AWQ 是对着 base model（比如 Llama base）测试量化后的 ppl，而对于量化后的 instruction model，AWQ 测试的是 GPT4-score（不然我也觉得 ML sys best paper 怎么会有这么低级的错误）对于 base model，重要的就是拟合足够好，所以测试 PPL 无可厚非？

### Related Work

- 我们通常关注两种类型的量化方式：W8A8，同时将参数和激活值都量化为 INT8 类型。Low-bit weight-only quantization，只对参数进行量化。
2. 量化当然直观上降低了内存消耗。而在不直观的方面，量化也会加速推理速度——举例来说，decode 阶段是 memory bound 的（因为要不断把参数 fetch 到 kernal 中）。量化后 memory 变小，自然 fetch 也会更快。其他的加速更不必说了。

### AWQ: activation-aware weight quantization

- Quantization maps a floating-point number into lower-bit integers. 模型量化通常将浮点数映射到低位数的整数上，最简单 valina 的 baseline 就是直接把浮点参数 round to nearest integer。映射为整数的好处自然不少：硬件支持和计算效率更好，毕竟整形计算通常比浮点数更快更节能；存储效率更高...
## 2. 虽然前文已经阐述了，PPL 不是个科学的指标。但是作者基于此得到的结果还是非常有趣，具体可以参考下表、基于参数的 L2 norm 进行 scaling 远逊色于基于激活值的 L2 norm 进行 scaling：


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6b7375aac95c.jpg)

3. 虽然保留 0.1% 的参数不进行量化可以带来很好的 PPL 性质，但是实际上混合精度系统非常难实现。不应该实际上直接保留为 FPP16。

4. 这里再保留一张很有趣的图。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_04e156b7e0b1.jpg)

a 图中的 context 应该就是 prefill 的意思，从而看出 prefill 相比 decode 是 marginal 的。b 图【没看懂...】c 图则进一步展现出 decode 阶段，memory 开销无论在 attention 还是在 FFN 中都远远超出计算开销。考虑到模型的 FLOPS 是给定的，减轻 memory 大小更加刻不容缓。

### TinyChat: Edge Device Usage

- kernel fusion 对于 forward pass 不高效的模型尤其有效，比如 Falcon 和 StarCoder。【不懂】
2. 为了测试 instruction tune 后的模型，AWQ 用 GPT4 score 测试了分数，甚至还考虑了选项的 order 问题。

3. 由于只有 language part 被量化了（因为 language part 占据了绝大多数模型参数），所以 AWQ 天然就该能够量化 VLM，事实也是如此。

4. 下图显示，AWQ 需要的校准数据集更小，且相对校准数据集更为鲁棒。当然，我觉得他们可以试图理论证明这件事情，但是 system paper 很少理论证明，倒也无可厚非。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7747562cc831.jpg)

[发布于 2024-10-12 08:58](//www.zhihu.com/question/645963779/answer/4841384841)・美国

​赞同 55​​​74 ​1 ​分享

​​

收起​
