---
title: (1 条消息) 高性能内存分配库Libhaisqlmalloc的设计思路
date: "2021-12-08 00:00:00"
updated: "2021-12-08 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/高性能内存分配库Libhaisqlmalloc的设计思路/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/352938740
---


<strong>第二章</strong> <strong>软件概述</strong>

### <strong>1.描述</strong>

Libhaisqlmalloc高性能内存分配库，简称“高性能内存分配库”，是由乌鲁木齐云山云海信息技术有限责任公司开发和发行的内存分配库，是一种新型高性能内存分配库，管理堆内存，主要接口是malloc和free，用于减慢频繁分配、释放内存造成的性能损耗，并且有效地控制内存浪费和内存碎片，更适合大型应用程序的配套使用。

Libhaisqlmalloc高性能内存分配库开发语言是C++,编译链工具是gcc，软件源码总行数高达4万多行。**

第三章  软硬件环境和使用方法**

### <strong>1.运行硬件环境</strong>

（1）、内存：512M及以上（建议1G以上）

（2）、CPU：主频1 GMHz以上（建议Intel Core2 以上）

### <strong>2.运行软件环境</strong>

建议使用：Linux系统4.0 以上64bit版本 x86_64 GNU/Linux

对于低于Linux系统3.X 64bit版本, 可能会存在Hugepage无法使用的问题。 

### <strong>3.使用方法：</strong>

Libhaisqlmalloc 内存分配库的使用有两种方法：

1）设置LD_PRELOAD=带路径的libhaisqlmalloc.so，

例如执行：export LD_PRELOAD=/mnt/guo/libhaisqlmalloc.so，这种方法很简单不需重新编译程序，并且可以随时切换回系统默认的内存库， 或者使用其他内存库。如果需要默认自动配置，可以在配置默认环境变量配置终端启动时自动执行一些指令, 可以在 ~/.bashrc, ~/.bash_profile, ~/.profile, 或者 ~/.zshrc 文件添加这些指令。Ubuntu系统修改的~/.bashrc，增加一行export LD_PRELOAD=带路径的libhaisqlmalloc.so。

2）将libhaisqlmalloc库链接到程序中，注意应该将haisqlmalloc库后链接到程序中；

在gcc 编译器的链接中使用参数 -L路径（libhaisqlmalloc.so所在的路径） -lhaisqlmalloc

建议使用前一种方法，这种方式更简单，并且适应性更好，可以根据需要随时切换内存分配库。

下面是使用Libhaisqlmalloc库的一个范例：

**

以上可以看到，使用export LD_PRELOAD配置后，就已经自动使用Libhaisqlmalloc库了。

使用Libhaisqlmalloc库将会显示5行Notice：

第1行：提供了版权信息，

第2行：提供了版本支持信息，基本版本，支持的NUMA node数量，默认为8,一般的机器只有一个NUMA node，中高端服务器一般也只有8个以下的NUMA node。一般的机器均在128个CPU以下，只有高端服务器才会有128个以上的CPU, 此时就需要联系软件开发商索要ADVANCE版本, 以便支持更多的CPU。

第3行：表示这是一个未注册的测试版本，需要购买。

第4行：提供了一个购买合法版本的链接，购买后将提供一个libhaisqlmalloc.conf的配置文件，将这个配置文件拷贝到/etc/libhaisqlmalloc.conf下或者拷贝到当前libhaisqlmalloc.so文件所在的目录下均可以实现软件许可证License的正确配置，变为合法用户。

第5行：提供了libhaisqlmalloc.so文件还能被测试多久，剩余的测试时间。默认的测试时间是30*24小时。

注册成功后，不会显示以上信息。可以通过调用haisql_malloc_version()函数，显示版权信息。

第四章  配置文件和配置选项**

外部配置文件：

默认的配置文件1是： /etc/libhaisqlmalloc.conf

默认的配置文件2是： 当前libhaisqlmalloc.so文件所在的目录下的libhaisqlmalloc.conf文件

在Libhaisqlmalloc 库的使用过程中，将会依次使用配置文件1和配置文件2,获取配置信息。如果配置文件1存在，将不读取配置文件2。如果两个配置文件均不存在，那么就按照默认值执行。

每个配置参数即可以通过conf文件来修改，也可以通过调用函数mallopt( int int_key, int int_value ) 来修改定义。其中int_value是设置的值。

Libhaisqlmalloc 库的key值范围是10000 ---10030。

配置参数范例：

uint_microseconds_thread_background_sleep=100

uint_wait_microseconds_between_release_2m=4000

配置参数介绍如下：

uint_microseconds_thread_background_sleep

类型：无符号整数

默认值：1000

意思：默认值是1000, 表示后台线程每1000微秒（1毫秒）会主动唤醒一次，执行后台任务。实际后台线程在工作中，每次探测到提前准备2M大块的需求，将唤醒时间周期减慢一半直到50微秒，否则恢复使用配置值。

范围：大于等于50， 低于50的配置将自动修改为50

mallopt int_key=10000

uint_wait_microseconds_between_release_2m

类型：无符号整数

默认值：4000

意思：默认值是4000, 表示后台线程每4000微秒可以释放1个2M块，每秒允许释放512M内存。这个配置参数减慢了内存的释放速度，提高了重复使用待释放内存的概率，因此提高了性能。

mallopt int_key=10001

bool_enable_thread_background_clear_cpu_cache

类型：Boolean

默认值：true

意思：后台线程将会自动清理释放给系统的内存的CPU cache, 将这部分内存从CPU的L1L2L3级Cache中彻底淘汰掉，此功能将增加内存分配库和应用程序的性能，一般会增加内存分配库10%以上的性能，启用后将会增加后台线程的工作负荷。

mallopt int_key=10002

bool_enable_hugepage2m

类型：Boolean

默认值：true

意思：是否启用 hugepage2m， 这里是hugepage2m的总开关。满足2个条件，将尝试启用hugepage2m，第1个是启用了后台工作线程，第2个条件是本参数设置为允许，后台线程才会自动尝试启用hugepage2m。这种设计方案主要是考虑Hugepage2M的内存申请都会实际分配物理内存，开销比较大，启用后台线程才能避免这种开销。

mallopt int_key=10003

uint_size_use_thread_background_threshold

类型：无符号32bit整数

默认值：8388608

意思：申请内存总量超过配置值（默认是8M） 将会尝试启用后台线程　

注意：此配置项不支持K/M/G/T的后缀，必须是一个纯数字．

mallopt int_key=10004

bool_enable_thread_background

类型：Boolean

默认值：true

意思：是否启用 后台线程， 这里是后台线程总开关。有两种情况下，将尝试启用后台线程，一种是申请内存总量超过配置值(见uint_size_use_thread_background_threshold的说明)，另外一种是探测到创建了额外工作线程， 也会自动尝试启用后台线程。

mallopt int_key=10005

bool_enable_auto_bind_cpu

类型：Boolean

默认值：false

（2021-09-27 1.40版本之后默认是 false, 之前默认是true， 原因是2021年intel新款CPU是大小核的设计，Intel建议由系统来进行CPU的分配，不建议用户自行绑定CPU )。

意思：是否启用＂工作线程自动绑定CPU＂．此功能启用后，将会在线程申请内存时自动检查是否已经指定了运行的CPU范围，如果没有指定，将自动执行线程自动绑定CPU：

首先探测CPU 是否支持超线程，如果是支持超线程的CPU, 将自动将工作线程绑定到一个物理CPU上的多个逻辑CPU上（这种在同一个物理CPU上的在逻辑CPU上的线程切换不会造成Cache颠簸，具备良好的线程切换性能）。

如果CPU不支持超线程，将自动将工作线程绑定到同一NUMA node下的1--2个相邻的物理CPU上。（见后面配置参数uint_auto_bind_cpu_count）

mallopt int_key=10006

bool_enable_numa_memory_bind

类型：Boolean

默认值：false

意思：是否启用NUMA node内存绑定，目前只有中高端服务器才支持NUMA, 传统PC和低端服务器（单一CPU槽位的服务器）不支持NUMA。目前默认是关闭的，打开此选项，将会在支持NUMA的服务器上启用按工作线程的所在NUMA node优先的内存分配策略，带来性能增加。

mallopt int_key=10007

uint_vt_thread_local_wait_reuse_limit_size

类型：无符号整数

默认值：8

意思： 限制用于保存备用thread_local的池子大小的限制大小．即当线程退出时，如果备用thread_local池的空间超过限制大小, 并且该thread_local相关的所有malloc指针都已经释放，那么这个thread_local数据结构将执行析构。否则，这些数据那么这个数据结构将被缓存下来用于重用，在下次新的线程创建后，将优先复用这些备用的thread_local数据，

这种pool池减少了大量线程反复创建退出，一堆thread_local内部相关对象反复创建和析构带来执行开销浪费。

mallopt int_key=10008

bool_enable_page_prefault

类型：Boolean

默认值：false

意思：申请内存时是否实际分配4KiB page页面的物理地址，这个功能点启用后，将会浪费空间，将会略微增加用户程序的性能。因为集中产生实际物理页面的分配，会增加一些程序的稳定性（例如：避免Facebook fstring早期版本末尾‘\0’推迟实现Bug）。

注意：这个参数在启用后台线程时，将自动修改为true，即默认实际分配4KiB page页面的物理地址。

注意：申请hugepage2M的页面都会实际分配物理地址，Hugepage2M没有修改配置的地方。

mallopt int_key=10009

bool_enable_thread_background_use_page_prefault

类型：Boolean

默认值：false    

注意：这个参数在早期版本中有用，在新版本中已经淘汰。

mallopt int_key=10010

如何在代码中提前启用hugepage和后台线程，增加性能表现？

mallopt int_key=10011,是一个功能提前启用点，表示提前启用hugepage，而不考虑其他配置参数

１）如何在代码中提前启用hugepage，增加性能表现？

方法：mallopt( 10011, 1 );

Int_key=编码10011内部定义为立即尝试启用hugepage。

注意：将强制启用hugepage2m，而不考虑其他配置参数。

注意：必须要保证机器内部配置有Hugepage2M的页面，才会真正启动hugepage2M。具体的hugepage2M的配置方法见《第五章产品介绍和说明 第11节关于HugePage的一些建议》。

mallopt int_key=10012,是一个功能提前启用点，表示提前启用后台线程，　而不考虑其他配置参数

2）如何在代码中提前启用后台线程，增加性能表现？

方法：mallopt( 10012, 1 );

Int_key=编码10012内部定义为立即尝试启用后台线程。

注意：将强制启用后台线程，而不考虑其他配置参数。

uint_thread_background_div_number_calc_prepare_2m

类型：无符号整数

默认值：8

意思：后台线程计算需要提前准备的2M大块时的除数，默认值是8, 就是说内存使用2M块总量/除数8=需要准备的2M大块的数量。

范围：大于等于2， 低于2的配置将自动修改为2

mallopt int_key=10013

uint_thread_background_need_prepare_2m_count_limt

类型：无符号整数

默认值：8

意思：后台线程需要提前准备的2M大块的数量限制。默认值是8,表示限制需要准备的2M大块的数量为不超过8, 即限制只能提前准备8个2M大块。（计算方法见上面一条）

mallopt int_key=10014

