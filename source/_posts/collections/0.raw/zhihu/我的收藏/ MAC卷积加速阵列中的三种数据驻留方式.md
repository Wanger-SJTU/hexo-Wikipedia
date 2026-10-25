---
title: (1 条消息) MAC卷积加速阵列中的三种数据驻留方式
date: "2024-04-24 00:00:00"
updated: "2024-04-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/MAC卷积加速阵列中的三种数据驻留方式/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/694361559
---


> 如果对卷积运算规则不清楚，可以参考：

[![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_33e8cb2f894b.png)ic打工机器：卷积运算扫盲学习-硬件基础5 赞同 · 0 评论 文章](https://zhuanlan.zhihu.com/p/694356231)

> 主要介绍卷积加速阵列中的三种数据驻留方式，理解比较浅，欢迎探讨
知乎排版不美观，可以阅读个人飞书：

https://vv4vfmb5mk.feishu.cn/docx/GLZydDSP3oGIQexFJqdcfOxGnfb?from=from_copylinkvv4vfmb5mk.feishu.cn/docx/GLZydDSP3oGIQexFJqdcfOxGnfb?from=from_copylink

### 卷积运算过程

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_571f0ca9082a.jpg)

图中，

- Input Feature Tensor（IFMAPs）的Size为NHWC：N个输入Tensor，每个Tensor的高为H，宽为W，Channel为C。
- Filter（Kernel）的Size为MKQC：M个卷积核，每个卷积核高为K、宽为Q、Channel为C。这里的Channel数和feature Tensor的Channel数必须一致，而这个M就会对应到输出Tensor的Channel维度。
- Output Feature Tensor（OFMAPs）：N个输出Tensor，每个Tensor高为R，宽为S，Channel为卷积核的数量M。RS和HW、KQ的关系是：

# Padding表示填充的元素行或者列数
# Stride表示步长

```text
R = (H + 2*Padding - K)/Stride + 1
S = (W + 2*Padding - Q)/Stride + 1
```


在硬件实现上，不能做到无限制的并行化，因此Conv的计算通常被展开成7层循环：

Kernel: KL[M,C,K,Q]
Output: OF[N,M,R,S]
在没有Padding，Stride==1的情况下，以OF的维度Size为目标，则H=R+K-1,W=S+Q-1:
Input : IF[N,C,R+K-1,S+Q-1] 
# 7层Conv运算for循环

```cpp
for (n=0; n
```


给出三个点的计算过程方便下面的理解：不妨设 C = N = M = 1，weight的Size为3x3，也就是 KL[1,1,3,3]，OF[1,1,R,S] 计算三个点：O11，O21和O12：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_46ea4a05ef91.jpg)

需要注意上面三个点的运算中，weight完全相同，feature存在重叠部分，且没有Padding、Stride时，每一个点的Feature Out计算需要用到维度+2的Input Map。
计算过程如下：

# 为了简化理解，不妨设 C = N = M = 1，weight的Size为3x3，也就是 KL[1,1,3,3]，OF[1,1,R,S]
# 计算三个点：
OF[n,m,r,s]
# r=0, s=0 
OF[0,0,0,0] = KL[0,0,0,0] * IF[0,0,0,0] # k=0,q=0

```text
            + KL[0,0,0,1] * IF[0,0,0,1] # k=0,q=1
            + KL[0,0,0,2] * IF[0,0,0,2] # k=0,q=2
            + KL[0,0,1,0] * IF[0,0,1,0] # k=1,q=0
            + KL[0,0,1,1] * IF[0,0,1,1] # k=1,q=1
            + KL[0,0,1,2] * IF[0,0,1,2] # k=1,q=2
            + KL[0,0,2,0] * IF[0,0,2,0] # k=2,q=0
            + KL[0,0,2,1] * IF[0,0,2,1] # k=2,q=1
            + KL[0,0,2,2] * IF[0,0,2,2] # k=2,q=2
```

# r=0, s=1            
OF[0,0,0,1] = KL[0,0,0,0] * IF[0,0,0,1] # k=0,q=0

