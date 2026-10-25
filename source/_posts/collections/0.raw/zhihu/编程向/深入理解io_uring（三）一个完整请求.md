---
title: 深入理解io_uring（三）一个完整请求
date: "2024-12-12 00:00:00"
updated: "2024-12-12 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/深入理解io_uring(三)一个完整请求/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/12097798333
---


### 前言

[上一章节](https://zhuanlan.zhihu.com/p/11326246299)简略介绍了io_uring设计原理，并没有过多讨论实现细节。本章节基于一个完整io请求，来详细阐述io_uring是如何实现异步请求的。由于io_uring有很多优化配置，例如sq_thread、polling等，先基于最基本的实现方式阐述，然后再深入其优化特性。

### 加入io_uring后的存储栈

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_a5f629b563cf.jpg)

图片来自：《Performance Characterization of Modern Storage Stacks: POSIX I/O, libaio, SPDK, andio_uring》在开始介绍一次完整请求前，我们有必要看下加入io_uring后，Linux存储栈变成什么样了。在此在重复一遍，io_uring的核心是异步，那么Linux存储栈中所有可能导致阻塞的地方，都需要想方设法异步化，所以先从存储栈入手能方便理解io_uring的实现细节。

上图中将Linux存储栈分成了15个流程（忽略关于pread、libaio、SPDK相关内容，本文并不是讨论他们的区别），需要提醒的是，从图中我们可以看出io_uring更多是代替system call这一层（*注意：也有直通驱动的实现*<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)），底下还是基于原来VFS、block等模块。我们简单分析这15个流程可能的阻塞点。

- <strong>提交SQ：</strong>如果遇到SQ满的情况，需要忙等一个空闲SQE或者调用io_uring_enter来等待至少一个SQE被处理。
- <strong>处理SQE：</strong>应用通过io_uring_enter（*注意：是的，这个接口既可以用于提交请求，也可以用于等待至少一个请求完成*）系统调用来进入内核io_uring模块来处理请求。一般是根据SQE中请求类型，直接调用该类型预定义处理流程，通常是提交到VFS层处理。<strong>可能阻塞点一：无法对folio上锁</strong>
- <strong>提交bio：</strong>将请求装载成一个bio（*注意：<strong>可能阻塞点二：无法提交bio</strong>，所以一般指定NON_BLOCK的flag，表示执行非阻塞io*）后，提交到block层，遇到需要阻塞的操作，会返回EAGAIN错误。
- <strong>转成request：</strong>在block层将优化后的bio（*注意：可能经过了合并、排序等处理*）装配成一个request。
- <strong>提交到软件队列：</strong>将request提交到per-core的软件队列<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)，这是避免直接提交到硬件队列需要上锁，导致性能低下。
- <strong>提交到硬件队列：</strong>block层根据调度算法，将软件队列中的请求提交到硬件队列。
- 同流程6，一个流程的2个阶段。
- <strong>分发到驱动：</strong>硬件队列将请求分发到驱动。
- <strong>驱动层处理请求：</strong>驱动层将block层的request转换成硬件命令。
- <strong>插入到驱动层队列：</strong>将转换后的硬件命令转换成硬件请求，并插入到驱动层的队列中。
- <strong>提交到硬件：</strong>驱动层将请求提交到硬件驱动。
- <strong>硬件完成请求：</strong>硬件完成请求后，通过中断的方式通知驱动。
- <strong>驱动通知block层：</strong>驱动层将完成事件通知block层。
- <strong>block层通知io_uring：</strong>block层回调io_uring的完成事件钩子。*<strong>可能阻塞点三：CQ已经满了，无法写入队列。</strong>*
- <strong>io_uring通知应用：</strong>回填CQE后，刷新cqe_tail，相当于通知应用，这里有个优化，就是先缓存CQE，等待合适时机批量刷到CQ。
以上是io_uring提交完整请求流程，可以看出存在多个可能的阻塞点，io_uring的任务之一，就是消除这些阻塞点。以下就展开介绍io_uring是如何消除阻塞点的。

### 提交请求

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_43739031d79c.jpg)

图片来自：https://static.sched.com/hosted_files/kvmforumc/KVMForum_2020_io_uring_passthrough_Stefano_Garzarella.pdf用户程序将请求装配成一个SQE后，就可以提交到SQ队列（*通过WRITE_ONCE刷新sqe_tail*），详细过程如下<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)

`    read_barrier();

```sql
    index = tail & *s->sq_ring.ring_mask;
    struct io_uring_sqe *sqe = &s->sqes[index];
    sqe->fd = file_fd;
    sqe->flags = 0;
    sqe->opcode = IORING_OP_READV;
    sqe->addr = (unsigned long) fi->iovecs;
    sqe->len = blocks;
    sqe->off = 0;
    sqe->user_data = (unsigned long long) fi;
    sring->array[index] = index;
    tail = next_tail;

    /* Update the tail so the kernel can see it. */
    if(*sring->tail != tail) {
        *sring->tail = tail;
        write_barrier();
    }`
```


