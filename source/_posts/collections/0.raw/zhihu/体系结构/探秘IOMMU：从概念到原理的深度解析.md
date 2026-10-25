---
title: "探秘IOMMU：从概念到原理的深度解析"
date: "2025-01-13 00:00:00"
updated: "2025-01-13 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/探秘IOMMU-从概念到原理的深度解析/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/18100038357"
---


在计算机系统的复杂架构中，有许多关键组件在幕后默默运行，保障着系统的稳定与高效，IOMMU 便是其中之一。或许对于不少人来说，IOMMU 这个名字还稍显陌生，但它却在 I/O 设备与内存交互的关键环节中扮演着举足轻重的角色。它就像一位幕后的调度大师，精准地协调着 I/O 设备对内存的访问，让数据的传输有条不紊地进行。从它诞生的那一刻起，就致力于解决计算机发展进程中遇到的各种内存访问难题。今天，就让我们一起走进 IOMMU 的世界，从最基础的概念出发，逐步深入到其底层原理，揭开它神秘的面纱，看看它是如何在计算机系统中发挥神奇功效的。

### 一、IOMMU 是什么

IOMMU，全称输入输出内存管理单元（Input - Output Memory Management Unit） ，从名字就能看出，这是个和内存管理密切相关的硬件单元。

为了理解 IOMMU，咱们先聊聊传统的 MMU（内存管理单元）。MMU 大家可能比较熟悉，它的主要职责是将 CPU 可见的虚拟地址转换为物理地址，就像是一个翻译官，让 CPU 能够和内存顺畅 “交流”。而 IOMMU 同样扮演着 “翻译官” 的角色，不过它服务的对象是具有直接存储器访问（DMA）能力的 I/O 总线设备与物理内存之间的通信。I/O 设备发出的地址，我们可以称之为设备可见的虚拟地址（也叫设备地址或 I/O 地址），IOMMU 的任务就是把这些地址准确无误地映射到物理地址上。

打个比方，假设计算机系统是一个庞大的公司，CPU 是公司的核心决策层，内存是仓库，而各种 I/O 设备（如硬盘、网卡等）就是分布在不同地方的员工。MMU 负责把决策层（CPU）的指令地址准确翻译给仓库（内存），而 IOMMU 则是让这些员工（I/O 设备）能够准确找到仓库（内存）中的货物存放位置。

从功能上看，IOMMU 与 MMU 有相似之处，它们都涉及地址的转换。但 MMU 侧重于 CPU 与内存之间的地址映射，而 IOMMU 则专注于连接 I/O 总线与物理内存，使得 I/O 设备在进行 DMA 操作时，能够正确访问物理内存。I/O 设备通过 IOMMU 进行地址转换后访问物理内存，就像员工通过公司内部的物流系统准确地从仓库获取物资，而不需要自己去摸索仓库的复杂布局。

### 二、IOMMU 的由来

IOMMU 的诞生，源于计算机系统发展过程中对 I/O 设备内存访问管理的需求升级 。在早期的计算机系统中，I/O 设备进行 DMA 操作时，直接使用物理地址访问内存，这就带来诸多问题。一方面，随着计算机技术的发展，内存容量不断增大，而一些老设备的寻址能力却十分有限，像 32 位的设备就无法访问高于 4GB 的内存空间。要是系统为其分配了高端内存，这些设备便只能望洋兴叹，无法进行 DMA 操作。

为了解决老设备在大内存系统中的使用问题，曾经采用过一种名为 “bounce buffers” 的方案。简单来说，就是在物理内存底端（32 位设备能访问到的地方）设置缓冲区。当设备需要访问高端内存时，操作系统先将高端内存的数据拷贝到 “bounce buffers”，设备再从这里读取数据；写入数据时则反之。不难想象，这种数据拷贝操作会极大地降低系统性能，尤其是在数据量较大的情况下。

另一方面，传统的 DMA 操作对于内存的连续性要求很高。在实际应用中，要为设备分配大量连续的物理内存，难度极大，这就限制了设备的 DMA 操作效率。

