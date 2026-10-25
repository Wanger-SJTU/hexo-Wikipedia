---
title: "如何评价 7 月 31 日一流科技开源的深度学习框架 OneFlow？"
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/如何评价-7-月-31-日一流科技开源的深度学习框架-OneFlow/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/409036335/answer/1373468192"
---


成诚
​
清华大学 软件工程硕士

​ 关注

2020 科技数码季

收录于 · 深度学习 与 分布式系统

重要更新！

近期我们的深度学习框架性能评测结果已公开，OneFlow在主流模型ResNet50-v1.5和BERT-base上的训练速度远超其他各个框架的官方实现，也超过了经NVIDIA深度优化后的各个主流框架最快实现。

在V100(16G) 上，OneFlow单卡训练ResNet50-v1.5速度比NVIDIA深度优化后的PyTorch快80%，比TensorFlow2.3快35%。在4机32卡的分布式场景下，比NVIDIA深度优化后的MXNet快10%。相关评测介绍，以及OneFlow如何做到这么快，感兴趣的小伙伴可以从我的技术分享文章中了解~

成诚：OneFlow是如何做到世界最快深度学习框架的594 赞同 · 30 评论 文章
各个框架性能评测仓库已开源，见： https://github.com/Oneflow-Inc/DLPerf

具体的中文版评测报告见： DLPerf 性能评测报告中文版 v1.0

2020/11/2

以下是原答案：

都2020年了，为什么我们相信OneFlow会成功

利益相关。

作为OneFlow的一名工程师，我来谈谈为什么我认为OneFlow有机会在深度学习框架的竞争中胜出。

本文的主要内容如下：

- 自我介绍
- OneFlow的设计思路，它的独特性
- OneFlow的特色一：Actor机制
- OneFlow的特色二：SBP机制
- 我对人工智能/深度学习未来的看法
- 对OneFlow开源的感想
- 总结一、 自我介绍

我是OneFlow的一名工程师，在公司创业之初就加入了。研究生就读于清华软院，读研期间在OneFlow实习了两年，毕业之后正式入职一年。我对OneFlow的整体设计是比较熟悉的，对深度学习框架也有一点小小的见解。OneFlow刚刚开源，我相信OneFlow的设计和实现可以给大家一种眼前一亮的感觉，也相信在众多深度学习框架的竞争中，OneFlow有机会胜出。

二、 OneFlow是独特的

时至今日，一个框架有没有机会成功，要看它有没有差异化的特点。OneFlow是有其独特的设计理念和技术路线的。目前市面上已有的众多开源框架，用户最多的是PyTorch和TensorFlow，除此之外还有各大公司的自研框架：PaddlePaddle、MXNet、MindSpore、MegEngine等等。其中TensorFlow的特点是最完备，推理、serving、XLA、tensorboard等一应俱全，工业部署的主流还是TensorFlow；PyTorch的特点是易用性最好，eager执行、动态图、跟python的交互方式等等，非常受科研人员喜欢。

可以说完备性和易用性这两极分别被TF和PyTorch占据，OneFlow作为一个小团队打造的框架，如果单纯的模仿别的框架，跟TF比完备性，跟PyTorch比易用性，那是绝对没戏的。但深度学习框架还有第三极：性能。OneFlow的特点就是追求极致的性能，而且是分布式多机多卡环境下的横向扩展性。OneFlow的核心设计理念就是从分布式的性能角度出发，打造一个使用多机多卡就像使用单机单卡一样容易，且速度最快的深度学习框架。

为什么OneFlow要聚焦于分布式场景的性能和易用性呢？因为深度学习是吞没算力的巨兽，单卡的算力和显存远远不能满足深度学习模型训练的需求。多机多卡的理想很丰满，现实很骨感，普通用户在使用其他框架时常常会发现多机多卡难以使用且效率低下、BERT/GPT-3等参数量巨大的模型无法实现等问题。别的框架一般都是先聚焦于单卡的视角和用户体验，对于多机多卡的处理就是把单卡的计算图镜像复制到多机多卡上，各个卡和机器之间辅助于模型同步的模块。业界不仅仅改进深度学习框架自身，还研发了多种第三方插件，譬如NCCL, Horovod, BytePS，HugeCTR，Mesh-tensorflow, Gpipe等等。但是，仍只满足一小部分需求。对于普通用户而言，使用其他框架做分布式训练常常需要更高的学习成本，还需要关心多机多卡之间模型是怎么同步的。但OneFlow不一样，OneFlow在框架最核心的设计上就在考虑分布式训练如何高效的协同运转，同时要让用户在多机多卡的训练体验上就像单卡一样简单容易。

