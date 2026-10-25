---
title: "CPU的一级缓存为什么不能做得大一点？"
date: 2024-01-05
tags: [知乎]
source: https://www.zhihu.com/question/21132822/answer/3350331430

---

看了一圈，大家回答的都很好，缓存大多都是基于SRAM设计的，一级缓存能不能做的大一点，这个取决于当前芯片的面积，功耗和性能的约束。因为一级缓存越大，占用的面积以及功耗就越大，同时频率很难满足需求。即使采用直接相连的缓存，也很难找到能满足处理器核几个GHz的频率的SRAM。如果一级缓存足够大，二级缓存还有存在必要吗？这个问题要看处理器适用的场景，如果是嵌入式处理器，其实都没必要使用一级缓存，更不用说二级缓存了。

当然，说了这么多，不是为了重复大家的答案。凡事总有例外，比如我们常见的一级缓存一般在16KB、32KB，最多64KB这几个之间，但是IBM z990处理器一共有512KB一级缓存，分成256KB 指令缓存和256KB的数据缓存。下图是IBM z990的物理版图和微架构图：

![](https://pic1.zhimg.com/v2-fda5409c189ce75b70fa8c6fb44207a6_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-57153ae285393b735bdec79b9b78ca8d_r.jpg?source=2c26e567)z990是130nm工艺制成，运行在1.1GHz，2003年的产品。这个就比大家常见的处理器大多了。

另外，IBM z14处理器14nm工艺，运行在5.2 GHz； 每个处理器核有128KB的L1指令缓存和128KB的L1数据缓存；以及4MB的L2数据缓存和2MB的L2的指令缓存，10个处理器核共享128MB的L3缓存，这些缓存不仅大，而且不是由SRAM设计的，而是eDRAM，类似DRAM的存储。

![](https://picx.zhimg.com/v2-8649669c4d105cca8cee26523e4b06ce_r.jpg?source=2c26e567)所以回答上面的问题，缓存可以做大，可以是SRAM也可以是eDRAM。

另外，对处理器微架构感兴趣，可以关注我，比如下面龙芯系列：

[https://zhuanlan.zhihu.com/p/669340794](https://zhuanlan.zhihu.com/p/669340794)
参考文献

- T. J. Slegel, E. Pfeffer and J. A. Magee, “The IBM eServer z990 microprocessor,” in IBM Journal of Research and Development, vol. 48, no. 3.4, pp. 295-309, May 2004, doi: 10.1147/rd.483.0295.
- C. Jacobi et al., “Design of the IBM z14 microprocessor,” in IBM Journal of Research and Development, vol. 62, no. 2/3, pp. 8:1-8:11, March-May 2018, doi: 10.1147/JRD.2018.2798718.