---
title: 蚂蚁开源 x SGLang Meetup技术回放解读系列之面向DeepSeek系列模型的深度优化与实践
date: "2026-05-06 00:00:00"
updated: "2026-05-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/蚂蚁开源-x-SGLang-Meetup技术回放解读系列之面向DeepSeek系列模型的深度优化与实践/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2035331396995129665
---


前言的前言
 欢迎关注 [https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS](https://link.zhihu.com/?target=https%3A//github.com/BBuf/AI-Infra-Auto-Driven-SKILLS)  一起自动驾驶SGLang SKILLS
 本文由Codex + GPT5.5创作而来，用了我自己之前手写博客的风格skill，人工校对了保证了相关信息的准确性。除了编程能力提升之外，Agent在辅助学习以及翻阅Github历史PR，例如去阅读某个模型的所有历史优化PR代码，并总结优化motivation以及把关键代码拿出来解释这方面已经非常强了，基本实现了我想要的效果。去年用Cursor的时候就一直有这个想法，但是完全无法做到，但今天Codex完全解决了这个问题。比如去年 [SGLang 2025-8月性能优化技巧记录](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/Q7aDLJJ5PQ1m7VAqef4hcw) 和 [SGLang 性能优化知识点2025-9月月报](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/6AVsx9FavxCjVmnmzVyoLw) 这两个文档是我花了2周时间手动收集的信息，而且收集的这些信息还有很多漏的，后面感觉太劳累了也无法坚持下去。但这些苦力活现在变成了一句prompt，Agent就比我做得更好更全面，而且我难以看懂的代码Agent秒懂还解释给我，比如这里提到的一些模型的优化历史就是如此：[https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/tree/main/model-pr-optimization-history](https://link.zhihu.com/?target=https%3A//github.com/BBuf/AI-Infra-Auto-Driven-SKILLS/tree/main/model-pr-optimization-history) 。Agent有了这个能力之后，对我们的学习也是更大的助力，例如本篇文章对应的就是蚂蚁开源 x SGLang Meetup 中「蚂蚁 Theta 面向 DeepSeek 系列模型的深度优化和实践」这个分享的slides解读，这个博客由一个prompt来生成：

/Users/bbuf/工作目录/Common/how-to-optim-algorithm-in-cuda/large-language-model/sglang/蚂蚁开源 x SGLang Meetup技术回放解读之面向DeepSeek系列模型的深度优化与实践.md 这里记录了蚂蚁开源xsglang活动里面的一个演讲的slides，具体是 /Users/bbuf/工作目录/Common/antoss-meetup/sglang-meetup/2. 张天雨-蚂蚁 Theta 面向 DeepSeek 系列模型的深度优化和实践.pdf 这个pdf截图过来的。

我现在要求你阅读这些图片新增详细的讲解让它变成一篇博客，和我在/Users/bbuf/工作目录/Common/how-to-optim-algorithm-in-cuda/large-language-model/sglang里面写的其它博客格式和叙述风格要类似。

对于每张slides涉及到的优化你都需要去/Users/bbuf/工作目录/Common/AI-Infra-Auto-Driven-SKILLS/model-pr-optimization-history/sglang 这个目录找这个优化对应的SGLang的PR。

如果找不到需要在sglang源码和open pr或者close pr再去扫一遍，或者去把sgl-project里面的仓库扫描一遍比如SBO的代码就是在fork的deepgemm仓库里面，找到之后把每个PR实现slides指出feature的关键思路和代码都放到博客里面并把这些代码讲清楚。没找到也要说明。

你要做成一篇技术和代码讲解都特别详细的博客出来，可以开始执行了

之前看一些视频分享可能你并不会理解到太多细节，通过Codex+GPT5.5你可以彻底回放这些slides之后的技术细节甚至是代码细节，获取更多的知识来帮助你理解和学习。

<strong>因此，我觉得这种模式是真心推荐给普通开发工程师的，你可以用上面的prompt先提前学一遍你要处理的工作，接下来带着这些已有的context做一些自己的思考和改进。</strong>

除了这一点之外，我最近也发现Codex GPT5.5在复现论文或者技术博客数据方面也非常强，这个大家自己使用之后应该就能体会到，我尝试复现了一篇 [https://pytorch.org/blog/faster-diffusion-on-blackwell-mxfp8-and-nvfp4-with-diffusers-and-torchao/](https://link.zhihu.com/?target=https%3A//pytorch.org/blog/faster-diffusion-on-blackwell-mxfp8-and-nvfp4-with-diffusers-and-torchao/) 也是直接端到端的完全做出来了，没有任何中间干预。目前block我们的就是GPT5.5实在太贵了。放假的这几天Token快速烧完之后我有了停电的那种无力感，什么都做不动了，甚至没有Agent的辅助很难静心学个新东西，感觉是彻底有点废了。后面打算试一下DeepSeek V4模型看看能不能替换GPT5.5 解决这些需求，有机会也评测一下给大家看看

[https://github.com/BBuf/AI-Infra-Auto-Driven-SKILLS](https://link.zhihu.com/?target=https%3A//github.com/BBuf/AI-Infra-Auto-Driven-SKILLS) 这里的profile的skills也迎来了一些更新，主要是profile把prefill/extend以及decode做了更加明显的区分，让采样点完全对齐，这样对比kernel就是真正的时间线上的完全可比了，不会出现错位导致给出错误结论的情况。另外把vLLM的torch compile里面涉及到的pattern全部更新到skills里面了，这样使用这个profile skills的时候基本不会漏掉当前各个框架里面的kernel fuse机会。我在sglang代码里面也更新到了最新的状态，你更新sglang的skills就可以用了。prompt还是类似这样：

请使用 $sglang-sota-performance、$llm-torch-profiler-analysis 和 $h100，基于 AI-Infra-Auto-Driven-SKILLS 里的 sgl-cookbook / llm-serving-auto-benchmark cookbook 模型配置，系统性地让 4 卡 H100 范围内可运行的模型在 SGLang 上达到目标环境下的最佳性能。

目标：
1. 先扫描 cookbook 中所有 LLM 模型配置，筛选出在单机 4x H100 范围内理论可运行的模型。
2. 为这些模型建立一个进度表，包含：模型名、推荐精度/量化、预计 GPU 数、SGLang/vLLM/TensorRT-LLM 支持情况、当前状态、artifact 路径、是否需要 patch、PR 链接。
## 3. 对每个可运行模型执行 $sglang-sota-performance 流程：

   - 分别让 SGLang、vLLM、TensorRT-LLM 搜索自己的最佳部署命令；
   - 在同一模型、同一 tokenizer、同一精度/量化、同一 H100 GPU 数下公平 benchmark；
   - workload 和 SLA 使用 $llm-serving-auto-benchmark 里的默认两个数据集场景，不要临时替换成更容易的数据集；
   - 输出三框架最佳部署命令和性能对比；
   - 如果 SGLang 比最佳框架慢超过稳定噪声阈值，默认 1%，必须对 SGLang 最佳命令做 torch profiler；
   - 同时必须使用 $llm-torch-profiler-analysis 对领先的 vLLM 和/或 TensorRT-LLM 最佳命令采集 profiler，至少采集当前最佳框架；如果 vLLM 和 TensorRT-LLM 都明显领先 SGLang，则两者都要采集；
   - 使用 SGLang、vLLM、TensorRT-LLM 的 kernel table、overlap-opportunity table、fuse-pattern table 做横向对比，定位 SGLang 落后的具体原因；
   - 基于 profiler 证据 patch SGLang，不能只改 benchmark 参数；
   - 如果一个 patch 只能解决部分差距，可以继续提出和实现多个最小化 patch，直到 SGLang 达到当前环境下的 SOTA、进入噪声范围，或明确剩余瓶颈暂时无法安全修复；
   - patch 后重跑真实模型 benchmark/profile，确认 SGLang 是否达到该模型在当前环境下的 SOTA。
4. 全程使用真实模型运行验证，不允许只用已有 trace 或 mock 数据证明功能。
5. 每个模型都要保存完整 artifacts：启动命令、benchmark 命令、版本信息、日志、JSONL 结果、SGLang/vLLM/TensorRT-LLM profile trace、分析报告、before/after 对比。
6. 注意不要泄露 HF_TOKEN 或任何 secret 到日志、PR、artifact 报告里。
## 7. GPU 使用和清理规则：

   - 默认只使用 H100 机器的前 4 张物理 GPU，也就是 GPU 0,1,2,3；后 4 张 GPU 4,5,6,7 默认留给其他人，不要使用，除非用户明确授权。
   - 所有 GPU 相关任务开始前，必须检查 `nvidia-smi` 和相关进程，确认目标 GPU 上没有其他用户进程干扰。如果发现 GPU 0-3 上已有其他用户进程，不能混跑 benchmark/profile，需要暂停、选择前 4 卡中真正空闲的 GPU，或向用户报告。
   - 每次启动服务时显式设置 `CUDA_VISIBLE_DEVICES`，并在 artifact 中记录物理 GPU id、`CUDA_VISIBLE_DEVICES`、框架内可见 GPU 映射关系。
   - 每完成一个模型后，必须清理该模型相关服务进程、benchmark 进程、profile 进程、显存占用、临时文件和可安全删除的模型权重缓存。
   - 所有 GPU 相关任务结束后，必须再次检查 GPU 占用，确认只有非本任务/非本人进程仍然保留，且本任务进程已全部退出。
   - 只能清理自己启动的进程，不能 kill 其他用户进程。
8. 如果需要修改 SGLang 代码，请保持 patch 最小化，添加必要测试。每个模型完成 patch 后，都先以 draft PR 的方式提交，不要直接创建 ready-for-review PR，也不要自动合并。
9. 如果任务太大，不要一次性跑完所有模型。先完成模型清单和优先级排序，然后从最有代表性的 1-2 个模型开始跑完整闭环。每完成一个模型，就更新进度表。

请先不要直接跑长时间 benchmark。第一步先做：
- 读取 cookbook 配置；
- 生成 4x H100 可运行模型清单；
- 确认 auto benchmark 默认两个数据集场景具体是什么；
- 设计批次执行计划；
- 给出第一个建议验证模型和原因；
- 然后开始执行第一个模型的真实三框架搜索与对比。

除非遇到会影响公平性、资源安全、GPU 占用隔离、模型缓存清理或需要用户选择的关键分歧，否则你可以自主决定 batch 顺序、artifact 命名和合理的搜索预算，并持续推进。

----------------------------------分割线-------------------------------------

 这篇是对 2026 年 1 月 17 日蚂蚁开源 x SGLang Meetup 中「蚂蚁 Theta 面向 DeepSeek 系列模型的深度优化和实践」这个分享的回放解读。原始 slides 讲的是一整套 H20-96G 上部署 DeepSeek-R1/V3/V3.1/V3.2 的工程优化，这里我尽量把每一页背后的 SGLang PR、DeepEP/DeepGEMM/FlashMLA 代码路径和实现细节串起来。
 
0x0. 前言

![](https://pic3.zhimg.com/v2-4173d734942803ec0460db6daa626d7a_r.jpg)这次分享的主角是蚂蚁 Theta 团队在 H20-96G 上做 DeepSeek 系列模型推理优化的实践。它不是单点 kernel 优化，而是从部署形态、Prefill、Decode、MoE 通信、Expert Load Balance、投机解码、观测诊断，到 DeepSeek-V3.2 DSA 支持的一整套方案。

我读完 slides 和公开 PR 后的感觉是，这套优化真正有意思的地方不在某一个 trick，而在它把 H20 的硬件特性吃得很细：H20 算力弱于 H800，但显存容量、带宽、NVLink 都不差，所以 Prefill 和 Decode 不能按一个固定套路去做，必须拆开部署，再按瓶颈分别优化。

![](https://pica.zhimg.com/v2-dc5f900fc9dacba3a7cd7b4008488ace_r.jpg)分享嘉宾张天雨（墨纭）是蚂蚁 Theta 推理云 DeepSeek 系列模型的迭代负责人。从公开 PR 看，这次 slides 里的不少优化都能在 SGLang 和蚂蚁 fork 的 PR 里找到对应实现。一个很重要的入口是 AntGroup 这个部署汇总 PR：[Deploying DeepSeek-R1 on H20-96G with SGLang: Best Practices](https://link.zhihu.com/?target=https%3A//github.com/antgroup/sglang/pull/4)。它不是为了 merge，而是把复现实验的镜像、启动参数、profile 链接和相关 PR 都放在一起，后面很多线索都是从这里展开的。

这套优化也对应 LMSYS 上的那篇博客：[Together with SGLang: Best Practices for Serving DeepSeek-R1 on H20-96G](https://link.zhihu.com/?target=https%3A//www.lmsys.org/blog/2025-09-26-sglang-ant-group/)。博客里把 H20 的挑战、Prefill/Decode 分离、FP8 FlashMLA、SwapAB、SBO、Expert Affinity EPLB、DeepXTrace 这些点按生产部署视角串了一遍；这篇文章则主要沿着 slides 和 PR 代码，把实现细节展开。

![](https://pic3.zhimg.com/v2-05aa258ba81b128c3f585721262a0346_r.jpg)Slides 的目录分成四块：Challenges、Methodology、Evaluation & Conclusion、DeepSeek V3.2。下面我也按这个顺序来讲，但重点会放在 Methodology 里面的代码实现。

0x1. H20-96G 的约束

![](https://picx.zhimg.com/v2-1b4fd280d4e8c5be1315eb436cdc54e9_r.jpg)这页先把 H20 和 H800 的硬件差异摆出来。H20-96G 相比 H800-80G 的核心特点是：

- FP8 / BF16 峰值算力只有 H800 的大约 15%；
- 显存容量 96GB，比 H800 的 80GB 更大；
- 显存带宽 4000GB/s，比 H800 的 3352GB/s 更高；
- NVLink 带宽 900GB/s，比 H800 的 400GB/s 高很多；
- RDMA 网卡带宽只有 H800 的一半。所以它不是「全面更弱」的卡，而是一张很偏科的卡。算力弱，但是显存和单机互联条件不错。这个偏科直接决定了后面的部署策略：

- Prefill 阶段更吃 attention、长上下文和 TTFT，需要控制单请求延迟；
- Decode 阶段更吃小 batch 下的 MoE、跨卡通信和 TPOT，需要控制每 token 的稳定延迟；
- 跨节点 RDMA 是短板，能留在节点内 NVLink 的东西尽量留在节点内；
- 显存够大，可以把 Decode 做成更大的 DP/EP 形态，换更小的故障域和更好的吞吐。
0x2. Prefill/Decode 分离

![](https://picx.zhimg.com/v2-07cb8d76412540ca9da703aba7748d0d_r.jpg)
![](https://picx.zhimg.com/v2-f841ea043a88ed70ee30999ee603dae7_r.jpg)这里的部署策略是典型的 PD disaggregation：

- Prefill 使用 TP8。目标是满足 TTFT 约束，并且 Prefill 节点可以按流量弹性扩缩。
- Decode 使用 DP16 + EP16。H20-96G 显存更大，NVLink 带宽也高，比较适合把 Decode 的注意力做 DP，把 MoE 做 EP，减少不必要的 TP 通信。Ant 的复现 PR 里给了非常具体的启动参数。Prefill 侧大致是：

```text
PYTHONUNBUFFERED=1 \
SGL_CHUNKED_PREFIX_CACHE_THRESHOLD=0 \
python3 -m sglang.launch_server \
  --model-path /path/to/DeepSeek-R1 \
  --disaggregation-mode prefill \
  --tp-size 8 \
  --attention-backend fa3 \
  --chunked-prefill-size 16384 \
  --quantization fp8 \
  --kv-cache-dtype fp8_e4m3
```


Decode 侧的关键参数是：

```text
PYTHONUNBUFFERED=1 \
SGL_ENABLE_JIT_DEEPGEMM=1 \
SGLANG_DEEPEP_NUM_MAX_DISPATCH_TOKENS_PER_RANK=96 \
ENABLE_SWAPAB=1 \
python3 -m sglang.launch_server \
  --model-path /path/to/DeepSeek-R1 \
  --disaggregation-mode decode \
  --attention-backend flashmla \
  --nnodes 2 \
  --tp-size 16 \
  --dp-size 16 \
  --enable-dp-attention \
  --moe-dense-tp-size 1 \
  --enable-deepep-moe \
  --enable-dp-lm-head \
  --cuda-graph-max-bs 48 \
  --speculative-algorithm NEXTN \
  --speculative-num-steps 1 \
  --speculative-eagle-topk 1 \
  --speculative-num-draft-tokens 2 \
  --init-expert-location /root/expert_workload.json \
  --moe-a2a-backend deepep \
  --deepep-mode low_latency_overlap \
  --enable-single-batch-overlap
```


这组参数基本把后面的优化都串起来了：Prefill 侧有 `fa3`、chunked prefix、TP scattered input；Decode 侧有 `flashmla`、DP attention、DeepEP low latency、SwapAB、SBO、Expert location 初始化和 NEXTN/Eagle。

0x3. Prefill 优化

![](https://picx.zhimg.com/v2-a7f056a5ec9d08704db42143f5ba12a3_r.jpg)Prefill 这页列了三个主要瓶颈：

- TP 通信后紧跟 RMSNorm 和 `qkv_a`，原始路径里很多算子在处理完整 hidden；
- chunked prefix 下，MLA/MHA 的选择并不总是 MLA 更优；
- MoE 计算量虽然更小，但下投影的延迟不合理。对应的公开 PR 主要是这三个：

- [#10568 Opt tp: tp attn support tp reduce scattered input](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10568)
- [#10953 Opt MHA chunked prefix: merge prefix and extend kv cache to run mha once](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10953)
- [#10567 Opt fused triton moe: add tma for down proj kernel](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10567)
0x3.1 TP Reduce Scatter + RMSNorm + qkv_a
PR [#10568](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10568) 的核心很直接：原来是

embed/mlp all reduce + RMSNorm + fused_qkv_a_proj_with_mqa

优化后变成：

embed/mlp reduce scatter + RMSNorm + fused_qkv_a_proj_with_mqa + all gather

为什么这样能省？因为在 TP8 下，`RMSNorm` 和 `fused_qkv_a_proj_with_mqa` 原来要处理完整 hidden，现在先 reduce-scatter，每张卡只处理 1/8 的 token 分片。后面再 all-gather 的时候，最后一维已经从 hidden size 7168 变成了 `(q_lora_rank + kv_lora_rank + qk_rope_head_dim)`，也就是 `1536 + 512 + 64`，通信量明显小了。

PR 里的 16K chunked prefill profile 数据很有代表性：

- `fused_qkv_a_proj_with_mqa` 从 205.1ms 降到 26.14ms；
- 通信总延迟从 267.1ms 降到 249.63ms；
- `RMSNorm` 从 82.303ms 降到 43.398ms；
- 输入长度 1000/2000/4000/4096 下，请求吞吐分别从 12.82/6.52/2.49/2.41 req/s 提到 14.22/7.33/2.72/2.63 req/s。当前 SGLang 代码里，这个优化由 `--enable-attn-tp-input-scattered` 控制。`AttnTpContext` 会检查一组约束，只有 DeepSeek MLA 这类 `q_lora_rank` 不为空、TP 大于 1、没有 DP attention、没有 MoE A2A、没有 EAGLE3 等条件满足时才启用：

```python
class AttnTpContext:
    def init_context(self, q_lora_rank, is_nsa):
        self.allow_input_scattered = (
            get_global_server_args().enable_attn_tp_input_scattered
            and (_is_cuda or _is_npu)
            and q_lora_rank is not None
            and not is_nsa
            and get_tensor_model_parallel_world_size() > 1
            and not is_dp_attention_enabled()
            and get_moe_a2a_backend().is_none()
            and not enable_moe_dense_fully_dp()
            and get_global_server_args().disable_piecewise_cuda_graph
            and get_global_server_args().speculative_algorithm != "EAGLE3"
        )

    def use_input_scattered(self, forward_batch: ForwardBatch):
        return (
            self.allow_input_scattered
            and forward_batch.forward_mode.is_extend()
            and not forward_batch.forward_mode.is_target_verify()
            and not forward_batch.forward_mode.is_draft_extend()
            and forward_batch.input_ids is not None
            and not forward_batch.can_run_tbo
        )
```


后面 attention 真正需要完整 hidden 时，再通过 `fetch_hidden_states()` 做一次 TP all-gather：

```python
def fetch_hidden_states(self):
    if self.hidden_states_ is not None:
        return self.hidden_states_
    self.hidden_states_ = self.hidden_states_local
    if get_attn_tp_context().input_scattered:
        self.hidden_states_ = self.tp_all_gather_hidden_states(
            self.hidden_states_, self.forward_batch
        )
    return self.hidden_states_
```


这个优化属于「不改变数学，只改变中间张量放在哪个时刻变完整」的类型，收益也正来自这个时序调整。

0x3.2 Chunked Prefix 下的 MHA One-Shot
PR [#10953](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10953) 解决的是另一个 Prefill 问题：DeepSeek 的 MLA 在长上下文上很香，但 chunked prefix cache 下面，如果 prefix 和 extend 分开跑 MHA，再用 `merge_state` 合并，中间会有多次拷贝、类型转换和额外 attention 调用。这个 PR 的策略是：当 `seq_lens <= 128K` 时，把 prefix KV 和 extend KV 合起来，只跑一次 `attn_mha`。

PR 里建议直接通过环境变量切到 MHA 路径：

export SGL_CHUNKED_PREFIX_CACHE_THRESHOLD=0

当前代码里，attention backend handler 会在 `fa3`、`flashinfer`、`flashmla` 这些 backend 上判断是否能走 `MHA_ONE_SHOT`：

```python
MHA_ONE_SHOT_SUPPORTED_BACKENDS = ["fa3", "flashinfer", "flashmla"]

def _support_mha_one_shot(attn, forward_batch, backend_name):
    attn_supported = backend_name in MHA_ONE_SHOT_SUPPORTED_BACKENDS
    sum_seq_lens = (
        sum(forward_batch.seq_lens_cpu) if forward_batch.seq_lens_cpu is not None else 0
    )
    return attn_supported and sum_seq_lens <= forward_batch.get_max_chunk_capacity()

def _handle_attention_backend(attn, forward_batch, backend_name):
    ...
    if forward_batch.forward_mode.is_extend_without_speculative():
        if _support_mha_one_shot(attn, forward_batch, backend_name):
            return AttnForwardMethod.MHA_ONE_SHOT
        return AttnForwardMethod.MHA_CHUNKED_KV
    else:
        return _dispatch_mla_subtype(attn, forward_batch)
```


forward_mha.py` 里把三种路径说得很清楚：

# 1. forward_normal: AttnForwardMethod.MHA
#    use multi-head attention with empty kv cache
#
# 2. forward_normal_one_shot: AttnForwardMethod.MHA_ONE_SHOT
#    use multi-head attention with short kv prefix length
#    the kv latent vectors are fetched from memory pool,
#    with combined kv_indices of prefix part and extended part
#
# 3. forward_normal_chunked_kv: AttnForwardMethod.MHA_CHUNKED_KV
#    multiple phases of multi-head attention with chunked kv cache
#    acc_o_i, acc_lse_i = merge_state(...)

这个 PR 的 benchmark 也很说明问题。在一个 prefix/extend 交错的例子里：

- BF16 下 MLA 是 117us，优化前 MHA chunked KV 是 193us，MHA merged KV 是 101us；
- FP8 下 MLA 是 373us，其中包含 244us 的 FP8 KV cache cast；MHA chunked KV 是 227us，MHA merged KV 是 125us。所以这页 slides 里说「MLA vs MHA tuning optional by seq len」并不是泛泛而谈。短一些、能塞进 one-shot 的时候，MHA 反而更便宜。

0x3.3 FusedMoE Down Projection TMA
这部分我之前单独写过一篇：[SGLang 优化Triton FusedMoE 的一个新技巧](https://zhuanlan.zhihu.com/SGLang%20%E4%BC%98%E5%8C%96Triton%20FusedMoE%20%E7%9A%84%E4%B8%80%E4%B8%AA%E6%96%B0%E6%8A%80%E5%B7%A7%E2%80%8B.md)。这里直接沿用那篇的主体思路。

在 H20(96GB) TP8 prefill 性能分析时，作者发现一个很奇怪的现象：每层第二个 MoE，也就是 down projection 的 Fused Triton MoE，延迟竟然和第一个 up projection 差不多。但 down projection 的权重数据量和计算量只有 up projection 的一半，这显然不合理。

PR [#10567](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10567) 对这个问题做了几个优化：

- 优化 FP8 block quant 下 `b_scale` 的读取和计算；
- 基于 TMA 重构 down projection 的输入 A 和权重 B 访问；
- 用真实推理过程采集到的 `topk_ids` 做 tuning；
- up projection 和 down projection 分别加载不同的 tuned config。PR 给出的关键数字是：down projection 的计算利用率从 <strong>45.20% 提升到 81.12%</strong>，8K tokens 场景下 100 次采样的平均延迟从 <strong>2.430ms 降到 1.435ms</strong>。

真实 topk tuning 的流程也很实用。先在推理过程中存下每层的 `topk_ids`：

# DeepseekV2MoE::forward_normal
if hidden_states.shape[0] == 16384 and get_tensor_model_parallel_rank() == 0:

```text
    topk_ids_dir = xxxx
    if not hasattr(self, "save_idx"):
        self.save_idx = 0
    if self.save_idx <= 1:
        torch.save(
            topk_output.topk_ids,
            f"{topk_ids_dir}/topk_idx_layer{self.layer_id}_idx{self.save_idx}.pt",
        )
    self.save_idx += 1
```


然后用 `tuning_fused_moe_triton_sep.py` 对真实分布做 tuning：

```text
python benchmark/kernels/fused_moe_triton/tuning_fused_moe_triton_sep.py \
    --model $model_path \
    --tp-size 8 \
    --dtype fp8_w8a8 \
    --topk-ids-dir ${topk_ids_dir} \
    --tune
```


这会生成两套 config，一套给 up projection，一套给 down projection，后者文件名带 `_down`。

当前 SGLang 主线代码已经挪到了 `moe_runner/triton_utils` 下面。核心逻辑是 `_prepare_fused_moe_run` 同时拿普通 config 和 down config，然后从 down config 里取 `USE_TMA`：

config, (down_config, _) = try_get_optimal_moe_config(
    w1.shape,

```text
    (w2.shape[0], w2.shape[1], w2.shape[2] - padded_size),
    topk_ids.shape[1],
    config_dtype,
    num_tokens,
    block_shape=block_shape,
    per_channel_quant=per_channel_quant,
    return_down_config=True,
)
down_moe_use_tma = (
    _down_moe_use_tma()
    and down_config is not None
    and down_config.pop("USE_TMA", False)
)
```


如果启用 TMA，up projection 的输出会按 down projection 想要的顺序写好：

```text
invoke_fused_moe_kernel(
    hidden_states,
    w1,
    ...,
    config,
    ...,
    c_sorted=down_moe_use_tma,
)
```


随后 down projection 的 kernel 调用会把输入 A 和权重 B 都交给 TMA descriptor 路径：

```text
invoke_fused_moe_kernel(
    intermediate_cache2,
    w2,
    ...,
    down_config or config,
    ...,
    a_use_tma=down_moe_use_tma,
    b_use_tma=down_moe_use_tma,
)
```


这就是这页 slides 里「MoE down_proj with TMA, tuned configs」背后的关键。不是单纯加一个 TMA flag，而是先用真实 expert 分布做 tuning，再让 up kernel 的输出布局服务于 down kernel 的 TMA 访问。

![](https://picx.zhimg.com/v2-5250dca260475888de18d45e953f0ccb_r.jpg)Prefill 评测这页的提升也和前面的三类优化能对上：输入越长，attention 和 MoE 在 TTFT 里的占比越大，所以收益越明显。Slides 给出的整体提升是：

- 1K 输入提升 34%；
- 2K 输入提升 45%；
- 4K 输入提升 68%。
0x4. Decode 优化一：SwapAB GEMM

![](https://pic3.zhimg.com/v2-8bcaa68f150b5604c89f86897363e30c_r.jpg)Decode 的 MoE 和 Prefill 不一样。Prefill 往往 token 多，GEMM 的 M 比较大；Decode 是小 batch，每次进 MoE 的 token 数很少。Hopper WGMMA 的 `block_m` 常见粒度是 64，当实际 M 小于 64 时，会做很多无效计算。

这页 slides 说的 SwapAB，本质就是把原来 GEMM 里的小 M 维映射到 WGMMA 更舒服的维度上。DeepGEMM 侧对应 PR 是 [deepseek-ai/DeepGEMM#192](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepGEMM/pull/192)，标题就是 `support swapAB for m_grouped_fp8_gemm_nt_masked`。PR 描述里写得很直白：

- 对 `BLOCK_M = 32` 或 `M % 64 < 32` 的情况收益明显；
- 做法是 `Swap A B: WGMMA::wgmma(desc_b, desc_a, accum, k)`；
- H20 上 `BLOCK_N=256` 是一个重要配置；
- 通过 `export ENABLE_SWAPAB=1` 开启。SGLang 主线里也有对应实现链路：

- [#15712 Add SwapAB Optimization for triton fused_moe_kernel on SM90](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/15712)
- [#16723 Rework Add SwapAB Optimization for triton fused_moe_kernel on SM90](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/16723)
- [#17133 Optimize fused moe configs for H20 & H20-3E based on swapab](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/17133)
- [#17965 Triton TP MoE Dpsk V3/Qwen3 Coder with SwapAB](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/17965)当前 Triton FusedMoE kernel 里，是否启用 SwapAB 的判断非常克制：

# swap_ab benefits SM90 GPUs (H20, H100, H200, etc.) for certain block shapes.
@functools.lru_cache(maxsize=8)

```python
def should_enable_swap_ab(
    BLOCK_SIZE_M: int,
    BLOCK_SIZE_N: int,
```

) -> bool:

```text
    if not _is_cuda or is_batch_invariant_mode_enabled():
        return False

    return is_sm90_supported() and BLOCK_SIZE_M < 64 and BLOCK_SIZE_N >= 64
```


也就是说，只有 SM90 且 `BLOCK_SIZE_M < 64`、`BLOCK_SIZE_N >= 64` 时才走这条路。进入 kernel 后，accumulator 的 shape 会反过来：

if swap_ab:

```text
    accumulator = tl.zeros((BLOCK_SIZE_N, BLOCK_SIZE_M), dtype=tl.float32)
else:
    accumulator = tl.zeros((BLOCK_SIZE_M, BLOCK_SIZE_N), dtype=tl.float32)
```


FP8 dot 前，A/B 和 scale 也会交换：

if swap_ab:

```text
    a, b = tl.trans(b, (1, 0)), tl.trans(a, (1, 0))
    a_scale, b_scale = b_scale, a_scale
```

...
accumulator += tl.dot(a, b) * a_scale[:, None] * b_scale[None, :]

最后再把 accumulator 转置回来写出：

if swap_ab:
    accumulator = tl.trans(accumulator, (1, 0))

这个实现很短，但它背后的点很关键：Decode 小 batch 下，不要让实际很小的 token 维硬贴着 WGMMA 的 M 维跑。把 A/B 互换后，小 M 的浪费会少很多。

PR [#17965](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/17965) 里给了 H200 上的端到端数据。DeepSeek-V3.1 TP8 下，2048 tokens decode 从 18.790s 降到 17.074s，速度从 109.00 token/s 提到 119.95 token/s，差不多 8% 的提升。Qwen3 Coder 的 spec decode 场景里也从 172.27 token/s 提到 186.87 token/s。

0x4.1 Decode Attention：FP8 FlashMLA
Decode 启动参数里用的是 `--attention-backend flashmla`，Ant 的汇总 PR 也把 [deepseek-ai/FlashMLA#82](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/FlashMLA/pull/82) 单独列为 FP8 MLA 相关优化。这个 PR 的主题是新的 FP8 MLA pipeline。

它和之前的 BF16 / FP8 MLA 相比，主要做了几件事：

- 使用 WGMMA FP8，Q 和 KV 都走 FP8 dtype；
- 减少 shared memory 占用，重新组织 `sP0/sP1/sVt0/sVt1` 做 ping-pong；
- 对 TMA copy 和 WGMMA 之间的 pipeline 做更细粒度调度；
- 对 transposed V 重建 pipeline，用 4 个 named barriers 在 4 个 buffer 间切换；
- 用 128-bit STSM/LDSM 在 `rP` 和 `sP` 之间搬数据；
- 细粒度 QK tiles 让 ROPE 可以用 BF16 算，从而修掉之前 FP8 路径的精度问题。代码层面主要新增了 `csrc/sm90/kernels/splitkv_mla_fp8.cu`，同时改了 `traits.h`、`utils.h`、`fp8_transpose_v.h` 和 `flash_mla_interface.py`。这几个文件对应的就是 kernel traits、FP8 transposed V、SM90 工具函数和 Python 入口。

PR 给的 H20 数据里，cache length=8196、head_num=64 时，batch size 32/48/64/128 下，新 FP8 MLA 相比 BF16 MLA 的提升分别是 69%/62%/62%/74%，相比之前 FP8 PR 也还有约 5% 的提升。Decode 侧小 batch 的 MoE 之外，attention backend 这条线也很重要，否则 MoE 优化完以后瓶颈会很快转移到 MLA。

0x5. Decode 优化二：为什么不用 TBO
这页在解释为什么 H20 Decode 上 Two-Batch Overlap(TBO) 不理想。原因有两个：

- Hopper WGMMA 的 `block_m` 通常是 64，小 batch Decode 下 MLP GEMM 会有冗余计算；
- TBO 要在 batch 足够大时才容易转正收益，但 H20 算力弱，batch 大了以后 TPOT/ITL 的 SLA 又容易炸。所以 slides 里说 TBO 不适合这个在线服务场景。公开实现对应到 [#9660 Single Batch Overlap for MoE Models](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/9660)。这个 PR 的 Motivation 和 slides 几乎是一致的：小 batch 时 TBO 的正收益不够稳定，需要一个对单 batch 也有效的 overlap。

0x6. Decode 优化三：SBO

![](https://pic4.zhimg.com/v2-832523e8650c2f11f6c2c082d5f9fea9_r.jpg)SBO 做了两个 overlap：

- Shared Expert 计算和 Dispatch Recv 通信 overlap；
- Down GEMM 计算和 Combine Send 通信 overlap。这条链路涉及三个仓库：

- SGLang 集成 PR：[sgl-project/sglang#9660](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/9660)
- DeepEP 通信侧 PR：[deepseek-ai/DeepEP#390](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/pull/390)，SGLang PR 正文里也提到了后续 DeepEP [#483](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/pull/483)
- DeepGEMM 计算侧 PR：[deepseek-ai/DeepGEMM#183](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepGEMM/pull/183)，SGLang PR 正文里也提到了 `sgl-project/DeepGEMM#14`Down GEMM 和 Combine Send 的 overlap 是一个 producer-consumer 模型：每个 local expert 按 `block_m` token 粒度分配 signal。Down GEMM 算完某个 `block_m` 后用 atomic 更新 signal；Combine Send 轮询 signal，达到 threshold 后就把对应 token 发出去。

当前 SGLang 的 `single_batch_overlap.py` 负责计算 overlap 参数。这里有几个关键字段：

@dataclass

```text
class CombineOverlapArgs:
    # this "overlap" flag means overlapping with down gemm
    overlap: bool
    stream: torch.cuda.Stream
    wait_event: torch.cuda.Event
    num_sms: Optional[int] = None
    signal: Optional[torch.Tensor] = None
    block_m: Optional[int] = 64
    threshold: Optional[int] = 0
```


@dataclass

```cpp
class DownGemmOverlapArgs:
    num_sms: int
    signal: torch.Tensor
    start_event: torch.cuda.Event
```


compute_overlap_args` 会把 SM 分成通信和计算两部分，Hopper 上默认通信用 3 个 SM，剩下给 DeepGEMM：

if envs.SGLANG_DEEPEP_LL_COMBINE_SEND_NUM_SMS.is_set():

```text
    communicate_num_sms = envs.SGLANG_DEEPEP_LL_COMBINE_SEND_NUM_SMS.get()
else:
    communicate_num_sms = 32 if is_blackwell() else 3
compute_num_sms = total_num_sms - communicate_num_sms
```


如果启用 Down GEMM + Combine Send overlap，就创建 signal，并把 signal 同时传给 combine 和 down gemm：

```text
combine_signal_size = num_local_experts * (
    (num_tokens_static + MIN_BLOCK_M - 1) // MIN_BLOCK_M
)
combine_signal = torch.zeros(
    combine_signal_size, dtype=torch.int32, device=hidden_states.device
)

down_gemm_overlap_args = DownGemmOverlapArgs(
    signal=combine_signal,
    start_event=combine_wait_event,
    num_sms=compute_num_sms,
)
```

combine_overlap_args.overlap = True
combine_overlap_args.signal = combine_signal
combine_overlap_args.threshold = compute_num_sms

在 `DeepseekV2MoE` 里，SBO 是通过 hook 接入 DeepEP dispatcher 的。Dispatch 后计算 overlap args，并分别塞给 dispatcher 和 experts runner：

```python
def _post_dispatch_hook(dispatcher: BaseDispatcher, dispatch_output: DispatchOutput):
    combine_overlap_args, down_gemm_overlap_args, meta_overlap_args = (
        compute_overlap_args(dispatch_output, self.alt_stream)
    )
    dispatcher.set_overlap_args(
        combine_overlap_args=combine_overlap_args,
        meta_overlap_args=meta_overlap_args,
    )
    self.experts.set_overlap_args(
        down_gemm_overlap_args=down_gemm_overlap_args,
        meta_overlap_args=meta_overlap_args,
    )
```


DeepEP combine 侧会把这些参数传给 `low_latency_combine`：

```text
overlap_args_dict = dict(
    overlap=overlap_args.overlap,
    packed_recv_count=self.packed_recv_count,
    comp_signal=overlap_args.signal,
    block_m=meta_overlap_args["block_m"],
    threshold=meta_overlap_args["threshold"],
    num_sms=overlap_args.num_sms,
)
```


combined_hidden_states, event, hook = buffer.low_latency_combine(

```text
    x=hidden_states,
    topk_idx=topk_ids,
    topk_weights=topk_weights,
    handle=self.handle,
    async_finish=not self.return_recv_hook,
    return_recv_hook=self.return_recv_hook,
    **overlap_args_dict,
)
```


DeepGEMM runner 侧则会从 signal GEMM 的返回值里拿到动态 `block_m` 和 `threshold`，再写回 `meta_overlap_args`，供 combine 使用：

```text
deep_gemm_return_value = deep_gemm_wrapper.grouped_gemm_nt_f8f8bf16_masked(
    (down_input, down_input_scale),
    (w2_weight, w2_scale),
    down_output,
    masked_m,
    expected_m,
    **gemm_overlap_args_dict,
)
meta_overlap_args = running_state.get("meta_overlap_args", None)
```

if meta_overlap_args is not None:

```text
    block_m, threshold = deep_gemm_return_value
    meta_overlap_args["block_m"] = block_m
    meta_overlap_args["threshold"] = threshold
```


DeepEP PR [#390](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/pull/390) 里对应的是 `low_latency_dispatch` 记录 token 的 `src_rank`，以及 `internode_ll::combine` 在 overlap 模式下减少 SM、轮询 signal、发送 token、写 finish flag。DeepGEMM PR [#183](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepGEMM/pull/183) 里对应的是 `m_grouped_fp8_gemm_nt_signal`、`SM90FP8SignalGemm1D2DRuntime`，以及 kernel 在算完对应 `block_m` 后 `atomicAdd` 写 signal。

PR [#9660](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/9660) 的端到端评测是 5 节点、每节点 8 张 H20，Prefill TP8，Decode DP_Attn16 + EP16，输入 4096、输出 1536。bs 32 下输出吞吐从约 6667 tok/s 提到 7111/7169 tok/s，请求吞吐从 4.34 req/s 提到 4.63/4.67 req/s，平均 ITL 从 73.1ms 降到 67ms 左右。这个收益对在线 Decode 很实在。

0x7. Expert Affinity EPLB

![](https://picx.zhimg.com/v2-c145ba6208a057420ee4b321b26a634f_r.jpg)DeepSeek 这类 MoE 模型的 Expert Load Balance 不只是「每张卡算力均衡」的问题。标准 EPLB 会尽量把 expert 的计算负载打平，但如果经常一起被激活的 experts 被放到了不同节点，就会制造更多跨节点通信。H20 的 RDMA 带宽又是短板，这个问题就会被放大。

AntGroup 的 [#2 feat: Add Expert Affinity Aware EPLB algorithm](https://link.zhihu.com/?target=https%3A//github.com/antgroup/sglang/pull/2) 正是做这件事。它在已有 expert load tracking 的基础上，进一步记录每次 iteration 激活的 top-k expert groups，计算 expert co-activation 的 affinity matrix，然后在 EPLB 负载均衡后再根据 affinity 调整放置，尽量把经常一起出现的 experts 放到同一个节点。

PR 新增的 `comm_matrix_process.py` 很短：

```python
def compute_expert_co_occurrence_matrix(history_data, num_experts):
    history_data = history_data.cpu().numpy()
    num_samples, num_layers, top_k = history_data.shape
    expert_co_occurrence = np.zeros(
        (num_layers, num_experts, num_experts), dtype=np.int64
    )

    for sample_idx in range(num_samples):
        for layer_idx in range(num_layers):
            experts = history_data[sample_idx, layer_idx]
            if (-1 in experts) or (len(set(experts)) < top_k):
                continue
            for i in range(top_k):
                for j in range(i + 1, top_k):
                    expert_i = experts[i]
                    expert_j = experts[j]
                    if expert_i < num_experts and expert_j < num_experts:
                        expert_co_occurrence[layer_idx, expert_i, expert_j] += 1
                        expert_co_occurrence[layer_idx, expert_j, expert_i] += 1
    return torch.tensor(expert_co_occurrence, dtype=torch.int64)

def generate_comm_matrix(history_data, num_experts):
    if history_data.numel() == 0:
        return None
    co_occurrence = compute_expert_co_occurrence_matrix(history_data, num_experts)
    comm_matrix = co_occurrence.float()
    comm_matrix = comm_matrix / comm_matrix.max()
    return comm_matrix
```


也就是把同一 token 的 top-k experts 两两计数，再归一化成通信矩阵。

数据来源在 DeepEP dispatcher。PR 在 `dispatch_a` 里记录 `topk_idx`：

if topk_idx.numel() > 0:

```text
    get_global_expert_distribution_recorder().record_topk_ids(topk_idx)
else:
    logger.warning("topk_idx is empty in DeepEP low latency dispatch.")
```


放置优化的核心是 `optimize_group_placement`。它先把 physical experts 分 group，构造 group-to-node 映射，再用每个 group 的 leader expert 去查 communication cost。后面会尝试交换不同节点上的 group，只要 swap 能降低跨节点通信 cost，就执行：

if best_gain > 0 and best_swap:

```text
    node1, g1_idx, node2, g2_idx = best_swap
    g1 = node_groups[node1][g1_idx]
    g2 = node_groups[node2][g2_idx]

    node_groups[node1][g1_idx] = g2
    node_groups[node2][g2_idx] = g1

    for offset in range(group_size):
        idx1 = g1 * group_size + offset
        idx2 = g2 * group_size + offset
        optimized_pphy2log[layer, idx1], optimized_pphy2log[layer, idx2] = \
            optimized_pphy2log[layer, idx2].item(), optimized_pphy2log[layer, idx1].item()

    improved = True
```


这个 PR 给出的 benchmark 里，batch 1536/2048 时，Expert-Affinity Aware EPLB 相比 vanilla EPLB 的 P90-TPOT 从 84ms 左右降到 81ms 左右，P95-ITL 从 100ms 左右降到 97ms 左右。PR 里写的是相对标准 EPLB 额外约 5% 提升。

还有一个相关 PR 是 [sgl-project/sglang#8529](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/8529)，做的是 EPLB async rebalance。它通过后台线程广播 `logical_count`、计算 `ExpertLocationMetadata`，再用 TP barrier 和 gloo CPU signal 保证所有 rank 原子切换 expert location。这和 affinity placement 是互补关系：一个优化放置策略，一个优化 rebalance 的执行方式。

0x8. Hierarchical Dispatch

![](https://pic2.zhimg.com/v2-17819533ef8c3cc1f575a37d29237b07_r.jpg)这页 slides 讲的是 Hierarchical Low-latency Dispatch：原始低延迟 dispatch 是所有 rank 直接走 inter-node RDMA，高流量 RDMA 会把延迟打高；hierarchical dispatch 的想法是先跨节点 RDMA 做一级转发，再在节点内通过 NVLink 做二级转发。结合前面 H20 的硬件特性，这个方向非常自然，RDMA 是短板，NVLink 是长板。

不过这页我没有找到对应的公开 PR。这里我扫了 `sgl-project/sglang`、`antgroup/sglang`、`deepseek-ai/DeepEP`、DeepGEMM 相关仓库，按 `Hierarchical Dispatch`、`RDMA-NVLink`、`hierarchical dispatch`、`low_latency_dispatch` 等关键词找了一遍，没有找到和 slides 这页完全对应的公开实现。

目前公开代码里能对上的基础路径是 SGLang 的 DeepEP low-latency dispatcher，也就是 Decode 侧 `--moe-a2a-backend deepep --deepep-mode low_latency_overlap` 这条路。核心调用还在 `token_dispatcher/deepep.py`：

```text
DeepEPBuffer.set_dispatch_mode_as_low_latency()
return DeepEPBuffer.get_deepep_buffer(
    self.group,
    self.hidden_size,
    self.params_bytes,
    self.deepep_mode,
    self.num_max_dispatch_tokens_per_rank,
    self.num_experts,
)
```


如果后续这页对应的代码公开，我会优先看两个位置：

- DeepEP 的 low-latency dispatch/combine kernel，尤其是 inter-node 和 intra-node 的分层路由；
- SGLang `token_dispatcher/deepep.py` 里 dispatch handle 的组织方式，以及是否出现 node-local relay 或 NVLink second-stage dispatch。这里不硬编 PR。公开信息能确认的是方向和瓶颈，不能确认具体实现已经开放。

0x9. Simple Eagle

![](https://picx.zhimg.com/v2-f5e2596e190b142ee30bb58374a73ec5_r.jpg)Slides 里的 Simple Eagle 说了两个问题：

- 原始 NEXTN/Eagle-2 有一些 prepare invalid ops；
- draft-extend 不在 CUDA Graph 里，导致 decode 的图捕获和 replay 不够干净。公开 PR 里，比较接近这页的是这一串：

- [#11398 Beta spec-overlap for EAGLE](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11398)
- [#11434 move eagle draft post process to cuda graph](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11434)
- [#11643 Abstraction for spec worker and code cleanup](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11643)
- [#11653 Fix 1-step draft model forward](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11653)
- [#12443 spec-overlap supporting DP-ATTN/PD-disaggregation/NPU graph](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12443)PR [#11398](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11398) 引入了 beta EAGLE v2，用 `SGLANG_ENABLE_SPEC_V2=1` 开启。它的初始测试里，Llama3.1 8B + EAGLE 的速度从 246.80 token/s 提到 273.43 token/s。

当前 `eagle_worker_v2.py` 的 decode 路径已经比较像 slides 里说的「verify + draft extend」流水：

with self.draft_worker.draft_tp_context(
    self.draft_worker.draft_runner.tp_group
), speculative_moe_backend_context(), speculative_moe_a2a_backend_context():
    verify_input: EagleVerifyInput = self.draft_worker.draft(model_worker_batch)

assert verify_input.is_verify_input()
model_worker_batch.spec_info = verify_input
batch_output = self.verify(model_worker_batch)

with self.draft_worker.draft_tp_context(
    self.draft_worker.draft_runner.tp_group
), speculative_moe_backend_context(), speculative_moe_a2a_backend_context():

```text
    self.draft_worker._draft_extend_for_decode(model_worker_batch, batch_output)
return batch_output
```


PR [#11434](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11434) 则把 draft post-processing 移进 CUDA Graph，并把 tree-building 工具整理到 `eagle_utils.py`。现在的 `EAGLEDraftExtendCudaGraphRunner` 会为 draft extend 准备静态输入和 batch sizes：

```python
class EAGLEDraftExtendCudaGraphRunner:
    def __init__(self, eagle_worker: EAGLEWorker, ...):
        ...
        self.forward_mode = ForwardMode.DRAFT_EXTEND_V2
        self.graphs = {}
        self.output_buffers = {}
        self.capture_bs, self.compile_bs = get_batch_sizes_to_capture(model_runner)

        self.num_tokens_per_bs = self.speculative_num_steps + 1
        self.max_bs = max(self.capture_bs)
        self.max_num_token = self.max_bs * self.num_tokens_per_bs

        self.draft_extend_attn_backend.init_cuda_graph_state(
            self.max_bs, self.max_num_token
        )
```


这类优化的收益不一定体现在单个算子耗时上，而是减少 decode loop 里每步的 Python/prepare/graph 外碎片。对小 batch decode 来说，这些碎片也会变成可见 TPOT。

0xA. DeepXTrace

![](https://picx.zhimg.com/v2-63164d16318d01697189e40fd04bb2e3_r.jpg)这页讲的是观测。MoE 分布式推理最烦的一类问题是「慢 rank」：你看到的是某个 dispatch/combine 变慢，但真正原因可能是发送端算慢、接收端热点、网络链路问题，或者三者混在一起。

Ant 开源了 [DeepXTrace](https://link.zhihu.com/?target=https%3A//github.com/antgroup/DeepXTrace)，README 里对它的定位是：通过给 DeepEP/MC2 这类通信库打 probe，低开销定位 MoE 分布式环境中的 slow ranks。它分两部分：

- MoE COMM Metrics Probe：在通信算子里采集诊断指标；
- DeepXTrace Metrics Analysis：把各 rank 的指标聚合成 latency matrix，再做异常分析和可视化。它支持三类 slowdown：

- Comp-Slow：发送端因为 Attention/MoE 等计算慢，导致 send 晚发；
- Mixed-Slow：接收端或热点 expert 导致 recv 行为异常，或者网络 incast；
- Comm-Slow：通信链路本身慢。DeepXTrace 的核心视角是构造一个 `N x N` 的矩阵 `M`，其中 `Mij` 表示 `rank_i` 等 `rank_j` 的延迟。比如 Dispatch 矩阵里某一列明显偏高，通常说明这一列对应的 rank 是瓶颈来源。这个视角比只看单 rank 日志好很多，因为 MoE 通信的问题往往是「我慢，是因为我在等别人」。

README 里给的 DeepEP LL mode 接入方式大致是：

```text
_diagnose = ds.Diagnose(group=group, enable_async=True)
_diagnose.start_async_diagnose()

dispatch_wait_recv_cost_stats = _diagnose.get_stats_ll_stats_tensor()[0]
_buffer.low_latency_dispatch(
    hidden_states,
    topk_idx,
    num_max_dispatch_tokens_per_rank,
    num_experts,
    dispatch_wait_recv_cost_stats=dispatch_wait_recv_cost_stats,
    use_fp8=True,
)

combine_wait_recv_cost_stats = _diagnose.get_stats_ll_stats_tensor()[1]
_buffer.low_latency_combine(
    hidden_states,
    topk_idx,
    topk_weights,
    handle,
    combine_wait_recv_cost_stats=combine_wait_recv_cost_stats,
)
```


这也解释了为什么 slides 把它放在 Methodology 最后：前面的 SwapAB/SBO/EPLB/Dispatch 都是「怎么优化」，DeepXTrace 是「线上怎么知道哪里又坏了」。

0xB. Decode 评测和结论

![](https://pic2.zhimg.com/v2-1651ac08250f0e6fffd04916be7b0203_r.jpg)
![](https://picx.zhimg.com/v2-81043165e3c9f426beda7298f23a43bd_r.jpg)Decode 评测的配置是 input=4096、output=1536，Decode 侧 DP16 + EP16，开启 DP attention、MTP=(1,1,2) 之类的 decode 优化。Slides 给出的提升随着 batch 从小到大逐步变化：

- batch 32：提升 42%；
- batch 48：提升 32%；
- batch 64：提升 21%；
- batch 96：提升 12%。这和前面的优化方向也吻合。小 batch 时 SwapAB/SBO 对无效计算和通信等待的改善最明显；batch 变大后，GEMM 自身利用率上来，收益比例自然会下降。

![](https://picx.zhimg.com/v2-4a57838d215a7f9d10455fabc4d77f69_r.jpg)结论页里说 Ant 在 H20 上对 DeepSeek-R1/V3/V3.1 累积了比较完整的一套优化，Prefill 和 Decode 都做到了比较强的水平。公开入口主要有两个：

- AntGroup 的复现和汇总 PR：[antgroup/sglang#4](https://link.zhihu.com/?target=https%3A//github.com/antgroup/sglang/pull/4)
- 相关 SGLang/DeepEP/DeepGEMM/FlashMLA PR，也就是上面一路引用的那些。
0xC. DeepSeek-V3.2：DSA 带来的新问题

![](https://pic2.zhimg.com/v2-119f728d6e965ffed83cbe6fc6ae8723_r.jpg)
![](https://pic2.zhimg.com/v2-336e29f0e66ab1bc8cb0459d24bbe10b_r.jpg)DeepSeek-V3.2 的新变量是 DSA，也就是 Dynamic Sparse Attention。Slides 里把它拆成两个部分：

- Top-K Selector + Lightning Indexer，大约 0.85B 参数；
- Attention 由传统 MLA 的 `O(L^2)`，变成和选出的 sparse KV 数量相关的 `O(Lk)`。这个结构对长上下文是很有吸引力的，但工程实现上有几个麻烦：

- FlashMLA-DSA 对 `h_q` 有 multiple-of-64 的限制；
- Lightning Indexer 当时不支持 TP split；
- 如果用 DP attention，48.5K ISL 的 TTFT 会太高；
- 如果纯 TP8，H20 上 `h_q` padding 到 64 会带来 3 倍计算浪费，Indexer 不切权重还会有 7 倍计算浪费。也就是说，DSA 理论上减少 attention 复杂度，但新的 indexer 和 kernel 约束又把一部分收益吃掉了。

公开 PR 里，DeepSeek-V3.2 相关的几条比较关键：

- [#12065 support context parallel with deepseekv3.2-DSA](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12065)
- [#11892 DeepSeek-V3.2: Add Adaptive MHA Attention Pathway for Short-Sequence Prefill](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11892)
- [#12094 Fuse wk and weight_proj in Indexer for DeepSeekV3.2-FP4](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12094)
- [#17205 DeepSeekV3.2: optimize indexer weight_proj-mma performance](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/17205)
- [#16637 Overlap indexer weights_proj during dual_stream decode](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/16637)PR [#12065](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12065) 的思路是给 DSA prefill 引入 context parallel。以 TP=EP=4、DP=2 为例，每个 DP 接一个独立 request，embedding 后把 `(batch * seq_len, H)` 按 context parallel 切给 attention TP ranks。MoE 部分也吃切分后的 hidden，最后再 all-gather 回完整 hidden。

当前代码里开关是：

```python
def is_nsa_enable_prefill_cp():
    return get_global_server_args().enable_nsa_prefill_context_parallel
```


并支持两种切分模式：

```python
def is_nsa_prefill_cp_in_seq_split():
    return (
        is_nsa_enable_prefill_cp()
        and get_global_server_args().nsa_prefill_cp_mode == "in-seq-split"
    )

def is_nsa_prefill_cp_round_robin_split():
    return (
        is_nsa_enable_prefill_cp()
        and get_global_server_args().nsa_prefill_cp_mode == "round-robin-split"
    )
```


round-robin split 的注释写得很清楚，它不是简单把连续 token 分给不同 rank，而是按 `token_idx % cp_size` 做交错切分：

# token0, token1, token2, token3, token4, token5, ...
#
# dp_atten_tp0: token0, token4, token8,  token12, ...
# dp_atten_tp1: token1, token5, token9,  token13, ...
# dp_atten_tp2: token2, token6, token10, token14, ...
# dp_atten_tp3: token3, token7, token11, token15, ...

这样做是为了缓解 causal attention 下不同 rank 计算量不均的问题。普通连续切分里，前面的 rank 看历史 KV 少，后面的 rank 看历史 KV 多；交错后每个 rank 的 token 在序列上分布更均匀。

模型 forward 入口会准备 CP metadata：

if self.nsa_enable_prefill_cp:

```text
    if can_nsa_cp_split(len(input_ids), self.cp_size, self.use_nsa, forward_batch):
        forward_batch.attn_cp_metadata = prepare_context_parallel_metadata(
            len(input_ids),
            self.cp_rank,
            self.cp_size,
            forward_batch.seq_lens_cpu.tolist(),
        )
```


每层里，如果启用 NSA prefill CP，就换成 `NSACPLayerCommunicator`：

if self.nsa_enable_prefill_cp:

```text
    self.layer_communicator = NSACPLayerCommunicator(
        layer_scatter_modes=self.layer_scatter_modes,
        input_layernorm=self.input_layernorm,
        post_attention_layernorm=self.post_attention_layernorm,
        allow_reduce_scatter=True,
        is_last_layer=(
            is_nextn or (self.layer_id == self.config.num_hidden_layers - 1)
        ),
        qkv_latent_func=self.self_attn.prepare_qkv_latent,
    )
```


PR [#11892](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11892) 则对应 slides 里 Future Work 的「seq_len < 2K 用 masked MHA」。它的逻辑是：DeepSeek-V3.2 prefill 里如果所有长度都走 MLA，不一定最优。短序列下 MLA 的 compression/decompression 和 absorbed attention 开销不划算，MHA 更快。当前 NSA backend 会在 prefill 时根据长度、设备、dtype、chunk capacity 等条件决定是否走 MHA：

```python
def set_nsa_prefill_impl(self, forward_batch: Optional[ForwardBatch] = None):
    if forward_batch and forward_batch.forward_mode.is_extend_without_speculative():
        max_kv_len = forward_batch.seq_lens_cpu.max().item()
        sum_seq_lens = sum(forward_batch.seq_lens_cpu)
        device_sm = get_device_sm()

        self.use_mha = (
            (device_sm == 90 or (device_sm >= 100 and device_sm < 110))
            and max_kv_len
            <= envs.SGLANG_NSA_PREFILL_DENSE_ATTN_KV_LEN_THRESHOLD.get()
            and forward_batch.token_to_kv_pool.dtype
            in [torch.bfloat16, torch.float8_e4m3fn]
            and sum_seq_lens <= forward_batch.get_max_chunk_capacity()
            and (not is_nsa_enable_prefill_cp())
            and (forward_batch.hisparse_coordinator is None)
        )
    else:
        self.use_mha = False
```


PR [#12094](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12094) 和 [#17205](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/17205) 都是 Indexer 侧的优化。前者把 `wk` 和 `weight_proj` 在 FP4 模型里融合成一次 GEMM，后者把 `weights_proj` 的计算从 FP32 调整为 BF16 权重计算再把输出转回 FP32，解决 indexer 里相对耗时的 `weight_proj-mma`。

![](https://pic4.zhimg.com/v2-1f23209aef0fcd38068fae3d6f6ff4c5_r.jpg)Slides 给出的 DeepSeek-V3.2 Prefill 最终方案是：

- H20-141G 单机 8 卡：Attention-CP8，MoE-TP8，ISL=48.5K，TTFT=5s；
- H20-96G 两机 16 卡：PP2 * (Attention-CP8, MoE-TP8)，TTFT=3.1s。这里最关键的是把 attention 的 context parallel 和 MoE 的 TP 拆开看。Attention 需要按序列切，MoE 需要按 hidden/expert 组织；两者强行用同一个 parallel 维度，往往会让一边很别扭。

![](https://pic2.zhimg.com/v2-a6f2aa3a9ea2ee6796e62db02ee5b753_r.jpg)Future Work 里提了几件事：

- Operator：`seq_len < 2K` 时使用 masked MHA；
- Indexer：继续优化性能，并支持 TP；
- H20-96G PD：Prefill 用 `PP2 * (Attn-CP8, MoE-TP8)`，Decode 侧按 TPOT SLA 分两档；
- KV cache for DSA：Hierarchical Sparsification。其中 masked MHA 和一部分 Indexer 优化已经能在上面的公开 PR 里看到；Decode 侧 TP8 或 DP16/EP16 的 DeepSeek-V3.2 完整形态，看起来还在继续推进。

0xD. 小结
这次分享如果只看 slides，会觉得是很多优化点堆在一起。但把 PR 和代码串起来后，主线其实很清楚：

- 先承认 H20 的偏科：算力弱、显存/NVLink 强、RDMA 弱。
- 用 PD disaggregation 把 Prefill 和 Decode 的瓶颈拆开。
- Prefill 侧做 TP scattered input、MHA one-shot、MoE down projection TMA。
- Decode 侧围绕小 batch MoE 做 SwapAB 和 SBO。
- 通信侧用 Expert Affinity EPLB 减少跨节点通信，用 DeepXTrace 定位慢 rank。
- DeepSeek-V3.2 侧重新处理 DSA 带来的 CP、Indexer、MHA/MLA 选择问题。我觉得最值得借鉴的是两个习惯。第一，优化不是「看到一个 kernel 慢就调一个 kernel」，而是先把硬件约束和部署形态定下来，再决定 kernel、通信、调度各自要解决什么。第二，很多优化都用了真实线上分布，比如 MoE tuning 用真实 `topk_ids`，EPLB 用 co-activation matrix，这比随机 benchmark 更接近实际服务。

参考链接：

- AntGroup 复现汇总 PR：[https://github.com/antgroup/sglang/pull/4](https://link.zhihu.com/?target=https%3A//github.com/antgroup/sglang/pull/4)
- LMSYS Blog：[https://www.lmsys.org/blog/2025-09-26-sglang-ant-group/](https://link.zhihu.com/?target=https%3A//www.lmsys.org/blog/2025-09-26-sglang-ant-group/)
- Prefill TP scattered input：[https://github.com/sgl-project/sglang/pull/10568](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10568)
- Prefill MHA one-shot：[https://github.com/sgl-project/sglang/pull/10953](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10953)
- FusedMoE down projection TMA：[https://github.com/sgl-project/sglang/pull/10567](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/10567)
- SwapAB DeepGEMM：[https://github.com/deepseek-ai/DeepGEMM/pull/192](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepGEMM/pull/192)
- SGLang SwapAB rework：[https://github.com/sgl-project/sglang/pull/16723](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/16723)
- FP8 FlashMLA：[https://github.com/deepseek-ai/FlashMLA/pull/82](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/FlashMLA/pull/82)
- SBO in SGLang：[https://github.com/sgl-project/sglang/pull/9660](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/9660)
- SBO in DeepEP：[https://github.com/deepseek-ai/DeepEP/pull/390](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepEP/pull/390)
- SBO in DeepGEMM：[https://github.com/deepseek-ai/DeepGEMM/pull/183](https://link.zhihu.com/?target=https%3A//github.com/deepseek-ai/DeepGEMM/pull/183)
- Expert Affinity EPLB：[https://github.com/antgroup/sglang/pull/2](https://link.zhihu.com/?target=https%3A//github.com/antgroup/sglang/pull/2)
- EAGLE spec-overlap：[https://github.com/sgl-project/sglang/pull/11398](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11398)
- EAGLE draft post process CUDA Graph：[https://github.com/sgl-project/sglang/pull/11434](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11434)
- DeepXTrace：[https://github.com/antgroup/DeepXTrace](https://link.zhihu.com/?target=https%3A//github.com/antgroup/DeepXTrace)
- DeepSeek-V3.2 DSA CP：[https://github.com/sgl-project/sglang/pull/12065](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/12065)
- DeepSeek-V3.2 adaptive MHA：[https://github.com/sgl-project/sglang/pull/11892](https://link.zhihu.com/?target=https%3A//github.com/sgl-project/sglang/pull/11892)