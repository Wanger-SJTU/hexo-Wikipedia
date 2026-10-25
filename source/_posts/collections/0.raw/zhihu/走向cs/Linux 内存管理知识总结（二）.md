---
title: Linux 内存管理知识总结（二）
date: "2021-04-26 00:00:00"
updated: "2021-04-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/Linux-内存管理知识总结(二)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/367993367
---


作者：dengxuanshi，腾讯 IEG 后台开发工程师

文章第一部分在这里：

[![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_88aa0307c5ca.jpg)腾讯技术工程：Linux 内存管理知识总结（一）118 赞同 · 4 评论 文章](https://zhuanlan.zhihu.com/p/366957562)

#### Linux 内存管理框架

传统的多核运算是使用 SMP(Symmetric Multi-Processor )模式：将多个处理器与一个集中的存储器和 I/O 总线相连，所有处理器访问同一个物理存储器，因此 SMP 系统有时也被称为一致存储器访问（<strong>UMA</strong>）结构体系，即无论在什么时候，处理器只能为内存的每个数据保持或共享唯一一个数值。

而<strong>NUMA</strong>模式是一种分布式存储器访问方式，处理器可以同时访问不同的存储器地址，大幅度提高并行性。NUMA 模式下系统的每个 CPU 都有本地内存，可支持快速访问，各个处理器之间通过总线连接起来，以支持对其它 CPU 本地内存的访问，但是这些访问要比处理器本地内存的慢.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_170b2ef8f564.jpg)

Linux 内核通过插入一些兼容层，使两个不同体系结构的差异被隐藏，两种模式都使用了同一个数据结构。

在 NUMA 模式下，处理器和内存块被划分成多个"节点"(node)，比如机器上有 2 个处理器、4 个内存块，我们可以把 1 个处理器和 2 个内存块合起来（GNU/Linux 根据物理 CPU 的数量分配 node，一个物理 CPU 对应一个 node），共同组成一个 NUMA 的节点。每个节点被分配有本地存储器空间，所有节点中的处理器都可以访问系统全部的物理存储器，但是访问本节点内的存储器所需要的时间比访问某些远程节点内的存储器所花的时间要少得多。

与 CPU 类似，内存被分割成多个区域 BANK，也叫"簇"，依据簇与 CPU 的"距离"的不同，访问不同簇的方式也会有所不同，CPU 被划分为多个节点，每个 CPU 对应一个本地物理内存, 一般一个 CPU-node 对应一个内存簇，也就是说每个内存簇被认为是一个节点。

而在 UMA 系统中, 内存就相当于一个只使用一个 NUMA 节点来管理整个系统的内存，这样在内存管理的其它地方可以认为他们就是在处理一个(伪)NUMA 系统。

#### 内存管理框架初始化

在 linux 中，每个物理内存节点 node 都被划分为多个内存管理区域用于表示不同范围的内存，比如上面提到的 NORMAL 内存、高端内存，内核可以使用不同的映射方式映射物理内存。zone 只是内核为了管理方便而做的一种逻辑上的划分，并不存在这种物理硬件单元。

综上，<strong>linux 的物理内存管理机制将物理内存划分为三个层次来管理</strong>，依次是：Node（存储节点）、Zone（管理区）和 Page（页面），它们之间的关系如下：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_7bce276d37ea.jpg)

其中，zone 的类型如下：

include/linux/mmzone.h

enum zone_type {
#ifdef CONFIG_ZONE_DMA
 ZONE_DMA, //通常为内存首部16MB,某些工业标准体系结构设备需要用到ZONE_DMA(较旧的外设，只能寻址24位内存)

```text
#endif

#ifdef CONFIG_ZONE_DMA32
```

 ZONE_DMA32, //在64位Linux操作系统上,DMA32为16M~4G（可访问32位），高于4G的内存为Normal ZONE
#endif

 ZONE_NORMAL, //通常为16MB~896MB，该部分的内存由内核直接映射到物理地址空间的较高部分
#ifdef CONFIG_HIGHMEM
 ZONE_HIGHMEM, //通常为896MB~末尾，将保留给系统使用，是系统中预留的可用内存空间，动态映射
#endif

 ZONE_MOVABLE, //用于减少内存的碎片化，这个区域的页都是可迁移的

#ifdef CONFIG_ZONE_DEVICE
 ZONE_DEVICE, //为支持热插拔设备而分配的非易失性内存
#endif

 __MAX_NR_ZONES

```text
};
```


回到之前的 setup_arch()函数，接着往下走，来到内存管理框架初始化的地方

```text
void __init setup_arch(char **cmdline_p)
{
    ......
 max_pfn = e820__end_of_ram_pfn(); //max_pfn初始化
```

 ......
 find_low_pfn_range(); //max_low_pfn、高端内存初始化
 ......

 ......
 early_alloc_pgt_buf(); //页表缓冲区分配
 reserve_brk(); //缓冲区加入memblock.reserve

    ......

```text
    e820__memblock_setup(); //memblock.memory空间初始化 启动
```

 ......

```text
    init_mem_mapping(); //低端内存内核页表初始化 高端内存固定映射区中临时映射区页表初始化
```


  ......

```text
    initmem_init(); // 
```


<strong>initmem_init</strong>的实现如下：

```text
#define PHYS_ADDR_MAX (~(phys_addr_t)0)

#ifndef CONFIG_NEED_MULTIPLE_NODES
void __init initmem_init(void)
{
#ifdef CONFIG_HIGHMEM
 highstart_pfn = highend_pfn = max_pfn;
 if (max_pfn > max_low_pfn)
  highstart_pfn = max_low_pfn;
 printk(KERN_NOTICE "%ldMB HIGHMEM available.\n",
  pages_to_mb(highend_pfn - highstart_pfn));
 high_memory = (void *) __va(highstart_pfn * PAGE_SIZE - 1) + 1;
```

#else

```text
 high_memory = (void *) __va(max_low_pfn * PAGE_SIZE - 1) + 1;
#endif

 memblock_set_node(0, PHYS_ADDR_MAX, &memblock.memory, 0);

#ifdef CONFIG_FLATMEM
 max_mapnr = IS_ENABLED(CONFIG_HIGHMEM) ? highend_pfn : max_low_pfn;
#endif
 __vmalloc_start_set = true;

 printk(KERN_NOTICE "%ldMB LOWMEM available.\n",
   pages_to_mb(max_low_pfn));

 setup_bootmem_allocator();
}
#endif /* !CONFIG_NEED_MULTIPLE_NODES */
```


这个函数将<strong>high_memory</strong>初始化为低端内存最大页框<strong>max_low_pfn</strong>对应的地址大小，接着调用 memblock_set_node，通过 memblock 内存管理器<strong>设置 node 节点信息</strong>。

```x86asm
int __init_memblock memblock_set_node(phys_addr_t base, phys_addr_t size,
          struct memblock_type *type, int nid)
{
#ifdef CONFIG_NEED_MULTIPLE_NODES
 int start_rgn, end_rgn;
 int i, ret;

 ret = memblock_isolate_range(type, base, size, &start_rgn, &end_rgn);
 if (ret)
  return ret;

 for (i = start_rgn; i regions[i], nid);

 memblock_merge_regions(type);
#endif
 return 0;
}
```


memblock_set_node 主要调用了三个函数：memblock_isolate_range、memblock_set_region_node 和 memblock_merge_regions，首先看<strong>memblock_isolate_range</strong>()函数：

```cpp
/* adjust *@size so that (@base + *@size) doesn't overflow, return new size */
static inline phys_addr_t memblock_cap_size(phys_addr_t base, phys_addr_t *size)
{
 return *size = min(*size, PHYS_ADDR_MAX - base);
}

static int __init_memblock memblock_isolate_range(struct memblock_type *type,
     phys_addr_t base, phys_addr_t size,
     int *start_rgn, int *end_rgn)
{
 phys_addr_t end = base + memblock_cap_size(base, &size);
 int idx;
 struct memblock_region *rgn;
```


