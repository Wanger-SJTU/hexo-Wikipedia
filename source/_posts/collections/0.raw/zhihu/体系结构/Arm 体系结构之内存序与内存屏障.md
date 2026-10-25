---
title: Arm 体系结构之内存序与内存屏障
date: "2024-01-18 00:00:00"
updated: "2024-01-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Arm-体系结构之内存序与内存屏障/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/678584093
---


<strong>欢迎关注我的公众号：窗有老梅</strong>

### 0. 目录

1. 垫话

2. 综述

3. 前置知识

	3.1 Memory types

	3.2 Normal memory

		3.2.1 内存访问序

	3.3 Device memory

		3.3.1 Device type 的 sub-types（子类型）

		3.3.2 处理器真的会在不同 type 上有不同行为？

4. 内存序（memory ordering）

	4.1 乱序的限制

5. 内存屏障（memory barriers）

6. 啥是观察者（Observer）？

7. 数据内存屏障（data memory barriers）

8. 内存同步屏障（data synchronization barriers）

9. 一次访问何时被认为是“已完成”？

10. 内存屏障范围的限制

11. 各种观察者

12. load-acquire 与 store-release 指令

	12.1 Load-Acquire

	12.2 Store-Release

	12.3 Load-Acquire 和 Store-Release pairs

	12.4 sequentially consistent

	12.5 Load-AcquirePC

	12.6 Limited Ordering Regions

13. 指令屏障（instruction barriers）

	13.1 使用示例

14. 知识检验

15. 相关信息

16. 更进一步

### 1. 垫话

x86 架构相关的内存序及内存屏障知识，参阅《Intel SDM 之 Memory Ordering》。

本文为 arm Developer《Learn the architecture - Memory Systems, Ordering, and Barriers》的翻译（https://developer.arm.com/documentation/?lang=en）。

本文非常之好，回答了我对于啥是观察者、啥是 Shareability 域以及啥是访问完成的定义性困惑，果然遇事不决看 spec 比看什么博客（尤其是中文博客）都管用。那些讲内存屏障但不先讲清楚以上这些基础概念的文章都拉黑吧，因为作者只是在机械地背诵，而不是真正的理解了；或者作者压根就没思考过底层细节，因为但凡思考过，这些基础概念必然是跳不过去的。

相对而言，Intel spec 行文要严谨、易读一些，Arm spec 略显诘诎聱牙（当然本文严格意义上不算是 spec，只是一篇 guide），可能是语言表达习惯问题。

### 2. 综述

本文介绍 Armv8-A 架构的内存序模型，并介绍 arm 的各种内存屏障。本文还会指出一些需要明确内存保序的场景，并指明如何使用内存屏障以让程序运行正确。

本文档适用于底层代码（比如 boot 代码或驱动）开发者，以及共享内存的多线程应用程序开发者。

### 3. 前置知识

译者：第 3 章内容属于《Learn the architecture - AArch64 memory model》一文，是本文所要探讨内容的前导知识。

### 3.1 Memory types

系统中所有未标记为 faulting 的地址都会被赋予一个 memory type。memory type 用来从 high level 角度描述处理器与地址区域的交互行为。Armv8-A 和 Armv9-A 架构下有两种 memory types：Normal memory 和 Device memory。

<strong>注意：Armv6 和 Armv7 下还有第三种 memory type：Strongly Ordered。在 Armv8 下，该类型对应 Device-nGnRnE。</strong>

### 3.2 Normal memory

Normal memory 用于行为看起来像是一个 memory 的东东，包括 RAM、Flash 或 ROM。代码只能位于被标记为 Normal 的位置。

Normal 是系统中最常见的 memory type，如下图：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c5b395bf525e.jpg)

图 1：normal type

#### 3.2.1 内存访问序

通常情况下，处理器会按照程序所指定的顺序运行指令。一个指令会按照程序所指定的次数运行，并且每次只运行一个指令，这称为 "Simple Sequential Execution(SSE)" 模型。大多数现代处理器都似乎遵循此模型，但实际上底层会进行一系列优化，以帮助提升性能。

对一个被标记为 Normal 的内存地址进行访问是不会产生直接副作用的（direct side-effects）。也就是说，对此内存地址进行读取会返回数据，且不会引起数据发生变化，或直接触发一些其他的行为。正因为如此，处理器可以对“对 Normal 类型内存地址的访问”进行访问合并、投机读（译者：speculative access，我觉得译为“预读”问题也不是很大）或是乱序读。

### 3.3 Device memory

Device memory type 是用来描述外设的。外设寄存器通常称为 Memory-Mapped I/O(MMIO)。下图是一个示例地址映射下被标记为 Device 的内存区域：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_899939b1a51c.jpg)

图 2：memory mapped device type

对 Normal type 内存的访问是没有副作用的，而对 Device type 内存的访问则相反。Device memory type 用于有访问副作用的内存地址。

举例来说，对一个 FIFO 的访问通常会导致其移动到下一个数据片段。这意味着对 FIFO 的访问次数其影响至关重要，因此处理器必须严格遵循程序的定义。

Device 区域不是 cacheable 的，这是因为大概率你应该是不会想对设备访问进行缓存的。

