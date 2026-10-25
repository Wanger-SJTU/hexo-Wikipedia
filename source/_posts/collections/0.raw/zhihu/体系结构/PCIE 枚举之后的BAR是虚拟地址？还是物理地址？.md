---
title: PCIE 枚举之后的BAR是虚拟地址？还是物理地址？
date: "2026-04-21 00:00:00"
updated: "2026-04-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/PCIE-枚举之后的BAR是虚拟地址-还是物理地址/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/524121501/answer/1995758802314736519
---


硬件工程师宝典

作为硬件工程师，深耕服务器计算机硬件架构设计20年。

​ 关注

0，引言
在上一篇文章《PCIe从入门到精通之十七：PCIe设备的初始化枚举过程1》中，我们介绍了PCIe设备的初始化枚举过程一些概念.这一篇我们将具体介绍PCIe设备的初始化枚举一步一步的动态过程，以及Primary Bus Number Register， Secondary Bus Number Register 和Subordinate Bus Number Register的值如何确定。

这一篇内容有点多，请大家耐心看完，看完后对PCIe体系的拓扑和tree的结构会了如指掌。

所有PCIe主题的文章都会收录在

《深入浅出聊PCIe》mp.weixin.qq.com/mp/appmsgalbum?__biz=MzU3NDY3OTA2Nw== action=getalbum album_id=4142016342255960068#wechat_redirect
合集里，欢迎评阅。

需要下载PCIe学习资料标准的朋友（pdf格式），请关注本微信公众号“硬件工程师宝典”，在对话框内回复“PCIe”，将获取标准下载链接。

一， PCIe 体系架构

1， PCIe 体系架构的物理原型

PCIe体系架构在没有初始化之前如下图一所示。图中所有的设备都没有bus number和device number。

图一、PCIe 体系架构的物理原型

图中有以下三类PCIe设备：位于CPU的PCIe Root Complex（包含Host Bridge, RCiEP0~N和Root Port0~2），Endpoint0，PCIe Switch0，PCIe Switch01以及挂载在Switch下的PCIe Endpoint设备SSD0~5。Root Complex包含有Virtual PCI-PCI bridge0/1/6和"上游端口"Downstream Root port0/1/2； PCIe Switch包含Virtual PCI-PCI bridge2/3/4/5和Virtual PCI-PCI bridge7/8/9/10以及"上游端口"（Upstream Port）和"下游端口"（Downstream Port）。

2， 初始化完成后的Bus Number 分布

图二是初始化完成后的Bus Number 分布，我们先对此有个预览，下面一节我们将具体介绍PCIe设备的初始化枚举一步一步的动态过程，以及Primary Bus Number Register， Secondary Bus Number Register 和Subordinate Bus Number Register如何确定。

图二、初始化完成后的Bus Number 分布

二， PCIe设备的初始化枚举动态过程

1， 从HOST bridge开始初始化Virtual PCI-PCI Bridge 0

第一步，PCIe Host bridge主桥扫描Bus 0上的设备（在一个PCIe体系结构中，一般将Root complex中与Host Bridge直接相连接的PCIe总线命名为PCIe Bus 0），系统BIOS首先会忽略Bus 0上的Root Complex Integrated Endpoint(RCIEP)和RCEC等不会挂接PCIe bridge的设备，Host bridge发现Virtual PCI-PCI Bridge 0和Root port0后，将Virtual PCI-PCI Bridge 0 下面的PCIe Bus定为 Bus 1，系统将初始化Virtual PCI-PCI Bridge 0的配置空间，并将该桥的Primary Bus Number(PB)和 Secondary Bus Number(SB)寄存器分别设置成0和1，以表明Virtual PCI-PCI Bridge 0的上游总线是0，下游总线是1，由于还无法确定Virtual PCI-PCI Bridge 0下挂载设备的具体情况，系统BIOS不知道整个下游总线范围的上限，先暂时将Subordinate Bus Number(Sub)设为0xFF（最大值）。

即：Virtual PCI-PCI Bridge 0的PB=0；SB=1；Sub=0xFF;如图三所示。

图三、Bus 1枚举过程

第二步，系统BIOS开始扫描Bus 1，将会发现有且只有一个Endpoint 0，没有其它Bus，下游总线范围的上限Subordinate Bus Number也是1。

即：Virtual PCI-PCI Bridge 0的PB=0；SB=1；Sub=1;如图四所示。

当一个Virtual PCI-PCI Bridge的SB和Sub相等时，表面下面不在挂载有Virtual PCI-PCI Bridge，PCIe Bus扫描结束。BUS=1至此，系统BIOS完成了对Bus 0的扫描和枚举。

