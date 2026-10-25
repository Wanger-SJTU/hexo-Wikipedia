---
id: 926fadce-9e0d-4859-b0d4-a5a4a9dd8d7d
---

# Envoy 的线程模型 与 Thread Local - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/envoy-thread-local-18f79dca993)
[Read Original](https://zhuanlan.zhihu.com/p/697250729)



![](https://proxy-prod.omnivore-image-cache.app/865x640,sT93Alnja9oAw7XrlgLJo6hzZ4i9TpEGzJbOItD8N7Q4/https://pic3.zhimg.com/v2-253c7e7eadb5a0df88058209b6d43ad2_b.jpg)

World War II in Europe 1939\~1941

内容简介：本文尝试以具体示例说明 Envoy 的线程模型 与 Thread Local 实现。

> 摘录说明： 本文摘自一本我在写作中的开源书[《Istio & Envoy 内幕》](https://istio-insider.mygraphql.com/zh%5FCN/latest/index.html) 中 [线程模型](https://istio-insider.mygraphql.com/zh-cn/latest/ch2-envoy/arch/thread-model/thread-model.html) 一节。**如果你发现转载图片不清，请回到原书。**   
> 关于本文封面：World War II in Europe 1939\~1941 World War II is a significant event where the Allied and Axis powers fought on global scale affecting many parts of the world. World War II explains the current conditions of many countries today economically, politically, and socially.

## **线程模型**

如果给你一个开源中间件，要你分析其实现，那么，你会从什么地方入手？回答可能是：

* 源码模块
* 抽象概念与设计模式
* 线程

对于现代开源中间件，我觉得线程/进程模型几乎是最重要的。因为现代中间件基本都使用了多进程或多线程以充分利用硬件资源。无论封装抽象得再好，设计模式应用得再优雅，程序终究要以线程的方式在 cpu 上面跑。而多线程是如何按职能划分的，线程之间如何同步通讯，这些东西才是难点和重点。

简单来说，Envoy 使用了 non-blocking + Event Driven + Multi-Worker-Thread 的线程设计模式。在软件设计史上，类似的设计模式的名称有很多，如：

* [staged event-driven architecture (SEDA)](https://en.wikipedia.org/wiki/Staged%5Fevent-driven%5Farchitecture)
* [Reactor pattern](https://en.wikipedia.org/wiki/Reactor%5Fpattern)
* [Event-driven architecture (EDA)](https://en.wikipedia.org/wiki/Event-driven%5Farchitecture)

> 本节内容假设读者已经了解过 Envoy 的事件驱动模型。如果未有，可以阅读本书的 [事件驱动](https://istio-insider.mygraphql.com/zh-cn/latest/ch2-envoy/arch/event-driven/event-driven.html)。 本节内容参考了：[Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310) 

与 Node.JS 的单线程不同，Envoy 为了充分利用多 Core CPU 的优势，支持多个 Worker Thread 各自跑自己独立的 event loop。而这样的设计是有代价的，因为多个 worker thread / main thread 之间其实不是完全独立的，他们需要共享一些数据，如：

* Upstream Cluster 的 endpoints 、健康状态……
* 各种监控统计指标

### **线程概述**

![](https://proxy-prod.omnivore-image-cache.app/677x562,s6Itc2C0XA7hMRohJ2j1CdXrEfoUzEF7MjUf9SwKg4Wg/https://pic1.zhimg.com/v2-1ebd406c803e9a3c2c17bf43bf87710c_b.jpg)

图 : Threading overview

_图 : Threading overview_

_Source: [Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310)_

Envoy 使用几种不同类型的线程，如上图所示。下面选择主要的说明：

* main：该线程负责服务器启动和关闭、所有 xDS API 处理（包括 DNS、健康检查和通用cluster management）、runtime、stat flushing、admin 和一般进程管理（signals、热重启等）。该线程上发生的一切都是异步和 "非阻塞 "的。一般来说，main 线程负责协调所有不需要大量 CPU 来完成的关键功能。这样，大部分管理代码就可以像单线程一样编写。
* worker： 默认情况下，Envoy 会为系统中的每个硬件线程生成一个工作线程。(这可通过 --concurrency 选项控制)。每个 worker 线程运行一个 "非阻塞 "事件循环，负责监听每个 listener、接受新连接、为连接实例化一个 filter 栈，并在连接生命周期内处理所有 IO。这样，大部分连接处理代码就可以像单线程代码一样编写。

由于 Envoy 将 main 线程职责与 worker 线程职责分开，因此需要在 main 线程上完成复杂处理，然后以高度并发的方式提供给每个 worker 线程。本节将从高层介绍 Envoy 的线程本地存储 Thread Local Storage (TLS) 系统。后面我将介绍如何使用该系统处理 cluster management 。

![](https://proxy-prod.omnivore-image-cache.app/664x364,s-QKcHPwNcKtBavnsKukc7jvIQ52RJNCKiyuvGaIIfxY/https://pic4.zhimg.com/v2-023de9c10ae329541be4ecc725ad0117_b.jpg)

Figure : Thread Local Storage (TLS) system

_Source: [Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310)_

_Figure : Thread Local Storage (TLS) system_

![](https://proxy-prod.omnivore-image-cache.app/667x383,sxGgwgoRepSHkv0pOJta6KQ0ceDHn_WmC4G3cgK1paUc/https://pic1.zhimg.com/v2-b22ff2270c21855273daf2c5f8884028_b.jpg)

Figure : Cluster manager threading

_Source: [Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310)_

_Figure : Cluster manager threading_

共享的数据，如果都是加锁写读访问，并发度一定会下降。于是 Envoy 作者在分析数据同步更新的实时一致性要求不高的条件下，参考了 Linux kernel 的 [read-copy-update (RCU)](https://en.wikipedia.org/wiki/Read-copy-update) 设计模式，实现了一套 Thread Local 的数据同步机制。在底层实现上，是基于 C++11 的 `thread_local` 功能，和 libevent 的 `libevent::event_active(&raw_event_, EV_TIMEOUT, 0)` 去实现。

下图在 [Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310) 基础上，尝试以 Cluster Manager 为例，说明 Envoy 在源码实现层面，是如何使用 Thread Local 机制实现 thread 之间共享数据的。

![](https://proxy-prod.omnivore-image-cache.app/946x775,spgYzVuu-uptrNhm3I9shPmMC3t9tkFlA1p5HK_adGbM/https://pic2.zhimg.com/v2-85839376196d3884197710fb0cab59b9_b.jpg)

图: ThreadLocal Classes

_图: ThreadLocal Classes_ _[用 Draw.io 打开](https://app.diagrams.net/?ui=sketch#Uhttps%3A%2F%2Fistio-insider.mygraphql.com%2Fzh%5FCN%2Flatest%2F%5Fimages%2Fthread-local-classes.drawio.svg)_

上图可以简述如下：

1. main 线程 初始化 `ThreadLocal::InstanceImpl` 以及每个 `Dispatcher` 注册到 `ThreadLocal::InstanceImpl`
2. main 线程 通知所有 worker 线程创建本地的 `ThreadLocalClusterManagerImpl`
3. main 线程感知到一个 Cluster 被删除时，通知各个 worker 线程的 `ThreadLocalClusterManagerImpl` 删除这个 Cluster
4. worker 线程上的 `TCPProxy` 尝试连接一个 `OnDemand Cluster(未知的 cluster）` 时，获取线程本地的 `ThreadLocalClusterManagerImpl`

### **Ref**

* [Envoy threading model - Matt Klein](https://blog.envoyproxy.io/envoy-threading-model-a8d44b922310)

```gherkin
 象|每|每|在|　|你|曾|未|突|泛|望|穿|你|
 征|個|個|人|　|是|經|曾|然|起|著|過|走|
 命|人|人|潮|　|未|一|實|想|一|一|那|過|
 運|的|在|洶|　|來|度|現|起|片|個|些|林|
 的|眼|痴|涌|　|的|人|的|了|水|現|擁|立|
 紅|睛|痴|的|　|主|們|夢|遙|銀|代|擠|的|
 綠|都|的|十|　|人|告|　|遠|燈|化|的|高|
 燈|望|等|字|　|翁|訴|　|的|　|的|人|樓|
 　|著|　|路|　|　|你|　|過|　|都|　|大|
 　|那|　|口|　|　|說|　|去|　|市|　|廈|
 　|　|　|　|　|　|　|　|　|　|　|　|　|
 
​
 別|　|將|因|每|真|張|每|　|尋|在|你|在|
 以|　|是|為|一|心|大|一|　|找|每|這|紅|
 為|　|他|我|個|的|了|個|　|兒|一|未|橙|
 我|　|們|們|來|關|眼|今|　|時|張|來|黃|
 們|　|的|改|到|懷|睛|天|　|的|陌|的|綠|
 的|　|未|變|世|　|摸|來|　|光|生|主|的|
 孩|　|來|的|界|　|索|到|　|榮|的|人|世|
 子|　|　|世|的|　|著|世|　|　|面|翁|界|
 們|　|　|界|生|　|一|界|　|　|孔|　|裡|
 太|　|　|　|命|　|個|的|　|　|裡|　|　|
 小|　|　|　|在|　|　|嬰|　|　|　|　|　|
 　|　|　|　|期|　|　|孩|　|　|　|　|　|
 　|　|　|　|待|　|　|　|　|　|　|　|　|
​
```

