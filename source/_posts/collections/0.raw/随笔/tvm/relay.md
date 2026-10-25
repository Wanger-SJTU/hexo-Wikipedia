---
title: "relay"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/随笔/tvm/relay/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "tvm"
---

## Let Binding and Scopes
至此，已经介绍了如何用深度学习框架中的旧方法来构建计算图。这一节将讨论一个Relay的一个新的构造-let bindings。

Let binding被每一种高级的编程语言应用。在Relay中，一个拥有三个字段Let(var, value, body)的数据结构。当计算一个Let表达式时，首先计算value部分，然后将其绑定到var，最后在body表达式中返回计算结果。

可以使用一系列的Let绑定，构造一个逻辑上等效于数据流程序的程序，下面的代码示例显示了用法：


嵌套的Let Binding被称作A-normal形式，作为函数式编程语言中的常用IR。通过上面的图可以发现，虽然这两个程序的语义完全等价，文本表示也一样（除了A-norm形式有let的前缀），但AST抽象语法树却不一样。

由于程序的优化，使用了这些AST数据结构，并对其进行了变换，这两种不同的结构，会影响到最终编译器生成的代码。比如，想要检测add(log(x), y)模式。在数据流程序中，可以首先进入add节点，然后直接检查它的第一个参数是不是log。而在A-form的程序中，不能直接检查任何东西，因为add节点的输入是%v1-需要维护一个映射表，将变量和绑定的值进行映射，然后查表才知道%v1代表的是log。
