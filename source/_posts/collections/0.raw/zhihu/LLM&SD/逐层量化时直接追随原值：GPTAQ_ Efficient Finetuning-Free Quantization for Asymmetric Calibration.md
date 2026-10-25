---
title: "逐层量化时直接追随原值：GPTAQ: Efficient Finetuning-Free Quantization for Asymmetric Calibration"
date: "2025-07-31 00:00:00"
updated: "2025-07-31 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/逐层量化时直接追随原值-GPTAQ_-Efficient-Finetuning-Free-Quantization-for-Asymmetric-Calibration/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1928814340871549979
---


[https://arxiv.org/pdf/2504.02692](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2504.02692)

<strong>剧名：</strong> 《非对称校准的黎明》

<strong>时间：</strong> 当代，一个周二的下午

<strong>地点：</strong> 一场跨越大西洋的Zoom视频会议

<strong>人物：</strong>

- <strong>Dr. Alistair Duncan (阿利斯泰尔·邓肯博士):</strong> 剑桥大学计算机科学系名誉教授，机器学习理论领域的泰斗。思维深邃，善于把握问题本质。
- <strong>Dr. Elena Schmidt (埃琳娜·施密特博士):</strong> 硅谷顶尖AI研究实验室“QuantumLeap AI”的首席科学家，对模型压缩和量化算法有深入研究，以其数学上的严谨和敏锐的洞察力著称。
- <strong>Dr. Kenji Tanaka (田中健二博士):</strong> 一家领先硬件公司（类似NVIDIA）的高级系统架构师，专注于高性能计算和GPU优化，对算法的实际效率和可部署性极为敏感。
<strong>(场景开始)</strong>

<strong>(屏幕上显示着三个视频窗口。Alistair博士他堆满书籍的办公室里，身后是一块写满公式的白板。Elena博士的背景是极简主义的现代办公室。Kenji博士则身处一个服务器机房环境中，背景音中偶尔有轻微的风扇声。)</strong>

<strong>Alistair博士:</strong> (扶了扶眼镜，微笑着) Elena, Kenji，下午好。感谢二位抽出时间。我们最近在部署一些超大规模模型时，再次遇到了模型压缩的瓶颈。GPTQ（Frantar et al., 2022）无疑是一个里程碑式的工作，它的免微调（finetuning-free）特性和高效性使其成为了事实上的标准。但当我们将比特数压得更低，比如3位甚至2位时，性能的悬崖式下跌依然令人头疼。今天，我想和大家讨论一篇似乎精准地切中了这个痛点的新论文——《GPTAQ: Efficient Finetuning-Free Quantization for Asymmetric Calibration》。

<strong>Elena博士:</strong> (立刻来了兴趣，她的屏幕上已经打开了这篇论文的PDF) 是的，Alistair，我注意到了这篇论文。它的标题就有趣，“非对称校准”。这直接挑战了GPTQ的核心假设。GPTQ的校准过程是“对称”的，它试图让量化后的层输出 ŵX̄ 尽可能地接近 *使用相同量化输入* 的全精度层输出 wX̄。

$GPTQ (Symmetric Calibration): min \text{GPTQ (Symmetric Calibration): } \min_{\hat{w}} ||\hat{w}\bar{X} - w\bar{X}||^2  $

<strong>Alistair博士:</strong> 正是！Elena，你一语中的。这里的 X̄ 是来自前一个 *已经量化过* 的层的输出。这就像一个链条，每一环的微小误差都会传递并累积到下一环。GPTQ的做法是，在每一环都尽量减少与“已经有点歪”的上一环的偏差，但这并不能纠正整个链条的累积偏差。

<strong>Kenji博士:</strong> (身体前倾，双手交叉) 从系统实现的角度看，这种误差累积是致命的。这意味着模型越深，后面的层接收到的输入激活值就离原始的全精度模型的激活值越远。论文中的图2非常直观地展示了这一点。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_53d9f5ae689e.jpg)

