---
title: Instruction scheduling in LLVM
date: "2023-10-17 00:00:00"
updated: "2023-10-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Instruction-scheduling-in-LLVM/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/360364235
---


最近工作接触到指令调度，所以就抓住机会~~~写一篇博文把~~~初次学习，如果有写的不对，请大佬们指正。首先简单介绍下，与指令调度相关的一些基础概念：

<strong>指令调度的概念：</strong>指令调度，是编译器优化的一种技术，目的是通过指令层级上的并行，使得程序在拥有指令流水线的中央处理器上能够高效运行。通常根据调度发生的阶段我们把其分为静态调度和动态调度。

- 静态调度：发生在编译时期，在指令执行之前，完成指令重新排序过程。指令发射的顺序和指令执行的顺序是一致的。
- 动态调度：发生在运行时期，需要相应的硬件提供支撑，其指令之间的依赖关系也是交给硬件去处理的。指令执行之前会将其发射到保留站中，根据运行时，指令执行的状态，取动态的调度下一条要执行的指令。通常指令的发射的顺序和指令执行的顺序是不一致的。动态调度，通常会有一个限制，只能对一个窗口周期内的指令进行调度，而且会显著的增加硬件设计的复杂度。
无论是静态调度和动态调度，其均是通过重新排序指令的执行顺序，使得

- 降低指令流水间的stall（空泡）
- 增加IPC（Instruction per cycle 一个时钟周期执行的平均指令数，衡量处理器性能的重要指标）
- 缓解寄存器压力（如果调度程序处理好，某种程度上是可以减少寄存器的生存周期，缓解寄存器压力）
<strong>相关专业术语简介：</strong>

- Throughput：单位时间执行的指令条数
- Latency：指令执行多少个Cycle数之后，能够产生输出
- ResourceCycles：在拥有流水线机制的CPU，某些指令存在比较特殊的情况，即必须等待指令完成执行完，才能启动下一条指令，此时需要设置此值。其值=Latency。当throughput Data Forwarding机制，即在硬件上加入额外的逻辑，使得上一条指令执行的结果直接灌入到下一条指令进行指令，而不需要等待上一条指令回写到寄存器之后，才能触发下一条指令的执行，从而一定程度上消除一些数据流依赖导致的stall。https://www.cs.utexas.edu/users/mckinley/352/lectures/12.pdf；2）结构型冒险：hardware repilcation，https://searchdatabackup.techtarget.com/tip/The-differences-between-hardware-replication-and-software-replication；3）控制型冒险：引入Branch predict：利用分支预测，直接跳转到预测指令的真正地址，如果分支预测失败，则要有能力恢复到分支指令执行完毕时刻的寄存器状态，进入正确的分支继续执行；4）Danamic scheduling，乱序执行

      指令调度，是基于指令之间的数据依赖关系不被破坏的前提下，进行的指令重新组合。目前<strong>数据流依赖</strong>关系主要有（假设第一条执行的指令为I1，下一条执行的指令为I2）以下三种（<strong>notes</strong>：当前输出依赖和反依赖均可称为假依赖。真依赖是绝对不能改变指令之间的执行顺序，但是假依赖的话，一般可以通过寄存器重命名或者变量重命名的方式，来解决依赖关系，从而使其有机会改变指令之间的执行顺序）：

- True（flow）dependence：是真正的数据流依赖，也叫流依赖，即RAW（Read After Write），指令I2的输入，需要等到指令I1的输出
- Anti-dependence：反依赖，即WAR（Write After Read），指令I2需要用到I1指令的数据或者覆盖I1指令 
- Output dependence：输出依赖，WAW（Write After Write），指令I1与指令I2同时写一块内存，指令I1和指令I2之间可能存在使用指令I1的其他指令
<strong>指令调度与寄存器分配</strong>某种程度上是有种相互约束的关系。因为指令调度主要是挖掘程序的并行度，而寄存器分配，又是挖掘程序的局部性。在LLVM 中，其在寄存器分配前后，都有调度。在LLVM中，后端IR有不同的形式和状态存在，无论其在寄存器之前和之后做，本质上都是基于当前IR状态，尽可能的去提升程序并行度，提高调度程序带来优化的机会。可以看下寄存器分配前后，对调度程序产生的一些影响：

- 寄存器分配之前做调度：在寄存器分配之前做，可以更大程序上的优化代码的并行度。当前LLVM IR 状态下分配的寄存器均为虚拟寄存器，由于虚拟寄存器的个数不受限制，导致当前程序会不受约束的使用虚拟寄存器，从而可能会额外的增加寄存器分配的变量，增加活性寄存器数量，从而增加了寄存器压力，可能会产生寄存器Spill场景产生，直接影响程序性能（当寄存器数量不够用的时候，会将当前程序没有使用的变量从寄存器ST回内存，等当此变量再次被使用时，需要重新LD 回寄存器，产生LD/ST操作，通常访存操作的Latency 都比较大，故狠影响程序性能）。下图%2，23%，可能在寄存器分配阶段，增加了2个寄存器数量（这个代码比较简单，所以应该会复用寄存器的哈）
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7bc86028ecf6.jpg)

