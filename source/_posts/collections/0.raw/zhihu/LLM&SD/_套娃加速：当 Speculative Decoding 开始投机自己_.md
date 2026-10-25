---
title: 套娃加速：当 Speculative Decoding 开始投机自己
date: "2026-04-13 00:00:00"
updated: "2026-04-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/_套娃加速-当-Speculative-Decoding-开始投机自己_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2026747951905613706
---


<strong>论文来源</strong>: Tanishq Kumar (Stanford), Tri Dao (Princeton / Together AI), Avner May (Together AI) <strong>GitHub</strong>: [https://github.com/tanishqkumar/ssd](https://link.zhihu.com/?target=https%3A//github.com/tanishqkumar/ssd) <strong>面向读者</strong>: 有编程经验的 ML 从业者，了解 Speculative Decoding、KV Cache、Rejection Sampling 等核心概念
#### 一句话总结

Speculative Decoding 本身也有串行瓶颈——verification 完成前 draft 模型只能干等。<strong>Speculative Speculative Decoding (SSD)</strong> 让 draft 模型在等待 verification 的同时，预测可能的 verification 结果并提前准备好下一轮 speculation，命中就直接跳过 draft 延迟，实测比最强 SD 基线快约 30%（Section 5, Figure 7）。

#### 1. 问题：Speculative Decoding 的串行瓶颈

你已经很熟悉 SD 了：小模型猜 K 个 token，大模型一次 forward pass 并行验证，通过 rejection sampling 保证输出分布不变。但 SD 有一个结构性问题——<strong>speculation 和 verification 是串行的</strong>：

`[Draft 猜 K tokens] → [Target 验证] → [Draft 再猜 K tokens] → [Target 验证] → ...`

验证期间 draft 模型空闲，起草期间 target 模型空闲。如果把这两步并行化会怎样？（Section 1, p.1）

<strong>Figure 1: SD vs SSD 对比</strong> 左图：标准 SD 中 draft 和 verify 交替执行，互相等待。中图：SSD 中 draft 在 verify 同时预测结果并预计算 speculation，命中后立即返回。右图：end-to-end 性能对比，SSD (Ours) 在 Llama-3.1-70B 上达到约 270 tok/s，比 vLLM SD (2.1x) 和 SGLang SD (3.1x) 更快，达到 4.0x 加速。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_0806c49be7b4.jpg)

#### 2. SSD 核心思想：预测 Verification 结果，提前备好 Speculation

SSD 的核心洞察很简单：

- Draft 发送 spec_tokens 给 target 进行验证
- 不等验证结果**，draft 立刻预测”验证大概会接受前几个 token、bonus token 是什么”
- 为每个预测的 outcome 提前跑好下一轮 speculation，存入 <strong>speculation cache</strong>
- 收到真实验证结果后，查缓存——命中就<strong>零延迟</strong>返回，miss 就走 fallback
关键点：draft 和 target 运行在<strong>不同的 GPU</strong> 上（例如 1×H100 跑 draft，另外的 H100 跑 target），所以并行是真正的物理并行，不是同一块卡上的时分复用。（Section 1, p.1-2; Section 3, p.4）

#### 伪代码拆解

<strong>Algorithm 1: SSD Framework</strong> 三个异步函数：main（启动器）、verifier（循环验证）、speculator（循环预测+缓存）。核心在 speculator 的 while loop 中：发送 spec_tokens → 预测 outcomes → 为每个 outcome 预计算 speculation → 等待验证结果 → 查缓存命中/fallback。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9e58186a5b5d.jpg)

用 Python 伪代码来理解 speculator 的核心逻辑：

```python
class Speculator:
    def run(self, prompt, primary_draft, backup_draft):
        spec_tokens = primary_draft.speculate(prompt)
```

        
        while True:
            # 1. 发送当前 speculation 给 verifier
            send_to_verifier(spec_tokens)
            
            # 2. 不等回复！立即预测可能的 verification outcomes
            predicted_outcomes = predict_verify_outcomes(spec_tokens, primary_draft)  # Sec 4.1
            
            # 3. 为每个预测 outcome 预计算下一轮 speculation → 存入 cache

```text
            cache = {}
            for outcome in predicted_outcomes:
                cache[outcome] = primary_draft.speculate(outcome)  # Sec 4.2
```

            
            # 4. 等待真实验证结果
            verify_outcome = receive_from_verifier()
            
            # 5. 查缓存
            if verify_outcome in cache:  # Cache hit!

```text
                spec_tokens = cache[verify_outcome]  # 零 draft 延迟
            else:  # Cache miss
                spec_tokens = fallback_speculate(verify_outcome, ...)  # Sec 4.3`
