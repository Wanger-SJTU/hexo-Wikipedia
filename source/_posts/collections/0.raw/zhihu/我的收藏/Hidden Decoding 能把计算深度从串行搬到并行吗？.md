---
title: Hidden Decoding 能把计算深度从串行搬到并行吗？
date: "2026-08-09 00:00:00"
updated: "2026-08-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Hidden-Decoding-能把计算深度从串行搬到并行吗/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2069875199235843606
---


能。论文已经把这条路训到 617B MoE，并在匹配的早期 SFT-only 对照中，让 80B 与 617B 两档 Hidden Decoding 模型在九项共享 benchmark 上逐项领先。

这个“能”只覆盖研究与训练层面。Hidden Decoding 把更多计算放进单次前向，训练和服务仍要付成本。n=4 时，80B 与 617B 的单 batch 时间分别是基线的 5.1 倍和 4.4 倍；约 32k 输入、batch=32 时，解码吞吐只剩基线的 27%。

因此，更有用的问题是：它把哪一种串行变成了并行，适合哪些工作负载，还有哪些证据没有补齐？

计算深度为何总和等待时间绑在一起
显式思维链把额外计算铺在自回归时间轴上。模型多生成一个思考 token，就多走一步串行解码。链越长，等待越久，KV cache 也要继续增长。

循环式 Transformer 把隐状态送回同一网络再算。这个动作能增加深度，却会打断前沿大模型训练依赖的 pipeline parallelism。直接增加层数可以避开回送，参数量和每 token 激活成本会随深度增长。

Hidden Decoding 选择序列维度。训练系统接收一段更长的隐序列，前向方向保持单向，现有大规模 MoE 流水线仍可使用。论文把它定位为固定主干上的 continued pretraining 方法，新增计算来自每个 token 展开的多条 stream。

普通读者可以把它理解成一组同时展开的草稿状态。模型让这些状态在内部交换信息，最终只交付一条输出。这个类比解释了并行形态，不代表中间状态已经变成可读的自然语言推理。

一次前向里，多条 stream 怎样分工
以 n=4 为例，每个 token 进入四套独立 embedding，形成四条 stream。它们一起穿过同一套 Transformer 主干。前三条保留中间状态，第四条负责预测下一个 token。

