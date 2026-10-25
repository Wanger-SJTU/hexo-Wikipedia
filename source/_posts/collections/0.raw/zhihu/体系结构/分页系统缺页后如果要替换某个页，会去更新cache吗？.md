---
title: "分页系统缺页后如果要替换某个页，会去更新cache吗？"
date: 2026-04-21
tags: [知乎]
source: https://www.zhihu.com/question/614436156/answer/3142656267
---

光度
​​​
南开大学 计算机技术硕士

​ 关注

收录于 · 专业相关

TLB shootdown[1]，知乎上专门讨论这个topic的不多，能看出来题主有自己的思考，只是用词不太准确，那我这个回答就尝试弥补这部分空白，系统地梳理下来龙去脉。

“cache、缺页处理”等等的问题处于软硬件交界处，同时涉及到体系结构、操作系统两个层面，也因此相对复杂一些。我们先看看这一系列过程从这两个层面分别意味着什么，再引出由此产生的问题（多核下的TLB consistency），以及解决方案（TLB shootdown）。

体系结构：访存是怎样进行的
一般现代处理器有一二三级cache，访存时可能hit某一级cache（1~20ns），避免访问memory，也可能全部miss，导致实际的memory access（50~100ns）。

除了memory hierarchy，访存过程中另一个很重要的部分是地址翻译（address translation），因为程序运行时看到的是虚拟地址VA（virtual address），要经过处理器上MMU硬件转换成物理地址PA（physical address），这其中会涉及到TLB[2]（Translation Lookaside Buffer）

cache和TLB不是独立的存在，想对访存行为进行rigorous的分析必须要同时考虑。但上来直接放在一起看会比较复杂，我们一步步来，先看看没有cache、TLB时，这个过程是怎样的。

假如不考虑cache、TLB的存在，上述过程变成：VA -  地址翻译 -  PA -  memory access。

可以看出，地址翻译处在访存的critical path上：必须先完成地址翻译，才能进行memory access。

那么地址翻译要做什么呢？没错，访问页表。

如果是二级页表，地址翻译本身就需要两次访存：（1）找到一级页表中对应二级页表的entry，读出来；（2）根据这个entry找到二级页表，读二级页表上的pte。因此没有cache、TLB时实际总共会发生三次访存。

然而这是对两级页表，x86-64一般是四、五级页表[3]，也就意味着实际访存会来到5、6次（图片来自Elastic Cuckoo Page Tables[4]）：

x86-64的四级页表page table walk过程这不是危言耸听，ASPLOS'22的一篇论文[5]就指出，在虚拟化环境中由于guest、host页表的存在，虚拟机的一次访存如果所有page walk cache（也即各层次TLB）全部miss，会使得最坏情况下一次访存伴随着额外的35次访存！

TLB的必要性

到这里，就能清晰地看出来为什么我们需要给地址翻译本身引入一个缓存了：地址翻译在critical path上，而每次访存（不论是fetch指令本身还是指令需要的数据访问）都需要经历这个过程，极其频繁，多级页表下无缓引入的额外memory access是完全不可接受的。

TLB经过多年发展，其本身也逐渐像cache一样变成multi-level的结构[6] [4]了，如Intel的Skylake有L1、L2 TLB，L1 TLB又分为L1 ITLB（Instruction TLB）和L1 DTLB（Data TLB），针对不同大小的页面（如1G的huge page）也有单独的TLB。

图片来自Elastic Cuckoo Page Tables至此，我们把TLB纳入了访存过程的考虑。

cache的引入

引入cache之后一个很自然的问题是：地址翻译发生在何时？

或者换句话说，地址翻译是否要求发生在访问cache前？我们可否在地址翻译结束前就开始访问cache？

这就涉及到cache是怎样被“寻址”的问题了。

cache的“寻址”大体上是两步：

- indexing
- tag比较indexing是为了知道“我要去看哪个slot”，tag比较是为了知道“这个slot里是否存了我的数据”。

根据indexing和tag采用的地址不同，可以分为四类[7]：

- Physically indexed, physically tagged (PIPT)
- Virtually indexed, virtually tagged (VIVT)
- Virtually indexed, physically tagged (VIPT)
- Physically indexed, virtually tagged (PIVT)PIPT，顾名思义，就是用physical address来计算该看哪个slot（physically indexed），然后用physical address来做tag的比较（physically tagged），其他的也类似。

用physical address来做index最大的问题是，直到地址翻译完成才能知道读哪个slot，这就使得地址翻译处于critical path上，导致和slot的读取串行，latency相对较高。

