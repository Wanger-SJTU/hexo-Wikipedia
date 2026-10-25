---
title: Memory Model：从SC到HRF
date: "2024-12-22 00:00:00"
updated: "2024-12-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Memory-Model-从SC到HRF/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/13980513759
---


Memory Model，存储模型。这并不是一个简单的硬件概念，往往是硬件/软件约定好的一套访问memroy的规则。换言之，Processor设计者会给出详细的memroy model，使用Processor的软件人员需要透彻了解该model，才能写出访存功能无错的code。

Memory Model核心的一个词语是“Consistency”，区别于Cache的Coherence（一致性），可以用“连贯性”来翻译。二者是完全不同的两个概念，如果非要说有什么联系，我们可以粗暴的认为：Cache Coherence问题是典型的一种在维护Memory Consistency过程中会遇到的问题，即：Memroy Model制定了一些规则，硬件引入私有Cache后违反了这些规则，那么就要去解这Coherence，才能保证Consistency不被破坏。

一本经典的英文教材是《A Primer on Memory Consistency and Cache Coherence》，知乎上有系列贴对其进行翻译，是一项十分有益的工作，链接：[kaitoukito：A Primer on Memory Consistency and Cache Coherence 翻译计划（一）：引言](https://zhuanlan.zhihu.com/p/552305284)

### 经典常见memory model

#### SC（Sequential Consistency）

定义:多个线程中的所有内存访问指令最终是以某种先后顺序（全局内存访问顺序，global memory order）访问集体共享的memory。然后具体到一个线程中的内存访问指令，这些指令在global memory order中的先后顺序跟它在程序中的先后顺序（program order）一致。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dfbcd7cac384.jpg)

SC模型示意如图所示，线程1和2都可以访问二者共享的一个Memory，二者访存的指令序分别是ABC和123，在Memory端口上允许ABC123这样的顺序进入Memroy，也允许A12BC3、1AB23C……，但是不允许BAC123，因此SC模型要求线程自己的Program Order要体现在全局的Global Order中，B跑到A前面，不被允许。

#### TSO（Total Store Ordering）

在SPARC中首次提出，并在x86架构中使用。**处理器发展过程中，为了提升性能，store Memory时，引入了硬件Write buffer。让store操作是先进入write buffer，再进入memory。但是这一方法会导致：后续的load跳到了同线程store之前进入共享memory。在SC中这是违法的，禁掉write buffer是一种方法，但是会影响性能。遂提出TSO模型，认为load-> store序可以违背。

但是一个很显然的问题在于如果是同地址的写后读，读一旦跑到写后面，结果可就错了。为了保证不出错，在TSO下，如果想人为要求一些保序行为，必须由使用者显式地进行保序操作。

借用一下这张图，使用者自己通过程序手段来实现一定顺序：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_89dd0d1e39bd.jpg)

C1设置flag，C2在读到flag之前一直循环FENCE指令就是保序显式指令，或者叫内存barrier。可以简单理解为一堵墙，在FENCE之前的指令不能越过这堵墙跑到后面，反之，在其后的指令也不能跑到前面执行。（此处的前后是Program Order）

TSO引入后，load->store序不再强制要求，借助write buffer甚至可以将同地址的load->store进行优化，即：store的data直接forwarding给后续的load，避免了load再去访问Memory，很多资料中所谓的bypass。在TSO中，可以总结load、store之间的保序关系见下图：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b2e937a8e2a7.jpg)

TSO的保序要求图中的RMW是read-modify-write，常常是atomic操作，在不可打断的过程中，完成一次完整的的先读，再改，改完结果再写入Memory的操作。**

#### XC/RC（Relax/Release Consistency）

在TSO的基础上，完全可以更进一步放松保序限制，<strong>因为从功能正确性来看，除了前后存在依赖的访存顺序一定要保证以外，绝大部分的访存操作顺序并不影响最终结果。</strong>这些访存顺序被允许乱序，是可以提升性能的，所以weak model在现当代的处理器中经常见到（PowerPC、ARM、RISCV）

`//x和y是不同地址的变量，且初始值为0 
x = 1  //store      
y = 1    
r1 = y  //load 
r2 = x
`

上述程序执行完之后，最终结果可以是r1 = 1，r2 = 0吗？

SC/TSO内存模型：不能。因为:四条指令的顺序，除了指令2和3在TSO模型中能乱一下之外，都是保序的。r1在TSO中有可能读到0，但是r2无论在TSO还是在SC都只能读到1。

weak内存模型：允许。因为保序被打破。

TSO中已经需要显式地执行顺序了，那更加宽松的weak类Model也必然是需要引入同步/保序的机制手段，让程序员显式指定一些顺序。<strong>随着顺序性从strong→weak递减，访存程序的可优化性递增，但程序员为了功能正确要额外注意的点就会递增。</strong>但是芯片硬件设计复杂度不一定递增，因为有的时候无脑强制保序在硬件设计上反而简单，显式指定的同步/保序反而代价高一些。**weak模型引入的顺序操作，比如FENCE（XC）、比如acquire/release（RC）。区别在于：

