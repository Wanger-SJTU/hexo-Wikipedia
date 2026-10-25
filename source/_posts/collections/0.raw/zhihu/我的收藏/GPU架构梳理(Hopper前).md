---
title: (2 条消息) GPU架构梳理(Hopper前)
date: "2026-01-02 00:00:00"
updated: "2026-01-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/GPU架构梳理(Hopper前)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/661533704
---


### 一、GPU架构概述

#### SM结构

GPU架构是围绕一个流式多处理器（SM）的扩展阵列搭建的。通过复制这种结构来实现GPU的硬件并行。  

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_baa5f4cf9b60.jpg)

SM包括关键组件：

- CUDA核心
- 共享内存/一级缓存
- 寄存器文件
- 加载/存储单元
- 特殊功能单元
- 线程束调度器**SM** GPU中每个SM都能支持数百个线程并发执行，每个GPU通常有多个SM，当一个核函数的网格被启动的时候，多个block会被同时分配给可用的SM上执行。
如图

- 橙色部分：2 个 Warp Scheduler/Dispatch Unit
- 绿色部分：32 个 CUDA 内核，分在两条 lane 上，每条分别是 16 个
- 浅蓝色部分：register file-寄存器文件和 L1 cache
- 16 个 Load/Store units (LD/ST Unit)
- 4 个 Special Function Units (SFU)
**每个 SM 具有 32 个 CUDA 内核**，就是图中写着Core的绿色小方块儿，每个 CUDA 内核都有一个完全流水线化的算术逻辑单元 ALU（Arthmetic Logit Unit）和浮点运算单元 FPU（Floating Point Unit）：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7a96a2ac061c.jpg)

#### GPU架构(以Fermi为例)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2e4a51dd4652.jpg)

Fermi架构逻辑图如上，使用 30 亿个晶体管实现，共计512个CUDA内核。

每个CUDA核心都有一个全流水线的整数算数逻辑单元ALU，和一个浮点数运算单元FPU。**一个CUDA 内核为一个线程在每个时钟周期里执行一条浮点或整数指令**。

这512 个 CUDA 内核被组织成 16 个 SM，每个 SM 是一个**垂直的矩形条带**(红框中的内容)，分别位于一个普通的 L2 cache周围，每个 SM 有32 个CUDA 内核。

6个64-bit显存分区，组成一个384-bit的显存接口，总共支持高达 6GB 的 GDDR5 DRAM显存。

768KB的二级缓存，被所有SM共享

主机接口(host interface )通过 PCI-Express 将 GPU 连接到 CPU。 Giga Thread 全局调度器将线程块分发给 SM 线程调度器。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_1f2576914183.jpg)

整个 GPU 有多个 GPC(图形处理集群)，单个GPC包含一个光栅引擎(Raster Engine)，四个 SM（流式多处理器），GPC 可以被认为是一个独立的 GPU。所有从 Fermi 开始的 NVIDIA GPU，都有 GPC。

### **二、CUDA编程的组件与逻辑**

#### **软件抽象**

- GPU从硬件上，有若干个SM，每个SM有若干个SP，SP是实际运行GPU线程的硬件，一个线程对应一个SP。由SM的数量和每个SM拥有SP的数量，可以得到该GPU理论上最大的并行线程数量。但由于SM内的寄存器大小等，可能会有影响。
- 想要调用GPU上的线程，因此CUDA实现了一层抽象，相当于对于CUDA的编程人员而言，引出了线程束Warp、线程块block、线程网格grid等来组织GPU上的线程，方便编程人员。必须要了解硬件底层的设计，才能充分利用其性能。
- 又因为GPU的硬件上有很多类型的存储器，比如：全局内存，纹理内存、常量内存、共享内存、寄存器等等，因此想要写一个高性能的CUDA程序，必须要利用好这些GPU硬件。
因此：

软件抽象资源包括Thread、Warp、Block和Grid

硬件资源包括SP和SM 

下图从逻辑角度和硬件角度描述了CUDA编程模型对应的组件。  

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_02969fff4410.jpg)

SM中共享内存，和寄存器是关键的资源，线程块中线程通过共享内存和寄存器相互通信协调。 寄存器和共享内存的分配可以严重影响性能！

因为SM有限，虽然我们的编程模型层面看所有线程都是并行执行的，但是在微观上看，所有线程块也是分批次的在物理层面的机器上执行，线程块里不同的线程可能进度都不一样，但是同一个线程束内的线程拥有相同的进度。 并行就会引起竞争，多线程以未定义的顺序访问同一个数据，就导致了不可预测的行为，CUDA只提供了一种块内同步的方式，块之间没办法同步！ 同一个SM上可以有不止一个常驻的线程束，有些在执行，有些在等待，他们之间状态的转换是不需要开销的。

#### **线程束**

CUDA 采用单指令多线程SIMT架构管理执行线程，不同设备有不同的线程束大小，但是到目前为止基本所有设备都是维持在32，也就是说每个SM上有多个block，一个block有多个线程（可以是几百个，但不会超过某个最大值），但是从机器的角度，**在某时刻T，SM上只执行一个线程束**，也就是32个线程在同时同步执行，线程束中的每个线程执行同一条指令，包括有分支的部分，这个我们后面会讲到，

