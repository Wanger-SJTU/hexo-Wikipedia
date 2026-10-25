---
title: HBM浅析：架构、协议、产业格局，以及与DDR/LPDDR/GDDR的区别
date: "2026-08-10 00:00:00"
updated: "2026-08-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/HBM浅析-架构、协议、产业格局,以及与DDR_LPDDR_GDDR的区别/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2070193978914378884
---


一、前言
HBM（High Bandwidth Memory）并不是一种全新的存储单元。它的核心仍然是 DRAM，只是把多层 DRAM Core Die 通过 TSV 垂直堆叠，在底部加入 Base/Logic Die，并通过封装内超宽并行接口与 GPU 或 AI SoC 相连。

它与 DDR、LPDDR、GDDR 的主要差异不是“谁更先进”，而是面向不同系统约束的取舍：

- DDR 追求容量、通用性、低成本和可扩展性；
- LPDDR 追求低功耗、高集成和移动场景能效；
- GDDR 以很高的单引脚速率，在普通 PCB 上提供较高 GPU 带宽；
- HBM 以 1024/2048-bit 超宽接口和先进封装，换取最高的总带宽与每 bit 能效。截至 2026 年，HBM3E 仍是市场主力，HBM4 已进入量产爬坡，HBM4E 已开始送样。全球能够规模供应先进 HBM 的核心厂商仍是 SK hynix、Samsung 和 Micron。HBM4 以后，竞争已经从“DRAM 颗粒”升级为“DRAM + Logic Base Die + Foundry + 先进封装 + 散热 + 客户协同设计”的系统竞争。

二、HBM 的物理架构
一个典型 HBM Stack 从上到下由多层 DRAM Core Die 和一个 Base/Logic Die 组成：

HBM Stack
        ┌──────────────────────────┐
        │ DRAM Core Die N          │
        ├──────── TSV / bump ──────┤
        │ DRAM Core Die 3          │
        ├──────── TSV / bump ──────┤
        │ DRAM Core Die 2          │
        ├──────── TSV / bump ──────┤
        │ DRAM Core Die 1          │
        ├──────── TSV / bump ──────┤
        │ Base / Logic Die         │
        └──────── micro-bump ──────┘
                    │
             Silicon Interposer
                    │
        GPU / AI SoC HBM PHY + Controller

2.1 DRAM Core Die
每层 Core Die 都包含真正保存数据的 DRAM 阵列，以及 Bank、Row/Column Decoder、Sense Amplifier、局部刷新和 TSV 接口电路。

堆叠层数主要增加容量。例如：

24 Gb Die = 3 GB
8-Hi  × 3 GB = 24 GB
12-Hi × 3 GB = 36 GB

32 Gb Die = 4 GB
12-Hi × 4 GB = 48 GB
16-Hi × 4 GB = 64 GB
产品中的 8-Hi、12-Hi、16-Hi 通常描述 DRAM Core Die 的数量，底部 Base Die 不计入容量层数。

2.2 TSV 与层间连接
TSV（Through-Silicon Via）是在硅片内部形成的垂直导电通孔，用于传输：

- 数据；
- 命令和地址；
- 时钟；
- 电源与地；
- 测试、修复和冗余信号。TSV 负责“穿过硅片”，Micro-bump 负责“跨过两层 Die 的接合面”。当前量产产品主要使用微凸点、MR-MUF 或 TC-NCF 类工艺；后续会逐步引入铜—铜 Hybrid Bonding，以减小间距、堆栈高度、连接电阻和热阻。

2.3 Base Die 与 Logic Base Die
Base Die 位于 HBM Stack 最底部，负责：

- 对外 HBM 接口和 I/O 驱动；
- 命令、地址与时钟分发；
- Channel/Pseudo Channel 路由；
- 多层 DRAM 与外部 SoC 之间的数据连接；
- 测试、修复、冗余、ECC 和 RAS 支持；
- 电源、温度和部分可靠性管理。需要注意：Base Die 通常不是完整的 HBM Memory Controller。真正决定访问地址、请求调度、Bank 选择、读写切换和 QoS 的 Memory Controller 主要位于 GPU/SoC 内部。

可以这样区分：