- FENCE是更加严格的，保前也要保后，可以理解为一道墙隔开前后的访存指令段，不能逾越；
- acquire/release则是将FENCE功能拆分，acquire保后，release保前。
`acquire(x)   
y = 1       
z = 2       
release(x)  
//acuqire之后的访存指令，不允许跑到acquire之前去执行； 
//release之前的访存指令，不允许跑到release之后去执行； 
//允许单独出现，只保半边。   `

weak模型下的load/store保序要求见下图：可以非常明显的看到，只有同地址或显式指定，才要求保序

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6a63676978a4.jpg)

XC下的保序要求

#### 变种概念之SC for DRF（Data_race_free）

DRF: 认定程序没有data race 发生，即对于任何内存位置的读写操作，如果它们没有被适当的同步机制（如互斥锁、原子操作等）所保护，那么它们就不会同时发生。
SC for DRF：用同步机制保护的访存序是SC的，而不被同步机制保护的可以完全乱序，认为它们不会产生竞争。

#### 常见概念之atomic操作

atomic operation（或称RMW），简称AMO。是各大Processor中常见的一类指令。顾名思义，这类指令最大的特征是原子性**（很长时间内，原子被认为是不可分割的最小粒子），即：必须将操作全部完成，中间不允许被打断。

具体硬件实现方式有两个大类别：

- core将atomic拆分成load-modify-write。即：先发送load到memory，读回value，同时上锁；在core的alu中完成指定计算操作；将result再写回到memory中，并解锁。在这期间，对该地址的所有改动都会fail，原子性不能破坏。
- 在memory侧实现全部的atomic行为，即：core将AMO指令直接送给memory，外置的控制单元对Memroy完成RMW操作，相比于1的好处是latency大大降低，坏处则是引入了一个memory侧的alu。
core如何认定自己的atomic行为成功了呢？其实需要借助load回的old value，如果该value不是预期的，那说明本次atomic并未成功，可能已经被其他线程抢先了。

有的AMO访存序列前后是可以交换的，比如atomic add_1，先后顺序乱掉并不会导致最终结果错误。常见于Histogram算法，多线程对一个变量不断加1。但是有些AMO序列是不能交换的，比如atomic float_add，前后做浮点加法，顺序乱掉会导致最终结果不一样，此时就需要借助上述提到的查看old data来一次次确定自己的atomic是否成功。

### RISCV的Memory Model

RISCV采取的是weak memory model，全名RVWMO（RISC-V Weak Memory Ordering）。基本ISA中的FENCE指令，以及A扩展中的LR/SC和Atomic指令（伴随的aq/rl域），都是可以用来维持Order的指令。<strong>此外，有一个扩展Ztso，for RISCV TSO序，RVTSO是RVWMO的增量，</strong>目的是便于SPARC/X86上的程序可以移植到RSICV上。<strong>显然：RVTSO的程序，会默认一些顺序硬件是保证的。如果把这样的程序跑在RVWMO的处理器上，处理器压根不保证要的顺序，那就会出错。反之并不会出错，但是会变得低效，因为原本可以乱序的行为被严格保序进行。</strong>

RVWMO的ProcessorRVTSO的ProcessorRVWMO的程序合适低效但是不会错RVTSO的程序会出错合适
#### RVWMO

在RVWMO中，所有的访存操作都是确定的行为，除了两个例外：

- 失败的SC；
- 当XLENstore序（PS：类似TSO序）*
<strong>SPEC中给出PPO的13条规则（a操作在b之前）</strong><strong>地址重叠顺序</strong>

- a和b地址有overlap，b是store；
- a和b都是load，读相同的x，a和b之间没有store操作修改x value，此时a和b得到的value由不同其他内存操作写入的。
- a是atomic或SC，b是读，b一定获得a写入的value
<strong>显式同步</strong>

4. FENCE指令约束a必须在b之前实现；

5. a标记为acquire（aq）

6. b标记为release（rl）

7. a和b都有aq和rl

8. a和b是配对出现的（lr/sc指令就是配对的）

<strong>Syntactic 依赖</strong>

9. b对a有语法地址依赖，即：b指令访存的地址，依赖于a提供

10. b对a有语法数据依赖，即：b指令访存要用到的data，依赖于a提供

11. b是store，b对a有语法控制依赖（定义：在a和b之间有一个指令m，它是个branch or ijmp，m对a有语法依赖）。简单理解就是：m既然要跳转且依赖于a，那跳或者不跳，往哪里跳，都需要排在a后面决定。如果此时b作为一个store跑到a前面先store，可能造成功能错误。（b甚至都被跳过没执行的机会）

<strong>Pipeline 依赖（暂时感觉这俩只要address不重叠，也不会错？）</strong>

12. b是load，a和b之间有一些store m，且m依赖于a。那么b返回的value取决于m写入的value。简单理解就是：原理上来讲如果a和m涉及到的地址和b不重叠，其实是没问题的，但是m作为一个store必须依赖a才能执行，那它到底有没有修改b的地址，必须按照a-m这样顺序执行完才知道，如果允许b先执行，是有可能出错的。

