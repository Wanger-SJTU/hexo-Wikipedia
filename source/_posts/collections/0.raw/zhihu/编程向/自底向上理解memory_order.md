---
title: 自底向上理解memory_order
date: "2024-03-02 00:00:00"
updated: "2024-03-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/自底向上理解memory_order/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682286231
---


在C++/Rust中，在访问一个原子变量时，无论读写，都要求传入一个叫做`memory_order` 的枚举变量，这些变量有什么用？它们是如何影响我们程序的正确性和性能的？我们要如何选择合适的`memory_order`? 本文以最常见的x86系统为例，从体系结构说起，理解不同memory order背后CPU的不同操作。

<strong>阅读前置要求: 了解经典5级流水线的基本概念，知道每一步在做什么，明白流水线对性能的提升，了解cache的基本原理，了解缓存一致性协议MESI。 另外，不要把本文当做教程，因为不可能把各方面细节都讲清楚，可以当做一个引子，对感兴趣的部分还是要多读原文。</strong>

### 1. 经典5级流水线<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1) 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_11bcdab34774.jpg)

经典5级流水线CPU将指令执行分解成5个部分，分别是IF 取指令，ID 译码，EX 执行，MEM 访问内存和WB 写回，由于默认大家已经了解经典的5级流水线CPU，这里不再介绍每一步的意义。

#### 1.1 Data hazard

- <strong>True dependence: read-after-write (RAW)</strong>
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_1a73dd7e6506.jpg)

RAW流水线中常见的data hazard，由于第一条指令更新R1要在第5个时钟周期才完成，而第二条指令需要在第3个时钟周期就需要知道R1更新后的值，因此第二条指令必须阻塞等待，否则第二条指令读到的就是旧的R1值，使程序结果错误。这种对同一个寄存器先写后读的情况就称为RAW(read-after-write)，也叫true dependency，表示两条指令有依赖关系。在某些场景下，可以通过bypassing或者叫forwarding的方式来避免等待，但这只是属于优化，不过多关注。

- <strong>Anti dependence: write-after-read (WAR)</strong>
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_43a3ef312342.jpg)

WAR对同一个寄存器，第一条指令读它，第二条指令写它，这种场景就是WAR(write-after-read)，也叫anti dependence。幸运的是，在5级流水线中，因为WB阶段在最后，所以第1条指令读到的R2值，肯定是第二条指令更新R2前的旧值，也就不存在data hazard。

- <strong>Output dependence: write-after-write (WAW)</strong>
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_dc237ed9bc86.jpg)

WAW对同一个寄存器，第一条指令写它，第二条指令也写它，这种场景就是WAW(write-after-write)，也叫output dependence。和WAR的分析类似，第二条指令更新R1一定在第一条指令更新R1之后，也就是说R1最后的值一定是第二条指令决定的，不会反转顺序造成结果错误。

#### 1.2 Control hazard

指令通常是按第 i 条，第 i +1 条，第 i+2 条...这样顺序执行的，但遇到分支指令时会发生跳转。有些分支指令是无条件跳转，有些则是有条件跳转。对于有条件跳转，CPU需要根据跳转指令的结果来判断是不是真的要跳转，因此为了等待计算结果，可能需要等待几个周期之后再根据结果取下一条指令。当然CPU都有分支预测功能来减少等待以提高性能，但这不是重点。

#### 1.3 总结5级流水线

经过data hazard和control hazard的分析，我们体会到5级流水线是能保证指令执行的正确性的，也就是说5级流水线的计算结果和不使用流水线的CPU是一样的。至于忽略的分支预测和bypassing都属于性能上的锦上添花，因此不关注。

**

### 2. 超标量处理器<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2) 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_33aedf661467.jpg)

superscalar processor实际上，在EX阶段，不同指令需要的硬件单元和时间都是不一样的，比如计算整数的硬件可能无法计算浮点数，且除法运算会比加法慢得多。如果还像5级流水线那样统一EX的周期，且一次只允许一条指令在EX阶段，那么处理器性能会有显著瓶颈。比如假设第一条指令是浮点数乘法，需要EX 7个单位时间，那么第二条的整数加法就需要一直等待浮点数乘法结束后才能执行，而实际上完全可以在执行浮点数乘法的时候同时执行整数加法。

于是这里引申出了指令并行(instruction level parallelism, ILP)的概念，即指令间不再是像5级流水线一样，不同指令一定在不同的执行阶段，现在可以两条指令同时处于EX阶段执行。

ILP理论上有多种实现方式，工程师们可以发挥自己的聪明才智，在处理器上添加各种硬件，设计各种算法，只要保证计算结果和不使用任何流水线的CPU一样即可。

