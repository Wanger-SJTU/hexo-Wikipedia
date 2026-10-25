---
title: 基于Roofline模型的模型&算子推理瓶颈识别方案调研
date: "2023-11-16 00:00:00"
updated: "2023-11-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/基于Roofline模型的模型-算子推理瓶颈识别方案调研/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/665990267
---


**以下内容来自腾讯工程师 guoqing导语 | 调研目的 为开发紫霄平台的模型&算子推理性能预测&分析工具，调研了华为、寒武纪、谷歌TPU、百度昆仑以及燧源的模型推理分析工具的实现。其中，华为CANN的模型推理分析工具值得参考，这套方案的底层理论为Roofline模型。更进一步，结合紫霄的硬件架构，我们可以设计紫霄端模型&算子推理分析工具的实现方案。

### 小节安排**

       下面首先简练介绍<strong>CANN的模型推理性能Profiling工具</strong>和<strong>Roofline模型原理</strong>，进而阐述<strong>华为基于Roofline模型的算子推理瓶颈识别</strong>以及<strong>在识别瓶颈的基础上华为CANN官方推荐的模型&算子优化思路</strong>。

### 1.  <strong>CANN的模型推理性能Profiling工具</strong>

### <strong>1.1 Profiling工具介绍</strong>

       Profiling工具目的是通过分析AI任务运行时采集的性能数据。判断AI任务运行时的软硬件性能瓶颈可以根据性能数据进行分析。类似NVIDIA提供的Profiling工具nvprof，华为CANN提供命令行工具msprof和AscendCL API等四种方式方便用户进行Profiling。

### <strong>1.2 roofline模型需要采集的性能数据</strong>

        针对基于Roofline模型的算子推理瓶颈识别，华为CANN需要用户使用Profiling工具采集的性能数据如下：

- ArithmeticUtilization
mac_fp16_ratio：代表cube fp16类型指令的cycle数在所有指令的cycle数中的占用比。

mac_int8_ratio：代表cube int8类型指令的cycle数在所有指令的cycle数中的占用比。

vec_fp32_ratio：代表vec fp32类型指令的cycle数在所有指令的cycle数中的占用比。

vec_fp16_ratio：代表vec fp16类型指令的cycle数在所有指令的cycle数中的占用比。

vec_int32_ratio：代表vec int32类型指令的cycle数在所有指令的cycle数中的占用比。

vec_misc_ratio：代表vec misc类型指令的cycle数在所有指令的cycle数中的占用比。

cube_fops：代表cube类型的浮点运算数，即计算量，可用于衡量算法/模型的复杂度，其中fops表示floating point operations，缩写为FLOPs。

vector_fops：代表vector类型浮点运算数，即计算量，可用于衡量算法/模型的复杂度，其中fops表示floating point operations，缩写为FLOPs。

- PipeUtilization
vec_time：代表vec类型指令（向量类运算指令）耗时。

vec_ratio：代表vec类型指令（向量类运算指令）的cycle数在所有指令的cycle数中的占用比。

mac_time：代表cube类型指令（矩阵类运算指令）耗时。

mac_ratio：代表cube类型指令（矩阵类运算指令）的cycle数在所有指令的cycle数中的占用比。

scalar_time：代表scalar类型指令（标量类运算指令）耗时。

scalar_ratio：代表scalar类型指令（标量类运算指令）的cycle数在所有指令的cycle数中的占用比。

mte1_time：代表mte1类型指令（L1->L0A/L0B搬运类指令）耗时。

mte1_ratio：代表mte1类型指令（L1->L0A/L0B搬运类指令）的cycle数在所有指令的cycle数中的占用比。

mte2_time：代表mte2类型指令（DDR->AICORE搬运类指令）耗时。

mte2_ratio：代表mte2类型指令（DDR->AICORE搬运类指令）的cycle数在所有指令的cycle数中的占用比。

mte3_time：代表mte3类型指令（AICORE->DDR搬运类指令）耗时。

mte3_ratio：代表mte3类型指令（AICORE->DDR搬运类指令）的cycle数在所有指令的cycle数中的占用比。

icache_miss_rate：代表icache缺失率，即未命中icache，数值越小越好。

