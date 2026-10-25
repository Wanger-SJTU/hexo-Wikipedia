---
title: "《GPGPU的性能分析和调优》"
date: "2025-03-07 00:00:00"
updated: "2025-03-07 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/《GPGPU的性能分析和调优》-6ecb23/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/25832322272"
---


本文详细全面的介绍了GPGPU的一些基础知识，以及性能调优相关的内容，特别是还给出了一个GPGPU的analytical performance model，实现结果也表明其和真实硬件的结果基本一致，虽然出版时间较久，但其核心内容仍适用于现代GPGPU，是关于GPGPU为数不多的好书。

具体是Synthesis Lectures on Computer Architecture系列中《Performance Analysis and Tuning for General Purpose Graphics Processing Units》书籍的读书笔记，其与2012年出版，添加了部分自己理解，留作记录也供一起学习。

### 1. GPU设计、编程和趋势

#### 1.1 GPU的简短历史

如名字一样，早期的GPU针对图像卡设计用于加速图像的渲染和现实，这些早期的GPU拥有固定的图性pipeline，之后随着硬件发展而演变为可编程core。

- 第一个GPGPU编程接口只限于shader，从而编程者只能优先的利用图性pipeline运算来完成一些有限的通用计算。
- 之后再C语言中增加了stream扩展以抽象除硬件细节
- 接着在stream基础上提供了数据并行和聚合运算操作
- 但真正引起质变的还是NVIDIA的G80系列，引入了CUDA语言
- 之后也出现一些更加通用的异构计算编程OpenCL、OpenACC等

#### 1.2 GPU系统的简要概述

下图是一个经典的GPU系统，即使现在也是，不过会在这个基础上增加多个GPU并GPU之间存在C2C互连。其中，在需要的时候CPU将workload卸载到GPU，等待完成后再取回，其中PCIe的通信带宽往往会称为瓶颈。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c04ced3f131a.jpg)

### 1.2.1 GPU架构概述


下图是G80 GPGPU的主要组件，其中包含一系列的SM(streaming multiprocessors)连接到外部DRAM，每个SM中又包含很多SIMD单元，称为SP(Stream Processor)，并支持多线程和0开销线程切换。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c0687fe185da.jpg)

GPGPU的两个重要基础范式：

- SIMD/SIMT：

- SIMD即取单个指令，译码后将多个并行的相同类型数据执行同样的操作。而SIMT则更多将每个数据比作一个线程，线程之间可以执行不同的指令，同时可以按不同规模组织线程，更加灵活，SIMT是CUDA编程的基础。
- 私认为，SIMT更多指的是编程模型，SIMD更多指的是底层硬件实现，而真正的GPGPU硬件实现的底层大都还是利用了SIMD实现，以及SIMT Stack和predicate寄存器来实现Branch

- Multithreading

- 都说GPU对访问latecny不那么敏感，其实靠的就是硬件多线程，可以在多个线程（硬件底层大多以Warp为单位）之间进行0延迟的切换，从而充分利用计算单元，当然，这也使得需要大量的寄存器来保存不同thread的中间变量而不需要上下文切换。
- 当然之所以能使用这种方式还依赖于应用层的需求，比如图像处理或者现在的AI应用本质上都可以提供大量执行相同运算的并行线程，所以才可以利用大量线程切换容忍延迟。而CPU就不能这么做，目前主流的COU也都支持超线程，但通常只有个，这也是由具体应用所决定的。

#### 1.3 GPGPU编程模型：CUDA

### 1.3.1 Kernels


CUDA程序包含运行在host上的代码以及运行在device侧(GPU)的kernel。下图是CUDA代码的编译过程。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_210dd252e0b6.jpg)

下图则是CUDA代码执行的基本流程，CPU串行运行控制程序，通过`funcKernel >>(args)`语法调用GPU执行大量并行线程计算，依次穿插。其中，这样一个kernel称为`grid`，图片里这共包含两个`grid`。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_169bcfa0e2c3.jpg)

### 1.3.2 CUDA的Thread层次


CUDA执行层次包括3级：Thread、Block和Grid，其中多个Thread组成Block，多个Block组成Grid。且该执行模型与memory space、Synchronization、dispatch/retirement granularity紧密耦合，且在真实的硬件中部分线程lock-step执行，称为Warp，即SIMD的执行方式(这是硬件实现的概念，不同于软件编程中的block，真实硬件中一般由多个硬件中的warp组成一个软件中的block)。

