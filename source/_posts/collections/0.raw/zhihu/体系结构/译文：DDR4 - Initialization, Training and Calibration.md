---
title: 译文：DDR4 - Initialization, Training and Calibration
date: "2020-10-04 00:00:00"
updated: "2020-10-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/译文-DDR4-Initialization,-Training-and-Calibration/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/261747940
---


**一文了解 DDR4 中的初始化(Initialization)、内存训练(Training )以及校准(Calibration)，简称 ITC。（ITC 只是译者自己想的缩写）。
原文地址： https://www.systemverilog.io/ddr4-initialization-and-calibration
申请翻译授权中，如有侵权，将会删除
#### 引言 Introduction**

当一个拥有 DRAM 子系统的设备启动时，有几件事需要在 DRAM 进入工作状态之前完成。下图是来自 JEDEC specification （DDR4 标准，https://www.jedec.org/standards-documents/docs/jesd79-4a）的状态机，展示出上电之后 DRAM 经历的几个状态。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_49f26fac531c.jpg)

图-1 DDR4 初始化状态机

实质上，完整的初始化过程（Initialization）包括以下 4 个单独的步骤：

- 上电与初始化 ，Power-up and Initialization
- ZQ 校准，ZQ Calibration
- Verf DQ 校准，Verf DQ Calibration
- 读写训练，即存储介质训练/初始校准，Read/Write Training
译注：至此标题中的 Initialization，calibration，training 已经全部出现，接下来的文章中将尝试让读者明白这三个词的含义，以及这三个阶段中具体做了哪些事情。

为了能够更好地理解接下来的几节内容，这里我们假设有一个如下图中的系统：具有单个 DIMM 器件（即只有单个内存条）的 ASIC/FPGA/处理器（译注：以下称为主机）。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f192538ba77b.jpg)

图-2 示例系统

#### **初始化 Initialization**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f7cbca888c3e.png)

图-3 初始化相关的状态

上电与初始化是由一系列精心设计的步骤组成的序列（sequence）。一般来说，在系统上电之后，ASIC/FPGA/处理器中的 DDR 控制器会被从复位状态中释放，自动执行上电与初始化序列。下文中列举了一个超简化的控制器所做的工作，而在 JESD79-49A 的 3.3 节中有更详细并准确的描述。

- 给 DRAM 颗粒上电
- 置低 DRAM 的复位端口 RESET，并使能 DRAM 的时钟使能 CKE
- 使能并产生时钟 CK_t/CK_c
- 向 DRAM 发出 MRS 命令，并按照特定的序列读取/配置 DRAM 的 Mode Register
- 进行 ZQ 校准（ZQCL）
- 使 DRAM 进入状态机中的 IDLE 状态，为后续读写做好准备
在上述一系列流程结束后，DIMM 内存条上的 DRAM 颗粒已经了解了其需要工作在哪个频率上，以及它的时序参数是多少，包括 CAS Latency，CAS Write Latency 等等。（译注：那么读者们，DRAM 是具体通过哪一个步骤了解这些信息的呢？）

原作者的另一篇文章可以帮助你了解更多关于时序参数的事儿：DDR4 timing parameters： https://www.systemverilog.io/understanding-ddr4-timing-parameters

#### **ZQ 校准 ZQ Calibration**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_239f942f7476.png)

图-4 ZQCL

ZQ 校准的概念与 DDR 数据信号线 DQ 的电路有关。当讨论 ZQ 校准做了什么以及为何而做之前，我们首先需要来看下每个 DQ 管脚之后的电路。请注意，DQ 管脚都是双向的（bidirectional），负责在写操作时接收数据，在读操作时发送数据。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_bb11cb6ce040.jpg)

图-5 DQ 校准模块

现在如图 5 所示，如果你从 DRAM 内部的视角来看，每个 DQ 管脚之后的电路都有多个并联的 240 欧姆电阻组成。（译注：具体地说不上来，但这些电阻用于提高信号完整性）由于颗粒制造时， CMOS 工艺本身的限制，这些电阻**不可能是精确的 240 欧姆**。此外，阻值还会随着温度和电压的改变而改变。所以必须**校准至接近 240 欧姆**，用于提高信号完整性。

为了能够对这些电阻阻值进行精确校准，每个 DRAM 颗粒具有：

