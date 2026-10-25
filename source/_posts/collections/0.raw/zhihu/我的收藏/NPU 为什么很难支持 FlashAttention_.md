---
title: "NPU 为什么很难支持 FlashAttention?"
date: "2026-04-22 00:00:00"
updated: "2026-04-22 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/NPU-为什么很难支持-FlashAttention_/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/1964791844773822881/answer/1971378739620329005"
---


THU Markov
​
清华大学 电子科学与技术博士

​ 关注

在FlashAttn加速器上硬磕了一年，和组里合作了一个HW/SW co-designed的FA加速架构。本以为颇有心得，但许多回答依旧是看不懂的状态 

转念一想也正常，FA本是软硬件协同设计的典范，LLM系统到GPU/NPU架构均有涉及，不同stage看到的风景自然不同。我本身又是ASIC design的背景，必然有很多局限性。所以钻研透Flash attention并非易事，还需继续学习、开拓视野。

Problem Statement
flash attention 作为一个性能优化技术，功能上和标准attention并无二致。只谈功能，我想绝大多数NPU能支持flash attention，并拿到memory I/O部分的收益。因此不妨将问题重新定义为：NPU上实现高性能flash attention都遇到了有哪些难点？这样更多同行们也能交流起来

Background
FlashAttn2 Algorithm如下。由于中间结果P变量的size是N²量级，通常需要卸载到DRAM，并重复搬运，其memory bandwidth和latency 会成为系统瓶颈。Flash Attention的idea是将QKV进行细粒度切分，从而让中间结果可以全部装在SRAM上：

- Q在SeqLen维度被切分为Tr个block，KV切分为Tc个block
- 每个tile计算一组QKV block
- Tile内使用local max计算，x/s/p的size只有block_size²
- 最后通过global max rescaling调整到正确的结果。for h in range(0, nheads):    

```text
    for i in range(0, Tr):
        m_g = -inf
        o_g = 0
        l_g = 0
        for j in range(0, Tc):
            q = Q[i][h]
            k = K[j][h//group_size]
            v = V[j][h//group_size]
            mask = Mask[i][j]
            # local max attention
            1. x = matmul(q, k)
            2. s = x/scale + mask
            3. m = rowmax(s, m_g)
            4. p = exp(s-m)
            5. l = rowsum(p)
            6. o = matmul(p.T, v.T)
            # output rescaling
            7. sf = exp(m_g-m)
            8. o_g = o_g * sf + o
            9. l_g = l_g * sf + l
            10. m_g = m
        11. O[i][h] = o_g / l_g
```

算法的前两重循环不存在data dependency, 可以完全并行。因此FA实现的核心是最内层循环，刨去数据initialize和prefetch, 计算部分只需要11个算子即可实现。不考虑任何优化，顺序执行11条宏指令就能拿到flash attention 在Memory I/O上的收益。

很显然，事情没有那么简单。It is perf problem, stupid. 

Optimization Target
Perf 才是Flash attention的出发点，而Memory I/O 并不是性能优化的全部。举例来说，ILP很容易拿到2/3，4/5算子的吞吐量翻倍；混合精度量化能拿到更高的Matrix 性能，1，6算子的性能在(int8,fp4)下也能轻松翻倍。如此优化方法不一一枚举了。

那性能优化的目标该怎么选呢？第一想到的肯定是token/s这类end-to-end性能指标。但GPU/NPU的规格差异会影响绝对性能，需要找到一个统一且公平的指标来衡量优化效果。

算力利用率（utilization）是最重要的指标之一，本问题可以进一步简化为MAC util的优化问题，因为matmul计算量占LLM计算的主要部分，NPU中绝大多数的area/power consumption都出自MAC array/cube。高利用率是实现高性能、高能效的基础，当然Flash Attn还做了相当多高阶优化，之后再展开。

点出Util之后的思路就海阔天空了。high-level来看，NPU可以视为matrix/vector/scalar计算的流水线。Flash Attention 在硬件差异主要在提现在利用率。优化的极限是实现100%的utilization，这意味着matrix/vector/scalar 计算吞吐量的平衡。凡是能接近100%利用率的实现都是好的实现。如果vector 算子算得比matrix算子慢，就需要去解决vector processor的瓶颈反之亦然，类似与水多了加面，面多加水的关系。

想必npu同行都了解MAC util的意义，因此并未在回答中强调。对于大多数知乎读者而言，在该问题中明确点出该指标是有帮助的。自此本文将原问题转化为flash attn的性能优化问题，又进一步抽象成mac utilization指标的优化。下一步将break down到一些常见的问题和解决思路。

Challenge   Solution
NPU是否很难加速flash attention？这个问题这不能一概而论。笼统来说NPU一般采用VLIW架构，编程灵活性和易用性是一个老大难的问题，在映射Flash attn过程中难免损失一些性能。但另一方面，NPU单位算力下一般设计了更高的UB容量和带宽，这对实现高利用率是有优势的。

