---
title: Deepseek MLA 一定要做吸收吗？
date: "2025-03-25 00:00:00"
updated: "2025-03-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/Deepseek-MLA-一定要做吸收吗-9f7adc/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/24013149030
---


Deepseek MLA 一定要做吸收吗？

Zhai Feiyue

我们不生产代码，我们只是代码的搬运工

收录于 · 前面de算法

156 人赞同了该文章

​目录

Deepseek v3(DS V3) 实在是太火爆了，春节过后各大厂商和芯片都纷纷高调宣布部署了Deepseek v3, 一时间整个互联网都似乎都在讨论DS V3，连工作八竿子打不着的老婆都在问我什么是DS V3，同时由于V3发布影响很大 ，在离开Intel 前基于V2 写的一篇专利也加速filing 了，也算是借DS的东风上喝上了一口热汤。V2 之后的半年再看V3 感受还是挺多的。下面记录一下自己的理解。

TL;DR
本文讨论了DeepseekV3 中矩阵吸收的优化策略，在Prefill 的时候不做矩阵吸收，因为计算量会上升，但是在T不太大的时候（ 2K）开启CPP 似乎矩阵吸收还是划算；而在Decode 上要做矩阵吸收，不仅计算量降低Attention 的计算强度也增大，因此非常划算。

MLA ops 统计
MLA 的目标很直接，用lora来减少kv cache 的大小，MLA的介绍极其优化可以参考下面两篇，一篇是zhangmingxing 老师的，一篇是我们基于zhang 老师的工作

DeepSeek-V2 高性能推理 (1)：通过矩阵吸收十倍提速 MLA 算子 - 知乎

DeepSeek-V2 MLA KV Cache 真的省了吗？ - 知乎

MLA 有个小知识点，在推理的时候Prefill 和Decode 走的逻辑不同，推理的时候 Prefill 是不做矩阵吸收的，Decode 是要做矩阵吸收的，原因是Prefill做矩阵吸收是会增加计算量的，以V3 为例，我们简单计算下算力大小，只考虑图1 图2 中带颜色的部分其余不考虑（因为做不做吸收都不影响）

图1 矩阵不吸收
矩阵不吸收
opopskv_up_projB*KVT*512*256*128*2Multi-Head attentionB*128*QT*KVT*(192+128)*2
图2 矩阵吸收
矩阵吸收
OPopsk_absorbedB*128*QT*128*512*2QK_positionB*128*QT*KVT*64*2QKB*128*QT*KVT*512*2ScoreVB*128*QT*KVT*512*2v_absorbedB*128*QT*512*128*2KV up projection ops

\frac{矩阵吸收}{矩阵不吸收} = \frac{k\_absorbed+v\_absorbed}{KV\_up\_projection}=\frac{B*128*QT*128*512*2 + B*128*QT*512*128*2}{B*KVT*512*256*128*2} = \frac{QT}{KVT} 

- 当prefill 的时候，QT=KVT=T 的时候 矩阵吸收和不吸收在KV up projection的操作上没区别，但是当做Chunked Prefill Parallel (CPP)的时候，会发生区别，用了CPP QT 不再等于KVT，此时矩阵吸收的ops 要小于矩阵不吸收的ops，假设total T = 4K，Qchunk = 1K，则矩阵吸收算力是矩阵不吸收的1/4，Qchunk 越小，矩阵吸收在prefill 上收益越大
- 当decode 的时候， QT=1，则矩阵吸收ops 远小于矩阵不吸收，这个原因是原本重复在KV 上做up projection的操作转移到了Q 上，让Q 投影到kv 的latent space 上，QT远小于KVT，不需要对KVT 重复做up projectionAttention ops

\frac{矩阵吸收}{矩阵不吸收} = \frac{QK\_position+QK+ScoreV}{Multi-Head\ attention}=\frac{B*128*QT*KVT*64*2+B*128*QT*KVT*512*2+B*128*QT*KVT*512*2}{B*128*QT*KVT*(192+128)*2}=3.4 

无论Prefill 还是Decode, Attention 的部分矩阵吸收的ops是矩阵不吸收的3.4X，但吸收之后的Attention 计算强度(AI)是不吸收的128X(Q head num)

Total ops

\frac{矩阵吸收}{矩阵不吸收} = \frac{B*128*QT*KVT*64*2+B*128*QT*KVT*512*2+B*128*QT*KVT*512*2 + B*128*QT*128*512*2*2}{B*128*QT*KVT*(192+128)*2+B*KVT*512*256*128*2}=\frac{3.4*QT*KVT+409*QT}{QT*KVT+409*KVT} 

