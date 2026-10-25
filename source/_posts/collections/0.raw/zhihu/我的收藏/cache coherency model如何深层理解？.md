---
title: "cache coherency model如何深层理解？"
date: 2023-03-19
tags: [知乎]
source: https://www.zhihu.com/question/590540790/answer/2943285963

---

![](https://pic1.zhimg.com/v2-ba044fa359c84872bf78fb9f23a89751_r.jpg?source=2c26e567)想成为Java架构师，突破职业发展瓶颈，欢迎来咕泡教育[见字如面](https://www.zhihu.com/search?q=%E8%A7%81%E5%AD%97%E5%A6%82%E9%9D%A2&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2942468271%7D)，我是[咕泡科技](https://www.zhihu.com/search?q=%E5%92%95%E6%B3%A1%E7%A7%91%E6%8A%80&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2938881576%7D)[创始人](https://www.zhihu.com/search?q=%E5%88%9B%E5%A7%8B%E4%BA%BA&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2942468271%7D)[Mic](https://link.zhihu.com/?target=https%3A//ke.gupaoedu.cn/course/java)（[谭锋](https://www.zhihu.com/search?q=%E8%B0%AD%E9%94%8B&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2936255309%7D)）

缓存一致性（cache coherency）是计算机系统中处理器缓存之间保持数据一致性的机制，其目的是确保多个处理器或核心之间对共享数据的读写操作都能够正确同步。

以下是一些模拟器和代码库，可以用来模拟实验缓存一致性协议：

- CacheSim：是一个用于模拟多处理器缓存一致性协议的模拟器，可以通过修改配置文件来模拟不同的协议和处理器拓扑结构。可以用于研究MESI、MOESI等常见的缓存一致性协议。
- COAST：是一个用于模拟多处理器系统的高性能缓存一致性模拟器，支持多种常见的缓存一致性协议，包括MESI、MOESI、MESIF等。可以通过修改配置文件来模拟不同的协议和处理器拓扑结构。
- Herd：是一个用于模拟多处理器系统的缓存一致性验证工具，可以通过编写简单的C语言程序来验证不同的缓存一致性协议。通过编写C语言程序来验证协议的方式非常适合学习和理解缓存一致性协议的工作原理。
- CacheLab：是一个用于模拟多处理器系统的缓存一致性实验室，包括多个实验，旨在帮助学生深入理解缓存一致性协议。可以用于学习和理解MESI、MOESI等常见的缓存一致性协议。
![](https://picx.zhimg.com/v2-e8da9a1e25cecf54c342ccdb502b7ce6_r.jpg?source=2c26e567)https://ke.gupaoedu.cn/course/java