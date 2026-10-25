---
title: 图解DeepSeek V4：详细计算流程解析
date: "2026-04-27 00:00:00"
updated: "2026-04-27 00:00:00"
layout: post
permalink: /collections/wechat/2026-04-27-tujie-deepseek-v4/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - DeepSeek
  - AI
  - 大模型
  - 架构
source_url: https://mp.weixin.qq.com/s/DGrJnqGmkMWxI77mvUMlXg
---


> <strong>作者</strong>: InfraTech  
> <strong>原文</strong>: [微信文章](https://mp.weixin.qq.com/s/DGrJnqGmkMWxI77mvUMlXg)  
> 
> <strong>摘要</strong>: V4系列的关键升级集中在CSA/HCA混合注意力与mHC连接机制，目标是在保证能力的同时降低长序列场景下的计算与KV cache开销。本文将以DeepSeek-V4-Pro架构为例，图解V4设计细节。

![](/images/collections/wechat/asset/img_00.jpg)

点击蓝字，关注我们

DeepSeek-V4系列包含两种模型：DeepSeek-V4-Flash（284B参数，13B激活）与DeepSeek-V4-Pro（1.6T参数，49B激活），两者均支持1M上下文，整体都围绕长上下文推理效率进行架构优化。根据模型卡与技术报告，V4系列的关键升级集中在CSA/HCA混合注意力与mHC连接机制，目标是在保证能力的同时降低长序列场景下的计算与KV cache开销。

本文将以DeepSeek-V4-Pro架构为例，图解V4设计细节。

1 整体架构

DeepSeek V4 Pro模型整体结构如下所示，参数量达到1.6T，激活参数为49B。支持1M上下文推理，是纯语言大模型（LLM）。![](/images/collections/wechat/asset/img_01.jpg)

高清图地址：https://github.com/CalvinXKY/InfraTech/tree/main/models/deepseek_v4

MoE模块有两种类型：
- 

一种是常规MoE；
- 

另一种是hash-MoE。

Attention模块有三种类型：
- 

CSA（Compressed Sparse Attention）：带index的压缩注意力，压缩比4:1。
- 

HCA（Heavily Compressed Attention）：重压缩注意力，压缩比128:1。
- 

SWA（Sliding Window Attention）：滑动窗口注意力。

模型一共有61层，前3层为hash MoE，搭配的Attention分别是HCA、HCA、CSA。 Attention与MoE之间的连接方式采用mHC。与residual连接方式相比，实现上多了前处理（hc_pre）和后处理（hc_post）。![](/images/collections/wechat/asset/img_02.jpg)

从embedding到前三层计算

后58层为普通MoE。HCA与CSA交替使用，最后一层为SWA。具体层数配置可参考config[1]。 模型最后接了一层MTP（Multi-Token Prediction），用于预测下一个token。![](/images/collections/wechat/asset/img_03.jpg)

从后58层计算到MTP

2 CSA模块

CSA（Compressed Sparse Attention）是一种压缩注意力机制，通过压缩注意力矩阵来减少计算量。主要计算逻辑如下图所示。![](/images/collections/wechat/asset/img_04.jpg)

相比传统注意力机制，CSA的KV通道有以下特点：

第一路KV通道由sliding window attention组成，计算特点是窗口滑动，每个token只与窗口内的token计算注意力。 因此，KV cache只会存储window_size大小的KV值，超出时会循环覆盖。 以Decoder阶段为例(后文对模型的介绍都以Decoder阶段为例，即sequence_length=1，batch_size=1)，数据输入shape=[1,hidden_size]，经过KV下采样后，KV cache的shape=[1,head_dim]， 经由RoPE和量化计算后得到KV值，并存储到Window KV cache中。head_dim按rope_head_dim长度进行RoPE计算，剩余部分进行量化运算。![](/images/collections/wechat/asset/img_05.jpg)

第二路KV通道是压缩通道，输入状态值经过Compressor模块后会更新压缩KV cache。压缩模块每次输出T个压缩KV值。 T个压缩KV token经过index模块筛选，保留<=topK个压缩token。该通道的shape变化为：

[1,hidden_size]->[T,head_dim]->[topK,head_dim]![](/images/collections/wechat/asset/img_06.jpg)

最后，两路KV通道的KV值经过Concat模块拼接，得到最终KV值。

KV值长度<=window_size+topK，其中window_size是滑动窗口大小，topK是压缩通道输出的压缩token数量。Q通道计算与MLA的计算逻辑保持一致。

### 2.1 Token level Compressor (C4A)


Token level Compressor（C4A）是一种压缩token的模块，通过压缩token来减少计算量。

计算逻辑是：当KV cache中的值达到压缩数量时，就进行压缩计算。C4A设置为每收集到4个token压缩一次；当数量未达到4个时，就继续收集，不更新KV cache。![](/images/collections/wechat/asset/img_07.jpg)

具体计算过程：
- 

输入值进入C4A后，线性投影得到KV状态值和score状态值；
- 

当状态值累积数量为4时，进行压缩计算；否则保存state状态后退出。
- 

压缩计算是一次softmax以及乘法计算，最后在序列维度进行求和运算，尺寸变化为:

[1,hidden_size]->[1,2*head_dim]->[8,head_dim]->[1,head_dim]。

尺寸变化采用了交替轮转方式，即在state压缩过程中，state存储数量为压缩比例的2倍，即2×4。 kv_state/score_state交替写入与数据拼接方式如下：

为了方便理解，可以将存储state（长度为8）分为前4个（pre state）和后4个（cur state）。![](/images/collections/wechat/asset/img_08.jpg)
- 

每个状态值更新后都写入后4个位置，并滚动刷新。
- 

数量达到4个时，进行压缩计算。
- 

取值方式是将pre state的前半段与cur state的后半段拼接，得到8个state值，最后一维保持head_dim长度。

如果state用一个整体表示，即定义state尺寸为[2* ratio, 2 * head_dim], 拼接代码如下：
- 

kv_state = torch.cat([kv_state[:bsz, :ratio, :d], kv_state[:bsz, ratio:, d:]], dim=1)

每次压缩后，cur state会覆盖pre state，同样采用滚动刷新：
- 
- 

kv_state[:bsz, :ratio] = kv_state[:bsz, ratio:]score_state[:bsz, :ratio] = score_state[:bsz, ratio:]

### 2.2 Index模块


Index模块负责从主通道压缩后的token中选择topK个token。与DSA的主要区别是，KV值计算也采用C4A压缩器。 压缩比例也为4:1。最后输出topK个压缩token的index。![](/images/collections/wechat/asset/img_09.jpg)

### 2.3 其他细节


Attention计算还有几个值得注意的细节：
- 

引入了sink值；
- 

全部采用了MQA模式；
- 

MQA之后接了一个逆位置编码计算（de-rotation/inverse）。
- 

O运算有上、下采样两次运算。![](/images/collections/wechat/asset/img_10.jpg)

3 HCA模块

HCA模块是一种重压缩注意力机制，通过重压缩注意力矩阵减少计算量。与CSA的主要区别是，HCA的压缩通道没有Index模块，压缩计算方式也不同。![](/images/collections/wechat/asset/img_11.jpg)

### 3.1 Token level Compressor（C128A）


压缩模块的压缩比例为128:1，state更新不采用交替轮转，而是直接拼接。累积数量达到128时，进行压缩计算。![](/images/collections/wechat/asset/img_12.jpg)

4 MoE模块

MoE模块在DSv3基础上进行了改进：
- 

路由有两种方式，一种是传统路由方式，另一种是hash路由方式。
- 

路由计算中的softmax被替换为softplus+sqrt。![](/images/collections/wechat/asset/img_13.jpg)

hash路由方式的计算逻辑采用直接映射，即tid2eid：token id映射到expert id，也就是每个token对应固定expert。![](/images/collections/wechat/asset/img_14.jpg)

结构上的主要特点大致如此，后续再详细分析代码和更深入的细节。

文中的架构图已上传到InfraTech库中[2]，有需要自取：

https://github.com/CalvinXKY/InfraTech/tree/main/models/deepseek_v4

参考:

[1]https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main

[2]https://github.com/CalvinXKY/InfraTech/tree/main/models/deepseek_v4

想深耕AI Infra领域？欢迎访问InfraTech库！内容涵盖大模型基础、PyTorch/vLLM/SGLang框架入门、性能加速等核心方向，配套50+知识干货及适合初学者的notebook练习：https://github.com/CalvinXKY/InfraTech

扫码关注我们，了解更多AI Infra基础知识。![](/images/collections/wechat/asset/img_15.jpg)
