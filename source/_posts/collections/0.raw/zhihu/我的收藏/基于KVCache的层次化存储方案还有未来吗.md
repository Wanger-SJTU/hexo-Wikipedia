---
title: 基于KVCache的层次化存储方案还有未来吗
date: "2026-03-16 00:00:00"
updated: "2026-03-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/基于KVCache的层次化存储方案还有未来吗/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2015743850526844804
---


### 个人刚调研 KVCache，基于自己当前理解结合 Codex 生成。如有不足，欢迎指正批评。

**KVCache 组会报告：KVCache 的层次化存储现状和未来**

证据分层：Analytical + Measured

范围：基于 @Han Shen

 的 推导[ KV cache 用池化的数据会比重算更快吗？有些什么优化方法?](https://www.zhihu.com/question/1954115162412942829/answer/1954961870525030613)以及本仓库对 Qwen3-14B 与 Qwen3.5-27B 的本地 Analytical 仿真、baseline 数据、以及单 GPU A100/H100/H200/B100/B200 官方 peak-spec sensitivity，回答四个问题：

- KVCache 现在是否仍然值得做
- Qwen3 与 Qwen3.5 这种 dense / hybrid 架构差异如何改变收益点
- 最新 GPU 硬件世代会把 break-even 推到哪里
- 对 基于 KVCache 的这类分层存储系统，下一步最有价值的研究问题是什么

#### 11. 一页结论

- 重算不如取回。即便是考虑极慢的跨网络端场景。kvcache 卸载收益上限受限于互联带宽，具体收益下限取决于系统栈优化水平\存储介质延迟。
- GPU 算力在不断进步，HBM 容量提升较慢。长上下文、agent、多轮对话、编程场景的token需求在不断增加,可能会长时间存在需求/系统之间的gap。
- 模型架构算法能够有效节省空间和算力，也能减少 kvcache 卸载/加载时的传输量。从仿真建模来看，DSA/CLA 使得 kvcache 传输量减少，反而对于带宽的需求降低。
- **层次化KVCache卸载能够减少Prefill的计算开销，但“大容量”不再是kvcache层次化存储系统的第一追求，“超高并发与极低延迟”才是。**
- 参数设置、模型假设均与 Gemini 讨论得到，个人暂时无法验证。关于卸载到闪存/RemoteBlock 层次的必要性，可能需要更准确实际的参数设置。以上均针对 prefill 阶段，decode 暂未考虑。

#### 2. 我们到底在比较什么

我们关心的不是“KVCache 永远快”，而是一个更具体的问题：在给定上下文长度 s 下，重新 prefill 一段历史上下文更快，还是从外部 tier 取回已经算好的 KV 状态更快。

最核心的判据只有一个：

 $t_{\mathrm{fetch}}(s) $

如果这个不等式成立，说明当前 storage tier 的取回速度足以抵挡重算，fetch cached KV 值得做；反之则说明当前介质太慢，还不如直接让 GPU 重算。

为了把这个问题落实系统参数上，我们把它拆成两个时间项：

 $$t_{\mathrm{prefill}}(s)=\frac{P_{\mathrm{FLOPs}}(s)}{\mathrm{MFU}_{\mathrm{prefill}}\cdot \mathrm{FLOPS}_{\mathrm{peak}}} $$

 $$t_{\mathrm{fetch}}(s)=\frac{P_{\mathrm{KV}}(s)}{\mathrm{BW}_{\mathrm{util}}\cdot \mathrm{Bandwidth}_{\mathrm{peak}}} $$

这里最重要的直觉是：prefill 的主导项包含 attention 带来的二次项，而 fetch KV 的主导项是线性增长。因此上下文越长，fetch 相对重算越有希望；但 GPU 越强、MFU 越高，重算也会越便宜。

#### 3. 公式推导：从模型结构到 dense 口径 break-even

参考 `notes/kvcacheProfit.md` 的口径，这里把推导直接对齐到脚本里的 `ModelSpec.flops_prefill` 与 `kv_bytes_per_token` 定义。关键是先从“每层、每 token”写出算力与状态，再汇总到序列长度 s。

#### 3.1 Prefill FLOPs：为什么是 2sN + 4s^2 n_q d L

对长度为 s 的 prefill，一阶主项分两块：

- 线性层/投影主项（\mathcal{O}(s)）
按 FMA 口径（乘+加记作 2 FLOPs），每个 token 经过一遍参数参与的 GEMM 近似为 2N FLOPs，因此：

 $P_{\mathrm{linear}}(s)\approx 2sN $

- Full-attention 主项（\mathcal{O}(s^2)）
每层 attention 的二次项来自两次核心矩阵乘：

- QK^T：每个 head 约 2s^2d
- \mathrm{softmax}(QK^T)V：每个 head 约 2s^2d
所以每层每个 head 合计约 4s^2d，再乘 query heads 数 n_q 和 full-attention 层数 L：

 $P_{\mathrm{attn}}(s)\approx 4s^2 n_q d L $

汇总得到 dense 口径 prefill FLOPs：

 $P_{\mathrm{FLOPs,dense}}(s)=P_{\mathrm{linear}}(s)+P_{\mathrm{attn}}(s)\approx 2sN+4s^2 n_q d L $

#### 3.2 KV 取回量：为什么是 token-linear

$每个 token、每层都要保存 K 和 V 两个张量；每个张量大小是 n_{kv}d\cdot \mathrm{bytes}_{\mathrm{elem}}。因此：$

 $\mathrm{KV\_bytes\_per\_token}=2\cdot n_{kv}\cdot d\cdot L\cdot \mathrm{bytes}_{\mathrm{elem}} $

长度为 s 的总取回量为：

 $P_{\mathrm{KV,dense}}(s)=2s n_{kv} d L\cdot \mathrm{bytes}_{\mathrm{elem}} $

$在 BF16/FP16（\mathrm{bytes}_{\mathrm{elem}}=2）下，可化成：$

 $P_{\mathrm{KV,dense}}(s)=4s n_{kv} d L $

#### 3.3 代入时间表达式得到 break-even

 $$t_{\mathrm{prefill}}(s)=\frac{P_{\mathrm{FLOPs,dense}}(s)}{\mathrm{MFU}_{\mathrm{prefill}}\cdot \mathrm{FLOPS}_{\mathrm{peak}}} $$

 $$t_{\mathrm{fetch}}(s)=\frac{P_{\mathrm{KV,dense}}(s)}{\mathrm{BW}_{\mathrm{util}}\cdot \mathrm{Bandwidth}_{\mathrm{peak}}} $$

$令 t_{\mathrm{fetch}}(s)，可得到两种等价视角。$

第一种视角是“给定上下文长度，storage 至少要多快才值得 fetch”：

 $$\mathrm{Bandwidth}^{\star}(s)=\frac{P_{\mathrm{KV,dense}}(s)}{\mathrm{BW}_{\mathrm{util}}\cdot t_{\mathrm{prefill}}(s)} $$

第二种视角是“给定某个 storage tier，它从多长上下文开始值得 fetch”：

 $$s^{\star}_{\mathrm{dense}}\approx \frac{\mathrm{MFU}_{\mathrm{prefill}}\cdot \mathrm{FLOPS}_{\mathrm{peak}}}{\mathrm{BW}_{\mathrm{util}}\cdot \mathrm{Bandwidth}_{\mathrm{peak}}} \cdot \frac{n_{kv}}{n_q} -\frac{N}{2 n_q d L} $$

这个公式对应了三个最关键的系统杠杆：

- GPU 越强或 MFU 越高，s^{\star} 越右移，意味着要更长上下文才值得 fetch。
- storage 带宽越高，s^{\star} 越左移，意味着更短上下文就可进入 fetch-wins 区域。
- GQA 越激进（n_{kv}/n_q 越小），KV 取回量越低，fetch 越容易占优。

#### 4. 公式推导：Qwen3.5 这类 hybrid 架构为什么会改写边界

Qwen3.5-27B 的关键变化不是“没有状态”，而是 token-linear 状态显著变小。对 hybrid 模型，我们把 full-attention 层与 linear-attention 层分开写：

 $P_{\mathrm{FLOPs,hybrid}}(s)=2sN_{\mathrm{active}}+4s^2 n_q d L_{\mathrm{attn}} $

 $P_{\mathrm{state,hybrid}}(s)=2s n_{kv} d L_{\mathrm{attn}}\cdot \mathrm{bytes}_{\mathrm{elem}}+S_{\mathrm{linear}}L_{\mathrm{linear}} $

这里的变化有两层：

- 只有 L_attn 层会生成随上下文线性增长的 KV 状态。
- 线性层的状态更像常数项 S_linear，而不是随 s 持续膨胀的 KV。
因此 hybrid 时代并不是“KVCache 不重要了”，而是“要缓存的 token-linear 状态少了，应该更细粒度地决定什么状态放哪一层、什么时候取回”。在忽略常数级 linear state 的一阶近似下，临界点可写成：

 $$s^{\star}_{\mathrm{hybrid}}\approx \frac{\mathrm{MFU}_{\mathrm{prefill}}\cdot \mathrm{FLOPS}_{\mathrm{peak}}}{\mathrm{BW}_{\mathrm{util}}\cdot \mathrm{Bandwidth}_{\mathrm{peak}}} \cdot \frac{n_{kv}}{n_q} -\frac{N_{\mathrm{active}}}{2 n_q d L_{\mathrm{attn}}} $$

需要强调一件事：本仓库当前脚本在图里实例化的是 token-linear 的 full-attention KV 主项（BF16/FP16 口径下等价于 4s n_{kv} d L_{\mathrm{attn}}）；linear state 目前只在理论分析里讨论，还没有被单独参数化进当前图表和 baseline summary。因此下面所有 phase diagram、tier line plot 和 storage pyramid 都应理解为 token-linear KV break-even 的 Analytical 结果，而不是已经完整覆盖 hybrid 所有状态的 Measured 结论。

#### 5. 测试对象与证据口径

本次组会汇报分两层内容：

- Analytical：用 Roofline / break-even 公式推导不同 tier 的收益点
- Measured：用本地 vLLM baseline 的 TTFT、TPOT 与 GPU memory proxy 做校准对照
模型与硬件口径：

- 主 baseline hardware：2x NVIDIA A100-SXM4-80GB
- 最新硬件 sensitivity：1x NVIDIA A100-SXM4-80GB / 1x NVIDIA H100-SXM5-80GB / 1x NVIDIA H200-SXM5-141GB / 1x NVIDIA B100-SXM-192GB / 1x NVIDIA B200-SXM-192GB（均为官方 peak-spec Analytical profile；B100/B200 specs 来自 NVIDIA 官方 Blackwell platform 对比表，已通过 HGX 系统总规格交叉验证）
- Qwen3-14B：dense attention，max_position_embeddings=40960
- Qwen3.5-27B：hybrid attention，16 full_attention + 48 linear_attention，max_position_embeddings=262144
分层存储 tier 口径：

- Local HBM = 4078 GB/s
- CPU DRAM = 120 GB/s
- RDMA Pool = 50 GB/s
- Local SSD = 10 GB/s
- Remote Block = 0.35 GB/s

#### 6. 结果一：KV 增长与容量收益点

先看 token-linear KV 的增长速度，这决定“为什么一定需要 KV tiering”。

- Qwen3-14B：1.526 GiB / 10k tokens
- Qwen3.5-27B：0.610 GiB / 10k tokens
在 16 GiB KV budget 下，对应的容量阈值分别是：

- Qwen3-14B：约 104,858 tokens
- Qwen3.5-27B：约 262,144 tokens
解读：Hybrid attention 的确显著降低了 token-linear KV 压力，但这并不等价于“不再需要 KVCache”。它更像是把“必须做缓存”的压力从极短上下文推迟到了更长上下文，并把系统设计重点从“能不能放下”逐渐转向“什么 tier 值得放、何时放、如何取”。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_c4215bc64ab2.jpg)

