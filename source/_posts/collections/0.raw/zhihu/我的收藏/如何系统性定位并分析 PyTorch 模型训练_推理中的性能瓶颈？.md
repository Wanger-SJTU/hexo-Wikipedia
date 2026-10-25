---
title: (2 条消息) 如何系统性定位并分析 PyTorch 模型训练/推理中的性能瓶颈？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何系统性定位并分析-PyTorch-模型训练_推理中的性能瓶颈/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/1927112862976972744/answer/1927113899741779156
---


​目录

<strong>自问自答，抛砖引玉。</strong>

对于性能优化工作重要的不是how，而应该是why，为什么要优化这里，优化之后能带来多少的收益，对workload分析清楚了之后怎么做是水到渠成的事情，而对性能分析和热点的定位，工具就显得非常重要，对于AI系统很多人觉得是经验指导，一些时候依靠直觉是可行的，但要有具体的数据支撑，数据驱动指导优化，只有将个人经验流程化和系统化之后才能具备可复制能力。

对于ai workload的性能分析基本都是围绕在解两个问题：显存、效率，显存问题是怎么样让模型能够跑起来，效率问题是怎么能够跑的更快，下面主要从显存分析、耗时分析两个方面对pytorch mem和trace性能分析的工具进行一些介绍：

### 显存分析

现在模型的前端基本都是以pytorch为主，相比于直接裸调用cuda api：cudaMalloc、cudaFree，pytorch有一套自定义的显存管理机制。

其实有点类似于c++ stl和os的关系，os内存只划分堆栈的管理方式，对于上层应用来说管理的粒度太粗了，在内核态虽然也有buddy、slab等分配器，但不能申请一个byte都要陷入到内核态，stl在用户空间也维护了一套两级的内存分配器：当一次申请的内存够大，超过128bytes时，就移交给第一级内存分配器，就是直接new和delete出一块大内存；当一次申请的空间小于128bytes，就使用二级分配器以内存池的形式进行管理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a1627d1cefa.jpg)

ref：https://www.geeksforgeeks.org/power-of-two-free-lists-allocators-kernal-memory-allocators/pytorch和cuda的关系与上面类似，pytorch也从cuda手中接管了显存的分配，基于池化机制，有一套自定义的显存分配器，该分配器维护了一个预分配内存块的缓存池，当张量不再需要时，其占用的内存并不会立即返回给GPU系统，而是保存在这个内部池中以供后续重用。

pytorch通过segment和block两层申请，将显存的申请与使用过程进行了分离，即显存申请后会进行二次分配，其过程是：先通过cudaMalloc申请一个显存块segment，然后从segment分离出来子显存块block，框架的上层应用使用的是分离后的block显存，上层应用不直接使用segment。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_99c06734cede.jpg)

ref：https://docs.pytorch.org/docs/stable/torch_cuda_memory.html对于pytorch的ai workload可以使用torch的cuda memory snapshot对显存生成快照：

`import torch

# Keep a max of 100,000 alloc/free events in the recorded history
# leading up to the snapshot.
MAX_NUM_OF_MEM_EVENTS_PER_SNAPSHOT: int = 100000
torch.cuda.memory._record_memory_history(max_entries=MAX_NUM_OF_MEM_EVENTS_PER_SNAPSHOT)

input = torch.randn(10, 4096, 4096, requires_grad=True).to("cuda")
weight = torch.randn(4096, 4096).to("cuda")
out = input @ weight

torch.cuda.memory._dump_snapshot("my_snapshot.pickle")`