 *start_rgn = *end_rgn = 0;

```sql
 if (!size)
  return 0;

 /* we'll create at most two more regions */
 while (type->cnt + 2 > type->max)
  if (memblock_double_array(type, base, size) base;
  phys_addr_t rend = rbase + rgn->size;

  if (rbase >= end)
   break;
  if (rend base = base;
   rgn->size -= base - rbase;
   type->total_size -= base - rbase;
   memblock_insert_region(type, idx, rbase, base - rbase,
            memblock_get_region_node(rgn),
            rgn->flags);
  } else if (rend > end) {
   /*
    * @rgn intersects from above.  Split and redo the
    * current region - the new bottom half.
    */
   rgn->base = end;
   rgn->size -= end - rbase;
   type->total_size -= end - rbase;
   memblock_insert_region(type, idx--, rbase, end - rbase,
            memblock_get_region_node(rgn),
            rgn->flags);
  } else {
   /* @rgn is fully contained, record it */
   if (!*end_rgn)
    *start_rgn = idx;
   *end_rgn = idx + 1;
  }
 }

 return 0;
}
```


在__memblock_remove()中有提到，<strong>memblock_isolate_range()主要作用是将要移除的物理内存区从 reserved 内存区中分离出来</strong>，将 start_rgn 和 end_rgn（该内存区块的起始、结束索引号）返回回去，而这里，由于我们传入的<strong>type 是 memblock.memory</strong>，该函数会根据入参 base 和 size 标记节点内存范围，将<strong>该内存从 memory 中划分开来，同时返回对应的 start_rgn 和 end_rgn。</strong>

1）如果 memblock 中的 region 恰好以在该节点内存范围内的话，那么再未赋值 end_rgn 时将当前 region 的索引记录至 start_rgn，end_rgn 在此基础上加 1；

2）如果 memblock 中的 region 跨越了该节点内存末尾分界，那么将会把当前的 region 边界调整为 node 节点内存范围边界，然后通过 memblock_insert_region()函数将剩下的部分（即越出内存范围的那一块内存）重新插入 memblock 管理 regions 当中，实现拆分；

```cpp
static inline void memblock_set_region_node(struct memblock_region *r, int nid)
{
 r->nid = nid;
}
static inline int memblock_get_region_node(const struct memblock_region *r)
{
 return r->nid;
}

static void __init_memblock memblock_insert_region(struct memblock_type *type,
         int idx, phys_addr_t base,
         phys_addr_t size,
         int nid, unsigned long flags)
{
 struct memblock_region *rgn = &type->regions[idx];

 BUG_ON(type->cnt >= type->max);
```

 memmove(rgn + 1, rgn, (type->cnt - idx) * sizeof(*rgn));

```text
 rgn->base = base;
 rgn->size = size;
 rgn->flags = flags;
 memblock_set_region_node(rgn, nid);
 type->cnt++;
 type->total_size += size;
}
```


上面的 memmove()将后面的 region 信息往后移，另外调用 memblock_set_region_node()将原 region 的 node 节点号保留在被拆分出来的 region 当中。

回到前面的 memblock_set_node()函数，紧接着 memblock_isolate_range()被调用的是<strong>memblock_set_region_node</strong>()，通过这个函数<strong>把划分出来的 region 进行 node 节点号设置</strong>，而后面的<strong>memblock_merge_regions</strong>()前面 MEMBLOCK 内存分配器初始化时已经分析过了，<strong>是用于将相邻的 region 进行合并的</strong>（节点号、flag 等一致才会合并）。

最后回到 initmem_init()函数中，memblock_set_node()返回后，接着调用的函数为 setup_bootmem_allocator()。

```text
void __init setup_bootmem_allocator(void)
{
 printk(KERN_INFO "  mapped low ram: 0 - %08lx\n",
   max_pfn_mapped
```


原来该函数是用来初始化 bootmem 管理算法的，但现在 x86 的环境已经使用了 memblock 管理算法，所以这里仅作保留，打印部分信息。

<strong>bootmem 分配器使用一个 bitmap 来标记物理页是否被占用</strong>，分配的时候按照第一适应的原则，从 bitmap 中进行查找，如果这位为 1，表示已经被占用，否则表示未被占用。bootmem 分配器每次分配内存都会在 bitmap 中进行线性搜索，效率非常低，而且容易在内存中留下许多小的空闲碎片，在需要非常大的内存块的时候，检查位图这一过程就显得代价很高。bootmem 分配器是用于在启动阶段分配内存的，对该分配器的需求集中于简单性方面，而不是性能和通用性（和 memblock 管理器一致）。

至此，已完成对内存的节点 node 设置。

回到 setup_arch()函数：

```text
void __init setup_arch(char **cmdline_p)
{
    ......
 max_pfn = e820__end_of_raCm_pfn(); //max_pfn初始化
```

 ......
 find_low_pfn_range(); //max_low_pfn、高端内存初始化
 ......

 ......
 early_alloc_pgt_buf(); //页表缓冲区分配
 reserve_brk(); //缓冲区加入memblock.reserve

    ......

```text
    e820__memblock_setup(); //memblock.memory空间初始化 启动
```

 ......

```text
    init_mem_mapping(); //低端内存内核页表初始化 高端内存固定映射区中临时映射区页表初始化
```


  ......

```text
    initmem_init(); //high_memory（高端内存起始pfn）初始化 通过memblock内存管理器设置node节点信息
    ......

    x86_init.paging.pagetable_init(); // 
```


x86_init 结构体内<strong>pagetable_init</strong>实际上挂接的是<strong>native_pagetable_init</strong>()函数：

```text
struct x86_init_ops x86_init __initdata = {
```

 ......

