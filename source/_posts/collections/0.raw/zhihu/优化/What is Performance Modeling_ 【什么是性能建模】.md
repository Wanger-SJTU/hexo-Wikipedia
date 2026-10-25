---
title: What is Performance Modeling? 【什么是性能建模】
date: "2021-05-22 00:00:00"
updated: "2021-05-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/What-is-Performance-Modeling_-【什么是性能建模】/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/374331876
---


之前简单整理了一些关于Performance Modeling的介绍，于是想着再整理整理放在知乎，希望可以帮助大家对Modeling有个基础的扫盲。

### 初识Performance Modeling

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_1887d64c4f7f.jpg)

传统Silicon生产设计制造流程在传统的设计流程中，Architects直接提供设计文档给到RTL Design然后进行下一步的RTL Coding。对于一些简单的ASIC还好，但是对于复杂的类似于目前的GPU/CPU，架构师们其实还需要一些验证手段来确保当前的架构设计是合理的，期望与能得到一个当下最优解。这个时候就需要Performance Modeling的介入了，帮助架构师做各种大小/带宽/延时的权衡，对比分析不同策略在各种benchmark下的性能表现。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_cebb9be13156.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0dc201302f64.jpg)

另一种生产设计流程的划分然后关于Modeling的准确度，可以根据需要，来设计满足需求的模型。其目的就是能够快速地得到不同架构配置下的性能结果，以帮助架构师在早期制定设计文档和一些架构的实现细节需求。

### Performance Modeling的工作职责

想要比较准确地了解一个岗位的工作内容，其实有一种很直接的方法，就是直接去看业界认可的大公司对这个岗位的招聘信息中的工作描述，这样就可以对这个岗位有一个直观并且准确的认识。这里我选取了老牌设计公司IBM和新兴设计公司Apple，完整的招聘信息可以直接点击下面链接去查看，当然也可以试着去投递: )

**

IBM CPU and System Performance Modeling Engineer**

Key member of the MicroProcessor and System design community responsible for delivering optimized future processor and system designs.

<strong>Develop cycle accurate microarchitectural models</strong> for early SW development and for HW validation.

Other responsibilities include workload performance counter and hardware trace analysis, RTL vs model <strong>correlation</strong>, pre- and post-silicon <strong>performance analysis and validation</strong>. Focus on key benchmarks and applications to drive experimentation and HW/SW optimization. Identify and propose solutions to HW/SW pinch points collaborating with key software and hardware design engineers.

Focus on continuous improvement of the modeling infrastructure and capabilities as well as the modeling process.

**

Apple Performance Modeling Architect**

§Collaborate with Platform Architecture, <strong>Microarchitecture</strong> and core software teams to document performance targets and details of interesting and important use cases

§Analyze workloads to identify <strong>performance bottlenecks</strong> and opportunities Perform self-guided performance simulation studies of design alternatives 

§<strong>Write and maintain</strong>features and sections of the <strong>architectural performance model</strong>

§<strong>Develop</strong>and implement C++ model and interface it to the different agent models and software simulation platforms 

§Develop tests to represent the use cases to run on the model 

§<strong>Correlate</strong> performance of the SOC RTL infrastructure with the C-model

**

从上面这两家对Performance Modeling Engineer的工作描述中可以找到下面这几个共通的关键词：

- Microarchitecture: 一般架构师其实主要就是Microarchitects, 所以一般也是针对微架构进行建模，虽然后面也会介绍到除了软件架构模型之外，还有算法模型/RTL模型/整体平台系统的模型，但是这些都属于比较小众的模型，主流用于Performance Modeling的还是ESL语言编写的微架构模型。
- Develop Model: 设计并且维护模型，这个算是本职主要工作，没有什么好说的，除非有些公司体系比较大分得比较细的话，有专门的Modeling Team和Performance Analysis Team，一个负责写模型，一个负责用模型做分析工作。
- Correlation: 其实就是对模型的校准，手段有和RTL Code或Silicon做对比分析，以调整模型使得两者结果接近，不过也要注意受否是设计问题，比如没有按照设计文档设计从而导致了结果的误差。这个误差范围当然是越小越好，这样架构师用模型做一些探索工作的时候，模型的结果才有说服力。不过即便有5%的误差，还是可以从一些趋势/结果上定位到架构的性能瓶颈的。
- Performance bottlenecks/analysis/validation: 除了写模型之外，还兼顾着用模型来跑一些应用和测试，来定位性能瓶颈，做性能分析相关工作，以帮助架构师分析架构的问题。

