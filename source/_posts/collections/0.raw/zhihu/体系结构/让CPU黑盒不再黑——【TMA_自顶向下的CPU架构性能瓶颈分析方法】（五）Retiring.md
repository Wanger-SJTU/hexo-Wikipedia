---
title: 让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】（五）Retiring
date: "2019-05-04 00:00:00"
updated: "2019-05-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/让CPU黑盒不再黑——【TMA_自顶向下的CPU架构性能瓶颈分析方法】(五)Retiring/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64576459
---


继上篇文章对TMAM的Bad Speculation做了简要的介绍后，这篇文章将讲解Retiring这条分支上的各个节点的计算公式和所代表的含义。与其他兄弟节点不同，Retiring这个大类代表的是有效地利用pipeline slots数量所占的比重，即被issued且最终成功retired的uops数量比重。对于4发射的CPU，若Retiring的值为100%，表明该CPU每个周期可以Retire 4条uops。需要注意的是，具有高的Retiring值，并不意味着没有进一步可以优化的空间。我们可以通过了解Retired的uops指令类型及其比重，来优化程序，使得程序的执行效率更高，比如将大量的标量指令转变成矢量指令。

**

[](https://zhuanlan.zhihu.com/p/64529137)

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_5d7e627eb5aa.jpg)

Retiring分支上的各个节点对于Retiring这个大类，代表的是Retired的uops数量占所有slots数量的比重。现代x86 CPU内部会将CISC指令转换成RISC指令来执行，变成一条条uops，但是有些复杂的CISC指令，并不会通过Frontend中的Decoder来得到相应的uops，而是通过Microcode Sequencer (MS) unit来生成相应的uops指令。故在Retiring这个大类中，划分成了Base和Microcode Sequencer两个子类，分别代表传统Decoder生成的uops和由MS生成的uops所占的比重。

#### Retiring：

对于该分类的计算公式如下：

> self.val = EV("UOPS_RETIRED.RETIRE_SLOTS**", 1) / **SLOTS**

对于公式中的SLOTS函数的计算公式，即如何求得Pipeline Slots的总数量，由于前面有进行过讲解，所以这里将不再赘述。我们只需要关注**UOPS_RETIRED.RETIRE_SLOTS**事件所统计的内容，通过查阅Intel的手册，对该事件的解释是：统计所有的Retired Slots数量。用这个值除以总的Slots数量，即可得到被有效利用的Slots所占的比重，IPC的值越大，Retiring所占比重将会越高。

#### Microcode_Sequencer：

Microcode_Sequencer子类所代表的含义是来自MS（Microcode Sequencer）产生的有效uops数量占所有uops数量的比重大小。MS用于解析默认decoders不支持的CISC指令，比如对string重复执行move操作的指令，CPUID指令等，这些类型的指令均由MS生成。下面我们来看一下该类别具体的计算公式：

**self.val = Retire_Uop_Fraction** * EV("**IDQ.MS_UOPS**", 2) / **SLOTS**在公式中，调用了**Retire_Uop_Fraction**函数以计算retired uops所占的一个比重大小，我们先来看下该函数具体的计算公式：

**def Retire_Uop_Fraction**(self, EV, level):** return EV("UOPS_RETIRED.RETIRE_SLOTS**", level) / EV("**UOPS_ISSUED.ANY**", level)可以很直观地了解到，**Retire_Uop_Fraction**，即Retired uops占所有issued uops的比例，可以由UOPS_RETIRED.RETIRE_SLOTS除以UOPS_ISSUED.ANY，即Retired uops数量除以Issued uops数量直接得到。然后再用这个系数乘以**IDQ.MS_UOPS**事件（该事件表达的含义是由Microcode Sequencer (MS) delivered的uops数量），便可以近似得到由MS issued且最终Retired的uops数量。最后用这个近似值除以总的Slots数量，便是MS这个分类所占的比重大小。

**

*1. Assist:***

在MS分类下，只划分了一个Assists子类，Assists是MS所产生的uops中的一个类别，该类别的uops代表的是一长串的uops序列，用于辅助完成一些基本uops无法完成的操作。比如当处理非常小的浮点数值（即所谓的Denormals）时，FP运算单元并不能直接处理这些操作，便需要使用一系列的uops来执行这类操作，这一长串的uops由MS发出，称作assist。由于assist的uops序列有可能长达数百个uops，所以assist类型的指令对CPU Performance影响很大，很多情况下，我们都可以避免这类assist操作。

对于Assist类别，具体的计算公式如下：

** self.val = Avg_Assist_Cost ***(EV("**FP_ASSIST.ANY**", 3) + EV("**OTHER_ASSISTS.ANY**", 3)) / **SLOTS**(self, EV, 3)这里使用了一个统计平均值**Avg_Assist_Cost***，*即每次Assist平均消耗的slots数量，在skl_clinet_ratios中，该常数的定义为100，即认为assist操作平均会使用100条uops。然后再用这个平均值乘以FP_ASSIST与OTHER_ASSISTS两个事件的和，即用每次操作的平均值乘以发生Assists的总次数，以得到Assists操作总共消耗的slots数量。最后用这个值除以总的slots数，以得到对应的比重大小。

