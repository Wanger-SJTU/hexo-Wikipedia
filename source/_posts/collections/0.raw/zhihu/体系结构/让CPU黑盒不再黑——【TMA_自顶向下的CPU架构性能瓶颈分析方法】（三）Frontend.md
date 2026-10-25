---
title: "让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（三）Frontend"
date: "2020-05-08 00:00:00"
updated: "2020-05-08 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】(三)Frontend/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/61015720"
---


上篇文章简单地介绍了TMA具体的实现原理和方法，后续文章将会对TMA的四个大的分类逐级展开，以帮助大家更好地理解TMA整套方法学，了解TMA究竟为什么要这样设计和划分。这篇文章将会对Frontend Bound进行展开，介绍该层级下的各项分类和相关的计算公式，所涉及到的计算公式，均来源于GitHub上<strong>[pmu-tools](https://link.zhihu.com/?target=https%3A//github.com/andikleen/pmu-tools)</strong>项目中toplev的源码。

由于对于不同系列的Intel CPU，有不同的Performance Counters和Microarchitecture，所以TMAM对于不同架构的CPU，具体的计算公式和所展开的层级会有所不同。这篇文章选取的是PMU Tools所支持列表中最新的架构，即Intel 6th/7th gen Core (code named Skykale/Kabylake)，当前GitHub上的TMAM版本为3.5。

[](https://zhuanlan.zhihu.com/p/60940902)

也许您并不关心如何对CPU的Microarchitecture Performance Bottleneck进行分析，只想了解CPU的Microarchitecture；又或许您所关心的只是使用ARM、MIPS、RISC-V这些RISC ISA的CPU。这都没关系，因为TMAM是一个通用性很强的方法学，在我的理解看来，TMAM不仅仅适用于x86 CPU，也同样适用于其他ISA的CPU，甚至也适用于GPU、DSP等的分析。并且由于本文是基于Intel Skylake架构CPU进行讲解的，即使您对分析方法不感兴趣，但是通过了解TMAM的设计思路，相信也能帮助您更好地去了解目前Intel CPU的架构。在讲解的过程中，我希望可以帮助大家理解为什么，即TMAM整套方法学背后的机理，而不是仅仅告诉大家TMAM要如何实现，怎么做。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_38ccf6f5f62a.jpg)

Intel Skylake Frontend Bound的展开Frontend Bound可以划分为Latency和Bandwidth两个子类，分别表示由于前端Latency过大的导致没有uops发送到后端的比重，和由于前端decode能力羸弱导致前端不能充分利用四发射的带宽的比重。然后这两个大类下面也进一步对可能的原因进行细分，目的是找出究竟是Intel CPU中的哪一部分的模块导致了前端成为了瓶颈，帮助用户更好地去定位、分析问题。

再次声明一下，下列的公式均来源于TMAM 3.5中的skl_client_ratios.py文件，该文件主要存放的是Skylake的TMA比例系数和公式，读者可以在该文件中找到我下面提及的所有公式。对于公式中使用到的PMC事件的具体解释说明，可以在Intel的*<strong>Intel® 64 and IA-32 Architectures Software Developer’s Manual</strong>*中找到，具体是在*<strong>Volume 3 (3A, 3B, 3C & 3D): System Programming Guide</strong>*中的CHAPTER 19 PERFORMANCE MONITORING EVENTS。


#### Frontend Bound：

我们先来看下Frontend Bound的公式：

 self.val = EV("IDQ_UOPS_NOT_DELIVERED.CORE<strong>", 1) /</strong>SLOTS<strong>(self, EV, 1)</strong>
在这里，EV函数代表是对具体事件的调用，而SLOTS又是另一个函数，具体的计算方法可以找到相应的函数定义来查看。先简单看下Frontend Bound的值，该项的计算方法为用IDQ_UOPS_NOT_DELIVERED.CORE**事件的值除以SLOTS函数的值。若对上一篇文章内容还有印象的话，SLOTS就是表示整个执行周期Pipeline所具有的slots数量，具体方法就是用流水线的宽度乘以CPU的运行周期。

<strong>def SLOTS</strong>(self, EV, level):<strong>return Pipeline_Width</strong>* <strong>CORE_CLKS</strong>(self, EV, level)那么，<strong>IDQ_UOPS_NOT_DELIVERED.CORE</strong>事件又表示的是什么意思呢？通过查阅Intel的手册，可以找到该事件的定义：Count<strong>issue pipeline slots</strong> where no uop was delivered from the front end to the back end when <strong>there is no back-end stall</strong>。简单来说，就是后端没有stall的时候，前端没有发射的uops数量，即由于前端原因所浪费的uops数目。然后再用该值除以总的SLOTS数目，即为Frontend Bound的比重。

接下来再来详细看看Slots的计算公式，Pipeline_Width 在文件中定义是一个常数，为4，因为对于Intel Skylake架构的CPU，流水线宽度为4，若要将TMA应用到不同的CPU架构中，该值就需要做相应修改。比如，若想应用到AMD 6发射的CPU中，该值应改为6，以匹配流水线的宽度。需要详细讲解的是CORE_CLKS这个函数的计算公式，由于现代CPU中的机制比较多，故core clks要分多种情况考虑。

<strong>def CORE_CLKS</strong>(self, EV, level):**return ((EV("CPU_CLK_UNHALTED.THREAD", level) / 2)*(1 + EV("CPU_CLK_UNHALTED.ONE_THREAD_ACTIVE", level) / EV("CPU_CLK_UNHALTED.REF_XCLK", level))) 
if ebs_mode <strong>else(EV("CPU_CLK_UNHALTED.THREAD_ANY", level) / 2)</strong>if smt_enabled <strong>else CLKS(self, EV, level)</strong>

> def CLKS<strong>(self, EV, level):</strong>return EV("CPU_CLK_UNHALTED.THREAD", level)

在这里，主要考虑的是ebs_mode和smt_enabled这两者的值，然后根据这两个值的不同，分别对core clks取三种不同的值。然后我发现ebs_mode的值恒为FALSE，在整个toplev的代码中，也并没有对ebs_mode的值进行更改，所以这里暂时忽略第一项，主要考虑smt_enabled的值，然后对core clks取不同的值。

SMT**, Simultaneous Multi-Threading，即同步多线程，在Intel的CPU中称作HT (Hyper Threading)。不过在Intel和AMD的CPU中，每个Core最多为双线程，即一个Core可以同时运行两个Thread。当smt_enabled为True时，Core Clks为CPU_CLK_UNHALTED.THREAD_ANY除以2，CPU_CLK_UNHALTED.THREAD_ANY事件的解释为：Core cycles when at least one thread on the physical core is not in halt state，即有线程在Core内执行的周期数。这里除以2是因为超线程的时候，两个线程会共享4发射的流水线宽度，若两个线程是静态划分的话，这样每个线程的Slots数量即为2*Clks。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c144f096a6cf.jpg)