执行一个`funcKernel >>(args)` kernel，则存在dimGrid个block，每个block内又存在dimBlock个thread，所以整个kernel会调用`dimGrid x dimBlock`个thread。

并行执行并不意味着每个thread在每个cycle都在执行，而是这些thread都处于active状态，但真正执行是通过warp间时分复用完成。

- 软件角度：Block是一组线程的组合，可以对这些线程之间进行细粒度的控制，且Block是dispatch和retirement的单位。
- 硬件角度：一个Block通常被分配到一个SM，所以其内所有Thread可以使用Barrier指令进行同步，如下图。
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_464e0ea486c7.jpg)

CUDA并不指定Block之间的执行顺序，所以任意数量的Block都可以在硬件上执行，这种灵活性使得硬件实现非常灵活，可以根据实际硬件资源来同时执行不同数量的Block，如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ada4ea4f4c3d.jpg)

### 1.3.3 内存层级


每个线程都有自己私有的register和local memory，每个Block又自己的share memory，由自己内部的thread共享。整个kernel还共享global memory。另外还有constant memory和texture memory，它们都是只读，只能由Host写入，constant memory存储一些常数变量，texture memory 存储一些纹理数据用于图像处理。各级memory比较如下表。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_211ae5d821ef.jpg)

### 1.3.4 SIMT执行


高层次上看，GPU的编程模型属于SPMD(Single Program Multiple Data)，一个kernel函数定义的程序可以被成千上万个细粒度的线程所共用。这就需要大多数的线程都执行相同的工作，因此一组线程可以以lock-step的方式执行，对不同的数据执行同一个指令，从而引入了warp的概念。

SIMT在概念上则类似于SIMD，不过可以更加细粒度的控制线程执行不同的工作，而传统的SIMD则在ISA级别就定义了一条指令作用与固定向量位宽的数据，而不够灵活（不过最近的发展，两者之前的区别越来越模糊，比如RISCV的RVV也可以灵活支持不同位宽的向量，并且可以支持mask等）。在warp内，通过predicate寄存器来支持bran指令，if指令内的分支也称为`divergent branches`，如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a56dc0f0dafe.jpg)

### 1.3.5 CUDA语言扩展


CUDA扩展了C的函数声明语法，不同关键词如下表。`__global__`, `__device__`和`__host__`分别直到编译器生成kernel函数、device函数以及host函数。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_744de214dd23.jpg)

另外一个非常重要的拓展是使用内置变量来表示线程：`threadIdx`, `blockIdx`和`blockDim`。硬件中的不同线程看到不同的内置变量，并对应于不同的硬件寄存器。这些值可以使得不同线程计算自己不同的与data的映射，即寻址地址。

### 1.3.6 向量加法示例


传统的C语言实现的向量加法如下图，使用了for循环。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6a28799cb92f.jpg)

同样的功能移植到CPU+GPU异构系统中，CPU侧代码如下，用于控制GPU启动和收集结果。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c25c4e99e0f7.jpg)

GPU侧代码如下，负责执行具体的向量加法kernel。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f72b5e56c55a.jpg)

真实硬件中，CPU和GPU都有各自独立的内存空间，GPU侧内存称为`global memory`或者`device memory`。所以第一步编程者需要在device memory分配内存并将数据从CPU传递到GPU。同样在GPU计算完成后，需要将结果取回并释放GPU内存。CUDA rumtime提供了管理device memory的API。

在CUDA的SPMD/SIMT编程模型中，每个线程对不同数据进行操作。为了将thread映射到data，CUDA利用内置变量来标识thread进而计算地址，向量加的示例如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cf8b859e20f5.jpg)

### 1.3.7 PTX


PTX是NVIDIA GPU架构的虚拟ISA。编译器会再将PTX转为GPU特定的ISA。

### 1.3.8 Consistenct模型和特数的内存运算


CUDA并没有指定一个memory consistency model。同时CUDA也提供了`_threadfence()`和原子操作用于同步，两种通常一起使用比如：

