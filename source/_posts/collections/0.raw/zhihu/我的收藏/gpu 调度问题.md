---
title: "gpu 调度问题"
date: 2025-05-02
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/25685241636
---

gpu 调度问题

苍耳

收录于 · 高性能八股

132 人赞同了该文章

- CUDA多流并发处理时，如何让流并发运行而不是顺序运行? - 知乎 (zhihu.com)
- Cuda里面Wrap Shuffle Function - 知乎 (zhihu.com)
- CUDA 如何调度 kernel 到指定的 SM？ - 知乎 (zhihu.com)
- CUDA微架构与指令集（4）-指令发射与warp调度 - 知乎 (zhihu.com)
- 关于gpu的warp调度问题？ - 知乎 (zhihu.com)
- CUDA中warp的32个线程究竟是分配给几个sp来执行？ - 知乎 (zhihu.com)
- 为什么GPU没有分支预测？
-  GPU有哪些调度方法？
- 阿里云云栖号：Kubernetes的共享GPU集群调度 
- 兰新宇：GPU 调度 - Linux 实现
- lychee：GPU 底层机制分析：kernel launch 开销
- 问个CUDA并行上的小白问题，既然SM只能同时处理一个WARP，那是不是有的SP处于闲置？参考：

- Phoenix Studio：CUDA流和事件详解|GPU流水线执行
- 游凯超：一文读懂cuda stream与cuda event建议多关注@cloudcore
大佬专栏 CUDA编程方法论 - 知乎 (zhihu.com)

编辑于 2025-05-02 00:58・上海
高性能计算

CUDA

​赞同 132​​添加评论​409 ​1 ​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

苍耳

回答
8
文章
5
关注者
185

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

GPU 硬件层次和调度方式
工作原因，需要了解一下 GPU 的硬件和 CUDA 的对应关系和调度方法。由于不是专职优化 GPU 代码，所以就是个大概了解。 TL;DRPerfect solution for {数据并行}硬件设计思路：1. 高吞吐，低响…

Capta...发表于bit a...

（译）揭秘NVIDIA GPU并发内核线程块调度器的分配策略
哈哈波

详解操作系统内核对线程的调度算法
james...发表于操作系统相...

QNX 调度策略
一、背景本文将简单介绍一下QNX（实时操作系统）下的调度策略， 每当微内核在进入kernel call，exception或中断时会进行调度器决策； 举一个例子：调度器就像分诊护士，它确定如何使用有限…

无人知晓发表于QNX基础...