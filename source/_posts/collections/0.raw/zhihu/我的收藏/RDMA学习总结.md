---
title: RDMA学习总结
date: "2025-03-06 00:00:00"
updated: "2025-03-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/RDMA学习总结/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/28133133540
---


RDMA学习总结

涵露

16 人赞同了该文章

原文：https://www.zhihu.com/column/c_1231181516811390976

RDMA基本概念：

基本操作：

send-receive：双边操作，一般用于进行控制信息交互

write-read：单边操作，对端无主动动作，用于大量数据的传输。

RDMA基本服务类型：

可靠性：应答机制(ACK)、数据校验机制（CRC）和保序机制（PSN，Packet Sequence Number，包序号，递增）

连接：每个QP都和另一个远端节点相关联。在这种情况下，QP Context中包含有远端节点的QP信息。在建立通信的过程中，两个节点会交换包括稍后用于通信的QP在内的对端信息。QP Context（简称QPC）可以简单理解为是记录一个QP相关信息的表格。我们知道QP是两个队列，除了这两个队列之外，我们还需要把关于QP的信息记录到一张表里面，这些信息可能包括队列的深度，队列的编号等等

“连接”是如何维护的呢？其实就是在QPC里面的一个记录而已。如果A的QP2想断开与B的QP7的“连接”然后与其他QP相“连接”，只需要修改QPC就可以了。两个节点在建立连接的过程中，会交换稍后用于数据交互的QP Number，然后分别记录在QPC中。

数据报（Datagram）与连接相反，发端和收端间不需要“建立管道”的步骤。对于数据报服务来说，QP不会跟一个唯一的远端节点绑定，而是通过WQE来指定目的节点。和连接类型的服务一样，建立通信的过程也需要两端交换对端信息，但是数据报服务对于每个目的节点都需要执行一次这个交换过程。

四种服务类型：

RC和UD最常用，RC开销大。UD开销小。

RC支持 send-receive和write-read（RDMA操作)

UC只支持 send-receive，不支持RDMA操作。

RDMA之Address Handle：

对于每一个目的节点，本端都会创建一个对应的AH，而同一个AH可以被多个QP共同使用。

RDMA之Queue Pair：

每个QP间都是独立的，彼此通过PD隔离，因此一个QP可以被视为某个用户独占的一种资源，一个用户也可以同时使用多个QP。

QP有很多种服务类型，包括RC、UD、RD和UC等，所有的源QP和目的QP必须为同一种类型才能进行数据交互。

IB协议将QP称为“虚拟接口”

QPC全称是Queue Pair Context，用于存储QP相关属性。QPC主要是给硬件看的，也会用来在软硬件之间同步QP的信息。硬件其实只需要知道QPC的地址0x12350000就可以了，因为它可以解析QPC的内容，从而得知QP的位置，QP序号，QP大小等等信息。进而就能找到QP，知道应该取第几个WQE去处理。

QPN:

QPN，就是每个QP的编号。IB协议中规定用24个bit来表示QPN，QP0,1有特殊用途，为预留编号。

用户接口：

控制面接口：QP作为RDMA技术中最重要的一种资源，在生命周期上与链表并无二致：

数据面接口：

数据面上，一个QP对上层的接口其实只有两种，分别用于向QP中填写发送和接收请求。这里的“发送”和“接收”并不是指的发送和接收数据，而是指的是一次通信过程的“发起方”（Requestor）和“接收方”（Responser）。在行为上都是软件向QP中填写一个WQE（对应用层来说叫WR），请求硬件执行一个动作。所以这两种行为都叫做“Post XXX Request”的形式，即下发XXX请求。

完成错误：

IB协议中有三种错误类型，立即错误（immediate error）、完成错误（Completion Error）以及异步错误（Asynchronous Errors)。

立即错误的是“立即停止当前操作，并返回错误给上层用户”；（用户在Post Send时传入了非法的操作码，比如想在UD的时候使用RDMA WRITE操作）

完成错误指的是“通过CQE将错误信息返回给上层用户”；（完成错误是硬件通过在CQE中填写错误码来实现上报的，如用户下发了一个WQE，操作类型为SEND，但是长时间没有受到对方的ACK。因为WQE已经到达了硬件，所以硬件会产生对应的CQE，CQE中包含超时未响应的错误详情）

而异步错误指的是“通过中断事件的方式上报给上层用户”（用户态下发了多个WQE，所以硬件会产生多个CQE，但是软件一直没有从CQ中取走CQE，导致CQ溢出）

