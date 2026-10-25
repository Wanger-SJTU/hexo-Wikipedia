---
title: AI移动端常用汇编指令汇总以及底层算子汇编实现（附带一点点干货）
date: "2019-05-05 00:00:00"
updated: "2019-05-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/AI移动端常用汇编指令汇总以及底层算子汇编实现(附带一点点干货)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64025085
---


### <strong>一、初衷</strong>

自从跟小伙伴开专栏以来，发现很大一部分的关注者都是学生群体，以及对移动端有潜在性能需求的程序员同胞们，因此我特地整理了一下移动端（ARMv7/ARMv8）在实现AI推理框架时常用的汇编指令，旨在帮助各位童鞋、战友快速熟悉指令，快速上手汇编实现，也是为了能快速跟上我以后将写到的汇编极限优化（instructions pipeline、cache）的相关知识呀！

本文的行文结构如下：

1、首先让大家了解我们的汇编代码在推理框架中的定位，分清这个跟我们大学时候学的汇编的区别以及联系，知道需要关注哪些，而哪些则不需要关注；

2、接着汇总我在实践过程中积累下来的那些常用的指令，分别对比在ARMv7跟ARMv8模式下的指令形式以及用法；

3、接着就是实际案例了，我将在安卓、ios平台下实现各种卷积的底层实现，包括conv3x3s1、conv1x1s1、depthwise、pooling、ReLU、ReLU6等等等。。。各位在校的童鞋没学过汇编的不要担心看不懂哈，我会先给到纯c++实现代码，然后对照的给到汇编实现，这样子你对照着看，就算不懂汇编也知道怎么用啦～看着看着汇编就学会啦～[机智]

4、最后可能会结合一个具体的实例来写写，比如我们做图像处理的时候有RGB转YUV（或者其他各式各样的格式转换）的需求吧，平时我们都是c++裸实现的，现在我们可以转成汇编，然后优化下流水访存啥的，最后对比下性能加速比，哇～如此完整的实践～美哉～（当然，我可能也不会写最后这一节，因为真的很费时间啊，你看我周末来深圳陪女朋，我在干嘛？我居然在陪她搞学习！！！

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_ef7703d0a43b.jpg)

我爱学习~）

**

### 二、汇编在推理框架中的定位**

推理框架在整个app中是属于sdk层次的，为追求高性能一般就是用C++写的，通过JNI接口与JAVA层进行交互。

我们知道底层计算库代码也是遵循“二八法则”的，代码里面真正耗时的仅仅占两成（大概这么个比例，前人总结出来的嘛），因此我们只需针对性地优化这两成代码就好了，抓住问题的主要矛盾先嘛～因此我们将这两成的代码改写为汇编就能极致优化性能了呀～

有人就问了，既然汇编能提升性能你为啥不将推理框架全部汇编实现呢？

嗯。。。这个。。。我敬佩你是个勇士，真敢想，你随便去看下NCNN的源码，那是啥量级哟，用C写都费劲，还汇编！！！要是出问题了DEBUG会搞si人的啊～

因此为了框架的易实现性以及可维护性，还是用C++开发吧，在核心代码区域用内联汇编的方式来实现功能体，这样就做到取长补短了啊～在保证性能的同时又保证了工程的可维护性！

?你问我汇编麻烦在哪？我举个实际的例子哈！比如Facebook的QNNPACK就是把卷积算子给写成了单独的汇编文件（.s文件而不是.cpp文件），这么做的理论上是有收益的，但是呢，实际收益并不是很明显啊，没有把握住问题的主要矛盾啊~

同时伴生的问题就是代码维护难度增大，代码逻辑一般coder（没错说的就是我了~）不易读懂，我截取一段，咱们大家来感受感受：

