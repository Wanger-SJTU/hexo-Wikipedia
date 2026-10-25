---
title: 内存一致性(Memory Consistency)
date: "2021-10-18 00:00:00"
updated: "2021-10-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/内存一致性(Memory-Consistency)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/422848235
---


*写在本章之前：*

*我一直犹豫是否需要写这个章节，一是因为这个东西很抽象很复杂，不容易写明白；另外就是这个内容与绝大部分的计算机行业的工作者不相关，只有CPU的设计开发者， 计算机语言的开发者和操作系统和编译器的开发者才可能需要搞明白这个章节的内容，所以如果你不在上述领域从业，就可以直接跳过这一章节。*

什么是内存一致性模型？为什么需要内存一致性模型？还是让我们来看一下我们前面介绍cache一致性问题时讨论过的一个例子：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b6a9420252d8.jpg)

有两个任务T0和T1分别被操作系统调度在两个CPU核上运行，前面的章节告诉我们：如果不解决cache的一致性问题，则T1任务一致处于空循环中运行，无法执行到print(A), 但是不是cache一致性保证后，该程序的运行就一切水到渠成了？大家可以思考一下T1任务运行到print(A)后打印出的值应该是多少呢？

大家是不是直觉地认为T1应该打印出A=1,因为flag=1的时候CPU才能执行到Print语句，而flag=1的赋值在A=1之后，在T0那个CPU核上flag=1意味着A=1，但有没有可能T1打印出A=0的信息？也就是在T1那个核上，看到的flag = 1反而发生在A=0之前，完全颠覆我们在T0任务中的代码要求。答案是可能。

打印出A=0和A=1这两种情况都可能发生，那这两种情况中哪一种才是正确的呢？其实这两种结果都是正确的，这不是因为上帝掷骰子的问题，而是因为此处的运行结果与CPU的设计方案和实现有关。在不同的CPU架构上运行上述代码其内存访问顺序和报告的结果就有可能不同，所以我们需要用CPU内存一致性模型来约定这些可能的内存操作顺序中哪些是正确的，这就是内存一致性模型也叫memory ordering model。**通俗一点讲内存一致性就是指一个CPU核上的内存修改操作，在什么时候可以在其它核上反映出来（比如通过一个读操作）**，我们需要知道不同的CPU架构（甚至相同架构下的不同实现）可能采用不同的内存模型，CPU的内存模型与CPU指令集一样，也是软件与硬件之间的一个契约，只是这个契约对一般的软件人员是透明的，除非你从事的是比较偏底层软件的研发工作，比如开发编译器（gcc, llvm等），开发某种计算机语言(java, go, 等)，开发操作系统（实现某些操作系统原语）等。

内存模型的设计需要兼顾方方面面，包括performance，硬件实现难度，软件开发难度等，每种CPU架构其内存模型都可能不一样，我们先简单介绍几种比较有代表意义的内存模型，然后重点介绍一下RISC-V中的内存模型RVWMO(RISC-V Weak Memory Ordering)。

### 1 内存模型介绍

#### 1.1 Sequential内存一致性模型

上个世纪70年代，一个牛人Lamport提出了顺序一致性（Sequential consistency）的概念，他把基本不可实现的全局精确时钟要求转换到了局部时钟要求（可以参考其论文：How to make a multiprocessor computer that correctly executes multi-process programs）。Sequential模型有三个特点：

（1） 所有的内存访问都是原子操作（中间不应该有write buffer和cache）。

（2） CPU核内的访问严格按照程序代码顺序进行，对于顺序执行 (in-order) CPU严格按照程序要求的顺序执行对内存的存取（load和store）操作，对于乱序执行（out-of-order）cpu也需要遵循该要求：严格按照程序要求的顺序完成对load和store指令的提交和退休(retire)。

（3） 多核之间代码可以以任意的顺序进行交织运行（但每个核内还是严格的顺序执行）

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1afa642a0de3.jpg)

在sequential模型下，上述问题的运行结果就只能是先A=1,然后才发生flag=1,所以不可能打印出A=0的结果。

Sequential模型的优点是实现简单（对硬件和软件人员都简单），但问题是性能太差，无法发挥硬件的特性, 所以现在的CPU几乎无一例外地偏离了Sequential模型。

#### 1.2 Relaxed内存一致性模型

为了表达的方便，我们用X->Y来表示先必须完成X操作后才能执行Y操作。

