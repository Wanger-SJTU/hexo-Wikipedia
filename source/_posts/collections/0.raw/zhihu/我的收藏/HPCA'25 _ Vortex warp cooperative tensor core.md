---
title: "HPCA'25 : Vortex warp cooperative tensor core"
date: "2025-10-10 00:00:00"
updated: "2025-10-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/HPCA'25-_-Vortex-warp-cooperative-tensor-core/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1959984548457709872"
---


HPCA'25 : Vortex warp cooperative tensor core

yahah
​​​
中国科学院大学  计算机科学与技术博士在读

收录于 · NPU全流程设计笔记

161 人赞同了该文章

根特大学的工作，HPCA25 ，比较硬核

Introduction
ASIC高效但缺乏灵活性，GPGPU灵活且高性能，既往研究及优化主要聚焦于英伟达架构及其编程模型，此类方案虽具实效，却可能模糊特定设计决策的理论依据，并制约tensor core架构的后续改进灵活性。本文介绍了将tensor core集成到开源 RISC-V Vortex GPGPU 平台的设计方案，以及一套专为 GEMM 内核生成设计的内部函数。通过对集成的分析，阐明了 GPU 系统架构参数与tensor core配置之间的关联。我们发现，在许多情况下tensor core的利用率严重不足，且计算能力的提升并不总能带来性能改善。为此，我们提出了一种新技术——tensor core中的协作式 warp 执行，该技术利用tensor core内硬件支持的 warp 协作来降低 GEMM 操作的内存需求，并在基线tensor core实现基础上将性能提升高达 3 倍。

实现有三大挑战：

- 设计一个可扩展且可配置的tensor core微架构，使线程数量、线程束数量及矩阵三维尺寸能够动态调整。这种扩展性旨在支持设计探索，以便为特定 GPU 微架构确定最高效的配置方案——当线程和/或线程束数量变化时，tensor core的设计亦需相应调整。
- 应对由 GPU 流水线固有局限导致的效率损耗，例如寄存器文件带宽限制、线程束调度发射宽度不足以及依赖关系引发的流水线停滞。我们通过将tensor core中每个线程的执行过程与 GPU 流水线问题进行解耦，有效缓解了这些瓶颈。（不理解的本章节最后有解释）
- 最后一个挑战涉及解决在GPU上运行GEMM（通用矩阵乘法）操作时，由共享内存 (shared memory) 和寄存器文件 (register file) 的容量与带宽需求所引发的问题，这些问题可能会限制张量核心 (tensor core) 持续高效地工作。我们通过在每个GPU核心 (per-GPU-core) 级别上使用K维度划分 (K partitioning)，同时利用我们对硬件张量核心的修改来消除通常与此划分方案相关的开销，从而应对这一挑战。我们的方法依赖于协作工作 (cooperative work) 来最小化数据移动。当前的GPU已经利用线程协作 (thread cooperation) 来发掘矩阵乘法固有的数据重用优势 [14]。然而，我们通过引入原生的硬件支持，在 tensor core 内部实现Warp协作 (warp cooperation)，从而扩展了这一概念以提升性能。通过对GPU流水线进行最小化的修改，我们使用我们的技术实现了Warp协作：即在 tensor core 中进行协作Warp执行 (cooperative warp execution)。通过我们的技术，我们消除了Warp间通信 (inter-warp communication) 的缺点以及相关的同步开销 (synchronization overheads)。我们进行的实验表明，这项技术可以将基线 tensor core 的性能提升高达3倍。

总而言之，我们的贡献有三个方面：

- 我们设计了一个高效的 tensor core，它具有创新的可配置微架构 (configurable microarchitecture)，并已集成到 Vortex GPGPU平台中。重要的是，此设计并不局限于Vortex平台，并且可以适配其他架构。
- 我们对 tensor core 与GPU性能的集成进行了深入分析。
- 我们提出了一种硬件支持的协作Warp执行 (hardware-supported cooperative warp execution) 策略，旨在提高 tensor core 的利用率，节省寄存器文件 (RF) 空间，并加速GEMM（通用矩阵乘法）的执行，特别是对于那些具有不平衡维度 (unbalanced dimensions) 且传统上会阻碍GPU资源利用率的GEMM操作。下图是主要的工作：

