---
title: "ARM L2 cache RAM"
date: "2025-02-05 00:00:00"
updated: "2025-02-05 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/ARM-L2-cache-RAM/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/21286535032"
---


<strong>cache控制器包括</strong>

- cache控制逻辑（AXI slave，AXI master，RAM接口控制器，write buffer，eviction buffer，write allocate buffer，中断，时钟复位系统）
- data RAM
- tag RAM
- data parity RAM
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_dda5dfbd12a5.jpg)

<strong>MBIST support</strong>![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_b5dd47d6d390.jpg)

<strong>cache的floorplanning规划图</strong>

为获得最佳性能: 对数据RAM存储器进行分区，使其占据一半的平面图，标签存储器位于右下角 使标准单元可放置区域的长宽比尽可能接近1:1

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_a70a94d8b01f.jpg)

<strong>数据RAM存储的优势</strong>

对于具有高时钟频率和大L2缓存的设计，时序收敛是困难的，尤其是对于数据RAM。这种系统需要高RAM latencies，这降低了系统的性能。

为了抵消这种影响，可以将data RAM分成四个banks。 该特性支持对data RAM的流水线访问。  

下图分别显示了以不同banks为目标的两次连续读取以下列编程延迟处理时，banking的优势: 

- 数据RAM建立延迟= 2个周期，编程值= 0x1 
- 数据RAM读取延迟= 4个周期，编程值= 0x3
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_83be8c039974.jpg)

<strong>Data RAM without banking</strong>

 图2-9所示的data RAM被组织成n路256位宽的连续存储器， 其中n是8或16。它支持以下访问: 

- 8字数据读取 
- 256位数据写入，带字节使能控制 
- 用于line分配的8 words数据写入。
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4b4d49045572.jpg)

<strong>Data RAM with banking</strong>

data RAM划分为四个banks时。这使得流水线流访问成为可能。系统通过地址的位[6:5]选择banks，参见表2-19。 

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_543ab2eacdfa.jpg)

 图2-10显示了系统将数据RAM组织成4banks 的n路256位宽的连续存储器，其中n为8或16。

该配置支持以下访问: 

- 8字数据读取 
- 256位数据写入，带字节使能控制 
- 用于line分配的8字数据写入
![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_367abae15e69.jpg)

<strong>Data parity RAM without banking</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_239ef9746c21.jpg)

<strong>Data parity RAM with banking</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_2fb6f0717692.jpg)

<strong>Tag RAM</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_43785358b10f.jpg)

tag RAM的组织结构如下: 

- 根据路的大小，地址标签最多18位。 
- 1位用于安全信息。 
- 1位表示有效信息。 
- 1位用于脏信息。 
- 1个可选位用于锁定信息。 
- 1个可选奇偶校验位。 
- NS位对于非安全数据取值1，对于安全数据取值0。
其中，根据路的大小，地址标签最多18位。RAM总线使用（与data ram相关的<strong>DATAADDR总线</strong>，和与Tag RAM相关的<strong>TAGADDR和TAGRDn/TAGWD总线</strong>）与高速缓存关联性和路大小，主要涉及：Data RAM usage with or without banking和Tag RAM usage。

<strong>对于Data RAM usage with or without banking</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_0074dcd9da1f.jpg)

对于8路，way字段是[16:14]。 

位[13:0]的使用取决于way的大小: 

- 16KB路大小: 位[13:9]保持不连接。 位[8:0]是RAM地址总线的最低有效位(LSB)。 
- 32KB路大小: 位[13:10]保持不连接。 位[9:0]是RAM地址总线的LSB。 
- 64KB路大小: 位[13:11]保持不连接。 位[10:0]是RAM地址总线的LSB。 
- 128KB路大小: 位[13:12]保持不连接。 位[11:0]是RAM地址总线的LSB。 
- 256KB路大小: 位[13]保持不连接。 位[12:0]是RAM地址总线的LSB。 
- 512KB路大小: 使用所有[13:0]位。 
数据总线的所有位，DATARD和DATAWD，总是连接的

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_4642e176a63c.jpg)

对于8路，way字段是[14:12]。 

位[11:0]的使用取决于路的大小: 

- 16KB路大小: 位[11:7]保持不连接。 位[6:0]是RAM地址总线的LSB。 
- 32KB路大小: 位[11:8]保持不连接。 位[7:0]是RAM地址总线的LSB。 
- 64KB路大小: 位[11:9]保持不连接。 位[8:0]是RAM地址总线的LSB。 
- 128KB路大小: 位[11:10]保持不连接。 位[9:0]是RAM地址总线的LSB。 
- 256KB路大小: 位[11]保持不连接。 位[10:0]是RAM地址总线的LSB。 
- 512KB路大小: 使用所有[11:0]位。 
数据总线的所有位(DATARD和DATAWD)始终相连。

<strong>对于Tag RAM usage</strong>

TAGADDR和TAGRDn/TAGWD总线的使用取决于路的大小: 

