---
id: 44637498-9f6e-4a15-8bb9-15f46422e8d9
---

# 如何学习使用intel vtune ,arm streamline等性能分析工具？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/intel-vtune-arm-streamline-18f76f3daf0)
[Read Original](https://www.zhihu.com/question/482318092/answer/3478561247)



intel vtune ,arm streamline,perf,bcc,ebpf,pmu-tool,toplvel，simpleperf,bandw…显示全部 ​

关注者

**10**

被浏览

**2,435**

chip 也关注了该问题![chip](https://proxy-prod.omnivore-image-cache.app/0x0,sedzy3Ffbz2aLay89PR0q3OxxM8Clx8iMITBrqO1Gun4/https://picx.zhimg.com/v2-a10266505845532a4b89ef9f407f374a_l.jpg?source=c8b7c179)

创建时间：2021-08-25 10:45:46

最后编辑：2021-08-25 10:45:46

[![阿比王](https://proxy-prod.omnivore-image-cache.app/0x0,sVt7FAJA8S-GQu79UHT31CP_FFWunfLkHSIbDY3HwT5s/https://picx.zhimg.com/v2-9144a74433a11c478ed45feaa28597e7_l.jpg?source=2c26e567)](https://www.zhihu.com/people/abewangm)

[阿比王](https://www.zhihu.com/people/abewangm)

​![](https://proxy-prod.omnivore-image-cache.app/0x0,sw6GxgIn7FP2MN8-dC1y3Ri48I4i6zbz1svDKn0TUvXQ/https://pic1.zhimg.com/v2-aa8a1823abfc46f14136f01d55224925.jpg?source=88ceefae)

CPU性能和软件系统性能

​ 关注

4 人赞同了该回答

[发布于 2024-04-25 19:55](https://www.zhihu.com/question/482318092/answer/3478561247)・IP 属地广东

之前一篇文章简单介绍了自顶而下的性能分析方法论，下面简单介绍一下英特尔vTune Profiler是怎么通过PMU采集来的数据分析CPU中流水线各个部分性能的。

### PMU

使用性能监控单元（Performance Monitor Unit，PMU）进行CPU性能分析是现代计算机系统调优和故障排查的重要手段。PMU是CPU内部的一个特殊硬件组件，用于收集和报告CPU在运行过程中的各种性能数据。通过PMU，我们可以获得CPU的实时性能数据，包括指令执行速度、缓存命中率、分支预测准确率等关键指标。这些数据对于分析CPU的瓶颈和优化程序性能至关重要。例如，如果发现某个程序的执行速度较慢，我们可以使用PMU来监控其指令执行情况，从而找出性能瓶颈所在，是计算密集型任务过多还是内存访问效率不高。

PMU的使用通常需要配合特定的软件和工具。这些工具能够配置PMU以收集所需的数据，并将收集到的数据进行处理和可视化。通过分析这些数据，我们可以深入了解CPU的运行状态，找出性能瓶颈，进而优化程序或系统配置。此外，PMU还可以用于故障排查。当CPU出现故障或异常行为时，PMU可以帮助我们快速定位问题所在。例如，如果CPU的功耗过高或温度过高，我们可以使用PMU来监控CPU的功耗和温度数据，从而找出导致问题的原因。

总之，使用PMU进行CPU性能分析是一种高效、准确的方法。它可以帮助我们深入了解CPU的运行状态，找出性能瓶颈和故障所在，为系统的优化和故障排查提供有力支持。随着计算机技术的不断发展，PMU的性能和功能也在不断提升，相信在未来它将在CPU性能分析和优化方面发挥更加重要的作用。

### _微架构调优方法_

英特尔 VTune™ Profiler 提供一种微架构探索分析类型，该分析类型经过预配置，可收集自上而下表征中定义的事件，从英特尔微架构代号 Ivy Bridge 开始。微架构探索还收集计算许多其他有用性能指标所需的事件。微架构探索结果显示在分层列中以加强表征的自上而下的性质。**“摘要**”（Summary） 窗口显示整个应用程序的每个类别中管道槽的百分比。您可以通过多种方式探索结果。浏览结果的最常见方法是在函数级别查看指标。

![](https://proxy-prod.omnivore-image-cache.app/697x214,sJSqPCPuhaRDuXpTNVgGpW_D8pYXNTMNMp3ThekQl8N0/https://picx.zhimg.com/50/v2-ec633fa1998f3f47e6385dcf76a4d02b_720w.jpg?source=2c26e567)

对于每个函数，将显示每个类别中管道槽的比例。例如，上面选择的函数在前端阻塞类别中占 2.2% 的管道插槽，在 Bad Speculation 类别中占 7.4%，在内存阻塞中占 64.2%，在 Core 阻塞中占 8.4%，在停用类别中占 17.8%。每个类别都可以展开以查看该类别下的指标。自动突出显示用于将您的注意力吸引到潜在的问题区域，在本例中，用于 的高百分比内存阻塞管道插槽。

在进行任何性能调整时，重要的是要关注应用程序的顶级热点。_热点_是占用 CPU 时间最多的函数。关注这些点将确保优化影响整体应用程序性能。VTune Profiler 具有热点分析，具有两种特定的收集模式：用户模式采样和基于硬件事件的采样。在微架构探索视角中，可以通过确定具有最高时钟时钟事件计数的函数或模块来识别热点，该事件计数测量 CPU 时钟时钟的数量。为了从微架构调优中获得最大收益，请确保已经应用了算法优化，例如添加并行性。通常首先进行系统调优，然后是应用级算法调优，然后是架构和微架构调优。此过程也称为“自上而下”，如自上而下的软件调优方法。它以及性能调优的其他重要方面（如工作负载选择）在[揭开软件性能优化的神秘面纱](https://www.intel.com/content/www/us/en/developer/articles/technical/demystifying-software-performance-optimization.html)一文中进行了介绍。

1. 选择一个热点函数（一个在应用程序总时钟周期中占很大比例的函数）。
2. 使用自上而下的方法和下面给出的指南评估该热点的效率。
3. 如果效率低下，请向下钻取表示主要瓶颈的类别，并使用下一级子瓶颈来确定原因。
4. 优化问题。VTune Profiler [优化指南](https://www.intel.com/content/www/us/en/developer/articles/guide/processor-specific-performance-analysis-papers.html)包含针对每个类别中许多潜在性能问题的特定优化建议。
5. 重复上述步骤，直到评估完所有重要热点。

如果指标值超出预定义阈值并出现在热点中，VTune Profiler 会自动突出显示 GUI 中的指标值。如果函数中累积的应用程序的总时钟周期大于 5%，则 VTune Profiler 会将函数归类为热点。确定特定类别中的给定管道槽段部分是否构成瓶颈可能取决于工作负载，下表提供了一些一般参考准则：

这些参考阈值基于对英特尔实验室中一些工作负载的分析。如果热点在某个类别（停用除外）中花费的时间比例处于高端或大于指示的范围，则调查可能会有所帮助。如果多个类别都如此，则应首先调查时间比例最高的类别。请注意，预计热点在每个类别中花费的时间将占一定比例，并且以下正常范围内的值可能并不表示存在问题。

关于自上而下的方法，需要意识到的重要一点是，您不需要花时间优化未被确定为瓶颈的类别中的问题 - 这样做可能不会带来显着的性能改进。

### _针对后端阻塞类别进行优化_

大多数未优化的应用程序将是后端阻塞的。解决后端问题通常涉及解决延迟源，这会导致停用所需的时间超过必要的时间。在代号为 Sandy Bridge 的英特尔微架构上，VTune Profiler 具有后端阻塞指标来查找高延迟的来源。例如，LLC Miss（上一级缓存未命中）指标标识需要访问 DRAM 以获取数据的代码区域，而 Split Loads 和 Split Stores 指标指出可能损害性能的内存访问模式。有关英特尔微架构代号 Sandy Bridge 指标的更多详细信息，请参阅_调优指南_。从英特尔微架构代号 Ivy Bridge（用于第 3 代英特尔酷睿处理器家族）开始，可以使用事件将后端阻塞分类细分为内存阻塞和核心阻塞子指标。排名前 4 位的指标可能使用管道槽域以外的域。每个指标都将根据基础 PMU 事件使用最合适的域。

内存和核心阻塞子指标是使用与执行单元利用率相对应的事件确定的，而不是顶级分类中使用的分配阶段。因此，这些指标的总和不一定与顶层确定的后端阻塞比率相匹配（尽管它们相关性很好）。

“内存阻塞”类别中的停顿具有与内存子系统相关的原因。例如，缓存未命中和内存访问可能会导致内存阻塞停滞。内核阻塞停顿是由于在每个周期中 CPU 中可用执行单元的使用不理想导致的。例如，连续几个多周期的划分指令争夺划分单元可能会导致核心阻塞停滞。对于此细分，插槽仅在停滞且没有未完成的内存访问时才被归类为内核阻塞。例如，如果存在挂起的负载，则该周期被归类为内存受限，因为执行单元正在匮乏，而负载尚未返回数据。PMU 事件被设计到硬件中，专门允许这种类型的故障，这有助于识别应用程序中的真正瓶颈。大多数后端阻塞问题都属于内存阻塞类别。

“内存阻塞”类别下的大多数指标都标识了从 L1 缓存到内存的内存层次结构的哪个级别是瓶颈。同样，用于此确定的事件是经过精心设计的。一旦后端停止，指标会尝试将挂起加载的停滞归因于特定级别的缓存或动态存储。如果热点阻塞在给定级别，则意味着其大部分数据都是从该缓存或内存级别检索的。优化应侧重于使数据更接近核心。Store Bound 也被称为子类别，它可以指示依赖关系 - 例如，当管道中的负载依赖于以前的存储时。在每个类别下，都有指标可以识别导致内存阻塞执行的特定应用程序行为。例如，“存储转发阻止的负载”和“4k 别名”是标记可能导致应用程序被 L1 阻塞的行为的指标。

核心阻塞停顿在后端阻塞中通常不太常见。当可用的计算资源没有得到充分利用和/或没有大量内存需求的情况下使用时，就会发生这种情况。例如，对适合缓存的数据执行浮点 （FP） 算术计算的紧密循环。VTune Profiler 提供了一些指标来检测此类别中的行为。例如，Divider 指标标识大量使用分频器硬件时的周期，而 Port Utilization 指标标识离散执行单元的竞争。

![](https://proxy-prod.omnivore-image-cache.app/706x169,sPom9axywDS43aDAYz30M031zlbcK4tWU1Og_PDvLdwI/https://picx.zhimg.com/50/v2-8305a7d7106581268d65744620075ac0_720w.jpg?source=2c26e567)

注意：灰显的指标值表示为此指标收集的数据不可靠。例如，如果为 PMU 事件收集的样本数量太少，则可能会发生这种情况。您可以忽略此数据，也可以在数据收集时间、采样间隔或工作负载增加的情况下重新运行收集。

### _针对前端阻塞类别进行调整_

“前端阻塞”类别涵盖其他几种类型的管道停滞。管道的前端部分成为应用程序的瓶颈的情况不太常见;但是，在某些情况下，前端可能会对机器失速产生重大影响。例如，JIT 代码和解释代码可能会导致前端停滞，因为指令流是动态创建的，没有事先编译器代码布局的好处。提高前端阻塞类别的性能通常与代码布局（共置热代码）和编译器技术有关。例如，分支代码或占用空间较大的代码可能会突出显示“前端阻塞”类别。在许多情况下，代码大小优化和编译器配置文件引导优化 （PGO） 等技术可能会减少停顿。

代号为 Ivy Bridge 及以后的英特尔微架构上的自上而下方法将前端阻塞停顿分为两类：前端延迟和前端带宽。“前端延迟”指标报告一个周期中前端未发出任何 uop，而后端已准备好使用它们。回想一下，前端群集每个周期最多可以发出 4 个 uops。前端带宽指标报告发出的 UOP 少于 4 个的周期，表示前端功能的使用效率低下。每个类别下方都标识了其他指标。

分支错误预测（主要归入不良投机类别）也可能导致前端效率低下，如英特尔微架构代号 Ivy Bridge 中“前端延迟”下的“分支重定向瓶颈”指标所表示。

![](https://proxy-prod.omnivore-image-cache.app/704x191,s6MNE3xVAOXgY8JgKjLfMNTMWrZVU4eAydBbtvu0yR0E/https://picx.zhimg.com/50/v2-9afe5081912f466e588eaf2a47bbb3f5_720w.jpg?source=2c26e567)

VTune Profiler 列出了可识别前端阻塞代码原因的指标。如果这些类别中的任何一个在结果中显着显示，请更深入地研究指标以确定原因以及如何纠正它们。例如，ITLB 开销（指令转换后备缓冲区开销）和 ICache 未命中（指令缓存未命中）指标可能会指出前端阻塞执行的区域。

### _调整不良投机类别_

第三个顶级类别 Bad Speculation 表示管道何时忙于获取和执行无用操作。Bad Speculation 管道插槽是被已发布的 uop 浪费的插槽，这些插槽在计算机从不正确的推测中恢复时从未停用或停滞。不良推测是由分支错误预测和机器清除引起的，而较少见的是自修改代码等情况。通过编译器技术（如配置文件引导优化 （PGO））可以减少不良推测，避免间接分支，并消除导致机器清除的错误条件。纠正不良投机问题也可能有助于减少前端阻塞停顿的数量。

![](https://proxy-prod.omnivore-image-cache.app/496x225,sJ0aafNvTc2FPzw-svpqMpNDF81UmQyfpIFt5MEgXOcs/https://pic1.zhimg.com/50/v2-7ae9222f624a2a7f06b97cb355a63233_720w.jpg?source=2c26e567)

### _针对退休的类别进行调整_

顶层的最后一个类别是退休。它表示管道何时忙于通常有用的操作。理想情况下，应用程序应具有尽可能多的插槽，这些插槽将分类在此类别中。但是，即使是大部分管道槽停用的代码区域也可能有改进的余地。属于停用类别的一个性能问题是大量使用微排序器，它通过生成一长串 uops 来解决特定条件来帮助前端。在这种情况下，尽管有许多退役的 uop，但其中一些是可以避免的。例如，在非正常情况下适用的 FP 辅助通常可以通过编译器选项（如 DAZ 或 FTZ）来减少。代码生成选项也有助于缓解这些问题 - 有关详细信息，请参阅 VTune Profiler 优化指南。在英特尔微架构代号 Sandy Bridge 中，“辅助”被标识为“停用”类别下的指标。在代号为 Ivy Bridge 及以后的英特尔微架构中，理想报废类别中的管道插槽被分解为称为“一般报废”的子类别，微码排序器 uop 被单独标识。

![](https://proxy-prod.omnivore-image-cache.app/515x186,skP37EqMk_gjg9WyOz3BI7PvSeDLHReBex2rBIns6TgU/https://pic1.zhimg.com/50/v2-c19083d51b48f13aa0551c8a8652f289_720w.jpg?source=2c26e567)

另外，并行化和矢量化等算法优化技术可以帮助提高属于退休类别的代码区域的性能。

### _结论_

自上而下的方法及其在 VTune Profiler 中的可用性代表了使用 PMU 进行性能优化的新方向。开发人员在熟悉此特性方面投入的时间是值得的，因为对它的支持被设计到最新的 PMU 中，并且在可能的情况下，层次结构会在未来的英特尔微架构上进一步扩展。例如，在英特尔微架构代号 Sandy Bridge 和英特尔微架构代号 Ivy Bridge 之间显著扩展了这些特性表征。

自上而下方法的目标是确定应用程序性能中的主要瓶颈。VTune Profiler 中的微架构探索分析和可视化功能的目标是为您提供可操作的信息，以改进您的应用程序。这些功能加在一起，不仅可以显著提高应用程序性能，还可以提高优化的生产力。

[Top-down Microarchitecture Analysis Method (intel.com)](https://www.intel.com/content/www/us/en/docs/vtune-profiler/cookbook/2024-1/top-down-microarchitecture-analysis-method.html)

[发布于 2024-04-25 19:55](https://www.zhihu.com/question/482318092/answer/3478561247)・IP 属地广东

​赞同 4​​添加评论​收藏​喜欢

​

收起​

[![Linux内核库](https://proxy-prod.omnivore-image-cache.app/0x0,s-k2MFidblYnW8FouwIKNxEhge-Ao_vi7CvAgN708x-U/https://picx.zhimg.com/v2-962485b675e50b20038b66952f9a79a2_l.jpg?source=1def8aca)](https://www.zhihu.com/people/cheng-xu-yuan-mian-shi-zhi-nan)

[Linux内核库](https://www.zhihu.com/people/cheng-xu-yuan-mian-shi-zhi-nan)

[发布于 2022-05-19 20:25](https://www.zhihu.com/question/482318092/answer/2492924785)· 37 次播放

![](https://proxy-prod.omnivore-image-cache.app/0x0,smEkw4H_UM6FWi_7Qc4XIyXAESYlip5TK2hxZjLR4hOc/https://pic1.zhimg.com/v2-47d35ded13012a54de59e5c0fbb9c251.jpg?source=382ee89a)

72:24

【驱动开发必备】Linux内核perf性能优化分析与中断管理机制

168 播放

[发布于 2022-05-19 20:25](https://www.zhihu.com/question/482318092/answer/2492924785)· 37 次播放

​赞同​​添加评论​收藏​喜欢

​

[![Aalan](https://proxy-prod.omnivore-image-cache.app/0x0,s1x72H8-XkiyFj5-KBSQrOQuaSvMESO86t-LZ1XqONtM/https://picx.zhimg.com/v2-5eda919f7a5f6f949ecaae547540c88d_l.jpg?source=1def8aca)](https://www.zhihu.com/people/wu-wei-41-73-83)

[Aalan](https://www.zhihu.com/people/wu-wei-41-73-83)

I have no idea about it

​ 关注

我们在写算子或者优化算子的时候，往往需要思考，启动的线程是否会产生 共享内存的 bank conflict。（NV GPU 存在 SLM bank conflict ，同理 intel GPU 也存在 bank conflict，都是 GPGPU 很多优化点都是相通的。 ）

Intel OneAPI basekit 提供的 Vtune 可以帮助查看 Kernel 具体的运行状况。

本文主要简要介绍如何使用 Vtune dump 当前运行在 Intel GPU 上的算子是否存在 SLM bank conflict。Vtune 目前提供了查看 Kernel 事件的状态，但效果不如 nvprof，nsight 直观，但是定位问题基本够了。

## **安装环境：**

 首先你得有一台 Intel 的独立显卡（哈哈哈，是不是压根没听过\~\~\~），然后安装 Vtune。Vtune 建议直接使用 oneapi 中的。

Install [Intel® oneAPI Base Toolkit](https://www.intel.cn/content/www/cn/zh/developer/tools/oneapi/base-toolkit-download.html).

 如果你有使用 Vtune 的需求，想必环境啥的都 Ok 了吧。

## **Analyze XVE Stalls**

 可以通过 dump XVE stalls 来分析bank conflict。**目前该功能只适用于 Intel MAX 系列 GPU.** 

### **overview 分析**

如果怀疑 Intel GPU 未被充分利用，我们可以使用 Vtune 来获取 Xe Vector Engines (XVEs) 执行 kernel 的具体状态 ，从而来探究 GPU stack 中某些部分出现停滞或空闲行为的原因。当一个 Kernel code 比较复杂并难以分析的时候， 最好的方式就是实际 Vtune 抓 log 看看情况。

首先, 我们需要对执行的 AI workload 或者 benchmark 中的各个算子有个大概的了解，哪些 kernel stall 状态比较多。

Vtune 官方推荐首先使用 “_GPU Compute/Media Hotspots analysis in Characterization mode. Select the Overview option in this mode.”_

```gradle
vtune -collect gpu-hotspots -knob characterization-mode=overview -r ~/output ./workload
```

分析完成后，可以把 \`outpu\` 导入 vtune-gui, vtune XVE Array Stalled/Idle table 会帮助自动分析每个执行的 kernel 基本状态。

在 Intel GPU 中 Kernel 主要存在三种状态：

| stalled | GPU received computing tasks but did not execute them         |
| ------- | ------------------------------------------------------------- |
| idle    | GPU never received computing tasks                            |
| active  | GPU running tasks, instruction is dispatching into a pipeline |

 如果 stalled 和 idle 比例太高，都表明 GPU EU （各类资源的使用效率不高），这两种情况都提供了改进和更好利用可用硬件的机会。 对于 stalled 比例较高的 Kernel，下一步就需要具体分析原因，需要 dump 更详细的 log。 此时 “_c_haracterization-mode=overview” 模式下的 log 就不够了。

![](https://proxy-prod.omnivore-image-cache.app/1449x0,sVhgqnxSA4UpwxDbjfMw2FnYGzQrgPTk6xctxElVzcwk/https://pica.zhimg.com/50/v2-91dc20ed9d3b92f7faae4565b37d2de6_720w.jpg?source=1def8aca)

### **GPU stalled 分析**

```gradle
vtune -collect gpu-hotspots -knob profiling-mode=source-analysis -knob source-analysis=stall-sampling -r ~/output-stall ./workload
```

将 output-stall 导入 vtune-gui，通过 vtune 我们可以切换到图形视图以查看停滞次数的分布。

**_Make sure to select the Computing Task/Function grouping in the Graphics view to locate the stalls for each computing task._**

![](https://proxy-prod.omnivore-image-cache.app/1458x0,sR7NtL23l2K4oUy-Vq8d05QDfXeRPdjamM5zjZzVAilg/https://pica.zhimg.com/50/v2-c8736a649203980de6c406f58fa48cde_720w.jpg?source=1def8aca)

可以看到具体 GPU 上 launch kernel 的 stall 状态，从上图可以看到 compute\_sp\_v8 等算子存在少量的 bank conflict，但是整体比例不是很高。

其中 Pipe 的比例越高，其 SLM bank conflict 的情况越明显。除了 SLM bank conflict 导致的 gpu stall， Vtune 还列出了其他几类情况 **_There may be several possible reasons for a stall in your Xe Vector Engine (XVE). The following table describes these reasons:_**

| Reason for XVE Stall | Explanation                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active               | At least one instruction is dispatching into a pipeline （好的状态）                                                                                                                                                    |
| Control              | The percentage of stalls when the instruction was waiting for a Branch unit to become available.                                                                                                                  |
| Dist or Acc          | The percentage of stalls when the instruction was waiting for a Distance or Architecture Register File (ARF)dependency to resolve                                                                                 |
| Instruction Fetch    | The percentage of stalls when the XVE was waiting for an instruction to be returned from the instruction cache.                                                                                                   |
| Pipe                 | The percentage of stalls when the instruction won arbitration but could not be dispatched into a FloatingPoint or Extended Math unit. This can occur due to a bank conflict with the General Registry File (GRF). |
| SBID                 | The percentage of stalls when the instruction was waiting for a Software Scoreboard dependency to resolve.                                                                                                        |
| Send                 | The percentage of stalls when the instruction was waiting for a Send unit to become available.                                                                                                                    |
| Synchronization      | The percentage of stalls when the instruction was waiting for a thread synchronization dependency to resolve.                                                                                                     |
| Other                | The percentage of stalls when other factors stalled the execution of the instruction.                                                                                                                             |

参考文档 :

[](https://www.intel.com/content/dam/develop/external/us/en/documents/vtune-profiler-user-guide.pdf)

展开阅读全文​

​赞同​​添加评论​收藏​喜欢

​

