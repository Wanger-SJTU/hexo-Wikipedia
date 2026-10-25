---
title: 关于 Bank Conflict 与 Swizzle
date: "2024-12-08 00:00:00"
updated: "2024-12-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/关于-Bank-Conflict-与-Swizzle/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/11132414477
---


关于 Bank Conflict 与 Swizzle

KuangjuX

机器学习系统，非严肃小说家，非严肃哲学爱好者

收录于 · 机器学习系统

307 人赞同了该文章

想写一篇文章写一下关于 Bank Conflict 与 Swizzle 的问题，我被这个问题折磨了很久，虽然知乎上有这么多文章，但还是希望写一篇来梳理一下思路。

Bank Conflict
一个当前最常见的应用场景就是矩阵乘的时候从共享内存到寄存器的内存拷贝操作会涉及到 Bank Conflict 的问题。在 NVIDIA GPU 中一个 Cache line 的大小为 128 Bytes，即为 1024 bits。而每个 Cache line 中分为多个 Banks。当一个线程访问超过 4 bytes(32 bits)，即每个 warp 超过 128 bytes(1024 bits) 的时候，GPU 不会发出单个事务(transaction)，每个事务的最大为 128 bytes。如果每个线程按照向量化访问最大 16 bytes（128 bits）进行访问时，那个 warp wide 将为 512 bytes，此时 GPU 会将其分解为 4 个事务，其中 T0-T7，T8-15，T16-T23，T24-T31 分别产生一个事务，每个事务的宽度为 128 bytes。Bank Conflict 将按照事务产生而并非按照请求或者 warp，指令产生。

The determination of bank conflicts is made per transaction, not per request or per warp or per instruction.[1]当产生 Bank Conflict 的时候，内存访问由并行访问变成串行访问，会极大地影响性能。

在安培架构中，当一块内存希望被从共享内存加载到寄存器内存中，通常会使用硬件提供的 ldmatrix 指令，此时一个线程会加载 128 bits 数据并将其分散到寄存器文件的四个角上面，如下图[2]所示。

从共享内存加载内存到寄存器文件然而，当八个线程对第一个  8 \times 8 的矩阵块进行 ldmatrix 将会造成 Bank Conflict。如下图所示，一个 16 \times 16 的矩阵块在物理角度看来是一个 32 \times 8  的块，其中一行为一个 Cache line 的大小。因此当 T0 与 T4 进行数据访问的时候将会发生 Bank Conflict，同理 T1 与 T5，T2 与 T6，T3 与 T7 也是一样的。因此，为了避免 Bank Conflict 的情况，需要避免 8 个线程对相同的 Bank 进行访问的情况。在上面我们了解到 Bank Conflict 总是发生在一个事务内，因此接下来我们只需考虑 T0-T7 这个过程中的 Bank Conflict 的问题即可，而不必关注整个 Warp 内的所有线程，同时 T8-T15，T16-T23，T24-T31 同理。

从共享内存中加载时发生 Bank Conflict一种可行的方法是使用 Padding，通过向内存中填充无用的空白的数据来使得内存错位，从而避免 Bank Conflict 的问题。例如，下图中通过向共享内存中第一行 Cache line 末尾插入了一段空白的内存，在这种情况下，原本又 T19 访问的数据被转移到了下一个 Cache line 中，从而使得 T0/T4，T1/T5，T2/T6，T3/T7 能够在不同 Bank 进行访问，避免了 Bank Conflict。然而，Padding 的缺点在于会过多占用内存，同时也会产生未对齐地址。

Padding
Swizzle
当前较为流行的方式是使用 Swizzle 来对不同的块重新进行物理映射，通过重映射的方式，能够将本来在相同 Bank 的内存映射到不同的物理地址，但对于用户来说逻辑地址依然为原来的地址。

在 CUTLASS[3] 中给了一个通用的 Swizzle 计算方法，定义了 B，M，S 三个符号并通过一系列变换公式来对 Layout 进行重映射。其中 M 表示为一个 Swizzle 重映射的最小单元，在 2^M \times 16  bits 的数据中的所有数据之间的顺序不会产生变化，这是基于 NVIDIA 中向量化访问考虑的，一次向量化访问最大可访问 128 bits。S 表示基于 M 构成的进行一次内存重映射的元素个数，表示对 2^S 个块在一行内进行重排序。B 表示构成整个 Swizzle 二维空间的行数。

例如 Swizzle B, M, S  = Swizzle 3, 3, 3  表示每 128 bits 组成一个块，一行有 8 个块，共有 8 行。当规定完成后，即可对共享内存中二维数组的编号进行重映射，在 Swizzle 中采用行列坐标进行异或的方式进行物理内存重映射。之所以采用异或的原因在于异或操作满足封闭性与双射性，同时经过在经过验证后发现这种方式可以满足 Bank Conflict free 的要求。

因此，接下来我们可以对坐标进行重映射计算：

对于第一行：

(0, 0):  0 \oplus 0 = 0 

