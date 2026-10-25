---
title: 从裸机启动一个C++程序实战操作
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-11/从裸机启动一个C-程序实战操作/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: f71c9157-104e-46a3-8442-9dcca01cb6ba
---

# 从裸机启动一个C++程序实战操作
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-mp-weixin-qq-com-s-ao-8-w-i-p-b-ar-qg-pbh-rapbb-q-18ec8fcde40)
[Read Original](https://mp.weixin.qq.com/s/AO8w_iP_bArQGPbhRapbbQ)



![cover_image](https://proxy-prod.omnivore-image-cache.app/0x0,sxkW1D1akRojEotyD_l0WndyZUiQv6UtKmnFVzKnZR6k/https://mmbiz.qpic.cn/sz_mmbiz_jpg/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybicnCDKDBhyzoK5rRf4vvqUxhY3icsic1Yax92mXUHegBvMJbhiba1VD9Aw/0?wx_fmt=jpeg) 

原创  腾讯程序员  腾讯技术工程 _2024-03-28 18:00_ _广东_ 

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sE3l8M7uenswFpwJjE2elBgP3qvTjBwJrd8UhB4v0EZ4/https://mmbiz.qpic.cn/mmbiz_gif/j3gficicyOvasIjZpiaTNIPReJVWEJf7UGpmokI3LL4NbQDb8fO48fYROmYPXUhXFN8IdDqPcI1gA6OfSLsQHxB4w/640?wx_fmt=gif)

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sfLGfb8Z0s8Be2L9U0ZL3YlvkzSHlv70PBMX1xd9hv8k/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvauCTKmIUakdm23FkH2QA8wNyhWQkhLdrEXxOJslKicflGTqKdANHNXOcibGhcJ5fWVic0UbTNNhFJ3Vw/640?wx_fmt=png)

作者：boreholehu

### 前言

对于一个C++程序员来说，可能更多是是每天都在跟各种上层语义、设计模式、软件方法等等在打交道。但对于「一个C++程序是如何运行在机器上的」这件事可能会比较陌生。有时，遇到一些问题，在宏观角度看起来可能比较难以解释，但其实从底层出发，就能发现这个问题其实根本不算问题。类似的问题有：

1. 空指针到底能不能访问？(`int *p = nullptr; *p = 5;`)
2. 给一个变量取地址，取到的是不是物理地址？(`int a; std::cout << &a;`)
3. 操作一个常数地址是否合法？（`*(int *)0xa0000 = 0x41;`）
4. 全局变量、静态局部变量、字符串字面量等在内存中是如何布局的？
5. C/C++程序如何编译为内核代码，运行在内核态程序上？
6. gdb过程中，看到的寄存器是否是真实的？

上面这些疑问，有一些是被读者问到的，还有一些是笔者曾经思考过，但没有很快解决的。与此同时，笔者发现，中层、通用性的教程比比皆是，但高层和底层的、专精型的教程却是少之又少。很多问题可能其实很简单，但就是搜不到相关的教程。笔者也曾尝试到一些系统讲解底层的书籍中寻找答案，但也发现，它们在各自突出的领域中讲解地很详细，但对于上下层串联的部分却总是有缺失，导致各个领域的知识是破碎的，难以关联在一起，以建立一个更加宏观的体系。

于是在经过了一系列研究和实验之后，笔者决定起笔这一篇文章。在这篇文章中将会介绍：

1. x86体系的结构和启动过程
2. 如何编写一个简单的MBR(Master Boot Record)，然后进入内核程序
3. 如何从用C/C++来生成内核程序（包括编译、链接、转载的方法）
4. 站在内核的角度看到的内存结构是怎样的
5. C/C++程序的内存分布是怎样的，各部分加载到内存中的形态是怎样的
6. C代码和C++代码编译方式的异同

关于本文，有以下几点说明：

1. 本文的底层逻辑以x86体系为例，C/C++代码也会生成x86体系的机器码。
2. 虽然我们的项目是x86架构的，但即便你使用的是ARM架构的设备（例如搭载苹果自研M系列芯片的Mac）也没有关系，笔者会介绍可以在ARM版macOS上编译和运行x86程序的方法，会使用跨平台运行的模拟器。
3. 本文使用到的工具都是业界通用的、能轻易在网上下载到并且很容易找到对应说明文档的软件，不会使用笔者自研的黑盒程序，并且会详细介绍每一种工具的部署、使用方法，保证读者可以完成实验
4. 对于一些历史发展历程，和一些历史遗留问题的诞生，笔者会花一部分篇幅来「讲故事」，如果读者不感兴趣，则可以跳过相关的篇幅，直接看结论即可。

如果你准备好了的话，我们马上开始！

#### x86体系架构

相信读者对x86这个词肯定不陌生，那么它到底指的是什么呢？

##### 指令集

对于一个CPU来说，其实就是一个高集成的逻辑电路。如果你玩过数字电路的话，一定会知道所谓的「与」「或」「非」门电路，用这些门电路组合起来，我们就可以实现更多更复杂的功能。

不过逻辑电路再复杂，无非也就是把「一组输入的电信号」转换为「一组输出的电信号」，这就是它最基本的功能。比如说，某一个芯片有3个输入引脚，2个输出引脚，当我给输入引脚分别给「高电平，高电平，低电平」的时候，它能在输出引脚给我「低电平，高电平」这样的信号。在刚才这段描述中，「芯片的输入、输出引脚个数」称为「芯片的接口规模」，而「当给XXX输入信号的时候，能给我YYY输出信号」则称为「芯片的逻辑功能」。

因此，我们把那些「可以用来输出的信号」就称作「指令」，而这个芯片能够支持的所有「指令」的集合，就称为「指令集」。因此，一个CPU的指令集直接决定了它的原始功能。

而x86体系架构使用的这种指令集，我们就可以叫他x86指令集，用来描述所有x86体系架构的CPU能够支持哪些指令。

当然，除了最核心的指令集以外，「体系架构」自然还包括CPU的其他部件要有哪些，以及跟外部硬件应当如何交互。总之，我们可以认为这是一套协议标准，当我们使用了x86体系的CPU以后，它一定会含有哪些部件、怎么给它指令它就能正常运行、外部的硬件应当如何布局等等这些问题就已经确定了。我们只需要按照它所规定的协议来编写程序，就可以在这个体系上正常运行了。

##### 为什么叫x86？

解释完x86是什么了以后，相信一定会有读者好奇，这种架构为什么叫这个名字？它和我们现在市面上主流的硬件设备是什么样的关系？

故事要从1978年开始说起。1978年，Intel公司推出了一款CPU，型号叫8086（至于为啥叫这个数字，估计只能问Intel了……）。其实在当年，这款CPU也没激起多大的浪花，我们现在大家都去研究它，也不过是幸存者偏差罢了。所以我们只需要知道，20世纪70年代末，一个姓英的公司（英特尔）发布了一款芯片，型号为8086。

8086芯片没有太大的动静，这有一个非常关键的问题，就是它太贵了！因为它要卖360美元一个。注意！这仅仅是CPU的价钱，没有算其他的硬件。所以能用得起的一般都是极个别的企业，个人用户可谓望尘莫及了。而真正让这个系列的芯片火起来的是8088。

8088我们可以认为是8086的一个精简版，或者我们可以戏称为「8086 SE」\~。1981年，IBM使用了8088芯片，生产了面相个人的PC，价格亲民，因此在全球范围内火了起来，也就带动了这个系列的芯片的销量。

此后，Intel就开始了这个架构的CPU的研发迭代，后续又推出了80186、80286、80386。它们都兼容8086的工作模式，但在这个过程中还是出现了一些小插曲（或者可以理解为小bug，这个后续章节会涉及）。

由于这个系列都以86结尾，因此就管这个系列叫做「x86」系列。但注意，「x86架构」则是专指80386以及以后的芯片，而不包括8086、80186和80286，原因我们会在后续章节解释。

直到1992年，本应叫「80586」的CPU诞生之前，Intel因为一些商标版权的问题，使得这个系列不得不改名，当时的80586上市时，名为「Pentium」，中文译作「奔腾」。

后续Intel又发布了「Celeron（赛扬）」系列，还有「Core（酷睿）」系列，以及「Xeon（至强）」系列，都沿用了x86架构，Intel将其称为「IA-32架构」，它们都保持着向下兼容。

##### x64和x86的关系

故事的转折点在2001年，那个时候有人觉得x86架构有缺陷，不应该继续沿用，于是推出了一款全新的架构，称之为「IA-64」架构，并推出了这个架构的处理器——「Itanium（安腾）」系列。

这里的IA指的是Intel Architecture，而64表示它的指令字长（后续会重点解释）。本来这个命名的目的也很明确，曾经的是「IA-32」，现在重新设计以后叫做「IA-64」。但是因为它并没有向下兼容IA-32，并且价格昂贵，因此在个人PC领域并没有溅起水花。而它主打的服务器领域则是没有拼过IBM的PowerPC，所以也没有太多市场。这也导致了安腾系列的CPU至今都不是很出名。

IA-64不成功，但另一个64位架构却火了，这就是AMD公司在1999年首次推出的AMD64架构。后续AMD64架构被广泛用于个人PC上。那么，AMD64的魅力在哪？其实就在于，它兼容了IA-32架构，并在此之上进行了扩展。因此，AMD64架构也被称为「x86-64」架构，也就是扩展64位的x86架构。

所以这里就有一个很有意思的现象，IA-64作为IA-32的继承者，并没有兼容IA-32，并且没落了。反而是AMD64夺得了王冠，向下兼容IA-32。由于AMD64架构的成功，后续也被Intel所使用，并将其命名为Intel 64。

其实Intel 64和AMD64基本没有区别，主要还是商业竞争中刻意区分了它们。但是硬件厂商的这些商业竞争，对于这些软件公司来说无足轻重，他们只关心，我的软件适配哪种架构，就够了。因此，他们无论描述为「AMD64」还是「Intel 64」，都似乎有站队的嫌疑，而又因为Intel 64和AMD64其实就是同一套架构，因此这些软件厂商又把这种架构称为「x64架构」，其中「x」你自己脑补把，Intel也行，AMD也行。

因此我们总结一下：

1. x86架构又叫IA-32架构，是从Intel 80386芯片开始所使用的架构，向下兼容8086和80286架构
2. IA-64架构不兼容IA-32，仅用于Intel Itanium系列
3. x86-64架构向下兼容IA-32架构，又被称为AMD64架构和Intel 64架构，进而合称x64架构，目前市面上绝大多数的个人PC使用的就是这种架构（包括Intel的酷睿、至强，AMD的锐龙系列）

值得注意的是，由于x64是向下兼容x86的，因此在很多人口中，并不会区分它们，又因为x86架构已经过时很久了，现在很少有设备会去使用。因此有时我们听到「x86」其实指的就是x64架构，尤其是跟ARM架构放在一起描述的时候（比如我们经常会说，苹果从x86转向了ARM，但其实这里的x86指的是x64，而非真正的IA-32架构）。

所以为了避免混淆，笔者在本系列文章中，统一用「IA-32架构」和「AMD64」架构的名称，而不使用「x86」这种可能有二义性的词汇。

##### 为什么选择AMD64架构？

因为这是当前市面上使用最多的架构。随处可见的Intel Core处理器，AMD Ryzen处理器使用的都是AMD64架构。并且，最常用作服务器的Intel Xeon处理器也是这个架构的，所以我们了解最主流的架构自然是不亏的。

另一方面，也正是因为这是目前的主流架构，因此它的相关资料也是最全、最好找的，黑盒较少，比较透明，所以学习门槛较低。计算机底层专业课程的各主流教材也都是选用了这个架构为例进行讲解的。

既然我们是为了理清程序的构建和运行相关知识，那么架构这里就不要让它成为我们的极大困难点，于是，笔者「毅然决然地」选择了它。（偷笑，其实是因为别无选择\~）

### 搭建虚拟环境

了解完这个架构的情况以后，我们接下来要做的就是找机器，然后进行开发了。

#### 硬件环境

既然是要给AMD64架构的设备进行开发，那么首先，我们得先有一个AMD64架构的硬件设备才行。首先最容易想到的，就是真实地搞一台AMD64架构的电脑。

这方法最直接，但是成本有点高，而且装载程序可能没那么方便。当然了，如果你手边正好有空闲的设备，或者已经不用的老设备，那自然无可厚非。你可以把程序直接运行在真机上，也会有一个不一样的体会，而且满满的仪式感，很酷！

#### 虚拟环境

如果没有，那也没关系，因为我们可以用虚拟机。关于虚拟机的运行，通常有两种方式：

1. 通过虚拟化（Virtualization）技术运行
2. 通过软件模拟（Simulation）运行

这里\~翻译必须出来背个锅了！Virtualization和Simulation是完全不同的两种虚拟技术，但这里的翻译似乎完全没有把它们区分开，「虚拟化」和「模拟」到底什么区别？反正，从字面上……我是区别不开…………

那么这两者究竟指什么呢？首先我们要知道，要想通过软件的方式模拟一台硬件设备，那这个「软件」应当是运行在已经良好运行的操作系统上了。换句话说，我们要用操作系统开启一个应用程序，然后在这个应用程序中，模拟出硬件设备的各种部件，再利用这种模拟出的部件来执行指令。

##### 软件模拟方式

那么最容易想到的就是用「纯软件」的方式来模拟。比如说我设置一个变量，用来表示`rax`寄存器，设置另一个变量来表示`rip`寄存器。再设置一片内存空间来表示模拟器的内存空间。之后，当我接收到类似于「把`0x10`内存空间的值写到`rax`寄存器中」这样的指令时，就把对应内存空间中，偏移量是`0x10`的值，赋值给用于表示`rax`寄存器的变量中。大致上用简单的代码来表示就是：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`uint64_t rax; // 用于模拟rax寄存器
std::byte mem[1024 * 1024]; // 用于模拟1MB的内存
// 执行将内存数据读取到rax中的指令
void load_mem_to_rax(std::ptrdiff_t address) {
  rax = *reinterpret_cast<uint64_t *>(mem + address);
}
`

由此方法，模拟出所有硬件部件和所有指令集中的指令，那么自然就可以模拟出硬件设备的运行情况。

上面这种模拟方式就称为「Simulation」方式，或者叫「软件模拟」方式。

这种方式的优点非常明显：

1. 不受目标机器架构的影响，也就是说，我们可以在ARM架构的电脑上运行AMD64架构的模拟器，反之亦然。
2. 可以实时观测和修改模拟硬件的值。这种优势更加明显，由于CPU的微指令更改的仅仅是CPU内部部件的值（比如说寄存器）或者内存某个数据的值。这些更改如果不能显示到屏幕上的话，我们就没法观测到。但如果我们用的是纯软件模拟的机器，那观察这些值就变得无可厚非了，因为它们本质上只是这个进程当中的变量而已。这个优点甚至是我们使用真机都无法比拟的。

当然，它的缺点也非常明显，那就是性能底下。试想，一条软件模拟的「内存读入寄存器」的指令，被软件模拟成了不同变量之间的赋值，这过程还有不少程序逻辑，还有本身OS的调度算法等等。中间隔了这么多层，CPU真实运行的指令早都不知道被扩大成多少条了。因此，这种方式的模拟器，它的性能下降幅度是指数型的。

##### 虚拟化方式

随着虚拟机的使用越来越普遍，市面上主流的OS都开始重视了这个问题。因此，从OS层就已经包装了用于虚拟化的API。然后，「虚拟机」这个APP直接调用OS提供的虚拟化API来完成模拟。

这种技术并不是再完全使用软件模拟硬件情况了，而是会「尽可能多地」直接使用硬件。例如虚拟机中要执行「内存`0x10`数据读取到`rax`寄存器中」这样的指令，通过虚拟化API，CPU会真实地执行一条从内存中读取数据放到寄存器中的指令。只不过这片内存空间并非`0x10`（OS会做一层映射），这个寄存器也可能不是`rax`。

因此，通过虚拟化API运行的虚拟机软件，会被OS认为是一种特殊的进程，对内部执行的指令仅仅做简单的映射，就直接交给硬件去执行。但所以一条指令对于CPU来说可能只是会变成几条指令而已。它的性能下降幅度是线性的，如果优化的好的话，这种下降幅度可能会非常小。

由于这种方式依赖于OS所提供的「虚拟化API」，因此这种方式被称为「虚拟化」方式。

对比软件模拟方式，虚拟化方式的优点非常明显，那就是性能显著提升。但与之相对的就都是它的劣势了，比如说它不能跨架构模拟，也不容易直接观测到硬件的状态。

##### 静态转义方式

其实还有一种模拟方式，它介于前面介绍的两种之间，适用于跨架构模拟。更准确地来说，并不是「模拟」，而是「转义」。

举例来说，我希望在ARM架构上运行AMD64架构的程序。那么在运行之前，我先读一遍原程序，比如说当它出现「把数据加载到`rax`寄存器中」指令的时候，我就想，嗯……虽然我的ARM架构中没有`rax`寄存器，但是，我可以用其他的寄存器来代替，比如说`x0`。那我就把所有要给`rax`中写数据的指令，都翻译成给`x0`寄存器中写数据。

形象点来说，就是在运行一个程序之前，先「读懂」这个程序，然后翻译成当前架构的新程序，然后再去运行。

这种模拟方式，性能损耗在「模拟」和「虚拟化」之间，如果优化的好也可以获得不错的性能。但它最大的缺点就在于，对这个「翻译软件」的要求太高了！通常只适用于运行APP，而不能用于运行OS。并且「翻译软件」不仅要对翻译前后的架构指令非常清楚，还要对OS的调度方式了如指掌才行。

这种方式有一个非常典型的例子，就是苹果公司的Rosetta，也只有苹果公司能够同时对新旧指令架构和macOS都了如指掌，所以他能做出Rosetta也就不足为奇了。

#### 在主流平台上搭建虚拟环境

了解完虚拟环境之后，试问读者，我们应当用哪一种呢？

首先，咱们只是写一些非常简单的程序，目的是学习和梳理底层的知识，所以远到不了考虑虚拟机性能折损的情况。

其次，咱们需要观测到硬件的执行情况，需要随时了解寄存器和内存当中的数据。

最后，我相信还有不少小伙伴跟我一样，用的是苹果自研芯片的Mac，这玩意本身就不是AMD64架构或者IA-32架构的机器，必须进行跨架构模拟。

那么结论就显而易见了，我们将会使用「软件模拟」方式。用到的软件是`bochs`，这是一款AMD64模拟器，并且支持非常强大的调试指令，非常适合我们当前的诉求。接下来就为大家介绍如何在macOS和Windows系统上配置`bochs`。

##### 在macOS上配置bochs

`bochs`是一个AMD64模拟器，我们可以在它上面运行AMD64架构、IA-32架构、80286架构甚至是8086架构的程序。但`bochs`本身是跨平台的软件，因此，无论你用的是Intel芯片的Mac还是苹果自研芯片的Mac，都可以安装`bochs`。

虽然我们也可以从`bochs`官网下载源工程然后构建安装，但是环境配置以及各种依赖软件搞起来太麻烦了，所以我们选取一种最简便的方式，使用Home Brew。

Home Brew是Mac上的开源软件管理器，类似于Debian中的apt-get和RedHat中的yum。但它并没有集成在macOS中，所以我们需要先安装它。

这是[Home Brew的官网](https://brew.sh/)，但由于众所周知的原因，它的默认资源在中国大陆是访问不到的，所以我们需要使用镜像资源。有一个国内的大神制作了一个安装Home Brew，并将资源库替换为镜像资源的一个脚本，我们可以直接使用。

打开终端，执行下列命令：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`/bin/zsh -c "$(curl -fsSL https://gitee.com/cunkai/HomebrewCN/raw/master/Homebrew.sh)"
`

会自动下载这个脚本，然后依据提示指定一个镜像源，输入系统密码，然后安装Home Brew。

由于Home Brew所在github的DNS有过一起污染事件，所以如果当你使用时出现类似于下面的这种报错时：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`Warning: No remote 'origin' in /opt/homebrew/Library/Taps/homebrew/homebrew-cask, skipping update!
`

这时我们可以执行下面的指令来解决：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`git config --global --add safe.directory /opt/homebrew/Library/Taps/homebrew/homebrew-core
git config --global --add safe.directory /opt/homebrew/Library/Taps/homebrew/homebrew-cask
git config --global --add safe.directory /opt/homebrew/Library/Taps/homebrew/homebrew-services
`

当安装好Home Brew以后，就可以通过下面的指令来安装`bochs`：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`brew install bochs
`

安装完毕之后，我们执行：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`bochs --help
`

如果能顺利打印出帮助信息，那么恭喜，`bochs`已经安装成功！

##### 在Windows上安装bochs

同样地，由于`bochs`是跨架构、跨平台软件，因此也可以在Windows上正常运行，也包括了ARM架构的Windows（例如搭载了骁龙8cx芯片的电脑，就是ARM架构的）。下面介绍在Windows上安装bochs的方法。

首先在[SourceForge网站](https://sourceforge.net/projects/bochs/)上下载`bochs`的安装包。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sSVRdWR8RG2f7LTBM4tzxy7gLIBvshRcfGsz9Sv_twXc/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybibMvCEE2gvCBVLDjs92jMLicZsDaOJMiajAnD2VRRoU5EGoRkQRZSlEUA/640?wx_fmt=png&from=appmsg)

下载完毕后双击进行安装。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sJI948RLaPkMUSJlCx1AW_7ohuPKL8isIvL8mtskHka4/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybZBFuCF2lQkeHgW2ISdmapzQdIT3FXInRwIJR6ibNbWpYwR96ibBeicToQ/640?wx_fmt=png&from=appmsg)

安装过程中的选项保持默认即可。等安装完毕后，可以在开始菜单中找到bochs，这里我们不要直接运行，而是选择下面的`Folder`文件夹打开。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s0YSakzm26ZHUJAuU3kDvzSSg7QgPGUykq9QZN8iG7NA/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybYBnCW5Sss1u1Oojuk6UHqA5OkXbj2In0EiaQdLJSVBkrx7oX53kglUg/640?wx_fmt=png&from=appmsg)

打开后我们选择`bochsdbg.exe`打开。注意，在Windows中的`bochs`默认是不带调试功能的，必须要运行`bochsdbg`才可以进行调试。本文后续所有要求运行`bochs`的地方，对于使用Windows的读者，都要换成`bochsdbg`。（包括命令行、makefile中填写的也应当是`bochsdbg`而不是`bochs`，请读者一定要注意！)

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sZz66PGLmQTWRsoXAWsAk9wtnzVQVUcZUzWP2ywxmQ-k/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybMVE2qtbwGiaqBmiaRTJ45ZhZF1jDL1ZvAYaibZS93pTGXYg3Zkic7icSpAA/640?wx_fmt=png&from=appmsg)