<strong>Kenji士:</strong> 在左边的GPTQ图中，我们可以看到随着Transformer块（Block Index）的增加，输入激活的平均绝对误差（MAE loss）在持续增长，形成了一个明显的“山坡”。这正是累积误差的可视化证据。而右边的GPTAQ图，整个曲面被压平了。这太惊人了。那么，GPTAQ的“非对称”究竟是怎么做的？

<strong>Elena博士:</strong> 这正是这篇论文最优雅的地方。GPTAQ改变了优化的目标。它不再试图匹配 wX̄，而是直接去匹配 *原始全精度模型* 在该层的输出 wX。

 $\text{GPTAQ (Asymmetric Calibration): } \min_{\hat{w}} ||\hat{w}\bar{X} - wX||^2  $

<strong>Elena博士:</strong> 注意看，目标函数右侧是 wX，这里的 X 是来自 *全精度模型* 的输入激活。这意味着，GPTAQ的每一层校准，都在努力地将输出“拉回”到原始模型的正确轨道上，从而主动地补偿和修正从前面层累积过来的输入误差 ΔX = X̄ - X。它引入了一个残差项 r = wX̄ - wX，优化目标就变成了最小化 ||ΔwX̄ - r||²。

<strong>Alistair博士:</strong> 非常精彩的阐述。这个小小的改动，在理论上是根本性的。论文接着在4.1节中，使用拉格朗日乘数法，从最优脑压缩（Optimal Brain Compression）的框架出发，推导出了一个全新的、闭式的权重更新解。Elena，你能否为我们解读一下最终的那个关键公式（Eq. 9）？

<strong>Elena博士:</strong> 当然。推导过程很严谨，最终得到的权重更新 Δw 包含了两部分：

 $$\Delta w = \underbrace{\frac{(\hat{w}_q - w_q)}{H_{qq}^{-1}} \cdot (H_{q,:}^{-1})}_{\text{Term 1: GPTQ-like update}} + \underbrace{r\bar{X}^T H_{:,q}^{-1}}_{\text{Term 2: Asymmetry correction}}  $$

<strong>Elena博士:</strong> 第一项，大家都很熟悉，它本质上和GPTQ的更新规则是一样的，即根据量化误差 (ŵq - wq) 和逆Hessian矩阵 H⁻¹ 来更新其他未量化的权重，以补偿当前权重量化所带来的损失。而第二项，是全新的！它引入了我们才提到的输出激活残差 r。这一项的作用，就是显式地去最小化由于输入激活偏差 ΔX 所造成的“非对称误差”。

<strong>Kenji博士:</strong> (眉头微皱) 理论上非常完美。但我的警报器响了。这个新的第二项 rX̄ᵀH⁻¹ 看起来计算代价不菲。r 是一个 m \times k 的矩阵，X̄ 是 n \times k，H⁻¹ 是 n \times n。在每一小步迭代中（即量化单个权重 wq 时）都去计算这个，对于动辄数十亿参数的模型来说，现实吗？GPTQ之所以成功，很大程度上得益于它的高效实现。

<strong>Elena博士:</strong> 问得好，Kenji。这也是我初读时的疑虑。但论文的4.2节“Efficient Solution”给出了一套组合拳，巧妙地化解了这个问题。这套方案堪称工程的艺术。 第一，<strong>任意顺序处理</strong>。他们证明了，对于大型模型，严格遵循最优量化顺序带来的收益微乎其微，因此可以按列顺序处理，这为GPU并行化打开了大门。 第二，也是最键的一步，<strong>高效残差分解</strong>。他们没有在每一步都重新计算巨大的残差矩阵 R，而是将其分解为 R = WΔX。更进一步，他们把 R 分解到每个神经元上：

 $R = W\Delta X = \sum_{q=1}^{n} W_{:,q} \Delta X_{q,:}  $

