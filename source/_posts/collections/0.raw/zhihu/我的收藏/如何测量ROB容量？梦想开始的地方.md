---
title: (2 条消息) 如何测量ROB容量？梦想开始的地方
date: "2023-02-04 00:00:00"
updated: "2023-02-04 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/如何测量ROB容量-梦想开始的地方/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/457709438
---


### 前言

[](https://zhuanlan.zhihu.com/p/453436662)

在前文中我们测定了处理器的频率，这使得我们能够将接下来的逆向过程中获得的执行时间数据转化为执行cycle数据（处理器时钟周期），还借此发现了[12代酷睿的加法融合行为](https://zhuanlan.zhihu.com/p/453739408)。当然，获知频率并不是逆向的必要步骤，但在某些时候，知悉处理器的实际运行频率有助于我们更精细地刻画处理器行为。

用于测量ROB容量的各种程序的方法论基本一致，但实现细节有一定的差异，进而导致测量精度有一定的区别。由于我们暂时还没有介绍过如何通过程序刻画访存行为，本文本次将使用一种精度较低但是相对容易构建的方法，其误差大致在1-5项，已经足够得出较为准确的结论了。

本文将涉及汇编编写。汇编的生成有多种方式，笔者本人使用过的包括：1.手写机器码，然后跳转执行。（在本人最初复现这些测试程序时使用的是手写机器码的方式，这种方式较为痛苦且不易于被掌握；遇到x86这样的变长指令ISA时尤为痛苦）2.手写（或者用python生成）嵌入式汇编。（这种方法的门槛也相对较高，在今后我们刻画处理器分支预测器、访存单元、Cache行为时会详细介绍）3.使用诸如<strong>asmjit</strong>的工具相对容易地生成我们想要的汇编序列并执行。方法3也是本文本次将使用的方法，笔者本人在被推荐asmjit后发现其相当高效，asmjit的安装和基础使用请参考度娘，本文不会做细致的介绍（当然也是因为笔者本人也是新手2333，就不误导了，只谈如何构建出符合我们需求的程序）。

### 方法论

- 为什么首先测量ROB（Reorder Buffer）容量？这与逆向的基本原理有关。逆向的基本思想是<strong>利用预先设计的、精巧的指令序列，消耗特定的硬件资源；在改变指令序列的同时，探测这一过程中程序执行时长的变化，进而确定某些硬件资源是否存在以及其具体容量</strong>。为了达成这一目的，我们需要尽可能<strong>保证程序测量特定的某一种硬件资源，而不是某些硬件资源的组合</strong>，否则现象会过于复杂导致难以解释。落实到具体操作上，我们必须<strong>保证其他所有硬件资源不被耗尽的同时，耗尽某一种特定的硬件资源</strong>。时至2022年，众所周知，处理器内部最大的队列资源仍然是ROB。为了进行后续逆向，我们必须从确定ROB容量开始，保证我们后续精心设计的程序至少能够被ROB容纳。同时，对ROB的逆向也是相对简单的。
- 为了耗尽ROB容量，我们需要在基本不使用其他资源的情况下占用ROB表项，NOP指令就是理想的使用对象。2022年，绝大部分高性能处理器实现了对<strong>NOP指令的前端消除</strong>，也就是说NOP指令在经过decode或rename级后即完成执行，不会消耗RS（保留站）、IQ（发射队列）、PRF（物理寄存器堆）等资源，也不会被后端执行单元（诸如ALU、AGU、BRU）执行。但是时至今日，已知的所有微架构内NOP仍然会占据ROB（重排缓冲队列）资源。因此，处理器在面对海量的NOP指令时，不会因为ROB以外的队列满载而降低吞吐率，任何吞吐率的下降都将与ROB有密不可分的关系，这给了我们通过NOP指令探测ROB容量的机会。
- 但是直接执行海量的NOP指令显然无法实现我们的目的。倘若处理器的译码宽度、发射宽度、提交宽度（对NOP指令而言）均相等，那么单纯的NOP代码块显然无法耗尽ROB表项，它们会被顺畅地取指、译码、执行、提交，最后释放ROB表项，处理器能够永不停顿地运行。因此，我们需要通过某种方式阻止NOP指令在执行后立即退出ROB。2022年，大部分处理器仍然严格遵循着<strong>ROB的顺序提交。</strong>因此，如果我们能够<strong>引入一条长延迟指令迟迟不能提交</strong>，那么它就会阻止后续的NOP指令提交，这时源源不断的NOP指令会让ROB最终被填满。
- 什么样的指令是这样的长延迟指令呢？去往内存的访存指令无疑是优选，它们往往耗时～300个cycle，如此长的延迟会让处理器内部的硬件队列轻易满载，但是正如前言中提及的，我们暂时还没有介绍过如何构造一个访存指令流，因此本文不使用去往内存的访存指令。这时大家可能首先会想到乘除法指令，但是乘除法指令并不是最理想的选择。乘法指令的执行延迟一般少于5个cycle，假定一个ROB拥有256项容量，每周期取指4条指令，则需要256/4=64个周期才能填满（没有指令退出的情况下）。64/5>10，也就是说我们不得不使用超过10条相关的乘法（mul）指令才能完成这一目标。mul指令本身也会占据ROB表项，并且它在执行完成后会不断退出ROB，因此我们可能不得不使用超过20条mul指令，这对控制逆向程序本身的行为是相当不利的，很有可能处理器内部用于处理mul指令的资源会先于ROB耗尽，这与我们的理念“保证其他所有硬件资源不被耗尽的同时，耗尽某一种特定的硬件资源”并不相符。那么除法指令（div）呢？div指令在某些极端情况下会需要数十个周期才能完成，但是div的执行时长并不是固定的。现代处理器中大量使用对div指令的执行优化，配备有大量的提前退出机制（例如当被除数变为0后就直接返回结果0），为了保证div的行为可控，我们不得不精心构造被除数与除数。这样一方面很麻烦，一方面意味着更多的无关指令进入ROB，也不符合我们的理念。
- 不妨查阅指令手册，我们发现了一条神奇的指令——浮点开方指令（fsqrt）。这条浮点开方指令在2022年的不同ISA中的大部分微架构上都拥有恒定的执行时长，且一般为12cycle左右。在我们测量整数资源、访存资源和控制资源时，fsqrt消耗的是浮点寄存器堆，这无疑也是其一大优势。回到ROB容量的测量上，对于一个预期300+项ROB的六发射处理器，假定我们每周期能够向ROB中填入6条NOP指令，356/6=59 cycle。也就是说我们需要阻止NOP提交60cycle左右的时长。如果我们使用相关的fsqrt指令，60/12=5条，保险起见我们使用6条相关的fsqrt指令来阻止NOP从ROB中退出。
至此，我们已经获得了所有程序需要的指令组件，那么到底如何构造指令序列，如何从其执行时长中获得ROB的容量信息呢？为了让fsqrt堵塞nop的retire（退出ROB），核心循环指令的排布示意如下：

`fsqrt
…………
fsqrt
nop
nop
……
nop
nop`

我们往复执行这个核心循环并计时得到程序的运行时间。将nop指令简记为N，fsqrt指令记为F，循环回跳的相关指令记为B（不止一条指令，但是它们不是我们关注的对象，因此合并记为B），则核心循环指令流在ROB内的排布是FFFFFF  NNN……NN  B，当6条相关的F（我们将其称为block块，顾名思义它堵住了ROB）进入ROB后它们被执行单元串行执行，并堵塞在ROB的出口处等待执行完成后提交。后续的N指令由于前端NOP消除机制的存在，不需要实际被执行单元执行，直接在ROB中排队并被标记为完成，等待之前的F提交后它们才能提交并退出ROB。B指令块的执行完全可控，此处不予以特别考虑。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1e4537c568d9.jpg)

指令在ROB内的排布我们改变每次执行程序时核心循环内的N的数量，记录执行时长的变化。当N的数量很小时，我们实际计时的是6条相关的F的执行延迟。因为前一个循环的FFFFFF还未执行完时，后一个循环的FFFFFF已经可以进入流水线，它们在等待前一组block块执行完成（因为它们是相关的），随后即可开始执行。它们实际上组成了一条超长的F指令构成的相关链。而N指令本身不需要执行因此不会对计时产生影响：6条F执行的时间相当长，以至于N都已经被前端消除标记为完成后，F的执行还未完成。因此我们显然记录的是所有F指令的执行时长，那么也就意味着在N数量很小时，我们改变N的数量并不会影响到程序的总运行时长（是不是很神奇）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4f3f82a58955.jpg)

