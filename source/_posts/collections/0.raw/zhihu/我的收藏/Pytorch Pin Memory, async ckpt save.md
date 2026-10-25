---
title: (2 条消息) Pytorch Pin Memory, async ckpt save
date: "2024-12-13 00:00:00"
updated: "2024-12-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Pytorch-Pin-Memory,-async-ckpt-save/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/9616453650
---


一些Pytorch内存管理基础：略，类似操作系统。

#### **可分页内存（Pageable Memory）vs **固定内存（Pinned Memory）

与分页内存相对，ram与disk一起构成虚拟内存，目的是为了让程序可以在更大的、大于ram的内存上运行，，但是频繁的页面换入换出会拖慢访问速度，因此就有了pinned memory，顾名思义，就是被固定在ram里的内存，不支持换入换出，pinned memory访问速度更快，但内存有限，因此需要小心使用。

python有一些自带的ram相关log打印，可以用来分析模型内存详细信息：

`import psutil
virtual_mem = psutil.virtual_memory()
print(f"RAM - Total: {virtual_mem.total / 1024**3:.2f} GB, "
              f"Available: {virtual_mem.available / 1024**3:.2f} GB, "
              f"Buffers: {virtual_mem.buffers / 1024**3:.2f} GB, "
              f"Cached: {virtual_mem.cached / 1024**3:.2f} GB")`

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d7b1ccafc24d.jpg)

CUDA是如何将一个tensor从CPU复制到GPU的？

显然，如果tensor在CPU的page-locked部分，也就是固定内存（pinned memory），那么访问速度会大大加快，但如果tensor在CPU的分页内存上，访问速度就会花费较多时间，（因为需要换入换出），并且执行速度不是可预测的。

#### `[pin_memory()](https://link.zhihu.com/?target=https%3A//pytorch.org/docs/stable/generated/torch.Tensor.pin_memory.html%23torch.Tensor.pin_memory)`，`[to()](https://link.zhihu.com/?target=https%3A//pytorch.org/docs/stable/generated/torch.Tensor.to.html%23torch.Tensor.to)`，`non_blocking=True` 

- to() 阻塞式**PyTorch 中，调用 `to()` 方法时，默认non_blocking = False,内部会在每一个`cudaMemcpyAsync`（异步复制）之后，再调用一个 `cudaStreamSynchronize`，这会强制主线程等待当前传输操作完成，这种模式下，`to()` 是阻塞的**，即主线程在数据传输完成之前不能继续其他任务。**
- non_blocking=True 非阻塞式 
调用这个的话，cudaStreamSynchronize不会被触发，主线程不会等待一个tensor传输完成，而是可以同时执行多个传输操作。
因此non_blocking=True要比默认的False快一些（0.76提速）
![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d449f5ae5cda.jpg)

- pin_memory()阻塞式
pin_memory(）虽然是将tensor从CPU的固定内存（RAM）移动到GPU，加快了这个移动速度，但pin_memory本身是阻塞main进程的！这也是为什么，如果直接调用pin_memory反而会拖慢性能！让我们看一组实验数据：
`# A tensor in pageable memory
pageable_tensor = torch.randn(1_000_000)

# A tensor in page-locked (pinned) memory
pinned_tensor = torch.randn(1_000_000, pin_memory=True)`

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_6ad7c59ac642.jpg)

基准是pageable_tensor.to(device),也就是将tensor从分页内存移动到GPU上。

最快是pinned_tensor.to(device)，也就是一开始创建tensor的时候，该tensor就位于固定内存上。

最慢的是将tensor从分页内存移动到固定内存(pin_memory())，再移动到gpu上。pageable_tensor.pin_memory().to(device)。也很好理解，相对于基准，tensor多移动了一次，并且pin_memory()本身还阻塞main进程。

to()+non_blocking=True：****由堆栈可看到，调用cudaMemcpyAsync之后不会调用cudaStreamSynchronize

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5fac128a20cd.jpg)

如上图，main调用玩aten::to之后，调用cudaMemcpyAsync，Synchronize之后再进行计算操作，通信与计算不重叠。并且可看到cpu移动到gpu是pageable-&gt;Devicepinned=True+ non_blocking=True + multiple cuda streams：**

数据拷贝stream13和计算stream7在不同cuda流中进行并且能够重叠。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_d5d487850952.jpg)

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_66c2ad6a9bee.jpg)

显然pinned+non-blocking是最快的，原理上面已说明。

#### 总结

加载数据比较好的方式是多线程pinned memory方式传输，这样可以达到非阻塞传输的目的，但也会增加内存开销和线程管理的复杂性。**影响因素有：CPU cores number, CPU cores and Memory utilization, CUDA Device Capabilities(DMA engines), 传输数据（tensors number and size）, bus width, network latency and so on. 
pinned memory需要在声明时设置，直接使用pin_memory()反而会拖累速度。

Feature关注：**

7B的ckpt保存加速23.6x， 148.8 -> 6.3 秒，

Reducing Model Checkpointing Times by Over 10x with PyTorch Distributed Asynchronous Checkpointing
异步ckpt保存：[PyTorch Lightning 2.4.0 documentation](https://link.zhihu.com/?target=https%3A//lightning.ai/docs/pytorch/stable/api/lightning.pytorch.plugins.io.AsyncCheckpointIO.html)
[Asynchronous Saving with Distributed Checkpoint (DCP)](https://link.zhihu.com/?target=https%3A//pytorch.org/tutorials/recipes/distributed_async_checkpoint_recipe.html)

Zero-Overhead Checkpointing（to do）：反向传播时将模型权重直接流式传输到 CPU，而不是等到反向传播完成后再触发异步检查点操作。当训练到达异步检查点时，数据已经在 CPU 上，直接省去ckpt保存时间。
[https://github.com/pytorch/pytorch/blob/main/torch/distributed/checkpoint/state_dict_saver.py](https://link.zhihu.com/?target=https%3A//github.com/pytorch/pytorch/blob/main/torch/distributed/checkpoint/state_dict_saver.py)