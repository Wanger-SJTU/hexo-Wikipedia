---
title: "《CS336 Spring 2025 Lecture 6：Kernels, Triton》学习笔记"
date: "2026-03-12 00:00:00"
updated: "2026-03-12 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/《CS336-Spring-2025-Lecture-6-Kernels,-Triton》学习笔记-d42515/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2015442629765137282"
---


### 一、课程引入与作业说明

本节课核心是为作业2铺垫，手把手教大家编写高性能GPU代码，整体节奏清晰：回顾GPU基础 → 基准测试与性能剖析 → CUDA/Triton内核实操 → 多实现性能对比 → Triton版softmax示例。

### 二、GPU基础知识回顾

核心目标：掌握GPU核心组件与执行逻辑，为后续内核编写打基础，不用死记硬背，理解核心逻辑即可。

#### 2.1 GPU核心组件与内存层级

- 流式多处理器（SM）：GPU的核心，像A100、H100这类高端显卡有大量SM，每个SM包含很多计算单元（Int32、FP32），能启动海量线程。
- 内存层级（速度从快到慢，容量从大到小）：

- 寄存器堆：线程专属，速度极快，高性能代码必用；
- 缓存：辅助读取，速度中等；
- 全局内存（DRAM）：容量最大，速度最慢，是数据存储主要区域。

#### 2.2 GPU执行模型

- 线程块（Block）：调度到单个SM运行，是GPU编程（尤其是Triton）的核心思考单元；块内线程可通过共享内存快速通信，跨块通信开销极大。
- 线程（Thread）：块内执行单元，真正做计算；处理向量/矩阵时，多个线程协同完成，每个线程负责若干元素。
- 核心原则：数据尽量放在同一个线程块/数据分块（tile）中，通信速度接近L1缓存；无法跨块同步，也无法控制跨块执行顺序。

#### 2.3 线程束（Warp）

- 定义：32个连续线程为一组，SM中几乎同时执行，不用主动关注，但影响性能。
- 关键要求：尽量让所有线程束计算量均等；理想情况下，线程块数量远多于SM数量，且能整除SM数量，避免工作量不均。

#### 2.4 计算强度

定义：浮点运算量（FLOPs）与内存传输字节数的比值，越高越好。原因很简单：GPU计算性能提升比内存快得多，多数操作受内存限制，无法发挥全部算力（矩阵乘法优化好可实现“计算受限”，是最优状态）。

#### 2.5 Q&A

Q：线程束的作用是什么？ 

A：核心是减少控制单元开销，GPU侧重计算，控制逻辑简单；CPU则把大量芯片面积用在控制单元、分支预测，二者是权衡关系。

### 三、基准测试（Benchmarking）—— 高性能代码的前提

基准测试的核心是“测速度、判价值”，避免盲目优化（比如花大量时间优化非瓶颈部分），后续用来对比Triton、CUDA等不同实现的性能。

#### 3.1 基准测试3个关键注意事项

- 预热迭代：第一次运行PyTorch代码会有编译、初始化开销，预热后才能测到真实稳态速度。
- CUDA同步（torch.cuda.synchronize）：GPU和CPU独立工作，不同步会导致计时不准，必须加同步确保GPU任务完成。
- 多次测量取平均：单次计时受GPU温度等影响，多次测量取平均更准确。

#### 3.2 核心示例

#### 3.2.1 矩阵乘法基准测试

测试环境：A100显卡，测试不同尺寸矩阵乘法耗时。 

规律：小尺寸（1024、2048）耗时增长不明显（有固定开销：数据传输、内核启动）；尺寸足够大后，耗时呈超线性增长。

#### 3.2.2 MLP基准测试

测试模型：极简MLP（线性层堆叠，仅前向+反向传播，无损失函数，最后平均池化）。 

结果：步数、层数与耗时均呈线性关系，每步/每层耗时约5秒。

#### 3.3 局限性

Benchmarking 只能判断“代码慢”，但找不到“慢在哪”，属于粗粒度工具，需要结合性能剖析进一步定位瓶颈。

### 四、性能剖析（Profiling）—— 定位瓶颈的核心工具

细粒度分析工具，能看清时间消耗分布，甚至能看到底层CUDA指令执行情况，是优化代码的关键。