(0, 1): 0 \oplus 1 = 1  

...

(0, 7): 0 \oplus 7 = 7 

对于第一行的坐标，行坐标为 0，列坐标为 0 - 7，异或后与列坐标相同。

对于第二行：

(1, 0): 1 \oplus 0 = 1 

(1, 1): 1 \oplus 1 = 0  

(1, 2): 1 \oplus 2 = 3 

(1, 3): 1 \oplus 3 = 2  

......

(1, 7): 1 \oplus 7 = 6 

经过 Swizzle 后的内存映射经过 Swizzle 后的内存映射如上图所示，此时可以见 T0/T4, T1/T5, T2/T6, T3/T7 之间的内存访问完全把 Bank 分开进行访问，此时前八个线程的内存访问达到了 Bank Conflict free。其他线程的访问同理可以避免 Bank Conflict，在这种情况下 Swizzle 可以实现 Bank Conflict free。在此时尽管对于物理地址的访问发生了变化，但对于用户来说逻辑地址依然是不变的。

CUTLASS 中对于 Swizzle 的实现包含在下面的文件：

GEMM 内存拷贝全流程分析

参考

- ^How to understand the bank conflict of shared_mem https://forums.developer.nvidia.com/t/how-to-understand-the-bank-conflict-of-shared-mem/260900
- ^Bastian Hagedorn, Bin Fan, Hanfeng Chen, Cris Cecka, Michael Garland, and Vinod Grover. 2023. Graphene: An IR for Optimized Tensor Computations on GPUs. In Proceedings of the 28th ACM International Conference on Architectural Support for Programming Languages and Operating Systems, Volume 3 (ASPLOS 2023). Association for Computing Machinery, New York, NY, USA, 302–313. https://doi.org/10.1145/3582016.3582018 https://dl.acm.org/doi/10.1145/3582016.3582018
- ^CUDA Templates for Linear Algebra Subroutines https://github.com/NVIDIA/cutlass

编辑于 2024-12-08 15:40・天津
CUDA

机器学习系统

系统

​赞同 307​​15 条评论​808 ​3 ​分享

​申请转载​​

未登录用户

15 条评论

默认
最新

居里猴姐

“同一个 Warp 中的线程访问相同的 Bank 时就会造成访问冲突”，不是完全的准确，“The determination of bank conflicts is made per transaction, not per request or per warp or per instruction”.  How to understand the bank conflict of shared_mem

2024-12-07 · 北京

​回复​3

Snow

德布劳钦

可能是因为现在很多float都是16it的了吧

2025-09-28 · 浙江

​回复​喜欢

德布劳钦

Tom Dream

一个线程咋能一次访问连续的8个float？一次transaction只有128bit吧

2025-01-31 · 海南

​回复​喜欢

展开其他 2 条回复​

李白

其实安培以上的架构，bank 冲突好像和l1也有关，我刚学的。
2024-12-09 · 云南

​回复​1

李白

giant85

L1和shared memory是同样的架构，如果发生了bc不会体现在bc上，会体现在wawefront上。

2025-08-19 · 湖南

​回复​1

giant85

理论上是的， 但是访问l1的时候，延时主要由cache miss产生， 所以优化方向是增加cache hit， 而不是减少bc。 cache miss产生的延时，比bc要大一到两个数量级

2025-08-13 · 陕西

​回复​1

展开其他 1 条回复​

知乎用户RaQkiM

​

第一个图是不是画错了呀，从上往下是T0-T7，第8行[8, 0]的第一个应该是T8?因为代码中tileA的地址是uint32_t load_smem_a_ptr = __cvta_generic_to_shared( tileA[lane_id % 16][(lane_id / 16) * 8]);这么给的呀

03-08 · 广东

​回复​喜欢

知乎用户RaQkiM

​

另外，一个线程加载的数据，应该是直接从sharedmem中加载四个角，然后写回4个32bit的寄存器中。感觉文章的解释都不太对吧

03-08 · 广东

​回复​喜欢

Lotus

为什么寄存器每个thread的布局分了四块
01-09 · 上海

​回复​喜欢

Vincent

有个疑惑哈，T0和T4是没有bank conflict了，但T0和T19仍然是同一个warp内访问相同bank，不是同样会有bank conflict?

2025-09-30 · 广东

​回复​喜欢

Snow

bank conflict只关注与单个事务，T0和T19已经不是一个事务的了

2025-10-09 · 浙江

​回复​喜欢

白钰秀

都卷到SRAM了

2025-01-09 · 上海

​回复​喜欢

未登录用户

关于作者

KuangjuX
机器学习系统，非严肃小说家，非严肃哲学爱好者

回答
91
文章
35
关注者
2,322

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

银行存管系统架构介绍
独辟蹊径鹿

手机银行APP如何靠打造活动，实现MAU增长？
金融营销新视界

时代改变了银行原本的模样【场景建设篇】
撩聊金融

四大小朋友生存手册-关于银行余额调节表（bank reconciliation）
四大人新出路