在AMD的CPU中，Micro-op和Retire两个Queue为静态划分所以，从此也可以佐证，TMA对于超线程的CPU进行分析也是可以的，因为开启超线程的时候，可以简单理解为每个逻辑内核的流水线宽度变为原来的一半，SLOTS数量变为原来的二分之一。

#### Frontend_Latency：

简单解释了Frontend Bound的计算公式，接下来讲解Frontend_Latency部分的划分和计算公式。先来看下<strong>Frontend_Latency</strong>的计算公式：

<strong>self.val = Pipeline_Width</strong> * EV("<strong>IDQ_UOPS_NOT_DELIVERED.CYCLES_0_UOPS_DELIV.CORE</strong>", 2) / <strong>SLOTS</strong>(self, EV, 2)这里<strong>IDQ_UOPS_NOT_DELIVERED.CYCLES_0_UOPS_DELIV.CORE</strong>事件的说明为：Counts, on the per-thread basis, cycles when <strong>no uops are delivered</strong> to Resource Allocation Table (RAT)。即每个Thread没有uops发射的周期数，用这个周期数乘以流水线宽度，即可以得到前端延时过大所浪费的Slots数目，最后用该Slots数目除以总的Slost数，便是相应的比重。

这里有个疑惑的地方就是Pipeline_Width是一个常数，恒为4，可是在超线程的时候，对应每个线程的流水线宽度应该为2，可这里却用的是4，难道在Intel CPU内HT对流水线的宽度是动态共享的？但哪怕是这样，乘以一个常数4也会有一定的误差，若是静态划分共享的话，这里的流水线宽度在SMT的状况下应该为2。所以这里存在小小疑惑，然后我将这个问题提交到了pmu-tools GitHub上的Issues，若作者有什么回复或者我有什么新的理解，这里会及时地更新。