这里我们讲述一个现代主流的实现，in-order fetch/decode, out-of-order execution, in-order commit的处理器. 简单说，就是这个处理器仍然按顺序读取指令，按顺序解码指令，但在解码后可能会乱序执行指令(即先解码的指令后执行，后解码的指令先执行)，最后通过某种机制再按顺序提交(commit)这些指令的最终结果，从而修改处理器的状态。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4276a835a472.jpg)

顺序取指，乱序执行，顺序提交整体结构如上图，下面依次分析

- Instruction Fetching**
超标量处理器一次可以取多条指令，但我们这里并不关心，因为这只关乎性能，取指令本身还是顺序的。

- <strong>Instruction Decoding</strong>
对于简单的RISC来说，译码比较简单。但是对于CISC，比如x86来说，译码会比较麻烦。因为一条x86指令可能被翻译成连续几条微指令( \mu\ operation )，而x86处理器实际也是在执行微指令。一个例子是x86底层实现仍然是Load/Store architecture。

decoding阶段会识别指令类型，读取需要的操作数，但是操作数可能因为data hazard还不可用，这个时候不等待，指令直接进入dispatch阶段，这时候仍然是顺序的。

- <strong>Instruction Dispatching</strong>
指令从decoding阶段进来，就要准备执行了，dispatching阶段就是根据指令类型，将指令分配到合适的功能硬件(function unit)中。比如将浮点数运算指令分配到浮点数硬件中，将整数运算指令分配到整数硬件中。

但是这时候可能指令需要的操作数还在计算中，因此必须等待，指令停留的位置就叫做reservation stations(RS)。指令会在RS中等待需要的操作数，当所有操作数都准备就绪后，指令被分配进对应的function unit开始执行。这个时候，指令就并不是按顺序进入下一阶段了，顺序在前的指令可能由于等待操作数而后执行。

- <strong>Instruction Execution</strong>
执行指令，多个指令可以在不同的function unit中同时执行，且它们执行所需的时间也可以不同。另外，读取内存也是在EX阶段，而不是单独的MEM阶段，至于写内存，则在下一个阶段。

- <strong>Instruction Completion and Retiring</strong>
指令执行完成(finish)后，不会像5级流水线那样立即将结果写入寄存器，而是将指令和指令结果放入reorder buffer(ROB)，然后按指令原来的顺序依次commit指令，即将指令的结果更新到处理器的状态中。比如有两条指令，第一条是浮点数乘法，第二条是整数加法，显然第二条指令先执行完并进入ROB，但此时它不会去更新处理器中的整数寄存器，而是等待第一条浮点数指令完成进入ROB，且第一条指令更新完浮点数寄存器后(commit)，再更新第二条指令的目的寄存器。指令commit并离开ROB时，被认为是*completed*

这样，虽然指令的执行是乱序的，但指令真正"有效果"是顺序的。

另外，对于访问内存的store指令，在ROB中commit时，会将store指令放入store buffer中，等待被更新到内存中。当指令完成更新内存且离开store buffer时，称为*retired。*

我们可以总结指令的一生： *fetch, decode, dispatch, issue, execute, finish, complete, and retire.  *其中issue是进入function unit开始执行的时刻，finish是离开function unit的时刻。

- <strong>总结超标量处理器</strong>
超标量处理器实现了指令的并行，让处理器性能更进一步。

同时也了解了我们常说的"CPU乱序执行"到底是怎么一回事（上面的讲述的处理器结构和Intel P6是比较相似的），CPU的乱序执行并不是一顿乱跑，而只是根据依赖关系优先计算出了某些指令的结果，最后修改处理器状态仍然是顺序的，保证了计算结果的正确性。

超标量处理器也会有data hazard，control hazard的问题。比如会有5级流水线没有的 WAW，WAR问题，工程师通过寄存器重命名的方式解决了它，这些内容没有细讲，因为不是太重要。重点是了解超标量处理器大概是怎样工作的，认识到乱序执行处理器的结果和顺序执行是一样的。

### 3. x86-TSO

目前为止，我们只在讨论处理器的体系结构，没有任何对原子指令的说明。接下来，重新审视超标量处理器。

我们已经知道，超标量处理器的运行结果和按顺序一条条执行指令的结果是一样的。但是，我们只讨论了单核的情况，所有指令都在一个处理器中执行，而现代处理器几乎都是多核，因此需要重新思考在多核情况下，上面描述的超标量处理器行为是否和没有任何优化的处理器结果相同。

#### 3.1  cache coherence<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3) 