打开之后，可以选择左侧Load按钮加载`bochsrc`配置文件运行，后续如果我们用命令行加`-f`参数后则无需手动加载。现在暂时也可以不用加载配置文件，直接用默认方式执行，点击右侧的Start即可看到运行效果。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sgjC2ReM8zwY3EU_yYo9-z9cGiSAWv7bMl-WNQYJ0sfQ/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybvBQMKftBAVicibCKmiaO9tnDicExpgkOdlnicHHydwfnuhSibmpIhNdxff5w/640?wx_fmt=png&from=appmsg)

之后便可以看到`bochs`的运行状态，左侧是用于调试的命令行，右侧是虚拟机的显示效果。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sfZSXOCfDL5UdUfKxg3kA_gVqLQBcoJMLKLsVLQcy7KQ/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb0bicTuqibYFXTXA9BG2Vx9ic01QDUuDEOibJZ750bDAUKTkWNPlk5tic4xA/640?wx_fmt=png&from=appmsg)

### 运行在8086上的第一个程序

既然硬件环境已经就绪了，那接下来，就要想办法让它运行我们的程序了。不过在此之前，我们必须要了解一下8086的主要架构，以及执行程序的方式。

#### 为什么要了解8086

话说，我们不是要研究AMD64架构嘛，干嘛要扯这几十年前的这款胡子都老白了的这款CPU爷爷呢？其实我们在前面介绍AMD64历史的时候就提到过，IA-32也好，AMD64也好，它本质上并不是完全新的架构，而是保持着向下兼容的。

一方面来说，IA-32和AMD64都是从8086模式开始启动的，在开机的那一瞬间，你的电脑其实就是8086，然后再通过一些配置，切换到286模式、386模式、AMD64模式等等的。因此，要想在AMD64架构的裸机开始加载程序，8086的工作方式我们是避不开的。

另一方面来说，从IA-32和AMD64架构中来看，其实它还是有很浓重的8086风格，主干框架并没有大的变动，因此，了解了8086以后，自然而然也就了解了AMD64的其中一部分了。

因此，我们有必要在那些额外扩展的环节之前，先来了解一下8086。

#### 8086体系架构

我们要了解8086体系的计算机中的几大硬件，它们是：

1. CPU
2. 内存
3. BIOS
4. 硬盘
5. 显卡
6. I/O设备

CPU是核心，我们放后面来讲，先讲讲内存、硬盘（外存）和显卡。

##### 内存和外存

「内存」这个词感觉在近年来，已经被移动设备行业的术语给“污染”了。因为我们常说的「手机内存」其实指的并不是计算机领域术语中的「内存」。

