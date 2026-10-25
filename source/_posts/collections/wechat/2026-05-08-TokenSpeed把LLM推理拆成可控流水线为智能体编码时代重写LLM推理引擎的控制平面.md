---
title: TokenSpeed 把 LLM 推理拆成可控流水线，为智能体编码时代重写 LLM 推理引擎的控制平面
date: "2026-05-08 08:58:52"
updated: "2026-05-08 08:58:52"
layout: post
permalink: /collections/wechat/2026-05-08-TokenSpeed把LLM推理拆成可控流水线为智能体编码时代重写LLM推理引擎的控制平面/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 微信
  - LLM
source_url: https://mp.weixin.qq.com/s/vuGdWLUf1cELqnuOIZxtvQ
---


# TokenSpeed 把 LLM 推理拆成可控流水线，为智能体编码时代重写 LLM 推理引擎的控制平面

关键词：智能体推理、状态机调度、KV 缓存、MLA 内核、Blackwell 优化
大型语言模型推理的瓶颈，早已不只是“矩阵乘得够不够快”。
当 Claude Code、Codex、Cursor 等智能体编码系统从演示产品变成真实生产力工具，推理系统面对的流量形态也发生了根本变化：上下文动辄超过 50K tokens，对话跨越数十轮，工具调用、代码检索、补丁生成和反思修正不断交织。![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_01.png)TokenSpeed: A Speed-of-Light LLM Inference Engine for Agentic Workloads博客：https://lightseek.org/blog/lightseek-tokenspeed.html代码：https://github.com/lightseekorg/tokenspeed8000 字，阅读 35 分钟，播客 22 分钟相关推荐从 AITER 内核到 P/D 分离，把 AMD GPU 推理优化从"算子快"推进到"系统快"的轻量闭环项目 ATOM构建面向 LLM 的下一代记忆管理系统，开源项目 Hypatia：为大模型装上“结构化外脑”大模型修硬件Bug，北大提出HWE-Bench，揭示智能体芯片设计的真实能力与致命短板
LightSeek 官方博客指出，为了承载这种增长，业界正在建设需要数十吉瓦电力的数据中心，并投入数千亿美元级别资本。
在这样的规模下，每块 GPU 吞吐提升几个百分点，都可能转化为巨大的算力节省。TokenSpeed 的野心正在于此：它不是只优化某个 kernel，而是从建模、调度、KV 资源、安全复用、内核系统到请求入口，重新组织一套面向 agentic workloads 的 LLM 推理引擎。![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_02.png)这组对比图揭示了TokenSpeed在MoE大模型推理中的显著性能优势：横轴为用户请求Token速率（代表并发压力），纵轴为GPU处理效率（Token/分钟，千级），覆盖Attn TP4/TP8与MoE TP/EP四种并行配置。TokenSpeed在所有场景下均优于TensorRT-LLM，尤其在MoE专家并行（EP）与高并发场景下差距被放大，说明其针对MoE的专家路由与跨设备通信做了深度优化，有效降低了调度开销。同时，Attn TP4的整体效率显著高于TP8，反映出过高的张量并行度会引入显著通信瓶颈，抵消算力收益；而TokenSpeed在TP8配置下仍能维持性能优势，体现了其并行优化的健壮性。整体而言，TokenSpeed实现了更优的“负载-效率”权衡，能在高用户并发下保持更高的GPU利用率，更适配智能体工作负载的低延迟、高吞吐需求。![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_03.png)这张图展示了Kimi K2.5 MoE大模型在NVIDIA B200 GPU上，针对智能体（Agentic）工作负载的推理性能对比。横轴为用户侧单请求Token速率（Token/Sec/User，代表服务延迟与并发压力），纵轴为GPU侧Token处理效率（Token/Min/GPU，代表硬件利用率），核心对比了自研推理系统（TS）与NVIDIA TensorRT-LLM（TRTLLM）在张量并行（TP）、专家并行（EP）、数据并行（DP）等不同策略下的表现。 从趋势看，所有配置均呈现典型的“负载-效率”权衡：用户请求速率越高（服务延迟越低），GPU因调度与通信开销导致的处理效率越低。关键结论包括：其一，自研TS框架整体显著优于TRTLLM，尤其是TP4配置低负载下GPU效率可达1500k Token/Min/GPU，远超TRTLLM同配置的1100k，体现了针对MoE模型与智能体负载的深度优化优势；其二，MoE专家并行（EP）始终优于MoE张量并行（TP），所有配置中EP曲线均在TP曲线上方，说明EP更适配MoE的专家路由特性，减少了跨设备通信开销；其三，并行度并非越高越好，TP8效率低于TP4，DP8表现最差，说明过高并行度的通信延迟抵消了算力收益，智能体负载下低并行度+EP的组合更具优势。更多信息见：https://github.com/lightseekorg/tokenspeed/tree/main/test/agentic_benchmark![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_04.png)这两张图表对比了TensorRT-LLM MLA与TokenSpeed MLA（开源OSS/二进制版）在大模型MLA（Multi-Head Latent Attention）机制下的Prefill与Decode阶段延迟性能。 Prefill阶段（上图）覆盖5种业务场景，TokenSpeed二进制版（Binary）延迟始终最优，在use case 3中较TensorRT-LLM降低约20%，展现了定制化算子优化的优势；TokenSpeed开源版（OSS）在部分场景延迟略高于TensorRT-LLM，或反映出其开源版本的优化尚未完全释放。Decode阶段（下图）聚焦不同批大小（4/8/16），TokenSpeed的延迟优势被进一步放大：批大小16时，TensorRT-LLM延迟达338.8us，而TokenSpeed仅146.3us，降幅超56%，说明其针对MLA解码的核心瓶颈（如注意力计算、归约操作）进行了深度优化，尤其适配高并发场景的低延迟需求。整体来看，TokenSpeed的MLA实现，尤其是二进制优化版，在Prefill与Decode阶段均展现出显著的性能优势，为大模型推理提供了更高效的底层实现方案。unsetunset本文目录unsetunset
一、快速上手与最小使用路径二、为什么智能体负载需要新的推理引擎三、架构总览：Python 执行平面与 C++控制平面的分工四、入口层：轻量 CLI 背后的异步请求主干五、请求主路径：从 tokenize 到调度器再回到用户六、C++状态机调度：TokenSpeed 最核心的系统设计七、KV 缓存：从张量缓存变成资源所有权系统八、MLA KV 布局：为长上下文与 FP8 缓存做结构化折中九、Attention 后端：按模型架构和硬件自动落位十、Kernel 系统：把异构硬件优化变成可注册、可解释、可覆盖的机制十一、MLA 性能优化：TokenSpeed 押注的 Blackwell 低延迟战场十二、性能预览：以 TPS/User 和 TPM/GPU 构造真实 Pareto 边界十三、PD 分离与服务拓扑：下一阶段的系统战场十四、协作生态与开源位置：站在 TensorRT-LLM 肩膀上继续推进十五、当前边界：预览版意味着什么结语：TokenSpeed 的本质是把推理性能问题系统化![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_05.jpg)交流加群请在 NeuralTalk 公众号后台回复：加群unsetunset一、快速上手与最小使用路径unsetunset
TokenSpeed 当前处于预览发布阶段。README 明确说明，该版本主要用于复现 Kimi K2.5 on B200 和 TokenSpeed MLA[1] on B200 的性能结果，仍在快速开发中，不建议直接用于生产部署。若要快速体验，官方推荐通过 runner 容器启动开发环境。

