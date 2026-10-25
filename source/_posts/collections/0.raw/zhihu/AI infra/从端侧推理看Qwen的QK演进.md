---
title: "从端侧推理看Qwen的QK演进"
date: "2025-06-20 00:00:00"
updated: "2025-06-20 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AI-infra/从端侧推理看Qwen的QK演进/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1919340508637016870"
---


前段时间，备受瞩目的Qwen3系列模型正式发布。除了全量引入Think之外，还有一处不太重大的变化就是引入了QK-Norm，官方Report中介绍如下。

"Besides, we remove QKV-bias used in Qwen2 (Yang et al., 2024a) and introduce QK-Norm (Dehghani et al., 2023) to the attention mechanism to ensure stable training for Qwen3."简单来说，Qwen3移除了前代模型中的QK-Bias，并引入了QK-Norm。官方给出的理由是“确保稳定的训练”。这无疑是一个重要的优化，但从端侧推理视角看，这一变化的收益不止于训练，对于推理，特别是端侧推理的溢出问题也是一个很大改善。

这个想法，源于我此前在部署Qwen2时遇到的已经数值溢出问题。在我们尝试将<strong>Qwen2-1.5B-Instruct</strong>模型通过MNN部署到端侧设备时。为了在移动端获得最佳性能，我们采用了float16作为推理时的激活值精度。然而，模型在推理时频繁出现回答错误。通过逐层排查，我们最终定位到了问题——Attention模块中的`query @ key`计算结果发生了<strong>数值溢出</strong>。这里，我们需要了解一个关键的背景：

- <strong>云端推理 (BF16):</strong> 服务器GPU（如A100/H100）主流使用 bfloat16。它有8位指数位，数值范围与float32相同，<strong>几乎不会溢出</strong>，但精度较低。
- <strong>端侧推理 (FP16):</strong> 手机等移动端CPU、GPU、NPU普遍支持 float16。它只有5位指数位，<strong>最大只能表示约65504</strong>，非常容易溢出，但精度相对较高。bfloat16 在训练时的“宽容”掩盖了可能存在的巨大数值，而 float16 在推理时的“苛刻”，则让这个问题暴露。当时，我们通过将` (q @ k) / scale` 修改为 `q/scale @ k` 的<strong>缩放因子前移</strong>方案解决了溢出问题。其实同样的方案在其他attention实现中也有，例如torch的`sdpa`实现也是将scale前移到q和k来解决溢出问题，其修改如下：

$$\frac{Q K^T}{\sqrt{d_k}}  \rightarrow  \frac{Q}{\sqrt{\sqrt{d_k}}} \frac{K^T}{\sqrt{\sqrt{d_k}}}$$


从测试来看Qwen2模型更容易在float16上溢出，Qwen1也有QK-Bias但是不容易溢出（未发现），Qwen3使用了QK-Norm基本未发现溢出问题。为此我对Qwen系列的三代代表性模型进行了细致的测试，统计了它们每一层Attention中QK-Bias和q@k结果的最大值，从数据能够看出：

- <strong>Qwen1/1.5 (QK-Bias时代 - 早期):</strong> QK-Bias 值很小，q@k最大值不大，在FP16下比较安全。
- <strong>Qwen2/2.5 (QK-Bias时代 - 后期):</strong> QK-Bias 值<strong>急剧增大</strong>，出现了200以上的惊人数字，直接导致q@k的最大值<strong>爆炸性增长，</strong>这个量级在FP16下是<strong>大概率溢出</strong>的。
- <strong>Qwen3 (QK-Norm时代):</strong> QK-Bias被移除。q@k的最大值被<strong>牢牢地控制</strong>在一个极小的范围内，峰值不大，表现出极高的稳定性，基本不会溢出。
![](https://picx.zhimg.com/v2-9fbd959691329e5ecd77f0d366164373_r.jpg)这张图画出了统计数据的信息：

- <strong>图B</strong>显示，从Qwen1.5到Qwen2，QK-Bias的急剧增长是导致问题的<strong>直接原因</strong>。
- <strong>图A</strong>显示，这个巨大的Bias导致了Qwen2的q@k值失控，而Qwen3则成功地将其压制到稳定范围。
- <strong>图C</strong>从逐层视角看，Qwen2的不稳定性在某些层（如首尾层）尤为严重，而Qwen3在所有层都保持了高度的稳定。从端侧推理角度看Qwen3引入QK-Norm，其意义远超“稳定训练”，它更是架构层面为适配FP16等精度受限的推理带来了精度保障。QK-Norm通过在点积前对Q和K向量进行强制归一化，带来了两大核心优势：

- <strong>彻底消除溢出风险：</strong>
如前文分析，归一化操作利用数学原理，将q@k点积的上限严格约束在头维度d_k（如128）附近。这个值与FP16的上限65504相比，完全不在一个量级上。无论模型的激活值在内部如何“放飞自我”，这个“安全阀”都能保证Attention计算的绝对稳定，从根源上解决了NaN问题。
- <strong>为量化铺平道路：</strong>
端侧部署除了FP16，还会追求INT8等更低精度的量化加速。量化的关键在于找到合适的缩放因子来映射激活值的范围。QK-Norm处理后的Q、K向量，其数值分布更规整、更集中，这使得量化过程更简单，精度损失也更小。测试代码：[https://github.com/wangzhaode/llm-lab/tree/main/qwen_qk](https://link.zhihu.com/?target=https%3A//github.com/wangzhaode/llm-lab/tree/main/qwen_qk)