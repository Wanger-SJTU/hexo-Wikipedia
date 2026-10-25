---
title: "vLLM框架解析一：vLLM Engine 分析开篇"
date: 2024-07-08
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/706850885
---

vLLM框架解析一：vLLM Engine 分析开篇

皓月争曦

AI算法/AI Infra从业人员

130 人赞同了该文章

​目录

NOTE: 本文多有参考知乎诸多大佬的文章，以记录自己主观分析为主，特此声明。包含 猛猿：图解大模型计算加速系列：vLLM源码解析1，整体架构 不仅限于。

很多初级接触LLM推理框架的同学可能和我一样，在学习vLLM推理框架中容易迷失方向（大佬绕路），特此文章记录自己的学习历程，希望对看到此文的朋友们产生帮助，本文基于0.5.0版本源码进行分析，如有不同后续会依据最新分支进行对应Feature给出文章分析。

vLLM 静态结构与特性总览
LLM推理框架是一个复杂的系统问题，其往往较传统的算法推理框架更为复杂，其不仅仅包含模型运行所需要的算子支持，还有LLM 特性的API和对应的特性的调度系统支持，并且杂合着多GPU并行支持代码的交织，使得推理框架代码对初学者可能不是特别友好。

vLLM 分层结构介绍（一张图了解vLLM的结构和特性）
为了能更好的介绍vLLM框架，我们将其以分层的方式来进行分析，如图1所示，可以将vLLM的代码分为五层，分别是API层，Engine Instance层，Engine Schedule层，Engine Execution层，Model Execution层，这些层不一定对应框架代码的物理层，很有可能只是我们提出的一个概念层，但是有了这样一个概念层之后，咱们对于vLLM的理解可能更清晰一些，也可以在分析具体特性的时候将其在各层对具体特性都有哪些工作进行支持。

图1. vLLM静态结构与特性优化点总览图1应该能比较清楚的展示vLLM的整体架构图，以及对应特性和优化点所在的层级，上图所展示的部分基本涵盖了推理引擎方向比较重要的知识点。优化点所在层级和特性以相关性进行分类，在以往的文章中更多的是站在一个更高的角度来对vLLM进行介绍，在本文中将考虑以拆解的形式对vLLM进行介绍，细化到每个知识点，了解每个优化点所能带来的变化。

下面咱们将对上述五层中比较重点的优化细节部分依次介绍，尽可能的给大家分析清楚vLLM为什么这么受欢迎，以及各个优化点都做了哪些工作。

PageAttention概览
作为PageAttention皇冠上的明珠，我想在介绍vLLM之前对其有个清晰的了解，能够有助于后续内容的推进。关于PageAttention的原理解读已经有比较好的文章，我们就在此就不重复造轮子了，比如如下所示文章

PageAttention Cache存储方式
相信大家在了解完PagedAttention的原理后，可能会有疑问，那如果一个真实的模型运行过程中他的KVCache是怎么存的呢，这也是我看代码的时候考虑的问题。

图2. KVCaches实际存储方式，其实这个地方使用一些比较巧妙的设计，也就是每一层Transformer Block对于Token维度表现出的性状是一致的，所以只需要考虑一层的KVCache的情况就等价于所有层的情况。如上图2 所示，对于一次运行来将会为模型分配[num_layers, 2, num_blocks, block_size, num_heads, head_size, dtype] 维度的显存，其中除了num_blocks和block_size其它都是与模型参数相关，在推理的时候已经是确定的数值，block_size可以通过设置，要求是16的倍数，默认值就是16，而num_blocks是依据当前节点可使用的GPU Memory 大小决定，具体如何决定参考profile_num_available_blocks函数，后续文章在e分析Engine Instance初始化的时候给出。

