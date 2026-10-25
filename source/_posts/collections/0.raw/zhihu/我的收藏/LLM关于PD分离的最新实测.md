---
title: LLM关于PD分离的最新实测
date: "2025-08-20 00:00:00"
updated: "2025-08-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/LLM关于PD分离的最新实测/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1919794916504114120
---


LLM关于PD分离的最新实测

akaihaoshuai
​​
喜欢就去做，不喜欢的才需要理由

收录于 · LLM(大语言模型)学习

188 人赞同了该文章

​目录

LLM的PD分离在一年前就有一定的了解了，可以参考文章：akaihaoshuai：LLM推理加速调研中提到的DistServe多卡解耦prefill和decode优化耗时。后来也出现了Mooncake和deepseek的PD分离方案。根据prefill的计算密集型和decode的传输密集型特征进行解偶，可以使得效率最大化，

现在vllm/sglang中都已经集成了一些PD分离的代码，最近正好有机会，深入了解并测试一下实际效果。

为什么要PD分离？
首先要了解LLM的推理可以分为两个阶段

- Prefilling：对输入的prompt，一次计算全部的kvcache，输出首token，此时的耗时为TTFT，通常在几百ms。
- Decoding：根据计算好的kvcache，迭代式的生成每一个token。耗时为TBT，通常在10～20ms。画出LLM的推理过程示意图，可以看出，当prefilling和decoding在同一个batch中时，Prefilling操作会严重影响Decoding结果的输出效率。

如果是PD分离架构

从上图可以看出，PD分离可以提高decoding部分的效率。但是从TP2变成1P1D，prefilling的卡减少，大bs、长输入时会导致TTFT变长。

另外因为prefill的计算量大，decoder阶段的传输量大，因此PD分离可以对两个阶段使用不同类型的显卡，最大化性价比。

因为相比A系列和H系列的卡，4090的算力可能在30%~50%左右，但是带宽只有10%不到，所以非常适合用于prefill阶段计算，性价比很高。

怎么进行PD分离？
PD分离-XpYd系统服务化
vLLM PD分离方案浅析当前的server框架（比如vllm、sglang）通常用于单机server。XpYd就是在这个基础上，再封装一层server代码，根据参数启动多个独立的server，分别标为prefill server和decoder server，管理不同server之间的cache调度。

相同的vllm server怎么分为prefill server和decoder server呢？其实在启动参数上并没多大区别，启动两个server服务，所有的request首先发送到prefill server，并将max_tokens设为1。处理完成后将相同的request再输入decoder server，获取输出即可。那么这两个server自然就会一个只处理prefilling、一个只处理decoding了。

# prefill server
CUDA_VISIBLE_DEVICES='0' python3 -m vllm.entrypoints.openai.api_server  \
                    --model $MODEL_NAME \
                    --port 8100 \
                    --trust-remote-code \
                    --enforce-eager \
                    --kv-transfer-config \
                    '{"kv_connector":"SharedStorageConnector","kv_role":"kv_both","kv_connector_extra_config": {"shared_storage_path": "local_storage"}}'  

# decoder server
CUDA_VISIBLE_DEVICES='1' python3 -m vllm.entrypoints.openai.api_server \
                    --model $MODEL_NAME  \
                    --port 8200 \
                    --trust-remote-code \
                    --enforce-eager \
                    --kv-transfer-config \
                    '{"kv_connector":"SharedStorageConnector","kv_role":"kv_both","kv_connector_extra_config": {"shared_storage_path": "local_storage"}}'  

# proxy server
python3 disagg_pd_proxy_server.py  
其中disagg_pd_proxy_server.py可以参考代码：https://github.com/vllm-project/vllm/blob/main/examples/online_serving/disaggregated_serving/disagg_proxy_demo.py

核心代码如下：

@app.route('/v1/completions', methods=['POST'])
async def handle_request():
    try:
        original_request_data = await request.get_json()
        prefill_request = original_request_data.copy()

        # change max_tokens = 1 to let it only do prefill
        prefill_request['max_tokens'] = 1

        # finish prefill
        async for _ in forward_request('http://localhost:8100/v1/completions',
                                    prefill_request):
            continue

        # return decode
        generator = forward_request('http://localhost:8200/v1/completions',
                                    original_request_data)
        response = await make_response(generator)
        response.timeout = None

        return response

    except Exception as e:
        print("Error occurred in disagg prefill proxy server")
当然，只是上面的简单修改还不够，vllm中的代码也要修改，要将prefill server中计算的kvcache发送到decoder server。

