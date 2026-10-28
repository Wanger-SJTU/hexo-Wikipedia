---
title: "ARM架构学习-SMMU(2) Distributed Translation Interface"
date: "2025-05-28 00:00:00"
updated: "2025-05-28 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/ARM架构学习-SMMU(2)-Distributed-Translation-Interface/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/16724045320"
---


前文提到，SMMU在ARM架构中主要承担内存虚拟化的相关功能，具体实现上，一个SMMU一般由多个TBU模块，1个DTI interconnect和1个TCU模块组成，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7dc4275cac5a.jpg)

图1 SMMU系统示例PCIe RP通过LTI接口与TBU交互，主要完成inbound请求的地址翻译业务；同时通过DTI接口与TCU交互，主要完成ATS相关业务。此外，TBU和TCU之间也是通过DTI接口交互。TBU可以简单理解为SMMU的一级cache，TCU是SMMU的二级cache。PCIe发给TBU的地址翻译业务，如果TBU在内部cache中没有找到对应entry，则会通过DTI接口发送请求给TCU，从TCU的cache中查找。当然它们的功能区别不止于此，本文暂不做展开。

本文主要介绍DTI接口，以及TCU与PCIe RP间的业务交互。

DTI全称为Distributed Translation Interface，是ARM定义的用于SMMU架构的point-to-point接口。

DTI的接口协议可以细分为两种：

1） DTI-TBU Protocol，用于TBU和TCU的交互；

2） DTI-ATS Protocol，用于PCIe RP和TCU的交互。

### DTI Protocol Overview

DTI的message可以一共分为以下5种：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f9481dda892e.jpg)

每个DTI message有固定的encoding和长度，且downstream和upstream方向的encoding不同。Downstream表示远离TBU或RC/RP的方向，即TBU或RC/RP发送请求给TCU的方向。Upstream表示发给TBU或RC/RP的请求方向（来自TCU）。

DTI-ATS protocol的downstream message（TBU/RP发给TCU）如下所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4c5f531a1b3c.jpg)

Upstream message（TCU发给TBU/RP）如下所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b5d59a5a4411.jpg)

#### Flow Control

DTI协议采用tokens进行流控。Tokens分为两种：

1） Translation tokens：用于translation request类型的messages；

2） Invalidation tokens：用于invalidation and synchronization类型的messages。

Request messages会消耗tokens，responses messages会返回tokens给requester。所有outstanding的message的ID不能重复，requester只有在收到message的所有response后，才能reuse对应的ID。

#### DTI Connections

DTI channel可能有4种状态：

1） DISCONNECTED：对端（TBU or PCIe RP）处于powered down，此时TCU需要能接收并识别Connect Request；

2） REQ_CONNECT：TBU or PCIe RP发起Connect Request，等待TCU返回response（可能接受或拒绝connection）；

3） CONNECTED：DTI channel处于connected状态，可以发送其它message；

4） REQ_DISCONNECT：TBU or PCIe RP发起Disconnect Request，等待TCU返回response。

DTI channel的connect过程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8e68a71f1bca.jpg)

图2 DTI connect handshake如果TCU配置发现配置异常，可能出现connect deny，如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_122fb426add7.jpg)

图3 DTI Connect Deny当TBU or PCIe RP发起disconnect后（处于REQ_DISCONNECT state），不需要再返回还在处理的（outstanding）的各类message的responses。此时TBU or PCIe RP依然需要能接收来自TCU的新的请求，但是可以直接丢弃，不需要返回responses；

当PCIe EP种的ATS enabled时，DTI channel不能被disconnected；

DTI是点对点的协议，一个TCU可能通过多个DTI channel与多个TBU or PCIe RP对接，每个DTI channel的tokens和message ID独立，channel的states也独立。

各个state下channel可以发送的messages如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_162d2aaeff20.jpg)

基于上表，可以看到在CONNECTED状态下继续发送Connect Request是允许的。

### DTI-ATS Messages

