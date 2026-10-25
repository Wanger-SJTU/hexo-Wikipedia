---
title: "NAND Flash工艺笔记 (1)"
date: 2026-01-20
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1996879434335142892

---

我们来学习一个基于2010年后技术节点的Flash NAND工艺流程，它包含几个典型特征：自对准浅槽隔离（SA-STI）、ONO（氧化硅-氮化硅-氧化硅）介电叠层、双多晶硅栅（浮栅和控制栅）、自对准源/漏、钨接触以及铜互连。

一个Flash器件类似NMOS，在栅极和沟道之间增加了浮栅用于存储电荷。器件Vt随浮栅中束缚电子多少而改变，即可以把数据存储为Vt状态。同时，电子能长期束缚在栅极中，不需要电源维持，所以Flash是非挥发性存储器。

![](https://pic2.zhimg.com/v2-0ba730418fe74155c367766a7b3cd225_r.jpg)虽然目前的大容量SSD都已采用3D NAND工艺，堆叠层数达到200+。但是，未来许多年，大量工业嵌入式应用仍然需要平面NAND。在这些小到中等容量领域，最后一代平面NAND工艺仍具有可观的性价比。下图为各大存储厂商2Xnm节点产品的截面。

![](https://pic1.zhimg.com/v2-be58b157dc5610705546fd024ed346e0_1440w.jpg)
![](https://pic3.zhimg.com/v2-db0545b3520d6bb0e0110fbbcdfd6cee_1440w.jpg)
1. 有源区 (Active Area, AA) 与自对准浅沟槽隔离 (SA-STI)
首先是Pwell implant，通常包含三个深度的B硼注入。最深的B implant能量>200keV，剂量~5e13，角度7°，形成约为1.0 µm的深结，主要作用是进行“倒掺杂”，减小CMOS器件的Latch-up。中能量B implant，能量~50keV，剂量~5e12，避免源/漏Punch-through。最浅的B implant用于精确调节Vt，能量~5keV，剂量~5E11，取决于器件的目标Vt。

接着生长栅氧化层 (Gate Oxidation)，作为浮栅晶体管的隧道氧化层。GOX通常用高温氧化，如干氧、RTP、ISSG等。炉管工艺的温度为900℃。快速热氧化RTP温度达到1200℃，具有更光滑的界面、更低的界面态密度和更少的固定电荷。氧化层厚度在60~100A，既要足够薄以保证编程和擦除时电荷能够通过FN隧穿电子有效穿过，又要足够厚以保证数据在非操作状态下有足够的保持时间，并控制栅泄漏电流。

Gox上沉积浮栅层多晶硅Polysilicon和硬掩模版（SiN或SiON），膜层结构如下图。Poly通常采用LPCVD工艺，温度约630℃，厚度3000A。浮栅厚度决定了储存电荷的容量，但过厚的浮栅层会影响后续工艺集成。浮栅可以直接原位掺杂，也可以用未掺杂多晶硅，再由离子注入掺杂。浮栅掺杂浓度高~1E20，有利于避免电子注入导致的耗尽问题，减少Vt发散。常用的硬掩膜材料是氮化硅 (SiN) 或氮氧化硅 (SiON) ，采用PECVD工艺，厚度~300A，功能是转移AA图形。

![](https://picx.zhimg.com/v2-5b4d2d73f9b716e662896385bc52ad79_r.jpg)下一步是AA光刻，将AA掩模版图案转移到Hard mask上。AA线宽和间距相同为25nm，保持1:1线宽比。下图是AA图案。CD缩小至F=25nm，而193nm浸没式光刻（Immersion Lithography）只能解析5xnm量级图案，无法单次曝光处理，所以需要使用多重成像技术，如自对准双重成像技术（Self-aligned Double Patterning, SADP）。

![](https://pic3.zhimg.com/v2-2d77cdc6a7681a4d6677e74aecb66c86_r.jpg)刻蚀硬掩模版。

![](https://pic4.zhimg.com/v2-5c377821304ca10ae35f018ca5aa6e4b_r.jpg)再依次刻蚀浮栅多晶硅、栅氧化层和硅衬底，形成隔离沟槽STI。浮栅和AA自对准。沟槽深度450~550nm，侧壁角度75°~80°，有利于后续高密度等离子体化学气相沉积（HPD CVD）的氧化物填充。

![](https://pic1.zhimg.com/v2-1abd49883355f3b55ac71fd40d3e50ce_r.jpg)接着填充沟槽填充，CMP磨掉多余的Ox。STI填充通常使用保形性好的HDP CVD氧化硅沉积工艺。然后通过化学机械抛光 (CMP) 去除多余的氧化物，并停止在硬掩膜上。

![](https://pic3.zhimg.com/v2-14a409e7990f0728cffbc83bb5e11ffc_r.jpg)最后通过一道硬掩模剥离，去除SiN/SiON硬掩膜，完成SA-STI结构部分工艺流程。

![](https://pic3.zhimg.com/v2-0e7a2f48a862274a0a82e5acb8b3fe5a_r.jpg)