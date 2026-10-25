---
title: transformer硬件加速器总结
date: "2023-05-31 00:00:00"
updated: "2023-05-31 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/transformer硬件加速器总结/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/633571685
---


来自以前的一次调研，在这里做个存档，主要是利用FPGA来加速transformer计算，包含软硬件协同设计的加速器

### transformer计算

针对原始的Attention is all you need论文中提出的transformer

#### 整体架构

**

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_b91792c4b1b3.jpg)

#### 计算步骤

- 获取输入句子的每一个单词的表示向量 X，X由单词的 Embedding（Embedding指从原始数据提取出来的Feature） 和单词位置的 Embedding 相加得到。

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_d1824a46ea07.jpg)

单词Embedding：Word2Vec、Glove 等算法预训练得到，也可以在 Transformer 中训练得到。位置Embedding：pos表示位置，d表示维度PE（pos，2i）=sin（pos/10000^(2i/d) )PE（pos，2i+1）=cos（pos/10000^(2i/d) )

-  将得到的单词表示矩阵传入 Encoder 中，经过 6 个 Encoder block 后可以得到句子所有单词的编码信息矩阵 C，单词向量矩阵用 X(n,d) 表示， n 是句子中单词个数，d 是表示向量的维度 (论文中 d=512)。每一个 Encoder block 输出的矩阵维度与输入完全一致。
 
-  将 Encoder 输出的编码信息矩阵 C传递到 Decoder 中，Decoder 依次会根据当前翻译过的单词 1~ i 翻译下一个单词 i+1。在使用的过程中，翻译到单词 i+1 的时候需要通过 Mask (掩盖) 操作遮盖住 i+1 之后的单词。
 

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_64c3a309f9ee.jpg)

#### 自注意力机制

MHA：encoder中1个，decoder中2个

Add：残差连接，防止网络退化

Norm：对每一层的激活值进行归一化

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_b2d7e77c06f1.jpg)

#### 多头注意力机制

s：句子的max_length,未达到的需要padding

dmodel：设定的维度，512

Wq：dmodel，dmodel / num_head

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_26be50220452.jpg)

#### FFN前馈层

两个Linear层，一个ReLU层

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_734a27a3166e.jpg)

#### 主要计算总结

- embedding
- GEMM 
- scaled softmax
- LayerNorm

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_21737e171edc.jpg)

### Hardware Accelerator for Multi-Head Attention and Position-Wise Feed-Forward in the Transformer

>  S. Lu, M. Wang, S. Liang, J. Lin, and Z. Wang, “Hardware Accelerator for Multi-Head Attention and Position-Wise Feed-Forward in the Transformer,” in *2020 IEEE 33rd International System-on-Chip Conference (SOCC)*, Las Vegas, NV, USA: IEEE, Sep. 2020, pp. 84–89. doi: 10.1109/SOCC49529.2020.9524802.

-  拆分transformer中大矩阵：多头注意力concat后的大矩阵乘法、FFN层两个大矩阵乘法
 
-  根据计算流设计脉动阵列
 
-  优化非线性函数计算
 
硬件架构如下：

-  SA Module：s x 64，逐列输出结果矩阵
 
-  softmax：代数变换，硬件实现参照一篇APCCAS论文
 

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_a47ce993f21f.jpg)

实验结果：

-  对softmax模块进行定点数量化，其他模块进行int8量化：BLEU 23.88 -> 23.57 机器翻译任务
 
-  与GPU（NVIDIA V100）进行对比。MHA ResBlock加速14.6倍。FFN ResBlock加速3.4倍。
 
展望：只对两个Resblock分别加速，未对完整transformer加速

### A^3: Accelerating Attention Mechanisms in Neural Networks with Approximation

>  T. J. Ham *et al.*, “A^3: Accelerating Attention Mechanisms in Neural Networks with Approximation,” in *2020 IEEE International Symposium on High Performance Computer Architecture (HPCA)*, San Diego, CA, USA: IEEE, Feb. 2020, pp. 328–341. doi: 10.1109/HPCA47549.2020.00035.

Motivation**:

-  缺陷：注意力机制实现为密集矩阵计算的加速是次优的，注意力机制是基于内容的搜索，大部分内容没有被使用到** 
-  改进：通过近似算法减少计算量，利用并行性和数据路径专门化提高硬件利用率
 
主要方法是基于贪心的候选搜索

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_6a1f34e2eb35.jpg)

K和Q对应元素相乘，每次迭代选取最大值和最小值，并累积在对应行。经过M次选择后，仍为正值的结果为候选项，计算对应行的K和Q的score。其他被剪枝。

