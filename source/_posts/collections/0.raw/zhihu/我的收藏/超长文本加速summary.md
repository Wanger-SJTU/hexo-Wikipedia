---
title: "超长文本加速summary"
date: "2024-11-29 00:00:00"
updated: "2024-11-29 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/超长文本加速summary/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/8925826414"
---


### Inference：仅在推理测加速

### Sliding Window attention

在prefill阶段，Sliding Window attention 每个token会选和自己最邻近的W个tokens去做注意力计算，假设当前的token 位置是i，那么在最末层需要计算 [i−W,i]" role="presentation">[i−W,i][i-W,i] 之间的token注意力，因此再上一层需要计算 [i−2W,i]" role="presentation">[i−2W,i][i-2W,i] 内的tokens注意力，依此类推，则prefill的时间复杂度是 O(TW)" role="presentation">O(TW)O(TW) ,在KV cache占用方面，可以按照W的大小将长chunk切成对应窗口长度的小段，只存储对应长度的片段。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3ee3bb1b2bf3.jpg)

查找了Mistral-7B相关引用和被引用，mistral-7B-instruct-v0.1是sliding window attention，但是v0.2以上也是vanilla（dense）attention。

1.使用SWA在过长文本上ppl会过高，出现attention沉降现象。

2.pretrain-model为dense-attention，fine-tune时loss会不稳定

3.sliding的observation是基于dense的attention训练后，对attention做观察发现，直接fine-tune会打乱原始分布。

实验滑动窗口测速：微调后的qwen2.5-14B版本(A100-8卡-tp==8)

prefill(s)/
窗口长度(token)32K128K256K512K10240.9223.537.2414.3020480.9363.617.2714.6940960.9743.837.6215.49Dense1.238.6127.67OOM
### [StreamingLLM（sinks）](https://link.zhihu.com/?target=https%3A//openreview.net/pdf%3Fid%3DNG7sS51zVF)：

Window Attention（b）在 Llama2-13B 模型（the first book in PG-19 test ）的表现急剧下降，当注意力窗口脱离了初始化的token范围时。因此作者也提出了一种基于重计算的sliding-window(Re-computation)，即每个token的推理都要重新计算锯齿状的window内的注意力，因此首词推理的时间会更短，但是完整端到端输出时间会更长，相比之下：

Sliding window attentionMistralre-computationKV cacheLL首词推理时间（prefill）TLL^2PPL准确度51585.43end2end推理时间TLTL^2![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_23555c020b60.jpg)

仅限于推理时更改attention![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fcebb09d25c2.jpg)

*“为了理解窗口注意力的失败，我们发现了一个有趣的自回归 LLM 现象：大量的注意力分数被分配给初始标记，而不管它们与语言建模任务的相关性如何，如图 2 所示。我们将这些标记称为 “注意力接收器”。尽管它们缺乏语义意义，但它们收集了大量的注意力分数。我们将原因归因于 Softmax 操作，该操作要求所有上下文标记的注意力分数总和为 1。因此，即使当前查询在许多先前标记中没有强匹配，模型仍然需要将这些不需要的注意力值分配到某个地方，以便将其求和为 1。初始标记作为接收器标记背后的原因是直观的：由于自回归语言建模的性质，初始标记对几乎所有后续标记都是可见的，这使得它们更容易被训练为注意力接收器。”*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_464403b4628c.jpg)

对于初始标记在语言建模中的重要性，有两种可能的解释：

（1）它们的语义学至关重要

（2）模型学习了对它们绝对位置的偏差。

为了区分这些可能性，其中前四个标记被换行标记 “\n” 取代。观察表明，模型仍然显著强调这些初始换行标记。此外，重新引入它们可以将语言建模的困惑恢复到与原始初始标记相当的水平。这表明起始标记的绝对位置，而不是它们的语义值，具有更大的意义。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f011899804c6.jpg)

起始的token更多代表绝对位置的非语义信息经过实验，发现在保留起始的4个token作为沉降即可完全恢复PPL：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7253155a7a99.jpg)

为了进一步实验是pretrain阶段，由于softmax带来的归一化效应，将无法消化掉的注意力堆积到最初的几个token中，进一步做了三种实验：
1.Vanilla**:采用完全vanilla（dense）密集做pretrain

 $$href="[http://2.Zero](https://link.zhihu.com/?target=http%3A//2.Zero)">2.Zero Sink:采用特殊的softmax1做pretrain： SoftMax1(x_{i}) = \frac{e^{x_{i}}}{1+\sum_{j=1}^{N}{e^{x_{j}}}}  $$

3.<strong>Learnable Sink</strong>:加入所有位置可见的特殊的sink token做pretrain

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_418142475201.jpg)