Solaris 在 SPARC 平台上对 IOMMU 的支持，便是很好的例证。早期 Solaris 在 SPARC 平台支持 IOMMU 主要有两个重要原因。一是为了支持老设备，通过 IOMMU 的地址转换功能，使得 32 位的老设备能够顺利访问 64 位系统中的高端内存，避免了 “bounce buffers” 带来的性能损耗 。二是简化 scatter/gather 操作。在网络传输等场景中，网卡驱动在发送数据包时，可能会遇到需要操作多个不连续物理内存区域的情况。在没有 IOMMU 时，每个不连续的物理地址（Solaris 叫 cookie）都需要占用一个发送描述符，这使得设备驱动程序的编写变得复杂，且效率低下。有了 IOMMU 后，系统可以将这些不连续的物理内存映射为一个连续的设备地址，驱动程序只需处理一个 “cookie”，大大简化了设备驱动的开发与管理，提高了系统的整体性能 。

后来走有了IOMMU，这个问题就迎刃而解了。在设备做DMA访问内存的时候，系统返回给设备驱动的不再是物理地址，而是虚拟地址，这个地址一般叫IOVA，设备访问内存时，由IOMMU来将这个虚拟地址转换为物理地址。但是当iommu bypass的时候，设备也可以直接使用物理地址来进行dma。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ce75cc0857e3.jpg)

看到这里大家会看到，这怎么这么像MMU呢？是的，两者都是可以把虚拟地址翻译为物理地址，MMU是将CPU发出的虚拟地址通过页表翻译为物理地址，IOMMU是将设备发出的虚拟地址IOVA通过页表翻译为物理地址。

上面就是IOMMU的一个基本功能:DMA Remapping。IOMMU还有其他的一些功能，例如Interrupt Remapping等。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_13e44b392a5c.jpg)

### 三、IOMMU 的底层原理

IOMMU的核心思想是将物理内存划分为多个区域，每个区域都有一个唯一的ID。这些区域可以是连续的，也可以是不连续的。当CPU需要访问某个内存区域时，IOMMU会将该请求转换为一个虚拟地址，然后将这个虚拟地址与对应的物理地址进行映射。这样，IOMMU是DMA直接内存访问，即设备与内存直接通信，而无需经过CPU。

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_da6efb4af54f.jpg)

<strong>IOMMU的主要组成部分包括：</strong>

- MMU（Memory Management Unit）：负责将物理内存映射到虚拟地址空间。MMU通常包含一个硬件缓存，用于存储虚拟地址到物理地址的映射关系。此外，MMU还可以实现一些高级功能，如内存保护和地址转换。
- IOMMU软件模块：负责管理IOMMU的设置和配置。这通常包括创建和管理内存区域，以及处理来自操作系统的内存访问请求。
- 硬件支持：IOMMU需要硬件的支持才能正常工作。这包括一个支持IOMMU的CPU，以及一个能够识别IOMMU的设备驱动程序。
在现代操作系统中，内存容量通常超过4GB。然而，当设备申请DMA（直接内存访问）时，如果内核为设备分配的DMA缓冲区地址高于4GB（以下简称“高缓冲区”），则设备无法寻址到该缓冲区。为了解决这个问题，IOMMU（输入/输出内存管理单元）技术被引入。

#### 3.1地址转换机制

IOMMU 的核心任务之一就是地址转换，它把设备的 I/O 虚拟地址（IOVA，即设备发出的地址）映射为物理地址 。这一过程与 MMU 的页表机制颇为相似，但又有所不同。在 MMU 中，通过维护进程的页表，将 CPU 使用的虚拟地址转换为物理地址，实现进程之间的内存隔离与管理。而 IOMMU 则是为 I/O 设备提供类似的服务，每个设备或设备组都有自己对应的 I/O 页表。

