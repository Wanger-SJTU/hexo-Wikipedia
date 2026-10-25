---
title: linux的大页内存技术开启后有什么负面影响？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-22/linux的大页内存技术开启后有什么负面影响-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 382a203e-1274-4114-9f9c-e9f3fb95ecc3
---

# linux的大页内存技术开启后有什么负面影响？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/linux-18f9faf2234)
[Read Original](https://www.zhihu.com/question/53461287/answer/3500625492)



linux支持大页内存技术hugepage，可以减少TLB miss，但是我想知道hugepage开启后有什么负面影响，为什么操作系统默认的page大…显示全部 ​

关注者

<strong>25</strong>

被浏览

<strong>12,925</strong>

创建时间：2016-12-09 15:45:46

最后编辑：2016-12-09 15:45:46

[![阿比王](https://proxy-prod.omnivore-image-cache.app/0x0,saXG_tQGvqZ-AqP7Q1MVNepQ6CT9LljYuI78dsVFT2l0/https://pic1.zhimg.com/v2-9144a74433a11c478ed45feaa28597e7_l.jpg?source=2c26e567)](https://www.zhihu.com/people/abewangm)

[阿比王](https://www.zhihu.com/people/abewangm)

​![](https://proxy-prod.omnivore-image-cache.app/0x0,sRpP1H2oa_TfsDLpATwsIt6ipVLRN7HlUZGTch2Ee4JQ/https://picx.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a.jpg?source=88ceefae)

CPU性能验证 软件架构与开发

​ 关注

1 人赞同了该回答

[发布于 2024-05-16 20:22](https://www.zhihu.com/question/53461287/answer/3500625492)・IP 属地广东

Linux 用户可以使用三种不同的模式使用大页面：

```text
* 显式大页面(EHP)
* 系统范围透明大页面(THP)
* 进程范围透明大页面(THP)
```


让我们比较一下这些选项。首先，EHP 预先保留在虚拟内存中，而THP 则没有。这使得使用EHP 的软件包更难以交付，因为它们依赖于机器管理员所做的特定配置设置。此外，EHP 静态驻留在内存中，占用宝贵的内存空间，即使它们未使用。其次，系统范围的透明大页面非常适合快速实验。无需更改用户代码即可测试在您的应用程序中使用大页面的好处。但是，将软件包运送给客户并要求他们启用系统范围的THP 是不明智的，因为这可能会对该系统上运行的其他程序产生负面影响。通常，开发人员会识别代码中可以从大页面中受益的分配，并在这些位置使用madvise 提示（每个进程模式）。

进程范围的THP 没有上述任何一个缺点，但它还有其它的缺点。之前我们讨论过，内核分配THP 对用户来说是透明的。分配过程可能涉及多个内核进程，这些进程负责在虚拟内存中腾出空间，这可能包括将内存换出到磁盘、碎片化或提升页面。透明大页面的后台维护会产生内核管理不可避免的碎片和交换问题时产生的非确定性延迟开销。EHP 不受内存碎片化影响，也不能换出到磁盘，因此延迟开销要小得多。总而言之，THP 更易于使用，但会产生更大的分配延迟开销。这正是THP 在高频交易和其他超低延迟行业不受欢迎的原因，他们更喜欢使用EHP。另一方面，虚拟机提供商和数据库往往倾向于使用进程范围的THP，因为要求额外的系统配置会给他们的用户带来负担。

---

### 针对 DTLB 进行优化

TLB 是每个核中一种快速但有限的缓存，用于内存地址的虚拟到物理地址转换。如果没有它，应用程序的每次内存访问都需要耗时地遍历内核页表，以计算每个引用的虚拟地址的正确物理地址。TLB 层次结构通常由 L1 ITLB（指令）、L1 DTLB（数据）和 L2 STLB（指令和数据的统一缓存）组成。L1（第一级）ITLB 中的失误会导致非常小的惩罚，通常可以通过流水线无序 （OOO） 执行来隐藏。STLB 中的未命中会导致调用内存页面查询。这种惩罚在运行时可能很明显，因为在此过程中，CPU 流水线会停止等待。假设 Linux 内核中的默认页面大小为 4KB，现代 L1 级 TLB 缓存最多只能保留几百个最近使用的页表条目，覆盖 \~1MB 的地址空间，而 L2 STLB 最多可以容纳几千个页表条目。

在 Linux 和 Windows 系统上，应用程序以 4KB 页面的形式加载到内存中，这是大多数系统的默认设置。如果应用程序使用数十或数百 GB 的内存，则需要许多 4KB 大小的页面，每个页面将争用有限的 TLB 条目。使用 2MB 的大页面，20MB 的内存可以映射到 10 个页面，而 4KB 的页面需要 5120 个页面。这意味着需要更少的 TLB 条目，从而减少 TLB 未命中的数量。Windows 和 Linux 都允许应用程序建立大页内存区域。HugeTLB 子系统支持取决于架构，而 AMD64 和 Intel 64 架构同时支持 2 MB和 1 GB的大页面。

正如我们刚刚所讲，减少 ITLB 未命中次数的一种方法是使用更大的页面大小。值得庆幸的是，TLB 也能够缓存 2MB 和 1GB 页面的条目。如果上述应用程序使用 2MB 页面而不是默认的 4KB 页面，它将减少 TLB 压力 512 倍。对于某些应用程序来说，使用较大的页面大小可能是有益的，因为缓存中用于存储翻译的空间更少，从而为应用程序代码提供了更多空间。大页面通常会导致更少的页面遍历，并且由于表本身更紧凑，因此在发生 TLB 丢失时遍历内核页表的惩罚会减少。

大页面可用于代码或数据。如果工作负载有大量数据，则最好尝试使用大型数据页面。大型内存应用程序（如关系数据库系统（例如 MySQL、PostgreSQL、Oracle 等）和配置了大型堆区域的 Java 应用程序经常受益于使用大页面。但是，与许多其他功能一样，大页面并不适合每个应用程序。只想分配一个字节数据的应用程序最好使用 4k 页面而不是大页面;这样，内存的使用效率就会更高。  
在 Linux 操作系统上，有两种在应用程序中使用大页面的方法：显式和透明大页面。

<strong>显式大页</strong>  
显式大页以系统内存的机制提供，作为大页面文件系统（hugetlbfs），应用程序可以使用系统调用（例如mmap）访问它。可以通过 cat /proc/meminfo 检查系统上正确配置的大页面并查看HugePages\_Total条目。可以在启动时或运行时保留大页面。在系统启动时预留是否选择的权利。可以使用[libhugetlbfs库](https://github.com/libhugetlbfs/libhugetlbfs)，该库允许覆盖现有动态链接的可执行文件使用的malloc 调用，从而在大页面(EHP) 之上分配内存。不幸的是，此项目已不再维护。它不需要用户修改代码或重新链接二进制文件。他们只需用预先填充命令行即可使用它。

```ini
LD_PRELOAD=libhugetlbfs.so 
HUGETLB_MORECORE=yes <your app command line> ，
```

还有其他库允许使用大页面（非EHP）和malloc， 为了更精细地控制从代码访问大页面（即不影响每个内存分配），开发人员有以下替代方法：

```text
* 使用 MAP\_HUGETLB 标志的 MMAP[（参考代码](https://elixir.bootlin.com/linux/latest/source/tools/testing/selftests/vm/map%5Fhugetlb.c)）。
* MMAP 使用已挂载的 HugetLBFS 文件系统中的文件（[参考代码](https://elixir.bootlin.com/linux/latest/source/tools/testing/selftests/vm/hugepage-mmap.c)）。
* SHMGET 使用 SHM\_HUGETLB 标志（[参考代码](https://elixir.bootlin.com/linux/latest/source/tools/testing/selftests/vm/hugepage-shm.c)）。
```


<strong>透明大页(THP)</strong>

Linux 还提供透明 Hugepage 支持（THP），它可以自动管理大页面，并且对应用程序透明。在 Linux 下，可以启用 THP。当需要大块内存时，它会动态切换到大页面。THP功能有两种操作模式：系统范围和进程范围。当在系统范围内启用 THP 时，内核会尝试将大页面分配给任何进程，因此不需要手动保留大页面。如果进程都启用了 THP，则内核仅将大页面分配给调用 madvise 系统调用的单个进程的内存区域。您可以通过以下方式检查系统中是否启用了 THP：

```dts
$ cat /sys/kernel/mm/transparent_hugepage/enabled
always [madvise] never
```

如果值为always (系统范围) 或madvise (每个进程)，则THP 可供您的应用程序使用。有关每个选项的详细规范，请参见Linux 内核文档中关于THP 的内容。Linux 用户可以使用三种不同的模式使用大页面：

```text
* 显式大页面(EHP)
* 系统范围透明大页面(THP)
* 进程范围透明大页面(THP)
```


让我们比较一下这些选项。首先，EHP 预先保留在虚拟内存中，而THP 则没有。这使得使用EHP 的软件包更难以交付，因为它们依赖于机器管理员所做的特定配置设置。此外，EHP 静态驻留在内存中，占用宝贵的内存空间，即使它们未使用。其次，系统范围的透明大页面非常适合快速实验。无需更改用户代码即可测试在您的应用程序中使用大页面的好处。但是，将软件包运送给客户并要求他们启用系统范围的THP 是不明智的，因为这可能会对该系统上运行的其他程序产生负面影响。通常，开发人员会识别代码中可以从大页面中受益的分配，并在这些位置使用madvise 提示（每个进程模式）。

进程范围的THP 没有上述任何一个缺点，但它还有其它的缺点。之前我们讨论过，内核分配THP 对用户来说是透明的。分配过程可能涉及多个内核进程，这些进程负责在虚拟内存中腾出空间，这可能包括将内存换出到磁盘、碎片化或提升页面。透明大页面的后台维护会产生内核管理不可避免的碎片和交换问题时产生的非确定性延迟开销。EHP 不受内存碎片化影响，也不能换出到磁盘，因此延迟开销要小得多。总而言之，THP 更易于使用，但会产生更大的分配延迟开销。这正是THP 在高频交易和其他超低延迟行业不受欢迎的原因，他们更喜欢使用EHP。另一方面，虚拟机提供商和数据库往往倾向于使用进程范围的THP，因为要求额外的系统配置会给他们的用户带来负担。

[发布于 2024-05-16 20:22](https://www.zhihu.com/question/53461287/answer/3500625492)・IP 属地广东

​赞同 1​​添加评论​收藏​喜欢

​

收起​

[![云物互联](https://proxy-prod.omnivore-image-cache.app/0x0,sh_yXNXh-ENiagXgszpqs_Nf2M3GUL0k1zcEpDzgsgl4/https://picx.zhimg.com/v2-11f094f1aea6348437b6a12f82289fe7_l.jpg?source=1def8aca)](https://www.zhihu.com/people/jmilkfan)

[云物互联](https://www.zhihu.com/people/jmilkfan)

云计算、云原生、边缘计算、5G 网络、云网融合。

## <strong>大页内存</strong>

页式内存管理技术将虚拟内存和物理内存切换为大小相同的若干个页，并通过 MMU 和页表进行转换。

以 32bit 系统为例，虚拟内存空间为 4GB，如果页的大小为 4KB，那么理论上就会存在 4GB/4KM = 1M 张页，这些页的条目无论是在二级页表还是在四级页表中都算不小的存在，而且 TLB 命中率低下，都直接关系到页表查询的效率。相对的，如果将页的大小设置得太大，又会因为页面利用率不高，容易造成空间浪费。

可见，页面大小的选择，实际上是一种时间和空间的选择。优先考虑通用型的 Linux 操作系统至今仍默认采用 4KB 的页大小，可以通过指令查看：

```angelscript
$ getconf PAGE_SIZE
4096
```

而高性能场景中，则会考虑将页面设置的比较大，比如：1GB、2GB、10GB，这样的页就被称之为 “大页”（Huge Page）。

大页能够提升性能的原因主要有 2 点：

```text
* 减少页表条目，加快检索速度。
* 提升 TLB 快表的命中率。
```


其中，TLB 是 CPU 芯片上的一个元件，硬件加速，但也非常小，通常在 16～128 个条目之间。也就是说当大页为 1GB 的时候，TLB 就能够对应到 16～128GB 之间的存储空间。

值得注意的是，即便是在高性能场景中也并非页面越大越好，因为大页太大也会降低页内地址检索的速度。所以最佳的性能搭配，往往需要大量的测试来取得性能的曲线峰值。

## <strong>Linux 的大页内存</strong>

自 Linux Kernel 2.6 起，引入了 Huge pages 的概念，目的是通过使用大页内存来支持高性能处理场景。常见的 Huge pages 有 2MB 和 1GB 这 2 种规格，2MB 适合用于 GB 级别的内存，而 1GB 则适合用于 TB 级别的内存。

## <strong>大页内存的实现原理</strong>

为了能以最小的代价来实现 Huge pages，Linux 引入了 hugetlb 和 hugetlbfs 这 2 个概念。

```text
* hugetlb 是记录在 TLB 中的条目，并指向 Huge pages。
* hugetlbfs 则是一个特殊文件系统（本质是内存文件系统）。
```


hugetlbfs 的主要作用是使得 Application 可以根据自身需要灵活地设置虚拟地址空间的页面大小，而不需要在 Linux 操作系统层面，对全局配置进行更改。

在 TLB 中存储的 hugetlb 指向一个个 hugepages，Kernel 可以通过 hugetlb entries 来分配相应的 hugepages。这些被分配的 hugepages 再以 hugetlbfs 内存文件系统的形式提供给 Application 使用。

* <strong>Regular Page 的分配流程</strong>：当一个 Application 请求内存时，它需要访问 PageTable 去调用一个实际的物理内存地址，继而获得内存空间。

![](https://proxy-prod.omnivore-image-cache.app/604x0,s6ZLV5mN-FRaPVOEBAGGb-dVut2kR2xplchk9y85yDIQ/https://picx.zhimg.com/50/v2-0174c8f76737b3f0c2af2c4b2a86aebf_720w.jpg?source=1def8aca)

* <strong>Huge Page 的分配流程</strong>：当系统配置了 Huge pages 后，Application 依然是通过普通的 PageTable 来获取到实际的物理内存地址。但不同的是，在 Process PageTable 和 System PageTable 第增加了 Hugepage（HPage）属性。当 Application 需要使用 Huge pages 时，只需要声明 Hugepage 属性，让系统分配 PageTable 中的 Huge pages 条目即可实现。

![](https://proxy-prod.omnivore-image-cache.app/604x0,sQ46McwI-_6HiGT-_y5y1rcrG2fx4MlaNtTr_tnXOuCY/https://picx.zhimg.com/50/v2-3a01664a90b26ff8935cd93594707be5_720w.jpg?source=1def8aca)

所以，实际上 Regular page 和 Huge page 是共享一个 PageTable 的，Kernel 以最小的代码实现来支持了 Huge pages。

使用 Huge pages 的好处是很明显的，假设应用程序需要 2MB 的内存。

```text
* 当操作系统以 4KB 作为分页的单位，则需要 512 个页面，进而在 TLB 中需要 512 个表项，同时也需要 512 个页表项，操作系统需要经历至少 512 次 TLB Miss 和 512 次缺页中断才能将 2MB 应用程序空间全部映射到物理内存；
* 而当操作系统采用 2MB 作为分页的基本单位时，只需要一次 TLB Miss 和一次缺页中断，就可以为 2MB 的应用程序空间建立虚实映射，并在运行过程中无需再经历 TLB Miss 和缺页中断（假设未发生 TLB 项替换）。
```


此外，使用 Huge pages 还能减少系统管理和 CPU 访问内存页的时间（扩大了 TLB 快页表查询的内存地址范围）。合理设置大页面能减少内存操作的负担，减少访问页表造成性能瓶颈的可能性，从而提升系统性能。由此，如果你的系统空间非常大时，可以考虑启用大页内存。

## <strong>大页内存的配置使用</strong>

大页面配置需要连续的内存空间，因此在开机时就分配是最可靠的设置方式。配置大页面有 3 个关键参数：

1. <strong>hugepages</strong> ：在内核中定义了开机启动时就分配的永久大页面的数量。默认为 0，即不分配。只有当系统有足够的连续可用页时，分配才会成功。由该参数保留的页不能用于其他用途。
2. <strong>hugepagesz</strong>：在内核中定义了开机启动时分配的大页面的大小。可选值为 2MB 和 1GB 。默认是 2MB 。
3. <strong>default\_hugepagesz</strong>：在内核中定义了开机启动时分配的大页面的默认大小。

另外，值的注意的是，在开启大页内存的环境中，通常也会习惯性的关闭 Swap 交换分区，因为这两者间是矛盾的关系。

* <strong>Step 1</strong>. 查看 Linux 操作系统是否启动了大页内存，如果 HugePages\_Total 为 0，意味着 Linux 没有设置或没有启用 Huge pages。

```dts
$ grep -i HugePages_Total /proc/meminfo
HugePages_Total:       0

```

* <strong>Step 2</strong>. 查看是否挂载了 hugetlbfs

```routeros
$ mount | grep hugetlbfs
hugetlbfs on /dev/hugepages type hugetlbfs (rw,relatime)

```

* <strong>Step 3</strong>. 如果没有挂载则手动挂载

```awk
$ mkdir /mnt/huge_1GB
$ mount -t hugetlbfs nodev /mnt/huge_1GB

$ vim /etc/fstab
nodev /mnt/huge_1GB hugetlbfs pagesize=1GB 0 0

```

* <strong>Step 4</strong>. 修改 grub2，例如为系统配置 10 个 1GB 的大页面

```routeros
$ vim /etc/grub2.cfg

# 定位到 linux16 /vmlinuz-3.10.0-327.el7.x86_64 在行末追加
default_hugepagesz=1G hugepagesz=1G hugepages=10

```

<strong>NOTE</strong>：配置大页面后，系统在开机启动时会首选尝试在内存中找到并预留连续的大小为 `hugepages * hugepagesz` 的内存空间。如果内存空间不满足，则启动会报错 `Kernel Panic, Out of Memory` 等错误。

* <strong>Step 5</strong>. 重启系统，查看更详细的大页内存信息

```yaml
$ cat /proc/meminfo | grep -i Huge
AnonHugePages:   1433600 kB     # 匿名 HugePages 数量
HugePages_Total:       0        # 分配的大页面数量
HugePages_Free:        0        # 没有被使用过的大页面数量
HugePages_Rsvd:        0        # 已经被分配预留但是还没有使用的大页面数目，应该尽量保持 HugePages_Free - HugePages_Rsvd = 0
HugePages_Surp:        0        # surplus 的缩写，表示大页内存池中大于 /proc/sys/vm/nr_hugepages 中值的大页面数量
Hugepagesize:       1048576 kB     # 每个大页面的 Size，与 HugePages_Total 的相乘得到大页面池的总容量

```

如果大页面的 Size 一致，则可以通过 `/proc/meminfo` 中的 `Hugepagesize` 和 `HugePages_Total` 计算出大页面所占内存空间的大小。这部分空间会被算到已用的内存空间里，即使还未真正被使用。因此，用户可能观察到下面现象：使用 `free` 命令查看已用内存很大，但 `top` 或者 `ps` 中看到 `%mem` 的使用总量加起来却很少。

* <strong>Step 6</strong>. 如果上述输出看见 Hugepagesize 已经设置成 1GB，但 HugePages\_Total 还是为 0，那么需要修改内核参数设定大页面的数量

```elixir
$ sysctl -w vm.nr_hugepages=10

# 或者
$ echo 'vm.nr_hugepages = 10' > /etc/sysctl.conf 
$ sysctl -p

```

<strong>NOTE</strong>：一般情况下，配置的大页面可能主要供特定的应用程序或服务使用，其他进程是无法共享这部分空间的（如 Oracle SGA）。请根据系统物理内存和应用需求来设置合适的大小，避免大页面使用的浪费；以及造成其他进程因竞争剩余可用内存而出现内存溢出的错误，进而导致系统崩溃的现象。默认的，当存在大页面时，会在应用进程或者内核进程申请大页内存的时候，优先为它们分配大页面，大页面不足以分配时，才会分配传统的 4KB 页面。查看哪个程序在使用大页内存：

```tcl
grep -e AnonHugePages /proc/*/smaps | awk '{if(2>4)print0}' | awk -F "/" '{print0;system("ps−fp"3)}'

```

## <strong>大页面对内存的影响</strong>

需要注意的是，为大页面分配的内存空间会被计算到已用内存空间中，即使它们还未真正被使用。因此，你可能观察到这种现象：使用 free 命令查看已用内存很大，但 top 或者 ps 指令中看到 %MEM 的使用总量加起来却很少。

例如：总内存为 32G，并且分配了 12G 大页面的 free 如下

```yaml
$ free -g
              total        used        free      shared  buff/cache   available
Mem:             31          16          14           0           0          14
Swap:             3           0           3

```

命令 top 输出， Shift+m 按内存使用量进行排序：

![](https://proxy-prod.omnivore-image-cache.app/590x0,sVLLQeXqJc-1la6it4Gnwdk-gb8Nw00LAh_4wTv0fMCQ/https://pic1.zhimg.com/50/v2-a9fbf9a227aab8072ed256d181a8263c_720w.jpg?source=1def8aca)

命令 `ps -eo uid,pid,rss,trs,pmem,stat,cmd`，查看进程的内存使用量：

![](https://proxy-prod.omnivore-image-cache.app/699x0,soj4-aQ7ggbQndtk4sg7z0r-l2EeLRwMS0xk0rlJPj4k/https://picx.zhimg.com/50/v2-89171b1060d5fb70c0342127fb747f74_720w.jpg?source=1def8aca)

在这里插入图片描述

这种情况说明了一个问题：如果盲目的去提高大页内存空间的占比，就很可能会出现胖的胖死，饿的饿死的问题。导致大页内存空间的浪费，因为普通程序是未必能够使用大页内存的。

## <strong>THP 透明巨型页</strong>

Transparent Huge pages（THP，透明大页）从 RHEL 6 开始引入。由于传统的 Huge pages 很难手动的管理，对于程序而言，可能需要修改很多的代码才能有效的使用。THP 的引入就是为了便于系统管理员和开发人员使用大页内存。

THP 是一个抽象层，能够自动创建、管理和使用传统大页。操作系统将大页内存看作是一种系统资源，在 THP 开启的情况下，其他的进程也可以申请和释放大页内存。

Huge pages 和 Transparent Huge pages 在大页内存的使用方式上存在区别，前者是预分配的方式，而后者则是动态分配的方式，显然后者更适合程序使用。需要注意的是，THP 虽然方便，但在某些场景种仍然会建议我们关闭，这个需要结合实际应用场景慎重考虑。

<strong>手动关闭 THP</strong>：

```elixir
$ echo never > /sys/kernel/mm/transparent_hugepage/enabled 
$ echo never > /sys/kernel/mm/transparent_hugepage/defrag

$ cat /sys/kernel/mm/transparent_hugepage/enabled
[always] madvise never

# - [always] 表示启用了 THP
# - [never] 表示禁用了 THP
# - [madvise] 表示只在 MADV_HUGEPAGE 标志的 VMA 中使用 THP

```

<strong>永久关闭 THP</strong>：

```makefile
vim /etc/grub2.cfg

# 在 cmdline 追加：
transparent_hugepage=never

```

<strong>\- END -</strong>

_关于 “云物互联” 微信公众号：_

_欢迎关注 “云物互联” 微信公众号，我们专注于云计算、云原生、SDN/NFV、边缘计算及 5G 网络技术的发展及应用。热爱开源，拥抱开源！_

<strong>技术即沟通</strong>

<strong>化云为雨，落地成林</strong>

展开阅读全文​

​赞同 10​​添加评论​收藏​喜欢

​

[![panic](https://proxy-prod.omnivore-image-cache.app/0x0,sMPQPHrTOgcmrZstTFeZxQHCBuX9cgarLGWqCQhkuu-U/https://picx.zhimg.com/v2-57172b302bd1332f9461f0004e8480b9_l.jpg?source=1def8aca)](https://www.zhihu.com/people/vonnyfly)

[panic](https://www.zhihu.com/people/vonnyfly)

Kernel/Qemu/SPDK 贡献者

开启2M大页，应用也需要做相应的优化，否则，内存的浪费是很可观的，且发挥不出优势。具体说来，像Page cache，三级页表这些因为页面变大都要重新计算。如果数据比较小，或小文件较多，2M这样的单位来烧内存，多少才够用呢。一般只有特定的领域采用大页，如Dpdk里就充分利用大页来加速IO，一些依赖dpdk的东东，像spdk也同样，可以去学习。

[发布于 2017-01-08 10:29](https://www.zhihu.com/question/53461287/answer/139777801)

​赞同 5​​1 条评论​收藏​喜欢

​

