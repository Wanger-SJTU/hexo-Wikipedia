---
title: Triton学习笔记
date: "2023-12-14 00:00:00"
updated: "2023-12-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Triton学习笔记/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/672086654
---


<strong>备注：</strong>比较好奇`Triton`和`TVMScript`优缺点。同时，我们组之前魔改过`TVMScript`，自己也试着用魔改的`TVMScript`写过简单算子。梳理一下`Triton`，理解我们组做到那种程度，以及可能遇到有那些瓶颈。<strong>实践经验少，有理解错误的地方，烦请指正。</strong>

### 相关背景介绍

#### 架构

从GPU到TPU再到DSA，现在机器学习硬逐渐向多核异构方向扩展。个人感觉很难用传统方法，定义区分某个加速部件是某硬件是独有的，因为现在的硬件在功能设计时是相互借鉴，交叉发展的。比如，GPU上某个功能模块, 可能某种DSA上也存在类似模块，只不过功能和性能会有所差异，但它们的设计思路有很多相似地方，追其本质都在解决同一类问题。

<strong>DSA</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8f281b20ffde.jpg)

图片来源：https://www.usenix.org/conference/osdi23/presentation/zhao 图中的DSA架构中由多核核组成，通常一个核内由多个计算单元组成，比较常见的<strong>计算单元</strong>有向量（`vector`）、标量（`scalar`）、张量（`cube`）单元，还有一些数据搬移部件。通常DSA由多个核组成，当核数量达到一定数量后， 就需要考虑可扩展性问题。一般将几个核组成组成一个大的单元，这个单元叫**`cluster`**，然后通过互联操作，把其它`cluster`之间连起来。`cluster`内部一般是由一块` Memory` 作为<strong>内存共享</strong>，多个核可以访问这块共享内存。有些架构里把这个`Global Memory`成了`cache`。<strong>数据搬移部件DMA,</strong> 可以把DSA内部数据，搬运到外部的DDR，然后再通过`PCIE`等，传输到外部机器上。国内具有代表性的DSA是华为达芬奇 slide: [DaVinci: A Scalable Architecture for Neural Network Computing ](https://link.zhihu.com/?target=https%3A//pdfs.semanticscholar.org/4ca3/69ee20343433bd50c288c01ebcba2d6a03b2.pdf), paper: [Performance modeling on DaVinci AI core](https://link.zhihu.com/?target=https%3A//www.sciencedirect.com/science/article/abs/pii/S074373152300014X) 

<strong>GPU</strong>

关于GPU的资源，网络有很多资源，可自行检索总结。因为我是GPU小白，先对整体架构理解一下。该章节内容和图片来自于官方 [CUDA C++ Programming Guide](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/cuda-c-programming-guide/index.html)。

**任务映射到`Thread Block`** 

在GPU上，`Kernel`程序的执行是通过将任务划分为多个`Block`来实现的。流程如下：

- **`Kernel` ：**表示并行执行的任务，是程序员编写的代码。这段代码被设计为在大量`Thread`上执行相同的操作。
- **`Block`：**GPU将`Kernel`中的任务划分为多个`block`，在每个`block`内，包含大量的`Thread`。这些`Thread`以并行的方式执行`Kernel`中的代码，每个`Thread`处理不同的数据。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_64118c074b8d.jpg)

将Kernel的处理任务划分到多个Block图片来源：[https://www.nvidia.cn/docs/IO/51635/NVIDIA_CUDA_Programming_Guide_1.1_chs.pdf](https://link.zhihu.com/?target=https%3A//www.nvidia.cn/docs/IO/51635/NVIDIA_CUDA_Programming_Guide_1.1_chs.pdf)

**`Thread Block`映射到`Grid`** 

- **`Grid`**：将所有`Thread Block`组成一个`Grid`，形成一个二维或三维的结构。`Grid`是`Thread Block`的集合，它表示整个GPU执行任务的范围。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_28e11a3de7a6.jpg)

所有Thread Block组成一个GridGPU调度器将`Grid`映射到GPU处理器上，确保每个`Thread Block`都有对应的处理资源。

**`Grid`划分为`Grid with Cluster`** 

- 在一些情况下，为了更好地管理资源，Grid可能被进一步划分为`Grid with Cluster`。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c26511c84ed2.jpg)

每个Cluster包含多个Thread Block Cluster**`Grid with Cluster`映射到`SM`** 

**`SM（Streaming Multiprocessor）`**：每个SM是GPU的一个处理单元，其中包含若干`Thread Block Cluster`。`Thread Block Cluster`在SM上执行。

**`Memory`结构**

**`Thread Local Memory`** 

**`Local Memory`: **是指每个Thread私有的内存空间，用于存储局部变量或数组等线程私有的数据。在不同的`Thread`间不共享，每个线程都有自己的局部内存空间。

**`Thread Block Share Memory`** 

**`Share Memory`: **在Thread Block内，每个`Thread Block`共享一块`Share Memory`。`Thread Block Cluster`内的`Thread Block`之间可以通过共享内存进行通信和数据共享，但是开销会比较大。

**`SM Global Memory`** 

**`Global Memory`: **在整个流程中，数据的存储仍然可以使用`Global Memory`。`Global Memory`对于整个`Grid with Cluster`都是可见的，因此可以在不同的`Thread Block Cluster`之间进行数据交换和共享。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_525f4b654365.jpg)

                                             不同计算组织和层次结构的Memory范围

