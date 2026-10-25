---
title: "(1 条消息) 无锁编程——从CPU缓存一致性讲到内存模型"
date: "2023-08-18 00:00:00"
updated: "2023-08-18 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/无锁编程——从CPU缓存一致性讲到内存模型/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/642416997"
---


### 引言

缓存是一个非常常用的工程优化手段，其核心在于提升数据访问的效率。缓存思想基于局部性原理，这个原理包括时间局部性和空间局部性两部分：

- <strong>时间局部性</strong>：指程序在访问某个数据时，通常会在不久的将来再次访问该数据。例如，一个循环结构中，程序会反复访问数组中的某个元素，这就是时间局部性的体现；
- <strong>空间局部性</strong>：指程序在访问某个数据时，通常会访问该数据所在的一段连续内存。例如，一个数组中相邻的元素通常会被一起访问，这就是空间局部性的体现。
缓存思想的使用无处不在，例如：

- 为了解避免数据库访问压力过大以及数据读写速度限制，采用Redis进行热点数据缓存；
- 为了提高文件的加载速度，程序设计时将需要频繁访问的文件数据缓存在内存中；
- 为了提高文件传输效率，使用Buffered IO 或者 Memory-Mapped I/O进行文件访问时，操作系统会将文件缓存在磁盘高速缓存中；
- 为了提高磁盘数据的访问速度，操作系统会将最近访问的磁盘页缓存在内存中，并通过页面置换算法实现页面置换；
- 为了提高内存数据的访问速度，操作系统会将最近访问的内存数据缓存在CPU缓存中。
可以看出，缓存的目的是将数据存储到访问速度较快的存储设备中，来解决访问速度与硬件设备不匹配的问题，提高数据访问的速度和效率。

<strong>但是缓存的引入往往伴随着数据一致性的问题</strong>，由于现代计算机中的 CPU 缓存、多核 CPU、多线程等因素，使得程序中不同线程之间可能会出现数据不一致的情况，导致数据竞态问题。

本文将从CPU的缓存架构以及缓存一致性问题入手，进而讲解如何利用内存模型保证不同线程之间数据访问的<strong>有序性、可见性和一致性</strong>，如何在软件层面上解决 CPU 缓存一致性问题。

本文的行文思路如下：

- CPU缓存
- 缓存一致性（MESI）
- Store Buffer和Invalidate Queue
- c++11内存模型
- 内存模型的使用

### CPU缓存

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7ac2cdca3b6e.jpg)

CPU缓存架构CPU的缓存结构如上图所示，通常分为3级缓存，其中L1、L2为每个CPU独有的，L3是多个CPU共享的，层级越高的缓存价格越贵，容量越小，访问速度越快。CPU访问数据时会依次访问寄存器、L1缓存、L2缓存、L3缓存、内存，其中CPU缓存由多个Cache Line组成，每个Cache Line由状态位、组标记、高速缓存块（2的幂次方大小）组成。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9a5c09538cfa.jpg)

cache line结构

- <strong>状态位</strong>：标记该Cache Line中数据状态，每个缓存数据有<strong>已修改、独占、共享、已失效</strong>四种状态，更具体将在下一小节讨论。
- <strong>组标记</strong>：为了区分映射到同一个缓存行中不同的内存块，更详细的讨论需要理解主存与缓存的地址映射关系，这里主要介绍直接映射和组相连映射两种映射方法，

- <strong>直接映射</strong>：直接映射中主存块按照缓存行数进行分组，如下图所示，缓存中有4个缓存行，因此每4个内存块划分为一组，每个组有自己的组号，每个组内的内存块有自己的块号，于是每一个主存地址由<strong>组号、组内块号（组索引）、块内偏移量</strong>三部分信息唯一标识。内存块按照<strong>组内块号取模</strong>映射到对应的缓存行，映射关系如下图箭头所示，因此在进行缓存数据访问时可以通过内存地址的组内块号直接映射到对应的缓存行。<strong>不同的内存块可能会映射到同一缓存行中，同一组的内存块不会映射到同一个缓存行</strong>，因此可以通过组号判断当前缓存行中数据是否为想要访问的数据，如果是的话则根据块偏移量获取缓存行数据中对应的字，否则从内存中读取。可见数据的缓存地址可以由组内块号（组索引）和块内偏移量唯一标识。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f58edf3e1f2.jpg)

直接映射

