---
title: "AI Infra 面试问题QA 总结——大模型推理"
date: "2026-04-25 00:00:00"
updated: "2026-04-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AI-infra/AI-Infra-面试问题QA-总结——大模型推理/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2031444649823449112"
---


都是本人面试时被问到的问题，简单整理分类，并简单解答。如有错误，欢迎指出，感谢！🙏

一、Transformer 基础

Q1. 介绍一下 Transformer
Transformer 主要分为两个部分：

- <strong>Encoder</strong>：处理输入序列，输出上下文表示。内部是多层 Encoder Layer，每层包括 Multi-Head Self-Attention + Feed Forward + Layer Norm + Residual Connections。
- <strong>Decoder</strong>：处理目标序列，输出预测。内部是多层 Decoder Layer，每层包括 Masked Multi-Head Self-Attention（自注意力，防止看到未来）+ Multi-Head Encoder-Decoder Attention（交叉注意力）+ Feed Forward + Layer Norm + Residual Connections。额外组件：

- <strong>Embedding</strong>：词嵌入 + 位置编码（Positional Encoding）
- <strong>Output Layer</strong>：线性层
Q2. Embedding 是什么，它在什么位置？
文本先由 tokenizer 将文本拆分成 token，然后根据词表（vocab）将 token 映射为整数 `input_ids`。模型维护一个<strong>可学习的 embedding 矩阵</strong>，通过查表得到 token 向量。位置在模型最前端，紧跟 tokenizer 之后、Transformer block 之前。

Q3. 为什么要位置编码？好处是什么？
因为 Transformer 不采用 RNN 的结构，而是使用全局信息，<strong>不能利用单词的顺序信息</strong>，使用位置编码保存单词在序列中的相对或绝对位置。

Q4. Tokenizer 怎么做的？
利用特定算法（如 <strong>BPE</strong> 或 <strong>WordPiece</strong>）将连续的文本切分成一个个更小的单元，即 Token。这些 Token 可以是完整的单词、词根、词缀甚至单个字符。然后在一个预先构建好的”词汇表”中查找每个 Token，并将其映射为一个<strong>唯一的数字编号（Token ID）</strong>。最终，一段文本就被转换成一串由 Token ID 组成的序列，成为模型真正的输入。

