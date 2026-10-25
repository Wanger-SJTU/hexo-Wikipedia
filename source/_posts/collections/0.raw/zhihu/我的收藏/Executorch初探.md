---
title: Executorch初探
date: "2025-11-23 00:00:00"
updated: "2025-11-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Executorch初探/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1975867272439554225
---


Executorch初探

匆匆那年
​
西北工业大学 模式识别与智能系统硕士

收录于 · PyTorch源码解读

2 人赞同了该文章

介绍
在智能手机、平板电脑和嵌入式系统等边缘设备上部署计算机视觉模型，需要优化运行时，在性能与资源限制之间取得平衡。ExecuTorch是PyTorch为边缘计算提供的解决方案，它能在设备上实现高效推理。

为什么要导出到 ExecuTorch？

ExecuTorch 的主要功能
ExecuTorch 为在边缘设备上部署模型提供了多项强大功能：

- 便携式模型格式:ExecuTorch 使用 .pte (PyTorch ExecuTorch）格式，该格式在资源有限的设备上对大小和加载速度进行了优化。
- XNNPACK 后端：与 XNNPACK 的默认集成可在移动 CPU 上提供高度优化的推理，无需专用硬件即可实现卓越性能。
- 量化支持：内置支持量化技术，以缩小模型大小，提高推理速度，同时保持准确性。
- 内存效率：优化的内存管理减少了运行时的内存占用，使其适用于内存有限的设备。
- 模型元数据：导出的模型在单独的 YAML 文件中包含元数据（图像大小、类名等），便于集成。
ExecuTorch工作流

demo

```python
import torch
from executorch.exir import to_edge_transform_and_lower
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner
```


# 1. Export your PyTorch model

```text
model = MyModel().eval()
example_inputs = (torch.randn(1, 3, 224, 224),)
exported_program = torch.export.export(model, example_inputs)
```


# 2. Optimize for target hardware (switch backends with one line)

```text
program = to_edge_transform_and_lower(
    exported_program,
    partitioner=[XnnpackPartitioner()]  # CPU | CoreMLPartitioner() for iOS | QnnPartitioner() for Qualcomm
```

).to_executorch()

# 3. Save for deployment

```text
with open("model.pte", "wb") as f:
    f.write(program.buffer)
```


# Test locally via ExecuTorch runtime's pybind API (optional)

```python
from executorch.runtime import Runtime
runtime = Runtime.get()
method = runtime.load_program("model.pte").load_method("forward")
outputs = method.execute([torch.randn(1, 3, 224, 224)])
```

从代码可以看出分为三部分：导出、优化并保存优化后的序列化的图、使用executorch pybind的api的运行时进行推理。当然也提供了c++、swift(ios)、Kotlin (Android)等语言。

C++

```cpp
#include <executorch/extension/module/module.h>
#include <executorch/extension/tensor/tensor.h>
```


Module module("model.pte");

```python
auto tensor = make_tensor_ptr({2, 2}, {1.0f, 2.0f, 3.0f, 4.0f});
auto outputs = module.forward(tensor);
Swift (iOS)

import ExecuTorch

let module = Module(filePath: "model.pte")
let input = Tensor Float ([1.0, 2.0, 3.0, 4.0], shape: [2, 2])
let outputs = try module.forward(input)
Kotlin (Android)

val module = Module.load("model.pte")
val inputTensor = Tensor.fromBlob(floatArrayOf(1.0f, 2.0f, 3.0f, 4.0f), longArrayOf(2, 2))
val outputs = module.forward(EValue.from(inputTensor))
```

LLM Example: Llama

Export Llama models using the export_llm script or Optimum-ExecuTorch:

# Using export_llm
python -m executorch.extension.llm.export.export_llm --model llama3_2 --output llama.pte

# Using Optimum-ExecuTorch

```text
optimum-cli export executorch \
  --model meta-llama/Llama-3.2-1B \
  --task text-generation \
  --recipe xnnpack \
  --output_dir llama_model
```

Run on-device with the LLM runner API:

C++

```cpp
#include <executorch/extension/llm/runner/text_llm_runner.h>

auto runner = create_llama_runner("llama.pte", "tiktoken.bin");
executorch::extension::llm::GenerationConfig config{
    .seq_len = 128, .temperature = 0.8f};
```

runner- generate("Hello, how are you?", config);

```python
Swift (iOS)

import ExecuTorchLLM

let runner = TextRunner(modelPath: "llama.pte", tokenizerPath: "tiktoken.bin")
```

try runner.generate("Hello, how are you?", Config {
    $0.sequenceLength = 128
}) { token in

```python
    print(token, terminator: "")
}
Kotlin (Android) — API Docs • Demo App

val llmModule = LlmModule("llama.pte", "tiktoken.bin", 0.8f)
llmModule.load()
llmModule.generate("Hello, how are you?", 128, object : LlmCallback {
    override fun onResult(result: String) { print(result) }
    override fun onStats(stats: String) { }
})
```


支持的硬件平台
PlatformSupported BackendsAndroidXNNPACK, Vulkan, Qualcomm, MediaTek, Samsung ExynosiOSXNNPACK, MPS, CoreML (Neural Engine)Linux / WindowsXNNPACK, OpenVINO, CUDA (experimental)macOSXNNPACK, MPS, Metal (experimental)Embedded / MCUXNNPACK, ARM Ethos-U, NXP, Cadence DSP
代码走读
TODO

编辑于 2025-11-23 10:13・北京
​赞同 2​​添加评论​4 ​喜欢​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

匆匆那年

​西北工业大学 模式识别与智能系统硕士

回答
1
文章
97
关注者
788

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

DeepSeek-R1本地图形化部署，告别卡顿，保姆级教程直接起飞
最近deepseek很火，这个大家都知道，但是在使用过程中却很一直提示服务器繁忙，体验感很差，这是因为AI模因为流量过大或者其他原因，导致一直没法顺利运行。 但是Deepseek模型一旦在本地部…

热心的陈先森

3D U-Net CNN with Keras(Demo)
小白

PyTorch的优化器
Gemfi...发表于Gemfi...

x11docker：让你的Docker跑图形程序
虫虫搜奇发表于虫虫搜奇