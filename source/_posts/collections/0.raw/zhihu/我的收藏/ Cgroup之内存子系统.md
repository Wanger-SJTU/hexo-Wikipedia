---
title: (1 条消息) Cgroup之内存子系统
date: "2023-07-23 00:00:00"
updated: "2023-07-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Cgroup之内存子系统/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/645416263
---


Memory 子系统主要完成两件事：

（1）控制一组进程使用内存资源的行为；

（2）统计 cgroup 内进程使用内存资源的信息。在实际业务场景中，主要是为了避免某些应用大量占用内存资源（可能是由于内存泄漏导致）从而导致其他进程不可用。当 cgroup 中的进程组占用内存资源达到设置的阈值后，系统会首先尝试回收 buffer/cache，如果回收之后 cgroup 剩余的可用内存资源仍然不足，则会触发 OOM killer。

### cgroup V1

Memory 子系统的特性：

- 统计匿名页、文件缓存、swap 缓存的使用情况并进行限制；

- cgroup 中的所有内存页放在单独的 LRU 链表，不存在系统全局 LRU；

- 可以统计和限制 memory+swap 的总量；

- 可以在层级（hierarchical）进行统计；

- 软限制；

- 移动任务到其它 cgroup 时，同时移动（重新计算）相关的统计信息；

- 内存使用量达到阈值后进行通知；

- 内存资源不足时进行通知；

- 可以禁用 oom-killer 和 oom-notifier

- Root cgroup 没有资源限制。

Memory 子系统包含的文件如下：

cgroup.clone_children
cgroup.event_control
cgroup.procs
memory.failcnt
memory.force_empty
memory.kmem.failcnt
memory.kmem.limit_in_bytes
memory.kmem.max_usage_in_bytes
memory.kmem.slabinfo
memory.kmem.tcp.failcnt
memory.kmem.tcp.limit_in_bytes
memory.kmem.tcp.max_usage_in_bytes
memory.kmem.tcp.usage_in_bytes
memory.kmem.usage_in_bytes
memory.limit_in_bytes
memory.max_usage_in_bytes
memory.memsw.failcnt
memory.memsw.limit_in_bytes
memory.memsw.max_usage_in_bytes
memory.memsw.usage_in_bytes
memory.move_charge_at_immigrate
memory.numa_stat
memory.oom_control
memory.pressure_level
memory.soft_limit_in_bytes
memory.stat
memory.swappiness
memory.usage_in_bytes
memory.use_hierarchy
notify_on_release
tasks

#### 用户态内存资源限制和统计

- memory.limit_in_bytes：可读可写，可以设置和查看当前 cgroup 的可用内存资源（包括文件页缓存）阈值，如果进程组使用的内存资源总量超过 limit_in_bytes，会触发 OOM-killer，杀死或暂停执行进程。默认单位是 bytes，可以通过 K、M、G（不区分大小写）后缀指定单位，-1 表示不限制。

- memory.soft_limit_in_bytes：可读可写，可用内存资源（包括文件页缓存）的软限制，如果进程组使用的内存资源总量超过 soft_limit_in_bytes，系统会尽量回收已经超过软限制的 cgroup，使其小于软限制设置的值，从而满足其它未达到软限制的 cgroup。默认单位是 bytes，可以通过 K、M、G（不区分大小写）后缀指定单位，-1 表示不限制。由于 limit_in_bytes 设置的值是硬限制，因此，为了避免触发 OOM-killer，soft_limit_in_bytes 的值需要小于 limit_in_bytes。软限制在启用 CONFIG_PREEMPT_RT 的系统（内核支持完全抢占，在某些场景可以提升性能）中不可用。

- memory.max_usage_in_bytes：记录 cgroup 创建以来使用内存资源的的峰值，单位 bytes。

- memory.usage_in_bytes：cgroup 中所有任务在当前时刻使用内存资源的总量，单位 bytes。

- memory.failcnt：cgroup 中所有任务使用内存资源的总量达到 memory.limit_in_bytes 的次数。

- memory.numa_stat：每个 numa 节点的内存使用量，单位 bytes，以下是一个样例：

> cat memory.numa_stat
total=5940 N0=5944 N1=220
file=1947 N0=1980 N1=220
anon=66 N0=1 N1=0
unevictable=3927 N0=3963 N1=0
hierarchical_total=5940 N0=5944 N1=220
hierarchical_file=1947 N0=1980 N1=220
hierarchical_anon=66 N0=1 N1=0
hierarchical_unevictable=3927 N0=3963 N1=0

anno：匿名页和 swap 缓存的大小；

file：文件页的大小；

unevictable：不可回收的内存页大小；

total：anno + file + unevictable 的值。

- memory.use_hierarchy：是否允许内核从 cgroup 所在层级（hierarchy）回收内存，默认值为 0，不允许从层级中的其它任务回收内存。目前已被废弃，参考：https://lwn.net/Articles/835983。

- memory.stat：统计 cgroup 的内存使用信息。

