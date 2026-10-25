---
title: 详解CUDA的Context、Stream、Warp、SM、SP、Kernel、Block、Grid
date: "2023-05-20 00:00:00"
updated: "2023-05-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/详解CUDA的Context、Stream、Warp、SM、SP、Kernel、Block、Grid/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/266633373
---


最近做了些模型性能优化的项目，用到了CUDA的context、stream、SM、Warp、多流、MPS等概念，在此做个总结笔记。如有不准确的地方欢迎指正交流~

<strong>目录：</strong>

- CUDA Context
- CUDA Stream
- Hyper-Q，Multi Stream，MPS
- 硬件架构：SM，SP
- Warp调度
- 软件架构：Kernel，Grid，Block

### CUDA Context（上下文）

context类似于CPU上的进程上下，表示了，管理了由Driver层分配的资源的生命周期。多线程分配调用的GPU资源同属一个context下，通常与CPU的一个进程对应。

与CPU进程的管理类似，每个Context有自己的地址空间，之间是隔离的，在一个Context中有效的东西（例如某个指针，指向一段显存；或者某个纹理对象），只能在这一个Context中使用。但一个CUDA Context中的任何一个kernel，挂掉后，则整个Context中的所有东西都会失效（例如所有的缓冲区，kernel对象，纹理对象，stream等等）。在同一个GPU上，可能同时存在1个或者多个CUDA Context的。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_262cef43df11.jpg)

多个context在GPU上的运行方式对于context的创建与管理，CUDA runtime和CUDA driver API的方式稍有不同：

CUDA runtime软件库通过*<strong>延迟初始化</strong>*（deferred initialization）来创建context，也就是lazy initialization。具体意思是在调用每一个CUDART库函数时，它会检查当前是否有context存在，假如需要context，那么才自动创建。也就是说需要创建上面这些对象的时候就会创建context。runtime也可以通过调用cudaFree(0)来强制显式地初始化context。cuda runtime将context和device的概念合并了，即在一个gpu上操作可看成在一个context下。

而在驱动这一层的Driver API里，创建的context是针对一个线程的，即一个device，对应多个context，每个context对应多个线程，线程之间的context可以转移。在driver API中，每一个cpu线程必须要创建 context，或者从其他cpu线程转移context。如果没有创建context，直接调用 driver api创建上面那些对象，就会报错。

这里解释下CUDA runtime软件库和driver API的区别：

我们平常安装使用的CUDA，即runtime软件库，是构建在Driver API上的另一层封装，所有的API都是以4个字母cuda开头。在编译时其cu代码可以和C/C++代码混合编译。而CUDA还有另外一个功能更强大，当然使用起来也更麻烦的API接口Driver API。Driver API将完整的CUDA功能展现给用户，功能更加强大，但是用起来较为繁琐，所有的Driver API，则都是2个字母cu开头。

### CUDA Stream

CUDA Stream是指一堆异步的CUDA操作，他们按照host代码调用的顺序执行在device上。Stream维护了这些操作的顺序，并在所有预处理完成后允许这些操作进入工作队列，同时也可以对这些操作进行一些查询操作。这些操作包括host到device的数据传输，launch kernel以及其他的由host发起由device执行的动作。这些操作的执行总是异步的，CUDA runtime会决定这些操作合适的执行时机。我们则可以使用相应的cuda api来保证所取得结果是在所有操作完成后获得的。同一个stream里的操作有严格的执行顺序，不同的stream则没有此限制。

CUDA API可分为同步和异步两类，同步函数会阻塞host端的线程执行，异步函数会立刻将控制权返还给host从而继续执行之后的动作。

当我们使用CUDA异步函数与多流（Multi Stream）时，多线程间既可以实现并行进行数据传输与计算，如下图所示。不过需要注意的是， CUDA runtime API默认的default stream是同步串行的，且一个进程内的所有线程都在default stream下，需要显式声明default之外的Stream才可以实现多流并发。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_241ef5b1376b.jpg)

默认流与多流对比
### Hyper-Queue

Hyper-Q是GPU从Kepler架构后，Nvidia提出的硬件特性，允许多个CPU 线程或进程同时加载任务到一个GPU上， 实现CUDA kernels的并发执行。Hyper‐Q允许来自多个 CUDA 流、多个消息传递接口（MPI）进程，甚至是进程内多个线程的单独连接。

使用Hyper-Q有以下两种情况，分别对应了上面介绍的context与stream：

<strong>1、多流：</strong>在stream中已经有介绍，利用CUDA异步函数以及多流的声明，既可以实现在多个线程的计算与数据传输的并行，增加GPU利用率。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0f1cee6c13d1.jpg)