uint_microseconds_thread_background_force_release_one_2m

类型：无符号整数

默认值：500000

意思：默认值500000, 表示后台线程每500000微秒（500毫秒）强制释放掉一个2M大块。这个功能可以在空闲时自动释放掉提前准备的多余2M大块内存，实现低内存占用。

如果这个参数配置为零，表示彻底关闭掉这个功能。

mallopt int_key=10015

uint_auto_bind_phy_cpu_count

类型：无符号整数

默认值：2

意思：默认值2, 表示启用＂工作线程自动绑定CPU＂后（见前面bool_enable_auto_bind_cpu

的配置说明），如果CPU不支持超线程，将自动将工作线程绑定到同一NUMA node下的1--2个相邻的物理CPU上。如果CPU支持超线程， 此参数无效。

范围：1或者2,超出范围的配置将自动修改为2。

mallopt int_key=10016

bool_enable_thread_background_page_release

类型：Boolean

默认值：true

意思：后台线程将会定期自动释放给多余的空闲常规page内存， 默认是允许。

mallopt int_key=10018

bool_enable_thread_background_hugepage2m_release

类型：Boolean

默认值：true

意思：后台线程将会定期自动释放给多余的空闲hugepage2M内存， 默认是允许。

mallopt int_key=10019

bool_malloc_size_plus

类型：Boolean

默认值：false

意思：是否启用申请内存的时候1-4088字节多申请8字节内存，主要是用于防止用户应用程序内部的一些越界bug， 默认是没有启用。当这个选项启用时，将会在申请1字节--(2M-8)字节时多分配8字节的内存。对于2M字节以上的情况，不会多分配8字节的内存，还是按照2M字节进行对齐。

mallopt int_key=10020

bool_enable_leak_check

类型：Boolean

默认值：false

意思：是否启用内存泄露检查，当探测到内存泄露的时候，会输出相关信息。系统启用进程/线程时会有少量几个指针不释放，是正常现象，大约是进程有320字节和1024字节各一个指针，每创建一个线程有320字节的一个指针，另外版权探测代码有4096字节一个指针，由于系统设计的原因这些都不会自动释放，是正常现象。

 默认是没有启用内存泄露检查。

mallopt int_key=10021

uint_wait_microseconds_can_release_2m_after_malloc_2m

类型：无符号整数

默认值：16000

意思：默认值是16000, 表示从系统申请2M块后（表示没有足够的备用2M块），后台线程将在之后的16000微秒（16毫秒）内暂停执行释放2M块的动作。这个配置参数减慢了内存的释放速度，提高了重复使用待释放内存的概率，因此提高了性能。

mallopt int_key=10022

uint_sync_wait_nanoseconds

类型：无符号整数

默认值：400

意思：默认值是400, 这个是内部参数，不建议用户擅自修改。表示一些内部场景下等待同步的时延，一些内部场景下跨CPU的数据写完后默认需要等待400ns才允许另外一个CPU读。

mallopt int_key=10023

g_bool_memory_use_real_realloc

类型：Boolean

默认值：false

意思：默认值是false, 表示不使用真正的realloc，原因是部分Linux下的桌面程序的原因，使用真正的realloc在原位扩容会导致崩溃，为了兼容性，realloc默认实际是使用malloc new+memcpy old+free old的方式实现的，减慢了一些性能，但是有更好的兼容性。

对于大于等于2000KiB的内存申请，实际是使用了mremap 系统调用来扩容，实际还是使用了真正的realloc,无论是否返回原指针，高版本的Linux系统内部有页面迁移优化，都可以避免一些页面的拷贝，提供更高的性能。

mallopt int_key=10024

uint_use_sbrk_byte_threshold_force_page_prefault

类型：无符号整数

默认值：163840

意思：默认值是163840，即160KiB，当程序使用的紧急内存超过160KiB后，将强制启用提前分配所有内存的功能，并修改bool_enable_page_prefault为true, 具体见参数bool_enable_page_prefault的说明。

（紧急内存的解释：是通过sbrk方式申请的共享的一块内存（默认大小为2MiB），这块内存是紧急内存块，是so文件初始化尚未完成前就开始执行malloc申请的内存，主要用于内存分配库自身so文件还没有初始化完毕的场景下分配内存，因此也叫紧急内存)。

启用这个功能点的目的是对于一些大型桌面程序通过强制启用预分配物理内存机制，实现增加一些Linux下的桌面程序的稳定性。

这个功能点的缺点是所有内存申请都会实际分配物理内存，因此会浪费一些物理内存，但是会增加稳定性。

mallopt int_key=10025

bool_show_malloc_status_on_enter

类型：Boolean

默认值：false

意思：在进入libhaisqlmalloc库后，自动显示内存使用情况，主要是以sbrk相关数据结构的内存使用情况，可以用于上一个参数 uint_use_sbrk_byte_threshold_force_page_prefault 的设置参考。

mallopt int_key=10026

bool_show_malloc_status_on_exit

类型：Boolean

默认值：false

意思：在退出libhaisqlmalloc库前，自动显示内存使用情况。主要是用于调试显示各应用程序的内存使用情况。

mallopt int_key=10027

uint_thread_stack_page_prefault_size

类型：无符号整数

默认值：0

范围: 0----512KiB

意思：默认值是0。当创建线程后，Linux系统默认分配8M的虚拟内存，分配4KiB的物理内存，这个参数的作用是对于创建的线程默认会主动提前多分配一些stack栈的物理内存，实现预先分配少量栈内存，但不会修改Linux系统默认分配8M的stack虚拟内存的数量，在一些场景下会增加性能和稳定性。

mallopt int_key=10028

bool_enable_malloc_force_page_prefault

类型：Boolean

默认值：true

意思：默认值是true，表示malloc申请内存返回前，将向系统申请实际分配物理内存。启用后将会增加稳定性，但是会浪费内存。本参数只管理单次申请小于等于2000KiB内存。

与参数bool_enable_page_prefault的区别是：bool_enable_page_prefault会在每次申请大块2MiB内存时分配物理内存，一次就是2MiB，调用次数少，所以性能高。这个参数是在每次申请小内存时，才物理分配每个页面，内存浪费少，但是会频繁调用（每次malloc调用时检查调用），所以性能低。

当启用bool_enable_page_prefault后，本参数自动无效。对于占用内存总量比较多的程序，建议设置bool_enable_page_prefault 为true可以获得更高的性能。(例如：mallopt( 10009, 1 );)

mallopt int_key=10029

bool_enable_realloc_force_page_prefault

类型：Boolean

默认值：true

意思：默认值是true，表示realloc申请内存返回前，将向系统申请实际分配物理内存。启用后将会增加稳定性，但是会浪费内存。本参数只管理单次申请申请小于等于2000KiB以下内存。

当启用bool_enable_page_prefault后，本参数自动无效。对于占用内存总量比较多的程序，建议设置bool_enable_page_prefault 为true可以获得更高的性能。(例如：mallopt( 10009, 1 );)

mallopt int_key=10030

bool_enable_malloc_over_2m_force_page_prefault

类型：Boolean

默认值：true

意思：默认值是true，表示对于大于2M的malloc内存申请，malloc申请内存返回前，将向系统申请实际分配物理内存。启用后将会增加程序的稳定性，但是会浪费内存。本参数只管理单次申请大于2000KiB内存。

mallopt int_key=10031

bool_enable_realloc_over_over_2m_force_page_prefault

类型：Boolean

默认值：true

意思：默认值是true，表示对于大于2M的realloc内存申请，realloc申请内存返回前，将向系统申请实际分配物理内存。启用后将会增加程序的稳定性，但是会浪费内存。本参数只管理单次申请大于2000KiB内存。

mallopt int_key=10032

### <strong>第五章  产品介绍和说明</strong>

### <strong>1.产品介绍</strong>

(1)libhaisqlmalloc.so

这个是库文件，适合在Linux 系统下的内存分配库。

（2）test_malloc_use_so：

这个是linux 下的已经编译好的一个测试文件。

性能测试软件的用法：

1）测试用法1：   ./test_malloc_use_so

2）测试用法2：   ./test_malloc_use_so --help

Usage: test_malloc_use_so  test_count  loop_count  thread_count

Default:  test_count 1000000

Default:  loop_count 2

Default:  thread_count 1

3）测试用法3：  ./test_malloc_use_so 10000 2 8

（3）test_malloc_use_so.cpp文件：

这个文件是上面所述的性能测试文件的C++源代码，用于进行性能测试比对。这个测试软件是自研的开源代码，为了方便大家使用和修改，Apache2开源协议，提供了全部源码。

为了方便软件工程师和系统管理员使用内存分配库，需要对Libhaisqlmalloc内存分配库的内部实现有细致的理解，因此在后面详细介绍了内存库的各种参数的设计和实现方案。

### <strong>2.性能高的主要原因</strong>

    Libhaisqlmalloc高性能内存分配库，用于减慢频繁分配、释放内存造成的性能损耗，并且有效地控制内存碎片。Libhaisqlmalloc采用了新的软件技术，具备极高的性能表现。在Intel CPU 9400F(2.9G默认频率)下测试100万次malloc4KiB平均一次4KiB malloc动作, tcmalloc需要近一千ns, 而Libhaisqlmalloc只要数十ns。

Libhaisqlmalloc对多线程做了很多优化，所有分配几乎不存在锁竞争。分配给线程的内存全部是按需分配，提高了内存利用率，不会浪费内存，也减少了内存碎片。

Libhaisqlmalloc为每个线程分配了一个线程局部的Thread Local Cache，线程申请的2000KiB以下内存都是在其Thread Local中的对象负责分配，由于是Thread Local的，所以是无锁的。同时，Libhaisqlmalloc维护了进程级别的Cache，所有的2M大小的块都在这个进程级别的Cache中分配，这个Cache使用了一种多生产者多消费者MPMC的无锁队列，开销小，性能高。

Libhaisqlmalloc内存分配库性能高的主要原因是：

1)后台线程是关键。消耗时间大的系统调用，直接用后台线程处理，提高前端的性能，后台线程处理比较耗时的那些动作全部处理了。例如，一次 mmap /ummap 2M系统调用，大约开销会有几百微秒，如果用后台线程去处理，提前准备好2M 块，以及推迟释放2M，大约只需要几十个ns就可以获得/释放2M块，这块提高了“获得/释放2M块”这个功能点大约1万倍性能，分摊到每次8byte申请上的时间前端表现就是申请8byte 与申请4K byte 消耗的时间几乎一致，都是几个ns 的时间。

2)Bitmap算法。现代CPU受内存墙影响性能，Bitmap算法占用内存小，占用释放一个基本空间只有1个bit修改, 而传统算法是放一堆指针，修改一个指针就是64bit的修改量，实际要修改很多地方。如果申请和释放大量内存，从数据修改总量上看，Bitmap具备低数据修改总量。

3)连续性好的数据结构。传统算法中的链表数据结构由于cache不友好性能很低 。Libhaisqlmalloc 库采用连续性好的数据结构（例如vector）保存数据，性能很高。

4)无锁或者锁冲突比较少的数据结构，增加多线程性能。

5)Libhaisqlmalloc 库重写了部分常用的std库，提供了更好的性能。

### <strong>3.内存块种类group说明</strong>

Libhaisqlmalloc 库的管理内存范围是：

