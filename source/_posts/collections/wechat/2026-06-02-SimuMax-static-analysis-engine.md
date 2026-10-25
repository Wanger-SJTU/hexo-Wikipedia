---
title: "Compute MFU Without Running Training! Moore Threads' Static Analysis Engine SimuMax: Packing TP/PP/EP/CP into a Few Thousand Lines of Python"
date: "2026-06-02 23:05:50"
updated: "2026-06-02 23:05:50"
layout: post
permalink: /collections/wechat/2026-06-02-SimuMax-static-analysis-engine/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Compute MFU Without Running Training! Moore Threads' Static Analysis Engine SimuMax: Packing TP/PP/EP/CP into a Few Thousand Lines of Python

> Original: https://mp.weixin.qq.com/s/e2Thl3JnstTEKY0tT5p2nw
> Source: NeuralTalk WeChat Official Account
> Saved: 2026-06-02

---

Keywords: <strong>static analytical model</strong>, *<strong>LLM distributed training</strong>*, parallel strategy search, pipeline scheduling, <strong>memory modeling</strong>

> When training a 100B+ parameter model, the most expensive part is often not the GPU itself, but the "trial and error." A single 1024-GPU strategy sweep can rack up an electricity bill equivalent to the price of a car; yet the `tp × pp × ep × cp × zero × recompute` combinations an engineer has to choose from can number in the thousands.

- MooreThreads/SimuMax: <strong>SimuMax is a simulator and analytical model designed for large-scale LLM training. It models compute cost, communication cost, and memory usage without launching a full training job</strong>, *<strong>helping users estimate throughput, peak memory, execution traces, and pipeline behavior before actually deploying workloads.</strong>*
- https://github.com/MooreThreads/SimuMax

Is it possible to estimate throughput, peak memory, pipeline bubbles, and communication bottlenecks to a reasonable degree of accuracy <strong>without powering on a single GPU</strong>? Moore Threads' open-source SimuMax answers with a resounding yes — it abstracts every operator in a Transformer, every collective communication call, and every piece of activation cache into analytically solvable algebraic expressions, then runs a "fake training" in milliseconds. This article walks through its directory structure, configuration, scheduler, and strategy searcher, examining how a static analysis model holds up against real B200 and A100 benchmarks.

## Table of Contents

- Quick Start
- I. Architecture Overview & Design Philosophy
  - 1.1 The Trinity: System, Strategy, Model
  - 1.2 Repository Layout
- II. Configuration Layer: Computing Feasibility First
  - 2.1 StrategyConfig: One Config = One Experiment
  - 2.2 Semantic Translation of Recompute Strategies
  - 2.3 SystemConfig: A "Virtual Accelerator"
  - 2.4 ModelConfig: The Parameter & FLOPs Ledger
- III. Performance Engine: PerfLLM & Operator Graph
  - 3.1 The Role of PerfBase / PerfLLM
  - 3.2 Algebraizing Dense & MoE Modules
  - 3.3 Pipeline Schedule Modeling
  - 3.4 Memory Timeline & Trace Export
- IV. Strategy Search: Moving Trial-and-Error from Cluster to Laptop
  - 4.1 A Typical Candidate Space
  - 4.2 Auto-Deriving PP/EP/ETP
  - 4.3 Network Selection & Recompute Bucketing
  - 4.4 Main Loop: Search Batch, Estimate Performance, Sort by MFU
- V. Reconciliation with Real Clusters: From Algebra to Trustworthy Numbers
  - 5.1 Public Benchmarks & Reproduction Paths
  - 5.2 When to Trust SimuMax, When to Measure First
- VI. Design Trade-offs & Value
- Conclusion

## Quick Start

> SimuMax is a pure Python package with zero compilation dependencies — just `pip` and you're running. The minimal install and first `perf` command:

```bash
# 1. Create an isolated virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Clone and install
git clone git@github.com:MooreThreads/SimuMax.git
cd SimuMax
pip install -r requirements.txt
pip install -v -e .

# 3. Run a built-in Llama3-8B, TP1/PP2 perf example
cd examples
python perf_llama3_8b_tp1_pp2.py
```

If you prefer a point-and-click experience, the repo also provides a Streamlit App:

```bash
cd app
bash install.sh
python -m streamlit run streamlit_app.py
```