#### 7. 结果二：MFU=0.4 时，tier break-even 如何分层

在 MFU=0.4、BW_util=0.7 时，tier break-even 的主结论是：

- HBM / CPU DRAM / RDMA Pool / Local SSD 全部在 ![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_ac3a305b53c4.jpg)

再看 phase diagram。它最直观地告诉我们：在 10+ GB/s 的近端 tier 上，整个展示窗口几乎都在 fetch-wins 区域；真正贴着边界游走的是 sub-GB/s 的 Remote Block 这一层。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_b85c245c4e5a.jpg)

最后看 storage pyramid。它比折线图更适合组会讲“系统层次 + 调度逻辑”：同一层介质上，两种模型的箭头起点不同，意味着真正需要的是 cost-based scheduler，而不是静态的全局 offload 策略。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_071601232ce4.jpg)

这里最重要的解释不是“哪条线更高”，而是架构差异如何改变远端慢介质的适用窗口：

- ~~Qwen3.5-27B 的 native max context 是 262K，因此在 Remote Block 这种慢 tier 上仍然有可见收益窗口~~。
- ~~Qwen3-14B 的 native max context 只有 40K，所以 165.6K 的交点已经落在当前模型支持窗口之外；如果不做 YaRN 或其他长上下文扩展，Remote Block 对它的现实价值非常有限。~~
- **理论带宽拉满都没什么收益，就不需要想着做卸载了。**