#### 4.1  Profiling 常用工具

#### 4.2.1 PyTorch内置 profile

优势：不用脱离Python/PyTorch环境，能跟踪CPU和GPU时间，输出清晰的平均时间表格，适合快速定位简单瓶颈。

Profiling示例：

- 矩阵相加（2048维）：CPU端耗时1.4毫秒（主要是C语言接口开销），CUDA端仅17微秒，底层调用流程：Python→aten→CUDA内核→启动+同步。
- 矩阵乘法（2048维）：CUDA端耗时远高于CPU端，底层调用Cutlass库（NVIDIA高性能矩阵乘法库）。
- torch.cdist（两两欧氏距离）：78%时间花在矩阵乘法，是优化重点。
PyTorch内置profile 核心代码

```python
def profile(description: str, run: Callable, num_warmups: int = 1, with_stack: bool = False):
    # Warmup（预热迭代，避免启动开销影响计时）
    for _ in range(num_warmups):
        run()
    if torch.cuda.is_available():
        torch.cuda.synchronize()  # CUDA同步，确保GPU任务完成
    # 启动剖析器，跟踪CPU和GPU活动
    with torch.profiler.profile(
            activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
            with_stack=with_stack,  # 输出调用栈，用于可视化
            experimental_config=torch._C._profiler._ExperimentalConfig(verbose=True)) as prof:
        run()
        if torch.cuda.is_available():
            torch.cuda.synchronize()  # 再次同步，确保所有任务被记录
    # 输出剖析结果表格（按CUDA总时间排序）
    table = prof.key_averages().table(sort_by="cuda_time_total",
                                      max_name_column_width=80,
                                      row_limit=10)
    # 导出调用栈可视化文件（若开启with_stack）
    if with_stack:
        text_path = f"var/stacks_{description}.txt"
        svg_path = f"var/stacks_{description}.svg"
        prof.export_stacks(text_path, "self_cuda_time_total")
    return table
```


剖析调用示例（矩阵乘法）：

```text
matmul_function_128 = lambda a, b: a @ b
matmul_profile_128 = profile("matmul(dim=128)", run_operation2(dim=128, operation=matmul_function_128))
matmul(dim=128)
```


#### 4.2.2 NVIDIA Nsight Systems（作业2必用）

专业剖析工具，能清晰展示CPU与GPU执行时序、内核启动时机、内存占用，是作业2要求使用的工具。

- 时序可视化：上半部分GPU操作，下半部分CPU线程，可通过NVTX注解标记代码块，看清各步骤执行时机。
- CPU与GPU交互：CPU提前向GPU发送指令，若需打印损失值（CPU操作），会等待GPU完成，引入同步开销，可能造成CPU瓶颈。
- 内核统计：提取所有CUDA内核，查看耗时和启动次数，精准定位瓶颈。

专业剖析工具，能清晰展示CPU与GPU执行时序、内核启动时机、内存占用，是作业2要求使用的工具。

- 时序可视化：上半部分GPU操作，下半部分CPU线程，可通过NVTX注解标记代码块，看清各步骤执行时机。
- CPU与GPU交互：CPU提前向GPU发送指令，若需打印损失值（CPU操作），会等待GPU完成，引入同步开销，可能造成CPU瓶颈。
- 内核统计：提取所有CUDA内核，查看耗时和启动次数，精准定位瓶颈。

#### 4.3 Q&A

Q：矩阵乘法中，CUDA时间大于CPU时间，加了同步，CPU时间为何不与CUDA时间一致？ 

A：剖析器统计的CPU时间，不包含CPU等待同步的时间。

Q：剖析器有开销吗？会影响计时吗？ 

A：有轻微开销，但不影响大规模性能规律，微秒级精细计时可能受影响（课程场景无需关注）。

> 为什么Python能用于GPU编程？因为CPU可提前向GPU队列发送指令，与GPU解耦，不会成为瓶颈，兼顾便捷性和GPU利用率。

### 五、GPU内核编写（以GELU为例）—— 作业2核心铺垫

核心目标：通过「内核融合」优化性能，避免多次内存读写开销（类比“工厂一次性完成所有工序，不用反复运输原料”）。