作者建议可以加入多个sink token来作为特殊注意力沉降带入训练，并在使用了 Pythia-160M（Biderman et al.，2023）代码库并遵循其训练配方。我们使用消重 Pile（High et al.，2020）数据集在 8xA6000 NVIDIA GPU 服务器上训练模型。除了将训练批量大小减少到 256 个之外，保留了所有 Pythia 训练配置，包括学习率计划、模型初始化和数据集排列。这两个模型都经过了 143,000 步的训练。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d9d37e8b3eff.jpg)

evaluate the two models on seven diverse NLP bench-marks, including ARC-[Challenge, Easy] (Clark et al., 2018), HellaSwag (Zellers et al., 2019),LAMBADA (Paperno et al., 2016), OpenbookQA (Mihaylov et al., 2018), PIQA (Bisk et al., 2020),and Winogrande (Sakaguchi et al., 2019)conclusion：

使用streamingLLM可以在推理框架下同时保持无限长度的高效的推理和有限长度的KVcache缓存占用。

在速度方面，streamingLLM是流式框架，因此关注于逐token的输出速度：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f42ca5fa2a00.jpg)

StreamingLLM可否用于fine-tuning？

原文作者回答：

*“StreamingLLM is designed for deploying LLMs with infinite-length inputs without compromising efficiency or performance. It is not intended for training LLMs.”*

在正常的dense-attention fine-tune下会有自然的注意力沉降现象，因此只需要正常训练，在推理时采用streamingLLM即可。

### [MInference 1.0: Accelerating Pre-filling for Long-Context LLMs via Dynamic Sparse Attention](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2407.02490)

### observa

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cc3143a9e664.jpg)

tion：

attention的稀疏性是动态的，但是会集中于与预测的token最靠近的k个tokens：  

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7e75f605c2bf.jpg)

此外，实验观察到每个层级的对应的attention head对三种不同的sparse attention是不一样的，但是始终贯穿着不同层的相同头的位置，但是不同头的sparse attention是动态的：

1.A 形模式 <strong>这些类型的头像的注意力权重集中在初始标记和本地窗口 ，表现出相对较高的稳定性。</strong>

2.垂直斜杠 （VS） 模式<strong>注意力权重集中在特定标记（垂直线）和固定间隔的标记（斜杠线）上。此模式中垂直线和斜线的位置会随着上下文内容动态变化，并表现出一定的稀疏性，因此很难被局部窗口和 A 形模式所包含。</strong>

3.块稀疏模式 **这种稀疏模式是最动态的，表现出更分散的分布。尽管注意力权重具有动态性，但它保持了空间聚类的一些特征，我们将其确定为块稀疏模式。我们分析了 128k 提示内非零注意力权重与其前 k 个最近的非零邻居之间的距离，如图 3b 所示。结果表明，在图层和头部中，最近的非零值之间的距离通常集中在 5 附近，这表明注意力权重具有很强的空间聚类性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5222635b8d6b.jpg)

因此，每个attention head具有不同的sparse attention模式，基于上述观察分析， MInference 加速长上下文 LLM 的预填充阶段，包括三个步骤：

1） 每个头部的离线注意力模式识别;

2） 动态构建 sparse indices模式;

3） 使用优化的 GPU 内核进行稀疏注意力计算。

当用稀疏注意力计算加速长上下文 LLM 的预填充阶段时，注意力矩阵可以表述为:

$$A(M) = Softmax( \frac{1}{\sqrt{d}} QK^⊤ − c(1 − M)), $$

其中表示注意力矩阵第 j 项的动态稀疏掩码。这里，c 是一个大常数，例如 1e5，确保在 softmax 之后的值接近零.

动态稀疏注意力系统的目标是以最小的开销实现更高的加速，同时保留尽可能多的注意力权重。形式上可以表示为:

min |A(M) − A_{dense}|,\\ min t_{sparse}(M) + t_{overhead}(M),

因此文章提供了一种合适的方法去构建适合对应的时间t时间下的A-shape方法:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3341fbf15f91.jpg)

对于VS-shape和block-shape方法，仅在推理阶段采用动态的dynamic推理，通过建立稀疏索引的方式：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_117c31e02da7.jpg)

这三种不同的sparse attention仅仅用于推理，因此选择了LLAMA3-8B-262K，Yi-9B-200K,GLM-4-9B-1M作为三个基础模型，分别评测各个baseline的指标：在Infinitebench上表现如下：

纵向对比：**发现采用静态的VS和block sparse 效果欠佳，但是优于streamingLLM，多种sparse attention组合的效果最佳。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_27f8f717fbee.jpg)

<strong>横向对比：</strong>对比全三种的sparse attention应用，发现仅用block sparse是效果最差的，仅用VS的效果可以在infinite bench上有近似效果：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_26e50094c06c.jpg)

KV 缓存压缩方法集成:
<strong>将 MInference 与最先进的 KV 缓存压缩方法 SnapKV相结合，如表 5 所示。这证明了该方法与 KV 缓存压缩技术是兼容的。对于大多数任务，性能几乎没有变化，平均分数甚至略有提高：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_efbdcecefabd.jpg)

