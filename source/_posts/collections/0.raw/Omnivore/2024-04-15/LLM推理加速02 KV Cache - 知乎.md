---
title: LLM推理加速02 KV Cache - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-15/LLM推理加速02-KV-Cache-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 4f6dbf2f-c4b5-430d-b6a1-353c22b258de
---

# LLM推理加速02 KV Cache - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/llm-02-kv-cache-18edf7759d2)
[Read Original](https://zhuanlan.zhihu.com/p/692183150)



发布于 2024-04-12 19:47・IP 属地上海 ，编辑于 2024-04-13 09:58・IP 属地上海

LLM推理加速topic以下几部分组成

> [LLM推理加速01 大模型解码生成](https://zhuanlan.zhihu.com/p/691784448)  
> [LLM推理加速02 KV Cache](https://zhuanlan.zhihu.com/p/692183150)  
> LLM推理加速03 性能指标  
> LLM推理加速04 内存管理-PagedAttention和vllm  
> LLM推理加速05 量化 - LLM.int8()和AWQ  
> LLM推理加速06 attention设计-SWA和GQA  
> LLM推理加速07 解码算法

**相关参数**

* `bs`：数据批大小
* `prompt_len`: 输入的prompt长度
* `seq_len`：文本总长度（prompt+decoder）
* `hidden_size`：总维度，简称`h`。`hidden_size=head_dim*head_num`
* `head_dim`：每个注意力头head的维度
* `head_num`：注意力头head的个数
* `layer_num`：transformer layer的层数
* `k_bits`: fp16为2字节， fp32为4字节

## 1.1 传统生成解码

**问题**：传统的注意力attention计算，存在大量计算冗余。

**解决办法**：KV-Cache

### 1.1.1 冗余1 ：Attention计算

**结论**：decoder-only模型结构中，在生成第i个token时，只需要第i个token的注意力`Ai`。

**原因**：因为前面(i-1)个token已经生成了。如下图所示：

![](https://proxy-prod.omnivore-image-cache.app/2670x1118,srHup89-8MPlxQkFnfbq4pYvipmqr8s282wHROlTfkeQ/https://pic2.zhimg.com/v2-38ebc941beaf262773c2613897ae8cd1_b.jpg)

### 1.1.2 冗余2：QKV计算

**结论**：计算第i个token注意力`Ai`，只需要当前时刻的`Qi`和所有时刻的`KV`。

**原因**：在`decoder only`架构中，`token`逐个生成，注意力权重矩阵为下三角矩阵（即生成第`i`个token，只能依赖于前`i-1`个token）。如下图所示：

![](https://proxy-prod.omnivore-image-cache.app/2544x1396,s9d4OeXMCCJG4XOocEb6wrzYby9qLDKCdm-U7wb64gc0/https://pic3.zhimg.com/v2-71f2516ae419a209e1d024c6d6f1b2f2_b.jpg)

## 1.2 基于kv-cache的生成解码

`kv-cache`：**用空间换时间**。为了避免每次生成token时重新计算`key`、`value`向量。利用预先计算好的`key`值和`value`值，可以节省大量计算时间，但是会占用一定的存储空间。

### 1.2.1 原理

由两个阶段构成：

（1）**预填充阶段prefill**：计算输入prompt文本X的`key`和`value`，并保存为`key cache`和`value cache`。 

（2）**解码阶段decode**：token逐一生成，并更新`kv-cache`。利用`Qi`计算第`i`个token的注意力权重`Ai`

![](https://proxy-prod.omnivore-image-cache.app/3024x1364,s2X2VmtDEPn0-NUAUpl2fthu9Cv3kyQhzUjX5S0YVpQI/https://pic2.zhimg.com/v2-dafc2f54404ab4c26c495b4a437ae4d1_b.jpg)

![](https://proxy-prod.omnivore-image-cache.app/3054x2432,s0jhwLhLtESGIe2HKnL6S5odyt-8nmWc_SZlInzCYEHs/https://pic2.zhimg.com/v2-21864b94fd931af3c44980078c061b5d_b.jpg)

### 1.2.2 计算量分析

* 计算attention时，计算量减少。
* 计算QKV时，计算量减少。

**结论**：文本长度越长，减少的计算量越明显。

![](https://proxy-prod.omnivore-image-cache.app/783x295,s6hjSwJjQ9g0c8yJkUoW4h4eXj_LK7kqq5qU02_ro4Ls/https://pic1.zhimg.com/v2-2d540106e55abc42d919c2b4549cac5c_b.jpg)

### 1.2.3 显存占用分析

通过提前预存储已经计算好的key和value，会带来显存的占用。

每一层的`cache key`的shape大小为：\[bs,seq\_len,hidden\_size\]

`kv cache`占用的显存大小（字节）：

`2*bs*seq_len*hidden_size*layer_num*k_bits`   
\= `2*bs*seq_len*head_dim*head_num*layer_num*k_bits`

**实验结论**：随着**文本长度seq\_len**、**批处理bs**的增加，kv cache显存占用显著增加。

![](https://proxy-prod.omnivore-image-cache.app/715x607,sUzpqELywGKzNDU2-IZytfrS1xUxrltltZKZhYnR4JlA/https://pic3.zhimg.com/v2-39224ca38049091258b81e242d31eefe_b.jpg)

`PagedAttention`论文显示，现有的推理系统，26GB的模型，`kv cache`显存占用约30%+

![](https://proxy-prod.omnivore-image-cache.app/519x486,s0WfuPXPzwl0HQ7KaiyL1HiLgLpwwUx-p_QNk1ZUcE-4/https://pic4.zhimg.com/v2-7f015996fb42ae10a09fe746a7c7f353_b.jpg)

## 1.3 代码实现

`kv cache`使用：`GenerationConfig`类中的参数`use_cache`设置为True，默认True

`kv cache`实现：通过`DynamicCache`进行更新使用，源码位于`src/transformers/cache_utils.py` 

```makefile
import torch
import torch.nn as nn
bs=4
prompt_len=5
hidden_size=4
vocab_size=100

Wq = torch.randn(hidden_size, hidden_size)
Wk = torch.randn(hidden_size, hidden_size)
Wv = torch.randn(hidden_size, hidden_size)
emb = nn.Embedding(vocab_size,hidden_size)
lm_head=nn.Linear(hidden_size,vocab_size)
```

### 1.3.1 无kv cache

```makefile
#step1: 预填充阶段，处理输入prompt，生成第一个token
inputs = torch.randint(0,vocab_size,[prompt_len]) #[prompt_len]
print("step1:输入prompt的token:",inputs)
inputs_emb = emb(inputs) #[prompt_len, hidden_size]
Q,K,V=inputs_emb@Wq,inputs_emb@Wk ,inputs_emb@Wv#[prompt_len, hidden_size]
att_weight=Q@(K.T)#[prompt_len, prompt_len]
print("step1:att_weight:",att_weight.shape)
att_output=att_weight@V #[prompt_len, hidden_size]
output = lm_head(att_output) #[prompt_len, vocab_size]
output_token = torch.argmax(output,dim=-1)[-1:] 
print("step1:输出生成的token:",output_token)

print("##########################")
#step2：解码阶段，一个个token逐个生成
inputs = torch.cat((inputs,output_token),dim=-1)
print("step2:输入的token:",inputs)
inputs_emb = emb(inputs) #[prompt_len+1, hidden_size]
Q,K,V=inputs_emb@Wq,inputs_emb@Wk ,inputs_emb@Wv#[prompt_len+1, hidden_size]
att_weight=Q@(K.T)#[prompt_len+1, prompt_len+1]
print("step2:att_weight:",att_weight.shape)
att_output=att_weight@V #[prompt_len+1, hidden_size]
output = lm_head(att_output) #[prompt_len+1, vocab_size]
output_token = torch.argmax(output,dim=-1)[-1:] 
print("step2:生成的token:",output_token)
```

打印结果：

```clean
step1:输入prompt的token: tensor([26, 85, 43, 84, 46])
step1:att_weight: torch.Size([5, 5])
step1:输出生成的token: tensor([83])
##########################
step2:输入的token: tensor([26, 85, 43, 84, 46, 83])
step2:att_weight: torch.Size([6, 6])
step2:生成的token: tensor([83])
```

### 1.3.2 有kv cache

```makefile
#step1: 预填充阶段，处理输入prompt，生成第一个token
inputs = torch.randint(0,vocab_size,[prompt_len]) #[prompt_len]
print("step1:输入prompt的token:",inputs)
inputs_emb = emb(inputs) #[prompt_len, hidden_size]
Q,K,V=inputs_emb@Wq,inputs_emb@Wk ,inputs_emb@Wv#[prompt_len, hidden_size]
#kv cache显存占用
cacheK=K
cacheV=V
att_weight=Q@(K.T)#[prompt_len, prompt_len]
att_output=att_weight@V #[prompt_len, hidden_size]
output = lm_head(att_output) #[prompt_len, vocab_size]
output_token = torch.argmax(output,dim=-1)[-1:] 
print("step1:输出生成的token:",output_token)

print("##########################")
#step2：解码阶段，一个个token逐个生成
inputs = output_token
print("step2:输入的token:",inputs)
inputs_emb = emb(inputs) #[1, hidden_size]
#QKV计算量减少
Q,K,V=inputs_emb@Wq,inputs_emb@Wk ,inputs_emb@Wv#[1, hidden_size]
#kv cache显存占用 
cacheK=torch.cat((cacheK,K),dim=0)#[prompt_len+1, hidden_size]
cacheV=torch.cat((cacheV,V),dim=0)#[prompt_len+1, hidden_size]
#attention计算量减少
att_weight=Q@(cacheK.T)#[1, prompt_len+1]
att_output=att_weight@cacheV #[1, hidden_size]
output = lm_head(att_output) #[1, vocab_size]
output_token = torch.argmax(output,dim=-1)
print("step2:生成的token:",output_token)
```

打印结果：

```clean
step1:输入prompt的token: tensor([16, 88,  1, 50, 72])
step1:输出生成的token: tensor([71])
##########################
step2:输入的token: tensor([71])
step2:生成的token: tensor([46])
```

## 2、推理优化方向

在模型推理中，处于访存受限的状态（见“LLM推理加速03 性能指标”）。而显存占用由模型参数+kv cache两部分组成。故LLM推理的主要优化方向：**减少KV cache显存占用**。

根据前文分析，`kv cache`占用的显存大小（字节）： `2*bs*seq_len*head_dim*head_num*layer_num*k_bits`

**LLM推理加速的优化方向**：

* **减少`seq_len`长度**：SWA（Sliding window attention），减少了注意力的长度。见“LLM推理加速06 attention设计-SWA和GQA”
* **减少`head_num`个数**：MQA（multi-query attention)、GQA（Grouped-query attention），减少kv cache的head个数。见“LLM推理加速06 attention设计-SWA和GQA”
* **减少`k_bits`** ：通过量化，模型参数由fp16-->int8/int4，每个参数占用的字节也由2byte --> 1byte/0.5byte。见“LLM推理加速05 量化 LLM.int8()/AWQ”
* **`Kv cache`的显存管理**：PagedAttention。 见“LLM推理加速04 内存管理-PagedAttention和vllm ”

发布于 2024-04-12 19:47・IP 属地上海 ，编辑于 2024-04-13 09:58・IP 属地上海