GELU近似公式（所有实现均基于此，保证结果一致）：

`0.5 * x * (1 + tanh(math.sqrt(2/math.pi) * (x + 0.044715 * x³)))`

#### 5.1 4种GELU的实现方式+性能对比

#### 5.1.1 手写PyTorch版（原始方法，作为后续比较其他方法的标准）

- 实现：手写公式，包含多个独立操作（tanh、x³等）。
- 性能：8.1毫秒（最慢）。
- 问题：启动多个CUDA内核，内存读写开销大，无内核融合。

```python
import torch
import math

def manual_gelu(x: torch.Tensor):
    # 手动实现GELU，无内核融合，多个独立操作
    return 0.5 * x * (1 + torch.tanh(0.79788456 * (x + 0.044715 * x * x * x)))
```


#### 5.1.2 PyTorch原生版（最优选择，简单高效）

- 实现：调用torch.nn.functional.gelu，设置approximate=‘tanh’，与手写公式一致。
- 性能：1.1毫秒（最快）。
- 优势：自动内核融合，仅启动一个CUDA内核，无多余内存开销。

```python
import torch.nn.functional as F

def pytorch_gelu(x: torch.Tensor):
    # 原生实现，自动内核融合，approximate='tanh'匹配手写公式
    return F.gelu(x, approximate="tanh")
```


#### 5.1.3 CUDA版（C++编写，高性能）

- 实现：分CPU端（调度内核）和GPU端（执行计算）。
- 性能：1.8毫秒（接近原生版）。
- 优势：内核融合，可直接在Python中加载编译，无需命令行。

```python
import os
import torch
from torch.utils.cpp_extension import load_inline

def create_cuda_gelu():
    # 设置CUDA调试模式，便于定位错误
    os.environ["CUDA_LAUNCH_BLOCKING"] = "1"
```

    
    # CUDA内核代码（GPU端执行计算）

```cpp
    cuda_gelu_src = """
#include 
#include 
#include

__global__ void gelu_kernel(float* in, float* out, int num_elements) {
    // 计算当前线程的全局索引
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    // 越界检查，避免访问无效内存
    if (i         // GELU近似公式计算
        out[i] = 0.5 * in[i] * (1.0 + tanh(0.79788456 * (in[i] + 0.044715 * in[i] * in[i] * in[i])));
    }
}

// 计算向上取整（ceil(a / b)）
inline unsigned int cdiv(unsigned int a, unsigned int b) {
    return (a + b - 1) / b;
}

// CPU端封装函数，调度GPU内核
torch::Tensor gelu(torch::Tensor x) {
    TORCH_CHECK(x.device().is_cuda());  // 确保输入在GPU上
    TORCH_CHECK(x.is_contiguous());     // 确保内存连续
    torch::Tensor y = torch::empty_like(x);  // 分配输出空间（不置零）
    int num_elements = x.numel();        // 总元素数
    int block_size = 1024;               // 每个块的线程数
    int num_blocks = cdiv(num_elements, block_size);  // 块数量（向上取整）
    // 启动CUDA内核
    gelu_kernel>>(x.data_ptr(), y.data_ptr(), num_elements);
    C10_CUDA_KERNEL_LAUNCH_CHECK();  // 检查内核启动错误
    return y;
}
    """
```

    
    # C++接口声明，用于Python绑定

```text
    cpp_gelu_src = "torch::Tensor gelu(torch::Tensor x);"
```

    
    # 编译CUDA代码并绑定到Python模块

```text
    if not torch.cuda.is_available():
        return None
    module = load_inline(
        cuda_sources=[cuda_gelu_src],
        cpp_sources=[cpp_gelu_src],
        functions=["gelu"],
        extra_cflags=["-O2"],
        verbose=True,
        name="inline_gelu",
        build_directory="var/cuda_gelu",
    )
    # 返回Python可调用的GELU函数
    return getattr(module, "gelu")
```


# 调用示例

```text
cuda_gelu = create_cuda_gelu()
x = torch.randn(16384, device="cuda")
y = cuda_gelu(x)
```


#### 5.1.4 Triton版（Python编写，作业2重点）

Triton：OpenAI 2021年开发，Python抽象，自动管理内存合并、共享内存等细节，接近CUDA性能，调试友好（作业2核心工具）。

