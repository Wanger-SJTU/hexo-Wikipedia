---
title: (1 封私信) 详解卷积中的Winograd加速算法
date: "2020-09-30 00:00:00"
updated: "2020-09-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/模型部署那些事/详解卷积中的Winograd加速算法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/260109670
---


### <strong>1. 为什么会引入WinoGrad？</strong>

做过ACM/OI的朋友大家应该对FFT并不陌生，我们知道对于两个序列的乘法通过FFT可以从原始O(n^2)复杂度变成O(nlogn)，所以我们就会想着FFT这个算法是否可以应用到我们计算卷积中来呢？当然是可以的，但是FFT的计算有个问题哦，会引入复数。而移动端是不好处理复数的，对于小卷积核可能减少的计算量和复数运算带来的降速效果是不好说谁会主导的。所以在这种情况下，针对卷积的WinoGrad算法出现了，它不仅可以类似FFT一样降低计算量，它还不会引入复数，使得卷积的运算加速成为了可能。因此，本文尝试从工程实现的角度来看一下WinoGrad，希望对从事算法加速的小伙伴有一些帮助。

### <strong>2. 为什么会有这篇文章？</strong>

最近尝试给MsnhNet做3&#x00D7;3" role="presentation">3×33\times 3卷积的WinoGrad实现，然后开始了解这个算法，并尝试参考着NCNN来理解和动手写一下。参考了多篇优秀的讲解文章和NCNN源码，感觉算是对这个算法有了较为清楚的认识，这篇文章就记录一下我在实现3&#x00D7;3" role="presentation">3×33\times 3并且步长为1" role="presentation">11的WinoGrad卷积时的一些理解。这篇文章的重点是WinoGrad卷积的实现，关于WinoGrad卷积里面的变化矩阵如何推导可以看梁德澎作者的文章：[详解Winograd变换矩阵生成原理](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/_CKl1cdWHziUYYlG6tuQmA) （听说后续他会做个视频来仔细讲讲QAQ)，现在就假设我们知道了WinoGrad的几个变换矩阵。如果你不知道也没关系，因为有一个Python工具包可以直接帮我们计算，地址为：`https://github.com/andravin/wincnn` 。然后现在我们就要用拿到的这几个矩阵来实现WinoGrad算法，听起来比较简单，但我们还是得一步步理清楚是不。

### <strong>3. WinoGrad算法原理</strong>

$WinoGrad算法起源于1980年，是Shmuel Winograd提出用来减少FIR滤波器计算量的一个算法。它指出，对于输出个数为m" role="presentation">mm，参数个数为r" role="presentation">rr的FIR滤波器，不需要m&#x00D7;r" role="presentation">m×rm\times r次乘法计算，而只需要u(F(m,r))=m+r&#x2212;1" role="presentation">u(F(m,r))=m+r−1u(F(m,r))=m+r-1次乘法计算即可。$

下面是一个经典例子，以1维卷积为例，输入信号d=[d0,d1,d2,d3]T" role="presentation">d=[d0,d1,d2,d3]Td=[d_0,d_1,d_2,d3]^T，卷积核g=[g0,g1,g2]T" role="presentation">g=[g0,g1,g2]Tg=[g_0,g_1,g_2]^T，则卷积可以写成如下矩阵乘法形式：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_1329f9e730a6.jpg)

式子1如果这个计算过程使用普通的矩阵乘法，则一共需要<strong>「6次乘法和4次加法」</strong> 。

但是，我们仔细观察一下，卷积运算中输入信号转换得到的矩阵不是任意矩阵，其有规律的分布着大量的重复元素，例如第一行的d_1和d_2，卷积转换成的矩阵乘法比一般乘法的问题域更小，所以这就让优化存为了可能。

然后WinoGrad的做法就是：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_914fdd7fe2b6.jpg)

式子2其中，

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_3185b7d67479.jpg)

等式3**

我们知道，在CNN的推理阶段，卷积核上的元素是固定的，所以上式中和g相关的式子可以提前算好，在预测阶段只用计算一次，可以忽略。所以这里一共需要「4次乘法加4次加法」**。