Further usage falls into five categories: running existing perf scripts, adding custom machine configs, adding custom models, generating simulator traces/memory snapshots, and performing strategy searches. Entry points for each are documented in docs/tutorial.md, docs/system.md, docs/model.md, docs/strategy.md, and examples/search_strategy_llama3_8b.py respectively. A key note: for <strong>OOM feasibility screening alone</strong>, the shipped configs are sufficient; but for `perf vs real` timing comparisons, follow the simu_tools/efficency_test measurement workflow to populate `system.miss_efficiency` first.

## I. Architecture Overview & Design Philosophy

### 1.1 The Trinity: System, Strategy, Model

> SimuMax decomposes "distributed training" into three orthogonal inputs:

- <strong>System</strong>: Machine profile. Per-GPU compute, memory, multi-level bandwidths, operator efficiency factors.
- <strong>Strategy</strong>: Strategy profile. `tp/pp/ep/cp/sp/zero/recompute/interleaving/...`, plus micro-batch and global batch shapes.
- <strong>Model</strong>: Model profile. Hidden dimension, layer count, attention type (MHA/GQA/MLA), expert count, SwiGLU or not...

This decoupling yields a direct benefit: swap machines by changing System only, swap models by changing Model only, tune strategies by changing Strategy only — then hand everything to a unified `PerfLLM` for the "fake training." All config classes inherit from `Config` with built-in `to_dict / to_json_string / init_from_config_file`, ensuring JSON serialization and reproducibility:

```python
# Source: simumax/core/config.py
@dataclass
class Config:
    def to_dict(self) -> Dict[str, Any]:
        # Serialize all dataclass fields and @property methods
        output = asdict(self)
        for attr_name in dir(self):
            attr_value = getattr(self.__class__, attr_name, None)
            if isinstance(attr_value, property):
                output[attr_name] = _normalize_jsonable(getattr(self, attr_name))
        return _normalize_jsonable(output)

    @classmethod
    def init_from_config_file(cls, config_file: str):
        return cls.init_from_dict(cls.read_json_file(config_file))
```

Note that `to_dict` proactively serializes `@property` methods too, meaning derived quantities like `dp_size`, `global_batch_size`, and `recompute_status` are preserved on disk for post-hoc reconciliation — a subtle but highly user-friendly design for "scientific experiment records."

### 1.2 Repository Layout

> The key directories under `simumax/` can be summarized in one sentence each:

- `core/`: Core engine. `config.py` (three config sets), `perf_llm.py` (top-level `PerfLLM`), `base_struct.py / model_struct.py / graph.py` (simulation graph and data structures), `simu_memory.py / simu_runner.py / simu_artifacts.py` (memory timeline and artifacts), `trace_export.py / generate_tracing.py` (Chrome trace export).
- `core/transformer/`: Decomposes Transformer into `dense_module.py` (130k chars, full Dense layers), `moe_module.py` (60k chars, full MoE), `language_model.py` (language model shell), `pipeline_schedule.py` (40k chars, pipeline schedule modeling), `function.py / simu_ops.py` (operator-level cost formulas).
- `tuning/strategy_searcher.py`: Grid searcher that automates `PerfLLM` across candidate strategies.
- `pp_simu/utils.py`: A small standalone parser for DualPP and other pipeline overlap schemes, mainly for visualization and comparison.

app/`, `examples/`, `simu_tools/`, and `configs/` serve as UI, examples, machine measurement scripts, and public config libraries respectively. The entire codebase has no C++ extensions and no CUDA operators — all "performance numbers" come from pure Python algebraic expressions, which is exactly why SimuMax can complete a 1024-GPU strategy search on an ordinary laptop in seconds.

## II. Configuration Layer: Computing Feasibility First

### 2.1 StrategyConfig: One Config = One Experiment

> `StrategyConfig` is the "heaviest" config in SimuMax, with nearly every trainable knob captured. Its core fields can be grouped as follows:

```python
# Source: simumax/core/config.py
@dataclass
class StrategyConfig(Config):
    # Shapes
    seq_len: Optional[int] = None
    micro_batch_size: Optional[int] = None
    micro_batch_num: Optional[int] = None
    dtype: Optional[int] = 'bf16'
    fp8: Optional[bool] = False

    # Parallelism
    world_size: Optional[int] = 8
    tp_size: int = 1
    cp_size: int = 1
    pp_size: int = 1
    ep_size: int = 1
    etp_size: int = 1
    cp_comm_type: str = "a2a"
    order_of_paralielism: str = "tp-cp-ep-dp-pp"
    interleaving_size: int = 1                 # VPP
    microbatch_group_size_per_vp_stage: Optional[int] = None

    # Memory optimization
    enable_recompute: bool = True
    recompute_granularity: Optional[str] = None    # full_block / attn_only / mlp_only / sdp_only / selective_recompute
    recompute_layer_num: int = 0
    megatron_recompute: bool = False               # Megatron-LM 0.14 style
    megatron_recompute_modules: Optional[List[str]] = None
    zero_state: int = 1