下面我就分别介绍两点OneFlow相较于其他框架的独特设计，来体现OneFlow是如何看待分布式场景下的深度学习训练的。

三、 Actor——用一套简洁的机制解决所有令人头秃的技术难题

（关键特性： 去中心化调度 流水线 数据搬运是一等公民 传输被计算掩盖 控制逻辑被执行逻辑掩盖）

在OneFlow的设计中，分为Compile和Runtime两个时期，Compile时期把用户定义的神经网络、分布式环境信息等编译成一个静态图的执行计划Plan，Plan由执行单元Actor的描述信息组成；Runtime时期，各个机器根据Plan里的Actor描述信息真实得创建属于自己机器的众多Actor实例，然后启动Actor运行系统。整个深度学习训练期间，OneFlow的执行基本单元就是Actor，Actor对应静态执行图上的节点，Actor之间生产、消费的数据存储在Register中，Actor之间通过消息传递来协作运行。

### 3.1 Actor机制实现去中心化调度


OneFlow的运行时去中心化调度就是用Actor机制实现的。在整个由Actor构成的静态图中，没有一个中心的调度节点，每个Actor都只需要关心自己所需数据的生产者（上游Actor）和自己生产的数据的消费者（下游Actor）即可。这样在超大规模的分布式训练场景下，完全的去中心化调度可以避免中心调度的单点性能瓶颈问题。

每个Actor内部都有一个状态机，Actor收发的消息、执行的情况都会改变自己的状态。需要注意的是，Register是存储块，存放了Actor生产出来的数据，而消息是包含了Register存储块的内存地址的轻量级数据，Actor之间传递的是消息，而不是Register，这样就实现了zero-copy。当Actor收到了新消息，判断它执行所需要消费的Register已经就绪，且它生产的数据有空闲的Register可以写入时，这个Actor就执行（Act）一次，生产出一个Register。生产完以后，该Actor就向需要消费这个Register的那些消费者Actor们发消息，表示你们可以来读取我生产的数据了；同时该Actor还需要把它消费完的那些Register还给这些Regsiter的生产者Actor们，表示我用完了你们的数据，你可以回收了。Actor内部的状态机如图1所示。 

在Actor启动之后，会根据与其他Actor之间收发消息来切换自己的两个状态：等待状态 和 执行状态。

一个Actor收到的消息一般分为几个类型：a) 上游的生产者Actor发来消息说你可以来读我生产的数据了；b) 下游的消费者Actor发来消息说我用完你生产的数据了。当这个数据被所有消费者都用完以后，就可以回收成为空闲块等待下一次被该Actor重新生产一份新的数据。

一个Actor收到消息以后都会去尝试判断当前是否满足执行条件，执行条件一般有两个：a) 需要读取的数据是否都到齐了；b) 是否有空闲块可以拿来被生产。当满足执行状态以后Actor就开始调用自己内部的Kernel真实的去读写数据。

执行完毕后Actor会向上下游发消息：a) 向下游的消费者Actor发消息说我刚生产了一块数据，你可以来读了；b) 向上游的生产者Actor发消息说我刚用完了你之前发给我的数据了。

Actor只需要关心上下游的消息就能判断自己能不能执行。每个Actor都通过自己内部的状态机和收发消息机制实现了完全去中心化的分布式协同工作。

### 3.2 Actor机制实现流水线


上面我们介绍了Actor的内部状态机，Actor之间的消息传递和数据传递是依赖Register实现的。一个Actor是否能执行，只跟两个条件相关：1）自己消费的那些Register是否可读；2）自己生产的那些Register是否有空闲块可写。对于一个Register，如果我们运行时给它分配多个空闲块，那么相邻的两个Actor就可以同时工作，工作时间重叠起来，这样就实现了各个Actor之间的流水线。理想状态下整个静态执行图的执行时间就是整个系统中是性能瓶颈的那个Actor运行的总时间，其余Actor的执行时间都被流水线掩盖起来了。