对于vllm server来说，每次推理前，检查当前输入的token_ids有没有处理过的kv cache缓存，如果有，则可以直接复用，即decoding处理。如果没有，则进行prefilling处理，并将kv cache保存，保存的key需要和token_ids相关。

https://github.com/vllm-project/vllm/blob/main/vllm/v1/worker/gpu_model_runner.py

基本的PD分离逻辑基本介绍完了，当初看的时候感觉是个很复杂的工程，现在用来也没有多麻烦（当然是vllm和多位大神代码集成的好，而且实际在用的话还需要很多的优化）

到这里大家就知道了，PD分离的核心其实在于cache的调度。

vllm的PD分离
vllm0.9.1版本，kv cache调度器支持的KVconnector类型如下。

下面只介绍v1版本的几种PD分离

SharedStorageConnector
https://github.com/vllm-project/vllm/blob/main/vllm/distributed/kv_transfer/kv_connector/v1/shared_storage_connector.py

从代码中可以看出主要包含save_kv_layer和start_load_kv两个函数。

- prefill阶段，会将计算的kvcache通过save_kv_layer函数保存到本地文件夹中。
- decoder阶段，会通过start_load_kv函数从本地文件夹中读取kvcache。

测试发现，代码中目前只支持1P1D，且prefill_tp_size=decoder_tp_size=1。

若要支持prefill_tp_size != decoder_tp_size，则需要修改代码：在save_kv_layer中增加rank标记，保证多rank同时保存时不互相覆盖。在start_load_kv函数中增加读取多个rank读取cache，并根据当前server的tp数量进行cache拆分的逻辑。

分析：从代码中可以看出，在prefill和decoder之间有文件保存和读取操作，会大幅影响结果耗时。

P2pNcclConnector
从代码中可以看出，P2pNcclConnector相比于SharedStorageConnector，就是把safetensors save/load操作换成了nccl的send和reciver操作。

NCCL（NVIDIA Collective Communications Library）是 NVIDIA 提供的一个用于多 GPU 和多节点之间高效通信的库。它主要用于深度学习和高性能计算（HPC），支持常见的集合通信操作，如 AllReduce、Broadcast、Reduce、Scatter 和 Gather 等。

- 特点：
- 高性能：针对 NVIDIA GPU 进行优化，支持 PCIe、NVLink 和 InfiniBand。
- 多节点扩展：支持跨多个节点的 GPU 通信。
- 支持多种数据类型和通信模式（LL、LL128、SIMPLE 协议等）。
- 可配置参数（如 NCCL_PROTO, NCCL_ALGO, NCCL_MAX_NCHANNELS）以优化性能。

使用NCCl在GPU之间直接处理数据，大幅降低了数据传输耗时。

NCCL 负责 GPU 间的数据传输，而 ZMQ 仅用于控制信道（metadata 交换）。两者配合使用，但并不直接通过 ZMQ 传输张量数据。

# 在 P2pNcclEngine 中：
self.nccl = NCCLLibrary(library_path)  # 初始化 NCCL 库
self._create_connect(remote_address)  # 使用 ZMQ 发起连接请求，并初始化 NCCL Comm
self._send(comm, tensor, dst, stream)  # 实际调用 ncclSend 进行 GPU 数据传输

LMCacheConnectorV1——LMCache
https://github.com/LMCache/LMCache封装了一层LMCache调用逻辑。

LMCache是一个针对vllm的cache复用框架。主要优点

- 减少推理时间：通过重用缓存的 KV 张量消除冗余计算（通过CPU以及磁盘缓存，可以保存更多的cache）
- 更高的吞吐量：处理处理过的文本，节省 GPU 周期
- 内存效率：分层存储系统优化 GPU、CPU 和磁盘的内存使用率
- 非前缀缓存：支持缓存任何文本片段，而不仅仅是前缀（decoding过程的cache也可以全部保存）
- 框架集成：与 vLLM 服务堆栈无缝集成（推理直接调用vllm，保存vllm的cache）

入口https://github.com/LMCache/LMCache/tree/dev/lmcache/integration/vllm/vllm_v1_adapter.py的LMCacheConnectorV1Impl类。

根据类型，选择创建SCHEDULER还是SERVER WORKER

在vllm中的调用过程

prefill阶段调用流程：save_kv_layer  -   self._lmcache_engine.save_kv_layer  -   self.lmcache_engine.store_layer