先看challenge1，左边展示了一个大的输入矩阵A (M x K) 和 B (K x N)，以及一个输出矩阵D (M x N)。中间的 Tensor core 接收被切割 (Cut) 后的输入单元块 Aut (M' x K') 和 But (K' x N')，并计算出输出单元块 Dut (M' x N')。关键问题是，Aut、But、Dut 这些单元块的维度（M、N、K 在单元块级别上的大小）以及参与计算的线程数 (# Threads = ?) 应该如何设定才能最高效。

challenge1需要设计一个可伸缩 (scalable) 和可配置 (configurable) 的 tensor core 微架构。这意味着 tensor core 需要能够适应不同的:

- 参与计算的线程数量。
- 参与计算的Warp数量。
- 输入输出矩阵的三个维度（M, N, K）在单元块级别上的大小。（我理解为灵活度）

接着看challenge2, 展示了两个输出单元块 Dut。下面一行是 N 和 N'，以及文字说明 "Multiple D-elements per thread in one tensor core call" (在一个 tensor core 调用中，每个线程处理多个D元素)。由于GPU流水线的限制，tensor core 可能无法被充分利用。即使有计算能力，也可能因为无法及时喂入数据或指令而空闲。需要解决由GPU流水线限制（如寄存器文件带宽、Warp调度宽度、依赖导致的停顿）引起的效率损失。Decoupled tensor core execution wrt GPGPU pipeline (tensor core 执行与GPGPU流水线解耦)。这意味着 tensor core 的执行在一定程度上独立于GPU的主流水线，例如通过内部缓冲和控制逻辑，使得 tensor core 可以在GPU处理其他指令时继续工作，或者缓冲输入/输出以平滑流水线瓶颈。 （解耦pipeline和tensor core,有TMA的味道了）

最后是challenge3 , 图中包含输入子块 Awt 和 Bwt，以及一个累加的中间结果 C（可即使有计算能力，也可能因为无法及时喂入数据或指令而空闲。需要解决由GPU流水线限制（如寄存器文件带宽、Warp调度宽度、依赖导致的停顿）引起的能存储在寄存器或共享内存中），最终计算出 D。旁边有一个 "Local tile buffer" (本地块缓冲器)。在GPU上运行GEMM操作时，对共享内存 (shared memory, SMEM) 和寄存器文件 (register file, RF) 的容量和带宽需求很高，这会限制 tensor core 的持续活动。具体而言，存储输入矩阵的块 (tiles)、输出矩阵的块以及中间累加结果都需要大量的SMEM和RF空间。如果空间不足，就需要更频繁地与更慢的内存层级交互。将数据从SMEM/RF加载到 tensor core，并将结果写回，需要高带宽。如果内存系统无法满足 tensor core 的数据需求，tensor core 就会因为数据饥饿而停顿，降低利用率和性能。解决方案根据注释来看是，

- HW-supported cooperative warp execution" (硬件支持的协作Warp执行)。
- "K partitioning over cooperative warp group" (在协作Warp组上进行K维度划分)。
- 结合起来就是利用硬件 tensor core 的修改，在每个GPU核心级别上使用K维度划分，并将累加操作移到 tensor core 内部的本地块缓冲器 (Local tile buffer) 中，从而减少对RF和SMEM的压力，并消除与传统K维度划分相关的同步开销。 

Background

Gemm分区和GPU开销
Gemm的运算过程是D = AxB+C ，该运算的维度为 M×N×K，其中 M×K 对应矩阵 A 的维度，K×N 对应矩阵 B 的维度，M×N 则对应矩阵 C 和 D 的维度。

在通用矩阵乘法(GEMM)运算中，计算通过遍历 M、N、K 三维的嵌套循环结构实现。外层循环遍历矩阵 A 的行与矩阵 B 的列，内层循环负责执行对应行向量与列向量的点积运算。为提升性能，系统采用了基于外积的矩阵分块乘法策略。

如何理解外积对性能更友好？首先看什么是内积，内积在图中是对每一个输出的点，遍历k次

外积呢？变化就是K放在最外层循环，并且红色矩阵变为按列，蓝色矩阵变为按行，多了数据复用

外积将累加器保持在快速存储器（如寄存器）中，直到 C_tile 完全计算完毕，可以显著减少对内存的读写次数。

具体的可以看

https://zhuanlan.zhihu.com/p/28900312872

在典型的GEMM（通用矩阵乘法）划分方案中，每个Warp负责处理来自输出矩阵D的一个唯一输出块 (output tile)，以及所有必要的数据移动和计算（也就是上面图中的一个绿色块）。当操作大型块 (large tiles) 时，外积可以通过最大化输入数据的重用 (data reuse) 来减少内存带宽需求。然而，这需要分配更多的寄存器 (registers)，减少了可以并发执行的Warp数量，因为外积同时需要用来保存结果的绿色块最多，而上面的内积每次只需要一个，可以理解为面积换重用性能。Warp并发度 (warp occupancy) 的降低限制了隐藏内存（以及其他）延迟的能力，从而在高效内存使用和计算效率之间形成了一种权衡。在像cuBLAS [16] 这样的优化库中，由于这种权衡，处理器占用率 (processors occupancy) 可能会降至25%到50%之间。

Warp协作 (Warp cooperation) 能够实现更好的数据重用和共享。在NVIDIA的GPU中，Warp cooperation是通过协作线程阵列 (cooperative thread arrays, CTAs) 来实现的。协作发生在加载阶段 (load phase)，此时不同的Warp load输入矩阵的不同块 (distinct tiles)，然后在后续的计算步骤中共享这些块。这种方式可以更好地处理数据和减少冗余内存访问。然而，这通常需要同步步骤 (synchronization steps) 来协调数据移动，而这可能会引入延迟 。

在存在更多硬件资源但没有足够输出块可供分配的情况下——这通常见于具有扁平GEMM（flat GEMMs）的工作负载，例如导致当前GPU资源利用不足的LLM（大型语言模型）推理 [6]——K维度划分 (K partitioning) 被用作划分方案的一个额外维度。K维度划分允许不同的Warp共享同一个输出块 (output tile)，而每个Warp处理输入矩阵A和B的不同片段 (segments)。具体来说，这是通过沿着K维度分割矩阵来实现的，如Figure 5所示。然而，在当前的GPU中，这种划分方案会带来额外的成本。它会增加延迟和内存开销，因为需要进行归约操作 (reduction operations)，而这些操作需要额外的同步以及通过共享内存 (shared memory) 在Warp之间进行数据移动，以累积输出块的部分结果 (partial results)。

下面分析一下上图中的优化思路：

左侧是baseline，Aut 和 But代表输入矩阵A和B的子块（tiles），wid 0, wid 1, wid 2, wid 3可以理解为不同的Warp（或者一个Warp内的线程组）在工作。每个 wid（Warp或其一部分）负责计算一个独立的输出子块 Cut (用 [x,y] 索引的 Aut 和 But 输入)，例如，wid 0 处理 Aut[0,1] 和 But[0,2] 来生成对应块的输出。但是存在问题Redundant read from RF (从寄存器文件RF中冗余读取) ，如果不同的Warp计算不同的输出块，但这些输出块依赖于部分相同的输入块，那么这些输入块可能会被重复地从RF中读取。另一个问题是 High RF space requirements (高RF空间需求)，每个Warp都需要在RF中为其输入、输出（Cut）和累加结果分配空间。

右侧是Cooperative warp execution using K partitioning (使用K维度划分的协作Warp执行)，A* wt 和 B* wt代表输入矩阵A和B，其中 wt 指 "warp tile"。A* wt 和B* wt都标记为 4xK的大小，不同的颜色对应不同的warp id。

No intermediate partial results (无中间部分结果)，因为Warp cooperation将结果累加到 tensor core 内部的共享累加缓冲器（tile buffer）中，所以不需要在RF中为每个Warp的中间部分结果（针对同一个输出块的）分配空间。此外，输出块 D/Cut 是共享的，其累加在 tensor core 的tile buffer中进行，而不是每个Warp在自己的RF中累加，从而Reduced RF requirements (减少RF需求)。D/Cut的分布也挺有意思的，不同 wid 区域中的相同 tid 值，指向的是物理上不同的输出数据元素。 例如，wid 0 中的 tid 0 和 wid 2 中的 tid 0 是两个完全不同的输出结果。这表示每个Warp独立负责计算和存储自己那部分输出，那么粒度是更粗还是更细？

Tensor Core和GPU协同设计
作为一个紧耦合 (tightly-coupled) 的专用GEMM加速器，tensor core 将操作数吞吐率 (operand throughput)（单位时间内提供的操作数数量）转换为算术吞吐率 (arithmetic throughput)（单位时间内执行的运算数量）。算术吞吐率与GPU提供的操作数吞吐率、操作数的重用 (reuse of operands) 以及以MAC（乘累加）操作形式存在的计算能力 (compute capacity) 成正比。为了实现一个高性价比和高性能的系统，采用一种集成了 tensor core（加速器）和GPU（控制器）的协同设计 (co-design) 方法至关重要。一个高效的集成策略应该在避免任何一方过度配置 (over-provisioning) 的同时，最大化双方的利用率和吞吐率。此外，与增强计算或内存操作相关的开销应被最小化。理想情况下，如Figure 3-c所示，计算和内存操作的延迟应该匹配，以实现完美的重叠。否则，如Figure 3-b所示，如果计算阶段过长，Warp可能会因依赖关系而停顿。相反，如Figure 3-a所示，如果加载阶段超过计算阶段，tensor core 可能会利用不足。

Vortex GPGPU 具有弹性的流水线设计 (elastic pipeline design) 和简单的握手协议 (handshaking protocol)，这使得在扩展附加模块时接口易于使用。此外，其分派 (dispatch) 和提交 (commit) 阶段可以根据设计中包含的功能单元和模块数量进行参数化。因此，我们将依赖Vortex在架构探索方面的能力，将 tensor core 作为GPU流水线中的一个附加功能单元进行集成，如Figure 2最左侧图像所示。

下面解释一下图片涉及到到的内容，新增的绿色部分的tensor core，黄色块是操作数寄存器，蓝色块是用于支持warp协作的硬件逻辑和tile buffer，线程组间协作增加了all-to-all network，每个thread group内部包含多个点乘单元以及reduce accumulate等操作，Accumulate还需要和Tile Buffer里面的结果相加后能提交给commit 。

GPU流水线和tensor core利用率
本节探讨当前 tensor core 为实现高利用率所依赖的具体架构特性。

首先，包括NVIDIA在内的GPU架构通常采用能够每个周期发射两条独立指令的流水线（双发射，dual-issue）。这一特性对于GEMM核心至关重要，因为它通过允许多种指令同时执行来增加指令级并行度 (Instruction-Level Parallelism, ILP)。在一个GEMM操作的最内层循环中，指令可以根据功能分类：

- 地址生成 (address generation)
- 加载 (loads)
- tensor core 发射 (tensor core issues)
- 指针管理 (pointer management)
- 循环分支 (loop branching)高ILP允许这些不同类型的指令重叠执行，确保在一组指令被处理的同时，另一组指令可以被执行。这种重叠最小化了空闲周期并提升了整体吞吐率。为了最大化 tensor core 的利用率，在最内层循环中，tensor core 发射指令与总指令的比例至少应为 1/ILP（假设没有依赖停顿），以匹配Warp调度器的发射宽度。随着ILP的增加，功能单元的利用率得到改善，从而带来更好的整体性能。然而，多发射流水线 (multi-issue pipeline) 的成本很高；MIAOW GPU的实现 [17] 表明，单发射GPU流水线 (single-issue GPU pipeline) 可能占据约60%的面积和近一半的功耗。因此，增加流水线的ILP将在复杂性和成本方面产生显著影响。

其次，存在关于寄存器文件 (register file) 每个周期提供多个操作数能力的假设。NVIDIA的架构假设寄存器文件可以为每次发射每个周期提供三个操作数，这在为不同功耗域设计的其他GPU架构中可能并不可行，正如寄存器文件显著的功耗 [18]（尤其是在 tensor core 操作中 [19]）所证明的那样。在Vortex [13] 中，其架构特点是单发射Warp调度器，每个Warp每个周期只能访问一个操作数。这些限制对在Vortex和类似GPU中实现高 tensor core 利用率构成了重大挑战。

为什么寄存器文件功耗很大？

- 多端口+大规模，寄存器文件基于SRAM设计，在待机和读取时都会消耗能量，规模越大，总的静态功耗和动态功耗就会越大
- GEMM对寄存器文件的访问很频繁
- Tensor core执行矩阵运算，需要短时间内读取和写入大量的操作数，并发量大

Tensor Core 微架构
为最小化开销并避免过度专用化，我们没有引入一个专用的GEMM内存操作，该操作会将 tensor core 直接连接到加载存储单元 (Load-Store Unit, LSU) / 内存层次结构。相反，我们利用GPU流水线的灵活性来处理地址计算和内存操作。这种方法保持了通用性，允许未来的扩展，而不会将架构锁定在特定的矩阵操作框架中。(独立于LSU)

Tensor Core通过每个线程在常规指令操作数提取时使用的端口，从寄存器文件（RF）接收矩阵操作数。其通道（lane）数量等于线程的体系结构配置（NT），再乘以每个线程可发出的最大操作数数量。在 Vortex 架构中，每个线程每条指令可以从寄存器文件提取最多三个操作数，每个操作数的位宽为 word-bits。为实现吞吐量最大化，每个线程使用了三个操作数的全部容量。

在计算方面，Tensor Core由一个点积单元（dot product units）阵列组成，每个线程对应一个单元。这些点积单元基于一个固定的输入向量长度（DPlen）进行操作，该长度可在设计时配置。DPlen 参数决定了具备 FP32 能力的多精度乘法器的数量以及进行规约 (reduction) 所需的加法树 (adder tree) 深度。

Inputs被打包 (packed) 以使用完整的总线宽度，每个线程通道 (thread lane) 最多可容纳 It 个元素，其中：

每个线程的三个通道分别从每个输入矩阵加载元素。在每次加载期间，所有线程处理三个矩阵的不同部分，如Figure 4所示：维度为 M x K 的矩阵A，维度为 K x Nload 的矩阵B，以及包含 NT 个元素的矩阵C。

我们将K维度的大小与由 DPlen 决定的硬件资源绑定，以确保每次加载操作都能充分利用点积通道；这种选择保证了加载和计算阶段之间的平衡，如Figure 3-a所示。

那些获取矩阵A同一行和矩阵B同一列内元素的线程组成了线程组 (thread groups)，如Figure 4所示。

一个线程组中的线程数量 (Tg) 由 DPlen 决定，它指定了需要多少线程来加载沿K维度的 wordbits 大小的元素，其中：

通过固定K维度，M和 Nload 维度可以推导为：（总的线程数量 / 每个warp中的线程数量 = warp数量？）

更大的 DPlen（例如，单个点积通道内有更多的硬件资源）意味着K维度的增加，而M和 Nload 维度则减少。相反，在固定的 DPlen 下增加线程数量会增加操作数的数量，从而增加M和 Nload 维度。

因此，每次加载-计算操作后产生的输出矩阵维度是 M x Nload。每个线程计算来自输出矩阵的 Ot 个元素，其中 Ot 由以下公式给出：

我们约束每个线程组内的线程协作计算与从矩阵A获取的行相对应的输出行。在每个周期，点积单元计算的总元素数量是 M x Ncompute，其中：

整个维度为 M x Ncompute x K 的矩阵乘法操作是使用一个矩阵乘累加 (MMA) 指令来执行的。为了利用所有加载的矩阵操作数，我们会执行 Ot 条MMA指令。在 Ot 个步骤中，矩阵B的不同列被选择并路由到各个点积单元，从而能够计算输出矩阵D中的所有 Ot 个元素（译者注：这里指每个线程负责的 Ot 个输出元素，或者说，完成一个 M x Nload 输出块需要 Ot 次内部迭代）。为了管理矩阵B各列的多路复用，每个Warp上下文都维护一个硬件计数器来跟踪其当前步骤。

尽管更大的 Ot 并不表示更高的计算能力，但它会导致每次矩阵加载后执行更多的MMA指令。

如何理解：问gemini

Register File   Operand Caching
在 O_t 次 MMA 指令的执行期间，相同的 A 和 B 操作数会被重复使用，但每一步都需要新的 C 操作数 。A 操作数保持映射到相同的线程组，而在每一步中，已加载的 B 矩阵的列则被多路复用（multiplexed）到不同的线程。

每一步都需要从寄存器文件（register file）读取三个字 。为了减轻寄存器文件的压力，我们在 tensor core 内部引入了专用的寄存器来缓存 A 和 B 的操作数 。这些寄存器只需从寄存器文件加载一次，后续的 tensor core 指令发射就只需要加载 C 操作数 。由于不同的 warp 操作不同的 A 和 B 操作数，因此每个 warp 都需要有独立的寄存器 。这个开销极小，每个 warp 的每个线程仅增加了两个额外的寄存器 。

在 Vortex 架构中，我们可以通过设置发射宽度（issue width）来配置能够同时访问寄存器文件的 warp 数量 。要维持每周期三个操作数的供给，需要至少为三的发射宽度（通过重叠不同 warp 的寄存器文件访问）。然而，在 tensor core 内部引入了 A 和 B 操作数缓存后，保持 tensor core 持续活跃的需求就降低到了

如何推导？

这是一个基于 tensor core 操作流程和操作数缓存机制的平均带宽需求模型 ，它描述了在引入A、B操作数内部缓存后，维持 tensor core 活跃所需的、平均到每个内部迭代周期的、每个线程需要从寄存器文件读取的字数。

- 首次迭代 (First Load - 第1步，共 Ot 步中的第1步):
- 需要从寄存器文件 (RF) 加载初始的操作数。
- A操作数：从RF加载到内部缓存。
- B操作数：从RF加载到内部缓存。
- C操作数（初始累加值）：从RF加载。
- 总共需要从RF加载3个逻辑操作数。 我们用 3[first load] 来表示这个阶段的加载需求。
- 后续迭代 (Other Loads - 第2步到第 Ot 步，共 Ot - 1 步):
- A操作数：从 tensor core 内部缓存获取，不需要从RF加载。
- B操作数：从 tensor core 内部缓存获取（或者其不同部分被选择），不需要从RF加载新的B块。
- C操作数（当前累加值/新的累加值）：假设每次迭代都需要从RF加载一个新的C值（或者说，与前一次迭代的C值不同，需要一次RF访问来获取）。
- 每次后续迭代需要从RF加载1个逻辑操作数 (C)。
- 总共有 Ot - 1 次这样的后续迭代，所以这部分的加载需求是 (Ot - 1) * 1[other loads] 或简化为 (Ot - 1)[other loads]。
- Ot 次迭代的总逻辑操作数加载量 (从RF)：
- 总加载 = 首次加载 + 后续加载
- 总加载 = 3 + (Ot - 1) * 1 = 3 + Ot - 1 = Ot + 2 个逻辑操作数。
- 平均每次内部迭代的逻辑操作数加载量 (从RF)：
- 平均加载 = 总加载 / Ot
- 平均加载 = (Ot + 2) / Ot 个逻辑操作数/每次内部迭代。
- 这就是公式中 (3[first load] + (Ot - 1)[other loads]) / Ot 部分的由来，只是它更明确地分开了首次和后续。如果直接用 Ot+2，则 (Ot+2)/Ot。
- 转换为每个线程每个周期的字数 (words/thread/cycle)：
- 上面的计算是“逻辑操作数”的数量。一个逻辑操作数（如A的一个元素，B的一个元素，或C的一个元素）可能占用一个或多个“字 (words)”在RF中的存储和传输，这取决于操作数的精度和 wordbits。
- 然而，论文在这里的 words / thread / cycle 更像是将这个“平均每次内部迭代的逻辑操作数加载量”作为一个因子，乘以一个表示“每个逻辑操作数需要多少字，并且这个加载分布在多少个线程和多少个周期内”的归一化系数。更可能的解释是：

- (3[first load] + (Ot - 1)[other loads]) / Ot 得到的是平均每次内部迭代需要从RF获取的“逻辑操作数包”的数量。
- 而 words / thread / cycle 是一个单位，表示我们关心的是每个线程每个（外部GPU）周期需要从RF读取多少个字。
- 这里的转换并没有给出一个明确的“每个逻辑操作数等于多少字”的换算。它更像是在说，因为我们有了这个平均的“逻辑操作数包”需求，所以维持 tensor core 活跃所对应的RF带宽需求（以words/thread/cycle为单位）也相应地按这个比例降低了。

COOPERATIVE WARP EXECUTION

Arithmetic Intensity and Memory Overhead
性能会随着GEMM块 (GEMM tiles) 的增大而提高。基于已开发的MMA指令，我们可以构建基于外积 (outer-product) 的矩阵乘法，这允许在寄存器文件中重用已加载的矩阵块以用于重复的MMA指令。外积的大小也直接影响内存带宽需求。具体来说，更大的外积尺寸意味着更低的内存带宽需求，因为加载的A和B块可以被多次重用。在这种情况下，外积大小由加载的A块和B块的数量（分别表示为 Aloads 和 Bloads）来衡量。因此，每个A块与 Bloads 个B块重用，每个B块与 Aloads 个A块重用。随后，我们可以推导出维持最大 tensor core 吞吐率所需的内存带宽。这个需求，在GPU核心层面，可以表示为所需的最小加载/存储单元 (Load-Store Units, NLSU) 数量，每个单元每个周期能够加载1个字 (word)。然而，内存层次结构总能为每个LSU每个周期加载1个字提供足够带宽的假设并不能得到保证，并且可能需要优化内存层次结构，这已在先前的一些工作 [20]-[23] 中进行了探讨。尽管如此，如公式(2)所示，我们确定了潜在实现 tensor core 完全利用率所需的 NLSU 的下限。降低这个下限反过来会减少对内存层次结构的压力，使其更容易实现更高的吞吐率。

 然而，操作更大的GEMM块的显著困难在于内存开销。事实上，由于频繁更新，用于保存矩阵C/D的累加缓冲器 (accumulation buffer)（位于寄存器文件中）会随着外积的增大而变得越来越大。保存累加结果所需的寄存器数量 (RMMA) 由公式(3)给出，其中 NW 是Warp的数量。

Ot是单个线程在处理一个unit tile时，需要负责输出的寄存器数量

Aloads * Bloads * Ot ,单个线程，在处理整个“外积”任务时，总共需要负责的输出寄存器数量

Aloads * Bloads * Ot * NT 一整个Warp（由NT个线程组成），在处理整个“外积”任务时，所需要的总寄存器数量

Aloads * Bloads * Ot * NT*NW 一整个GPGPU核心（由NW个Warp组成），处理整个任务所需的总寄存器数量

(通过让多个Warp共享一个位于tensor core内部的累加缓冲区（tile buffer），就不再需要每个Warp都去抢占宝贵的寄存器文件资源。这种方法的效果，就相当于直接将公式中的 × NW 这一项给去掉了)

另一方面，外积大小直接影响算术强度。ILP（指令级并行度）直接影响为维持高 tensor core 利用率而每个加载周期所需的MMA指令数量。

为了应对这些挑战，我们引入了 tensor core 中的协作Warp执行 (cooperative warp execution)，这是一系列旨在减轻这些开销的硬件和软件技术的集合。这种方法依赖于Warp组 (warp groups) 协同执行，通过允许使用更大的外积尺寸，同时降低带宽和内存大小需求来增强性能。

Hardware-managed Execution

为了克服GPU流水线限制，通过在每次发射的MMA指令后执行更多的工作来延长计算周期相对于加载周期的长度至关重要。

一个有效的方法是将 tensor core 转变为一个松耦合 (loosely-coupled) 的加速器。我们通过集成一个内部的块累加缓冲器 (tile accumulation buffer，简称tile buffer) 和一个硬件管理的循环 (hardware-managed loop) 来控制执行，从而实现这一点。这个硬件循环通过允许每个（外部）MMA指令对应多次 tensor core 执行，再现了多发射调度器 (multi-issue scheduler) 的行为。具体来说，它使得对于通过GPU流水线的每一条MMA指令，都能执行 Ot 条（内部）指令。

硬件循环执行有效地将MMA指令（GPU流水线视角）与实际的 tensor core 计算步骤数量解耦开来。通过成为一个松耦合的加速器，tensor core 允许Warp提前运行并执行不同类型的指令（如ALU或LSU指令），而硬件循环则管理着 tensor core 的执行。这种解耦也有助于覆盖可能发生的其他Warp停顿，例如由于LSU队列已满导致的停顿。

引入tile buffer是为了防止 tensor core 停顿，并避免在访问寄存器文件时发生冲突。如果没有tile buffer，就必须将 tensor core 直接连接到寄存器文件，以累加来自GEMM最内层循环的部分结果。此外，这种方法（指使用tile buffer进行内部累加）减少了寄存器文件的带宽需求，因为内部累加消除了重复的MMA指令仅加载C操作数的需要。由于它们现在保存在tile buffer中而不是寄存器文件中，寄存器文件的带宽需求从公式(1)降低到：

(words / thread) / cycle 是单位：每个线程每个周期需要读取的数据字数量

Amortizing Memory Overhead Across Warps

传统上，每个Warp都在寄存器文件中维护一个独立的累加缓冲器，这导致了巨大的内存需求，并限制了可以在本地执行的矩阵乘法的大小。通过协作Warp执行 (cooperative warp execution)，我们使用K维度划分 (K partitioning)，其中协作Warp组 (cooperating warps in a warp group) 共享一个托管在 tensor core 的tile buffer内部的独立累加缓冲器。这将内存开销分摊到协作的Warp上，显著地将每个Warp的累加/部分结果的空间需求减少了一个等于Warp组大小的因子。如果一个核心内的所有Warp都进行协作，其对 RMMA（公式3中的累加寄存器需求）的影响将等同于去掉公式3中的 NW（Warp数量）系数。

此外，不同的Warp将获取（fetch）唯一的A和B矩阵操作数，避免了冗余的内存访问和寄存器文件 (RF) 中的重复数据，如Figure 5所示。与当前GPU中使用的K维度划分不同——在当前GPU中，矩阵乘法操作结束时需要在系统层面进行中间块 (intermediate tiles) 的归约 (reduction)——我们的方法将归约操作融入到了计算步骤中。借助 tensor core 的共享tile buffer，对于Warp组的访问本质上是原子的 (atomic)，从而消除了在归约操作期间对同步原语 (synchronization primitives) 的需求，也无需为Warp间的部分结果通信而在共享内存中预留额外空间。

而且，共享tile buffer是一个单端口SRAM (single-ported SRAM)，远小于等效的寄存器文件（后者需要至少三个端口或更多来维持三操作数指令的发射）。

总之，tensor core 内部硬件支持的Warp协作使得能够利用处理更大外积尺寸所带来的优势和更高的算术强度，同时与仅依赖RF和共享内存相比，显著减轻了内存方面的负载。

Cooperative Flushing
一旦一个输出块 (output tile) 在tile buffer内部计算完成，下一步就是将其加载回寄存器文件 (RF)，以继续进行其他处理任务，例如神经网络中的激活函数计算或将其存储到特定地址。一种选择是让Warp组中的一个Warp来执行刷新 (flushing) 和后处理 (post-processing)。这会对性能产生负面影响，主要有两个原因：

- 由于协作Warp执行，我们可以操作那些超出单个线程寄存器文件大小的输出块。如果只有一个Warp负责刷新、处理和存储，可能会导致寄存器溢出 (register spilling)。
- 在Vortex架构中，一个Warp会一直停顿直到其指令被解码。如果让一个Warp单独进行刷新和处理，可能会导致流水线利用不足。通过激活多个Warp，我们可以覆盖Vortex固有的延迟，并保持流水线繁忙。因此，我们将协作Warp执行扩展到另一种形式的Warp协作，称为协作刷新 (cooperative flushing)。这项技术将在Warp组内参与的Warp之间分配卸载 (off-loading) 输出块（位于 tensor core 的tile buffer中）的责任，如Figure 5所示。

启用协作刷新可以减少每个Warp在其寄存器文件中持有的输出块的大小。这使得能够处理比每个Warp都维护独立上下文时所能处理的更大的GEMM外积尺寸，而不会导致寄存器溢出。也就是说，我们可以操作那些比单个Warp的RF所能容纳的更大的块，但这些块仍然可以分散存放在所有Warp的RF上下文中。另一种理解方式是，协作刷新减少了每个Warp的寄存器文件占用空间 (footprint)，当寄存器文件共享时，这可以通过允许每个核心启用更多Warp来增加Warp并发度 (warp occupancy)。更高的Warp并发度反过来又能提高隐藏停顿的能力并增强吞吐率。

Warp Scheduling and Stalls Overlap
利用协作Warp执行的较大Warp组尺寸所带来的一个额外好处是其对Vortex基于优先级的Warp调度器 (priority-based warp scheduler) 的影响。基于优先级的Warp调度器可能导致不同的Warp组在任何时间点处于不同的工作负载阶段 (workload phases)。研究 [24]-[26] 表明，在不同工作负载阶段操作的Warp可能导致GPU资源利用不足。这是由于Warp调度策略造成的，该策略可能因为诸如内存访问等高延迟操作而导致空闲期，期间没有Warp交错执行。

通过协作Warp执行，同步 (synchronization) 被强制在GEMM的最内层循环之后和后处理阶段之前进行。这导致Warp组内的Warp以锁步 (lockstep) 方式执行。在一个GEMM操作之后，许多操作存在数据依赖关系：首先从 tensor core 刷新结果；然后是可选的处理、地址计算；最后是存储操作。

随着Warp组大小的增加，更多的Warp参与到相同的执行阶段，通过确保有更多可用的Warp来减少依赖停顿 (dependency stalls) 的风险，如Figure 6-b所示。

如果没有足够多的参与Warp来覆盖潜在的停顿，系统将依赖于来自不同（Warp）组的可用Warp，如Figure 6-a所示。

此外，tile buffer的大小显著影响这种动态。随着托管在tile buffer中的累加块 (accumulation tile) 大小的增加，每个Warp负责处理来自D矩阵的更大输出块的一部分，从而导致更多的工作量。这种增加的工作负载增加了停顿的可能性，通常是由于诸如内存访问之类的长延迟操作。为了减轻这些停顿，更高频率的活跃Warp交错执行 (interleaving frequency of active warps) 变得很有必要。

Programming Model
tensor core 可以通过专用的内建函数 (intrinsics) 进行编程，这些内建函数分为以下三类：

- 加载内建函数 (Load Intrinsic): 从内存层次结构或 tensor core 的tile buffer加载操作数到本地寄存器文件。
- 计算内建函数 (Compute Intrinsic): 用于正常的矩阵乘法和协作Warp执行的计算指令。
- 存储内建函数 (Store Intrinsic): 将从寄存器文件刷新或累积的块 (tile) 存储到内存层次结构。这组内建函数如表I所示。这些调用的混合搭配可作为构建更复杂矩阵乘法的模块化构件，从而能够高效处理各种不同的矩阵大小和形状。

正如前面章节所示，我们的硬件设计决定了矩阵乘法的大小，以及跨线程和Warp的映射方式。因此，软件必须相应地进行适配。由于我们的目标是探索各种GPU和 tensor core 的架构配置，为每种配置使用汇编或临时的C代码子程序是不切实际的。因此，我们开发了一个基于模板元编程 (template meta-programming) 的运行时内核生成流程。这个模板化库 (templated library) 会根据特定的问题参数（例如外积大小，即 Aloads 和 Bloads）、tensor core 配置（例如点积长度 DPlen）和GPU架构（例如线程数 NT）来生成基于定制内建函数的基础矩阵乘法代码。这组参数在编译时被选择，以匹配系统架构并最大化资源利用。生成的内建函数是静态优化和展开的。Figure 7展示了该库在正常 tensor core 操作模式下的基本概念；C++代码表示最内层的块循环 (tile loop)，其中进行加载和计算操作。如果分支不发生，则执行存储操作。每个内建函数都依赖于一系列模板参数，这些参数告知编译器关于汇编代码生成的展开因子 (unrolling factor)；这避免了循环例程的开销，代价是二进制代码的少量增加。

在协作Warp执行模式下，会发生类似的过程，但会涉及到Warp组信息和额外的架构特定定义，特别是与tile buffer配置相关的定义。这些定义包括独立分区 (independent partitions) 的数量（等于每个GPU核心的Warp数量 (NW) 除以Warp组大小）和分区大小（等效于 RMMA / WG 寄存器，译者注：原文 RMMA W G registers 可能指 RMMA 除以Warp组大小，或者与Warp组相关的 RMMA）。

Evaluation

Experimental Methodology
我们将 tensor core 实现为一个可配置的、周期精确 (cycle-accurate) 的、基于事件 (event-based) 的模型，并将其集成到Vortex的C++仿真平台SIMX [13] 中。该C++模型旨在反映RTL（寄存器传输级）层面的时序行为，包含了 tensor core 内部流水线阶段引入的延迟。具体来说，该模型考虑了点积的执行延迟，该延迟会随着 DPlen 的增大而增加，这是因为规约阶段的加法树中增加了额外的级数。这些延迟是静态可预测的，因为完全流水线化的设计确保了 tensor core 自身内部不会发生冲突或停顿。当停顿时，它们归因于更广泛的GPU流水线。为了处理这种情况，我们在高层模型中实现了反压 (backpressure) 机制，以在流水线已满并阻塞时阻止接受新的操作数。

在设计中，tile buffer是按线程分bank (banked per thread) 的；高层模型通过 bank 和线程之间的一对一映射来强制执行这一点。此外，为了验证与我们设计相关的面积开销并估算 tensor core 的大小，我们综合 (synthesize) 了Vortex核心和 tensor core 的各种配置以进行比较。在本研究中，为了在性能实验中保持一致性，我们使用了与V-G节中综合目标所采用的相同的乘法器和加法器流水线深度。

用于基准测试的主要GEMM问题是一个512x512x512的矩阵乘法。选择这个尺寸是为了确保有足够的工作量来保持线程活跃，同时具有足够大的M和N维度，以便包含GEMM非计算方面（non-compute aspects）的影响。

在整个仿真过程中收集了执行周期和其他性能指标；我们报告的是聚合的测量结果。为了验证所提出的集成的质量，我们修改了Vortex的架构参数，并相应地调整了 tensor core 的大小。具体来说，我们调整了加载/存储单元 (load-store units) 的数量——这相应地决定了共享内存bank (shared memory banks) 的数量——以确保在每个实验中性能不会受到内存带宽的阻碍，将其数量设置为等于或高于公式(2)中指定的需求。

所有实验都在一个拥有8个Warp的GPU核心上进行，以便将研究重点放在 tensor core 本身，而不是内存层次结构优化和核心间分块 (inter-core tiling) 技术上。我们假设数据被加载到共享内存中，因为双缓冲 (double buffering) 是一种广泛用于隐藏内存延迟的技术，并且Vortex没有异步内存复制操作。这种方法将分析范围限制在 tensor core 的性能上，避免了可能掩盖结果的外部因素。通过隔离 tensor core，我们可以更有效地展示其能力和潜在的改进。

tensor core 在混合精度 (mixed-precision) 模式下使用，进行FP16乘法和FP32累加。

Threads and Dot Product Length on Utilization
在这个实验中，我们探索了线程数量和点积长度之间的关系。我们运行了基线 tensor core，采用分块划分方案 (blocking partitioning scheme)，并且只考虑了每个线程至少负责一个输出元素 (Ot  = 1) 的有效配置。我们测量了整个仿真过程中的完成周期和平均 tensor core 利用率。我们的目标是通过将外积大小增加到最大来优化 tensor core 利用率，这个最大值受限于RISC-V ISA固有的每个线程最多32个寄存器的约束。加载到寄存器文件中的B块 (B tiles) 数量固定为1，而A块 (A tiles) 的数量则如表II所示进行变化。

从Figure 8所示的结果中，我们得出几个关键观察：

- 32T-1LEN配置由于寄存器溢出 (register spilling) 而是最慢的。 溢出是由于累加缓冲器大小为32个寄存器，再加上为每个加载的A块和B块各需要一个寄存器所致。这导致了显著的性能下降。
- 值得注意的是，增加的计算能力并不总是等同于更好的性能。 例如，16T-2LEN和16T-4LEN配置具有相似的完成周期，但16T-4LEN配置的 tensor core 利用率不到16T-2LEN的一半，因此即使计算能力增加了，其性能也更差。
- 此外，我们可以观察到 tensor core 利用率在很大程度上受到GEMM最内层循环中MMA指令与总指令数之比的限制。 表II中显示的具有较高 Ot 值的配置，如8T-1LEN、16T-1LEN、16T-2LEN和32T-2LEN，导致每次块加载后有更多的MMA指令，因此利用率较高。
- 8T-1LEN配置具有最高的平均 tensor core 利用率，同时也是寄存器文件使用量最大的配置之一，使用了32个寄存器中的28个。 这证明了高 Ot 值和有效的寄存器利用率对于最大化 tensor core 利用率的重要性。
- 然而，总体结果令人失望，因为只有一个配置 (8T-1LEN) 的平均 tensor core 利用率勉强超过了50%，而且这还是在计算能力最低（点积长度为1，相当于每个线程一个FP32 MAC单元）的情况下。

下面是一些解释：

T 代表线程数，如8T, 16T, 32T) 和不同点积长度 (LEN 代表 DPlen

- 32T-1LEN的寄存器溢出：
- 32个线程，每个线程点积长度为1 (DPlen=1)。根据之前的公式 Tg = DPlen = 1，M = Nload = NT / Tg = 32 / 1 = 32。
- Ot = (M * Nload) / NT = (32 * 32) / 32 = 32。这意味着每个线程负责32个输出元素。
- 如果累加缓冲器（存储这32个输出元素）占用了32个寄存器，再加上为A和B的指针（或数据本身，如果块很小）各分配一个寄存器，就很容易超过32个寄存器的限制，导致溢出到更慢的内存，性能急剧下降。
- 计算能力与性能不总成正比 (16T-2LEN vs 16T-4LEN)：
- 16T-4LEN 的 DPlen 更大，理论计算能力更强。
- 但其实际 tensor core 利用率远低于16T-2LEN，导致最终性能反而更差。这表明仅仅增加原始计算硬件并不能保证性能提升，如果不能有效地向其供应数据和指令，或者如果其他瓶颈（如寄存器压力、指令开销）限制了它。
- 利用率瓶颈 (MMA指令比例)： tensor core 的利用率很大程度上取决于在GEMM的核心循环中，实际执行MMA指令的时间占比。如果大部分时间花在地址计算、数据加载、分支跳转等辅助操作上，那么MMA指令的比例就会很低，tensor core 就会空闲。
- 高 Ot 值的重要性： Ot 值高意味着每次数据加载后，tensor core 会执行更多的内部MMA计算步骤。这增加了MMA指令在总指令中的比例，有助于提高利用率。
- 8T-1LEN 的表现：
- NT=8, DPlen=1 =  Tg=1, M=Nload=8, Ot=8。
- 这个配置的 Ot 相对较高，并且其寄存器使用也接近上限（28/32），表明它在平衡计算量和寄存器使用方面做得相对较好，从而获得了最高的利用率。
- 总体结果不佳： 即使是表现最好的配置，平均利用率也仅有50%左右，这表明基线 tensor core 设计在实际应用中存在严重的利用率不足问题。这为后续引入协作Warp执行等优化技术提供了强烈的动机。

Cooperative Warp Execution: Decoupling The Tensor Core
在这个实验中，我们保持了与前一个实验相同的设置，但启用了协作Warp执行（Warp组大小等于8），以分离其对性能的解耦 (decoupling) 效果。我们的分析重点关注16线程的配置。

从Figure 9中，我们观察到激活协作Warp执行为所有配置都带来了加速，其中16T-1LEN和16T-2LEN的解耦配置相比于普通配置有显著的约1.6倍的性能提升。在这两种配置中，平均 tensor core 利用率也显著提高，其中较大的 Ot 值使得解耦效果更为明显，这一点可以从Figure 9中看出。

相反，16T-4LEN配置的平均 tensor core 利用率增幅最小，这符合预期，因为 Ot=1 不允许产生解耦效果。尽管如此，我们仍然观察到了1.2倍的加速，这主要归功于协作Warp执行对Warp调度器的影响以及通过强制串行执行（enforced serial execution，指Warp组内锁步执行）改进的交错执行 (interleaving)，这一点可以从Figure 10中减少的指令缓冲 (instruction buffer) 和记分板 (scoreboard) 停顿看出。

此外，如Figure 11所示，所有配置下发射的指令数量都显著减少。在16T-1LEN和16T-2LEN配置中，协作刷新 (cooperative flushing) 和硬件管理的执行 (hardware-managed execution，指 tensor core 内部的硬件循环) 都对指令减少做出了贡献；而在16T-4LEN配置中，只有协作刷新对指令减少有贡献。

这个实验清晰地展示了协作Warp执行的初步优势：

- 解耦效果显著 (当 Ot   1)： 通过允许 tensor core 独立于GPU主流水线执行其内部的 Ot 次迭代，可以显著提高性能和 tensor core 利用率。
- 即使 Ot=1 也有好处： 协作Warp执行的同步特性改善了Warp调度和后续依赖操作的交错执行，减少了停顿，从而带来性能提升。
- 显著减少GPU发射的指令数： 这得益于 tensor core 内部的硬件循环管理（替代了多条GPU指令）和更高效的协作刷新机制。减少指令数本身就能减轻前端流水线的压力，并可能降低能耗。这些结果表明，协作Warp执行不仅仅是通过一个机制起作用，而是通过多种方式（解耦、改善调度、减少指令）共同提升了系统性能。

Cooperative Warp Execution: Larger GEMM Tiles
在前一个实验的基础上，我们利用了协作Warp执行的另一个方面：累加缓冲器的分摊成本 (amortized cost of the accumulation buffer)，这使得能够使用更大的外积 (larger outer products)。我们将 Aloads 和 Bloads 增加到超过了如果部分结果存储在寄存器文件中所能达到的水平。

- 在16T-1LEN配置中（该配置在排除32T-1LEN后具有最高的 Ot 值），将每个线程的累加缓冲器大小增加到32个寄存器，可以使我们实现超过95%的平均 tensor core 利用率，如Figure 12所示。
- 对于16T-2LEN配置，当累加器大小为每个线程64个寄存器时，平均利用率接近饱和。
- 尽管16T-4LEN配置由于不存在解耦效应而未达到饱和，但更大外积尺寸的影响是显而易见的。与Figure 9中显示的解耦等效配置相比，使用32寄存器累加器时，平均利用率增加了约15%，使用64寄存器累加器时又增加了15个百分点。这突显了通过协作Warp执行和增加外积尺寸可能实现的显著性能改进。

Cooperative Warp Execution: Cooperative Flushing
在本节中，我们转向一个更高性能的配置，该配置更接近NVIDIA的配置，使用32个线程，点积长度为4，以及固定为8的Warp数量。我们通过进行每个线程累加器大小分别为32、64和128寄存器 (REG) 的实验，来研究改变Warp组大小 (WG) 及其与协作刷新 (cooperative flushing) 的关系。在固定Warp总数的情况下，减小Warp组大小的效果是在tile buffer内部分配独立的partitions（分区），以操作唯一的输出块 (output tiles)。本实验旨在探索协作刷新对外积大小和Warp组大小的影响，并进而影响K维度上的partition数量。

值得注意的是，8WG-64REG和8WG-128REG配置表现出特别高的性能，在GEMM的最内层循环期间，tensor core 利用率分别达到了约90%和约100%。与V-B节中运行的类似规模的配置相比，这两种情况下的平均 tensor core 利用率和加速比均增加了大约三倍。

Figure 13表明，协作刷新使得性能能够随着Warp组大小的增加而扩展，这是有益的，因为它减少了所需的独立partition数量（等于Warp组的数量，即总Warp数/WG大小），从而减少了内存（指tile buffer的）面积开销。

此外，协作刷新能够维持随着更大外积而来的性能扩展，这一点从4WG-32REG、4WG-64REG、8WG-32REG、8WG-64REG和8WG-128REG配置中得到证明。然而，一些配置，例如2WG-64REG和4WG-128REG，由于IV-E节中讨论的依赖停顿而表现不佳，这可以从Figure 14中看出。

在这些情况下，由于操作的是一个大的块 (tile)，最内层循环之后的阶段构成了大量的工作，并且没有足够的活跃Warp来覆盖这些停顿。对于2WG-128REG配置，C/D矩阵（累加结果）的大小超过了每个线程32个寄存器的寄存器文件容量。Warp组中的两个Warp每个都需要64个寄存器来保存C/D矩阵。这导致了寄存器溢出到堆栈中，并降低了性能。

总结来说，协作刷新通过提高资源利用率，特别是在高寄存器配置（指需要或分配了大量寄存器的场景）中，显著增强了性能。

核心概念和解释：

- 高性能配置基准：
- 32个线程 (NT=32)。
- 点积长度为4 (DPlen=4)。
- Warp总数固定为8 (NW=8)。
- 这个配置更接近一些实际的高性能GPU设定。
- 研究变量和目标：
- 改变Warp组大小 (WG)： 例如，WG可以是2, 4, 或 8。
- 如果 WG=8，那么所有8个Warp组成一个大的协作组，tile buffer中只有一个大的共享partition。
- 如果 WG=4，那么8个Warp形成两个独立的协作组，每个组4个Warp，tile buffer中有两个中等大小的partition。
- 如果 WG=2，那么8个Warp形成四个独立的协作组，每个组2个Warp，tile buffer中有四个较小的partition。
- 改变累加器大小 (REG)： 每个线程逻辑上可用的累加器空间（32, 64, 或 128个寄存器），这决定了可以支持多大的外积。
- 目标： 观察协作刷新在不同Warp组大小和外积大小（由累加器大小间接决定）下的表现，以及它们如何与tile buffer的partition数量关联。
- 关键性能结果：
- 8WG-64REG 和 8WG-128REG 的优异表现：
- WG=8（所有Warp在一个大组内协作），累加器较大（64或128 REG）。
- 实现了非常高的（接近饱和的）tensor core 利用率。
- 相比于V-B节的基线配置（没有协作或外积较小），性能提升了约3倍。这突显了协作Warp执行与大外积结合的巨大威力。
- Figure 13 - 协作刷新与Warp组大小扩展性：
- 更大的Warp组 (WG) 意味着更少的独立tile buffer partition。例如，WG=8时，只有一个partition；WG=2时，有四个partition。
- 更少的partition通常意味着tile buffer的面积开销更小（因为partition管理本身有开销，且大的连续SRAM通常比多个小SRAM更面积有效）。
- Figure 13显示，协作刷新能够支持这种向更大Warp组的性能扩展。
- 协作刷新与大外积扩展性：
- 即使Warp组大小固定（如4WG或8WG），增加累加器大小（REG），从而支持更大的外积，性能也能持续提升。
- 表现不佳的配置及其原因 (Figure 14)：
- 2WG-64REG 和 4WG-128REG：
- Warp组较小 (2WG) 或中等 (4WG)，但累加器很大 (64REG, 128REG) =  意味着每个Warp在协作刷新阶段需要处理非常大的一块数据。
- 依赖停顿 (IV-E节讨论，Figure 6的逻辑)： 在最内层循环之后，有大量的刷新和后处理工作。由于Warp组内活跃Warp数量不足以完全覆盖这些工作中可能出现的停顿（例如，等待LSU资源、内存延迟），导致性能下降。
- 2WG-128REG 的寄存器溢出：
- WG=2，每个线程逻辑累加器128REG。这意味着这个Warp组（2个Warp）共享的tile buffer partition非常大。
- 在协作刷新阶段，每个Warp需要从这个巨大的partition中读取它负责的那部分数据到自己的RF中进行处理。
- 如果每个Warp需要处理的数据量（例如，为了容纳从tile buffer读出的C/D矩阵部分）超过了其物理RF容量（这里是32个寄存器/线程），就会发生溢出。
- 文中提到“每个Warp需要64个寄存器”，这可能是指为了处理其从128REG的逻辑累加器中分到的那部分数据，在RF中临时需要64个寄存器的空间，这超出了32的限制，导致了溢出。
- 总结协作刷新的好处：
- 提高资源利用率： 特别是在需要大量寄存器（高REG配置，对应大外积）的场景下，协作刷新通过允许多个Warp分担工作，避免了单Warp的RF瓶颈，从而使得这些高寄存器配置能够真正发挥其性能潜力。
- 使得大外积和较大Warp组成为可行且高效的选项。

Tensor Core Performance Across K Dimension
为了探索我们实现的性能极限，我们从前一个实验中选择了总体表现最佳的配置，即每个线程128个寄存器的32T-4LEN配置（Warp组大小等于8），并配备8个LSU（加载/存储单元）。我们改变了GEMM操作的K维度大小，从64到4096，同时保持M和N维度固定在512。

如Figure 15所示，随着K值的增大，平均 tensor core 利用率也随之增加，因为计算操作与控制操作的比率提高，从而提升了效率。当K=1024时，平均利用率开始趋于平稳。在K维度最大（4096）的实验中，我们实现了96.4%的平均 tensor core 利用率。 （对LLM友好)

