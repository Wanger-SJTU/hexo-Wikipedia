---
title: (2 条消息) linux驱动开发-深入探索内核设备树的原理与实践
date: "2024-10-12 00:00:00"
updated: "2024-10-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/linux驱动开发-深入探索内核设备树的原理与实践/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/972681787
---


### 一、基础知识

#### 1. dts为何物

在传统Linux内核中，ARM架构的板极硬件细节过多地被硬编码在arch/arm/plat-xxx和arch/arm/mach-xxx，比如板上的platform设备、resource、i2c_board_info、spi_board_info以及各种硬件的platform_data，这些板级细节代码对内核来讲只不过是垃圾代码。而采用Device Tree后，许多硬件的细节可以直接透过它传递给Linux，而不再需要在kernel中进行大量的冗余编码。导致ARM的merge工作量较大，其次ARM很多的代码都是垃圾，代码里面有若干愚蠢的table，而多个人在维护这个table，从而导致了冲突。最后linux发出

`Gaah.Guys, this whole ARM thing is a f*cking pain in the ass.`

之后经过一些讨论，对ARM平台的相关code做出如下相关规范调整，这个也正是引入DTS的原因。

1、ARM的核心代码仍然保存在arch/arm目录下
2、ARM SoC core architecture code保存在arch/arm目录下
3、ARM SOC的周边外设模块的驱动保存在drivers目录下
4、ARM SOC的特定代码在arch/arm/mach-xxx目录下
5、ARM SOC board specific的代码被移除，由DeviceTree机制来负责传递硬件拓扑和硬件资源信息。本质上，Device Tree改变了原来用code方式将HW配置信息嵌入到内核代码的方法，改用bootloader传递一个DB的形式。对于嵌入式系统，在系统启动阶段，bootloader会加载内核并将控制权转交给内核，此外，还需要把上述的三个参数信息传递给kernel，以便kernel可以有较大的灵活性。在linux kernel中，Device Tree的设计目标就是如此。

在devie tree中，可描述的信息包括：

> 1、CPU的数量和类别
2、内存基地址和大小
3、总线和桥
4、外设连接
5、中断控制器和中断的使用情况
6、GPIO控制器和GPIO使用情况
7、clock控制器和clock使用情况

它基本就是一棵电路板上的CPU、总线、设备组成的树，Bootloader会将这棵树传递给内核，然后内核来识别这棵树，并根据它展开出Linux内核中的platform_device、i2c_client、spi_device等设备，而这些设备用到的内存、IRQ等资源，也被传递给内核，内核会将这些资源绑定给展开的相应设备

#### 2. DTS基本知识

2.1 dts

硬件的相应信息都会写在.dts为后缀的文件中，每一款硬件可以单独写一份xxxx.dts，一般在Linux源码中存在大量的dts文件，对于arm架构可以在arch/arm/boot/dts找到相应的dts，一个dts文件对应一个ARM的machie。

<strong>2.2 dtsi</strong>

值得一提的是，对于一些相同的dts配置可以抽象到dtsi文件中，然后类似于C语言的方式可以include到dts文件中，对于同一个节点的设置情况，dts中的配置会覆盖dtsi中的配置。

<strong>2.3 dtc</strong>

dtc是编译dts的工具，可以在Ubuntu系统上通过指令apt-get install device-tree-compiler安装dtc工具，不过在内核源码scripts/dtc路径下已经包含了dtc工具；

<strong>2.4 dtb</strong>

dtb(Device Tree Blob)，dts经过dtc编译之后会得到dtb文件，dtb通过Bootloader引导程序加载到内核。所以Bootloader需要支持设备树才行；Kernel也需要加入设备树的支持；

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1b81385ef627.jpg)

#### 3. DTS结构

/dts-v1/;
/ {

```text
    node1 {
        a-string-property = "A string";
        a-string-list-property = "first string", "second string";
        // hex is implied in byte arrays. no '0x' prefix is required
        a-byte-data-property = [01 23 34 56];
        child-node1 {
            first-child-property;
            second-child-property = ;
            a-string-property = "Hello, world";
        };
        child-node2 {
        };
    };
    node2 {
        an-empty-property;
        a-cell-property = ; /* each number (cell) is a uint32 */
        child-node1 {
        };
    };
```

};`

device tree的基本单元是node。这些node被组织成树状结构，除了root node，每个node都只有一个parent。一个device tree文件中只能有一个root node。每个node中包含了若干的property/value来描述该node的一些特性。每个node用节点名字（node name）标识，节点名字的格式是node-name@unit-address。如果该node没有reg属性（后面会描述这个property），那么该节点名字中必须不能包括@和unit-address。unit-address的具体格式是和设备挂在那个bus上相关。例如对于cpu，其unit-address就是从0开始编址，以此加一。而具体的设备，例如以太网控制器，其unit-address就是寄存器地址。root node的node name是确定的，必须是“/”。 也就是说设备树源文件的结构为

1个root节点”/”;

root节点下面含一系列子节点，“node1” and “node2”

节点node1和下又含有一系列子节点，“child-node1” and “child-node2”

各个节点都有一系列属性

- 这些属性可能为空，如an-empty-property
- 可能为字符串，如a-string-property
- 可能为字符串树组，如a-string-list-property
- 可能为Cells（由u32整数组成），如second-child-property

#### 4 DTS语法介绍

了解了基本的device tree的结构后，我们总要把这些结构体现在device tree source code上来。在linux kernel中，扩展名是dts的文件就是描述硬件信息的device tree source file，在dts文件中，一个node被定义成：

[label:] node-name[@unit-address] {
   [properties definitions]
   [child nodes]
} `

“[]”表示option，因此可以定义一个只有node name的空节点，label方便在dts文件中引用

基本数据类型：

text string（以null结束），以双引号括起来，如：

- string-property = “a string”
cells 是32位无符号整形数，以尖括号括起来，如

- cell-property = 
binary data 以方括号括起来，如：

- binary-property = [0x01 0x23 0x45 0x67];
不同类型数据可以在同一个属性中存在，以逗号分格，如：

- mixed-property = “a string”, [0x01 0x23 0x45 0x67], ;
多个字符串组成的列表也使用逗号分格，如：

- string-list = “red fish”,“blue fish”;

#### 5 dts的组成

#### 5.1 标准属性

<strong>5.1.1 compatible</strong>

每一个dts文件都是由一个root的根节点组成，内核通过根节点“/”的兼容性即可判断它启动的是什么设备，其代码结构如下

/ {

```text
	model = "Spreadtrum SC9830A-5 V1.0.0 Smartphone Board";

	compatible = "sprd,sp9830a-5h10-ga1", "sprd,sc9830";

	chosen {
		bootargs = "earlycon=sprd_serial,0x70100000,115200n8 loglevel=8 console=ttyS1,115200n8 init=/init root=/dev/ram0 rw androidboot.hardware=sc9830";
		linux,initrd-start = ;
		linux,initrd-end = ;
	};
```

};`

- model属性值是，它指定制造商的设备型号。推荐的格式是：“manufacturer，model”，其中manufacturer是一个字符串描述制造商的名称，而型号指定型号。
- compatible属性值是,指定了系统的名称，是一个字符串列表，它包含了一个“,”形式的字符串。重要的是要指定一个确切的设备，并且包括制造商的名字，以避免命名空间冲突。
- chosen 节点不代表一个真正的设备，但功能与在固件和操作系统间传递数据的地点一样，如根参数，取代以前bootloader的启动参数，控制台的输入输出参数等
<strong>5.1.2 #address-cells和#size-cells</strong>

- #address-cells = : 基地址、片选号等绝对起始地址所占字长，单位uint32
- #size-cells = : 长度所占字长，单位uint32
soc {

```text
	#address-cells = ;
	#size-cells = ;
	serial {
		compatible = "ns16550";
		reg = ;
		clock-frequency = ;
		interrupts = ;
		interrupt-parent = ;
	};