图四、Bus 1枚举完成

2， 返回HOST bridge开始初始化Virtual PCI-PCI Bridge 1

在PCIe初始化和枚举过程中采用深度优先遍历算法：

深度优先遍历： 分配完Virtual PCI-PCI Bridge 0的Bus Number后，枚举软件会立即进入新创建的次总线（即Virtual PCI-PCI Bridge 0的下游），继续对其进行枚举，然后再返回到上游总线，从Virtual PCI-PCI Bridge 1继续搜索。

在第一步中对Virtual PCI-PCI Bridge 0搜索完毕，系统会回到HOST bridge，接下来第二步对Virtual PCI-PCI Bridge 1和Root port1进行搜索。系统扫描到Virtual PCI-PCI Bridge 1，并将其下面直接连接的Bus分配为PCIe Bus2. 系统将初始化Virtual PCI-PCI Bridge 1的配置空间，并将该桥的Primary Bus Number(PB)和 Secondary Bus Number(SB)寄存器分别设置成0和2，以表明Virtual PCI-PCI Bridge 1的上游总线是0，下游总线是2，由于还无法确定Virtual PCI-PCI Bridge 1下挂载所有设备的具体情况，系统BIOS不知道整个下游总线范围的上限，先暂时将Subordinate Bus Number(Sub)设为0xFF（最大值）。

即Virtual PCI-PCI Bridge 1的PB=0；SB=2；Sub=0xFF;如图五所示。

图五、PCIe Switch0下的Virtual PCI-PCI Bridge 3枚举完成

系统继续扫描Bus 2，将会发现PCIe Switch0，并对PCIe Switch0的upstream port和Virtual PCI-PCI Bridge 2进行扫描，将其下面直接连接的Bus分配为PCIe Bus3. 并将该桥的Primary Bus Number(PB)和 Secondary Bus Number(SB)寄存器分别设置成2和3. 由于还无法确定Virtual PCI-PCI Bridge 2下挂载设备的具体情况，Subordinate Bus Number(Sub)还是设为0xFF（最大值）。

继续深度优先遍历，继续扫描，系统会先发现PCIe Switch0的Virtual PCI-PCI Bridge 3和upstream port，下面挂载的NVMe SSD0设备，系统将Virtual PCI-PCI Bridge 3下面的PCIe Bus定为Bus 4，并将该桥的Primary Bus Number 和 Secondary Bus Number寄存器分别设置成3和4，因为Virtual PCI-PCI Bridge 3下面挂的是端点设备（叶子节点），下面不会再有下游总线了，因此Virtual PCI-PCI Bridge 3的Subordinate Bus Number的值可以确定为4。

即Virtual PCI-PCI Bridge 2的PB=2；SB=3；Sub=0xFF;如图五所示。

即Virtual PCI-PCI Bridge 3的PB=3；SB=4；Sub=4;如图五所示。

至此，PCIe Switch0下的Virtual PCI-PCI Bridge 3所有bus和device都扫描完成。但是PCIe Switch0下的Virtual PCI-PCI Bridge 4和Virtual PCI-PCI Bridge 5还没有完成，系统BIOS将返回PCIe Switch0下的Virtual PCI-PCI Bridge2，继续进行深度优先遍历。紧接着PCIe Switch0下的Virtual PCI-PCI Bridge 4和Virtual PCI-PCI Bridge 5被发现，并被初始化。Virtual PCI-PCI Bridge 4下的bus被分配为bus 5，Virtual PCI-PCI Bridge 5下的bus被分配为bus 6。至此PCIe Switch0下的所有bus都被枚举，Subordinate Bus Number(Sub)的最大值被确定为6。之前默认为0xFF的Subordinate Bus Number(Sub)可以最终更新为6.

即Virtual PCI-PCI Bridge 1：PB=0；SB=2；Sub=6;如图六所示。

即Virtual PCI-PCI Bridge 2：PB=2；SB=3；Sub=6;如图六所示。

即Virtual PCI-PCI Bridge 3：PB=3；SB=4；Sub=4;如图六所示。

即Virtual PCI-PCI Bridge 4：PB=3；SB=5；Sub=5;如图六所示。

即Virtual PCI-PCI Bridge 5：PB=3；SB=6；Sub=6;如图六所示。

图六、PCIe Switch0下的所有bus枚举完成

3， 返回HOST bridge开始初始化Virtual PCI-PCI Bridge 6

