---
title: "SVE-1 SVE的谓词寄存器"
date: "2026-04-11 21:40:18"
updated: "2026-04-11 21:40:18"
layout: "post"
permalink: "/collections/0.raw/随笔/SVE-1-SVE的谓词寄存器/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

#sve 

## 谓词寄存器
![Pasted image 20230715163356.png](/images/collections/assets/Pasted%20image%2020230715163356.png)

- 谓词寄存器的长度是SVE 向量寄存器的1/8，正好对应了最小位宽时的uint8的数目。
- 谓词寄存器的1bit 对应了向量寄存器的1 Byte
- 当数据位宽大于8bit时，只有最低位是有效的（1=active 0=inactive.）

- 谓词寄存器通过`PTRUE` `PFALSE` 命令初始化，并在xx中变化。初始化模式有全部、2的指数次，3的倍数，uimm5

> 	 在ARM体系结构中，uimm5（Unsigned Immediate 5-bit）是一个用于表示无符号立即数的5位字段。它用于指令中的操作数或指令的操作码中，提供了一个0到31之间的无符号整数值
> 	 uimm5常用于指令的立即数字段，用于表示一个小的无符号整数值，例如用作位移、计数或偏移量等。由于它只有5位，因此可以表示的范围是0到31。
> 	 在指令编码中，uimm5通常以二进制形式表示。例如，在某些ARM指令中，uimm5可能用于表示位移量，指定要对寄存器进行的位移操作的位移量值。


- 对无效的向量部分，支持 Zeroing(/Z) or Merging(/M) 