- 16KB路大小: TAGADDR的位[13:9]保持不连接。 位[8:0]是RAM地址总线。TAGRDn和的所有位 TAGWD用于数据总线。 
- 32KB路大小: TAGADDR的位[13:10]保持不连接。 位[9:0]是RAM地址总线。 TAGRDn和TAGWD的位[20:1]用于数据总线。 TAGRDn的位[0]必须接低电平。 
- 64KB路大小: TAGADDR的位[13:11]保持不连接。 位[10:0]是RAM地址总线。 TAGRDn和TAGWD的位[20:2]用于数据总线。 TAGRDn的位[1:0]必须接低电平。 
- 128KB路大小: TAGADDR的位[13:12]保持不连接。 位[11:0]是RAM地址总线。 TAGRDn和TAGWD的位[20:3]用于数据总线。 TAGRDn的位[2:0]必须接低电平。
-  256KB路大小: TAGADDR的位[13]保持不连接。 TAGRDn和TAGWD的位[20:4]用于数据总线。 TAGRDn的位[3:0]必须接低电平。 
- 512KB路大小: 所有位[13:0]都是RAM地址总线。 TAGRDn和TAGWD的位[20:5]用于数据总线。 TAGRDn的位[4:0]必须接低电平。  
tag RAM的宽度和TAGADDR的连接取决于所选择way的大小。可以通过写入辅助控制寄存器（Auxiliary Control Register）来改变路的大小。

典型使用模型的一个例子是实现特定的way size，但是使它看起来比实际实现小。为了支持这一点，必须按照如下具体要求实现标记RAM:  

- 连接TAGADDR以支持最大通道尺寸 
- 对应于标签RAM宽度的TAGRDn和TAGWD必须相连，以支持最小的路尺寸。

RAM clocking and latencies

RAM时钟 

如果ram的运行频率低于高速缓存控制器逻辑，则可以使用时钟使能。仅支持整数比率。利用这种方案，tag RAM和data RAM可以以不同的频率运行。表2-20显示了RAM时钟使能及其功能。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_48a9b673ddef.jpg)

<strong>TAGCLKEN，</strong>时钟使能输入，使高速缓存控制器中的tag RAM接口能够与以较低频率计时的tag RAM通信。  

<strong>TAGCLKOUTEN，</strong> 时钟使能输出，用于门控tag RAM的时钟，以节省功耗。当tag RAM的运行频率低于高速缓存控制器逻辑时，使用此信号。  

<strong>TAGCLKOUT，时钟</strong>的门控版本，仅在访问tag RAM时启用。如果tag RAM和高速缓存控制器逻辑以相同的频率运行，使用此时钟。 

<strong>DATACLKEN，</strong> 时钟使能输入，使高速缓存控制器中的data RAM接口能够与以较低频率的data RAM通信。  

<strong>DATACLKOUTEN，</strong>时钟使能输出，用于门控数data RAM的时钟，以节省功耗。当data RAM的运行频率低于高速缓存控制器逻辑时，使用此信号。当有banking时，有四个时钟使能输出，每个bank一个。  

<strong>DATACLKOUT，</strong> 时钟的门控版本，仅在访问data RAM时启用。使用该时钟，数据RAM和高速缓存控制器逻辑以相同的频率运行。当有banking时，存在四个时钟输出，每个bank一个。


第2-32页的图2-16显示了与高速缓存控制器相比，tag RAM以一半的频率运行的例子。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f1f93bd0d76.jpg)

图2-17显示了如何实现tag RAM时钟中使用的不同时钟门控。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_62cb436f71bf.jpg)

RAM延迟 

Programmable RAM latencies使高速缓存控制器能够管理需要几个时钟周期来处理访问的RAM。对于每个RAM，有三种programmable latencies:

- setup 
- read access 
- write access.
setup 延迟是指在RAM时钟边沿之前，RAM控制信号保持有效的周期数。图2-18显示了一个时序图，其中tag ram setup 延迟已被编程为0x1。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_95b47275e95e.jpg)

read access 延迟是指在RAM时钟边沿之后，读取数据变为有效所需的周期数。图2-19显示了一个时序图，其中tag ram读取访问延迟已被编程为0x1

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_19aea610fe46.jpg)

write access延迟是写访问的RAM时钟沿和对应于另一个访问(读或写)的下一个RAM时钟沿之间的最小周期数。图2-20显示了一个时序图，其中标记ram写访问延迟已被编程为0x1。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5036c9b86a5b.jpg)

MBIST support

- MBIST端口一次只能访问一个RAM。  
- data RAM为256位宽，高速缓存控制器上的MBISTDIN和MBISTDOUT总线的大小为64位，因此data RAM的每个索引需要四次读取和四次写入。高速缓存控制器通过使用两个MBISTADDR地址引脚作为data RAM每个索引的双字选择来处理这一问题。  
- MBIST控制器必须能够解决ram的不同延迟。data读取、写入和tag 读取或写入访问都可以设置为不同的访问延迟。  
- 如果存在标签奇偶校验位与标签ram同时测试。奇偶校验位被视为标签数据总线上的额外位。  
MBIST-cache controller-RAM接口连接示意图

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_288aac44449a.jpg)