- store data
- `_threadfence()`
- atomically mark a flag 这些步骤可以保证如果其他block可以看到flag，则它也可以正确的看到data。
### 1.3.9 IEEE浮点支持


早期的GPU并不支持IEEE浮点，因为这对于图像处理不是必须的。之后GPGPU的出现，开始支持IEEE浮点，包括FP16, FP32, FP64等。另外还有近些年AI应用伴随的FP8，甚至FP4。

### 1.3.10 OpenCL执行模型


OpenCL采用了类似CUDA的结果，但是承诺了跨平台的可移植性，包括NVIDIA GPU、AMD GOU和多核CPU等。下表则展示了OpenCL和CUDA的对比，两者模型很想，术语略有不同。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cac1aed1c95f.jpg)

#### 1.4 GPU架构

本章主要以NVIDIA Tesla/Fermi架构为基础介绍，虽略有过时，但与现代主流GPU架构的基础是一样的。

### 1.4.1 GPU 流水线


下图展示了一个SP的流水线架构，基于in-order调度，和传统的CPU架构很像，包括fetch、decode、scheduler、register read、exection和write back。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cbd36468e560.jpg)

<strong>取值和译码阶段</strong>

front-end和传统的多线程架构类似，存在多个PC以支持多个warp，scheduler选择其中一个warp执行。可以使用round-robin或者贪婪算法，因为存在多个warp所以在发生长时间访存时可以切换到另一个未阻塞的warp执行，从而可以对访存延迟不敏感。所以分支预测的角色没有CPU中重要，可以留更多面积给计算单元。

实际上，现代GPGPU通常可以在一个周期处理多个warp指令，需要更复杂的scheduler。

<strong>Scheduler和score boarding</strong>

scheduler顺序进行调度，并通过score boarding以查找哪个warp处于ready状态。所以单个warp内时顺序执行，但是warp间为乱序执行，所以从程序员的角度来看，整个kernel还是乱序执行，如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_881bf5c75507.jpg)

<strong>coreboarding</strong>

scoreboarding是一种用于实现动态调度的方法，由CDC6600首次引入。它可以检查RAW和WAW数据依赖，不提供寄存器重命名，但是只要没有conflict就可以实现乱序执行。但是在GPU中，不需要乱序执行，所以只用于检查RAW和WAW冒险。

<strong>寄存器读写</strong>

为了容纳大量的active线程，GPU需要一个非常大的寄存器文件，且由于计算单元多，还需要提供多个读写端口，所以需要提供非常大的带宽。为此需要使用multiple bank和人operand buffer/collector技术。

<strong>Multiple banks</strong>

通过将register file分为多个bank，可以提供更大带宽，如下图左侧，warp内每个thread对应一个bank，从而可以一个周期完成N个thread寄存器的读。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_242c212ff255.jpg)

<strong>Operand Buffer</strong>

如上图右侧，register file和执行单元中间存在一个operand buffer，使得可以缓存一定的register值，减轻register file的读压力。同样的operand collector缓存计算结果，减轻register file的写压力，同时还有利于forward 网络的搭建。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d1ae9443f60e.jpg)

<strong>Register File Cache</strong>

和传统cache类似，用于减轻寄存器读写。

<strong>执行阶段</strong>

包括memory unit和function unit，这里只介绍functionunit，memory unit在后文介绍。采用向量处理器单元实现，可以使用与warp内thread数量相同的执行单元来每个cycle处理一次或者使用少数执行单元来多个始终周期处理一次。

<strong>back-to-back 操作</strong>

为了消除RAW冒险，需要Forward网络，但因为GPU的执行单元较宽，从而造成一些困难。

<strong>特殊功能单元</strong>

用于实现一些特数的超越函数或者三角函数的计算，这些运算占比相对较低，对应执行单元的硬件配比也相对较低，可能几个cycle才执行一条指令。

### 1.4.2 处理分支指令


因为每个warp内的thread共用一个指令，所以，当该指令是branch时，warp内的指令会执行不同的指令路径。对于向量处理器，或者说RISCV的RVV扩展，通过predicated来mask掉部分SIMD执行单元，但是对于SIMT来说，还需要考虑另一个问题：<strong>需要从不同的路径取指</strong>。这个是SIMD和SIMT之间的主要区别。branch分支条件示例如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_22f5cabb83ca.jpg)

