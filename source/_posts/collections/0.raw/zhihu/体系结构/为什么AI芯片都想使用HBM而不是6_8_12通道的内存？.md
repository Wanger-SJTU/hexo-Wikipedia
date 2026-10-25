---
title: "为什么AI芯片都想使用HBM而不是6/8/12通道的内存？"
date: 2025-03-20
tags: [知乎]
source: https://www.zhihu.com/question/1885434213853012121/answer/1886004845925877347

---

因为需要高带宽，尤其是对transformer架构。

12c需要的ddrc和phy的面积就很大，phy还位置有要求，边缘摆一圈，整个die的面积就撑很大了，成本，yield都是问题。而且12c能提供多大的BW呢？LPDDR5x，ppt里最高是10600MT，理论上限才是254GBps，实际n7下做到192GBps都难，HBM3起步都TBps了，LPDDR5x还不如GDDR6，要不是拿不到HBM的资源，谁愿意用LPDDR。

想用LPDDR堆BW，也可以走3DDRAM的路线，但这玩意需要3D键合，封装工艺有要求，而且目前普遍容量不够用，良品率也有问题。另外一个路线是走io die，需要额外的互联接口把LPDDR拉到外面io die上连接，io die和soc通过serdes连接，但serdes的问题是目前的协议都需要做data packet，会增加很大的latency，latency也是影响有效BW的重要因素。

直接chiplet做d2d，对ai core 架构设计挑战很大，还有coherence的问题。

总之，能做大芯片走直连，肯定比绕路好啊。绕路都是原来路被堵了不得已而为之。

以上只对infra的ai芯片有用，edge和client的芯片需要的场景，顶到16c的LPDDR也够了。