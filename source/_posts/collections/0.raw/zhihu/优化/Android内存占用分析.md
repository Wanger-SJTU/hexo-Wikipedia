---
title: "Android内存占用分析"
date: 2019-12-16
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/90076117
---

** 思考的问题：
 1、为什么/proc/meminfo中的内存总大小比物理内存小?
 2、怎么看Android还剩多少可用内存比较准确？
 3、怎么看Kernel的内存占用比较准确？
 4、是哪些因素影响了Lost RAM的大小？
 5、怎么看一个进程的内存占用比较合适？  
 本文以Android P为例，对应kernel版本为4.14

#### 1、 MemTotal

MemTotal 即 /proc/meminfo 中的第一行的值, 可以认为是系统可供分配的内存总大小, 通常大小会比实际物理内存小, 这个是为什么呢? 少的部分被谁占用了呢?

#### 1.1 memblock

首先需要了解一下memblock.

在伙伴系统(buddy system)初始化完成前，Linux使用memblock来管理内存，memblock管理的内存分为两部分: `memory`类型和`reserved`类型。 对应的描述变量分别是`memblock.memory` 和 `memblock.reserved`。

memblock中两种类型的内存申请/添加函数如下:

`//memory 类型的memblock申请/添加
int __init_memblock memblock_add(phys_addr_t base, phys_addr_t size)
int __init_memblock memblock_add_node(phys_addr_t base, phys_addr_t size, int nid)

//reserved 类型的mblock申请/添加
int __init_memblock memblock_reserve(phys_addr_t base, phys_addr_t size)`

#### 1.1.1 物理内存分布

memblock是如何知道物理内存的分布的呢?

kernel启动的过程中，从lk/uboot知道了DTB的加载地址, 在如下的调用流程中解析DTB下的memroy节点，将节点下的物理内存区间使用`memblock_add()`添加给memblock维护。  由于lk/uboot中可能使用内存，lk/uboot也可以修改DTB，所以这里memory节点下可能有多个物理内存区间。 多个物理区间中不连续的部分就是已经被lk/uboot占用的部分。

`setup_machine_fdt(__fdt_pointer)   //__fdt_pointer是传递的DTB加载地址
  |-->early_init_dt_scan()
    |-->early_init_dt_scan_memory() //解析memory node,遍历其下的所有单元
      |-->early_init_dt_add_memory_arch()
        |-->memblock_add(base, size) //每个单元的起始地址和大小添加到memblock的memory类型中
//dts中的初始描述,0x40000000是起始物理地址
    //lk/uboot可以修改DTB中的节点,这里的reg单元可能有多个
    memory {
        device_type = "memory";
        reg = ;
    };`

可以通过 /sys/kernel/debug/memblock/ 下的节点查看两种内存的物理空间分布:

`lsg@eebbk:~$adb shell cat /sys/kernel/debug/memblock/memory
lsg@eebbk:~$adb shell cat /sys/kernel/debug/memblock/reserved`

memblock构建了内存的物理空间分布, 之后在伙伴系统(buddy system)初始化的过程中,构建了物理内存分布到虚拟内存空间的映射.  memblock管理的`memory`类型的页框都添加到各ZONE中, `totalram_pages`统计了它的页框数目. 详细代码见 `free_all_bootmem()`

#### 1.2 隐藏的内存占用

这里说几个概念:

- 物理内存：    即DRAM物理内存大小,比如物理内存为2GRAM,则物理内存大小为2097152K
- memblock管理的内存:  memblock管理的内存, 包含伙伴系统管理的内存和reserved两部分,其页框数为 `get_num_physpages()`   在下面的例子中, 可管理内存大小为 2045952K
- 伙伴系统管理的内存：伙伴系统管理的内存, 初始时对应memblock中的`memory`类型,其页框数在kernel中对应全局变量 `totalram_pages`   在下面的例子中, 可分配内存大小为1983136K
关系:** ** 物理内存 > memblock管理的内存 > 伙伴系统管理的内存
 物理内存 = memblock管理的内存 + 预申请内存
 memblock管理的内存 = 伙伴系统管理的内存 + reserverd内存(memblock的`reserved type`)  

预申请内存:**** 预申请内存是指在memblock初始化前已经申请的内存，呈现给memblock的是这部分物理内存不存在，比如lk/uboot/bootloader用到的内存。  不同平台这部分的占用大小不尽相同，有的可能为0.  

Q1:** memblock是怎么知道有些内存已经被占用的?** A1:** lk/uboot/bootloade修改DTB中memory节点下的空间区段(reg), kernel中读取这些空间区段(reg),空间区段之间的内存空间就是被预申请已经占用了的.  

