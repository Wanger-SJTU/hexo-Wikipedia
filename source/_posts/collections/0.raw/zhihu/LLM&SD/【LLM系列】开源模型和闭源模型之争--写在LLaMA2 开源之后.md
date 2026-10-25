---
title: 【LLM系列】开源模型和闭源模型之争--写在LLaMA2 开源之后
date: "2023-07-21 00:00:00"
updated: "2023-07-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/LLM-SD/【LLM系列】开源模型和闭源模型之争-写在LLaMA2-开源之后/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/644892671
---


本来没打算这么快就写LLM系列的第二篇文章的，但是最近LLaMA2发布和并几乎完全商业可用几乎引爆了LLM圈，好多人都在讨论Meta AI真正做到了OpenAI，是开源LLM的一个重要里程碑，甚至觉得国内和OpenAI的差距又缩小了。其实，关于开源和闭源模型之争的讨论也持续了有几个月了。就这个问题而言，我对开源模型是比较悲观的，LLaMA2的发布并没有减轻这种悲观，反而隐约加重了这种悲观的看法。借着LLaMA2开源这个话题，记录下自己当下对这个问题的看法，希望有一些工作能让我对开源LLM变得乐观起来。

### 先说结论

- <strong>LLaMA2对于追赶OpenAI帮助不大</strong>
- <strong>LLM开源可能是伪开源</strong>
- <strong>LLaMA2开源对于国内大模型竞争没有太大影响</strong>
- <strong>LLaMA2开源的积极影响：免费商用，私有化部署，加速开源竞争</strong>
放一张 [@拾象科技](//www.zhihu.com/people/9b7f39f8b248edb80957a7fc1e1c95bf)

 最近报告中的图，理由很一致：缺算力，时间差。看看这这次LLaMA2开源中狂欢的最厉害的一些人 <strong>1）研究人员（特别是高校研究人员）</strong>，有了一个新的基础能力还不错的开源模型，做点微调改进，又可以刷榜了，随便针对LLaMA2做点新东西，指标上从接近GPT3.5到超越GPT3.5，就是一个工作；<strong>2）中小企业</strong>，没能力训练基础模型，现在来个还不错的，做做微调，随便改改，就是自研大模型了；<strong>3）创业者（不包括基础大模型创业者）</strong>，基于不错的基础模型做应用似乎有机会了。<strong>一个共同特质都是，没有大规模算力资源训练基础大模型，但善于做微调</strong>的那部分人。真正只会用ChatGPT的用户也不会转移去用LLaMA。

![](/images/collections/0.raw/zhihu/LLM%26SD/asset/img_7eff51463293.jpg)

### LLaMA2对于追赶OpenAI帮助不大

现在的LLM发展基本上可以分为两个大的方向：<strong>探索智能的极限</strong>和<strong>大模型商业化应用</strong>。少数公司在做前者，大多数公司想做后者。虽然OpenAI做出了大模型目前来看最大的商业化应用ChatGPT，但他们的核心目标和使命仍然是AGI，也就是探索智能的极限。LLaMA2开源对于商业化应用是有帮助的，这个具体后面会讨论，但对于探索智能的极限这一目标没有太多实质性的帮助。

对于探索智能的极限这个事情来说，最重要的是<strong>Pretrain模型</strong>，这个决定了后面SFT或者RLHF的上限在哪里。仔细读完LLaMA2的technical report，会发现LLaMA2相比较于LLaMA1在pretrain模型上唯二的不同：数据增加到了2T，使用了Group head attention （增加context window不能算是不同吧，只是改了一下参数）。甚至对于7B和13B的模型，只有数据量这一个差别。增加数据量和加强数据质量控制这两个结论应该是整个LLM界早已经达成共识的点，越多高质量的数据代表越强的智能。但对于真正决定模型能力差距的几个关键问题：怎样控制预训练数据的质量，预训练的时候怎样调整数据配比能得到最好的结果（有没有科学的方案来指导数据配比），预训练过数据的顺序对结果的影响（怎样找到最优的数据顺序），代码数据在哪个阶段加入预训练是最有效的，没有从LLaMA2的模型中看到这方面的insight。Falcon的工作至少提出了refined web data和清洗数据的很多rules，对其他做预训练的人是有insight。但LLaMA2 不知道是做了不肯说（毕竟这也是OpenAI最核心的Recipe，不说也正常）或者压根没科学地做，反正是让人蛮失望的。可以简单总结为过了4个月，Meta在预训练方面没什么大的进步。

换个角度看，大家费尽心力想要去复制一个GPT3.5，到现在也只能做到接近的水平。可是对怎么做GPT4仍然没有什么思路，看完LLaMA2的technical report，感觉对做GPT4的价值都没有Dylan之前的泄密报告来的大。而OpenAI再这几个月可能又用几万张卡做实验总结/分析/验证了不少思路和tricks，差距可能越拉越大了。

Meta在LLaMA2的主要贡献在SFT和Safety的大量工作，也就是post-train阶段的工作。<strong>如果算力和资源丰富地如Meta一样的公司也只能做post-train，是不是说可以和OpenAI竞争的公司可能在变得越来越少呢？</strong>

### LLM开源可能是伪开源

一直觉得LLM开源（这里的<strong>LLM开源指的都是预训练模型的开源</strong>，不包括SFT模型）和其他开源项目有点不一样，主要有下面几个感受：

<strong>只有大公司能开源LLM</strong>

LLM训练是一个成本极高的事情，首先很respect这次Meta烧了千万美金开源了模型和非常详细的technical report（虽然主要侧重的是post train）。但壕如Meta的机构本就不多，能真正花精力去做开源的更是少之又少。在预训练阶段大量的开源工作还是在7B，13B这个规模上，开源大模型是需要庞大的资金支持的。这里同样需要respect之前BigScience做的Bloom，这个是真正意义上的开源社区聚集一大群人一起发展LLM的接近最佳实践了。但Bloom的模型训练的还是不够好（可能也是社区组织大家一起做事的弊端吧）。除此以外，能开源大size的预训练模型的只剩下土豪大厂了。

但是动态地看，训练下一代的模型成本是会数量级上升的，当Meta花1亿美金训练接近GPT4的模型的时候，还会继续开源吗？花10亿美金训练接近GPT5的模型的时候，还会继续开源吗？大家都不知道。或者说Meta有一天说我不想开源了，或者像国内某些公司开源是开源了但你使用需要交给授权费，或者把开源模型撤回了要收高价，似乎作为社区参与者都不能说什么。毕竟<strong>模型是别人花真金白银训练出来的，且社区参与者几乎对训练模型没有起到任何帮助</strong>，别人要收费你也拦不住。

<strong>社区并没有对LLM训练起到帮助</strong>

社区其实在预训练过程中没参与什么，这也是和理想中的开源和不一样的地方。从数据到算力到模型都是Meta的一个团队完成的，社区没有任何的参与。社区基于LLaMA做了大量的工作，像Alpaca，Vicuna，llama.cpp等等，但这些工作都是衍生物，对于LLaMA1发展到LLaMA2基本没起到什么作用。反而是Alpaca这些工作在LLaMA2出来以后可以换个基座模型重新做一遍出一个Alpaca2。这样的开源似乎就是我做完了你们拿去玩吧的感觉，社区看似火热，但都没有对核心的基座模型产生太大的贡献。而对基座模型产生贡献的工作比如Group head attention，FlashAttention 2，ntk-aware scaled rope那种往往又都是通用的，即使没有LLaMA也可以在其他项目比如GPT2， gpt-neox上提出来的。

我甚至觉得应该有人发起一个开源项目就是做LLM的预训练数据，大家一起集中力量获取数据，清洗数据，做数据的质量控制。如果有这样的高质量数据集，每个训练LLM的机构都要去用，那社区才是真正为训练LLM起到了作用，这样的开源才更有价值。

### LLaMA2开源对于国内大模型竞争没有太大影响

LLaMA2最让我失望的一点是中文能力还是那么差。原来期望LLaMA2可以像GPT3.5或者GPT4那样用5%-10%的中文数据，换一个更加中文友好的tokenizer，在中文能力上接近GPT3.5。那种情况下，国内一众号称自己已经超越GPT3.5甚至号称超越了GPT4的模型才会面临真正的挑战，可以真刀真枪的比一比，而不是去刷榜。可惜，LLaMA2不争气啊。只能让国内的大模型在对比的时候加上一条显著超过LLaMA2。

另外，由于LLaMA2在预训练阶段基本没有什么改进，国内几个开源了7B、13B模型的公司连借鉴（chao）都没得借鉴（chao）。仔细看一眼LLaMA2的模型结构和LLaMA1是一模一样的，我们的模型也是一模一样的，那就这样吧。连code都不知道要改啥，训练30B+，60B+的模型的时候还能改个Group head attention，7B/13B真的没得改啊，本来就是一样的。至于多放高质量数据，早就知道了。至于SFT，国内玩得可能比LLaMA还溜多了，Meta不能用ChatGPT的数据，但我们可以啊，分分钟碾压LLaMA2，又多了一个可以PR的点。至于Safety嘛，可以抄一些用来PR，但一不能用来刷榜（可能还掉点），二不能真正解决国内的“安全”问题，就当个噱头吧。

最后，github上不少项目都是没太多资源从头开始用中文数据做预训练，准备用QLora做个微调，扩个中文词表，换个tokenizer做做中文增量预训练，都已经建好仓库、写好readme准备蹭个热度了。但这种项目也就蹭蹭热度而已，tokenizer中文不友好和中文数据过的少这两个根本问题基本上没法解决。做增量预训练如果要把中文数据都过一遍还要混大量英文的数据，真不一定比从头开始预训练省多少资源。所以，这种想偷懒来做LLaMA2汉化的，是肯定做不过从头开始预训练的。

### LLaMA2开源的积极影响

最后，LLaMA2开源当然还是有很多积极作用的。最重要的当然是商业友好的license。国内来看，因为LLaMA2中文能力不行，可能短期内影响不大。海外而言，很多中小企业可以用LLaMA2的模型来做私有化部署了，GPT3.5的能力可能已经可以解决不少问题了，再解决数据安全问题，让很多企业有了更安全的选项。然后是中小创业者，有了更可控的模型，可以从模型sft层面解决更多的问题。成本上没有自己算过自己部署LLaMA2和调用ChatGPT API（主要说的是turbo）的差别，感觉可能不会差的很多（不得不说OpenAI的推理优化还是很厉害的）。<strong>最后也是最期待的</strong>，OpenAI会不会为了竞争把ChatGPT3.5也直接开源了。之前已经说在某个时间节点会开源上一代了，感觉这个时间节点非常perfect。这样中国大模型生态才会产生巨大的变化。

### 写在最后

写完才发现全文都在写LLaMA2，而标题说的是开源模型。可能LLaMA2就是开源LLM最优秀的代表了吧。所以，基本所有对LLaMA2的看法放在开源LLM上都适用。总结一下就是开源LLM太贵，只有大厂开得起，开不开大厂说的算，社区几乎没有参与，无法缩小与OpenAI（闭源）的差距。

<strong>Update</strong>：

更新一个朋友团队不到1天finetune的中文LLaMA2，简单上手

在线Demo：[Llama 2 7B Chat - a Hugging Face Space by LinkSoul](https://link.zhihu.com/?target=https%3A//huggingface.co/spaces/LinkSoul/Chinese-Llama-2-7b)

模型仓库：[LinkSoul/Chinese-Llama-2-7b · Hugging Face](https://link.zhihu.com/?target=https%3A//huggingface.co/LinkSoul/Chinese-Llama-2-7b)

Github仓库：[https://github.com/LinkSoul-AI/Chinese-Llama-2-7b](https://link.zhihu.com/?target=https%3A//github.com/LinkSoul-AI/Chinese-Llama-2-7b)