我们举一个例子来解释Actor机制下的流水线是如何运转起来的。图2是一个由3个Actor（a,b,c）组成的计算图的执行时序图。其中深绿色的Regst方块表示正在被使用的Register块，白色的Regst方块表示同一个Register的备用空闲块。

图 2 Actor生产消费关系和执行时序图1） 在Time0时刻，Actor a产出了一个Regst_a_0，Actor b 和 Actor c由于没有可读的Register，所以处在等待状态。假设每个Actor的执行时间都是单位时间。

2） 到Time1时刻，Actor a给Actor b发消息说你可以来读我产出的Regst_a_0了，Actor b收到了消息，并检查自己生产的Register b是否有空闲Regst块可用，发现有可用的Regst_b_0，于是Time1时刻Actor b执行，读取Regst_a_0，写Regst_b_0；同时Actor a还会去看自己是否有空闲块可写，发现有，Time1时刻Actor a也在执行，写Regst_a_1。（这里需要说明的是，Regst_a_0和Regst_a_1逻辑上是属于同一个Register，只是空间上分成了不同的空闲块备份而已。在深度学习训练任务中，Regst_a_0和Regst_a_1里存放的是同一个operator产出的不同batch的数据。）于是Actor a和Actor b就并行工作起来了。Actor c由于没有数据可读，仍在等待。

3） 到Time2时刻，Actor b 生产出了Regst_b_0，于是给下游的消费者Actor c发消息说你可以来读我生产的Regst_b_0，同时给上游的生产者Actor a发消息说我用完了你的Regst_a_0。此时Actor a 已经把刚刚生产的Regst_a_1又发给了Actor b，Actor b检查自己仍有Regst_b_1空闲，于是Actor b开始读Regst_a_1，写Regst_b_1；Actor c收到Regst_b_0，发现自己有Regst_c_0空闲，于是Actor c开始执行，读Regst_b_0, 写Regst_c_0；Actor a收到了Actor b用完还回来的Regst_a_0，检查Regst_a_0所有的消费者都用完了，于是将Regst_a_0回收，标记为空闲块，同时Actor a还可以继续执行，写Regst_a_2。

在上面的例子中，到了Time2时刻，其实Actor a、b、c都在工作，在深度学习训练任务中，Time2时刻Regst_b_0、Regst_c_0存放的是Batch 0的数据，Regst_a_1、Regst_b_1存放的是Batch 1的数据，Regst_a_2存放的是Batch 2的数据。通过一个Register有多个空闲块的设计，Actor机制就实现了流水并行。

在这里我抛出一个更进一步深入的问题：整个数据流的执行像一个网络，数据在网络中的流动就完成了计算，如何避免生产者生产太快，消费者消费不及，以及如何避免生产者生产太慢，消费者感到饥饿的问题，这涉及到对计算、内存、传输带宽的规划，尽可能使系统的瓶颈之处最宽，需要解决流控（flow control）的问题以及资源分配问题（如每个Actor的Register到底分配几个内存块配额），这是非常关键的问题，也是OneFlow系统已解决的。

### 3.3 数据搬运是一等公民


在多机多卡的分布式环境中，各个机器和各个设备之间的数据传输往往是影响系统的横向扩展性的最重要因素，如果传输开销可以被计算开销掩盖，那么分布式深度学习训练就可以达到理想的线性加速比。相较于其他的框架，OneFlow把数据搬运视为跟数据计算同等地位的操作，提出“数据搬运是一等公民”的思想。

已有框架在编译期的关注焦点是数据计算，认为数据搬运是背后隐式发生的，因此在静态分析计算图时略过计算和搬运的重叠编排，OneFlow在计算图中显式表达了数据搬运，而且在静态分析时同等对待数据搬运和数据计算，以最大化重叠搬运和计算。

