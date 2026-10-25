---
title: vLLM 分布式并行与通信全景
date: "2026-07-28 00:00:00"
updated: "2026-07-28 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/vLLM-分布式并行与通信全景/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2065444514379178422
---


本文从完整请求数据流出发，说明 vLLM 在不同并行配置下如何放置权重、KV cache 和 token，以及模型 forward、采样、状态迁移和运行时协调中会发生哪些通信。

vLLM变化实在太快，本文的版本基线是 <strong>vLLM v0.26.0</strong>。并行 gate、attention backend、Connector 注册表和运行时限制都可能随版本变化；文中当前版本均指这一基线。

严格地说，PP 的 stage 间激活传输、P/D 分离的 KV cache 迁移、EPLB 的 expert 权重搬运都不是 collective。为了能从部署角度完整定位流量，本文把通信分为四类：

- <strong>模型数据面 collective</strong>：AllReduce、AllGather、ReduceScatter、AllToAll、Broadcast；
- <strong>模型数据面 P2P</strong>：PP stage 间 hidden states、EPLB/Elastic EP 的 expert 权重；
- <strong>跨实例状态传输</strong>：P/D 分离、KV offload/persistence 使用的 KV Connector；
- <strong>控制面通信</strong>：调度 RPC、元数据广播、DP 对齐、barrier、握手和完成通知。
## 0. 先区分通信类型、逻辑阶段与实际 primitive

--enable-expert-parallel` 决定 MoE expert 权重采用 TP shard 还是 EP placement，但它不直接决定底层一定执行物理 AllToAll。

本文使用以下记号：

记号含义AR[G]group G 内的 AllReduceAG[G] / AGV[G]group G 内的定长/变长 AllGatherRS[G] / RSV[G]group G 内的定长/变长 ReduceScatterA2A(V)[G]group G 内的定长/变长 AllToAllBcast[G]从一个 source rank 向 group G 广播P2P[G]group G 内相邻或指定 ranks 间的 send/recv、isend/irecvKV-Xfer[P→D]两个 vLLM 实例之间由 KV Connector 执行的 KV block 传输；不是 process-group collectiveEC-Xfer[E→P/D]多模态 Encoder 与下游实例之间由 EC Connector 执行的 encoder-cache tensor 传输Barrier[G]group G 的控制面同步；不携带模型 activationSP-chunk[TP]在 TP ranks 间沿 token 维做本地切分，不产生通信EP dispatch/combinetoken 到 expert owner、再返回 source rank 的逻辑阶段vLLM 默认使用：

all2all_backend = allgather_reducescatter
当模型进入逻辑 dispatch/combine 路径时，默认 backend 的物理 process group 取决于 MoE sequence parallel、DP 和 PCP：

SP 路径：              AGV[EP]  dispatch -> local expert compute -> RSV[EP]  combine
非 SP 且 DP>1：        AGV[DP]  dispatch -> local expert compute -> RSV[DP]  combine
非 SP、DP=1、PCP>1：   AGV[PCP] dispatch -> local expert compute -> RSV[PCP] combine
纯 `TP+EP、DP=1、PCP=1` 在当前版本不会进入 MoE-SP；默认 backend 选择到的 PCP group 大小为 1，因此没有 token dispatch 通信，routed expert contributions 最后仍由 `AR[TP]` 合并。使用 DeepEP、FlashInfer、MoRI、NIXL 等 backend 时，逻辑阶段可以映射为相应的稀疏 A2A 式交换，但是否真的启用 dispatch/combine 仍受模型接入、并行组合和 backend gate 约束。后文图中统一标注逻辑阶段，并在图注中说明实际 backend 和通信域。

### 0.1 稳态数据面、可选状态迁移和控制面

源码中出现了某个 collective不等于每个 token 都会执行它。本文按触发频率进一步区分：

- <strong>每层或每 step 的稳态数据面</strong>：TP 的 `AR`、MoE dispatch/combine、DCP attention combine、PP activation P2P；
- <strong>每 step 的小消息协调</strong>：DP token-count/CUDA Graph 对齐、PP sampled-token broadcast；
- <strong>低频或按需状态迁移</strong>：EPLB expert 重排、Elastic EP 扩缩容、P/D KV transfer、KV offload；
- <strong>初始化/析构</strong>：process-group 建立、IPC handle/object 收集、buffer reservation、barrier。性能分析时应分别统计这些路径。把初始化 barrier 或 P/D 的 RDMA 流量算进稳态 NCCL collective，会得到错误结论。

### 0.2 vLLM 的通信域

工作区版本按下面的逻辑维度排列 ranks：

ExternalDP × DP × PP × PCP × TP
其中 DCP 不增加 worker：无 PCP 时在 TP group 内切子组；有 PCP 时可以复用 PCP 轴，或覆盖完整 `TP×PCP` block。核心通信域为：

Group成员关系主要用途TP固定 DP/PP/PCP 坐标，只改变 TP rankdense/attention/LMHead tensor shard 的归并与收集PP固定 DP/PCP/TP 坐标，只改变 PP stage相邻 stage activation P2P；末级采样结果 broadcastPCP固定 DP/PP/TP 坐标，只改变 PCP rankMRV2 MLA prefill token partition、latent-cache input gather 和最终 hidden-state restoreDCP不增加 worker；无 PCP 时复用 TP ranks，有 PCP 时跨 PCP 或完整 TP×PCPdecode KV token shard 与 partial attention combineDP固定 PP/PCP/TP 坐标，只改变 DP rankDP 调度对齐；coordinated MoE 的 AGV/RSVEP同一 PP stage 内展平 DP × PCP × TProuted expert placement 与 token dispatch/combineEPLB与 EP 成员相同、但使用独立 process group隔离 expert 权重重排通信，避免与 MoE forward collective 串流死锁WORLD / INNER_DP_WORLD全局或单个 DP replica 内的所有 model workers初始化、执行器协调和少量控制面操作因此：

worker 数（单个 ExternalDP 域） = DP × PP × PCP × TP
EP_SIZE = DP × PCP × TP
DCP 不改变 worker 数
EP 不跨 PP stage，因为每个 PP stage 只拥有自己那部分 MoE layers。P/D 分离则位于这些 process groups 之外：Prefill 和 Decode 是两套独立 vLLM 实例，各自建立自己的通信域。

当前 PCP 实现还有两个重要组合限制：`PCP>1` 不能同时使用 `DP>1`，MRV2 PCP 也暂不支持 PP。因此 `EP_SIZE=DP×PCP×TP` 是统一的 group 公式，不表示当前版本允许 DP、PCP、PP 任意同时取大于 1。

## 1. 基础并行策略


### 1.1 单 GPU

模型权重和 KV cache 全部位于一个 GPU 上，不涉及 GPU 间 collective。

![](https://pic3.zhimg.com/v2-630d068b3311ab37ce446ba3e80fb23a_r.jpg)
### 1.2 Tensor Parallel

TP 将单层权重分布到多个 GPU，同一个请求由一个 TP group 协同计算：

- vocab-parallel embedding 的局部结果通过 `AR[TP]` 合并；
- attention 的 Q heads 通常沿 TP 切分，row-parallel `o_proj` 输出通过 `AR[TP]` 合并；
- dense MLP 的 column-parallel/row-parallel 权重分别切分，`down_proj` 输出通过 `AR[TP]` 合并；
- LMHead 通常沿 vocab 维切分，最终 logits 使用 `Gather/AllGather[TP]`，不是 AllReduce。
![](https://pic2.zhimg.com/v2-d44cb8297cc6f10747b666bc46fc4cb7_r.jpg)
TP 下的 KV cache
设模型的有效 KV-head 数为 `H_kv`：

- 当 `TP <= H_kv` 时，KV cache 主要沿 KV-head 维切分；
- 当 `TP > H_kv` 时，head 维已无法继续切分，vLLM 会复制 KV heads，使每个 TP rank 至少持有一个 KV head；
- 由 TP 引入的 KV cache 复制因子约为 `TP / H_kv`。因此KV cache 按 attention head 切分并不完整，更准确的说法是按照有效 KV heads 切分，不足时复制。

TP 的主要作用是降低单卡权重占用，并让多个 GPU 并行执行同一个请求；代价是 prefill 和 decode 都会增加 TP collective。它不保证一定降低端到端 latency，实际结果还取决于计算/通信比例、batch 和拓扑。

TP 下的 Dense Sequence Parallel（编译优化）
vLLM 还有一条容易和 PCP、MoE sequence parallel 混淆的 dense TP 编译优化。它不会改变模型权重的 TP 切分方式，也不会创建新的 parallel group；改变的是两个 TP GEMM 之间 residual/activation 的布局。普通 row-parallel 路径先通过 `AR[TP]` 让每个 rank 都得到完整的 `[T,H]`，随后每个 rank 重复执行完整 RMSNorm。启用 `enable_sp` 后，编译器会识别 `AllReduce -> RMSNorm`（以及部分 fused-add-RMSNorm/静态 FP8 quantization）模式并改写为：

原始：input -> AR[TP] -> RMSNorm -> output
改写：input -> RS(dim=token)[TP] -> local RMSNorm -> AG(dim=token)[TP] -> output

![](https://pic3.zhimg.com/v2-8e47fe070bdb7146df19f58217357710_r.jpg)图中 `T` 是本 step padding 后的 batched-token 数。以 `TP=4` 为例，在 `RS` 与 `AG` 之间，rank 0～3 分别只持有 `[T/4,H]` 的 token slice，并在本地完成对应的 RMSNorm；`AG` 再恢复下一次 column-parallel GEMM 所需的完整 token 输入。也就是说，<strong>权重继续按普通 TP 切分，只有中间 activation 暂时沿 token 维切分</strong>。

如何开启
vLLM 中，建议显式同时打开 SP 改写和 GEMM-collective fusion：

```text
vllm serve MODEL \
  --tensor-parallel-size 4 \
  -O2 \
  --compilation-config '{
    "pass_config": {
      "enable_sp": true,
      "fuse_gemm_comms": true
    }
  }'
