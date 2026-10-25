---
title: UFS 学习笔记（概念入门篇）
date: "2023-11-01 00:00:00"
updated: "2023-11-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/UFS-学习笔记(概念入门篇)-fe1ae4/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/663057180
---


*笔者作为初次学习存储协议的学生，在目前水平下无法假设出您作为已经拥有何种基础的朋友，但会持续的对文章进行修正完善，以确保您能容易的从本文中理解相关术语或通过 bing 搜索引擎准确的查找到该术语的解释。*

*由于笔者期望本文内容尽可能的全面，除非您已经对该章节主干理解，否则建议第一次阅读时跳过引用内容，以避免被引用的内容带偏主干而造成理解困难。建议阅读完该章节包括引用在内的所有内容后再跳到下一章节。*

*其次，本文也是在借鉴各位前辈撰写的，一些术语可能被遗漏未统一或与协议相比过分缩写或缩写但未在第一次提及时标注全程，恳请各位朋友发现后不吝赐教。*

*最后，笔者个人的学习感受觉得协议手册是学习 UFS 协议的重要工具，笔记只能作为参考和引路人，除了遇见问题要去手册中寻找准确解释外，不建议在笔记中将一些关键性的术语翻译以避免意译不准确引发的错误，如果您发现文中有哪些地方过分翻译也请麻烦指出。*

### 一、UFS 协议技术

经过固态技术协会（Joint Electron Device Engineering Council，JEDEC）不断对 eMMC 协议的完善，eMMC 5.1 发布后因为无法继续提高其传输速度，JEDEC 于 2011 年发布了 UFS 1.0 协议，尽管 UFS 1.0 相比较同时期的 eMMC 并没有实质上的优势，但由于 UFS 协议基础优秀，随着时代逐步发展，UFS 2.1 相比较 eMMC 已经形成绝对压倒性优势，奠定了 UFS 协议未来成为存储技术主流的地位：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3d46dcc5e78e.jpg)

UFS 之所以可以如此之快的原因在于：

- UFS 使用了差分串行传输；

- 串行决定了可以使用更快的时钟（时钟信息可以嵌在数据流中）；
- 差分则大大增强其抗干扰能力强（eMMC 后续之所以速度上不去就是因为使用的是并行数据传输，抗干扰能力弱，无法保证在高速时钟时的信号完整性）；

- UFS 支持多通道数据传输（目前最多支持两个通道），多通道可以让 UFS 在成本、功耗和性能之间做取舍；
- 全双工（eMMC 是半双工）；
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2dce73507637.jpg)

要让 UFS 速度快，这些基础设施是必须的。但要充分利用底层高速数据传输通道，还需要上层数据传输协议配合：

- UFS 支持命令队列，主机一下可以发很多个命令下去；
- UFS 支持异步命令（并行乱序执行，谁先完成谁先返回状态，eMMC 的同步命令处理方式不支持）；
UFS 协议更像是一个整合者，重新定义的东西不多，Application Layer 主要是将 SCSI 规范搬过来，下面的 M-PHY 和 UniPro 则直接挪用 MIPI 标准的部分，优点当然显而易见，处理不用担心以往优秀且成熟协议的稳定性外，也同时大大减少重新设计硬件的工作量。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e99e219c27cf.jpg)

**M-PHY 和 UniPro 扩展：图摘自《mipi_M-PHY_specification》《mipi_UniPro_specification》
L1，M-PHY：专为移动设备开发的一种串行接口技术，时钟频率能够达到 5.8Gbps（高 performance），每个 Upstream Lane 或者 Downstream Lane 只需要两根差分信号线（pin 脚少，方便 PCB 布线），并且具有多种省电模式。M-PHY 是全双工且不要求上行 Lane 和下行 Lane 成对出现，下图就是两个下行 Lane 配一个上行 Lane 的例子。但是注意针对目前的 UFS 上行下行 Lane 还都是成对出现的；![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_76f28ca979aa.jpg)

> UniPro：也是针对 mobile 设备开发的，广泛用于移动设备 AP、协处理器和 modem 之前的通信协议，通常把这层看作是对硬件接口的抽象、管理和负责通信的的软件层来帮助理解；

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_a7783ef5cc66.jpg)