memory_bound：用于识别AICore执行算子计算过程是否存在Memory瓶颈，由 mte2_ratio/max(mac_ratio, vec_ratio)计算得出。计算结果小于1，表示没有Memory瓶颈；计算结果大于1 则表示有Memory瓶颈，且数值越大越瓶颈严重。

- MemoryL0
l0a_read_bw：代表l0a读带宽速率，单位GB/s。

l0a_write_bw：代表l0a写带宽速率，单位GB/s。

l0b_read_bw：代表l0b读带宽速率，单位GB/s。

l0b_write_bw：代表l0b写带宽速率，单位GB/s。

l0c_read_bw：代表vector从l0c读带宽速率，单位GB/s。

l0c_write_bw：代表vector向l0c写带宽速率，单位GB/s。

l0c_read_bw_cube：代表cube从l0c读带宽速率，单位GB/s。

l0c_write_bw_cube：代表cube向l0c写带宽速率，单位GB/s。

- MemoryUB
ub_read_bw_mte：代表mte从ub读带宽速率，单位GB/s。（昇腾310 AI处理器）。

ub_write_bw_mte：代表mte向ub写带宽速率，单位GB/s。（昇腾310 AI处理器）。

ub_read_bw_vector：代表vector从ub读带宽速率，单位GB/s。

ub_write_bw_vector：代表vector向ub写带宽速率，单位GB/s。

ub_read_bw_scalar：代表scalar从ub读带宽速率，单位GB/s。

ub_write_bw_scalar：代表scalar向ub写带宽速率，单位GB/s。

### 2.  <strong>Roofline模型原理</strong>

### <strong>2.1 不考虑缓存机制的roofline模型原理</strong>

       AI模型推理依赖于具体的计算平台。此时，模型和计算平台的"默契程度"会决定模型的实际表现。<strong>Roofline Model 提出了使用 Operational Intensity（计算强度）进行定量分析的方法，并给出了模型在计算平台上所能达到理论计算性能上限公式。</strong>

#### <strong>2.1.1 计算平台的两个指标：算力 π 与带宽 β</strong>

- <strong>算力 π</strong> ：也称为计算平台的性能上限，指的是一个计算平台倾尽全力每秒钟所能完成的浮点运算数。单位是 FLOPS 。
- <strong>带宽 β</strong> ：也即计算平台的带宽上限，指的是一个计算平台倾尽全力每秒所能完成的内存交换量。单位是Byte/s。
- <strong>计算强度上限 Imax</strong> ：两个指标相除即可得到计算平台的计算强度上限。它描述的是在这个计算平台上，单位内存交换最多用来进行多少次计算。单位是FLOPs/Byte。<strong>Imax=π/β</strong>
注：这里所说的“内存”是广义上的内存。对于CPU计算平台而言指的就是真正的内存；而对于GPU计算平台指的则是显存。

#### <strong>2.1.2 模型的两个指标：计算量 与 访存量</strong>

- <strong>计算量：</strong>指的是输入单个样本（对于CNN而言就是一张图像），模型进行一次完整的前向传播所发生的浮点运算个数，也即模型的<strong>时间复杂度</strong>。单位是 FLOPs。其中卷积层的计算量公式如下（[卷积神经网络的复杂度分析 - 知乎](https://zhuanlan.zhihu.com/p/31575074)）
- <strong>访存量：</strong>指的是输入单个样本，模型完成一次前向传播过程中所发生的内存交换总量，也即模型的<strong>空间复杂度</strong>。在理想情况下（即不考虑片上缓存），模型的访存量就是模型各层权重参数的内存占用（Kernel Mem）与每层所输出的特征图的内存占用（Output Mem）之和。单位是Byte。由于数据类型通常为float32 ，因此需要乘以四。
- <strong>模型的计算强度 I</strong> ：由计算量除以访存量就可以得到模型的计算强度，它表示此模型在计算过程中，每Byte内存交换到底用于进行多少次浮点运算。单位是FLOPs/Byte。可以看到，模计算强度越大，其内存使用效率越高。
- <strong>模型的理论性能 P</strong> ：我们最关心的指标，即模型在计算平台上所能达到的每秒浮点运算次数（理论值）。单位是 FLOPS。Roof-line Model 给出的就是计算这个指标的方法。

#### <strong>2.1.3 Roof-line Model</strong>

       其实 Roof-line Model 说的是很简单的一件事：<strong>模型在一个计算平台的限制下，到底能达到多快的浮点计算速度</strong>。更具体的来说，Roof-line Model 解决的，是“<strong>计算量为A且访存量为B的模型在算力为C且带宽为D的计算平台所能达到的理论性能上限E是多少</strong>”这个问题。

#### <strong>2.1.3.1 Roof-line 的形态</strong>

- 所谓“Roof-line”，指的就是由计算平台的算力和带宽上限这两个参数所决定的“屋顶”形态，如下图所示。
- 算力决定“屋顶”的高度（绿色线段）
- 带宽决定“房檐”的斜率（红色线段）
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_cf28a59c689a.jpg)

