---
title: "从零写OS内核｜407：多核CPU的页表缓存同步--TLB Shootdown 是怎么回事"
date: 2026-08-10
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/2070270846145401677
---

**摘要**：在一个多核 CPU 上，一个核心修改了页表——其他核心的 TLB 里还缓存着旧的映射，这个矛盾怎么解决？答案是 **TLB Shootdown**：向所有其他核心发送**核间中断（IPI）**，强制它们刷新 TLB。Linux 内核在每次进程切换、内存映射变更时都在默默做这件事，但你可能从来没注意过它。

1. TLB 是什么复习一下

TLB（Translation Lookaside Buffer）是 CPU 内部的。

CPU 执行一条访问内存的指令时，先查 TLB：

- **TLB 命中** → 直接拿到物理地址，访存（1-2 个周期）
- **TLB 未命中** → 查页表，拿到物理地址，同时**把这条映射填入 TLB**（10-20 个周期）
TLB 容量很小（通常 L1 TLB 只有 64-128 条指令、64-128 条数据），所以 TLB 未命中的代价非常高。

**问题来了**：TLB 是每个 CPU 核心独立的。一个核心改了页表，其他核心的 TLB 里还有旧的映射——这时候该怎么办？

2. 为什么需要 Shootdown

看这个场景：

TEXT
Core 0 执行 munmap()，释放了一块内存
 → 内核修改了进程的页表，撤销了这段虚拟地址的映射
 → Core 0 的 TLB 里这条映射被清除了

Core 1、Core 2、Core 3 当时正在执行同一个进程的代码
 → 它们的 TLB 里还缓存着这块内存的旧映射
 → 如果它们访问这段虚拟地址 → TLB 命中 → 用旧映射访问 → 访问了不该访问的物理内存！

这就是 **Stale TLB**（过期 TLB 条目）问题。

解决方案：**修改页表的那个核心，必须通知所有其他核心「你们的 TLB 这条映射已经作废了，请刷新」**。这个动作叫 **TLB Shootdown**——一个核心开枪（修改页表），所有核心被迫刷新 TLB。

3. TLB Shootdown 的完整流程

TEXT
┌──────────────────────────────────────────────────────────┐
│ Core 0 调用 munmap()，修改了进程的页表         │
│                             │
│ 内核需要做两件事：                    │
│ 1. 自己刷新本地 TLB（本地 TLB flush）          │
│ 2. 通知其他所有核心刷新它们的 TLB（远程 TLB flush）   │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 1：本地 TLB 刷新                  │
│                             │
│ x86 指令：INVLPG (invalidata page)           │
│ invlpg [virt_addr] ← 让当前核心的 TLB 里这条条目失效 │
│                             │
│ 也可以用 CR3 重新加载（flush 整个 TLB）：        │
│ mov %cr3, %eax  ; 读出当前 CR3            │
│ mov %eax, %cr3  ; 写回，触发 flush          │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 2：向其他核心发送核间中断（IPI）          │
│                             │
│ x86 提供 IPI 机制：                   │
│ - APIC 寄存器：ICR（Interrupt Command Register）    │
│ - 发送函数：intel_send_ipi(dest, vector)        │
│                             │
│ 内核预先注册一个「TLB shootdown 中断处理函数」     │
│ 当其他核心收到这个 IPI → 执行这个函数 → 调用 INVLPG  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│ Step 3：所有核心刷新各自的 TLB             │
│                             │
│ Core 1 收到 IPI → 执行 shootdown handler        │
│  → 调用 invlpg( addr ) 刷新本地的 TLB         │
│                             │
│ Core 2、Core 3 同上                   │
│                             │
│ 等所有核心确认完成 → munmap() 返回           │
└──────────────────────────────────────────────────────────┘

4. Linux 里的 TLB Shootdown 实现

Linux 内核用一套通用的 **smp_call_function** 机制做跨核调用，关键函数：

C
// 向其他所有核心发送函数调用请求
smp_call_function(func, info, wait);
// func: 要执行的函数（这里是 TLB flush 函数）
// info: 传递给函数的参数（要 flush 的地址）
// wait: 是否等待所有核心完成

// 同时刷新本地
on_each_cpu(flush_func, addr, 1);

Linux 4.0 之前，多核 TLB flush 用的是**全局中断屏蔽**（`call_data_lock` + 调度 IPI），开销很大。

Linux 4.0 引入了 **tlb_gather_mmu** 和 **tlb_flush_mmu_free**，实现了**批量 flush**：多个页表修改合并成一次 shootdown，而不是每次修改都发一次 IPI。

