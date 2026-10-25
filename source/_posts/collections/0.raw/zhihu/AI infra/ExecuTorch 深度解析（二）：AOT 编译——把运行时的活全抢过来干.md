---
title: "ExecuTorch 深度解析（二）：AOT 编译——把运行时的活全抢过来干"
date: "2026-05-04 00:00:00"
updated: "2026-05-04 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/AI-infra/ExecuTorch-深度解析(二)-AOT-编译——把运行时的活全抢过来干/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2034782380385359322"
---


系列第二篇。上一篇讲了 Meta 为什么造 ExecuTorch，这篇深入拆解它最核心的武器：AOT 编译到底干了什么，怎么做到让运行时只剩 50KB。

<strong>从一个反直觉的数字开始</strong>
ExecuTorch 运行时 50KB。TFLite 几 MB，ONNX Runtime Mobile 几 MB，PyTorch Mobile 旧版十几 MB。甚至一张 JPEG 图片都有 300KB。

50KB 连一张图都装不下，却能跑一个完整的神经网络推理。

答案不是什么压缩黑科技。答案是一个朴素到近乎无聊的思路：<strong>运行时该干的活，编译时全干完了</strong>。

但"全干完了"这三个字的含金量，远比你想的重。让我们一步步展开。

<strong>推理运行时最少需要做什么</strong>
一个推理框架在运行时<strong>最少</strong>得做什么？拆到最底层就三件事：加载模型拿到计算图和权重、对每个算子找到对应的函数、按顺序调这些函数传递中间结果。

就这三件。

那传统框架的运行时为什么那么大？因为它们在运行时干了一大堆"可以提前做但没做"的事。我列一下你感受一下：

<strong>计算图构建</strong>——运行时解析模型文件，构建内存中的图结构。但这个图在编译时已经完全确定了，为什么要到运行时再建一遍？

<strong>算子分解</strong>——把 `batch_norm` 这种大算子拆成 `add/mul/div` 基本操作。拆完的结果是固定的，为什么不提前拆？

<strong>类型推断</strong>——运行时推断每个张量的 dtype 和 shape。但编译时通过 trace 已经知道了每个节点的精确类型和形状。

<strong>动态内存分配</strong>——运行时用 malloc 给输出张量分配内存。但编译时已经知道所有张量的大小和生命周期，完全可以提前规划好。

<strong>算子注册表查找</strong>——运行时通过字符串 "aten::add" 在 hash map 里找对应的内核函数。但编译时就知道模型里用了哪些算子，完全可以提前把函数指针绑好。

<strong>后端分区</strong>——运行时决定哪些算子交给 NPU。但编译时有完整的图结构信息，分区决策可以做得更优。

每一个"运行时做的事"都能搬到编译时。传统框架之所以没搬，是因为 JIT（Just-in-Time）曾是主流——运行时拿到模型再动态优化，理论上可以适应更多场景。

但在端侧，JIT 是反模式。你在最弱的硬件上跑最复杂的编译逻辑，这本身就是不合理的资源分配。

<strong>ExecuTorch 的编译流水线：一步步走</strong>
ExecuTorch 的 AOT 编译器叫 EXIR（ExecuTorch IR）。它不是一步从 PyTorch 模型蹦到 .pte 文件，而是经过一条精心设计的流水线，每一步只做一类事。我在这里先走一遍全貌，第三篇会再逐层深入。

<strong>Step 0: torch.export()——把 nn.Module 变成纯函数</strong>
一切从 `torch.export()` 开始。它接收一个 `nn.Module`，通过 trace 把 `forward()` 变成一个纯函数式的 FX GraphModule——就是一张有向无环图（DAG），每个节点是一个算子调用，边是张量数据流。

import torch
​

```python
class MyModel(torch.nn.Module):
    def forward(self, x):
        x = self.conv1(x)
        x = torch.relu(x)
        x = self.conv2(x)
        return x
```

​
# trace 捕获计算图
exported = torch.export.export(MyModel(), (dummy_input,))
# exported 是一个 ExportedProgram，包含 FX GraphModule + 元信息
这一步做了件重要的事——<strong>函数化</strong>。原始代码里可能有原地修改（`x.add_(1)`）和别名共享（`y = x.view(-1)`），函数化把它们全部变成纯函数操作。为什么？因为后续的编译器 Pass 需要安全的假设：每个节点没有副作用，每个张量独占内存。有了这个前提，编译器才敢大胆地重排、融合、删除算子。

