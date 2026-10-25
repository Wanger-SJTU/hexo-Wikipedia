---
title: "(2 条消息) LLMs量化系列|LLM量化方法小结"
date: "2025-06-03 00:00:00"
updated: "2025-06-03 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/LLMs量化系列_LLM量化方法小结/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/12568191406"
---


LLM量化的论文是挺多的，之前看主要还是以处理通道级的<strong>Normal outlier</strong>为主（SmoothQuant,AWQ,Outlier Suppression+,OmniQuant等等), 或者结合LoRA的方法吸收量化误差(QLoRA,QALoRA,LoftQ,LRQAT等等）。最近一年出现了旋转矩阵的方法（QuIP,QuaRot,DuQuant,SpinQuant等等），这类方法一般利用单位随机矩阵和权重变换之后再量化，使得变换后的权重更容易量化。利用随机正交矩阵对权重进行多次旋转变换，使之不仅消除了通道上的<strong>Normal outlier</strong>，也消除了<strong>Massive outlier，</strong>值得研究。此外，基于Look Up Table(LUT)/Vector Quantizaton的方法似乎也有一些进展（AQLM,GPTVQ,QuIP#,PV-Tuning)。由于KV-Cache的压缩需求，KV-Cache的量化（KIVI,KVQuant,ZipCache等)也是一条全新的赛道，并且有一些新的特点。

小结仅为个人的理解，有错误的地方欢迎指出。

<strong>Normal Outliers与Massive Outliers</strong>**我们所说的LLM的Outliers更多是指激活值的Outliers，因为权重的整体变化幅度还是比较小的。Outliers的出现会使得量化更难进行，因为数值的变化范围变大了，而我们的编码精度是有限的，如INT4就只有16个数，从而导致了更大的量化误差。
早期对Outliers是不做区分的，人们认为的Outliers一般指Normal Outliers，其更多地出现在Channel维度，这也是之前的通道级量化方法想解决的。最近的工作如Massive Activations in Large Language Models等将在token维度出现的值特别大，但又非常少的Outliers视为Massive outlier，这是之前通道级量化方法解决不了的，但是可以通过旋转矩阵或者CushionCache（Prompt）吸收的方式解决。![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f48911e8fbbc.jpg)

DuQuant: Distributing Outliers via Dual Transformation Makes Stronger Quantized LLMs. In NeurIPS2024.
### 通道级量化方法

#### SmoothQuant [ICML2023]

SmoothQuant认为大语言模型的权重好量化，而激活值比较难量化，因为激活值和权重相比会出现非常大的离群值；所有这篇论文的动机就是能不能通过一些变换让激活值好量化一些。

论文的具体方法就是逐通道对权重乘上缩放因子，在激活上乘上缩放因子矩阵的逆，从而保持整体的输出不变，激活值整体变小，权重整体变大，激活值更好量化了。缩放因子 s_j直接根据规则公式（4）计算，超参数 \alpha 用来调节缩放因子。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b338d6517886.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_19c6f285f73f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_baa58ced53bc.jpg)

> [ICML2023] [W8A8] [SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DsHfSV8eYEp)

#### Outlier Suppression+（OS+) [EMNLP2023]

作者观察到Outlier是不对称的<strong>，并且集中在特定通道中。方法：</strong>提出了一种channel-wise shifting和scaling操作，以消除不对称性并缩小问题通道**。作者证明这些操作可以无缝地迁移到后续模块中，同时保持等价性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0b9055674a11.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7cf1adeade44.jpg)

[EMNLP2023] [W8A8] [Outlier Suppression+: Accurate quantization of large language models by equivalent and effective shifting and scaling](https://link.zhihu.com/?target=https%3A//aclanthology.org/2023.emnlp-main.102/)
#### AWQ [MLSys2024]

权重并不是同等重要的，仅保护1%的显著权重可以大大减少量化误差**。那么什么样的权重值得保护呢，在推理时被显著激活的权重肯定更重要，即较大激活值对应的权重比较重要。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0697813fd323.jpg)

