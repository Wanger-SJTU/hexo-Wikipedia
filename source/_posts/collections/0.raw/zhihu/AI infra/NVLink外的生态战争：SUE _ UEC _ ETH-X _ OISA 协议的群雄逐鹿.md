---
title: "NVLink外的生态战争：SUE / UEC / ETH-X / OISA 协议的群雄逐鹿"
date: "2026-06-11 00:00:00"
updated: "2026-06-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AI-infra/NVLink外的生态战争-SUE-_-UEC-_-ETH-X-_-OISA-协议的群雄逐鹿/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2048413019521169190"
---


NVLink外的生态战争：SUE / UEC / ETH-X / OISA 协议的群雄逐鹿

写在前面：这篇文章在干什么
这不是一篇综述论文，不会把每个协议的spec逐条翻译给你看。

这是一篇帮助工程师<strong>建立认知框架</strong>的文章：

- 为什么这四个协议同时出现？
- 每个协议的设计决策背后的<strong>驱动力</strong>是什么？
- 如果你是芯片/系统架构师，<strong>你的场景该选哪个？</strong>
- 未来这场战争谁会赢，为什么？读完这篇文章，你应该能在白板上画出四个协议的本质区别，而不是背spec里的字段表。

第一章：战场在哪里——先画地图

NVLink究竟在守护什么
在理解挑战者之前，先搞清楚被挑战者守护的是什么阵地。

NVIDIA的NVLink干的事情，用一句话说：

<strong>把多颗GPU的HBM，骗成一颗超级GPU的统一内存。</strong>这是Scale-Up网络的本质——<strong>不是传文件，不是发消息，是做远程内存访问（Remote Memory Access）</strong>。一个GPU的SM核心发出`LD 0xABCD1234`，这个Load指令穿越互联网络，取回另一颗GPU的HBM里的数据，延迟低到SM核心感觉”好像在访问本地HBM”。

这和Scale-Out网络（Ethernet + InfiniBand）干的事情有<strong>本质区别</strong>：

Scale-Up（内存语义）:   GPU_A.SM → LOAD addr → GPU_B.HBM
                       延迟目标: < 1µs RTT
                       
Scale-Out（消息语义）:  进程A.send(buf) → 网络 → 进程B.recv(buf)  
                       延迟目标: 2-10µs
UEC规范的Table 1-1把这个区别写得很清楚：Scale-Up的协议需求是<strong>“probably no IP for performance reason, L1/L2 headers only”</strong>。没有IP层，没有TCP/UDP，越简单越好。

<strong>NVLink守护的阵地：一个封闭的、完整的、性能极致的Scale-Up生态。</strong> 它用私有SerDes（56G/112G NRZ/PAM4）、私有协议帧格式、私有交换芯片（NVSwitch），把每颗H100的900GB/s HBM带宽以低延迟延伸到集群每一个角落。

<strong>挑战者要做的事：在不封闭生态的前提下，用以太网技术，把同样的Scale-Up能力带给不绑定NVIDIA的GPU厂商。</strong>

这就是SUE、ETH-X、OISA的使命。

四个选手的战场定位（必须先搞清楚）
很多工程师在这里就迷路了，因为这四个协议<strong>不是在同一个赛道上比赛</strong>：

┌────────────────────────────────────────────────────────────────┐
│                      AI集群网络分层                              │
├───────────────────────┬────────────────────────────────────────┤
│    Scale-Up 域         │         Scale-Out 域                   │
│    (超节点内部)         │         (集群间/机架间)                │
│                        │                                        │
│  目标: 统一内存池       │  目标: 高效消息传递                   │
│  延迟: < 1µs           │  延迟: 2-10µs                         │
│  带宽: TB/s级           │  带宽: 百Gbps/节点                   │
│  规模: 8-1024 GPU       │  规模: 万到25万+ 节点                 │
│  协议: L1/L2, no IP     │  协议: ETH/IP/UDP + 传输层            │
│                        │                                        │
│  ✓ SUE（OCP/Broadcom） │  ✓ UEC（Linux Foundation）           │
│  ✓ ETH-X（ODCC）       │                                        │
│  ✓ OISA（中国移动+）   │                                        │
│  △ UEC（技术可借鉴）   │  △ SUE/ETH-X/OISA（不是主赛道）      │
└───────────────────────┴────────────────────────────────────────┘
<strong>UEC的自我定位</strong>，原文如此：

“UE primarily focuses on backend and scale-out networks, but concepts and portions of UE technology may apply to scale-up networks.”UEC不是Scale-Up的直接参赛者，但它提供的LLR、CBFC等链路层技术被Scale-Up协议大量借鉴。

第二章：Scale-Up的第一性原理

为什么标准以太网帧不能直接用
工程师的直觉：以太网这么成熟，直接用RoCEv2不就行了？

