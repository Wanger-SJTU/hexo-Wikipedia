---
title: AXI的性能计算
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/AXI的性能计算/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2027748507956572209
---


计算axi的带宽

假设axi 数据位宽是64bit，burst len为16，osd能力为16，时钟为100M，发起一次读往返Lantency为512cycle，求数据带宽

每次传输为512/16=32cycle，传输的数据为16X8=128B

单周期的数据量为128/32=4B，带宽为4x100M=400MB

计算osd能力

位宽为64bit，burst len为16，时钟为100M，lantency为512cycle，带宽为400MB

每个cycle的数据量为400/100=4B，每次传输是16x8=128B，一次传输的latency是128/4=32个cycle，512/32=16