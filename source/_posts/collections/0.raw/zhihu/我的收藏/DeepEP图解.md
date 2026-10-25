---
title: DeepEP图解
date: "2026-05-23 00:00:00"
updated: "2026-05-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/DeepEP图解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1972433913054994664
---


TL;DR
笔者最近在学习DeepEP的代码，作为通信优化的初学者，在感叹All2All通信库竟然能写得如此复杂、使用了如此多优化技巧的同时，趁着周末、试着用清晰的图示、通俗的语言记录学习所得，敬请纠正～

DeepEP如此复杂的原因一方面是使用了非常多CUDA编程的优化技巧、另一方面通信底层的代码实现对于初学者理解也需要较多时间。关于DeepEP精彩解读已经非常多了，本Blog主要从DeepEP Buffer布局、数据分块与任务分配、数据如何在Buffer之间流转以及推理使用等几个主要角度解读DeepEP，并试图分析DeepEP高效的原因。Blog主要以图的方式展示DeepEP的设计、希望降低读者的理解成本。 

一、推理用法
DeepEP包含Internode Normal、Intranode Normal以及Internode Low Latency三种模式，推理框架一般是通过设置token阈值在运行时决定使用哪种模式。

**Internode** **Normal**模式将通信实现为两跳:第一跳先将GPU本地的token通过RDMA转发其他结点同device_id的GPU卡上(同轨GPU)，比如node0 - GPU3将本地token发送到node0~3 - GPU 3上去，假设token选中了一个结点的多张卡也只发送token的一个备份(在node粒度做**去重**处理)；第二跳在结点内通过NVLink做token的转发。

**Intranode** **Normal**模式在rank粒度做了token去重处理，全部采用NVLink做数据传输因此能实现极高带宽。Normal模式实现为非分离的send-recv模式，即数据的收发双方是通过一个有限的window buff同时进行读写的、发一点收一点。参考[DeepSeek-V3 Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2412.19437)的部署模式，Prefill适合使用Normal模式，因为Prefill的EP小且token多，一个结点内存储的Expert多、token选中结点内多张GPU的概率大，有去重的必要性；且token量大，适合用环形的窗口buffer来做收发双方的数据互传、而不是分配一个能容纳所有token的comm buffer。

**Internode** **Low Latency**模式实现为分离的send&recv，即先完成数据的发送、再完成数据的接受，两者不是同时进行的；send阶段先将token通过RDMA or NVLink转发到目标GPU卡，由于RDMA的数据传输是异步的，send阶段在完成数据下发后就可以释放SM的占用并返回hook函数。如[tbo low-latency](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/blob/main/figures/low-latency.png)所示，TBO(Two Batch Overlap)可以做到一个Batch占用SM做GEMM or Attn计算、另一个Batch做异步的RDMA网络传输；recv阶段从comm buffer里将token拷贝出来，为调用MoE GEMM做准备。参考[DeepSeek-V3 Technical Report](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2412.19437)的部署模式，一张卡上存储的expert比较少，因此做token去重带来的收益较小。

二、DeepEP设计

- **Internode** **Low Latency**Low Latency模式实现成send & recv两个阶段，send阶段将token发送到对端GPU 的rdma_recv_buffer，recv阶段将每个rank发送过来的token从rdma_recv_buffer里拷贝出来按expert次序排列，为调用MoE GEMM做准备。