 .paging = {
  .pagetable_init  = native_pagetable_init,

```text
 },
```


 ......

```text
}

native_pagetable_init()函数内容如下：

void __init native_pagetable_init(void)
{
 unsigned long pfn, va;
```

 pgd_t *pgd, *base = swapper_pg_dir;

```cpp
 p4d_t *p4d;
 pud_t *pud;
 pmd_t *pmd;
 pte_t *pte;

    //循环 低端内存最大物理页号~最大物理页号
 for (pfn = max_low_pfn; pfn > PAGE_SHIFT);
 paging_init();
}
```


<strong>PAGE_OFFSET 代表的是内核空间和用户空间对虚拟地址空间的划分，对不同的体系结构不同。比如在 32 位系统中 3G-4G 属于内核使用的内存空间，所以 PAGE_OFFSET = 0xC0000000</strong>。

该函数的 for 循环主要是用于检测 max_low_pfn 后面的内核空间内存直接映射空间后面的物理内存<strong>是否存在系统启动引导时创建的页表</strong>（pfn 通过直接映射的方法得到虚拟地址，然后通过内核页表得到 pgd、pmd、pte），如果存在，则使用 pte_clear()将其清除。

接着看 native_pagetable_init()调用的最后一个函数：<strong>paging_init</strong>()。

```cpp
void __init paging_init(void)
{
 pagetable_init();

 __flush_tlb_all();

 kmap_init();

 /*
  * NOTE: at this point the bootmem allocator is fully available.
  */
 olpc_dt_build_devicetree();
 sparse_init();
 zone_sizes_init();
}
```


可以对着这个图看：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_a54569277937.jpg)

前面已经分析过低端内存、固定映射区中临时映射区的内核页表的建立，这里 paging_init 将会完成剩下的工作，首先看<strong>pagetable_init</strong>()

```text
static void __init pagetable_init(void)
{
 pgd_t *pgd_base = swapper_pg_dir;

 permanent_kmaps_init(pgd_base);
}

static void __init permanent_kmaps_init(pgd_t *pgd_base)
{
 unsigned long vaddr = PKMAP_BASE;

 page_table_range_init(vaddr, vaddr + PAGE_SIZE*LAST_PKMAP, pgd_base);

 pkmap_page_table = virt_to_kpte(vaddr);
}
```


<strong>该函数为建立持久映射区（KMAP 区）的页表</strong>，page_table_range_init 函数前面固定映射区页表初始化时已经分析过了（初始化 pgd_base 指向的页全局目录中 start 到 end 这个范围的线性地址，整个函数结束后只是初始化好了页中间目录项对应的页表，但是页表中的页表项并没有初始化），这里建立页表范围为 PKMAP_BASE 到 PKMAP_BASE + PAGE_SIZE*LAST_PKMAP，<strong>建好页表后将页表地址赋值给给持久映射区页表变量 pkmap_page_table</strong>。

```text
__flush_tlb_all()为刷新全部 TLB，这里不做介绍，接着看 paging_init()调用的下一个函数 kmap_init()。

static void __init kmap_init(void)
{
 unsigned long kmap_vstart;

 /*
  * Cache the first kmap pte:
  */
 kmap_vstart = __fix_to_virt(FIX_KMAP_BEGIN);
 kmap_pte = virt_to_kpte(kmap_vstart);
}
```


可以很容易看到 kmap_init()主要是<strong>获取到临时映射区间的起始页表并往临时映射页表变量 kmap_pte 置值</strong>。

回到 paging_init()，olpc_dt_build_devicetree 这里就不做介绍了，而<strong>sparse_init</strong>()则涉及到了 Linux 的内存模型，这里介绍一下 Linux 的三种内存模型，注意，以下都是从 CPU 的角度来看的。

从系统中任意一个 CPU 的角度来看，当它访问物理内存的时候，物理地址空间是一个<strong>连续的、没有空洞</strong>的地址空间，那么这种计算机系统的内存模型就是<strong>Flat memory</strong>。在这种内存模型下，物理内存的管理比较简单，每一个物理页帧都会有一个 page 数据结构来抽象，因此系统中存在一个 struct page 的数组（位于直接映射区，mem_map，在节点 node 里，后面就会介绍到），每一个数组条目指向一个实际的物理页帧（page frame）。在 flat memory 的情况下，PFN 和 mem_map 数组 index 的关系是线性的（即位于直接映射区，有一个固定偏移），因此从 PFN 到对应的 page 数据结构是非常容易的，反之亦然。

pfn_to_page/page_to_pfn 的作用是 struct page* 和 pfn 页帧号之间的转换，flat memory 内存模型的相关代码如下：

```text
#if defined(CONFIG_FLATMEM)

#define __pfn_to_page(pfn) (mem_map + ((pfn) - ARCH_PFN_OFFSET))
#define __page_to_pfn(page) ((unsigned long)((page) - mem_map) + \
     ARCH_PFN_OFFSET)
```


<strong>PFN 和 struct page 数组（mem_map）的 index 是线性关系，有一个固定的偏移就是 ARCH_PFN_OFFSET（跟架构相关的物理起始地址的 PFN）</strong>。

如果 cpu 在访问物理内存的时候，<strong>其地址空间有一些空洞，是不连续的</strong>，那么这种计算机系统的内存模型就是<strong>Discontiguous memory</strong>。一般而言，NUMA 架构的计算机系统的 memory model 都是选择 Discontiguous Memory，不过 NUMA 强调的是 memory 和 processor 的位置关系，和内存模型其实是没有关系的（NUMA 并没有规定其内存的连续性，而 Discontiguous memory 系统也并非一定是 NUMA 系统，但是这两种都是多节点的），只不过，由于同一 node 上的 memory 和 processor 有更紧密的耦合关系（访问更快），因此需要多个 node 来管理。<strong>Discontiguous memory 本质上是 flat memory 内存模型的扩展，整个物理内存的内存空间大部分是成片的大块内存，中间会有一些空洞，每一个成片的内存地址空间属于一个 node（如果局限在一个 node 内部，其内存模型是 flat memory）</strong>。

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_b95dee9de6d3.jpg)

在这种模型下，从 PFN 转换到具体的 struct page 会稍微复杂一点，首先要从 PFN 得到 node ID，然后根据这个 ID 找到对于的节点 node 数据结构，也就找到了对应的 page 数组，之后的方法就类似 flat memory 了。

#elif defined(CONFIG_DISCONTIGMEM)

```text
#define __pfn_to_page(pfn)   \
({ unsigned long __pfn = (pfn);  \
 unsigned long __nid = arch_pfn_to_nid(__pfn);  \
 NODE_DATA(__nid)->node_mem_map + arch_local_page_offset(__pfn, __nid);\
})

#define __page_to_pfn(pg)      \
({ const struct page *__pg = (pg);     \
 struct pglist_data *__pgdat = NODE_DATA(page_to_nid(__pg)); \
 (unsigned long)(__pg - __pgdat->node_mem_map) +   \
  __pgdat->node_start_pfn;     \
})
```


Discontiguous memory 模型需要获取 node id，只要找到 node id，一切都好办了，后面类比 flat memory model 进行就 OK 了。对于__pfn_to_page 的定义，首先通过 arch_pfn_to_nid 将 PFN 转换成 node id，通过 NODE_DATA 宏定义可以找到该 node 对应的 pglist_data 数据结构，该数据结构的 node_start_pfn 记录了该 node 的第一个 pfn，因此，也就可以得到其对应 struct page 在 node_mem_map 的偏移，__page_to_pfn 类似与上述基本类似(pglist_data 数据结构后面再进行介绍)。

内存模型也是一个演进过程，刚开始的时候，使用 flat memory 去抽象一个连续的内存地址空间，出现 NUMA 之后，整个不连续的内存空间被分成若干个 node，每个 node 上是连续的内存地址空间，也就是从原来单一的一个 mem_maps[]变成了若干个 mem_maps[]。而现在 memory hotplug 的出现让原来完美的设计变得不完美了（热插拔，即带电插拔，热插拔功能就是允许用户在不关闭系统，不切断电源的情况下取出和更换损坏的硬盘、电源或板卡等部件。Linux 内核支持热插拔的部件有 USB 设备、PCI 设备甚至 CPU），因为即便是一个 node 中的 mem_maps[]也有可能是不连续了，因此目前 Discontiguous memory 也逐渐在被 sparse memory 替代。

在<strong>sparse memory</strong>内存模型下，连续的地址空间按照 SECTION（例如 1G）被分成了一段一段的，其中每一 section 都是 hotplug 的，<strong>因此 sparse memory 下，内存地址空间可以被切分的更细</strong>。整个连续的物理地址空间是按照一个个<strong>section</strong>来切断的，在每一个 section 内部，其 memory 是连续的（即符合 flat memory 的特点），因此，<strong>mem_map 的 page 数组依附于 section 结构（struct mem_section），而不是 node 结构（struct pglist_data）。在这个模型下，PFN 转 struct page 变为了转换变成了 PFNSectionpage。</strong>

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_1c708e7d15cb.png)

linux 内核中静态定义了一个 mem_section 的指针数组，一个 section 中往往包括多个 page，因此需要通过 PFN 得到 section 号，用 section 号做为 index 在 mem_section 指针数组可以找到该 PFN 对应的 section 数据结构。实际上<strong>PFN 分成两个部分：一部分是 section index，另外一个部分是 page 在该 section 的偏移</strong>，找到 section 之后，沿着其 mem_map 就可以找到对应的 page 数据结构。

<strong>对于 page 到 section index 的转换，sparse memory 有 2 种方案</strong>，先看看经典的方案，也就是把 section 号保存在 page->flags 中（page 的结构同样在后面再进行介绍），这种方法的最大的问题是 page->flags 中的 bit 数不一定够用，因为这个 flag 中承载了太多的信息，各种 page flag、node id、zone id，现在又增加一个 section id，在不同的处理器架构中无法实现一致性的算法（上面的图即为采用经典算法的 sparse memory）。

