---
title: "CXL的延迟为什么比PCIe低？"
date: 2023-11-30
tags: [知乎]
source: https://www.zhihu.com/question/621490847/answer/3308431649

---

-  模拟 PHY 是同一个，所以最底层传数据延时一样；
-  除了模拟 PHY, 上面还有传输层，数据链路层，逻辑 PHY, CXL 使用 Flit 包，大小固定，每个字段单独定义，携带信息量大， 对于64字节这种有效数据带宽高。没有了PCIe 的排序规则、DLLP、访问权限检查等这些耗时的操作。简单来说，就是 CXL 在控制器IP 的设计上做了优化，延迟更低, 有效数据是控制器到控制器 PCIe 50ns, CXL 25ns。
![](https://picx.zhimg.com/v2-695adaa24e5b1629e2ee246e66bc4c4d_r.jpg?source=2c26e567)
- 站在应用层角度，PCIe 读写内存有 Copy 损耗，无论哪个方向，除非特殊设计；DRAM 读写延迟100ns 左右，copy 一次就上 200ns, 这段延迟很大；CXL 使用了缓存，取消了 Copy ,  延迟更低了。
-  这里还得说一下，对于大数据量来说，CXL 优势没有那么大，它主要还是用来访问RC和EP共同访问的小段内存，比如8字节这种，优势就很大了。
-  详情看论文吧, <Compute Express Link (CXL): Enabling Heterogeneous Data-Centric Computing With Heterogeneous Memory Hierarchy>
-  或者 [与 PCIe 相比，CXL 为什么比 PCIe 低延迟高带宽？](https://link.zhihu.com/?target=https%3A//blog.csdn.net/u014443578/article/details/134670974%3Fspm%3D1001.2014.3001.5501)