Device type 的内存区域上不允许做数据的投机读。处理器只能访问 architecturally accessed 的内存，所谓的 architecturally accessed，意思就是指令在执行时所明确要访问的内存。

译者：这里值得重点注解一下，本文行文中有多种对内存访问的定语修饰，比如 architecturally accesses、explicit data accesses，其意思都差不多，指的是一条指令中明确的对内存所进行的访问，典型如“LDR X0, [X1]、STR X0, [X1]”这种。那难道还有非 architecturally accesses 或 implicit data accesses 吗？有的，比如一次 load 背后可能会涉及到页表查询，页表查询也是一种内存访问，但其并不是由指令显式所指定的，页表查询这类所引发的内存访问，不是 architecturally accesses 或 explicit data accesses。**

不应该把指令放在 Device 区域。推荐的做法是总是将 Device 区域标记为不可执行，否则处理器可能会从该区域做指令预取，进而会在 FIFOs 这类“读敏感”设备上搞出问题。

<strong>注意：这里有一个容易被忽略的微妙区别。将一个区域标记为 Device，只会阻止对其进行数据的投机读。将一个区域标记为 non-executable，会阻止指令预取。这意味着，如果要阻止对一个区域的一切投机访问，需要将其同时标记为 Device 和 non-executable。</strong>

#### 3.3.1 Device type 的 sub-types（子类型）

Device type 有四种子类型，分别对应不同的限制级别。以下是最宽松的几种子类型：

- Device-GRE
- Device-nGRE
- Device-nGnRE
该子类型是最严格的：

- Device-nGnRnE
Device 后面的字母表达的是属性的组合：

- Gathering(G, nG)。表示访问可以被合并（G）或不可以被合并（nG）。意思是可能会将对同一地址的多个访问合并为一个访问，或将多个小的访问合并为一个大的访问。
- Re-ordering(R, nR)。表示对同一外设的访问可以被乱序（R）或不可以被乱序（nR）（译者：我觉得翻译成“乱序”或“重排”都行）。当允许乱序时，其乱序规则与 Normal type 一致。
- Early Write Acknowledgement(E, nE)。此属性决定一个 write 操作何时可以被认为是“已完成”的。如果允许 Early Write Acknowledge(E)（译者：early 可以简单理解为“提前”，在事实生效之前，具体讨论见“9. 一次访问何时被认为是“已完成””），则一旦一个 write 操作对其他观察者可见，即使该访问并未真正到达其目的地，该访问依然会被视为“已完成”。举例来说，一个 write 操作只需要到达 interconnect 中的 write buffer，即可对其他 Processing Elements（PEs，译者：就是一个处理器啦）可见。如果不允许 Early Acknowledge(nE)，则写操作必须到达其目的地。
下面是两个例子：

- Device-GRE。此允许 gathering、re-ordering 以及 early write acknowledgement。
- Device-nGnRnE。不允许 gathering、re-ordering 以及 early write acknowledgement。
上面已经讲过 re-ordering 的工作原理，但尚未涉及 gathering 或 early write acknowledgement。gathering 可以将对同一地址的多个内存访问合并为一个 bus transaction，如此实现对访问的优化。early write acknowledgement 表示是否允许内存系统在一个 buffer 达到 core 和外设之间的 bus 上时，就发出 write acknowledgement，这样即使外设尚未收到此 write 操作，其他 PEs 也可以观测到此 write 操作。

<strong>注意：Normal Non-cacheable 以及 Device-GRE 看起来是一回事，实则不是。Normal Non-cacheable 允许数据的投机访问，而 Device-GRE 不然。</strong>

#### 3.3.2 处理器真的会在不同 type 上有不同行为？

memory type 描述了一个地址的可允许行为（译者：“行为”指合并、乱序、投机读等）。咱们只关注 Device type，下图展示了所允许的行为：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e9a0e4361baf.jpg)

图 3：device type

可以看到，Device-nGnRnE 是最严格的子类型，可允许的行为是最少的。Device-GRE 是最不严格的，因此其所允许的行为也是最多的。

值得注意的是，Device-nGnRnE 所允许的行为也是 Device-GRE 所允许的。举例来说，对 Device-GRE 内存并不要求一定要使用 gathering —— 它只是允许 gathering。因此处理器是可以将 Device-GRE 当作 Device-nGnRnE 来对待的。

这个例子很极端，在 Arm Cortex-A 处理器上似乎并不会这样。然而，处理器通常不会在所有 type 以及 sub-type 间做区别对待（译者：理解为处理器的设计也不可能做的如 spec 描述的那么细），比如对 Device-GRE 和 Device-nGRE 用同一种方式处理。这只在 type 或 sub-type 总是更严格时会这样。

有些 interconnects 并不能完全支持 DEvice-nGnRnE 的要求。举例来说，一个对 PCIe Base Register(BAR) 空间的 Device-nGnRnE write，一旦在其到达 PCIe topology 之后就立刻变成一个 posted write（一个无需“写完成”response 的 write）。此场景下，该 write 访问只会有 Device-nGnRE 属性，因为目标 endpoint 无法提供 write 的 response（译者注：目的端都压根不能回复 response 了，就不能强行要求 nE），而是由某些中间组件（比如 PCIe Root Port）来提供。然而，对 PCIe 配置空间的 Device-nGnRnE  write 是一个 non-posted write（需要“写完成”response 的 write），因此这些类型访问的 Device-nGnRnE 需求是可以被满足的。