RoCEv2在Scale-Out上跑了多年，为什么Scale-Up不行？

<strong>答案在一个数字：效率。</strong>

ETH-X白皮书给了一个精确的计算：

以内存Load指令为例，Command 16B + Data 128B：

纯载荷效率:     128/(16+16+128) = 80%

加IP头(34B)后:  128/(16+16+128+34+34) = 56%

考虑最小帧64B: 128/(64+16+128+34) = 52%
<strong>你有一半的线路带宽在传头部。</strong>

而且这还只是一个请求。Scale-Up的Load/Store是细粒度的，可能每个操作才几十到256字节的数据，但请求和响应各来一次，两端各一个IP+UDP头，效率就这么没了。

换PRI帧（6B头）：

128/(16+16+128+6+6) = 74%

聚合4个请求后: 128×4/(16×4+(16+128)×4+12+12) = 77%
这就是为什么Scale-Up协议都要去掉IP头，压缩到L2甚至更精简的帧格式。不是为了炫技，是因为每个百分点的效率，乘以TB/s的带宽，就是实实在在的GPU算力浪费。

Scale-Up的延迟预算
SUE规范给出了端到端延迟分解：

SUE系统延迟组成（单向）:

Bridge NOC→Ethernet:  < 100ns
Ethernet Link & PHY:  < 100ns  
Cable (5m单模光纤):    24.8ns
Switch转发:           < 250ns
Bridge Ethernet→NOC:  < 100ns

--------------------------------
5m单模光纤总计:  100+100+24.8+24.8+250 ≈ 499.6ns  (<500ns)
30m单模光纤总计: 100+100+148.8+148.8+250 = 747.6ns  (<750ns)
<strong>每个组件都有严格预算。</strong> 交换机只分到250ns，这意味着：

- 交换机必须支持cut-through转发，不能store-and-forward
- 交换机不能有复杂的深度包检测
- 帧格式必须让交换机能在极少的几个时钟周期内做完转发决策这就是为什么Scale-Up协议都偏向L2或压缩帧格式——帧头越短，交换机越快做完解析。

第三章：四个选手逐个解剖

SUE（Scale Up Ethernet）——OCP体系的务实派
<strong>档案：</strong>

- 出身：OCP（Open Compute Project），Broadcom主导撰写
- 版本：v1.0，2025年8月1日定稿，9月5日OCP批准
- 核心定位：以太网帧内部的XPU内存总线延伸
设计哲学：我不发明新轮子，我骑在以太网轮子上
SUE最重要的一句话，在spec的第13页：

“SUE is not a general purpose network interface with a full suite of services available in modern NICs.”这句话是SUE的设计边界声明。<strong>SUE只做一件事：可靠地在XPU之间搬Load/Store/Atomic命令和数据。</strong> 其他的不管。

SUE的协议栈是这样的：

XPU NOC
   ↓  (Signal FIFO 或 AXI4)
Mapping & Packing Layer  ← 把命令按{目的XPU, VC}攒包，最大4096B
   ↓
SUE Transport Layer      ← Reliability Header + GoBackN重传
   ↓
Network Layer            ← 选择封装格式：标准ETH/AFH Gen1/AFH Gen2
   ↓
MAC/Link/PHY             ← LLR + PFC/CBFC + FEC

SUE的封装三选一
这是SUE最有意思的设计：<strong>给实现者三个选项，从最保守到最激进</strong>，兼顾不同的生态兼容性需求：

<strong>选项A：标准Ethernet + IP + UDP</strong>

[ETH 14B][IP 20B][UDP 8B][RH 8B][SUE PDU ≤4KB][R-CRC 4B][FCS 4B]

优点: 任何标准以太网交换机都能转发，零改造
缺点: 54B头部开销，效率最低，约52-56%
使用场景: 试点部署、混合网络环境
<strong>选项B：AFH Gen1（AI Forwarding Header Gen1）</strong>

[ETH DA 6B][ETH SA 6B][EtherType(AFH)2B][RH 8B][SUE PDU][R-CRC 4B][FCS 4B]

关键：MAC DA/SA只用16-32bit做转发查找，其余bit自定义
交换机：看EtherType识别，支持定制转发逻辑
优点: 保持以太网帧外形，交换机改动小
<strong>选项C：AFH Gen2（最激进的压缩格式）</strong>

[AFH Gen2 Header 6B或12B][RH 8B][SUE PDU][R-CRC 4B][FCS 4B]

正常格式（6B转发头）:  全部12字节用于转发+自定义，选6B做转发信息
压缩格式（12B转发头）: 用完整12字节
关键：以太网帧的DA+SA字段被重新定义为转发头，
      剩余字节给用户自定义（可嵌XPU内部寻址信息）
SUE Lite在Gen2基础上进一步精简：去掉RH和R-CRC，只剩6B AFH头 + payload + FCS，把IP面积省去50%。

