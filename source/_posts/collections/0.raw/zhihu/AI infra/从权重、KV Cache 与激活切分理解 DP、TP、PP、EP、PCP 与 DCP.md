---
title: "从权重、KV Cache 与激活切分理解 DP、TP、PP、EP、PCP 与 DCP"
date: 2026-08-13
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2071278362212021889
---

可以用一套“切分依赖图”理论统一理解：

 并行策略的本质，是选择某个维度切开计算图；被切开的依赖边决定通信内容。推理中的显存对象分三类：

- 权重：静态、容量大。
- KV cache：随上下文和并发增长，是持久状态。
- 激活：当前 forward 的临时张量，主要是 hidden states、Q/K/V、MoE token buffer。
1. 统一记号
设：

- Transformer 层数为 
![](https://www.zhihu.com/equation?tex=L)，hidden size 为 
![](https://www.zhihu.com/equation?tex=H)。
- 当前 forward 共处理 
![](https://www.zhihu.com/equation?tex=N) 个 token。Prefill 时 
![](https://www.zhihu.com/equation?tex=N%3D%5Csum_i+S_i)；普通 decode 时 
![](https://www.zhihu.com/equation?tex=N%3DB)。
- 激活类型每元素 
![](https://www.zhihu.com/equation?tex=b_a) 字节，则一份完整 hidden states 大小为 
![](https://www.zhihu.com/equation?tex=A%3DNHb_a)。
- KV 类型每元素 
![](https://www.zhihu.com/equation?tex=b_k) 字节，每 token 每层 KV 宽度为 
![](https://www.zhihu.com/equation?tex=d_K%2Bd_V)。
- 完整 KV cache 为 
![](https://www.zhihu.com/equation?tex=K%3DLBT%28d_K%2Bd_V%29b_k)。
- 某层 prefill 新生成的 KV 为 
![](https://www.zhihu.com/equation?tex=K_%5Cell%3DN%28d_K%2Bd_V%29b_k)。
- MoE 每个 token 激活 
![](https://www.zhihu.com/equation?tex=r) 个专家。
- 并行度统一写成 
![](https://www.zhihu.com/equation?tex=p)。对于 GQA/MHA，
![](https://www.zhihu.com/equation?tex=d_K%2Bd_V%3D2n_%7B%5Cmathrm%7Bkv%7D%7Dd_h)；MLA 则替换成 latent KV 宽度。

以下通信量均指理想 ring 实现中“每个 rank 的发送字节数”；若统计收发总和再乘 
![](https://www.zhihu.com/equation?tex=2)：

- AllReduce 大小为 
![](https://www.zhihu.com/equation?tex=X)：
![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BAR%7D%7D%3D2%28p-1%29X%2Fp)。
- AllGather 最终张量大小为 
![](https://www.zhihu.com/equation?tex=X)：
![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BAG%7D%7D%3D%28p-1%29X%2Fp)。
- ReduceScatter 输入大小为 
![](https://www.zhihu.com/equation?tex=X)：
![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BRS%7D%7D%3D%28p-1%29X%2Fp)。
2. 总表
策略切分维度权重KV cache激活主要通信DP请求/批次每个副本完整复制请求归属某副本，不切单请求各副本处理不同 token模型层内无通信DP-attentionAttention 按请求，FFN/MoE 跨卡Attention 多份复制；FFN/MoE TP 或 EP请求级分散，无 Attention-DP 重复Attention 局部，FFN 前聚合AllGather + ReduceScatterTPhidden/head/intermediate 维约 W/p按 KV head 切，head 不够时复制层内 feature shard每层通常 2 次 AllReducePPlayer 维约 W/p按层自然切为约 K/p每阶段处理完整 hidden 的 microbatch相邻 stage P2PEPexpert 维专家权重约 W_e/p不直接影响 KVtoken 按路由重排Dispatch A2A + Combine A2APCPprefill 的 sequence 维CP 维通常复制理想实现按序列切为 K/ptoken/sequence shardKV AllGather 或 Ring P2PDCPdecode 的 KV sequence 维沿用 TP；可选复制 Q 投影按上下文切为 K/p对局部 KV 算 partial attentionQ/输出/LSE collective
3. DP：切请求

切什么
每个 DP replica 有完整模型，处理不同请求：

- 权重：完整复制。
- 单个请求的 KV：全部放在一个 replica，不跨 DP 切分。
- 激活：完全本地。固定总负载且均衡时，每个 replica 平均持有约 
![](https://www.zhihu.com/equation?tex=K%2Fp_%7B%5Cmathrm%7BDP%7D%7D) 的 KV，但这是“不同请求的分布”，不是一个请求的 KV 被切开。

通信
模型 forward 中基本为零，只需要：

- 请求路由和负载均衡。
- 多副本状态管理。
- 训练时才有梯度 AllReduce，纯推理没有。
使用场景

- 单副本能装下模型。
- 请求并发高，目标是吞吐。
- 跨节点网络较慢。
- 希望故障隔离和独立扩缩容。DP 不降低单请求延迟，也无法让单个超长请求跨卡共享 KV 容量。

4. DP-attention：Attention 做 DP，FFN/MoE 仍共享
这是 SGLang/DeepSeek 体系中特别重要的一种混合布局，不等于普通 DP。

为什么需要
MLA/MQA 的 KV head 很少。假设只有一个 KV head，TP8 无法继续按 head 切 KV，于是 8 张卡可能都保存同一份 KV。DP-attention 改为：

- 不同 rank 处理不同请求的 Attention。
- 每个请求的 KV 只放在它所属的 attention-DP rank。
- Attention 后把 token 聚合，进入跨卡 FFN/MoE。
- FFN/MoE 后再散回请求所属 rank。SGLang 的原始设计就是 Attention 后 AllGather、MoE 后重新分发，从而消除 MLA KV 的 TP 重复。[SGLang DP-attention 说明](https://link.zhihu.com/?target=https%3A//www.lmsys.org/blog/2024-12-04-sglang-v0-4/)

对象切分

- Attention 权重：在 attention-DP 维复制。若 DP-attention 度等于 TP 度，常见情况是每张卡持有完整 Attention 权重。
- MoE 专家权重：通常 EP 切分。
- Dense FFN：可 TP，也可 DP。
- KV：按请求分散，每个请求不切上下文。
- Attention 激活：每 rank 只有本地请求，约 
![](https://www.zhihu.com/equation?tex=A%2Fp)。
- MoE 前：恢复成全局 token 集合。
通信量
理想的 AllGather + ReduceScatter，每层每 rank 约为：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BDPAttn%7D%7D+%5Capprox+2%28p-1%29A%2Fp)。

如果 token 数不均衡，还会有 padding 或 AllGatherv/ReduceScatterv 成本。

适用场景

- DeepSeek、Qwen MoE 等模型。
- MLA/MQA/GQA，KV head 少于 TP 度。
- 高并发 decode，KV 容量比 Attention 权重更宝贵。
- 常与 EP、DeepEP、TBO/SBO 组合。不适合：

- Attention 权重本身特别大，复制不起。
- 请求数少，DP rank 吃不满。
- 各 DP rank 混合 prefill/decode 导致严重不均衡。Kimi K3 就是一个反例：纯 DP-attention 会复制大量 KDA/MLA 权重，因此其 prefill/decode 选择了不同策略。[Kimi K3 并行方案](https://link.zhihu.com/?target=https%3A//www.lmsys.org/blog/2026-07-27-kimi-k3-day0-support)

5. TP：切层内矩阵
对于线性层 
![](https://www.zhihu.com/equation?tex=Y%3DXW)：

- 按 
![](https://www.zhihu.com/equation?tex=W) 的输出维切：得到 column-parallel，输出 feature-sharded。
- 按 
![](https://www.zhihu.com/equation?tex=W) 的输入维切：每张卡得到 partial sum，需要 AllReduce 或 ReduceScatter。Megatron 风格通常安排为：

- QKV projection column-parallel。
- 每张卡计算部分 attention heads。
- Attention output projection row-parallel，结束后 AllReduce。
- FFN up/gate column-parallel。
- FFN down row-parallel，结束后 AllReduce。这也是经典 Megatron-LM TP 布局。[Megatron-LM 论文](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1909.08053)

对象切分

- 主体矩阵权重：约 
![](https://www.zhihu.com/equation?tex=W%2Fp_%7B%5Cmathrm%7BTP%7D%7D)。
- Norm、bias、部分 embedding 可能复制。
- 激活：GEMM 内 feature-sharded；残差边界通常恢复完整。
- KV：按 KV head 切。若有 
![](https://www.zhihu.com/equation?tex=n_%7B%5Cmathrm%7Bkv%7D%7D) 个 KV heads，则每 rank 的 KV 约为：

![](https://www.zhihu.com/equation?tex=K_%7B%5Cmathrm%7Brank%7D%7D+%5Capprox+K%2F%5Cmin%28p_%7B%5Cmathrm%7BTP%7D%7D%2Cn_%7B%5Cmathrm%7Bkv%7D%7D%29)。

所以：

- MHA 且 
![](https://www.zhihu.com/equation?tex=n_%7B%5Cmathrm%7Bkv%7D%7D%5Cge+p)：KV 约降为 
![](https://www.zhihu.com/equation?tex=K%2Fp)。
- GQA 且 KV head 少：只能部分下降。
- MLA/MQA 且 
![](https://www.zhihu.com/equation?tex=n_%7B%5Cmathrm%7Bkv%7D%7D%3D1)：每 rank 仍是完整 KV。
通信量
标准 Transformer block 通常有两次大小为 
![](https://www.zhihu.com/equation?tex=A) 的 AllReduce：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BTP%7D%7D+%5Capprox+4%28p-1%29A%2Fp)。

这是每层都发生的同步，因此 TP 对低延迟互联非常敏感。

使用场景

- 单卡放不下模型。
- 希望降低单请求 GEMM 延迟。
- 最适合 NVLink/NVSwitch 域内。
- 不宜轻易把高 TP 横跨低带宽节点。
6. PP：切层
把 
![](https://www.zhihu.com/equation?tex=L) 层分成 
![](https://www.zhihu.com/equation?tex=p_%7B%5Cmathrm%7BPP%7D%7D) 个连续 stage：

- Stage 0 保存前几层。
- Stage 1 保存下一段。
- 依次向后传递 hidden states。
对象切分

- 权重：约 
![](https://www.zhihu.com/equation?tex=W%2Fp_%7B%5Cmathrm%7BPP%7D%7D)。
- KV：每个 stage 只保存自己层的 KV，约 
![](https://www.zhihu.com/equation?tex=K%2Fp_%7B%5Cmathrm%7BPP%7D%7D)。
- 激活：feature 不切；按 microbatch 或 prefill chunk 流过 pipeline。
- 每个 stage 只保留当前 microbatch 和通信 buffer。
通信量
每个 stage 边界发送一次 hidden states：

- 一条请求穿过整个 pipeline 的集群发送量约为 
![](https://www.zhihu.com/equation?tex=%28p_%7B%5Cmathrm%7BPP%7D%7D-1%29A)。
- 中间 stage 每个 microbatch 收一次、发一次，约处理 
![](https://www.zhihu.com/equation?tex=2A_%5Cmu)。PP 最大优势是通信只发生在 stage 边界，而不是每层；最大问题是 bubble。若有 
![](https://www.zhihu.com/equation?tex=m) 个 microbatch，理想 bubble 比例约为：

![](https://www.zhihu.com/equation?tex=%5Crho_%7B%5Cmathrm%7Bbubble%7D%7D%5Capprox+%28p_%7B%5Cmathrm%7BPP%7D%7D-1%29%2F%28m%2Bp_%7B%5Cmathrm%7BPP%7D%7D-1%29)。

SGLang 的长上下文 PP 会把 prefill 切成 chunk，并用异步 P2P 将通信隐藏在下一 chunk 的计算中。[SGLang Pipeline Parallelism](https://link.zhihu.com/?target=https%3A//www.lmsys.org/blog/2026-01-15-chunked-pipeline/)

使用场景

- 权重或 KV 按层切后才能装下。
- 跨节点网络不适合 TP AllReduce。
- 长 prefill，有足够 chunk/microbatch 填满 pipeline。
- MoE/混合架构中层间计算差异较小或可以手工平衡。单请求短 decode 容易受到 pipeline 串行路径和 bubble 影响。

7. EP：切专家
MoE 层可以写成：

![](https://www.zhihu.com/equation?tex=y_i%3D%5Csum_%7Be%5Cin%5Coperatorname%7BTopK%7D%28i%29%7Dg_%7Bi%2Ce%7DE_e%28x_i%29)。

专家被放在不同 rank 后，权重不动，让 token 去找专家。

对象切分

- Routed expert 权重：约 
![](https://www.zhihu.com/equation?tex=W_e%2Fp_%7B%5Cmathrm%7BEP%7D%7D)。
- Shared expert、Attention、Norm：不由 EP 切分，可能复制或使用 TP。
- KV：不受 EP 直接影响。
- 激活：按 router 结果从“请求顺序”变成“专家顺序”。
- 每张卡的临时激活大小取决于专家负载，可能高度不均衡。
通信

- Dispatch All-to-All：把 token hidden state 发到专家所在 rank。
- 本地 grouped GEMM。
- Combine All-to-All：把专家输出送回 token 原属 rank。
- 按 gating weight 求和。设整个 EP group 的 token hidden 总大小为 
![](https://www.zhihu.com/equation?tex=A_g)，每 token 路由到 
![](https://www.zhihu.com/equation?tex=r) 个专家，理想均衡下每 rank 发送量约为：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BEP%7D%7D%5Capprox+2rA_g%281-1%2Fp_%7B%5Cmathrm%7BEP%7D%7D%29%2Fp_%7B%5Cmathrm%7BEP%7D%7D)。

忽略了 router metadata、scale、padding、capacity 和重复专家落在同一 rank 的优化。

使用场景

- 大型 MoE，专家总权重远大于单卡容量。
- batch 足够大，专家 GEMM 能形成有效 grouped GEMM。
- 网络具有较高双向带宽和 bisection bandwidth。
- 配合 EPLB、冗余专家解决热点。EP 最怕的往往不是理论字节数，而是 token skew：一个热点专家就能让所有 rank 等最慢卡。SGLang 支持 DeepEP 等 A2A backend，并区分高吞吐 prefill 和低延迟 decode 模式。[SGLang EP 文档](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/blob/main/docs/advanced_features/expert_parallelism.md)

8. PCP：切 prefill 上下文
PCP 即 Prefill Context Parallelism，在 SGLang 中通常表现为 `attn_cp`。这个缩写不是所有框架都统一使用。

为什么切 sequence
Prefill 的 attention 计算约为 
![](https://www.zhihu.com/equation?tex=O%28S%5E2H%29)。将 query token 分给 
![](https://www.zhihu.com/equation?tex=p_%7B%5Cmathrm%7BPCP%7D%7D) 个 rank，理想情况下每 rank 计算约：

![](https://www.zhihu.com/equation?tex=F_%7B%5Cmathrm%7BPCP%7D%7D%5Capprox+O%28S%5E2H%2Fp_%7B%5Cmathrm%7BPCP%7D%7D%29)。

但本地 query 仍需要看到所有合法的历史 KV，因此必须移动 KV，或使用等价的 pass-Q 算法。

常见布局
简单连续切分会因 causal mask 失衡：前段 query 看到的 KV 少，后段 query 看到的 KV 多。

Zigzag 切法将序列分为 
![](https://www.zhihu.com/equation?tex=2p) 段，rank 
![](https://www.zhihu.com/equation?tex=r) 获得：

- 前段 block 
![](https://www.zhihu.com/equation?tex=r)。
- 后段 block 
![](https://www.zhihu.com/equation?tex=2p-1-r)。这样早期和晚期 query 配对，计算更均衡。另一个方案是 interleave，即 token 
![](https://www.zhihu.com/equation?tex=i) 归 rank 
![](https://www.zhihu.com/equation?tex=i%5Cbmod+p)。[SGLang PCP/Ring Attention 设计](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/issues/22223)

对象切分
在纯 PCP 中：

- Attention/FFN 权重通常沿 CP 维复制；也可叠加 TP/EP。
- hidden states：按 sequence 切为约 
![](https://www.zhihu.com/equation?tex=A%2Fp)。
- Q：本地约 
![](https://www.zhihu.com/equation?tex=1%2Fp)。
- 理想持久 KV：按 sequence 切为约 
![](https://www.zhihu.com/equation?tex=K%2Fp)。
- Attention 输出：仍按本地 query 切分。
通信量
Pass-KV Ring Attention 中，每 rank 有 
![](https://www.zhihu.com/equation?tex=K_%5Cell%2Fp) 的本地 KV block，经过 
![](https://www.zhihu.com/equation?tex=p-1) 次环传：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BPCP%7D%7D%5Capprox+%28p-1%29K_%5Cell%2Fp)。

AllGather-KV 的字节数同阶，但 Ring 可以逐块计算、逐块通信并重叠。

注意它并没有随着 
![](https://www.zhihu.com/equation?tex=p) 显著降低每 rank 总通信字节；收益来自：

- Attention 计算下降约 
![](https://www.zhihu.com/equation?tex=p) 倍。
- 每一步只传一个 KV block。
- 长序列的大量计算可以隐藏通信。
- 真正 KV-sharded 的实现可降低持久 KV 内存。
使用场景

- 单条或少量超长 prompt。
- Prefill TTFT 被二次复杂度 Attention 主导。
- 序列足够长，可以覆盖 ring 通信。
- PD 分离中希望 prefill 侧并行生成/传输 KV。短 prefill 通常不划算。

9. DCP：切 decode KV 上下文
DCP 是 PCP 在 decode 阶段的“相位对偶”，但通信方向恰好相反。

Decode 时：

- Query 很小，约 
![](https://www.zhihu.com/equation?tex=O%28BH%29)。
- 历史 KV 很大，约 
![](https://www.zhihu.com/equation?tex=O%28BTH_%7B%5Cmathrm%7BKV%7D%7D%29)。
- 所以绝不能每层搬完整 KV；应该让 KV 固定，移动小 Query，并合并 partial attention。
对象切分

- KV cache：按 token position 循环或分页分到 DCP ranks，约 
![](https://www.zhihu.com/equation?tex=K%2Fp_%7B%5Cmathrm%7BDCP%7D%7D)。
- FFN 权重：继续使用外围 TP/EP，不由 DCP 改变。
- Attention head 权重：可继续 TP-shard。
- Query：可能先在 DCP group 内 AllGather。
- 每 rank 对本地 KV 计算 partial output 和 partial LSE。当前 SGLang 把 DCP group 建在 TP group 内，要求 
![](https://www.zhihu.com/equation?tex=p_%7B%5Cmathrm%7BDCP%7D%7D%5Cmid+p_%7B%5Cmathrm%7BTP%7D%7D)。[DCP roadmap](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/issues/29736)

为什么必须合并 LSE
每个 rank 只看局部 KV，局部结果为 
![](https://www.zhihu.com/equation?tex=O_r)、局部 log-sum-exp 为 
![](https://www.zhihu.com/equation?tex=%5Cell_r)。全局归一化为：

![](https://www.zhihu.com/equation?tex=%5Cell%3D%5Clog%5Csum_r%5Cexp%28%5Cell_r%29)。

最终输出为：

![](https://www.zhihu.com/equation?tex=O%3D%5Csum_r+%5Cexp%28%5Cell_r-%5Cell%29O_r)。

所以不能直接平均 partial output，必须同时通信 LSE。

典型 AG+RS 通信
以常见 MLA 路径为例：

- AllGather-Q。
- 每 rank 对本地 KV 做 Attention。
- AllGather-LSE。
- 校正 partial output。
- ReduceScatter-output。若完整 query、output、LSE 大小分别为 
![](https://www.zhihu.com/equation?tex=Q_%5Cell)、
![](https://www.zhihu.com/equation?tex=O_%5Cell)、
![](https://www.zhihu.com/equation?tex=%5CLambda_%5Cell)，每 rank 发送量近似：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BDCP%2CAGRS%7D%7D%5Capprox+%28p-1%29Q_%5Cell%2Fp%2B%28p-1%29%5CLambda_%5Cell%2B%28p-1%29O_%5Cell%2Fp)。

关键是这个量与历史长度 
![](https://www.zhihu.com/equation?tex=T) 基本无关，而本地 KV 读取和 Attention 计算都下降为约 
![](https://www.zhihu.com/equation?tex=1%2Fp)。

SGLang 还支持 A2A：把 output 和 LSE 打包成一次 All-to-All。若复制 Q projection，让每 rank 本地生成完整 Q，还能删除 AllGather-Q：

![](https://www.zhihu.com/equation?tex=V_%7B%5Cmathrm%7BDCP%2CA2A%7D%7D%5Capprox+%28p-1%29%28O_%5Cell%2B%5CLambda_%5Cell%29%2Fp)。

代价是 Q projection 权重和计算有所复制。

使用场景

- 超长上下文 decode。
- 高并发导致 KV active set 很大。
- MLA/MQA/GQA 中 TP 无法继续切 KV。
- decode 已经明显受 HBM 带宽或 KV 容量限制。不适合：

- 短上下文、小 batch。
- Attention 计算很轻，collective latency 反而占主导。
- 当前 backend、量化、推测解码组合尚未覆盖。
10. PCP 和 DCP 最核心的区别
PCPDCP阶段PrefillDecodeQuery 数量O(S)每请求通常 1KV 数量O(S)O(T)，且持续增长主要移动对象KV blockQ、partial output、LSE每 rank Attention 计算约 O(S^2H/p)约 O(BTH/p)通信是否依赖历史长度是基本否主要目标降 TTFT、分摊长序列计算降 KV 内存、TPOT、提高并发一句话：

 Prefill 计算很大，允许环传 KV 来换计算并行；decode KV 很大而 Q 很小，因此固定 KV、移动 Q 和归并结果。长上下文推理论文也将 pass-KV、pass-Q 分别用于不同工作负载。[Context Parallelism for Scalable Million-Token Inference](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2411.01783)

11. 怎么选
可以按以下顺序决策：

- **模型权重单卡放不下**
 
- 单机高速互联优先 TP。
- 跨节点或 TP collective 太贵，增加 PP。
- MoE 专家权重太大，使用 EP。

- **模型能放下，但需要吞吐**
 
- 优先普通 DP。

- **MoE + MLA/MQA，TP 导致 KV 重复**
 
- DP-attention + EP。

- **单条超长 prompt，prefill TTFT 高**
 
- PCP 或 chunked PP。
- PCP 切 sequence，适合 Attention 主导。
- PP 切 layer，适合权重/层数大、跨节点网络一般。

- **长上下文 decode，KV 容量或 HBM 带宽成为瓶颈**
 
- DCP。

- **网络拓扑原则**
 
- TP、DCP、EP A2A 放在 NVLink/NVSwitch 域内。
- PP 由于通信频率低，更适合跨节点。
- PCP 跨节点需要足够长序列以隐藏 ring 通信。
- DP replica 可以分散在不同节点。

12. 组合时不要简单把并行度全相乘
普通 DP+TP+PP 的 GPU 数通常为：

![](https://www.zhihu.com/equation?tex=G%3Dp_%7B%5Cmathrm%7BDP%7D%7Dp_%7B%5Cmathrm%7BTP%7D%7Dp_%7B%5Cmathrm%7BPP%7D%7D)。

但 DP-attention、PCP 往往是在同一 TP rank 集合上重新解释拓扑。SGLang 中有效 Attention TP 大致为：

![](https://www.zhihu.com/equation?tex=p_%7B%5Cmathrm%7BattnTP%7D%7D%3Dp_%7B%5Cmathrm%7BTP%7D%7D%2F%28p_%7B%5Cmathrm%7BattnDP%7D%7Dp_%7B%5Cmathrm%7BPCP%7D%7D%29)。

典型组合是：

- Dense 模型：DP × PP × TP。
- MoE 模型：PP × Attention-DP/TP/CP × EP。
- PD 分离：Prefill 使用 PP/PCP，Decode 使用 DP-attention+EP 或 DCP。
- TP 负责权重，DCP 再负责 KV sequence，二者可组成 head-parallel × context-parallel。最后一个实现层面的提醒：PCP/DCP 仍在快速演进。当前 checkout 中，通用 zigzag PCP 路径仍可能 AllGather 后物化完整 KV，因此“PCP 一定把持久 KV 降到 
![](https://www.zhihu.com/equation?tex=1%2Fp)”不能一概而论；DCP 则已经明确提供 `ag_rs`、`a2a`、`fi_a2a` 和复制 Q projection 等路径。