N数量较少时我们让N的数量从0开始逐步增大，难道任意多数量的N都不会对程序的运行时长产生影响吗？显然不可能。我们考虑一种临界情形：<strong>N的数量多到ROB无法容纳一个循环的所有指令</strong>。在这种情况下，循环k的block块执行完成并退出ROB后，本循环的剩余N指令才能进入ROB，也就意味着下一个循环——循环k+1的block块还没能进入ROB，也就不能及时开始执行。显然，此时我们的实际计时对象不再是所有的F指令，还包括了多出的N指令（那些未能及时进入ROB的N指令，在它们进入ROB后，下一个循环的F指令才能进入ROB并被执行单元开始执行）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_503fad612878.jpg)

N数量超过临界时这时，随着N数量的进一步增长执行时长也会稳步增长（因为多出的N会越来越多）。那么确定ROB容量的方法也就呼之欲出了：<strong>我们使用适当数量的fsqrt指令构成block块，在其后加上i条nop指令，执行并记录执行时长。改变i的值，从0到超级大，每次改变后都进行一次执行并计时，将计时结果汇总画出散点图，横轴是i的数值，纵轴是执行时长。在i较小时，图像是一条平直线，因为根据我们的推理此时执行时长不变；在i超过某个临界值后图像变成随i增长的直线。记录下这个临界值a，那么我们可以计算出ROB中此时存在的所有指令：i条N（nop）指令，负责循环的B指令，还没有执行完退出ROB的F指令。将这三个数值相加即得到了ROB的容量。</strong>

