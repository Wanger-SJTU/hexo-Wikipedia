---
id: 3bbadbe3-517e-41ac-883d-9f7b7aab1050
---

# 原理简介：Linux内存分配机制：伙伴系统buddy system和slab分配器 - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/linux-buddy-system-slab-18f7a43487f)
[Read Original](https://zhuanlan.zhihu.com/p/697539762)



发布于 2024-05-13 19:51・IP 属地上海 ，编辑于 2024-05-13 19:59・IP 属地上海

本文参考[兰新宇](https://www.zhihu.com/people/lan-xin-yu)大佬的文章[内存分配](https://zhuanlan.zhihu.com/p/73562347)系列文章。

当系统内核初始化完毕后，使用页分配器管理物理页，Linux 使用的页分配器是伙伴分配器。

连续的物理页称为页块（page block）。2^n 个连续页称为 n 阶页块。

每阶有一个 freelist 维护该阶的空页块。

```cpp
// include/linux/mmzone.h
​
​
struct zone{
 ...
    /* free areas of different sizes */
    struct free_area    free_area[MAX_ORDER];
 ...
} zone;
```

![](https://proxy-prod.omnivore-image-cache.app/730x372,s3PrqAcYKFZzIrbX_QOWJ87U3W93KegOL0n9RLyhCXaY/https://pic2.zhimg.com/v2-c130ab0ec716aa579769c414692b8855_b.jpg)

### **分配**

当需要分配一段内存时，系统会寻找合适大小的内存块。如果找到了一个恰好大小的内存块，则直接分配给请求的程序；如果没有找到，系统会向上搜索直到找到一个更大的内存块，然后将其切分成合适大小的块，并将其中一个分配给请求的程序，将剩余的部分继续保留在内存池中。

举例来说，再下图的内存布局当中申请 128 字节的内存：

![](https://proxy-prod.omnivore-image-cache.app/720x309,sMvNa2tsYqeLadz3Zic_s3SpabgyM9wWmerqDzuk3tyo/https://pic1.zhimg.com/v2-369a336478d5778833f93044ca4e7fcc_b.jpg)

**查找合适块**：首先查看 size 为 128 字节的 free list，但没有空闲块。再看 256 字节的 free list，还是没有，再看 512 字节的 free list，找到一个空闲的内存块 A'。

**分割内存块**：将 A'划分为 256 字节的 E 和 E'，再将内存块 E 划分成 128 字节的 F 和 F'，内存块 F 即是们需要的内存。之后，在此过程中产生的 E'和 F'将分别被挂接到 size 为 256 字节和 128 字节的 free list 上，位图中 bits 的值也会相应变化。

得到的结果如下：

![](https://proxy-prod.omnivore-image-cache.app/772x313,s86bUHM76v0M54Me4248hJvHyKtDCjWG11KX_hkAbPdQ/https://pic4.zhimg.com/v2-a7cbc8c03fd304617046210cddb6ca9b_b.jpg)

### **释放**

当程序释放内存时，系统会将这块内存标记为空闲状态，并尝试将其与相邻的空闲块合并，以形成更大的空闲块，方便后续的分配。

举例来说，在上图的内存布局当中释放 128 字节的内存块 C，由于 C 相邻的两个内存块都不是空闲状态，因此不能合并，之后 C 也将被挂接到 size 为 128 字节的 free list 上。

![](https://proxy-prod.omnivore-image-cache.app/762x314,sdT8Mg6iwGPvmd5yJCECvK7QZpHds_7cVevm5D7kQIlE/https://pic1.zhimg.com/v2-aaff2714e9e2edcf7b5221ea883d76e4_b.jpg)

再释放释放 64 字节的内存块 D：

分配器根据 bitmap 可知，右侧的 D'也是空闲的，且 D 和 D'的大小相同，因此 D 和 D'将合并。合并后的空闲内存块 C'为 128 字节，应该被添加到 size 为 128 字节的 free list 上，但是因为左侧的 C 也是空闲的，且 C 和 C'的大小相同，因此 C 和 C'进一步合并形成 B'，合并后的空闲内存块将被挂接到 size 为 256 字节的 free list 上。

![](https://proxy-prod.omnivore-image-cache.app/631x262,sbIQdjs6KWd-ZcytVX9tMkpLANpM0z7wHMY7mZD4f_7s/https://pic4.zhimg.com/v2-98d9020410bf26cc29af37a6cd7a4c03_b.jpg)

### **优缺点**

优点：

根据需要分配内存的大小直接可以计算出当前这次分配应该从哪个 order 的 free list 开始找空闲的内存块，因此分配的效率比 boot memory 的线性扫描 bitmap 要快很多。

缺点：

1. 释放 page 的时候调用方必须记住之前该 page 分配的 order，然后释放从该 page 开始的 2^{order} 个 page，对于调用者来说不方便
2. 每次分配必须是 2^{order} 个 page，如果需要的内存大小不是 2 的阶，会造成**内部碎片。**

Linux 为了解决 buddy system 造成的内部碎片问题，引入 slab 分配器处理小粒度的内存分配。

## **slab 分配器**

Linux 中的 buddy 分配器是以 page frame 为最小粒度的，而有很多现实的应用以内核 objects 的大小来申请和释放内存的，这些内核 objects 的大小通常从几十字节到几百字节不等，远远小于一个 page 的大小。

### **结构**

slab 分配器用于分配小块内存。它从内存管理模块申请一整块页，然后划分成多个小块的存储池，用队列来维护这些小块的状态。

在 slab 分配器中，每一类 objects 拥有一个"cache"（比如 inode\_cache, dentry\_cache）。每分配一个 object，都从包含若干空闲的同类 objects 的区域获取，释放时也直接回到这个区域，这样可以缓存和复用相同的 objects，加快分配和释放的速度。

![](https://proxy-prod.omnivore-image-cache.app/563x370,sVPdI4MejgGub7iuVUMmKOAIJQXunIsdttZBZdMTvdrM/https://pic2.zhimg.com/v2-fef7427e05c0bc7d795c21315d498589_b.jpg)

cache 的内存从 buddy allocator 获得。slab 层直接面向程序的分配需求，相当于是**前端**，而 buddy system 则成为 slab 分配器的**后端**。

![](https://proxy-prod.omnivore-image-cache.app/769x326,sxT1-cIA2399c5BgUkbMJAikly9pfgHhNsAHqjnR7U6Q/https://pic1.zhimg.com/v2-34eb27d21836c520fc1d5387f98c5610_b.jpg)

每个 cache 的内存在物理上是连续的。一个 cache 分成若干个 slabs，同一 cache 中的 slabs 都存储相同的 objects。

![](https://proxy-prod.omnivore-image-cache.app/451x263,skLawWpsZ75-K7A_ITDm5tKsLlUmw-8KvZ7yFO65Byxc/https://pic4.zhimg.com/v2-9e22c239380a57802a77c70341181bf7_b.jpg)

Slab 分配器的主要优点和缺点如下：

### **优缺点**

优点：

1. **降低内存碎片化**：可以提供小块内存的分配支持，提高内存利用率。
2. **减少内存分配和释放的开销**：Slab 分配器通过重复使用预分配的内存块，使得内存的申请和释放不必每次需要 buddy system 介入，提高了分配和释放的效率

缺点：

1. 设计实现比较复杂
2. 建立 slab 分配器的数据结构就需要大量内存，可以使用经过优化的 slub 分配器

## 参考

  
[Linux Memory Management - The Buddy Allocator (carcano.ch)](https://grimoire.carcano.ch/blog/memory-management-the-buddy-allocator/)

[The Buddy System Algorithm - Linux Kernel Reference (halolinux.us)](https://www.halolinux.us/kernel-reference/the-buddy-system-algorithm.html)

[linux/mm/mmzone.c at v2.6.39 · torvalds/linux (github.com)](https://github.com/torvalds/linux/blob/v2.6.39/mm/mmzone.c)

[\[内存分配二\] - Buddy系统的原理 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/73562347)

[\[内存分配四\] - Linux中的Slab(1) - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/105582468)

[Linux内存管理-伙伴系统分析 | Sherlock's blog (wangzhou.github.io)](https://wangzhou.github.io/Linux%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86-%E4%BC%99%E4%BC%B4%E7%B3%BB%E7%BB%9F%E5%88%86%E6%9E%90/)

发布于 2024-05-13 19:51・IP 属地上海 ，编辑于 2024-05-13 19:59・IP 属地上海