前面介绍的Sequential模型就是要求严格保持4种可能的内存读写顺序场景（即使这些操作之间没有控制上的，数据上的，流水线上的依赖关系）： 

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ec95d599e359.jpg)

宽松模型的关键思想是允许乱序执行读取(load)和写入(store)操作,通过使用同步操作来实现处理器之间的同步。宽松模型的方式可以多种多样的，我们可以根据放松了哪种读取和写入顺序来进行分类。

（1） 放松W->R顺序：我们就得到了TSO(total store ordering)模型，它允许CPU先执行读操作然后在执行写操作而不严格按照代码的指示顺序来进行。由于这种模型保持了写入操作之间的顺序，所以很多在Sequential模型下能够运行的代码也能在TSO模型下正常运行。

（2） 放松W->W顺序：我们就得到了PSO(partial store ordering)模型，允许多个写操作也被打乱顺序。

（3） 放松R->W和R->R顺序：将会得到很多模型，包括weak模型，released模型，等。

通过放松这些顺序约束，处理器性能可以得到显著的提升。

【注：这些顺序放松但依旧保证了在本CPU与程序代码一致的存取顺序，但在其它CPU节点看来顺序就可能被打乱了】

### 2 内存模型背后的原因

我们知道CPU访问主memory需要的开销非常大（上100个cycles），如果CPU想存储一个数据到memory而该数据又不在data cache中，则这个过程是相当耗时的，大大地降低了CPU性能。为了进一步加快内存访问速度，CPU设计中引入了store buffer这个部件，store buffer是位于执行单元（比如浮点执行单元FPU, 算术逻辑单元ALU等）与data cache之间的小一块存储单元。(借用一下BOOMv3中的一个架构图)

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1b4ecb5f55e3.jpg)

** 注：使用store buffer的好处不仅在于加快存储的速度，另外还可以利用store buffer实现乱序执行以及实现推断执行(speculative execution)失败后的回退roll back，等

当CPU需要写(store)数据时, 数据不直接写到memory或者cache中，而是先写到store buffer中，store buffer负责后续以某种次序写入L1 data Cache 。我们还是用前面那个例子来解释一下什么情况下会输出另外一种结果：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b6a9420252d8.jpg)

 假设T0在CPU0上执行，T1在CPU1上执行：

Ø CPU0将A=1写入store buffer。

Ø CPU0将flag=1写入store buffer。

Ø CPU1读取flag的值，由于flag新值还在CPU0的store buffer里面，所以CPU1看到的flag值依然是0。所以CPU1继续自旋等待。

Ø CPU0的store buffer将flag的值写入Cache，此时A的值依然在store buffer里面没有更新到Cache（比如因为A没有在cache中而flag在Cache中，cache的一致性保证了CPU1处看到的flag=1）。

Ø CPU1发现flag的值是1，退出循环。然后读取A的值，此时A的值是旧的数据，也就是0。因为A的新值还在CPU0的store buffer里面，所以打印出A=0。

### 3 RISC-V内存一致性模型

RISC-V采用的内存模型叫RVWMO(RISC-V Weak Memory Ordering)，其设计目标是：为构建高性能的可扩展性设计提供灵活的架构，并且保持易于软件代码的编写。我理解其首要目标还是“高性能”。在RVWMO模型下，单核（hart：hardware thread）上的内存存取操作保持了其代码的编写顺序（不考虑编译器优化），但是从另外一个核看来，该核上的内存访问顺序可能就不是代码指定的顺序了，因此多线程的代码为了保持多核内存操作的一致性需要增加显式的同步指令**。在RISC-V的指令集架构中提供了Fence指令来做内存访问的同步，此外RISC-V的A(atomic)扩展中还提供了LR/SC（加载锁和条件存储）以及读-修改-写回（read-modify-write）的原子操作指令。此外Zam和Ztso扩展对RVWMO内存模型进行了进一步的增强。（注：RISC-V中对于重叠地址/不同位宽的内存访问的内存一致性问题还在探讨之中，没有定论。

在现代的实践中，从ISA（指令集架构）层面有两种方法来定义内存模型：公理约束描述及对应操作层面的规则。目前RVWMO共定义了 4条公理和13条规则。

#### 3.1 RVWMO模型公理约定

目前RVWMO定义的 3条公理约定如下：全局内存顺序GMO(Global memory order), 保留程序顺序PPO(Preserved program order)和返回值公理(Load value Axiom)