- <strong>组相连映射</strong>：直接映射中每个内存块固定只能映射到一个缓存行中，块冲突概率高，为了缓解块冲突问题而产生了组相连映射。组相连映射中将缓存行和内存块都进行了分组，主存中每个组的内存块数与缓存行的分组数相同。同直接映射一样，主存地址可由<strong>组号、组内块号、块内偏移量</strong>三部分信息唯一标识。如下图所示，缓存行分成了两组（按颜色分组），于是每两个内存块分为一组（B0B1、B2B3...)，内存组中的各内存块分别映射到某个缓存组中，最终可映射到缓存组内的任意缓存行中，即<strong>内存块映射到哪个缓存组仍然是固定的，但是映射到缓存组内哪个缓存行是任意的</strong>，如B0可以映射到缓存行1或缓存行2，B1可以映射到缓存行3或缓存行4，如下图内存块映射到相同颜色的缓存行。同直接映射一样，<strong>组相连映射中不同组的内存块可能会映射到同一缓存行中，同一组的内存块不会映射到同一个缓存组</strong>，这样避免了内存块只能映射到固定的缓存行的同时又具备一定的索引能力，在进行缓存数据访问时可以通过内存地址的<strong>组内块号</strong>直接映射到对应的<strong>缓存组</strong>，再遍历缓存组内的所有缓存行进行组号比对。如果命中缓存行则根据块偏移量获取缓存行数据中对应的字，否则从内存中读取。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fe33615b13b4.jpg)

组相连映射

- <strong>高速缓存块</strong>：缓存了内存块数据的副本，缓存命中后根据偏移量获取缓存块中对应的字。

### 缓存一致性

#### 不一致问题探讨

<strong>缓存策略总是伴随着数据一致性的问题，通俗的讲是不同存储节点中同一条数据副本之间不一致的问题</strong>。CPU Cache的存在导致多核CPU中缓存数据与内存数据之间可能存在不一致的情况。

首先思考单核CPU下，何时将缓存数据的修改同步至内存中，使得缓存与内存数据一致？

- <strong>写直达</strong>：CPU每次访问修改数据时，无论数据在不在缓存中，都将修改后的数据同步到内存中，缓存数据与内存数据保持<strong>强一致性</strong>，这种做法影响写操作的性能。
- <strong>写回</strong>：为了避免每次写操作都要进行数据同步带来的性能损失，写回策略里发生读写操作时：

- 如果缓存行中命中了数据，写操作对缓存行中数据进行更新，并标记该缓存行为已修改。
- 如果缓存中未命中数据，且数据所对应的缓存行中存放了其他数据：

- <strong>若该缓存行被标记为已修改</strong>，读写操作都会将缓存行中现存的数据<strong>写回</strong>内存中，再将当前要获取的数据从内存读到缓存行，写操作对数据进行更新后标记该缓存行为已修改；
- <strong>若该缓存行未被标记为已修改</strong>，读写操作都直接将当前要获取的数据从内存读到缓存行。写操作对数据进行更新后标记该缓存行为已修改。

<strong>相比写直达时缓存与内存数据实时同步，写回策略中对数据的修改需要等待下一次缓存行置换时才能够写回内存（最终一致性）</strong>，在多核CPU下，写回策略可能导致多个CPU内缓存数据不一致的问题。很直接的一个场景，CPU1修改了数据A，因为写回策略该修改没有及时同步到内存中，同时CPU2从内存中读取数据A，此时CPU1和CPU2中A数据的值就不一致了。为了解决多CPU缓存不一致的问题，应当保证：

- CPU进行缓存数据更新时需要告知其他CPU，即<strong>写传播。</strong>
- 多个CPU对同一数据的修改顺序在其他CPU看来是一致的，即事务串行化。举个例子：CPU1、CPU2同时修改了数据A，CPU1把修改数据广播给CPU2、CPU3、CPU4，CPU2将修改数据广播给了CPU1、CPU3、CPU4，如果CPU3先接收到了CPU1的修改后接收到了CPU2的修改，而CPU4的接收顺序与3相反，此时3、4中A数据的值就可能不一致了，CPU1、CPU2互相接收对方的修改数据也会导致数据不一致的情况。上述问题出现在同一数据并行修改的情况下，为了避免上述问题，对同一数据的修改应当保证<strong>串行化</strong>。

#### 写传播：总线嗅探

上文说到CPU进行数据更新时需要广播给其他CPU，CPU之间是通过总线接收和发送信息的。在这个机制下，CPU需要将每个修改动作都通过总线进行广播，并实时监听总线上的消息，这并不高效。而且总线嗅探无法保证事务的串行化，为了解决上述问题，缓存一致性协议（MESI）产生了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bfe9dbc3c793.jpg)

总线嗅探
#### 串行化：MESI协议

MESI首先规定了缓存行的四种状态：

- *Modified*，已修改
- *Exclusive*，独占
- *Shared*，共享
- *Invalidated*，已失效
各状态之间的流转可由下表描述：