详见DTI Protocol Spec Chapter 5，这里重点讨论与ATS业务相关messages。

#### Connection and disconnection message group

*<strong>DTI_ATS_CONDIS_REQ</strong>*

Connection和disconnection request由PCIe RP发起：

1） 只有在disconnected状态下可以发起connected请求；

2） 只有connected状态下，并且没有正在处理中的请求时，才能发起disconnected请求。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_62a37855e34e.jpg)

图4 DTI_ATS_CONDIS_REQ Message*<strong>DTI_ATS_CONDIS_ACK</strong>*

TCU返回connection/disconnection acknowledgement给PCIe RP。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f7f1d644b70.jpg)

图5 DTI_ATS_CONDIS_ACK
#### Translation request message group

*<strong>DTI_ATS_TRANS_REQ</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4beafb72f311.jpg)

图6 DTI_ATS_TRANS_REQ Message一个ATS translation req要消耗一个translation token，RP只有在至少有一个translation token时才能发送translation req给TCU。

*<strong>DTI_ATS_TRANS_RESP</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_099b56cbaf89.jpg)

图7 DTI_ATS_TRANS_RESP Message每个resp message也相当于返回一个translation token给RP。

ATS Trans Rsp Message与ATS Completion Message的data entry的对应关系如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f32642432cfe.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_504f4877c8fe.jpg)

*<strong>DTI_ATS_TRANS_FAULT</strong>*

用于TCU返回fault response（to a ATS Request）以及translation token给function。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_465efa7a8b92.jpg)

图8 DTI_ATS_TRANS_FAULT Message其中，FAULT_TYPE定义如下所示：：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0d5430515bda.jpg)

当FAULT_TYPE为2’b00时，RP返回给function的completion message中，status为success，但是data中的R和W都为0，其余域段均无效。

当FAULT_TYPE为2’b01或2’b10时，RP返回给function的completion message中，status为对应的Completer Abort (CA)或Unsupported Request (UR)状态，不携带数据。

*<strong>The ATS translation sequence</strong>*

一个完整的ATS translation（inline translation）过程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_83b39fc48fd4.jpg)

图9 Example complete ATS translation sequence in DTI![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_72d35a41ce48.jpg)

RC/RP如果收到的一个ATS translation request中有多个连续的pages，可以选择将ATS request拆分成多个DTI_ATS_TRANS_REQ messages发送给TCU（也可以不拆分），并将TCU返回的多个DTI_ATS_TRANS_RESP messages组合在一起，最后返回一个ATS response给源function。

#### Invalidation and synchronization message group

ATS Invalidation是TCU经RP给EP去invalidate它们的ATC的；

Invalidation SYNC是TCU发给RP确认invalidation已经完成的 。

*<strong>DTI_ATS_INV_REQ</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bc1fd0641643.jpg)

图10 DTI_ATS_INV_REQ Message一个invalidation req消耗一个invalidation token，TCU只有在至少有一个invalidation token时才能发送invalidation req。

OPERATION的类型如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a5f03361ef90.jpg)

与SMMU command的对应如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_55bbaf0c7258.jpg)

Invalidation这里有个特殊的地方，就是如果operation为ATCI_PASID_GLOBAL，ARM建议PCIe RP在将invalidate请求转换为TLP发送给EP时，必须加上一个PASID Prefix，其中的PASID可以固定为0：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6311d9aed2c3.jpg)

*<strong>DTI_ATS_INV_ACK</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5145d92071f1.jpg)

图11 DTI_ATS_INV_ACK Message用于RP返回invalidation token给TCU。

*<strong>DTI_ATS_SYNC_REQ</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d8809a99f6a1.jpg)

图12 DTI_ATS_SYNC_REQ Message即使前面的invalidation requests已经sync过了，TCU也可以继续发sync message，RP/RC不需要报错;

Sync message必须在收到invalidation requests的ack messages之后才能发送；

Sync message必须在前面的sync message都受到ack之后才能发送（sync message的outstanding只能为1）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_27732f6fdaed.jpg)

