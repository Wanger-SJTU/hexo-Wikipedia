---
title: "以下C++代码怎么理解，这模板怎么推导的？"
date: 2021-06-11
tags: [知乎]
source: https://www.zhihu.com/question/463875728/answer/1934003540

---

请仔细观察如下两个的区别。第一个是参数包展开，第二个折叠表达式。

template<typename ...Ts>
void f(Ts&&... args) {
    auto v  = {g(args) ...}; // 参数包展开
    auto v_ = (g(args),...); // 折叠表达式
}

关键在于**逗号**的区别，多了一个逗号(op)变成了**折叠表达式**：最终结果为**一个值**。而没有逗号则是**参数包展开**，结果是**多个值**。

你那个例子中的`disjunction_v`使用参数包展开形式。

 具体展开形式可以参考：[C++ Insights](https://link.zhihu.com/?target=https%3A//cppinsights.io/s/06956254)

![](https://picx.zhimg.com/v2-7acde9b38f1df7dae6421e8d6f834320_r.jpg?source=2c26e567)