1字节到2000KiB字节使用Bitmap方式分配。

2000KiB---2MiB（含2MiB）之间的内存是由系统mmap方式直接分配或者由后台线程间接从系统mmap方式申请得到。

2MiB以上的内存实际是由系统mmap方式直接分配。

1)1-3408字节以下是小内存，使用17种不同大小的块，17种group进行分配。

8字节以下单独使用一组group,按照8Byte对齐，其余是16Byte对齐，使用其他16组group。

17种group的总体块大小依次是4K, 8K, 8K×2, 8K×3, 8K×4, 8K×5, 8K×6, 8K×7, 8K×8, 8K×9, 8K×10, 8K×11, 8K×12, 8K×13, 8K×16, 8K×32, 8K×64。

A)头9个类型即128字节以内的是小分组，每个group块的内部都有一个512bit(64Byte)的Bitmap数据结构用于申请和释放内存，只允许单bit（1bit）申请。每个group都是Cache Line 64Byte对齐的，group数据结构自身总体大小约是128字节，对应512次内存申请，平均每次内存申请的cookie数据结构平均管理内存占用开销大约只有2bit。这种高度压缩的bit数据结构比传统的内存分配库的cookie数据结构小N倍，性能极高。这种内存的处理流程通过Thread Local方式实现无锁。

B)其他8个类型是第二个分组，用于分配128字节以上的情况，每个group块的内部都有一个512bit(64Byte)的Bitmap数据结构用于申请和释放内存，允许多bit申请，所以另外还有一组256字节压缩bit数据结构用于保存每个已经申请内存的指针对应的内存大小等cookie参数。每个group都是Cache Line 64Byte对齐的，group数据结构自身总体大小约是400字节，对应512次内存申请，平均每次内存申请的cookie数据结构平均管理内存占用开销大约只有6bit，这种高度压缩的bit数据结构比传统的内存分配库的cookie数据结构小N倍，性能极高。这种内存的处理流程通过Thread Local方式实现无锁。

2)3409字节----10KiB是小内存（N*1KiB)或者中内存(N*4KiB)，使用2种不同大小的块，每个group子块是1024或者4096，根据情况分别选择不同大小的group进行处理。这种内存的处理流程通过Thread Local方式实现无锁。

3)10KiB----2MiB字节是中内存，使用4KiB对齐的分配策略，由总大小是2MiB的group进行分配。其中(10KiB+1)----2000KiB字节的申请会在4KiB对齐的group内分配；group的数据结构是Cache Line对齐的，group自身的总体大小约是128字节，额外使用了4KiB的管理空间，对应512次内存申请，每指针的管理内存占用开销大约只有66bit,这种压缩的bit数据结构性能极高。这种内存的处理流程通过Thread Local方式实现无锁。

4)(2000KiB+1)----2048KiB之间实际分配2048KiB，在group外分配，这里会优先使用进程级别的Cache----多线程MPMC无锁队列中的2MiB块，更加直接，所以，性能表现会比group内的略小于2000KiB的分配性能更高。这种内存的处理流程通过Lock Free方式实现无锁。

5)2M以上内存，是大内存，由于默认自动支持Hugepage2M, 2MiB以上均是按照2MiB对齐方式分配的, 使用2MiB对齐的策略，使用系统调用mmap进行分配。在存在Hugepage2M的情况下，优先使用Hugepage2M。大内存的cookie数据结构是一种优化的unordered_map数据结构（开放地址法+线性探测+SSE4.2 crc32c hash算法），用于指针ptr_void与申请内存大小size等cookie数据的关联关系查询，大内存在实际应用中情况比较少，处理并发的代码很简单，直接使用了标准锁std::mutex锁，来处理并发。

### <strong>4.内存地址对齐和默认支持SSE指令集</strong>

