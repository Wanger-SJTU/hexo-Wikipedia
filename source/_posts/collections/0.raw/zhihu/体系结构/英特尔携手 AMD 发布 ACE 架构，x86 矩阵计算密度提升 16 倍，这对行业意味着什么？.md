---
title: 英特尔携手 AMD 发布 ACE 架构，x86 矩阵计算密度提升 16 倍，这对行业意味着什么？
date: "2026-05-17 00:00:00"
updated: "2026-05-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/英特尔携手-AMD-发布-ACE-架构,x86-矩阵计算密度提升-16-倍,这对行业意味着什么/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/2033219016886589368/answer/2039315084518875316
---


当英特尔和AMD坐下来一起写指令集，ACE的16倍从哪来，能改变什么？
4月28号，英特尔和AMD联合发了一份白皮书，标题叫”AI Compute Extensions for x86”，简称ACE。这份文档11个作者签名，8个来自AMD，3个来自英特尔，由x86生态系统咨询小组（EAG）背书，把ACE定义为”x86架构的标准矩阵加速方案”。核心卖点一条：在消耗相同数量输入向量的前提下，ACE外积运算的计算密度比AVX10乘累加操作高16倍。

知乎上关于ACE没什么人讨论。这16倍到底怎么算出来的？为什么是外积而不是内积？它跟ARM的SME2、IBM POWER10的MMA、RISC-V正在讨论的三套矩阵扩展有什么关系？对实际AI工作负载又意味着什么？这些问题的答案散落在白皮书、学术论文和行业数据里，需要串起来看。

从AVX到ACE，X86向量扩展的进化历程
x86处理向量运算的历史可以追溯到1999年的SSE，此后经历SSE2、AVX、AVX2、AVX-512，向量宽度从128位一路扩展到512位。AVX10是EAG在2024年确定的标准向量扩展，统一了Intel和AMD各自的向量实现，保证从笔记本到服务器都能用上512位的ZMM寄存器。

