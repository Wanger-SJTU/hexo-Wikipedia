---
title: 怎么理解linux内核栈？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/怎么理解linux内核栈/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/57013926/answer/3003437934
---


### 前文列表

- <strong>[《Linux 实现原理 — 虚拟内存技术》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485309%26idx%3D1%26sn%3D3b27fb079771820a687ad3a6c54a4032%26chksm%3Dead33758dda4be4e4e03ba9e977d6de6624e60659fa055566d3bc553aed1647eac23a53942ae%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — 大页内存》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485337%26idx%3D1%26sn%3D8179c80a0d22a039ed064b59608b832d%26chksm%3Dead337bcdda4beaaa6bec65f8a46befc68c1fdf1813fc3aa7afd1a6ea5e010148ddce182827c%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — 内存分配算法》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485370%26idx%3D1%26sn%3Dd9347492753a4533e4e257c748274caa%26chksm%3Dead3379fdda4be8954a1de314baa62665db3c2f59e61b8cddc3d33096506ca182804fc955da6%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — 进程、线程、内核线程、轻量级进程、协程》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485328%26idx%3D1%26sn%3D91532d1a388326ac2840878511a6a7fc%26chksm%3Dead337b5dda4bea3e5b50c145b3adfef31ab3463820ff81f9e72906225a5ad6d49d8fd27f2ca%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — 进程调度与策略配置》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485359%26idx%3D1%26sn%3D42c3562514704790f1cd9d3d38b3606a%26chksm%3Dead3378adda4be9cc6a9c2c2558504b04392e0226fb2955c753203e2bbc553f2d61a8b784428%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — NUMA 多核架构中的多线程调度开销与性能优化》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485383%26idx%3D1%26sn%3D921ad2b6e79fa2f30510bd12356b860b%26chksm%3Dead337e2dda4bef4f9f156345c2a44d8430ead411d2c5872fb9ff33ec7cc4ca40c3fba286291%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>
- <strong>[《Linux 实现原理 — I/O 处理流程与优化手段》](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzI3MDM0NjU3MA%3D%3D%26mid%3D2247485421%26idx%3D1%26sn%3Da2abaebc5337565fc1fae5aab7e7d6e0%26chksm%3Dead337c8dda4bede90061f05c1cdf2539df6e819593120672d3ebc8d4e2433e350819c178dd1%26token%3D81463320%26lang%3Dzh_CN%26scene%3D21%23wechat_redirect)</strong>

### Linux 内核协议栈分层架构

- <strong>驱动程序层（Physical device hardware）</strong>：提供连接硬件设备的各种软件接口。
- <strong>设备接口层（Device agnostic interface）</strong>：提供驱动程序的各种抽象接口。作为驱动层和协议层之间的中间层，提供无关具体设备的统一接口定义。
- <strong>网络协议层（Network protocols）</strong>：提供 L3-4 TCP/IP 网络协议的具体实现。例如：ARP、IP、ICMP、TCP 等。
- <strong>协议接口层（Protocol agnostic interface）</strong>：也称为 BSD Socket API 层，本质是 SCI（系统调用接口）的一部分，向上层应用程序提供各种网络编程接口。作为协议层和应用层之间的中间层，提供无关具体协议的统一 Socket 接口定义。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_1a26c8156870.jpg)![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_18032caa0e5f.webp)

### 报文处理流程概览

### 跨主机收发报文概览

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_eab0d510ea7e.jpg)

### 本地收发报文概览

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_7f43f404658b.jpg)

### 协议栈实现概览

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_13542e0712e2.jpg)

### 内核协议栈关键技术

### DMA

DMA（Direct Memory Access，直接内存访问）是一种硬件实现的外设 I/O 技术。

在 DMA 技术出现之前，NIC 和 CPU 之间的 Frames（二层数据帧）收发依赖 CPU 先从 NIC Rx/Tx queue 逐个 Copy 到 Kernel space，然后再从 Kernel space 中 Copy 到 User space，单向两次 CPU Copy 的方式，非常消耗资源。