decoder阶段调用流程：start_load_kv -   self._lmcache_engine.start_load_kv  -   self.lmcache_engine.retrieve_layer

可以看出storage_manager是存储管理。gpu_connector是负责数据传输。

StorageManager包含storage_backends，主要支持NixlBackend、LocalCPUBackend、LocalDiskBackend和RemoteBackend等类。其中分别是通过本地GPU、本地CPU、本地disk和跨结点传输数据。（Nixl是nvidia开源的gpu传输技术，后面会单独开一节详细介绍）跨结点传输包含了mooncake实现。

vllm_Connector支持下面几种，外部支持调用的是最后三种。

Connector总结对比

KV 缓存请求流程和数据处理管道

LMCache还有一个enable_blending功能，可以支持kvcache的位置编码解耦，从而能够复用非前缀缓存，进一步提高推理效率。

NixlConnector——nixl
NixlConnector中使用了nvidia-smi的nixl库进行通信，其他用法和P2pNcclConnector没有什么区别。

nixl的具体内容以及nixl和nccl的比较放到下面的dynamo一节中详细讲解。

sglang的PD分离
Deploying DeepSeek with PD Disaggregation and Large-scale Expert Parallelism on 96 H100 GPUs
https://github.com/sgl-project/sglang/issues/4655
https://docs.sglang.ai/backend/pd_disaggregation.html收到输入请求后，工作流程如下：

- 预填充服务器和解码服务器通过握手配对，分别建立本地发送方和接收方。
- 解码服务器预先分配 KV 缓存，向预填充服务器发出信号，开始模型前向传递并计算 KV 缓存。
- 一旦计算完成，数据就会传输到解码服务器，由其处理迭代令牌生成。

 

github代码详解
代码框架如下

Engine中创建Scheduler。

PrefillBootstrapQueue和DecodePreallocQueue中都会创建kv_manager对kv cahce进行管理

支持mooncake和nixl后端。

状态值

调用/v1/chat/completions接口时，会走到generate接口 --  _global_state.tokenizer_manager.generate_request()  --  self._send_one_request() --  self.send_to_scheduler.send_pyobj()，将request发送到两个server的scheduler。

prefill server处理流程

1、在schedule中调用handle_generate_request()- _add_request_to_queue()处理新的request。

2、在_add_request_to_queue()中调用调用PrefillBootstrapQueue().add()将 request添加到queue中。并添加到schedule.waiting_queue中。

3、后台运行的event_loop_normal_disagg_prefill()检测到queue中包含未处理的req，进行处理。

4、在process_batch_result_disagg_prefill()中通过disagg_kv_sender发送处理过的kv cache。

decode server处理流程

1、在schedule中调用handle_generate_request()- _add_request_to_queue()处理新收到的request。

2、在_add_request_to_queue()中调用调用DecodePreallocQueue().add()将 request添加到queue中。并添加到schedule.waiting_queue中。

3、后台运行的event_loop_overlap_disagg_decode() --  process_decode_queue() 检测到queue中包含未处理的req，进行处理。

其中MooncakeKVManager使用的Mooncake开源项目，NixlKVManager使用的nixl开源项目

Mooncake
Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving
https://github.com/kvcache-ai/Mooncake
Mooncake 最新进展：SGLang 和 LMCache 基于 Mooncake 实现高效 PD 分离框架
Mooncake (1): 在月之暗面做月饼，Kimi 以 KVCache 为中心的分离式推理架构
Mooncake阅读笔记：深入学习以Cache为中心的调度思想，谱写LLM服务降本增效新篇章
从MoonCake看大模型推理的PD分离，太快会扯到蛋吗？论文介绍了Mooncake，这是一个为LLM服务设计的KVCache中心分布式架构，旨在高效处理高并发请求并满足SLO。Mooncake通过分离预填充和解码集群，利用GPU集群中的闲置资源构建分布式KVCache，并采用KVCache中心调度器来优化请求调度。

arxiv
Mooncake 采用分解式架构，不仅将预填充节点与解码节点分离，还将 GPU 集群的 CPU、DRAM、SSD 和 RDMA 资源分组，以实现分解式 KVCache。这种分解式缓存能够充分利用未充分利用的资源，提供充足的缓存容量和传输带宽，从而实现高效的近 GPU 前缀缓存，而无需额外成本。

论文详细介绍了Mooncake架构的设计，该架构以KVCache为中心，通过分离预填充和解码集群，并利用GPU集群中未充分利用的CPU、DRAM和SSD资源实现KVCache的分布式缓存。具体方法如下：