在整个仿真过程中，我们维持了大部分时间平滑的、接近100%的 tensor core 利用率，如Figure 16a所示。这展示了即使在受到架构约束的情况下，该设计在重叠计算和加载阶段方面的有效性。

平均共享内存 banks 利用率为60%。根据公式(2)计算得到的预期最小 bank 利用率为62.5%，两者存在2.5%的差异。这种不匹配可归因于Figure 16b中显示的异常值 (outliers)，这些异常值由于具有接近零的利用率值而拉低了平均值。这些是正在进行刷新和控制操作的时期。一个更具代表性的衡量标准是中位数利用率，为66.55%，超过了最低要求。中位数利用率与最低要求之间的微小不匹配是由于为 tensor core 喂数据之外的操作（例如管理堆栈）带来了额外访问，这些操作不具有相同的重用因子 (reuse factor)。

这一部分的实验结果非常积极，展示了在精心选择的“最佳”配置下，论文提出的 tensor core 设计及其协作机制能够：

- 在K维度足够大的情况下，实现极高的平均 tensor core 利用率 (高达96.4%)。
- 在整个计算过程中，大部分时间维持接近饱和的瞬时 tensor core 利用率，表明其能够有效地重叠计算和数据加载。
- 共享内存 banks 的带宽在典型情况下是足够的，甚至略有富余，能够满足 tensor core 的需求。 平均利用率略低是由于非计算密集阶段（如刷新和控制）的正常现象。这些结果强有力地证明了其设计在处理计算密集型GEMM负载时的有效性和高效性，特别是在K维度较深（这在许多现代DNN模型中很常见）的情况下。

