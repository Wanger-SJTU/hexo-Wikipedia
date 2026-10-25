---
title: 理解Tensor Core
date: "2019-07-30 00:00:00"
updated: "2019-07-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/理解Tensor-Core/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/75753718
---


作者： 汪岩

原创内容，转载请注明出处

GPU已经广泛用于深度学习模型训练。针对深度学习模型中常见的tensor操作，GPU厂商在软硬件设计时都做了特别优化以加速计算。为此，Nvidia在其Volta架构中引入了Tensor Core这一特殊功能单元，使得Tesla V100的峰值吞吐率可以达到Tesla P100 32位浮点吞吐率的12倍，开发者也可以利用混合精度在不牺牲精度的情况下达到更高的吞吐率。Tesla Titan V GPU中包含640个Tensor Core，分布于80个SM中，每个SM包含8个Tensor Core。在1530MHz下的理论性能可达125 TFLOPS。

本文主要参考《Modeling Deep Learning Accelerator Enabled GPUs》，结合自己的理解，分析了Tensor Core的基本设计，详细描述了tensor操作在Tensor Core上的执行过程。

CUDA 9.0引入了一个“warp矩阵函数” C++语言API，以便开发者可以使用GPU上的Tensor Core。该API也被称为WMMA（Warp-level Matrix Mulitply and Accumulate）API。通过WMMA API，开发者可将D = A × B + C当作warp操作，其中的A、B、C、D都是更大矩阵的tile。通过WMMA API，warp的所有线程可以合作完成在这些tile上的矩阵乘加操作。CUDA 9.0 WMMA API的tile大小有限制为16×16×16。tile的大小用M×N×K表示，A的维度是M×K，B的维度是K×N，C和D的维度是M×N。

每个tile可以进一步分割为fragment，每个fragment是映射到线程寄存器的一组tile元素。因此，输入矩阵的分布是跨线程的，每个线程只包含一部分tile。一个16×16的tile包含256个元素。warp（包括32个线程）中的每个线程在8个GPR（General-Purpose Register）中保存一个8（256/32=8）元素的fragment。

CUDA WMMA API提供三个新方法：load_matrix_sync,、store_matrix_sync 和mma_sync。这三个方法在计算出结果前会执行一个隐含的warp barrier同步。load_matrix_sync,、store_matrix_sync方法用于载入和保存线程可访问GPR中的一部分输入矩阵。mma_sync方法执行warp同步矩阵乘加操作，在GPR中产生一个M×N（如16×16）的结果D矩阵。

