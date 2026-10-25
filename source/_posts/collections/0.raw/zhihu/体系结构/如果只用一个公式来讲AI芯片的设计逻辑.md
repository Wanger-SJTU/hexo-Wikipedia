---
title: 如果只用一个公式来讲AI芯片的设计逻辑
date: "2026-07-12 00:00:00"
updated: "2026-07-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/如果只用一个公式来讲AI芯片的设计逻辑/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2059736823258158913
---


如果只用一个公式来描述你的行业，你会选择哪个公式？一切 AI 芯片设计的终极仲裁，早在晶体管被发明的那一刻，就已经写在了这个平方律里。一、从一粒沙子说起

从撒哈拉的沙粒到数据中心吞吐万亿参数的算力卡，这条产业链漫长到令人眩晕。高纯度石英砂在电弧炉中还原为冶金级硅，再经西门子法提纯为九个九的电子级多晶硅，拉制成单晶锭，切片、抛光，最终成为 300 毫米的镜面晶圆——这套流程已经被讲述过无数次。

真正的问题是：在这条链条上，绝大多数科普叙事在某个节点悄然断裂。要么一头扎进量子力学的能带深渊，用薛定谔方程描摹硅原子的波函数；要么悬浮在架构的云端，谈论 RTL、流水线与指令集，却对晶体管如何<strong>物理地</strong>完成一次加法缄默不语。

两者之间，缺少一根能同时贯通微观材料与宏观架构的单一锚点。

这根锚点其实早已存在。

任何一颗 AI 芯片——无论其片上网络拓扑多精妙、存储层次多复杂——最底层的计算动作，都最终由一颗金属-氧化物-半导体场效应晶体管（MOSFET）的充放电来完成。而描述这颗晶体管在饱和区驱动电流能力的，是一个简洁到近乎优美的平方律公式：

