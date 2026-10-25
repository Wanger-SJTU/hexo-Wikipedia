---
title: "(2 条消息) 菜鸟读flash attention-序"
date: "2025-06-23 00:00:00"
updated: "2025-06-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/菜鸟读flash-attention-序/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1920426925765145060"
---


年初deepseek的风也吹到了我，从内核转过来做GPU本来就是一个挑战，看算法是想都没敢想。但是，ds让我做了个梦，对，就是白日梦。

做过cpu上高性能编程都知道避开内核一些调度事件一直占着cpu才能保证RT。谈到throughput就是另一回事，让系统上尽可能繁忙起来从成本上讲是对的，但是从任务角度看就不一定。排队的人多了，保证RT就不是简单事情，这就有了SLA，Qos这类话题。cpu上通过堆任务提高throughput这类实践有个好听名字叫做colocation，本质上是”既要又要“。cpu上堆任务，要想实现”既要又要“，自然要引入应用/业务视角的优先级，而且需要隔离（isolation）一些common path，让高优走fast path。这在生活中也常有类似例子，迪士尼和环球影城的fast path[坏笑]

第一篇属于闲扯，其实我是想说cpu跟GPU计算模型差异很大，把cpu经验搬过来是很困难的。cpu谈到调度就想掌控rq，把自己的任务挂到rq头部去。GPU通过硬件堆叠来实现并行计算提高throughput，本质上SIMD或者大量数据上可以进行类似计算。一般服务器cpu核心数是100-200水平，GPU的核数是远远大于这个数字的，可以类比数字是sm个数。

cpu（比如intel）提供任务（可以理解thread）在cpu上下文，内核基于此进行任务切换。了解过GPU上kernel提交过程就会知道，提交的单位是任务（kernel），提交之后剩下事情是GPU硬件来处理，直到kernel运行完，kernel产生的数据才可以访问。为什么不能像cpu那样把SM接口export出来呢？除了保护硬件细节因素外，cpu上一个task_struct表达代码段（逻辑）是不同的，一个进程里不同的线程代码段往往是不同的，不同进程情况就更不用说了。因为代码段不同，cpu通过任务调度实现不同任务交错占用cpu方式，如果希望保证高优任务RT需要在task preemption加额外处理。所以，cpu调度核心就是任务切换，colocation场景里提高throughput是目标但是RT才是底线。回到GPU话题，GPU上运行的kernel代码段可能是非常相似，尤其单机推理场景，经典方式就是vllm+flash attn，GPU上运行主要是cutlass生成的kernel。问题焦点从让谁（cpu）运行，来到了快点跑（无论提供什么样的async方案，数据本身依赖关系必须维持），一个kernel运行时间越短它生成数据才能越早被使用。所以，GPU从来都是throughput问题。

如何有效利用GPU呢？听了gtc关于tensor core，cp.async，TMA和cutlass一些talk，我注意到cutlass大佬喜欢用一个我在做存储时候经常听到词replicate。既然GPU提供硬件资源是堆叠的，运行的代码段是非常相似的（为什么不说相同呢？warp的thread有自己的pc，存在warp divergence和warp specialization），我们要做就是把数据分发到不同的core (这里说的还只是cuda core)，让每个thread处理自己负责的数据。Easy！分发这个事情交给硬件做更合适也更高效，应该没人想修改分发或者映射策略吧。

我最初是想做驱动的，只需要看懂cuda-samples例子。那时候觉得我好像会cuda编程，看了flash attn（v1）代码发现原来会的那点啥也不是[泪]。随便举个例子，kernel用>>告诉GPU gridDim，blockDim，shared memory和stream信息。stream是cpu跟GPU同步一个媒介，借助了hardware semphore，跟kernel执行的线程化部分没有关系，其他三个告诉GPU硬件调度器kernel执行时候如何把任务切分：1）线程化把任务拆分成一系列theadblock，为threadblock分配SM；2）把threadblock执行提交到warp scheduler（SM subpatition）；3）warp scheduler选择active warp进行执行。过程比较清晰，容易理解。

但是，我们说的核（cuda core）到底是什么呢？我为什么要问这个，嘿嘿。