用virtual address来做index使得read slot可以地址翻译并行，而TLB一般比cache要小[8]，因此lookup时的latency比cache要低，如此一来hit时的latency就完全等于cache hit的latency，TLB的access相当于被掩藏了，而用virtual address来做tag则是进一步。

不过virtual address做index也有它自己的问题，比如address alias（alias问题不管出现在哪都很讨厌啊...），因为不同virtual address可能指向相同的physical address，这就可能造成同一个physical address被放到不同cacheline中，从而破坏cache coherence；用virtual address做tag则有homonyms的问题：同一个virtual address在不同address space中可能map到不同physical address，不过这个问题在MMU有了ASID（address space ID）后好了很多。

至此，我们从体系结构的角度分析了访存的过程，可以看出TLB和cache都扮演着重要的角色。

操作系统：page fault、页面映射修改
page fault往往和页面映射（page table entry mapping）的修改有关，这也很好理解，毕竟page fault之所以产生，就是因为此时pte的状态标志着需要OS介入做一些事情，修改pte mapping。

虽然一般都拿swapping来说明page fault的功能，但page fault负责的东西并不止这一点，比较常见的包括：

- anonymous mmap的lazy物理页面分配。mmap分配虚拟内存后并不真正分配物理内存，直到对页面的第一次access，触发page fault分配物理页面，填充pte。
- file-backed mmap的文件内容加载。mmap映射某一文件区段后并不加载文件内容，直到第一次access，才触发page fault进入kernel mode，文件页面在page cache时只需填充pte mapping（minor page fault），不在时调用进文件系统从disk上加载（major page fault）。
- swap out page的reload。页面被swap out后pte被置为non-present in DRAM，再次访问到这个page时触发page fault将其swap in，page如果还没有真正进入disk，从swap cache中重新映射回来（minor page fault）填充pte，如果已进入disk则从swap分区中加载（major page fault）。
- CoW(Copy-on-Write) page的分配。private mmap（比如多进程对同一个文件的映射，又或者使用mmap做buffer cache的DB借助CoW保障consistency[9]）内的page在第一次write时分配新的页面并拷贝，修改pte mapping。
- user stack的向下扩增、权限控制等等。这里我想强调的并不是page fault，而是pte mapping的修改，提page fault主要为了说明page fault中可能的pte修改形式。

关于为什么要强调这一点，我们暂时放一放，先来看看除了page fault还有哪些地方会发生pte mapping的修改：

- memory deduplication[10] [11]，Linux Kernel中以KSM[12]（kernel shared memory）将相同内容的writeable page合并为CoW页面，将原pte修改到合并后的page，直到发生写入时重新分配页面，修改pte，主要用于虚拟化场景下节省内存，支持更多guest OS。
- page reclaim，即对页面的swap out，将原pte置为non-present，并将原页面内容migrate到swap cache，一段时间后写入交换分区。
- memory compaction[13]，为了将碎片化的物理页面compact在一起，使得huge page以及high order的buddy system能更容易找到连续的物理页面，在此过程中要将原pte修改为新的pte
- 不同NUMA结点间的page migration[14]，考虑到访问非本地NUMA结点的高延迟，将页面migrate到更近的结点，在此过程中要将原pte修改为新的pte
- ...所有这些对pte mapping的修改，都可以归为：old pte -  new pte。其中old pte可能为non-present（尚未映射或位于交换分区上）也可能为其他的原有映射，new pte可能为non-present（page reclaim）也可能为新映射。

至此，我们可以开始讨论TLB consistency的问题。

TLB consistency
相较于cache在多核间共享（shared），借助多核间的缓存一致性协议（coherence protocol）由硬件保持一致性，TLB由每个核心私有（private），且一般硬件本身不提供一致性（consistency）的保证，需要由软件来显式地主动保持。

单这么说可能比较晦涩，我们可以结合上面对访存的分析来看待这个问题。

VA经过映射实际访问的物理地址（不论是从cache中还是从memory中访问）跟cache本身无关，而取决于这个核心上的TLB将这个VA到了哪个PA，这也就意味着，如果页面映射（pte mapping）被修改，而某个其他核心上缓存了该pte的TLB entry却没有及时更新，就可能会导致该核心错误地修改原先指向的物理页面，造成数据破坏。

因此，一旦pte被更新，我们要确保如果任何核心上有对当前pte的TLB entry，都要相应地被同步更新，也就是所谓的TLB consistency。