- 分离预填充和解码集群：预填充阶段主要处理输入令牌的并行计算，而解码阶段则逐个处理输出令牌。通过分离这两个阶段，可以针对它们不同的计算特性进行优化。
- 分布式KVCache设计：利用GPU集群中的闲置资源构建分布式KVCache，提高缓存容量和传输带宽，实现高效的近GPU前缀缓存。
- KVCache中心调度器：核心是KVCache中心调度器（Conductor），它负责根据当前KVCache分布和工作负载调度请求，并根据需要复制或交换KVCache块。
- 请求处理流程：对于每个请求，Conductor选择一对预填充和解码实例，并按照以下步骤调度请求：

- KVCache重用：预填充实例根据请求的前缀缓存块ID从远程CPU内存加载KVCache到GPU内存，以启动请求处理。
- 增量预填充：预填充实例完成预填充阶段，并将新生成的增量KVCache存储回CPU内存。如果未缓存的输入令牌数量超过一定阈值，则将预填充阶段拆分为多个块，并以流水线方式执行。
- KVCache传输：使用基于RDMA的Messenger服务在节点间管理和传输这些缓存，将模型各层生成的KVCache流式传输到目标解码节点的CPU内存，减少等待时间。
- 解码：解码节点在接收到所有KVCache后，将请求加入下一批次进行连续批处理。Conductor根据当前负载预选解码节点，以确保不违反TBT SLO。
- 缓存感知调度：在预填充阶段，调度器会根据请求的前缀缓存匹配长度和实例负载选择预填充实例，以平衡缓存重用和负载均衡。
- 缓存负载均衡：通过自动复制热点KVCache块，将它们分布到多个机器上，以避免缓存获取拥塞。

统计了线上的输入和输出：平均输入长度为 7,590 个 token，平均输出长度为 182 个 token。

比较了三种缓存策略：LRU、LFU 和 LengthAwareCache。

将缓存容量从 1,000 个块增加到 50,000 个块，缓存命中率会从 30% 提升到 50%。继续增加则没有明显改善。

- CPP（chunked pipeline parallelism）输入越来越长，需要做chunk_prefill，继续提升：对于每个请求，其输入令牌会被划分为多个块，每个块的长度不超过p⁢r⁢e⁢f⁢i⁢l⁢l⁢_⁢c⁢h⁢u⁢n⁢k。同一请求的不同块可以由不同的节点同时处理，从而实现并行处理并减少 TTFT。

- Layer-wise Prefill理论上，如果一个请求的 KVCache 大小为S，处理时间为T，则其占用成本为S∗T。如果在分块预填充中，将请求分块处理，并将每个分块的处理与其他解码请求内联，则T会增加，导致占用成本更大。

 不同请求长度的 KVCache 存储延迟

- Prefill Global Scheduling在 Mooncake 中，预填充实例的选择不仅考虑负载，还考虑前缀缓存命中长度以及可重用 KVCache 块的分布。

对于每个新请求，其输入令牌会被分成多个块，并为每个块计算一个哈希键。这涉及生成一个块中令牌的哈希键，该哈希键与前一个块的哈希键（如果可用）连接。然后将请求的块键与每个预填充实例的缓存键逐一进行比较，以确定前缀匹配长度 (p⁢r⁢e⁢f⁢i⁢x⁢_⁢l⁢e⁢n)。

利用这些匹配信息，Conductor 会根据请求长度和p⁢r⁢e⁢f⁢i⁢x⁢_⁢l⁢e⁢n（因实例而异）估算相应的执行时间。然后，它会添加该请求的预计等待时间，以获得该实例的 TTFT。最后，Conductor 将请求分配给 TTFT 最短的实例，并相应地更新该实例的缓存和队列时间。

- Cache Load Balancing每台预填服务器都管理着自己的一组本地前缀缓存。这些缓存的使用频率差异很大。

解决此 KVCache 调度问题的一个简单解决方案是收集每个块的全局使用情况，使用预测模型预测其未来使用情况，并据此做出调度决策。

如果预估的额外预填充时间短于传输时间，则指挥者会将缓存位置和请求转发到备用实例。此实例会主动从持有者处检索 KVCache 并将其存储在本地。更重要的是，我们倾向于在最佳远程前缀匹配长度不大于当前本地可重用前缀乘以阈值1这两种策略不仅可以减少请求的预填充时间，还可以促进热点缓存的自动复制。

