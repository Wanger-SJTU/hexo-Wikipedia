---
title: 超标量处理器设计学习-0x02 Cache
date: "2022-03-02 00:00:00"
updated: "2022-03-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/超标量处理器设计学习-0x02-Cache/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/474001387
---


### 一、Cache的一般设计

在超标量处理器中，有两个部分比较影响性能分别是：**分支预测**和**Cache**，这两部分属于处理器升级的重头。

Cache存在是因为计算机世界存在如下两个基本现象：

- **时间相关性**：如果一个数据现在被访问了，那么很可能**之后还会被访问**
- **空间相关性**：如果一个数据被访问了，那它**周围的数据**也很可能被访问
Cache是广泛存在的，例如DRAM可以看做是硬盘（disk）或者闪存（flash）的Cache；L2 Cache可以看做是DRAM的Cache；L1 Cache可以看做是L2的Cache。

在当前硅工艺下，大容量存储器的访问速度比处理器要慢**一个甚至几个数量级**。所以催生了L1，L2这类和处理器采用相同硅工艺的部件，其中L1 Cache和处理器紧密耦合，属于流水线的一环。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0cdf44fd8e79.jpg)

L1 Cache一般包括两个物理组件：**指令（I-Cache）**和**数据（D-Cache）**，它们的原理一致，但是D-Cache有读和写，I-Cache一般只有读（后面如果没特殊说明，都是指D-Cache）。L1 Cache一般采用SRAM来实现，大容量的SRAM需要更多的时间来找到特定的地址内容，可能就无法和处理器配速，所以“快”是L1 Cache的主要指标。

L2 Cache一般是指令和数据共享，为了求“全”，不一定要求和处理器保持一样的速度了，所以一般可以做到以MB为单位的大小。在多核处理器上，L2 Cache有可能是被多核共享的（不过一般都是L3 Cache才共享）。但是L1 Cache仍然是每个核独享的。

Cache主要由两个部分组成：**Tag部分**和**Data部分**

- Data部分保存一片**连续地址**的数据
- Tag部分保存这片连续数据的**公共地址**
一个Tag和它对应的所有数据组成的一行称为Cache Line；而Cache Line中的数据部分被称为数据块（Cache Data Block）；如果一个数据可以存储在Cache的多个地方，这些被同一个地址找到的多个Cache Line就称为Cache Set。下面是Cache一种可能的结构：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_6c24b5685da5.jpg)

Cache的三种主要实现方式：

- **直接映射（direct-mapped）**：物理内存中的一个数在Cache中**只有一个地方**容纳它；
- **组相连（set-associative）**：物理内存中的一个数在Cache中有**多个地方**可以存放；
- **全相连（fully-associative）**：物理内存中的一个数在Cache中**任何地方**都可以存放；
![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_418234c810da.jpg)

可以看出直接映射和全相连是组相连的两个特殊情况。**TLB和Victim Cache（后面会说这两个是啥）多采用全相连结构，普通的I-Cache和D-Cache则采用组相连结构。**

Cache只能保存最近使用过的内容，有时候需要找的指令或者数据并不在Cache中，这种情况就叫Cache缺失（Cache Miss），这种情况的发生频率会直接影响处理器的性能。**Cache Miss的几个情况**：

- **Compulsory（必然**），因为Cache只缓存之前用过的内容，因此第一次访问的内容肯定不会在Cache中，这种缺失看上去就是必然的。不过实际可以采用预取（perfetching）来降低这种情况的频率。
- **Capcity（容量限制）**，Cache容量越大，能容纳的内容就越多发生缺失的情况就会减少。然而考虑到面积和访问速度限制，一般Cache不能做的很大。
- **Confict（访问冲突）**，为了解决多个数据被映射到Cache中相同位置的情况，一般会用组相连结构。考虑到面积限制，组相连度不会很高。例如2-way的Cache访问三个属于同一Cache Set的数据。就会频繁发生缺失。
为了缓解这些情况，根据上面的3C定理，一般采用**预取**（perfetching）和**Victim Cache**来缓解，不过只是减少缺失频率，不能完全消除缺失。