`//kernel log 中的输出, 代码实现在 mem_init_print_info()
//关系:2097152K(物理2GB) = 2045952K(memblock管理的内存) + 51200K(预申请内存)
//关系:2045952K(memblock管理的内存) = 1982176K + 63776K + 0K
//1982176K 是此时 totalram_pages*4K 的大小, 也即memblcok管理的`memory type` 部分
//63776K 是memblcok管理的`reserved type` 部分
[    0.000000] -(0)[0:swapper]Memory: 1982176K/2045952K available (12924K kernel code, 1384K rwdata, 4392K rodata, 960K init, 5936K bss, 63776K reserved, 0K cma-reserved)

///proc/meminfo的输出
//1983136 是此时 totalram_pages*4K 的大小
lsg@eebbk:~$adb shell cat /proc/meminfo
MemTotal:        1983136 kB`

**Q2:** 为什么MemTotal的大小比实际物理内存小?** A2:** 这个部分比实际的物理内存小,就是少了上面说的两个部分:预申请内存和kernel reserved内存. 预申请内存: 这部分的大小可以查看`/d/memblock/memory`相对物理内存空闲的部分.  reserved内存: 这部分大小可以查看`/d/memblock/reserved`的大小,或者kernel log中的大小(上例中63776K)

**Q3:** 为什么开机时 `totalram_pages`的大小(上例中1982176K) 和 `totalram_pages`的大小(上例中1983136K) 开机后 不一致呢?** A3:** 这是因为memblock管理的`reserved type`中部分内存在初始化完毕后释放了,添加到了伙伴系统(buddy system)中. 详细代码见`free_initmem()`  比如上面的log, 1982176K + 960K = 1983136K

** [    2.258901] -(2)[1:swapper/0]Freeing unused kernel memory: 960K
 Q4:** kernel代码部分的占用在哪个部分体现?** A4:** 这部分包含 kernel code+rwdata+rodata+init+bss , 在 kernel log中已经输出. 这部分的物理占用计算在reserved部分.详细代码见 `arm64_memblock_init()`. 另外kernel code物理区域也会vmap到虚拟地址空间，其vmap的区间可以看 `/proc/vmallocinfo`中带有`paging_init`的行。

#### 1.3 reserved包含哪些

前面说到，memblock管理的内存, 包含伙伴系统管理的内存和reserved两部分。 那reserverd部分的内存占用又包含哪些呢？详细分解来看，至少包含以下这些部分：

1、代码 包含 kernel code+rwdata+rodata+init+bss 等，都计入到reserved部分。** 分配路径：

>  arm64_memblock_init()
 

2、struct page 我们知道整个物理内存被分配为若干个页框(page frame)，一般大小位4K，一个页框对应一个`struct page`结构。`struct page`的内存占用就是在reserved部分，物理内存越大，这个区域就越大。比如2GB RAM，可能需要32MB大小的`struct page`。
 分配路径：

>  __earlyonly_bootmem_alloc()
 

3、percpu 为所有已定义的per-cpu变量分配副本空间，静态定义的per-cpu变量越多，这个区域越大。
 分配路径：

>  setup_per_cpu_areas() --> pcpu_embed_first_chunk() --> pcpu_dfl_fc_alloc()
 

4、devicetree 解析DTB消耗的内存
 分配路径：

>  unflatten_device_tree() --> early_init_dt_alloc_memory_arch()
 

5、dts中reserved节点 dts中通过`reserved_memory`节点申请的reserved内存
 分配路径：

>  early_init_fdt_scan_reserved_mem() --> early_init_dt_reserve_memory_arch()
 

#### 2、 从Linux角度

/proc/meminfo 是从Linux的角度统计系统的内存占用情况.

#### 2.1 /proc/meminfo

具体代码在:

>  //fs/proc/meminfo.c static int meminfo_proc_show(struct seq_file *m, void *v)
 

1、MemTotal**** 当前系统可使用的内存大小，对应全局变量`MemTotal`。 详细见上面第一节的叙述。

2、MemFree**** 当前系统空闲的内存大小，对应所有处于`NR_FREE_PAGES`状态的页框。

3、MemAvailable**** 大致等于: MemFree + Active(file) + Inactive(file) + SReclaimable  此外还考虑了内存压力水位(watermark)的情况，计算比较复杂，详细见 `si_mem_available()`. 这只是理论上系统可用的内存，即理论上可回收的内存，但是实际上能用的达不到这么多。

4、Buffers**** 块设备(block device)操作所占用的page cache大小。 块设备的缓冲区大小，详细见`nr_blockdev_pages()`

5、Cached**** 普通文件操作所占用的page cache大小。这里只是普通文件操作时的page cache，其实page cache还有swap cache 和 上面的Buffers。
 计算方法：

>  Cached = global_node_page_state(NR_FILE_PAGES) - SwapCached - Buffers
 

6、Active/Inactive**** Active = Active(anon) + Active(file)
 Inactive = Inactive(anon) + Inactive(file)
 内存中的页分为匿名页(anon)和文件页(file)。  

- 匿名页(anon)：特征是其内容与文件无关，比如malloc申请的内存，回收方法是交换到swap区。
- 文件页(file)：特征是其内容与文件相关，比如程序文件、数据文件所对应的内存页，回收方法是回写到磁盘或清空。
 在内存回收中，采用的算法是LRU(Least Recently Used)，LRU算法又将匿名页(anon)和文件页(file)都分为活跃(Active)和不活跃(Inactive)。内存回收时，首先回收的是不活跃页(Inactive)。