#### <strong>2.1.3.2 Roof-line 划分出的两个瓶颈区域</strong>

- 计算瓶颈区域 Compute-Bound
       不管模型的计算强度 I 有多大，它的理论性能 P 最大只能等于计算平台的算力 π 。当模型的计算强度 I 大于计算平台的计算强度上限 Imax 时，模型在当前计算平台处于 Compute-Bound状态，即模型的理论性能 P 受到计算平台算力 π 的限制，无法与计算强度 I 成正比。从充分利用计算平台算力的角度上看，此时模型已经 100% 的利用了计算平台的全部算力。可见，计算平台的算力 π 越高，模型进入计算瓶颈区域后的理论性能 P 也就越大。

- 带宽瓶颈区域 Memory-Bound
       当模型的计算强度 I 小于计算平台的计算强度上限 Imax 时，由于此时模型位于“房檐”区间，因此模型理论性能 P 的大小完全由计算平台的带宽上限 β （房檐的斜率）以及模型自身的计算强度 I 所决定，因此这时候就称模型处于 Memory-Bound 状态。可见，在模型处于带宽瓶颈区间的前提下，计算平台的带宽 β 越大（房檐越陡），或者模型的计算强度 I 越大，模型的理论性能 P 可呈线性增长。

#### <strong>2.1.4. 模型实例分析</strong>

       下面用 Roof-line Model 理论来对比分析一下VGG16和MobileNet模型推理性能瓶颈。

#### <strong>2.1.4.1 VGG16</strong>

       VGG一次前向传播的计算量 15 GFLOPs。访存量则是 Kernel Mem 和 Output Mem 之和再乘以四，大约是 600MB。<strong>因此 VGG16 的计算强度就是 25 FLOPs/Byte。</strong>

#### <strong>2.1.4.2 MobileNet</strong>

       MobileNet 的计算量只有大约 0.5 GFLOPs（VGG16 则是 15 GFLOPs），其访存量也只有 74 MB（VGG16 则是约 600 MB）， MobileNet 的计算强度只有 7 FLOPs/Byte。

#### <strong>2.1.4.3 两个模型在 1080Ti 上的对比</strong>

       作为性价比之王的 1080Ti，我们的两个模型 VGG16 和 MobileNet 的性能将分别位于这个计算平台 Roof-line Model 的什么位置呢？

- 1080Ti 的算力 π=11.3 TFLOP/s
- 1080Ti 的带宽 β=484 GB/s
- 因此 1080Ti 计算平台的最大计算强度 Imax≈24
- VGG16 的计算强度 IV≈25
- MobileNet 的计算强度 IM≈7
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a4ca2facbe19.jpg)

由上图可以非常清晰的看到：

- MobileNet 处于 Memory-Bound 区域。在 1080Ti 上的理论性能只有 3.3 TFLOP/s。
- VGG16 刚好迈入 Compute-Bound 区域。完全利用 1080Ti 的全部算力。
       虽然 MobileNet 进行前向传播的计算量只有 VGG 的三十分之一，但是由于计算平台的带宽限制，它不能像 VGG 那样完全利用 1080Ti 这个计算平台的全部算力，因此它在 1080Ti 上每秒钟可以进行的浮点运算数只能达到 VGG 的 30%，因此理论上的运行速度大约是 VGG 的十倍（实际上会因为各方面其他因素的限制而使得差别更小）。

注：Roofline 模型讲的是程序<strong>在计算平台的算力和带宽这两个指标限制下，所能达到的理论性能上界</strong>，而不是实际达到的性能，因为实际计算过程中<strong>还有除算力和带宽之外的其他重要因素</strong>，它们也会影响模型的实际性能，这是 Roofline Model 未考虑到的。例如矩阵乘法，会因为 cache 大小的限制、GEMM 实现的优劣等其他限制，导致你几乎无法达到 Roofline 模型所定义的边界（屋顶）。