#### Base：

对于Base这个子类，代表的是除Microcode Sequencer外，其余modules产生的uops数量占所有slots的比重。uops的数量与程序所包含的指令数量有关，一般而言，一条指令对应一条uops。虽然该分类的值我们认为越大越好，但是该分类的值很大时，并不意味着没有进一步优化的空间。比如我们可以考虑如何减少程序的指令数量，或者使用执行效率更高的指令类型，如矢量指令类型。

对于Base这个节点，具体的计算公式如下：

** self.val = Retiring** - **Microcode_Sequencer**在了解父亲节点和兄弟节点的比重后，该节点的值只需使用父节点减去兄弟节点便可得出。对于该节点的下一层级，分为浮点类型指令和其他类型指令两个类别。

**

*1. FP_Arith:***

该类别表示的是被执行且最终Retired的浮点类型uops所占的比重大小，具体的计算公式如下：

**self.val = self.X87_Use**.compute(EV) + self.**FP_Scalar**.compute(EV) + self.**FP_Vector**.compute(EV)该节点的值为其三个子节点的值之和，所以只要我们了解了其子节点的计算方法后，便可以得知该节点具体的计算公式和对应的值。在这个节点下面，划分了三个子节点，分别表示x87指令、标量浮点类型指令和矢量浮点类型所占的比重大小，接下来，将一一讲解这三个子节点。

**

*1.1. X87_Use:***

该类别代表的是历史遗留的x87指令类型所占的比重大小，虽然当代的x86 CPU还支持x87指令集，但由于其效率不如现代的矢量指令集，所以最好能用AVX或SSE指令集替代x87指令集。对于该类别，具体的计算公式如下：

** self.val = EV("UOPS_EXECUTED.X87**", 4) / EV("**UOPS_EXECUTED.THREAD**", 4)可能由于没有Counter去统计Retired的x87 uops数量，所以这里使用的是UOPS_EXECUTED.X87事件，即执行的x87 uops数量。公式中，用该统计值除以总共执行uops的数量，以近似得到x87的比重。

**

*1.2. FP_Scalar:***

该类别表示的是标量浮点类型uops的比重大小，若此类别的值大于一定值时，应该研究是什么限制了编译器生成相应的矢量浮点类型指令，而使用了大量的标量浮点类型。对于该节点，具体的计算公式如下：

** self.val = (EV("FP_ARITH_INST_RETIRED.SCALAR_SINGLE**", 4) + EV("**FP_ARITH_INST_RETIRED.SCALAR_DOUBLE**", 4)) / EV("**UOPS_RETIRED.RETIRE_SLOTS**", 4)对于公式中的FP_ARITH_INST_RETIRED.SCALAR_SINGLE和FP_ARITH_INST_RETIRED.SCALAR_DOUBLE，分别代表的是Retired的SSE/AVX标量单精度和双精度浮点类型指令数量，两者之和便是Retired的标量浮点类型指令数量。然后再用该值除以总的Retired uops数量，得到相应的比重。

**

*1.3. FP_Vector:***

除了标量的浮点类型外，还有矢量的浮点类型，对应的计算公式如下：

** self.val = (EV("FP_ARITH_INST_RETIRED.128B_PACKED_DOUBLE**", 4) + EV("**FP_ARITH_INST_RETIRED.128B_PACKED_SINGLE**", 4) + EV("**FP_ARITH_INST_RETIRED.256B_PACKED_DOUBLE**", 4) + EV("**FP_ARITH_INST_RETIRED.256B_PACKED_SINGLE**", 4)) / EV("**UOPS_RETIRED.RETIRE_SLOTS**", 4)与上个公式类似，先是用四个事件的统计值之和，以得到总的矢量浮点类型uops数量，这四个事件分别统计的是SSE/AVX 128-bit packed和256-bit packed下的单精度和双精度Retired的指令数量。用这四者之和除以总的Retired uops数量，便可以得到这个节点的比重大小。

**

 *2. Other:***

**除了浮点类型外，还有其余的许多类型指令，这部分的指令均归属于Other这一节点，该节点具体的计算公式如下：

>  self.val = 1 - FP_Arith**

由于前面我们通过将FP_Arith的三个子类的值求和，以得到FP_Arith节点的值，那么，除浮点类型外，其余指令所占的比重将等于1-FP_Arith。若所分析的程序的程序中不包含浮点类型的操作，那么其余指令类型的比重将等于1，表示不含有浮点类型指令。

通过以上的讲解，我们对Retiring这个分类有了一定的认识，虽然该类别的值越大越好，但是哪怕该类别的比重为100%，也并不意味着没有进一步优化的空间。我们可以通过降低效率低下的指令比重，来提升CPU的执行效率，以提升性能。

解析完了TMAM的三个类别后，目前还剩余Backend Bound没有讲解，Backend Bound是四个大分类中最复杂、子节点最多的一个分支，也是TMAM的精髓，接下来将会分两篇文章详细地对Backend Bound进行讲解说明。