fuse_gemm_comms=true` 会自动令 `enable_sp=true`，示例同时写出两项是为了明确意图。需要注意：尽管本版本默认优化级别是 `-O2`，`IS_DENSE` 当前被硬编码为 `False`，因此 `-O2/-O3` **不会自动打开**这两个 pass，必须像上面一样显式配置。
```


实际进入优化路径的条件
条件当前工作区版本的具体判断TPtensor_parallel_size > 1；TP=1 时 vLLM 会关闭 enable_sp 和 fuse_gemm_comms编译模式必须进入 vLLM 的 TorchInductor 编译路径，并满足 full-graph 要求：use_inductor_graph_partition=true，或 splitting_ops=[]；显式开启上述 pass 后，vLLM 会在需要时把 splitting_ops 清空token 阈值只有当前 compiled range 的 batched-token 数达到 sp_min_token_num 才应用；低于阈值仍保留普通 AR[TP]自动阈值未显式设置 sp_min_token_num 时，当前启发式覆盖 CUDA SM90/H100、SM100-family Blackwell 和 XPU；设备与模型未命中对应 policy 时关闭该优化shapetoken 数必须能被 TP 整除；GPU model runner 会把 batched tokens 向上 padding 到 TP 的整数倍计算图模式必须实际匹配 AllReduce -> RMSNorm、AllReduce -> fused_add_RMSNorm，或其支持的静态 FP8 quantization 变体；没有匹配到的层不会改写融合支持fuse_gemm_comms 依赖 CUDA symmetric-memory collective；普通 FP16/BF16 GEMM 有对应模式，scaled-matmul 变体只在模型 dtype 为 BF16 时注册自动阈值统一按下面的公式计算：

```text
sp_min_token_num =
    floor(per_device_min_bytes × TP / (hidden_size × element_size))
```

当前 policy 为：

