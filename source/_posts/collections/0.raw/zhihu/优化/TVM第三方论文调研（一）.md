---
title: TVM第三方论文调研（一）
date: "2022-10-21 00:00:00"
updated: "2022-10-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/TVM第三方论文调研(一)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/573512820
---


本系列收录对TVM编译器的第三方改进调研，涉及量化、稀疏、后端、算子优化、自动调优等方面。调研方法：在谷歌学术点击对TVM论文的引用，根据标题和摘要判断是否涉及对TVM的修改或增强。

### Support Convolution of CNN with Compression Sparse Matrix Multiplication Flow in TVM 

#### 论文信息

<strong>出处：</strong>  LIAO H-H, LEE C-L, LEE J-K, et al. Support Convolution of CNN with Compression Sparse Matrix Multiplication Flow in TVM[C]// 50th International Conference on Parallel Processing Workshop, Lemont IL USA: ACM, 2021: 1–7.

<strong>主题：</strong>稀疏

<strong>主要贡献：</strong>通过im2col plus GEMM的实现方式为TVM添加稀疏卷积的支持

<strong>Motivation：</strong>卷积实现的方式有多种：1）直接卷积计算；2）FFT，即快速傅里叶变换；3）im2col-based；4）Winograd-based。基于im2col和winograd的方法对稀疏的计算支持更好，但是winograd卷积会限制稀疏的密度，且需要在剪枝时对结构进行修改（Efficient Sparse-Winograd Convolutional Neural Networks，[http://arxiv.org/abs/1802.06367](https://link.zhihu.com/?target=http%3A//arxiv.org/abs/1802.06367)）。im2col卷积在剪枝时不需要考虑卷积的实现，限制较小。

#### 在TVM中支持稀疏卷积

<strong>转换流</strong>

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_2a64e7094166.jpg)

<strong>im2col的算子实现</strong>

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_b66858d584c6.jpg)

直接卷积![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_7f0ebc551bfc.jpg)

转换为im2col根据卷积的kernel size、padding、stride、dilation等计算im2col转换后矩阵的size

具体公式如下：
 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_42dad4680e8b.jpg)

模型的转换：

使用TVM中的<strong>ExprFunctor</strong>来转换整个relay图

使用一个<strong>visitor</strong>来发现和转换计算图：从conv2d到im2col with gemm

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_5f19d4fe0c11.jpg)

第一次转换，将conv2d转换为im2col

- <strong>第一次变换</strong>：
遍历整个图，发现属于conv2d的<strong>var</strong>节点，将<strong>weight</strong>变换为2d矩阵，并且将新的shape信息替换这个节点，同时记录weight名字到compress_list中。

若有call节点，将其替换为im2col、dense、reshape

变换后的原计算图和新计算图的区别如上图6

由于TVM的形状检查，因此在dense算子后插入reshape算子，恢复4维。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_269bb10a01c2.jpg)

第二次变换，转换存储格式<strong>2.第二次变换</strong>

将计算图传递至TVM已经存在的pass如<strong>DenseToSparseDense</strong>,在这一步dense算子会被转化为sparse_dense算子，是一个压缩存储的格式。在这一步需要<strong>离线选择</strong>使用的压缩存储格式


两次变换的算法伪代码如下：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_04d91cfa1c01.jpg)

#### 实验

在x86_64 Intel i7-9700K CPU进行的测试，模型来自SparseZoo**，提供ImageNet训练的CNN和使用distiller自训练模型。

正确率与稀疏率：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_02edfc6484b8.jpg)

加速比：为公平起见，均未启用任何优化和自动调优

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_aaa3eb9a94fd.jpg)

### Effificient Execution of Quantized Deep Learning Models: A Compiler Approach

#### 论文信息

<strong>出处</strong>：  JAIN A, BHATTACHARYA S, MASUDA M, et al. Efficient Execution of Quantized Deep Learning Models: A Compiler Approach[J]. arXiv, 2020.

<strong>主题</strong>：量化

<strong>主要贡献</strong>：为TVM开发支持导入预量化模型的框架

<strong>Motivation</strong>：直接在深度学习框架中进行量化部署存在诸多问题：1）缺少内核库对新增量化算子的支持；2）新增量化算子与其他算子的协同问题；3）不同硬件平台提供的加速指令不同。使用深度学习编译器对接框架与硬件后端，需要处理两个问题：1）在计算图级别，需要对这些新算子有新的规则；2）在张量级别，对于每一个平台可能需要新的计算或内核实现。

