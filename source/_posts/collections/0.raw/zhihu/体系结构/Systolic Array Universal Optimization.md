---
title: "Systolic Array Universal Optimization"
date: "2025-06-08 00:00:00"
updated: "2025-06-08 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/Systolic-Array-Universal-Optimization/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1914806885644731957"
---


SA 的优化有几个大方向：

- SA 形状固定，如何映射形状各异的输入矩阵。（如 DW CONV）
- SA 的输入 buffer 如何消除。
- 如何支持多种数据精度。
- 如何支持稀疏。
- 如何增强对新兴算子的支持（Transformer）稀疏相关 SA 优化见 [龙云李：Sparse AI Accelerator(review)](https://zhuanlan.zhihu.com/p/1908533318879777525)

## 1. SIGMA

SA 在计算 <strong>Dense Regular</strong>的时候性能高，在 Dense Irregular 和 Sparse Irregular 的时候性能低。SIGMA 进行 <strong>PE 重排</strong>来提高效率。

![](https://pica.zhimg.com/v2-75208eb452349e83e60520ae79e0e2ae_r.jpg)SA 擅长 Dense RegularSIGMA 使用动态重组 DPE 的方式来避免 SA 不灵活的缺点。多个 DPE 可以共同构成一个 DPU，执行一个 GEMM 任务，而 SIGMA 可以动态构成多个 DPU 从而执行多个 GEMM 任务，通过 NoC 连接并路由。稀疏格式为 bitmap。可惜本文没有讲其 <strong>NoC 实现</strong>。

![](https://pic1.zhimg.com/v2-5c5b2e2046d8ef706156129b92ad05ea_r.jpg)动态 PE 重组和任务分配使用 <strong>Benes</strong>交换网络进行数据从 source 到乘法器的路由。Benes 是节点少，无阻塞，可多播广播的交换网络。

![](https://picx.zhimg.com/v2-af89932be670cde1706090bae7b340f7_r.jpg)Benes 交换网络这样的方式就导致一个问题：固定的满二叉树 Adder Tree 会造成功能错误，因此本文提出 <strong>FAN 拓扑的加法树</strong>。路由算法就是根据 vecid 决定是相加还是 bypass 而已。因此图中的加法器都兼具有路由功能。

![](https://pic1.zhimg.com/v2-3e856bd8168e777e5dc23ff0f0a285ae_r.jpg)FAN 拓扑及拓扑生成算法
## 2. AI-MT

AI-MT 指出在 SA 中，<strong>如果 SA 执行的是 CONV 运算，那么其访存资源(带宽)闲置</strong>。<strong>如果执行的是 FC 运算，那么其计算资源闲置</strong>。这由算子的<strong>访存密集型</strong>和<strong>计算密集型</strong>特性决定。因此 AI-MT 借用 CPU 中 <strong>Multi-task</strong> 的概念进行优化。虽然 AI-MT 面向 CNN，但在 LLM 特别是有 CONV 算子的 LLM 中同样有参考价值。

MB 为访存任务，CB 为计算任务。通过 <strong>tiling</strong>和多 <strong>layer</strong>交错执行可以同时利用<strong>访存资源</strong>和<strong>计算资源</strong>，缩短<strong>计算时间</strong>。

![](https://pic4.zhimg.com/v2-0b3aedcfdf5306ef95e695ab980e85bd_r.jpg)tiling 和 multi-layer不同 layer 的 CB MB 时间是<strong>编译时确定</strong>。AI-MT 利用<strong>记分牌</strong>负责调度。其存储块的管理使用的是<strong>硬件链表</strong>，这种技术在<strong>交换机</strong>中比较常见。

![](https://pic4.zhimg.com/v2-63d3857fd2e124ff6749467ece2d0941_r.jpg)
![](https://picx.zhimg.com/v2-ede60c7eef3bfc5a42a4cc471bcc5f6f_r.jpg)编译时确定 layer 的 MB 时间和 CB 时间
## 3. DiP


- 把 input/output sync fifo 优化掉。
- 使用 WS 数据流情况下 input 无需进行转置。缺点是在大SA情况下走线延迟更大

![](https://pica.zhimg.com/v2-f9c6435f090c5982284ef7562e0c5326_r.jpg)优化后的数据流
![](https://pic1.zhimg.com/v2-cbcd769eefb12a2df3e6479e6f632ed4_r.jpg)矩阵映射
## 4. BitFusion

针对于量化神经网络设计，支持 int2 int4 int8 int16，理论基础是可以通过设计多个 int2 乘法器，int4 int8 int16 的计算都可以通过 int2 的元计算和固定移位得到。

![](https://picx.zhimg.com/v2-7b77aa12d78aa0e78fffec7a436a412f_r.jpg)int2 动态组合实现高比特精度
![](https://pic4.zhimg.com/v2-e6f4526bf1e1118e68d91bbdcea1ce63_r.jpg)理论基础to be continued......