<strong>Step 1: 算子分解——大算子拆成基本积木</strong>
export 出来的图里有各种"大"算子——`batch_norm`、`layer_norm`、`softmax`、`gelu`。这些算子在 GPU 上跑得很好，但端侧硬件不一定认识它们。

EXIR 做的第一件事是<strong>分解</strong>——把这些大算子拆成一个约 170 个的基本操作集。

# 分解前
y = torch.nn.functional.batch_norm(x, weight, bias, running_mean, running_var)
​
# 分解后

```text
inv_std = 1.0 / torch.sqrt(running_var + eps)
x_norm = (x - running_mean) * inv_std
y = weight * x_norm + bias
```

为什么要拆？两个原因。

<strong>硬件覆盖率</strong>。端侧硬件百花齐放，NPU 可能不认识 `batch_norm`，但几乎所有硬件都认识 `add/mul/sub/div`。分解后天然适配更多硬件。

<strong>后端优化空间</strong>。听起来矛盾——拆了不就丧失了融合的机会吗？不是。分解后的细粒度图给后端更多重组的自由。XNNPACK 后端可以把分解后的 `matmul + bias_add` 重新融合成一条 `addmm` 指令；CoreML 后端可能选择保留某些高层算子不分解。分解是"先拆散再让后端按需重组"，比"保持原样让所有后端都迁就原始结构"更灵活。

有个有意思的细节。不是所有算子都该被分解。XNNPACK 直接支持 `addmm`，如果你把它拆成 `matmul + add`，后端还得重新融合回去，多此一举。ExecuTorch 用了一个叫 `EDGE_DO_NOT_DECOMP` 的特殊命名空间——把不想分解的算子藏在里面，标准分解表找不到就自然保留了。源码在 `exir/program/_program.py` L124-131。代码注释里多次承认这是 tech debt，但它确实管用，XNNPACK 和 CoreML 后端都在用这个机制。

<strong>Step 2: dtype 特化 + 内存格式标注</strong>
分解完之后，每个算子还是泛型的——`aten::add` 接受任何 dtype 的输入。但实际推理时 dtype 是确定的。

EXIR 做的第二件事是<strong>具象化</strong>——通过 `OpReplacePass` 把泛型算子替换为特化版本：

# 特化前
aten::add(Tensor self, Tensor other) -> Tensor
​
# 特化后
aten::add.float32(float32 self, float32 other) -> float32
同时，`MemoryFormatOpsPass` 为每个张量标注内存格式（dim order）——NCHW 还是 NHWC。这决定了数据在内存中的排列方式。PyTorch 默认 NCHW，但很多 NPU（如 Qualcomm Hexagon）期望 NHWC。编译时就标注好，运行时不需要做任何格式转换。

这一步的产出叫 <strong>Edge Dialect</strong>。它是整个编译器最关键的分层点——引入了硬件相关的约束（dtype、内存格式），但仍然不绑定任何特定硬件。需要适配不同硬件时，从这里分叉就行，不用重新分解算子。

<strong>Step 3: 后端委托——哪些算子交给 NPU</strong>
Edge Dialect 的图里，有些算子可以交给 NPU/GPU 加速，有些只能跑在 CPU 上。谁决定这个分界线？<strong>Partitioner</strong>。

Partitioner 遍历 FX 图，为可委托的节点打标签 `node.meta["delegation_tag"]`。注意，它只打标签，不修改图结构——这个约束是刻意的，保证分区决策不影响图的正确性。

然后按标签提取子图，交给对应后端的 `BackendDetails.preprocess()` 编译成二进制 blob。XNNPACK 后端编译出 XNNGraph FlatBuffer，CoreML 后端编译出 CoreML 模型，CUDA 后端编译出 AOTInductor 产物。

# 后端委托流程（简化）

```text
partitioner = XnnpackPartitioner()
tagged_graph = partitioner.partition(edge_dialect_graph)  # 打标签
for subgraph in extract_subgraphs(tagged_graph):          # 提取子图
    blob = backend.preprocess(subgraph)                    # 编译成 blob
    replace_with_delegate_call(subgraph, blob)             # 替换为 delegate 调用
to_backend()` 函数用 Python 的 `singledispatch` 实现多态分发——传 backend_id 直接编译、传 Partitioner 先分区再编译、传多方法规格批量处理，统一入口不同行为。
```


<strong>Step 4: ToOutVarPass——函数式变 out-variant，消灭动态分配</strong>
这一步是降阶过程中最关键的一步。

在此之前，图里的算子都是函数式风格——输出通过返回值传递：

%3 = aten::add(%1, %2)   # 返回新张量
函数式风格优雅，但有一个致命问题：<strong>返回新张量 = 需要分配内存</strong>。运行时得给 `%3` 分配一块新内存。对端侧来说，动态分配是禁忌。

ToOutVarPass` 把所有函数式算子转为 out-variant 风格——输出通过预分配的缓冲区传入：

