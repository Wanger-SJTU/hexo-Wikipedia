---
title: CXL协议 -- 总体架构介绍
date: "2025-06-05 00:00:00"
updated: "2025-06-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/CXL协议-总体架构介绍/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/742496727
---


CXL的全称是Compute Express Link，是一种在<strong>PCIe物理层上构建的缓存一致性系统</strong>。

2019年3月，英特尔牵头颁布了CXL开放互连技术和CXL 1.0规范，旨在解决数据中心内存扩展和性能瓶颈问题。CXL现在已经有几十家的会员，目前CXL协议的版本有1.0/1.1、2.0和3.0/3.1，CXL官网为[https://www.computeexpresslink.org/](https://link.zhihu.com/?target=https%3A//www.computeexpresslink.org/) 。

## 1. CXL介绍

CXL是基于<strong>PCIe 5.0的物理层</strong>发展而来的，CXL支持三种类型的协议，分别为<strong>[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)，CXL.cache和CXL.memory</strong>。

- [http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)用来发现、配置、寄存器访问、错误报告、主机物理地址（Host Physical Address，HPA）查找、中断等。
- CXL.cache用来扩展系统缓存。
- CXL.memory用来扩展系统存储。其中，[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)是必须要支持的，而CXL.cache和CXL.memory是可选支持的。如下图，CXL设备（例如加速器）可以通过CXL连接到主机处理器。

![](https://pic2.zhimg.com/v2-529dbe8458d4de279a664922ccc39a39_r.jpg)CXL 2.0协议支持热插拔、安全增强、持久内存支持、内存错误报告和遥测。CXL 2.0还支持单级switch的多扇出（Fan-out），以及跨多个虚拟层次结构共享设备的能力，包括对内存设备的multi-domain支持。

如下图，每种颜色标识一个虚拟层次结构。其中的MLD是多逻辑设备（Multi-Logic Device），是一个Type 3的设备。

![](https://pica.zhimg.com/v2-b63785a6bb8eb7023f048117faa00c9a_r.jpg)
<strong>2. Flex Bus介绍</strong>
Flex Bus允许在PCIe协议和CXL协议之间进行选择。这个选择发生在链路训练的协议协商期间，并取决于插槽中的设备。

下图是Flex Bus的示意图。在CPU和设备之间可以插入一个或两个可选的Retimer，以延长通道长度。  

![](https://pic4.zhimg.com/v2-2797ed13442d3d034c9e0f3db48a2735_r.jpg)下图中，通过flex bus可将coherent加速器或Smart I/O设备连接到Host处理器。

![](https://pic2.zhimg.com/v2-ec5d247a19f492425bb7dc142ec0bdd9_r.jpg)下图中，通过Flex Bus.CXL来扩展内存系统。

![](https://pic1.zhimg.com/v2-7dbeb1560ddbd2eaf7a3f89f3b6e6bb6_r.jpg)下图显示了CXL下游端口（Downstream Port）支持的连接。

![](https://pic3.zhimg.com/v2-2b4518d366467eb2d9f26d9df5d7599e_r.jpg)
<strong>Flex Bus Link Features</strong>
Flex Bus提供了一种点对点互连，可以传输PCIe协议或CXL动态多协议，以支持I/O、缓存和内存协议。主要的Link属性支持以下特性：

- 原始的PCIe模式，支持PCIe协议的全部功能。
- CXL模式，如CXL协议里所定义的。
- PCIe或CXL模式的配置。
- 在PAM4模式下，信号速率为64GT/s，CXL模式下的降级速率为32GT/s、16GT/s、8GT/s。否则，CXL模式下信令速率为32GT/s，降级速率为16GT/s或8GT/s。
- CXL模式下的链路宽度x16，x8，x4，x2（降级模式）和x1（降级模式）。
- CXL模式下对x4的分叉（Bifurcation）支持。
Flex Bus分层介绍
CXL事务（协议）层分为两个部分：处理[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)的逻辑和处理CXL.cache/CXL.mem的逻辑。CXL链路层以相同的方式细分。

如下图所示，[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)近似PCIe协议的事务层和链路层，但是<strong>CXL.cache和CXL.mem走的是单独的事务层与链路层（这是CXL延迟低的原因之一）</strong>。CXL ARB/MUX接口将来自两个通路的流量交织。

![](https://picx.zhimg.com/v2-33d8135ae01b35f8589c25b07d093eff_r.jpg)此外，CXL可以选择是否实现PCIe事务层和数据链路层，如果实现，则允许分别与[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)事务层和链路层聚合。作为链路训练过程的结果，事务层和链路层可以配置为在PCIe模式或CXL模式下运行。Flex Bus物理层的逻辑子块是一个融合的逻辑物理层，它可以在PCIe模式或CXL模式下运行，这取决于链路训练期间的模式协商的结果。

## 3. CXL系统架构

CXL支持三种设备类型，如下图。

- Type 1支持CXL.cache和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)；
- Type 2支持CXL.cache，CXL.mem和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)；
- Type 3支持CXL.mem和[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)。[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)是必须要支持的，因为设备的发现，枚举，配置等都是由[http://CXL.io](https://link.zhihu.com/?target=http%3A//CXL.io)来负责的。

![](https://pic2.zhimg.com/v2-b5549726627ab57ca32bd065ef58ee67_r.jpg)不需要使用CXL的场景：<strong>传统的非一致I/O设备</strong>主要依赖标准的生产者-消费者顺序模型，并依赖主机连接的内存。这类设备除了工作提交和工作完成指示以外，很少与主机进行交互。这类加速器倾向于处理大量的数据流，通常不需要使用CXL功能，使用传统的PCIe足以。

CXL Type1设备通常用于网卡这类高速缓存设备；Type2设备通常用于GPGPU；Type3设备通常用于内存缓冲、内存扩展。后续再详细介绍CXL的设备类型和具体协议内容。

参考:

- CXL Specification
- PCI Express Base Specification Revision 6.0
- [CXL学习（一）](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/qdoUez4ggtN8fAmUyr_z8w)