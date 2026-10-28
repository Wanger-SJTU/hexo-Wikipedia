---
title: "ISSCC2025：IBM Telum II L2 Cache优化"
date: "2025-03-15 00:00:00"
updated: "2025-03-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/ISSCC2025-IBM-Telum-II-L2-Cache优化/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/30500573727"
---


Telum II® overview和Summary

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_83613bd12907.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cf20d9c6d9d3.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b323a8d22be5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_574140d5e80b.jpg)

主要是介绍了三个方面：L2 Cache，On-die Data Processing Unit (DPU)，AI Accelerator， Core Construction 使8 cores running at 5.5GHz

在L2 Cache方面，36MB的容量，3.6ns的访问时间，估计在10多个cycle的样子，Designed with Samsung’s high-density SRAM bitcell

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5bf54ad27dfd.jpg)

Samsung’s high-density SRAM bitcell方面主要通过设计工艺协同优化（DTCO），利用负位线电压（NBL）去改善写入Vmin

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aa76073ae087.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_159537378a78.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a7835a58ef59.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_49eeddf756a5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d8b5937629f6.jpg)

FinFET晶体管尺寸的量化一直是主要挑战，并迫使高密度6T SRAM单元中的所有晶体管仅能使用一个Fin。通过<strong>设计工艺协同优化（DTCO）</strong>对设计进行了优化，以提供高性能和高密度以及高产量和可靠性。

2017年至2019年的SRAM单元面积缩小速度远慢于2011年至2017年的速度，这表明SRAM单元的微缩速度没有跟上逻辑区域的部分。在IEDM 2019上，5nm工艺的逻辑密度提高了1.84倍，而SRAM密度仅提高了1.35倍。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d048373758dc.jpg)

2011年至2019年的SRAM单元面积微缩历程　为了降低功耗，一种关键方法是降低SRAM阵列的最小工作电压Vmin。5nm工艺中增加的随机阈值电压变化限制了Vmin，进而限制了功耗的降低。SRAM电压减小趋势如下图所示，其中蓝线表示没有写辅助的Vmin，红线表示有写辅助的Vmin，显示了每一代写辅助的巨大好处。可以看出，从7nm到5nm的Vmin几乎没有改善，表明必须通过改善写入辅助电路来进一步降低功耗。本文主要介绍两种写辅助方，以实现较低的Vmin工作电压：负位线（NBL，Negative Bit Line）和降低单元VDD（LCV，Lower Cell VDD）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_41409070858e.jpg)

没有写辅助（蓝线）和有写辅助（红线）的SRAM工作电压随节点变化图SRAM单元示意图如下图所示，显示了PU与传输门晶体管PG之间在写入操作期间的竞争。采用较强的PU晶体管可以获得较高的读取稳定性，但会显着降低写入容限，并导致写入Vmin问题。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_910f42dce273.jpg)

SRAM单元示意图，显示了PU和PG 之间在写入过程中的竞争改善写入Vmin的第一种方法是降低写入期间的位线电压，称为负位线电压（NBL）。这种方法业界已经使用了几年，使用MOS电容器在位线上产生负偏置信号，但是这种写辅助电路会导致芯片面积增大。此外，固定数量的MOS电容会在短BL配置中引起过高的NBL电平，并可能导致短位线上的动态功耗过大，

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a97745d150a5.jpg)

固定数量的MOS电容会在短BL配置中引起过高的NBL电平，并可能导致过高的动态功耗，金属电容器NBL可以避免该问题　　通过基于SRAM阵列上方金属线的耦合金属电容器方案，可以避免过压和MOS电容器面积问题。为避免补偿过量，可以使用SRAM阵列位线长度来调节金属电容器的长度，从而节省动态功耗。此外，还可以调节NBL电平，以补偿远侧存储单元上的由于字线IR下降引起的写入能力的损失。

NBL使能信号（NBLEN）驱动金属电容器C1的一侧为负，该电容在虚拟电容C1处耦合一个负偏置信号。然后接地节点NVSS，通过写驱动器WD和列多路复用器连到选定的位线。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a8421eabc76a.jpg)

NBLEN将可配置的金属电容器C1 耦合到NVSS具有不同位线配置的NBL耦合电平，表明可配置金属电容器C1可以随位线长度调节，从而可以减轻具有不同位线长度的耦合NBL电平的变化。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2ce4c7868bd8.jpg)

具有不同位线配置的NBL耦合电平写入辅助的第二种方法是降低单元VDD（LCV）。LCV的常规技术需要强偏置或有源分压器才能在写操作期间调整列式存储单元的电源电压，但是这些技术在整个工作时间内会消耗大量的有功功率。脉冲下拉（PP，Pluse Pull-down）和电荷共享（CS，Charge Sharing）技术是两种替代解决方案，但PP难以精确计时。因此，如图9所示，台积电提出了使用阵列顶部的金属线作为电荷共享电容器来实现CS方案。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6a658c24c0cf.jpg)

使用SRAM阵列顶部的CS金属走线实现LCV的电荷共享，以实现写辅助在写操作中，LCV使能信号（LCVEN）变为高电平，它关闭下拉NMOS（N1），以将电荷共享电容器C1与地断开。COL [n：0]选择一列以关闭P0，并将阵列虚拟电源轨CVDD [0]与真实电源VDDAI断开。由于金属线电容随存储单元阵列的缩小而缩小，因此它也有利于SRAM编译器设计，并在变化的BL配置下提供了相对恒定的电荷共享电压电平。电荷共享水平由CVDD的金属电容比和电荷共享金属走线决定。图10显示了三个LCV-VDD比率分别为6％，12％和24％。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6d0f6165c088.jpg)

三种LCV-VDD比率分别为6％，12％和24％使用Write Assist的测量结果显示NBL将Vmin提高了300mV，而24％ LCV则将Vmin提高了300mV以上。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5287e5bc8ea3.jpg)

（a）金属电容器增强的写辅助WAS-NBL方案和（b）金属电荷共享电容器WAS-LCV方案的测量结果高迁移率通道通过约18％的驱动电流增益提高了5nm工艺的性能，该技术已在IEDM 2019上进行了详细描述

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cd92e4ea58d3.jpg)

这种性能提升的例子是用于L1高速缓存应用的高速SRAM阵列在0.85V电压下达到了4.1GHz，

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aed933261e6f.jpg)

用作高性能L1 HD SRAM阵列的Shmoo图在0.85V时显示4.1 GHz![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c9422ab706a4.jpg)

台积电5 nm 工艺135 Mb SRAM测试芯片参考资料

- IBM Telum II®: Next Generation 5.5GHz Microprocessor with On-Die Data Processing Unit and Improved AI Accelerator
- [台积电5nm SRAM技术细节](https://link.zhihu.com/?target=https%3A//www.163.com/dy/article/F775BSGI0511CPMT.html)
- [芯片顶级盛会Hotchips 2020年-英特尔牙膏挤爆一年（附全部资料下载）](https://link.zhihu.com/?target=https%3A//blog.csdn.net/tianxiaer359/article/details/136573156)