```bash
docker pull lightseekorg/tokenspeed-runner:latest
docker run -itd \
  --shm-size 32g \
  --gpus all \
  -v /raid/cache:/home/runner/.cache \
  --ipc=host \
  --network=host \
  --pid=host \
  --privileged \
  --name tokenspeed \
  lightseekorg/tokenspeed-runner:latest \
  /bin/bash
git clone https://github.com/lightseekorg/tokenspeed.git
cd tokenspeed
export PIP_BREAK_SYSTEM_PACKAGES=1
pip install -e "./python" --no-build-isolation
pip install -e tokenspeed-kernel/python/ --no-build-isolation
pip install -e tokenspeed-scheduler/
tokenspeed env
tokenspeed serve --help
```

最小服务启动命令如下：

```bash
tokenspeed serve openai/gpt-oss-20b \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1
```

如果要启动更接近官方性能预览的 Kimi K2.5 配置，文档给出了如下参数骨架：

```bash
tokenspeed serve nvidia/Kimi-K2.5-NVFP4 \
  --served-model-name kimi-k2.5 \
  --host 0.0.0.0 \
  --port 8000 \
  --trust-remote-code \
  --max-model-len 262144 \
  --kv-cache-dtype fp8 \
  --quantization nvfp4 \
  --tensor-parallel-size 4 \
  --enable-expert-parallel \
  --chunked-prefill-size 8192 \
  --max-num-seqs 256 \
  --attention-backend trtllm_mla \
  --moe-backend flashinfer_trtllm \
  --reasoning-parser kimi_k2 \
  --tool-call-parser kimi_k2
```