Q5. 手撕 Multi-Head Attention

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiHeadAttention(nn.Module):
    def __init__(self, hidden_size, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = hidden_size // num_heads
        self.q_linear = nn.Linear(hidden_size, hidden_size)
        self.k_linear = nn.Linear(hidden_size, hidden_size)
        self.v_linear = nn.Linear(hidden_size, hidden_size)
        self.o_linear = nn.Linear(hidden_size, hidden_size)

    def forward(self, hidden_state, causal_mask=None,
                past_key_value=None, use_cache=False):
        batch_size = hidden_state.size(0)
        query = self.q_linear(hidden_state)
        key   = self.k_linear(hidden_state)
        value = self.v_linear(hidden_state)
```


        # 多头拆分

```text
        query = query.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
        key   = key.view(batch_size,   -1, self.num_heads, self.head_dim).transpose(1, 2)
        value = value.view(batch_size, -1, self.num_heads, self.head_dim).transpose(1, 2)
```


        # 拼接 KV cache
        if past_key_value is not None:

```text
            past_key, past_value = past_key_value
            key   = torch.cat([past_key,   key],   dim=2)
            value = torch.cat([past_value, value], dim=2)

        new_past_key_value = (key, value) if use_cache else None
```


        # 注意力打分

```text
        attention_scores = torch.matmul(query, key.transpose(-1, -2)) \
                           / torch.sqrt(torch.tensor(self.head_dim, dtype=torch.float32))
```


        if causal_mask is not None:

```text
            attention_scores += causal_mask * -1e9

        attention_probs = F.softmax(attention_scores, dim=-1)
        output = torch.matmul(attention_probs, value)
```


        # 合并多头

```text
        output = output.transpose(1, 2).contiguous() \
                       .view(batch_size, -1, self.num_heads * self.head_dim)
        output = self.o_linear(output)

        return (output, new_past_key_value) if use_cache else output
```


Q6. Multi-Head Attention 和 Single-Head Attention 的区别？Multi-Head 有什么好处？
Multi-Head 把 hidden_size 拆成多个并行的子空间，每个 head 学习不同的关注模式（如语法、语义、位置等），再拼接回去。好处：

- <strong>多角度建模</strong>：每个头关注不同的子空间特征
- <strong>表达能力更强</strong>：相比单头能捕获更丰富的依赖
- <strong>并行性好</strong>：多头之间天然并行
Q7. Transformer 里的 Attention 和 Feed Forward 各自的作用？

- <strong>Attention</strong>：在 token 之间做信息交互，捕获序列依赖关系（”谁关注谁”）。
- <strong>Feed Forward (FFN)</strong>：对每个 token 独立做非线性变换，提升模型表达能力，承担”知识存储”的作用。
Q8. 大模型怎么处理梯度消失和梯度爆炸？

- <strong>残差连接（Residual Connection）</strong>：保证梯度可以直通传到浅层
- <strong>LayerNorm / RMSNorm</strong>：稳定每层的激活值分布
- <strong>更稳定的初始化</strong>：如 Xavier、Kaiming
- <strong>梯度裁剪（Gradient Clipping）</strong>：防止梯度爆炸
- <strong>学习率 warmup + decay</strong>：避免训练初期发散
- <strong>混合精度训练 + Loss scaling</strong>：解决 FP16 下梯度下溢出问题
二、大模型推理流程

Q9. 大模型输入文本后怎么得到输出？/ Transformer 推理流程

- 文本输入，tokenizer 将文本切分成更小的单元，根据预先准备的词表映射成唯一的 token id
- 通过 Embedding 和位置编码，将 token id 转化为带有位置信息的向量序列
- 进入 <strong>Prefill 阶段</strong>，模型并行计算输入序列的上下文信息并构建 KV Cache
- <strong>Decode 阶段</strong>，模型基于已生成的上文和缓存信息，预测下一个 token 的概率分布，选出概率最高的词后将其追加回输入序列，并更新缓存
- 如此反复迭代，直到生成结束符或达到长度限制
Q10. 第一个 token 是怎么来的？
第一个生成的 token 来自 <strong>Prefill 阶段</strong>：用户输入经过 tokenizer + embedding 后整段并行送入模型，最后一层输出对应”输入末尾位置”的 hidden state，经过 LM Head（线性层）→ logits → 采样策略（greedy / top-k / top-p）→ 得到第一个生成的 token。

Q11. 介绍一下 PD 分离（Prefill-Decode 分离）
Prefill 和 Decode 两个阶段的特性差异极大：

- <strong>Prefill</strong>：长序列并行计算，<strong>Compute-Bound</strong>，能打满 GPU 算力
- <strong>Decode</strong>：每次只算一个 token，<strong>Memory-Bound</strong>，瓶颈是 KV cache 和参数读写带宽混合在一起会互相干扰：长 prefill 卡住短 decode，导致延迟抖动。<strong>PD 分离</strong>把两个阶段调度到不同的实例（甚至不同硬件），各自批处理，从而提升整体吞吐和 SLA。

三、Attention 与 KV Cache

Q12. KV Cache 原理？
利用”<strong>空间换时间</strong>“的策略，解决自回归生成过程中的重复计算问题。

在 Transformer 生成文本时，每次生成新 token 都需要关注之前的所有 token；如果没有缓存，模型必须不断重复计算历史序列的 Key 和 Value 向量，导致计算复杂度呈平方级增长。<strong>KV Cache 通过在显存中保存已计算过的历史 Key 和 Value 状态</strong>，使得模型在生成下一个 token 时，只需计算当前 token 的 Query 和新的 Key/Value，并直接复用缓存中的历史数据。

这一机制将推理的计算复杂度从 O(n²) 降低到 <strong>O(n)</strong>，是大模型实现低延迟流式输出的关键。

Q13. KV Cache 还有哪些其他优化手段？

- <strong>PagedAttention</strong>（vLLM）：把 KV cache 分块管理，避免显存碎片
- <strong>Continuous Batching</strong>：动态拼 batch
- <strong>MQA / GQA</strong>：多个 Query head 共享 K/V，减少 cache 体积
- <strong>量化 KV cache</strong>：把 KV 从 FP16 量化到 INT8/INT4
- <strong>KV cache 压缩 / 驱逐</strong>：H2O、StreamingLLM 等丢掉不重要的 token
- <strong>Prefix Caching</strong>：相同前缀的请求复用 KV
四、Flash Attention

Q14. Flash Attention 原理（目标 + 方法）

- <strong>目标</strong>：解决 Memory-Bound 问题，避免 attention 矩阵从 HBM 的反复读写
- <strong>方法</strong>：  
- 通过<strong>分块计算（tiling）</strong>，融合多个操作，减少中间结果缓存
- 反向传播时，<strong>重新计算（recomputation）</strong>中间结果而非保存

Q15. Flash Attention 不同版本之间有什么区别？

- <strong>FA1</strong>：分块 + online softmax
- <strong>FA2</strong>：改变了循环的嵌套顺序，<strong>先处理 Q（外层），KV（内层）</strong>，结束后统一归一化；减少非矩阵乘法计算，更好利用 Tensor Core；如果一个 Block 处于矩阵上三角部分（causal mask），不进行 attention 计算
- <strong>FA3</strong>：针对 Hopper 架构，利用 <strong>TMA</strong> 和 <strong>WGMMA</strong>，让 Softmax 和 GEMM 重叠执行，用 Tensor Core 的计算时间掩盖 SFU（exp）的低吞吐
- <strong>FA4</strong>：针对 Blackwell 架构，高速 online softmax（如果最大值在一定范围就不更新）；高效的 exp，使用多项式拟合仿真指数操作，接近矩阵运算
Q16. 应用 Flash Attention 时，如果 mask 是随机/不规则的怎么处理？
Flash Attention 的高效来自于”<strong>整块跳过</strong>“——causal mask 下右上三角的 block 完全不算。如果 mask 是随机的：

- <strong>Block-sparse 化</strong>：按 block 粒度判断是否全 0，全 0 的 block 直接跳过；非全 0 的 block 内部按元素应用 mask
- <strong>传 mask 索引</strong>：把”哪些 (Q-block, KV-block) 对需要计算”的列表传进 kernel（FlexAttention / FlashAttention 的 block-sparse 接口就是这种思路）
- 在 kernel 里把 mask 加到 scores 上（`scores += mask * -inf`），让 softmax 自动屏蔽
- 极不规则时，partial-block 的开销可能让收益打折，需要权衡
Q17. Flash Attention 比较复杂，哪部分比较困难？
主要难点：

- <strong>online softmax 的数值稳定性</strong>（max 的累积更新）
- <strong>分块大小的选择</strong>：要兼顾 SRAM 容量、寄存器压力、warp 调度
- <strong>反向传播的重计算逻辑</strong>与前向对齐
- <strong>多 batch / 多 head / 不同 head_dim 的边界处理</strong>
Q18. 了解过其他 Attention 类的加速手段（论文）吗？

- <strong>Multi-Query Attention (MQA)</strong> / <strong>Grouped-Query Attention (GQA)</strong>：减少 KV head 数量
- <strong>Sliding Window Attention</strong>（Mistral）
- <strong>Linear Attention</strong> / <strong>Performer</strong> / <strong>Linformer</strong>：把复杂度降到 O(n)
- <strong>PagedAttention</strong>（vLLM）
- <strong>RingAttention</strong>：跨 GPU 切分长序列
- <strong>FlexAttention</strong>：用编译器自动生成融合 kernel
五、量化

Q19. 量化的原理？
量化是指将连续取值离散化成有限取值的过程。模型量化即将权重、激活值等<strong>从高精度转化成低精度</strong>的操作过程（如 FP32 → INT8）。

Q20. 量化的好处（目的）？

- <strong>更小的模型尺寸</strong>：以 8bit 量化为例，与 32bit 浮点数相比，模型体积降低为原来的 1⁄4
- <strong>更低的功耗</strong>：移动 8bit 数据比移动 32bit 浮点型数据效率高 4 倍
- <strong>更快的计算速度</strong>：大多数处理器都支持 8bit 数据的更快处理；二值量化更有优势
Q21. 量化的分类？

- 按<strong>量化阶段</strong>：量化感知训练（QAT）、训练后量化（PTQ）
- 按<strong>量化对象</strong>：仅权重量化（weight-only）、权重和激活都量化（weight + activation）
- 按<strong>量化类型</strong>：对称量化、非对称量化
- 按<strong>实现方法</strong>：  
- <strong>PTQ</strong>：直接转换训练好的模型
- <strong>QAT</strong>：训练时模拟量化过程
- <strong>混合精度量化</strong>：关键层保持高精度

Q22. 模型在运行时哪部分是动态量化、哪部分是静态量化？

- <strong>静态量化（权重）</strong>：权重在部署前就已确定，离线量化好，运行时直接使用
- <strong>动态量化（激活值）</strong>：激活随输入变化，运行时根据当前 batch 实时统计 min/max 来量化（也有提前用校准集统计好的”静态激活量化”）
Q23. 为什么有的只量化 weight，有的 activation 和 weight 都量化？
<strong>只量化权重</strong>：

- 权重被量化为 INT8，减少存储和带宽占用
- 激活保持 FP32/FP16，避免量化带来的精度损失
- 计算时：INT8 权重会被反量化回 FP32/FP16，再与浮点输入运算<strong>权重 + 激活都量化</strong>：

- 权重和激活都量化为 INT8，<strong>计算完全在 INT8 进行</strong>
- 计算时：输入先量化到 INT8，再与 INT8 权重进行<strong>纯整数计算</strong><strong>结论</strong>：只量化权重只减少模型大小，推理速度不会有明显提升；权重 + 激活量化能极大提升推理速度，但模型精度会有所下降。

Q24. 量化踩过的坑？
<strong>精度陷阱</strong>：做分组量化时直接用 max/min 校准，但某些分组中会有个别离群值，导致整个分组的范围被拉得很宽，最终效果较差。

解决思路：截尾（如 percentile 校准）、SmoothQuant、AWQ、对离群通道单独处理。

Q25. 模型蒸馏、模型剪枝、量化的区别？
维度量化剪枝蒸馏操作对象数值精度结构（权重/通道/层）训练目标是否改变模型结构否是否（小模型独立）是否需要训练不一定（PTQ 不需要）一般需要 fine-tune必须训练 student主要收益显存 + 算力参数量 + FLOPs用小模型逼近大模型最重要的区别是：<strong>蒸馏改的是训练范式（让小模型学大模型），剪枝改的是网络拓扑（去掉不重要的连接），量化只改数值表示</strong>。

Q26. 如何对训练后的模型做量化？（Flow Matching 改了网络结构，原训练精度 BF16）
<strong>优先选择 PTQ</strong>（Post-Training Quantization）：

- 采集一批<strong>校准数据</strong>
- 用模型跑前向，统计每一层的 <strong>activation 分布</strong>
- 对 weight 和 activation 做量化映射：BF16 → INT8<strong>如果 PTQ 掉点严重，用 QAT</strong>（Quantization-Aware Training）：

- Flow Matching 天生对数值敏感，PTQ 容易崩
- 在网络里插入<strong>伪量化节点</strong>
- 用<strong>极小学习率</strong>微调 1~3 个 epoch
- 保持原有 Flow Matching 损失函数不变可能遇到的问题：激活值离群点、不同分支量化范围不一致、扩散步数累积误差。

Q27. 如果 INT8 掉点严重怎么办？

- 切换到 <strong>QAT</strong>
- 使用<strong>混合精度</strong>：敏感层（如最后输出层、首层）保留 BF16
- 使用更细粒度的 <strong>per-channel / per-group 量化</strong>
- 离群点处理：<strong>SmoothQuant</strong>（把激活的离群值迁移到权重）、<strong>AWQ</strong>
- 检查校准集是否覆盖真实分布
Q28. 为什么用 INT4？

- <strong>更高压缩比</strong>：相比 INT8 再缩 1/2，4B 模型可在端侧 4GB 显存运行
- <strong>带宽更友好</strong>：Decode 阶段是 Memory-Bound，权重读取量减半直接提速
- <strong>精度可控</strong>：通过分组量化（K-Quant、AWQ、GPTQ）能把精度损失压到很小劣势：纯整数 INT4 GEMM 硬件支持有限（目前主流是 W4A16，权重 INT4 但激活 FP16），所以加速主要来自带宽减少而非算力翻倍。

Q29. INT4 量化怎么降低时延和显存？

- <strong>显存</strong>：模型权重直接缩到 1/4（FP16 vs INT4）
- <strong>时延</strong>：Decode Memory-Bound 场景下，从 HBM 读权重的字节数减少 → 端到端延迟下降；解包的 ALU 开销远小于带宽节省的收益
Q30. 了解过 FP8 量化吗？
FP8 有 E4M3 和 E5M2 两种格式：

- <strong>E4M3</strong>：4 位指数 + 3 位尾数，动态范围小但精度高，常用于 forward / weight
- <strong>E5M2</strong>：5 位指数 + 2 位尾数，动态范围大，常用于 backward / gradientH100 / Blackwell 原生支持 FP8 Tensor Core。相比 INT8，FP8 的浮点性质让它对激活的离群值更友好，几乎不需要复杂的校准。

Q31. 量化后的权重怎么参与计算？
以 llama.cpp Q4_K_M 为例：

从块中<strong>解包 4-bit 权重</strong>，用 <strong>scale + min</strong> 反量化回 FP16，得到 FP16 权重矩阵，和 FP16 激活做矩阵乘法（<strong>当场解包，当场丢弃</strong>）。

w_fp16 = q4 * (scale * d) - (minv * dmin)
其中：

- `d`：全局 scale（FP16，整个 256 维超块共用）
- `dmin`：全局 min（FP16，整个 256 维超块共用）
- `scale`：子块局部 scale（6-bit，32 维子块用）
- `minv`：子块局部 min（6-bit，32 维子块用）
Q32. 如何评估量化损失是可以接受的？精度损失大时如何定位？
<strong>评估指标</strong>：

- 语言模型：PPL（Perplexity）、下游任务准确率（MMLU、CEVAL 等）
- 视觉模型：FID、PSNR、mAP<strong>定位方法</strong>：

- <strong>逐层替换法</strong>：每次只量化一层，跑评测，找出敏感层
- <strong>激活分布对比</strong>：FP 和量化版本对比每层输出的余弦相似度 / KL 散度
- <strong>离群值检测</strong>：看哪些通道激活值跨度过大
六、GPU / CUDA 优化

Q33. MatMul 怎么优化的？计算瓶颈在哪里？
瓶颈：访存（从 GMEM 读取矩阵）和算力。

常见优化手段：

- <strong>分块 (Tiling)</strong>：按 M、N、K 分块加载到 SMEM
- <strong>寄存器分块 (Warp Tiling)</strong>：每个线程持有更大的输出 tile
- <strong>double buffering</strong>：计算和访存 overlap
- <strong>Tensor Core 利用</strong>：用 wmma / mma 指令
- <strong>避免 bank conflict</strong>：合理 padding SMEM 布局
- <strong>vectorized load</strong>：`float4` 一次加载 16 字节
Q34. 矩阵乘有根据 N、M、K 分块吗？
是。三个维度都要分：

- <strong>M、N 方向</strong>：决定每个 block 算输出的哪一块
- <strong>K 方向</strong>：累加方向，决定每次从 GMEM 读多少进 SMEM典型的 BLOCK 大小：BM=128, BN=128, BK=8/16/32（依架构而定）。

Q35. Bank Conflict 是什么？
同一个 warp 里的不同线程从同一个 bank 里取数据就会造成 bank conflict，<strong>内存读取效率偏低</strong>（被串行化）。

GPU SMEM 通常分为 32 个 bank，每个 bank 4 字节。解决方法：调整数据布局加 padding（如 `[N+1]` 而非 `[N]`），或者 swizzle。

Q36. GPU 的两种瓶颈是什么？

- <strong>Compute-Bound</strong>：算力打满（如大矩阵乘 prefill）
- <strong>Memory-Bound</strong>：访存打满（如 decode 阶段读权重、KV cache）
Q37. GPU 运行的时候是如何将数据从 CPU 搬到 GPU 的？
通过 <strong>PCIe 总线</strong>进行的跨域传输。流程：

- Host 上分配 pinned memory（避免 swap）
- `cudaMemcpyAsync` 把数据 DMA 拷贝到 GPU 显存
- 配合 CUDA Stream 实现拷贝与计算 overlap
- 现代架构有 <strong>NVLink</strong> / <strong>GPUDirect</strong> 可以绕过 CPU
Q38. 如何理解 CPU 和 GPU 的内存层次？
<strong>CPU</strong>：设计目标是<strong>最小化单线程延迟</strong>——通过 L1/L2 应对局部性，L3 解决多核数据共享与内存墙问题。深层 cache 是核心。

<strong>GPU</strong>：专注<strong>吞吐量优化</strong>——凭借海量线程隐藏延迟，显存带宽优势和大规模寄存器资源使其无需深度缓存层级。层级是 Register → SMEM/L1 → L2 → HBM。

二者差异本质是在<strong>延迟敏感与吞吐优先</strong>之间的架构权衡。

Q39. 如何优化 RMSNorm 算子？解决什么瓶颈？
RMSNorm 是 <strong>Memory-Bound</strong>（计算量小，但要读整个 hidden state）。优化手段：

- <strong>算子融合</strong>：和前后的 residual / linear 融合，减少 HBM 往返
- <strong>vectorized load</strong>：`float4` 加载
- <strong>warp-level reduction</strong>：用 `__shfl_xor_sync` 做归约，避免 SMEM 同步
- <strong>block-level 时</strong>：先 warp reduce，再 SMEM 跨 warp 聚合
- 单步算 `sum(x²)`，避免 mean/var 两遍扫数据
Q40. 你会用 ncu 优化性能，会关注哪些指标？

- <strong>SM Occupancy</strong>：占用率
- <strong>Memory Throughput / DRAM Throughput</strong>：访存带宽利用率
- <strong>Compute (SM) Throughput</strong>：算力利用率
- <strong>L1/L2 Cache Hit Rate</strong>
- <strong>Warp Stall Reasons</strong>：哪种原因导致 stall（long scoreboard / barrier / mio_throttle…）
- <strong>Achieved vs Theoretical Bandwidth</strong>
- <strong>Roofline 分析</strong>：判断 kernel 是 Compute-Bound 还是 Memory-Bound根据指标判断：

- DRAM 吃满 → Memory-Bound，优化访存（融合、量化、tiling）
- SM 利用率高但算力低 → 指令组合不好，考虑 Tensor Core
- 占用率低 → 调整 block 大小、寄存器使用
Q41. Latency Bound 问题、Occupancy 相关问题？

- <strong>Latency Bound</strong>：指 kernel 因为指令依赖（long scoreboard、barrier）等待，没法发射新指令。可以增加并行（提高 Occupancy）来掩盖
- <strong>Occupancy 不一定越高越好</strong>：寄存器多/SMEM 多 → 占用率降低，但单线程效率高，往往整体更快
Q42. Ada 升级到 Blackwell 架构，软硬件层面有哪些变化？
硬件层面：

- 第二代 <strong>Transformer Engine</strong>，原生支持 <strong>FP4</strong> / FP6
- <strong>更大的 NVLink 带宽</strong>（NVL72 拓扑）
- 更高的 HBM 带宽和容量
- 第五代 Tensor Core软件层面：

- CUDA 12.x 新增 FP4 数据类型支持
- cuBLAS / cuDNN 适配新 mma 指令
- FA4 利用新硬件特性
Q43. 嵌入式平台 / 资源受限平台部署小模型 vs GPU 大模型推理的区别？
可复用：

- 量化（INT8/INT4）思路
- 算子融合
- KV cache 优化
- 整体的推理流水线设计需要注意的差异：

- 嵌入式更受限于<strong>内存带宽</strong>和<strong>功耗</strong>，不是算力
- CPU/NPU 没有 SIMT，需要用 SIMD（NEON）/ NPU 专用指令
- 内存分配粒度更小，不要频繁 malloc
- 算子要重写适配（NPU 通常只支持白名单算子）
- 数据搬运优化更关键：减少 CPU↔NPU 拷贝、用 zero-copy 内存
Q44. 你是用什么方法解决数据搬运和提高速度的？

- <strong>内存池 / KV Cache 池</strong>：预分配，避免运行时频繁 malloc
- <strong>Pinned memory + 异步拷贝</strong>
- <strong>Stream 并行</strong>：拷贝、计算 overlap
- <strong>算子融合</strong>：减少 kernel launch 和中间结果落盘
- <strong>量化</strong>：减少要搬运的数据量
Q45. PyTorch 显存管理是怎么做的？
PyTorch 用 <strong>caching allocator</strong>：

- 第一次申请向 CUDA 要大块（按 2MB / 20MB 分级）
- 释放时不还给 CUDA driver，而是放回内部 free list
- 下次申请优先从 free list 复用，按 size 匹配
- 这样避免频繁 `cudaMalloc/cudaFree` 的高开销
- 副作用：`nvidia-smi` 看到的显存比实际占用高
Q46. 有做过 PyTorch 自定义算子吗？
<strong>待补充</strong>（典型路径：写 CUDA kernel → C++ wrapper → `TORCH_LIBRARY` 注册 → Python 端 `torch.ops.mylib.myop` 调用；或者用 `torch.utils.cpp_extension.load_inline`）
Q47. 之前有做过建模类型的工作吗？分层看激活值的优化？
<strong>待补充</strong>（思路：用 hook 注入每层激活，统计 min/max/distribution，对比量化前后的差异，定位敏感层）
七、llama.cpp

Q48. llama.cpp 是不是只是单 batch 的情况？
历史上是单 batch 为主（端侧场景为主），但目前已经支持 batched decoding（`llama_batch`）和并行序列。不过相比 vLLM 这类 serving 框架，它的多 batch 调度仍然较为简单。

Q49. llama.cpp 除了算子优化以外，还有什么方法降低延迟？核心优化能力是什么？

- <strong>K-Quant 系列量化</strong>（Q2_K ~ Q8_K，超块 + 子块两级量化）
- <strong>GGUF 格式</strong>：mmap 直接加载，减少冷启动时间
- <strong>CPU + GPU 混合推理</strong>（`-ngl` 控制 offload 层数）
- <strong>持续 batch 优化</strong>
- <strong>prompt cache</strong>：相同 prompt 复用 KV
- <strong>跨平台 backend</strong>：Metal / CUDA / SYCL / Vulkan<strong>核心优化能力</strong>：极致的端侧量化部署 + 跨平台兼容 + 极小依赖（纯 C/C++）。

Q50. K-Quant 量化方法是什么？
<strong>量化流程（4 步）</strong>：

- <strong>分块</strong>：权重矩阵按行优先展平，每 256 维为一个超块，再拆为 8 个 32 维子块
- <strong>算局部参数</strong>：对每个 32 维子块，用 `make_qkx1_quants`（5 次迭代 K-Means）求最优 scale/min，最小化重构误差
- <strong>算全局参数</strong>：取 8 个子块的最大 scale 作为全局 scale（`d = max_scale / 63`），最大 min 作为全局 min 尺度（`dmin = max_min / 63`）
- <strong>编码存储</strong>：  
- 子块 scale/min 量化为 <strong>6-bit</strong>，紧凑存入 `scales[12]`（前 4 个直接存，后 4 个拆高低位）
- 4-bit 权重按 `qs[i] = q[2i] | (q[2i+1] << 4)` 打包入 `qs[128]` <strong>反量化（推理时）</strong>：

对每个 32 维子块：

- 从 `scales` 解码 6-bit scale/min，乘全局 `d/dmin` 得实际 scale/dm
- 解包 4-bit 权重（`q = (qs[l] & 0xF)` 或 `(qs[l] >> 4)`）
- 反量化：`x = d * q - dm`（FP16 计算）
Q51. llama.cpp 里比较精妙的技巧是什么？

- <strong>GGUF + mmap</strong>：模型按需加载，启动快、内存可被多进程共享
- <strong>Q-format 的紧凑编码</strong>：scale 和量化值的 packing 设计极致省内存
- <strong>统一的 ggml 张量抽象</strong>：跨后端只换 backend op
- <strong>SIMD 内核手工优化</strong>：每种量化格式都有 AVX2/AVX-512/NEON/Metal/CUDA 的专门实现
- <strong>graph 重用 + scratch buffer</strong>：每步推理复用同一块工作内存
八、数据表示

Q53. FLOPS 和 FLOPs 和吞吐量分别是什么？
<strong>FLOPS（Floating Point Operations Per Second，每秒浮点运算次数）</strong>：

- 衡量硬件<strong>理论峰值计算能力</strong>的标准单位
- 比较不同硬件理论算力天花板的主要指标
- 常用 TFLOPS、PFLOPS 表示<strong>FLOPs（Floating Point Operations，浮点运算次数）</strong>：

- 衡量<strong>一个模型执行一次前向（或前向+反向）所需的总浮点运算量</strong>
- 表示<strong>模型的计算复杂度</strong>
- 是估算训练/推理资源和时间的基础<strong>吞吐量（Throughput）</strong>：

- 系统在<strong>单位时间内处理的数据量或完成的任务量</strong>
- <strong>训练</strong>：tokens/s 或 samples/s
- <strong>推理</strong>：requests/s（QPS）或 tokens/s
- 衡量<strong>实际性能</strong>的关键指标