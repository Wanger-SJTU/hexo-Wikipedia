---
title: 深入学习auto vectorization和polyhedral变换方面的优化技术有哪些资料？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/深入学习auto-vectorization和polyhedral变换方面的优化技术有哪些资料/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/65708935/answer/475572657
---


parallelization和vectorization的内容在经典的编译系列丛书中比较难找到，或者即便找到了也和当下在科研前端上的研究热点相比，知识比较陈旧的原因，一方面是时间问题，另一个更重要的原因是这些编译系列丛书是介绍编译程序的整个流程，从前端词法分析、语法分析到中间优化以及后端代码生成。在前端上，很多知识和形式语言与自动机等理论知识密切结合，而parallelization和vectorization这些优化技术主要是编译中间优化环节的研究内容，在龙虎鲸书等经典教材上知识点较少的现象也是情理之中。

那么究竟有没有题主所关心的和这部分内容相关的教材、论文和参考资料呢？答案是<strong>有的</strong>。

### 一. auto-vectorization。

以我自己的经历而言，vectorization部分的工作做得比较少，但是之前我的小伙伴们在这方面做了大量工作，大概了解一些大致的方向和基本的知识点，如果有不正确的地方请批评指正。

- 相比较polyhedral model而言，vectorization是相对成熟的一个技术了。对于经典的vectorization的知识点，Allen和Kennedy的“Optimizing Compilers for Modern Architectures: A Dependence-Based Approach”一书上的内容可以满足最基本的知识点需求。这本书和龙书等系列丛书不同的是主要以优化的角度阐述优化编译器中的内容，其中可以详细了解和学习到经典的vectorization方法。
- vectorization是强依赖于向量加速部件的指令集以及体系结构的特征，向量加速部件的宽度也会影响vectorization的粒度等问题，比如当向量寄存器宽度发生由128位变成256位再到512位等变化时，相应的技术也要跟进。从编译优化角度来讲，依赖关系分析部分肯定是最先实现和完成的，因为后续的优化都要以依赖关系分析的结果为基础，也就是“Optimizing Compilers for Modern Architectures: A Dependence-Based Approach”一书上说的“依赖关系的基本定理”。所以，依赖关系分析对parallelization和vectorization而言比较通用，如果说专门针对vectorization来做的依赖关心分析的话，可能“D-test: an extension to Banerjee test for a fast dependence analysis in a multimedia vectorizing compiler”（IPDPS 2004）算是一个面向vectorization利用依赖距离向量来做的一个针对依赖关系分析的工作。
- 从实现vectorization的方法角度来讲，Larsen和Amarasinghe等人的“Exploiting Superword Level Parallelism with Multimedia Instruction Sets”（PLDI 2000）这篇文章对经典的和他们提出的被称为SLP方法的文章做了比较和总结，SLP相关方法的研究目前还在持续，比如“A compiler framework for extracting superword level parallelism”（PLDI 2012）、“Look-ahead SLP: Auto-vectorization in the presence of commutative operations”（CGO 2018）这些文章还在针对SLP继续做研究。
- 从vectorization的发掘角度来讲，可以是面向循环的，也可以是面向基本块的，也可以是straight-line的，这给vectorization的技术发展创造了很多研究课题。例如对内层循环的向量化“Compiling for vector-thread architectures”（CGO 2008）和对外层循环的向量化“Outer-Loop vectorization—revisited for short SIMD architectures”（PACT 2008）。像SLP技术，你可以把它用于基本块内的向量挖掘。另外还有针对函数级的向量化，如“Whole-function vectorization”（CGO 2011）。另外还有向部分向量化“A Compiler Approach for Exploiting Partial SIMD Parallelism”（TACO 2016）、混合向量化“ Exploiting mixed SIMD parallelism by reducing data reorganization overhead”（CGO 2016）等针对不同对象的向量化发掘方法。
- 对vectorization面临的几个难点问题，也有专门的研究内容，例如向量化对数据的对齐“Vectorization for SIMD architectures with alignment constraints”（PLDI 2004）、“Efficient simd code generation for runtime alignment and length conversion”（CGO 2005）、数据的连续“Auto-Vectorization of interleaved data for SIMD”（PLDI 2006）、“Optimizing data permutations for SIMD devices”（PLDI 2006）、控制流的优化“Superword-Level Parallelism in the Presence of Control Flow”（CGO 2005）、“Introducing Control Flow into Vectorized Code”（PACT 2007）等等。
当然，还有很多其它的相关研究。vectorization是做编译优化部分一个很大的分支，我个人认为vectorization的实现方法部分已经比较成熟了，但是各种复杂情况的处理以及与parallelization的结合等，目前还算是这个方向的难点。另外，“An Evaluation of Vectorizing Compilers”（PACT 2011）对各种vectorization编译器做了一个比较，这个是对此类编译器熟悉的一个很好的入口。