### 4. 内存序（memory ordering）

Armv8-A 是个弱内存序体系结构，其所支持的内存访问，不会强加任何需要被发起或观察的依赖关系（译者：This architecture permits memory accesses which impose no dependencies to be issued or observe），并且会以与 program order 所指定顺序完全不同的顺序完成。

这种弱内存序的内存行为，只会在以下场景下被允许：

- 所指向内存是 Normal、Device-nGRE 或 DeviceGRE，或
- 跨越一个外设的 Device-nR 访问。
内存乱序可以让处理器运行地更快，如下图所示：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3399da806148.jpg)

图 4：内存序示例

图 4 中，有三条 program order 指令：

- 第一条指令，Access 1，对外部内存的 write 进入 write buffer。此指令后面是两条 program order 的 read。
- 第一个 read，Access 2，未命中 cache。
- 第二个 read，Access 3，命中 cache。
这两个 read 都可以在 Access 1 的 write buffer 完成 write 之前完成。支持 Hit-Under-Miss 的缓存系统，支持命中 cache 的 load 操作（比如 Access 3），可以在程序中更早的未命中 cache 的 load 操作（比如 Access 2）之前<strong>完成。（译者：这很 make sense，命中 cache 的 load 与未命中 cache 的 load，二者之间并无数据上的冲突，乱序是安全的，有点类似《Intel SDM 之 Memory Ordering》"3. Intel Pentium 及 Intel 486 处理器上的内存序[8.2.1]" 中的</strong>白嫖乱序**）。

### 4.1 乱序的限制

在 Normal、Device-nGRE 或 Device GRE 内存上的乱序是可能的。考虑下面的代码序列：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dfceca95f275.jpg)

图 5：示例内存乱序限制的代码序列

如果处理器对这些访问进行乱序，可能会导致内存中出现一个错误值，而这是不允许的。

对同一内存区域的访问（译者：比如本例子中的三条指令，是对 0x1000 - 0x1003 这一相同区域进行访问），必须在它们之间保序。处理器必须检测“写后读（read-after-write）”冒险（hazard，译者：“数据冒险”，这是一个标准翻译），并要保证访问之间的顺序必须是正确的，否则会出现非预期结果。

但这并不意味本示例中的访问是无法被优化的。处理器可以将两个 store 合并在一起，最终向内存系统呈现为一个合并后的 store。处理器还要能检测 load 操作的目标内存是 store 指令所写目标内存的情况，也就是说，处理器可以直接返回新的值而无需重新从内存中读取（译者：类似 store buffer forwarding，参阅《Intel SDM 之 Memory Ordering》“5.5 允许处理器内部的 forwarding[8.2.3.5]”）。

注意：上面的代码序列是刻意构造以展示数据冒险的。具体实践中，数据冒险可能不会这么显而易见。**

再举一个因为存在地址依赖（Address Dependencies）而必须按序执行的例子。地址依赖的一个具体场景是，一个 load 或 store 使用前面的一个 load 的结果作为地址。下面是例子：

LDR X0, [X1] 
STR X2, [X0]  ; Result of previous load is the address in this store.`

	下面是另一个例子：

LDR X0, [X1] 
STR X2, [X5, X0] ; Result of previous load is used to calculate the address.`

如果两个内存访问之间存在地址依赖，则处理器会按其 program order 执行。

该规则并不适用于控制依赖（control dependencies），也就是前一个 load 的结果是用来做判断的（译者：而不是用来访问的，比如示例代码中的 CBZ）。比如：

