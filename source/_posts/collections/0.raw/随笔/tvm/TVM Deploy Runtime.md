---
title: "TVM Deploy Runtime"
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: "post"
permalink: "/collections/0.raw/随笔/tvm/TVM-Deploy-Runtime/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

#TVM 

!<span class="wikilink wikilink--missing" title="未导入的页面">随笔/tvm deploy.map</span>
tvm 中在部署时有多个选择，最开始的`graph exectuor runtime` 、后来降低overhead 引入的`AOT runtime`, 以及后来`Nimble` 中动态shape引入的`VM Runtime`, 前者存在C++ 以及CRT两套接口。


- <strong>Graph Runtime</strong>
Graph Runtime 是TVM默认使用的，运行过程中使用json文件记录了计算图里面各个函数的信息（包括函数输入输出、运行顺序、数据类型，input shape， device等）。

JSON的方式带来了很大的灵活性，但是overhead 很大，因为运行时的函数都是依据JSON文件的内容动态加载的，笔者这边遇到的情况，除却运行时featuremap与constant的开销就有1-2MB多，而且函数越多overhead越大。
还有一点，有些debug的功能其实没有做裁剪。

- <strong>AOT Runtime</strong>
AOT Runtime 相对于Graph来说，降低了不必要的内存开销，在codegen的过程中，相对于Graph Runtime 额外生成了一个`main` 函数，在这个函数里面确定了各个函数的调用流程。
不同与Graph Runtime中需要Json文件记录这么多信息，使用AOT的通路时，仅需要记录
输入输出信息、workspace pool（featuremap）、constant pools（weight）的信息。这部分序列化保存在二进制文件里面，运行时解析。

- <strong>About CRT</strong>
上面介绍的两个在部署时，还考虑了是使用C语言还是C++来集成，并未这两种提供了不同集成通路。

- <strong>About Systemlib</strong>
通常来说，搜索优化完的算子实现是与Runtime分离的，这就需要动态加载这个搜索的结果，但是很多场景这样其实不划算，需要Runtime与搜索优化的结果打包在一起，这就 需要SystemLib的选项，这里可以将编译的结果，与Runtime一起打包。




- <strong>VM  Runtime</strong>

#TODO




code: 
#TODO 