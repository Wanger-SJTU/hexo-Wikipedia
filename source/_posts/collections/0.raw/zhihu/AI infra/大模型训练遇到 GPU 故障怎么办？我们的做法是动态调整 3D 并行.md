---
title: 大模型训练遇到 GPU 故障怎么办？我们的做法是动态调整 3D 并行
date: "2026-05-11 00:00:00"
updated: "2026-05-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/大模型训练遇到-GPU-故障怎么办-我们的做法是动态调整-3D-并行/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2036192731547035544
---


入坑 AI infra 也有近两年了，最近做了一篇训练容错、弹性调度相关的工作——[ResiHP: Taming LLM Training Failures with Dynamic Hybrid Parallelism](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.06374)，有幸被 HPDC ‘26接收。

![](https://pic2.zhimg.com/v2-3b10232b5c637b89fd83603e6b4bc8c9_r.jpg)在真实训练里，常见的故障大概有两类：

- <strong>fail-stop</strong>：设备直接挂掉，比如 CUDA error、HBM/ECC 错误、网络故障。
- <strong>fail-slow</strong>：设备没有挂掉，但它明显变慢了，比如热降频、带宽抖动，或者内存、网络性能退化。对于混合并行训练来说，一张 GPU 遭遇故障产生的影响，会沿着<strong>TP -> PP -> DP</strong>一路扩散（通信、同步操作），最后影响整个任务。

现有的系统大多聚焦于在DP或者PP维度上处理其中一种故障，这可能会造成一些资源浪费，引发新的负载不均，导致系统不能恢复或者恢复后的吞吐量不高。

我们这篇工作主要做了两件事：

- 用一个 <strong>workload-aware Detector</strong>，分清这次iteration变慢，到底是因为 workload 变了，还是因为设备真的出了故障。
- 用一个 <strong>渐进式 Scheduler</strong>，沿着 <strong>TP、PP、DP</strong> 三个维度动态调整并行策略，把还能用的 GPU 尽量保留下来，把吞吐量尽量稳住。
引子
现在回头看，做什么其实并不是一开始就想得很清楚，只是在摸索中前行。

最开始是 leader 提了一个方向，和 <strong>pipeline 调度自动生成</strong> 有关。我跟着组里的大佬做了大半年，主要负责把生成出来的调度方案真正落到训练框架里，让系统可以比较灵活地执行不同的 pipeline schedule。那段时间做的事情偏工程，但也积累了不少后面能直接用上的东西，尤其是调度模拟和执行这块。

后面是在 2025 年 8 月左右看到了一篇工作 [Adaptra](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2504.19232)。它讨论的核心场景是：相邻 pipeline stage 之间存在很高p2p通信延迟（通信fail-slow导致的），这会导致cascade pipeline bubble，该怎么设计 pipeline 调度，才能尽量消除这些bubble缩短iteration 时间？<strong>作者其实就是在warm-up阶段中给相应的pipeline stage增加forward micro-batch数量，以填充由于fail-slow造成的bubble</strong>。这个场景其实在我们的模拟器中也能非常简单地实现，给指定的相邻 pipeline stage之间增加一个P2P通信延迟参数即可，求解出的调度结果和文中的case几乎完全相同。当然作者还做了其他很多sys方面非常solid的优化，这篇后面也是中了NSDI 26的best paper。 给我的感触就是，很多方法其实已经存在，只是缺少对真实训练场景中一些现象的洞察，从而缺少了应用场景。

再往后，我们顺藤摸瓜找到了 [Greyhound](https://link.zhihu.com/?target=https%3A//www.usenix.org/system/files/atc25-wu-tianyuan.pdf)。这篇工作更系统地分析了 fail-slow 在大模型训练中的表现，也给出了一个很自然的缓解思路：<strong>如果某个 DP 组变慢了，就给它少分一些 micro-batch，给快的 DP 组多分一些，尽量把整体时间拉平</strong>。这个想法很直观，也确实简单有效。但如果在(DP,PP)场景下，某个DP组中的某个pipeline stage出现计算fail-slow拖慢了整个DP组（计算fail-slow不能通过类似Adaptra这种调micro-batch执行顺序去缓解，因为无论怎么调整，计算是无法省的，这个pipeline stage依然是straggler），按照Greyhound方法会把这个DP组中所有pipeline stage上的micro-batch数量统一减少，这样就导致那些正常pipeline stage上的负载变少了，负载增加到了另一个DP组相应的pipeline stage中，这其实会造成新的负载不均，并且这虽然消除了DP组间的负载不均，但原有DP组内的负载不均仍然存在。<strong>总之，在(DP,PP)场景下，根据所有DP组的执行速度，划分不同数量的micro-batch，有些粗粒度，可能会导致新的负载不均。</strong>

![](https://pic2.zhimg.com/v2-864136c77518978e7c14bc0cd1e63cbb_r.jpg)（a）ReCycle的调度会导致DP组之间的负载不均，（b）Greyhound的重新分配不同DP组的micro-batch数量，虽然解决了DP组间的负载不均，但DP组内的负载不均仍然存在。后面在读 [ReCycle](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.14009)时，给了我们在(DP,PP)场景下根据故障状况进行细粒度设计pipeline的一些启发以及方法可行性验证。Recycle是解决传统认知上那种导致设备立即挂掉的故障（fail-stop），利用DP之间参数冗余的特性，可以将那些failed pipeline stage上的负载转移到其他DP组中对应的pipeline stage上执行。既然 fail-stop 的 stage workload 可以转，那对于那些<strong>没有挂掉、但计算速度明显变慢的 stage</strong>，是不是也可以只转移其中一部分 micro-batch？如果可以，那接下来的问题就是：

- 什么时候转？
- 转到哪里？
- 转多少？我们后来做的一件核心事情，就是把原来偏单 pipeline 的调度模拟器，扩展成了一个 <strong>面向 (DP, PP) 的全局调度器</strong>，去求解这个更细粒度的 workload migration 问题。

但只做到这里，我们觉得还是不够。因为再往上看，还有 <strong>TP</strong>。现有很多方法其实默认绕开了 TP，原因也很现实：TP 处理起来更麻烦。如果一个 TP 组里的某个 rank 遇到 fail-stop，你不能简单让它的 DP peer 来接管，因为一个 rank 不可能同时属于两个不同的 TP group。于是最简单的处理方式，就是把整个受影响的 TP group 一起排除掉。这样问题虽然可以重新落回 <strong>(DP, PP)</strong> 层面，但代价是大量健康 GPU 也跟着被浪费了。

所以到最后，我们真正想做的事情就比较明确了：<strong>设计一个能在 3D 并行场景下，同时处理 fail-slow 和 fail-stop 的系统，保持训练不中断并且尽可能地拉回吞吐。</strong>

<strong>检测</strong>
检测这部分我们没有设计太复杂，核心就是一句话：<strong>不能只盯着观测到的 iteration time。</strong>因为在 LLM 训练里，iteration time 本来就会波动。一个很重要的来源就是 sequence length 的变化。即便做了 packing，不同 micro-batch 的真实 attention 计算量也还是会不一样，所以有些 iteration 天生就比别的 iteration 更慢。如果系统一看到时间变长就报警，那误报会很多。所以我们的思路是：<strong>先估计“如果设备是健康的，这一轮本来应该跑多久”，再判断这次变慢到底是不是故障。</strong>实现上，我们会结合 micro-batch 的 sequence packing情况和当前的 pipeline 调度方式，去估计一个“健康情况下的 iteration time”。如果某次变慢只是 workload 更重导致的，它就不会被轻易判成 fail-slow；只有明显偏离这个预测值时，系统才会进一步进入故障验证流程。

![](https://picx.zhimg.com/v2-77d7e93e14e9e6cd9c17c25e09bcad0f_r.jpg)
恢复
<strong>1. TP：尽量保住还健康的设备</strong>

如果一个 TP 组里只有部分设备故障：

- 在剩余设备里挑一个仍然可执行的 TP 子组；
- 尽量保留更多健康设备；
- 同时把组内最慢设备对整体吞吐的拖累也考虑进去。所以我们的目标不是“剩下的卡越多越好”，而是<strong>重组之后这一组的有效吞吐尽量高</strong>。

<strong>2. PP：把 layer 重新分配，缓解慢 stage</strong>

TP 重组之后，由于异构TP组的出现或者fail-slow的影响，不同 pipeline stage 的速度还是可能不一样。这个时候，PP 层面就会出现新的不平衡。

我们的做法是把更少的 layer 分给变慢的 stage，再把多出来的 layer 分给更快的 stage。这样做的目的很直接，就是尽量别让某一个慢 stage 长期卡住整条 pipeline。

<strong>3. DP：按 stage 进度做细粒度 workload migration</strong>

- 持续追踪每个pipeline stage 的执行进度；
- 对于每个pipeline stage，测出所有DP组中当前执行最慢和最快分别在哪个DP组中；
- 在满足显存约束的前提下，把一部分 pending micro-batch 迁移给更快的一侧。这也是我们自己觉得比较核心的一点：<strong>不是按整个 replica 粗粒度迁移 workload，而是按 stage 进度在线地做细粒度迁移。</strong>

![](https://picx.zhimg.com/v2-8eefaff9b691b3e95b5d458406470cdf_r.jpg)
<strong>实现</strong>

- <strong>通信组重建</strong>：故障发生后，动态销毁旧的通信组（communicator），再重建新的并行组（参考[TorchFT](https://link.zhihu.com/?target=https%3A//github.com/meta-pytorch/torchft)）。
- <strong>异构 TP 下的 P2P 优化</strong>：即便重组后相邻 stage 的 TP degree 不一样，也尽量保留 scatter/gather 这类高效通信模式。
- <strong>参数和优化器状态恢复</strong>：在 layer repartition 和 TP reshaping 之后，把参数和 optimizer state 一起迁移或重构，保证训练语义不变（参考[Oobleck](https://link.zhihu.com/?target=https%3A//github.com/SymbioticLab/Oobleck)）。最后，如果你也在做弹性训练系统、混合并行、容错调度，欢迎交流。我们也很期待听到更多来自真实训练环境的问题和反馈。另外也顺便打个小广告，如果有 AI infra相关的实习岗位，也欢迎联系我。

相关链接

- 论文：[https://arxiv.org/abs/2605.06374](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2605.06374)
- Adaptra：[https://arxiv.org/pdf/2504.19232](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2504.19232)
- Greyhound：[https://www.usenix.org/system/files/atc25-wu-tianyuan.pdf](https://link.zhihu.com/?target=https%3A//www.usenix.org/system/files/atc25-wu-tianyuan.pdf)
- ReCycle：[https://arxiv.org/abs/2405.14009](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2405.14009)
- Oobleck：[https://github.com/SymbioticLab/Oobleck](https://link.zhihu.com/?target=https%3A//github.com/SymbioticLab/Oobleck)
- TorchFT：[https://github.com/meta-pytorch/torchft](https://link.zhihu.com/?target=https%3A//github.com/meta-pytorch/torchft)