---
title: "使用SpecForge对dflash进行非官方复现和解析"
date: "2026-02-25 00:00:00"
updated: "2026-02-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/使用SpecForge对dflash进行非官方复现和解析/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2009941050500880179"
---


### 动机

近年来，模型原生适配投机推理（Speculative Decoding）已成为趋势，如小米的 MIMO 便集成了 MTP（Multi-Token Prediction）技术。然而，这种深度集成通常依赖基座模型方的官方支持。对于 Qwen 等尚未原生内置投机推理机制的模型，则需要社区力量进行二次开发与适配。

目前，在第三方投机推理算法中，EAGLE-3 备受关注。我曾在此前的文章中对其进行过复现（详见链接）。

[![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_5eac9d797c4a.jpg)投机采样Eagle3的复现及开源报告147 赞同 · 223 评论 文章](https://zhuanlan.zhihu.com/p/1923763301432662012)

EAGLE-3 这类方案的核心逻辑在于：通过训练一个轻量级的 Draft 模型（草稿模型）预测候选 Token，再交由目标大模型进行并行验证，从而在保证输出质量的前提下大幅提升推理效率。

尽管 EAGLE-3 表现出色，但在实际生产环境中仍面临两大局限：

- <strong>架构层面的自回归瓶颈</strong>：EAGLE-3 本质上仍未脱离自回归生成的范式。这意味着 Draft 模型在生成候选 Token 时依然存在串行依赖。
- <strong>高并发下的性能衰减</strong>：在 Batch Size 增加（通常超过 8）的高并发场景下，EAGLE-3 的性能会出现急剧下滑。这是由于投机推理带来的额外验证开销与显存占用，导致系统从计算受限转为访存受限，其吞吐表现甚至会低于不使用任何加速策略的原生推理。
针对上述瓶颈，<strong>dFlash</strong> 应运而生。它引入了 <strong>dLLM</strong>模块作为 Draft 模型，巧妙地融合了两种范式的长处：一方面保留了自回归（AR）模型生成的语义强度，另一方面利用扩散模型（Diffusion）高度可并行化的特性，克服了串行生成的效率陷阱。这种结合成功打破了原有“模型准确度”与“生成速度”之间的权衡，规避了传统自回归 Draft 模型在长序列生成上的迟滞。

[](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2602.06036)

### 什么是dflash

#### dflash之前的缺点

在dflash之前，就有工作尝试将dllm作为draft模型，但是他们的工作存在以下的不足之处：

- <strong>推理成本高昂</strong>：之前的 DiffuSpec 和 SpecDiff-2 等方法，其 Draft 模型参数量往往高达 7B。如此巨大的显存占用与计算开销，使得 Draft 模型本身就成了沉重的资源负载，在实际推理服务中不仅成本昂贵，也抵消了加速带来的收益。
- <strong>draft模型和target模型对齐难</strong>：draft模型与target模型的输出分布难实现精准对齐。这种推理能力的代差导致采样接受率极低，最终使得整体加速效果大幅缩水。

#### dflash的优化

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_897b4425ddde.jpg)

dflash的架构图上图为dflash的架构图，从图中可以看到dflash的推理的实现流程。

dFlash 首先通过target模型完成 Prefill 并生成首个起始 Token。随后，该 Token 会与若干 Mask Token 组成待预测块（Block）送入 Embedding 层。在此基础上，kv cache 和新生成的embedding向量通过双向注意力层与 MLP 进行多次迭代处理，充分融合上下文特征。最终，dFlash 复用target模型的 LM Head，将这些经过多轮dflash layer的hidden state一次性并行地映射为多个候选 Token。这种设计巧妙地利用了目标模型的先验知识，同时发挥了扩散架构并行生成的速率优势。


![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_9a1c868bae30.jpg)

dflash训练的注意力mask图既然我们现在有了dflash的推理过程了，那么训练过程怎么搞。

其实dFlash 的训练流程在架构上与推理保持一致，但在执行效率上更具优势。不同于推理阶段必须受限于 单个Block 级的生成，训练阶段可以利用已知序列进行高度并行化处理**。它能够一次性对多个 Block 执行前向推理并并行计算 Loss。而到了实际推理场景，则回归到逐 Block 生成的模式。

从上面的图可以看到，当训练时，每个block里面的token的注意力只能看到他们自己的那个block的其他token，但是每个block之间可以并行地做注意力的计算。

#### Dflash的官方效果

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_4e69432e1657.jpg)

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_3ea1ed224b6d.jpg)

从上面的图表可以看到，Dflash的效果还是非常地炸裂的。比baseline提升了4到6倍，然后比eagle3也提升1到2倍。（不过这个效果eagle3的作者也有在跟dflash的作者在argue中，详情可以看dflash的github仓库的issue）

### dflash的复现

因为dflash的官方还没公布他的训练代码，不过SpecForge这个仓库，根据dflash的论文复现了一版出来。

对应的pr为：

[](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/SpecForge/pull/473)

