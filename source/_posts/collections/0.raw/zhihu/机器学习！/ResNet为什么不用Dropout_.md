---
title: "ResNet为什么不用Dropout?"
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/机器学习/ResNet为什么不用Dropout_/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/325139089/answer/688743474"
---


ResNet的第二篇Identity Mapping in Deep Residual Networks有部分加dropout无效的实验；另外可以查看Dropout与BN不兼容的相关论文及说明；同时，BN在训练过程对每个单个样本的forward均引入多个样本（Batch个）的统计信息，相当于自带一定噪音，起到正则效果，所以也就基本消除了Dropout的必要。

[发布于 2019-05-20 00:36](//www.zhihu.com/question/325139089/answer/688743474)

​​72 ​8 ​分享

​​