A100`是面向`CTA`编程，`H100`是面向`CGA`编程，下一个章节会介绍。

**`SM`间任务切换**

在整个任务执行过程中，GPU调度器可能会进行SM之间的任务切换，确保每个SM都有任务执行，以充分利用GPU的计算资源。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_49df849c5c28.jpg)

其实关于GPU衍生出一些容易混淆的理解，详细可以阅读  [SIMT、SIMD和DSA（1）](https://zhuanlan.zhihu.com/p/562135333)、[总体流程设计（1）-CUDA程序的等级结构](https://zhuanlan.zhihu.com/p/129375374) 。

#### 编程模型

wiki上这样解释, [link ](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E5%25B9%25B6%25E8%25A1%258C%25E7%25BC%2596%25E7%25A8%258B%25E6%25A8%25A1%25E5%259E%258B)

*在*[计算机科学](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E8%25AE%25A1%25E7%25AE%2597%25E6%259C%25BA%25E7%25A7%2591%25E5%25AD%25A6)*中，*[并行编程模型](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E5%25B9%25B6%25E8%25A1%258C%25E7%25BC%2596%25E7%25A8%258B%25E6%25A8%25A1%25E5%259E%258B)*（`Parallel programming model`）是*[并行计算机](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E5%25B9%25B6%25E8%25A1%258C%25E8%25AE%25A1%25E7%25AE%2597)*架构的*[抽象化](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E6%258A%25BD%25E8%25B1%25A1%25E5%258C%2596_%28%25E8%25A8%2588%25E7%25AE%2597%25E6%25A9%259F%25E7%25A7%2591%25E5%25AD%25B8%29)*，通过它可方便的表达*[算法](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E7%25AE%2597%25E6%25B3%2595)*和它们在*[程序](https://link.zhihu.com/?target=https%3A//zh.wikipedia.org/wiki/%25E8%25AE%25A1%25E7%25AE%2597%25E6%259C%25BA%25E7%25A8%258B%25E5%25BA%258F)*中的合成。*

个人理解，编程模型是一种根据硬件架构的<strong>程序等级结构</strong>，也是一种描述计算机程序抽象概念，它规定了程序员在编写程序时应该如何组织和思考代码。 编程模型提供高级别的抽象，而AI编译器在更低层次上优化这些高级抽象，以获得更好的性能。

#### AI编译器

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_819f3c04dc1a.jpg)

                         图片来源：[https://www.bilibili.com/video/BV17C4y1a74c/](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV17C4y1a74c/)

编译器是一个很大的话题，文章提到的编译器主要指AI编译器，关于AI编译器解读博客和文章有很多，概述性的可以阅读 [The Deep Learning Compiler: A Comprehensive Survey](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2002.03794) （[https://arxiv.org/abs/2002.03794](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2002.03794)）。AI编译器通常使用分层抽象来描述神经网络的计算过程。同时，分层抽象可以帮助编译器有效地处理网络结构、优化计算和生成高效的代码。

<strong>分层抽象</strong>

通常听到`Block`、`Layer` 和 `Stage` 这些术语。这些术语在不同领域、不同使用者的角度有不同解释。比如：以经典的`ResNet50`网络结构解释为例，算法研究员和AI编译器开发者的角度出发。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1438debc0f14.jpg)

图片来源：https://www.usenix.org/conference/osdi23/presentation/zhao名称算法研究员AI编译器开发者GPU硬件Layer通常指网络模型中的一层。这一层可以是卷积层、池化层、全连接层、池化层等。深度学习模型往往是由多个层组成的，每一层都执行一些特定的操作是一种Low-Level Abstraction，对网络计算过程进行细粒度划分的层次。通常由一组OPs组成，这些OP在计算上相对独立且可以并行执行。Low-Level 抽象可以帮助编译器在处理网络时实现更细粒度的优化和并行化，比如：循环优化、内存复用等局部运算调度Block通常指是网络的组成单元，它可以是一个层（layer）或多个层的组合。比如图中的block由包含卷积层、池化层、激活函数等，形成一个模块化的结构，方便网络的设计和管理是一种Intermediate Block Abstraction，对网络中的Block进行抽象和描述。Block通常由有多个Layer组成，这些Layer在功能上相互关联。Intermediate Block Abstraction可以将这些Layer组织在一起，以便在编译器中进行更精细的优化和调度，比如fusion操作在GPU中，Block是一组Thread的集合，这些Thread可以在同一个Block内进行协同工作。每个Block中的线程可以通过共享内存进行数据交换和协作Stage指将神经网络划分为不同的计算阶段或阶段性的处理过程。每个阶段可以由一个或多个block块或layer组成。一个阶段的输出通常成为下一个阶段的输入。通过将网络划分为stage，可以更好资源管理和分配，运用一些优化技术是一种High-Level Abstraction，用于描述神经网络的整体结构和计算过程。它将网络表示为一系列层的组合，每个层包含不同的OP和相应参数。高级图层抽象提供了一种更高层次的抽象，编译器可以对全局的数据流分析，以及跨Layer的调度现阶段针对深度学习编译器不同层次的抽象和DSL有多种，感兴趣可以阅读 [AI Compiler研究的分层设计 - Compiler Hierarchy](https://zhuanlan.zhihu.com/p/599134866) 、[(二)大话深度学习编译器中的自动调优·DSL与IR ](https://link.zhihu.com/?target=https%3A//jinzhuojun.blog.csdn.net/article/details/124760878)。

### Introduce

#### efficiency and performance

CUDA`好比单反相机，里面有各种专业模型和功能，用户可以更细粒度的功能，`Triton`更像是智能手机，它封装了单反相机的功能，操作简单，但存在效果比专业单反差的问题。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0aed17335a30.jpg)

**`CUDA`** 

- 直接控制GPU细粒度的`Thread`行为
- 用户有很多可以调控的地方，甚至通过微调可以达到一种比较极致的效果
- 它可以适用各种场景，但是相应的代价是用户需要长时间的学习和培训，才能掌握这些调控的技巧
- 即使已经学习了一段时间之后,也需要去投入大量的开发时间和精力， 才能写出性能比较好的代码。
- CUDA编程存在较高的上限界和较低的下限：对于比较熟悉CUDA的用户,使用CUDA可能获得比较极致的性能。但是不熟悉CUDA的用户，往往能写出来的代码，都不太容易达到比较高的性能。
<strong>Triton</strong>

- 不是直接面向`Thread`编程,它是面向更粗粒度的`Thread Block`编程
- 控制整个`Thread Block`的行为，类似一个tile编程。具体每个Thread 的行为由Triton后端自动做决策，用户不需要操心，编译器的优化程度取决于block level级别的处理
- 较高的下限和较低的上限：使用`Triton DSL`语言，能够开发出性能不错的`Kernel`。但要在性能上达到极致，有一定的难度，需要在开发效率和性能之间做权衡。优点是对于不熟悉CUDA的开发者，短时间可以开发`Kernel`，但存在：（1）不适用于对要求更高的高端用户；（2）峰值性能受限；（3）仅适用于特定领域，这些缺点。