- 寄存器分配之后做调度：寄存器分配之后，会将上图所有使用虚拟寄存器的地方全部换成真实的物理寄存器，如下图所示。由于每个后端平台的寄存器个数都有一定的限制，所以一般会通过复用寄存器的方式，来减低寄存器压力，降低产生寄存器spill 的场景，但是这样同样会引来一些问题。如下图X11寄存器的复用，导致ADD指令和LW指令之间，存在了anti-dependence。可以想象下，如果把寄存器资源都过度的集中限制在一个范围中，那么可能会导致程序引入更多的依赖，从而直接影响到调度优化的效果
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ffd13ccb23f9.jpg)

根据调度程序处理的粒度以及调度处理的场景，可以将调度分成：

- 局部调度(local schedule)：基于基本块的调度，指令仅能在基本块内调度
- 全局调度(global schedule)：指令能在各个基本块中调度
- 模调度(modulo schedule)：属于软件流水线的生成算法，通过交叉运行不同的循环迭代，挖掘循环的不同迭代之间的指令并行性。
- 跟踪调(trace schedule)度：真正全局调度的运用，编译器会尽量去优化最经常被运行的代码控制流路
LLVM 调度有两种IR状态的调度，基于SchduleDAGSDNode 或者基于ScheduleDAGInstr，目前LLVM框架下，很多后端都是基于MachineScheduler （ScheduleDAGInstr）做调度。使能调度的优化选项：

`-pre-RA-sched        - Instruction schedulers available (before register allocation):
-enable-misched      - Enable the machine instruction scheduling pass.默认开启
-enable-post-misched - Enable the post-ra machine instruction scheduling pass. 默认开启`

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_472f8828093f.jpg)

      上图，绿色的部分代表的是Instruction Scheduling发生的阶段，蓝色部分代表当前基于Function级别的一些pass，主要表示当前可以触发指令调度的优化有哪些。（目前LLVM框架下，很多后端都是基于MachineSchedul 做调度。重点可以看下2，3两个阶段优化的实现）。图中一开始，输入是DAG 节点，经过selectionDAGISel 的调度阶段之后，转化为以List为base 的MI中间表示法。主要原因是由于当前CPU/GPU只能执行线性指令集，不能执行DAG，所以需要将DAG转化为线性指令集。这个过程主要是对DAG进行一次拓扑排序完成，会得到线性化指令集，当然在LLVM中除了TopoLogical 还会有一些别的启发式算法结合，-pre-RA-Shed=Value值。如基于source等，利用拓扑排序+启发式算法完成本次调度，简单介绍下SelectionDAGIsel调度程序，SelectionDAG nodes

1）lib/CodeGen/SelectionDAG/ScheduleDAGRRList.cpp

- default 为目标后端分配合适的调度器
- list-burr：Bottom-up 自下而上的寄存器减少的列表调度
- source：类似list-burr，尽可能的按照源码的顺序调度节点
- list-hybrid：自下而上的寄存器压力感知的列表调度，会尽量去平衡latency和寄存器压力之间的关系
- list-ilp:自下而上的寄存器压力感知的列表调度，会尽量平衡ILP(instruction level parallelism)和寄存器压力之间的关系 
2）lib/CodeGen/SelectionDAG/ScheduleDAGFast.cpp

- fast 快速列表调度
- linearize 线性化DAG，不需要调度
3）lib/CodeGen/SelectionDAG/ScheduleDAGVLIW.cpp

- vliw-td （此链接介绍vliw：https://llvm.org/devmtg/2013-11/slides/Guerra-VLIW.pdf）自顶而下的算法的列表调度算法，基本方法使用可用的节点的优先队列进行调度。一次将一个节点从优先级队列中取出（因此按照优先级顺序排列），检查调度的合法性，如果合法，则发射。可能会存在结构型冒险导致节点发射失败
       接下来，重点讲解基于当前LLVM框架，你要怎么在你的Architecture或者Processor，使能你的调度程序？主要分成两部分，首先需要根据target-description的描述信息，model 你架构的pipeline，创建好当前调度之前的一个数据依赖图。第二部分，就是如果当前LLVM 框架的描述的信息，不够你使用的话，你要怎么去定制化你自己的调度程序

LLVM框架下，target-description 的描述信息的填充主要是基于以下两种，后面步骤流程的介绍，主要是根据2的方式；

- instruction itineraries： 完成一条指令所需的一系列步骤，通过指令阶段的方式表示
- SchedModel：主要是根据指令执行的操作数表示，目前大多数后端都是基于这个完成调度模型的选型
在LLVM 之中，主要是通过target Descripition的方式去描述你的pipeline。Model调度器主要由以下步骤：

•为指令的每个操作数分配调度资源，确定输入输出操作数