为了同时考虑显著权重和非显著权重，作者选择<strong>自动搜索最佳（每个输入通道）缩放因子，使某一层量化后的输出差最小</strong>。从形式上看，希望优化以下目标，其中，Q 表示权重量化函数，W 表示 FP16 中的原始权重，X 是从小校准集中的输入特征。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0cfc36764544.jpg)

其中，s仅与激活的大小有关，使用单个超参数α来平衡显著通道和非显著通道的保护。可以通过在 [0, 1] 区间内进行快速网格搜索（grid search）来找到最佳的 α（0 表示不进行缩放；1 对应于最激进的缩放） 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3bb70c3fecfa.jpg)

[MLSys2024] [W3A16] [AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.00978v4)
#### OmniQuant [ICLR2024]

前面的方法都是手动设计或者网格搜索搜出来的缩放参数，作者认为这是次优的。解决方式是在量化过程中学习转换参数和裁剪参数。

OmniQuant包括两个组件：可学习的权重裁剪( LWC )和可学习的等效转换( LET )。LWC通过优化阈值来调节权值的极值。同时，LET通过可学习的等价变换对激活进行平滑来处理激活异常值。

我们的优化目标是最小化量化前后的误差：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_71690eeb3f01.jpg)

LWC：可学习的权重裁剪范围，即下面表达式里的 \gamma 和 \beta 参数

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b28e1d19583c.jpg)

LET：可学习等效转换参数，即下面表达式里的 \delta 、 s 与 s_a 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6fc7c70c72cf.jpg)

> [ICLR2024] [W4A4] [OmniQuant: Omnidirectionally Calibrated Quantization for Large Language Models](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3D8Wuvhh0LYW)

### 基于优化目标的方法

#### GPTQ [ICLR2023]

GPTQ是一篇经典的LLMs PTQ方法，也是在前三份工作的基础上改进得到的，这里就不详细介绍了，感兴趣可自行看论文或者一些博客。前三份工作分别是：

（1）LeCun的OBD，这是一种基于优化目标的剪枝方法