SoC Memory Controller：决定读哪里、什么时候读
SoC HBM PHY        ：把请求转换为可靠的电气信号
HBM Base Die       ：把外部通道连接和分发到各层 DRAM
DRAM Core Die      ：完成 Row/Bank/Column 访问并保存数据
HBM3E 及之前的 Base Die 逻辑相对简单；HBM4 开始采用先进逻辑工艺，逐步演变为真正的 Logic Base Die，可集成更复杂的 PHY、RAS、电源管理及客户定制功能。

三、HBM 如何与 SoC 对接
HBM 使用 JEDEC 定义的专用超宽并行存储接口，不是 PCIe、CXL，也不是普通 DDR DIMM 接口。

主流物理连接为 2.5D 封装：

HBM Stack
   │ 底部 Micro-bump
Silicon Interposer / 高密度 RDL
   │ 数千根短距离并行走线
GPU / AI SoC HBM PHY
Silicon Interposer 通常是无源高密度布线层，把多个 HBM Stack 与 GPU/ASIC 放在同一封装内。整个先进封装再通过有机基板和 BGA 连接系统主板。

一次读取的路径为：

- SoC Memory Controller 选择 Stack、Channel、Pseudo Channel、Bank、Row 和 Column；
- SoC HBM PHY 通过 Interposer 发送命令、地址与时钟；
- Logic Base Die 把请求路由到对应 TSV 通道；
- 目标 DRAM Die 激活 Row，通过 Sense Amplifier 读出数据；
- 数据沿 TSV 返回 Logic Base Die；
- Logic Base Die 通过超宽并行接口把数据送回 SoC PHY。HBM 的数据不会在 Base Die 中统一变成一条很窄的高速串行流。它的核心思想就是保留大量短距离并行通道，以相对适中的单引脚速率获得极高总带宽。

理论峰值带宽可以近似计算为：

单 Stack 带宽 = 每引脚速率 × 数据位宽 ÷ 8
例如：

HBM3E：9.2 Gb/s × 1024 bit ÷ 8 ≈ 1.18 TB/s
HBM4 ：11 Gb/s  × 2048 bit ÷ 8 ≈ 2.82 TB/s

四、HBM 协议与产品代际
代际标准/时间I/O 宽度典型最高速率单 Stack 带宽代表性商用容量关键变化HBMJESD235，20131024 bit1 Gb/s128 GB/s1 GB、4-HiTSV 与 2.5D 商业化起点HBM2JESD235A/B1024 bit2.0–2.4 Gb/s256–307 GB/s4–8 GB容量、频率和 ECC 提升HBM2EJESD235C，20201024 bit3.2–3.6 Gb/s410–461 GB/s8–24 GB面向 HPC/AI 的增强版HBM3JESD238，20221024 bit6.4 Gb/s819 GB/s16–24 GB16 Channel、RAS 增强HBM3EJESD238 系列增强产品1024 bit8.0–9.8+ Gb/s1.0–1.28 TB/s24 GB 8-Hi、36 GB 12-Hi当前 AI 加速器主力HBM4JESD270-4，20252048 bit标准 8；产品 10–13 Gb/s标准 2；产品约 2.5–3.3 TB/s36 GB 12-Hi、48 GB 16-Hi位宽/通道翻倍、Logic Base DieHBM4E厂商增强型，2026 送样2048 bit14–16 Gb/s约 3.6–4.0 TB/s48 GB 12-Hi、64 GB 16-Hi更高密度、定制化与热优化SPHBM4JESD330-4，2026512 个物理数据信号4:1 串行化目标保持 HBM4 级带宽与 HBM4 Core Die 相同面向有机基板、降低集成成本HBM4 标准支持 4/8/12/16 层及 24/32 Gb Die，标准容量上限为 64 GB/Stack；独立 Channel 从 HBM3 的 16 个增加到 32 个。

SPHBM4 则使用 512 根数据线和 4:1 串行化，在保持 HBM4 级总带宽目标的同时允许使用有机基板。这可能把 HBM 级能力扩展到成本更敏感的 AI ASIC，但会引入更高速 PHY 和串行化功耗。

五、主要厂商与产品格局
截至 2026 年一季度，Counterpoint 按收入统计的全球 HBM 市场份额约为：SK hynix 58%、Samsung 21%、Micron 21%。同期大部分市场收入仍来自 HBM3E，HBM4 正在进入平台放量阶段。