DMA 技术出现后，NIC 增加了 DMA Control 功能，并将 NIC Rx/Tx queue 与 Main Memory 中的 ZONE_DMA 建立直接映射关系。当 Frames 进入 NIC Rx/Tx queue 之后，就会直接被 DMA Controller Copy 到 ZONE_DMA，这一次 Copy 完全不需要 CPU 的参与。并且由于 ZONE_DMA 是一块物理映射区，所以 Kernel space 也可以直接访问。

DMA 技术在单向的外设 I/O 的流程中，减少了一次 CPU Copy 的工作，也以此减轻了 CPU 的工作负载。

在 32bit Linux 中，ZONE_DMA 默认只有 16MB；而在 64bit Linux 中，ZONE_DMA 默认可以有 4GB，得到了非常大的提升。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_7ce319e53dfe.jpg)

<strong>DMA Controller 的功能</strong>：

- 向 CPU 发出 HOLD（保持）信号，提出 Bus（总线）接管请求。
- 当 CPU 发出允许接管信号后，负责对 Bus 的控制，进入 DMA I/O 模式。
- 通过对 Main Memory 进行寻址以及修改地址指针，实现对 Memory 的读写操作。
- 向 CPU 发出 DMA 结束信号，CPU 恢复正常工作模式。
<strong>DMA 信号类型</strong>：

- DREQ（外设请求信号）：I/O 外设向 DMA Controller 发起请求。
- DACK（DMA 响应信号）：DMA Controller 向 I/O 外设的响应信号
- HRQ/HOLD（DMA 请求信号）：DMA Controller 向 CPU 发出，要求接管 Bus。
- HLDA（CPU 响应信号）：CPU 响应允许 DMA Controller 接管 Bus。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_86474e53d24a.jpg)

### sk_buff 结构体

sk_buff 结构体是 Kernel 定义的一个用于描述 Frame 的数据结构。

Net driver 的初始化流程中包括对 DMA 空间进行初始化，主要的工作就是在 ZONE_DMA 中分配好用于存储 sk_buff 的内存空间。

当 Frame 到达 NIC 后，DMA Controller 就会将 Frame 的数据 Copy 到 sk_buff 结构体中，以此来完成 Frame => sk_buff 数据格式的封装。在后续的流程中，sk_buff 还会从 ZONE_DMA Copy 到 Kernel Socket Receive Buffer 中，等待 Application 接收。

```text
struct igb_ring {
```

...
 union {
...

```text
  /* RX */
  struct {
   struct sk_buff *skb;
   struct igb_rx_queue_stats rx_stats;
   struct u64_stats_sync rx_syncp;
  };
```

...

```text
}
```


sk_buff 的结构体定义如下图所示，它包含了一个 Frame 的 Interface（网络接口）、Protocol（协议类型）、Headers（协议头）指针、Data（业务数据）指针等信息。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_9df0b0ebead0.jpg)

值得留意的是，在 Kernel 中，一个 Frame 的 Headers 和 Payload 可能是分开存放到不同内存块种的。有以下几点原因：

- <strong>两者具有不同的特征和用途</strong>：Headers 包含了网络协议的元数据信息，而 Payload 包含了 Application 的业务信息。
- <strong>两者具有不同的大小和格式</strong>：Headers 的格式通常是标准的，而且数据量比 Payload 小的多。
- <strong>两者具有不同的处理逻辑</strong>：Headers 需要被快速识别、分析和校验，而 Payload 则需要被快速的传输和存储。
分开存储和处理的方式，可以有效提高网络传输的效率和可靠性。

同时，sk_buff 是一个双向链表数据结构，支持链表操作。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_36221c6b47dc.jpg)

### Net driver Rx/Tx Ring Buffer

Net driver 实现了 2 个 Ring Buffer 用于数据报文的收发处理。

Ring queue 是高性能数据包处理场景中常见的数据结构，它将 Buffer 内存空间设计成一个首尾相连的环。当 Buffer 空间溢满后，新来的 Frames 会从头开始存放，而不是为其分配新的内存空间。相较于传统的 FIFO queue 数据结构，Ring queue 可以避免频繁的内存分配和数据复制，从而提高传输效率。此外还具有缓存友好、易于并行处理等优势。