#elif defined(CONFIG_SPARSEMEM)

```text
/*
 * Note: section's mem_map is encoded to reflect its start_pfn.
 * section[i].section_mem_map == mem_map's address - start_pfn;
```

 */

```cpp
#define __page_to_pfn(pg)     \
({ const struct page *__pg = (pg);    \
 int __sec = page_to_section(__pg);   \
 (unsigned long)(__pg - __section_mem_map_addr(__nr_to_section(__sec))); \
})

#define __pfn_to_page(pfn)    \
({ unsigned long __pfn = (pfn);   \
 struct mem_section *__sec = __pfn_to_section(__pfn); \
 __section_mem_map_addr(__sec) + __pfn;  \
})
#endif /* CONFIG_FLATMEM/DISCONTIGMEM/SPARSEMEM */
```


对于经典的 sparse memory 模型，一个 section 的 struct page 数组所占用的内存来自直接映射区，页表在初始化的时候就建立好了。但是，对于 SPARSEMEM_VMEMMAP 而言，虚拟地址一开始就分配好了，是 vmemmap 开始的一段连续的虚拟地址空间，但是没有物理地址。因此，当一个 section 被发现后，可以立刻找到对应的 struct page 的虚拟地址，而这时候还需要分配一个物理的 page frame，对于这种 sparse memory，开销会稍微大一些，需要建立页表，关联 page 跟物理地址。

#elif defined(CONFIG_SPARSEMEM_VMEMMAP)

```text
/* memmap is virtually contiguous.  */
#define __pfn_to_page(pfn) (vmemmap + (pfn))
#define __page_to_pfn(page) (unsigned long)((page) - vmemmap)
```


#### 内存管理区 Zone 初始化

回到 paging_init()的最后一个函数调用：<strong>zone_sizes_init</strong>()。

```text
void __init zone_sizes_init(void)
{
 unsigned long max_zone_pfns[MAX_NR_ZONES];
```


 memset(max_zone_pfns, 0, sizeof(max_zone_pfns));

#ifdef CONFIG_ZONE_DMA
 max_zone_pfns[ZONE_DMA]  = min(MAX_DMA_PFN, max_low_pfn);

```text
#endif
#ifdef CONFIG_ZONE_DMA32
```

 max_zone_pfns[ZONE_DMA32] = min(MAX_DMA32_PFN, max_low_pfn);
#endif
 max_zone_pfns[ZONE_NORMAL] = max_low_pfn;
#ifdef CONFIG_HIGHMEM
 max_zone_pfns[ZONE_HIGHMEM] = max_pfn;

```text
#endif

 free_area_init(max_zone_pfns);
}
```


这个函数<strong>为 zone 的各个内存管理区域最大物理页号进行初始化</strong>，并作为参数调用 free_area_init_nodes()，其中<strong>free_area_init_nodes</strong>()函数实现如下：

```cpp
void __init free_area_init(unsigned long *max_zone_pfn)
{
 unsigned long start_pfn, end_pfn;
 int i, nid, zone;
 bool descending;

 /* Record where the zone boundaries are */
    //全局数组arch_zone_lowest_possible_pfn用来存储各个内存域可使用的最低内存页帧编号
    //全局数组arch_zone_highest_possible_pfn用来存储各个内存域可使用的最高内存页帧编号
 memset(arch_zone_lowest_possible_pfn, 0,
    sizeof(arch_zone_lowest_possible_pfn));
 memset(arch_zone_highest_possible_pfn, 0,
    sizeof(arch_zone_highest_possible_pfn));

    //用于最低内存区域中可用的编号最小的页帧，即memblock.memory.regions[0].base
 start_pfn = find_min_pfn_with_active_regions();
    //return false
 descending = arch_has_descending_max_zone_pfns();

    //根据max_zone_pfn和start_pfn初始化arch_zone_lowest_possible_pfn和arch_zone_highest_possible_pfn
 for (i = 0; i 虚拟内存域，不与真正的硬件内存域关联，该内存域的边界总是设置为0
  if (zone == ZONE_MOVABLE)
   continue;

  end_pfn = max(max_zone_pfn[zone], start_pfn);
  arch_zone_lowest_possible_pfn[zone] = start_pfn;
  arch_zone_highest_possible_pfn[zone] = end_pfn;

  start_pfn = end_pfn;
 }

 /* Find the PFNs that ZONE_MOVABLE begins at in each node */
```

 memset(zone_movable_pfn, 0, sizeof(zone_movable_pfn));

```text
    //用于计算ZONE_MOVABLE的内存数量
    //在内存较多的32位系统上, 这通常会是ZONE_HIGHMEM, 但是对于64位系统，将使用ZONE_NORMAL或ZONE_DMA32，这里计算也比较复杂，感兴趣的话可以去看一下源码，这里便不做介绍了
 find_zone_movable_pfns_for_nodes();
```


 ......

```text
    //各种打印
    ......

 /* Initialise every node */
    //为系统中的每个节点调用free_area_init_node()
 mminit_verify_pageflags_layout();
 setup_nr_node_ids();
 init_unavailable_mem();
 for_each_online_node(nid) {
  pg_data_t *pgdat = NODE_DATA(nid);
  free_area_init_node(nid);

  /* Any memory on that node */
  if (pgdat->node_present_pages)
   node_set_state(nid, N_MEMORY);
  check_for_memory(pgdat, nid);
 }
}
```


<strong>free_area_init_node()函数会计算每个节点中每个区域的大小及其空洞的大小</strong>，如果两个相邻区域之间的最大 PFN 匹配，则可以假定后面的区域为空。例如 arch_max_dma_pfn == arch_max_dma32_pfn，则假定 arch_max_dma32_pfn 该区域为空。

pg_data_t node_data[MAX_NUMNODES];

```text
EXPORT_SYMBOL(node_data);

#ifdef CONFIG_NUMA
```

extern struct pglist_data *node_data[];

```cpp
#define NODE_DATA(nid) (node_data[nid])
#endif /* CONFIG_NUMA */

static void __init free_area_init_node(int nid)
{
    //从全局节点数组中获取一个节点
 pg_data_t *pgdat = NODE_DATA(nid);
 unsigned long start_pfn = 0;
 unsigned long end_pfn = 0;

 /* pg_data_t should be reset to zero when it's allocated */
 WARN_ON(pgdat->nr_zones || pgdat->kswapd_highest_zoneidx);
 //根据节点id获取起始pfn和结束pfn，前面node初始化时，memblock处已经设置好节点ID了
 get_pfn_range_for_nid(nid, &start_pfn, &end_pfn);
 //设置节点ID以及起始pfn
 pgdat->node_id = nid;
 pgdat->node_start_pfn = start_pfn;
 pgdat->per_cpu_nodestats = NULL;

 pr_info("Initmem setup node %d [mem %#018Lx-%#018Lx]\n", nid,
  (u64)start_pfn 
```


在进入 calculate_node_totalpages 之前，这里还是先简单介绍一下<strong>node</strong>的数据结构。

```cpp
struct zoneref {
 struct zone *zone; /* Pointer to actual zone */
 int zone_idx;  /* zone_idx(zoneref->zone) */
};
struct zonelist {
 struct zoneref _zonerefs[MAX_ZONES_PER_ZONELIST + 1];
};
typedef struct pglist_data {
 //本节点的所有zone内存管理区
 struct zone node_zones[MAX_NR_ZONES];
    //包含了对所有node的zone的引用，通常第一个node_zonelists为本节点自己的zones
 struct zonelist node_zonelists[MAX_ZONELISTS];
 //本节点zone管理区数目
 int nr_zones; /* number of populated zones in this node */
#ifdef CONFIG_FLAT_NODE_MEM_MAP /* means !SPARSEMEM */
    //Discontiguous Memory内存模型，可以找到节点下的所有page
 struct page *node_mem_map;
#ifdef CONFIG_PAGE_EXTENSION
 struct page_ext *node_page_ext;
#endif
#endif
```


    ......