第三步和第二步高度相似，在第二步对Virtual PCI-PCI Bridge 1和Root port1进行搜索并扫描分配Bus number完毕后，系统BIOS会回到HOST bridge，侦测到Virtual PCI-PCI Bridge6和Root port2，并将其下面直接连接的Bus分配为PCIe Bus7. 系统将初始化Virtual PCI-PCI Bridge 2的配置空间，并将该桥的Primary Bus Number(PB)和 Secondary Bus Number(SB)寄存器分别设置成0和7，以表明Virtual PCI-PCI Bridge 1的上游总线是0，下游总线是7，由于还无法确定Virtual PCI-PCI Bridge 6下挂载所有设备的具体情况，系统BIOS不知道整个下游总线范围的上限，先暂时将Subordinate Bus Number(Sub)设为0xFF（最大值）。

即Virtual PCI-PCI Bridge 6的PB=0；SB=7；Sub=0xFF;如图七所示。

图七、PCIe Switch1下的Virtual PCI-PCI Bridge 3枚举完成

系统继续扫描Bus 7，将会发现PCIe Switch1，并对PCIe Switch1的upstream port和Virtual PCI-PCI Bridge 7进行扫描，并将其下面直接连接的Bus分配为PCIe Bus8. 并将该桥的Primary Bus Number(PB)和 Secondary Bus Number(SB)寄存器分别设置成7和8. 由于还无法确定Virtual PCI-PCI Bridge 7下挂载设备的具体情况，Subordinate Bus Number(Sub)还是设为0xFF（最大值）。

继续深度优先遍历，继续扫描，系统会先发现PCIe Switch1的Virtual PCI-PCI Bridge 8和upstream port，下面挂载的NVMe SSD3设备，系统将Virtual PCI-PCI Bridge 8下面的PCIe Bus定为Bus 9，并将该桥的Primary Bus Number 和 Secondary Bus Number寄存器分别设置成8和9，因为Virtual PCI-PCI Bridge 8下面挂的是端点设备（叶子节点），下面不会再有下游总线了，因此Virtual PCI-PCI Bridge 8的Subordinate Bus Number的值可以确定为9。

即Virtual PCI-PCI Bridge 7的PB=7；SB=8；Sub=0xFF;如图七所示。

即Virtual PCI-PCI Bridge 8的PB=8；SB=9；Sub=9;如图七所示。

至此，PCIe Switch1下的Virtual PCI-PCI Bridge 8所有bus和device都扫描完成。但是PCIe Switch1下的Virtual PCI-PCI Bridge 9和Virtual PCI-PCI Bridge 10还没有完成，系统BIOS将继续深度优先遍历。紧接着PCIe Switch1下的Virtual PCI-PCI Bridge 9和Virtual PCI-PCI Bridge 10被发现，并被初始化。Virtual PCI-PCI Bridge 9下的bus被分配为bus 0xa，Virtual PCI-PCI Bridge 10下的bus被分配为bus 0xb。至此PCIe Switch1下的所有bus都被枚举，Subordinate Bus Number(Sub)的最大值被确定为0xb。之前默认为0xFF的Subordinate Bus Number(Sub)可以最终更新为0xb.

即Virtual PCI-PCI Bridge 6的PB=0；SB=7；Sub=0xb;如图八所示。

即Virtual PCI-PCI Bridge 7的PB=7；SB=8；Sub=0xb;如图八所示。

即Virtual PCI-PCI Bridge 8的PB=8；SB=9；Sub=9;如图八所示。

即Virtual PCI-PCI Bridge 9的PB=8；SB=0xa；Sub=0xa;如图八所示。

即Virtual PCI-PCI Bridge 10的PB=8；SB=0xb；Sub=0xb;如图八所示。

图八、PCIe Switch1下的所有bus枚举完成

至此，系统BIOS完成了对该CPU下的PCIe体系内所有的Bus的扫描和编号。枚举过程结束，Host通过这一过程获得了一个完整的PCIe设备拓扑结构和tree。

三，抛砖引玉

在这一章中我们具体介绍了PCIe设备的初始化枚举一步一步的动态过程，以及Primary Bus Number Register， Secondary Bus Number Register 和Subordinate Bus Number Register的值如何确定。

下一章我们将举例对PCIe设备的初始化枚举过程进行实战。

敬请关注下一篇：《PCIe从入门到精通之十九：利用lspci对PCIe设备拓扑结构解析实战1》

四，参考文献：

需要以下参考文献（PCIe标准）的朋友，请关注本微信公众号“硬件工程师宝典”，在对话框内回复“PCIe”，将获取标准下载链接。

百度网盘分享的文件

阅读全文​
​赞同 38​​5 条评论​194 ​4 ​分享