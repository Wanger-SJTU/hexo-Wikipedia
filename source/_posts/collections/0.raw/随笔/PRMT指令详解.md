---
title: PRMT指令详解
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: post
permalink: /collections/0.raw/随笔/PRMT指令详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

### 0x01 PRMT指令详解-通用模式

参考NV PTX ISA 8.1 文档，章节9.7.8.7 Data Movement and Conversion Instructions: prmt的内容。

- **prmt：**permute bytes from register pair

```nasm
prmt.b32{.mode} d, a, b, c; 
.mode = { .f4e, .b4e, .rc8, .ecl, .ecr, .rc16 }
```

PRMT指令，会从两个 32 位寄存器a, b,中选取四个任意字节，重新组成32位值，并保存在目标寄存器中。在通用形式（未指定模式）中，最终选取的4个字节，由四个 4 bit的选择器组成。PRMT指令会将两个源寄存器a,b中的字节编号为0到7，具体形式为：

```nasm
{b,a} = {{b7,b6,b5,b4}，{b3，b2，b1，b0}}
```

对于目标寄存器中的每个字节，定义了一个 4 位选择器。选择值的 3 个 低位lsb 指定应将 8 个源字节中的哪一个移至目标中位置。 msb 定义是否应直接复制原始字节值，或者是否应复制符号（即，是否进行符号扩展）；msb=0表示直接复制原始的bit值，msb=1，则表示进行符号扩展。为简单起见，这里只关注PRMT指令的通用形式。（事实上，这个指令还有f2e、b4e、rc8等特殊模型）

![](https://pic2.zhimg.com/v2-f03e55f3f89799aee0072a3cc30aa3f1.webp)

对于这条指令：

```nasm
prmt.b32{.mode} d, a, b, c; 
```

d是目标操作数，a,b分别是两个32bit的源操作数，c是选择器。需要注意的是，c中只有低16位是有用的（即使输入的是32bit寄存器），因为，d.b_i 中只有四个待确定的字节，每个字节需要 4 bit作为选择器，从 {b,a} = {{b7,b6,b5,b4}，{b3，b2，b1，b0}} 中选择对应的字节作为自己的值。之所以4bit，是因为3bit就可以索引0~7，覆盖了8个字节，还需要1bit表示是否进行符号扩展。举个例子：

```nasm
c[3:0] -> 0001 -> msb 0 lsb 001 -> 不进行符号扩展，并选择 index 1的字节，即 b1 -> d.b0 = b1
```

### 0x02 总结

本文整理了CUDA 12 PTX ISA 8.1汇编指令集中PRMT.B32指令的通用模式具体用法。其中PRMT指令的操作粒度是字节byte，适用于整字节的permute操作