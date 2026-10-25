---
title: Hotchips 37 (2025) 有哪些看点？
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Hotchips-37-(2025)-有哪些看点/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1944159022283485382/answer/1946289971049784808
---


歪睿老哥
​​​
芯片（集成电路）话题下的优秀答主

​ 关注

谢邀 @双辞

收录于 · 人工智能和芯片设计那些事儿

当然是各种AI的处理器了。

这其中，我比较喜欢Google的TPUv7  Ironwood。

已经是TPU的第七代了，但是Ironwood 是 Google 首个采用多计算小芯片（multi-compute chiplet）设计的 TPU 。

它使得 Google 能够突破半导体制造中掩膜限制（reticle-limited）的瓶颈，从而设计出比单个掩膜所能容纳的更大、更强大的芯片 。

在 Ironwood 的每个封装中，都集成了两个计算小芯片 +serdes的芯粒die+HBM。 

由上图，可见，两个对称的计算die通过内部接口接在一起，IO die外面通过6个112G的serdes和外部其他芯片相连（大家想想？为什么是6个，答案见最后）。

两个计算die（芯粒）是一样的，只不过，右边的计算die用不到PCIe gen5X16（一个芯片上有一个就可以了）。

接下来，看看芯片内部的结构

TensorCore 是 Ironwood 芯片的计算核心，是其执行大规模 AI 计算任务的基石。

见红色框。

tensor core中有MXU，VPU，XLU等等模块

矩阵乘法单元（MXU）：MXU 是 TensorCore 的心脏，采用了脉动阵列（systolic array）架构 。这种架构使得大量乘法-累加操作能够在一个时钟周期内高效执行，极大地提高了吞吐量并减少了数据移动。Ironwood 的 MXU 支持 FP8 精度，这对于大规模推理任务至关重要 。相比于更高精度的格式，FP8 能够以更少的功耗和硬件资源实现类似的计算精度，是未来 AI 推理的主流趋势 。 

向量处理单元（VPU）： VPU 负责执行各种通用数学运算，例如激活函数（如 ReLU）和向量间的点乘或加法 。这些操作在神经网络的计算流程中扮演着重要角色，补充了 MXU 的矩阵乘法功能。 

标量单元（Scalar Unit）： 标量单元用于处理控制流、计算内存地址以及其他维护性操作 。它确保了数据流的顺畅，并协调 MXU 和 VPU 的工作，形成一个高度优化的计算流水线。 

除了Tensor Core之外，Ironwood 引入了第四代 SparseCore，见紫色部分。

稀疏计算引擎（SparseCore）： 一个专用于加速嵌入（embeddings）和集体通信的专用计算引擎 。

嵌入层在推荐系统和 MoE 等模型中非常普遍，其计算模式通常是稀疏的，即矩阵中包含大量零值。

在传统的密集矩阵乘法单元上处理稀疏工作负载会非常低效 。

因此，通过专门的 SparseCore 引擎，Ironwood 能够高效地处理这些稀疏计算，这对于其目标工作负载至关重要。 

它本身就是一个独立的小单元，里面有16个叫“Tile”的东西 。这些“Tile”才是干活的，每个“Tile”里又有好几个专门的处理器： 

```text
TVPU (Tile Vector Programmable Unit): 向量可编程单元，这名字听着就有点像GPU里的SIMD（单指令多数据）或SIMT（单指令多线程）核心 。它负责执行向量运算，这部分和GPU是相似的。 

XPU (Cross-lane Processing Unit): 跨通道处理单元，这听起来就是为了处理不同数据流之间复杂的交互而设计的 。 

SGE (Scatter-Gather Engine): 分发-汇聚引擎，因为稀疏计算最大的挑战就是数据不规整，零星散落在内存里。这个SGE就是专门干这活儿的，它能高效地把那些分散的非零数gather起来，然后把计算结果scatter回内存，避免了大量的无用功。 

LSU (Load Store Unit): 加载-存储单元，负责数据进出 。 

Core Sequencer (SCS): 核心序列器，就像个“指挥官”，它负责调度这些“Tile”，并与芯片上的其他部分（On-Chip Fabric）通信 。 
```