```

Derived properties are the config's "killer feature." For example:

```python
# Source: simumax/core/config.py
@property
def shard_size(self):
    return self.pp_size * self.tp_size * self.cp_size

@property
def dp_size(self):
    assert self.world_size % self.shard_size == 0
    return self.world_size // self.shard_size

@property
def global_batch_size(self):
    return self.micro_batch_size * self.micro_batch_num * self.dp_size
```

dp_size` is not user-provided — it's **derived from `world_size / (pp·tp·cp)`**, immediately catching whether the parallel layout is self-consistent. The `sanity_check` further encodes hundreds of constraints as readable assertions: `seq_len % cp_size == 0`, `world_size % (ep·etp·pp) == 0`, `zero_state ∈ {0,1,2,3}`, `megatron_recompute` requires `recompute_granularity == "selective_recompute"`, `interleaving_size > 1` requires `pp_size > 1` and `microbatch_group_size_per_vp_stage >= pp_size`... Constraints that in real training would only surface via OOM or NaN are caught at config time in SimuMax.

### 2.2 Semantic Translation of Recompute Strategies

> Recomputation is the classic trade-off between memory and compute. SimuMax splits it into two fine-grained configs — `AttentionRecomputeConfig` and `MLPRecomputeConfig` — then uses `parse_attention_recompute / parse_mlp_recompute` to translate user-level "granularity words" into concrete switches. Here's the attention side:

```python
# Source: simumax/core/config.py
def parse_attention_recompute(self, layer_idx):
    if self.recompute_granularity is None or layer_idx >= self.recompute_layer_num:
        return AttentionRecomputeConfig()           # No recompute for this layer
    conf = AttentionRecomputeConfig()
    if self.is_megatron_selective_recompute:
        modules = self.megatron_recompute_module_set
        conf.megatron_layernorm   = "layernorm" in modules
        conf.megatron_mla_up_proj = "mla_up_proj" in modules
        # Map Megatron's "module list" to per-sub-module recompute switches within MLA
        conf.input_layernorm_recompute = conf.megatron_layernorm
        conf.q_down_recompute = conf.megatron_layernorm
        ...
        return conf
    if self.recompute_granularity == "full_block":
        conf.set_all_status(True)
    elif self.recompute_granularity == "sdp_only":
        conf.core_attn_recompute = True
    ...
    return conf
```

This code's value lies in translating an abstract intent like "I enabled selective recompute" into per-layer facts like "should q_down store activations, should rope be recomputed, should core_attn be recomputed" that the memory model can directly consume. In other words, SimuMax's recompute modeling isn't just "multiplying by a factor" — it drills down to the q_down/q_up/kv_down/kv_up/rope/core_attn level within MLA.

### 2.3 SystemConfig: A "Virtual Accelerator"

> The most interesting aspect of the machine side is building analytical functions for operator time, memory access time, and network communication time separately. First, operators:

```python
# Source: simumax/core/config.py
def compute_op_accuracy_time(self, op_name: str, flops: int, shape_desc: str, ...):
    op = self.accelerator.op.get(op_name, None) or self.accelerator.op.get("default")
    # Use per-shape calibrated efficiency if available; otherwise fall back to default
    if op.accurate_efficient_factor is not None \
       and op.accurate_efficient_factor.get(shape_desc) is not None:
        efficient_factor = op.accurate_efficient_factor[shape_desc]
        self.record_hit_efficiency(op_name, flops, shape_desc, efficient_factor)
    else:
        efficient_factor = op.efficient_factor
        self.record_miss_efficiency(op_name, flops, shape_desc, efficient_factor)
    # time = FLOPs / (peak TFLOPs × efficiency), in ms
    return flops / (op.tflops * 1e12 * efficient_factor) * 1e3
```

Two details worth noting:

- <strong>Hits and misses are explicitly tracked</strong>. Any query that can't find a per-shape efficiency entry falls into `miss_efficiency`, letting users clearly know which parts of the simulation are unreliable. SimuMax's README repeatedly emphasizes "fill in miss_efficiency before doing timing comparisons" — this mechanism is why.
- <strong>Operator efficiency is per-shape</strong>. `accurate_efficient_factor` is a `shape → efficiency` dictionary, meaning SimuMax doesn't assume "matmul is always 70% efficient" but looks up efficiency by GEMM shape. This is key to achieving B200/A100 benchmark-accurate reconciliation.

