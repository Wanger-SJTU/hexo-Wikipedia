---
title: "如果你是一位cuda面试官，你会问哪些问题？"
date: 2026-04-21
tags: [知乎]
source: https://www.zhihu.com/question/10951382954/answer/1991904219184263333
---

bigpunch

马甲是暂时的囚笼，思想是永久的野火

​ 关注

该回答已被折叠

现在来面试CUDA岗位的，大致分两类人。一类是只会调库的，以为会写个Pytorch自定义算子就是精通CUDA了。另一类是真的啃过文档，写过算子，甚至手撸过GEMM的。我要找的显然是后者。

我们直接切入正题。

第一块，我会死磕内存模型和数据搬运

别上来就跟我聊什么线程束分歧，那太小儿科了。我会直接给你一段代码，或者画个图，问你数据的流动路径。

很多新人最喜欢谈的就是并行计算，觉得线程越多越快。这完全是外行话。在现代GPU编程里，Compute is cheap, Memory is expensive。这是铁律。所以我第一个问题通常会非常具体：

请描述一下从Global Memory到Shared Memory再到寄存器，数据是如何流动的，以及在Ampere或者Hopper架构下，这中间有哪些新的指令可以用？

这个问题能刷掉一半人。很多人知道有共享内存，但不知道怎么用最高效。我会追问，如果我要从全局内存加载一个矩阵块到共享内存，怎么写才能保证带宽利用率最高？这里我要听到的关键词是合并访问和向量化加载。你得告诉我，如果是float32，你最好用float4或者LDS.128这样的指令，保证一个指令周期搬运更多数据。

紧接着，我会问Bank Conflict。别光跟我背定义，什么32个bank，4字节宽。我会给你一个具体的场景：比如我们要写一个简单的Reduction归约求和，你怎么设计Shared Memory的访问模式来完全避免Bank冲突？如果你跟我说加padding，我会问加多少，为什么加这么多。如果你能聊到在Hopper架构下，利用TMA也就是Tensor Memory Accelerator来彻底解放SM也就是流多处理器的搬运压力，那我会在心里给你加分。

这里推荐大家去啃一下NVIDIA官方的CUDA C++ Programming Guide，特别是Memory Hierarchy那一章。那是圣经，不是看一遍，是看十遍。还有一本神书Programming Massively Parallel Processors，也就是PMPP，虽然厚，但对于理解内存模型非常有帮助。

假设我们在做一个大模型的推理加速，发现有个LayerNorm算子特别慢。Profiling一看，计算单元的利用率很低，但是显存带宽打满了。这时候你怎么办？

小白会说，那我增加并行度。稍微懂点的会说，我看看能不能合并读写。高手会直接说，这是典型的Memory Bound场景，我要看能不能做算子融合，把前后的Element-wise操作跟它融到一起，减少中间数据的读写。或者，能不能用Shfl指令也就是Warp Shuffle指令，在寄存器层面做归约，直接跳过Shared Memory，减少一次访存。

第二块，我会重点考察线程束Warp和执行模型

很多人对CUDA的理解停留在Grid和Block层面。这不够。硬件调度的最小单位是Warp，也就是32个线程。

我会问：Warp Divergence也就是线程束分歧到底为什么会降低性能？在Volta架构引入Independent Thread Scheduling之后，分歧的代价变小了吗？为什么？

这是一个陷阱题。很多老鸟会告诉你分歧很可怕，因为大家要串行执行。但是在新的架构下，每个线程有了独立的PC计数器，情况变得复杂了。虽然硬件上支持了独立调度，但如果你的逻辑还是分歧的，执行单元ALU还是有限的，该慢还是慢。我要听的是你对硬件资源争抢的理解。

接着我会问Latency Hiding也就是延迟隐藏。

这也是一个核心概念。GPU是吞吐导向的设备，不像CPU是延迟导向的。我会问：你需要多少个Active Warps才能把流水线填满，从而掩盖掉全局内存访问的几百个时钟周期的延迟？这个数是怎么算出来的？

这里你要跟我聊Occupancy也就是占用率。一个SM能跑多少个Warp，受限于寄存器数量和Shared Memory大小。如果你写的kernel寄存器用得太多，导致Occupancy上不去，延迟这就藏不住了，性能就会崩。

我见过太多人写kernel，为了图省事，把所有变量都放寄存器，结果编译器一看，寄存器溢出了，给你spill到Local Memory里去了，性能直接脚踝斩。你得懂怎么看SASS汇编，怎么看ncu也就是Nsight Compute的报告，发现寄存器压力过大时，知道怎么去控制寄存器使用量，甚至手动控制生命周期。

第三块，必须聊聊Tensor Core和矩阵乘法

到了2024年，你不懂Tensor Core，就别说自己做CUDA优化。

我会直接问：WMMA API和MMA PTX指令有什么区别？为什么高性能库比如Cutlass都倾向于用PTX指令？

这考察的是你对底层的掌控力。WMMA好用，但是很多细节被驱动屏蔽了。直接写PTX或者用Cutlass封装好的组件，能更精细地控制数据的Layout。