*表注释：当前状态列表示缓存行的状态，事件列中Local Read / Local Write代表本地CPU的读写行为，Remote Read / Remote Write代表其他CPU的读写行为，状态流转规则描述了事件发生后缓存行状态将如何变化。*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d0cf36cb1997.jpg)

MESI状态流转规则
### Store Buffer和Invalidate Queue

上文对CPU缓存一致性问题进行了探讨，并引出了基于总线嗅探的MESI协议以保证了多CPU下的缓存一致性，MESI足够严谨，那为什么还需要在程序层面保证可见性和有序性呢。如果CPU之间严格遵循MESI协议，当然程序层面就无需额外的可见性、有序性保证了，但是严格遵循MESI的话，一个变量在多个CPU中共享时，每次写操作都要先发一个 invalidate 消息广播，再等其他 CPU 将缓存行设置为无效后返回 invalidate ack 才能进行缓存数据修改，这对写操作性能不够友好。于是<strong>为了提高CPU性能，引入了Store Buffer和Invalidate Queue。</strong>

#### Store Buffer

为了优化写操作性能，在CPU和Cache之间引入了store buffer，写操作时无需立即向其他CPU发送 invalidate 消息，而是先写入store buffer中，然后立刻返回执行其他操作，由 <strong>store buffer 异步执行发送广播消息</strong>，等到接收到其他cpu的响应后再将数据从store buffer移到cache line。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3a2219cac6d.jpg)

store buffer由于引入了store buffer，<strong>CPU对数据A进行写操作后会在store buffer中存有修改后A的数据，此时CPU的cache line和store buffer中将存在两份A的数据备份</strong>，一份修改前，一份修改后的，如果后续逻辑使用到了数据A，应当访问cache line还是store buffer中的数据呢，显然应当访问最新值，这种访问方式即为"<strong>store Forwarding</strong>"，具体可以描述为在数据访问时先去storebuffer中查找，如果查到就使用storebuffer中的最新值，否则访问cache line中的数据。

#### Invalidate Queue

上文说到利用store buffer，每次CPU写操作都无需发送invalidate消息并等待invalidate ack，而是将invalidate消息存储在store buffer中异步发送，提高了写性。但是store buffer容量是有限的，如果store buffer发送invalidate消息后，接收到消息的CPU处于忙碌状态无法及时响应消息，store buffer中消息可能不断堆积而导致溢出。为了解决上述问题，需要接收消息的CPU能尽可能及时的进行消息响应，为此引入了Inavladate Queue，CPU接收到invalidate消息后会存储在Inavladate Queue中并立即响应invalidate ack，之后<strong>Inavladate Queue再异步的执行缓存行失效操作。</strong>可见<strong>store buffer相当于CPU消息中的发送缓冲区，invalidate queue则相当于接收缓冲区</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0b209c84d02f.jpg)

invalidate queue
#### 顺序性与缓存一致性

store buffer和invalidate queue的引入提高了CPU的执行效率，每次的写操作会先将数据写入store buffer，然后再由 store buffer执行异步的操作，那么从store buffer发送invalidate广播到invalidate queue让缓存行失效前会存在各CPU缓存不一致的现象，使得MESI的强一致性被破坏。

```cpp
//共享变量
int a, b, c = 0;

//CPU1中执行代码
void CPU1() {
    a = 1;  //1
    b = a;  //2
    c = 1;  //3
}

//CPU2中执行代码
void CPU2() {
    while(c == 0) continue; //4
    assert(b == 1); //5
}
```


在上面代码中，我们期望的结果是CPU2中"b == 1"条件成立，但是由于以下三个原因可能导致这个条件不成立。

- <strong>指令乱序</strong>
现代CPU中采用多级流水线技术进行指令执行，一条指令的执行过程可被分成4个阶段：<strong>取指令、指令译码、指令执行、数据写回</strong>，CPU一个时钟周期了可以同时执行多条指令的不同阶段，为了使得指令流水线的工作效率更高，期望CPU尽可能的满负荷工作，即一个时钟周期里完成尽可能多的阶段任务，提高指令执行的并行度，为此CPU可能会将指令执行顺序进行重排，同时要避免具有依赖关系的指令被重排，重排前后指令能够保证在单CPU中的执行结果是一致的，但只能保证单CPU下数据的读写以及数据之间的依赖关系，无法保证多CPU下指令重排带来的影响。

指令重排可能发生在编译器优化阶段或者CPU指令执行阶段，回归到上述代码中，语句1、2存在依赖关系不能够被重排，语句3没有依赖，可能被优化至语句2之前执行，这样就可能导致CPU1、CPU2中语句执行顺序变为1、3、4、5、2，这种执行顺序下"b == 1"条件将无法成立。

2.<strong>store buffer使得缓存不一致</strong>