5.1 SK hynix
产品容量/层数速率或带宽状态HBM3E 8-Hi24 GB约 9.2 Gb/s、约 1.18 TB/s大规模量产HBM3E 12-Hi36 GB约 1.18 TB/s2024 年率先量产HBM4 12-Hi36 GB10 Gb/s 级、超过 2 TB/s已建立量产体系HBM4 16-Hi48 GB10 Gb/s 级已展示/导入HBM4E 12-Hi48 GB最高 16 Gb/s2026 年 6 月送样SK hynix 的优势在于客户认证、量产经验和 Advanced MR-MUF 堆叠工艺。其护城河并不只是峰值速率，而是高堆叠良率、散热和稳定交付能力。

5.2 Samsung
产品容量/层数速率或带宽状态HBM3E 12-Hi36 GB最高约 1.28 TB/s量产/导入HBM4 8/12-Hi24–36 GB稳定 11.7、最高 13 Gb/s；最高 3.3 TB/s2026 年商业出货HBM4 16-Hi48 GB同系列规划扩产HBM4E 12-Hi48 GB稳定 14、最高 16 Gb/s；最高 3.6 TB/s2026 年 5 月送样HBM4E 16-Hi64 GB待定后续规划Samsung HBM4 采用 1c DRAM 和 4nm Logic Base Die。其优势是 DRAM、Foundry、逻辑设计和先进封装的垂直整合能力，适合后续 Custom HBM 路线。

5.3 Micron
产品容量/层数速率或带宽状态HBM3E 8-Hi24 GB>9.2 Gb/s、>1.2 TB/s已用于主流 AI GPUHBM3E 12-Hi36 GB>9.2 Gb/s、>1.2 TB/s量产/认证HBM4 12-Hi36 GB>11 Gb/s、>2.8 TB/s2026 年一季度量产HBM4 16-Hi48 GBHBM4 级已送样HBM4E预计 12/16-Hi待公布开发中Micron 的主要优势是能效、成熟 DRAM 制程、北美供应链地位及与主流 GPU 客户的联合验证。

六、HBM、DDR、LPDDR、GDDR 有什么区别
这四类产品底层都以 DRAM Cell 为主，但封装位置和接口设计完全不同。

对比项DDR5LPDDR5XGDDR6/GDDR7HBM3E/HBM4主要目标容量、通用性、成本低功耗与高集成普通 PCB 上的 GPU 高带宽最高带宽与带宽能效典型位置主板 DIMM 插槽焊在主板/SoC 附近或 PoPGPU 周围的 PCB与 SoC 同一先进封装结构DIMM 上多个 DRAM单/多 Die BGA多颗独立显存TSV 多层堆叠 + Logic Die接口宽度DIMM 64-bit 数据常见单 Die x16，系统多通道每颗通常 x32每 Stack 1024/2048-bit每引脚速率约 4.8–8.8+ GT/s约 8.5–10.7+ GT/sGDDR6 约 14–24；GDDR7 约 28–48 Gb/s约 8–16 Gb/s带宽级别单 64-bit 通道数十 GB/s依通道数达数十到数百 GB/s整卡约数百 GB/s 到 2 TB/s 级单 Stack 约 1–4 TB/s容量扩展最强较强中等相对有限每 bit 能效中等较高较低最高或接近最高可更换性DIMM 可更换通常不可更换不可更换不可更换系统成本最低中等中等最高主要应用PC、服务器、CPU手机、车载、AI PC、边缘 AI游戏 GPU、图形卡、部分推理卡AI 训练、HPC、顶级加速器
6.1 DDR：容量和通用性优先
DDR 通过主板走线连接 DIMM，拥有成熟、低成本、可维护和大容量的优势。它适合 CPU 主内存，但总线宽度有限，难以在合理功耗下达到单颗 AI GPU 所需的数 TB/s 带宽。

6.2 LPDDR：能效优先
LPDDR 通过较低 I/O 电压、细粒度休眠、WCK 数据时钟域及短距离连接提高能效。它常被焊接在主板或以 PoP 靠近 SoC，不能像 DIMM 一样随意更换，但适合手机、AI PC、车载和大容量低功耗统一内存。

6.3 GDDR：高单引脚速率优先
GDDR 在 GPU 周围放置多颗 x32 DRAM，通过 256/384/512-bit 总线组成显存系统。GDDR6 主要使用 NRZ，GDDR7 引入 PAM3，以更高的单引脚速率换取带宽。它不需要昂贵硅中介层，成本低于 HBM，但高速 I/O 功耗和 PCB 面积更大。

