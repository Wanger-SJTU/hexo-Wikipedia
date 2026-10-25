---
title: 【编译器】传统编译器和AI/ML编译器总结
date: "2023-12-22 00:00:00"
updated: "2023-12-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/tvm/【编译器】传统编译器和AI_ML编译器总结/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/673452222
---


### 前言

本文总结了传统编译器和AI/ML编译器，可作为学习、研究、研发的参考资料。

### 1.编译器-GC

#### Clang

Clang是一个C、C++、Objective-C和Objective-C++编程语言的编译器前端。它采用了LLVM作为其后端，由LLVM2.6开始，一起发布新版本。它的目标是提供一个GNU编译器套装（GCC）的替代品，支持了GNU编译器大多数的编译设置以及非官方语言的扩展。作者是克里斯·拉特纳（Chris Lattner），在苹果公司的赞助支持下进行开发，而源代码许可是使用类BSD的伊利诺伊大学厄巴纳-香槟分校开源码许可。 Clang项目包括Clang前端和Clang静态分析器等。

![](/images/collections/0.raw/zhihu/tvm/asset/img_4d9f97ea2065.jpg)

CLang 官网：http://clang.org/ 

CLang User Guide：https://clang.llvm.org/docs/UsersManual.html 

CLang Doc：https://clang.llvm.org/docs/index.html 

Clang C++：https://clang.llvm.org/cxx_status.html 

Clang User Manual：https://opensource.apple.com/source/clang/clang-23/clang/tools/clang/docs/UsersManual.html 

CLang Wiki：https://zh.wikipedia.org/zh-cn/Clang 

#### LLVM

LLVM是一组编译器和工具链技术，可用于开发任何编程语言的前端和任何指令集架构的后端。LLVM 围绕独立于语言的中间表示(IR) 进行设计，该中间表示作为一种可移植的高级汇编语言，可以通过多次传递中的各种转换进行优化。LLVM 用C++编写，专为编译时、链接时、运行时和空闲时优化而设计。LLVM最初是为C和 C++ 实现的，与语言无关的设计已经催生了各种各样的前端：

带有使用 LLVM 编译器的语言（或者不直接使用 LLVM 但可以生成编译后的程序作为 LLVM IR），包括：ActionScript, Ada, C# for .NET,[6][7][8] Common Lisp, PicoLisp, Crystal, CUDA, D, Delphi, Dylan, Forth,[9] Fortran, FreeBASIC, Free Pascal, Halide, Haskell, Java bytecode, Julia, Kotlin, LabVIEW's G language,[10][11] Lua, Objective-C, OpenCL,[12] PostgreSQL's SQL and PLpgSQL,[13] Ruby,[14] Rust,[15] Scala,[16][17] Swift, Xojo, and Zig。

![](/images/collections/0.raw/zhihu/tvm/asset/img_d04f9d125ea3.jpg)

LLVM 官网：https://llvm.org/ 

