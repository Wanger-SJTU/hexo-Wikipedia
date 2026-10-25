---
title: 让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（四）Speculation
date: "2019-05-04 00:00:00"
updated: "2019-05-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】(四)Speculation/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64529137
---


上篇文章简要地介绍完TMAM的Frontend Bound分支后，这篇文章将简要地对Bad Speculation分支做一个简要的讲解和说明。该大类表示的是错误的分支预测和CPU中的Machine Clears机制对CPU性能影响情况，将Bad Speculation做为一个大的分类是TMAM的一个特点。若该分类的值大于一定程度时，需先调查解决该分类。因为哪怕此时其他分支也占据很大的比重，但可能暴露出这些问题的都是那些处于错误分支上的指令，并不能真实地反映出CPU运行该程序正确指令流的特性，所以需要先解决该分类的问题，再去调查研究其他的分支。

**

[](https://zhuanlan.zhihu.com/p/61015720)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c71af1a42ae8.jpg)

Bad Speculation展开Bad Speculation分类代表的是由于错误的Speculation所浪费的Slots数量，例如错误分支上的uops虽然被issued了，但是最终没有retired，这部分的slots便属于浪费的一部分；又或者是Frontend issue-pipeline由于从错误分支Recovery到正确分支，导致Pipeline Stall，没有uops issue到Backend，这一个过程中所浪费的slots数量也属于该分类。

#### Bad Speculation：

该分类的计算公式如下：

(EV("UOPS_ISSUED.ANY<strong>", 1) - EV("</strong>UOPS_RETIRED.RETIRE_SLOTS<strong>", 1) +</strong>Pipeline_Width** * <strong>Recovery_Cycles</strong>(self, EV, 1)) / <strong>SLOTS</strong>(self, EV, 1)

该分类与它其他的兄弟节点计算方法相似，分母是总的slots数量，分子是属于该分类的slots数目。该分类的分子可以分为两部分，（<strong>UOPS_ISSUED.ANY</strong>- <strong>UOPS_RETIRED.RETIRE_SLOTS</strong>）两事件计数之差，表示的是issued了但是最终没有被retired的slots数量；<strong>Pipeline_Width</strong>* <strong>Recovery_Cycles</strong>表示的是由于Recovery导致issue-pipeline被堵塞所浪费的slots数量。

由于SLOTS的函数的计算公式在上一篇文章中已经介绍过了，所以这里就不进一步展开说明了，这里只对<strong>Recovery_Cycles</strong>函数的计算公式进行说明。

<strong>def Recovery_Cycles</strong>(self, EV, level):<strong>return (EV("INT_MISC.RECOVERY_CYCLES_ANY</strong>", level) / 2) if <strong>smt_enabled</strong> else EV("<strong>INT_MISC.RECOVERY_CYCLES</strong>", level)Recovery Cycle需要考虑SMT（Simultaneous Multi-Threading）是否enable，<strong>INT_MISC.RECOVERY_CYCLES_ANY</strong>事件统计的是从分支预测错误或者Machine Clear事件中恢复导致Resource allocator Stall的周期数。若开启了HT，由于同一个Core中运行着两个Threads，所以需要将值均分到两个线程中。若能单独地统计每个线程的RECOVERY_CYCLES数量，必然会更精确，但是那样的实现难度和资源消耗的代价将会增大很多，所以这里使用了一种投机的方法，直接除以2。

**

Bad Speculation的子分类为Branch Mispredicts和Machine Clears两部分，一个代表的是分支错误预测导致所浪费的slots数目比重；另一个代表的是由于触发某些条件，导致Machine Clear发生所浪费的Slots数量比重，下面将分别对这两个分类进行讲解。

#### Branch Mispredicts：

当CPU遇到分支指令时，为了避免流水线Stall，Branch Predictor会进行分支跳转的猜测，虽然目前策略的准确率高达90%以上，但是也会难免出现Mispredicts的情形，这时便需要丢弃掉错误分支上的相关指令，重新从正确的分支上取指。该子类具体的计算公式如下:

Mispred_Clears_Fraction**(self, EV, 2)* <strong>Bad_Speculation</strong>

计算原理是用Mispredict Clears的比重系数，乘以父节点的值，以得到自身相对应的比重，这里需要对Mispred_Clears_Fraction函数具体的计算公式进行说明。

<strong>def Mispred_Clears_Fraction</strong>(self, EV, level):<strong>return EV("BR_MISP_RETIRED.ALL_BRANCHES</strong>", level) /(EV("<strong>BR_MISP_RETIRED.ALL_BRANCHES</strong>", level) + EV("<strong>MACHINE_CLEARS.COUNT</strong>", level))<strong>BR_MISP_RETIRED.ALL_BRANCHES</strong>可以理解为Mispredicts Branch的数量，即只要发生了一次错误预测，该Counter的值便加一，而不管该次错误预测影响了多少指令，浪费了多少周期。<strong>MACHINE_CLEARS.COUNT</strong>统计的是Machine Clear发生的次数，只要触发了Clear操作，便会使得该计数器加一。总而言之，该系数即为Mispredicts发生的次数占Mispredicts和Machine Clears发生的总次数的比重。

可以看出，用该系数乘以其父节点，得到的值并不十分准确，因为每一次的Mispredicts和Machine Clears对Slots的浪费情况均有所不同，只考虑发生的次数而不考虑具体的影响情况，必然会导致在某些极端的情况下出现较大的偏差。不过这也可能是受Counter所限，在没有更好、更贴切的Counters情况下，这也不失是一种折衷的方法。

**

#### Machine Clears：

当CPU检测到某些条件时，便会触发Machine Clears操作，清除流水线上的指令，以保证CPU的合理正确运行。比如发生错误的Memory访问顺序（memory ordering violations）；自修改代码（self-modifying code）；访问非法地址空间（load illegal address ranges），这些操作都会触发Machine Clear。对于Machine Clears分类的计算方法，由于有了其兄弟节点Branch Mispredicts具体的计算公式，那么该分类只需要用父节点的值减去兄弟节点的值便可得到，具体的计算公式如下：

>  self.val = Bad_Speculation <strong>-</strong>Branch_Mispredicts**

由于TMAM没有对Bad Speculation进一步向下展开，所以对Bad Speculation的讲解便到此结束了。虽然在PMU-Tools中的Bad Speculation分类只有两个子节点，但是我们可以通过添加更多的Counters以对导致Bad Speculation的原因进行更好的统计分析。比如分别统计Mispredicts和Machine Clears所Issued但是最终没有被Retire的uops数目，记作A和B；然后分别统计Mispredicts和Machine Clears导致Pipeline Stall的周期数，记作C和D。

那么，我们便可以用(A+C*4) / (A+B+C*4+D*4)来得到Mispredicts确切的比重系数，然后还可以通过A / (A+C*4)和C*4 / (A+C*4)来进一步得到Branch Mispredicts的下一层级节点。这里仅仅抛砖引玉，希望大家可以不局限于Intel CPU具体的计算公式和具体实现的Performance Counters，我们完全可以根据自己的想法来设计出适合自己为自己所用的TMAM。
