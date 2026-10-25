---
title: "Sparse AI Accelerator(GP)"
date: "2025-05-29 00:00:00"
updated: "2025-05-29 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/Sparse-AI-Accelerator(GP)/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/1911457048283034313"
---


1 MatRaptor
<strong>优点：</strong>首次提出 Gust Product，输入输出都是 C2SR consistent formatting，方便链式运算。

提出的 C2SR 编码使得在 row 维度复用存储器 channel 成为可能。

<strong>缺点：</strong>对 B 进行 fetch 造成大量的 off-chip dram access，未作优化。

merger 电路复杂。片上 merge 存在 overflow 的问题。

![](https://pic4.zhimg.com/v2-c53a28d503df782887e5488e6129f813_r.jpg)Gust product：row-A 与 entire B运算，输出对应row-C
### 1.1 C2SR( channel cyclic sparse row )

输入：因为在 memory 中通常是<strong>分 bank</strong>( MatRaptor 称为 channel )的设计，因此在需要一种新的 C2SR 表示方式来充分利用这种分 channel 的 memory 的带宽。

输出：假设有两个 PE，如果是 CSR 格式那么要等 PE0 输出完 PE1 才能输出。而 C2SR 则不用，因为 PE0 和 PE1 的输出是<strong>存到不同 channel</strong>，因此 PE 可以<strong>全异步</strong>。

![](https://pica.zhimg.com/v2-ae4f52e48c95c0363608c1da8db0178c_r.jpg)C2SR format
![](https://pic1.zhimg.com/v2-f56518aabda2b14629cb8a62993982ce_r.jpg)CSR C2SR
### 1.2 multiply & merge phase

在 PE 设计上，和 SpArch 一样，本文也将 multiply 和 merge phase 进行 pipeline 式的操作。本文的 merger 电路也是非常之复杂，但比 SpArch 好一点。

![](https://pica.zhimg.com/v2-81555a4226097981d87233e60ca2f746_r.jpg)multiply & merge这种 merge 方法的理论基础在于，产生的一个部分和向量的列号(例如
$c_{00}^3,c_{01}^3,c_{03}^3$)总是在时间上保序的。相比于 SpArch，其注意到需要排列的几个子序列已经保序，因此可以使用复杂度更低的算法。phase 1 和 multiply 阶段并行，phase 2 则是本行已经计算完成，queue 内部自己 merge 得到最终结果输出。

### 1.3 电路结构


![](https://pic4.zhimg.com/v2-20708cdac4d85f1861c8492eee22cf2b_r.jpg)MatRapter ARCH电路上由 SPAL( sparse A Loader )和 SPBL, PE 构成 1-D systolic array，SPAL 负责把 A 的某行的数取出，SPBL 负责取出对应的 B 的数，然后送到 PE 中算。PE 结构和上面说的差不多，注意的是由两个 queue group 构成，因为如上所述 PE 的运作分为 phase1 和 phase2，phase1 的时候 multiply 和 merge phase 一起运作，phase2 只有 merge phase 运作，导致无法 multiply，所以采用 <strong>double buffer</strong> 方案使用两套的 queue group。

前文提到的 dram channel 在这里如何体现呢？我们将 SPAL SPBL PE 称为一个 group，如果 channel 是 group 的整数倍那么一个 group 负责 channel/group 个 channel 的计算，反之亦然。这样的话每个 group 就可以完全<strong>并行且异步</strong>运作，且 crossbar 也不是 n*n 的 bar，简化电路。同时可以充分利用 HBM interleaving 的特性，避免带宽闲置。

2 InnerSP
<strong>优点：</strong>对 B 进行cache。row split 减少 hash table overflow，row gather 提高 hash table 并行性。

<strong>缺点：</strong>row split 的方法需要加载 A 多次，同时会破坏 CSR 输出格式。

<strong>对 B 进行cache：</strong>

OP 会产生大量的 PO 难以片上 merge，而 Gust 又需要频繁读取 B，因此如果能够 cache B 那么对系统性能会有大幅提升。

在 Gust product 中，比如 
$a_{0} \ a_1$ 两行在不同的时间内被计算，如果 
$a_{00}\ a_{10}$ 都是 non-zero，那么 
$b_0$ 行在这两拍都会被用到。也就是说，如果 A 矩阵的列上相邻元素的距离越短，那么 B 矩阵对应行的访问在时间上具有局限性。对数据集进行测试，发现 A 矩阵的列上相邻元素的距离确实不是很大，因此以行为 block 对 B 进行 cache 会是有效的。

<strong>减少 hash table overflow：</strong>

如果本次计算的对应输出行的有效数过少，则 hash table 利用率过低，且计算并行性减少。而如果有效数过多，则会导致 hash table overflow。

为此，本文使用 pre-scanning 的方法可以检测本次计算对应输出行的 storage，如果小于 hash table 就一次算多行，如果大于 hash table 就进行 split，从而避免了 hash table overflow 导致的 dram access( 同时，Gust product 相比于 outer product，只会产生一行的 partial output，因此这种 split 的方法 tradeoff 比较小 )。

### 2.1 电路架构


![](https://pic3.zhimg.com/v2-811a6b488e343bde717b24d2107efe8e_r.jpg)电路结构<strong>A Reader：</strong>3-FIFO 结构，顺序取值。

<strong>B cache：</strong>分为 row pointer cache 和 col-val cache。row pointer cache 32KB 16-way associative , 16 banks( <strong>corresponding to 16 parallelism</strong> ) , 8B block( adjacent row pointers,4B+4B )。col-val cache 64B block。

<strong>FMUL：</strong>16 double float mul，每个 mul 对应一个 hash unit，根据 row column 计算哈希函数生成 key。

<strong>HASH TABLE：</strong>由16个 HT Bank 构成（corresponding to 16 parallelism），每个 HT BANK 由1个加法器，16个 scratchpad 和16个 comparator 构成。(hash table 在遍历的时候会造成大量的开销，因此再分成16来并行遍历比较)。每个 hash entry 是16B（4B row 4B column 4B value）。hash table 为256KB或512KB，最大可容16384个 non-zero，对于大部分 Gust product 而言够用了，更大只能 off-chip。

<strong>C Writer：</strong>从hash table中得到本输出行的 non-zero 数，col-val，然后以CSR的格式输出。

### 2.2 pre-scanning


![](https://pic3.zhimg.com/v2-76a3210a4bef418c556745f6a995fbb8_r.jpg)row splitting使用近似算法计算输出行的non-zero，总是大于等于实际的non-zero。当近似得到的数大于 hash table 的 storage capacity 时，进行 row splitting。但这样会导致 A 矩阵需要被读多次，且输出不是规则的 CSR 格式。（本质上就是 tilng，并且在开始计算前要先遍历一遍，tradeoff）

### 2.3 B cache Replacement Policy


![](https://pica.zhimg.com/v2-c91937ca907aa99fab10fc0f70228c78_r.jpg)替换策略与缓存参数B cache 的替换策略和 SpArch 一样也是基于 distance 的，通过 A Reader 的 Column Buffer 可以计算得到 distance，来指导替换，即 look-ahead in A-metadata。

3 Gamma
<strong>优点：</strong>设计了一个高效能 merger，得益于 Gust，merger 效率很高，电路简单。输入输出都是 CSR。

在 Selective Coordinate-Space Tiling 和 task 分割时使用近似估计，无需像 InnerSP 一样进行遍历，tradeoff 小。

Gamma 采用 Gust，设计了一个线性的 merger 和一个 fiber cache。

### 3.1 merger & PE

<strong>merger：</strong>每个 PE 负责一行。如左图所示为 merger 的算法，其有两个关键参数，radix 和 throughput，radix 即为图中列 fifo 的数量，对应一次能处理本行的 non-zero 数量。radix 的增长和面积的增长是线性的。throughput 即 merger 输出的数量，和面积成平方关系，因为 throughput 越多对应比较器和乘法器也越多。Gamma 选用 64-radix 和 1-throughput，如果本行 non-zero 数量大于64就只能将 PO 存在 cache 中。

在 PO merge 阶段，为了复用 merger，增设 scaling factor regfile，如果是计算 A*B，那么 scaling factor 就是 a 的值，如果是进行 PO merge，就是1。PE 中的存储也是采用的 metadata 和 data 分别存储的方案。

![](https://pic3.zhimg.com/v2-07c063209af407b40b83a8c2cd17a40e_r.jpg)merger 和 PE 设计
### 3.2 cache


![](https://picx.zhimg.com/v2-44412bf84b548ca534ad0aa5754e16b3_r.jpg)overall design and cache designcache 需要暂存的只有 B 和 C 的 PO，因为 A 和 C 的最终输出都没有复用机会。Gamma 对这两种数据进行统一管理，和 InnerSP 一样使用多 bank，同时使用类似的非随机性替换算法。

cache 设计在 read write 基础上增加 fetch 和 consume。将cache和buffer的优点进行融合。

fetch 和 read 对应 B。当一个fetch请求将数据加载到某一cacheline时，该line的优先级<strong>增加</strong>。当一个read请求访问该line时，该line的优先级<strong>减少</strong>，替换时替换优先级最小的。consume 和 write 对应 C PO。consume 表示 PO 被 PE 使用，所以该 cacheline 可以直接置为 invalid，因为 PO 只会被使用一次，用来 merge。

### 3.3 scheduler 设计

在 row-A 的 non-zero 大于 radix 时，需要进行任务分割。SpArch 使用 huffman tree 的任务分割方式，来尽量<strong>减少片外访问</strong>，而 Gamma 的部分结果主要存放在片内，所以考虑的方向主要是<strong>并行性</strong>和<strong>较少节点</strong>(也即较少的 PO，较少占用 cache)。为了实现更大并行性，其使用 <strong>balanced tree</strong>，可以在<strong>不同的 PE 上并行计算</strong>同一行，为了<strong>较少节点</strong>，使用 <strong>top full tree</strong>。在 PE 任务分配时，<strong>父节点优先分配</strong>，从而使 cache 占用率减小。

![](https://pic2.zhimg.com/v2-3e8e387b4bc185ba9adbbae0a254724b_r.jpg)balanced tree & topfull tree
### 3.4 preprocessing

Gamma 使用 preprocessing 来应对两种恶劣情况：1. 相邻 A-row 的 non-zero 分布在不同列上，导致 B-row cache 利用率低，所以需要 row-reorder. 2. A-row 的 non-zero 太多导致缓存 B 时 cache 占用，以及 PE 间 task 的 iteration 太多，所以要切成 sub-row。sub-row 切分发生在 row-reorder 之前，因为要在 sub-row 上进行 row-reorder。relying on <strong>auxiliary data for indirections</strong> or by <strong>modifying the memory layout of A</strong>.

使用贪心算法进行 Affinity-Based Row Reordering

![](https://picx.zhimg.com/v2-1605487be47d05ac17b3633d3f8b5b17_r.jpg)row-reorder algorithmSelective Coordinate-Space Tiling：只有当 row-A 很 dense 时才进行 Tiling，判断标准是，rows of A whose footprint to hold rows of B is estimated to be above <strong>25% of the FiberCache capacity</strong>(the estimated footprint is the <strong>length of A’s row</strong>times<strong>the average number of nonzeros per row of B</strong>). 使用估计的方法<strong>无需遍历</strong>，所以 tradeoff 比 InnerSP 要小得多。

同时，为了减少因 tiling 产生的 PO merge 的次数，本文利用 <strong>merger's ratix</strong> 来进行分块，也就是说，每行最多分为 <strong>R 个子行</strong>，保证可以一次 merge 完成，减少反复的片外访存。在tiling时不是按元素数量进行均匀tiling，而是按照 <strong>Coordinate-Space</strong> 进行<strong>均匀 tiling</strong>，the ith subrow having the nonzeros within an even subrange [iK/R, (i +1)K/R)，这样在进行 row-reordering 时容易获得更大的 <strong>affinity</strong>。（子行间无 affinity，但原始行的对应子行间存在 affinity，如 
$a_0$ 被分为 
$a_{00}a_{01}a_{02}$ 三个子行，
$a_1$ 被分为 
$a_{10}a_{11}a_{12}$ 三个子行），则Selective Coordinate-Space Tiling 时 
$a_{00}$ 与 
$a_{10}$ 更易具有 <strong>affinity</strong>。

## 4. ASA

针对传统 Gust 算法在使用 <strong>hash table</strong>进行 <strong>scatter</strong> 时(sparse accumulation (SPA)) hash probing 难以<strong>分支预测</strong>，无法<strong>掩盖延迟</strong>，hash collision 时<strong>线性查找费时</strong>等问题进行 near-processor 的改进，作为协处理器辅助软件，进行<strong>软硬件协同设计</strong>。即将 hash table 设计为 cache 的形式，使用 <strong>key</strong>作为 <strong>index</strong>来查找 <strong>cache</strong>，并且 <strong>block size 很小</strong>。避免传统 address 索引+大 block size 在<strong>稀疏情况下的缺点</strong>。其他文章都不太详细介绍硬件 hash table 的设计，<strong>这篇可以看作一个补充</strong>。

其实 ASA 就是一个 hash table 加速协处理器。

![](https://pic2.zhimg.com/v2-6e96d6ec7993dc20b9e13a1c91b30511_r.jpg)SpGEMM 的软件算法实现其中，<strong>16-19 就是 hash collision 和 probing 的问题，</strong>是本文重点解决的部分。

![](https://picx.zhimg.com/v2-3df9143cf12e76be8810dd320d65276f_r.jpg)hash table 拆分通常在<strong>软件</strong>中会通过 <strong>Symbolic(A,B)</strong> 函数来 <strong>AllocateHashTable</strong>，然而硬件中无法动态进行内存分配。实验发现大部分的 Hash table size 都<512，且在软件中通常进行任务划分，<strong>每个 processor 计算 C 的子矩阵（tiling）</strong>。所以常见的 cache 配置( <strong>8-way, 8 KB cache with an 8 B block size</strong> )中就可以避免大部分的 conflict。因此在硬件上使用固定大小的 cache 也是可以接受的。

![](https://pic3.zhimg.com/v2-96805569d94eebd14aebb8ee09e7828a_r.jpg)hardware probing and accumulation作为一个协处理器，与处理器有一个扩展指令接口，传入(key,row,value)，key 查找 cache set 然后 row 进行 tag 比较。hit 就进行相加 miss 就进行写入 overflow 就使用 <strong>LRU</strong> 进行 victim cache set 替换。overflow 时会写入到一个 <strong>FIFO queue</strong>中。同时使用流水线优化带宽（<strong>readcache-accumulate-writeback</strong>），可能会有连续两个周期访问同一个 key，为避免 <strong>stall</strong>如图中加法器模块还设计了一个寄存器和一个 MUX，类似于 vortex-gpgpu 中的 read_during_write。

ASA 运行分为 hardware probing and accumulation、hardware gathering、software check vector size and address、software sort and merge 四个阶段。在运行之初<strong>软件会分配一段 FIFO queue</strong>数据结构的内存区域给 ASA 使用，在阶段1和阶段2会分别将<strong>victim cache set 的内容</strong>，和<strong>计算完成要写回的内容回写到</strong>这一段 FIFO queue 中，实现上作为主机使用 <strong>store</strong>指令完成。在阶段2和3由 CPU 负责 <strong>sort 和 merge</strong>。

![](https://pic3.zhimg.com/v2-b0fe223baa54f1d91032005541ed5ef6_r.jpg)自定义扩展指令
![](https://pica.zhimg.com/v2-d2f1fe6aea78d41ee569b48e2f608590_r.jpg)ASA 算法相比于 Algorithm1，ASA 算法无需 Symbolic 阶段，CPU 直接分配一个略大于 cache 大小的内存空间即可。如果不够 ASA 会动态再向 CPU 申请。因为不会 overflow 太多，所以 AdditionalMerge 也不会占用太多时间。