在最终的执行图中，数据搬运操作也是一个个Actor。除了在设备上做数据计算用的Actor以外，还有计算机内存到GPU显存之间的数据拷贝Actor，机器之间做网络通信的网络Actor，负责数据的切分、合并、复制的Actor，负责读取磁盘数据的Actor，负责加载保存模型的Actor等等。很多其他框架都把数据加载、多卡模型梯度的同步、网络、模型加载更新等分别做成一个单独的模块，而OneFlow的设计是所有的功能都在一张由Actor组成的静态执行图里实现了。OneFlow这样的设计不仅简洁、优雅，还非常高效。

图 3 数据是如何从一个设备搬运到另一个设备上的图3表示了没有GPU-Direct的况下，在OneFlow的Runtime阶段，一个设备上的计算节点如果消费了另一个设备的计算节点，数据是如何搬运过去的。

### 3.4 尽可能并行


在OneFlow的设计中，所有的出发点都是希望可以尽可能并行，从而达到最优的分布式性能。比如考虑到分布式训练模型梯度同步时，显存到内存的传输带宽高于机器之间的网络传输带宽，OneFlow会做两级的scatter和gather操作（本机的和各个机器之间的），用于增加locality，提高整体性能；又比如在异步启动深度学习训练时，python端用户的控制逻辑跟OneFlow运行时的执行图是并行执行的，同时OneFlow有一套互斥临界区的设计保证执行的高效性和正确性；数据加载部分无论是从磁盘读数据还是从python端喂数据，OneFlow都能保证尽可能并行，使得计算设备不会因为要等数据而导致性能下降。已有框架如果想要尽可能重叠数据搬运和计算，一般借助多层回调（callback）函数，当嵌套层次过多时，会遇到所谓的callback hell麻烦，正确性和可读性都可能下降。但在OneFlow中，以上的这些并行并发特性，都是在这一套简洁的Actor机制下实现的，解决了令人头秃的callback hell问题。

此外，在多机的网络通信部分，OneFlow底层的网络通信库原生支持RDMA的高性能通信，也有一套基于epoll的高效通信设计。而目前最流行的Pytorch，多机还需要通过RPC来做数据同步。

四、 Placement+SBP——OneFlow是如何做到分布式最易用的

OneFlow是目前分布式场景中支持数据并行、模型并行、流水并行等最易用的深度学习框架。用户只需要像单卡一样去搭建网络模型，并告诉OneFlow有哪些机器哪些卡，OneFlow就会用最高效的方式把这些机器和设备使用起来。

这源于OneFlow的一套独特的设计：ConsistentView（一致性视角）。对于多机多卡，OneFlow会把它抽象成一个超级大的设备，我们称之为逻辑上的设备，这个逻辑设备的显存是实际多个物理设备的显存之和，这个逻辑设备的算力也是实际多个物理设备的算力之和。用户只需要定义在这个逻辑上的超级设备里，深度学习模型是如何构建的，其余的便不需要用户来操作，由OneFlow来完成逻辑上的设备到物理上的设备的映射。

这里先明确两个概念：“逻辑上的”和“物理上的”。“逻辑上的”表示OneFlow把分布式集群抽象成一个超级计算机之后的计算和数据，“物理上的”表示那些真实的部署到各个机器和设备上的计算和数据。深度学习网络是由Op构成的计算图，Op之间生产消费Tensor数据。在多机多卡的环境下，一个逻辑上的Op会对应多个真实的物理上的Op，每个物理上的Op实际执行的计算都是这个逻辑Op计算的一部分，一个逻辑上的Tensor也会对应多个物理上的Tensor，每个物理上的Tensor都是逻辑Tensor的一部分。

对于其他的框架定义的分布式训练，每张卡是一个“world”，多卡之间根据暴露出来的接口来同步模型梯度；而对于OneFlow而言，多机多卡也都是一个“world”，我们使用一套Placement+SBP的方式做全局的统筹管理。

### 4.1 Placement


在OneFlow的计算图搭建过程中，每个计算Op都有一个属性叫做Placement，表示了该逻辑上的Op，是要部署到哪些机器哪些设备上的。对于常见的数据并行，就是所有的Op都部署到所有的设备上。但OneFlow也支持用户指定Op的Placement，比如当网络过大单卡根本放不下的时候，在OneFlow可以让网络的前一部分在一张卡上，后一部分在另一张卡上，用一种“接力”的方式工作，实现流水并行。