OpenAI 兼容客户端可以这样访问：from openai import OpenAI
client = OpenAI(api_key="EMPTY", base_url="http://localhost:8000/v1")
response = client.chat.completions.create(

```python
    model="kimi-k2.5",
    messages=[{"role": "user", "content": "Write a concise deployment checklist."}],
    max_tokens=256,
)
print(response.choices[0].message.content)
```

更多具体参数可参考：Getting Started[2]、Launching a Server[3]、Server Parameters[4]。unsetunset二、为什么智能体负载需要新的推理引擎unsetunset
传统 LLM serving 框架大多围绕“批量吞吐”和“通用聊天”优化。但 coding agent 的流量更像一场复杂的城市交通调度：有的请求携带超长上下文，有的请求只需要极短 decode，有的请求复用相同系统提示词和仓库上下文，有的请求在工具调用后马上进入下一轮。官方博客将这种场景称为 agentic-inference regime。
TokenSpeed 的设计目标就是从第一性原理出发服务这种负载。它强调：编译器支撑的 modeling mechanism，用于并行 placement 与 collective 自动生成；高性能 C++ scheduler；可由类型系统约束的安全 KV 资源复用；可插拔、分层的 kernel 系统，支持异构加速器；SMG[5] 集成的低开销 CPU 请求入口。
这意味着 TokenSpeed 并不是“又一个 vLLM 替代品”，也不是“TensorRT-LLM 的轻封装”。它更像是在回答一个更底层的问题：当智能体应用把 token 生产规模推到数据中心级别时，推理系统如何同时保证 GPU 吞吐、用户侧 TPS、长上下文复用和工程可迭代性？unsetunset三、架构总览：Python 执行平面与 C++控制平面的分工unsetunset
TokenSpeed 的核心思想可以概括为：Python 负责易用性和快速迭代，C++ 负责调度控制与资源正确性，kernel 子系统负责硬件相关性能。
README 中列出的核心组件包括：Modeling layer：local-SPMD 设计，通过模块边界 I/O placement annotation，让轻量静态编译器自动生成 collective communication；Scheduler：C++ 控制平面 + Python 执行平面，请求生命周期、KV cache 所有权、overlap timing 都由有限状态机表达；Kernels：分层、可插拔、集中注册的 kernel 系统；Entrypoint：SMG-integrated AsyncLLM，降低 CPU 侧请求处理开销。
其中最值得注意的是 scheduler 的分层：控制平面用 C++ 编写，并与类型系统结合，在编译期尽量约束 KV cache 状态转移和资源使用；执行平面用 Python 编写，以便研究者和工程师更快加入新模型、新特性、新实验。
这种分工类似“飞机驾驶舱与发动机舱”：控制逻辑必须稳定、可验证；执行逻辑又必须允许快速调整。unsetunset四、入口层：轻量 CLI 背后的异步请求主干unsetunset
TokenSpeed 对外暴露 tokenspeed serve、OpenAI-compatible HTTP server，以及 Python Engine.generate 接口。CLI 本身很薄，主要负责命令分发和延迟导入重量级模块。# 来源：python/tokenspeed/cli.py

```python
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="tokenspeed",
        description="TokenSpeed is a speed-of-light LLM inference engine.",
    )
    subparsers = parser.add_subparsers(dest="command")
    serve_parser = subparsers.add_parser(
        "serve",
        help="Launch the TokenSpeed inference server.",
    )
    if len(sys.argv) >= 2and sys.argv[1] == "serve":
        from tokenspeed.runtime.utils.server_args import ServerArgs
        ServerArgs.add_cli_args(serve_parser)
    serve_parser.set_defaults(func=_serve)
    args, extra_args = parser.parse_known_args()
    if args.command isNone:
        parser.print_help()
        sys.exit(1)
    args.func(args)
```

真正的主入口是 Engine。代码注释说明系统由 TokenizerManager、Scheduler 子进程和输出处理链路组成，进程间通过 ZMQ 通信。# 来源：python/tokenspeed/runtime/entrypoints/engine.py

```cpp
class Engine(EngineBase):
    """
    The entry point to the inference engine.
    - The engine consists of three components:
        1. TokenizerManager: Tokenizes the requests and sends them to the scheduler.
        2. Scheduler (subprocess): Receives requests from the Tokenizer Manager, schedules batches, forwards them, and sends the output tokens to the Detokenizer Manager.
        3. DetokenizerManager (subprocess): Detokenizes the output tokens and sends the result back to the Tokenizer Manager.
    Note:
    1. The HTTP server, Engine, and TokenizerManager both run in the main process.
    2. Inter-process communication is done through ICP (each process uses a different port) via the ZMQ library.
    """
```

在 Engine.generate 中，用户输入被封装成 GenerateReqInput，再根据是否流式返回进入不同路径。# 来源：python/tokenspeed/runtime/entrypoints/engine.py
obj = GenerateReqInput(

```text
    text=prompt,
    input_ids=input_ids,
    sampling_params=sampling_params,
    image_data=image_data,
    audio_data=audio_data,
    video_data=video_data,
    return_logprob=return_logprob,
    logprob_start_len=logprob_start_len,
    top_logprobs_num=top_logprobs_num,
    token_ids_logprob=token_ids_logprob,
    custom_logit_processor=custom_logit_processor,
    return_hidden_states=return_hidden_states,
    stream=stream,
    bootstrap_host=bootstrap_host,
    bootstrap_port=bootstrap_port,
    bootstrap_room=bootstrap_room,
)
```

if stream:

```text
    return self.llm.generate_stream(obj)
else:
    return self.llm.generate(obj)
```

同步 API 没有另写一套同步 IPC 客户端，而是通过 LLM 类桥接到后台 asyncio 事件循环：# 来源：python/tokenspeed/runtime/engine/llm.py

```python
def run(self, coro) -> Any:
    return asyncio.run_coroutine_threadsafe(coro, self._loop).result()
def generate(self, obj: GenerateReqInput) -> dict:
    asyncdef _one() -> dict:
        gen = self.async_llm.generate_request(obj)
        returnawait gen.__anext__()
    return self.run(_one())
def generate_stream(self, obj: GenerateReqInput) -> Iterator[dict]:
    q: queue.Queue[Any] = queue.Queue()
    asyncdef _drain() -> None:
        pending_exc: BaseException | None = None
        try:
            asyncfor item in self.async_llm.generate_request(obj):
                q.put(item)
        except BaseException as exc:
            pending_exc = exc
        finally:
            if pending_exc isnotNone:
                q.put(pending_exc)
            q.put(_STREAM_END)
    asyncio.run_coroutine_threadsafe(_drain(), self._loop)
    whileTrue:
        item = q.get()
        if item is _STREAM_END:
            return
        if isinstance(item, BaseException):
            raise item
        yield item
```

这层设计的价值在于：业务侧可以用同步接口，内部仍保持 AsyncLLM 单主干，避免同步/异步双路径导致状态分裂。unsetunset五、请求主路径：从 tokenize 到调度器再回到用户unsetunset
AsyncLLM 是主进程异步前端，拥有请求接入、请求状态、scheduler IPC 和输出分发循环。生成路径集中在 generate_request：# 来源：python/tokenspeed/runtime/engine/async_llm.py
asyncdef generate_request(
    self,
    obj: GenerateReqInput | EmbeddingReqInput,
):

```text
    created_time = time.time()
    self.auto_create_handle_loop()
    self.input_processor.validate_request(obj)
    obj.normalize_batch_and_arguments()
    asyncwith self.model_update_lock.reader_lock:
        is_single = obj.is_single
        if is_single:
            tokenized_obj = await self._tokenize_one_request(obj)
            self._send_one_request(obj, tokenized_obj, created_time)
            asyncfor response in self._wait_one_response(obj):
                yield response
        else:
            asyncfor response in self._handle_batch_request(obj, created_time):
                yield response
```

asyncdef _tokenize_one_request(
    self,
    obj: GenerateReqInput | EmbeddingReqInput,
) -> TokenizedGenerateReqInput | TokenizedEmbeddingReqInput:
    returnawait self.input_processor.tokenize_one_request(obj)
注意这里的 model_update_lock.reader_lock。它说明 TokenSpeed 把在线权重更新和请求生成纳入同一套并发控制，避免推理过程中模型权重被不安全地切换。
发送请求给 scheduler 的逻辑如下：# 来源：python/tokenspeed/runtime/engine/async_llm.py

```python
def _send_one_request(
    self,
    obj: GenerateReqInput | EmbeddingReqInput,
    tokenized_obj: TokenizedGenerateReqInput | TokenizedEmbeddingReqInput,
    created_time: float | None = None,
```

):

```text
    state = ReqState(
        RequestOutputCollector(),
        False,
        asyncio.Event(),
        obj,
        created_time=created_time,
        tokenized_time=tokenized_obj.created_time,
    )
    self.rid_to_state[obj.rid] = state
    self.engine_core_client.send_to_scheduler.send_pyobj(tokenized_obj)
```

整体链路可以概括为：HTTP/OpenAI/Python API
  → Engine.generate / async_generate
  → AsyncLLM.generate_request
  → InputProcessor.tokenize_one_request
  → EngineCoreClient.send_to_scheduler
  → C++ Scheduler 生成 ExecutionPlan
  → Python 执行 forward/cache op
  → 输出回到 AsyncLLM.handle_loop
  → OutputProcessor 唤醒对应 ReqState
  → stream 或 final response 返回用户
unsetunset六、C++状态机调度：TokenSpeed 最核心的系统设计unsetunset
TokenSpeed 官方博客特别强调：scheduler 将控制平面与执行平面解耦。控制平面由 C++ 有限状态机实现，并尽量通过类型系统保证 KV cache 状态转移、资源复用和生命周期管理的正确性。
代码中，请求状态不是简单的 waiting/running/finished，而是被拆成一组精细状态：// 来源：tokenspeed-scheduler/csrc/fsm/states.h

```cpp
// Put resources into each particular state
namespace tokenspeed::fsm {
using State = std::variant<Bootstrapping, Submitted, Prefetching, PrefetchDone, Aborting, Prefilling, PrefillDone,
                           Decoding, Draining, WritingBack, Retracting, Retracted, Finished>;
```

}  // namespace tokenspeed::fsm
这里的 std::variant 很关键。它意味着资源不再是挂在请求对象上的若干可空字段，而是和状态绑定。例如处于 Decoding 的请求拥有 decode 所需 KV allocator 和 req pool index；处于 WritingBack 的请求则持有 device/host node ref，用于保证异步写回期间对应页不会被提前释放。
调度器每轮生成一个 ExecutionPlan：// 来源：tokenspeed-scheduler/csrc/scheduler/execution_plan.h