RTL Model
为了验证所提出的 tensor core 设计的硅面积以及增加的本地内存的开销，我们使用fpnew [27] 作为我们的基础算术单元在RTL（寄存器传输级）中实现了该设计，支持FP8、FP16、BF16和FP32的被乘数数据类型，以及FP16或FP32的累加数据类型。对于综合，我们使用了Cadence DDI 22.35套件，并采用现代的GlobalFoundries 22FDX工艺技术。

我们从两个维度进行面积分析研究：计算能力和本地内存开销。对于计算能力，我们考察了随线程数 (NT) 以及每通道点积大小 (DPlen) 的扩展情况。对于本地内存开销，我们考察了随Warp数量的扩展及其对操作数缓存的影响。我们也尝试评估tile buffer内存的开销，因此我们使用了所研究的最大配置，其中包括每通道128个寄存器（译者注：这里“per lane”可能指“per thread”，与前文每个线程128寄存器的最大累加器配置对应）。

Figure 17的右图显示，在支持每个GPU核心32个Warp的情况下，向基线设计中添加操作数缓存寄存器和tile buffer最多占总 tensor core 面积的约25%，其余面积由计算单元占据。

随着计算能力的增加（更高的 DPlen），我们看到这个比例变得不那么显著；对于TC-32T-4LEN配置，本地内存开销约为10%。另一方面，左图提供了具有不同 NT 和 DPlen 配置但相同tile buffer配置的 tensor core 的硅足迹。作为参考，我们综合了具有不同线程配置的完整Vortex核心。我们使用Synopsys Foundation IP内存编译器生成了SRAM宏，特别是用于缓存和共享内存的R1PV，以及用于寄存器文件和tile buffer的SMPV。与Vortex核心相比，当 DPlen 分别等于2和4时，tensor core 约占单核心面积的40%和75%。

