---
title: "程序read 读取本地文件的时候计算机做了什么？"
date: 2024-09-21
tags: [知乎]
source: https://www.zhihu.com/question/60562135/answer/3631302453

---

这个问题，说简单也简单，说复杂的话其实涉及细节也很多。

read系统调用，入参有文件描述符fd，用户态准备的读取数据所需的buf，以及需要读取的长度count。

一次具体的IO栈，syscall -> VFS -> ext4/xfs... -> block -> driver -> nvme/sata/scsi...

用户态程序执行read读取文件，下到内核，首先进入VFS层。内核通过入参fd以及进程的文件描述符表定位当前文件，找到此文件当前需要被读取的位置position，之后会有一系列检查，包括判断position是否越界，用户对这个文件的操作权限，以及一些fanotify相关的通知事件。

VFS层之后走到具体文件系统层，每个文件系统都实现了自己的read钩子函数。以xfs为例，走xfs_file_read_iter函数。这里会根据这次read的IO类型走不同实现，buffer io/direct io/dax是不同的。buffer io会先读取内存页，direct io绕过pagecache直接下发bio到块层，dax则是绕过通用块层，与支持字节寻址的具体块设备（nvdimm）建立映射，直接从设备读取。这里以buffer io为例，走的是xfs_file_buffered_read。

xfs的读写是基于iomap框架实现的，首先判断要读取的范围有没有对应的pagecache，如果有的话直接读取page，就不需要下IO到磁盘了。如果没有对应的page，首先生成page(folio)，并调用iomap_read_folio。在xfs_read_iomap_begin阶段，需要将对应的文件逻辑地址转换成磁盘上的物理地址。xfs文件系统维护了一系列的B+树，包括文件的bmap btree，通过搜索该B+树能够明确文件偏移地址position对应的磁盘块起始地址，并将该映射填充到iomap结构体中。

填充完映射结构体后，内核再调用iomap_readpage_iter函数，这里会生成bio，并调用submit_bio函数下到block层（通用块层）。这一层会将不同的bio进行合并（不同bio对应的磁盘扇区如果连续，就合并成一个bio，用以增大读取效率），生成request，并按照对应的块层调度器进行具体的优先级排序。

从block层之后再到具体的驱动层，比如scsi驱动框架，这里每家驱动厂商的实现也都不同，然后再下放到具体的盘侧读取数据（sata盘/nvme盘等）。然后回到具体的文件系统层，将读取到的数据拷贝到内核的内存buf中，然后内核再将该数据从内核的内存buf拷贝到用户态的buf中。

最后read系统调用返回用户态，读取到的数据填充到了buf中。其中还有一系列的实现细节，提问者如果感兴趣的话可以阅读linux开源代码。