LDR X0, [X1] 
CBZ X0, somewhere_else 
LDR X2, [X5]      ; The control dependency on X0 does not guarantee ordering.`

	有些情况下，需要对 Normal 内存的访问之间或对 Normal 和 Device 内存的访问之间进行保序，这时候就需要使用屏障指令。

### 5. 内存屏障（memory barriers）

内存屏障是一类指令的总称，该类指令可以显式指定某种形式的保序、同步或对内存访问的限制。

Armv8 体系结构所支持的内存屏障提供了很多功能，包括：

- load 和 store 指令间的保序。
- load 和 store 指令的完成（completion）。
- 上下文（context）同步。
- 对投机访问的限制。
有些场景下弱内存序的体系结构乱序行为是个搅屎棍，其会导致非预期结果。本文介绍体系结构所支持的各种类型的内存屏障，并指出一些需要明确保序的典型场景，同时指出如何通过内存屏障来得到预期结果。

### 6. 啥是观察者（Observer）？

Armv8-A Architecture Reference Manual 使用“观察者”（译者：因为 observe 既是 Observer 的词根，也会当动词来用，为行文清晰起见，“观察者”后续一律不翻译而是直接用 Observer）这一术语来描述内存屏障所能产生的影响。

一个 Observer，指的是一个 Processor Element(PE)，或系统中的其他部件，这些部件可以从内存中 read，或向内存中 write，典型如外设。Observers 可以对内存访问进行观察。内存屏障可以指定哪些 observers 可以在何时观察到这些内存访问。

<strong>译者：这里值得再次重点注解一下，observe（观察）一词我个人觉得其实是比较蛋疼的，叫“perceive（感知）”可能会更容易让人理解。所谓的“观察到”一个内存被更新，指的就是对于这个 Observer 来说，其“感知到”该内存被更新了，也就是在该 Observer 对此内存发起 read 或 write 时，它已明确知晓此内存处最新的值。原文中还用了“visible（可见）”一词，所谓“visible”，就是“可被观察到的”。</strong>

一个内存 write 在到达内存系统中的某个点时，将变的“可见（visible）”。当 write 可见时，其对于内存屏障指令所指定 Shareability domain 上的所有 Observers 来说是一致的（译者：就是大家看到的值一定是相同的）。假设一个 PE 对一个内存地址进行 write，如果其他 PE 在读相同地址时可以观察到更新后的值，则此 write 操作是“可被观察到的”。举例来说，如果内存是 Normal cacheable 的，则 write 操作会在到达 Shareability domain 的 coherent data caches（译者：这么多定语，简单理解为 cache 即可）时，成为“可被观察到的”。

Armv8-A 内存模型被描述为 Other-multi-copy atomic。在一个 Other-multi-copy atomic 系统中，一个 Observer 对某地址的 write，如果可以被不同的 Observer 所观察到，则对该地址进行访问的所有其他 Observers，它们所观察到的结果应该是一致的。但是，一个 Observer 在它的 writes 对系统中其他 Observers 可见之前，Observer 是可以观察到其自己的 writes 的（译者：在 store buffer 里面）。

工程实践中，一个描述为 Other-multi-copy atomic 的内存模型，会允许 PEs 实现 local store buffers，这些 store buffers 并不会对系统中的其他 Observers 一致（译者注：意思是 PE 自己能看到 store buffer 中的内容，但其他 PE 看不到），但会被用来做依赖关系的冒险检查。Store Buffers(STBs) 微架构机制用来将一个 PE 的指令执行流水线与 Load/Store Unit(LSU) 解耦。

### 7. 数据内存屏障（data memory barriers）

Data Memory Barrier(DMB) 用于防止指定的 explicit 数据访问会跨越屏障指令乱序。program order 上在 DMB <strong>之前</strong> 的所有 explicit 数据 load 或 store 指令，会在 program order 上该 DMB <strong>之后</strong>的数据访问<strong>之前</strong>被指定 Shareability domain 中的所有 Observers 观察到。

DMB 指令接受一个参数，该参数指明所需保序的 explicit 访问所属的 types，以及 Shareability domain 中保序所需面向的 Observers。相关讨论在下文 "10. 内存屏障范围的限制"。

以下代码展示了在弱内存序模型下可能的乱序。X1 和 X3 地址处的内存初始为 0x0：

STR #1, [X1] 
STR #1, [X3]  ; Might be observed before the previous STR.`

该例子中，X3 地址处内存的更新和被观察到，可以发生在 X1 地址之前。现在假设另一个 Observer 以相同顺序读取两个相同的内存地址，下表展示了内存系统可能会返回的观察值组合：

X1X30x00x00x00x10x10x00x10x1表 1

下面的例子使用 DMB 指令来强制内存保序。X1 和 X3 地址处的内存初始为 0x0：

STR #1, [X1]       
DMB 
STR #1, [X3]  ; Cannot observe this STR without first observing the previous STR.`

该例子中，X3 地址处内存如果被观察到已更新，则 X1 地址处内存必然也被观察到已更新。现在假设另一个 Observer 以相同顺序读取两个相同的内存地址，下表展示了内存系统可能会返回的观察值组合：

X1X30x00x00x10x00x10x1表 2

下面是关于 DMB 的更多信息：

- 使用一个 DMB 可以在访问之间创建一个顺序。Armv8-A Architecture Reference Manual 将此顺序称为 Barrier-ordered-before。
- 对于 DMB 来说，data cache maintenance operations（译者：就是 data invalidation 之类的那些指令）被视作 explicit 数据访问指令，其遵循 DMB 的内存序限制。
<strong>注意：如果要用 DMB 指令来对 cache maintenance 指令进行保序，必须指定一个同时包含 loads 和 stores 的参数。</strong>

- DMB 无法保证访问出现的时机。DMB 保证当访问真正发生时，会采用屏障和其参数所定义的顺序限制。DMB 允许 PE 在 explicit 数据等待完成期间继续执行。
- DMB 不会阻止后续 explicit 数据 read 操作被投机执行。如果投机执行了一个 read，core 必须丢弃寄存器中的投机数据（译者：这有点类似分支预测失败了要 flush 流水线。这里表达的是，DMB 只会保证数据被“被观察到”时的顺序，而不保证微架构层面的执行顺序，比如 DMB 后面的数据可能会被投机读之类的）。在前面的所有 explicit 数据访问被观察到<strong>之后</strong>，core 必须重新执行这个 load（译者：因为投机错了呗）。

### 8. 内存同步屏障（data synchronization barriers）