多流示例<strong>2、MPS：</strong>多进程时使用MPS（Multi Process Service）。我们知道，每个进程默认对应一个context，而GPU在同一时刻只会运行一个context，因此进程间实际是无法并发的。

MPS是一个二进制兼容的客户端-服务器运行时实现的CUDA API，允许多个CPU进程共享同一GPU context，不同进程的kernel和memcpy操作在同一GPU上并发执行，以实现最大化 GPU利用率、减少GPU上下文的切换时间与存储空间。在CUDA 7.0后，我们只需要执行如下指令就可以打开MPS服务：

`nvidia-cuda-mps-control -d`

### 显卡硬件架构：SM、SP、Warp

具体到nvidia硬件架构上，有以下两个重要概念：

<strong>SP（streaming processor）：</strong>最基本的处理单元，也称为CUDA core。最后具体的指令和任务都是在SP上处理的。GPU进行并行计算，也就是很多个SP同时做处理。

<strong>SM（streaming multiprocessor）：</strong>多个SP加上其他的一些资源组成一个SM，也叫GPU大核，其他资源如：warp scheduler，register，shared memory等。SM可以看做GPU的心脏（对比CPU核心），register和shared memory是SM的稀缺资源。CUDA将这些资源分配给所有驻留在SM中的threads。因此，这些有限的资源就使每个SM中active warps有非常严格的限制，也就限制了并行能力。如下图是一个SM的基本组成，其中每个绿色小块代表一个SP。

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_50c4c0bc9ffe.jpg)

SM构成每个SM包含的SP数量依据GPU架构而不同，Fermi架构GF100是32个，GF10X是48个，Kepler架构都是192个，Maxwell都是128个。当一个kernel启动后，thread会被分配到很多SM中执行。大量的thread可能会被分配到不同的SM，但是同一个block中的thread必然在同一个SM中并行执行。

### Warp调度

一个SP可以执行一个thread，但是实际上并不是所有的thread能够在同一时刻执行。Nvidia把32个threads组成一个warp，<strong>warp是调度和运行的基本单元</strong>。warp中所有threads并行的执行相同的指令。warp由SM的硬件warp scheduler负责调度，一个SM同一个时刻可以执行多个warp，这取决于warp scheduler的数量。目前每个warp包含32个threads（Nvidia保留修改数量的权利）。

同一个warp中的thread可以以任意顺序执行，active warps被SM资源限制。当一个warp空闲时，SM就可以调度驻留在该SM中另一个可用warp。在并发的warp之间切换是没什么消耗的，因为硬件资源早就被分配到所有thread和block，所以新调度的warp的状态已经存储在SM中了。

每个SM有一个32位register集合放在register file中，还有固定数量的shared memory，这些资源都被thread瓜分了，由于资源是有限的，所以，如果thread比较多，那么每个thread占用资源就叫少，thread较少，占用资源就较多，这需要根据自己的要求作出一个平衡。

### 软件架构：Kernel、Grid、Block

上面的context与stream类似进程、线程的概念，具体到我们如何调用GPU上的线程实现我们的算法，则是通过Kernel实现的。在GPU上调用的函数成为CUDA核函数（Kernel function），核函数会被GPU上的多个线程执行。我们可以通过如下方式来定义一个kernel：

`func_name>>(param1, param2, param3....);`

这里的grid与block是CUDA的线程组织方式，具体如下图所示：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_ee817fdcc620.jpg)

<strong>Grid：</strong>由一个单独的kernel启动的所有线程组成一个grid，grid中所有线程共享global memory。Grid由很多Block组成，可以是一维二维或三维。

<strong>Block：</strong>一个grid由许多block组成，block由许多线程组成，同样可以有一维、二维或者三维。block内部的多个线程可以同步（synchronize），可访问共享内存（share memory）。

CUDA中可以创建的网格数量跟GPU的计算能力有关，可创建的Grid、Block和Thread的最大数量如下所示：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_10cd3000c01c.jpg)

所有CUDA kernel的启动都是异步的，当CUDA kernel被调用时，控制权会立即返回给CPU。在分配Grid、Block大小时，我们可以遵循这几点原则：

- 保证block中thread数目是32的倍数。这是因为同一个block必须在一个SM内，而SM的Warp调度是32个线程一组进行的。
- 避免block太小：每个blcok最少128或256个thread。
- 根据kernel需要的资源调整block，多做实验来挖掘最佳配置。
- 保证block的数目远大于SM的数目。
<strong>reference：</strong>

[](https://zhuanlan.zhihu.com/p/51402722)

[](https://zhuanlan.zhihu.com/p/111602648)
