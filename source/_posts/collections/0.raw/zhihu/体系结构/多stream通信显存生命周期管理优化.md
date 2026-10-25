---
title: 多stream通信显存生命周期管理优化
date: "2025-02-27 00:00:00"
updated: "2025-02-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/多stream通信显存生命周期管理优化/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/26029380528
---


作者：GRJ, SP from NDS-Group@Shanghai AI Lab

### TL/DR:

在训练 InternLM2-20B 模型时，由于使用 InternEvo 框架时用到 `recordStream` 来实现并行策略，有异常的显存过高的问题。通过对比显存占用曲线发现，InternEvo 中 `all_gather` 操作的临时显存生命周期过长，导致部分显存未能及时释放，从而引发峰值显存占用的增加。进一步调研表明，FSDP2 在显存管理中未采用 `recordStream` 技术，而是通过手动同步机制实现显存释放管理，因此不会出现异常显存的情况。在 InternEvo 框架中，通过设置环境变量，可以使当前 stream 的操作完成后立即释放对应的显存资源，从而显著降低训练过程中的显存峰值占用。这一改进在大规模模型训练中具有重要的实际意义，有助于更高效地利用显存资源。

**InternEvo： [https://github.com/InternLM/InternEvo](https://link.zhihu.com/?target=https%3A//github.com/InternLM/InternEvo)
### 1. 问题背景

在使用 InternEvo 框架训练 InternLM2-20B 模型时，采用权重并行（Weight Parallelism, WP）策略，在 64 张 A100 GPU 上进行训练，开启 `wp=64`。训练过程中显存变化趋势如图 1 所示：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_91d6448ebec1.jpg)

图 1：开启 wp=64 时， InternLM2-20B 模型在 64 张 A100 GPU上用 InternEvo 框架训练的显存变化趋势在前半部分的前向传播（forward）阶段，显存占用主要来源于切分的线性层（linear）权重引入的 `all_gather` 通信以及计算产生的激活值（activations）。在 forward 阶段结束后，由于 `all_gather` 操作的临时显存被释放，仅保留 activations 部分，这对应于显存变化曲线中短暂的平稳区域。随后，在反向传播（backward）阶段，activations 部分的显存逐渐被释放。然而，由于 `all_gather` 通信产生的临时显存在 backward 开始时仍未及时释放，导致在 backward 初期显存占用继续上升。直至 `all_gather` 的临时显存完全释放后，显存占用才呈现出随 activations 释放而逐步下降的趋势。

由此可见，`all_gather` 操作的临时显存生命周期较长，未能及时释放，直接导致训练过程中的峰值显存占用较高。

相比之下，使用 FSDP2 框架对 InternLM2-20B 进行训练时，采用 64 张 A100 GPU，开启 ZeRO3，并将选择性检查点（selective checkpointing）粒度设置为 ops（默认每隔两个 `aten.mm` 进行一次 recompute）。其显存变化趋势如图 2 所示：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0d032522e47c.jpg)

图 2：开启 ZeRO3 时，InternLM2-20B 模型在 64 张 A100 GPU 上用 FSDP2 框架训练的显存变化趋势。从图 2 中可以观察到，在 forward 阶段，`all_gather` 操作所产生的临时显存占用时间较短，并在使用后及时释放。整个训练过程中，显存占用呈现出近乎理想的金字塔形态，显存峰值显著低于使用 InternEvo 的训练方式。综上，通过对比可以发现，`all_gather` 操作的显存释放机制是影响显存峰值占用的关键因素。在 FSDP2 框架中，`all_gather` 临时显存能够快速释放，从而显著优化了显存使用效率，为大规模模型的高效训练提供了更优的解决方案。

### 2. 问题定位过程

我们使用单机 8 卡，对 InternEvo 训练 InternLM2-7B 模型做测试对比实验，WP并行，设置`wp=8`。显存占用图 3 如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_29d14eb19867.jpg)