### FTRANS: energy-efficient acceleration of transformers using FPGA

>  B. Li *et al.*, “FTRANS: energy-efficient acceleration of transformers using FPGA,” in *Proceedings of the ACM/IEEE International Symposium on Low Power Electronics and Design*, Boston Massachusetts: ACM, Aug. 2020, pp. 175–180. doi: 10..3406567.

将权重转换为块循环矩阵形式（block circulant），使用FFT的乘法方式替代矩阵向量乘法：16倍权重压缩比

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_4153249c95fe.jpg)

PE：

- 矩阵-向量乘法PE       
- FFT PE:Radix-2 Cooley Tukey algorithm        
- softmax PE:分段线性函数逼近
设计自动化和优化：在资源约束前提下给最慢的层分配更多资源

### Accelerating Transformer-based Deep Learning Models on FPGAs using Column Balanced Block Pruning

>  H. Peng *et al.*, “Accelerating Transformer-based Deep Learning Models on FPGAs using Column Balanced Block Pruning,” in *2021 22nd International Symposium on Quality Electronic Design (ISQED)*, Santa Clara, CA, USA: IEEE, Apr. 2021, pp. 142–148. doi: 10.1109/ISQED51717.2021.9424344.

- 列平衡的剪枝方式及存储格式
- 对应剪枝方式的PE
- 不同剪枝策略：0-0.9 每0.1增加剪枝率  ；从0.9到1每0.2增加剪枝率 ；    设置块大小为16和4
列平衡的剪枝：

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_710122e0e1ad.jpg)

存储格式：

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_caa6fbe3a1b6.jpg)

### SpAtten: Efficient Sparse Attention Architecture with Cascade Token and Head Pruning

>  H. Wang, Z. Zhang, and S. Han, “SpAtten: Efficient Sparse Attention Architecture with Cascade Token and Head Pruning,” in *2021 IEEE International Symposium on High-Performance Computer Architecture (HPCA)*, Seoul, Korea (South): IEEE, Feb. 2021, pp. 97–110. doi: 10.1109/HPCA51647.2021.00018.

算法-架构联合设计的加速框架，利用token稀疏性、注意力头稀疏性、量化来降低计算和访存

关键设计:

- 级联token剪枝：利用人类语言的冗余，如各种结构化、修饰性词
- 级联注意力头剪枝：删除不重要的注意力头，通过累积每个head的attention_out的绝对值进行重要性排序
- 渐进式量化：对一小部分token主导的分布进行充分量化，对扁平化的保守量化
- top-k引擎：具有O(n)个时间复杂度，以有效地支持动态token和head选择

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_ff28e8c1663c.jpg)

实验设置：

- SpinalHDL编写，基于Scala的类似于Chisel的HDL框架
- SpAtten未上板运行，而是在Verilator进行仿真 
- 非线性函数如softmax中的指数采用泰勒近似

### Algorithm-hardware Co-design of Attention Mechanism on FPGA Devices

>  X. Zhang, Y. Wu, P. Zhou, X. Tang, and J. Hu, “Algorithm-hardware Co-design of Attention Mechanism on FPGA Devices,” *ACM Trans. Embed. Comput. Syst.*, vol. 20, no. 5s, pp. 1–24, Oct. 2021, doi: 10..

挑战：1.不同大小的权重存储时buffer利用率低下；2.不同大小的权重的计算模式不同

关键设计：

- 内存占用感知压缩
训练时的结构化剪枝方法，逐列剪枝，对权重shape进行约束；剪枝权重后继续训练，最  终进行后训练量化，得到int8的权值

- 统一的计算模式
将MAC计算转换为element-wise向量乘法和加法；将多个操作打包一个具有该计算模式的FPGA DSP

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_9e105d5d8515.jpg)

压缩算法：LayerNorm中的γ作为显著性因子

两阶段剪枝：1.在精度前提下逐列剪枝；2.跨层精细化剪枝

加速器设计：

- 逐列计算，消除冗余；
- 乒乓缓存，掩盖延迟；
- 性能分析：在总体资源约束下，给buffer和计算core分配不同比重资源

### Accelerating attention mechanism on FPGAs based on efficient reconfigurable systolic array

>  W. Ye, X. Zhou, J. T. Zhou, C. Chen, and K. Li, “Accelerating attention mechanism on FPGAs based on efficient reconfigurable systolic array,” *ACM Trans. Embed. Comput. Syst.*, p. 3549937, Jul. 2022, doi: 10..