#### 1.1.1 Cache的组成方式

**1、直接映射**

这种方式是最容易实现的，处理器访问存储器的地址被分为三个部分：Tag，Index，Block Offset。使用Index找到Cache Line，但是所有Index相同的都会找到同一个Cache Line。因此Cache Line中的Tag部分就用来和地址进行比较，只有它们相等才表明这个Cache Line是真实需要的。Block Offset用来找到Cache Line中的多个数据，可以定位到每个字节。同时在Cache Line中还有一个有效位（Valid）来标记这个Cache Line是否保存着有效数据。只有之前被访问过的存储器地址，它的数据才会在对应的Cache Line中，相应的有效位也会置为1。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_2a7129a9844a.jpg)

对于Index相同的存储器地址，会寻址到同一个Cache Line，这就造成了冲突。这种情况是直接相连的一大缺点。但是实现简单，不需要替换算法。不过因为效率不高，所以现代处理器比较少用了。

**2、组相连**

一个数据可以放在多个Cache Line中，如果一个数据可以放在n个位置，则称这个Cache是n路组相连Cache（n-way set-assocaiative Cache），如下是一个两路组相连Cache

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_9e41a8d99b0d.jpg)

这种结构依然采用Index来选择Cache Line，此时会得到两个Cache Line，这就是一个Cache Set。在这两个Cache Line中究竟哪个Line才是需要的就根据Tag比较结果来确定。如果两个Line的结果都不相等，那就是发生了缺失，说明数据不在Cache中。

可以看到这种方式比直接相连多了一个选择Line的过程，会增加部分延迟，所以有时候需要进行流水操作。但是这样会增加load指令的延迟从而一定程度影响处理器的效率。但是这种方式可以显著减少Cache的缺失频率，因此现代处理器大多使用这种方式。

对于Tag和Data一般是分开放置，分别称为 Tag SRAM和Data SRAM，对于这两个部分可以采用两种访问方式：

**并行访问**：同时访问Tag SRAM和Data SRAM。在访问Tag的时候把对应的Data数据也读取出来然后送到一个受Tag比较结果控制的多路选择器上，选出对应的Data Block，然后根据Block Offset选出对应的字节（选字节的过程一般称为数据对齐Data Alignment）

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_894c7bdcf2a0.jpg)

如果在一个周期内处理完这个访问过程，实际上是比较消耗时间的，所以通常采用流水的方式进行

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_d0941e1ade7e.jpg)

通过将Cache的访问放到几个流水周期内完成，可以降低处理器的周期时间，从而提升效率。

**串行访问**：先访问Tag SRAM，然后根据比较结果再访问Data SRAM，不需要多路选择器，同时不需要的那一部分SRAM可以被置为无效信号，能节省部分功耗。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c3e74152be01.jpg)

对于这种串行方式来说，处理器的周期时间会更大，所以还是要采用流水处理方式

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_331d7f61f880.jpg)

对于串行和并行是比较难区分好坏的。并行访问会有较低的时钟频率和较大的功耗，但是访问周期减少了。对于超标量处理器来说，我们可以通过乱序和将Cache访问流水操作来掩盖延迟，因此使用串行访问提升时钟频率，同时不会因为增加的访问周期导致处理器性能下降；对于顺序执行的处理器来说，增加一个访问周期可能就会引起性能降低，所以采用并行可能更合适。

**3、全相连**

由于数据可以放在任何一个Cache Line中，所以不再需要Index部分，而是直接将Tag进行比较来定位需要的Cache Line。这相当于直接使用存储器的内容来寻址，从存储器找到匹配的项，也就是内容寻址存储器（Content Address Memory，CAM），实际中的全相连Cache都是使用CAM来存储Tag，使用普通的SRAM存储数据。全相连非常灵活，缺失率也最低，但是由于大量比较内容，所以延迟也是最大的。所以采用这种结构的容量都不会太大例如TLB。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_8d152a9888c4.jpg)

