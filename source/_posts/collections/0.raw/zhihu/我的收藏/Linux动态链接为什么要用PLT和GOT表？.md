---
title: (2 条消息) Linux动态链接为什么要用PLT和GOT表？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/Linux动态链接为什么要用PLT和GOT表/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/21249496/answer/70677127797
---


22 人赞同了该回答

PLT和GOT主要是为延迟绑定（lazy binding）服务的，延迟绑定是一种推迟对动态库中使用的外部函数重定位的技术，将外部函数的重定位推迟到了外部函数第一次被调用的时候，这样可以减少动态库/PIE可执行文件的加载时间。

PS：PIE文件也是由动态链接器加载的，相关内容可以看我的这个回答：

[](https://www.zhihu.com/question/647572534/answer/3574446310)

本文主要介绍延迟绑定对加载动态库的影响（即对dlopen的影响）。此外本文对本专栏之前文章提到过的内容不再做重复介绍，对之前内容感兴趣的小伙伴可以看一下之前的几篇文章，这对阅读本文会有所帮助。

### 1 延迟绑定的好处

对于dlopen加载的动态库来说，并不是所有的外部函数都一定会被使用，通常只会使用到其中的一部分，那么如果在加载动态库加时，动态链接器就立刻对动态库中所有使用到的外部函数做重定位，这就会带来一些不必要的性能开销，尤其是动态库中使用外部函数非常多的时候，因为可能相当一部分的外部函数在程序执行时都不会被使用到。

PS：延迟绑定也会带来一些坏处，比如说延迟绑定会要求got.plt表在程序运行时可以被修改，这可能会带来一些安全隐患。

### 2 延迟绑定的使用

本小节主要介绍延迟绑定会在什么时候启用以及哪些动态库中引用的外部函数会被延迟绑定。

#### 2.1 哪些外部函数会被延迟绑定

能够延迟绑定的外部函数都有其对应的plt代码（plt代码指的是那个以@plt结尾的函数），它们的重定位信息会放在.rela.plt节中。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0621920ab603.jpg)

#### 2.2 什么时候会使用延迟绑定

有两种情况不会使用延迟绑定（不使用延迟绑定意味着动态库中所有的能够被延迟绑定的外部函数在动态库加载时会被立刻解析）：

- 被加载动态库中的dynamic节中设置了FLAGS为BIND_NOW。
- 当环境变量LD_BIND_NOW被设置为非空值时。
除以上两种情况外，延迟绑定都会被启用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d3f613ccab32.jpg)

设置了BIND_NOW
### 3 延迟绑定的具体表现

这里先介绍一些概念：

<strong>重定位：</strong>将外部符号在运行时的真实地址填写到.got或.got.plt section中。

<strong>.got：</strong>一个section， 里面保存着外部符号（函数或全局变量）在运行时的真实地址。注意：这里保存的函数都是不能够被延迟绑定的。

<strong>.got.plt：</strong> 一个section，里面保存着能够进行延迟绑定的外部函数在运行时的真实地址。

<strong>.rela.plt：</strong>一个section，里面保存着能够进行延迟绑定的外部函数的重定位信息。 

<strong>基地址：</strong> 动态库加载到内存时的起始地址。

之后我会介绍一下延迟绑定在运行时的具体表现，以下面这张图为例。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a14c24af6e86.jpg)

当动态库想调用__cxa_finalize函数时，会先调用__cxa_finalize@plt函数。__cxa_finalize@plt函数的具体执行流程与其是否是第一次被调用有关。

#### 3.1 第一次调用时

__cxa_finalize@plt中的第一条指令`jmp *0x460a(%rip)`会使pc跳转到0x5d990（这其实是相对基地址的偏移量）所保存的地址处（这里是地址无关的，通过当前pc值加上偏移量0x460a进行访存），这个0x5d990其实就包含在.got.plt节内，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d08f7829e122.jpg)

0x5d990里保存着__cxa_finalize@plt函数第二条指令`push $0x0`在运行时的真实地址（基地址+0x59386），于是执行完第一条指令后就会紧接着执行第二条指令，压入0（0其实是__cxa_finalize函数的重定位信息在.rela.plt节中的索引）到栈后跳转到0x59370处，然后又压入got.plt[1]的值到栈中，最后跳转到got.plt[2]中保存的地址。（这里为了描述的简单将got.plt看作一个usize类型的数组）