- 专用的 DQ 校准模块
- 一个 ZQ 管脚连接至外部电阻，该电阻阻值为精确的 240 欧姆
这个外部电阻因为其精确而且不会随温度变化而变化的阻值，被用于参考阻值。在初始化过程中，ZQCL 命令发出后，DQ 校准模块对每个 DQ 管脚连接的电阻进行校准。

上文是对 ZQ 校准一个大概的讲解：

- DQ 管脚连接的电阻用于提高信号完整性 ->
- 需要精确的阻值 ->
- 由于制造工艺以及温度变化的限制，这个阻值并不精确 ->
- 引入 ZQ 管脚连接的外部电阻和 DQ 校准模块，在初始化阶段对 DQ 电阻值进行校准 ->
- 提高信号完整性，以支持更高的数据速率
如果你满意了，可以直接忽略本节剩余的内容，如果没有，本节剩余的内容将讨论更多的细节，请继续：

DQ 电路中的 240 欧姆电阻是 Poly Silicon Resistor 类型的，通常来说，它们的阻值会略大于 240 欧姆。因此，在 DQ 电阻上并联了很多 PMOS 管，当这些管子开启时，通过并联电阻降低 DQ 电阻的阻值，以接近 240 欧姆。

下图中放大了某个电阻的内部结构，有 5 个 PMOS 管与 DQ 电阻并联，通过 VOU[0:4] 控制管子的开关，以控制并联上来的电阻数量。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_98578627aedb.jpg)

图-6 DQ driver/receiver 电路，来自 Micron datasheet

连接至 DQ 校准控制模块的电路包括一个由两个电阻组成的分压电路，其中一个是上面提到的可调阻值的 poly 电阻，而另一个则是精准的 240 欧姆电阻。当 ZQCL 命令发出后，DQ 校准控制模块使能，并通过其内部逻辑控制 VOH[0:4] 信号调整 poly 电阻阻值，直到分压电路的电压达到 VDDQ/2，即两者均为 240 欧姆。此时 ZQ 校准结束，并保存此时的 VOH 值，复制到每个 DQ 管脚的电路。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_fc23a568402a.jpg)

图-7 DQ 校准模块，来自 Micron datasheet

那么问题来了，为什么不在每个 DRAM 出厂时就将阻值调整至 240 欧姆呢？而是在每次使用之前（初始化）调整呢？

这是因为并联的电阻网络允许用户在不同的使用条件下对电阻进行调整，为读操作调整驱动强度，为写操作调整端接电阻值。此外，不同 PCB 具有不同的阻抗，可调整的电阻网络可针对每个 PCB 单独调整阻值，以提高信号完整性，最大化信号眼图，允许 DRAM 工作在更高的频率下。

信号驱动强度可以通过 mode register MR1[2:1] 控制。端接电阻可以通过 MR/5 中的 RTT_NOM, RTT_WR & RTT_PARK 进行调节。 

#### **DQ 判决电平校准 Verf DQ Calibraton**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_03ad4136a056.png)

图-8 VrefDQ Calibration

DDR4 数据线的端接方式（Termination Style）从 CCT（Center Tapped Termination，也称 SSTL，Series-Stud Terminated Logic）更改为 POD（Pseudo Open Drain）。这是为了提高高速下的信号完整性，并节约 IO 功耗。这不是 POD 的首次应用，GDDR5 同样使用 POD。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_4f2e0ba542f6.jpg)

图-9 DDR3（SSTL）v.s. DDR4（POD），来自 Micron datasheet

根据上图可以发现，在 DDR3 中接收方使用 Vdd/2 作为判决电平，判断信号为 0 或者为 1，上图中 DDR3 的接收实际上是一个分压电路。

但是在 DDR4 中，接收方不再有分压电路，取而代之的是一个内部参考判决电平，判断信号为 0 或者为 1。这个判决电平称为 VerfDQ。VerfDQ 可以通过模式寄存器 MR6 进行设定，在 VrefDQ 阶段，控制器需要通过尝试不同的 VerfDQ 值，来设置一个能够正确区分高低电平的值。

#### **读写训练 Read/Write Training**

在完成上述步骤后，DRAM 初始化已经完成，并处于 IDLE 状态，但此时存储介质仍然未处于正确的工作状态。在正确读写 DRAM 之前，DDR 控制器或者物理层还必须来做一些重要的步骤，称为读写训练，也称存储介质训练/初始校准。