> L1.5 PHY Adapter：物理适配层，用于检测双向 Lane 通路的个数，并提供软件支持。允许访问对端 L1.5 层的控制参数和状态，并可以通过原子操作改变对端 Power Mode。下图显示了 L1.5 层的数据是以 *Symbol*** 为单位的，每个 symbol 有 17 个 bits，包含有两个 Byte 和一个 control bit (bit16)。Control bit 是 1 的时候，表明后面跟着的两个 bytes 是控制命令；如果是 0 ，说明后面的两个 bytes 是 data payload；

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f25943e8275e.jpg)

**L2 Data Link：数据链路层，主要保证数据通信过程中的可靠性。其中采用 ECC 保证接收数据的准确性，接收端也要留有足够的 buffer 来缓存接收到的数据。一旦接收失败，发送端必须重新发送一次。L 2层的数据单位是 *Frame***，在原有 L1 层的基础上，把独立的 symbol 打包。每个 Frame 最多可以打包 144 个 symbol，并在 Frame 的头尾处各添加上 Header（ESC_DL+SOF+TC+Reserved） 和 Trailer（ESC_DL+EOF_EVEN+Frame Seq. Number）之后，附上16bits ECC 来侦查纠错。**这层有个比较重要的概念是 TC（Traffic Class），UFS 支持两种优先级的 Data Frame TC0 和 TC1。TC1 的优先级高于 TC0，绝大多数的数据都是在 TC0 这个级别传递的，紧急的数据通过 TC1 来传递。TC1 可以中断、抢占正在发送的 TC0 的数据发送。![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ffde6edff154.jpg)

> L3 Network：网络层，负责数据 route 到正确的目标设备，比如下图的 AP#3 这个设备，它不仅能与设备 1、2、5 通信，那么通过 UniPro L3 也允许其与设备 4 和 6 进行通信。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_151a4b7eb640.jpg)

> L3 的数据的单位是 *package***，在层 2 的 Frame 的基础上增加了 7bits 的 shorter-header，用来标识数据 route 的目标地址。**L4 Transport：传输层。由于基本通信服务已经在底层处理的差不多了，所以传输层是相对比较简单的一层，它提供对多 device 和多 client 的支持。L4 层的数据的单位是 *segment***，在 package 的基础上增加了 5bit 的“Cport” identifier，我们在这里可以把它看做是 UFS 的 sub-address。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_669a00eb704c.jpg)

**DME（Device Management Entity）与 UniPro 的每层都留有 SAP 接口（Service Access Point），通过 SAP DME 可以访问每个 layer 的控制和状态参数，管理他们的 power 模式，并且可以访问、控制对端设备的 UniPro 模块。![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ef67b8bdf783.jpg)

> UniPro 的上面就是 UTP 和 SCSI 命令集，由于涉及的 SCSI 命令是很大一块需要单独来讲，所以这里只简单两笔。正如最开始提到的，UTP 和 SCSI 是属于 SCSI 这部分，在 JEDEC 的标准里能找到它们的具体说明。
UTP（UFS Transport Protocol）：这层软件主要有两个目的，一是把 UniPro 的 segment 打包成 UFS 直接可以识别的命令格式；二是通过这层可以让 UFS 自己来掌握发送数据的节奏、控制自身的状态等，这样既可以免去 host 端持续的查询 UFS 的状态所带来的系统消耗，也是因为只有 UFS 本身最了解自己的内部状态，能够选择以最佳的方式在最佳时间把数据传递出去。
SCSI 扩展：图摘自《JESD223D》《JESD220E-3.1》
UFS Application Command Layer：这层是 UFS 命令集，分为 UFS 的独有内建命令集和 SCSI（Small Computer System Interface）的命令集。SCSI 命令分为 SBC 和 SPC，分别是 SCSI Block Commands 和 SCSI Primary Command。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3912bb443a96.jpg)

> 在 SCSI 架构中，主机上的 SCSI 接口卡称为 Initiator，与其相连接的 SCSI 磁盘等设备称为 Target，在逻辑上，Initiator 和 Target 之间通信的工作模式，与两个网络设备之间的模式相似，他们之间采用 client-server 的“请求-回应”模式：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_6c5466b2fab1.jpg)

