---
title: "NVIDIA的DSMEM对GEMM计算高效实现会有优势吗？"
date: "2024-08-03 00:00:00"
updated: "2024-08-03 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/NVIDIA的DSMEM对GEMM计算高效实现会有优势吗/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/663241322/answer/3582954045"
---


闭门造车
​​
以有涯求无涯

​ 关注

11 人赞同了该回答

gemm问题里用multicast就够了，已经可以消除cluster里不同block tile产生的重复访存。显式使用dsmem反而没有直接使用tma方便

发布于 2024-08-03 21:59・北京

​赞同 11​​5 条评论​4 ​1 ​分享

​