tensor core RTL是独立实现的，并将在未来的工作中集成到Vortex中。然而，我们为这种集成提供了考虑因素。当将 tensor core 作为附加功能单元集成时，分派逻辑和提交阶段将与其他单元共享。在Vortex中，每个额外的功能单元可能会在分派阶段以暂存缓冲器 (staging buffer(s)) 的形式需要额外的开销，这并未包含在估算中，因为它取决于所选的配置并且对所有功能单元是等效的。

RTL模型的性能与高层模型的性能非常匹配。由于 tensor core 是完全流水线化的，任何潜在的差异都将源于不同的操作延迟，这是由综合目标决定的算术单元流水线深度的函数。在协作Warp执行模式下，这对性能没有影响，因为 tensor core 的执行变得解耦了。在正常执行模式下，我们发现一些额外的延迟周期也不会影响性能，特别是在使用较多数量的Warp和/或更大的外积尺寸时。尽管如此，操作延迟是高层模型中的一个参数，可以进行调整以匹配综合的目标。

相关工作
其他 tensor core 模型，例如AccelSim [28] 和 gem5 [29] 中可用的模型，分别依赖于高级ISA（指令集架构）、PTX（NVIDIA的并行线程执行ISA）和VEGA（AMD的GPU架构）。因此，它们受到固定矩阵维度和特定GPU配置的限制。相比之下，我们的基础模型独立于这些限制进行操作，在矩阵维度和GPU配置方面都提供了更大的灵活性。