SparseCore的用途，专门处理大模型预训练中的集合通信和超大型推荐模型中的嵌入（embeddings） 。

这些都是典型的稀疏计算，用它来干，效率比主力的TensorCore（MXU）高多了 。 

在运行一个大模型时，主力的TensorCore在跑密集的矩阵乘法，而SparseCore同时在旁边处理嵌入层和稀疏计算，双线并行，互不干扰 。 

TPU的Sparse core和GPU的cuda core相比，两者都是为并行计算设计的，都包含了大量的处理单元（GPU的CUDA核心，SparseCore的Tile）和专门的内存单元，都旨在处理大规模数据。

就这个点上来说，架构有点类似，只能说殊途同归。

但是，传统的GPU为了编程方便，通常会追求缓存一致性（coherent memory），这就像一个大型会议室，每个人都能看到最新版本的共享文件，但维护这个“最新版本”需要大量的协调开销 。

而Sparse core的“non-coherent shared memory”则简化了这套机制，每个单元都可以在不考虑全局一致性的情况下快速读写，这大大减少了硬件复杂性和通信流量，尤其是在超大规模的Pod中 。

这种取舍，只有Google这种对自家软件栈和工作负载了如指掌的垂直整合公司才会做。 

Ironwood 的内存子系统是其架构中的一个关键亮点，专为满足 LLMs 的巨大内存需求而重新设计（见蓝色框，可以扩展scale up 9216个TPU）。

芯片间互连（Inter-Chip Interconnect，ICI）是 Ironwood 芯片之间的低延迟、高带宽通信骨干 。它旨在实现大规模计算簇中芯片间的协调和同步通信。 

最后少不了就是HBM。（见绿色框） 

每个 Ironwood 芯片都配备了8个 HBM3e 内存堆栈 （每个die 4个）。

这提供了高达192 GB 的芯片内存容量，是上一代 Trillium 的6倍 。同时，单芯片的 HBM 带宽达到了7.37 TB/s，是 Trillium 的4.5倍 。 

大容量 HBM 允许将整个或大部分模型参数保存在芯片上HBM中，显著减少了频繁的数据传输需求，从而减轻了困扰传统架构的“冯·诺依曼瓶颈” 。

高带宽则确保了 MXU 和 VPU 能够持续获得充足的数据输入，避免计算单元因等待数据而“带宽受限” 。 

接下来，就是将这个TPUv7组合成一个POD

Ironwood TPU Pod 的组建遵循一个严格的物理层级结构。

芯片到托盘（Chip-to-Tray）： 每个液冷托盘（tray）中容纳4个 Ironwood TPU 芯片 。       

一个液冷的TRAY（托盘）托盘到机架（Tray-to-Rack）： 16个这样的托盘被安装在一个机架（rack）中，总共包含64个 TPU 。机架内部的所有互连均使用铜互联 。 

一个64个TPU的机架机架到Pod（Rack-to-Pod）： 一个完整的 TPU Pod 由多个机架组成，形成一个庞大的计算集群。

机架内部是铜互联，机架之间是光互联。

最后，多个机架组成一个机柜。

下图，每个方格就是一个机柜，一共是16X9=144个机柜。

每个机柜64个TPU。一共是9216个TPU。

大家可能有点奇怪，为什么不是4096或者8192这种2的倍数。

其实，多出来的芯片提供了必要的冗余，以确保系统在出现部分硬件故障时仍能保持高可用性 。

例如上图中出现骷髅头的机柜，就会被剔除。

所以，这种设计解释了为什么 Ironwood Pod 的芯片数量是9216个，而不是像8192这样典型的2的幂次方。

