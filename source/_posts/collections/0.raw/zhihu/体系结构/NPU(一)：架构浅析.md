---
title: NPU(一)：架构浅析
date: "2025-02-01 00:00:00"
updated: "2025-02-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/NPU(一)-架构浅析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/20851746736
---


最近几个月的工作都是深度学习模型在Qualcomm端侧芯片的部署和优化工作，芯片可用的异构计算单元，尤其是NPU的微架构是模型部署和优化工作的基础，但Qualcomm鲜有相关的技术资料，封闭的生态导致了高昂的学习成本，形成体系化认知的时间成本太高了，我基于目前所掌握的技术资料，从模型部署和优化的角度浅析一下Qualcomm的SoC及NPU微架构，并附上最近从公开渠道获取的NPU相关的技术资料，旨在为刚开始Qualcomm端侧部署的小伙伴提供一个快速建立认识的途径。

#### 一、Qualcomm SoC

Qualcomm SA8295P芯片架构如下图所示，5nm工艺，专为汽车座舱设计的智能芯片，满足ASIL B使用要求。

首先是Kryo架构CPU，Kryo基于ARM架构开发，主流CPU都是8核心，图中所示的8核CPU由四个高性能核和4个低功耗核构成，差别主要体现在核心频率上，以SA8295P的Kryo695 CPU为例，采用ARM v8架构，4个prime core和4个gold core分别能够达到2.56GHz和2.05Hz的核心频率，三级缓存8 MB，算力为220K DMIPS。Qualcomm2024年发布的Oryon架构CPU最多可以集成12个核心，由高通收购的公司Nuvia研发，核心频率最高已经达到3.8GHz了。

其次是GPU，以SA8295P为例，GPU采用Adreno 695，核心频率733MHz，算力3.1 TFLOPS，除了Adreno架构GPU，视频相关的multimedia模块还包括了VPU和DPU，同样以SA8295P为例，VPU 665是视频处理单元，负责视频的编码和解码，诸如负责解码在线视频流，实现高清视频播放功能。DPU 1199负责显示输出管理和控制，诸如多屏幕显示和高分辨率输出，Spectra ISP 395，负责图像的采集处理和增强。在车载摄像头系统中，ISP负责处理多路摄像头数据，实现环视系统和驾驶员监控系统的功能。

图中的Dual Hexagon Tensor Processor就是NPU了，高通真起名大师，这些IP不知道换了多少个名字了，刚开始看的时候简直找不着北，Qualcomm最初负责计算的硬件叫Compute DSP(CDSP)，在V60架构之后引入了Hexagon Vector eXtension(HVX)的概念，负责vector计算，从V68之后引入了Hexagon Matrix eXtension(HMX)，负责高维tensor计算，自此，高通的NPU三大核心计算部件正式组队，更名Hexagon Tensor Processor(HTP)，双核算力可达30TOPS。

存储采用LPDDR4X SDRAM，内存频率2133MHz，总线宽度8*16=128bit，大小为16GB，带宽68.2 GB/s。

BTW，带宽=内存频率×总线宽度×双倍数据速率/8.

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ac313e992f89.jpg)

Qualcomm SA8295P SoC
#### 二、Qualcomm NPU 微架构

（1）硬件单元

了解NPU的微架构是为了什么？从模型部署和算法优化的角度，最直接相关的就两个内容，存储结构和编程模型。下面主要基于Qualcomm在2023年的技术分享对NPU的架构做一些浅析。下图是Qualcomm NPU的微架构，主要包括三部分计算能力，Scalar/Vector/Tensor，设计了TCM高速缓存器，提供低延迟和高带宽的内存访问性能，Qualcomm SA8295P TCM大小为8 MB。NPU采用VLIW指令并行架构，通过软件（编译器）的静态调度，将多条无依赖关系的指令组合成一个指令包（Instruction Bundle），然后同时发送给多个独立的功能部件进行并行执行。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b9daf97f038e.jpg)