SUE的可靠性头部（RH）——8字节干了大事
字段名    大小     含义
ver       2bit    版本号（支持演进）
op        2bit    操作码：ACK/NACK/无效
rsv       2bit    保留
xpuid    10bit    目标XPU ID（最多1024个XPU）
npsn     16bit    包序列号（Next PSN）
vc        2bit    虚拟通道（4个VC，映射到以太网流量类）
partition 10bit   分区标识（多租户隔离）
apsn     16bit    ACK/NACK对应的PSN
<strong>10bit xpuid = 最多1024个XPU</strong>。这不是随便拍的，这是根据2025年的工程约束（机柜体积、功耗、SerDes数量）决定的Scale-Up天花板。

<strong>16bit PSN</strong> + GoBackN = 端到端可靠传输。最多65536个包的窗口，在800Gbps下覆盖约500ns RTT已经足够。

SUE最聪明的机制：Packing（打包）
SUE规范原文：

“SUE opportunistically packs the received transactions to the same {destination, VC}, creating up to 4096 bytes of packed SUE PDU.”注意”opportunistically”这个词——<strong>机会主义的</strong>。SUE不等队列满了再发，而是”有就打包，没有就立刻发”。

这是延迟和效率的完美平衡点：

- 如果队列里有多个命令发往同一个XPU：打包，一次发出，效率最大化
- 如果队列为空：立刻发出当前命令，不等对于128B的Load操作，4个聚合后效率从56%提升到77%，而延迟几乎没有增加（因为是机会主义的）。

SUE的优缺点
<strong>✓ 优点：</strong>

- 三种封装选项，从标准以太网到压缩格式渐进演进，生态兼容性最好
- Packing机制智能高效，延迟和效率都有保障
- SUE Lite省50%面积，对单GPU集成多实例（8-16个）关键
- 来自OCP和Broadcom，背书强，以太网生态白嫖能力最强
- 端到端可靠传输（SUE Full）+ 链路级LLR双保险<strong>✗ 缺点：</strong>

- SUE不定义XPU互操作协议——不同XPU厂商的命令格式对SUE透明，互通性依赖上层定义
- 无集合通信卸载能力（交换机纯转发）
- AFH Gen2格式需要交换机理解新的帧头，生态建设需要时间
- 不处理内存一致性（地址翻译在XPU外部处理），系统集成复杂度高
UEC（Ultra Ethernet）——Scale-Out的正面进攻
<strong>档案：</strong>

- 出身：Linux Foundation下的Ultra Ethernet Consortium，行业联盟
- 版本：v1.0，2025年6月发布
- 核心定位：Scale-Out AI/HPC网络，InfiniBand的以太网替代者
为什么要单独说UEC
UEC不是Scale-Up的直接竞争者，但它必须单独分析，因为：

- <strong>UEC的LLR和CBFC被ETH-X和OISA直接借鉴</strong>，是技术源头之一
- <strong>Scale-Up和Scale-Out的融合是未来趋势</strong>（ETH-X白皮书专门讨论了这个），UEC将是融合后的上层协议栈
- 工程师必须理解<strong>为什么同样的以太网基础，Scale-Out和Scale-Up要走完全不同的协议路</strong>
UEC的协议栈架构
应用框架: PyTorch / TensorFlow / MPI / CCL
              ↓
软件层: libfabric v2.0 API（统一接口）
              ↓
传输层（UET）:
  ┌─────────────────────────────────┐
  │ SES（语义子层）                  │ ← 消息ID、缓冲区地址、操作语义
  │ PDS（包传输子层）                 │ ← 可靠/不可靠、有序/无序四种模式
  │ CMS（拥塞管理子层）               │ ← ECN、包剪裁（Packet Trimming）
  │ TSS（传输安全子层）               │ ← 加密认证（可选）
  └─────────────────────────────────┘
              ↓
网络层: 标准IP（IPv4/IPv6）
              ↓
链路层: 标准以太网 + LLR + CBFC（可选增强）
              ↓
物理层: 标准IEEE 802.3 PHY

UEC的杀手锏：Packet Trimming（包剪裁）
这是UEC里最有创意的设计，颠覆了传统拥塞控制的思路。

<strong>传统拥塞控制的问题：</strong>

发送方 → 包到达拥塞交换机 → 丢包 → 等RTT超时 → 发送方才知道
响应延迟 ≈ RTT ≈ 几十µs
<strong>UEC的包剪裁：</strong>

发送方 → 包到达拥塞交换机 → 交换机截断包，只保留头部
       → 修改DSCP字段标记拥塞信息
       → 截断包继续转发到目的地
       → 目的地收到截断包，立刻知道路径上的拥塞位置
响应延迟 ≈ 单向传播延迟 ≈ RTT/2
UEC规范原文：