在GitHub上的提问已经被Closed了，作者只简单地回复了：It's not statically partitioned. 即表示在SMT的模式下，每个物理内核中的两个逻辑线程竞争4宽度的流水线，所以每个逻辑内核的最大流水线宽度确实为4。可是，如果两个线程都有uops要issue的时候怎么办，我猜大概率会对4宽度进行平分，每个逻辑内核的流水线宽度变成2。所以这时，Pipeline_Width还继续沿用4的话，一定会造成Frontend_Latency这个分类的比重偏大。所以我们在应用TMAM的时候，应该尽量避免开启SMT，若开启了SMT，也尽量不要同时使用一个物理内核中的两个逻辑内核，这也算是TMAM的一个小小缺陷吧。


接下来看下有哪些原因可以导致Frontend Latency，TMAM在这里划分成了ICache_Misses，ITLB_Misses，Branch_Resteers，DSB_Switches，LCP，MS_Switches这六个子类，接下来将一一讲解这六个子类。

*1. ICache_Misses：*

首先是*<strong>ICache_Misses</strong>*，一旦发生instruction cache miss，Frontend没有Instruction去做decode，必然会导致没有相应的uops发往后端，导致Frontend Latency出现瓶颈。

<strong>self.val = (EV("ICACHE_16B.IFDATA_STALL</strong>", 3) + 2 * EV("<strong>ICACHE_16B.IFDATA_STALL:c1:e1</strong>", 3)) / CLKS(self, EV, 3)这里可以先简单理解为，用L1 ICache Miss所导致pipeline Stall的周期数，除以总的周期数，以得到L1 ICache Miss所占的一个比重。 <strong>ICACHE_16B.IFDATA_STALL</strong>事件的说明为：Cycles where a code line fetch is stalled due to an L1 instruction cache miss. The legacy decode pipeline works at a<strong>16 Byte granularity.</strong>


*2. ITLB_Misses:*

对于*<strong>ITLB_Misses，</strong>*思路还是和ICache Misses一样，也是站在Cycles这个层级去统计计算的，为什么不继续站在Slots的层级去统计计算呢？Slots层级的优势当然比Cycles层级的优势多得多，但是很多具体的底层事件，所站的角度是在Cycles这一个级别的，很难、甚至不可能计算出所浪费的Slots数量，所以这时候就只能在Cycles这一个层级做统计分析，这样会更加方便和简洁。对于该分类，具体的计算公式为：

<strong>self.val = EV("ICACHE_64B.IFTAG_STALL</strong>", 3) / CLKS(self, EV, 3)其中的<strong>ICACHE_64B.IFTAG_STALL</strong>事件的解释为：Cycles where a code fetch is stalled due to L1 instruction cache tag miss。若发生了Cache Tag Miss，即表明在TLB中没有找到相应的Tag，发生了TLB Miss，用Tag Miss所导致停顿的周期数，除以总周期数，即为相应的比重。


*3.Branch_Resteers:*

对于***Branch_Resteers*，**统计的是前端从一条错误的分支恢复过来，中间所消耗的周期数占所有周期数的一个比重。作者提到了这里可能会和其他的兄弟节点重复统计（Note the value of this node may overlap with its siblings.），因为在恢复的过程中，有可能会发生TLB Miss或者ICache Miss，这些会出现重叠，但影响不大。具体的计算公式为：

<strong>self.val = (EV("INT_MISC.CLEAR_RESTEER_CYCLES</strong>", 3) + <strong>BAClear_Cost</strong>* EV("<strong>BACLEARS.ANY</strong>", 3)) / <strong>CLKS</strong>(self, EV, 3)对于公式中的INT_MISC.CLEAR_RESTEER_CYCLES事件，对应的解释为：Cycles the issue-stage is <strong>waiting for front-end to fetch</strong> <strong>from resteered path</strong> following branch misprediction or machine clear events. 即前端等待Resteer的周期数。