```

};`

<strong>5.1.3 CPU addressing</strong>

在讨论寻址时，CPU节点代表了最简单的情况。 每个CPU都分配有一个唯一的ID，并且没有与CPU ID相关联的大小。

  cpus {

```text
        #address-cells = ;
        #size-cells = ;
        cpu@0 {
            compatible = "arm,cortex-a9";
            reg = ;
        };
        cpu@1 {
            compatible = "arm,cortex-a9";
            reg = ;
        };
    };`
```


在cpus节点，#address-cells被设置成了1，#size-cells被设置成了0。这是说子reg值是单独的uint32，它用无大小字段表示地址。在此情况下，这两个cpu分配到的地址为0和1。Cpu节点的#size-cells是0因为每个cpu只分配到了一个单独的地址。

你仍然需要注意reg值班需要与节点名的值相匹配。按照惯例，如果一个节点有一个reg属性，那么这个节点名称必须包括unit-address,这是reg属性的第一个address值。

<strong>5.1.4 Memory Mapped Devices</strong>

与在cpu节点中单独的address值不同，内存映射设备被分配了一系列将要响应的地址，因此不仅需要包含内存的基地址而且还需要映射地址的长度，因此需要使用#size-cells用来表示在每个子reg元组中长度字段的大小。在以下示例中，每个address值为1 cell(32 bits),每个长度值也是1 cell,这在32 bit系统是比较典型的。64 bit设备也许会为#address-cells和#size-cells使用数值2，在device tree中获取64 bit addressing。

/dts-v1/;

/ {

```text
    #address-cells = ;
    #size-cells = ;
    ...
    serial@101f0000 {
        compatible = "arm,pl011";
        reg = ;
    };

    serial@101f2000 {
        compatible = "arm,pl011";
        reg = ;
    };

    gpio@101f3000 {
        compatible = "arm,pl061";
        reg = ;
    };

    interrupt-controller@10140000 {
        compatible = "arm,pl190";
        reg = ;
    };

    spi@10115000 {
        compatible = "arm,pl022";
        reg = ;
    };
    ...
```

};`

<strong>5.1.5 Non Memory Mapped Devices</strong>

处理器总线的其它设备为非内存映射设备。他们有地址范围，但不能被CPU直接寻址。母设备的驱动程序将代替CPU进行间接访问。以i2c设备为例，每个设备都分配了一个地址，但没有长度或范围与之相匹配。这与CPU地址分配很相似。

 i2c@1,0 {

```text
     compatible = "acme,a1234-i2c-bus";
     #address-cells = ;
     #size-cells = ;
     reg = ;
     rtc@58 {
         compatible = "maxim,ds1338";
         reg = ;
     };
```

 };`

<strong>5.1.6 Ranges (Address Translation)</strong>

我们已经讨论过如何向设备分配地址，但此时这些地址只是本地设备节点，还没有说明如何从那些地址里映射到cpu可以使用的地址。根节点经常描述地址空间的CPU视图。根节点的子节点已经使用了CPU的address domain，所以不需要任何明确的映射。例如，serial@101f0000设备被直接分配了地址0x101f0000。

根节点的非直接子节点是无法使用CPU的address domain的。为了在deivce tree获取内存映射地址必须指定如何从一个域名将地址转换到另一个。Ranges属性就用于此目的。以下是添加了ranges属性的device tree示例。

/dts-v1/;
/ {

```text
    compatible = "acme,coyotes-revenge";
    #address-cells = ;
    #size-cells = ;
    ...
    external-bus {
        #address-cells = 
        #size-cells = ;
        ranges = ; // Chipselect 3, NOR Flash

        ethernet@0,0 {
            compatible = "smc,smc91c111";
            reg = ;
        };

        i2c@1,0 {
            compatible = "acme,a1234-i2c-bus";
            #address-cells = ;
            #size-cells = ;
            reg = ;
            rtc@58 {
                compatible = "maxim,ds1338";
                reg = ;
            };
        };

        flash@2,0 {
            compatible = "samsung,k8f1315ebm", "cfi-flash";
            reg = ;
        };
    };
```

};`

Ranges是一个地址转换列表。每个输入ranges表格的是包含子地址的元组，母地址和子地址空间的范围大小。每个字段的大小都由获取的子地址的#address-cells值，母地址的#address-cell值和子地址的#size-cells值而定。以外部总线为例，子地址是2 cells，母地址是1 cell,大小也为1 cell。转换三个ranges：

- Offset 0 from chip select 0 is mapped to address range 0x10100000…0x1010ffff
- Offset 0 from chip select 1 is mapped to address range 0x10160000…0x1016ffff
- Offset 0 from chip select 2 is mapped to address range 0x30000000…0x30ffffff
例如上面的总线是有片选的，就需要描述片选及片选的偏移量，在说明地址时，还需要说明地址映射范围

<strong>5.1.7 status</strong>

device tree中的status标识了设备的状态，使用status可以去禁止设备或者启用设备，看下设备树规范中的status可选值


valueDescription“okay”表示设备正在运行“disabled”表示该设备目前尚未运行，但将来可能会运行“fail”表示设备无法运行。 在设备中检测到严重错误，确实如此没有修理就不可能投入运营“fail-sss”表示设备无法运行。 在设备中检测到严重错误，它是没有修理就不可能投入运营。 值的sss部分特定于设备并指示检测到的错误情况

#### 5.2 中断映射

与遵循树的自然结构而进行的地址转换不同，机器上的任何设备都可以发起和终止中断信号。另外地址的编址也不同于中断信号，前者是设备树的自然表示，而后者者表现为独立于设备树结构的节点之间的链接。 下图显示了设备的自然结构以及每个节点在逻辑中断树中的位置。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f3e459391f94.jpg)

上图包括以下部分：

- open-pic中断控制器是中断树的根
- 中断树根有三个子设备，它们将中断直接路由到open-pic(device1、PCI host controller、GPIO Controller)
- 存在三个中断域; 一个以开放式pic节点为根，一个在PCI主桥节点，一个在GPIO Controller节点上
- 有两个nexus节点; 一个位于PCI主桥，一个位于GPIO控制器。

属性属性值描述#interruptsprop-encoded-array一个设备节点属性，该属性主要描述了中断的HW interrupt ID以及类型#interrupt-parentphandle该属性主要描述了该设备的interrupt request line连接到哪一个interrupt controller，那些没有 interrupt-parent 的节点则从它们的父节点中继承该属性#interrupts-extendedphandle prop-encoded-array列出了设备生成的中断,当设备连接到多个中断控制器#interrupt-cellsu32这是中断控制器节点的属性，用来标识这个控制器需要几个单位做中断描述符（类似于 #address-cells 和 #size-cells）,则子节点的interrupts一个cell三个32bits整型值： #interrupt-controllerempty一个空属性用来声明这个node接收中断信号

下面显示了具有PCI总线控制器和采样中断的设备片段

soc {

```text
	compatible = "simple-bus";
	#address-cells = ;
	#size-cells = ;
	open-pic {
		clock-frequency = ;
		interrupt-controller;
		#address-cells = ;
		#interrupt-cells = ;
	};
	pci {
		#interrupt-cells = ;
		#size-cells = ;
		#address-cells = ;
		interrupt-map-mask = ;
		interrupt-map = ;
	};
```

};`

#### 5.3 特殊节点

aliases节点为了解决节点路径名过长的问题，引入了节点别名的概念，可以引用到一个全路径的节点。如/external-bus/ethernet@0,0，但当用户想知道具体内容的时候显得太累赘，“哪个设备是eth0？”

aliases {

```text
        ethernet0 = &eth0;
        serial0 = &serial0;
    };`
```