平台最小 hidden sizeper_device_min_bytesCUDA SM90 / H10081928 MiBCUDA SM100-family / Blackwell819232 MiBXPU40968 MiB例如 H100 上使用 BF16/FP16、`hidden_size=8192` 时，`TP=2/4/8` 的阈值分别为 `1024/2048/4096` tokens；相同 shape 在 Blackwell policy 下阈值是其 4 倍。该值还会被 `max_num_batched_tokens` 封顶。未命中自动 policy，或希望覆盖默认启发式时，可以在 `pass_config` 中显式加入 `"sp_min_token_num": N`；这是强制选择优化区间的调优旋钮，不能代表该设备和负载一定更快，应通过基准测试确定 `N`。

优劣分析
enable_sp` 单独开启与再开启通信融合的优劣要分开看：

配置优势代价和局限仅 enable_sp：RS -> local RMSNorm -> AG每个 rank 的 RMSNorm 只处理 T/TP tokens，减少重复点计算；RS～AG 区间的 residual/activation 占用约降为原来的 1/TP；为后续 GEMM-collective fusion 创建计算图边界RS+AG 与 ring AllReduce 的总通信量级相同，SP 本身不直接减少通信；拆分、聚合和同步存在额外调度开销，小 batch 可能变慢再开 fuse_gemm_comms：GEMM+RS、AG+GEMM使用 symmetric-memory fused op 按 token chunk 建立通信计算流水，减少独立 kernel launch，并让 GEMM 与通信重叠；这是主要性能收益来源要求 full-graph compilation、CUDA symmetric memory、足够大的 token 数和可匹配的计算图；需要额外通信 workspace，收益对模型形状、TP 大小和 GPU/NVLink 拓扑敏感总体上，这条优化更适合 hidden size 较大、batched-token 数较多且 TP 卡间互联较快的吞吐场景；小 batch decode、互联较弱或无法命中融合模式时，额外 padding、同步和调度成本可能抵消收益。vLLM 的 fusion 设计文档给 `fuse_gemm_comms` 的经验收益是约 <strong>7%～10% E2E</strong>，但这不是保证值，必须针对实际模型和负载做开启/关闭对照测试。

### 1.3 Pipeline Parallel

PP 按层切模型。每个 PP stage 只保存分配给自己的层权重，并只维护这些层对应的 KV cache。以 `PP=2、TP=2` 为例，四个 GPU 的典型分组是：

TP groups: {GPU0, GPU1}, {GPU2, GPU3}
PP groups: {GPU0, GPU2}, {GPU1, GPU3}
也就是说，PP group 连接的是不同 stages 上具有相同 TP/PCP 坐标的 ranks。

![](https://pic3.zhimg.com/v2-aefa2843a3e16bb02365c50ff0553a32_r.jpg)
### 1.3.1 Forward activation：相邻 stage P2P

一次 forward 的主路径是：

- 第一个 PP stage 执行 embedding 和本 stage 的 Transformer layers；
- 非末级 stage 把 `IntermediateTensors` 通过 `isend_tensor_dict` 发给下一个 PP rank；
- 下一个 stage 使用 `irecv_tensor_dict` 接收，再继续执行自己的 layers；
- 最后一个 stage 执行 final norm、LMHead 和 sampling。这里的 PP 主数据流是相邻 stage 的 `P2P[PP]`，不是 `AR[PP]`。tensor metadata/object 走 PP CPU group，CUDA tensors 走 PP device group。

### 1.3.2 TP-aware PP 传输优化

这是一项 <strong>PP 边界重复数据去除</strong>，与前面的 Dense SP、`fuse_gemm_comms` 无关。当 PP 与 TP 组合时，stage 边界的 hidden tensor 通常已通过 TP collective 在各 TP ranks 上复制；如果每个 rank 都向下一 stage 发送完整 tensor，就会在不同 PP 链路上重复传输相同数据。vLLM 将它改为：

发送端：每个 TP rank 从 replicated tensor 取一段 -> P2P 到下一 stage 的对应 TP rank
接收端：各 TP rank 收到不同 slice -> AG[TP] 重建完整 tensor
以 `PP=2、TP=2` 为例，Stage 0 是 `{GPU0(TP0), GPU1(TP1)}`，Stage 1 是 `{GPU2(TP0), GPU3(TP1)}`。设 Stage 0 两个 TP ranks 都持有相同的完整 tensor `X`，大小为 `S`：

未优化：
GPU0 --完整 X--> GPU2
GPU1 --完整 X--> GPU3
跨 PP 边界共发送 2S

优化后：
GPU0 --X0（前 1/2）--> GPU2
GPU1 --X1（后 1/2）--> GPU3
GPU2、GPU3 在接收 stage 内执行 AG[TP](X0, X1)，各自重建完整 X
跨 PP 边界共发送 S
一般化到 `TP=p`，跨 PP 边界的聚合 P2P 流量由 `pS` 降为 `S`，单条 PP 链路由 `S` 降为 `S/p`；代价是接收 stage 增加一次 `AG[TP]`。因此这条路径的通信组合是：

P2P[PP] + AG[TP]
这不是 PP group 自己执行 AllGather，而是接收 stage 的 TP group 做重建。

实际实现不是按 token、hidden 或 attention head 等语义维度切分，而是按连续内存展平后等分：

# 发送端
slice_tensor = tensor.reshape(tp_size, -1)[tp_rank]

# 接收端
tensor = all_gather(slice_tensor, dim=0).reshape(original_shape)
isend_tensor_dict/irecv_tensor_dict` 在传输前保留完整 tensor 的 shape metadata；接收端先只对属于本 TP rank 的 slice 发起 `irecv`，等待 P2P 完成后再执行上述 AllGather postprocess。默认启用条件是传入了 `all_gather_group=get_tp_group()`，且 `tensor.numel() % TP == 0`；`all_gather_tensors` 还可以逐 tensor 覆盖该决定。

这项优化要求发送 stage 上的 tensor 在 TP ranks 间完全相同。开启 Dense SP 后，`residual` 可能已经沿 token 维分布在不同 TP ranks 上，此时再按 TP rank 取一段会造成二次切分和数据缺失，因此 vLLM 会通过 `all_gather_tensors["residual"]=False` 禁用该 tensor 的优化。

