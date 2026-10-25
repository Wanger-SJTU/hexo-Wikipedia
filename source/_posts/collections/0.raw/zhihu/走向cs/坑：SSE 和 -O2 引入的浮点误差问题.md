---
title: 坑：SSE 和 -O2 引入的浮点误差问题
date: "2020-08-19 00:00:00"
updated: "2020-08-19 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/坑-SSE-和-O2-引入的浮点误差问题/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/188912696
---


有人给 [RenderHelp](https://zhuanlan.zhihu.com/p/182872172) 报了个 BUG，两个三角形接缝处有漏点：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_87d972203b49.jpg)

我自己试了一下，两个三角形挨近镜头的时候确实容易出现裂缝，检查了一遍计算公式，没什么问题，继续跟踪调试，发现漏点处坐标：(400, 300) 对于第一个三角形：

`p0={200,500}
p1={600,100}
p2={200,100}`

该点 px = (400, 300) 刚好落在三角形第一条边 E01 上面，带入 Edge Equation:

`E01 = (px.x - p0.x) * (p1.y - p0.y) - (px.y - p0.y) * (p1.x - p0.x)
    = (400 - 200)*(100-500) - (300 - 500) * (600 - 200) 
    = -80000 + 80000 = 0`

但是程序那里：

`float E01 = (px.x - p0.x) * (p1.y - p0.y) - (px.y - p0.y) * (p1.x - p0.x);
`

计算出来的 E01 的值却是：<strong>-0.00268555</strong>

再看右边那个三角形：

`p0={600,100}
p1={200,500}
p2={600,500}`

带入计算 px 结果：

`E01 = (px.x - p0.x) * (p1.y - p0.y) - (px.y - p0.y) * (p1.x - p0.x)
    = (400 - 600) * (500 - 100) - (300 - 100) * (200 - 600)
    = -80000 + 80000 = 0`

结果也应该等于 0 才对，但是程序打印出来，E01 的值却是：<strong>-0.00439453</strong>

<strong>这个误差导致对于同一条边，左边的三角形认为 px 在外面，右边的三角形也认为 px 在外面。</strong>关掉 -O2 、-O3 以后，计算回归正常，应该是 SSE 和编译优化导致的浮点计算误差。

网上搜索了一下，gcc 的优化等级和 sse 优化确实会改变浮点数精度并带来误差，让不同优化等级的程序产生不同精度的计算结果。

先前实现 Edge Walking 版本软渲染时，边缘计算用的是整数坐标，对于 RenderHelp：

`float E01 = (px.x - p0.x) * (p1.y - p0.y) - (px.y - p0.y) * (p1.x - p0.x);
`

只有乘法和加减，如果输入是整数的话，并不会产生小数结果，完全可以用整数计算代替：

`int E01 = (cx - p0.x) * (p1.y - p0.y) - (cy - p0.y) * (p1.x - p0.x);`

最终结果：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_c1bacffa0151.jpg)

裂缝解决。