7、Unevictable/Mlocked**** Unevictable 对应`LRU_UNEVICTABLE`， 是LRU中不能被回收的页。Mlocked 对应`NR_MLOCK`的页。

8、SwapTotal/SwapFree**** SwapTotal 对应 Swap 区的总大小。SwapFree 对应 Swap 区的剩余大小。

9、Dirty/Writeback**** Dirty：           对应`NR_FILE_DIRTY`的页，需要写入磁盘的内存区大小 Writeback： 对应`NR_WRITEBACK`的页，正在被写回磁盘的大小

10、AnonPages/Mapped**** AnonPages:  对应`NR_ANON_MAPPED`的页，已映射的匿名页(anon)大小 Mapped:        对应`NR_FILE_MAPPED`的页，已映射的文件页的大小，Mapped 是 Cached 的一部分

11、Shmem**** 对应`NR_SHMEM`的页，是 tmpfs 和 devtmpfs 所使用的内存。

12、Slab/SReclaimable/SUnreclaim**** Slab = SReclaimable + SUnreclaim 使用slab/slub/slob机制申请的内存大小，又分为可回收(`NR_SLAB_RECLAIMABLE`)和不可回收(`NR_SLAB_UNRECLAIMABLE`)两部分。 可以通过 `/proc/slabinfo` 节点查看slab的内存信息。

13、KernelStack**** 对应 `NR_KERNEL_STACK_KB`的页， 是所有task的内核栈的内存大小。

14、PageTables**** 对应 `NR_PAGETABLE`的页，是页表(page table)的占用大小，页表(page table)的作用就是完成内存虚拟地址到物理地址的转换。 还有一个相关概念是页框(page frame)，页框(page frame)是内存管理的最小单位，就是物理页。每一个物理页都用一个对应的`struct page`结构体描述，`struct page`占用的内存在reserved内存中。

15、VmallocTotal**** 整个vmalloc的地址区间的大小，对应 `(VMALLOC_END - VMALLOC_START)`，vmalloc的真实占用可以查看`/proc/vmallocinfo`。详细见下一节。

#### 2.2 /proc/vmallocinfo

vmalloc 用于在内核中分配虚拟地址空间连续的内存，`/proc/vmallocinfo` 展示了整个vmalloc区间(`VMALLOC_END - VMALLOC_START`)中已经分配的虚拟地址空间信息，每一行表示一段区间的信息。

单个区间的信息展示代码在: 

`//mm/vmalloc.c
static int s_show(struct seq_file *m, void *p)
{
    struct vmap_area *va;
    struct vm_struct *v;

    va = list_entry(p, struct vmap_area, list);

    if (!(va->flags & VM_VM_AREA)) {
        seq_printf(m, "0x%pK-0x%pK %7ld %s\n",
            (void *)va->va_start, (void *)va->va_end,
            va->va_end - va->va_start,
            //kernel 4.14上，这里考虑了VM_LAZY_FREE 的flag, 5.x版本又去掉了这一部分
            va->flags & VM_LAZY_FREE ? "unpurged vm_area" : "vm_map_ram");

        return 0;
    }

    v = va->vm;
    ......
}`

`/proc/vmallocinfo`中每行输出的最后一个字段表示这段区间的类型，kernel 4.14上显示的类型有：

- `ioremap`(对应`VM_IOREMAP`)
- `vmalloc`(对应`VM_ALLOC`)
- `vmap`(对应`VM_MAP`)
- `user`(对应`VM_USER`)
- `vm_map_ram`(根据`vmap_area.flag`)
- `unpurged vm_area`(根据`vmap_area.flag`)
一段vmalloc区间是否已经在物理上分配对应的大小，要看具体的类型。

对于Android P来说，除`ioremap`,`map_lowmem`,`vm_map_ram`之外的类型都认为是有物理占用的，用`VmallocUsed`表示Android统计的Vmalloc内存占用。

但是如果按排除这几个类型来统计，会有一定的偏差，在Android P（kernel 为4.14），存在的误差主要表现在：

1、kernel code** 

kernel code的占用，包括kernel code+rwdata+rodata+init+bss，都计入了`memblock reserved`部分。

但是kernel code也会通过vmap映射到虚拟地址空间（见 `setup_arch() --> paging_init() --> map_kernel()`），这部分地址空间可以看含有`paging_init`关键字的行。

由于这部分默认的关键字为`vmap`, 所以是统计在 `VmallocUsed`中的。

**2、binder** 

Binder的内存分配是用户空间调用`mmap()`, 到kernel中`binder_mmap()`的流程中为用户空间映射分配内存，但是只映射了VMA区间大小的( 比如`BINDER_VM_SIZE`)虚拟地址空间，并没有分配物理页，是等到binder传输需要使用内存时，才在`binder_update_page_range()`中申请物理页。

比如 一个binder client 调用`binder_mmap()`，其VMA区间为1024K，但是可能目前实际只用到了4K。但1024K都被计入到`VmallocUsed`部分。 

