---
title: 堆状态分析的利器——valgrind的DHAT
date: "2024-07-22 00:00:00"
updated: "2024-07-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/堆状态分析的利器——valgrind的DHAT/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682037394
---


﻿在《堆问题分析的利器——valgrind的massif》一文中，我们介绍了如何使用massif查看和分析堆分配/释放的问题。但是除了申请和释放，堆空间还有其他问题，比如堆空间的使用率、使用周期等。通过分析这些问题，我们可以对程序代码进行优化以提高性能。本文介绍的工具DHAT——dynamic heap analysis tool就是分析这些问题的利器。 不同于massif是在程序结束时产生报告，DHAT是在程序运行时实时输出信息的。 我们继续以《堆问题分析的利器——valgrind的massif》文中末尾的代码为例。

`#include 

```cpp
void* create(unsigned int size) {
    return malloc(size);
}

void create_destory(unsigned int size) {
    void *p = create(size);
    free(p);
}

int main(void) {
    const int loop = 4;
    char* a[loop];
    unsigned int kilo = 1024;

    for (int i = 0; i  loop; i++) {
        const unsigned int create_size = 10 * kilo;
        create(create_size);

        const unsigned int malloc_size = 10 * kilo;
        a[i] = malloc(malloc_size);

        const unsigned int create_destory_size = 100 * kilo;
        create_destory(create_destory_size);
    }

    for (int i = 0; i  loop; i++) {
        free(a[i]);
    }

    return 0;
}
```

`

第19行通过create方法申请了10K堆空间，一共申请了4次。整个代码周期它们都没释放，所以存在着内存泄漏。 第22行通过malloc方法申请了10K堆空间，一共申请了4次。在第29行，通过free方法释放了这些空间，没有造成内存泄漏。 第25行通过create_destory方法申请并使用了100K的空间，所以也没有内存泄漏。 我们使用下面指令分析编译后的结果。

`valgrind --tool=exp-dhat ./test`

得出的结果如下

`==9121== ======== ORDERED BY decreasing "max-bytes-live": top 10 allocators ========
==9121== 
==9121== -------------------- 1 of 10 --------------------
==9121== max-live:    102,400 in 1 blocks
==9121== tot-alloc:   409,600 in 4 blocks (avg size 102400.00)
==9121== deaths:      4, at avg age 35 (0.02% of prog lifetime)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x10870F: create (test.c:4)
==9121==    by 0x108726: create_destory (test.c:8)
==9121==    by 0x10882C: main (test.c:25)
==9121== 
==9121== -------------------- 2 of 10 --------------------
==9121== max-live:    40,960 in 4 blocks
==9121== tot-alloc:   40,960 in 4 blocks (avg size 10240.00)
==9121== deaths:      none (none of these blocks were freed)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x10870F: create (test.c:4)
==9121==    by 0x1087EE: main (test.c:19)
==9121== 
==9121== -------------------- 3 of 10 --------------------
==9121== max-live:    40,960 in 4 blocks
==9121== tot-alloc:   40,960 in 4 blocks (avg size 10240.00)
==9121== deaths:      4, at avg age 454 (0.32% of prog lifetime)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x108808: main (test.c:22)
==9121== 
==9121== 
==9121== 
==9121== ==============================================================`

第4到11行显示了create_destory方法导致堆变化的信息。 第4行意思是分配的最大一个区块大小是100K。 第5行意思是一共分配了4个区块，一共400K，平均每个区块100K。 第6行意思是释放了4次堆上空间，平均生命周期是35，占程序运行时间的0.02%。 第7行意思是这些区块被读写了0次，读写的空间也是0。 第8到11行是调用堆栈。 类似的我们可以解读14到20行（代码第19行的create）、23到28行（代码第22行的malloc）的信息。 我们注意下第16行信息，其意思是create方法申请的堆没有一次释放，所以释放的空间大小是0。这对我们动态分析程序执行比较有意义，可以借此检查相应代码是否发生了内存泄漏。 再注意下第6行和第25行，可以看到create_destory和main中直接malloc申请的堆的生命周期分别占比是0.02%和0.32%。这也是符合我们代码的设计的，因为create_destory方法申请的空间立即被释放掉了，所以它们的生命周期短点。而main中第22行malloc的空间存在一段时间之后才在第29行被释放掉，所以它们的生命周期长点。这个信息也非常有意义。因为一个函数申请的堆频繁被快速释放，其表现就是它们的生命周期变短，那么此时使用堆是否合适，或者说这种频繁释放堆空间的行为是否合适？ 最后我们注意下第7,17和26行，它们显示这些堆被读写的情况。这个信息也非常重要。因为通过读写情况可以分析出堆空间的特点，比如是读多还是写多，这在多线程编程下，可能可以优化堆中存储的结构或者管理这段堆的锁粒度。还可以通过读写情况分析出这个堆空间是否存在不被使用的情况，从而可以优化掉对应的代码。或者通过对堆数据写入的多少，来分析申请这么大的空间是否合适。 现在我们开始以观察到的现象来分析和优化代码。

