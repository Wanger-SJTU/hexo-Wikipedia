---
title: "C++ 有哪些缺点？"
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/编程向/C-有哪些缺点/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/20200615/answer/30633353"
---


C++ 的函数重载决议规则是所有语言中最复杂的，因为他允许用户以两种方式自定义隐式类型转换。

比如有下面两个函数：

Employee* findEmployee(const std::string& surname, const std::string& givenName, bool retired = false);
Employee* findEmployee(const std::string& fullName, bool retired = false);

那么

```text
Employee* e = findEmployee("Chen", "Shuo");
```


对应哪个？

如果原来代码里只有第一个函数，现在有人新增了第二个重载，会造成什么后果？

[编辑于 2014-09-17 09:30](//www.zhihu.com/question/20200615/answer/30633353)

​​270 ​56 ​分享

​​