> cat memory.stat
cache 0
rss 0
rss_huge 0
shmem 0
mapped_file 0
dirty 0
writeback 0
swap 0
pgpgin 0
pgpgout 0
pgfault 28215
pgmajfault 0
inactive_anon 0
active_anon 0
inactive_file 0
active_file 0
unevictable 0
hierarchical_memory_limit 9223372036854771712
hierarchical_memsw_limit 9223372036854771712
total_cache 0
total_rss 0
total_rss_huge 0
total_shmem 0
total_mapped_file 0
total_dirty 0
total_writeback 0
total_swap 0
total_bgd_reclaim 0
total_pgpgin 0
total_pgpgout 0
total_pgfault 28215
total_pgmajfault 0
total_inactive_anon 0
total_active_anon 0
total_inactive_file 0
total_active_file 0
total_unevictable 0

cache：缓存页，包括 tmpfs（shim），单位 bytes。

rss：匿名页和 swap 空间，包括透明大页，不包括 tmpfs（shim），单位 bytes。

rss_huge：透明大页，单位 bytes。

shmem：共享内存页，单位 bytes。

mapped_file：文件映射页（包括 tmpfs 和 shmem），单位 bytes。

dirty：脏页（等待被写入磁盘的页），单位 bytes。

writeback：队列中即将被同步到磁盘的文件页和匿名页，单位 bytes。

swap：被使用的交换空间，单位 bytes。

pgpgin：将数据从磁盘读入内存的次数。（匿名页 RSS 或 缓存页）

pgpgout：将内存页从内存写入磁盘的次数。

pgfault：发生缺页中断（内核必须为进程虚拟内存地址空间分配和初始化物理内存）的次数。

pgmajfault：发生 major 类型（内核在分配和初始化内存页之前必须主动释放物理内存） pagefalut 的次数。

inactive_anon：处于 inactive LRU 列表中的匿名页和 swap 页面总和，包括 tmpfs，单位 bytes。

active_anon：处于 active LRU 列表中的匿名页和 swap 页面总和，包括 tmpfs，单位 bytes。

inactive_file：处于 inactive LRU 列表中文件页，单位 bytes。

active_file：处于 active LRU 列表中文件页，单位 bytes。

unevictable：不可回收的内存页，单位 bytes。

以下内容在开启 hierarchy（memory.use_hierarchy 文件的值为 1）时才有：

hierarchical_memory_limit：当前 cgroup 层级（包括所有子 cgroup）的可用内存资源阈值。

hierarchical_memsw_limit：当前 cgroup 层级（包括所有子 cgroup）的可用内存资源 + swap 空间阈值。

total_xxx：当前 cgroup 层级（包括所有子 cgroup）的值。例如：total_cache，含义和 cache 相同。

- memory.move_charge_at_immigrate：当移动 cgroup 中的任务到其它 cgroup 中时，是否移动该任务使用内存页的统计信息。关闭此功能，任务进入新的 cgroup 记录的内存使用量从 0 开始。开启此功能，会在原有值的基础上累加，同时清理原 cgroup 中的相关数据。目前已被废弃。

- memory.pressure_level：内存压力通知。

- memory.force_empty：触发强制内存回收操作。当设置为 0 时，cgroup 中所有任务使用的内存页会被回收，只有在 cgroup 中没有任务时才可使用。典型的应用是移除 cgroup 的时候，分配的页缓存会一直保留，直到内存压力较大的时候才被回收，如果想避免这种情况，可以使用 memory.force_empty 主动触发。

#### 交换空间大小限制和统计

- memory.memsw.limit_in_bytes：可用内存资源+交换空间总量的阈值。默认单位是 bytes，可以通过 K、M、G（不区分大小写）后缀指定单位，-1 表示不限制。为了避免 OOM 错误，memory.limit_in_bytes 的值需要小于 memory.memsw.limit_in_bytes，同时，memory.memsw.limit_in_bytes 的值需要小于可用交换分区总量。如果 memory.memsw.limit_in_bytes 的值等于 memory.limit_in_bytes，相当于禁用交换分区。同时，这两个参数的设置顺序也很重要，如果在设置 memory.limit_in_bytes 之前设置 memory.memsw.limit_in_bytes 的值可能会导致错误，因为，memory.memsw.limit_in_bytes 只有在内存消耗达到 memory.limit_in_bytes 设置的值才会生效。

⚠️ 注意：为什么是 memory + swap 而不是直接限制 swap 呢？

系统中的内核线程 kswapd 根据全局 LRU 可以换出任意页面。换出的时候，内存页面会被换出到交换分区，也就是说，换出之后，memory + swap 的总量还是没变。如果希望在不影响全局 LRU 的情况下限制 swap 的使用，从操作系统的角度看，限制 memory + swap 比直接限制 swap 更好。

- memory.memsw.max_usage_in_bytes：和 memory.max_usage_in_bytes 类似，记录使用 memory + swap 的峰值，单位 bytes。

- memory.memsw.usage_in_bytes：cgroup 中所有任务在当前时刻使用 memory + swap 的总量，单位 bytes。