> SCSI 的 Initiator 与 Target 共同构成了一个典型的 C/S 模型，每个指令都是“请求/应答”这样的模型来实现：
* Initiator主要任务：发出SCSI请求；
* Target主要任务：回答SCSI请求，通过 LU 提供业务，并通过任务管理器提供任务管理功能；
LU（Logical Unit）：逻辑单元，是指一个可被操作系统识别和访问的逻辑存储单元。一个 UFS 设备可以包含多个 LU，每个 LU 可以被视为一个独立的存储设备；
LUs ： LU 的复数形式；
LUN（Logical Unit Number）：逻辑单元号码，是用来标识不同 LU 的唯一编号。每个 LU 都有一个对应的 LUN，它可以用来在系统中唯一地标识和访问该 LU；
备注：
I_T_L_Q Nexus：唯一地定义了连接到特定 Host Initiator Port (I) 的一个特定 Device Target Port (T) 上的一个特定 Logical Unit (L) 内的一个 command slot (Q)<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)。

### 二、UFS 重要 Layer

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3e6e87059bc8.jpg)

#### 2.1 UFS Application Layer**

UFS 应用层由基于 SCSI 体系结构模型 （SAM） 的 UFS SCSI 命令集组成：

- 传输事务使用固定长度的CDB（command descriptor block，命令描述符块）进行；
- 每个事务都遵循 I_T_L_Q 关系，这意味着 CDB 需要识别与目标中的特定 LUN 通信的发起方。
**命令描述符块的长度可以是 6、10 或 16 个字节，一些重要的命令：
* READ / WRITE；
* READ CAPACITY：获取逻辑单元的大小；
* REPORT LUNS：获取所有逻辑单元的列表；
* TEST UNIT READY：检查逻辑单元是否已准备好接受请求；
* START STOP UNIT：开关设备的电源模式；
* INQUIRY：查询有关逻辑单元的更多信息；
#### 2.2 Logical unit**

UFS 设备有若干个 LU，LU 接收主机发过来的命令或请求可能来自应用层的 SCSI 模块、设备管理器或者任务管理器：**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2de04d97bb88.jpg)

每个 LU 都是独立的，“独立”表现在下面几个方面：

- 逻辑地址空间是独立的，都是从LBA<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2) 0（Logical Block Addressing，逻辑块寻址）开始；
- 逻辑块大小可以不同，可以为4KB，..；
- 可以有不同的安全属性，比如可以设置不同的写保护属性；
- 每个 LU 可以有自己的命令队列；
- LU 可以启动代码、应用程序代码和应用数据；
总结来说，划分不同 LU 有以下作用：

- 外部可寻址；
- 存储实体（可以单独做 Boot 启动、写保护或 RPMB<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)（Replay Protected Memory Block，重播保护内存块） ）；
- 内部任务队列；
一个 UFS 设备最多可以有 32 个逻辑单元用来存储用户数据的，此外可能有 4 个知名逻辑单元 （Well Known LU）：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c39bda1d66ac.jpg)

各个 LU 相对地址如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ab31a7a0cb7f.jpg)

- REPORT LUN

- 代表设备向主机汇报设备LU清单。主机想知道设备LU的支持情况，就需要发命令或者请求给该LU。UFS其中有个命令“Report LUNS” （和该LU名字一样）用来访问Report LUNS；

- UFS Device

- 当 UFS 主机对整个UFS设备发命令的时候，UFS Device LU 就成为该命令接收的对象，比如格式化UFS设备（FORMAT UNIT命令）、切换UFS设备的功耗模式（START STOP UNIT命令）等；

- Boot

- 用来存储启动代码的LU。不过 BOOT LU 本身是不存储启动代码的，它只是个虚拟的 LU，启动代码物理上是存储在普通LU上的。有两个 Boot LU，LU A 和 LU B，可以用来存储不同启动代码（比如一个新，一个旧），但在启动过程中，只有一个是活跃的（Active）的。32个普通LU中的任意一个可以配成Boot LU A或者Boot LU B；

> 在下面的例子中，LU 1 充当 Boot LU A，LU 4 充当 Boot LU B。由于有两份启动代码，分别保存在LU 1和LU 4。主机启动时，首先应该通过设备管理器，发送 Query 请求给设备，获取一个叫做“bBootLunEn ”的属性，该属性标识当前活跃（Active）的 Boot LU：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2917072094e6.jpg)

> 如果 bBootLunEn = 01，说明 Boot LU A 是当前活跃的 Boot LU，因此主机会从 LU 1 上读取启动代码完成系统的启动。Boot LU 不是必须的。如果系统的启动代码不是存储在 UFS 设备上，那么 Boot LU就不需要，因此bBootLunEn = 0：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2cbc83ab5e8c.jpg)

- RPMB

- UFS 设备会校验主机向 RPMB LU 写数据的合法性，只有特定的主机才能写入；同时，主机在读取数据时，也提供了校验机制，保证了主机读取到的数据是从该 LU 上读的数据，而不是攻击者伪造的数据；

