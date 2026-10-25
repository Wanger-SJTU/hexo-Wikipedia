---
title: arm 汇编
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/XPU-优化/arm-汇编/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


## q0跟v0
q0跟v0指向的是同一个寄存器地址，前者是128bit 的scalar 后者是 vector

## 占位符访问向量寄存器的值

```c
FMLA v8.s v6.s v2.s[0]
```
`v2.s[0]` 第1个值

## 使用指定寄存器
```c
register unsigned char c asm("r3");
```


## objdump

```bash
llvm-objdump -gD main --arch=aarch64 --mattr=+sve> main.asm
```

## GNU 汇编的格式
```c
int src = 1;
int dst;   

asm volatile ("mov %1, %0\n\t"
    "add $1, %0"
    : "=r" (dst) 
    : "r" (src)
    :
    );

printf("%d\n", dst);
```

- 如果指令会改变条件码寄存器，则需要在 `cloberred list` 中添加 <strong>"cc"</strong>。
- 如果指令修改了内存中的内容，则需要在 `cloberred list` 中添加 <strong>"memory"</strong>，这样的话 GCC 就不会在寄存器中缓存这块内存的值。
- 如果被影响到的内存没有在输入输出中列出来，也需要加上 <strong>volatile</strong> 关键字。

- 寄存器操作数约束（"r"）——当操作数使用这种约束的时候，它（操作数）会被存进通用寄存器（Gnenral Purpose Register, GPR）
```c
asm (
	 "movl %%eax, %0\n" 
	 :"=r"(myval)
	 );
```
- 内存操作数约束（"m"）——当操作数在内存中，就会发生内存引用（as opposed to register constraints, which first store the value in a register to be modified and then write it back to the memory location）。一般来说，只有在必须使用寄存器约束或者能够快程序运行的地方，才会用到寄存器约束。
```c
asm("sidt %0\n" 
    : 
    :"m"(loc)
);
```
-  匹配约束（"数字"）——有时候，一个变量既要当做输入操作数又要当做输出操作数。这种情况下，在 asm 中使用匹配约束来指定。
```c
asm ("incl %0" 
     :"=a"(var)
     :"0"(var)
);
```

当你不想用寄存器去保存一个需要改变的 C 变量时，使用内存约束是最好的办法。

ref:to 
[GCC Inline Assembly HOWTO](https://zhuanlan.zhihu.com/p/69670366)
[EN_GCC-Inline-Assembly-HOWTO](http://www.ibiblio.org/gferg/ldp/GCC-Inline-Assembly-HOWTO.html)



!<span class="wikilink wikilink--missing" title="未导入的页面">随笔/XPU 优化/SVE-0 SVE特性以及寄存器</span>