- memory.memsw.failcnt：记录 cgroup 所有任务使用 memory + swap 的总量达到 memory.memsw.limit_in_bytes 的次数。

- memory.swappiness：和 Linux 内核参数 vm.swappiness 定义类似，控制换出运行时内存的相对权重。可设置的范围为 0 到 100，值越小，表示让内核交换越少内存页到交换空间，值越大，表示让内核更多地使用交换空间。默认和`/proc/sys/vm/swappiness`的值相同。0 不会阻止内存页被换出，当内存资源不足时，仍然可能被换出到交换分区。

⚠️ 注意：不能修改 root cgroup 中的 memory.swappiness，它继承 `/proc/sys/vm/swappiness`的值。如果有子 cgroup，也不能修改其 memory.swappiness 的值。

#### 内核态内存资源限制和统计

- memory.kmem.limit_in_bytes：可用内核内存资源的阈值。默认单位是 bytes，可以通过 K、M、G（不区分大小写）后缀指定单位，-1 表示不限制。已被弃用， kmem: further deprecate kmem.limit_in_bytes，从 linux v5.16-rc1 开始，设置 memory.kmem.limit_in_bytes 的值会返回 -ENOTSUPP 错误。

- memory.kmem.max_usage_in_bytes：使用内核内存资源的峰值，单位 bytes。

- memory.kmem.usage_in_bytes：当前时刻 cgroup 中所有任务使用内核内存的总量，单位 bytes。

- memory.kmem.failcnt：记录 cgroup 中所有任务使用内核内存的总量达到 memory.kmem.limit_in_bytes 的次数。

- memory.kmem.tcp.limit_in_bytes：cgroup 中所有任务使用 TCP 协议的内存资源总量阈值。默认单位是 bytes，可以通过 K、M、G（不区分大小写）后缀指定单位，-1 表示不限制。

- memory.kmem.tcp.max_usage_in_bytes：记录 cgroup 中所有任务使用 TCP 协议的内存资源总量峰值，单位 bytes。

- memory.kmem.tcp.failcnt：记录使用 TCP 协议的内存资源总量达到 memory.kmem.tcp.limit_in_bytes 的次数。

- memory.kmem.slabinfo：记录内核 slab 分配器的状态。slab 分配器是内核管理 cgroup 内存分配的一种机制，从 buddy 分配器中申请内存，然后将申请的内存进行更细粒度（以字节为单位）管理。

#### OOM 控制

- memory.oom_control：是否启用 OOM-killer，如果不启用（oom_kill_disable 的值为 1），当触发 OOM 时，进程会 hang 住（进程处于 D 状态），等待有足够的内存资源后继续运行。如果启用，触发 OOM 之后会直接终止进程以释放内存。默认启用（oom_kill_disable 的值为 0）。以下是 memory.oom_control 的示例：

> cat memory.oom_control
oom_kill_disable 0
under_oom 0
oom_kill 0


oom_kill_disable：是否禁用 OOM-killer，直接写 memory.oom_control 文件会更新该值。

under_oom：当前时刻是否处于 OOM 状态。如果值为 1，表示正处于 OOM 状态，进程可能被终止。

oom_kill：cgroup 中被 OOM-killer 杀死的进程数量。

#### Event 控制

- cgroup.event_control：提供 event_fd() 的接口。有 3 种用途：

- 内存阈值：memory cgroup 通过 cgroups notification API 实现内存阈值功能，允许设置多个 memory 和 memory + swap 阈值，当 cgroup 中任务使用内存达到阈值之后通知用户态进程。注册阈值的步骤：（1）通过 eventfd(2) 系统调用创建 event_fd；（2）打开 memory.usage_in_bytes 或 memory.memsw.usage_in_bytes 文件，得到 fd；（3）向 cgroup.event_control 文件写入 "  " 。

- OOM 控制：上文提到的 memory.oom_control 文件是为了 OOM 通知等其它控制，通过 cgroup notification API，可以注册多个 OOM 通知客户端，在触发 OOM 的时候得到通知。注册通知器的步骤：（1）通过 eventfd(2) 系统调用创建 event_fd；（2）打开 memory.oom_control 文件，得到 fd；（3）向 cgroup.event_control 文件写入 " " 。

- 内存压力：memory.pressure_level 可以用于监控内存分配开销，基于内存压力，应用可以实现不同的策略用于管理内存资源。
内存压力的定义：

- low：系统正在回收内存资源以满足新的分配请求。应用程序收到通知后，可以分析 vmstat 并提前采取措施（关闭不重要的服务）

- medium：系统处于中等内存压力下，可能正在向交换分区换出内存页，将文件页缓存写入磁盘等。此时，应用程序可以进一步分析 vmstat/zoneinfo/memcg 或内部内存使用信息，释放任何容易重建或从磁盘重新读取的资源。

- critical：系统正在积极进行内存回收，即将达到 OOM 状态并且触发 OOM-killer。此时，应用程序再分析 vmstat 等信息已经晚了，应该立即采取行动。