根据上面的描述，我们可以得出物理与逻辑 Pod 结构层级级联关系

层级组成芯片数量总 HBM 容量芯片 (Chip)单个 Ironwood 芯片1192 GB托盘 (Tray)4个芯片4768 GB机架 (Rack)16个托盘 (64个芯片)，内部铜互联6412.288 TBPod约144个机架 (由OCS连接)9,2161.77 PB在性能方面，Ironwood 单个芯片的峰值性能达到4614 TFLOPS。

而一个由9216个芯片组成的 Pod 则能提供高达42.5 Exaflops 的计算能力 。

此外，该平台专注于提高能效，其每瓦性能比上一代 Trillium（v6）提升了2倍 。

下表对 Ironwood 的关键技术指标与前代进行了量化对比。

特性TPU v4TPU v5pIronwood (TPU v7)每个Pod的芯片数4,0968,9609,216单芯片HBM容量32 GB95 GB192 GB单芯片HBM带宽1.2 TB/s2.8 TB/s7.37 TB/sICI互连带宽待定800 Gb/s (6端口)1.2 TBps (双向)单芯片峰值TFLOPs2754594,614每Pod峰值Exaflops待定待定42.5冷却方式液冷液冷液冷不知不觉，TPU已经是第七代，

Ironwood 的诞生是 Google 长期 TPU 发展战略中的一个关键转折点。

与 TPUv4 更偏向于训练大规模模型不同。

Ironwood 被明确地定位为首款专为大规模 AI 推理而设计的 TPU 。

在 AI 硬件竞赛中，真正的竞争优势不仅仅在于单个芯片的原始性能，而在于垂直整合的系统工程能力。

例如英伟达的NV72，Matrix 384，TPU的POD，大家都在往多芯片互联（scale up）的这条道上狂奔。

在scale up的数量上9216个TPU，这是是全球最多的。

远超华为的matrix384（384个NPU），以及NV72（72个GPU）。

特性谷歌Ironwood (TPU v7)华为CloudMatrix 384英伟达GB200 NVL72核心架构专用ASIC (TPU) + SparseCore混合架构: 专用NPU (昇腾) + 通用CPU (鲲鹏)混合架构: 通用GPU (Blackwell) + 通用CPU (Grace)最大Pod规模 (芯片数)9,216384 (超节点)72 (机架)Pod互联ICI + OCS统一总线 (UB) + UB SwitchNVLink + NVLink SwitchPod拓扑3D环面全连接全连接这种能力能够将成千上万个芯片整合为一个高效、可靠且可扩展的计算巨兽 。

但是，唯一遗憾的是，目前google这个不是全互联，只能上下左右的TPU点互联互通，但是绝对算是scale up。

这种结构，也是DOJO的结构，

如果想让9216颗芯片都实现“全互联”（All-to-All），那需要的物理线路和交换机数量会呈指数级爆炸式增长，那简直是天文数字 。

而三维环面这种“邻近连接”的拓扑，它的布线和交换机需求随着节点数量线性增长 ，这让谷歌在超大规模上实现了成本的完美控制。 

这里回答，最前面提出的问题，就是Ironwood TPU 为什么是6对112G的serdes，不是4或者8。

因为每个TPU需要和上，下，左，右，前，后，6个相邻TPU通信，所以才是6个。

所以，这种复杂的拓扑结构，需要一个极其强大的软件栈和编译器来调度和优化 。

Google的Pathways软件，就是为了将这种底层硬件的复杂性对开发者透明化而设计的 。

TPU这意味着必须使用谷歌的软件生态，缺乏像英伟达CUDA那样广泛的通用性 。 

当然，TPU就是给google云自己用的，别人也是用上面的算力，模型，根本接触不到底层。

原汤化原食，一点毛病没有。

扩展阅读：

阅读全文​
​赞同 123​​添加评论​201 ​8 ​分享