然后对于BACLEARS.ANY，被简单地解释为Number of front end re-steers due to BPU misprediction，即前端Misprediction发生的次数。然后用发生的次数乘以BAClear_Cost，这里BAClear_Cost为一个常数，等于9。即可以理解为每发生一次分支预测错误，将会浪费9个周期，这里的9要不就是一个恒定值，要不就是统计后的平均经验值。对于Branch Resteers，还能继续向下展开为三类，分别为Branch Misprediction，Machine Clears和new branch address clears三类原因导致的比重。后面讲继续介绍第三层级的其他分类，先不在这里对改层级进一步展开。


*4.DSB_Switches:*

对于*<strong>DSB_Switches</strong>*，这个分类统计的是从DSB pipeline切换到MITE pipeline导致前端停顿的周期比重。这里的<strong>DSB</strong>是Decoded Stream Buffer的缩写，存放的一些已经被decode的uops，可以把它理解为一个uops ICahce，DSB是在Intel的Sandy Bridge架构中引入的，有兴趣的朋友可以在网上找到更多相关的资料。DSB对应到AMD中就是Op Cache，顾名思义，就是存放uOps的Cache。<strong>MITE</strong>是Micro-instruction Translation Engine的缩写，其实就是没有引入DSB之前传统的decode pipeline。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ce4ee4a637b0.jpg)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c00fe310a454.jpg)

由于前端从DSB切换到MITE Pipeline，会有一定的惩罚周期，导致没有uops发往Micro-op Queue，这个分类主要就是计算这部分周期占总周期的一个比重。

<strong>self.val = EV("DSB2MITE_SWITCHES.PENALTY_CYCLES</strong>", 3) / CLKS(self, EV, 3)这个计算公式很好理解，DSB2MITE_SWITCHES.PENALTY_CYCLES事件表示的是Cycles of delay due to Decode Stream Buffer to MITE switches，即切换所浪费的周期数，然后用该值除以总周期数，得到相应的比重。


*5.LCP:*

接下来分析下*<strong>LCP</strong>*这个子类，LCP是<strong>Length Changing Prefixes</strong>的缩写，对于正在decode的指令，若发生dynamically changing prefix length，即有LCP，长度改变前缀，便会出现几个周期的Stall。在Intel的相关文档里面提到：This may result in a <strong>three-cycle penalty</strong> for each LCP (Length changing prefix) in a 16-byte chunk，大约是三个周期的惩罚，然后只要Using proper compiler flags or Intel Compiler by default will <strong>certainly</strong> avoid this，便可以解决LCP的问题。接着来看下LCP的计算公式：

<strong>self.val = EV("ILD_STALL.LCP</strong>", 3) / CLKS(self, EV, 3)也十分容易理解，ILD_STALL.LCP事件表示的是Stalls caused by <strong>changing prefix length</strong> of the instruction，即由于LCP导致停顿的周期数，除以总的周期数。


*6.MS_Switches：*

对于*<strong>MS_Switches</strong>*子类，想要表达的是从DSB pipeline或MITE pipeline切换到MS pipeline所浪费的周期比重。其中，MS是<strong>Microcode</strong> <strong>Sequencer</strong>的缩写，对应的是Intel架构图中的MSROM module和AMD架构图中的Microcode Rom。这个模块主要用于存放<strong>microcode，</strong>即某些CISC指令的uops流，比如CPUID指令，对应的是一系列的uops指令，这些uops序列将会存放在MS ROM中。

对于Intel CPU，从DSB或者MITE切换到MS pipeline会出现一定周期的stall，所以这个分类的计算公式为：

** self.val = MS_Switches_Cost * EV("IDQ.MS_SWITCHES**", 3) / CLKS(self, EV, 3)IDQ.MS_SWITCHES事件统计的是切换的次数，具体的解释为：Number of switches from DSB (Decode Stream Buffer) or MITE (legacy decode pipeline) to the Microcode Sequencer，然后再用次数乘以切换所浪费的周期数MS_Switches_Cost （这里MS_Switches_Cost为常数2），变得可以得到MS切换所导致停顿的周期数。最后用这个值除以总的周期数，便是MS Switch相应的比重。


