---
title: (1 封私信) LLM Decode GQA & GEMV算子性能分析（一）
date: "2024-08-20 00:00:00"
updated: "2024-08-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/LLM-Decode-GQA-GEMV算子性能分析(一)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/715091838
---


### 前言

近期，我们团队在工作中遇到了对LLM推理性能进行预估的需求。对于LLaMA2 70B TP=8的推理场景，我们发现，GQA算子在A100上和L20上的实际运行性能与我们预估的结果有较大的偏差，另外，在A100上，GEMV算子的预估结果也有较大的偏差。恰好最近阅读了知乎大佬的一篇文章：

[![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_201ee13527a9.png)代码搬运工：由GQA性能数据异常引发的对MHA，GQA，MQA 在GPU上的感性分析408 赞同 · 27 评论 文章](https://zhuanlan.zhihu.com/p/708776013)

受到这篇文章的启发，我们对GQA性能预估的方式进行修正后，发现L20上预估的GQA性能与实际性能能够对齐，但在A100上，预估的GQA性能仍然和实际性能有较大的差距。因此，针对于A100上GQA和GEMV算子性能预估不准确的问题，我们做了深入的Profile，并对Profile结果进行了分析，最终确定了性能预估不准确的原因。我们将整个过程记录于本系列的文章当中，希望能够对从事GPU硬件性能相关工作的同学有所帮助，本篇文章为此系列的第一篇，首先会介绍GQA性能的相关分析。

注：本文不涉及基础知识的讲解，也不会包含过多的源代码分析，而是从Profile的角度进行分析，因此包含大量的Nsight Compute(ncu)性能分析结果。对于GQA等基础知识并不熟悉的同学，建议先补齐基础知识再来阅读本文，以加深理解。

### 实验环境

硬件：NVIDIA A100/L20 GPU

软件：

- 推理框架：TensorRT-LLM v0.10.0
- Batch Size = 16
- Input = 4096
- Output = 512
- TP = 8

### GQA

本文前言部分引用的知乎文章表明，合理GQA的性能预估方式如下：

Cost=KVCache_for_MHA/L2_Bandwidth" role="presentation">Cost=KVCache_for_MHA/L2_BandwidthCost=KVCache\_for\_MHA/L2\_Bandwidth 

由于我们做了张量并行TP=8，每个GPU只需负责=8个Head的Attention计算，从L2 Cache中读取的数据量大约为8个Head的KVCache大小。我们选择Decode阶段第256个Step进行分析，KVCache中上下文的长度为4096 + (256 - 1) = 4351，对应的KVCache大小约为271.9375 MiB(fp16 datatype)。

关于A100/L20的L2 Cache带宽，由于Spec中并未说明，因此我们参考ncu的Profile结果并进行反推。

从Memory Chat中我们可以观察到，L2 Cache的带宽利用率由读操作和写操作的带宽利用率组成。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_90bd4b78ac63.jpg)

图1：A100 Memory Chat因此，我们可以在Memory Table中找到实际的带宽利用率，并用总的吞吐量除以带宽利用率，来反推A100的L2 Cache理论带宽。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2d1107a195bc.jpg)

图2：A100 Memory Table基于ncu的Profile结果，我们可以推算出，A100的L2 Cache理论带宽约为5.6 TB/s，L20的L2 Cache理论带宽约为5.8 TB/s。

A100和L20的L2 Cache理论带宽相差不大，但实际的带宽一定不会达到理论上的那么高，为了保守起见，对于这两种GPU，我们均选择3 TB/s作为实际的L2 Cache带宽。

确定了从L2 Cache中读取的KVCache大小，以及保守估计的L2 Cache带宽后，我们就可以推算GQA算子的运行时间——用KVCache大小除以保守估计的L2 Cache带宽，我们<strong>预计A100和L20的上GQA算子花费的时间大约为95us</strong>。

实际的测试结果显示，L20上的GQA算子耗时约85us，与预估值相差并不大，但在A100上，GQA算子的耗时高达165us，近乎是我们保守估计的耗时的2倍。因此，我们进行了Profile并对比了实际的L2 Cache带宽，发现A100上运行GQA算子时，其L2 Cache带宽仅有1.71 TB/s，而L20则达到了3.17 TB/s，与保守估计的带宽相差不大。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_f3f55532e4e6.jpg)

图3：A100 L2 Cache带宽![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a5ceff4ae3c7.jpg)

图4：L20 L2 Cache带宽我们开始进一步对比算子运行过程中的差异，首先，我们观察到两种GPU上运行的kernel来自于同一kernel模板，至少说明其执行逻辑大体相似，另外，kernel的Grid Size也是相同的，均为(8, 16, 1)，因此，可以简单分析出一个结论——Grid(8, 16, 1)中，8对应Head，16对应Batch Size，整个mha kernel的实现应该类似于Page Attention V1。

虽然Grid相同，但ThreadBlock的大小是不同的，在A100上为(1024, 1, 1)，而L20上为(512, 1, 1)。ThreadBlock的大小不同，可能会导致kernel在很多方面都具有不同的表现，也增加了分析的难度，对于这种情况，首先应该从宏观的Scheduler，Warp State的角度，观察kernel的运行过程中Scheduler发射warp指令是否顺畅，并进一步分析kernel整体是否能够使GPU硬件资源处于有效利用的状态。

因此，我们进一步对比了Scheduler Statistics和Warp State Statistics。我们观察到，A100和L20上的一个显著差异是A100上Warp Stall的原因中，除了Long Scoreboard占据主导因素外，Not Select Stall的占比也很高。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_be8addda5b23.jpg)