该优化通常适合 TP ranks 通过 NVLink 等高速互联连接、而 PP 边界更昂贵的拓扑；如果 PP 和 TP 使用相近的慢速链路，新增 `AG[TP]` 可能抵消节省的 P2P 流量。

### 1.3.3 采样结果从末级返回前级

下一 decode step 的各 PP stages 都需要知道刚采样出的 token。工作区 V1/V2 路径会由最后一个 PP stage 执行：

Bcast(sampled_token_ids, num_sampled, num_rejected)[PP]
异步调度路径也会 broadcast `prev_sampled_token_ids`。少见的 `broadcast_pp_output` 模式还会从最后 PP rank 广播 logits tensor dict。它们与前向 activation P2P 方向相反，且 payload 通常远小于 hidden states。

### 1.3.4 PP 与其他并行的叠加


- 每个 stage 内的 dense/attention 层仍执行自己的 `AR/AG[TP]`；
- stage 内若有 MoE layers，EP group 在该 PP stage 内展平 `DP×PCP×TP`，不会跨 PP stage；
- 每个 stage 的 attention 只访问本 stage layers 的 KV cache；PP 不会在每个 decode token 上搬运全部 KV cache；
- 多节点常见做法是节点内 TP、节点间 PP，以减少高频 TP collective 穿越慢链路，但实际最优布局取决于模型层大小、网络和 batch。
### 1.4 Dense Data Parallel

对 dense 模型，或者只观察 MoE 模型中的 attention/dense 部分时，每个 DP rank 持有一份完整模型副本，处理不同请求，KV cache 也彼此独立。模型 forward 数据面没有跨 DP rank 的 activation collective。

