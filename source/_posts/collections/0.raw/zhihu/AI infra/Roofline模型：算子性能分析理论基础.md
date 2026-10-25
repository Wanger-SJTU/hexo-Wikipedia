---
title: Roofline模型：算子性能分析理论基础
date: "2026-01-16 00:00:00"
updated: "2026-01-16 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/Roofline模型-算子性能分析理论基础/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1995487023952336382
---


计算强度
在高性能计算（HPC）与深度学习领域中，模型的<strong>计算强度</strong>（Computational Intensity，亦称算术强度，Arithmetic Intensity）是一个核心性能指标，用于刻画<strong>计算量与数据访问量之间的比例关系</strong>，从而判断模型或算子更容易受限于计算能力还是内存带宽。

![](https://pica.zhimg.com/v2-d879bf377dcb1b35d2923da97a630820_r.jpg)<strong>计算强度</strong>与<strong>算力</strong>（Compute Capability / Peak FLOPs）是不一样的概念。<strong>算力</strong>指硬件单位时间内可执行的最大算术运算量，与模型无关，更多体现的是计算硬件的平台特性。<strong>计算强度</strong>描述的是<strong>算法在使用数据时，做了多少计算</strong>，是模型/算子/kernel的属性，与计算硬件无关，决定是否可以吃满算力。

 算力回答的是：<strong>“我最多能算多快？”</strong>, 计算强度回答的是：<strong>“我为了这些数据，值得算多久？”</strong>。在AI Infra工程领域，计算强度是判断一个算子到底是“访存瓶颈”还是“计算瓶颈”的<strong>最核心量化指标</strong>，也是连接算法与硬件（Roofline Model）的桥梁。以下将这个概念为核心，介绍算子运行的瓶颈（bottleneck）场景。

1. 什么是计算强度？
<strong>定义</strong>：计算强度是指在执行算法过程中，<strong>“每从内存读取（或写入）一个字节的数据，需要进行多少次浮点运算”</strong>。

<strong>公式</strong>： 

![](https://www.zhihu.com/equation?tex=+%5Ctext%7B%E8%AE%A1%E7%AE%97%E5%BC%BA%E5%BA%A6+%28I%29%7D+%3D+%5Cfrac%7B%5Ctext%7B%E6%80%BB%E8%AE%A1%E7%AE%97%E9%87%8F+%28FLOPs%29%7D%7D%7B%5Ctext%7B%E6%80%BB%E8%AE%BF%E5%AD%98%E9%87%8F+%28Bytes%29%7D%7D+)

- <strong>单位</strong>：FLOPs/Byte（每字节浮点运算次数）。
- <strong>通俗理解</strong>：  
- <strong>做菜的比喻</strong>：访存量 = 这是一个厨师去冰箱拿食材的次数和重量；计算量 = 厨师切菜、炒菜的动作次数。
- <strong>高计算强度</strong>：去一次冰箱拿回萝卜，要切一万刀（主要时间花在切菜上，冰箱门带宽无所谓）。
- <strong>低计算强度</strong>：去一次冰箱拿回一根葱，切两刀就用完了，得马上去拿下一根（主要时间花在往返冰箱的路上，切菜很快）。
2. 矩阵乘法（GEMM）的例子
矩阵乘法 
![](https://www.zhihu.com/equation?tex=C%3DA%C3%97B)，其中：
![](https://www.zhihu.com/equation?tex=A%5Cin%5Cmathbb%7BR%7D%5E%7BM+%5Ctimes+K%7D)， 
![](https://www.zhihu.com/equation?tex=B%5Cin%5Cmathbb%7BR%7D%5E%7BK+%5Ctimes+N%7D)。

- <strong>计算量</strong>：
![](https://www.zhihu.com/equation?tex=%7B2+%5Ctimes+M+%5Ctimes+N+%5Ctimes+K%7D+%5Ctext%7BFLOPs%7D)（乘法和加法算两次，因此要乘以2）<strong>内存访问量（理想情况）</strong>：
![](https://www.zhihu.com/equation?tex=%28MK+%2B+KN+%2B+MN%29+%5Ctimes+%5Ctext%7Bsizeof%28float%29%7D) 

因此 GEMM 的计算强度随 
![](https://www.zhihu.com/equation?tex=K) 增大而显著提高，这也是其在 GPU 上性能极高的根本原因。

3. 计算强度如何决定瓶颈（Roofline Model）
任何硬件（GPU/NPU）都有一个固有的“<strong>机器平衡点</strong>”（Machine Balance），即硬件峰值计算能力与峰值内存带宽的比值：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7B%E6%9C%BA%E5%99%A8%E5%B9%B3%E8%A1%A1%E7%82%B9%7D+%3D+%5Cfrac%7B%5Ctext%7BPeak+FLOPs+%28%E6%AF%8F%E7%A7%92%E6%B5%AE%E7%82%B9%E5%B3%B0%E5%80%BC%29%7D%7D%7B%5Ctext%7BPeak+Memory+Bandwidth+%28%E6%AF%8F%E7%A7%92%E5%B8%A6%E5%AE%BD%E5%B3%B0%E5%80%BC%29%7D%7D+)

根据算子的计算强度与机器平衡点的关系，我们可以将瓶颈一分为二：

场景一：低计算强度（
![](https://www.zhihu.com/equation?tex=I+%3C+%5Ctext%7B%E6%9C%BA%E5%99%A8%E5%B9%B3%E8%A1%A1%E7%82%B9%7D)） -> 访存瓶颈

- <strong>状态</strong>：数据供给速度跟不上计算速度。计算单元（ALU）“吃不饱”，大部分时间在空转等待数据。
- <strong>典型算子</strong>：  
- <strong>Element-wise (ReLU, Add, Mult)</strong>：  
- 计算：
![](https://www.zhihu.com/equation?tex=C+%3D+A+%2B+B)。1次加法。
- 访存：读A(4B) + 读B(4B) + 写C(4B) = 12 Bytes（FP32）。
- 强度：
![](https://www.zhihu.com/equation?tex=1+%2F+12+%5Capprox+0.08) FLOPs/Byte。
- 结论：现在的GPU平衡点通常在 50~100+ FLOPs/Byte，0.08 远低于此，属于极端的<strong>访存瓶颈</strong>。
- <strong>BatchNorm, LayerNorm</strong>：涉及大量的统计量读写，计算逻辑相对简单。
- <strong>优化手段</strong>：  
- <strong>算子融合（Fusion）</strong>：这是提高计算强度的最有效方法。将 `Conv -> Bias -> ReLU -> Add` 融合成一个 Kernel。数据读进片上缓存（Cache/Shared Mem）后，一次性做完这4步计算再写回，相当于分子变大（做了更多计算），分母不变（读写次数没变），从而提升了计算强度。
场景二：高计算强度（
![](https://www.zhihu.com/equation?tex=I+%3E+%5Ctext%7B%E6%9C%BA%E5%99%A8%E5%B9%B3%E8%A1%A1%E7%82%B9%7D)） -> 计算瓶颈

- <strong>状态</strong>：数据来得太快，或者数据复用率极高，计算单元（ALU）已经全速运转，但还是处理不完。
- <strong>典型算子</strong>：  
- <strong>GEMM (矩阵乘法)</strong>：  
- 场景：两个 
![](https://www.zhihu.com/equation?tex=N+%5Ctimes+N) 矩阵相乘。
- 计算量：
![](https://www.zhihu.com/equation?tex=2N%5E3)。
- 访存量：
![](https://www.zhihu.com/equation?tex=3N%5E2+%5Ctimes+4) (Bytes)。
- 强度：
![](https://www.zhihu.com/equation?tex=%5Capprox+N+%2F+6)。
- 结论：当 
![](https://www.zhihu.com/equation?tex=N) 很大时（例如 1024），计算强度高达 ≈170 FLOPs/Byte。这通常高于硬件的平衡点，因此是<strong>计算瓶颈</strong>。
- <strong>3D Convolution (大Kernel)</strong>：多通道、大卷积核的卷积层。
- <strong>优化手段</strong>：  
- <strong>利用更强的指令</strong>：使用 Tensor Core / Matrix Core (FP16/INT8)，这本质上是提升硬件的 Peak FLOPs 上限。
- <strong>近似计算</strong>：剪枝、稀疏化。
4. 结合“计算强度”重看算子瓶颈的例子
我们可以用计算强度这个标尺，把一般的算子例子重新归类：

算子类型计算过程描述计算强度分析瓶颈归属核心优化方向Transpose / Copy纯搬运，无计算0 FLOPs/Byte极致访存瓶颈消除不必要的转置，优化内存布局Vector Add / ReLU读两个数，加一下，写回~0.1 FLOPs/Byte (极低)访存瓶颈算子融合 (链式操作合并)，减少中间显存读写Depthwise Conv每个通道独立做卷积，复用度低中低倾向于访存瓶颈优化缓存命中率，通道合并Standard Conv2D多个通道累加，输入数据被多次复用高 (随通道数和Batch增加)计算瓶颈提升并行度，使用 Tensor CoreLarge GEMM大矩阵相乘极高计算瓶颈也是 Tensor Core，或 Tiling 分块策略优化
5. 小结
在算子开发中，<strong>计算强度</strong>是我们的“体检表”：

- <strong>开发前分析</strong>：先算一下这个数学公式的理论计算强度。  
- 如果算出来只有 0.5 FLOPs/Byte，不要指望能跑到 GPU 的 TFLOPS 峰值，应该关注显存带宽利用率（GB/s）。
- 如果算出来有 200 FLOPs/Byte，那就应该努力优化指令流水，去逼近 GPU 的计算峰值。<strong>2. 瓶颈转移</strong>：优化的过程往往是<strong>提升计算强度</strong>的过程。  

- 例如：通过 <strong>Tiling（分块）</strong> 技术，将一块数据读入 Shared Memory（片上共享内存），然后被多次重复计算。这减少了对 Global Memory（显存）的访问（分母变小），变相提高了针对 Global Memory 的计算强度，从而可能将一个“访存瓶颈”算子转化为“计算瓶颈”算子，释放硬件性能。
Roofline Model 屋顶模型
在了解完计算强度的完整概念后，可以引入<strong>Roofline Model（屋顶模型）</strong> ，这是是高性能计算领域最经典、最直观的性能分析模型。它由加州大学伯克利分校的研究人员（Williams et al.）在 2009 年提出。 简单来说，Roofline Model 将<strong>算力（GFLOPS）</strong>、<strong>带宽（Bandwidth）</strong> 和 <strong>计算强度（Arithmetic Intensity）</strong> 画在同一张图上，告诉我们在当前的硬件上，你的程序“<strong>理论上最快能跑多快</strong>”，以及“<strong>到底是谁卡住了脖子</strong>”。

![](https://pic2.zhimg.com/v2-2e08724207a8f83d46938cb3a4164c8d_r.jpg)
1. 核心坐标系：怎么看这张图
Roofline Model 是一个二维坐标系，通常使用<strong>双对数坐标（Log-Log Scale）</strong>。

- <strong>X 轴：计算强度 / 算术强度 (Computational Intensity)</strong> 
- 单位：FLOPs/Byte（每字节数据对应多少次浮点运算）。
- 含义：算法本身的属性。越往右，说明这个算子计算越密集（数据复用率高）；越往左，说明由于经常读写内存，计算很少。
- <strong>Y 轴：性能 (Performance)</strong> 
- 单位：GFLOPS 或 TFLOPS（每秒十亿/万亿次浮点运算）。
- 含义：实际达到的运行速度。越往上越快。

2. “屋顶”的形状：两条限制线
模型之所以叫“屋顶”，是因为硬件限制构成了形状像屋顶的两条线，任何程序的性能点（Dot）都不可能超过这个屋顶。

第一部分：倾斜的房顶（斜率 = 内存带宽）

- <strong>区域</strong>：图的左侧。
- <strong>公式</strong>：
![](https://www.zhihu.com/equation?tex=P+%3D+%5Ctext%7BBandwidth%7D+%5Ctimes+%5Ctext%7BIntensity%7D)。
- <strong>含义</strong>：当算子的计算强度（X轴）很低时，性能完全取决于能多快把数据搬运过来。
- <strong>瓶颈</strong>：<strong>Memory Bound（访存瓶颈）</strong>。
- <strong>现象</strong>：在这个区域，X轴每往右移动一点（提高计算强度），Y轴性能就会线性上升。

 第二部分：平坦的房顶（高度 = 峰值算力）

- <strong>区域</strong>：图的右侧。
- <strong>公式</strong>：
![](https://www.zhihu.com/equation?tex=P+%3D+%5Ctext%7BPeak+GFLOPS%7D)。
- <strong>含义</strong>：当算子的计算强度足够大，内存带宽已经不是问题，性能上限被硬件的计算单元（ALU/Tensor Core）锁死，无法再提升。
- <strong>瓶颈</strong>：<strong>Compute Bound（计算瓶颈）</strong>。
- <strong>现象</strong>：在这个区域，无论怎么提高计算强度（往右移），性能（Y轴）都不会再上升了，因为已经顶到天花板了。
第三部分：脊点 (Ridge Point) —— 拐点

- 这是斜线和水平线的交点。
- <strong>意义</strong>：这是硬件的“<strong>机器平衡点</strong>”。
- <strong>判断</strong>：
 
- 如果开发的算子在脊点<strong>左边</strong>（如图算法1） -> 访存瓶颈。
- 如果开发的算子在脊点<strong>右边</strong>（如图算法2） -> 计算瓶颈。

第四部分：计算天花板 (Computational Ceilings)
在图中显示的一条 computer ceiling 线，实际可能有多条对应多个场景，它们都是<strong>水平线</strong>，位于绝对算力峰值的下方。每一条线代表一种指令集使用的限制。 <strong>常见的分层例子（从高到低）：</strong>

<strong>Level 1：绝对峰值 (Theoretical Peak)</strong> 

- <strong>条件</strong>：同时满足 <strong>指令级并行 (ILP) + SIMD (向量化) + FMA (融合乘加)</strong>。
- 例子：
![](https://www.zhihu.com/equation?tex=%5Ctext%7BPeak+GFLOPS%7D)。<strong>Level 2：无 FMA 天花板 (No-FMA Ceiling)</strong> 

- <strong>原因</strong>：算法中只有加法或乘法，或者编译器没有生成 `FMA (a*b+c)` 指令，而是生成了分离的 `MUL` 和 `ADD`。
- <strong>后果</strong>：性能直接减半（通常硬件执行 FMA 和执行单独 ADD 的周期是一样的，但 FMA 做了两件事）。
- 位置：通常在绝对峰值的 <strong>1⁄2</strong> 处。<strong>Level 3：无 SIMD 天花板 (No-SIMD / Scalar Ceiling)</strong> 

- <strong>原因</strong>：代码写的是标量操作，没有利用 GPU 的 Warp 或 CPU 的 AVX/NEON 向量单元。
- <strong>后果</strong>：性能除以向量宽度（比如除以 32 或 8）。
- 位置：非常低，通常在绝对峰值的 <strong>1⁄8 到 1⁄32</strong> 处。

<strong>分析意义</strong>： 如果你的算子性能点（Dot）正好卡在 Level 2 的线上，说明你的并行度（SIMD）没问题，瓶颈在于<strong>指令选择</strong>（需要优化成 FMA）。

第五部分：带宽天花板（Bandwidth Ceilings）
同样的道理，Bandwidth Ceilings 也是多条<strong>斜线</strong>，位于绝对带宽峰值的下方。每一条线代表内存访问模式的优劣。 <strong>常见的分层例子（从左上到右下）：</strong>

<strong>Level 1：绝对带宽峰值 (Theoretical Peak Bandwidth)</strong> 

- <strong>条件</strong>：访存完全连续（Coalesced），读写比例完美平衡，利用了所有内存通道。<strong>Level 2：无隐藏延迟天花板 (Without Latency Hiding)</strong> 

- <strong>原因</strong>：虽然带宽够，但发出的读写请求不够多（In-flight memory requests 太少），导致内存控制器空闲。
- <strong>后果</strong>：无法跑满物理带宽。<strong>Level 3：非连续访问天花板 (Strided / Random Access)</strong> 

- <strong>原因</strong>：算子进行了跳跃式读取（Strided）或者随机读取（Random/Scatter/Gather）。
- <strong>后果</strong>：实际上只请求了 4 Bytes 数据，但硬件被迫加载了整个 Cache Line（例如 128 Bytes）。有效带宽利用率极低。
- 位置：可能会降到峰值带宽的 <strong>1⁄10 甚至更低</strong>。

<strong>分析意义</strong>： 如果你的点卡在 Level 3 的斜线上，说明你虽然处于 Memory Bound 区域，但买更好的显卡也没用，因为是你代码里的<strong>访存模式</strong>（Pattern）太烂了，必须先优化数据布局。

3. 一个具体的例子
假设我们有一块显卡（GPU）：

- <strong>峰值算力 (Peak Compute)</strong>：1000 GFLOPS
- <strong>内存带宽 (Bandwidth)</strong>：100 GB/s <strong>脊点计算</strong>：
![](https://www.zhihu.com/equation?tex=1000+%2F+100+%3D+10) FLOPs/Byte。
 <strong>场景1：开发一个向量加法算子 (Vector Add)</strong>

- 计算强度：0.1 FLOPs/Byte（非常低，远在脊点 10 的左边）。
- <strong>Roofline 预测</strong>：
 
- 它受到斜线限制。
- 理论最大性能 = 
![](https://www.zhihu.com/equation?tex=100+%5Ctext%7B+GB%2Fs%7D+%5Ctimes+0.1+%3D+10+%5Ctext%7B+GFLOPS%7D)。
- <strong>分析</strong>：虽然显卡有 1000 GFLOPS 的能力，但因为你在这个算子上是“访存瓶颈”，你只能发挥出 1% 的算力。<strong>场景2：开发一个矩阵乘法算子 (GEMM)</strong>

- 计算强度：100 FLOPs/Byte（很高，在脊点 10 的右边）。
- <strong>Roofline 预测</strong>：
 
- 它受到水平线限制。
- 理论最大性能 = 1000 GFLOPS。
- <strong>分析</strong>：此时带宽已经不是瓶颈，算子可以跑满显卡的全部算力。

 4. 如何利用 Roofline 指导优化（Move the Dot）

 在 Profiling 时，我们会把实际测量的算子性能作为一个<strong>点</strong>（Dot）画在图上。这个点通常位于屋顶下方。优化的目标就是<strong>把点往上推，或者往右推</strong>。

![](https://picx.zhimg.com/v2-c71c482a5a134491036ab20892911429_r.jpg)

情况 A：点在斜线下方，且距离斜线很远

- <strong>诊断</strong>：你是 Memory Bound，但你连带宽都没跑满。
- <strong>原因</strong>：访存模式太差（非连续访问、Cache 命中率低）。
- <strong>对策</strong>：优化内存布局，使用向量化加载，Coalesced Access（合并访问）。<strong>情况 B：点紧贴着斜线（撞到了带宽墙）</strong>

- <strong>诊断</strong>：你是 Memory Bound，且已经跑满了带宽。
- <strong>原因</strong>：算法本身计算强度太低。
- <strong>对策（往右移）</strong>：<strong>算子融合（Loop Fusion）</strong>，Tiling（分块），利用 Shared Memory 减少 Global Memory 访问。这会提高计算强度，让点向右移动，从而进入更高的性能区域。<strong>情况 C：点在水平线下方，且距离水平线很远</strong>

- <strong>诊断</strong>：你是 Compute Bound，但计算单元没跑满。
- <strong>原因</strong>：指令流水线停顿、依赖链太长、没用 SIMD/Tensor Core 指令。
- <strong>对策（往上移）</strong>：指令级并行优化，使用专用指令（如 HFMA2, HMMA），循环展开。总结一下，Roofline Model 就像是算子开发的“<strong>体检报告</strong>”：

- <strong>基准线（Roof）</strong>：这块硬件在这个算法上<strong>最高</strong>能跑多少分。
- <strong>当前位置（Dot）</strong>：现在跑了多少分。
- <strong>差距（Gap）</strong>：离满分还有多远。
- <strong>区域（Zone）</strong>：如果想提分，是该去买更快的内存（解决访存），还是该优化代码逻辑（解决计算）。在实际 AI 芯片开发中，通常会针对 L1 Cache、L2 Cache 和 HBM 分别画出三条 Roofline，以更精细地分析数据到底卡在哪一层存储上。

![](https://pic4.zhimg.com/v2-96f0024e268bb8897ad981b1d2aa3bb1_r.jpg)
实际程序验证（NVIDIA RTX5070）

第一步：构建 RTX 5070 的“屋顶”参数
我们需要两个关键数值来刻画出当前设备的 Roofline，查阅官方的技术文档参数：

![](https://pic1.zhimg.com/v2-a6a683c53d586ce900f206c18155a516_r.jpg)
1. 带宽屋顶 (Bandwidth Roof)
RTX 5070 使用 GDDR7 显存，位宽通常为 192-bit。标准显存带宽<strong>约 672 GB/s</strong> （NVIDIA 官网性能数据），相比 RTX 4070 (504 GB/s) 有巨大提升。

2. 算力屋顶 (Compute Roof)
<strong>FP32 (CUDA Cores)</strong> 预计 <strong>30 ~ 40 TFLOPS</strong>，计算方式采取<strong>传统光栅化算力</strong>（Shader / CUDA Core Performance）， 计算公式：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BFP32+TFLOPS%7D+%3D+%5Ctext%7BCUDA+Cores+%E6%95%B0%E9%87%8F%7D+%5Ctimes+%5Ctext%7B%E6%A0%B8%E5%BF%83%E9%A2%91%E7%8E%87+%28GHz%29%7D+%5Ctimes+2+)

 公式解释：

- CUDA Cores，是显卡里的通用计算单元数量，对应表中 RTX 5070为 <strong>6144个</strong>；
- 核心频率Boost Clock（加速频率），RTX 5070为 <strong>2.51 GHz</strong>；
- 这里的<strong>× 2</strong>是因为现代 GPU 每个时钟周期能做一次 <strong>FMA (Fused Multiply-Add)</strong> 操作，这包含一次乘法和一次加法，等于 2 次浮点运算。 综合计算 `FP32 TFLOPS` 为 <strong>30.8 TFLOPS</strong>。 <strong>Tensor Cores (FP16/BF16)</strong> 是NVIDIA GPU用于极致加速的特性，Blackwell 的 Tensor Core 极快，理论峰值可能高达 <strong>100+ TFLOPS</strong> (甚至更高，取决于稀疏化)。
3. 计算机器平衡点 (Ridge Point)
计算：

![](https://www.zhihu.com/equation?tex=+%5Ctext%7BRidge%7D+%3D+%5Cfrac%7B%5Ctext%7BPeak+FP32%7D%7D%7B%5Ctext%7BBandwidth%7D%7D+%5Capprox+%5Cfrac%7B30%2C000%7D%7B672%7D+%5Capprox+%5Cmathbf%7B45%7D+%5Ctext%7B+FLOPs%2FByte%7D+) 

<strong>含义</strong>：在 RTX 5070 上，算子必须每搬运 1 个字节数据，至少做 <strong>45 次</strong> 浮点运算，才能把 GPU 的计算单元跑满。如果低于 45，绝对是卡在带宽上（memory bound）。

第二步：PyTorch 实现代码
在RTX 5070 环境中运行以下代码，这段代码会测试三个点，分别对应 Roofline 图上的三个不同位置。

```python
import torch
import time
```


# 1. 设置环境：确保 TF32 (TensorFloat-32) 行为可控
# RTX 30/40/50 系列默认会在 FP32 矩阵乘中使用 TF32,这会大大加速计算。
# 为了测试“纯 FP32”性能,我们先关掉它；后面再开启它来体验 Tensor Core。
torch.backends.cuda.matmul.allow_tf32 = False 
device = torch.device("cuda")

# 获取显卡名称,确认是 5070

```python
print(f"当前显卡: {torch.cuda.get_device_name(0)}")

def profile_kernel(func, name, n_iters=100):
    # 使用 CUDA Event 计时比 time.time() 更精确
    start_event = torch.cuda.Event(enable_timing=True)
    end_event = torch.cuda.Event(enable_timing=True)
```

    
    # 预热

```text
    for _ in range(10): func()

    start_event.record()
    for _ in range(n_iters):
        func()
    end_event.record()
    torch.cuda.synchronize()

    elapsed_time_ms = start_event.elapsed_time(end_event) / n_iters
    return elapsed_time_ms / 1000.0 # 转换为秒
```


# ==========================================
# 实验 A: 访存瓶颈 (Vector Add)
# 位于 Roofline 最左侧
# ==========================================

```python
N = 64 * 1024 * 1024 # 64M 元素
x = torch.randn(N, device=device, dtype=torch.float32)
y = torch.randn(N, device=device, dtype=torch.float32)

def run_vector_add():
    z = x + y

t_add = profile_kernel(run_vector_add, "Vector Add")
```


# 理论分析

```python
bytes_per_iter = 3 * N * 4 # 读x(4B)+读y(4B)+写z(4B)
flops_per_iter = N         # 1次加法
bw = (bytes_per_iter / t_add) / 1e9  # GB/s
ai = flops_per_iter / bytes_per_iter

print(f"\n[实验 A: Vector Add]")
print(f"计算强度 (AI): {ai:.4f} FLOPs/Byte (极低)")
print(f"实测带宽: {bw:.2f} GB/s")
print(f"分析: 接近 GDDR7 的物理带宽上限 (600-700 GB/s)")
```


# ==========================================
# 实验 B: 计算瓶颈 FP32 (Matrix Mul)
# 位于 Roofline 右侧 (Standard Roof)
# ==========================================

```python
S = 8192 # 矩阵大小 8192 x 8192
mat_a = torch.randn(S, S, device=device, dtype=torch.float32)
mat_b = torch.randn(S, S, device=device, dtype=torch.float32)

def run_matmul_fp32():
    torch.mm(mat_a, mat_b)

t_fp32 = profile_kernel(run_matmul_fp32, "MatMul FP32", n_iters=20)
```


# 理论分析

```python
flops_per_iter = 2 * S**3
gflops = (flops_per_iter / t_fp32) / 1e9
bytes_accessed = 3 * S**2 * 4
ai_gemm = flops_per_iter / bytes_accessed

print(f"\n[实验 B: MatMul FP32 (No Tensor Core)]")
print(f"计算强度 (AI): {ai_gemm:.2f} FLOPs/Byte (高)")
print(f"实测算力: {gflops:.2f} GFLOPS") # 也就是 TFLOPS = GFLOPS / 1000
print(f"分析: 接近 CUDA Cores 的理论峰值 (约 30 TFLOPS)")
```


# ==========================================
# 实验 C: 突破天花板 (Tensor Cores / TF32)
# 位于 Roofline 最高的“阁楼”
# ==========================================
# 开启 TF32 (NVIDIA Ampere/Blackwell 的黑科技)
# 它在 FP32 容器里跑 FP19 计算,利用 Tensor Core
torch.backends.cuda.matmul.allow_tf32 = True 

```python
t_tf32 = profile_kernel(run_matmul_fp32, "MatMul TF32", n_iters=50)

gflops_tf32 = (flops_per_iter / t_tf32) / 1e9

print(f"\n[实验 C: MatMul TF32 (Using Tensor Cores)]")
print(f"实测算力: {gflops_tf32:.2f} GFLOPS")
print(f"加速比: {gflops_tf32 / gflops:.2f}x")
print(f"分析: 这利用了 Blackwell Tensor Cores,性能会远超普通 FP32 roofline")
```


# ==========================================
# 实验 D: 真正的屋顶 (Tensor Cores / FP16)
# ==========================================
# 开启 FP16 极致压缩性能

```python
def run_matmul_fp16():
    # 必须确保输入是 half (fp16) 类型
    # 并且使用 Tensor Core 友好的维度 (8的倍数, 这里已经是8192了)
    with torch.amp.autocast("cuda"):     # 或者直接定义 .half() tensor
        torch.mm(mat_a.half(), mat_b.half())

t_fp16 = profile_kernel(run_matmul_fp16, "MatMul FP16")

gflops_fp16 = (flops_per_iter / t_fp16) / 1e9

print(f"\n[实验 D: MatMul FP16 (Using Tensor Cores)]")
print(f"实测算力: {gflops_fp16:.2f} GFLOPS")
print(f"加速比: {gflops_fp16 / gflops:.2f}x")
print(f"分析: 这利用了 Tensor Cores FP16, Ultimate Roof line!")
```

运行结果：

当前显卡: NVIDIA GeForce RTX 5070

[实验 A: Vector Add]
计算强度 (AI): 0.0833 FLOPs/Byte (极低)
实测带宽: 592.64 GB/s
分析: 接近 GDDR7 的物理带宽上限 (600-700 GB/s)

[实验 B: MatMul FP32 (No Tensor Core)]
计算强度 (AI): 1365.33 FLOPs/Byte (高)
实测算力: 23856.77 GFLOPS
分析: 接近 CUDA Cores 的理论峰值 (约 30 TFLOPS)

[实验 C: MatMul TF32 (Using Tensor Cores)]
实测算力: 33895.21 GFLOPS
加速比: 1.42x
分析: 这利用了 Blackwell Tensor Cores, 性能会远超普通 FP32 roofline

[实验 D: MatMul FP16 (Using Tensor Cores)]
实测算力: 62200.50 GFLOPS
加速比: 2.61x
分析: 这利用了 Tensor Cores FP16, Ultimate Roof line!

第三步：结果分析

![](https://pic4.zhimg.com/v2-b1d4ac97bdd5ed4dfbb9e21b1694f07d_r.jpg)
 1. 实验 A：访存的极限 (Memory Bound)

- <strong>数据</strong>：带宽 <strong>593GB/s</strong>。
- 作为对比，上一代 RTX 4070 Ti 的带宽只有 504 GB/s。 5070 在显存位宽可能只有 192-bit 的情况下，凭借 GDDR7 的超高频率，跑出了接近 600 GB/s 的实测速度。
- <strong>Roofline 意义</strong>：
- 这是 <strong>Roofline model</strong> 图中最左侧的<strong>斜率</strong>。
- <strong>结论</strong>：以后写任何算子，如果计算密度（AI）低于 <strong>40 FLOPs/Byte</strong>（
![](https://www.zhihu.com/equation?tex=23694+%5Cdiv+593+%5Capprox+40)），你的性能上限就被这个 593 GB/s 锁死了。
- 例子：以后跑 70B 大模型推理（主要也是搬运权重），这 593 GB/s 就是这块芯片的物理限速。
<strong>2. 实验 B：标准算力的天花板 (Standard FP32 Ceiling)</strong>

- <strong>数据</strong>：<strong>23.7 TFLOPS</strong> (23,694 GFLOPS)。
- <strong>设置</strong>：`allow_tf32 = False`。这意味着强行让 GPU 用传统的 FP32 流水线（或者模拟传统行为）去跑。
- <strong>Roofline 意义</strong>：这是<strong>第一层天花板</strong>，但是这个数值其实非常高！上一代旗舰 RTX 3090 的 FP32 峰值也就在 35 TFLOPS 左右。一张“70”级别的卡，光靠标准算力就已经逼近了两代前的卡皇。
<strong>3. 实验 C：突破天花板 (Tensor Core Ceiling)</strong>

- <strong>数据</strong>：<strong>34.1 TFLOPS</strong> (34,115 GFLOPS)。
- <strong>加速比</strong>：<strong>1.44x</strong>。
- <strong>Roofline 意义</strong>：
 
- 这是<strong>第二层天花板</strong>（阁楼）。
- <strong>为什么只有 1.44 倍？</strong> 
- <strong>原因 1（功耗墙）</strong>：Tensor Core 全力开启时非常吃电。RTX 5070 作为消费级显卡，可能有 TGP（整卡功耗）限制。当单元全开，频率可能会自动降低以保命。
- <strong>原因 2（精度代价小）</strong>：TF32 毕竟还是处理 32 位数据（只是截断尾数），它的吞吐量通常是 FP32 的 2 倍理论值（在 Ampere/Hopper 上）。实测跑到 1.44 倍是一个非常典型的“实战折扣值”。
- <strong>关键点</strong>：这多出来的 <strong>10,000 GFLOPS</strong> 相当于是白送的！没有改模型，没有改算法，只是允许了 TF32，就算力暴涨。
4. 实验 D：终极天花板 (FP16 Tensor Core Ultimate Ceiling)

- <strong>数据：62.2 TFLOPS</strong> (62, 200 GFLOPS)。
- <strong>加速比: 2.61x</strong>。
- <strong>Roofline 意义</strong>：  
- Blackwell 架构真正的恐怖之处在于 <strong>FP16 (Half Precision)</strong> 的 Tensor Core 性能。FP16 的 Tensor Core 吞吐量通常是 TF32 的 <strong>2倍甚至更多</strong>。这才是这块显卡真正的 <strong>Ultimate Roof (终极屋顶)</strong>，也是目前大模型训练（Mixed Precision Training）主要工作的区域。
给 RTX 5070 开发者的建议

- <strong>对于小算子（Activation, Normalization）</strong>：  
- 这块卡太快了，以至于 kernel launch 的开销和显存读写会显得更慢。
- <strong>必须做算子融合 (Fusion)</strong>。如果你写了很多碎碎的 PyTorch 算子，5070 会大部分时间在空转等待显存数据。请使用 `torch.compile`。
- <strong>对于矩阵计算 (Linear, Conv)</strong>：  
- 一定要确保使用了 <strong>Tensor Cores</strong> (FP16 或 BF16)。
- 5070 的 FP16 性能是 FP32 的好几倍。如果你还在用纯 FP32 训练/推理，实际上浪费了这块卡 70% 的性能。
- <strong>显存优化</strong>：  
- 虽然 GDDR7 很快，但 5070 的算力增长更快。相对而言，<strong>显存带宽依然是瓶颈</strong>。在写 CUDA 算子时，尽量多用 Shared Memory，减少对 Global Memory 的访问，提高计算密度。
参考

- [Compute trends across three eras of machine learning | Epoch AI](https://link.zhihu.com/?target=https%3A//epoch.ai/blog/compute-trends)
- [Roofline: An Insightful Visual Performance Model for Floating-Point Programs and Multicore Architectures](https://link.zhihu.com/?target=https%3A//escholarship.org/content/qt78h8v7mr/qt78h8v7mr.pdf)
- [Is your algorithm running at peak performance? The roofline model - Codee](https://link.zhihu.com/?target=https%3A//www.codee.com/is-your-algorithm-running-at-peak-performance-the-roofline-model/)
- [比较 GeForce 系列最新一代显卡和前代显卡 | NVIDIA](https://link.zhihu.com/?target=https%3A//www.nvidia.cn/geforce/graphics-cards/compare/%23compare-50)