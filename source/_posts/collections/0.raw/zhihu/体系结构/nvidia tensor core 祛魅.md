---
title: nvidia tensor core 祛魅
date: "2025-10-26 00:00:00"
updated: "2025-10-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/nvidia-tensor-core-祛魅-cdea43/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1940518023904601791
---


### 先说最重要的可取之处：

$&#x8FD9;&#x4E2A;&#x7279;&#x6027;&#x53EF;&#x4EE5;&#x8BA9;&#x5F02;&#x6B65;&#x7F16;&#x7A0B;&#x7684;&#x590D;&#x6742;&#x5EA6;&#x964D;&#x4F4E;&#x975E;&#x5E38;&#x5927;&#x3002;&#x4E5F;&#x662F;&#x6211;&#x4E2A;&#x4EBA;&#x89C9;&#x5F97;&#x662F;tcgen05&#x4E0A;&#x6700;&#x597D;&#x7684;&#x8BBE;&#x8BA1;&#x3002;" role="presentation">这个特性可以让异步编程的复杂度降低非常大。也是我个人觉得是tcgen05上最好的设计。\color{red}{这个特性可以让异步编程的复杂度降低非常大。也是我个人觉得是tcgen05上最好的设计。} $

$- tcgen05&#x8BBE;&#x8BA1;&#x4E2D;&#x7684;alloc/dealloc&#x673A;&#x5236;&#xFF1A;" role="presentation">tcgen05设计中的alloc/dealloc机制：\color{red}{tcgen05 设计中的alloc/dealloc 机制：} $

$- &#x964D;&#x4F4E;&#x591A;&#x7EBF;&#x7A0B;&#x5E76;&#x884C;&#x5BF9;tmem&#x7684;&#x7BA1;&#x7406;&#x6210;&#x672C;&#xFF0C;&#x901A;&#x8FC7;alloc/dealloc&#x5B9E;&#x73B0;&#x7C7B;cache&#x7684;&#x529F;&#x80FD;" role="presentation">降低多线程并行对tmem的管理成本，通过alloc/dealloc实现类cache的功能\color{green}{降低多线程并行对tmem的管理成本，通过alloc/dealloc 实现类cache的功能} 。$
$- 通过alloc/dealloc 的模式管理内存， &#x53EF;&#x4EE5;&#x5728;&#x786C;&#x4EF6;&#x5185;&#x90E8;&#x5B9E;&#x73B0;&#x7C7B;scoreboard&#x7684;&#x4F9D;&#x8D56;&#x68C0;&#x67E5;&#x6A21;&#x5F0F;" role="presentation">可以在硬件内部实现类scoreboard的依赖检查模式\color{green}{可以在硬件内部实现类scoreboard 的依赖检查模式} ，可以实现数据依赖检查和越界检查， &#x4E0D;&#x7528;&#x7528;&#x6237;&#x624B;&#x52A8;&#x6307;&#x5B9A;&#x4F9D;&#x8D56;&#x5173;&#x7CFB;" role="presentation">不用用户手动指定依赖关系\color{red}{不用用户手动指定依赖关系} 。 &#x8FD9;&#x4E2A;&#x975E;&#x5E38;&#x91CD;&#x8981;" role="presentation">这个非常重要\color{red}{这个非常重要} ，这个特性最起码可以将 当前npu采用的异步编程代码量减少 , 或者更多。$


### 总结：

上篇文档中，也介绍了我对 simt 和 simd 的理解。这篇文档想重点介绍一下，nv 的 tensor core 的编程方式。 也给大家祛祛魅,  让大家对nvidia 遇到的核心困难有一些更加直观的理解。

*tensor core 从nv 的 votal 架构就开始引入了。 具体的 细节我就不一一介绍了，知乎上有很多很多 朋友已经对各种架构和细节 进行了很详细的介绍。我这里只描述一些核心的内容，如果大家对一些实现细节有兴趣的话，可以去看 很多朋友对每代架构的详细介绍。*

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e86f62313a60.jpg)

$特性对比&#x6211;&#x8FD9;&#x91CC;&#x5148;&#x7EDF;&#x4E00;&#x6C47;&#x603B;&#x4E00;&#x4E9B;&#x8BBE;&#x8BA1;&#x4F7F;&#x7528;&#x75DB;&#x70B9;&#xFF0C;&#x5927;&#x5BB6;&#x53EF;&#x4EE5;&#x4ED4;&#x7EC6;&#x770B;&#x770B;&#x540E;&#x7EED;&#x7684;&#x4ECB;&#x7ECD;&#xFF1A;" role="presentation">我这里先统一汇总一些设计使用痛点，大家可以仔细看看后续的介绍：\color{red}{我这里先统一汇总一些设计使用痛点，大家可以仔细看看后续的介绍：} $

