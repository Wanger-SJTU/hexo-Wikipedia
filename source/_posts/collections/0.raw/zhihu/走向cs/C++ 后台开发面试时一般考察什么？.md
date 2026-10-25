---
title: C++ 后台开发面试时一般考察什么？
date: "2020-12-05 00:00:00"
updated: "2020-12-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/C-后台开发面试时一般考察什么/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/34574154/answer/1612013803
---


<strong>在腾讯做Linux C++ 后台开发的来回答下, 去年校招我主要是投的后台开发方向，本身语言也是 C++，走的是 Linux C/C++后台开发方向，拿到过百度、腾讯、字节等大厂offer。</strong>

同时，据我所知，一般毕业两三年的社招考察内容和校招也挺接近的，只不过会更加关注你的项目经历和系统设计方面。

<strong>这篇文章很干货，记得点赞后，收藏噢~，可以作为面试复习的索引</strong>

<strong>--update--</strong>

![](https://pic1.zhimg.com/v2-03251cab1c14252e939af4799fba149e_r.jpg?source=2c26e567)最近已经把 C++ 面试常考的问题以及学习路线等都整理到网站了：

[C/C++后台开发面试重点知识](https://link.zhihu.com/?target=https%3A//csguide.cn/cpp/)首先，C++岗位的面试肯定不止只是单独考察你语言本身的，同时其它知识也是考察的重点，比如网络、系统编程、分布式理论、数据库。

<strong>尤其是算法，现在大厂面试算法是必考的，在这里也送大家一本帮助我拿到BAT 等一线大厂 offer 的算法笔记，是一位阿里大神写的，对于算法薄弱或者需要提高的同学都十分受用，算法一定是计算机学习的重中之重：</strong>

[阿里大神的leetcode刷题笔记，看完秒杀80%的题目](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/vSGzpEPZCTunsczuIcsjWQ)在这，顺便分享一份大学期间自己整理的电子书库，绝不是在网上那种打包下载的，而是自己需要学到某个方向知识的时候，去网上挨个找的，最后汇总而成。

汇集了编程语言(Java、C++、C、Python等等)、操作系统、计算机网络、系统架构、设计模式、程序员数学、测试、中间件 、前端开发、后台开发、网络编程、Linux使用及内核、数据库、Redis....等主流的编程学习书籍。

![](https://pic1.zhimg.com/50/v2-d7a9537446e8aafeb0c5feb8cce72fc5_720w.jpg?source=2c26e567)

<strong>我整理的这些书大家可以在这里获取，对于学习计算机的同学帮助非常大，且十分系统</strong>：

书单：[书单推荐，少即是多（含下载方式）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzg4NjUxMzg5MA%3D%3D%26mid%3D100000686%26idx%3D1%26sn%3Daaf4a33db6e08f9be085c0c57f14fb3a%26chksm%3D4f99ca2378ee43350e13cba18595a432a0e87ddc2a8aa8457eed8d1712fb45deb1295546d834%23rd)

<strong>C++语言知识</strong>
这里首先说下语言基础知识，一些关键字和实现原理等：

- 指针、引用、数组、内存
- C和 C++ 的一些区别，比如 new、delete 和 malloc、free 的区别
- C++中引用与指针区别
- 继承、虚继承、菱形继承等
- C++虚机制：虚函数、虚函数表、纯虚函数
- 多态： 动态绑定，静态多态
- C++里一些关键字的作用：static、const、volatile、extern
- C++ 重写、重载
- 智能指针使用：shared_ptr、weak_ptr、unique_ptr等
- 类型转换：static_cast, dynamic_cast, const_cast, reinterpret_cast
- STL大部分容器的实现原理，如 vector、deque、map、hashmap
- 模板特化、偏特化，萃取 traits 技巧
- 程序编译链接机制、内存布局（memory layout）、对象模型
- C++11 部分新特性，比如右值引用、完美转发等
- 智能指针原理：引用计数、RAII（资源获取即初始化）思想
- C++构造、析构、移动、拷贝等
- C++ 内存管理，堆、栈、指针、野指针、内存泄露等
- 内联函数、宏定义区别等可以通过看这些书去学习：

- <strong>《C++ Primer》</strong>，这本书是基础，需要重点看前几部分。
- <strong>Effective 系列：《Effective C++》、《More Effective C++》、《Effective STL》</strong>，这部分是提高C++编码能力
- <strong>《STL 源码剖析》和《深度探索 C++ 对象模型》</strong>，这是了解STL容器底层实现和对象模型，面试常考<strong>视频推荐：</strong>

可以在 B 站搜索「候捷 C++」，主要有以下几个系列视频：

- 《C++内存管理》
 
- 《STL源码分析》
 
- 《C++ STL与泛型编程高级》
 
- 《C++11 新特性》
 侯捷C++新标准-C++11/14[【高清版】侯捷C++新标准-C++11/14_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1RB4y1F7x4)侯捷-C++ STL标准库和 C++ 泛型编程

[【高清完整版】侯捷-C++ STL标准库和 C++ 泛型编程_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1xy4y1g71j)侯捷-C++程序的生前和死后

[【高清完整版】侯捷-C++程序的生前和死后_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili](https://link.zhihu.com/?target=https%3A//www.bilibili.com/video/BV1xA411g7t5)推荐看完，会让你对C++比较理解比较透彻，运用更加熟练。

侯捷 C++ 视频课程一直都被看过的同学广为推荐，最近发现 B 站关于侯捷老师的 C++ 视频课程几乎全部被下架了，于是自己搜集了一套非常全的视频，大家赶紧去下载保存备用：

[侯捷C++全套视频｜含下载方式](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzg4NjUxMzg5MA%3D%3D%26mid%3D100004570%26idx%3D1%26sn%3Dc9a865d899f5095c82d5b8c335c0033e%26chksm%3D4f99db5778ee52413de8d2b0b5311770dcb028bdf32a5204881ba8f4d26769f3fe92cb05e397%23rd)

上面提到的C++这些书，我帮你整理了一部分，有需自取： 

[C++必读书籍推荐| 附下载方式](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/93U9-BFqZD5aSjDqzZ7uYw)

<strong>计算机基础知识：</strong>
<strong>计算机网络</strong>：

需要掌握的网络协议和知识：

- HTTP、TCP、IP、ICMP、UDP、DNS、ARP
- IP地址、MAC地址、OSI七层模型（或者 TCP/IP 五层模型）
- 常见网络攻击：局域网ARP泛洪、DDoS、TCP SYN Flood、XSS等
- HTTPS安全相关的：数字签名、数字证书、TLS
- HTTP常见返回码含义，HTTP1.0、2.0区别等TCP的重点知识：

- 三次握手、四次挥手
 
- 建立、断开连接过程中状态转换
 
- TCP 状态中 TIME_WAIT
 
- 拥塞控制
 
- 快速重传、慢启动等
 
- TCP重发机制，Nagle算法
 <strong>学习过程中也要多思考为什么要这么设计，这里列几个问题：</strong>

- TCP 如何实现可靠传输的（画外音：如何基于 UDP 实现可靠传输
- 第二次和第三次之间的等待是什么
- TCP 连接建立为什么不是两次握手（画外音：三次握手的充分必要性说明
- TIME_WAIT 的存在解决了什么问题，等待时间为什么是 2 MSL
- 为什么不是四次握手<strong>常见端口与服务：</strong>

21 : FTP - 文件传输协议 - TCP

23 : TELNET - 远程登录协议 - TCP

25 : SMTP - 简单邮件传输协议 - TCP

80 : HTTP - 超文本传输协议 - TCP

53 : DNS - 域名系统 - UDP

<strong>最后别忘了自己复述一遍那被问烂了、写烂了的问题：</strong>

- <strong>从 URL 输入到页面展现到底发生什么？</strong>HTTP 和 HTTPS：

- HTTP中GET/POST的区别
- 常见的状态码：1XX、2XX、3XX、4XX
- HTTP/HTTPS的区别，证书、数字签名等原理
- COOKIE/SESSION的区别<strong>但是计网中还是有一些有意思的问题，如果你没思考过，也许回答不出来。</strong>

比如：

- 为什么有了 MAC 地址还要 IP 地址，IP 地址和 MAC 地址的区别是什么？
- 如何理解广播域和冲突域？
- 路由器和交换机有什么区别？
- TCP 连接的本质是什么，真的是“链接”吗？（曾经被问过：Java socket 创建的 TCP 连接，对于主机挂了和 JVM 挂了有什么区别？这些问题只有当你真正理解了才能回答出，仅仅记住协议的话，估计很难应对灵活的面试题。

推荐书籍：

- 《网络是怎样连接的》
- 《计算机网络：自顶向下方法》
- 《TCP/IP详解卷1：协议》
- 《图解HTTP》
<strong>操作系统知识</strong>
一些复习的思路：

- 操作系统由哪些构成
- 进程和线程的区别
- 进程间通信方式（共享内存、管道、消息）
- 并发经典的问题：读者写者、哲学家就餐问题
- 文件系统是如何组织的
- 互斥与同步（信号量、管程、锁）
- 死锁检测与避免
- 虚拟文件系统（VFS）是如何抽象的
- 线程的实现方式（一对一、多对一等）
- 为什么需要虚拟内存，MMU 具体如何做地址转换的
- 内存为什么分段、分页
- 页面置换算法
- 进程的状态、切换、调度对于进程、线程这块你还可以把 fork、vfork、clone 、pthread_create 这些模块关系彻底搞清楚，对你理解 Linux 下的进程实现有非常大的帮助。

书籍推荐：

- 《现代操作系统》
- 《操作系统—精髓与设计原理》
- 《Linux内核设计与实现》
- 《深入理解计算机系统》
<strong>网络编程和服务器开发</strong>
重点知识：

Linux 下网络编程核心的包括网络 IO 和系统编程两个部分：

- 进程间通信方式： 信号量、管道、共享内存、socket 等
- 五大 IO 模型：同步、异步、阻塞、非阻塞、信号驱动
- 高性能 IO 两种模式：Reactor 和 Proactor（ 但是 Linux 下由于缺少异步 IO 支持，基本没有 Proactor
- IO 复用机制：epoll、select、poll（破解 C10K 问题的利器）
- 多线程编程：互斥锁、条件变量、读写锁、线程池等推荐的书：

- 《Linux高性能服务器编程》
- 《Unix网络编程》
- 《Unix环境高级编程》
- 《Linux多线程服务器端编程》网络编程练手小项目推荐http server：

HTTP 服务器，熟悉http协议的解析和网络编程

这里推荐一个做为参考：

[https://github.com/imarvinle/WebServer](https://link.zhihu.com/?target=https%3A//github.com/imarvinle/WebServer)： 这是我看完高性能服务器编程后写的，欢迎star~

有如下特点：

- 状态机解析HTTP请求，目前支持 HTTP GET、HEAD方法
- 使用 priority queue 实现的最小堆结构管理定时器，使用标记删除，以支持惰性删除，提高性能
- 使用epoll + 非阻塞IO + 边缘触发(ET) 实现高并发处理请求，使用Reactor编程模型
- epoll使用EPOLLONESHOT保证一个socket连接在任意时刻都只被一个线程处理
- 添加定时器支持HTTP长连接，定时回调handler处理超时连接
- 使用线程池提高并发度，并降低频繁创建线程的开销
- 同步互斥的介绍
- 使用RAII手法封装互斥器(pthrea_mutex_t)、 条件变量(pthread_cond_t)等线程同步互斥机制，使用RAII管理文件描述符等资源
- 使用shared_ptr、weak_ptr管理指针，防止内存泄漏
<strong>系统知识</strong>
推荐书籍：

- 《深入理解计算机系统》
- 《程序员自我修养》
<strong>算法于数据结构</strong>
重点数据结构：

- 线性表、数组、链表
- 栈与队列
- 散列函数和散列表
- 树、二叉树、多叉树实现和遍历方式，AVL树实现以及插入删除过程、红黑树（了解定义即可）
- 图，以及图的实现方式、遍历
- 堆
- B树、B+树
- 。。。常见的算法：

- 排序算法：冒泡、插入、堆排、基数、快速、希尔、归并等
- 字符串匹配算法：KMP
- 常见算法思想：递推、分治、贪心、递归、枚举、动态规划等书籍推荐：

- 《啊哈算法》
- 《算法图解》
- 《算法第四版》刷题网站推荐：

- leetcode
- 牛客网
<strong>数据库</strong>
数据库首先要学会 SQL 的使用，这里推荐《MySQL必知必会》。

数据库原理方面可以看看《数据库系统概念》，这本书挺厚的，包含了从 SQL 到数据库设计再到数据库原理、分布式数据库都有，可以挑着看，比如关系模型、数据库设计（三大范式）、数据磁盘存储和组织方式、索引、并发控制等。

当然了整个数据库最重要的还是索引和并发控制（锁、MVCC等），这部分也是面试常考的：

- 索引存储结构：B树、B+树索引、Hash索引
 
- 索引的使用：主键索引、覆盖索引、最左前缀原则、索引下推等
 
- 锁：乐观锁、悲观锁、表锁，行锁，意向锁，读锁，写锁等等
 
- MySQL InnoDB MVCC 实现机制
 
- 存储引擎：InnoDB、MyISAM等，各自的优缺点
 
- 事务：ACID理论
 这部分推荐两本书：

- 《高性能MySQL》
- 《MySQL技术内幕》这两本主要对索引、innodb存储引擎、锁、并发控制讲得比较清楚，建议挑对应章节看。

其它还包括NoSQL、分布式、微服务、RPC、系统设计、Redis这些组件的和系统设计方面的知识，我就不一一列出来了。

当然了，我还有自己整理的电子书库，绝不是在网上那种打包下载的，而是自己需要学到某个方向知识的时候，需要看了，去网上挨个找的，最后汇总而成。

这部分我是会不断把它完善的，当成自己的小电子书库，不多，但贵在精。

![](https://pic1.zhimg.com/50/v2-d7a9537446e8aafeb0c5feb8cce72fc5_720w.jpg?source=2c26e567)<strong>我整理的这些书大家可以在这里获取，对于学习计算机的同学帮助非常大，且十分系统</strong>：

书单：[书单推荐，少即是多（含下载方式）](https://link.zhihu.com/?target=http%3A//mp.weixin.qq.com/s%3F__biz%3DMzg4NjUxMzg5MA%3D%3D%26mid%3D100000686%26idx%3D1%26sn%3Daaf4a33db6e08f9be085c0c57f14fb3a%26chksm%3D4f99ca2378ee43350e13cba18595a432a0e87ddc2a8aa8457eed8d1712fb45deb1295546d834%23rd)

另外, 面试刷题也非常重要,这是面试第一步, 去年看过一本刷题笔记, 对我帮助很大, 分享给大家,看完刷leetcode比较容易:

[编程指北：Github 疯传！史上最强！BAT 大佬「LeetCode刷题手册」电子书开放下载了！](https://zhuanlan.zhihu.com/p/339403474)本文从原文选择了部分回答，更加完整详细的版本在这：

来源：公众号【编程指北】

链接： [万字长文 | 这可能是东半球最保姆级的后台服务器开发学习路线](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/7xANFCFUd528Lch3lqcbRg)

<strong>觉得不错，收藏的时候也顺便点个赞呗~ 笔芯~~</strong>