Libhaisqlmalloc库有良好的分配内存地址对齐，默认支持SSE（Single Instruction Multiple Data）单指令多数据技术指令集，方便开发高性能计算密集的高性能用户代码。对于N*16字节( N=任意数）,默认分配的内存地址都是16字节对齐的, 默认支持SSE指令集。（C++委员会建议尽量16字节对齐，以便默认支持SSE指令集）

下列字节的申请大小保证是彻底按照申请大小对齐的：8,16,32,64,128,256,512,1024,4096。 

支持C++17 带std::align_val_t 参数的new等, 具体见下一章关于对外函数接口的说明。 因此， 对于C++17以后可以通过支持std::align_val_t，进而支持更多SIMD指令集 。

对于N*4KiB字节,分配的内存地址都是4KiB字节对齐的。

对于N*2MiB字节,分配的内存地址都是2MiB字节对齐的。目前的版本更高支持到2MiB对齐。

### <strong>5.内部碎片</strong>

Libhaisqlmalloc库碎片表现：Libhaisqlmalloc库内部碎片平均浪费小于10%。Libhaisqlmalloc库内部碎片设计要求是32Byte----10KiB的内存分配，内部碎片平均浪费小于10%，碎片浪费率小于20%。在满足这个内部碎片率的前提下才会考虑性能，从多种group方案中选取折中的技术方案。因此，低碎片率是基本要求，其次才是性能。

申请不同大小的内存，因为内部对齐而产生碎片，这种碎片称为内部碎片， 存在三种内部碎片。

内部碎片１：

1----8字节首先按照 8字节对齐，内部碎片１范围是1---7字节; 

9字节----4KiB按照16字节对齐，内部碎片１范围是1---15字节; 

(4KiB+1)字节----10KiByte按照1KiB对齐，内部碎片１范围是1---1023字节; 

(10KiB+1)字节----2000KiByte按照4KiB对齐，内部碎片１范围是1---4095字节; 

C++委员会建议内存分配16字节以上的场景下，尽量采用16字节对齐，以便默认支持SSE指令要求的对齐方式, 提高软件的性能表现。Libhaisqlmalloc库对于9字节以上的内存申请均是16字节对齐。

内部碎片２：

对于16字节----3408字节的内存，Libhaisqlmalloc库有第2次对齐的过程，因此，同时存在内部碎片１和内部碎片２。由于group内部块对齐而产生碎片，这种碎片称为内部碎片2。

内部碎片2是可以调整的碎片，换不同大小的group块，获得不同的性能表现和不同大小的内部碎片2。group类型过多会带来更多外部碎片，因为每种group都会浪费更多的内存, 所以，我们目前的设计方案中group类型只有18种，就覆盖了1Byte----2MB字节的所有分配方案．

Libhaisqlmalloc库的Bitmap算法搜索连续bit数越多性能越低，低bit数的内存分配方案会有更好的性能，因此总体的碎片设计规则是：在满足内部碎片率低于20%的前提下，尽量选择bit数低的group方案(在18个group中选择）。malloc的调用从多种group方案中选取一个折中的技术方案，适当的内部碎片，尽可能高的性能。

具体的设计方案: 

16字节----3408字节 参见后面附录一内部碎片的设计方案。内部碎片2碎片率是16.7%以下，平均碎片率小于8%，这部分同时存在内部碎片1和内部碎片2。内部碎片1是按16字节对齐而产生的，这个碎片很小，是不可以优化的碎片。内部碎片2是由于存在多种group类型适配造成的碎片，是可以调整可以优化的内部碎片。

3409字节----4KiB按照4KiB分配，碎片范围1---687Byte，碎片率低于16.77%，平均碎片率8.4%，只有一次对齐，只有内部碎片１。

(4KiB+1)----2000KiB的malloc的内部碎片浪费很小，只有一次对齐，只有内部碎片１。

(4KiB+1)----10KiB是按照1KiB对齐分配，碎片范围1---1023字节.。碎片率低于20%，平均碎片率低于10%。只有一次对齐，只有内部碎片１。

(10KiB+1)----2000KiB是按照4KiB对齐分配，浪费范围1---4095字节。平均碎片率远低于10%。只有一次对齐，只有内部碎片１。

内部碎片３：

对于2000KiB以上的内存，Libhaisqlmalloc库有１次额外的对齐过程，这种对齐是按照2MiB字节对齐，因此，存在内部碎片３。2MiB以上内存，是大内存，由于支持Hugepage2M, 为了提供一致的表现，2000KiB以上均是按照2MiB对齐方式分配的, 使用了2MiB对齐的策略，浪费范围1---2097151(2MiB-1)字节。这种场景下，如果申请内存量不是2MiB的倍数，那么就会有内部碎片３带来的浪费（好在这种情况在应用中很少出现）。如果申请内存量是2MiB的倍数，那么就不会有碎片浪费。

测试代码的开头有测试内存分配库内部碎片的情况,  但是实际情况要复杂的多，Linux malloc库虽然内部碎片很低，但是有外部碎片，总体的碎片浪费很严重。

### <strong>6.外部碎片：</strong>

Libhaisqlmalloc库有很低的外部碎片。Libhaisqlmalloc 库设计思路是优先考虑低外部碎片和低内存浪费的方式，宁可在一些场景下以大幅度牺牲性能表现为代价，来换取低外部碎片和低内存浪费。

外部碎片的定义：由于执行过程中反复的malloc/free不同大小的内存块，会造成连续的内存中间一些块被占用，缺乏连续空间用于大块和连续块的分配，这种碎片是外部碎片，会造成的空间浪费，会占用更多的空间。

在减少外部碎片方面，Libhaisqlmalloc库有更好的解决方案，一个设计思路就是线程内部不做空间缓冲的方案： 内部的内存申请原则上采用按需分配，在需要时会立即申请，释放时都是立即释放不做缓存。这种方式减慢了性能，增加了内存的利用率，有更小的内存消耗．更少的外部碎片。

1）小内存无缓存，不会预分配备用。每一次free释放都是真实的释放，不会缓冲起来下次再用，这样保证只要一大块内存内的多个连续块释放后，就可以获得彻底连续的空间，不会有传统算法缓存带来额外碎片的问题。例如：有些传统内存分配库为了性能将一些指针缓冲起来下次再用，而有可能刚好就缺这部分块就可以空间连续。

2）所有大小的group都是动态分配，不存在预分配，前9种group类型，或者说单bit对应128字节以内，由于占用内存比较少，会保留1个单元不释放，以便在代码中删除掉一次判断实现大约1ns的性能增加; 后面其它group类型，由于占用内存比较大，不会有空闲单元保留，一定会释放掉全部空闲单元，宁可大幅度减慢性能，也不会保存起来等待下次再用。这种精细的内存管理设计就减少了预留内存块的浪费，不会因为预分配的group块不符合实际需求造成浪费，简单的就实现了低浪费低外部碎片。

3）低碎片率的内存分配的策略，首先是采用了18种group（远远低于很多库的设计数量）, 这样不同大小的内存分配走不同的group, 尤其是常用的256Byte以下，都是单bit分配，没有碎片浪费，高于256Byte采用了2倍增长的group类型，有足够的区分度，是小bit数分配，碎片浪费也比较少。

4）搜索算法上使用了一种低内存浪费的搜索解决方案，First Fit+Next Fit同时使用。当free()调用后，下次 malloc 将使用First Fit，从头开始搜索，这样保证释放掉的内存可以立即被重复使用．扩大了搜索范围，大幅度减慢了性能，提高了碎片利用率，第二次malloc同样大小的数据块，将使用Next Fit算法，从上次分配内存的地方继续向后搜索和分配，加快内存分配速度．这样既保证了性能，又保证了刚释放的空间立即复用不浪费，减少了碎片，大大节约了内存。

5）一种低碎片率的古老的原始的Bitmap算法，这种算法不同于传统算法（产生大量碎片的）buddy伙伴分配算法，算法的优点是自身不会产生额外碎片，具备很低的碎片。缺点是需要检索更多的数据，执行更多的指令，理论上会减慢性能表现。

原始的Bitmap架构算法，就是一次在一个Cache Line中（64Byte，512bit内存中）对多个连续N个全零bit搜索，找到了连续N个零bit就可以在这里映射bit对应的地方分配内存了，并且free时会自动实现大小块自动合并，连续块自动合并，没有其他(非Bitmap)模型的连续块合并的开销和大小块合并的开销，因此，一方面碎片极小，一方面合并数据块的性能极高．比其他(非Bitmap)算法有更小的开销．每个group子块空间512Bit(即64Byte)刚好是Intel CPU的一个Cache Line的长度， 保证了连续申请和释放内存都在同一个Cache Line中动作，性能极高，同时这个长度也足够小，也可以尽快及时将全空的group子块彻底释放。这个长度设计在性能和内存浪费之间做了权衡。单个零bit的搜索性能很高，多个连续零bit的搜索开销要大很多，bit数越高开销也越大，因为要比较更多次数，以及更多的管理空间占用，更多的bit数修改和更新，设计支持连续500个零bit的搜索。因此，设计时如果有多个方案可选要尽量实现低bit数的设计，才会实现更高的性能。

使用原始的bitmap算法+Cacheline对齐+现代的Intrinsic函数可以在现代CPU上实现极高的性能。Bitmap算法主要是C++实现的，不需要bit对齐（不同于buddy伙伴分配算法），可以从任意bit点开始分配连续N bit内存，因此算法自身不会产生额外的碎片，内部使用了几个现代CPU的Intrinsic函数（等效于汇编语言，兼容多种CPU，只用到SSE4.2版本）来加速性能。由于现代CPU的多发射特性，相邻的多条指令处理同一个CacheLine的数据是高度并发的，可以在一个时钟周期内执行多个相邻指令（现代CPU 10并发即同一时钟周期并发10条指令），CPU内部的工作情况比几十年前的情况有变化，同一个Cacheline中连续多个数据的处理几乎不消耗CPU时间，大量CPU时间其实是消耗在等待内存到CPU L1的存取时间开销上，现代CPU受内存墙影响性能，Bitmap算法具备超低的管理内存占用（尤其是1bit的算法），因此在现代CPU上使用CacheLine对齐的bitmap算法，可以实现极高的性能。

总之Libhaisqlmalloc库设计时用古老的Bitmap原始算法，实现了低碎片率，但是需要执行更多的指令，理论上会减慢性能表现，设计上采用了理论上会减慢性能表现的技术方案来换取更低的碎片率和减少内存浪费。现代C++新技术采用多发射友好的数据结构和新的算法设计（例如使用Intrinsic函数），在一个时钟周期内CPU可以并发执行更多的指令，实现极高的性能，更终软件的性能表现很快。

6）按bit数分配的外部碎片浪费极小。低bit数的总体设计方案，保证了外部碎片很小。具体如下：

256字节以下大小的内存分配全部是Bitmap 1bit的分配方式，这种方式保证了常用的小字节下，不存在外部碎片，每一个bit空间都可以得到分配，并且性能很高。

257字节-----3408字节其中一部分采用多Bit的分配方式，这种分配方式会产生少量外部碎片，多Bit的bit数（参见附录一）范围1---9bit,因此浪费碎片bit数的上限是8bit,相对总量512bit，这种浪费是很少的，单个非连续空间浪费低于1.56%。

3409字节----4KiB大小的内存分配全部是Bitmap 1bit的4KiB分配方式，这种方式不存在外部碎片，每一个bit空间都可以得到分配，并且性能极高。

(4KiB+1)----10KiB默认按照1K对齐（如果不是8KiB的情况），这种分配方式会产生少量外部碎片，bit数上限是10bit,因此浪费碎片bit数上限是9bit,相对总量512bit，这种浪费也是很少的，单个非连续空间浪费低于1.76%。

(10KiB+1)----2000KiB按照4KiB对齐，采用多Bit的分配方式，会产生外部碎片，并且这里是设计方案中容易出现外部碎片的地方，主要集中于大Bit数的分配数，因为检索空间的范围是从1bit到500bit个连续零，这个范围是很大的一个范围，但是由于malloc检索空闲空间是任意连续N bit的顺序全搜索模式，没有bit对齐的假设，并且常用bit数均是小bit数，超过32KiB(即8bit)的场景很少见，因此，实际使用中一般也很少出现外部碎片问题。

7）工作线程内部不会缓存2MiB大块内存，也不会预先分配给线程2MiB大块内存备用。

空闲的2MiB大块内存是所有线程共同管理的，因此，不存在线程内部浪费。每次4K连续块group对应的2MiB空闲块都会立即释放到一个多生产者多消费者MPMC无锁队列中，不会在线程内部的数据结构中保存等待下次再用。不存在传统内存分配库线程内部的2MiB块浪费，也没有预分配给线程2M块数量不符合线程的实际需求造成浪费，不存在传统内存分配库中一个线程已经空闲的大块内存无法被其他线程利用的情况，极大的节约了内存，减少了碎片。

对于短期内不会复用的多生产者多消费者MPMC无锁队列中的空闲2MiB块，由后台线程智能的释放给系统。

8）Libhaisqlmalloc库的低缓存的设计，以大幅度牺牲性能表现为代价来换取低外部碎片和低内存浪费。Libhaisqlmalloc库在各级处理流程中都是尽快释放，不做额外缓存。每级动作流程中如果有大量缓存的话，那么就可以走短流程，实现更高性能，如果没有缓存，就必须要走长流程，向上级申请或者释放内存，减慢了性能，有个别时候会有多级长流程动作，导致性能大幅度下滑。另外一方面，由于Libhaisqlmalloc库的性能很高，每一级的开销也只有大约数十纳秒，即使是多级长流程总体开销也不大。

### <strong>7.2MiB大块内存的统一进程缓存：</strong>

Libhaisqlmalloc库使用了现代C++无锁编程技术解决空闲2MiB大块数据管理问题。

工作线程的2MiB块空闲后会立即释放到按NUMA CPU node分组的容量512的两种（page和Hugepage2M)多生产者多消费者MPMC无锁队列中，这种释放开销只有几十ns（二次atomic存取开销）。

这里是标准的多生产者多消费者场景，所有的线程既是生产者又是消费者，所以，这里采用了一种多生产者多消费者的无锁MPMC数据队列，释放掉的2MiB块数据对所有线程共享，提前给队列预分配了2组(分别对应page和hugepage的情况)每组4096个数据存储结构，没有ABA问题（ 队列大小固定不会申请释放内存），是一种连续的数据结构，入队/出队动作只是二次atomic存取开销，性能很高，不会有传统锁冲突时的休眠时延。

释放掉的2MiB块存储在无锁队列中可以立即被同一NUMA CPU node的多个工作线程复用，重用开销也只有几十ns（二次atomic存取开销）。

常规page内存和hugepage2M是2组队列，每个都是多生产者多消费者MPMC无锁队列，容量是4096个指针空间，对应低于8G内存的缓存，可以应对多数内存申请总量的抖动，存储的2MiB大块内存数据对所有线程透明共享， 一般情况下此容量已经足够满足需求，当出现超过队列长度4096的情况出现时，将会直接释放给系统。

### <strong>8.Thread Local算法：</strong>

目前C++ std / boost库以及 Linux pthread库均提供了Thread Local数据结构，这些库接口的Thread Local算法上存在优化空间，并且存在库依赖，因此重新实现了一个高速的没有库依赖条件的Thread Local专用数据结构，有更高的性能（数倍），以及良好的适应性(没有外部依赖)，避免了一些场景下的多个so库初始化顺序的兼容性问题，提高了内存库的兼容性。

**

主要流程和开销情况：

以malloc动作为例, 平均开销是数个纳秒, 主要流程和开销如下:

1)so动态链接接口的开销。动态链接有比较大的开销。这部分是固有开销，无法被优化掉。

2)申请大小为2000KiB以上，走系统mmap调用, 保存长度等cookie数据到一个传统锁保护的全局hash_map的数据结构中，返回mmap指针。

3)探测是否是so文件初始化尚未完成前就开始执行malloc申请的内存（即紧急模块的内存申请），这部分有一个专门的小模块单独处理，使用sbrk申请一块内存，然后切成小片分配给用户，每次多申请16字节，用于保存cookie到返回空间前16字节,返回移位16字节的指针。

4)探测是否需要启动后台线程，如果需要，则启动后台线程。后台线程探测是否需要启用hugepage2M。如果需要，则探测系统是否支持hugepage2M，设置允许使用 hugepage2M 标志。

5)thread local ptr.get()的查询开销。

6)探测跨线程释放无锁队列中是否有待释放指针，如果有则立即执行释放。

7)按照数据块大小选择不同大小group的开销，有几个判断：

首先是按照申请内存的大小进行8字节/16字节对齐

1---8字节走8字节;

9字节---3408字节16字节对齐走一个跳表查询，会在1７种不同大小的group中选择合适的group，可选的有N个方案，优先少bit数，同时限制浪费低于２０％，平均浪费小于10%. (参见附录中的详细说明)； 

3409字节---4KiB的会申请4K；

（4KiB＋１）---10KiB的会在1KiB／４KiB的group中选择合适的group对齐，8KiB选择2*4KiB, 其他选择N*1KiB，例如4097字节选择５个1KiB的连续块，这样的浪费比较少； 

10KiB---2000KiB的全部是4KiB的N倍数, 2000KiB就是连续500个4K块。

使用了预处理软件定义好方案，自动生成类似于跳表数据结构代码，实际代码就是几个简单的判断＋类似跳表的C++对象, 性能极高。

8)各种大小的内存的内部分配流程就是按照待申请的bit数，执行Bitmap申请内存流程。Bitmap代码开销只占总体开销的一小部分。

9)其它同步原语的开销。在一些数据结构的创建过程中有大量的同步原语的使用，例如用于与后台线程的数据交换等，另外Bitmap对于所有线程thread_id相关cookie数据均进行了严格的数据写同步，具体参见后面第16节关于数据同步的说明。 总之，Libhaisqlmalloc库对指针的跨线程使用和释放是thread safe的。

以free动作为例，平均开销是数个纳秒, 主要流程和开销如下：

1)so动态链接接口的开销。动态链接有比较大的开销。这部分是固有开销，无法被优化掉。

2)写同步的开销，在free内部执行写同步（使用sfence内存屏障），保证释放前与这个指针相关的写动作都已经完成。这部分是增加多线程稳定性的代码，用于同步CPU的内存数据。

3)探测是否是so文件初始化尚未完成前就开始执行malloc申请的内存（紧急模块的）内存申请，探测方法是一个简单的地址范围判断（sbrk申请的地址段的范围），从多申请的16字节中获得长度等cookie数据，执行紧急模块的释放流程。

4)探测是否是空指针（空指针立即返回）。