The communication side's `compute_net_op_time` builds analytical expressions for all five collective operations (`all_reduce / all_gather / reduce_scatter / p2p / all2all`) using `actual_size = size * scale + offset_chunk` plus bandwidth discounts, with semantic-specific patches:

```python
# Source: simumax/core/config.py (compute_net_op_time excerpt)
if net == "inter_node":
    if op_name == "all2all" and "ep" in comm_stage.lower():
        # k machines across EP: actual cross-machine traffic = (k-1)/k * actual_size, single NIC limit
        k = max(1, math.ceil(comm_num / self.num_per_node))
        actual_size = (k-1)/k * actual_size
        bw /= self.num_per_node
    if op_name in ["all_reduce", "all_gather", "reduce_scatter"] and is_dense_dp_stage:
        # DP/DP+CP cross-node bandwidth shared by TP/CP "group count" NICs
        dense_group_multiplicity = strategy.tp_size
        if comm_stage == "dp":
            dense_group_multiplicity *= strategy.cp_size
        bw /= min(self.num_per_node, dense_group_multiplicity)
```

A few lines capture engineering realities like "EP cross-node only counts (k-1)/k traffic, single group limited to one NIC" and "DP/DP+CP NIC count is split by TP (or TP·CP)" as algebra. Whether you can accurately hit real-world bandwidth often depends on whether such details are modeled correctly.

Finally, `compute_end2end_time` determines the overall accounting:

```python
# Source: simumax/core/config.py
def compute_end2end_time(self, compute_time, mem_time):
    if self.accelerator.mode == "only_compute":
        return compute_time if compute_time else mem_time
    elif self.accelerator.mode == "roofline":
        return max(compute_time, mem_time)
```

only_compute` serves scenarios where "operators are primarily compute-bound"; `roofline` forces `max(compute, mem)` per the Roofline model. The two modes cover two typical cases: "GEMM dominates during training" and "small operators are bandwidth-limited."

### 2.4 ModelConfig: The Parameter & FLOPs Ledger

> Beyond fields, the model side's core contribution is making "parameter count, activation parameter count, per-token FLOPs" into properties:

```python
# Source: simumax/core/config.py
@property
def qkv_proj_elements(self):
    kv_head_num = self.head_num if self.kv_head_num is None else self.kv_head_num
    if self.attention_type == 'mla':
        # MLA: account for q_lora / kv_lora and qk_pos_emb_head_dim low-rank splits
        if self.q_lora_rank is None:
            elements = self.hidden_size * self.head_num * (self.qk_head_dim + self.qk_pos_emb_head_dim)
        else:
            elements  = self.hidden_size * self.q_lora_rank
            elements += self.q_lora_rank * self.head_num * (self.qk_head_dim + self.qk_pos_emb_head_dim)
        elements += self.hidden_size * (self.kv_lora_rank + self.qk_pos_emb_head_dim)
        elements += self.kv_lora_rank * self.head_num * (self.qk_head_dim + self.v_head_dim)
        return elements
    else:
        proj_size = self.head_size * self.head_num + 2 * self.head_size * kv_head_num   # GQA/MQA
        return self.hidden_size * proj_size
```

flops_per_token` accounts for MoE `topk` amplification, Shared Expert extra width, MLA q/k/v head dimension differences, and the final vocab projection's "3·2·H·V" term. Implementing formulas that typically live in PowerPoint slides directly into config classes, combined with `dp_size` and `global_batch_size`, enables derived metrics like MFU to be <strong>computed directly from the config layer</strong> without waiting for real training.

## III. Performance Engine: PerfLLM & Operator Graph

### 3.1 The Role of PerfBase / PerfLLM

> `simumax/core/perf_llm.py` is the "brain" of the entire engine. Its core class `PerfLLM` inherits from `PerfBase` and handles five responsibilities:

- Accepts System / Model / Strategy, performs cross-validation checks (`_cross_sanity_check`);
- Constructs a set of `LLMModel` instances sliced by PP/VPP (one "model chunk" per PP stage and virtual rank, recorded in `model_chunk_dict` and `vpp_chunk_dict`);
- Triggers `run_estimate` for a complete "fake execution" of forward/backward/optimizer, producing `compute_info / cost_info / all_gemm_cost_info`;
- Outputs top-level metrics via `analysis_cost / analysis_mem` (MFU, per-accelerator throughput, breakdown, peak memory);
- Exports `tracing_logs.json` and optional `simu_memory_*` artifacts via `simulate(out_dir)`, enabling direct comparison in Chrome Trace tools.

