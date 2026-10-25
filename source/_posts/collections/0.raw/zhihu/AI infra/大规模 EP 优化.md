---
title: 大规模 EP 优化
date: "2025-08-29 00:00:00"
updated: "2025-08-29 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/大规模-EP-优化/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1944715179439924643
---


近期看到nv官方发布了一个关于scale ep很好的演讲视频，正好跟我前段时间做的工作有很强的联系，故就把视频的课程记录整理成如下。

![](https://pic2.zhimg.com/v2-496b602179ac776cc6d2bca0d6505d49_r.jpg)

Background and Motivation

![](https://picx.zhimg.com/v2-33fd897b3dcdf34502579617d3ba0aab_r.jpg)

![](https://pic1.zhimg.com/v2-2c293bdfa47370037fb845275b9abe6a_r.jpg)
尤其是对deepseekV3和Kimi K2这种大规模的Sparse MoE的模型部署的时候，我们要结合推理过程中KVCache对于显存的需要，基本在单机上是很难做生产部署的，这时候显存和算力都是一个比较大的瓶颈。

![](https://pic2.zhimg.com/v2-cb8831357471803f3cdc374be103a729_r.jpg)

Co-located

IFB就是[Continuous batching](https://zhuanlan.zhihu.com/p/719610083)， 相比于naive版本的部署已经尽可能地提升了我们的GPU利用率，之后又有chunk prefill又能进一步在decode阶段的ITL(Inter-Token LatencyToken间延迟)和TPOT(Tokens Per Occupied Time,单位占用时间生成的Token数)又有一定延迟的改善， 不管是IFB和chunk prefill这两种本身其实并没有考虑prefill（对算力需求更高）和decode（对带宽和显存需求更高）之间的计算差异。在非pd分离的部署的情况下，这两种截然不同的计算模式共享同一套GPU资源，不同的并行策略情况下二者的计算过程会相互干扰。

Disaggregated

现在更主流的部署方式是：IFB+chunk prefill+PD分离的这种部署方式，通过将prefill和decode部署到不同的GPU实例上面，并且采用差异化的并行策略，实际上我们是能够进一步对prefill阶段和decode阶段做TTFT和TPOT上独立的优化。

Principles and Key Technologies

![](https://picx.zhimg.com/v2-452946f84d2edb249e618979d229e7cb_r.jpg)

![](https://pic3.zhimg.com/v2-cccb01b652cac379e60e7301afb3f92c_r.jpg)

![](https://pic2.zhimg.com/v2-2102b4b7d3c9cf6ab0db8fb3e719cb4d_r.jpg)
sglang部署deepseekV3
他的并行策略主要是attn部分的纯DP以及前三层的dense FFN的纯DP，一开始nv考虑dense ffn用TP，因为里面有FP8，又有scale，所以如果tp开大的话，不能整除，不能均分地划分到每个rank上，会有一些限制。另外的话，如果attn开成DP，dense FFN是TP的话，他又会引用其他的一些通信开销，最后对attn和dense FFN都用纯DP，省去通信开销。
MOE的部署
一开始sglang的normal ep通信量跟直接开tp的通信量差不多，后面给sglang集成了deepep去做custom all2all。

Deepep

![](https://pic3.zhimg.com/v2-09081d1c6d8782d9ad272c84f9ef0524_r.jpg)
Prefill阶段用（Normal模式）下：拆分为两个stream，一个是计算的stream，一个是通信的stream，整体会结合TBO的策略，会把attn拆成几个组件，包括dispatch和combine，这两个是deepep里面通信的kernel。micro-batch1的attn正好能和micro-batch0的combine能做overlaping的，这部分是deepep结合TBO做的整体的workflow。
Decode阶段用（Low-Latency模式）下：decode阶段就会直接调用deepep的low-latency这种模式。
DeepGEMM

![](https://pic4.zhimg.com/v2-00fa2486edd2be0943fdca7e960f1413_r.jpg)
Dense的deepgemm的kernel就是适用于常规的gemm计算，Contiguous的deepgemm kernel就是适用于deepep的normal模式下（prefill阶段）的计算，Masked的deepgemm kernel就是适用于deepep的low-latency模式下（decode阶段）。
TBO（Two-batch Overlapping）

![](https://pic1.zhimg.com/v2-6a7289d4c11953bfe653ab050d2ff636_r.jpg)
在deepep和deepgemm集成好的基础上，开启TBO才是有收益的。因为TBO本身的开启是有代价的，首先你的launch kernel的代价会变成double，其次就是当你的batch size比较小的时候，TBO可能会有负优化的可能性。
只有在原先的kernel优化和集成都做得很好的基础上再做TBO，才能做到很好的计算和通信的重叠。
TBO比较大的优势：

- 瞬时的runtime的显存占用会砍半：example：原来GPU的batch size=256，开了TBO之后，真实running的batch size是会降下来到128，所以他的峰值memory占用可以降下来，另外我们也可以把原始的batch size也翻个倍，但是这种情况下一定是针对你的大batch才会有收益。Gemm kernel的集成问题：因为我们要用TBO进行overlaping的话，我们肯定是要考虑我们的attn的计算时间和dispatch的通信时间能够tuning到一个比较合适的，互相正好cover的一个程度。
Code Example（deepseekV3 Op scheduling的code）

![](https://pic1.zhimg.com/v2-e7829977d7ff491cd5f8ca3d8584f8ae_r.jpg)
DeepSeekV3的prefill阶段和decode阶段的scheduling会有一点不一样，deepep过程中prefill和decode是两个模式（Normal/Low-latency）下所以二者的scheduling会不同。
这里的operation.YieldOperation()是做切换，比如prefill阶段第一个operation.YieldOperation()是做切换，从计算的stream切换到通信的stream。
这种Op scheduling是需要针对每个模型tunning出来的，example，比如qwen的moe就没有这个Shared_expert,而DeepSeek的moe就有这个Shared_expert的计算，很多技术细节都需要针对具体的模型做Op scheduling做具体的调整。
EPLB

![](https://picx.zhimg.com/v2-102ec264cc0cce7b1ad1c8c2f6516fc1_r.jpg)
**Left**：在shared_GPT的数据集上统计出来的数据，在一些层上还算比较均衡，但是在某些层上的expert的work load会相当严重，这样就会有木桶效应，这样就会导致所有的rank在等这个expert所处的rank，出现干瞪眼的情况。

**Right**：可以看出throughput和balancedness是正相关关系，当token embeddings极其不均衡的时候，就可能大部分GPU都处于空闲状态，就一个GPU在忙，其他GPU都在等他，这种情况下GPU的利用率是比较差的，因此Throughput也比较小。

![](https://pic2.zhimg.com/v2-d9b62c6b27476a41b48294738fbafa9b_r.jpg)
**Left：**一般衡量负载均衡度使用max负载/均值负载，其实就是routing的tokens数，上图用的min负载/max负载，理论上均衡的负载是min负载=max负载，他们的Balancedness=1.0，如果使用了EPLB，我们就能把Balancedness拉回来到80%到100%之间。

**Right：**使用eplb的throughput的一些改善实验，数据比较模拟，Prefill阶段使用eplb能达到1.5倍左右的加速，在decode阶段我们能达到2.5倍左右的加速，但是实际情况还是得看实际部署的场景和实际的数据集合。

MTP

![](https://pic2.zhimg.com/v2-62f71cf548c96b4448a43d8f7c8e1619_r.jpg)
MTP：最大的优势，当我设置next token是2的话，这两个token可以通过Draft model这个很轻量级别的小模型去做decoding step，当我们推测出来这连续的几个token之后，我再去通过我们的target model去做整个verification，这个verification的过程又是并行的，所以他们整体的效率就会很高。 所以token的接受率跟mtp的收益率有关，如果token的接受率不会很高，在不高的情况下，使用mtp的收益率不会很高。
MTP和之前的所有的模式加速手段都是正交的，都可以共同使用用于进行大模型加速推理。

![](https://pic4.zhimg.com/v2-29cd4f3cee9ae51510a7e4f109a0a8e1_r.jpg)
**Left**：针对小规模的并行，不开MTP和开MTP的一些性能提升研究，next token应该设置为多少为合理的，整体情况下应该是开3-token MTP性价比是最高的。
**Right：**针对更大规模的并行，开不开MTP的性能提升的程度研究。
Deployment Configuration

![](https://picx.zhimg.com/v2-25ea76baab0a1ad7086d31aa49c18869_r.jpg)
Reproduce是nv用H20（HBM=141GB）进行复现，在prefill阶段达到H100吞吐的19%，在decode阶段到达了H100的34%，可见H20在decode阶段会更加有性价比。

Performance Breakthroughts

参照SGlang对deepseek部署博客做的性能分析

![](https://pic3.zhimg.com/v2-0c69aeb45856b330681bff41341f48e0_r.jpg)
**Left**：prefill用的是4个node，在input是1k，2k，4k的情况下，throughtput分别是5.7万，5.4万，5万的吞吐。
跟TP16部署的baseline进行性能对比，有3.3倍的性能提升，这部分性能提升有两点原因：

- 集成了高性能的deepgemm的kernel。
- 使用了two batch overlap的策略，把通信的开销掩盖，从而得到了很好的性能提升。**Right**：decode用的是9个node，对于2k的input，整个系统是达到了2.2万token的输出，跟tp的baseline进行对比的话是达到了一个5.2倍的提速，折线部分是batch size，上面是large scale的batch size，下面是tp16的batch size，上面的是下面的4倍以上。

![](https://pic4.zhimg.com/v2-3cb0b0bec0724c889ce916f323ef0795_r.jpg)

References（Works done by NV SA team，Blogs，Insights）

![](https://pic4.zhimg.com/v2-85f9e0249a343081e2882af084654ad7_r.jpg)

![](https://pic3.zhimg.com/v2-be87e36646eb6641798069e16234cfbe_r.jpg)

参考视频链接：
【大规模 EP 优化：PD 分离 MoE 并行方式】 [大规模 EP 优化：PD 分离 MoE 并行方式_哔哩哔哩_bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV16meGzBEnp/%3Fshare_source%3Dcopy_web%26vd_source%3D567e82988bfa9a884421deddb67ec26b)