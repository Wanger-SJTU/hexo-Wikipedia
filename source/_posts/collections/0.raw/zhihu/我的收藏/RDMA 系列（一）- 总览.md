---
title: RDMA 系列（一）- 总览
date: "2023-11-25 00:00:00"
updated: "2023-11-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/RDMA-系列(一)-总览/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/668265698
---


RDMA 系列（一）- 总览

进击的Bruce

高性能计算/高速网络/机器学习系统-爱好者

收录于 · RDMA   高速网络

202 人赞同了该文章

​目录

*本文特别感谢Savir 的专栏提供的图片*

RDMA 及其基本概念

RDMA(Remote Direct Memory Access)，就是对远端进行类似DMA的操作。
常规的DMA是pcie device 与 host 或者 pcie device 与 pcie device 在机器之间的通信，而RDMA 则还会经过网络，是网络本端设备对远端设备的访问。
做一个类比：Pcie P2P 走的是pcie 协议，rdma 走的是网络协议（IB，ETH），当然了我们不能忘记device 和 host的交互，这一部分都是PCIE 协议的通路，所用管理结构也是类似的。如下图就是最基本的wq、cq 交互关系，这在pcie dma 和 rdma 上是统一的。

当然RDMA 也有一个很明显的既不同于eth socket接口，也不同于一般的dma 的实现，就是rdma的数据通路可以完全跑在用户态（当然也可以完全跑在内核态），省去了用户态内核态交互的逻辑，之所以可以这么做，是因为rdma 使用了MTT，硬件内可以自己通过虚拟地址翻译找到物理地址，从而进行数据搬运。这里就减少了CPU 做地址转换的工作，而在一般的dma里这一部分工作来自于内核的sglist 的接口实现。
RDMA 在一开始就注册了并pin住了自己需要的主机内存（控制路径），数据面传输不再需要pin/翻译这些操作，而dma 和socket需要数据传输时做这些操作，所以它们无法绕过内核态，而rdma 可以做到。

而将一切重操作放到控制面，数据面大量简化的后果就是，控制面链路拉长，成为了一个痛点。

Rdma Vs DPDK
rdma 和 dpdk 都是为提高性能而产生的技术，二者之间有什么异同点呢？

相同点：

- 均为kernel by pass技术，减少中断次数，消除内核态用户态copy不同点：

- dpdk 将协议处理移到用户态，rdma 下沉到硬件，所以dpdk 依旧消耗CPU，而rdma 是offload cpu
- DPDK 依旧使用传统的tcp/udp 报文，RDMA 则是专用的IB/roce报文
- DPDK 的并发能力取决于CPU 核数，RDMA 取决于网卡硬件能力
- DPDK 在workload 较低时，会造成CPU 空转，RDMA 不会必然空转，取决于用户设计，理论上可以消除空转
- DPDK 可以自主定义协议栈，RDMA 的协议栈被硬件硬化不可软件自定义，由于硬件卸载协议，所以很多特性eth 有（CPU 跑协议栈），rdma 不容易支持，比如vxlan、ipsec等等
QP 状态

Eth nic 是无状态的（状态控制在协议栈，nic只管收发包），而rdma 网卡有状态，这也是一个巨大的差别，加大了设计难度，也引入了虚拟化下迁移难的问题。

服务类型

RC和UD 可以类比TCP和UDP的差别。

RC - 面向连接、保序、错误0容忍，使用较多

UD - 数据报、乱序、错误可容忍（不是所有error 都会导致断链-qp error），CM建联必须支持

Rocev2 以及RDMA实现簇

IB 最早是超级计算机集群出来的，后面为了兼容数据中心的场景，就提出了面向eth的roce/rocev2。创新上，17年以前都是IB的创新，17年后，roce和数据中心的创新issue一直保持高的水平，IB就变少了很多。所以rocev2 目前看是大势所趋。Iwarp 由于性能问题，使用不多。

RDMA 报文格式 以及上线难题

RDMA 总体来说，没有一个统一的标准报文格式，在总体上rocev2提供了一个基本的格式（面向Eth），但是BTH的格式千差万别，比如mlx 和 博通的格式不一致。
这就导致了RDMA 不同设计（不同板卡）之间，很难友好互通，例如CC 的相关的flag 各厂商没有完全公开，所以不同板卡之间CC策略无法兼容，可能在规模测试中陷入网络拥塞。
比如mlx 的BTH 有60+的bit 和CC 相关，但是另一厂商的网卡不认识这些flag，甚至会以自己的模式解析数据，这显然在CC上是不可互相理解的。
所以目前来说，rdma 上线都是集群上线，很难单机器上线，就是因为rdma报文解析兼容性问题，集群内nic对报文的关键字段必须理解一致。