默认情况下，通知事件是向上传播的，直到被处理。例如，有 3 个 cgroup A、B、C，A 是 B 的父 cgroup，B 是 C 的父 cgroup。假如 C 的内存压力较大，只有 C 能收到通知，A 和 B 不会收到。B 只有在 C 中没有通知的时候才能收到通知。

传播行为有 3 种模式：

- default：与不设置参数的效果一样，为了兼容而保留。

- hierarchy：事件总是向上传播到 root cgroup，与默认行为类似，只是每一级无论是否有事件监听器，传播都会继续。对于上面的例子，A 和 B 都会收到通知。

- local：只有注册了事件通知器的 cgroup 才会收到通知，对于上面的例子，如果 C 注册了 local 通知器，将会收到通知，但是对于 B，无论 C 是否注册事件通知器，B 都不会收到通知。内存压力等级和通知模式通过逗号分隔组成字符串，例如："low,hierarchy" 表示内存压力处于 low 等级时向层级的 root cgroup 传播通知。

cgroup.event_control 在启用 CONFIG_PREEMPT_RT 的系统（内核支持完全抢占，在某些场景可以提升性能）中不可用。

#### Demo 体验

我们以 memory 为例，使用`memhog`工具模拟使用内存资源。可以通过以下命令安装`memhog`：

sudo apt install numactl


使用 memhog 使用 100 MB 内存资源：

memhog 100M


使用以下脚本，每 2 秒使用 100 MB 内存资源：

while true; do memhog 100M; sleep 2; done


使用`cgroup-tools`工具管理 cgroup，安装方式：

sudo apt install cgroup-tools


Demo 的步骤如下：

- 使用`cgroup-tools`创建新的 cgroup

❯ cgcreate -g memory:memhog-limiter
❯ pwd
/sys/fs/cgroup/memory/memhog-limiter
❯ ls
cgroup.clone_children           memory.kmem.tcp.max_usage_in_bytes  memory.oom_control
cgroup.event_control            memory.kmem.tcp.usage_in_bytes      memory.pressure_level
cgroup.procs                    memory.kmem.usage_in_bytes          memory.soft_limit_in_bytes
memory.failcnt                  memory.limit_in_bytes               memory.stat
memory.force_empty              memory.max_usage_in_bytes           memory.swappiness
memory.kmem.failcnt             memory.memsw.failcnt                memory.usage_in_bytes
memory.kmem.limit_in_bytes      memory.memsw.limit_in_bytes         memory.use_hierarchy
memory.kmem.max_usage_in_bytes  memory.memsw.max_usage_in_bytes     memory.watermark
memory.kmem.slabinfo            memory.memsw.usage_in_bytes         memory.watermark_scale_factor
memory.kmem.tcp.failcnt         memory.move_charge_at_immigrate     notify_on_release
memory.kmem.tcp.lim


- 设置 cgroup 的最大可用内存资源阈值

❯ cgset -r memory.limit_in_bytes=50M memhog-limiter
❯ cat memory.limit_in_bytes
52428800


该命令将`memhog-limiter`的`memory.limit_in_bytes`设置为`50M`，和直接修改`memory.limit_in_bytes`文件内容的效果一样。

- 使用`memhog`模拟内存分配，并将使用内存的进程加入 cgroup

tee memhogtest.sh  EOF
echo "PID: \$\$"
while true; do memhog 100M; sleep 2; done
EOF
chmod +x memhogtest.sh

# 清理 dmesg 消息
dmesg -C
# 在目标 cgroup 中运行进程
cgexec -g memory:memhog-limiter ./memhogtest.sh
# 查看 dmesg 消息
dmesg


可以看到，系统触发了 OOM-killer：