nvidia提供了一个固有变量wrapSize，我们可以通过这个变量来获取当前硬件所支持的线程束的大小。

#### **grid、block以及warp关系**

block是CUDA给我们划分的单位，warp是硬件层面中SM对应执行线程的单位。

kernel(指的是在GPU上执行的函数)在执行时会以一个grid为整体，划分若干个block，然后将block分配给SM进行运算。block中的线程以32个为一组，称为warp，进行分组计算。block会以连续的方式划分warp。例如，如果一个block由64个thread，则分为2组warp。0-31为warp0，32-63为warp1.如果block不是32的倍数，则多余的thread独立分成一组warp。例如block有65个thread，则最后一个thread单独为一个warp，那么此时这个warp中的其他thread处于非活动状态。

- 在一个block内的warp次序是未定义的，但通过协调全局或者共享内存的存取，它们可以同步的执行。如果一个通过warp 线程执行的指令写入全局或共享内存的同一位置，写的次序是未定义的。
- 在一个grid内的block次序是未定义的，并且在block之间不存在同步机制，因此来自同一个grid的二个不同block的线程不能通过全局内存彼此安全地通讯。
**Grid，Block，thread都是线程的组织形式，最小的逻辑单位是一个thread，最小的硬件执行单位是thread warp，若干个thread组成一个block，block被加载到SM上运行，多个block组成一个Grid。**

#### **SIMD vs SIMT**

单指令多数据的执行属于向量机，比如我们有四个数字要加上四个数字，那么我们可以用这种单指令多数据的指令来一次完成本来要做四次的运算。这种机制的问题就是过于死板，不允许每个分支有不同的操作，所有分支必须同时执行相同的指令，必须执行没有例外。 相比之下单指令多线程SIMT就更加灵活了，虽然两者都是将相同指令广播给多个执行单元，但是SIMT的某些线程可以选择不执行，也就是说同一时刻所有线程被分配给相同的指令，SIMD规定所有人必须执行，而SIMT则规定有些人可以根据需要不执行，这样SIMT就保证了线程级别的并行，而SIMD更像是指令级别的并行。 SIMT包括以下SIMD不具有的关键特性：

- 每个线程都有自己的指令地址计数器
- 每个县城都有自己的寄存器状态
- 每个线程可以有一个独立的执行路径
而上面这三个特性在编程模型可用的方式就是给每个线程一个唯一的标号（blckIdx,threadIdx），并且这三个特性保证了各线程之间的独立

### 三、 GPU架构发展

参考[Miller：NVIDIA GPU 架构梳理](https://zhuanlan.zhihu.com/p/394352476)

计算能力架构发布年代Cores/SM总 SM 数CUDACoresL1 Cache(KB)L2 Cache(KB)1.0Tesla2.0Fermi20093216 SM512487683.0Kepler201219215 SMX28804815364.0–5.0Maxwell201412824 SMM30729620486.0Pascal20166460 SM38406440967.0Volta2018648 个 Tensor Core80 SM5120与共享内存共用 128（最多 96）61447.5Turing2018648 个 Tensor Core72 SM4608与共享内存共用 128（最多 96）61448.0Ampere2020644 个 Tensor Core108 SM6912与共享内存共用 192（最多 164）409609.0Hopper20221284 个 Tensor Core144 SM18432与共享内存共用 25661440
### 四、GPU存储概念

#### 1. Registers

寄存器是访问速度最快的空间。

当我们在核函数中不加修饰的声明一个变量，那该变量就是寄存器变量，如果在核函数中定义了常数长度的数组，那也会被分配到Registers中；寄存器变量是每个线程私有的，当这个线程的核函数执行完成后，寄存器变量也就不能访问了。

寄存器是比较稀缺的资源，空间很小，Fermi架构中每个线程最多63个寄存器，Kepler架构每个线程最多255个寄存器；一个线程中如果使用了比较少的寄存器，那么SM中就会有更多的线程块，GPU并行计算速度也就越快。

如果一个线程中变量太多，超出了Registers的空间，这时寄存器就会发生溢出，就需要其他内存（Local Memory）来存储，当然程序的运行速度也会降低。

因此，在程序中，对于那种循环操作的变量，我们可以放到寄存器中；同时要尽量减少寄存器的使用数量，这样线程块的数量才能增多，整个程序的运行速度才能更快

#### 2. Local Memory

Local Memory也是每个线程私有的，但却是存储在于Global Memory中的。在核函数中符合存储在寄存器中但不能进入核函数分配的寄存器空间中的变量将被存储在Local Memory中，Local Memory中可能存放的变量有以下几种：

- 使用未知索引的本地数组
- 较大的本地数组或结构体
- 任何不满足核函数寄存器限定条件的变量
Local Memory，它是每个线程专有的线程，但却是存在于Global Memory中的，结合我们在第0节例子中拿学校和学生举的例子，可以理解为：学生的课桌都放满了，只能在操场里给他再找个地方放东西，所以访问速度是很慢的，但是这部分还是属于他的local memory，别的线程应该是访问不了的。

注意，局部内存设置的过程是在编译阶段就会确定。

#### 3. Shared Memory

每个SM中都有共享内存，使用__shared__关键字（CUDA关键字的下划线一般都是两个）定义，共享内存在核函数中声明，生命周期和线程块一致。

同样需要注意的是，SM中共享内存使用太多，会导致SM上活跃的线程数量减少，也会影响程序的运行效率。

#### 4. Constant Memroy

常量内存驻留在设备内存中，每个SM都有专用的常量内存空间，使用__constant__关键字来声明，可以用来声明一些滤波系数等常量。常量内存为只读内存

常量内存存在于核函数之外，在kernel函数外声明，即常量内存存在于内存中，并不在片上，常量内容的访问速度也是很快的，这是因为每个SM都有专用的常量内存缓存，会把片外的常量读取到缓存中；对所有的核函数都可见，在Host端进行初始化后，核函数不能再修改。

#### 5. Global Memory

全局内存，就是我们常说的显存，就是GDDR的空间，全局内存中的变量，只要不销毁，生命周期和应用程序是一样的。

在访问全局内存时，要求是对齐的，也就是一次要读取指定大小（32、64、128）整数倍字节的内存，数据对齐就意味着传输效率降低，比如我们想读33个字节，但实际操作中，需要读取64字节的空间。

#### 6. L1/L2 cache

每个`SM`都有一个一级缓存，所有`SM`公用一个二级缓存，`SM`通过`L2 cache`连接到`Global Memory，GPU`读操作是可以使用缓存的，但写操作不能被缓存。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_afe0f7b411af.jpg)

