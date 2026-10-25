---
title: (1 条消息) Off-CPU分析：窥见冰山下的性能瓶颈
date: "2023-07-22 00:00:00"
updated: "2023-07-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Off-CPU分析-窥见冰山下的性能瓶颈/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/645283689
---


#### 引

遇到`CPU`性能问题时，我们常常通过`perf`来了解`CPU`上到底在执行什么，以及通过`On-CPU`火焰图来帮助我们寻找性能瓶颈。但是，这种方式并不能让我们知道不在`CPU`上运行的进程和线程到底在做什么。在一些场景中，我们会发现`CPU`的使用率上不去，性能表现很差，这时候我们也许就需要考虑，是不是花在应用请求、异步调用这种`Off-CPU`的场景上的时间太多了。

#### Off-CPU分析

性能问题可以划分成两个维度：

- `On-CPU`分析：考虑运行在`CPU`上的进程/线程
- `Off-CPU`分析：考虑因为`I/O`、锁、计数器、换页等事件阻塞的时间
Off-CPU`分析是一种研究`Off-CPU`时间开销、执行上下文等内容的性能分析方法。和`CPU Profiling`不同，`Off-CPU`不关注运行在`CPU`上的进程，它更关注那些被阻塞的进程。如下图所示，很多种原因都会让进程/线程进入到阻塞状态，可能是进程自身的磁盘`I/O`、网络`I/O`等；也可能是因为别的进程导致的上下文切换：总之，这些都会引入延时。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d33a3693334d.jpg)

线程状态 https://www.brendangregg.com/offcpuanalysis.html

Off-CPU`分析是`On-CPU`分析的补充，这样我们就可以理解整个线程执行的时间里都干了些什么。`Off-CPU`分析和追踪技术不一样，因为其主要关内核调度器中阻塞的部分，很容易获得全部的信息。

#### Off-CPU分析方法

在开始介绍`Off-CPU`分析之前，可以先了解一些常见的分析方法。

#### CPU 采样

很多传统的`Profiling`工具通过采样来获取整个`CPU`上执行任务的指令地址或者调用栈信息，并且进行计数统计。这能够帮助我们估算整个系统上的执行情况。例如我们常常通过`perf`来进行`CPU`采样：

`perf record -ag -F 999 -- sleep 5`

考虑如下的调用关系：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cdad9fb0e307.jpg)

A call B

尽管通过`On-CPU`分析我们可以得到热点路径，但是我们并不能知道程序不在`CPU`上的时候发生了什么。

#### 应用追踪

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7a60929eb26a.jpg)

Application Tracing

通过追踪我们可以知道函数开始和退出的时间，从而计算出函数执行的时间。如果我们能够知道消耗的时间和`CPU`时间，我们就可以知道哪些是拖慢`CPU`运行的，哪些是被阻塞的。

追踪的优点是我们可以知道很精确的时间，但是缺点也很明显：如果我们追踪全部的进程，我们可以知道全部的信息，但是也会带来很高的负载从而影响性能；而如果我们只观察某个程序，可能我们寻找尝试很久才能找到那个真正影响性能的程序。

#### Off-CPU追踪

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dd26c054a02b.jpg)

Off-CPU Tracing

Off-CPU`追踪只追踪切换进程的内核系统函数信息，包括时间戳和用户态调用栈。这样我们就可以聚焦于`Off-CPU`事件，而不需要去追踪全部的应用函数，或者去猜测尝试是哪个应用。

#### Off-CPU Sampling

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cb34343cbee9.jpg)

Off-CPU Sampling

Off-CPU`采样通过时序采样来捕获被阻塞的线程调用栈信息，也可以通过`wall-time`采样来实现：采样全部时间全部线程的信息，然后再进行过滤。