> [LeCun et al., NeurIPS1989] [Optimal Brain Damage](https://link.zhihu.com/?target=https%3A//proceedings.neurips.cc/paper/1989/file/6c9882bbac1c7093bd25041881277658-Paper.pdf)

OBD建立了一个误差函数的局部模型来预测扰动参数向量对优化目标造成的影响。具体来说用泰勒级数来近似目标函数 \delta L ，\delta L即我们改变部分权重时损失函数的变化量**。然后通过一些假设简化了泰勒展开式，对目标函数的变化量被简化为\dfrac{1}{2} h_{ii} w_i^2。所以我们只要计算海森矩阵h_{ii}，就可以知道每个参数对目标的影响。然后就可以按照影响从小到大给参数排个序，这样就确定了参数剪枝的次序。

（2）Hassibi的OBS，这还是一种基于优化目标的剪枝方法

OBS认为OBD中提出的参数之间的独立性假设不成立，我们还是要考虑交叉项，推导出的公式只需要求解海森矩阵的逆，就可以计算每个参数w_q对目标的影响\dfrac{1}{2} \dfrac{w_q^2}{[\mathbf{H}^{-1}]_{qq}}，然后就可以按照影响从小到大给参数排个序，这样就确定了参数剪枝的次序。

[Hassibi et al., ICNN1993] [Optimal Brain Surgeon and general network pruning ](https://link.zhihu.com/?target=https%3A//ieeexplore.ieee.org/document/298572)
[Optimal Brain Surgeon公式推导 - 知乎](https://zhuanlan.zhihu.com/p/656316235)（3）GPTQ作者Frantar在OBC中认为当今模型过于复杂，导致求解整个模型的海森矩阵太复杂，假设参数矩阵的同一行参数互相之间是相关的，而不同行之间的参数互不相关，则只需计算行内海森矩阵即可；作者认为剪枝是一种特殊的量化，同时提出OBQ：逐层求海森矩阵并按影响从小到大给层内权重排个序，然后依次量化

> [Frantar et al., NIPS2022] [Optimal Brain Compression: A Framework for Accurate Post-Training Quantization and Pruning ](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DksVGCOlOEba)

GPTQ主要的改进如下：

- 按固定顺序量化：**到了GPTQ，作者觉得对于LLMs来说，每次都要挑选需要量化的参数是不必要的。即同时按照相同的顺序量化所有的权重，而不是逐个权重按照固定的贪心策略（先量化对目标影响最小的参数）进行量化。这种方法使得在大型模型上的计算效率更高，因为它减少了计算复杂性。
- <strong>Lazy Batch-Updates：</strong>同时每次迭代都需要更新整个海塞矩阵的逆以及对整个权重进行更新，每次更新权重时都会涉及到大量的计算，但只涉及很少的内存访问。这种情况下，计算操作无法充分利用现代GPU的大规模计算能力，因为GPU通常具有较高的计算吞吐量，但相对较低的内存带宽。由于参数量化是一列一列按次序进行的，第 i 列的参数的量化结果受到前 i-1 列量化的影响，但第 i 列的量化结果不影响前面列的量化。因此不需要每次量化前面的列，就更新一遍第 i 列的参数，而是可以先记录第 i 列的更新量，在量化到第 i 列时，再一次性更新参数，这样就可以减少 IO 的次数。
- <strong>Cholesky Reformulation：</strong>频繁更新整个海森矩阵的逆会引入数值误差。作者改用 Cholesky 分解求海森矩阵的逆，在增强数值稳定性的同时，不再需要对海森矩阵做更新计算，进一步减少了计算量。结合 Lazy Batch-Updates, 可以将权重更新式限制在 block 内, 然后再通过一次更新将此 block 之后的全部列进行更新. 这样就起到了节省内存带宽的作用, 从而显著提升算法效率。
[ICLR2023][W3A16] [GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.17323)
[QLoRA、GPTQ：模型量化概述 ](https://zhuanlan.zhihu.com/p/646210009)
#### GPTAQ [ICML2025]

GPTQ有个问题是：传统的权重-激活量化一般是最小化当前block/layer的量化输出与全精度输出的MSE，并优化某些量化参数，例如优化OmniQuant里的缩放变换与裁剪参数；GPTQ方法是做了仅权重量化，并没有考虑到这一点：GPTQ算MSE的时候是拿更新后的当前层的权重 \hat w 和量化后的激活 X 得到的输出 \hat wX 与更新前的权重 w 与量化后的激活 X 得到的输出 wX 来计算的**。

原始的GPTQ算法<strong>只适合处理权重量化</strong>，如果要对输入激活值的量化的话，这样计算是不准确的。因为MSE的是 \hat wX-wX ，这并不会在GPTQ算法的更新过程中考虑到对激活值量化的影响，<strong>误差完全来源于量化权重</strong>。<strong>只有后一项换成全精度的激活值的 \tilde X  ，误差的来源才是权重和激活</strong>，这样可以通过更新权重来同时减小权重与激活的量化误差。

因此，GPTAQ算法的改进之处是将优化的目标改成了\hat wX-w \tilde{X}  考虑到激活值误差的影响，将激活值的量化误差加到GPTQ更新公式中，这里就不推公式了

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_be4ec03db94b.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7bfd346c8d08.jpg)

[ICML2025] [GPTQv2: Efficient Finetuning-Free Quantization for Asymmetric Calibration](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2504.02692v1)
#### MagR [NeurIPS2024]

先前的研究通过权重转换的方法，旋转矩阵的方法或是其他变换方法，量化的是TW矩阵， 这为量化的过程引入了额外的计算开销和存储开销，降低了大模型推理的推理速度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_466fbcd62b2e.jpg)

如果能直接优化掉这些Outlier其实就不需要加一些其他变换参数。为了解决这个问题，作者提出了权重幅度缩减（MagR）的简单优化技术。MagR作为一种非线性变换作用于权重，而不改变原始特征/激活。优化程序旨在找到具有最小最大幅度的新权重，即 l _\infty 范数，同时保持层的输出。

权重的无穷范数其实就是权重的绝对值最大值，如果在优化目标中加入无穷范数的正则项，不就能在优化时削减权重范围，从而更好地量化了？这个方法的问题是无穷范数是不可微的，因此作者使用了近端梯度下降来作为优化器。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5375411387bb.jpg)

> [NeurIPS2024] [W2A16] [MagR: Weight Magnitude Reduction for Enhancing Post-Training Quantization](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.00800v2)

### 基于旋转矩阵的方法

通道级量化方法大多在通道维度**对权重和激活值做等价变换，从而降低通道上Outlier的幅度，使得量化更容易进行。但是并没有考虑到Outlier并不只在通道维度上，这么做还可能引入新的Outlier。

#### QuIP [NeurIPS2023]

这篇论文数学部分过多，有些地方看不太懂，就只结合我自身对量化的理解解释一下这种方法的思路。

QuIP作者发现<strong>当权重和海森矩阵不相关时，量化过程更容易进行。</strong>（1）此时，权重矩阵的元素幅值会更尽量均匀,不存在过多的离群值。(2) Hessian矩阵的主要方向不应与坐标轴过度对齐，因为权重的变化不会受到不同方向上的重要性差异的影响，从而减少了舍入误差的可能性。作者证明了<strong>舍入的性能上界与海森矩阵H的特征值和不相干性参数μ有关</strong>。特别地,当H具有较低的秩(即大部分特征值接近于0)和较小的μ时舍入误差会较小。

然后作者给出的方法就是在forward阶段对权重做所谓的“不相干性处理”(旋转变换）后进行量化，量化完再将权重变换回去，保持模型输出等价。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1acadc9e660a.jpg)

其实作者说了一大堆，根据我的理解，说人话就是：<strong>权重矩阵的所有权重分布应该是越均匀越好量化的。怎么才能让权重变得更均匀呢？那就给矩阵乘上一个随机的矩阵。一个随机的矩阵其分布是趋近于高斯分布的，其熵比较大。一个训练好的权重矩阵并不是那么均匀的，特别是充分训练的大语言模型。用一个随机的矩阵乘上不均匀的训练好的矩阵，那么得到的结果肯定是熵增的，即比原来的分布更均匀。</strong>

这么做确实更好量化了，那么如何保证网络的输出不变呢？<strong>只需要左右各乘随机正交矩阵的即可。</strong>

值得注意的是，FlashAttention3里就用到了QuIP所提出的方法。

[NeurIPS2023] [W2A16] [QuIP: 2-Bit Quantization of Large Language Models With Guarantees](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2307.13304v2)
[FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2407.08608)
#### QuaRot [NeurIPS2024]

QuaRot没有用随机正交矩阵，而是利用计算不变性，对权重进行Hadamard变换，消除Outlier使之更容易量化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3c64884aacf.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_37cfd4551094.jpg)