### <strong>测试过程</strong>

我们在12代酷睿P core（Goldencove）上进行测试。首先执行不带block块的海量nop指令，观察nop指令的吞吐率。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f850630175d3.jpg)

执行时长没有注明单位，因为<strong>我们关注的不是具体执行时长，而是核心循环内nop指令数量变化时，执行时长的变化。</strong>和我们预期的差不多，随着nop指令数量的增多，总执行时长也不断增长。

引入由6条fsqrt指令构成的block块，重复同样的过程：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4869cb067b3d.jpg)

果然出现了我们期待的平直线和缓增线！但是仔细观察，平直线和缓增线之间直接相连，这是不符合我们的预期的，此处应该存在一个干净的跳变，为什么呢？读者可以尝试自行思考（提示：考虑流水线的结构）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bb670fa31c5a.jpg)

在将block块增至8条fsqrt指令后终于得到了我们期待的图像，查阅跳变点的横轴坐标为510-511。考虑到此时ROB内至少还滞留了1条正在执行的fsqrt指令、用于循环回跳的B指令块，因此可以推知ROB容量为510+1+1（2）=512，512是2的幂次符合常理。<strong>当计算出的数值离2的幂次、4的倍数不远时，一般我们会取2的幂次或4的倍数的数值，其比较符合设计习惯。测量数值出现偏差的原因多种多样，可能由于我们构建的程序本身不足以准确刻画ROB容量，也可能ROB的分配算法导致ROB的容量不能被充分利用或者能够超额利用ROB容量</strong>，此时需要具体情况具体分析。

倘若我们继续增大fsqrt的数量呢？

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_50d526ec61b0.jpg)

可以看到图像只是出现了向上的平移，我们关注的跳变点的位置并没有变化。因为平直线对应的y轴坐标和block块的执行时长有关，block块内fsqrt指令数量变多自然会导致执行时长变长，进而使平直线向上平移；而跳变点的位置和ROB容量有关，它不随block块内fsqrt指令数量的变化而变化；缓增线的斜率与处理器的nop指令吞吐率有关，也不随block块内fsqrt指令数量的变化而变化。那么我们直接每次都使用大量的fsqrt来构成block块不就行了？答案是不行，fsqrt作为一种特殊的运算指令，处理器内部很可能有专门的结构来处理，在面对大量的fsqrt时，它们可能先于ROB表项耗尽。因此，我们<strong>应该使用尽可能少的fsqrt指令，可以首先通过计算和推演确定fsqrt的大致数量，再根据绘制出的图像来精细调整</strong>。

### <strong>实现细节</strong>

为了较为便捷地构造汇编指令序列，我们使用了asmjit工具。按照asmjit自带的example，我们首先构造出其基本的运行环境，和核心循环函数Func的框架。这个函数Func接受1个输入，指定其需要执行多少遍核心循环。无需深入理解运行环境的意义，我们仅仅是使用工具（asmjit）来快速实现我们的目标，而不是为了详细掌握asmjit的各种用法和原理。