#### tma 小shape性能瓶颈：

$- tma 引入tile的数据搬运， &#x4F46;&#x672C;&#x8EAB;tile&#x7684;&#x63CF;&#x8FF0;&#x5C31;&#x9700;&#x8981;&#x5F88;&#x591A;&#x4FE1;&#x606F;" role="presentation">但本身tile的描述就需要很多信息\color{red}{但本身tile的描述就需要很多信息} ，nv为了解决这个问题，增加了 bulk.tensor 类指令。 &#x4F46;&#x5B83;&#x9700;&#x8981;&#x5403;&#x4E00;&#x4E2A;gm&#x4E0A;&#x7684;tensorMap&#x63CF;&#x8FF0;&#x7B26;&#x6307;&#x9488;" role="presentation">但它需要吃一个gm上的tensorMap描述符指针\color{red}{但它需要吃一个gm上的tensorMap描述符指针} 。这一个异步通路的加载， &#x5C31;&#x9700;&#x8981;&#x51E0;&#x767E;&#x4E2A;cycle" role="presentation">就需要几百个cycle\color{red}{就需要几百个cycle} 。$
- <strong>创建这个描述符太慢了，nv 居然推荐大家在host上描述符构建好，通过传参传进来</strong>
- 为了解决描述符的动态性，增加了一堆修改描述符的指令 tensormap.replace. 这个指令还是去修改 gm&#x4E0A;&#x7684;&#x5185;&#x5BB9;" role="presentation">gm上的内容\color{red}{gm上的内容} 。就算可以cache住，但这个<strong>开销也要上百cycle的</strong>

#### tcgen05 编程复杂和simt割裂：

$- &#x5F02;&#x6B65;+&#x4E71;&#x5E8F;&#x7684;&#x6307;&#x4EE4;&#x5E8F;&#x5185;&#x5B58;&#x5E8F;" role="presentation">异步+乱序的指令序内存序\color{red}{异步+乱序的指令序内存序} 。这个复杂度已经很高了。而且性能好，还需要排多个thread 之间的流水，编程复杂度大大提高。$
$- 为了适配输出tensor可以在register_file上， &#x5F15;&#x5165;&#x4E86;&#x5F88;&#x591A;&#x5206;&#x578B;layout" role="presentation">引入了很多分型layout\color{red}{引入了很多分型layout} ，又复杂又麻烦。**$
- 混杂 \color{red}{线程粒度指令} 和 \color{red}{warp} \color{blue}{warp\_group} 粒度指令，<strong>编程难度</strong>又进一步提高。
- 为了将shared_memory 和 tmem 进一步复用，<strong>引入了CTA-pair 的联合matrix计算能力</strong>。 \color{red}{但这个cta\_pair 需要将两个sm分为主和从} ，而且在一个tcgen05指令流里面需要保持cta-pair数量不变。这个编程难度 和定制npu 没啥两样了。

#### 异步指令的sync 性能瓶颈：

- 为了让异步指令可以进行sync， \color{red}{采用shared\_memory上的atomic实现sync} ，但这个频繁对内存的操作，<strong>延迟也是很大的</strong>[单次读shared_memory 30个cycle].

#### tcgen05 独立性：

nv 的tcgen05 已经是将tensor_core 变成一个独立的编程单元了<strong>。但为了可以和simt 的指令流混在一起，</strong>又强加的增加到simt的编程语义中。**

*<strong>我们对比看看simt的编程语义和 tcgen05 的编程语义：</strong>*

编程单元执行数序同步异步编程粒度smit顺序执行强内存序同步iothread 粒度tcgen05乱序执行弱内存序异步io混合粒度\color{red}{要不是nv的股票价格太高了，我感觉，很快就有nv的人出来，搞个初创工作，搞simd[v + m] + smt 的方案了} 


### 下文会对一些细节，进行详细的介绍。

### 数据通路：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ad5c32b26741.jpg)

来源：SemiAnalysis首先看这个数据通路的变化。从这个tensor_core 的数据通路变化上看，其实可能很清楚的看出，面对过大的寄存器压力，和延迟的需求，nv 也解决不了了。从而选择和 市面上绝大多数 npu 厂商一样的路线。引入独立的memory 空间，专门为 tensor_core 供数。这里特别讲一下 blackwell 架构中 tensor_memory 的设计。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_422fec86e1e6.jpg)

来源：SemiAnalysis [增加了图上红色的通道]

- \color{blue}{256K 的tensor-memory 容量} 这个容量在当前这个年代，确实不大**。 \color{red}{我很怀疑下一代架构上，这个tensor-memory 的容量还会翻倍}  为了能让用户更好的复用存储空间，将feature 和 output 都挤在同一个内存空间。但同时也引入了别的问题：