图 4  一个流水并行的Placement示例图图4展示了一种可能的Placement例子。用户定义了一个由3个Op组成的网络：Op_0 -  Op_1 -  Op_2。其中Op_0和Op_1的Placement是Device 0，Op_2的Placement是Device 1，这就是一个流水并行的例子，Oneflow会自动在Op_1和Op_2之间插入需要的数据搬运的Copy Op。

### 4.2 SBP


SBP是OneFlow独有的概念，他是三个单词的首字母组合：Split、Broadcast、PartiaSum（以PartialSum为例，实际上还可以是PartialMin, PartialMax等reduce操作），全称叫SbpParallel，表示一种逻辑上的Tensor跟物理上的多个Tensor的映射关系。其中Split表示物理上的Tensor是逻辑Tensor按照某一维度切分后得到的， Split有个参数axis，表示切分的维度，如果把多个物理上的Tensor按照Split的维度进行拼接，就能还原出逻辑Tensor；Broadcast表示物理上的Tensor是跟逻辑上的Tensor完全相同的；PartialSum表示物理上的Tensor虽然跟逻辑上的Tensor形状一致，但是物理上的Tensor里的值是逻辑Tensor里对应位置的一部分，如果把物理上的多个Tensor按照对应位置相加，即可还原出逻辑上的Tensor。图5展示了SBP的简单示例。

图 5 几种SbpParallel的简单情形SbpSignature是一个SbpParallel的集合，在OneFlow的设计里是Op的属性，它描绘了一个逻辑上的Op被映射成各个设备上的多个物理上的Op以后，这些物理上的Op是如何看待他们输入输出Tensor在逻辑上和物理上的映射关系的。一个Op会有多个合法的SbpSignature，一个最简单的合法signature就是输入输出都是Broadcast，这表示了这个Op需要整个逻辑上的Tensor数据。当用户构建的逻辑上的计算图确定以后，OneFlow在Compiler生成分布式的物理上的执行图时，会考虑每个Op的Placement和该Op允许的合法SbpSignature列表，在其中选择一个传输开销最小的SbpSignature作为本次训练的SbpSignature，用于指导Compiler生成最高效的执行图。

关于Op的合法SbpSignature的列表，我举一个矩阵乘法（matmul）的Op的例子。定义: Y = matmul(A,B) , A, B, Y都是Tensor，表示 Y = AB。那么至少存在两种合法的SbpSignature：

1) Y: Split(0), A:Split(0), B:Broadcast

2) Y: Split(1), A:Broadcast, B: Split(1)

两种合法的signature在两个设备上的示意图如图6所示。假设逻辑上的MatMul的输入输出Tensor的形状是：A(64, 10) X B(10, 50) -  Y(64, 50)。 且该Op分布在两个设备上。在第一种SbpSignature下，0号设备上的A是逻辑上A的前一半，1号设备上的A是逻辑A的后一半（按照第0维切分），而两个设备上的B跟逻辑上的B完全一致，两个设备输出的Y分别是逻辑上的Y的前一半和后一半。同样可以分析第二种SbpSignature。

图 6 MatMul的两种合法SbpSignature值得一提的是，当A是数据，B是模型的时候，第一种SbpSignature就是数据并行，第二种SbpSignature就是模型并行。如果两个相邻的MatMul op，前一个使用第一种SbpSignature，后一个使用第二种SbpSignature，整个网络就实现了混合并行。

图7是一个混合并行的示例，定义了 Y0 = MatMul_0(A0, B0) , Y1 = MatMul_1(Y0, B1)这样一个由两个op组成的计算图，其中A0, Y0, Y1是数据Tensor，B0, B1是模型Tensor。

图 7 混合并行示例在图7中MatMul_0产出的Y0被MatMul_1消费，但是这两个op对同一个Tensor的SBP看待方式是不一样的，MatMul_0认为Y0是Split(axis=0)切分，但是MatMul_1需要一个Broadcast的Y0输入。这时候OneFlow会自动插入一个“万能”的Boxing Op做必要的数据裁剪、拼接、搬运和求和等操作，使得所有的Op都可以在分布式环境下高效的拿到自己想要的数据。