`/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
 
#include 
 
.syntax unified
 
# void q8gemm_ukernel_4x8__aarch32_neon(
#     size_t mr,
#     size_t nr,
#     size_t k,
#     const uint8_t*restrict a,
#     size_t a_stride,
#     const uint8_t*restrict b,
#     const int32_t*restrict bias,
#     uint8_t*restrict c,
#     size_t c_stride,
#     const union qnnp_conv_quantization_params quantization_params[restrict static 1])
BEGIN_FUNCTION q8gemm_ukernel_4x8__aarch32_neon
 .arm
#ifndef __APPLE__
 .arch armv7-a
 .fpu neon
#endif
 # Load bias
 # - ip = bias
 LDR ip, [sp, 8]
 PUSH {r4, r5, r6, r7}
 
 VPUSH {d8-d15}
 LDR r4, [sp, 100]
 
 
/* some asm code here */
 
6:
 TEQ r1, 0
 BEQ 7f
 
 VST1.8 {d16[0]}, [r2]
 VST1.8 {d17[0]}, [r4]
 VST1.8 {d18[0]}, [r5]
 VST1.8 {d19[0]}, [r3]
 
7:
 VPOP {d8-d15}
 POP {r4, r5, r6, r7}
 BX lr
END_FUNCTION q8gemm_ukernel_4x8__aarch32_neon
 
#ifdef __ELF__
.section ".note.GNU-stack","",%progbits
#endif
`

 看到没，有前处理后处理入栈出栈操作的呀，一个不小心可是很容易出错的哟~

中间的循环逻辑都排到7层了，我们的C++代码直接一个for套for循环是很直观且易读的吧，汇编可就不一样了呀，特别是过一段时间再来看可能得好一会才能建立脑回路~

因此这就是为什么要推出内联汇编，即抓住主要矛盾，在c++层次尽可能地提高代码性能。

**

### 三、AI推理框架中常用的指令汇总**

#### <strong>3.1 寄存器差异介绍</strong>

我假设你已经知道了ARM后面的版本有37个寄存器，其中我们常用的通用寄存器是r0~r15（在A64指令集里面就是x0~x31或者w0~w31）,其中r13、r14、r15不能乱用；

其次A32指令集下NEON寄存器是Q0~Q15共计16个，A64下是V0~V31共计32个，其表现形式以及硬件结构都有所差异，我们直接看图吧！

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_dd4b71a8ed25.jpg)

For ArmV7这是AArch32状态下的NEON寄存器组，Q0~Q15，同时对应D0~D32，一个Q分为两个D，这两个D是可以单独操作的；

其次就是一个D分解为2个S，注意哦只有D0~D15才可分解，共计32个S寄存器；如果要计算浮点值的话你得先把数据搬运到这个寄存器（而不是R0~R15中）才能进行浮点运算。

可以看到特点是寄存器是连续的，Q0等价于D0+D1等价于S0+S1+S2+S3，这在我们做矢量运算的时候是很方便的（实例中可以见到），但是在AArch64状态下的NEON寄存器组可就不一样咯~

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_b1a9edfa6c94.jpg)

ArmV8你看V0对应AArch32状态下Q0，这里只对应D0，跟AArch32不同的是D1分配到V1中去了，也就是说寄存器不连续了，这里可能有人有疑问，假如我要把数据放到V0的上班部分怎么办呢？这个当然考虑到了比如smlal2指令就是专门处理这类问题的，后面慢慢会接触到的，这里就先不展开说了。

**

> 给各位推荐两个文档，里面可以分别查看ARMv7的NEON汇编指令，以及ARMv8的所有指令：
《RealView® 编译工具3.1 版汇编程序指南》
《ARM® Architecture Reference Manual ARMv8, for ARMv8-A architecture profile 》

*其次在这个网址你可以去看看，Neon Intrinsics Reference：*

*里面有所有**Intrinsics指令以及对应的汇编指令及用法，作为工具临时查询指令的用法还是蛮有用的！后面补个例子就知道如何方便地用了！（写着写着我觉得我自己定会没时间举例子的~huohuohuo~）*

**

Arm的A32/T32指令集跟A64指令集在SIMD汇编指令语法这块的整体区别如下：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_7203c8b84839.jpg)

数据来源：《Arm® Compiler Version 6.6 armasm User Guide》3.2** **常用指令汇总**

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0c83630c951b.jpg)