内存，全称「内部存储器」，英文名称是「Internal Memory」，又被称为「主存」。之所以叫「内」，这也是有历史原因的。因为早年，内存并不是一个独立的硬件，而是直接将内存颗粒焊死在主板上的。

所以，以这个核心的元器件作为边界，在「里面」的存储器就叫内存，然后在这个体系外部的就叫做了「外存」。

还有一个原因在于，内存是可以直接和CPU交互的，而外存则不可以，它必须通过I/O接口，将数据先通过内存，然后才可以被CPU处理。

内存一般使用的是电路方式存储，比如说由晶体管组成的双稳态电路，通过电路的电压来表示比特位的信号。这种存储方式的优点就是读写速度会很快（毕竟是电路实现），而缺点就是，依赖持续的电力。换句话说，如果断电了，数据就会丢失，重新上电以后，里面的数据是什么是不一定的（随缘，非常的薛定谔），得重新写入以后才会可用。

所以，移动设备行业里所谓的「手机内存」，指的显然不是这个意义上的内存。这其实也是划界的问题，因为手机内存中的「内」是相对于SD卡而言的，手机里自带的存储就叫了个「内存」。但计算机专业领域中的「内存」则是体系结构的内部。（后来也是因为手机内存这个称呼已经有了，再想提及手机里真正意义上的「内存」的时候，又不得不加定语，叫了个「运行内存」。所以用计算机专业领域的概念来说，「手机内存」其实是「外存」，「手机运行内存」才是「内存」）。

我们再来说说外存。外存自然就是前面说的那一套之外的存储设备咯，像是早期的软盘。你想想啊，机器里其实只有一个软驱的，要用的时候，把软盘插到软驱里，再来读取数据。所以，这个「软盘」不就是「计算机外部」的存储设备吗？这样解释可能更容易被接受。

当然，像是硬盘、光盘、U盘等等这些，也都属于外存，虽然硬盘一般是放在机箱里面的，不会频繁插拔，但不影响它在体系结构中的角色。

外存一般用非电路方式存储，像是软盘、机械硬盘采用的就是磁性存储，通过磁头去感应某一个位置磁粉的N极或S极来识别比特位。而光盘则是采用光返性质存储，驱动器来识别某一位置的反光性来识别比特位。再像是U盘（闪存盘）、固态硬盘这些则是用浮栅层来存储，通过栅格中的电子数来识别这一位置的比特位数据。

既然是非电路方式，那么它就不怕掉电，数据将会更长久地保存。不过相对地，它的读写速度就会慢很多。

##### 显卡

显卡，全称「显示适配器」，英文是「Graphics Adapter」。顾名思义，就是用来把信号变成画面，呈现在显示器上的硬件。

在早期，显卡的作用仅仅是用来做信号转换，在内存当中会分配一片专属区域，供显卡来使用。显卡就是不断地读取这片内存区域的数据，然后把它按照一定的协议方式，转换成显示器上的图像。当需要变换显示的东西的时候，CPU就会改写这片内存空间，这样在下一帧的时候，显卡就会按照对应的要求，变换显示的图像。

在这套体系当中，图形的处理完全是由CPU来承担的，而用于显示输出的数据，也是由内存的一部分来承担的，我们把这片用于显示画面的内存区域叫做「显存」。

然而后来，随着人们对图形质量的要求越来越高，因此就想到专门搞一个用来处理图像数据的处理器，也就是GPU，GPU也需要自己的主存，也叫做「独立显存」。

稍微多扯几句，现在我们再说「显卡」，默认都是包含了GPU的显卡，而不再是单纯的显示适配器了。随着现代显卡的性能不断发展，在一些对图形性能要求不是那么高的设备上，就考虑不使用独立显卡，而是将显卡（包括GPU）继承在其他部件上，这种显卡也被称为「集成显卡」。将GPU集成在主板上的叫做「板载显卡」，将GPU集成在CPU中的叫做「核心显卡」。不过板载显卡已经被淘汰了，目前如果你的电脑中没有独显的话，那一定是核显。注意，这种情况只是GPU集成在了「CPU这个芯片」当中，但早已不是早期那种，没有GPU的情况了。

##### BIOS

前面我们介绍了内存和外存的特性，不知道读者有没有这样一个疑问：既然CPU只能操作内存，而内存又是断电后数据就消掉了，外存虽然可以长久保存，但是刚开机的时候，CPU又执行不到这里来。那么，开机后CPU到底要执行哪里的指令呢？

这确实是个很严重的问题，所以说，计算机需要一个「固化」下来的启动程序，做一些硬件自检的功能，然后把一份指令从外存读到内存中，再开始执行。承担这个任务的就是BIOS，全称Basic Input/Output System，中文译作「基本输入输出系统」。一般会用一种类似于FPGA的这种ROM，随着新机器的发型，直接固化在主板上了，当然后来也出了一些可升级固件的BIOS。

硬件的问题解决了，还有另一个问题，照理说，BIOS也不属于内存，那CPU要怎么执行到BIOS中的指令呢？Intel解决这个问题的方法叫做「统一编址」，简单来说，就是把一部分内存地址，映射给内存之外的部件，比如说BIOS。对于CPU来说，它会「认为」自己是在通过内存数据线来操作内存，但其实中间的一部分链接到了BIOS中。

因此，当计算机启动的时候，它会先执行BIOS中的指令，BIOS里会把一份代码从外存加载到内存中，然后再来执行它。由于这份代码是程序员完全可控的，因此接下来的事情就由这份代码来完成了。我们把BIOS加载的第一段程序叫做「MBR(Master Boot Record)」。

另外多啰嗦几句，前面介绍的BIOS也是计算机专业领域当中「BIOS」的概念，而现代我们常说的「BIOS」，里面有丰富图形界面，多种功能（甚至可以超频的那种），其实已经不是传统的BIOS了，而是UEFI(Unified Extensible Firmware Interface)。只不过因为它承担着与BIOS类似的作用，所以大家仍然习惯称之为「BIOS」，这一点希望读者悉知。笔者在后续描述中的「BIOS」特指计算机专业领域术语的BIOS，而对于UEFI则会单独称为「UEFI」。

##### CPU

终于讲到了核心的部件——CPU。CPU，全称「Central Processing Unit」，中文译为「中央处理单元」或「中央处理器」，但这个中文名用得不多，一般还是直接叫它CPU。

【注：为了简化问题，帮助读者快速上手，下面的CPU框架结构是简化版的，想知道完整、规范地8086CPU内部结构的读者可以在网上自行搜索。】

CPU有三个重要的部分：运算器（CU, Calculation Unit）、执行器（EU, Execution Unit）和寄存器（Register）。其他类似于缓存（Cache）之类的东西先不讲，因为我们暂时感知不到。

运算器，简单来说就是CPU的原子功能，比如说能做加减法运算之类的。它能做哪些运算取决于它的指令集。

执行器，由它来负责，当前要使用运算器的哪个功能，执行什么样的指令。

寄存器，则是CPU内部用来存放数据的地方，对于软件层面来说，我们主要操作的就是寄存器，因为其他部件都是按照自己的规则去执行的，我们只需要控制寄存器，就可以完成我们希望CPU执行的指令。

照理说，这个时候我应该介绍一下8086的14个寄存器的，但是笔者觉得，前面的铺垫有点太多了，读者可能已经迫不及待想写点程序运行运行了，所以，这些内容，等用到的时候再说吧\~

#### 让机器执行起来

啰里八嗦了那么多，总算是可以开始运行程序了！现在就请打开`bochs`，我们用debug模式来裸机运行一下，看看会发生什么。

对于Windows系统来说，直接运行`bochsdbg.exe`就可以了，暂时还不用加载配置文件，对于macOS来说，需要指定一下显示的配置。我们找一个工作路径（以后项目的代码都可以放到这个里面），例如`~/code`，再里面创建一个文件名为`bochsrc`，这是虚拟机的配置文件，然后编辑里面的内容如下：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`display_library: sdl2
`

主要是因为，`bochs`的显示输出，默认用的并不是`sdl2`，这在macOS上是显示不出来的，所以我们需要指定到这个库。

如果你的机器上还没有安装，那么可以用`brew install sdl2`来安装。

保存完毕以后，在工作路径上通过这个配置文件来运行虚拟机：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`bochs -qf bochsrc
`

即可启动虚拟机，命令行会保持在调试状态：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sEh5YASxdorVJ-pgL89KVYtjIRDpZ2hdGDDXXbLeTADU/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybGibUnsmncUgsMSaNH3zYu7wu1asiaQ05mMKfsD1w0pdr2obvxxkXsG3g/640?wx_fmt=png&from=appmsg)

这时候我们可以输入`c`，回车，表示继续执行，不出意外的话，会弹出虚拟机的显示窗口：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sS6tdtBVvCxeVqImLPXLvId4uJpAxCSBAcI6uQiTQj0E/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybaPfXqWvh2bficI8CicVxSZNmEnKlVvrPwskNfOAvdDU9wdAfhnQgIjfA/640?wx_fmt=png&from=appmsg)

可以看到，BIOS中的指令已经运行完毕了，但是由于它没有搜索到外存，所以最终停在了这里。

很好！接下来，我们只需要把指令给它加载到外存里就OK了吧！你可以想象，现在我们把程序写好了，放到一张软盘中，然后把软盘插到软驱里，再重启电脑，这样的话，BIOS就应当能检测到软盘中的内容，并自动加载到内存里了。

不过对于虚拟机来说，上面这套动作得靠配置文件来完成。打开我们刚才的`bochsrc`（如果你用Windows，之前没有建立的话，现在就该建立了！），加入以下内容（注意，macOS的话不可以删除`sdl2`的配置项哈！）：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`boot: floppy # 设置软盘启动
floppy_bootsig_check: disabled=0 # 打开自检
floppya: type=1_44, 1_44="a.img", status=inserted, write_protected=0 # 使用1.44MB的3.5英寸软盘，取镜像为a.img，开机默认已插入软驱，不开启写保护
`

这样再开机的时候，就可以读取软盘镜像了。那么接下来，我们只需要把要执行的指令，写成这个名为`a.img`的软盘镜像里就大功告成了。

那怎么创建软盘镜像呢？需要用到二进制编辑器。二进制编辑器很多，macOS上推荐使用Hex Fiend，可以直接在App Store中下载到：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sRPn-qSB5cZOfCEL94FwNrzg3_SwCtdnA0G0HINu_MlQ/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb5anNA15icPROSIibMLhwNd2Zbqlvclsic3Q0oTZKcSr2MfwgkkQG4A1tg/640?wx_fmt=png&from=appmsg)

HexFiend

对于Windows来说，可以使用ultra edit，请读者自行安装，如果你实在找不到合适的也无妨，因为我们不可能一直用编辑二进制的方式来写程序，下一章开始我们就改用其他方式了，可以看一下笔者的操作，领悟精神即可。

为了能看到执行效果，我们就把一个数写到一个寄存器里，然后通过`bochs`的调试指令来看看寄存器里的值，如果生效了，那么就证明我们的MBR已经加载并执行成功了。比如说，我们给`ax`寄存器中放一个数值`6`。关于`ax`寄存器是什么后面章节会讲，反正当前只要知道它是一个8086中的寄存器就好了。

那么，把`6`写入`ax`寄存器的命令是什么？这个可以通过查Intel手册知道，应当是：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`B8 06 00
`

`B8`是指令码，表示给`ax`寄存器中存入数据。后面的`06 00`是操作数，因为`ax`是一个十六位寄存器，所以给它应该要放一个16位的操作数。那为什么是`06 00`而不是`00 06`呢？这是因为，8086体系使用小端序，也就是低字节放数的低位。但是在书写数据的时候，我们又习惯从低到高来写，所以就变成了`06 00`，看上去可能有点不适应，但是还是需要大家适应一下\~

那是不是这样就OK了？并不是！虽然BIOS会自动加载数据，但是，BIOS有一个约定，它会检测这段数据的最后两个字节是否是`55 AA`，是才会认为这是一段合法的MBR，才会加载。至于为啥是这俩魔数……emmm……估计没人晓得\~

由于BIOS只会加载512字节（也就是对于软盘来说的第一个扇区），又对后两个字节有标志检测，所以，MBR应当是不多不少正好512字节，并且要在软盘的第一个扇区，这样才能正确被加载。所以，我们补全到512字节，并且把后两个字节设置为`55 AA`，如下图：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s0KBGNjegDHmfFp-TR0C6qZUeQGhWDTCXmknAIds3q6E/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybN4nOLfkJNdata89nuzV4eIer028rmspmPYrg2LEbaegdic6Kofl02Og/640?wx_fmt=png&from=appmsg)

MBR