#### efficiency and flexibility

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2c260e1cc255.jpg)

- 开发效率，自低向下依次增加；灵活性，自顶向下依次增加
- CUDA和PTX编程直接面向Thread编程，用户需要考虑的因素很多。例如：各个层级的分块策略、数据重用、`Share memory`的`bank`冲突、向量化访存
- `Triton`面向Thread Block编程，也`CTA`编程的范畴。使用Triton编程用户需要关注：(1）`Kernel launch`的一些参数；(2）每个`CTA`分块的大小，也叫`CTA Tiling`；(3）`CTA`之间的交互。`CTA`往下部分都是`Triton`帮忙做，CTA往上都需要用户参与。这样既保证了编程一定的灵活性，又将硬件大量的细节隐藏起来。
这里缺少Triton支持静态shaped的介绍，具体可以看看多年前Triton作者reddit帖子 [link](https://link.zhihu.com/?target=https%3A//www.reddit.com/r/MachineLearning/comments/otdpkx/n_introducing_triton_opensource_gpu_programming/)                         """Triton basically aims to be a simpler, open-source version of CUDA-C. Compute kernels are written in a single-threaded C-like language in which statically-shaped arrays are first-class citizen rather than just pointers to contiguous regions of memory (tutorial here). As a consequence, programmers don't have to worry about simultaneous multi-threading, shared memory, tensor cores, etc; the compiler will figure all of this automatically."""                                                                                                  Triton对静态shape处理比较友好，可以称为一等公民，而不是仅仅作为指向内存连续区域的指针。（不是很理解这种翻译，直到官网找到 [https://github.com/openai/triton/blob/main/docs/programming-guide/chapter-1/introduction.rst](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/main/docs/programming-guide/chapter-1/introduction.rst)）
####  product positioning

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_af805b77d1b2.jpg)

- `Python-like`:`Triton`有`Python bounding`和`Python的API`，对`Python`的用户是很友好的。
*个人经验，看着接近Python语言，`Python`有些高阶的语法还是不兼容的*

- 面向`Programming for CTA`编程：将`Kernel`大量的细节隐藏起来
- `Automatic backend`: Triton的后端会自动调节这些细节，得到一个性能还不差的结果。比如图中用大概10行代码在GPU上实现`ADD`算法

### Motivation

#### Triton supports hopper for performance with limited additional complexity

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_77784b0ef9b1.jpg)

- 基于Hopper架构的H100相比于基于Ampere架构的A100，性能有较大提升

### New features & API Changes

#### New features of Hopper

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1e70d2ec32a6.jpg)

- 还是要提一句，Triton设计的初衷还是是面向CTA编程
- Hopper新架构主要特点
- 编程模型：Hopper架构扩大了编程模型，它在`Thread Block`上面增加了一层`Thread Block Cluster`，又被称为` CGA`编程。
- 内存层级：同一个`Thread Block Cluster`中的多个`Thread Block`可以互相访问它们的`Shared memory`，这些`Shared memory`被称为`distributed shared memory`。
如果Triton在Hopper上还是面向CTA编程的话, 就需要将CGA到CTA这一层的分块策略、访问`distributed shared memory`细节暴露给用户，这样会明显增加用户的开发效率， 这个也就跟Triton本来的设计初衷相去甚远。NV为了跟Triton的设计初衷保持一致，即用户不用关注分块策略等硬件细节操作。

- Hopper架构上Triton编程模型变化：从面向`CTA`编程变成面向更粗粒度的`CGA`编程，也就是说用户写的一个`tile`实际上是对一个`Thread Block Cluster`所要处理的`tile`。分块策略、`distributed shared memory`访问对用户来说是隐藏的 。

#### New API for CGA programming

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_85cede3f9643.jpg)

`先了解一下GPU硬件结构和参数设置，再看Triton接口理解可能更容易一些`

- Hopper架构上Triton编程模型有一个变化，从面向CTA编程变成面向更粗度的CGA编程， 也就是Hopper架构上的一个Tile数据，实际上是一个`Thread Block Cluster`所要处理的Tile。
- 为了将CGA到CTA的分块策略，`Distributed Shared Memory`这些细节都对用户隐藏起来，前端API接口做了改动。
- `num_ctas`参数：用户仅需要指定每一个`CGA`中包含多少个`CTA`，Triton来自动决定`CTA`在`CGA`中的排布细节。
- `triton.Config` : Triton提供的一个`Auto-Tune`性能结构, 通过用户配置的不同参数，对一个`Kernel`都可以`Tune`, 然后由Triton的`Runtime`自动选一个性能最好的Kernel去执行，`config`配置参数，参见[https://triton-lang.org/main/python-api/generated/triton.Config.html](https://link.zhihu.com/?target=https%3A//triton-lang.org/main/python-api/generated/triton.Config.html)

#### TMA Multicast and Asynchronous Transaction Barrier

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_adf72aaeb8fa.jpg)

- 编程模型变化：`CGA`到`CTA`的编程模型
- 添加了大量的异步指令：相比于Ampere架构上的异步内存拷贝指令 ，比如`LDGSTS` 
- 添加了一个TMA硬件单元：

- TMA <strong>自动生成内存拷贝所需要的地址信息</strong>, 从而减少`Thread`的寄存器压力。Hopper之前的架构地址信息需要软件自己计算出来，再去做内存拷贝。
- TMA 可以做<strong>自动越界处理</strong>，甚至还可以做一些简单的地址映射，进一步减少加载数据和数据前处理所需要的时间
- TMA还**支持多播（`multicast`），**即TMA取一份数据,可以将这份数据多播到一个`CGA`内部的一个`CTA`或者多个CTA的shared memory，方便多CTA数据复用 

