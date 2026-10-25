---
title: (2 条消息) NPU的硬化Task Scheduler介绍
date: "2025-08-20 00:00:00"
updated: "2025-08-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/NPU的硬化Task-Scheduler介绍/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/7071414585
---


这篇文章是之前还在做汽车芯片的时候写的，现在我把汽车芯片的相关内容删掉，单纯把技术相关的部分搬运过来分享一下。

正文开始

### 1 **任务调度的模型与实现

构建一个拥有大量异构加速器的软硬件系统并非易事。Figure 1是一个异构SoC系统示例，其中包含使用shared memory的CPU和多种加速器[1]。由于加速器可能需要使用CPU生产的数据，因此内存的coherence和consistence的设计十分具有挑战。并且操作系统的堆栈、编译器以及调度器都需要重新设计，加速器的粒度也需要仔细定义。因此，编程模型的选择、调度器的设计是NPU系统的重要问题，好编程模型和调度器可以极大的提高算法在NPU芯片中的运算效率。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c7cbfe0d2432.jpg)

Figure 1. 异构SoC系统示例学界和工业界一直在寻找不同级别的并行编程模型来提高计算性能，通常的并行编程模型有ILP (Instruction Level Parallelism)、TLP (Thread Level Parallelism)和DLP (Data Level Parallelism)，如Figure 2。这三种并行模型均与计算机体系结构的发展相吻合。处理器中的指令乱序调度使得ILP的能力大幅增长；多核的设计使得TLP变尤为重要；vector计算单元的增加，例如GPGPU，使得DLP得到有效利用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_803ec2fa9d25.jpg)

Figure 2. ILP、TLP和DLP示意图NPU芯片拥有大量的专用异构加速器。ILP、TLP和DLP并不能充分发挥异构加速器的计算潜能，因此选择一种新的编程模型作为AI算法和芯片的接口迫在眉睫。异构加速器的使用天然为task作为计算单元铺平了道路，TLP (Task Level Parallelism)也顺理成章的被引入进来。其中，task是将一组指令定义成原语的抽象层级，该原语可以在程序中重复使用。用户的线程可以由多个task组成，通常一个task是由芯片中一种加速器执行的。如Figure 3所示，多个task可以根据不同的算法和应用场景构成DAG实现细粒度并行，task之间的边表示依赖关系。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d085eab9cfed.jpg)

Figure 3. 由多个task构成的DAG通常，基于task的并行计算环境由两个组件组成：（1）任务并行API和（2）任务runtime系统[2]。前者定义了开发人员描述并行性、依赖性、数据分发等的方式，而后者定义了环境的效率和能力。runtime确定了支持的体系结构、调度的目标、调度策略和异常处理等。但是，这种基于软件的调度器具有固有的缺点：

- 在CPU上运行调度程序实例是一种开销，当任务粒度较小、加速器数量很多时，软件调度会占用大量的CPU资源，并且使得端到端的计算效率发生显著下降；
- 任务在加速器上执行结束，必须通过具有长延迟的中断来通知CPU，进一步导致调度的latency变大；
- 调度的软件开销、延迟开销导致无法编译出细粒度的任务，导致无法利用细粒度的并行性；
Figure 4是不同的任务粒度对OmpSs软件调度器加速效果的影响[3]。在前半段，当任务粒度变小时，Speedup是逐渐上升的；当任务粒度逐渐降低到某个点时，调度开销已经无法被计算掩盖，Speedup开始下降。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_403d777ac7d7.jpg)

Figure 4. OmpSs在不同任务粒度下的加速器效果如果NPU系统中包含一个SoC级别的硬件任务调度器，则可以大大减轻上述缺点，编译器可以编译出细粒度的任务来充分利用细粒度的并行。Figure 5是在Figure 1的基础上，将HTS (Hardware Task Scheduler)加入到包含CPU和各种加速器的系统中[1]。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cd992e5491f4.jpg)

Figure 5 包含HTS的异构SoC系统CPU可以将任务和任务间的依赖关系都推送到HTS，CPU只需要轮询任务完成队列、处理异常等。HTS会维护若干个任务队列，类似与OoO CPU中执行的指令。HTS会维护整个系统中每个加速器的忙闲状态，并将任务发送给空闲的加速器上。当任务执行结束时，加速器写任务完成描述符来通知HTS，这比中断处理快几个数量级。HTS可以处理任务间的依赖关系，当某个任务依赖解除时，HTS会以无序的方式调度该任务，这可以在异构ADS系统中带来巨大的速度提升。如Figure 6所示，HTS的调度相比于runtime带来显著性能提升[1]。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d679db2b3cb4.jpg)

