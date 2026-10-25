---
title: (1 封私信) 有哪些轻量级适合阅读的优秀 C++ 开源项目？
date: "2026-04-14 00:00:00"
updated: "2026-04-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/笔试面试/有哪些轻量级适合阅读的优秀-C-开源项目/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/40131963/answer/2189473621
---


我关注编译领域的项目比较多，我就简单介绍几个编译的小项目：

1、LLVM的tutorial文档（LLVM Tutorial: Table of Contents）中，有一个My First Language Frontend with LLVM Tutorial的小项目，用了很少的代码覆盖了编译器的各个环节，适合没有编译器经验的人用来熟悉编译器的各个环节：

My First Language Frontend with LLVM Tutorial

这个项目只要求有C++经验，并不要求有编译器开发经验。

2、shecc : self-hosting and educational C compiler

一个非常小巧的编译器，学习用非常好，而且有arm和riscv版本。

shecc`is built from scratch, targeted at 32-bit Arm and RISC-V architecture, as a self-compiling compiler for a subset of the C language.

[https://github.com/jserv/shecc](https://link.zhihu.com/?target=https%3A//github.com/jserv/shecc)

3、llvm-tutor

llvm-tutor是一个学习LLVM pass的小项目，列出了一系列可以运行并且适合学习的pass，这对于想了解和熟悉LLVM pass机制和其实现的小伙伴非常方便。

[https://github.com/banach-space/llvm-tutor](https://link.zhihu.com/?target=https%3A//github.com/banach-space/llvm-tutor)

[![](/images/collections/0.raw/zhihu/%E7%AC%94%E8%AF%95%E9%9D%A2%E8%AF%95/asset/img_18764266d1e6.jpg)广告

程序员超强大脑（图灵出品）

京东

¥44.90

去购买​

](https://union-click.jd.com/jdc?e=jdext-1781449016246149120-0-1&p=JF8BAT8JK1olXwMFXV1VCUgSCl8IGVMRWgQLXW4ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYAXFpaCkIeHDZNRwYlCnlpPQoaeEhyYXUWXQ9KDWVBFxstXkcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kIHV8VXAIHVl1eD3sXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVWw8CUVtVCUsQAGoPG14dXQUDSF9BCHsXAm4IE10TWwMAOl8zCEMUCmkKG1MdWTYCZF1tViUWUGpfEggQXGhfHV8EXxFJBQEIG1wSXwcHUlhtCkoWAW04K2sRW3YEMD44AR5PRSxdZQx9I2dbEhYZfDF5ATRSE1tWP2VBASkqDE1HeStOK14l)[![](/images/collections/0.raw/zhihu/%E7%AC%94%E8%AF%95%E9%9D%A2%E8%AF%95/asset/img_8ea3d9696ecb.jpg)广告

程序员思维修炼(修订版)(图灵出品)

京东

¥42.60

去购买​

](https://union-click.jd.com/jdc?e=jdext-1781449029454016512-0-1&p=JF8BAT8JK1olXwMFXV1VCUgSCl8IG18dWAcEXG4ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYCUFZYCU0fHDZNRwYlLXhEITUoTgN1QRlgQClJDkdJHwMpeEcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kIHV8VXAIHU1xaD3sXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVWw8CUVtVCUgfBmsNGlsSWQYBSF9BCHsXAm4IE10TWwMAOl8zCEMUCmkKG1MdWTYCZF1tViUWUGkAGA5AX2hfHV8EXxQVXAEIG1wcWAYDVFdtCkoWAW04K2tTBXB3Px5bWilDRg99WSNPNGNXIQEDSCB5AT9KEi51XVMLNiYlThNAfidOK14l)[![](/images/collections/0.raw/zhihu/%E7%AC%94%E8%AF%95%E9%9D%A2%E8%AF%95/asset/img_d83387e54800.jpg)广告

商业开源 开源软件许可实用指南 第三版

京东

¥73.70

去购买​

](https://union-click.jd.com/jdc?e=jdext-1781449151592939520-0-1&p=JF8BAT8JK1olXwMFXV1VCUgSCl8IGVMdVQEEU24ZVxNJXF9RXh5UHw0cSgYYXBcIWDoXSQVJQwYAXFZVD00QHDZNRwYlGUVqNVgodx51cCsBHABLPGdwIx4AXkcbM28BG1kdXAcCU11tCEoWA2sNGFgTXDYyVFttWiXPtdnQvuoJiayNgdbKOEonA2kIHV8VXAIEUFtUD3sXC2s4zfWBiI69je743uG51uK4ztK-ibiEZG5tC3tMVjtBXkcVWw8CUVtVCE8XB2cLE1kdWQUDSF9BCHsXAm4IE10TWwMAOl8zCEMUCmkKG1MdWTYCZF1tViUWUGgNHFtHCGhfHV8EXkNNUQEIG18QVQEKVVdtCkoWAW04K2sWVH9qFD8-bjdLBBF8GwF3PH9rPAdYdB55ATxXeC9rXnxpKCMgC0JvZShAK14l)

[编辑于 2024-06-04 22:16](//www.zhihu.com/question/40131963/answer/2189473621)・吉林

​​3246 ​199 ​分享

​​
