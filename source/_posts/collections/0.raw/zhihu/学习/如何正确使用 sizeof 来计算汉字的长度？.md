---
title: 如何正确使用 sizeof 来计算汉字的长度？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/学习/如何正确使用-sizeof-来计算汉字的长度/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/25375744/answer/30584976
---


'是'是int类型，不是字符型（c中'c'也是int型，但c++不是）

------ 上面是手机输入的，所以没法多说，下面开始补充 ------

1. 对于'a'，在C中属于int类型，在C++中属于char类型

2. 对于'ab'，在C中属于int类型，在C++中也属于int类型

3. 对于'ab'，其值是『实现定义』的

4. ‘是’就是属于(3)所示的情况

关于『多重字符常量』，C99标准文档如是说：

The value of an integer character constant containing more than one character (e.g.,'ab'), or containing a character or escape sequence that does not map to a single-byte execution character, is implementation-defined. 

[编辑于 2014-09-16 10:37](//www.zhihu.com/question/25375744/answer/30584976)

​添加评论​2 ​喜欢​分享

​​