- Early Rejection预填充或解码实例的负载并不能准确反映系统实际处理的请求数量。这种差异是由于单个请求的预填充和解码实例调度之间存在时间差造成的。

为了解决这个问题，很自然地需要将解码实例的负载评估提前到预填充阶段开始之前。请求到达后，Conductor 会根据预填充池和解码池中较大的负载来评估是否接受该请求。早期拒绝 (Early Rejection) 可以显著减少因被拒绝请求而导致的无效计算，并增强负载均衡。

经过进一步研究，我们发现这种负载波动问题的根源在于预测解码负载与实际执行之间的时间滞后。基于当前解码负载的调度本质上存在延迟。

- 效果测试每个node配置8 块 NVIDIA-A800-SXM4-80GB GPU，通过 NVLINK 连接；配备 RDMA 网卡，节点间互联带宽最高可达 800Gbps。

Mooncake-[3P+1D] 的吞吐量分别比 vLLM-[4M] 提高了 20% 和 40%，同时满足服务水平目标 (SLO)。

尽管 Mooncake-[2P+2D] 拥有较低的 TBT 延迟，但在 TTFT 指标上的表现不如 Mooncake-[3P+1D] 和 vLLM-[4M]。

github代码框架
Mooncake 由三个主要组件组成，它们协同工作以实现高效的分解 LLM 服务：Transfer Engine、Mooncake Store和P2P Store

- Transfer Engine它通过调度程序架构支持 TCP、RDMA （InfiniBand/RoCEv2）、NVLink 和 NVMe-oF 协议。提供跨多个协议和存储设备的统一、高性能数据传输。

- 多协议支持：根据拓扑和可用性自动选择协议
- 带宽聚合：利用多个 RDMA NIC 设备来提高吞吐量
- 拓扑感知路由：根据 NUMA 关联性和设备位置选择最佳传输路径
- 容错：出现网络错误时自动故障转移到替代路径

- Mooncake Store专为 LLM 推理工作负载设计的分布式 KVCache 存储引擎

- 多副本支持：存储同一对象的多个副本，以缓解访问热点
- 并行 I/O：支持大型对象的数据条带化和并行传输
- 内存管理：集成以实现高效的内存段分配BufferAllocatorManager
- 协调：用于元数据管理和对象生命周期控制MasterService 

- P2P Store：为 checkpoint 转移、模型权重分配等场景提供去中心化的临时对象共享。

Dynamo/nixl
https://github.com/ai-dynamo/dynamo
怎么看英伟达GTC新发布的推理框架Dynamo
Nvidia Dynamo 详解一
Dynamo 与推理引擎无关，支持 TRT-LLM、vLLM、SGLang 等，并捕获 LLM 特定的功能，例如：

- 分解预填充和解码推理- 最大化 GPU 吞吐量并促进吞吐量和延迟之间的权衡。
- 动态 GPU 调度- 根据波动的需求优化性能。
- LLM 感知请求路由- 消除不必要的 KV 缓存重新计算。
- 加速数据传输- 使用 NIXL 减少推理响应时间。
- KV 缓存卸载- 利用多个内存层次结构实现更高的系统吞吐量。
Dynamo 采用了 NIXL 技术，这项技术旨在通过减少同步和智能批处理来加快传输速度。为了实现最佳性能和可扩展性，Dynamo 充分利用了 Rust 和 Python 的优势。。

nixl
https://github.com/ai-dynamo/nixlNIXL 解决了分布式推理工作负载面临的复杂挑战，尤其是在网络和通信方面。这些挑战包括高性能要求、跨内存和存储的异构数据路径以及动态扩展的需求。NIXL 通过支持多个后端插件（如 UCX、GDS 和其他协议）的多功能 API，跨内存类型（HBM、DRAM、本地/远程 SSD）和存储系统提供高带宽、低延迟的点对点数据传输和统一抽象。

NIXL 通过内存部分抽象出各种内存类型，允许跨异构系统进行统一的内存处理。Memory 部分表示可访问以进行数据传输的已注册内存段。

内存类型描述DRAM_SEG系统内存 （RAM）VRAM_SEGGPU 内存 （VRAM）FILE_SEG文件存储BLK_SEG块存储设备OBJ_SEG对象存储NIXL 目前支持以下后端技术：

- UCX （Unified Communication X）：用于高性能网络的通信框架。
- GDS （GPUDirect Storage）：NVIDIA Magnum IO GPUDirect Storage，用于在 GPU 内存和存储之间直接传输数据。
- UCX_MO （UCX Memory Operations）：UCX 的扩展，专注于内存作。