“UE defines a packet trimming feature that allows switches to truncate contested packets, modify the DSCP field of the truncated packet, and forward the truncated packet toward the destination as the congestion signal.”这个设计的代价：目的端的FEP（Fabric Endpoint，相当于网卡）必须能正确处理截断包，不把它当CRC错误丢掉。这需要专门的FEP支持，但好处是拥塞响应速度大幅提升。

UEC的三个传输Profile
Profile目标场景核心特性AI Base低成本AI训练Send/Recv，RMA读写，最小化硬件AI Full高性能AI训练加Deferrable Send、Exact Match、原子操作HPC高性能计算AI Full超集，支持复杂MPI语义这三个Profile的分层设计很聪明：芯片商可以只实现AI Base，硬件复杂度最小，进入门槛低；高端产品实现HPC Profile，全功能覆盖。

UEC在Scale-Up中的真实角色
不要把UEC当Scale-Up协议用——它的延迟预算（2-10µs）比Scale-Up的要求（µs）整整差一个数量级。UEC使用IP层，而Scale-Up的原则是”probably no IP”。

但UEC对Scale-Up的价值在于：

- <strong>LLR（链路级重传）</strong>：被SUE、ETH-X直接采用
- <strong>CBFC（基于信用的流控）</strong>：被所有Scale-Up协议采用
- <strong>libfabric v2.0 API</strong>：如果未来Scale-Up/Out融合，UEC将是统一软件接口<strong>UEC的优缺点</strong>

<strong>✓ 优点：</strong>

- Scale-Out领域最完整的规范，全栈覆盖（从API到物理层）
- Packet Trimming是工业界拥塞控制的重大创新
- 基于标准IP/以太网，与现有网络设备完全兼容
- libfabric接口，上层框架（MPI/PyTorch等）可以无缝对接
- Linux Foundation背书，多厂商中立，开放生态<strong>✗ 缺点：</strong>

- 不适合Scale-Up（延迟、头部开销都不达标）
- 规范复杂庞大（450+页），实现门槛高
- 对交换机有较多要求（Packet Trimming、ECN等），需要交换机专门支持
- 安全特性（TSS）引入额外开销，对性能敏感场景是负担
ETH-X（Scale Up互联协议）——ODCC体系的工程师派
<strong>档案：</strong>

- 出身：ODCC（开放数据中心委员会），国内GPU/Switch/IO厂商联合
- 版本：白皮书（ODCC-2025-03002），正在向标准演进
- 核心定位：以太网帧头部革新 + IO芯粒架构解耦
ETH-X的核心创新：PRI帧格式（Packet Rate Improvement）
传统以太网帧的前12字节是DMAC(6B) + SMAC(6B)，只携带两个MAC地址，仅用于二层转发。

ETH-X白皮书的洞察：<strong>这12字节被严重浪费了。</strong>

Scale-Up场景下：

- 拓扑固定，MAC地址里的48bit有大量信息可以被压缩
- 需要TTL（防循环）、DSCP（QoS优先级）、ECN（拥塞标记）等控制字段
- 需要10字节的设备内部寻址（IOD内部的GPU Die、HBM Channel等）<strong>PRI帧的重新定义：</strong>

Octet 0-1:   NetworkDeviceID (2B)  ← 交换机转发查找用（原DMAC前2字节）
Octet 2-11:  UserDefined (10B)     ← GPU内部寻址，交换机完全忽略（原DMAC后4+SMAC6）
Octet 12-13: EtherType = ETH-X TPID (2B)
Bit 96-99:   RSVD (4bit)           
Bit 100-103: TTL (4bit)            ← 防环，每跳递减
Bit 104-109: DSCP (6bit)           ← QoS队列选择
Bit 110-111: ECN (2bit)            ← 拥塞标记
Octet 16+:   Payload
End:          FCS (4B)
<strong>同样12字节，原来只有48bit的MAC地址，现在有：</strong>

- 16bit路由地址（NetworkDeviceID）
- 80bit设备内部寻址（UserDefined）
- 4bit TTL + 6bit DSCP + 2bit ECN信息密度翻倍，帧头总长度不变。

<strong>效率对比：</strong>

格式头部128B数据传输效率标准IP帧34B56%PRI帧（6B转发头）6B74%PRI帧 + 4包聚合12B共享77%
ETH-X的协议层次
ETH-X把功能分成两个能力集合，这个分法很清晰：

<strong>ETH.DMA能力集合</strong>（支持DirectCopy语义）：

- PFC（优先级流控）
- ECMP（等价多路径，负载均衡）
- QoS（调度机制）<strong>ETH.MEM能力集合</strong>（支持DirectAccess语义，这才是Scale-Up的核心）：

- PRI帧格式（头部压缩）
- L2 LLR（链路层重传，来自UEC）
- CBFC（基于信用的流控，来自UEC）这个划分告诉你：ETH-X的设计团队清楚地区分了”大块数据拷贝”和”细粒度内存访问”两种场景，并为它们设计了不同的能力集合。

