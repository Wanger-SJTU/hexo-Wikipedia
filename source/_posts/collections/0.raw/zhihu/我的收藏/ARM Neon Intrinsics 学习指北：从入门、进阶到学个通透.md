---
title: "ARM Neon Intrinsics 学习指北：从入门、进阶到学个通透"
date: "2021-03-21 00:00:00"
updated: "2021-03-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/ARM-Neon-Intrinsics-学习指北-从入门、进阶到学个通透/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/358603760"
---


本文同步发表于GiantPandaCV公众号，未经作者允许严禁转载

### 前言

        Neon是ARM平台的向量化计算指令集，通过一条指令完成多个数据的运算达到加速的目的，常用于AI、多媒体等计算密集型任务。

       本文主要是一篇对ARM官方资料的导读。笔者根据自己Neon学习经历，将这些资料按照逻辑进行组织，以期减少读者的学习成本。

       本文讨论的是Neon 的<strong>intrinsics</strong>，而非<strong>assembly</strong>。intrinsics是以类似调用C语言函数的方法调用Neon，并由编译器生成最终的二进制代码，assembly则是手工嵌入Neon汇编，直接生成二进制代码。如果您想了解的是Neon assembly，可以参考[这篇文章](https://zhuanlan.zhihu.com/p/143328317)。笔者后续也会补充assembly的内容。

        下文将按以下目录组织，方便读者选读感兴趣的内容。

<strong>1.入门：基本能上手写Intrinsics</strong>

### 1.1  Neon介绍、简明案例与编程惯例


### 1.2  如何检索Intrinsics 


### 1.3  优化效果案例


### 1.4  如何在Android应用Neon


<strong>2. 进阶：注意细节处理，学习常用算子的实现</strong>

### 2.1  与Neon相关的ARM体系结构


### 2.2  对非整数倍元素个数(leftovers)的处理技巧


### 2.3  算子源码学习（ncnn库，AI方向）


### 2.4  算子源码学习（Nvidia carotene库，图像处理方向 ）


<strong>3. 学个通透：了解原理</strong>

### 3.1   SIMD加速原理


### 3.2   了解硬件决定的速度极限：Software Optimization Guide


### 3.3   反汇编分析生成代码质量


<strong>4. 其他：相关的研讨会视频、库、文档等</strong>

### 1 入门

<strong>1.1  Neon介绍、简明案例与编程惯例</strong>

        推荐阅读 <strong>Optimizing C Code with Neon Intrinsics</strong>（ARM官方）

       以HWC转CHW（permute）操作、矩阵乘法为例子，介绍如何将普通C++实现改写为Neon Intrinsics的实现。

<strong>重点：</strong>第6小节<strong>program conventions</strong>（编程惯例）介绍了Neon输出输出的对象类型和intrinsics命名规则。Intrinsics命名规则还是比较复杂的（如下图），如果没弄清楚，后期可能会检索不到需要的intrinsics或误用intrinsics。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dc406e2e5540.png)

Intrinsics命名规则（具体含义见链接）<strong>1.2 如何检索Intrinsics</strong>

        在1.1了解改写方法后，将自己的代码用相应的Intrinsics改写，即可应用Neon加速。ARM官方制作了检索页面，支持模糊搜索，支持通过搜索操作名找 intrinsics。

        以float32类型的点对点乘法intrinsics <strong>vaddq_f32</strong>（q的含义请查阅上面命名规则，了解命名规则真的很重要）为例，从上到小描述操作、对应的汇编指令、入参、出参、伪代码和支持该intrinsics 的架构。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3230acb6c2df.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c43600238840.jpg)

检索示例<strong>注意兼容性问题：</strong>核查intrinsics是否能用于项目所需兼容的全部架构。例如，笔者进行的项目需要兼容新旧手机，且当前只能集成ARMv7a（新旧手机均能运行，即<strong>图中的v7</strong>）架构的so库，而Aarch64（仅新手机支持，即<strong>图中的A64</strong>）架构的so库尚不支持。如果某条intrinsics的supported architectures只有A64，那么在编译ARMv7a架构的so库时将会无法通过编译。对于这种情况，只能放弃使用这条intrinsics，改用多条intrinsics拼凑出等效实现（这意味指令数的增加和性能的降低，为了兼容性这是无可奈何的事情）。

<strong>1.3  优化效果案例</strong>

        为了应用Neon需要学那么多东东，究竟能达到怎样的效果？Intrinsics优化生成的汇编还和人工优化手写的汇编还有多少差距？别急，我们可以看下带有速度benchmark的案例，例如BBuf 写的<strong>一份朴实无华的移动端盒子滤波算法优化笔记</strong>

[](https://zhuanlan.zhihu.com/p/170611395)

        直接把优化结果摘出来

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ec2e15a87f53.jpg)

