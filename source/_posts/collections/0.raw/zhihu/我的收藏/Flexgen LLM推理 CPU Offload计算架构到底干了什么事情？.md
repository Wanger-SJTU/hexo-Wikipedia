---
title: Flexgen LLM推理 CPU Offload计算架构到底干了什么事情？
date: "2023-03-22 00:00:00"
updated: "2023-03-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Flexgen-LLM推理-CPU-Offload计算架构到底干了什么事情/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/615021309
---


注：偏综述型分析，读起来需要一些耐心，不适合跳读，不适合期望速成的读者。

解读文献： [High-throughput Generative Inference of Large Language Models with a Single GPU](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2303.06865)，github地址： [https://github.com/FMInference/FlexGen](https://link.zhihu.com/?target=https%3A//github.com/FMInference/FlexGen) 

解读文献研LLaMA整理出来的文章，[Meta 发布大语言模型 LLaMA，它的来源和能力与 GPT 对比有什么特点？](https://www.zhihu.com/question/586328451/answer/2915652458)，提到了Flexgen文章，本篇重点对该文章进行技术分析，希望将***LLM的推理计算关键技术原理、利用大规模并行计算设计解决LLM的并行计算思考方法、Flexgen的关键insight、Flexgen里technical的计算优化技术等进行客观解读和辩证分析***，强迫自己写出来既是让自己加深理解，梳理相关研究体系，同时在论文爆炸的时代，也可以帮助大家减少一些文献整理的时间，也是传播一些知识。 下面除了客观解读外，评论中带有很多个人观点，请注意甄别，仅代表个人观点，跟任何组织无关。

文章目标读者是对***LLM推理计算或者训练计算原理、或者大规模并行计算系统设计、或者xxGPT话题下的AI工程感兴趣、或者计算机系统结构基础理论应用实践***感兴趣的同学，需要具有一定的***LLM深度学习算法以及计算机系统结构理论基础***，Flexgen是不错的计算机系统结构应用案例，但是***对于解决LLM的问题来说，个人并不认为Flexgen是很好的解决了LLM推理的关键问题，但是是一个不错的技术方法的研究案例***。当你觉得AI推理计算可能没有新的创新优化Idea的时候，可以揣摩一下作者们是怎么去思考这些问题的，这种思考方法对解决其他并行计算机系统设计具有通用的启发意义，比如***作者核心是认为可以把推理计算服务的latency（延迟）几乎完全牺牲掉去极端化设计一个仅仅注重throughout（吞吐）的LLM计算系统，当仅仅强化throughout的时候，LLM计算系统每个环节都可以重新思考，包括耗费内存的大存储管理、跨域memory hierarchy的memory访存的latency隐藏设计、并行化策略（对于pipeline、tensor、data并行策略，比如作者在有些环节认为pipeline并行相对data并行具有系统性能优势，这是反常识的，仔细看论文的计算场景又是非常合理的），***充分体现了没有完美的计算机系统，只有你的系统更需要满足什么条件的***权衡之术***，并用这种权衡之术去解决LLM问题，***老术新用***。

Flexgen（[https://github.com/FMInference/FlexGen](https://link.zhihu.com/?target=https%3A//github.com/FMInference/FlexGen)）文章刚出来几天热度是非常高的，5天增长到5000stars，受到OpenAI chatGPT以及Meta LLaMA新闻热度的影响，Flexgen以单GPU跑出100倍以上的LLM大模型推理计算性能（[跑ChatGPT体量模型，从此只需一块GPU：加速百倍的方法来了](https://link.zhihu.com/?target=https%3A//www.163.com/dy/article/HU6LRQL40511AQHO.html)），传播速度之快已经非常令人惊叹了。

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_03b5491317e7.jpg)

知乎上也有一些大佬发表了相关评论文章，认为它也是一个突破，但是似乎没有深入解读分析的。我也比较感兴趣，在新技术面前总得保持谦虚，所以非常认真研读了几遍，并做了一些笔记，整理出来。

读了几遍后，个人觉得，Flexgen系统传播效果好主要是取了一个新颖的视角，**还是单/多GPU跑LLM模型**，放大了throughout需求，提出一个极端的CPU offload系统，实验中提到，With a higher latency of 12000 s(***3.3个小时***）,batchsize 256,, 69×higherthroughputthanDeepSpeed Zero-Inference（b=1），推理延迟已经拉长到3.3个小时了（这也限制它的使用场景，仅适合离线批量计算场景），从并行设计上没有什么特别突出地方，***但是敢想（延迟压到3.3个小时）、敢换角度思考（利用高throughout、高延迟特性挖掘跨样本的并行）***以及对细节的持续思考（比如进一步量化压缩改进CPU-GPU访存带宽、设计自动方法寻找最优的优化参数）来改进系统***。***

***发现不足地方***： 

1） 有一些遗憾的是， 文章也有一些公式错误，一个公式里gd应该是wd。

2） 还有其实没有给出实验能有效佐证GPU-CPU之间带宽瓶颈情况怎么样（***作者一直强调是瓶颈***），在解决带宽更多的是给出了端到端的吞吐数据，后面的一些量化分析感觉有点偏理论，关于估算理论耗时的线性优化偏理论化。

3） 量化和稀疏化的优化，实验没有系统性能提升结论，而且稀疏化理论上在cpu offload系统的IO瓶颈场景下，也会有不足，稀疏理论收益不太支持。论文也没有给相关数据，只是说精度不损失。论文多少有点仓促圈地，赶LLM新闻潮，基本实验不充分哈。

***优势地方：***

量化分析做的很不错，少见的LLM推理计算有比较详细的量化分析， [王燕飞：Flexgen LLM推理计算环节的量化分析](https://zhuanlan.zhihu.com/p/615327112)单独总结了一下。

瑕不掩瑜，重点看它的思考方法。

### 主要并行策略 - Offloading Strategy 

#### 形式化定义（文中的形式化介绍）

作者基于一些假设前提，设定了一个形式话抽象，简单的说**，就是作者基于zig-zag的并行策略，该策略高优先通过流水等延迟隐藏方法不断向GPU输送batch样本，且GPU端仅仅进行一个Transformer layer的计算，一旦计算完成就对KVcache、激活、weight权重参数进行checkpoint，也是流水化overlapping的将数据转移到CPU DRAM和磁盘；当batch纬度并行达到一定的阶段后，再进入下一个layer的计算，且也是高优先batch纬度并行，同样利用overlapping技术隐藏CPU Dram和磁盘的访存延迟；依次进入下一个layer；直到所有layer完成。到这里肯可能prompt计算完了，然后Generating的token同样按照这样的并行技巧，优先batch并行，然后进行layer并行。*（****有点绕口，记住核心是用batch纬度并行打破同batch内seq token的generating过程中时序依赖导致的并发度不足，这个insight最重要，是定性的性能思路****）***。具体可以参看伪代码：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_55bc339c70f3.jpg)

简化后的并行框架伪代码，代码背后是完美的overlapping工程实现的假设***感觉论文不足地方： ***作者论文中没有直接说prompt怎么并行的，示意图是token的generating过程的zig-zag并行。无伤大雅，假定它跟generating过程类似，也是不影响系统分析的。

#### *Cost model*

基于上面的并行思路，假定我们实现了一个“磁盘-CPU-GPU”的pipeline流水并行系统，来overlapping整个链路中的***“计算、数据读、数据写”***的延迟，这个完美的系统，但是，多少数据放到磁盘上，多少数据放到cpu端，多少数据放到GPU端，都会影响整体pipeline的效率，故作者给出了一个计算disk磁盘到cpu端拖取数据的耗时的量化结论： 

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_5f1ef1dd60c5.png)

dtoc(g), 即GPU在计算generating 下一个token的时候，需要pipeline给GPU输送数据时，disk到磁盘这个环节需要耗费的延迟***简单解释一下这个量化公式***（***上面图里的公式gd应该写错了，应该是wd，:-)***）： 

dtoc(g)进行generating token的时候，需要下一层的activation、KV cache、parameter，这些参数有一部分可能存放在disk，那么存放在disk上搬移到CPU端，

[https://zhuanlan.zhihu.com/p/615327112](https://zhuanlan.zhihu.com/p/615327112) LLM推理计算量化分析，建议没有LLM量化背景的先揣摩下，基本上量化细节弄清楚了，后文的思路理解起来比较简单直接了

4h1^2是attention的参数大小，2h1*h2是2个h1*h2 FFN矩阵参数大小，分别乘以2字节（fp16）；activation对一个tokens只有一个hidden大小，就是2*bls*h1（***所以从这里可以看出其实没有估算prompt这块的计算，可能耗时占比不大所以忽略吧***）；KV cache主要2个字节、KV共2个缓存项、seq平均长度、隐藏大小、批大小。加起来就是下面的公式：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_7234b1429cd1.png)

dtoc(g)进行generating token的时候，数据搬移时间的量化结果***pipeline每个环节都用类似的评估方法形式化除量化公式，然后基于这个量化公式，进行线性规划的优化，寻找一些性能更佳的参数。做理论研究，***似乎还可以基于实际情况（不用上面的理论建模），用类似***强化学习方法***，探索更优的系统参数。因为上面形式化方法偏理想，因为对于一个pipeline，当某一个计算单元需要相关参数的时候，参数在磁盘、cpu和dram上实际占比是不确定的，尤其再考虑不用简化的并行模型（比如，batch数据并行和layer并行是混合的场景，系统模型更加复杂，无法构建这样的形式化模型，也较难收集稳定的性能数据）。

后面线性规划的优化算法，就不重点分析了，有兴趣读原文。

#### 疑问澄清

文中，***默认了几个超参设计，文章中没有细讲，基于个人理解澄清一下***：

-   ***每层layers只有一个kV cache（就是前面量化分析章节描述的KV cache，其实KV本质也是激活），激活输出就是每层layer的最终输出***，例如attention layer内部的计算就不用保存激活。但是，从更加回归第一原始思考，理论上还可以将Transformer layers拆解的更细粒度。比如，对于input特别大的情况，有些高resolution的图像输入如果进行这种单GPU系统设计，可能input就将单GPU内存撑爆了（参看[Spatial partition：Train ML models on large images and 3D volumes with spatial partitioning on Cloud TPUs && Spatial partition：High Resolution Medical Image Analysis with Spatial Partitioning](https://link.zhihu.com/?target=https%3A//cloud.google.com/blog/products/ai-machine-learning/train-ml-models-on-large-images-and-3d-volumes-with-spatial-partitioning-on-cloud-tpus)这种输入图形比较大而且还不容易直接tensor sharding的计算场景），本文所有的设计都要重新review。所以这里LLM模型特点比较单一，单layer能放下一个GPU，对计算假设简化了一些。

-   ***GPU上放置多少个Transformer Layers***。 默认都是一层一层的计算，GPU上默认只有一层Layer。因为不在乎推理latency的设计假设允许通过大batch来提高GPU计算密度，所以不存在Layers数这个超参。如果，系统要适当限制latency，可能被允许的大batch大小会受到限制，GPU计算密度可能会受到挑战了。另外， GPU上放置多少个Layers的设计也影响需要存储到需要offload的激活和KV cache容量，但是对于网络Layers远大于GPU数量的情况，可能才会考虑，否则KV cache容量远远比GPU内存大，GPU上放置不了多少Layers。所以，放置一个layers也相对合理。GPU数量特别多，多到可以将所有参数、cache、激活保存下来的话，flexgen系统本身假设前提就不太成立了（***可以细思***）。

- ***GPU上同时“几个batch以及几个Layers”混跑***。GPU上默认先尽最大可能进行batch内/间的数据并行，文章说为了***简化工程实现***（论文附录分析了还有更优的设计，分析思路有兴趣读者可以继续深入），直到batch计算产生的激活和KVcache把下游memory hierarchy存储空间，比如DRAM，打满（批注： 理论上也可以不用极端的打满，到一个上界应该就不影响系统最终吞吐就可以了，这个上界跟batch size、DRAM访存带宽、GPU计算密度、GPU存储空间有一定的关系，对于特定的GPU和服务器架构，理论上可以实验获取这个超参）

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_f570214c0cf2.jpg)

基础系统设计： Zig-zag以及伪代码所以，基于上面的假设简化，flexgen的并行重点参照ZiG-zag设计，用通俗话说，极端的用batch填满GPU计算密度，达到一定阶段（就是前面讲的***阈值***，文章里讲更极端，*就是****等DRAM或者CPU这些内存被填满***）后，再进行下一个layer的计算调度（因为可以不考虑latency，所以这种极端设计也是合理的），参看右侧的伪代码，工程上上面一些步骤要异步实现，将***weight、activate、KV cache的存储和更新隐藏（overlapping）到GPU的计算***里去（原文： the weight load of the next layer, cache/activation load of the next batch, cache/activation store of the previous batch and the computation of the current batch. 仔细理解过前面量化分析章节后，有一定经验的并行计算工程师，这段非常容易理解，不赘述）。

#### 多GPU支持

不是全文的重点，适当支持到小几个GPU，GPU之间通过pipeline进行并行，因为实际系统瓶颈还是I/O，所以多GPU pipeline并行可以做到提高GPU计算占比，减少了IO瓶颈对整体系统影响的比例，所以系统呈现超线性加速比。

另外， 如果GPU达到几十上百，个人觉得，这种多GPU pipeline并行要重新审视了，跟flexgen的offload高吞吐系统设计要求不符了，可能有更好的并行方法，既能兼顾延迟性能，也能兼顾throughout性能。

#### 缓存设计

文章没有专门的章节讲缓存设计，此处分享下个人观点。因为flexgen针对是LLM模型，本质上***它没有所谓的时空局部性***，仅仅是一个稳定访存特性的计算系统，比如计算每个layer的时候，都需要该layer全量的KV cache、激活、参数，故不存在在cache替换策略上的优化技巧，可以设计出一个确定性的“磁盘-CPU-GPU”之间的换入换成的pipeline流水并行计算系统。

### Approximate Methods 近似方法

#### 压缩   Group-wise Quantization ** 

本文重点研讨系统结构方面的计算并行设计，flexgen的近似方法，采用压缩量化、稀疏化的方法， 属于跟系统设计正交的优化方法，本文不重点分享。

因为当前这种流水并行系统即便采用batch流水并行、缩小GPU内layer数量进一步扩大batch数据纬度的并行占比从而降低token时序依赖带来的局限性，跨越memory hierarchy的并行仍然是系统关键瓶颈，所以通过量化来降低IO带宽消耗是系统。

作者为了用4bit位的量化压缩（*实验发现3bit精度损失无法保证了）***，采用fine grain的压缩：

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_01b0a9951505.png)