假设变量c在CPU1中存在缓存，且状态为M（已修改），根据MESI协议，<strong>当缓存行状态为M时本地读写可以直接执行，无需向其他CPU发送invalidate消息</strong>，而由于CPU1中没有a、b缓存，对他们的修改将首先写入store buffer中，再由store buffer异步发送invalidate消息，由于store buffer的异步操作，使得c的修改可能较a、b更早的刷进内存中，此时CPU2访问c时获取到的值为1，访问b时取到的仍然是0，这种情况下"b == 1"条件也无法成立。

3.<strong>invaliadate queue使得缓存不一致</strong>

同store buffer引起的缓存不一致原理一致，即使store buffer发送了invalidate消息，invaliadate queue接收到消息后会进行消息存储然后异步进行缓存行失效操作，因此即使语句执行顺序为1、2、3、4、5，语句3执行完成后CPU2中的<strong>b缓存行也可能并没有被置为失效状态</strong>，CPU2执行语句5时<strong>因为缓存行没有失效于是不从内存中获取新值，认为b的值仍然为0</strong>，这种情况下"b == 1"条件也无法成立。

#### 内存屏障

为了解决上述指令重排以及store buffer和invalidate queue的引入带来的顺序性和缓存一致性问题，引入了内存屏障。

<strong>写屏障</strong>

写屏障的作用是防止指令重排，并且屏障前的修改对于其他CPU是可见的，通俗点讲是能够保证写屏障之前的指令不会被重排到写屏障之后，并且执行到写屏障时，屏障前的修改能够及时刷新至缓存中，使得其他CPU访问时能够访问到最新值。

如下面代码，语句2、3之间插入了写屏障，语句3无法被重排至语句2之前，同时当执行到写屏障时，语句1、2的修改将从store buffer中刷进缓存最后同步到内存中，写屏障的存在解决了CPU指令乱序执行和 store buffer 异步写导致的数据本地更新顺序与代码顺序不一致的问题。

```cpp
//共享变量
int a, b, c = 0;

//CPU1中执行代码
void CPU1() {
    a = 1;  //1
    b = a;  //2
    smp_wb(); //写屏障
    c = 1;  //3
}

//CPU2中执行代码
void CPU2() {
    while(c == 0) continue; //4
    assert(b == 1); //5
}
```


<strong>读屏障</strong>

同写屏障，读屏障能够防止屏障后的指令重排到屏障前，并且执行到读屏障时invalidate queue中的失效消息能够全部被处理完。如下面代码，执行到读屏障时确保CPU2中b缓存行的失效信息被处理，因此执行语句5时由于b的缓存行已失效，将从内存中读取b的最新值，此时"b == 1"条件成立。

```cpp
//共享变量
int a, b, c = 0;

//CPU1中执行代码
void CPU1() {
    a = 1;  //1
    b = a;  //2
    smp_wb(); //写屏障
    c = 1;  //3
}

//CPU2中执行代码
void CPU2() {
    while(c == 0) continue; //4
    smp_rb(); //读屏障
    assert(b == 1); //5
}
```


### 内存模型

前文中我们了解了CPU的缓存架构以及基于MESI协议的缓存一致性方案，接着我们讨论了基于store buffer和invalidate queue对MESI协议的性能优化，以及这些优化带来的顺序性与一致性问题，于是又引入了读写屏障的概念，其中写屏障用于将store buffer中数据刷进缓存并同步至内存，读屏障用于将invaliadate queue中的失效消息及时处理。但读写屏障太贴近与硬件层面，让程序设计需要关注到处理器的实现、指令执行的细节，为了避免程序设计中对底层细节的过多关注，诞生了内存模型（Memory Model）的概念。

<strong>内存模型是一种抽象的概念，用于描述程序中不同线程之间对内存操作的可见性和顺序</strong>。它规定了存储器访问的行为，从而帮助程序员编写正确的多线程代码。内存模型屏蔽了硬件层面的不同，针对不同的编程语言或编程平台的制定了统一的规范和标准。

#### 关系术语

关系术语描述了操作之间的内存访问的顺序和规则，有以下几种：

- <strong>sequenced-before</strong>：描述了单线程中两个操作的顺序关系，一个线程中若操作A sequenced-before 操作B，则A的修改对B可见
- <strong>synchronizes-with</strong>：描述了多线程下两个操作的顺序关系，若线程1的操作A  synchronizes-with 线程2的操作B，则A的修改对B可见，常见的利用锁等同步措施能够实现synchronizes-with关系
- <strong>happends-before</strong>: 单线程中操作A happends-before 操作B，则A的修改对B可见（A sequenced-before B），在多线程中线程1的操作A  happends-before 线程2的操作B，则A的修改对B可见（A  synchronizes-with B）

#### memory order

C++11中引入了6种内存序：

```text
typedef enum memory_order {
```