如果两个处理器核没有读写同一个内存位置，那么不会有任何data race产生，因此我们考虑不同的核读写同一个内存位置。根据体系结构的知识，我们知道处理器不是直接和内存交互的，处理器只会直接读写L1 cache，至于缓存何时写回main memory，缓存如何淘汰替换等等都是由memory子系统决定的。CPU不关心具体实现，CPU只知道在cache miss的时候会等很久。

同样的，当一个核A修改了内存地址x的内容时，如何通知另一个核B，其本地cache的x值不再有效也是由memory子系统决定的。大家希望的是，当核A在本地cache修改了地址x的内容后，核B再从本地cache中读x时，能保证读到的一定是A写入的新值而不是本地的旧值。为此，工程师设计出了缓存一致性协议，比如著名的MESI。有了这些协议，我们可以将所有cache和main memory都看成整体一块的memory system，且每次读写cache都是“原子的”，核A修改地址x的内容时，我们可以认为其他所有核都能立即看见x的内容变了。

这里一定要理解普通的读写内存/cache可以看成是原子操作。因为我们有MESI协议，当一个核A准备修改地址x的值时，cache硬件会执行MESI协议，会让其他核本地cache中的x值都失效，这样所有核中只有核A的x值有效。当以后其他核想再读x时，就可以从核A的本地cache中拿到最新值。这一切都发生在cache硬件中，对处理器来说是个黑盒，处理器看到的就是一个整体的，能立即更新的内存系统。至于我们常说的各种并发问题，并不是由cache这一套系统引起的，而是由处理器设计造成的，务必要分清。

#### 3.2 sequential consistency

理解了内存系统后，再考虑一个没有流水线，没有任何优化的多核处理器。

每个核按代码顺序依次执行指令，但因为是多核的，整个系统看上去像是两个核在随机交替执行。比如假设有以下两个核在各自执行指令:

`x, y初始值为0

核1
S1: x = NEW;
L1: r1 = y

核2
S2: y = NEW;
L2: r2 = x;`

问，最后r1和r2的值是多少？

在多核系统中，我们无法确认核1和核2中的指令哪个先执行哪个后执行。有可能核1的指令全部执行完后再执行核2，也可能核2的指令全部完成后再执行核1，也可能交替执行，所以最终可能的结果不唯一。我们不能说哪个结果更好，只能说某个结果是否合理，是否有可能出现。

我们先前假设了这个多核处理器是没有任何优化的，所有指令依次执行，没有交替。我们说满足这个特征的处理器是符合sequential consistency(<strong>SC</strong>)的。SC简单理解就是没有任何优化的交替顺序执行。回到上面的例子，分析哪些结果是符合SC的，哪些不是。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_5fb5082c693e.jpg)

4种可能的执行结果，前3种是符合SC的上面前3种执行结果是符合SC的，比较容易理解。第4种不是，因为S2最先执行，L1最后执行，那么L1读y值应该是NEW而不是0，因此是不满足SC的。

下面对SC做更正式的定义

我们首先定义  是<strong>每个核的</strong>程序顺序(program order),  表示<strong>全局的</strong>访问内存的顺序(memory order)。根据上面例子，有 S1  ，因为按照程序顺序，S1指令是在L1指令的前面。再以上图(a)的情况为例，有 S1  ，因为S1比S2先访问内存，即使S1和S2不在同一个核中，但因为访问同一个内存系统，因此也能区分出memory order，但我们无法区分它们的program order。

下面给出正式定义

- 对于两个地址a和b，无论它们是否相同，都有

- L(a)     即 Load -> Load
- L(a)      即 Load -> Store
- S(a)      即 Store -> Store
- S(a)      即 Store -> Load
2. 每一个Load指令，读到的值一定是相同位置最后一次Store指令写入的值

比对这两个要求和我们设想的无任何优化的多核处理器，发现后者是满足SC的。实际上，即使是经典5级流水线，也是满足SC的，因为每个核本身可以看成是顺序执行的。

<strong>SC的原子操作(RMW)</strong>

这里的原子操作主要指先读后写这类的RMW操作，因为只读/只写本来就可以看成是原子的。SC的原子操作很容易实现，一种最简单的方法是锁定整个内存系统，只允许当前原子操作执行，只不过性能不好。

#### 3.3 TSO

SC是最符合直觉，最严格的一致性模型，但是性能也最差，因为要求包括访存指令在内的所有指令都按顺序"生效"。

于是工程师们提出了total store order(TSO)模型，没有为什么，就是一种被广泛采纳的设计。

处理器不再等待Store指令更新内存，而是和上面描述的超标量处理器一样，将更新指令放入本地的write(store) buffer。如果当前核需要读的值恰好在write buffer中，则可以通过bypassing提前读取新值，不需要等Store完成。

