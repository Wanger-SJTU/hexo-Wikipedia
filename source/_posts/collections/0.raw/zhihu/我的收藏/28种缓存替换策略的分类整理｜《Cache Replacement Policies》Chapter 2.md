---
title: (2 条消息) 28种缓存替换策略的分类整理｜《Cache Replacement Policies》Chapter 2
date: "2021-07-15 00:00:00"
updated: "2021-07-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/28种缓存替换策略的分类整理-《Cache-Replacement-Policies》Chapter-2/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/387985644
---


本文译自《Cache Replacement Policies》（2019年）的第2章：“A Taxonomy of Cache Replacement Policies”。我也翻译了这本书的目录、摘要序言和第1章：

[Vortex：【目录与序言汉化】缓存替换策略《Cache Replacement Policies》](https://zhuanlan.zhihu.com/p/375889421)。

本文仅为个人翻译（意译为主，表述上可能无法完全还原原文），相关术语请以原文或已出版物中的翻译为准。

本文总结了这本书中介绍的各种缓存替换策略（cache replacement policy），首先将所有策略划分为了粗粒度和细粒度两类，然后再根据它们依据的不同局域性（locality）进一步的划分为了多个类，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0b7bb6cd157e.jpg)

图2.2：缓存替换策略的一种分类法。本文主要介绍该分类法的概念以及思路，对于上图中这些策略的进一步概述，以及相关论文的引用链接，可以在原书后续章节的正文中找到。

### 2 缓存替换策略的一种分类法（A Taxonomy of Cache Replacement Policies）

为了组织好这本书的结构，以及几十年间研究过的许多想法（idea），我们在这里提出了一个关于 缓存替换问题解决方案 的分类法（taxonomy）。这个分类法是建立在这样一个观察上的：

“缓存替换策略解决的是一个这样的预测问题，其目标是预测任何给定的缓存行（line）是否应当继续保留在缓存中。预测可能会随着时间的推移而失效，因此需要在缓存行的整个生命周期（lifetime）<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)上的多个不同时间点上进行重新评估（re-evaluate）。”

因此在我们的分类法中，我们会首先根据插入策略（insertion decision）<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)的粒度将缓存替换策略分为两大类：

对于第一类中的策略（我们称之为“粗粒度”策略），将任何行插入缓存中的时候，都会对它们进行相同的处理，并且仅依据它们驻留在缓存中时的表现来进行区别对待。例如一个行在缓存中驻留时，它的优先级可能会在它被重复使用（reused）的时候提高。

与之相对的第二类是细粒度策略，除观察行在缓存中的表现外，细粒度策略还会在行插入缓存中时就对它们进行区分。细粒度策略往往依赖于有关缓存访问行为（cache access behavior）的历史信息。例如，若细粒度策略了解到，某特定指令所加载的行在过去历史中更倾向于被驱逐而不是重用，则它插入时可能会被设置一个较低的优先级。

为更好地理解我们的分类法，大家可以注意到，缓存策略通常是通过将少量替换状态（replacement state）与每个缓存行相关联来实现的（图2.1）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ee9daa5f507a.jpg)

图2.1：在整个缓存行生命周期间，所执行的不同替换策略操作。

- 插入策略（Insertion Policy）：当新行被插入缓存后，缓存替换策略该如何初始化该行的替换状态（replacement state）？<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)
- 晋升策略（Promotion Policy）：当缓存行被命中后，缓存替换策略该如何更新它的替换状态？<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)
- 衰老策略（Aging Policy）：当一个与其相竞争的行（competing line）被插入或者晋升时，缓存替换策略该如何更新该行的替换状态？<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)
- 驱逐策略（Eviction Policy）：在给定固定数量的选项间，替换策略应该选择驱逐哪个缓存行？<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6)
从缓存行生命周期（lifetime）的角度上，我们可以看到粗粒度策略在插入时对所有缓存行的处理都是相同的，因此它们主要依赖的是巧妙的衰老和晋升策略，来操纵替换优先级。

与之相对的，细粒度策略则采用了更智能的插入策略。当然，细粒度策略也仍需要合适的衰老和晋升策略，因为并非所有行为都是能在插入时就预测到的。

现在我们来更详细地讨论这两个类。

### 2.1 粗粒度策略（Coarse-Grained Policies）

粗粒度策略在将缓存行插入缓存时，对任何行的处理都是相同的。它们主要是通过观察重用行为（reuse）来区分缓存友好行（cache-friendly line）和缓存厌恶行（cache-averse line）。

根据粗粒度策略用于区分缓存驻留行（cache-resident line）所使用的度量指标（metric），我们将粗粒度策略进一步地分为了三类：