%buf = memory.alloc(size=[1,64,112,112], dtype=float32)  # 预分配
aten::add.out(%1, %2, out=%buf)                          # 写入预分配缓冲区
memory.alloc` 节点只声明大小，不分配内存。真正的分配由下一步的 `MemoryPlanningPass` 完成。

这个转换让运行时完全不需要动态分配——算子函数签名从 `Tensor add(Tensor, Tensor)` 变成了 `void add(Tensor, Tensor, Tensor& out)`，调用者（运行时）提前准备好 `out`，算子只管往里写。

代价是 API 变丑了——每个算子都要显式传 out 参数。但对端侧来说，内存可控性比 API 美观重要得多。这是一个"丑但正确"的设计取舍。

<strong>Step 5: MemoryPlanningPass——给每个张量安排座位</strong>
ToOutVarPass` 产出了大量 `memory.alloc` 节点，声明了每个张量的大小但没分配实际内存。`MemoryPlanningPass` 完成最后一步——给每个张量分配具体的内存偏移量。

它做的事情类似于操作系统的内存管理，但更简单——因为编译时已经知道所有张量的<strong>完整生命周期</strong>。

# 张量生命周期示例
# tensor_a: 第 1-5 条指令使用
# tensor_b: 第 3-8 条指令使用
# tensor_c: 第 6-10 条指令使用
​
# tensor_a 和 tensor_c 生命周期不重叠 → 可以复用同一块内存
# 内存规划结果：
# offset 0-602111:     tensor_a (第 1-5 步) / tensor_c (第 6-10 步)
# offset 602112-...:   tensor_b (第 3-8 步)
ExecuTorch 支持两种规划算法：naive（每个张量独立分配）和 greedy（尽可能复用），自动对比选最优。

更精妙的是<strong>跨方法共享</strong>。同一个模型可能有 `forward()` 和 `validate()` 两个方法，它们的中间结果用同一个内存竞技场（`mem_id=1`），但持久状态（如 KV Cache）用独立的竞技场（`mem_id=2`）隔离。这保证了多个方法之间不会互相踩内存。

源码在 `exir/passes/memory_planning_pass.py` L291-317。

<strong>Step 6: 序列化——产出 .pte 文件</strong>
所有变换完成后，EXIR 用 FlatBuffer 把结果序列化为 `.pte` 文件。里面装着：

- <strong>指令数组</strong>——KernelCall（带缓存的函数指针 key）和 DelegateCall（带后端 blob）
- <strong>值表</strong>——所有 EValue（张量描述、标量、常量），张量的 data 指向编译时规划好的偏移量
- <strong>内存规划信息</strong>——每个缓冲区的起始偏移、大小、所属 mem_id
- <strong>权重数据</strong>——模型参数，直接嵌入
- <strong>后端 blob</strong>——硬件特定的编译产物
- <strong>调试信息</strong>（可选）运行时加载 .pte 时不需要解析计算图、不需要优化、不需要分配内存——直接把 FlatBuffer 数据映射到内存，读指令数组，逐条执行。

<strong>走一遍完整例子：一个 conv → relu → linear 模型</strong>
光说理论不够直观，让我们用一个微型模型走一遍完整流程。

```python
class TinyModel(nn.Module):
    def forward(self, x):
        x = self.conv(x)          # conv2d
        x = torch.relu(x)         # relu
        x = self.linear(x)        # linear = addmm
        return x
```

<strong>ATen Dialect（export 后）</strong>：

%1 = placeholder[input]
%2 = placeholder[conv_weight]
%3 = placeholder[conv_bias]
%4 = aten::conv2d(%1, %2, %3)
%5 = aten::relu(%4)
%6 = placeholder[linear_weight]
%7 = placeholder[linear_bias]
%8 = aten::addmm(%7, %5, %6)    # linear = bias + input @ weight
语义完整，保持原始结构。

<strong>Core ATen（分解后）</strong>：

%4 = aten::conv2d(%1, %2, %3)    # conv2d 保留（基本操作）
%5 = aten::relu(%4)              # relu 保留（基本操作）
%8 = aten::addmm(%7, %5, %6)    # addmm 保留（基本操作）
这个模型用的都是基本操作，分解没有变化。但如果你用了 `batch_norm`，就会看到它被拆成 `add/mul/sub/div`。