TSO模型因为引入了write buffer，会产生一些反直觉的结果，但对大部分程序是没有影响的。和SC类似，TSO的形式化说明

-  需要满足以下限制

- Load -> Load   
- Load -> Store
- Store -> Store，因为是按program order进入write buffer，因此store -> store满足
但是不再有Store -> Load，因为program order在前的Store，可能在write buffer中时间较长，之后的Load指令已经从memory中读到数据了。所以从memory的角度看，Load   Store，但Store   Load，所以不满足Store -> Load了。

2. 每一个Load指令，读到的值要么是相同位置最后一次Store指令写入的值(和SC相同，从cache中读)，要么是从本地write buffer中读(Store指令还没有发送给cache)。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_e710416bfae0.jpg)

TSO允许，SC不允许再重新分析上面不符合SC的结果，有了write buffer以后，S2将写操作放进write buffer，然后L2读r2为0。接着S1执行写操作，也将其放进自己的write buffer，然后执行L1. 而此时S2可能还在write buffer中，没有真正更新cache，因此L1读到的还是0. 最后时刻，S1和S2离开write buffer，此时x, y都是新值，但之前r1, r2读到的都是0，这就是TSO带来的反直觉的结果。

<strong>TSO的原子操作(RMW)</strong>

由于有了write buffer，不能再像SC那样简单锁住整个系统后单独执行指令。假设我们这样实现了，原子操作的store部分就比write buffer中的store操作先更新内存，违反了Store -> Store约束。所以，RMW操作需要先清空本地write buffer，再执行原子操作的Load和Store部分。

<strong>TSO fence</strong>

因为TSO没有了Store -> Load约束，但有时候程序员想避免一些反直觉的情况，于是有了fence指令来进行干涉。

fence本身是保证program order在fence之前的指令，其memory order先于，program order在fence之后的指令。对于TSO来说，因为只缺Store -> Load约束，所以fence本质是不让load指令从write buffer中通过bypassing读值。因此fence一种简单的实现就是排空write buffer，并且在fence指令commit之前，不允许后续的Load指令执行。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_c65c12319dbb.jpg)

有了fence以后，上面的例子不再可能出现r1 = r2 = 0的情况，因为fence强制清空write buffer。

#### 3.4  x86体系结构

关于x86的一致性模型，其官方始终没有严格说明，但是根据研究人员探索，大致描述出了x86-TSO<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)结构，基本可以认为和上面描述的TSO一样。具体细节可以阅读参考资料中的原文，另外需要注意的是，x86官方从来没有保证实现的是TSO，也没有保证未来不变。

### 4. C++ memory_order<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5) 

终于从硬件来到语言层面，了解了硬件工作原理后，再来理解C++ 的memory_order就要容易得多。C++是可以运行在不同硬件平台的，不同平台有不同的一致性模型，我们这里只描述其在x86系统下的实现。

首先，我们要理解为什么需要memory_order，虽然memory_order是和原子变量，原子操作联系在一起的，但实际上memory_order和"原子"本身没有任何关系，选择memory_order是<strong>为了同步</strong>，而不是原子操作。无论哪种memory_order，其操作本身都是原子化的。

- <strong>memory_order_relaxed</strong>
C++对memory_order_relaxed没有任何同步要求，只要求操作本身是原子的。回顾我们在TSO中讲解RMW操作的实现，原子操作会清空write buffer，因此即使选择memory_order_relaxed，x86实际上是有一定同步机制的。这也是为什么x86被认为是强一致性模型，因为其实现中默认会有同步机制。

relaxed一般用于计数，因为不需要同步，只需要保证计数正确。

- <strong>memory_order_consume</strong>
官方都不推荐使用了，不需要了解，在Rust中也没有consume这个选项。

- <strong>memory_order_acquire/memory_order_release/memory_order_acq_rel</strong>
acquire用于Load操作，release用于Store操作，acq_rel用于RMW操作。C++要求，如果一个标记了acquire的Load操作，读到的是一个标记了release的Store操作的值，那么要保证Store之前的所有写操作对Load之后的所有指令可见。

相当于说一个线程的Store(a, release)指令和另一个线程的Load(a, acquire)指令建立了同步关系，Load指令之后的指令能看到Store之前的其他store指令的效果。比如

`flag，x 初始为0

线程1
flag = 1;
a.store(1, release);

线程2
if (a.load(acquire) == 1) {
    assert(flag == 1)
}`

当线程2读到a的值是1时，就和线程1的store指令建立的同步关系，根据定义，线程2在load之后能看到线程1在store之前的操作，因此线程2在之后读flag时，读到的一定是1.

