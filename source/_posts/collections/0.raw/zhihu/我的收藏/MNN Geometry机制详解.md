---
title: "MNN Geometry机制详解"
date: "2024-10-10 00:00:00"
updated: "2024-10-10 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/MNN-Geometry机制详解/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/674095025"
---


### MNN开源地址：

[https://github.com/alibaba/MNN/tree/master](https://link.zhihu.com/?target=https%3A//github.com/alibaba/MNN/tree/master)

### 背景

MNN在[1.1.0](https://link.zhihu.com/?target=https%3A//github.com/alibaba/MNN/releases/tag/1.1.0)版本中新Geometry（几何计算）机制，该机制对整个框架进行了重构，提升了MNN在各硬件设备上的算子覆盖率，降低了优化工作量。虽然代码发布时间已经挺长了，但是至今仍然有不少社区的小伙伴表示不太理解Geometry的机制，对于其中的Raster算子的作用也不了解，希望能够出一篇文章分析一下实现机制，所以写了这篇文章来具体分析一下MNN Geometry机制。

### 动机

首先说一下Geometry的动机，是为了降低适配多种后端的工作量而引入的。MNN作为一个通用性强的推理框架，需要满足算子支持上的通用性和后端可执行设备的通用性。因为算子需要针对每种后端做实现和优化，因此`总工作量 = 算子 x 后端`，在通用性的支持上工作量是非常大的。同时我们发现有一些算子其实是可以拆解为更基础的算子组合来实现的，但是组合实现是非常灵活的，并不能简单进行拆解组合。因此我们引入了Geometry的机制，通过引入了Raster元算子来抽象所有的内存映射来完成这个拆解组合实现，来降低通用性适配的工作量。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f0fccdf9cf9a.jpg)

### Raster元算子

在上文中提到Raster算子是为了解决灵活的内存映射关系而引入的一个元算子，元算子表示其具备描述多种算子的能力。这里的内存映射算子是指那些不包含计算逻辑，只有内存搬运逻辑的算子或者能力，比如：reshape, transpose, slice, concat, im2col等。这些算子实际都是从一个源地址到目的地址按照指定规则搬移一个张量，所以我们只要在算子属性中描述清楚源，目标张量的读写规则就可以实现这样的元算子，元算子可以通过设置这些参数来表达不同的内存映射关系。

#### 内存映射描述

那么具体应该怎么描述这种张量的映射规则呢？考虑到我们对内存的实际操作是在一维空间，所以对于所有张量 \vec{x} \in Z^{n} 其映射到一维空间的函数可以描述为 f(\vec{x}) = \vec{stride} \cdot \vec{x} + \vec{offset} ；因此对于任意张量 \vec{x} 我们只需要 \vec{stride}和 \vec{offset} 就可以描述其到一维空间的映射，我们只需要给出张量的读、写映射，以及张量的范围就可以描述这内存的映射规则；对于相同的内存空间不同的 f(\vec{x}) 映射读取的张量如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e091b57cf83d.jpg)

因此我们可以使用stride和offset来描述一段内存，指定张量的任意读取方式；同样的也可以描述任意张量对应的写方式。为了实现更加简单，同时考虑到GPU中的实现，这里我们将stride和offset的长度固定为3，对于不足3的高位补0即可；对于大于3的张量可以使用多组stride和offset来描述。因此我们使用如下数据结构来描述内存的映射关系，对于任意内存映射都可以通过改变这些这些参数来描述。

```cpp
struct View {
    int32_t offset;        // 向量offset
    int32_t stride[3];	   // 向量stride
};
struct Region {
    View src;		   // 读映射
    View dst;		   // 写映射
    int32_t size[3];       // 向量x
};
class Raster {
    // ...
    private:
       std::vectorRegion> regions;  // 向量的读写映射
};
```


#### 内存映射实现

$Raster的实际实现就是遍历所有的Region，按照映射规则 \forall\vec{x} \in \left\{ \begin{aligned} 0 \le x_0 \le b_0 \\ 0 \le x_1 \le b_1 \\ 0 \le x_2 \le b_2 \end{aligned} \right. :f_{src}(\vec{x})\rightarrow f_{dst}(\vec{x}) 完成内存的读写即可，代码如下。$

```cpp
for (int i = 0; i 
```


### 算子拆解

有了能够描述所有内存映射的Raster元算子之后，我们可以将算子划分为3类：原子算子（基础计算），形变算子（只有内存映射），复合算子（基础运算+内存映射的组合）。对于这3类算子我们可以将其进行转换，原子算子不变，形变算子全部变换为Raster，复合算子拆解成Raster与原子算子的组合。这样实现之后我们就可以大大降低算子到各个后端实现的工作量。将算子分解转换之后，后端实际需要实现的算子总工作量相比原始的实现，总工作量可以降低约46%，提升算子优化的工作效率。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_394d4fbe7a32.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6f20f939bf4a.jpg)

### 元算子融合

在不引入原算子时，对于内存映射类的算子只能通过一些固定的pattern做一些简单的优化，比如`transpose + transpose`融合，`reshape + reshape`融合等。在引入元算子之后，可以通过对元算子的Region信息进行计算融合，这带来了更多的融合优化机会。 

考虑到Raster是通过嵌套循环实现的，因此可以利用循环变换的思想对Raster中的region做一些等价变换。以下是基于循环变换的规则能够对Region做的基础的等价变换：

- 删除：size=1维度可删除（loop unroll）
- 交换：各维度可以互换（loop interchange）
- 扩充：可按照规则增加维度（loop tiling）
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3a27cb5fcfa.jpg)

考虑循环融合的规则，基础融合的规则为：读写stride相同可消去（loop fusion)。在前面3条等价变换的规则加上融合规则后可以搜索出多种融合规则。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e8c2046d18a7.jpg)

在引入这些规则之后，能够将连续的Raster进行融合，降低Raster的数目，减少内存开销；以下是一些模型0融合前后的Raster数目，可以看到优化之后内存相关的总操作可以降低10%左右。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_033e1c423069.jpg)

### 总结

Geometry（几何计算）机制通过引入Raster元算子描述内存映射关系，利用元算子能力对算子进行分类拆解有效降低了多算子，多后端的优化适配工作量；同时利用元算子描述能力引入融合规则，降低冗余访存提升整体性能。