`def WriteIALU : SchedWrite; // 32-bit integer ALU operations
def ReadIALU  : SchedRead;  // 32-bit integer ALU operations`

- 将其填充到真实的指令中
`def MUL : ALU_rr,
 Sched;`

- 设置调度模型
`def ProcessorModel : SchedMachineModel {
  let MicroOpBufferSize = 0;      //  in-order is zero.
  let IssueWidth = xx;            // xx micro-op is dispatched per cycle.
  let LoadLatency = xx;           // cache miss 
  let MispredictPenalty = xx;     // branch predicat failed
  let UnsupportedFeatures = [];   // some features instruction not support scheduling  
}`

- 为指令分配writeRes 和 ReadAdvance，WriteRes，是指令执行多少个cycles，能够产生输出，而ReadAdvance 是指令执行多少个cycles，能够产生输入，这个值的设定与硬件的Forwarding机制相关。
`def : WriteRes {
  let Latency = xx;
}

def : ReadAdvance;`

如果想基于自己的架构，自定义自己的调度器，该如何做？一般是通过三个方面去实现自定义自己架构或者处理器的调度器。1）自定义实现调度Policy；2）自定义实现调度的Strategy；3）改变DAG mutation

- 自定义实现自己架构下的调度Policy，主要是基于当前已经创建好的DAG图，决定当前遍历是自顶向下，或者自底向上，或者遍历过程，是否跟踪纪录寄存器压力信息，为后面启发式算法，提供优化机会
`void 
SubTarget::overrideSchedPolicy(MachineSchedPolicy &Policy,
                                       unsigned NumRegionInstrs) const {
  Policy.OnlyTopDown = true;
  Policy.OnlyBottomUp = false;
  Policy.DisableLatencyHeuristic = false;
  Policy.ShouldTrackPressure = false； // 是否需要跟踪Register Pressure
}`

- 自定义自己架构下调度Strategy，列表调度+ 启发式算法，选择当前可以调度的下一个节点。当前LLVM框架下也是基于列表调度算法，结合启发式算法完成调度程序下一个节点的选择，你可以设计自己架构下的启发式算法，使其尽可能的让调度接近最优解。
list scheduling ：本质上是拓扑排序，针对有向无环图做序列化排序，同时在选择下一条指令的过程会有一些启发式算法。 算法会模拟每个cycle 的流水线的状态，会维护一个readlist，存放当前时间节点可以参与调度的指令。通常可以被调度的指令是没有前驱的，他不依赖于任何指令 ，可以立刻被调度。（Heuristic 启发式算法，表示可以从一系列可以被调度的指令，选择其中一个进行调度）。列表调度结合启发式 ，主要调整启发式Fucntion算法（通常大部分情况下给不出最优，但是能够接近最优解），调整更通用的算法，对于各种各样的输入指令能够达到更优解，一般启发式算法，可以根据以下属性，选择当前优先级最高的指令进行调度：1）节点是否在关键路径上，关键路径上表示执行的时间最长，关键路径上的指令赋予更高的优先级。2）指令测周期更长。给他更高的优先级 ；3）可以选择有更多后继节点的指令进行调度（这样参与调度的机会更多）4）寄存器压力等

`Class customestragy : public GenericScheduler {
  Sunit *pickNode(bool &IsTopNode) override{
    // heuristic alogorithm 
    return GenericScheduler::pickNode(IsTopNode);
  }
}`

- 改变DAG mutation。通常调度之前，已经创建好Data Dependence Grapy，LLVM 在这边提供一个机会可以重新计算Dependence机会。通常列表调度 + 启发式算法，只是尽量让调度结果达到最优解，可能存在某些场景不能覆盖到。看下图，假设节点a到b 和节点 a到c的边距一样，则经过调度之后，产生的指令序列可以是：abcd或者acbd，如果当前你的架构，要求指令a指令完成之后，一定要先执行b，则可以在bc 之间增加mutation
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_6f9aac0fa544.jpg)

参考文档以及视频：

https://www.shangmayuan.com/a/7f40b27199a1412cba30fe3a.html LLVM 列表调度简单介绍

https://llvm.org/devmtg/2012-11/Larin-Trick-Scheduling.pdf

[https://zhuanlan.zhihu.com/p/52724656](https://zhuanlan.zhihu.com/p/52724656) LLVM后端流程介绍

[https://github.com/CatSystemWorkshop/COSCUP2019/blob/master/Instruction%20Scheduler%20in%20LLVM.pdf](https://link.zhihu.com/?target=https%3A//github.com/CatSystemWorkshop/COSCUP2019/blob/master/Instruction%2520Scheduler%2520in%2520LLVM.pdf) 

https://llvm.org/devmtg/2014-10/Slides/Estes-MISchedulerTutorial.pdf

https://www.youtube.com/watch?v=8SvfAEsgsDw 调度视频

https://llvm.org/devmtg/2014-10/Slides/Larin-GlobalInstructionScheduling.pdf ：全局调度