The reusable cached data classes:

```python
# Source: simumax/core/perf_llm.py
@dataclass(frozen=True)
class CachedLeafActivationProfile:
    full_name: str
    current_full_module_path: str
    enable_recompute: bool
    recompute_status: str
    offload_inputs: bool
    input_mem_bytes: float
    activation_mem_cache: float
    fwd_peak_mem_no_cache: float
    bwd_peak_mem_no_cache: float

class CachedUnitRuntimeProfile:
    @classmethod
    def from_model_chunk(cls, model_chunk: LLMModel):
        leaf_profiles = []
        for leaf in model_chunk.get_all_leaf_modules():
            act_info = leaf.get_act_info()
            leaf_profiles.append(CachedLeafActivationProfile(...))
        return cls(
            compute_info=model_chunk.get_compute_info(),
            cost_info=model_chunk.get_cost_info(),
            all_gemm_cost_info=model_chunk.get_all_gemm_cost_info(),
            leaf_profiles=leaf_profiles,
            miss_efficiency=deepcopy(getattr(model_chunk.system, "miss_efficiency", {})),
        )
```

Note that `CachedLeafActivationProfile` is `frozen=True`: each leaf module's (a LayerNorm, a GEMM segment, an SDP segment...) activation peak, cache size, and offload status are frozen into read-only snapshots for safe reassembly across PP/VPP without cross-contamination. This is the key engineering mechanism enabling the searcher to evaluate hundreds or thousands of strategies without blowing the stack.

### 3.2 Algebraizing Dense & MoE Modules

> `simumax/core/transformer/dense_module.py` and `moe_module.py` are the two largest files in the project, wrapping every Transformer sub-module (Linear, LayerNorm, RoPE, SDP, SwiGLU, Router, Permutation, GroupGEMM...) into objects that can compute both FLOPs/memory and time.

language_model.py` assembles these sub-modules into a complete LLM and exposes `get_all_leaf_modules / get_act_info / get_compute_info / get_cost_info` for `PerfLLM` to consume. This "operator-level analysis" maps almost one-to-one with real frameworks (PyTorch + TE):

- For each GEMM, look up `efficient_factor` by shape in the System table; on miss, log to `miss_efficiency`;
- For each LayerNorm / SwiGLU and other small operators, compute via memory bandwidth with `compute_mem_access_time`;
- For each collective communication triggered by TP/CP/EP sharding, compute via `compute_net_op_time`;
- For each "activation cache" segment, determine whether it enters the memory timeline based on recompute/offload strategy.

This is why SimuMax emphasizes that its semantics strictly align with Megatron-LM 0.14's `megatron_recompute=true + megatron_recompute_modules`: there's a one-to-one mapping between `parse_attention_recompute / parse_mlp_recompute` and `dense_module / moe_module`, enabling "end-to-end reconciliation."

### 3.3 Pipeline Schedule Modeling

> `simumax/core/transformer/pipeline_schedule.py` arranges "per micro-batch forward / backward / weight update" into a timeline based on `pp_size`, `interleaving_size`, `microbatch_group_size_per_vp_stage`, `pp_comm_async`, etc., then computes <strong>bubbles</strong> and <strong>effective compute ratio</strong>. The repo currently supports 1F1B and sync-VPP (Preview).

For more aggressive scheduling like "forward-backward overlap," the repo provides a standalone, highly readable parser in `simumax/pp_simu/utils.py` for analyzing DualPP / FB-overlap:

```python
# Source: simumax/pp_simu/utils.py
def duration_dualpp(mbn, pp, F_cost, B_cost, W_cost, FandB_cost, opt_time, stage):
    bubble = (pp-2-stage)*FandB_cost - (pp/2-stage-1)*F_cost \
             - (pp*3/2-3)*W_cost + stage*B_cost
    duration = mbn * (F_cost + B_cost) * 2 \
               - (2*mbn - 3/2*pp + stage + 1) * (F_cost + B_cost - FandB_cost) \
               + bubble + opt_time
    return duration