- <strong>为了让tensor_memory 性能更好</strong>，选择了2r1w的 sram 搭建的 tensor-memory，因为 要做D矩阵的累加，必须从 tmem 多加一个口， \color{red}{也就没法让 weight 也保存在tensor-memory上了} 。
- <strong>为了提升 A矩阵的加载速度</strong>，增加了 *<strong>special cache</strong>*放到A 的加载通路上，但没有一手资料，不了解内部设计的细节， \color{blue}{为什么把 special-cache 放到了 A通路上，而不是B 通路上。} 我怀疑很大可能是在Hopper架构上，为了 tensor_core 的性能，已经加强多 B 通路的性能了，所以没有顾及B通路。 \color{red}{但这种决策，其实内部就是排脑袋定的，没必要过多粉饰} 

- <strong>cta-pair 引入的 sm 点对点通信链路:</strong>

- 从下图 blackwell 单tpc 内部的die-shot看，实际上两个 sm 之间的距离并不短，如果想要做sm tensor_memory 之间数据广播的话，延迟也比较大， 因为找不到金属层的图片，不好评估 两个sm 之间是怎么连线的，就姑且按照register 访问 shared_memory 的30cycle来评估吧 。 \color{blue}{[但肯定比 dsm 性能是好的Distributed\ shared\ memory]} [https://arxiv.org/html/2501.12084v1](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2501.12084v1)  详细性能可以看这个文章。我这里只列举一些我关心的数据：
是否相同sm访问方向延迟「cycles」相同register_file  shared_memory 本地路径29相同register_file  shared_memory dsm路径33不同register_file  shared_memory dsm路径184-213

- \color{red}{那为什么还要支持这个功能吗？} 还是片内sram 太小了，让两个sm 的sram 可以一起使用，来提升存储的复用。 \color{red}{但这种设计真的好吗？} \color{blue}{和大家吹捧的 simt 天差地别啊。完全不是一个编程思路了。} 
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5a54e085b4dd.jpg)

Layout by @Kurnal

### TMA  的设计：

本质上tma 就是一个dma 单元。只不过他内部有 Addr Gen 单元，可以生成多维tensor的address，从而一笔配置，将一个tensor的一个tile块搬运到 shared_memory上。

- \color{red}{为什么要增加这个支持？} 

- 对一个tensor 的部分tile 进行搬运的时候，需要一个 shape 和 stride，构造多重循环来将tile块，正确的搬运到shared_memory上，但这个过程中，循环的处理，偏移地址的自增，都需要cpu资源的开销，从而引入了和很多很多npu 一样的设计， \color{red}{那就加个dma吧} ，可以帮我把地址计算和数据搬运一次都做完。

- \color{red}{效率如何?} 

- 从 nvidia 的 ptx 就能看到，nvidia 为了支持这个功能， \color{red}{引入了tensorMap} , 一块存储在外存上的 128B 指针<strong>。 \color{red}{同时为了支持动态性，又增加了若干条修改 tensorMap 的指令} 。</strong>就这一个设计，大家还觉得牛吗**？想想就难用的要死， 我要做一个tensor 的搬运和tiling,  还需要在host 上把描述符算好，通过launch kernel 传到kernel 里面，是不是又和 hw的动态shape tiling分离和相似了。
- \color{green}{为什么不用寄存器来实现这个功能呢？} 128B 也就是32个32bits 的寄存器。太多了，如果引入寄存器的话，对simd 的影响太大了。
- 相比 tcgen5 mma 中的 a-desc， b-desc, idesc 三个描述符寄存器，设计也就那么回事。 和 npu 一样的玩法。

- \color{red}{好用吗？} 

- 静态shape 做静态tiling，每个core，做相对独立的工作还可以，但<strong>动态场景下，需要修改 tensorMap 的时候</strong>，性能肯定堪忧[拍脑袋想的，没有实测过]。
- \color{red}{同样引入了异步编程} ，别看官网的图画的挺好看的，但实际用起来，复杂度很高。

- \color{red}{为什么一定要搞成这样？} 

- <strong>为了降低 hopper 架构下，Gen addr 的开销。 引入的tma</strong>
- 一个tensor的搬运，时间太长，那就<strong>加上异步编程</strong>，<strong>让用户来隐藏时间开销。</strong>
- 为什么一个sm 只搞一个tma。<strong>为啥不能多搞几个？</strong> tma 不光是gen addr，为了让性能更好，还需要增加大的rob，面积开销还是不小的。
- <strong>配置太多了，那就存在内存上吧。</strong>

\color{red}{大家看看这几点细节，和我们看的市面上的 npu 几乎是没区别的。} 


### tcgen05 的设计：

实话实说，我看tcgen05 的设计细节，大部分我是没感觉到亮眼的地方，和国内npu 厂商的思考都是一样的。

#### 改动点：