内存模型公理约定操作层面规则全局内存顺序SC(Sequential**  Consistency)所有的内存操作有一个总的顺序，但这个顺序是不确定的处理器核轮流执行指令，但这个轮流执行的顺序是不确定的TSO（RVTSO）所有的内存操作有一个总的顺序，但这个顺序是不确定的处理器核轮流执行执行操作步骤（不再是指令，而是CPU内部的执行步骤），但这个轮流执行的顺序是不确定的RVWMO所有的内存操作有一个总的顺序，但这个顺序是不确定的处理器核轮流执行执行操作步骤（不再是指令，而是CPU内部的执行步骤），但这个轮流执行的顺序是不确定的。保留程序顺序SC(Sequential
  Consistency)总的顺序应该满足程序顺序要求(PPO: Preserved Program Order)每个核自己按顺序执行指令。TSO（RVTSO）总的顺序应该满足程序顺序要求，但Store->Load操作顺序除外。每个核自己按顺序执行指令；
  存储操作需要两个步骤：1:进入store
  buff, 2:从store buff写入内存RVWMO总内存顺序应满足13条具体的内存访问约定。每个核自己按顺序执行指令。
  每个指令可以分多个步骤执行。返回值公理SC(Sequential
  Consistency)读操作返回最近的对同一个地址写操作的值(Load value Axiom)读操作返回前面最近的对同一个地址写操作的值。TSO（RVTSO）读操作返回程序顺序或者内存顺序中的最近的对同一个地址写操作的值（看程序顺序和内存操作顺序哪个更晚些）读取操作先从store buffer中获取，如果失败，则返回前面最近的对同一个地址写操作的值。RVWMO读操作返回程序顺序或者内存顺序中的最近的对同一个地址写操作的值（看程序顺序和内存操作顺序哪个更晚些）读取操作先从store buffer中获取，如果失败，则返回前面最近的对同一个地址写操作的值。 对TSO（RVTSO）模型再做一点解释：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_364fe6175ec8.jpg)

如上图所示一个内存写指令的执行可以分为两个步骤（1）从CPU执行单元写入store buffer (2)从store buffer写入memory；这两步可以独立完成；一个内存的读操作可以从两个地方返回结果（1）直接从store buffer中返回结果，CPU的LSU单元在处理load指令时会先到自己的store buffer中进行查找，如果找到了地址和size相同的内容则直接返回；（2）如果store buffer中没有需要的内容，则从memory中读取。

我们假设先在A核（Thread A）上执行了write x；然后在核B(Thread B)上执行read x操作，就有可能出现核B上load操作绕过了A核上store buffer中的数据，直接从shared memory中获得x的旧值，站在全局内存顺序（Global memory order）的角度看来B核上load操作就出现在了A核store操作之前，这就是TSO(违反了先写后读的程序顺序)。

#### 3.2 RVWMO规则约定

在RVWMO中定义13条规则（称为PPO，Preserved Program Order）, 在程序顺序上如果操作A出现在B操作之前，并且A和B操作满足如下的约定的模式之一，则A和B的全局顺序必须满足这13条约定。(下图来自Dan Lusing, RISC-V memory consistency model tutorial)

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1ef30fba231d.jpg)

因为图中的表达方式对于非内存模型领域的朋友们有点不太好懂，我们简单地解释一下这些规则：

规则1：A可以是读或者写操作，B是写操作，A与B有地址重叠**

如果A和B访问同一个地址（或者A和B操作的地址空间有重叠，比如A操作一个1字， B操作1个字），则在全局顺序上A必须出现B之前，具体来说：

（1）如果A是读操作，则在B成为全局可见之前A的值必须是确定的；

（2）如果A是写操作，则A必须在B之前全局可见。

规则2：**对同一个地址（或者重叠地址）的load-load操作**

除了如下两种情况外，对同一个地址的load-load操作顺序也需要保持。

（1） 两个Load操作的返回值来自于同一个store操作可以不按顺序执行（这其实就是一种架构级的推测执行Speculative execution ）

（2） 在A和B两个load操作之间有一个存储操作M，B操作只是获取M操作的存储结果。这种情况下B从M的store buffer中取得结果而A则从memory中取得以前的值，所以也可以打乱顺序执行。

规则3：**A是原子(Atomic)操作或者条件存储SC，B是读操作，A与B有地址重叠**

