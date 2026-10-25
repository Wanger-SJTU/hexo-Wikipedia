---
title: "苹果的黑魔法？Apple M1的栈操作消除（上） - 知乎"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/Omnivore/2024-04-10/苹果的黑魔法-Apple-M1的栈操作消除(上)-知乎/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

---
id: 3134bde3-2547-4016-a19e-fb2a0fb38eae
---

# 苹果的黑魔法？Apple M1的栈操作消除（上） - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-zhuanlan-zhihu-com-p-595582920-18ec3b99df6)
[Read Original](https://zhuanlan.zhihu.com/p/595582920)



## 前言

访存是微结构设计永恒的难题，这个领域也有着一个传说：部分处理器能够将栈操作消除。ARM架构并没有专门的栈操作指令，那么应该如何定义栈操作呢？我们不妨将其宽泛定义为：访问同一物理地址的store和load指令对（后文中将用栈操作来指代此类情况），栈操作无疑被包含其中。众所周知，苹果M1处理器有着极高的IPC，采用了许多激进的设计来提高指令并行度，那么它能不能消除栈操作呢？让我们来探究一番。

一点小小的剧透：其实最新的x86阵营处理器在这一方面远比苹果激进，它们的故事我们以后再讲；而苹果的实现方式与它们并不相同，这有可能是ARM ISA本身的特性或是实际需求使然。本文探究了Apple M1栈操作消除的实现方式，并揭示了其ICache以及流水线设计的部分细节：

一点题外话：在上一篇文章中我们探究了13900ES预取器的反常行为：

后来翻阅Intel官方PPT时发现：

![](https://proxy-prod.omnivore-image-cache.app/1950x1244,sfclgOSGYCSp7oQGpUTn6cdvw92euWzVoBiB5xXPJNaE/https://pic4.zhimg.com/v2-118721e9403fdea91f01c351b794a68f_b.jpg)

看来有可能是一个FEATURE，能够见证行业巨头在面对取舍时的小小窘迫，还是颇有趣味的。

---

## 正文

### 测试构造

首先，我们需要构造一个Probe用的小程序来反应处理器执行栈操作（访问同一物理地址的store和load指令对，后文中将用栈操作来指代此类情况）的性能。从定义入手其实基本结构十分简单，只要一条store指令和一条load指令（将其称为一个指令块）不断循环往复即可，使用汇编构造如下：

```llvm
str x11, [x10,#0] // x11为store的（值的）源寄存器；[x10,#0]为store的地址，含义为：地址x10+0
ldr x12, [x10,#0] // x12为load的目的寄存器；[x10,#0]为load的地址，含义为：地址x10+0
```

可以看到，这样的栈操作其实可以被迅速完成而不需要通过Cache，因为load的值显然就是store存入的值；倘若处理器在流水线内就获得了load指令的值，我们就将这一操作称为栈操作消除（没有通过Cache获得结果）。

注意ARM汇编中即便同为ldr，也有包括post index在内的多种寻址方式，需要使用正确的汇编。但是很快我们就会发现问题：

```llvm
str x11, [x10,#0]
ldr x12, [x10,#0]
------------------
str x11, [x10,#0]
ldr x12, [x10,#0]
------------------
str x11, [x10,#0]
ldr x12, [x10,#0]

```

循环执行这样的多个指令块，指令块之间并没有任何依赖，因此块间可以完美并行，这样是无法反应栈操作的性能的。我们不妨将store指令与load指令的值寄存器设置为同一个：

```llvm
str x11, [x10,#0]
ldr x11, [x10,#0]
------------------
str x11, [x10,#0]
ldr x11, [x10,#0]
------------------
str x11, [x10,#0]
ldr x11, [x10,#0]

```

此时上一个块的load指令的结果会作为下一个块的store指令的值来源，因此倘若上一个块的load指令无法取回数据，下一个块的store指令就无法完成；整个程序通过访存地址相关和寄存器相关串成了一条巨大的相关链，其执行时长即可反应我们需要的栈操作性能。此类测试的其他构建细节在专栏的其他文章内有详细讲解，简而言之，整个程序分为外循环与内循环，内循环为N个指令块（不仅仅使用1个指令块，否则循环相关的指令占比过大，它们不是我们计时的对象，需要通过通过放置N个指令块稀释），外循环为M次（多次执行，使得执行时长足够长，方便计时），则共会执行N\*M次指令块；我们将总执行时长除以N\*M，再通过频率信息就可以得出每个指令块执行所需的cycle数，以下均以cycle数标识栈操作性能。

```llvm
//测试程序示意，实际程序为嵌入汇编：
for(int i=0;i<M;i++){
    //共N组store和load
    str x11, [x10,#0]
    ldr x11, [x10,#0]
    ...........
    str x11, [x10,#0]
    ldr x11, [x10,#0]
}

```

### 基准获取

现在有请本次测试的背景板：ARM Cortex X1，其作为ARM公版的首个超大核微架构，承载了ARM冲击高性能市场的愿景，不妨看看其表现如何。为了排除取指带宽波动的影响，我们根据处理器的微结构信息，在指令块中插入指定数量的nop指令，使得一个cycle理论上只能取指、重命名一个指令块。对于Cortex X1这样的6发射处理器，调整指令块如下使其正好容纳6条指令：

```armasm
str x11, [x10,#0]
nop
nop
nop
nop
ldr x11, [x10,#0]

```

![](https://proxy-prod.omnivore-image-cache.app/1944x1121,sCejYRfc7Gkx4G_jqKq1UkNPBj9J9jer3hvhbkORlKXE/https://pic1.zhimg.com/v2-00522fe9e5eb7c1d41933c78ba78ed7c_b.jpg)

由于我们的主要探究对象并不是Cortex X1，其非整结果我们不做深入探究，不妨将其视为4-5cycle。<strong>这样的处理器显然没有进行栈操作消除</strong>，符合我们对背景板处理器的性能预期，示意流水线时空图如下：

![](https://proxy-prod.omnivore-image-cache.app/908x741,sWEnNpEpeo1_Zz_JNHPyPmBrJUl5lzLR9snvrfv3_AjQ/https://pic4.zhimg.com/v2-0e011f64e94a7faf5e1c8b486e5592fb_b.jpg)

1.在现代超标量乱序处理器中，load与store指令大概率并不位于同一执行流水线，此处仅为逻辑上的时空图。 2.在现代超标量乱序处理器中，store指令会被拆分为store data与store address两条微指令，此处简化为了一条store指令。

可见，在没有栈操作优化时由于寄存器相关，执行一个指令块所需的时间约为load指令的load-to-use延迟（视具体流水线设计会有区别，影响因素较多，包括但不限于：1.有无store buffer前递。[2.store](https://link.zhihu.com/?target=http%3A//2.store/) order violation避免机制的设计。）

### 栈操作消除

既然ARM Cortex X1没有栈操作消除，那么Apple M1呢？针对8发射的Firestorm，我们调整指令块如下：

```armasm
str x11, [x10,#0]
nop
nop
nop
nop
nop
nop
ldr x11, [x10,#0]

```

![](https://proxy-prod.omnivore-image-cache.app/756x52,s7A59WmfvQozdgWFfeOTk2_9u97VNJ4k5tkTZnpL7RLY/https://pic4.zhimg.com/v2-59c56177570ebbc6f626d7ae263ede8f_b.png)

仅耗时约1.6 cycle！无疑<strong>M1拥有栈操作的优化</strong>，不愧是ARM阵营的扛把子选手！这样的优化简直可以称之为消除了，倘若load被实际执行，纵使有store buffer的数据前递，其延迟也难以被压缩至1 -2 cycle。

![](https://proxy-prod.omnivore-image-cache.app/806x788,scC2A1xUENWl-xa9sEukVN_H20mNHYNEZ8xPlb50CEpE/https://pic2.zhimg.com/v2-6a9a6b30c6d8ee008d6bd2bb845dba71_b.jpg)

但是故事显然不能仅此而已，不妨看看M1的栈操作消除面对更加复杂的情况表现如何。我们修改指令块，在我们的栈操作store、load对之间加入一条不相关的store指令（操作了不同的地址）：

```armasm
str x11, [x10,#0]
str x11, [x10,#8] //str指令操作位宽为64bit，即8字节；偏移量为8时两条str的地址不会有重叠
nop
nop
nop
nop
nop
ldr x11, [x10,#0]

```

![](https://proxy-prod.omnivore-image-cache.app/720x46,spW6pm1TNqaBQqxYktdSGlBOgNGbBOyD8i9OKZOhYR-o/https://pic3.zhimg.com/v2-6303886cf5ad653c64c391a733601952_b.png)

略有波动，但是栈操作消除仍然生效，看来M1不会被如此简单的手法欺骗。我们添加两对相互嵌套的操作：

```llvm
str x11, [x10,#0]
str x12, [x10,#8]
nop
nop
nop
nop
ldr x12, [x10,#8]
ldr x11, [x10,#0]

```

![](https://proxy-prod.omnivore-image-cache.app/702x40,sfEkH5OXBR8lm1arqq4akBUPT_qV8lJMGzeZpjUhbCRc/https://pic1.zhimg.com/v2-249b447f60fec64b44ab69688cdafcec_b.png)

仍然是两对栈操作，但是并不完美嵌套：

```llvm
str x11, [x10,#0]
str x12, [x10,#8]
nop
nop
nop
nop
ldr x11, [x10,#0]
ldr x12, [x10,#8]

```

![](https://proxy-prod.omnivore-image-cache.app/740x40,sYyLnj_3KtrpB5c-KMzNDA9g_rRottJjjzqIgeWSl8_k/https://pic1.zhimg.com/v2-4a718912fecd46e3800a2d0b739d3de0_b.png)

可以看到虽然消除效果逐渐变差，但是仍然存在明显的栈操作消除现象。我们不再继续增加一个指令块中的栈操作对数，因为M1理论上每周期只能执行2条load指令与2条store指令（其实即便增加到3对，栈操作消除的效果仍然明显存在，但是为了数据的美观性不予展示）。

### 瑕疵初现

一个机制不可能面面俱到，我们肯定能够通过精心构造指令对使其失效；不过在此之前，我们还得请出老朋友：perf stat工具。如果要在M1平台上使用perf工具，为其安装Arch linux是较为方便的选择；只要学会正确指定核心+事件号，其体验与x86平台基本无异。但是如果不想覆盖原操作系统，MacOS上也是可以使用性能计数器的，只是过程相对曲折；本次我在个人日用的Macbook air上使用MacOS进行测试。苹果显然对于自己的性能计数器信息较为忸怩，我们首先要自己从系统目录中获取性能计数器的描述。通过一些手段，我们可以找到a14.plist、a15.plist两个文件，M1使用的是与a14近乎相同的Firestorm，因此我们参考a14.plist中的信息。实际上这两个文件内容近乎一模一样，可见两代处理器的性能计数器部分并无明显变动（或者说开发者可以访问的性能计数器部分并无明显改动）。从中我们挑选出所需的计数器如下：

| Event Name                            | Event Discription                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| FIXED\_CYCLES                         |                                                                                                   |
| FIXED\_INSTRUCTIONS                   |                                                                                                   |
| ST\_MEMORY\_ORDER\_VIOLATION\_NONSPEC | Retired stores that triggered memory order violations                                             |
| FLUSH\_RESTART\_OTHER\_NONSPEC        | Pipeline flush and restarts that were not due to branch mispredictions or memory order violations |
| LD\_UNIT\_UOP                         | Uops that flowed through the Load Unit                                                            |
| ST\_UNIT\_UOP                         | Uops that flowed through the Store Unit                                                           |
| MAP\_STALL                            | Cycles while the Map Unit was stalled for any reason                                              |
| MAP\_STALL\_DISPATCH                  | Cycles while the Map Unit was stalled because of Dispatch back pressure                           |

M1中提供6个可配置性能计数器，足够我们的使用了。接着，我们需要一些手段来访问这些计数器。好消息是实际上MacOS提供了类似的接口，即Kperf动态库；坏消息是这个库并不对外开放；好消息是前人通过逆向工程破解了其信息。然后，我们只需要调用Kperf即可读取所需的计数器；这里使用前人大佬ibireme的框架，将我们的测试程序作为profile\_func嵌入其中，运行效果如下：

![](https://proxy-prod.omnivore-image-cache.app/764x394,stBhGP77JPW51OifExpAQQIO_5s7OeBbbeGySKplU5d8/https://pic1.zhimg.com/v2-b235c7941cebd7127a7fff6d512d0b78_b.jpg)

此时栈操作消除机制正常运作

我们终于可以一窥处理器的运行状态，可见store-order-violation predictor工作得很好，运行过程中仅有极少的访存序引起的回滚。重命名堵塞较多且均由发射队列（对于Apple的设计而言，其实是第一级的分派队列）的反压造成；因为我们的指令块平均需要1.6周期才能执行完成，但是处理器前端每周期都能取回1个指令块，因此大量的访存指令堆积在分派队列和发射队列中，最终导致了重命名阶段堵塞。一切都符合预期。

---

至此，我们终于可以给栈操作消除机制找点麻烦了。栈操作消除可以基于两种较为简单的思路：

1. 基于静态信息，例如操作数的源寄存器号。倘若一对store与load指令用于计算地址的源寄存器和偏移都相同，那我们显然可以推测store与load访问了同一地址，并对它们进行消除。消除的方式多种多样，较为简单的即直接通过重命名机制，将load指令的目的寄存器重命名为store指令的值的源寄存器；但是为了确保这样的消除是正确的，load指令仍然需要被执行，以验证地址的正确性以及它们真的相等，因此只是消除了执行延迟而并非整个指令的执行。
## 2. 基于历史信息，例如指令PC。倘若一对store与load指令曾经访问过相同的物理地址，那我们将它们标记为可能再次访问同一地址，并对它们进行消除。消除的方式可以与上一点近似，同样其也需要被执行来验证正确性。


在具体实现的过程中，无论是上述哪种方式都会遇到各种各样的细节问题，例如如何记录和存储store指令的信息、使用逻辑寄存器号还是物理寄存器号等，下文中我们再详细讨论。

我们不妨尝试在不改变指令块大小和内容的前提下，改变内部指令的排布，使得store与load指令不再分布于指令块的两端：

```armasm
str x11, [x10,#0]
nop
nop
nop
nop
nop
ldr x11, [x10,#0]
nop

```

![](https://proxy-prod.omnivore-image-cache.app/748x322,s7OKCphOhluW4wwGKwaEUXqefI153Y2yVx_2pjZI30BI/https://pic4.zhimg.com/v2-d339a1d91f1b2dec2742b32b694fa4db_b.jpg)

有明显的栈操作消除，现象和之前相比似乎并没有什么变化。我们更进一步，再将load指令向上移动一个槽位：

```armasm
str x11, [x10,#0]
nop
nop
nop
nop
ldr x11, [x10,#0]
nop
nop

```

![](https://proxy-prod.omnivore-image-cache.app/766x314,sVBixGWXcyuLYXiZalq8Fy9IXvgWZVv7MoaeRAQxtTA0/https://pic4.zhimg.com/v2-205a87a4e39e32e26e17c47dbc2325cb_b.jpg)

异常出现了，栈操作消除的效果仍然存在，因为其执行时长小于load-to-use延迟，但是又明显高于之前的延迟，这<strong>说明栈操作消除并非百分之百成功</strong>。不是每一对store-load指令都被消除，而是呈一定概率被消除，进而将load-to-use延迟与栈操作消除的延迟按一定比例混合了；而在这种情况下，栈操作消除的成功率下降了。我们继续将load指令向上移动，直至与store指令紧邻：

```armasm
str x11, [x10,#0]
nop
nop
nop
ldr x11, [x10,#0]
nop
nop
nop

```

![](https://proxy-prod.omnivore-image-cache.app/746x316,sgb2Z25_br4SLr3g1oIywViNmHgNsdRXLLqprBat6DBY/https://pic2.zhimg.com/v2-9015ec46dfb42765a095722e1884688d_b.jpg)

```armasm
str x11, [x10,#0]
nop
nop
ldr x11, [x10,#0]
nop
nop
nop
nop

```

![](https://proxy-prod.omnivore-image-cache.app/756x312,s5jFmCe8ftQUJCeq-TV2AmStEb0G5nA-iThqdjPVf5vY/https://pic2.zhimg.com/v2-ea2f7632d308a24b6f7f6ef6e5c4b675_b.jpg)

```armasm
str x11, [x10,#0]
nop
ldr x11, [x10,#0]
nop
nop
nop
nop
nop

```

![](https://proxy-prod.omnivore-image-cache.app/738x312,sF5RDuTW64SRNdhmneCTeAxo17oqfQawJ9e_jlhWz8Zk/https://pic4.zhimg.com/v2-c4fb0cc1d82d6e5746c66736e32e285b_b.jpg)

```armasm
str x11, [x10,#0]
ldr x11, [x10,#0]
nop
nop
nop
nop
nop
nop

```

![](https://proxy-prod.omnivore-image-cache.app/750x312,skthPTbYGmBXBZbWxoRkFf_O-a7zqOOAQW6_y8Oab6is/https://pic3.zhimg.com/v2-693b2498d585ccbdb2486ff6b7fb665e_b.jpg)

我们可以观察到几个异常现象：

## 1. 随着store与load指令的间距越来越小，栈操作消除的成功率越来越低。

## 2. 当store与load指令紧邻时，栈操作消除机制近乎完全失效（不发生）。

## 3. load每上移2次，栈操作消除的成功率才变化一次。


这三个现象包含了海量的信息。我们可以由此推测，<strong>苹果的栈操作消除是基于静态操作数信息的消除，并未使用历史信息</strong>；而且<strong>并未优化当store与load指令在同一周期被译码和重命名的情况</strong>。

## 1. 已知随着store与load指令间距缩小栈操作消除的成功率变低，说明栈操作消除的判断机制与指令的槽位有关。

## 2. 由1推演可知，指令的槽位实际上代表了指令在Cache行内的位置，不同的位置会使得它们进入处理器后位于指令包内的不同槽位。

3. 由于我们构造的指令块总是由nop指令填充至8条（恰好是M1每周期能够取指和译码的指令数量），我们不妨将一个指令块视作处理器流水线内每周期得到的指令包。由于nop指令在译码级才会被消除，因此每个指令包在到达译码级时仍然为8条指令；经过译码级后只剩下store与load指令需要重命名。
4. 由3推演可知，在流水线未被塞满时，每周期我们能够向处理器的后端填入1条store指令和1条load指令（nop指令在译码级被消除，无需被真正执行，直接标记等待提交即可）；而即便在理想情况下（1.6 cycles per block）栈操作消除也无法使我们每周期执行一个指令块（1 store + 1 load），因此处理器后端在经过一定时间后会由于访存队列满而产生反压；反压进而导致发射队列和分派队列也被填满产生反压；最终导致流水线停顿（重命名级和更早的流水级阻塞），性能计数器的数值印证了这一点：重命名级经历了相当数量的停顿，约1/3的总cycle数；且基本100%来自分派队列的反压。

![](https://proxy-prod.omnivore-image-cache.app/763x315,sAawLa3Ny80Xt3ZdM10_4BLz3-H3LeMFi4RWdhi9sVYY/https://pic3.zhimg.com/v2-9cf58995f697ff6e7e06feca066d43e2_b.jpg)

5\. 由4推演可知，一旦处理器进入阻塞状态，由于每周期只能执行并提交平均1.6条指令（不妨以理想状态推演）即1-2条指令，可以预见重命名级每周期也只能向分派队列发送1-2条指令。同时由3已知重命名级最多只会同时存在2条指令，因为nop指令在进入重命名级前被消除了。

6.已知重命名级在被清空前无法接受下一个指令包，否则维护指令序关系异常困难。

7\. 由1、2、5、6推演可知，<strong>M1的译码级支持每周期向重命名级送入少于一个指令包的指令</strong>。否则，无论指令位于指令包的哪个槽位，对于译码和重命名级都是等价的，不会造成栈操作消除效果的波动。

8\. 已知load每上移2次，栈操作消除的成功率才变化一次。

9\. 由7和8推演可知，<strong>M1的译码级最小支持以2条指令为粒度向重命名级发送指令，槽位0-1、2-3、4-5、6-7可以分别进入后续流水级</strong>直至所有指令清空，随后译码级接受下一个指令包。

综上可知，store与load指令的间隔大小与它们同时进入重命名级的概率密切相关，间隔越小同时进入重命名级的概率越高，而同时进入重命名级意味着栈操作消除失败。由于译码级只支持槽位0-1、2-3、4-5、6-7分别进入后续流水级，因此在槽位移动小于2时对处理器而言是等价的，我们不会观察到栈操作消除成功率的变化；同时也意味着一旦store与load指令紧邻，它们近乎一定会同时进入重命名级，即一定会使栈操作消除失效。

---

至此，我们发现了苹果M1栈操作消除存在的证据；初步推演了M1栈操作消除机制失效的原因。那么为何store与load指令同时进入重命名级会使栈操作消除机制失效呢？我们下篇再见，届时将还原M1栈操作消除的实现细节，并揭示M1 ICache和流水线内设计的冰山一角。

![](https://proxy-prod.omnivore-image-cache.app/448x368,sSDQnaIxPK3p6V_NDWL7QiC6hnwYPS_cpSz4VFHTeyIY/https://pic1.zhimg.com/v2-b2c4cb0c71ffc93efd7c01001d4513dc_b.jpg)

（太长了，字数太多，只好忍痛分成两篇水了）