以 x86 平台为例，当一个 32 位的 PCI 设备需要进行 DMA 操作时，如果它要访问的内存超出了其自身 4GB 的寻址能力（假设系统内存大于 4GB），IOMMU 便开始发挥作用。设备发出的 IOVA 会被 IOMMU 捕获，IOMMU 根据内部的 I/O 页表，将这个 IOVA 翻译为正确的物理地址。比如，系统为设备分配了一段位于 4GB 以上的物理内存，设备本身无法直接访问，但在 IOMMU 的帮助下，设备可以使用一个在其可寻址范围内的 IOVA，IOMMU 将这个 IOVA 准确映射到高端物理内存地址，从而实现设备对大内存的访问 。

#### 3.2内存保护原理

在计算机系统中，内存保护至关重要，IOMMU 在其中扮演着重要角色。恶意的设备驱动程序或者硬件故障，都可能导致设备对内存的非法访问，进而引发系统崩溃、数据泄露等严重问题。比如，恶意的设备驱动程序可能试图读取或写入它不应访问的内存区域，硬件故障可能导致设备发出错误的地址信号，访问到非预期的内存位置。

IOMMU 通过地址映射和权限管理来防止这些问题的发生。在地址映射方面，IOMMU 严格按照设定的 I/O 页表进行地址转换，只有被映射的地址才能被设备访问，这就避免了设备随意访问未授权的内存区域。权限管理上，IOMMU 为每个设备或设备组设置了不同的访问权限，如只读、只写、读写等。例如，一个存储设备可能被设置为只对特定的内存区域有读写权限，而对其他区域则没有任何访问权限，这样即使设备出现故障或者受到恶意攻击，也能最大限度地保障系统内存的安全 。

#### 3.3DMA 重映射原理

DMA 重映射是 IOMMU 的一项关键功能。传统的 DMA 操作要求内存是连续的，这在实际应用中限制很大，因为系统很难为设备分配大量连续的物理内存。有了 IOMMU，情况就大为不同。

IOMMU 可以将非连续的物理内存映射为设备看起来连续的内存区域。假设一个网络设备需要发送大量数据，这些数据存储在多个不连续的物理内存块中。在没有 IOMMU 时，设备驱动需要复杂的操作来处理这些分散的数据块。而有了 IOMMU 后，它可以将这些分散的物理内存块映射为一个连续的 IOVA 空间，设备只需按照这个连续的地址空间进行 DMA 操作，无需关心背后物理内存的实际布局。这不仅极大地方便了设备的操作，还提高了系统内存的利用率和整体性能，使得系统在处理大规模数据传输时更加高效 。

#### 3.4中断重映射原理（可选功能）

中断重映射是 IOMMU 的一个可选功能，在虚拟化场景中尤为重要。在传统的非虚拟化环境下，设备产生的中断信号直接发送到 CPU 的中断控制器，然后由 CPU 进行相应的处理。但在虚拟化环境中，情况变得复杂起来。

当多个虚拟机共享物理设备时，设备的中断信号需要准确地传递到对应的虚拟机中，这就需要 IOMMU 的中断重映射功能。设备产生的中断信号首先会被 IOMMU 捕获，IOMMU 根据预先配置的中断重映射表，将这个中断信号重定向到对应的虚拟机的虚拟中断控制器上。例如，在一个服务器虚拟化环境中，多个虚拟机同时运行不同的应用程序，每个虚拟机都有自己的网卡设备。当某个虚拟机的网卡接收到数据时，网卡产生的中断信号通过 IOMMU 重映射，准确地传递到该虚拟机的虚拟中断控制器，从而确保虚拟机能够及时响应网络数据的到来，保证了虚拟机中应用程序的正常运行 。

### 四、IOMMU 的应用场景

#### 4.1在物理机中的应用

在物理机环境里，IOMMU 是提升设备与内存数据交互效率的关键 。以服务器中的高性能网卡为例，在数据中心的网络通信场景中，网卡需要处理大量的数据传输任务。当网卡进行 DMA 操作向内存写入接收到的网络数据包时，可能会遇到内存地址不连续等问题。有了 IOMMU，它可以将网卡的 I/O 虚拟地址准确映射到物理内存地址，实现高效的数据传输。即便内存中的数据包存储在多个不连续的物理内存块中，IOMMU 通过 DMA 重映射功能，将这些分散的物理内存块映射为网卡可操作的连续地址空间，大大提高了网卡处理数据的效率，减少了数据传输的延迟，确保了网络通信的顺畅。