```cpp
class ExecutionPlan {
public:
    template <typename OperationType>
    ExecutionPlan& With(OperationType operation) {
        operations_.emplace_back(operation);
        return *this;
    }
    template <typename OperationType>
    ExecutionPlan& With(std::vector<OperationType> ops) {
        for (auto& op : ops) {
            operations_.emplace_back(std::move(op));
        }
        return *this;
    }
    const std::vector<Operation>& Operations() const { return operations_; }
private:
    std::vector<Operation> operations_;
};
```

NextExecutionPlan 负责清理已完成请求、跳过正在 cache 操作中的请求，并从可调度候选中生成 forward/cache operation：// 来源：tokenspeed-scheduler/csrc/scheduler/scheduler.cpp
ExecutionPlan Scheduler::NextExecutionPlan() {

```cpp
    ExecutionPlan plan;
    std::vector<WriteBackOperation> write_back_ops;
    write_back_ops = std::move(newWriteBackOperation(requests_));
    std::erase_if(requests_, [](constauto& req """") { return req.second->template Is<fsm::Finished>(); });
    std::vector<Request*> candidates;
    for (auto& [id, req] : requests_) {
        if (!req->Is<fsm::Draining>() && !req->Is<fsm::Prefetching>() && !req->Is<fsm::Retracting>() &&
            !req->Is<fsm::WritingBack>()) {
            candidates.push_back(req.get());
        }
    }
    auto [fwd_ops, cache_ops] = newForwardOperation(candidates);
    plan.With(FlatForwardOperation{std::move(fwd_ops)});
    if (!write_back_ops.empty()) {
        plan.With(CacheOperation{FlatWriteBackOperation{write_back_ops}});
    }
    if (auto* lb = std::get_if<std::vector<LoadBackOperation>>(&cache_ops)) {
        if (!lb->empty()) {
            plan.With(CacheOperation{FlatLoadBackOperation{*lb}});
        }
    }
    return plan;
}
```

这就是 TokenSpeed 与许多 Python-first 调度器不同的地方：它不是靠约定和运行时检查维持资源正确性，而是让“请求现在处于什么状态、拥有什么资源、可以接受什么事件”成为控制系统的一部分。unsetunset七、KV 缓存：从张量缓存变成资源所有权系统unsetunset
在长上下文智能体场景中，KV cache 的价值极高。系统提示词、仓库上下文、工具描述和历史轨迹经常被重复使用。TokenSpeed 因此把 KV cache 当成 page 化资源来管理，并引入 device/host/L3 storage 等层级。
在 scheduler 侧，rolling hash 用于 page 粒度前缀匹配：// 来源：tokenspeed-scheduler/csrc/scheduler/scheduler.cpp

```cpp
std::vector<std::string> Scheduler::CalcRollingHash(const std::vector<std::int32_t>& input_tokens, bool apply_match) {
    conststd::int32_t page_size = config_.page_size;
    conststd::size_t num_pages = input_tokens.size() / page_size;
    std::vector<std::span<conststd::int32_t>> token_pages;
    token_pages.reserve(num_pages);
    for (std::size_t i = 0; i < num_pages; ++i) {
        token_pages.emplace_back(input_tokens.data() + i * page_size, page_size);
    }
    if (!apply_match) {
        return ComputePagedHashes(token_pages, "");
    }
    MatchResult result = kv_prefix_cache_.Match(token_pages);
    conststd::int32_t host_matched = result.host.DepthInPage();
    if (host_matched >= static_cast<std::int32_t>(num_pages)) {
        return {};
    }
    constauto& hashes = result.host.last_node->PageHashes();
    std::string prior = hashes.empty() ? std::string{} : hashes.back();
    return ComputePagedHashes(
        std::vector<std::span<conststd::int32_t>>(token_pages.begin() + host_matched, token_pages.end()), prior);
}
```

请求结束后，KV cache 也不是立刻释放，而是可能进入 host 写回。FinishEvent 会把已完成的 device KV 页插入 prefix cache；如果需要持久化到 host，则进入 Draining 状态。// 来源：tokenspeed-scheduler/csrc/fsm/forward_events.cpp

```cpp
template <typename ForwardStateT>
std::variant<Draining, Finished> FinishEvent::apply(ForwardStateT&& state) {
    auto full_paged_tokens = state.GetFullPagedTokens(true);
    std::vector<std::int32_t> prefix_pages = DevicePagesFromRoot(state.GetDeviceNode());
    std::int32_t alloc_count =
        static_cast<std::int32_t>(full_paged_tokens.size()) - static_cast<std::int32_t>(prefix_pages.size());
    auto local_allocator = std::move(state).TakeLocalKVAllocator();
    OwnedPages alloc_pages = local_allocator->TakeFirst(alloc_count);
    kv_prefix_cache_->Insert<ResourceType::Device>(full_paged_tokens, prefix_pages, std::move(alloc_pages),
                                                   page_hashes_);
    MatchResult match = kv_prefix_cache_->Match(full_paged_tokens);
    if (!disable_l2_cache_ && (match.device.DepthInPage() > match.host.DepthInPage())) {
        std::vector<TreeNode*> write_diff = match.NodesWithout<ResourceType::Host>();
        std::int32_t host_pages_num = 0;
        for (TreeNode* node : write_diff) {
            host_pages_num += node->Device().NumPages();
        }
        std::unique_ptr<HostNodeRef> temp_lock = std::make_unique<HostNodeRef>(match.host.last_node);
        if (!kv_prefix_cache_->EnsureCapacityByEvict<ResourceType::Host>(host_pages_num)) {
            return Finished{};
        }
        kv_prefix_cache_->AllocateResourceOfType<ResourceType::Host>(write_diff);
        return Draining{BuildWriteBackPairs(write_diff), std::move(device_node_ref), std::move(host_node_ref)};
    }
    return Finished{};
}
```

这段逻辑解释了为什么 TokenSpeed 要把生命周期拆得如此细：在业务语义上，请求已经结束；但在资源语义上，KV 页可能还在异步搬运。如果没有 Draining/WritingBack 这样的状态，cache 复用很容易发生竞态。unsetunset八、MLA KV 布局：为长上下文与 FP8 缓存做结构化折中unsetunset
TokenSpeed MLA 是官方博客重点强调的核心优化之一。项目单独提供 tokenspeed-mla 包，面向 NVIDIA Blackwell SM100/SM103，支持 MLA prefill、decode，以及 MLA K/V pack + FP8 quantize。
在 runtime 中，MLA KV pool 根据量化方式分配不同布局：# 来源：python/tokenspeed/runtime/layers/attention/kv_cache/mla.py
with memory_saver_adapter.region():
    # The padded page 0 is used for writing dummy outputs from padded tokens.

```text
    if self.quant_method == "per_token_head":
        self.kv_buffer = [
            (
                torch.zeros(
                    (self.size + self.page_size, 1, kv_lora_rank),
                    dtype=self.store_dtype,
                    device=device,
                ),
                torch.zeros(
                    (self.size + self.page_size, 1, 1),
                    dtype=torch.float32,
                    device=device,
                ),
                torch.zeros(
                    (self.size + self.page_size, 1, qk_rope_head_dim),
                    dtype=self.model_dtype,
                    device=device,
                ),
            )
            for _ in range(layer_num)
        ]
    else:
        self.kv_buffer = [
            torch.zeros(
                (self.size + self.page_size, 1, self.kv_cache_dim),
                dtype=self.store_dtype,
                device=device,
            )
            for _ in range(layer_num)
        ]
```

如果启用 per_token_head，KV 被拆成三部分：k_lora_cache：以 FP8 存储，降低显存压力；k_scale_cache：FP32 scale，保留量化恢复所需精度；k_rope_cache：使用模型 dtype，保证 RoPE 相关部分稳定。
写入 MLA KV buffer 时，TokenSpeed 会根据量化方式走不同路径：# 来源：python/tokenspeed/runtime/layers/attention/kv_cache/mla.py

```python
def set_mla_kv_buffer(
    self,
    layer: PagedAttention,
    loc: torch.Tensor,
    cache_k_nope: torch.Tensor,
    cache_k_rope: torch.Tensor,
```

):