一种常用的解决办法时SIMT Stack，执行到branch指令时，记录下重聚点，先执行一个分支，部分线程执行到重聚点后在执行另一个分支，当所有线程执行到重聚点之后即可以merge，之后所有的thread又可以lock-step执行。

下图展示了一个SIMT Stack处理branch的示例。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cb59674a6301.jpg)

stck中每个entry包含3个字段：

- 重聚点的PC
- mask
- 下一个PC 当处理器执行到branch指令时jiangjoin entry 推入stack，之后处理器选择一条路径，同时将另一条路径的信息入栈（这里先执行B路径）。执行时，检查next PC和重聚点PC是否相等，相等则表示执行完分支。执行完B之后，发现下一个指令时C，继续执行，执行完C之后发现branch执行完毕。
可以看到，在执行一层if分支时，性能会减半，因为warp内一些thread执行被mask掉，所以还有一些硬件/软件方案来避免性能下降，但在商用产品中上边传统方法的应用更多。

### 1.4.3 GPU内存系统


现在主流的L1 Cache多是software-hardware混合管理方案，即一部分时传统cache，一部分是scratchpad cache，由软件显示搬移数据。Tesla和Fermi架构中不同memory如下表。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e134094c1283.jpg)

<strong>DRAM System</strong>

目前主流GPGPU使用的时HBM，如果是低成本推理芯片则可能使用GDDR或LPDDR（原文中仅说了GDDR，不符合现现代实际情况）。

<strong>Multiple Memory transactions</strong>

对于SIMD执行单元来说，如果访问数据时register，访问的位置已硬件固定分布在不同的bank，这不会造成问题。但是如果时memory access，则因为每个thread有可能生成任意地址的访问，则情况变得复杂，这也是影响GPU性能的重要因素。如果memory是顺序访问则只会产生少数几个transaction，但如果是分布式的，则会造成很多transaction。CUDA还将其分为coalesced和uncoalesced memory地址，其中coalesced生成1-4个transaction，uncoalesced产生最多32个transaction如下图。通常需要专门的硬件来尽可能多的合并这些memory访问。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4aa65826794e.jpg)

<strong>多个in-flight内存访问</strong>

即使warp内顺序执行，但仍会发生多个内存请求，直到发生RAW依赖。这种方式可以增加in-flight内存请求的数量，尽可能增加MLP。如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cf3770370a46.jpg)

#### 1.5 其他GPU架构

### 1.5.1 Fermi架构


G80系列产品基于Fermi架构，发布于2010年。提供了两级cache、提升FP64性能、更快的原子操作、ECC。

### 1.5.2 AMD 架构


AMD架构的最大特点是融合了GPU和CPU，共用memory，并使用VLIW。

这里介绍的还是AMD上一代GPU架构，其采用了VLIW。但目前最新的CDNA架构已经摒弃该设计，所以这些内容已过时。

### 1.5.3 许多集成的core架构


Intel MIC(Many Intergrated Core)利用x86 ISA和SIMD来做高性能处理。现在也被摒弃，使用新的Gaudi系列GPU。

### 1.5.4 在同一个Die上集成CPU和GPU


目前GPU受Die面积限制进而影响性能，所以也不是主流，但集成在一个电路板或者die间互连CPU和GPU是一个方向，比如NVIDIA Grace-Hopper系列。

### 2. 性能准则

#### 2.1 理论：算法模型概述

决定任意算法性能的两个最重要的特性是：

- 可以利用多少并行
- 必须通过memory hierarchy搬运多少数据

#### 2.2 描述并行性：work-depth模型

在work-depth模型中，我们使用DAG(Directed Acyclic Graph)模型表示，如下图。其中每个节点表示一个单位成本的运算，有向边表示运算之间存在严格依赖。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d1cd6d8a26a1.jpg)

  $$给定一个DAG，使用W(n)测量该work大小，用D(n)来表示其depth或span。其中D(n)则代表最小执行时间，W(n)/D(n)则达标了平均并行度。设由p个相同的处理器，则执行时间可表示为  T_{comp}(n;p)=D(n)+\frac{W(n)-D(n)}{p}. $$

