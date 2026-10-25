---
title: "FSA 微架构分析"
date: 2026-02-13
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1967289223154496010
---

FSA 微架构分析

龙云李

Dataflow is all u need.

收录于 · 龙云李的 AI Accelerator

56 人赞同了该文章

​目录

参考《SystolicAttention: Fusing FlashAttention within a Single Systolic Array》

论文分析见：Systolic Array For DSA

以往的 Attention 加速器大多将 GEMM 和 SFU 分离，导致数据搬运的能耗和延迟，虽然 FA3 引入异步机制，但问题依然存在。FSA 通过优化数据流在单个 SA 中即可执行完整 FA。创新性很强，但是很多微架构细节和 overlap 机制看论文没有看懂，好在开源FSA-github，因此阅读了一下源码，跑了一下仿真来学习。

1. 架构

1.1 总体架构

相对于传统 SA 增加了向上的数据通路和一排 CMP 模块。水平通路数据是低精度，垂直通路是高精度。ctrl 信号带 valid 指示。所有信号都是 systolic 地传播

1.2 CMP

CMP 微架构ctrl_cmp 命令列表：

命令编码描述UPDATE0更新最大值。将新的输入数据与当前 newMax 比较，更新 newMax，传播原输入数据PROP_MAX1传播 newMaxPROP_MAX_DIFF2传播 newMax - oldMax，更新 oldMax 为 newMaxPROP_ZERO3传播零值RESET4复位。将 oldMax 和 newMax 重置为最小值PROP_EXP2_INTERCEPTS5传播执行 e^x 时的截距序列val downCastDIn = ev.viewEasA(ev.cvtAtoE(io.d_input.bits))
因此在 UPDATE 命令下 CMP 是对输入数据量化后再输出

1.3 PE
PE 的控制逻辑可以分为三部分：计算、本地低精度寄存器更新、输出传递

命令描述计算命令mac执行 reg×left_input+acc 操作，并将计算结果向累加值方向相反的方向输出传递acc_ui累加值来自上方，0则来自下方寄存器更新命令load_reg_li从左侧接收数据加载到 reg 中load_reg_ui从上侧接收数据加载到 reg 中update_reg将 mac 计算结果更新到 reg 中exp2执行 exp2 计算并将结果更新到 reg 中输出传递命令flow_lrbypass 向右的数据通路flow_udbypass 向下的数据通路flow_dubypass 向上的数据通路exp2 部分的计算被拆分为：小数项线性近似( 复用 MAC )，整数项转化为移位操作来实现

在 exp2 的设计上有两个小巧思：

- 发现 intercept 的值在[0.5,1]之间，所以 exp 只有0和-1两种情况，只占用一位指数位。因此可以通过剩下的指数位来编码其序号信息k。
- 因为使用的是浮点数表示格式，因此移位操作转换为了对指数位的加减操作，无需桶形移位器。 

2. 运行
github 的 readme 非常详细，按步骤进行后可以跑 FA 的仿真

[fsa] Memory dump configured: /tmp/0x80000060.bin, start=0x80000060, size=64
FSA: dmaActive =         22
FSA: dmaInst =          4
FSA: execTime =        353
FSA: fence =          1
FSA: mxActive =         71
FSA: mxBubble =        206
FSA: mxInst =          5
FSA: rawInst =         32
*** PASSED *** Completed after                 4587 simulation cycles

3. 波形

3.1 整体运行
为 dump 波形要加入一些命令行参数

make debug CONFIG=FSA4X4Fp16Config
uv run main.py --seq_q 4 --seq_kv 4 --config FSA4X4Fp16Config --vcdfile "path"
首先将 pe_0_0, pe_0_1, pe_1_0,  cmp_0, cmp_1 的波形大体上打一下

接下来对应各 phase 分析一下

3.2 phase1: Preload Q
预载Q，N_COLS 个时钟周期

