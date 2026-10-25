---
title: 众核处理器如何保证cache一致性?
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/众核处理器如何保证cache一致性_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/359128582/answer/3437893189
---


Mulily

​ 关注

CPU 和内存的访问性能相差较大，于是就在 CPU 内部嵌入了 CPU Cache也被称为高速缓存，CPU Cache 离 CPU 核心很近，它充当了 CPU 与内存之间的缓存角色。CPU Cache 通常分为三级缓存：L1 Cache、L2 Cache、L3 Cache，级别越低的离 CPU 核心越近，访问速度也快，但是存储容量相对就会越小。其中，在多核心的 CPU 里，每个核心都有各自的 L1/L2 Cache，而 L3 Cache 是所有核心共享使用。 

CPU Cache 和主存映射的方式
CPU Cache是很小的，与CPU更近的L1缓存，只有区区几KB～几十KB，而主存通常是几GB～几百GB，大约差了6～7个数量级。所以，内存中的内容不可能完全搬入Cache中，由大到小的过程，就需要涉及映射。Cache的空间十分有限，究竟主存中的数据应该搬迁至cache的哪些位置，是由映射方法决定的。通常Cache映射方法有3个，直接映射，全相联映射，组相联映射。

- 直接相联映射：主存中的每一块只能装入到 Cache 中的唯一位置。若产生块冲突原来的块将无条件地被替换出去直接映射中，Memory中的任意一块地址空间，只能映射到唯一的Cache空间中，该方法的优点：设计简单，地址转化速度快，避免了置换算法（直接就换出去了）。

image.png

- 全相联映射：全相联映射方法中，主存中的所有地址空间都可以映射到Cache的任意位置

image.png

- 组相联映射：组组联映射方法首先将Cache划分多个组，每个组中包含n个Cache line，主存中的某个块只能映射到一个固定的组中，在组内是全相联映射。

image.png

Cache的写策略

-  写命中的情况(缓存中有要写的块)：

-  写不命中的情况(缓存中没有要写的块)：
 

多核 CPU 的缓存一致性问题
现在 CPU 都是多核的，由于 L1/L2 Cache 是多个核心各自独有的，这会带来多核的缓存一致性的问题。如果不能保证缓存一致性，就可能造成结果错误。 以一个含有两核心的 CPU 为例。假设 A 号核心和 B 号核心同时运行两个线程，都操作共同的变量 i（初始值为 0 ）。 

- 核心A执行i++语句，需要更新变量i的值为1。
- 为了优化性能，核心A使用写回策略，将新值1写入到它的L1/L2缓存中，而不直接写回内存。
- 核心A将缓存中对应的缓存块标记为“脏块”，表示该块已被修改但尚未写回内存。
- 此时，核心A的缓存块中的数据与内存中的数据不一致，内存中的变量i的值仍然是0。
- 核心B尝试从内存中读取变量i的值。
- 由于缓存一致性问题，核心B可能会读取到核心A缓存中的旧值0，这是因为核心A尚未将更新后的值写回内存。
- 这导致核心B得到错误的数据，影响了程序的正确执行。
写传播和事务串行化
为了解决多核不一致的问题，就需要一种机制来同步两个不同核心里面的缓存数据。要实现的这个机制的话，要保证做到下面这 2 点：

- 写传播：某个 CPU 核心里的 Cache 数据更新时，必须要传播到其他核心的 Cache。
- 事务的串行化：某个 CPU 核心里对数据的操作顺序，必须在其他核心看起来顺序是一样的。第一点写传播很容易就理解，当某个核心在 Cache 更新了数据，就需要同步到其他核心的 Cache 里。而对于第二点事务的串行化，我们举个例子来理解它。 假设我们有一个含有 4 个核心的 CPU，这 4 个核心都操作共同的变量 i（初始值为 0 ）。A 号核心先把 i 值变为 100，而此时同一时间，B 号核心先把 i 值变为 200，这里两个修改，都会传播到 C 和 D 号核心。 

 那么问题就来了，C 号核心先收到了 A 号核心更新数据的事件，再收到 B 号核心更新数据的事件，因此 C 号核心看到的变量 i 是先变成 100，后变成 200。 而如果 D 号核心收到的事件是反过来的，则 D 号核心看到的是变量 i 先变成 200，再变成 100，虽然是做到了写传播，但是各个 Cache 里面的数据还是不一致的。 所以，我们要保证 C 号核心和 D 号核心都能看到相同顺序的数据变化，比如变量 i 都是先变成 100，再变成 200，这样的过程就是事务的串行化。 要实现事务串行化，要做到 2 点：