![](https://pic1.zhimg.com/v2-a491069e3eacd6eb2975c931f214c2c6_r.jpg)论文方法图：每个 token 扩展为多条隐 stream，同一次前向完成计算，只让最终 stream 承担语言损失。

语言损失只落在最终 stream。6B MoE 的监督消融提供了直接比较：n=2 时，HD loss 为 1.874，sum 方案为 1.877，all-token loss 为 1.880；ARC-C 分别是 74.3、71.9、65.8。

所有中间 stream 都承受语言损失时，它们会更早靠近可见 token 目标。最终流监督给中间状态留出组织空间。论文用消融支持这项解释，没有声称中间 stream 学出了可读的推理链。

每条 stream 还保存独立 KV。21B、n=2 的小规模实验中，per-stream KV 在两种注意力布局下都优于 shared KV。作者把它标为定性检查，这项结果支持“中间状态需要被区分和读取”，无法给出 617B 上的精确收益。

617B 的训练门槛由注意力布局决定
四条 stream 若在每层都执行全量跨流注意力，注意力成本会按 n 的平方增长。n=4 对应 16 倍参考，前沿规模训练很难承受。

Stream-Factorized Attention 把层分成 full、local 和 intra-stream 三类。full 层允许所有 stream 交流，local 层限制交流窗口，intra-stream 层只读取本条 stream。多数层承担便宜的流内计算，少数层负责跨流交换。

![](https://pic3.zhimg.com/v2-bf5ca9355dd17cd0371f294121df5414_r.jpg)三种注意力范围：少数层跨 stream 交换，多数层只做更便宜的流内注意力。

21B MoE 的 27 层消融中，无扩展基线平均分为 54.33。只放 1 个 full 层时升到 55.88，4 个 full 层达到 56.49，27 个 full 层是 56.95。少数跨流层已经取得大部分增益。

这组布局让成本接近随 n 线性增长。实测仍高于理想的 4 倍参考：80B 是 5.1 倍，617B 是 4.4 倍。SFA 解决的是可训练性，新增计算没有消失。

![](https://pic4.zhimg.com/v2-f7f5afb8c57758087d5686695248f7e1_r.jpg)n=4 的单 batch 时间：80B 为基线 5.1 倍，617B 为 4.4 倍，接近 4 倍线性参考。

HD 还能继续使用 pipeline parallelism。多条 stream 在序列维度向前流动，没有循环回送。这一点解释了它为何能走到 617B，而论文列举的最大 looped 模型停在 40B。

九项全胜，应该怎样读才准确
主结果最有分量的部分是配对关系。WeLM-80B 与 WeLM-HD4-80B 共用主干和早期 SFT-only 配方；617B 采用同样的设计。两组后训练都没有 RL，每 token 激活的 Transformer 参数仍为 3B 和 23B。

代表任务80B 基线HD4 80B617B 基线HD4 617BGPQA Diamond87.688.889.191.2FrontierMath45.849.049.051.0PHYBench69.873.875.376.3MathArena Apex16.420.124.224.7SciCode45.850.051.452.1
![](https://pic1.zhimg.com/v2-d41dca990d3cb763afbe8cf3469adb50_r.jpg)左侧是 Hidden Decoding 结构，右侧是 80B 与 617B 在六项代表任务上的增量。

九项共享 benchmark 全部由 HD 版本领先。80B 的突出增量包括 SciCode +4.2、PHYBench +4.0、MathArena Apex +3.7、FrontierMath +3.2。617B 在 GPQA Diamond 上增加 2.1，在 HLE 上增加 1.8。

这份证据支持固定主干、同一早期后训练配方下的改进。它没有覆盖成熟发布模型，也没有回答完整 RL 后训练会保留多少收益。论文还列出其他模型家族的绝对分，跨家族训练数据与评测环境不同，那些数字不能承担 HD 的受控增益结论。

训练 token 也要分开读。80B 的完整非 HD 基座路径为 20.39T token，HD 在后段续训 1.07T；617B 对应 17.06T 与 0.90T。HD 的高成本集中在后段，单个 token 的计算更贵。617B 的 256k 阶段还存在 0.30T 对 0.61T 的 token 差异，因此论文称增益为保守下界，同时也承认这不是完全等 token 对照。

探针看见了状态分化，没有看见意识
准确率只能说明方法有效。论文又用探针观察中间 stream 的状态、读取关系和 token 候选分布。

同一 token 的不同 stream 在输入层高度相似，经过中间层后，余弦相似度最低约为 0.64，仍高于不同 token 的参照线。最终 stream 对首条 stream 的注意力在一个测点达到 0.52，形成了可观测的读取路径。

![](https://picx.zhimg.com/v2-73319f187b64469aa1ea04c1a3e13811_r.jpg)同一 token 的 stream 在中层分化；最终 stream 对首条 stream 的注意力在一个测点达到 0.52。

研究者把共享 LM head 接到每条 stream 上。n=8 时，中间 stream 的 top-1 与最终 stream 不同的最高比例约 63%。中间探针熵峰值达到 3.60 bits，最终 stream 约为 2.09 bits。

这些结果支持一个有限判断：中间 stream 形成了彼此不同、能被最终 stream 读取的内部状态，最终预测前保留了更宽的 token 候选。探针没有把潜状态还原成自然语言推理，也没有提供人类式思考或意识的证据。

n 值得在什么工作负载上继续增加
n 控制每个 token 展开的 stream 数。固定主干后，论文沿 n=1、2、4、8 逐级训练，语言建模 loss 和下游指标整体改善。中间档会抖动，例如 80B 的 Pile-test BPB 在 n=2 时从 0.386 变成 0.387，随后在 n=4 和 n=8 降到 0.382 与 0.378。

因此，n 更像一只要和预算共同调节的旋钮。训练团队可以用四个问题筛选场景。

决策问题更适合继续评估 HD 的回答需要谨慎的回答是否已有强基座已有，并计划后段续训仍需从头训练基座单 token 质量价值难任务收益足以覆盖额外计算任务简单且价格敏感请求形态交互式或中小 batch高并发、大 batch上下文长度短到中等上下文长上下文占主导服务矩阵把后两项的代价写得很清楚。WeLM-HD4-80B 在同一组 8 张 H20 上测试，batch=1 时保留基线 83% 到 88% 的 decoding-only completion TPS。约 32k 输入在 batch=16 时保留 44%，batch=32 时只剩 27%。

![](https://pica.zhimg.com/v2-3b436027e99d43c400f5e470a5900c10_r.jpg)服务吞吐随 batch 与输入长度下降；约 32k 输入、batch=32 时只剩基线的 27%。

这项指标排除了 prefill latency，不能替代端到端延迟、显存和单请求成本评估。HD 当前更适合单 token 质量价值高、并发压力可控的任务。长上下文高并发服务需要更完整的系统实验。

论文附录还有一条研究线索。80B 的 Terminal-Bench 2 从 44.9 升到 58.4，ARC-AGI-2 从 6.9 升到 11.6。它提示多步任务可能从潜空间计算中受益，现有实验数量不足以证明 agentic 任务普遍适配。

公开模型能验证机制，不能代表主模型
腾讯官方仓库公开了基于 Qwen3-8B 的 n=2、n=4、n=8 base 模型，以及 n=8 instruct 模型。WeLM-HD4-80B 与 WeLM-HD4-617B 主模型权重没有公开。

官方 SGLang 启动示例里有两个与 stream 边界直接相关的参数：

```text
python -m sglang.launch_server \
  --model-path tencent/Hidden-Decoding-8B-n8-Instruct \
  --chunked-prefill-size -1 \
  --attention-backend fa3
--chunked-prefill-size -1` 避免 chunked prefill 切开 stream 边界，`--attention-backend fa3` 承载跨 stream 注意力。仓库还建议采用保守 batch，因为模型内部处理的是 n 倍长序列。
```


8B 模型适合复现多 stream 机制、检查 n 的扩展曲线和验证推理补丁。它的分数无法替代 80B 与 617B 的独立复现，也不能直接回答生产系统的成本收益。

我的判断：研究路径成立，服务资格待验证
Hidden Decoding 已经跨过两道研究门槛。第一道是固定主干上的扩展曲线，n 增大时整体表现继续提高。第二道是前沿规模，617B MoE 能沿用大模型流水线完成训练，并在匹配对照里取得增益。

服务资格还差四组证据：完整 RL 后训练、主模型的外部复现、包含 prefill 的端到端成本、真实 agent 工作负载下的质量与吞吐对照。

如果团队已有强基座，任务价值集中在少量高难请求，HD 值得进入后段续训实验。长上下文和高并发占主导时，27% 那个格子应该先进入容量规划。研究问题已经有了肯定答案，生产决策仍要由工作负载回答。

参考与延伸阅读

- [Hidden Decoding at Scale 论文](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2607.08186)
- [腾讯官方 GitHub 仓库](https://link.zhihu.com/?target=https%3A//github.com/Tencent/Sequential-Hidden-Decoding)
- [WeLM 官方方法篇](https://link.zhihu.com/?target=https%3A//welm.weixin.qq.com/posts/hidden_decoding/)
- [WeLM 官方规模篇](https://link.zhihu.com/?target=https%3A//welm.weixin.qq.com/posts/hidden_decoding_at_scale/)
- [同题微信文章：Hidden Decoding，把计算深度拉回并行](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/RQfUFaPyN6EhKbv1LLfCIg)