3.2 phase2: S=QK^T
采用方形阵列时，花费 3*N_ROWS 个时钟周期。

systolic 地输入K，pe 参数配置为 mac, flow_lr, acc_ui=0，所以执行 WS 式计算，输出向上数据流

3.3 phase3: rowmax(S)
求值 rowmax(S), 并回填 systolic。

在 phase2 启动 N_ROWS 个时钟周期后，即可得到S_00，此时 phase3 启动，共执行 2*N_ROWS 个时钟周期。

路由时配置为 flow_ud，回填时配置 load_reg_ui。

注意回填之后矩阵是反的，不然的话就把 pe 寄存器的值覆盖了，而 pe 寄存器的值还需要运算。如下图：

3.4 phase4: S-rowmax(S)
在 phase3 执行N_ROWS 个时钟周期，即最左侧列回填( load_reg_ui )完毕后开始 phase4，计算 S-rowmax(S)，执行 N_COLS 个时钟周期。pe 配置为 update_reg, acc_ui, flow_ud。 

3.5 phase5: a=old_m-new_m   phase6: N*log2e/√d
在 phase4 执行一个周期，即左上角的PE完成后即可开始 phase5 phase6，phase5使用向下的数据通路，phase6 使用向右的数据通路。共花费 N_ROWS 个周期。

phase5 配置为 flow_ud，phase6 配置为 update_reg 和 flow_lr。

3.6 phase7: exp2
在 phase5 和 phase6 开始后的下一拍即开始 phase7。exp2 每个 pe 接收8个周期的 k 和 b，根据小数的范围决定使用的 k 和 b。

3.7 phase8: rowsum   phase9: O=PV
phase7 开始8拍后执行 phase8 和 phase9，计算结束。

编辑于 2026-02-13 02:26・四川
​赞同 56​​11 条评论​147 ​1 ​分享

​申请转载​​

未登录用户

11 条评论

默认
最新

知乎用户snmGWM

挪一部分vector计算融合在systolic有意义，全放进去属实看不懂意义在哪。fa本质就是matrix/vector算力配比，特别是低精度

2025-12-25 · 上海

​回复​喜欢

为了理想

老师您好，我发现这篇论文的实际实现中，算法1里的第10行的b值并没有计算出来，以及第14和16行的old_l和old_O并没有和b相乘，请问为什么能省略？是否会影响精度？

2025-11-04 · 广东

​回复​喜欢

龙云李

作者

这些操作是在accumulator中完成的。原文有提。
2025-11-04 · 四川

​回复​1

为了理想

老师您好，请问您有这篇论文的RTL代码吗

2025-11-01 · 广东

​回复​喜欢

龙云李

作者

文章开头有仓库地址呀，是chisel写的
2025-11-01 · 四川

​回复​3

龙云李

作者

为了理想

个人感觉不算大。为什么要用verilog复现？如果是eda对语言有要求的话，chisel可以生成对应verilog的，只不过可读性比较差。
2025-11-02 · 四川

​回复​1

查看全部 7 条回复​

关于作者

龙云李
Dataflow is all u need.

回答
43
文章
28
关注者
1,438

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

新手必须知道的 Kubernetes 架构
进击云原生 控制平面组件ETCDetcd 是一个快速、分布式、一致的键值存储，用作持久存储 Kubernetes 对象数据（如 pod、replication controllers, secrets, services 等）的后备存储。实际上…

云原生基地

游戏服务器框架skynet并发模型的一点改进思路
skynet 的内核是一个多线程的消息分发器。每个服务有一个消息队列，任何服务都可以向其它任意服务的消息队列投递消息，而每个服务只可以读自己的消息队列，并处理其中的消息。 目前的工作原…

linux发表于linux...

两个跟并行计算加速相关的开源项目-HVM   Bend
天马行空的大杂烩

Go微服务架构实战 下篇：1. gRPC + Opentracing + Zipkin实现分布式链路追踪系统
堆栈future