值得注意的是，Rx/Tx Ring Buffer 中存储的是 sk_buff 的 Descriptor，而不是 sk_buff 本身，本质是一个指针，也称为 Packet Descriptor。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_a267be3ca0ea.jpg)

Packet Descriptor 有 Ready 和 Used 这 2 种状态。初始时 Descriptor 指向一个预先分配好且是空的 sk_buff 空间，处在 Ready 状态。当有 Frame 到达时，DMA Controller 从 Rx Ring Buffer 中按顺序找到下一个 Ready 的 Descriptor，将 Frame 的数据 Copy 到该 Descriptor 指向的 sk_buff 空间中，最后标记为 Used 状态。

这样设计的原因是 Rx/Tx Ring Buffer 作为 I/O 控制单元，不应该持有太多数据量。数据传输由 DMA 实现会非常快，而 Ring Buffer 也只需要记录相应的指针即可。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_702abe05ba0c.jpg)

### Buffer Descriptor Table

Rx/Tx Ring Buffer 的具体实现为一张 Buffer Descriptor Table（BDT）。

BDT 是一个 Table 数据结构，拥有多个 Entries，每条 Entry 都对应了 Ring Buffer 中的一个 Rx/Tx Desc，它们记录了存放 sk_buff 的入口地址、长度以及状态标志位。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_2b90e36750a2.jpg)

- <strong>收包时</strong>：DMA Controller 搜索 Rx BDT，取出空闲的 DB Entry，将 Frame 存放到 Entry 指向的 sk_buff，修改 Entry 为 Ready。然后 DBT 指针下移一项。
- <strong>发包时</strong>：DMA Controller 搜索 Tx BDT，取出状态为 Ready 的 DB Entry 所指向的 sk_buff 并转化为 Frame 发送出去。然后 DBT 指针下移一项。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_af179510dbe1.jpg)

### NAPI 收包机制

NAPI（New API）是一种 “中断 + 轮训” 收包机制，相较于传统的单一中断（硬中断 + 软中断）收包的方式效率更高。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4b3624eb05f5.jpg)

NAPI 的工作流程如下：

- Net driver 初始化流程中，注册 NAPI 收包机制所必须的 poll() 函数到 ksoftirqd（软中断处理）内核线程。
- Frame 到达 NIC；
- DMA Controller 写入 sk_buff；
- NIC Controller 发起硬中断，进入 Net driver 的 napi_schedule() 硬中断处理函数，然后将一个 napi_struct 结构体加入到 poll_queue（NAPI 软中断队列）中。此时 NIC Controller 立即禁用了硬中断，开始切换到 NAPI “轮训“ 收包工作模式。
- 再进入 raise_softirq_irqoff(NET_RX_SOFTIRQ) 软中断处理程序，唤醒 NAPI 子系统，新建 ksoftirqd 内核线程。
- ksoftirqd 线程调用 Net driver 注册的 poll() 函数。
- poll() 调用 netif_receive_skb() 开始从 sk_buff 空间中收包，并将它传递给网络协议栈进行处理。
- 直到一段时间内没有 Frame 到达为止，关闭 ksoftirqd 内核线程，NIC Controller 重新切换到 NAPI “中断” 收包工作模式。
在具体的实现中，poll() 会轮训检查 BDT Entries 的状态，如果发现当前 BDT 指针指向的 Entry Ready，则将该 Entry 对应的 sk_buff 取出来，并恢复该 Entry 的空闲状态。

可见，和传统方式相比，NAPI 一次中断就可以接收多个包，因此可以减少硬件中断的数量。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_f9dcc0b02a47.jpg)

### 网卡多队列

在以往，一张 NIC 只会提供一组 HW Rx/Tx Ring queue，对应一个 CPU 来进行处理。在多核时代，NIC 也相应的提供了 Multi-Queue 功能，可以将多个 Queue 通过硬中断绑定到不同的 CPU Cores 上处理。

以 Intel 82575 为例。