### 为什么需要Performance Modeling

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_4028550d7896.jpg)

LEGO ArchitectureWhy modeling?**

- Fast turn around time for changes than RTL
- Faster to write, much faster than simulation and emulation
- A golden model for both hardware and software designs
- Using simulation, debugging, verification, co-simulation, etc. to help ensure the SoC works with 1st-time success
- Software development can start much earlier in the design cycle, reduce time to market
那么为什么公司需要设立这么一个岗位，花费这么多资源去成立一个部门做Performance Modeling的工作呢？我这里用LEGO作为Modeling的近似类比，比如我要盖一栋大楼，想要在最初期阶段对我的构思有个大概的直观感受，那么我可以用乐高搭建这么一栋大楼，通过和现有大楼的乐高模型进行比对，可以很直观地模拟出最终大楼的一个效果。当然这里的模拟是很粗糙的，大楼的边缘甚至不是光滑的，材质甚至不是钢筋水泥的，但是可以大致看到大楼的结构，最终的一个效果呈现。说不定还可以做一些抗震测试，这样就避免了像赛格大厦建好之后发现存在晃动的问题。

大楼的CAD图纸有点类似于RTL，等CAD图纸画好去模拟那个周期是很长的，在很初期的阶段，我几个小时就可以把大楼用乐高砌好。类比到Performance Model，由于有前一个项目的各个模块的模型代码，直接可以复用或者做些小修改，所以得到可用的性能模型是很快的。并且由于是软件模型，所以改起来的速度特别快，改个数值或者再多写几行代码就好了。除此之外，软件模型的仿真速度也比Simulation和Emulation的速度快得多，并且在项目初期阶段压根就没有RTL Code来做仿真。

这个模型的受益者也不仅仅是架构师团队，RTL Designers可以用这个模型和他们所编写的RTL Code做测试比对，以验证RTL Code的正确性。除此之外他们可以用模型来进行co-simulation，就是用一部分的RTL模块替换模型中的相应模块，以进行整体系统的测试。然后软件团队可以早早地开始相关的设计工作，shift left以确保Silicon回来后芯片能够早些进入市场。

**

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_9d06bd2eba33.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_c28bd79d96e4.jpg)

这两张图是从*Cadence/Synopsys*那拿来的，可以看到目前EMU的速度也就50MHz这样，相对于软件模型的速度是完全不在一个数量级的。软件模型的仿真速度取决于模型的负责程度和模型运行机器的性能，但是速度起码是用MIPS单位，即Mega Instructions per second。

SituationSimulation SpeedModel20-1000 mipsFPGA20-200M cpsHardware accelerator1M cpsC executables translated from RTL1-10K cpsRTL20-100 cpsGate1 cps

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_1cdfbf89f56a.jpg)

SW团队可以早早介入上图体现了SW团队可以早早介入，除此之外，RTL DV Team还可以用模型来进行对比分析，以发现RTL中的BUG。

### Models for Different Kinds/Levels

其实Performance Modeling有可以有很多种类型，并且模拟的精确度等级也可以划分成很多种，但其实业界主要用到的是软件模型中的TLM模型。RTL模型虽然精确度高，但是仿真速度慢和周期长，所以不太适合用来做性能模型，除非是特别小型的项目。算法模型虽然速度特别快，但是得到的准确度不如TLM模型，一般适合特别前期的简单探索。然后TLM模型根据准确性也可以划分成3个Levels，业界普遍的是Cycle-accurate model。

*Architecture***

• Performance modeling

• Architecture exploration and trade-off

    • Throughput, delay, congestion, buffer size, etc.

**

*Software***

• Algorithmic model - functional/behavior

• <strong>Transaction Level Modeling (TLM)</strong>