gdrcopy
GDRCopy 是一个基于 NVIDIA GPUDirect RDMA 技术构建的低延迟 GPU 内存复制库。它支持从 CPU 直接访问 GPU 内存，与传统的 CUDA 内存操作相比，数据传输延迟显著降低。

- 非常低的开销：GDRCopy 操作由 CPU 驱动，典型操作的开销仅为 0.1-0.2μs，而传统操作的开销为 6-7μs cudaMemcpy。
- 高带宽：在支持的平台上，写入操作（主机到设备）可以达到 6-8 GB/s。
- 直接内存访问：应用程序可以直接读取和写入 GPU 内存，而无需中间复制。

测试脚本

vllm
#!/bin/bash
# This file demonstrates the example usage of disaggregated prefilling
# We will launch 2 vllm instances (1 for prefill and 1 for decode),
# and then transfer the KV cache between them.

set -xe

MODEL_NAME="/opt/llm/input/pretrain/Qwen--QwQ-32B"
MAX_MODEL_LEN=32768
GPU_MEMORY_UTILIZATION=0.95
gpu_id_prefill="0,1"
gpu_id_decoder="2,3"
kv_cache_type="SharedStorageConnector"  # SharedStorageConnector/ LMCacheConnectorV1 / NixlConnector

# Trap the SIGINT signal (triggered by Ctrl+C)
trap 'cleanup' INT

export VLLM_HOST_IP=$(hostname -I | awk '{print $1}')

# a function that waits vLLM server to start
wait_for_server() {
  local port=$1
  timeout 1200 bash -c "
    until curl -s localhost:${port}/v1/completions   /dev/null; do
      sleep 1
    done"    return 0 || return 1
}

# You can also adjust --kv-ip and --kv-port for distributed inference.
gpu_count_prefill=$(echo "$gpu_id_prefill" | tr ',' '\n' | wc -l)
gpu_count_decode=$(echo "$gpu_id_decoder" | tr ',' '\n' | wc -l)

    echo "Using LMCacheConnectorV1 for kv cache"
        # prefilling instance, which is the KV producer
    CUDA_VISIBLE_DEVICES=$gpu_id_prefill python3 -m vllm.entrypoints.openai.api_server  \
                    --model $MODEL_NAME \
                    --disable-log-requests \
                    --port 8100 \
                    --max-model-len $MAX_MODEL_LEN \
                    --gpu-memory-utilization $GPU_MEMORY_UTILIZATION \
                    --trust-remote-code \
                    --enforce-eager \
                    --tensor-parallel-size $gpu_count_prefill \
                    --kv-transfer-config \
                    '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_producer","kv_connector_extra_config": {"discard_partial_chunks": false, "lmcache_rpc_port": "producer1"}}'  

    CUDA_VISIBLE_DEVICES=$gpu_id_decoder python3 -m vllm.entrypoints.openai.api_server \
                    --model $MODEL_NAME  \
                    --disable-log-requests \
                    --port 8200 \
                    --max-model-len $MAX_MODEL_LEN \
                    --gpu-memory-utilization $GPU_MEMORY_UTILIZATION \
                    --trust-remote-code \
                    --enforce-eager \
                    --tensor-parallel-size $gpu_count_decode \
                    --kv-transfer-config \
                    '{"kv_connector":"LMCacheConnectorV1","kv_role":"kv_consumer","kv_connector_extra_config": {"discard_partial_chunks": false, "lmcache_rpc_port": "consumer1"}}'  

          
# wait until prefill and decode instances are ready
wait_for_server 8100
wait_for_server 8200

python3  disagg_pd_proxy_server.py  

output2=$(curl -X POST -s http://localhost:8000/v1/completions \
    -H "Content-Type: application/json" \
    -d '{
    "model": "'$MODEL_NAME'",
    "prompt": "hello. Santa Clara is a",
    "max_tokens": 10,
    "temperature": 0
}')
lmcache最好从官方docker中安装

sglang
参考：sglang Dense LLM PD分离部署

同一个PD组中，P/D的tp_size需要相同，可以设置多个P或者多个D。

#!/bin/bash

MODEL_NAME="Qwen/Qwen3-0.6B"
MAX_MODEL_LEN=32768
gpu_id_prefill=0,1
gpu_id_decoder=2,3
GPU_MEMORY_UTILIZATION=0.95