其实我有个疑问就是为什么要用Hadamard矩阵，Hadamard矩阵比起随机正交矩阵的优势在哪儿？作者给出的解释只是说效果好，并且可以用CUDA kernel加速。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_53561a7f80ae.jpg)

https://openreview.net/forum?id=dfqsW38v1X[](https://zhuanlan.zhihu.com/p/12186430182)

为此，Flash Attention的作者Tri Dao实现了可以加速Hadamard矩阵变换的库

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a85f6ca31e5d.jpg)

[](https://link.zhihu.com/?target=https%3A//github.com/Dao-AILab/fast-hadamard-transform)

[NeurIPS2024] [W4A4KV4] [QuaRot: Outlier-Free 4-Bit Inference in Rotated LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2404.00456v1)
[ICLR2024] [SliceGPT: Compress Large Language Models by Deleting Rows and Columns](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.15024%23%3A~%3Atext%3DIn%2520this%2520paper%2520we%2520present%2520SliceGPT%252C%2520a%2520new%2Cmatrix%252C%2520reducing%2520the%2520embedding%2520dimension%2520of%2520the%2520network)
#### SpinQuant [ICLR2025]

SpinQuant在QuaRot的基础上将可以和权重merge的旋转矩阵用Cayley SGD学习，其他在线旋转的矩阵使用Hadamard矩阵

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e8da36e63167.jpg)