### 频繁申请和释放堆

​现象如下

`==10111== -------------------- 1 of 10 --------------------
==10111== max-live:    1,024 in 1 blocks
==10111== tot-alloc:   4,096 in 4 blocks (avg size 1024.00)
==10111== deaths:      4, at avg age 170 (0.12% of prog lifetime)
==10111== acc-ratios:  0.00 rd, 1.06 wr  (0 b-read, 4,352 b-written)
==10111==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10111==    by 0x108703: main (test.c:8)`

这段信息显示：一共申请的4个堆空间生命周期只占比0.12%——非常低。被申请的空间只被写入，从来没被读取过。堆空间的使用率（当前只有写操作）也不高，只有1.06次写入（）。我们看下代码

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    for (int i = 0; i  loop_count; i++) {
        char* buf = malloc(kilo);
        memset(buf, 'a', kilo);
        free(buf);
    }

    return 0;
}
```

`

第8行申请的堆，在第9行被使用后，立即被第10行释放掉。频繁申请和释放堆会造成内存碎片等问题，所以一般我们都是希望堆的使用率是是比较高的。发现和定位问题后，我们可以做如下改动。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }
    free(buf);

    return 0;
}
```

`

得到如下分析结果

`==10119== max-live:    1,024 in 1 blocks
==10119== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10119== deaths:      1, at avg age 602 (0.43% of prog lifetime)
==10119== acc-ratios:  0.00 rd, 4.25 wr  (0 b-read, 4,352 b-written)
==10119==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10119==    by 0x1086FA: main (test.c:7)`

可以发现堆的生命周期提高到了0.43%，使用率提高到了4.25。

### 使用堆是否合理

上面例子也没必要使用堆，我们可以把其变成栈上空间，这样执行效率更高。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char buf[kilo];
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }

    return 0;
}
```

`

### 是否有没有使用的堆

没有使用的堆是指：堆空间被申请出来，但是没有对其进行过读写操作。我们看个现象

`==10309== -------------------- 1 of 10 --------------------
==10309== max-live:    1,024 in 1 blocks
==10309== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10309== deaths:      1, at avg age 664 (0.47% of prog lifetime)
==10309== acc-ratios:  0.00 rd, 4.25 wr  (0 b-read, 4,352 b-written)
==10309==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10309==    by 0x1086FA: main (test.c:7)
==10309== -------------------- 2 of 10 --------------------
==10309== max-live:    1,024 in 1 blocks
==10309== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10309== deaths:      1, at avg age 602 (0.43% of prog lifetime)
==10309== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==10309==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10309==    by 0x108709: main (test.c:8)`

第5行显示这个堆被写入过，第12行显示这个堆从来没有被读写过。这样我们就需要怀疑test.c的第8行申请的空间是否必要。看下代码，可以发现这个堆的确没必要申请。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    char* unused = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }
    free(unused);
    free(buf);

    return 0;
}
```

`

### 申请的大小是否合理

有时候，我们并不是那么节约。比如一个只需要1K的空间，我们可能申请了10K。但是这个单纯的靠梳理代码可能比较难以发现。我们看个分析结果

`==10571== -------------------- 1 of 10 --------------------
==10571== max-live:    1,024 in 1 blocks
==10571== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10571== deaths:      1, at avg age 134 (0.09% of prog lifetime)
==10571== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 8 b-written)
==10571==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10571==    by 0x1086AA: main (test.c:7)
==10571== 
==10571== Aggregated access counts by offset:
==10571== 
==10571== [   0]  1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 
==10571== [  16]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 
==10571== [  32]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 
==10571== [  48]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0`

从第9行开始，显示的是该堆每个字节被访问的次数。我们看到只有前8个字节被访问了1次。但是剩余的其他字节都没有被访问过。于是我们看下代码

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 8;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        buf[i] = 'a' + i;
    }
    free(buf);

    return 0;
}
```

`