#### 8. 结果三：MFU=0.9 时，为什么边界整体右移

当 GPU compute 更强，也就是 MFU=0.9 时，远端慢介质的交点进一步右移：

- Remote Block 的交点：  

- Qwen3-14B：414.3K
- Qwen3.5-27B：239K

这说明 notes/kvcacheProfit.md 里的核心判断是成立的：GPU 越强、prefill 越快，远端慢 tier 越难打赢重算。也就是说，MoE / hybrid 时代不是 KVCache 没价值，而是对慢 tier 的要求更高，对 scheduler 的要求更严。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_0df3211a057a.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_e39b6eb3886d.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_2803ada8f662.jpg)

和 MFU=0.4 相比，这组三张图共同说明了一件事：不是 tier 层次变了，而是同样一套 tier，在更高的 GPU compute regime 下会变得“更像远端慢存储”。因此系统设计不能只写死一个 break-even，需要把实时 MFU、队列拥塞和上下文长度都放进调度器。

#### 9. 结果四：GPU 代际 hardware sensitivity（含 Blackwell B100/B200）

为了回答”最新 GPU 时代会不会让 KV fetch 更不值得做”，我们补了一组完全独立于本地 measured baseline 的 Analytical peak-spec sensitivity，本次扩展至五代完整对比：