<strong>Elena博士:</strong> 这意味着，校准第q列权重时，我们只需要关心由第q个输入神经元的偏差 ΔX_q 带来的那部分残差。这极大地降低了计算复杂度。

<strong>Kenji博士:</strong> 我明白了！他们把一个大的矩阵更新问题，分解成了一系列可以独立计算的向量与矩阵的乘积。他们预先计算一个矩阵P，其中 P_q,: = ΔX_q,:X̄ᵀH⁻¹，然后第二项的计算就变成了 W_{:,q}P_q,:，非常高效。而且论文的图3展示了他们如何利用Cholesky分解和掩码矩阵来并行计算整个P矩阵。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_99b1eb0b9fde.jpg)

**

Kenji博士:** 这种利用GPU架构特性的优化思路非常高明。他们用Cholesky分解 H⁻¹ = LLᵀ 替代了高斯消元，保证了数值稳定性，并通过Lazy-Batch Updates，按块（block）更新权重，进一步提升了GPU的利用率。从图4的延迟测试来看，相比于GPTQ，GPTAQ增加的额外延迟非常小，在典型层维度（如4096）下低于10%，这在实践中完全可以接受。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3fa24e9c3879.jpg)

**

Alistair博士:** 那么，让我们看看实际效果。实验结果部分（第5节）的数据非常有说服力。我们来看看表1和表2。

PrecisionMethodFT-FreeL3-8BL3-70BL2-7BL2-13BL2-70BPretrained✓6.142.855.474.883.32...W4A4QuaRot+GPTQ✓7.809.446.005.303.71QuaRot+GPTAQ✓7.376.935.865.173.69...W2A4QuaRot+GPTQ✓10244432.615.56.68QuaRot+GPTAQ✓17.939.111.28.575.64*（表格为Table 1右半部分和Table 2部分结果的简化合并展示）*

<strong>Alistair博士:</strong> 无论是在W4A4还是极具挑战性的W2A4设置下，GPTAQ的困惑度（Perplexity，越低越好）都显著优于GPTQ。在LLaMA3-70B模型上，GPTQ的困惑度从2.85上升到9.44，而GPTAQ能控制在6.93。在W2A4这种极端情况下，提升更是惊人，困惑度降低了80%以上。这证明了修正累积误差的巨大价值。

<strong>Elena博士:</strong> 我还想补充一点，消融研究（Ablation Study，Table 5）非常关键。它分别测试了只使用更新公式中的第一项（即GPTQ）和只使用第二项（非对称修正项）时的性能。结果发现，虽然只用第二项也能带来提升，但将两项结合（即完整的GPTAQ）才能达到最佳性能。这雄辩地证明了新提出的非对称修正项的有效性和必要性。

PrecisionMethodΔWWiki2(↓)Avg(↑)RTN09.9165.5W4A4GPTQE:,q Lq,:ᵀ7.8067.1GPTAQ (Term 2 only)W:,q Pq,:7.9769.0GPTAQ (Full)E:,q Lq,:ᵀ + W:,q Pq,:7.3669.6<strong>Kenji博士:</strong> 另外，我还对Table 4的结果印象深刻。他们在一块A100 GPU上成功量化了405B参数的LLaMA3.1模型，这展示了算法极佳的可扩展性。对于我们这些需要将模型部署到资源受限环境中的人来说，这意味着一个强大、高效且可靠的新工具。

<strong>Alistair博士:</strong> (总结道) 看来我们达成共识了。GPTAQ并不仅仅是GPTQ的一个小修小补。它通过引入“非对称校准”这一深刻的洞见，从根本上解决了免微调量化中的误差累积问题。更难能可贵的是，它通过一系列精巧的工程优化，在几乎不增加额外计算开销的情况下，实现了理论上的优越性。它就像一位技艺精湛的外科医生，不仅切除了病灶（量化误差），还精准地修复了其对周围组织造成的影响（累积误差）。这无疑是后训练量化领域一个非常扎实的进步。