```cpp
    //节点第一个页的页号
 unsigned long node_start_pfn;
    //节点总共的物理页数，不含空洞
 unsigned long node_present_pages; /* total number of physical pages */
    //节点物理页的范围大小，含空洞
 unsigned long node_spanned_pages; /* total size of physical page
          range, including holes */
 int node_id;
```


    ......
    //内存回收相关的数据结构
 ......

```text
 ZONE_PADDING(_pad1_)
    ......
 unsigned long  flags;

 ZONE_PADDING(_pad2_)
    ......
```

} pg_data_t;

ZONE_PADDING 的作用，通过添加大量的填充把经常被访问的“热门”数据分到了单独的 cache line 上，可以理解为空间换时间。

<strong>calculate_node_totalpages</strong>()实现：

```cpp
static void __init calculate_node_totalpages(struct pglist_data *pgdat,
      unsigned long node_start_pfn,
      unsigned long node_end_pfn)
{
 unsigned long realtotalpages = 0, totalpages = 0;
 enum zone_type i;

 for (i = 0; i node_zones + i;
  unsigned long zone_start_pfn, zone_end_pfn;
  unsigned long spanned, absent;
  unsigned long size, real_size;

  spanned = zone_spanned_pages_in_node(pgdat->node_id, i,
           node_start_pfn,
           node_end_pfn,
           &zone_start_pfn,
           &zone_end_pfn);
  absent = zone_absent_pages_in_node(pgdat->node_id, i,
         node_start_pfn,
         node_end_pfn);

  size = spanned;
  real_size = size - absent;

  if (size)
   zone->zone_start_pfn = zone_start_pfn;
  else
   zone->zone_start_pfn = 0;
  zone->spanned_pages = size;
  zone->present_pages = real_size;
```


  totalpages += size;
  realtotalpages += real_size;

```text
 }

 pgdat->node_spanned_pages = totalpages;
 pgdat->node_present_pages = realtotalpages;
 printk(KERN_DEBUG "On node %d totalpages: %lu\n", pgdat->node_id,
       realtotalpages);
}
```


其中<strong>zone_spanned_pages_in_node</strong>()：

```cpp
static unsigned long __init zone_spanned_pages_in_node(int nid,
     unsigned long zone_type,
     unsigned long node_start_pfn,
     unsigned long node_end_pfn,
     unsigned long *zone_start_pfn,
     unsigned long *zone_end_pfn)
{
 unsigned long zone_low = arch_zone_lowest_possible_pfn[zone_type];
 unsigned long zone_high = arch_zone_highest_possible_pfn[zone_type];
 /* When hotadd a new node from cpu_up(), the node should be empty */
 if (!node_start_pfn && !node_end_pfn)
  return 0;

 /* Get the start and end of the zone */
    //限制zone_start_pfn和zone_end_pfn所在区间
```

 *zone_start_pfn = clamp(node_start_pfn, zone_low, zone_high);
 *zone_end_pfn = clamp(node_end_pfn, zone_low, zone_high);

```text
 adjust_zone_range_for_zone_movable(nid, zone_type,
    node_start_pfn, node_end_pfn,
    zone_start_pfn, zone_end_pfn);

 /* Check that this node has pages within the zone's required range */
 if (*zone_end_pfn  node_end_pfn)
  return 0;

 /* Move the zone boundaries inside the node if necessary */
```

 *zone_end_pfn = min(*zone_end_pfn, node_end_pfn);
 *zone_start_pfn = max(*zone_start_pfn, node_start_pfn);

```text
 /* Return the spanned pages */
 return *zone_end_pfn - *zone_start_pfn;
}
```


该函数<strong>主要是统计 node 管理节点的内存跨度</strong>，该跨度不包括 movable 管理区的（因为 movable 就是在其它内存管理区里分配出来的），里面调用的 adjust_zone_range_for_zone_movable()则是用于剔除 movable 管理区的部分。

另外的<strong>zone_absent_pages_in_node</strong>()函数：

```cpp
unsigned long __init __absent_pages_in_range(int nid,
    unsigned long range_start_pfn,
    unsigned long range_end_pfn)
{
 unsigned long nr_absent = range_end_pfn - range_start_pfn;
 unsigned long start_pfn, end_pfn;
 int i;

 for_each_mem_pfn_range(i, nid, &start_pfn, &end_pfn, NULL) {
  start_pfn = clamp(start_pfn, range_start_pfn, range_end_pfn);
  end_pfn = clamp(end_pfn, range_start_pfn, range_end_pfn);
  nr_absent -= end_pfn - start_pfn;
 }
 return nr_absent;
}

static unsigned long __init zone_absent_pages_in_node(int nid,
     unsigned long zone_type,
     unsigned long node_start_pfn,
     unsigned long node_end_pfn)
{
 unsigned long zone_low = arch_zone_lowest_possible_pfn[zone_type];
 unsigned long zone_high = arch_zone_highest_possible_pfn[zone_type];
 unsigned long zone_start_pfn, zone_end_pfn;
 unsigned long nr_absent;

 /* When hotadd a new node from cpu_up(), the node should be empty */
 if (!node_start_pfn && !node_end_pfn)
  return 0;

 zone_start_pfn = clamp(node_start_pfn, zone_low, zone_high);
 zone_end_pfn = clamp(node_end_pfn, zone_low, zone_high);

 adjust_zone_range_for_zone_movable(nid, zone_type,
   node_start_pfn, node_end_pfn,
   &zone_start_pfn, &zone_end_pfn);
 nr_absent = __absent_pages_in_range(nid, zone_start_pfn, zone_end_pfn);

 /*
  * ZONE_MOVABLE handling.
  * Treat pages to be ZONE_MOVABLE in ZONE_NORMAL as absent pages
  * and vice versa.
  */
 if (mirrored_kernelcore && zone_movable_pfn[nid]) {
  unsigned long start_pfn, end_pfn;
  struct memblock_region *r;

  for_each_mem_region(r) {
   start_pfn = clamp(memblock_region_memory_base_pfn(r),
       zone_start_pfn, zone_end_pfn);
   end_pfn = clamp(memblock_region_memory_end_pfn(r),
     zone_start_pfn, zone_end_pfn);

   if (zone_type == ZONE_MOVABLE &&
       memblock_is_mirror(r))
    nr_absent += end_pfn - start_pfn;

   if (zone_type == ZONE_NORMAL &&
       !memblock_is_mirror(r))
    nr_absent += end_pfn - start_pfn;
  }
 }

 return nr_absent;
}
```


<strong>该函数主要用于计算内存空洞页面数的</strong>，计算方法大致为在 zone 区域范围内，遍历所有 memblock 的内存块，将这些内存块的大小累加，之后两者做差，zone_absent_pages_in_node 后面是对 ZONE_MOVABLE 的特殊处理了，方法是类似的，这里也不做介绍了。

calculate_node_totalpages()后面就是各种简单的赋值操作了，这里也简单介绍一下<strong>zone</strong>的结构：

其中 MAX_NR_ZONES 是一个节点中所能包容纳的 Zones 的最大数。

```text
struct zone {
```

 ......

```cpp
    //保留页框池，记录每个管理区中必须保留的物理页面数，以用于紧急状况下的内存分配
 long lowmem_reserve[MAX_NR_ZONES];
    //保持对UMA的兼容(当做一个节点)，NUMA模式下的节点数
#ifdef CONFIG_NUMA
 int node;
#endif
 //该zone的父节点
    struct pglist_data *zone_pgdat;
```


 ......

