---
title: IDE中，选中一个变量，文档中其它地方的该变量也会高亮，这种功能叫什么？如何实现的？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/IDE中,选中一个变量,文档中其它地方的该变量也会高亮,这种功能叫什么-如何实现的/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/39441111/answer/81626593
---


这种功能可以有很多不同的叫法，但其本质都是搜索一个语法元素（例如一个变量名）所代表的实体（例如一个变量）的所有被引用的地方（occurrences / references）。

这种功能的实现要点有这么几个：parser、AST、符号表。

- IDE要有一个语法分析器（parser），能够把输入的源码分析（parse）为一棵抽象语法树（AST），并将AST里出现的符号及其所引用的实体之间的对应关系记录在一种叫做符号表（symbol table）的数据结构里。这个动作既可以事先批量进行，也可以在用户编辑的同时增量式进行——有没有觉得有时候IDE里各种提示过了一小会儿才出现？这背后就很可能是增量式分析在进行中。Eclipse的增量式语法分析在这个文档里有提到：FAQ How do I use a model reconciler?
- 用户在编辑器中选中一段文本时，IDE要可以找出这段文本对应的AST节点，并且通过符号表找到它所对应的实体。例如从一个简单标识符找到它对应的局部变量声明。
- 接下来，在给定的AST范围内（例如说一个方法内），找出所有其它引用同一实体的AST节点。
- 最后在编辑器里对找到的这些节点进行高亮。
Visual Studio代码不开源所以不方便用来讨论实现。

在IntelliJ里，这个功能叫做“Highlight Usages”：

IntelliJ IDEA 15.0
                            Help ::
                            Highlighting Usages拿开源的Eclipse的Java Development Tools（JDT）为例。这个功能在Eclipse JDT里叫做“mark occurrences”：

Mark occurrences - Tips and Tricks (JDT)

这个功能的实现可以从下面的链接开始跟踪：

[windowActivated() - eclipse.jdt.ui/JavaEditor.java at master · eclipse/eclipse.jdt.ui · GitHub](https://link.zhihu.com/?target=https%3A//github.com/eclipse/eclipse.jdt.ui/blob/master/org.eclipse.jdt.ui/ui/org/eclipse/jdt/internal/ui/javaeditor/JavaEditor.java%23L1207)[updateOccurrenceAnnotations() - eclipse.jdt.ui/JavaEditor.java at master · eclipse/eclipse.jdt.ui · GitHub](https://link.zhihu.com/?target=https%3A//github.com/eclipse/eclipse.jdt.ui/blob/master/org.eclipse.jdt.ui/ui/org/eclipse/jdt/internal/ui/javaeditor/JavaEditor.java%23L3260)
为举例方便，来详细看看其中在

[第3320行](https://link.zhihu.com/?target=https%3A//github.com/eclipse/eclipse.jdt.ui/blob/master/org.eclipse.jdt.ui/ui/org/eclipse/jdt/internal/ui/javaeditor/JavaEditor.java%23L3320)的一段：

```text
		if (locations == null && selectedNode instanceof Name) {
			IBinding binding= ((Name)selectedNode).resolveBinding();
			if (binding != null && markOccurrencesOfType(binding)) {
				OccurrencesFinder finder= new OccurrencesFinder();
				if (finder.initialize(astRoot, selectedNode) == null) {
					locations= finder.getOccurrences();
				}
			}
		}
```


可以看到，假如在编译器中被选定的AST节点是一个“名字”（例如说标识符），那么接下来要做的事情就是：

- 通过符号表找出这个标识符所引用的实体是什么，这段代码里就是resolveBinding()（追踪实现可以到[DefaultBindingResolver.resolveName()](https://link.zhihu.com/?target=https%3A//github.com/eclipse/eclipse.jdt.core/blob/master/org.eclipse.jdt.core/dom/org/eclipse/jdt/core/dom/DefaultBindingResolver.java%23L1264)），得到一个IBinding。
- 在给定的AST范围内，找出这个实体被引用的所有位置（occurrences）。
- 在编辑器里把找出来的位置设上高亮。
渔就给这么多，接下来题主可以自己探索下去啦～

=============================================

题主说了“例如VS”，所以这里的回答假定题主想知道的是高质量的“找出引用”功能。

如果不要求质量很高，也有更简单的做法。补充个例子说明啥叫质量高。

假如有这样的Java代码：

```cpp
class Foo {
  int bar() {             // method name "bar"
    int bar = 1;          // local variable "bar" 1
    {
      int bar = 2;        // local variable "bar" 2
      int baz = bar + 1;  // local variable "bar" 2
    }
    return bar;           // local variable "bar" 1
  }
}
```


这段代码里一共出现了5次“bar”标识符，但其实背后是3个不同的符号：

- 方法"bar"

- 局部变量"bar" 1
- 局部变量"bar" 2

按照前面说的方法做分析的话，这里会得到如下的抽象语法树：（仅为讲解而写的简单例子）

ClassDeclaration "Foo"
- MemberList
  - MethodDeclaration "bar"

```text
    - signature "()I"
    - methodBody
      - StatementOrDeclarationList
        - VariableDeclaration "bar" // 1
          - initializer
            - ConstantExpression 1
        - BlockStatement
          - VariableDeclaration "bar" // 2
            - initializer
              - ConstantExpression 2
          - VariableDeclaration "baz"
            - initializer
              - BinaryExpression
                - op +
                - left
                  - VariableReference "bar" // 2
                - right
                  - ConstantExpression 1
          - ReturnStatement
            - value
              - VariableReference "bar" // 1
```


可以看到，通过语法分析，构造出来的AST足以区分5次"bar"出现的地方各自代表的意义。所以，例如选定baz的初始化表达式中的bar时，就只有局部变量"bar" 2会被高亮，而另外两个"bar"实体都不会被高亮。

而比较简单但低质量的做法就是从头到尾都只做词法分析——只将输入的源码切分为一个个单词。

这样做就会把本例子的5个"bar"都识别为同一个实体，标识的精度就变差了。

换个更简单的例子再体会一下：

```cpp
  public void setFoo(int foo) { // parameter "foo"
    this.foo = foo;             // field "foo" / paramater "foo"
  }
```


同样，做足语法分析就能区分this.foo与foo，而只做词法分析就会只能把它们看为同一实体。

[编辑于 2016-01-22 17:55](//www.zhihu.com/question/39441111/answer/81626593)

​​295 ​100 ​分享

​​

收起​
