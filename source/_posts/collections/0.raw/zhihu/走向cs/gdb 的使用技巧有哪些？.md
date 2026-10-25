---
title: gdb 的使用技巧有哪些？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/gdb-的使用技巧有哪些/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/586771392/answer/3229528090
---


收录于 · linux调试工具

### <strong>1.参考资料</strong>

- GDB调试指南   该文档按功能分类了gdb常用命令，结合例子，条理清晰
- GDB 常用命令  虽然大部分和资料1相同，但文档更全面, 包括多线程/进程调试
- GDB QUICK REFERENCE GDB Version 5  该快查表就2张纸，按功能分类了常用命令
- GDB QUICK REFERENCE GDB Version 4 
- Debugging with GDB 
- GDB: The GNU Project Debugger   官方网站，里面有大量完整/全面的文档，包括

- GDB User Manual
- GDB Internals Manual
- Reference Material

### <strong>2.常用命令快查</strong>

#### <strong>2.1启动调试</strong>

命令全名说明gdb a.out**rrun调试无启动参程序gdb a.out
set args 1 2 3
r调试启动带参程序k
rkill
run在gdb中重启被调试程序gdb a.out core调试coredump文件at 123attach调试已运行进程，pid=123
#### 2.2断点设置**

命令全名说明b 9break在程序的第9行设置断点b test.c:9在test.c的第9行设置断点b func_a在func_a开始处设置断点b test.c:23 if var_a==0设置条件断点，当var_a==0时，设置断点cond 1 var_a==0condition修改断点编号1产生断点的条件rb func_a*rbreak设置满足正则表达式的断点，这里是设置以func_a开头的函数断点rb .对所有函数设置断点，慎用，因为库函数也会设置rb test.c:.对test.c中的所有函数设置断点rb test.c:^print对test.c中以print开头的函数设置断点tb test.c:10tbreak在第10行设置临时断点(hit一次后，会自动删除)ig 1 30ignore忽略断点1后面的30次断点，第31次hit时会触发wa var_awatch给变量var_a设置观察点，当它的值改变时，会停止程序执行，打印出它的新旧值rwa var_arwatch同watch，差别是发生读访问时停止执行awa var_aawatch同watch，差别是发生读或者写时都会停止执行
#### <strong>2.3断点管理</strong>

命令全名说明info b查看所有断点状态cle func_aclear删除函数名为func_a处的断点cle filename:function删除文件filename中函数function处的断点cle lineNum删除行号为lineNum处的断点cle filename:lineNum删除文件filename中行号为lineNum处的断点deldelete删除所有breakpoints,watchpoints和catchpointsdel bnum删除断点号为bnum的断点disdisabledisable所有断点dis bnumdisable标号为bnum的断点enenable启用所有断点enbnum启用标号为bnum的断点
#### <strong>2.4 变量查看</strong>

命令全名说明p var_aprint打印基本类型变量，数组，字符数组p 'func_a'::var_a打印指定函数中变量p ptr_a打印指针变量中保存的地址p *ptr_a打印指针指向的内容,即ptr_a[0]p *ptr_a@5打印ptr_a[0]--ptr_a[4]p $打印上一次打印的变量p/FMT var_a按照特定格式打印变量，FMT说明如下disp var_adisplay设置var_a为自动显示变量，每次程序stop时会打印出它的值info dispinfo display查看自动显示变量的列表undispundisplay删除所有自动显示变量，即不在自动显示undisp 2删除标号为2的自动显示变量inf loinfo localsLocal variables of current stack frame
#### <strong>2.5查看内存</strong>

examine(简写为x)可以用来查看内存地址中的值。语法如下：

x/[repeat count] [FMT] [size letter] addr

repeat count打印的次数，每次打印的字节数由size letter指定，默认值为1

**

FMT指定打印格式:

x 按十六进制格式显示变量。

d 按十进制格式显示变量。

u 按十六进制格式显示无符号整型。

o 按八进制格式显示变量。

t 按二进制格式显示变量。

a 按十六进制格式显示变量。

c 按字符格式显示变量。

f 按浮点数格式显示变量。

size letter每次打印的字节数:

b 字节

h 半字，即双字节

w 字，即四字节

g 八字节

命令全名说明x/4xwexamine打印4次，每次4个字节，以16进制打印x/4ow打印4次，每次4个字节，以8进制打印![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_8b0406525370.jpg)

#### 2.6查看cpu寄存器**

命令全名说明info reginfo registers
#### <strong>2.7 单步调试</strong>

命令全名说明n [N]next执行下一行代码，不会进入子函数,可指定N执行下N行代码后停住s [N]step类似next,不同的是会进入子函数内部finfinish当进入子函数后，希望执行完该函数时，使用finish,函数执行完后会stop,然后打印出函数返回值c [N]continue继续执行到下一个(N个)断点u LineNumuntil继续运行到指定行号u test.c:9继续运行到指定文件的指定行号u func_a继续运行到指定函数sk a.cskip在执行step时，不会进入a.c文件sk func_a在执行step时，不会进入func_a函数inf skinfo skip查看skip列表
#### <strong>2.8 查看源码</strong>

命令全名说明llist列出源码行，继续按l后会继续往下打印代码行l -往上列出代码行l lineNum列出指定行号附近的代码l func_a列出指定函数附近的代码l test.c:1指定文件+行号l test.c:func_a指定文件+函数l *0x000000000000031d列出0x000000000000031d所在源码行
#### <strong>2.9查看backtrace</strong>

命令全名说明btbacktrace打印当前函数的调用栈，包括函数参数，位置bt full除了上面列出的信息，还包括局部变量的值inf frameinfo frame查看最外层(栈顶)的帧frame 2查看指定调用帧info locals查看局部变量的值bt

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_f7bcc1ea8ac3.jpg)

C语言函数调用栈(一)

C语言函数调用栈(二) 

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_c93a0cdeca2f.jpg)

**

查看backtrace details, bt full

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_665a27e9833b.jpg)

查看指定栈帧: frame 2

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_4858499b528f.jpg)

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_36af27976237.jpg)

  与上图配套的调用栈，可以看到通过rbp可以知道每个栈帧的内容，不断回溯到栈底。

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_6f5fab8865fd.jpg)

#### 2.10 多线程调试**

命令全名说明info threads查看当前进程的所有线程thread apply all bt打印所有线程堆栈参考 GDB 常用命令

[所属专栏 · 2025-07-24 23:49 更新](https://zhuanlan.zhihu.com/c_1793303128336117762)[![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_b284909e1ee4.jpg)linux调试工具

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_1775e301363d.jpg)双耳书生

11 篇内容 · 201 赞同

](https://zhuanlan.zhihu.com/c_1793303128336117762)订阅[最热内容 ·

linux 性能分析前60s该使用什么工具

](https://zhuanlan.zhihu.com/c_1793303128336117762)[发布于 2023-09-28 08:20](//www.zhihu.com/question/586771392/answer/3229528090)・江苏

​​824 ​67 ​分享

​​

收起​
