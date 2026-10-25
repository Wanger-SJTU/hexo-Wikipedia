---
title: "如何评价 Kimi 开源的稀疏注意力框架 MoBA？与DeepSeek的NSA相比，二者各有哪些亮点？"
date: 2025-02-20
tags: [知乎]
source: https://www.zhihu.com/question/12696635711/answer/105709816990

---

应章老师 [@ZHANG Mingxing](https://www.zhihu.com/people/e737640d16feabedfd7fd87e25f4326f)  邀请来答一下之前做MoBA起起伏伏的心路历程，我戏称为三入思过崖。  

**MoBA 的开始**

MoBA这个项目的开始的非常早，在23年5月底月之暗面刚建立不久的时候，入职报到当天就被 Tim [@周昕宇](https://www.zhihu.com/people/0224c265bcb1f3ce5e711352fa64d547) 拉到了小房间里，和裘老师 [@未明秋衣](https://www.zhihu.com/people/c7417dd5ea30f683e2aefac5d3cd7d52) （MoBA idea 的提出者）以及Dylan一起开始搞 Long Context Training。这里首先要感谢一下Tim的耐心和教导，对一个LLM新手给予厚望并乐意培养，研发各种上线模型和模型相关技术的诸位大佬里面，很多人和我一样基本是从零开始接触LLM并提供了大量的高效产出。

当时业界普遍水平也不是很高，大家都在4K pretrain，项目一开始叫 16K on 16B，意思是在16B上做16K 长度的pretrain即可，当然后来很快的这个需求在8月变成了需要支持128K下pretrain。这也是MoBA设计时的第一个要求，能From Scratch快速的训练出一个能支持128K长度下的模型，此时还不需要Continue Training。

这里也引申出一个有趣的问题，23年5/6月的时候，业界普遍认为训长得长，端到端训练长文本的效果好于训练一个较短的模型再想办法搞长它。这种认知到23年下半年 long Llama出现的时候才发生了转变。我们自己也进行了严格的验证，实际上短文本训练+长度激活具有更好的 token efficiency。自然MoBA设计中的第一个功能就成了时代的眼泪。

在这个时期，MoBA的结构设计也是更为“激进”的，相较于现在的“极简化”结果，初提出的MoBA是一个带cross attention的两层注意力机制串行方案，gate本身是一个无参的结构，但是为了更好的学习历史的token，我们在每个Transformer 层加了一个机器间的cross attention以及对应的参数。此时的MoBA设计 已经结合了后面为大家熟知的Context Parallel思想（完整的上下文序列被存放到不同节点上，在需要计算的时候才集中在一起），我们将整个上下文序列平铺在数据并行节点之间，将每个数据并行节点内的context看成是一个MoE中的expert，将需要attention 的token 发送到对应expert上进行cross attention 再把结果通信回来。我们将 fmoe （一种早期moe训练的框架）的工作整合进了Megatron-LM（来自Nvidia 的现在通用大模型训练框架）来支持expert间通讯能力。

这个思路我们称之为 MoBA v0.5。

随着时间推进到23年8月初，主模型pretrain已经训练了大量token，再来一次成本不低，显著改变了结构并增加了额外参数的MoBA至此，第一次进入思过崖。

![](https://picx.zhimg.com/v2-6b273618615a02c9d38fb5b937823a61_r.jpg?source=2c26e567)一个非常简单的MoBA v0.5 的示意图

**一入思过崖**
进入思过崖当然是一种戏称，是停下来寻找改进方案的时间，也是深入理解新结构的时间。第一次进思过崖悟道，进去的快，出来的也快。Tim 作为月之暗面点子王掏出了新的改进思路，将MoBA 从串行两层注意力方案改并行的单层注意力方案。MoBA不再增加额外的模型参数，而是利用现有注意力机制参数，同步学习一个序列里面的所有信息，这样就可以尽可能不变动当前结构进行Continue Training。

这个思路我们称之为 MoBA v1。

MoBA v1实际上是Sparse Attention + Context Parallel的产物，在当时Context Parallel并不是大行其道的时候，MoBA v1提现了极高的端到端加速能力。我们在3B，7B上都验证了它非常work之后，在更大模型scale水平上撞墙了，训练过程中出现了非常大的loss spike。我们初版合并block attention output 的方式过于粗浅，只是简单累加，导致完全无法和full attention 对分进行debug，没有ground truth的debug是极其困难的，我们用尽了各种当时的稳定性手段都不能解决。由于在较大的模型上训练出了问题，MoBA至此二入思过崖。

![](https://picx.zhimg.com/v2-225ab422cfcb373aafd439aacc5d97cb_r.jpg?source=2c26e567)一个非常简单的MoBA v1 的 示意图

**二入思过崖**
第二次留在思过崖时间比较长，从23年9月开始，至出思过崖的时候已经到了24年初。但是在思过崖里并不意味着被放弃了，我得以体会到在月之暗面工作的第二大特色，**饱和救援**。

除了一直就在强力输出的Tim和裘老师，苏神、远哥以及各路大佬都参与进行激烈的讨论，开始拆解并修正MoBA，首先被修正的就是那个简单的Weighted Sum叠加。我们这里尝试过各种和Gate Matrix 相乘相加的叠加搞法之后，Tim从故纸堆里掏出了 [Online Softmax](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1805.02867)，说这个应该能行。其中最大的一个好处是使用Online Softmax 之后我们可以通过将稀疏度降低至0（全选所有的分块），来和一个数学等价的Full Attention 进行严格对照debug，这解决了大部分实现中遇到的难题。但是上下文拆分在数据并行节点之间的这个设计依然会导致不均衡问题，一个数据sample在数据并行间平铺之后，第一个数据并行 rank上的头部几个 token 会被后续茫茫多的Q发送进行 attend，带来极差的平衡性，进而拖慢加速效率。这个现象也有一个更广为人知的名字 -- [Attention Sink](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2309.17453)。

此时章老师到访，听完我们的idea后提出了新的思路，将Context Parallel能力和MoBA 切分开。Context Parallel是Context Parallel，MoBA 是MoBA ，MoBA 回归一个Sparse Attention本身而不是分布式 Sparse Attention训练框架。只要显存放得下，完全可以在单机上处理全部上下文，用MoBA来进行计算加速，通过Context Parallel的方式来组织和传递机器间的上下文。  因此我们重新实现了MoBA v2，基本已经是也是当前大家见到的MoBA的样子。

![](https://picx.zhimg.com/v2-8d4672caefafe59b60318a38697a0de6_r.jpg?source=2c26e567)现在的MoBA 设计MoBA v2稳定可训，短文本和Full Attention 可以完全对齐，Scaling Law看起来非常可靠，而且比较丝滑的支持推广到线上模型上。我们因此involve了更多的资源进来，在经过了一系列的debug并消耗了n把infra组同学头发后，我们可以将经过MoBA 激活后的Pretrain模型做到捞针测试全绿，在这一步我们已经觉得非常不错了，开始进行上线。

但是最不意外的，只有意外。SFT阶段部分数据带着非常稀疏的loss mask（使得只有1%甚至更少的token 有训练用的梯度），这导致MoBA在大部分sft任务上表现良好，但是越是长文总结类型任务，loss mask 越是稀疏，反应在出来的学习效率越是低下。MoBA在准上线流程中被按下暂停键，第三次进入思过崖。

**三入思过崖**
第三次进入思过崖的时候其实最紧张，此时整个项目已经有了巨大的沉没成本，公司付出了大量的计算资源和人力资源，如果端到端最后长文应用场景出现问题，那么前期研究接近于打水漂。幸运的是，由于MoBA本身优秀的数学性质，在新一轮饱和救援的实验ablation中，我们发现去掉loss mask 表现就非常良好，带上loss mask 表现就不尽如人意，进而意识到是带有gradient 的token 在SFT阶段过于稀疏，从而带来的学习效率低下的问题，因此通过将最后几层修改为 full attention 来提高反向传播时带gradient token的密度，改善特定任务的学习效率。后续其它实验证明这种切换并不会显著影响切换回来的Sparse Attention 效果，在1M 长度上和同结构 Full attention 各项指标持平。MoBA再次从思过崖回归，并成功上线服务用户。

最后的最后，感谢各路大神的拔刀相助，感谢公司的大力支持以及巨量显卡。现在我们开放的出来的就是我们在线上用的代码，是一个已经经过了长期验证，因为实际需求砍掉了各种额外设计，保持极简结构但同时具备足够效果的Sparse Attention结构。希望MoBA以及它诞生的CoT能给大家带来一些帮助和价值。

**Report**：[MoBA: Mixture of Block Attention for Long-Context LLMs](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/2502.13189)

**Code**：[https://github.com/MoonshotAI/MoBA](https://link.zhihu.com/?target=https%3A//github.com/MoonshotAI/MoBA) 

FAQ
顺带借地方回答一些这两天频繁被人问到的问题，这两天基本麻烦章老师和苏神当客服回答问题了，实在过意不去，这里提取了几个常见问题一并回答一下。

- MoBA对decoding无效吗？

- MoBA对Decoding是有效的，对MHA很有效，对GQA效果降低，对MQA效果最差。原理其实很简单，MHA的情况下，每个Q有一个自己对应的KV cache，那么MoBA的gate在理想情况下是可以通过摊余计算在prefill算好并存储每个block的代表token，这个token在后续都不会变动，因此所有的IO基本可以做到只来自index select之后的KV cache，这种情况下MoBA的稀疏程度就决定了IO减少的程度。
- 但是对于GQA和MQA，由于一组Q Head实际上在共享同样的 一份 KV cache，那么在每个Q head 能自由选择感兴趣 block 的情况下，很有可能填满了由稀疏性带来的IO优化。比如我们思考这么一个场景：16个 Q Head 的MQA，MoBA 刚好切分整个序列到 16份，这意味着当最坏情况每个 Q head 感兴趣的分别是 序号从 1 到 16 的每个上下文块，节省IO的优势就会被磨平。能自由选择KV Block的Q Head越多，效果越差。
- 由于“自由选择KV Block的Q Head”这么个现象存在，天然的改进想法就是合并，假设大家都选一样的block，那不就净赚IO优化了么。对，但是在我们实际测试下，尤其是对于已经支付了大量成本的预训练模型，每个 Q head都有自己独特的“品味”，强行合并不如从头重新训练。

- MoBA默认是必选self attention，那么self的邻居会必选吗？

- 不会必选，这个是已知会产生些许疑惑的地方，我们最后选择相信SGD。现在的MoBA gate实现非常直接，有感兴趣的同学可以简单改造gate使其必选上一个chunk，但我们自己测试这个改动带来的收益比较margin。

- MoBA有Triton 实现么？

- 我们实现过一个版本，端到端性能提升10%+，但是Triton的实现想要持续维护跟上主线的成本比较高昂，我们因此多次迭代后暂缓进一步优化它。
- MoBA没有参数是不是拿来就可以在现有模型上用？  
- MoBA 不是一个免训练 sparse attention，虽然是无额外参数的，但是依然需要对现有模型进行Continue Training。训练中关注Trailing token loss下降情况，或者直接关注 longctx 相关 bmk 涨点情况即可。