**注1.  *A64下不仅仅只有取到L1cache并keep这一种预取方式啊，还有stream模式，取到L2cache的模式啊，具体可取查看上面我给我的那个手册哈；*
注2.  *A64更专注于指令表达意思的本身，数据类型让寄存器来设定;*
注3. *与在C层次不一样的是在汇编层次地址单位都是byte；*
注4.  [NCNN的ArmV7参考资料](https://link.zhihu.com/?target=https%3A//github.com/Tencent/ncnn/wiki/armv7-neon-intrinsics-%25E5%2592%258C%25E5%2586%2585%25E5%25B5%258C%25E6%25B1%2587%25E7%25BC%2596%25E6%25B7%25B7%25E7%2594%25A8)
注5.  [NCNN的ArmV8参考资料](https://link.zhihu.com/?target=https%3A//github.com/Tencent/ncnn/wiki/aarch64-neon-intrinsics-%25E5%2592%258C%25E5%2586%2585%25E5%25B5%258C%25E6%25B1%2587%25E7%25BC%2596%25E6%25B7%25B7%25E7%2594%25A8)
#### 3.3 常用指令解析**

<strong>官网的详细指令解析：</strong>

上面的指令里面有较为详细的解释啊，如果不想看的话，看我写的这个精简版可能有点用的（也可能没用~）：

<strong>3.3.1</strong> <strong>预取</strong>

<strong>v7：</strong>

**从%3处预取192个byte；`  "pld        [%3, #192]          \n"`

v8：**

** pld1kepp这个参数是可以改的，改为预取到L2中，不keep，而是流式缓存，也就是不会真放进cache中，具体的可以去看芯片手册（看下面的图片）。` "prfm   pldl1keep, [%1, #512]       \n"`

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_23fa52831ad5.jpg)

《ARM® Architecture Reference Manual ARMv8, for ARMv8-A architecture profile》p180

3.3.2** **内存加载**

<strong>V7：</strong>

带了前缀v的就是Armv7 32bit指令的标志；

ld1表示是顺序读取，还可以取ld2就是跳一个读取，ld3、ld4就是跳3、4个位置读取，这在RGB分解的时候贼方便；

后缀是f32表示单精度浮点，还可以是s32、s16表示有符号的32、16位整型值。（对比后面的ISA64指令集就可以知道它浮点用的是4s，int16是4h）

这里Q寄存器是用q表示，q5对应d10、d11可以分开单独访问（注：v8就没这么方便了。）

大括号里面最多只有两个Q寄存器。

`"vld1.f32   {q10}, [%3]!        \n""vld1.s16 {q0, q1}, [%2]!       \n" `

<strong>v8：</strong>

可以看到指令就是单纯的表达我是个什么样操作而已，具体的什么数据类型啊就全部交给底下的寄存器去表达了。

NEON寄存器用V来表示（后缀为8B/16B/4H/8H/2S/4S/2D）；

大括号内最多支持4个V寄存器；

`"ld1    {v0.4s, v1.4s, v2.4s, v3.4s}, [%2], #64 \n""ld1    {v0.8h, v1.8h}, [%2], #32     \n""ld1    {v0.4h, v1.4h}, [%2], #32     \n"`

无法直接访问V0 的上半部分的D寄存器，目前的情报是：直接访问D0就是v0.4h，要访问V0的高64bit，可以先V0.8h加载满数据，然后以V0.h[4~7]来访问单独的int16数据；再或者就是像这样来访问：把v5.4s里面的4个32bit整型值压缩进v8.8h高64bit里面的4个int16里面。

`"sqshrn  v8.4h, v4.4s, %15            \n" // output int16x4_t"sqshrn2 v8.8h, v5.4s, %15            \n" // output int16x4_t`

<strong>3.3.2</strong> <strong>以占位符方式访问Q、D寄存器</strong>

关于这部分在NCNN github的wiki页面有详细的解释，可以去那看看哟！

<strong>V7：</strong>

先定义变量,表明_bias0就是一个向量格式了；

` const float* bias = _bias;
 float32x4_t _bias0 = bias ? vld1q_f32(bias+g*4) : vdupq_n_f32(0.f);`

然后在占位符那里表明我这个_bias0需要用一个浮点寄存器缓存起来；

`"w"(_bias0)     // %23`

然后我们在f32里面用是这样用的：把%23里面加入一个q表明这个是一个Q寄存器，然后按位与，最终输出到Q12向量寄存器里面。

`"vand.f32     q12, %q23, %q23   \n"`

因为q0是按照s16的方式导进来，因此，d0相当于有4个int16，因此能索引到d[3]

`  "vld1.s16 {q0, q1}, [%2]!       \n" // input int16x4_t
  "vmull.s16   q10,  %P6, d0[3]   \n" // `

首先定义的是int16x4，就是D寄存器，因此在访问的时候就是直接%P14了m，用P指明是D寄存器；

`int16x4_t _k4 = vld1_s16(k0 + 16);
 "vmlal.s16   q13, %P14, d3[3]   \n" //_k4 ==> %14`

<strong>V8：</strong>

相对应的V8以占位符方式访问向量寄存器的时候,是直接在后面加后缀来指明立场的；如浮点乘法的时候就是%16.4s指明是单精度浮点（4个single精度浮点值），同样的v21.s[3]是访问4个中的其中一个浮点值。

`  "fmla   v28.4s, %16.4s, v21.s[3]       \n"`

v8的int16操作：以int16 的方式加载一个D寄存器的_k0出来，然后v0.8h表示加载8个int16，然后v0.h[7]跟%6以4h的方式相乘，最后拓展输出到V4寄存器，以4s的格式，也就是4个32位；

`  int16x4_t _k0 = vld1_s16(k0     );
  "ld1    {v0.8h, v1.8h}, [%2], #32     \n" // input int16x4_t
  "smull   v4.4s, %6.4h, v0.h[7]        \n" 
  "w"(_k0),    // %6 `

### <strong>四、AI底层常见算子汇编实现</strong>

#### <strong>4.1</strong> <strong>移动端内嵌汇编语法</strong>

如何在C或C++代码中嵌入ARM汇编代码？

注：这小节的内容来自下面的链接，别人写的足够好了，咱们直接学习就好了哈，推荐大家去下面的链接看细节：

就是杰个链接~

<strong>1) 汇编代码模板</strong>