GPUDense BF16 TFLOPSHBM BW (GB/s)HBM 容量A100-SXM4-80GB312203980 GiBH100-SXM5-80GB989335080 GiBH200-SXM5-141GB9894800141 GiBB100-SXM-192GB1750†8000192 GiBB200-SXM-192GB22508000192 GiB†B100 standalone datasheet 标注 1800 TFLOPS；此处取 HGX B100 口径（14 PFLOPS / 8 GPU = 1750 TFLOPS）作为保守值。B200 2250 TFLOPS 已通过 HGX B200 系统总规格（18 PFLOPS / 8 = 2250 TFLOPS/GPU）交叉确认。以上均为 Analytical/peak-spec 数值，非实测。

需要明确两点：

- 这一节不是实测，而是把同一套 token-linear KV 模型代入 NVIDIA 官方单 GPU peak BF16 与 HBM 规格。
- 这里的 A100 是单 GPU A100 80GB，不是前文 measured baseline 使用的 2x A100；因此这组数字不应直接和 `31.7K / 165.6K` 那组双卡结果一一对照。

#### Remote Block (0.35 GB/s) break-even 上下文长度（MFU=0.4, BW_util=0.7）

GPUQwen3-14BQwen3.5-27BA100 80GB66.1KH100 80GB282K128.7KH200 141GB282K128.7KB100 192GB524.7K330.9KB200 192GB684.1K463.8K
#### Full-HBM-as-KV 理论容量上界

GPUQwen3-14BQwen3.5-27BA100 80GB512K1280KH100 80GB512K1280KH200 141GB902.4K2256KB100 192GB1228.8K3072KB200 192GB1228.8K3072K
#### 关键结论

- **Remote Block 交点随代际算力线性抬升**：从 Hopper 到 Blackwell，Dense BF16 FLOPS 从 989 增长到 1750⁄2250 TFLOPS，`t_prefill` 缩短，Remote Block 的 break-even 跟着右移——B200 对 Qwen3-14B 的交点推至 684K，对 Qwen3.5-27B 推至 464K。这意味着在 Blackwell 世代，需要更长的上下文才能证明 Remote Block 的取回值得做。
- **H100 和 H200 的外部 tier 交点几乎重合**：因为两者 dense BF16 FLOPS 相同（同为 989 TFLOPS），`t_prefill` 一样长，所以 Remote Block 的 break-even 近似。H200 相对 H100 的主要优势是本地 HBM 容量（141 GB vs 80 GB），体现为更大的 KV 理论上界（902.4K vs 512K）。
- **B100 与 B200 都显著提高了外部 tier 门槛**：B100（1750 TFLOPS）和 B200（2250 TFLOPS）将 Remote Block 交点推至 500K–700K 以上。对大多数实际部署（上下文 ![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_a0cb75b67a5e.jpg)

#### MFU=0.9, BW_util=0.6 的统一 tier line plot：A100/H100/B100/B200

为了补一张更贴近“高计算利用率 + 保守带宽利用率”的单图，我们将同一张多硬件 tier line plot 重新生成为：

- 假设：`MFU_prefill=0.9`、`BW_util=0.6`、`max_context=1024K`
- 证据属性：Analytical sensitivity，不代表线上真实可达利用率
- 图中仍含两条模型曲线簇（Qwen3-14B 与 Qwen3.5-27B），每簇叠加 A100/H100/B100/B200 四代 GPU
- 当前文件路径仍沿用历史目录名 `kvcache_profit_qwen3_vs_qwen35_hardware_tier_upper_mfu10/`，但图内和摘要参数已经更新为 `0.9/0.6`
Remote Block（0.35 GB/s）在这组参数下的交点继续右移：