memory_order_relaxed,
memory_order_consume,
memory_order_acquire,
memory_order_release,
memory_order_acq_rel,
memory_order_seq_cst
} memory_order;

从<strong>读写角度</strong>可以划分为：

读操作 (load)memory_order_relaxed、memory_order_acquire、memory_order_consume、memory_order_seq_cst写操作 (store)memory_order_relaxed、 memory_order_release、memory_order_seq_cst读-修改-写（test_and_set、exchange、compare_exchange_strong、compare_excahnge_weak、fetch_add、fetch_sub...)memory_order_relaxed、memory_order_acq_rel、memory_order_seq_cst从<strong>访问控制的角度</strong>可以分为以下三种：

- Sequential consistency模型(memory_order_seq_cst)
- Relax模型(memory_order_relaxed)
- Acquire-Release模型(memory_order_consume memory_order_acquire memory_order_release memory_order_acq_rel)
其中Sequential consistency模型对访问顺序的约束力最强，Acquire-Release模型次之，Relax模型最弱。

<strong>Sequential consistency模型</strong>

Sequential consistency模型即顺序一致性模型，在这个模型下所有的内存操作都必须按照某个全局顺序执行，即程序中所有线程看到的操作顺序都是一致的。具体来说，每个线程的操作序列都必须满足以下规则：

- 在一个线程的操作序列中，所有的内存操作必须按照程序中的顺序执行，即不允许指令重排
- 在不同线程的操作序列中，如果一个操作A happens-before 另一个操作B，则操作A的结果对于B是可见的（具有synchronized-with关系)。
- 如果一个操作A没有 happens-before 另一个操作B，并且它们访问了同一个内存位置，那么它们之间的执行顺序是未定义的。这种情况下，可能会发生数据竞争和未定义行为。
以下面代码为例，结合上述规则你可以先分析一下z最后的值可能是多少。

```cpp
#include 
#include 
#include 

std::atomicint> x(0), y(0), z(0);
std::atomicbool> go(false);

void write_x() {
    x.store(1, std::memory_order_seq_cst); //L1
    std::cout  "write_x done"  std::endl;
    go.store(true, std::memory_order_seq_cst); //L2
}

void write_y() {
    while (!go.load(std::memory_order_seq_cst)) { //L3
        std::this_thread::yield();
    }
    y.store(1, std::memory_order_seq_cst); //L4
    std::cout  "write_y done"  std::endl;
}

void read_x_then_y() {
    while (!go.load(std::memory_order_seq_cst)) { //L5
        std::this_thread::yield();
    }
    int r1 = x.load(std::memory_order_seq_cst); //L6
    int r2 = y.load(std::memory_order_seq_cst); //L7
    if (r1 == 1 && r2 == 1) { 
        z.store(1, std::memory_order_seq_cst); //L8
    }
    std::cout  "read_x_then_y done"  std::endl;
}

void read_y_then_x() {
    while (!go.load(std::memory_order_seq_cst)) { //L9
        std::this_thread::yield();
    }
    int r1 = y.load(std::memory_order_seq_cst); //L10
    int r2 = x.load(std::memory_order_seq_cst); //L11
    if (r1 == 1 && r2 == 0) {
        z.store(2, std::memory_order_seq_cst); //L12
    }
    std::cout  "read_y_then_x done"  std::endl;
}

int main() {
    std::thread t1(write_x);
    std::thread t2(write_y);
    std::thread t3(read_x_then_y);
    std::thread t4(read_y_then_x);
    t1.join();
    t2.join();
    t3.join();
    t4.join();
    std::cout  "z = "  z.load(std::memory_order_seq_cst)  std::endl;
    return 0;
}
```


上述例子中z的值可能为0或1。根据前文规则1可知任意线程中内存操作与程序顺序一致，根据规则2，由于L3、L5、L9的存在，使得其后续语句肯定happens-after语句L1、L2，因此获取到的x值肯定为1，又根据规则3，L4、L7、L10之间不存在happens-before关系，因此获取到的y值可能为1也可能为0。综上，L12语句肯定无法执行，L8语句可能会执行。

Sequential consistency模型是一种比较强的内存模型，因为它要求所有的内存操作都必须按照全局顺序执行，从而保证了不同线程之间的内存访问顺序和可见性。但是，这也使得程序的并发性能较差，因为它限制了线程之间的并发度。

<strong>Relax模型</strong>

Relax内存序是最宽松的内存序，他具有如下特性：

- 对于单个原子变量的修改，仍然能够保证线程间的顺序性。直白的表述为多线程对原子变量进行<strong>修改操作</strong>时能够看到彼此的修改结果，不会出现修改覆盖的问题，但若一个线程写一个线程读，可见性就无法保证了
- 同一线程同一原子变量的操作不允许被重排，但是<strong>不同的变量的操作可能会被重新排序</strong>
- 无法实现 synchronizes-with 的关系
根据特性1，可以利用relax实现计数器，下列代码中没有任何其他的同步要求，只需要保证多线程下的原子变量修改是安全有序的。

