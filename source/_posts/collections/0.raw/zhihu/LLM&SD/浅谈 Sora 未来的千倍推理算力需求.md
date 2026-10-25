---
title: 浅谈 Sora 未来的千倍推理算力需求
date: "2024-03-08 00:00:00"
updated: "2024-03-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/浅谈-Sora-未来的千倍推理算力需求/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/683636677
---


<strong>观点：</strong>

- Sora 的训练算力需求大概率是 GPT-4 的  左右
- Sora 的推理算力需求是 GPT-4 的<strong>1000 倍</strong>以上（这么看来 2 万亿美元市值的 NVIDIA 仍然不是高点）

- 预计单台 8xA100 机器生成 1min video 需要推理 3h 以上
- 预计单台 8xH100 机器生成 1min video 需要推理 31min 以上

- 复现 Sora 的难度没有预想中的大，至少训练算力不是瓶颈； 国内靠 A800/H800 的余量仍可以满足
- 国产芯片迎来一次机会，设计并量产 14nm 的中算力、大显存 LLM 推理芯片，可以绕开芯片制程的瓶颈迅速商业化
3.8 13:00 更新:经评论区 [@程勇](//www.zhihu.com/people/3791f46565ab66ffdcae165a99650023)

 $指正，  Scaling Laws 原论文中的 table 1 漏算了 Attention 部分 Attention Score * V 部分（跟 Mask 的开销一样），因此实际的公式应该是： Csora&#x2212;forward/token=2N+4nlayernctxdattn=2(12nlayerdmodel2+2nlayernctxdattn)&#x2248;2(12nlayerdmodel2+2&#x2217;12nlayer&#x2217;14dmodel&#x2217;dmodel)=58N" role="presentation">Csora−forward/token=2N+4nlayernctxdattn=2(12nlayerdmodel2+2nlayernctxdattn)≈2(12nlayerdmodel2+2∗12nlayer∗14dmodel∗dmodel)=58NC_{sora-forward/token} = 2N + 4n_{layer}n_{ctx}d_{attn} = 2 (12n_{layer}d_{model}^{2} + 2n_{layer}n_{ctx}d_{attn} ) \approx 2(12n_{layer}d_{model}^{2} + 2*12n_{layer}*14d_{model}*d_{model}) = 58N $

相当于 Sora 的推理成本如果是完整的 1M token 的话，需要 58N （之前的结论是 30N），训练则是 58N*3 = 174N。  推理成本还会将近翻一倍 （达到 GPT-4 生成 1k token 的 3000 倍**）。   不过也有可能是 Sora 的视频是由多段 30s 视频拼接起来，不是一次性生成 1min 的视频，这样可以使其单位 token 的成本减半，总成本和之前预估的持平。 因此我正文中就不再一一更改公式了。

2.27 15:00 更新:经评论区 [@Victarry](//www.zhihu.com/people/b8fd114b56b395d247744cee40056139)

 指正， Scaling Laws 里推导的 C&#x2248;6ND" role="presentation">C≈6NDC\approx6ND 成立的前提是 dmodel&#x226B;nctx/12" role="presentation">dmodel≫nctx/12d_{model} \gg n_{ctx}/12 。这个在超长的 context length （如 1M）时不再适用，因此 Sora 的训练推理成本均会更高，初步估算 Sora 的推理成本在原结论 100 倍的基础上还需要增加 15 倍。** 我更新到原文推导 Sora 所需算力的部分。 

2.26 11:00 更新：经评论区 [@mackler](//www.zhihu.com/people/59f76a6c40b262c91e0e8b9dbb100168)

 指正，以及和团队内负责多模态大模型的 黄君实 老师讨论，Sora 的 DiT 是 Encoder-Only 架构，而非 GPT 的 Decoder-Only 架构，导致 Sora 模型的推理访存需求要远小于 GPT， Sora 的推理计算量占推理的主要代价而非访存量**。 所以下一代推理芯片不能一味地追求低算力，算力提升会显著提升 Sora 的视频生成速度，但对 GPT 的推理速度提升有限。 具体分析我补充到原答案正文中的 Sora 推理算力需求估计部分。

以下是原文：

### 测算 GPT-4 的训练算力需求

首先估算 GPT-4 的算力需求， 根据 OpenAI 的 Paper： [Scaling Laws for Neural Language Models](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2001.08361.pdf) , 训练 Transformer 模型的理论计算量为 FLOPs ≈ 6*ND ***。其中， N 为模型参数量大小， D 为训练数据量大小：

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_8ff94f59cbf8.jpg)

LLM 每 token 需要的计算量是 6 倍的模型大小基于一些"众所周知"的消息：

- GPT-4 是一个 MoE 模型，其总参数量估计在 1.6T - 1.8T 之间，激活参数量估计在 400B - 600B 之间， GPT-4 的训练理论计算量需按照激活参数量而非总参数量来估计。 我们假设为 400B 激活。
- GPT-4 的训练数据约为 13T - 20T 之间，我们假设为 20T 数据
则 GPT-4 训练所需的 FLOPs = 6 * 400B * 20T = 4.8 * 10^25

目前最大的模型训练计算量预估在 10^25 - 10^26 之间那么 GPT-4 需要训练多久呢？ 

GPT-4 是 2022 年上半年训练的，据说 OpenAI 使用了 25000 张 A100。 每张 A100 的理论算力是 312 TFLOPs。  假设 25k 的超大规模集群训练 所需通信量比 Dense 更高的 MoE 模型，OpenAI Infra 优化利用率 MFU 到 40% （无法 overlap 的通信和访存会大幅降低利用率），则可以推导出来训练所需的时间是：

 $$Duration = 4.8*10^{25} / (312*10^{12}*25000*0.4*86400)\approx178 days $$

即大约是 6 个月时间 （与传闻一致）。

如果是改为 H100 的卡，虽然标称了 989 TFLOPs 的单卡算力，实际的训练效率则约为 A100 的 2.5 倍（BF16），因此需要 10000 张 H100 训练半年时间**。

如果用 FP8 的混合精度，则能进一步提升至 A100 的 3.5 倍。
### 测算 Sora 的训练算力需求

根据 OpenAI 的技术报告： Video generation models as world simulators ，Sora 是一个 Diffusion Model， 且应该使用的是 Diffusion Transformer** （DiT）作为主干模型网络。 虽然 Diffusion Transformer 和 LLM 的 Autoregression Model 架构不同， 但均为 Transformer 架构： 

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_075173a05eac.jpg)

Diffusion Transformer 架构且训练时，巨量的数据会随机分布在 T = [0, 1000] 的时间步上，以至于 DiT 的训练计算量估计 和 GPT 的训练计算量估计可以使用相同的公式。（Video Encoder/Decoder 的计算量相比 DiT 可以忽略不计）

<strong>Sora 的模型多大呢？</strong> 

目前大家猜测的出入很大， 从 3B 到 60B 都有。  我们折中一下，假设为 20B 的模型大小。

<strong>Sora 训练的数据量有多少呢？</strong>

这个猜测的范围就更大了。  一个可供对比的数据量是：  每分钟上传至 YouTube 的视频是 500h 的量级。 则<strong>近五年的 YouTube 上的视频数据总量为： 13亿 小时 =  788亿 分钟</strong>。由于 Diffusion 模型训练 text to video 需要高质量的标注视频，因此我们可以估计 Sora 训练的视频量级为<strong>1亿 分钟</strong>左右。

<strong>一分钟的高清视频等价于多少 Token？</strong>

目前有一个比较准确的估计， <strong>一分钟视频约为 1M tokens 。</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_efefbd0420d9.jpg)