ETH-X的事务层：PAXI（Peer-to-Peer AXI）
ETH-X在以太网上定义了一套P2P AXI协议，让GPU之间可以用AXI总线语义互访：

GPU Die → AXI接口 → PAXI事务层 → TL Flit打包 → 以太网帧 → 交换机 → 目标GPU
PAXI包含两类接口：

- <strong>DAXI（Data AXI）</strong>：承载实际的读写事务（AW/W/B/AR/R通道）
- <strong>CAXI（Control AXI）</strong>：承载控制消息
- <strong>APB</strong>：管理接口（配置和状态）
ETH-X的独特设计：IO芯粒（IO Die）
这是ETH-X区别于其他协议的架构级创新：

传统方案：GPU Die = 计算Core + HBM接口 + ScaleUp IO（全集成）
         问题：计算Die要用最先进工艺（追求性能），IO Die用成熟工艺（追求成本）
               两者绑死在一起，工艺选择困难，良率低

ETH-X方案：计算Die（先进工艺N3/N2）← UCIe → IO Die（成熟工艺N7/N5）← Eth → 交换芯片
           优点：
           - 计算Die专注计算，工艺可以激进
           - IO Die专注互联，可以跨GPU厂商复用
           - 各自独立演进，解耦迭代
           - 整体良率提高（两个小芯片比一个大芯片良率高）
UCIe接口是计算Die和IO Die之间的标准连接，ETH-X定义了FDI层做协议转换（PCIe/AXI → ETH-X数据链路层）。

ETH-X的内存一致性分析——最务实的坑挖者
ETH-X白皮书花了大量篇幅分析Scale-Up场景下破坏Release语义的五种场景，包括：

- <strong>多路径乱序</strong>：ECMP导致同一事务的多个包走不同路径，到达顺序颠倒
- <strong>多IOD处理乱序</strong>：同一GPU的不同IOD处理同一流量时时延不一致
- <strong>缺乏全局一致性</strong>：生产者写了多个GPU的数据，但Flag的写入先于数据到达这种<strong>把所有坑都挖出来摆在桌面上</strong>的风格，是工程导向的典型体现——不仅告诉你协议能干什么，更告诉你哪里会出问题以及怎么解决。

<strong>ETH-X的优缺点</strong>

<strong>✓ 优点：</strong>

- PRI帧格式创新：不增加帧长，大幅提升头部信息密度
- IO芯粒架构解耦：生态灵活性强，计算/IO独立演进
- PAXI事务层定义完整，AXI是GPU界通用接口，适配广泛
- 详细的内存一致性分析，工程落地时坑少
- 定义了Scale-Up/Out融合路径，有前瞻性
- GNAI统一编程接口，向上层软件提供统一抽象<strong>✗ 缺点：</strong>

- 白皮书阶段，正式规范尚未完成，部分细节待填充
- PRI帧要求交换芯片重新定义帧头解析逻辑，现有以太网交换机需要软件/固件升级
- INCA（网内计算）只是提及，尚未详细定义
- 与标准以太网（DMAC/SMAC字段含义）的不兼容需要仔细处理
- 国内生态为主，国际推广尚需时间
OISA（全向智感互联架构）——中国方案的集大成者
<strong>档案：</strong>

- 出身：中国移动牵头，2024年6月48家单位联合发布Gen1.0，2025年8月发布Gen2.0
- 版本：Gen2.0（Technology Specification）
- 核心定位：从物理层到事务层的完整自定义，交换机参与计算
OISA的设计理念：颠覆交换机的传统角色
OISA开篇序言说得直白：

“交换芯片的角色被重新定义，它不仅仅是网络数据报文的转发节点，而是作为提升和扩展计算能力的关键载体。”这是和其他三个协议最根本的哲学分歧：

- SUE/ETH-X/UEC：交换机 = 转发节点（可以做流控，但不做计算）
- OISA：交换机 = 转发节点 + 计算加速节点这不是一个小改动，这意味着OISA的交换芯片必须内置ALU，必须理解All-Reduce等集合通信操作的语义。

OISA的协议三层架构
┌──────────────────────────────────────────────────────┐
│                 事务层（Transaction Layer）            │
│  ┌─────────────┬──────────────┬──────────────────┐  │
│  │ 极致访存模式 │ 智感访存模式  │ 集合通信加速模式  │  │
│  │ (EXP Mode)  │ (INS Mode)   │ (CCA Mode)       │  │
│  │ 最小延迟     │ 随路感知      │ 交换机做计算      │  │
│  └─────────────┴──────────────┴──────────────────┘  │
├──────────────────────────────────────────────────────┤
│                 数据层（Data Layer）                   │
│  BFC（缓存感知流控）+ PFC（优先级流控）                 │
│  DLR（数据层重传）+ CRC校验                           │
│  随路感知标签处理                                     │
├──────────────────────────────────────────────────────┤
│                 物理层（Physical Layer）               │
│  兼容IEEE 802.3，50G-1.6T聚合速率                     │
│  RS(544,514)标准FEC + RS(272,257)轻量FEC              │
└──────────────────────────────────────────────────────┘