Off-CPU`采样在系统采样器中很少使用。在`On-CPU`采样中，每当`CPU`的计时器产生中断，就会记录当前`CPU`上进程的调用栈信息，从而产生一次记录；然而`Off-CPU`采样需要做与之不同的事情，要么在每个应用中设置计时器唤醒他们并记录堆栈，要么让内核按照一定时间间隔遍历线程并捕获堆栈。

#### Off-CPU开销

进行`Off-CPU`追踪的时候，我们需要注意切换(`Scheduler`)事件是非常频繁的：在某些极端场景中，每秒钟会有上百万次切换事件，在这种情况中，即使每次追踪只会增加很小的负载，最终负载也会因为过多的切换事件而变得非常大。`Off-CPU`采样也有相同的问题，因为系统中可能有上千个线程需要被不断采样，这比跨`CPU`的采样计数负载还要高几个数量级。

进行`Off-CPU`分析要求我们对每一步操作可能带来的开销非常敏感。`dump`下全部的进程事件到用户空间再处理是不可以的，这很容易每秒钟产生几个G的文件。

将这些文件写到文件系统和存储设备并进行处理会消耗更多的`CPU`。这就是为什么像`eBPF`这样能够在内核中做归纳的追踪技术的重要性，它们能够减少开销。此外，我们还需要注意反馈循环：追踪器可能会追踪他们自身。

如果对内核调度追踪不熟悉的话，可以先追踪0.1秒，然后慢慢的增加，同时关注追踪对系统`CPU`使用率、应用程序请求率和应用程序延迟的影响。同时最好关注上下文切换(`context switch`)的数量，并在上下文切换比例高的机器上更加小心。

BrendanGregg曾在一个`8CPU`的`Linux 4.15`机器上运行`Mysql`做测试追踪带来的性能影响。这台机器每秒会有`102k`次上下文切换并且`CPU`不存在空闲，在这种情况下任何追踪的开销都会变得很明显。测试结果如下：

- 使用`perf`追踪调度事件带来了9%的性能降低，而当写入到磁盘时会导致12%的性能降低。这个文件在十秒钟的追踪中收集了`224MB`的文件，处理这个文件的符号转换导致了持续35秒的13%的性能降低，这相当于有一个`CPU`被用来做符号转换了。总的来看，10秒钟的`perf`追踪大约带来了持续45秒的9%到13%的性能损耗。
- 使用`eBPF`追踪导致了持续10秒的6%的性能降低，在这之前有一秒钟13%的性能降低用来初始化`eBPF`，之后有6秒钟13%的性能降低来处理数据，总的开销为持续17秒的6%到13%的性能降低。
当追踪时间延长会发生什么呢？对于`eBPF`来说，它只是捕获并且转换栈，不会随着时间线性增长。将追踪时间从10秒提升到60秒，eBPF的处理时间也只是从6秒变成了7秒。而对于`perf`来说，同样的时间增长会使得它的处理时间从35秒变成212秒，因为其需要处理大约六倍的追踪数据。

这里的测试场景和真实负载是一致的吗？在大部分的系统中，往往是不会出现`102k`的上下文切换的，负载会相应变少；然而`Mysql`的调用栈大约只有20-40层，真实负载却可能有上百层，这两者相互平衡。

#### 实践

#### Off-CPU时间

Off-CPU`时间指的是进程/线程被阻塞的时间，我们可以通过`/proc`中的统计信息获取，也可以通过追踪每个阻塞事件来获取。

首先我们可以通过已有的工具来获取相关的时间：

[root@VM-16-2-centos ~]# time ls
real    0m0.102s
user    0m0.007s
sys     0m0.006s

我们使用`time`来查看一个命令对应的时间占比。可以看到`ls`命令总共用了0.102秒，其中`user`和`sys`两个部分加起来一共用了`0.013`秒，剩下的时间就是所谓`Off-CPU`的时间，也就是被阻塞的时间。在0.102秒钟有0.089秒是被阻塞的时间，这个占比过于大了一点。

我们可以用`bcc`工具来追踪某个进程被阻塞的时间：

[root@VM-16-2-centos ~]# /usr/share/bcc/tools/cpudist -O -p 5312
Tracing off-CPU time... Hit Ctrl-C to end.
^C
     usecs               : count     distribution
         0 -> 1          : 19       |**************                          |
         2 -> 3          : 49       |************************************    |
         4 -> 7          : 34       |*************************               |
         8 -> 15         : 30       |**********************                  |
        16 -> 31         : 9        |******                                  |
        32 -> 63         : 7        |*****                                   |
        64 -> 127        : 17       |************                            |
       128 -> 255        : 4        |**                                      |
       256 -> 511        : 2        |*                                       |
       512 -> 1023       : 2        |*                                       |
      1024 -> 2047       : 12       |********                                |
      2048 -> 4095       : 9        |******                                  |
      4096 -> 8191       : 1        |                                        |
      8192 -> 16383      : 4        |**                                      |
     16384 -> 32767      : 54       |****************************************|
     32768 -> 65535      : 14       |**********                              |
     65536 -> 131071     : 11       |********                                |
    131072 -> 262143     : 8        |*****                                   |

这里会展示阻塞时间间隔内出现的次数，例如第一行的含义是0-1微秒的阻塞出现了19次。

cpudist`使用了`kprobe`插桩，插桩了内核函数`finish_task_switch`：

`static struct rq *finish_task_switch(struct task_struct *prev)`

finish_task_switch`会被即将运行的进程调用。`eBPF`可以对这个函数插桩，并通过`bpf_get_current_pid_tgid`和`bpf_ktime_get_ns`来得到当前的`PID`和时间戳。基于这些信息就可以统计出如上的分布图。

以直方图的形式了解`Off-CPU`的时间对于我们排查问题有一点作用，但并不太大。因为我们只能知道多少时间被阻塞了，而不能知道为什么被阻塞，所以我们需要用到`Off-CPU`分析。

#### Off-CPU分析