CQE的两种对上层的接口方式，分别是poll和notify，对应着轮询和中断模式。

SRQ:

商用情况QP的数量是可能达到十万级甚至更高的，对内存容量提出了很高的要求

ROCEv2 报文格式

RoCE v2固定UDP端口号是4791

Soft-RoCE就是把本来应该卸载到硬件的封包和解析工作，又拿到软件来做。其本身是基于Linux内核的TCP/IP协议栈实现的，网卡本身并不感知收发的数据包是RoCE报文，其驱动程序按照IB规范中的报文格式将用户数据封装成IB传输层报文，然后把报文整体当做数据填入Socket Buffer当中，由网卡进行下一步收发包处理。

下面这张图取自IBTA对于Soft-RoCE的介绍文章[1]，左边是需要硬件的普通RoCE，右边是Soft-RoCE。可以看出普通RoCE是把协议栈卸载到RoCE NIC网卡实现的，而Soft-RoCE则是在软件协议栈中实现的。

如何建立链接?

“建立连接”指的是两端进行必须的协商和准备工作，掌握了彼此的信息，从而能够互相收发信息；这里和RC服务中的建立一对一关系是两个概念。UC也需要建立连接。UD和RC服务类型的差异在于，对端的信息不是通过“控制路径”固定填入QPC中的，而是用户在“数据路径”中，也就是在Post Send过程中通过WR指定的。

对于RC服务来说，QPC中不仅记录着关于本端QP的信息，还记录着跟这个QP对端QP的信息。而QPC中的对端信息，是通过Modify QP的Verbs接口实现的。

对端信息，是在RC的Modify QP或者UD的Post Send之前，通过建链流程获取的。

从用户接口来区分，RDMA的应用程序常用的建链方式有基于Socket API和基于CM（Communication Manager/Management）两种。

通过Socket连接交换信息内容：

GID：可以通过方法转换为IP地址

通过GID + QPN的组合，我们就能在网络中唯一确定一个QP

Q_key : 安全性校验使用

socket建连时，交换信息使用TCP来完成。要求节点使用的Infiniband网卡支持TCP/IP，或者部署有另外一块传统以太网卡。

通过Socket连接做同步：

程序中可能还有一些时间点需要做同步，这取决于具体的逻辑。我们也可以通过合理安排交换QP建链信息的时机来实现同步

CM建连过程：

Infiniband协议的网卡可以直接使用的QP间建链方式呢？有，那就是大名鼎鼎的CM。CM是RDMA技术中专门用来在QP之间建立连接的机制，它有一套专属的报文格式、交互流程和用户接口。

CM在作为协议时的全称为Communication Management Protocol，即通信管理协议。它指的是一种建立于Infiniband/RoCE协议基础之上的建链方式。

协议分层：

对于一般的RDMA网卡来说，上图中Verbs API下面的所有协议层次，都是硬件实现的。

编辑于 2025-03-06 16:29・江苏
RDMA

​赞同 16​​添加评论​48 ​喜欢​分享

​申请转载​​

未登录用户

还没有评论，发表第一个评论吧

关于作者

涵露

回答
0
文章
16
关注者
11

​关注​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器504 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费329 万热
伊朗最新局势314 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷256 万
中将军衔很厉害吗247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

Vivado的RTL分析（RTL analysis）、综合（Synthesis）和实现（Implementation）的区别？
孤独的单刀发表于FPGA设...

RDMA 基本概念与 Verbs API
RDMA 介绍RDMA 即 Remote Direct Memory Access，概念与 DMA 技术类似，是一种绕过远程主机 OS Kernel 访问内存数据的技术。 传统 TCP/IP 网络在高并发 AI 训练中存在三大痛点： CPU 消耗高…

Kai-nothinking

干货｜STL容器和算法
作者：以上为参赛名单233 链接： https://blog.nowcoder.net/n/b47b3f93789844b0a64432fac51886bf来源：牛客网 容器即物之所在。容器是STL的核心部件之一，是迭代器的依附，是算法作用的目…

牛客竞赛发表于信息学竞赛...

RDMA技术-UEC规范（二）
## 1. UE 传输配置文件UET 指定了三种配置文件：AI Base、AI Full 和 HPC。AI Base 配置文件旨在提供当前和未来 AI 应用所需的功能，这些应用需要以最低成本实现高性能。AI Full 配置文件增加…


math