5)探测是否是已经处于进程退出的析构so内部全局数据结构的退出阶段，此阶段不作处理。

6)探测是否是直接从系统mmap方式申请的2MiB以上大内存块，从一个传统锁保护的全局hash_map的数据结构中获取长度等cookie数据，释放这种内存块直接走munmap 系统调用, 从一个全局hash_map数据结构中获得长度等cookie数据的数据结构。

7)探测是否是空指针或者非法指针，这两种情况均立即返回，不做处理。

8)探测是否是跨线程指针释放(探测指针对应的group类型的数据结构中的thread_id标志与当前线程的thread_id标志是否一致)，对于A线程申请, B线程释放的指针，需要执行跨线程释放流程，通过指针数据cookie找到申请内存的线程A内部结构，直接保存指针到申请线程A内部的一个无锁队列中，队列中的指针由当时申请内存的线程A择机释放，实现了高性能的跨线程释放。

9)探测指针数据cookie对应的group块大小，分别走不同块大小的group流程, 跳转到多种group中的一种类型， 错位1---(N-1)（N是group类型单bit对应的长度）个字节的非对齐的指针会自动对齐，支持少量错位容错，检索指针对应的待释放的bit数，将group内部的此bit数清零，实现避免重复释放。如果bit数为零，表示可能是重复释放的指针或非法指针，不做处理。

10)按照待释放的bit数，执行Bitmap释放内存流程。Bitmap代码开销只占总体开销的一小部分。

11)同步原语的开销。在一些数据结构的析构过程中有大量的同步原语的使用。

从以上的malloc/free的内部主要流程和开销情况可以看出，malloc / free的流程很复杂，考虑的情况很多，有大量的复杂流程，但是执行起来，平均开销这么小，所有流程的代码一定是经过高度优化的，并且一定采用了很多不同寻常的技术方案，解决了很多CPU的执行瓶颈问题，代码才能跑得如此之快。下面将简单介绍几个主要技术方案（黑科技）。

### 10.支持HugePage：**

Libhaisqlmalloc 库提供了对Hugepage的支持，可以大幅度增加应用程序的性能。Hugepage可以大幅度减少CPU TLB miss，增加应用程序的读写内存的速度。目前很多传统内存库不包含此功能点。

目前版本没有支持Hugepage1G, 主要的原因是：Hugepage1G浪费内存情况比较严重，存在一些场景下，由于每次申请或者释放的粒度过大，造成一定程度的内存浪费，并且每次申请和释放1G内存和缺页中断的时间开销远远高于 hugepage2M的开销，有大约200毫秒的后台线程开销，这样会给前端带来更大的时延抖动。

默认启用Hugepage2M，该配置可以关闭。只有在后台线程启用以后，并且系统提前配置了Hugepage页面，才会开始使用Hugepage2M, 这种设计方案主要是考虑Hugepage2M的内存申请都会实际分配物理内存，开销比较大，启用后台线程才能避免这种时延抖动。相关配置参数：见 /etc/libhaisqlmalloc.conf　中bool_enable_hugepage2m的说明。

 在很多场景下配置Hugepgae2M可以增加内存库的性能表现， 以及用户程序的性能表现。因此， 建议用户配置一部分内存为Hugepage2M，根据不同的场景，可以采取不同的分配策略。建议在Linux4.X或者以上版本并且可用内存比较多的场景下，分配一半内存配置为Hugepage2M。由于目前Linux系统下Hugepage2M内存不参与swap，会导致虚拟内存更加紧张，在内存比较少比较紧张的场景下，减少分配Hugepage2M的总量，以便提供更好的swap性能。

提供Hugepage2M的支持方法:

方法一：修改/etc/sysctl.conf配置文件增加一行

vm.nr_hugepages=2048

这里2048表示使用2048个Hugepage2M页面，即分配4G内存为Hugepage2M。

修改完配置文件后，需要重新启动生效，或者执行下列指令生效。

sudo sysctl -p

方法二：修改/etc/default/grub启动配置项，修改默认值

GRUB_CMDLINE_LINUX=""

为

GRUB_CMDLINE_LINUX="transparent_hugepage=never default_hugepagesz=2M hugepagesz=2M hugepages=2048"

这里2048表示使用2048个Hugepage2M页面，即分配4G内存为Hugepage2M。

修改完配置文件后，需要更新一次grub,然后下次启动才能生效。

sudo update-grub

下列指令可以显示Hugepage2M的使用情况

cat /proc/meminfo | grep Huge

AnonHugePages:         0 kB

HugePages_Total:    3200

HugePages_Free:      954

HugePages_Rsvd:       30

HugePages_Surp:        0

Hugepagesize:       2048 kB

### <strong>11.支持物理内存提前分配：</strong>

Libhaisqlmalloc 库中的内存分配的物理地址分配，是可以配置为提前分配的。这样对于一些对性能有要求的场合可以提供更低的推迟，例如量化交易等，实现更高的性能表现。常规库的物理内存只有在内存使用中才能利用缺页中断分配物理内存，其实也是有不小的性能开销的。目前很多传统内存库不包含此功能点。

每次申请hugepage2M的页面都会实际分配物理地址，Hugepage2M没有修改配置的地方。一般情况下均是后台线程处理这种物理内存的分配，当后台线程忙不过来或者未被系统调度时，前端用户线程也会处理这种物理内存的分配。

配置实现提前分配常规page页面：申请常规page页面, 可以配置为立即实际分配4KiB page页面的物理地址，默认配置为关闭此功能。参见配置bool_enable_page_prefault的说明。启用后，将会很浪费空间，将会略微增加用户程序的性能。因为集中产生实际物理页面的分配，会增加一些程序的稳定性(例如：避免Facebook fstring早期版本末尾‘\0’推迟实现Bug)，这个功能点启用后对所有大小的内存申请都有效(包括管理内存等)，对所有线程的内存申请都有效。

### <strong>12.支持释放内存自动清理CPU Cache：</strong>

Libhaisqlmalloc 库提供了释放内存自动清理CPU Cache的支持。目前很多传统内存库不包含此功能点。

Libhaisqlmalloc 库可以将释放内存从前端工作CPU的L1L2L3级Cache中彻底淘汰，提供了更多空闲CPU Cache给内存库和应用程序使用，增加了内存库和应用程序的性能。

一般情况下，彻底释放给系统的内存还会占用宝贵的CPU缓存空间。Libhaisqlmalloc 库的后台线程在彻底释放2MiB大块内存给系统前，主动通知CPU ,将这些缓存从CPU的一二三级缓存中彻底淘汰，这样就腾出了大量缓存空间给其它真正需要的内存，这项动作一般会增加内存分配库自身的性能10%，并且会大幅增加应用程序的性能。

后台线程目前只对释放的单个2MiB大块内存使用此功能，对其他大小的内存释放不执行此动作。由于后台线程动作时不能影响其它线程和CPU的正常工作，因此，不能使用直接清空全部cache的做法（系统调用特权指令），只能使用一种从后台线程所在的CPU发起对前端多个工作CPU的cache shootdown的方法，逐个对每个CPU的L1/L2/L3 cache进行清理，通知全部CPU逐条清理cache，执行追踪检索释放CPU L1L2L3 cache的过程会消耗很多的后台线程CPU资源，增加后台线程的工作负荷。大约一个使用的2MiB大块对应的cache全部清理掉大约会消耗掉550微秒(Intel CPU 9400F 2.9G主频下)的后台线程工作时间。

后台线程默认启用此功能，具体参见配置bool_enable_thread_background_clear_cpu_cache的说明。

### <strong>13.支持线程与CPU自动绑定：</strong>

Libhaisqlmalloc 库提供了对线程与CPU的自动绑定的支持。目前很多传统内存库不包含此功能点。

 现代CPU的数量很高，因此，高性能的工作场景一般要求绑定线程到少数几个（一般1---2个）CPU上，以便减少无效CPU切换，减少CPU Cache因为在多个CPU之间的切换而无效．但是，在编程的实践中很多程序并没有绑定CPU,使用此功能后大约可以增加多线程程序性能，因此，我们采用了下列措施，实现了一种工作线程与CPU的自动绑定算法，相关配置参数：见 /etc/libhaisqlmalloc.conf　中bool_enable_auto_bind_cpu的说明。

工作线程自动绑定CPU．此功能启用后，将会在线程申请内存时自动检查是否已经指定了运行的CPU范围，如果没有指定，将自动执行线程自动绑定CPU：首先探测CPU 是否支持超线程，如果是支持超线程的CPU, 将自动将工作线程绑定到一个物理CPU上．如果不支持超线程，将自动将工作线程绑定到同一NUMA node下的1---2个相邻的物理CPU上。NUMA 的内存绑定都是动态获取NUMA node参数的，不会预设thread与NUMA node之间存在关联关系。

2021-09-27的1.40版本之后默认不启用此功能, 之前默认是启用， 原因是2021年intel新款CPU实现了大小核的设计，Intel建议由系统来进行CPU的分配，以便减慢能源消耗，不再建议用户自行绑定CPU。

### <strong>14.支持NUMA node内存绑定:</strong>

Libhaisqlmalloc 库提供了对NUMA内存绑定node的支持。目前很多传统内存库不包含此功能点。

    NUMA是一种多槽位CPU计算机系统的工作方式，每个槽位的CPU有独立的内存总线，多CPU槽位通过总线连接起来的SMP系统。由于每个槽位的CPU有独立的内存总线，因此可以获得更高的内存带宽，有更好的性能．目前高端服务器一般都是支持NUMA方式。

    Libhaisqlmalloc 对于NUMA的管理模式提供了一种新的工作模式。默认关闭NUMA内存绑定．原因是NUMA 这种工作模式的机器总量比较少（对硬件有很高的要求），并且低版本的Linux系统于NUMA的支持不完善，默认启用NUMA可能会导致一些版本下崩溃, 因此需要用户修改配置选项后才能启用NUMA相关功能．相关配置参数：见 /etc/libhaisqlmalloc.conf　中bool_enable_numa_memory_bind的说明。

 尝试启用NUMA前建议首先请检查numactl -s的显示结果，下面是不支持NUMA node的情况，只有一个NUMA node, 这种就不需要打开NUMA 内存绑定功能。

numactl -s

policy: default

preferred node: current

physcpubind: 0 1 2 3 4 5 

cpubind: 0 

nodebind: 0 

membind: 0 

 只有多个NUMA node节点存在的情况下，才有启用NUMA绑定的价值。对于支持NUMA的情况，如果bool_enable_numa_memory_bind 配置为允许NUMA内存绑定，那么就会执行下列动作：当某个线程malloc()时，线程优先在当前申请内存的CPU所在的NUMA node（如果当前NUMA node没有内存条，将选相邻NUMA node）上分配内存；如果探测到当前优先NUMA node上没有足够的可用内存，将不使用线程优先分配策略，此时，由系统配置的默认NUMA分配策略分配内存．这种NUMA node自动绑定方式，在很多场景下会提供比Linux系统自带的libnuma库有更灵活更高性能的内存分配策略．因为这种分配策略是基于工作线程所在的NUMA node优先的分配策略，而传统的libnuma库是基于进程的NUMA分配策略．在内存足够并且用量均衡的理想情况下，每个CPU上跑的线程都是在当前NUMA node下申请的内存，不会出现线程在node A上跑，使用的却是node B上的内存的情况。