cuda core编程比较简单，kernel函数一定会计算。很多指令的操作数都只支持寄存器寻址，虽然我们写的程序都是处理显存，编译过程就分配寄存器。cuda core编程时候，SM内可以共享shared memory，但是默认线程寄存器是私有的。了解tensor core之后，发现volta里面tensor core寄存器在quad pair（NV文章叫法）维度共享，ampere之后warp维度共享。参看[reed大佬回答](https://www.zhihu.com/question/587780273)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f74cd0d6201a.jpg)

但是有个问题：ldmatrix访问寄存器。

ldmatrix指定是每行的地址，以每个线程方式指定。从PTX汇编指令的字面意思和引起smem bank conflict例子看，每个线程执行的是一个向量化加载，只不过这条指令执行的结果吐给了连续的四个寄存器（quad）。这里有点绕。因为mma，ldmatrix都是warp级别指令，而且shared memory有boardcast能力，前面理解纯粹个人yy，找不到印证。如果我理解是对的，读部分（smem读），写(register写)和线程laneid之间关系有可能跨越quad pair。ldmatrix在volta架构就是支持的，是如何实现跨越quad呢？这个问题困扰我好几天，最后得到一个解释ldmatrix是访存指令，本身可以访问任何可见的寄存器，它跟mma是配合关系，把数据搬运到tensor core硬件指定好的寄存器里。我们说的cuda core一般是指ALU或者FMA，cuda代码线程和register关系是编译时候映射的，只要硬件LDST可以寻址，编译器支持就是可以的。

如果是fp16或者bf16，一个mma矩阵运算需要的矩阵a和矩阵b关系如下图。矩阵a分成四组，组内是行序，组之间是列序。（0，0），（8，0），（0，8），（8，8）就是ldmatrix.x4加载结果。网上例子有人是用ldmatrix.x2来加载b的，有的还用了转置（如果之前是行序）。

在flash attn v1中，a和b都是用ldmatrix.x4加载的。b本身是列序不需要转置，（0，0），（1，0），（8，0），（9，0）。区别是smem_read_offset_计算不同，a是Smem_tile_row_a，b是Smem_tile_col_b。v1是手搓kernel，swizzle是smem_write_offset和smem_read_offset计算实现的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1869540cb0b5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_01dfda3aab38.jpg)

关于tensor core有篇非常厉害文章Modeling Deep Learning Accelerator Enabled GPUs，利用分析PTX汇编对应的SASS汇编和修改部分寄存器的值，把每个线程寄存器持有的数据和tensor core架构图推测出来。

NV有篇论文印证了寄存器映射关系，Graphene: An IR for Optimized Tensor Computations on GPUs

其中，thread group: NV论文中的quad；octet: NV论文的quad pair

这个图有点缺陷，octet2和3中lane id标错了（我觉得哈），Efficient Tensor Core-Based GPU Kernels for Structured Sparsity under Reduced Precision有个几乎一样的图figure 1[大笑]，可以对照看。

右上角的这个小图就是浮点点乘组件，可以分解成几个FMA。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_58e15b129099.jpg)

上面是tensor core架构图，比如a100一个SM 4个partition，每个partition 2个tensor core。这组合起来的算力如何利用？上文提及NV大佬喜欢用replicate，hardware调度器通过给thread block指定SM把计算任务分布到SM上，SM的warp scheduler选择一个warp来运行。假如做GEMM计算, 每个tensor core都在做矩阵乘法，这就形成了replicate。跟指令执行SIMD类似，这是warp层之上的在spatial方向是扩展。

那时间维度呢？

首先cuda的threadblock是out of order执行的，在hopper之前没有分布式shared memory大部分是SM内部通过smem通信。我们都知道，thread block不能跨SM，但是SM里面可以包含多个thread block。除非通过cooperative group接口把thread block绑在一起调度。

时间维度呢，1）thread block之间的independent执行。2）在flash attn（应该所有版本都是这样，我只看了v1），tiling时候是做个对齐Bc（key），Br（query)切分分成了多个iteration。虽然是同一个thread block中运行，不同的iteration里面的GEMM发生在不同时间段，这也是时间维度扩展。