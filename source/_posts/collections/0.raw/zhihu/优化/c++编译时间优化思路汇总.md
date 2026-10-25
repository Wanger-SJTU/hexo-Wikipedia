---
title: c++编译时间优化思路汇总
date: "2022-03-13 00:00:00"
updated: "2022-03-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/c-编译时间优化思路汇总/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/480293039
---


![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_7b5d127eb3f7.jpg)

作为c++程序员，瘫坐在椅子上等着clang给自己发工资（雾）是一种常态了。糟糕的代码结构和不合理的构建设计往往导致编译时间变的很长。所以，分析和优化c++代码的编译速度我认为是对程序员非常重要的。减少在电脑前坐牢的时间，避免加班。

### 从编译工具的角度优化编译时间

#### ccache/sccache

ccache应该是最常见的优化方式，使用也非常简单，在编译指令前加上ccache即可。

`ccache clang++ main.cpp`

如果是使用类似cmake的构建工具我们可以通过以下方式启用ccache

`cmake -DCMAKE_CXX_COMPILER_LAUNCHER:STRING=ccache -DCMAKE_C_COMPILER_LAUNCHER:STRING=ccache ${其他参数}`

不过xcode似乎并不吃这一套，如果需要更加跨平台的思路，也许可以参考这段代码。

[](https://link.zhihu.com/?target=https%3A//github.com/TheLartians/Ccache.cmake)

平时可以通过`ccache -s`来检查自己日常ccache的使用效率和空间状态

 从下图可以看出目前我的ccache提升效果还是可以的，命中率高达63%

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_0e34ad8a70d0.jpg)

实际在使用之后也能明显感受到从第二次开始的重新编译，走文件的速度有显著的改善

ccache在4.4版本之后支持通过各种其他工具存储来提高效率，支持直接对接另一个ccache、radis、NGINX等方式，具体可以参考官方文档

[](https://link.zhihu.com/?target=https%3A//github.com/ccache/ccache/wiki)

### 从编译的层面考虑

#### 编译耗时分析

单纯判断编译的耗时最简单可以想到的方法是对每一次clang的指令调用加一个time 来记录，但是这显然不符合我们的需要的。这样无法真实反应实际的编程瓶颈，我们需要更好的工具。

clang-9中增加了一个选项可以产生编译耗时的具体详情，通过在编译的时候增加这个选项，我们可以找到程序真实瓶颈。

通过命令`clang++ -ftime-trace -c ./main.cpp -o test` 可以在编译的过程中多得到一个.json文件，简单的处理方法是直接拽到`chrome://tracing`里分析 一个简单的使用cout的hello world的编译耗时如下图所示

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_474b9f1cc0c8.jpg)

可以看到，主要的核心耗时是解析`iostream`这个头文件上，不知道这是否和你的预期相符呢

 对于较大的项目，需要统一分析和处理，好在已经有成熟的工具了，通过Clang Build Analyzer可以产生编译瓶颈的报告，一般而言最终的结果都是log或者一些通用宏文件最为耗时，如果不是这样的话可能需要考虑调整头文件，多用声明来减少编译时间

[](https://link.zhihu.com/?target=https%3A//github.com/aras-p/ClangBuildAnalyzer)

#### cmake unity build

另外一种思路就是使用unity build

unity build就非常暴力了，将多个文件include到一个文件里一起编译，由于include到一起之后头文件在多个文件之间也只需要处理一次，可以将编译时间缩短7~9倍。

但是unity build的限制也不小

- 首先由于不同的文件会include 到一起，这会导致原来可以重名的全局变量报编译错误，对代码有要求
- 对objc的文件会和cpp文件混合编译，导致无法正常执行

### 结语

rust编译器的开发组曾坦言，如果编译时间不作为编译器开发的重点指标，编译时间就会在不知不觉中增长。在使用ccls对代码进行分析的时候就会发现使用clang8的分析速度明显快于clang11。对于大型工程而言这也会导致ci、打包、开发效率的显著降低。定期的检查和监控，以及第三方工具的引入对于c++程序员而言是必须掌握的技巧。
