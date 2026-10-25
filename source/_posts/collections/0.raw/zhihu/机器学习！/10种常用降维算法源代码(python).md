---
title: "10种常用降维算法源代码(python)"
date: 2019-12-29
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/68754729
---

最近看了一些经典的降维算法，发现网上的资料大部分都不提供源代码，同时个人觉得通过代码理解算法是最有效的一种方式，因此决定自己整理和实现一些常见降维算法的代码。(**github上不止止有代码，还有相应的资料，同时后续也会继续整理其他代码**)

**1. PCA**

当特征数(D)远大于样本数(N)时，需要使用一点小技巧使得PCA算法的复杂度由 O(D3)" role="presentation">O(D3)O(D^3) 转换为 O(N3)" role="presentation">O(N3)O(N^3) 。

****

**![](asset/img_d742b3a69953.jpg)

**

**2. KPCA**

****

**![](asset/img_75f425703ffd.jpg)

**

**3. MDS**

由于sklearn中MDS是采用迭代优化方式，而我这里实现了迭代和非迭代的两种。

****

**![](asset/img_81a7880b37c5.jpg)

非迭代****![](asset/img_3ab39d3a842a.jpg)

迭代**

**4. Isomap**

****

**![](asset/img_11b8e780a5ac.jpg)

**

**5. LLE**

****

**![](asset/img_61892ef8c43e.jpg)

**

**6. T-SNE**

参考了源代码，同时也用tensorflow实现了一个。(不用自己更新参数的感觉是真的爽)

****

**![](asset/img_755520d7edab.jpg)

**

**７. LDA**

****

**![](asset/img_d18ae24f77b1.jpg)

**

**8.  AutoEncoder**

使用AutoEncoder实现的PCA

![](asset/img_161aba5a2750.jpg)

**9. FastICA**

**

10. SVD**

**

11. LE**

![](asset/img_52f58d0db07a.jpg)

**github链接如下:**

[](https://link.zhihu.com/?target=https%3A//github.com/heucoder/dimensionality_reduction_alo_codes)

如果对降维算法感兴趣的同学就点个赞，收个藏～。如果有同学实现了别的降维算法，也希望可以把资料和代码push给我～。

其他文章也很有意思：

[](https://zhuanlan.zhihu.com/p/62902515)

[](https://zhuanlan.zhihu.com/p/64863315)

[](https://zhuanlan.zhihu.com/p/51341313)