# prefill
echo "async start prefill server."
CUDA_VISIBLE_DEVICES=$gpu_id_prefill python3 -m sglang.launch_server --model-path $MODEL_NAME \
    --disaggregation-mode prefill \
    --context-length $MAX_MODEL_LEN \
    --tp-size $gpu_count_prefill \
    --disable-radix-cache \
    --mem-fraction-static $GPU_MEMORY_UTILIZATION \
    --disaggregation-transfer-backend $disaggregation_transfer_backend \
    --trust-remote-code  \
    --page-size 16 \
    --port 8100  

# decoder
echo "async start decoder server."
CUDA_VISIBLE_DEVICES=$gpu_id_decoder python3 -m sglang.launch_server --model-path $MODEL_NAME \
    --disaggregation-mode decode \
    --context-length $MAX_MODEL_LEN \
    --tp-size $gpu_count_decoder \
    --disable-radix-cache \
    --mem-fraction-static $GPU_MEMORY_UTILIZATION \
    --disaggregation-transfer-backend $disaggregation_transfer_backend \
    --trust-remote-code \
    --page-size 16 \
    --port 8200  

echo "start schedule server."
python3 -m sglang.srt.disaggregation.mini_lb \
    --prefill http://localhost:8100 --decode http://localhost:8200 --host 0.0.0.0 --port 8002   

# 多个prefill和decoder node 链接：https://blog.csdn.net/u013701860/article/details/147745303

结论
1、实测对于超长上下文+大模型+高并发，PD分离可以始终保持TBT在一个很稳定的状态，吞吐量可以提升20%~50%不等。一般来说，至少也要输入 8k、输出 100、并发 10、模型大于32B左右，才有一些效果。

2、PD分离优化的是TBT，对TTFT没有提升。

3、PD分离时，如果prefill server少太多，可能会导致prefill阶段的计算能力不够，从而使TTFT变慢。因此Pod4改成3P1D差不多，2P2D一般不太行。但是实际上prefill只有一次，而decoder要很多遍，因此1P2D的配置可以更好的提高整体serve的资源利用率。

4、PD分离时的prefill tp_size和decoding的tp_size可以不同。server数量也可以不同。server数量可以根据流量动态的增加和减少。

5、kv cache传输人有GPU、CPU和disk等多种方式，其中GPU最快，基本可以保持原本的TTFT，其他都会导致TTFT变慢。NCCL需要在初始化时就确定全部的GPU，因此不适合于规模动态调整的PD分离场景，且不支持cpu和disk传输，Mooncake在此基础上进行了统一，支持多种传输方式。Dynamo也重新封装了一层nixl传输协议。

6、request调度是PD分离的核心，不能只考虑负载均衡，还要考虑cache复用率、显存剩余空间等。

7、PD分离后，会存在Prefill server宽带利用率低，decoder server的GPU利用率低的情况。

NVIDIA Dynamo的PD分离有问题？我们提出的大模型推理系统"肾上腺素"，是良药！8、PD分离适用于bs较大、输入、输出都比较长的场景。普通场景没必要折腾。能单卡跑的没必要多卡，能单机承载的没必要多机。

9、PD分离优势——异构框架：计算性能极强但传输带宽较低的GPU进行prefill，使用计算能力一般但传输带宽很高的GPU进行decoding。这样才能更好的发挥优势。

参考文章
PD分离-XpYd系统服务化

vLLM PD分离方案浅析

https://github.com/LMCache/LMCache

Deploying DeepSeek with PD Disaggregation and Large-scale Expert Parallelism on 96 H100 GPUs

https://github.com/sgl-project/sglang/issues/4655

https://docs.sglang.ai/backend/pd_disaggregation.html

Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving

https://github.com/kvcache-ai/Mooncake

Mooncake 最新进展：SGLang 和 LMCache 基于 Mooncake 实现高效 PD 分离框架

Mooncake (1): 在月之暗面做月饼，Kimi 以 KVCache 为中心的分离式推理架构

Mooncake阅读笔记：深入学习以Cache为中心的调度思想，谱写LLM服务降本增效新篇章

从MoonCake看大模型推理的PD分离，太快会扯到蛋吗？

https://github.com/ai-dynamo/dynamo

https://github.com/ai-dynamo/nixl

怎么看英伟达GTC新发布的推理框架Dynamo

Nvidia Dynamo 详解一

https://github.com/NVIDIA/gdrcopy

sglang Dense LLM PD分离部署

NVIDIA Dynamo的PD分离有问题？我们提出的大模型推理系统"肾上腺素"，是良药！

