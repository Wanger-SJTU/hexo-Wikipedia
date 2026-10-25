---
title: "MLIR 文章视频汇总"
date: 2022-01-28
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/141256429
---

MLIR 文章视频汇总

法斯特豪斯

...

收录于 · TVM

430 人赞同了该文章

从刚刚接触MLIR的时候开始写文章，已经积累了一些，这篇文章做一个梳理，为自己写起来方便，也为大家读起来方便，之后的文章也会在汇总里持续更新。

MLIR入门系列
初见MLIR -- https://zhuanlan.zhihu.com/p/101879367

MLIR的法宝：Dialects -- https://zhuanlan.zhihu.com/p/102212806

MLIR的惊鸿一瞥 -- https://zhuanlan.zhihu.com/p/102395938

MLIR的生产线--Dialects和他的小伙伴们 -- https://zhuanlan.zhihu.com/p/102565792

MLIR Dialect的零件生产者 – TableGen -- https://zhuanlan.zhihu.com/p/102727417

MLIR Toy Tutorial系列
MLIR ODS 框架的使用示例 -- 自定义Operation -- https://zhuanlan.zhihu.com/p/105576276

MLIR 表达式变型 -- https://zhuanlan.zhihu.com/p/105905654

MLIR 实现泛化的表达式变型 -- https://zhuanlan.zhihu.com/p/106472878

MLIR 表达式优化 -- 部分Lowering -- https://zhuanlan.zhihu.com/p/107137298

MLIR表达式Lowering到LLVM IR -- https://zhuanlan.zhihu.com/p/108386819

MLIR向源语言添加struct类型 -- https://zhuanlan.zhihu.com/p/108575517

MLIR 进阶系列
MLIR Operation 与 Op -- https://zhuanlan.zhihu.com/p/135286044

MLIR OpBase.td Op 类的作用 -- https://zhuanlan.zhihu.com/p/136264570

MLIR Operation的构建之路 -- https://zhuanlan.zhihu.com/p/136799962

MLIR ODS框架的设计动机与优势 -- https://zhuanlan.zhihu.com/p/137165231

MLIR TableGen后端生成Ops代码 -- https://zhuanlan.zhihu.com/p/137617276

MLIR 诊断系统 - Source Locations -- https://zhuanlan.zhihu.com/p/261156885

MLIR 诊断系统 - Diagnostic   Diagnostic Engine -- https://zhuanlan.zhihu.com/p/262988212

初窥MLIR 即时编译引擎 -- https://zhuanlan.zhihu.com/p/337627570

MLIR 使用 x86 intrinsic -- https://zhuanlan.zhihu.com/p/373268534

MLIR Python Bindings系列
MLIR 开放项目 -- python bindings -- https://zhuanlan.zhihu.com/p/102934213

MLIR python bindings的问题 Dialect Operation build方法 -- https://zhuanlan.zhihu.com/p/103102332

MLIR python binding 简易模型建立 -- https://zhuanlan.zhihu.com/p/103524807

MLIR python binding -- pybind11 -- https://zhuanlan.zhihu.com/p/103836518

将pybind11示例嵌入到MLIR中https://zhuanlan.zhihu.com/p/104717000

基于CMake构建系统的MLIR Example扩展 -- https://zhuanlan.zhihu.com/p/104948867

MLIR Python Bindings Proposal -- https://zhuanlan.zhihu.com/p/122237814

MLIR使用Python打印module -- https://zhuanlan.zhihu.com/p/145191114

MLIR Python Bindings构建与测试框架 -- https://zhuanlan.zhihu.com/p/161216066

MLIR C API patch分析 - https://zhuanlan.zhihu.com/p/161772171

一些有趣的尝试
ONNX MLIR 端到端 LeNet 编译流程 -- https://zhuanlan.zhihu.com/p/349912488

使用MLIR完成一个端到端的流程 -- 工具链 - https://zhuanlan.zhihu.com/p/328559928

使用MLIR完成一个端到端的编译流程 -- 一条通路 - https://zhuanlan.zhihu.com/p/328993481