[615794.049343] memhog invoked oom-killer: gfp_mask=0xcc0(GFP_KERNEL), order=0, oom_score_adj=0
[615794.052039] CPU: 1 PID: 3530984 Comm: memhog Kdump: loaded Tainted: G           OE     5.4.143.bsk.8-amd64 #5.4.143.bsk.8
[615794.055448] Hardware name: OpenStack Nova, BIOS
[615794.057145] Call Trace:
[615794.058352]  dump_stack+0xx81
[615794.059625]  dump_header+0x4a/0x1d8
[615794.061334]  oom_kill_process.cold.36+0xb/0x10
[615794.063582]  out_of_memory+0x1ax4a0
[615794.065409]  mem_cgroup_out_of_memory+0xbe/0xd0
[615794.067044]  try_charge_memcg+0x67d/0x6e0
[615794.068879]  ? __alloc_pages_nodemask+0xx310
[615794.070705]  mem_cgroup_charge+0xx250
[615794.072616]  handle_mm_fault+0xax12e0
[615794.074560]  do_user_addr_fault+0x1ce/0x4d0
[615794.076534]  do_page_fault+0xx110
[615794.078265]  async_page_fault+0x3e/0x50
[615794.079908] RIP: 0033:0x7f43b701c55d
[615794.081798] Code: 01 00 00 48 83 fa 40 77 77 c5 fe 7f 44 17 e0 c5 fe 7f 07 c5 f8 77 c3 66 0f 1f 44 00 00 c5 f8 77 48 89 d1 40 0f b6 c6 48 89 fa f3> aa 48 89 d0 c3 66 66 2e 0f 1f 84 00 00 00 00 00 66 90 48 39 d1
[615794.087942] RSP: 002b:00007ffc8bf8cca8 EFLAGS: 00010206
[615794.089897] RAX: 00000000000000ff RBX: 0000000000a00000 RCX: 0000000000072000
[615794.092202] RDX: 00007f43b32bd000 RSI: 00000000000000ff RDI: 00007f43b3c4b000
[615794.094799] RBP: 0000000003200000 R08: 00007f43b707c8c0 R09: 00007f43b6ebd740
[615794.097459] R10: 000000000000002e R11: 0000000000000246 R12: 00007f43b0abd000
[615794.100303] R13: 0000000000a00000 R14: 00007ffc8bf8ce08 R15: 0000000000000000
[615794.103284] memory: usage 51200kB, limit 51200kB, failcnt 994
[615794.105697] memory+swap: usage 51200kB, limit 9007199254740988kB, failcnt 0
[615794.107948] kmem: usage 260kB, limit 9007199254740988kB, failcnt 0
[615794.109792] Memory cgroup stats for /memhog-limiter:
[615794.109849] anon 52445184
                file 0
                kernel_stack 0
                sock 0
                shmem 0
                file_mapped 0
                file_dirty 0
                file_writeback 0
                anon_thp 0
                inactive_anon 0
                active_anon 52445184
                inactive_file 0
                active_file 0
                unevictable 0
                slab_reclaimable 0
                slab_unreclaimable 0
                slab 0
                bgd_reclaim 0
                workingset_refault 0
                workingset_activate 0
                workingset_nodereclaim 0
                pgfault 449823
                pgmajfault 0
                pgrefill 0
                pgscan 0
                pgsteal 0
                pgactivate 0
                pgdeactivate 0
                pglazyfree 0
                pglazyfreed 0
                thp_fault_alloc 0
                thp_collapse_alloc 0
[615794.152864] Tasks state (memory values in pages):
[615794.154685] [  pid  ]   uid  tgid total_vm      rss pgtables_bytes swapents oom_score_adj name
[615794.157657] [3529173]     0 3529173      595      377    45056        0             0 sh
[615794.160614] [3530984]     0 3530984    26184    13040   151552        0             0 memhog
[615794.163519] oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=/,mems_allowed=0-1,oom_memcg=/memhog-limiter,task_memcg=/memhog-limiter,task=memhog,pid=3530984,uid=0
[615794.168572] Memory cgroup out of memory: Killed process 3530984 (memhog) total-vm:104736kB, anon-rss:50704kB, file-rss:1456kB, shmem-rss:0kB, UID:0 pgtables:148kB oom_score_adj:0
[615794.180304] oom_reaper: reaped process 3530984 (memhog), now anon-rss:0kB, file-rss:0kB, shmem-rss:0kB


通过`memory.failcnt`文件可以看到触发 OOM 的次数：

❯ cat memory.failcnt
1128


### cgroup V2

在 cgroup v2 中，需要通过父 cgroup 的 `cgroup.subtree_control`开启 memory controller，为当前 cgroup 开启 memory controller 之后，会新增 memory 相关的文件（`memory.pressure`在没开启 memory controller 的情况下也存在）：

❯ cat cgroup.controllers
memory
❯ ls memory.*
memory.current
memory.drop_cache
memory.events
memory.events.local
memory.high
memory.low
memory.max
memory.min
memory.numa_stat
memory.oom.group
memory.pressure
memory.reclaim
memory.stat
memory.swap.current
memory.swap.events
memory.swap.max

对于 cgroup 子系统中的数据，单位都是 bytes，如果写入的值没有按 PAGE_SIZE 对齐，则会增加到最近 PAGE_SIZE 对齐的值。

#### 用户态内存资源限制和统计

- memory.current：当前 cgroup 及子 cgroup 使用的内存总量。

- memory.high：可读可写，存在于非 root cgroup 中。当前 cgroup 中所有进程使用内存的上限。当内存使用总量超过`memory.high`之后，此时还不会触发 OOM，kernel 会尽力回收内存（回收压力较大），确保内存使用总量低于`memory.high`。`memory.high`可以用在有外部进程监控当前 cgroup 的场景下，以便主动回收内存，从而减轻 kernel 回收内存的压力。

- memory.low：可读可写，存在于非 root cgroup 中，默认值为 0。如果当前 cgroup 内存使用总量低于`有效 low 边界`，尽力不回收内存，除非在未受保护 cgroup 中没有可回收的内存（也就是说，即使内存使用总量低于`memory.low`，也有可能被回收）。如果当前 cgroup 内存使用总量高于这个值，kernel 会按比例回收内存页，以减少回收压力。