编辑于 2025-08-20 23:50・浙江
LLM

​赞同 188​​21 条评论​430 ​12 ​分享

​申请转载​​

未登录用户

21 条评论

默认
最新

maja

周一刚搭建了一个，根据我的 P4D9 实测，这个图其实还存在一个问题，TTFT 回多一个 prefill -  decode, FP8 RDMA 约 58GB/s, IB NVL 约 118 GB/s, 一个 2k 输入，TTFT 大概增加几十 ms, 但是 一旦fullly run , 并且 batch size 8k 把这些生成的 kv cache  从 prefill 传到 decode 带来的 延迟就略高，有几十秒，此时传输就成瓶颈了。

2025-07-08 · 中国香港

​回复​1

maja

更新下, 评测文章地址 ：​https://huggingface.co/blog/yiakwy-xpu-team/h800x104-disagg-serving-on-sglang

2025-07-25 · 中国香港

​回复​喜欢

知乎用户76102

大佬，请问我看官方支持的是1P1D，但是两卡都在同一个节点。能使用两个通过交换机互联的主机实现1P1D吗？

03-17 · 湖南

​回复​喜欢

akaihaoshuai

作者

啥意思，两卡在同一节点的话，应该默认使用nvlink，你是不想用快的想用交换机？
03-18 · 浙江

​回复​喜欢

付之一笑

如果想看mooncake代码，应该从哪入手呢？

2025-12-24 · 中国香港

​回复​喜欢

akaihaoshuai

作者

下个qoder，打开mooncake源码，让它给你梳理
2025-12-25 · 浙江

​回复​1

zxp

赞一个，写的很好

2025-11-26 · 新加坡

​回复​喜欢

易晓东

​

对于结论部分的第二点，相比于非PD分离的情况，对于TTFT应该也还是会有提升？毕竟非PD分离的时候，新请求的prefill需要等到上一轮decode结束才能开始执行?

2025-07-14 · 广东

​回复​喜欢

akaihaoshuai

作者

我的理解是，总卡数一定的情况下，PD分离下做prefill的卡数一定会少于非PD分离的卡数，因此在不考虑其他优化的情况下，PD分离的TTFT只会慢于非PD分离。

只不过PD分离可以加速TBT，从而使得总吞吐量更大。

我现在测的一些场景，PD分离后速度都没有快很多

2025-07-15 · 浙江

​回复​1

展开其他 4 条回复​

桑榆and东隅

UCX_MO （UCX Memory Operations）-- 请问这个MO的解释是哪里找到的？

2025-06-30 · 北京

​回复​喜欢

akaihaoshuai

作者

​https://github.com/ai-dynamo/nixl/tree/main/benchmark/nixlbench

2025-08-20 · 浙江

​回复​喜欢

lusfie

给博主点个赞，是我见到的分析最细节最全面的SGLang pd分离源码的教程了

2025-06-30 · 北京

​回复​喜欢

做那自由的风

给博主点个赞，是我见到的分析最细节最全面的SGLang pd分离源码的教程了

2025-06-30 · 北京

​回复​喜欢

时间的彷徨

写的太好了

2025-06-25 · 北京

​回复​喜欢

熊超

4090 half算力比a100高吧，甚至还有fp8的单元单元

2025-06-23 · 北京

​回复​喜欢

akaihaoshuai

作者

对，4090 FP16的算力更高，带宽很小

2025-06-23 · 浙江

​回复​喜欢

点击查看全部评论

未登录用户

关于作者

akaihaoshuai​​
喜欢就去做，不喜欢的才需要理由

回答
8
文章
100
关注者
3,579

​关注​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

七天入门LLM大模型 | 第六天：大模型量化及低成本部署最佳实践
魔搭社区

LLM百倍推理加速之稀疏篇
前言众所周知的是，在GPU上对LLM有着三个核心的影响因素：(1) GPU计算总量 (2) GPU输入/输出 (IO) (3) GPU的显存大小。值得注意的是，对于当今的LLM模型而言，因素 (2) 是影响推理阶段的主…

Zachary

10倍性能 LLM sampler 优化
LLM的采样器占用的时间并非不可忽略，尤其是在大模型中的小模型中，sampler占用了过多的时间，这是因为sampler基本都是采用pytorch原生算子，尤其是在top-k top-p逻辑中使用了sort cumsum等…

阿嚏

为什么LLM一般使用较大的权重衰减系数？
Nil-9发表于浅度学习