> 四个 Well Known LU 能接收的命令如下图，绿色命令为他们能接收一些通用的命令，红色命令表示只有该 LU 能执行的命令：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_91b229bf1a97.jpg)

> 注意：一般 LU 的写是 cache 操作的，即主机数据到设备的内部 buffer，设备就会回命令完成状态给主机，但 Boot LU 和 RPMB LU 写操作不支持 cache，数据必须写到闪存中以后才算该命令完成。

#### 2.3 UFS Transport Layer**

UFS 传输层的事务由称为 UFS 协议信息单元 （UPIU） 的数据包组成，主机是启动器，设备是目标。有不同类型的 UPIU 用于处理 SCSI 命令、数据操作、任务管理操作、查询操作等。每笔交易包括：

- 一个命令 UPIU；
- 零个或多个数据输入或数据输出 UPIU；
- 回应 UPIU；
- 每个 UPIU 包含一个 12 字节的标头，后跟可选字段，具体取决于UPIU的类型；
在这一层中主机和设备的交互如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c616367a5b52.jpg)

### 三、UFS 架构

UFS 架构以 HCI（Host Controller Interface，主机控制器接口）为界划分为三部分。如下图，蓝色框上方调用 HCI 的为主机软件部分，蓝色框下方的为 HCI 封装的硬件处理细节部分，即 HC（Host Controller，主机控制器） ：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_57b52239818e.jpg)

#### **3**.1 HCI 接口架构

数据结构服务于软件，主机的软件通过内存中的一系列主机 register 和数据结构 Transfer Request Descriptors 来与 Host controller 硬件进行交互。UFSHCI 定义了两种接口：IO Memory/Registar Space 以及 Host Memory Space，下图展示了 UFS HCI 的框图：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2e8b5ee4b173.jpg)

IO Memory/Registar Space：在这个空间，主机 register 被定义为主机的软件接口，通过 MMIO<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)（Memory-Mapped I/O，内存映射 I/O）的方式被实现，主要包含了下面三种类型的寄存器：

- Host Controller Capability Registers：这些寄存器提供了关于 HC 功能的描述。包括 UFS 标准版本、主机控制器支持的命令队列的大小以及主机控制器标识数据；
- Runtime and Operation Registers：

- Interrupt status：这些寄存器为主机软件提供了使能/中止以及中断状态的接口；
- Host status：该寄存器显示 HC 的状态，并允许主机软件初始化/禁用 HC；
- UTP Transfer Request：这些寄存器给 UTP Transfer Request List 提供了接口；
- UTP Task Management Request：这些寄存器为 UTP Task Management request list 提供了一个接口；
- UIC Command：这些寄存器为 Unipro 配置以及控制提供了接口；

- Vendor Specific Registers：由供应商进行定义；
Host Memory Space：该空间中包含了能够描述将执行命令和命令中数据缓存的数据结构。简单地可以理解为——UTP Transfer Request List 负责通用的 IO 命令，UTP Task Mangement Request List 负责管理命令。

***UTP Transfer Request List（传输请求列表）由一系列数据结构 UTRD (UTP Transfer Request Descriptor，传输请求描述符) 组成。UFS host controller 命令队列中的命令槽（slot）被 MMIO 到 UTRD，32 个 UTRD 对应最多 32 个 slot，UTRD 描述了要执行的命令及相关数据。*
*UFS 主机软件通过将要执行的命令及相关数据放置在 UTRD，再敲响主机控制器门铃（Offset 58h: UTRLDBR – UTP Transfer Request List Door Bell** Register ）向主机控制器发出命令。传输请求列表中的命令被 UFSHCI 顺序执行，但可能会按照不同的顺序完成。所有命令都可以产生命令完成中断或者更新在列表中的 UTRD 命令状态字段。UFS 主机软件可以在运行时向列表中添加命令。主机控制器支持中断聚合，即在预定义的命令完成设定的数量后生成单个命令完成中断。**当传输请求完成（成功或出错）时，主机控制器将相应的位清*除为“0”。

主机控制器始终按照提交到列表中的顺序有序处理传输请求。在批处理模式下，如果多个命令使用单个门铃寄存器进行触发，主机控制器对这些传输请求的调度顺序将基于它们在列表中的索引。具有较低索引值的传输请求将在具有较高索引值的传输请求之前执行。