```text
    layer_id = layer.layer_id
    if self.quant_method == "per_token_head":
        k_lora = cache_k_nope.float()
        k_rope = cache_k_rope.float()
        scale = k_lora.abs().amax(dim=-1, keepdim=True).clamp(1e-26) / 448.0
        k_lora = (k_lora / scale).to(torch.float8_e4m3fn)
        k_rope = (k_rope / scale).to(self.model_dtype)
        self.kv_buffer[layer_id][0][loc] = k_lora.view(self.store_dtype)
        self.kv_buffer[layer_id][1][loc] = scale
        self.kv_buffer[layer_id][2][loc] = k_rope
    else:
        if cache_k_nope.dtype != self.dtype:
            cache_k_nope = cache_k_nope.to(self.dtype)
            cache_k_rope = cache_k_rope.to(self.dtype)
        set_mla_kv_buffer_triton(
            self.kv_buffer[layer_id],
            loc,
            cache_k_nope,
            cache_k_rope,
            enable_pdl=pdl_enabled(),
        )
```

这说明 TokenSpeed 的 KV cache 不是一个简单 tensor，而是一种面向模型结构、量化策略、kernel 访问和跨层调度共同设计的内存布局。unsetunset九、Attention 后端：按模型架构和硬件自动落位unsetunset
TokenSpeed 的 attention registry 会根据模型架构和硬件平台选择默认 backend。MLA 在 Blackwell 上默认选择 trtllm_mla，在 Hopper 上默认选择 flashmla。# 来源：python/tokenspeed/runtime/layers/attention/registry.py