压缩考虑作者仍然采用fp16进行GPU上的运算，这个可能时cpu offload系统特点，***因为offload系统瓶颈都在IO端，是IO带宽瓶颈，***GPU上的算力和存储相对充分，所以还原fp16可以最大程度的保持算法精度。

#### 稀疏化   Sparse Attention** 
 

此处就是稀疏的attention计算，下面的计算中QK计算结构进行TopK筛选，然后结合TopK结果去load稀疏V值，进行稀疏计算：
 

![](/images/collections/0.raw/zhihu/%25E6%2588%2591%25E7%259A%2584%25E6%2594%25B6%25E8%2597%258F/asset/img_40fa625fe8b4.png)

文章描述到： ”After computing the attention matrices, for each query, we calculate the indices of its Top-K tokens from the K cache. We then simply drop other tokens and only load a subset of the V cache according to the indices.“， 个人觉得这种优化策略未必有用，因为在确定了稀疏的QK之后再load稀疏V计算，可能导致多级memory hierarchy cache miss，而且也断pipeline流水了，所以这种稀疏化为了在offload系统中瓶颈在于IO测的时候，未必能奏效。

*遗憾的是，文章实验部分，仅仅给出了这些优化的精度指标，对量化和稀疏化的系统加速性能为进行描述。这点着实不应该，感觉LLM时代，大家都着急圈地、赶新闻，没有认真写论文哈***。