并且我们可以看到如图所示其存储排列方式为，先是数据类型的数据维度，然后是HeadSize维度，然后是NumHead维度，然后是BlockSize维度，然后是num_block维度，然后是Key/Value维度，最后是Layer维度，这个其实就是Physical Memory的最终存储格式了，因为Layer和Key/Value两个维度其Pattern表现较为一致，所以考虑较多的是Key Cache或者Value Cache这个层级，也就是由多个Block组成的BlockTable。

PageAttention SlopMapping

图3. slot_mapping中的token id 对应 slot_id，隐藏了层数的对应关系也就是一个token对应的是多层的slot_id，但是每一层Layer的KVCache组织形式是一样的（如图所示Layer 0的KV Cache和Layer n的KV Cache组织形式是一样的），所以等价于一个token id对应一个slot id。void reshape_and_cache_flash(
    torch::Tensor  key,      // [num_tokens, num_heads, head_size]
    torch::Tensor  value,    // [num_tokens, num_heads, head_size]
    torch::Tensor  k_cache,  // [num_blocks, block_size, num_heads, head_size]
    torch::Tensor  v_cache,  // [num_blocks, block_size, num_heads, head_size]
    torch::Tensor  slot_mapping,  // [num_tokens]
    const std::string  kv_cache_dtype) {
  // FIXME: only support auto datatype, does not support fp8
  if (kv_cache_dtype != "auto") {
    TORCH_CHECK(false, "Unsupported data type of kv cache: ", kv_cache_dtype);
  }
  int num_tokens = key.size(0);
  int num_heads = key.size(1);
  int head_size = key.size(2);
  int block_size = k_cache.size(1);

  int key_stride = key.stride(0);
  int value_stride = value.stride(0);
  int block_stride = k_cache.stride(0);
  TORCH_CHECK(k_cache.stride(0) == v_cache.stride(0));

  dim3 grid(num_tokens);
  dim3 block(std::min(num_heads * head_size, 512));
  const at::cuda::OptionalCUDAGuard device_guard(device_of(key));
  const cudaStream_t stream = at::cuda::getCurrentCUDAStream();
  VLLM_DISPATCH_FLOATING_TYPES(
      key.scalar_type(), "reshape_and_cache_flash", [ ] {
        vllm::reshape_and_cache_flash_kernel scalar_t 
               grid, block, 0, stream   (
                key.data_ptr scalar_t (), value.data_ptr scalar_t (),
                k_cache.data_ptr scalar_t (), v_cache.data_ptr scalar_t (),
                slot_mapping.data_ptr int64_t (), block_stride, key_stride,
                value_stride, num_heads, head_size, block_size);
      });
}

template  typename scalar_t 
__global__ void reshape_and_cache_flash_kernel(
    const scalar_t* __restrict__ key,    // [num_tokens, num_heads, head_size]
    const scalar_t* __restrict__ value,  // [num_tokens, num_heads, head_size]
    scalar_t* __restrict__ k_cache,      // [num_blocks, block_size, num_heads,
                                         // head_size]
    scalar_t* __restrict__ v_cache,      // [num_blocks, block_size, num_heads,
                                         // head_size]
    const int64_t* __restrict__ slot_mapping,  // [num_tokens]
    const int block_stride, const int key_stride, const int value_stride,
    const int num_heads, const int head_size, const int block_size) {
  const int64_t token_idx = blockIdx.x;
  const int64_t slot_idx = slot_mapping[token_idx];
  // NOTE: slot_idx can be -1 if the token is padded
  if (slot_idx   0) {
    return;
  }
  const int64_t block_idx = slot_idx / block_size;
  const int64_t block_offset = slot_idx % block_size;
  const int n = num_heads * head_size;
  for (int i = threadIdx.x; i   n; i += blockDim.x) {
    const int64_t src_key_idx = token_idx * key_stride + i;
    const int64_t src_value_idx = token_idx * value_stride + i;
    const int head_idx = i / head_size;
    const int head_offset = i % head_size;
    const int64_t tgt_value_idx = block_idx * block_stride +
                                  block_offset * num_heads * head_size +
                                  head_idx * head_size + head_offset;
    k_cache[tgt_value_idx] = key[src_key_idx];
    v_cache[tgt_value_idx] = value[src_value_idx];
  }
}
}  // namespace vllm