Off-CPU`分析是基于调用栈分析`Off-CPU`时间的方法，可以帮助我们了解进程/线程为什么被阻塞。我们可以基于如下的准则实现`Off-CPU`追踪分析：

>  Off-CPU时应用程序的调用栈不会改变。

这意味着我们只需要获取一次程序的调用栈即可，这要么在进程进入`CPU`执行时进行，要么在进程切换出`CPU`时进行。一般在进程离开`CPU`时进行比较简单，因为我们可以记录时间间隔。下面就是基于调用栈计算`Off-CPU`时间的方法：

on context switch finish: # 上下文切换结束的时候

```text
    sleeptime[prev_thread_id] = timestamp  # 记录上一个进程A的sleep时间是当前时间
    if !sleeptime[thread_id] # 如果当前进程（切换进来的进程）没有记录或为 就说明当前进程不存在阻塞 return
        return
    delta = timestamp - sleeptime[thread_id]  # 通过现在的时间减去上次被切换出CPU时记录的时间来计算当前进程被阻塞的时间
    totaltime[pid, execname, user stack, kernel stack] += delta # 对当前进程添加阻塞时间
    sleeptime[thread_id] = 0 # 清空当前进程的sleep时间，当当前进程切换走的时候就会由下个进程来记录当前进程的sleep时间
```


on tracer exit:
    for each key in totaltime:
        print key
        print totaltime[key]

简单来说，就是当上下文切换发生时，对于被切换走的进程`A`，记录它在当前时间进入了`sleep`；而对于切换进来的进程`B`，则基于`sleeptime`这个`map`去寻找`B`被切换走的时间，从而计算差值。如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7cfed0d2838d.jpg)

Off-CPU时间计算

在计算时间的同时，追踪工具也可以记录下当前进程相关的上下文信息，如`pid`、用户栈、内核栈等。

我们可以通过`bcc`工具包中的`offcputime`工具来做这样的追踪：

[root@VM-16-2-centos ~]# /usr/share/bcc/tools/offcputime -K -p 996942
Tracing off-CPU time (us) of PID 996942 by kernel stack... Hit Ctrl-C to end.
^C
    finish_task_switch
    __sched_text_start
    schedule
    schedule_hrtimeout_range_clock
    poll_schedule_timeout.constprop.14
    do_select
    core_sys_select
    kern_select
    __x64_sys_select
    do_syscall_64
    entry_SYSCALL_64_after_hwframe

```text
    -                barad_agent (996972)
        350404
```


这里我们通过`-K`来追踪了内核栈，我们也可以追踪用户栈：

[root@VM-16-2-centos ~]# /usr/share/bcc/tools/offcputime -U -p 996942
Tracing off-CPU time (us) of PID 996942 by user stack... Hit Ctrl-C to end.
^C

```text
    -                barad_agent (3101808)
        6
```


具体的使用在这里就不讲解了，大家可以自行了解使用。

#### 注意点

最需要注意的点就是前文提到的开销，除此之外可能还需要注意调度延迟和非自愿上下文切换带来的影响。

#### 调度延迟

从`Off-CPU`堆栈信息中，我们无法看到`Off-CPU`是否包含等待`CPU`运行队列的时间，也即调度延迟的存在。如果`CPU`是饱和运行的，那么即使进程阻塞结束了也可能需要在`CPU`队列中等待。

针对这种情况，我们可以用额外的事件追踪来讲`Off-CPU`时间分为阻塞时间和调度延迟，不过在实际情况中，`CPU`饱和是很容易发现的。

#### 非自愿上下文切换

如果你发现从用户态的调用栈看不出任何切换上下文的原因，可能是因为这是非自愿的上下文切换。这通常在`CPU`饱和时发生，`CPU`调度器会让进程/线程们轮流执行，并在时间片结束之后切换它们，即使它们刚好在跑一个很重要的任务。

我们可以通过过滤进程状态为`TASK_UNINTERRUPTIBLE`的方式来规避：

`/usr/share/bcc/tools/offcputime -p `pgrep -nx mysqld` --state 2`

在 `Linux` 上，非自愿上下文切换发生在 `TASK_RUNNING (0)`状态，而我们通常感兴趣的阻塞事件是 `TASK_INTERRUPTIBLE (1)`或 `TASK_UNINTERRUPTIBLE (2)`，`offcputime` 可以使用`--state`进行匹配。

#### Off-CPU火焰图

类似我们平常说的火焰图，`Off-CPU`分析也可以生成火焰图，生成步骤如下所示：

/usr/share/bcc/tools/offcputime -df -p `pgrep -nx mysqld` 30 > out.stacks
git clone https://github.com/brendangregg/FlameGraph
./FlameGraph/flamegraph.pl --color=io --title="Off-CPU Time Flame Graph" --countname=us  out.svg

生成的火焰图如图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_245f45adce88.jpg)

Off-CPU火焰图

和`On-CPU`火焰图类似，我们可以借助其来找热点，然后进行针对性优化。

关注公众号：程栩的性能优化笔记，了解更多性能知识。

#### 参考资料

- Off-CPU Analysis(https://www.brendangregg.com/offcpuanalysis.html)