相比于普通的矩阵乘法，使用WinoGrad算法之后乘法次数减少了，这样就可以达到加速的目的了。

这个例子实际上是<strong>「1D的WinoGrad算法」</strong>，我们将上面的计算过程写成矩阵的形式如下：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_f0863745b222.png)

式子4其中，\odot表示element-wise multiplication（Hadamard product）对应位置相乘。其中，

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_e694120f65a0.jpg)

相关矩阵解释

- g：表示卷积核
- d：表示输入信号
- G：卷积核变换矩阵，尺寸为(m+r-1)\times r
- B^T：输入变换矩阵，尺寸(m+r-1)\times (m+r-1)
- A^T：输出变换矩阵，尺寸m\times (m+r-1)
所以整个计算过程可以分为4步：

- 输入变换
- 卷积核变换
- 外积
- 输出变换
然后我们将1D的WinoGrad扩展到2D，就可以实现3\times 3卷积的加速了，那么如何从1维扩展到2维呢？公式如下：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_cee6fd86681c.jpg)

2D WinoGrad矩阵形式计算推导其中，g为r\times r的卷积核，d为(m+r-1)\times (m+r-1)的图像块，我们把上面的F(2,3)扩展到F(2\times 2, 3\times 3)，先写成矩阵乘法的方式：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_cf0d49c27f35.jpg)

(2x2,3x3) 图片来自https://www.cnblogs.com/shine-lee/p/10906535.html上图表示我们将卷积核的元素拉成了一列，将输入信号每个滑动窗口中的元素拉成了一行。注意图中红线分成的矩阵块，每个矩阵块中重复元素的位置与一维相同，即：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_1bb68c3cf786.jpg)

二维和一维的WinoGrad矩阵关系然后，令D_0=[k_0,k_1,k_2,k_3]^T，即图像窗口中的第0行元素，然后D_1,D_2,D_3表示第1,2,3行，W_0=[w_0,w_1,w_2]^T，然后可以推导：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_6bbe139c65a8.jpg)

2D WinoGrad矩阵形式计算推导在上面的推导中，A^T[(GW_0)\odot (B^TD_0)]表示长度为4的D_0和长度为3的W_0卷积结果，结果为长度为2的列向量，其中(GW_0)和(B^TD_0)均为长度为4的列向量。

进一步，[(GW_0)\odot (B^TD_0) + (GW_1)\odot (B^TD_1)+(GW_2)\odot (B^TD_2)]可以看成3对长度为4的列向量两两对应位置相乘再相加，结果为长度为4的列向量，也可以看成是4组长度为3的行向量的点积运算。

同样，[(GW_0)\odot (B^TD_1)+(GW_1)\odot (B^TD_2)+(GW_2)\odot (B^TD_3)]也是3对长度为4的列向量的内积运算。

然后类似1D WinoGrad算法，我们考虑两者的重叠部分(B^TD_1)和(B^TD_2)，刚好对应1D WinoGrad中G[W_0,W_1,W_2]的每一行在B^T[D_0,D_1,D_2,D_3]的对应行上进行1维卷积，基于上面推导的1D WinoGrad公式，行向量的卷积只需要将所有左乘的变换矩阵转置后变成右乘即可。

然后上面的推导就做完了。

下图表示2D WinoGrad的示意图：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_b767d77a2db3.jpg)

2D WinoGrad示意图这个时候，WinoGrad算法的乘法次数为4\times 4=16，而如果直接卷积乘法次数为36，<strong>「降低了2.25倍的乘法计算复杂度」</strong>。

### <strong>4. 从工程角度来看WinoGrad</strong>

下面我们就从一个实际例子来说，如何利用WinoGrad来实现3\times 3并且步长为1的卷积运算。基于上面介绍的2D WinoGrad的原理，我们现在只需要分4步即可实现WnoGrad算法：

- 第一步就是对输入卷积核的变换：U=GgG^T
- 第二步就是对输入数据的变换：V=B^TdB
- 第三步就是对M矩阵的计算：M=\sum U \odot V
- 最后一步就是结果的计算：Y=A^TMA
接下来我们就以WinoGrad实现3\times 3并且步长为1的卷积计算为例子，来理解一下WinoGrad的工程实现。

