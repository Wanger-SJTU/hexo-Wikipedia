---
title: (1 封私信) 矩阵乘法的并行优化（3）：共享内存多核CPU优化
date: "2021-05-18 00:00:00"
updated: "2021-05-18 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/模型部署那些事/矩阵乘法的并行优化(3)-共享内存多核CPU优化/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/371893547
---


我们已经了解了**OPENMP**是基于共享内存模型的多线程并行模式，非常适合于单机多核心平台。在第（1）篇优化中我们已经使用 OpenMP 实现了常规矩阵乘法的多核运算。

[![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_5b92d5d94ac9.jpg)pizh12thu：矩阵乘法的并行优化（1）：OPENMP、CUDA实现73 赞同 · 3 评论 文章](https://zhuanlan.zhihu.com/p/368870275)

然而这个算法本身没有经过任何优化，访存延迟和通信开销还很大。

### 访存优化

顺序矩阵乘法并行代码

`void matMultCPU_parallel(const float* a, const float* b, float* c, int n)
{
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i  n; i++)
	{
		for (int j = 0; j  n; j++)
		{
			for (int k = 0; k  n; k++)
			{
				c[i * n + j] += a[i * n + k] * b[k * n + j];
			}
		}
	}
}
`

C/C++ 中，本质上按行优先储存数据(一维数组)， ijk 枚举顺序将会使得内层k循环中 b[k][j]=b[k * n + j] 在内存中跳着枚举(按列读取，不连续)，降低效率。

此时可以采用 ikj 的枚举顺序提高访存效率

`void matMultCPU_parallel(const float* a, const float* b, float* c, int n)
{
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i  n; i++)
	{
		for (int k = 0; k  n; k++)
		{
			float s = a[i * n + k];
			for (int j = 0; j  n; j++)
			{
				c[i * n + j] += s * b[k * n + j];
			}
		}
	}
}
`

在 k 循环中先读取 a[i * n + k] 保存到寄存器变量s中，在内层 j 循环计算时直接读取s，而 b[k * n + j] 和 c[i * n + j] 在 j 循环中是连续访问的。注意在外层k循环中（omp并行后去掉了最外层i循环）a[i * n + k] 也是连续读取的，这样就极大提高了访存效率。

计算n=2000的方阵相乘，采用CPU为I5-8265U-4核8线程，结果如下

访问顺序serial time(ms)parallel time(ms)加速比（ijk）47951182872.6（ikj）428422321.9可以看到优化了访存顺序后，函数运行速度提高了8倍左右，甚至单线程(ikj)超过了多线程(ijk)的速度。进一步用opm并行化，又获得2倍左右的加速比。

但是并行加速比比预想中的要低，4核心8线程获得计算加速比只有2左右，大部分开销花在了访问共享的全局矩阵C上，写入时需要顺序访问，产生了额外的等待时间。这里只对第一重循环做了并行，事实上，第二重循环表示矩阵和向量乘法，也是可以并行的，甚至第三重循环，使用规约求和也是可以并行的。但是，由于个人计算机的CPU核心数及其有限，在这里做太多的并行化，效益不高。

### 分块矩阵

将矩阵乘法的计算转化为其各自分块矩阵相乘而后相加，能够有效减少乘数矩阵和被乘数矩阵调入内存的次数，可加快程序执行。通过将大的矩阵通过分块的方式划分，并将每个分块BLOCK看做另一个矩阵的元素，这样之后再参与运算，通常可以简化运算。

分块矩阵的原理：

A=\left[ \begin{matrix} A_{00}&A_{01}\\ A_{10}&A_{11} \end{matrix} \right],  B=\left[ \begin{matrix} B_{00}&B_{01}\\ B_{10}&B_{11} \end{matrix} \right], C=\left[ \begin{matrix} C_{00}&C_{01}\\ C_{10}&C_{11} \end{matrix} \right]\\ \tag{1} 

$$C=\left[ \begin{matrix} C_{00}&C_{01}\\ C_{10}&C_{11} \end{matrix} \right]= \left[ \begin{matrix} A_{00}&A_{01}\\ A_{10}&A_{11} \end{matrix} \right] \bullet \left[ \begin{matrix} B_{00}&B_{01}\\ B_{10}&B_{11} \end{matrix} \right]\\ \tag{2}$$

借鉴CUDA优化中的矩阵分块方式，让BLOCK大小的方块在A的行方向和B的列方向上滑动，直到计算完所有n个元素的相乘累加。

![](/images/collections/0.raw/zhihu/%25E6%25A8%25A1%25E5%259E%258B%25E9%2583%25A8%25E7%25BD%25B2%25E9%2582%25A3%25E4%25BA%259B%25E4%25BA%258B/asset/img_9f068c40efe2.jpg)

分块矩阵示意只不过这里CPU的核心数通常比GPU少的多，不可能分配每个线程到C中的一个元素的计算。这里采用外层并行的方法，即块间的滑动循环可以分配到多个核心上，块内的小矩阵相乘仍然采用单线程算法（更多线程只会徒增线程间开销）。

一个 BLOCK 从内存中读取AB的分块矩阵数据到CPU核的缓存中，大小为BLOCKSIZE \times BLOCKSIZE，用一个双重循环对块进行滑动，并行化这个外层循环，每个 BLOCK 调用 matMultCPU(ai,bi,ci,BLOCKSIZE) 计算块内乘积，最后再累加。

`#define BLOCK_SIZE 64
void matMultCPU_Block(const float* a, const float* b, float* c, int n)
{
#pragma omp parallel for schedule(dynamic)
	for (int ii = 0; ii  n; ii +=BLOCK_SIZE)
		for (int jj = 0; jj  n; jj += BLOCK_SIZE)
			for (int kk = 0; kk  n; kk += BLOCK_SIZE)
				for (int i = ii; i  std::min(ii + BLOCK_SIZE,n); i++)
					for (int k = kk; k  std::min(kk+ BLOCK_SIZE,n); k++)
					{
						float s = a[i * n + k];
						for (int j = jj; j  std::min(jj + BLOCK_SIZE, n); j++)
							c[i * n + j] += s * b[k * n + j];
					}

}
`

外层循环 ii 和 jj 定位到C中要计算的 BLOCK ，kk 代表AB中块的滑动累加；内层循环和matMultCPU 的过程完全相同，计算大小n变成了 BLOCKSIZE 。

> CPU_Serial time: 4052.000000 ms
CPU_BLOCK time: 3097.000000 ms
CPU_Parallel time: 2247.000000 ms
Max error:      0 Average error:      0

可以看到应用分块后，总计算时间从4s降低到3s左右，有一定提升。
