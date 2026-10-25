---
title: 缓存与效果的极限拉扯：从MHA、MQA、GQA到MLA - 科学空间|Scientific Spaces
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-14/缓存与效果的极限拉扯-从MHA、MQA、GQA到MLA-科学空间-Scientific-Spaces/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 952a5671-4744-42ce-b2ff-e22d2ba62ec2
---

# 缓存与效果的极限拉扯：从MHA、MQA、GQA到MLA - 科学空间|Scientific Spaces
#Omnivore

[Read on Omnivore](https://omnivore.app/me/mha-mqa-gqa-mla-scientific-spaces-18f74bd0d6e)
[Read Original](https://kexue.fm/archives/10091)



前几天，幻方发布的[DeepSeek-V2](https://papers.cool/arxiv/2405.04434)引起了大家的热烈讨论。首先，最让人哗然的是1块钱100万token的价格，普遍比现有的各种竞品API便宜了两个数量级，以至于有人调侃“这个价格哪怕它输出乱码，我也会认为这个乱码是一种艺术”；其次，从模型的技术报告看，如此便宜的价格背后的关键技术之一是它新提出的MLA（<strong>M</strong>ulti-head <strong>L</strong>atent <strong>A</strong>ttention），这是对GQA的改进，据说能比GQA更省更好，也引起了读者的广泛关注。

接下来，本文将跟大家一起梳理一下从MHA、MQA、GQA到MLA的演变历程，并着重介绍一下MLA的设计思路。

## MHA[ #](#MHA)

MHA（<strong>M</strong>ulti-<strong>H</strong>ead <strong>A</strong>ttention），也就是多头注意力，是开山之作[《Attention is all you need》](https://kexue.fm/archives/4765)所提出的一种Attention形式，可以说它是当前主流LLM的基础工作。在数学上，多头注意力MHA等价于多个独立的单头注意力的拼接，假设输入的（行）向量序列为x1,x2,⋯,xl，其中xi∈Rd，那么MHA可以形式地记为  

(1)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=xiWq(s)∈Rdk,Wq(s)∈Rd×dkki(s)\=xiWk(s)∈Rdk,Wk(s)∈Rd×dkvi(s)\=xiWv(s)∈Rdv,Wv(s)∈Rd×dv

简单起见，这里省略了Attention矩阵的缩放因子。实践上，常见的设置是dk\=dv\=d/h，对于LLAMA2-7b有d\=4096,h\=32,dk\=dv\=128，LLAMA2-70b则是d\=8192,h\=64,dk\=dv\=128

由于这里只考虑了主流的自回归LLM所用的Causal Attention，因此在token by token递归生成时，新预测出来的第t+1个token，并不会影响到已经算好的k≤t(s),v≤t(s)，因此这部分结果我们可以缓存下来供后续生成调用，避免不必要的重复计算，这就是所谓的KV Cache。

而后面的MQA、GQA、MLA，都是围绕“如何减少KV Cache同时尽可能地保证效果”这个主题发展而来的产物。

## 瓶颈[ #](#瓶颈)

一个自然的问题是：为什么降低KV Cache的大小如此重要？

众所周知，一般情况下LLM的推理都是在GPU上进行，单张GPU的显存是有限的，一部分我们要用来存放模型的参数和前向计算的激活值，这部分依赖于模型的体量，选定模型后它就是个常数；另外一部分我们要用来存放模型的KV Cache，这部分不仅依赖于模型的体量，还依赖于模型的输入长度，也就是在推理过程中是动态增长的，当Context长度足够长时，它的大小就会占主导地位，可能超出一张卡甚至一台机（8张卡）的总显存量。

在GPU上部署模型的原则是：能一张卡部署的，就不要跨多张卡；能一台机部署的，就不要跨多台机。这是因为“卡内通信带宽 > 卡间通信带宽 > 机间通信带宽”，由于“木桶效应”，模型部署时跨的设备越多，受设备间通信带宽的的“拖累”就越大，事实上即便是单卡H100内SRAM与HBM的带宽已经达到了3TB/s，但对于Short Context来说这个速度依然还是推理的瓶颈，更不用说更慢的卡间、机间通信了。

所以，减少KV Cache的目的就是要实现在更少的设备上推理更长的Context，或者在相同的Context长度下让推理的batch size更大，从而实现更快的推理速度或者更大的吞吐总量。当然，最终目的都是为了实现更低的推理成本。

要想更详细地了解这个问题，读者可以进一步阅读[《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》](https://papers.cool/arxiv/2205.14135)、[《A guide to LLM inference and performance》](https://www.baseten.co/blog/llm-transformer-inference-guide/)、[《LLM inference speed of light》](https://zeux.io/2024/03/15/llm-inference-sol/)等文章，这里就不继续展开了（主要是笔者水平也有限，唯恐说多错多）。

## MQA[ #](#MQA)

MQA，即“<strong>M</strong>ulti-<strong>Q</strong>uery <strong>A</strong>ttention”，是减少KV Cache的一次非常朴素的尝试，首次提出自[《Fast Transformer Decoding: One Write-Head is All You Need》](https://papers.cool/arxiv/1911.02150)，这已经是2019年的论文了，这也意味着早在LLM火热之前，减少KV Cache就已经是研究人员非常关注的一个课题了。

MQA的思路很简单，直接让所有Attention Head共享同一个K、V，用公式来说，就是取消MHA所有的k,v的上标(s)：  

(2)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=xiWq(s)∈Rdk,Wq(s)∈Rd×dkki(s)\=xiWk(s)∈Rdk,Wk(s)∈Rd×dkvi(s)\=xiWv(s)∈Rdv,Wv(s)∈Rd×dv

使用MQA的模型包括[PaLM](https://arxiv.org/pdf/2204.02311)、[StarCoder](https://papers.cool/arxiv/2305.06161)、[Gemini](https://papers.cool/arxiv/2312.11805)等。很明显，MQA直接将KV Cache减少到了原来的1/h，这是非常可观的，单从节省显存角度看已经是天花板了。

效果方面，目前看来大部分任务的损失都比较有限，且MQA的支持者相信这部分损失可以通过进一步训练来弥补回。此外，注意到MQA由于共享了K、V，将会导致Attention的参数量减少了将近一半，而为了模型总参数量的不变，通常会相应地增大FFN/GLU的规模，这也能弥补一部分效果损失。

## GQA[ #](#GQA)

然而，也有人担心MQA对KV Cache的压缩太严重，以至于会影响模型的学习效率以及最终效果。为此，一个MHA与MQA之间的过渡版本GQA（<strong>G</strong>rouped-<strong>Q</strong>uery <strong>A</strong>ttention）应运而生，出自论文[《GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints》](https://papers.cool/arxiv/2305.13245)，是去年的工作。

事后看来，GQA的思想也很朴素，它就是将所有Head分为g个组（g可以整除h），每组共享同一对K、V，用数学公式表示为  

(3)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(⌈sg/h⌉),v≤t(⌈sg/h⌉))≜∑i≤texp⁡(qt(s)ki(⌈sg/h⌉)⊤)vi(⌈sg/h⌉)∑i≤texp⁡(qt(s)ki(⌈sg/h⌉)⊤)qi(s)\=xiWq(s)∈Rdk,Wq(s)∈Rd×dkki(⌈sg/h⌉)\=xiWk(⌈sg/h⌉)∈Rdk,Wk(⌈sg/h⌉)∈Rd×dkvi(⌈sg/h⌉)\=xiWv(⌈sg/h⌉)∈Rdv,Wv(⌈sg/h⌉)∈Rd×dv

这里的⌈⋅⌉是上取整符号。GQA提供了MHA到MQA的自然过渡，当g\=h时就是MHA，g\=1时就是MQA，当1<g<h时，它只将KV Cache压缩到g/h，压缩率不如MQA，但同时也提供了更大的自由度，效果上更有保证。GQA最知名的使用者，大概是Meta开源的[LLAMA2-70B](https://llama.meta.com/llama2/)，以及[LLAMA3](https://llama.meta.com/llama3/)全系列，此外使用GQA的模型还有[TigerBot](https://papers.cool/arxiv/2312.08688)、[DeepSeek-V1](https://papers.cool/arxiv/2401.02954)、[StarCoder2](https://papers.cool/arxiv/2402.19173)、[Yi](https://papers.cool/arxiv/2403.04652)、[ChatGLM2](https://github.com/THUDM/ChatGLM2-6B)、[ChatGLM3](https://github.com/THUDM/ChatGLM3)等，相比使用MQA的模型更多（ChatGLM虽然在它的介绍中说自己是MQA，但实际是g\=2的GQA）。

在llama2/3-70B中，GQA的g\=8，其他用了GQA的同体量模型基本上也保持了这个设置，这并非偶然，而是同样出于推理效率的考虑。我们知道，70B这个体量的模型，如果不进行极端的量化，那么不可能部署到单卡（A100/H100 80G）上。单卡不行，那么就能单机了，一般情况下一台机可以装8张卡，刚才我们说了，Attention的每个Head实际上是独立运算然后拼接起来的，当g\=8时，正好可以每张卡负责计算一组K、V对应的Attention Head，这样可以在尽可能保证K、V多样性的同时最大程度上减少卡间通信。

## MLA[ #](#MLA)

有了MHA、MQA、GQA的铺垫，我们理解MLA（<strong>M</strong>ulti-head <strong>L</strong>atent <strong>A</strong>ttention）就相对容易一些了。DeepSeek-V2的技术报告里是从低秩投影的角度引入MLA的，以至于有部分读者提出“为什么LoRA提出这么久了，直到MLA才提出对KV Cache低秩分解的做法”之类的疑问。

然而，笔者认为低秩投影这个角度并不贴近本质，因为要说低秩投影的话，事实上只要我们将GQA的所有K、V叠在一起，就会发现GQA也相当于在做低秩投影：  

(4)\[ki(1),⋯,ki(g),vi(1),⋯,vi(g)\]⏟ci∈Rg(dk+dv)\=xi\[Wk(1),⋯,Wk(g),Wv(1),⋯,Wv(g)\]⏟Wc∈Rd×g(dk+dv)

这里我们将所有ki(s),vi(s)拼在一起记为ci，相应的投影矩阵也拼在一起记为Wc，注意到一般都有dc\=g(dk+dv)<d，所以xi到ci的变换就是一个低秩投影。所以，MLA的本质改进不是低秩投影，而是低秩投影之后的工作。

### Part 1[ #](#Part 1)

GQA在投影之后做了什么呢？首先它将向量对半分为两份分别作为K、V，然后每一份又均分为g份，每一份复制h/g次，以此来“凑”够h个Attention Head所需要的K、V。我们知道分割、复制都是简单的线性变换，所以MLA的第一个想法是将这些简单的线性变换换成一般的线性变换，以增强模型的能力：  

(5)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=xiWq(s)∈Rdk,Wq(s)∈Rd×dkki(s)\=ciWk(s)∈Rdk,Wk(s)∈Rdc×dkvi(s)\=ciWv(s)∈Rdv,Wv(s)∈Rdc×dvci\=xiWc∈Rdc,Wc∈Rd×dc

然而，理论上这样是能增加模型能力，但别忘了GQA的主要目的是减少KV Cache，出于节省计算和通信成本的考虑，我们一般会缓存的是投影后的ki,vi而不是投影前的ci或xi，而MLA的这个做法，通过不同的投影矩阵再次让所有的K、V Head都变得各不相同，那么KV Cache的大小就恢复成跟MHA一样大了，违背了GQA的初衷。

对此，MLA发现，我们可以结合Dot-Attention的具体形式，通过一个简单但不失巧妙的恒等变换来规避这个问题。首先，在训练阶段还是照常进行，此时优化空间不大；然后，在推理阶段，我们利用  

(6)qt(s)ki(s)⊤\=(xtWq(s))(ciWk(s))⊤\=xt(Wq(s)Wk(s)⊤)ci⊤

这意味着推理阶段，我们可以将Wq(s)Wk(s)⊤合并起来作为Q的投影矩阵，那么ci则取代了原本的ki，同理，在ot后面我们还有一个投影矩阵，于是vi(s)\=ciWv(s)的Wv(s)也可以吸收到后面的投影矩阵中去，于是等效地vi也可以用ci代替，也就是说此时KV Cache只需要存下所有的ci就行，而不至于存下所有的ki(s)、vi(s)。注意到ci跟(s)无关，也就是说是所有头共享的，即MLA在推理阶段它可以恒等变换为一个MQA。

再次强调，本文的主题是一直都是减少KV Cache，那到目前为止，MLA做到了什么呢？答案是通过不同的投影矩阵来增强了GQA的能力，并且推理时可以保持同样大小的KV Cache。那么反过来，如果我们只需要跟GQA相近的能力，那么是不是就可以再次减少KV Cache了？换言之，dc没必要取g(dk+dv)，而是取更小的值（DeepSeek-V2取了512），从而进一步压缩KV Cache，这就是MLA的核心思想。

（注：这里有一个细节，就是Wq(s)Wk(s)⊤合并成一个矩阵的恒等变换，理论上只有在无限精度下才成立，实际上如果我们使用单精度尤其是BF16的话，经过变换后的精度损失往往还是挺明显的，经过多层累积后可能放大到比较可观的程度，这里可能要根据实际误差看要不要做一些后处理。）

### Part 2[ #](#Part 2)

一切似乎都很完美，看上去一个又好又省的理想设计就要出炉了。不过别急，当我们再深入思考一下就会发现，到目前为止的MLA有一个难以绕开的缺陷——不兼容[RoPE（旋转位置编码）](https://kexue.fm/archives/8265)。

刚才我们说了，MLA之所以能保持跟GQA一样大小的KV Cache，其关键一步是“将Wq(s)Wk(s)⊤合并成一个（跟位置无关的）矩阵作为Q的投影矩阵”，但如果加了RoPE的话，这一步就无法实现了。这是因为RoPE是一个跟位置相关的、dk×dk的分块对角矩阵Rm，满足RmRn⊤\=Rm−n，MLA加入RoPE之后会让Wq(s)Wk(s)⊤之间多插入了一项Rt−i：  

(7)qi(s)\=xiWq(s)Ri,ki(s)\=ciWk(s)Riqt(s)ki(s)⊤\=(xtWq(s)Rt)(ciWk(s)Ri)⊤\=xt(Wq(s)Rt−iWk(s)⊤)ci⊤

这里的Wq(s)Rt−iWk(s)⊤就无法合并为一个固定的投影矩阵了（跟位置差t−i相关），从而MLA的想法无法结合RoPE实现。

前段时间，笔者也很荣幸跟DeepSeek团队讨论过这个问题，但这个问题可以说非常本质，所以当时笔者实际上也没能提出什么有效的建议。最简单的方式是放弃RoPE，换用其他基于Attention Bias的位置编码，如[ALIBI](https://kexue.fm/archives/9431#ALIBI)，但DeepSeek的实验显示它明显不如RoPE（注意，MLA不是不能加RoPE，而是加了RoPE之后无法用恒等变换技巧来减少KV Cache），笔者也提议过换[Sandwich](https://kexue.fm/archives/9431#Sandwich)，它不像ALIBI单调衰减到负无穷，估计效果会好些，但感觉是治标不治本。还有一个折中的办法是将qi的输入也改为ci，然后RoPE加在ci之后，即  

(8)qi(s)\=ciRiWq(s),ki(s)\=ciRiWk(s)

这样Ri就可以吸收到ci中去，但这样就没有RmRn⊤\=Rm−n的运算了，此时的RoPE不再是通过绝对位置实现相对位置，而单纯是加在Q、K上的绝对位置信息，让模型自己想办法提炼相对位置信息。

最后发布的MLA，采取了一种混合的方法——每个Attention Head的Q、K新增dr个维度用来添加RoPE，其中K新增的维度每个Head共享：  

(9)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=\[xiWqc(s),xiWqr(s)Ri\]∈Rdk+dr,Wqc(s)∈Rd×dk,Wqr(s)∈Rd×drki(s)\=\[ciWkc(s),xiWkr(s)Ri\]∈Rdk+dr,Wkc(s)∈Rdc×dk,Wkr(s)∈Rd×drvi(s)\=ciWv(s)∈Rdv,Wv(s)∈Rdc×dvci\=xiWc∈Rdc,Wc∈Rd×dc

这样一来，没有RoPE的维度就可以重复“Part 1”的操作，在推理时KV Cache只需要存ci，新增的带RoPE的维度就可以用来补充位置信息，并且由于所有Head共享，所以也就只有在K Cache这里增加了dr个维度，原论文取了dr\=dk/2\=64，相比原本的dc\=512，增加的幅度不大。

### Part 3[ #](#Part 3)

最后有一个细节，就是MLA的最终版本，还将Q的输入也改为了低秩投影形式，这与减少KV Cache无关，主要是为了减少训练期间参数量和相应的梯度（原论文说的是激活值，个人表示不大理解）所占的显存：  

(10)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=\[ci′Wqc(s),ci′Wqr(s)Ri\]∈Rdk+dr,Wqc(s)∈Rdc′×dk,Wqr(s)∈Rdc′×drki(s)\=\[ciWkc(s),xiWkr(s)Ri\]∈Rdk+dr,Wkc(s)∈Rdc×dk,Wkr(s)∈Rd×drvi(s)\=ciWv(s)∈Rdv,Wv(s)∈Rdc×dvci′\=xiWc′∈Rdc′,Wc′∈Rd×dc′ci\=xiWc∈Rdc,Wc∈Rd×dc

注意ki(s)中的第二项，带RoPE的部分，其输入还是xi而不是ci，这里保持了原论文的设置，不是笔误，dc′原论文的取值是1536，跟dc\=512不同。同时，我们把带RoPE的MHA放在下面，方便大家对比：  

(11)ot\=\[ot(1),ot(2),⋯,ot(h)\]ot(s)\=Attention(qt(s),k≤t(s),v≤t(s))≜∑i≤texp⁡(qt(s)ki(s)⊤)vi(s)∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=xiWq(s)Ri∈Rdk,Wq(s)∈Rd×dkki(s)\=xiWk(s)Ri∈Rdk,Wk(s)∈Rd×dkvi(s)\=xiWv(s)∈Rdv,Wv(s)∈Rd×dv

可以发现，其实在训练阶段，除了多了一步低秩投影以及只在部分维度加RoPE外，MLA与Q、K的Head Size由dk换成dk+dr的MHA基本无异。

推理阶段的MLA则改为  

(12)ot\=\[ot(1)Wv(1),ot(2)Wv(2),⋯,ot(h)Wv(h)\]ot(s)\=Attention(qt(s),k≤t(s),c≤t)≜∑i≤texp⁡(qt(s)ki(s)⊤)ci∑i≤texp⁡(qt(s)ki(s)⊤)qi(s)\=\[ci′Wqc(s)Wkc(s)⊤,ci′Wqr(s)Ri\]∈Rdc+drki(s)\=\[ci,xiWkr(s)Ri\]∈Rdc+drWqc(s)∈Rdc′×dk,Wkc(s)∈Rdc×dk,Wqr(s)∈Rdc′×dr,Wkr(s)∈Rd×drci′\=xiWc′∈Rdc′,Wc′∈Rd×dc′ci\=xiWc∈Rdc,Wc∈Rd×dc

此时Q、K的Head Size变成了dc+dr，V的Head Size 则变成了dc，按照原论文的设置，这是dk、dv的4倍。所以实际上MLA在推理阶段做的这个转换，虽然能有效减少KV Cache，但其推理的计算量是增加的。

那为什么还能提高推理效率呢？这又回到“瓶颈”一节所讨论的问题了，我们可以将LLM的推理分两部分：第一个Token的生成（Prefill）和后续每个Token的生成（Generation），Prefill阶段涉及到对输入所有Token的并行计算，然后把对应的KV Cache存下来，这部分对于计算、带宽和显存都是瓶颈，MLA虽然增大了计算量，但KV Cache的减少也降低了显存和带宽的压力，大家半斤八两；但是Generation阶段由于每步只计算一个Token，实际上它更多的是带宽瓶颈和显存瓶颈，因此MLA的引入理论上能明显提高Generation的速度。

还有一个细节充分体现了这个特性。一般的LLM架构参数满足h×dk\=d，即num\_heads \* head\_size = hidden\_size，但DeepSeek-V2不一样，它dk\=128,d\=5120，但h\=128，是一般设置的3倍！这是因为MLA的KV Cache大小跟h无关，增大h只会增加计算量和提升模型能力，但不会增加KV Cache，所以不会带来速度瓶颈。

## 小结[ #](#小结)

本文简单概述了多头注意力的演变历程，特别是从MHA向MQA、GQA，最终到MLA的变化理念，最后详细展开了对MLA的介绍。在本文中，MLA被视为GQA的一般化，它用投影矩阵的方式替代了GQA的分割、重复，并引入了一个恒等变换技巧来可以进一步压缩KV Cache，同时采用了一种混合方法来兼容RoPE。总的来说，MLA称得上是一种非常实用的注意力变体。

_<strong>转载到请包括本文地址：</strong><https://kexue.fm/archives/10091>_

_<strong>更详细的转载事宜请参考：</strong>_[《科学空间FAQ》](https://kexue.fm/archives/6508#%E6%96%87%E7%AB%A0%E5%A6%82%E4%BD%95%E8%BD%AC%E8%BD%BD/%E5%BC%95%E7%94%A8 "《科学空间FAQ》")

<strong>如果您还有什么疑惑或建议，欢迎在下方评论区继续讨论。</strong>

<strong>如果您觉得本文还不错，欢迎[分享](#share)/[打赏](#pay)本文。打赏并非要从中获得收益，而是希望知道科学空间获得了多少读者的真心关注。当然，如果你无视它，也不会影响你的阅读。再次表示欢迎和感谢！</strong>

<strong>如果您需要引用本文，请参考：</strong>

苏剑林. (May. 13, 2024). 《缓存与效果的极限拉扯：从MHA、MQA、GQA到MLA 》\[Blog post\]. Retrieved from <https://kexue.fm/archives/10091>

 @online{kexuefm-10091,  

```text
 title={缓存与效果的极限拉扯：从MHA、MQA、GQA到MLA},  
 author={苏剑林},  
 year={2024},  
 month={May},  
 url={\\url{https://kexue.fm/archives/10091}},  
 }
```


### 你也许还对下面的内容感兴趣

```text
* [以蒸馏的名义：“从去噪自编码器到生成模型”重出江湖](https://kexue.fm/archives/10085 "以蒸馏的名义：“从去噪自编码器到生成模型”重出江湖")
* [生成扩散模型漫谈（二十四）：少走捷径，更快到达](https://kexue.fm/archives/10077 "生成扩散模型漫谈（二十四）：少走捷径，更快到达")
* [生成扩散模型漫谈（二十三）：信噪比与大图生成（下）](https://kexue.fm/archives/10055 "生成扩散模型漫谈（二十三）：信噪比与大图生成（下）")
* [生成扩散模型漫谈（二十二）：信噪比与大图生成（上）](https://kexue.fm/archives/10047 "生成扩散模型漫谈（二十二）：信噪比与大图生成（上）")
* [Transformer升级之路：17、多模态编码位置的简单思考](https://kexue.fm/archives/10040 "Transformer升级之路：17、多模态编码位置的简单思考")
* [时空之章：将Attention视为平方复杂度的RNN](https://kexue.fm/archives/10017 "时空之章：将Attention视为平方复杂度的RNN")
* [配置不同的学习率，LoRA还能再涨一点？](https://kexue.fm/archives/10001 "配置不同的学习率，LoRA还能再涨一点？")
* [“闭门造车”之多模态模型方案浅谈](https://kexue.fm/archives/9984 "“闭门造车”之多模态模型方案浅谈")
* [幂等生成网络IGN：试图将判别和生成合二为一的GAN](https://kexue.fm/archives/9969 "幂等生成网络IGN：试图将判别和生成合二为一的GAN")
* [Transformer升级之路：16、“复盘”长度外推技术](https://kexue.fm/archives/9948 "Transformer升级之路：16、“复盘”长度外推技术")
```