### <strong>4.1 对输入卷积核进行变换</strong>

这一步就是对卷积核进行变化，公式为：U_{k,c}=Gg_{k,c}G^T，其中k表示输出通道标号，c表示输入通道标号，一个U(k,c)对应卷积核的一个g(k,c)。由于我们要实现的是F(6\times 6,3\times 3)，因此G是一个(m+r-1)\times r=8\times 3的矩阵，我们不难写出这部分代码（其中，G矩阵可以通过`https://github.com/andravin/wincnn` 这个工具进行计算）：

`// 矩阵G
        const float ktm[8][3] = {
            {1.0f,      0.0f,      0.0f},
            {-2.0f / 9, -2.0f / 9, -2.0f / 9},
            {-2.0f / 9, 2.0f / 9, -2.0f / 9},
            {1.0f / 90, 1.0f / 45, 2.0f / 45},
            {1.0f / 90, -1.0f / 45, 2.0f / 45},
            {1.0f / 45, 1.0f / 90, 1.0f / 180},
            {1.0f / 45, -1.0f / 90, 1.0f / 180},
            {0.0f, 0.0f, 1.0f}
        };

        const int kernelTmSize = inChannel * 8 * 8;

#if USE_OMP
    #pragma omp parallel for num_threads(OMP_THREAD)
#endif
        for(int outc = 0; outc 

通过这段代码，所有的卷积核g都被转换成了U，存放在了`kernel_tm`上，一行代表一个U(k,c)，`kernel_tm`的内存排布如下图所示：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_beea25408b73.jpg)

$U_{k,c}的内存排布其中W=64的原因是因为F(6x6,3x3)需要每一个输入图像块(tile)的大小为8\times 8，权重块也对应8\times 8，这样才可以做卷积运算（eltwise_mult）。$

然后上次我们讲到数据Pack的优势[详解Im2Col+Pack+Sgemm策略更好的优化卷积运算](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/lqVsMDutBwsjiiM_NkGsAg)，所以这里仍然使用NCNN的Pack策略来获得更好的访存，即将上面的`kernel_tm`进行一次重排，将H维度全部压到W维度上，另外再对C维度做一个额外的4倍压缩，来获得更好的访存。

将H的维度全部压到W维度上示意图：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_d6c039ee4cda.jpg)

将kernel_tm的H维度全部压到W维度变成一个扁平的Blob然后在这个基础上，将C维度进行进一步压缩，这个时候还需要注意的是对于每一个输出通道，我们在H\times W这个平面上是同时拿出了2行，也就是拿出了128个数据，然后进行交织排列，最后获得`kernel_tm2`。这里以输出通道的前4个为例，即刚好处理8个U矩阵之后结果矩阵`kernel_tm2`应该是长什么样子，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_ff86d5ad5aa0.jpg)

Pack策略之后的矩阵kernel_tm2就长这个样子这部分的代码实现如下：

`int nnOutchannel = outChannel >> 2;
        int remainOutChannel = nnOutchannel 

### <strong>4.2 对输入数据进行变换</strong>

对卷积核进行变换之后，接下来就轮到对输入矩阵进行变换了，即对V矩阵进行计算，V_{c,b}=B^Td_{c,b}B。上面我们已经提到过，对于卷积核获得的每一个U_{k,c}，我们都需要一个对应的8\times 8的图像块(tile)和它做卷积运算（eltwise_multiply）。所以这里我们首先需要确定输入数据可以被拆成多少个图像块，并且我们需要为变换矩阵V申请空间，从第三节可知：输入变换矩阵，尺寸为(m+r-1)\times (m+r-1)，即每个小块的变换矩阵都为(6+3-1)\times (6+3-1)=8\times 8，但是输入特征图长宽不一定会被8整除，这个时候就需要对输入特征图进行扩展(padding)，这部分预处理的代码实现如下：

