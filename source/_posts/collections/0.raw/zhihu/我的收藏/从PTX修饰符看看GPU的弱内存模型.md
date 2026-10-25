---
title: "从PTX修饰符看看GPU的弱内存模型"
date: "2026-01-10 00:00:00"
updated: "2026-01-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/从PTX修饰符看看GPU的弱内存模型/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1987244050529661562"
---


发现居然很少有科普文章来介绍PTX指令的一些基础知识，我这里试着写一篇来填补一下这里的空缺。

很多开发者对 PTX (Parallel Thread Execution) 的认知往往停留在基础层面，知道它是 CUDA 的中间汇编，熟悉 ld.global 或 fma.f32 等常见指令。然而，当翻阅 NVIDIA 的 ISA 文档（特别是针对 Volta 架构之后的版本）时，经常会遇到类似 red.release.gpu.global.add.f32 这样又长又复杂的指令格式。

PTX的设计初衷是构建一个稳定的、硬件无关的中间层，解耦软件生命周期与硬件迭代周期。然而，随着Volta架构引入独立线程调度以及Hopper架构引入更复杂的内存层级，PTX必须暴露足够的语义信息给后端编译器（ptxas），以便生成高效且正确的SASS代码。这就是 red.release.gpu.global.add.f32 这类复杂指令存在的原因。要透彻理解这些修饰符，必须将其映射到GPU的硬件存储层次与内存模型中

还是以这个reduction指令为例，我们可以看到，在指令之后是有大量的修饰符的。这些修饰符会在基础功能的基础上，描述指令在内存一致性（Consistency）、可见性范围（Scope）以及缓存策略（Cache Policy）等的具体行为，以适配不同的场景。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0a3e051f3a0f.jpg)

Reduction PTX 9.1要充分理解这些修饰符，其实会涉及到很多方面。

我们从几个比较重要的修饰符入手：

- <strong>State space (.space)</strong>：物理路由与存储位置。
- <strong>Scope (.scope)</strong>：一致性域与可见性范围。
- <strong>Semantics (.sem)</strong>：内存一致性模型与排序。
- <strong>Cache int (.level::hint)</strong>：缓存驻留与替换策略。

### State space

State space是逻辑上独立的内存区域抽象。每个状态空间具有不同的寻址方式、生命周期和访问权限。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ed52af08997.jpg)

State space introduction from PTX 9.1State space有以下几种：

- 寄存器空间 (.reg)： 这是最高速的存储空间，用于存放线程私有的标量或向量数据。在 PTX 中，寄存器是虚拟的（Virtual Registers），数量理论上无限，完全由编译器（Compiler）进行静态单一赋值（SSA）形式的管理。
- 全局空间 (.global)： 具有 Grid 级别的生命周期，所有线程均可读写。它是 GPU 与 Host 端通信的主要通道，但访问延迟最高。
- 共享空间 (.shared)： 具有 CTA（Cooperative Thread Array，即 Thread Block）级别的生命周期和可见性。它属于片上存储，用于同一块内的线程间通信与数据交换。
- 局部空间 (.local)： 这是最容易产生误解的空间。逻辑上，它是线程私有的（Thread Private），生命周期仅限于当前线程。但在物理实现上，不能简单理解为片上高速缓存。Local Memory Window in DRAM (Global Memory)，Local Memory 的访问是经过 L1 和 L2 Cache 的，正是因为 .local 实际上走了存储层级（L1/L2/DRAM），所以 Register Spill 对性能的杀伤力才这么大。
- 常量与参数空间 (.const, .param)： 分别用于存储只读数据和内核启动参数，通常具有特殊的缓存机制

### Scope

Scope是对GPU层次化硬件结构的直接抽象。同步指令必须指定作用域，以决定同步的范围。scope 修饰符主要用于涉及<strong>多线程交互</strong>或<strong>内存一致性</strong>的指令。普通的数据搬运（如简单的 ld/st）通常只关心 State Space，但在引入同步语义（如原子操作、栅栏、Acquire/Release）时，必须指定 Scope。

CPU中常见的强一致性（如顺序一致性SC）要求所有写入必须立即对所有核心可见，这需要广播并确认。不同于传统CPU所遵循的强一致性模型，GPU为了追求极致的吞吐量与掩盖高昂的内存延迟，采用了一种极其宽松的弱内存模型（Weak Memory Model）。

这种设计允许硬件在缺乏显式同步的情况下，对内存读写指令进行激进的重排序与缓冲。在强一致性模型（如顺序一致性SC）中，所有处理器看到的内存操作顺序必须与程序顺序一致。这要求每次写操作都必须广播并确认，会极大地限制指令流水线的吞吐量。所以对于GPU而言，弱内存模型基本是必然的选择。

PTX显式引入了Scope概念，来维护一致性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_83ec81554194.jpg)

Scope introduction from PTX 9.1

- <strong>.cta (Block级)</strong>： 对应物理上的<strong>L1/Shared Memory</strong>一致性。在同一SM内，利用L1作中转，延迟极低。
- <strong>.cluster</strong>。在 Hopper 架构中，Thread Block Cluster 引入了 Distributed Shared Memory (DSMEM)，允许 SM 之间通过 SM-to-SM Network 直接访问彼此的 Shared Memory。这是当前 GPU 编程的一个重要层级，介于 CTA 和 GPU 之间。
- <strong>.gpu (Device级)</strong>： 通常对应物理上的<strong>L2 Cache</strong>一致性。通过将脏数据刷出 L1 或使 L1 失效，确保在设备级（通常是 L2 ）的数据一致性
- <strong>.sys (System级)</strong>： 对应<strong>NVLink/PCIe</strong>互连的一致性。保证GPU与CPU或其他GPU可见。** 