存储设备也是 IOMMU 的重要应用领域。在企业级存储系统中，硬盘、固态硬盘等存储设备频繁地进行数据的读写操作。IOMMU 通过地址转换和内存保护机制，保障了存储设备对内存的安全访问。例如，在进行大数据量的文件读写时，IOMMU 确保存储设备能够准确地访问到对应的物理内存区域，同时防止设备因错误的地址访问而破坏系统内存中的其他数据。这不仅提高了存储系统的稳定性，还保障了数据的完整性和安全性 。

#### 4.2在虚拟化环境中的应用

在虚拟化环境中，IOMMU 更是发挥着不可或缺的作用，其中设备透传是其重要的应用场景之一 。在云计算中，为了满足用户对高性能计算资源的需求，常常需要将物理机的硬件资源直接分配给虚拟机使用，这就涉及到设备透传技术。

以云服务器中的虚拟机为例，当虚拟机需要使用物理机的 GPU 进行图形渲染、深度学习计算等任务时，IOMMU 通过地址转换和内存保护机制，使得虚拟机中的设备驱动程序可以像在物理机中一样直接访问物理 GPU 的内存，而无需通过宿主机操作系统的多次数据拷贝和地址转换。具体来说，IOMMU 会将虚拟机中设备的 I/O 虚拟地址映射到物理 GPU 对应的物理内存地址上，同时为虚拟机中的设备设置独立的内存访问权限，防止不同虚拟机之间的设备内存访问冲突。这样，虚拟机能够高效地利用物理 GPU 的强大计算能力，大大提升了图形渲染和深度学习等任务的处理速度，为用户提供了接近物理机性能的计算体验 。

此外，在多租户的云计算环境中，IOMMU 的内存保护和隔离功能尤为重要。不同租户的虚拟机运行在同一台物理服务器上，如果没有有效的隔离机制，恶意的虚拟机可能会通过设备访问非法获取其他租户的数据。IOMMU 通过严格的地址映射和权限管理，确保每个虚拟机中的设备只能访问其被分配的内存区域，有效防止了虚拟机之间的恶意攻击和数据泄露，保障了云计算环境中多租户数据的安全性和隐私性 。

### 五、IOMMU 案例分析

由于intel 的iommu 实现得比arm smmv3复杂得多，里面概念也多，所以针对intel 实现的iommu 案例的初始化部分进行一些讲解，本文针对4.19内核。

<strong>Intel IOMMU的初始化函数在哪调用的呢？</strong>

它的初始化函数是：

```cpp
int __init intel_iommu_init(void)
{
	int ret = -ENODEV;
	struct dmar_drhd_unit *drhd;
	struct intel_iommu *iommu;

	/* VT-d is required for a TXT/tboot launch, so enforce that */
	force_on = tboot_force_iommu();
```


<strong>那这个函数是在常见的模块初始化里面调用的么？</strong>

事实上，它的调用链是这样的：