另外在数据并行的时候，训练的前向模型Tensor的是Broadcast，对应反向传播的梯度就是PartialSum，当Optimizer需要全部的梯度来更新模型时，就会触发OneFlow的Boxing机制进行高效的梯度同步工作。

### 4.3 最易用的分布式并行框架


OneFlow的这套Placement + SBP + Boxing的机制，可以使得用户定义的计算图中的Op、Tensor以任意的方式分布在各个机器和各个设备上，无论是数据并行、模型并行还是流水并行，对于OneFlow而言，都只是一个特定Placement下的特定SbpSignature的组合而已，用户可以方便的配置，也可以交给OneFlow来做自动的处理。

另外，早在微软推出ZeRO-2框架之前，OneFlow就已经支持了类似的功能，多机多卡情况下，每个模型Tensor都只保存在其中一个设备上，降低梯度计算中的内存占用。

综上，在编译期，OneFlow通过在一套数学上严谨的形式系统来表示所有合法的并行模式，并支持编译器较方便地自动搜索最优并行方案；在运行期，则通过Actor系统最优地、灵活地支持并行、并发执行。OneFlow的内核具有简洁、高效和高扩展性的优点。

五、 浅谈人工智能和深度学习的未来

OneFlow区别于其他深度学习框架的核心就是对于分布式训练的思考和设计，OneFlow致力于分布式训练最快，且分布式训练跟单卡一样简单易用。为什么OneFlow这么看重分布式的性能和易用性呢？这源于我们团队对人工智能和深度学习的未来的看法。

我们认为随着深度学习的发展，模型会越来越大，训练深度学习模型所需的算力会越来越高，同时模型增大的速度要大于GPU单卡显存扩容的速度；训练对算力的增长要求要大于GPU单卡算力增长的速度。所以分布式深度学习训练会越来越常见、越来越重要。BERT、GPT-3等模型的出现印证了我们的判断。单个芯片的能力总是受到物理约束，我们相信算力增长的解决之道在于横向扩展，而这必须从系统软件的角度去求解，一旦解决，即使是把性能“一般”的芯片互联起来，只要系统软件可以让它们协同工作好，就可以满足任何算力需求。

在分布式深度学习训练中，性能至关重要。我们认为性能和横向扩展性是深度学习框架的核心竞争力。我们在2017年就是这样认为的，也是这样做的，这就是OneFlow这个小团队能存活至今的原因。

私以为，如果深度学习的未来是单机单卡就能搞得定的规模的话，那么深度学习也就只能做做目前已知的一些简单任务，深度学习的浪潮也会褪去。

六、 开源，OneFlow还有很长的路要走

OneFlow的团队是一个小团队，OneFlow作为一个开源框架还有很多不足。我们框架的易用性和完善性跟Pytorch和TensorFlow相比还有一定的差距。我们团队还在努力补上OneFlow的短板，同时也非常需要开源社区的支持。如果以爬山来打比方，OneFlow相当于从先难后易的南坡爬珠峰，其它框架相当于从先易后难的北坡爬珠峰。

OneFlow是独特的，有区别于其他框架的技术路线，如果您也认同OneFlow的设计理念的话，欢迎您来帮助我们一起完善OneFlow。

我们相信，从技术上看，OneFlow 是更接近完美的那一个框架。

七、 写在最后

以上就是我对OneFlow这个深度学习框架的一点粗浅的理解，肯定有很多理解不到位的地方，希望大家批评指正。

附上OneFlow的相关链接，感兴趣的同学可以去关注一下~

OneFlow的代码仓库：https://github.com/Oneflow-Inc/oneflow

OneFlow官网： https://www.oneflow.org/

OneFlow文档：https://docs.oneflow.org/

OneFlow模型库：https://github.com/Oneflow-Inc/OneFlow-Benchmark

成诚

2020/7/28

阅读全文​
​赞同 583​​99 条评论​377 ​82 ​分享