如果能从头设计，我相信问题可以很好规避和trade-off的。但要在已有NPU架构基础上小修小补，架构设计中还是要用上不少"曲折"的优化方法。就在这个话题下就聊一聊我遇到的问题吧：

Challenge1: Local Softmax流水线编排
不妨假设NPU是一个拥有Matrix/Vector/Scalar unit且完美编译器的 processor。将local softmax 对应的指令顺序编排如下图所示（贴心得加上了FP8 量化的计算）。假设每一个算子只需要一条宏指令：BMM1和BMM2发射到Matrix Unit, 中间的5条指令发射到Vector Unit。合理的设计应做到每一条Matrix和Vector指令吞吐一致，这样不会浪费任何硬件资源。

如果所有指令顺序编排和执行，那么指令time-line如上。Matrix单元只在约2/3时间active。为啥time-line上会有一个这么大的气泡呢，原因是data dependency！

- exp()必须要等reduce_max()走完整个块得到Mi，才能开始执行
- Pi_q需要走完整块才能转置输出，之后BMM2才能开始计算；考虑I/O和同步的latency（虚线间的时间），Util损失进一步加大。那怎么解呢？细心的朋友注意到我标粗了顺序执行。很显然乱序执行是挤气泡最容易想到的思路。对于GQA/MQA/MLA来说，可以把同一个group后续head的计算都挤进中间的气泡，KV复用。对于MHA,还可以把后一个Q_block的BMM1计算挤进来，KV也是复用的。NPU有可能实现不了乱序执行，但编译器或者简单手工编排一下总可把所有气泡挤掉的。

乱序执行看起来很好，但一个NPU 执行多个head/blocks,就需要保存多份context (即Si,Mi, Pi这些中间变量）。这对cache不足的NPU并不友好，需要选择合适的执行顺序+tile size 保证cache能把中间变量兜住。另外一个思路就是把BMM1和BMM2分别发射到两个Matrix units上构成流水线，这样最省memory，但是需要承受BMM1- BMM2中间latency的惩罚。

Challenge2: ILP   Synchronization

假设我们重新编排指令，在Tile0的BMM1和BMM2之间挤入了其他tile的计算，指令执行time-line如上图所示。图中有大量Vector指令在并行执行的，对vector unit提出了很高要求，不仅要按照理想的编排乱序发射出指令，而且执行单元还要足够多保证性能。除此以外，Matrix unit和vector unit也在并行，两个处理单元需要做到高带宽数据传输和细粒度同步。

ILP和同步方面是传统NPU不太重视的地方，毕竟发展自CNN时代，主要解决的是大颗粒度卷积计算的问题，向量算力的需求不大。

上面只是实现难易分析，不代表GPU性能一定好于NPU。知乎上有早有hopper系列exp2性能不够的传闻，这对flash attention性能是有影响的。NPU架构众多，也未必都会存在这方面的问题。

Challenge3: Rescaling mapping
前面两个challenge都着重在local sofmax, rescaling 相对有一些不同。

首先rescaling是在标准attention基础上额外增加的向量计算，这改变了matrix-vector计算量的比例。对于vector算力不足的NPU来说，这无异于雪上加霜，vector计算变得更慢，从而降低MAC util。

此外rescaling处理的data shape, 和local softmax的data shape也有差异。如果使用同构的vector unit，那么计算速度必然不均衡。而且两者的计算量差异还不是固定的，和block_size有关。对于NPU来说，设计异构的vector units分别处理softmax和rescaling是一招，但也无法在所有block size下实现均衡。这方面GPU会明显有优势，把softmax和rescaling mapping到不同并行规模上是比较自然且可实现的。

Challenge 4: Low-bit Quantization
现代的GPU/NPU都在往更低精度的方向上发展。Matrix 一般会采用更激进的量化格式来提升能效和面积效率，而目前算法和硬件已经在往vector FP16, matrix FP4的节点收敛。

Flash Attn里实现FP4 matrix可能是一个比较大的挑战。在长文本应用中，Attention weight 分布相当不均匀，FP8会是一个相当risk的选择，要cover动态范围则需要FP16。

当然硬件社区也在努力实现更好的量化格式。MXFP4/NVFP4通过micro scaling 来抑制离群值对量化的影响，Hadamard变换拉平动态范围等等。相信未来会有一系列技术出来让FP4逐步可用，下一代NPU设计中需要重点关注到。但现有的NPU架构不说MXFP4, 连MXINT8 都未必支持，不得不退化到FP16的精度计算，导致绝对性能偏低。

阅读全文​
​赞同 373​​15 条评论​662 ​19 ​分享