OISA的报文格式——20字节的极致精简
OISA的最小报文 = 16B统一头部 + 4B全局CRC = <strong>20字节</strong>。

Byte 0-15: 统一报文头（16字节，强制）
  ├── Version (3bit)    : 协议版本，前向兼容
  ├── VC (3bit)         : 8个虚拟通道
  ├── Packet Type       : 事务类型（EXP/INS/CCA三种模式）
  ├── Source ID / Dest ID: 路径寻址
  ├── Tag ID            : 事务匹配（请求-响应配对）
  ├── Format            : 后续可选字段的存在标志
  ├── Length            : 数据载荷长度
  └── DSCP/优先级/控制字段

Byte 16-23: 内存地址（8字节，条件可选，64位）
Byte 24~N-1: 数据载荷（变长，条件可选）
Byte N~N+3: 全局CRC（4字节，强制）
不套以太网帧格式，不需要MAC地址，不需要IP头。报文就是报文，干净利落。

OISA的三种访存模式——一套帧格式的三种灵魂
这是OISA最精彩的设计——<strong>同一套报文结构，一个Mode字段，三种完全不同的系统行为：</strong>

<strong>模式一：极致访存模式（EXP Mode）</strong>

目标：最小单跳延迟 + 最高载荷效率
交换机行为：精简流水线，只做：
  报文解析 → 地址查找 → 端口转发
  （不做任何感知或计算）
GPU行为：直接发Load/Store/Atomic，等响应
场景：延迟敏感的细粒度内存访问，如Tensor Parallel的权重同步
<strong>模式二：智感访存模式（INS Mode）</strong>

目标：在传输过程中收集路径上的网络状态
交换机行为：在转发同时：
  - 读取自身端口缓存队列深度
  - 读取链路质量指标
  - 与感知标签比较，如果当前状态更差，更新标签
  - 转发更新后的报文
GPU接收方：看感知标签，知道路径上最坏节点的位置和状态
GPU发送方：基于反馈，调整发送速率或切换路径
场景：需要自适应流控的大流量传输
<strong>这个设计的工程价值：</strong> 不需要带外管理网络，不需要额外的探测包，感知信息<strong>随数据包自然流动</strong>。网络状态感知的overhead趋近于零。

<strong>模式三：集合通信加速模式（CCA Mode）</strong>

目标：让All-Reduce等集合通信在交换机内完成，减少GPU间的数据流转
前提：OISA交换芯片内置ALU

以All-Reduce为例的传统流程（Ring All-Reduce）：
  GPU0 → GPU1 → GPU2 → GPU3 → GPU0（多轮次，通信量正比于N）

OISA CCA Mode流程：
  所有GPU → OISA Switch（GPU汇聚请求）
            ↓ 交换机内部做Reduce（相加/求最大值等）
            ↓ 交换机直接向所有GPU发送Result
  通信轮次：2轮（上行+下行）
  通信量：O(1)，不随GPU数量增加

支持的操作：
  All-Reduce, Reduce, Broadcast, Reduce-Scatter, All-Gather, All-to-All
这个设计的理论加速效果：对于N个GPU做All-Reduce，传统方案通信量是O(N×数据量)，CCA Mode是O(数据量)。N越大，加速效果越显著。

OISA的拓扑——四种场景全覆盖
OISA不像SUE那样主要面向单级交换，它为四种拓扑都给出了具体配置：

拓扑适用规模特点直接互联2-8 GPU无交换机，GPU直连，成本最低单级交换最大256 GPU/Switch每GPU端口固定连接一个Switch平面，路径唯一，无乱序背脊互联跨机柜，256+ GPU两机柜各有Switch，背靠背互联叶脊拓扑千卡级叶层+脊层，支持OISA最大规模1024 GPU<strong>单级交换拓扑的典型配置（来自OISA规范）：</strong>

256 GPU × 8端口 × 200Gbps = 每GPU聚合带宽 1.6Tbps
8个 OISA Switch，每个：
  - 51.2Tbps处理能力
  - 256个 200Gbps端口
8个独立Switch平面 → 路径确定唯一 → 无多路径乱序
<strong>OISA的优缺点</strong>

<strong>✓ 优点：</strong>

- 集合通信加速（CCA Mode）是真正的计算-互联协同创新，理论上可大幅降低All-Reduce时延
- 智感访存（INS Mode）的随路感知设计极其聪明，零额外带宽开销
- 协议栈最完整，从物理层到事务层，管理层面全覆盖
- 20字节最小帧，载荷效率极致
- 单级拓扑设计天然无乱序，大幅降低系统复杂度
- Gen2.0已有国产GPU/Switch芯片开始研发，产品化推进积极<strong>✗ 缺点：</strong>