```text
 //该zone的第一个页的页号
 unsigned long  zone_start_pfn;
    //伙伴系统管理的page数，这是除去了在初始化阶段被申请的页面（比如memblock）
 atomic_long_t  managed_pages;
    //zone大小，含空洞，即zone_end_pfn - zone_start_pfn
 unsigned long  spanned_pages;
    //zone实际大小，不含空洞
 unsigned long  present_pages;
 //zone的名称，如“DMA”“Normal”“Highmem”，这些名称定义于page_alloc.c的zone_names[MAX_NR_ZONES]
 const char  *name;

 ZONE_PADDING(_pad1_)

 //包含所有空闲页面，伙伴系统使用，里面有数量为MIGRATE_TYPES个的free_list链表，分别用于管理不同迁移类型的内存页面
 struct free_area free_area[MAX_ORDER];
    //描述zone的当前状态
 unsigned long  flags;
    /* Primarily protects free_area */
    //与伙伴算法的碎片迁移算法有关
 spinlock_t  lock;

 ZONE_PADDING(_pad2_)
```


 ......

 ZONE_PADDING(_pad3_)
 ......
} ____cacheline_internodealigned_in_smp;

回到 free_area_init_node()函数，紧接在 calculate_node_totalpages()后的函数调用的为<strong>alloc_node_mem_map()，这个函数是用于申请 node 节点的 node_mem_map 相应的内存空间</strong>，如果是 sparse memory 内存模型，则该函数实现为空，这里便不做过多介绍了，直接看最后的初始化工作：<strong>free_area_init_core</strong>()。

```cpp
static void __init free_area_init_core(struct pglist_data *pgdat)
{
 enum zone_type j;
 int nid = pgdat->node_id;
 //对节点的一些锁和队列进行初始化
 pgdat_init_internals(pgdat);
 pgdat->per_cpu_nodestats = &boot_nodestats;

 for (j = 0; j node_zones + j;
  unsigned long size, freesize, memmap_pages;
  unsigned long zone_start_pfn = zone->zone_start_pfn;

  size = zone->spanned_pages;
  freesize = zone->present_pages;

  //memmap_pages,每一个4k物理页都对应一个mem_map_t来管理
  memmap_pages = calc_memmap_size(size, freesize);
  if (!is_highmem_idx(j)) {
   if (freesize >= memmap_pages) {
    freesize -= memmap_pages;
    if (memmap_pages)
     printk(KERN_DEBUG
            "  %s zone: %lu pages used for memmap\n",
            zone_names[j], memmap_pages);
   } else
    pr_warn("  %s zone: %lu pages exceeds freesize %lu\n",
     zone_names[j], memmap_pages, freesize);
  }

  //dma保留页
  if (j == 0 && freesize > dma_reserve) {
   freesize -= dma_reserve;
   printk(KERN_DEBUG "  %s zone: %lu pages reserved\n",
     zone_names[0], dma_reserve);
  }
  //计算nr_kernel_pages（低端内存的页数）和nr_all_pages的数量
  if (!is_highmem_idx(j))
   nr_kernel_pages += freesize;
  /* Charge for highmem memmap if there are enough kernel pages */
        //如果有足够的页，则也为高端内存提供memmap_pages
  else if (nr_kernel_pages > memmap_pages * 2)
   nr_kernel_pages -= memmap_pages;
  nr_all_pages += freesize;

  /*
   * Set an approximate value for lowmem here, it will be adjusted
   * when the bootmem allocator frees pages into the buddy system.
   * And all highmem pages will be managed by the buddy system.
   */
        //初始化zone使用的各类锁
  zone_init_internals(zone, j, nid, freesize);

  if (!size)
   continue;

  set_pageblock_order();
  setup_usemap(pgdat, zone, zone_start_pfn, size);
  init_currently_empty_zone(zone, zone_start_pfn, size);
  memmap_init(size, nid, j, zone_start_pfn);
 }
}
```


该函数主要用于向节点下的每个 zone 填充相关信息，在 for 循环内，循环遍历统计各个管理区最大跨度间相差的页面数 size 以及除去内存“空洞”后的实际页面数 freesize，然后通过 calc_memmap_size()计算出该管理区所需的页面管理结构占用的页面数 memmap_pages，最后可以计算得出高端内存外的系统内存共有的内存页面数（freesize-memmap_pages）。

<strong>nr_kernel_pages 用于统计低端内存的页数</strong>，此外循环体内的操作则是初始化内存管理区的管理结构，例如各类锁的初始化、队列初始化。其中 set_pageblock_order()用于在 CONFIG_HUGETLB_PAGE_SIZE_VARIABLE 下设置 pageblock_order 的值；setup_usemap()函数则是为了给 zone 管理结构体中的 pageblock_flags 申请内存空间的，pageblock_flags 与伙伴系统的碎片迁移算法有关。init_currently_empty_zone()则主要是初始化管理区的等待队列哈希表和等待队列，同时还初始化了与伙伴系统相关的 free_area 列表

nr_kernel_pages、nr_all_pages 和页面的关系可以参考下图：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_5f7925fe4523.jpg)

这里以我自己的私服为例，看一下我私服 node 和 zone 的情况

首先是 node 的个数，GNU/Linux 根据物理 CPU 的数量分配 node，因此可以直接查物理 CPU 的数量：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_3e389c37300d.jpg)

当然，用 numactl 会更加直观：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_f4fc58f59474.jpg)

我的机器上只有一个 node，接下来可以用 cat /proc/zoneinfo 查看这个 node 下各个 zone 的情况：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_040e98deec9b.jpg)

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_d1380c44e81f.jpg)

回到 free_area_init_core()函数的最后，memmap_init()->memmap_init_zone()，该函数主要是根据 PFN，然后通过 pfn_to_page 找到对应的 struct page 结构，并将该结构进行初始化处理，并设置 MIGRATE_MOVABLE 标志，表明可移动。

```cpp
//遍历memblock，找到节点的内存地址范围，zone的范围不能大于这个，使用memmap_init_zone对该zone进行处理
void __meminit __weak memmap_init(unsigned long size, int nid,
      unsigned long zone,
      unsigned long range_start_pfn)
{
 unsigned long start_pfn, end_pfn;
 unsigned long range_end_pfn = range_start_pfn + size;
 int i;

 for_each_mem_pfn_range(i, nid, &start_pfn, &end_pfn, NULL) {
  start_pfn = clamp(start_pfn, range_start_pfn, range_end_pfn);
  end_pfn = clamp(end_pfn, range_start_pfn, range_end_pfn);

  if (end_pfn > start_pfn) {
   size = end_pfn - start_pfn;
   memmap_init_zone(size, nid, zone, start_pfn,
      MEMINIT_EARLY, NULL, MIGRATE_MOVABLE);
  }
 }
}

void __meminit memmap_init_zone(unsigned long size, int nid, unsigned long zone,
  unsigned long start_pfn,
  enum meminit_context context,
  struct vmem_altmap *altmap, int migratetype)
{
 unsigned long pfn, end_pfn = start_pfn + size;
 struct page *page;

 if (highest_memmap_pfn initialization until after we have released
  * the hotplug lock.
  */
 if (zone == ZONE_DEVICE) {
  if (!altmap)
   return;

  if (start_pfn == altmap->base_pfn)
   start_pfn += altmap->reserve;
  end_pfn = altmap->base_pfn + vmem_altmap_offset(altmap);
 }
#endif

 for (pfn = start_pfn; pfn cond_resched();
  }
  pfn++;
 }
}
```


#### struct page

最后这里简单介绍一下 struct page，内核会为每一个物理页帧创建一个 struct page 的结构体，因此要保证 page 结构体足够的小，否则仅 struct page 就要占用大量的内存，该结构有很多 union 结构，主要是用于各种算法不同数据的空间复用。

```text
struct page 这个结构相当复杂，这里我放上网上找到的一个全局参考，可以比源码更清晰地了解整个结构体，这里我也只简单介绍里面的几个字段。

    struct page (include/linux/mm_types.h)
```


                         page
               +--------------------------------------------------------------+
               |flags                                                         |

