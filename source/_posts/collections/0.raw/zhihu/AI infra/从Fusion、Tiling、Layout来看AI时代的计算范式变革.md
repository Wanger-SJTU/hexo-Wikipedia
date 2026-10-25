---
title: 从Fusion、Tiling、Layout来看AI时代的计算范式变革
date: "2026-05-08 00:00:00"
updated: "2026-05-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/从Fusion、Tiling、Layout来看AI时代的计算范式变革/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2035814498754372533
---


写在前面
在计算技术演进中，三项看似”编译器优化细节”的技术——Fusion（算子融合）、Tiling（分块优化）与Layout（数据布局）——正在成为定义AI时代计算范式的核心驱动力。过去几十年，通用计算关注的是指令流的高效执行与多任务并发调度；而今天，当GPU主导的张量计算成为主流工作负载时，计算的核心矛盾已从”程序如何使用CPU时间”转向”张量程序如何高效利用异构算力与多层内存”。

这种范式迁移并非渐进式优化所能应对。当瓶颈从FLOPs转向访存带宽，当执行单元从线程转向Kernel/Stream，当内存对象从Page转向Tensor/KV Cache时，系统软件需要重新回答一个根本问题：**如何在有限的片上资源约束下，实现计算效率、内存开销与硬件适配的全局最优？** Fusion、Tiling与Layout正是回答这一问题的三把钥匙。