以上是装配一个IORING_OP_READV的流程，首先通过读屏障，确保当前sqe_tail是保序的（*避免与内核线程在该变量上竞争*），然后将操作文件、操作类型、buffer地址等等，写入SQE中（*注意：由于需要完成后释放fi，所以需要将其放入user_data，能在完成时访问这部分空间*）。

#### True Async

如果不存在sq_thread时，需要程序调用io_uring_enter来提交请求。io_uring优先在本线程（*原因参考下图*）中去提交io，有类似的栈<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)：

`io_issue_sqe(req, IO_URING_F_NONBLOCK | IO_URING_F_COMPLETE_DEFER)
io_queue_sqe
io_submit_sqe
io_submit_sqes
io_uring_enter`

io_uring只有True Async才叫IO_URING_F_NONBLOCK，表示真正执行非阻塞io（*NONBLOCK*）操作，以上述的read为例，强制走force_nonbloc流程，在装配bio时加上IOCB_NOWAIT（*bio层原有特性*）标记。一旦在处理该bio过程中遇到需要阻塞操作时（*比如需要创建folio，文件系统需要度盘做映射等*），直接返回EAGAIN错误码，表示不阻塞等待。

#### async buffer操作

上面提到True Async可能由于folio被争用而无法上锁时，需要等待其他任务释放锁后，才能继续完成提交操作。这是可以利用VFS已有特性async buffered reads<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)来将请求放到某个等待队列中。一旦folio被释放后，就回唤醒队列中的等待任务，继续完成读请求（*注意：这是针对读请求优化，其他请求并不存在这样特性*）。

#### Worker-based async

如果上述True-Async流程失败后，为了不阻塞，就要考虑将请求缓存起来，等待合适时机继续处理，这就是Worker-based async，其原理是将请求转到io-wq去异步处理，有如下调用栈：

`io_wq_enqueue
io_queue_iowq
io_queue_async
io_submit_sqe`

io_uring的io-wq采用线程池的实现方式，通常是根据CPU数量、SQE队列深度来确定线程数量。在worker线程中就可以循环尝试，相对于用户线程而言，就不存在阻塞了。

需要注意的是，Worker-based sync的方式相比True Async劣化不少：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_85f6d9149cb9.jpg)

图片来自：https://www.usenix.org/system/files/fast24-joshi.pdf根据论文<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)结果，True Async能充分发挥io_uring的优势，所以在设计接口时，更多考虑True Async的方式。

### 完成请求

io_uring处理完成请求稍微比较复杂，这是由于在提交请求后，io_uring是不知道刚提交的请求什么时候完成，需要等待硬件发中断（*非polling场景*），所以完全是异步的时机。

#### 通过task work来处理完成

上述介绍存储栈的时候提到，非polling场景下，硬件完成io请求后需要通过中断方式（*当然，如果直接命中page cache也不需要中断*）来通知block层，block层再通过io_uring注册的回调函数来通知io_uring模块。有如下过程：

`io_complete_rw [io_uring]
bio_endio
blk_mq_end_request
blk_mq_end_request_batch
nvme_pci_complete_batch
nvme_irq`

有人疑惑为什么不直接在io_complete_rw处理完成请求流程？需要注意的是，以上流程是在中断上下文的，不适宜处理比较耗时操作，这里应该是类似中断下半部的实现，通过task work将耗时操作放到进程上下文去处理。task work的基本原理是将一些异步任务绑定到一个任务上（*io_uring中一般是创建io_uring线程或者sq_thread线程*），有点类似给该任务发了一个（伪）信号。io_uring为了进一步优化，还可以指定task work的处理时机，有如下两种设置：

`ctx->notify_method = TWA_SIGNAL_NO_IPI;
和
ctx->notify_method = TWA_SIGNAL;`

- <strong>TWA_SIGNAL_NO_IPI：</strong>表示不要强制发送IPI信号唤醒指定task，这是避免打扰正在运行的其他任务
- <strong>TWA_SIGNAL：</strong>类似信号处理模式，正常处理，可能会打扰其他任务
需要进一步说明的是，io_uring为了进一步降低更新CQ开销，还实现了defer complete，允许先缓存一批事件，等到合适时机，例如：程序正在polling完成事件、程序调用GETEVENTS来收割事件时，才真正批量更新到CQ。

### 总结

本文阐述了一个基于io_uring的完整io_read流程，但还有非常多细节没有展开，例如遇到try_lock_folio失败怎么处理，不使用task work而是按需收割事件等等，种种细节多如牛毛，不适宜在此展开，留待后续慢慢深入分析。

### 参考

- ^[a](#ref_1_0)[b](#ref_1_1)I/O Passthru: Upstreaming a flexible and efficient I/O Path in Linux https://www.usenix.org/system/files/fast24-joshi.pdf
- [^](#ref_2_0)Linux block io: Introducing multi-queue ssd access on multi-core systems https://dl.acm.org/doi/10..2485740
- [^](#ref_3_0)02_cat_uring https://gitcode.com/gh_mirrors/io/io_uring-by-example/blob/master/02_cat_uring/main.c
- [^](#ref_4_0)Linux内核的io_uring任务调度 https://bluepuni.com/archives/linux-io-uring-task-scheduling/
- [^](#ref_5_0)Add support for async buffered reads https://lwn.net/Articles/821274/