- \color{red}{最让我感觉到冲击的地方:} 

- \color{red}{引入了tmem的 alloc/dealloc} . 这个引入大家可能看起来很简单，但alloc/dealloc 的引入，大大降低了 tensor_memory 的管理问题。虽然tmem 是一个内存，但增加了alloc/dealloc 之后，就拥有了类似cache的管理模式， \color{red}{同时还能解决数据依赖问题，也能进行地址越界检查} 。 \color{blue}{确实是一个开创性的设计。 } 

- \color{red}{增加了一系列的矩阵乘随路操作} 。但为了实现高性能的随路 scale，也增加了很多很多的分形和排列方式。这个复杂度，和npu也没什么区别了。
- 为了支持多种计算配置， \color{red}{增加了 a\_desc/b\_desc/i\_desc 三个描述符} 。 这3个描述符[ptx *Matrix Descriptors*** 章节]，都必须来自寄存器，而且描述符不是简单的一个32位数字，而是不同位域，不同含义。动态场景下，光启动一个tcgen05.mma， \color{red}{前序的 描述符填充，消耗的标量cycle也是不可忽略的} 。
- \color{red}{增加了tmem} ，为了降低寄存器的压力，同时提升matrix 的供数能力，但这种跨sram 的数据搬运，耗时也不少，<strong>也是一系列异步指令</strong>。
- \color{red}{编程不再只是wrap 粒度的了} 。而是单thread 就能触发matrix 工作，可以通过多个thread 并行调度matrix来打满算力。
- 但因为 \color{red}{无法摆脱simt的 线程设计粒度} ，如果matrix 计算完，还是需要将 输出tensor 按照C维度拆分到一个sm 上的多个wrap 上的 thread上。
\color{red}{从整体上看，tcgen05 的编程方式，和simt还是脱节的。 但确实已经比前几代芯片好很多了。} 

#### 原因：

- 前几代芯片， \color{red}{输入tensor 都还是需要从register_file来的} ，但register_file 是分拆到多个wrap 的多个 thread 上的。所以要进行matrix 计算，必须多个warp 一起操作。
- tcgen05 这一代芯片， \color{red}{单个 sm 内部，matrix 的输入直接从shared\_memory来} 。 而不再依赖 register_file，多起码在输入上，可以抛开 warp，单个线程启动matrix
- 但无论如何，因为有 \color{red}{simt 这种线程粒度的编程} ，matrix 的结果，还是需要退回到线程粒度，进行后续操作。而这引入的分形编程难度，又是很大的。

### 异步编程接口：

这一节，我会详细介绍nvidia tcgen05 引入了哪些 异步编程接口，和对应的同步方式。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_aa9466632904.jpg)

tcgen05 指令汇总首先tcgen05 的异步编程方式和相关的内存一致性的问题**，都可以在 ptx 中的 

#tcgen05-memory-consistency-model 章节找到


不同tcgen05 指令又分为两种：

- <strong>流水线 tcgen05 指令</strong>
- <strong>专门的 tcgen05 特定的线程间同步机制</strong>

#### 指令分类

而<strong>不同指令的行为也不一样</strong>，有的是<strong>同步指令</strong>，有的是<strong>异步指令</strong>。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_607304432615.jpg)

category of each of the tcgen05 instruction
#### 发射类型

不同指令的发射类型也不一样的，如下图：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_69b9f75966f4.jpg)

指令执行粒度从表格上看，大家也能看出来，<strong>不同的指令</strong>，有的是 \color{red}{线程粒度} ，有的是 \color{red}{warp粒度} 。<strong>也是很麻烦</strong>。

#### 同步编程pattern

这些复杂的异步编程方式，又引申出多个pattern来让用户理解，<strong>乱序 + 并行异步引入的各种内存一致性问题</strong>。

*同线程的数据依赖可以组成 [Pipelined tcgen05 Instructions] 不需要显式同步，但给simt register 时候，又需要同步一下。*

<strong>一共分为以下五种同步pattern: 这5中pattern 在ptx中都是 demo</strong>tcgen05-memory-consistency-model-canonical-sync-patterns <strong>具体的demo 我就不粘贴了，感兴趣可以去看看。</strong>

- <strong>流水线指令，相同线程</strong>

- \color{blue}{按照编程顺序执行} 

- <strong>非流水线指令，相同线程</strong>

- \color{blue}{指令会乱序异步，必须通过 wait 来保证内存依赖关系} 

- <strong>流水线指令，不同线程</strong>

- \color{blue}{如果需要依赖关系的话，需要显式的同步操作} 

- <strong>非流水线指令，不同线程</strong>

- \color{blue}{必须明确指定依赖关系} 

- <strong>寄存器依赖，相同线程</strong>

- \color{blue}{寄存器依赖优先级最高，ld 需要强制增加wait:ld}
