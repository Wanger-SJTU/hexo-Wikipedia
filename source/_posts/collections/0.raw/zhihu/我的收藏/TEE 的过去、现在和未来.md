---
title: (2 条消息) TEE 的过去、现在和未来
date: "2025-06-06 00:00:00"
updated: "2025-06-06 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/TEE-的过去、现在和未来/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/941327382
---


随着 SGX 这 CPU 可信执行环境（TEE）开拓者逐渐退出桌面端还有其他基于虚拟化和异构架构的 TEE 的相继问世，我们可以看到可信计算领域正从难以应用逐渐走向实用。在这个市场上，几家 CPU 厂商经过十多年的探索和实践，取得了显著的成果，并建立了一些行业标准。

### 为什么是基于虚拟化的 TEE?

不妨先了解一下 SGX 为什么会受到批评。最初，Intel 的愿景非常美好：它希望构建一个轻量级、基于用户态的 TEE，使 Trusted Computing Base（可信计算基，TCB）尽可能小，以便复用操作系统中的许多组件，如页表管理和上下文切换等。然而，为了实现安全性，SGX 的计算模型中对许多操作进行了限制。例如，日志记录在 SGX 内是无法直接完成的，需要在宿主环境（host）中定义一个 OCALL（外部调用），让 SGX 内的代码将数据传递出来，由宿主环境负责打印。因此，在 SGX 内，普通的 libc 函数库几乎无法正常使用，Intel 只好自己打造了一套 C 和 C++ 的运行时库。然而，这套库的使用难度可想而知。**对于开发者来说，当代码库的依赖都因 SGX 的限制而破损时，就不得不重新造轮子，把一些 SGX 不支持的功能强行通过 SGX 提供的 OCALL 胶水拼凑起来。这种机制虽然并非完全无法使用，但带来的心智负担非常大，问题也相当严重：OCALL 的参数和数据检查大部分依赖于开发者自己进行，甚至包括敏感数据在传输时也需要加密，以防止操作系统的窃取攻击。熟悉 Rust 的开发者可能知道，如果要在裸机上运行 Rust 代码，就必须开启 `no_std` 这个功能，从而无法使用许多常用的标准库。SGX 在某种程度上就类似于这样的裸机环境。

在安全领域，有一个不成文的准则：安全性绝不能凌驾于可用性之上。这其实很好理解。假设我们拥有 100 万的现金，我们愿意为它购买的保险金额显然不可能超过 100 万。同样地，SGX 就像一个极具吸引力的保险方案，但要使用它的成本却非常高昂。而且，SGX 过度依赖操作系统的功能，这意味着许多组件是共享的（不妨想想类似 prime+probe 或 flush 等侧信道攻击，是否都是利用这些共享组件实现的）。这种共享机制带来了许多间接或主动的攻击风险。因此，SGX 的设计注定存在诸多安全漏洞，这样一个问题重重的方案被淘汰也就显得合情合理了。

SGX 难用的根本原因在于，许多必要的组件并没有被包含在 TCB 中。那么，解决方法似乎很简单：直接把这些组件也包括进 TCB。随着这样的演变，公司逐渐发现，与其不断扩充 TCB，为什么不干脆把整个系统都放进 TEE 里呢？这不就是一个虚拟机吗？虚拟机不仅好用，而且自带“隔离”的特性，非常契合 TEE 的需求。

### AMD SEV-SNP 和 Intel TDX

早在 2017 年的 Linux 峰会上，AMD 就率先介绍了 SEV（Secure Encrypted Virtualization）。随后，在 2020 年左右，第二代的 SNP（Secure Nested Paging）横空出世，成为第一个商用的 VM-based TEE。紧接着，Intel 也推出了他们的 VM-based TEE，称为 TDX（Trusted Domain eXtension）。这两者的设计既有共通之处，也各具特色。由于 TDX 发布较晚，可以说是站在巨人的肩膀上，因此在设计上更加前卫。总体而言，基于虚拟化的 TEE 通常具备以下特性：