`74bb4b1000-74bb5af000 r--p 00000000 00:13 8297                           /dev/binder
Size:               1016 kB
KernelPageSize:        4 kB
MMUPageSize:           4 kB
Rss:                   4 kB
Pss:                   4 kB`

概括来说，binder占用的内存，在进程PSS中已经统计，又统计在了kernel中，而且统计的是整个VMA区间而非实际物理占用，这造成了统计上的误差。

Android P上binder的内存信息归为`vmalloc`，这就会统计到 `VmallocUsed`中，而在Android P之前版本上，内存信息类型为`ioremap` 。

**3、unpurged vm_area** 

看`s_show()`中的代码，在kernel 4.14上，对于`va->flags`含有`VM_VM_AREA`和`VM_LAZY_FREE`位的，类型标记为`unpurged vm_area`，而只有`VM_VM_AREA`的标记为`vm_map_ram`。

看内核的提交记录，`VM_LAZY_FREE`是 在2017年7月为解决ioremap地址跳跃的问题所加上的，本意是对此类型做特殊标记。但不应该认为这种类型已经分配了物理内存，它仍然只是一段虚拟地址区间。

在2019年9月又去掉了这部分代码，最新的5.3内核版本上已经没有了`VM_LAZY_FREE`的标记。

综上来看，`unpurged vm_area`标记的区间，Android不应该认为是物理内存占用，不应统计在 `VmallocUsed`中。

`/proc/vmallocinfo`的输出示例：

`//区间起始地址-区间结束地址 
//kernel code的map
0x0000000000000000-0x0000000000000000 8912896 paging_init+0xx6c0 phys=0x0000000080080000 vmap
//binder
0x0000000000000000-0x0000000000000000 1044480 binder_alloc_mmap_handler+0xx1cc vmalloc
//unpurged vm_area
0x0000000000000000-0x0000000000000000 1044480 unpurged vm_area
//进程栈，实际只分配了4页，但地址空间有5页
0x0000000000000000-0x0000000000000000   20480 _do_fork+0xdc/0x3ac pages=4 vmalloc`

#### 2.3 free命令

free 命令的代码见:

`//external/toybox/toys/other/free.c
void free_main(void)
{
  struct sysinfo in; 
  //系统接口，获取内存信息，实质上与 /proc/meminfo 的内容相对应
  sysinfo(&in);

  xprintf("\t\ttotal        used        free      shared     buffers\n"
    "Mem:%17s%12s%12s%12s%12s\n-/+ buffers/cache:%15s%12s\n"
    "Swap:%16s%12s%12s\n", convert(in.totalram),
    convert(in.totalram-in.freeram), convert(in.freeram), convert(in.sharedram),
    convert(in.bufferram), convert(in.totalram - in.freeram - in.bufferram),
    convert(in.freeram + in.bufferram), convert(in.totalswap),
    convert(in.totalswap - in.freeswap), convert(in.freeswap));
}`

其展示的内容示例如下：

`H100:/ # free -k
        total        used        free      shared     buffers
Mem:   1983136     1604832      378304        2240       71416
-/+ buffers/cache: 1533416      449720
Swap:  1048572           0     1048572`

#### 3、从Android角度

dumpsys meminfo 是从Android的角度统计系统的内存占用情况。

可以`dumpsys meminfo -h`查看支持的参数，这里说明不接参数的情况。

对应的代码在:

`//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
private final void dumpApplicationMemoryUsage()`

展示的信息分为几个部分： - 进程PSS情况   - Total PSS by process   - Total PSS by OOM adjustment   - Total PSS by category - 整体情况   - Total RAM   - Free RAM   - Used RAM   - Lost RAM   - ZRAM

#### 3.1 整体情况

先看整体的内存占用情况，整体的内存占用情况在输出结果的最后，示例如下：

`Total RAM: 1,983,136K (status moderate)
 Free RAM: 1,016,150K (   75,626K cached pss +   562,384K cached kernel +   378,140K free)
 Used RAM: 1,108,343K (  758,523K used pss +   349,820K kernel)
 Lost RAM:  -141,361K
     ZRAM:         4K physical used for         0K in swap (1,048,572K total swap)
   Tuning: 128 (large 256), oom   322,560K, restore limit   107,520K (high-end-gfx)`

约定几个变量的值: - `totalPss`: 是展示信息中`Total PSS by process:`下所有进程的内存占用之和. - `cachedPss`:是展示信息中 `Total PSS by OOM adjustment:`下的`Cached`部分进程的内存大小之和。

使用了如下的调用关系主要读取 `/proc/meminfo`的信息，将对应字段放到 `MemInfoReader.mInfos[]`数组中，展示的信息就是`MemInfoReader.mInfos[]`中信息的组合。

`MemInfoReader.readMemInfo()
    //frameworks/base/core/java/android/os/Debug.java
  --> Debug.getMemInfo()
    //frameworks/base/core/jni/android_os_Debug.cpp
    --> android_os_Debug_getMemInfo()`

以下涉及`/proc/meminfo`中字段的直接用其显示的字符串代指。

#### 3.1.1 Total RAM

对应  `MemTotal`