NVIDIA的Hopper [12] 架构引入了WG-MMA（Warp Group MMA）指令，为 tensor core 操作启用了Warp协作和异步执行。然而，这伴随着一些权衡，这可能限制其在高性能计算（HPC）和大型语言模型（LLM）训练之外的更广泛适用性。这些权衡包括：

- 使用标准MMA指令（使用RF）时 tensor core 利用率降低，仅达到峰值性能的62.9% [30]。
- 需要专门的张量内存加速器 (Tensor Memory Accelerator, TMA)。
- 由于增加了 tensor core 到共享内存的端口，导致互连复杂性和冲突增加。
- M和N维度的固定基础矩阵尺寸增加，降低了灵活性。 这种僵化性可能会在其他领域妨碍性能和/或适用性。相比之下，我们的设计将Warp协作的开销隔离在 tensor core 内部，允许设计者在不增加系统复杂性的情况下灵活地满足系统需求。我们的方法也为未来类似于Hopper的进一步增强提供了基础。其他工作 [31]-[33] 探索了通过使用寄存器重命名 (renaming) 和预取 (prefetch) 方案来消除寄存器文件中的冗余加载，从而提高 tensor core 利用率的方法。这些工作主要集中在通过修改流水线来实现性能提升。虽然流水线更改可以为特定优化带来好处，但它们通常缺乏通用性，并且可能无法很好地与其他不利用相同增强功能的流水线设计或应用程序集成，从而可能导致效率低下。相比之下，我们的方法涉及对GPU流水线的最小修改，将所有更改都包含在 tensor core 自身内部，同时通过在协作Warp执行模式下利用K维度划分来消除操作数重复。除此之外，我们还显著提高了 tensor core 的利用率。