另外，为了提高并行度，并不能一味的增加无效W(n)，这也称为work-optimality。简单的例子：设>p\times D(n)">W(n)>>p\times D(n)，并行算法的W(n)和串行算法W(n)之间的关系是W(n)=\epsilon W_0(n)，则加速比是W_0(n)/(W(n)/p)=p/\epsilon，也就是说p个处理器的加速比还要被\epsilon衰减。

<strong>例子：Reduction</strong>

假设要计算n个值的和，顺序算法如下图所示，其W(n)/D(n)是一个常数。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_551cdc57b884.jpg)

并行算法的DAG如下图，使用了tree结构，其W(n)/D(n)=O(n/logn)，随着输入n增大而增加，具有更高并行度。16节点为例W(16)/D(16)==6.2，所以平均是6个节点看了一并行处理，超过6个处理器也不再能获得性能提升。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1f4683b3b2c7.jpg)

<strong>例子：矩阵乘</strong>

考虑如下图所示的n\times n矩阵乘。其中W(n)=O(n^3)，D(n)=O(logn)两者比值随n的增大而快速增加，也证明了矩阵乘的并行性非常高。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f3edaaba27df.jpg)

#### 2.3 描述I/O行为：外部内存模型

除并行性外，数据搬移是另一个算法重要特性。考虑如下图所示的两级内存模型，core为顺序执行，且运算只能作用域fast memory。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_535bfe1ecea4.jpg)

需要考虑在slow memory和fast memory之间的大小为L words的数据传输。以该模型设计算法时，除了测量W(n)外，还需要测量Q(n;Z,L)（表示大小n的输入时，在两个memory之间L-sized传输的次数）。最终，除了考虑2.2中介绍的work-optimality，还需要尽可能提高算法的computational intensity，即W(n)/(Q(n;Z,L)\times L)。也成为运算访存比，或者`flop-to-byte`比。

<strong>例子：Reduction</strong>

这次考虑Reduction的I/O行为。设Z>L">n>Z>L，具有Z个输入节点的约简树被连续的存储在slow memory中，需要Z/L次数据传输和Z-L次加法运算。任意n个元素约简可分解为n/Z个部分约简树，所以Q(n;Z,L)=n/L次传输，和W(n)=n-Z次加法运算。计算Intensity为1-\frac{Z}{n}=O(1)，其时一个常数，而与fast memory大小和L无关。所以，对于可以提供该算力的架构，继续增加更多的cache或者line size，并不能根本上提高性能。（注意这里按照原文里翻译，对于变量Z其既代表fast memory的容量也代表约简子树的个数，有些混乱，请注意区别）

<strong>例子：矩阵乘</strong>

对于矩阵乘，Q(n;Z,L)=O(n^2/L)，所以Intensity为O(n)。

考虑两个不同的算法，第一个算法是2.2节算法，对于每一个计算结果进行大小为n的乘法缩减，此时的intensity为上述的O(1)，所以还存在更好的算法。如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_270fda8fabf3.jpg)

该算法按Block更新矩阵C，而不是之前的单个元素。其中

- block大小为b\times b
- fast memory可以同时存储3个Block
- Block连续存储，所以一个Block需要b^2/L次传输
可以得到Q(n;Z,L)=O(n^3/(L\sqrt{Z}))，从而Intensity为O(\sqrt{Z})。如果Z=O(L^2)，则该算法效率高很多。

相比之下，I/O的分析要复杂很多

- I/O分析与处理器的参数有关，而work-depth则独立于处理器数量
- 上边两个例子都假设了数据连续分布，所以真实场景还需要考虑数据的布局
- 对于不同的体系结构细节，都有不同的分析结果
另外，以矩阵乘为例，double 快速memory容量Z带来的收益是\sqrt{2}而double 位宽L也可以直接带来饭呗收益，所以同样条件下L的收益更高。<strong>这也是GPU设计更倾向于增加MLP(更大的L)而不是更大的Cache(更大的Z)的一个底层原因</strong>

#### 2.4 并行性和I/O效率的综合分析

对于将两者合并到一起分析的模型还有一些因素需要重点考虑：

- 考试私有cache还是共享cache
- I/O传输是否包括latency和bandwidth等带宽
- 算法是资源感知还是资源无感的
- 是否将调度策略作为执行模型的一部分考虑