- 实现：分CPU端（调度）和Triton内核（计算），与CUDA结构类似。
- 性能：1.848毫秒（与CUDA基本一致）。
- 优势：Python编写，易上手，无需手动管理GPU底层细节。

```python
import torch
import triton

def triton_gelu(x: torch.Tensor):
    assert x.is_cuda  # 确保输入在GPU上
    assert x.is_contiguous()  # 确保内存连续
    y = torch.empty_like(x)  # 分配输出空间
    num_elements = x.numel()  # 总元素数
    block_size = 1024  # 块大小（线程数）
    num_blocks = triton.cdiv(num_elements, block_size)  # 块数量（向上取整）
    # 启动Triton内核
    triton_gelu_kernel[(num_blocks,)](x, y, num_elements, BLOCK_SIZE=block_size)
    return y
```


# Triton内核函数（@triton.jit装饰器编译为GPU机器码）
@triton.jit

```python
def triton_gelu_kernel(x_ptr, y_ptr, num_elements, BLOCK_SIZE: tl.constexpr):
    # 计算当前块的起始位置
    pid = tl.program_id(axis=0)
    block_start = pid * BLOCK_SIZE
    # 生成块内所有线程的偏移量
    offsets = block_start + tl.arange(0, BLOCK_SIZE)
    # 掩码：避免偏移量超出总元素数（处理非整除情况）
    mask = offsets  num_elements
    # 从全局内存加载数据（带掩码，避免越界）
    x = tl.load(x_ptr + offsets, mask=mask)
    # GELU计算（Triton无tl.tanh，用公式近似）
    a = 0.79788456 * (x + 0.044715 * x * x * x)
    exp = tl.exp(2 * a)
    tanh = (exp - 1) / (exp + 1)
    y = 0.5 * x * (1 + tanh)
    # 将计算结果写回全局内存
    tl.store(y_ptr + offsets, y, mask=mask)
```


# 调用示例

```text
x = torch.randn(16384, device="cuda")
y = triton_gelu(x)
```


#### 5.2 Q&A

Q：张量不连续会怎样？ 

A：代码有断言，会直接报错；多数情况下内存会连续分配，复杂操作（转置、视图）可在外部封装层处理。

Q：块大小怎么选？ 

A：需确保足够的块占满所有SM，简单逐元素操作（如GELU），块大小超过1024后影响不大。

Q：手写PyTorch版GELU慢的原因？ 

A：不是CPU与GPU的数据传输，而是多个独立CUDA内核导致的DRAM与SM之间的通信开销。

### 六、torch.compile 自动优化—— 懒人福音

#### 6.1 核心功能

PyTorch内置即时编译器，自动优化未优化的PyTorch代码（如内核融合），无需手动写CUDA/Triton，适合简单场景。

#### 6.2 性能对比

torch.compile版GELU耗时1.47毫秒，略优于手写CUDA/Triton，接近原生版；底层自动生成Triton代码，优化效果接近手动编写。

```python
import torch
import torch.nn.functional as F
```


# 定义未优化的GELU函数（与手写版一致）

```python
def manual_gelu(x):
    return 0.5 * x * (1 + torch.tanh(0.79788456 * (x + 0.044715 * x ** 3)))
```


# 使用torch.compile自动优化
compiled_gelu = torch.compile(manual_gelu)

# 测试性能

```text
x = torch.randn(16384, device="cuda")
y = compiled_gelu(x)  # 优化后的执行
```


#### 6.3 适用场景与局限性

- 优势：简单操作（算子融合、矩阵乘法）优化效果好，免费提升约10%速度，节省时间。
> FlashAttention 1、2、3 属于相当复杂的非平凡优化（non-trivial optimizations）；如今 torch.compile 和 Jax 的 XLA 编译器已经能够实现这些优化**，但这是因为我们事后才知道（in hindsight）这些是正确的优化方向 —— 并非编译器天生能识别，而是基于已知的优化思路实现的。

### 七、Triton版softmax

softmax比GELU复杂，包含归约操作（跨元素求和），需对矩阵每一行归一化，是作业2的重要铺垫。

#### 7.1 设计思路