- 当Prefill的时候QT=KVT=T，此时 \frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*T+409}{T+409} ,矩阵吸收会增加计算ops(图3蓝色线)，当QT = 1/n KVT即开启CPP 的时候 \frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*T+409}{T+409*n} ，只要开启chunk在某些长度下( 2K)，吸收还是可以做的(图4)
- 当Decode 的时候QT=1，此时 \frac{矩阵吸收}{矩阵不吸收} = \frac{3.4*KVT+409}{410*KVT} 基本上小于1（图3红色线），因此Decode 的时候不仅计算量降低，同时Attention 的计算强度也上去了
图3. 红色线为Decode，蓝色线为Prefill不带CPP
图4. CPP 下不同chunk 下吸收与不吸收计算量比值
CPP 下的优化技巧
其实上述CPP下矩阵吸收有优势的情况也可以通过不做吸收优化，那就是缓存KV up projection 之后的tensor，图5 红色部分

图5. 缓存KV up projection在做Prefill 的时候缓存KV up projection tensor 可以降低历史chunk 的latent space 的重复up projection，以空间换时间，但要占用更多的memory，为 61\times{B}\times{128}\times{KVT}\times{(192+128)} 

以prefill 的时候B 一般较小，假设为1，T为1024，dtype 为BF16则多出5G左右，似乎还是可以接受的。

吸收不吸收的边界在哪里？
prefill 吸收 decode 不吸收，那这个边界在哪里呢？这个问题来自于 @朱然
 的一篇关于MLA 吸收的文章

的一个评论 @mmao
 

图6 xxxxx如果从ops 的角度来看吸收不吸收那我们只需要让下面这个公式小于1 就好了

\frac{矩阵吸收}{矩阵不吸收} =\frac{3.4*QT*KVT+409*QT}{QT*KVT+409*KVT}  1 

可以推出

QT  \frac{409KVT}{2.4KVT+409} ，函数图像(图7)可以看出若只计算ops，做吸收的边界在于QT   170（绿色部分）

图7 吸收收益曲线

编辑于 2025-03-25 17:37・上海
DeepSeek

mla

​赞同 156​​15 条评论​286 ​7 ​分享

​申请转载​​

未登录用户

15 条评论

默认
最新

注意力机制不集中

这里是不是写错了KV up projection ops
应该是比上kv_b_proj而不是multi-head-attn

2025-03-24 · 日本

​回复​1

Zhai Feiyue

作者

多谢多谢，已经改掉了

2025-03-25 · 上海

​回复​喜欢

张大老实

我可能没太理解，absorb以后W^UQ和W^UK可以离线做，这里的计算量似乎不应该加入计算？

2025-02-21 · 中国香港

​回复​1

杨歆

张大老实

vo absorb 前： c -  v -  softmax -  o；真的 absorb后：c -  softmax -  o；因为 v 的维度小于 c，所以真 absorb 后计算量提升了。

同理，qk absorb 前:  h -  q, c -  k,  q*k -  s； absorb 后： h- c, c*c -  s；因为 c 的维度大于 q(k)，所有计算量也是上升了。

上面的分析应该没问题？

2025-02-25 · 广东

​回复​1

Zhai Feiyue

作者

张大老实

真的absorb 增加了计算量，参考lora 无 base 矩阵
2025-02-21 · 上海

​回复​1

查看全部 7 条回复​

mmao

2025-04-03 · 浙江

​回复​喜欢

ZZJJChen

Attention ops那个公式分子的最后一项，score V为什么有一个512，不应该是v head dim 128吗？

2025-03-18 · 美国

​回复​喜欢

Zhai Feiyue

作者

因为k up 和 v up 通过交换律一个放到了attn q input 一个放到了attn o input，所以对于attn 计算来说 q head dim 是576， k head dim 是512+64，v head dim 是512，做完attn 之后q 是512，要重新投影到128 
2025-03-19 · 上海

​回复​喜欢

Eagle

图中矩阵吸收的部分是不是漏了一步，scoreV的维度是(QT, KVT)，后边应该需要转到 (QT, 512)，这里有一步矩阵乘法？

2025-03-05 · 北京

​回复​喜欢

Zhai Feiyue

作者

qk 的结果是QT，KVT，scoreV的结果就是QT head dim 了
2025-03-05 · 上海

​回复​1

关于作者

Zhai Feiyue
我们不生产代码，我们只是代码的搬运工

回答
11
文章
3
关注者
2,285

​关注他​发私信

大家都在搜
换一换

伊朗局势466 万热
拼多多被罚 15.2 亿且暴力阻碍监管437 万热
李雨桐泄露薛之谦信息被行拘370 万热
中将军衔很厉害吗349 万
日本发生7.5级地震328 万热
建议低精力人群查维D326 万热
网传酒店打回访电话致住客离婚300 万
养什么花是四季都开的285 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万

推荐阅读

如何掌握用于机器学习的流行DBSCAN聚类算法
一只茶

[机器学习] EM   GMM
艾雷

NLP预训练模型6 -- 模型轻量化（ALBERT、Q8BERT、TinyBERT等）
谢杨易发表于蚂蚁星盘推...

Deep MF论文理解总结
这篇文章主要是对17年发表在IJCAI的《Deep Matrix Factorization Models for Recommender Systems》论文理解。 跟随我前面知乎文章中的思路，当我们说到推荐系统时，首先想到的是召回和排序…

林小林