有效 low 边界由祖先 cgroup 的 `memory.low`决定，如果子 cgroup 的`memory.low`值大于祖先 cgroup（需要更多受保护的内存），则每个子 cgroup 将获得与其实际内存使用量成比例的父 cgroup 保护内存。

低于 memory.low 的内存尽量不被回收，因此，在使用过程中，不适合设置为比实际使用量更高的值。

- memory.max：可读可写，默认为 max（不限制）。内存使用量的硬限制，如果 cgroup 中所有进程总的内存使用量高于这个值并且不能减小，将会触发 OOM-killer，在某些场景下，可能会短时间超过限制。

默认情况下，分配内存总是会成功，除非当前进程被 OOM-killer 选中。某些情况下，可能不会触发 OOM-killer，而是返回`-ENOMEM`给用户态进程，此时，用户可以重新尝试分配内存。

- memory.min：可读可写，存在于非 root cgroup 中。硬内存保护，如果内存使用量低于`有效 min 边界`，无论如何，这部分内存都不会被回收。如果没有不受保护并且可回收的内存，则会触发 OOM-killer。内存使用量高于`有效 min 边界`，内存页会按比例被回收。

有效 min 边界由祖先 cgroup 决定，如果子 cgroup 的`memory.min`值大于祖先 cgroup（需要更多受保护的内存），则每个子 cgroup 将获得与其实际内存使用量成比例的父 cgroup 保护内存。

不鼓励将`memory.min`设置为比实际使用量更多的值，这可能会导致持续的 OOM，如果 cgroup 中没有进程，`memory.min`会被忽略。

high，low，max，min 的关系：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9aa29d06ec0b.jpg)

- memory.stat：只读，存在非 root cgroup 中。包含不同类型内存的详细信息，以及内存管理系统的状态和事件信息。单位都是 bytes。如果某个条目没有 node 级别的统计，使用 npn（non-per-node）标记，不会出现在`memory.numa_stat`文件中。

❯ cat memory.stat
anon 0
file 0
kernel_stack 0
sock 0
shmem 0
file_mapped 0
file_dirty 0
file_writeback 0
anon_thp 0
inactive_anon 0
active_anon 0
inactive_file 0
active_file 0
unevictable 0
slab_reclaimable 0
slab_unreclaimable 0
slab 0
bgd_reclaim 0
workingset_refault_anon 0
workingset_refault_file 0
workingset_activate_anon 0
workingset_activate_file 0
workingset_restore_anon 0
workingset_restore_file 0
workingset_nodereclaim 0
pgscan 0
pgsteal 0
pgscan_kswapd 0
pgscan_direct 0
pgsteal_kswapd 0
pgsteal_direct 0
pgfault 0
pgmajfault 0
pgrefill 0
pgactivate 0
pgdeactivate 0
pglazyfree 0
pglazyfreed 0
thp_fault_alloc 0
thp_collapse_alloc 0


anon：在匿名映射中使用的内存，如 brk()、sbrk() 和 mmap(MAP_ANONYMOUS)。

file：用于缓存文件系统数据的内存，包括临时文件和共享内存。

kernel_stack：分配给内核栈的内存。

sock：用于网络传输缓冲区的内存使用量。

shmem：支持 swap 的缓存文件系统数据，例如 tmpfs、shm 段、共享匿名 mmap()。

file_mapped：用 mmap() 映射的缓存文件系统数据。

file_dirty：被修改但尚未写回磁盘的缓存文件系统数据。

file_writeback：缓存到文件系统的数据，该数据已被修改，目前正被写回磁盘。

anon_thp：由透明 hugepages 支持的匿名映射使用的内存。

inactive_anon、active_anon、inactive_file、active_file、unevictable：页面回收算法管理内部内存管理列表使用的内存，包括支持 swap 和支持文件系统的内存。

slab_reclaimable：slab 中可能被回收的部分，如 dentries 和 inodes。

slab_unreclaimable：slab 中不可被回收的部分。

slab（npn）：用于存储内核内数据结构的内存量。

workingset_refault_anon：被驱逐的匿名页再次被访问触发 fault 的次数。

workingset_refault_file：被驱逐的文件页再次被访问触发 fault 的次数。

workingset_activate_anon：再次访问触发 fault 的且立即处于 actived 状态的匿名页数量。

workingset_activate_file：再次访问触发 fault 的且立即处于 actived 状态的文件页数量。

workingset_restore_anon：被恢复的匿名页数量。

workingset_restore_file：被恢复的文件页数量。

workingset_nodereclaim：影子节点被回收的次数。

pgscan（npn）：已扫描页面的数量（在非活动的 LRU 列表中）。

pgsteal（npn）：回收的页面数量。

pgscan_kswapd（npn）：kswapd 扫描的页数(在非活动的 LRU 列表中)。

pgscan_direct（npn）：直接扫描的页面数量（在非活动的 LRU 列表中）。

pgsteal_kswapd（npn）：kswapd 回收的页面数量。

pgsteal_direct（npn）：直接回收的页面数量。

pgfault（npn）：触发 pagfault 的数量。