保存成a.img，就可以使用了！

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sekuUxjsTPEjl8ojgZICuFoRa9pahJt41FAMnUu39VqU/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybib0L7VBrby1gjPr9f0cJj8vBHTlrnVXMiaYuicp2Wyaj0AqiaN45mVl0Lg/640?wx_fmt=png&from=appmsg)

  
然后我们再执行`bochs -qf bochsrc`，（Windows可以先打开`bochsdbg.exe`，然后选择`Load`按钮加载`bochsrc`），注意，现在还不能无脑按`c`，因为我们的MBR里只有一条指令，黑着往下执行的话会观察不到。所以，我们需要打一个断点，让`bochs`执行到这个位置的时候停一下。

那么另一个问题来了，断点应该打在哪？这取决于，BIOS会把MBR加载到内存的哪一个位置。这里的约定是`0x7c00`的位置（同样，至于为什么是这个地址估计也没人知道了\~总之是作为一种约定），那么我们就要在`0x7c00`的位置打断点，所以执行下面的调试指令：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`pb 0x7c00
`

然后再按`c`，这样执行到这一位置的时候就会停下来：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sgBcblStFh2hjGnIqTxv6dQQ0LOhknX62rB1X0_Xu1_0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybSrHCYRNexRWmSWcWG7NpICGoOq505WoZwhDOdkjG2OSzeLTZ7vib0RA/640?wx_fmt=png&from=appmsg)

打断点

停下来的时候，调试页面会显示这样的情况：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sO2afyyzGCBB8gkYOMLv7ukPt1Um0CbCXUlQL9Fvxm54/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybt3MJb1IqmppiaiaRvH9ibGQk3sfiaA5VbcuO6S2dtDRiapYbz8WNNf8tYxA/640?wx_fmt=png&from=appmsg)

调试

注意最下面一行，中括号里的就是当先执行指令的内存地址，也就是`0x7c00`，证明这个断点位置是对的，在继续执行之前，我们先来看一下当前`ax`寄存器的情况，输入`r`指令，回车可以看到通用寄存器的状态：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sDuaTftxMkDxcyeDpviezG8hnh8ixL0ssVQ7hPG4etKM/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybeRU0kSwYyGJ3w3wI6PdVtiblQ6fCsDWtILRLcRuh3Aw5WHPdTC0NMqQ/640?wx_fmt=png&from=appmsg)

寄存器状态

这里需要解释一下，由于`bochs`是AMD64架构的模拟器，所以这里的寄存器都是按64位显示的，它们的扩展情况将会在后续章节来介绍，目前我们只需要知道，要看`ax`寄存器的值，其实就是看`rax`的最后16位（也就是最后4位十六进制位），如上图红框里的，就是`ax`的值，现在是`aa55`。

然后，我们往下执行一条指令就好了，`s`命令是单条执行，只会向下执行一句指令。所以我们输入`s`，回车，再输入`r`来打印一下寄存器的情况：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,srmh0kc8-2jUI1XSWaT94PvuqyMtKLM4_99_tZt5uQLw/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybwaN88gRpxJ00sSIQib5OibmxpKMAVD62icicSMQ03cR2tIDBFymDY5L4Lg/640?wx_fmt=png&from=appmsg)

执行一步

OK，`ax`寄存器真的被改写成`0006`了，说明我们的指令已经成功运行了！

#### 改用汇编语言

不知道会不会有读者跟笔者一样，第一次在裸机上运行一句指令以后会无比兴奋，仿佛打开了新世界的大门，恨不得现在就着手写一片江山上去！但是先别急！因为这种用二进制机器码直接编程的难度也忒大了。我得去记住所有的指令码和指令格式，万一错一个数字那就整个都不对了，况且它可读性也很差呀！谁能一眼看出来`B80600`是什么鬼？

当然了，要是退回到8086的年代，可能程序员真的是这么干的，但是现在，我们有了更方便的工具，这种仿古式的编程方法，稍微体验一下就OK啦。回到上面的指令，既然`B80600`是「给`ax`寄存器写入`0006`这个数」的含义，那么，能否有一个翻译器，把我的这种表意，转换成机器指令呢？