所有的汇编代码必须用双引号括起来。如果有多行汇编代码的话，每一条语句都要用双引号括起来，并且在代码后面要加上换行符（“\n”或者“\n\t”）。这样做是因为GCC会将汇编代码部分作为字符串形式直接传给汇编器，加上换行符后，汇编器就能准确知道哪些字符串表示的是一条汇编语句。同时，为了增加可读性，每条汇编语句都可以换行。

其具体形式如下：

`__asm__ __volatile__ ( "instruction 1\n\t"   
           "instruction  \n"  
           ......  
           "last instruction  \n"  
           );
`

因为汇编代码部分是必需的，所以即使一行汇编代码也没有，也需要传入空字符串（""），否则会报错。

<strong>2）</strong> <strong>输出操作数列表和输入操作数列表</strong>

*这部分需要注意的是GCC跟clang编译器的差异：GCC支持的参数总共不得超过30个，而clang则无此限制，如不加注意，则在写汇编写的欢时可能会碰上莫名其妙的异常的呀~*

输入操作数表示要作为汇编代码输入的C表达式，而输出操作数刚好相反，表示汇编代码处理完后要输出结果的C表达式。如果有多个输出或输入表达式，需要用逗号（“,”）将它们分隔开来。

可以再前面的汇编代码模板中直接应用定义的输出操作数和输入操作数，其用法是使用百分号（“%”）后面接一个数字，0表示定义的第一个操作数，1表示定义的第二个操作数，依次类推。

`__asm__ __violate__ ("movl %1,%0"
             : "=r" (result)
             : "m" (input));`

这里%0代表后面定义的第一个操作数，即输出操作数，代表C语言中的result变量。%1代表定义的第二个操作数，即输入操作数，代表C语言中的value变量。

每一个操作数由三部分组成，分别是修改符（Modifier），限定符（Constraint）和C表达式，其中修改符是可选的。具体形式如下：

`"[modifier]constraint" (C expression)`

修改符和限定符要用双引号括起来，而C表达式要用括号括起来。操作数在这里的作用是将C语言定义的变量与汇编语言中要使用到的变量进行一一对应。