如果A是一个原子内存操作(atomic)或者一个条件存储操作（Store-Conditionally），则A没有成为全局可见之前，B的值不确定。也就是全局顺序上A必须出现在B之前。

规则4：**A可以是读或者写操作，B也可以是读或者操作，A与B有fence指令**

Fence指令，其语法格式为：Fence [r][w][i][o], [r][w][i][o]; 顾名思义，它就像一道屏障，把前面的存储操作和后面的存储操作隔离开来，fence之前的存储操作不能推迟到fence指令之后运行，而fence之后的指令也不能提前到fence指令之前执行， fence指令中参数表明需要隔开的存储操作的类型(read, write, input, output)。

注：为了有利于大家理解，此处也罗嗦一下fence.i指令和sfence.vma。

(1) FENCE.I指令主要处理的是指令存取一致性的问题。如果系统中采用了i-cache和d-cache，对于一些自修改(self-modifying)程序，代码在执行过程中生成一些新的指令代码（而不是有编译器在编译的时候就确定好的执行代码），由于修改的新的指令代码也是先保存在data-cache中，CPU的取指单元从i-cache取指令，那怎么才能把位于data-cache中的新指令反映到i-cache中呢？这时候就该fence.i指令上场了，fence.i指令主要是把i-cache中当前的预取指令invalidate掉。

(2) sfence.vma指令用于更新MMU（内存管理单元）中页表信息。比如操作系统中进行了进程的切换操作，由于不同的进程可以采用不同的地址映射页表（完成cpu发出的虚拟地址到总线上物理地址转换），所以此时需要采用sfenc.vma指令来更新mmu中的页面信息。

规则5-7：**对于Acquire和Release的支持** 

AMO和LR/SC指令格式中含有可选的acquire和release指示位，如下图所示：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_91b8b17554b9.jpg)

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_77295755012c.jpg)

通过这些指示位，可以达到如下的内存访问顺序保证：

（1） acquire后的所有操作不能在acquire指令之前执行；

（2） 所有relase之前的操作不能在release指令之后执行；

（3） release和acquire之间的程序顺序指令，也必须以全局内存顺序执行。

规则8：**LR-SC操作**

在LR-SC的成对操作中，LR操作必须在sc操作成为全局可见之前就确认其值。该规则在部分情况下与规则1（地址重叠情况）以及与规则11（语义依赖）有点冗余，但少数情况下不完全雷同。

规则9-11：**指令A和B有语义上的地址依赖，控制依赖（比如if-else）或者数据依赖**

指令A和B有语义上的地址依赖，控制依赖（比如if-else）或者数据依赖，则全局顺序上A必须在B之前执行。

（1） 如果B是一条存储指令，则控制依赖关系例外 ？？

（2） 地址依赖关系：B操作的内存地址来源于A操作的结果；

（3） 控制依赖关系：根据A操作的结果来选择执行分支指令的不同分支，从而确定B是否需要执行；

（4） 数据依赖：A操作的结果用来提供B指令（存储指令）的值。

规则12-13：**指令A和B有间接的依赖关系（比如B依赖M,M依赖A）**

（1） 程序顺序上指令B在指令M之后，而指令M对指令A有地址依赖关系。

（2） B指令的返回值来源于同一个核(hart)中前面的M指令的存储值，而M指令对A指令有数据依赖或者地址依赖。

#### 3.3 RVWMO Litmus测试

我们看到RISC-V的RVWMO模型规则还是很复杂的，那怎么评判这些规则在CPU设计中是非正确地遵守了呢？所以我们需要进行很多测试工作，我们把这种针对内存模型的测试称为litmus test测试。Litmus测试的工具和方法很多，测试代码大部分可以采用工具（比如diy工具套件, 此处的diy不是让你自己diy-do it by youself）自动生成，当然根据需要，你也可以借鉴别人写的或者自己写一些。测试的具体方法和环境的搭建可以参考专门的工具文档。

#### 3.4小结

由于每种CPU架构其内存模型都可能不一样，其同步过程与处理器紧密相关，那怎样保证代码具有兼容性呢？用高级语言为x86处理器（及其内存模型）写的代码经过重新编译后也需要能够在RISC-V环境下运行呀，解决方案是建议大家使用标准同步函数库来编写同步程序，使程序对内存模型的选择不敏感，并得到好的性能。