想想x86对这里a的操作是如何翻译成汇编指令的，需要加锁吗？可能比较让人意外，这里无论是load还是store，都只会被编译成普通的mov指令，哪怕这是两个原子变量。首先，我们在上文已经说了，处理器对cache/memory的读写操作本身就可以看作是原子的。所以flag和a的值最后一定是变成1，而不会是其他数。至于release/acquire要求的同步，因为x86-TSO是有Store-Store约束的，因此flag一定比a先完成更新，当线程2读到a为1的时候，自然flag已经是1了。所以，x86本身是默认就支持acquire/release的，不需要任何额外开销。

至于memory_order_acq_rel，则是用于RMW操作，可以想象成一个Load acquire操作紧邻一个Store release操作，并且在同一线程中，读写操作不能跨过标记为acq_rel的RMW操作。也就是说，program order在这个RMW之前的，memory order也一定在RMW之前，program order在后的同理。RMW操作需要指令加锁，是为了保证读写操作合起来是原子的，但不需要额外的开销来保证同步，因为TSO的RMW操作本来就要清空write buffer。

一般来说Mutex实现就可以用release/acquire，当获取锁后，可以读到释放锁之前对内存的修改。

- <strong>memory_order_seq_cst</strong>
C++20对seq_cst进行了一波大更新，严格说明比较复杂，但主要是针对其他平台的，对x86来说简单理解即可。这里只大概介绍。

对于Load操作，相当于acquire; 对于Store操作，相当于release; 对于RMW操作，相当于acq_rel。此外，还要求所有标记为seq_cst的操作，有一个统一的全局顺序。

下面举个例子

`z1, z2, x, y 初始值都为0

线程1
x.store(1, seq_cst);

线程2
y.store(1, seq_cst);

线程3
while(x.load(seq_cst) == 0){}
if (y.load(seq_cst) == 1) {
    z1 = 1;
}

线程4
while(y.load(seq_cst) == 0){}
if (x.load(seq_cst) == 1) {
    z2 = 1;
}`

在上面的代码中，如果最后z1是0，说明线程3观察到在某个时间段，x = 1且y = 0，也就是x先被修改。如果最后z2是0，说明线程4观察到在某个时间段，y = 1且x = 0，也就是y先被修改。即线程3和4观察到了不一样的修改顺序，但是因为全部使用了seq_cst，所以实际上不可能同时出现z1 = 0和z2 = 0的情况，这就是seq_cst相比release/acquire加强的地方。(但是x86/TSO即使不是seq_cst也不会出现z1和z2同时为0的情况，可以自行推导一下)

对于x86来说，load指令的seq_cst就是普通mov，store指令是普通指令mov + fence，具体可参考C/C++11 mappings to processors

为什么store指令需要额外加fence，也就是清空write buffer呢？考虑和上面例子相似但又不太一样的情况

`z1, z2, x, y初始值都为0

线程1
x.store(1, seq_cst);
if (x.load(seq_cst) == 1 && y.load(seq_cst) == 1) {
    z1 = 1;
}

线程2
y.store(1, seq_cst);
if (y.load(seq_cst) == 1 && x.load(seq_cst) == 1) {
    z2 = 1;
}`

如果store指令不清空write buffer，假设x, y都在store buffer中停留了很长时间，那么在线程1通过bypassing读到x是1，但y还是0。同理，在线程2通过bypassing读到y是1但x还是0，这样线程1和线程2看到的修改顺序就不一样了，所以store也需要清空write buffer。 当然，存在另外一种实现方式是，在load的时候清空write buffer，store写的时候就是普通的mov，但一般写多读少，为了性能一般选择在写的时候清空write buffer。

### 5. 结语

相关内容很多，可能不少地方都只是略讲，要深入研究还是要多看原文，本文只是起一个介绍入门的作用，如有错误欢迎指正~

### 参考

- [^](#ref_1_0)https://users.cs.utah.edu/~bojnordi/classes/6810/s18/slides/
- [^](#ref_2_0)超标量处理器 https://www.amazon.com/Modern-Processor-Design-Fundamentals-Superscalar/dp/1478607831
- [^](#ref_3_0)Memory Consistency and Cache Coherence https://course.ece.cmu.edu/~ece847c/S15/lib/exe/fetch.php?media=part2_2_sorin12.pdf
- [^](#ref_4_0)x86-TSO https://www.cl.cam.ac.uk/~pes20/weakmemory/x86tso-paper.tphols.pdf
- [^](#ref_5_0)C++ memory order https://en.cppreference.com/w/cpp/atomic/memory_order
