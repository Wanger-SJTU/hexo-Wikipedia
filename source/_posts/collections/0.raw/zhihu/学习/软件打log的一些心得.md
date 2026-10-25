---
title: 软件打log的一些心得
date: "2017-01-09 00:00:00"
updated: "2017-01-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/学习/软件打log的一些心得/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/24785018
---


在  [同事离职，我接盘了个垃圾项目，该如何是好？ －－血狼的回答](https://www.zhihu.com/question/49279694/answer/139414734?group_id=801702854334218240) 中，我分享了重构的方法，其中提到了软件打log的方法是第一步，也有不少朋友在评论中问打log的原则。

本文适用范围：Linux系统

使用语言：C/C++

打log的原则：

1. 异常分支或错误处理一定要打log

2. 重大操作时一定要打log，下面打log场景会讲述

log格式的原则： 

1. 时间戳必须有,最好能够精确到微秒。精确到秒的时间戳，相信很多人都熟悉，这能够确认问题的时间和系统uptime的对比，能够进一步还原问题的场景。至于到微秒，在多线程程序下，如果进程停止响应，可以从日志时间看是否死锁。

一般格式：

`[2017－01－09 12：16：30.541]
`

2.打log位置的文件名和代码行数。这个不用说，用于定位问题根源。其实最重要是防止扯皮。因为程序员大多喜欢copy-paste，如果你不加文件名和行数，某程序员copy了你的代码，修改了点，出错了，到时候把你拉下水。

一般格式：

`[2017－01－09 12：16：30.541][network.c:541]
`

3. 有进程id。有些log机制在进程重启时，不会重新生成一个日志文件，而是直接在同一个日志文件后面添加日志。或者，有时候同一程序的多个进程同时运行，可能也会写入到同一个日志文件。

一般格式：

`[2017－01－09 12：16：30.541][network.c:541][pid=15529]
`

 4.有线程id。在多线程程序，如果不加线程id，很难追溯程序的行为

一般格式：

`[2017－01－09 12：16：30.541][network.c:541][pid=15529][thread=0x12345]`

 5.有日志的级别。日志是反映问题的，有不同紧急程序的问题，自然有不同的日志级别。一般采用Error，Warning，Info，Debug。定义不同级别，也可以方便在日志查找问题来源。

一般格式：

`[2017－01－09 12：16：30.541][network.c:541][pid=15529][thread=0x12345][Error]
`

打log的场景：

1. 申请内存时，失败的话，要把申请大小打印出来。以前我申请内存失败也是简单地打印：

`[2017－01－09 12：16：30.541][network.c:541][pid=15529][thread=0x12345][Error]Failed to allocate memory
`

后来在重构时遇到一个问题：进程跑的时间一久，大概一天多，别的程序向它发消息都会收到失败响应，在日志里就是一大堆内存失败的消息"Failed to allocate memory"。用"free"命令来看，物理内存还有好几G空闲，而用“top”命令来看，该进程也只是占700M内存。当时我就怀疑是不是内存碎片导致。于是我把申请内存的大小也打印出来，就收到一堆这样的

`[2017－01－09 12：16：30.541][network.c:541][pid=15529][thread=0x12345][Error]Failed to allocate memory of size 65536
[2017－01－09 12：16：30.588][network.c:541][pid=15529][thread=0x12345][Error]Failed to allocate memory of size 1048576
`

当时就看那些代码引用的数据结构，最小也有64K，大的16M都有，基本一个结构包括很多个大数组。当时就把那些数组全改为指针，再进一步申请，代码繁琐了，但这种问题再也不会出现。再看bug系统，原来这个问题存在很多，在其它程序也存在，当时都找不到根因，只是用过一段时间重启进程来解决

2. 函数参数非空判断时，要打印日志。原因不说，看对比：

之前 

`if ( ( pInfo == NULL ) || ( pHandler == NULL ) ) 

```text
{
    log( ERROR, "invalid arguments" );
}
```

`

之后

`if ( ( pInfo == NULL ) || ( pHandler == NULL ) ) 

```text
{
    log( ERROR, "invalid arguments:(pInfo, pHandler )=(%p,%p)", 
            pInfo, pHandler );
}
```


`

3.  加载和卸载模块，无论是正常还是异常情况都要打印。毕竟这些操作大多都是一次性操作。对性能影响不大。

`[2017－01－09 12：16：30.588][modules.c:54][pid=15529][thread=0x12345][Error]Failed to load module libftp.so, error=module already loaded
`

4.  操作文件目录时，失败要把文件名和错误码打印出来。如

`[2017－01－09 12：16：30.588][config.c:120][pid=15529][thread=0x12345][Error]Failed to open file conf/ftp.xml, errno=(13:Permission denied)
`

假设这个错误导致进程初始化失败，且环境在客户那边，维护人员就可以确认并自己解决这个问题。

5. 操作socket时，把IP，端口号或路径名（Unix socket ）和错误码打印出来。如

`[2017－01－09 12：16：30.588][network.c:541][pid=15529][thread=0x12345][Error]Failed to connect to host (10.17.128.10:9981), errno=(111:Connection refused)`

假设在客户环境出错，维护人员可以根据日志来确认10.17.128.10这台机器是否在线，是否开启了相应的服务，或者服务是开启了，可能只是端口配置错了（这种情况是扯皮最多的）

6. 操作数据库时，把相应操作的IP，端口，库，用户名，sql语句和错误打印出来。如

`[2017－01－09 12：16：30.588][dbmgr.c:781][pid=15529][thread=0x12345][Error]user tiger failed to operate in host (10.17.128.10:3365) with db test, sql="select * from users", error="no table users exists"
`

在客户环境下，维护人员可以通过命令行来验证这些问题，来确定问题。可能有人会考虑安全性，毕竟在日志中把IP，端口，库，用户名都暴露出来了，这样好像不妥。但如果是从事过通信行业的网上问题维护，就知道，可维护性比这种细节的安全性还要重要。

 7.   创建新进程时，需要把程序名,参数和错误码打印出来。如

`[2017－01－09 12：16：30.588][process.c:154][pid=15529][thread=0x12345][Error]failed to execute program "iptables -L", errno=(2:No such file or directory)
`

往往在客户环境，由于运维人员水平参差不齐，可能误操作或漏操作，导致文件缺失或权限出错，这种错误在公司的模拟环境根本不会出现。如果日志够详细，能够减少很多工作量。

8. 解析文件时，需要把文件名，字段，行号打印出来。如

`[2017－01－09 12：16：30.588][config.c:120][pid=15529][thread=0x12345][Error]Failed to parse file conf/ftp.xml, line:20, tag  is not closed
`

结语：上面的原则，基本是每一条是血的教训。以前在H时见得太多因为日志不全导致的麻烦，前方的客户经理不断向客户恳求宽限时间，维护人员不断地在客户环境找出蛛丝马迹，后方领导也不断地调配资源来跟踪问题，后方测试人员不断地测试，尝试问题复现，后方开发人员就不断地看代码。在Z也见过因为日志不全，导致被客户罚钱次数过多，整个产品都亏损了。像@帝都铁匠

  说的“感觉学会log，程序就算入门了”。