`// Vc,b = B^Td_{c,b}B
        
        // 输出特征图如果长宽不够需要Padding
        int outW = (outWidth + 5) / 6 * 6;
        int outH = (outHeight + 5) / 6 * 6;

        int W = outW + 2;
        int H = outH + 2;
        int Top = 0;
        int Left = 0;
        int Bottom = H;
        int Right = W;
        int PadHeight = Bottom - Top;
        int PadWidth = Right - Left;
        int PadSize = PadHeight * PadWidth;
        float *srcPadding = new float[PadHeight * PadWidth * inChannel];
        PaddingLayerArm now;
        now.padding(src, inWidth, inHeight, inChannel, srcPadding, 0, H - inHeight, 0, W - inWidth, 0);
        
        int w_tm = outW / 6 * 8;
        int h_tm = outH / 6 * 8;
        int tiles = w_tm / 8 * h_tm / 8;

        int src_tm_channel = inChannel;
        int src_tm_h = 16 * w_tm / 8 * h_tm / 8;
        int src_tm_w = 4;
        
        int src_tm_size = src_tm_h * src_tm_w;
        float *src_tm  = new float[src_tm_channel * src_tm_h * src_tm_w];
`

注意上面`src_tm`的形状，这是考虑到了卷积核变换矩阵已经执行了Pack策略，所以这里为了方便后续的卷积计算和进行指令集加速，同样将`src_tm`进行Pack，这个Pack是直接规定计算完之后4个4个岔开存储的方式来实现的。另外，输入Blob的一个Channel对应了输出Blob的一个Channel。

然后我们再通过WinCNN工具可以获得B矩阵和B的转置矩阵，并确定V矩阵更好的计算策略（指的是可以复用一些中间变量）。

`// BT = 
        // ⎡1   0    -    0         0    -1  0⎤
        // ⎢                                          ⎥
        // ⎢0   1      1    -  -    1    1   0⎥
        // ⎢                                          ⎥
        // ⎢0   -1     1       -   -1    1   0⎥
        // ⎢                                          ⎥
        // ⎢0         -   -     2    1   0⎥
        // ⎢                                          ⎥
        // ⎢0  -          -    -2    1   0⎥
        // ⎢                                          ⎥
        // ⎢0   2      4    -    -5        1   0⎥
        // ⎢                                          ⎥
        // ⎢0   -2     4         -5    -   1   0⎥
        // ⎢                                          ⎥
        // ⎣0   -1     0         0    -  0   1⎦

        //B = 
        // ⎡1     0     0    0    0   0     0   0    ⎤
     // ⎢0     1     -1        -   2    -2   -1   ⎥
     // ⎢- 1     1           4     4   0    ⎥
     // ⎢0     -    -       -     ⎥
     // ⎢ - -  -   -   -5 -5   0    ⎥   
     // ⎢0     1     -1    2    2    -  -⎥
     // ⎢-1     1     1    1    1   1     1   0    ⎥
     // ⎢0     0     0    0    0   0     0   1    ⎥

        // 0 = r00 - r06 + (r04 - r02) * 5.25
        // 7 = r07 - r01 + (r03 - r05) * 5.25

        // 1 = (r02 + r06 - r04 * 4.25) + (r01 - r03 * 4.25 + r05)
        // 2 = (r02 + r06 - r04 * 4.25) - (r01 - r03 * 4.25 + r05)

        // 3 = (r06 + r02 * 0.25 - r04 * 1.25) + (r01 * 0.5 - r03 * 2.5 + r05 * 2)
        // 4 = (r06 + r02 * 0.25 - r04 * 1.25) - (r01 * 0.5 - r03 * 2.5 + r05 * 2)

        // reuse r04 * 1.25
        // reuse r03 * 2.5
        // 5 = (r06 + (r02 - r04 * 1.25) * 4) + (r01 * 2 - r03 * 2.5 + r05 * 0.5)
        // 6 = (r06 + (r02 - r04 * 1.25) * 4) - (r01 * 2 - r03 * 2.5 + r05 * 0.5)
`

接下来我们就可以开始计算V矩阵了，代码如下：

