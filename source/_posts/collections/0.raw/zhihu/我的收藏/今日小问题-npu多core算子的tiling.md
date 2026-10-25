---
title: 今日小问题-npu多core算子的tiling
date: "2026-01-19 00:00:00"
updated: "2026-01-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/今日小问题-npu多core算子的tiling/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1994528041406334011
---


今日小问题-npu多core算子的tiling

王多鱼-加油

LLM believer .All in AI.

收录于 · sysML

21 人赞同了该文章

​目录

1.前言
我一直按照gpu的方式理解npu。导致我一直不理解npu的算子在一个计算core上跑和在多个计算core上跑的区别。这里的npu计算core可以等价于有vector 计算硬件+matrix计算硬件+L1 cache的一个计算资源聚合体。我们都知道基于cuda模型，你的算子的simt是对齐到thread的，你的不同block还是要对到thread来承载数据的。所以我一直不理解一个nchw的矩阵在多个模型算子计算过程中，到底是如何从单个计算core扩展到多个计算core的。

2.展开
因为nchw的尺寸是大于计算core的matrix计算的尺寸的，所以还是要把计算的矩阵block tiling为合适的tile。如果我把这些tile全部都给到一个计算core，那个这个计算core就全部都计算。因为车端推理模型是一帧一帧的顺序推理，前后算子有输入和输出的因果，所以算子本身没有办法并行。那用充分利用多个计算core的计算能力，就得从一次计算来入手。所以可以按照batch/c/hw轴来切矩阵，切完的矩阵在core上做tiling。

一张图：NCHW → 多核 → 单核 tiling

NCHW 特征图
├─ 切 Batch（N）→ 每个 cluster 管一个 n′
│  ├─ 切 Channel（C）→ 每个 core 管一个 c′
│  │  ├─ 切 H×W → 每个 core 再按 h′w′ 做二维 tiling
│  │  │  ├─ 最里层把 k×k 卷积窗/矩阵乘送进
│  │  │  │  Matrix Unit（固定 16×16 / 32×32 / 64×64）
│  │  │  │  Vector Unit 做 bias+relu…
│  │  │  │  L1 缓存驻留 tile，double-buffer  prefetch
│  │  │  │  算完写回 L2/Global，发 doorbell 通知下游 core

等于把多个core当成整体计算资源来规划矩阵计算了。

2.1 性能瓶颈
我们明白npu怎么多core计算后，其实我们下一步就关心性能瓶颈了。

层级单核容量整芯片总容量理论带宽单核延迟 (clk)算术强度底线*最易出现的瓶颈表现Vector Reg File1 KB16 KB≈ 4 TB/s0—编译器自动分配，用户无感Matrix Reg File2 KB32 KB≈ 6 TB/s0—同上L1 SRAM (core local)128 KB2 MB1.2 TB/s1220 FLOP/Bytetile   16×16 时复用不够，DMA 等待L2 SRAM (shared)—2 MB256 GB/s90120 FLOP/Byte容量爆 or 带宽爆，最常见第一墙LPDDR5 (sys mem)—8–16 GB51.2 GB/s400+400 FLOP/Bytebatch 大 / 融合失败时 DDR 100 %我们应该能找到一个最佳的算术强度的线，这里*算术强度底线 = 要喂饱该级带宽所需的最低 FLOP/Byte；实测值低于它就一定“叫饿”。

使用方式：

- 跑一次算子，把 FLOP ÷ (L2 流量) 算出来；
- 对照最后一列，立刻知道该继续拆 K/H/W（ 120）还是去融算子/加 batch（ 120）。
2.2 为啥我一个模型用10个core有时跑的还没有 8个core快
10 核反而比 8 核慢，99 % 不是算力不够，而是“把 L2 这条本来就很窄的桥，让 10 辆车同时挤上去”——带宽被抢，cache 抖，同步开销放大，最后整体 IPC 掉坑。

几种可能：

1）L2 带宽争抢（A 类）
车端 NPU 的 L2 是全芯片共享 256 GB/s，不是 per-core！
8 core 时每核平均 32 GB/s，10 core 就只剩 25 GB/s。
当你的算子算术强度刚好踩线（≈ 120 FLOP/Byte），8 核还能“喂饱”，10 核直接线性地每人少吃 20 % 数据 → pipeline stall，IPC 掉 15-20 %，wall-time 反而更长。

2）L2 容量抖—DDR 反弹（B 类）

- 单核 working set（ifmap tile + ofmap tile + weight slice）在 8 核时刚好 1.8 MB，留 0.2 MB 给 prefetch；
- 换成 10 核，每核 OC 切片变薄，tile 数量 ↑ 25 %，总 working set 涨到 2.3 MB   2 MB；
- 触发强制 evict（L2/SRAM 容量满了），tile 来回踢到 DDR，带宽从 20 GB/s 飙到 45 GB/s，延迟暴涨。3）同步/负载不均（C 类）

- 尾部 tile 112×112 无法被 10 整除 → 0-9 号 core 各分 11×112，剩下 2×112 只能让 core0/1 再跑一次 → 2 核拖 8 核；
- barrier 等待时间从 3 μs 涨到 8 μs，10 核利用率掉 12 %。

2.3 编译器生效
下面给出一个简单的编译器或算子库的一些功能。

这个是ai给出的答案，谨慎参考。