结论
在本文中，我们向Vortex GPGPU平台引入了一个可配置的 tensor core。我们探索了各种 tensor core 配置与不同GPU架构的集成，并分析了它们的影响。在初步实验中，我们的发现表明流水线中存在严重的瓶颈，限制了性能。为了应对这些挑战，我们引入了 tensor core 中的协作Warp执行 (cooperative warp execution)，这是一系列新颖的软硬件技术集合。借此，我们能够以对GPU流水线的最小修改为代价，减少内存需求、提高 tensor core 利用率、隐藏停顿并显著提升性能。我们的结果突显了协作Warp执行在增强计算效率方面的潜力，以及其在不同 tensor core 和GPU配置下运行的灵活性。

问题
有两处致命的问题。

参考
https://github.com/BakrN/vortex

https://github.com/NikhilRout/TheTensorCoreProject

发布于 2025-10-10 14:15・广东
AI芯片

体系结构

CUDA

​赞同 161​​19 条评论​404 ​1 ​分享

​申请转载​​

未登录用户

19 条评论

默认
最新

ALKU选手

根特大学arch/sys方面的研究很强吗，我的老师就是这学校毕业的，那个老哥性格执拗。
2025-10-11 · 重庆

​回复​喜欢

Sisyphus

有一个大牛，赵夏老师的博导
2025-10-12 · 中国澳门