![](https://picx.zhimg.com/v2-8a0734ab391b882f6b92332ec9c182be_r.jpg?source=2c26e567)但SIMD有个根本性的数学瓶颈。一条AVX10的512位向量在做INT8乘累加时，把512位当成64个8位元素的行向量，两个行向量做点积，一次产生64个乘法结果。这就是内积（dot product）的局限：一维数据，一维计算，吞吐量线性增长。

ACE换了个思路。它同样消耗两个512位的ZMM寄存器，但把每个寄存器解释为16×4的输入矩阵，然后做外积运算（outer product）。16行的A矩阵乘以4列的B矩阵转置，产生16×4=64对向量的内积，每组内积又是4次乘加，总计256个新的乘积，加上累加到16×16的Tile寄存器中的已有数据，一条指令完成了1024次INT8乘法。AVX10做64次，ACE做1024次，1024÷64=16。这就是白皮书中”16倍计算密度”的来源，数学上完全站得住。

![](https://pica.zhimg.com/v2-087a4606c78586822484428c5d916c0f_r.jpg?source=2c26e567)外积运算并非ACE首创。1997年Van de Geijn和Watts在CONCURRENCY期刊发表的SUMMA算法就提出了用外积分解做并行矩阵乘法的思路。IBM在2021年发布的POWER10处理器率先将外积矩阵加速（MMA）商用化，根据CUTEv2论文的测试数据，单核INT8峰值约2 TOPS @ 4 GHz。ARM的SME/SME2同样基于外积，苹果M4的SME引擎提供了可观的INT8算力。学术界，中科院计算所的CUTEv2论文（DAC 2026）在四种开源CPU RTL上验证了统一的矩阵扩展架构，外积同样是核心算法。ACE的16倍不是凭空出现的数字，而是x86阵营补上了其他架构几年前就已经走通的路。

硬件层面的具体设计
白皮书披露了几组关键参数。

8个Tile寄存器，每个宽512位×16行，总计1024字节，用`__tile1024i`内建类型表示。1个Block Scale寄存器，宽1024位，存储OCP MX格式的块级缩放因子。所有Tile寄存器复用AMX框架的编程模型和OS上下文切换机制，换句话说操作系统层面几乎不用动。

ACE的核心内建函数是`__tile_top4bssd`，接收两个`__m512i`输入和一个Tile目标寄存器，完成INT8外积累加。此外还有`__tile_zero`清零、`__tile_movrow`从Tile中提取一行到ZMM寄存器。一个新的解压指令`VUNPACKB`，能把2到7位的压缩数据解到8位通道，支持偏移和符号扩展，用途不限于AI，对存储带宽敏感的场景都适用。

有意思的是调度模型的设计。白皮书明确说ACE操作的调度开销与AVX10的MAC操作”没有本质区别”，两个输入一个目的，乱序执行引擎看到的模板一样。换句话说，对CPU前端而言，ACE就是AVX10引擎里多了一个功能单元。这种设计让外积运算融入了现有的流水线调度逻辑，不需要特殊的指令调度策略。

另一个精妙之处是Tile寄存器与AVX10向量寄存器文件之间的数据搬运。现代乱序执行CPU在物理寄存器文件上投入了巨大的版图面积，往往几百个物理寄存器。ACE的输入直接复用这些ZMM寄存器，Tile寄存器专门做累加，两者之间的数据通路高效而灵活。这比IBM MMA和部分RISC-V方案中矩阵和向量争用同一组寄存器要好，避免了结构性冒险。

新引入的数据格式 OCP MX
ACE原生支持INT8、OCP FP8、OCP MXFP8、OCP MXINT8和BF16这几种AI数据格式。前面几种不需要多解释，OCP MX这一族值得展开讲讲。

OCP MX（Microscaling）是Open Compute Project定义的块级缩放格式。思路不复杂：让一组相邻的数值共享同一个指数（scale factor），每个元素只存窄位宽的尾数。拿MXFP8举例，每32个元素共享一个UE8M0格式的8位缩放因子，单个元素只需存FP8的E4M3或E5M2。相比逐元素量化，块级缩放把存储砍到原来的几分之一，同时保留了更合理的动态范围。

ACE在硬件上直接支持OCP MX的inline scaling，Block Scale寄存器存缩放因子，指令编码中独立寻址缩放组。矩阵乘法运行时缩放因子的应用融入了计算流水线，不需要软件单独跑量化/反量化循环。白皮书给出了一个关键数据：使用4×2 Tile分块（8个Tile全部用上，输出窗口64×32），有效向量加载需求从单Tile的2.0 loads/OP降到0.75 loads/OP，向量加载减少62.5%。算力提升了，内存带宽压力也跟着降了。

![](https://pic1.zhimg.com/v2-851339e9ad5c919c3ba8a8594d412aa6_r.jpg?source=2c26e567)Google DeepMind在ISCA 2025发表的LIA论文（[DOI:10.1145⁄3695053.3731092](https://link.zhihu.com/?target=https%3A//dl.acm.org/doi/10.1145/3695053.3731092)）提供了一个很有意思的视角：在Sapphire Rapids和Granite Rapids上，AMX最大的瓶颈不是计算吞吐，而是内存带宽。LIA框架通过CXL让CPU和GPU协作推理，用CPU的AMX引擎分担部分计算来减轻GPU的内存压力。ACE的Tile分块优化正好在解决同一个问题，只不过是在指令集层面直接做了。读白皮书时我最惊讶的就是这个0.75 loads/OP的数字，说明ACE的设计者对CPU推理的带宽瓶颈有非常清醒的认识。

CPU做AI推理的现实困境
The Register在2024年底做过一个很有说服力的分析。Google用176个vCPU的C3实例（Sapphire Rapids，AMX开启）跑Llama 2 7B，batch size 6，每秒大约230个token。月费5464美元，换算下来每百万token约9美元。拿NVIDIA L40S做参照，同一模型batch size 6时250 token/s、月费1226美元，每百万token约1.87美元；batch size拉到16时500 token/s，单价降到0.93美元。CPU的token单价是GPU的5到10倍，账面上确实不好看。

但这个账不能只这么算。Intel Granite Rapids Xeon 6用12通道8800MT/s MRDIMM，内存带宽达到844 GB/s，已经接近L40S的带宽水平（[The Register报道](https://link.zhihu.com/?target=https%3A//www.theregister.com/2024/10/29/the-economics-of-cpu-based-ai-arent-great/276524)）。

不过这里有个做推理优化的人都心知肚明的事实：LLM推理真正卡脖子的不是算力，是内存带宽。模型参数量大、计算密度低，每个token生成都要把整个模型从内存搬一遍。所以Granite Rapids靠12通道MRDIMM把带宽撑到844 GB/s这件事意义重大，这个数字跟L40S已经是一个量级了。带宽追上了，推理性能的差距也就没有想象中那么悬殊。

![](https://picx.zhimg.com/v2-54de8b213638bdc3595386fcfedb27df_r.jpg?source=2c26e567)还有一个经常被忽略的角度：很多企业内部的AI场景，并发量低得可怜。内部文档检索、代码补全、智能客服，几个人同时用就算高峰了。这种场景买张10万元的GPU放那儿，利用率不到5%，CPU呢反正也要买，闲着也是闲着。瑞银2026年的研报给了一个很有说服力的数据：全球服务器CPU市场从300亿美元增长到2030年的1700亿美元。更值得注意的是CPU和GPU在AI服务器中的配比变化，正在从8:1转向1:1。换句话说，以前建AI服务器配一颗CPU就行，现在基本是一颗CPU配一颗GPU了。

还有一个被低估的角度：Agentic AI的崛起。AI Agent跟单纯的LLM推理不同，它需要大量串行化的逻辑判断、工具调用、上下文管理。这种workload的特征是复杂的控制流而非密集的矩阵运算，CPU的大核设计、分支预测和低延迟响应正好匹配。Intel社区有文章专门讨论了Xeon 6在Agentic AI场景下的”乘数效应”：每个Agent独立推理、Agent间消息交换又触发推理，总推理次数远超单次LLM调用（[Intel Blog](https://link.zhihu.com/?target=https%3A//community.intel.com/t5/Blogs/Tech-Innovation/Cloud/Intel-Xeon-6-Processors-Power-Superior-Agentic-AI-Performance/post/1744473)）。

ARM、RISC-V和x86，三家不同的矩阵扩展路线
ACE面临的竞争并不轻松。ARM的SME2已经在消费设备上落地，RISC-V那边三套矩阵扩展提案并行推进，x86这边算是后来者。

ARM SME2在ARMv9.3-A中引入，ZA Array二维矩阵寄存器（如512×512位），支持外积、多向量指令、2:4结构化稀疏和查表加速。苹果从M4开始支持SME，vivo在旗舰手机上用SME2跑端侧大模型，交互响应时间缩短约40%（[ARM SME2技术解析](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/gccbuaa/p/19576677)）。ARM计划到2030年为超过30亿台设备新增100亿TOPS算力。ARM的优势在于能效和移动端覆盖率，从手机到笔电到云服务器，统一的ISA让软件栈可以在不同设备间无缝迁移。

RISC-V这边更热闹。目前有三套矩阵扩展提案在并行推进：IME（Integrated Matrix Extension）复用向量寄存器做累加，VME（Vector Matrix Extension）引入专用累加寄存器，AME（Attached Matrix Extension）完全解耦矩阵单元和向量流水线。中科院计算所的CUTEv2论文验证了在Rocket、BOOM、香山等开源CPU上集成矩阵扩展的可行性，4 TOPS @ 2 GHz的矩阵单元在14nm工艺下仅占0.53 mm²版图面积，在ResNet/BERT/Llama3上对比Xeon 8580实现了1.57到2.31倍加速（[arxiv.org/html/2604.11615v1](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2604.11615v1)）。RISC-V的优势是开放性和可配置性，但IME、VME、AME三套标准并行推进本身就是碎片化的前兆，开源社区在标准统一上未必比商业公司更高效。

![](https://pic1.zhimg.com/v2-5bc7c02e076fc56ba34aee7606bd111a_r.jpg?source=2c26e567)这里有必要补充一点背景。ACE不是凭空造出来的新东西，它是AMX框架下的一个迭代。现有的AMX已经在Sapphire Rapids和Granite Rapids上通过TMUL（Tile Matrix Multiply Unit）指令实现了矩阵加速，但TMUL的设计比较保守，本质上还是在做分块的点积运算。ACE换成了外积路线，同时加入了OCP MX inline scaling和VUNPACKB等新指令，计算密度和格式灵活性都上了一个台阶。TMUL→ACE这个演进路径挺清晰的：SSE时代做内积，AMX时代做分块乘法，ACE时代换外积。每次迭代都在提高单条指令能完成的计算量。

x86这边应对竞争的策略也很明确：复用AMX框架降低软件适配成本，复用AVX10向量寄存器省下硬件面积，通过EAG让Intel和AMD用同一套标准。白皮书明确说ACE的设计目标是”从笔记本到超级计算机”的全场景覆盖，这与AVX-512只在高性能Xeon上实现的策略形成了鲜明对比。如果ACE真的能覆盖消费级CPU，那么每台x86笔记本都自带矩阵加速引擎，这对边缘推理和本地AI部署的意义远大于数据中心。

AVX-512的教训和EAG的意义
谈到x86指令集扩展，绕不开AVX-512的碎片化历史。Intel在Skylake-X上首次引入AVX-512，此后在服务器和HEDT平台逐步推广，但AMD直到Zen 4才支持（而且只实现了部分子集）。更尴尬的是Intel自己在消费端Alder Lake上砍掉了AVX-512支持，大小核混布导致的调度复杂性让指令集兼容性成了噩梦。开发者写了AVX-512代码，在不同机器上能不能跑变成了一个运气问题。

ACE通过EAG机制试图避免重蹈覆辙。EAG不只是Intel和AMD两家关起门来的协议，它吸纳了更广泛的行业伙伴参与ISA决策。2025年10月的一周年公告确认了四个标准特性：FRED（现代化中断模型）、AVX10（统一向量ISA）、ChkTag（内存安全标记）和ACE（矩阵加速）（[AMD Blog](https://link.zhihu.com/?target=https%3A//www.amd.com/en/blogs/2025/amd-and-intel-celebrate-first-anniversary-of-x86-ecosys.html)）。四项特性同时适用于Intel和AMD的产品路线图，软件开发者只需要针对一套标准写代码。

![](https://pic1.zhimg.com/v2-fc81ef5d753f92bbdb8bb344559215e7_r.jpg?source=2c26e567)当然，EAG能不能真正消除碎片化还有待观察。白皮书目前只是架构规范，没有任何搭载ACE的CPU发布或曝光。软件适配（NumPy、SciPy、PyTorch、TensorFlow）尚在推进中。从规范到流片再到生态成熟，乐观估计也需要三年。但至少方向是对的：与其让两家各自为政搞出互不兼容的矩阵扩展，不如坐下来谈好一个标准。

那些白皮书没说的
读完整份白皮书，有几个明显的留白值得注意。

没有芯片。没有实测性能数据。没有TOPS数字。没有功耗数据。没有延迟周期数。这完全是一份架构规范文档，不是产品发布。16倍是架构层面的理论计算密度比，不是端到端应用性能的提升。实际部署中，内存带宽、缓存命中率、Tile利用率、量化精度损失都会吃掉一部分理论收益。Google在Sapphire Rapids上的实测数据显示AMX对推理吞吐的加速约7倍（[Google Cloud Blog](https://link.zhihu.com/?target=https%3A//cloud.google.com/blog/products/identity-security/we-tested-intels-amx-cpu-accelerator-for-ai-heres-what-we-learned)），远低于INT8乘累加的理论峰值比，主要瓶颈就在内存带宽和量化开销。ACE的OCP MX inline scaling和Tile分块优化正是在针对这些实际瓶颈，但效果如何还得看硅片。

至于软件生态，白皮书的态度比较模糊：PyTorch、TensorFlow、NumPy、SciPy都在适配中，什么时候能用没说。翻翻AMX的旧账：2023年初Sapphire Rapids发布，主流框架花了一年多才基本支持，而且不少优化还是靠Intel自家的oneDNN和Extension for PyTorch做的。ACE好在它是AMX的新palette，不用从头来，但外积kernel优化、OCP MX量化流水线、Tile寄存器调度这些活儿，没有捷径可走。

功耗问题。矩阵加速单元的功耗不可忽视。Phoronix在Granite Rapids上的测试显示，开启AMX后系统功耗增加了约60W（[Phoronix](https://link.zhihu.com/?target=https%3A//www.phoronix.com/review/intel-xeon-6-granite-rapids-amx/6)）。ACE的Tile寄存器和外积数据通路比现有的AMX TMUL更宽，功耗可能更高。在TDP严格受限的消费级CPU上，能分给ACE多少功耗预算是个现实问题。

端侧部署的时间窗口。ARM SME2已经在苹果M4和联发科天玑9500上落地，2025年下半年开始向Android中端设备渗透。ACE目前连CPU型号都没有公布，x86阵营在端侧AI这个赛道上的节奏慢了半拍。如果ACE要到2028年才能出现在消费级笔记本上，而届时ARM设备已经全面普及SME2，x86在端侧AI的份额可能会进一步被压缩。

从更广阔的视角来看CPU在AI计算中的位置
聊完ACE本身，把它放回更大的棋局里看看。

过去三年，AI算力的叙事基本被GPU垄断。2025年是个拐点：训练大模型当然是GPU的地盘，但AI Agent、RAG检索增强、边缘推理这些新玩法的特征完全不一样。串行逻辑多、控制流复杂、延迟敏感、模型参数小，跟CPU的大核设计、分支预测和低延迟响应对路。

量化技术的演进也在暗暗帮CPU的忙。从FP16到INT8到OCP MX的MXFP8、MXFP4，模型精度压缩得越来越狠但推理质量没怎么掉。DeepSeek在MXFP4量化下消费级硬件就能跑得很顺，模型越小，CPU的矩阵扩展就越够用。

服务器市场也在验证这个趋势。海光信息2026年一季度营收同比增长68%，龙芯、飞腾都发布了瞄准AI服务器的新品。国产CPU在矩阵扩展上跟ACE和SME2还有距离，但市场需求已经明确摆在那里了。

结语
所以回到标题的问题：ACE到底能改变什么？

改变的不是算力排行榜。CPU再怎么加矩阵引擎也追不上H200的训练吞吐。改变的是”AI计算等于买显卡”这个默认假设。当每台x86笔记本和服务器都自带能跑推理的矩阵引擎，很多现在必须上GPU的场景会消失。ARM已经在走这条路了，苹果M4上的SME引擎让端侧跑7B模型变成日常操作，RISC-V也在追赶。x86阵营只是补上了迟到的一课。

标准比速度重要。但标准能不能变成产品，产品能不能变成生态，才是真正的考验。AVX-512的碎片化用了将近十年才算基本修复，ACE没有十年可以等了。ARM的SME2已经在手机上跑起来了，x86这边连搭载ACE的CPU都还没公布。

<strong>参考来源</strong>

- [ACE Whitepaper v1.0 (x86ecosystem.org)](https://link.zhihu.com/?target=https%3A//x86ecosystem.org/wp-content/uploads/2026/03/ACE-Whitepaper-v1.pdf) — 英特尔与AMD联合发布，2026年4月15日
- [Wccftech: AMD & Intel’s ACE Partnership](https://link.zhihu.com/?target=https%3A//wccftech.com/amd-intel-ace-partnership-boosts-ai-performance-standard-matrix-acceleration-architecture-for-x86/) — 2026年4月30日报道
- [TweakTown: AMD and Intel Unveil ACE](https://link.zhihu.com/?target=https%3A//www.tweaktown.com/news/111363/amd-and-intel-unveil-ace-new-matrix-instructions-deliver-a-massive-16x-ai-performance-leap-over-avx/index.html)
- [AMD Blog: x86 EAG一周年](https://link.zhihu.com/?target=https%3A//www.amd.com/en/blogs/2025/amd-and-intel-celebrate-first-anniversary-of-x86-ecosys.html)
- [Google Cloud Blog: AMX实测](https://link.zhihu.com/?target=https%3A//cloud.google.com/blog/products/identity-security/we-tested-intels-amx-cpu-accelerator-for-ai-heres-what-we-learned)
- [The Register: CPU-based AI经济学](https://link.zhihu.com/?target=https%3A//www.theregister.com/on-prem/2024/10/29/the-economics-of-cpu-based-ai-arent-great/276524)
- [LIA论文 (ISCA 2025)](https://link.zhihu.com/?target=https%3A//dl.acm.org/doi/10.1145/3695053.3731092) — Google DeepMind, CPU-GPU协作推理
- [CUTEv2 (DAC 2026)](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2604.11615v1) — 中科院计算所，统一CPU矩阵扩展架构
- [MpGEMM (ARM SME)](https://link.zhihu.com/?target=https%3A//arxiv.org/html/2512.21473v1) — ARM SME矩阵乘优化
- [ARM SME2技术解析](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/gccbuaa/p/19576677)
- [Phoronix: Xeon 6 AMX性能](https://link.zhihu.com/?target=https%3A//www.phoronix.com/review/intel-xeon-6-granite-rapids-amx/6)