DSB 内存屏障用于确保在此 DSB <strong>之前</strong>的内存访问，必须在 DSB 指令执行完成<strong>之前</strong>完成。正因如此，其是一个比 DMB 约束更强的内存屏障。由指定参数的 DMB 所带来的保序，相同参数的 DSB 也可以做到。

一个 PE 所执行的 DSB 会在如下情况执行完成：

- program order 上，在 DSB <strong>之前</strong>的所有指定访问类型的 explicit 内存访问都已完成，指定 Shareability domain 中的其他 Observers 皆可观察到。
- 如果 DSB 中所指定的参数是 reads 和 writes，则由 PE 在 DSB <strong>之前</strong>发起的所有 cache maintenance 指令以及所有 TLB maintenance 指令都已完成（对于指定 Shareability domain 来说）。
同样的，program order 上 DSB 指令<strong>之后</strong>的指令，都无法在 DSB 指令完成<strong>之前</strong>，对系统状态产生任何更改，或是发挥其任意部分功能（译者：原文比较蛋疼，其实就是想表达“压根没有一丁点被执行到的可能”）。DSB 无法阻止对指令的预取和解码。

下面的代码展示 DSB 所带来的保序效果：

STR X0, [X1]     ; Must complete before the DSB can retire. 
DSB 
ADD X1, X2, X3   ; Must NOT be executed before the first STR completes.
STR X4, [X5]     ; Must NOT be executed until the first STR completes.`

上面代码中的 DSB，可以确保第二条 STR 以及 ADD 指令不会在第一个 STR 以及 DSB 执行完成<strong>之前</strong>执行。

### 9. 一次访问何时被认为是“已完成”？

上一节中提到，DSB 可以强制<strong>之前</strong>的由 DSB 参数所指定的内存访问先完成（译者：原文对 DSB 指令使用的描述动词是 "retire"）。那么一次内存访问到底何时才被视为“已完成”？

read 的完成解释起来要比 write 的完成要简单一些。这是因为，一次 read 的完成点是所读数据被返回到 PE 的 architectural 通用寄存器中。

一次 write 的完成要更复杂。对于一次对 Device 内存的 write 来说，write 的完成点取决于此 Device memory type 所指定的 Early-write acknowledgement 属性。如果内存系统支持 Early-write acknowledgement，则 DSB 指令可以在 write 到达 end 外设之前完成（译者：原文使用的动词是 retire）。对于一个 Device-nGnRnE 的内存 write，只能在内存系统收到 end 外设的 write response 时才算完成。

下面的例子中，DSB 指令会一直阻塞执行，直到对 Device-nGnRnE 内存的 STR 操作从 end 外设收到对指定内存地址的 write response：

STR X0, [Device-nGnRnE]  ; Must receive a write response from the end-peripheral  
DSB SY`

### 10. 内存屏障范围的限制

DMB 和 DSB 内存屏障指令都需要一个参数，来指明内存屏障所要保序的内存访问的 type 以及指令所作用的 Shareability domain。此参数所指定的范围，决定了屏障指令的保序行为所影响的 Observers。

该对内存屏障影响范围进行指定的能力，在内存屏障效果优化时会很有用。有些场景下，一个屏障的全量保序约束会太过严格（译者：开销会比较大）。如果限制一个屏障所能影响的内存访问以及 Observers 范围，会带来微架构层面的优化，进而减少内存屏障对性能的影响。

<strong>注意：Armv8-A AArch64 体系结构要求在使用 DSB 或 DMB 时必须显式定义参数。此约束与之前的版本不同，之前的版本在不指定明确参数的情况下会使用默认选项 SY。</strong>

下表是 DSB 和 DMB 的合法参数：

ArgumentOrdered Accesses(Before-After)Shareability DomainNSHLDLoad-Load, Load-StoreNon-shareableNSHSTStore-StoreNon-shareableNSHAny-AnyNon-shareableISHLDLoad-Load, Load-StoreInner ShareableISHSTStore-StoreInner ShareableISHAny-AnyInner ShareableOSHLDLoad-Load, Load-StoreOuter ShareableOSHSTStore-StoreOuter ShareableOSHAny-AnyOuter ShareableLDLoad-Load, Load-StoreFull SystemSTStore-StoreFull SystemSYAny-AnyFull System表 3

举例来说，DMB ISHST 只会影响 explicit store 指令的顺序，屏障两侧的 loads 顺序不受影响。DMB 也只会在执行该指令的 PE 所在的 Inner Shareable domain 的 Observers 间进行保序。

考虑下面的例子：

PE0

LDR x0, [X4]  ; Can be observed out-of-order 
STR #1, [X1]       
DMB ISHST
STR #1, [X3]`

如果 PE0 和 PE1 不属于同一 Shareable domain，那么架构上是允许 PE1 在观察到 X1 地址处内存被更新<strong>之前先</strong>观察到 X3 地址处内存被更新的。另外，所有 PEs（包括 PE0）会观察到 X4 的 load 相对 X1 和 X3 的 write 是乱序的。

这种对保序范围的缩小，会减少在 Observers 之间保序时的系统开销。

### 11. 各种观察者

以下在体系结构中被视为独立的 Observers：