6.4 HBM：超宽接口优先
HBM 与 GDDR 走的是相反路线：GDDR 让较少的引脚跑得很快，HBM 则使用数千根短距离并行线。HBM 的单次随机访问延迟不一定显著低于 DDR；它真正优化的是高并发下的总带宽和每 bit 数据搬运能效。

七、这个领域还有哪些技术

7.1 SRAM 与片上 Cache
SRAM 不需要刷新、延迟最低，用于 Register、L1/L2/L3 Cache 和 AI Scratchpad。代价是面积大、单位容量昂贵，容量通常远小于外部 DRAM。

7.2 eDRAM 与 Wide I/O
eDRAM 把 DRAM 集成进逻辑工艺，历史上用于部分处理器缓存。Wide I/O/Wide I/O 2 曾尝试为移动 SoC 提供宽接口 3D 内存，但生态最终不如 LPDDR 和 HBM。

7.3 HMC
Hybrid Memory Cube 同样采用 TSV DRAM 堆叠和 Logic Die，但对外使用高速串行和数据包协议。其串行 PHY 功耗、协议复杂度和生态不占优势，已经退出主流；“带 Logic Die 的 3D Memory”思想则在 HBM4 中延续。

7.4 CXL Memory
CXL 是基于 PCIe 物理层的缓存一致性/内存互连协议，不是新的 DRAM Cell。CXL Memory 常在设备侧连接 DDR，用于扩展容量、内存池化和共享，带宽/延迟不及本地 DDR，更不能直接替代 HBM。

7.5 MRDIMM、MCR DIMM、CAMM2 与 LPCAMM2

- MRDIMM/MCR DIMM：通过 DIMM 上的缓冲与复用逻辑提高服务器 DDR 有效带宽；
- CAMM2：新的可更换内存模块形态；
- LPCAMM2：常承载 LPDDR，在低功耗与可维护性之间折中。
7.6 SOCAMM/SOCAMM2
SOCAMM 是面向 AI 服务器的紧凑型 LPDDR 模块，目标是在 HBM 之外提供能效较高的大容量近端内存。它更适合作为 HBM 的容量补充，而不是峰值带宽替代品。

7.7 HBF 与新型非易失存储
HBF（High Bandwidth Flash）尝试将类似 HBM 的堆叠和宽接口思想用于 NAND，提供远大于 HBM 的容量和接近 TB/s 级的吞吐，但随机访问、写入寿命和可擦写粒度仍不同于 DRAM。它可能成为 HBM 与 SSD 之间的模型权重/冷数据层。

MRAM、ReRAM、PCM、FeRAM 等则尝试填补 SRAM、DRAM 与 NAND 之间的空白，目前尚无技术能够同时在速度、密度、寿命、功耗和成本上全面替代 DRAM。

八、2026—2030 年技术趋势

8.1 单 Stack 带宽走向 4 TB/s
HBM4 标准为 2 TB/s，但量产产品已达到约 2.8–3.3 TB/s；HBM4E 样品进入 14–16 Gb/s，意味着单 Stack 进入 3.6–4 TB/s。继续提速将越来越依赖 Logic Base Die、低压 I/O、时钟、电源完整性和数据调度优化。

8.2 容量从 36 GB 向 48/64 GB 演进
近期路线是 36 GB 12-Hi、48 GB 12/16-Hi 和 64 GB 16-Hi。容量增加同时受到 DRAM 密度、Die 厚度、封装高度、翘曲、热阻与整堆栈良率约束。

8.3 Hybrid Bonding 成为高堆叠关键工艺
HBM4 量产初期仍会以 MR-MUF、TC-NCF 和微凸点为主；HBM4E 可能开始局部导入 Hybrid Bonding；进入 16-Hi 以上和后续 HBM5 后，其价值将明显上升。

8.4 Custom HBM 成为竞争核心
Logic Base Die 可以针对特定 GPU/ASIC 定制 PHY、地址映射、ECC/RAS、电源管理、数据重排、压缩或近存处理。HBM 将越来越像客户联合开发的系统芯片，而不只是标准化 DRAM 商品。