当主机软件将 UTRLRSR 从“1”写入为“0”时，该字段也会被清除。

相应数据结构体具体在代码中的表示如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_463996d20e9b.jpg)

- HCI 中配置了 Transfer Request List 首地址，在该 List 的每一条 Transfer Request 中记录该 slot 的 UPIU buffer 首地址，以及其它 buffer 偏移和长度信息；
- Command Descriptor Buffer List 为每一个 slot 提供两个方向的 UPIU buffer；
- LRB（Local Reference Block，本地参考块） 用于 HC 软件本地管理快速直接访问 slot 资源；
UFS Task Management 在代码中的表示如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0e73b6ac922a.jpg)

#### 3.2 传输请求接口（Transfer Request Interface）

UFS 的 host system 由一些硬件（host controller）和软件层组成（host software）：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_31b0c290cca2.jpg)

为了管理 host software 和 UFS 设备间的通信，host controller 为 host software 发送出传输请求提供了 3 个独立的接口：

- UTP Tranfer Request List：主机软件使用此列表来实现 UTP_CMD_SAP 和 UDM_SAP；

- UTP_CMD_SAP 包括对 UFS 采用的所有 INCITS T10 草案标准功能和本机 UFS 命令集的支持；
- UDM_SAP 包括对 QUERY REQUEST UPIU/QUERY RESPONSE UPIU 和 NOP IN/NOP OUT UPIU 设备管理功能的支持。

- UTP Task Management Request List：UTP 任务管理请求列表。主机软件使用此列表来实现 UTP_TM_SAP。该列表由数据结构 UTMRD（UFS Task Management Request Descriptor，UFS 任务管理请求描述符）组成。UTMRD 用于描述主机软件希望所连接设备执行的任务管理功能，所有任务管理请求优先于UTP传输请求列表中列出的传输请求。UFS 主机软件通过将 UTMRD 放置在列表上，再敲响主机控制器门铃*（Offset 78h: UTMRLDBR – UTP Task Management Request List **Door Bell **Register）*向主机控制器发出任务管理功能。UTP 任务管理请求列表中的功能被 UFSHCI 顺序执行，依然可能会按照不同的顺序完成。所有任务管理功能都可以产生请求完成中断或者更新在列表中的 UTMRD 状态字段。UFS 主机软件可以在运行时向列表中添加任务管理功能。该列表不支持中断聚合；
- UIC Command Register：该寄存器集是被 host software 用来实现 UTP_TM_SAP，直接执行 UIC 命令；

#### 3.3 UFS 主机控制器寄存器接口（host controller Interface）

主机 register 是通过 MMIO 存在于 IO Memory/Registar Space 中，寄存器访问以8字节对齐，最大大小为 64 位，其类型分为五种：

- 主机功能寄存器*（Host Controller Capabilities Registers & Vendor Specific Registers & Crypto Registers）*：版本、供应商 ID、64 位支持、slot 数等；
- 操作和运行时寄存器*（Operation and Runtime Registers）*：中断处理（包括聚合器）、每层的错误状态、主机控制器状态等；
- UTP 传输寄存器*（UTP Transfer Request Registers）*：UTPTRD 表和 UTPCMD 表的基址、门铃寄存器、完整的通知程序等；
- 任务管理寄存器*（UTP Task Management Registers）*：UTPTM表，门铃，完整通知程序等的基址；
- UIC 命令寄存器*（UIC Command Registers ）*：互连层命令寄存器和参数；
host software 对于 UFS HCI 的操作又分为三部分：Host controller配置和控制，数据传输操作，任务任务管理。

### 四、UFS UPIU 数据包

#### 4.1 UPIU 数据包头

UPIU 是命令、数据和状态信息传输的载体，是 UFS 协议栈的灵魂。UPIU 是有固定格式的数据包，我们分析数据包格式，有助于我们更深的理解 UPIU 以及整个 UFS 协议。在学习 UPIU 数据包之前我们先回顾下数据在 UniPro 各个层级之间是如何层层封装和解包的，意义并不是说 UniPro 中的数据包与 UPIU 数据包有什么对应关系，因为事实恰恰相反，回顾的意义是将我们之前学习的这些概念放在一边，以避免与我们将要学习的概念搞混：**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_bdde37bbab7d.jpg)

每个 UPIU 都有一个 12 字节的 Header，再加上跟每个 UPIU 相关的域。一个 UPIU（包括 Header）最小为 32字节，最大为 65600 字节：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_27b1a00a5a07.jpg)

