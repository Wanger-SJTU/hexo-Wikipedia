---
title: tvm算子优化schedule（一）--CPU篇
date: "2021-09-24 00:00:00"
updated: "2021-09-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/tvm算子优化schedule(一)-CPU篇/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/403163009
---


之前有段时间看过一些关于tvm的资料，虽然说它的精髓在于auto schedule和autotvm，但是我在看的过程中收获更大的是复习和了解了一些算子优化的策略。tvm本身的编译流程DLmodel→RelayIR→TE→autotvm/autoschedule→TIR→machinec ode，就是从网络→算子的从粗粒度到细粒度的优化过程，而细粒度的算子优化空间更大。tvm对不同的后端都支持各种优化策略，并且在官方文档上对cpu/gpu/tensorcore介绍了详细的优化方法，我们这里就也先介绍一下最通用的在cpu上的优化思想，并以一些算子为例，之后会补充上在gpu上的优化。由于我本人对算子优化也只是简单的学习，因此涉及到的都是一些比较简单和通用的优化策略，并且这些方法在官方文档中都有提到，这里只当学习记录并复习下tvm的简单用法，属于入门级别，大佬请无视~。

算子优化的目标就是要榨干硬件的性能，因此我们需要先对cpu的大致结构有个了解。在算子优化中会涉及几个概念：SIMD、多核、L1 cache、内存局部性等，算子优化的过程就是怎么利用cpu的这些特性。关于SIMD可以参照下图，图片来源与一篇tvm的介绍文档dive into deep learning compile。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c41aa53bf2c2.jpg)

图里面左边虚线最左边的就是单核不带SIMD的cpu，其中SIMD指的是单指令多数据，是指用同一条指令同时处理多个元素。 在这个普通的cpu核中，有一个取指令和解码单元，然后会在处理单元 (PU) 上运行指令，例如 ALU（算术逻辑单元），用于处理一个元素。图中两条虚线中间的就是带SIMD的单核cpu，它有多个PU可以同时处理多个元素，但取指令和解码单元还是一个，每次取码单元向每个PU提交相同的指令同时执行。最右边的是多核带SIMD的cpu，很显然它的性能更强大，因此我们的目的就是利用其性质进行并行计算。

另一个重要的概念就是缓存（cache），计算机中的存储器层次可以分为寄存器-缓存-内存-硬盘，而它们的访问和读取速度是逐级下降的，这是cpu本身的结构决定的。其中cache可以分为L1、L2、L3三级cache，每个 CPU core都有一块属于自己的 L1 高速缓存，L2 的 cache 同样是每个 CPU 核心都有的，不过它往往不在 CPU 核心的内部。L3 Cache是多个 CPU core共用的。它们的速度也是逐级下降的。之前看过一个类比很形象，我们可把L1 Cache 理解为我们的短期记忆，把 L2/L3 Cache 理解成长期记忆，把内存当成我们拥有的书架或者书桌，硬盘可以想象成图书馆，而寄存器存放的是我们的临时的想法。 当我们要读取一个数据，会先从当前想法中寻找，然后从记忆中寻找，自己记忆中没有的时候，可以从书桌或者书架上拿书来翻阅，再找不到就只能去图书馆了...。而我们在算子优化中，就是能够尽量让数据的访问和写入尽量快。

而关于内存局部性则比较好理解，存储器中数据局部性原理包括时间局部性（temporal locality）和空间局部性（spatial locality）这两种策略。时间局部性是指，如果一个数据被访问了，那么它在短时间内还会被再次访问，因此它可以被放在cache里；空间局部性是指，如果一个数据被访问了，那么和它相邻的数据也很快会被访问，因此可以把它相邻的数据也一起加载。我们可以通过把访问次数多的数据放在小但是快一点的存储器里，把访问次数少的数据放在慢但是大一点的存储器里，组合使用来优化性能。

说了这么多，我们就开始介绍一些常见的策略。

- Parallelization
Parallelization非常好理解，就是利用了cpu的多核特性，进行并行计算。假设我们要优化的算子是一个长度为n的向量加法，它再tvm里可以写成 

`def add(n):
    A = te.placeholder((n,), name='a')
    B = te.placeholder((n,), name='b')
    C = te.compute(A.shape, lambda i: A[i] + B[i], name="C") # 也可通过topi调用
    s = te.create_schedule([C.op])
    return s, A, B, C`

而假设我们的cpu是有 t 个 core，那么我们首先创建 t 个线程，每个core一个线程。在TVM中，将长度为n的循环平均分成 t 个block，每个线程只需要处理一个block。如果 j % t = i，那么第 i 个线程将执行第 j 个block。例如当t=4，n=20时，每个core上的分配如下：

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c22bf8e60b73.png)

另外，TVM 在运行时将每个工作线程绑定到一个不相交的物理内核，以避免资源争用和线程迁移开销。 在tvm中这种schedule的实现如下：

`  def parallel(n):
     s, A, B, C = add(n)
     # add thread-level parallelism
     s[C].parallel(C.op.axis[0])
     return s, (A, B, C)`

这里的parallel中的括号就是对这个维度进行并行化。

2. Vectorization

为了利用cpu的SIMD的特性，我们再添加一种schedule--vectorization。首先我们定义一个factor，将原来的维度拆分，也就是将原来的一级 for 循环拆分为二级嵌套 for 循环。factor就是内循环迭代的次数，这些迭代将相应地组合在一起以在内核上的 SIMD 指令中执行。 外循环中的迭代仍然并行运行。当我们的factor=8时，各个core处理的数据分配下，每个core都执行SIMD。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_e48a6e555c0f.png)

tvm实现如下：