- `asynchronous transaction barrier`，为了适配这些一步指令，`Hopper`添加了`asynchronous transaction barrier`指令。在Ampere架构上，Barrier的线程需要去空转或者盲等，而且这些线程还会消耗一些硬件资源。Hopper架构上`M-Barrier`的这些线程实际上是休眠的状态，可以减轻一些硬件的压力。

- 等待数据量相同的情况下，多个TMA操作 可以共享同一个`M-Barrier` 
- `M-Barrier`是开辟在`Share memory`中，我们就可以用它做跨`CTA`的同步，这里的`CTA`是同一个`CGA`中的`CTA` 

- Hopper架构中文资料解读，可访问这篇[ 对NVidia Hopper GH100 的一些理解](https://zhuanlan.zhihu.com/p/486224812) , 英文原版白皮书 [NVIDIA H100 Tensor Core GPU Architecture](https://link.zhihu.com/?target=https%3A//www.hpctech.co.jp/catalog/gtc22-whitepaper-hopper_v1.02.pdf) 
看到这里越发觉得现代的异构计算硬件设计是相互借鉴的，存在某种硬件设计的功能在GPU上性能表现比较好，但在另一种异构计算系统上，性能不一定被很好的发挥出来。当然也跟前期异构计算硬件的整体架构、软件生态、资源分配有关系。太湖之光超算机器也做了Hooper架构类似的功能，多个核可以访问一块 Global Memory, 功能和性能肯定达不到NV这么强大，感兴趣可以看论文[ BaGuaLu: Targeting Brain Scale Pretrained Models with over 37 Million Cores](https://link.zhihu.com/?target=https%3A//keg.cs.tsinghua.edu.cn/jietang/publications/PPOPP22-Ma%2520et%2520al.-BaGuaLu%2520Targeting%2520Brain%2520Scale%2520Pretrained%2520Models%2520w.pdf)--章节3 SystemArchitecture
#### New load/store APIs for TMA

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_beffa4c66e06.jpg)

- 如果要在Hopper架构上使用Triton，建议大家还是尽可能去使用新的API，因为旧的API功能上虽然是对的，因为没有办法用到`TMA`，性能可能会差一些 。

#### New API for Automatic Warp Specialization(Preview)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ef18df44f00.jpg)

为了将数据搬运和并行计算的时间相互抵消,尽可能逼近硬件理论峰值性能。引入Warp Specialization优化。

- 自动`Warp Specialization`优化：

- NV对`Warp Specialization`的优化是Triton可以自动去划分各个线程群。
- `Warp Group`的概念：一个`Warp Group`里面是4个`Warp`，每个`Warp`是有32个线程，所以一个`Warp Group`里面是128个线程

- `Warp Group`流程解释

- `Warp Group1`负责前处理，`Prelogue`一般是`load`数据 然后做一些简单的数据前处理；
- `Warp Group2`和`Warp Group3`都是负责计算，`Warp Group2`和`Warp Group3`的`Math`和`Epilogue`是交替执行，尽可能用流水线堆叠起来，从而减少最终的执行时间 
- 目前，`Work Specialization`还在开发中，性能上还没有调到最优，将`enable_warp_specialization`设置为`True`，就能调用`Work Specialization` 

#### How to use

- Triton调用Hopper架构的架构需要打开两个开关，即红色框中的两个配置
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b2503d1e53d7.jpg)

#### Triton GEMM

- Hopper架构上实现`GEMM`大概需要图中标记的地方
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_186c9937a84c.jpg)

### Dialects & Pass pipelines

#### Frontend

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cf3d40d8ef36.jpg)

- Python定义的函数上面 加上`@triton.jit` 这句话，表示下面这个函数是一个Triton的`Kernel`函数
- 这个函数将会被继续解析成`Python的AST`， 也就是Python的抽象语法树，会继续往下`lower`。 

#### Dialects

<strong>For backward compatibility</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dbd84ea72d97.jpg)

- `Compute_Capability_Rewrite` 这个`Pass`，它保证了新老`API`的兼容, 这个`Paas`负责将当前GPU架构不支持的feature回滚到适配当前GPU架构的版本。
<strong>New added dialects and attributes</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a81b2197ddad.jpg)

- `dialects ` 

- 主要集中在 `TritonGPU`和`TritonNVIDIAGPU`这两个`Direct`修改，其中Triton `NVIDIA GPU`整个`Direct`都是新加的

- `Encoding attributes` ，`Encoding attributes`用来描述`Tensor`在GPU的`Memory hierarchy`里面是存放的位置以及存储顺序 
- `CTA -> CGA ` 

- `BlockedEncoding`：代表了数据在寄存器中的一种排布方式 
- `MMAEncoding`：代表`Tensor Core`的输出在寄存器中的数据排布方式；因为每一代`Tensor Core`输出的数据排布方式都是不一样的
- `SharedEncoding`：代表数据在`Shared Memory`中的排布方式，为了避免`Shared Memory Bank Conflict` 这个`Shared Memory`的排布方式里面有各种`Sweetning`方法

- 为了支持`CGA`编程，为这些`Encoding`添加了几个字段：`CTAsPerCGA`, `CTASplitNum`, `CTAOrder`，它们共同决定了`CTA`在`CGA`中划分成几个维度，以及每个维度的大小和方向分别都是什么。以及`TMA`访问数据的时候需要为哪些CTA做muti-cast信息。
- `WGMMA` 

- `versionMajor`：区分Hopper和Ampere架构上的Tensor Core 
- `hasLeadingOffset`：区分Ampere和Hopper架构的Tensor Core 对Shared Memory数据排布的不同要求。
- `New added operations`：`Barriess`、`TMA` etc

#### Pass

<strong>Pipelines pass</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a7f759cd20f8.jpg)

- `plan_cta、accelerate_matmul、optimize_epilogue、pipeline、warp_specialize、materialize_load_store、remove_layout_conversions、fence_insertion` 
<strong>PlanCTA Pass (CGA->CTA tiling)</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a5adad0321b6.jpg)