#### 量化神经网络方言

该文提出了量化神经网络方言（QNN dialect）

- QNN为计算图级别的高层次IR。在QNN中添加了新的算子，但未进行任何图级别或算子级别优化。而是将这些算子映射到已经定义好的图或算子级别优化。
- QNN量化算子表示比任何图级别算子的层次都高
- 可以定义新的QNN优化pass来转换图，使其适配特定硬件后端
设计与实现

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_715c0b0698b8.jpg)

<strong>流程</strong>：

- 添加新的QNN算子，描述其如何降低到一系列现存的Relay（计算图）算子
- QNN图级别优化：包括两个QNN pass

- QNN Legalize**合法化检查，包括量化上下文，是量化感知的IR，执行特定硬件转换（例如硬件指令是否支持该量化方式）
- QNN Canonicalize
规范化，将其转换为一系列Relay-only算子（由开发者提供）。该pass作为一个边界，之后不存在图级别量化上下文。
3.运行Relay优化，如死代码消除、图融合

<strong>QNN算子和框架解析器:</strong>

不需要添加新的IR表示，只需要将QNN算子映射到现存的Relay算子

<strong>对于不同的框架，相同名称的算子可能代表不同操作</strong>，因此需要对每个框架进行单独适配

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_574c1cbc310b.jpg)

<strong>QNN合法化pass：</strong>

带有量化上下文，执行特定硬件的图转换，满足硬件指令集提供的数据类型约束。

<strong>QNN规范化pass：</strong>

QNN规范化pass将QNN算子转化为由开发者定义的一系列relay算子，<strong>该pass作为一个边界，之后不存在图级别量化上下文。</strong>

<strong>相关代码已合并进TVM,在TVM文档中包含导入已量化好的代码教程（pytorch）。</strong>

### Extending Tensor Virtual Machine to Support Deep-Learning Accelerators with Convolution Cores

#### 论文信息

<strong>出处</strong>：  [WANG Y, XIE F. Extending Tensor Virtual Machine to Support Deep-Learning Accelerators with Convolution Cores[C]// 2022 26th International Conference on Engineering of Complex Computer Systems (ICECCS), Hiroshima, Japan: IEEE, 2022: 189–194.

<strong>主题</strong>：扩展后端

<strong>主要贡献</strong>：1）基于conv core的IR表示，在算子级优化和代码生成阶段；2）一个补充的算子依赖关系图，在高层次计算图阶段；3）一个特定加速器支持库，将基于conv-core的IR映射到加速器ISA，并完成代码生成。

<strong>Motivation</strong>：卷积计算的加速器架构的实现有基于GEMM的，有基于Conv core的。TVM当前支持将卷积变换为GEMM进行计算，这让基于Conv core的加速器无法受益于深度学习编译器的优化，该论文扩展了对Conv core的支持，使得TVM可以对接此类硬件后端。

#### 实现方法

<strong>基于conv-core的IR：</strong>

1.消除TVM IR和基于conv-core的加速器的指令集之间的不兼容性。当加速器是基于conv-core而不是GEMM core时，将计算图降低到该IR上。

2.对于优化所有的conv-core加速器提供适当地抽象.

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_043cac28583b.jpg)

使用该IR进行硬件无关优化：

- 消除推理阶段未使用的算子，如dropout
- 在编译时预计算算子，如reshape
- 拆分大的GlobalAvgPool到多个AvgPool（资源限制）
<strong>算子依赖信息：</strong>

原始TVM的基于GEMM的IR只捕捉数据依赖，没有算子依赖信息。本文添加了一个编译器pass，传递了所有的依赖信息。

<strong>算子支持库：</strong>

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_319b57827f83.jpg)

硬件相关优化：

- 编译时融合ALU算子
- 融合相邻的SDP算子
- 消除额外conv core的访存

### 相关阅读

[守夜人：AI编译器中常见CPU运行优化--以TVM为例](https://zhuanlan.zhihu.com/p/570814540)

[守夜人：VTA专题内容（一）：VTA（Versatile Tensor Accelerator）介绍](https://zhuanlan.zhihu.com/p/572468377)

[守夜人：VTA专题内容（二） 第三方改进调研](https://zhuanlan.zhihu.com/p/572522290)

[守夜人：基于HLS（High-level synthesis）的开源CNN加速库调研](https://zhuanlan.zhihu.com/p/569488705)