### Semantics

但弱内存模型对软件提出了更高的要求。在弱内存模型中，程序员必须显式地使用同步原语来恢复顺序。这时候就涉及到了{.sem}，涉及到内存一致性模型。

- .relaxed**：无限制。硬件可以随意重排，只要保证单线程逻辑正确。性能最好，但多线程交互时不可靠。
- <strong>.release (写操作)</strong>：写屏障。保证“我之前做的事，大家都看到了，我才能做这一步”。比如st.release，这是一个带有Release语义的写操作，它保证在它<strong>之前</strong>（程序顺序）的所有内存读写操作，在该Release操作对观察者可见之前，都已经完成。
- <strong>.acquire (读操作)</strong>：读屏障。保证“这一步读到了确认信号，我才能做后面读数据的事”。比如ld.acquire，这是一个带有Acquire语义的读操作，它保证在它<strong>之后</strong>（程序顺序）的所有内存读写操作，必须在该Acquire操作完成后才能开始。
- <strong>.acq_rel</strong>：同时具备上述两者（通常用于 Read-Modify-Write 操作）。
这里举两个例子。一个是weak memory order下可能出错的例子，一个是有acquire和release语义的来保证正确性例子，来说明这个问题会比较直观。

<strong>无同步（功能上可能出错）：</strong>

// Thread P0
st.global.b32 [data], 42;
st.global.b32 [flag], 1;  // 可能被重排到data之前！
 
// Thread P1
ld.global.b32 r1, [flag];
setp.eq.s32 p1, r1, 1;
@!p1 bra loop;
ld.global.b32 r2, [data]; // 可能在flag之前被推测执行！

在弱内存模型下，P1可能读到 flag=1 但 data=0。原因可能是P0的写缓冲乱序刷出，或者P1的读取指令被乱序执行。

<strong>正确做法（采用Release/Acquire语义）：</strong>

// Thread P0
st.global.b32 [data], 42;
// Release保证data的写在flag写之前对.sys范围可见
st.release.sys.b32 [flag], 1;
 
// Thread P1
loop:
// Acquire保证后续对data的读不会重排到flag读之前
ld.acquire.sys.b32 r1, [flag];
setp.ne.s32 p1, r1, 1;
@p1 bra loop;
ld.global.b32 r2, [data];

在这里，通过st.release 和 ld.acquire保证了weak memory model下程序的功能正确性。

同时我们还可以看到，这里使用了.sys，也算是我们前面scope语义的一个补充示例。此时若使用st.release.cta，硬件仅需确保写入对<strong>当前 SM</strong> 可见，数据完全可能滞留在本地 L1 或写缓冲中，而未被强制刷新至全局共享的 L2 Cache。这意味着，位于另一个 SM 的 P1 根本无法观测到这一更新。因此，涉及 Global Memory 的跨 Block 通信，必须使用能穿透至 L2 层级的 `.gpu` 或 `.sys` Scope，以强制维护<strong>全局一致性</strong>，而非仅仅是 Block 内的局部一致性。

### Cache Hint

最后还有一个Cache Hint修饰符也比较常见，会和性能调优有一些关系。可以通过这个修饰符告诉cache你更倾向于驻留与替换的策略。另外强调这是Performance Hint，硬件<strong>不保证</strong>一定执行，虽然大多数时候会遵循。

常见的 Cache Hint 包括：

- <strong>.ca (Cache at all levels)</strong>： 这是默认行为。数据会被缓存在 L1 和 L2 中。适用于具有良好时间局部性（Temporal Locality）、会被反复读取的数据。
- <strong>.cg (Cache at global level)</strong>： 绕过 L1，只在 L2 中缓存。当访问非局部性数据（如大数组的随机访问或单纯的数据搬运）时，如果不希望这些数据挤占宝贵的 L1 空间（L1 在 GPU 上通常与 Shared Memory 共享物理存储，且用于处理 Register Spill），使用.cg可以有效减少 Cache Pollution。
- <strong>.cs (Cache Streaming)</strong>： 流式数据提示。提示硬件该数据是流式的，可能只会被读取一次。硬件可能会分配临时的 cache line，并赋予其最高的替换优先级（LRU 最先被踢出），以避免将常驻数据挤出。可以用于大矩阵搬运或向量加法中的输入数据
- <strong>.lu (Last Use)</strong>： 最后一次使用。提示硬件该数据读取后不再需要，可以立即从缓存中逐出（Evict），为其他数据腾出空间。在寄存器压力大需要 Spill 到 Local Memory 时，恢复数据后的读取操作通常会带上 `.lu`；或者在 Tiling 分块算法中，当前 Tile 计算完成后，显式标记数据失效。
- <strong>.cv (Cache as Volatile)</strong>： 易失性访问。类似于 C++ 中的 volatile，强制每次从 DRAM 读取，忽略 L1 缓存（或将其视为 Write-Through）。