可以看到，第8到10行的确只操作了前8个字节。所以我们没必要申请1K的空间。﻿在《堆问题分析的利器——valgrind的massif》一文中，我们介绍了如何使用massif查看和分析堆分配/释放的问题。但是除了申请和释放，堆空间还有其他问题，比如堆空间的使用率、使用周期等。通过分析这些问题，我们可以对程序代码进行优化以提高性能。本文介绍的工具DHAT——dynamic heap analysis tool就是分析这些问题的利器。 不同于massif是在程序结束时产生报告，DHAT是在程序运行时实时输出信息的。 我们继续以《堆问题分析的利器——valgrind的massif》文中末尾的代码为例。

`#include 

```cpp
void* create(unsigned int size) {
    return malloc(size);
}

void create_destory(unsigned int size) {
    void *p = create(size);
    free(p);
}

int main(void) {
    const int loop = 4;
    char* a[loop];
    unsigned int kilo = 1024;

    for (int i = 0; i  loop; i++) {
        const unsigned int create_size = 10 * kilo;
        create(create_size);

        const unsigned int malloc_size = 10 * kilo;
        a[i] = malloc(malloc_size);

        const unsigned int create_destory_size = 100 * kilo;
        create_destory(create_destory_size);
    }

    for (int i = 0; i  loop; i++) {
        free(a[i]);
    }

    return 0;
}
```

`

第19行通过create方法申请了10K堆空间，一共申请了4次。整个代码周期它们都没释放，所以存在着内存泄漏。 第22行通过malloc方法申请了10K堆空间，一共申请了4次。在第29行，通过free方法释放了这些空间，没有造成内存泄漏。 第25行通过create_destory方法申请并使用了100K的空间，所以也没有内存泄漏。 我们使用下面指令分析编译后的结果。

`valgrind --tool=exp-dhat ./test`

得出的结果如下

`==9121== ======== ORDERED BY decreasing "max-bytes-live": top 10 allocators ========
==9121== 
==9121== -------------------- 1 of 10 --------------------
==9121== max-live:    102,400 in 1 blocks
==9121== tot-alloc:   409,600 in 4 blocks (avg size 102400.00)
==9121== deaths:      4, at avg age 35 (0.02% of prog lifetime)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x10870F: create (test.c:4)
==9121==    by 0x108726: create_destory (test.c:8)
==9121==    by 0x10882C: main (test.c:25)
==9121== 
==9121== -------------------- 2 of 10 --------------------
==9121== max-live:    40,960 in 4 blocks
==9121== tot-alloc:   40,960 in 4 blocks (avg size 10240.00)
==9121== deaths:      none (none of these blocks were freed)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x10870F: create (test.c:4)
==9121==    by 0x1087EE: main (test.c:19)
==9121== 
==9121== -------------------- 3 of 10 --------------------
==9121== max-live:    40,960 in 4 blocks
==9121== tot-alloc:   40,960 in 4 blocks (avg size 10240.00)
==9121== deaths:      4, at avg age 454 (0.32% of prog lifetime)
==9121== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==9121==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==9121==    by 0x108808: main (test.c:22)
==9121== 
==9121== 
==9121== 
==9121== ==============================================================`

第4到11行显示了create_destory方法导致堆变化的信息。 第4行意思是分配的最大一个区块大小是100K。 第5行意思是一共分配了4个区块，一共400K，平均每个区块100K。 第6行意思是释放了4次堆上空间，平均生命周期是35，占程序运行时间的0.02%。 第7行意思是这些区块被读写了0次，读写的空间也是0。 第8到11行是调用堆栈。 类似的我们可以解读14到20行（代码第19行的create）、23到28行（代码第22行的malloc）的信息。 我们注意下第16行信息，其意思是create方法申请的堆没有一次释放，所以释放的空间大小是0。这对我们动态分析程序执行比较有意义，可以借此检查相应代码是否发生了内存泄漏。 再注意下第6行和第25行，可以看到create_destory和main中直接malloc申请的堆的生命周期分别占比是0.02%和0.32%。这也是符合我们代码的设计的，因为create_destory方法申请的空间立即被释放掉了，所以它们的生命周期短点。而main中第22行malloc的空间存在一段时间之后才在第29行被释放掉，所以它们的生命周期长点。这个信息也非常有意义。因为一个函数申请的堆频繁被快速释放，其表现就是它们的生命周期变短，那么此时使用堆是否合适，或者说这种频繁释放堆空间的行为是否合适？ 最后我们注意下第7,17和26行，它们显示这些堆被读写的情况。这个信息也非常重要。因为通过读写情况可以分析出堆空间的特点，比如是读多还是写多，这在多线程编程下，可能可以优化堆中存储的结构或者管理这段堆的锁粒度。还可以通过读写情况分析出这个堆空间是否存在不被使用的情况，从而可以优化掉对应的代码。或者通过对堆数据写入的多少，来分析申请这么大的空间是否合适。 现在我们开始以观察到的现象来分析和优化代码。