- 全内存加密（Total Memory Encryption / Secure Memory Encryption 等）**：通常情况下，CPU 内部会有一个熔丝（fuse）的根密钥作为信任根。每个 VM 会通过一些协议，经由宿主机（Host）向 CPU 发送密钥协商请求，从而生成每个 VM 的临时密钥来加密整个 VM 的内存。这一功能保障了数据在使用中的机密性和完整性。
- <strong>页表保护</strong>：SEV 早期的设计缺陷在于，虽然内存被加密，但页表管理中缺乏所有权保护，导致攻击者可以将多个物理地址（HPA）映射到同一个虚拟地址（GPA），从而间接窃取数据。SNP 则通过 CPU 机制在 GPA 到 HPA 的翻译中，加入了所有权和完整性保护，确保 GPA 和 HPA 的映射是唯一的。
- <strong>虚拟机状态保护</strong>：通常情况下，中断处理会导致 VM 暂停，并由 Hypervisor 负责处理。这时 VM 的上下文状态必须保存起来交给 Hypervisor，而这些中间状态也需要被加密，否则 Hypervisor 可能会窃取或修改数据，造成严重后果。比如，在 SSH 认证时直接注入一个 `rax = 0` 就可能绕过密码验证，这显然是不可接受的。
- <strong>远程认证（Remote Attestation）</strong>：这是所有 TEE 必须具备的重要特性。云端的 TEE 必须向用户证明自身的可信性，否则用户无法放心地将数据托付给它。
- <strong>权限分离</strong>：就像内核（kernel）运行在 ring 0 一样，普通 VM 的权限需要被降低。Intel 和 AMD 都有类似的权限管理机制，以确保虚拟机运行环境的安全性。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5ca077af4e1d.jpg)

这样一来，一些敏感操作可以被转交给一个“更安全”的模块来处理。由于这个模块体积更小，因此更容易实现高安全性。在这方面，TDX 表现得更为出色。它引入了一个 TDX 模块，直接将 Hypervisor 屏蔽，使得虚拟机可以直接调用 TDX 模块来完成某些操作，只有在真正需要时才会请求 Hypervisor 的协助。这种设计不仅减少了对 Hypervisor 的依赖，还显著提高了整体的安全性。

### Heterogenous TEE

确实，如果我们的 TEE 一直局限于 CPU 上的话，就会存在不少限制，尤其是在面对复杂的计算任务。幸运的是，NVIDIA 嗅觉敏锐，推出了首款具有 TEE 功能的 GPU——H100，这一举动弥补了可信计算领域的一大短板。然而，再好的技术也有其局限性。对于 CPU TEE 而言，外部设备的安全性无法得到保障，尤其是未经认证的 I/O 设备，我们无法信任它们。因此，一个虚拟机的私有内存不能直接让 GPU 访问，这成为一个亟待解决的问题。为了解决这个问题，系统需要通过设计一些特殊的机制来确保数据在 GPU 和 VM 之间传输时的安全性。可能的做法包括为 GPU 创建专用的隔离区，或在 CPU 和 GPU 之间建立安全的数据通道，以保证内存访问的安全。通过这些方式，可以在保持 TEE 安全属性的同时，让 GPU 参与可信计算的任务。

**swiotlb is a memory buffer allocator used by the Linux kernel DMA layer. It is typically used when a device doing DMA can’t directly access the target memory buffer because of hardware limitations or other requirements.在 Linux 系统上，有一个名为 SWIOTLB 的机制：它是一个内存缓冲区分配器，用于 Linux 内核的 DMA 层，通常在硬件限制或其他需求导致设备无法直接访问目标内存缓冲区时使用。基于此，出现了一个巧妙的“hack”：将这块内存设为共享，从而解决设备访问问题。实际上，TDX 就是这样实现的。具体来说，当虚拟机内的内核启动时，它会尝试启用 TDX 功能。如果检测到 TDX 支持，就会使用 TDCALL 将共享内存区域映射给 SWIOTLB，供 DMA 使用。这样一来，GPU 和 CPU 就可以在这块共享内存上进行 DMA 操作。当然，为了防止数据泄露，GPU 和 CPU 之间的数据传输会使用协商后的密钥进行加密，从而确保数据在共享内存中的安全性。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fa250e2c2c49.jpg)

当然这个就是一个非常 high level 的示意图，实际上里面还牵扯到 IOMMU pass through、qemu vfio、Enc/Dec等复杂过程。AMD 的做法有所不同，它允许直接使用 SNP 指令将一段内存设置为共享。这样一来，Linux 内核中就可以直接通过调用这些指令来实现内存的共享管理。

