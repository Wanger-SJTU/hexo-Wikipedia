---
title: "让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（一）What & Why"
date: "2019-03-31 00:00:00"
updated: "2019-03-31 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】(一)What-Why/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/60569271"
---


由于目前的CPU越来越复杂，应用了许多方法使得CPU跑得越来越快，也使得CPU越来越难以被分析。普通的用户、软件开发人员，很少有精力去弄懂整个CPU架构，去了解每一个CPU模块。若有一种分析方法，可以帮助用户快速了解定位当前应用在CPU上的性能瓶颈，用户便可以有针对性地修改自己的程序，以充分利用当前的硬件资源。

Intel有一位工程师就找到了这么一种分析方法，称为*Top-down Microarchitecture Analysis (TMA) Method *[1]，并且Intel将这套方法学应用在了他们的分析工具集VTUNE上面，Intel的另一位工程师也在Linux上实现了这套方法，并且分享到了GitHub: [andikleen/pmu-tools](https://link.zhihu.com/?target=https%3A//github.com/andikleen/pmu-tools)。

本人曾使用、研究过这套方法学，并且在其他的x86平台上实现了这套方法学，确实觉得这是一种对架构瓶颈分析的有效方法，<strong>可以快速准确地反映出具体的性能瓶颈，并且通过层级图和相应的百分比，让用户只需关注核心的性能瓶颈，清楚当前瓶颈对CPU性能的影响程度。</strong>并且，本人还发现此方法不仅可以应用在x86这种复杂的CPU架构中，对于简单的比如RISC-V架构也可以同样进行分析，并且对于复杂的GPU架构，在一些流水线比较简单的比如机器学习相关的应用中也能进行相应的瓶颈分析。除了帮助软件开发人员、编译器开发人员，这套方法学还可以帮助架构师去了解目前机构的瓶颈，有针对性地去设计下一代架构，以改善相关的性能。

由于这套方法学有这么多优点和好处，所以这里想和大家分享这套方法学，希望大家可以从中了解到一些关于CPU架构性能分析的知识，并且应用在具体的工作当中。而且，这种分析方法并没有局限在Intel的CPU上，完全可以了解该方法的核心思想后，自己设计出一套适用于其他特定架构的分析方法。希望可以集思广益，一起来完善这套方法学，使得日益复杂的处理器可以被我们所理解、所分析，让黑盒不在黑。

由于TMA内容比较多，对于不同类别的CPU瓶颈有不同的划分方法，所以我将会用一系列的文章来解释这套方法学，有兴趣的朋友有可以查阅相关资料来对它进行一个更加全面的了解。这篇文章首先会介绍TMA是什么、有什么用，然后会介绍TMA大概是怎么实现的，帮助大家对它有一个大体上的认识，后续将会逐一展开每一个分类具体的实现方法和具体的公式，让大家真正理解其原理。

先来看看Intel在一次活动中对TMA的解释：

Top-down Microarchitecture Analysis (TMA) Method is an industry-proven systematic approach that identifies performance bottlenecks in out-of-order cores. Identifying true bottlenecks lets developers focus software tuning to remediate them and improve efficiently on same hardware. TMA simplifies cycle-accounting using microarchitecture independent-metrics organized in one single hierarchy which makes analysis simple. Using TMA, the high-learning curve associated with each microarchitecture generation is replaced by a structured drill-down that guides the user to true performance limiters.

再来看看具体可以得到的性能瓶颈架构图：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bd8dab4c1f76.jpg)

先简要地讲解下这张图，对于我们想要分析的具体应用，我们只需应用TMA方法，将该应用在我们的目标机器上运行一次，便可以得到上图的结果。TMA并不会减缓目标应用在目标机器上的运行速度，并且也不会产生大量的log数据，在应用结束的同时，我们就可以得到以上的结果。

那么这个结果怎么看呢？初步可以简单地理解为：在程序运行的这段时间里面，纠结有多少是有效时间，而无效时间的那部分，主要都浪费在CPU的哪一块了，究竟是CPU哪块造成CPU不能愉快地奔跑起来。在第一层级，TMA对于CPU有四个分类，每个分类的比重可以先简单地理解为所消耗的比重。在最“好”的情况下，Retiring的比重为100%，其余比重为0%，即其余三个分类可以理解为三类导致CPU效率不高的分类。

在我们利用TMA结果进行分析的时候，我们只需要关注第一层级中比重最高的分支，然后逐级向下去追溯最关键的性能瓶颈便可。就拿图上的分析结果举例子，我们可以得知当前应用在该CPU上的性能瓶颈是在Backend，然后只用关心Memory部分，最终可以得知，CPU效率不高的原因是由于CPU访问DRAM这条路径不给力所导致的。

得知了该信息，软件开发人员便可以试着将相关数据预取到Cache中，或者减少不必要的DRAM访问来提升DRAM部分的性能。对于架构师，如果当前结果是运行业界Benchmark（比如SPEC CPU）所产生的结果，为了提高相应的跑分，可以优化CPU到DRAM这条路径的延时和带宽，或者支持更高级的DRAM来改善目前的架构缺陷。