并在[pytorch.org/memory_viz](https://link.zhihu.com/?target=https%3A//pytorch.org/memory_viz)上进行交互式分析，快照的pickle文件记录了所有张量随时间的变化，可以查看对应堆栈调用的详细信息：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9021b2f6a129.jpg)

### 耗时分析

对于ai workload的耗时分析应该分为几个不同层次的维度，top level的整体workload分析，middle level的模块分析，比如某个function或者nn.module，这种可以使用python装饰器自定义一个timer进行简单统计，以及bottom level的kernel粒度分析，对于kernel粒度的分析可以走nsys+ncu。

这里主要说的是基于torch profile的对ai workload进行的整体分析，pytorch本身提供了profiler工具，可以记录在cpu、gpu上的活动堆栈，以timeline可视化的形式进行分析，并允许用户插入自定义的annotation，以方便对局部进行定位分析：

`import os

```python
import socket
from datetime import datetime
from functools import partial

import torch
from torch.autograd.profiler import record_function
```


# Non-default profiler schedule allows user to turn profiler on and off
# on different iterations of the training loop;
# trace_handler is called every time a new trace becomes available

```python
def trace_handler(prof: torch.profiler.profile, dir=""):
    os.makedirs(dir, exist_ok=True)

    print(
        prof.key_averages().table(
            sort_by="self_cuda_time_total", row_limit=10, max_name_column_width=200
        )
    )
```


    # Prefix for file names.

```text
    host_name = socket.gethostname()
    timestamp = datetime.now().strftime("%b_%d_%H_%M_%S")
    trace_file_prefix = os.path.join(dir, f"profiler_trace_{host_name}_{timestamp}")
    memory_tl_file_prefix = os.path.join(
        dir, f"profiler_memory_timeline_{host_name}_{timestamp}"
    )
    kernel_times_file_prefix = os.path.join(
        dir, f"profiler_kernel_times_{host_name}_{timestamp}"
    )
```


    # Construct the trace file.

```text
    prof.export_chrome_trace(f"{trace_file_prefix}.json.gz")
```


    # Construct the memory timeline file.

```text
    prof.export_memory_timeline(f"{memory_tl_file_prefix}.html")
```


    # Construct the kernel times file.

```text
    with open(f"{kernel_times_file_prefix}.txt", "w") as f:
        f.write(
            prof.key_averages(group_by_stack_n=5).table(
                sort_by="cuda_time_total", row_limit=-1
            )
        )
```


N = 10
input = torch.randn(10, 4096, 4096, requires_grad=True).to("cuda")
weight = torch.randn(4096, 4096).to("cuda")
with torch.profiler.profile(

```text
    activities=[
        torch.profiler.ProfilerActivity.CPU,
        torch.profiler.ProfilerActivity.CUDA,
    ],
    # In this example with wait=1, warmup=1, active=3, repeat=1,
    # profiler will skip the first step/iteration,
    # start warming up on the second, record
    # the third and the forth iterations,
    # after which the trace will become available
    # and on_trace_ready (when set) is called;
    # the cycle repeats starting with the next step
    schedule=torch.profiler.schedule(wait=1, warmup=1, active=3, repeat=1),
    record_shapes=True,
    profile_memory=True,
    with_stack=True,
    on_trace_ready=partial(trace_handler, dir="save"),
    # on_trace_ready=torch.profiler.tensorboard_trace_handler('./log')
    # used when outputting for tensorboard
```

) as p:

```text
    for iter in range(N):
        with record_function("forward"):
            out = input @ weight
        loss = out.mean()
        with record_function("backward"):
            loss.backward()
        # send a signal to the profiler that the next iteration has started
        p.step()`
```


上面的profiling程序会输出3个文件：txt文件记录了对应的kernel耗时，html文件记录了程序显存的大体占用情况，在训练中显存通常有模型参数、梯度、优化器状态、activation激活值这几部分组成。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_689b9a28150c.jpg)

txt：kernel耗时![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1bdab5cca131.jpg)

html：显存占用还有用于耗时分析的trace文件json.gz，trace文件是由一系列事件event组成的json文件，可以拖到[perfetto](https://link.zhihu.com/?target=https%3A//ui.perfetto.dev/%23%21/viewer)中进行交互式分析，perfetto是google开源出来的一个对复杂系统进行性能检测和trace分析的生产级开源堆栈，perfetto将trace数据转换为sqlite数据库，允许用户通过sql查询来分析数据，从trace文件中分析有意义的信息，指导性能瓶颈定位，给优化提供数据驱动的方向建议。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cb14f4cc2dd6.jpg)

可以拖拽进行timeline的详细耗时分析，以及输入对应的命令，比如> Open table: slice，并根据annotation进行filter，筛选定位插入自定义annotation的位置。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1c69a390ea12.jpg)

以及通过sql进行数据的高级分析，trace文件中的event事件都被组织成了slice，可以通过sql进行统计和聚合分析：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cefa1cb7187f.jpg)

select * from slice where cat = &#39;kernel&#39;![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3a24fa96d920.jpg)

select sum(dur)/1e6 as total_kernel_ms from slice where category = &#39;kernel&#39;

送礼物

还没有人送礼物，鼓励一下作者吧

[所属专栏 · 2026-04-14 22:53 更新](https://zhuanlan.zhihu.com/c_1899981893593703807)[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b83d8bf17f63.jpg)AI Infra杂谈

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c118c79976b8.jpg)雪人

41 篇内容 · 2930 赞同

](https://zhuanlan.zhihu.com/c_1899981893593703807)订阅[最热内容 ·

求教，研0如何入门ai infra?

](https://zhuanlan.zhihu.com/c_1899981893593703807)[编辑于 2025-07-11 21:27](//www.zhihu.com/question/1927112862976972744/answer/1927113899741779156)・浙江

​2 条评论​490 ​6 ​分享

​​

收起​