当为设备分配一个标识符的时候，操作系统更倾向于使用aliases

### 二、设备文件的构成

#### 1. devie tree的编译

Device Tree文件的格式为dts，包含的头文件格式为dtsi，dts文件是一种人可以看懂的编码格式。但是uboot和linux不能直接识别，他们只能识别二进制文件，所以需要把dts文件编译成dtb文件。dtb文件是一种可以被kernel和uboot识别的二进制文件。把dts编译成dtb文件的工具是dtc。Linux源码目录下scripts/dtc目录包含dtc工具的源码。在Linux的scripts/dtc目录下除了提供dtc工具外，也可以自己安装dtc工具，linux下执行：sudo apt-get install device-tree-compiler安装dtc工具。其中还提供了一个fdtdump的工具，可以反编译dtb文件

dtc工具的使用方法是：

`dtc –I dts –O dtb –oxxx.dtb xxx.dts`

dts和dtb文件的转换如图1所示

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8a5e236aca2c.jpg)

#### 2. Device Tree头信息

本节我们将采用实例解析一个dtb文件，看看其原理是什么样的？

fdtdump工具使用，Linux终端执行ftddump –h，输出以下信息：

review@ubuntu:~/02_dtb$ fdtdump --h
Usage: fdtdump [options] 

Options: -[dshV]
  -d, --debug   Dump debug information while decoding the file
  -s, --scan    Scan for an embedded fdt in file
  -h, --help    Print this help and exit
  -V, --version Print version and exit`

本文采用 jz2440.dtb文件为例说明fdtdump工具的使用。Linux终端执行fdtdump

review@ubuntu:~/02_dtb$ fdtdump -d -s jz2440.dtb 
jz2440.dtb: found fdt at offset 0
/dts-v1/;

```text
// magic:               0xd00dfeed
// totalsize:           0x1d1 (465)
// off_dt_struct:       0x48
// off_dt_strings:      0x188
// off_mem_rsvmap:      0x28
// version:             17
// last_comp_version:   16
// boot_cpuid_phys:     0x0
// size_dt_strings:     0x49
// size_dt_struct:      0x140`
```


以上信息便是Device Tree文件头信息，存储在dtb文件的开头部分。在Linux内核中使用struct fdt_header结构体描述。struct fdt_header结构体定义在scripts\dtc\libfdt\fdt.h文件中

```text
struct  fdt_header  {
   fdt32_t  magic;             /* magic word FDT_MAGIC */
   fdt32_t  totalsize;         /* total size of DT block */
   fdt32_t  off_dt_struct;        /* offset to  structure */
   fdt32_t  off_dt_strings;       /* offset to  strings */
   fdt32_t  off_mem_rsvmap;       /* offset to  memory reserve map */
   fdt32_t  version;               /* format version */
   fdt32_t  last_comp_version;    /* last compatible  version */

   /*  version 2 fields below */
   fdt32_t  boot_cpuid_phys;   /* Which physical CPU  id we're booting on */
   /*  version 3 fields below */
   fdt32_t  size_dt_strings;   /* size of the  strings block */

   /*  version 17 fields below */
   fdt32_t  size_dt_struct;       /* size of the  structure block */
};
```

/memreserve/ 33f00000 100000;
// 0048: tag: 0x00000001 (FDT_BEGIN_NODE)
/ {

```text
// 0050: tag: 0x00000003 (FDT_PROP)
// 0188: string: model
// 005c: value
   model = "SMDK24440";
// 0068: tag: 0x00000003 (FDT_PROP)
// 018e: string: compatible
// 0074: value
   compatible = "samsung,smdk2440";
// 0088: tag: 0x00000003 (FDT_PROP)
// 0199: string: #address-cells
// 0094: value
   #address-cells = ;
// 0098: tag: 0x00000003 (FDT_PROP)
// 01a8: string: #size-cells
// 00a4: value
   #size-cells = ;
// 00a8: tag: 0x00000001 (FDT_BEGIN_NODE)
   memory {
// 00b4: tag: 0x00000003 (FDT_PROP)
// 01b4: string: device_type
// 00c0: value
       device_type = "memory";
// 00c8: tag: 0x00000003 (FDT_PROP)
// 01c0: string: reg
// 00d4: value
       reg = ;
// 00e4: tag: 0x00000002 (FDT_END_NODE)
   };
// 00e8: tag: 0x00000001 (FDT_BEGIN_NODE)
   chosen {
// 00f4: tag: 0x00000003 (FDT_PROP)
// 01c4: string: bootargs
// 0100: value
       bootargs = "noinitrd root=/dev/mtdblock4 rw init=/linuxrc console=ttySAC0,115200";
// 0148: tag: 0x00000002 (FDT_END_NODE)
   };
// 014c: tag: 0x00000001 (FDT_BEGIN_NODE)
   led {
// 0154: tag: 0x00000003 (FDT_PROP)
// 018e: string: compatible
// 0160: value
       compatible = "jz2440_led";
// 016c: tag: 0x00000003 (FDT_PROP)
// 01cd: string: pin
// 0178: value
       pin = ;
// 017c: tag: 0x00000002 (FDT_END_NODE)
   };
// 0180: tag: 0x00000002 (FDT_END_NODE)
```

};`

fdtdump工具的输出信息即是以上结构中每一个成员的值，struct fdt_header结构体包含了Device Tree的私有信息，并且Device Tree的文件是以大端模式储存。并且，头部信息和fdtdump的输出信息一致。

#### 3. Device Tree文件结构

Device Tree文件结构如下图所示。dtb的头部首先存放的是fdt_header的结构体信息，接着是填充区域，填充大小为off_dt_struct – sizeof(struct fdt_header)，填充的值为0。接着就是struct fdt_property结构体的相关信息。最后是dt_string部分。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a8301f29da7f.jpg)

Device Tree源文件的结构分为header、fill_area、dt_struct及dt_string四个区域。fill_area区域填充数值0。节点（node）信息使用struct fdt_node_header结构体描述。属性信息使用struct fdt_property结构体描述。各个结构体信息如下:

struct fdt_node_header { fdt32_t tag; char name[0];}; struct fdt_property { fdt32_t tag; fdt32_t len; fdt32_t nameoff; char data[0];};struct fdt_node_header描述节点信息，tag是标识node的起始结束等信息的标志位，name指向node名称的首地址。tag的取值如下： #define FDT_BEGIN_NODE 0x1 /* Start node: full name */#define FDT_END_NODE 0x2 /* End node */#define FDT_PROP 0x3 /* Property: name off, size, content */#define FDT_NOP 0x4 /* nop */#define FDT_END 0x9FDT_BEGIN_NODE和FDT_END_NODE标识node节点的起始和结束，FDT_PROP标识node节点下面的属性起始符，FDT_END标识Device Tree的结束标识符。因此，对于每个node节点的tag标识符一般为FDT_BEGIN_NODE，对于每个node节点下面的属性的tag标识符一般是FDT_PROP。

描述属性采用struct fdt_property描述，tag标识是属性，取值为FDT_PROP；len为属性值的长度（包括‘\0’，单位：字节）；nameoff为属性名称存储位置相对于off_dt_strings的偏移地址。

例如：compatible = “samsung,goni”, “samsung,s5pv210”;compatible是属性名称，“samsung,goni”, "samsung,s5pv210"是属性值。compatible属性名称字符串存放的区域是dt_string。“samsung,goni”, "samsung,s5pv210"存放的位置是fdt_property.data后面。因此fdt_property.data指向该属性值。fdt_property.tag的值为属性标识，len为属性值的长度（包括‘\0’，单位：字节）,此处len = 29。nameoff为compatible字符串的位置相对于off_dt_strings的偏移地址，即&compatible = nameoff + off_dt_strings。 dt_struct在Device Tree中的结构如下图所示。节点的嵌套也带来tag标识符的嵌套。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_129ce7e1a2ec.jpg)