```python
def _get_default_backend_name(arch: AttentionArch) -> str:
    platform = current_platform()
    if arch == AttentionArch.MLA:
        if platform.is_blackwell:
            return"trtllm_mla"
        if platform.is_hopper:
            return"flashmla"
        return"trtllm_mla"
    else:
        return"mha"
def _get_backend_cls(name: str, arch: AttentionArch) -> type[AttentionBackend]:
    if name isNone:
        candidates = [_get_default_backend_name(arch)]
        for candidate in candidates:
            entry = _BACKEND_REGISTRY.get(candidate)
            if entry isnotNoneand arch in entry[0]:
                return entry[1]
        raise ValueError(
            f"No backend supports arch {arch}. Available: {list(_BACKEND_REGISTRY)}"
        )
```

创建 attention components 时，系统会先 profile 可用 KV cache 页数，再创建 backend 和 pool：# 来源：python/tokenspeed/runtime/layers/attention/registry.py
max_total_num_pages = profile_max_num_pages(
    config,
    gpu_id,
    server_args.mapping.world_size,
    server_args.gpu_memory_utilization,
    server_args.block_size,
    num_layers,
    gpu_memory,

```text
    world_group=server_args.mapping.world_group,
    draft_attn_config=draft_attn_config if draft_attn_config elseNone,
    draft_num_attention_layers=(
        draft_model_config.num_attention_layers if draft_attn_config elseNone
    ),
    cache_cell_size=profile_cache_cell_size,
)
```

max_num_tokens = _resolve_max_num_tokens(
    max_total_num_pages,
    server_args.block_size,
    server_args.max_total_tokens,
)
这体现出 TokenSpeed 的一个重要取舍：不是让用户手动理解所有底层细节，而是把硬件、模型结构、显存预算和 backend 选择集中到 runtime 的组件构造阶段。unsetunset十、Kernel 系统：把异构硬件优化变成可注册、可解释、可覆盖的机制unsetunset
官方博客强调 TokenSpeed kernel layer 将 kernel 从核心引擎中分离出来，作为一等模块化子系统。
tokenspeed-kernel README 也给出了清晰分层：public API → select_kernel → KernelRegistry → 各 op family 下的 Triton、Gluon、CuTe DSL、vendor wrapper、reference 实现。
Kernel 注册结构如下：# 来源：tokenspeed-kernel/python/tokenspeed_kernel/registry.py
@dataclass(frozen=True)

```text
class KernelSpec:
    """Complete specification of a registered kernel."""
    # Identity
    name: str
    family: str
    mode: str
    features: frozenset[str] = frozenset()
    solution: str = ""
    # Capabilities
    capability: CapabilityRequirement = field(default_factory=CapabilityRequirement)
    dtypes: frozenset[torch.dtype] = frozenset()
    traits: dict[str, frozenset[Any]] = field(default_factory=dict)
    # Selection metadata
    priority: int = int(Priority.PERFORMANT) + 2
    tags: frozenset[str] = frozenset()
```

选择逻辑会综合配置文件 override、context override、环境变量、平台能力、dtype、traits 和 objective：# 来源：tokenspeed-kernel/python/tokenspeed_kernel/selection.py

```python
def select_kernel(
    family: str,
    mode: str,
    dtype: torch.dtype,
    *,
    features: frozenset[str] | None = None,
    platform: PlatformInfo | None = None,
    objective: SelectionObjective = SelectionObjective.DEFAULT,
    traits: dict[str, Any] | None = None,
    override: str | None = None,
    expected_kernel_name: str | None = None,
```

) -> SelectedKernel:

```text
    platform = platform or current_platform()
    config_entry = _get_config_override(family, mode)
    if config_entry isnotNone:
        if override isNone:
            if config_entry.name:
                override = config_entry.name
            elif config_entry.solution:
                override = config_entry.solution
    env_key = f"TOKENSPEED_KERNEL_OVERRIDE_{family.upper()}_{mode.upper()}"
    env_override = os.environ.get(env_key)
    if env_override:
        override = env_override
    registry = KernelRegistry.get()
    cache_key = _make_cache_key(
        family, mode, dtype, platform.arch, objective, features, traits
    )
    if override isNone:
        cached = registry.cache_get(cache_key)
        if cached isnotNone:
            return cached
    if override:
        return _resolve_override(registry, family, mode, dtype, override, platform)
    candidates = registry.get_for_operator(
        family, mode, features=features, platform=platform, dtype=dtype
    )
    if traits:
        candidates = _filter_by_traits(candidates, traits)
    scored = _rank_by_objective(candidates, objective, platform, traits)
    winner = scored[0][0]
    impl = registry.get_impl(winner.name)
    result = SelectedKernel(name=winner.name, impl=impl)
    registry.cache_put(cache_key, result)
    return result
```