```text
            + KL[0,0,0,1] * IF[0,0,0,2] # k=0,q=1
            + KL[0,0,0,2] * IF[0,0,0,3] # k=0,q=2
            + KL[0,0,1,0] * IF[0,0,1,1] # k=1,q=0
            + KL[0,0,1,1] * IF[0,0,1,2] # k=1,q=1
            + KL[0,0,1,2] * IF[0,0,1,3] # k=1,q=2
            + KL[0,0,2,0] * IF[0,0,2,1] # k=2,q=0
            + KL[0,0,2,1] * IF[0,0,2,2] # k=2,q=1
            + KL[0,0,2,2] * IF[0,0,2,3] # k=2,q=2
```

# r=1, s=0            
OF[0,0,1,0] = KL[0,0,0,0] * IF[0,0,1,0] # k=0,q=0

```text
            + KL[0,0,0,1] * IF[0,0,1,1] # k=0,q=1
            + KL[0,0,0,2] * IF[0,0,1,2] # k=0,q=2
            + KL[0,0,1,0] * IF[0,0,2,0] # k=1,q=0
            + KL[0,0,1,1] * IF[0,0,2,1] # k=1,q=1
            + KL[0,0,1,2] * IF[0,0,2,2] # k=1,q=2
            + KL[0,0,2,0] * IF[0,0,3,0] # k=2,q=0
            + KL[0,0,2,1] * IF[0,0,3,1] # k=2,q=1
            + KL[0,0,2,2] * IF[0,0,3,2] # k=2,q=2 
```


### Output Stationary(OS)

Output Stantionary中，Output点的部分和在MAC阵列中驻留，一个输出点的卷积计算完成后Psum的值就是计算结果Feature out的点。Feature in和Weight在MAC阵列中打拍传递，但是Feature in和Weight的复用程度不同。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d12817062e89.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2f637e1326fd.jpg)

OS的特点：

- Psum不需要在阵列中流动，累加后最后得到的Psum就是Feature out点；
- 空间上，Weight具有明显的复用特征，每一行、每一列中的Weight相同，可以广播或者传播来传递Weight。但是在时间上Weight需要每周期更新；
- Feature in在横向传播和纵向传播时都存在一定程度的复用特征，但是纵向传播的复用性相对连续，横向传播的复用性比较离散，具体实现时可能只采用某一方向的复用。

### Weight Stationary(WS)

Weight Stantionary中，Weight数据在MAC阵列中驻留，需要在计算开始前把kernel群中的一个Weight的所有数据填充到MAC阵列计算单元上。启动计算后，Psum纵向传递，最后得到的Psum就是Feature out的一个点。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3ca4fcc859d0.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ebc278df0750.jpg)

WS的特点：

- Psum需要在阵列中流动，最后累加得到Feature out的点，输出的空间位置一般在阵列的最后一行；
- Weight采用预加载的方式，加载进来后在一个Weight的卷积任务中不用更新，在空间和时间上都不需要刷新Weight，所以这种方式对Weight是最友好的，Weight流动引入的功耗最低；
- Feature in也需要横向和纵向传播，这一点与OS的特征类似。

### Input Stationary(IS)

Input Stantionary中，Feature in数据在MAC阵列中驻留，计算开始前需要先把用到的Feature in数据加载进阵列，能加载Feature in的点的数量与硬件阵列的单元数量相关。启动计算后与WS比较像，Psum在阵列中传递，走完每一列的单元后，得到一个点的Feature out。Weight在计算过程中需要纵向和横向传递，具有空间和时间上的复用性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_453ee11b1b9f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4f68766bde3a.jpg)

IS的特点：

- Psum需要在阵列中流动，与WS类似；
- Weight采用流动的方式进入MAC阵列，Weight数据在一个Tensor的卷积中相对确定，它的横向和纵向传播可以打拍或者广播，但与OS类似，每一拍的Weight都需要更新；
- Feature in填充在阵列中，在计算中不流动。由于Featue in本身具有连续和非连续两个方向的复用特征，在IS中可以充分利用到这两个特征对Feature进行填充。

### 总结

OSPsum不流动PE上的Weight每周期刷新Feature复用受限WSWeight不流动Psum需要传递Feature复用受限ISFeature in不流动Psum需要传递PE上的Weight每周期刷新
### 

参考资料

- Xu R, Ma S, Guo Y, et al. A Survey of Design and Optimization for Systolic Array-Based DNN Accelerators[J]. ACM Computing Surveys, 2023, 56(1): 1-37.
- AI芯片:高性能卷积计算中的数据复用 - 暗海风 - 博客园
