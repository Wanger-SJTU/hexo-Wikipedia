---
title: 一篇文章了解 Loop Tiling 优化
date: "2022-03-10 00:00:00"
updated: "2022-03-10 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/一篇文章了解-Loop-Tiling-优化/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/477023757
---


### 背景

Loop Tiling，是优化循环的一种非常重要的策略。而在深度学习中，计算密集型算子如矩阵乘法，本质上就是由三层循环构成的，因此，Loop Tiling 在深度学习编译优化中也起到了很重要的作用。

我们知道，对于循环访问数组如 `for i in range(N): sum += A[i]` 而言，无论是 CPU 还是 GPU在每次访问 `A[i]` 的时候，并不是只从 memory 取一个 float，而是以 Cache Line（约 64Byte）为单位去访问的。这样的话，当你访问 `A[0]` 时，其实从 `A[0]` 到 `A[15]` 都已经在同一个 CacheLine 里被 fetch 到 Cache 中了，所以 `i=1` 到 `i=15` 时的访存速度会更快。

但问题在于 Cache 的总容量是有限制的（如 现代 CPU 的 L1 Data Cache 约 32KB 大小），当 Cache 满了之后，如果还需要 fetch 新的 Cache Line，就得把旧的 Cache Line 给 evict 到 memory 中。

所以，上述例子中，如果 `N` 非常大，那么当你访问到 `N-1` 的时候，`A[0-15]` 所在的 Cache Line 已经被 evict 了，这时如果你再回头访问 `A[0]`，就得重新把这个 Cache Line 从 memory 给 fetch 到 cache 中，速度就比较慢了。 

`for i in range(0, N):
  for j in range(0, M):
    A[i] += B[j]`

就如同上面的这个双层循环的例子，如果 `M` 很大，那么每次 `i` 加一 时，就得重新从 memory 访问，访存速度就会很慢。 因此，我们引入 Loop Tiling 去尝试解决上述问题。

### Loop Tiling

Loop Tiling 的目的是 <strong>确保一个 Cache Line 在被用过以后，后面再用的时候其仍然在 cache 中，没有被 evict</strong>。

实现思路是：<strong>当一个数组总的数据量无法 fit in cache时，把总数据分成一个个 tile 去访问，令每个 tile 都可以 fit in the Cache</strong>

而具体做法就是：**把一层内层循环分成 outer loop * inner loop。然后把 outer loop 移到更外层去，从而确保 inner loop 一定能 fit in cache**。

- 当我们把内层循环给变成更小的 inner loop，那么整个待访问数组 fit in cache，外层开始循环时就不会出现 cache miss 了。
以前面的例子来考虑，假设每个 Cache Line 只能容纳 `b` 个数组元素（`j_i` 代表 `inner_j`，`j_o` 代表 `outer_j`）

`for i in range(0, N):
  for j in range(0, M):
    A[i] += B[j]

# 对于 B[0] 来说，i=0,1,2... 时其都会被重新访问。如果 M 太大，那么 i=0 时存放在 cache 中的 B[0] 可能已经被 evict 了，i=1 时再访问就出现 cache miss。
# 尝试量化分析 cache miss 的次数，
#   - 对于 A[] 来说，cache miss 次数为 N/b
#   - 对于 B[] 来说，miss 次数为 M/b * N
# 总 cache miss 为 N/b*(1+M)

# 因此我们把内层循环 j in range(0, M) 按 T 给 tile，变成 j_o in range(0, M, T) 和 j_i in range(outer_j, outer_j + T) 两个循环，并把 j_o 放到更外层

for j_o in range(0, M, T):
  for i in range(0, N):
    for j_i in range(j_o, j_o+T):
      A[i] += B[j_i]

# 这样的话，B[j_o] -> B[j_o+T] 可以 fit in cache，所以即便 i=0,1... 会重复访问 B[j_o]，也不会有 cache miss
# 量化分析 cache miss 为
#  - A[]: N/b * M/T
#  - B[]: T/b * 1 * M/T = M/b
# 总的 cache miss 数就是 N/b*M/T+M/b，与前面的相比大约少了 T 倍的 cache miss			`

注意这样变化的，会导致 `i in range(0, N)` 变成内层循环，<strong>对于 A[] 来说，其 cache miss 反而增加了</strong>。这种变换被称为「strip-mine-and -interchange」

同样，因为变换后循环 `i` 从最外层循环变成了内层循环，所以当 `j_o=0,1...` 时，其也会被重复访问，也可以 tile，结果如下

`for i_o in range(0, N, T_i):
  for j_o in range(0, M, T_j):
    for i_i in range(i_o, i_o + T_i):
	for j_i in range(j_o, j_o + T_j):
	  A[i_i] += B[j_i]`

### 例子：矩阵乘法

