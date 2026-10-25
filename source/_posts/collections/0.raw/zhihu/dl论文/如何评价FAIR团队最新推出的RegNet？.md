---
title: 如何评价FAIR团队最新推出的RegNet？
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/如何评价FAIR团队最新推出的RegNet/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/384255803/answer/1122828283
---


郑侠武

stay young stay hungry

​ 关注

首先纠正一下大家，这个其实是Ilija Radosavovic 一系列的工作，Ilija Radosavovic 在这个系列上出了两篇工作第一篇评价搜索空间，挂没挂kaiming he 我忘记了，第二篇，也就是这篇，在第一篇的基础上，不断的 shrink 搜索空间来获取insight辅助设计网络。

首先看到这个文章第一个想法是作者土豪啊，大家现在NAS的做法是某点突破，首先在一个搜索空间上，怎么想着拼命节约时间，怎么节省怎么来，很多NAS文章都透露着穷酸相，这篇文章直接开始 农村包围城市了，直接对search space 指手画脚了。

例如上图，从A走到B大概需要在Imagenet上训练 500x10 epoch吧。

现在可以把NAS文章按照卡的等级分为这么几类：

- 穷逼高校研究组，特点是基本上就搞cifar10，实在不行cifar100。什么，搜索imagenet？ 搜索imagenet是不会搜索的，这辈子都不可能的，又没有卡，就是在cifar10上搜索这样子，然后加上autoaugmentation ，调试调试参数，刷刷performance这样子，在cifar10上搜索呢，感觉比imagenet上好多了，实验又容易做，每次随便搜索性能又好，超喜欢cifar10上搜索。 然后搜索完成结构随便迁移到Imagenet训练一下这样子，才能稍微维持一点水文章的速度。
- 中产高校研究组/start up 公司 。这些单位有条件直接在ImageNet上搜索了，开始定点突破了，大家都在疯狂的刷 600FLOPS下最优的网络结构，主要就是在MobilenetV2/V3上面疯狂的搜索+调试参数。紧跟Google步伐，google公布一个架构backbone，大家疯狂的跟上，搜索一波，然后再PR，我beat 了 efficientNet！牛逼不牛逼？？？ 当然，请忽略我仅仅beat 了 efficientB0这个事实。但是其实讲道理，我挺喜欢这些工作的，也推荐大家使用这些结构，因为确实不错，里面真心推荐once for all，虽然代码复杂了点，但是目前 600M flops下我目前没看到谁超越。
- 来到了我们的主角了，土豪研究组，众星捧月，一出文章大家疯狂follow，比如Facebook的 fair，或者 google quoc le团队。每次Quoc Le 一发文章，所有人就follow，有的叫道“Quoc Le，你又发文章了！”Quoc Le也不回答，对Google集群说，提交1000个模型，每个模型设置不一样的参数，精确到小数点后两位，“你又调参数来涨点了”他便涨红了脸，额上的青筋条条绽出，争辩道，“修改参数不叫调参，又没有用hyperband，”接着便是一些难听的话，“为了获取更好的insight”引得众人都哄笑起来：店内外充满了快活的空气。讲道理，对于这两个公司，我感觉更喜欢Quoc le 吧，每次发的文章都很有insight，也确实看到他们在自己有很多卡的基础上，做了很多探索性质的工作，而且都很solid，文章一出实验上让人无话可说。比如NASbench 101，比如 efficientNet，mobilenetV3，Facebook显然后劲不足，当然，比我们是强多了，我指的是和Google相比。回到这篇文章上来讲吧，做几个客观事实描述

这篇文章有没有insight？有，而且还挺多，确实很不错，至少做了很多实验，让大家看到诚意。比如高赞回答的那些点都回答的很好了，主要就是这些优点。这些点都在设计网络上可以作为参考。

我来主要说一下缺点吧，

1.在这个问题下面也有人描述，其实imagenet上训练10 epoch，显然不够的，其实epoch会对结果影响很大，没有大量的实验作为参考，莫名其妙就把epoch设定为10显然不合理，因为epoch改变对于结构的rank影响非常大，所以对于后面的结论都要有一点疑问。（更新一下：作为审稿人，我在审稿这篇文章一定会不断的问我自己，为什么正好是10epoch，比如在一个imagenet 的子集上证明了10 epoch， 100 epoch带来的变化不大，那就可以解释得通，或者用什么定理说服我，我就可以接受，而不是一上来就是10epoch，然后让大家去猜这样做的原因。）我作为搞nas的来讲，cifar10上10epoch都会极大地降低 相关度，更别提imagenet了。

2. Anynet search space 太overclaim了，很多参数明明就是按照现有的网络结构先验设定好的，比如开始卷积层，比如stage的设置，比如一些block的设置。

3. 搜索空间的跃迁太快了，比如一上来立马就固定/share一些超参数，但是现在很多都是不固定的，我要吹一波 hansong 组cai han的proxylessNAS 还有 once for all了，在他们搜索的时候很明显不share 获得更好的网络结构。

4. 结果其实马马虎虎吧，并不好，甚至不如mobilenetV3。比如mobilenetV3在仅仅300+ FLOPS下就达到了75.2，但是regnet在600左右的情况下仅为75.5，相比于once for all 512M flops下就达到了 80+！！（又夸了一波）。但是这篇文章的 claim 超越efficient确实没毛病(不像某些PR，超越B0就开始疯狂的吹了...)，实验确实solid，我仅仅就 600MFLOPS这个节点提出异议。 （更新一波 @CLAY
  efficientnet的base是他们自己训的，b5比原论文低了五个点，但是B5本来就很难搞，需要大量的batchsize以及 显卡，感谢@郑华滨（不知道为啥@不到）同学认真阅读论文，情有可原，并且论文主要是做GPU latency，已经把@郑华滨同学的评论置顶:) ）再更新一下这个点：或者说于mobilenetV3比较没有意义，因为一个做GPU latency一个做flops，那和 once for all 以及 proxylessNAS比较总有意义了吧，proxylessNAS可是再很小的latency下就做到了75+，而且论文当中训练的并不完全，仅仅150 epoch，后来我自己实现300epoch，其他什么参数都没改，轻松到76+，而且proxylessNAS_GPU模型本身就已经很快了，运行速度仅仅为7+ms。

5.最后的Flops指标的问题，这个其实很不错，FLOPS和GPU 下不是线性其实很多人都注意到了，其实FLOPS更能反应的是CPU上的运算速度。

总的来说，前面三个地方需要略微修改，特别是第一个。但是其实都是小问题。相比于FAIR组之前的一些文章，纯粹的个人观点，值得是一篇oral。

-----------------------------------私货的分割线------------------------------------

在这里有的人谈论到底是 FAIR好一点还是deepmind好一点，其他领域我不知道，NAS/AutoML肯定是Deep mind碾压其他单位的，且不说zoph 第一次挖坑搞 NASnet，后面efficientNet/autoaugmentation 也是reference的人一大堆....虽然大家很诟病deepmind复现很难，但是在NAS方面，还有Frank Hutter这个大杀器，经常时不时就合作搞一篇很有insight的文章。

阅读全文​
​赞同 433​​53 条评论​239 ​21 ​分享