13. b是store，在a和b之间存在一些m，m对a有地址依赖。简单理解就是：b作为一个store，到a前面修改了一些东西，a还可以正常执行（a不依赖于b），但是a取回来的东西可能被改了，此时依赖于a的m就功能错误。

除了上述13条rule外，SPEC还定义了三大Axioms：

- Load value Axiom: load读到的value，一定是global memory order/program order最近一次的store更新进去的。
2. Atomicity Axiom

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dc8aa368fc97.jpg)

Atomicity Axiom示意LR-SC是RISCV A扩展中的显式指令，LR是load一个地址的value，同时形成一把锁，SC是store condition，也就是后面再来store该地址如果发现锁已经被破坏，返回store 失败信息。LR和SC必须成对出现。

3. Progress Axiom

  一个无限的内存操作序列，不能放在某个内存操作之前。**  简单理解就是：防止饿死后面的

####   RVTSO

  Ztso扩展不增加任何新的指令，但是调整了RVWMO：

- 所有load操作默认加了注解：acquire-RCpc；（保后）
- 所有store操作默认加了注解：release-RCpc；（保前）
- 所有AMO操作默认加了acquire-RCpc和release-RCpc（保后也保前）
分析来看，发现1和2两个约束，直接使得：store->load，load->load，store->store一定是保序的了，而唯一例外是load-> store，回顾上文我们发现这就成功达成TSO要求。
而上述三条操作的提出，也直接让PPO定义的rule除了4~7，其他均冗余，因为建起来的TSO三大强保序要求已经把很多rule包含在内了。因此，适配RVWMO的程序是可以在更strong的RVTSO处理器上运行的，但是适配RVTSO的程序，已经默认三大强保序时硬件实现了的，不能跑在实际上硬件没做这些强保序的RVWMO处理器上。

### HRF（Heterogeneous-race-free ）

参考论文：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2760427b7a34.jpg)

参考论文截图论文认为，在当前流行的异构架构中，原有的同构架构下的处理器memory model不再完全适配。由于异构架构下的全局通信延迟非常高，所以有了scope的概念，只需要在scope范围内实现consistency。
但是各家有各家的具体玩法，没有一个统一的memory model，论文提出了SC for HRF，具体分为两个类别：HRF-direct和HRF_indirect

#### HRF-direct

同scope的线程之间进行同步通信。如果两个线程或者操作确实存在data race，又没在同scope内采用同步机制，那在HRF-direct模型中，result不可知。
Formal Definition：**

- <strong>Ordinary Conflict：</strong>两个操作当且仅当它们地址相同，且至少有一个是write，认为它们冲突；
- <strong>Synchronization Conflic</strong>  ：两个不同scope的同步操作，当且仅当它们同位置，且至少有一个是write（或者RMW），认为冲突。
- <strong>Program Order</strong>：同线程的op1在op2之前完成
- <strong>Scoped Synchronization Order</strong>  ：同scope内，release1在acuire2之前完成。
- <strong>Heterogeneous Race</strong> ：1和2两种冲突情况下的乱序
- <strong>Heterogeneous-race-free Execution</strong>  ：没有5发生，就是异构无竞争的执行序。
- <strong>Heterogeneous-Race-Free Program</strong> ：一个程序，全是6
- <strong>SC for HRF（HRF-direct）</strong>：跑的都是7这样的程序，说明这个系统遵循HRF-direct。
论文抽象了一个现在GPGPU常见的架构框图，如下所示：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a047ff2ce98f.jpg)

论文抽象GPGPU框图在该结构下，如果想遵循HRF-direct该怎么做呢？

- release行为中：要把scope内非所有线程都能看到的memory中的dirty data flush；
- acquire行为中：要把scope内非所有线程都能看到的memory中的data invlidate
- atomic：把atomic操作做到scope内所有线程都能看到的memory层级
举例：设scope是device，则对于release，必须把L0/L1级别的memory中的dirty data都刷到L2；atomic要做到L2；

#### HRF-indirect

基于HRF-direct，但是引入传递性（transitivity）：不同scope之间，如果存在一个同步机制传递链，是允许通信的。论文给出了下图所示的一个示例：当出现跨越scope的data race时，HRF-Indirect允许借助传递性来让其变成data-race。

显然，HRF-indirect相比于HRF-direct更为宽松，类似于RVWMO和RVTSO的关系，后者的程序不能跑在前者的Processor上，可能会有功能错误。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ff3673d62279.jpg)

### 写在最后

简单小结下Memory Model带来的软硬件人员的协同流程：

- Memory Model更多的是一种访存规则集合，硬件人员在指定好这些规则后，软件人员就会认为你的硬件是一定保证这些规则的。在这些规则之外，软件人员默认是free的，是可以随意调整访存指令顺序的。硬件也是不关心不保证它们的顺序性的。
- 而硬件不管的，但是软件人员自己希望保证的某些顺序，可以使用Memroy Model中指定的手段，比如同步指令，来显式表明。而硬件必须保证支持这些手段是有效的。尤其是在异构处理器中，往往一次同步需要借助多种同步手段协同来完成。
