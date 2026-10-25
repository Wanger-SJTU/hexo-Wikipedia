---
title: 大模型AI Infra方向面试会有哪些经常提问的问题？
date: "2026-02-26 00:00:00"
updated: "2026-02-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/大模型AI-Infra方向面试会有哪些经常提问的问题/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1916645420085514580/answer/2010266450347184947
---


最近三年在ai infer方向面试过上百人，也绞尽脑汁整理过一些知识点，这里从大模型推理方向给出一些面试知识点，希望能够给准备入行的同学一些帮助。

（清晨两小时，纯手机手敲，后续补充常见面试问题。）

（更新了一小部分面试题，难以一一列举，很多人问，难道都要了解？

我把分为四个职业方向，侧重要了解以不同知识模块

- 算子优化工程师：“计算机基础，CUDA编程，算子及算子优化”相关知识。

- 通信优化工程师：“计算机基础，算子及算子优化”相关知识，另外还有网络，集群相关知识。

- 模型优化工程师：“计算机基础，常见模型，模型推理”相关知识。

- 框架开发工程师：“计算机基础，常见模型，模型推理，推理框架”相关知识。）

计算机基础
<strong>主要知识点：</strong>

- C/C++：运行时多态，函数与类模板，函数重载，内存泄露的场景，内存的栈/堆/静态存储区，inline函数与宏，常见关键字（static/const/explicit），智能指针，STL相关（vector/map），Lambda表达式，常见模式设计（模板模式，单例模式）。

- 数据结构：栈，队列，常见排序算法，二叉树，链表（环形，反转，合并，相交），图，哈希。

- 操作系统与硬件相关：线程与进程相关（线程安全，线程共享，锁，信号量，条件变量，OpenMP使用），内存的页管理，调度算法，流水线原理，Cache机制，中断等。<strong>比如常见面试题：</strong>

- 虚函数表和虚函数指针的作用？

- 为什么会在多态中将析构函数设置为虚函数？

- C/C++ 中常见的内存泄漏场景有哪些？

- 循环引用为什么会导致内存泄漏？

- 函数中局部变量是堆内存还是栈内存上？

- inline函数与宏的区别。

- static关键字结合单例模型提问，比如单例模式中static关键字起到什么作用，如何使用？

- stl中像vector如何扩容，map与unordered_map各自用什么数据结构表达。

- 栈与队列的考察常常来源于leetcode，比如如何用栈实现队列功能。

- 排序算法中，快排的实现思路，为什么他的时间复杂度是O (nlogn)。

- 二叉树的前序 / 中序 / 后序遍历，如何使用递归或者非递归实现。

- 比如进程与线程中资源问题，哪些是线程独有，哪些线程共享，以及两者区别。

- 互斥锁 mutex 的作用，死锁的 4 个必要条件？

- 自旋锁 spinlock 与互斥锁区别，有哪些使用场景。

- Cache机制的作用是什么，为什么会快，有哪些映射方式，Cache一致性问题是什么？太多了，很多与AI部署的原理相关，也有很多与HPC相关。

现代AI Infer系统级优化，软硬协同优化思想都离不开这些基础知识作为依托。

比如vLLM中Paged Attention优化方法来源于操作系统页管理思想。

比如SGLang中的HiCache的KVCache缓存策略的思想来源CPU上L1,L2,L3的Cache机制。

无论是机器学习时代，CNN时代，还LLM时代，AI落地的工程化核心思想都来源于计算机基础。

CUDA优化
<strong>比如常见面试题：</strong>

- shared memory的优化原理，与使用场景。

- 线程洗牌（shuffle）的使用场景。

- thread/block/grid的关系。

- 几个内存关系：global/constant/texture memory。

- 同步，流，以及事件的使用。

- bank冲突，以及如何优化。
算子及算子优化
<strong>比如常见面试题：</strong>

- flash attention的实现原理，flash-attention-v1/v2以及flash-decoding的区别

- ffn模块的主要流程，比如silu激活函数，为什么ffn中要升维再降维等。

- moe模块的主要流程，比如，router模块为什么以token为单位选择路由专家。

- rope的计算逻辑，以及各类长文本扩展方案，比如sliding window，Yarn，DynamicNTK等。

- Sample的主要算法：topK，topP，beam search，argmax，温度的作用。
通信相关
<strong>比如常见面试题：</strong>

- 常见通信原语：比如all2all，allreduce，allgather等的作用与流程上的区别。

- allreduce优化：ring allreduce，tree allreduce，reduce scatter等区别，以及使用场景。

- ep并行方案中的通信：dispatch与combine的实现逻辑，以及如何优化。

- 通信库的使用：MPI，NCCL，NIXL，还有Ray分布式框架，比如使用上的一些经验。
常见模型
<strong>比如常见面试题：</strong>

- mha/mqa/gqa/mla的区别，其中mla是mha的低秩，mla的attentio可以转成mqa。

- 比如deepseek模型：flashmla的实现流程，deepep的实现流程，MTP采样如何实现。

- 比如最新qwen模型：linear attention的基本流程，与self-attention区别，如何优化。

- 了解模型主要参数：比如多少layer，多少个路由专家，head num，head dim等。

- 另外一些经典模型：llama，mixtral-8x7B，mistral，gemma，phi等的模型特点。
模型推理
<strong>比如常见面试题：</strong>

- 模型并行：tp/ep/pp/sp并行，比如megatron-lm论文中gqa的attention如何实现。

- attention系统级优化：ring attention，paged attention等基本流程，核心思想。

- kvcache优化：为什么不cache Q，kvcache大小计算，tp/pp并行下的kvcache分布等。

- 模型轻量化方法：awq，smoothquant，gptq，spin quant，sloth等量化方法的思想。

- 底层优化库或编程模型：flash infer，triton，tilelang。
大模型推理框架
<strong>主要知识点：</strong>

- 调度优化：continous batching，chunked Prefill，radix attention，prefix cache，kvcache offload等。

- 系统集优化：pd分离，负载均衡，投机采样，异步调度。

- 框架本身一些概念：算子融合，显存复用，模型权重切分，基于pytorch的图表达等。

- vllm框架与sglang框架的代码，比如他们的调度器如何实现，prefix cache实现上的区别等。<strong>常见面试题：</strong>

- continous batching与传统的静态批处理的区别，他解决的是什么问题。

- Chunked Prefill的原理是什么，解决是推理中的什么痛点问题，有哪些缺点。

- Radix Attention在什么场景下能大幅度提升推理效率？

- kvcache优化的作用，Prefill阶段与Decode阶段有哪些差异。

- pd分离中负载均衡有哪些策略，如何避免负载倾斜出现 。

- pd分离中kvcache传输有哪些优化手段？

- 投机采样的核心原理是什么，为什么能提升推理速度。

- 模型权重在TP/EP/PP不同分布式方案下如何切分？<strong>以了解概念为主，经典的技术像paged attention，flash attention，tp并行了解原始论文，了解开源框架具体实现，多实践多调试。</strong>