RDMA 基本元素

Context 

一个rdma 运行环境上下文的记录

MR、PD

MR：memory region
PD：protection domain
PD 是对mr 在进程级别的一次隔离，当前byterdma 全局只有一个PD，所以没有做进程间MR的硬件访问隔离。

除了最基本的两个概念，还有一个memory window的概念，是更小单元的mem 块，用于wqe 间的mem 隔离。

QP、SQ、RQ
QP：queue  pair
SQ：senq queue
RQ：receive queue

CQ
CQ：completion queue
一个CQ 可以绑定给多个qp

SRQ

SRQ：share receive queue

EQ

Event queue，事件队列，包括许多类型和层级，比如srq error，qp error、device error、cq error 等等
OPcode
以下是需要支持的opcode，也就是通信原语

建联
建联有两种：一种是cm 带内建联(需要支持UD），一种是socket 带外（nic）建联，下图展示了socket 建联下的执行路径。

RDMA 与以太网协议栈之关系

主要体现在 modify_qp 以及 bonding、路径load balancing上
modift_qp 需要访问ARP获得mac地址，因为毕竟要封装eth的报文；
bonding会bond eth 设备，连带影响附加在eth 设备上的ib 设备；
Load balancing，方便感知路由表情况改变发送端口和进行负载均衡；

RDMA 调用框架

User 路径：GDR，一般用法
Kernel：NVMEOf 

RDMA的网络异常类型

- 丢包
- Rnr
- Ecn
- Pfc pause
RDMA 的几个cache 及其问题

Mtt cache -  mr 大小/数量和mr 访问延迟的权衡
Rq cache - 为了prefetch rq wqe，减少一次pcie 延迟
Wqe cache - CC 限速下，wqe 可能被硬件丢掉，该cache 可以减少一次pcie 延迟
Qpc cache - qp 数量 和 pcie 延迟的权衡
核心问题：
cache 一般是全局共享的，很难group qp或者单qp 隔离。
导致 rdma 资源隔离很难，而虚拟化对资源隔离很重视，所以目前虚机虚拟化还没有好的方案

CQ、RQ与系统资源

CQ 模式

CQ 本身有两种形式：Poll cq 或者 notify_cq
poll_cq 业务侧场景常见是一条线程busy poll cq，延迟低、性能高，utilization 大，存储类轻计算重传输用
notify_cq 是事件通知模式，用户控制需不需要上报cqe，延迟高但是cpu utilization小，AI 类重计算不那么care 传输可靠性用。

CQ 的share 特性

CQ 是需要用户poll 的，如果多个qp 的cq 互相独立，poll cq的io 切换开销比较大；
所以share cq本身就是一个减少中断、减少用户io的必要特性。
RNR 和流控问题
RQ 最大的问题在于RNR，所以流控问题在于如何保证recv/send 的场景下，rq wqe 需要保证满rq 填充。
为了减少RQ 交互消耗，SRQ 可以同时绑定多个qp，用户可以对SRQ 直接发信息

RDMA 的痛点问题

- Go-back-n，丢一个包就重传该包以后的所有包，拥塞情况下加重网络拥塞
- CC 不灵活，目前做在硬件里，但是不能完全覆盖所有业务场景，客制化能力弱，mlx也实现了PCC
- Pfc 问题，牺牲者流、deadlock、风暴等等RDMA/RoCE
- 安全特性不支持，比如IPsec
- 兼容性问题- 不支持和其他协议灵活互转，于是出现了SRC企图一统IB TCP
- 热迁移等虚拟化问题
- 控制面链路长
- 引入BTH 的header size，导致带宽降低，带宽= IB Payload/MTU * throught_limit_of_mac
- IB payload = MTU - ETH header - IP Header - UDP Header - BTH - ICRC - FCS
- 厂商问题：mlx 一家独大，ofed 包模块与内核标准模块不兼容
RDMA 虚机虚拟化尝试

目前来说，RDMA 在服务的创新，主要有成果的在容器和云原生方面，虚机虚拟化成果寥寥。
问题在于资源隔离比较困难。
但是在另一个虚拟化方面，网络虚拟化，也就是虚拟网络，是有成果的。
华为曾经有一个maxq的实现，当时由于rdma 网卡不支持vxlan，所以虚拟网络比较麻烦，为此他们实现了机制通过软件实现rdma 下虚拟网络的功能，后来mlx 硬件实现了rdma 下的vxlan，这个方案就作废了。mlx 由于在nic侧卸载了ovs，所以vxlan 就可以支持上，所以本质是硬件卸载更多的协议栈。

近年来RDMA上的创新
包括但不限于

扩展性：for lossy net
eRDMA，xrdma，flor -alibaba
SRD - AWS

PFC问题的克服

Bytetunning -  控制PFC watermark不要过载，PFC侧治理rdma 网络问题

云原生场景 
Freeflow - tencent，减少控制面路径
MgrOS - Eth Zurich，热迁移问题
rFaas - microsoft，rdma as a Faas，核心是完全用rdma 换掉一般faas 常用的rpc

虚拟化

Maxq - 华为，vxlan 方向
Pvrdma - vmware
Mlx - ovs 卸载，支持vxlan

编程范式

RMA，MPI-3 - verbs 之上的分布式服务接口模型，Microsoft、google、Eth Zurich
1RMA 协议（google）就是来源于这一种编程范式

其他协议兼容性

SRC

路由

Adaptive routing, 等一些新的load balancing

编辑于 2023-11-25 10:49・北京
RDMA

​赞同 202​​9 条评论​800 ​51 ​分享

​申请转载​​

未登录用户

9 条评论

默认
最新

owen

哈哈，总结的不错

2024-04-24 · 内蒙古

​回复​喜欢

0xff

"兼容性问题- 不支持和其他协议灵活互转，于是出现了SRC企图一统IB TCP"，SRC是说SMC-R吧？

2024-02-19 · 北京

​回复​喜欢

进击的Bruce

作者

是的，卧槽，打错字了
2024-02-19 · 北京

​回复​喜欢

bigRedHat

你好，请问一下在notify_cq模式下，是要依靠硬件上中断的方式告诉驱动有CQ event吗，还有上层应用在调用get_cq_event的时候，驱动是去哪里找可用的cq传上去的
2024-01-28 · 浙江

​回复​喜欢

进击的Bruce

作者

硬件告知事件，event模式就是硬件告知的，软件是被动通知的，否则就是软件主动poll了，notify 的完整流程是：硬件发中断告知软件，软件在中断流程里通知comp channel（一个event fd)，由此用户侧eventfd被唤醒，开始调poll cq获得cqe，get cq event就是read event fd，你可以理解成epoll那种block过程
2024-01-28 · 北京