`// Signature of the generated function.

```js
typedef int (*Func)(size_t count);      //我们构造的核心循环函数的定义

      JitRuntime rt;                    // Create a runtime specialized for JIT.
      CodeHolder code;                  // Create a CodeHolder.

      code.init(rt.environment());      // Initialize code to match the JIT environment.
      x86::Assembler a(&code);          // Create and attach x86::Assembler to code.

      SumFunc fn;
      Error err = rt.add(&fn, &code);   // Add the generated code to the runtime.
      if (err) return 1;                // Handle a possible error returned by AsmJit.
      // ----> CodeHolder is no longer needed from here and can be destroyed 
      TODO：！！！！！我们将在此处构造fsqrt和nop的指令序列

      rt.release(fn);                   // Explicitly remove the function from the runtime
      code.reset();
```

`

为了使得fn能够接受我们的输入参数，我们按照asmjit的example中的示例，加入如下代码：由于我们仅输入了1个参数，其会通过寄存器传参，其位于rdi中，我们将其存入我们申明的1个寄存器变量cnt中。

`      …………………………………………………………

```sql
      code.init(rt.environment());      // Initialize code to match the JIT environment.
      x86::Assembler a(&code);          // Create and attach x86::Assembler to code.
//新加入的代码从这里开始
      x86::Gp cnt;

      if (ASMJIT_ARCH_BITS == 64) {
      #if defined(_WIN32)
        cnt = x86::rdx;                 
      #else
        cnt = x86::rdi;                 
      #endif
      }
      else {
        cnt = x86::ecx;                 // Use ECX to hold the counter.
        // Fetch first and second arguments from [ESP + 4] and [ESP + 8].
        a.mov(cnt, x86::ptr(x86::esp, 4));
      }
//新加入的代码从这里结束
      TODO：！！！！！我们将在此处构造fsqrt和nop的指令序列

      SumFunc fn;
      Error err = rt.add(&fn, &code);   // Add the generated code to the runtime.
      if (err) return 1;                // Handle a possible error returned by AsmJit.
      // ----> CodeHolder is no longer needed from here and can be destroyed 
      …………………………………………………………
```

`

加入我们在前文中经常使用的计时函数，给fn输入1个适量的循环次数：倘若对计时方面有困惑，可以参考前言部分提及的两篇前文。

`      …………………………………………………………

      TODO：！！！！！我们将在此处构造fsqrt和nop的指令序列

```js
      SumFunc fn;
      Error err = rt.add(&fn, &code);   // Add the generated code to the runtime.
      if (err) return 1;                // Handle a possible error returned by AsmJit.
      // ----> CodeHolder is no longer needed from here and can be destroyed //新加入的代码从这里开始
      struct timespec begin,end;
      clock_gettime(CLOCK_REALTIME, &begin);
      fn(200000);                       // 执行我们构造的函数fn
      clock_gettime(CLOCK_REALTIME, &end);
      printf("%f\n", ((end.tv_sec - begin.tv_sec) * 1.0e9 + end.tv_nsec - begin.tv_nsec)/200000);
//新加入的代码从这里结束
      rt.release(fn);                   // Explicitly remove the function from the runtime
      code.reset();
```

`

至此我们可以开始构造我们的目标指令序列了，将该序列嵌入上面代码中的TODO位置即完成了逆向程序，首先构造循环和fn函数的退出机制：

`      Label Loop = a.newLabel();        // 申明1个标签——Loop 用于循环跳转，即汇编中的label

```text
      a.bind(Loop);                     // 将Loop标签放置在这个位置，也就是核心循环的入口处

      a.dec(cnt);                       // cnt接受了我们输入的循环次数，将它减1。dec就是decline指令
      a.jnz(Loop);                      // 如果减1的结果不为0，就回到标签Loop处继续执行。jnz即jump if not zero
      a.ret();                          // 从函数中return，如果cnt-1的结果为0就会执行到此处。ret即return
```

`

有了循环结构，我们可以在其中嵌入我们的指令序列了：首先是block块，即fsqrt指令。然后是nop指令，nop指令的数量是从0-800（可以自定）变化的，那我们不妨再在外层套1个大循环，其变量nop_num从0-800变化：