<strong>Elena博士:</strong> 我同意。而且它只比GPTQ多了大约20行代码，这意味着社区可以非常容易地采纳和集成它。简单、有效、深刻，这是优秀研究的标志。

<strong>Kenji博士:</strong> 我已经准备让我的团队开始测试它了。如果效果真如论文所示，它将成为我们新一代模型压缩工具箱里的核心组件。

<strong>(三人相视而笑，对这一新技术的潜力充满了期待。场景结束。)</strong>

戏剧>

这篇名为《GPTAQ: Efficient Finetuning-Free Quantization for Asymmetric Calibration》的论文，提出了一种新颖的、无需微调的量化方法GPTAQ，旨在解决现有方法（特别是其前身GPTQ）在量化大型Transformer模型时存在的误差累积问题。以下是对该论文的深入专业讨论。

#### 1. 核心思想：从“对称校准”到“非对称校准”

#### GPTQ的局限：对称校准与误差累积

GPTQ（以及其基础OBQ框架）采用的是一种<strong>对称校准（Symmetric Calibration）</strong>策略。在量化一个网络层时，其优化目标是让量化后的权重矩阵 ŵ 与输入激活 X̄ 的乘积，尽可能接近全精度权重 w 与同一个输入 X̄ 的乘积。其目标函数为：  \min_{\hat{w}} ||\hat{w}\bar{X} - w\bar{X}||^2  这里的关键在于输入 X̄。这个 X̄ 是来自前一层<strong>已经量化过</strong>的输出。这意味着 X̄ 本身已经包含了前面所有层的量化误差。GPTQ的做法是在一个已有偏差的输入基础上，去最小化当前层的量化误差，但这无法纠正输入 X̄ 中已经存在的偏差。随着网络层数的加深，这种偏差会像滚雪球一样被累积和放大，导致模型深层部分的输入激活与原始全精度模型相比严重失真，最终影响模型性能，在低比特量化时尤其严重。论文中的图2(a)清晰地展示了这种误差累积效应。

#### GPTAQ的创新：非对称校准

GPTAQ的核心创新在于提出了<strong>非对称校准（Asymmetric Calibration）</strong>。它改变了优化的基准，不再以有偏差的 wX̄ 为目标，而是始终以<strong>原始全精度模型</strong>的输出 wX 为目标。其目标函数变为：  \min_{\hat{w}} ||\hat{w}\bar{X} - wX||^2  这里的 X 是全精度模型未经量化的输入激活。这种“非对称”性体现在：它用量化层的输入 X̄ 进行前向计算，但却用全精度模型的输出 wX 作为真值（ground truth）进行校准。

这种做法的本质是在一层都试图<strong>补偿和修正</strong>从前面层传递过来的累积误差。我们可以将优化问题重写为：  \min_{\Delta w} ||(\Delta w)\bar{X} - (wX - w\bar{X})||^2 \quad \text{s.t.} \quad \Delta w = \hat{w} - w  其中 r = wX - wX̄ = w(X - X̄) = -w\Delta X 代表了由于输入激活误差 ΔX 导致的输出残差。GPTAQ的目标就是找到一个权重更新量 Δw，使其不仅能补偿当前层的量化误差，还能最大程度地抵消这个输入残差 r。

#### 2. 理论框架与高效实现

论文基于最优脑压缩（OBC）框架，为上述非对称校准问题推导出了一个闭式解。

#### 最佳权重更新

$$通过拉格朗日乘数法，论文推导出对其他未量化权重的最佳更新量 Δw 为：  \Delta w = \frac{(\hat{w}_q - w_q)}{H_{qq}^{-1}} \cdot (H_{q,:}^{-1}) + (w\bar{X} - wX)\bar{X}^T H_{:,q}^{-1}  这个公式清晰地揭示了Δw由两部分构成： 1.  <strong>量化误差补偿项</strong>：与GPTQ相同，用于修正当前权重 wq 被量化到 ŵq 所带来的直接影响。 2.  <strong>非对称误差修正项</strong>：这是GPTAQ独有的，它利用输出残差 (wX̄ - wX) 来调整权重，以补偿输入激活的偏差。$$