### 实验结果

实验结果比较容易懂，建议看原文，有空再补充一些实验讨论。有兴趣可以算一下TCO，其实Flexgen工作因为瓶颈在IO，所以GPU一般很难打满，那么总的来说单纯算GPU算力的TCO，可能并不能打赢其他多GPU方案，它的优势小易用性和推理的门槛，在极少量GPU下完成了LLM系统设计。

### 结束语

Flexgen核心出发点期望降低LLM模型的推理门槛和经济性，从牺牲LLM推理latency获取极限throughout的insight驱动下思考LLM并行计算系统的设计，该系统重点通过batch流水并行获取GPU计算并行度（尽量减少GPU上的layer数量，从而间接提高batch粒度的并行），实现跨sample的generating token的并行，并最终在pipeline细节上进行量化分析，设计优化的pipeline流水系统，并加持压缩量化技巧进一步优化disk-cpu-gpu的IO瓶颈，在实验上获取了吞吐值throughout领先、CPU offload的LLM并行计算系统。

文章从LLM侧重throughout这个视角，寻找LLM推理计算系统创新设计的思路，有一定的参考意义，可能启发其他系统的设计。

### 应用讨论

#### 推荐搜索稀疏计算on GPU

比如，对于推荐搜索场景，基于GPU设计TB级稀疏embedding***（Flexgen TB级的KV cache也可以类比稀疏embedding的计算表，相比前者，后者还有稀疏更新的特点，而且TB级稀疏embedding也有data样本级的并行特点）***的离线计算系统，是否也借鉴flexgen超级大batch的系统思路，提高dense部分计算密度来隐藏稀疏embedding层offload到cpu端的访存延迟压力，达到极高吞吐的TB稀疏embedding计算系统呢，另外也借鉴flexgen pipeline并行设计获取超线性的多gpu并行压力呢，再结合sgd优化器设计、低比特压缩优化收敛效率，这样是否可以设计一个单机单卡或者多卡可以跑出高吞吐、高延迟、高TCO的GPU计算系统，比如[AIBox: CTR Prediction Model Training on a Single Node](https://link.zhihu.com/?target=http%3A//research.baidu.com/Public/uploads/5e18a1017a7a0.pdf)性价比更高的系统？ GPU上稀疏大模型的论文：[AIBox: CTR Prediction Model Training on a Single Node](https://link.zhihu.com/?target=http%3A//research.baidu.com/Public/uploads/5e18a1017a7a0.pdf)、[DISTRIBUTED HIERARCHICAL GPU PARAMETER SERVER FOR MASSIVE SCALE DEEP LEARNING ADS SYSTEMS](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/2003.05622.pdf) 两篇文章都没有在minibatches方面的ablation study，没有探索这个极限。

但是可能存在的难点，

1）低比特压缩计算。 对于flexgen来说，因为是推理计算，所以低比特的压缩计算相对更加合理，但是训练计算一般对低比特计算略微收敛性敏感，所以可能存在问题。

2）pipeline流水并行在embedding计算场景的难点。因为flexgen应用到LLM模型的推理，LLM模型是全dense模型，所以pipeline的多GPU组织方式可以不仅可以提高多GPU并行度，更重要的是提高了GPU计算占CPU offload计算的计算占比，从而pipeline并行对LLM可以获取超线性的加速比（间接减低了CPU offload这里瓶颈计算的计算占比），但是推荐模型dense部分一般纬度较低，计算代价相对较小，dense可以并行的计算代价本来就小，可能是dense部分pipeline并行方式获取GPU并行性能的提升空间有限（但是，对于dense部分计算密度可观的情况下，可能也是一个探索方向），可能也存在类似flexgen一样的超参，需要去tuning获取超参配置以获取更优的pipeline计算并行+CPU offload的embedding计算之间的权衡。

3）训练计算对于不同的mini-batch之间存在时间上的依赖，因为每轮mini-batch迭代具依赖特点，但是这个可以试图理解为LLM推理计算token level的时序依赖，去应对这种时序依赖的优化方法可能具有类似性，比如就是增超级大batch训练。

4）IO带宽问题。Flexgen系统设计核心之一仍然是提高IO有效数据带宽，比如压缩、比如量化分析搜索数据分布，推荐模型on GPU也是IO瓶颈，torchrec用fusion等技术提高IO带宽有效利用率，flexgen几乎没有设计提高IO效率的优化设计，但是对推荐中大embedding存储IO效率是研究重点。

另外，对Flexgen 引用文献做了总结，分享了一些自己想法，比如怎么去找一些优化点 [王燕飞：Flexgen LLM推理相关工作 - 怎么思考寻找优化方法](https://zhuanlan.zhihu.com/p/615328081)。

发现明显文字错误或者模糊不清的，可以留言。