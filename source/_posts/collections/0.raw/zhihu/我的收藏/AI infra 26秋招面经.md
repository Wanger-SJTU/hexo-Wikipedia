---
title: AI infra 26秋招面经
date: "2026-04-20 00:00:00"
updated: "2026-04-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/AI-infra-26秋招面经/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2017740483217081305
---


AI infra 26秋招面经

Micro

Optimized for information gain

收录于 · 记事本

150 人赞同了该文章

秋招投了一些AI Infra相关的岗位，记录了下各家考察的内容，主要是大模型推理优化、训练框架、CUDA算子这些方向，供同方向同学参考。

百度 推荐架构/大模型基础架构工程师
一面

- C++ STL性能优化：vector、map、unordered_map的性能差异与优化策略
- 算法：多个有序数组求交集的优化方法（提前终止与剪枝策略）
- 工程背景：推荐场景大模型的多模态特性与离散样本空间处理二面

- 分布式推理：KV Cache传输优化、多卡通信优化策略
- PD分离（Prefill-Decode Decoupling）架构：分离的必要性，不分离时的资源干扰问题
- C++高性能编程：移动语义实现原理、性能提升机制与Cache局部性原理
- 并发控制：并发KV数组访问性能优化，哈希冲突解决（锁、原子操作等）
- 算法：二叉树右视图三面

- 算法：阿拉伯数字转中文读法（如1234→一千二百三十四）
- 业务场景：推荐场景实时训练特点（大词表、高稀疏性数据）四面

- 系统设计：完整训练任务的流程设计，需考虑的关键信息点
字节跳动 AI芯片研发工程师
一面

- 芯片架构：针对稀疏计算、科学计算的IP设计方法
- 大模型优化：KV Cache优化技术路径
- CUDA编程：矩阵乘转置操作优化，算子优化通用方法论
- 存储架构：固定读写口（18个）与Bank数量（16个）必然发生冲突时的优化策略二面

- 性能模型：Roofline Model分析与应用
- GEMM优化：TensorCore底层编程与迁移
- 精度优化：低比特（低于FP8）精度类型的研究与实践
- 稀疏化：Sparse Attention与Sparse KV Cache技术
- 算法：最长递增子序列
阿里云 基础平台研发工程师（PAI团队）
一面

- GEMM性能分析：MN维度大K维度小时的瓶颈定位（C矩阵写出带宽）与L2 Cache命中率优化（Swizzle）
- 大K维度优化：Split-K、Stream-K的同步机制、适用场景与Cutlass实现（信号量协作）
- FlashAttention3：FP8级联GEMM实现细节
- 性能分析：访存受限Kernel在NCU中的Bound指标识别（Scoreboard）二面

- 显存优化：Double Buffer机制理解
- 量化策略：FP8与INT8 KV Cache量化的并存原因分析
- 注意力机制：FlashMLA与FlashAttention的架构异同京东计算机视觉算法工程师

一面

- GEMM优化与国产GPU微基准测试（Microbenchmark），L2 Cache带宽测试方法
- 编程框架：Triton、TileLang了解程度，Swizzle技术应用
- 分布式调试：vLLM基于Ray的分布式架构调试方法
- 算子实现：手写RMSNorm CUDA Kernel二面

- 模型优化：量化后的性能与精度平衡策略
快手 GenAI异构计算架构与优化工程师
一面

- C++模板：全特化与偏特化应用
- CUDA架构：Warp-Specialization机制，WGMMA与MMA指令区别，Bank Conflict处理
- 强化学习：训练步骤、采样瓶颈分析
- 算子实现：手写CUDA Prefix Sum
- 异构计算：多元算力适配（曙光、寒武纪、华为等）二面

- 精度策略：INT8量化收益分析（理论vs实际）
- 业务场景：代码生成大模型（长Prompt、更长序列训练）的切分策略，训推框架优化三面

- KV Cache：命中率优化，Tree结构管理，RL场景下的Routing与Replay机制
- 分布式：分布式KV Cache架构
- 量化评估：量化对模型影响的评估标准四面

- 基础设施：硬件选型依据（性能、成本、供应效率、稳定性）
蚂蚁集团 Asys性能框架研发
一面

- 推理框架：除vLLM外的其他框架了解（金融/医疗大模型专用框架）
- 强化学习：训练框架与训练崩溃原因分析二面

- 量化策略：INT8与FP8优劣对比，LLM领域FP8主流原因
- 推理优化：长序列Decode优化策略
- 负载均衡：采样中的长尾问题导致的负载不均（短Prompt长输出无法使用序列并行）
同花顺 AI Infra工程师
一面