Hexagon NPU(HC2023)![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_56d8380c9ea3.jpg)

Hexagon Tensor(HC2023)Hexagon NPU Tensor，Tensor内部对矩阵乘加/激活/convert做了专门的设计，也是现在NPU的主要设计理念，把LLM的运算拆开和硬件对上去，此外ISA优化了一系列算子。在高通的世界里，你甚至无法知道SA8295P V68 NPU的核心频率，也无法知道Tensor内部对不同数据类型的计算支持分配，你只知道它能提供30TOPS的算力。

（2）编程模型

VLIW提供指令并行，标量指令集ISA用于数据流控制和串行任务调度，Scalar/Vector/Tensor都有专用的寄存器。算法部署主要是和QNN SDK交互，在短期内和指令没什么交互，主要是靠Qualcomm去做优化和升级，一些算法的SOTA特性全靠Qualcomm自觉。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3cbe26bc37cc.jpg)

Hexagon Threads(HC2023)下图是Hexagon的内存模型，Vector计算单元能够通过L2 Cache或者TCM和LPDDR交互，Tensor计算单元只能通过TCM和LPDDR交互。TCM说是带宽更高，多高咱也不知道，通过DMA实现DDR延迟覆盖。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_7d1a1da4619f.jpg)

Hexagon Memory Model(HC2023)以上基本就是Qualcomm NPU架构和算法部署和加速相关的内容，了解芯片架构能够在算法性能测试和优化前提供一个方向，Qualcomm的软硬件生态很难给工程师机会去做算法的灵活部署和优化，能够按照Qualcomm提供的脚本把目前SOTA模型部署到端侧运行起来已经很不容易了，因为你在开源生态上几乎找不到优质的QNN代码仓库。

#### 三、Intel NPU 微架构

最近看了Intel的NPU架构设计的讲解，虽然整体的指标和Qualcomm芯片还有差距，但有很多架构优化，而且讲的很通透，也推荐大家去看下。

Intel Lunar Lake NPU，是Intel的第四代NPU，支持fp16和int8数据类型，单Neural Compute Engine(NCE) 2K int 8 MACs per cycle,一共6 NCEs，算力就是12K MACs per cycle，NPU对外提供的int8算力就是12000**2**2.05GHz =48TOPs，Qualcomm V73架构NPU的per cycle算力已经到16K MACs了，Intel道阻且长！

Lunar Lake芯片架构如下，Global Control&MMU负责设备的能源管理和工作负载调度，Intel在此处设计了Internal MMU做空间隔离，实现多应用的并行隔离。Scratchpad RAM和Qualcomm的TCM相似，在4代NPU已经达到9MB。存储采用LPDDR5X-8533 SDRAM,硬件指标数据没找到。

在计算单元方面，Intel设计了Inference Pipeline去完成链式计算，避免内存反复读取，SHAVE DSP主要用于Vector计算，例如Attention的Add/Norm/Softmax；MAC Array用于tensor计算，如Multi-head Attention和MLP，同样设计了激活函数和数据转换(datatype conversion)模块，基于这些硬件能够完成LLM的所有计算内容。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_60da4f512339.jpg)

Intel Lunar lake npu
#### 四、参考资料

1.博客资料

(1)Qualcomm’s Hexagon DSP, and now, NPU

(2)[高性能计算学院：移动端算法优化概述](https://zhuanlan.zhihu.com/p/412792024)

(3)[佐思汽车研究：探秘 #高通NPU，极致性价比与 #每瓦TOPS的 #AI加速器 @佐思汽研](https://zhuanlan.zhihu.com/p/4376549875)

(4)[小方同学：浅谈深度学习加速器(NPU) （2）](https://zhuanlan.zhihu.com/p/683021137)

2.视频资料

(1)Intel Lunar lake npu

(2)Qualcomm NPU