#### 1.1.2 Cache的写入

在一般的RISC处理器中，I-Cache都不会被直接写入内容，即使有自修改（self-modifying）的情况，也是借助D-Cache来实现的：将要改写的指令作为数据写入到D-Cache中，然后将D-Cache的内容写入下一级存储器（例如L2 Cache，这个存储器一定是指令和数据共享的，这个过程称为clean），然后将I-Cache中的内容置为无效，再次执行就能使用被修改的指令了。

对于D-Cache它的读写操作并不相同，当store执行时，如果只向D-Cache中写入数据，并不改变下一级存储器的数据，就会导致D-Cache和下级存储器对某个地址有不同的数据，这称为不一致（non-consistent）。为了保持一致有两种策略：

- **写通（Write Through）**：当数据写入D-Cache的时候，同时也写入下级存储器。由于下级存储访问时间长，可能会导致处理器效率降低。
- **写回（Write Back）**：数据写入D-Cache时只对Cache Line做标记，不写入下级存储器。当Line被替换才写入下级。这个标记称为脏状态（dirty）。可以提升效率，但是对存储器的管理带来负担。
当上述情况写数据时发现地址并不在D-Cache中，就是写缺失（Write Miss）。应对策略也是两种：

- **Non-Write Allocate**：直接将数据写入下级存储器，而不是将数据写入D-Cache中。
- **Write Allocate**：首先从下级存储器将缺失地址对应的数据块取出来，然后将要写入的数据和这个数据块合并，然后将合并数据写入D-Cache中。具体要不要写入下级存储就可以选择上面的写通或者写回来决策了。
考虑一下为啥不直接把数据写入空的或者随意一个Line中？（指令修改一般不会达到Data Block的大小）

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_cad820b5b506.jpg)

容易想到，写通总是配合Non-Write Allocate，都是直接将数据写入下一级

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_bf4a4d2f3e68.jpg)

写回总是配合Write Allocate

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_0a1221d44d0a.jpg)

注意当替换的Line是dirty状态时，会发生两次对下级存储器的访问：写入Line数据到下一级，从下级读取缺失地址对应的数据块，合并数据并标记为dirty。**写回配合Write Allocate 要比 写通配合Non-Write Allocate的方式复杂，但是可以减少下级存储器的写入频率，因此可以使处理器有更好的性能。**

#### 1.1.3 Cache的替换策略

当我们需要从Cache Set找一个Line存放数据，而这个Cache Set所有Line都被占用的时候，就需要替换掉一个Line。下面介绍几种替换策略：

**1、近期最少使用法（Least Recently Used，LRU）**

选择最近被使用次数最少的Line，需要跟踪每个Line的使用情况，例如为每个Line设置个age，每次访问就增加对应Line的age或者减少其它Line的age。实际一般使用“伪LRU“方式，将way进行分组。下面是一个示例（就是一个不断二分的过程）

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c281fea17fe4.jpg)

**2、随机替换（Random Replacement）**

相比LRU发生缺失的频率会高一些，但是随着Cache容量的增加，这个差距越来越小。一般不是真随机，而是采用类似时钟算法来近似随机。本质是一个计数器，**每周期加1，宽度由Cache的way来决定**，例如8路组相连就需要3位计数器。当需要替换Line时就是用计数器的值去替换对应的Line。（**这里注意计时器是每个周期加1，不是只有读写Cache才会加1。所以可以实现对Cache的伪随机**），不一定最优，但是硬件简单不会损失过多性能，属于择中的策略。

**

### 二、提高Cache的性能

#### 2.1.1 写缓存