> [ICLR2025] [SpinQuant: LLM quantization with learned rotations.](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DogO6DGE6FZ)

#### OSTQ [ICLR2025]

OSTQ则是在SpinQuant的基础上将类似OmniQuant的权重变化矩阵也加了进去一起学习，并且用Top-K KL散度对齐量化输出与全精度输出

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3a14db0d1c69.jpg)

> [ICLR2025] [OstQuant: Refining Large Language Model Quantization with Orthogonal and Scaling Transformations for Better Distribution Fitting.](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DrAcgDBdKnP)

#### DuQuant [NeurIPS2024]

DuQuant认为SmoothQuant这类方法会引入新的Outlier,并且一次旋转变换可能还不足以消除所有的Outlier。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_54bd7d00e928.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ea8218e5811.jpg)

作者的解决方法是先利用一些先验的信息构造旋转矩阵，并采用锯齿形排序的方法将Outlier分散到权重的各个地方进行变换，使得最终旋转出来的权重更加均匀。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bcc8dc7943b3.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5d1c8bdcffe7.jpg)

> [NeurIPS2024] [DuQuant: Distributing Outliers via Dual Transformation Makes Stronger Quantized LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.01721v3)

### 基于LoRA的方法

#### QLoRA [NeurIPS2023]

由于模型量化前后存在量化误差，一个自然的想法就是用LoRA去学习这个量化误差。

QLoRA就是在PTQ的过程中用一个全精度的LoRA矩阵去学这个量化误差。量化时权重采用NF4格式编码。

这么做最大的问题在于模型在推理的时候还是需要和一个全精度的LoRA一起推理，计算全精度模型的加和，没法将LoRA融入到量化的模型里**。本来想用量化的方式加速推理，现在只降低了显存开销。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a42c017babe1.jpg)

L4Q: Parameter Efficient Quantization-Aware Fine-Tuning on Large Language Models**关于NF4数据格式：
标准的INT4量化是将权重映射到线性分布的16个数上，并保存其量化参数（FP16）。在模型推理时根据量化参数（FP16）和保存的INT4的数反量化用于推理。而NF4是利用高斯分布的分位数计算出这16个数不应该是线性分布的，而是越靠近0分布越密集，越远离0分布越稀疏，这和实际模型的权重分布类似。所以说理论上讲NF4数据格式更优。但是由于INT4可以在硬件端实现加速，而NF4没有硬件加速，目前只是通过查表的方式实现<strong>，所以性能不是最优的。此外，[Llama.cpp](https://link.zhihu.com/?target=https%3A//github.com/ggerganov/llama.cpp)里</strong>IQ系列<strong>量化的实现其实也是类似NF4这种非均匀的编码。</strong>还有一篇论文指出NF4不是最优的，感兴趣可以看看：
[NF4 Isn't Information Theoretically Optimal (and that's Good)](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2306.06965)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e6362cdc6d8b.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_450985f1fe71.jpg)

#### QALoRA [ICLR2024]

前面提到，QLoRA仅仅考虑训练时候的资源，没有考虑推理，且NF4类型的数据不支持硬件加速。QLoRA直接用LoRA补偿量化损失，但是LoRA是FP16的，这意味着模型在推理的时候仍然需要反量化成FP16与LoRA进行计算。实际部署仍然需要再次PTQ量化成INT4，这又会导致显著的精度损失。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c2027e0ab454.jpg)

注意到量化参数其实是全精度（FP16）的，并且只要是线性量化，都需要将量化后的参数反量化（De-quantize)回FP16得到 x_f , x_f=s(x_q-z) ,其中 s 和 z 都是FP16的量化参数。有没有办法能将LoRA融合到量化参数中？这样就不需要单独存储FP16的LoRA分支？

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dc4ffa7272aa.jpg)