![](https://www.zhihu.com/equation?tex=+I_%7Bds%7D+%3D+%5Cfrac%7B1%7D%7B2%7D%5C+%5Cmu_n%5C+C_%7Box%7D%5C+%5Cfrac%7BW%7D%7BL%7D%5C+%28V_%7Bgs%7D+-+V_%7Bth%7D%29%5E2+)

它不像欧姆定律那样粗粝到只能描述导线，也不像玻尔兹曼输运方程那样拒人千里。本文的核心论点是：这个公式的精神——即<strong>电流由材料迁移率、栅氧电容、沟道几何和过驱动电压共同决定</strong>——已经以”等效全局电容”和”平均过驱动电压”的泛化形式，刻印在每一张 AI 芯片的物理设计蓝图（Floorplan）里。

整个 AI 芯片设计史，本质上是一部围绕这个公式中 
![](https://www.zhihu.com/equation?tex=C)（电容）、
![](https://www.zhihu.com/equation?tex=V)（电压）、
![](https://www.zhihu.com/equation?tex=I)（电流）三个参数的妥协、博弈与分治的历史。理解了公式中每个符号的物理意义和工程权衡，你就拿到了解构从 28nm 到 3nm、从 GPU 到存内计算所有 AI 芯片设计决策的钥匙。

全文将分三步展开：先纵向打通”从硅到门”的四层物理纵深，证明该公式对传统芯片设计的基础解释力；再横向升维，揭示 AI 芯片的”存储墙”与”精度墙”如何不过是公式在系统层级的投影；最后回归第一性原理，推演当大算力不再是唯一目标时，AI 芯片将走向何方。

二、向下扎根：四层阶梯
要真正理解这个公式的统治力，必须建立清晰的物理纵深。我们可以将公式中的变量沿一条垂直线展开，形成从材料到系统的四层阶梯——每一层都对应一类不可逾越的工程约束，逐级收紧设计的自由度。

第一阶梯：
![](https://www.zhihu.com/equation?tex=%5Cmu_n) 与 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D)——材料的出厂设定

![](https://www.zhihu.com/equation?tex=%5Cmu_n)，电子迁移率，是公式中最”被动”的参数。它刻画的是电子在硅晶格中穿行的轻松程度，由两种散射机制共同支配：晶格热振动引发的声子散射，以及电离杂质带来的库仑散射。二者对温度的敏感度截然相反——低温下杂质散射主导，高温下声子散射激增。这就是芯片必须在 -40°C 到 125°C 全温区做时序验证的物理根源：温度一变，
![](https://www.zhihu.com/equation?tex=%5Cmu_n) 改变，
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 随之改变，门延迟也就跟着漂了。

对于 AI 芯片这样的大规模并行系统，温度梯度还会引发片内不同区域的关键路径时序不均——一个局部热点可以让整个计算阵列的频率被拖下来。

![](https://www.zhihu.com/equation?tex=C_%7Box%7D)，单位面积栅氧化层电容，定义为 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D+%3D+%5Cvarepsilon_%7Box%7D+%2F+t_%7Box%7D)。为了增大驱动电流，工艺工程师的本能反应是不断削薄 
![](https://www.zhihu.com/equation?tex=t_%7Box%7D)。然而当二氧化硅薄至 1.2nm 以下，栅极与沟道之间的量子隧穿效应开始失控——电子直接穿透氧化层势垒，静态漏电灾难性飙升。

这就是 28nm 以下节点必须引入高介电常数（High-K）材料加金属栅极（Metal Gate）的物理逻辑：铪基氧化物（如 HfO₂）的介电常数高出 SiO₂ 数倍，允许在物理上保持更厚的栅介质，却通过高 
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon) 等效出极小的等效氧化层厚度（EOT）。本质上，这是在公式里”作弊”换电容——用一个物理上更厚的层，骗过量子隧穿，同时维持 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D) 的数值。

这两项参数构成了材料层面的”出厂设定”，所有后续设计决策都必须在它所给定的 
![](https://www.zhihu.com/equation?tex=%5Cmu_n) 和 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D) 上限之内进行。

第二阶梯：
![](https://www.zhihu.com/equation?tex=W%2FL)——版图设计师手中唯一的自由杠杆
宽长比 
![](https://www.zhihu.com/equation?tex=W%2FL) 是版图设计师唯一可以直接调控的电流放大旋钮：沟道越宽、长度越短，
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 越大。产业界赖以生存的缩微（Scaling）正是围绕缩小 
![](https://www.zhihu.com/equation?tex=L) 展开——
![](https://www.zhihu.com/equation?tex=L) 缩小，不仅 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 增大，栅电容也减小，开关速度得以飞升。

但持续缩短沟道长度会诱发严重的短沟道效应。当漏极耗尽区与源极耗尽区靠得过近，漏极电压的电力线会直接侵入源端势垒——这就是漏致势垒降低（DIBL），意味着沟道长度缩小时阈值电压被漏极偏压”偷走”，关态漏电急剧上升。同时，阈值电压 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 本身也随 
![](https://www.zhihu.com/equation?tex=L) 减小而发生滚降。这两个效应联手摧毁晶体管的开关比——公式里的 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 不再是固定常数，而是一个随 
![](https://www.zhihu.com/equation?tex=L) 滑动的变量。

为了在继续缩小 
![](https://www.zhihu.com/equation?tex=L) 的同时夺回栅极对沟道的控制权，器件结构经历了两场革命。

第一次：鳍式场效应晶体管（FinFET）。沟道从平面翻起，竖立成鳍状，栅极三面环绕。以更强的电场钳制载流子，限制电力线的逃逸路径。第二次：当 
![](https://www.zhihu.com/equation?tex=L) 进一步缩至几纳米，三面环绕也不够了，于是进化到全包围栅极（GAA，即纳米片或纳米线沟道被栅极四面环抱），彻底消灭了电力线可以从侧面溜走的死角。

这些器件演进的物理动机只有一个：继续缩小 
![](https://www.zhihu.com/equation?tex=L) 而不让 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 崩溃，维持平方律中 
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D+-+V_%7Bth%7D%29) 的开关陡直性，使得公式提供的电流增益依然可控。

第三阶梯：
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D+-+V_%7Bth%7D%29%5E2)——速度与功耗的致命捆绑
数字逻辑将平方律用到极致：
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D%3D0) 时晶体管关断，
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D%3DV_%7BDD%7D) 时晶体管导通并进入饱和区。公式中的平方项直接决定了导通强度。

由此可以直接导出基本反相器的延迟公式：

![](https://www.zhihu.com/equation?tex=+t_%7Bdelay%7D+%5Cpropto+%5Cfrac%7BC_L+%5Ccdot+V_%7BDD%7D%7D%7BI_%7Bds%7D%7D+)

——频率由负载电容的充放电速度决定。而充放电速度又取决于 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 的大小，即取决于过驱动电压 
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D+-+V_%7Bth%7D%29)。

问题出在另一条公式上。动态功耗：

![](https://www.zhihu.com/equation?tex=+P_%7Bdynamic%7D+%3D+%5Calpha+%5Ccdot+C_L+%5Ccdot+V_%7BDD%7D%5E2+%5Ccdot+f+)

结合平方律可以发现一个残酷的不对称关系：频率 
![](https://www.zhihu.com/equation?tex=f) 随 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D) 的提升呈现<strong>近似线性或亚线性</strong>关系（尤其在先进工艺下，载流子速度饱和使得 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 对电压的依赖从平方律退化为线性）。但动态功耗 
![](https://www.zhihu.com/equation?tex=P_%7Bdynamic%7D+%3D+%5Calpha+C_L+V_%7BDD%7D%5E2+f) 始终与 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D%5E2) 强相关。这个”<strong>频率增益被电压平方代价碾压</strong>“的不对称性，才是死刑立判的根本物理依据。

这就锁死了”靠加压提频”这条路。

这就是为什么 CPU 主频在 5GHz 附近撞上功耗墙的根本物理理由，也是为什么 AI 芯片不得不放弃单核死磕频率的思路、彻底转向大规模并行化的深层动因。你用平方律的增益去追单线程性能，功耗就以平方的代价追着你跑——这是一场注定的败局。

在历史上的黄金时代（Dennard 缩放纪元，约 65nm 之前），当晶体管特征尺寸缩小时，
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D) 和 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 会按相同比例降低，从而保证功耗密度（功耗/面积）恒定。然而进入纳米时代后，一方面亚阈值漏电指数级暴涨，迫使 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 不能随意降低；另一方面工艺波动使得低电压下时序不确定性激增。<strong>Dennard 缩放定律于此宣告解体。</strong> 自此以后，单位面积的功耗密度不再恒定，而是随工艺缩进而飙升——这便是当代 AI 芯片”功耗墙”的历史起点。理解了这段历史，才能理解为何 AI 芯片宁可牺牲单核频率，也要走上”大规模并行化”这条看似笨拙、实则唯一有效的物理自救之路。

第四阶梯：PVT——当公式里的常量不再是常量
前三个阶梯的讨论都隐含一个假设：硅片上的每个晶体管是一样的。但在纳米尺度，这个假设轰然崩塌。

沟道中掺杂原子的离散分布（RDF，随机掺杂起伏）与光刻线宽粗糙度（LER），使得同一片晶圆上每个晶体管的 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 都呈正态分布，而非一个单一的标量值。工艺工程师用三个”工艺角”（Process Corner）来统计抽象这一现象：快工艺角（FF）下 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 偏低，电流偏大但漏电飙升；慢工艺角（SS）下 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 偏高，过驱动电压骤减，
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 可能跌至典型值的一半；典型角（TT）则居其中。

传统 CPU 必须为这些慢晶体管留出巨大的时序裕量——在时钟树和关键路径上预留额外的延迟缓冲，以确保即使跑在最慢的工艺角上，信号也能在一个周期内到达终点。这本质上是牺牲所有”快”芯片的性能来确保最坏情况下的良率。芯片出厂前的 Shmoo 图测试——电压-频率二维扫描——正是为了在量产中挑出那些躺在正态分布尾巴上的、
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 掉到不可接受的低谷的个体。

所谓的 PVT 三变量——工艺（P）、电压（V）、温度（T）——不过是公式中 
![](https://www.zhihu.com/equation?tex=%5Cmu_n)、
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 和 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D) 三大变量的环境映射。理解这一层，才算真正理解良率与设计裕量之间的统计博弈。

三、向上生长：当公式遇见 AI
从通用芯片到 AI 专用芯片，思维需要完成一次关键的升维：公式中的负载电容 
![](https://www.zhihu.com/equation?tex=C_L)，不能再被视为单级门的几十阿法栅电容，而必须被泛化为系统的”等效全局电容”。

片内寄存器翻转面对的 
![](https://www.zhihu.com/equation?tex=C_%7Bgate%7D) 在阿法量级。而一块 HBM 内存芯片，经过硅中介层、微凸块和 PCB 走线，映射到计算单元输入端的等效负载电容 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 可达数皮法——高出整整三到四个数量级。

为了对抗 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 的物理暴政，工艺工程师并非束手无策。在铜互连工艺中，金属导线之间的绝缘介质已从传统的二氧化硅（相对介电常数 
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon_r+%5Capprox+3.9)）逐步替换为多孔低k介质（
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon_r+%5Capprox+2.5) 甚至更低）。这本质上是在公式的”等效电容”项中，通过降低绝缘介质的介电常数 
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon) 来削减线间寄生电容——因为互连寄生电容 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 与绝缘介质的介电常数 
![](https://www.zhihu.com/equation?tex=%5Cvarepsilon) 近似成正比（
![](https://www.zhihu.com/equation?tex=C+%5Cpropto+%5Cvarepsilon)）。尽管低k材料的引入会让机械强度与热导率付出代价，但在动辄千米级总长度的芯片互连线面前，这种材料层面的”电容缩水”是拯救带宽能效的必要牺牲，也是平方律公式在互连介质维度上的被动优化。

 存储墙（Memory Wall）的物理本质，不是距离远，而是 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 这个有限的驱动电流，面对巨大 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 充放电所付出的极高能量代价。搬运 1 比特数据出片所需的能耗，足以支撑片上做数百次乘累加（MAC）运算。这就是为什么所有 AI 芯片白皮书开篇必讲”数据重用”的根本物理动因。

破局路线一：压缩空间电容——让数据”住”在计算单元旁边
脉动阵列（Systolic Array）是当代 AI 加速器的引擎心脏。它的物理智慧在于：通过精心排布数据流，将权重、输入或部分和锁定在本地寄存器阵列中，让数据在空间上”跳动复用”，而非每次都从远端存储搬运。

三种主流数据流策略——权重固定（Weight Stationary）、输入固定（Input Stationary）、输出固定（Output Stationary）——物理逻辑高度一致：以 Weight Stationary 为例，权重从 SRAM 加载到处理单元（PE）的本地寄存器后，被反复使用。原本每次乘加都要支付一次 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 的搬运费；现在仅首次加载支付，后续的每一次乘加仅支付本地寄存器翻转的 
![](https://www.zhihu.com/equation?tex=C_%7Bgate%7D) 成本。

由此可以给出一个极具物理直觉的<strong>粗略判据</strong>：AI 芯片的能效（TOPS/W）在系统层级上，本质上体现为”**本地栅电容翻转能耗（
![](https://www.zhihu.com/equation?tex=C_%7Bgate%7D+%5Ctimes+V_%7BDD%7D%5E2)）与远距离线电容搬运能耗（
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D+%5Ctimes+V_%7BDD%7D%5E2)）的博弈**“。尽管电压平方项 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D%5E2) 是全局公共因子，但数据复用率每提高一倍，就相当于把平均每次操作分摊的等效 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D) 砍掉一半。

数据复用率越高，平均每次操作分摊的等效电容越低，能量就越集中地花在”算”上而非”搬”上。

破局路线二：压缩时间电容——低精度设计的物理红利
再往下推一层：每次 MAC 操作内部的能耗也有巨大的优化空间。

一个 
![](https://www.zhihu.com/equation?tex=N) 比特乘法器，其内部全加器树的总沟道宽度 
![](https://www.zhihu.com/equation?tex=W_%7Btotal%7D) 近似正比于 
![](https://www.zhihu.com/equation?tex=N%5E2)——每个额外的比特位都引入指数增长的逻辑门和并联晶体管支路。因此单次 MAC 的动态能耗 
![](https://www.zhihu.com/equation?tex=E_%7BMAC%7D+%5Cpropto+W_%7Btotal%7D+%5Ccdot+V_%7BDD%7D%5E2)。

当推理精度从 FP32 降到 INT8，再到 INT4，等效于把公式里参与充放电的”总沟道宽度”砍掉数倍，单次操作能耗直线下降。更精妙的是：精度降低后，电路对瞬态噪声的容忍度提高，系统对电压裕量的要求放宽。于是 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D) 可以进一步向近阈值区（Near-Threshold）下压。

虽然频率随之暴跌——因为 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 随过驱动电压平方级萎缩——但你可以用”路线一”省下来的功耗预算，去布局更多并行单元，以面积换频率，把总吞吐量补回来。

 这就是 AI 芯片设计中经典的”精度-电压-并行度”三相耦合：精度越低 → 所需电压越低 → 可堆叠的并行单元越多 → 总体能效以超线性趋势跃升。并行化的另一面是<strong>版图面积的膨胀</strong>。增大 
![](https://www.zhihu.com/equation?tex=W)（宽沟道）或复制大量 PE（处理单元）虽然压低了等效电容，但直接导致芯片面积（Die Size）增大。而晶圆制造中的缺陷密度（Defect Density，单位面积上的致命瑕疵数）是统计恒定的——面积越大，一颗 Die 被随机缺陷击穿的概率越高，良率（Yield）呈指数级下滑。因此，架构师手中的杠杆并非只受物理公式约束，还受<strong>晶圆厂产线的颗粒度（Particle Control）</strong>和<strong>晶圆光罩的极限尺寸（Reticle Limit）</strong>的联合绞杀。好的 AI 芯片设计，必须在这条”物理优化曲线”与”良率成本曲线”的交叉点上寻找最优解。

破局路线三：稀疏性——当 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 趋近于零时的物理断舍离
除了压缩精度和复用数据，AI 芯片还有一把隐形的物理利刃——<strong>激活值与权重的稀疏性</strong>。在神经网络推理过程中，经过 ReLU 等激活函数后的大量输出值以及训练后趋于零的权重，天然呈现极高的数值稀疏度（即包含大量”0”）。

当输入激励或权重趋近于零时，送入晶体管栅极的信号 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 处于极低电平（接近 0V）。依据平方律公式，驱动电流 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D+%5Cpropto+%28V_%7Bgs%7D+-+V_%7Bth%7D%29%5E2) 急剧衰减——此时该支路的动态充放电能量近乎归零。这意味着，<strong>数值上的”0”在物理上等效于该计算路径的”电流休克”</strong>。

先进的 AI 加速器通过在微架构层面引入”跳零（Zero-Skipping）”或”位掩码（Bit-masking）”逻辑，在数据进入乘法器之前预先检测无效操作数，并通过门控时钟（Clock Gating）或使能信号屏蔽后续的无效翻转与寄存器更新。这并非单纯的算法取巧，而是平方律在数值为 0 时的<strong>物理强制断舍离</strong>。极致稀疏化甚至能让芯片的有效算力突破峰值 TOPS 的虚胖面具——峰值算力是”所有单元全速运转”的理想值，而有效算力则是在真实稀疏负载下，真正发生电流充放电的操作所贡献的吞吐量。两者之间的鸿沟，正是由平方律中的过驱动电压项来精确裁定。

除了电容和电压，还有一个常被公式忽略但时刻勒住架构师脖子的物理量——<strong>热密度（Thermal Flux）</strong>。即便总功耗控制在 300W，若功率集中在脉动阵列的十几平方毫米核心区域，热流密度将远超风冷/液冷的热导极限。温度的飙升不仅反向钳制 
![](https://www.zhihu.com/equation?tex=%5Cmu_n)（迁移率下降），还会加剧互连电迁移（EM）老化。因此，当代 AI 芯片的物理设计中，”<strong>热点均衡（Thermal Balancing）</strong>“与”频率规划”同等重要——这不是公式能直接算出的，却是平方律产生的热量在热力学第二定律下的必然投影。

除了热密度，公式中隐含的”常数” 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D) 在实际运行中同样面临严峻的物理偷窃——<strong>电源分配网络（PDN）的动态压降（IR-Drop）</strong>。当脉动阵列中数万个处理单元（PE）在同一个时钟沿触发翻转时，瞬间抽取的巨量电流 
![](https://www.zhihu.com/equation?tex=I_%7Btotal%7D) 流经电源网格的寄生电阻 
![](https://www.zhihu.com/equation?tex=R_%7Bpar%7D)，会产生 
![](https://www.zhihu.com/equation?tex=%5CDelta+V+%3D+I_%7Btotal%7D+%5Ctimes+R_%7Bpar%7D) 的局部电压塌陷。这意味着芯片明明在顶层金属设置了 0.75V 的电源电压，局部逻辑区域实际到账的可能只有 0.65V。等效于公式中的 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 被系统性地”克扣”了 0.1V——而平方律告诉我们，过驱动电压的微小损失会被平方级放大为驱动电流的显著衰减，逻辑速度随之滑落，甚至触发时序违约（Setup Time Violation）。因此，顶级的 AI 芯片物理设计必须辅以密集的去耦电容（Decap）和粗壮的电源网格（Power Grid）来压低 PDN 阻抗，并采用”电压降感知（IR-Aware）”的时钟树综合与标准单元摆放策略。这是在系统级对抗平方律”电压敏感度”的唯一解，也是后端工程师在流片前日夜奔波于 EM/IR 分析工具中的根本物理动因——他们不是在跑仿真，而是在为公式中的 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 讨回本该属于它的每一毫伏。

上述三套组合拳合流，再叠加上对热密度与 IR-Drop 等物理实现暗雷的周密应对，共同构成了当代 AI 芯片能效奇迹的完整图景。极高的数据复用率摊薄了平均每次操作分摊的 
![](https://www.zhihu.com/equation?tex=C_%7Bwire%7D)；低位宽设计压低了每次操作内部需要充放的等效 
![](https://www.zhihu.com/equation?tex=C_%7Bgate%7D) 总和；稀疏性则让那些 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 趋零的操作路径直接免于充放电。三者联手将整个系统的”等效全局电容”压至物理极限附近，而热管理策略与 PDN 抗压降设计则为这套优化方案撑起了可靠的物理运行边界。

四、应对未来：倘若算力大潮退去
前两节都建立在一个共同前提之上：AI 算法对算力的需求持续膨胀。但这个前提并非物理定律。

当算法从密集矩阵乘向稀疏化、事件驱动乃至符号逻辑推理迁移，大算力需求不是无限增长，而是可能结构性退潮。届时，AI 芯片不会消失，而是发生一次<strong>设计基底的坐标平移</strong>：优化核心从平方项 
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D-V_%7Bth%7D%29%5E2)——追求大驱动电流——全面转向公式中的线性系数和静态特性（
![](https://www.zhihu.com/equation?tex=W%2FL)、
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 以及互连相关的等效电容）。

以下是三种平行的未来路径。

路径 A：如果算法极度稀疏、事件驱动（如类脑脉冲神经网络）
在这种负载下，绝大多数计算单元在绝大部分时间处于”关断”状态：
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D%3D0)，动态开关频率 
![](https://www.zhihu.com/equation?tex=f) 趋近于 0。动态功耗项消失。接管功耗大头的，是亚阈值漏电：

![](https://www.zhihu.com/equation?tex=+I_%7Boff%7D+%5Cpropto+%5Cfrac%7BW%7D%7BL%7D+%5Ccdot+e%5E%7B-%5Cfrac%7BV_%7Bth%7D%7D%7BkT%2Fq%7D%7D+)

必须注意，亚阈值区的电流特性受限于玻尔兹曼 tyranny（热力学暴政）：室温下，要使关态电流 
![](https://www.zhihu.com/equation?tex=I_%7Boff%7D) 降低一个数量级，需要将阈值电压 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 抬高至少 <strong>60mV</strong>。这个 
![](https://www.zhihu.com/equation?tex=60%5Ctext%7BmV%2Fdec%7D) 的亚阈值摆幅（SS）是常温下的铁律，不可打破（除非引入负电容或隧穿机制）。这意味着，在路径 A 的极低功耗场景下，每抬高一点 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D) 来”拧紧”漏电，都会以指数级压缩该管子的极限工作频率（因为过驱动电压被大幅蚕食）。<strong>这是一场”关断深度”与”唤醒速度”之间的零和博弈</strong>——而仲裁者，正是玻尔兹曼常数 
![](https://www.zhihu.com/equation?tex=k)。

芯片的设计逻辑彻底翻转。我们会刻意抬高 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D)，采用高阈值器件甚至堆叠管（在电源轨与地之间串联多个关断管，指数级勒紧睡眠漏电），并把 
![](https://www.zhihu.com/equation?tex=W%2FL) 压缩到最小几何尺寸——宁可牺牲驱动电流，也要阻遏漏电。

芯片的第一设计目标，从”单位时间的操作数（TOPS）”，蜕变为”单位时间的睡眠漏电成本（漏电功率）”。能效优化让位于静态功耗的终极压制——整个物理设计从激进的高频导向，转向节流策略。

路径 B：如果存内计算或模拟计算成为主流
在存内计算（CIM）阵列中，
![](https://www.zhihu.com/equation?tex=C_%7Box%7D) 的角色发生根本变异——它不再是寄生负载，而是存储模拟权重的物理媒介。权重以电荷形式驻留在栅氧层下，位线读出的电流依然服从平方律，但此时的 
![](https://www.zhihu.com/equation?tex=V_%7Bgs%7D) 是连续的模拟电压，而非数字的 0 或 
![](https://www.zhihu.com/equation?tex=V_%7BDD%7D)。

优化重心从 
![](https://www.zhihu.com/equation?tex=I_%7Bds%7D) 的绝对值，急转向 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D) 的晶圆级均匀性与器件匹配度——以及更关键的<strong>1/f 噪声</strong>和<strong>温度系数漂移</strong>，这些才是模拟计算精度的隐形杀手。

这将引发工艺选择的<strong>战略性分叉</strong>：对于依赖数字逻辑开关比的 SRAM 存内计算，先进 FinFET 依然是当然之选，因为它提供了最高的 
![](https://www.zhihu.com/equation?tex=I_%7Bon%7D%2FI_%7Boff%7D) 比值。但对于追求高精度模拟乘加的 CIM 架构，设计者可能会转向<strong>FD-SOI（全耗尽绝缘体上硅）</strong>工艺。FD-SOI 允许通过背栅偏置（Back-Bias）直接调制阈值电压 
![](https://www.zhihu.com/equation?tex=V_%7Bth%7D)，从而动态补偿工艺漂移和温度变化，且在模拟域的器件匹配性更优。这并非简单的”倒退”，而是以”牺牲极致密度换取模拟精度与鲁棒性”的定向进化——摩尔定律的”缩 
![](https://www.zhihu.com/equation?tex=L)“在这里暂时让位于”<strong>电容匹配定律与偏置可调性</strong>“。

路径 C：如果负载是逻辑推理与图遍历（符号 AI 或知识图谱）
大规模乘加阵列被大面积裁撤。芯片上绝大多数的晶体管和连线，属于片上网络（NoC）路由器和层级 SRAM 的读写控制逻辑。此时，芯片的总延迟不再由沟道 
![](https://www.zhihu.com/equation?tex=L) 的充放电决定，而由**金属互连线的物理长度 
![](https://www.zhihu.com/equation?tex=L_%7Bwire%7D)** 所决定的 RC 延迟主宰——因为长互连的等效负载电容 
![](https://www.zhihu.com/equation?tex=C_%7Bload%7D) 远超栅电容。

设计重心从”缩短沟道 
![](https://www.zhihu.com/equation?tex=L)“剧烈转向”缩短互连 
![](https://www.zhihu.com/equation?tex=L_%7Bwire%7D)“。

这将催生激进的 3D 堆叠（3DIC）技术：将高频通信的芯粒面对面贴合，利用混合键合或微凸块把互连长度从毫米压至微米；并通过硅通孔（TSV）实现垂直方向的直接信号穿越。长远来看，片上光互连以消除 RC 延迟瓶颈也并非空想。同时，导线中电流密度的急剧攀升使电迁移（EM）成为可靠性的硬墙——电子风撞击金属原子，导致原子迁移并最终形成断路。

频率墙让位于”<strong>互连牵引力墙</strong>“——能效的终极限制变成了电子在导线中集体漂移所容许的最大电流密度。

五、四根弦的变奏
让我们回到原点。

![](https://www.zhihu.com/equation?tex=+I_%7Bds%7D+%3D+%5Cfrac%7B1%7D%7B2%7D%5C+%5Cmu_n%5C+C_%7Box%7D%5C+%5Cfrac%7BW%7D%7BL%7D%5C+%28V_%7Bgs%7D+-+V_%7Bth%7D%29%5E2+)

这个平方律公式的四个自由度——
![](https://www.zhihu.com/equation?tex=%5Cmu_n)、
![](https://www.zhihu.com/equation?tex=C_%7Box%7D)、
![](https://www.zhihu.com/equation?tex=W%2FL) 与 
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D-V_%7Bth%7D%29)——宛如物理世界赋予芯片设计师的四根琴弦。

过去十年，AI 芯片设计的所有智慧都在疯狂拨动 
![](https://www.zhihu.com/equation?tex=%28V_%7Bgs%7D-V_%7Bth%7D%29) 这根弦：堆核、升压、提频，将平方项的能量压榨到极致，以求获得巨大的动态电流和峰值算力。这是”算力为王”时代的物理主旋律。

但当大算力叙事出现分岔，我们并非无路可走。我们只是换了一根弦来主奏：

- 拨动 
![](https://www.zhihu.com/equation?tex=W%2FL)，去对抗亚阈值漏电，把芯片从”跑得快”调校为”睡得省”；
- 拨动 
![](https://www.zhihu.com/equation?tex=C_%7Box%7D)，去拥抱模拟存储，让栅氧从寄生负载蜕变为计算媒介；
- 拨动 
![](https://www.zhihu.com/equation?tex=%5Cmu_n)，利用应变硅工程去补偿长互连的损耗，以材料创新换取互连自由。 AI 芯片设计永远不会穷途末路。因为<strong>第一性原理</strong>告诉我们：芯片的本质不是”算”，而是”调控电荷在特定势垒下的输运”。算法定义”算什么”，而平方律定义”能怎么调”。只要信息还需要以电荷的形式在硅中流动，这个公式就是一切未来架构的”物理仲裁庭”。所谓走向何方，不过是仲裁庭上，不同物理变量轮番坐上原告席，接受工程智慧的审问与重新调度。

本文所有物理论断均可回溯至 MOSFET 饱和电流平方律公式及其在系统层级上的泛化推演。