- 它负责了CTE到CGA之间分块的策略, 这个算法首先选择一些关键的`Operation`，并且为关键的`Operation`赋予合适的策略，比如`Dot`或`Reduce`操作。这个算法会尝试沿着`IR`结构， 往前和往后去传播这个策略。 因为访问`distributed shared memory`是比较昂贵的，所以这里的传播原则是尽可能减少不同`CTA`之间`distributed shared memory`访问。 换句话说, `PlanCTA` 的目的是寻找一种全局`CGA`划分策略，尽量让同一个`CGA`的`CTA`只访问它自己的shared memory, 减少跨CTA的`Shared memory`访问，如果当必须要跨`CTA`的话， 再看是否可以依赖`TMA`的`Multicast`来解决这个问题。如果还是不能解决的话， 最终才会去真正产生跨`CTA`的访存。
<strong>warp_specialize</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f30f67e0ae46.jpg)

- `Warp Specialization` 是一种类似图着色的方法，去识别`IR`中的`Operation`， 并分类成`Predog`、`Math`和`Epilogue`三类。实际应用中，`Predog`通常是指数据加载，`Math`指数值计算, `Epilogue`指数据写回, 这三个阶段分别用了不同的硬件单元，所以才可以同时的去堆叠执行。
- 算法接着会修改`IR`结构，将这三类的`Operation`分别划分给不同的`Workgroup`，最后在合适的位置插上不同的`Barrier`，这里插入的`Barrier`是保证堆叠执行的正确性和效率。
- 就像这张图里面所画的，每个Tile虽然可能被分配到不同的`workgroup`中去执行，但是每个`Tile`都必须按照`Predog`、`Math`和`Epilogue`这个顺序去执行，才能保证每个`Tile`计算结果的正确性。
- 还有`Workgroup2` 和`Workgroup 3`是`ping-pang`执行, 这样就能保证一个`workgroup`执行`Math`，另一个`workgroup`去执行`Epilogue`。这样的话就可以将三个阶段的操作互相堆叠， 从而减少端到端的执行时间。
-  如果`Math`特别长的话， 这个`workgroup1`和`workgroup2`之间还是会有一些气泡， 所以`Warp Specialization`其实不只是只有`ping-pang`一种调度方式，还有更多的方式，这些方式还在探索中。

#### Backend

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7550b129ebbf.jpg)

- <strong>目前的方案</strong>：其实是一个临时的方案，是`TritonNVIDIAGPU`或者`TritonGPU`的`Direct`， `lower`到`LLVM`和`NVVM Direct`，同时会`inline`很多的`PTX`进去，因为`LLVM`、`NVVM Direct` 现在对Hopper架构的支持还不够完备，如果等到`Direct`对Hopper架构支持成熟了之后，会换成右边的方案。

### Performance & Plans

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_138be03b7ef0.jpg)

#### Performance

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1d58c5ecbbca.jpg)

#### future works

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_847a08fa0299.jpg)

### Question & Answer

可以先扫一下论文（[https://www.eecs.harvard.edu/~htk/publication/2019-mapl-tillet-kung-cox.pdf](https://link.zhihu.com/?target=https%3A//www.eecs.harvard.edu/~htk/publication/2019-mapl-tillet-kung-cox.pdf)），再看`QA ` 

#### 中文论坛

- <strong>请问hopper加入thread block cluster的考量是什么？</strong>
Cluster的加入是为了用来Distributed Shared Memory的仿存。因为新一代的架构，它的理论峰值会增加的很多，这个时候会对算存比的要求更加敏感。 在pre-Hopper之前的架构，没有考虑过Warp Specialization这样的技术，但是在Hopper就需要考虑了, 因为需要尽可能去掩盖访存延迟,。CG A的加入其实也是为了各个CTA之间去尽量的去重用数据，去节省访存带宽。

- 无论是Cutlass,还是Triton，新的硬件是否已经用到distributed shared memory的feature？
M-Barrier有用到，其它的feature是尽量去避免这个访存的，比如在矩阵乘这种这种应用场景下，尽量避免Share Memory访存， 因为它虽然比直接访问Global要好很多，但是它仍然是一个比较重的操作。

- triton适合什么样的使用场景呢？一般用户会不会宁可使用性能调优过的算子库？
这个其实涉及到Triton的一个定位的问题。Triton本质上来讲， 个人觉得它不是一个纯粹AI compiler，它更多的是一个Kernel开发的语言和编译器的复杂融合体。 它主要还是解决用户需要去写Cuda  Kernel，或者需要去写GPU上的Kernel场景，这类场景用Triton是比较适合。还有一些特别的fusion操作等等，比较适合用Triton语言来解决。

- 多播的主要收益是降低带宽压力吗？
还是以矩阵城乘举例，对于矩阵乘的一个M、 N Tile来讲, 就是在同一行的 M、N Tile, 其实是多个CTA  可以共享A矩阵的数据的。同一列上可以共享B矩阵的数据，这一部分比较适合用TMA的Multicast来解决，  TMA去从global load到shared memory的时候，直接就load一次， 然后写回到两个CTA的shared memory里面，这样就完成了一个数据重用，节省了一部分带宽。

- 这种auto codegen目前真能比手写还要快吗？
杨军老师画的图 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_459813b7c8af.jpg)

*用Triton实现一个矩阵乘，去超过Cutlass或者Cublas,其实还是一个比较难事情*

- 目前pytorch2.0里引入了triton，但是并没有开启dot类op比如gemm/conv类，在其他内存密集型算子融合这部分上triton性能提升明显，什么时候考虑引入dot类呢
可能`Pytorch`有自己的考虑，用`Triton`开发的矩阵乘，达不到`Cutlass`或者`Cublas`性能，还不如直接调用第三方库方便

- 非英伟达的GPU用triton有什么劣势？
*其实要看投入和支持的力度*