### <strong>2.2 考虑缓存机制的roofline模型原理</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_bc5a87e96a5a.jpg)

如上图所示，计算生成roofline模型模型图流程如下：

- 确定不同计算指令的峰值FLOPS值，画出其Roof-line（即上方横向“屋顶”）
- 以L1、L2、HBM三级缓存之间的最大带宽速率为斜率，得到包括多级缓存Roof-line（即左侧斜向“屋檐”）
- 使用prof工具得到算子的一次推理中L1、L2、HBM三层的访存量（华为CANN采用的是访存带宽速率，根据多级缓存的cycle数可以得到缓存时延，访存带宽速率*缓存时延 = 访存量）。
- 使用prof工具得到算子的一次推理的计算量FLOPs。
- 计算L1、L2、HBM三层的计算强度（FLOPs/访存量），计算得到三个<strong>计算强度，画到图中。</strong>

### 3.  <strong>基于Roofline模型的算子最优性能评估及推理瓶颈识别功能实现方案（推测）</strong>

### <strong>3.1 算子推理性能评估</strong>

<strong>计算流程：</strong>

       首先，根据roofline坐标图中的离以模型计算强度为横坐标，FLOPS为纵坐标的坐标点最近的Roof-line,即为该模型的瓶颈通路。

       接着，以当前的瓶颈率，乘以算子推理时延，除以80%的优良瓶颈率，得到理论最优算子推理时延。

```text
       理论最优算子推理时延 = 当前的瓶颈率 * 算子推理时延 / （80%）

       其中，瓶颈率 = 当前FLOPS / 瓶颈通路该横坐标时的FLOPS（纵坐标）

     （本质：FLOPS * 时延 = FLOPs。**华为CANN设定瓶颈率优良的标准为80%**，若算子优化后能提升到80%，则认为优秀。）
```


<strong>需要的指标：</strong>

       硬件指标：执行vec，scalar，cube指令峰值FLOPS

       各级缓存 带宽

       算子指标：FLOPs，时延，各级缓存的访存量

### <strong>3.2 算子推理瓶颈识别功能实现方案（推测）</strong>

       华为CANN的算子推理瓶颈识别功能官网只有使用文档。这里我结合华为CANN的算子推理瓶颈识别功能需要采集的数据，综合分析各使用示例的推断过程，总结了华为CANN的算子推理瓶颈识别功能实现方案（推测）。

       基于指令流时序进行分析：

<strong>需要的指标：</strong>各指令starttime，endtime.

<strong>瓶颈识别流程：</strong>

               1. 某指令总时延过长：

                       1.1 某级memory指令总时延过长：数据搬运时划分过细。

                       1.2 某计算指令（如vec、cube、scalar指令）总时延过长：该计算指令的实现函数中存在问题。

               2. 指令依赖：需要指令流水打断。

     （其它瓶颈识别需要我们进一步分析，华为CANN此处因为只考虑算子推理瓶颈，且不考虑不能转换的算子，因此瓶颈识别相对简单，但是包含的瓶颈也不少，以紫霄为例，3级缓存加3种不同的计算指令，再加缓存指令与计算指令之间的依赖）

### 4.  <strong>优化</strong>

       Profiling系统调优的目的是通过分析AI任务运行时采集的性能数据，判断AI任务运行时的软硬件性能瓶颈。可以根据来对数据进行分析。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_efa454822177.jpg)

### 5.  <strong>调研结论</strong>

<strong>华为CANN的模型推理分析工具</strong>值得参考，这套方案的底层理论为<strong>Roofline模型</strong>。更进一步，<strong>结合紫霄的硬件架构</strong>，我们可以设计紫霄端模型&算子推理分析工具的实现方案。

### 6.  <strong>附录</strong>

NVIDIA 考虑多级缓存情况下的Roofline模型（NVIDIA GTC 2019）：

s9624-performance-analysis-of-gpu-accelerated-applications-using-the-roofline-model.pdf

**

欢迎点赞分享，搜索关注【鹅厂架构师】公众号，一起探索更多业界领先产品技术。**