在目前常用的Linux4.X版本下，NUMA的相关系统调用还不能稳定支持Hugepage2M，因此，Libhaisqlmalloc库关闭了Hugepage2M 的NUMA内存绑定．就是说当前的分配策略是：当申请的2M块是Hugepage的时候，将不执行NUMA node内存绑定．只有申请的是常规Page内存，并且配置启用NUMA内存绑定功能，才会优先执行基于线程的NUMA node内存绑定，失败将执行系统默认NUMA策略。

### <strong>15.</strong> <strong>低碎片的系统调用:</strong>

系统调用：Libhaisqlmalloc 库内部在申请内存和释放内存的时候，只使用mmap / munmap，没有使用madvice函数（脏牛漏洞就是利用madvise(map, XXX, MADV_DONTNEED)实现入侵，Facebook jemalloc 等库都有调用），so文件初始化成功后没有sbrk和brk申请释放内存（so文件初始化成功前也只存在一次2MiB的sbrk调用），有利于系统进行页面归集整理，减少系统的内部碎片。

超低的系统碎片：Libhaisqlmalloc 库管理内存范围是1Byte---2MiB, (传统内存分配库一般只负责管理128KiB以下的大小)，所有的内存申请都是将2MiB的大块内存切成小内存实现内存分配。Libhaisqlmalloc 库对系统的内存申请除了管理内存申请有偶然个别少量64KiB的申请外，其他内存申请都是2MiB或者N*2MiB，对系统的内存管理很友好，系统的碎片率很低，提高了系统的整体工作效率。

### <strong>16.默认提供thread safe性和数据同步保证:</strong>

Libhaisqlmalloc 库内部默认提供了完整的thread safe性保证，对应用程序没有同步或者thread safe性的要求。目前很多传统内存库不包含此功能点。Libhaisqlmalloc 库设计思路是以牺牲性能表现为代价，以CPU所有顺序性保证均不存在的严苛的数据存取条件，以严格的多线程编程规范，换取完整彻底的thread safe性和数据同步保证，具备CPU移植性。Libhaisqlmalloc 库在多线程下很稳定，代价就是在一些场景下减慢了性能。

由于Libhaisqlmalloc 库使用的C++库基础算法很快，具备极高的性能，容易暴露出多线程冲突和数据同步问题，因此Libhaisqlmalloc 库对应用程序没有同步要求，对库自身有严格的thread safe和数据同步要求，代码设计时假定Intel X86系列CPU的所有顺序性的保证均不存在，按照苛刻的CPU顺序性进行代码设计（好处是方便今后移植到其它型号的CPU上），malloc / free内部过程大量频繁的使用同步原语(内存屏障sfence / mfence / lfence / atomic / mutex等)，更频繁的同步，以及大量的探测代码，减慢了性能表现，但是分布在各个CPU的cache数据也更同步，也顺便增加了使用Libhaisqlmalloc 库的应用程序的整体多线程稳定性，提供thread safe保证。

Libhaisqlmalloc 库在多线程下很稳定，实现了很多额外（远远超过多线程编程规范要求）的thread safe和数据同步保证。C++多线程编程一直是程序员容易犯错误的难点。Libhaisqlmalloc 库为了避免多线程BUG，设计代码时采用了一种防御性编程规范，以解决此难题。宁可在一些场景下减慢性能表现，也要预防多线程BUG。

1）在设计多线程代码时，按照苛刻的CPU顺序性进行代码设计。假定Intel X86系列CPU的所有顺序性的保证均不存在，方便移植到各种CPU下。

2）大量的探测。假定所有的线程同步措施都有漏洞，封装探测代码，只要能够探测的都设法进行探测（例如std::mutex锁也封装了一层复杂的同步探测代码），处处探测，步步设防。

3）有疑点的数据存取，均使用同步原语，宁可多用重复，也不可放过，频繁的使用内存屏障。

4）spin_lock锁内部设计超过一定次数会自动执行os yield，因此支持实时系统。

5）外部调用没有把握时，使用mutex锁进行保护（一部分系统的系统调用，因为对旧Linux版本没有把握，也使用了mutex锁进行保护，超过了多线程编程规范要求）。

6）使用高并发度的wait_free的无锁无等待架构，基于cas指令的lock_free无锁架构只允许用于并发冲突较小的场合（减少cas指令的广播风暴）。

7）所有需要锁保护的变量或者对象，全部在名称前面标记locking_，表示提醒程序员这个变量或对象需要锁的额外保护。

总之，Libhaisqlmalloc 库设计思路是在多线程领域的代码以thread safe为首要问题，宁可浪费各种开销，宁可在这些地方慢一点，冗余次数多一点，也要确保thread safe。在其它不涉及并发的代码上，在这些地方不留余地的进行各种优化，实现高性能。这样兼顾的总体设计方案，既保证了thread safe，又实现了高性能。

### <strong>17.默认分配物理内存，增加内存连续读写性能</strong>

Libhaisqlmalloc 库为了增加用户程序的内存连续读写的性能和程序的稳定性，默认启用了实际分配物理内存，因此malloc/realloc申请到的内存默认都是已经分配物理内存的内存空间，这样，读写动作不会触发缺页中断，因此memset之类的连续内存动作，由于不会被缺页中断所打断，因此有较大幅度的性能增加。此功能点默认启用，也可以通过设置参数关闭，具体的参数，见 bool_enable_malloc_force_page_prefault / bool_enable_realloc_force_page_prefault / bool_enable_malloc_over_2m_force_page_prefault / bool_enable_realloc_over_over_2m_force_page_prefault 这些参数的配置说明。其中，对于2M以上的内存申请，可以单独关闭分配物理内存，见bool_enable_malloc_over_2m_force_page_prefault / bool_enable_realloc_over_over_2m_force_page_prefault的说明。

### <strong>18.现代C++是高性能的关键技术：</strong>

Libhaisqlmalloc库使用了一些高性能组件，代码模块是用C++写的，经过反复测试和调整，具备较高的性能表现。软件工程的实践中，很多的性能增加，来自于现代C++技术。计算机从1970年只有50年的发展时间，近一二十年来计算机的硬件技术发生了进步，软件追随硬件而变，新一代C++软件发挥硬件新特性，发挥硬件的各种潜力（例如CPU多发射各种新指令集各种多线程高并发友好的新的数据结构与算法），时代变了，因此，以前写的古老的C/C++库用现代C++技术重写一遍，很多都可以获得大幅度的性能增加，这是时代的红利，只是需要投入人力资源投入时间去做而已，just do it。

下面举2个现代C++库的例子：

范例1：跨线程内存释放是一种常见的场景，传统算法是使用传统锁保护下的队列。跨线程内存释放是一个很典型的多生产者单消费者MPSC的工作场景, Libhaisqlmalloc库使用了一种多生产者单消费者MPSC无锁队列C++模板库，库代码大约数千行代码，也是thread safe的，应用层代码几行就实现了高性能的解决方案，Libhaisqlmalloc库使用的是一种自研的经过多线程防御性编程加固过的C++模板库，比传统方案快数倍，使用常见的Ring Buffer技术方案扩展实现，代码总体很复杂，不仅考虑了大量corner case的情况，数千行源码，还有冗余的同步措施。

测试代码后面有一段代码测试跨线程释放，可以测试看到线程数N=1---12之间，性能是逐步增加的，因为没有并发冲突并且是无等待架构，超过16个线程并发后性能才略有下降。现代C++的无锁无等待队列可以提供更好的性能表现，更低的推迟时间。即使代码设计中有大量的冗余同步和探测措施，Libhaisqlmalloc库的跨线程内存释放也比传统旧方案快N倍。测试代码中8线程并发跨线程释放测试1000万次8字节内存申请和释放，平均每组malloc + 指针传给其它线程 + 其它线程push进并发队列 + 主线程pop出并发队列 + 主线程free这五个动作累计大约32ns, 平均每个动作只有6ns的开销，远超传统方案。

范例2：重写了一部分常用std库组件，提供了更好的性能。以vector为例说明如下：

下面这种是内存库中的一个class中的一个vector对象， 把C++的vector , unique ptr, allocator 等组件都全部重写了，实现更多种类的组件，实现std库扩展，增加了性能，提供了各种无锁或锁冲突少的组件，实现高性能。一行代码定义一个vector容器，如下所示：

vector_allocator, Memory_allocator > d_vt_up_normal;

这是一个装unique_ptr（unique_ptr_include_alloc）的vector容器，其中：Memory_allocator　是自定义实现的一组按CPU编号的多组页面对齐的内存分配组件，由于是per CPU的，按CPU分区，所以内部几乎是无锁的，这里作为vector（vector_allocator）的内存分配器，Malloc_page_part_cpu／Realloc_page_part_cpu／Free_page_part_cpu这些都是函数对象，可以随时定义，随时使用，灵活组合和定义，比std::allocator的定义灵活的多。预先定义了一些常用的Memory_allocator，都是基于函数对象的实现，很灵活，函数对象调用起来没有额外开销。Memory_pool_without_lock_128byte 是一个线程内部的内存分配池，彻底无锁，只能分配128Byte, 这里作为unique_ptr（unique_ptr_include_alloc） 的内存分配器，性能极高。

另外由于使用了比较新的C++算法，重写vector后一些常用函数的性能比std库有大幅增加，例如删除 / push_back等，另外提供了一些更高性能的扩展函数，例如乱序删除等。

### <strong>19. Libhaisqlmalloc 库的性能测试：</strong>

Libhaisqlmalloc 库是一个新的内存分配库，具备很高的稳定性，可以增加应用程序的性能，减少内存浪费和碎片，更有效使用内存。Libhaisqlmalloc 库使用了大量类似于Intel dpdk / mpdk / spdk 的高性能C++技术（这些库对比同领域的旧传统方案都有较大性能改进，网上有大量的公开资料和说明），因此，Libhaisqlmalloc 库在 “所有大小的内存申请和释放” 的性能也比以前设计的旧内存库Linux malloc库 / Google tcmalloc库 / Facebook jemalloc库快。使用现代C++软件技术重新写了一个可测试可下载可运行的新型的内存分配库。

Libhaisqlmalloc 库不是一个单纯以高性能为目标的内存分配库，代码的健壮性，内存的低浪费和低碎片，thread safe，数据的同步等因素，都比性能更重要，程序设计时有大量的设计目标都是以大幅度牺牲性能为代价，以放弃性能表现来换取更重要的其它方面的技术指标。即使这样，全新设计的Libhaisqlmalloc 库的性能也比传统内存分配库有较大的性能改进。

    Libhaisqlmalloc 库的架构思路，设计语言，碎片设计等更接近Google tcmalloc库的理念，都是C++,都是thread_local cache的，都是低碎片设计，因此主要与Google tcmalloc库进行对比。Libhaisqlmalloc 库加权平均性能比传统库Google tcmalloc库快很多（参见附录的测试结果）, 其中4KiB以上内存申请的性能较好，测试方案是一个动态链接的外部接口的性能测试（so接口有开销），测试代码本身还有额外的开销（代码中有测试，但是没有扣除这块的额外开销），真实的性能还要略高一些。