当一个Cache Line需要被写入下级时（例如dirty状态的Line要被替换掉了），如果直接写下级存储器可能会导致效率较低，因为L2或者DARM的访问时间都比较长而且是串行的。这时候就可以用写缓存（Write Buffer）来解决，dirty数据会先写入缓存，然后择机写入下级缓存中。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_4ecd36b5e6a5.jpg)

由于写通便于一致性管理，所以多核处理器多采用这种结构来组成L1 Cache。但是采用这种结构之后发生读缺失时，除了在下级存储器查找，还需要在写缓存中查找，因此需要在写缓存中加入地址比较电路CAM，显然写缓存的数据比下级存储的要新，所以优先使用。

#### 2.1.2 流水线

在写D-Cache的时候，由于需要先比较Tag然后才能确定Data SRAM，这个串行操作在高主频处理器中很难一个周期完成，所以通常采用流水来进行。一种简单的方式就是将Tag比较和写Data分成两个部分。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_13348fd4c156.jpg)

但是这种方式有个问题就是，我们的load指令需要的数据可能正好在store指令流水寄存器中，这就需要一个机制来检测load指令的地址和store寄存器的地址是不是相同。如果相等就将store指令的数据作为load指令的结果**。因此对D-Cache加流水需要增加硬件复杂度。*这里作者再次diss了Pentium 4处理器加深流水线反而成了负作用。*

#### 2.2.3 多级结构

一般情况L1 Cache容量都很小，能和处理器内核保持相同速度等级；L2 Cache需要消耗几个时钟周期，但是容量更大。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_fcc56ba45518.jpg)

一般来说L1和L2 Cache都和处理器放在同一个芯片内，高阶处理器还可能有更大容量的L3 Cache。注意看下面示例中的有些是每core独有的。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_067e0c7ed48d.jpg)

在一般处理器中，L1 Cache采用写通，L2 Cache采用写回。这样便于简化流水设计以及方便多核环境进行一致性管理。

除了多级结构，还有两个概念需要说明：

**Inclusive**：L2 Cache包括了L1 Cache中的所有**内容**，则称L2 Cache是Inclusive。

**Exclusive**：L2 Cache和L1 Cache**内容**互不相同，则称L2 Cache是Exclusive。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_fa8c7e48e07f.jpg)

***注意这里是指内容，不是指硬件设计。***

Inclusive会浪费部分硬件资源，因为有数据重复备份，但是可以将数据直接写到L1 Cache，因为L2 Cache还有原数据的备份，不会引起覆盖。同时这简化了一致性管理，在多核情况，只需要检查低一级的Cache中某个地址是不是存在，不用影响L1 Cache，也就不会影响流水操作。

Exclusive避免了硬件浪费，但是多核一致性管理需要检测所有的Cache，可能会影响流水操作。但是可以获得更多的容量。

目前大多数处理器都采用的是Inclusive类型的Cache。

#### 2.1.4 Victim Cache

在Cache中经常会出现刚被”踢出“的数据马上又要被使用。例如

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_cafc1e20ef70.jpg)

一个2-way的Cache，要使用同一个Cache Set的三个数据，就会发生循环缺失的情况。如果增加way的个数，会浪费大量空间，因此采用**Victim Cache**来提高way的个数，一般采用全相连，容量较小（4~16个数据），其在处理器中的位置如下

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_63c1d04012ef.jpg)

一般情况Victim Cache和Cache存在互斥关系，处理器同时读取二者来确认是否有需要的数据。如果是Victim Cache命中，那数据会写入Cache，同时Cache的数据写入Victim Cache中，就产生了数据互换。这个过程类似Exclusive类型的Cache，可以减少Cache的缺失，提升处理器性能，大多数处理器都采用了Victim Cache。

另外一种和Victim Cache类似的思路称为**Filter Cache**，**不过Filter Cache是在Cache之前，Victim Cache是在Cache之后**。当数据要被使用时，首先进入Filter Cache中，当再次被使用才进入Cache中。这个可以**过滤掉偶然**使用的数据，从而提升处理器效率。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_6119ef0db62f.jpg)