每个块对应矩阵一行，块大小设为列数的下一个2的幂（确保容纳所有列），核心逻辑：加载行数据→减最大值（数值稳定）→指数运算→求和→归一化→写回。

#### 7.2 性能对比

- 手写版：3.7秒（极差，无内核融合）；
- torch.compile版：1.3秒（最优）；
- PyTorch原生版：1.5秒（较好）；
- Triton版：1.9秒（接近原生，易编写）。

```python
import torch
import triton
```


# 1. 手写版softmax（无内核融合，性能差）

```python
def manual_softmax(x: torch.Tensor):
    M, N = x.shape
    x_max = x.max(dim=1)[0]  # 每行最大值（MN reads, M writes）
    x = x - x_max[:, None]   # 减去最大值（MN+M reads, MN writes）
    numerator = torch.exp(x) # 指数运算（MN reads, MN writes）
    denominator = numerator.sum(dim=1)  # 每行求和（MN reads, M writes）
    y = numerator / denominator[:, None]  # 归一化（MN reads, MN writes）
    return y
```


# 2. PyTorch原生版softmax

```python
def pytorch_softmax(x: torch.Tensor):
    return torch.nn.functional.softmax(x, dim=-1)
```


# 3. Triton版softmax（内核融合，性能优）

```python
def triton_softmax(x: torch.Tensor):
    y = torch.empty_like(x)
    M, N = x.shape  # M：行数，N：列数
    block_size = triton.next_power_of_2(N)  # 块大小设为列数的下一个2的幂
    num_blocks = M  # 每个块对应一行
    # 启动Triton内核
    triton_softmax_kernel[(M,)](
        x_ptr=x, y_ptr=y,
        x_row_stride=x.stride(0), y_row_stride=y.stride(0),
        num_cols=N, BLOCK_SIZE=block_size
    )
    return y
```


# Triton softmax内核函数
@triton.jit

```python
def triton_softmax_kernel(x_ptr, y_ptr, x_row_stride, y_row_stride, num_cols, BLOCK_SIZE: tl.constexpr):
    assert num_cols  BLOCK_SIZE
    row_idx = tl.program_id(0)  # 每个块处理一行
    col_offsets = tl.arange(0, BLOCK_SIZE)  # 块内列偏移量
    # 计算当前行的起始地址
    x_start_ptr = x_ptr + row_idx * x_row_stride
    x_ptrs = x_start_ptr + col_offsets
    # 加载当前行数据，掩码处理越界
    x_row = tl.load(x_ptrs, mask=col_offsets  num_cols, other=float("-inf"))
    # softmax核心计算
    x_row = x_row - tl.max(x_row, axis=0)  # 数值稳定：减去每行最大值
    numerator = tl.exp(x_row)              # 指数运算
    denominator = tl.sum(numerator, axis=0)# 归约求和
    y_row = numerator / denominator        # 归一化
    # 写回结果
    y_start_ptr = y_ptr + row_idx * y_row_stride
    y_ptrs = y_start_ptr + col_offsets
    tl.store(y_ptrs, y_row, mask=col_offsets  num_cols)
```


# 4. torch.compile优化版softmax
compiled_softmax = torch.compile(manual_softmax)

# 调用示例

```text
x = torch.randn(1024, 16384, device="cuda")
y1 = manual_softmax(x)
y2 = pytorch_softmax(x)
y3 = triton_softmax(x)
y4 = compiled_softmax(x)
```


### 八、课程总结

#### 8.1 核心知识点总结

- 工具：基准测试（测速度）、性能剖析（找瓶颈）、Nsight Systems（作业2必用，CPU/GPU时序可视化）。
- 内核编写：CUDA（C++，高性能，需手动管理细节）、Triton（Python，易上手，作业2核心）；内核融合是性能关键。
- 自动优化：torch.compile适合简单场景，复杂优化（如FlashAttention）需手动写内核。

#### 8.2 作业2重点提示

- 必须使用Nsight Systems进行性能剖析，定位内核瓶颈。
- 核心任务是实现FlashAttention-2的Triton内核，可直接参考本节课GELU和softmax的Triton实现思路（块设计、掩码处理、归约操作）。
- 重点关注“内核融合”和“内存优化”，避免不必要的内存读写开销。

本轮课程代码链接：