#### 3.1.2 Free RAM

包括 `cached pss` , `cached kernel`, `free` 三个部分。 - `cached pss` 对应变量`cachedPss`的值。 这部分进程占用的内存并没有被释放，而由于他们都已切换到后台，且adj较低，系统认为可以释放掉这部分内存。所以对于这部分进程，系统最好有机制能及时清理掉从而释放内存。 - `cached kernel` 对应 `Buffers + Cached + SReclaimable - Mapped` 这部分的内存由于理论上是可以被Kernel回收的，所以这里也计算在free中，但是这是一个理论上的值，实际上很难做到全部回收。 - `feee` 对应 `MemFree`

#### 3.1.2 Used RAM

包括 `used pss` , `kernel`两个部分。 - `used pss` 对应两个变量的差值，即`totalPss` -  `cachedPss`。

- `kernel` 对应 `Shmem + SUnreclaim + VmallocUsed + PageTables + KernelStack`   其中`VmallocUsed` 是统计`/proc/vmallocinfo`中除`ioremap`,`map_lowmem`,`vm_map_ram`之外的和，详细见`Debug.get_allocated_vmalloc_memory()`   这部分即是对kernel的内存占用的一个统计，如果要统计kernel的内存占用，这个稍微准确一些。

#### 3.1.3 ZRAM

- 第一个数 用变量`zramtotal`来代替，表示zram实际占用的物理内存，是从`/sys/block/zram0/mm_stat`中统计而来
- 第二个数 对应 `SwapTotal - SwapFree` , 是已经在swap区的内存大小
- 第三个数 对应 `SwapTotal`， 是整个swap区的大小

#### 3.1.4 Lost RAM

对应`MemTotal - (totalPss - totalSwapPss) - MemFree - (cached kernel) - (kernel) - zramtotal`。

前面已经说过，`totalPss`对应展示信息下的 `cached pss + used pss`。 而`totalSwapPss`是统计所有进程所有VMA中`SwapPss`的页，含义是已经换入到swap区的页，则`(totalPss - totalSwapPss)`就表示未进入交换区的PSS。

Lost RAM也与 `(Total RAM) - (Free RAM) - (Used RAM) - (zramtotal) + (SwapTotal - SwapFree)`的值大致相对应，详细见代码中的计算。 Lost RAM 可以理解为内存统计的误差，是某些部分被重复计算或没有计算。可以参考这里。

就我的理解，kernel USED部分中`VmallocUsed`就存在统计不一致的问题，详细见下一节。

思考问题：** 更详细的影响`Lost RAM`的因素有哪一些呢？如何让`Lost RAM`的误差更小呢？留待后续进一步追查。

#### 3.1.5 kernel的统计误差

上面说到kernel的内存占用包含`Shmem + SUnreclaim + VmallocUsed + PageTables + KernelStack`这几个部分，而`VmallocUsed` 是统计`/proc/vmallocinfo`输出中不含有`ioremap`,`map_lowmem`,`vm_map_ram`关键字的内存区间之和，详细见`Debug.get_allocated_vmalloc_memory()`。

`//frameworks/base/core/jni/android_os_Debug.cpp
static long get_allocated_vmalloc_memory() {
}
`

`VmallocUsed`在这里会有一些统计上的误差，这个误差就造成了kernel的统计误差。

