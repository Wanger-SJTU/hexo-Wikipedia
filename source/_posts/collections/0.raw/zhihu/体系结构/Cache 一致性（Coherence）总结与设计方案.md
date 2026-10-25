---
title: Cache 一致性（Coherence）总结与设计方案
date: "2025-03-07 00:00:00"
updated: "2025-03-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/Cache-一致性(Coherence)总结与设计方案/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/681522097
---


### 1. 问题的引入

什么是cache的coherence问题？

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_499ac2a989e6.jpg)

coherence从何而来cache一致性问题的产生，往往来源于三个方面：

（1）多host对内部私有cache的写操作（即修改）**    多host在访问同一个main memory或者L1C时，假设它们本身没有私有cache（更通俗的理解是：没有私有化内存中的data），就不会引发一致性问题。多host并发访问main memory，加arbiter即可保证正常运转。但是如果每个host都存在私有化cache（图中的L0 cache），就会引发一致性问题。如上图所示：

    host #1-3都拥有0x001的data，host#1 已经修改了自己L0C内该addr的data，甚至是通过write through，或者evcit的方式更改了main memory的该地址的data，而host #2-3，并不知情，当host #2-3读取自己L0C中0x001处的 data，会发生hit，会读到之前保存的old data。而host #1再读得到是new data。发生error：不同host，读相同地址，拿到的data不一致。**

（2）进程在host间的切换

某addr的data被保存在hsot#1和#2中。原本进程运行在host #1上，对该data进行了修改。然后进程切换到了host #2上，读取该data，却还是原始内容，发生了不一致。**
（3）DMA等IO操作导致

DMA操作会绕过host，直接从外部memory想main memory中搬运数据。如果这种搬运，修改了某个data。但是却未曾告知保存有该data的host，当host在读这个data时会发生不一致。

了解到问题如何发生，下一步自然就是如何解决，以下2-6节试着总结了常见的解决策略。

### 2. BUS Snooping（总线嗅探、监听）

当一个host修改了其cache line之后，此更改必须传播到所有拥有该地址的其他host的cache中。保证在任一时刻，不同host对同addr的访问，一定是得到same data。

（1）Write update（写更新）

Host #1发生的修改，广播到总线上，host #2-#3看到后，发现内部L0C存有该地址数据，也要修改。即使host #1发生的修改，并未更新到main meory，也要做上述一致性处理**。（所以下图中用虚线表示更新到main memory）。**显然：该机制下，总线负载太重，不常用。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_fe2a4f233096.jpg)

bus snoop（2）Write invalidate（写无效）

Host #1发生的修改，广播到总线上，host #2-#3看到后，发现内部L0C存有该地址数据，直接将其置为invalid。

### 3. 目录一致性协议

用目录的形式，记录cache line在不同host中的情况，据此来完成一致性的保持

#### （1）集中式目录方案

一个集中式的目录，来记录所有的私有cache情况，这显然是只适用于小规模系统，否则这个目录将会占据大量存储空间。

#### （2）分布式目录方案

每个data block都维护一个目录

① 全映射目录
对main memory中每一个addr的data，维护一个目录entry，如下所示，包含：状态标志位、位向量标识。
位向量标识一共Nbit，每bit指向一个host，用来表征该host是否缓存了相应addr的data。
例如：S101011，说明该data在host #1 #3 #5 #6中都存在；
M001000，说明该data在host #3中被modify
由此，可以将BUS Snooping中的全局广播，转为定向广播。**

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_6c402d689d64.jpg)

全映射目录目录占据cacheline的比例为：N/C。  假设C是这个cacheline的总size

②有限目录

全映射目录中，有多少个host，就需要多少bit的位向量标识。**而有限目录的基本思想就是，不管系统大小如何，位向量标识是固定的，设为P个。则对一个cacheline而言，只记录P个host的情况，P自然是小于N的，那这里就不能用1bit来指向具体哪个host了，要直接使用host的idex。

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_34710cb62122.jpg)

有限目录图中M是对N的对数编码位宽。则目录占据cacheline的比例为：log2（N）*P / C。  假设C是这个cacheline的总size。
所以控制P的大小，可以让有限目录耗费的空间降低。但是会引入新的问题，那就是：超过P个host，存了该addr的data，怎么办？（目录项溢出）