- core 的指令接口，通常称为 Instruction Fetch Unit(IFU)。
- 数据接口，通常称为 Load Store Unit(LSU)。
- MMU 页表遍历单元。
如“6. 啥是观察者（Observer）”一节，一个 Observer 是可以发起内存访问的部件，比如，MMU 会在遍历页表时发起 read。

AArch64 不会对不同 Observer 所发起的访问进行保序，即使访问间存在地址依赖。举例来说，以下指令序列可能会乱序，即使它们之间存在依赖：

DC CVAU, X0 ; Operations are executed in any order
IC IVAU, X0 ; despite address dependency.`

如果这些指令被乱序，指令 cache 可能会被填充进数据 cache 中的过期数据。为解决此问题，需要一个内存屏障。例子如下：

DC CVAU, X0 ; Operations are executed in any order
DSB ISH
IC IVAU, X0 ; despite address dependency.`

该例子中，数据 cache clean(DC CVAU) 会在指令 cache invalidate(IC IVAU) 执行<strong>之前</strong>完成。DC CVAU 保证了在执行 invalidate 之前，新的数据总是对指令 cache 可见。

<strong>注意：这里需要 DSB 是因为 DMB 只会影响数据访问，也就是只能影响到数据 cache maintenance 指令，而无法影响到 cache invalidate 指令。</strong>

### 12. load-acquire 与 store-release 指令

Armv8-A AArch64 提供了一组面向 loads 的带有 Acquire 语义的指令，以及面向 stores 的带有 Release 语义的指令。这些指令支持了 Release Consistency sequentially consistent(RCsc) 模型。

这些新的 load 和 store 指令包含了隐晦的屏障语义，有点类似单向屏障。这些指令相对 DMB 或 DSB 来说保序语义更弱，因为它们会影响内存屏障指令两侧的指定 explicit 内存访问的顺序。Load-Acquire 和 Store-Release 指令所引入的弱保序能力支持在微架构层面的优化，从而降低显式内存屏障所带来的性能影响。如果内存序可以通过 Load-Acquire 或 Store-Release 完成，则更推荐使用这些指令而不是 DMB。

Shareability domain 定义了这些指令保序所能影响的 Observers 范围。Load-Acquire 和 Store-Release 所影响的 Shareability domain，就是该指令所访问的地址的 Shareability domain（译者：load-acquire 和 store-release 没法像 DMB、DSB 那样通过参数指定所要影响的 Shareability domain，只能是其访问的地址属于什么 Shareability domain 就是哪个 Shareability domain）。举个例子，如果 PE0 和 PE1 不在同一个 Inner Shareable domain 中，那么下面的代码中，如果 X3 是 Inner Shareable 的，则架构上会允许 PE1 在观察到 X1 地址处内存被更新<strong>之前</strong>观察到 X3 地址处内存被更新：

PE0

STR  #1, [X1]       
STLR #1, [X3]`

下面是关于 Load-Acquire 和 Store-Release 指令的一些更多信息：

- 对于 Load-Acquire、Load-AcquirePC 以及 Store-Release 指令，所传入的数据地址必须对齐到所要访问的数据长度，否则访问会触发 Alignment fault。
- 对于 Load-Acquire Exclusive Pair 以及 Store-Release Exclusive Pair，所传入的数据地址必须对齐到所要 load 的数据长度的两倍。否则访问会触发 Alignment fault。如下面代码所示：
LDAXP x0, x1, [0x08]  ; Alignment fault       
LDAXP x0, x1  [0x10]`

- Load-Acquire 和 Store-Release 还有各自的独家变体。

### 12.1 Load-Acquire

Load-Acquire LDAR 指令的保序规则如下：

- 所有 LDAR <strong>之后</strong>的 explicit 内存访问，会在 LDAR <strong>之后</strong>被观察到。
- 所有 LDAR<strong>之前</strong>的 explicit 内存访问不受影响，可以无视 LDAR 而乱序。
下图展示了具体的保序规则：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_81c95ea340d0.jpg)

图 6：LDAR 保序规则

### 12.2 Store-Release

Store-Release STLR 指令的保序规则如下：

- 所有 STLR 之前<strong>的 explicit 内存访问，会在 STLR</strong>之前**被观察到。
- 所有 STLR <strong>之后</strong>的 explicit 内存访问不受影响，可以无视 STLR 而乱序。
下图展示了具体的保序规则：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fad1b9203757.jpg)

图 7：STLR 保序规则

下面的示例代码，展示如何通过 STLR 来保序。X1 和 X3 地址处的内存初始为 0x0：

STR  #1, [X1] 
STLR #1, [X3]  ; Cannot observe this STLR without observing the previous STR.`

该示例中，如果 X3 地址处的内存被观察到被更新了，则 X1 必然也被观察到被更新了。现在假设另一个 Observer 以相同顺序读取两个相同的内存地址，下表展示了内存系统可能会返回的观察值组合：

X1X30x00x00x10x00x10x1表 4

### 12.3 Load-Acquire 和 Store-Release pairs

Load-Acquire 和 Store-Release 指令可以作为一个 pair 组合来对代码临界区进行保护。这些指令的组合使用，可以确保代码临界区内的访问不会被乱序到临界区之外。代码临界区之外的访问（译者：这里原文应该是笔误了，原文是 accesses inside the critical code section）不受影响，可以被乱序，如下图所示：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fd50968398eb.jpg)