def mfu_dualpp(mbn, pp, F_cost, B_cost, W_cost, FandB_cost, opt_time, stage,
               Flops_perbatch, default_flops=465):
    opt_time = opt_time * 2   # DualPP: upstream and downstream each compute opt, doubling gradient scale
    dur = duration_dualpp(mbn, pp, F_cost, B_cost, W_cost, FandB_cost, opt_time, stage)
    flops = Flops_perbatch * mbn * 2
    return flops / (dur / 1000) / default_flops / 1e12
```

cal_FandB_multi_layers` further arranges sub-events like "attention forward, Dispatch, MLP backward, Combine, attention backward" into two timelines (compute / comm), using `max(...)` for hard synchronization at each step, ultimately yielding `compute_dur` and `comm_dur` with `max` as the "post-overlap F&B" effective cost. This code is an excellent <strong>introductory sample for understanding pipeline overlap mechanisms</strong>: it transforms graphical PP timing diagrams into a readable, debuggable, plottable Python function.

### 3.4 Memory Timeline & Trace Export

simu_memory.py / simu_artifacts.py / generate_tracing.py / trace_export.py` are responsible for materializing "fake training" artifacts. `simulate(out_dir)` produces at minimum `tracing_logs.json` (directly viewable as a timeline in Chrome Trace Viewer); if strategy and current memory timeline paths allow, it also generates:

- `simu_memory_result.json`: Peak memory data per stage;
- `simu_memory_snapshot.json`: Per-event memory snapshots;
- `simu_memory_viz_snapshot.pickle`: Visualization pickle.

For engineers, the real value of these artifacts lies in <strong>reconciliation</strong>: placing SimuMax's trace side-by-side with a real Megatron run's trace reveals at a glance "which segment was underestimated" or "which activation could actually be reclaimed." This is why the README repeatedly emphasizes that "a simulator doesn't replace real runs — it provides an interpretable reference for them."

## IV. Strategy Search: Moving Trial-and-Error from Cluster to Laptop

### 4.1 A Typical Candidate Space

simumax/tuning/strategy_searcher.py` is the minimal closed loop for automating `PerfLLM`, about 200 lines. Its default candidate space looks like this:

```python
# Source: simumax/tuning/strategy_searcher.py
CANDIDATE_STRATEGY = {
    "seq_len": [4096],
    "world_size": [1024],
    "micro_batch_size": [1],
    "micro_batch_num": [1],
    "dtype": ["bf16"],
    "tp_size": [1, 2, 4, 8],
    "enable_sequence_parallel": [True],
    "interleaving_size": [1],
    "zero_state": [1],
    "use_fused_norm": [True],
    "use_math_sdp": [False],
    "use_flash_sdp": [True],
    "use_fp32_accum_grad": [True],
    "use_fused_swiglu": [True],
    "enable_recompute": [False, True],
    "recompute_granularity": ["full_block"],
    "mem_factor": [0.94],
}
```

Note: `pp_size / ep_size / etp_size` are <strong>not explicitly listed</strong> — they are <strong>auto-derived</strong> by the searcher. This is the most insightful aspect of this code.

### 4.2 Auto-Deriving PP/EP/ETP

```python
# Source: simumax/tuning/strategy_searcher.py
def _comp_cand_parallel_size(self, params: dict):
    tp_size = params["tp_size"]; world_size = params["world_size"]
    layer_num = self.model_config.layer_num
    expert_num = self.model_config.expert_num
    num_per_node = self.system_config.num_per_node

    candidate_list = []
    for pp_size in range(1, world_size // tp_size + 1):
        if layer_num % pp_size != 0:                       # Must divide layer count
            continue
        if (world_size // tp_size) % pp_size != 0:         # Must divide GPU count
            continue
        if expert_num == 1:                                # Dense model
            candidate_list.append({"pp_size": pp_size, "ep_size": 1, "etp_size": 1})
            continue
        # MoE: enumerate etp ∈ {1,2,4,...,num_per_node}, ep ∈ {factors of expert_num}
        etp_size = 1
        while etp_size <= num_per_node:
            for ep_size in range(1, expert_num + 1):
                if expert_num % ep_size != 0: continue
                if (world_size // pp_size) % etp_size != 0: continue
                if world_size % (pp_size * ep_size * etp_size) != 0: continue
                candidate_list.append(
                    {"pp_size": pp_size, "ep_size": ep_size, "etp_size": etp_size}
                )
            etp_size *= 2
    ...
```

Concise but extremely dense: a nested loop encodes hard constraints like "PP must divide layer count, ETP must not exceed per-node GPU count, `world_size` must divide `pp·ep·etp`, ep must divide expert count" directly as candidate pruning. Each `if … continue` corresponds to an engineering reality, avoiding <strong>Cartesian product explosion</strong>.

