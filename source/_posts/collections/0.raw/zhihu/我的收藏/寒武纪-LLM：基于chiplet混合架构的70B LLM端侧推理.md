---
title: "(2 条消息) 寒武纪-LLM：基于chiplet混合架构的70B LLM端侧推理"
date: "2025-08-17 00:00:00"
updated: "2025-08-17 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/寒武纪-LLM-基于chiplet混合架构的70B-LLM端侧推理/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1940510069310621270"
---


看一下寒武纪针对端侧设备推理提出的基于Chiplet的混合架构设计，融合了传统NPU和Flash存内计算（利用Flash高存储密度的特性），使得可以在端侧设备可以低成本的支持70B LLM。

具体是发表在2024 MICRO上的《Cambricon-LLM: A Chiplet-Based Hybrid Architecture for On-Device Inference of 70B LLM》。

### 摘要

在智能手机和机器人等边缘设备部署先进大语言模型是一个日益增长的趋势，可以增强用户数据隐私保护。然而，这类任务通常表现为单batch计算，其计算强度很低，从而对端侧设备的内存容量和带宽提出了更高的要求。

为了解决这些问题，引入了基于chiplet的混合架构Cambricon-LLM，包含NPU和专用的NAND flash chip，可以实现70B LLM的高效推理。该架构可以利用NPU的高计算能力和NAND flash的高容量，并使用硬件tiling策略来尽可能减少两者之间的数据移动。NAND flash芯片包含了in-flash计算能力和on-die ECC技术，擅长执行轻量级计算。NPU则与flash chip协同执行矩阵运算，并处理特殊函数运算（flash die不支持）。

总的，Cambricon-LLM能够以70B LLM 3.44 token/s和7B LLM 36.34 tokens/s的速度推理，比现有的flash卸载技术快22-45倍。

### 1. 介绍

端侧推理通常是单batch计算，所以无法利用batch间并行，这加剧了内存带宽瓶颈，主要挑战包括：

- 需要在端侧有限资源中占据大量内存

- 大模型大参数量过大，甚至超过手机本身的DRAM容量
- 大量的参数不可避免的会导致大量的数据搬运，从而导致功耗增加

- 单batch的特性导致计算强度极低，从而需要大量带宽

- 单batch下使得该程序为memory-bound，如下图1(a)展示了算数强度信息，可以看到单batch INT8量化下的LLM计算强度只有2，远低于其他AI算法像DLRM/BERT/VGG
- 并且比典型硬件发挥算力所需计算强度低100倍以上，这会导致硬件利用率极低

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_25b271dc6fd7.jpg)

为了解决以上问题，有一些研究试图将参数放置到基于flash的SSD中，但是现有的硬件存在两个问题：

- flash的带宽很低
- 传统硬件不支持直接从flash中读写数据，必须先经过DRAM
为此，ISC(in-storage computing)称为一个潜在的解决方案，可以利用flash内隐含的并行性。

定义Reduction ratio为输入数据大小除以输出数据大小，在典型的Llama2-7B中，最小的矩阵乘是4095*4095，则，那么此时的Reduction ratio为4096，要元大于传统的算法，如图1(b)所示。

总的，为了解决以上所以问题，该论文提出一种基于chiplet的架构。

- 一个专用的Flash cip和NPU通过D2D直接连接

- 可以高效利用Flash的大容量和NPU的计算能力，同时优化tiling最小化两者之间的传输
- 解决了传统Flash受限于UFS4.0带宽的问题，并实现更低延时访问
- NPU可直接访问Flash而无需经DRAM中转

- Flash chip具有计算能力，从而可以充分利用内部带宽（变相增加带宽，因为无法处理计算强度低的问题）
- 针对ISC架构中flash频繁错误问题，提出了一种超轻量级的on-die ECC来保护模型权重，进而保证LLM推理的准确性。
文章的主要贡献包括：

- 提出了Cambricon-LLM，结合了NPU和flash的混合架构；
- 介绍了硬件感知的tiling技术，在NPU和Flash之间最优的分配LLM推理负载，以充分利用可用资源；
- 提出一个高效的on-die ECC算法和一个轻量级硬件实现，可以高效处理flash的高错误里，保证模型的准确性；
- 使用SSDsim仿真器评估了各种配置，可以比baseline加速22倍以上。

### 2.背景

#### 2.1 LLM推理

