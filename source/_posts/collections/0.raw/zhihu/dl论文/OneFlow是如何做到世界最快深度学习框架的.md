---
title: OneFlow是如何做到世界最快深度学习框架的
date: "2020-11-02 00:00:00"
updated: "2020-11-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/OneFlow是如何做到世界最快深度学习框架的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/271740706
---


——PK 经NVIDIA深度优化后的各框架最快实现 以及 官方实现；致简致快的深度学习框架OneFlow性能优化深度揭秘

近期，[OneFlow v0.2.0](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/oneflow/releases/tag/v0.2.0) 发布了，除了框架的易用性和完备性的提升在有序推进以外，最主要的更新就是多达17个性能优化，使得CNN和BERT的自动混合精度（AMP，Auto Mixed Precision）训练速度大幅提升，不仅远超其他各个主要框架的官方实现，同时也超过了NVIDIA深度优化过的版本，成为在主流旗舰显卡（V100 16G）上训练ResNet50-v1.5和BERT-base模型最快的框架（同时也是分布式训练最易用的框架，我们将在另外的文章讨论深度学习框架分布式训练踩坑实录）。

<strong>OneFlow ResNet50-v1.5 AMP 单卡比NVIDIA深度优化过的PyTorch快80%， 比TensorFlow2.3快35%</strong>

本文的主要内容如下：

- DLPerf评测——公平、公正、可复现的深度学习框架性能大PK
- OneFlow追求极致性能的系统架构设计优势
- OneFlow在GPU上的CUDA性能优化揭秘
DLPerf评测
当下已经有一些公开、公允的与深度学习有关的性能测试，如 NVIDIA 的DeepLearningExamples、MLPerf。但是他们或者只围绕单机进行了测试，或者没有分离算法、硬件对最终结果的影响。为了更加科学的评估框架软件架构设计与性能之间的关系，我们建立了一个名为 DLPerf 的开源项目（实验环境、实验数据、可复现算法完全开源），严控深度学习框架之外的因素，使得评测的结果能更直接反映不同框架对深度学习效率的影响。