令 `C = A*B`，一个普通的经过 Loop Reordering 优化后实现代码如下

`for i in range(0, N):
  for k in range(0, N):
    for j in range(0, N):
      C[i][j] += A[i][k] * B[k][j]

# 循环从内到外分别是：j, k, i。最内层循环忽略，
# 对于循环 k 来说，k=0,1,2... 时，A[i][k],B[k][j] 读的位置是不同无法优化，但 C[i][j] 却可以被反复读取，因此可以 tile 循环 j
# 对于循环 i 来说，B[k][j] 被反复读取，也可以 tile 循环 k

# 优化如下
for j_o in range(0, N, T_j):
  for i in range(0, N):
    for k in range(0, N):
      for j_i in range(j_o, j_o + T_j):
        C[i][j_i] += A[i][k] * B[k][j_i]
				
for k_o in range(0, N, T_k):
  for j_o in range(0, N, T_j):
    for i in range(0, N):
      for k_i in range(k_o, k_o + T_k):
        for j_i in range(j_o, j_o + T_j):
          C[i][j_i] += A[i][k_i] * B[k_i][j_i]
# 这样，k_i=0,1... 时，C[i_i][j] 始终在 cache 中；i=0,1.. 时，B[k_i][j_i] 也始终在 cache 中

# 又因为循环 i 从最外层循环变成了内循环，对于其上层循环 j_o 来说，当 j_o=0,1,...时，A[i][k_i] 是被反复读取的，因此也可以 tile 循环 i
for i_o in range(0, N, T_i):
  for k_o in range(0, N, T_k):
    for j_o in range(0, N, T_j):
      for i_i in range(i_o, i_o + T_i):
        for k_i in range(k_o, k_o + T_k):
          for j_i in range(j_o, j_o + T_j):
            C[i_i][j_i] += A[i_i][k_i] * B[k_i][j_i]
# 注意，内三层循环仍然是按照 i_i,k_i,j_i 的顺序，因此仍然满足 RowMajor 的顺序读取`

**

#### 多级缓存 Tiling

对于上述矩阵乘法的结果，再次尝试是否能够继续 tile。然后我们发现：

- 总共 6 层 loop，内三层已经全部 tile 没有可优化的空间了
- 对于循环 `j_o=0,..`，对应的 `A[i_i][k_i]` 已经做了 tile 了
- 但对循环 `k_o=0,...`，对应的会重用的数组是 `C[i_i][j_i]` 

- 因为其下层循环时 `j_o` 度过了从 `0..N` 的大层循环时，且 `N` 非常大，所以此时必然出现 cache miss
- 即 `k_o=0` 时存在 cache 里的 `C[i_i][j_i]` ，在 `k_o=T_k` 时必然已经被 evict 了**
- 因此，我们可以用<strong>更大的缓存</strong>再对下一层循环 `j_o` 进行 tile

`for j_oo in range(0, N, T2_j):
  for i_o in range(0, N, T_i):
    for k_o in range(0, N, T_k):
      for j_oi in range(j_oo, j_oo + T2_j, T_j):
        for i_i in range(0, N, T_i):
          for k_i in range(k_o, k_o + T_k):
            for j_i in range(j_oi, j_oi + T_j):
              C[i_i][j_i] += A[i_i][k_i] * B[k_i][j_i]
# 这样的话，内三层循环 i_i, k_i, j_i （对应的 Tile size 为 T_i, T_j, T_k）放到 L1 Cache 里。
# 外层循环 j_oi （对应Tile size 为 T2_j） 就可以放到更大的 L2 Cache 里。于是便在 L2 里形成了对 C[i_i][j_i] 的复用`

** 同理，对于 `k_o`, `i_o` 也可以再 tile 去利用 L2 Cache。甚至再去搞搞利用 L3 Cache 也有可能。

### 做法总结

经过上述一些例子，我们可以总结出进行 Loop Tiling 优化的一般实践思路

设总共有 `N` 层循环，从外向内分别是 `0,1,...,N-1` 

- 从内向外**，逐步分析 `N-2,N-3,...,0`（先排除掉最内层循环）
- 对于每层循环 `L` ，**看其 `idx=0,1,...` 时，是否有 array 可能被反复读取**。

- 若有，则 tile 第 `L+1` 层循环。

都做完之后，再分析 <strong>基于新循环是否仍然有可 tile 的部分</strong>

### Refer

- [陈清扬：循环优化之循环分块（loop tiling）](https://zhuanlan.zhihu.com/p/292539074)，[陈清扬：循环优化之循环分块（loop tiling）二](https://zhuanlan.zhihu.com/p/301905385))
- Anatomy of a High-Speed Convolution | Manas Sahni
更多文章请阅读 [Dounm：深度学习工程笔记 - 专栏总览](https://zhuanlan.zhihu.com/p/426931726)