好了，终于将Frontend Lantern以及他下面的六个子类讲解清楚了，需要注意的是，这里的六个子类都是站在总的执行周期这个层面是去看相应的比重的，所以他们和一定不等于他们的父类。但是由于他们的分母都是总的执行周期，所以他们之间可以相互比较，这也是为什么TMA方法学所强调的，不同层级、不同分类下的数值比较没有意义**。只有当Frontend Latency这个分类是主要瓶颈的时候，我们才会对他展开，然后我们只需要比较它下面的六个子类比重大小，而不用再去考虑其他的分类。

#### Frontend Bandwidth：

接下来轮到Frontend Bandwidth了，即前端没有充分利用带宽所消耗的Slots比重。这里对于的计算公式为：

self.val = self.Frontend_Bound.compute(EV) - self.Frontend_Latency.compute(EV)即直接用父类Frontend_Bound的值减去他兄弟Frontend_Latency的值，由于这两个子类的和一定等于前端总浪费的Slots数量，所以就可以通过这样简单地相减得到。接下来主要详细看下Bandwidth下的三个子类，对于Bandwidth，TMA将他划分成了MITE，DSB和LSD三个子类，这三个子类分别对应三种Frontend pipeline，均有可能出现issue的uops宽度不为4的情况。

*1.MITE:*

通过上面的讲解，应该还记得<strong>MITE（Micro-instruction Translation Engine）</strong>，由于Frontend的Decoder pipeline可能会出现inefficiencies的情况，所以会导致MITE的Bandwidth不理想。具体的计算公式为：

<strong>self.val = (EV("IDQ.ALL_MITE_CYCLES_ANY_UOPS</strong>", 3) - EV("<strong>IDQ.ALL_MITE_CYCLES_4_UOPS</strong>", 3)) / CORE_CLKS(self, EV, 3)先简单讲解下公式中的两个事件，对于IDQ.ALL_MITE_CYCLES_ANY_UOPS，统计的是有uops从MITE发送到IDQ（Instruction Decode Queue）的周期数，对应的解释为：Counts cycles MITE is delivered at least one uops。然后对于IDQ.ALL_MITE_CYCLES_4_UOPS，统计的是有4个uops从MITE发往IDQ的周期数，即Counts cycles MITE is delivered four uops。两者之差，即为MITE的Bandwidth不为4的周期数，再用这个差除以总的周期数，即可得到相应的比重。当然，我们可以将MITE分别向IDQ发送1、2、3uops的周期数全部加起来，即可得到Bandwidth小于4的周期数，再用这个周期数除以总周期数，也可以得到同样的结果。


*2.DSB:*

对于DSB（Decoded Stream Buffer），即<strong>decoded uop cache，</strong>也有可能出现inefficient的情况，具体原因可能是没有利用好DSB cache structure，或者在读取的时候发生了Bank conflict，这些原因均会导致DSB没有充分利用带宽。具体的计算公式为：

<strong>self.val = (EV("IDQ.ALL_DSB_CYCLES_ANY_UOPS</strong>", 3) - EV("<strong>IDQ.ALL_DSB_CYCLES_4_UOPS</strong>", 3)) / CORE_CLKS(self, EV, 3)其中，公式中的两个事件解释与MITE公式中的两个事件解释一致，只不过观察的对象变成了DSB pipeline。两个事件之差，便是DSB效率低的周期数，再除以总的周期数，便可以得到相应的比重。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b5c06b557197.jpg)

不过我发现，好像随着Intel CPU Microarchitecture的升级，MITE和DSB的Bandwidth也有所升级，最大的带宽肯定不再是4。再次拿Skylake的架构图来说明，通过架构图我们可以了解到，DSB的最大Bandwidth已经变成了6，MITE的Bandwidth变成了5。所以这里的公式应该用MITE/DSB有uops发射的周期，减去uops带宽大于等于4的周期，才比较合理。要么就用发送1、2、3 uops的周期数的和作为分子，除以总的周期数，而不是用减法实现。

但是在Skylake的代码中，还是使用的是IDQ.ALL_DSB_CYCLES_4_UOPS和IDQ.ALL_MITE_CYCLES_4_UOPS，均表示uops为4的周期数。看来我还需要在GitHub上再提交一个issue，等后续作者有相应的答复，这里会及时更新。