优化结果        优化好算法后，普通C++实现是302.00ms（不排除编译器优化了部分运算，生成了部分Neon指令），Intrinsics实现是188.37ms，最优Assembly实现是145.92ms。Intrinsics优化和Assembly优化分别加速了约<strong>38%</strong>和约<strong>52%</strong>，Intrinsics优化生成的代码还和手工优化的Assembly存在差距。但注意到，如果仅是单纯地用Assembly改写C++，优化效果和Intrinsics一样（188.37ms VS 187.70ms），进一步的性能改进来自于额外的预取指令(pld)和对双发射流水(硬件设计)的利用。<strong>简而言之，如果项目留有足够的优化时间并且对体系结构的驾驭能力有信心（至少速度不会低于Intrinsics），选择Assembly优化，否则选择Intrinsics优化。</strong>

<strong>1.4  如何在Android应用Neon</strong>

        直接参考ARM官方的Demo制作教程（还带了演示编写代码的视频）

        其实核心点就是，在Gradle加上Neon的启用命令（如下红框），然后在cpp <strong>#include</strong>，写就完事了。余下的都是带Native代码的安卓开发的知识。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ab104f3a70ef.jpg)

启用Neon<strong>关于在iOS开发中启用Neon（Xcode，版本12.3）</strong>：笔者尝试过将Android的NDK代码迁移至iOS，在不修改Xcode任何设置的情况下，arm_neon.h可找到，编译可通过，那说明Xcode默认打开了Neon的启用开关，写就完事了。

### 2 进阶

<strong>2.1  与Neon相关的ARM体系结构</strong>

        利用指令集加速，无一例外地要利用专用寄存器这种在CPU上稀少、宝贵的资源。专用寄存器用少了CPU的性能不能充分发挥，用多了则会产生寄存器溢出(Register Spilling）这种对性能有明显负面影响的问题。因此，我们至少需要了解在编写Neon代码时，有多少个专用寄存器可供利用，这就涉及到体系结构的知识。推荐阅读ARM官方的<strong>Introducing Neon for Armv8-A</strong>

<strong>重点：</strong>

（1）了解registers， vectors，lanes， elements的概念以及它们对专用寄存器的占用；

（2）新的Armv8a架构有<strong>32个128bit</strong>向量寄存器，老的ArmV7a架构有<strong>32个64bit（可当作16个128bit）</strong>向量寄存器，编码时记得数一下占用多少个专用寄存器（例如1个float32x4就占用1个128bit寄存器），别用过量了，避免寄存器溢出(Register Spilling）导致的负优化。

        如果对ARM体系结构感兴趣，可以阅读更系统的Cortex-A Series Programmer's Guide。

<strong>2.2 对非整数倍元素个数（leftovers）的处理技巧</strong>

        一条Neon指令最多可以计算4个float32，或者8个float16，或者16个int8。假设现在有3个或5个（<strong>即不是4的整数倍</strong>）float32需要计算，请问应该怎样解决呢？

        ARM官方的<strong>Coding for Neon（第4节 Load and store - leftovers）</strong>给了处理技巧

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5a1c113f8cc6.jpg)

处理leftovers的3种方法

        除了处理leftovers，文章中还有一些骚操作值得学习，比如一条指令完成的shifting and inserting。

<strong>2.3  算子源码学习（ncnn库，AI方向）</strong>

[](https://link.zhihu.com/?target=https%3A//github.com/Tencent/ncnn/tree/e16b338b136c94805bc7d0ef3756f2dc4bfa3408/src/layer)

        ncnn是腾讯开源，nihui维护的AI推理引擎。2017开源至今，其代码依然保持着组织结构简单、易重用的优点。ncnn实现的算子包含普通实现（无针对平台的加速）和针对3种平台（arm/vulkan/x86）的指令集加速实现（注：有的算子朴素实现有，但平台加速实现不一定有，毕竟做加速实现还是比较耗费精力的，致敬nihui大大）。

        Neon实现往往跟循环展开等技巧一起使用，代码往往比较长。我们可以先阅读普通实现的代码实现了解顶层逻辑，再阅读Neon实现的代码。例如，我们希望学习全连接层（innerproduct）的Neon实现，其普通实现的位置在ncnn/src/layer/innerproduct.cpp，对应的Neon加速实现的位置在ncnn/src/layer/arm/innerproduct_arm.cpp。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_41b5b1f1a0bf.jpg)

ncnn的算子代码组织逻辑        注意代码中出现较多的条件编译。原因我们上文提到过，有的intrinsics是较新Aarch64架构下专有的，为了兼容较老的ArmV7a架构，对于不能用的intrinsics只能用多条兼容的intrinsics等效替代。为了保证Aarch64下的性能同时保证对ArmV7a的兼容性，ncnn采用条件编译的方式处理不兼容的intrinsics（条件编译就是编译满足条件的分枝的代码，不满足条件的代码将不出现在最终的二进制文件汇总）。

        如果你只关注Aarch64平台下的实现，下图<strong>#else</strong>分支的代码跳过不看即可。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_57c843a1450f.jpg)

innerproduct_arm代码（部分）<strong>2.4  算子源码学习（Nvidia carotene库，图像处理方向 ）</strong>

[](https://link.zhihu.com/?target=https%3A//github.com/opencv/opencv/tree/master/3rdparty/carotene)

        了解carotene库的人应该不多，但了解OpenCV的人应该不少吧？carotene能够作为OpenCV的第三方库（third party）存在，足以证明其代码质量。

        carotene的组织结构同样简单，且不依赖OpenCV的数据结构，想用想学习哪个函数直接提取出来即可。如下图，里面主要用Neon实现了色彩空间转换、均值滤波、Canny边缘检测等常见的图像处理算子。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a0e2ef03e10c.jpg)

carotene库<strong>3. 学个通透</strong>

<strong>3.1   SIMD加速原理</strong>

        即使到了这里，我们仍然对Neon（或类似的SIMD指令）为什么能加速我们的代码充满疑问。我们可以在这本书（计算机体系结构的圣经之一）找寻答案——<strong>《计算机体系结构：量化研究方法》。</strong>Neon是ARM平台的SIMD（Single Instruction Multiple Data，单指令多数据流）指令集实现，书中4.1~4.3讨论了SIMD。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_44658447381b.jpg)