图 3：wp=8 时，在单机 8 卡上用 InternEvo 训练 InternLM2-7B 模型时的显存占用。其中，在 forward 阶段，`all_gather`通信使用的临时显存在经历了 4 个 layer 左右才被释放，而 backward 阶段，`all_gather`占用的显存要经历 8 个 layer 左右才被释放。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_57d5ac8aa582.jpg)

图 4：wp=8 时，在单机 8 卡上用 InternEvo 训练 InternLM2-7B 模型时，不同阶段下的显存占用。
下面详细分析一下`all_gather`的代码流程。

在 `_all_gather_module_weight` 函数中，通过 `all_gather_raw` 实现对模型参数的异步 `all_gather` 通信操作。该函数不仅返回 `all_gather` 操作的计算结果，还返回一个用于控制和引用异步执行的 `all_gather_raw` 操作的句柄（`weight_handle`）。`weight_handle` 的主要作用是管理异步通信的生命周期和状态。

在函数执行过程中，所有的 `weight_handle` 会统一存储在全局变量 `_weight_global_handle` 字典中。这一设计的目的，是便于在后续操作中集中管理异步通信的句柄。例如在需要显式同步或检查操作状态时，进行统一调用。通过这种方式，可以高效地协调多个异步通信任务，避免资源冲突，同时优化通信性能。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f54aab4109cb.jpg)

图 5：all_gather 部分代码展示在 `_wait_handle` 函数中，通过从全局变量 `_weight_global_handle` 中取出与指定模块对应的 `all_gather` 操作句柄（`handle`），调用 `handle.wait()` 方法，显式等待异步 `all_gather` 操作的完成。只有在确保 `all_gather` 操作已完成的情况下，才能安全释放 `all_gather_raw` 函数中通过第 225 行 `torch.empty` 申请的临时显存。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_949fdff6b656.jpg)

图 6：_wait_handle 函数代码展示在权重并行（Weight Parallelism, WP）的通信过程中，除了前向传播（forward）阶段的 `all_gather` 通信外，反向传播（backward）阶段还需要进行 `reduce_scatter` 通信，以确保梯度的正确分布和更新。
通过显存图分析，发现 `reduce_scatter` 通信操作占用的临时显存释放周期较长，这可能会导致显存峰值占用过高，并影响训练过程中的显存效率。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_214fa171c4c9.jpg)

图 7：wp=8时，单机 8 卡上用 InternEvo 训练 InternLM2-7B 模型时各阶段的显存情况。在反向传播（backward）处理流程中，可以看到图 7（a）中的 `linear_backward_op` 函数返回的 `grad_weight` 被传入到`communicator.grad_hook` 中，进行异步的 `reduce_scatter` 通信处理。如图 7（b）中 所示，对应的操作句柄被存储在 `reduce_scatter_handlers` 字典中，以便在后续过程中进行管理。当某个梯度桶（bucket）中存储的参数大小超过预设的 `reduce_bucket_size` 阈值（默认为 512MB）时，系统会调用 `_accum_grads_store_in_bucket` 函数，对 `reduce_scatter_handlers` 进行清理。这一清理过程确保了显存资源得到及时释放，并为下一轮的梯度累积操作做好准备。

在显存图中，这一过程对应于蓝色带状显存部分的变化，即图 7（c）。在调用 `reduce_grad_hook` 时，执行上述的 `reduce_scatter` 显存清理操作。清理完成后，系统继续进行下一轮梯度累积，直到梯度桶再次达到设定的大小阈值。此过程会循环往复，确保显存的高效利用，并最大程度地避免因显存滞留而导致的训练效率下降。
显存堆栈中，对应的`reduce_scatter`部分代码如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e0d4b5ef1bf7.jpg)

图 8：reduce_scatter 部分代码。
综合上述分析，我们发现当前显存管理存在以下几个问题：