![](https://pic2.zhimg.com/v2-f7719484f20fc0e6da8130ff40cb652d_1440w.jpg)Nvcc编译器将CUDA代码编译为主机端代码和设备端代码。设备端代码首先编译成设备无关机器语言指令集，即PTX（Parallel Thread eXecution），然后再编译成设备相关机器码SASS。

为了在PTX级别执行操作Tensor Core，在PTX 6.0引入了三个PTX指令，如下所示：

wmma.load.a.sync.layout.shape.type ra, [pa] {stride}; 

wmma.load.b.sync.layout.shape.type rb, [pb] {stride}; 

wmma.load.c.sync.layout.shape.type rc, [pc] {stride}; 

wmma.mma.sync.alayout.blayout.shape.dtype.ctype rd, ra, rb, rc; 

wmma.store.d.sync.layout.shape.type rd, [pd] {stride};

其中，“sync”标识符表示指令等待warp中所有线程同步后才开始执行。PTX手册中将tile称为“操作数矩阵”。“layout”标识符标识操作数矩阵是以行主序或列主序的形式保存在内存中。“shape”标识符表示操作数矩阵的fragment大小（如，16×16×16表示为m16n16k16）。“type”标识符表示操作数矩阵的精度，如FP16或FP32。在Volta架构中，矩阵A和B必须是FP16，但C可以是FP16或FP32。

在矩阵乘操作之前，操作数矩阵A、B、C必须从内存加载到寄存器文件中，这由三个PTX指令wmma.load.a、wmma.load.b、wmma.load.c完成。wmma.load.a将矩阵A加载到寄存器ra中，wmma.load.b将矩阵B加载到寄存器rb中，wmma.load.c将矩阵C加载到寄存器rc中。ra、rb、rc表示GPR集合，这些GPR集合分布跨warp（对应fragment，每个warp线程持有一个fragment）线程。PTX指令中的pa、pb、pc代表保存操作数矩阵A、B、C的内存地址。

从内存载入的输入tile是一个更大矩阵的一部分。为了帮助访问tile，wmma.load和wmma.store支持stride内存访问。PTX指令中的“stride”操作数指定了每行/列的起始位置。

wmma.mma指令执行warp级别的矩阵乘累加操作。这个指令使用寄存器a、b、c分别保存矩阵A、B、C，计算结果保存在寄存器d中。

每个时钟周期，每个Tensor Core可完成一个4×4矩阵乘累加（MACC，Matrix multiply and Accumulation）计算。其中A、B、C是如下图所示的4×4矩阵。WMMA API暴露给Tensor Core的tile大小（16×16）显然比Tensor Core每次操作的矩阵大小（4×4）更大。因此，每个wmma.mma操作需要<strong>64</strong>个Tensor Core操作才能完成。

![](https://pic2.zhimg.com/v2-5ef9c48eef7a227de017ccb8fd82532d_r.jpg)在Tensor Core的MACC操作中，矩阵A的fragment包括8个FP16*2元素（即16个FP16元素），矩阵B的fragment包括另一8个FP16*2元素，以及针对FP16累加的4个FP16*2元素，或针对FP32累加的8个FP32元素。

下图中大矩形1表示操作数矩阵A、B，其中较小的方形表示操作数矩阵中的元素，位于同一行的元素在内存中位置连续。每个threadgroup（warp的32个线程分为8个threadgroup，每个threadgroup包含4个线程）加载一个<strong>4×16</strong>子矩阵，这个子矩阵称为segment（对应大矩阵1中的4个不同色块）。4个segment组成了一个操作数矩阵。

![](https://pica.zhimg.com/v2-43a8e71c25a4a6ced7a180cffc4e51b6_r.jpg)上图中的矩阵2、3显示了segment中的元素在threadgroup中的各线程间的分布。对于Volta，每个segment由两个不同threadgroup加载，即，A、B矩阵的元素由同一warp中的两个不同线程加载。例如，A矩阵的前四行由threadgroup 0和threadgroup 2加载。

行主序布局保存的A矩阵元素的线程分布和列主序布局保存的B矩阵元素的线程分布相同。对于行主序布局的矩阵A ，threadgroup中的每个线程使用2个合并的（coalesced）128位宽load指令加载16个连续元素（图中标记2）。对于列主序布局，threadgroup中的每个线程使用4个合并的64位宽load指令加载4块4个连续元素（图中标记3），每个load指令的stride是64个元素。对于矩阵C，每个threadgroup加载1个8×4的segment。

wmma.load和wmma.store PTX指令拆分为一组SASS load（LD.E.64，LD.E.128，LD.E.SYS）和store（ST.E.SYS）指令。这意味着Tensor Core是直接从GPU寄存器文件访问操作数矩阵。wmma.load.c拆分为一组LD.E.SYS指令。对于矩阵A、B， wmma.load拆分为4个64位宽load指令（LD.E.64）或2个128位宽load指令（LD.E.128），视矩阵布局是行主序还是列主序而定。

wmma.mma PTX指令通过HMMA SASS指令实现。每个HMMA指令有4个操作数，每个操作数使用一对相邻寄存器，但在HMMA指令中只用一个寄存器的标识符表示。例如，在指令“HMMA.884.F32.F32.STEP0 R8, R24.reuse.COL, R22.reuse.ROW, R8”中的“R8”表示寄存器对< R8, R7>。类似地，剩余寄存器标识符表示3对源操作数寄存器< R24, R23>、< R22, R21>、< R8, R7>。4对寄存器对对应矩阵A、B、C、D。

指令中的“reuse”表示相关操作数在下一步中会被重用，因此缓存在操作数重用cache中，可避免一次寄存器获取（register fetch）并降低bank conflict可能性。

![](https://pica.zhimg.com/v2-d1d96ec5eb58038d67a4c0abe56c0148_r.jpg)对于混合精度的Volta，每条wmma.mma指令拆成4组共16条HMMA指令，每组4条HMMA指令。每条HMMA指令都有“STEP<n>”标记，n从1到3。对于FP16，每条wmma.mma指令拆成4组共8条HMMA指令，每组2条HMMA指令。

当执行HMMA指令时，每个threadgroup将A矩阵中的一个4×4子块（sub-tile）与B矩阵中的一个4×8子块相乘，然后将乘积与C矩阵累加。如下图所示：

![](https://picx.zhimg.com/v2-63df74c4f56135b4724246beebe29ca5_1440w.jpg)更具体地说，当threadgroup 0执行Set 0的HMMA指令（如下所示）时，将包含矩阵A的前4行和前4列的子块与包含矩阵B的前4行和前8列的子块相乘，其乘积与矩阵C的4×8子块累加，得到的和保存在矩阵D的4×8子块中，即上图第一行计算过程。

HMMA.884.F32.F32.STEP0 R8, R24.reuse.COL, R22.reuse.ROW, R8; 

HMMA.884.F32.F32.STEP1 R10, R24.reuse.COL, R22.reuse.ROW, R10; 

HMMA.884.F32.F32.STEP2 R4, R24.reuse.COL, R22.reuse.ROW, R4; 

HMMA.884.F32.F32.STEP3 R6, R24.COL, R22.ROW, R6; HMMA

下图显示了在混合精度模式下，threadgroup 0的一组指令中的每一HMMA step的操作，每一组指令有4个step，如上例中的STEP0~3。在每一个step中，矩阵A的一个2×4子块与矩阵B的一个4×4子块相乘，其乘积与矩阵C的2×4子块累加。

![](https://pica.zhimg.com/v2-4ed9c4f37ebde3d2d10230ca323c41ce_r.jpg)类似地，下图显示了在FP16精度模式下类似地，下图显示了在FP16精度模式下，threadgroup 0的一组指令中的每一HMMA step的操作，每一组指令有2个step，而不是混合精度下的4个step。在每一个step中，矩阵A的一个4×4子块与矩阵B的一个4×4子块相乘，其乘积与矩阵C的4×4子块累加。，threadgroup 0的一组指令中的每一HMMA step的操作，每一组指令有2个step，而不是混合精度下的4个step。在每一个step中，矩阵A的一个4×4子块与矩阵B的一个4×4子块相乘，其乘积与矩阵C的4×4子块累加。

类似地，下图显示了在FP16精度模式下，threadgroup 0的一组指令中的每一HMMA step的操作，每一组指令有2个step，而不是混合精度下的4个step。在每一个step中，矩阵A的一个4×4子块与矩阵B的一个4×4子块相乘，其乘积与矩阵C的4×4子块累加。

![](https://pic4.zhimg.com/v2-02773a8de760f68fd7257fb548398433_r.jpg)为了确定线程0如何加载操作数矩阵元素，可以改变元素值并观察对结果的影响。可以发现，threadgroup是成对工作并计算得到8×8子块结果。这样的一对threadgroup称为octet，一个warp中有4个octect（1 warp = 32线程 = 8 threadgroup = 4 octet）。

下表显示了构成每个octet的threadgroup对，可用如下公式表示octet的构成方式

Octet X = threadgroup X ∪ threadgroup X+4  X∈[0, 3]

下表的第三、四列表示每个octet中的线程访问的矩阵A、B的子块。

下表中显示，矩阵A、B的每个元素被不同threadgroup中的线程加载两次，即，每个octet读入矩阵A的一个8×16子块、矩阵B的一个16×8子块，以及矩阵C的8×8子块。

![](https://pic4.zhimg.com/v2-ab14f147ae9361943304a8386dbdc1f1_1440w.jpg)为了更好地理解octet中线程的组织方式，以下分析了octet在不同set和step执行的计算，如下图所示。在set1中，子块[a]、[e]和[A]、[E]之间的乘积需要生成部分结果[aA]、[aE]、[eA]、[eE]。以计算[aE]为例，threadgroup 0需要用到矩阵B的子块[E]，[E]由threadgroup 4加载。类似地，为了计算[eA]，threadgroup 4需要用到矩阵B的子块[A]，[A]由threadgroup 0加载。

![](https://picx.zhimg.com/v2-9606f227db9bdcb208c42d073b24282d_r.jpg)

参考文献：

【1】[Tips for Optimizing GPU Performance Using Tensor Cores | NVIDIA Developer Blog](https://link.zhihu.com/?target=https%3A//devblogs.nvidia.com/optimizing-gpu-performance-tensor-cores/)