int __init detect_intel_iommu(void)//caq:IOMMU_INIT_POST调用这个，有amd的，ibm大型机的
{//caq:此时还没有memory allocator

```x86asm
	int ret;
	struct dmar_res_callback validate_drhd_cb = {
		.cb[ACPI_DMAR_TYPE_HARDWARE_UNIT] = &dmar_validate_one_drhd,
		.ignore_unhandled = true,
	};

	down_write(&dmar_global_lock);
	ret = dmar_table_detect();//caq:bios/uefi提供的dmar table
	if (!ret)
		ret = dmar_walk_dmar_table((struct acpi_table_dmar *)dmar_tbl,
					   &validate_drhd_cb);
	if (!ret && !no_iommu && !iommu_detected && !dmar_disabled) {
		iommu_detected = 1;//caq:返回正常就设定这个标志位
		/* Make sure ACS will be enabled */
		pci_request_acs();
	}

#ifdef CONFIG_X86
	if (!ret)
		**x86_init.iommu.iommu_init = intel_iommu_init;//caq:pci_iommu_init 会统一执行iommu_init**
#endif

	if (dmar_tbl) {
		acpi_put_table(dmar_tbl);//caq:释放资源
		dmar_tbl = NULL;
	}
	up_write(&dmar_global_lock);

	return ret ? ret : 1;
}
```


<strong>在 detect_intel_iommu 函数中，有一个关键行：</strong>

x86_init.iommu.iommu_init = intel_iommu_init;//caq:pci_iommu_init 会统一执行iommu_init**然后在 pci_iommu_init 会统一执行 iommu_init 。如下：

```cpp
static int __init pci_iommu_init(void)
{
	struct iommu_table_entry *p;

	**x86_init.iommu.iommu_init();//caq:执行前面 detect_intel_iommu 里面对 x86_init.iommu 赋值的指针。**

	for (p = __iommu_table; p flags & IOMMU_DETECTED) && p->late_init)
			p->late_init();
	}

	return 0;
}
```


如下的调用链：

```text
kernel_init ->
	kernel_init_freeable ->
		do_one_initcall ->
			pci_iommu_init ->
				x86_init.iommu.iommu_init
```


以上就是intel 的iommu 初始化调用链分析。

### 六、IOMMU 常见问题

#### 6.1intel怎么管理那么多iommu硬件？

使用一个全局的 dmar_drhd_units 链表来管理对应的iommu硬件，dmar_drhd_unit 的list 成员串接在这个全局链表中。

crash> list -H dmar_drhd_units -s dmar_drhd_unit.segment,devices_cnt
ffff8b83ff078780

```text
  segment = 0
  devices_cnt = 0
```

ffff8b83ff078060

```text
  segment = 0
  devices_cnt = 0
```

ffff8b83ff065680---------管理了三个设备

```text
  segment = 0
  devices_cnt = 3
```

ffff8b83ff078ae0

```text
  segment = 0
  devices_cnt = 0
```

ffff8b83ff078c60

```text
  segment = 0
  devices_cnt = 0
```

ffff8b83ff078480

```text
  segment = 0
  devices_cnt = 0
```

ffff8b83ff072180--------------管理了8个设备

```text
  segment = 0
  devices_cnt = 8
```

ffff8b83ff078240

```text
  segment = 0
  devices_cnt = 0
```


我们可以看到，bios/uefi至少枚举了8个iommu的硬件，其中两个intel_iommu设备 分别管理的3个和8个设备。

#### 6.2是不是devices_cnt就是所有的设备呢？

实际单板上，pci设备就远远不止11个设备，那么其他设备怎么办，devices_cnt 为0，不代表它就不管理设备，相反，还得继续看include_all标志，事实上，这个在如下函数有体现：

```text
struct dmar_drhd_unit *
dmar_find_matched_drhd_unit(struct pci_dev *dev)//caq:pci设备找归属的drhd_unit 硬件
{
	struct dmar_drhd_unit *dmaru;
	struct acpi_dmar_hardware_unit *drhd;

	dev = pci_physfn(dev);

	rcu_read_lock();
	for_each_drhd_unit(dmaru) {
		drhd = container_of(dmaru->hdr,
				    struct acpi_dmar_hardware_unit,
				    header);

		if (dmaru->**include_all **&&
		    drhd->segment == pci_domain_nr(dev->bus))//caq:include_all是segment内的，不是整个系统的
			goto out;

		if (dmar_pci_device_match(dmaru->devices,//caq:在对应的unit 的devices 数组中找到了dev
					  dmaru->devices_cnt, dev))
			goto out;
	}
	dmaru = NULL;//caq:否则返回NULL
```

out:

```text
	rcu_read_unlock();

	return dmaru;
}
```


也就是说，通过一个dmar硬件，支持include_all属性，将很多设备收纳了其中，比如看的其他一个服务器的打印：

crash> dmar_drhd_unit.iommu,include_all,devices_cnt ffff8d1240078360

```text
  iommu = 0xffff8d42ff043500
  include_all = 1 '\001'
  devices_cnt = 0
```

crash> intel_iommu.name 0xffff8d42ff043500
  name = "dmar7\000\000\000\000\000\000\000"
上面可以看到，dmar7的 devices_cnt  为0，但是真实的管理设备个数却很多，如下：
[root@localhost devices]# pwd
/sys/class/iommu/dmar7/devices
[root@localhost devices]# ll |wc -l

#### 6.3如何查看一个设备归属的iommu?

除此之外，真正让一个device跟iommu关联的函数，其实可以查看：

```cpp
//caq:bus和devfn是出参
static struct intel_iommu *device_to_iommu(struct device *dev, u8 *bus, u8 *devfn)
{
	struct dmar_drhd_unit *drhd = NULL;
	struct intel_iommu *iommu;
	struct device *tmp;
	struct pci_dev *ptmp, *pdev = NULL;
	u16 segment = 0;
	int i;

	if (iommu_dummy(dev))//caq:该设备没有关联归属iommu,
		return NULL;

	if (dev_is_pci(dev)) {//caq:pci设备，也就是他的bus type 是pci_bus_type
		struct pci_dev *pf_pdev;

		pdev = to_pci_dev(dev);

#ifdef CONFIG_X86
		/* VMD child devices currently cannot be handled individually */
		if (is_vmd(pdev->bus))//caq:VMD:Intel® Volume Management Device
			return NULL;
#endif

		/* VFs aren't listed in scope tables; we need to look up
		 * the PF instead to find the IOMMU. */
		pf_pdev = pci_physfn(pdev);//caq:以 pf 为dev,在drhd管理的dev中，是看不到vf的
		dev = &pf_pdev->dev;
		segment = pci_domain_nr(pdev->bus);//caq:segment其实就是bus归属的domain
	} else if (has_acpi_companion(dev))
		dev = &ACPI_COMPANION(dev)->dev;

	rcu_read_lock();
	for_each_active_iommu(iommu, drhd) {//caq:除掉ignored 的所有 intel_iommu
		if (pdev && segment != drhd->segment)
			continue;

		for_each_active_dev_scope(drhd->devices,
					  drhd->devices_cnt, i, tmp) {
			if (tmp == dev) {
				/* For a VF use its original BDF# not that of the PF
				 * which we used for the IOMMU lookup. Strictly speaking
				 * we could do this for all PCI devices; we only need to
				 * get the BDF# from the scope table for ACPI matches. */
				if (pdev && pdev->is_virtfn)//caq:如果是vf 设备，则 拿 pf
					goto got_pdev;

				*bus = drhd->devices[i].bus;//caq:取bus 号
				*devfn = drhd->devices[i].devfn;//caq:取 device和func 号
				goto out;
			}
```


........

```text
			ptmp = to_pci_dev(tmp);
			if (ptmp->subordinate &&//caq:范围查找
			    ptmp->subordinate->number bus->number &&
			    ptmp->subordinate->busn_res.end >= pdev->bus->number)
				goto got_pdev;
		}

		if (pdev && drhd->include_all) {
		got_pdev:
			*bus = pdev->bus->number;
			*devfn = pdev->devfn;
			goto out;
		}
	}
	iommu = NULL;
```

 out:

```text
	rcu_read_unlock();

	return iommu;
}
```


从如上函数可以看出，跟iommu关联的设备数，可能会远远大于在drhd中看到的devices_cnt，事实上，这个devices_cnt很容易让人误解。

#### 6.4dmar_disabled 的意思？

但是需要注意的是，如果intel_iommu=on 没有设置，且 CONFIG_INTEL_IOMMU_DEFAULT_ON 这个config没有开启，则会导致 dmar_disabled 为1。

```cpp
#ifdef CONFIG_INTEL_IOMMU_DEFAULT_ON
int dmar_disabled = 0;//caq:默认是否开启取决于 CONFIG_INTEL_IOMMU_DEFAULT_ON 是否配置
```

#else

```cpp
int dmar_disabled = 1;
#endif /*CONFIG_INTEL_IOMMU_DEFAULT_ON*/
```


这个 dmar_disabled 的值会影响 int __init intel_iommu_init(void) 函数的行为

```cpp
int __init intel_iommu_init(void)
{
```

.....

```text
if (no_iommu || dmar_disabled) {//caq: 
		/*
		 * We exit the function here to ensure IOMMU's remapping and
		 * mempool aren't setup, which means that the IOMMU's PMRs
		 * won't be disabled via the call to init_dmars(). So disable
		 * it explicitly here. The PMRs were setup by tboot prior to
		 * calling SENTER, but the kernel is expected to reset/tear
		 * down the PMRs.
		 */
		if (intel_iommu_tboot_noforce) {
			for_each_iommu(iommu, drhd)
				iommu_disable_protect_mem_regions(iommu);
		}

		/*
		 * Make sure the IOMMUs are switched off, even when we
		 * boot into a kexec kernel and the previous kernel left
		 * them enabled
		 */
		intel_disable_iommus();//caq:导致intel_iommu的功能被关闭，也就是调用 iommu_disable_translation
		goto out_free_dmar;
	}
```

.....

所以我们经常能看到硬件上是有很多drhd的硬件，但是软件上并没有使能，当然也就没有注册到 iommu框架中的，iommu_device_register不会被调用，全局的 iommu_device_list 只是空的，留下寂寞空虚冷。而如果软件上使能了的话，iommu_device_list 就会保留有当前期active的 iommu device，如下：

crash> list -H iommu_device_list -s iommu_device.ops-----------//caq:注意，这个链表只有active的成员。
ffff9994ff0709c8
  ops = 0xffffffff952ebcc0
ffff99a53f043dc8
  ops = 0xffffffff952ebcc0
crash> dis -l 0xffffffff952ebcc0
0xffffffff952ebcc0 :   adcb   $0xff,-0x6b72(%rdi)

非active的iommu，不会展示在sysfs中，如下案例：

具备iommu功能的硬件打印：
crash> list -H dmar_drhd_units -s dmar_drhd_unit.segment,devices_cnt,include_all,ignored
ffff8d1240078e40

```text
  segment = 0
  devices_cnt = 0
  include_all = 0 '\000'
  ignored = 1 '\001'
```

ffff8d1240078240

```text
  segment = 0
  devices_cnt = 1
  include_all = 0 '\000'
  ignored = 0 '\000'
```

ffff8d1240065000

```text
  segment = 0
  devices_cnt = 3
  include_all = 0 '\000'
  ignored = 0 '\000'
```

ffff8d1240078780

```text
  segment = 0
  devices_cnt = 0
  include_all = 0 '\000'
  ignored = 1 '\001'
```

ffff8d12400783c0

```text
  segment = 0
  devices_cnt = 0
  include_all = 0 '\000'
  ignored = 1 '\001'
```

ffff8d1240078960

```text
  segment = 0
  devices_cnt = 0
  include_all = 0 '\000'
  ignored = 1 '\001'
```

ffff8d1240072fc0

```text
  segment = 0
  devices_cnt = 8
  include_all = 0 '\000'
  **ignored = 1** '\001'//caq:虽然 devices_cnt  不为0，但是依然被ignored。
```

ffff8d1240078360

```text
  segment = 0
  devices_cnt = 0
  include_all = 1 '\001'
  ignored = 0 '\000'
```

除掉这些ignored为1的，可以看到active的iommu设备，
angus@jm212:/sys/class/iommu$ pwd
/sys/class/iommu
angus@jm212:/sys/class/iommu$ ls
dmar4  dmar5  dmar7

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_5f5aeb4e2a42.jpg)