问题就变成，我们修改pte时，如何“阻止”其他核心以原先的TLB进行访存，直到我们更新完pte和它们的TLB再“释放通行”呢？

这就引出了TLB shootdown：向其他核心上发送核间中断（IPI, Inter-processor interrupt）处理TLB的更新，直到处理完再释放通行。

接下来我们就看看TLB shootdown是怎么工作的。

TLB shootdown
TLB shootdown的名字可以说是很形象了，因为你向其他核心发送一个IPI就只是为了把那个核心上的某条或者某几条TLB给invalidate掉，宛如高射炮打蚊子。

一个很有意思的问题是：我们是否非得通过IPI这么重的方式来解决TLB consistency的问题呢？倘若能够直接向其他核心发一条指令来invalid某TLB，而不借助中断暂停，能否达成consistency的目的？

Black, David L. et al[ASPLOS'89][1]给出了答案：不行，必须借助IPI。

这主要是两点造成的：

- TLB entry被invalid后可能的reload
- TLB entry的writeback行为（如更新access bit）假如我们先向其他核心发送invalid再真正修改pte：

send invalid to other core -  modify pte

由于TLB entry被invalid后可能接着发生reload（如因为紧接着的访存行为）：

send invalid to other core -  TLB reload -  modify pte

1带来的这种race condition将使得原先的TLB重新被用于地址翻译。

而假如我们先修改pte再向其他核心发送invalid，则可能：

modify pte -  other core writeback TLB to pte -  send invalid to other core

也即紧接着我们修改完pte，其他core将TLB writeback回pte。

2带来的这种race condition将导致pte被修改回原先的映射。

所以结论是：我们必须强制打断其他核心的执行，确保在我们修改pte期间它们不会访存到该pte mapping的VA。

TLB shootdown algorithm
Black, David L. et al[ASPLOS'89][1]中给出了一种较强order的TLB shootdown算法，相对来说也比较好理解：

简单画一下示意图中虚线代表CPU core的执行，实线代表因果依赖关系（或者说order、dependency）。总体来看可以分为四个阶段：

- phase 1：发起tlb shootdown的core（图中initiator）向每个可能运行着当前address space的其他core（图中responder）发送IPI，并进入停等（图中spin）阶段
- phase 2：responder收到IPI，通知intiator，同时也也进入停等阶段
- phase 3：当initiator收到所有其他responder进入停等阶段的通知后，它可以开始执行，修改pte，完成修改后通知所有responder
- phase 4：responder收到initiator完成pte修改的通知，退出停等阶段关于一些实现上的细节（比如怎么知道有哪些core可能运行当前addresss space）暂时按下不表，我们先来理解下这个算法的含义。

phase 1 2可以看作一个core层面的barrier：其他core的执行会被挡在sync wait处，而直到所有core都被挡住我们才开始做update。

借助于这些事件之间的dependency，我们就可以保证：responder上任何sync wait前的代码都发生在update pte前。

这很好证明，因为有dependency chain：sync wait 前code -  sync wait -  initiator退出停等 -  update pte。这其中每个箭头（或者dependency）前的执行都确保发生在箭头后之前。

phase 3 4可以看作barrier的释放：直到update结束后，借由initiator的notify，其他responder才开始继续执行。

同样我们就可以保证：responder上任何end wait后的代码都发生在update pte后。

这也很好证明，因为有dependency chain：update pte -  initiator notify -  responder end wait -  end wait后code。

我相信说到这应该就很清楚了，拿memory order来类比，这意味着整个操作具有sequential[15]的语义：update pte前的code一定被order在update pte发生前，update pte后的code一定被order在update pte发生后。

换句话说，update pte前的code会看到旧的pte，update pte后的code会看到新的pte。

作为对比，我们看看x86的实现（以Linux kernel v5.13.2[16]为例），借助于x86对tlb行为的保证，order可以不用那么强：

简单画一下示意图中黑色虚线框即为flush_tlb_page与order相关的大致行为。

类比上面的分析，我们可以很清楚地看出：responder上任何flush_tlb_page后的代码都发生在update pte后。

同样类比memory order，这意味着，flush_tlb_page 具有release语义。

那么flush_tlb_page是否具有acquire语义呢？

并没有，即我们无法确保responder上flush_tlb_page前的代码一定发生在update pte前，有可能responder上flush_tlb_page前的代码会发生在update pte后。

换句话说， flush_tlb_page后的code一定会看到新的pte，而flush_tlb_page前的code可能会看到新的pte，也可能看到旧的pte。

这岂不是违反我们上面讨论的问题2了，可以接受吗？

可以，这是因为x86对于tlb行为的保证[17]：TLB的writeback是一个原子性的RMW（Read-Modify-Write）行为，且当Read发现page table（也即memory）中pte的present bit已被clear时则不会将tlb中的entry cache写回。

基于这一保证，intel给出了recommended algorithm[18]：

- 清除pte上的P位
- flush tlb（包括remote tlb shootdown）
- （optional）将pte指向新的mapping对于1、2中间可能发生的由tlb writeback会由page fault来保障正确性，而进入page fault handler后就来到page table level锁保护的临界区，race condition可以被消除。

Linux kernel中目前也是以这种方式做各种pte的remapping，对于单纯的清除映射（如page reclaim），3无需进行，而对于其他的pte remapping（如memory compaction），则如intel所言使用先clear再指向新mapping的方式。

一些具体实现上的问题
Q: 如何得知哪些core上运行着某一address space？

A: Linux中每个mm_struct（代表一个address space的信息）上都有一个cpu_bitmap[19]，当发生context switch将某个address space调度到一个core上执行时，会将core对应的bit在该mm_struct上做标记。 

Q: 通知其他目标core执行某个函数并等待完成是怎样做到的？

A: Linux中on_each_cpu[20] 向每个mask bit上的core发送IPI中断（具体实现取决于硬件平台），并附上要执行的func和arg，随后在每个cpu对应的signal data上自旋，直到所有core的signal data都标志已执行完成。

Q: 将pte置空再修改映射不会导致其他core上发生page fault影响性能吗？

A: 这不是common case，或者说是"very uncommon case"[17]。以page reclaim为例，借助冷热页面机制，我们只会对较长时间内没被访问的页面做回收，这也意味着在清除pte后大概率不会被立即page fault回来；而其他修改pte的情况，置空到设置新的pte之间的间隔不长，且对于原先可能存在mapping的core会发送IPI中断，也使得在这很短的时间内产生page fault的概率较低。

光度
19 次咨询5.0

南开大学 计算机技术硕士
26060 次赞同

去咨询

参考

- ^abc[ASPLOS'89] Translation lookaside buffer consistency: a software approach https://dl.acm.org/doi/10.1145/70082.68193
- ^https://en.wikipedia.org/wiki/Translation_lookaside_buffer
- ^https://en.wikipedia.org/wiki/Intel_5-level_paging
- ^ab[ASPLOS'20 awarded best paper] Elastic Cuckoo Page Tables: Rethinking Virtual Memory Translation for Parallelism https://dl.acm.org/doi/10.1145/3373376.3378493
- ^[ASPLOS'22] Parallel virtualized memory translation with nested elastic cuckoo page tables https://dl.acm.org/doi/10.1145/3503222.3507720
- ^https://en.wikipedia.org/wiki/Translation_lookaside_buffer#Multiple_TLBs
- ^https://en.wikipedia.org/wiki/CPU_cache#Address_translation
- ^https://www.geeksforgeeks.org/virtually-indexed-physically-tagged-vipt-cache/
- ^[CIDR'22] Are You Sure You Want to Use MMAP in Your Database Management System？ https://www.cidrdb.org/cidr2022/papers/p13-crotty.pdf
- ^[OSDI'02] Memory resource management in VMware ESX server https://dl.acm.org/doi/10.1145/844128.844146
- ^https://en.wikipedia.org/wiki/Kernel_same-page_merging
- ^/dev/ksm: dynamic memory sharing https://lwn.net/Articles/306704/
- ^Memory compaction https://lwn.net/Articles/368869/
- ^Page migration https://www.kernel.org/doc/html/v5.4/vm/page_migration.html
- ^https://en.cppreference.com/w/cpp/atomic/memory_order
- ^https://elixir.bootlin.com/linux/v5.13.2/source/arch/x86/mm/tlb.c
- ^abThe x86 TLB (Linus Torvalds) https://yarchive.net/comp/linux/x86_tlb.html
- ^4.10.4.2 Recommended Invalidation https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-system-programming-manual-325384.pdf
- ^https://elixir.bootlin.com/linux/v5.13.2/source/include/linux/mm_types.h#L584
- ^https://elixir.bootlin.com/linux/v5.13.2/source/include/linux/smp.h#L69

阅读全文​
​赞同 372​​19 条评论​637 ​49 ​分享