8.5 散热和能效超过峰值速率
未来应重点观察 pJ/bit、满速结温、堆栈上下层温差、热阻、降频点、长时间错误率和液冷兼容性。峰值 16 Gb/s 如果不能长期稳定运行，其系统价值有限。

8.6 先进封装成为供给瓶颈
HBM 供给取决于 DRAM 晶圆、TSV、Logic Base Die、Interposer、RDL、封装基板、测试和客户认证。拥有 DRAM 产能不等于拥有可交付的 HBM 产能。

8.7 AI 系统形成分层内存
未来更可能采用：

片上 SRAM：最热数据与临时结果
HBM      ：模型热点权重、KV Cache、实时计算
DDR/LPDDR/SOCAMM：较大容量近端内存
CXL Memory：共享和扩展容量
HBF/SSD  ：模型权重、冷数据和持久化存储
HBM 不会独自承担所有 AI 内存需求，软件的数据放置、迁移、压缩和缓存策略将与硬件同等重要。

九、产业洞察

- **HBM 已不是普通 DRAM 周期品。** 价值量越来越多地来自先进封装、Logic Base Die、测试、散热与定制设计。
- **规格最高不等于市场份额最高。** 客户真正采购的是稳定满速能力、良率、能效、按时交付和平台认证。
- **HBM4 强化 Foundry 和封装企业的话语权。** 竞争单元从单一存储厂变成 DRAM 厂商、Foundry、封装厂和 GPU/ASIC 客户的组合。
- **16-Hi 是下一阶段分水岭。** 能否控制封装高度、翘曲、热阻和整堆栈良率，将决定 64 GB 产品竞争力。
- **多源化是头部客户的必然选择。** 全球供应集中于三家厂商，AI 平台会通过多供应商认证降低交付与地缘风险。
- **中国追赶难点不只是 DRAM 制程。** 高密度 TSV、超薄晶圆、12/16 层良率、Logic Base Die、高速测试、Interposer 和客户认证均是关键门槛。最终可以用一句话概括：

HBM3E 比拼量产和客户份额；HBM4 比拼 Logic Base Die 与系统协同；HBM4E/HBM5 将比拼 16 层以上堆叠、Hybrid Bonding、热管理和客户定制。
十、参考资料

- JEDEC：[HBM4 JESD270-4 标准发布说明](https://link.zhihu.com/?target=https%3A//www.businesswire.com/news/home/20250416843598/en/JEDEC-and-Industry-Leaders-Collaborate-to-Release-JESD270-4-HBM4-Standard-Advancing-Bandwidth-Efficiency-and-Capacity-for-AI-and-HPC)
- JEDEC：[SPHBM4 JESD330-4 标准发布说明](https://link.zhihu.com/?target=https%3A//www.businesswire.com/news/home/20260713869107/en/New-JEDEC-SPHBM4-Standard-Enables-HBM4-Class-Bandwidth-on-Organic-Substrates)
- Counterpoint：[全球 DRAM 与 HBM 市场份额](https://link.zhihu.com/?target=https%3A//korea.counterpointresearch.com/global-dram-and-hbm-market-share-quarterly/)
- SK hynix：[12 层 36 GB HBM3E 量产](https://link.zhihu.com/?target=https%3A//news.skhynix.com/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/)
- SK hynix：[12 层 HBM4E 样品出货](https://link.zhihu.com/?target=https%3A//news.skhynix.com/en/12-layer-hbm4e-sample-1/)
- Samsung：[HBM4 商业出货](https://link.zhihu.com/?target=https%3A//news.samsung.com/global/samsung-ships-industry-first-commercial-hbm4-with-ultimate-performance-for-ai-computing)
- Samsung：[HBM4E 样品出货](https://link.zhihu.com/?target=https%3A//news.samsung.com/global/samsung-electronics-begins-shipment-of-industry-first-hbm4e-samples)
- Micron：[HBM3E 产品规格](https://link.zhihu.com/?target=https%3A//www.micron.com/products/memory/hbm/hbm3e)
- Micron：[HBM4 产品规格](https://link.zhihu.com/?target=https%3A//www.micron.com/products/memory/hbm/hbm4)
- AMD：[Instinct MI455X HBM4 系统规格](https://link.zhihu.com/?target=https%3A//www.amd.com/en/products/accelerators/instinct/mi400/mi455x.html)