Sora 的 Video Encoder 部分参考 Diffusion Transformer， 256x256 的图片会被划分为 32x32 个 patch。 我们假设 1920x1080 分辨率的高清图像经过下采样得到 512x256 大小的图片，假设一个 patch 为 8x8 的像素块，则得到 64x32 大小的 patch 矩阵， <strong>一张图片则约为： 64x32=2048 个 patch</strong>。 高清视频 1s 约为 30 帧以上，但实际训练和推理也会做压缩，我们估计压缩后 <strong>1s 约为 9 帧。</strong>则一分钟共 540 帧。 一分钟的视频一共有：  

1min Video = 64*32*60*9=1.1M patches 

关于一分钟的视频具体有多少 patch 有多种推导方法，如果没有下采样的话，一帧 1920x1080 经过 VAE Encoder 可能会得到  120x68=8k patch。 即使 FPS=1 也会有 480k。 如果 FPS = 6 的话就有 3M patch 了。而 Diffusion Transformer 把整个 video 切成 m*n*t 三维的 patch （仍是 RGB 像素空间）阵列后，经过空间映射会得到 latent 空间中的一维序列，一个 patch 对应的一个 latent 元素，等价于 LLM 中的一个 token（经过字符空间映射过来的 token 空间基本单元）。 因此保守估计 1 分钟的视频有 1M tokens。

D=10^{8}*10^{6}=10^{14}=100T 

