---
title: "如何评价PLUTO编译器？"
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/如何评价PLUTO编译器/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/329294933/answer/718893348"
---


要术甲杰

找不到来时的路

​ 关注

Pluto是众多Polyhedral编译器中应用范围最广、最成功的编译器之一，以该编译器为平台实现的Pluto调度算法代表了Polyhedral model调度最先进的研究水平。Pluto编译器是一个很好的开发程序并行性和数据局部性的优化工具，至于如何好，Pluto编译器的开发者和维护者Uday在他的博士论文中已经做了详尽的解释。这里我想从两个方面佐证Pluto编译器怎么好。 

首先，“A Practical Automatic Polyhedral Parallelizer and Locality Optimizer”这篇论文在Google Scholar中被引用次数超过700次，这个数字和热门领域的高被引文章可能很不起眼，但是Polyhedral model这个圈子一共就那么点人，基本上研究Polyhedral的人都引用过这篇文章，算人均被引的话，这绝对是个很大的数字。第二，这篇文章于2018年被PLDI会议评为十年最有影响力的论文，评语是Pluto调度算法至今在众多领域包括将机器学习算法部署在特定加速部件等方面都发挥着重要作用。所以，Pluto编译器是一个很好的循环优化工具，也是研究Polyhedral model一个很好的平台。 

Pluto编译器的长处不言而喻，但从学习和使用这个编译器角度来讲，我们往往希望从更多的角度来了解这个工具，除了想知道这个工具的好，也想了解这个工具有哪些不足。我之前有使用过Pluto编译器，但是没有在Pluto编译器上进行开发，所以从一个使用者的经验和角度来给出一些评价，如果有不正确的地方，还望了解的同行能够指正。

