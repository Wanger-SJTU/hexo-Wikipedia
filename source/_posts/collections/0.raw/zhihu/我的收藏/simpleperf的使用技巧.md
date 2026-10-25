---
title: "(2 条消息) simpleperf的使用技巧"
date: "2025-03-11 00:00:00"
updated: "2025-03-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/simpleperf的使用技巧/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/29449785427"
---


simpleperf工具处了在性能领域中，在日常中也会有很多调试用途，我们试着总结一下，不断总结应用场景。

### 1 使用simpleperf跟踪应用被杀和exit退出

#### 1.1 通过信号tracepoint跟踪

`simpleperf record -a -g -c 1 -e "signal:signal_generate" --tp-filter 'sig == 9' -o /data/perf.data` 

#### 1.2 跟踪全系统kill/exit调用

使用syscall `simpleperf record -a -g -c 1 -e "raw_syscalls:sys_enter" --tp-filter 'id == 94 || id == 93 || id == 424 || id == 129 || id == 130' -o /data/perf.data`

#include  /* For system call numbers. */
__NR_exit_group 94
__NR_exit 93 
__NR_pidfd_send_signal 424
__NR_kill 129
__NR_tgkill 130

查看记录： `report_sample.py --symfs ./binary_cache -i perf.data`

#### 1.3 跟踪某个应用闪退：如麦当劳应用闪退问题

`simpleperf record --app com.mcdo.mcdonalds -g -c 1 -e "raw_syscalls:sys_exit" --tp-filter 'id == 94 || id == 93 || id == 424 || id == 129 || id == 130' -o /data/perf.data` 

查看记录： `report_sample.py --symfs ./binary_cache -i perf.data`

### 2 使用uprobe跟踪库中某个函数的调用

Google最近在simpleperf中增加了对uprobe的支持。 [simpleperf: Add --uprobe option](https://link.zhihu.com/?target=https%3A//android-review.googlesource.com/c/platform/system/extras/%2B/3493713)

第一步：获取函数符号的地址，方法可以通过objdump或者unwind_info工具 我自己使用unwind_info(工具)

在手机上执行查看符号位置：
#### unwind_info /system/lib64/libc.so | grep "kill"
  PC 0x69e64-0x69e94 
  PC 0x6fcbc-0x6fd40 
  PC 0xbfea0-0xbfeb8 
  PC 0xbfec0-0xbfed8 

第二步：通过simpleperf设置uprobe 事件，如我们跟踪kill调用

`simpleperf record --app com.mcdo.mcdonalds -g -e "uprobes:myret" --uprobe 'p:myret /system/lib64/libc.so:0xbfea0' -o /data/perf.data` 

### 3 使用kprobe跟踪一些内核调用函数

<strong>例子1：跟踪文件打开</strong> 

`simpleperf record -a -g --duration 30 -e "kprobes:myprobe" --kprobe "p:myprobe do_sys_open" -o /data/local/tmp/perf.data`

<strong>例子2：可以增加更多条件过滤例子</strong>

`simpleperf record   -e "kprobes:myprobe" --kprobe "p:myprobe system_heap_do_allocate  len=%x1"  --tp-filter "len == 49942528"  --call-graph dwarf -a  -o /data/cam5.data`

### 4 跟踪binder调用过程

一个来自Google例子：Async binder txns to frozen apps

`/simpleperf record -a -g --exclude-perf -e binder:binder_return --tp-filter "cmd == 0x7212 || cmd == 0x7214"` 

`kBR_FROZEN_REPLY = 0x7212, kBR_TRANSACTION_PENDING_FROZEN = 0x7214`