---
title: "(2 条消息) Stream K"
date: 2024-10-11
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/934054981
---

title: Stream-K: Work-centric Parallel Decomposition for Dense Matrix-Matrix Multiplication on the GPU

notes:  enable better workload balance by "streaming" the K accumulate axis of GEMM.

inefficiency:

![](asset/img_40becb031319.jpg)

proposed Data-parallel Hybridization with stream K

![](asset/img_55cae63036d8.jpg)

Questions:

- if we have enough following up kernels(do not have dependency to the current one) to dispatch, the unused resources can launch other kernel making it not a problem.
- the "two-tile" SK+DP may not be L2 cache friendly. Triton tutorial has a Group M for GEMM which launches a Square group. 
[](https://link.zhihu.com/?target=https%3A//triton-lang.org/main/getting-started/tutorials/03-matrix-multiplication.html)

![](asset/img_60ffa33ca6f6.jpg)

[](https://link.zhihu.com/?target=https%3A//github.com/triton-lang/triton/issues/1393)

linear order and Z-order for better cache reuse implemented!