核心数据结构：

C
struct mmu_gather {
 struct mm_struct *mm;
 unsigned long start; // 本批次要 flush 的起始地址
 unsigned long end; // 本批次要 flush 的结束地址
 int need_flush; // 是否有实际要 flush 的内容
 // ...
};

// munmap 时，不是立即 shootdown，而是把改动记录到 mmu_gather
// 等 batch 满了或 munmap 返回前，才调用 tlb_flush_mmu()
// tlb_flush_mmu() 一次性向所有核心发送 IPI，本批次所有地址一次 flush 完成

5. 从零实现：wandos 怎么写

wandos 目前还没有完整的 TLB shootdown 实现，以下是设计思路和关键代码框架：

5.1 定义 shootdown IPI 中断向量

CPP
// arch/x86/apic.h
#define TLB_SHOOTDOWN_VECTOR  0xEF  // 选择一个未使用的中断向量

// 注册 shootdown 中断处理函数
void arch_register_tlb_shootdown() {
 set_intr_handler(TLB_SHOOTDOWN_VECTOR, tlb_shootdown_handler);
}

5.2 发送 shootdown IPI 到指定核心

CPP
// arch/x86/smp.cpp

// 向单个核心发送 TLB flush 请求
void send_tlb_shootdown_ipi(int target_cpu, uintptr_t addr) {
 // 使用 APIC ICR（Interrupt Command Register）
 uint32_t icr_low = 0;
 icr_low |= (target_cpu << 24); // 目标 CPU 逻辑 ID
 icr_low |= (TLB_SHOOTDOWN_VECTOR); // 中断向量号
 icr_low |= APIC_ICR_INIT; // IPI 类型：Init

 // 实际发送时用 Fixed 类型
 outl(APIC_ICR_REG, icr_low | APIC_ICR_FIXED | APIC_ICR_ASSERT);
}

// 向所有其他核心广播 shootdown
void broadcast_tlb_shootdown(uintptr_t addr) {
 for (int i = 0; i < num_cpus; i++) {
 if (i != current_cpu_id) {
 send_tlb_shootdown_ipi(i, addr);
 }
 }
}

5.3 中断处理函数

CPP
// arch/x86/smp.cpp

// 其他核心收到 shootdown IPI 后执行这个函数
void tlb_shootdown_handler(uintptr_t addr) {
 // 用 INVLPG 让本地 TLB 里这条地址的映射失效
 // 注意：这里不能直接写汇编，要通过封装好的函数
 arch_invlpg(addr);

 // 如果 flush 整个 CR3（wandos 早期简化实现）
 // arch_flush_tlb();
}

// 简化实现：整个 TLB flush（wandos 还没实现细粒度 flush）
void arch_flush_tlb() {
 // 重新加载 CR3，触发整个 TLB flush
 uint64_t cr3_val = read_cr3();
 write_cr3(cr3_val); // x86 只要写 CR3 就 flush TLB
}

