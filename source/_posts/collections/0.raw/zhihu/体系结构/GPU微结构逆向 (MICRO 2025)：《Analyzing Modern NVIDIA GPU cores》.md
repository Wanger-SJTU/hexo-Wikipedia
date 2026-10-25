---
title: "GPU微结构逆向 (MICRO 2025)：《Analyzing Modern NVIDIA GPU cores》"
date: "2025-10-15 00:00:00"
updated: "2025-10-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/GPU微结构逆向-(MICRO-2025)-《Analyzing-Modern-NVIDIA-GPU-cores》-d12aee/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1929593678864847592"
---


看到这篇论文出现在MICRO 2025《Dissecting and Modeling the Architecture of Modern GPU Cores》，实至名归！

论文链接：[https://arxiv.org/abs/2503.20481](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.20481)

这篇论文是对NVIDIA Ampere架构GPU的逆向，主要揭示了GPU SM（Stream Multiprocessor）中Processing Block（或者称为Subcore）的实现细节，在著名的Accel-Sim模拟器基础上实现了对NVIDIA  GPU更加精确的模拟。

借此论文详细复习下GPGPU处理器核的设计。这篇论文还是逆向了挺多内容的，就不逐句翻译了，只介绍关键点。

### 一、背景：GPGPU-Sim与Accel-Sim

目前，关于GPU硬件架构的研究基本基于Accel-Sim/GPGPU-Sim展开，GPGPU-Sim中SM（Stream Multiprocessor）结构如下图所示。每个SM包含四个Sub-core（或Processing Block），可视作一个顺序的SIMT处理器核，这四个Sub-core共享L1 Cache和Shared Memory。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3d9ffb9c1253.jpg)

每个Sub-core有自己的取指、译码、发射、执行部件，指令的完整处理过程以warp（一般为32线程）为粒度。发射（Issue）阶段是从多个warp的指令buffer中选择一个warp的下一条指令发射的过程，在GPGPU-Sim中实现了Scoreboard来解决相关，对每个warp标记其未提交指令对寄存器的读写请求，以此确定下一条指令是否可以发射，RAW/WAW用于处理写后读/写后写相关，WAR（原文图中应该是画错了）用于处理读后写相关。当多个warp都存在可发射的指令时，按照GTO调度策略选择一个warp发射。GTO（greedy then oldest）的意思是，如果当前warp一直没有被阻塞，那么就一直发当前warp，直到当前warp被阻塞时换成最老的那个warp。另外，还有一种调度策略叫LRR（loose round robin），即宽松的（跳过阻塞的）轮询策略，这种策略感觉对线程块同步barrier比较友好。

指令发射后进入OC（operand collector），在这个阶段读取每个Sub-core私有的寄存器堆获取源操作数，当所有源操作数准备好后分派（Dispatch）到不同功能部件，包括CUDA Core、Tensor Core、SFU（Special Function Unit）、LSU（Load Store Unit）等。