LLVM Github：[https://github.com/llvm/llvm-project](https://link.zhihu.com/?target=https%3A//github.com/llvm/llvm-project) 

LLVM Wiki：https://en.wikipedia.org/wiki/LLVM 

LLVM 论文：https://llvm.org/pubs/2004-01-30-CGO-LLVM.html 

### 2.编译器-C/C++

#### ArmCC

编译器armcc是一个优化的C和C++编译器，它将标准C和标准C++源代码编译为基于ARM架构的处理器的机器代码。编译器将以下不同类型的 C 和 C++ 源代码编译为 ARM 和 Thumb 代码。该编译器还为采用 NEON 技术的 ARM 处理器提供矢量化模式，从而支持使用 ARM 高级单指令多数据 (SIMD) 扩展。矢量化涉及编译器直接从 C 或 C++ 代码生成 NEON 向量指令。

ArmCC：https://developer.arm.com/documentation/dui0472/k 

ArmCC 编译器入门：https://developer.arm.com/documentation/dui0472/k/Getting-Started-with-the-Compiler 

ArmCC 使用 NEON 矢量化编译器：https://developer.arm.com/documentation/dui0472/k/Using-the-NEON-Vectorizing-Compiler 

ArmCC 编译器特性：https://developer.arm.com/documentation/dui0472/k/Compiler-Features 

ArmCC 编译选项：https://developer.arm.com/documentation/dui0472/k/Compiler-Command-line-Options 

#### GCC

GNU 编译器集合( GCC )是GNU 项目产生的优化编译器，支持各种编程语言、硬件体系结构和操作系统。自由软件基金会(FSF)根据GNU 通用公共许可证(GNU GPL)将 GCC 作为自由软件分发。GCC 是GNU 工具链的关键组件，也是大多数与GNU和Linux 内核相关的项目的标准编译器。GCC 2019 年约有 1500 万行代码，是现有最大的免费程序之一。它作为工具和范例， 在自由软件的发展中发挥了重要作用。

![](/images/collections/0.raw/zhihu/tvm/asset/img_f57dbc267981.jpg)

GCC：https://gcc.gnu.org/ 

GCC Doc：https://gcc.gnu.org/onlinedocs/ 

GCC Wiki：https://en.wikipedia.org/wiki/GNU_Compiler_Collection 

#### G++

G++是GNU C++编译器调用命令，用于对源代码进行预处理、编译、汇编和链接，生成可执行文件。

G++ Compiler：https://www.geeksforgeeks.org/compiling-with-g-plus-plus/ 

使用G++编译：https://courses.cs.washington.edu/courses/csewi/unix/g++.html 

#### QCC/Q++

QCC 支持以下 C++ 标准库实现： cxx(LLVM C++)、gpp(GNU C++)、cpp(纯粹的 C++)、 cpp-ne(Dinkum C++，无例外)、 acpp(纯粹精简版 C++)、acpp-ne(Dinkum Abridged C++，无例外)、ecpp(Dinkum 嵌入式 C++)、 ecpp-ne(Dinkum 嵌入式 C++，无一例外)。

QCC/Q++：https://www.qnx.com/developers/docs/7.1/#com.qnx.doc.neutrino.utilities/topic/q/qcc.html 

#### MSVC

Microsoft Visual C++ ( MSVC ) 是Microsoft的C、C++、C++/CLI和C++/CX 编程语言的编译器。MSVC 是专有软件；它最初是一个独立的产品，但后来成为Visual Studio的一部分，并以试用软件和免费软件的形式提供。它具有用于开发和调试C++ 代码的工具，特别是为Windows API、DirectX和.NET编写的代码。

MSVC：https://learn.microsoft.com/en-us/cpp/build/reference/compiler-options?view=msvc-170 

MSVC Wiki：https://en.wikipedia.org/wiki/Microsoft_Visual_C%2B%2B 

#### Bisheng

毕昇编译器（bisheng compiler）是华为提供的一款提供高性能、高可信及易扩展的编译器工具链。毕昇编译器引入了多种编译技术，支持C/C++/Fortran编译语言。

毕昇编译器：https://support.huaweicloud.com/usermanual-hce/hce_02_0051.html 

毕昇编译器介绍：https://www.hikunpeng.com/document/detail/zh/kunpengdevkithistory/bisheng/hist-bisheng/kunpengbisheng_06_0001_3.html 

#### XL

XL C/C++是IBM专有的优化C / C ++编译器的名称，用于 IBM 支持的环境。IBM XL 编译器由模块化组件构建而成，其中包括前端（针对不同的编程语言）、与平台无关的高级优化器以及特定于平台的低级优化器/代码生成器，以针对特定的硬件和操作系统。XL C/C++ 编译器针对 POWER、BlueGene/Q 和IBM Z硬件架构。

IBM XL C/C++ Compiler：https://www.ibm.com/products/open-xl-cpp-aix-compiler-power 

IBM XL C/C++ Compilers：https://en.wikipedia.org/wiki/IBM_XL_C/C%2B%2B_Compilers 

#### DPCC

Intel oneAPI DPC++/C++ 编译器适用于 Windows 和 Linux，支持编译 C、C++、SYCL 和数据并行 C++ (DPC++)源代码，针对 Intel IA-32、Intel 64（又名x86-64）、Core、Xeon和至强可扩展处理器以及 GPU，包括英特尔处理器显卡 Gen9 及更高版本、英特尔X e架构以及采用英特尔 Arria 10 GX FPGA 的英特尔可编程加速卡。与英特尔 C++ 编译器经典版一样，它也支持Microsoft Visual Studio和Eclipse IDE开发环境，并支持通过英特尔 oneAPI线程构建模块、OpenMP和本机线程进行线程化。

DPC++基于Khronos Group 的SYCL规范构建。它旨在允许开发人员跨硬件目标（CPU 和 GPU 和 FPGA 等加速器）重用代码，并针对特定加速器执行自定义调整。DPC++ 包含C++17和 SYCL 语言功能，并包含开源社区扩展，使 SYCL 更易于使用。其中许多扩展被 SYCL 2020 临时规范[8]采用，包括统一共享内存、组算法和子组。 英特尔于 2021 年 8 月宣布全面采用LLVM，以缩短构建时间并受益于支持最新的 C++ 标准。

![](/images/collections/0.raw/zhihu/tvm/asset/img_30c1b16d75c4.jpg)

Intel DPCC Compiler：https://www.intel.com/content/www/us/en/developer/tools/oneapi/dpc-compiler.html 

Intel DPC Compiler：[https://github.com/intel/llvm#oneapi-data-parallel-c-compiler](https://link.zhihu.com/?target=https%3A//github.com/intel/llvm%23oneapi-data-parallel-c-compiler) 

Intel C++ Compiler：https://en.wikipedia.org/wiki/Intel_C%2B%2B_Compiler 

Intel Fortran Compiler：https://www.intel.com/content/www/us/en/developer/tools/oneapi/fortran-compiler.html 

#### AOCC

AMD优化 C/C++ 编译器( AOCC ) 是AMD的一款优化 C/C++ 和 Fortran编译器套件，针对 32 位和 64 位Linux平台。它是LLVM + Clang的专有分支，具有各种附加补丁，可提高Epyc和Ryzen微处理器中 AMD Zen微架构的性能。

AOCC：https://www.amd.com/en/developer/aocc.html 

AMD Optimizing C/C++ Compiler：https://en.wikipedia.org/wiki/AMD_Optimizing_C/C%2B%2B_Compiler 

#### XCC

Cadence Tensilica Xtensa C/C++ 编译器 (XCC)

XCC：https://docs.zephyrproject.org/latest/develop/toolchains/cadence_xcc.html 

#### DDSC

大多数 DSP 系统中的关键组件是正弦波发生器，通常称为直接数字合成器 (DDS) 或数控振荡器 (NCO)。这些 DDS 功能虽然算法简单，但给负责实现该功能的硬件工程师带来了许多困难。例如，限制高 SFDR 要求所消耗的内存以及达到设备中的最大时钟性能通常是一个挑战。DDS 编译器消除了这些困难，并减少了只需按一下按钮的实施时间。此外，该工具还使用户能够在 XtremeDSP切片、块存储器和逻辑之间进行实施权衡，以便为给定系统实现最佳解决方案。

DDS Compiler：https://www.xilinx.com/products/intellectual-property/dds_compiler.html 

DDS Compiler v6.0：https://docs.xilinx.com/v/u/en-US/pg141-dds-compiler 

### 3.编译器-Java

#### JavaC

Java 编程语言编译器javac读取用 Java 编程语言编写的源文件，并将其编译为字节码类文件。编译器还可以使用可插入注释处理 API 处理源文件和类文件中找到的注释。该编译器是一个命令行工具，但也可以使用 Java 编译器 API 进行调用。编译器接受 Java 语言规范 (JLS) 定义的源代码，并生成 Java 虚拟机规范 (JVMS) 定义的类文件。 

JavaC：https://docs.oracle.com/javase/8/docs/technotes/guides/javac/index.html 

JavaC 命令：https://download.java.net/java/early_access/loom/docs/specs/man/javac.html 

使用 javac 编译 Java *.class 文件：https://download.java.net/java/early_access/loom/docs/specs/man/javac.html

#### GCJ

GNU Compiler for Java ( GCJ ) 是一个已停产的免费 Java编程语言编译器。它是GNU 编译器集合的一部分。GCJ 将 Java源代码编译为Java 虚拟机(JVM)字节码或多种CPU 架构的机器代码。它还可以将包含字节码的类文件和整个JAR编译为机器代码。

GCJ：https://en.wikipedia.org/wiki/GNU_Compiler_for_Java 

#### Jikes

Jikes是一个用C++编写的开源 Java 编译器。它不再更新。 最初的版本是由IBM的 David L.“Dave”Shields 和 Philippe Charles 开发的，但很快就转变为一个由活跃的[需要引用]开发人员社区贡献的开源项目。该项目最初由 IBM 托管，后来转移到SourceForge。它的成就之一是，它在编译小型项目方面比Sun 自己的编译器快得多，并且提供了更多有用的警告和错误。

Jikes：https://en.wikipedia.org/wiki/Jikes

### 4.编译器-HPC

#### NVCC

Nvidia CUDA 编译器( NVCC ) 是Nvidia的专有 编译器，旨在与CUDA一起使用。CUDA 代码在CPU和GPU上运行。NVCC 将这两部分分开，并将主机代码（将在CPU上运行的代码部分）发送到C编译器，如GCC或Intel C++ 编译器（ICC）或Microsoft Visual C++编译器，并发送设备代码（将在 CPU 上运行的部分代码）。将在 GPU 上运行）到 GPU。设备代码由NVCC进一步编译。NVCC是基于LLVM的。根据 Nvidia 提供的文档，7.0 版本中的 nvcc 支持许多由C++11标准定义的语言结构以及一些C99功能。在版本 9.0 中，支持更多来自C++14标准的构造。

![](/images/collections/0.raw/zhihu/tvm/asset/img_2be97b1fa8a0.jpg)

NVCC：https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/index.html 

NVCC Wiki：https://en.wikipedia.org/wiki/Nvidia_CUDA_Compiler 

#### NVC++

NVIDIA Fortran、C++ 和 C 编译器支持 NVIDIA GPU 和多核 CPU 的跨平台 HPC 编程。它们可与 NVIDIA 优化的数学库、通信库以及性能调整和调试工具完全互操作。NVIDIA HPC 编译器支持服务 (HCSS) 提供商业支持。NVC++ 编译器支持 C++17 的所有功能，包括在 NVIDIA GPU 上自动加速 C++17 并行算法。

NVIDIA HPC Compiler NVC++：https://developer.nvidia.com/hpc-compilers 

Accelerating Standard C++ with GPUs Using stdpar：https://developer.nvidia.com/blog/accelerating-standard-c-with-gpus-using-stdpar/ 

NVIDIA HPC Compilers User's Guide：https://docs.nvidia.com/hpc-sdk/compilers/hpc-compilers-user-guide/index.html 

### 5.编译器-AI/ML

#### TVM

Apache TVM 是一个用于深度学习系统的编译器堆栈。它旨在缩小以生产力为中心的深度学习框架与以性能和效率为中心的硬件后端之间的差距。TVM 与深度学习框架配合使用，为不同后端提供端到端编译。

![](/images/collections/0.raw/zhihu/tvm/asset/img_7349d11a786b.jpg)

TVM 官网：https://tvm.apache.org/ 

TVM 代码：[https://github.com/apache/tvm](https://link.zhihu.com/?target=https%3A//github.com/apache/tvm) 

TVM 论文：[https://arxiv.org/abs/1802.04799](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1802.04799) 

TVM Doc：https://tvm.apache.org/docs/ 

TVM Wiki：https://en.wikipedia.org/wiki/TVM 

#### MLIR

MLIR是用于编译器开发的统一软件框架。MLIR 可以充分利用各种计算平台，例如GPU、DPU、TPU、FPGA、AI ASICS和量子计算系统(QPU)。MLIR 是LLVM编译器基础设施项目的子项目，旨在构建“可重用且可扩展的编译器基础设施 (..) 并帮助将现有编译器连接在一起。

![](/images/collections/0.raw/zhihu/tvm/asset/img_4ded95e0510d.jpg)

MLIR：https://mlir.llvm.org/ 

MLIR Wiki：https://en.wikipedia.org/wiki/MLIR_(software) 

MLIR论文：[https://arxiv.org/abs/2002.11054](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2002.11054) 

MLIR TensorFlow：https://blog.tensorflow.org/201/mlir-new-intermediate-representation.html 

#### XLA

XLA（加速线性代数）是一种针对特定领域的线性代数编译器，能够加快 TensorFlow 模型的运行速度，而且可能完全不需要更改源代码。 它可以提高运行速度并改进内存用量。例如在 BERT 中，如果 MLPerf 提交内容使用 8 伏打 V100 GPU 和 XLA，则性能可提升约 7 倍，并且批次大小可改进约 5 倍。

![](/images/collections/0.raw/zhihu/tvm/asset/img_df9db15cd5c4.jpg)

XLA：优化机器学习编译器：https://www.tensorflow.org/xla?hl=zh-cn 

XLA 代码：[https://github.com/openxla/xla](https://link.zhihu.com/?target=https%3A//github.com/openxla/xla) 

#### AutoKernel

神经网络现在被广泛应用于各种应用中。神经网络在各种设备上的高效执行对于这些应用程序起着至关重要的作用。面对深度学习算法的快速发展，能够在不同硬件平台上编写手工优化的低级内核的合格程序员有限。使用自动优化工具生成高性能实现成为一种有前途的解决方案。

AutoKernel 最初是 OPEN AI LAB 的一个研究项目。AutoKernel 是一种操作员优化工具，用于为各种硬件后端自动生成高性能低级代码。它旨在加速各种硬件(包括专用加速器)上高性能算子的开发。

AutoKernel：https://autokernel-docs-en.readthedocs.io/en/latest/ 

AutoKernel 代码：[https://github.com/OAID/AutoKernel](https://link.zhihu.com/?target=https%3A//github.com/OAID/AutoKernel) 

#### MegCC

MegCC是旷视开发的一款深度学习模型编译器，具有以下特点： 极轻量级运行时：仅将所需的计算内核保留在二进制文件中。例如，MobileNet v1 的运行时间为81KB；高性能：每项操作都经过专家精心优化；便携：只生成计算代码，易于在 Linux、Android、TEE、BareMetal 上编译和使用；即时启动时内存使用率低：模型优化和内存规划在编译时生成。获得最先进的内存使用率，并且在推理过程中不花费额外的 CPU。

![](/images/collections/0.raw/zhihu/tvm/asset/img_7b6b86523356.jpg)

MegCC：https://www.megengine.org.cn/blog/megcc 

MegCC：[https://github.com/MegEngine/MegCC](https://link.zhihu.com/?target=https%3A//github.com/MegEngine/MegCC) 

#### CNCC

寒武纪针对MLU芯片BANG编程语言的AI编译器。

BANG编程手册：https://forum.cambricon.com/uploadfile/user/file/.pdf 

寒武纪 MUL：[https://zhuanlan.zhihu.com/p/603228203](https://zhuanlan.zhihu.com/p/603228203) 

CN-认知2-寒武纪软件栈：[https://zhuanlan.zhihu.com/p/592954492](https://zhuanlan.zhihu.com/p/592954492) 

寒武纪人工智能开发平台：https://blog.51cto.com/u_151276 

#### CDNN

Ceva 深度神经网络 (CDNN) 是一种全面的 AI 编译器技术，可为 SensPro传感器中枢 DSP、NeuPro-M AI 处理器架构和Ceva-XM Vision DSP创建完全优化的运行时软件。

CDNN 针对大众市场嵌入式设备，将广泛的网络优化、高级量化算法、数据流管理以及完全优化的计算 CNN 和 RNN 库融入到整体解决方案中，使经过云训练的 AI 模型能够部署在边缘设备上用于推理处理。

人工智能编译器 Ceva 深度神经网络 (CDNN)：https://www.ceva-ip.com/product/ceva-deep-neural-network-cdnn/ 

CEVA 编译器：https://sig-product-docs.synopsys.com/zh-CN/bundle/coverity-docs/page/coverity-analysis/topics/ceva_compilers.html 

#### AGSpeed

AIACC-AGSpeed（AIACC 2.0-AIACC Graph Speeding）是阿里云推出的一个基于PyTorch深度学习框架研发的计算优化编译器，用于优化PyTorch深度学习模型在阿里云GPU异构计算实例上的计算性能，相比原始的神龙AI加速引擎AIACC，AIACC-AGSpeed是AIACC 2.0产品的实现，是完全独立的产品形态，可以实现无感的计算优化功能。

![](/images/collections/0.raw/zhihu/tvm/asset/img_ef5f07847e39.jpg)

AGSpeed：https://help.aliyun.com/zh/egs/what-is-agspeed?spm=a2c4g.11186623.0.0.46b12b5cH6BrOm

#### XNNC

Xtensa 神经网络编译器(XNNC)的目的是将浮点卷积神经网络(CNN) 转换为Cadence Tensilica 处理器的优化定点解决方案。用户通过 XNNC 工作流程的不同阶段和模式有效地使用配置和运行支持的神经网络模型。

Tensilica Xtensa 神经网络编译器 v2 训练：https://www.cadence.com/en_US/home/training/all-courses/86277.html 

Cadence Tensilica XNNC Xtensa Neural Network Compiler: Optimizer：https://r6.ieee.org/scv-cis/wp-content/uploads/sites//03/Cadence_Tensilica_XNNC_Optimizer_3_4_2019_Final.pdf 

Cadence Tensilica Product Overview：https://www.ims.uni-hannover.de/fileadmin/ims/aktivitaeten/Tensilica_Day/_td19_cadence.pdf 

Tensilica DNA 100 架构和编程培训：https://www.cadence.com/en_US/home/training/all-courses/86266.html 

### 6.编译器-GPU

#### GPUCC

题目：gpucc: An open-source GPGPU compiler

名称：gpucc：开源 GPGPU 编译器

论文：https://ieeexplore.ieee.org/document/7559536 

#### POSTER

题目：POSTER: An LLVM-based Open-Source Compiler for NVIDIA GPUs

名称：POSTER:一个基于llvm的NVIDIA gpu开源编译器

论文：https://home.cse.ust.hk/~weiwa/papers/gass-ppopp22-poster.pdf 

#### BRASIL

题目：BRASIL: A High-Integrity GPGPU Toolchain for Automotive Systems

名称：RASIL：用于汽车系统的高完整性GPGPU工具链

论文：https://upcommons.upc.edu/bitstream/handle//iccd19.pdf 

### 7.编译器-NPU

#### NPiler

NPU 编译工作流程，称为NPiler，它自动将命令式代码的带注释区域转换为神经网络表示。首先，程序员注释他/她想要转换为神经表示的命令式代码区域。NPiler接受程序员的输入来训练网络。在此步骤中，NPiler自动观察注释区域的输入和输出对，以收集训练和测试数据。然后，NPiler根据程序员提供的约束来训练每种可能的 NPU 拓扑。此次探索的结果在测试数据的最小均方根误差 (RMSE) 方面提供了最佳的 NPU 拓扑。最后，NPiler编译器用最终的神经网络表示替换带注释的区域。

NPiler-NPU编译器：http://act-lab.org/artifacts/npiler/ 

#### Vela

Arm NPU Vela 编译器该工具用于将TFLμ模型编译成可在Ethos -U NPU上运行的优化版本。优化后的模型包含 TensorFlow Lite 自定义运算符（支持的运算符），用于可通过 Ethos-U NPU 加速的模型部分。模型中无法加速的部分保持不变，而是 使用适当的内核在 Cortex-M 系列 CPU 上运行。Vela 尝试了多种不同的编译策略，并对每一种策略应用了成本函数。然后，它为每个受支持的运算符或运算符组选择最佳执行计划。

Arm Ethos-U NPU Software Tools：https://developer.arm.com/documentation//NPU-software-overview/NPU-software-tooling 

Arm Ethos-U NPU Vela 编译器：https://developer.arm.com/documentation//NPU-software-overview/NPU-software-tooling/The-Vela-compiler 

### 8.编译器-FPGA

#### Vyasa

题目：Vyasa: A High-Performance Vectorizing Compiler for Tensor Convolutions on the Xilinx AI Engine

名称：Vyasa：Xilinx AI 引擎上用于张量卷积的高性能矢量化编译器

论文：[https://arxiv.org/abs/2006.01331](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2006.01331) 

![](/images/collections/0.raw/zhihu/tvm/asset/img_ac889b929270.jpg)

#### VitisAI

AMD Vitis AI编译器 (VAI_C) 充当一系列编译器的统一接口，用于优化各种深度学习处理单元 (DPU) 的神经网络计算。每个编译器都将网络模型映射到高度优化的 DPU 指令序列。 VAI_C框架的简化描述如下图所示。在解析优化和量化的输入模型的拓扑之后，VAI_C构建一个内部计算图作为中间表示（IR），因此，相应的控制流和数据流表示。然后，它执行多种优化，例如计算节点融合，例如，当批量范数融合到主导卷积中时，通过利用固有的并行性或利用数据重用来实现高效的指令调度。

![](/images/collections/0.raw/zhihu/tvm/asset/img_2bdb83a3c5a9.jpg)

Vitis AI Compiler：https://docs.xilinx.com/r/en-US/ug1414-vitis-ai/Vitis-AI-Compiler?tocId=TmELDzcWveWSZETK~7_n6A

#### HLSCompiler

英特尔 HLS 编译器是一款高级综合 (HLS) 工具，它采用不定时 C++ 作为输入，并生成针对英特尔 FPGA 优化的生产质量寄存器传输级 (RTL) 代码。该工具通过提高 FPGA 硬件设计的抽象级别，加快了 RTL 的验证时间。用 C++ 开发的模型的验证速度通常比 RTL 快几个数量级。英特尔 HLS 编译器包含在英特尔 Quartus Prime 设计软件专业版安装中。

Intel高级综合编译器：https://www.intel.com/content/www/us/en/software/programmable/quartus-prime/hls-compiler.html

HLS编译器：[https://github.com/nlsynth/karuta](https://link.zhihu.com/?target=https%3A//github.com/nlsynth/karuta) 

#### FIRCompiler

Xilinx LogiCORE IP FIR 编译器 内核提供了一个通用接口来生成高度参数化、面积高效的高性能 FIR 滤波器。

![](/images/collections/0.raw/zhihu/tvm/asset/img_b5ec36ebca13.jpg)

FIR Compiler AMD ：https://www.intel.com/programmable/technical-pdfs/655583.pdf 

FIR Compiler：https://www.xilinx.com/products/intellectual-property/fir_compiler.html 

FIR Compiler LogiCORE IP Product Guide：https://docs.xilinx.com/r/en-US/pg149-fir-compiler 

### 9.编译器-RISCV

#### RISCV-GNU

RISCV-GNU是 RISC-V C 和 C++ 交叉编译器。它支持两种构建模式：通用 ELF/Newlib 工具链和更复杂的 Linux-ELF/glibc 工具链。

RISC-V GNU Compiler：[https://github.com/riscv-collab/riscv-gnu-toolchain](https://link.zhihu.com/?target=https%3A//github.com/riscv-collab/riscv-gnu-toolchain) 

RISC-V Cross Compiler Toolchain：https://www.cl.cam.ac.uk/~jrrk2/docs/untether-v0.2/riscv_compile/ 

### 10.编译框架-TPU

#### TPU-MLIR

题目：TPU-MLIR: A Compiler For TPU Using MLIR

名称：TPU-MLIR：使用 MLIR 的 TPU 编译器

论文：[https://arxiv.org/abs/2210.15016](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2210.15016) 

代码：[https://github.com/sophgo/tpu-mlir](https://link.zhihu.com/?target=https%3A//github.com/sophgo/tpu-mlir) 

![](/images/collections/0.raw/zhihu/tvm/asset/img_d515474ad009.jpg)

#### EdgeTPUCompiler

Edge TPU 编译器 ( edgetpu_compiler) 是一个命令行工具，可将 TensorFlow Lite 模型（.tflite文件）编译为与 Edge TPU 兼容的文件。本页介绍了如何使用编译器以及它的工作原理。

Edge TPU Compiler：https://coral.ai/docs/edgetpu/compiler/ 

Edge TPU Compiler：https://cloud.google.com/edge-tpu?hl=zh-cn 

### 11.编译器-DSP

#### CADiSP

CADiSP - 一个图形编译器，用于以完全符号方式对 DSP 进行编程：https://ieeexplore.ieee.org/document/116111 

#### MatlabCompiler

使用 MATLAB Compiler 从 MATLAB 函数创建独立应用程序®，该函数使用 DSP System Toolbox 中的系统对象。

MatlabCompiler：https://www.mathworks.com/help/dsp/ug/generate-dsp-applications-with-matlab-compiler.html 

### 12.编译器-MCU

#### Tasking

与 Infineon Technologies 合作提供适用于 TriCore™/AURIX™ 的免费 TASKING VX 工具集，让您体验和评估 AURIX™ 微控制器的潜力。它代表了TriCore 流行的高性能 TASKING VX 工具集的限时版本，并且通过此注册独家提供。

TriCore Compiler：https://resources.tasking.com/p/2018-06-20-tricore-compiler-en-webinar-usa-emea-taskingvid-2 

Tasking Wiki：https://en.wikipedia.org/wiki/TASKING 

英飞凌MCU Tasking编译器：https://blog.csdn.net/weixin_43580890/article/details/133706821 

适用于 TRICORE/AURIX 的免费任务 VX 工具集：https://www.tasking.com/landing/Free-TASKING-TriCore

### 13.编译器-Graph

#### Glow

Glow 是一个机器学习编译器，可以加速深度学习框架在不同硬件平台上的性能。它使硬件开发人员和研究人员的生态系统能够专注于构建可由 PyTorch 等深度学习框架支持的下一代硬件加速器。

Glow 接受来自 PyTorch 等深度学习框架的计算图，并为机器学习加速器生成高度优化的代码。它包含许多机器学习和硬件优化，例如内核融合，以加速模型开发。

Glow 代码：[https://github.com/pytorch/glow](https://link.zhihu.com/?target=https%3A//github.com/pytorch/glow) 

Glow：https://ai.meta.com/tools/glow/ 

#### oneDNN-GraphCompiler

oneDNN Graph Compiler 是 oneDNN Graph API 的实验性后端。它可以为复杂的计算图生成优化的实现，包括多头注意力 (MHA)、多层感知器 (MLP) 和典型数据类型上的卷积残差块，用于推理和训练。它还通过提供更灵活的算子融合来提高性能。oneDNN 图形编译器的使用对于应用程序来说是透明的，因为它不涉及 API 或编程模型更改。

oneDNN-GraphCompiler：https://oneapi-src.github.io/oneDNN/dev_guide_graph_compiler.html 

oneDNN-GraphCompiler 论文：[https://arxiv.org/abs/2301.01333](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2301.01333) 

#### TIDL-GraphCompiler

该模块是一个图形编译器，用于解析深度神经网络并生成在 TI 硬件上进行推理所需的信息。目前它是为Jacinto7系列的ADAS/AD SOC设计的。这些 SOC 具有 TI 的下一代 DSP (C7x) 和用于深度学习网络推理的专用硬件加速器 (MMA)。网络编译器考虑这些处理器和可用存储器子系统的能力，并为给定网络提供网络执行信息和存储器布局。  

TIDL-GraphCompiler：https://software-dl.ti.com/jacinto7/esd/processor-sdk-rtos-jacinto_02_00_21/exports/docs/tidl_j7_01_01_00_10/ti_dl/docs/user_guide_html/md_tidl_naps_readme.html 

#### nGraph

题目：Intel nGraph: An Intermediate Representation, Compiler, and Executor for Deep Learning

名称：英特尔 nGraph：深度学习的中间表示、编译器和执行器

论文：[https://arxiv.org/abs/1801.08058](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1801.08058) 

代码：[https://github.com/NervanaSystems/ngraph](https://link.zhihu.com/?target=https%3A//github.com/NervanaSystems/ngraph) 

#### nGraph-HE

题目：nGraph-HE: A Graph Compiler for Deep Learning on Homomorphically Encrypted Data

名称：nGraph-HE：用于同态加密数据深度学习的图编译器

论文：[https://arxiv.org/abs/1810.10121](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1810.10121) 

### 总结

TVM、LLVM、MLIR、NVCC、XLA、GCC。