则基于 Sora 1亿分钟 video ，估计 Sora 的训练 token 量是 100T tokens

$**注： 先前计算 Sora 的 FLOPs 仍使用了 6ND 的公式，但是这个在 1M 的 seq len 下不适用。这里更新一下。Scaling Laws 里推导的 C\approx6ND 成立的前提是 d_{model} \gg n_{ctx}/12 。 一般目前 20B 左右的模型， d_{model} 也就是 4k - 6k，我们这里假设 d_{model}=6144 ，而 n_{ctx}=1M ， d_{model}=d_{attn}=6144 ， n_{ctx} / 12 = 1M / 12 \approx 14 * 6144=14d_{model} ，则可以估算：$

$C_{(fw+bw)/token} = 6N+6n_{layer}n_{ctx}d_{attn} = 6 (12n_{layer}d_{model}^{2} + n_{layer}n_{ctx}d_{attn}) \approx6(12n_{layer}d_{model}^{2} + 12n_{layer}*14d_{model}*d_{model}) = 6(N+14N) = 90N $

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_1455f55f8440.jpg)

context length 很大时，Attention 部分的计算不能忽略因此，如果 Sora 全量数据训练都是 1M seq length，则 Sora 的训练成本需要增加 15 倍。**如果 Sora 是先训练一个 32k/64k 的模型，最后再 Continue Training 1M 的模型，则 Sora 的训练成本跟之前预估的接近。

我个人倾向于后者。   LLM 里的 long context 也不是全量数据都用这么长的 seq len 训练的，更经济的做法是用 4k 训练完之后，再扩展到 100k 继续训练一小部分数据。假设 Sora 训练时是一个 32k 的模型，则： Sora 训练所需的计算量是 1.2 * 10^25

FLOPs = 6*N*D = 6 * 20 * 10^{9}*10^{14}=1.2*10^{25} 

相比于 GPT-4 训练所需算力的 4.8 * 10^25 FLOPs，seq len = 32k 的 Sora 训练所需算力 1.2 * 10^25 FLOPs 是 GPT-4 的 。**由于 GPT-4 的成本是 25000 张 A100 训练了 6 个月，因此 Sora 只需要 6000 张 A100 训练 6 个月。

**如果 Sora 全量训练全部是用的 1M 的 seq length，则训练成本会超过 GPT-4： FLOPs = 90ND = 90 * 20 * 10^{9}*10^{14}=1.8*10^{26}     约为 GPT-4 的 4 倍**。
### 测算 Sora 的推理算力需求

我们假设：

- 用户 Query 调用一次 GPT-4 的 token 开销为 1k tokens （比较准确，实际上会比这个还多一些， OpenAI 的 system prompt 就已经大几百个 token 了）。 阅读一个千字的文章，人肉眼看需要将近一分钟。
- 用户 Query 调用一次 Sora 生成一分钟的视频的 token 开销为 1M tokens （比较准确，推导过程见训练部分的 patch 数量估计）
- Sora 全面开放访问后，用户<strong>调用 Sora 的次数跟调用 GPT-4 的次数一样</strong>。 （这个不准确。 但<strong>我猜测 Sora 实际的调用需求会远超 GPT-4</strong>， 按照用户想法实时生成高清视频对于多巴胺的满足感要超过文本 QA，就像 <strong>看抖音的次数远超看知乎的次数</strong>）
同时我们又在训练部分估计了： GPT-4 是一个 400B 激活参数量的大模型，Sora 是一个 20B 参数量的大模型。 

Diffusion Transformer 在推理时的逻辑 和 LLM 不一样，虽然都是 Transformer 架构， Diffusion 需要基于一个随机的 noise latent 矩阵按照 <strong>多个时间步迭代生成，</strong>每一步都在迭代细化 latent （图像/视频）。 在一开始的 Stable Diffusion 推理时是 50 个 step， 后来经过算法优化可以做到 20 个 step，当然也有极限的 1 step 生成的研究（step 越少，图像的效果越差）。 我们假设 Sora 在实际推理时，需要 20 个 step 生成视频。

$**注： 先前计算 Sora 的 FLOPs 使用的是 C_{forward/token}=2N 的公式，但是这个在 1M 的 seq len 下不适用。这里更新一下。参考 Sora 训练部分的估算 n_{ctx} / 12 = 1M / 12 \approx 14 * 6144=14d_{model} ， 一次 Sora 前向的成本是： $

$C_{sora-forward/token} = 2N + 2n_{layer}n_{ctx}d_{attn} = 2 (12n_{layer}d_{model}^{2} + n_{layer}n_{ctx}d_{attn} ) \approx 2(12n_{layer}d_{model}^{2} + 12n_{layer}*14d_{model}*d_{model}) = 30N $