图 8：使用 LDAR-STLR pair 保护一个代码临界区

### 12.4 sequentially consistent

acquire/release 操作使用 sequentially consistent 模型。意思是，当一个 Load-Acquire 在 program order 上位于一个 Store-Release 之后<strong>时，则由 Store-Release 指令所发起的内存访问，将</strong>先于** Load-Acquire 指令所发起的内存访问被观察到。下图展示了这种保序约束：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_935aa7d0be59.jpg)

图 9：sequentially consistent 保序要求

### 12.5 Load-AcquirePC

Armv8.3-A 还提供了 Load-AcquirePC 指令。Load-AcquirePC 和 Store-Release 的组合使用，可以支持更弱的 Release Consistency processor consistent(RCpc) 模型，如下图所示：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1fa5f2050341.jpg)

图 10：Load-AcquirePC 指令

通过这些新的 Load-AcquirePC 指令，无需再遵守 Load-Acquires 必须在 Store-Release 之后**被观察到的约束（译者：对比图 9 看）。

### 12.6 Limited Ordering Regions

Armv8.1-A 添加了对 Limited Ordering Regions(LORegions)（译者：受限的保序区域）的支持。LORegions 支持大型系统（译者：此处所谓的“大型系统”，应该指的是内存规模比较大的系统，比如多 NUMA 系统）通过特殊的 Load-Acquire(LDLAR) 和 Store-Release(STLLR) 指令，来为“对指定物理地址（Physical Address，PA）映射的内存访问”间进行保序。

LORegions 可以避免在等待一个内存访问（针对内存映射中的任意地址，并对发起访问的 PE 所属的 Shareability domain 中的所有 Observers 可观察）时的大量性能开销。该场景（译者：指的是引入性能开销的场景）可能由现有的 Load-Acquire 和 Store-Release 指令引入（译者：这里的意思是说，原先的 Load-Acquire、Store-Release 指令会导致有些访问必须在屏障之前完成，导致 CPU 一直等待直至访问完成而引入性能开销）。此特性只在软件明确知道哪些 Observers 希望共享一个内存地址时使用，此软件通常可以知道系统的拓扑。举个例子，下图展示了一个多 socket 系统上，跨 socket 内存访问会带来极大的延迟：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_74d11496e954.jpg)

图 11：使用 LORegions 的多 socket 系统

通过合理的系统设计，对一个 socket 所使用物理内存的本地区域应用 limiting ordering（受限的保序），从而提升整体性能。

LORegions 只能被应用于 Non-secure 物理内存访问。一个 LORegion 由一个 LORegion descriptor 描述。LORegion descriptors 的数量取决于具体的体系结构实现，可以通过读取 LORID_EL1 寄存器获取。

一个 LORegion descriptor 包含以下信息，通过系统寄存器来编程：

- 起始地址（LORSA_EL1）。
- 结束地址（LOREA_EL1）。
- LORegion 数量（LORN_EL1）。
- 表征 LORegion descriptor 是否合法的 valid bit（LORC_EL1）。
以下代码展示对 2 个 LORegion 进行编程：