目前主流LLM包括很多层，每一层都是Transformer的decode阶段，且这些模型具有自回归特性，即每个输入token生成下一个token，并再次输入，同时为了减少这个过程的冗余计算，所以会存储之前计算得到的key和value，称之为KVCache。 KVCache大小与batch和seqlen有关，在端侧推理中，seqlen=1，70B LLM所需KVCache所需容量约700MB，这是的端侧推理称为可能。

LLM的推理过程包括2个phase：

- prefill

- 基于用户的m个输入token，生成第一个新的token x_{m+1}；
- 计算初始m个token对应的key和value并存储在DRAM中；
- 所有初始token值是已知的，它们之间可以并行计算，一定成都减少内存瓶颈。

- decode

- 顺序产生新的token，前边的token会存储在KVCache，不需要重复计算；
- 尽管每个token的生成只需要极低计算量，但需要将整个weight搬运到片上，所以会存在显著的内存瓶颈；
- Llama-70B INT8量化上，1个token生成需要0.14T操作，但需要70GB的内存访问

#### 2.2 基于Flash的ISC

Flash是一种高密度、非易失性存储介质，可为手机提供超过1TB的存储容量。下图2展示了其主要架构，Flash内部会有多个独立channel，每个channel连接到相应地ECC模块和Flash控制器。每个独立的channel都配备了几个chip共享带宽，其结构从上往下包括：channel、chip、die、plane、block、page。每个page的大小为4/8/16KB，每个plane包含2个相同大小的寄存器用于数据缓冲。具体的：

- 读操作在page层面执行；
- 写操作在block级别执行，写操作所需时间比读长1-2个数量级。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f862e289a1cb.jpg)

为了克服flash的带宽瓶颈，ISC技术有两种实现方式：

- On-controller computing

- 将计算集成在controller，可以利用慢channel的带宽

- On-die computing

- 在die上增加计算单元，减少跨channel传输的数据量
- 可以最大限度的将不同chip/die/plane的并行带宽暴露给计算单元
- 然而有限的die面积会限制计算单元的复杂度，并导致外部的ECC失效

### 3. 动机

#### 3.1 单batch LLM推理的低计算强度

计算强度为算法计算量与访存量之比，单batch INT8量化表现出的计算强度约为2，非常之低。 下图3(a)显示了不同模型的计算强度，此时decode阶段的算数强度仅为2，比prefill和其他模型低几个数量级。为了解决该问题，Cambricon-LLM利用on-die处理来最小化数据传输量，将roofline从A点挪到B点。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c8bc9208e19a.jpg)

#### 3.2 为什么是Flash

考虑到大模型参数，Flash的高存储密度可以为LLM推理提供高存储空间。如下表所示，Flash的存储密度远高于DRAM，这使得Flash称为在端侧空间受限约束下存储大模型的首选。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a8687daa7d80.jpg)

而Flash的2个主要缺点：

- 写操作设计编程和擦除，要比读操作慢的多。

- LLM推理应用下，并不需要写weight

- 存储在NAND flash内存阵列中的数据需要以page为粒度写入到数据寄存器，所以如果只读一部分数据则会导致性能下降

- 同样LLM推理下的weight读取是连续的，该缺点影响较小

#### 3.3 ECC纠错的必要性

Flash的高错误率，主要是因为电子从浮栅场效应管的泄露，会导致存储信息的变化。为了解决这些问题，SSD控制器中设计了复杂的纠错逻辑，如LDPC(Low-Density Parity-Check)。通常，这类纠错的开销比较多，导致无法集成在die内，从而导致die内计算的错误问题。

上图3(b)展示了不同错误率下的LLM准确性，可以看到不同错误率会导致其准确性变化超70%，所以需要保证足够的精度。

### 4. Cambricon-LLM架构

#### 4.1 概述

下图4(a)展示了整个Cambricon-LLM的架构，包括NPU和Flash：

- Flash具有on-die计算能力，并通过D2D与NPU相连；
- NPU上集成了Flash控制器，可以与Flash直接通信
- Flash和NPU上都包含PE计算单元
- NPU上专有SFU，用于执行LLM所需的特殊计算，如softmax等
 具体在LLM的单batch推理过程中：

- 大量不变的weight存储在Flash中
- 相对脚下且经常更新的KVCache分配到DRAM
为了适配LLM的计算并分配到不同的硬件组件，将其运算分为了3组，如图5：

- 所以GEMV运算由NPU和Flash协同完成；

- Flash上PE距离weight更近，可以利用Flash内部并行性；
- 同时使用NPU来避免flash channel的利用率过低；

- 涉及KVCache的运算只使用NPU

- 因为KVCache存储在DRAM中

- 涉及加载KVCache的操作由NPU和DRAM一同完成