- 在前向传播（forward）和反向传播（backward）过程中，`all_gather` 阶段的显存占用未能及时释放，导致显存资源滞留，从而增加了峰值显存的占用。
- 在反向传播过程中，`reduce_scatter` 通信的显存释放存在延迟。具体而言，显存的释放直到梯度桶（bucket）填满并触发清理操作后才会进行，这种延迟释放机制导致显存峰值过高，影响了整体显存的利用效率。

### 3. 问题解决

#### 3.1. CUDA 异步通信概述

CUDA 异步通信操作（如`all_gather`）是分布式训练中常见的操作之一，主要用于在多个 GPU 之间收集并同步数据。尽管这些操作本身是异步执行的，但在其执行过程中，GPU 显存会临时存储中间数据。这是因为在数据收集过程中，每个 GPU 不仅需要存储自己的数据，还需要存储从其他 GPU 接收到的数据，直到所有数据成功收集并整合完成。

CUDA 采用动态内存管理机制，即内存的分配与释放是动态进行的。在异步操作（如`all_gather`）完成后，理论上占用的显存应当被释放。然而，由于 CUDA 的内存管理策略，这些内存可能不会立即返回到可用内存池中，而是被保留在 GPU 缓存中，以便快速响应未来的内存请求。

当异步操作（如`all_gather`）完成后，调用`torch.cuda.empty_cache()`虽然能够释放未被引用的缓存，但显存占用（通过nvidia-smi显示）可能并不会立即减少。这是因为`torch.cuda.empty_cache()`仅释放了 PyTorch 缓存分配器中的未使用内存，而异步操作可能仍在等待完成。为了确保所有异步操作完全完成，可以调用`torch.cuda.synchronize()`，它将强制所有异步操作完成，从而确保显存被彻底释放，显著减少显存占用。

`torch.cuda.synchronize()`是一个PyTorch函数，用于同步CUDA设备，确保当前设备上所有排队的内核与内存拷贝操作完成。这对于显存管理至关重要，因为它强制执行所有未完成的异步操作，包括内存释放操作。如果不调用`torch.cuda.synchronize()`，异步操作可能仍在等待队列中，因此占用的显存尚未标记为可释放。通过调用`torch.cuda.synchronize()`，可以强制完成这些操作，确保显存得以及时释放，进而优化显存资源的管理，尤其在显存有限的情况下尤为重要。

#### 3.2. `all_gather`显存占用优化

我们首先尝试通过使用`torch.cuda.synchronize()`来确保异步通信操作所占用的显存能够及时释放。在WP并行策略中，`linear`层的计算需要进行`all_gather`通信，随后进行注意力（attention）计算。为了确保`all_gather`操作完成后占用的临时显存能够及时释放，我们在注意力计算的前后分别添加了`torch.cuda.synchronize()`。这样做可以强制同步异步通信操作，确保在进行后续计算前，显存得到有效回收。以下是代码更改的具体内容：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_51beabcfb496.jpg)

图 9：注意力计算的前后添加 torch.cuda.synchronize() 代码。代码更改之后，重新启动 InternLM2-7B 模型训练，显存图如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_65b6dd5865e3.jpg)

图 10：all_gather 显存占用优化后的效果。通过使用`torch.cuda.synchronize()`，我们能够确保`all_gather`通信操作占用的临时显存得到及时释放，同时显存峰值得以降低，从约 22GB 减少至约 20GB。然而，在反向传播过程中，`reduce_scatter`通信部分的显存生命周期仍然较长。这一优化仅对前向传播流程有效，因为该类继承自`nn.Module`，而反向传播流程则由 PyTorch 默认处理。因此，针对反向传播中`reduce_scatter`部分的显存占用，我们需要进一步进行优化。

另一方面，`torch.cuda.synchronize()`的调用可能会对训练性能产生一定影响。由于`torch.cuda.synchronize()`会阻塞调用线程，直到所有在 CUDA 设备上排队的操作完成执行，尤其是在 GPU 资源未被充分利用时，这可能导致性能下降。如果 GPU 正在执行一个耗时的操作，而 CPU 在等待 GPU 完成时，这会造成 CPU 资源的浪费。频繁调用`torch.cuda.synchronize()`可能引发显著的性能开销，因为它会中断 CPU 与 GPU 之间的异步执行流程，从而减少并行性并降低流水线效率。