```text
               |   (unsigned long)                                            |
   --+--       +==============================================================+
     |         |..............................................................|
     |         |page cache and anonymous pages                                |
     |         |    +---------------------------------------------------------+
     |         |    |lru                                                      |
     |         |    |    (struct list_head)                                   |
               |    |mapping                                                  |
               |    |    (struct address_space*)                              |
               |    |index                                                    |
               |    |    (pgoff_t)                                            |
  5 words      |    |private                                                  |
   union       |    |    (unsigned long)                                      |
               |    +---------------------------------------------------------+
               |..............................................................|
    has        |slab, slob, slub                                              |
               |    +---------------------------------------------------------+
  7 usage      |    |.........................................................|
               |    |                            .+---------------------------|
               |    |slab_list                   .|next                       |
               |    |    (struct list_head)      .|   (struct page*)          |
               |    |                            .|pages                      |
               |    |                            .|pobjects                   |
               |    |                            .|   (int)                   |
               |    |                            .+---------------------------|
               |    |.........................................................|
               |    +---------------------------------------------------------+
               |    |slab_cache                                               |
               |    |    (struct kmem_cache*)                                 |
               |    |freelist                                                 |
               |    |    (void*)                                              |
               |    +---------------------------------------------------------+
               |    |.........................................................|
               |    |s_mem    .counters          .+---------------------------|
               |    | (void*) . (unsigned long)  .|inuse                      |
               |    |         .                  .|objects                    |
               |    |         .                  .|frozen                     |
               |    |         .                  .|    (unsigned)             |
               |    |         .                  .+---------------------------|
               |    |.........................................................|
               |    +---------------------------------------------------------+
               |..............................................................|
               |Tail pages of compound page                                   |
               |    +---------------------------------------------------------+
               |    |compound_head                                            |
               |    |    (unsigned long)                                      |
               |    |compound_dtor                                            |
               |    |compound_order                                           |
               |    |    (unsigned char)                                      |
               |    |compound_mapcount                                        |
               |    |    (atomic_t)                                           |
               |    +---------------------------------------------------------+
               |..............................................................|
               |Second tail page of compound page                             |
               |    +---------------------------------------------------------+
               |    |_compound_pad_1                                          |
               |    |_compound_pad_2                                          |
               |    |    (unsigned long)                                      |
               |    |deferred_list                                            |
               |    |    (struct list_head)                                   |
               |    +---------------------------------------------------------+
               |..............................................................|
               |Page table pages                                              |
               |    +---------------------------------------------------------+
               |    |_pt_pad_1                                                |
               |    |    (unsigned long)                                      |
               |    |pmd_huge_pte                                             |
               |    |    (pgtable_t)                                          |
               |    |_pt_pad_2                                                |
               |    |    (unsigned long)                                      |
               |    |.........................................................|
               |    |pt_mm                         .pt_frag_refcount          |
               |    |    (struct mm_struct*)       .    (atomic_t)            |
               |    |.........................................................|
               |    |ptl                                                      |
               |    |    (spinlock_t/spinlock_t *)                            |
               |    +---------------------------------------------------------+
               |..............................................................|
               |ZONE_DEVICE pages                                             |
               |    +---------------------------------------------------------+
               |    |pgmap                                                    |
               |    |    (struct dev_pagemap*)                                |
               |    |hmm_data                                                 |
               |    |_zd_pad_1                                                |
     |         |    |    (unsigned long)                                      |
     |         |    +---------------------------------------------------------+
     |         |..............................................................|
     |         |rcu_head                                                      |
     |         |    (struct rcu_head)                                         |
     |         |..............................................................|
   --+--       +==============================================================+
     |         |..............................................................|
               |            .                 .                .              |
   4 bytes     |_mapcount   .page_type        .active          .units         |
    union      |  (atomic_t).   (unsigned int).  (unsigned int).   (int)      |
               |            .                 .                .              |
     |         |..............................................................|
   --+--       +==============================================================+
               |_refcount                                                     |
               |     (atomic_t)                                               |
               |mem_cgroup                                                    |
               |     (struct mem_cgroup)                                      |
               |virtual                                                       |
               |     (void *)                                                 |
               |_last_cpupid                                                  |
               |     (int)                                                    |
               +--------------------------------------------------------------+
```


首先介绍一下<strong>flags，它描述 page 的状态和其它的一些信息</strong>，如下图。

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_d609b8674831.jpg)

主要分为 4 部分，其中标志位 flag 向高位增长，其余位字段向低位增长，中间存在空闲位。

- section：主要用于 sparse memory 内存模型，即 section 号。
- node：NUMA 节点号，标识该 page 属于哪一个节点。
- zone：内存域标志，标识该 page 属于哪一个 zone。
- flag：page 的状态标识，常用的有：
page-flags.h
enum pageflags {
 PG_locked,  /* 表示页面已上锁，不要访问 */
 PG_error,     /* 表示页面发生IO错误 */
 PG_referenced, /* 用于RCU算法 */
 PG_uptodate,   /* 表示页面内容有效，当该页面上读操作完成后，设置该标志位 */
 PG_dirty,      /* 表示页面是脏页，内容被修改过 */
 PG_lru,        /* 表示该页面在lru链表中 */
 PG_active,     /* 表示该页面在活跃lru链表中 */
 PG_slab,       /* 表示该页面是属于slab分配器创建的slab */
 PG_owner_priv_1, /* 页面的所有者使用，如果是pagecache页面，文件系统可能使用*/
 PG_arch_1,       /* 与体系架构相关的页面状态位 */
 PG_reserved,     /* 表示该页面不可被换出，防止该page被交换到swap */
 PG_private,  /* 如果page中的private成员非空，则需要设置该标志，如果是pagecache, 包含fs-private data */
 PG_writeback,  /* 页面正在回写 */
 PG_head,  /* A head page */
 PG_swapcache,  /* 表示该page处于swap cache中 */
 PG_reclaim,  /* 表示该page要被回收，决定要回收某个page后，需要设置该标志 */
 PG_swapbacked,  /* 该page的后备存储器是swap/ram，一般匿名页才可以回写swap分区 */
 PG_unevictable,  /* 该page被锁住，不能回收，并会出现在LRU_UNEVICTABLE链表中 */
 ......

```text
}
```


内核定义了一些<strong>标准宏，用于检查页面是否设置了某个特定的标志位或者用于操作某些特定的标志位</strong>，比如

```text
PageXXX()（检查是否设置）
SetPageXXX()
ClearPageXXX()
```


<strong>伙伴系统</strong>，内存被分成含有很多页面的大块，每一块都是 2 个页面大小的方幂。如果找不到想要的块, 一个大块会被分成两部分，这两部分彼此就成为伙伴。其中一半被用来分配，而另一半则空闲。这些块在以后分配的过程中会继续被二分直至产生一个所需大小的块。当一个块被最终释放时, 其伙伴将被检测出来, 如果伙伴也空闲则合并两者

<strong>slab</strong>，Slab 对小对象进行分配，不用为每个小对象去分配页，节省了空间。内核中一些小对象在创建析构时很频繁，Slab 对这些小对象做缓存，可以重复利用一些相同的对象，减少内存分配次数

接着看<strong>struct list_head lru</strong>，链表头，具体作用得看 page 处于什么用途中，如果是伙伴系统则用于连接相同的伙伴，通过第一个 page 可以找到伙伴中所有的 page；如果是 slab，page->lru.next 指向 page 驻留的的缓存管理结构，page->lru.prec 指向保存该 page 的 slab 管理结构；而当 page 被用户态使用或被当做页缓存使用时，lru 则用于将该 page 连入 zone 中相应的 lru 链表，供内存回收时使用

**struct address_space *mapping**，当 mapping 为 NULL 时，该 page 为交换缓存（swap）；当 mapping 不为 NULL 且第 0 位为 0，该 page 为页缓存或文件映射，mapping 指向文件的地址空间；当 mapping 不为 NULL 且第 0 位为 1，该 page 为匿名页（匿名映射），mapping 指向 struct anon_vma 对象

<strong>pgoff_t index</strong>，映射虚拟内存空间里的地址偏移，一个文件可能只映射其中的一部分，假设映射了 1M 的空间，index 指的是在 1M 空间内的偏移，而不是在整个文件内的偏移

<strong>unsigned long private</strong>，私有数据指针

<strong>atomic_t _mapcount</strong>，该 page 被页表映射的次数，即这个 page 被多少个进程共享，初始值为-1（非伙伴系统，如果是伙伴系统则为 PAGE_BUDDY_MAPCOUNT_VALUE），例如只被一个进程的页表映射的话，值为 0

<strong>atomic_t _refcount</strong>，页表引用计数，内核要操作该 page 时，引用计数会+1，操作完成后则-1，当引用计数为 0 时，表示该 page 没有被引用到，这时候就可以解除该 page 的映射（虚拟页-物理页，该物理页是占用内存的）（用于内存回收）

更详细的内容可以参考源代码~

ok，回到 memmap_init_zone()，直接看关键函数<strong>__init_single_page</strong>()

```cpp
static void __meminit __init_single_page(struct page *page, unsigned long pfn,
    unsigned long zone, int nid)
{
```

