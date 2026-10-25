---
title: "NCCL和NVSHMEM的主要区别是什么？"
date: 2025-10-20
tags: [知乎]
source: https://www.zhihu.com/question/1963176103897179405/answer/1963537895559247799
---

一. 总结
两者最本质的区别就是NCCL通信还需要CPU发起，GPU作为CPU加速器而存在；NVSHMEM则是完全以GPU为中心：

- NCCL          : Compute on GPU, Communication from CPU
- NVSHMEM : Compute on GPU, Communication from GPU
![](https://pica.zhimg.com/v2-61f0adea494a34bda469dd9f3d16f19d_r.jpg?source=2c26e567)我们知道，GPU是作为CPU的加速器存在的；而主要加速的就是计算，从图像处理到AI计算；也即是计算是在GPU上的。而随着计算规模的扩大，单个GPU也难以完成所有的计算，这就需要将之前CPU上的通信方式移植到CPU上。CPU上最出名的就是基于MPI的通信，所以NCCL就是MPI在GPU上的实现。这种方式和计算类似，也需要CPU发起，采用Kernel方式由GPU执行；这种方式本质上还是以CPU为中心，会导致额外的CPU<->GPU之间的通信延迟。为了更大程度的挖掘GPU上通信的性能，不可避免的就会发展出以GPU为中心的通信方式，这就是NVSHMEM, 也是CPU上的OpenSHMEM在GPU上的实现，可以由GPU自己发起，从而减少CPU<->GPU通信消耗，并且由于计算和通信都在GPU上，因此可以为算子融合，计算通信并行等提供更多的可能。

下面分别介绍NCCL和NVSHMEM。

二. NCCL
NCCL是NVIDIA Collective Communication Library 的简称，支持P2P和集合通信 (e.g. Allreduce, Broadcast)

![](https://pic1.zhimg.com/v2-9e93be143d211f559639cd332a6ffab2_r.jpg?source=2c26e567)在通信结构上支持节点内通信(Scale-up)和节点间通信(Scale-out)：

- 节点内支持NVLINK（分为DIRECT和IPC方式)，PCIE以及SHM(共享CPU的内存)
![](https://pic1.zhimg.com/v2-d745edad634806734ae5f800e88e2e7d_r.jpg?source=2c26e567)
- 节点间支持IB和传统网络
![](https://picx.zhimg.com/v2-0514f5107efa0f9bc7466128fd134861_r.jpg?source=2c26e567)NCCL的通信协议分为LL128, LL和Simple三种，具体却别如下：

![](https://picx.zhimg.com/v2-e6d6f2007516c4eb7aca96f70be2d7b6_r.jpg?source=2c26e567)
![](https://pica.zhimg.com/v2-5cef0db3284ba6417984503fb3738bdf_r.jpg?source=2c26e567)NCCL常用的通信算法是 Ring 和 Tree，NVLS 和 CollNet 被用来优化 AllReduce，NVLS 算法也能利用特定硬件能力提升 ReduceScatter 和 AllGather 性能。

- CollNet 算法  针对网络设施能够参与集合通信，比如利用像 NVIDIA SHARP 这样的网络硬件特性，把部分运算（如 reduce）下放到网络交换机上执行，从而减少数据传输量和延迟。
- NVLS 算法  利用 NVIDIA&#39;S NVSwitch，提供了高带宽的direct GPU-to_GPU 通路。NVLS intra-node 用 NVLink SHARP, inter-node 用 CollNet 和 SHARP-enabled 交换机通信; NVLS-Tree intra-node 用 NVLink SHARP，inter-node 用 tree-based fan-out
![](https://picx.zhimg.com/v2-8138cfefa65d259e969f958e40674444_r.jpg?source=2c26e567)NCCL 所有的集合计算都是建立在通信原语上的，通信原语包括send, recv, recvReduceSend, recvCopySend, recvReduceCopySend。每个通信原语都表示一个单独的数据移动或通信模式。命名也表示执行顺序，比如 recvReduceSend，recv->reduce->send

- 每个 NCCL 通信原语具体行为进一步由被选择的通信协议决定。同步、buffer 管理、传输粒度都会根据 Simple/LL/LL128而不同。通信原语在固定、少数的源和目标的情况下优化的很好，比如 ring 和 tree 一般都只有一个源和一个目标。但对于像 all-to-all 这样的 pattern，会有 N 个源和 N 个目标，通信原语就没有那么高效了。数据在可用的 communication channels 切分，channel-level 可以并行，每个 Channel 的开始地址由 workOffset 决定，channel 中数据大小由 channelCount 决定。

![](https://pic1.zhimg.com/v2-e88c212d059ffac39fecd980ec9147b2_r.jpg?source=2c26e567)
![](https://pica.zhimg.com/v2-6dca6f17c7a8f9f53a5ccd74b6a9173a_r.jpg?source=2c26e567)

NCCL-API (With MPI) 一般调用流程如下:

- 初始化
- 创建一个NCCL-Communicator
- 广播NCCL UID
![](https://pica.zhimg.com/v2-2fe7754b705706ffcff9f6cb9a9bf4c5_r.jpg?source=2c26e567)
- Communication Calls
![](https://picx.zhimg.com/v2-963b0800c08a6f28dae83f89c37d05ce_r.jpg?source=2c26e567)
- Fused Communication Calls
- 多个ncclSend() 和ncclRecv()需要放到ncclGroupStart() 和 ncclGroupEnd()之间
![](https://picx.zhimg.com/v2-2b0b77fae3f0067f02429c855f94aa32_r.jpg?source=2c26e567)NCCL RingAllReduce在一共有 k 个 GPU 组成 ring的实现步骤如下:

- step 0: send, 每个 GPU 把他的一部分数据 send 给相邻的GPU
- step 1~k-2: recvReduceSend，每个 GPU recv 前一个 GPU 发送的数据，本地做 reduce，再发送给下一个 GPU。
- step k-1: recvReduceCopySend，在第 k-1个 step 时是最后一次做 reduce，每个 GPU 上都会 reduce 得到一块 sum 的值，reduce 结束之后做 copysend，把这块 sum 值传到相邻 GPU。
- step k~2k-3 (k-2步)：recvCopySend，此时已经不需要再做 reduce 了，就 recv, copy, send 操作就行
- step 2k-2：recv，最后一步只需要 recv 就行
![](https://pic1.zhimg.com/v2-46df899759d1fb0117b38f132bedfc36_r.jpg?source=2c26e567)
三. NVSHMEM
NVSHMEM是GPU上实现的OpenSHMEM，基于PGAS(Partitioned Global Address Space) 编程模型，将多个GPU的存储聚合成分布式全局地址空间；而且支持基于put/get的单边通信。

![](https://pic1.zhimg.com/v2-a3ec8d144cdafd86d2e7b4e548fed548_r.jpg?source=2c26e567)主要特点是支持共享的存储堆，并且以GPU为通信的中心，适用于图模式。

![](https://pica.zhimg.com/v2-3c962fd54f75241d818004ed89df2a25_r.jpg?source=2c26e567)对称对象在每个PE上分配同样的大小，主要API如下：

- Symmetric memory: nvshmem_malloc(…); 
- Private memory: cudaMalloc(…)
- Read: nvshmem_get(…); 
- Write: nvshmem_put(…); 
- Atomic: nvshmem_atomic_add(…)
- Flush writes: nvshmem_quiet(); 
- Order writes: nvshmem_fence()
- Synchronize: nvshmem_barrier(); 
- Poll: nvshmem_wait_until(…)

设备侧的nvshmem_put/get是load/store语义

![](https://pic1.zhimg.com/v2-6d9c5ed327d86ba9475df558a899af64_r.jpg?source=2c26e567)

NVSHMEM的使用流程和NCCL也是类似，

- 首先是初始化Attribute init
![](https://picx.zhimg.com/v2-8b258f59823179bf8537427468e99548_r.jpg?source=2c26e567)
- 调用put/get
![](https://pic1.zhimg.com/v2-b47a185b570a46ccb883926163ef6076_r.jpg?source=2c26e567)对于Scaleout，NVSHMEM则支持IBGDA，而不需要CPU的代理，从而将全部的操作在GPU上实现：

![](https://picx.zhimg.com/v2-d2796a97fd11491288fc6a45356c16a6_r.jpg?source=2c26e567)
参考文献

- Hu, Z., Shen, S., Bonato, T., Jeaugey, S., Alexander, C., Spada, E., Dinan, J., Hammond, J., Hoefler, T., 2025. Demystifying NCCL: An In-depth Analysis of GPU Communication Protocols and Algorithms.2. [https://docs.nvidia.com/nvshmem/api/index.html](https://link.zhihu.com/?target=https%3A//docs.nvidia.com/nvshmem/api/index.html)