![](https://pic2.zhimg.com/v2-4200b32636756d5c8b327e6ff31f582d_r.jpg)编译器在AI系统中的资源组织角色——Fusion、Tiling、Layout本质上是对GPU片上资源的系统级管理Fusion、Tiling、Layout并非独立作用，而是形成了一个相互约束、相互增强的优化体系：

**Tiling为Fusion提供可能性**：只有当tile尺寸选择得当，使得中间结果能够驻留在片上时，fusion才能真正起作用。过大的tile导致片上资源不足，被迫spill到HBM，fusion的收益被抵消。

**Layout影响Tiling的有效性**：如果数据布局与tile的访问模式不匹配，即使tile尺寸最优，也会因为non-coalesced access而损失带宽效率。最优的tiling策略必须与layout协同设计。

**Fusion改变Layout的约束**：算子融合改变了数据流的拓扑结构，可能使原本需要的layout转换变得不必要（因为生产者和消费者在同一个kernel内部），或者引入新的layout要求（因为融合后的kernel有新的访问模式）。

这种协同效应解释了为什么现代AI编译器（如XLA、TVM、Triton）都采用联合优化的策略，而非独立处理三个维度：**局部最优的组合往往不是全局最优**。
协同效应：

技术维度对其他技术的约束对其他技术的使能Tiling限制可fusion算子的大小为fusion提供片上空间Fusion改变tiling的资源预算消除layout转换需求Layout影响tiling的访存效率使fusion的数据流更高效本文将以这三大优化技术为核心主线，探讨它们如何共同推动计算范式从传统通用计算向AI专用计算的转变，重点分析其在提升计算效率、降低内存开销和适配新型硬件架构方面的系统性作用。

1. 背景：从CPU到GPU的计算范式迁移

1.1 Linux Kernel
理解AI时代的计算范式变革，首先需要回顾CPU时代的成功经验。Linux Kernel真正伟大之处，不在于其功能齐全，而在于它找到了CPU通用计算时代最稳定的一组资源抽象。CPU时代的核心矛盾是：大量程序并发运行，竞争CPU时间、内存空间、I/O通道和设备访问权。围绕这一矛盾，内核建立了四大核心抽象体系：

**执行抽象（Process/Thread）：** 进程提供资源所有权、隔离边界和故障传播边界；线程提供执行流和调度单元。用户程序通过进程和线程间接使用计算资源。

**内存抽象（Virtual Memory）：** 虚拟内存将页表、缺页处理、共享映射、写时复制等能力统一成稳定框架，使内存从硬件字节阵列转变为可被系统组织的一等对象。

**持久化抽象（File/Socket）：** 文件与Socket将存储设备和网络设备的底层差异折叠为上层可稳定依赖的系统接口。

**硬件抽象（Device Model）：** 通过驱动、设备模型、中断和DMA，程序无需理解硬件细节即可间接使用设备。

![](https://pic4.zhimg.com/v2-0709d3a6908fba545241d832e755f5ad_r.jpg)Linux Kernel四大核心抽象体系——执行、内存、持久化与硬件抽象的分层架构这套抽象延续几十年，是因为它们精准捕获了那个时代最重要的资源和冲突。这也构成理解操作系统的起点：**OS从来不是固定子系统的名字集合，而是围绕主导计算范式建立起来的资源抽象、隔离与调度体系。**

1.2 AI计算：一等对象的根本迁移
然而，AI系统——尤其是GPU主导的大模型训练和推理——关键路径已发生根本性改变。决定系统表现的因素，不再是”进程拿到多少CPU时间片”，而是：计算图如何被lowering、算子如何被fusion、Kernel的tile大小如何选择、数据在HBM/Shared Memory/Register之间如何搬运、多卡之间的collective communication如何与计算重叠、KV cache如何分配复用与回收。

这意味着系统真正操作的对象已不再是process/page/file体系，而是：**tensor、layout、graph、kernel、stream、collective、KV cache、request、session、context。**

![](https://picx.zhimg.com/v2-b4cb27ebd985298376f1d3bdd270fee1_r.jpg)CPU时代与AI时代系统一等对象的全面对比维度CPU时代一等对象AI时代一等对象执行单元Process/ThreadKernel/Stream/Graph内存对象Page/BufferTensor/KV Cache/Activation调度粒度时间片Token/Request/Batch通信抽象Socket/PipeCollective/AllReduce状态管理File DescriptorSession/ContextLinux仍然存在，但许多关键的调度和组织决策已不在其传统”热路径”中。真正决定性能的事情，正在被runtime、compiler、kernel DSL、serving system接管。这不是Linux的失败，而是工作负载变了，主语也变了——而Fusion、Tiling、Layout正是这个新主语下最核心的优化维度。

2. GPU执行栈：新计算范式的硬件基础

2.1 从加速器到复杂计算域
过去将GPU称为accelerator，在当时语境下是准确的——GPU更像被CPU驱动的外设，负责加速特定计算后交回结果。但今天这个描述已明显不足。现代GPU不是简单的”加速设备”，而是一个拥有独立执行模型、内存层次、同步机制和并行结构的**复杂计算域**。

理解这一点对于理解Fusion、Tiling、Layout至关重要：这三大技术之所以能发挥系统级作用，正是因为GPU提供了足够复杂的硬件层次结构供它们优化。

2.2 GPU系统栈的层次结构
从驱动层到runtime，再到compiler和kernel，GPU已形成完整的系统栈：

**驱动层（Driver）：** GPU驱动需处理context、地址空间映射、命令提交、同步原语、设备内存管理、DMA、peer access、中断和错误处理。GPU背后有完整的命令队列体系、异步执行模型和多引擎协同。

**运行时层（Runtime）：** CUDA/HIP runtime负责暴露stream、event、memory allocator、kernel launch、graph execution、异步copy、同步语义等对象。这些对象不只是API层的便利性设计，而是在向用户暴露GPU真正关键的执行原语。

**编译器层（Compiler）：** 这正是Fusion、Tiling、Layout发挥作用的核心战场。编译器不再只是翻译工具，而是决定tensor program如何映射到GPU并行层次与内存层次的系统组件。

![](https://pic2.zhimg.com/v2-aa4d089e0902e644081038beeada4f11_r.jpg)GPU执行栈层次架构——从Framework到Hardware的完整系统栈关键洞察是：**GPU runtime暴露的不是”设备控制接口”，而是”执行组织接口”。** 这为Fusion、Tiling、Layout提供了施展空间，使它们能够直接影响stream调度、显存分配和kernel执行模式。

3. Tiling：片上资源的精细化分配

3.1 超越数学分块的系统视角
在传统应用开发中，tiling被视为简单的矩阵分块操作。但在AI系统中，这个理解已不再成立。Tiling本质上是在**有限片上资源约束下寻找全局最优分配方案**，它通过将大规模张量计算切分为适配硬件层次的小块，实现对GPU存储层次、并行结构和流水线的深度优化。

表面上看，tiling只是将大矩阵切分为小块的数学操作；但从系统视角审视，tile尺寸的选择实际上是一个**多维资源约束下的全局优化问题**。

3.2 Tiling的三维系统分析
**计算效率提升维度：**

Tiling对计算效率的影响首先体现在并行度与Occupancy的平衡上。每个thread block消耗的寄存器数量、shared memory容量，与SM上能同时驻留多少block（即occupancy）形成直接的trade-off。Tile选大了单个block效率高但并行度受限；选小了并行度上去但单block效率下降。

tile的形状和尺寸还决定了warp内线程如何协同工作、warp之间如何划分任务边界。这直接影响到访存请求能否合并（coalescing）、shared memory访问是否会触发bank conflict等底层效率问题。在Tensor Core场景下，tile尺寸还必须对齐MMA（Matrix Multiply-Accumulate）指令的原生分块要求（如16×16×16），否则无法充分利用专用计算单元。

**内存开销优化维度：**

Tiling的核心价值之一在于增加数据在片上的复用，从而减少对HBM的频繁访问。tile大小直接决定了数据在GPU存储层次中的分布——哪些数据能够常驻于寄存器文件实现最快访问，哪些需要暂存于shared memory作为中间缓冲，哪些不得不回落到HBM承受带宽惩罚。

考虑到HBM与Shared Memory存在约10倍的带宽差异，Shared Memory与Register之间又存在数倍差异，正确的tiling策略可以将数据复用最大化。以矩阵乘法为例，合理的tiling可以使每个数据元素在片上被复用O(tile_size)次，而非每次计算都从HBM重新加载。

**硬件适配策略维度：**

不同GPU架构的SM资源配置差异显著。从Volta到Ampere再到Hopper，每代架构的shared memory容量、寄存器文件大小、Tensor Core规格都在变化。Tiling策略必须根据目标硬件动态调整：

- **A100架构**：每SM配备192KB共享内存（可配置），需要更大tile以充分利用
- **H100架构**：引入TMA（Tensor Memory Accelerator），支持异步tile预取，tiling策略需考虑prefetch时机
- **跨代适配**：最优tile尺寸往往需要auto-tuning，在编译时或运行时根据硬件特性搜索
![](https://pic3.zhimg.com/v2-fc9911e761b1ebb33ee601ed7ad87ec0_r.jpg)Tiling资源权衡的系统视角——Tile尺寸选择如何在存储层次、并行模式、硬件占用与流水线重叠四个维度间形成全局约束
3.3 Tiling与传统OS资源管理的同构性
从这个角度重新审视，tiling绝非编译器的局部优化技巧，而是在**有限片上资源约束下寻找全局最优分配方案**。这与传统操作系统管理页缓存、调度I/O队列、分配文件缓冲区的本质逻辑高度同构——区别仅在于管理对象从page/cache line/file buffer变成了tile/register block/shared memory slice/tensor fragment。

tile的切分方式还决定了是否有足够的”时间窗口”让计算与访存、本地计算与跨卡通信实现流水线重叠（overlap），这往往是榨取最后10-20%性能的关键。

4. Fusion：数据流边界的智能重构

4.1 超越”少launch一次kernel”的系统本质
Fusion（算子融合）在表面上是将多个算子合并为一个kernel执行，减少kernel launch开销。但这种理解严重低估了fusion的系统意义。Fusion真正改变的是：中间结果是否materialize、数据是否回写HBM、不同kernel之间的边界是否保留、调度粒度是否改变。换言之，**Fusion实际上在重画运行时的数据流边界和执行边界**。

4.2 Fusion的三维系统分析
**计算效率提升维度：**

每次kernel launch都伴随着CPU-GPU同步开销、kernel参数传递、SM调度初始化等固定代价。在细粒度算子图中（如典型Transformer层包含数十个小算子），launch overhead可能占据显著比例。Fusion通过合并算子，将多次launch压缩为一次，直接减少了这部分开销。

更重要的是，fusion改变了计算的调度粒度。未融合时，每个算子独立调度，可能导致SM利用率的波动；融合后，更大的计算块使得调度器能够更稳定地维持高occupancy。在某些场景下，fusion还能启用原本不可能的优化，如将element-wise操作融入矩阵乘法的epilogue阶段，利用计算单元的空闲周期”免费”完成。

**内存开销优化维度：**

这是fusion最核心的价值所在。在未融合的执行模式下，每个算子的输出都需要materialize到HBM，作为下一个算子的输入。考虑到现代大模型的activation tensor动辄数GB，这种中间结果的频繁读写构成了巨大的带宽压力和显存占用。

Fusion通过消除中间tensor的materialization，使数据能够在片上（register或shared memory）直接传递给下游计算。以Transformer中常见的`Scale → Mask → Softmax`序列为例：未融合时需要3次HBM写入和2次HBM读取；融合后，中间结果完全在片上流转，HBM访问降为1次读取和1次写入，带宽消耗减少约60%。

**硬件适配策略维度：**

Fusion决策需要在多个相互约束的维度间权衡：fuse得越激进，数据局部性越好，但kernel复杂度上升，register压力增大，可能反而降低occupancy；fuse得太保守，则中间结果频繁落盘HBM，带宽成为瓶颈。

不同硬件对fusion的”甜点”也不同：

- **高带宽架构（如H100 HBM3）**：fusion的收益相对降低，因为带宽不再是绝对瓶颈
- **带宽受限架构**：aggressive fusion带来更显著的性能提升
- **Tensor Core优化**：fusion需要保证合并后的kernel仍能充分利用专用计算单元这种trade-off空间的存在，使得fusion不再是一个可以静态最优解的编译问题，而成为一个需要考虑运行时状态的系统决策。

4.3 Fusion模式的类型学
根据融合的算子类型和数据流特征，fusion可分为几种典型模式：

Fusion类型典型场景效率增益来源复杂度挑战Element-wise Fusion激活函数链消除中间tensor寄存器分配Reduction FusionLayerNorm、Softmax减少全局同步并行reduction设计Epilogue FusionGEMM+Bias+ReLU利用计算空闲周期与主计算流水线协调Attention FusionFlashAttention重构数据流拓扑算法级重新设计
5. Layout：访存模式的全局优化

5.1 超越”数据格式选择”的系统视角
Layout不是格式选择题，而是整个系统性能的隐藏主轴。Layout决定访存模式 → 访存模式决定kernel写法 → kernel写法决定launch配置和同步方式 → 进一步影响通信切分、图编译和runtime调度。这种**层层传导的因果链**使得layout成为一个需要全局考量的系统级决策。

5.2 Layout的三维系统分析
**计算效率提升维度：**

GPU的访存效率高度依赖于coalescing——即同一warp内的线程能否在一次memory transaction中访问连续地址。Layout直接决定了数据在内存中的排布方式，进而决定了计算时的访问模式是否能够触发coalescing。

以矩阵存储为例：Row-major layout在按行访问时能够coalesce，但在按列访问时会产生strided access pattern，严重降低带宽利用率。对于需要同时高效访问行和列的算法（如某些attention变体），可能需要采用更复杂的tile-based layout或blocked layout。

Tensor Core对layout有更严格的要求：数据必须按照特定的fragment布局组织，才能被MMA指令高效消费。不符合要求的layout需要插入显式的重排操作，产生额外开销。

**内存开销优化维度：**

Layout的影响往往具有”传染性”：一旦某个tensor选定了特定layout，与之交互的所有算子都需要适配这个选择，否则就要插入显式的layout转换（通常代价高昂）。这种传染性意味着layout决策的影响范围远超单个算子。

合理的layout设计可以消除冗余的转换操作。以NHWC vs NCHW的经典之争为例：CNN时代NCHW是主流（便于按channel做卷积），但现代GPU的Tensor Core更偏好NHWC布局。混合使用两种layout会导致频繁的transpose操作，不仅消耗计算资源，还会产生额外的显存占用存储中间结果。

**硬件适配策略维度：**

不同硬件对layout的偏好存在显著差异：

- **NVIDIA Tensor Core**：偏好特定的fragment layout（如m16n8k16）
- **AMD Matrix Core**：有不同的数据排布要求
- **TPU**：XLA编译器内部使用特定的tile-based layout跨平台部署时，layout策略需要根据目标硬件调整。这也是为什么现代AI编译器（如MLIR、Triton）都将layout作为IR的一等属性来处理——它需要在整个编译流程中被追踪、推理和优化。

5.3 Layout与系统其他部分的耦合
Layout不仅影响单kernel效率，还与系统的其他关键组件深度耦合：

系统组件与Layout的耦合点影响范围通信层Collective操作的切分方式跨卡带宽利用率内存分配器Tensor对齐与padding显存碎片率图编译器算子fusion的可行性全图优化空间Auto-tuning搜索空间维度编译时间与最优解质量
6. 三大技术的协同演进

![](https://pic1.zhimg.com/v2-f0e1a7950076e6bdd19364521bba10c4_r.jpg)AI计算优化三元组——Fusion、Tiling、Layout三大技术的协同关系与三维优化效应
6.1 编译器：从工具到系统组件
在传统应用开发中，编译器被视为构建工具链的一环：源码进来，二进制出去，工作完成。但在AI系统中，这个理解已不再成立。

从MLIR到Triton，再到CuTe这种更贴近kernel构造和布局表达的体系，它们的意义不只是”把代码变快一点”。更本质地说，**它们在定义一件事：一个tensor program如何映射到GPU的并行层次和内存层次上。**

这种转变的深层原因在于：GPU的执行效率高度依赖于程序结构与硬件拓扑的匹配程度。传统CPU编译器面对的是相对均质的执行模型——指令流水线、缓存层次、分支预测——这些硬件特性虽然重要，但编译器可以在相当程度上独立于具体应用做出优化决策。然而在GPU上，SM（Streaming Multiprocessor）的资源约束、warp的执行语义、内存层次的带宽差异（HBM vs Shared Memory vs Register可达10x-100x的带宽落差），使得”如何映射”本身成为决定性能的核心问题。

因此，MLIR的多层次IR设计、Triton的block-level编程模型、CuTe的layout algebra，本质上都在做同一件事：**为tensor program到GPU硬件的映射提供可表达、可推理、可优化的中间形式**。这已经超越了传统编译器”翻译”的职能，而进入了系统设计的范畴。

6.2 编译器与Runtime的边界模糊化
在AI时代，编译器和runtime的边界正在变模糊：编译器在提前定义运行时要面对的资源形态；runtime反过来约束编译器能做什么、该做什么。

这种边界模糊化体现在多个层面：

**第一，编译时决策依赖运行时信息。** 最优的tiling策略往往取决于输入tensor的具体shape，而这在静态编译时可能未知。这催生了JIT编译、shape specialization、auto-tuning等技术，使编译过程延伸到运行时。

**第二，运行时需要理解编译产物的结构。** 现代AI runtime（如CUDA Graph、TensorRT）不再只是简单地”执行编译好的kernel”，而是需要理解kernel之间的依赖关系、内存复用模式、可并行执行的机会，从而做出更优的调度决策。

**第三，优化反馈闭环的形成。** Profile-guided optimization在AI系统中变得尤为重要：runtime收集执行profile，反馈给编译器指导下一轮优化；编译器生成的kernel特性又决定了runtime能采取什么调度策略。这种闭环使得编译器和runtime成为一个协同演化的整体。

从系统演化的视角看，这种边界模糊化并非偶然，而是计算密集型工作负载对系统软件提出的必然要求：**当性能边界逼近硬件极限时，任何层次的孤立优化都会遇到瓶颈，唯有跨层协同才能继续挖掘空间**。这与Linux内核中page cache、I/O scheduler、文件系统三者协同演化的历史，有着某种结构上的相似性。

7. 技术实践验证

7.1 FlashAttention：Tiling与内存系统设计的典范
FlashAttention的重要性，从来不只是因为它让attention更快，而是因为它极其鲜明地揭示了一件事：**在现代AI计算里，瓶颈往往不是FLOPs，而是数据在不同层次内存之间如何流动。**

FlashAttention将attention从一个”算术公式”问题，重新变成了一个”数据流与片上存储复用”问题。它综合运用了三大技术：

- **Tiling维度**：将Q/K/V矩阵切分为适配片上存储的小块，通过分块计算softmax（online softmax算法）避免全量materialization
- **Fusion维度**：将Scale、Mask、Softmax、MatMul等多个算子融合为一个kernel，消除所有中间结果的HBM访问
- **Layout维度**：设计专门的数据排布方式，使得分块计算时的访存模式高度coalesced结果是将attention的复杂度从O(N²)的显存占用降低到O(N)，同时因为更好的访存模式而获得速度提升。这意味着AI kernel的核心不再只是指令层面的优化，而是开始接近一种**内存系统设计**。

7.2 Triton与CuTe：三大技术的统一表达框架
Triton、CuTe这类体系的重要性，不是因为”写kernel更方便了”，而是因为它们在提供一种新的表达方式，让开发者能够更直接地描述并行结构、数据布局和memory movement。

**Triton**提供了block-level的编程抽象，开发者可以直接指定tiling策略和访存模式，编译器负责生成高效的底层代码。这使得fusion、tiling、layout的优化变得更加透明和可控。

**CuTe**（CUTLASS的核心抽象）提供了layout algebra，允许用复合方式描述复杂的数据排布和内存访问模式。它使得Tensor Core的fragment layout不再是神秘的黑箱，而是可以被程序化操作的一等对象。

某种意义上，它们像是GPU时代新的”中间语言”，介于高层图编译和底层ISA之间，**把原来埋在极深处的硬件约束显式化了**。

![](https://pic4.zhimg.com/v2-70200f9fe3f5542e04da9de9cc3fec5b_r.jpg)GPU Kernel开发抽象层次演进——从Hardware ISA到Framework，Triton/CuTe作为新中间层的桥接作用
7.3 vLLM/PagedAttention：Serving层的范式创新
如果说FlashAttention展示了kernel层面的三大技术应用，vLLM则展示了这些思想如何延伸到serving系统层面。

大模型serving的真正难点在于持续处理大量异构请求，而最稀缺的资源是KV cache占据的显存。vLLM的PagedAttention将OS页式管理的思想应用于KV cache管理：

- **Tiling思想的延伸**：将KV cache切分为固定大小的block，实现细粒度分配
- **Fusion思想的延伸**：Continuous batching将多请求的计算融合，提高吞吐
- **Layout思想的延伸**：设计专门的KV cache布局，支持不连续物理块的高效访问从系统角度看，vLLM这类系统不是”普通框架优化”，它们是在为AI时代**试探新的内存管理和调度边界**。

8. 展望：从优化技术到AI系统栈
参考：

[为什么 AI 时代值得重新讨论 OS：从 Linux Kernel 到 GPU 执行栈的系统重构](https://zhuanlan.zhihu.com/p/2024418152105214167)
8.1 新系统栈的形成
将以上分析综合起来，一条清晰的线索浮现：Fusion、Tiling、Layout的协同演进，正在推动形成一套新的系统软件栈：

- **驱动层**：管理设备上下文、地址空间和命令执行
- **Runtime层**：暴露stream、event、allocator、launch和graph
- **编译器层**：决定fusion、tiling、layout、lowering和codegen
- **Kernel DSL层**：把硬件层次和数据流约束显式表达
- **Serving/Runtime System层**：管理KV cache、request、batch和session
- **Distributed Runtime层**：协调collective、拓扑和跨卡执行这些模块表面上分散在不同位置，但本质上正在围绕同一件事收敛：**为AI工作负载建立新的执行抽象**

![](https://pic4.zhimg.com/v2-af664139c8921a059c5cf1292c214df9_r.jpg)AI OS分层架构全景——从Linux底座到执行内核层、运行时层、应用层的完整系统栈
8.2 AI OS的本质
如果给出一个更收敛的判断：**AI OS不是替代Linux的单体内核，而是建立在Linux之上的一层或几层新系统栈。** Fusion、Tiling、Layout是这个新系统栈的灵魂——它们共同定义了tensor program如何高效利用异构算力和多层内存。

层次职责三大技术的作用点应用层Agent/Workflow/Tool提供高层语义，屏蔽底层优化细节运行时层Serving/Session/MemoryFusion策略的运行时决策执行内核层Driver+Runtime+CompilerTiling/Layout的核心实现底座层Linux提供基础隔离与资源管理
9. 结论
本文以Fusion、Tiling、Layout三大优化技术为主线，探讨了它们如何共同推动计算范式从传统通用计算向AI专用计算的转变。核心结论可归纳为以下几点：

**第一，三大技术的本质是资源组织，而非简单的性能优化。** Tiling是片上资源的空间分配，Fusion是数据流边界的重构，Layout是访存模式的全局优化。它们共同回答一个核心问题：如何在有限的片上资源约束下实现全局最优。

**第二，三大技术的系统效应已超越编译器边界。** 它们与runtime深度耦合，形成优化反馈闭环；它们影响serving系统的内存管理和调度策略；它们正在定义AI时代的系统抽象。

**第三，三大技术在三个维度上协同作用：**

优化技术计算效率提升机制内存开销优化原理硬件适配策略Tiling提高Occupancy与并行度增加片上数据复用适配SM资源约束Fusion减少Kernel Launch开销消除中间结果实例化平衡计算与带宽Layout优化访存合并(Coalescing)减少格式转换冗余适配Tensor Core布局**第四，三大技术的演进标志着新计算范式的确立。** 从FlashAttention到Triton/CuTe，再到vLLM/PagedAttention，我们看到的不只是性能数字的提升，而是一种新的系统思维方式的形成。

**第五，未来的AI系统栈将以三大技术为灵魂。** 如果说Linux Kernel代表的是CPU通用计算时代最成熟的系统答案，那么围绕Fusion、Tiling、Layout构建的编译器-runtime-serving系统，很可能正在长出下一代系统软件的雏形。