- 交换芯片需要内置ALU，这对交换芯片面积/功耗/成本提出了更高要求
- 完全自定义帧格式，与标准以太网设备完全不互通，生态建设难度最大
- 国际推广路径不明确（UEC有Linux Foundation，SUE有OCP，OISA的国际标准组织尚待确定）
- Gen2.0虽已发布，但产品投片刚开始，实际性能有待验证
- 交换机计算能力在某些场景可能成为新的瓶颈（如混合流量场景）
第四章：四个协议的本质区别——一张表看清

核心能力矩阵
维度SUEUECETH-XOISA主战场Scale-UpScale-OutScale-UpScale-Up帧格式以太网帧内嵌/AFH Gen1/2标准ETH+IP+UDPPRI帧（重定义DA/SA）完全自定义（20B最小）协议层级L2（以太网帧级）+ 传输层L2-L4（完整传输层）L2（改良以太网帧）独立三层（TL/DL/PL）通信语义内存语义（one-sided）消息+内存（RDMA）内存语义（AXI）内存语义（ODMA+指令直驱）最大规模1024 XPU25.6万 FEP512+ GPU1024 GPUE2E可靠✓ SUE Full（PSN+GoBackN）✓ PDS多模式✗ 链路级为主✗ DLR+FEC链路重传✓ LLR✓ LLR✓ L2 LLR✓ DLR流控机制CBFC + PFCECN + 包剪裁 + 信用CBFC + PFCBFC + PFC集合通信卸载✗✗（有生态但不做卸载）提及INCA但未定义✓✓✓ CCA Mode随路感知✗ECN标记ECN标记✓✓✓ INS Mode安全特性分区隔离（Partition字段）TSS（完整加密认证）未定义RAS机制与标准ETH兼容✓（标准格式选项）→ △（AFH Gen2）✓✓（标准IP）△（PRI改变帧头）✗（完全自定义）交换机改动最小（标准格式）→ 小（AFH格式）最小（标准IP）中（支持PRI解析）大（需ALU）软件接口Signal/AXI4 → XPU NOClibfabric v2.0AXI4 + GNAIOISA TL接口 + 管理API规范成熟度✓✓ v1.0正式发布（OCP批准）✓✓ v1.0正式发布△ 白皮书阶段✓ Gen2.0发布，芯片投片出身生态OCP（Broadcom主导）Linux Foundation（行业联盟）ODCC（国内）中国移动+48家单位
最本质的分类：三条不同的道路
三种设计哲学：

道路一：骑在以太网上（SUE）
  策略：以太网帧是载体，我在里面定义自己的传输层
  代价：多一层封装开销
  回报：白嫖整个以太网生态（交换机、光模块、管理工具）
  
道路二：改良以太网帧（ETH-X）
  策略：重新定义以太网帧头字段，让每字节承载更多控制信息
  代价：与标准以太网设备不完全兼容
  回报：同等帧头开销，信息密度翻倍

道路三：从零设计（OISA）
  策略：完全自定义协议栈，不受以太网帧格式约束
  代价：生态建设成本最高，全链路设备都要支持
  回报：最优的协议效率，且交换机可以参与计算

第五章：工程师选型指南

你的场景是什么？
<strong>场景1：你是GPU芯片设计团队，做国际市场（美国/欧洲生态）</strong>

选择：SUE（Scale-Up） + UEC（Scale-Out）

理由：
- SUE是OCP正式标准，Broadcom主导，Broadcom交换芯片生态完善
- SUE三种封装选项：先用标准IP格式验证，后切AFH Gen2优化性能
- SUE Lite省50%面积，GPU集成8-16实例不是问题
- Scale-Out用UEC，软件栈统一（libfabric），方便上层框架对接
- 两者共享LLR/CBFC等链路层技术，硬件实现有共同基础

注意：SUE不定义GPU间的应用层互操作，你还需要在SUE之上定义自己的命令格式
<strong>场景2：你是国内GPU芯片设计团队，目标国内AICloud</strong>

选择：OISA（Scale-Up）为主，ETH-X参考

理由：
- OISA Gen2.0已有国内GPU+Switch联合投片，生态在建
- 集合通信加速（CCA Mode）对国内大模型训练有直接价值
- OISA的完整规范（含管理层）有助于系统快速集成
- ETH-X的PRI帧格式和IO芯粒架构可以作为互补参考
- 国内AICloud通常是同质硬件部署，全链路定制的生态壁垒相对小

注意：OISA要求交换芯片有ALU，交换芯片合作方的选择很关键
      Scale-Out部分仍可考虑兼容UEC，与国际生态保持接口