PS：压入栈的got.plt[1]中的值和0会用于辅助got.plt[2]中保存的函数（这个函数在glibc中叫_dl_runtime_resolve）的执行，以完成__cxa_finalize函数在第一次被调用时的重定位。got.plt[2]中保存的函数在完成__cxa_finalize函数的重定位后，__cxa_finalize函数的真实地址会被填写到0x5d990处并使控制流跳转到__cxa_finalize函数。

#### 3.2 之后调用时

如3.1所说，在完成__cxa_finalize函数的重定位后，__cxa_finalize函数的真实地址会被填写到0x5d990处，因此在之后的执行中__cxa_finalize@plt函数的第一条指令会直接跳转到__cxa_finalize函数的真实地址，执行外部函数__cxa_finalize中的代码。

### 4 动态链接器如何实现延迟绑定

本节主要介绍我实现的动态链接器是如何实现延迟绑定的。因为musl没有实现延迟绑定，所以我在实现时主要参考的是glibc里的实现。下面是我实现的动态链接器的仓库链接：

[](https://link.zhihu.com/?target=https%3A//github.com/weizhiao/dlopen-rs)

动态链接器实现延迟绑定需要分为两步：

- 在加载动态库时，进行一些简单的重定位，为后续的延迟绑定做一些准备。
- 在调用外部函数时，借助plt代码执行重定位外部函数的代码。
具体的实现代码在这两个位置：

[](https://link.zhihu.com/?target=https%3A//github.com/weizhiao/elf_loader/blob/main/src/arch/x86_64.rs)

[](https://link.zhihu.com/?target=https%3A//github.com/weizhiao/elf_loader/blob/main/src/relocation.rs)

#### 4.1 加载动态库时的准备

延迟绑定并不意味着动态链接器在加载动态库时完全不对.rela.plt节中的重定位信息做处理。

如第3节所说当调用__cxa_finalize函数时，会先调用__cxa_finalize@plt函数，__cxa_finalize@plt中的第一条指令`jmp *0x460a(%rip)`会使pc跳转到0x5d990所保存的地址处。在第一次调用__cxa_finalize@plt时，0x5d990其实保存着__cxa_finalize@plt中第二条指令push $0x0的地址，但这个地址在动态库被加载到内存前是不知道的，因此需要动态链接器在加载动态库时对0x5d990里保存的内容进行重定位，好让plt代码能够正常工作。

那么动态链接器是如何完成重定位的呢？这里离不开静态链接器（这里为了与动态链接器做区分，我将ld/lld叫做静态链接器）的配合，从下图中可以看到，0x5d990中保存的是0x59386（小端序，这是直接编码到动态库文件里的），这恰好就是__cxa_finalize@plt的第二条指令相对于基地址的偏移量。所以动态链接器在加载动态库时只需将0x5d990中保存的内容加上基地址，就可以得到__cxa_finalize@plt的第二条指令在运行时的真实地址。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ce2edc7f203f.jpg)

除了对.rela.plt节进行简单的重定位外，动态链接器在加载动态库时还需要向got.plt[1]（对应着0x5d980）填入辅助延迟绑定的结构体的地址，向got.plt[2]（对应着0x5d988）处填入延迟绑定的处理函数dl_runtime_resolve的地址。需要注意的是这里的填充与CPU指令集架构有关，不同指令集的填充位置不一样。

`pub(crate) fn prepare_lazy_bind(got: *mut usize, dylib: usize) {
    extern "C" {
        fn dl_runtime_resolve();
    }
    unsafe {
        got.add(1).write(dylib);
        got.add(2).write(dl_runtime_resolve as usize);
    }
}
`

以上就是动态链接器为了实现延迟绑定在动态库加载时所做的工作，虽然也需要一点简单的重定位，不过相较于不使用延迟绑定时到依赖的动态库中找所需的符号就快了很多。

#### 4.2 调用外部函数时重定位外部函数

如3.1节所说，最后要通过got.plt[2]中保存的函数dl_runtime_resolve来完成外部函数的重定位，dl_runtime_resolve是由动态链接器实现的，它是使用汇编代码来写的。下面是我实现的动态链接器中dl_runtime_resolve函数的实现：

`global_asm!(
    "
    .text
    .globl dl_runtime_resolve
	.type dl_runtime_resolve, @function
	.align 16
dl_runtime_resolve:
// 保存参数寄存器,这里多使用了8字节栈是为了栈的16字节对齐
    sub rsp,8*7
    mov [rsp+8*0],rdi
    mov [rsp+8*1],rsi
    mov [rsp+8*2],rdx
    mov [rsp+8*3],rcx
    mov [rsp+8*4],r8
    mov [rsp+8*5],r9
// 这两个是plt代码压入栈的
    mov rdi,[rsp+8*7]
    mov rsi,[rsp+8*8]
// 调用重定位函数
    call dl_fixup
// 恢复参数寄存器
    mov rdi,[rsp+8*0]
    mov rsi,[rsp+8*1]
    mov rdx,[rsp+8*2]
    mov rcx,[rsp+8*3]
    mov r8,[rsp+8*4]
    mov r9,[rsp+8*5]
// 需要把plt代码压入栈中的东西也弹出去
    add rsp,7*8+2*8
// 执行真正的函数
    jmp rax
"
);
`

其实dl_runtime_resolve函数所做的事情很简单（下面描述是还是以__cxa_finalize函数为例）：

- 保存参数寄存器，因为在最开始这些参数寄存器里都保存着给__cxa_finalize的参数，而我们后续会调用dl_fixup函数完成重定位，所以为了不破环给__cxa_finalize函数传的参数，我们需要把它们都保存下来。（需要注意的是参数寄存器都是临时的，可以被被调用者改变）
- plt代码压入栈的值取出来，放到参数寄存器里。（具体压入的内容在第3节讲过这里就不再叙述了）
- 调用dl_fixup函数，完成重定位。
- 恢复参数寄存器。这里需要注意的是要把plt代码压入栈中的东西也弹出去。
- 执行真正的函数，即__cxa_finalize。
这里解答一些可能的疑问：

- 为什么dl_runtime_resolve函数不保存被调用者保存的寄存器？因为dl_runtime_resolve中使用的都是临时寄存器，即那些需要调用者保存的寄存器。
- 为什么不保存浮点参数寄存器？因为dl_fixup不会使用浮点参数寄存器，不过glibc在实现时会保存浮点参数寄存器。
此外不同指令集架构的dl_runtime_resolve函数会有所差别，上面展示的是x86_64上的实现。

下面是dl_fixup的代码，它的所做的事情是在当前动态库的依赖库里寻找__cxa_finalize函数，找到__cxa_finalize函数时将其真实的地址填到0x5d990处，并将__cxa_finalize函数的地址作为函数的返回值返回。

`unsafe extern "C" fn dl_fixup(dylib: &Dylib, rela_idx: usize) -> usize {
    let rela = &*dylib.pltrel.add(rela_idx);
    let r_type = rela.r_type();
    let r_sym = rela.r_symbol();
    assert!(r_type == REL_JUMP_SLOT as usize && r_sym != 0);
    let (dynsym, syminfo) = dylib.symbols.rel_symbol(r_sym);
    let symbol = dylib
        .closures
        .iter()
        .find_map(|f| f(syminfo.name))
        .or_else(|| {
            if dynsym.st_shndx != SHN_UNDEF {
                Some((dynsym.st_value as usize + dylib.segments.base()) as _)
            } else {
                dylib.dep_libs.iter().find_map(|lib| {
                    lib.inner
                        .symbols
                        .get_sym(&syminfo)
                        .map(|sym| (sym.st_value as usize + lib.base()) as _)
                })
            }
        })
        .expect("lazy bind fail") as usize;

    let ptr = (dylib.segments.base() + rela.r_offset()) as *mut usize;
    ptr.write(symbol);
    symbol
}
`

PS：__cxa_finalize重定位信息里保存的就是0x5d990，因此`let ptr =(dylib.segments.base()+ rela.r_offset())as*mut usize`会使ptr指向0x5d990在运行时的真实地址。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6b738880dd9c.jpg)

以上就是动态链接器实现延迟绑定的全部内容。

[编辑于 2025-02-04 19:22](//www.zhihu.com/question/21249496/answer/70677127797)・新疆

​3 条评论​89 ​喜欢​分享

​​

收起​