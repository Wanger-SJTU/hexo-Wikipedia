---
title: "Fine Grained Activation Offloading"
date: 2025-12-11
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1982516191567311623
---

Fine Grained Activation Offloading

朱然

拉航母的小朱

收录于 · 小红书大模型

18 人赞同了该文章

转载自我们的公众号 大模型训练的高效内存解决方案：流水线感知的细粒度激活卸载，实现显存开销与吞吐性能的联合最优
欢迎加入 小红书大模型AI Infra团队介绍 招聘信息虽迟但到，CPU offloading不算是什么创新的技术，想法源于1年前再次启动做MoE准备训练dots1 llm的时候，显存成为了制约训练系统效率的最大因素，那时候我们还没有DeepEp、AlltoAll hiding这些技术手段，expert  parallel的分布式扩展性并不好，为了能在更小model parallel下跑起来，我们不得不选择了full recompute。full recompute 叠加无法被overlap的forward dispatch/combine 通信，就更加拉垮了。

如何能节省activation显存从而不那么依赖recompute呢，自然想到了“以存换算”，把前向计算的activation offload到CPU memory上，反向计算需要时再load回显存。

仅仅synchronous  offload/load 会有比较大的PCIe传输开销，由于activation 都是按照layer去计算和使用的，所以我们可以利用相邻layer的计算，来跟activation的load/offload做重叠。

所有activation 都做offload/load，叠加上述overlap的效果可能依然是不够理想的，因为PCIe的带宽有限，如果load/offload的整体开销大于计算开销，依然会出现GPU bubble。因此我们可以进一步结合不同算子的 计算/activation显存比，来混合使用offloading和recompute来达到最优。

理论是比较简单的，之前行业里也有不同的tech report中声称在预训练中使用了相关技术，但是我们实际实现的过程中还是遇到了不少细节问题，要达到“完美overlap”并不容易。最大的挑战是 implicit synchronization 。在训练代码的某些操作会引发device level的sync，从而破坏load/compute/offload的流水，导致性能收益消失，需要精细排查和review每个无法被overlap的H2D/D2H 拷贝，才能拿到最优的效果。

发布于 2025-12-11 19:21・北京
​赞同 18​​4 条评论​34 ​1 ​分享

​申请转载​​

未登录用户

4 条评论

默认
最新

你好呀

我们在在rl场景也尝试过offloading，一些case下还是有效果的，后来没有跟进
03-10 · 湖南

​回复​喜欢

谢顶的亚里士多德

快手在atc24的offload不行吗，我感觉用起来还是基本不影响计算的
2025-12-12 · 北京

​回复​喜欢

谢顶的亚里士多德

朱然

是已经合到megatron的新分支里了吗，学习一下。

2025-12-12 · 北京

​回复​喜欢

朱然

作者

原理都一样的，可以理解为工程实现上的加强，我们这个可以细粒度控制到算子/module级别；还能更好跟recompute兼容并用。 实际业务支持的时候，不够灵活不够配置化，基本就很难推广使用

2025-12-12 · 北京

​回复​喜欢

关于作者

朱然
拉航母的小朱

回答
0
文章
10
关注者
1,148

​关注他​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

动态内存管理：Linux下的高效内存回收方法
玩转Lin...发表于内存管理专...

Go 内存管理之二
polar...发表于GCTT ...

GO内存管理(上)
xjx

内存管理：程序是如何被优雅的装载到内存中
内存作为计算机中一项比较重要的资源，它的主要作用就是解决CPU和磁盘之间速度的鸿沟，但是由于内存条是需要插入到主板上的，因此对于一台计算机来说，由于物理限制，它的内存不可能无限大…

CPP加油站