通用的 Header 体如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0906a4238ca4.jpg)

- Transaction Type：指定 UPIU 类型：
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_111528daa1e6.jpg)

- Flags：指定命令命令 UPIU 和其回应的 UPIU 的属性；
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0006823a6a65.jpg)

> R：如果该比特置起来，说明该命令是读命令；
W：如果该比特置起来，说明该命令是写命令；
ATTR：命令属性域。UFS 命令有 simple ，ordered 和 Head of Queue 命令；
* Simple command：就是一般的命令，设备收到这样的命令无需特别处理，一般谁先到谁先执行；
* Ordered command：设备收到这样的命令，应该把该命令之前的命令都处理完，才能处理该命令（清场）；
* Head of Queue command：设备收到该命令后，放到命令队列的头部，立刻执行（插队）；
CP：表示命令的优先级。1 为高优先级，0 为低优先级，注意该比特只适合简单命令（simple command）；

- LUN：Logical Unit Numbe，用以寻址指定命令发送的 LU，“一、UFS 协议技术”中有解释；
- Task Tag：UFS 支持命令队列，因此需要为每个命令贴上标签 Tag 以区分跟这个命令或者请求相关的数据 UPIU 和状态 UPIU。对于下面这个读命令来说，COMMAND UPIU、所有的DATA IN UPIU和RESPONSE UPIU都具有同一个task tag：
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e62d5b25b478.jpg)

- Initiator ID：主机ID（手机系统中一般一个主机连接一个UFS设备所以该属性一般为0）；
- Command Set Type：命令类型。UFS 预期有三类命令：一是简化的 SCSI 命令，二是 UFS 自己原生的命令，三就是用户自定义命令。目前 UFS 的命令都是从 SCSI 借来的，自己一个命令也没有制定，如用户无自定义命令，该域就是 0 表示 SCSI 命令；
- Query Function, Task Manag. Function ：不同类型 UPIU 该属性定义也不一样（参见《JESD220E》10.7  UFS Protocol Information Units）

- Task Management Function（任务管理器）有如下功能：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_734ec42ba7d7.jpg)

- Query Function（查询）有如下功能：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_64fb507026ab.jpg)

- Response：设备告知主机命令或请求执行是否成功；
- Status：设备返回命令执行状态。对 SCSI 命令的状态信息，UFS 有如下状态：
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_a636a63ccbf8.jpg)

- Device Information：设备信息。该域往往跟该命令或者请求无关，属于设备夹带私货。因为UFS主机和设备是主从关系，如果 UFS 主机没有向设备发命令或者请求，UFS 设备是不能主动向主机报告设备状况的。如果UFS设备有特殊事件发生，它可以趁返回 RESPONSE UPIU 的时候把事件顺带告诉主机。所以该域只对 RESPONSE UPIU 有效。
总结通用的 Header 体各个域功能如下，如果需要对各种 UPIU 做更详细的域了解请参见《JESD220E》10.7  UFS Protocol Information Units：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_802df6803c1c.jpg)

#### 4.2 UPIU **分类

一个命令或者请求的执行包含下面几个阶段：

- 命令阶段：主机发起命令或请求给设备，这是“因”；
- 数据阶段：传输跟命令相关的数据，比如读写命令涉及到数据的传输。有些命令不涉及数据的传输，所以这个阶段并不是总是存在的，跟具体命令和请求相关；
- 状态阶段：设备执行完命令返回命令执行状态信息，这是“果”。在 UFS 中，设备必须返回命令状态给主机；
在命令执行过程中，无论是处在哪个阶段，UFS 主机和设备间都是通过 UPIU 进行信息的交互：

- UFS 主机通过命令/请求 UPIU 发命令/请求给设备；
- UFS 主机/设备通过 UPIU 传输数据；
- UFS 设备通过 UPIU 返回命令状态信息给主机；
**4.2.1 命令/请求UPIU**

应用层包括 UFS 命令、设备管理器和任务管理器三个模块，传输层根据不同模块发来的命令或者请求，分别产生不同类型的 UPIU：

- UFS 命令模块发送简化版本的 SCSI 命令，当传输层收到命令请求后，它会生成 **COMMAND UPIU **，把命令封装起来；
- 应用层通过任务管理器来管理任务队列，比如终止（Abort）和查询命令队列中的命令。当传输层收到来自任务管理器中的请求后，它会生成 **TASK MANAGEMENT REQUEST UPIU **，把请求封装起来；
- UFS 通过设备管理器来管理 UFS 设备，比如设置和查询 UFS 设备的配置（Configuration）。当传输层收到来自设备管理器发来的请求后，它会生成 **QUERY REQUEST UPIU **，把请求封装起来；
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3a717febd7f9.jpg)