- 运行算法，以对齐 DRAM 的时钟信号 CK 与数据有效信号 DQS 的边沿
- 运行算法，确定 DRAM 颗粒的读写延迟
- 将采样时刻移动至读取数据眼图的中央
- 报告错误，如果此时的信号完整性实在太差，没办法确保可靠的读写操作

#### **为什么需要读写训练**

让我们一起仔细地观察我们的参考系统，下图显示数据与地址/控制信号，在内存条与主机（ASIC/Processor）之间是如何连接的。

- 数据（DQ）以及数据有效（DQS）信号连接至内存条的相应位置，因为内存条与主机上相应端口是一一对应的，因此采用星型拓扑。
- 时钟、命令&地址信号（CK，CKE，A，WE，CSn）连接至 DIMM 内存条时，采用一种称为 fly-by 的拓扑结构，如下图黑线所示。DIMM 上的多个颗粒（比如下图中有 8 个）都共享同一组地址/控制信号，采用 fly-by 结构能够提高信号完整性与信号速度。
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b2b8c08b09fc.jpg)

图-10 详细的参考系统示例

这样一来，我们从主机的角度来看，与 DIMM 上不同的颗粒的距离是不同的。而从 DIMM 的角度来看，时钟（黑色）与数据（绿色）之间的相对延迟对于不同颗粒是不同的。训练的目的即消除这两个不同对数据读写的影响。

DRAM 本身是个很“呆” 的器件，很多事情都需要 DDR 控制器来完成，为什么这么说呢。

如果你要进行写操作，在初始化期间你需要通过将 CAS Write Latency 写入 DRAM 模式寄存器，（CWL 是写入列地址与数据之间的延迟时间长度），此后 DRAM 将始终使用该时序参数，不会变化。DDR 控制器需要负责根据板级的布线延迟以及 fly-by 结构的路由延迟，调整数据与地址信号之间的延迟，以保证地址和数据信号到达每个 DRAM 的相对延迟满足 CWL。

举例而言，如果设置 CWL 为 9，一旦主机在发出列地址后，由于地址到达各 DRAM 的时间不同，因此需要以不同的延迟，在各数据线上发送写数据，以保证写数据到达 DRAM 的延迟均为 9。

读操作也需要 DDR 控制器来做类似的工作。考虑到每个 DRAM 颗粒位于 DIMM 的不同位置，距离主机的距离不同。因此每个 DRAM 颗粒接收到读命令的时间不同，因此后续回应的读数据到达主机的时间也不相同。初始化期间，主机确定各个 DRAM 颗粒的延迟，并以此训练内部的电路，使电路能够在正确的时刻采样来自 DRAM 的读数据。

对于读写训练，控制器/PHY 一般提供多种算法。最常见的算法包括：

- Write leveling
- MPR Pattern Write
- Read Centering
- Write Centering
以上算法一般由控制器/PHY（译注：以下统一表示为控制器） 完成，用户只需要在寄存器中使能/失能相关算法，并根据其结果进行相应操作。接下来的几节将进一步探讨控制器是如何具体实现这些算法的。

#### **Write Leveling**

DRAM 写入中最重要的，不能违反的时序参数是 tDQSS，表示数据有效信号 DQS 相对时钟信号 CK 的相对位置。tDQSS 必须在协议规定的 tDQSS(MIN) 和 tDQSS(MAX) 之间。如果 tDQSS 超出规定的限制，那么可能会写入错误的数据。

既然内存条上每个 DRAM 颗粒的数据有效信号相对于时钟的延迟都不同，所以控制器必须对每个 DRAM 颗粒的 tDQSS 进行训练，并根据训练的结果满足每个颗粒不同的延迟需求。

启用 Write Leveling 时，控制器会做以下几项工作：

- 将模式寄存器 MR1 的比特 7 设为 1，使 DRAM 进入 Write Leveling 模式。在该模式中，DRAM 在数据有效 DQS 信号上升沿采样时钟信号 CK，并将采样值通过数据信号 DQ 返回给控制器
- 控制器发送一系列 DQS 信号，在 Write Leveling 模式中，DRAM 根据 DQS 信号采样 CK 信号，返回采样值 1 或者 0
- 控制器接下来

- 观察 DRAM 返回的 CK 采样值
- 根据采样值增加或者减少 DQS 信号的延迟
- 继续发送更新延迟的 DQS 信号，继续观察 CK 采样值