pgmajfault（npn）：发生 major pagefault 的数量。（被访问的数据不在虚拟地址空间，也不在物理内存中，需要从慢速存储介质读取。）

pgrefill（npn）：被扫描的页面数量（位于 active LRU 列表）。

pgactivate（npn）：被移动到 active LRU 列表中的页面数量。

pgdeactivate（npn）：移动到 inactive LRU 列表中的页面数量。

pglazyfree（npn）：在内存压力下被推迟释放的页面数量。

pglazyfreed（npn）：已经被回收的“推迟回收页面”的数量。

thp_fault_alloc（npn）：为响应 pagefault 而分配的透明 hugepages 数量。如果没有设置 CONFIG_TRANSPARENT_HUGEPAGE，不存在这个计数器。

thp_collapse_alloc（npn）：为允许折叠现有页面范围而分配的透明 hugepages 数量。如果没有设置 CONFIG_TRANSPARENT_HUGEPAGE，不存在这个计数器。

- memory.numa_stat：只读，存在非 root cgroup 中。包含不同类型内存的详细信息，以及每个 node 的其它内存管理信息。

❯ cat memory.numa_stat
anon N0=0
file N0=0
kernel_stack N0=0
shmem N0=0
file_mapped N0=0
file_dirty N0=0
file_writeback N0=0
anon_thp N0=0
inactive_anon N0=0
active_anon N0=0
inactive_file N0=0
active_file N0=0
unevictable N0=0
slab_reclaimable N0=0
slab_unreclaimable N0=0
workingset_refault_anon N0=0
workingset_refault_file N0=0
workingset_activate_anon N0=0
workingset_activate_file N0=0
workingset_restore_anon N0=0
workingset_restore_file N0=0
workingset_nodereclaim N0=0


#### 交换空间大小限制和统计

- memory.swap.current：当前 cgroup 及子 cgroup 使用交换分区（swap）的总量。

- memory.swap.events：swap 相关限制触发的事件数量。

> cat memory.swap.events
max 0
fail 0


max：当前 cgroup 的 swap 使用量即将超过`memory.swap.max`而导致 swap 分配失败的次数。

fail：swap 分配失败的次数，原因是系统 swap 已经用完或达到设置的`memory.swap.max`限制。

- memory.swap.max：swap 的硬限制。如果当前 cgroup 的 swap 使用量达到`memory.swap.max`，匿名内存将不会被交换出去。

#### 内核态内存资源限制和统计

cgroup v2 没有专门提供关于内核内存资源限制和统计的接口文件，部分统计信息已经包括在`memory.stat`文件中。

#### OOM 控制

- memory.oom.group：可读可写，存在于非 root cgroup，默认值为 0。如果设置为 1，当触发 OOM 后当前 cgroup 及子孙 cgroup 内的所有进程（除了 oom_score_adj 为 -1000 的进程）都会被杀死，或者都不会被杀死。这是为了保证 cgroup 中负载的完整性（有些负载在部分进程被杀死的情况下不能正常工作）。如果 OOM-killer 在当前 cgroup 被触发，无论祖先 cgroup 的`memory.oom.group`如何，都不会杀死当前 cgroup 之外的任何进程。

#### Event 控制

- memory.drop_cache：可写文件，用于手动释放内存缓存。

- memory.reclaim：存在于所有 cgroup 中，用于触发目标 cgroup 的内存回收。文件接收的值是需要回收的内存数量。例如：

echo "1G" > memory.reclaim


Kernel 实际回收的内存数量可能不等于期望值，如果少于指定的值，将返回`-EAGAIN`。

- memory.events：只读文件，存在非 root cgroup 中，统计内存限制相关事件的触发次数。包括当前 cgroup 和所有子 cgroup 触发事件的总和，当前 cgroup 的事件触发情况在`memory.events.local`文件。

❯ cat memory.events
low 0
high 0
max 0
oom 0
oom_kill 0


low：内存使用量低于`memory.low`，由于高内存压力而触发了内存回收的次数。通常是 low 设置的值过大导致的情况。

high：内存使用量高于 high 被节流并进行直接内存回收的次数。

max：内存使用量即将超过`memory.max`的次数，如果回收没有成功，则会进入 OOM 状态。

oom：内存使用量达到限制并进入 OOM 状态的次数，此时尝试分配内存将会失败。

oom_kill：cgroup 中的进程被 OOM-killer 杀死的次数。

- memory.events.local：同上，只包含当前 cgroup 的数据。

#### Demo 体验

使用 cgroup v1 demo 用于定时分配内存的脚本：

❯ ./memhogtest.sh
PID: 746644


加入 cgroup，同时设置 cgroup 的 memory.max 为 100M：

`❯ echo 746644 > cgroup.procs && echo 100M > memory.max`

进程由于触发 OOM 被 kill：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d460dc04167e.jpg)

Kernel 日志：