但<strong>并不是所有的汇编指令都可以接受任何类型的变量作为输入或输出变量的</strong>，因此汇编器需要知道这些变量到底用在什么地方，从而帮助在传递之前做一些转换。常用的限定符主要有以下一些，而且汇编语句到底是ARM的还是Thumb的，对限定符的定义也会不同：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_49584770f45c.jpg)

常用的也就是r，f和m等几个。

修改符是加在限定符之前的，并且是可选的，如果没有修改符的话，则表明这个操作数是只读的。这个对输入操作数没有问题，但是对输出操作数来说，肯定是需要被修改的。

GCC中定义了三个修改符，分别是：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_30c2993ed7be.jpg)

所以，作为输出操作数，只需要在限定符前加上“=”就可以了。

在汇编代码中，请绝对不要修改输入操作数的值。

如果想让一个C变量既作为输入操作数，也作为输出操作数的话，可以使用“+”限定符，并且这个操作数只需要在输出操作数列表中列出就行了。例如：

`__asm__("mov %0, %0, ror #1"
        : "+r"(y)
        );`

但是GCC的老版本不一定支持“+”修改符，如果也想达到前面的这种输入和输出操作数是一个的目的，可以用一种变通的做法，并且这种变通的做法GCC的新版本也是支持的。其实，在限定符中，也可以使用数字，其作用是指代前面定义的操作数，0代表第一个，1代表第二个，以此类推。例如：

`__asm__("mov %0, %0, ror #1"
: "=r" (y)
: "0" (y)
);`

如果GCC编译器支持的话，这个例子的效果和前面的例子是相同的。本例不同的是，先定义了一个可写的输出变量，同时在输入变量列表中，明确用数字0指出了前面定义的第一个操作数<strong>同时也要用来作为输入操作数</strong>。 

前面的例子是明确要求输出操作数和输入操作数使用同一个寄存器，但有时候刚好相反，输出操作数使用的寄存器一定不能和输入操作数使用的寄存器一样。但是，由于编译器的优化，是完全有可能出现同一个寄存器既用作输入操作数也用作输出操作数的情况的。这时，可以在输出操作数中使用“&”修改符，明确告诉编译器，代表输出操作数的寄存器一定不能使用输入操作数已经使用过的寄存器。下面举个例子：

`__asm__ __volatile__("ldr %0, [%1]\n\t"
"str %2, [%1, #4]"  
: "=&r" (rdv)  
: "r" (&table), "r" (wdv)  
: "memory");`

本例中，将操作一个table数组，读出它的第一个数存放到rdv中，然后修改第二个数为wdv中存放的值。乍看一下没什么问题，但是如果编译器用同一个寄存器来表示输入操作数&table（%1）和输出操作数rdv（%0）怎么办呢？执行完第一条语句之后，table数组的地址就被修改掉了。所以，可以在输出操作数中加上一个“&”修改符，强制保证输出操作数不能和输入操作数复用同一个寄存器，这个问题就解决了。如果汇编代码中有输入寄存器还没有使用完毕，就对输出操作数进行修改的情况，则特别需要用“&”修改符，保证不复用。 

<strong>3) 修改寄存器列表</strong>

在汇编指令中，有可能会用到一些指定的寄存器，但是在执行你定义的汇编程序时，那个指定的寄存器有可能另有别的用途，存放了非常重要的数据。等你的程序执行完成后，那个寄存器的值已经被你修改过了，肯定会造成执行错误。因此，在执行你的程序之前必须要做必要的备份和恢复的动作。但是，编译器并不会分析你的汇编代码，找出这种被你修改过，需要恢复的寄存器，因此你必须显式的告诉编译器，被你修改过的寄存器有哪些。这就是修改寄存器列表所起到的作用。

对于嵌入内联ARM汇编来说，此列表中的值有下面三种类型： 

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_50164441daed.jpg)