### 三、u-boot设备树的传递

#### 1. 传递dtb给内核

对于传统bootloader提供两种工作模式：一是启动加载模式（start loading），一是下载模式（downloading）

工作在启动加载模式时，bootloader会自动执行bootcmd命令，

比如：bootcmd=“nand read 0x100000 0x80000000 0x300000; bootm 0x80000000”

uboot首先把内核镜像拷贝到内存地址为0x80000000的地方，然后执行bootm 0x80000000命令。

bootm命令实际上调用的是do_bootm_linux函数：

`theKernel (0,bd->bi_arch_number, bd->bi_boot_params);`

r0,r1,r2三个寄存器的设置

- r0一般设置为0；
- r1一般设置为machine id (在使用设备树时该参数没有被使用)；是让内核知道是哪个CPU，从而调用对应的初始化函数
- r2一般设置ATAGS或DTB的开始地址；
以前没有使用设备树时，需要bootloader传一个machine id给内核，内核启动的时候会根据这个machine_id来比较内核machine_desc(机器描述结构体)中的.nr，如果相等，就选中了对应的machine_desc(机器描述结构体)），然后调用machine_desc(机器描述结构体)中的.init(初始化函数)。现在使用设备树的话，这个参数就不需要设置了。

对于我们拿到一个新的bootloader，我们怎么能使代码支持dtb模式，我们需要配置#define CONFIG_OF_LIBFDT，可让u-boot支持内核设备树dts，加载命令如下：

  bootm   
//bootm + uImage地址 + ramdisk地址 + 设备树镜像地址`

比如：

//1. 下载内核uImage到内存0x30007FC0
tftp 0x30007FC0 uImage
//2. 下载dtb到内存32000000
tftp 0x30001000 s3c2440-smdk2440.dtb
//3. - 表示不使用ramdisk加载，如果使用ramdisk则提供其加载地址
 bootm 0x30007FC0 - 0x30001000`

对于我们下载dtb的地址0x32000000，这个地址有什么要求呢？是随意选的地址就可以，还是要遵循什么原则呢？

- 不要破坏u-boot本身
- 不要破坏内核本身: 内核本身的空间不能占用, 内核要用到的内存区域也不能占用
对于该问题，我们拿了一块2440的地址空间分配图来说明该问题

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d6540b9c32fc.jpg)

对于dtb的存放，只能存放在空闲区，并且不能与其他区有重合的地方。

#### 2. fdt命令查看设备树

如果修改设备树中的led设备引脚，有两种办法

- 修改dts文件，重新编译得到dtb并上传烧写
- 使用uboot提供的一些命令来修改dtb文件，修改后再把它保存到板子上，以后就使用这个修改后的dtb文件移动值，也就是通过memmove处理
对于u-boot提供了fdt的相关命令

	"addr [-c]   []   - Set the [control] fdt location to \n"
	"fdt move      - Copy the fdt to  and make it active\n"
	"fdt resize []            - Resize fdt to size + padding to 4k addr + some optional  if needed\n"
	"fdt print   []          - Recursive print starting at \n"
	"fdt list    []          - Print one level starting at \n"
	"fdt get value      - Get  and store in \n"
	"fdt get name      - Get name of node  and store in \n"
	"fdt get addr       - Get start address of  and store in \n"
	"fdt get size   []  - Get size of [] or num nodes and store in \n"
	"fdt set      []    - Set  [to ]\n"
	"fdt mknode              - Create a new node after \n"
	"fdt rm      []          - Delete the node or \n"
	"fdt header                          - Display header info\n"
	"fdt bootcpu                     - Set boot cpuid\n"
	"fdt memory              - Add/Update memory node\n"
	"fdt rsvmem print                    - Show current mem reserves\n"
	"fdt rsvmem add          - Add a mem reserve\n"
	"fdt rsvmem delete            - Delete a mem reserves\n"
	"fdt chosen [ ]          - Add/update the /chosen branch in the tree\n"
	"                                        / - initrd start/end addr\n"`

实例

nand read.jffs2 32000000 device_tree      // 从flash读出dtb文件到内存(0x32000000)
fdt addr 32000000                                      // 告诉fdt, dtb文件在哪
fdt print /led pin                                           // 打印/led节点的pin属性
fdt get value XXX /led pin                           // 读取/led节点的pin属性, 并且赋给环境变量XXX
print XXX                                                    // 打印环境变量XXX的值
fdt set /led pin                      // 设置/led节点的pin属性
fdt print /led pin                                            // 打印/led节点的pin属性
nand erase device_tree                              // 擦除flash分区
nand write.jffs2 32000000 device_tree      // 把修改后的dtb文件写入flash分区`

#### 3. u-boot对dtb的支持

dtb可以以两种形式编译到uboot的镜像中

- 1.dtb和uboot的bin文件分离
现在的uboot已经做得和kernel很像，最主要的一点是，uboot也使用了dtb的方法，将设备树和代码分离开来（当然可以通过宏来控制）。

CONFIG_OF_CONTROL=y
// 用于表示是否使用了dtb的方式

CONFIG_OF_SEPARATE=y
// 是否将dtb和uboot分离表一`

- 2.dtb集成到uboot的bin文件内部
- 3.通过fdtcontroladdr环境变量来指定dtb的地址

#### 4. uboot中如何获取dtb

在uboot初始化过程中，需要对dtb做两个操作：

- 获取dtb的地址，并且验证dtb的合法性
- 根据你编译的是集成还是分离，如果是集成的话，需要为dtb预留内存空间并进行relocate
- 重新获取一次dtb的地址，bootm传递给内核
<strong>4.1 获取dtb的地址，并且验证dtb的合法性</strong>

在系统起来的时候，进行一串的初始化函数中，fdtdec_setup会对dtb进行合法性验证

```text
static const init_fnc_t init_sequence_f[] = {
```

...
	setup_mon_len,

```text
#ifdef CONFIG_OF_CONTROL
	fdtdec_setup,
#endif
	reserve_fdt,
```