#### 2.1.5 预取

前面说了，处理器在首次访问内容时，一定会发生缺失，那么为了缓解这个问题，就出现了预取（perfetching）这个操作，这个操作可以有两种方式来实现：

**1、硬件预取**

对指令来说，猜测后续指令会比较容易，因为程序局部是串行的（先不考虑分支），因此访问I-Cache的时候，将对应数据块后续的数据也读入Cache即可。不过因为分支和错误处理的存在，这种操作可能造成”Cache 污染“，读取的指令可能是不会执行，从而影响处理器效率。因此可以将预取的指令放到一个单独缓存中

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_c956d02d5618.jpg)

在I-Cache发生缺失的时候，同时去Stream Buffer中找，如果找到了就把数据搬到I-Cache中，同时从下一级取后续的数据块放到Stream Buffer中。同样的当发生分支或者错误处理时，Stream Buffer中的数据就浪费了，这会造成功耗和带宽的上升。因此预取是一把双刃剑，尤其是对数据的预取，实际设计要权衡利弊。

对于数据的预取更加复杂，因为下一个数据块不一定会使用，在某些处理器上可能有比较激进的预取策略，例如Pentium 4（*怎么老是这个倒霉蛋*）和IBM Power5采用了一种Strided PreFetching方法，通过硬件观察数据规律来预取，例如第一个是a，第二个是a+128，第三个是a+256。那预测硬件可能就会预测下一个是a+384，并将这个数据取出来，甚至会将a+512，a+640，a+768这些数据都取出来，例如Power 5可以取12个数据块。这种方法可能会大幅提高某些程序的性能，不过是否合适也要仔细权衡。

**2、软件预取**

在程序编译阶段，编译器通过对程序分析，在有预取指令支持的时候，就可以控制预取。预取就会有针对性。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_df41c370702d.jpg)

这段程序提前将数据进行预取，就可以保证求和时从D-Cache可以找到需要的数据。但是软件预取比较考验时机，**太早可能被覆盖，太晚又来不及预取**。

当软件执行预取指令的时候，要求处理器继续执行，不能在预取指令阻塞后续的执行。因此这就要求D-Cache是非阻塞（non-blocking）结构。

执行预取指令可能会失败，这个时候有两种策略进行处理：

- 对错误进行处理，**处理错误的预取指令**（Faulting Perfetching Instruction）
- 不处理错误直接跳过，现代处理器大多采用这种方式，**不处理错误的预取指令**（Nonfaulting  Perfetching Instruction）

### 三、多端口Cache

在超标量处理器中，处理器需要在一个周期执行多条load/store指令，这就需要多端口D-Cache，事实上超标量处理器中很多部件都需要多端口支持，例如寄存器堆，发射队列，重排序等待。不过D-Cache的容量较大，采用多端口会导致芯片面积变大，速度也会变慢。为了解决这个问题，常见有三种D-Cache设计策略：

#### 3.1.1 True Mutil-port

实际中不太可能采用这种直接多端口的设计，这种方法使用一个多端口的SRAM来实现多端口的Cache，例如在双端口Cache中，需要两套地址解码器使得两个端口可以同时寻址Tag和Data SRAM；有两个多路选择器来同时读两个端口的数据；比较器增加一倍用来判断端口命中情况；需要两个对齐器。这种方式可以精确提供双端口功能，但面积增加，访问时间增加，功耗增加。对处理器周期负面影响很大，所以一般不会采用这种方式。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_81a19154f48a.jpg)

#### 3.1.2 Multiple Cache Copies

这种方法将Tag和Data SRAM进行复制，其它部分和上面的方式基本一致，只是不需要多端口结构，消除对处理器周期时间的影响。但是这浪费了很多面积，同时保持Cache一致也比较麻烦，现代处理器很少使用。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e82f3cbec764.jpg)