Figure 6. HTS相比于runtime带来的性能提升
### 2 任务调度洞察

Ascend提供了软硬件结合的调度方案。Ascend开发软件栈支持原生的可微分编程范式和原生的执行模式，在开发效率和计算效率之间进行了折中。一方面，开发者可以轻易的将DNN模型部署到各种Ascend设备上，这些设备也可以配备不同的Ascend core上。开发者可以使用high-level的编程模型实现一次性的开发和按需部署。另一方面，拥有更多架构知识的专家可以利用low-level的编程模型和库进一步提高计算效率。Ascend的开发软件栈如Figure 7所示[4]。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7a73cdf3358c.jpg)

Figure 7. Ascend开发软件栈Pytorch、Tensorflow和MindSpore等DNN开发框架处于整个开发软件栈的顶端。MindSpore是Ascend core的专用框架。它可以充分的利用Ascend的计算资源，实现很高的计算效率。这些DNN开发框架的输出被称为“Graph”，它表示算法中粗粒度的依赖关系。然后，如Figure 8所示，Graph Engine会对“Graph”进行切分，将适合CPU逻辑处理的算子切分到CPU子图，将计算密集型算子切分到专用加速器子图[5]，即被转换成Stream。其中，Stream是由若干个有序的Task组成[4]。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_16f384ae1d97.jpg)

Figure 8. Graph切分示例TBE (Tensor Boost Engine) DSL (Domain Specific Language)是用Level-3编程模型开发的，可以让没有硬件知识的用户也可以在这个级别编写代码，也称为数学编程级别。在编译器的帮助下，可以从TBE DSL描述中自动生成实例Tasks[4]。

程序员还可以在parallel/kernel level (Level-2)编程模型中开发实例task。 此级别类似于GPU 的 CUDA 或 OpenCL。 它引入了所谓的TIK (Tensor Iterator Kernel)接口，用于使用 Python 进行并行编程。专用的编译器技术，称为Auto Tiling，用于将大的task转换为小的task，以适应 Ascend 架构。 在强化学习算法的帮助下，该技术通过智能搜索合法映射空间，为任何程序提供最佳的映射和调度[4]。

如Figure 7所示，编程模型的Level-1是C编程接口，也称为CCE-C (Cube-based Compute Engine)。在这个Level，架构的所有设计细节都是向开发者公开的。开发者可以在C代码中嵌入汇编，从而充分的利用硬件加速能力[4]。

如上文所述，APP在不同Level的编程模型会被转换为不同的表达形式，即Stream、Task和Block，如Figure 9所示[4]。所有的这些表达在不同级别的调度器中并行执行，详细介绍如下：

- 应用层：多个应用可以在同一个Ascend SoC上并行执行。
- Stream/Task层：图编译器会将每个应用编译成多个Stream，每个Stream中有多个Task。多个Stream的Task可以在TS (Task Scheduler)的调度下并行执行，同一个Stream的Task串行执行。TS在Ascend SoC如Figure 10所示[6]。
- Block层：每个Task可以被分成若干个Block（需要由开发者或编译器显式描述），不同的Block可以被分发到不同的Core上执行。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fd09c33780bf.jpg)

Figure 9. Ascend调度层级![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3e4e68c7767e.jpg)

Figure 10. Ascend 310 SoC架构图
### 参考文献

- Hegde, Kartik, Abhishek Srivastava, and Rohit Agrawal. "HTS: A hardware task scheduler for heterogeneous systems." *arXiv preprint arXiv:1907.00271* (2019).
- Thoman, Peter, et al. "A taxonomy of task-based parallel programming technologies for high-performance computing." *The Journal of Supercomputing* 74.4 (2018): 1422-1434.
- Tan, Xubin, et al. "Performance analysis of a hardware accelerator of dependence management for task-based dataflow programming models." *2016 IEEE International Symposium on Performance Analysis of Systems and Software (ISPASS)*. IEEE, 2016.
- Liao, Heng, et al. "Ascend: a scalable and unified architecture for ubiquitous deep neural network computing: Industry track paper." *2021 IEEE International Symposium on High-Performance Computer Architecture (HPCA)*. IEEE, 2021.
- [https://www.mindspore.cn/docs/zh-CN/r1.8/design/heterogeneous_training.html](https://link.zhihu.com/?target=https%3A//www.mindspore.cn/docs/zh-CN/r1.8/design/heterogeneous_training.html)
- Liao, Heng, et al. "DaVinci: A Scalable Architecture for Neural Network Computing." *Hot Chips Symposium*. 2019.