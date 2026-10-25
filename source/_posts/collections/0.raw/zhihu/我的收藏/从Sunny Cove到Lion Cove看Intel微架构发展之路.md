---
title: "(2 条消息) 从Sunny Cove到Lion Cove看Intel微架构发展之路"
date: "2024-11-27 00:00:00"
updated: "2024-11-27 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/从Sunny-Cove到Lion-Cove看Intel微架构发展之路/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/9153350232"
---


<strong>导言</strong>

Intel`一直被冠以“牙膏厂”的称号，和`AMD`相比`Intel`基本是每年推出一款微架构设计，平均2年左右会有一次相对大的改进，进步节奏差不多，考虑到`Intel`对自己微架构细节讳莫如深，外界仅从软件测试去了解它设计的改进，尽管我觉得公布一些设计的细节有利于市场的正反馈，像`ARM/AMD`都是如此，但`Intel`的具备自己的营销策略。有一种说法，`Intel`快要完蛋，核的设计能力掉出一线，我觉得这种说法过于夸张，也并不觉得`Intel`现在的艰难是核设计落后导致的。虽然自从苹果放弃`Intel`后，牙膏厂过的就不那么顺利，但其核的设计能力依然处在一线水平。本文汇总`2019-2024`年`Intel`的微架构，宏观探讨其发展。（图片来自网络）

### 横向对比

我们横向比较`Intel` 2024年的旗舰核于其它主流厂商的一些参数，今年`ARM/Apple/高通/AMD`发布的旗舰核取指带宽都是`64Byte`，而`Intel`则是`128Byte`。`Decode`宽度基本都在`8-10`，`ARM`和`Apple`参数好点，`Intel`和`AMD` `Decode`宽度一致是`8`，`Issue`宽度，`Intel`是`18`，`AMD`是`16`，`Retire`宽度`Intel`是`12`，`AMD`是`8`。今年的核`Intel`放弃了以前相对保守的策略，这一代的微架构改变是比较大的，尽管不清楚一些细节，但设计水准依然处在一线。

### 纵向对比

Intel`虽然是每年都推出新的微架构设计，但平均两年多时间核才会有一次相对大的改进，和其它厂商的更新节奏差不多，但稍慢。

线程：从2019年的`Sunny Cove`一直到2023年的`Redwood Cove`微架构都是采用超线程，而在2024年`intel`做了一个违背祖宗的决定，取消了超线程的设计。

缓存：`ICache`，从2019-2022这几代产品均是`32KB/8路`的设计，而23年和24年的核均是`64KB/16路`，和其它一些厂商相比，`Intel`的路数很高，这两年甚至到达`16路`的水平。`Dcache`从2019-2022都是`48KB/12路`。这些路数的设计在特别关注功耗的`ARM`架构下几乎不敢想。`L2 Cache`的设计，`Intel`相对比较大，2019年是`512KB`，2020年就`1.25MB`了，2022年是`2MB`，2024年`2.5MB`最高`3MB`。

预测器方面，每年都会提升，但查找了软件优化手册，仅有短短的一句“升级了预测器”，没有更多信息，基本参数都是每年提升。

Decode`：`Decode`宽度从2019年的`4`到2024年升级到`8`（注：`Intel`2006年`Decode`宽度就是`4`，不过各家都差不都，近几年发展的才快），2019-2020，`Decode`宽度是`4`，2021-2023年`Decode`宽度是`6`，2024年`Decode`宽度是8。`Dispatch`参数和`Decode`数据类似。

Issue`：2019-2020是`10`，2021-2023是`12`，2024迎来巨大提升为`18`。

Retire`：2019-2020是`5`，2021-2023是`8`，2024是`12`。

执行端口`：2019-2020是`10`，2021-2023是`12`，2024是`18`。

下图是`Intel`性能核的一些重要参数供大家参考，从各项数据来看，2024年的`Intel`的核没有挤牙膏，但实际市场反馈不完全是由核决定的。 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4b34118cb147.jpg)


### Sunny Cove

2019年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5fa3a6e9268c.jpg)


### Willow Cove

2020年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bc820eb2ba1e.jpg)


### Golden Cove

2021年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7689f202514b.jpg)


### Paptor Cove

2022年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9c252085e2df.jpg)


### Redwood Cove

2023年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_542419368069.jpg)


### Lion Cove

2024年 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e14a490ce8d4.jpg)


### 总结

Intel`尽管前几年更新比较慢，但这2年出于其它厂商的压力，明显加快了设计的更新。但毕竟核的设计不等于整个芯片的性能，所以即使快速更新核的设计，也未必就会获得良好的市场反馈，现在`SoC`层次的设计`Intel`似乎比较挣扎，尽管有消息透露会在这两年引入`3D-Cache`的技术，但不清楚是否能和`AMD`的成熟技术相比。如果有CPU微架构细节的问题欢迎通过微信公众号“`联系我`”加我微信讨论。