有趣的是，vectorization却一直被polyhedral的研究排除在外，这是因为polyhedral以语句的在一次循环迭代内的一个实例为最小研究对象，所以像“When Polyhedral Transformations Meet SIMD Code Generation”（PLDI 2013）这篇文章在这两个方面的结合上算是比较新颖的一个贡献。或者说，这篇文章给别人的启发是如何在polyhedral优化之后对细粒度的对象进行优化，例如polyhedral做了tiling之后一个tile内的数据局部性的开发，这样也就开启了题主问到的第二个问题——polyhedral的优化。

### 二、polyhedral compilation。

相对于vectorization，我对polyhedral的了解稍微多一些。在介绍polyhedral之前，先说说别的。其实在“Optimizing Compilers for Modern Architectures: A Dependence-Based Approach”这本书上对传统经典的parallelization方法也做了具体的介绍，但是polyhedral却不在该书介绍的范围内。这本书上介绍的parallelization方法可以认为是在抽象语法树AST上进行的各种优化。书里面也介绍了另外一种模型——unimodular matrix，这部分内容可以参考Wolf和Lam的论文“A loop transformation theory and an algorithm to maximize parallelism” （TPDS 1991）和Banerjee的在“Loop Parallelization”一书中的“unimodular matrix”一章。 unimodular matrix简单来讲就是利用矩阵的行列式做初等变换，能够实现interchange、skewing还有reversal（翻译做循环交换、倾斜还有反转）。至于Lam是龙书（第2版之后）的作者之一，而Banerjee最经典的就是他利用中值定理来实现的依赖关系分析方法，这个在比较经典的编译器中都可以找到对应的算法。

Unimodular matrix后来没有像polyhedral一样被大量研究，主要是后来polyhedral的崛起。polyhedral compilation的研究内容分为依赖关系分析、调度变换和代码生成几个部分。当然，在做这些之前，polyhedral需要用一个parser来做解析，现在比较常用的parser是pet（“Polyhedral extraction tool”（IMPACT 2012））还有clan。polyhedral涉及到的工具及其链接大部分可以在polyhedral.info这个网站上找到。