以非对称量化为例，https://blog.csdn.net/weixin_45116099/article/details/136682407注意到LoRA是直接和权重矩阵做线性的加法运算， x_q 和 z 也是做线性的运算，那么是不是可以将LoRA参数融合到 z 里？

量化参数 z 的维度和LoRA的维度是不匹配的。如果是per- tensor量化，那么一层的权重只有一个量化参数，不可能加一个1 \times 1大小的LoRA；如果是权重per-channel+激活per-token的量化，那么一层的权重对应channel数量或者输入token数量的量化参数，这个LoRA矩阵对应的维度应该是一维的张量，不可能加一个1 \times n大小的LoRA；如果是per-group量化，可以将权重分成一个个组，每一组对应一个量化参数。假设分成了m \times n个组，那么就有m \times n个量化参数 z ，这样只需要加一个m \times n的LoRA矩阵即可。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9f28a129c504.jpg)

https://lilianweng.github.io/posts/2023-01-10-inference-optimization/下一个问题是，LoRA的维度变小了，假设从 D_{out}\times D_{in} 变成了 D_{out}\times L ，  D_{in}//L  是分组的大小， L 是分组数量。怎么训练LoRA呢？作者给的方法是用一个平均池化操作得到一个中间变量矩阵 QA ，原来 W=W_0+BA 变成了 W=W_0+QA \times BA 。其中 A 矩阵的维度变小了，使得 BA 大小与模型权重维度不匹配，故加了这么一个中间变量 QA 把维度给升上去。

QALoRA虽然使得LoRA可以合并到量化参数中，但是由于LoRA变小了，其实性能提升比较有限。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c9e852e718f9.jpg)

#### CBQ [ICLR2025]

AdaRound学习参数矩阵V使得并且让 \Delta_W 接近0或1来学习权重向上舍入还是向下舍入，CBQ则是将V替换成了LoRA矩阵来降低LLM用Rounding方式的量化开销

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_37277cc0ca32.jpg)

值得注意的是，在重构损失的时候使用滑动窗口形式一起优化相邻的block块

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0838c0153740.jpg)

> [ICLR2025] [CBQ: Cross-Block Quantization for Large Language Models.](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DeW4yh6HKz4)

基于LoRA的量化方法非常多，这里仅例举两例

> [ICML2024] Accurate LoRA-Finetuning Quantization of LLMs via Information Retention. 
[ICLR2024] LQ-LoRA: Low-rank plus Quantized Matrix Decomposition for Efficient Language Model Finetuning.
[NeurIPS2024] LoQT: Low-Rank Adapters for Quantized Pretraining.
[ICML2024] LQER: Low-Rank Quantization Error Reconstruction for LLMs.
[EMNLP Findings 2024] RoLoRA: Fine-tuning Rotated Outlier-free LLMs for Effective Weight-Activation Quantization.
[arXiv] Low-Rank Quantization-Aware Training for LLMs.

### 基于Attention Sink的量化方法

这类方法比较就没那么可解释了，主要还是源于这么一个现象：在Transformer模型的输入前加入可学习的"prefix token"或者叫"register token"，这些token就能吸收多余的注意力，也就是说量化激活值或者KV-Cache的时候把这些token去掉，剩下的值就更容易量化了。这个方法的问题在于你加了可学习的"prefix token"或者叫"register token"后如果不在下游数据集上微调的话，这些token可能会对性能起副作用，所以找个好的前缀是比较重要的。

PrefixQuant不学习这个"prefix token"，而是将大于设定阈值的outlier token填充到KV-Cache前，这些token一般是". \n [BOS]"等特殊符号。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8eb5a486beb4.jpg)

Prefixing Attention Sinks can Mitigate Activation Outliers for Large Language Model Quantization.![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bf8d42d1ea5f.jpg)

PrefixQuant: Static Quantization Beats Dynamic through Prefixed Outliers in LLMs![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e057d8bbc682.jpg)

Vision Transformers Need Registers.代表性的论文有如下这些，这里就不解释了，我上一篇笔记就是讲这个的。

