---
title: NAND flash 学习笔记 (1)
date: "2025-09-02 00:00:00"
updated: "2025-09-02 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/NAND-flash-学习笔记-(1)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1946154917942268996
---


NAND Flash原理
先整体看一下NAND Flash。最小的存储单元是一个Cell，32个Cell连成一条String，很多条String排列成一个Block，就是一块存储阵列。

![](https://pic2.zhimg.com/v2-4c873072c5cc0983ccc0e3e6975c9433_r.jpg)Single Cell 示意图单个Cell由Nch MOS加上Floating gate（FG）构成。电荷信息存储在FG中，FG的电位由Control gate（CG）来控制。

![](https://pica.zhimg.com/v2-1fe4693d21b85a4e2bfd1fe0a8fba118_r.jpg)
![](https://pica.zhimg.com/v2-de9aa8308defa1d973b91d843fc13db0_r.jpg)一条String中32个Cell的Source和Drain首尾相接连成一串，Drain端接到Bit Line (BL) 由SGD隔离和控制，Source端接到source line（SL）由SGS控制。

![](https://picx.zhimg.com/v2-d8dbd7046e8697e40aa44420bdd8505b_r.jpg)Top view整块存储阵列，Active area line（横向）与Gate line（纵向）相互垂直。同一个String的Cell在一条AA上，接同一BL。CG横跨多个String，共享CG的Cell接同一Word line （WL）。这样一来，如同棋盘的格点，由BL+WL的交点，就可以定位到某一个Cell。

![](https://pic4.zhimg.com/v2-e94a88b8a66345cebb73dc5c1d6adc25_r.jpg)那么，同一条WL上的Cell，从逻辑上构成了一个Page，也就是NAND读写的基本单位。前面提到很多条Sting排列成Block，这里的条数，就是Page的大小，通常有2K~16K+ECC。Page越大，并行的读写效率越高，但对应的读写电路也要越大。

![](https://picx.zhimg.com/v2-8fd3f017b97abfb921712ce2ed004c73_r.jpg)NAND flash芯片除了Cell部分，还有Peripheral器件。外围电路有逻辑（1.8V）和驱动（26V），因此要求多种电压的器件。对于高压器件，要用到更厚的Gate oxide （25~40nm)，被用于Row decoder/word-line driver和bit-line selector。外围电路而且为了节省成本，外围电路的制造，应该与Cell同时完成，尽可能不增加工艺步骤。