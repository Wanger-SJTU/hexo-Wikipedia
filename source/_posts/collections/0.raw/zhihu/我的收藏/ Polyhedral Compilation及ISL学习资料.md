---
title: (1 条消息) Polyhedral Compilation及ISL学习资料
date: "2021-07-01 00:00:00"
updated: "2021-07-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Polyhedral-Compilation及ISL学习资料/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/385722777
---


### <strong>Polyhedral Compilation及ISL学习资料</strong>

Polyhedral Compilation：多面体编译

ISL：一个用于操作由线性约束条件约束的整数点的集合和关系的库。主要作为实现Polyhedral Compilation的数学工具库。

### <strong>官方资料</strong>

Integer Set Library: Manual ISL官方使用手册。包含C++端详细的API/函数介绍，实现细节，应用例子等。由于实在太长不建议新手上来直接看，可以更多的作为入门后的工具书。

islpy’s documentation ISL在python端的官方文档。包含简单的介绍和类及函数列表。

Presburger Formulas and Polyhedral Compilation 完整介绍了关于集合，关系的基础数学知识，以及多面体编译中是如何用这些数学工具来实现相关功能的。同时搭配实际例子和各种运算在ISL中对应的API，强烈推荐。

polyhedral.info 提供关于多面体编译社区的信息，包括最新的发展以及现有工作的概述。资料非常丰富，可以慢慢看

isl: An Integer Set Library for the Polyhedral Model 对ISL的简单介绍，入门者可看

barvinok: User Guide barvinok这个库的使用手册。可以只看第一章isl interface。

Polyhedral Compilation and Counting 介绍如何做Polyhedral相关的counting。例如计算代码中一个instance（语句）运行的次数，或某个array element被写/读的次数，或被写的array elements的个数等。

Polyhedral Parallel Code Generation for CUDA 介绍PPCG：一个使用ISL和Polyhedral Compilation，通过分析，分配并行性将C代码转化为高性能CUDA代码的项目

Schedule Trees Schedule Trees 介绍Schedule Trees：将代码的schedule(调度)用树的形式表示

ISL GoogleGroup ISL社区，有不懂的可以在上面提问讨论，Sven大佬会经常回复，非常推荐！

### <strong>Demo与测试</strong>

ISL Playground in Python 在线playground，可以在这里上手python端的ISL。另外强烈推荐此网站中的Examples，新手最好都过一遍，对理解和上手ISL和Polyheral Compilation非常有帮助。

### <strong>中文社区资料</strong>

Polyhedral编译调度算法(1,2,3) 知乎@要术甲杰大佬的文章，对具体算法原理感兴趣的话强烈推荐

[编译器领域的多面体模型（Polyhderal Model）](https://zhuanlan.zhihu.com/p/310142893) 知乎@立交桥跳水冠军 的文章，对上面文章的很好补充

[Polyhedral Model—AI芯片软硬件优化利器（一，二，三）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDQ2MjA3OA%3D%3D%26mid%3D2247485130%26idx%3D1%26sn%3Da5773bf17e6854d1238b035366641bcc%26chksm%3Dead1fbdbdda672cdf9b2480a431cef85e4d377d07f8c586a932adabd50656cbdcd7d891156bf%26mpshare%3D1%26scene%3D1%26srcid%3D%26sharer_sharetime%3D1569677798809%26sharer_shareid%3Db33ef36fa0caf5cb82e76916516aa7df%23rd) @要术甲杰在公众号上的文章，对Polyhedral Model在工程上的应用感兴趣的话强烈推荐

ISL使用方法 csdn上 @wangbowj123 的文章，介绍了一些ISL中简单的类和函数。

多面体编译基础(一) ， (二)  csdn上 @BEN_csdn_XJTU 的文章，对多面体编译和涉及到的数学概念进行了简单的介绍，适合入门者