**4.2.2 数据传输相关UPIU**

- 当主机发送了类似读命令给设备之后，设备需要返回数据给主机，设备通过 **DATA IN UPIU **向主机传输数据；
- 当主机发送了类似写命令给设备之后，主机需要往设备写数据，主机通过 **DATA OUT UPIU **向设备传输数据；
- UFS的主机在向设备写数据的时候，会考虑到设备这个时候能不能接收数据（因为设备可能这个时候没有足够的空间接收主机数据），它在向设备发了写命令之后，不会立刻把数据传输给设备，而是在那里等设备的通知。当设备准备好接收数据，以及接收多少数据，设备通过 **READY TO TRANSFER UPIU （RTT）**告知主机。当主机接收到该 RTT 后，才开始按照 RTT 的信息传输数据。至于每次传输数据的多少，RTT中包含这信息，主机根据RTT进行传输。所以，主机只有在收到设备的RTT，才能发DATA OUT UPIU；
**注意，读命令无需这种机制。因为设备从闪存中获得数据后，是设备控制数据的传输。对主机来说，它在发读命令之前，已经准备好足够的空间用以接收数据，所以不存在主机没有空间接收数据的情况。4.2.3 状态UPIU**

前面看到，主机有三种请求：SCSI 命令，任务管理器发出的 Task Management Request，以及设备管理器发出的 Query request。针对不同的命令或者请求，设备在执行完相应的任务后，分别返回对应的状态UPIU给主机。

**4.2.4 其它UPIU**

除了以上常规的 UPIU，还有其它一些 UPIU 作为他用：

- **NOP OUT UPIU**：设备上电后，主机检测是否与之连接，会发 **NOP OUT UPIU **给设备。我们平时想看看跟某个电脑或者网站能否连接上，会发一个 ping 命令。**NOP OUT UPIU **跟 ping 命令作用类似。当设备收到 **NOP OUT UPIU **后，会返回 **NOP IN UPIU**。主机收到该 UPIU 后，确认与设备连接，然后可以进行后续操作；
- **REJECT UPIU**，当设备收到一个无效的UPIU时，它会发REJECT UPIU拒绝无效的UPIU；

#### **4.3 UPIU 交互例子（以读写命令为例）**

**4.3.1 例子一：主机往设备读取96KB数据**

主机先发送读 96KB 数据的命令给设备，然后设备执行命令，分了三批把数据返回给主机，最后返回命令执行状态给主机：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_220b72362573.jpg)

**4.3.2 例子二：主机往设备写64KB数据**

主机发送写 64KB 数据的命令给设备，然后在那里等设备回应。当设备说你可以传来 24KB 数据时，主机写 24KB数据给设备；接着，设备又来通知说可以继续传 32KB 数据，主机照做。最后，设备通知说可以把最后 8KB 数据也传过来，主机于是写最后 8KB 数据。最后，主机收到设备命令执行完成的回应。主机必须等收到 RTT 后才能启动数据传输。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3ae544774040.jpg)

### 五、SCSI 命令

UFS 目前没有定义自己的命令，使用简化的SCSI命令。本节将介绍常用的 scsi 协议命令，如您遇到相关问题需要深入查询域名时建议再阅读《JESD220E》详细了解。

#### 5**.1 查询类**

**INQUIRY**

inquiry 命令用于查询 device 的一些关键信息，例如设备制造商，产品名称，FW 版本号等，通常 host 上电启动时会下发 inquiry 命令获取设备信息，针对不同厂商的器件可能会使用不同的配置项（参见《JESD220E》11  UFS Application (UAP) Layer – SCSI Commands）。

**REPORT LUNS**

report luns 命令用于向 host 上报当前 device 中使能的 normal lun 的 lun ID，以及 device 中支持的 Well Known LU 的 lun ID。

**READ CAPACITY(10)**

读取指定逻辑单元的容量和部分配置信息。协助存储管理软件确定是否在 CDB 中描述的逻辑块地址起始有足够空间，包含频繁访问的数据结构，避免引起额外的延迟。

**REQUEST SENSE**

