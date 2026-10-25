# AI Infra 早报｜DSA 跨引擎共振：稀疏注意力进入省算力阶段，MX 量化接受精度验收

MiracleFarmsBRIEF · DAILY
**📅 2026-07-02**

> 同一天里，vLLM、TRT-LLM、TokenSpeed 各自独立实现 DSA 跨层索引器共享；SGLang、TRT-LLM 同期暴露 MXFP8/MXFP4 精度静默 bug。跨引擎同向共振说明 DSA 和 MX 量化正从各自探索进入行业共识阶段。

![image](asset/202833e098a8.jpg)

## 稀疏注意力｜跨层索引器复用成为跨引擎共识

DSA 架构的 lightning indexer 负责为每一层选择应关注的 KV block。问题在于，索引器在每层独立运行的开销占稀疏注意力总成本的显著比例。**三个引擎在同一天各自独立给出了几乎一致的解法——跨层复用 top-k 结果——说明 DSA 的瓶颈已经从"能不能跑"移到了"索引器太贵"。** vLLM [1] 的方案让"full"层运行完整索引器，"shared"层复用前一个 full 层的 top-k 结果，通过 use_index_cache 做 opt-in 开启。TensorRT-LLM [2] 实现了几乎一致的逻辑：full 层计算 indexer，shared 层跳过。TokenSpeed [3] 则从另一侧削减开销——将 GLM-5.x DSA 的 per-token KV-cache 占用减少约 56%，TP4 上下文容量直接翻倍。代价是层间依赖和 index cache 状态管理变得复杂，但当三个没有商量的团队解法高度收敛时，**DSA 在 Q2 解决了"能不能跑"，Q3 的主题就是"怎么跑得更省"。**

## MX 量化｜精度验收阶段的静默错误最难查

MX 格式（块级浮点，block-wise scale）理论精度高于 INT8/INT4，但其 weight scale 和 activation scale 的语义比传统 per-tensor / per-channel 量化复杂一个量级。SGLang [4] 今天的 bug 最具代表性：**RL 训练后的 MXFP8 权重更新让 logprob 差从 0.06 飙升到 3.83，引擎不报任何错误。** 根因是 MXFP8 scale 未在 update_weights_from_distributed 后正确恢复——权重更新了，scale 还是旧的，误差在静默中累积。SGLang [5] 暴露了 compressed-tensors WNA16 MoE 配置解析的断裂，TensorRT-LLM [6] 解决的 config group 解析和 weight_scale 展平问题落在同一个故障环节。**不 crash、不打 error log、但推理结果不可信——这类静默错误对生产环境的威胁远比显式 crash 更大。** 6/30 日报判断"量化进入精度校正阶段"的论据，在 MX 格式上得到了最集中的印证。块浮点需要的不是更多功能测试，而是一套精度回归体系：权重更新后验证 scale 一致性、配置解析的异常覆盖、以及不同量化方案混合加载的兼容性矩阵。

## 推测解码｜专用与通用方案走向分化

推测解码侧，**通用方案和专用方案正在明确分化。** vLLM 合并了 DeepSeek 官方的 DSpark 方案 [7]，支持 DeepSeek-V4 和 Qwen3-DSpark，专用推测路径的 draft-target 耦合更紧，命中率更高但可插拔性受限。通用方案侧，SGLang 修复了 EAGLE MTP 中 index_share 的幽灵 bug [8]——代码存在但从未生效，draft 模型的 DSA indexer 每一步都在重跑，意味着此前所有性能数字都低估了实际开销。同期 Ray 推出了 token 级请求生命周期追踪 [9]，PD 分离的 KV-aware 路由与缓存命中指标也在同步补全。**推测解码的验收标准正在从"能生成正确 token"升级为"draft 命中率可度量、indexer 复用真实生效、kernel 选择可自适应。"**

> 一句话结论：**DSA 跨层索引器复用是 2026 Q3 的确定性方向；MX 量化正经历 INT8 走过的那条精度验收曲线，静默错误的代价远大于显式 crash。**

更多完整证据和技术细节，请点击文末“阅读原文”。

## 参考

[1] vLLM #47269 Cross-layer lightning-indexer top-k sharing：https://github.com/vllm-project/vllm/pull/47269

[2] TensorRT-LLM #15574 Support DSA cross-layer indexer top-k sharing：https://github.com/NVIDIA/TensorRT-LLM/pull/15574

[3] TokenSpeed #554 Remove unnecessary DSA KV-cache for GLM-5.x：https://github.com/lightseekorg/tokenspeed/pull/554

[4] SGLang #28676 Fix DeepSeek V4 MXFP8 MoE weight update：https://github.com/sgl-project/sglang/pull/28676

[5] SGLang #29761 Fix compressed-tensors WNA16 MoE config parse：https://github.com/sgl-project/sglang/pull/29761

[6] TensorRT-LLM #15415 compressed-tensors fp8 config group resolution：https://github.com/NVIDIA/TensorRT-LLM/pull/15415

[7] vLLM #46995 Spec Decode DSpark：https://github.com/vllm-project/vllm/pull/46995

[8] SGLang #29654 Fix index_share_for_mtp_iteration being a no-op：https://github.com/sgl-project/sglang/pull/29654

[9] Ray #64327 Token-level request lifecycle tracking：https://github.com/ray-project/ray/pull/64327

[10] SGLang #29595 Enable FlashInfer autotune for spec draft：https://github.com/sgl-project/sglang/pull/29595

[11] Ray #64224 Pre-routing tokenization & KV cache aware routing：https://github.com/ray-project/ray/pull/64224

[12] Mooncake #2637 Complete Cache Hit Metrics for Memory and SSD Offload Tiers：https://github.com/kvcache-ai/Mooncake/pull/2637

[13] TensorRT-LLM #15525 WideEP FT mask-only EPLB reconfigure：https://github.com/NVIDIA/TensorRT-LLM/pull/15525

[14] TensorRT-LLM #13404 WideEP FT active_rank_mask for NVLink AlltoAll：https://github.com/NVIDIA/TensorRT-LLM/pull/13404

[15] Mooncake #2653 Fix skip inactive ranks in combine reduction loop：https://github.com/kvcache-ai/Mooncake/pull/2653

Less hype · more systems.

MiracleFarms · BRIEF · DAILY

---

> 原文链接：[AI Infra 早报｜DSA 跨引擎共振：稀疏注意力进入省算力阶段，MX 量化接受精度验收](https://mp.weixin.qq.com/s/fVdmc3MGbSX_KFqmPIa9XA)