因此，在生产环境中，尤其是在性能敏感的应用场景下，应谨慎使用`torch.cuda.synchronize()`，并考虑寻找可能的替代方案以优化训练过程的效率。

#### 3.3. PyTorch 框架 recordStream 机制

我们在 FSDP 的 per-parameter-sharding 特性中（[https://github.com/pytorch/pytorch/issues/114299](https://link.zhihu.com/?target=https%3A//github.com/pytorch/pytorch/issues/114299)），了解到 FSDP 使用了手动同步的显存管理机制，没有使用 PyTorch 默认的`recordStream`方式管理显存。这促使我们进一步深入学习 `recordStream` 显存管理机制与手动显存管理的原理以及差异。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_9d4ac4e466aa.jpg)

图 11：FSDP 官方的显存管理机制说明。在 FSDP 的 per-parameter-sharding 特性中（[https://github.com/pytorch/pytorch/issues/114299](https://link.zhihu.com/?target=https%3A//github.com/pytorch/pytorch/issues/114299%25EF%25BC%2589%25EF%25BC%258C%25E6%2588%2591%25E4%25BB%25AC%25E4%25BA%2586%25E8%25A7%25A3%25E5%2588%25B0FSDP%25E9%2587%2587%25E7%2594%25A8%25E4%25BA%2586%25E6%2589%258B%25E5%258A%25A8%25E5%2590%258C%25E6%25AD%25A5%25E7%259A%2584%25E6%2598%25BE%25E5%25AD%2598%25E7%25AE%25A1%25E7%2590%2586%25E6%259C%25BA%25E5%2588%25B6%25EF%25BC%258C%25E8%2580%258C%25E6%259C%25AA%25E4%25BD%25BF%25E7%2594%25A8PyTorch%25E9%25BB%2598%25E8%25AE%25A4%25E7%259A%2584%2560recordStream%2560%25E6%2596%25B9%25E5%25BC%258F%25E6%259D%25A5%25E7%25AE%25A1%25E7%2590%2586%25E6%2598%25BE%25E5%25AD%2598%25E3%2580%2582%25E8%25BF%2599%25E4%25B8%2580%25E5%258F%2591%25E7%258E%25B0%25E4%25BF%2583%25E4%25BD%25BF%25E6%2588%2591%25E4%25BB%25AC%25E6%25B7%25B1%25E5%2585%25A5%25E6%258E%25A2%25E8%25AE%25A8%2560recordStream%2560%25E6%2598%25BE%25E5%25AD%2598%25E7%25AE%25A1%25E7%2590%2586%25E6%259C%25BA%25E5%2588%25B6%25E4%25B8%258E%25E6%2589%258B%25E5%258A%25A8%25E6%2598%25BE%25E5%25AD%2598%25E7%25AE%25A1%25E7%2590%2586%25E7%259A%2584%25E5%258E%259F%25E7%2590%2586%25E5%258F%258A%25E5%2585%25B6%25E5%25B7%25AE%25E5%25BC%2582%25E3%2580%2582))，我们了解到 FSDP 采用了手动同步的显存管理机制，而未使用 PyTorch 默认的`recordStream`方式来管理显存。这一发现促使我们深入探讨`recordStream`显存管理机制与手动显存管理的原理及其差异。

在 PyTorch 中，NCCL 通信操作通过`recordStream`机制来确保数据的一致性与安全性。具体来说，当一个 Tensor 在 worker stream 上被创建并用于多个 NCCL 流时，它必须记录这些 NCCL 流，以防止在集体操作完成之前该 Tensor 被提前释放。这种机制延长了 Tensor 的生命周期，并确保数据在多 GPU 间传输时的一致性，但也导致了显存占用的增加。

为了优化显存管理，`TORCH_NCCL_AVOID_RECORD_STREAMS`环境变量提供了一种方案。当该变量设置为 1 时，PyTorch 在执行 NCCL 通信操作时将避免记录流（record streams）。这一优化措施可以减少 CPU 的轮询开销，因为不需要不断地检查操作是否完成，从而可能提升性能。然而，尽管此优化可以降低显存使用，它也可能带来一些负面影响。避免记录流可能会增加显存安全风险，因为如果在操作完成前释放了显存，可能会导致数据不一致或程序崩溃。因此，开发者需要更精确地管理显存的生命周期，确保在 NCCL 操作完成之前不会释放或重用相关的 Tensor 显存。

关于`recordStream`机制的更深入分析，读者可以参考此文献：[深入分析 recordStream 显存管理机制](https://zhuanlan.zhihu.com/p/671834539)。

#### 3.4. `reduce_scatter`显存占用优化

我们对`reduce_scatter`的显存释放流程进行了修改，引入了`early_release`功能选项。在原有的机制基础上，当`reduce_bucket_size`填满后释放`reduce_scatter`占用的显存之外，我们新增了提前释放的机制。具体而言，在调用`reduce_scatter_raw`之后，将返回的处理句柄添加到`_early_curr_layer_rs_handles`列表中。在同步参数的钩子函数中，我们注册了提前释放`reduce_scatter`显存的功能，并通过调用`handle.wait()`来等待当前线程的异步操作完成，确保在操作执行完毕后释放相应的显存资源。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_63153f0e1b75.jpg)

图 12：添加到 _early_curr_layer_rs_handles 列表的代码在这一设计中，我们首先遍历`_early_prev_layer_rs_handles`，调用`handle.wait()`来同步释放显存，随后将`_early_curr_layer_rs_handles`的内容赋值给`_early_prev_layer_rs_handles`。这种做法确保了当前加入的句柄将在下一个层（layer）处理中，经过两个`reduce_scatter`层后才会被释放。该设计方案是在显存生命周期和计算通信重叠（overlap）之间做出的权衡，旨在避免频繁阻塞，从而确保计算与通信的重叠效果不受影响，避免过多的同步操作干扰训练性能。

在实现了上述代码修改，并启用`TORCH_NCCL_AVOID_RECORD_STREAMS=1`后，我们进行了 InternLM2-7B 模型的训练，显存使用情况的图示 13 如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0cffeffb0449.jpg)

图 13：reduce_scatter 显存占用优化后，使用 InterEvo 训练 InternLM2-7B 模型的显存变化从显存图中可以看出，整体显存分布呈现出金字塔形状，相比于优化前，显存峰值降低了约4GB，降至18GB左右。启用`TORCH_NCCL_AVOID_RECORD_STREAMS=1`后，`all_gather`部分的显存能够及时释放，而无需额外调用`torch.cuda.synchronize()`进行同步。此外，`reduce_scatter`部分的显存在经过两个层（layer）处理后被释放，符合预期的显存管理效果。

### 4. 总结

在多 GPU 环境下的大模型训练中，模型切分引入的`all_gather`和`reduce_scatter`异步通信操作会占用临时显存。由于 PyTorch 的`recordStream`机制，这些显存可能会延迟释放，从而导致训练过程中的峰值显存过高。通过启用`TORCH_NCCL_AVOID_RECORD_STREAMS=1`环境变量，并在代码中确保在显存使用后调用`handle.wait()`及时释放，可以有效解决异步显存延迟释放的问题，从而显著降低训练过程中的峰值显存。
另一个需要探讨的问题是：训练过程中的P2P通信是否会遇到类似的显存延迟释放问题？这一问题将在下期继续讨论。**

**

> 如果你喜欢我们的内容，欢迎赞同∆、收藏⭐️、关注➕**我们！**也欢迎在评论区**与我们互动！
你的支持是我们持续创作的动力！