request sense 命令用于查询指定的 lun 是否存在 sense data（提供有关先前执行的 SCSI 命令的详细错误信息），如果有的话会通过 data in UPIU 返回给主机。同时 request sense 命令可以清除 device 复位产生的 UAC（Unit Attention Condition，单元注意条件）标记，并且命令不会报失败（可能这才是 host 发 request sense 的主要目的）。

**TEST UNIT READY**

作用是查询设备是否 ready。空闲的时候，主机就会发送 test ready 命令下来，这个命令不用回复和应答数据，如果已经 Ready 只要回复 GOOD 即可。如果设备无法运行或处于需要主机操作以准备就绪的状态，设备应返回 BUSY。

**SEND DIAGNOSTIC**

host 下发 send diagnostic 命令让 device 执行指定的自检操作。但是 host 并不能判断 device 是否真的正确的执行了自检，换句话说 host 无法感知自检结果，所以对于 device 而言此功能可有可无。

#### 5.2 读写类

**READ(10)**

read 命令包含 read(6)/read(10)/read(16)，不同的 read 命令 LBA 的寻址范围存在区别。主机下发读命令读取指定 LBA 的数据，device FW 会通过 FTL 映射表获得指定 LBA 对应的物理地址，然后读取相应数据返回给主机。

**WRITE(10)**

write 命令包含 write(6)/write(10)/write(16)，不同的 write 命令 LBA 的寻址范围存在区别。主机下发写命令修改指定 LBA 的数据，device 将数据写入到 flash 之后需要修改 FTL 映射表（flash 无法在有数据的地址上覆盖写）。

**UNMAP**

主机下发 unmap 命令要求 device 清除某个 LUN 中指定 LBA 的数据，实际上只会修改映射表。根据 LU 中bProvisionType 的不同，unmap 命令被分为`erase`和`discard`两种操作。其中`erase`要求 host 读取经过unmap 的 LBA 时返回全 0，而`discard`则返回随机值。

**FORMAT UNIT**

格式化指定逻辑单元，如果指定了 device Well Known LU，则将格式化全盘。实现上与 UNMAP 命令相似。

**SYNCHRONIZE CACHE(10)**

将 device 中指定 LBA 的数据下刷到 flash 中，也可以将 buffer 中所有数据一起下刷，因为 host 无法预期哪些数据会缓存在 device buffer 中。

**VERIFY(10)**

下发 verify 命令校验指定 LBA 中的数据能否被正常读出。校验数据，请求设备 server 端检验指定媒介上的逻辑块。基于 VRPROTECT 字段和媒介格式，每个逻辑块都包含用户数据，并可能包含保护信息。

#### 5.3 管理类

**START STOP UNIT**

用于调整 device 的电源状态以及指定 LU 的启动与关闭。在调整 device 电源状态的场景中，start stop unit 命令与硬件平台息息相关，不同的 UFS 设备硬件资源不同，需要执行的操作也并不相同。可以通过 query 配置上电启动时的电源状态。如果设备 server 端正在处理该命令，后续有确认过的 CDB 请求逻辑单元执行启动/停止单元命令更换电源状态的话，设备 server 端应中断后续的启动/停止单元命令。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_441c42f4365e.png)

sufun*如果参考引用了您的创作却未署名，请一定联系我添加，给您添麻烦了！*

### 引用

[](https://zhuanlan.zhihu.com/p/26551438)

### 参考

- [^](#ref_1_0)这里说的command slot是引用自SCSI协议中，大概是UFS固件内部的一种命令执行队列，与 HCI 软件中的slot不是一个概念
- [^](#ref_2_0)每个 LU 都有很多个LBA，每个数据块都被分配了一个唯一的 LBAN（Logical Block Addressing Number），通过 LBAN 可以直接定位到存储设备上的特定数据块，而无需关心物理位置或其他细节。它提供了一种抽象层，使得对存储设备的数据访问更加方便和高效。
- [^](#ref_3_0)UFS 设备中的一块特殊区域，用于存储关键数据和执行安全功能。它具备防篡改和防重放攻击的特性，提供了硬件级别的安全性，用于保护存储设备上的敏感数据。普通LU的逻辑块大小至少是4KB，但RPMB LU逻辑块大小为256B
- [^](#ref_4_0)MMIO（Memory-Mapped I/O）是一种访问 I/O 设备的方法，它将 I/O 设备的寄存器映射到系统内存中的特定地址空间。在 UFS 中，MMIO 通常用于访问 UFS 控制器的寄存器，以控制 UFS 设备的操作和数据传输
