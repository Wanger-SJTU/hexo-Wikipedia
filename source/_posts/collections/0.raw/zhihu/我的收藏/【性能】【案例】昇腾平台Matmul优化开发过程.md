---
title: 【性能】【案例】昇腾平台Matmul优化开发过程
date: "2025-12-31 00:00:00"
updated: "2025-12-31 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/【性能】【案例】昇腾平台Matmul优化开发过程/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1989667615744995635
---


### 背景

### 通用矩阵乘简介

<strong>通用矩阵乘</strong>（General Matrix Multiplication，GEMM）运算最初是<strong>基本线性代数子程序</strong>（Basic Linear Algebra Subprogram，BLAS）库中的一个函数，用于实现矩阵与矩阵之间的乘法。在过去的数十年中，通用矩阵乘在图像处理，流体动力学和航空航天等诸多科学计算领域扮演着至关重要的角色。随着深度学习和大语言模型的兴起，通用矩阵乘也广泛的应用于计算机视觉和自然语言处理等领域。因此，通用矩阵乘算法的性能优化是高性能计算领域一个重要课题。业界常用的计算公式如下：

 D = \textrm{op(}A) \times \textrm{op(}B) + \textrm{op(}C) 

其中，\rm op(X) = X 或 XT\rm X^T。


### 昇腾910B平台简介

昇腾910B平台的矩阵计算单元（CUBE）和矢量计算单元（VECTOR）分离，只能通过GM进行数据交换。在910B平台上，我们称一个CUBE和两个VECTOR组成了一个GROUP，不同型号的910B包含20 ~ 24个不等的GROUP。

### 背景

#### 通用矩阵乘简介

通用矩阵乘<strong>（General Matrix Multiplication，GEMM）运算最初是</strong>基本线性代数子程序**（Basic Linear Algebra Subprogram，BLAS）库中的一个函数，用于实现矩阵与矩阵之间的乘法。在过去的数十年中，通用矩阵乘在图像处理，流体动力学和航空航天等诸多科学计算领域扮演着至关重要的角色。随着深度学习和大语言模型的兴起，通用矩阵乘也广泛的应用于计算机视觉和自然语言处理等领域。因此，通用矩阵乘算法的性能优化是高性能计算领域一个重要课题。业界常用的计算公式如下：

 D = \textrm{op(}A) \times \textrm{op(}B) + \textrm{op(}C) 

其中，\rm op(X) = X 或 \rm X^T。


#### 昇腾910B平台简介

昇腾910B平台的矩阵计算单元（CUBE）和矢量计算单元（VECTOR）分离，只能通过GM进行数据交换。在910B平台上，我们称一个CUBE和两个VECTOR组成了一个GROUP，不同型号的910B包含20 ~ 24个不等的GROUP。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a99908bd2b63.jpg)

### 方案设计

#### 分核方案

基于Ascend平台实现的矩阵乘算子将输出矩阵切分成若干个大小为 \tt Mtile \times Ntile 基本块（tile）。每个输出的基本块被分配到AICORE上并行计算。此外，我们将M（N）维度无法被 \tt Mtile（\tt Ntile）整除的场景下，大小不足 \tt Mtile \times Ntile 的基本块称之为尾块。AICORE在计算尾块时需要按照其真实大小进行处理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_186819da582c.jpg)

#### 核函数设计

上述分核方案将输出C矩阵切分并分配给每个AICORE进行计算。AICORE以 \tt Ktile 为步长在K方向迭代，通过计算并累加若干个规模为 \tt Mtile \times Ktile \times Ntile 的矩阵乘积，得到最终结果。

```cpp
// execute on each AICORE
for (int l = coreIdx; l 
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_14f56c571695.jpg)

在实现中，AICORE为了完成一次规模为 \tt Mtile \times Ktile \times Ntile 的矩阵乘计算，会对 A，B 矩阵以\tt Kfrag为步长，在K方向进一步切分：

```cpp
for (int kt = 0; kt 
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d56015c987c8.jpg)

### 性能建模