ABQ-LLM则是另一种思路，通过KL散度使attention sink量化前后的分布一致来保证量化的性能。

> [ICLR2024] [Vision Transformers Need Registers](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3D2dnO3LLiJ1).
[COLM2024] [Massive Activations in Large Language Models.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.17762v2)
[EMNLP2024] [Prefixing Attention Sinks can Mitigate Activation Outliers for Large Language Model Quantization.](https://link.zhihu.com/?target=https%3A//aclanthology.org/2024.emnlp-main.134)
[ACL Findings 2024] [IntactKV: Improving Large Language Model Quantization by Keeping Pivot Tokens Intact](https://link.zhihu.com/?target=https%3A//aclanthology.org/2024.findings-acl.460).
[arXiv 2024] [PrefixQuant: Static Quantization Beats Dynamic through Prefixed Outliers in LLMs ](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2410.05265)
[ICLR2025*] [When Attention Sink Emerges in Language Models: An Empirical View.](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3D78Nn4QJTEN)
[arXiv2024] [ABQ-LLM: Arbitrary-Bit Quantized Inference Acceleration for Large Language Models.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2408.08554v2)

### KV-Cache 量化方法

> 对于长文本生成任务，KV-Cache的开销是推理的内存瓶颈

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_853fd45222ab.jpg)

KVQuant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization.> [一文读懂KVCache - 知乎](https://zhuanlan.zhihu.com/p/686183300)

#### KIVI [ICML2024] 

作者发现在KV-Cache中，Key上有更多Channel-wise的Outlier，而Value上Outlier较少

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5dca1c7ca37f.jpg)

所以很自然地想到Key做Per-Channel量化而Value做Per-token的量化

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2902e1dfd609.jpg)

[ICML2024] [KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.02750v2)
#### KVQuant [NeurIPS2024]

KVQuant则是进一步观察到Key-Cache在RoPE前后呈现不同的Outlier模式，而Value-Cache则没有明显的Outlier。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9a579f839335.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_09fd6181bf29.jpg)

[NeurIPS2024] [KVQuant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.18079v5)
#### ZipCache [NeurIPS2024]

1.Group-wise量化效果更好，但是量化的开销要更大。Token-wise的量化开销更小，但是效果较差。

<strong>2.先前的KV-Cache压缩方法没有有效地识别出重要的token，例如基于attention score去判断做KV-Cache稀疏。</strong>

于是作者针对第一个问题，提出了通道可分离的token-wise量化，相对于Group-wise量化减少了量化参数的同时提升了量化的效果。

针对第二个问题，对attention score做了归一化，并根据归一化后的注意力分数为分数高的分配更多比特数，分数低的分配更少比特数，做了混合精度量化处理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_44fc50464bdb.jpg)

[NeurIPS2024] [ZipCache: Accurate and Efficient KV Cache Quantization with Salient Token Identification](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.14256v1).
### MoE 量化方法

#### QMoE [MLSys2024] 

MoE模型的量化特点是MoE的专家只在特定输入下会被激活。**也就是说，对于激活值量化而言，如果专家数量很多则需要大量的校准数据才能保证所有专家都被激活。

此外，MoE层参数量占比较高，且有些模型拥有上千专家。类似GPTQ等逐层量化方法对GPU的利用率较低。同时维持大量专家的激活需要更大的内存开销。

解决上面两个问题感觉还是偏System一点，QMoE做的也是偏System方面的优化：比如事先存储token隐藏层的状态；Lazy Weight Fetch；对专家进行分组方便进行类似batch GPTQ算法的量化；鲁棒性优化：如设置Token数量限制避免有些专家输入过多Token导致OOM；有极少数的层Hessians矩阵不可逆，则跳过GPTQ，改用RTN。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_80c3feff4f7d.jpg)

[MLSys2024] [QMoE: Practical Sub-1-Bit Compression of Trillion-Parameter Models.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2310.16795v1)
### Scaling Laws for Precision

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5ca7c1a6f39d.jpg)