`    Label Loop = a.newLabel();        // 申明1个标签——Loop 用于循环跳转，即汇编中的label

```cpp
    a.finit();                        // 浮点栈初始化，一定不能遗漏！否则会导致fsqrt指令执行报错
    a.fldpi();                        // 给浮点栈顶载入1个数值pi，用于fsqrt指令的输入值
    //以上两条指令防止在Loop外因为初始化仅需进行1次

    a.bind(Loop);                     // 将Loop标签放置在这个位置，也就是核心循环的入口处

    a.fsqrt();                        // 放入8条fsqrt指令，调用1次，放置1条
    a.fsqrt();
    a.fsqrt();
    a.fsqrt();
    a.fsqrt();
    a.fsqrt();
    a.fsqrt();
    a.fsqrt();

    for(int i=0; inop_num; i++){    // 根据nop_num,生成相应数量的nop指令
       a.nop();
    }

    a.dec(cnt);                       // cnt接受了我们输入的循环次数，将它减1。dec就是decline指令
    a.jnz(Loop);                      // 如果减1的结果不为0，就回到标签Loop处继续执行。jnz即jump if not zero
    a.ret();                          // 从函数中return，如果cnt-1的结果为0就会执行到此处。ret即return
```

`

至此我们完成了程序构造：

`// Signature of the generated function.

```cpp
typedef int (*Func)(size_t count);      //我们构造的核心循环函数的定义

for(int nop_num=0; nop_num800;nop_num+=1){

      JitRuntime rt;                    // Create a runtime specialized for JIT.
      CodeHolder code;                  // Create a CodeHolder.

      code.init(rt.environment());      // Initialize code to match the JIT environment.
      x86::Assembler a(&code);          // Create and attach x86::Assembler to code.

      x86::Gp cnt;

      if (ASMJIT_ARCH_BITS == 64) {
      #if defined(_WIN32)
        cnt = x86::rdx;                 
      #else
        cnt = x86::rdi;                 
      #endif
      }
      else {
        cnt = x86::ecx;                 // Use ECX to hold the counter.
        // Fetch first and second arguments from [ESP + 4] and [ESP + 8].
        a.mov(cnt, x86::ptr(x86::esp, 4));
      }

      Label Loop = a.newLabel();        // 申明1个标签——Loop 用于循环跳转，即汇编中的label
      a.finit();                        // 浮点栈初始化，一定不能遗漏！否则会导致fsqrt指令执行报错
      a.fldpi();                        // 给浮点栈顶载入1个数值pi，用于fsqrt指令的输入值
      //以上两条指令防止在Loop外因为初始化仅需进行1次

      a.bind(Loop);                     // 将Loop标签放置在这个位置，也就是核心循环的入口处

      a.fsqrt();                        // 放入8条fsqrt指令，调用1次，放置1条
      a.fsqrt();
      a.fsqrt();
      a.fsqrt();
      a.fsqrt();
      a.fsqrt();
      a.fsqrt();
      a.fsqrt();

      for(int i=0; inop_num; i++){    // 根据nop_num,生成相应数量的nop指令
         a.nop();
      }

      a.dec(cnt);                       // cnt接受了我们输入的循环次数，将它减1。dec就是decline指令
      a.jnz(Loop);                      // 如果减1的结果不为0，就回到标签Loop处继续执行。jnz即jump if not zero
      a.ret();                          // 从函数中return，如果cnt-1的结果为0就会执行到此处。ret即return

      SumFunc fn;
      Error err = rt.add(&fn, &code);   // Add the generated code to the runtime.
      if (err) return 1;                // Handle a possible error returned by AsmJit.
      // ----> CodeHolder is no longer needed from here and can be destroyed 
      struct timespec begin,end;
      clock_gettime(CLOCK_REALTIME, &begin);
      fn(200000);                       // 执行我们构造的函数fn
      clock_gettime(CLOCK_REALTIME, &end);
      printf("%f\n", ((end.tv_sec - begin.tv_sec) * 1.0e9 + end.tv_nsec - begin.tv_nsec)/200000);

      rt.release(fn);                   // Explicitly remove the function from the runtime
      code.reset();
   }
```

`

使用脚本运行程序：使用taskset使得程序在核心1上运行，将输出结果重定向到res.txt，方便导入office进行散点图绘制等处理。

`taskset -c 1 ./test > res.txt`

### <strong>总结</strong>

#### <strong>致谢</strong>

lxy：工具安利

Maynard Handley：他详实的M1逆向手册非常推荐阅读，本文工作建立在包括他在内的社区工作之上，但是需要注意，其手册中有不少过度猜想，仅供参考。

Henry Wong：公开逆向工作的先驱们之一，本文工作建立在包括他在内的社区工作之上。有个人主页，对各种程序作出详解。

Travis Downs：