`VmallocUsed`对/`proc/vmallocinfo`的统计误差主要表现在以下方面，详细看[2.2节](https://zhuanlan.zhihu.com/p/90076117/edit#2.2%20/proc/vmallocinfo)。

- Kernel code 的重复统计
此处应该是 Android 的一个统计bug， kernel code的内存占用，既统计在了`memblock reserved`部分，又统计在了`VmallocUsed`部分。

- Binder的占用误差
binder占用的内存，在进程PSS中已经统计，又统计在了kernel中，而且统计的是整个VMA区间而非实际物理占用，这造成了统计上的误差。

#### 3.2 进程PSS情况

是对系统所有用户态进程PSS情况的统计，统计的基础是以pid获取每个进程的PSS占用情况，调用到的方法是`Debug.getMemoryInfo()`，最终是统计`/proc/pid/smaps`下的数据。各类型的内存占用信息保存在 `Debug.MemoryInfo` 对象中。

详细的单个进程的内存占用统计可以查看 [第四章](https://zhuanlan.zhihu.com/p/90076117/edit#4%E4%BB%8E%E8%BF%9B%E7%A8%8B%E8%A7%92%E5%BA%A6%E7%9C%8B)。

`//frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java
    Debug.MemoryInfo mi = new Debug.MemoryInfo();
    ......
    //调用到JNI中的 android_os_Debug_getDirtyPagesPid() --> read_mapinfo()
    //具体就是解析 /proc/pid/smaps 中的内存区间，按类型汇总信息
    Debug.getMemoryInfo(pid, mi);`

一个进程的PSS就是这些信息的相加：

`//frameworks/base/core/java/android/os/Debug.java
public int getTotalPss() {
    return dalvikPss + nativePss + otherPss + getTotalSwappedOutPss();
}

public int getTotalSwappedOutPss() {
    return dalvikSwappedOutPss + nativeSwappedOutPss + otherSwappedOutPss;
}`

1、Total PSS by process**

`Total PSS by process`下是由大到小显示所有进程的PSS情况。

**2、Total PSS by OOM ADJ**

`Total PSS by OOM adjustment`下是以进程的`OOM ADJ`值(/proc/pid/oom_score_adj, 范围在[-1000,1000])的区间分类来统计进程的PSS。ADJ的区间与类别对应如下：

对于`Cached`的进程，其ADJ很小(static final int[] DUMP_MEM_OOM_ADJ = new int[] {
        ProcessList.NATIVE_ADJ,            //ADJ在此区间的为 “Native”
        ProcessList.SYSTEM_ADJ,            //ADJ在此区间的为 “System” 
        ProcessList.PERSISTENT_PROC_ADJ,   //ADJ在此区间的为 “Persistent"
        ProcessList.PERSISTENT_SERVICE_ADJ,//ADJ在此区间的为 “Persistent Service"
        ProcessList.FOREGROUND_APP_ADJ,    //ADJ在此区间的为 “Foreground"
        ProcessList.VISIBLE_APP_ADJ,       //ADJ在此区间的为 “Visible"
        ProcessList.PERCEPTIBLE_APP_ADJ,   //ADJ在此区间的为 “Perceptible"
        ProcessList.BACKUP_APP_ADJ,        //ADJ在此区间的为 “Backup"
        ProcessList.HEAVY_WEIGHT_APP_ADJ,  //ADJ在此区间的为 “Heavy Weight"
        ProcessList.SERVICE_ADJ,           //ADJ在此区间的为 “A Services"
        ProcessList.HOME_APP_ADJ,          //ADJ在此区间的为 “Home"
        ProcessList.PREVIOUS_APP_ADJ,      //ADJ在此区间的为 “Previous"
        ProcessList.SERVICE_B_ADJ,         //ADJ在此区间的为 “B Services"
        ProcessList.CACHED_APP_MIN_ADJ     //ADJ大于此值的为 “Cached"
};`

**3、Total PSS by category**

`Total PSS by category`下是以内存占用的类型分类来统计进程的PSS。

#### 4、从进程角度看

这里说的是用户态进程的内存占用，其实内核线程也有内存占用，只是Linux/Android并未进行统计，内核线程的内存占用分散在Kernel的各类占用里，比如KernelStack,Slab等 。

**几个概念：** 查看一个进程的内存占用，需要弄清楚以下几个概念： - VSS (Virtual Set Size)   虚拟耗用内存（包含共享库占用的内存，以及分配但未使用内存） - RSS (Resident Set Size)   实际使用物理内存（包含共享库占用的全部内存） - PSS (Proportional Set Size)   实际使用的物理内存（比例分配共享库占用的内存） - USS (Unique Set Size)   进程独自占用的物理内存（不包含共享库占用的内存）

一般来说内存占用大小有如下规律：VSS >= RSS >= PSS >= USS

PSS和USS反应进程的内存占用比较有意义，PSS是按进程数比例分配共享库内存，而USS是不包括共享库内存，当一个进程被销毁后，RSS是真实返回给系统的物理内存。 具体可以参考这里

#### 4.1 dumpsys meminfo pid

`dumpsys meminfo pid` 是显示指定pid进程的PSS内存占用详细信息，这里说明不接任何参数的情况。

获取指定pid进程的内存占用信息是通过`Debug.getMemoryInfo(pid, mi)`读取整理`/proc/pid/smaps`下的数据，而展示这些信息是在 `ActivityThread.dumpMemInfoTable()`中。

#### 4.1.1 /proc/pid/smaps

`/proc/pid/maps` 展示指定pid进程下的虚拟地址空间分布，而`/proc/pid/smaps`则是对每一虚拟地址区间(VMA)更详细的展示。

具体代码在:

** //fs/proc/task_mmu.c static int show_smap(struct seq_file *m, void *v, int is_pid)
 使用如下的调用关系遍历一个VMA的所有页框(page frame)对应的`struct page`，统计的信息填充到 `struct mem_size_stats`结构体。

>  walk_page_vma(vma, &smaps_walk) --> __walk_page_range() --> walk_pgd_range()
 

以下面例子说明一个VMA展示字段的含义：

`70d98c8000-70d98f0000 r-xp 00000000 fc:00 493                            /system/lib64/vndk-sp-28/libhwbinder.so  //VMA名称，这个关键字决定了这段VMA的类型
Size:                160 kB    //该VMA占用的虚拟地址空间大小
Rss:                 132 kB    //实际占用的物理页
Pss:                   3 kB    //独占页+按比例分配的共享页
Shared_Clean:        132 kB    //共享页（比如共享库使用到的页）中符合 PageDirty(page) 的页
Shared_Dirty:          0 kB    //共享页（比如共享库使用到的页）中不符合 PageDirty(page) 的页
Private_Clean:         0 kB    //独占页中符合 PageDirty(page) 的页
Private_Dirty:         0 kB    //独占页中不符合 PageDirty(page) 的页
Referenced:          132 kB    //符合PageReferenced(page)的页
Anonymous:             0 kB    //符合PageAnon(page)的页
AnonHugePages:         0 kB
Shared_Hugetlb:        0 kB
Private_Hugetlb:       0 kB
Swap:                  0 kB    //swap的页
SwapPss:               0 kB    //swap的页按比例分配
KernelPageSize:        4 kB   
MMUPageSize:           4 kB
Locked:                0 kB`

`/proc/pid/smaps`展示的所有VMA的详细信息是 `dumpsys meminfo pid` 显示的基础。

#### 4.1.2 dumpMemInfoTable

将PSS的占用分为三大类:  - nativePss   是native部分的PSS,对应`Debug.MemoryInfo.nativePss`，对应`HEAP_NATIVE`类型.   `/proc/pid/smaps`中包含"[heap]","[anon:libc_malloc]"关键字的VMA都计作nativePss - dalvikPss   是dalvik部分的PSS，对应`Debug.MemoryInfo.dalvikPss`，对应`HEAP_DALVIK`类型.   `/proc/pid/smaps`中包含"/dev/ashmem/"开头部分关键字的VMA计作dalvikPss，具体见`read_mapinfo()`。 - otherPss   是除native和dalvik部分之外的PSS，对应`Debug.MemoryInfo.otherPss`，对应`HEAP_UNKNOWN`类型，也对应`OTHER_DALVIK_OTHER`到`OTHER_OTHER_MEMTRACK`的17个子类型.   这17个子类型都对应`/proc/pid/smaps`中VMA名称的关键字，具体见`read_mapinfo()`。

每一类型的Pss，又细分为下面这些部分，都是根据`/proc/smaps`下各VMA中页类型统计而来。 - `xxxPrivateDirty(Private_Dirty)` - `xxxSharedDirty(Shared_Dirty)` - `xxxPrivateClean(Private_Clean)` - `xxxSharedClean(Shared_Clean)` - `xxxSwappedOut(Swap)` - `xxxSwappedOutPss(SwapPss)`

比如`getTotalSwappedOutPss()`就等于`dalvikSwappedOutPss + nativeSwappedOutPss + otherSwappedOutPss`。

`dumpsys meminfo pid` 默认的输出主要有下面两个部分： 1、PSS Summary** - Native Heap   对`nativePss`的展示，还包括堆的情况： Heap Size, Heap Alloc, Heap Free.   调用了 `mallinfo() --> je_mallinfo()`获取navite 堆的信息。 - Dalvik Heap   对`dalvikPss`的展示，还包括堆的情况： Heap Size, Heap Alloc, Heap Free.   调用了`Runtime.totalMemory()` 和 `Runtime.freeMemory()`来获取dalvik 堆 `Heap Size` 和 `Heap Free`的信息。 - Other   对`otherPss`下17个子类型Pss的展示，比如 `Dalvik Other` 对应类型`OTHER_DALVIK_OTHER`， 对于字段全位0的每一展示出来。 - Total   对上面所有部分的相加。

**2、App Summary** - Java Heap:   dalvikPss 和 `OTHER_ART` 类型的PSS中`PrivateDirty` 部分之和。 - Native Heap:   nativePss 中 `PrivateDirty` 部分。 - Code:   `OTHER_SO`,`OTHER_JAR`,`OTHER_APK`,`OTHER_TTF`,`OTHER_DEX`,`OTHER_OAT`类型的PSS中`PrivateDirty` 部分之和。 - Stack:   `OTHER_STACK` 类型的PSS中的 `PrivateDirty` 部分。 - Graphics:   `OTHER_GL_DEV`,`OTHER_GRAPHICS`,`OTHER_GL`类型的PSS中`PrivateDirty` 部分之和。 - Private Other:   见 `Debug.getSummaryPrivateOther()` - System:   见 `Debug.getSummarySystem()`

#### 4.2 procrank

涉及的代码如下：

>  system/extras/procrank/ system/extras/libpagemap/
 

procrank 主要展示所有用户态进程的VSS/RSS/PSS/USS情况，用到的信息是 `/proc/pid/maps` 下的进程地址区间， 以及 使用`/proc/pid/pagemap`来得到物理页使用情况。

`int main(int argc, char *argv[]) {
    ....
    std::vectorproc_info> procs(num_procs);
    for (i = 0; i  num_procs; i++) {
        ....
        //pm_process_t *proc;
        //解析/proc/pid/maps下的进程地址区间信息，保存到proc->map[]数组中
        error = pm_process_create(ker, pids[i], &proc);
        ....
        //将 proc->map[]下的VMA信息转换为 procs[i].usage 信息
        error = pm_process_usage_flags(proc, &procs[i].usage, flags_mask, required_flags);
        ....
    }
    //展示的VSS,RSS,PSS,USS 分别用到了 proc.usage.vss,proc.usage.rss,proc.usage.pss,proc.usage.uss
}`

#### 4.2.1 /proc/pid/maps

/proc/pid/maps 展示指定pid进程下的虚拟地址空间分布，每一行对应一段虚拟地址空间，在Kernel 中对应一个 `struct vm_area_struct`结构，称为一个`VMA(virtual memory area)`。

一行信息包括该VMA的起始地址，结束地址，权限，偏移量，路径等。示例如下：

`70d965c000-70d9662000 r--p 000fa000 fc:00 523                            /system/lib64/libc.so
7fc89fe000-7fc8a1f000 rw-p 00000000 00:00 0                              [stack]`

#### 4.2.2 /proc/pid/pagemap

从 `/proc/pid/maps`得到所有的VMA之后，还需要知道VMA对应的物理内存情况，因为进程分配一个VMA后，只是得到了一段虚拟地址空间，只有在真正使用内存时才会分配对应的物理内存。

`/proc/pid/pagemap` 就是用来查询一个VMA的物理内存情况。 seek到 `/proc/pid/pagemap`虚拟地址区间的起始位置，就能读到该段线性地址区间的物理页情况，每一个64位int描述了一个物理页的情况。详细见pagemap文档。

pagemap具体实现代码在:

>  //proc/task_mmu.c static ssize_t pagemap_read(struct file *file, char __user *buf,               size_t count, loff_t *ppos)
 

procrank 流程中关键的转换  pagemap  就是在 `pm_map_usage_flags()`中，从其中可以看出VSS/RSS/PSS/USS的具体差异。

`//map:描述一个VMA
int pm_map_usage_flags(pm_map_t *map, pm_memusage_t *usage_out,
                        uint64_t flags_mask, uint64_t required_flags) {
    //使用 /proc/pid/pagemap 得到该VMA映射的物理页的信息，
    //每一个物理页的情况是一个uint64_t，保存在pagemap[]中，len是该VMA所占的页数
    error = pm_map_pagemap(map, &pagemap, &len);
    ....
    //遍历该VMA下的每一物理页(pagemap[i])
    for (i = 0; i  len; i++) {
        //只要分配了地址空间都计算在VSS中，无论物理上是否分配（物理页不存在）
        usage.vss += map->proc->ker->pagesize;

        //如果该物理页不存在或者该物理页没有被swap，则继续
        if (!PM_PAGEMAP_PRESENT(pagemap[i]) && !PM_PAGEMAP_SWAPPED(pagemap[i]))
              continue;
       ....
        //通过该页PFN得到该物理页被映射的次数count，通过/proc/pid/kpagecount节点
        error = pm_kernel_count(map->proc->ker, PM_PAGEMAP_PFN(pagemap[i]),&count);
       ....
        //只要映射过，该页就计算在RSS中
        usage.rss += (count >= 1) ? map->proc->ker->pagesize : (0);
        //按映射的次数比例分配该页的大小，计算在PSS中
        usage.pss += (count >= 1) ? (map->proc->ker->pagesize / count) : (0);
        //只有被映射过一次，才计算在USS中，即映射多次的页(比如共享库)比计算在USS中
        usage.uss += (count == 1) ? (map->proc->ker->pagesize) : (0);
        ....
    }
}`

留个问题： 为什么 dumpsys meminfo pid 显示的进程PSS大小，比procrank展示的进程PSS大小多？ 是多统计了swap?

#### 5、总结

回应一下文本开头所提的问题。
 1、为什么/proc/meminfo中的内存总大小比物理内存小?
 `/proc/meminfo`中的`MemTotal`相比物理内存少了两个部分:

- kernel进入前预申请的部分，此时memblock还未初始化。这部分的大小可以统计 `/d/memblock/memory`相对物理内存少的部分。
- kernel reserved的部分。这部分内存的大小可以统计`/d/memblock/reserved`中的各部分之和。
2、怎么看Android还剩多少可用内存比较准确？
 查看`dumpsys meminfo`中 `Free RAM` 的部分相对准确， 而`/proc/meminfo`中的`MemAvailable`只是一个理论上通过回收能达到的最大值，实际上很难达到。

3、怎么看Kernel的内存占用比较准确？
 查看`dumpsys meminfo`中 `Used RAM`下的`kernel`部分的大小，它也是`/proc/meminfo`中下面部分的和： `Shmem + SUnreclaim + VmallocUsed + PageTables + KernelStack`。 但是这部分的统计比实际占用要多，主要在`VmallocUsed`的统计，详细看 [3.1.5节](https://zhuanlan.zhihu.com/p/90076117/edit#315-kernel%E7%9A%84%E7%BB%9F%E8%AE%A1%E8%AF%AF%E5%B7%AE)

4、是哪些因素影响了Lost RAM的大小？
 有一个因素是Android 对 kernel的内存占用统计存在偏差，这有体现在对`/proc/vmalloc`中内存区间的统计。

5、怎么看一个进程的内存占用比较合适？
 一个进程的内存占用有VSS/RSS/PSS/USS之分，USS是进程的独占物理内存大小，PSS则是USS加上按比例分配的共享库内存，相对来说PSS更加合适。 通过`dumpsys meminfo pid`查看指定进程的PSS情况。