```text
    • Programmer's view (PV) model - register-based, bus generic, untimed

    • Programmer's view model with timing (PV/T) - bus architecture with protocol, timing approximate
```


    • Cycle-accurate model

**

*Hardware***

• RTL: cycle-, bit-, and pin-accurate model

**

然后对于TLM建模所用到的语言，业界一般是C++和SystemC，这里就不展开说明了，有兴趣地可以Google一下。

### Languages for TLM Modeling**

High-Level Languages

```text
    • **High-level languages (C/C++)**

    • Scripting languages (Perl, Python, etc.)
```


        • For functional/behavior model only, no timing/clock

**

Electronic/Executable System-Level Languages (ESL)

    •Use open-source SystemC** kernel (http://www.systemc.org) and gcc instead of the licensed hardware simulator

    •Executable specifications: SystemC with master/slave and TLM libraries

    •Single language for both model and HDL: based on high-level language C++, grows downward by adding clocks, parallel execution scheduler, and sensitivity list to mimic the hardware simulation

    •Served as a glue mechanism for integrating different models

### Performance Modeling @ Intel

Intel对于性能建模推出过Intel® CoFluent™ Studio这套工具集，下面是一个简介和Intel员工对这个Tools的一些评价和使用这个工具得到的一些实际性的结果，有兴趣可以去Intel的相应网站进一步了解一下。其实*Cadence&Synopsys*也推出过一些SystemC的设计工具和软件，有兴趣可以去了解了解。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_d103c9f55afd.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_b9c0203f562a.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_414354ef14e6.jpg)

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_b6948e838329.jpg)

### 从事Performance Modeling能习得的技能

那么从事Performance Modeling能习得什么技能，成为一个怎样的专家呢?我们还可以从前面提到的招聘信息中一窥一二，我们可以看下Job Key Qualifications是否是我们想要发展的方向，这样也能对于自我的一个Career Path有一个初步的构想。关键词无非还是micro-architecture/programming languages/team work/performance benchmarks，意味着你可以了解复杂芯片的微架构，懂得C++/SystemC这种底层语言的编写方法，有很好的团队沟通合作能力以应付跨团队的合作，知道用一些Benchmarks来测试分析架构。

**

IBM CPU and System Performance Modeling Engineer**

The candidate will have previous experience designing, modeling, analyzing, tuning new <strong>microarchitectures</strong>and ISA features for the core, uncore, and/or chip models across a suite of workloads. 

Server microprocessor design experience preferred. Modern <strong>programming languages</strong> and software development experience preferred. Familiarity with POWER ISA preferred. 

Ability to work in a team, <strong>network with people</strong> outside of the team and effectively communicate in written and verbal presentations is essential.

**

Apple Performance Modeling Architect**

§Strong SoC architecture knowledge, <strong>micro-architecture</strong> knowledge, and an understanding of competing architectures

§Experience working in a performance modeling environment

§Strong knowledge and proficiency in software development in <strong>C/C++</strong>

§Proficient in scripting languages such as Perl and Python

§Ability to conduct experiments in all phases of design, gathering and analyzing data; and to utilize

§Scripting/spreadsheet to document and present results

§Knowledge and experience with common <strong>performance benchmarks and workloads</strong>

以上就是对Performance Modeling的一个Brief Introduction，因为目前的工作方向不再是Modeling了，所以也算是对过去工作的一个简单描述吧。随着现在silicon的规模越来越大，内部行为越来越复杂，其实Performance Modeling这个岗位越来越重要，目前很多国内外的芯片初创公司都有设立这样一个岗位，还是很有发展前景的。

从事Performance Modeling未来的发展方向，如果走Silicon这条路，可以去做Architects/RTL Designer/DV/PV/EMU，如果走SW这条路，可以去互联网公司/云服务提供商做底层的性能分析和优化/硬件选型分析等等，其实还是很广阔的。当然，也可以专注在Performance Modeling这个Domain，成为这个领域的大牛，也是特别吃香的。

参考资料【References】

> Faster Product Design through IT Innovation
Optimizing pre-silicon software development
Unified Modeling in C++ & SystemC
FPGA Prototyping Techniques
Design and Validate Microarchitecture with Intel® CoFluent™ Studio