`#if USE_OMP
    #pragma omp parallel for num_threads(OMP_THREAD)
#endif
        for(int q = 0; q 

可以看到这个地方不仅计算了V矩阵，并在存储时就对V矩阵进行了重新排列，以适应卷积核变化矩阵的Pack结果，方便后面进行卷积计算的加速同时获得更好的访存，这个过程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_4c94546f03cd.jpg)

对输入矩阵进行变换的过程
### <strong>4.3 计算M矩阵</strong>

M矩阵的计算公式为：

$M_{k,b}=\sum_{c}U_{k,c}\odot V_{c,b}$

其中，k代表输出通道数，b表示tile序号。

由于上面输入图像块已经执行了Pack策略，这里只需要将对应小块进行乘加操作即完成了M矩阵的计算，这部分的代码实现如下：

`#if USE_OMP
    #pragma omp parallel for num_threads(OMP_THREAD)
#endif
        for(int cc = 0; cc 

至此，我们获得了M矩阵，矩阵大概长下面这样子，它仍然是交错排列的：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_78114df4fc6e.jpg)

M矩阵长得和V矩阵有点像，主要是通道维度变了
### <strong>4.4 计算结果Y矩阵</strong>

现在就到了最后一步了，我们需要计算结果矩阵Y，公式为：

Y_{k,b}=A^TM_{k,b}A

其中k表示输出通道数，b表示tile标号，这部分和上面卷积核的计算类似，代码如下：