Accel-Sim中的架构基本反应了Tesla架构的特性，并包含Sub-cores（论文：HPCA 2023 Mitigating GPU Core Partitioning Performance Effects）和IPOLY Indexing Cache（详见：[Cache IPOLY哈希 (ISCA 1991)：《Pseudo-Randomly Interleaved Memory》](https://zhuanlan.zhihu.com/p/1930584587794360195)）等现代结构，但是缺少很多现代GPU中的重要组件，例如L0指令Cache、Regfile，此外Issue逻辑、Regfile和Regfile Cache等部件也没有更新。

### 二、方法：逆向工程

文章中通过手写少量指令组成的microbenchmark进行测试，直接撰写SASS指令及其控制位（即机器码），而非PTX的中间表示。虽然SASS并不公开，但是有cuAssembler（详见：[CuAssembler 开源 | 探求 NVIDIA GPU 极限性能的利器](https://zhuanlan.zhihu.com/p/569802196)）等工具支持直接撰写SASS汇编。

例如下图是测试寄存器堆读冲突的microbenchmark，（因为寄存器堆只有2个bank，所以）修改R_X和R_Y会得到不同的时钟周期（奇数+奇数=5cycles，奇数+偶数=6cycles，偶数+偶数=7cycles）

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a0c5056458fb.jpg)

### 三、现代NVIDIA GPU中的控制位

NVIDIA GPU中很早就不用那种传统的scoreboard根据寄存器读写相关判定发射的方式了，而是使用软件编译得到的控制位来控制硬件的阻塞和发射。这种方法能够极大程度上降低硬件设计的复杂度，当然，也对nvcc编译器提出了更高要求。

有一篇知乎文章很早就介绍过NVIDIA GPU指令中的控制位：[CUDA微架构与指令集（4）-指令发射与warp调度](https://zhuanlan.zhihu.com/p/166180054)，似乎就是CuAssembler的作者写的？（果然大佬们都在知乎：）

NVIDIA GPU中的控制位是用于控制指令是否可以发射的，控制位中包含两类信息，一类控制固定延迟指令，另一类控制可变延迟指令。CUDA Core指令和Tensor Core指令是固定延迟指令，SFU指令和访存指令是可变延迟指令。

<strong>stall counter控制位和yield控制位</strong>：用于控制固定延迟指令的下一条指令什么时候可以发射，stall相当于是一个计数器，递减为0后这个warp的下一条指令才可以发射；yield用于指示硬件下个周期不可以发射相同这个warp的下一条指令。

<strong>dependence counter控制位</strong>（有些地方也称其为scoreboard，但是与GPGPU-Sim中的scoreboard不同）：用于处理生产者-消费者依赖关系，生产者指令会标记某个指定的dependence counter（或者叫read/write dependency barrier，一共有6个，SB[0] ~ SB[5]），消费者指令会依赖某些dependence counter（也就是下图中的dependence counters mask），只有当生产者完成后消费者的指令才能继续发射。

需要注意的是，dependence counter的递增发生在发射的后一拍，所以如果下一条指令就是消费者，生产者必须将stall counter设置为2，即下一拍不能发射消费者指令，等到下下拍再做判断。

以下图为例，0x80指令与0x50指令和0x60指令存在写后读相关（R5和R7寄存器），0x80指令与0x60和0x70指令存在读后写相关（R2寄存器），因此0x50和0x60指令将SB[3]递增，0x60和0x70指令将SB[0]递增，0x80指令的dependence counters mask为6'b001001，也就是0x80指令需要等待SB[3]和SB[0]清零，也就是0xx60完成R5和R7寄存器写回、0xx70完成R2寄存器读取后才能发射。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2442c2047201.jpg)

此外，DEPBAR指令也可以用于检查特定的dependence counters是否已经递减到某个值，与AMD GPU中的waitcnt指令类似。

<strong>reuse mask控制位</strong>：指示是否缓存regfile的读取内容，当临近指令访问相同寄存器时可以减少对物理寄存器堆的读取。

### 四、GPU核微结构

这一章就是介绍详细的逆向得到的GPU核微结构了，包括发射调度、前端、寄存器堆、访存流水线。

（文章中这一部分的很多结论都不完善，只能说大致对得上。。）

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f781ee28769.jpg)

#### 4.1 Issue Scheduler

<strong>指令可以发射的前提条件：</strong>

第一个条件，显而易见，warp对应的指令缓冲区中存在有效指令。

第二个条件，在控制位部分已经提到过，该指令已经解决了控制位标识的所有相关（dependency、stall）。

第三个条件，对于源操作数有常量缓存时，从常量缓存中读取操作数是在issue阶段进行的，如果常量缓存miss，4个时钟周期后就会调度到另一个就绪的warp（也就是说L0）。

第四个条件，对于固定延迟指令，需要保证指令所需资源，包括执行单元和寄存器读端口。关于执行单元（CUDA Core、Tensor Core），发射前需要保证该指令进入到执行阶段时，该指令所需的执行单元完全可用。（这篇文章关注的Ampere架构的Tensor Core还是同步的，在指令发射调度的视角下是跟CUDA Core类似的固定延迟的功能部件，等到Hopper架构和Blackwell架构，新的Tensor Core指令就是异步指令了，应该也不用在发射时就保证Tensor Core可用了）

寄存器读端口的可用性比较复杂，这篇文章最终也没有给出跟实际运行结果完全匹配的解释，只是给出了大致符合的一个猜想。这个猜想是：在issue阶段和读寄存器阶段还有两个阶段，分别称为control和allocate，control阶段是在控制位部分就提到的issue之后1拍才会更新dependency counters；allocate阶段则是真正检查寄存器读端口冲突，直到没有其它寄存器读端口冲突后才会继续到读寄存器阶段。

<strong>warp scheduler：</strong>

这篇文章对warp调度的逆向仍然不充分，只给出了同一thread block内部不同warp的调度，是greedy then youngest（是youngest！不是GTO！这里存疑，肯定不可能让新的warp优先执行啊。。。但是同一thread block内的不同warp本身都是一起调度到SM执行的，本身就没有old还是young的区别）

大胆猜测这篇文章也测试了不同thread block的warp调度，但是没有找到合理解释。也许NVIDIA的warp调度本身就不是GTO或者LRR这种固定策略？会不会跟其它行为（例如访存）也有关的heuristic的调度算法呢？有没有大佬知道这个，求科普。

#### 4.2 前端

唯一可以确定的是一个SM的四个sub-core中各有一个L0 ICache，L0 ICache会做指令预取。指令预取的具体实现和指令Buffer的项数这篇文章中都没有确定。

#### 4.3 寄存器堆

<strong>一共有7类寄存器</strong>：

- Regular（我们在CUDA编程中最常说的寄存器，也就是向量寄存器堆）：按照32 threads * 32 bits也就是128B组织，分为两个bank（奇数一个bank偶数一个bank）在Ampere架构中，每个subcore中有512个向量寄存器，每个warp最多可以用255个向量寄存器（nvcc编译时--ptxas-options=-v看到的每个kernel使用的寄存器数目就是这个向量寄存器）
- Uniform（就是标量寄存器）：每个warp有64个32bit标量寄存器，是32个线程共享的
- Predicate（谓词寄存器）：有8个32bit的谓词寄存器，32bit刚好对应32个线程是否要执行这个分支
- Uniform Predicate：这个第一次听说，有8个1bit的统一谓词寄存器
- SB寄存器：就是控制位那里设置的denpendency counters
- B寄存器：有16个B寄存器管理控制流重汇聚
- 特殊寄存器：例如id相关的，blockid、threadid、smid等等
<strong>寄存器读取策略</strong>：

遗憾的是，这篇文章再一次没有给出确切的能与硬件行为匹配的寄存器读取策略。（既然作者from Spain，忍不住吐槽一句，这篇文章最关键的逆向部分，竟然warp scheduler、frontend、register file全都没有给出与硬件一致的确切机制。。。好奇这篇文章最后会被什么会议接收，作者肯定想对标Accel-Sim投ISCA和MICRO的，但是。。。要不还是ISPASS吧）

言归正传，能确定的一件事是，NVIDIA的GPU里已经没有operand collector了，或者说它的operand collector已经不是那种传统的多个regfile bank的请求排队读取、不确定延迟的operand collector了。在之前讲的这种issue策略下，读寄存器的延迟可以不确定，否则控制位中的stall就确定不了了。

这篇文章还给出的一个结论是，对于固定延迟指令（这里应该只指CUDA Core指令），不管需要读几个寄存器、是否有寄存器的bank冲突，读寄存器都需要3拍延迟。在Issue Scheduler那里讲过，发射后会经过control和allocate两个阶段，allocate阶段时需要确定接下来的三个时钟周期内有窗口可以完成所有读寄存器行为，否则就会阻塞在allocate阶段。

（这里想说一个问题，这样的读寄存器策略真的不会带来性能损失吗？控制位中的stall的值不能根据读几个寄存器、有没有寄存器堆的bank冲突来设置吗？这样一条指令能抢出一到两拍？而且regfile cache也是软件控制的，如果有源操作数regfile cache hit了，stall值还可以设置得更小。NVIDIA的工程师肯定还是在意这几拍的吧

关于寄存器的写回端口，文章实验结果是每拍只能写回128B也就是一个寄存器，当一条固定延迟指令和一条load指令同时得到结果时，固定延迟指令的写回优先级更高，load指令就会延迟一拍写回。另外固定延迟指令的计算结果会做前递，不会导致后续指令因为RAW而阻塞。

<strong>Register File Cache</strong>

每个regfile bank各有一个cache entry，每个entry中包含三个1024bit项分别对应三个源操作数，总共6 * 128B的register file cache。

如果指令中对某个源操作数设置了reuse位，那么该操作数会被存放在regfile cache中。后续的指令如果来自同一warp，请求读取相同id的寄存器，且寄存器在指令中的位置（三个源操作数）与之前cache的都相同，则会从regfile cache中读取而不会真正读取regfile。如果有读取请求到达了相同的regfile bank和寄存器位置时，regfile cache的值将变得不可用（被无效掉），在下面的example/4中可以看到，example4的第三条指令是R2 miss的。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_290790b8dede.jpg)