### 4.3 Network Selection & Recompute Bucketing

_select_net` determines whether a communication group uses `high_intra_node` (NVLink/MTLink) or `inter_node` (IB/RoCE) based on whether the mesh prefix product exceeds a single node:

```python
# Source: simumax/tuning/strategy_searcher.py
def select_impl(name, mesh_order, mesh_size):
    index = mesh_order.index(name)
    if reduce(operator.mul, mesh_size[: index + 1]) <= num_per_node:
        return "high_intra_node"
    return "inter_node"
```

For "recompute layer count," the author uses "bucket = 4" approximate sampling to prevent `recompute_layer_num` from becoming another full grid dimension:

```python
# Source: simumax/tuning/strategy_searcher.py
layers = self.model_config.layer_num // params_with_full_shard["pp_size"]
stride = -1
bucket_num = 4
if layers // bucket_num > 1:
    stride = -layers // bucket_num
if params["enable_recompute"]:
    recompute_strategy_list = [
        {**deepcopy(params_with_full_shard), "recompute_layer_num": r}
        for r in range(layers, 0, stride)
    ]
```

### 4.4 Main Loop: Search Batch, Estimate Performance, Sort by MFU

```python
# Source: simumax/tuning/strategy_searcher.py
for params in tqdm(combinations):
    try:
        cur_candidate_strategy = StrategyConfig(**params)
        self._select_net(cur_candidate_strategy)
        perf_model = PerfLLM()
        perf_model.configure(strategy_config=cur_candidate_strategy,
                             model_config=self.model_config,
                             system_config=self.system_config)
        max_micro_batch_size = perf_model.search_max_micro_batch_size()
        if max_micro_batch_size < 1:
            print(f"Error: memory is not enough, skip {cur_candidate_strategy.to_dict()}")
            continue
        cur_candidate_strategy.micro_batch_size = max_micro_batch_size
        if cur_candidate_strategy.pp_size > 1:
            cur_candidate_strategy.micro_batch_num = 128   # Large value to minimize bubbles;
                                                           # real usage should respect global_batch constraints
        perf_model._set_strategy_config(cur_candidate_strategy)
        perf_model._cross_sanity_check()
        perf_model.run_estimate()
        cost_result   = perf_model.analysis_cost()
        memory_result = perf_model.analysis_mem()
        first_stage_mem_result = memory_result if memory_result.get("first_stage") is None \
                                 else memory_result.get("first_stage")
        self.strategies.append((cur_candidate_strategy,
                                cost_result.get("mfu"),
                                cost_result.get("throughput_per_accelerator"),
                                cost_result.get("breakdown_result"),
                                first_stage_mem_result.get("peak_cached_mem")))
    except AssertionError as err:
        print(f"Error: {err}, skip {cur_candidate_strategy.to_dict()}")
        continue