#### 3.1.3 Multi-banking

这种方法将Cache分成很多bank，**每个bank都只有一个端口**。只要同一个周期内访问的地址位于不同的bank上，就不会有冲突。只有**多端口访问地址位于同一个bank才会冲突**（bank conflict）。这种方法中双端口的Cache还是需要两个地址解码器，两个多路选择器，两套比较器和两个对齐器，而Data SRAM不需要多端口了，这样就提高了速度，并一定程度减少了面积。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_654d6e47a6d1.jpg)

为了减少bank 冲突，可以增加bank数量来缓解，还可以在编译器支持时尽可能避免让有用数据在同一个bank中。这种结构需要更多的布线资源，不过相比前两种方式还是可以降低总面积的，而且不会大幅增加处理器周期时间，因此现代处理器大多采用这种方式。

#### 3.1.4 AMD Opteron多端口Cache

Opteron（皓龙）系列是64位处理器，也就是处理器内部数据都是64位的，但是处理器物理地址（Physical Address，PA）只有40位，虚拟地址（Virtual Address，VA）只有48位。很多64位处理器为了节约面积都会采用这种简化地址，例如Intel的Core i7。Opteron的D-Cache是双端口64位的，每周期支持两条load/store同时访问，内部使用Mutil-banking实现。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_e6ba38341d67.jpg)

其中数据块是64字节，需要6位地址进行寻址；每个数据块分为8个独立的bank；每个bank为64位单端口SRAM。整个Cache大小64KB；分成两路组相连所以每路为32KB；采用虚拟地址直接访问Cache；32KB大小每路需要VAl[14:0]来寻址，数据块64字节需要VA[5:0]，剩下的VA[14:6]用来找到Cache Set。划分如下：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1c2eceb9ae53.jpg)

每个Line分为8个bank，每个bank为64位宽的SRAM（8个字节）,所以用VA[5:3]来找到某个bank，用VA[2:0]来定位某个字节。这种方式将两个连续的64位数放到两个相邻但不同的bank中，当发生空间相关性访问时，自然就在不同的bank中了。

### 四、超标量处理器的取指令

对于一个n-way超标量处理器，在给出一个取指令的地址后，I-Cache应该能至少送出n条指令，这n条指令称为一组（fetch group）。I-Cache最简单的支持就是让数据块大小为n个字：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_1a650f7c769c.jpg)

在上图中，如果取指令的地址是n字对齐的，那就可以每周期取出n条指令，但实际是不会总是对齐n字的。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_ed9ebae22099.jpg)

如果不能对齐的话，就会导致流水空置，如图n=4的情况下，理论取指令个数为2.5。虽然实际要比2.5大，因为当上一条是未对齐时，下一条就是对齐的了。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_3dc0ef56ebe0.jpg)

如果这个时候改变为2-way的超标量处理器，就没有问题了，实际上很多处理器就是这样的方法，每周期取出的指令数大于能解码的数量，多余的通过缓存暂时保存。或者是将Cache的数据块变大。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b45ca9408a5b.jpg)

不过这种方式会减少Cache Set的数量，可能更容易发生缺失。同时这样还需要更多的SRAM保护电路，会导致面积过大，所以实际一般会用两个4字的SRAM来实现8字的效果。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_9728fcbe9855.jpg)

一个8字的Cache Line占用了SRAM的两行，所以只需要4个32位的SRAM，当Tag命中时，两行都是有效的。读数据时可能就会某些SRAM读第一行，某些读第二行。然后通过重排序得到正确的指令顺序。所以这需要两个额外电路，

- 一个是产生SRAM的读地址：控制每个SRAM读哪一行
- 一个是SRAM的重排序：将指令按程序指定顺序重排
对于带分支预测的时候，取指过程会更复杂；带虚拟存储指令可能还需要转换为物理地址等。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_61312d6a9bd1.jpg)