SIMD相关目录摘录        笔者的学习总结如下：

（1）通过加长的寄存器减少数据的读取/写入次数，从而减少将数据读入寄存器的时间开销。例如Neon可以一次性将16个int8（16*8=128bit）数据读入专用寄存器，这一次读取时间开销，明显少于16个int8数据一个一个地读入的时间之和。写入同理。（注意不要和cache的作用混淆。cache作用：访问某个数据的同时，与该数据相邻的数据一同被加载到cache中，当需要访问相邻数据时，从cache取数比从内存取数快得多，从而达到加速效果。然而，即使是从最快的L1 cache取相邻的数据，仍然是需要花费额外的时钟周期。而SIMD取相邻的数据只计一次访问时间）。

（2）执行SISD（single instruction, Single data，单指令流单数据流，这里可理解为标量计算）指令时，需要完成（时间开销大的）冒险（hazard，包括数据冒险和结构冒险）检查。SIMD指令计算的数据蕴含着这些数据之间无依赖性，也就从指令集层面回避了不必要的时间开销。


### 3.2   了解硬件决定的速度极限：Software Optimization Guide


        我们可能还要关心，我们所编写的Neon Intrinsics，可以将手头上硬件的性能发挥到多少水平？是否还有提升空间？这些是好问题。

         在讨论一个问题前，先插入一个使笔者拍案叫绝的相关案例：在另一本计算经典《深入理解计算机系统》的第5章 优化程序性能 中，该书作者考虑若干计算机硬件特性，将矩阵乘法连续优化了6个版本，直至优化到了该x86 CPU的吞吐量上限（注：<strong>延迟latency</strong>主要关注单个数据的执行情况，<strong>吞吐量throughout</strong>主要关注整个系统的执行情况，因此我们更关注的是吞吐量。因为CPU存在多种能在一个时钟周期内执行多条指令的设计，有个有的指令会出现吞吐量大于1指令/周期（或执行时间小于1个时钟周期，如下图）的情况）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5e8256f8e2a5.jpg)

CS:APP 截图        回到问题，我们需要知道我们的吞吐量上界是多少。ARM官方为每个CPU架构（手机CPU一般大核是A7X架构，小核是A5X架构）提供对应的<strong>Software Optimization Guide</strong>，里面有进行各种运算的<strong>latency</strong>和<strong>throughout。</strong>以A76架构（采用该架构作为大核架构的CPU例如骁龙855，麒麟980）为例子，从ARM官网下载对应的pdf，

        翻到ASIMD那里，就能查阅各条Neon指令相应的latency和throughout。不同架构的吞吐量上界会有所不同，其他架构请自行在ARM官网文档中心下载。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5281cae886da.jpg)

文档截图        理论数据有了，至于如何通过实验测试峰值，可参考BBuf的文章

[](https://zhuanlan.zhihu.com/p/268925243)

<strong>3.3   反汇编分析生成代码质量</strong>

        可通过反汇编的方式查看Intrinsics 生成的汇编是否满足预期，如果不满足预期则进行手写汇编优化。具体操作可参考梁德澎的文章

[](https://zhuanlan.zhihu.com/p/143328317)

<strong>4. 其他</strong>

        余下的是相关的研讨会视频、库和案例。第一个视频帮助我建立了优化分析思维，值得推荐。

（1）研讨会视频 "Performance Analysis for Optimizing Embedded Deep Learning Inference Software," a Presentation from Arm - Edge AI and Vision Alliance

（2）研讨会视频 LCU14-504: Taming ARMv8 NEON: from theory to benchmark results

（3）研讨会视频 HKG15-408: ARM v8-A NEON optimization

（4）Ne10（ARM官方的计算库）：

[](https://link.zhihu.com/?target=https%3A//github.com/projectNe10/Ne10)

（5）Arm Optimized Routines（ARM官方的计算、网络、字符串库）：

[](https://link.zhihu.com/?target=https%3A//github.com/ARM-software/optimized-routines)

（6）Neon优化Chromium的案例