- 因为需要DRAM的参与

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_842b9810107a.jpg)

#### 4.2 Flash die的设计

为了给Flash die增加计算能力，其每个die上都包含一个新的共享计算核和2个额外的控制逻辑(Compute control和Slice control)，该计算核一次只能由1个Plane独占。

具体的：

- Compute core中包含了多个计算单元、buffer以及纠错模块。
- Compute control控制计算核执行更加灵活的GEMV运算
- Slice control可以讲整个读请求分割成更小的Slice，避免连续占用通道阻塞后续请求
另外为了更好地支持on-die计算，提出了一种新的read-compute指令，具体流程未：

- input vector通过Flash channel发送到每个计算核并存储在input buffer；
- 存储在Flash阵列中的weight被读取到数据寄存器；
- weight矩阵从data register转移到cache register，以进一步计算，并pipe起来；
- 计算核执行计算，并将结果输出到output buffer；
- 计算结果通过Flash channel发往NPU。

#### 4.3 Slice Control的设计

Slice Control的引入是为了最大化Flash channel的利用率，核心目标是在处理read-Compute请求计算同时，可以正常读取其他空闲Plane中的weight。解决方案是将page大小的read请求切分为更小的slice，在channel处于bubble的时候按Slice粒度传输读请求，以尽可能提高channel利用率。

具体的，假设1个channel连接1个chip，1个die包含个plane并共享1和compute core，下图6展示了3种Slice control策略下的流水线

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5831a7e13b2c.jpg)

### 5. 硬件感知tiling

为了更好的利用Flash和NPU算力，使用硬件感知的tiling技术来更好的将分配GEMV负载。包括2个步骤：

- 确定与Flash规格所匹配的最优的shape；
- 确定最优的负载分配，以平衡NPU和Flash算力。

#### 5.1 确定最优的shape

如图7(a)所示，整个权重矩阵会被切分为更小的tile，每个tile由flash中的所有计算核协同完成，对应单个Read-Compute指令。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_250adf55410e.jpg)

以简单的2channel Flash设计为例（每个channel对应4个计算core）。为了充分利用计算资源，每个tile会被均匀地分布到所有8个计算和，每个处理1个atomic tile。

之后可以建立关系式：

 $Trans =W_{\text {req }}+ channel_{\text {num }} \times H_{\text {req }}. $

 $H_{\mathrm{req}} \times W_{\mathrm{req}}=\text { channel }_{n u m} \times \text { ccore }_{n u m} \times \text { pagesize } . $

 $根据(b)(c)两种方式得到的最小传输量分别为  \begin{aligned} \min \{\text { Trans }\} & =2 \times \sqrt{W_{\text {req }} \times H_{\text {req }} \times \text { channel }_{\text {num }}} \\ & =2 \times \text { channel }_{\text {num }} \times \sqrt{\text { ccore }_{\text {num }} \times \text { pagesize }} . \end{aligned}  \min \{\text { Trans }\} = 2 \times \sqrt{W_{\mathrm{req}} \times H_{\mathrm{req}} \times \text { channel }_{\mathrm{num}} \times \text { ccore }_{\mathrm{num}}},  $

$可以看到(b)方式更好，进而得到shape的计算公式：  \begin{aligned} H_{\text {req }} * & =\sqrt{\text { ccore }_{\text {num }}} * \text { pagesize } \\ W_{\text {req }} * & =\text { channel }_{\text {num }} * \sqrt{\text { ccore }_{\text {num }}} * \text { pagesize. } \end{aligned} $

#### 5.2 确定最优的负载分配比例

Flash上的执行时间主要取决于read-compute请求，NPU上的执行时间主要取决于数据传输时间(read请求)。所以需要很好的评估两者时间。

对于read-compute请求来说，其延时包括通过flash channel的input数据传输时间和从flash 阵列中的读操作延时：

 $$t_{r c}=t_R+\frac{W_{r e q}}{\text { channel }_{n u m} \times \text { bw }_{\text {channel }}} .  $$

对于read请求来说，先计算channel带宽利用率：

 $$\text { rate }_{r c}=\frac{H_{r e q}+\frac{W_{r e q}}{\text { channel }_{n u m}}}{t_R \times \text { bw }_{\text {channel }}} .  $$

进而得到read请求延时：

 $$t_r=\frac{\text { pagesize }}{\left(1-\text { rate }_{r c}\right) \times \text { bw }_{\text {channel }}} . $$

那么当两者时间相等时，整个负载的分配达到最优。

### 6. 纠错机制