- <strong>在硬件层面</strong>：它拥有 4 组硬件队列，它们的硬中断分别绑定到 4 个 Core 上，并通过 RSS（Receive Side Scaling）技术实现负载均衡。RSS 技术通过 HASH Packet Header IP 4-tuple（srcIP、srcPort、dstIP、dstPort），将同一条 Flow 总是送到相同的队列，从而避免了报文乱序问题。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4796c79487d4.jpg)


- 在软件层面**：Linux Kernel v2.6.21 开始支持网卡多队列特性。在 Net driver 初始化流程中，Kernel 获悉 Net device 所支持的硬件队列数量。然后结合 CPU Cores 的数量，通过 Sum=Min(NIC queue, CPU core) 公式计算得出应该被激活 Sum 个硬件队列，并申请 Sum 个中断号，分配给激活的每个队列。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_56c28da90876.jpg)

如上图所示，当某个硬件队列收到 Frames 时，就触发相应的硬中断，收到中断的 CPU Core 就中断处理任务下发给该 Core 的 NET_RX_SOFTIRQ 实例处理（每个 Core 都有一个 NET_RX_SOFTIRQ 实例）。

在 NET_RX_SOFTIRQ 中调用 NAPI 的收包接口，将 Frames 收到具有多个 netdev_queue 的 net_device 结构体中。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4c240edc9241.jpg)

### 内核协议栈收包/发包流程概览

- <strong>收包流程</strong>：
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_2b229dac2c4d.jpg)


- 发包流程**：
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_9f08b7abd5d7.jpg)


### 内核协议栈收包流程详解

### 驱动程序层（数据链路层）

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4d33fe956a96.jpg)

- NIC Controller 接收到高低电信号，表示 Frame 到达。PHY 芯片首先将电信号转换为比特流，然后 MAC 芯片再将比特流转换为 Frame 格式。
- DMA Controller 将 Frame Copy 到 Rx Ring Buffer 中的一个 Rx Desc 指向的 sk_buff 空间。
- DMA Controller 更新相应的 BD Entry 状态为 Ready，并将 BDT 指针下移一项。
- NIC Controller  给 CPU 的相关引脚上触发一个电压变化，硬中断 CPU。每个硬中断都对应一个中断号，CPU 开始收包硬中断处理程序。硬中断处理程序由 Kernel 回调 Net driver 具体实现的注册函数，根据是否开启了 NAPI 有两条不同的执行路径。
- 以 NAPI 模式为例，Net driver 执行 napi_schedule() 硬中断处理函数，然后将一个 napi 结构体加入到 poll_queue（NAPI 软中断队列）中。此时 NIC Controller 立即禁用了硬中断，开始切换到 “NAPI 轮训“ 收包工作模式。
- 再进入 raise_softirq_irqoff() 软中断处理程序，唤醒 NAPI 子系统，新建 ksoftirqd 内核线程。
- ksoftirqd 线程调用 Net driver 注册的 poll() 函数。

```text
// linux/drivers/net/ethernet/intel/igb/igb_main.c

/**
 *  igb_poll - NAPI Rx polling callback
 *  @napi: napi polling structure
 *  @budget: count of how many packets we should handle
```

/

```cpp
static int igb_poll(struct napi_struct *napi, int budget)
{
```

...

```cpp
 if (q_vector->tx.ring)
  clean_complete = igb_clean_tx_irq(q_vector, budget);

 if (q_vector->rx.ring) {
  int cleaned = igb_clean_rx_irq(q_vector, budget);
```

...

```text
}
```


- poll() 调用 netif_receive_skb() 开始从 sk_buff 空间中收包，并将它传递给 TCP/IP 网络协议栈进行处理。

```cpp
// linux/net/core/dev.c

int netif_receive_skb(struct sk_buff *skb)
{
 int ret;
```


 trace_netif_receive_skb_entry(skb);

 ret = netif_receive_skb_internal(skb);
 trace_netif_receive_skb_exit(ret);

```text
 return ret;
}
```