void arch_invlpg(uintptr_t addr) {
 asm volatile(&#34;invlpg (%0)&#34; :: &#34;r&#34;(addr) : &#34;memory&#34;);
}

5.4 munmap 里的 shootdown 调用

CPP
// kernel/memory/paging.cpp

int do_munmap(uintptr_t addr, size_t len) {
 // 1. 从页表中撤销这段虚拟地址的映射
 unmap_range(addr, len);

 // 2. 本地 TLB flush（修改页表的核心自己也要刷新）
 arch_invlpg(addr);

 // 3. 向其他所有核心广播 shootdown
 //  wandos 目前没有 SMP，所以 broadcast_tlb_shootdown 是空操作
 //  未来支持多核后，这里要调用 broadcast_tlb_shootdown(addr)
 if (smp_enabled) {
 broadcast_tlb_shootdown(addr);
 }

 return 0;
}

**wandos 当前实现的差距**：wandos 是单核操作系统，`smp_enabled` 始终为 false，所以 TLB shootdown 实际上不执行。但代码框架已经搭好，扩展到多核时只需要实现 `send_tlb_shootdown_ipi` 和 `arch_register_tlb_shootdown`。

6. Linux 实践：观察 TLB shootdown

在真实 Linux 系统上，可以观察 TLB shootdown 的效果：

BASH
# 查看当前系统的 CPU 核心数
nproc
# 输出：8 （你有 8 个核心）

# 用 perf 统计 TLB 相关事件
perf stat -e dTLB-loads,dTLB-load-misses,iTLB-loads,iTLB-load-misses \
 ./your_program
# 观察输出：
#  dTLB-loads:    1,234,567
#  dTLB-load-misses:   12,345  # 每次 miss 要查页表
#  iTLB-loads:     987,654
#  iTLB-load-misses:   8,765  # 分支预测失败也触发 TLB miss

**观察多核 shootdown 的效果**：写一个程序频繁 `munmap` + `mmap`，用 `perf sched` 观察核间调度：

BASH
# 记录调度事件
perf sched record -a sleep 5
# 查看延迟（包含 IPI 开销）
perf sched latency

7. 为什么 Shootdown 是个性能瓶颈

TLB shootdown 的开销主要在：

- **IPI 发送延迟**：从核心 A 发出 IPI，到核心 B 的 handler 执行，有 100-1000ns 的延迟
- **锁竞争**：shootdown 时其他核心可能被中断打断，影响正在执行的计算
- **TLB 内容丢失**：flush 之后，所有被冲掉的 TLB 条目都要重新从页表加载
这就是为什么 Linux 要做**批量 flush**——把 100 次 munmap 合并成一次 shootdown，而不是每 munmap 一次就发 7 次 IPI（假设 8 核）。

对于性能敏感的服务器程序，**减少系统调用频率**（用 `mmap`/`munmap` 批量操作）比什么都有效。

8. 踩坑与注意事项

**坑 1：SMP 关闭时 shootdown 不存在**

**坑 2：INVLPG 是异步的**

解法：在 `invlpg` 之后加一个 `jmp` 或 `mfence`（`asm volatile(&#34;mfence&#34;)`），强制 CPU 等待刷新完成。

**坑 3：TLB shootdown 和上下文切换的顺序**

进程 A 在 Core 0 上运行时修改了页表，发出 shootdown IPI 到 Core 1。但 Core 1 正在调度器手里，马上要切换到进程 B——如果 shootdown IPI 晚了一步到，Core 1 可能在新进程里还带着旧进程的 TLB 条目（安全漏洞！）。

Linux 的解决：用 `CR3` 切换时的**自动 flush**（每个进程有独立的页表，切换页表自然 flush），加上 `flush_tlb_mm()` 在进程切换时无条件清空。

写在最后

TLB shootdown 是多核操作系统里一个看不见的「交通管制」——每次页表修改，所有核心都必须停下来配合刷新。没有它，多核并行就是一个随时会崩溃的空架子。

**核心收获**：多核 OS 里，修改页表不是一个核心的事，而是所有核心的协调动作。shootdown IPI 是这个协调的底层机制。

**wandos 现状**：当前是单核实现，shootdown 代码框架已搭好，但 `send_tlb_shootdown_ipi` 和 APIC 初始化尚未实现。这是 wandos 向 SMP 多核扩展的第一步。

相关阅读

- Linux Kernel Source: `arch/x86/mm/tlb.c`（Linux 的 TLB flush 实现）
- Linux Kernel Source: `arch/x86/kernel/apic/apic.c`（APIC IPI 发送）
- 本文 Demo: [https://github.com/golang12306/os-kernel-from-scratch](https://link.zhihu.com/?target=https%3A//github.com/golang12306/os-kernel-from-scratch) (demos/tlb/)
- [https://github.com/zhangfuwen/wandos](https://link.zhihu.com/?target=https%3A//github.com/zhangfuwen/wandos) — Linux 内核教程

动手环节

想深入理解 TLB shootdown？动手实践是最好的方式：

**今天的目标**：为 wandos 实现一个简化版的 TLB shootdown 机制。

- **下载 wandos**：

`bash
   git clone https://github.com/zhangfuwen/wandos.git
   cd wandos`

- **找到对应模块**：查看 `kernel/memory/paging.cpp` 和 `arch/x86/smp.cpp`

- **实现作业**：在 `arch/x86/smp.cpp` 中实现 `send_tlb_shootdown_ipi()` 函数，使用 APIC ICR 向指定核心发送 TLB flush IPI。在 `kernel/memory/paging.cpp` 的 `do_munmap()` 中调用它。

- **提交作业**：Fork 仓库，提交你的改动，在 GitHub 上开一个 Pull Request

**提示**：wandos 目前是单核，`num_cpus` 为 1，所以 `broadcast_tlb_shootdown()` 是空操作。你可以把 `num_cpus` 改成 2 来模拟双核场景，观察 IPI 是否正确发送到两个核心。

**仓库**：[https://github.com/golang12306/os-kernel-from-scratch](https://link.zhihu.com/?target=https%3A//github.com/golang12306/os-kernel-from-scratch)