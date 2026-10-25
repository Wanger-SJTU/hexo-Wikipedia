---
title: "(2 条消息) 从微架构设计看ARM的发展之路"
date: "2024-11-21 00:00:00"
updated: "2024-11-21 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/从微架构设计看ARM的发展之路/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/8090380799"
---


### 导言

ARM最近过的是风生水起，嵌入式尽管遭遇`RISC-V`的冲击，但依然主导市场，手机端几乎垄断，PC端各个厂商都在推出ARM架构的产品，例如苹果，微软等。云端/高端计算也占据相当市场，例如阿里的一部分自研服务器，NV的计算芯片，亚马逊的芯片等等。有一种说法，ARM的服务器旗舰核基本追上了`Intel`和`AMD`，而功耗却低很多。本文依据网上资料简单阐述ARM微架构从A76-X925的变化（图片来自网络）。

### A76奠基之作

就技术角度而言，2018年ARM迎来了非凡的一年，推出了具备深远影响的A76核，代号`ENYO`，这一代的微架构不仅是移动端的开篇大作，也是服务器V/N系列的奠基之作，后续的服务器核也是源自A76改进。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_23dba7cfe51a.jpg)

### A77中坚力量

在2019年ARM推出了A77微架构，这一代比较前代加入了`uOp Cache`升级了预测器，加入`Mop Cache`这一设计影响了好几代微架构的设计。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ac87e98880e.jpg)

### A78设计好评

2020这一代微架构市场反馈非常好，A78相比较A77微架构设计没有大的改变，核心在优化功耗。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1b605f82b096.jpg)


### X1第一个超大核

同样在2020年，ARM第一次推出“超大核”X系列，对`Mop Cache`进行很大的升级，`Decode`通道也从4升级到5，说明预测器和ICache的优化都很好。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_365b82c185b8.jpg)


### A710

2021年推出的大核。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_948e0e443a81.jpg)


### X2

2021年推出的超大核，细节上有升级，但我关注的前端没看到核心改变。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a8dd58bb186.jpg)


### A715

2022年本代将decode升级为5路，说明前端发送指令能力水平提升。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d208c07f8cb3.jpg)


### X3

2022年推出X3，本代`L0 BTB`相比前代指数级增长，覆盖更大的指令范围，Decode宽度也到6路（这里说一下，我说的Decode宽度想表达的是前端能达到这个指令吞吐量，因为decode本身没有难度，你加到12，IFU送不来这么多指令是没用的，所以这里同时也在说IFU的能力，不是简单指硬件参数） 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a1180e7190b0.jpg)


### A720

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e57541313265.jpg)

### X4

2023年的超大核如果向官方宣称的那样，我觉得是X系列以来有大改变的一个版本，`Mop Cache`被删除，Decode宽度从前代6增到10，确保`Mop Cache`删除仍然能保持良好的性能以及功耗，同时说明前端发送指令的能力已经处在全球处理器设计的第一线。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fabc1d18aa42.jpg)


### A725

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ed2c183e0982.jpg)

### X925

2024年发布超大核X925，ARM觉得本代改变很大，觉得X5这个名字配不上这代了，直接改名字。L2直接到3MB，decode保持10路，可能相比前代优化了吞吐量，具体没有研究手册。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c2fd9ff63ed4.jpg)


### 总结

从A76开始，ARM大概2年左右微架构会有一次比较大的升级，每年都会有一定的进步，并且设计越来越成熟，现在的ARM就微架构与设计能力而言（服务器/移动端），在全球都是排在前列，如果从A76开始算起，ARM从一个相对落后的状态到和领先厂商并驾齐驱大概花了6年。亦安之前没有过多研究移动端的核，所以本次仅作简单介绍，后续会出详细的微架构评述。如果本文对你有所帮助，欢迎三连，如果有微架构相关的问题，欢迎通过公众号菜单“`联系我`”加我微信讨论。