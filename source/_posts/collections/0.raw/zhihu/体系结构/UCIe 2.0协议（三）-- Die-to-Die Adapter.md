---
title: UCIe 2.0协议（三）-- Die-to-Die Adapter
date: "2025-06-29 00:00:00"
updated: "2025-06-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/UCIe-2.0协议(三)-Die-to-Die-Adapter/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1922660895198286036
---


UCIe是一个开放的，支持多协议的封装互联标准，用于在同一封装（package）上连接多个die。UCIe 2.0协议于2024年8月发布，本文介绍UCIe 2.0协议的Die-to-Die Adapter层。UCIe 2.0协议的总体介绍和协议层见以下链接：

[UCIe2.0学习(一)](https://zhuanlan.zhihu.com/p/721691469)

[UCIe2.0协议学习（二）-- 协议层](https://zhuanlan.zhihu.com/p/27134947337)

Die-To-Die（D2D）Adapter负责以下工作：

- 可靠的数据传输(完成CRC计算、retry，或者parity计算)
- 仲裁与Muxing(在多个协议层的情况下)
- 链路状态管理
- 与远程链路的协议与参数协商下图展示了D2D Adapter的基本功能。

![](https://pica.zhimg.com/v2-e9d200a02e56d0916dfc51f0f3caa2f0_r.jpg)Adapter使用一个或多个FDI接口连接到协议层，并且使用RDI接口连接到物理层。

D2D Adapter必须遵循与协议层相同的规则以满足协议互操作性。图3-2展示了协议层和Adapter的配置示例，其中协议identifier (例如PCIe)仅表示协议类型，而不表示flit格式。为了权衡性能和面积，UCIe允许在同一个物理链路上复用两个协议栈。

1. 栈复用（Stack Multiplexing）
如果Multi_Protocol_Enable参数被协商了，当每个协议栈所需带宽为物理层提供带宽的一半时，支持在同一物理链路上复用两个协议栈。两个栈必须是具有相同协议能力的相同协议。当支持Multi_Protocol_Enable并进行协商时，Adapter必须保证它不会在链路上发送来自相同协议栈的连续数据包。这适用于所有情况，包括当Flit来自FDI、retry buffer，以及当数据流暂停和重新启动时。

Adapter允许插入NOP Flit来保证这一点(这些Flit绕过TX Retry Buffer，并且不转发到接收端的协议层)。当从Retry Buffer发送Flit时，根据需要插入NOP Flit，以避免从同一协议栈发送连续的Flit。请注意，不同协议层之间没有固定的Flit交替模式。例如，一个来自协议栈0的Flit接一个NOP Flit，再接一个来自协议栈0的Flit是一个有效的传输模式。NOP Flit被定义为一个Flit，其中Flit Header中的协议identifier对应于D2D Adapter，并且Flit的主体填充了所有0数据(NOP Flit是为Adapter支持的所有Flit格式定义的，适用于以Raw格式操作的所有情况)。

只要Adapter保证不为任何协议层发送连续的flit，就允许NOP flit绕过TX Retry Buffer。在接收端，Adapter不能将这些NOP flit转发给协议层。接收协议层必须能够以最大Link速度接收相同Flit的连续块，但它不会接收连续的Flit。除了传输速率之外，两个协议栈必须使用相同的协议和Flit格式。Multi_Protocol_Enable和Raw Format互斥。每个栈被赋予一个单比特的栈标识符，该标识符与Flit header一起携带，用于在接收器上进行Flit的解复用。栈复用器为每个协议栈维护独立的链路状态机。与链路状态转换相关的边带消息具有唯一的消息代码，用于标识哪个栈的链路状态管理受该消息的影响。

启用Multi_Protocol_Enable参数的主要目的是允许实现利用UCIe链路为低带宽单个协议层提供更高带宽，而不需要对UCIe Link进行大量更改。例如，支持CXL 68B Flit模式最大带宽的两个协议层(即相当于32GT/s CXL SERDES带宽)可以在支持其总带宽的UCIe链路上复用。

如果协商“Enhanced Multi_Protocol_Enable”，则在同一物理链路上支持相同或不同协议的两个栈之间的动态复用。协议栈和Adapter都必须支持通用的Flit格式才能启用此特性。Adapter必须公布每个协议层的接收方可以接受的最大带宽百分比。Adapter发送器必须支持100%(无节流)，并将一个或两个协议层节流到最大带宽的50%。当Adapter为一个栈通告了最大带宽的50%时，远程链路伙伴必须保证它不会在链路上为同一栈发送连续的Flit。这适用于所有情况，包括当Flit来自FDI、retry buffer，以及当数据流暂停和重新启动时。Adapter允许插入NOP Flit来保证这一点(这些Flit绕过TX retry buffer，并且不转发到接收端的协议层)。当从retry buffer传输Flit时，根据需要插入NOP Flit，以避免超过协商的最大带宽。接收协议层必须能够以广告的最大带宽百分比下沉Flit;此外，协议层必须能够以最大的广告链路速度接收相同Flit的连续块。当支持此功能时，Adapter必须能够允许每个协议层独立地使用100%的链路带宽。此外，仲裁是按Flit进行的，如果允许两个协议层使用100%的链路带宽，Adapter必须支持协议层之间的轮询仲裁。

其他特定实现的仲裁方案是允许的，只要它们是每个Flit，并且不违反远程Adapter为给定栈发布的最大带宽百分比。Flit header有一个单比特的栈标识符，用于标识该Flit的目标栈。栈复用器为每个协议栈维护独立的链路状态机。与链路状态转换相关的边带消息具有唯一的消息代码，用于标识哪个栈的链路状态管理受该消息的影响。

![](https://pica.zhimg.com/v2-bb852da7e98b74717425c4cf822ea61c_r.jpg)
2. 链路初始化
在Flit能够在主带传输前，需要经过四个阶段的链路初始化。图3-3展示了UCIe链路初始化的流程。

- 阶段0是die-specific并且独立发生在每个die上；图中的方框大小代表当前阶段花费的时间，不同die花费的时间可能不同。
- 阶段1涉及到边带初始化；
- 阶段2涉及到主带训练与修复。
- 阶段3涉及到Adapter之间的参数交换工作，以协商Flit格式与协议类型。
![](https://picx.zhimg.com/v2-ca605cf3114004b09272476f8a361aed_r.jpg)
链路初始化stage3: Adapter初始化
当RDI状态转移到Active时表明阶段2完成。当阶段2完成时，Adapter需要遵循一系列顺序步骤以确定Local Capabilities、完成参数交换、把FDI状态机跳到Active。

<strong>Part 1：Determine Local Capabilities</strong>

Adapter需要决定物理层的训练结果，并且决定是否需要重传以适配当前的传输速度与配置。如果Adapter能够支持重传功能，则其需要在参数交换中告知对方链路终端。对于UCIe Retimer，Adapter需要决定Retimer Receiver Buffer的Credit。每个credit对应主带上的256B数据。

<strong>Part 2 : Parameter Exchange with remote Link Partner</strong>

capabilities需要在链路partner之间进行协商。这些特性会通过边带消息传输到远端链路partner。

为了成功完成参数交换，Adapter必须实现一个8ms (-0%/+50%)的超时机制。为了测量参数交换完成的超时时间，包括链路初始化stage3的part 1和part 2中的所有步骤。计时器只在RDI处于Active状态时增加。如果Adapter收到来自远程链接partner的{AdvCap.*.stall}，{FinCap.*.stall}，{MultiProtAdvCap.*.stall}或{MultiProtFinCap.*.stall}消息，定时器必须复位。

参数交换或链路状态机转换的8ms超时被视为UIE，Adapter必须将RDI置于LinkError状态。UCIe Retimer必须确保在与package内的UCIe die响应/启动参数交换之前，与远程Retimer伙伴(并与自己的能力合并)解决能力发布。当解决正在进行时，它们必须每隔4毫秒发送一次相应的stall消息，以确保其package中的UCIe die上没有超时。

<strong>Part 3 : FDI bring up</strong>

当参数交换成功完成后，Adapter需要把结果通过FDI反映到协议层，并继续执行FDI的bring up流程。当FDI处于Active状态时，链路初始化的Stage 3就结束了，Flit传输就可以开始了。当同一个Adapter上使能了多个stack，每个stack可以在不同的时间完成FDI bring up流程。

FDI上的数据宽度是UCIe栈运行频率的函数，也是UCIe物理链路上传输的总带宽的函数(这反过来又取决于lane数量和lane运行的速度)。RDI上的数据宽度固定为每个物理通道每个module至少一个字节，由Adapter控制。本章中的插图显示了一个RDI配置的示例，该配置映射到UCIe物理层上高级封装配置的64 Lane模块。

3. 操作格式
当涉及到CRC计算时，提供了Flit到CRC消息的字节映射(CRC消息是CRC计算逻辑的128B输入)。

<strong>Raw Format for all protocols</strong>
Raw格式只能用于不需要Adapter重试支持的场景。如果CXL或PCIe协议协商了Raw Format，则Adapter将数据从协议层传输到物理层，无需修改。图3-12显示了一个在FDI和RDI的64B数据路径的示例。这在参数协商期间被标识为<strong>Format 1</strong>。

![](https://pic3.zhimg.com/v2-2aafd50cf5a70b537aa0e0e85477a804_r.jpg)
68B Flit Format
此Flit格式在UCIe上标识为<strong>Format 2</strong>。当支持CXL 68B Flit Mode协议或PCIe Non-Flit Mode协议时，必须支持此格式。68B Flit格式支持对于流协议是可选的。

协议层发送64B的协议信息。Adapter添加两个字节的Flit Header前缀和两个字节的CRC后缀。表3-3给出了当需要从Adapter重试时，format 2的Flit Header格式。如果不需要retry，则Flit Header格式如表3-2。

即使不需要重试，Adapter仍然计算和驱动CRC字节，强烈建议接收端在这种情况下将CRC错误视为UIE（不可纠正的内部错误）。对于CRC计算，将Flit Byte 0(即Flit Header Byte 0)分配给CRC消息Byte 0，将Flit Byte 1(即Flit Header Byte 1)分配给CRC消息Byte 1，以此类推，直到将Flit Byte 65分配给CRC消息Byte 65。

在这个68B Flit上执行重试。

![](https://pica.zhimg.com/v2-0773888b5a9dc6ec89057ea068ee6764_r.jpg)
![](https://pic2.zhimg.com/v2-6828189e0ccc1d3e881cc1cd02f66f3d_r.jpg)由于Adapter添加了4个字节，Flit的对齐并不完全匹配物理链路的lane数(总是16的倍数)。Adapter添加的字节要求Adapter为连续的Flit移动四个字节。数据总是以256B的倍数传输(注意，Retimer信用具有256B的数据粒度)。当Adapter没有Flit要发送时，它使用数据流暂停(PDS)令牌终止数据流，然后将0b填充到下一个64B计数多个边界和至少两个后续64B块的所有0值数据。如果传输不是在256B计数倍数边界，则需要对所有0值数据进行额外的64B传输，以使传输的字节达到256B计数倍数。上述所有0数据的后续传输给接收方至少两次64B传输来复位接收字节移位器。PDS令牌及其后面的0字节不能发到协议层。PDS令牌是一个可变大小的Flit，它携带一个2B特殊的Flit Header，并在RDI的剩余字节上填充0字节。PDS的发送端在Flit Header上驱动以下内容：

- Byte 0的bit[4]为1&#39;b1。
- Byte 1的bit[7]为1&#39;b1。
- Byte 1的bit[6]为1&#39;b1。
- Byte 1的bit[5:4]为2&#39;b00，序列号[7:0]与PDS Flit Header在此位置的期望值相匹配。如果使能了重试，如果上述四个条件中的任何两个满足，则接收端必须将该Flit Header解释为PDS。如果重试没有使能，如果条件(1)和(2)为真，接收端必须将该Flit Header解释为PDS。这保证了如果Flit Header中的错误少于3位，PDS将被检测到。对于3位错误，会导致重试，但这将通过重试规则无缝地处理。

当Retry被触发或RDI状态经过Retrain时，会发生隐式PDS。发送端必须插入0，就像它会为一个实际的PDS，并开始重新开始Flit从新的对齐。对于重试和Retrain场景，接收方还必须在收到的数据中的字节0和字节1中查找期望的序列号。

68B Flit格式如图3-11。

![](https://pica.zhimg.com/v2-e495c93e8dc3224279464ebd1d323c80_r.jpg)
Standard 256B Flit Format
这些是PCIe规范中定义的PCIe Flit模式和CXL规范中定义的CXL 256B Flit模式的标准Flit格式。它们分别为“Standard 256B End Header Flit Format”(或Format 3)和“Standard 256B Start Header Flit Format”(或Format 4)。当协商PCIe Flit模式或CXL 256B Flit模式协议时，必须支持此功能。对于流协议，标准256B Flit格式(Start Header或End Header)的支持是可选。

协议层以256B的Flit发送数据，但它将Adapter保留的字节上驱动为0 (图3-16、图3-17、图3-18和图3-19中以浅橙色显示)。PCIe规范定义的DLP 6B以Format 3和Format 4的形式存在于PCIe和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)协议中。但是，在PCIe和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)协议中，由于DLLP需要绕过TX Retry buffer，DLP字节最终是唯一的，因为它们部分由协议层填充，部分由Adapter填充。DLP0和DLP1被UCIe的Flit Header取代，并由UCIe Adapter驱动。然而，如果Flit携带一个Flit Marker，协议层必须填充Flit Header byte 0的bit 4为1b，以及Flit_Marker位中的相关信息(这些是PCIe规范定义的)。协议层还必须为它生成的Flit填充Flit Header中的协议Identifier位。

对于Streaming协议，Flit格式如图3-18。协议层只填充Flit Header字节0的bit[7:6]，并且它不能将bit[7:6]设置为2&#39;b00。

对于PCIe Flit模式协议，Standard 256B Start Header Flit格式是可选的。

FDI为从协议层到Adapter的DLLP传输提供了一个单独的接口，反之亦然。如果Flit Marker不存在，Adapter负责将DLLP插入DLP的byte 2:5。信用更新信息作为regular Update_FC  DLLP通过FDI从协议层传输到Adapter。Adapter还负责在可能的情况下将这些更新格式化为Optimized_Update_FC格式，并在相关的DLP字节上驱动它们。Adapter还负责遵守PCIe规范中为Flit模式定义的所有DLLP规则。在接收路径上，Adapter负责从Flit中提取DLLP或Optimized_Update_FC，并在FDI提供的专用DLLP接口上驱动它。

计算两组CRC (CRC0和CRC1)。使用与以前格式相同的2B/128B CRC计算。

对于PCIe, CXL和Streaming：

- 对于Format 3, CRC0是使用分配给CRC消息输入的相应字节的Flit Bytes 0到127来计算的。CRC1使用Flit字节128到241作为消息输入，其中Flit字节128分配给CRC消息字节0，Flit字节129分配给CRC消息字节1，以此类推，直到Flit字节241分配给CRC消息字节113(包括由Adapter插入的Flit Header。对于PCIe和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)，这包括Adapter插入的DLP字节)。
- 对于Format 4, CRC0是使用分配给CRC消息输入的相应字节(包括Adapter插入的Flit Header)的Flit Bytes 0到127来计算的。CRC1使用Flit字节128到241作为消息输入，Flit字节128分配给CRC消息字节0，Flit字节129分配给CRC消息字节1，以此类推，直到Flit字节241分配给CRC消息字节113(对于PCIe和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)，这包括Adapter插入的DLP字)。如果不需要重试，Adapter仍然计算和驱动CRC字节，强烈建议接收端在这种情况下将CRC错误视为不可纠正的内部错误(UIE)。

Latency-Optimized 256B Flit Format
定义了两种延迟优化的256B格式：Format 5和Format 6。强烈建议UCIe实现支持CXL 256B Flit Mode协议的Format 6，以获得最佳延迟性能。

从Adapter的角度，这两种格式看起来是一样的，唯一的区别是协议层是否填充协议信息的可选字节。当协议层不填充可选字节时，是Format 5，而当协议层填充可选字节时，是Format 6。

延迟优化的256B Flit格式(带或不带可选字节)支持是Streaming协议的可选选项。协议层只填充Flit Header的bit[7:6]，并且它不能为bit[7:6]设置2&#39;b00。

对于PCIe Flit模式协议，延迟优化Flit带可选字节Flit格式是可选的。

计算了两组CRC。CRC0使用CRC消息输入的相应字节的Flit Bytes 0到125来计算(包括Flit Header位，如果适用的话，Adapter插入DLP位)。CRC1使用Flit字节128到253作为消息输入，其中Flit字节128分配给CRC消息字节0，Flit字节129分配给CRC消息字节1，以此类推，直到Flit字节253分配给CRC消息字节125。如果不需要重试，Adapter仍然计算和驱动CRC字节，强烈建议接收端在这种情况下将CRC错误视为UIE。

4. Flit格式和协议的Decision table
决定协议的真值表如表3-8。一旦协议和Flit格式在初始链路启动期间进行了协商，在UCIe物理层转换到复位状态之前，它们不能被更改。如果没有协商有效的协议和Flit格式，则Adapter将断开链接并报告错误。

![](https://pic2.zhimg.com/v2-75dae3b175b452bc8e15ccba1991a6d1_r.jpg)表3-9 (真值表1)显示了在协商PCIe或CXL协议时决定Flit格式的真值表，没有协商以下内容：

- Enhanced Multi_Protocol_Enable
- PCIe协议能力的Standard 256B Start Header
- 用于PCIe协议能力的延迟优化的Flit带有可选字节表3-10 (真值表2) 提供了真值表，用于确定Streaming协议的Flit格式，如果Streaming Flit格式能力是协商的。注意，对于Streaming协议协商，没有{FinCap.*}消息交换。UCIe Link的每一方都在{AdvCap.Adapter}消息中宣告自己的能力。表3-10中的bit表示发送和接收的{AdvCap.Adapter}消息中相应位的逻辑与。如果链路双方都支持并启用了以下任何功能，则必须遵循真值表2来确定Flit格式：

- Enhanced Multi-Protocol Capability
- PCIe协议能力的Standard Start Header Flit
- 延迟优化的Flit与PCIe协议能力的可选字节。当{FinCap.Adapter}消息发送时，真值表中的bit代表{FinCap.Adapter}中设置的bit。

如果没有协商所需的Flit格式，则允许Adapter或协议层将链路带到LinkError。

![](https://picx.zhimg.com/v2-e01b53c52b52e4217118bb10a7669d49_r.jpg)
![](https://pic2.zhimg.com/v2-60f7cd67b4c6d97e62da18f064eaca77_r.jpg)
5. State Machine Hierarchy
UCIe采用层次化方法进行链路状态管理，以便在不同层之间进行功能划分，并支持在FDI和RDI进行公共状态转换或排序。

不同配置的状态机结构如图3-27。对于CXL，ARB/MUX vLSM暴露在FDI的pl_state_sts上。Adapter LSM用于与远程链路伙伴协调链路状态，所有配置都需要Adapter LSM。每个协议栈都有其相应的Adapter LSM。对于PCIe或Streaming协议，Adapter LSM暴露在FDI pl_state_sts上。

RDI状态机(SM)用于抽象上层的物理层状态。Adapter数据路径和RDI数据宽度可以扩展为多模块配置；但是，此配置只有一个RDI状态机。多模块PHY逻辑在RDI状态和各个模块之间创建抽象和协调。以下规则适用：

- vLSM状态转换使用主带数据路径上的ALMP与远程链路伙伴进行协调。状态转换规则遵循CXL规范中的CXL 256B Flit Mode规则。
- Adapter LSM状态转换与远程Link伙伴使用{LinkMgmt. Adapter*}边带消息进行协调。这些消息由D2D Adapter发起和接收。
- RDI SM状态转换使用{LinkMgmt.RDI*}边带消息与远程Link伙伴进行协调。这些消息由物理层发起和接收。
![](https://pic2.zhimg.com/v2-fb0c478a4d64d358ff3d99cdec2633cd_r.jpg)状态转换层次结构的一般规则如下。

- Active状态转换：RDI SM必须处于Active状态，然后Adapter LSM才能开始协商以转换为Active状态。Adapter LSM必须处于Active状态，然后vLSM才能开始协商以过渡到Active状态。
- Retrain状态转换：RDI SM必须在Retrain传播到Adapter LSM之前处于Retrain状态。如果RDI SM处于Retrain状态，则必须将Retrain传播到所有处于Active状态的Adapter  LSM。在所有相关Adapter LSM转换到Retrain之前，Adapter不得在RDI上请求Retrain退出。
- PM状态转换(L1和L2)：[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)和CXL.cachemem vLSM(如果是CXL)必须在相应的Adapter LSM转换到PM之前转换到PM。在RDI SM转换为PM之前，所有Adapter LSM(如果在同一个Adapter上启用了多个栈)必须在PM中。
- LinkError状态转换：RDI SM必须在Adapter LSM转换到LinkError之前处于LinkError状态。RDI SMs使用边带与远程链接伙伴协调LinkError转换，并且每个RDI SM将LinkError传播给所有启用的Adapter LSM。Adapter LSM在将LinkError传播到CXL的两个vSLM之前必须在LinkError中。LinkError转换优先于LinkReset或Disabled转换。在所有相关的Adapter LSM和CXL vLSM转换到LinkError之前，Adapter不得在RDI上请求LinkError退出。
- LinkReset或Disabled状态转换：Adapter LSM使用边带消息与远程链路伙伴协商LinkReset或Disabled状态转换。只有当与之关联的所有Adapter LSM都转换为LinkReset或Disabled时，LinkReset或Disabled才会传播到RDI SM。Disabled转换优先于LinkReset转换。如果RDI SM移动到LinkReset或Disabled，则必须将其传播到所有Adapter LSM。如果Adapter LSM移动到LinkReset或Disabled，它必须将其传播到CXL协议的两个vLSM。对于UCIe Retimer，Retimer die负责与远程Retimer伙伴协商状态转换，并确保不同的UCIe die是同步的，并且不会超时等待响应。例如，如图1-14，如果UCIe Die 0向UCIe Retimer 0发送了Adapter LSM的Active Request消息，则UCIe Retimer 0必须与UCIe Retimer 1解析Active Request消息已被转发到UCIe Die 1，并且UCIe Die 1已经响应了Active Status消息，然后才向UCIe Die 0响应Active Status消息。除非UCIe Die 0和UCIe Die 1上的所有相关状态都达到低功耗状态，否则不能将Off Package Interconnect置于低功耗状态。在与远程计时器合作伙伴完成解析时，UCIe计时器必须每4毫秒响应一次“Stall”编码。

6. Power Management Link States
对于PCIe和CXL协议，电源管理状态是必需的。FDI支持L1和L2电源状态，遵循CXL 256B Flit Mode的握手规则和状态转换。RDI支持物理层接口上的L1和L2进行电源管理优化，但允许物理层内部将L1和L2映射到公共状态。它们一起允许全局时钟门控，并使能系统级flow，如Package-Level Idle (C-state)。允许其他协议通过始终为来自远程Link伙伴的PM请求发送PMNAK来禁用PM flow。

Power management状态进入顺序如下：

- <strong>协议层PM进入请求</strong>：FDI在基于链路空闲时间的接口上为PM进入请求定义了一个通用flow。当需要支持PM时，所有使用UCIe的协议都必须遵循该流程。对于CXL协议，D2D Adapter实现了ARB/MUX功能，并遵循CXL规范中定义的握手(对应于CXL 256B Flit Mode，因为所有ALMP也通过UCIe中的重试缓冲区)。甚至CXL 68B Flit Mode over UCIe使用CXL 256B Flit Mode ALMP格式和流(但Flit被截断为64B，两个字节的Flit Header和两个字节的CRC由Adapter添加以使68B Flit)。对于UCIe Flit Mode下的PCIe协议，不使用PM DLLP握手。协议层根据链路空闲时间在FDI上请求PM入口。
- <strong>Adapter链路状态机PM进入</strong>：PM转换通过边带与远程链路伙伴进行协调。Adapter在两个协议栈之间进行多路复用的场景中，每个栈的链路状态机必须独立地转换到PM。
- <strong>RDI上的PM entry</strong>：一旦Adapter的所有LSM都处于PM状态，Adapter就会启动RDI上的PM entry。
- 物理层移动到更深的PM状态，并采取必要的操作进行电源管理。注意，边带链接必须保持Active状态，因为边带链接用于启动PM退出。
![](https://pic4.zhimg.com/v2-05b21e8d5641bfb4ae0034df974c5e65_r.jpg)PM退出遵循唤醒的相反顺序，如下所述：

- 协议层的Active请求通过FDI和RDI传输到本地物理层。
- 物理层使用边带来协调物理链路的唤醒和再训练。
- 一旦物理链路被重新训练，双方的RDI都处于Active状态，并且从两侧触发Adapter LSM PM退出(通过Adapter之间的边带消息进行协调，如FDI PM流中所述)。对于PCIe或流协议场景，这也会在FDI上将协议层转换为Active状态。
- 对于CXL协议，这个步骤之后是ALMP交换，使所需的协议进入Active状态，然后可以开始协议Flit传输。
7. CRC计算
CRC生成多项式为(x+1)*(x15 + x+1) = x16 + x15 + x2 +1。这为随机比特错误提供了3-bit检测保证：2位检测保证是由于本原多项式(x15 + x+1)，1位额外的比特错误检测保证是由于多项式中的(x+1)项使其成为奇校验。

CRC总是在128字节的消息上进行计算。对于较小的消息，消息在MSB中为零扩展。作为128B CRC消息的一部分，但没有在链路上传输的任何字节都分配给0b。每当包含由Adapter填充的flit的非CRC字节以进行CRC计算时(例如，flit Header或DLP字节)，在Adapter为这些字节分配值之后，CRC将被计算。Flit的任何保留位都被分配为0b，用于CRC计算。

CRC LFSR计算的CRC比特数初始值为0000h。CRC从消息的第0字节的第0位开始计算，从每个字节的第0位开始计算到第7位，如图3-29所示。图中，C[15]为CRC字节1的第7位，C[14]为CRC字节1的第6位，以此类推；C[7]是CRC字节0的第7位，C[6]是CRC字节0的第6位，以此类推。

![](https://pic3.zhimg.com/v2-5aa1bb0efbf4a73459b0e8d25c28b958_r.jpg)
8. Retry规则
对于raw BER高于1e-27的配置，Adapter必须支持重试，除非操作的唯一格式是raw格式。如果Adapter不支持重试，在链路训练期间，除非操作格式是raw格式，否则物理层不能发布raw BER高于1e-27的链路速度。不同配置的原始BER特性如表5-23所示。一旦在链路初始化的stage 3的第2部分协商了重试，即使在运行时链路速度降低，重试也不能被禁用。重试只能在下一次链路初始化时重新协商(即RDI移动到复位状态)。对于具有公共Adapter的多个栈，Tx retry buffer在栈之间共享。

UCIe上的重试机制是PCIe规范中定义的Flit模式下的重试机制的简化版。不适用的规则和相应的参数更改如下：

- 选择性Nak和相关的规则不适用，不能实现。与RX retry buffer相关的规则也不适用，不能实现。
- 在整个链路操作期间，当不与PCIe replay规则冲突时，显式序列号flit和Ack/Nak flit交替进行。这允许更快的Ack周转，从而更小的retry buffer大小。如果没有Ack/Nak flit要发送，则允许发送显式序列号flit。为了满足这个要求，PCIe replay规则中描述的所有显式序列号flit传输都要求满足&#34; CONSECUTIVE_TX_EXPLICIT_SEQ_NUM_FLIT < 3 &#34;条件，改成要满足&#34; CONSECUTIVE_TX_EXPLICIT_SEQ_NUM_FLIT < 1 &#34;条件，并且不需要发送3个连续的显式序列号flit。
- 将所有与重试相关的10位计数器替换为8位计数器，最大允许的序号为255(因此所有计算和初始值中的1023被替换为255)。
- REPLAY_TIMEOUT_FLIT_COUNT是一个9位计数器，在1FFh时饱和。除了PCIe规范中增加REPLAY_TIMEOUT_FLIT_COUNT外，当处于Active状态，并且从上一个flit发送到现在已经经过了一个flit时间(以当前链路速度和宽度传输256B数据所需的Adapter时钟周期数(lclk))且没有传输Payload flit和NOP flit时，也必须增加该count。每个flit没有发送时，计数器都必须加1(这可能导致在各个flit之间或达到限制之前，计数器需要加几次)。增加的要求补偿了NOP flit的非连续传输。

PCIe规范的Replay Schedule Rule 0必须检查REPLAY_TIMEOUT_FLIT_COUNT ≥ 375。

- NAK_WITHDRAWAL_ALLOWED总是设置为0b。注意，这要求实现在“Nak Schedule 0”规则中设置标志NAK_SCHEDULED=1b。
- IDLE Flit握手阶段不适用。因为过渡到Link Active(相当于PCIe的LTSSM处于L0)是通过边带握手来管理的，不需要交换IDLE flit。根据PCIe规则，任何在flit Header字节中为全0的flit都会被Adapter丢弃。
- 序列号握手阶段超时和退出链路重新训练在没有退出序列号握手阶段的情况下发送128个Flit。如果没有要发送的Payload flit，Adapter必须生成NOP flit来完成序列号握手阶段。
- “Prior Flit was Payload”总是设置为1b。该bit在Flit header中不存在，因此从重试的角度来看，实现必须假定该bit总是设置为1。
9. Runtime Link Testing using Parity
UCIe定义了一种机制，当启用该机制时，通过周期性地在数据流中间注入校验字节来检测运行时链路的健康状况。接收端检查并记录插入的校验字节的校验错误。

当启用该机制时，Adapter每256*256*N字节的数据插入64*N字节，其中N从Error and Link Testing Control寄存器(字段名：插入的64字节数量)获得。软件根据操作的当前链路宽度设置这个，包括与Adapter接口的Active模块的总数。插入的字节中只有bit 0有奇偶校验信息，其计算公式如下：

ParityByte X，第0位= ^((DataByte [X]) ^(DataByte [X + 64*N]) ^(DataByte [X + 128*N])^....^(DataByte [X + (256*256*N - 64*N)]))

插入字节的剩余7位保留。

Adapter中的发送端和接收端必须保持记录经过的数据字节的数目计算或检查奇偶信息。如果RDI状态从Active状态移开，数据计数和奇偶校验将复位，并且双方必须重新协商奇偶校验插入的使能，然后再从Retrain进入Active状态(如果在错误和链路测试控制寄存器中仍然使能该机制)。

这种机制是软件向UCIe链路两个Adapter中的寄存器的使能位写入1b来实现的。软件必须在写入到两个Adapter的使能位之后触发UCIe链接重训练。对原始格式特性的支持超出了本规范的范围，取决于实现。在重训练Adapter LSM时，Adapter交换边带消息，以确保远程链路伙伴的接收端准备好在状态转换为活动时接收数据流中的额外校验字节。直到校验特性交换完成之前，Adapter不得请求重训练退出到本地RDI。允许在初始链路建立期间使能它，通过使用边带访问远程链接伙伴的寄存器或其他特定手段；然而，软件必须触发链接重训练才能使功能生效。

Adapter发送一个{ParityFeature.Req}边带消息给远程链路伙伴，如果它的发送端启用了发送校验字节。如果接收方已使能并准备接受校验字节，则远程Adapter以{ParityFeature.Ack}边带消息进行响应。协商成功的示例如图3-28。如果Die 0 Adapter发送端启用插入奇偶校验字节，它必须从die 0到die 1发送一个{ParityFeature.Req}。

Adapter以{ParityFeature.Nak}响应，如果它还没有准备好接受校验字节，或者该特性尚未使能。请求Adapter必须在状态寄存器中记录Nak，以便软件可以确定发生了Nak。协商失败示例如图3-29。

注意：如果启用了校验功能，则允许Adapter转换到更高延迟的数据路径。显式提供了Ack/Nak握手，以确保通信双方有足够的时间过渡到该机制的·alternate数据通路。

校验字节不消耗Retimer接收器缓冲区信用。Retimer接收器不能将校验字节写入它的接收器缓冲区或通过Off Package互连将这些字节发给远程Retimer伙伴。这一机制仅有助于描述本地UCIe链接。

如果校验错误被chiplet检测到，则该错误被视为可纠正错误并通过可纠正错误报告机制报告。通过在可纠正错误时使能中断，SW可以在SW中实现一个误码率计数器。