当然有！这就是汇编器，它可以把汇编语言转换成机器码。比如说：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0x06
`

表明给`ax`寄存器中传入`0x06`这个十六进制数，然后交由汇编器将其转换为`B80600`。这样的语言就叫做汇编语言，汇编语言看起来是比机器码要友好得多了吧？

不过成熟的汇编器除了做指令翻译以外，可能还会有一些更方便的功能，类似于编译器的预处理，做一些静态的数值转换之类的工作，但是不同的汇编器支持的汇编语言也会略有不同，业界比较常用的有两个：nasm和gas。

gas也就是GNU的asmmbly(汇编语言)，之所以比较常用，是因为gcc只能将C代码编译成gas格式，后续本篇的示例中，也会使用gcc编译器，编译后的就是gas格式。

nasm是一个比较被普遍认可的汇编器，全称Netwide Assembler。它的优点在于语法简洁易用。在本篇的示例中，对于需要直接手动开发的汇编语言部分，将会使用nasm。

接下来就来介绍如何安装nasm。

### 安装nasm汇编器

首先，登录[nasm官网](https://www.nasm.us/)，点击当前最新的稳定版本（读者看到的时候有可能已经是高于截图的版本了，不过没关系，选择最新的稳定版即可）。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sUMObmZ-eAkwOQnVALEA0cnsEJc9Hb_PkPUlKpZfwXe0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybqIQdxTeicMpoTzs48ib9QQa8ffl02Z9BZyd3sZIUcmsrOPnE2lEJias3Q/640?wx_fmt=png&from=appmsg)

nasm官网

接下来，根据自己所使用的OS选择对应的文件夹，如果你用macOS，就选`macosx`，如果你用Windows，就选`win64`。注意，这里只区分操作系统，不区分你的实际硬件架构，即便你使用苹果自研芯片的Mac，或者搭载骁龙芯片的Windows，这里的软件也同样适用。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,srMaAniXf6VVoce4L_g6NQ-mZIZcZp_49E6I9C8JIPfE/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybttKvUN8pfeaR9Vu0RzLUIWwtaD7F5yibQ2LycGf19Ir7OqyvI3e2Uvg/640?wx_fmt=png&from=appmsg)

下载对应OS版本的nasm

接下来Windows和macOS的步骤会有不同，笔者分别来介绍。

#### 在Windows上安装nasm

由于Windows版本中提供了安装包，因此，比较方法的做法是下载这个`installer`，然后通过自带的安装程序安装到电脑中。当然，如果你对搭建环境比较熟的话，也可以直接下载下面的`zip`，解压缩后得到的直接是`nasm`程序本身。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,syGfLjwDN_MYoum6B6M9u5lKh3Xw8H36uTSqW2tVKMxU/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybDpN0iaCOSj4micrs4ibP1ZwGjMY6k7cud6g0Kd93PEUUvTMcbgY8Z01sQ/640?wx_fmt=png&from=appmsg)

选择安装器

如果你选择了安装器的版本，那么直接运行安装器，安装选项全部默认即可。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,soGUgFdF6UkW5ocxnMFbtvLeGwsOYrO4jm0U4KniUBGI/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybV2iaoiauhV1kmgOfQgsDxMlNAtqB57supOlJIiciaIibGwqsQndnSWCvctg/640?wx_fmt=png&from=appmsg)

nasm安装器

不过这里要注意一下安装路径，默认情况是`C:\Program Files\NASM`，Windows默认这个带空格的路径确实是一个饱含诟病的历史遗留问题，不过对于`nasm`来说影响不大，安装在默认路径下也是OK的，只不过我们要记住这个路径，保证能找到它。如果你没有用安装器，而是直接下载的`zip`然后解压缩的话，也请把整个文件夹放在一个合适的路径下，保证自己找得到。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s4qPAtx6DrDE3Lia0n3ZmMbZyD94dYxAPVpBKW5yQbqM/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybjeRwwlZuwbKey1xqeKOOummUtH5ypoR3OY2M2lfYF599PDD9AIjkcA/640?wx_fmt=png&from=appmsg)

安装路径

等安装完毕后，`nasm`就已经躺在刚才的安装路径下了。但是每次都指定绝对路径去运行着实麻烦了一些，也不方便我们进行项目的迁移，因此，我们还要把它配置到环境变量里。按Win+R组合键，弹出「运行」窗口，输入`sysdm.cpl`，回车，即可打开系统属性设置。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,styDphiU15IOv59Vv60YPLUAE4v2EtYbPjr7HFUEgLhY/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybI5k5z1w7CYlQ3l1myLr13otvRfp2Whj62FmSQCqhyDfL07fqzXcWEQ/640?wx_fmt=png&from=appmsg)

运行

在「系统属性」设置中，选择「高级」标签页，再点击下面的「环境变量」按钮。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s9yrcBv5WZX2vN97R8y5kIQB8M9IcXF_-G8lUIJ-1LLg/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybRjXRyzZhlMGaLfWPubTvdFVXM3w6RpoEibH7ZKVyGAXcjsjk6EwWODw/640?wx_fmt=png&from=appmsg)

系统属性

接着，在环境变量中找到用户变量里的`Path`，这个变量决定了，如果你不指定绝对路径，而是直接输入一个命令的时候，系统会去哪些路径中找程序。我们希望的效果是，当我们想运行`nasm`的时候，直接输「`nasm`」就好了，而不是每次都要输「`C:\Program Files\NASM\nasm`」，因此，就要把这个路径也配置到环境变量中。

选择`Path`后点击「编辑」，或者直接双击`Path`也可以，就可以编辑环境变量了。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,srvBz7XJYz-g1Mzb63UJFoTtu2Z7yRZ7w26qIwlCO10g/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybARqq3IgAz9dZTKCibKIqqAicsicntJo3GnM0gmBULhiaMfCWnd53qhacIg/640?wx_fmt=png&from=appmsg)

环境变量

在「编辑环境变量」的窗口中点击「新建」，然后把`nams`的安装路径写进去。注意，要写全路径，并且只需要写到`NASM`这层路径就好了，确保这个路径下有`nasm.exe`这个可执行程序。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sOs8uIxdyyij1Q4uF1Y0XLnG2y3sKWYfSGNPDlMHIobk/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb0G5Aq1oAeGoahYy5vbwlWm4v9gsytCl4gX0ZaLJJ7abfFzcHD6kSNg/640?wx_fmt=png&from=appmsg)

编辑环境变量

环境变量设置好以后，我们就可以尝试运行一下`nasm`了。按Win+R打开「运行」，输入`cmd`，回车，即可调出控制台。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,se4UM-7P7so8KrSRHmNE-Rg1ZwlPxlTNqQbVo6D_EIR8/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybiceM3PQS9uia1CWyTrNM6A7M4ghxfsuIhYH3IhfTwKZ70oic0HibMbGRRg/640?wx_fmt=png&from=appmsg)

运行

在控制台中输入`nasm -v`，如果能够看到打印出的`nasm`版本号信息，就说明我们已经安装配置完毕了！

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,szmAk3Pcsj4TZAdIA39D-6U6HscxPDqNwtB99rGl_C-U/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybACHXoDypvyjEseDezTfqPk2rnAQZWsujPF5VflWOzhrOsIXRwjnNPg/640?wx_fmt=png&from=appmsg)

运行nasm

#### 在macOS上安装nasm

由于macOS版本的`nasm`没有安装包，所以我们只能下载源程序的压缩包。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,salkeuZQXJYkuuR-dIX2O2YGcmd9RoeA54SSDeY7Pay0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb5a6BWszzCib3Y0WWqhS77zkezDczg7Mb6lkdKkblWEqAcJH7miauv4EA/640?wx_fmt=png&from=appmsg)

下载nasm

解压缩之后，就已经是可以执行的程序了，不过一般情况下浏览器默认会把文件下到「下载」这个路径中，这里自然不合适放一个经常要用到的程序，所以请手动把它挪到一个妥当的位置。

我这里选择的是用户根路径，也就是`~/`。文件夹它默认带版本号，你可以改个名字，也可以不管它，只要确保里面有`nasm`这个可执行程序就好了。我这里的路径是`~/nasm-2.16.01`。

同样地，为了让我们使用时可以只输入`nasm`，而不是`~/nasm-2.16.01/nasm`，我们还需要把这个路径放入环境变量。

macOS最早默认使用的bash，后来换成了zsh，因为这个切换已经很久了，所以笔者介绍zsh的情况，如果你用的是其他版本的shell，就请自行解决环境变量的配置问题。

执行下面的命令，编辑zsh的配置文件：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`vim ~/.zprofile
`

注意，即便你当前没有`.zprofile`这个文件也没关系，上面的命令执行会以新建文件的方式。

然后再编辑界面按「i」键，进入编辑模式，此时左下角会显示「INSERT」，表示在编辑模式。如果里面已经有一些配置了，无视就好，我们在文件最后加上：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`PATH=$PATH:/Users/xxx/nasm-2.16.01
`

注意，由于我是放在`~/`里的，但这里要写全路径，所以你需要看一下全路径是什么，用波浪线有时可能会失效。

那一句的意思就是，在`PATH`这个变量后面，加上一个`nasm`的路径，所以这里要填写你的`nasm`所在路径。

由于`.zprofile`会在每次运行终端的时候自动执行，因此我们把命令写在这个文件里就不用每次手动配置了，但由于现在还没生效，所以你还需要执行一句：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`source ~/.zprofile
`

或者干脆把终端关了，重新开一下，就生效了。

然后我们在控制台输入

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`nasm -v
`

如果能够看到版本信息，那么说明`nasm`已经安装配置成功。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sJZYj25wgk2FjQTrmX4wW4rfhUu0lnWQGmeqFrgdY2mM/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybwCIUhDSv2DsQX1dpGM1xfOcOVos7hlUZq40icfqWFFWqexdB14D02iag/640?wx_fmt=png&from=appmsg)

nasm版本

### 编写MBR

上一章我们已经成功地在8086上运行了指令，同时也介绍了nasm汇编语言。那么接下来这一章，我们就来看看如何写BIOS自检后的第一道程序——MBR。

#### 8086的14个寄存器

既然咱们已经决定要在8086上运行程序了，那么自然，现在是逃不过要了解一下8086 CPU的一些详细情况了。

值得注意的是，8086<strong>并不是只有14个寄存器</strong>，只不过这14个寄存器是对于程序来说直接打交道的。CPU内部自然还有一些用于体系自身运行的，对外不透明的寄存器，不过这些我们就不需要了解了（其实很多更详细的那些也属于Intel的商业机密，咱也没法了解）。

我先把要关注的这14个寄存器的名称列出来，然后再来解释：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sGHFG3lqP3mXiPztoQdbsTNxDqQP6B5zGvwuWmCc4jwg/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybVjaWgB1Q5KVk1MULDS9M40ViaeI0GPxB9ORicRtg61TH87xpeKFwhfog/640?wx_fmt=png&from=appmsg)

需要强调一点，除了IP和FLAG以外，上面寄存器的名称所描述的本意，只是这个寄存器「通常」或「默认」用做的事情，<strong>并不是说该寄存器只可以用做这一种情况</strong>。寄存器是很珍贵的资源，因此实际操作的使用用法是灵活多样的，所以笔者并不想拿这些寄存器名称本身的含义去大书特书。大家其实需要知道，我们要关注这14个寄存器，记住它们的符号（因为汇编语言里要用到）就好了，在一些必须指定寄存器的场景，我们再单独去记忆就好了。

另外，上面这些寄存器都是16位的，这也就意味着，8086每个节拍处理的数据都是16位的，在8086这块CPU里，数据处理和传递的基本单位就是16bit，我们也称「8086的字长为16位」，也称「8086是16位CPU」。

#### 8086的寻址方式

前面我们说，8086是16位CPU，这个仅仅是指它的字长，但并不对应它的最大寻址空间。一个CPU的最大寻址空间并不取决于它的字长，而是取决于它对外的地址总线的个数。

如果你玩过数字逻辑器件的话，应该知道有一种器件叫做「译码器」，例如下图展示的是74138，三线-八线译码器：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sDPIkQ5Wt8cQdD1sSRkRWJdjynZLWS2Kd_3JQf0W_Npw/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybOLeCpXDD9KP4n12SCiaPvsZnM5Ax7LyM0nUwZicN8ibDYgfTric3P0vUwQ/640?wx_fmt=png&from=appmsg)

74138

它的输入端（A\~0\~、A\~1\~、A\~2\~）就是地址总线，我们可以想象，这三根线接到了CPU上。后面的输出端（Y\~0\~\~Y\~7\~）就是数据线，我们可以想象，这8跟线接到了内存的存储单元上。

当A\~0\~A\~1\~A\~2\~输入为`010`时，表示需要控制第2号地址，那么Y\~2\~会输出1。同理，当A\~0\~A\~1\~A\~2\~输入为`101`时，表示需要控制52号地址，那么Y\~5\~会输出1。依次类推

在上面所述的这种结构中，我们认为CPU有3根地址总线，那么寻址空间就是2^3^=8，地址从`000`到`111`。

而在计算机体系中，存储单元一般不会按二进制位（bit）来编址，而是按照字节（Byte），也就是说，每8个bits为一组，编一个地址。那么地址总线是3的CPU，就可以访问8字节的内存空间。

而对于8086来说，它含有20根地址总线（<strong>注意，并不是16根！</strong>），那么，8086的寻址空间就是：

所以，8086最多支持1MB的内存空间，地址从20个`0`到20个`1`，不过用二进制表示会比较冗长，所以我们通常用十六进制表示内存地址，也就是`0x00000`到`0xfffff`。

前面我们提到过，类似于BIOS这样的部件，随不属于内存，但使用了统一编址的方式，因此，BIOS里的数据仍然会被包含在这1MB当中，因此实际可用的物理内存，是不足1MB的，但这件事对于CPU来说是无感知的，它会按照同样的方式，通过地址总线来操作外部硬件，无论它是内存还是BIOS。也正是由于这种编址方式，就是为了让CPU不去区分实质硬件，因此，对于统一编址的硬件来说，我们仍然称其地址为「内存地址」，虽然它压根不是内存。

那么另一个很严重的问题就出现了，8086是16位CPU，它的寄存器也都是16位的，但却有20根地址总线，那我们怎么表示一个内存地址呢？8086采用的方式是，用两个16位寄存器来拼成一个20位内存地址，示意图如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sSC02gFbpUnscN4Uu0VeMQVfc4drPcl9kHFXVai8eW_8/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybwZFN8ibXpVQC9JK6psgePuwd4ib9MxXmtwxcVwELTg6lz545ibO5gjQZA/640?wx_fmt=png&from=appmsg)

8086地址拼接

也就是说，把其中一个寄存器作为「段寄存器」，它的0\~15地址线接给全加器的4\~19位，作为第一个加数。再把另一个寄存器作为「地址寄存器」，它的0\~15地址线接给全加器的0\~15位，作为另一个加数。

上面的和作为输出地址。（当然，实际8086内部逻辑器件比这复杂的多，笔者仅仅是做一个示意）

那么用公式来表示就是：

其中表示段寄存器中的值，表示地址寄存器中的值。左移4位是指二进制位，效果相当于十进制中的，相当于十六进制中的末尾补0。

举个简单的例子，如果是`0xf055`，是`0xa003`那么地址怎么来算呢？首先给末尾补0（因为是十六进制的），然后跟相加即可，也就是`0xf0550 + 0xa003`，等于`0xfa553`。

在8086中，可以用做段寄存器的有cs、ds、es和ss，而可以用做地址寄存器的有bx、di、si、bp和sp。如果你要问，为什么其他寄存器不可以呢？那也很好解释，因为只有这几个寄存器，有连接到译码器之前那个全加器上的电路，其他寄存器没有这个电路，自然也就不能直接用做此目的。

由于一个二十位的内存地址需要两个十六位操作数来表示，在汇编语言中，会采用冒号隔开，也就是`s:d`的方式。例如`0xf055:0xa003`表示了`0xfa553`这个地址。当然，我们也发现了，这种方式下，地址表示是不唯一的，例如`0xfa00:0x0553`也同样表示`0xfa553`这个地址。所以由于这个特性也会导致一些有趣的问题，我们将会在后面的章节来详细解释。

#### 8086启动时发生的事情

前面我们已经体验过一次8086的启动了，不过那会笔者为了让大家能先快速有一个感性的认知，就没有介绍过多的内容。在继续编写MBR之前，我们还是有必要详细理解一下8086启动过程。

CPU在启动上电的瞬间之后，它只会机械性地做一件事，就是每个时钟周期，把指令读进来，执行，然后再读下一条指令，执行……如此循环往复。

那么，究竟要从哪个位置读指令呢？这是IP寄存器决定的，IP寄存器指向哪里，CPU就会读取哪里的指令。等指令结束后，IP会自动增加指令长度的数值，这样CPU就可以执行下一条指令了。

由于8086指令集属于CISC指令集（Complex Instruction Set Computer），它的指令长度是不同的，因此，每次执行指令后，IP的偏移数也不尽相同，这取决于刚才执行的那条指令的长度。不过我们不需要过多担心，指令长度这件事CPU会自己处理好。

这里还有一个问题，IP也是一个16位寄存器，它自己没法完整表示内存地址，还需要一个栈寄存器跟它组团。那么这个栈寄存器就是CS。

换句话说，CPU永远都会执行`CS:IP`处的指令，只要设置好这两个寄存器，CPU就能正常执行指令。

在8086上电的时候，CS寄存器被初始化为`0xf000`，而IP寄存器被初始化为`0xfff0`，所以自然，CPU执行的第一条执行在`0xffff0`这个位置。为了保证机器上电自检，以及MBR加载的事项能够顺利完成，那么这个位置已经会被映射到BIOS当中，这样保证机器上电后，可以自然而然地执行BIOS中的内容。

在8086中，BIOS会被映射到`0xf0000`到`0xfffff`的位置，这64KB的地址由BIOS来控制。

BIOS内部会具体执行哪些指令我们不得而知（虽然通过bochs确实能看到，但它用的BIOS也只是一个开源版本的固件罢了，真机上的BIOS内容并不开源，我们也没法知道），但BIOS一定会做一些约定好的事情，方便下一步的OS内核可以正常加载。比如说，BIOS会检测外存、I/O设备是否正常，并且如果发现了MBR（也就是外存中，第一个扇区的数据，以`0xaa55`结尾的），就会把这一扇区（512字节）的内容，加载到`0x7c00`的位置，然后把`CS:IP`设置为`0x0000:0x7c00`，保证下一条指令就是`0x7c00`处的指令。

回想一下前面章节中，我们给软盘的第一个扇区的第一行写了一个`B80600`，然后在`0x7c00`出打了断点，就可以看到ax寄存器确实变成了`6`，这就是因为，这一扇区的数据，被BIOS加载到了`0x7c00`的地方，然后把`CS:IP`设置为`0x0000:0x7c00`，这样，`B80600`就成了BIOS之后执行的首条指令了。

#### 继续编写MBR

有了这些理论基础，我们就可以继续来编写MBR了。相信大家首先想做的，应该就是在屏幕上输出点东西吧！接下来我们就按照国际惯例，在屏幕上输出`Hello World!`。

在已经安装好`nasm`的前提下，我们在项目路径下新建一个文件，叫做`mbr.nas`，然后输入下面内容：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
hlt
times 510-($-$$) db 0
dw 0xaa55
`

稍后我们再来解释代码，咱们现来看看效果。

首先，要把汇编代码转换为机器码，输入下面指令，通过`nasm`来进行汇编：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`nasm mbr.nas -o mbr.bin
`

得到`mbr.bin`文件，然后将其重命名为`a.img`（可以直接用图形界面操作，也可以执行命令`cp mbr.bin a.img`），再启动`bochs`。（注意，这里复用了前面章节的工程路径，因此需要前面`bochrc`的配置文件，详情可以查看前面章节）

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`bochs -qf bochsrc
`

然后按`c`命令，即可看到输出结果。如果你也跟我一开始一样，盯着下面的`Booting from Floppy...`没反应，然后认为程序没有生效的话，那请你往最开头来看：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s-DQyxkzip9MRUli8UqXyvrjkeuOwVTVJJFP0T-ECqBY/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybibwC9aFPoUAuKEyQiahVwwiczgYzs85AqjjFEf2wXIibk6x0xBAcY8NJdA/640?wx_fmt=png&from=appmsg)

bochs输出

可以看到，这里原本应该是「Bochs」，但是第一个字母被我们改成了「H」，所以输出是成功了。这主要是因为BIOS在屏幕上输出了一些东西，然后并没有清屏，导致我们自己的输出被「淹没」在里面了。不过要清屏需要额外解释一些其他东西，为了循序渐进，所以咱们暂时先忍忍，知道要在这些乱七八糟的信息里去寻找我们的输出就可以了。

接下来我们聚焦到这几行汇编语句上，解释一下我们都做了什么。

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0xb800
`

这一句，是给`ax`寄存器中赋值`0xb800`，`mov`指令其实更准确应该是「copy」，它会把右边的操作数赋值给左边，移动之后后面的操作数不会消失。后面一句

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ds, ax
`

则是把`ax`的值赋值给`ds`寄存器，这样`ds`寄存器中也是`0xb800`了。

相信读者在这里一定会有疑惑，为什么我不能直接`mov ds, 0xb800`呢？何苦劳烦`ax`这样节外生枝？这就是我们编写汇编语言的时候必须要考虑的问题。汇编语言仅仅是把二进制的机器码，换了一种更加接近人类语言的方式展示而已，但它本质没有变，汇编器会把它转换成对应的机器码。所以，我们写的每一条汇编指令，都应该要有对应的机器指令才对，也就是机器能够支持的指令。而8086中的段寄存器并不可以直接通过立即数来赋值，因为8086体系根本没有这样的机器指令。