`/* /arch/x86/virt/svm/sev.v */

```cpp
/* Transition a page to hypervisor-owned/shared state in the RMP table. */
int rmp_make_shared(u64 pfn, enum pg_level level)
{
	struct rmp_state state;

	memset(&state, 0, sizeof(state));
	state.pagesize = PG_LEVEL_TO_RMP(level);

	return rmpupdate(pfn, &state);
```

}`

在 AMD 的方案中，如果在虚拟机（guest）端调用 `dma_alloc_coherent`，这一过程最终会触发 VMEXIT 中断，将控制权交还给 Hypervisor。接下来，Hypervisor 会使用特定的 SNP 指令（例如 `SNP_PAGE_STATE_CHANGE`）来处理内存共享请求，将相应的内存页面从私有状态转换为共享状态。种机制使得内存共享操作更加简洁和高效，不需要额外的内存映射或中间层，简化了 DMA 的操作流程。使用这种方法，还可以将复杂的内存管理逻辑从虚拟机内部转移到 Hypervisor 层，使得虚拟机可以更加高效地执行 DMA 操作，同时确保数据的安全性。

### 性能好差：TIO

使用共享内存作为 DMA bouncing buffer 虽然能解决问题，但性能损耗是显而易见的。每次 DMA 事务都需要额外的压缩、加密和数据拷贝操作，增加了大量的开销。我们在 llama 的 benchmark 中测了一下，数据显示，这种方法在 LLM 推理任务中可能导致 inference 速度下降高达 60%（？！！！）<strong>。其实，硬件厂商已经注意到这一问题，并提出了一项名为</strong>Trusted IO** 的提案。这个提案旨在优化设备和虚拟机之间的数据传输流程，以减少不必要的开销，增强 DMA 操作的性能，同时保持数据传输的安全性。目前，Trusted IO 已被列入议程，有望成为解决这一瓶颈的下一步技术突破。

[](https://link.zhihu.com/?target=https%3A//www.amd.com/content/dam/amd/en/documents/developer/sev-tio-whitepaper.pdf)

简而言之，<strong>Trusted IO</strong> 允许各个设备之间相互认证对方的身份，这通常是通过 <strong>SPDM 协议</strong>（安全设备通信和管理协议）来实现的。尽管它最初的设计目的不一定是为了解决 TEE 的 IO 问题，但这个机制确实可以用于增强 TEE 环境中的设备交互安全性。通过在设备间进行身份认证，Trusted IO 能确保只有经过认证的设备才能参与数据传输。这种机制可以用来优化 TEE 的 IO 操作，使得在可信环境下的数据交换更加高效、安全，并减少冗余的加密、解密过程。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d7eba511f4d2.jpg)

一个大大大饼，啥时候落地咱暂且蒙在鼓里（
### 还有一些能做的东西

让我们来谈谈 Remote Attestation。

**Remote attestation is a method for a client to authenticate its hardware and software configuration to a remote server.对于 TEE 来说，RA 几乎是可信计算的基石，没有它，可信计算就无法实现。但目前的 RA 能做的事情还比较粗糙，一般就是让 CPU 用密钥签名一个报告，然后发给验证方进行检查，这种方式还有很大的改进空间。

但我们来看 RA 的两部分：

- TEE 身份认证**：这一部分相对简单，只需报告一些版本号、构建版本等信息，来确认 TEE 的身份。
- <strong>软件可信性</strong>：这里的问题就比较复杂了，因为 TEE 只能告诉你内部运行的是什么（通过哈希值来验证完整性），但无法真正解释软件的<strong>属性或行为</strong>。当前的做法通常是软件发布方提供一个哈希值，用户自己去比对，这种方法粗糙且存在诸多问题，比如：

- 编译的二进制代码真的来自于提供的源代码吗？
- 运行时程序是否可能自我修改？
- 不同环境下，代码的行为是否始终一致？

另外，还有一些棘手的问题需要解决，比如如何验证 TEE 的正确性以避免低级错误，或者如何快速地应用补丁。因为基于虚拟化的 TEE 完全依赖硬件厂商自行开发的软件来确保安全性，很多人不免担心，自己的安全性会被厂商的善意“捏在手里”。如果厂商出现问题（比如大规模裁员），维护 TEE 的安全性可能会受到严重影响。 例如，前文提到过的 TDX Module 如何去做测试，或者用形式化验证的方法去证明其安全性，也是一个很有意思的课题。

另一个大问题是，如果 CPU 的密钥被泄露，整个 TEE 的安全性就会失效，甚至无法挽救。因此，如何设计一种去中心化的 TEE 信任根（Root of Trust）机制成为一个非常有趣而且重要的课题。去中心化的信任根可以减少单点失效的风险，使得 TEE 的安全性不再完全依赖于单一厂商的“善心”或稳定性。这不仅能够增强可信计算的安全性，还能提升用户对 TEE 技术的信任度。