这套系统的价值是：当运行环境从 NVIDIA Blackwell 切到 Hopper、AMD，或者 shape/dtype 发生变化时，kernel 不必靠到处散落的 if-else 选择。它可以通过 registry、traits、priority、objective 和 override 被统一治理。unsetunset十一、MLA 性能优化：TokenSpeed 押注的 Blackwell 低延迟战场unsetunset
官方博客把 TokenSpeed MLA 作为核心优化之一。其目标不是泛泛地“支持 attention”，而是针对 coding agent 这种负载做极致优化：prefill 面向长 prefix KV cache；decode 面向 batch size 4、8、16 等 speculative decoding 常见场景；q_seqlen 通常很短；num_heads 在部分场景较小，Tensor Core 利用率容易不足。
TokenSpeed MLA decode 的关键优化，是把 query-sequence 轴折叠进 head 轴，让 q_seqlen 和 num_heads 共同填满 BMM1 的 M tile。README 中也写到，当 num_heads < 128 且 num_heads * q_seqlen <= 128 时，会启用 fold_sq，改善小 head 数下的 M 维利用率。
官方博客给出的性能预览称，在典型 decode 工作负载上，这种优化结合其他调优可相对 TensorRT-LLM MLA 接近减半延迟；binary prefill kernel 则使用 NVIDIA internal knobs 对 softmax 实现进行细调，在五类 coding-agent prefill 场景中超过 TensorRT-LLM MLA。需要注意的是，这些数字来自官方性能预览，且当前仓库仍处于 preview 状态。

```text
MLA decode benchmark 示例：python ./tokenspeed-mla/python/tokenspeed_mla/mla_decode_fp8.py \
  --batch_size 4 \
  --softmax_scale 0.07216882 \
  --page_size 64 \
  --seq_len_k 81920 \
  --in_dtype Float8E4M3FN \
  --out_dtype Float8E4M3FN \
  --seq_len_q 4 \
  --warmup_iterations 1 \
  --iterations 10 \
  --num_heads 16 \
  --skip_ref_check
Prefill benchmark 示例：python ./tokenspeed-mla/python/tokenspeed_mla/fmha.py \
  --is_causal \
  --bottom_right_align \
  --in_dtype Float8E4M3FN \
  --out_dtype Float8E4M3FN \
  --q_shape 1,8192,128,192 \
  --k_shape 1,8192,128,192 \
  --warmup_iterations 10 \
  --iterations 10 \
  --skip_ref_check
```

值得一提的是，官方博客还提到 TokenSpeed MLA 已被 vLLM 采用[6]。这说明它并不只是 TokenSpeed 自用优化，也可能成为更广泛推理生态中的底层能力。unsetunset十二、性能预览：以 TPS/User 和 TPM/GPU 构造真实 Pareto 边界unsetunset
TokenSpeed 官方博客没有只给单点吞吐数字，而是用更贴近 coding agent 的指标观察系统：![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_06.png)这张图展示了Kimi K2.5 MoE大模型在B200 GPU上，面向智能体工作负载的推理性能对比，横轴为用户侧单请求Token速率（越高代表服务延迟越低、并发压力越大），纵轴为GPU侧Token处理效率（越高代表硬件利用率越好）。所有配置均呈现典型的“负载-效率”权衡：用户请求速率越高，GPU因调度与通信开销导致的处理效率越低。自研推理框架TS整体显著优于TRTLLM，其TP4配置在低负载下GPU效率可达1500k Token/Min/GPU，远超TRTLLM同配置的1100k，体现了针对MoE模型与智能体负载的深度优化优势；同时，专家并行（EP）普遍优于张量并行（TP），过高并行度的通信延迟会抵消算力收益，说明低并行度+EP的组合更适配智能体工作负载的性能需求。x 轴：TPS/User，即单用户 tokens per second，作为延迟体验指标；y 轴：TPM/GPU，即每 GPU tokens per minute，作为吞吐效率指标；通过 sweeping concurrency 画出 Pareto curve。
这种评估方式比“最大吞吐”更适合智能体推理。因为 coding agent 不是离线批处理系统，用户体验高度依赖生成速度。官方给出的目标是在保持每用户 TPS 下限的同时最大化每 GPU TPM，常见下限为 70 TPS，有时要求 200 TPS 或更高。
博客称，在 Kimi K2.5、NVIDIA B200、非 PD disaggregation 的部署设置中，对于 coding agents 常见的 70 TPS/User 以上区间，最佳配置为 Attention TP4 + MoE TP4。TokenSpeed 在整个 Pareto frontier 上优于 TensorRT-LLM：batch size 1 的最低延迟场景约快 9%，在 100 TPS/User 附近约有 11% 更高吞吐。
这些数字的重要性不在于“9% 或 11% 是否听起来足够大”，而在于数据中心规模效应。官方博客开头指出，当 token 生成规模已经大到需要数十吉瓦级数据中心支撑时，每 GPU 效率的小幅提升都会被整个生产 fleet 放大。unsetunset十三、PD 分离与服务拓扑：下一阶段的系统战场unsetunset
官方博客说明，当前性能预览聚焦 single、non-disaggregated deployment；PD disaggregation 正在 cleanup，后续会单独发布文章。仓库代码中已经能看到相关雏形，例如 MiniLoadBalancer 在 prefill server 和 decode server 之间选择配对：# 来源：python/tokenspeed/runtime/pd/mini_lb.py