...
}`

对应代码如下： lib/fdtdec.c

```cpp
int fdtdec_setup(void)
{
#if CONFIG_IS_ENABLED(OF_CONTROL)
```

# ifdef CONFIG_OF_EMBED

```text
	/* Get a pointer to the FDT */
// 1. 当使用CONFIG_OF_EMBED的方式时，也就是dtb集成到uboot的bin文件中时，通过__dtb_dt_begin符号来获取dtb地址
	gd->fdt_blob = __dtb_dt_begin;
```

# elif defined CONFIG_OF_SEPARATE
#  ifdef CONFIG_SPL_BUILD

```text
	/* FDT is at end of BSS unless it is in a different memory region */
	if (IS_ENABLED(CONFIG_SPL_SEPARATE_BSS))
		gd->fdt_blob = (ulong *)&_image_binary_end;
	else
		gd->fdt_blob = (ulong *)&__bss_end;
```


#  elif defined CONFIG_FIT_EMBED

```text
	gd->fdt_blob = locate_dtb_in_fit(&_end);

	if (gd->fdt_blob == NULL || gd->fdt_blob fdt_blob = (ulong *)&_end;
```

#  endif
# elif defined(CONFIG_OF_BOARD)

```text
	/* Allow the board to override the fdt address. */
	gd->fdt_blob = board_fdt_blob_setup();
```

# elif defined(CONFIG_OF_HOSTFILE)

```text
	if (sandbox_read_fdt_from_file()) {
		puts("Failed to read control FDT\n");
		return -1;
	}
```

# endif
//3. 可以通过环境变量fdtcontroladdr来指定gd->fdt_blob，也就是指定fdt的地址
# ifndef CONFIG_SPL_BUILD

```text
	/* Allow the early environment to override the fdt address */
	gd->fdt_blob = (void *)env_get_ulong("fdtcontroladdr", 16,
						(uintptr_t)gd->fdt_blob);
```

# endif

```text
#endif
	return fdtdec_prepare_fdt();
```

}`

该函数主要做了一下几件事情

- 对于集成的dtb的u-boot，使用__dtb_dt_begin符号来获取dtb地址，如果是分离式的,通过_end符号来获取dtb地址，同时也支持通过环境参数fdtcontroladdr来配置
- 然后通过fdtdec_prepare_fdt来对fdt进行合法性检查,判断dtb是否存在，以及是否有四个字节对齐。然后再调用fdt_check_header看看头部是否正常,fdt_check_header主要是检查dtb的magic是否正确

```cpp
int fdtdec_prepare_fdt(void)
{
	if (!gd->fdt_blob || ((uintptr_t)gd->fdt_blob & 3) ||
	    fdt_check_header(gd->fdt_blob)) {
#ifdef CONFIG_SPL_BUILD
		puts("Missing DTB\n");
```

#else

```text
		puts("No valid device tree binary found - please append one to U-Boot binary, use u-boot-dtb.bin or define CONFIG_OF_EMBED. For sandbox, use -d \n");
```

# ifdef DEBUG

```text
		if (gd->fdt_blob) {
			printf("fdt_blob=%p\n", gd->fdt_blob);
			print_buffer((ulong)gd->fdt_blob, gd->fdt_blob, 4,
				     32, 0);
		}
```

# endif

```text
#endif
		return -1;
	}
	return 0;
```

}`

<strong>4.2 为dtb分配新的内存地址空间</strong>

当使用CONFIG_OF_EMBED方式时，也就是dtb集成在uboot中的时候，relocate uboot过程中也会把dtb一起relocate，所以这里就不需要处理。当为分离式要为该dtb在内存中分配一片空间即可

```cpp
static int reserve_fdt(void)
{
#ifndef CONFIG_OF_EMBED
	/*
	 * If the device tree is sitting immediately above our image then we
	 * must relocate it. If it is embedded in the data section, then it
	 * will be relocated with other data.
	 */
	if (gd->fdt_blob) {
		gd->fdt_size = ALIGN(fdt_totalsize(gd->fdt_blob) + 0x1000, 32);

		gd->start_addr_sp -= gd->fdt_size;
		gd->new_fdt = map_sysmem(gd->start_addr_sp, gd->fdt_size);
		debug("Reserving %lu Bytes for FDT at: %08lx\n",
		      gd->fdt_size, gd->start_addr_sp);
	}
#endif

	return 0;
}

static int reloc_fdt(void)
{
#ifndef CONFIG_OF_EMBED
	if (gd->flags & GD_FLG_SKIP_RELOC)
		return 0;
	if (gd->new_fdt) {
		memcpy(gd->new_fdt, gd->fdt_blob, gd->fdt_size);
		gd->fdt_blob = gd->new_fdt;
	}
#endif

	return 0;
```

}`

### 四、kernel解析设备树

uboot将一些参数，设备树文件传给内核，那么内核如何处理这些设备树文件呢？本节就kernel解析设备树的过程和原理，本节的主要内容以Device Tree相关的数据流分析为索引，对ARM linux kernel的代码进行解析。主要的数据流包括：

- 设备树对于内核的意义
- 从u-boot传递dtb开始，kernel初始化流程，如何将dtb并将其转换成Device Tree Structure
- 传递运行时参数传递以及platform的识别流程分析
- 如何将Device Tree Structure并入linux kernel的设备驱动模型。

#### 1. 设备树的作用

由上面已经大致可以得出设备树对于内核的作用

作用详细描述平台标识告诉内核dtb支持哪些平台 ； 用DT 来标识特定的machine ； root 节点的compatible 字段，匹配machine_desc的dt_compat运行时配置chosen节点的属性设备信息集合传递各种设备信息

#### 2. 初始化流程

从上一章我们已经知道fdt的地址是作为参数传递到kernel。下面看一下kernel阶段怎么获取这个地址值的。bootloader启动内核时,会设置r0,r1,r2三个寄存器,

> r0一般设置为0；
r1一般设置为machine id (在使用设备树时该参数没有被使用)；
r2一般设置ATAGS或DTB的开始地址；

对于启动的流程代码如下：

ENTRY(stext)
 ARM_BE8(setend	be )			@ ensure we are in BE8 mode

 THUMB(	adr	r9, BSYM(1f)	)	@ Kernel is always entered in ARM.
 THUMB(	bx	r9		)	@ If this is a Thumb-2 kernel,
 THUMB(	.thumb			)	@ switch to Thumb now.
 THUMB(1:			)

```text
#ifdef CONFIG_ARM_VIRT_EXT
	bl	__hyp_stub_install
#endif
	@ ensure svc mode and all interrupts masked
	safe_svcmode_maskall r9
```


	mrc	p15, 0, r9, c0, c0		@ get processor id

```text
	bl	__lookup_processor_type		@ r5=procinfo r9=cpuid
	movs	r10, r5				@ invalid processor (r5=0)?
```

 THUMB( it	eq )		@ force fixup-able long branch encoding
	beq	__error_p			@ yes, error 'p'

```text
#ifdef CONFIG_ARM_LPAE
	mrc	p15, 0, r3, c0, c1, 4		@ read ID_MMFR0
	and	r3, r3, #0xf			@ extract VMSA support
	cmp	r3, #5				@ long-descriptor translation table format?
```

 THUMB( it	lo )				@ force fixup-able long branch encoding
	blo	__error_lpae			@ only classic page table format

```text
#endif

#ifndef CONFIG_XIP_KERNEL
	adr	r3, 2f
	ldmia	r3, {r4, r8}
	sub	r4, r3, r4			@ (PHYS_OFFSET - PAGE_OFFSET)
	add	r8, r8, r4			@ PHYS_OFFSET
```

#else

```text
	ldr	r8, =PLAT_PHYS_OFFSET		@ always constant in this case
#endif

	/*
	 * r1 = machine no, r2 = atags or dtb,
	 * r8 = phys_offset, r9 = cpuid, r10 = procinfo
	 */
	bl	__vet_atags
#ifdef CONFIG_SMP_ON_UP
	bl	__fixup_smp
#endif
#ifdef CONFIG_ARM_PATCH_PHYS_VIRT
	bl	__fixup_pv_table
#endif
	bl	__create_page_tables

	/*
	 * The following calls CPU specific code in a position independent
	 * manner.  See arch/arm/mm/proc-*.S for details.  r10 = base of
	 * xxx_proc_info structure selected by __lookup_processor_type
	 * above.  On return, the CPU will be ready for the MMU to be
	 * turned on, and r0 will hold the CPU control register value.
	 */
	ldr	r13, =__mmap_switched		@ address to jump to after
						@ mmu has been enabled
	adr	lr, BSYM(1f)			@ return (PIC) address
	mov	r8, r4				@ set TTBR1 to swapper_pg_dir
```

 ARM(	add	pc, r10, #PROCINFO_INITFUNC	)
 THUMB(	add	r12, r10, #PROCINFO_INITFUNC	)
 THUMB(	ret	r12				)
1:	b	__enable_mmu
ENDPROC(stext)
	.ltorg
#ifndef CONFIG_XIP_KERNEL
2:	.long	.
	.long	PAGE_OFFSET
#endif`

- __lookup_processor_type : 使用汇编指令读取CPU ID, 根据该ID找到对应的proc_info_list结构体(里面含有这类CPU的初始化函数、信息)
- __vet_atags : 判断是否存在可用的ATAGS或DTB
在汇编的阶段，大概可以看出来用变量__atags_pointer指向FDT的首地址，执行完汇编的阶段就会调到C代码的流程里面了

#### 3. 平台信息的处理(machine_desc)

进入到start_kernel的处理流程中

asmlinkage void __init start_kernel(void)

```text
{
    ...
    setup_arch(&command_line); //设置架构相关的内容
    ...
```

}`

由于涉及的知识点内容实在太多，那么我们只是重点的关注fdt的处理，直接进到setup_ arch()函数。

```text
void __init setup_arch(char **cmdline_p)
{
```

...

```text
	mdesc = setup_machine_fdt(__atags_pointer);
	if (!mdesc)
		mdesc = setup_machine_tags(__atags_pointer, __machine_arch_type);
	machine_desc = mdesc;
	machine_name = mdesc->name;
```

...
}`

首先通过set_machine_fdt来set_machine描述符，如果返回值是NULL，那么就采用传统的方式，如果u-boot传递了，就采用设备树方式

- 传统方式：对于如何确定mdesc，旧的方法是静态定义若干的machine描述符(struct machine_desc)，在系统启动的时候，通过machine type ID作为索引，在这些静态定义的machine描述符中，找到对应哪个ID匹配的描述符。
- 设备树：通过__atags_pointer来找到对应的machine_desc设备描述符
首先我们来看看struct machine_desc的定义方式：

```text
struct machine_desc {
```

...

```cpp
	unsigned int		nr;		/* architecture number	*/
	const char		*name;		/* architecture name	*/
	unsigned long		atag_offset;	/* tagged list (relative) */
	const char *const 	*dt_compat;	/* array of device tree
```

...
}`

nr成员就是过去使用的machine type ID。内核machine描述符的table有若干个entry，每个都有自己的ID。bootloader传递了machine type ID，指明使用哪一个machine描述符。而dtb方式中目前匹配machine描述符使用compatible strings，也就是dt_compat成员，这是一个string list，定义了这个machine所支持的列表。

```cpp
const struct machine_desc * __init setup_machine_fdt(unsigned int dt_phys)
{
	const struct machine_desc *mdesc, *mdesc_best = NULL;
	if (!dt_phys || !early_init_dt_verify(phys_to_virt(dt_phys)))
		return NULL;

	mdesc = of_flat_dt_match_machine(mdesc_best, arch_get_next_mach);

	if (!mdesc) {
		const char *prop;
		int size;
		unsigned long dt_root;

		early_print("\nError: unrecognized/unsupported "
			    "device tree compatible list:\n[ ");

		dt_root = of_get_flat_dt_root();
		prop = of_get_flat_dt_prop(dt_root, "compatible", &size);
		while (size > 0) {
			early_print("'%s' ", prop);
			size -= strlen(prop) + 1;
			prop += strlen(prop) + 1;
		}
		early_print("]\n\n");

		dump_machine_table(); /* does not return */
	}

	/* We really don't want to do this, but sometimes firmware provides buggy data */
	if (mdesc->dt_fixup)
		mdesc->dt_fixup();

	early_init_dt_scan_nodes();

	/* Change machine number to match the mdesc we're using */
	__machine_arch_type = mdesc->nr;

	return mdesc;
```

}`

setup_machine_fdt函数的功能就是根据Device Tree的信息，找到最适合的machine描述符。其主要做了下面几件事情

- 传进来的fdt地址是物理地址，所以用phys_to_virt()函数转换为虚拟地址，同时进行合法检测
- 在machine描述符的列表中scan，找到最合适的那个machine描述符。和传统的方法类似，也是静态定义的。DT_MACHINE_START和MACHINE_END用来定义一个machine描述符。编译的时候，compiler会把这些machine descriptor放到一个特殊的段中（.arch.info.init），形成machine描述符的列表。
- of_get_flat_dt_prop(dt_root, “compatible”, &size)使用compatile属性的值, 跟’’‘每一个machine_desc.dt_compat’’'比较,成绩为"吻合的compatile属性值的位置",成绩越低越匹配, 对应的machine_desc即被选中

```text
static const void * __init arch_get_next_mach(const char *const **match)
{
	static const struct machine_desc *mdesc = __arch_info_begin;
	const struct machine_desc *m = mdesc;

	if (m >= __arch_info_end)
		return NULL;

	mdesc++;
	*match = m->dt_compat;
	return m;
```

}`

_arch_info_begin指向machine描述符列表第一个entry。通过mdesc++不断的移动machine描述符指针（Note：mdesc是static的）。match返回了该machine描述符的compatible string list。具体匹配的算法倒是很简单，就是比较字符串而已，最终找到对应的machine type。 从该流程可以知道，内核是可以支持很多种不同类型的设备，只要在bootloader传递的时候，传递对应不同的dtb表即可。

#### 4. 运行时参数传递

设备树只是起一个信息传递的作用，对这些信息配置的处理，也比较简单，即从设备树的DTB文件中，把这些设备信息提取出来赋给内核中的某个变量即可。那么在系统初始化的过程中，我们需要将DTB转换成节点是device_node的树状结构，以便后续方便操作。紧接上章的函数继续分析

```text
void __init early_init_dt_scan_nodes(void)
{
	/* Retrieve various information from the /chosen node */
	of_scan_flat_dt(early_init_dt_scan_chosen, boot_command_line);

	/* Initialize {size,address}-cells info */
	of_scan_flat_dt(early_init_dt_scan_root, NULL);

	/* Setup memory, calling early_init_dt_add_memory_arch */
	of_scan_flat_dt(early_init_dt_scan_memory, NULL);
```

}`

该函数主要完成3个工作：

- 扫描 /chosen node，保存运行时参数（bootargs）到boot_command_line，此外，还通过early_init_dt_check_for_initrd处理initrd相关的property，并保存在initrd_start和initrd_end这两个全局变量中 。其中主要是解析dts的配置为

```text
	chosen {
		bootargs = "earlycon=sprd_serial,0x70100000,115200n8 loglevel=8 console=ttyS1,115200n8 init=/init root=/dev/ram0 rw androidboot.hardware=sc9830";
		linux,initrd-start = ;
		linux,initrd-end = ;
	};`
```


bootargs属性就是内核启动的命令行参数，它里面可以指定根文件系统在哪里，第一个运行的应用程序是哪一个，指定内核的打印信息从哪个设备里打印出来

- 扫描根节点，获取 {size,address}-cells信息，并保存在dt_root_size_cells和dt_root_addr_cells全局变量中 ,memory中的reg属性的地址是32位还是64位，大小是用一个32位表示，还是两个32位表示
- 扫描DTB中的memory node，并把相关信息保存在meminfo中，全局变量meminfo通过memblock_add保存了系统内存相关的信息

#### 5. dtb解析成device node

uboot把设备树DTB文件随便放到内存的某一个地方就可以使用，为什么内核运行中，他不会去覆盖DTB所占用的那块内存呢？在设备树文件中，可以使用/memreserve/指定一块内存，这块内存就是保留的内存，内核不会占用它。即使你没有指定这块内存，当我们内核启动时，他也会把设备树所占用的区域保留下来。内核在arm_memblock_init中会使用early_init_fdt_scan_reserved_mem来配置fdt的内存，通知也回对memreserve指定内存进行保留操作。

```cpp
void __init early_init_fdt_scan_reserved_mem(void)
{
	int n;
	u64 base, size;

	if (!initial_boot_params)
		return;

	/* Reserve the dtb region */
	early_init_dt_reserve_memory_arch(__pa(initial_boot_params),
					  fdt_totalsize(initial_boot_params),
					  0);

	/* Process header /memreserve/ fields */
	for (n = 0; ; n++) {
		fdt_get_mem_rsv(initial_boot_params, n, &base, &size);
		if (!size)
			break;
		early_init_dt_reserve_memory_arch(base, size, 0);
	}

	of_scan_flat_dt(__fdt_scan_reserved_mem, NULL);
	fdt_init_reserved_mem();
```

}`

- initial_boot_params实际上是dtb的虚拟地址，在early_init_dt_verify初始化的时候设定，首先进来就判断dtb是否存在，如果存在就将dtb的空间进行保留
- 对fdt中的每一个节点调用__fdt_scan_reserved_mem函数，进行reserved-memory节点的扫描，之后调用fdt_init_reserved_mem函数进行内存预留的动作
说完了dtb对于内存的流程，那么来到这节的重点，dtb解析成device node，首先来看看下面的代码

```text
void __init unflatten_device_tree(void)
{
	__unflatten_device_tree(initial_boot_params, &of_allnodes,
				early_init_dt_alloc_memory_arch);

	/* Get pointer to "/chosen" and "/aliases" nodes for use everywhere */
	of_alias_scan(early_init_dt_alloc_memory_arch);
```

}`

分析以上代码，在unflatten_device_tree()中，调用函数__unflatten_device_tree()，参数initial_boot_params指向Device Tree在内存中的首地址，of_root在经过该函数处理之后，会指向根节点，early_init_dt_alloc_memory_arch是一个函数指针，为struct device_node和struct property结构体分配内存的回调函数（callback）。在__unflatten_device_tree()函数中，两次调用unflatten_dt_node()函数，第一次是为了得到Device Tree转换成struct device_node和struct property结构体需要分配的内存大小，第二次调用才是具体填充每一个struct device_node和struct property结构体。那么Device Tree中的每一个node节点经过kernel处理都会生成一个struct device_node的结构体，struct device_node最终一般会被挂接到具体的struct device结构体。struct device_node结构体描述如下：

```cpp
struct device_node {
	const char *name;					//device node name 
	const char *type;					//对应device_type的属性 
	phandle phandle;					//对应该节点的phandle属性
	const char *full_name;				//从“/”开始的，表示该node的full path

	struct	property *properties;		//该节点的属性列表 
	struct	property *deadprops;		//如果需要删除某些属性，kernel并非真的删除，而是挂入到deadprops的列表 
	struct	device_node *parent;		//parent、child以及sibling将所有的device node连接起来
	struct	device_node *child;	
	struct	device_node *sibling;
	struct	device_node *next;			//通过该指针可以获取相同类型的下一个node 
	struct	device_node *allnext;		//通过该指针可以获取node global list下一个node
	struct	kobject kobj;
	unsigned long _flags;
	void	*data;
#if defined(CONFIG_SPARC)
	const char *path_component_name;
	unsigned int unique_id;
	struct of_irq_controller *irq_trans;
#endif
```

}`

对于dtb最后都存储在，其结构图如下

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4dbd673bb1d4.jpg)

#### 6. linux kernel的设备驱动模型

在linux kernel引入统一设备模型之后，bus、driver和device形成了设备模型中的铁三角。在驱动初始化的时候会将代表该driver的一个数据结构挂入bus上的driver链表，device的数据结构挂入bus上的devie链表，那么如何让device遇到“对”的那个driver呢？那么就要靠缘分了，也就是bus的match函数来完成。在传统的方式中，代码中会定义一个static struct platform_device *xxx_devices的静态数组，在初始化的时候调用platform_add_devices。这些静态定义的platform_device往往又需要静态定义各种resource，那么对于设备树，也就是需要根据device_node的树状结构（root是of_allnodes）将一个个的device node挂入到相应的总线device链表中即可。

```cpp
static int __init customize_machine(void)
{
	/*
	 * customizes platform devices, or adds new ones
	 * On DT based machines, we fall back to populating the
	 * machine from the device tree, if no callback is provided,
	 * otherwise we would always need an init_machine callback.
	 */
	if (machine_desc->init_machine)
		machine_desc->init_machine();
#ifdef CONFIG_OF
	else
		of_platform_populate(NULL, of_default_bus_match_table,
					NULL, NULL);
#endif
	return 0;
```

}`

那么Linux系统是怎么知道哪些device node要注册为platform_device，哪些是用于i2c_client，哪些是用于spi_device？不知道你有没有注意到调用of_platform_populate的时候给它传递了一个参数of_default_bus_match_table

```text
const struct of_device_id of_default_bus_match_table[] = {
	{ .compatible = "simple-bus", },
#ifdef CONFIG_ARM_AMBA
	{ .compatible = "arm,amba-bus", },
#endif /* CONFIG_ARM_AMBA */
	{} /* Empty terminated list */
```

};`

那么在dts文件会也会对对应的驱动进行配置

ap-apb {

```text
		compatible = "simple-bus";
		#address-cells = ;
		#size-cells = ;
		ranges;

		uart0: serial@70000000 {
			compatible = "sprd,sc9836-uart";
			reg = ;
			interrupts = ;
			clock-names = "uart", "source","enable";
			clocks = , ,
				;
			status = "disabled";
		};
```

}`

如果某个device node的compatible属性的值与数组of_default_bus_match_table中的任意一个元素的compatible的值match，那么这个device node的child device node（device_node的child成员变量指向的是这个device node的子节点，也是一个链表）仍旧会被注册为platform_device。下面来看看重点的解析过程

```cpp
int of_platform_populate(struct device_node *root,
			const struct of_device_id *matches,
			const struct of_dev_auxdata *lookup,
			struct device *parent)
{
	struct device_node *child;
	int rc = 0;

	root = root ? of_node_get(root) : of_find_node_by_path("/");
	if (!root)
		return -EINVAL;

	for_each_child_of_node(root, child) {
		rc = of_platform_bus_create(child, matches, lookup, parent, true);
		if (rc)
			break;
	}

	of_node_put(root);
	return rc;
```

}`

该函数主要完成完成：

- 获取根节点，如果传递进来的参数root为NULL，那么需要通过of_find_node_by_path函数找到device tree中的根节点。
- 得到根节点之后，就可以通过这个根节点来遍历device tree中的节点了。得到一个子节点之后，调用of_platform_bus_create函数为每一个节点创建platform_device结构体

```cpp
static int of_platform_bus_create(struct device_node *bus,
				  const struct of_device_id *matches,
				  const struct of_dev_auxdata *lookup,
				  struct device *parent, bool strict)
{
	const struct of_dev_auxdata *auxdata;
	struct device_node *child;
	struct platform_device *dev;
	const char *bus_id = NULL;
	void *platform_data = NULL;
	int rc = 0;

	/* Make sure it has a compatible property */
	if (strict && (!of_get_property(bus, "compatible", NULL))) {
		pr_debug("%s() - skipping %s, no compatible prop\n",
			 __func__, bus->full_name);
		return 0;
	}

	auxdata = of_dev_lookup(lookup, bus);
	if (auxdata) {
		bus_id = auxdata->name;
		platform_data = auxdata->platform_data;
	}

	if (of_device_is_compatible(bus, "arm,primecell")) {
		/*
		 * Don't return an error here to keep compatibility with older
		 * device tree files.
		 */
		of_amba_device_create(bus, bus_id, platform_data, parent);
		return 0;
	}

	dev = of_platform_device_create_pdata(bus, bus_id, platform_data, parent);
	if (!dev || !of_match_node(matches, bus))
		return 0;

	for_each_child_of_node(bus, child) {
		pr_debug("   create child: %s\n", child->full_name);
		rc = of_platform_bus_create(child, matches, lookup, &dev->dev, strict);
		if (rc) {
			of_node_put(child);
			break;
		}
	}
	of_node_set_flag(bus, OF_POPULATED_BUS);
	return rc;
```

}`

- 需要确定节点是否有"compatible"属性，如果没有"compatible"属性，则直接返回，即不会创建platform设备的。
- 如果"compatible"属性值有"arm,primecell"，则会调用of_amba_device_create函数去创建amba_device，它设计了AMBA的总线来连接SOC内的各个block。符合这个总线标准的SOC上的外设叫做ARM Primecell Peripherals
- 如果不是ARM Primecell Peripherals，那么我们就需要向platform bus上增加一个platform device了，of_platform_device_create_pdata才是真正的platform_device
- 一个device node可能是一个桥设备，因此要重复调用of_platform_bus_create来把所有的device node处理掉

```text
static struct platform_device *of_platform_device_create_pdata(
					struct device_node *np,
					const char *bus_id,
					void *platform_data,
					struct device *parent)
{
	struct platform_device *dev;

	if (!of_device_is_available(np) ||
	    of_node_test_and_set_flag(np, OF_POPULATED))
		return NULL;

	dev = of_device_alloc(np, bus_id, parent);
	if (!dev)
		goto err_clear_flag;

	of_dma_configure(&dev->dev);
	dev->dev.bus = &platform_bus_type;
	dev->dev.platform_data = platform_data;

	/* We do not fill the DMA ops for platform devices by default.
	 * This is currently the responsibility of the platform code
	 * to do such, possibly using a device notifier
	 */

	if (of_device_add(dev) != 0) {
		platform_device_put(dev);
		goto err_clear_flag;
	}

	return dev;
```


err_clear_flag:

```text
	of_node_clear_flag(np, OF_POPULATED);
	return NULL;
```

}`

- of_device_is_available函数，这个函数主要是用于检测"status"属性的，如果没有"status"属性，那还好说直接返回true。如果有"status"属性，而它的值又不是"okay"或"ok"，那么不好意思，返回false，否则还是返回true。所以"status"属性就是用来检测是否可用，是否需要创建platform_node
- of_device_alloc除了分配struct platform_device的内存，还分配了该platform device需要的resource的内存。当然，这就需要解析该device node的interrupt资源以及memory address资源。
- 回到of_platform_device_create_pdata函数中，平台设备已经申请好了，然后对平台设备继续进行赋值操作，例如平台设备的总线赋值为平台总线，平台设备的私有数据赋值为platform_data，最终会调用of_device_add函数将平台设备注册到内核中。
也就是说当of_platform_populate()函数执行完毕，kernel就为DTB中所有包含compatible属性名的第一级node创建platform_device结构体，并向平台设备总线注册设备信息。如果第一级node的compatible属性值等于“simple-bus”、“simple-mfd”或者"arm,amba-bus"的话，kernel会继续为当前node的第二级包含compatible属性的node创建platform_device结构体，并注册设备。Linux系统下的设备大多都是挂载在平台总线下的，因此在平台总线被注册后，会根据of_root节点的树结构，去寻找该总线的子节点，所有的子节点将被作为设备注册到该总线上。

### 五、备树的使用

对于使用我们分两部分，一部分是它有哪些接口，能做些什么，至于怎么编写dts文件本文不讨论。主要包括两部分：

- 对于设备树，编译和设备启动后，怎么来查看设备树的信息，怎么用来debug
- 设备树的操作函数提供了哪些接口，基本的方法有哪些

#### 1. 文件系统下的设备树

一部分是出现问题后，怎么用来debug，对于内核来说一切皆是文件的思想，设备树与文件系统的关系，在Linux系统起来后，会将解析完成的设备树导出到用户空间。

kernel启动在of_init()函数中在sys/firmware/devicetree/base目录下面为设备树展开成sysfs的目录和二进制属性文件，所有的node节点就是一个目录，所有的property属性就是一个二进制属性文件。

```cpp
static int __init of_init(void)
{
	struct device_node *np;

	/* Create the kset, and register existing nodes */
	mutex_lock(&of_mutex);
	of_kset = kset_create_and_add("devicetree", NULL, firmware_kobj);
	if (!of_kset) {
		mutex_unlock(&of_mutex);
		return -ENOMEM;
	}
	for_each_of_allnodes(np)
		__of_attach_node_sysfs(np);
	mutex_unlock(&of_mutex);

	/* Symlink in /proc as required by userspace ABI */
	if (of_allnodes)
		proc_symlink("device-tree", NULL, "/sys/firmware/devicetree/base");

	return 0;
}
```

core_initcall(of_init);`

该函数比较简单，其主要完成下面三件事情：

- 创建/sys/firmware/devicetree/目录
- 遍历所有的设备树节点，并且在./sys/firmware/devicetree/目录下创建对应的sysfs，以目录结构程现的dtb文件, 根节点对应base目录, 每一个节点对应一个目录, 每一个属性对应一个文件
- 在/proc/device-tree文件软连接到/sys/firmware/devicetree/base

#### 2. 设备树的操作函数

学习完了设备树的文件系统查看方法，那么对于在源码中去拿到设备树的节点或者属性信息，内核提供了那些操作函数呢？内核中开放出来的接口函数的声明大多在include/linux/下面，关于设备树的都是以of形式开头的命名

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7409a62304d.jpg)

对应各个文件主要完成什么功能如下：

文件名功能描述of.h提供设备树的一般处理函数，大部分的功能函数都在该文件中of_address.h地址相关的函数, 比如 of_get_address(获得reg属性中的addr, size值)of_device.h设备相关的函数, 比如 of_match_device、of_device_registerof_dma.h设备树中DMA相关属性的函数of_fdt.hdtb文件的相关操作函数，我们一般不使用of_gpio.hGPIO相关的函数of_graph.hGPU相关驱动中用到的函数, 从设备树中获得GPU信息of_iommu.hIOMMU相关函数of_irq.h中断相关的函数of_mdio.hmdio相关的函数of_mtd.hmtd相关的函数of_net.hnet相关的函数of_pci.hpci相关的函数of_platform.h把device_node转换为platform_device时用到的函数of_reserved_mem.hreserved_mem的相关函数

- 通过compatible属性查找指定节点

```text
struct device_node *of_find_compatible_node(struct device_node *from,
							const char *type, const char *compat);`
```


使用方法可以如下

np = of_find_compatible_node(NULL, NULL, “fsl,imx23-digctl”);

digctrl = of_iomap(np, 0);

digctl: digctl@8001c000 {

```text
	compatible = "fsl,imx28-digctl", "fsl,imx23-digctl";
	reg = ;
	interrupts = ;
	status = "disabled";
```

};`

- 通过节点名查找指定节点

```text
static const struct of_device_id exynos_dt_mcpm_match[] = {
	{ .compatible = "samsung,exynos5420" },
	{ .compatible = "samsung,exynos5800" },
	{},
};

	node = of_find_matching_node(NULL, exynos_dt_mcpm_match);
	if (!node)
		return -ENODEV;
	of_node_put(node);`
```


- 通过路径查找指定节点

```text
struct device_node *of_find_node_by_path(const char *path);

/* 参数：	const char *path - 带全路径的节点名，也可以是节点的别名 */`
```


data->current_node = of_find_node_by_path("/");

- 通过节点名查找指定节点

```text
	sscg_np = of_find_node_by_name(NULL, "sscg");
	if (sscg_np == NULL) {
		pr_err("cannot get SSCG register node\n");
		return system_clk;
	}

	sscg_map = of_iomap(sscg_np, 0);
	if (sscg_map == NULL) {
		pr_err("cannot map SSCG register\n");
		goto out;
	}`
```


由于接口操作函数集比较多，详细的需要看对应的函数定义。