self.strategies.sort(key=lambda x: x[1], reverse=True)
```

Three points worth highlighting:

- <strong>Embedded batch search</strong>: `search_max_micro_batch_size()` binary-searches or incrementally finds the largest micro-batch that fits within the current parallel layout, then writes it back to the strategy — meaning the outer grid only determines "topology," while micro-batch is adaptively determined by `PerfLLM`'s memory model;
- <strong>Proactive AssertionError catching</strong>: All `sanity_check` failures are treated as "pruning" rather than crashes, making the search robust against candidates containing illegal combinations;
- <strong>Sorting by MFU</strong>: While throughput / peak_cached_mem / breakdown are all preserved, strategies are sorted by MFU in descending order for topK selection. This aligns with the README's recommended path of "search micro-batch / micro-batch-num first, then sweep tp/pp in a narrow range."

The entire searcher is only 200 lines, but it combines "config constraints + memory budget + communication topology + MFU evaluation" into an <strong>offline AutoTuner</strong>. For engineers, it can tell you — before you drain the GPU queue — that "on this B200, running Llama3-405B across 1024 GPUs, the optimal strategy might be `tp8.pp16.ep4` rather than `tp4.pp8.ep8`."

## V. Reconciliation with Real Clusters: From Algebra to Trustworthy Numbers

### 5.1 Public Benchmarks & Reproduction Paths

> SimuMax v1.2 focuses on B200 public reconciliation:

- B200 CP A2A results: assets/b200_cp_a2a_release_v1.2.png
- B200 summary: docs/b200/b200_release_v1.2_summary.md
- Reproduction guide: docs/b200/b200_real_repro_guide.md
- Full benchmarks: docs/FULL_RESULTS.md

These materials address a long-standing trust issue in "performance modeling projects" — <strong>dare you publish numbers, dare you provide reproduction scripts</strong>. Most useful for developers is `simu_tools/efficency_test`: it provides a unified entry point for measuring operator efficiency and communication bandwidth, feeding the measured `efficient_factor` back into System JSON so that `compute_op_accuracy_time / compute_net_op_time` hits `accurate_efficient_factor`, progressively closing the gap between theoretical and actual values.

### 5.2 When to Trust SimuMax, When to Measure First

> The README provides clear boundaries:

- <strong>OOM feasibility screening</strong>: Tolerate non-empty `miss_efficiency`, use shipped configs directly;
- **`perf vs simulator` / `perf vs real` timing reconciliation**: First measure and fill in the prominent operator and communication shapes in `miss_efficiency`.

In other words, SimuMax doesn't try to "calculate every microsecond" for you — it <strong>explicitly exposes</strong> its uncertainty. This "honesty" is what distinguishes it from many "one-click MFU calculator" tools.

## VI. Design Trade-offs & Value

> Looking back, SimuMax's engineering trade-offs can be summarized:

- <strong>Pure Python, analytical, zero CUDA</strong>: Trades "some precision loss" for "readability + modifiability + sub-second CPU execution." A perfect trade-off for strategy search scenarios.
- <strong>Trinity decoupling</strong>: System / Strategy / Model are independently JSON-serializable and reusable; the community can contribute "machine profiles" and "model profiles" without touching the core engine.
- <strong>Sub-module-level recompute and activation modeling</strong>: MLA's q_down/q_up/kv_down/kv_up/rope/core_attn switches enable it to approximate Megatron-LM 0.14's real behavior.
- <strong>Per-shape efficiency + miss/hit accounting</strong>: Compute and bandwidth uncertainties are explicitly registered; simulation reports come with built-in "confidence metadata."
- <strong>Searcher is only 200 lines</strong>: Complexity is compressed into `PerfLLM` and `StrategyConfig.sanity_check`; the outer scheduler stays "short, readable, and modifiable."
- <strong>Standalone pipeline overlap parser</strong>: `pp_simu/utils.py` models DualPP/FB-overlap independently with visualization, letting researchers quickly validate scheduling ideas.

For an open-source project still in v1.x, its roadmap (more PP schedules, compute/comm overlap, offloading, larger-scale public sweeps) clearly points toward "algebraizing more real-world engineering details."

## Conclusion

> In the LLM era, "simulate before training" has gone from luxury to necessity.

SimuMax uses a maximally simple toolset — dataclasses + analytical formulas + a few thousand lines of Python — to compress what used to require lighting up an entire data center into seconds on a laptop. It doesn't cut corners in its formulas: operators query efficiency by shape, communication is corrected by NIC count and cross-machine ratios, recompute uses MLA sub-module switches, and pipelines are individually modeled for 1F1B/VPP/DualPP. Next time you're about to press "start training," consider letting `PerfLLM` run first — it may not win you every MFU percentage point, but it will almost certainly save you a few "power-on-and-burn-money" cycles. That is the most humble and most solid value of a static analysis model in the LLM era.

## References

[1] SimuMax: https://github.com/MooreThreads/SimuMax
[2] README.md: https://github.com/MooreThreads/SimuMax/blob/main/README.md
[3] docs/tutorial.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/tutorial.md
[4] docs/system.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/system.md
[5] docs/model.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/model.md
[6] docs/strategy.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/strategy.md
[7] examples/search_strategy_llama3_8b.py: https://github.com/MooreThreads/SimuMax/blob/main/examples/search_strategy_llama3_8b.py
[8] simu_tools/efficency_test: https://github.com/MooreThreads/SimuMax/tree/main/simu_tools/efficency_test
[9] assets/b200_cp_a2a_release_v1.2.png: https://github.com/MooreThreads/SimuMax/blob/main/assets/b200_cp_a2a_release_v1.2.png
[10] docs/b200/b200_release_v1.2_summary.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/b200/b200_release_v1.2_summary.md
[11] docs/b200/b200_real_repro_guide.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/b200/b200_real_repro_guide.md
[12] docs/FULL_RESULTS.md: https://github.com/MooreThreads/SimuMax/blob/main/docs/FULL_RESULTS.md