![](https://pic3.zhimg.com/v2-e4b6f25fe930c96b0a45222f3d82ecbe_r.jpg)这张图不适用于 vLLM 的 coordinated MoE expert 层。MoE expert 权重和 token 通信会跨 DP ranks，详见第 2.3 节。

DP 通常提升整体吞吐并降低排队压力，但“单请求 latency 完全不变”不是严格结论；batch、排队、负载不均和 MoE collective 都可能影响 latency。

## 2. 组合并行策略


### 2.1 MoE：TP 与 EP 的权重布局

设 routed expert 数为 `E`，本节使用 `TP=4、DP=1、E=128`。

![](https://pic2.zhimg.com/v2-aa1adf13ca2990f81b1919d63959067f_r.jpg)
### 2.1.1 不启用 EP

每个 TP rank 都包含全部 128 个 expert ID，但每个 expert 的矩阵按 TP 切分：

- 每卡都能看到 `E0...E127`；
- 每卡只保存每个 expert 约四分之一的矩阵权重；
- attention 输出经过 `AR[TP]` 后，token 在 TP ranks 上处于复制态；
- 每个 rank 根据相同 routing 结果计算 expert 的局部矩阵分片；
- expert 局部输出通过 `AR[TP]` 合并。
### 2.1.2 启用 EP，DP=1

启用 EP 后，MoE 层从 tensor-sharded experts 切换为 full-expert placement。在本文配置中：

EP_SIZE = DP_SIZE × PCP_SIZE × TP_SIZE = 1 × 1 × 4 = 4
每卡保存 32 个完整 routed experts，attention 仍按 TP 切分。

在 vLLM 的纯 `TP+EP、DP=1、PCP=1` 主路径中：

- 所有 TP ranks 仍看到相同 token；
- 每个 rank 只计算本地拥有的完整 experts；
- 最后通过 `AR[TP]` 合并 routed expert contributions。
### 2.2 KV cache 与 Context Parallel


### 2.2.1 DeepSeek MLA 中的有效 KV head

DeepSeek MLA 在 decode 中将每个 token 的单份 MLA cache entry（压缩 `kv_c` 与 decoupled RoPE key `k_pe`）视为一个有效 KV head，即 `H_kv=1`。这不表示 query/attention head 只有一个。

例如 `TP=4、DCP=1` 时，四个 TP ranks 会分别保存一份相同的压缩 KV cache，产生 4 路复制。

### 2.2.2 Decode Context Parallel

DCP 不增加 worker 数。它的 rank 来源取决于是否同时启用 PCP。

```text
PCP=1：
    DCP 复用 TP ranks
    TP % DCP == 0
    每个 TP group 被划成 TP/DCP 个 DCP groups
```


PCP>1：

```text
    DCP ∈ {1, PCP, TP×PCP}
    DCP=PCP 时沿 PCP 轴成组
    DCP=TP×PCP 时先跨 PCP、再跨 TP，覆盖完整 TP×PCP block
```

对非 MLA 的 GQA/MQA，在 `PCP=1` 的当前支持范围内还需要满足：

1 <= DCP <= TP / H_kv
TP % DCP == 0
num_q_per_kv % DCP == 0
MLA 不走上述 GQA head-count 校验。v0.26.0 已有支持 FP8 KV cache 与 DCP 组合的 MLA backends，因此不能再写成“MLA DCP 不支持 FP8”；实际支持范围取决于 attention backend、GPU 架构和 KV cache layout。例如 Triton MLA、部分 FlashInfer sparse MLA、TokenSpeed MLA 和 ROCm AITER 路径各有不同的 dtype/device 限制。

KV cache 在每个 DCP group 内沿 token 维分片。默认 `cp_kv_cache_interleave_size=1` 时：

owner(token_i) = i % DCP
交错粒度可以配置。在 `PCP=1` 时，只有 `DCP=TP` 才会把 token 分布到当前 TP group 的所有 GPUs；当 `DCP<TP` 时，一个 TP group 中存在多个独立 DCP 子组。在本文 DeepSeek MLA（`H_kv=1`）示例中，组间残余复制因子约为 `TP / (H_kv × DCP)`；对一般 `H_kv>1` 的 GQA，不同 DCP groups 也可能对应不同 KV-head shards，不能一概称为副本。PCP 本身不增加 KV-cache shard 数；只有 DCP 决定持久 KV cache 的 token shard 数。

![](https://picx.zhimg.com/v2-974eb01939f313b26be95f5f3e7b9471_r.jpg)图固定 `PCP=1`：左侧给出 `DCP=1` 时完整的 TP 通信基线；右侧保留同样的 embedding、attention `o_proj`、MLP/MoE 与 logits 通信，并用紫色单独标出 `DCP=4` 在 decode attention 内新增的 collective。

DCP 分片的是持久 KV cache，但 attention 本身仍需要通信。对于图中的 `PCP=1` MLA decode：

- 无论使用哪种 combine backend，都先在 DCP group 内 `AllGather(Q)`；
- 每个 rank 在本地 KV shard 上计算 partial output `O_r` 和 `LSE_r`；
- 随后的 partial-state combine 二选一： 
- 默认 `dcp_comm_backend=ag_rs` 使用 `AllGather(LSE) + ReduceScatter(O)`；
- `a2a` backend 分别交换按 head 分块的 `O` 和 `LSE`，再在本地做 LSE-weighted combine。当 `PCP>1` 时，decode tokens 在 PCP ranks 上是复制态，通信会变化：

- `DCP=PCP` 时不需要先 gather Q；
- `DCP=TP×PCP` 时只在 TP 轴 gather 缺失的 Q heads；
- 默认 combine 使用 `AG(LSE)[DCP] + AR(O)[DCP]`，再恢复当前 TP rank 所需的 heads；
- `dcp_comm_backend=a2a` 仍可替换上述 LSE/output combine。因此 DCP 不能概括为“gather KV cache”，也不能把 `PCP=1` 的 `AG(Q)+RS(O)` 流程无条件外推到 PCP+DCP。

### 2.2.3 Prefill Context Parallel

PCP 与 DCP 的资源语义不同：`PCP` 是 rank 布局中的独立维度，会把 worker 数乘以 `PCP_SIZE`，但不会增加 KV-cache shard 数；`DCP` 不增加 worker，负责持久 KV cache 的 token sharding。PCP 的目标是在 prefill 时沿新 token/context 维拆分长请求，降低单 rank 的 prefill 计算量。

v0.26.0 已在 MRV2 中实现 MLA PCP。以 `PCP=4` 为例，实际数据流是：

- scheduler 仍维护完整的 global scheduled batch；
- `PCPManager` 把每个 prefill 切成 `2×PCP=8` 个 chunks，并采用 DualChunkSwap 分配：rank 0 处理 chunks 0/7，rank 1 处理 1/6，依此类推；
- 每个 rank 只为自己的 prefill token chunks 计算 Q 和 MLA latent cache inputs；
- 在写 cache 前，仅把 partitioned prefill 的 `kv_c_normed`、`k_pe`、可选 indexer K 及对应 slot mapping 在 `PCP` group 内 AllGather；复制态 decode cache writes 保持本地；
- 各 rank 的 local Q chunk 对本地可见的完整 cache 执行 attention，并继续处理本地 hidden-state rows；
- sampling/postprocess 前执行 `AG(hidden_states)[PCP]`，再按 restore index 恢复 global batch 顺序。
![](https://pic2.zhimg.com/v2-762c2a9f2ee8c80c57a48c42d2fd8b65_r.jpg)decode rows 在 PCP ranks 上复制，因此 PCP 本身不分片 decode KV cache；如需消除持久 KV cache 复制，需要再配置允许的 DCP 组合。

当前 MRV2 PCP 的主要限制是：

- 只支持 MLA 模型；
- 不支持 `PCP>1` 与 `DP>1` 同时使用；
- 暂不支持 PP、encoder-decoder、多模态输入、LoRA 和 speculative decoding；
- 只支持 eager 或 PIECEWISE CUDA Graph；sparse MLA PCP 暂不支持 CUDA Graph；
- PCP+DCP 暂不支持 fused output quantization。MoE 的统一 placement 公式仍是 `EP_SIZE=DP×PCP×TP`。但在当前限制下，`PCP>1` 时实际没有 DP 轴；EP+PCP 的 dispatch/combine 通常由所选 all2all backend 处理。`moe_runner` 中显式的 `AG(hidden/router)[PCP]` 与 `RS(hidden)[PCP]` 只在没有使用 all2all kernels 时执行，不能视为所有 PCP+EP 配置的固定额外步骤。

### 2.3 DP 与 MoE

本节先使用 `TP=1、DP=4、E=128`。

![](https://pica.zhimg.com/v2-132157a835d82bdd2d2b61665215d4fc_r.jpg)
### 2.3.1 不启用 EP

vLLM coordinated MoE DP 会把 expert 层视为跨 DP ranks 的 tensor-sharded 层：

- attention/dense 层仍按普通 DP 复制，各 rank 处理自己的请求；
- 每卡都包含全部 128 个 routed expert ID；
- 每个 expert 的矩阵权重只保存约四分之一；
- 进入 MoE 时，先使用 `AGV[DP]` 收集 hidden states 和 routing/top-k metadata；
- 各 rank 计算本地 expert weight shard；
- 使用 `RSV[DP]` 求和，并把 token 结果返回原 DP rank。流程为：

local DP tokens
  -> AGV[DP]
  -> tensor-sharded expert compute
  -> RSV[DP]
  -> local DP tokens
这是 vLLM 的 MoE 特殊路径，不能据此推导普通 dense DP 也会 AllGather 各请求 token。

### 2.3.2 启用 EP

此时 `EP=TP x DP=4`，每卡保存 32 个完整 routed experts。token 需要按 expert owner 进行逻辑 dispatch，expert 计算后再 combine 回 token 的 source rank。

默认 backend 的实际流程是：

local DP tokens
  -> AGV[DP(=EP)] dispatch
  -> local full-expert compute
  -> RSV[DP(=EP)] combine
  -> local DP tokens
这里 `TP=1`，所以 DP group 与 EP group 的成员相同；源码中的默认 AG/RS manager 在非 SP 路径实际选择 DP process group。

使用 DeepEP 等 backend 时，才会变成：

local DP tokens
  -> A2A dispatch[EP]
  -> local full-expert compute
  -> A2A combine[EP]
  -> local DP tokens
top-k routing 可能让一个 token fan-out 到多个 expert owners，因此不能简单描述成“发送到这个 token 选择的一个 GPU”。

### 2.4 DP + TP + EP

下面使用：

DP=2, TP=2, EP=TP x DP=4
每个 DP rank 处理不同请求，每个 DP rank 内部使用 TP 切分 attention。

以下完整流程只适用于 <strong>模型已接入 MoE sequence parallel，且 backend 被 SP gate 支持</strong> 的路径。v0.26.0 的 SP gate 包含：

allgather_reducescatter
deepep_high_throughput / deepep_low_latency
mori_high_throughput / mori_low_latency
nixl_ep
deepep_v2`、`flashinfer_nvlink_two_sided` 和 `flashinfer_nvlink_one_sided` 当前不在这个 MoE-SP gate 中。它们即使能实现 A2A，也不能由 backend 名称直接推导出本节的 SP 数据流。

对 v0.26.0 的 DeepSeek 主路径，数据流为：

- vocab-parallel embedding 输出通过 `AR[TP]` 合并；
- MoE layer 的 attention `o_proj` 设置 `reduce_results=False`，先保留各 TP rank 的 partial output，不立即 `AR[TP]`；
- token 数 padding 到 `TP` 的整数倍，然后执行 `RS(dim=token)[TP]`，同时把 residual 沿 token 维切成对应 shard；
- 每个 rank 对自己的 SP token shard 计算 router logits/top-k；
- 在 `EP=TP×DP` 范围执行逻辑 expert dispatch；
- 各 EP rank 计算本地完整 experts；
- combine 后结果回到 source TP token shard；
- 连续的 SP MoE layers 可以保持 hidden states 和 residual 的 token-sharded 布局，不要求每个 MoE layer 后立即 `AG[TP]`；
- 只有下一层不支持 SP、需要 aux hidden states，或到模型最终边界时，才执行 `AG[TP]` 恢复完整 token 集；LMHead 最终仍使用 `Gather/AllGather[TP]` 收集 logits。
![](https://picx.zhimg.com/v2-f6e8f9d13916c109a8e07efb48465eaf_r.jpg)对默认 backend，第 5～7 步实际映射为：

AGV[EP] -> local expert compute -> RSV[EP]
对上述 gate 中的 DeepEP、MoRI、NIXL A2A backend，则映射为：

A2A dispatch[EP] -> local expert compute -> A2A combine[EP]
两个 backend 路径是互斥选择，不是依次执行。部分模型仍保留“本地 `SP-chunk[TP]`，MoE 后立即 `AG[TP]`”的 fallback；因此应区分模型级主路径和 `FusedMoE` 接收到 replicated input 时的兜底路径，不能把 DeepSeek 图无条件外推到所有 MoE 模型。

## 3. Prefill/Decode 分离与 KV Connector

P/D 分离把 prefill 和 decode 放进两套独立的 vLLM instances，使两边可以分别选择硬件、batch 策略和 `TP/PP/DP/EP/CP` 配置。它不是新的 process-group 维度，也不是一个 collective。

![](https://picx.zhimg.com/v2-bf206e44f24d1287e52002c65d154bab_r.jpg)
### 3.1 一次请求的数据流

典型 pull/lookup 流程为：

- Router/Proxy 把请求发给 Prefill instance；
- P 完成 prompt forward，把各层 KV 写入本地 paged KV cache；
- scheduler connector 生成 block 地址、engine/rank、request 等 transfer metadata，并通过响应或 side channel 形成 `kv_transfer_params`；
- Router 把原请求及这些参数发给 Decode instance；
- D 的 worker connector 将远端 KV blocks load 到自己的 block slots；
- D 从已完成 prefill 的位置继续 decode，并把 token stream 返回 client。具体 connector 也可以采用 push、共享存储 lookup、双向传输或边计算边按 layer 保存/加载。抽象接口包含 `start_load_kv`、`wait_for_layer_load`、`save_kv_layer`、`wait_for_save` 和完成状态汇报，因此不能假设所有 connector 都是“P 主动一次性 send，D 一次性 recv”。

### 3.2 数据面与控制面必须分开看

P/D 至少包含三类流量：

流量内容常见实现请求控制流prompt、sampling params、P/D 路由HTTP/RPC/ProxyConnector 控制流handshake、engine/rank、block IDs/地址、完成通知ZMQ、HTTP、msgpack 或 connector 自定义 side channelKV 数据流各 attention layer 的 KV blocks；部分 connector 也支持 hidden statesNIXL/RDMA transfer engine、cache service、GPU↔CPU offload、共享/分布式存储只有第三项是主要带宽负载。它通常不属于 P 或 D 内部已有的 `TP/PP/DP/EP` process group；P、D 各自在传输同时或前后执行自己的 collectives。

### 3.3 工作区版本中的 connector 类型

KVTransferConfig` 使用 `kv_role=kv_producer/kv_consumer/kv_both` 区分角色，物理传输由 `kv_connector` 决定。v0.26.0 内置注册项可以按用途归类：

类型Connector 示例通信特征注册内存/RDMANixlConnector、NixlPullConnector、NixlPushConnector、MooncakeConnector、MoRIIOConnector注册 KV memory region，异步 read/write；握手和通知另走 side channel外部 KV cache/存储LMCacheConnectorV1、LMCacheMPConnector、MooncakeStoreConnector、FlexKVConnectorV1、HF3FSKVConnector通过 cache service、共享或分布式存储按 key/block lookup本机 offloadOffloadingConnector、SimpleCPUOffloadConnectorGPU↔CPU/本地层级缓存，不一定用于 P/D 分离组合/测试MultiConnector、ExampleConnector、ExampleHiddenStatesConnector、DecodeBenchConnector串接多个 connector、KV/hidden-state 示例或性能仿真旧版本的 `P2pNcclConnector` 已从 v0.26.0 注册表和实现中删除，因此当前内置 Connector 不能再用它作为“NCCL GPU P2P”的示例。自定义 Connector 仍可自行选择传输协议。

不同 connector 的 TP rank 映射能力不同。P 和 D 可以在架构上使用不同并行度，但异构 TP、KV layout、block size、attention backend 和模型类型是否兼容，必须以所选 connector 的校验为准，不能从 `KVTransferConfig` 接口本身推导。

### 3.4 P/D 分离解决什么问题

P/D 分离主要用于分别调优：

- P 侧 TTFT、长 prompt 算力和高带宽 prefill；
- D 侧 ITL、KV cache 容量和 decode batch throughput；
- 避免长 prefill 插入 decode batch 时放大 tail ITL。它会额外引入 KV transfer、router 排队和跨实例失败处理，因此不保证提升总吞吐。对短 prompt 或低速网络，传输成本可能高于隔离收益。

### 3.5 多模态 Encoder 分离：EC Connector

工作区版本还有一套独立的 `ec_transfer` 抽象，用于把图像/音频等多模态 encoder 与下游模型实例分离。它传输的是按 `mm_hash` 索引的 encoder cache/embedding tensor，而不是 Transformer attention KV blocks。

Encoder instance
  -> save_caches / EC-Xfer
  -> Prefill 或 Decode instance 的 start_load_caches
  -> multimodal embedding merge
ECTransferConfig` 同样区分 producer/consumer/both，并把 scheduler metadata 与 worker 数据操作分开。v0.26.0 内置两个实现：

Connector数据路径适用范围ECExampleConnectorGPU tensor 先复制到 CPU，再以 safetensors 写入共享目录；consumer 从共享文件加载调试/流程示例ECCPUConnectorscheduler 管理共享 CPU mmap region，worker 执行 GPU↔CPU mmap copy单机 CPU encoder-cache offload/reuse这两个内置实现都不是跨机 RDMA，也不建立 NCCL/PyNccl P2P 通道。通过 `ec_connector_module_path` 接入的外部 Connector 可以自行实现其他 transport。

当 Encoder、Prefill、Decode 三段同时分离时，至少存在两条不同的跨实例状态流：

```text
E -> P/D：encoder cache（EC Connector）
P -> D：attention KV cache（KV Connector）
```

两者都不属于 NCCL model-parallel collective，容量模型、key、生命周期和失败恢复也不同。

## 4. Forward 之外仍会出现的分布式通信


### 4.1 DP step 对齐和 CUDA Graph padding

“Dense DP 的模型 forward 没有 activation collective”不表示整个 engine step 完全没有 DP 通信。在 coordinated DP、MoE DP、CUDA Graph 或 dual-batch-overlap 路径中，各 DP ranks 必须对齐是否执行 forward、token padding、microbatch 和 graph mode。

工作区 V1 会构造很小的整型 tensor，并执行：

AR[DP] -> 汇总各 rank 的 token count、padding、ubatch decision、cudagraph mode
默认可走 DP device group；`disable_nccl_for_dp_synchronization` 会切到 CPU/Gloo group。其他控制路径还会用 `MAX-AR[DP]` 判断是否仍有未完成请求，用 `MIN-AR[DP]` 对齐可用 KV cache memory。它们是小消息同步，不是把不同 DP 请求的 hidden states 混在一起。

![](https://pic2.zhimg.com/v2-6106bf541da3024ae34e8327552e2189_r.jpg)
### 4.2 EPLB：load stats collective 与 expert 权重 P2P

启用 Expert Parallel Load Balancer 后会增加两种不同通信：

- <strong>统计聚合</strong>：按窗口记录每个 expert 的 token load，通过 `AR[EP]` 得到全局 load；开启 balancedness logging 也会增加这类开销；
- <strong>权重重排</strong>：计算新的 logical↔physical expert mapping，然后只在需要的 ranks 间搬运 expert weights。权重重排主路径是 P2P，而不是 token dispatch 的 A2A：

torch NCCL isend/irecv
或 CPU-staged Gloo isend/irecv
或 PyNccl send/recv
或 NIXL READ transfer
EPLB group 与 EP group 成员相同，但 process group 独立，以避免后台权重迁移和前台 MoE collective 互相串流。v0.26.0 默认 `use_async=true`：未显式指定 communicator 时优先选择 NIXL；静态 EP 在没有 NIXL 时回退 CPU-staged Gloo。`torch_nccl` 和 `pynccl` 因多 stream 冲突不允许用于 async EPLB；Elastic EP 的 async EPLB 必须安装 NIXL，关闭 async 后才可回退 PyNccl。实现还可能使用 readiness `AR`、metadata `all_gather_object`、profile-time dummy `AG` 和 barrier；这些是低频协调，不应计入每层 MoE dispatch 流量。

![](https://pica.zhimg.com/v2-fe057bf79c9cfe7683779922eb3042ca_r.jpg)
### 4.3 Elastic EP

Elastic EP 在扩缩容时会建立新的 stateless DP/EP groups，并执行：

- TCP store / `Barrier[DP]` 协调旧实例与新实例切换；
- `AR[DP]` 同步 engine wave、step 和 KV cache memory 等状态；
- `Bcast` expert mapping；
- P2P 发送/接收新增 worker 所需的 expert weights。这是一条重配置状态机，不是普通 decode step 的稳态通信。v0.26.0 还要求：

- 必须同时启用 EPLB；
- 不支持 `pipeline_parallel_size>1`；
- 不兼容 external/hybrid DP load balancing，必须由单个 API server/core client 协调扩缩容；
- TP/PCP/PP 组成的单个 model replica 必须位于单节点，尚不支持 multi-node TP/PP；
- async EPLB 必须使用 NIXL；否则需设置 `use_async=false`。
![](https://pic4.zhimg.com/v2-33ca652e7efcc8e91f0966a434015a65_r.jpg)
### 4.4 执行器、RPC 与 KV events

vLLM 的 Ray/multiprocessing executor 会把 scheduler output、方法调用和结果分发给 workers：

- multiprocessing 路径可使用共享内存/message queue/ZMQ broadcaster；
- Ray 路径使用 Ray RPC/actor 调用；
- `collective_rpc` 这个名字表示“所有 workers 都执行 RPC”，不等于 GPU collective；
- KV cache event publishing、P/D handshake 和健康检查通常走 ZMQ/HTTP 等控制面。这些流量会影响大规模部署的稳定性和尾延迟，但不应标成 NCCL `AR/AG/A2A`。

![](https://pic3.zhimg.com/v2-4bb6d39a975c9098756bc00431dcf52a_r.jpg)
### 4.5 初始化、warmup 与模型特有 collective

初始化阶段还会出现 process-group barrier、custom AllReduce IPC handle 的 object gather/broadcast、通信 buffer reservation 等一次性操作。模型实现也可能增加通用图之外的 TP collective，例如：

- Mamba/linear-attention 的 state、variance 或卷积 workspace `AR/AG[TP]`；
- 部分多模态模型对 variable-size vision embeddings 使用 `AG`；
- 特定模型的 parallel residual、normalization 或 logits 路径增加 `AR/AG`。因此本文的“全景”覆盖 vLLM 核心通信机制和 process groups，但精确到某个模型时，仍应对目标 model implementation 做一次 `get_*_group()/torch.distributed` 调用扫描。

## 5. 汇总


### 5.1 按部署功能查看

配置/功能权重与状态布局稳态模型数据面额外或低频通信单 GPU完整模型和 KV cache无跨 GPU 通信无TPdense/attention/LMHead tensor shard；KV 按有效 KV heads 切分或复制通常为 row-parallel AR[TP]；dense SP 编译优化可改写为 RS+AG[TP]；需要完整 tensor/logits 时 AG/Gather[TP]custom AR 初始化可能有 object gather/broadcastDense DP每个 DP rank 完整副本、独立 KV无 hidden-state inter-DP collectivestep/padding/CUDA Graph 对齐可能有小消息 AR[DP]PP层权重和这些层的 KV cache 按 stage 切分相邻 P2P[PP]；接收端可追加 AG[TP]末级 Bcast(sampled tokens)[PP]PCP增加 workers；MRV2 把 MLA prefill token rows 跨 PCP ranks 切分，但 PCP 本身不增加 KV-cache shard 数prefill latent-cache inputs AG[PCP]；sampling 前 AG(hidden)[PCP] 恢复顺序decode rows 复制；当前仅 MLA，且不支持 DP/PP/MM/LoRA/spec decodeDCP不增加 workers；无 PCP 时复用 TP，有 PCP 时可跨 PCP 或完整 TP×PCP；按 token 交错分片持久 KVPCP=1 时 AG(Q)+AG(LSE)+RS(O)；PCP>1 时 Q gather 与 combine 变化；可选 A2A不 gather 完整 KV cache；FP8 支持取决于 backend/device/layoutTP，EP 关每卡有全部 expert IDs，每个矩阵 tensor shardexpert partials AR[TP]无逻辑 owner dispatchTP，EP 开，DP=1、PCP=1完整 experts 分布在 EP ranksv0.26.0 仍为 local expert compute + AR[TP]，不启用 MoE-SPSP gate 当前要求 DP>1DP，EP 关expert 矩阵跨有效 DP×TP 切分AGV[DP] -> tensor-shard expert -> RSV[DP]，另有 TP 归并DP step 对齐TP +（DP 或 PCP）+ EP完整 experts 分布在 EP=DP×PCP×TP；当前 DP>1 与 PCP>1 互斥logical dispatch/combine；默认 backend 按 SP/DP/PCP 选择 AGV/RSV 通信域，其他 backend 可为稀疏 A2AEPLB 可增加 load AR 和权重 P2PP/D 分离P、D 各自有独立模型实例和 paged KV；KV blocks 跨实例迁移各实例内部照常执行自己的并行通信KV-Xfer[P→D] + handshake/metadata；不是 collectiveEncoder 分离encoder cache/embedding 按 mm_hash 跨实例保存与加载下游实例内部通信不变EC-Xfer[E→P/D] + connector metadataEPLBredundant/full experts 可动态改 ownerMoE forward 路径不变AR[EP] load stats + P2P[EPLB] expert weightsElastic EPDP/EP membership 动态变化稳定后回到普通 EP 路径barrier、状态 AR、mapping broadcast、expert weight P2P
### 5.2 按通信 primitive 查看

Primitive主要出现位置典型 payload是否稳态高频AllReduceTP row-parallel；部分 CP output combine；DP 对齐；EPLB load stats；模型特有 statehidden states 或小型控制 tensorTP/部分 CP 高频；DP/EPLB 视配置AllGather/GatherTP logits/tensor 重建；dense TP SP restore；PP 接收端 TP 优化；DCP Q/LSE；PCP prefill cache inputs/hidden restore；默认 MoE dispatchlogits、Q/LSE、hidden states、MLA latent K/V视并行策略高频ReduceScatterdense TP SP token shard；默认 MoE combine；PCP=1 的 DCP output combine；部分 MoE/PCP fallbackhidden、expert 或 attention output视并行策略高频AllToAll(V)DeepEP、FlashInfer、MoRI、NIXL-EP 等 MoE backend 的 dispatch/combine按 expert owner 打包的 token/top-k metadataMoE 每层高频BroadcastPP sampled tokens/logits；少量 metadata/mapping；group 初始化token IDs、小 tensor 或 objectPP 每 step；其余低频P2P send/recvPP hidden states；EPLB/Elastic EP expert weightsactivation、expert weightsPP 高频；权重按需Barrier/object collective初始化、buffer/IPC handle 交换、EPLB/Elastic EP 协调metadata/同步信号低频，不是模型算子数据面外部 transfer/RPCKV/EC Connector、NIXL/Mooncake/MoRI/LMCache/HF3FS、Ray、ZMQ、HTTPKV/encoder cache、请求、调度与握手 metadata取决于 P/D、encoder 分离、offload 和执行器总体是：

- 先确定当前流量属于 model collective、P2P、KV transfer 还是 control plane；
- 再确定通信域是 TP、PP、PCP、DCP、DP、EP/EPLB，还是两个独立 vLLM instances；
- 最后结合模型接入、sequence-parallel gate 和 backend，判断逻辑阶段实际映射为 AG+RS、A2A、broadcast、send/recv 还是外部 RDMA/storage 操作。