- 第一类基于最近访问情况（recency of access）来对缓存行进行排序，绝大多数粗粒度策略都属于这一类。
- 第二类则是基于访问频率（frequency of access）来排序的。
- 第三类策略则会监视缓存随时间的行为变化，来动态地选定给定时间段上的最佳粗粒度策略。
<strong>基于临时性的策略（Recency-Based Policies）</strong>

**Recency：临时性/时间邻近性/（时间上）最近的一次，这里的意思是在时间上的邻近性，两个事件发生的时间间隔较短，则它们的临时性（recency）较高。临时性策略（Recency-Based Policies）根据每个缓存行在其生命周期内的最新引用（latest reference）来排序。为实现这种排序，临时性策略维护了一个概念性的临时性栈（conceptual recency stack），以提供各个行被引用的相对顺序。例如常见的LRU（最近最少使用）策略（及其变体）就会优先驱逐最近最少使用的行，而MRU（最近最多使用）则选择驱逐最近最多使用的行；其它策略则处于这两种策略中间。我们会在第3.1节（Section 3.1）中讨论这些策略。

随后，我们还根据它们在观察临时性行为（recency behavior）时，所采用的“生命周期”定义，对临时性策略进行了进一步的划分：

- 对于第一类策略，行被逐出时，就是它生命周期结束的时候。绝大多临时性策略都属于此类。我们会说，这种策略有着固定的生命周期（fixed lifetime）。
- 第二类策略引入了所谓暂存结构（temporary structure），用于暂存那些被逐出但重用距离（reuse distance）较长的行，从而给予了它们被缓存命中的再次机会。行被逐出后可能会被暂存在这种暂存结构中，因而它的生命周期并不会在被逐出时结束，或者说这种暂存结构将它的生命周期延长到了逐出之后（beyond eviction）。我们会说，这种缓存策略有着延长的生命周期（extended lifetime）。
基于频率的策略（Frequency-Based Policies）**

**Frequency：频率/发生率，这里的意思是某指定事件的发生频率，如缓存行被访问/再次使用的频率。频率性策略（Frequency-Based Policies）通过维护频率计数器（frequency counter）来对缓存行进行（基于频率的）排序。不同的替换策略会使用不同的策略来更新维护和解释这些频率计数器。例如，某些策略会单调地（monotonically）递增这些计数器值，而另一些则选择递减这些计数器值，即老化（age）。或者，某些策略会逐出频率最低的行，而另一些则选择逐出那些频率满足某些（事先定义的）标准的行。我们会在第3.2节（Section 3.2）中讨论一些具有代表性的解决方案。

混合策略（Hybrid Policies）**

实际情况中缓存的访问模式（access pattern）并不是固定的，因此混合策略会在几个预先确定好的粗粒度策略间进行动态选择，以适应程序执行中的变化（phase change）。特别是，混合策略会在评估期间（evaluation period）观察几个候选粗粒度策略的命中率，并基于此来预测最适合未来访问的粗粒度策略。

自适应策略的优点在于，它们可以帮助克服单粗粒度策略（individual Coarse-Grained policies）的反常情况（pathologies）。

在第3章中我们将看到，最新的混合策略是如何在不同插入优先级（insertion priority）的粗粒度策略间进行调整的。并且注意到，尽管插入优先级会随着时间的推移而改变，但这种策略仍是粗粒度的，因为在一个时间段内，所有的行都会被以相同的方式处理。

### 2.2 细粒度策略（Fine-Grained Policies）

细粒度策略会在插入行（至缓存）时就对它们进行区分。它们通过根据行之前的生命周期的信息来进行这些区分。例如，如果一个行在过去没受到任何命中，则可以以较低的优先级插入该行。

记录所有缓存行过去的行为是不可行的，因此细粒度策略通常会将行划分为多个团（groups of cache），然后以团为单位对这些行的缓存行为进行记录。例如，很多策略都会将，最后被相同加载指令（load）所访问的行合并在一个团中。

当然，所有细粒度策略都要考虑的一个因素是，在插入行时，用于区分这些团（group）的指标（metric）。我们根据所使用的指标将细粒度策略划分为了两大类：

