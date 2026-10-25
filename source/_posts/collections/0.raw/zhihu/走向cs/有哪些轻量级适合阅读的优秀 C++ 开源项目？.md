---
title: "有哪些轻量级适合阅读的优秀 C++ 开源项目？"
date: "2021-10-26 00:00:00"
updated: "2021-10-26 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/走向cs/有哪些轻量级适合阅读的优秀-C-开源项目/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/40131963/answer/2189473621"
---


我关注编译领域的项目比较多，我就简单介绍几个编译的小项目：

1、LLVM的tutorial文档（[LLVM Tutorial: Table of Contents](https://link.zhihu.com/?target=https%3A//llvm.org/docs/tutorial/)）中，有一个My First Language Frontend with LLVM Tutorial的小项目，用了很少的代码覆盖了编译器的各个环节，适合没有编译器经验的人用来熟悉编译器的各个环节：

[My First Language Frontend with LLVM Tutorial](https://link.zhihu.com/?target=https%3A//llvm.org/docs/tutorial/MyFirstLanguageFrontend/index.html)

这个项目只要求有C++经验，并不要求有编译器开发经验。

2、shecc : self-hosting and educational C compiler

一个非常小巧的编译器，学习用非常好，而且有arm和riscv版本。

shecc`is built from scratch, targeted at 32-bit Arm and RISC-V architecture, as a self-compiling compiler for a subset of the C language.

[https://github.com/jserv/shecc](https://link.zhihu.com/?target=https%3A//github.com/jserv/shecc)

3、llvm-tutor

llvm-tutor是一个学习LLVM pass的小项目，列出了一系列可以运行并且适合学习的pass，这对于想了解和熟悉LLVM pass机制和其实现的小伙伴非常方便。

[https://github.com/banach-space/llvm-tutor](https://link.zhihu.com/?target=https%3A//github.com/banach-space/llvm-tutor)