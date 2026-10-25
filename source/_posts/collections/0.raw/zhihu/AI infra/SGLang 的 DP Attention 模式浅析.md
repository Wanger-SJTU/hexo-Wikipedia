---
title: "SGLang 的 DP Attention 模式浅析"
date: "2025-11-30 00:00:00"
updated: "2025-11-30 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AI-infra/SGLang-的-DP-Attention-模式浅析/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1978594821250783074"
---


为尽量介绍清楚 DP Attention 的顶层设计，本文有上万字，新手读者可能需要花费数个小时，才能掌握本文提及的知识。
## 1. 简介

前序的三篇笔记，先系统总结各种[SGLang 分布式集群模式](https://zhuanlan.zhihu.com/p/1950702248284894524)，然后对[TP 集群的完整执行流程](https://zhuanlan.zhihu.com/p/1953094521840702055)做解析，再重点介绍 [PP 集群的任务调度和分布式通信](https://zhuanlan.zhihu.com/p/1965709884877149831)。本文将讲解 DP Attention 集群，聚焦在任务调度和分布式通信，并着重介绍模型层 hidden state 张量的传播。

DP Attention 模式在注意力计算阶段将 GPU 拆分为多个组，同时将一批请求也拆分为多个小批次，每一组 GPU 处理一小批请求，在其他计算阶段 GPU 还是作为整体参与计算。这种模式主要用于 DeepSeek V2/V3 模型、Qwen 2/3 的 MoE 模型，可以降低集群整体的 KV Cache 显存占用和重复计算。

## 2. 为什么能降低重复存储和计算？

（1）DeepSeek V2/V3 模型

内部的注意力计算使用 MLA 结构，KV Cache 实际上存储的不是 KV 矩阵，而是压缩潜在向量和位置编码。所有的 HEAD 使用同一份 KV Cache，因此多个 TP rank 的 KV Cache 都是重复的，DP Attention 通过拆分批请求，可以减少 token 对应的 TP size，进而减少 KV Cache 重复。

（2）Qwen 2/3 MoE 模型的 GQA 结构

DP Attention 的优化效果主要体现在：当 TP size > KV HEAD size 时，传统 TP 模式下 KV HEADS 会在多个 TP ranks 间复制存储。启用 DP Attention 后，通过使用 attention TP 组（attn_tp_size = tp_size // dp_size），使得 KV HEADS 可以在 attn_tp_size 的并行度下分片，从而减少甚至消除 KV Cache 重复。

## 3. 名词解释


- <strong>DP rank:</strong>代表一组小 TP 集群，也叫做 attention TP group。本文提到的对 DP rank 的操作通常是指对它所代表的 TP rank 集合的操作。
- <strong>padding:</strong>分布式通信要求参与通信的张量形状一致，需要将形状小的张量对齐到大的张量，当前有两种对齐方式，MAX_LEN、SUM_LEN，后文会再详细介绍。
## 4. 进程视角架构图

举例：TP = 8, DP = 2, node = 2, enable dp attention

![](https://picx.zhimg.com/v2-61f31f52b410b302b61c4b5091f6504b_r.jpg)图1如上图所示，涉及 4 类进程：

- <strong>HTTP + tokenizer</strong> 组成服务入口进程，负责提供 HTTP 接口，以及将输入 prompt 转为 token id。
- <strong>DataParallelController</strong>（后面简称 Controller）负责接收请求并分发给多个 DP rank。每一个节点都会启动 Controller 进程，但只有 0 号节点会进入事件循环负责接收 tokenizer 的请求，其他节点在启动 TP 进程之后就进入等待 TP 进程退出的 join 中。
- <strong>Detokenizer</strong> 负责将模型生成的 token id 转回文本。
- <strong>所有 TP rank 组成的集群</strong>负责模型推理计算。TP rank 分为两组，DP rank 0 和 DP rank 1，每个 DP rank 下的 TP rank 单独从 0 开始编序号，命名为 attn_tp_rank，以区别全局的 tp_rank。在做注意力计算的时候，按照 DP rank 分组，在做 FFN 计算的时候所有 TP rank 一起算。注：DP 模式（包括 DP Attention）和 TP 模式在进程层面只是多了一个 Controller 进程，负责从 tokenizer 接收请求，然后分发给多个 DP rank。

进程之间主要有两类通信：

- <strong>输入和输出通信</strong>。所有 DP rank 下的 attn_tp_rank 0 负责接收请求，但只有 DP rank 0 下的 attn_tp_rank 0 负责将 next token id 发给 detokenizer 进程。
- <strong>hidden state 通信</strong>。不同的输入序列特点、FFN 并行设置等都会导致不同类型的 hidden state 通信，譬如：attn tp group 执行 reduce-scatter 通信、全局 TP rank 执行 all-gather、all-reduce 等。这部分和其他并行模式相比，更为精细，后文详细介绍。
## 5. 启动命令举例

（1）单机模式

python3 -m sglang.launch_server --model-path xxx --port 30000 --tp-size 8 --dp-size 2 --enable-dp-attention
参数说明：

- --tp-size：指定全集群 TP rank 数
- --dp-size：指定全集群 DP rank 数
- --enable-dp-attention：使用 DP Attention这个启动命令启动的集群为：TP8×DPA2，全集群有 8 个 TP rank，2 个 DP rank，每 4 个 TP rank 组成一个 DP rank。

（2）多机模式

多机模式的启动命令需要加上多机通信需要的 IP:Port、总节点数、本节点在多节点中的序号：

- --dist-init-addr [ip:port]：用于指明多机通信的首节点 IP 和起始端口
- --nnodes [总节点数]：用于指明总共有多少台机器组成一个 TP 集群 
- --node-rank [本节点号]：用于指明本节点在所有节点中的序号  # 两个节点，每个节点有 8 个 GPU，组成 TP16*DPA2 的集群
# 节点 0 12.123.123.123
NCCL_SOCKET_IFNAME=bond1 python3 -m sglang.launch_server --model-path xxx --dist-init-addr 12.123.123.123:20000 --nnodes 2 --node-rank 0 --tp-size 16 --dp-size 2 --enable-dp-attention --port 30000 
# 节点 1 其他 IP
NCCL_SOCKET_IFNAME=bond1 python3 -m sglang.launch_server --model-path xxx --dist-init-addr 12.123.123.123:20000 --nnodes 2 --node-rank 1 --tp-size 16 --dp-size 2 --enable-dp-attention --port 30000
其中 NCCL_SOCKET_IFNAME 用于 RDMA 通信前建立连接，bond1 绑定的是本机对外通信的 IP，这部分信息可以通过 ip addr show | grep bond 查看。如果使用了其他 bond，会导致启动失败。另外，也有文档提到，如果遇到启动失败，可以尝试设置环境变量 export NCCL_IB_GID_INDEX=3

（3）和 PP 模式组合

# 两个节点，每个节点有 8 个 GPU，16 个 GPU 组成 TP8*PP2*DPA2 的集群
# 节点 0 12.123.123.123
NCCL_SOCKET_IFNAME=bond1 python3 -m sglang.launch_server --model-path xxx --dist-init-addr 12.123.123.123:20000 --nnodes 2 --node-rank 0 --tp-size 8 --pp-size 2 --dp-size 2 --enable-dp-attention --port 30000
# 节点 1 其他 IP
NCCL_SOCKET_IFNAME=bond1 python3 -m sglang.launch_server --model-path xxx --dist-init-addr 12.123.123.123:20000 --nnodes 2 --node-rank 1 --tp-size 8 --pp-size 2 --dp-size 2 --enable-dp-attention --port 30000
集群的节点数是由 pp_size 和 tp_size 决定的，DP Attention 只是在 TP×PP 集群的基础上对每个 PP rank 下的 TP group 再做分组。

## 6. DP Attention 模式的限制

（1）DP size 必须满足: tp_size % dp_size == 0。

（2）DP rank 下的局部 TP 集群，attn_tp_size = tp_size // dp_size，需要满足 QKV HEAD 数的限制，attn_tp_size 必须能整除 Query HEAD 数，如果是 GQA 结构，还需要和 KV HEAD 数有整除关系。

注：之前分析 SGLang TP 模式时，介绍过 TP size 还受限于词典大小，而 DP Attention 模式不存在这个限制，因为 DP Attention 模式会让每一个 TP rank 都加载完整的词典，没有使用张量并行，相关代码见 VocabParallelEmbedding 对象的 enable_tp 参数。embedding 词典使用张量并行，可以降低显存消耗，而这里不采用是在显存和延时之间做 trade-off。

## 7. 进程启动的核心过程


### 7.1 流程图


![](https://pica.zhimg.com/v2-22191e3868fdef61d0b260287b344644_r.jpg)图 2
### 7.2 计算 GPU ID 编号和并行组编号

DP Attention 不影响集群的总 TP rank，也不影响已有的 PP rank、TP rank，DP Attention 只是在 TP group 里再做一次 DP 分组，产生一个 DP rank，以及 DP rank 所代表的局部 TP 分组：attn_tp_group。计算 GPU ID 编号和并行组编号主要是在计算 local GPU ID、TP rank、PP rank，这部分逻辑和之前 [SGLang 的 PP 模式浅析](https://zhuanlan.zhihu.com/p/1965709884877149831)文章一样，不再赘述。

### 7.3 计算请求分发的通信端口

Node 0 的 Controller 进程会获取请求分发的通信端口，然后将端口传递给其他 Node 的 Controller 进程，后续启动的 `Attn TP rank 0` 的 Scheduler 子进程会使用该端口做请求分发通信。

（1）请求的分发过程

![](https://pic4.zhimg.com/v2-b93499ac8c19bfb42dce6785a3e87aef_r.jpg)图 3如上图所示，请求首先从 tokenizer 传给 Controller，然后再由 Controller 分发给各个 DP rank 里的 Attn TP rank 0，这两步通信都通过 ZMQ 实现。最后，每个 DP rank 内再通过 pytorch 的广播组件将请求从 Attn TP rank 0 扩散到所有 Attn TP rank。

（2）准备请求分发通信端口

不同 Node 之间需要建立 ZMQ 通信连接，用于分发请求。之前介绍[分布式集群](https://zhuanlan.zhihu.com/p/1950702248284894524)时简单描述过通信端口的计算方法：所有节点都使用相同的计算规则，算出一样的端口号用于请求的传输。这种实现方式有缺陷：按照固定规则算出来的端口，在 Node 0 上有可能已被其它进程占用，最终导致服务启动失败。最近（2025.10）修复了这个缺陷：Node 0 先创建通信用的 dp_size 个 ZMQ 对象，然后将 ZMQ 对象的端口传递给其他 Node，其他 Node 使用该端口做请求通信。虽然端口的传递使用了 dist_init_port + 13，也是多机约定规则，仍然有可能冲突，但相比 dp_size 个使用规则算出来的端口，冲突概率大大降低了。

理想态思考：Node 0 作为主节点，应该在进程启动时指定一个端口作为和其它 Node 的"集群初始化通信端口"。当前启动命令里唯一涉及多机协同的 dist_init_addr 参数，被直接作为 pytorch 分布式通信初始化端口使用，无法用做集群初始化通信端口，应该考虑新设计一个参数，然后 dist_init_addr 参数也可以由集群初始化通信协商指定。

### 7.4 初始化分布式通信组

通信组的理论基础和之前 [SGLang 的 PP 模式浅析](https://zhuanlan.zhihu.com/p/1965709884877149831)文章一样，不再赘述。下面举个例子介绍 DP Attention 如何和 PP、TP 配合使用。

![](https://pic1.zhimg.com/v2-3e0cc7ce09bdfbbf9653d3670837a54a_r.jpg)图 4如上图所示，假设有 8 个 GPU 卡，组成 TP4  * PP2  * DPA2 集群，会构建多个通信组。可以发现 DP Attention 会在 TP group 下再增加一类通信组。在线上业务中，PP 模式比较少见，这里也绘制一个没有 PP 的通信组示意图：

![](https://pic1.zhimg.com/v2-781a11a5871cefee9f6f8c102cd99ab6_r.jpg)图 5如上图所示，假设有 8 个 GPU 卡，组成 TP8*DPA4 集群，TP group 为全局 8 张卡组成的通信组，DP Attention 会产生 4 个 attention TP group 通信组，每个通信组有两个 local TP rank。

### 7.5 代码瑕疵

（1）compute_dp_attention_world_info 函数会被反复的调用，用于计算 DP Attention 模式下的 tp_rank、tp_size、dp_rank。虽然这个计算量极低，但增加了代码阅读负担。结合当前 dp_attention.py 的设计，这些变量可以更早的算出来，然后作为 dp_attention.py 的私有成员使用，类似于 C++ 的单实例模式，或者也可以提炼出一个进程的并行属性数据类对象，在所有进程、关键类之间传递。总之，可以更清晰、更优雅。

（2）compute_dp_attention_local_info 函数疑似废弃。看起来是要计算 MoE dense 层的 tp_rank、tp_size、dp_rank，但实际上 initialize_dp_attention 函数里调用 compute_dp_attention_local_info 算出来的结果没有用到。这个函数命名也不准确，和 local 没有关系。

（3）_LOCAL_ATTN_DP_SIZE 变量和它的访问函数 get_local_attention_dp_size 疑似废弃。这个变量只用在调试输出 logits 时，但调试输出 logits 的 assert 疑似有错误：

        if self.debug_tensor_dump_output_folder:

```text
            assert (
                not self.do_tensor_parallel_all_gather
                or get_local_attention_dp_size() == 1
            ), "dp attention + sharded lm_head doesn't support full logits"
            full_logits = self._get_logits(hidden_states, lm_head, logits_metadata)
            dump_to_file(self.debug_tensor_dump_output_folder, "logits", full_logits)
```

这里的断言不合理。首先 _get_logits 函数会处理 all-gather；然后 _get_logits 的输出和 DP Attention 没有关系；第三 DP Attention 也不是通过 get_local_attention_dp_size 函数判断，应该是 get_attention_dp_size 函数。

## 8. 请求执行的关键过程

DP Attention 的推理执行过程，思路看起来很简单：首先给 DP rank 分发请求，然后各个 DP rank 执行注意力计算，最后所有 TP rank 一起执行 FFN。但实际代码实现却没那么简单，本章将采用：需要做什么（WHY+WHAT）--> 怎么做的（HOW），这样的模式来介绍。

### 8.1. 需要考虑的关键问题

在阅读代码之前，我们先基于过去的经验，设想 DP Attention 集群模式需要怎么做请求推理。

（1）请求的负载均衡，Controller 分发请求可以有多种方式，譬如：

基于先验特征的分发：

- 基于请求个数均衡，将新请求轮询的分发给 DP rank。
- 基于已分发的请求 token 数均衡，将新请求分发给 token 数低的 DP rank。基于实时信号的分发

- 根据分发时刻正在执行的请求数，将新请求分发给请求数低的 DP rank。
- 根据分发时刻正在执行的请求的 token 数，将新请求分发给 token 数低的 DP rank。
- 根据过去一段时间的请求耗时统计，将新请求分发给过去一段时间耗时比较低 DP rank。
- 根据分发时刻的硬件负载统计，将新请求分发给硬件负载低的 DP rank。（2）多个 DP rank 请求处理的协同

- 多个 DP rank 分别执行小批次请求的 Attention 计算，然后在 FFN 阶段一起执行大批次请求，需要通过分布式通信，确保所有 TP rank 步调一致。
- 推理请求流式的到达，逐个分发给不同的 DP rank，如果请求很稀疏，可能会导致每轮推理只有一个 DP rank 在执行 Attention 计算，所以 DP Attention 可能不适合请求很稀疏的场景，但请求很稀疏的时候，怎么让多个 DP rank 一起到达 FFN 子层，是需要考虑的点。（3）Attention 到 FFN 的 hidden state 通信

- Attention 计算完成后，需要怎么将 hidden state 传递给 FFN？Attention 计算是分请求分 HEAD 执行的，FFN 也有多种并行设计，如 moe_dense_tp_size=1、ep_size>1。这些因素会影响到 Attention 到 FFN 的 hidden state 传递方式，可能在 TP group 或者 Attention TP group 上采用：all-gather、all-reduce、reduce-scatter 等。
- all-gather、all-reduce 这些通信都要求参与计算的矩阵形状对齐，这里需要处理 padding。 基于上述的思考点，再来看 SGLang 是怎么实现 DP Attention 的。

### 8.2 SGLang 的实现简介

先简单图描述 SGLang 的关键实现。

![](https://pic3.zhimg.com/v2-d51a003baddeda5413fcf6d1d3a043fa_r.jpg)图 6包括四个关键点：

- DP rank 之间的负载均衡
- DP rank 之间的请求处理协同
- padding 对齐
- hidden state 的传输下面对这 4 个关键点展开介绍。

### 8.3 DP rank 负载均衡

<strong>8.3.1 负载均衡策略概览</strong>

![](https://pic1.zhimg.com/v2-3c93b44fc8647102b75c83e9fd6a53b4_r.jpg)图 7Controller 当前规划了 4 种分发策略，其中有 3 种已经实现。

- 指定 DP rank，只有通过 SDK 启动推理进程的时候才能使用，通常用于测试、调试。
- round robin 策略，请求轮询分发，每个 DP rank 在处理请求数上绝对平均。
- 最短请求队列策略，定期收集 Scheduler 进程未完成的请求个数，作为 Scheduler 进程的负载，将新请求分发给低负载的 Scheduler。
- 最少 token 数策略，当前未实现，代码里暂时用 round robin 策略代替。理论上应该是根据收集到的每个 Scheduler 完成的请求的 token 数作为负载，如果要更精细，还需要区分未开始执行的请求和已经执行了部分模型层的请求，以及需要考虑 chunk prefill 策略，最终折算成可对比的单位。<strong>8.3.2 收集 TP rank 负载</strong>

![](https://picx.zhimg.com/v2-f0c1592f604cbbd6a042410181b28be9_r.jpg)图 8如上图所示，收集负载有以下特点：

- 由 tokenizer 进程的定时器触发，默认每 0.1 秒往 Controller 发送一个 GetLoadReqInput 消息收集负载。
- Controller 将请求转发给 ATTN TP rank 0，ATTN TP rank 0 将请求广播给同 DP rank 的其它 ATTN TP rank。
- 虽然所有 TP rank 都会收集负载，但只有 ATTN TP rank 0 会回包 GetLoadReqOutput 给 tokenizer。
- tokenizer 收集到所有 ATTN TP rank 0 的 GetLoadReqOutput 回包之后汇总发送给 Controller。
- Controller 根据负载数据生成 budget_queue，queue 元素为可接收请求的 DP rank 序号，元素生成思路：通过逐步提升最小负载的 DP rank，最终让所有 DP rank 的请求数都相等（都达到负载最高的 DP rank）。注：当前的负载更新只支持"最短请求队列策略"，负载指标统计的是"未完成的请求数"。<strong>8.3.3 理想态的思考</strong>

（1）负载均衡策略

如果我们收到的请求序列长度非常均衡，那么请求数均衡意味着计算量均衡，使用 round robin 策略就足够了，实现也更简单。但如果请求长短不一，则用 token 数均衡更合理，但实现就要复杂一些。另外，看似用硬件负载来判断负载情况应该最好，但实际上 GPU 硬件的批处理特性，以及请求在 Scheduler 里有排队，导致 GPU 使用率无法准确描述实例的负载压力，所以当前使用未完成的请求数、token 数来判断是合理的。

再进一步思考，请求数和 token 数是在 controller 分发的时候就已知的先验信息，我们也许不需要等到请求进入 Scheduler 进程了才知晓请求的等待情况。推理计算复杂度和请求数、token 数强相关，以注意力计算为例，一个请求的计算复杂度和 token 数的平方成正比，所以可以根据过去的统计数据，拟合一个平方公式来量化一个请求带来的负载。但这种预先拟合的方法也可能遇到一些困难，譬如：一批请求理论上计算量一样，但因为一些微小的误差，譬如：某个实例的网络波动，预先拟合的公式无法实时捕获这部分信息，导致负载不均衡，而基于实时负载统计来做负载均衡可以确保局部异常及时捕获并做出反应。

整体来说，有多种思路，具体哪种方式更合理业务，还需要结合业务实测分析。

（2）DP rank 负载收集方式

当前的实现看起来比较绕：tokenizer --> DataParallelController --> Scheduler --> tokenizer --> DataParallelConroller。获取负载的计算量很轻，但实现得很复杂，我猜测只是为了复用已有的 ZMQ 通信通道，如果可以让 ATTN TP rank 0 提供获取负载的 HTTP 接口，实现会更简单：DataParallelController <--> Scheduler。为了复用 ZMQ，多引入了 tokenizer 模块以及两个消息，我认为是不划算的。

### 8.4 DP rank 之间的请求处理协同

DP rank 虽然是独立处理小批次请求的注意力计算，但后续的 FFN 计算需要一起执行，所以不同 DP rank 在执行 FFN 之前需要协调到一致的待执行状态，又考虑到简化分支处理，当前将多个 DP rank 的协调提早到了注意力开始计算之前，按需创建空请求（idle batch），让所有的处理进程执行一致的处理流程。

请求处理协同主要实现在 get_next_batch_to_run 函数。全局 TP rank 之间会做 all-gather 通信，每个 TP rank 都可以知晓全局的请求信息，这部分实现在 `prepare_mlp_sync_batch` 函数，包括：

- 待执行推理的 token 数。用于创建 idle batch 决策、 padding 模式决策、分配 FFN 层 buffer。
- 要获取 logprob 输出的 token 数。
- 是否使用 cuda graph。只有所有 rank 都可以使用 CUDA graph 时才启用。
- 是否为 extend batch。用于 padding 模式决策。
- 用于 TBO 的相关信息。协同中比较重要的逻辑是创建 idle batch。当本 TP rank batch 为 None，而其他 TP rank token 数不为 0 时，创建 idle batch。代码实现时还考虑到和其他功能的兼容：

- 推测采样。多个 DP rank 之间 decode 和 prefill 不能混。
- prefill 优先策略。先获取 prefill，然后再获取 decode。`get_next_batch_to_run` 请求协同的流程如下：

![](https://pica.zhimg.com/v2-ca05e97270c7e7ffcc4aa1918aa7331e_r.jpg)图 9不同的并行模式都会调用 `get_next_batch_to_run` 函数，但它们不需要感知到内部获取待执行 batch 的执行细节。获取到可以执行的请求之后，进入请求执行环节，在执行开始时会先做 padding 对齐，下面介绍 padding 对齐。

### 8.5. padding 对齐

<strong>8.5.1. SUM_LEN 和 MAX_LEN</strong>

（1）SUM_LEN 和 MAX_LEN 是什么

- SUM_LEN padding 表示每个 DP rank 处理的小批次请求的序列长度对齐到完整批次请求的总序列长度。通信需要采用 all-reduce。
- MAX_LEN padding 表示每个 DP rank 处理的小批次请求的序列长度对齐到所有 DP rank 里最长的序列长度。通信需要采用 all-gather。
- 这些 padding 方式会影响到数据通信采用 all-reduce 还是 all-gather。（2）SUM_LEN 和 MAX_LEN 的抉择

对齐方式的决策代码在 `dp_attention.py` 的 `DpPaddingMode.get_dp_padding_mode` 函数:

```python
def get_dp_padding_mode(
        cls, is_extend_in_batch, global_num_tokens: List[int]
    ) -> DpPaddingMode:
        if is_extend_in_batch:
            return DpPaddingMode.SUM_LEN
```


        # we choose the mode that minimizes the communication cost

```text
        max_len = max(global_num_tokens)
        sum_len = sum(global_num_tokens)
        if sum_len * 2 > max_len * get_attention_dp_size():
            return cls.MAX_LEN
        else:
            return cls.SUM_LEN
```

上述代码包含两条规则：

- 如果任意 DP rank 有 extend 请求则使用 SUM_LEN。这估计是为了降低代码复杂度：不同 DP rank 分别处理 Decode 和 Prefill 请求时，如果选择 MAX_LEN padding，那么需要将 Decode 请求转为 Extend，以统一数据格式方便做 padding，这会增加代码复杂度。并且大多数情况下 extend 请求的序列长度差异比 decode 大，SUM_LEN 通常是合理的。
- 如果 sum_len * 2 > max_len * dp_size，则使用MAX_LEN，否则使用SUM_LEN。这是基于通信量考虑的，这个公式简单的按照一个元素的传输次数来估算通信量，sum_len对应使用all-reduce通信，max_len对应使用all-gather通信，all-reduce一般由reduce-scatter和all-gather构成，所以乘上因子 2。这个规则可以简单理解为：token 数差异小的使用MAX_LEN，token 数差异大的使用SUM_LEN。extend 的请求一般差异比较大（对比 decode），强制使用SUM_LEN也符合这条规则。（3）SUM_LEN 和 MAX_LEN 在注意力计算和通信上的对比

SUM_LENMAX_LENAttention 计算在实际 token 数上（无 padding）在 padded max_len 上（包含 padding tokens）Gather 方式all_reduceall_gatherGather 通信量sum_len * 2 * hidden_sizemax_len * dp_size * hidden_sizeBuffer 大小sum(global_num_tokens)max(global_num_tokens) * dp_size常用场景ExtendDecode<strong>8.5.2 常见问题</strong>

（1）为什么 MAX_LEN 要 padding 之后再做注意力计算？

MAX_LEN 只用在 decode 场景，多个 DP rank padding 到一致的长度之后再做注意力计算，可以更方便的使用 Symmetric Memory、Reduce-Scatter 优化、CUDA Graph 功能。同时，因为 decode 场景下序列长度差异很小，带来的计算浪费很少。

（2）为什么 extend 请求要强制使用 SUM_LEN？

当 extend 请求的 token 数差异不大时，按照通信公式，应该是 MAX_LEN 的通信量更低。但从计算效率的角度看，MAX_LEN 模式 padding 部分的注意力计算浪费可能比较高，还是应该选择 SUM_LEN。

譬如：假设有 4 个 DP rank，token 数分别为 [800, 900, 950, 1000]。

- max_len=1000，sum_len=3650
- sum_len * 2 = 7300, max_len * dp_size = 4000
- 按照公式会选择 MAX_LEN，但这意味着会有 (1000-800) + (1000-900) + (1000-950) = 250 个 padding token 参与 attention 计算， 250/4000=6.25% 的无效计算，浪费较多。另外，如果可以实现一个没有 padding 计算浪费的 MAX_LEN，则应该使用 MAX_LEN。

（3）对齐做了什么？

虽然有两种 padding 方式，但实际上只有 MAX_LEN 会将每个 DP rank 的处理序列填充到 max_len 长度去做注意力计算（注：为了后序做 reduce-scatter 通信，还可能进一步对齐，让 padding 后的长度能被 attn_tp_size 整除），SUM_LEN 模式不会给请求序列填充 token。

（4）SUM_LEN 的代价

从前面的分析已知道，在处理序列长度差异比较大的时候选择 SUM_LEN 通信量更低，但也注意到，SUM_LEN 模式下无法使用 CUDA Graph，这是 decode 请求选择 SUM_LEN 需要付出的代价。但如果选择 MAX_LEN 可能会更差，需要付出更高的通信代价、浪费 padding token 的注意力计算、更多的用于 all-gather 的显存 buffer。

<strong>8.5.3 代码瑕疵</strong>

疑似废弃代码，ForwardBatch.prepare_mlp_sync_batch 函数里 decode 转为 extend 的逻辑是废弃的，因为在判断 padding 模式的策略代码里已经限定了当 is_extend_in_batch=True 时，padding 一定是 SUM_LEN，if self.is_extend_in_batch and dp_padding_mode.is_max_len() 这个条件不可能是 True。

### 8.6. hidden state 和 residual 的传输

<strong>8.6.1. 三次数据转换</strong>

一层模型推理涉及三次数据模式的转换，转换背后隐藏着分布式通信，将数据从一种模式另一种模式。

![](https://pic4.zhimg.com/v2-249fe6a34512b93b9a1bbe5fdeba986f_r.jpg)图 10
- 转换 1：layer_input_mode → attn_mode，使用 `_communicate_simple_fn` 
- 转换 2：attn_mode → mlp_mode（+ residual 处理）使用 `_communicate_with_all_reduce_and_layer_norm_fn` 
- 转换 3：mlp_mode → layer_output_mode（+ residual 处理）使用 `_communicate_summable_tensor_pair_fn` 如果转换的输入和输出模式一样，会跳过转换（转换函数指定为 _trivial）。数据模式在模型加载时就已知，因此转换函数的选择也是在模型加载的时候做的。代码见 `communicator.py` 文件的 `LayerCommunicator` 函数，模型的每一层都有一个 LayerCommunicator 对象用来指导数据转换。

<strong>8.6.2 数据模式和数据阶段</strong>

（1）状态枚举值

SGLang 设计了一套状态值来描述数据模式，然后根据数据模式转换的输入和输出的状态值来决策传输方式。这套状态机制有三个枚举值，SCATTERED、TP_ATTN_FULL、FULL，分别表示 token 序列的三种状态：DP rank 部分、DP rank 完整、全局完整。 

举个例子：假设 TP=4，DP=2，enable-dp-attention，系统处理 4 个请求序列：a、b、c、d，不同状态值对应的请求序列如下：

状态值4 个 TP rank 持有的请求序列Model input/output[ab, ab, cd, cd]，请求初始状态，DP rank 内的每个 TP rank 都有该组的完整数据SCATTERED[a, b, c, d]，每个 TP rank 持有 DP rank 的一部分请求TP_ATTN_FULL[ab, ab, cd, cd]，DP rank 内的每个 TP rank 都有该组的完整数据FULL[abcd, abcd, abcd, abcd]，所有 TP rank 都有全局所有数据状态值并不能完整描述数据模式，不同数据模式除了数据的形状的差异之外，还可能有值的差异。譬如：Attention 计算的输入和输出都是 TP_ATTN_FULL 模式，但输入的 hidden state 值是完整的，输出的 hidden state 值是不完整的。我觉得当前的数据模式枚举有优化空间，枚举值如果把 hidden state 值的状态也体现出来，代码会更清晰。详细代码见 `communicator.py` 的 `ScatterMode` 数据类。

（2） 数据阶段划分

每个模型层的 LayerScatterModes 对象记录了各个阶段的数据模式，LayerScatterModes 对象的成员如下表：

变量代表阶段含义layer_input_modeLayer 输入这一层 Attention 前的数据状态attn_modeAttention 输入和输出总是 TP_ATTN_FULL，作为输入时值完整；作为输出时值不完整，需要 all_reducemlp_modeFFN 输入和输出可以是 FULL 或者 SCATTEREDmiddle_residual_modeAttention 后，FFN 前中间残差；来自上一次的输出，可以是 TP_ATTN_FULL 或者 SCATTEREDlayer_output_modeLayer 输出经过 postprocess_layer 处理后的数据状态（传给下一层）从成员变量的设计可以看出 Attention 计算和 FFN 计算的输入输出 token 序列状态是不变的。

（3）不同阶段的数据模式枚举

![](https://pic4.zhimg.com/v2-1359171661b535edfc54b20cf7448f63_r.jpg)图 11上图展示不同阶段的数据模式，什么时候是 SCATTERED，什么时候是 TP_ATTN_FULL？这些数据模式是由什么决定的？下面表格做汇总整理：

阶段ScatterModeToken 范围Hidden State 值出现条件Layer InputTP_ATTN_FULL完整(该 DP rank 的所有 token)完整第一层；上一层输出为 TP_ATTN_FULLLayer InputSCATTERED部分(该 DP rank 的部分 token)完整上一层输出为 SCATTEREDAttention 输入TP_ATTN_FULL完整(该 DP rank 的所有 token)完整无条件，默认模式Attention 输出TP_ATTN_FULL完整(该 DP rank 的所有 token)不完整无条件，默认模式FFN 输入&输出FULL完整(全局所有 token)完整MoE 层且不使用 a2a backend；或非 MoE 层且 moe_dense_tp_size=NoneFFN 输入&输出SCATTERED部分(该 DP rank 的部分 token)完整MoE 层使用 a2a backend；或非 MoE 层且 moe_dense_tp_size=1Middle ResidualTP_ATTN_FULL完整(该 DP rank 的所有 token)完整mlp_mode 为 FULLMiddle ResidualSCATTERED部分(该 DP rank 的部分 token)完整mlp_mode 为 SCATTEREDLayer OutputTP_ATTN_FULL完整(该 DP rank 的所有 token)完整最后一层(模型输出)，或非最后一层且 mlp_mode 为 FULLLayer OutputSCATTERED部分(该 DP rank 的部分 token)完整非最后一层且 mlp_mode 为 SCATTERED<strong>8.6.3 转换1：Attention 计算前的处理</strong>

转换的输入可以是 SCATTERED、TP_ATTN_FULL，输出只能是 TP_ATTN_FULL，如下图：

![](https://pic3.zhimg.com/v2-57aa980d748818840ee82fef1097bcc2_r.jpg)图 12如上图所示，`_communicate_simple_fn` 函数根据层输入的不同数据模式，决策使用不同的数据传输模式，最终都转换为 ATTN 计算的输入 TP_ATTN_FULL 格式，经过注意力计算之后输出的也还是 TP_ATTN_FULL 格式。

<strong>8.6.4 转换2：FFN 计算前的处理</strong>

（1）两类数据需要转换

转换函数需要一起处理 hidden state 和 residual（残差）。有一些特点：

hidden state 数据转换为 FULL 对应到稀疏层（sparse），转换为 SCATTERED 对应到启用了 DP 的稠密层（dense），即开启 moe_dense_tp_size=1。

residual 数据转换的输入模式可以和 hidden state 不同，转换函数会先将 residual 转换为和 hidden state 一样的数据模式，然后再一起做转换。同时，因 residual 只需要在一个 TP rank 上加一次的特点，使得 residual 数据转换的输出模式有时和 hidden state 不同。

Hidden State 输入Residual 输入Hidden State 输出Residual 输出对应函数使用场景TP_ATTN_FULLTP_ATTN_FULL 或 SCATTEREDFULLTP_ATTN_FULL_gather_hidden_states_and_residual稀疏 MoE 层TP_ATTN_FULLTP_ATTN_FULL 或 SCATTEREDSCATTEREDSCATTERED_scatter_hidden_states_and_residual启用 DP 的 dense 层（2）数据转换时 residual 的输入为什么会和 hidden state 的输入不一样？

residual 转换的输入来自上一层的输出（没有上一层则是原始请求），可能是 TP_ATTN_FULL 或者 SCATTERED，并且值完整，而 hidden state 转换的输入来自注意力计算的输出，固定是 TP_ATTN_FULL，并且值不完整。

（3）以 hidden state 数据为例，介绍 FFN 计算之前数据模式的转换

转换函数的输入固定是 TP_ATTN_FULL 并且值不完整，输出可以 FULL、SCATTERED，并且在 attn_tp_size=1 时可以做通信优化，一共有三个转换函数。

![](https://picx.zhimg.com/v2-2c9dd8bee6273c773f2425f550a0c143_r.jpg)图 13第一个转换是空的，因为转换函数的输入和输出数据模式一致。

第二个转换时，单个 TP rank 上有所有 token 的 hidden state，分为 3 种情况：

- attn_tp_size = 1 && padding = MAX_LEN，在全局 TP rank 上执行 all-gather。
- attn_tp_size > 1 && padding = MAX_LEN, Attention TP group 使用 reduce-scatter,全局 TP group 使用 all-gather。
- padding = SUM_LEN，在全局 TP rank 上 使用 all-reduce。
第三个转换是让单个 TP rank 上有部分 token 的 hidden state，直接在 DP rank 内部使用 `reduce-scatter`，不需要考虑 padding，因为这是 DP rank 内部的数据重组。注：转换3：FFN 输出转为层的输出和转换 2 的分析类似，略过。数据模式转换相关的代码在 `communicator.py` 和 `dp_attention.py` 文件中。

整体代码阅读起来比较累，各种分支非常多，这部分代码也许可以优化得更清晰、简洁。

<strong>8.6.5 padding 影响 hidden state 的传输模式</strong>

相关判断代码见 `dp_attention.py` 的 `_dp_gather` 函数：

```python
def _dp_gather(
    global_tokens: torch.Tensor,
    local_tokens: torch.Tensor,
    forward_batch: ForwardBatch,
    is_partial: bool,
```

):

```text
    if forward_batch.dp_padding_mode.is_max_len():
        _dp_gather_via_all_gather(
            global_tokens, local_tokens, forward_batch, is_partial
        )
    else:
        _dp_gather_via_all_reduce(
            global_tokens, local_tokens, forward_batch, is_partial
        )
```


### 8.7. hidden state 传输举例

前面介绍和 hidden state 传输相关的内容比较多而且碎，这里用几个例子来串起来。

<strong>8.7.1 普通模式</strong>

本节介绍 DP Attention 在非 EP 模式或者是 EP 模式使用 FuseEP，并且 `moe-dense-tp-size=None` 时的 hidden state 传输。

![](https://pica.zhimg.com/v2-d78366971eaf50eb55232542b40543dc_r.jpg)图 14如上图所示的状态流转，是前面几节介绍的基础知识的综合使用，有几个前面没提到的细节优化:

（1）当开启了 EP，但是不使用 DeepEP 或者 MOONCAKE，而使用标准 EP——FuseEP 时，FFN 层的输入和输出和非 EP 模式一样；

（2）通信合并优化：FFN 计算完后得到的是 FULL 模式的数据，但值不完整。普通路径需要先做 all-reduce（全局 tp_group 通信），然后做 dp_scatter（本地内存拷贝），将数据变为 TP_ATTN_FULL 模式；优化路径将"all-reduce（通信）+ dp_scatter（本地拷贝）"替换为"reduce-scatter（通信）+ all-gather（通信）"，可以减少通信量，降低显存峰值。对比如下:

路径 1（普通路径，不使用 reduce-scatter 优化）：

- FFN 计算后，输出 FULL 模式，值不完整。
- 执行 all-reduce（全局 tp_group），变成 FULL 模式，值完整。注：在 MoE Forward 函数里执行。
- 执行 dp_scatter（本地内存拷贝），从 FULL → TP_ATTN_FULL。路径 2（优化路径，使用 reduce-scatter，触发条件：padding=MAX_LEN）：

- FFN 计算后，输出 FULL 模式，值不完整，MoE Forward 跳过 all-reduce。
- 执行 dp_reduce_scatter_tensor：在全局 tp_group 内执行 reduce_scatter_tensor （通信操作）、在 attn_tp_group 内执行 all_gather_into_tensor（通信操作）、最终输出 TP_ATTN_FULL。
<strong>8.7.2 DeepEP/MOONCAKE 模式</strong>

本节介绍 DP Attention 的 MoE 计算开启 DeepEP 或者 MOONCAKE 时的 hidden state 传输。

举例：TP4*DPA2 DeepEP/MOONCAKE 模式：

1、FFN 计算的 dense 层和普通模式一样，输入和输出都是 FULL，这里不做绘制；仅展示 MoE 使用了 DeepEP/MOONCAKE 的场景：输入和输出都是 SCATTERED。

2、最后一层的层输出是 TP_ATTN_FULL，这里不做绘制，仅绘制非最后一层，层输出是 SCATTERED 到场景。

![](https://pic4.zhimg.com/v2-8c53940e5c58a188198c60249b7a6b27_r.jpg)图 15如上图所示的状态流转，是前面几节介绍的基础知识的综合使用，有一个前面没有提到的细节：FFN 计算的 dense 层，以 DeepSeek V3 为例，它有 61 层，其中前 3 层是 dense 结构（两层的 MLP），后面的 58 层是 sparse 结构（MoE）。dense 结构做 FFN 计算时，输入和输出都是 FULL 模式，在全局 TP 很大的时候，这里每一个 TP worker 的计算量很小，也可以使用 DP 模式来优化性能，这就是 moe-dense-tp-size=1 功能选项，下一节做介绍。

<strong>8.7.3 moe_dense_tp_size=1</strong>

FFN 计算的 dense 层使用 moe_dense_tp_size=1，表示 dense 层以 DP 方式执行，并且每一个 DP rank 下的 tp_size 为 1。dense 层的输入和输出都是 SCATTERED 的，和 sparse 层开启 DeepEP 一样。这对 dense 层的通信量、显存峰值都有优化：

- prepare_mlp 阶段：原本需要获取全局序列（all-reduce），现在只需要 reduce-scatter 到 1/tp_size 的本地序列。
- postprocess_layer 阶段：原本需要 reduce-scatter 或 all-reduce（取决于是否使用 MAX_LEN padding），现在只需要 attn_tp_all_gather 将 scattered 数据聚合回 TP_ATTN_FULL。下面表格展示对 dense 层使用 moe-dense-tp-size 优化前后的对比：

阶段传统模式 (moe_dense_tp_size=0)优化模式 (moe_dense_tp_size=1)Attn 输出TP_ATTN_FULLTP_ATTN_FULLprepare_mlpTP_ATTN_FULL → FULL (需要全局 gather)TP_ATTN_FULL → SCATTERED (reduce-scatter)MLP 输入全局序列 (100%)本地序列 (1/tp_size)MLP 计算每个 rank 处理全部 tokens每个 rank 只处理 1/tp_size tokenspostprocess_layerFULL → TP_ATTN_FULL (reduce-scatter + dp gather)SCATTERED → TP_ATTN_FULL (仅 dp gather)这种模式对 DeepSeek V2/V3 模型有明显的性能优化，参见 2025.05 左右 [SGLang 官方博客文章(dense-ffns)](https://link.zhihu.com/?target=https%3A//lmsys.org/blog/2025-05-05-large-scale-ep/%23dense-ffns)。

<strong>8.7.4 理想态思考</strong>

（1）统一数据模式转换架构

通过上面普通模式和 DeepEP/MOONCAKE 模式的对比，我们可以发现两个架构图的数据转换模式最大的差异是：普通模式在 FFN 之后做数据模式转换，DeepEP 模式在 ATTN 之前做数据模式转换，可以想办法做统一，然后消除掉 FFN 到层输出的数据模式转换，简化架构。

## 9. 其他技术点的思考

（1）moe_dense_tp_size 看起来是影响 dense MLP 层，为什么要单独设计一个 moe_dense_tp_size 参数，而不是像 LM 一样使用 enable_dp_lm_head 参数？

当前虽然 moe_dense_tp_size 只能选择 1 或者 None，但这里给未来预留了空间，moe_dense_tp_size 可以是其他值，这个值可以和 attn_tp_size 不同。

（2）sparse MoE 层不需要独立的 moe_sparse_tp_size 参数，因为它已经有了 Expert Parallelism (EP) 这个独立的并行维度来控制其并行行为。

## 10. 参考文档

在本文的总结过程中，除了查看源代码，也借助 deepwiki 以及其他 AI 工具辅助理解，并且以下文档也提供了较多的帮助：

- SGLang 官方博客介绍 DP：[https://lmsys.org/blog/2024-12-04-sglang-v0-4/#data-parallelism-attention-for-deepseek-models](https://link.zhihu.com/?target=https%3A//lmsys.org/blog/2024-12-04-sglang-v0-4/%23data-parallelism-attention-for-deepseek-models)
- SGLang 官方博客介绍 Dense FFN 的优化：[https://lmsys.org/blog/2025-05-05-large-scale-ep/#dense-ffns](https://link.zhihu.com/?target=https%3A//lmsys.org/blog/2025-05-05-large-scale-ep/%23dense-ffns)
- SGLang DP Attention 介绍： [https://zhuanlan.zhihu.com/p/1907142274942501938](https://zhuanlan.zhihu.com/p/1907142274942501938)
- 梳理 SGLang 中 DP Attention 及其 Padding 问题： [https://zhuanlan.zhihu.com/p/1938017616435320355](https://zhuanlan.zhihu.com/p/1938017616435320355)