具体的测试性能的细节可以参考附录二给出的测试情况，可以使用附录三给出的方法编译测试代码，调整测试代码的行参数进行更多的详细的对比测试。（测试软件的用法请见第五章第1节的说明。） 

配套的性能测试源码也是我们（乌鲁木齐云山云海信息有限责任公司）开发的，要求编译器支持C++11，开源协议是Apache2协议，商业友好，已经在开源中国的网站上开放源码和二进制执行程序，具体的源代码二进制so文件和用户手册可以从下列地址下载：https://gitee.com/wlmqgzm/，也可以从下列地址下载：http://www.haisql.cn/fwzc/soft/

Libhaisqlmalloc 库自身是一个商业软件，由乌鲁木齐云山云海信息技术有限责任公司自主研发，使用需要支付费用，不是开源软件。只对用户提供二进制的动态链接库so文件。目前只支持Linux系统，今后有足够需求的话会移植到其它系统，也会支持更多的CPU类型。

**

### 第六章  内存库的对外函数接口**

Libhaisqlmalloc 库目前接管了下列内存相关的函数接口实现内存分配，能够满足多数场景下的内存分配的需求，也可以兼容多数Linux应用。

内存库的所有对外接口：

对外的C函数接口支持如下：

```cpp
 void* malloc( size_t sizet_size_in )  __THROW

 void free( void* ptr_void_in )  __THROW

 void* realloc( void* ptr_void_in, size_t sizet_size_in )  __THROW

 void *reallocarray( void *ptr_void_in, size_t sizet_nmemb_in, size_t sizet_size_in )  __THROW

 void* calloc( size_t n, size_t sizet_size_in ) __THROW

 void  cfree( void* ptr_void_in )  __THROW

 void* valloc( size_t sizet_size_in )  __THROW

 void* pvalloc( size_t sizet_size_in )  __THROW

 void*  aligned_alloc( size_t sizet_alignment_in, size_t sizet_size_in )  __THROW

 void*   memalign( size_t sizet_alignment_in, size_t sizet_size_in )  __THROW

 int posix_memalign( void** ptr_ptr_void_in, size_t sizet_alignment_in, size_t sizet_size_in )  __THROW

 void malloc_stats( void )  __THROW

 int mallopt( int int_key, int int_value )  __THROW
```


 size_t malloc_size( void* p )  __THROW

 int malloc_trim( size_t sizet_pad_in )  __THROW

size_t malloc_usable_size( void* ptr_void_in )  __THROW   

相关主要函数简单介绍：

函数原型：void free(void* p)函数功能：释放指针p指向的内存块p必须是由malloc、calloc或realloc返回的指针

calloc：申请一段内存空间，并将这段内存空间初始化为0

realloc：改变之前申请的一段内存块的大小

malloc函数接口默认与Linux的接口兼容，但是也有区别，说明如下：

头文件： #include 

函数原型：void* malloc(size_t size)

返回值：成功：返回一个指针，该指针指向一块有size个字节的内存块。如果size是0，返回8字节的指针。

失败：将会执行std::terminate()，原因在于目前的系统下都是虚拟内存，可以申请很多虚拟内存，几乎没有可能在申请内存时出现内存不足的情况，就是说几乎不可能出现内存申请失败的情况，实际内存不足的出错都是在缺页中断时。

这种模式可以从源头上增加应用程序的性能。原因在于：应用程序在每次malloc/new/realloc后，应用程序的代码中可以不用检查返回的指针是否为空，所有返回值一定不是nullptr，这样就大幅度简化了内存申请/对象创建的流程，简化了代码设计，增加了性能。由于也不需要用catch thow 捕捉内存不足的情况，所有的函数都可以设置为noexecpt（可以增加应用函数性能）。这种高性能内存申请模式，适合从头开发的高性能应用程序的开发，因为只有在代码中大幅度简化流程，才可以真正增加性能。

对外的C++函数接口支持如下：

```cpp
void* operator new( size_t sizet_size_in ) __THROW

void* operator new[]( size_t sizet_size_in ) __THROW

void* operator new( size_t sizet_size_in, const std::nothrow_t ¬hrowt_in )  noexcept

void* operator new[]( size_t sizet_size_in, const std::nothrow_t ¬hrowt_in )  noexcept

void* operator new( size_t sizet_size_in, std::align_val_t  alignt_in )  __THROW

void* operator new[]( size_t sizet_size_in, std::align_val_t  alignt_in )  __THROW

void* operator new( size_t sizet_size_in, std::align_val_t  alignt_in, const std::nothrow_t ¬hrowt_in )  noexcept

void* operator new[]( size_t sizet_size_in, std::align_val_t  alignt_in, const std::nothrow_t ¬hrowt_in )  noexcept

void operator delete( void* ptr_void_in )  __THROW

void operator delete[]( void* ptr_void_in )  __THROW

void operator delete(void* p, const std::nothrow_t ¬hrowt_in )  noexcept

void operator delete[](void* p, const std::nothrow_t ¬hrowt_in )  noexcept

void operator delete( void* ptr_void_in, std::align_val_t  alignt_in )  __THROW

void operator delete[]( void* ptr_void_in, std::align_val_t  alignt_in )  __THROW

void operator delete( void* ptr_void_in, std::align_val_t  alignt_in, const std::nothrow_t ¬hrowt_in )  noexcept

void operator delete[]( void* ptr_void_in, std::align_val_t  alignt_in, const std::nothrow_t ¬hrowt_in )  noexcept

void operator delete( void* ptr_void_in, size_t sizet_size_in )  __THROW

void operator delete[]( void* ptr_void_in, size_t sizet_size_in )  __THROW

void operator delete( void* ptr_void_in, size_t sizet_size_in, std::align_val_t  alignt_in )  __THROW

void operator delete[]( void* ptr_void_in, size_t sizet_size_in, std::align_val_t  alignt_in )  __THROW
```


库增加了下列6个额外的扩展函数：

1）void  malloc_version( void )  noexcept;

用于显示软件的版权信息。

2）size_t  malloc_all_size( void )  noexcept;

用于获取目前已经申请的全部内存大小。

3)Void malloc_set_limit_callback( const size_t sizet_limit_size_in, void ( *ptr_callback_function_in )( size_t ) )  noexcept;

用于设置一个使用内存总量的限制值，当到达这个限制值时，将会调用函数指针ptr_callback_function_in所指的用户函数，callback函数的参数size_t表示超出阈值的字节数。这个函数实现通知用户线程已经超过内存使用量上限。Callback()在执行时间是内部锁的保护下，因此不会出现并发冲突，任意时刻只会有一个callback()在执行，是thread safe的，callback()的执行时机是在一次malloc()函数的调用中，此时没有返回申请的内存，因此要求callback函数的内部定义比较简单，不能占用较长时间，callback()内部不能有malloc()内存申请的行为，适合简单的设置一个标志后，由定时器执行用户自己的内存回收或者收缩功能。

4)void malloc_show_config( void )  noexcept;

用于当前显示配置参数的设置情况。配置文件是libhaisqlmalloc.conf， 具体的配置参数可以通过这个函数显示出来，方便进行参数配置调试。

5)void  malloc_multi( const unsigned int uint_size_in, const unsigned int uint_count_in, void** ptr_ptr_void_out )  noexcept;

用于批量申请内存块，一次可以申请uint_count_in个uint_size_in大小的内存块(uint_size_in的大小限制小于等于2000KiB),申请得到的内存块保存到ptr_ptr_void_out[0]开始的连续数据结构中。这些内存块可以随时释放，可以单独free释放，这样就比传统内存池有更大的灵活性, 与普通malloc申请的内存块一致，可以混用。由于是批处理申请同样大小的内存，只需要一次判断就跳到相应大小的内部函数中连续进行内存块生成，因此这个函数的性能很高，远快于uint_count_in次调用malloc的性能，并且多数情况下这些申请的内存块是连续的，可以提高生成对象的扫描性能，可以用于生成内存池和批量生成对象的场合等。

6)void  free_multi( void** ptr_ptr_void_in, const unsigned int uint_count_in )  noexcept;

1.27及以后版本开始支持此功能点。

用于批量释放内存块，一次可以释放uint_count_in个同样大小的内存块（单个内存块大小限制小于等于2000KiB），这些内存块的大小必须相同（否则会有不可预料的后果），等待释放的内存块在ptr_ptr_void_in[0]开始的连续数据结构中。主要是用于malloc_multi申请的内存块，也可以用于同样大小的内存池的集中释放，支持跨线程的内存释放, 支持跨线程和本地线程内存的混用。由于是批处理释放同样大小的内存，只需要一次判断就跳到相应大小的内部函数中连续进行内存块的释放，因此这个函数的性能很高，远快于uint_count_in次调用free的性能，可以用于内存池释放和批量释放对象的场合等。

内存库的稳定性的选择方面需要做出抉择：是否为了兼容越界Bug多分配几个字节。

Linux早期系统中一些应用代码存在越界bug, 判断是否要重新申请更多的内存的判断出现了错误，为了避免这种低级bug, 保证有越界bug的程序也可以稳定运行，工程上的内存库的临时解决办法就是malloc多分配几个字节，不用改一行代码，就可以解决很多越界bug, 这个是工程上妥协的手段。现在Linux的各种程序的代码质量已经很高了，很少有越界bug。因此，Libhaisqlmalloc 库默认按实际内存申请量分配内存，减少了内存的浪费，同时也支持修改配置参数bool_malloc_size_plus实现多分配8字节的功能，具体参见配置参数bool_malloc_size_plus的说明。当这个选项启用时，将会在申请1字节--(2M-8)字节时多申请8字节的内存。

下面是Linux 系统默认的malloc的malloc()后执行malloc_usable_size()的返回结果，可以看到每个内存申请都多分配了几个字节

Log: check_malloc_usable_size() malloc() malloc_size=8, malloc_usable_size=24

Log: check_malloc_usable_size() malloc() malloc_size=16, malloc_usable_size=24

Log: check_malloc_usable_size() malloc() malloc_size=24, malloc_usable_size=24

Log: check_malloc_usable_size() malloc() malloc_size=16, malloc_usable_size=24

Log: check_malloc_usable_size() malloc() malloc_size=32, malloc_usable_size=40

Log: check_malloc_usable_size() malloc() malloc_size=48, malloc_usable_size=56

Log: check_malloc_usable_size() malloc() malloc_size=64, malloc_usable_size=72

Log: check_malloc_usable_size() malloc() malloc_size=80, malloc_usable_size=88

Log: check_malloc_usable_size() malloc() malloc_size=96, malloc_usable_size=104

Log: check_malloc_usable_size() malloc() malloc_size=112, malloc_usable_size=120

Log: check_malloc_usable_size() malloc() malloc_size=128, malloc_usable_size=136

Log: check_malloc_usable_size() malloc() malloc_size=144, malloc_usable_size=152

Log: check_malloc_usable_size() malloc() malloc_size=160, malloc_usable_size=168

Log: check_malloc_usable_size() malloc() malloc_size=176, malloc_usable_size=184

Log: check_malloc_usable_size() malloc() malloc_size=192, malloc_usable_size=200

Log: check_malloc_usable_size() malloc() malloc_size=208, malloc_usable_size=216

Log: check_malloc_usable_size() malloc() malloc_size=224, malloc_usable_size=232