HardwareQwen3-14BQwen3.5-27BA100 80GB227.8K83.5KH100 80GB794.5K555.8KB100 192GB>1024K>1024KB200 192GB>1024K>1024K这张图最值得讲的不是“哪条线最高”，而是两件事：

- 在 `MFU=0.9, BW_util=0.6` 下，A100 仍保留可见的 Remote Block 窗口，但 H100 已经把窗口推到 `555K-795K`；到了 B100/B200，`0.35 GB/s` 的 Remote Block 在 `1024K` 展示窗内已经完全失去竞争力。
- `10 GB/s` 的 Local SSD 依然足够快，但对 Qwen3-14B 的 crossing 也被推高到了 `B100=17.9K`、`B200=32.5K`。这意味着随着 GPU 代际继续上升，原本“闭眼可取”的近端 tier 也开始需要更精细地看上下文长度与模型结构。
因此，这张新图给 KVcache 的直接启发是：~~未来调度器不能只区分“本地快层 vs 远端慢层”，而要进一步区分“在当前 MFU/BW regime 下，这个 tier 对这个模型、这个上下文长度是否仍值得 fetch”~~。 

**数据中心不太需要卸载到单块闪存，如果闪存阵列随着 PCIe 带宽不断翻倍，可能还有空间。**手机电脑端侧由于算力更低、可能也还有些机会。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_663df56b83fa.jpg)

如果把详细 tier 表展开，会看到和前文一致的结构：这张四硬件对比图里，HBM / CPU DRAM / RDMA / Local SSD 大体仍落在 `@无名

 提到：

- 忽略了稀疏注意力对于注意力层的优化：重算应该会变快，同时访存成本也会变快。预期读取稀疏缓存的速度也远远高于“用顶级 GPU 重算”**。
- Qwen3.5不能代表最前沿的模型：

- DeepSeek的潜向量注意力压缩 (MLA - Multi-Head Latent Attention)相比GQA，它不再分别存储庞大的 Key 和 Value 矩阵，而是将它们**压缩成一个极低维度的隐向量（Latent Vector，例如 512 维）**。MLA 将 KV Cache 的体积在 GQA 的基础上**又压缩了 4~8 倍**！这意味着几百万上下文的 KV Cache，可能只有区区几个 GB。当 KV Cache 变得如此之小，**“大容量”不再是存储系统的第一追求，“超高并发与极低延迟”才是**。
- 还有Chain-of-Thought CoT特性可能会产生大量临时的一次性的思考过程，增加大量kvcache空间。
- 还有跨层 KV 共享 (Cross-Layer KV Sharing / CLA), **机制原理**：在之前的推导中，我们假设注意力层数 **Lattn=16*Lattn*​=16 层。而 CLA 架构认为，深层的注意力学到的特征和浅层差不多，大家共享同一份 KV Cache 就行了.对存储的暴击**：物理 KV Cache 的层数直接被砍到了 **1 层.**这意味着t_{fetch} 的时间再次暴跌数十倍。

- 在引入新机制后，我们对 t_{fetch}（取回成本）进行降维打击式的修正：

- **稀疏注意力 (Sparse, 比例为 \rho)**：取回的 Token 数从 s 暴降为 \rho \cdot s（例如 \rho=10\%）。
$- **潜在注意力压缩 (MLA 压缩比 C_{mla})**：原本 d \cdot n_{kv} 的维度，被压缩为一个 Latent Vector，体积缩小 C_{mla} 倍（例如 C_{mla} \approx 4 \sim 8）。$
- **跨层 KV 共享 (CLA, 共享因子 L_{share})**：原本需要取回 L_{attn} 层，现在多层共享，实际上只需取回 L_{share} 层（极端情况下 L_{share} = 1）。

**全新 t_{fetch} 理论公式：** 

 $$t_{fetch\_ultimate} = \frac{4 \cdot (\mathbf{\rho} \cdot s) \cdot \frac{H_{kv\_old}}{\mathbf{C_{mla}}} \cdot \mathbf{L_{share}}}{BW_{util} \cdot Bandwidth_{peak}} $$

一旦引入 Sparse + MLA + CLA，存储端的 I/O 负担将被进一步降低！取回极度压缩的 KV 状态甚至可能连千兆网卡（0.1GB/s）都能满足理论要求。**但是kv容量不断被压缩，同样降低了卸载到更大容量的低级别tier存储的需求。**

#### 13. 一句话总结：

- **层次化KVCache卸载能够减少Prefill的计算开销，但“大容量”不再是kvcache层次化存储系统的第一追求，“超高并发与极低延迟”才是。**