编译阶段内置策略（编译器自动做）触发条件/阈值若策略失效如何人工 override1. 图切分 (Graph Partition)按“L2 容量模型”把整网切成 ≤ 1.8 MB 的子图；优先沿 N/C 切，保持 tile 数为 core 整数倍working_set   1.8 MB 或 tile%core ≠0手写 //% pragma split_c 64 强制指定切片2. 并行映射 (Mapping)先算 arithmetic intensity，  120 选“带宽保守映射”(少用 2 core)；  120 选“饱和映射”(用满 core)AI_est   120 FLOP/Byteexport OMP_NUM_CORES=8 限核3. Loop Tiling自动搜索 tile 宽使 bank_conflicts=0 且 64 B align；1×1 conv 跳过 im2colbank_conflict_cycles   5 % total#pragma tile_hw 16 164. DMA 调度 (Double-Buffer)把 K 轴再拆 k_tile，使 DMA 延迟隐藏在计算 pipeline 内；write-no-alloc 用于 ofmapDMA_overlap   80 %__builtin_npu_dma_store_noinv()5. 同步代码生成 (Sync Emission)尾部 tile 不均时自动生成“wave-调度”+ 寄存器门铃；tail_idle   10 %手动写 core_done[me]=1; while(!all_done);6. 指令排布 (Schedule)感觉这些还是有部分能力下降到算子库：

优化环节编译器方案（上表）算子库方案（kernel-lib 手写）库暴露给用户的「入口」库内常用实现技巧如果库没实现，谁来补1. 图切分 / 大模型拆 L2自动沿 N/C 切，保证 working set   1.8 MB库只拿到「已经切好的小 tile」库接口只接受 M/N/K 和 A/B/C ptr库内部用 __builtin_npu_dma_async 双缓冲上层框架（PyTorch/ONNXRuntime）写 graph pass2. 多核映射根据 AI 阈值决定 8/10 core库内手写 core_id = tid    4 自己分 tilekernel_launch   10, 1   (...)wave_id = me   5 ? 0 : 1 两级波用户 launch 几核就是几核，库不负责3. Loop Tiling自动搜 bank 0-conflict 尺寸库代码里 constexpr TILE_W=14 写死header 里给出 constexpr 可调奇数宽 + __builtin_npu_ldmatrix 对齐只能改源码重新编库4. DMA double-buffer自动生成 dma_wait / compute 交错手写 ping-pong buffer + __builtin_dma无 API，完全封装在 .c 里4-stage pipeline，宏展开框架看不到，需库维护者改5. 同步自动生成 barrier or doorbell手写 REG_CORE_DONE[me]=1; while(!all);无，库内静态编码寄存器门铃 60 ns用户无法换，除非提 PR6. 指令排布 / seed 搜索编译器 ILP 搜 0-7 选最快手写汇编 mma_async 顺序，人工重排无，纯汇编 .S手工 4-cycle shift 隐藏 latency库作者重排或加 nop7. 温度-降频回退编译器估 T 85℃ 自动降核无——库跑在硬件当前频率无接口库只测 cycle counter上层调度器限核或风扇策略

总结
编译器把优化做成“自动挡”，算子库把优化做成“手动挡”——图切分、多核映射、同步、降频回退全由框架/用户先手动打好，库只负责“单核内算得快”；调优路径从“改 pragma”变成“改源码 + 重编库 + 重发包”，迭代周期从天变成周。

这么看，编译器还是必须的，就和前几天说的triton类似，总得有地方总体规划并tiling。

编辑于 2026-01-19 17:46・浙江
MLSys2025

Triton

NPU

​赞同 21​​3 条评论​56 ​喜欢​分享

​申请转载​​

未登录用户

3 条评论

默认
最新

小小王

是哪个厂家的npu呢，不同厂家npu的架构差异大不呢

01-14 · 四川

​回复​喜欢

hally chey

赞一个。不过博主，开头的GPU 和NPU 都笔误写成了 gup 和 nup 

01-14 · 上海

​回复​喜欢

王多鱼-加油

作者

感谢，太细心了。昨晚硬爬起来写的。昨晚还漏了一个mlir的toy7的分析，聚焦pass manager的如何管理pass然后降级op的，最后放过了自己
01-14 · 浙江

​回复​喜欢

关于作者

王多鱼-加油
LLM believer .All in AI.

回答
452
文章
200
关注者
2,614

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器504 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费329 万热
伊朗最新局势314 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷256 万
中将军衔很厉害吗247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

从100到0使用cuTile实现模型本地推理 - MLP(2) Matmul-SiLU-Mul 算子融合
上一篇我们尝试使用cuTile替换Qwen2的MLP部分，结果反而负优化了8%……这篇文章我们尝试优化cuTile 的MLP相关kernel。 首先来看MLP的第一层：它有两个并行的matmul，形状是 M, N, K = seq_l…

Menooker

GPU开发：万字长文展示WMMA优化hgemm算子策略
一、背景wmma算子全称warp-level matrix multiply accelerate，顾名思义，wmma实现的是warp级别的矩阵乘法计算。在wmma算子内部，调用的是gpu的tensor core实现矩阵乘法。不同于cuda core对…

花月

deepseek MLA算子实现原理及VLLM代码解析
1. Deepseek 原生实现： 1.1 Q计算公式如下： （1）W^DQ和W^UQ看似是两个权重矩阵，事实上中间还有一个RMSnorm由（Liner+RMSnorm+Liner）组成，具体实现代码如下： init： forward： （2）…

默默的保护神

基于Ascend C的Matmul算子性能优化最佳实践
昇腾CANN