作者也很及时答复了这个问题，下面的作者的回答。我提议用发送1、2、3 uops的周期数的和作为分子，作者表示发送 uops只会出现在指令fusiond的情况下，这时流水线的宽度依然是4。对于fusion，其实就是micro-fusion，是Intel CPU的一种机制，使得Frontend可以将多个uops融合成一个复杂的uop进行处理，然后在后端执行的时候，会将其拆分来进行处理。所以作者可能是想表明， uops的时候，其实也只有4条uops，只不过是有micro-fused uops混杂在这4条里面罢了。如果从这个角度解释的话，那么公式中为什么只减去4 uops的周期数，便是合理的。其实要验证这个问题也很简单，只需要统计一下现有公式所计算出来的值，是否和使用1、2、3 uops的周期数作为分子算出来的值一致，便可以验证、解决这个问题的，然后需要注意的是，要使用一些能够产生micro-fusion的程序作为测试程序，以使得uops宽度能“达到”。

> How about you test if your formulas work better on some tests?
AFAIK the  cases only happen with fusion, so 4 is the full width. Ignoring that is quite reasonable, so the existing formula seems reasonable.

*3.LSD:*

LSD是Loop Stream Detector的缩写，通过下图可以得知，LSD处于uOp Queue内部，中文翻译过来叫做<strong>循环流检测器</strong>，其实就是检测、保存uops循环序列，当uops循环序列小于或等于LSD的容量时候，可存放在LSD中，便可以不需要再通过前端的译码得到相应的uops序列，只需要不断从LSD中取出相应的uops序列便可。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ef32caf8da72.jpg)

在一些罕见的情况下，比如uops循环的大小与当前硬件的LSD结构不匹配，就会出现LSD带宽不足的情况。对于Intel的Skylake，该项的值直接等于0，也许是Intel对Skylake的LSD进行了Update，不会再出现Bandwidth的相应问题？还是说相关的PMC出现了异常？我们不得而知。

所以，我们来看下Intel的第四代架构，Haswell中该项所使用的公式：

> self.val = (EV("LSD.CYCLES_ACTIVE<strong>", 3) - EV("</strong>LSD.CYCLES_4_UOPS**", 3)) / CORE_CLKS(self, EV, 3)

看来还是和他的兄弟节点计算方法一致，<strong>LSD.CYCLES_ACTIVE</strong>事件为Cycles with at least one uop delivered by the LSD and none from the decoder，<strong>LSD.CYCLES_4_UOPS</strong>事件为Cycles with 4 uops delivered by the LSD and none from the decoder。那么两者之差便是LSD带宽不满的周期数，然后再用这个数值除以总的周期数，得到相应的比重。


至此，我们便完成了对Frontend Bandwidth和他三个子类的讲解。与Frontend Latency的六个子类相似，这些子类均是站在周期数这个层级进行统计的，所以他们的和肯定不等于他们的父类。但是他们之间是有相互比较的意义的。不过，哪怕是Frontend Latency下的六个子类，和Frontend Bandwidth下的三个子类之间，也是没有比较意义的，一个是压根没有uops发射的周期数比重，另一个是uops带宽不足的周期数比重，显然不在一个层面上。正确的分析方法还是先看第一层，然后再看对应的第二层，接着再看对应的第三层，根本没必要去关注不同分支下的各个类比的比重大小，只需要关注同一个分支下的比重大小即可。

终于完成了对TMA Frontend Bound下各个分类的讲解了，希望在了解TMA方法学的同时，大家能够对目前CPU的Frontend能有一个更深刻的了解和认识。毕竟，当我们对所要分析的事物理解越透彻、越深刻时，我们便能够越容易地对它进行剖析，找出其根本的原因和问题。

接下来将会对TMA其余的分支及下面各个层级进行讲解，希望这篇文章对您或多或少能有些许帮助，这样也不枉费我花了8个多小时去完成这篇文章。因为我觉得TMAM还是有其可取之处的，希望能让更多人认识了解到它，哪怕我们可能使用不上TMAM，但这整个分析讲解的过程，或许也能够帮助大家更好地了解认识目前CPU的Frontend。

若大家对CPU内部各个模块的机理以及他们之间是如何相互配合工作感兴趣的话，或许我下次可以专门开一个系列来讲解现代的CPU/GPU。毕竟，我觉得目前在中国，对现代CPU、GPU内部进行详细剖析的文章还是很少的。还是那句老话，如果有什么问题或者建议的话，欢迎大家留言，一起探讨学习。
