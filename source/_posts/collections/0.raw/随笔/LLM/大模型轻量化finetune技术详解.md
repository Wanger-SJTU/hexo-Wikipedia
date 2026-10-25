---
title: 大模型轻量化finetune技术详解
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/LLM/大模型轻量化finetune技术详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

https://zhuanlan.zhihu.com/p/624275968

大模型太大，占用的资源非常多。而且GPT系列也不开源。所以从算法和算力角度来说，想搭建chatGPT的能力，除了土豪大公司，对很多组织都是很困难的。为了低成本完成本地调优，完成了很多替代方案。

**Alpaca**
Alpaca就是对于llama的finetune，它在一个7B的llama模型上，用52K的数据进行了训练，代码和数据和模型都是开源的，并且在测试中达到了类似OpenAI发布的语言模型的能力（text-davinci-003）。训练这个模型使用了4个80G A100。

## 数据集生成(self-instruct)
想要finetune模型，一些高质量的任务数据是必须的，人工收集标注是比较耗时的，alpaca根据self-instruct论文，利用OpenAI的 text-davinci-003 模型生成了52K的训练数据。Self-Instruct的过程如下图所示，它是一种迭代引导算法，它从一组手动编写的指令种子开始，并使用它们来提示语言模型生成新指令和相应的输入输出实例。然后过滤这些生成以删除低质量或类似的，并将生成的数据添加回任务池。这个过程可以重复多次，从而产生大量的教学数据，可用于微调语言模型以更有效地遵循指令。
![https://pic3.zhimg.com/80/v2-afb8efc7c8446c2bba1c0014924d7c7e_720w.webp](https://pic3.zhimg.com/80/v2-afb8efc7c8446c2bba1c0014924d7c7e_720w.webp)

本文的重点不是介绍self-instruct的paper，所以这部分细节不展开了。

## Lora技术
此处参考<span class="wikilink wikilink--missing" title="未导入的页面">LORA</span>

## 工程代码实现

#TODO


##  LLM.Int8

注意这里打开了load_in_8bit的config，这表明load的weight都按照int8来存储，进一步减少显存占用，那么这怎样保证精度呢？这个在huggingface代码内部运用了其在2022年发表的一篇工作：llm.int8，具体流程如下所示：
![image](https://pic4.zhimg.com/80/v2-9b1e20a7fbcc886cfa11e48ec6f81037_720w.webp)


在计算时会进行统计，将输入activation划分成可以int8量化的部分和保持fp16原值的部分，两部分分别进行不同的计算模块，最后进行fp16的累加。总的来说，llmint8和cnn中传统的int8 quantization不一样，是一个Vector-wise量化与混合精度分解（Mixed-precision Decomposition Scheme）相结合的技术，能够有效的分区域设置量化分辨率，并消除异常值对模型量化带来的负面影响。进一步节省显存。其实际计算是调用了一个facebook的开源库：bitsandbytes，其主要功能是对GPU CUDA的llm int8算法的kernel实现。

### PEFT
再回到模型搭建的流程中，model搭建完之后，代码又调用了huggingface的peft对model进行了封装。Peft是一个hf开发的专注于模型轻量化训练的框架，包含了lora，checkpoint recomputing，prompt tuning等功能和方法。是高效训练的一个使用广泛的框架。


代码中首先调用了peft对模型一些属性进行了配置，主要有以下部分：

将参数的requires_grad设为false
将layernorm设为fp32（因为这个模块llm int8中是不支持的，只做gemm）
将embedding layer设置为需要grads(在prefix tuning或者prompt tuning中需要使用的)
打开gradient checkpointing功能
设置lm head为fp32

### Gradient checkpointing
这里，介绍一下gradient checkpointing技术（别的框架可能叫做activation recompute），这个技术也是为了节省显存而被提出的。是一种用算力换存储的技术。主要考虑到，前向计算时，中间层的activation是比较占用显存的。如果将这部分的tensor不保存在显存中，只保存计算图的初始输入tensor和权重tensor，反向传播时，需要用到中间的activation计算梯度时，就在反向之前执行一遍前向，得到需要的activation。Huggingface在它的模型代码内部使用的是torch.utils.checkpoint功能

https://pic2.zhimg.com/80/v2-0f00b47d99f6612a4927eabd0f8709a9_720w.webp

这个函数传入的function就是一个module，pytorch内部机制就会使这部分module的计算图中间activation不占显存。以llama模型为例(transformers中的modeling_llama.py代码)，传入的module就是decoder layer这个量级：
https://pic1.zhimg.com/80/v2-5d7606450479434740b59acc5f782788_720w.webp

说明整个decoder的计算图产生的中间的activation tensor就都不占用显存了。这个config的打开，可以使forward之后新增的显存占用只增加几百M的量级。7B的权重以int8保存，占用7G左右，加上每层decoder只存储最初的输入tensor占用显存（以），几百M的量级。再加上lora结构产生的非常小的weight占用，梯度+adam动量占用，全部加起来最后只占9G的显存。大大减少资源需求，使单卡也可以跑。

## LORA实现
再回到模型搭建流程，属性配置设好之后，就是进行lora的集成，这个也是使用了get_peft_model这个函数：
https://pic3.zhimg.com/80/v2-5e4a3ef1016976161e83c18db3f649f2_720w.webp

Lora config是外部配置的，可以设置lora的r为多大，需要并联的层有哪些（比如只并联attention中的v project 和out project这两个gemm，mlp的不加）等config。

具体lora的实现，是通过替换这个model中的module来做的，首先遍历所有的module，找到config中指定的需要添加并联的层（比如v_proj和out_proj），然后建立一个新的module，这个新的module就是peft中手工定义好的一个module，对gemm和lora的gemm进行了并联。

遍历module：
https://pic2.zhimg.com/80/v2-0ff2108a7c183ec5b61bbe28d3e8c765_720w.webp

创建新的module
https://pic2.zhimg.com/80/v2-bf05e4c939a202a7bb08a6cac8ea0b05_720w.webp

手工定义好的module（添加了lora结构）
https://pic3.zhimg.com/80/v2-622f06688a7180048290c70058a1ce3e_720w.webp


替换module
https://pic2.zhimg.com/80/v2-2b375d49f12756a11727fc6df3cca489_720w.webp

注意这里，创建的新module只有初始化的weight，lora的weight需要跟新，但是llama中本身gemm的weight要copy原始module的weight。

## 搭建完成
这里model就建立并修改完成了。接着就是调用transformers的trainer进行训练：
https://pic1.zhimg.com/80/v2-dc152f2145e6dd196fe8e2373065d668_720w.webp

训练过程中的step，optimizer，参数更新，保存等pipeline都是其来控制的。

所以可以看到alpaca的工程代码是比较简单的，主要是利用了huggingface的transformers和peft两个库。不得不说，huggingface的社区模式确实非常厉害，大模型生态，技术栈它都占住了。我觉得后面不管上层应用还是下层硬件公司只能去适配它才能搞起来。

Alpaca-lora的模型效果可以看工程中发的GitHub - tloen/alpaca-lora: Instruct-tune LLaMA on consumer hardware。总体来讲和大模型text-davinci-003这种能力还是可以媲美的。

其他开源工程介绍
StabilityAI开发了文生图模型stable diffusion，最近也发布了llm。都是开源的，具体模型结构还没细看，看起来一个比较好的贡献是基于新的数据集The Pile (eleuther.ai)做了自己更精细的整理。并且它们发现在这个数据集上训练，模型都会有比较好的提升。不光发布了基础大模型，也利用alpaca的方法，发布了finetune模型，并且finetune数据集是包含5个部分：