所以，在编写汇编语言的时候，我们要以CPU硬件的思维来思考，书写「指令」本身，而不是高层的抽象语义。用前面的例子来说，我们要达成「把`0xb800`这个数赋值给`ds`寄存器」的这个需求，要使用「`mov ax, 0xb800`和`mov ds, ax`」这两条指令来完成。当然，你换成`bx`、`cx`或者`dx`做中间量也是OK的，因为这几个寄存器都可以通过立即数来赋值。

这两行代码的含义已经清楚了，我们来解释一下目的。在前面的章节中笔者曾经介绍过「显存」的概念，显卡会按照每个刷新周期，读取某一片内存空间，然后按照一定的规则解析，并输出给显示器，这片内存空间就是「显存」。

在8086机器初始化时，会默认使用标准VGA协议，并且是80×25×16的文字模式。也就是说，在这种模式下，显示器可以显示25行，每行80个字符（ASCII字符），并且支持最多16种颜色。在这种模式下，对应的显存是`0xb8000`\~`0xb8f9f`，一共4000字节的位置。每两字节对应一个字符显示位，低字节表示ASCII码，高字节表示颜色信息。

因此，`0xb8000`这个内存地址，对应的就是屏幕上第一行第一个字符对应的ASCII码，`0xb8001`对应的是它的颜色信息。同理，`0xb8002`对应第一行第二个字符的ASCII，`0xb8003`对应它的颜色……`0xb80a0`对应第二行第一个字符的ASCII，`0xb80a1`对应它的颜色……`0xb8f9e`对应第25行（最后一行）第80个字符（最后一个字符）的ASCII，`0xb8f9f`对应它的颜色。通过给显存中写入数据，就可以控制屏幕上的字符。

那么，颜色信息是怎样的呢？颜色信息的字节中，0\~2位表示文字颜色的RGB，第3位表示是否高亮，4\~6位表示背景色RGB，第7位表示是否闪烁。我们可以把颜色总结如下表：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sVU-dBRox3phokTLK6i_3JeHZbfHEjbQqXLNOWEGeABc/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb1rrVBSic5hQM3GXkLuic77YR9AF3hzND4KxYEnSwrCHGlCcmRibA3ItBw/640?wx_fmt=png&from=appmsg)

配合上I位，前景色可以有16种颜色，分别是：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s4nA8nQMa_IbKeai84rFI67VEOx-HfbmpRei3m9NkFaw/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybianml8LBc5As1ncxycWMibia1IdVLk25PibnSglTvVhAMoNGMuBJgFHzBQ/640?wx_fmt=png&from=appmsg)

而背景色没有高亮位，因此只支持8种：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sjv_OiYSHg90MaZSv4uyrxvAEN4YxKmQNUh4jIcHdkdU/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybTDDicgo0mgath2C3N8xo4MhaQ958ZZLRJfeL52tV3Eq3f9WCx6hbDzw/640?wx_fmt=png&from=appmsg)

最后配合K位，表示是否闪烁。

这里建议大家想看那种颜色，可以做一些尝试，还可以配合一下位置来编写代码，比如说，我想在屏幕第一排第一个、第二排第二个、第三排第三个分别显示`ABC`，然后随便用上点颜色看看效果，就可以写成：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'A'
mov [0x0001], byte 0xF0
mov [0x00A2], byte 'B'
mov [0x00A3], byte 0x46
mov [0x0144], byte 'C'
mov [0x0145], byte 0x32
hlt

times 510-($-$$) db 0
dw 0xaa55
`

效果如下（注意，A是闪烁的，但截图显示不出来）：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sPxBljXKLcKkZy5xC-XAyI9M0uhYr2n2cd_4LYNpuGHw/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybrFP2wGa8kRCqhD0Om7uauCYqUTXaMVL6K81PPrLCqnWlaqwHLqfibTA/640?wx_fmt=png&from=appmsg)

文字颜色

我们继续来解释代码，中括号表示取内存地址，所以这里的`[0x0000]`表示取地址是`0x0000`的内存地址，在`mov`指令下，表示给内存写入数据。我们知道，一个完整的内存地址应该有两部分，而对于立即数寻址的方式来说，默认段寄存器是`ds`，也就是说，`[0x0000]`其实等价于`[ds:0x0000]`，这就是刚才我们之所以要先设置`ds`的原因。由于`ds`已经被设置为`0xb800`，因此`[0x0000]`就是`[0xb800:0x0000]`，自然也就表示了`0xb8000`的地址，也就是显存的第一个字节。

那为什么要写那个`byte`呢？当我们操作寄存器的时候，会按照寄存器的大小来识别操作数，比如说`mov ax, 0x5`，由于`ax`是16位的，因此，后面的`0x5`会自动补全为`0x0005`。但是，当我们操作内存的时候，就需要手动指定操作数的长度了。长度描述符有`byte`、`word`、`dword`和`qword`，分别表示1字节、2字节、4字节和8字节。注意，如果使用`word`或以上的形式，将会按照小端序来处理，例如`mov [0], word 0xabcd`则会在`ds:0`的位置写入`0xcd`，然后在`ds:1`的位置写入`0xab`。再多啰嗦一句，如果不写`0x`前缀或`h`后缀的话，将会按照十进制类解读。

综合一下，前三行代码：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
`

表示的就是，在屏幕的最左上角的位置显示一个字母'H'，由于之前BIOS已经写入部分显存数据了，所以它的颜色会保持不变，当然，我们可以通过类似于`mov [0x0001], byte 0x0f`的语句把它的颜色变成白色。

大家可以尝试用这种方法在屏幕上输出各种各样的内容。

后面有一句

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`hlt
`

这是挂起指令，可以让CPU暂时先不要向下继续执行，直到响应中断（关于中断会在后续章节介绍）。这里写这行语句的目的在于，每次都给bochs打断点有点麻烦，而使用`hlt`指令就可以让CPU悬停再此处，方便我们观察输出，所以就不用打断点了。

最后一行的`dw 0xaa55`，这里的`dw`是伪指令，也就是说，它并不会翻译成机器指令，而是用于指导编译器做预处理用的，有点类似与C/C++中以`#`开头的语句。`dw`的意思就是按字面写2个字节，内容是后面的数，也就是`0xaa55`。前面我们说过，BIOS只有在检测第一个扇区的后两个字节是`0x55`和`0xaa`的时候，才认为是合法MBR，并加载。所以，这行语句就是干这件事的，我们可以看到汇编之后的二进制中，最后2个字符被写入成功了：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sccF6fU1GEHxbOkdSRT8vtvEhDhaAaAcxQdK6uHN9YYg/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybkFQc8VzBZl2krUzz14rgka1hl99DH75ngY3v4HzlTYjzsgy0L73Bzw/640?wx_fmt=png&from=appmsg)

mbr.bin

`dw`表示写2个字节，对应的还有`db`写1个字节，`dd`写4个字节，`dw`写8个字节，注意，都是小端序。所以上面的伪指令其实还可以改成`db 0x55 0xaa`，效果是一样的。

最后一个问题就是，`0xaa55`是这512字节的最后两个字节，但我们刚才也没写几句指令，这中间的部分咋整？可以补0，但得补多少0呢？这主要取决于，刚才我们写的所有指令占了多少字节。注意，汇编语言中的行号是没有执行层的含义的，因为对于CISC指令集来说，每条指令的长度都可能不一样，所以行数跟指令的字节数没有直接关系。

所以，计算指令长度的这件事也就交给汇编器了，`times`也是伪指令，表示后面紧跟的指令执行几次，比如说`times 5 db 0`就等价于`db 0 0 0 0 0`。而`$`和`$$`符号则是指令的偏移数，`$`表示当前位置的偏移数，`$$`表示首行的偏移数。注意，之所以首行也会有偏移数，这是有一种情况，就是当前文件的第一条指令并不一定加载到内存`0`的位置，虽然在本代码中`$$`就是`0`，但我们还是用`$-$$`来计算一下偏移量，而不直接用`$`。

所以，这一行的意义就很明确了，`times 510-($-$$) db 0`，就是从当前位置，一直补到第510字节，都补0。然后最后两个字节留给`0x55`和`0xaa`。

### 软中断

由于本系列文章并不是专业的8086汇编教程 ，因此不会过分纠结汇编语言的指令和编程技巧。但距离我们的目标——运行一个C++程序还有挺远的距离，就比如，BIOS只负责加载512字节的MBR，多的部分怎么办？另外还有一个非常令人困扰的问题，就是如何清屏？

当然了，显存的位置都已经清楚了，把他们全搞成空格符，自然也就相当于清屏了。只不过这种功能还不需要我们自己来写，用软中断的方式就可以解决。

要解决这些问题，首先我们需要了解一下软中断，在此之前，需要先了解一下中断。

#### 中断机制

简单来说，中断机制解决的就是CPU和外部设备速度严重不匹配的问题。比如说，当你在键盘上按下一个按钮的时候，CPU是需要响应的，但是，CPU怎么知道你按没按下键盘呢？

一种方式就是主动监听，用大白话来解释就是，CPU要隔三差五去看一下，键盘有没有被按下，如果有，就响应，如果没有，就回来继续干活。

但这种主动监听的方式有一个非常严重的问题，就是速率不匹配。当代CPU的主频基本都是3GHz数量级，即便是最早的8086，主频也有4.77MHz。再想想你敲击键盘的速度，根据吉尼斯官方记录，世界冠军的打字速度也不过是每分钟807个字符，这个换算下来也就是13Hz左右。换句话说，你敲一下键盘，CPU已经干了50万次以上的工作了，由于这种速率不匹配，因此选用主动监听方式对资源是一种极大的浪费。

因此，人们就想了一个办法，设计了一个中断控制器，用来监听外部事项（例如键盘敲击信号），当需要CPU响应的时候，中断控制器再去「通知」CPU，“你把手上的活先停一下，有个事情要处理。”这种机制就叫中断机制。

对于中断信号，CPU要做出对应的处理，那么自然就要有一些用于处理中断的指令，当CPU收到对应的中断时，就去执行对应的指令即可。这种机制有点像Qt中的signal-slot机制，也有点类似于Vue中的`@click`绑定触发事件。总之，都是将一个事件（或者信号）跟一个函数相绑定，当收到事件信号时，执行对应的函数。

不过既然中断的处理过程就相当于一个函数的话，它自然<strong>也可以当做一个普通的函数直接调用</strong>，这种方式就被称为「软中断」。换句话说，软中断其实跟原本的中断机制没什么关系，它只不过利用了中断号，直接去执行了对应的中断响应函数罢了。

所以，<strong>软中断本质上就是函数调用</strong>。

#### 通过BIOS中断来清屏

在BIOS内部，会实现存一些中断响应的流程指令，所以我们可以通过软中断调用方式，去执行BIOS所提供的一些功能。这些BIOS提供的功能也称为「BIOS中断」。

BIOS中断可以提供很多功能，详细的情况只能去查BIOS手册了，这里笔者只介绍咱们用得上的。首先，就来解决清屏的问题。

中断的调用需要配合固定的寄存器传入参数，之前我们说过，默认情况下显卡使用的是文字模式，那么只要重新再进入一次文字模式就可以自动清屏功能，需要`al`传入`0x03`，`ah`传入`0x0`，然后使用`0x10`号中断即可实现清屏（如果是其他显示模式，则会切换至文字模式）。

等等，`al`和`ah`寄存器是哪冒出来的？其实是这样的，对于`ax`、`bx`、`cx`和`dx`这4个寄存器来说，可以拆成高8位和低8位两个8位寄存器来使用。`al`就是`ax`的低8位，`bh`就是`bx`的高8位，以此类推。

所以，`al=0x03`，`ah=0x0`，效果跟`ax=0x0003`是一样的。

我们修改一下MBR的代码，首先清屏，然后再打印`Hello,World!`来看看效果：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov al, 0x03
mov ah, 0x00
; 也可以写作 mov ax, 0x0003
int 0x10 ; 调用0x10号BIOS中断，清屏
mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
mov [0x0001], byte 0x0f ; 黑底白字
mov [0x0002], byte 'e'
mov [0x0003], byte 0x0f
mov [0x0004], byte 'l'
mov [0x0005], byte 0x0f
mov [0x0006], byte 'l'
mov [0x0007], byte 0x0f
mov [0x0008], byte 'o'
mov [0x0009], byte 0x0f
mov [0x000a], byte ','
mov [0x000b], byte 0x0f
mov [0x000c], byte 'W'
mov [0x000d], byte 0x70 ; 浅灰底黑字
mov [0x000e], byte 'o'
mov [0x000f], byte 0x70 
mov [0x0010], byte 'r'
mov [0x0011], byte 0x70 
mov [0x0012], byte 'd'
mov [0x0013], byte 0x70 
mov [0x0014], byte '!'
mov [0x0015], byte 0x70 
hlt

