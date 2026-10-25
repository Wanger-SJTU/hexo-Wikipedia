---
title: Chrome扩展开发01--最简单实例
date: "2017-07-25 00:00:00"
updated: "2017-07-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/Chrome扩展开发01-最简单实例/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/27863494
---


**专栏好久没有更新了，最近事情比较多，公司的事情、自己的私事等等。由于各种各样的原因，导致我要去学习一种新的开发技术：Chrome扩展开发。在这方面，我完全是一个小白，所以打算一边看书，一边做笔记（写专栏）。我看的书为《Chrome扩展及应用开发》，有兴趣的小伙伴可以自己上网搜索PDF版本或直接购买正版书籍。在我的笔记中，有什么不对的地方，也希望各位大神及时指出，谢谢。在编写第一个Chrome扩展之前，需要大家了解2个知识点：Json和DOM。

（1）Json数据格式。这个大家应该不会陌生，在Python中经常会用到这种数据格式，也有相应的模块用来处理Json数据。Json有两种数据结构，一种是key:value键值对，另外一种是value的有序集合。例如：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_1817cd4fe2b7.png)

（2）DOM，即文档对象模型。我们主要了解HTML文档中的DOM：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_043a0e288f10.png)

在JavaScript中，有相应的函数用于获取或者设置DOM相关信息。

获取DOM元素的方法有getElementById、getElementsByName、getElementsByTagName、getElementsByClassName等，注意只有第一个Element为单数，剩余三个为复数，主要是因为DOM节点的ID必须是唯一的，而名字、标签名、类名等都不唯一。

我们使用ele.getAttribute()获取元素节点的属性，或直接使用.操作。我们使用setAttribute设置或者更改元素节点的属性，使用removeAttribute删除元素节点的属性。

CSS的选择器基本分为三种：tagName，.className和#id。

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_c1e68969d7c1.png)

下边我们开始一步步编写自己的Chrome扩展程序：一个显示时钟的小扩展。

第一步：编写manifest.json文件**

manifest.json文件可以理解为一个配置文件，Chrome浏览器在加载扩展时，需要读取该文件中的内容，从而找到图标地址、HTML文件、Js文件、权限信息等等一些设置。这里我们直接使用书籍作者给出的文件示例：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_8104a64c1db5.png)

（1）manifest_version必须填写2

（2）browser_action为设置扩展在浏览器右上角的一些动作，比如鼠标悬停展示的标题default_title、鼠标点击展示的页面default_popup等。

（3）文件中出现了两个icons的key，第一个为在浏览器扩展页面上展示的图标，第二个default_icons为在浏览器右上角展示的图标。

（4）我们需要新建一个images文件夹，并放入一些图标文件。

**第二步：编写popup.html文件**

该文件为我们点击浏览器右上角扩展图标时弹出的页面内容，即显示时间的页面。如下：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_1f85f35fb04c.png)

很简单，就是声明一个div，用来展示时间。同时指定js文件地址。

**第三步：编写Js文件**

Js文件的作用是获取时间，并展示在DOM节点上。内容如下：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_5e831942a000.png)

**第四步：加载扩展程序**

经过上述3步之后，我们应该能得到一个文件夹：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_fca982e51e23.png)

打开Chrome浏览器，打开“扩展程序”：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_1ff073bcf054.png)

选中页面最上方“开发者模式”：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_4a5644f2b97e.png)

然后将文件夹拖到Chrome浏览器--扩展程序页面，即可加载我们自己编写的程序。此时在浏览器右上角会出现一个小图标，点击图标，即可出现我们想要的结果：

![](/images/collections/0.raw/zhihu/%25E7%25BC%2596%25E7%25A8%258B%25E5%2590%2591/asset/img_5ed597e146e7.png)

是不是特别简单！如果你本身具有HTML、CSS、JavaScript的经验，那就更简单了。

本文中我们使用了书籍作者的程序，这里给出GitHub地址：

[Sneezry/chrome_extensions_and_apps_programming](https://link.zhihu.com/?target=https%3A//github.com/Sneezry/chrome_extensions_and_apps_programming/tree/master/my_clock) 

=============================================================

作者主页：笑虎（Python爱好者，关注爬虫、数据分析、数据挖掘、数据可视化等）

作者专栏主页：[撸代码，学知识 - 知乎专栏](https://zhuanlan.zhihu.com/pythoner)

作者GitHub主页：[撸代码，学知识 - GitHub](https://link.zhihu.com/?target=https%3A//github.com/xianhu)

欢迎大家拍砖、提意见。相互交流，共同进步！

==============================================================