未使用算法层面剪枝，对硬件设计做了更多优化

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_73eb1ebf82bd.jpg)

step1：DDR控制器将DDR数据读取到位宽转换Bram缓存组

step2：两个SAs用四个循环计算出Q和K

step3：一个SA在两个周期计算Q*K，之后softmax；另一个SA在4个周期计算出V*

step4：两个SA在4个周期并行处理score*V

step5：连接多头注意力结果

step6：读取结果到每个模块的两个SA中并行计算linear

step7：合并结果并输出至DDR

### Auto-ViT-Acc: An FPGA-Aware Automatic Acceleration Framework forVision Transformer with Mixed-Scheme Quantization

>  Lit Z, Sun M, Lu A, et al. Auto-ViT-Acc: An FPGA-aware automatic acceleration framework for vision transformer with mixed-scheme quantization[C]//2022 32nd International Conference on Field-Programmable Logic and Applications (FPL). IEEE, 2022: 109-116

- FPGA感知的混合ViT量化算法，可以充分利用异构FPGA资源，同时最大限度保持精度
- 利用FPGA资源建模的自动ViT加速框架，自动寻找目标FPS的量化比特位宽和混合比率的最佳组合

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_04925dfa9bd4.jpg)

量化方案

- 量化linear层，不量化softmax、layer norm
- 定点量化与PoT量化结合，根据方差分配权值的某一行量化方案
- 关键：混合比率、计算方式、 输出精度对齐
加速框架

- FPGA计算矩阵乘法，CPU负责softmax、GELU等
- 资源建模：DSP适合定点量化，LUT适合PoT量化
- 延迟分析
实验对比

- 位宽：W32A32、W8A8、W4A4、W3A4等
- 量化：纯fix、纯PoT、混合
- 指标：资源、功耗、吞吐、帧率

### Sanger: A Co-Design Framework for Enabling Sparse Attention using Reconfigurable Architecture

>  L. Lu *et al.*, “Sanger: A Co-Design Framework for Enabling Sparse Attention using Reconfigurable Architecture,” in *MICRO-54: 54th Annual IEEE/ACM International Symposium on Microarchitecture*, Virtual Event Greece: ACM, Oct. 2021, pp. 977–991. doi: 10..3480125.

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_62c299fb83ce.jpg)

静态稀疏性：预先决定的，独立于数据；通常采用粗粒度结构，删掉整个块或行；

动态稀疏性：稀疏模式从Q和K动态生成，从而更有效地获得注意力上的冗余，并获得更高的稀疏性

挑战：     

1.运行时确定，在不同样本之间差异性很大    

2.与ReLU稀疏性不同，softmax为隐式稀疏性，其中所有位置都被分配为非零值   

3.高度非结构化，给硬件加速带来挑战

稀疏注意力的剪枝策略**

**

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_c9a7a113c86c.jpg)

1.预测注意力矩阵采用对称线性量化，并在训练中模拟量化，减少误差

2.生成注意力掩码设定全局阈值，在稀疏性和准确性之间进行平衡

3.包装和拆分注意力掩码

硬件数据流**

- dense数据流
**

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_1a7e87d35619.jpg)

​   step1：计算Q和K矩阵乘。Q的一行映射水平PE，K的一行映射垂直PE。PE内累积部分和。

​   step2：计算指数，为softmax做准备。

​   step3：计算S和V矩阵相乘。向右累积。

​   step4：计算softmax的归一化

- sparse数据流
插入bubble进行延迟

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_57941b4318d9.jpg)

​   

​   消除score矩阵的编解码开销；统一SDDMM（密集）和SPMM（稀疏）计算硬件

### 总结

![](/images/collections/0.raw/zhihu/%25E4%25BC%2598%25E5%258C%2596/asset/img_34c093158fba.jpg)

对计算进行简单分类：

#### softmax**

- 对softmax、LayerNorm不采用量化，在FPGA的host CPU上计算
- 以float计算softmax，结果进行定点量化后继续计算
- 指数计算过于昂贵，采用分段线性函数来拟合
- 使用16位定点数来计算softmax
- 将指数操作的e为底数换成2，称为radix-2 softmax
- 将ex转换为2^(x/ln2)，使用查找表来近似

#### layernorm

- 将LayerNorm进行定点数16位量化计算
- FPGA上设计专有硬件模块
- 在cpu上计算

#### GEMM

- 可重构架构，重用硬件模块计算所有GEMM。引入bubble来应对不规则剪枝，避免编解码开销
- 特殊设计的脉动阵列
- 将GEMM乘法转换为其他形式计算如element-wise乘法