我会让你手写一个GEMM的伪代码框架。不需要具体的指令，但是流程要对。你要展示出Tiling也就是分块的思想。Global到Shared切一次，Shared到Register再切一次。

这里有一个非常硬核的资源推荐：NVIDIA的开源库Cutlass。别光会用，去读它的源码，去读它的Design Doc。那是目前GEMM优化的天花板。如果你能跟我讲清楚Cutlass里的Pipeline Design，也就是它是如何用异步拷贝指令cp.async来做Double Buffer或者Multi-stage Pipeline的，那你基本上就是T6起步了。

我们在优化一个Transformer的Attention算子时，发现用cuBLAS标准库性能不够好，因为输入尺寸比较奇葩，导致Padding浪费了很多计算。这时候如果你懂Tensor Core的底层原理，你就可以手写一个专用的Kernel，利用MMA指令，专门针对这个奇葩尺寸做Tiling，配合Pipeline掩盖读取K和V矩阵的延迟，性能可能直接翻倍。

第四块，大模型时代的必考题：FlashAttention

现在搞AI Infra，FlashAttention是绕不过去的大山。我不会让你背公式，但我会问：

FlashAttention到底快在哪里？它是怎么通过分块计算来减少HBM访问的？

这里你要讲清楚Softmax是怎么拆解的。传统的Attention因为要算Softmax，需要把整个行读完，算max和sum，这导致中间结果矩阵也就是N乘以N的那个矩阵必须写回显存。FlashAttention通过数学上的等价变换，在Shared Memory里分块维护局部max和局部sum，最后再合并。这一进一出，省掉了大量的显存读写。

这一块的逻辑你要是通了，说明你不仅仅是写代码的，你有算法和系统结合的视野。

我会追问：FlashAttention 2相比1做了哪些改进？

如果你能回答出它把更多的非矩阵乘法操作放到了Warps之间去并行，减少了同步开销，或者优化了Warp Partitioning，那你就非常Professional了。

第五块，工具链和Debug能力

只会写代码不会Debug的人，我是不敢要的。GPU Debug简直是噩梦。

我会问：如果你的Kernel跑着跑着出现了Illegal Memory Access，甚至直接把机器搞挂了，你通常怎么定位？

如果你跟我说用printf，我会把你简历放一边。在大规模并行下，printf出来的东西顺序是乱的，而且会改变时序，掩盖Race Condition。

标准的回答应该是用compute-sanitizer。你要熟练使用这个工具来检查越界和竞态。

在这个板块，我也很看重Profiler的使用。我会问：当你拿到一个ncu的报告，你第一眼看哪几个指标？

不要告诉我你看运行时间。你要看SOL也就是Speed Of Light指标。Compute SOL是多少，Memory SOL是多少。如果Compute SOL很高，说明计算单元利用率高，大概率是计算密集型；如果Memory SOL高，那是访存密集型。针对不同的瓶颈，优化策略完全相反。

还有一个很重要的点是Roofline Model。你得会在脑子里构建这个模型。对于一个特定的Kernel，它的算术强度也就是Arithmetic Intensity是多少？它落在Roofline模型的哪个区域？如果不清楚这个，你的优化就是盲人摸象。

第六块，也是最后一块，我会聊聊最新的硬件特性

从Volta到Ampere，再到Hopper，甚至Blackwell，每一代架构都有巨大的变化。

我会问：Hopper架构引入了TMA和WGMMA，这对于我们写算子有什么根本性的改变？

以前我们是SM也就是流多处理器又要管计算又要管搬数，累得半死。现在TMA可以独立在后台搬运数据，SM只管发号施令，然后专心做计算。这就要求我们的编程范式从同步思考转变为异步思考。

如果你能聊到这一层，说明你一直在跟踪最新的技术动态，而不是在吃老本。

除了上面提到的文档和库，我强烈建议关注NVIDIA Developer Blog。那里面的文章质量极高，往往是某个新特性出来后，官方工程师写的第一手解析。还有就是GTC的Talk，每年GTC大会上的那些Deep Dive Session，把PPT下载下来，一页一页啃，比看什么培训班视频强一万倍。

另外，GitHub上有一些非常优秀的个人项目，比如Bierlaire/cuda-tutorial这种，或者知乎上一些大神写的源码解析，都要多看。

所以，如果我是面试官，我看重的不是你能默写多少API，而是：

1. 对内存层级和数据流动的极度敏感。
2. 对硬件资源（寄存器、Shared Memory、Warp）的精细控制。
3. 对Tensor Core和现代矩阵计算指令的熟练掌握。
4. 结合算法（如FlashAttention）进行系统级优化的能力。
5. 科学的Profiling和Debug方法论。

这个行业很卷，没错。但是真正懂到底层，能看着SASS汇编优化代码，能通过调整数据Layout榨出性能的人，依然是凤毛麟角。要做那个能掌控硬件脉搏的架构师。

面试其实就是一场同行之间的切磋。你厉害，你教我；我厉害，我点拨你。只要你底子厚，逻辑通，哪怕有些API名字忘了，我也照样给你发Offer。

阅读全文​
​赞同 67​​2 条评论​116 ​1 ​分享