- 基于分类的策略（Classification-Based Policies）会将每个团关联到2种可能的预测中的一种，即缓存友好（cache-friend）和缓存厌恶（cache-averse）。
- 基于重用距离的策略（Reuse Distance-Based Policies）则会试图预测每团缓存行的具体重用距离信息。
这两个类别可以分别作为谱系（spectrum）<span class="wikilink wikilink--missing" title="未导入的页面">7</span>(#ref_7)的两个末端的定义。其中处在谱系一端的策略仅有2个可能的预测值，而另一端的则有许多可能的预测值。很多策略都位于中间，例如具有4或8个可能的值。最后，我们还会在第三个类别下讨论Beckmann和Sanchez所提出的新指标 [Beckmann and Sanchez, 2017]。

<strong>基于分类的策略（Classification-Based Policies）</strong>

基于分类的策略将传入（缓存中的）行分为了两类：缓存友好行（cache-friendly line）和缓存厌恶行（cache-averse line）。它的主要思想是通过优先驱逐缓存厌恶行，来留下更多的空间给缓存友好行，因此缓存友好行的优先级要高于缓存厌恶行。然后才在缓存友好行间进行排序，通常是基于临时性（recency）的。

基于分类的策略在很多地方都被认为是最好的，因为①它们可以可以利用过去的长期历史行为在未来做出更明智的决策，②并且它们还能适应各种不同的缓存访问模式（access pattern）。我们将在4.2节（Section 4.2）中讨论这些策略。

<strong>基于重用距离的策略（Reuse Distance-Based Policies）</strong>

基于重用距离的策略能够预测传入（缓存中的）行的具体重用距离信息。并且超出预期重用距离未收到命中的行将被逐出缓存。

这些策略可以看作是临时性策略（Recency）或者频率性策略（Frequency）预测的变种，因为临时性或频率性策略，都是通过监测一个行在缓存中的重用行为，来隐含地估计重用距离的（分别是通过临时性和频率）。通过历史信息来对重用距离进行显示预测具有独特的优势与缺点，我们会在第4.1节（Section 4.1）中讨论。

### 2.3 设计考虑因素（Design Considerations）

替换策略的主要目标就是提高缓存的命中率（cache hit rate），许多设计因素（design factor）都能够有助于实现更高的命中率。我们在这里提及一下其中的三个因素：

- 粒度（Granularity）：在插入的时，缓存行时以什么粒度进行区分的？是所有缓存行都一视同仁，还是根据历史信息给它们分配不同的优先级？
- 历史（History）：替换策略在决策时利用了哪些，多少历史信息？
- 访问模式（Access Patterns）：替换策略对某些访问模式的针对性如何？它对访问模式的变化，或不同访问模式的混合是否、有多敏感？
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0b7bb6cd157e.jpg)

图2.2：缓存替换策略的一种分类法。图2.2完整地总结了我们的分类法，并显示了不同类别的替换策略是如何处理这些设计因素的。总的来说，图中越靠右的策略，所对应的粒度就越细，所使用的历史记录也更长，能够适应的访问模式也更广泛。

在细粒度预测缓存行为有多重要？我们可以通过观察最近的缓存替换锦标赛（2017）<span class="wikilink wikilink--missing" title="未导入的页面">8</span>(#ref_8)看出这点，在这场比赛中，前4名的解决方案都是细粒度的。细粒度的预测为最新的细粒度策略带来了两个优势：

首先，它们允许细粒度策略只将缓存空间专门提供给那些，最有可能通过缓存受益的缓存行；与之相比，粗粒度策略则更倾向于，重复地将缓存资源提供给那些不产生任何命中的行。

其次，它们还允许细粒度策略去动态地确定不同缓存行团（groups of lines）的访问模式（access pattern）；与之相比，粗粒度策略则假定整个缓存都遵循着统一的缓存访问模式，即无法区分缓存中不同区域的访问模式差异。

在细粒度策略中，细粒度策略的趋势是使用更长的历史信息 [Jain and Lin, 2016]，最新的细粒度策略就是从8倍于缓存尺寸（cache size）的历史记录中提取信息的（见第4章）。更长的历史记录使得策略能够检测到具有长时重用（long-term reuse）行为的缓存有好行，而不是被一长串中间的缓存厌恶访问序列所混淆。

### 参考

- [^](#ref_1_0)缓存行（cache line）的生命周期（lifetime）是指，从该行插入缓存开始，到被逐出缓存的这段时间。
- [^](#ref_2_0)下文中介绍了“插入策略”的概念。
- [^](#ref_3_0)原文：How does the replacement policy initialize the replacement state of a new line when it is inserted into the cache?
- [^](#ref_4_0)原文：How does the replacement policy update the replacement state of a line when it hits in the cache?
- [^](#ref_5_0)原文：How does the replacement policy update the replacement state of a line when a competing line is inserted or promoted?
- [^](#ref_6_0)原文：Given a fixed number of choices, which line does the replacement policy evict?
- [^](#ref_7_0)这个“谱系（spectrum）”的意思是，一系列方案所构成的一个谱图，然后，谱图两端是相对纯粹的方案，位于谱图中间的，则代表谱系两端方案的中间方案。
- [^](#ref_8_0)Cache Replacement Championship (2017)