- 跟cutlass的实现算法比较，有什么差异呢？
其实大家实现`Kernel`本身,思路都是相似的， 只不过`Triton`相比`Cutlass`，它更容易能够把一些kernel给`fuse`起来， 比如：dot后面再加一些其它的operation, 开发者可以把这些算子写到`triton`的一个`function`里面, 这样就然fuse在一起的。Cutlass的性能做得比较极致，用AI编译器生成的话，性能可能能够达到80~85%性能，如果再想往上提性能的话，AI编译器实际上不太容易去做到一些细节上的事情。 
`Triton`本身它的定位还是更多的在编程语言上给大家提供灵活性， 因为毕竟用`Cutlass`没有办法接一个自定义的`Dot`或者其它`memory bond`操作。 `Cutlass`的融合是比较难做的。`既然对于fuse算子开发效率高，跟编译器自动生成的算子串在一起，pipeline会不会被打断`

- 在Hopper架构上， Triton、AutoTune带来的性能提升比例是怎样， 如何选取到好的AutoTune的策略?
`Triton`的`autotune` 实际上它做的比较简陋，它大量的都在一个`thread block`内部。在`thread block`上面的那个`autotune` 就没有做到一个比较高端做法，比如引入一些AI模型去做。`根据硬件的分层设计，对每部分的加速单元可以做一个CostModel, 那加入CostModel后势必会延长搜索时间、搜索算法、
以及对硬件资源有一定的要求。
1、这部分对于部署模型的硬件有什么大致的要求，或者模型部署大致是什么流程
2、基于搜索空间的设计，业界目前主流的做法或者落地的案例

- 有用triton实现过flash attention吗？我们用openai的例子程序发觉结果和原始的flash attention结果不一致而且，更为费解的是，修改矩阵乘的block M和blockN导致最终计算结果不一致
好像有`bug`，最后编译出来的计算行为与用`Triton`实现的逻辑行为有地方不一致，可以多关注社区

- warp specialization 和 warp group 是纯软件上的概念吗？通过 cuda 精细调控也能达到 warp specialization 的效果吗？
用`CUDA`语言实际上也是可以实现`Warp Specialization`,` Cutlass`里面也有`Warp Specialization`的实现。`Warp Group`其实是一个硬件上面的东西，`Ampere`上的`Tensor Core`的第三代`Tensor Core`，其实是一个`Warp Level`的`API`。即一个Warp，32个线程去做协作完成一个`Tensor Core`指令，在`Hopper`上其实是四个`Warp`去做协同完成一个第四代Tensor Core指令执行，所以`Hopper`引入`Warp Group`实际上是四个Warp作为一个`Warp Group`，也算是一个硬件上的限制。

- Triton/Triton GPU dialect与其他mir dialect融合的可能性？选择MLIR重写triton后端的原因是什么？
用`MLIR`重写，它其实是比较容易能够接入`MLIR`里面的一些生态。有了这个脚手架之后，整个`IR`也会容易开发，扩展性也会变得好一些, 这也是`MLIR`原本的优点。 `Triton`改写了之后, `Triton`也能吃到这些优点。

- NV的 cutlass, cuby 和 triton 的定位,都是基于tile的编程，Triton其实可以认为是一种基于Tile的编程框架，NV是否考虑过两者直接对接？而不是通过编译这条路径？
在技术上这两者其实都像是一个在Tile上编程，很自然的能够想到能不能把它两者结合起来。NV目前还在尝试中，目前来讲的话，Cutlass和Triton的定位还是有区别的。
#### `Reddit`论坛

Triton作者[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)<strong>回答帖：</strong>[Introducing Triton: Open-Source GPU Programming for Neural Networks](https://link.zhihu.com/?target=https%3A//www.reddit.com/r/MachineLearning/comments/otdpkx/n_introducing_triton_opensource_gpu_programming/) ，很有意思的一篇讨论，Triton是什么，它是什么特点。reddit的帖子可以从竞品分析、发展现状两个方面进行梳理。

<strong>竞品分析</strong>

<strong>Jax vs Triton</strong>

**ptillet：                                                                                                                                                       it is more comparable to the Torch JIT than Triton, in the sense that you give it a sequence of tensor-level operations and it spits out optimized GPU code. I don't know how good that generated code is for JAX, but for Torchscript we've found it to be much worse than kernels that were manually fused using Triton (see softmax performance in the blog post).                                                                          I think Triton is more comparable to CUDA-C, and it would be easier for frameworks like JAX and Torch to program GPUs with Triton rather than CUDA in the future. You actually don't even need the full CUDA SDK to compile Triton code -- only the proprietary NVIDIA drivers.                                      补充：                                                                                                                                                    Jax's jit compiles to XLA, so that's the relevant comparison. It seems like your project is much more general and flexible than XLA's higher level primitives.                                                                             -----------------                                                                                                                                                     1、`JAX`更适合与`PyTorch JIT`相比较,它们将张量运算序列作为输入并生成优化的GPU代码                             2、`JAX`生成代码的质量尚不清楚,但`PyTorch JIT`比手动融合的Triton` Kernel`差很多                                       3、Triton和`CUDA-C`相比,可以让基于框架GPU编程更简单                                                                         4、Triton只需要NVIDIA驱动即可编译,无需完整CUDA `SDK` Hailde vs Triton**

**[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)*：                                                                                                                                                       *There is a section of the documentation [Related Work - Triton documentation](https://link.zhihu.com/?target=https%3A//triton-lang.org/main/programming-guide/chapter-2/related-work.html)                                         that briefly compares Triton against alternative compiler system (polyhedral compilers, halide/tvm)Triton vs Numba**

提问1：I saw a couple graphs comparing Triton vs Torch execution time and it looked identical. The code difference between Triton & Numba code wise had some tiny differences.
讨论者1：
Don't be fooled by the simple example, triton is lower-level than numba or jax, and for sure more difficult to write.
That example is matrix multiplication, and the comparison is between cuBLAS (hand-optimized and written on the lowest feasible level, by experts) vs what the triton compiler comes up with based on those few lines of code. [Matching cuBLAS is hard.](https://link.zhihu.com/?target=https%3A//demoriarty.github.io/BMM-1/) 
It's not intended for operations that are implemented in cuBLAS, but for operations that *aren't* common enough to have an high performance implementation in an existing library.
---------
1、Triton比`Numba`和`JAX`更底层，使用也是有门槛的                                                                                        2、与`cuBLAS`实现矩阵乘，使用Triton编码代码量会减少，但是达到专家手写的性能有难度                             3、Triton不是为已经在`cuBLAS`中实现的算子而设计的，而是为不够常见,没有高性能实现的OP提供解决方案Triton vs rapids

**第一次听`rapids`, 官网link [https://rapids.ai/](https://link.zhihu.com/?target=https%3A//rapids.ai/)Triton vs Triton Inference Server**

提问者： 
Nvidia referencing "Triton" as early as 2018, [https://web.archive.org/web/20200808212334/https://developer.nvidia.com/blog/nvidia-serves-deep-learning-inference/](https://link.zhihu.com/?target=https%3A//web.archive.org/web/20200808212334/https%3A//developer.nvidia.com/blog/nvidia-serves-deep-learning-inference/)
[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)回答：
 TensorRT inference server ->Triton inference server,This is version log [https://docs.nvidia.com/deeplearning/triton-inference-server/release-notes/index.html](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/triton-inference-server/release-notes/index.html) .
In 2020 --it was rebranded as the Triton inference serverTriton vs Llama.cpp

<strong>Reddit 讨论帖子 [https://www.reddit.com/r/LocalLLaMA/comments/14rluww/triton_vs_llamacpp/](https://link.zhihu.com/?target=https%3A//www.reddit.com/r/LocalLLaMA/comments/14rluww/triton_vs_llamacpp/)Triton in MLIR</strong>

提问者：What do you think about something like Triton in MLIR as a portable abstraction layer for ML accelerators and GPUs? How portable could Triton kernels be? So far the story for portability of models across architectures and OSes seems to be "distribute your model as a graph of high level ops in a framework like TensorFlow", which is supremely unsatisfying to me (proliferation of ops, inflexibility of ops, op fusion is hard). I wish there was a much lower level representation that could still be portable enough to target GPUs, DSPs, TPUs, etc at runtime and achieve a decent fraction of peak performance.                                                                                                                                  [ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)： 未回答                                                                                                                                             --------------                                                                                                                                                1、希望了解Triton作为`MLIR`的可移植抽象层对ML加速器和GPU的适用性                                                       2、目前跨平台模型移植主要通过`High level`运算图形式,这种方法存在明显缺点,比如：运算量激增, 算子灵活性差，`fusion`困难                                                                                                                                                3、希望有一个`Low level`的表示,比如通过`runtime`编译,也能维持可移植性和良好性能                                          4、想了解Triton内核的可移植性能达到什么程度

发展现状

<strong>Add new target</strong>

提问：
A non-Nvidia-bound, ML-focused, auto-tuned, LLVM-based GPGPU compiler with easy integrations with PyTorch is just what the community needs at the moment.
I see from the repo that there are currently [only a few ops implemented](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/tree/master/python/triton/ops). Looking in to the code, it seems like implementing [cross_entropy](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/master/python/triton/ops/cross_entropy.py) and [matmul](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/master/python/triton/ops/matmul.py) ops is doable though not trivial.
How much work would it be to pick it up and fill out all the ops that are used in, say MobileNetV3 or another comparably popular model?
Similarly, how much work would be involved in adding support for AMD GPUs since it's [still currently NVIDIA only](https://link.zhihu.com/?target=https%3A//github.com/openai/triton)?   
--------------                                                                                                                                            Triton的优点：不绑定于Nvidia、面向机器学习、可以auto-tuned、基于LLVM的GPGPU编译器,PyTorch可以轻松集成。                                                                                                                                                                                                                                                                                             [ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)回答：
Yep, so that's a tricky part. For reference, there used to be a bunch of fancier ops (conv2d, permute, einsum, block-sparse einsum) but I ended up nuking most of them because they were just too much work to maintain and prevented me from focusing on compiler work :( I am hoping that in the future Triton can be more tightly integrated in Torch (maybe via a JIT-compiler) so that having external Triton ops wouldn't be all that necessary.
There is someone at AMD working on making Triton compatible with their GPUs. I assume it's a fair bit of work -- we had to use lots of inline nvidia asm during codegen to match FP16 cuBLAS on V100/A100 -- but we'll get there eventually.
Thanks for the kind words! Fortunately I managed to graduate last November                                       ----------------                                                                                                                                                 1、曾经实现过一些复杂算子但后来删除，因为维护工作量太大                                                                         2、希望通过`JIT`与PyTorch更紧密集成,减少其它额外的算子需求                                                                         3、`AMD GPU`的适配还在进行中,貌似还有大量的工作，在`codegen`阶段需要使用了大量内联汇编来match Nvidia的性能`JIT-compiler的定位是什么呢？`

> Totally! We've been working hard on Triton, but it's still in its infancy. There are some workloads that you just cannot implement using existing Triton primitives. I'm thinking in particular of things like sorting, top-k, FFT, and anything that basically requires doing something like `x[indices]` where x and indices are both blocks of value. We expect to have a solution for this in ~6 months, but I can't guarantee that it will completely match the performance of what a CUDA experts would be able to write using warp shuffles etc.
There are also some things that Triton just doesn't automate. I'm thinking about things like locks and semaphores between SMs. This is something that one can still do using atomics in Triton (see [this](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/master/python/triton/ops/matmul.py%23L70-L81) example).
And of course there are all the stability issues :p Triton is a recent project and the compiler does some very aggressive optimizations. We have nowhere near the resources that NVIDIA allocates to CUDA... so it can be a bit rough around the edges if you try things like e.g., super nested control flow.               ---------
1、Triton目前无法实现的workload: `sorting`, `top-k`,`FFT`，以及需要value和indices两个值的场景；       2、它的性能无法达到cuda专家手写的算子；                                                                                                 3、`SM`间的同步和原子操作无法自动化,需要自己实现, example [link](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/main/python/triton/ops/matmul.py%23L70-L81)；                                                            4、稳定性问题，Triton作为一个新的项目，编译器进行了非常激进的优化。远没有NVIDIA在CUDA上投入的资源，对于一些嵌套调用，可能会显得有些粗糙。

Op list

<strong>Link :[https://github.com/openai/triton/tree/main/python/triton/ops](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/tree/main/python/triton/ops)library</strong>

提问：This looks really cool. Would it be possible to create bindings so that Triton could be used from other languages? I'm thinking of Rust in particular as a language that could really benefit from having CUDA/GPGPU capabilities
[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)回答：
Yes. Triton is a C++ library. Python binding is done with pybind11.                                                             ---------
1、`Triton`是一个`C++`库。`Python`绑定是使用`pybind11`完成ecosystem

提问：
So it's a level 2 layer over CUDA?
I appreciate the effort, but I would have loved for you to use vulkan (or some other cross-platform API) for such an effort -- long term it would be better for everyone if we do away with CUDA as a dependency for the ecosystem
[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)回答：I actually agree with you for Vulkan. Our main concern with it at the moment is that it won't allow us to use all the inline asm directives we need. In an ideal world, Triton would probably just be an MLIR dialect and would translate to SPIRV properly, but this would require a whole lot of engineering efforts that we could then not spend on further optimizing the compiler.
-----------                                                                                                                                                         1、同意使用`Vulkan的`价值，但是也存在`Vulkan`无法支持`Triton`需要的所有内联汇编                                        2、在某些方面，`Triton`成为`MLIR dialect`并转换为`SPIR-V`，需要工程量大，会减少编译器优化时间TLDR summary

提问：Can somebody give a TLDR summary what Triton offers that you can't already do with something like PyTorch?
[ptillet](https://link.zhihu.com/?target=https%3A//www.reddit.com/user/ptillet/)回答：
I think researchers can do pretty much whatever they want with PyTorch, but sometimes they may take a big performance / memory hit that can only be resolved by writing custom GPU kernels. An example for that would be block-sparse memory formats: in PyTorch, you'd have to manually mask your dense tensors. Triton makes it much easier for people to write these GPU kernels, as opposed to CUDA. Or maybe you want a custom matmul + top-k kernel as mentioned [here](https://link.zhihu.com/?target=https%3A//www.reddit.com/r/MachineLearning/comments/nm95ur/p_modifying_opensourced_matrix_multiplication/).
Depending on how stringent your perf/memory requirements are, you may find Triton more or less useful. At OpenAI we train pretty large models, so having super optimized GPU code is quite valuable for us.
Totally! We've been working hard on Triton, but it's still in its infancy. There are some workloads that you just cannot implement using existing Triton primitives. I'm thinking in particular of things like sorting, top-k, FFT, and anything that basically requires doing something like `x[indices]` where x and indices are both blocks of value. We expect to have a solution for this in ~6 months, but I can't guarantee that it will completely match the performance of what a CUDA experts would be able to write using warp shuffles etc.
There are also some things that Triton just doesn't automate. I'm thinking about things like locks and semaphores between SMs. This is something that one can still do using atomics in Triton (see [this](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/master/python/triton/ops/matmul.py%23L70-L81) example).
And of course there are all the stability issues :p Triton is a recent project and the compiler does some very aggressive optimizations. We have nowhere near the resources that NVIDIA allocates to CUDA... so it can be a bit rough around the edges if you try things like e.g., super nested control flow.             ----------
1、PyTorch可以做任何事情,但有时会遇到性能/内存问题，需要采用自定义Kernel方式解决，比如：block-sparse memory（稀疏计算）
2、相比CUDA，Triton可以大大简化自定义kernel的过程，具体根据性能、带宽、算法特性来分析Triton使用的优劣势
3、OpenAI训练大模型也用到了Triton
4、Triton目前无法实现的workload: `sorting`, `top-k`,`FFT`，以及需要value和indices两个值的场景；
5、它的性能无法达到cuda专家手写的算子；
6、SM间的同步和原子操作无法自动化,需要自己实现, example [link](https://link.zhihu.com/?target=https%3A//github.com/openai/triton/blob/main/python/triton/ops/matmul.py%23L70-L81)
7、稳定性问题，Triton作为一个新的项目，编译器进行了非常激进的优化。远没有NVIDIA在CUDA上投入的资源，对于一些嵌套调用，可能会显得有些粗糙。

#### 个人想法

- 其实不管是`Triton`，还是`TVMScript`，它都不是一个纯粹的AI编译器，但它都依赖一套完整的编译流程。
- `Triton`和`TVMScript`的解决问题的场景还是`Kernel`开发，或者对一些原有性能差的`Kernel`二次开发。Triton的开发者不用太关心跟硬件紧密耦合的特性，这些特性都由编译器后端处理。
- `Triton`相比于`CUDA`开发，开发效率会高一些，但`Triton`开发出的`Kernel`一般专家比手写`CUDA Kernel`性能差一些效果。
- `Triton`对`Fusion`算子貌似开发挺友好的，比如这篇[ Online normalizer calculation for softmax](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1805.02867.pdf) ，这种前期快速创建一个demo,将整个流程串通起来。
1、说到这里，那么对于Pytorch中，它的自定义算子是怎样一个流程
2、对于机器学习框架，新增加一种硬件平台，Pytorch如何做
3、TVM的BYOC是什么定位

- 当然也要尽可能避免这种场景，为了更好封装和利用硬件的加速特性，`Triton`接口做了过多限制，看着接近`Python`的语法，但是两者不兼容，导致用`Triton`开发`Kernel`来说反而是一种负担。
- `Triton`在编译流程上借助了`MLIR`生态，应用上集成到`Pytorch`生态，后续更好的发展还是要看NV和OpenAI的支持力度吧。Pytorch核心开发者[Horace He](https://link.zhihu.com/?target=https%3A//twitter.com/cHHillee)也在用Triton, 貌似还是挺受欢迎，比如这篇 [link ](https://link.zhihu.com/?target=https%3A//twitter.com/cHHillee/status/1732520724307526079)
- AI编译器通过搜索分析得到性能最优的代码。按照硬件分层设计的属性，最好针对硬件的分层设计，有对应的`CostModel`搜索出最优代码。`CostModel`增多后，对于`autotuning`时搜索空间会变大，会导致整个编译时间都会很长，这样用户是否能接受较长编译时间也是一个待解决的问题。