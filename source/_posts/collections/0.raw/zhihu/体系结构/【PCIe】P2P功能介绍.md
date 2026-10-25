---
title: 【PCIe】P2P功能介绍
date: "2023-11-01 00:00:00"
updated: "2023-11-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/【PCIe】P2P功能介绍/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/664434389
---


1 P2P概述
P2P简称Peer-to-Peer，即点对点， PCIe P2P， 即一个EP设备直接访问另外一个EP设备。

PCIe p2p功能在SPEC中没有明确的capability定义，实质上是由PCIe路由规则而决定；例如地址路由，通过bridge设备的mem window来判断如何路由mem request，TLP的地址如果在bridge的mem window中，则TLP向bridge的下一级转发，否则向上转发。

![](https://picx.zhimg.com/v2-582808555b8d13f50ef226139352ce85_r.jpg)P2P通信带来的收益 

1. 减少了主存DRAM的使用 

2.缩短了通信路径，提升了数据传输的效率。

2 P2P DMA
docs: linux-5.14/Documentation/driver-api/pci/p2pdma.rst

[PCI Peer-to-Peer DMA Support](https://link.zhihu.com/?target=https%3A//www.kernel.org/doc/html/next/driver-api/pci/p2pdma.html)

code: drivers/pci/p2pdma.c

内核定义了host bridge支持p2p DMA的白名单

static const struct pci_p2pdma_whitelist_entry {
    unsigned short vendor;
    unsigned short device;
    enum {
        REQ_SAME_HOST_BRIDGE    = 1 << 0,
    } flags;
} pci_p2pdma_whitelist[] = {
/* Intel Xeon E5/Core i7 */
    {PCI_VENDOR_ID_INTEL,   0x3c00, REQ_SAME_HOST_BRIDGE},
    {PCI_VENDOR_ID_INTEL,   0x3c01, REQ_SAME_HOST_BRIDGE},
/* Intel Xeon E7 v3/Xeon E5 v3/Core i7 */
    {PCI_VENDOR_ID_INTEL,   0x2f00, REQ_SAME_HOST_BRIDGE},
    {PCI_VENDOR_ID_INTEL,   0x2f01, REQ_SAME_HOST_BRIDGE},
/* Intel SkyLake-E */
    {PCI_VENDOR_ID_INTEL,   0x2030, 0},
    {PCI_VENDOR_ID_INTEL,   0x2031, 0},
    {PCI_VENDOR_ID_INTEL,   0x2032, 0},
    {PCI_VENDOR_ID_INTEL,   0x2033, 0},
    {PCI_VENDOR_ID_INTEL,   0x2020, 0},
    {}
};

内核提供了接口来判断两个设备是否具有p2p DMA 能力，如下：
int pci_p2pdma_distance_many(struct pci_dev *provider, struct device **clients, int num_clients, bool verbose)

PCIe Switch或host bridge的PCIe ACS capability中p2p RR、CR、EC的配置会影响p2p request，如果配置了p2p redirect，p2p request会转发到RC，则可能受到IOMMU的影响。

#define  PCI_ACS_RR     0x0004  /* P2P Request Redirect */
#define  PCI_ACS_CR     0x0008  /* P2P Completion Redirect */
#define  PCI_ACS_EC     0x0020  /* P2P Egress Control */

/*
 * Check if a PCI bridge has its ACS redirection bits set to redirect P2P
 * TLPs upstream via ACS. Returns 1 if the packets will be redirected
 * upstream, 0 otherwise.
 */
static int pci_bridge_has_acs_redir(struct pci_dev *pdev)
{
    int pos;
    u16 ctrl;

    pos = pdev->acs_cap;
    if (!pos)
        return 0;

    pci_read_config_word(pdev, pos + PCI_ACS_CTRL, &ctrl);

    if (ctrl & (PCI_ACS_RR | PCI_ACS_CR | PCI_ACS_EC))
        return 1;

    return 0;
}

![](https://pic2.zhimg.com/v2-6c0fbdb9197fea5f4795cd06e697b20b_r.jpg)
![](https://picx.zhimg.com/v2-a4a41f2ea37cff659f03bf3e7af83b6d_r.jpg)**ref:**

p2p功能开启，以及白名单

[pci p2p - _备忘录 - 博客园](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/10087622blog/p/17745805.html)

[coolboy：PCIe P2P](https://zhuanlan.zhihu.com/p/386153789)

NCB-PCI_Express_Base_6.0.pdf