### 频繁申请和释放堆

​现象如下

`==10111== -------------------- 1 of 10 --------------------
==10111== max-live:    1,024 in 1 blocks
==10111== tot-alloc:   4,096 in 4 blocks (avg size 1024.00)
==10111== deaths:      4, at avg age 170 (0.12% of prog lifetime)
==10111== acc-ratios:  0.00 rd, 1.06 wr  (0 b-read, 4,352 b-written)
==10111==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10111==    by 0x108703: main (test.c:8)`

这段信息显示：一共申请的4个堆空间生命周期只占比0.12%——非常低。被申请的空间只被写入，从来没被读取过。堆空间的使用率（当前只有写操作）也不高，只有1.06次写入（）。我们看下代码

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    for (int i = 0; i  loop_count; i++) {
        char* buf = malloc(kilo);
        memset(buf, 'a', kilo);
        free(buf);
    }

    return 0;
}
```

`

第8行申请的堆，在第9行被使用后，立即被第10行释放掉。频繁申请和释放堆会造成内存碎片等问题，所以一般我们都是希望堆的使用率是是比较高的。发现和定位问题后，我们可以做如下改动。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }
    free(buf);

    return 0;
}
```

`

得到如下分析结果

`==10119== max-live:    1,024 in 1 blocks
==10119== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10119== deaths:      1, at avg age 602 (0.43% of prog lifetime)
==10119== acc-ratios:  0.00 rd, 4.25 wr  (0 b-read, 4,352 b-written)
==10119==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10119==    by 0x1086FA: main (test.c:7)`

可以发现堆的生命周期提高到了0.43%，使用率提高到了4.25。

### 使用堆是否合理

上面例子也没必要使用堆，我们可以把其变成栈上空间，这样执行效率更高。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char buf[kilo];
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }

    return 0;
}
```

`

### 是否有没有使用的堆

没有使用的堆是指：堆空间被申请出来，但是没有对其进行过读写操作。我们看个现象

`==10309== -------------------- 1 of 10 --------------------
==10309== max-live:    1,024 in 1 blocks
==10309== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10309== deaths:      1, at avg age 664 (0.47% of prog lifetime)
==10309== acc-ratios:  0.00 rd, 4.25 wr  (0 b-read, 4,352 b-written)
==10309==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10309==    by 0x1086FA: main (test.c:7)
==10309== -------------------- 2 of 10 --------------------
==10309== max-live:    1,024 in 1 blocks
==10309== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10309== deaths:      1, at avg age 602 (0.43% of prog lifetime)
==10309== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 0 b-written)
==10309==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10309==    by 0x108709: main (test.c:8)`

第5行显示这个堆被写入过，第12行显示这个堆从来没有被读写过。这样我们就需要怀疑test.c的第8行申请的空间是否必要。看下代码，可以发现这个堆的确没必要申请。

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 4;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    char* unused = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        memset(buf, 'a', kilo);
    }
    free(unused);
    free(buf);

    return 0;
}
```

`

### 申请的大小是否合理

有时候，我们并不是那么节约。比如一个只需要1K的空间，我们可能申请了10K。但是这个单纯的靠梳理代码可能比较难以发现。我们看个分析结果

`==10571== -------------------- 1 of 10 --------------------
==10571== max-live:    1,024 in 1 blocks
==10571== tot-alloc:   1,024 in 1 blocks (avg size 1024.00)
==10571== deaths:      1, at avg age 134 (0.09% of prog lifetime)
==10571== acc-ratios:  0.00 rd, 0.00 wr  (0 b-read, 8 b-written)
==10571==    at 0x4C2DECF: malloc (in /usr/lib/valgrind/vgpreload_exp-dhat-amd64-linux.so)
==10571==    by 0x1086AA: main (test.c:7)
==10571== 
==10571== Aggregated access counts by offset:
==10571== 
==10571== [   0]  1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 
==10571== [  16]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 
==10571== [  32]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 
==10571== [  48]  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0`

从第9行开始，显示的是该堆每个字节被访问的次数。我们看到只有前8个字节被访问了1次。但是剩余的其他字节都没有被访问过。于是我们看下代码

`#include 

```cpp
#include 

int main(void) {
    const int loop_count = 8;
    const unsigned int kilo = 1024;
    char* buf = malloc(kilo);
    for (int i = 0; i  loop_count; i++) {
        buf[i] = 'a' + i;
    }
    free(buf);

    return 0;
}
```

`

可以看到，第8到10行的确只操作了前8个字节。所以我们没必要申请1K的空间。