在蜂鸟FPGA评估板上运行MLIR GEMM -- https://zhuanlan.zhihu.com/p/272179056

MLIR 论文分析系列
MLIR 论文分享 -- 以摩尔定理失效为背景 -- https://zhuanlan.zhihu.com/p/110345711

MLIR 相关项目系列
MLIR + PlaidML 并行优化 -- https://zhuanlan.zhihu.com/p/139150163

MLIR + Xilinx AI 引擎 -- https://zhuanlan.zhihu.com/p/139773835

MLIR生态系列
CIRCT llhd-sim工具分析 -- https://zhuanlan.zhihu.com/p/227963934

MLIR贡献代码系列
从Phabricator拉取MLIR草稿代码 -- https://zhuanlan.zhihu.com/p/157554976

MLIR 视频报告系列
MLIR   python binding简介 -- https://www.bilibili.com/video/BV1s7411K7fp

MLIR Toy Tutorial概述 -- https://www.bilibili.com/video/BV1s7411K7rR

GSoC Proposal 分享 -- https://www.bilibili.com/video/BV1zQ4y1N7FG

在蜂鸟FPGA评估板上运行MLIR GEMM -- https://www.bilibili.com/video/BV17K4y1E7Hd/

[MLIR] 使用MLIR完成一个端到端的编译流程 -- https://www.bilibili.com/video/BV1Wp4y1z72d/

开源进展分享系列
2022-01 -- 法斯特豪斯：[2022-01] 开源进展分享 

进入主分支的Patch
Initial MLIR python bindings based on the C API. --  https://reviews.llvm.org/D85481

[mlir] Add Index Type, Floating Point Type and None Type subclasses to python bindings. -- https://reviews.llvm.org/D86466

[mlir] Add Complex Type, Vector Type and Tuple Type subclasses to python bindings. --

https://reviews.llvm.org/D86785 

[mlir] Add Shaped Type, Tensor Type and MemRef Type to python bindings. -- https://reviews.llvm.org/D87091

[mlir] expose affine map to C API -- https://reviews.llvm.org/D87617

[mlir] Add Float Attribute, Integer Attribute and Bool Attribute subclasses to python bindings. -- https://reviews.llvm.org/D88531

[mlir] Expose affine expression to C API -- https://reviews.llvm.org/D89856

编辑于 2022-01-28 13:41
MLIR

​赞同 430​​20 条评论​874 ​53 ​分享

​申请转载​​

未登录用户

20 条评论

默认
最新

龙云李

感谢大佬
2025-03-16

​回复​喜欢

炒粉程序员TriDu

​

2024-12-26

​回复​喜欢

何遇

楼主nb

2024-06-28

​回复​喜欢

Shijie XU

问下，这篇文章是你写的吗  Compiler Technologies in Deep Learning Co-Design: A Survey? 

2024-02-21

​回复​喜欢

法斯特豪斯

作者

嗯嗯是的
2024-02-22

​回复​喜欢

kaitoukito

太强辣

2024-01-23

​回复​喜欢

wong或许对了

太强了，教程分享还在更新吗

2023-06-01

​回复​喜欢

Zacon

感谢大佬，谢谢

2022-09-15

​回复​喜欢

何青泉

感谢大佬
2022-03-18

​回复​喜欢

今日青年

大哥太牛啦

2021-11-12

​回复​喜欢

joe

真🐂
2021-05-24

​回复​喜欢

点击查看全部评论

未登录用户

关于作者

法斯特豪斯
...

回答
11
文章
57
关注者
4,455

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

llvm-hs使用之初体验
parke...发表于雾雨魔法店

领取PLL观测器源码
转子磁场定向

怎么接入 CuTile IR：Triton-to-Tile-IR 转换学习
随着 CuTile IR 的出现，越来越多的 IR 需要与它进行对接。我们来从尝试接入CuTile IR的角度，先分别理解 TTIR 和 CuTile IR 各自的设计逻辑，然后拆解它们之间的转换是如何完成的。 TTIR …

孙钦华

T-SNE源码剖析(python版)
超爱学习