```cpp
#include 
#include 
#include 

std::atomicint> x(0);

void increase() {
    for (int i = 0; i  100000; ++i) {
        x.fetch_add(1, std::memory_order_relaxed);
    }
}

int main() {
    std::thread t1(increase);
    std::thread t2(increase);
    t1.join();
    t2.join();
    std::cout  "x = "  x  std::endl;
    return 0;
}
```


再看下下面这段代码，由于无法保证不同数据读写操作的顺序执行，下面代码的执行顺序可能为L1 L2 L3 L4或者L2 L3 L4 L1等，L2 L3 L4的顺序始终一致，但L1、L2的顺序无法被保证，因为他们作用于不同变量。即使代码执行顺序为L1 L2 L3 L4，也无法保证L1的修改对L4可见，因为Relax模型无法实现synchronizes-with关系，不保证可见性（理论上）。

```cpp
#include 
#include 
#include 

std::atomicint> x(0), y(0);

void thread1() {
    x.store(1, std::memory_order_relaxed); //L1
    y.store(2, std::memory_order_relaxed); //L2
}

void thread2() {
    while (y.load(std::memory_order_relaxed) != 2); //L3
    std::cout  "x = "  x.load(std::memory_order_relaxed)  std::endl; //L4
}

int main() {
    std::thread t1(thread1);
    std::thread t2(thread2);
    t1.join();
    t2.join();
    return 0;
}
```


<strong>Acquire-Release模型</strong>

Acquire-Release模型的强度介于前面两者之间，相较于relax模型限制了指令重排并具有跨线程可见性，同时又不至于像Sequential consistency模型严格限制指令重排，它具有如下特性：

- Acquire-Release模型包含四种内存序，memory_order_release作用于写操作，memory_order_acquire、memory_order_consume作用于读操作，memory_order_acq_rel作用于读写操作
- 当前线程memory_order_release写操作之前的任何读写操作都不允许重排到release写操作之后，
- 当前线程memory_order_acquire读操作之后的任何读写操作都不允许重排到acquire读之前；
- 当前线程对某个原子变量使用了memory_order_consume读（consume基于数据依赖关系而非内存屏障），则后续<strong>依赖于此原子变量（carries a dependency into)</strong>的读和写操作都不能被重排到当前指令前，它相较于acquire更宽松
- 若当前线程对某变量使用了memory_order_release写，其他线程对同一变量使用了memory_order_acquire读，则当前线程release写之前的的所有读写操作对其他线程可见。（具有synchronized-with关系）
- 若当前线程对某变量使用了memory_order_release写，其他线程对同一变量使用了memory_order_consume读，则当前线程release写之前该变量所依赖的所有读写操作对其他线程可见。
- 若当前线程对某变量使用了memory_order_acq_rel，<strong>等同于对原子变量同时使用memory_order_release和memory_order_acquire约束符，操作之前或者之后的内存读写都不被重新排序，</strong>其他线程使用memory_order_release写之前的操作对当前线程都可见，其他线程使用memory_order_consume读，当前线程的acq_rel之前的写操作对其他线程可见。
下面我们通过几个例子加强对上述特性的理解。

例子1：如下代码中使用了release-acquire，根据特性2、3、5可知，程序的执行顺序应当为L1、L2、L3、L4，L1 happends-before L4，L1的修改对L4是可见的，因此L4取出的值一定为100。

```cpp
#include 
#include 
#include 

std::atomicbool> flag(false);
int data = 0;

void producer() {
    data = 100; //L1
    flag.store(true, std::memory_order_release); //L2
}

void consumer() {
    while (!flag.load(std::memory_order_acquire)); //L3
    std::cout  "data = "  data  std::endl; //L4
}

int main() {
    std::thread t1(producer);
    std::thread t2(consumer);
    t1.join();
    t2.join();
    return 0;
}
```


例子2：下代码中使用了release-consume，根据特性2、4、6， L1、L2 happends before L3，L4跳出循环要依赖L3的写入，L3 happends before L4，L4、L5具有数据依赖关系，L4 happends before L5，L4、L6不具有数据依赖关系，L4 不一定happends before L6，根据上述的happends before关系链，可以推断出L1 happends before L5, 但是L2不一定 happends before L6。

