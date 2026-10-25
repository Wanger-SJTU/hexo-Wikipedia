---
title: C++函数调用禁止隐式转换
date: "2024-03-14 00:00:00"
updated: "2024-03-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/C-函数调用禁止隐式转换/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/687000894
---


### 函数调用禁止隐式转换

很多开发者写代码的时候经常会有一个想法，就是我写了一个函数，我希望调用方传递的参数必须完全符合形参类型，而不是隐式转换。但是又觉得禁用所有其它的隐式转换又非常的麻烦懒得弄。**我们提供一个简单的方法**。

`void f(int);
`

如你所见，这是一个函数 `f`，它的形参类型是 `int`，那么我们调用这个函数可以传入几种类型的对象呢？**无数种**。

`void f(int){}

struct X{
    operator int()const { return 0; }
};
struct Y {
    operator double()const { return 0.; }
};

int main(){
    f(1);               // int
    f(1u);              // unsigned int
    f(1l);              // long
    f(1ll);             // long long
    f(1lu);             // unsigned long
    f(1llu);            // unsigned long long
    f(1.);              // double
    f(1.f);             // float
    f('c');             // char
    f(std::uint8_t{});  // unsigned char
    f(std::int8_t{});   // signed char
    f(X{});             // X
    f(Y{});             // Y
}
`

** 一切可以隐式转换到 int 以及转换到可以转换为 int 类型的类型，都能够调用函数 `f`**，所以是无数种。测试。但是我们只想让 **`f(1)` 成立**，这很简单，加一段代码：

`templatetypename T>
void f(T) = delete;
`

原理也很简单，我们定义了一个重载函数模板 `f`，并且把它定义为**弃置**的。如果我们使用 `f(1)`，那么重载决议会选择到我们的非模板的函数 `f`。如果不是 `f(1)`，即不是传入的 int 类型，那么重载决议就会选择到模板函数 `f`。然而**如果弃置函数真的被选择，那会产生一个编译错误**。

如果支持 C++20 我们还可以使用简写函数模板，更加简单：

`void f(auto) = delete;
`