图5：A100 Scheduler & Warp State![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7d88f57b1a39.jpg)

图6：L20 Scheduler & Warp State从Eligible Warps Per Scheduler指标中我们可以观察到，在A100上，平均下来每个smsp在每个激活周期有大约两个可issue的warp，而L20上仅有一个，这似乎能够和ThreadBlock的大小相呼应。对于Eligible的warp，如果当前周期并没有被Scheduler选择并issue，就会导致Not Select Stall，正如ncu文档中所说：

Warp was stalled waiting for the micro scheduler to select the warp to issue. Not selected warps are eligible warps that were not picked by the scheduler to issue that cycle as another warp was selected. A high number of not selected warps typically means you have sufficient warps to cover warp latencies and you may consider reducing the number of active warps to possibly increase cache coherence and data locality.

难道Not Select Stall就是导致A100的性能不如L20的原因吗？为了进一步验证这个猜想，我们简要的分析了TensorRT-LLM中launch mha kernel的逻辑。分析代码后，我们发现，ThreadBlock的大小取决于可用的Shared Memory大小，在A100上可用的Shared Memory略大，因此launch了更大的ThreadBlock。我们可以通过环境变量TRTLLM_MMHA_KERNEL_BLOCK_SIZE=512强制kernel选用(512, 1, 1)的ThreadBlock。

设置了环境变量后，A100上kernel的Not Select Stall显著减小，性能也有大约10us左右的提升，大约提升至155us。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_1f5e8d22c3d4.jpg)

图7：A100 BLOCK_SIZE=512时的Scheduler & Warp State虽然性能略有提升，但距离预期的性能仍有较大的差距，此时L2 Cache带宽也仍然仅有1.84 TB/s。由于我们launch的kernel并不涉及FP8相关操作，因此，此时A100上运行的kernel应该与L20完全一致，从指令统计相关数据我们也可以确认，A100上和L20上运行的是完全一样的kernel：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_8992702d9f1b.jpg)

图8：A100的指令统计![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_7c684ce09cc3.jpg)

图9：L20的指令统计那么，导致性能差异的原因只可能是硬件。

我们进一步在kernel的计算和访存等方面对A100和L20进行对比，最终在IPC指标上发现了一些端倪。在A100上，SM激活状态下，kernel实现的IPC为2.15，而L20上则为1.84。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_752187d6fa82.jpg)

图10：A100 IPC![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c417b9c4ae04.jpg)

图11：L20 IPC乍一看，似乎A100具有更高的IPC，那么性能应该更好才对，毕竟执行的指令总数都是一定的。但实际情况却是相反，那么原因只可能是频率了，A100 SM的运行频率在1.15Ghz左右，而L20则为2.33Ghz。因此，我们进一步观察指令的吞吐量：

A100: 2.15 instructions/cycle * 1.15GHz = 2.4725 instructions/s

L20: 1.84 instructions/cycle * 2.33GHz = 4.2827 instructions/s

L20上指令的吞吐量大约为A100上的1.73倍左右。而对比此时的L2 Cache带宽（L20为3.17 TB/s，A100为1.84 TB/s），L20也是A100的大约1.72倍，这是巧合吗？显然不是。

<strong>现在L2 Cache带宽利用率在L20上也不足60%，说明L2 Cache带宽本身非常充足，并不会成为性能瓶颈，但实际的指令吞吐量会决定kernel能够多大程度的利用L2 Cache带宽，换句话说，L20发射访存指令的速度是A100发射访存指令速度的1.7倍，如果L2 Cache带宽充足，那么L20的L2 Cache带宽利用率也应该是A100的1.7倍左右。</strong>为了进一步验证这个猜想，我们手动的将L20的SM频率锁定在1155MHz，并Profile kernel性能：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5e7b74447d7e.jpg)

图12：L20锁频后的kernel性能可以看到，锁频后，L20上kernel的性能下降到161us，与A100上的kernel性能（155us）近乎相同（此时略微的性能差异可能来自于SM数量的不同，此处不再深究），印证了我们的猜想，此时，我们观察L2 Cache的带宽：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_93460a218972.jpg)

图13：L20锁频后的kernel L2 Cache带宽L20上的L2 Cache带宽也降低至1.77 TB/s，与A100的1.84相差无几，更进一步的验证了我们的猜想。

### 总结

A100上GQA算子性能不及预期的原因在于SM的运行频率低导致发射访存指令的速度不足以有效的利用L2 Cache带宽。

从性能优化的角度来说，SM的运行频率是一定的，我们无法修改，但我们很清楚，GQA kernel的性能取决于实际能够利用到的L2 Cache带宽，如果我们无法从指令发射速度的角度优化L2 Cache带宽，那么我们可以通过增大并发度的方式增加L2 Cache带宽的利用率。通过开发更多的并行维度，比如在Sequence Length这个维度也使用多个ThreadBlock进行处理，以增加ThreadBlock的数量，提升并发度，可以更有效的利用L2 Cache带宽资源，这也是Page Attention从V1升级到V2的思路，在Tensor-RT LLM中，也存在类似的优化机制，可通过环境变量使能。

对于L20来说，当前L2 Cache带宽利用率大约在55%，此时，我们也可以通过增大并发度的方式提升L2 Cache带宽利用率，但相对于A100来说，L20上并发度增加的程度不需要像A100上那么大，这是因为如果并发度过大，反而会造成缓存发生竞争，数据局部性被破坏的问题，进而导致性能下降。

在下一篇文章中，我们会探究A100上GEMV算子性能不及预期的原因，并更详细的分析并发度，负载不均衡等问题对GEMV算子性能的影响。
