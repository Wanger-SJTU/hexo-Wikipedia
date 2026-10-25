---
title: 计算机虚拟化技术有那么难吗，VMware 是怎么做到的？
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/计算机虚拟化技术有那么难吗,VMware-是怎么做到的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/26445430/answer/2455505189
---


知乎用户

117 人赞同了该回答

硬件虚拟化技术出现的时间比较晚，大概在2006年左右吧。硬件虚拟化技术出现之后，虚拟机的实现变得简单了些，之间使用软件实现虚拟化以弥补x86的虚拟化漏洞还是蛮困难的。

我写了一个小项目桃花源（英文名为 peach），该项目是一个迷你虚拟机，用于学习 Intel 硬件虚拟化技术。学习该项目可使读者对 CPU 虚拟化、内存虚拟化技术有个感性、直观的认识，为学习 KVM 打下坚实的基础。peach 实现了如下功能：

- 使用Intel VT-x技术实现CPU虚拟化
- 使用EPT技术实现内存虚拟化
- 支持虚拟x86实模式运行环境
- 支持虚拟CPUID指令
- 支持虚拟HLT指令，Guest利用HLT指令关机代码仓库如下：

https://gitee.com/pandengyang/peach.git
https://github.com/pandengyang/peach.git

阅读全文​
​赞同 117​​9 条评论​202 ​24 ​分享