```


和标准 SD 的关键区别<strong>：步骤 2-3 和 verifier 的计算是</strong>并行**的。如果 cache hit，则 draft 延迟从 O(K × draft_time) 降到 ~0。（Section 3.1, p.4-5）

#### 3. 三大挑战与 Saguaro 算法

SSD 框架简洁，但实际落地有三个关键挑战。论文提出的 Saguaro（仙人掌）算法分别给出了 principled 的解决方案。

#### 3.1 Challenge 1：怎么预测 Verification Outcome？

Verification outcome 由两部分组成：接受了前多少个 token（accepted count），以及 bonus token 是什么。预测空间很大——如果 K=6 个位置，每个位置 vocab_size 种 bonus token 可能，那组合数是天文数字。

<strong>Fan out</strong> 策略：为每轮 speculation 预测 F 个最可能的 outcomes，只预计算这 F 个对应的 speculation。F 越大 cache hit rate 越高，但计算开销也越大。

<strong>Figure 2: Speculation 缓存构建示意图</strong> 展示了如何在 token tree 的不同分支节点上进行 fan out，为每个可能的 verification outcome 预计算 speculation chain。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f72321f82e2d.jpg)

核心发现——Geometric Fan Out<strong>：token 的 rejection rate 随位置</strong>指数下降**。第 1 个 token 被 reject 的概率最高，后面的越来越低（因为后面的 token 是条件在前面已接受 token 上的）。所以应该把更多 fan out budget 分配给 early positions。（Section 4.1, p.7-8）

分配公式：

 $$f_i = \frac{F^{\frac{K+1-i}{K+1}}}{\displaystyle\sum_{j=1}^{K+1} F^{\frac{K+1-j}{K+1}}} $$

其中 f_i 是分配给第 i 个位置的 fan out 数量，F 是总 fan out budget，K 是 speculation 长度。直觉上，i 越小（越靠前的位置），指数越大，分到的 fan out 越多。

<strong>Figure 3: Cache Hit Rate 随 Fan Out 的缩放</strong> 左、中图展示 rejection rate 随 token 位置指数下降的经验规律。右图展示 geometric fan out 的 cache hit rate 显著优于 uniform fan out。F=8 时 greedy 解码下 cache hit rate 接近 95%。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_95fc60330f5c.jpg)

 Figure 4: Geometric vs Uniform Fan Out<strong>高温采样下 geometric fan out 的优势更加显著，因为高温时 early position 的 rejection rate 更高，geometric 分配更能捕获这些变化。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_eb3c8cf6f476.jpg)

*[解读者注]* Geometric fan out 的直觉很好理解：想象你在预测一个概率链条的结果。链条前端的不确定性最大（draft 和 target 分布差异最大），后端的 token 其实已经被前面接受的 token “锁定”了大半。所以预测 budget 应该集中在前端。

#### 3.2 Challenge 2：Saguaro Sampling — 平衡 Cache Hit 和 Acceptance Rate

标准 SD 中，draft 模型的采样策略只需要关心一件事：acceptance rate。但 SSD 引入了新的 tradeoff：

- 如果 draft 采样更集中<strong>（greedy-like）→ 预测 verification outcome 更容易 →</strong>cache hit rate ↑**
- <strong>但分布偏离 target 更多</strong> → <strong>acceptance rate ↓</strong>
Saguaro sampling 通过一个混合分布来平衡：

 \tilde{q}(x) = (1 - \lambda) \cdot q(x) + \lambda \cdot \mathbf{1}[x = \arg\max q] 

即以 (1-\lambda) 的权重保留原始 draft 分布 q(x)，以 \lambda 的权重把概率集中到最高概率的 token 上。

- \lambda = 0：退化为标准 draft sampling（纯 acceptance rate 优化）
- \lambda = 1：退化为 greedy decoding（纯 cache hit rate 优化）
- 最优 \lambda 取决于 cache hit time vs cache miss time 的比值
<strong>Figure 5: Saguaro Sampling</strong> 展示了 λ 对 acceptance rate 和 cache hit rate 的 tradeoff 效果。存在一个最优 λ 使得整体 decoding 速度最大化。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5cd81cb621d2.jpg)

关键定理 (Theorem 9, p.9-10)**：最优 \lambda 满足——当 cache hit 时节省的时间恰好等于因 acceptance rate 降低而增加的时间时达到平衡。具体来说，\lambda 应该随着 t_{\text{miss}} / t_{\text{hit}} 比值的增大而增大（cache miss 代价越高，越值得牺牲 acceptance rate 来换取更高的 cache hit rate）。

*[解读者注]* 这里的设计哲学很优雅：标准 SD 只在 “draft 猜对/猜错” 一个维度上优化，SSD 增加了 “cache 命中/未命中” 第二个维度。Saguaro sampling 在这个二维 tradeoff 空间中找到了理论最优点。

#### 3.3 Challenge 3：Cache Miss 怎么办？

Cache miss 不可避免。此时需要 <strong>backup speculator</strong> 来生成 speculation：

<strong>方案 A — Fast Speculator</strong>：n-gram 匹配或简单启发式，几乎零延迟但质量低。 <strong>方案 B — Neural Speculator</strong>：用 draft model 重新跑一遍，质量高但有延迟。

<strong>Figure 6: Backup Speculator 选择</strong> 左图：batch size 较小时 neural backup 更优（GPU 计算能力有富余），batch size 较大时 fast backup 更优（GPU 已饱和，neural backup 延迟太高）。右图：展示了 SSD 在不同 batch size 下的表现。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_32b837ee3cdc.jpg)

Theorem 17 (p.24)** 给出了选择准则：

# 简化的选择逻辑
if batch_size * draft_model_size 

*[解读者注]* 这个 tradeoff 在工程实践中非常实用。在线服务场景（大 batch）倾向 fast backup；离线推理场景（小 batch, 追求单请求延迟）倾向 neural backup。

#### 4. 实现架构

SSD 的实现需要 draft 和 target 运行在<strong>物理分离的 GPU</strong> 上。论文使用 1×H100 给 draft model，1-8×H100 给 target model，通过 NCCL 进行跨 GPU 通信。（Appendix B, p.28-30）

关键实现细节：

- <strong>Custom Attention Mask</strong>：每轮 draft 需要为 B·F·(K+1) 个 verification 分支并行解码。论文设计了自定义 attention mask，使得不同分支的 token 只能 attend 到自己分支的 prefix，实现单次 forward pass 处理所有分支。
<strong>Figure 8: Custom Attention Mask</strong> 展示了多查询解码的 attention mask 结构，每个验证分支有独立的因果 mask。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_122037d3516a.jpg)

- Speculation Cache 内存开销**：存储 O(B \cdot F \cdot K \cdot (K+1) \cdot (V+1)) bits，其中 B 是 batch size，F 是 fan out，K 是 speculation 长度，V 是 vocab size。实际约几百 MB，在 H100 的 80GB HBM 中可以忽略。（Section B, p.30）
- <strong>通信开销</strong>：每轮 target 发送 O(B) bits（accepted count + bonus token），draft 发送 spec tokens + logits。通信量远小于模型计算时间。

#### 5. 实验结果

#### 5.1 主实验：Llama-3.1-70B

<strong>Figure 7: End-to-End 性能对比</strong> 左图：SSD vs SD vs AR 在不同设置下的解码速度。SSD (Saguaro) 在 Llama-3.1-70B + 1B draft 配置下达到约 270 tok/s，比 SGLang SD (~200 tok/s) 快约 30%，比 vLLM AR (~65 tok/s) 快约 4x。右图：batch size scaling 表现。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5b40eefd5d3b.jpg)

具体数据（Section 5, Figure 7）：

- AR baseline**: vLLM ~65 tok/s, SGLang ~65 tok/s
- <strong>SD (最强基线)</strong>: SGLang Standalone steps=10, topk=3 → <strong>201.9 tok/s</strong>（Table 1）
- <strong>SSD (Saguaro)</strong>: <strong>~270 tok/s</strong>，比最强 SD 基线快 ~30%

#### 5.2 基线对比细节

论文非常仔细地 sweep 了 SD 基线的超参，确保对比公平：

<strong>Table 1: SGLang 基线 Sweep</strong> 在 SGLang 0.5.9 上对 Llama-3.1-70B/1B 进行了 steps × topk 的全面网格搜索。EAGLE-3 最优配置为 steps=8, topk=3 (192.8 tok/s)，Standalone 最优为 steps=10, topk=3 (201.9 tok/s)。** ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_87a435d262cd.jpg)

 Table 2: vLLM 基线 Sweep<strong>vLLM 0.16.0 上 EAGLE-3 最优为 K=6 (197.6 tok/s)，Standalone 最优为 K=2 (136.0 tok/s)。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a840bb9296bf.jpg)

*[解读者注]* 这里值得注意的是，论文选择了当时最新版本的 vLLM 和 SGLang 作为基线，并且做了详尽的超参搜索。很多 SD 论文只和 vanilla SD 比，而这篇直接对标生产级推理引擎的最优配置，说服力更强。

#### 5.3 与 EAGLE-3 结合 (Appendix E)

SSD 框架可以和其他 SD 变体结合。论文展示了 SSD + EAGLE-3 的组合：

> Figure 9: SSD-EAGLE-3 vs EAGLE-3<strong>在 EAGLE-3 中，draft model 需要 target model 上一轮的 hidden states 作为输入。在 SSD-EAGLE-3 中，由于 draft 和 target 并行运行，无法获得当前轮的 hidden states，所以使用上一轮缓存的 hidden states 代替（activation conditioning 的变化）。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3cab67864fd3.jpg)

#### 5.4 Qwen-3 模型家族验证 (Appendix F)

> Figure 10: Qwen-3 Cache Hit Rate 缩放<strong>Qwen-3 模型也展现了与 Llama-3 类似的 rejection rate 指数下降规律，验证了 geometric fan out 的通用性。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_a865d93941f6.jpg)

 Figure 11: Qwen-3 End-to-End 性能<strong>SSD 在 Qwen-3-32B + 0.6B draft 上也展现了显著加速。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_cc258fdf6f71.jpg)

 Figure 12: Qwen-3 模型家族 E2E 速度<strong>不同 Qwen-3 模型大小下 SSD 的端到端速度对比。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5fed43ca63b8.jpg)

 Figure 13: Qwen-3 Batch Size Scaling<strong>Qwen-3 模型在不同 batch size 下的表现。</strong> 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_069c30601e50.jpg)

#### 6. 理论贡献

论文在理论层面也有扎实的贡献（Section 3.2, Appendix A）：

- SSD 保持 Lossless**（Theorem 1, p.5）：SSD 输出的 token 分布与 target model 完全一致，这一点的证明依赖于验证机制的不变性——无论 speculation 是实时生成还是从缓存取出，验证步骤完全相同。
- <strong>SSD 不会比 SD 更慢</strong>（Theorem 3, p.6）：在期望意义上，SSD 的每轮时间 ≤ SD 的每轮时间。因为 cache hit 节省时间，cache miss 最多退化为标准 SD。
- <strong>Geometric Fan Out 的最优性</strong>（Theorem 7, p.8）：在 rejection rate 指数下降的假设下，geometric 分配最大化 cache hit rate。
- <strong>Backup Speculator 选择</strong>（Theorem 17, p.24）：给出了 neural vs fast backup 的选择边界，取决于 batch size 和硬件参数。

#### 7. 局限性与思考

论文明确提出了几个局限（Section 6, p.12）：

- <strong>需要额外硬件</strong>：draft model 必须在独立 GPU 上运行。这意味着 SSD 最适合有多卡资源的场景，不适合单卡部署。
- <strong>计算浪费</strong>：fan out 意味着大量预计算的 speculation 会被丢弃（cache miss 的分支）。SSD 的哲学是”用更多 FLOPs 换更低延迟”——和 SD 本身的哲学一脉相承，只是更进一步。（Section B, p.30）
- <strong>高温采样下 cache hit rate 降低</strong>：温度越高，token 分布越平坦，预测 verification outcome 越难。Figure 4 显示 temperature=1.0 时 geometric fan out 仍有优势，但绝对 hit rate 低于 greedy 场景。
*[解读者注]* 从系统设计角度看，SSD 的”额外 GPU”要求其实不是纯粹的劣势。在生产级 LLM serving 中，很多公司已经在用多卡部署，draft 模型占用的计算资源相对于整个 target model 很小。关键问题是：这额外的一张 H100 是放在跑 draft 上回报更大，还是用来增加 batch size / tensor parallelism？这取决于具体场景的 SLO（延迟要求）和吞吐需求。

*[解读者注]* 另一个有趣的方向是 SSD 与 structured decoding（如 JSON schema constrained generation）的结合。在 constrained 场景下，token 分布更集中，cache hit rate 天然更高，SSD 的优势可能更加显著。

#### 8. 总结

维度标准 SDSSD (Saguaro)Draft/Verify 关系串行并行（物理分离的 GPU）Draft 等待时间等待 verification 完成预测 + 预计算 speculationCache hit 时延迟N/A≈ 0（直接返回缓存）Cache miss 时延迟N/A≤ 标准 SD（fallback）Lossless是是额外硬件需求无需要独立 GPU 给 draft代表性加速~3x vs AR~4x vs AR, ~1.3x vs SDSSD 的贡献在于识别并消除了 speculative decoding 中 draft 和 verify 之间的串行依赖。通过 geometric fan out、Saguaro sampling 和自适应 backup speculator 三个组件，Saguaro 算法将这一框架落地为实际可用的系统，在生产级推理引擎上实现了 30% 的额外加速。
