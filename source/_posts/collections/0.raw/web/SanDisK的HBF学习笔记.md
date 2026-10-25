---
title: SanDisK的HBF学习笔记 - Winnie shao
date: "2026-04-23 00:00:00"
updated: "2026-04-23 00:00:00"
layout: post
permalink: /collections/0.raw/web/SanDisK的HBF学习笔记/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 微信
  - 存储
source_url: https://mp.weixin.qq.com/s/R4mMgZdQXtpTaaIThxwLew
---


先写一句题外话，有朋友2025年中就提醒我买入SanDisk，我听了200左右买了，恐慌中180卖了，不但没有赚到钱，还赔钱了... ...后来在400左右再买入，非常纠结，也没有拿很久，一有风吹草动就跑了.. ...好歹赚钱了。现在看，900多块钱，有什么可怕的。 

我当时就是单纯的不喜欢亏损企业... ... 但是由亏转盈是收益最高的股票类型。

当然我真不是因为要炒sandisk的股票，才学习HBF的。当然是因为DAVID PATTERSON的“Challenges and Research Directions for Large Language Model Inference Hardware” （参考文献6）中，给出的几个解决方案中，提到了HBF。

回到技术产品层面，看看HBF。

HBF（High-Bandwidth Flash）：

为 AI 推理设计，**带宽接近 HBM、容量是 HBM 8–16 倍**。

单颗 **256Gb**、16 层堆叠达 **512GB**、带宽 **1.6TB/s**。

功耗与尺寸匹配 HBM4，**低成本大容量 AI 内存**。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/AKfYzxeJTZ2M7ced9XicPaY9AuaRax9c5YxK4GQYmRyhXmwaoke198BdPyR8eWKu5qX65f48OasOuSj1nDueKh6iazibyJD1Y6FD4XxXvKFBDs/640?wx_fmt=jpeg&from=appmsg)
架构原理：NAND + HBM 封装的混血技术

3D NAND 内核：基于 SanDisk 最先进的  BiCS8 218 层 3D NAND
 闪存，保证大容量与低成本
HBM 式封装：采用  TSV 硅通孔 + CBA 直接键合（CMOS Bonded to Array，核心技术就是Hybrid bonding）技术，多层垂直堆叠

并行子阵列：内部设计成千上万个独立单元并行读写，彻底突破传统 SSD 的带宽瓶颈
![](https://mmbiz.qpic.cn/sz_mmbiz_png/AKfYzxeJTZ0FcL86YfOnIQ5RaKSSTolt0geGabxkyyMD65bXDwNicPb8tKDrEBF56LWZX3dnbMVRfIbSIsvCM2P7LEjD69GqjptzKlQIo8c0/640?wx_fmt=png&from=appmsg)

目前Sandisk，与SK 海力士签署战略合作，共享专利、共建标准。然后在OCP内成立工作组，联合三星，防止生态分裂。 

闪迪计划在 2026 年下半年交付首批 HBF 内存样品，并预计首批采用 HBF 技术的 AI 推理设备样品将于 2027 年初上市。

听起来很近的样子。不过，怎么用呢？ 

SK Hynix 发了一篇IEEE论文，给了一个HBM和HBF的混合方案做大模型的推理的方案。（参考文献4）

如下图： HBF和HBM都放在interposer上，和GPU/xPU直接互联。

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/AKfYzxeJTZ0b0Z14wFuRj3g9hqCAn5AcwK1YMBBU3u1K30pnvdZm6uIx4rnoIkS4P9aMdHJ6AvPW4anpH9EqegkAwKrblicf8rcCibfCmCSibw/640?wx_fmt=jpeg&from=appmsg)

HBF的特性是只能写差不多100,000次，因此只适合存放read-only的数据。SK Hynix论文中给的方向是“ a shared pre-computed key-value cache” ，这就是类似“Cache-augmented generation (CAG) ”的业务。

在SK Hynix论文中，计划模型权重和提前计算的KV cache放在HBF中，充分利用HBF的容量。同时，为了掩盖HBF的延迟，在HBM的 base die中有一个 预取buffer-a latency hiding buffer (LHB)。

![](https://mmbiz.qpic.cn/mmbiz_jpg/AKfYzxeJTZ3l5iagTcHKOH4K6ZJS3QtIc0ljTRxGVUYByWYicIgTWfbu1eE9NRc3TgAs3govWhc8KW0EuVq1cRcDTnz9Cz3JkgcyRA9kIFX4I/640?wx_fmt=jpeg&from=appmsg)

～～～～

这样盘点一下， 第一代HBF 512GB/1.6TB/s，跟HBM4差不多容量，带宽要小... ... 省钱？Hybrid bonding不便宜，interposer一样的，还要一个latency hiding buffer（SRAM），能省到哪里去？ 

另外，我查到DAVID PATTERSON做了HBF的Technical Advisory Board（参考文献7）... ... 嘻嘻，这绝对贡献了一个原因吧。

![](https://mmbiz.qpic.cn/mmbiz_jpg/AKfYzxeJTZ0kTQ6L9p0opBzD5R9Co5ZoqcRFClgWSd6dbcnyEia8nBQOlUua3o4H0KTEYjC6Dbkq0mAxNibqePLW7D6mRXrkyIhaPhVIm9eib0/640?wx_fmt=webp&from=appmsg)

参考文献：

1. Scaling the Memory Wall: Behind Sandisk’s High Bandwidth Flash for AI Inferencing： https://www.sandisk.com/it-it/company/newsroom/blogs/2025/scaling-beyond-the-wall-inside-sandisks-high-bandwidth-flash-for-ai#:~:text=High%20Bandwidth%20Flash%20(HBF)%E2%80%94a%20new%20form%20of,while%20offering%20a%20significant%20increase%20in%20memory

2. https://www.oscoo.com/news/hbf-a-high-bandwidth-flash-new-star-breaking-the-memory-wall-for-ai/

3. https://documents.sandisk.com/content/dam/asset-library/en_us/assets/public/sandisk/collateral/company/Sandisk-HBF-Fact-Sheet.pdf

4. https://semiwiki.com/forum/threads/sk-hynix-proposes-hbm-and-hbf-hybrid-for-llm-inference.24754/

5. https://www.eetimes.com/nand-reimagined-in-high-bandwidth-flash-to-complement-hbm/#:~:text=In%20a%20recent%20IEEE%20paper%2C%20SK%20Hynix,HBF%20alongside%20the%20GPU%20responsible%20for%20computation.

6. Challenges and Research Directions for Large Language Model Inference Hardwarehttps://arxiv.org/abs/2601.05047

7. https://www.sandisk.com/company/newsroom/press-releases/2025/2025-07-24-sandisk-forms-hbf-technical-advisory-board-to-guide-development-and-strategy-for-high-bandwidth-flash-memory-technology