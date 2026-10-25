---
title: "NPU部署缺乏InstanceNorm的解决方案"
date: "2023-12-15 00:00:00"
updated: "2023-12-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/dl论文/NPU部署缺乏InstanceNorm的解决方案/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/672424212"
---


InstanceNorm其实是一种使用很广泛的norm方法了，非常适用于小batch场景。而且stylegan中的adaIn更是用于风格归一化。但其中需要计算每个特征通道的均值方差，然后用来归一化的过程会涉及到除法，不少端侧npu都缺乏这个除法以及开方操作。

    我这里初步实验了一下一种方案，感觉效果还行，有需要的同学可以按我的方法实验一下。首先训一个含有IN操作的网络。然后自己计算E(x),E(x^2)，在自己的网络里内嵌一个channelwise的小型1x1卷积网络来当做rsqrt操作，当然如果能共享参数最好了。先是只微调这个rsqrt网络，然后再全部微调一下整个网络(最后一步我不确定是不是必须的，大家自己试哈)。