`// Yk,b=A^TMk,bA
// AT=
// ⎡1  1  1   1    1    1      1    0⎤
// ⎢                                 ⎥
// ⎢0  1  -1  2   -2      -   0⎥
// ⎢                                 ⎥
// ⎢0  1  1   4    4          0⎥
// ⎢                                 ⎥
// ⎢0  1  -1  8   -8      -   0⎥
// ⎢                                 ⎥
// ⎢0  1  1   16  16        0⎥
// ⎢                                 ⎥
// ⎣0  1  -1  32  -32    -  1⎦

        // 0 = r0 + (r1 + r2) + (r3 + r4)     + (r5 + r6) * 32
        // 1 =      (r1 - r2) + (r3 - r4) * 2 + (r5 - r6) * 16
        // 2 =      (r1 + r2) + (r3 + r4) * 4 + (r5 + r6) * 8
        // 3 =      (r1 - r2) + (r3 - r4) * 8 + (r5 - r6) * 4
        // 4 =      (r1 + r2) + (r3 + r4) * 16+ (r5 + r6) * 2
        // 5 = r7 + (r1 - r2) + (r3 - r4) * 32+ (r5 - r6)

        float *dest_tm2 = new float[outW * outH * outChannel];
        const int dst_tm_size2 = outW * outH;
        

        const int outSize = outHeight * outWidth;

#if USE_OMP
    #pragma omp parallel for num_threads(OMP_THREAD)
#endif
        for(int cc = 0; cc 

这部分代码就实现了M矩阵汇聚并利用A矩阵获得了最终的结果Y。这个过程上一节图中已经画了，这里主要实现的是图中的右半部分：

![](/images/collections/0.raw/zhihu/%E6%A8%A1%E5%9E%8B%E9%83%A8%E7%BD%B2%E9%82%A3%E4%BA%9B%E4%BA%8B/asset/img_78114df4fc6e.jpg)

Y矩阵汇聚存放获得输出Blob但是需要注意的是这里获得的Y有可能是多了几行或者几列，也就是拖尾为0的部分，所以需要把这一部分Crop掉，才能获得我们最终outHeight * outWidth * outChannel的结果特征图。Crop部分的代码如下：

`//crop
        for(int cc = 0; cc 

至此，WinoGrad的算法流程结束，我们获得了最后的卷积计算结果。

### <strong>5. WinoGrad算法进一步加速</strong>

上面无论是针对U,V,M还是Y矩阵的计算我们使用的都是暴力计算，所以接下来可以使用Neon Instrics和Neon Assembly技术进行优化。介于篇幅原因，这里就不贴代码了，有需要学习的可以关注后续MsnhNet的WinoGrad代码部分`https://github.com/msnh2012/Msnhnet/blob/master/src/layers/arm/MsnhConvolution3x3s1Winograd.cpp`。这个代码实现的思路取自开源框架NCNN，在此表示感谢NCNN这一优秀工作(github：`https://github.com/Tencent/ncnn`)。

### <strong>6. 何时开启WinoGrad卷积</strong>

和Sgemm用于3\times 3卷积一样，我们也需要思考WinoGrad在何种情况下是适用的，或者说是有明显加速的。这篇文章介绍的WinoGrad卷积是针对NCHW这种内存排布的，然后我们来看一下NCNN在基于NCHW这种内存排布下，是在何种情况下启用WinoGrad(F(6,3))？

通过查看NCNN的源码(`https://github.com/Tencent/ncnn/blob/master/src/layer/arm/convolution_arm.cpp`)可以发现，只有在输入输出通道均>=16，并且特征图长宽均小于等于120的条件下才会启用WinoGrad卷积。

那么这个条件是如何得出的，除了和手工优化的`conv3x3s1`(`https://github.com/msnh2012/Msnhnet/blob/master/src/layers/arm/MsnhConvolution3x3s1.cpp`)在不同条件下做速度对比测试之外，我们也可以感性的分析一下。

第一，WinoGrad算法设计到几个矩阵变换，如果计算量不大，这几个矩阵变换的成本占计算总成本的比例就越大，所以WinoGrad应当是在计算量比较大时才能有效，如VGG16。

第二，当计算量比较大的时候，又要考虑到Cache命中率的问题，这个时候WinoGrad访存可能会比直接手动优化更差，导致速度上不去。

### <strong>7. 速度测试</strong>

由于笔者还未实现完整Neon Instrics和Assembly部分，所以暂时无法给出速度对比。尝试从NCNN的BenchMark中找到WinoGrad的加速效果大概是什么样的，但只能找到各个网络在各种板子上的整体推理速度，没有WinoGrad F(6,3)单独的速度对比，等国庆争取补上来吧。

### <strong>8. 结语</strong>

关于WinoGrad的原理介绍还有工程实现（基于NCNN）暂时就讲到这里了，有问题欢迎在评论区讨论哦。我刚入门移动端优化几个月还有非常多知识需要学习，nihui，虫叔，白牛，大老师他们都是高人，这几个月从他们的文章受益良多，非常感谢！

### <strong>9. 致谢</strong>

- [https://zhuanlan.zhihu.com/p/72149270](https://zhuanlan.zhihu.com/p/72149270)
- https://www.cnblogs.com/shine-lee/p/10906535.html
- [https://zhuanlan.zhihu.com/p/81201840](https://zhuanlan.zhihu.com/p/81201840)

### <strong>10. 广告时间</strong>

MsnhNet是一款基于纯c++的轻量级推理框架，本框架受到darknet启发。

项目地址：[https://github.com/msnh2012/Msnhnet](https://link.zhihu.com/?target=https%3A//github.com/msnh2012/Msnhnet) ，欢迎一键三连。

本框架目前已经支持了X86、Cuda、Arm端的推理（支持的OP有限，正努力开发中），并且可以直接将Pytorch模型（后面也会尝试接入更多框架）转为本框架的模型进行部署，欢迎对前向推理框架感兴趣的同学试用或者加入我们一起维护这个轮子。

最后，欢迎加入Msnhnet开发QQ交流群，有对项目的建议或者说个人的需求都可以在里面或者github issue提出。

https://qm.qq.com/cgi-bin/qm/qr?k=9sgEvI4bYQsnc8afezawKYz9uEqDn3RE&authKey=ItS0ncnm5kUBys1QXcW16xRKCZ91gwNtkhv1xCxRYxEWdikho/zOamNWL9sSFwK+&noverify=0 (二维码自动识别)

欢迎关注GiantPandaCV, 在这里你将看到独家的深度学习分享，坚持原创，每天分享我们学习到的新鲜知识。( • ̀ω•́ )✧

有对文章相关的问题，或者想要加入交流群，欢迎添加BBuf微信：

https://u.wechat.com/MPWFDnmCPu6zgf5YUtdpT_U (二维码自动识别)