昇腾MindStudio工具链提供了一套算子性能建模工具（[msKPP](https://link.zhihu.com/?target=https%3A//www.hiascend.com/document/detail/zh/canncommercial/83RC1/devaids/optool/atlasopdev_16_0006.html)）。用户基于它提供的DSL简单描述算子的行为，msKPP即可给出一个理想的算子耗时。用来帮助用户快速找到较优的实现方案。因此，实现矩阵乘算子前，我们可以先利用msKPP工具简单评估该方案的可行性和理论性能。以\tt M=1024，\tt K=1024，\tt N=1024 场景为例。令 \tt Mtile = 128，\tt Ktile = 256，\tt Ntile = 256，性能建模结果如图所示（共启用24个AICORE）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_29cadb03a435.jpg)

### 性能迭代

#### 流水优化：Preload技巧

在算子开发完成后，我们可以利用msprof工具对算子的性能进行评估。以上述场景为例，msprof工具提供的profiling数据显示各流水线占比如下表所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0500bf8921fe.jpg)

根据上表可知，在该场景算子性能瓶颈在于MTE2流水线。此外，由于后续流水线依赖于MTE2流水线，为了防止后续流水线等待时间过长，且能被MTE2流水线掩盖，需要在L1 Buufer和L0 Buffer 上都进行Double Buffer设计。

在实现Double Buffer后再使用msprof op simulator工具进行仿真，可得到如下仿真波形图。 AIC #0 仿真波形图

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_764dffceb925.jpg)

<strong>AIC #8 仿真波形图</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_99cc32960e2e.jpg)

观察仿真波形图可以发现，在使用Double Buffer后，虽然MTE2流水线能掩盖大部分其他流水线，但是MTE2流水线并不连续。经实验发现，Mmad指令会阻塞下一次的MTE2指令发射，因此需要对原有代码进行指令重排来实现指令预发射的动作。

```cpp
for (int mt = 0; mt 
```


如下图所示，在实现上述优化点后，MTE2流水线连续。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_988f3ba93a4d.jpg)

#### 带宽优化：Swizzle

对于MTE2 bound算子，当MTE2流水连续后，我们认为进一步的优化点在于减少MTE2流水的耗时。此外，我们知道AICORE通过MTE2读取GM内存时需要经过L2 cache。借助msprof op工具，我们可以采集到L2 cache的相关数据。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_11c81eab3f8f.jpg)

在批量性能测试中，我们发现随着N维度的增加，L2 cache命中率显著下降，执行时间也随之增加。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a215f682c75.jpg)

经过分析，上述问题的原因是L2 Cache的大小有限，随着矩阵乘问题规模的增长，多核并行载入的数据量逐渐超过了L2 Cache的大小，因此产生了缓存不命中的现象。即所谓的 capacity miss。

针对上述问题，我们在原有分核策略的基础上，调整了基本块和AICORE的映射关系（绑核策略）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_73fbaf89840d.jpg)

优化后的L2 Cache命中率和MTE2带宽如下图所示

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1deded3838c5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cdd80ac6fa92.jpg)

#### 带宽优化：MixPadding

借助msprof工具提供的profiling数据，结合算子的tiling策略。我们可以通过如下公式估算算子的MTE2带宽：

 $$BW = \frac{(Mtile \times Ktile + Ktile \times Ntile)\times Kloop\times Mloop\times Nloop}{mte2\_ratio \times task\_duration} $$

其中，Mloop，Kloop和Nloop分别是对应方向上基本块的个数。

根据上述公式，以M=800，K=5120，N=60000的case为例，我们发现L2Cache命中率提升的同时，MTE2搬运时间过长，尝试在N附近的点进行取值测试，发现N=60160时实际MTE2耗时为N=60000的一半，整算子耗时降低；进一步实验发现MTE2的时间膨胀在ND2NZ随路指令的开销。

如果减小甚至消除ND2NZ随路指令带来的开销，需要我们对输入数据做padding的处理，并且我们统一向512Byte对齐，我们在当前matmul算子前插入了一个Mix的Vector部分来对输入数据进行Padding如图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_55e32763fec7.jpg)