我们在相同的物理环境上（4台 V100 16G x8的机器）分别测试了OneFlow和其他几个主流框架在ResNet50-v1.5和BERT-base模型上的吞吐率及加速比，OneFlow在单机单卡、多机多卡下的吞吐率都明显领先其他框架。具体的评测说明、各框架复现流程、测试日志、实验数据以及最终中英文版的评测报告均可以在 [https://github.com/Oneflow-Inc/DLPerf](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/DLPerf) 仓库中查看，中文版报告见[DLPerf 性能评测报告中文版 v1.0](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/DLPerf/blob/master/reports/dlperf_benchmark_test_report_v1_cn.md)。欢迎感兴趣的小伙伴去看看（顺便点个star~）

这里先放两组数据对比：

<strong>ResNet50-v1.5 AMP batch size = 256 各个框架吞吐率（images/sec）对比</strong>

![](https://pic4.zhimg.com/v2-e9f6bb849a61ec7235de6476e6af710d_r.jpg)
![](https://pic1.zhimg.com/v2-952caae3eee3458980ec2fd304997536_r.jpg)ResNet50-v1.5 AMP batch size = 256 各个框架吞吐率（images/sec）对比注：
表格和图中以“NGC”为开头的表示该框架是从NVIDIA GPU Cloud (NGC) Container ([https://ngc.nvidia.com](https://link.zhihu.com/?target=https%3A//ngc.nvidia.com/)) 仓库中获取的。该版本的框架经过NVIDIA的深度优化，且大多使用了多种第三方插件（如：[NVIDIA-DALI](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/dali/release-notes/index.html)、[Horovod](https://link.zhihu.com/?target=https%3A//github.com/horovod/horovod) ），性能测试表现优于原生官方框架。测试在[NGC 20.03](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/frameworks/support-matrix/index.html) 镜像中复现，使用的脚本是NVIDIA官方仓库[DeepLearningExamples](https://link.zhihu.com/?target=https%3A//github.com/NVIDIA/DeepLearningExamples)中的模型脚本，且测试结果与NVIDIA官方公布的V100 16G x8的单机性能测试相近。
其中NGC TensorFlow 1.x 的batch size = 224，因为batch size = 256会遇到OOM（out of memory）, PaddlePaddle w/DALI 一列的batch size = 196，因为DALI会占用一些GPU显存导致batch size = 224 也会OOM。
[1]: <strong>PaddlePaddle w/DALI</strong>一列展示了PaddlePaddle在使用[DALI-paddle](https://link.zhihu.com/?target=https%3A//github.com/PaddlePaddle/models/tree/release/1.8/PaddleCV/image_classification%23dali%25E9%25A2%2584%25E5%25A4%2584%25E7%2590%2586)插件后的吞吐率表现。 我们测试发现PaddlePaddle多机性能表现不够理想，由于PaddlePaddle官方提供的4机32卡的吞吐率：[28594 imgs/s](https://link.zhihu.com/?target=https%3A//github.com/PaddlePaddle/models/tree/release/1.8/PaddleCV/image_classification%23%25E6%25B7%25B7%25E5%2590%2588%25E7%25B2%25BE%25E5%25BA%25A6%25E8%25AE%25AD%25E7%25BB%2583)是在V100 <strong>32G</strong>的显卡上测试的，且PaddlePaddle官方测试使用的是内部镜像，未公开，所以我们的测试结果暂时无法复现其官方数据。如果有人可以帮助我们提升PaddlePaddle的测试结果，请联系我们。 
<strong>BERT-base AMP batch size = max 各个框架吞吐率（sentences/sec）对比</strong>

![](https://picx.zhimg.com/v2-732de9e3e91fb1316ba8013ff90ed851_r.jpg)
![](https://pica.zhimg.com/v2-a618c4900b3fca248a1336b6de5e7b62_r.jpg)BERT-base AMP batch size = max 各个框架吞吐率（sentences/sec）对比[2]: 由于MXNet的BERT脚本仓库：[gluon-nlp](https://link.zhihu.com/?target=https%3A//github.com/dmlc/gluon-nlp/tree/7b7bf60259e28b3bf1f4d70569a7e5c18e2f4b3e/scripts/bert)并没有在其Optimizer中支持<strong>clip_by_ global_norm</strong>操作，而不支持该操作会降低最终的收敛精度且呈现性能提高的假象（W/O clip 相比于 clip，多卡情况下性能会有5%到10%的提升），至于其他框架均默认支持了clip操作。所以我们不把MXNet的性能测试数据放在最终的图表展示中。详情见：[MXNet BERT W/O clip 说明](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/DLPerf/tree/master/MxNet/BERT%23%25E8%25AF%25B4%25E6%2598%258E)。为了更清楚的对比性能，我们也测试了OneFlow W/O clip的数据，作为对比参考。评测的物理环境是4台装有 V100 16G x8的机器，评测的物理硬件、数据集、软件驱动均一致，评测所运行的算法模型训练脚本参数也严格一致，仅比较不同框架之间的性能差异。<strong>所有的测试均公开，可在相同环境下复现</strong>，复现流程、执行脚本、测试日志均描述在DLPerf仓库各个框架目录的ReadMe中。

<strong>各个框架性能评测小结</strong>

- 在CNN训练中，如果使用自动混合精度，在V100这样的卡上计算速度很快，数据加载和解码往往成为性能瓶颈，对于其他框架，均需要依赖[NVIDIA-DALI](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/dali/release-notes/index.html) 进行数据读取pipeline才能满足GPU计算需求。而OneFlow官方框架不需要依赖DALI也可以达到最佳性能。
- NGC里的各个框架的多机多卡训练需要使用[Horovod](https://link.zhihu.com/?target=https%3A//github.com/horovod/horovod)进行分布式训练才能跑的更快，往往需要我们的工程师额外做一些调试才能跑通跑快。OneFlow官方框架分布式训练非常易用，不需要Horovod即可达到分布式最快。
- 在ResNet50-v1.5 和 BERT-base的AMP训练中，OneFlow原生框架比TensorFlow 1.x使用[XLA](https://link.zhihu.com/?target=https%3A//www.tensorflow.org/xla)优化后的速度还快。从 DLPerf 中，我们也可以看到，分布式训练需求所催生出的越来越繁荣、开放的深度学习开源社区：

- [NVIDIA-DALI](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/dali/release-notes/index.html) 作为专门的数据加载与数据预处理库，为各个框架解决了数据加载及预处理的瓶颈
- [Horovod](https://link.zhihu.com/?target=https%3A//github.com/horovod/horovod) 让各个框架的分布式训练更加简便、更加高效
- [XLA](https://link.zhihu.com/?target=https%3A//www.tensorflow.org/xla) 作为深度学习编译器，帮助挖掘出更多模型性能潜力如果说，其它框架拥有驱动硬件计算的能力，DALI 帮助框架更高效地加载数据， Horovod 帮助框架的分布式训练更容易上手，XLA 帮助框架在训练最后的里程中深度优化……

那么，OneFlow 就是在一个框架内，拥有以上一切美好的工业产品 。

OneFlow 可以不依赖 DALI 就达到最佳的数据加载、预处理性能；不依赖 Horovod 就做到了分布式最快；不使用 XLA 也超越了使用 XLA 框架的速度，还可以傻瓜式地从单机程序扩展为多机程序……

OneFlow 的优秀充满技巧，但是没有秘密。为了让更多的深度学习框架工程师、算法工程师从中受益，我们准备了系列技术分享，本文就是开篇。

<strong>OneFlow为什么能做到世界最快？</strong>
主要原因有两点：

- OneFlow架构设计先进，用一套最简的系统设计就能解决所有分布式深度学习训练中的难题，且解决起来非常高效、简洁、易扩展。
- OneFlow团队有一群资深的性能优化专家，发掘了一些其它框架未发现的优化机会，我们相信在任何一个深度学习训练场景，使用OneFlow总能做到最快（实际上，在必须使用模型并行的超大规模模型场景，会观察到数量级的效率优势）。今天我就从这两点出发，讲解一下OneFlow是如何做到世界最快的。

<strong>OneFlow架构设计——追求极致性能的极简设计</strong>
在深度学习训练任务中，计算资源是GPU，OneFlow在设计之初就在思考如何不让GPU“空闲”。当计算量不变时，如果GPU永远都在满负荷工作，那么训练速度一定是最快的。

<strong>OneFlow架构天然支持pipeline，无需DALI即可解决数据加载瓶颈</strong>
大家可能听说过“剪箭管”的故事：

有一位自称外科名医的医生。一个士兵中箭，请他医治。医生说：不难不难。然后用剪刀将露在外边的箭管剪去。
士兵说：”箭头还在肉里面呢”
医生忙摆手道：我外科的事已完，这是内科的事，怎么也叫我医治？这是一个笑话，但是，深度学习框架中，在很长一段时间内，数据加载就像故事里一样被无视了：深度学习框架的开发者将精力主要用在优化计算，如果在那时有工程师提出“我们应该认真思考下如何优化 `fopen` 到 `fread` 这个过程”，那么大概率会被当作低技术含量的笑话。

后来，数据加载瓶颈成为了几乎所有这一代（OneFlow 属于下一代）深度学习框架的痛点，当训练数据量剧增，尤其是分布式训练中不仅有海量数据，还需要协调调度时，各个框架才开始意识到，这不是一个轻松的任务。直到现在，在几大公开测试中，还专门会做“合成数据”(synthetic)的测试，所谓合成，就是直接从内存中生成数据，不走真实IO。而当你需要框架通过真实IO加载数据时，框架的态度特别像“内科的事，也要我治？”。

各个框架也尝试在原有基础上，缝缝补补，推出“独特的高效数据加载方案”。然而，最后被广泛接受的却是 DALI…… 

DALI 作为一个第三方库，为各个框架提供数据加载与预处理能力。在 OneFlow 中，由于超越时代的顶层设计，数据加载的瓶颈问题从一开始就 <strong>根本不存在</strong>。

因为，OneFlow 中，“一切皆算子”，数据加载、数据预处理，都是算子，而只要是算子就可以享受到 OneFlow Actor 机制所天然带来的流水优化。

在上一篇介绍OneFlow的独特设计文章 [https://www.zhihu.com/question/409036335/answer/1373468192](https://www.zhihu.com/question/409036335/answer/1373468192) 中，我们介绍了OneFlow的运行时<strong>Actor机制</strong>天然支持流水线。

一个典型的OneFlow运行时执行图的pipeline如下图所示：

![](https://picx.zhimg.com/v2-5243f776c4e27f32a8d22efcdbcdf097_r.jpg)OneFlow 执行图 pipeline其中Preprocessing和Training分别表示由一组Op（Actor）组成的执行图。在Actor机制中，对于没有直接依赖关系的、不相邻的两个Actor，只要其它条件允许它们同时执行，那么就可以同时执行（流水并行）；当Actor产出的Regst的内存块（RegstNum）>=2时，相邻的两个Actor也可以同时执行。上图中pipeline的4个组成部分，主要开销分别来自不同的硬件：

- DataLoading（数据加载Actor）占用磁盘IO带宽
- Preprocess（由数据预处理Actors构成的子图）占用CPU计算资源和内存资源
- CopyH2D（数据传输Actor，copy from host memory to device memory）占用内存与显存之间的传输带宽
- Training（由模型计算Actors构成的子图）占用GPU计算资源OneFlow的Actor流式执行引擎，可以让占用不同资源的Actor们组成流水线，只要计算是瓶颈，那么数据加载、数据预处理、数据拷贝的时间全部都会被掩盖住。使得两个Batch之间尽可能无缝衔接，从而达到最快性能。

一种可能的数据加载->数据预处理->数据拷贝->计算的流水线时间线如下图所示：

![](https://pica.zhimg.com/v2-abab94726677638589040de5a987276c_r.jpg)OneFlow 运行时timeline图中的蓝、绿、黄、橙的圆角矩形分别代表数据加载、预处理、传输、计算在一个batch里的执行时间。深绿色和白色的小方块表示这个时间结点处（RegstNum = 2）的占用/空闲Regst内存块。一般情况下，训练一个batch的时间 > 数据预处理时间 > 数据加载时间 > 传输时间。上图即在描述这种情况下的一种overlap情形。值得注意的是，当CopyH2D的时间较短时，Preprocessing Actor的RegstNum = 2还是1（即内存块个数）对性能没有影响，因为预处理生成的数据会被立马消费掉，不会有两个内存块都被占满的情形。而CopyH2D Actor的RegstNum需要是2，保证Training能执行的可以立即执行，不需要等待传输。

值得注意的是，以上流水线机制并不是专门为数据加载、预处理设计的，而是为深度学习框架整体服务的顶层设计，它既解决了训练过程如何重叠计算和传输的难题，也恰好非常简洁的解决了“喂数据”的痛点。

<strong>AMP的数据加载问题</strong>
在V100这样的显卡上运行ResNet50-v1.5，在我们的测试机器上，即使24个core（48个物理线程）全部打满进行图片解码（ImageNet原始数据集），理论每秒最大图片decode数是7036img/s，但是V100单卡OneFlow的吞吐率已经达到了1472img/s，8卡吞吐率10629img/s，所以即使把全部的CPU计算资源用来进行图片解码也无法满足GPU计算需求。在OneFlow中，我们可以使用nvJPEG进行GPU解码，将图片预处理工作放在GPU上做，这时OneFlow的训练pipeline就变成了下图：

![](https://pic3.zhimg.com/v2-ea721dddcd158f3ff035d8f16d6e70ec_r.jpg)OneFlow的GPU decode pipeline其中Decode读取Host memory上的图片，并解码图片到Device memory上。由于使用GPU计算资源进行图片解码，数据预处理的瓶颈就被解决掉了。

<strong>Python端异步交互，掩盖控制逻辑时间</strong>
OneFlow的Python前端提供执行图的异步调用（asnyc_get），并传入一个Callback用于本次step执行结束后的数据后处理工作。OneFlow的计算图执行与Python端的控制逻辑是异步的：

- 有时数据是从Python端喂给OneFlow的执行引擎，Python端的数据处理工作跟OneFlow的执行引擎是流水并行执行的。
- 每个step执行结束，一般会把loss、acc等数据传给Python，Python会对其进行统计、打印等操作，这些操作与OneFlow下一个step的计算图执行也是并行的。OneFlow对每个执行图进行了划分，分成了不同的临界区（Critical Section）。不同临界区之间可能互斥，可能不互斥。对于不互斥的临界区，可以完全并行执行。控制多个执行子图的并行执行的Actor实际上是一个可重入锁（Reentrant Lock）。OneFlow使用可重入锁+临界区的方式实现了控制逻辑跟计算逻辑流水并行，将控制逻辑的执行时间完全掩盖。

<strong>数据搬运是一等公民</strong>
在一些框架中，因为历史的局限，框架设计之初未对数据搬运进行深入的思考。在单机单卡的时代，这基本没有什么影响，传输开销往往被掩盖在计算开销之下。

但在分布式场景下，由于数据搬运的复杂度显著提高，若没有全面的考虑，很容易造成计算开销无法覆盖传输开销，从而使得实际加速比大大低于理论值。

OneFlow 在最初就确定了“数据搬运是一等公民”的准则，在 OneFlow 中，数据搬运与数据计算的地位等同，在计算图中会<strong>显式</strong>表示数据搬运与数据传输节点，并同其它节点一同进行图优化。在通常的数据并行下，反向传播时OneFlow会尽量把模型同步（AllReduce）过程掩盖在后向计算过程中，使得传输开销尽可能被计算开销所掩盖，从而使分布式训练加速比尽可能的高。而在更复杂的模型并行、混合并行、流水并行、异步参数更新（SSP）等深度学习训练过程中，OneFlow以一套非常简洁的Placement + SBP机制覆盖了所有复杂的情况，同时最大化掩盖传输开销，使得各种复杂的分布式并行训练的加速比都尽可能的高。

关于OneFlow中Actor机制和Placement + SBP机制的独特设计介绍可以参考我之前的一篇回答：

[如何评价 7 月 31 日一流科技开源的深度学习框架 OneFlow？](https://www.zhihu.com/question/409036335/answer/1373468192)
<strong>OneFlow性能优化揭秘——单卡性能极致优化到世界最快</strong>
下面介绍OneFlow在GPU上的CUDA性能优化经验。

<strong>GPU的硬件结构与执行原理</strong>
我们首先分享一些重要的GPU基本概念：

<strong>1. Kernel</strong>

深度学习框架中的所有算子都会转化为GPU上的CUDA kernel function，每个kernel都会根据配置参数在GPU上由非常多个线程并行执行，GPU计算高效就是因为同时可以由数千个core（thread）同时执行，计算效率远超CPU。

<strong>2. Thread Hierarchy</strong>

逻辑上thread被分成了3个层次：

- thread：每个thread都会运行一次CUDA kernel function，thread之间平等无优先级。
- block： 一组thread，通常放在<strong>SM</strong>（Streaming Multiprocessor）上执行。
- grid：一组block，通常一次CUDA kernel所执行的所有thread都放在一个grid中。
![](https://pica.zhimg.com/v2-744ca92cdbbc16088a8b1d4fdd156d9a_r.jpg)GPU Thread Hierarchy而在硬件上，thread仅有2个层次：

- core： 真正执行一个thread的核。
- warp：硬件上并行执行的32个线程称之为一个warp，同一个warp的32个thread执行同一条指令。<strong>warp</strong>的概念非常重要，是GPU调度执行的基本单元，后续的很多性能优化都基于<strong>warp是一组（32个）执行同一条指令的线程</strong>这个约束进行优化的。

<strong>3. Memory Hierarchy</strong>

GPU的内存层次分为三层：global memory，shared memory， local memory。内存层次如下图所示：

![](https://pica.zhimg.com/v2-16dc1a77334d8b9b6286ac9b64e45202_r.jpg)GPU Memory Hierarchy
- Global memory 可以被所有thread访问。位置是在device memory上，并配置了L1、L2缓存。Device memory访问延迟（access latency）高，访问带宽（bandwidth）低。
- Local memory 是每个thread内部私有的，但位置也是在device memory上，所以延迟差不多一样高，带宽差不多一样低。
- <strong>Shared memory</strong> 是每个block的所有thread共享同一块shared memory，对block内部的thread可见，当block执行结束时会被释放。由于shared memory存储位置是在片上内存（<strong>on-chip memory</strong>），所以不需要缓存，<strong>读取速度很快</strong>。
- 由于我们无法控制L1、L2缓存的数据存放方式，所以CUDA性能优化中很重要的一块就是如何尽可能利用shared memory来加速访存
- shared memory在硬件上被分成了32个大小相等的<strong>bank</strong>，每个bank对应warp中的每个thread。
- 这32个bank可以同时被访问，当32个thread各自访问32个bank的数据，仅需要一次内存传输。如果不同的thread访问同一个bank的不同数据，会产生bank访问冲突，此时内存访问会被序列化，从而发生多次内存传输。如果不同的thread访问同一个bank同一位置的数据，不会产生冲突，此时会触发broadcast广播给多个thread。<strong>4. Streaming Multiprocessor</strong>

整个GPU由多个<strong>SM</strong>（multithreaded Streaming Multiprocessor）构成。当一个Kernel被GPU加载执行时，一个grid上的多个block会分配给多个SM去执行。一个block内部的多个thread均在同一个SM上并发执行。多个block上的thread也可以并发的在同一个SM上执行。一个SM上通常可以同时并发执行上百个thread，为了管理这些线程，GPU使用一种叫做 [SIMT](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/cuda-c-programming-guide/index.html%23simt-architecture)（Single-Instruction, Multiple-Thread）的架构。而[Hardware Multithreading](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/cuda-c-programming-guide/index.html%23hardware-multithreading)描述了SM内部的两种级别的并行方式：一个thread内部的指令级别并行 与 硬件上多个core之间的线程级别并行。

<strong>4.1 SIMT：Single Instruction Multi Thread</strong>

SM内部，thread以<strong>warp</strong>为单位被创建、管理、调度和执行。每个warp包含32个线程。

当多个block被分配个一个SM执行时，这些block会先分成多个warp，每个warp里的32个线程是按照thread id有序的递增的，每个warp由warp scheduler调度执行。由于一个warp内的32个thread在同一时间执行同一条指令，所以当32个thread的指令执行路径完全一致时效率最高。如果有分支判断，那么一个warp会分别执行每个分支路径的指令，不在当前分支的thread会被停用。

<strong>4.2 Hardward Multithreading</strong>

每个warp的执行上下文（execution context，如程序计数器 和 寄存器等）在warp的整个生命周期内都被保存在片上内存（on-chip memory）。因此从一个执行上下文切换到另一个执行上下文是无开销的。在每个指令执行时间里，warp scheduler都会选择一个warp，这个warp中的所有thread都准备好执行它的下一个指令，warp scheduler会向这些thread发送指令并执行。那么等待这个warp准备好的这段时间（即时钟周期数）就是执行延迟（<strong>latency</strong>），为了掩盖这个延迟，warp scheduler可以在延迟期间发指令给其他的warp，因此一个SM内的warp数越高，延迟掩盖会越充分，利用率和性能也会越高。而一个SM上同时能并发存在多少个warp和block，是跟该SM上的寄存器数量和shared memory大小相关的。

<strong>GPU性能优化原则与目标</strong>
深度学习框架性能优化的最终目标是深度学习模型训练最快，从而使得完成训练的时间最短，节省模型训练开发周期和用户的时间成本。OneFlow在系统架构层面使用流水线掩盖了控制逻辑、数据加载和传输，剩下的优化目标就是在GPU上的计算时间最短，即单个step的计算图在GPU上的执行时间最短。

GPU最主要提供的是两种资源：<strong>计算资源</strong> 和 <strong>显存带宽资源</strong>。如果我们能将这两种资源充分利用，且对资源的需求无法再降低，那么性能就优化到了极限，执行时间就会最短。

在大多数情况下，深度学习训练中的GPU计算资源是被充分利用的，因为大多数对计算需求很高的算子都使用cuDNN或者cublas提供的高性能接口。而OneFlow单卡性能最快的秘诀就是尽可能充分利用了显存带宽资源。

<strong>如何评估一个CUDA Kernel是否充分利用了显存带宽资源？</strong>

对于显存带宽资源来说，“充分利用”指的是Kernel的有效显存读写带宽达到了设备显存带宽的<strong>上限</strong>，其中设备显存带宽可以通过执行 cuda中的的bandwidthTest得到。 Kernel的有效显存带宽通过Kernel读写数据量和Kernel执行时间进行评估，读写数据量 / 执行时间 = 当前Kernel的有效显存带宽。

<strong>OneFlow GPU性能优化方法一：减少全局内存的访问</strong>
从GPU的内存层次（Memory Hierarchy）概念中我们知道，global memory的访存速度是远低于shared memory的（低一个数量级以上），访问global memory的次数越多，GPU计算的延迟就会越高。所以减少global memory的访问可以明显提升GPU计算的性能。

OneFlow内部使用多种方法减少global memory的访问从而加速计算过程。

<strong>1. Element-wise kernel fusion</strong>

将element-wise的Kernel跟上一个计算Kernel合并，通常可以减少global memory的访问需求。OneFlow的计算图优化阶段会进行一些算子融合操作，其中重要的优化就是视情况尽可能将element-wise op跟前面的op合并。如：将add合并到前面的conv_data_grad、bn、dropout、matmul等op上。下面我们以dropout + add 子图举例解释为什么这样的fusion可以提升性能。

下图中左图是dropout op后接一个add op的子图结构，右图是算子融合后的op结构：

![](https://pic1.zhimg.com/v2-d23c979dd9af8f4a9c2aa0a1b9374f4c_r.jpg)dropout + add fusion假设数据类型为Float，Dropout的mask输入可以是bool型，设Dropout op的In_data输入大小为D，In_mask大小为D/4，易得Dropout op的输出Out_d、Add op的输入In_1和输出Out_a的大小均为D，故算子融合之前整个子图对global memory的读写操作共计：`(3 * D + D / 4) +  2 * D`，当Dropout与Add两个op合并以后，Out_d的中间结果可以不存放在global memory上，而是和 In_1的结果相加之后再写入global memory，这样就可以省去大小为D的一次读和一次写操作，总的global memory的读写操作共计：`(2 * D + D / 4) + D`，减少了2D大小的global memory访存开销。

<strong>2. 借助shared memory合并带有Reduce计算的Kernel</strong>

如Softmax op的计算逻辑如下，在其计算实现中，分别调用了ReduceMax、BroadcastSub、Exp、ReduceSum、BroadcastDiv等CUDA Kernel function，进行了多次的global memory访存操作。

![](https://pic1.zhimg.com/v2-c9fa6d29af39eb49e438ea16abeca2ba_r.jpg)Softmax Kernel 执行图假设数据In的大小为D，则整个softmax计算中的global memory访存操作共计：`7 * D + 4`。由于计算中有ReduceMax和ReduceSum，所以无法按照element-wise fusion的方式直接合并。OneFlow的Op优化中借助了GPU的shared memory进行Kernel融合操作。融合后的Kernel仅读一次in，写一次out，global memory的访存操作仅剩 `2 * D` ，大大减少了global memory的访问。深度学习网络中的softmax通常输入in的shape为`(n, c)`，其中n表示instance个数，c表示每个instance的feature大小。softmax里的reduce操作都是针对每个instance，所以softmax的CUDA kernel可以按照block划分，每个block处理一个instance的所有运算，我们借助cub::BlockReduce操作计算ReduceMax和ReduceSum。fusion后的softmax Kernel会在一开始把输入的in加载到shared memory中，每个block的shared memory加载一个instance的feature，shape为`(1, c)`。后续的所有中间计算结果都保存到shared memory中，只将最后的输出out写到global memory里。需要注意的是，这种fusion仅在c在一个适当的范围里才能使用，过小会浪费block的thread资源，过大会由于shared memory资源不够，导致Kernel启动失败。

<strong>3. 减少实际需要的访存大小</strong>

除了上述两种通过减少global memory作为中间结果导致的显存带宽占用以外，我们也可以通过减少实际需要的访存大小来达到加速的目的。以非常常见的relu为例，relu的后向op relu_grad在做计算时，消费前向的输入x或者输出y（一般是消费输出），但其实后向计算仅需要判断对应位置的元素是否大于0，所以可以将后向对y的消费替换为一个前向op产出的bitset，理论上可以省掉冗余访问y的操作，可以减少大约1/3的global memory访问。下图展示了这种优化技巧的示例。

![](https://pic2.zhimg.com/v2-f385f14c2fb851ccae07f1398c4ee6b1_r.jpg)假设x的大小为D，则Relu_grad Kernel需要读写`3 * D`的数据，如果将y的消费变成bitset，以float32数据类型为例，优化后的读写数据量为 `2 * D + D / 32`，节省了大约D大小的冗余访存操作。本小节仅解释了使用bitset可以降低global memory的访问需求。但在CUDA Kernel编程中，如何才能更高效的使用bitset完成并行计算，我们放在下一小节介绍。

<strong>OneFlow GPU性能优化方法二：确保全局内存访问合并</strong>
“确保全局内存访问合并是NVIDIA的CUDA C++编程最佳实践里的重要准则之一，适用于所有的GPU架构。在解释OneFlow应用这个准则的技巧之前，我们先回顾一下“GPU硬件结构与执行原理”章节中的线程层次和内存层次概念。一个warp中的32个thread会同时执行同一条指令，访问内存（读或者写）就是其中一条指令。在GPU架构中，访问内存的基本单元是一次<strong>内存事务</strong>（Memory Transaction），表示一个单元的内存在两个不同的内存区域中移动。比如一次从device memory到L2 Cache的内存拷贝就是一次内存事务。

需要注意的是，如果一个warp中的32个thread访问<strong>连续</strong>的32字节的内存数据时，会触发内存访问合并，此时仅需要一次内存事务（即一条指令）就能完成访存操作。所以“确保全局内存访问合并”这个准则就是希望一个warp内对global memory的读写操作合并到尽可能少的内存事务中，使得内存带宽被尽可能充分利用，最终Kernel的执行速度更快。对于capability 6.0及以上版本的GPU，当warp中内存访问地址对齐32字节的整数倍且thread间访问内存连续时，内存访问效率最高。

![](https://pic3.zhimg.com/v2-d809c6c40661905337856057493357c2_r.jpg)warp内存访问首字节对齐与否对内存加载的影响上图展示了内存访问地址首字节对齐与否对内存访问效率的影响：当一个warp中的thread访问地址为连续的128字节（96-224），且首地址（96）是32的整数倍时，全局内存访问可以合并成4个32字节的内存事务，访问效率最高。当warp中thread访问地址不对齐32的整数倍时，（如图中下面的例子，首地址为100），即使访问的内存也是连续的128字节（100-228），内存访问也会合并成5个32字节的内存事务，有效带宽是实际访问带宽的4/5。

当一个warp中的thread对全局内存访问不连续时，内存访问效率会非常低。比如warp内的thread按照stride=2访问128字节的全局内存（写128字节的数据），原本连续写128字节的数据仅需要4个32字节的内存事务即可完成，而stride=2时，thread需要访问256字节的全局内存，共8个32字节的内存事务。由于我们需要写global memory的一部分，所以需要先把这部分内存读出来，修改其中对应部分的值，再写回去，总共需要8个读内存事务和8个写内存事务，实际共需要16个内存事务，有效带宽降到了实际访问带宽的1/4，即实际执行时间是理论时间的4倍。下图展示了在写128字节的数据时，stride = 1 和 stride = 2实际需要的内存事务数量的差别。

![](https://pic1.zhimg.com/v2-a7105c9e89df1776f6c7a42112dc10e6_r.jpg)warp写全局内存时，stride = 1 或 2 对内存访问带宽的影响下图我们列出了warp中thread内存访问不连续时，显存带宽随着内存访问stride增大时的变化曲线，当stride增大时，显存带宽明显减少。

![](https://picx.zhimg.com/v2-da7b05e9cbbdb659391529dd1d241f15_r.jpg)内存访问带宽随着stride变化而快速减小我们借由OneFlow中的bn_add_relu Kernel实现来展示OneFlow对全局内存访问合并的性能优化。在上一节的“减少实际需要的访存大小”优化技巧中，我们提到Relu Op的后向relu_grad消费前向的bitset mask可以达到减少访存的目的，该bitset mask中的每个比特的0/1表示了原本输入中对应位置的元素是否大于0。但是如何生成这个bitset mask使得Kernel的访存尽可能快？我们提供了几种不同的方案，通过每个方案的实际内存访问效率来选择更优的实现方案。

- <strong>Bitset mask生成方案一：顺序遍历法</strong>
这种方案是一种最直观的从左到右遍历的方案，每个thread连续读取8个元素，根据每个元素是否大于0生成一个int8类型的mask，并写入到最终的bitset mask中。这种访问对于写全局内存是连续访问的，但对于读（Read）全局内存，线程间内存访问不连续，所以没有充分合并内存事务。下图展示了这种方案读写内存的示例：
![](https://pic3.zhimg.com/v2-39fb98c00de79ed6b6a5b8d1c5a91fe2_r.jpg)顺序遍历生成bitset mask在这种方案中，每个thread读连续的8个float32数据，则相邻线程每次加载数据的间隔为`32 bytes = 4 bytes * 8`。所以每个线程一次加载指令就要执行一个32字节的内存事务。故warp内的线程间<strong>全局内存访问完全没有合并</strong>，实际有效访存带宽仅为 1/8，访存效率十分低下，性能很差。

- <strong>Bitset mask生成方案二：间隔读取法</strong>
每个thread间隔n访问8个元素，并写入一个int8的mask中。这种方案中，warp内thread之间的读写全局内存访问都是连续的。该方案下内存事务可以充分合并。下图展示了这种方案读写内存的示例：
![](https://pic3.zhimg.com/v2-35b23fe78b04e0d0d05789da6cdeca44_r.jpg)间隔读取生成bitset mask其中thread 0依次读取第`0, 0+n, ... , 0+7*n`个元素（共8个），并根据这8个元素是否大于0转化成8bit的mask，并最终写到int8 mask的全局内存的第0个元素中；thread 1依次读取第`1, 1+n, ... , 1+7*n`个元素（共8个），并根据这8个元素是否大于0转化成8bit的mask，并最终写到int8 mask 的全局内存的第1个元素中。warp中的各个thread的内存访问顺序以此类推。在这种方案中，warp内的各个thread间内存访问连续，一个warp内的32个线程可以合并成4个32字节的内存事务，<strong>全局内存访问完全合并</strong>，内存访问效率很高。但该方案的缺点是生成的mask里的每个bit代表的元素与原始数据中的元素顺序不对应，需要在生成mask和使用mask的Kernel中额外维护这个信息。

- <strong>Bitset mask生成方案三：warp同步法</strong>
我们可以使用warp级别的同步原语：`__ballot_sync(unsigned mask, predicate)`实现更优的内存读写方案。该函数接受两个参数，第一个参数是warp中参与计算的线程掩码（可以由`__activemask()`得到），第二个参数是要参与判断的布尔值，该函数返回一个32bit的mask，每个bit代表warp中各个thread传入的元素是否为True。最后由<strong>该warp中的第0个thread</strong>将生成的mask写入到全局内存中。该方案的示意图如下：
![](https://pic4.zhimg.com/v2-616187bc7dbd72075d7e9d1c52bd531b_r.jpg)使用warp级别同步原语生成bitset mask每个warp中的0-31号thread分别读取0-31号元素，并判断是否大于0，传入`__ballot_sync`中得到32位的warp mask，并由该warp中的第0个thread将该warp mask写入到全局内存中。

但该方案也有优化空间：虽然每个warp的读全局内存可以合并成4个32字节的内存事务，但是该warp每次只能写一个4字节的数据（32位的warp mask）浪费了写全局内存的访存带宽，因此可以让每个warp连续写8个Int32的mask，使得写全局内存也能合并成一个内存事务，从而达到最优效率。

<strong>OneFlow GPU性能优化方法三：优化Kernel计算量</strong>
虽然在很多计算需求量大的Kernel都使用了cuDNN的实现，Kernel计算量无法再优化。但仍有一些Kernel可以通过减少计算量的方式实现加速。下面我们就举几个OneFlow的Kernel优化中减少Kernel计算量的优化技巧。

<strong>1. 减少坐标变换的次数</strong>

对于像Transpose这样的数据重排列的Kernel，我们并不关心里面数据具体的值，而是仅涉及到数据的搬运，此时将小数据类型（如2字节的half类型）合并成一个大的数据类型（如8字节的int64），可以使得计算量减少到原来的1/4。 在通常的Transpose Kernel实现中，坐标变换涉及到整数除法，速度很慢，性能瓶颈主要来自于整数除法，而通过合并数据类型，可以减少坐标变换的次数，从而加速Kernel的执行时间。

<strong>2. 根据Tensor的Shape优化计算量</strong>

我们举一个BiasAdd的Kernel例子，其性能瓶颈也主要来自于坐标换算的整数除法。BiasAdd中要处理的Tensor的Shape为`(outer_size, bias_size, inner_size)`，我们可以根据shape的`inner_size == 1`或者`outer_size == 1`，实现两个特殊的Kernel，使得坐标换算的`(1 % block_size) / inner_size`中的除法和取模运算被节省掉，从而提升一倍的性能。

<strong>3. 尽量使用int32表示下标</strong>

当Tensor中的元素个数较少时，使用int32类型表示坐标会比int64类型表示坐标计算更快。

<strong>4. 表达式的等价变换</strong>

在坐标变换时，通常会遇到先除后取模的情形，此时如果把取模运算改写成乘法运算可以提升性能。如下所示：

// before
row = offset / row_size;
col = offset % row_size;
// after
row = offset / row_size;
col = offset - row * row_size;

<strong>OneFlow GPU性能优化方法四：延迟隐藏</strong>
<strong>指令延迟</strong>指从指令发出到完成之间的时钟周期。<strong>指令吞吐</strong>指每个时钟周期可以完成多少条指令。如何尽可能掩盖指令延迟从而达到最快性能称之为延迟隐藏。在GPU硬件架构中，我们可以借由利特尔法则(Little‘s Law)估算出: 

隐藏延迟所需要的活跃warp的数量 = 指令延迟 x 指令吞吐。

![](https://pica.zhimg.com/v2-0e67c853e4e94baaea1e6da1a02ab274_r.jpg)<strong>估算计算指令的延迟隐藏所需warp数：</strong>

对于capability 7.x 的设备，指令的延迟通常是4个时钟周期，假设指令吞吐量为4，这意味着SM中活跃的warp数至少是16才能掩盖计算指令延迟。

<strong>估算访存指令的延迟隐藏所需warp数：</strong>

在显存带宽为瓶颈的Kernel中，假设一个warp访存指令的延迟为200时钟周期，内存访问操作的吞吐为1/20，则意味着SM中活跃的Warp数至少为10才能掩盖访存指令延迟，在SM调度过程中，当最大的活跃warp数少于隐藏延迟需要的活跃warp数时，则不能充分利用显存带宽资源。

<strong>通过合并数据类型实现延迟隐藏</strong>

OneFlow中的RandomMaskGenerator Kernel需要生成随机数，判断是否大于0，并将bool值写入int8的mask中。由于每个线程需要占用一个48字节的状态变量，因此应该使用尽量少的thread数和block数，避免占用太多资源。但是启动的block数量较少，且每个block的thread数量较少，对于int8类型，更难掩盖指令延迟，因此我们将16个1字节的int8类型数据合并成16字节的ulonglong2类型数据，之后再进行写global memory操作，尽可能隐藏延迟，达到更好的性能。

<strong>OneFlow 其他GPU性能优化小技巧</strong>
<strong>1. 使用常量下标访问小数组</strong>

从GPU的内存层次中我们知道local memory跟global memory的访问速度都很慢。如果Kernel中我们定义了一个小数组，且访问该数组的index不是常量（即需要运行时动态确定），那么该数组就会存储在local memory中，访问速度比on-chip（片上内存）差很多。所以在Kernel的实现代码中，应尽量使用常量下标访问小数组。

<strong>2. 注意代码之间的读写顺序</strong>

如果一个数据被读取了两次，且两次之间发生了写其他数据的操作，那么编译器会生成两条读指令，因为编译器无法确定写操作和读操作之间有没有重叠的部分，故无法优化成一条读指令。

<strong>3. 尽量避免分支</strong>

应尽量避免分支，尤其是尽量避免分支内访存。如果在分支判断条件内访问全局内存，则warp内会分多次执行访存指令，使得有效带宽降低。

<strong>参考资料</strong>

- [CUDA C++ Best Practices Guide](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html%23abstract)
- [CUDA C++ Programming Guide](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/cuda-c-programming-guide/index.html%23cuda-c-runtime)
- [Tuning CUDA Applications for Turing](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/cuda/turing-tuning-guide/index.html%23abstract)
- [CUDA Pro Tip](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/blog/tag/pro-tip/)
- [NVIDIA Developer Blog](https://link.zhihu.com/?target=https%3A//developer.nvidia.com/blog/)
- [NVIDIA Deep Learning Performance](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/deeplearning/performance/index.html)
<strong>总结</strong>
OneFlow拥有先进的系统架构设计，同时有最优秀的团队对算子实现进行深度优化，从而成为了致简致快的深度学习框架。我们相信，OneFlow可以在任何深度学习场景中都成为世界最快的框架，未来会在更多场景和应用中发布模型的最快实现，敬请期待。

当然OneFlow的目标不仅仅是最快的深度学习框架，还要成为最好的深度学习框架，我们团队正在全力提升OneFlow框架的完备性和易用性（如Serving 和 OOP接口），相信在不远的将来，大家都会更愿意使用OneFlow进行深度学习训练，体验又快又好的模型开发过程，更高效的解决一个又一个的人工智能难题，探索由数据驱动带来的更美好的世界。

OneFlow开源代码仓库：[https://github.com/Oneflow-Inc/oneflow](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/oneflow)

OneFlow官网： [https://www.oneflow.org/](https://link.zhihu.com/?target=https%3A//www.oneflow.org/)

OneFlow文档：[https://docs.oneflow.org/](https://link.zhihu.com/?target=https%3A//docs.oneflow.org/)

OneFlow模型库：[https://github.com/Oneflow-Inc/OneFlow-Benchmark](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/OneFlow-Benchmark)

OneFlow API Reference： [https://oneflow.readthedocs.io](https://link.zhihu.com/?target=https%3A//oneflow.readthedocs.io)

DLPerf深度学习框架性能评测仓库：[https://github.com/Oneflow-Inc/DLPerf](https://link.zhihu.com/?target=https%3A//github.com/Oneflow-Inc/DLPerf)

成诚

2020/11/2