GPT-4 推理 1k token 的成本仍可以按照 一次前向： C_{GPT-forward/token}=2N  来估计。

那么对于单次 Query：

- 推理一个 1k token GPT-4 的计算成本就是： FLOPs = 2 * 400B * 1k = 800T
- 推理一个 1min video （1M tokens ） Sora 的计算成本是：  FLOPs = 30 * 20B * 1M * 20 = 12000000T
则得出结论： Sora 推理 1min video 的理论计算量 是 GPT-4 推理 1k token 的理论计算量的 15000 倍。

<strong>注： 访存开销的量化分析挪到了文末。但是推理需求的计算不能只考虑理论计算量。 GPT（所有 LLM）是 Decoder-Only Transformer 架构，通过 Auto Regression 的方式预测下一个 token，是一个完全的 Memory bound 场景，一般实际推理时的 GPU 算力利用率很低，5% 左右。 而 Sora 的 DiT 是一个 Encoder-Only Transformer 架构，推理时会输出全部长度的 token，一次性生成全部长度的 token，对 Memory 的访存次数要远小于 GPT，是一个 Compute Bound 场景，</strong>我们假设 Sora 的推理利用率是 50%<strong>。</strong>不过 Sora 是否是一次性生成 1M token 超长序列是存疑的，我们假设他的 seq len 就是完整的 1M，而非多段（每段大概 5 s，相邻两段有 overlap 的视频帧）顺序生成后拼接得到完整视频。

因此 Sora 推理所需的实际算力需求估计：

$$\frac{Sora-InferenceCost}{GPT-InferenceCost} = \frac{C_{Sora} / MFU_{Sora}}{C_{GPT}/MFU_{GPT}} = \frac{30N_{Sora}D_{video}T / 0.5}{2N_{GPT}D_{text} / 0.05} = \frac{30 * 20B * 1M * 20 / 0.5}{2 * 400B * 1k / 0.05} = 1500 $$

<strong>Sora 推理 1min video 对于实际算力的需求是 GPT-4 推理 1k token 的 1500 倍。</strong>

#### Sora 生成 1min video 需要多久？

我们假设一台 8xA100 机器生成 Sora 1min video，A100 的单卡算力是 312TFLOPs ，根据之前推导的各项参数，可以推导出来 8xA100 机器需要生成的时间：

$$Duration = \frac{C_{Sora}}{8C_{A100}MFU} = \frac{30N*D*T}{8*312T*0.5} = \frac{30*20B*1M*20}{8*312T*0.5} = 9615s = 3.2h $$

如果是 8xH100 机器，并加上 FP8 推理，按照 40% MFU 推导:

$$Duration = \frac{C_{Sora}}{8C_{H100}MFU} = \frac{30N*D*T}{8*1979T*0.4} = \frac{30*20B*1M*20}{8*1979T*0.4} = 1875s = 31min $$

#### Sora 生成 1min video 需要多少钱？

以  GPT-4 1k tokens 约 0.06 定价计算， Sora 1min video 大约是 0.06 * 1500 = $90

### 复现 Sora 的难度

由训练算力估算可以看到， 复现 Sora 的训练成本比 GPT-4 还少， 6000 张 A100 就足可以训练完相同量级的模。且国内的 A800 / H800 余量足够好几个团队满足这个训练门槛。因此训练算力不是瓶颈。

剩下的需要搞定 Sora 的算法 和 数据。 

- 从 Sora 的技术报告上来看， Diffusion Transformer 不是一个新概念，之前在做文生视频的团队也是类似 Diffusion 的路线，只是 <strong>视频的长度差了好几倍、视频的精细化效果和一镜到底的场景变换连续性上存在明显差距。</strong>

- 因此复现 Sora 从算法研究上需要深挖 OpenAI 没有公开的细节
- 除了 Diffusion 路线，也可以探索 Auto Regression 的 Transformer 路线
- Infra 需要支持 1M context length 训练

- 数据角度， 1 亿（<strong>0.1B</strong>）分钟的 video 并不算多。 YouTube 上每分钟上传的视频有 500h，近五年上传的视频总量有 1.3B 小时，即 <strong>78.8B</strong> 分钟。 实际被用作训练的数据仅占全网总量的千分之一左右。 但 Diffusion Model 训练依赖很高质量的有标数据，因此需要对 1亿分钟的高质量 video 均做非常详尽、准确的 caption。 目前 OpenAI 依赖的是 GPT-4V 的标注能力。 所以数据上的瓶颈其实是<strong>高质量的 Video Caption Model。</strong>
也可能存在一种前提：  <strong>训练好一个 Sora 水平的视频大模型，依赖一个 GPT-4V 水平的多模态大模型提供全量标注。</strong>