MOV  x0, #0x2            // LORegion number
MOV  x1, #0x80000000     // LORegion start address 
MOV  x2, #0xC0000000     // LORegion end address 
MOV  x3, #0x1            // LORegion enable (valid bit)
MSR  LORN_EL1, x0        // Select the LORegion number descriptor 
ISB
MSR  LORSA_EL1, x1
MSR  LOREA_EL1, x2
MSR  LORC_EL1, x3
ISB`

下图中，只有对相同 LORegion 中地址（由 LDLAR 或 STLLR 指令指定）的访问才会受影响，对 LORegion 之外的内存访问不受影响。举例来说，对 C 的 store 会先于<strong>LDLAR 被观察到。如果软件使用了一个 LDAR，则对 C 的 store 会在 LDAR</strong>之后**被观察到，如图中所示：

**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ddd0e028761a.jpg)

图 12：LORegion 内存访问示例

### 13. 指令屏障（instruction barriers）

Arm 体系结构下 PE 的上下文包括 caches、TLBs 以及系统寄存器的状态。对 cache 或 TLB 的 maintenance 操作或对系统寄存器的更新属于一种上下文变更（context-changing）操作。

体系结构只保证一个上下文变更操作在一个上下文同步（context synchronization）事件之后**被观察到（译者：原文这里用的动词是 seen，不是 observed，我这里翻译成“观察”不知是否恰当，也许翻译为“生效”更佳。这里想表达的意思应该是，在做完上下文变更操作之后，必须再触发一个上下文同步事件，此变更方能生效）。

对 explicit 上下文同步的约束，让处理器设计者无需在每个 cycle 上传播所有上下文变更（译者注：意思就是把问题抛给程序员了从而解放了处理器的设计者，必须由程序进行 explicit 的上下文同步事件之后，上下文变更才生效，否则就必须要 CPU 在每个 cycle 上主动做一次上下文变更同步，这个就 heavy 多了），implicit 上下文同步是非必要的开销（译者：意思就是让 CPU 在每个 cycle 上做上下文同步 —— 这就是 implicit 上下文同步 —— 会引入无谓的开销）。故软件在希望应用一个新的上下文时，需要显式发起一个上下文同步事件。

以下事情中任一为一个上下文同步事件：

- 执行一个 ISB 操作。
- 触发异常（译者：takes an exception，这里的 take 应该翻译为“触发”还是“处理”，笔者拿不准）。
- 从一个异常中返回。
- 从 Debug 状态中退出。
<strong>注意：Arm 处理器实现，允许只要 PE 不发出上下文同步事件，就始终不为后续的执行更新它们的上下文。</strong>

执行一个上下文同步事件可以确保：

- 所有在上下文同步事件执行时间点上 pending 的 umasked 中断，都可以在上下文同步事件后的第一条指令<strong>之前</strong>被处理。
- program order 上，任意位于一个可以触发上下文同步事件指令<strong>之后</strong>的指令，在上下文同步事件发生<strong>之前</strong>，皆不能发挥其任意部分功能（（译者：其实就是想表达“压根没有一丁点被执行到的可能”））。
- 在上下文同步事件<strong>之前</strong>的所有系统寄存器 writes，都会影响 program order 上位于触发上下文同步事件的指令<strong>之后</strong>的所有指令（译者：因为根据定义，对系统寄存器的 write 就是一种上下文变更，而上下文变更在上下文同步事件之后就会生效，所以会影响到后续指令。下面两条同理）。
- 所有对页表的已完成变更，如果其 entries 在变更<strong>之前</strong>，不允许缓存在一个 TLB 中，会影响所有在 program order 上位于触发上下文同步事件指令<strong>之后</strong>的指令预取。
- 所有在上下文同步事件<strong>之前</strong>完成的 TLBs、指令 cache 以及 AArch32 状态下的分支预测 invalidation，会影响所有在 program order 上位于触发上下文同步事件指令<strong>之后</strong>的指令。

### 13.1 使用示例

假设软件必须先确保对 SVE、Advanced SIMD 以及浮点寄存器的访问不会 trapped（译者：这里 trapped 我不明白是指触发异常还是会导致 VMExit）。举个例子，EL1 下运行时，对 SVE、Advanced SIMD 以及浮点寄存器访问的 trapping，可以通过将 CPACR_EL1.FPEN 编程为 0x3 来禁能，如下面的代码所示：

MRS     X1, CPACR_EL1
ORR     X1, X1, #(0x3 

如果没有 ISB 指令，则对 trapping 的禁能（是一个上下文变更操作）并不保证能被 FADD 指令观察到（译者：would not be guaranteed to be seen by the FADD instruction，这里原文用的又是 seen，理解为“在 FADDR 指令执行时此上下文变更已生效”）。不加 ISB 的话会导致 FADD 指令触发一个 Synchronous 异常。本场景下，ISB 作为一个上下文同步事件，其用来确保新的上下文（此“新的上下文”也就是对 SVE、Advanced SIMD 以及浮点寄存器 trap 的禁能）可以被 FADD 指令观察到。

本例子中，如果在对 SVE、Advanced SIMD 以及浮点寄存器进行访问之前，从 EL1 返回到了 EL0，则无需 ISB。这是因为从 EL1 到 EL0 的异常返回也是一个上下文同步事件。

### 14. 知识检验

Q1：啥是 Observer？

A1：Observer 是一个处理单元或系统部件，比如外设，可以向内存发起读写。

Q2：如果我要确保由一个 DMB 分开的两个 stores，被同 Inner Shareable domain 中的其他 Observers 按序观察到，应该使用啥参数？

A2：DMB ISHST。

Q3：如果要确保此前的内存访问都已完成后再继续执行，应该使用什么内存屏障？

A3：DSB。

Q4：啥是 architecturally 定义的上下文同步事件？

A4：architecturally 定义的上下文同步事件包括以下：

- 执行一个 ISB 操作。
- 触发一个异常。
- 从一个异常中返回。
- 从 Debug 状态返回。

### 15. 相关信息

下面是一些与本 guide 相关的材料：

- Armv8-A Architecture Reference Manual。特别是以下章节：

- Barrier Litmus Tests。
- The AArch64 Application Level Memory Model

- Arm 社区：https://community.arm.com/。
- Learn the architecture - AArch64 memory model：https://developer.arm.com/documentation/102376/latest
- Memory Consistency Models for Shared Memory-Multiprocessors, Gharachorloo, Kourosh, 1995, Stanford University Technical Report CSL-TR-95-685（http://infolab.stanford.edu/pub/cstr/reports/csl/tr//CSL-TR-95-685.pdf）：该论文提供了 RSsc 以及 RCpc 方面的信息。

### 16. 更进一步

更多内存及指令屏障方面的详细例子，可以参考最新 Armv8-A Architecture Reference Manual 的 Barrier Litmus Tests 章节，该章节提供了一些需要屏障的常见场景及代码示例。

更多 Armv8-A 架构的学习，参考 Learn the architecture 系列 guides：https://developer.arm.com/documentation#cf%5Bnavigationhierarchiesproducts%5D=Architectures,Learn%20the%20architecture。