<strong>Edge Dialect（特化后）</strong>：

%4 = aten::conv2d.float32(float32, float32, float32) -> float32
%5 = aten::relu.float32(float32) -> float32
%8 = aten::addmm.float32(float32, float32, float32) -> float32
dtype 确定为 float32，dim order 标注为 NCHW。从此以后不需要类型推断。

<strong>Backend Dialect（out-variant + 内存规划）</strong>：

%buf1 = memory.alloc([1,32,112,112], float32)   # conv 输出
%buf2 = memory.alloc([1,32,112,112], float32)   # relu 输出（可复用 buf1）
%buf3 = memory.alloc([1,10], float32)           # linear 输出
​

```text
aten::conv2d.out(%1, %2, %3, out=%buf1)
aten::relu.out(%buf1, out=%buf2)
aten::addmm.out(%7, %buf2, %6, out=%buf3)
```

​
# 内存规划结果：
# buf1: offset=0, size=1605632
# buf2: offset=0, size=1605632  ← 复用 buf1！conv 输出和 relu 输出不会同时存在
# buf3: offset=1605632, size=40
注意 buf1 和 buf2 复用了同一块内存——conv 的输出被 relu 消费完就不再需要了，relu 可以直接写入同一块缓冲区。这是内存规划的核心收益。

<strong>对比：同一个 add，不同框架运行时各干了多少活</strong>
理论讲完了，用最简单的 `add` 算子对比一下就清楚了。

<strong>PyTorch Mobile（旧版）</strong>：接收请求 → JIT 编译 add（第一次遇到的话）→ 推断输出 dtype 和 shape → malloc 分配输出内存 → hash map 查找 "aten::add" → 调用 → 返回。七步。

<strong>TFLite</strong>：解析 FlatBuffer → 构建算子执行图 → 查找 add 内核 → 推断输出 shape → 分配输出 tensor → 调用 → 返回。七步。

<strong>ExecuTorch</strong>：读下一条指令 KernelCall(add, inputs, output_buffer) → 调已经缓存好的函数指针。两步。

类型推断？编译时做了。内存分配？编译时做了。内核查找？加载时做了并缓存。运行时只需要调那个函数指针。

<strong>AOT 的代价</strong>
公平起见，也得说清楚代价。

<strong>编译慢</strong>。AOT 编译可能要几秒到几分钟。对端侧来说不是问题——模型更新不频繁，编译在开发机上完成。但如果你需要运行时动态加载新模型，这套机制就不适用了。

<strong>丧失运行时灵活性</strong>。不能动态改计算图、不能根据实际输入做运行时优化。端侧工作负载通常固定（一个模型、一种输入格式），影响不大。但如果你想做 dynamic batching 或者运行时量化校准，AOT 就力不从心了。

<strong>调试困难</strong>。编译时做了分解、特化、out-variant 转换、内存规划……如果最终推理结果不对，你很难追溯到是哪一步引入的误差。ExecuTorch 有 DevTools——ETRecord（编译时记录三层图）、ETDump（运行时采集调试数据）、Inspector（关联两者做分析）——但调试体验仍不如 PyTorch 原生。

<strong>AOT 的本质</strong>
抽掉具体实现，AOT 的本质就一句话：<strong>在最强的硬件上做最复杂的活，在最弱的硬件上做最简单的活</strong>。

这和 C 编译器一模一样。编译器在 i9 上做寄存器分配、指令调度、死代码消除、循环展开，生成的机器码直接由 CPU 执行。CPU 不需要知道什么是"循环展开"，它只需要执行 `ADD R1, R2`。ExecuTorch 的运行时就是那个 CPU——不需要知道什么是"算子分解"或"内存规划"，只需要调用 `kernel_fn_(context, args)`。

端侧设备擅长简单重复的计算、低功耗执行、确定性延迟。不擅长复杂的编译优化、动态分析、灵活的内存管理。AOT 就是让每种硬件做它擅长的事。

ExecuTorch 不是第一个用 AOT 的框架——TFLite 也有 AOT 编译能力。但 ExecuTorch 把 AOT 做到了极致——不仅算子分解和优化在编译时，连内存规划、内核分派 key、后端分区都在编译时。运行时真正只做"遍历指令数组调用函数指针"。这种一致性贯彻是它区别于其他框架的关键。

下一篇拆四层 IR 降阶——为什么不能一步到位，为什么 ATen → Core ATen → Edge → Backend 是四层而不是一层。系列持续更新。