---
title: "语义分割中的Attention和低秩重建"
date: "2019-08-16 00:00:00"
updated: "2019-08-16 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/语义分割中的Attention和低秩重建/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/77834369"
---


转载请私信或邮件（ethanlee@pku.edu.cn）

本文总结近两年语义分割领域对 attention 和“低秩”重建机制的探索，并介绍[笔者](https://link.zhihu.com/?target=https%3A//xialipku.github.io/)被 ICCV 2019 接收为 Oral 的工作：[Expectation-Maximization Attention Networks for Semantic Segmentation](https://link.zhihu.com/?target=https%3A//xialipku.github.io/publication/expectation-maximization-attention-networks-for-semantic-segmentation/)（代码已开源：[https://github.com/XiaLiPKU/EMANet](https://link.zhihu.com/?target=https%3A//github.com/XiaLiPKU/EMANet)）。笔者阅读有限，如有文献遗漏，敬请在知乎补充。注：本文中的 attention 仅指 <strong>self-attention</strong>，不涉及 soft-attention。

Attention 机制继在 NLP 领域取得主导地位[1]之后，近两年在 CV 领域也开始独领风骚。率先将之引入的是 Kaiming He 组的 Nonlocal[2]。此后层出不穷的文章，引发了一波研究attention机制的热潮。仅2018年，在语义分割领域就有多篇高影响力文章出炉，如 PSANet[3]，DANet[4]，OCNet[5]，CCNet[6]，以及今年的Local Relation Net[7]。此外，针对 Attention 数学形式的优化，又衍生出A2Net[8]，CGNL[9]。而 A2Net 又开启了本人称之为“低秩”重建的探索，同一时期的SGR[10]，Beyonds Grids[11]，GloRe[12]，LatentGNN[13] 都可以此归类。上述四文皆包含如下三步：1.像素到语义节点映射 2.语义节点间推理 3.节点向像素反映射。其中，step 2的意义尚未有对比实验验证，目前来看，step 1 & 3 构成的对像素特征的低秩重建发挥了关键作用。关于如何映射和反映射，又有了APCNet[14] 和笔者的 EMANet[15] 等相关工作。

Nonlocal
Nonlocal[2]中的核心操作为：

$$\mathbf{y}_i = \frac {1} {C \left( \mathbf{x} \right)} \sum_{\forall j} f \left( \mathbf{x}_i, \mathbf{x}_j \right) g \left( \mathbf{x}_j \right)  \tag{1}$$


其中 
$\mathbf{x}_i \in R^C, 1 \leq i \leq N$ ， 
$N$ 是像素个数， 
$C$ 是像素特征维度（通道数）， 
$f$ 计算 
$\mathbf{x}_i$ 和 
$\mathbf{x}_j$ 之间的相关度（或称“能量”）， 
$g$ 对 
$\mathbf{x}_j$ 进行变换。可以看作对 
$g \left( \mathbf{x}_j \right)$ 的加权平均得到 
$\mathbf{y}_i$ ，作为对 
$\mathbf{x}_i$ 的重构，这里权重为 
$\frac{1}{C\left( \mathbf{x} \right)} f \left( \mathbf{x}_i, \mathbf{x}_j \right)$ 。

关于 
$f$ 和 
$g$ 的选择，作者列出了多个选项，并最终选择了

$$\mathbf{y} = \mathit{softmax} \left( \mathbf{x}^T W_{\theta}^T W_{\phi} \mathbf{x} \right) \left( \mathbf{x}^T W_{\sigma}^T \right) \tag{2}$$


的形式，其中 
$\theta, \phi, \sigma$ 分别对应 NLP Transformer 里的 query，key 和 value。此外， 
$\mathbf{y}$ 经过 
$1 \times 1$ 卷积后和 
$\mathbf{x}$ 相加，作为 Non-local 模块的输出。最后结构图如下：

![](https://picx.zhimg.com/v2-9430ce502121aaa8251a3356021646cd_r.jpg)Non-local Block其实，这里 
$f$ 和 
$g$ 的具体选择，对效果影响不大。在笔者做过的语义分割实验中，query和key共享，节省一些参数，并且这样计算出的 
$f \in R^{N \times N}$ 是个对称矩阵。甚至可以考虑将
$\theta, \phi, \sigma$ 转换省略，直接用 
$\mathbf{x}$ 本身计算，而把 
$1\times 1$ 卷积放在模块之前之后，这样的效果也不逊色。当然，不同的任务应该对应于不同的最优选项。今年 arxiv 有篇文章[16]详细对比分析了这些细节在不同任务中的影响。笔者认为此处最关键的是加权平均，而非
$\theta, \phi, \sigma$ 转换。

这里 
$f$ 计算时，只考虑了像素的特征，而没有考虑相对位置。倘若也将像素坐标位置 
$\left( x, y\right)$ 考虑进来，其实就是全图版的 MeanShift Filter，一种经典的保边滤波算法。Nonlocal 还可以溯源到经典的 Non-local means 和 BM3D。其功效也来源于此，即高维 feature map里存在大量的冗余信息，该类算法可以消除大量噪音。Kaiming 组的另一篇文章[17]分析了 Nonlocal 对模型鲁棒性的提升，考虑到上述的去噪效果，这个结论是显而易见的。效果如下：

![](https://picx.zhimg.com/v2-c828766d165785fea8549789928abca7_r.jpg)a. 原图  b. Feature map  c. Feature map after Nonlocal
Other Attention Models
PSANet[3]和 Nonlocal 最大的区别在于，相关度矩阵 
$f$ 的计算。对于像素 
$i$ ，其相关度向量 
$f \left( \mathbf{x}_i, \mathbf{x} \right)$ ，通过施加在 
$\mathbf{x}_i$ 上的两个 
$1\times 1$ 卷积得到，即由 
$f \left( \mathbf{x}_i, \mathbf{x} \right)$ 变为 
$f \left( \mathbf{x}_i \right)$ ，只和 query 及相对位置相关。此外，PSANet 包含两路 attention，相当于transformer中的两个head。两路分别起到 collect 和distribute 的作用。

![](https://pic4.zhimg.com/v2-408cca2d813497d5952ea0e0b49642db_r.jpg)而 DANet[4]，是把 Nonlocal 操作视为 spatial attention，以此引出了channel attention，两路融合。OCNet[5]，则是将 object context (spatial attention) 和卷积强强联合，分别捕捉全局和局部信息，并在多个数据集上取得很高的精度。

Nonlocal对于每个 
$\mathbf{y}_i$ 的计算，都要在全图上进行，因此复杂度为 
$O \left( N^2 C\right)$ 。CCNet[6]将全图计算分解为两步，一步是按行计算，一步是按列计算。类比于将矩阵 
$M \in R^{m \times n}$ 分解为 
$P \times Q, P \in R^{m\times 1}, Q \in R^{1 \times n}$ 。因此CCNet复杂度为 
$O \left( N\sqrt{N}C \right)$ 。

![](https://pic3.zhimg.com/v2-cfc933feccd3282fea9482b210c7c382_r.jpg)PKU兄弟实验室的ISA[18]也是将attention map的全图计算分解为两步：第一步长距离attention，第二步短距离。中间夹着一步permute操作。其实类似组卷积-shuffle-组卷积的过程，思路上顺承IGCV[19]，其复杂度也是 
$O \left( N\sqrt{N}C \right)$。

![](https://picx.zhimg.com/v2-82e1e45368a0d9b6126b2c3f2137032b_r.jpg)ISAOxford的DGMN[20]则通过MC采样，使每个像素计算attention所需的参考像素从 
$N$ 降为 
$K, K \ll N$ 。此外，采样过程可导，可以和网络同步学习，且 
$K$ 个参考像素各自对应不同的变换 
$g$ 。DGMN把复杂度降为 
$O \left( NKC \right)$ ，且精度超过Nonlocal。

![](https://pic4.zhimg.com/v2-560233aee6bb4fb7eea433239d1ac31d_r.jpg)DGMN另一种减少计算量的方法，是将 attention 的全图计算改为窗口内计算。MeanShift 若限制窗口大小，便是 Bilateral Filter，即每个像素的特征，更新为邻域内其他像素的加权平均。权重由特征相似度和空间距离计算而来。而 MeanShift 也被证明等价于迭代至收敛的Bilateral Filter[21]。

MSRA 的 Local Relation Net[7]设计了类似 Bilateral Filter 的操作，在特征相关度计算上使用了标准的 query，key，value 三元组，在空间相关度上设计了Geometry Prior。并且大胆地用这一算子替代了 
$3\times 3$ 卷积。其节省参数的同时，还具有旋转等变性。整个结构下来有 Transformer 的感觉，即不用 RNN，CNN来收集 context 信息，而是用 attention 来做。至于为什么起效，笔者更想归根到 Bilateral Filter 本身的效果，即保边滤波，起到了保持类间方差的同时，减少类内方差的效果。

![](https://picx.zhimg.com/v2-0a43afb0ed3829fa1f6629f5b06b83f7_r.jpg)MMLab 的 CARAFE[22]，用来进行特征上采样。其计算方式也是用窗口内像素特征的特征加权平均。其特殊之处在于，用于加权的权重是学习出来的，通过对特征变换、pixelshuffle上采样和通道归一化得到。

![](https://pic4.zhimg.com/v2-40153d32846476ae3263542ecae334d7_r.jpg)其实关于选择 global 还是 local 的问题，NLP 领域已经有好多研究，详见 [@苏剑林](https://www.zhihu.com/people/ba2e8e5e459263c8074c6a50cd2763a4) 的博文 [为节约而生：从标准Attention到稀疏Attention](https://link.zhihu.com/?target=https%3A//kexue.fm/archives/6853)。两个领域的研究，其实都在做类似的事情。

注释：本节所提及文章各有其出发点和独到之处，这里仅简单统一到一个框架下，并总结共通点。具体分析未免有缺失和差池，各文章精妙之处，还需参考其他博文。

A2Net and CGNL
NUS 的 A2Net[8] 和 百度的 CGNL[9] 另辟蹊径，从另一个角度优化了 Nonlocal 的复杂度。

Nonlocal 高昂的复杂度 
$O \left( N^2 C\right)$成为制约其应用的关键瓶颈。我们可以重新审视下公式(2)

$$\mathbf{y} = \mathit{softmax} \left( \mathbf{x}^T W_{\theta}^T W_{\phi} \mathbf{x} \right) \left(  W_{\sigma} \mathbf{x} \right)^T = \mathit{softmax} \left( \theta \left( \mathbf{x} \right)^T  \phi \left( \mathbf{x} \right)\right)  \sigma \left( \mathbf{x} \right)^T \tag{3}$$


其中 
$\theta \left( \mathbf{x} \right)^T \in R^{N \times C}$， 
$\phi \left( \mathbf{x} \right) \in R^{C \times N}$， 
$\sigma \left( \mathbf{x} \right)^T \in R^{N \times C}$。因此，两步矩阵乘法计算量都是 
$O \left( N^2C \right)$。使用下乘法结合律，先算后两者的乘积，便可以得到 
$O \left( NC^2 \right)$ 的复杂度。由于 
$C \ll N$，复杂度减少了整整一个量级。再加入 
$\mathit{softmax}$，便可以得到：

$$\mathbf{y} = \mathit{softmax} \left( W_{\theta}\mathbf{x} \right)^T \left[ \mathit{softmax} \left( W_{\phi} \mathbf{x} \right) \left(  W_{\sigma} \mathbf{x} \right)^T \right] = \mathit{softmax} \left( \theta \left( \mathbf{x} \right) \right)^T \left[ \mathit{softmax} \left( \phi \left( \mathbf{x} \right)\right)  \sigma \left( \mathbf{x} \right)^T \right] \tag{4}$$


由于 
$\mathit{softmax}$ 的原因，两式并不完全等价。但是对于 deep learning 来说，两者的 capacity 是近似的。其实，一般地， 
$\theta \left( \mathbf{x}_i \right)$ 和 
$\phi \left( \mathbf{x}_i \right)$ 的维度被设定为小于 
$\sigma \left( \mathbf{x}_i \right)$ 的，如前两者64，后者512。这里我们将前者的维度记为 
$K$ 。则 Nonlocal 和 A2Net 复杂度分别为 
$O \left( N^2C + N^2K\right)$ 和 
$O \left( NCK\right)$ 。

![](https://pic1.zhimg.com/v2-a27074fb363d0d3a7641e8f70a702922_r.jpg)那么，如何从直觉上理解公式 (4) 呢？ 
$\left[ \cdot \right]$ 里得到的是一个 
$K\times C$ 的矩阵，可以看做是 
$K$ 个描述子，表达整个 feature map 中的关键概念。而 
$\mathit{softmax} \left( \phi \left( \mathbf{x} \right)\right) \in R^{K \times N}$表示的是从 
$N$ 个像素到 
$K$ 个描述子的映射关系，可以看作像素特征加权平均得到了描述子，权重就是这个映射矩阵。 
$\mathit{softmax} \left( \theta \left( \mathbf{x} \right) \right)^T$ 则反之，作为权重，将描述子加权平均，得到重构后的像素特征。

GloRe and so on
在 A2Net 基础上，Yunpeng Chen 继续做出了 GloRe[12]。想比于 A2Net，GloRe 在映射 (
$N\to K$ ) 和反映射  (
$K \to N$ ) 之间插入了一步 GCN 的操作，使 
$K \times C$ 的描述子矩阵内部交互和更新。GCN 的具体实现是两步 
$1\times 1$ 卷积。此外，作者发现 
$\theta$ 和 
$\phi$ 其实可以共享，即下图中的B，结论和上文中本人所言 query 和 key  共享一致。

![](https://pic3.zhimg.com/v2-3e477fcbad5d095bfea1111a7cc79af0_r.jpg)其实，和 GloRe 同一时期的相关工作还有 SGR[10], Beyonds Grids[11] 和 LatenGNN[13]。它们都采取三步走的策略，即映射、GCN 和反映射。他们的区别在于每一步的具体操作。

![](https://pic2.zhimg.com/v2-e35a35f7ceab5eeea8dd404030d952bd_r.jpg)四篇文章在 GCN 步骤各有设计。不过，目前为止，没有看到任何公开的 ablation study 证明第二步 GCN 有效果，自己复现的部分实验，也没有跑出 GCN 有增益的结果。所以，只能暂且认为关键还是在于映射和反映射。

那么，映射和反映射，为何能表现突出呢？这里只说一下自己对语义分割这个任务的分析。我们用来抽取 Feature 用的 ResNet，在 ImageNet 千类数据集上训练，因此特征维度至少 1000 维。而分割问题少则 20 类左右，多也不超过几百类。使用过千维的特征，显然是过参数化了。对高维数据分类是低效的，因为高维空间中分类边界过于复杂。而映射反映射的流程，其实是对特征的一个低秩重构，使得高维空间中的特征重新分布到低维流形上，便于后续的分类。其实，A2Net 在 ImageNet 上也证明了自己的价值，这说明不只是分割问题合适，类似的一系列任务，都适用这种映射-反映射模块。

上述的几篇文章，映射和反映射矩阵，多是通过 
$1\times 1$ 卷积学习到的。其实，最常见的池化-上采样，也属于一种超级简化的映射-反映射范式。PSPNet 中的 PPM 和 DeeplabV3 中的 GAP 带来的效益，也可由这个角度进行一定的解释。SIAT-MMLAB 的 APCNet[14]，也属于这一范式的一个具体结构。其 ACM 模块的映射步骤用池化，反映射用学习到的反映射矩阵 (Global-guided Local Affinity)。此外，APCNet 和上述的 Beyonds Grid 都用了多路并行，每路用不同的 
$K$ ，来进行不同程度的稀疏重建。

![](https://pic1.zhimg.com/v2-9a7818a396a766000bc35c197b554888_r.jpg)最近放出来的华科的ANNN[23]，也对如何降低Nonlocal的计算量做出了思考。其把 
$(N\times C) \times (C\times N) \times (N\times C)$ 降解为 
$(N\times C) \times (C\times S) \times (S\times C)，S\ll N$ 。从本文统一的角度分析，即为通过pyramid pooling得到描述子 
$(S\times C)$ , 反映射矩阵用特征图和描述子的内积+归一化得到。笔者猜想，也可以像 APCNet 用多路，每路只用一级pooling，不过倘若按猜想这样作的话，和 APCNet 就仅仅在如何计算反映射矩阵上有区别了。Pyrmid pooling 得到的描述子，定然是要强于

![](https://pic1.zhimg.com/v2-457b9ac7265ed910f84328db9251b3c6_r.jpg)
EMANet
本文认为，映射的关键，在于寻找一组“最合适”的描述子，即论文中的“基”。这组基最好具有如下的几条性质：1. 具有代表性 2. 数量少 3. 互不相似。性质1能保证重构后的 feature map 能够最大限度地还原有效信息；性质2则可以保证重构的低秩性，使重构后的特征处在高维空间中的低维流形中；性质3则是在性质2的约束下，尽可能达到性质1的保证。使用池化，即简单下采样的，得到的基充分满足性质2；但互相之间仍十分相似，因此性质3不满足；小物体下采样后可能会信息丢失，因此性质1也仅仅能对大物体满足。

笔者被ICCV 2019收录为Oral的论文EMANet[24]，提出了用EM算法来求解映射和反映射。EM算法用于求解隐变量模型的最大似然解。这里把隐变量视为映射矩阵，模型参数即为 
$K$ 个描述子。E步更新映射矩阵 
$\mathbf{Z}$ ，M步更新描述子 
$\bm{\mu}$ 。 
$T$ 次迭代后，用映射矩阵的转置（以及归一化）作为反映射矩阵，重构特征图。EM本身保证收敛到似然函数的局部最大值，因此EM算法迭代而出的描述子和映射关系，相对于简单地用网络学习到的，更能保证满足性质1；性质2可以通过设置较小的 
$K$ 来满足；而性质3，则可通过良好的描述子迭代初始化来做到。EMANet的解读见笔者的另一篇文章：[期望最大化注意力网络 EMANet 详解](https://zhuanlan.zhihu.com/p/78018142)

![](https://pic1.zhimg.com/v2-4c7c15f980c1636ece390eaf08c22f50_r.jpg)此处，我们可以考虑下EMANet和A2Net的关联。将公式(4)摘抄下来：

$$\mathbf{y} = \mathit{softmax} \left( \theta \left( \mathbf{x} \right) \right)^T \left[ \mathit{softmax} \left( \phi \left( \mathbf{x} \right)\right)  \sigma \left( \mathbf{x} \right)^T \right] \tag{8}$$


如果我们将其中的 
$\theta$ 和 
$\phi$ 的参数共享，并将
$W_{\theta}$ 和 
$W_{\phi}$ 记作 
$\bm{\mu}$ 。那么， 
$softmax \left( \phi \left( \mathbf{X} \right) \right)$ 和 
$A_E$ 无异；而 
$\left[ \cdot \right]$ 就相当于 
$A_E$ 和 
$A_M$ 迭代一次。因此，A2-Block可以看作EMAU的特殊例子，它只迭代一次EM，且 
$\bm{\mu}$ 由反向传播来更新。而EMAU迭代 
$T$ 步，用滑动平均来更新 
$\bm{\mu}$ 。

在实验中，将Nonlocal、A2Net和EMANet中的模块在PASCAL VOC上作简单的对比实验。Nonlocal和A2Net分别达到 77.78%和77.34%的分数，而EMANet仅迭代一次时分数为77.34%，三者无显著差异，符合上文对Nonlocal和A2Net的分析和对比。而EMANet在迭代多次时，性能可以有显著的提升。

总结
本文抛开glocal context的观点，重新从传统算法的角度出发，对上述文章作了重新的思考总结。回顾而来，所谓最新的成果，不过是站在了先贤的肩膀上，在深度学习的形式上进行了探索。追本溯源，笔者本人也不过是经典算法EM的搬运工。借此，向鼎力帮助我的三位师兄（[Zhisheng Zhong](https://link.zhihu.com/?target=https%3A//zzs1994.github.io/)，[Jianlong Wu](https://link.zhihu.com/?target=https%3A//jlwu1992.github.io/)和[Yibo Yang](https://link.zhihu.com/?target=https%3A//scholar.google.com/citations%3Fuser%3DDxXXnCcAAAAJ)）和两位导师（[Zhouchen Lin](https://link.zhihu.com/?target=https%3A//scholar.google.com.hk/citations%3Fuser%3DTanjFwoAAAAJ), [Hong Liu](https://link.zhihu.com/?target=https%3A//scholar.google.com/citations%3Fuser%3D4CQKG8oAAAAJ)）致敬。感谢[@Qijie](https://www.zhihu.com/people/c53e472f5daa5b82ec880365dba3214a)、[@大大拉头](https://www.zhihu.com/people/00fe84b2e496cf6cebbad7b306dbc245)的仔细审稿。还要感谢《EM算法的九层境界》的作者 [@史博](https://www.zhihu.com/people/7fe5b02d7ca9cb0fe9b83ea36bdfb72f)和科学空间 [@苏剑林](https://www.zhihu.com/people/ba2e8e5e459263c8074c6a50cd2763a4)，他们的博文对我有很大的启发。