观察到在模型参数超过7B时，模型准确性只受到一小部分异常值的影响，而这些异常值仅占总参数的0.1%以下，且这些值具有更大的绝对量级。为此，开发了一种硬件友好的ECC实现on-die纠错。该值被存储在一片专门的flash空间中，每16KB占用1664B。

具体的，在这个page中识别出前1%最大值，然后在其对应位置存储ECC(包括其位置和副本数N)进行保护，在推理过程中对其进行译码并纠错。举例一个异常值为64(0b’0100 0000)，且记录的N=2，那么读取另外两个副本值分别为0110 0000, 0100 0000, 和 0100 0000，那么则投票来实现“少数服从多数”。

具体的ECC硬件结构如下图8所示：

- 为了不影响其他正常值，还存储前1%分界线作为阈值，译码时，如果有任何未标记的值超过阈值，则将其归零；
- 对于每个被保护的值，其地址和数据的两个副本一起存储，其中每个地址都配有5-bit私有的纠错码；
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6951079a29c1.jpg)

### 7. 试验设置

#### 7.1 硬件配置

将Cambricon-LLM和2个主流的LLM推理框架Flexgen和MLC-LLM进行了比较。

3者的试验配置如下表2所示，其中Cambricon-LLM使用SSDsim模拟Flash，额外的C代码模拟NPU。Flexgen则部署在服务器上。MLC-LLM部署在手机上。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_27b6135bf68a.jpg)

#### 7.2 基准

使用的LLM模型参数从6.7B到70B不等。

#### 7.3 面积和功耗评估

使用verilog开发了Cambricon-LLM，并基于TSMC 65nm进行了DC综合，结果如表4所示，其主要开销是buffer。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_08c88360ddec.jpg)

### 8. 试验结果

#### 8.1 端到端性能

下图9(a)展示了不同参数下的decode速度对比，可以看到其性能远高于baseline，即使在在2chip下也可以和Flexgen-DRAM达到类似性能。

图(b)中MLC-LLM将所有权重放在DRAM中，所以最多只能支持7B参数。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a42689d8fffa.jpg)

#### 8.2 4-bit量化下的性能

使用4-bit用于量化weight，16-bit用于量化激活(W4A16)。下图11则展示了其与W8A8之间的性能差异，在S/L配置上平均可以获得85.3%和47.9%的性能提升。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_63722efd8b53.jpg)

#### 8.3 消融实验

用以分析读请求slicing和硬件感知tiling分别带来的性能提升。

消融slicing技术之后在S配置下的结果如下图12所示，表示其可以提高1.6~1.8倍的性能，带宽利用率提高了31.6~41.4%。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e63bc7d2045e.jpg)

消融tiling技术之后的在S配置下的结果如下图14所示，结果表明tiling可以提高推理速度1.3~1.4倍，channel利用率提高76.2~88.9%。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c4150f0b1830.jpg)

此外还对不同tiling方案的性能进行了分析，如下图13，可以看到256*2048的方式性能最好，比128*4096提高17.5%，比4096*128提高24.7%。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_03a3e9829315.jpg)

#### 8.4 On-die 纠错机制

如下图10所示，分别在HellaSwag、ARC、WinoGrande三个数据集上对对纠错机制进行了测试。没有纠错机制是从10^{-5}就开始下降，有纠错机制时，则恶意容忍到10^{-4}以下。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5bf04b87e3ad.jpg)

#### 8.5 可扩展性研究

在不同channel数、chip数配置下分析了不同大小模型的decode速度。结果如图15所示：

- decode速度一开始随chip数增加而线性增加，之后放缓，这是因为chip过多时，weight无法有效的分布在所有chip上。
- 随着chip数量增加，channel利用率明显降低，这是因为Flash上算力增加，所以分配给NPU的算力降低，进而所需带宽降低
- 性能一开始随channel数增加而线性增加，而利用率则缓慢下降
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_20c5429669c0.jpg)

#### 8.6 数据传输和功耗

评估了各种模型下Cambricon-LLM-S和Flexgen-SSD推理时一个token所需数据传输量和功耗。结果如下图16所示，可以看到Flexgen-SSD所需数据量要多9.7~11.6倍，而功耗Cambricon-LLM-S也仅有Flexgen-SSD的67%。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dece87fa3bcc.jpg)

#### 8.7 成本分析

对于70B参数的LLM来说，其需要80GB空间存储weight。而Cambricon-LLM可以使用相对便宜的Flash来存储，与典型的DRAM存储硬件结构相比的成本如下表5，可以节省超过2/3的成本。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f96d6885498.jpg)