#### 2.5 抽象的和具体的测量

上边描述的work、depth、I/O以及cache miss都是比较抽象的评估。更加具体的评估方法是直接计算I/O所需的时间和计算所需的时间，只要I/O所需的时间小于计算所需的时间就证明可以全力运行。

### 3.从理论到实践：分析和调优

该章节按照上边第2章的方法具体介绍了将n体例子模拟（快速多极子方法）部署到GPGPU中的实践过程。笔者主要关注硬件，而对对该物理方向的算法也不熟悉，所以掠过该章节，有兴趣的同学请自行查看原文。

### 4. 使用详细的性能分析来指导优化

本章主要考虑可进行性能优化的低层次方法。

#### 4.1 指令级分析和调优

### 4.1.1 执行时间建模


总的执行时间可以表示为T_{exec}=T_{comp}+T_{mem}-T_{overlap}.，如下图所示。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a16e20807c10.jpg)

<strong>计算成本T_{comp}</strong>

 将计算成本分为两个部分：可并行的基本执行时间加上串行影响的开销  T_{comp}=W_{parallel}+W_{serial} 

具体的：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fb5074f090c3.jpg)

<strong>内存访问成本T_{mem}</strong>

T_{mem}是内存访问数量、每个请求的延迟以及MLP的函数，具体的

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c3fe8a959173.jpg)

<strong>重叠成本T_{overlap}</strong>

T_{overlap}表示有多少访存的成本可以被计算覆盖，具体的

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_9ad1003c89ac.jpg)

<strong>潜在的收益</strong>

当可以消除理想性能与当前性能之间差异的时候，用于衡量其性能提升，下边最开始两个式子分别评估理想的计算性能和理想的内存性能。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8a6079ce6caf.jpg)

此外，以上所有中参数的解释如下表。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3b36167ebb9c.jpg)

### 4.1.2 应用该模型到FMM


下图展示了不同优化方案下，上边analytical预测模型和真实硬件性能的结果对比，可以看到以上模型已经可以很好的拟合真实硬件的性能。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_949f38bdbba6.jpg)

### 4.1.3 性能优化指南


基于上边的性能模型，可以识别出性能的bottleneck以及消除这些bottleneck的收益。其中，4个潜在的潜在收益指标如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e05b13f4910a.jpg)

其中x轴和y轴相加表示程序的执行时间，A点表示某个程序，但是因为使用多线程时，可以隐藏一定访存成本，所以降低到A'，y=x的曲线将整张图话扽为compute bound和memory bound两个区域。T_{fp}和T_{mem_min}分别代表理论最低的计算和访存成本。

4个B开头的收益因子旨在量化特定部分可以改进的程度：

- B_{itilp}表示通过增加线程间指令级并行的潜在收益
- B_{memlp}表示通过增加访存并行的潜在收益
- B_{fp}表示去除计算无关指令的潜在收益，但不可能达到100%，因为需要控制指令和数据搬移指令
- B_{serial}表示消除由于同步或资源冲突引起的串行执行引起的开销的潜在收益
不同的指标描述可见下表。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_00672ad5670f.jpg)

下图展示了在应用shared memory之后，真实测试和B_{itilp}的归一化结果。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_25e591a1d173.jpg)

baseline优化前的4种指标分别为：B_{itilp}=6068，B_{memlp}=0，B_{fp}9691，B_{serial}6068。其中共享内存的使用增加了数据的复用，所以可以增加ILP，从图中也可以看到指标可以很好的预测。

#### 4.2 其他的性能建模技术和工具

（这里笔者仅描述几个常用的）

### 4.2.1 有效的性能可见性


GPGPU里存在大量的DLP、ILP和MLP，如下图，最直接的就是通过程序员查看代码进行调优，是比较困难的。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_846e6c5f9199.jpg)

### 4.2.2 WFG(Work Flow Graphs)


类似于DAG的方式，比较低效，不够直接。

### 4.2.3 Stochastic memory hierarchy model


通过硬件内置性能寄存器+软件测试和显示的方式显示具体bottleneck。

### 4.2.4 Roofline 模型


CPU和GPU领域应用都很多，可以标识是memory bound还是compute bound，如下图。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_279ba4b6defc.jpg)