<strong>场景3：你是交换芯片设计团队，想做Scale-Up市场</strong>

不同协议对你的要求：

SUE（AFH Gen2）：
  - 支持新EtherType解析
  - 支持LLR（链路级重传缓冲）
  - 支持CBFC信用流控
  - 转发延迟 < 250ns（cut-through模式）
  → 改动最小，入门门槛最低

ETH-X（PRI帧）：
  - 重新定义前12字节的解析逻辑（NetworkDeviceID + UserDefined）
  - 支持TTL递减、DSCP/ECN处理
  - 支持L2 LLR + CBFC
  → 中等改动，需要修改帧头解析流水线

OISA（CCA Mode）：
  - 内置ALU单元（支持加法、比较等集合通信算子）
  - 支持INS Mode的感知标签比较更新
  - 支持三种报文模式的精准区分
  → 改动最大，面积/功耗有额外成本
  → 但差异化竞争力最强（业界目前只有OISA定义了交换机计算卸载）
<strong>场景4：你是数据中心系统集成商，采购决策</strong>

短期（2025-2026）：
- Scale-Out：优先评估UEC兼容NIC（已有Broadcom等厂商样片）
- Scale-Up：观望为主，SUE和ETH-X的交换机生态尚在建立
- 国内部署：关注OISA Gen1.1芯片出货情况

中期（2026-2027）：
- Scale-Up市场将有OCP/ODCC两条标准路线的产品竞争
- 建议优先选择支持至少两种封装格式的GPU芯片（灵活性高）
- 关注Scale-Up/Out融合部署方案（ETH-X白皮书已有讨论）

长期（2028+）：
- 协议战争的终局不取决于技术优劣，取决于哪家GPU芯片先大规模出货
- 跟GPU出货量走，生态会自然形成

第六章：这场战争的终局预判

不是技术问题，是生态博弈
这四个协议，技术上各有优劣，但决定胜负的从来不是技术。

历史告诉我们：

- VHS赢了Betamax：不是因为技术更好，而是出货量更早更多
- TCP/IP赢了OSI：不是因为协议设计更优雅，而是已经大规模部署了
- NVIDIA的NVLink为什么强势：因为背后有H100/H200的出货量<strong>协议标准的胜出，本质上是GPU出货量的胜出。</strong>

三种可能的未来
<strong>情景A：NVLink继续主导，其余四个成为补充</strong>（概率：40%）

如果NVIDIA继续保持H200/B200的性能领先，大部分用户宁愿支付溢价用NVLink，Scale-Up的其他协议只能在非NVIDIA GPU的场景里活着。

<strong>情景B：SUE+UEC成为西方开放标准，OISA成为中国标准，两套生态并行</strong>（概率：45%）

这是当前最可能的走向：

- 国际市场：OCP/Linux Foundation体系（SUE+UEC）逐渐获得AMD/Intel/Broadcom的支持
- 国内市场：OISA联合体（中国移动+华为/昇腾/国产GPU厂商）形成自己的闭环生态
- ETH-X成为OISA生态里的技术组件被吸收，或独立演进面向特定场景<strong>情景C：一场技术融合，产生统一的下一代互联架构</strong>（概率：15%）

LLR/CBFC这些技术已经在四个协议间交叉引用了。如果某家足够强势的厂商（比如Broadcom/Marvell这样的交换芯片巨头）推动，有可能在物理层和链路层形成共同基础，事务层各自实现。

工程师的最终建议
 不要等待”最终胜者”再做决策，这样你会永远落后。
 正确的策略是：<strong>理解每个协议的约束边界，在你的芯片/系统设计里留好抽象层</strong>——让Scale-Up传输层对上层计算逻辑透明，让帧格式的选择可以通过配置切换而不是重新流片。
 <strong>SUE已经给了你一个很好的范例：三种封装选项，同一个传输层，覆盖从最保守到最激进的不同阶段需求。这种”分层+可配置”的设计思路，比押注某一种具体格式要稳健得多。</strong>
结语：一场关于GPU算力主权的战争
表面上，这是四个协议在争夺Scale-Up网络的标准位置。

本质上，这是一场关于<strong>谁来定义AI时代算力基础设施的游戏规则</strong>的战争。

NVLink握着的不只是一个互联协议，而是整个CUDA生态的护城河。SUE+UEC是西方开放阵营试图用以太网生态打破这个护城河的尝试。OISA是中国AI产业试图建立独立算力基础设施的战略行动。

每一个协议的设计决策背后，都是这些更深层的力量在驱动。

理解了这一点，你就不会再问”这个协议为什么要这么设计”——因为答案不在技术里，在战略里。

而作为工程师，你的使命是：<strong>在这场战略博弈中，设计出能在任何一种结局下都能工作的系统。</strong>

这，才是真正的架构能力。

<strong>---- 春种秋收，冬暖梦凡。</strong>