---
title: 有哪些优秀的 C++ 代码库可以推荐学习？
date: "2019-11-24 00:00:00"
updated: "2019-11-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/有哪些优秀的-C-代码库可以推荐学习/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/281276664/answer/907647528
---


[coost-A tiny boost library in C++11](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost)**[coost](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost)** 是一个**兼具性能与易用性**的跨平台 C++ 基础库，其目标是打造一把 C++ 开发神器，让 C++ 编程变得简单、轻松、愉快。

coost 原名为 co，后改为 cocoyaxi，前者过短，后者过长，取中庸之道，又改为 coost。它曾被称为小型 [boost](https://link.zhihu.com/?target=https%3A//www.boost.org/) 库，与 boost 相比，coost 小而精美，在 **linux 与 mac 上编译出来的静态库仅 1M 左右大小**，却包含了不少强大的功能：

- 命令行与配置文件解析(flag)
- **高性能日志库(log)**
- 单元测试框架(unitest)
- **go-style 协程**
- 基于协程的网络编程框架
- 高效 JSON 库
- **基于 JSON 的 RPC 框架**
- 原子操作(atomic)
- **高效字符流(fastream)**
- 高效字符串(fastring)
- 字符串操作(str)
- 时间库(time)
- 线程库(thread)
- 定时任务调度器
- **面向玄学编程**
- LruMap
- hash 库
- path 库
- 文件系统操作(fs)
- 系统操作(os)
- **高性能内存分配器**
coost 的发展历程

- **2013-2015** 年，[Alvin(idealvin)](https://link.zhihu.com/?target=https%3A//github.com/idealvin) 在使用 google gflags、glog、gtest 等时，感到有些繁琐，就自己动手实现了相应的功能，即现今 coost 中的 **flag、log、unitest** 等组件。
- **2015-2018** 年，Alvin 将自研的这套基础库引入实际项目中，供自己与同事使用，大幅度提升了 C++ 开发效率，coost 也得以经受工业项目的检验，并在实践中不断完善、扩充新的功能。
- **2019** 年，Alvin 实现了**类似 goroutine 的协程机制**，以及基于协程的网络编程框架，之后**将项目命名为 co，在** **[github](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost)** **上发布 1.0 版本**。
- **2020-2021** 年，完善 hook 机制、协程同步机制，增加 golang 中的 channel、defer 等特性，**发布 2.x 版本**。在此期间，**码友们提供了很多宝贵的改进意见，并帮忙完善了** **[xmake](https://link.zhihu.com/?target=https%3A//github.com/xmake-io/xmake)、cmake 编译脚本以及 coost 中的很多功能**。
- **2022** 年，新增**内存分配器**、提升整体性能，对 flag、log、JSON、RPC、fastring、fastream 等很多组件做出了重大改进，并**将项目更名为 coost，发布 3.0 版本**。
快速上手

编译
建议安装 [xmake](https://link.zhihu.com/?target=https%3A//github.com/xmake-io/xmake)，在 coost 根目录执行如下命令构建所有子项目：

xmake -a
如果需要使用 http::Client, SSL 或 HTTPS 特性，则可以用下面的命令构建：

xmake f --with_libcurl=true --with_openssl=true
xmake -a
xmake 会自动从网络安装 libcurl 与 openssl，视网络情况，这个过程可能会较慢。`xmake -a`会编译[libco](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/tree/master/src),[gen](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/tree/master/gen),[unitest](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/tree/master/unitest)以及[test](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/tree/master/test)目录下面的所有测试代码。编译完后可以执行如下命令，运行 coost 中的测试程序：

xmake r unitest
xmake r flag
xmake r log -cout
xmake r co

使用 coost 开发 C++ 项目
最简单的，可以直接包含[co/all.h](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/blob/master/include/co/all.h)，使用 coost 中的所有特性。如果担心影响编译速度，也可以只包含需要用到的头文件，如包含[co/co.h](https://link.zhihu.com/?target=https%3A//github.com/idealvin/coost/blob/master/include/co/co.h)，可以使用 co/flag, co/log 以及协程相关的所有特性。

#include &#34;co/all.h&#34;

DEF_string(s, &#34;nice&#34;, &#34;&#34;);

int main(int argc, char** argv) {
    flag::init(argc, argv);
    LOG << FLG_s;
    return 0;
}

上面是一个简单的例子，main 函数第一行用于解析命令行参数及配置文件。coost 中的部分组件用 flag 定义配置项，因此需要在 main 函数开头调用 `flag::init()` 进行初始化。

用户也可以用宏 `DEF_main` 定义 main 函数：

#include &#34;co/all.h&#34;

DEF_string(s, &#34;nice&#34;, &#34;&#34;);

DEF_main(argc, argv) {
    LOG << FLG_s;
    return 0;
}

`DEF_main`将 main 函数中的代码放到协程中运行，内部已经调用了`flag::init()`，用户无需手动调用。

核心组件

co/flag
[co/flag](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/flag/) 是一个简单易用的命令行参数与配置文件解析库，cocoyaxi 中的一些组件会用它定义配置项。

co/flag 为每个配置项提供一个默认值，在没有配置参数的情况下，程序可以按默认配置运行。用户也可以从**命令行或配置文件**传入配置参数，在需要配置文件时，可以执行 `./exe -mkconf` **自动生成配置文件**。

// xx.cc
#include &#34;co/flag.h&#34;
#include &#34;co/log.h&#34;

DEF_bool(x, false, &#34;bool x&#34;);
DEF_bool(y, false, &#34;bool y&#34;);
DEF_uint32(u32, 0, &#34;...&#34;);
DEF_string(s, &#34;hello world&#34;, &#34;string&#34;);

int main(int argc, char** argv) {
    flag::init(argc, argv);

    COUT << &#34;x: &#34; << FLG_x;
    COUT << &#34;y: &#34; << FLG_y;
    COUT << &#34;u32: &#34; << FLG_u32;
    COUT << FLG_s << &#34;|&#34; << FLG_s.size();

    return 0;
}

上面是一个使用 co/flag 的例子，代码中 `DEF_` 开头的宏，定义了 4 个配置项，每个配置项相当于一个全局变量，变量名是 `FLG_` 加配置名。上面的代码编译完后，可以按下面的方式运行：

./xx                  # 按默认配置运行
./xx -xy -s good      # 单字母命名的 bool flag, 可以一并设置为 true
./xx -s &#34;I&#39;m ok&#34;      # 含空格的字符串
./xx -u32 8k          # 整数可以带单位: k,m,g,t,p, 不区分大小写

./xx -mkconf          # 自动生成配置文件 xx.conf
./xx xx.conf          # 从配置文件传入参数
./xx -config xx.conf  # 与上同

co/log
[co/log](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/log/) 是一个高性能的本地日志系统，cocoyaxi 中的一些组件会用它打印日志。

co/log 将日志分为 debug, info, warning, error, fatal 5 个级别，**打印 fatal 级别的日志会终止程序的运行**。用户可以像下面这样打印不同级别的日志：

DLOG << &#34;hello &#34; << 23;  // debug
LOG << &#34;hello &#34; << 23;   // info
WLOG << &#34;hello &#34; << 23;  // warning
ELOG << &#34;hello &#34; << 23;  // error
FLOG << &#34;hello &#34; << 23;  // fatal

co/log 还提供了一系列 `CHECK` 宏，可以视为加强版的 `assert`，它们在 debug 模式下也不会被清除。

void* p = malloc(32);
CHECK(p != NULL) << &#34;malloc failed..&#34;;
CHECK_NE(p, NULL) << &#34;malloc failed..&#34;;

CHECK 断言失败时，co/log 会打印函数调用栈信息，然后终止程序的运行。

![](https://pic1.zhimg.com/v2-b84f25d4d421e86c7b9039589263f58e_r.jpg?source=2c26e567)([asciicast:435894 - asciinema](https://link.zhihu.com/?target=https%3A//asciinema.org/a/435894))

co/log 速度非常快，在程序运行稳定后，几乎不需要内存分配操作。下面是一些测试结果，仅供参考：

- co/log vs glog (single thread)
![](https://pic1.zhimg.com/v2-46baa6409fba65ad060f9ccc489423c3_r.jpg?source=2c26e567)
- [co/log vs spdlog](https://link.zhihu.com/?target=https%3A//github.com/idealvin/cocoyaxi/tree/benchmark) (Windows)
![](https://picx.zhimg.com/v2-e177de0c612755400e0d0abdfbfcf887_r.jpg?source=2c26e567)
- [co/log vs spdlog](https://link.zhihu.com/?target=https%3A//github.com/idealvin/cocoyaxi/tree/benchmark) (Linux)
![](https://picx.zhimg.com/v2-1a97f434a9f2a3d7de46044f0896d7e1_r.jpg?source=2c26e567)
co/unitest
[unitest](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/unitest/) 是一个简单易用的单元测试框架，cocoyaxi 中的很多组件会用它写单元测试代码，为 cocoyaxi 的稳定性提供了保障。

#include &#34;co/unitest.h&#34;
#include &#34;co/os.h&#34;

namespace test {

DEF_test(os) {
    DEF_case(homedir) {
        EXPECT_NE(os::homedir(), &#34;&#34;);
    }

    DEF_case(cpunum) {
        EXPECT_GT(os::cpunum(), 0);
    }
}

} // namespace test

上面是一个简单的例子，`DEF_test` 宏定义了一个测试单元，实际上就是一个函数(类中的方法)。`DEF_case` 宏定义了测试用例，每个测试用例实际上就是一个代码块。多个测试单元可以放到同一个 C++ 项目中，main 函数一般只需要下面几行：

#include &#34;co/unitest.h&#34;

int main(int argc, char** argv) {
    flag::init(argc, argv);
    unitest::run_all_tests();
    return 0;
}

[unitest](https://link.zhihu.com/?target=https%3A//github.com/idealvin/cocoyaxi/tree/master/unitest) 目录下面是 cocoyaxi 中的单元测试代码，编译后可执行下述命令运行：

xmake r unitest -a   # 运行所有单元测试用例
xmake r unitest -os  # 仅运行 os 单元中的测试用例

协程
cocoyaxi 实现了类似 [golang](https://link.zhihu.com/?target=https%3A//github.com/golang/go) 的协程，它有如下特性：

- 多线程调度，默认线程数为系统 CPU 核数。
- 共享栈，同一线程中的协程共用若干个栈(大小默认为 1MB)，内存占用低，Linux 上的测试显示 1000 万协程只用了 2.8G 内存(仅供参考)。
- 各协程之间为平级关系，可以在任何地方(包括在协程中)创建新的协程。
- 支持系统 API hook (Windows/Linux/Mac)，可以直接在协程中使用三方网络库。
- 协程化的 [socket API](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23%25E5%258D%258F%25E7%25A8%258B%25E5%258C%2596%25E7%259A%2584-socket-api)。
- 协程同步事件 [co::Event](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23%25E5%258D%258F%25E7%25A8%258B%25E5%2590%258C%25E6%25AD%25A5%25E4%25BA%258B%25E4%25BB%25B6coevent)。
- 协程锁 [co::Mutex](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23%25E5%258D%258F%25E7%25A8%258B%25E9%2594%2581comutex)。
- 协程池 [co::Pool](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23%25E5%258D%258F%25E7%25A8%258B%25E6%25B1%25A0copool)。
- channel [co::Chan](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23channelcochan)。
- waitgroup [co::WaitGroup](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23waitgroupcowaitgroup)。
创建协程
go(ku);            // void ku();
go(f, 7);          // void f(int);
go(&T::f, &o);     // void T::f(); T o;
go(&T::f, &o, 7);  // void T::f(int); T o;
go([](){
    LOG << &#34;hello go&#34;;
});

上面是用 `go()` 创建协程的例子，go() 是一个函数，它接受 1 到 3 个参数，第一个参数 `f` 是任意可调用的对象，这些参数只要满足 `f()`, `(*f)()`, `f(p)`, `(*f)(p)`, `(o->*f)()` 或者 `(o->*f)(p)` 能被调用就可以了。

`go()` 创建的协程会均匀的分配到不同的调度线程中。如果用户想让某些协程运行在同一个线程下，可以用下面的方式创建协程：

auto s = co::next_scheduler();
s->go(f1);
s->go(f2);

如果用户想在所有的调度线程中创建协程，可以用下面的方式：

auto& s = co::all_schedulers();
for (size_t i = 0; i < s.size(); ++i) {
    s[i]->go(f);
}

channel
[co::Chan](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23channelcochan)，类似于 golang 中的 channel，可用于在协程之间传递数据。

#include &#34;co/co.h&#34;

DEF_main(argc, argv) {
    co::Chan<int> ch;
    go([ch]() {
        ch << 7;
    });

    int v = 0;
    ch >> v;
    LOG << &#34;v: &#34; << v;

    return 0;
}

**channel 的读写操作必须在协程中进行**，因此上述代码中用 `DEF_main` 定义 main 函数，让 main 函数中的代码也运行在协程中。

代码中的 channel 对象在栈上，而 cocoyaxi 采用的是共享栈实现方式，一个协程栈上的数据可能被其他协程覆盖，**协程间一般不能直接通过栈上的数据通信**，因此代码中的 lambda 采用了**按值捕获**的方式，将 channel 拷贝了一份，传递到新建的协程中。channel 的拷贝操作只是将内部引用计数加 1，几乎不会对性能造成影响。

创建 channel 时可以像下面这样加上超时时间：

co::Chan<int> ch(8, 1000);

channel 读写操作结束后，可以调用 `co::timeout()` 判断是否超时，这种方式比 golang 中基于 select 的实现方式更简单。

cocoyaxi 中的 channel 基于内存拷贝实现，传递的数据类型可以是内置类型、指针类型，或者**拷贝操作具有简单的内存拷贝语义的结构体类型**。像 `std::string` 或 STL 中的容器类型，拷贝操作不是简单的内存拷贝，一般不能直接在 channel 中传递，详情见 [co::Chan 参考文档](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23channelcochan)。

waitgroup
[co::WaitGroup](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23waitgroupcowaitgroup)，类似于 golang 中的 `sync.WaitGroup`，可用于等待协程或线程的退出。

#include &#34;co/co.h&#34;

DEF_main(argc, argv) {
    FLG_cout = true;

    co::WaitGroup wg;
    wg.add(8);

    for (int i = 0; i < 8; ++i) {
        go([wg]() {
            LOG << &#34;co: &#34; << co::coroutine_id();
            wg.done();
        });
    }

    wg.wait();
    return 0;
}

网络编程
cocoyaxi 提供了一套协程化的 [socket API](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/coroutine/%23%25E5%258D%258F%25E7%25A8%258B%25E5%258C%2596%25E7%259A%2584-socket-api)，它们大部分形式上与原生的 socket API 基本一致，熟悉 socket 编程的用户，可以轻松的用同步的方式写出高性能的网络程序。另外，cocoyaxi 也实现了更高层的网络编程组件，包括 [TCP](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/net/tcp/)、[HTTP](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/net/http/) 以及基于 [JSON](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/json/) 的 [RPC](https://link.zhihu.com/?target=https%3A//idealvin.gitee.io/cn/co/net/rpc/) 框架，它们兼容 IPv6，同时支持 SSL，用起来比 socket API 更方便。这里只简单的展示一下 HTTP 的用法，其余的可以查看参考文档。

**静态 web server**

#include &#34;co/flag.h&#34;
#include &#34;co/log.h&#34;
#include &#34;co/so.h&#34;

DEF_string(d, &#34;.&#34;, &#34;root dir&#34;); // Specify the root directory of the web server

int main(int argc, char** argv) {
    flag::init(argc, argv);
    log::init();

    so::easy(FLG_d.c_str()); // mum never have to worry again

    return 0;
}

**HTTP server**

http::Server serv;

serv.on_req(
    [](const http::Req& req, http::Res& res) {
        if (req.is_method_get()) {
            if (req.url() == &#34;/hello&#34;) {
                res.set_status(200);
                res.set_body(&#34;hello world&#34;);
            } else {
                res.set_status(404);
            }
        } else {
            res.set_status(405); // method not allowed
        }
    }
);

serv.start(&#34;0.0.0.0&#34;, 80);                                    // http
serv.start(&#34;0.0.0.0&#34;, 443, &#34;privkey.pem&#34;, &#34;certificate.pem&#34;); // https

**HTTP client**

void f() {
    http::Client c(&#34;https://github.com&#34;);

    c.get(&#34;/&#34;);
    LOG << &#34;response code: &#34;<< c.response_code();
    LOG << &#34;body size: &#34;<< c.body_size();
    LOG << &#34;Content-Length: &#34;<< c.header(&#34;Content-Length&#34;);
    LOG << c.header();

    c.post(&#34;/hello&#34;, &#34;data xxx&#34;);
    LOG << &#34;response code: &#34;<< c.response_code();
}

go(f);