```cpp
#include 
#include 
#include 

std::atomicint*> ptr;
int data;

void producer() {
    int* p = new int(42); //L1
    data = 100; //L2
    ptr.store(p, std::memory_order_release); //L3
}

void consumer() {
    int* p;
    while (!(p = ptr.load(std::memory_order_consume))); //L4
    std::cout   "*p = "  *p  std::endl; //L5
    std::cout  "data = "  data  std::endl; //L6
}

int main() {
    std::thread t1(producer);
    std::thread t2(consumer);
    t1.join();
    t2.join();
    return 0;
}
```


### 内存模型使用

上文中我们对C++11中的内存模型进行了介绍，这一节中将通过两个基本例子讲解内存模型在无锁编程中的使用。

#### 自旋锁

自旋锁常用于锁占用时间很短时避免上下文切换开销的场景，要保证同一时刻只有一个线程获得锁，获得锁的线程在锁期间产生的修改对后续获得锁的线程是可见的。下面是基于内存模型实现的自旋锁。

```cpp
class SpinLock {
private:
    std::atomicbool> flag_ = {false};
public:
    void Lock() {
        while (flag_.exchange(true, std::memory_order_acquire)); 
    }

    void Unlock() {
        flag_.store(false, std::memory_order_release); 
    }
};
```


为了保证同一时刻只有一个线程获得锁，我们使用一个原子变量作为标记，<strong>原子变量的修改无论采用哪种内存序，即使最宽松的Relax内存序，也能够保证正确的修改顺序和可见性</strong>（这个可见性只存在于单原子变量的修改之间）。因此当多个线程同时执行Lock语句时，能够保证一个线程先将flag从false置为true，exchange返回false（旧值），加锁成功，后续线程执行exchange时会返回true，将阻塞在循环中。

为了<strong>保证锁期间的修改对后续加锁的线程可见，Unlock操作应当 synchronized-with Lock操作</strong>，如下列代码中线程1的Unlock操作前的修改应当对线程2的Lock操作可见。这可以通过release-acquire模型实现，因此解锁时使用memory_order_release内存序，加锁时使用memory_order_acquire内存序。

```cpp
SpinLock lock;

void thread1() {
    lock.Lock(); 
    //修改共享数据
    lock.Unlock(); 
}

void thread2() {
    lock.Lock(); 
    //修改共享数据
    lock.Unlock();
}
```


#### 无锁队列

无锁队列通常由一个循环数组和几个原子变量索引控制队列的Push和Pop操作，这两个基本操作包含索引读取、数据访问、索引修改几个步骤构成，并非原子过程。<strong>在多读多写的无锁队列中，为了避免线程重入导致数据竞态问题，常利用CAS操作循环重试的方式</strong>，在非原子过程的最后一步设计一个CAS 操作, CAS是一个读-修改-写操作，能够保证原子变量的修改顺序，顺序靠后的线程会出现CAS失败，于是重新执行整个过程直至成功。

上述说到无锁队列的Push和Pop由几个索引变量控制，首先考虑利用队头索引（front)、队尾索引(back)两个索引的方案，代码如下。在Push操作中，首先取出back的值（L1)，然后判断队列是否满，不满时进行数据入队（L2)，随后CAS操作进行索引值修改(L3)。由于CAS只能解决线程重入时只有一个线程能够顺利完成索引修改操作，但是多个线程能够同时完成L1、L2操作，L2存在数据竞态问题。假设 a, b 两个线程的执行顺序是 a(L1), a(L2), b(L1), b(L2), a(L3成功),b(L3失败)。线程a虽然成功执行了L3，但是入队的值却被 b(L2) 覆盖掉了。

```cpp
bool MultiplePush(const T val) {
    int back;
    do {
        back = back_.load(); //L1
        if((back + 1) % capacity_ == front_.load()) return false;
        data_[back] = val; //L2
    }while(!back_.compare_exchange_strong(back, (back + 1) % capacity_)); //L3
    return true;
}

bool MultiplePop(T& val) {
    int front;
    do {
        front = front_.load();
        if(front == back_.load()) return false;
        val = data_[front];
    }while(!front_.compare_exchange_strong(front, (front + 1) % capacity_));

    return true;
}
```


为了解决上述问题，考虑将L2语句移到循环体外，这种方式解决了入队值被覆盖的问题，但是L3语句发生在L2之前，即索引的修改发生在数据入队之前，若a、b线程分别执行Push操作和Pop操作，且执行顺序为a(L3)、b(L4)、a(L2)，若L4语句刚好访问的是back索引处的数据，那么将取出一个无效值。

```cpp
bool MultiplePush(const T val) {
    int back;
    do {
        back = back_.load(); //L1
        if((back + 1) % capacity_ == front_.load()) return false;
    }while(!back_.compare_exchange_strong(back, (back + 1) % capacity_)); //L3
    data_[back] =  val; //L2
    return true;
}

bool MultiplePop(T& val) {
    int front;
    do {
        front = front_.load();
        if(front == back_.load()) return false;
        val = data_[front]; //L4
    }while(!front_.compare_exchange_strong(front, (front + 1) % capacity_));

    return true;
}
```