**L1、L2和SMEM关系**

L1和SMEM（Shared Memory）其实算作一个东西，或者准确来讲，在一同一块芯片区域当中。只是根据程序需要，决定哪一部分划分成L1缓存，哪一部分划分成Shared Memory，这个操作是动态的。

L1 cache负责缓存内存地址，而SMEM负责缓存计算所需的变量（包括顶点数据，纹理数据，以及计算引入的中间变量等）。

L1/SMEM缓存频率非常高，延迟非常低，而且访问这个东西所需要的指令周期是可预测的。这个可预测十分重要，这种情况下算法可以优化其计算和访问SMEM里面数据的策略，比如，遇到数据访问操作，可以切换执行其他计算指令，待SMEM数据被取回到寄存器后，就切回刚刚执行数据访问操作的位置，继续执行后续的指令。

L1/SMEM每个SM独享一份，不与其他SM共享。如果有共享需求，则这时候应该L2出场。L2相比L1，其频率没那么高，相应的访问其中的数据需要付出一定的延迟代价。当然了，GPU执行当中为了最大化执行效率，都有动态缓存执行状态和切换执行其他指令的策略。

L2缓存保存了显存的一部分拷贝。在必要情况下（GPU没有独立显存，或者系统也在内存当中划分了一部分区域提供给显存使用），它也可以保存一部分内存的拷贝。所谓拷贝，意味着这是一份连续的显存/内存拷贝（所以指望tex2DLod这样的操作可以减少显存读写以提升性能的可以省省了）。

对于CPU而言，多线程访问L2可能是不安全的。所以CPU一般是提供了额外的指令集去确保L2读-改-写操作是安全的。但是现在某些GPU（比如NVidia Fermi系列）就可以保证这套流程是安全的。GPU相比CPU还有一个好处，它往往对一套数据（比如数组，纹理等）访问是并行的，所以在GPU侧进行这个访问操作就可以安全很多。

#### 6. 总结

存储器作用域声明期RegisterThreadKernelLocal MemoryThreadKernelShared MemoryBlockKernelGlobal MemoryGridApplicationConstantGridApplication![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_32ea6b560f25.jpg)

参考：

- [【CUDA 基础】3.1 CUDA执行模型概述](https://link.zhihu.com/?target=https%3A//face2ai.com/CUDA-F-3-1-CUDA%25E6%2589%25A7%25E8%25A1%258C%25E6%25A8%25A1%25E5%259E%258B%25E6%25A6%2582%25E8%25BF%25B0/)
- [kaiyuan：GPU内存(显存)的理解与基本使用](https://zhuanlan.zhihu.com/p/462191421)
- [Miller：NVIDIA GPU 架构梳理](https://zhuanlan.zhihu.com/p/394352476)
- [Nvidia 显卡架构详解 - Twisted Meadows](https://link.zhihu.com/?target=https%3A//www.twisted-meadows.com/nvidia-gpu-architecture/)
- [【GPU结构与CUDA系列4】GPU存储资源：寄存器，本地内存，共享内存，缓存，显存等存储器细节_gpu里有pc寄存器吗-CSDN博客](https://link.zhihu.com/?target=https%3A//blog.csdn.net/qq_41554005/article/details/119765334)