*<strong>DTI_ATS_SYNC_ACK</strong>*

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aa5e0f4e0cc2.jpg)

图13 DTI_ATS_SYNC_ACK MessageERROR域段指示PCIe是否发生了错误，0表示成功（success），1表示有错误（error）。

*<strong>The DTI-ATS invalidation sequence</strong>*

Invalidation的流程如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_17a78de0e829.jpg)

图14 DTI-ATS invalidation sequence![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fc235adcb434.jpg)

TCU如果收到一个DTI_ATS_SYNC_ACK message，这意味着：

1） 在DTI_ATS_SYNC_ACK对应的DTI_ATS_SYNC_REQ之前发出的所有DTI_ATS_INV_REQ messages的responses都已经从EP返回并收到了；

2） 不会再有对被invalidated的memory空间的访问。

Invalidation请求会消耗DTI channel的invalidation token，RC/RP不需要等到EP返回Invalidation Completion message后才返回DTI_ATS_INV_ACK message给TCU，因为DTI_ATS_INV_ACK message的主要作用是返回invalidation token给TCU用于DTI Channel的流控。

TCU会通过SYNC message来确认invalidation已经全部完成，而RP必须保证在收到全部Invalidation Completion messages后才返回DTI_ATS_SYNC_ACK message给TCU。

如果RC/RP在收到DTI_ATS_SYNC_REQ后又收到新的DTI_ATS_INV_REQ message（还未返回DTI_ATS_SYNC_ACK message给TCU），此时需要：

1） 将对应的invalidation message发送给EP；

2） 在返回DTI_ATS_SYCN_ACK message的时候不需要等待这个后面的invalidation message 的responses。

此外，当EP返回invalidation completion messages给RP时，它只能保证：

1） 跟invalidated memory相关的读请求已经完成；

2） 跟invalidated memory相关的写请求已经发送给了RP，但是EP不知道是否完成（因为没有completion）。

所以，RC/RP必须保证在返回DTI_ATS_SYNC_ACK message给TCU前，相关的写请求已经完成（不会再到TCU/TBU中做地址翻译）。

#### Page request message group

*<strong>DTI_ATS_PAGE_REQ</strong>*

DTI channel上，page request的outstanding只能为1，RP需要等到上一个的DTI_ATS_PAGE_REQ message的ack返回后再发下一个。

只有在connect阶段DTI channel表示支持PRI时（SUP_PRI为1），才可以发送PRI请求。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_23d62a8417f3.jpg)

图15 DTI_ATS_PAGE_REQ MessageSTOP PASID marker为SSV=1，LAST=1，READ=0，WRITE=0.

*<strong>DTI_ATS_PAGE_ACK</strong>*

TCU返回acknowledge给RP，RP收到ack后，可以继续发下一个page req。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7eed69e5f17f.jpg)

图16 DTI_ATS_PAGE_ACK Message*<strong>DTI_ATS_PAGE_RESP</strong>*

Page request的完成response。

Page response message的outstanding也只能为1，必须等待RP返回resp ack后才能发下一个page response message。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c3626637a6e2.jpg)

图17 DTI_ATS_PAGE_RESP MessageResponse code的含义如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5bdc83b5185c.jpg)

ResponseFailure指示TCU侧有系统异常，无法再正常响应page request；

InvalidRequest指示page group中至少有一个page的映射过程（或者叫page-in）有异常。

如果原始的Page Req携带了PASID，那么page response应该也会携带对应的PASID，

*<strong>DTI_ATS_PAGE_RESPACK</strong>*

Resp ack是RP发给TCU的，响应page resp的message。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e1c30b909353.jpg)

图18 DTI_ATS_PAGE_RESPACK Message
### DTI Transport Layer

 DTI的transport layer或者说接口，是基于AXI4-Stream的，但是DTI protocol不支持interleaving。

一个DTI interface包含两个方向的AXI4-Stream interfaces。具体的信号用法描述如下：
 
 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b80514234a2c.jpg)