- CPU 核心对于 Cache 中数据的操作，需要同步给其他 CPU 核心；
- 要引入锁的概念，如果两个 CPU 核心里有相同数据的 Cache，那么对于这个 Cache 数据的更新，只有拿到了锁，才能进行对应的数据更新。
MESI 协议
MESI 能够实现写传播 和 事务串行化 ，MESI 协议其实是 4 个状态单词的开头字母缩写，分别是：

- 已修改（Modified）：缓存块已被更新，但尚未写回主存。
- 独占（Exclusive）：缓存块只存在于当前核心中，是干净的（与内存一致）。
- 共享（Shared）：缓存块在多个CPU核心的缓存中存在，是干净的。
- 无效（Invalidated）：缓存块的数据已失效，不可读取。这四个状态来标记 Cache Line 四个不同的状态，我们举个具体的例子来看看这四个状态的转换： 

- 当 A 号 CPU 核心从内存读取变量 i 的值，数据被缓存在 A 号 CPU 核心自己的 Cache 里面，此时其他 CPU 核心的 Cache 没有缓存该数据，于是标记 Cache Line 状态为 独占，此时其 Cache 中的数据与内存是一致的。
- 然后 B 号 CPU 核心也从内存读取了变量 i 的值，此时会发送消息给其他 CPU 核心，由于 A 号 CPU 核心已经缓存了该数据，所以会把数据返回给 B 号 CPU 核心。在这个时候， A 和 B 核心缓存了相同的数据，Cache Line 的状态就会变成 共享，并且其 Cache 中的数据与内存也是一致的。
- 当 A 号 CPU 核心要修改 Cache 中 i 变量的值，发现数据对应的 Cache Line 的状态是共享状态，则要向所有的其他 CPU 核心广播一个请求，要求先把其他核心的 Cache 中对应的 Cache Line 标记为 无效 状态，然后 A 号 CPU 核心才更新 Cache 里面的数据，同时标记 Cache Line 为已修改状态，此时 Cache 中的数据就与内存不一致了。
- 如果 A 号 CPU 核心继续修改 Cache 中 i 变量的值，由于此时的 Cache Line 是 已修改 状态，因此不需要给其他 CPU 核心发送消息，直接更新数据即可。
- 如果 A 号 CPU 核心的 Cache 里的 i 变量对应的 Cache Line 要被替换，发现 Cache Line 状态是 已修改 状态，就会在替换前先把数据同步到内存。
CPU cache 在 golang 中的实践

切片中的缓存行
假设我们有两个大型矩阵A和B，我们需要计算它们的组合。有两种不同的方法来进行这个操作：

- 按行列对应相加：这是最直接的方法，我们遍历矩阵的每个元素，将矩阵A的元素与矩阵B的对应元素相加。const matrixLength = 6400

func createMatrix(size int) [][]int64 {
    matrix := make([][]int64, size)
    for i := 0; i   size; i++ {
        matrix[i] = make([]int64, size)
    }
    return matrix
}

func BenchmarkMatrixCombination(b *testing.B) {
    matrixA := createMatrix(matrixLength)
    matrixB := createMatrix(matrixLength)

    for n := 0; n   b.N; n++ {
        for i := 0; i   matrixLength; i++ {
            for j := 0; j   matrixLength; j++ {
                matrixA[i][j] = matrixA[i][j] + matrixB[i][j]
            }
        }
    }
}

- 按行列对称相加：在这种方法中，我们不是按照矩阵的行列坐标对应相加，而是将矩阵B的行和列坐标互换后进行相加。func BenchmarkMatrixReversedCombination(b *testing.B) {
    matrixA := createMatrix(matrixLength)
    matrixB := createMatrix(matrixLength)

    for n := 0; n   b.N; n++ {
        for i := 0; i   matrixLength; i++ {
            for j := 0; j   matrixLength; j++ {
                matrixA[i][j] = matrixA[i][j] + matrixB[j][i]
            }
        }
    }
}