- 全广播，此addr作废
- 选出一个标识（M bit），作废其指向的host中对该addr的data的存储，腾出这个标识给新的host使用
- 超集法：一个标识对应多个host。
③链式目录
不同host的cache，如果拥有同一个addr的data，则纳入链表中。
一个单向链表如下所示：

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_542df5e6bcf1.jpg)

单链表示意显然：基于单向链表找到保留同数据块的host，是要将整个建立起来的链表进行遍历。

### 4. MESI协议

    典型的一种写无效协议。MESI是4种状态的标记，作用对象一个cache line。（本质还是这个cacheline对应的内存address）
    M：modified，只被当前cache所有，且是dirty的；E：exclusive，只被当前cache所有，且是clean的；
    S：shared，在其他cache也存在，且是clean的；I：invalid，将该cacheline置invalid，不能再产生影响

  祭出一张famous表格**：**  一个addr的data，存于两个host的私有cache中，纵列是#0 cache、横列是#1 cache。
  假设在#0中，addr存放的cacheline标记M，那么在#1中就不能是M、E、S，只能标记为I。

MESIM×××√E×××√S××√√I√√√√基于这样的状态耦合关系，自然想到的实现方式就是FSM：基于不同的event，决定状态跳转，同时基于上述的耦合关系，向总线广播相应信息。

盗图2张

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_99f7a14048c0.jpg)

状态跳转![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_f8f0b0ebabb6.jpg)

状态跳转举一个例子：
Host #0的L0C中，一个对应addr为0xFF40的cacheline 处于shared 状态，host #0对它的访问是写hit，则：
    先向总线广播invalid信息：其他所有host的L0C都要把0xFF40所在的cacheline置invalid； 接着状态跳变到modified，表明data发生修改、变dirty，且此后只属于host #0
优缺点：

    优点：直接的广播，相对于全局的统筹安排，要来的更快速。
    缺点：

        控制逻辑复杂；

        占用总线带宽过大，导致host数量的可扩展性有限；

        频繁的snoop行为，其实会和host对cache的访问产生竞争，降低性能；

### 5. 变种之MOESI协议

最开始应该是AMD提出，引入O（owned）位，并且S位的含义跟MESI协议不一样。
众说纷纭……这里以arm为base：
① O（owned）位。Shared Dirty，描述一个cache line为dirty，并且存在于多个cache中。一个 Owned 状态的cache line保存着 最新的 而且 正确的（new and correct） 的数据。只有一个core的cache 可以将数据保存为 Owned 状态，其他core 为 shared 状态。O cacheline 必须响应该data的snoop 请求。**

② S（shared）位，该cacheline数据在多个host中存在，**data可以是dirty的：如果dirty，则存在另一个O的host cacheline，最终更新到main memory也是由这个O 负责。如果都没O，那就是clean的。**

引入原因：**在原本的MESI协议中，对于dirty的data，其他host如果想获取，只能先把dirty data写回main memory，其他host再读取。这样比较慢。而O态的引入，允许直接share dirty data，及O态的host直接把dirty的data，传给其他share的host。

状态互相关系表**

MOESIM××××√O×××√√E××××√S×√×√√I√√√√√盗图一张，MOESI协议下，状态之间的跳转。（ARM中采用）

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_45042b45cc9a.jpg)

状态跳转比对着理解：Probe前缀代表其他host的动作

![](/images/collections/0.raw/zhihu/%25E4%25BD%2593%25E7%25B3%25BB%25E7%25BB%2593%25E6%259E%2584/asset/img_b807f6dc57e4.jpg)

状态跳转标记为S的cacheline中data，应该是和O cacheline的data保持一致。

### 6. 变种之MESIF协议

**Intel基于MESI协议，新增了F态（forward），其他四态和MESI含义一致。
F态：在多个处在shared态 且 clean的cacheline中，标记一个为F态，其他shared态不变。
引入原因****假设host#2、3、4，都拥有一个addr的data。而host #0没有。host #0发起了对这个addr的read请求，miss。此时host #0获取这个data的方式有如下2种：

- 单纯的read miss，host #0去main memory中捞取这个data。
- Host #0可以从已有这个data的host #2、3、4中去拿。
方式2，往往速度会快于方案1。但是host #2、3、4都有，他们仨是平等的，都会向host #0发data，造成浪费及拥挤。因此在host #2、3、4中选一个带头大哥，作为F态，其他维持S态。只有F态才有资格向host #0发data，其他S态的保持沉默。

状态互相关系表**

MESIFM×××√×E×××√×S××√√√I√√√√√F××√√×