[1367090.223722] memhog invoked oom-killer: gfp_mask=0xcc0(GFP_KERNEL), order=0, oom_score_adj=0
[1367090.226156] CPU: 2 PID: 748251 Comm: memhog Kdump: loaded Tainted: G           OE     5.4.210.bsk.4-amd64 #5.4.210.bsk.4
[1367090.229922] Hardware name: OpenStack Nova, BIOS
[1367090.232181] Call Trace:
[1367090.233575]  dump_stack+0xx81
[1367090.235116]  dump_header+0x4a/0x1d8
[1367090.236588]  oom_kill_process.cold.39+0xb/0x10
[1367090.238146]  out_of_memory+0x1ax4d0
[1367090.239713]  mem_cgroup_out_of_memory+0xbe/0xd0
[1367090.241454]  try_charge_memcg+0x67d/0x6e0
[1367090.243018]  ? __alloc_pages_nodemask+0xx310
[1367090.244723]  mem_cgroup_charge+0xx250
[1367090.246296]  handle_mm_fault+0xax12e0
[1367090.247784]  do_user_addr_fault+0x1ce/0x4d0
[1367090.249285]  do_page_fault+0xx110
[1367090.250635]  async_page_fault+0x3e/0x50
[1367090.252166] RIP: 0033:0x7ffb41f158bd
[1367090.253617] Code: 01 00 00 48 83 fa 40 77 77 c5 fe 7f 44 17 e0 c5 fe 7f 07 c5 f8 77 c3 66 0f 1f 44 00 00 c5 f8 77 48 89 d1 40 0f b6 c6 48 89 fa f3> aa 48 89 d0 c3 66 66 2e 0f 1f 84 00 00 00 00 00 66 90 48 39 d1
[1367090.258600] RSP: 002b:00007fff630afe68 EFLAGS: 00010206
[1367090.260620] RAX: 00000000000000ff RBX: 0000000000a00000 RCX: 000000000006c000
[1367090.263249] RDX: 00007ffb413b6000 RSI: 00000000000000ff RDI: 00007ffb41d4a000
[1367090.265448] RBP: 0000000006400000 R08: 00007ffb41f758c0 R09: 00007ffb41db6740
[1367090.267754] R10: 000000000000002e R11: 0000000000000246 R12: 00007ffb3b9b6000
[1367090.269798] R13: 0000000000a00000 R14: 00007fff630affc8 R15: 0000000000000000
[1367090.272007] memory: usage 102400kB, limit 102400kB, failcnt 570
[1367090.274263] swap: usage 0kB, limit 9007199254740988kB, failcnt 0
[1367090.276337] Memory cgroup stats for /test/child:
[1367090.276471] anon 104620032
                 file 0
                 kernel_stack 73728
                 sock 0
                 shmem 0
                 file_mapped 0
                 file_dirty 0
                 file_writeback 0
                 anon_thp 0
                 inactive_anon 0
                 active_anon 104484864
                 inactive_file 0
                 active_file 0
                 unevictable 0
                 slab_reclaimable 0
                 slab_unreclaimable 135288
                 slab 135288
                 bgd_reclaim 0
                 workingset_refault 0
                 workingset_activate 0
                 workingset_nodereclaim 0
                 pgscan 0
                 pgsteal 0
                 pgscan_kswapd 0
                 pgscan_direct 0
                 pgsteal_kswapd 0
                 pgsteal_direct 0
                 pgfault 745041
                 pgmajfault 0
                 pgrefill 0
                 pgactivate 0
                 pgdeactivate 0
                 pglazyfree 0
                 pglazyfreed 0
                 thp_fault_alloc 0
                 thp_collapse_alloc 0
[1367090.306459] Tasks state (memory values in pages):
[1367090.307975] [  pid  ]   uid  tgid total_vm      rss pgtables_bytes swapents oom_score_adj name
[1367090.310435] [ 746644]  1001 746644      595      406    45056        0             0 sh
[1367090.312420] [ 748251]  1001 748251    26184    25838   249856        0             0 memhog
[1367090.314790] oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=test,mems_allowed=0-1,oom_memcg=/test/child,task_memcg=/test/child,task=memhog,pid=748251,uid=1001
[1367090.319170] Memory cgroup out of memory: Killed process 748251 (memhog) total-vm:104736kB, anon-rss:101924kB, file-rss:1428kB, shmem-rss:0kB, UID:1001 pgtables:244kB oom_score_adj:0


查看 cgroup.events：

❯ cat memory.events.local
low 0
high 0
max 177
oom 21
oom_kill 21


#### 参考资料

[1] kmem: further deprecate kmem.limit_in_bytes: *[https://github.com/torvalds/linux/commit/58056f77502f3567b760c9a8fc8d2e9081515b2d](https://link.zhihu.com/?target=https%3A//github.com/torvalds/linux/commit/58056f77502f3567b760c9a8fc8d2e9081515b2d)*

[2] v5.16-rc1: *[https://github.com/torvalds/linux/releases/tag/v5.16-rc1](https://link.zhihu.com/?target=https%3A//github.com/torvalds/linux/releases/tag/v5.16-rc1)*

http://weixin.qq.com/r/oSm-pyvEMXZOrW-E93yz (二维码自动识别)
