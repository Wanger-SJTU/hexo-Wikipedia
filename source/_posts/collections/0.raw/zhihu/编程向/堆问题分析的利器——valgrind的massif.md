---
title: 堆问题分析的利器——valgrind的massif
date: "2024-07-22 00:00:00"
updated: "2024-07-22 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/堆问题分析的利器——valgrind的massif/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/682033366
---


﻿堆问题也是内存问题的一部分。如果我们发现程序内存一直在增加，怀疑是内存泄漏，则可以使用《内存问题分析的利器——valgrind的memcheck》一文中介绍的“内存泄露”方法去分析定位。当然我们还可以使用本文介绍的工具——massif。 以下代码为例

`#include 

```cpp
int main() {
    const int array_size = 32; 
    void* p = malloc(array_size);
    return 0;
}
```

`

我们要使用携带调试信息的方式编译代码，即加上编译参数-g。

`gcc -g -o test test.c`

然后使用massif进行分析

`valgrind --tool=massif ./test`

在当前目录下会生成名字格式为massif.out.的文件。 如果我们需要指定文件名，可以在上述命令中增加--massif-out-file参数。但是需要注意一点，该参数值最好包含%p——进程ID。因为如果不这么设置，则父进程和子进程的记录结果将都掺杂在一个文件中，这会对结果分析带来困扰。当然，如果不会产生子进程，则怎么设置都可以。 我并不打算使用ms_print工具去分析结果文件，因为分析的结果展现缺乏视觉冲击力。使用了ubuntu桌面版的massif-visualizer工具。其展现如下 ​

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_f9f1a203b093.jpg)

在这里插入图片描述 上图我们看到，堆空间随着时间增长而增大，而且最终停留在32B处。这和我们代码设计的泄漏堆上32byte是一致的。但是这个它并没有指出是代码的哪行导致了泄漏。 我们把代码修改下，让程序没有内存泄漏

`#include 

```cpp
int main() {
    const int array_size = 32; 
    void* p = malloc(array_size);
    free(p);
    return 0;
}
```

`

使用massif分析的结果是 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_7d01c109e5ef.jpg)

在这里插入图片描述 图中堆空间增长的空间变成的绿色，而且最右侧有个非常不起眼的区间——标识堆空间降到0。 在右侧Massif Data区块中，快照2可以展开，显示出32B是在test.c文件中第5行分配的。快照3则表示堆上空间全部释放。 通过上面简单的介绍，我们发现massif分析内存泄漏不是非常方便的。那么它的用途在哪儿呢。我们看个例子

`#include 

```cpp
void create_destory(unsigned int size) {
    void *p = malloc(size);
    free(p);
}

int main(void) {
    const int loop = 4;
    char* a[loop];
    unsigned int kilo = 1024;

    for (int i = 0; i  loop; i++) {
        const unsigned int create_destory_size = 100 * kilo;
        create_destory(create_destory_size);
    }

    return 0;
}
```

`

这段代码频繁申请和释放大块内存，这对程序的性能是有影响的。但是如果上面的代码隐藏在繁杂的业务代码中时，则难以通过阅读方式定位。 我们继续使用之前的命令产生结果文件，并使用massif-visualizer分析 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4ca7506f39c6.jpg)

在这里插入图片描述 这个图比较诡异，它只展现了快照2的堆使用变化。这是因为massif是定时获取快照的，如果获取的时间间隔比较大，则可能记录的信息不全。这个时候，我们可以指定--time-unit=B参数来解决这个问题。

`valgrind --tool=massif --time-unit=B ./test`

这样我们就可以记录每次堆变化情况了 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_6f007df85159.jpg)

在这里插入图片描述 如果我们发现自己的程序出现上图这样比较大幅度的堆空间变化，则需要好好排查和思考下是否可以优化下。 我们发现分析也只记录了快照2的详细信息，如果我们要记录每次堆变化的过程，则可以增加参数--detailed-freq=1 

`valgrind --tool=massif --time-unit=B --detailed-freq=1 ./test`

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_3698d9f40606.jpg)

在这里插入图片描述 为了更贴近真实场景，我们看个融合“堆分配”和“堆泄漏”的代码

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

这段代码，main函数中：  - 直接使用malloc申请4次10K的空间（22行），然后再4次释放它们（29行）。  - 调用create方法4次，每次申请但不释放10K空间。  - 调用create_destory方法4次，每次申请并释放100K空间。

分析结果是 

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_413b0abdae81.jpg)

在这里插入图片描述 图中比较大的波动是由于create_destory频繁申请释放堆导致的。 圆圈（1,2,3,4）可看出堆的使用在逐渐增减，圆圈5则显示最后堆泄漏了40K。 再看方框中信息。A中显示本次快照中，一共使用了160K的堆空间。其中130K是create方法申请的，30K是test.c第22行申请的。create方法申请的130K中，有100K是create_destory申请的，30K是test.c第19行调用的create申请的。 对比A和B，可以发现，create_destory方法没有发生内存没释放的问题，而test.c第19行调用的create和第22行调用的malloc的空间没有及时释放。 再看C，此时已经没有create_destory的记录了。说明它已经把账还清了。 对比C和D，可以发现test.c第22行已经释放了10K的空间，即第29行调用了free方法。这说明程序又开始还债了。 再看最后一个快照——24号，可以发现test.c第22行申请的空间已经释放干净。但是第19行调用的create方法申请的空间还是40K——没有释放过——发生了内存泄漏。 需要指出的是，massif是在进程结束时才能产生报告的。而服务程序一般都不会主动退出运行。于是我们在分析这类程序时，可以使用ctrl+C来终止valgrind运行并产生报告。这些报告只能反映该程序运行时的状态，而最终状态可能并不准确（比如程序在释放空间之间就被终止了，于是报告的最终状态是不确定的）。但是这并不妨碍我们通过运行时的堆信息变化来分析程序。