### 国产芯片发展机遇

其实是 Groq 芯片的成功营销带来的启发，纯 SRAM 方案可能不是一个好方案，但是 Groq 找准了 Decoder-Only Transformer Model Inference 的痛点： Memory Bound ，所以 Groq 用了 14nm 设计了一个只有 188TFLOPs 的芯片，另一个更为熟知的是 Google TPU 直到 v5e 版本也只有 197 TFLOPs （对比之下，昇腾 910B 都有 376TFLOPs， 7nm+）。 因此，<strong>一个高制程、高算力的芯片，在大模型推理时是发挥不出来它的算力能力的。</strong>更具有性价比的设计是： <strong>中制程、中算力、大显存 的推理芯片。</strong>

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_ca0f0078773d.jpg)

Grop Card 规格， 14nm 188TFLOPs虽然 NVIDIA H100 已经是 4nm 工艺。但我们做推理完全用不到这么高的制程，14nm 的芯片 做到 180TFLOPs 对于 LLM 的推理来说完全够用。

存储方面，还是尽可能增大显存大小，比如到 144G，可以堆叠 HBM。虽然国内目前没法量产 HBM，但是 <strong>三星的 HBM 不在禁售名单里，可以采购。</strong>另外就算不用 HBM，用国产的 GDDR6 存储也可以（NVIDIA 的 L20 推理卡就是 GDDR6）。

因此我们国产芯片如果要做专用于 LLM 推理的芯片的话，目前的工艺技术不仅满足需求，还可以通过量产将 NVIDIA 的芯片价格打下来。随着大模型的应用深入，推理算力的需求将远超训练算力的需求，大模型推理可能会迎来类似曾经国产光伏倾销世界的时代。

### 引申：下一代 LLM 推理芯片

当然未来的 LLM 推理可能由于 HBM 的近存计算（Processing in Memory）落地而发生巨变。包含 KVCache 的 Attention Inference 是大内存，小计算的 GEMV 向量矩阵乘，如果在内存上可以用很小的计算代价原地计算，则不需要占用宝贵的访存带宽，期待 HBM-PIM 会让 LLM 推理性能再翻一个台阶，很大程度上缓解内存墙的问题。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_c31b48decce3.jpg)

三星推出的 PIM 技术> 参考： Samsung Processing in Memory Technology at Hot Chips 2023

### 补充： Sora Inference 的 访存成本：

> 注：之前对于访存开销的估计不准确，大幅低估了 GPT Decoder-Only 的访存开销
LLM Decoder-Only 推理开销测算 参考： [Groq公司推出的全球最快的大模型推理服务达到每秒输出500个token，如何看待这一技术？](https://www.zhihu.com/question/645010090/answer/3405466387)

- GPT-4 生成 1k token 的显存开销： Mem = 1.6T + 1k  * TokenSize * bsz 
- Sora  生成 1M token 的显存开销： Mem = 20B + 1M * LatentSize * bsz 
$- GPT-4 生成 1k token 的访存开销是 ： Memory Access Cost = 1.6T * 1k  +  2\sum_{i=1}^{1k}{i} * n*h*b = 1.6T* 1k + 1M*nhb $
- Sora 生成 1M token 的访存开销是：  Memory Access Cost = ( 20B + 3*1M * n * h * b ) * 20 = 400B + 60M*nhb 
> 假设 dtype int8， n 表示 num layer，h 表示 hidden size， b 表示 batch size . GPT 加载 kv，Sora 计算需要 qkv

考虑到 GPT-4 推理时 batch size 需要尽量增大，减少 weight 加载次数降低访存次数， 非参数部分（GPT 而言主要是 KVCache）的显存会超过模型大小，可以估计 1k*nhb > 1.6T。 

$$\frac{GPT4-MemAccessCost}{Sora-MemAccessCost} = \frac{1.6T*1k + 1M*nhb}{0.4T + 60M*nhb}  \approx  \frac{1.6T*1k + 1.6T*1k}{0.4T + 0.4T*60k}   \approx  \frac{1}{8} $$

推理 Sora 的计算成本是 推理 GPT-4 的计算成本的 15000 倍， 推理 Sora 的访存成本 可能只有 推理 GPT-4 的访存成本的 8 倍。 访存在 Sora 推理中的占比要远小于 GPT-4。