对于“memory”来说，它并不是表示寄存器被读取或修改了，而是表示内存中的值被修改了。出于优化的目的，在执行你的汇编代码之前，编译器将某些变量的值还保存在寄存器中，并没有被写到实际的内存中。但是，如果你的汇编代码会读取内存中的值，则很有可能新的值还在寄存器中，而内存中存放的还是老的值，这样就会造成错误。添加了“memory”之后，编译器会在执行你的代码之前，保证将保存在寄存器中，没有更新到内存中的值全部都写入到内存中。

此列表中的每一项都要用双引号（""）括起来，每项之间要用逗号（“,”）分割。

**

#### 4.2** ** conv1x1s1**

我假设大家已经知道1x1s1卷积的的原理了哈，网上有很多图例的呀，我这里就展示一个三维版的哈：如下图所示，输入是CHW=(32,16,16)的数据，输出是（8,16,16），weights是NCHW排布的，size为(8,32,1,1)；

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_8b6be623eff8.jpg)

俯视图如下，我们看到具体的size值：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_9fbddef8ee77.jpg)

 我们再看下卷积核心中的核心的动态图（浪费了我的周末时间啊，建模、配色玩的不亦乐乎~要是大家喜欢的话这个可以gayhub一下啊~）：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_5c2ab83dfefe.jpg)

好了，言归正传，我们如何实现这个卷积，老规矩，先实现纯C++板，分析下性能，然后再写NEON版再分析下性能，不行的话接着优化：

我们首先实现一版纯C++的：

