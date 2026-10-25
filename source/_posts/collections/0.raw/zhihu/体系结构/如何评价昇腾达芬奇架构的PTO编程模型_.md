---
title: 如何评价昇腾达芬奇架构的PTO编程模型?
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/如何评价昇腾达芬奇架构的PTO编程模型_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1971281425983583301/answer/1971362489791943364
---


BobHuang
​​
知势榜科技互联网领域成长力榜答主

​ 关注

谢邀 @yahah

目前其实是有一个在PTO上的PyPTO项目是开源的，我猜测PTO抽象可以类比为NVIDIA的PTX，把硬件指令再抽象一层方便用户，对编译器的职责进行进一步规范。

上图来自 基于 PyPTO 的 Lightning Indexer 和 Deepseek Indexer Attention 算子开发实践

PyPTO 这个项目产生感觉是很水到渠成的，其能够大大简化融合算子的开发。原因在于昇腾对graph模式积累很多，把一些graph模式的核心调度思想抽象到自定义算子进行调优并不难。

Parallel Tile Operation (PTO) Instruction （PTO 指令）是PyPTO的下层，开发者编写的程序都会转换为一组 PTO 指令。通过在不同硬件平台实现对应 PTO 指令，可自动完成算子的跨平台迁移，不再需要手动适配。

下表列举了一些 PTO 指令实例：

分类指令功能描述Element Op（逐元素操作）TADD执行两个 Tile 数据块内逐元素的加法运算......Tile-Scalar Op（块与标量操作）TADDS将标量与 Tile 数据块内逐元素相加......Axis Op（按轴操作）TROWSUM对 Tile 数据块的每一行执行求和......MATMUL Op（矩阵乘操作）MATMUL执行两个 Tile 矩阵数据块的乘法......Fix Pipe Op（固定管线操作）TMOV将 Tile 元素从源寄存器搬移到目的寄存器（可带随路运算）......MEM Op（访存操作）TLOAD将数据从内存加载到 Tile 数据块TSTORE将 Tile 数据块写回到内存......Complex Op（复杂操作）TCVT执行 Tile 数据块的类型转换......其粒度比描述硬件行为的PTX大，是Tile编程下的原语，可以等NVIDIA的cuTile发布后和Tile IR对比下。本质是算子编写来到了high level层级，更多的人可以用GPU编程了，当然能压榨性能的部署算子工程师需求量也很大。

其粒度比描述AI算子语义的Triton IR要小，PTO对硬件的抽象要比Triton IR更多一些，Triton IR上不会有寄存器抽象。感觉应该是为昇腾计算产品线的其他产品or未来产品准备的，能稳定一个编程模型对用户更友好。

等有更多信息我再更新

阅读全文​
​赞同 59​​1 条评论​54 ​1 ​分享