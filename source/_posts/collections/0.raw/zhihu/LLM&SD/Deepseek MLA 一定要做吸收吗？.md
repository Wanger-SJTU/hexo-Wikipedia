---
title: "Deepseek MLA 一定要做吸收吗？"
date: "2025-03-25 00:00:00"
updated: "2025-03-25 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/LLM-SD/Deepseek-MLA-一定要做吸收吗/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/24013149030"
---


Deepseek v3(DS V3) 实在是太火爆了，春节过后各大厂商和芯片都纷纷高调宣布部署了Deepseek v3, 一时间整个互联网都似乎都在讨论DS V3，连工作八竿子打不着的老婆都在问我什么是DS V3，同时由于V3发布影响很大 ，在离开Intel 前基于V2 写的一篇专利也加速filing 了，也算是借DS的东风上喝上了一口热汤。V2 之后的半年再看V3 感受还是挺多的。下面记录一下自己的理解。

### TL;DR

本文讨论了DeepseekV3 中矩阵吸收的优化策略，在Prefill 的时候不做矩阵吸收，因为计算量会上升，**但是在T不太大的时候（MLA ops 统计

MLA 的目标很直接，用lora来减少kv cache 的大小，MLA的介绍极其优化可以参考下面两篇，一篇是zhangmingxing 老师的，一篇是我们基于zhang 老师的工作

[DeepSeek-V2 高性能推理 (1)：通过矩阵吸收十倍提速 MLA 算子 - 知乎](https://zhuanlan.zhihu.com/p/700214123)

[DeepSeek-V2 MLA KV Cache 真的省了吗？ - 知乎](https://zhuanlan.zhihu.com/p/714761319)

<strong>MLA 有个小知识点，在推理的时候Prefill 和Decode 走的逻辑不同，推理的时候 Prefill 是不做矩阵吸收的，Decode 是要做矩阵吸收的，原因是Prefill做矩阵吸收是会增加计算量的</strong>，以V3 为例，我们简单计算下算力大小，只考虑图1 图2 中带颜色的部分其余不考虑（因为做不做吸收都不影响）

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_21c9e7a4ee1a.jpg)

图1 矩阵不吸收
#### 矩阵不吸收

opopskv_up_projB*KVT*512*256*128*2Multi-Head attentionB*128*QT*KVT*(192+128)*2![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_606d4539bd53.jpg)

图2 矩阵吸收
#### 矩阵吸收

OPopsk_absorbedB*128*QT*128*512*2QK_positionB*128*QT*KVT*64*2QKB*128*QT*KVT*512*2ScoreVB*128*QT*KVT*512*2v_absorbedB*128*QT*512*128*2<strong>KV up projection ops</strong>

$$\frac{矩阵吸收}{矩阵不吸收} = \frac{k\_absorbed+v\_absorbed}{KV\_up\_projection}=\frac{B*128*QT*128*512*2 + B*128*QT*512*128*2}{B*KVT*512*256*128*2} = \frac{QT}{KVT} $$

- 当prefill 的时候，QT=KVT=T 的时候 矩阵吸收和不吸收在KV up projection的操作上没区别，但是当做Chunked Prefill Parallel (CPP)的时候，会发生区别，用了CPP QT 不再等于KVT，此时矩阵吸收的ops 要小于矩阵不吸收的ops，假设total T = 4K，Qchunk = 1K，则矩阵吸收算力是矩阵不吸收的，Qchunk 越小，矩阵吸收在prefill 上收益越大
- 当decode 的时候， QT=1，则矩阵吸收ops 远小于矩阵不吸收，这个原因是原本重复在KV 上做up projection的操作转移到了Q 上，让Q 投影到kv 的latent space 上，QT远小于KVT，不需要对KVT 重复做up projection
<strong>Attention ops</strong>

$$\frac{矩阵吸收}{矩阵不吸收} = \frac{QK\_position+QK+ScoreV}{Multi-Head\ attention}=\frac{B*128*QT*KVT*64*2+B*128*QT*KVT*512*2+B*128*QT*KVT*512*2}{B*128*QT*KVT*(192+128)*2}=3.4 $$

无论Prefill 还是Decode, Attention 的部分矩阵吸收的ops是矩阵不吸收的3.4X，但吸收之后的Attention 计算强度(AI)是不吸收的128X(Q head num)

<strong>Total ops</strong>

$$\frac{矩阵吸收}{矩阵不吸收} = \frac{B*128*QT*KVT*64*2+B*128*QT*KVT*512*2+B*128*QT*KVT*512*2 + B*128*QT*128*512*2*2}{B*128*QT*KVT*(192+128)*2+B*KVT*512*256*128*2}=\frac{3.4*QT*KVT+409*QT}{QT*KVT+409*KVT} $$

$$- 当Prefill的时候QT=KVT=T，此时 \frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*T+409}{T+409} ,矩阵吸收会增加计算ops(图3蓝色线)，当QT = 1/n KVT即开启CPP 的时候 \frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*T+409}{T+409*n} ，只要开启chunk在某些长度下(\frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*KVT+409}{410*KVT} 基本上小于1（图3红色线），因此Decode 的时候不仅计算量降低，同时Attention 的计算强度也上去了$$
![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_39dd5d50c7f4.jpg)

图3. 红色线为Decode，蓝色线为Prefill不带CPP![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8c07c2fa462f.jpg)

图4. CPP 下不同chunk 下吸收与不吸收计算量比值
### CPP 下的优化技巧

其实上述CPP下矩阵吸收有优势的情况也可以通过不做吸收优化，那就是缓存KV up projection 之后的tensor，图5 红色部分

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_f25b30d65f17.jpg)

图5. 缓存KV up projection在做Prefill 的时候缓存KV up projection tensor 可以降低历史chunk 的latent space 的重复up projection，以空间换时间，但要占用更多的memory，为 61\times{B}\times{128}\times{KVT}\times{(192+128)} 

以prefill 的时候B 一般较小，假设为1，T为1024，dtype 为BF16则多出5G左右，似乎还是可以接受的。

#### 吸收不吸收的边界在哪里？

prefill 吸收 decode 不吸收，那这个边界在哪里呢？这个问题来自于 [@朱然](//www.zhihu.com/people/670db26b497bb8d4f59982b17b14b07c)

 的一篇关于MLA 吸收的文章

[](https://zhuanlan.zhihu.com/p/29103563814)

的一个评论 [@mmao](//www.zhihu.com/people/0baf33cf8b0630238d481a9a6879f2a0)

 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_65e2bb98632f.jpg)

图6 xxxxx如果从ops 的角度来看吸收不吸收那我们只需要让下面这个公式小于1 就好了

$$\frac{矩阵吸收}{矩阵不吸收} =\frac{3.4*QT*KVT+409*QT}{QT*KVT+409*KVT} $$

可以推出

QT ，函数图像(图7)可以看出若只计算ops，做吸收的边界在于QT ![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_365713034d77.jpg)

图7 吸收收益曲线