times 510-($-$$) db 0
dw 0xaa55
`

效果如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,spINryrhXQKG-mpsAGMjzxTtLHI82-KnQFTbXeE3H_cA/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb1yhTvvKQSalmeKWrY12bPLDtm8Jy5VkUC7AibszFRribRQnNQt6SdicZg/640?wx_fmt=png&from=appmsg)

清屏后显示

这样看上去是不是顺眼多了？

### 跳转

前面我们介绍过，8086CPU总是在执行`CS:IP`所对应的内存位置的指令，一般情况下，会按照顺序一条一条执行。除非一种特殊情况——跳转指令。

所谓「跳转」，顾名思义，就是不要再继续向下执行，而是跳到某一个位置开始执行。因此，跳转指令就是要改变`CS:IP`的指向。

跳转指令主要分为两种，分别是「近跳」和「远跳」。不过笔者认为，这两个名字也起得不是特别恰当，其实他们跟远近并没有直接关系。

#### 近跳

所谓「近跳」，我们可以理解为`CS`不变，`IP`做一个偏移，它的操作数是一个偏移量，比如说`-3`就表示向前跳转`3`字节、`5`就表示向后偏移`5`字节。

然而在汇编语言里，我们也不好手动去计算偏移量，因此这种时候就需要用到强大的汇编器预处理功能——标签。我们来看一个例子：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`L1: 
mov ax, 1
jmp L2
mov bx, 2
L2:
mov cx, 8
`

其中的`L1:`和`L2:`就是标签，它也是伪指令，并不会生成对应的机器码，而是会影响汇编器的预处理。标签名可以随便起，只要不跟汇编关键字冲突即可，后面的冒号也可以省略。

上面例程中的近跳指令是：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`jmp L2
`

预处理时，汇编器会根据`L2`标签到当前位置（跳转指令的位置）之前的<strong>偏移量</strong>来给近跳指令添加操作数。以上面例程来说，实际的操作数正好是`mov bx, 2`这条指令的长度，也就是3，那么`jmp L2`就相当于`jmp +3`。

当CPU执行到近跳指令时，则会将`IP`寄存器与近跳指令的操作数相加，然后去执行对应位置的指令，进而达到跳转的目的。

#### 远跳

所谓「远跳」，其实是给`CS`和`IP`都给一个绝对值，它的操作数是一个绝对的内存地址，而不是偏移量。例如：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`jmp 0x0820:0x0000
`

这条指令执行完后，`CS`会赋值为`0x0820`，`IP`会赋值为`0x0000`，接着就会执行`0x08200`位置的指令。

这里需要强调的是，汇编语言指导的是机器指令，它不具备高等语义，因此，汇编器不会去检查`0x08200`这个地址在不在你当前操作的源文件里，也不会去管那个位置到底会不会加载合法的指令，这一切都应该由程序员自行负责。

当然，使用远跳指令时也可以使用标签，只不过此时的标签会使用「相对于文件头」的偏移量。比如说：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov ax, 0
mov bx, 1
L1:
mov cx, 2
jmp 0x0000:L1
`

上面例程中`jmp 0x0000:L1`就是远跳指令，这时的`L1`就会解析为这个标签相对于文件头的偏移量，实际上也就是`mov ax, 0`和`mov bx, 1`的指令长度和，也就是6。那么这条指令其实应该是`jmp 0x0000:0x0006`。

这里再次强调重点：近跳指令不改变`CS`，操作数是偏移量；远跳指令会改变`CS`，操作数是绝对数。这一点在8086模式下可能看上去没那么重要，但当后面我们切换到286模式时，这一点会非常重要，所以请读者一定要记住。

### 多加载几个扇区

到目前为止，我们的程序都挤在软盘的第一个扇区里，指望BIOS自动加载。不过显然这区区512字节的空间很容易捉襟见肘，那么如何把软盘中的其他扇区内容也加载到内存中呢？在8086模式下，BIOS中断可以替我们搞定。

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; 加载一个扇区到0x08000的位置
mov ax, 0x0800
mov es, ax
mov bx, 0 ; 软盘中的内容会加载到es:bx的位置
mov ah, 2 ; ah=2, 使用读盘功能
mov al, 2 ; ah表示需要读取连续的几个扇区（读2个就是1KB的大小）
mov ch, 0 ; ch表示第几柱面
mov dh, 0 ; dh表示第几磁头
mov cl, 2 ; cl表示第几扇区
mov dl, 0 ; dl表示驱动器号，软盘会在0x00~0x7F，硬盘会在0x80~0xFF
int 0x13  ; 执行0x13号中断的2号功能（读盘功能）
`

对于老式机械硬盘、软盘来说，它们都属于「磁盘」的一种。根据其机械结构分为柱面(Cylinder)、磁头(Head)、扇区(Sector)，一般表示为`CHS`，柱面和磁头从`0`开始，扇区从`1`开始标号。

BIOS如果设置为软盘启动，就会加载`0`号驱动器的`C0-H0-S1`到内存的`0x07c00`的位置。如果设置为硬盘启动，就会加载`0x80`号驱动器的`C0-H0-S1`到内存的`0x07c00`的位置。

那么现在，我们承担MBR角色的程序，就需要再把其他数据也加载到内存中。不过这时的内存选址就由我们随意了，并不一定要紧接着MBR加载的位置，上面例程中选择了`0x08000`的位置，你也可以选择其他位置，但要主要，不能占用BIOS预留的位置，也不能占用显存位置。通常8086的内存布局如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sjU0jCFqCAdw6RevUpZTJCFU796-4HqXw3ILjuj2HfoA/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb4yNQBQ2UJt7OG9vALwBQ5H7JIarVGaxkP4gnU3JqBSG6gSRLLtN1kA/640?wx_fmt=png&from=appmsg)

从上表可知，`0x00500`到`0x9fbff`这638.75KB的空间都是可用的，但是由于MBR占用了其中的512B，剩下的部分我们可以自由支配。

下面我们就编写一个程序，前512B作为MBR，加载两个扇区（1KB）的数据到`0x08000`的位置，然后再跳转至该位置，执行指令：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; C0H0S1
; 调用0x10号BIOS中断，清屏
mov al, 0x03
mov ah, 0x00
int 0x10 
; 加载一个扇区到0x08000的位置
mov ax, 0x0800
mov es, ax
mov bx, 0 ; 软盘中的内容会加载到es:bx的位置
mov ah, 2 ; ah=2, 使用读盘功能
mov al, 2 ; ah表示需要读取连续的几个扇区（读2个就是1KB的大小）
mov ch, 0 ; ch表示第几柱面
mov dh, 0 ; dh表示第几磁头
mov cl, 2 ; cl表示第几扇区
mov dl, 0 ; dl表示驱动器号，软盘会在0x00~0x7F，硬盘会在0x80~0xFF
int 0x13  ; 执行0x13号中断的2号功能（读盘功能）
jmp 0x0800:0x0000 ; 这里写成0x0000:0x8000也OK，只是CS和IP的值会不同，但CS:IP是相同的

times 510-($-$$) db 0 ; MBR剩余部分用0填充
dw 0xaa55

; 现在已经是C0H0S2的内容了
begin:
mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
mov [0x0001], byte 0x0f
mov [0x0002], byte 'e'
mov [0x0003], byte 0x0f
mov [0x0004], byte 'l'
mov [0x0005], byte 0x0f
mov [0x0006], byte 'l'
mov [0x0007], byte 0x0f
mov [0x0008], byte 'o'
mov [0x0009], byte 0x0f
hlt

times 1024-($-begin) db 0 ; 补满2个扇区
`

可以确认一下，此时的`mbr.bin`变成了1536B，当然，它现在叫「MBR」已经不太合适了，它应当是包含了MBR和内核程序的一个总包。暂时我们先忽略这个叫法的问题，稍后再来看如何将MBR和内核程序分离。

同样，将其重命名为`a.img`，然后打开bochs看运行效果：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,ss_s_tmIcrVzL4EQWeir-Cv2-7bNJSWvnAE2gEua4-p8/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb3jCtWMpByoHGDbof9snzAq76JIp14roxmaI6DDOyov2wqHAPmZiaD3A/640?wx_fmt=png&from=appmsg)

执行结果

这证明，后面扇区的内容也加载成功了，跳转指令也完成了正确的跳转。

另外，当我们程序有稍微的规模了的时候，大家可以考虑用单步执行命令来做调试。例如启动后，我们先在`0x7c00`处打断点，然后`c`执行BIOS的指令，然后按`n`开始跳过调用流程的单步调试（`s`是单纯的单步调试，但是会把BIOS中断中的指令也显示出来，按`n`则不会）。大概效果如下：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,spmPEExDrACJJ7UWt99iEt1rBiBIsQIW5ioCzX_BQwbM/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybp0oJHxSicWDL3tIntFmTu8AibfqkVpic7Ze9OAINXvKbYP7HhEhaFiapmg/640?wx_fmt=png&from=appmsg)

调试

而在经历一些加载数据功能后，我们还可以用`x`命令来查看对应内存位置，例如当执行完`0x13`中断后，我可以看一下`0x08000`位置的内存，到底有没有写入数据：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s-foEiJm1q_bV5Qh1zNRTBbZ4wi3fXwE2tgw_0Fa_MQ0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb0rBUQ0BtlPBAGIZ2DC0g7EJNicQOTcO8ZGOlMB2KwIoLyP5ukyGtX1w/640?wx_fmt=png&from=appmsg)

内存数据

也可通过`r`和`sreg`指令查看寄存器的值，比如在跳转指令前后，查看`CS`和`IP`的值。跳转前：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sfeBSebCrPqACAcmKLLZpJbcbGnQT2LdQZxPzsmB-kHw/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybkUCT35mt2bjekuxu9Zf4tULWOtQ44AdRntIHTbZD4CpcLAiay8fkMfg/640?wx_fmt=png&from=appmsg)

寄存器1

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sZ_rrEwPgPAn2AVmQh-2yQjnvnrmEX5nhph9g_VHpgDE/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybGjEaBFelFuFOco6laPSgzMFrcversiaVsxiaLuOsl9vicBibEIr1GDaoww/640?wx_fmt=png&from=appmsg)

寄存器2

然后执行`n`，完成跳转指令后，再看一下`CS`和`IP`的值：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s_viWS5Fk8Qymt4PTbV0aquVoXLpzU8tEQumruQkWEPo/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybKaswTRHrAbaiaY3Lbq8bQKCicasvxPwGBVE7G2hvUB7ibHFnI7HjERib3w/640?wx_fmt=png&from=appmsg)

寄存器3

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,speQsI3nmEN0EhvqYtPBurUZhXnoC4YZCmiU9g0qcLp8/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybSC4pVl2a9gBVRZHEbQUcGt35ic9yxfcibPEdTgqiaLm45EHsC1ngiaYJXg/640?wx_fmt=png&from=appmsg)

寄存器4

大家可以根据需要进行调试观察自己的程序。

### 改为硬盘启动

#### BIOS中断的局限性

照理说，按照前面一节的方法，利用BIOS中断加载软盘中的数据到内存中再去执行，在8086下貌似是没什么问题的。但这不是长久之际，8086下只有640KB不到的内存空间供我们支配，自然用当前的这种方式没什么问题，但毕竟8086模式只是过渡，后续我们要切换到32位模式以支持4GB内存，还要切换到64位模式支持更大的内存。

虽然BIOS中断是很方便的工具，相当于基础系统提供了一些库函数供我们使用，但它毕竟依赖BIOS，BIOS中提供的指令都是16位实模式（8086模式）的指令，一旦后续我们切换为i286模式、i386模式后，这些BIOS中断就无法使用了（因为指令集不匹配）。

其实，向显存写入数据的这种需求，也是可以通过BIOS中断来完成的，但笔者并没有介绍这种方法，而是使用直接操作显存的方式，目的也就在此，因为我们不可能一直停留在8086模式。同理，加载外存中的数据这种需求，也应当有它原始方法。

#### I/O设备的操作

前面我们介绍过I/O，有一些是统一编址的（比如显存），也有一些是独立编址的，CPU会通过专用的指令，控制I/O控制器（或者也可以叫南桥芯片）来管理这些I/O设备。

I/O设备会映射成一个端口号，CPU向对应的端口号发送或读取数据，间接通过I/O控制器来控制外围的I/O设备。软驱也是其中的一员，我们可以控制几个软驱控制器（例如DOR、FDC）来读取和写入软盘中的内容。不过软驱的控制方法比较麻烦（只支持CHS模式，不支持LBA模式。LBA模式在后面章节详细介绍），又因为3.5英寸软盘只有1440KB的限制，迟早不够使，因此，我们姑且就不去详细研究软驱的控制方法了。接下来，我们要将我们的模拟器环境，改为用硬盘启动。