`def vectorized(n):
    s, A, B, C = add(n)
    outer, inner = s[C].split(C.op.axis[0], factor=8)
    s[C].parallel(outer)
    s[C].vectorize(inner)
    return s, (A, B, C)`

那么这里的factor该怎么确定呢，其实这就是auto schedule的意义所在啦，有了它可以帮你搜索出几乎最优的参数，而不需要手动实验。

3. Reorder

Reorder这种策略在矩阵乘法中用的比较多，比如在卷积神经网络中的卷积层的应用。它的原理也比较简单，我们以矩阵乘法为例，对于矩阵乘法C=A*B，它的初始实现为

`def matmul(n, m, l):
    k = te.reduce_axis((0, l), name='k')
    A = te.placeholder((n, l), name='A')
    B = te.placeholder((l, m), name='B')
    C = te.compute((n, m), lambda x, y: te.sum(A[x, k] * B[k, y], axis=k), name='C')
    s = te.create_schedule(C.op)
    return s, A, B, C`

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_fab7000a4fd6.jpg)

可以看到在计算中矩阵B是逐列访问，但是它的元素是按行存储（行优先）。如果我们简单地切换最内层的两个 for 循环可以使所有元素按顺序读取和写入。如下图，一次计算输出的一行，可以使得B按行访问，这种方法利用的是内存的空间局部性，加快数据的访问速度。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_c59fd1c4f921.jpg)

在tvm中的实现为：

`def reorder(n):
    s, A, B, C = matmul(n, n, n)
    (x, y), (k,) = C.op.axis, C.op.reduce_axis
    s[C].reorder(x, k, y)
    return s, (A, B, C)`

4. Blocking

接下来我们介绍的策略叫Blocking，也是一种常见的策略，它的目的就是能够把数据放入缓存中计算。我们知道速度越快的存储器一般size也越小，所以当我们的数据在缓存中放不下时，需要采用tiling的方法，也就是分片，把大数据分成小数据逐个计算。这里我们还是以矩阵乘法C=A*B为例，对于C中的一个block，例如 C[x:x+tx, y:y+ty] ，可以通过 A 的相应行和 B 的列计算。 那么C[x:x+tx, y:y+ty] = np.dot(A[x:x+tx,:], B[:,y:y+ty])我们可以进一步将这个矩阵乘法分解成多个小的乘法C[x:x+tx, y:y+ty] = sum(np.dot(A[x:x+tx,k:k+tk], B[k:k+tk,y:y+ty] ) for k in range(0,n,tk))在每个子矩阵计算中，我们需要写一个[tx, ty]形状的矩阵，并得到两个形状为[tx, tk]和[tk, ty]的矩阵。这样的计算可以在单个 CPU core中进行。tvm中代码实现如下：

`def block(n, tx, ty, tk):
    s, A, B, C = matmul(n, n, n)
    # Tile by blocks, and then parallelize the computation of each block
    xo, yo, xi, yi = s[C].tile(*C.op.axis, tx, ty) # 得到的分别是外层循环x_outer和内层循环x_inner，以tx为factor切片
    xy = s[C].fuse(xo, yo)
    s[C].parallel(xy) # 对每个内层循环并行执行
    # Optimize the computation of each block
    ko, ki = s[C].split(s[C].op.reduce_axis[0], factor=tk)
    s[C].reorder(ko, xi, ki, yi)
    s[C].vectorize(yi)
    s[C].unroll(ki) # 展开为顺序操作，以降低for循环成本 
    return s, (A, B, C)`

我们选择 tx=ty=32 和 tk=4 使得要写入的子矩阵大小为 32*32*4=4KB，要读取的两个子矩阵的总大小为 2*32*4 *4=1KB。 这三个矩阵可以很轻易地放入 L1 cache中。这里利用的就是L1 高速缓存的特性。

最后一种我们再介绍一个--write cache，之前我们只考虑了读数据的连续性，但是写数据时的连续写入问题比读取更重要，因为对于矩阵乘法C=A*B，我们对A和B的每个子矩阵都读了一次，而对C的子矩阵需要写n次。因此，我们首先将每个子矩阵计算的结果写入本地缓冲区，然后把它们写回C。在TVM中是通过 cache_write 方法来完成的。代码如下：

`def cached_block(n):
    s, A, B, C = matmul(n, n, n)
    # Create a write cache for C
    CachedC = s.cache_write(C, 'local')
    # Same as before, first tile by blocks, and then parallelize the
    # computation of each block
    xo, yo, xi, yi = s[C].tile(*C.op.axis, tx, ty)
    xy = s[C].fuse(xo, yo)
    s[C].parallel(xy)
    # Use the write cache for the output of the xy axis, namely a block.
    s[CachedC].compute_at(s[C], xy) # compute_at用于包含多个算子的schedule，这里表示
# CachedC的计算放在C的计算的xy维度，即每次执行完内层循环后将C写入cache
    # Same as before to optimize the computation of a block .
    # 下面的计算对CachedC优化
    xc, yc = s[CachedC].op.axis
    ko, ki = s[CachedC].split(CachedC.op.reduce_axis[0], factor=tk)
    s[CachedC].reorder(ko, xc, ki, yc)
    s[CachedC].unroll(ki)
    s[CachedC].vectorize(yc)
    returns,(A,B,C)`

这次就简单介绍到这吧，简单总结一下，我们针对cpu的几种特性，用向量加法和矩阵乘法两种算子为例介绍了一些入门级的优化，后续有时间再写一些复杂的或者gpu上的优化，并且可能补上一些实际数据。

第二篇关于gpu的算子优化：

[](https://zhuanlan.zhihu.com/p/403370698)

另外如果各位对模型压缩等方面想了解，欢迎参考我之前的博客：

[](https://zhuanlan.zhihu.com/p/397804163)

[](https://zhuanlan.zhihu.com/p/397971584)
