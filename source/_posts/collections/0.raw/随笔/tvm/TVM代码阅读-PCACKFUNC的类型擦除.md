---
title: TVM代码阅读-PCACKFUNC的类型擦除
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/随笔/tvm/TVM代码阅读-PCACKFUNC的类型擦除/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

#TODO 

之前的文章中<span class="wikilink wikilink--missing" title="未导入的页面">归档/TVM/【tvm解析】PACKFUNC机制</span> 中介绍了tvm的packfunc机制。借助于packfunc这个机制，可以很方便的实现跨语言，跨不同抽象层次的函数调用。PACKFUNC 中的对输入输出参数的类型做了统一处理，下面介绍一下用法。