![](https://pica.zhimg.com/v2-c466735ff5e90c61ba140eda4308c26c_r.jpg)Internode Low Latency Dispatch如上图所示所示，dispatch send阶段将num个token分配给若干thread block，每个thread block一次负责一个token、thread block内用topk个warp去将token的一个备份发送到对端GPU上去(每个warp负责一个dst rank)。在send前，融合了一个可选的per channel fp8量化，因此实际传输的一个msg包括token_idx + fp8 hidden + scale_inv，其中token_idx是表示某个token备份在原始hidden states中的index，这部分信息在combine时使用；当不做量化时，也需要将hiddens拷贝到rdma_send_buffer里去、因为rdma只能操作事先注册好的buffer。在send时，可以判断dst GPU是否在结点内，是则可以选择通过NVLink通信(同步的数据传输)、否则通过RDMA传输(异步的数据传输： 数据下发后，网卡异步的完成数据传输)，参考[Opt](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/pull/173)，这一招在EP比较小时还是很有效的。

每张GPU卡存储了num_local_experts个专家权重，而每个专家都可能接收所有GPU 发送过来的token、最极端的情况是每个GPU rank的所有token都选中了某个expert，因此rdma_recv_buffer的布局是[num_local_experts][num_global_ranks][num_max_dispatch_tokens_per_rank]，其中num_max_dispatch_tokens_per_rank表示每个rank的hidden states最多有多少token。由于rdma_recv_buffer预留了足够多的位置给源src GPU写，因此可能存在写不满的情况（比如红框里只有绿色部分是有效数据），这一点会在recv阶段处理。

由于RDMA数据传输是异步的，需要通过set flag的机制通知对端数据传输已经完成了、可以去读了，因此发送端在完成token的数据下发后还需要将本地token选中某个expert的计数情况、即count数据发送过去，这样对端就能知道每个rank发送了多少数据、且是否已经抵达本地了。如上图标示了一个“先发hidden数据，后发count数据”的字样。为了并行数据下发、传输，本地为每个PE(GPU rank)创建了num_local_experts个QP，每个warp根据当前token选中的rank、expert id选择QP，这样可以通过多个QP并行和dst rank通信；并获取warp在传输某个msg时需要预留的wqe_idx，当多个warp同时写一个QP时（多个相同的warp id的warp负责发送的token选中了相同的专家），需要用atomic操作预留各自的wqe_idx，因此多个warp实际上可以并行同时写一个QP的不同位置，参考函数nvshmemi_ibgda_put_nbi_warp。

recv阶段需要将每个rank发送到本地的token按照expert的次序进行排列，如上图所示，recv_x的数据布局为[num_local_experts][num_global_ranks * num_max_dispatch_tokens_per_rank]。对于一个expert，为了紧密排布每个rank发送的token，需要读取count数据计算某个rank在expert内的偏移量。这里，每个warp group负责expert内一个rank的数据复制，每个warp group通过atmoic_add计算在expert内的offset。因此，不同于comm buffer的数据布局每个rank可写的偏移是确定的，recv_x丢失了rank之间的先后次序关系，因此需要数组recv_range记录每个group写recv_x的位置(num_recv_tokens)、以及写了多少token(recv_token_begin_idx)。此外，还有一个recv_src_info数组，记录某个warp group复制的token是发送端hidden states的第几个token，在combine阶段用。

![](https://pic2.zhimg.com/v2-893fc8977d71d5cb068c89f87ffe86f3_r.jpg)Internode Low Latency Combine相较于dispatch，combine是逆过来的操作。如low_latency_combine所示，每个warp group负责expert内一个rank的数据发送。combine阶段comm buffer的数据布局为[num_global_experts][num_mas_dispatch_tokens_per_rank]，其中num_global_experts = num_local_experts * num_global_ranks。由此可见，combine阶段的comm buffer反应的是一个GPU rank本地的token选中expert的情况，最极端的情况是所有token都选中了同一个expert，因此每个expert预留的空间为num_mas_dispatch_tokens_per_rank。可见，combine和dispatch的comm buffer的大小是一样的。这样每个warp group根据recv_range和recv_src_info，将数据从recv_x搬运到comm buffer，在发送完成hidden数据后set flag告诉对端数据传输已经完成。不同于dispatch，combine阶段源端不需要告诉对端发送的数据量。这是因为在combine recv阶段，每个rank可以根据topk_idx遍历token选中的每个专家，去comm buffer的位置读comm buffer。比如假设某个token选中了expert 5，则只需要根据token_idx去索引comm buffer对应的位置。

2. **Internode** **Normal**
有时间再继续～

![](https://pic4.zhimg.com/v2-6399082badd0b11122e6383235f5c937_r.jpg)Internode Normal Dispatch
![](https://pic3.zhimg.com/v2-2b90638f8ea17dbbfba6a2ef17dd6d72_r.jpg)Internode Normal Combine