 mm_zero_struct_page(page); //page初始化，根据page大小还有一些特殊操作
 set_page_links(page, zone, nid, pfn); //flags初始化，将页面映射到zone和node
 init_page_count(page); //page的_refcount设置为1
 page_mapcount_reset(page); //page的_mapcount设置为-1

 INIT_LIST_HEAD(&page->lru); //初始化lru，指向自身
 ......

```text
}
```


至此，free_area_init_node()的初始化操作执行完毕，据前面分析可以知道该函数<strong>主要是将整个 linux 物理内存管理框架进行初始化，包括内存管理节点 node、管理区 zone 以及页面管理 page 等数据的初始化</strong>。

回到前面的 free_area_init()函数的循环体内的最后两个函数 node_set_state()和 check_for_memory()，node_set_state()主要是对 node 节点进行状态设置，而 check_for_memory()则是做内存检查。

到这里，内存管理框架的构建基本完毕。

```text
void __init setup_arch(char **cmdline_p)
{
    ......
 max_pfn = e820__end_of_raCm_pfn(); //max_pfn初始化
```

 ......
 find_low_pfn_range(); //max_low_pfn、高端内存初始化
 ......

 ......
 early_alloc_pgt_buf(); //页表缓冲区分配
 reserve_brk(); //缓冲区加入memblock.reserve

    ......

```text
    e820__memblock_setup(); //memblock.memory空间初始化 启动
```

 ......

```text
    init_mem_mapping(); //低端内存内核页表初始化 高端内存固定映射区中临时映射区页表初始化
```


  ......

```text
    initmem_init(); //high_memory初始化 通过memblock内存管理器设置node节点信息
    ......

    x86_init.paging.pagetable_init(); // 节点node、内存管理区zone、page初始化
    ......
}
```


最后补充一下 pfn 和物理地址以及 pfn 和虚拟地址的转换。

```text
//物理地址->物理页
#define PAGE_SHIFT _PAGE_SHIFT
#define _PAGE_SHIFT 12
#define phys_to_pfn(phys) ((phys) >> PAGE_SHIFT)
#define pfn_to_phys(pfn) ((pfn) 
```


pfn_to_page、page_to_pfn 可以参考上面的内存模型，不同的模型实现的细节不一样。

这里可以看出物理页的大小是 4096，即 4kb，虽然内核在虚拟地址中是在高地址的，但是在物理地址中是从 0 开始的。

在 linux 内核直接映射区里内核逻辑地址与物理页的转换关系如下：

```text
#define pfn_to_virt(pfn) __va(pfn_to_phys(pfn))
#define virt_to_pfn(kaddr) (phys_to_pfn(__pa(kaddr)))
#define virt_to_page(kaddr) pfn_to_page(virt_to_pfn(kaddr))
#define page_to_virt(page) pfn_to_virt(page_to_pfn(page))

#define __pa(x)         ((unsigned long) (x) - PAGE_OFFSET)
#define __va(x)         ((void *)((unsigned long) (x) + PAGE_OFFSET))
```


PAGE_OFFSET 与具体的架构有关，在 x86_32 中，PAGE_OFFSET 是 0xC0000000，即 32 位系统中，内核的逻辑地址只有高位的 1GB

#### 总结

Linux 内存管理是一个很复杂的“工程”，Linux 会通过中断调用获取被 BIOS 保留的内存地址范围以及系统可以使用的内存地址范围。在内核初始化阶段，通过 memblock 内存分配器，实现页分配器初始化之前的内存管理和分配请求，memblock 内存区管理算法将可用可分配的内存用 memblock.memory 进行管理，已分配的内存用 memblock.reserved 进行管理，只要内存块加入到 memblock.reserved 里面就表示该内存被申请占用了，申请和释放的操作都集中在 memblock.reserved，这个算法效率不高，但是却是合理的，因为在内核初始化阶段并没有太多复杂的内存操作场景，而且很多地方都是申请的内存都是永久使用的。为了合理地利用 4G 的内存空间，Linux 采用了 3：1 的策略，即内核占用 1G 的线性地址空间，用户占用 3G 的线性地址空间，且 Linux 采用了一种折中方案是只对 1G 内核空间的前 896 MB 按线性映射, 剩下的 128 MB 采用动态映射，即走多级页表翻译，这样，内核态能访问空间就更多了。传统的多核运算是使用 SMP(Symmetric Multi-Processor )模式，将多个处理器与一个集中的存储器和 I/O 总线相连，所有处理器访问同一个物理存储器，因此 SMP 系统有时也被称为一致存储器访问（UMA）结构体系。而 NUMA 模式是一种分布式存储器访问方式，处理器可以同时访问不同的存储器地址，大幅度提高并行性。NUMA 模式下系统的每个 CPU 都有本地内存，可支持快速访问，各个处理器之间通过总线连接起来，以支持对其它 CPU 本地内存的访问，但是这些访问要比处理器本地内存的慢。Linux 内核通过插入一些兼容层，使两个不同体系结构的差异被隐藏，两种模式都使用了同一个数据结构，另外 linux 的物理内存管理机制将物理内存划分为三个层次来管理，依次是：Node（存储节点）、Zone（管理区）和 Page（页面）。

Linux 内存管理的内容十分多且复杂，上面介绍到的也只是其中的一部分，如果感兴趣的话可以下载一份源代码，然后细细品味[手动狗头]

#### 参考文献

Linux 内存管理-Zone：https://blog.csdn.net/wyy4045/article/details/81776277

Linux 内存管理-Node：https://blog.csdn.net/wyy4045/article/details/81708895

内存管理框架：https://www.jeanleo.com/

memblock：https://biscuitos.github.io/blog/MMU-ARM32-MEMBLOCK-index/

Zone_sizes_init：http://www.soolco.com/post/19152_1_1.html

内核页表：https://www.daimajiaoliu.com/daima/47db35735100402

linux 内存模型：http://www.wowotech.net/memory_management/memory_model.html

linux 中的分页机制：http://edsionte.com/techblog/archives/3435

linux 内核介绍：https://richardweiyang-2.gitbook.io/kernel-exploring

struct page：https://blog.csdn.net/gatieme/article/details/52384636

页表初始化：https://www.cnblogs.com/tolimit/p/4585803.html


更多干货尽在腾讯技术，<strong>欢迎关注官方公众号</strong>：腾讯技术工程，<strong>交流群已建立，交流讨论可加</strong>QQ 群：<strong>160315980</strong>（备注腾讯技术） 。**