​回复​2

ALKU选手

别说没办法

只不过他们实验室有本科生，以做毕业设计的名义发taco这种还不错的刊物，说明这个老师还是有实力的。
2025-10-25 · 重庆

​回复​喜欢

查看全部 11 条回复​

nicholaswilde

感谢分享btw这篇论文只测了单SM的512*512*512矩阵乘吗，没有访存子系统和NoC，很多设计瓶颈都是单SM体现不出来的吧
2025-10-11 · 北京

​回复​喜欢

yahah

作者​

Givant

有，但是没继承，而且NB的地方在于他每个rf都加buffer
2025-10-20 · 广东

​回复​喜欢

Givant

yahah

问题是有增加的tensorCore的RTL实现吗

2025-10-13 · 上海

​回复​喜欢

展开其他 1 条回复​

躲起来

文章的论文可以发一下吗，谢谢

2025-10-10 · 北京

​回复​喜欢

yahah

作者​

​https://github.com/dzwduan/ai-core-notes/blob/master/Cooperative_Warp_Execution_in_Tensor_Core_for_RISC-V_GPGPU.pdf

2025-10-10 · 新加坡

​回复​3

躲起来

yahah

感谢

2025-10-10 · 北京

​回复​喜欢

关于作者

yahah​​
公众号: GPGPU架构分析

​中国科学院大学  计算机科学与技术博士在读

回答
83
文章
101
关注者
9,622

​关注​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

Shared Memory and Global Memory in CUDA Programming
CUDA Memory Usage(Introduction)Identifier __global__ and __device____global__表示GPU上执行，CPU上调用，返回值必须是void，并且是异步执行的__device__表示在GPU调用，GPU上执行的函…

FPGAp...发表于C++学习...

isca2019论文总结
Perceptron-Based Prefetch FilteringTexas A amp;M和Intel合作的一篇工作。硬件预取是隐藏cache miss带来的延迟的一种常见手段，在硬件预取过程中，存在两个重要的指标：覆盖率和准确率。…

何解发表于体系结构p...

CS336 | Lecture 2 Memory   Compute学习笔记
WhyWa...发表于CS336...

GPU高性能编程之overlap（二）
大家好呀，今天我们要 对上周挖的坑位进行回收~在 overlap（一）中进行了 Tensor Core 与 CUDA Core 并行，本章我们计划对 CUDA Core 与 IO 并行进行研究，并在下一章进行 Tensor Core 与 I…

大可pa