- 现在的polyhedral研究大多被认为是由Feautrier针对数据流分析的工作“Dataflow analysis of array and scalar references”（IJPP 1991）奠基而来的。数据流分析的优势在于把依赖关系分析的粒度从语句细化到语句的实例，所以结果比传统的依赖关系分析结果更精确。但是在polyhedral里面的依赖关系分析，我并不会推荐去读这篇文章，因为这篇文章 比较难懂，我更推荐去看Pugh的“The Omega test: a fast and practical integer programming algorithm for dependence analysis”（ICS 1991）这篇文章，这篇文章对polyhedral的思维构建很有帮助。当然，Omega本身后来也变成了一个求解线性整数规划ILP问题的一个求解器，也可以找到这个ILP solver的库。关于ILP求解器的库有很多，比如Omega还有现在比较流行的isl。Pugh在Omega test的基础上还把依赖关系分为value-based和memory-based两种依赖关系，这个为polyhedral里面的scheduling算法在优化和正确性方面提供了很多支持。
- polyhedral的scheduling算法也是Feautrier最先实现的，可以参考“Some efficient solutions to the affine scheduling problem. i. one-dimensional time”（IJPP 1992）和“Some efficient solutions to the affine scheduling problem. part ii. multidimensional time” （IJPP 1992）这两篇文章。这个scheduling算法是90年代出提出来的，不适合于现在的多核架构，所以后来像Lim和Lam又设计了一种考虑通信代价的scheduling算法“Maximizing parallelism and minimizing synchronization with affine transforms”（POPL 1997）。但是这些方法都没有让polyhedral真正成功。现在大部分的polyhedral算法是Bondhugula的pluto算法“A practical automatic polyhedral parallelizer and locality optimizer”（PLDI 2008），这个算法是真正让polyhedral前后贯通的一个scheduling算法。如果对scheduling算法感兴趣，我会建议去阅读pluto算法或者Bondhugula的博士论文“Effective Automatic Parallelization and Locality Optimization using the Polyhedral Model”，这个算法也是Pluto编译器的核心。Bondhugula对scheduling算法后续做了许多优化和提升例如Pluto+，这部分可以参考他的个人主页。
- polyhedral的代码生成工具主要有CodeGen+，“Code generation for multiple mappings”（Frontiers 1995）和CLooG，“Code generation in the polyhedral model is easier than you think”（PACT 2004）两个工具。CodeGen+部分主要是在Omega库里使用，而CLooG和CodeGen+的代码生成方式有一些不同。这两篇文章都值得去看一下，了解一下如何生成代码。不过，“Polyhedral AST generation is more than scanning polyhedra”（TOPLAS 2015）这篇文章我建议对AST生成部分有兴趣的话可以仔细阅读一下，这个长达50页的文章系统地介绍了如何生成循环的边界、控制流条件语句还有避免代码膨胀等问题。Feautrier在代码生成方面也做了一个代码生成器，不过没有实际用起来。但是CLooG的开发者和维护者是Feautrier的学生。
- 而在挖掘局部性方面，polyhedral主要使用的是tiling还有array contraction两种手段，这两种技术可以在Lim和Lam的文章“Blocking and array contraction across arbitrarily nested loops using affine partitioning”（PPoPP 2001）中了解到。tiling在pluto算法实现之后，在polyhedral里面的研究成为一个热门研究方向，像“Effective automatic parallelization of stencil computations”（PLDI 2007）、“Diamond tiling: Tiling techniques to maximize parallelism for stencil computations”（TPDS 2017）这两篇文章都是polyhedral里面tiling研究很好的入门文章。还有在“Hybrid hexagonal/classical tiling for GPUs”（CGO 2014）这篇文章主要是面向GPU代码生成的tiling技术，在另一个编译器PPCG里面进行实现的。PPCG是一个面向CUDA/OpenCL的polyhedral编译器“Polyhedral parallel code generation for CUDA”（TACO 2013）。
- 相对于tiling，array contraction方面的研究显得比较理论，这部分晦涩难懂，不过目的就是为了节省存储空间。这部分的话，“Lattice-Based memory allocation”（TC 2005）和“SMO: An integrated approach to intra-array and inter-array storage optimization”（POPL 2016）可以考虑阅读一下，不过抽象程度高，文章的描述都不是很好懂。SMO的话如果读懂了pluto算法应该还好理解一点。
- 至于polyhedral的扩展和其它方向的结合，内容就比较多了。从loop fusion（翻译为循环合并）“A Model for Fusion and Code Motion in an Automatic Parallelizing Compiler”（PACT 2010）、迭代编译“Iterative optimization in the polyhedral model: Part I, one-dimensional time”（CGO 2007）、“Iterative optimization in the polyhedral model: Part II, multidimensional time”（PLDI 2008）、到MPI代码生支持“Compiling affine loop nests for distributed-memory parallel architectures”（SC 2013）、“Distributed memory code generation for mixed irregular/regular computations”（PPoPP 2015）、稀疏矩阵向量运算“Non-Affine extensions to polyhedral code generation”（CGO 2014）、“Loop and data transformations for sparse matrix code”（PLDI 2015）、高层次综合“Theory and algorithm for generalized memory partitioning in high-level synthesis”（FPGA 2014）以及动态扩展和优化“Compiler/Runtime framework for dynamic dataflow parallelization of tiled programs”（TACO 2015）、“PolyCheck: Dynamic verification of iteration space transformations on affine programs”（POPL 2016）等等各个领域，这个就可以针对不同的领域进行跟进学习。最近polyhedral方向比较热门的是与DSL（domain-specific language）的结合，比如与Halide（“Halide: A Language and Compiler for Optimizing Parallelism, Locality, and Recomputation in Image Processing Pipelines”（PLDI 2013））结合的PolyMage框架“PolyMage: Automatic Optimization for Image Processing Pipelines”（ASPLOS 2015），还有Cohen团队与Facebook合作刚发布的TensorComprehensons架构“[Tensor comprehensions: Framework-agnostic high-performance machine learning abstractions](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1802.04730)”（axiv 2018），把polyehedral和深度学习结合起来了，非常值得学习和使用。

送礼物

还没有人送礼物，鼓励一下作者吧

[发布于 2018-08-22 23:38](//www.zhihu.com/question/65708935/answer/475572657)

​​506 ​50 ​分享

​​

收起​
