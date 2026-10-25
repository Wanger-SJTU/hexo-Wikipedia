---
title: (2 条消息) DDR5 内存是如何做到速度相比 DDR4 实现「质的飞跃」的？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/DDR5-内存是如何做到速度相比-DDR4-实现「质的飞跃」的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/9218009141/answer/75908553761
---


当内存来到DDR5这一代之后，内存的传输速度可谓突飞猛进。

DDR4时代以2333MT/s~2600MT/s为主，超频到3200MT/s，已经是非常了不起。

DDR5起步就是4800MT/s，到了2024年，主流DDR5内存来到了6400MT/s，预计2025年~2026年会到达8000MT/s。

如此巨大的进步，除了制程上的进步，组织结构上的优化，最大的功臣，其实是DFE。今天我们就来看看DFE是如何给DDR5内存开天眼的。

### 眼图

“开天眼”这个词是不是觉得有点唐突，实际上，DFE的目的，就是开眼，这里所说的眼，是信号的眼图。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d56cd85ca39e.jpg)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d022f57edfdb.webp)

对于EE专业的同学来说，眼图是再熟悉不过的概念。可能有第一次听说眼图的同学，我这里就以最短篇幅快速介绍一下。

理想的数字信号，高电平就是1，低电平就是0，所以信号都是直上直下的方波信号，但实际的信号，上升或下降是一个过程，就像下图中所示的，是斜的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b54fb6a6ce7b.jpg)

我们把各个周期的信号叠加在一起，就形成一个像眼睛一样的图形，我们称之为眼图。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4424abdda2dc.jpg)

理想的眼图，是一个接近长方形的圆，我们说眼睛睁的很大

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_46ddef053241.jpg)

但真实的信号，会有各种各样的畸变，延迟，反射

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_763518844416.jpg)

眼图看起来就会很乱，“眼睛”很小甚至没有：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0595a5884e44.jpg)

### 背景

当DRAM的数据传输率超过 2933MT/s时，码间干扰（ISI Inter Symbol Interference）会急剧增加，以至于内存的眼睛无法睁开，比如下图是6Gb/s速度下的眼图，可以说徐志胜笑起来都比这个眼睛大。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_200b03972c7a.jpg)

这便是阻碍内存速度提高的一大障碍。

### 反射脉冲

如果把信号线想象成一根管道，当你在一头说话，在另一头就能听到你讲话。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c1243a599da0.jpg)

管道内是有回声的。

如果你说话很慢，尽管有回声，但是不影响正常沟通。

如果你说话极其快，你的声音和回声会混在一起，对方就听不到你在说啥了。

DDR5的On Die termination就是尽量降低阻抗上的各种回声，提升信号完整性（On Die Termnination我会有专门的文章来介绍）。但是对于高速信号，这依然不够。

下图是DDR spec上一个反射脉冲的例子：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f9fc397640e3.jpg)

可以看到在信号边缘有一个60mV和一个20mV的波动，这两个波动叠加到下一个周期的信号中，就会严重影响眼图。

### 均衡器（Equalization）

对于失真信号，需要均衡器用来提升信号的质量。均衡器的思路其实是非常简单，说白了就是对信道的补偿。

$r_{k}^{} = h \cdot a_{k} $

直白地说，h代表了传输过程中带给信号的影响，包括噪声，畸变，码间干扰，等等等等。那如何抵消H的影响呢？聪明的你马上就想到了，给他乘以 h^{-1} 不就行了？

恭喜你，发明了均衡器！

$r_{k}^{} = h \cdot a_{k} \cdot h^{-1} = a_{k} $

这个 h^{-1} 就是均衡器。

均衡器可以放在发送端，也就是说你再发送的时候就预计到可能发生的信号失真和损失（比如高频衰减快，低频衰减慢），将发送信号叠加上补偿，这样经过传输之后可以得到预期的信号，这就是前端均衡器。

最常见的均衡器是CTLE和DFE，大家在大部分和信号相关的领域都能看到这两个概念的出现。

CTLE(Continuous Time Linear Equalizer)是线性高通滤波器，作为前端均衡器，通常对有限信号做补偿，CTLE的原理很简单，因为高频信号衰减大，所以通过衰减低频信号分量来补偿奈奎斯特频率附近的衰减比例。CTLE的优点是线性滤波，不会引入非线性失真，但缺点是会放大噪声。

DFE(Decision Feedback Equalizer)是反馈滤波器，作为后端均衡器，反馈滤波器可以将已接收的信号作为输入，可以很好的抵消码间干扰。今天我们着重要看的就是DFE。

### DFE