为了解决上述问题，<strong>必须保证L2 "happends-before" L4，且L2 "happends-after" L3</strong>，因此不得不引入修改索引（write)，Push时先修改write索引，利用write索引进行数据入队，最后利用write索引修改back索引。如下代码所示，<strong>L1 "happends-before" L2，避免入队数据被覆盖，L2 "happends-before" L3，避免back索引修改先于数据入队。</strong>

```cpp
bool MultiplePush(const T val) {
    int write, back;

    do {
        write = write_.load();
        if((write + 1) % capacity_ == front_.load()) return false;
    }while(!write_.compare_exchange_strong(write, (write + 1) % capacity_)); //L1

    data_[write] =  val; //L2

    do {
        back = write;
    }while(!back_.compare_exchange_strong(back, (back + 1) % capacity_ )); //L3

    return true;
}

bool MultiplePop(T& val) {
    int front;
    do {
        front = front_.load();
        if(front == back_.load()) //L4
            return false; 
        val = data_[front]; //L5
    }while(!front_.compare_exchange_strong(front, (front + 1) % capacity_));

    return true;
}
```


最后我们再分析一下上述过程的内存序，如下面代码所示，write索引只需要保证修改的顺序和原子性即可，如果L1读到了write的旧值，可能导致L2条件成立使得在队列不满时Push操作失败，但是即使使用release-acquire内存序，因为多线程可能同时执行到L1，某个线程先执行了L3并成功，那么其他线程拿到的值就变成旧值了，不过不管如何，拿到旧值的线程在执行到L3时总会失败，因此只需要relax内存序即可。

根据上文的分析，我们知道L4应当"happends-before" L8，这就要求L5 "synchronizes-with" L9，因此使用release-acquire内存序。L2中需要根据front判断队列是否为空，因此L9的修改应当 "synchronizes-with" L2。

```cpp
template typename T>
class LockfreeQueue {
private:
    std::vectorT> data_;
    std::atomicint> front_ = {0};
    std::atomicint> back_ = {0};
    std::atomicint> write_ = {0};
    int capacity_;

public:
    LockfreeQueueT>(int capacity) : capacity_(capacity), data_(std::vectorT>(capacity)){}

    bool MultiplePush(const T val) {
        int write, back;

        do {
            write = write_.load(std::memory_order_relaxed); //L1
            if((write + 1) % capacity_ == front_.load(std::memory_order_acquire)) //L2 
                return false;
        }while(!write_.compare_exchange_strong(write, (write + 1) % capacity_, std::memory_order_relaxed)); //L3

        data_[write] =  val; //L4

        do {
            back = write;
        }while(!back_.compare_exchange_strong(back, (back + 1) % capacity_ , std::memory_order_release)); //L5

        return true;
    }

    bool MultiplePop(T& val) {
        int front;
        do {
            front = front_.load(std::memory_order_relaxed); //L6
            if(front == back_.load(std::memory_order_acquire)) //L7
                return false;
            val = data_[front]; //L8
        }while(!front_.compare_exchange_strong(front, (front + 1) % capacity_, std::memory_order_release)); //L9

        return true;
    }
```


### 总结

内存模型的使用对程序员的心智是很大的考验，相比于传统的锁、信号量等同步机制，内存模型更加抽象和难以理掌握，需要对硬件、操作系统和编译器等多个方面知识有一定了解才能够深入理解其工作原理和特性，对其的使用应当更谨慎小心。希望这篇文章能够解决你学习过程中的一些困惑，若表述有误请留言讨论。

最后，创作不易，如果你觉得本文对你有帮助的话，请点个赞吧。本文无锁队列的代码和测试用例在下面项目中，如果你喜欢这个项目请给个star吧，你的支持是我持续发电的动力。

[](https://link.zhihu.com/?target=https%3A//github.com/Nodesheep/RESTfulCweb)

<strong>参考文章：</strong>

https://xiaolincoding.com/os/1_hardware/cpu_mesi.html

[https://zhuanlan.zhihu.com/p/125549632](https://zhuanlan.zhihu.com/p/125549632)

[https://zhuanlan.zhihu.com/p/48157076](https://zhuanlan.zhihu.com/p/48157076)

[https://zhuanlan.zhihu.com/p/413889872](https://zhuanlan.zhihu.com/p/413889872)

https://stackoverflow.com/questions/66124020/atomic-operations-and-visibility-in-c

https://luyuhuang.tech//30/lock-free-queue.html#%E8%80%83%E8%99%91%E5%86%85%E5%AD%98%E9%A1%BA%E5%BA%8F