主要结论，引用 [白话版Scaling Laws for Precision 解读 ](https://zhuanlan.zhihu.com/p/6848989432)

> 训练数据量 D 越大,PTQ带来的损失越大(正相关)，参数量 N 越大,PTQ带来的损失越小(负相关)，量化后的精度 P_{post} 越低,损失增加越多(负指数关系).
权重、激活值和KV-Cache的量化效果是独立且可乘的.
如果你知道模型最终需要被量化到很低的精度(比如4bit)，那么在训练时就使用相对较低的精度(比如8bit)可能比使用高精度(比如16bit)更好，因为这样可以让模型在训练过程中就适应量化噪声。
假设你的计算预算是固定的，希望训练一个模型，有两种选择：1.使用 16-bit 精度训练一个 35B 参数量的模型；2.使用 8-bit 精度训练一个 70B 参数量的模型。根据论文的发现，第二种方案可能更优<strong>，因为增加的参数量带来的性能提升超过了精度降低带来的损失.</strong>[ICLR2025*] [Scaling Laws for Precision.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.04330v1)

#### Best Practice: DeepSeek V3

值得注意的是，DeepSeek V3使用了FP8精度进行训练，训了一个671B的MoE模型，在节省训练开销的同时达到了开源模型的SOTA，这个做法可能会是**未来一段时间训练LLM的普遍做法。

[](https://zhuanlan.zhihu.com/p/15640684557)

对于LLM PTQ来说，如果这种方法成为普遍做法，那么有一些PTQ量化方法就成为历史了，因为你拿到的就是一个FP8的模型，未来可能会更低。再进一步，如果未来像Pytorch你训练模型的时候默认训练就是FP4或者INT4之类的格式，并且效果还能和之前FP16性能相当，PTQ量化是否就完成了其历史使命了？

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2cae7264802d.jpg)

DeepSeek-V3 Technical Report. ![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bc460b1275c4.jpg)

DeepSeek-V3 Technical Report. **[deepseek-ai/DeepSeek-V3 (github.com)](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepSeek-V3)
### 基于LookUp Table (LUT)/Vector Quantization的方法

Vector Quantization概念在图像生成领域如VQVAE也有广泛应用，量化用到的所谓旋转技巧也被迁移过去，并且效果还不错，当然我并不了解图像生成。

> [NeurIPS2017] [Neural Discrete Representation Learning.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1711.00937)
[ICLR2025*] [Restructuring Vector Quantization with the Rotation Trick.](https://link.zhihu.com/?target=https%3A//openreview.net/forum%3Fid%3DGMwRl2e9Y1)

所谓LUT方法，和前面方法的最大区别是映射关系的转变。因为现实模型的权重矩阵不可能是均匀分布的，能接近高斯分布就算比较好量化的。有相当大的一部分权重是“聚集”在一起的，故考虑将这些权重聚类，用一个聚类中心来映射这些权重，保存聚类中心（FP16)和聚类索引(INT）即可。当我们需要推理时，索引Table或者说Vector里的FP16的值进行运算。这是一种理论上更优的压缩方式。

偷个懒

[](https://zhuanlan.zhihu.com/p/15335162833)

> [ICML2024] [Extreme Compression of Large Language Models via Additive Quantization.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2401.06118v2)
[ICMLW2024] [GPTVQ: The Blessing of Dimensionality for LLM Quantization.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.15319v1)
[ICML2024] [QuIP#: Even Better LLM Quantization with Hadamard Incoherence and Lattice Codebooks.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2402.04396)
[EMNLP2024] [VPTQ: Extreme Low-bit Vector Post-Training Quantization for Large Language Models.](https://link.zhihu.com/?target=https%3A//aclanthology.org/2024.emnlp-main.467)
[NeurIPS2024] [QTIP: Quantization with Trellises and Incoherence Processing.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2406.11235v3)
[NeurIPS2024] [PV-Tuning: Beyond Straight-Through Estimation for Extreme LLM Compression.](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.14852v2)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d965ef76717f.jpg)

[](https://zhuanlan.zhihu.com/p/680567656)