​回复​喜欢

森林的森

请问一下，这个跟Savir 的RDMA文章有什么关系吗

2024-01-23 · 山东

​回复​喜欢

进击的Bruce

作者

进击的Bruce

-纠正，有些概念的图是从savir盗的，有一些是我画了补充的，概念都很通用实在不想自己画一遍，可以理解为我懒
2024-01-28 · 北京

​回复​喜欢

进击的Bruce

作者

这个嘛，图是从savir大佬那边盗来的，我文章一开始说了，我一开始也是看savir大佬的专栏，结合我工作的感知自己写的一篇总览式的吧，savir那个我总感觉缺乏总体软件的视角也没有其他同类的比较
2024-01-28 · 北京

​回复​喜欢

努力有肉吃

关注，学起
2023-12-16 · 广东

​回复​喜欢

关于作者

进击的Bruce
高性能计算/高速网络/机器学习系统-爱好者

回答
14
文章
31
关注者
4,968

​关注他​发私信

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

拆解RDMA的麻雀—— RDMA核心技术理解入门篇
## 1. 导语本文主要通过一个具体的程序示例，详细拆解RDMA访问远端主机内存的过程。并透过和TCP/IP访问通路的详细对比，具体解释RDMA 的四大核心技术：内核旁路、零拷贝、CPU 卸载和直接访问，…


曼殊

RDMA简单入门
前言在AI训练、推理、HPC高性能计算和分布式存储等高速发展的时代，独立计算机中运行的进程间相互通信已经满足不了需求，如GPU并行计算Scale-out扩展等分布式计算和存储场景，需要在多台计…

Andy

RDMA技术之RoCE v2
概叙 什么是RDMA？RDMA(Remote Direct Memory Access)，全称远端内存直接访问技术，可以在极少占用CPU的情况下，把数据从一台服务器传输到另一台服务器，或从存储到服务器。 传统应用要发送…

KevinBee

RDMA技术详解（一）：RDMA概述
## 1. DMA和RDMA概念1.1 DMADMA(直接内存访问)是一种能力，允许在计算机主板上的设备直接把数据发送到内存中去，数据搬运不需要CPU的参与。 传统内存访问需要通过CPU进行数据copy来移动数据，…


Master.TJ