- DRAM 在 DQS 信号有效时，采样 CK 信号并返回
- 重复步骤 2 至 4，直到控制器检测到返回值从 0 变化到 1。此时，DQS 与 CK 上升沿对齐，控制器锁定当前的 DQS 延迟，当前 DRAM 的 Write Leveling 完成
- 重复步骤 2 至 5，直到 DIMM 的所有 DRAM 颗粒都完成 Write Leveling
- 通过向模式寄存器 MR1 的比特 7 写 0，退出 Write Leveling 模式
下图展示了 Write Leveling 的概念。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f34ad36a8ed2.jpg)

图-11 Write Leveling 示意图

#### **MPR Pattern Write**

MPR（Multi Purpose Register，多用途寄存器）Pattern Write 实际上并不是一种校准算法，通常是读写对齐（Read/Write Centering）之前的一个预备步骤。

DDR4 DRAM 包括四个 8 比特可编程寄存器，称为 MPR，用于 DQ 比特训练（比如 Read/Write Centering）。通过向模式寄存器 MR3[2] 写 1，进入 MPR 访问模式，在该模式下所以向 DRAM 进行的读写操作都会同 MPR 进行，而不是真正的存储介质。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ab9afb62afc3.jpg)

#### **Read Centering**

Read Centering 的目的是训练控制器的读采样电路，在读数据眼图的中央进行采样，以获得最稳定的采样结果。DDR 控制器

- 使能模式寄存器 MR3 中的 bit 2，进入 MPR 访问模式，从 MPR 而不是 DRAM 存储介质中读取数据
- 发起一系列读请求，此时返回的是在 MPR Pattern Write 步骤中预先写入 MPR 的 pattern。假设 pattern 是交替变化的 1-0-1-0-...
- 在读数据进行过程中,增加或者减少采样电路相对于时钟的采样延迟，来确定读数据眼图的左右边界。（译注：即保证读取数据正确，与 pattern 一致时，最小以及最大采样延迟）
- 在确定眼图的左右边界后，将读延迟寄存器设置为眼图的中央
- 对每一条数据信号 DQ 重复上述操作

#### **Write Centering**

与 Read Centering 类似，Write Centering 的目的是设定每条数据信号线上写数据的发送延迟，使 DRAM 端能够根据对齐数据眼图的中央的 DQS 采样数据信号 DQ。

在 Write Centering 的过程中，控制器不断执行 写-读-延迟变化-比较 （Write-Read-Shift-Compare）的流程

- 发出一系列的写，读请求
- 增加写数据时的发送延迟
- 将读取的数据与发送数据进行比较
通过上述流程，控制器判断出正常读写数据时能容忍的最大发送延迟。因此可以推断出写数据的左右有效边界，并在 DRAM 端将写数据的中央与 DQS 边沿对齐。

#### **周期性校准 Periodic Calibration**

交换机或者路由器等网络设备，运行过程中的温度和电压可能发生变化。为了确保信号完整性，以及读写的稳定性，一些在初始化阶段进行训练的参数必须重新训练更新。控制器 IP 通常会提供下列两项周期性校准流程。

- 周期性 ZQ 校准， 也被称为 ZQCS （ZQ Calibration Short），用于定期校准 240 欧姆电阻
- 周期性 Read Centering，重新计算读取延迟以及其他相关的参数
周期性校准是一项可选的功能，因为如果你可以确定你的设备只会工作在稳定的温度环境下，那么初始化时进行的 ZQ 校准以及读写训练就已经足够了

一般来说控制器可以通过设定一个计时器，来进行周期性校准，在计时器计满中断发生后进行周期性校准。

#### **总结 In a Nutshell**

在 DRAM 投入使用之前，有 4 个步骤的工作需要完成

- 上电与初始化 ，Power-up and Initialization
- ZQ 校准，ZQ Calibration
- Verf DQ 校准，Verf DQ Calibration
- 读写训练，即存储介质训练/初始校准，Read/Write Training
在这些步骤完成后，系统正式进入 IDLE 状态，并为后续的读写操作做好准备。根据设备的运行环境，你可能需要使能定期校准。

#### **参考文献 Reference**

- JEDEC specification
- A number of Micron DDR4 Datasheets
- A number of Micron DDR3 Datasheets
- Rambus - Fly-By Topology
- AIC Design - Resistors and Inductors
- Bit-Tech
- EETimes
- JEDEC DDR4 Mini Workshop
- Cadence
- Texas Instruments