到这里文章中关于寄存器堆的部分就讲完了。如果真的是这样的，那么改变了我原本对regfile cache的认知，原本我以为regfile cache很大程度上是用来减少regfile的bank冲突（毕竟是3源操作数、2bank而不是4bank）来提高性能的，按照这篇文章的说法，regfile cache主要还是用来减少寄存器堆读取来节省功耗的？（存疑，有空自己再测一下）

#### 4.4 访存流水线

访存请求前半段在subcore的memory unit中分别处理，后半段则是四个subcore共享，因为它们共享L1 DCache和Shared Memory。这篇文章测试了load/store的队列项数、每个subcore向shared memory发出请求的速率、以及不同访存请求的延迟。

<strong>访存吞吐：</strong>

下表是测试连续的访存指令，每一条访存指令被issue的周期：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_369316ba87d8.jpg)

观察这张表中的数据可以得到三个结论：

- Ampere架构中，每时钟周期发一条访存指令，最多可以连续发5拍，第6条访存指令的发射就被阻塞了，阻塞的周期数取决于当前有几个subcore在发访存指令；L1 DCache或shared memory平均每2拍可以接收一个从某个subcore发来的访存请求（而且看起来subcore之间是round robin的），从第6条指令开始，四个subcore平均每2拍一共只能发射一条访存指令。
- 每个subcore的memory unit对于访存指令的吞吐量为4拍一条指令。只有一个subcore活动时，第6条指令之后每4拍才能发射一条访存指令；两个subcore活动时，每个subcore也是每4拍发射一条访存指令；两个以上的subcore活动时，L1 DCache或shared memory就成为瓶颈了。
- subcore中memory unit的队列长度估计为4项。
（想问的一个问题是，为什么L1D和shared memory的吞吐会是两拍一条指令啊，这样的话岂不是只有float2和float4对应的64b和128b的LDG/LDS指令才能满吞吐？32b的访存指令上限就只有设计带宽的50%？不合理吧

