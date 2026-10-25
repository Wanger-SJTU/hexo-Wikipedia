---
title: "在编译器指令重排做得比较好的情况下, CPU乱序执行的意义有多大?"
date: 2019-08-07
tags: [知乎]
source: https://www.zhihu.com/question/339022053/answer/778405223

---

一般寄存器依赖编译器可以很好的分析，但是由于一般指令集中的寄存器数量有限，所以会有WAW这样的依赖，乱序执行cpu通过重命名可以解决。

另外一个问题是访存，编译器的静态分析并不能够完全确定load是否和前面的store是同一地址的，这时编译器不能随意进行重排。cpu在运行时可以根据实际地址来决定是否乱序，这个是编译器没法做到的。

关于乱序执行为何可以提升性能，可以参考asplos的一篇论文：

Discerning the Dominant Out-of-Order Performance Advantage: is it Dynamism or Speculation?