叙述完了TMA到底是什么，接下来就说说为什么，为什么要选用TMA而不是其他的分析方法，得到TMA的分析结果究竟有什么用，相关人员又能如何利用该结果，来帮助自己的相关工作？为了帮助大家更好了解该方法的实用性，下面将介绍几个应用实例，以下例子均来源于Yasin的该篇论文。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_03a4049af462.jpg)

使用TMA对SPEC CPU Benchmark进行分析通过对业界一致认可的相关Benchmark进行TMA分析，可以得知具体每个测试用例的性能瓶颈在CPU的哪部分，可以有针对性地添加相应的编译选项，来提高特定程序在特定CPU上的性能，以提高跑分。对于架构设计人员，可以通过分析结果，来了解当前架构的性能瓶颈体现，以便更好地对下一代相关的架构进行有针对性的优化。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_df9582bda459.jpg)

SPEC CPU 1-copy vs 4-copy的TMA结果可以看到，对于SPEC CPU Benchmark，在1个copy的情况下，DRAM Bound原因是Latency导致的，但是在4 copy的情形下，DRAM Bandwidth的比重在某些测试用例中成为主要的DRAM Bound原因，这是由于这些用例都有对DRAM进行大量的数据访问所导致的。从中可以更好地了解每个测试用例的特性，是否存在大批量的对DRAM的数据访问。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_728d27d9449f.jpg)

SPEC CPU在Intel 3rd和4rd上的TMA结果通过运行同样测试用例（SPEC CPU Benchmark），可以快速地得到两种架构之间的差异，从结果可以得知，在4代Intel的处理器上，Front end Bound的比重明显减少，这有由于Intel在4代的处理器上对i-TLB和i-Cache均进行了优化所导致的。从该结果可以佐证对特定模块优化后的性能提升，并且还可以进行不同系列/不同架构直接的处理器对比，来更好地理解不同处理器之间的差异。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f209f19bbde.jpg)

由于TMA对矩阵乘进行相应的优化想要提升特定应用在特定机器上的性能，若知道该应用在特定处理器上的相应表现，便可以有的放矢地进行相应的代码修改，以充分利用CPU资源，提升处理性能。在步骤一，先运行一次程序，发现瓶颈在DRAM，然后检测代码是否有优化DRAM访问的可能性，发现循环存在问题（跳跃访问，而不是连续访问）。对循环进行修正后，再次运行TMA，发现瓶颈落在后端的处理上，便可以考虑是否可以矢量化，以充分利用Core中的ALU运算模块，提升执行速度。矢量化后，发现瓶颈依然处在后端，便可以思考还有什么方法可以提升后端的处理能力，若程序员了解指令集中指令的优劣，便可以选用更优的指令集代替传统的指令集。通过这样一步步的分析，我们便可以充分压榨CPU的资源，以提升我们的处理速度。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_35fcb0b6d4e9.jpg)

用TMA对多线程优化后的程序进行分析对于多线程优化，最怕就是锁啊这类问题，进行多线程后，整体的性能有可能会不升反降。要分析是什么原因导致了性能的下降，使用TMA便可以很快速地找到根本原因。通过结果，可以了解到是Cache上的Store出现了瓶颈，某一个线程在进行写操作，出现了False Sharing，这是由于多个线程处理的数据都映射到同一个Cache Line导致的，让不同的线程访问不同Cache Line的内容便可以解决这个问题。通过对比，修正后的多线程具有和单线程几乎一模一样的TMA结果，表示这是真正意义上的多线程优化。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1f530b294704.jpg)

对关键函数进行MEM Bound优化再来看一个对于特定应用优化的例子，对于程序中的热点函数进行TMA分析，得到87%比重在于Backend，然后发现主要是由于DRAM的Latency导致的。那么通过什么方法可以改善DRAM的访问呢？可以通过软件预取，提前讲所需的数据缓存到Cache中，以此来避免访问DRAM的延迟对整体程序性能造成影响。通过对实现软件预期的程序进行分析，可以发现DRAM Latency的比重有所下降，整体的速度比原来提升了2.5倍。

以上就是使用TMA对特定应用在特定CPU上的分析结果，并且介绍了这些分析结果能够怎样帮助我们对软件进行进一步的优化以充分利用现有的硬件资源，还有就是能够怎么样帮助硬件架构师更好地设计出性能更强大的处理。希望大家可以初步认识TMA，并且对它的效果有一定的认可，毕竟，想要分析一个复杂庞大的处理真的有点无从下手，而TMA却很好地告知我们的瓶颈，让我们只需要关注在能带来最大收益的部分。

介绍完了TMA是什么，怎么用，对我们有什么帮助后，接下来将会介绍TMA的实现原理，下一篇文章将会简要介绍TMA的核心思想和实现方法，究竟TMA是如何得到第一层级的四个分类的，这四个分类究竟表示什么含义。过程中可能会涉及到一些CPU体系结构，如果学习过Computer Architecture的朋友应该都很好理解，不过哪怕不了解也没关系，我会尽量用比较简单的语言来和大家讲解。

参考文献：

[1] Yasin, A. (2014). A Top-Down method for performance analysis and counters architecture. In ISPASS 2014 - IEEE International Symposium on Performance Analysis of Systems and Software.

#### 补充：

- TMA对性能进行分析的层级:
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5d324a1caeaa.jpg)

与传统的热点分析方法所处的层级不一样，TMA是站在微架构层级对软件的性能进行分析的