- Pluto编译器是一个研究型的开源编译器，目前基本上由Uday和他的团队在维护，所以在健壮性上有一定的不足。像Pluto这样的以Polyhedral model构建的编译器一般通过#pragma scop和#pragma endscop来指定需要优化的程序片段，曾经我在这个片段内添加了一段注释的代码，生成的代码居然有问题，不知道这个奇怪的现象现在是否还能复现。 
- Pluto编译器是一个从C程序到OpenMP的source-to-source编译器，并且从发布至今在不断发展，是一个不断发展和改进的工具。这主要体现在两个方面，一个是Pluto不断尝试兼容各种库，包括PIP、isl、pet、clan等等；二是基于这个编译器开发的各种功能、优化技术等都通过在代码仓上创建不同的分支来实现，例如Diamond tiling、Pluto+算法等，并没有合入Pluto编译器的主线分支。
- Pluto编译器是一个试图用调度来解决程序并行化中的尽可能多的优化问题的工具。这个现象主要表现在（1）Pluto编译器本身就是Pluto调度算法的一个实现平台，通过Pluto调度算法来实现程序的并行化；（2）通过调度问题来实现tiling之后tile之间的流水并行问题；（3）通过修改Pluto调度算法来寻找Diamond tiling的形状；（4）利用调度算法来求解图像应用中的Overlapped tiling问题；（5）把array contraction问题也抽象成调度问题；等等各个方面
- Pluto编译器是Polyhedral model领域近几年高水平论文产量最高的一个平台之一，包括在PLDI、POPL、ASPLOS、PPoPP、SC等会议、TOPLAS、TPDS、TACO等期刊上几乎每年都能见到Pluto编译器的出现，而且大部分工作都是这个研究团队独立完成的，近几年Uday也就是与Albert合作得多一点，所以想要做研究的话是一个很好的平台。
- Pluto编译器在早期版本中使用clan解析器，后期加入了对pet的支持。但Pluto编译器，或者说Uday的研究团队，针对non-affine的研究扩展好像比较少。随着Polyhedral model受到越来越多的关注，这种对non-affine支持的需求应该也会越来越多，non-affine最典型的一个应用场景就是稀疏矩阵运算，缺少一些对例如Pencil等辅助工具的支持。
- Pluto编译器支持OpenMP代码生成，但是并不支持CUDA/OpenCL代码生成，这一点是与另外一个编译器PPCG比较而言。PPCG也支持OpenMP的代码生成，但是Pluto编译器生成的OpenMP代码效率更高（至少对Pluto代码仓中examples下面的几个例子是这样的情况），Pluto在自己擅长的领域做到了更好。
- Pluto编译器中没有实现DMA指令的生成。我想这一点也和Pluto编译器想用调度来解决尽可能多的问题的原因相关，调度能够“乾坤大挪移”，却不能“无中生有”，DMA指令的自动生成是原程序中不存在的语句，是需要在生成的代码中“凭空而造”出来的指令。因为要支持GPU上的代码生成，DMA指令的生成不可或缺，所以PPCG支持DMA指令的生成。
- Pluto编译器的代码生成过程中，很少有代码生成fine-tune的选项。我想这是因为Pluto的code generator是基于CLooG的，而PPCG支持一些微调的代码生成选项，比如tiling之后，full tile和partial tile的isolate问题。
- Pluto编译器不支持C99标准的代码生成，也就是说，生成OpenMP代码里面会对一些变量做private等属性的标识。
- Pluto编译器可以开发多粒度的并行性，比如可以将外层的循环做OpenMP标识，而将最内层可以向量化的循环做ivdep和vector always标识，然后再交给基础编译器做进一步的向量化开发。
- Pluto调度算法是通过构建一个cost model来实现调度，这个cost model的建立过程是以开发程序的并行性和数据的局部性为目的。不过，这个数据局部性是指数据的时间局部性，就是生产的数据尽快消费，而没有考虑数据的空间局部性。
- Pluto调度算法本身不支持带有负数系数的skewing变换，虽然后来Uday的团队也提出了Pluto+算法，但是也只是支持最小系数为-4（如果我没记错的话）的skewing。
- Pluto调度算法把循环嵌套抽象成称为band的东西，一个band有n维就表示循环嵌套有n层。Pluto调度算法是试图将变换后的band维度向更高维进行变换，这样就导致了一些循环变换可能在以Pluto调度算法为核心的编译器中很难进行表示。比如loop coalescing或者叫loop linearization的变换，就是那种把两层循环变成一层循环的过程。
- Pluto调度算法在一些情况下会导致过多的冗余计算，例如在PolyMage中利用Pluto调度算法计算Overlapped tiling的形状时，Pluto调度算法计算的是一个梯行的斜边，在多个不同斜率的梯形拼接在一起时，为了保证变换出来的代码正确性，Pluto调度算法必须取最大的斜率，这样就会带来过多的冗余计算。
- Pluto编译器中实现了一种fusion策略，这也是Uday博士论文的一个研究内容，但是这种fusion策略只能是语句的强连通分量SCC级别上进行的fusion，在一些复杂的情况下还需要改进。
- Pluto编译器目前还没有办法直接用于大型应用测试集的优化，这是因为Polyhedral model本身对程序affinity要求而导致的限制。当然，这不是Pluto编译器独有的特征，几乎所有的Polyhedral编译器都有这样的限制（17-20也是）。不过，用这些编译器去优化满足affine约束的热点区域效果还是很明显的。
- Pluto编译器目前只支持C语言作为输入。想要用静态分析来做优化，就要对语言做一定的限制。另外，Polyhedral model的研究还是初级阶，对不同语言的支持还需要更多人的努力。
- Pluto编译器的调度过程对用户来说是一个black box，至少Pluto编译器没有提供一些让用户做选择的调度选项，比如在一些情况下用户不希望做shift，不想要做skewing，等等。
- Pluto编译器中实现了tiling这个被看作是quasi-affine的循环变换过程，但是Pluto编译器解决的是tiling的形状选择问题，而不是size大小选择问题。
- Pluto编译器中不支持带有参数的tiling变换，因为带有参数的tiling变换被认为是non-affine变换。 作为一个编译优化模型，Polyhedral model还有很多的约束，而编程和体系结构开发人员希望编译器能做尽量多的事情，期望太大，导致编译器做优化的时候往往还有很多不如意的地方。Pluto作为Polyhedral编译器的一个典型代表，被越来越多的人关注是契机，也希望无论是上层应用还是下层硬件都能给予以Pluto为代表的编译器更多的宽容，毕竟优化这样的工作也不是一下子就能搞定的。

阅读全文​
​赞同 123​​4 条评论​158 ​18 ​分享