基准测试结果表明，按行列对应相加的方法比按行列对称相加的方法快了近十倍，这是为什么呢？ 

image.png 下图是二维数组的一个示例图（二维数组在物理内存上应该是 6400x6400 的连续空间，为了更好的理解，图画成了二维的形式）。可以发现当我们通过第二种方法按 [j][i] 这样的方式去寻找元素时，相邻元素并不在一个 CacheLine 中，这会增加缓存未命中的次数，从而降低了程序的性能。而第一种方法按照[i][j] 这样的方式时，可以一次性从 CacheLine 中获取多个元素，缓存命中的次数更多所以性能更好。 

image.png

false sharing（伪共享）
之前我们说过由于多核心缓存一致性的问题需要 MESI 协议来解决，但是这个协议会存在一定的性能问题，由于缓存行是缓存系统中的一个基本单位，当一个核心修改了缓存行中的一个数据项时，整个缓存行都会被标记为脏（Modified），并从其他核心的缓存中逐出。这导致其他核心在访问同一缓存行中的其他数据项时必须重新从主内存中加载数据，从而影响了性能。 

如下图所示，CacheLine 为 64B，i、j 变量都为 int64 类型。假设有两个线程分别运行在 CPU1、CPU2， 一个将 i++，一个将 j++，由于 MESI 协议，当 CPU1 修改 i 时，CPU2 的 CacheLIne 将会被置为无效，此时 CPU2 将无法修改 j，需要 CPU1 将 CacheLine 写回内存后，CPU2 重新读取 CacheLIne 才能修改，这导致了一定的性能损失。 

image.png 所以当两个线程要同时修改两个变量时，我们应该尽量使这两个变量在内存空间中不连续，有一种方法是做内存填充，如下图蓝色的部分加了 padding 这样 i 和 j 就不在同一个 CacheLine 了，此时也就没有了 MESI 的约束。 

image.png 下面我们通过运行一个 golang 程序来看一下加了 padding 后性能是否有提高

import (
    "sync"
    "testing"
)

const M = 1000000
const CacheLinePadSize = 64 //一般Cacheline大小64B

type SimpleStruct struct {
    n int
}

type PaddedStruct struct {
    n int
    _ CacheLinePad
}

type CacheLinePad struct {
    _ [CacheLinePadSize]byte
}

const CacheLinePadSize = 64

func BenchmarkStructureFalseSharing(b *testing.B) {
    structA := SimpleStruct{}
    structB := SimpleStruct{}
    wg := sync.WaitGroup{}

    b.ResetTimer()
    for i := 0; i   b.N; i++ {
        wg.Add(2)
        go func() {
            for j := 0; j   M; j++ {
                structA.n += 1
            }
            wg.Done()
        }()
        go func() {
            for j := 0; j   M; j++ {
                structB.n += 1
            }
            wg.Done()
        }()
        wg.Wait()
    }
}

func BenchmarkStructurePadding(b *testing.B) {
    structA := PaddedStruct{}
    structB := SimpleStruct{}
    wg := sync.WaitGroup{}

    b.ResetTimer()
    for i := 0; i   b.N; i++ {
        wg.Add(2)
        go func() {
            for j := 0; j   M; j++ {
                structA.n += 1
            }
            wg.Done()
        }()
        go func() {
            for j := 0; j   M; j++ {
                structB.n += 1
            }
            wg.Done()
        }()
        wg.Wait()
    }
}

可以发现，当两个协程同时操作两个变量时，物理位置临近的两个变量表现不如位置不临近的两个变量，但是代价是使用了更多的内存空间。 

image.png

Reference
https://xiaolincoding.com/os/1_hardware/cpu_mesi.html 

https://teivah.medium.com/go-and-cpu-caches-af5d32cc5592

更好的阅读体验

https://www.yuque.com/u32260789/tqd2ks/mid1p7pdhehkt057?singleDoc# 《CPU Cache》

阅读全文​
​赞同 32​​添加评论​95 ​1 ​分享