```python
def select_pair_round_robin(self):
    assert len(self.prefill_configs) > 0, "No prefill servers available"
    assert len(self.decode_servers) > 0, "No decode servers available"
    prefill_config = self.prefill_configs[self.prefill_index]
    self.prefill_index = (self.prefill_index + 1) % len(self.prefill_configs)
    decode_server = self.decode_servers[self.decode_index]
    self.decode_index = (self.decode_index + 1) % len(self.decode_servers)
    return prefill_config.url, prefill_config.bootstrap_port, decode_server
```

Prefill 和 decode 的资源画像完全不同：prefill 是长上下文大块计算，decode 是严格延迟敏感的小步迭代。PD 分离的潜在价值，就是让不同硬件池、不同并发策略和不同缓存传输机制服务不同阶段，而不是把所有请求都塞进同一个调度模型。unsetunset十四、协作生态与开源位置：站在 TensorRT-LLM 肩膀上继续推进unsetunset
官方博客的致谢部分很重要，因为它揭示了 TokenSpeed 的生态位置。TokenSpeed 由 LightSeek Foundation 牵头，并与 NVIDIA DevTech、AMD Triton、Qwen Inference、Together AI、Mooncake、LongCat、FluentLLM、EvalScope[7]、NVIDIA Dynamo 等团队协作开发。
博客也明确感谢 TensorRT-LLM maintainers，称 TensorRT-LLM 设定了他们衡量自己的性能标杆，TokenSpeed 的许多优化也受到 TensorRT-LLM 启发，包括 one-CUDA-graph optimization 和 forward pass optimizations。同时，它也感谢 Triton、FluentLLM、vLLM、EvalScope、FlashInfer、SGLang 等开源推理社区。
这段背景让 TokenSpeed 的意义更清楚：它不是凭空出现的闭门系统，而是在现有推理生态已经非常成熟的基础上，针对 agentic workloads 做新的系统级取舍。它一方面对标 TensorRT-LLM 在 Blackwell 上的强性能，另一方面又试图保留 vLLM 式易用性和开源可迭代性。unsetunset十五、当前边界：预览版意味着什么unsetunset
TokenSpeed 当前仍是 preview release。README 和官方博客都强调：开发始于 2026 年 3 月中旬，engine 和 kernels 仍处于活跃开发状态，生产 hardening 计划在后续推进，未来几周还会有大量 PR 合入。
README 中列出的 ongoing work 包括：模型覆盖：Qwen 3.6、DeepSeek V4、MiniMax M2.7；runtime features：PD、EPLB、KV store、Mamba cache、VLM、metrics；平台优化：Hopper、MI350 及相关 runtime 改进。
这意味着 TokenSpeed 当前更适合被视为一条技术路线和性能工程样板，而不是“马上替换线上推理集群”的成熟产品。它最值得研究的地方，是如何把智能体推理的典型痛点系统化：长上下文、短 decode、高并发、KV 复用、低 CPU overhead、异构 kernel 选择，以及控制平面的安全性。unsetunset结语：TokenSpeed 的本质是把推理性能问题系统化unsetunset
如果只看 MLA kernel，TokenSpeed 像是一个追逐 Blackwell 峰值的底层优化项目；如果只看 tokenspeed serve，它又像是一个 OpenAI-compatible 推理服务。但把代码、README 和官方博客连起来看，它真正重要的地方在于：它把 LLM 推理从“单点算子优化”推进到了“系统级协同优化”。Python 前端负责易用接口和异步请求治理；C++ scheduler 用状态机把生命周期和资源所有权显式化；KV cache 从临时张量变成 page、prefix、host/device、writeback、retract 共同参与的资源系统；kernel registry 则把硬件差异、dtype、shape traits 和性能目标纳入可解释的选择过程；MLA 内核优化进一步针对 coding agent 的长 prefix、短 decode、小 head 利用率问题做底层加速。
智能体时代的推理流量不会再只是“给一个 prompt，生成一段答案”。它会是成千上万条长上下文、短步长、多轮交互、频繁复用的请求流。谁能把这些请求像高速公路上的车辆一样调度，把 KV cache 像仓储物流一样复用，把 kernel 像不同路况下的发动机模式一样切换，谁就更接近所谓 speed-of-light inference。![](/images/collections/wechat/asset/vuGdWLUf1cELqnuOIZxtvQ/img_07.png)
TokenSpeed 目前仍年轻，也明确处于预览阶段。但它给出的技术方向足够清晰：未来 LLM 推理系统的竞争，不只是单个 kernel 谁更快，而是谁能在建模、调度、缓存、内核、入口和服务拓扑之间建立一套可验证、可扩展、可持续优化的系统。参考资料[1] 
TokenSpeed MLA: https://github.com/lightseekorg/tokenspeed/tree/main/tokenspeed-mla[2] 
Getting Started: https://lightseek.org/tokenspeed/guides/getting-started[3] 
Launching a Server: https://lightseek.org/tokenspeed/guides/launching[4] 
Server Parameters: https://lightseek.org/tokenspeed/configuration/server[5] 
SMG: https://pytorch.org/blog/lightseek-smg/[6] 
TokenSpeed MLA 已被 vLLM 采用: https://github.com/vllm-project/vllm/pull/41778[7] 
EvalScope: https://github.com/modelscope/evalscope相关推荐从 AITER 内核到 P/D 分离，把 AMD GPU 推理优化从"算子快"推进到"系统快"的轻量闭环项目 ATOM构建面向 LLM 的下一代记忆管理系统，开源项目 Hypatia：为大模型装上“结构化外脑”大模型修硬件Bug，北大提出HWE-Bench，揭示智能体芯片设计的真实能力与致命短板交流加群请在 NeuralTalk 公众号后台回复：加群