<strong>访存延迟：</strong>

下表是文章测试得到的不同访存指令的WAR延迟和RAW/WAW延迟，其中RAW/WAW延迟是我们一般说的访存延迟：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c734d4ea579a.jpg)

这张表有这样几点观察：

- 使用统一寄存器（标量寄存器）计算地址，而不是普通寄存器（向量寄存器），load L1 DCache会更快
- shared memory的访问延迟要低于L1 DCache的延迟；使用统一寄存器和普通寄存器load shared memory的WAR延迟相同而RAW/WAW延迟差一拍
- 延迟跟每次访存数据量的大小有关，显而易见。而且根据延迟的区别，可以得出从L1 DCache/shared memory到subcore regfile的传输带宽是512bit/cycle（两拍一个寄存器）
- Constant Cache的WAR延迟明显大于访问L1 DCache，原因不明，RAW/WAW延迟则稍低。

### 五、实验测试评估

后面的内容就常规流程了

在Accel-Sim基础上的改动包括：L0 Cache缓存+预取，修改发射单元，创建访存模型等等。

在下列benchmark上：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e86aa5558a0f.jpg)

取得了更精确的模拟结果：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d97b4c1ef533.jpg)

文章对测试结果还做了一些敏感性分析：

<strong>指令预取。</strong>简单的stream buffer（4项以上）在GPU中性能几乎可以媲美完美的ICache。使用完美的ICache进行模拟，可以提高模拟速度，但是会在控制流相关的benchmark上（例如dwt2d、lud、nw等）产生显著性能差异。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7c865c645006.jpg)

<strong>寄存器堆结构。</strong>（1R/2R指的是2 bank regfile的每个bank有几个读端口，RFC on/off指的是有没有regfile cache，Ideal指的是假设所有源操作数都可以一拍读出）。对于计算密集型的MaxFlops benchmark，两个读端口有显著性能提升，因为指令可能有三个源操作数，但是两个读端口的话就跟NVIDIA GPU实测对不上了，说明NVIDIA GPU真的是单读端口的2 bank。对于cutlass sgemm benchmark，单读端口关闭regfile cache会产生严重的性能下降，这与程序中35.9%的指令至少有一个操作数使用了regfile cache相匹配。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a4255a19ad55.jpg)

<strong>Dependency管理：</strong>基于控制位的dependency管理比传统的scoreboard确实能减少很多硬件开销。（相比这也是NVIDIA这样做的原因吧，虽然给编译器增加了一些设计复杂度）

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_68252c548bd0.jpg)

### Reference：

[https://arxiv.org/abs/2503.20481](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2503.20481)

HPCA 2023 Mitigating GPU Core Partitioning Performance Effects

[Cache IPOLY哈希 (ISCA 1991)：《Pseudo-Randomly Interleaved Memory》](https://zhuanlan.zhihu.com/p/1930584587794360195)

[CuAssembler 开源 | 探求 NVIDIA GPU 极限性能的利器](https://zhuanlan.zhihu.com/p/569802196)