此外，在每一层的sparse attention在三种不同的稀疏注意力的分布情况如下，VS稀疏的注意力分布最多，按层序最优的稀疏注意力分配VS占比90%以上，也是为什么只用VS-only的效果最接近。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8e4d92bfdae9.jpg)

此外还有DUO-attention**，在llama2-7B上

100k的首字推理速度为19s，320k首字推理为156s

<strong>SEERattention</strong>在llama3.1-8B-instruct测试

在128k的首字推理速度为13.37s，Minference在128k为14.38s。

### [SageAttention2 Technical Report: Accurate 4 Bit Attention for Plug-and-play Inference Acceleration](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2411.10958)

####   1.1 SageAttention

四种kernel，分别对Q,K,P,V采用不同的量化方法：

Q,K 采用per-token，per-block的量化，精度最高，且smooth K精度更高：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ff6e6b0ee28.jpg)

P建议采用per-block的方式，V建议采用per-channel的计算方式（*方便反量化计算，non-matual计算效率低*）

因此四种不同的量化组合搭配有四种方法，INT8量化的计算速度是高于FP16的，

因此四种方法的速度排序为：
vB>vT>B>T

计算精度则恰好相反。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_07c36ebbbefc.jpg)

    量化计算过程：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_41b5d91f5b62.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_98c1ce009e55.jpg)

实验发现使用INT8量化Q,K矩阵效果最好INT8精度在某些层表现不佳，再多层累计计算后误差较大，因此对于P,V矩阵采用FP16的累计器：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f8eab09d3ad8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_59e699f71db8.jpg)

Speed（TOPS)：速度是flashAttn2的2倍

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_67abc3e0c4dd.jpg)

<strong>drawback of SageAttention1</strong>

    1.using the INT8 not considering the outlers in Q.

    2.only has a speedup effect on RTX4090 and RTX3090. FP16 Matmul with FP16 accumulators is only compatible with RTX4090 and RTX3090 GPUs. To leverage the faster INT4 tensor cores for $QK^T$ and using a method that can generally accelerate P V , we propose SageAttention2, which quantizes Q, K to INT4 and P, V to FP8.

    3.INT8 Matmul achieves only half the speed of INT4.

####   1.2 SageAttention2

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0e11bb6b50f9.jpg)

Observation:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b7b61ad7b134.jpg)

Q,K,V矩阵的值分布在channel维度上展现出高一致性，但是由于 S=QK^T 反量化的需要，必须按照token维度展开。

Quantization strategy：

<strong>for Q,K:</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a3262c63eb8d.jpg)

<strong>Per-warp quantization</strong>：每一个Q的block（按flashattention的切分）会在被分隔成多个不同的小段，每个小段由同一个SM流式处理器中的一个warp处理，紧接着每个warp会为每个小段进行Per-warp量化处理为INT4，并每个小段计算标记一个量化常数：**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a3051d371f04.jpg)

Smooth Q：

按之前的观察发现，尽管使用channel维度可以减轻离群值带来的误差，但是在反量化计算中，必须使用token维度进行，因此可以选择对Q,K矩阵在量化前进行归一化来减轻channel维度的误差。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f3646f34f694.jpg)

smooth Q,K后量化->INT4:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ced84f00a66b.jpg)

S矩阵的后续计算不会依赖于mean(K),因此再恢复实际的S矩阵时，只需要乘上mean(Q)的部分即可<strong>Smooth V：</strong>**Ada架构上的mma（f32f8f8f32)的累加器实际是FP22，且实际数据分布在0附近更密集，因此使用smooth后的V在FP8(E4M3)在不降低计算速度的情况下量化精度更高。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ddbe2dd5a907.jpg)

Experiment:

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_40dc7276237f.jpg)

然而实际在INT4-FP8的量化结合效果下速度大于INT8-FP8的组合方法，但是SageAttn2-4b精度在Layer和time step两个维度的随层序延长有较大误差，因此在实际的模型使用中会采用感知选取的方法，通过预计算，设定误差  CosSim ∗ (1 − L1)  的边界为 \xi ，大于此边界时，该layer采用INT8-FP8的量化SageAttn，小于此边界时采用INT4-FP8的量化SageAttn。

<strong>Result：</strong>

<strong>选用WikiText，LAMBADA,MMLU,LongBench数据集做速度和精度测试：</strong>

SageAttn-4b的在RTX4090速度的峰值为485TOPS，是FlashAttn2的3.1倍

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ba6048ee8ee.jpg)

在Attention计算完的output向量精度方面，SageAttn2-4B在CogvideoX上全面优于全FP16，HadmdAttn，SmoothAttn等Attention方法：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1d7c7a791cfb.jpg)

### 需要pretrain的架构：

### [infini-transformer](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2404.07143)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_db4880d430e1.jpg)

### [Long-Context Language Modeling with Parallel Context Encoding](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2402.16617)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b317daeb446c.jpg)