#### 高效实现策略

直接实现上述更新规则的计算成本极高。论文提出了一套精巧的优化策略，使其效率接近GPTQ：

- <strong>任意顺序处理</strong>：放弃寻找全局最优的量化顺序，改为按顺序（如按列）处理权重。这极大地简化了流程，并使大规模并行成为可能。
- <strong>高效残差分解</strong>：这是关键的性能优化。为了避免重复计算巨大的残差矩阵 R = WΔX，论文将其分解到每个神经元上。在处理第q个权重时，只考虑与 ΔX_q 相关的残差部分。他们预先计算并存储一个矩阵 P，其中 P_q,: = ΔX_q,:X̄ᵀH⁻¹，从而将复杂的更新计算简化为高效的矩阵-向量乘法。
- <strong>Cholesky 重构</strong>：与GPTQ类似，使用 H⁻¹ = LLᵀ 的Cholesky分解来计算逆Hessian矩的相关项。这不仅比迭代的高斯消元法数值上更稳定，而且更易于在GPU上高效实现。论文推导了定理4.2，给出了利用掩码矩阵并行计算 P 矩阵的方法：P = ((ΔXX̄ᵀL) ⊙ Mu) Lᵀ。
- <strong>延迟批量更新 (Lazy-Batch Updates)</strong>：将权重分组（成块），在块内完成所有计算后，再一次性地更新块外的权重。这减少了数据搬运和计算核的启动开销，提高了GPU的利用率。
通过这四步优化，GPTAQ在保持理论优势的同时，实现了与GPTQ相媲美的极高效率。

#### 3. 实验结果与分析

论文在视觉、语言、大规模模型上进行了全面的实验，结果令人信服。

- <strong>性能全面超越GPTQ</strong>：在DeiT（视觉）、LLaMA（语言）等多种模型和W4A4、W2A4等不同量化精度下，GPTAQ的性能（ImageNet准确率或Wikitext2困惑度）均一致且显著地优于GPTQ。特别是在W2A4等极低比特场景下，GPTQ性能急剧下降，而GPTAQ仍能保持相对理的性能，显示出其鲁棒性。
- <strong>卓越的可扩展性</strong>：GPTAQ成功地在<strong>单块A100 GPU</strong>上量化了高达405B参数的LLaMA3.1模型和顶级的视觉模型EVA-02，并将性能损失控制在很小范围内，证明了该方法的效率和可扩展性，使其能应用于最前沿的超大规模模型。
- <strong>消融研究验证核心机制</strong>：Table 5的消融实验证明，权重更新公式中的两个部分（量化误差补偿项和非对称误差修正项）都是必须的，二者结合才能达到最佳效果，这为非对称校准的理论提供了坚实的实验支撑。
- <strong>激活量化顺序的探讨</strong>：Table 6的实验发现，对于GPTAQ，采用“先量化激活，再量化权重（A→W）”的顺序能带来更好的性能，因为它能让 ΔX 捕获到更完整的信息。

#### 结论

GPTAQ是一项非常出色的研究工作。它精准地识别了现有主流免微调量化方法GPTQ中的一个根本性缺陷——误差累积，并提出了一个理论优雅、逻辑上清晰的解决方案——非对称校准。更重要的是，论文作者通过一系列高超的工程优化技巧，解决了新方案可能带来的效率问题，使其成为一个<strong>即插即用、开销极小、效果显著</strong>的升级。

总而言之，GPTAQ通过一个简单的目标函数修正，辅以高效的实现，显著提升了后训练量化的性能和鲁棒性，尤其是在低比特领域。它不仅是对GPTQ的有力改进，也为未来免微调量化方法的发展指明了一个重要的方向：<strong>必须正视并主动修正量化过程中的累积误差</strong>。