现在我们来手动复现一下这个训练

1.首先git clone 仓库

`https://github.com/sgl-project/SpecForge.git`

2.然后cd 仓库，安装包

```bash
cd SpecForge
pip install -e ./
```


3.然后生成对应的训练数据

# 1. Prepare seed dataset
python scripts/prepare_data.py --dataset perfectblend

# 2. Start SGLang server for Qwen3-8B

```text
python3 -m sglang.launch_server \
    --model Qwen/Qwen3-8B \
    --dtype bfloat16 \
    --mem-frac=0.8 \
    --port 30000
```


# 3. Regenerate with target model (thinking enabled)

```text
python scripts/regenerate_train_data.py \
    --model Qwen/Qwen3-8B \
    --is-reasoning-model \
    --concurrency 128 \
    --max-tokens 98304 \
    --temperature 0.8 \
    --server-address localhost:30000 \
    --input-file-path ./cache/dataset/perfectblend_train.jsonl \
    --output-file-path ./cache/dataset/perfectblend_qwen3-8b_regen.jsonl
```


如果不想重新生成的话，可以用这个数据集

[](https://link.zhihu.com/?target=https%3A//huggingface.co/eigen-ai-labs/perfectblend-qwen3-8b-regen-demo/tree/main)

但是他只有全部数据集的15%,我也是用的这个数据集训练的

4.开启训练

`bash examples/run_qwen3_8b_dflash_online.sh`


#### 训练效果

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_6ac72a9e2a80.jpg)

训练的log(借用别人的)
#### 部署dflash

我把对应的权重开源出来了，大家可以在这下载

[](https://link.zhihu.com/?target=https%3A//huggingface.co/Tengyunw/Qwen3-8B-DFlash)

部署命令为

# 先安装特定版本的sglang
pip install git+https://github.com/sgl-project/sglang.git@refs/pull/16818/head#subdirectory=python
# 然后启动
python -m sglang.launch_server     --model-path Qwen/Qwen3-8B     --speculative-algorithm DFLASH     --speculative-draft-model-path Tengyunw/Qwen3-8B-DFlash     --tp-size 1     --dtype bfloat16     --attention-backend fa3     --mem-fraction-static 0.75     --trust-remote-code

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_65c1fc46c783.jpg)00:16

dflash效果演示

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_dfc62fbebd94.jpg)

sglang 后台
#### 压测效果

### DFLASH Bench Report

### Settings

- dataset: `math500`
- max_new_tokens: `2048`
- attention_backends: `fa3, flashinfer`
- tp_size: `1`
- concurrencies: `1, 4, 8, 16, 32`
- questions_per_concurrency: `base=128`
- device_sm: `90`
- is_blackwell: `False`
- skip_baseline: `False`
- drop_first_batch: `true`

### Backend: `fa3`

#### Baseline output tok/s

conc1481632value146.15557.571,073.811,995.193,522.30
#### DFLASH output tok/s

conc1481632value507.641,820.023,335.615,365.146,985.11
#### Speedup (DFLASH / baseline)

conc1481632value3.4743.2643.1062.6891.983
#### DFLASH acceptance length

conc1481632value5.7585.6825.6655.6805.696
### Backend: `flashinfer`

#### Baseline output tok/s

conc1481632value147.22563.031,079.811,991.503,414.32
#### DFLASH output tok/s

conc1481632value485.971,686.932,958.824,580.785,861.75
#### Speedup (DFLASH / baseline)

conc1481632value3.3012.9962.7402.3001.717
#### DFLASH acceptance length

conc1481632value5.7145.6695.6755.6885.702从压测结果可以看到，dlfash的接受长度是非常理想的，并且他能在32高并发的情况下还保持接近2倍的速度提升。

### 总结

引入 dLLM 作为投机推理的 Draft 模型，无疑是提升大语言模型（LLM）推理性能的一个极具潜力的方向。相较于传统方案，dFlash 带来的加速效果并非边际改善，而是实现了数倍的跨越式增长。即便在最具挑战性的高并发（High Throughput）场景**下，它依然能保持近 2 倍的性能增益，这有效打破了投机推理在扩展性上的瓶颈。

然而，作为一项前沿技术，dFlash 仍存在优化的空间：

- <strong>训练成本与资源开销</strong>：其训练密集度显著高于 EAGLE-3。在实际测试中，使用 H800 需耗时 12 小时，即便是 B300 也需要 4 至 5 小时的训练周期，这为快速迭代带来了一定的算力门槛。
- <strong>社区复现的性能缺口</strong>：目前社区开源实现的效率约仅能达到官方报告的 80% 左右，这可能与训练数据的规模及覆盖度尚未完全对齐有关。
纵观全局，随着 Agent 等复杂应用场景的爆发，行业对大模型实时生成的性能要求将持续攀升。dFlash 作为一个在<strong>算法范式层面</strong>解决推理性能问题的卓越范例，我相信未来肯定会越来越多这种工作的出现。