`::std::vectorfloat> datas_float0(1024*1024*10);
::std::vectorfloat> datas_float1(1024*1024*10);
::std::vectorfloat> weights(1024*1024*10);
::std::vectorfloat> bias(1024*1024*10);
for (int x = 0; x  datas_float0.size(); ++x){
    datas_float0[x] = 1.0;
    datas_float1[x] = 1.0;
    weights[x] = 1.0;
    bias[x] = 1.0;
}

const float* ptr_w = &weights[0];
const float* ptr_b = &bias[0];
PowerPerf::Mat inMat   = PowerPerf::Mat::from_float_array(&datas_float0[0], 64,64,64);
PowerPerf::Mat outMat = PowerPerf::Mat::from_float_array(&datas_float1[0], 64,64,64);

int n = inMat.shape.h*inMat.shape.w ;
assert( inMat.shape.h*inMat.shape.w % 4 == 0);
int inch = inMat.shape.c;
int outw = outMat.shape.w;
int outh = outMat.shape.h;
int outch = outMat.shape.c;

PowerPerf::EventMonitor cruiser0;
cruiser0.GET_RawEvent_TICK(setRawEvent);
for(int ii = 0; ii  outch / 4; ++ii){
 int i = ii * 4;

 PowerPerf::Mat outMat0 = outMat.channel(i);
 PowerPerf::Mat outMat1 = outMat.channel(i + 1);
 PowerPerf::Mat outMat2 = outMat.channel(i + 2);
 PowerPerf::Mat outMat3 = outMat.channel(i + 3);

 const float bias0 = ptr_b[i];
 const float bias1 = ptr_b[i + 1];
 const float bias2 = ptr_b[i + 2];
 const float bias3 = ptr_b[i + 3];

 outMat0.fill(bias0);
 outMat1.fill(bias1);
 outMat2.fill(bias2);
 outMat3.fill(bias3);

 for (int j = 0; j + 3  inch; j+=4){

 float* out0 = outMat0;
 float* out1 = outMat1;
 float* out2 = outMat2;
 float* out3 = outMat3;

 const float* inch0 = inMat.channel(j);
 const float* inch1 = inMat.channel(j + 1);
 const float* inch2 = inMat.channel(j + 2);
 const float* inch3 = inMat.channel(j + 3);

 const float* k0 = ptr_w + i*inch + j;
 const float* k1 = ptr_w + (i + 1) * inch + j;
 const float* k2 = ptr_w + (i + 2) * inch + j;
 const float* k3 = ptr_w + (i + 3) * inch + j;
 for (int k = 0; k + 3  n; k += 4){
 out0[k]     += inch0[k    ]*k0[k] + inch1[k    ]*k0[k + 1] + inch2[k    ]*k0[k + 2] + inch3[k    ]*k0[k + 3];
 out0[k + 1] += inch0[k + 1]*k0[k] + inch1[k + 1]*k0[k + 1] + inch2[k + 1]*k0[k + 2] + inch3[k + 1]*k0[k + 3];
 out0[k + 2] += inch0[k + 2]*k0[k] + inch1[k + 2]*k0[k + 1] + inch2[k + 2]*k0[k + 2] + inch3[k + 2]*k0[k + 3];
 out0[k + 3] += inch0[k + 3]*k0[k] + inch1[k + 3]*k0[k + 1] + inch2[k + 3]*k0[k + 2] + inch3[k + 3]*k0[k + 3];

 out1[k]     += inch0[k    ]*k1[k] + inch1[k    ]*k1[k + 1] + inch2[k    ]*k1[k + 2] + inch3[k    ]*k1[k + 3];
 out1[k + 1] += inch0[k + 1]*k1[k] + inch1[k + 1]*k1[k + 1] + inch2[k + 1]*k1[k + 2] + inch3[k + 1]*k1[k + 3];
 out1[k + 2] += inch0[k + 2]*k1[k] + inch1[k + 2]*k1[k + 1] + inch2[k + 2]*k1[k + 2] + inch3[k + 2]*k1[k + 3];
 out1[k + 3] += inch0[k + 3]*k1[k] + inch1[k + 3]*k1[k + 1] + inch2[k + 3]*k1[k + 2] + inch3[k + 3]*k1[k + 3];

 out2[k]     += inch0[k    ]*k2[k] + inch1[k    ]*k2[k + 1] + inch2[k    ]*k2[k + 2] + inch3[k    ]*k2[k + 3];
 out2[k + 1] += inch0[k + 1]*k2[k] + inch1[k + 1]*k2[k + 1] + inch2[k + 1]*k2[k + 2] + inch3[k + 1]*k2[k + 3];
 out2[k + 2] += inch0[k + 2]*k2[k] + inch1[k + 2]*k2[k + 1] + inch2[k + 2]*k2[k + 2] + inch3[k + 2]*k2[k + 3];
 out2[k + 3] += inch0[k + 3]*k2[k] + inch1[k + 3]*k2[k + 1] + inch2[k + 3]*k2[k + 2] + inch3[k + 3]*k2[k + 3];

 out3[k]     += inch0[k    ]*k3[k] + inch1[k    ]*k3[k + 1] + inch2[k    ]*k3[k + 2] + inch3[k    ]*k3[k + 3];
 out3[k + 1] += inch0[k + 1]*k3[k] + inch1[k + 1]*k3[k + 1] + inch2[k + 1]*k3[k + 2] + inch3[k + 1]*k3[k + 3];
 out3[k + 2] += inch0[k + 2]*k3[k] + inch1[k + 2]*k3[k + 1] + inch2[k + 2]*k3[k + 2] + inch3[k + 2]*k3[k + 3];
 out3[k + 3] += inch0[k + 3]*k3[k] + inch1[k + 3]*k3[k + 1] + inch2[k + 3]*k3[k + 2] + inch3[k + 3]*k3[k + 3];
 }
    }
}
cruiser0.GET_RawEvent_TOCK(setRawEvent);
`

直接获取性能数据如下：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_343a27d24b02.jpg)

** label@perf,CPU_CYCLES=365336032
E/perf@perf: label@perf,SW_INCR=0
label@perf,L1I_CACHE_REFILL=1592
label@perf,L1D_CACHE_REFILL=1249195
label@perf,INST_RETIRED=140567376
label@perf,BR_PRED=1182428
label@perf,L2D_CACHE_REFILL=286768可以看到IPC仅达到=0.39，低的可怜啊，可见我们这里用纯C++实现的版本效率是很低的！

其次通过cache的一些性能参数也可看出访存性能也很糟糕，因此我们接着进行下一步的优化。

我们自然想到用汇编、用SIMD NEON指令集、调整指令流水线、调整访存方案来达到极致的性能。

Todo~

（当然写这些东西很费时间的呀，我只能有时间慢慢写了~由于只是个人兴趣，不定期更新哈~）

4.2  pooling （图纸only， now）**

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_6025da856370.jpg)

#### <strong>4.3 to be continue......</strong>