#### 配置硬盘启动

配置硬盘，需要修改`bochsrc`的内容，我们将软盘启动相关配置注释掉或删除掉，改为以下内容：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`# boot: floppy # 设置软盘启动
# floppy_bootsig_check: disabled=0 # 打开自检
# floppya: type=1_44, 1_44="a.img", status=inserted, write_protected=0 # 使用1.44MB的3.5英寸软盘，取镜像为a.img，开机默认已插入软驱，不开启写保护
ata0: enabled=1, ioaddr1=0x1f0, ioaddr2=0x3f0, irq=14 # 主盘端口映射为1f0，从盘映射为3f0，中断号设置为14（虽然这几个参数都可以定制化，但这个参数是业界标准的，不建议更改）
ata0-master: type=disk, mode=flat, path=a.img, cylinders=1, heads=1, spt=1 # 主盘位置加载一块规格为C1H1S1的硬盘，镜像使用a.img
boot: disk # 设置为硬盘启动
`

这里需要注意一下，硬盘的规格我们暂时设置的是1柱面1磁头1扇区，也就是只有512字节的硬盘，那么对于`a.img`来说，超过512B的部分是不会加载进去的。（暂时这样设置一下，后面肯定会改的。）

首先先来测试一下MBR能否正常加载，所有我们把之前MBR中写的那些跳转语句、还有512B后面的部分都先删除，打印几个文字来验一验效果：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; 调用0x10号BIOS中断，清屏
mov al, 0x03
mov ah, 0x00
int 0x10 
mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
mov [0x0001], byte 0x0f
mov [0x0002], byte 'e'
mov [0x0003], byte 0x0f
mov [0x0004], byte 'l'
mov [0x0005], byte 0x0f
mov [0x0006], byte 'l'
mov [0x0007], byte 0x0f
mov [0x0008], byte 'o'
mov [0x0009], byte 0x0f
hlt

times 510-($-$$) db 0 ; MBR剩余部分用0填充
dw 0xaa55
`

将其编译为`mbr.bin`，确认一下它的大小是512字节：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s2ZFJNC-nD3k1Q5jdm7ExXQrZTA6Pw_mfSjGBs1s6gL0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb67NmPeYliaIVicMHickiaVt4U9kiaUrguyfwLh36OBvGlibiaoor8jeEib4yXw/640?wx_fmt=png&from=appmsg)

mbr.bin

然后把它复制为`a.img`，再启动一下看看效果：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,s0ClqS9E-HVwLB8jJHuNJ8DsywWeTEpYVPy7CiL9bpL0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybC5GmY0vFxRicqJe3MXt5YfZtADU42ob0dtDzBd2Ifu4mlGFicLHmiaXpg/640?wx_fmt=png&from=appmsg)

硬盘启动后

能看到输出，说明我们已经成功切换成硬盘启动了。那么接下来就是如何加载后面扇区的数据的问题了。

#### 通过操作I/O加载硬盘数据

前面我们用了CHS方式来编号硬盘，但除了CHS以外，还有另外一种方式，叫做LBA，也就是Logical Block Address。这种方式下，硬盘会直接按照连续的扇区进行编号，对磁头和柱面不再感知。

LBA28是一种比较原始的方式，28表示用28位编号，也就是`0x0000000`\~`0xFFFFFFF`的扇区号，注意，`0`号是预留位，真正的扇区是从`1`号开始的。

用于控制硬盘的设备会有对应的端口号，在前面我们`bochsrc`中也有对应的配置，比如当前使用了默认值，也就是`0x01f0`，从这个端口向后的若干端口都是用来操作硬盘的。因此，我们要按照一定的顺序，向对应的端口中写入数据，来指导硬盘控制器读取硬盘数据。

首先要配置的是需要读取的端口数，这个数据要写入`0x01f2`端口中：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; 设置读取扇区的数量
mov dx, 0x01f2
mov al, 2 ; 读取连续的几个扇区，每读取一个al就会减1
out dx, al
`

然后我们来配置起始扇区号。1号扇区就是MBR，已经加载进来了，所以我们从第2号扇区开始加载。虽然只是一个简单的2号，但其实LBA28模式下扇区号是有28位的，因此我们要拆分成4次，分别写入不同的端口中。`0x01f3`需要传入扇区号的`0~7`位，`0x01f4`需要传入扇区号的`8~15`位，`0x01f5`需要传入扇区号的`16~23`位，`0x01f5`则拆分为3部分，低4位是扇区号的`24~27`位，第4位表示主从盘，高3位表示扇区编号的模式。

这部分的代码如下，笔者已经加入了详细的注释，请读者仔细阅读：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; 设置起始扇区号，28位需要拆开
mov dx, 0x01f3
mov al, 0x02 ; 从第2个扇区开始读（1起始，0留空），扇区号0~7位
out dx, al
mov dx, 0x01f4 ; 扇区号8~15位
mov al, 0
out dx, al
mov dx, 0x01f5 ; 扇区号16~23位
mov al, 0
out dx, al
mov dx, 0x01f6
mov al, 111_0_0000b ; 低4位是扇区号24~27位，第4位是主从盘（0主1从），高3位表示磁盘模式（111表示LBA模式）
`

接下来要配置操作命令，我们要做「读盘」操作，对应的命令号是`0x20`，它要写入`0x01f7`端口：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; 配置命令
mov dx, 0x01f7
mov al, 0x20 ; 0x20命令表示读盘
out dx, al
`

一切就绪之后，控制器就会开始读盘了，但这需要一定的时间，所以此时程序要等待驱动器工作完成。`0x01f7`端口如果使用`in`命令，读取到的是硬盘控制器的状态数据，其中第`7`位表示是否忙碌，第`3`位表示是否就绪。那么也就是说，当第`7`位是`0`且第`3`位是`1`的话，说明驱动器已经完成，否则就要持续等待：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`wait_finish:
; 检测状态，是否读取完毕
mov dx, 0x01f7
in al, dx ; 通过该端口读取状态数据
and al, 1000_1000b ; 保留第7位和第3位
cmp al, 0000_1000b ; 要检测第7位为0（表示不在忙碌状态）和第3位是否是1（表示已经读取完毕）
jne wait_finish ; 如果不满足则循环等待
`

当驱动器就绪后，我们就可以通过`0x01f0`端口来加载数据到内存了。这个端口是个16位端口，因此每次可以读2字节。这里我们用一个循环语句来完成，循环语句的循环次数要写在`cx`中，每次循环时`cx`会自动减1，直到`cx`为0则跳出循环。

所以，如果我们需要加载2个扇区的数据，那么就是`1024`字节的内容，而循环次数就是`512`，所以把这个数配到`cx`中：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov cx, 512 ; 一共要读的字节除以2（表示次数，因为每次会读2字节所以要除以2）
`

还是按照一开始的规划，我们把屏幕打印的部分放到第二扇区，然后把它加载到`0x08000`的内存位置：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`mov dx, 0x01f0
mov ax, 0x0800
mov ds, ax
xor bx, bx ; [ds:bx] = 0x08000
read:
in ax, dx ; 16位端口，所以要用16位寄存器
mov [bx], ax
add bx, 2 ; 因为ax是16位，所以一次会写2字节
loop read
`

最后通过跳转指令跳转过去，查看是否加载成功。下面给出完整代码：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`; C0H0S1
; 调用0x10号BIOS中断，清屏
mov al, 0x03
mov ah, 0x00
int 0x10 
; LBA28模式，逻辑扇区号28位，从0x0000000到0xFFFFFFF
; 设置读取扇区的数量
mov dx, 0x01f2
mov al, 2 ; 读取连续的几个扇区，每读取一个al就会减1
out dx, al
; 设置起始扇区号，28位需要拆开
mov dx, 0x01f3
mov al, 0x02 ; 从第2个扇区开始读（1起始，0留空），扇区号0~7位
out dx, al
mov dx, 0x01f4 ; 扇区号8~15位
mov al, 0
out dx, al
mov dx, 0x01f5 ; 扇区号16~23位
mov al, 0
out dx, al
mov dx, 0x01f6
mov al, 111_0_0000b ; 低4位是扇区号24~27位，第4位是主从盘（0主1从），高3位表示磁盘模式（111表示LBA）
; 配置命令
mov dx, 0x01f7
mov al, 0x20 ; 0x20命令表示读盘
out dx, al

wait_finish:
; 检测状态，是否读取完毕
mov dx, 0x01f7
in al, dx ; 通过该端口读取状态数据
and al, 1000_1000b ; 保留第7位和第3位
cmp al, 0000_1000b ; 要检测第7位为0（表示不在忙碌状态）和第3位是否是1（表示已经读取完毕）
jne wait_finish ; 如果不满足则循环等待

; 从端口加载数据到内存
mov cx, 512 ; 一共要读的字节除以2（表示次数，因为每次会读2字节所以要除以2）
mov dx, 0x01f0
mov ax, 0x0800
mov ds, ax
xor bx, bx ; [ds:bx] = 0x08000
read:
in ax, dx ; 16位端口，所以要用16位寄存器
mov [bx], ax
add bx, 2 ; 因为ax是16位，所以一次会写2字节
loop read

jmp 0x0800:0x0000 ; 这里写成0x0000:0x8000也OK，只是CS和IP的值会不同，但CS:IP是相同的

times 510-($-$$) db 0 ; MBR剩余部分用0填充
dw 0xaa55

; 现在已经是C0H0S2的内容了
begin:
mov ax, 0xb800
mov ds, ax
mov [0x0000], byte 'H'
mov [0x0001], byte 0x0f
mov [0x0002], byte 'e'
mov [0x0003], byte 0x0f
mov [0x0004], byte 'l'
mov [0x0005], byte 0x0f
mov [0x0006], byte 'l'
mov [0x0007], byte 0x0f
mov [0x0008], byte 'o'
mov [0x0009], byte 0x0f
hlt

times 1024-($-begin) db 0 ; 补满2个扇区
`

注意，由于我们已经把扇区扩展到了3个，因此`bochsrc`里面 也需要修改一下硬盘的规模：

![](https://proxy-prod.omnivore-image-cache.app/0x0,s56UsqM5ZhjwwpVnzuHp9Y2FecE62BLbv4ldRqBGinp0/https://mmbiz.qpic.cn/mmbiz_svg/Iic9WLWEQMg2jTKicld7jhiahgW5maYNm1niaFWO3EXmBTo4NcLicwXholJeuk1iaq3REpicWhoVoRdDavmxdy0AMtCItfCMqJAK2qu/640?wx_fmt=svg&from=appmsg)`ata0: enabled=1, ioaddr1=0x1f0, ioaddr2=0x3f0, irq=14 # 主盘端口映射为1f0，从盘映射为3f0，中断号设置为14（虽然这几个参数都可以定制化，但这个参数是业界标准的，不建议更改）
ata0-master: type=disk, mode=flat, path=a.img, cylinders=1, heads=1, spt=3 # 主盘位置加载一块规格为C1H1S3的硬盘，镜像使用a.img
boot: disk # 设置为硬盘启动
`

最后通过汇编生成`mbr.bin`，复制为`a.img`，再启动`bochs`就可以看到执行效果：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sKsu9LT0Ldut7Mys4AH3NxaP0m_WUqKaGiOzHY4fe1d0/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKybicntSTKTNZVWUvlUouBericRuggxg6iaiaQr4uYIe44yrRaIAjNQ2ZRWVg/640?wx_fmt=png&from=appmsg)

执行效果

此时也可以通过调试指令来验证`0x8000`的内存中确实加载了对应的指令：

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,sHhvS70Q-KH6-h4vvtw0BFYsezSQDnYAgRWQIqunvHxE/https://mmbiz.qpic.cn/sz_mmbiz_png/j3gficicyOvasDBCtqwCN3CFpqlpvyvKyb86736mibv0yOH3tVv6WgOzBQPhJPx0cb8znaEth1EBTexgiaCMcnrygw/640?wx_fmt=png&from=appmsg)

指令

由此殊途同归，我们没有使用BIOS中断，也同样完成了硬盘加载的工作。

更多内容可以点击下方「阅读原文」。

![图片](https://proxy-prod.omnivore-image-cache.app/0x0,ssB5n59-JSKxYoowIPAhkN8BZ-1rPYJo1RlUymfYubfA/https://mmbiz.qpic.cn/sz_mmbiz_gif/j3gficicyOvasOHYuGEic5USJwXGgWfxiaIXz2uxcnbFsTuYvRdoias1ajkEa7Qd81r31CJCMQ8OK6YfMYjw2OXz3EA/640?wx_fmt=gif)