Log: check_malloc_usable_size() malloc() malloc_size=240, malloc_usable_size=248

下面是Libhaisqlmalloc 库的malloc()后执行malloc_usable_size()的默认情况下的返回结果，可以看到每个内存申请都刚好适配。

类似的Google tcmalloc 也是按实际内存申请量分配内存，每个内存申请都刚好适配。

Libhaisqlmalloc 库支持int malloc_trim( size_t sizet_pad_in ) 

使用时参数sizet_pad_in在函数内部其实并没有使用，这个限制值不会起作用。Libhaisqlmalloc 库中该函数执行后将尽可能释放所有可以释放的内存,。

Libhaisqlmalloc 库提供了显示内部分配情况的接口malloc_stats，与其他内存库的调用方式兼容。

用法见下面的定义:

```cpp
#include 

void malloc_stats(void);
```


Libhaisqlmalloc 库中的内存分配是很复杂的一个体系，这个体系首先区分了两大类内存，一种是自身消耗的内存，用于管理数据，这种内存我们称为Metadata, 第二种是给用户分配的内存，这种内存以NUMA node和Thread Local为核心，从系统申请的块大小是2M块，再切成小内存分配给用户。下面是一个malloc_stats()调用后的显示案例：

Libhaisqlmalloc os_byte=( 14.566406 MiB ), os_page_byte=( 8.566406 MiB ), os_hugepage_2M_byte=( 6 MiB )

Libhaisqlmalloc sbrk_shared_page all_byte=( 384 KiB ), use_byte=( 111.3125 KiB ), free_byte=( 272.6875 KiB ), free_rate=71%

Libhaisqlmalloc metadata_shared_tiny_block all_byte=( 64 KiB ), all_bit=512, use_bit=31, free_bit=481, free_rate=93%

Libhaisqlmalloc metadata_cpu_tiny_block cpu=0, all_byte=( 64 KiB ), all_bit=512, use_bit=6, free_bit=506, free_rate=98%

Libhaisqlmalloc metadata_cpu_tiny_block cpu=1, all_byte=( 64 KiB ), all_bit=512, use_bit=4, free_bit=508, free_rate=99%

Libhaisqlmalloc metadata_cpu_tiny_block cpu=3, all_byte=( 64 KiB ), all_bit=512, use_bit=2, free_bit=510, free_rate=99%

Libhaisqlmalloc metadata_cpu_tiny_block cpu=4, all_byte=( 64 KiB ), all_bit=512, use_bit=2, free_bit=510, free_rate=99%

Libhaisqlmalloc metadata_cpu_tiny_block cpu=5, all_byte=( 64 KiB ), all_bit=512, use_bit=2, free_bit=510, free_rate=99%

Libhaisqlmalloc metadata_cpu_page_block cpu=0, all_byte=( 2 MiB ), byte_page=( 2 MiB ), all_bit=512, use_bit=353, free_bit=159, free_rate=31%

Libhaisqlmalloc metadata_cpu_page_block cpu=1, all_byte=( 2 MiB ), byte_hugepage2M=( 2 MiB ), all_bit=512, use_bit=220, free_bit=292, free_rate=57%

Libhaisqlmalloc metadata_cpu_page_block cpu=2, all_byte=( 2 MiB ), byte_page=( 2 MiB ), all_bit=512, use_bit=1, free_bit=511, free_rate=99%

Libhaisqlmalloc metadata_cpu_page_block cpu=3, all_byte=( 2 MiB ), byte_hugepage2M=( 2 MiB ), all_bit=512, use_bit=127, free_bit=385, free_rate=75%

Libhaisqlmalloc metadata_cpu_page_block cpu=4, all_byte=( 2 MiB ), byte_page=( 2 MiB ), all_bit=512, use_bit=124, free_bit=388, free_rate=75%

Libhaisqlmalloc metadata_cpu_page_block cpu=5, all_byte=( 2 MiB ), byte_hugepage2M=( 2 MiB ), all_bit=512, use_bit=123, free_bit=389, free_rate=75%

Libhaisqlmalloc numa_node_count=1

libhaisqlmalloc thread_local_data vt_all_size=8, vt_wait_reuse_size=7

libhaisqlmalloc thread_id=00007fd0e1284740, ptr_thread_local=00007fd0dfc2e000, all_byte=( 2 MiB ), page_byte=( 2 MiB ), all_bit=512, use_bit=216, free_bit=296, free_rate=57%

 在上面的例子中，os_byte表示向系统(OS)申请的内存总量，os_page_byte表示向系统(OS)申请的4K Page的内存总量，os_hugepage_2M_byte表示向系统(OS)申请的Hugepage2M的内存总量。

sbrk_shared_page表示通过sbrk方式申请的共享的一块内存（默认大小为4MiB），这块内存是紧急内存块，是so文件初始化尚未完成前就开始执行malloc申请的内存，主要用于so文件还没有初始化完毕，以及so文件已经开始析构的场景下，也叫紧急分配内存块，这部分内存很特殊。这部分内存是使用sbrk方式一次性分配的内存，这部分内存在常规场景下只需要128KiB就足够满足需求，在X Windows的应用下有个别大型程序消耗高达MiB(例如：Codeblocks)，因此，统一配置为4MiB。

all_byte表示全部申请内存， use_byte表示已经使用的内存，free_byte表示空闲的内存，free_rate表示空闲百分比。

Metadata用于Libhaisqlmalloc 库的内部管理数据，有三种类型：

类型一metadata_shared_tiny_block是多CPU共享的用来分配128字节大小的管理空间。此数据结构自身的128字节来自于从shared_page中的分配。

类型二metadata_cpu_tiny_block是每CPU独立的用来分配128字节大小的管理空间，此数据结构自身的128字节来自于类型一。

类型三metadata_cpu_page_block是每CPU独立的用来分配按页面对齐的管理空间，此数据结构自身的128字节来自于类型二。

numa_node_count 表示 NUMA node的数量　

numa_node_2m_block_queue　表示进程单个NUMA node下所有CPU共享的２M块的MPMC无锁队列

vt_all_size 表示thread_local容器（含备用数据）的数据量是多少

vt_wait_reuse_size 表示thread_local备用容器的的数据量是多少(备用数据的相关配置参数：见 /etc/libhaisqlmalloc.conf　中uint_vt_thread_local_wait_reuse_limit_size的说明)。

thread_id 是c/c++获得的thread id值，是一个与线程相关的地址值，等效于std::thread::thread_id,当thread_id显示为零时表示该数据结构对应的线程已经退出，但是有内存没有释放（并不表示出现了内存泄露，有可能一些指针所指的对象正由其他工作线程持有），对应的也有一些少量的2M块没有释放掉。这些thread_local数据结构是可以被反复复用的，因此，有一个thread_local的池子用于复用。

ptr_thread_local表示指向thread_local的指针。

all_byte 表示所有字节数。  page_byte 表示常规页面的字节数。

all_bit 表示所有的Bitmap的bit数。

use_bit 表示已经使用的bit数。

free_bit 表示空闲的bit数。

free_rate 表示空闲的百分比。

**

### 第七章**  **内存库的购买和备份恢复**

Libhaisqlmalloc内存库是一个自研的非开源的内存分配库，花费了商业公司的大量开发时间进行开发和各种优化，使用了大量前沿现代C++技术，研发了大量新的C++模板库，使用了大量的新算法，自有知识产权的源码总行数高达4.2万行，代码量很大，代码量超过很多常见内存分配库的规模，性能极高，技术研发周期很长，研发时间数年，研发成本很高。

考虑软件市场的实际情况，该软件定价也很低，希望所有用户能够支持一下中国基础软件的研发。获取的收入将继续投入到其它重要基础软件的研发。

下面是非注册版运行时的显示内容

Notice: Libhaimalloc Version 1.01   Copyright by http://haisql.cn   Publish Date: 2021.01

Notice: Basic version. max_support_numa_node=8, max_support_cpu=136

Notice: unregister version. Please buy the software ( libhaisqlmalloc.so ) and register it.

Notice: link http://buy.haisql.cn/libhaisqlmalloc/?str_mac=00e07096a61a&str_device=enp2s0&ulong_copy_id=1610526900&uint_copy_id=599826717&uint_version=101&ulong_create_id=1101081971070163&ulong_verify_id=0&str_run=ls

Notice: This software ( libhaisqlmalloc.so ) test time has 23 hours 15 minutes 11 seconds 

 购买链接是第4行的那个http链接。购买后将获取一个libhaisqlmalloc.conf 的配置文件，这个配置文件放置到 /etc/libhaisqlmalloc.conf 或者 当前libhaisqlmalloc.so文件所在的目录下即可。用户可以修改此libhaisqlmalloc.conf文件中的其他内容，以便优化性能，见第四章配置文件和配置选项的说明。

配置文件的一个范例：

str_mac=00e07096a61a

str_device=enp2s0

ulong_copy_id=1605876329

uint_copy_id=156155068

uint_version=101

ulong_create_id=1101081971070163

ulong_verify_id=12739876336654934

 这些配置内容主要是依据用户机器的网卡的MAC地址，so文件自身参数生成的一系列编码, 标识了每一个so文件的拷贝，用于防盗版，每一份拷贝都有单独的验证码。

 如果用户重新装了系统，从备份或者其他机器或者其他压缩格式中恢复的（例如同一台机器的同样ext4文件系统格式的），可能是从其他网站中下载的，那么就需要重新注册和认证。此备份将会被认为是一个新的拷贝，将自动获得7*24小时的测试时间，作为测试版本运行（测试版本将会在每次使用Libhaisqlmalloc库时向stderr输出NOTICE版本信息），测试超过7*24小时将自动abort退出，会影响用户程序的正常使用，因此，从其他机器或者其他压缩格式中恢复备份后，请及时重新注册和认证。

已经付费的用户，在同样的机器上（通过网卡的MAC地址识别），默认自动获得10次重新注册的机会，可以直接获取新的验证码和新的libhaisqlmalloc.conf文件，直接下载下来覆盖掉旧配置文件即可。非注册版默认获得7*24小时的测试时间，超过7*24小时，运行将自动退出。

关于内存库的其他限制条件：

目前用户直接获取的Libhaisqlmalloc库都是基本版。

该版本默认支持8个NUMA node(一般等于CPU槽位数，PC和低端服务器只有一个默认的NUMA node)。

该版本默认支持128个CPU, 一般中低端服务器均低于128个CPU。

对于超过8个NUMA node或超过128个CPU的需求，这些需要ADVANCE VERSION, 请联系：www.haisql.cn 

微信联系方式：微信wlmqgzm。

邮件联系方式：haisql@sina.com.cn

对于大批量购买或者定制需求，也欢迎联系，谢谢您的支持。

**

### 附录二：性能测试建议**

方法用例：export LD_PRELOAD=/mnt/guo/cpp/libhaisqlmalloc/bin/Release/libhaisqlmalloc.so

建议：建议配置一半内存为hugepage2M,见前面第26页的 sysctl.conf 的配置说明。

<strong>附录三：测试代码main.cpp的编译方法</strong>

g++ -Wall -fexceptions -march=core2 -O2 -std=c++11 -c ./main.cpp -o ./main.o

g++ -o ./test_malloc_use_so ./main.o  -s  -lpthread