slot_mapping作为实际操作Kernel过程中实际KVCache操作的索引，在此介绍的话主要是让大家对PageAttention中的KVCache操作有个概念，KVCache是怎么操作保存的，具体如上面代码所示，reshape_and_cache_flash会在计算Attention前将KVCache存到对应位置，通过slot_mapping映射到最终的Physical Memory。（后续在分析动态运行特性是还会对其运行过程的变化补充分析，在此不再展开）。

开篇总结
越看各种推理框架和算子优化，越发感觉LLM推理框架是一个复杂的系统问题，在开篇中主要是让大家能够对vLLM的结构和特性有了List的概念，方便后续分析过程中较为清晰的定位，并且将会依据上述图1中的优化点逐一展开分析。

Reference

- vLLM官方文档
- The fourth vLLM meetup
- The third vLLM meetup
- The second vLLM meetup
- The second vLLM meetup Video（vLLM Update)
- The second vLLM meetup(IBM Research   torch.compile)
- The first vLLM meetup
- 猛猿：图解大模型计算加速系列：vLLM源码解析1，整体架构

发布于 2024-07-08 21:04・北京
LLM（大型语言模型）

LLM推理

vLLM

​赞同 130​​13 条评论​349 ​4 ​分享

​申请转载​​

未登录用户

13 条评论

默认
最新

啥也不是

催更，催更
2025-08-22 · 湖南

​回复​喜欢

FirenzeRose

催跟催跟

2025-07-17 · 贵州

​回复​喜欢

一行秋叶

这个kvcache的图真是全网第一次见，太diao了

2025-06-19 · 广东

​回复​喜欢

Delonon

这个总览图很赞👍🏻

2025-06-19 · 浙江

​回复​喜欢

一行秋叶

为什么 scheduler在图一里出现了两次

2025-06-18 · 广东

​回复​喜欢

Scldafa

支持，催更
2025-02-19 · 北京

​回复​喜欢

真真锋

​

图1 是你画的吗，太牛了！

2025-01-21 · 四川

​回复​喜欢

真真锋

​

皓月争曦

你的图也是用 processon 画的吗

2025-01-23 · 四川

​回复​喜欢

皓月争曦

作者

嗯嗯，是的哈，多谢大佬夸奖，不过vLLM迭代太快了，细节上面没发完全跟上。

2025-01-22 · 北京

​回复​喜欢

spur

好图
2024-10-29 · 上海

​回复​喜欢

Javey

支持 催更

2024-09-16 · 陕西

​回复​喜欢

人工智能工人

有条理

2024-09-01 · 北京

​回复​喜欢

点击查看全部评论

关于作者

皓月争曦
AI算法/AI Infra从业人员

回答
1
文章
11
关注者
830

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

vLLM框架V1演进分析
vLLM在V1版本上做了比较大的改变，主要是之前（当前）的架构在性能和可扩展方面不能满足社区发展要求。本文主要分析架构演进的原因以及主要改动内容。 架构重大调整主要驱动力： 性能问题：…

kaiyuan

vllm v1代码走读-总体框架
叶泊秦淮发表于AI软件开...

vLLM框架初探——框架整体结构与从v0到v1的演进
vLLM是一种大模型推理框架，随着其版本的演进，逐渐出现了v0和v1两个版本，目前两个版本可靠添加一行标识代码来进行切换。我们从目前最新版（v0.9.0）来对vLLM框架有一个初步的代码结构的分…

饭饭OvO

vLLM：高性能大语言模型推理引擎的工程设计与实现
vLLM：高性能大语言模型推理引擎的工程设计与实现 引言vLLM（Very Large Language Model）是一个专为大语言模型推理优化的高性能引擎，其设计目标是在保证推理质量的前提下，最大化吞吐量并…

Jack