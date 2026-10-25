---
title: (2 条消息) 有哪些值得学习的国内 c++ 开源项目？
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/有哪些值得学习的国内-c-开源项目/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/332778359/answer/3519201011
---


92 人赞同了该回答

这里推荐几个高质量现代C++风格的开源仓库：

- <strong>fmtlib：[https://github.com/fmtlib/fmt](https://link.zhihu.com/?target=https%3A//github.com/fmtlib/fmt)</strong>

- <strong>现代化、快速的 C++ 格式化库，方便易用的 API且高效，不使用C++20可以使用这个库做format。</strong>

- godot engine: [https://github.com/godotengine/godot](https://link.zhihu.com/?target=https%3A//github.com/godotengine/godot)

- 看到挺多朋友这个仓库代码质量高

- spdlog：[https://github.com/gabime/spdlog](https://link.zhihu.com/?target=https%3A//github.com/gabime/spdlog)

- 现在最热门的C++日志库，支持多种输出格式和级别，有header only和compile source两种模式，源码还简单易学，关注我，后面我出一期spdlog的源码分析文章。

- <strong>abseil：[https://github.com/abseil/abseil-cpp](https://link.zhihu.com/?target=https%3A//github.com/abseil/abseil-cpp)</strong>

- <strong>Google内部的C++轮子库，各种基础能力都包含，值得学习。abseil还有个官方网站：[https://abseil.io/](https://link.zhihu.com/?target=https%3A//abseil.io/)</strong>

- args: [https://github.com/Taywee/args](https://link.zhihu.com/?target=https%3A//github.com/Taywee/args) - 命令行参数解析库，代码行数800左右。
- libzippp: [https://github.com/ctabin/libzippp](https://link.zhihu.com/?target=https%3A//github.com/ctabin/libzippp) - 基于zlib和libzip的跨平台封装，代码行数2000左右。
- cista：[https://github.com/felixguendling/cista](https://link.zhihu.com/?target=https%3A//github.com/felixguendling/cista) - header only的序列化-反射库，代码行数1500左右。
- sqlite_orm: [https://github.com/fnc12/sqlite_orm](https://link.zhihu.com/?target=https%3A//github.com/fnc12/sqlite_orm) - Sqlite的C++ ORM封装，代码行数3000左右。
- chromium：[https://github.com/chromium/chromium](https://link.zhihu.com/?target=https%3A//github.com/chromium/chromium)

- google浏览器源码仓库，包括edge等很多浏览器和应用都会基于chromium二次开发，阅读它的代码后，也改变了我的部分编程习惯。

- <strong>folly：[GitHub - facebook/folly: An open-source C++ library developed and used at Facebook.](https://link.zhihu.com/?target=https%3A//github.com/facebook/folly)</strong>

- Facebook内部的轮子库，线程池、内存池、异步IO、executor等，应有尽有。

- ctpl： [https://github.com/vit-vit/ctpl](https://link.zhihu.com/?target=https%3A//github.com/vit-vit/ctpl) - 简易的C ++线程池，代码行数看了下，约为500左右。
- cereal: [https://github.com/USCiLab/cereal](https://link.zhihu.com/?target=https%3A//github.com/USCiLab/cereal) - 快速、小巧、方便的二进制 JSON 序列化库，代码行数4000左右。
- SQLiteCpp：[https://github.com/SRombauts/SQLiteCpp](https://link.zhihu.com/?target=https%3A//github.com/SRombauts/SQLiteCpp) - 简单易用的Sqlite C ++封装库，我目前项目中就是使用的这个库，很好用，代码行数2,500左右。
- fmt: [https://github.com/fmtlib/fmt](https://link.zhihu.com/?target=https%3A//github.com/fmtlib/fmt) - 现代、安全且快速的C++20 format 库，代码行数3000左右，最近我就在看这个。
这几个都是现代 C++ 风格的高质量开源代码仓库，值得学习和使用，个人更喜欢folly多一些。

**

再推荐15个小巧的C语言开源项目：

- [stb](https://link.zhihu.com/?target=https%3A//github.com/nothings/stb)：简单的 C 库集合，C语言的轮子库，提供了很多实用的工具函数和数据结构。代码行数5000行左右，star数21.5k。**
- [kilo](https://link.zhihu.com/?target=https%3A//github.com/antirez/kilo)：一个小巧的文本编辑器，可以在终端中运行，并且支持基本的编辑操作。代码行数1000行左右，star数5.9k。
- [uthash](https://link.zhihu.com/?target=https%3A//github.com/troydhanson/uthash)：一个小型的哈希表实现库，可以用于 C 语言中的任何类型。代码行数1200行左右，star数3.4k。
- [picotcp](https://link.zhihu.com/?target=https%3A//github.com/tass-belgium/picotcp)：一个小型的 TCP/IP 协议栈。代码行数4000行左右，star数995。
- [zlog](https://link.zhihu.com/?target=https%3A//github.com/HardySimpson/zlog)：一个小型的纯C日志库，高性能，多线程。代码行数2000行左右，star数1.8k。
- [libmill](https://link.zhihu.com/?target=https%3A//github.com/sustrik/libmill)：一个小型的Go风格协程库，提供了高效的并发编程模型。代码行数3000行左右，star数2.6k。
- <strong>[cJSON](https://link.zhihu.com/?target=https%3A//github.com/DaveGamble/cJSON)：一个小型的 JSON 解析器和生成器，可以用于C 语言中处理 JSON 数据，估计C语言开发很多人都会用这个Json库。代码行数1500行左右，star数8.6k。</strong>
- [nanopb](https://link.zhihu.com/?target=https%3A//github.com/nanopb/nanopb)：一个小型的 Protocol Buf库，适用于嵌入式设备和内存受限环境。代码行数5000左右，star数3.4k。
- [miniz](https://link.zhihu.com/?target=https%3A//github.com/richgel999/miniz)：一个小型的 ZIP 文件压缩和解压库，可以在内存中处理数据。代码行数1600行左右，star数1.7k。
- [linenoise](https://link.zhihu.com/?target=https%3A//github.com/antirez/linenoise)：一个小型的 readline 替代品，可以用于终端程序的交互式输入，Redis和MongoDB中都有使用。代码行数850左右，star数3.2k。
- [picohttpparser](https://link.zhihu.com/?target=https%3A//github.com/h2o/picohttpparser)：一个小型的 HTTP 解析器，适用于 C 语言。代码行数500行左右，star数1.6k。
- [log.c](https://link.zhihu.com/?target=https%3A//github.com/rxi/log.c)：一个小型的日志库，支持多种日志级别和输出格式。代码行数200行左右，star数1.8k。
- [sokol](https://link.zhihu.com/?target=https%3A//github.com/floooh/sokol)：一个跨平台的轻量级图形 API，可以方便地创建 OpenGL 和 Metal 应用程序。代码行数上万了，star数4.4k。
- <strong>[libuv](https://link.zhihu.com/?target=https%3A//github.com/libuv/libuv)：一个跨平台异步 I/O 库，常用于 Node.js 的底层实现。这个库很火。代码行数过万，但是还是推荐，值得学习，star数21.2k。</strong>
- [inih](https://link.zhihu.com/?target=https%3A//github.com/benhoyt/inih)：一个小型的 INI 配置文件解析器，可以用于读取和修改 INI 文件格式的配置文件。代码行数800行左右，star数2k。
请注意，上述提到的代码行数仅为粗略估计（粗略看了下），可能不是完全准确。而关于 star 数量，是在我最近检查时（2023年4月5日）所观察到的数量。

**作者：程序喵
CPP学习网站：[程序喵/cpp-learning](https://link.zhihu.com/?target=https%3A//gitee.com/chengxumiaodaren/cpp-learning)创作不易，觉得不错的话，帮忙点个赞呗。**

[发布于 2024-06-03 22:47](//www.zhihu.com/question/332778359/answer/3519201011)・上海

​2 条评论​490 ​4 ​分享

​​

收起​