- 算子细节：多Request（不同Seq Length）场景下Paged Attention的处理机制
- 业务特性：金融大模型推理特点（高精度要求、数值严谨性），无损优化必要性二面

- 源码分析：vLLM Scheduler抢占策略的代码实现位置
- 业务场景：金融推理一致性要求（同一问题多次回答的一致性保证）
地平线 AI编译器研发工程师
一面

- 模型架构：Transformer Decoder结构详解
- 编译器：基于LLVM的编译工具链，智驾模型到征程芯片的高效部署
- 算法：多边形三角剖分的最低得分二面

- 计算图优化：Transpose算子合并，Transpose与Reshape算子合并策略
其他公司要点
硅基流动（推理引擎）

- Chunked Prefill的Mask Attention实现细节
- Prefix Caching的KV Block哈希表管理
- 量化实现：二维矩阵INT8量化的Block Reduce与Warp Reduce上海AI Lab（AI编译器）

- 精度格式：FP8数据格式细节与适用场景，DeepSeek新格式，H卡vs A卡特性差异
- DSL开发：借鉴Triton/TileLang的华为NPU DSL设计
总结
从面试内容来看，2026年秋招AI Infra岗位的技术考察有以下特点：

## 1. 推理优化是绝对核心


- PD分离、KV Cache管理、Continuous Batching等工程架构设计被反复考察
- FlashAttention系列（含MLA等变体）的实现细节成为标配问题
- 量化策略从FP16/INT8向FP8及更低精度演进，考察点从”要不要做”转向”怎么做平衡”2. CUDA编程能力门槛提高

- 不再满足于调用cuBLAS，要求理解Bank Conflict、Swizzle、Warp Specialization等底层机制
- 手写Kernel从简单的Softmax/RMSNorm扩展到Prefix Sum、Attention等复杂算子
- NCU等性能分析工具的使用成为必备技能3. 大模型架构理解深度要求提升

- MoE的EP（Expert Parallelism）策略对推理吞吐的影响
- 长文本（Long Context）场景下的计算通信掩盖、切分策略
- 强化学习训练框架的Infra优化（采样瓶颈、负载均衡）4. 国产/端侧芯片生态崛起

- 华为昇腾、地平线征程等国产芯片的编译器/算子优化岗位需求增加
- 端云协同、端侧大模型部署成为独立考察方向5. 业务场景驱动技术选型

- 金融场景的高精度与一致性要求
- 推荐场景的实时性、稀疏性特点
- 代码生成场景的长序列处理建议后续准备的同学：夯实CUDA编程基础，深入理解vLLM等开源框架源码，关注MLSys领域最新论文（尤其是FlashAttention、DeepSeek-MoE等工程实践），并根据目标公司的业务场景（金融/推荐/代码/多模态）针对性准备。

编辑于 2026-04-20 23:43・北京・包含 AI 辅助创作 作者对内容负责
AI infra

​赞同 150​​7 条评论​378 ​4 ​分享

​申请转载​​

未登录用户

7 条评论

默认
最新

高洋

不来我们组聊聊？

03-19 · 北京

​回复​1

Micro

作者

聊过的呀，高叔叔
03-19 · 北京

​回复​喜欢

倔强de沧海

我有一个问题为什么这么多人问 sparse 问Linear attention的这么少？后者不是更加流行吗

03-30 · 江苏

​回复​喜欢

Micro

作者

因为主要是对着简历问的，没有相关信息就不问
04-04 · 北京

​回复​喜欢

刘侃

太吊了
03-19 · 日本

​回复​喜欢

Marth

感谢🙏🙏
03-19 · 上海

​回复​喜欢

胡之

哈哈，总结那段是ai写的

03-19 · 北京

​回复​喜欢

关于作者

Micro
Optimized for information gain

回答
7
文章
154
关注者
1,166

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

AI infra 面试经验贴
笔者理工科PhD背景，在北美石油行业做高性能科学计算三年，有一些distributed computing和GPU programming的经验，ML经验仅限于上课。 25年年中开始打算跳槽，经过半年的劳累厮杀，面了美国…

抠抠歪

AI Infra 面试汇总（已断更）
## 00. 百度：Summer Camp - 大模型平台策略推理优化实习生（J98029）投递时间：2026-03-21 一面面试时间：2026-04-02 11:00 面试时长：1h 科研板块你这个科研项目挺有意思的，能简单介绍介绍…


林外海天峰

AI Infra实习面经（二）
lusfie

C++/CUDA/AI-infra面试经验总结
我自己在搞 AI Infra/HPC，有两个一直在维护的仓库： 一个是用 C++/CUDA 从零写的深度学习框架：OriginDL。用CUDA实现了矩阵计算，以及上层的深度学习框架，跑通了mnist训练和yolov5的推理…

jinboom