先放一个流程图，然后我们一步步来讲解。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dbd67f48b348.jpg)

在前面的小节中提到反射脉冲时，我们已经知道，输出信号到达接收端的时候，不仅自身受到了信道的影响，同时反射信号也会叠加在接收端。可以简单的用公式来表示这个过程：

$$r_{k}=h_{0}a_{k} +\sum_{i=1}^{n}{h_{i}a_{k-i}}+n_{k} $$

接收信号 r_{k} 由三部分组成：

- h_{0}a_{k} 是我们需要的信号；
$- \sum_{i=1}^{n}{h_{i}a_{k-i}} 是码间干扰（ISI）；$
- n_{k} 是噪声
我们在接收信号 r_{k} 之后加一个前端滤波器用来补偿信道的损失：

y_{k}=\frac{1}{h_{0}}r_{k} 

最终的信号，需要减去码间干扰（ISI）的部分，这是DFE反馈均衡器的结果。

在某一个时间点k，接收端已经有了对之前信号的决策，所以当前时间点在接收端需要减去之前所有信号的码间干扰（ISI）的部分：

$$z_{k}=\frac{1}{h_{0}}r_{k}-\sum_{i=1}^{n}{h_{i}\tilde{x}_{k-i}} $$

$$z_{k}=a_{k} + \frac{1}{h_{0}}\sum_{i=1}^{n}{(a_{k-i} - \tilde{a}_{k-i})} + \frac{n_{k}}{h_{0}} $$

$假设对之前信号的决策正确的情况下( a_{k-i} - \tilde{a}_{k-i}=0 )，就得到了如下结果：$

$$z_{k}=a_{k} + \frac{n_{k}}{h_{0}} $$

从这里也可以看出，DFE可以完全去除ISI的部分，但是和CTLE不同的是，噪声的部分并没有加强。

DFE的内部是将一定数目的过去的数据以特定的加权值去做一个加法，以达到抵消码间干扰（ISI）的目的，这也正是“反馈”所代表的意思。

下图是一个5-tap DFE的示意图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_844b5431f155.jpg)

### DDR5 DFE (Decision Feedback Equalization)

DDR5引入了一个4-tap的DFE，前端的增益控制(Gain)用于确保当前信号位与所需矫正的码间干扰（ISI）保持一致关系，四个Tap通过Bias Multiplier对码间干扰（ISI）的影响做了加权矫正。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3836e14921f2.jpg)

JEDEC的spec里还定义2-way interleaved 4-tap DFE和4-way interleaved 4-tap DFE，这个大家了解一下就可以了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_61daaf20518c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7958812de42e.jpg)

DDR5这一代新增了一百多个MR（Mode Register），几乎都是和DFE相关的。

从MR112开始，5个为一组，MR112~MR116

MR112指定DFE gain（前端增益），MR113，MR114，MR115，MR116分别指定每一个Tap的Bias。

SDRAM的DM信号和所有DQ信号都需要DFE，所以对于DML，DMU，以及最多16个DQ （x16 SDRAM），每个信号都有MR来配置DFE。当然，x4，x8的SDRAM只用到其中的一部分。

这是MR具体的定义，知道一下就行了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4f50f7e8b90e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1db266794757.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_25ba9ffcefbd.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aeced34d0201.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8782a6479fc6.jpg)

### 总结

高速信号的码间干扰（ISI）对眼图构成极其严重的影响，DFE作为一直反馈均衡器，非常适合消除码间干扰（ISI），像变魔术一样，将杂乱无章的眼图变成清晰的眼图。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c751d0bc1f7c.jpg)

DFE是DDR5的速度大幅提升的功臣，现在主流DDR5内存都来到6400MT/s，2025~2026年，我们将看到8000MT/s成为新的主流。

当然DFE也带来一些不大不小的麻烦，最主要的就是对启动时间的影响，内存在初始化训练（memory training）的时候，由于引入了DFE，单个rank的时间通常增加了10~100秒不等（或者更久），所以搭载DDR5内存的系统第一次启动的时间比DDR4有明显增加。

对于终端用户来说，你完全不必关心这里的技术原理。对技术感兴趣的同学可以了解下，这里面其实有太多的知识点可以延伸（我写作时会尽量克制）。也欢迎大家订阅我的专栏，我会持续分享干货知识。

[](https://www.zhihu.com/column/c_1724094960771751936)

送礼物

还没有人送礼物，鼓励一下作者吧

[发布于 2025-01-10 10:42](//www.zhihu.com/question/9218009141/answer/75908553761)・上海

​124 条评论​1570 ​89 ​分享

​​

收起​