- 直到一段时间内没有 Frame 到达为止，关闭 ksoftirqd 内核线程，NIC Controller 重新切换到硬中断收包工作模式。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_9d03b40c0b62.jpg)

#### VLAN 协议族

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_29d62f03db8b.jpg)

#### Linux Bridge 子系统

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_831f94feccbf.jpg)

### 网络协议层（L3 子系统）

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_aa8f14443d51.jpg)

- Net driver 调用 netif_receive_skb() 将 sk_buff 从 ZONE_DMA Ring Buffer 中取出并交给 TCP/IP 协议栈处理的过程中，首先会根据 sk_buff 内层 Header 的 Protocol Type 选择相应的处理函数，如果是 IP 协议，则调用 ip_rcv() 进行处理。
![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_362289a132dd.jpg)

- ip_rcv() 首先会解析 IP Header，根据 srcIP 和 dstIP 进入路由子系统处理流程。如果 dstIP 是本机地址，则根据内层 Header 的 Protocol Type 选择相应的传输层处理函数。UDP 对应 udp_rcv()、TCP 对应 tcp_rcv()、ICMP 对应 icmp_rcv()、IGMP 对应 igmp_rcv()。

#### ARP 子系统

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_c564b49ba279.jpg)

#### IP 子系统

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_4085aa8d4795.jpg)

### 网络协议层（L4 子系统）

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_3f2d74e46a2a.jpg)

- 在使用 socket() 创建一个 TCP Socket 之后，Socket 对应的 Sock 结构体会被注册到一个 tcp_prot 全局变量中，并以 tcp_port 作为 Index。
- 当 tcp_rcv() 收到 sk_buff 之后，根据 TCP Header 中的 dstPort 字段索引到相应的 Sock。
- 然后将 sk_buff 加入到该 Sock 的 receive_queue 成员所指向的 Socket Receive Buffer 缓冲队列中，等待 Application 通过 read() 等 SCI 来进行读取。

#### TCP 子系统

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_aa61f7bb41c7.jpg)

### 协议接口层（BSD Socket 层）

当 Application 调用 read() 来进行读取时：

- 首先会根据 socket fd 查询 file inode，并从中得到相应的 Sock 结构体；
- 然后从 Sock 结构体成员 recieve_queue 指向的 Socket Receive Buffer 发起一次 CPU Copy；
- CPU 从用户模式转为内核模式，将数据包从 Kernel space Copy 到 User space。

### 内核协议栈发包流程详解

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_b1a6c1e64b5b.jpg)

以 UDP 数据报为例：

- <strong>协议接口层</strong>：BSD socket 层的 sock_write() 会调用 INET socket 层的 inet_wirte()。INET socket 层会调用具体传输层协议的 write 函数，该函数是通过调用本层的 inet_send() 来实现的，inet_send() 的 UDP 协议对应的函数为 udp_write()。
- <strong>L4 子系统</strong>：udp_write() 调用本层的 udp_sendto() 完成功能。udp_sendto() 完成 sk_buff 结构体相应的设置和 Header 的填写后会调用 udp_send() 来发送数据。而在 udp_send() 中，最后会调用 ip_queue_xmit() 将数据包下放的网络层。
- <strong>L3 子系统</strong>：函数 ip_queue_xmit() 的功能是将数据包进行一系列复杂的操作，比如是检查数据包是否需要分片，是否是多播等一系列检查，最后调用 dev_queue_xmit() 发送数据。
- <strong>驱动程序层</strong>：函数调用会调用具体设备提供的发送函数来发送数据包，e.g. hard_start_xmit(skb, dev)。具体设备的发送函数在协议栈初始化的时候已经设置了。
<strong>- END -</strong>


*关于 “云物互联” 微信公众号：*

*欢迎关注 “云物互联” 微信公众号，我们专注于云计算、云原生、SDN/NFV、边缘计算及 5G 网络技术的发展及应用。热爱开源，拥抱开源！*

技术即沟通

<strong>化云为雨，落地成林</strong>

[发布于 2023-04-27 16:18](//www.zhihu.com/question/57013926/answer/3003437934)・北京

​​685 ​51 ​分享

​​

收起​
