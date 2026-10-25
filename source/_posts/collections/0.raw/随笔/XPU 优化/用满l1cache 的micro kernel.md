---
title: 用满l1cache 的micro kernel
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/XPU-优化/用满l1cache-的micro-kernel/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---


https://zhuanlan.zhihu.com/p/383115932?utm_campaign=&utm_medium=social&utm_oi=31223103619072&utm_psn=1631798239891628032&utm_source=md.obsidian

![v2-1b510a45eb93f35c81f6b9399a198098_1440w.webp](/images/collections/assets/v2-1b510a45eb93f35c81f6b9399a198098_1440w.webp)
仅仅以l1cache下来说

参考这个 汇编考虑一下实现一个高性能的 kernel需要考虑
- 寄存器最大复用
- 读写顺序
- 竞争冒险
- 

#TODO to
- 写一个arm汇编，90%的'''gflops
- simpleperf 优化
- 


