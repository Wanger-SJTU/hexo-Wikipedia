---
title: "探秘 AMD NPU 的底层编程接口，对比和高通 NPU 的差异"
date: "2026-03-26 00:00:00"
updated: "2026-03-26 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/探秘-AMD-NPU-的底层编程接口,对比和高通-NPU-的差异/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2020396235404617501"
---


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8a3f4eeeac82.jpg)

AMD NPU 是所有民用 NPU 里最开放的。相比 Intel NPU 那种只能给个计算图的黑盒。AMD NPU告诉你了，它是一块拥有独立处理器核心、512-bit 向量单元、硬件乘累加引擎的<strong>空间计算阵列</strong>。而且，它的工具链是完全开源的。

本文基于一台搭载 Ryzen 7 7840S（XDNA1, Phoenix）的联想笔记本上的实际实验。我们会从 `lspci` 一路深入到反汇编出来的 VLIW 机器码，最后对比 XDNA2（Strix Point）的架构升级。

#### 目录

- [芯片在哪里](https://zhuanlan.zhihu.com/write#%E8%8A%AF%E7%89%87%E5%9C%A8%E5%93%AA%E9%87%8C)
- [架构：一个 2D 处理器阵列](https://zhuanlan.zhihu.com/write#%E6%9E%B6%E6%9E%84%E4%B8%80%E4%B8%AA-2d-%E5%A4%84%E7%90%86%E5%99%A8%E9%98%B5%E5%88%97)
- [计算 Tile：裸机 VLIW 处理器](https://zhuanlan.zhihu.com/write#%E8%AE%A1%E7%AE%97-tile%E8%A3%B8%E6%9C%BA-vliw-%E5%A4%84%E7%90%86%E5%99%A8)
- [指令集：从 C++ 到 128-bit VLIW](https://zhuanlan.zhihu.com/write#%E6%8C%87%E4%BB%A4%E9%9B%86%E4%BB%8E-c-%E5%88%B0-128-bit-vliw)
- [三个实验：标量、向量、MAC](https://zhuanlan.zhihu.com/write#%E4%B8%89%E4%B8%AA%E5%AE%9E%E9%AA%8C%E6%A0%87%E9%87%8F%E5%90%91%E9%87%8Fmac)
- [数据搬运：DMA 和硬件锁](https://zhuanlan.zhihu.com/write#%E6%95%B0%E6%8D%AE%E6%90%AC%E8%BF%90dma-%E5%92%8C%E7%A1%AC%E4%BB%B6%E9%94%81)
- [从 Python 到硅片：完整编译流水线](https://zhuanlan.zhihu.com/write#%E4%BB%8E-python-%E5%88%B0%E7%A1%85%E7%89%87%E5%AE%8C%E6%95%B4%E7%BC%96%E8%AF%91%E6%B5%81%E6%B0%B4%E7%BA%BF)
- [内核驱动：/dev/accel/accel0](https://zhuanlan.zhihu.com/write#%E5%86%85%E6%A0%B8%E9%A9%B1%E5%8A%A8devaccelaccel0)
- [工具链全景](https://zhuanlan.zhihu.com/write#%E5%B7%A5%E5%85%B7%E9%93%BE%E5%85%A8%E6%99%AF)
- [XDNA2：从 10 TOPS 到 50 TOPS](https://zhuanlan.zhihu.com/write#xdna2%E4%BB%8E-10-tops-%E5%88%B0-50-tops)
- [和其他 NPU 的对比](https://zhuanlan.zhihu.com/write#%E5%92%8C%E5%85%B6%E4%BB%96-npu-%E7%9A%84%E5%AF%B9%E6%AF%94)
- [参考资料](https://zhuanlan.zhihu.com/write#%E5%8F%82%E8%80%83%E8%B5%84%E6%96%99)

#### 芯片在哪里

$ lspci -nn | grep IPU
c4:00.1 Signal processing controller [1180]: AMD IPU Device [1022:1502]

$ ls -la /dev/accel/accel0
crw-rw---- 1 root render 261, 0 Mar 19 07:04 /dev/accel/accel0

$ xrt-smi examine
Device(s) Present
|BDF             |Name         |Architecture  |Topology  |
|----------------|-------------|--------------|----------|
|[0000:c4:00.1]  |NPU Phoenix  |aie2          |6x5       |

NPU 以 PCI 设备的形式挂在系统总线上。内核驱动 `amdxdna`（Linux 6.14+ 主线内核自带）创建了 `/dev/accel/accel0` 设备节点。固件版本 1.5.5.391。

“Phoenix” 是这一代 NPU 的代号（XDNA1），`aie2` 是架构代号（AI Engine 第 2 代，也叫 AIE-ML），`6x5` 是拓扑（6 行 × 5 列，含 Shim 行）——但这不是都是计算核心。

#### 架构：一个 2D 处理器阵列

AMD 把这块 NPU 叫做 <strong>XDNA</strong>，但它的真名是 <strong>AI Engine (AIE)</strong>，技术源自 Xilinx（2022 年被 AMD 收购）的 Versal FPGA 产品线。

它不是 GPU 那种 SIMT 架构，也不是 Google TPU 那种脉动阵列。它是一个 <strong>2D 空间计算阵列</strong>——一组独立的处理器 tile 排列在二维网格上，通过片上网络连接。

Phoenix NPU 的 `6x5` 拓扑实际上是 6 行 × 5 列（含一个隐藏的第 0 列），可用的是 4 列：

Col 1    Col 2    Col 3    Col 4
        ┌────────┬────────┬────────┬────────┐
Row 5   │Compute │Compute │Compute │Compute │  ← 计算 tile
Row 4   │Compute │Compute │Compute │Compute │  ← 计算 tile
Row 3   │Compute │Compute │Compute │Compute │  ← 计算 tile
Row 2   │Compute │Compute │Compute │Compute │  ← 计算 tile (共 16 个)
        ├────────┼────────┼────────┼────────┤
Row 1   │MemTile │MemTile │MemTile │MemTile │  ← 内存 tile (L2, 共 2 MB)
        ├────────┼────────┼────────┼────────┤
Row 0   │  Shim  │  Shim  │  Shim  │  Shim  │  ← 接口 tile
        └────────┴────────┴────────┴────────┘
                              ↕
                         Host DDR (L3)

三种 tile 各司其职：

<strong>计算 Tile</strong>（4 行 × 4 列 = 16 个）：每个都是一个独立的处理器，有自己的程序存储器、数据暂存器和向量单元。这是干活的地方。

<strong>内存 Tile</strong>（1 行 × 4 个）：L2 级别的 SRAM。每个 512 KB，共 2 MB。内含 6 个 DMA 引擎，支持 4D 地址生成——意味着它能自动做矩阵转置、零填充、跨步访问，全部硬件完成。

<strong>Shim Tile</strong>（1 行 × 4 个）：接口层。负责 NPU 与主机 DDR 之间的数据搬运。通过 DMA 引擎把数据从 DDR 搬进内存 tile，再从内存 tile 分发到计算 tile。

#### 计算 Tile：裸机 VLIW 处理器

每个计算 tile 本质上是一个<strong>微型裸机处理器</strong>：

资源规格程序存储器16 KB（最多 1024 条 128-bit 指令）L1 数据暂存器64 KB SRAM标量寄存器32 × 32-bit向量寄存器16 × 512-bit累加器寄存器8 × 768-bit硬件锁64 个这里没有操作系统。没有中断控制器。没有 MMU。没有缓存（L1 是显式管理的暂存器）。程序被加载到 16 KB 程序存储器后，核心就开始从地址 0 执行，一直跑到 `done` 指令为止。

处理器架构是 <strong>VLIW（Very Long Instruction Word）</strong>，每条指令最宽 128 bit，可以编码最多 6 个并行操作：

128-bit 指令字:
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  标量控制 │ 地址生成  │ 加载/存储 │ 标量运算  │ 数据移动  │ 向量运算  │
│  (nopb)  │  (nopa)  │  (nops)  │  (nopx)  │  (nopm)  │  (nopv)  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

最关键的特性：<strong>暴露流水线（exposed pipeline）</strong>。加载指令发出后，数据不会立刻可用——硬件不会自动 stall。编译器必须在加载和使用之间静态插入正确数量的 nop（或其他不冲突的指令）。如果你插少了 nop，读到的是旧值，不是错误。这和 x86/ARM 的乱序执行完全相反。

#### MAC 单元：NPU 的心脏

每个计算 tile 的核心是一个 <strong>512-bit 向量 MAC 单元</strong>：

数据类型每周期乘累加次数INT4 × INT8512INT8 × INT8256INT16 × INT1664INT32 × INT3216BF16 × BF1612816 个 tile 合计：256 × 16 = 4096 INT8 MAC/周期。以 ~1.25 GHz 平均频率计算，约 <strong>10 TOPS (INT8)</strong>。

这不是一个矩阵乘法加速器——每个 tile 是一个<strong>通用处理器加上一个强大的 MAC 单元</strong>。

#### 指令集：从 C++ 到 128-bit VLIW

#### ISA 公开程度

AMD 没有发布传统意义上的 ISA 参考手册（没有像 ARM Architecture Reference Manual 那样的文档）。但指令集信息分散在几个公开来源中：

来源内容获取方式AM020 架构手册 [http://docs.amd.com/r/en-US/am020-versal-aie-ml](https://link.zhihu.com/?target=http%3A//docs.amd.com/r/en-US/am020-versal-aie-ml)寄存器文件、功能单元、数据通路描述免费下载UG1079 内核编程指南 [http://docs.amd.com/r/en-US/ug1079-ai-engine-kernel-coding](https://link.zhihu.com/?target=http%3A//docs.amd.com/r/en-US/ug1079-ai-engine-kernel-coding)intrinsic 到硬件的映射免费下载Xilinx/llvm-aie [http://github.com/Xilinx/llvm-aie](https://link.zhihu.com/?target=http%3A//github.com/Xilinx/llvm-aie)完整的二进制编码（TableGen .td 文件）Apache 2.0 开源llvm-objdump -d 输出实际反汇编上面的工具即可换句话说：<strong>所有信息都能获取，但要你自己拼</strong>。架构手册告诉你有什么功能单元，LLVM 源码告诉你每条指令怎么编码，objdump 告诉你编译器实际生成了什么。

#### 指令格式

AIE2 的指令是变长的：

长度格式说明2 字节短指令nop, 简单标量操作4-6 字节中长指令1-2 个并行操作8-12 字节长指令2-3 个并行操作16 字节满 VLIW最多 6 个并行操作一个真实的 16 字节满 VLIW 指令：

c0 03 00 88 03 00 18 12 82 cd 0c 02 00 00 00 00
# 反汇编为:

```text
nopb; nopa; vst.srs.s32.s64 bml3, s0, [p2, #0x0]; add r1, r1, #0x10; nopm; nopv
```

#  ↑     ↑    ↑                                    ↑                   ↑     ↑
# 控制  地址  向量存储+饱和右移                     标量加法            移动  向量

6 个槽位中，2 个在干活（向量存储 + 标量循环计数），4 个是 nop。这很正常——不是每个周期都能填满所有槽位。

#### 三个实验：标量、向量、MAC

我写了三个 C++ 内核，编译后在真实 NPU 硬件上运行（全部 PASS），然后反汇编出机器码。

#### 实验 1：纯标量 C——裸机可编程性

源码：

extern "C" {

```cpp
void add_one_scalar(int32_t *in, int32_t *out, int32_t N) {
  for (int i = 0; i 
```


最普通的 C 代码。编译后加载到计算 tile 的 16 KB 程序存储器中执行。反汇编出的核心循环：

; === 零开销硬件循环 ===

```x86asm
add.nc  lc, r0, #0x0         ; lc(loop count) = N
```

movxm   ls, #0x200            ; ls(loop start) = 循环体起始地址
movxm   le, #0x270            ; le(loop end) = 循环体结束地址

```text
                               ; 到达 le 时自动跳回 ls，零周期开销
```


; === 循环体：每次处理 1 个 int32 ===
lshl    r2, r1, r0            ; r2 = i 

<strong>关键观察</strong>：

- `add.nc lc, r0, #0` / `movxm ls` / `movxm le` — <strong>零开销硬件循环</strong>。硬件用三个专用寄存器（lc/ls/le）实现循环，不需要比较和跳转指令。`lc` 每次递减，到 0 时退出。循环回跳完全由硬件完成，不消耗任何周期。
- 5 个 `nop` — 暴露流水线的代价。`lda` 到数据可用需要 7 个周期，编译器必须显式填充。这些 nop 不是”浪费”——它们是 ISA 设计的核心特征。
- `lshl` + `mov dj0` — 地址计算用了两条指令。`dj0` 是专用的地址偏移寄存器，和地址指针 `p0` 组合使用。这种分离设计允许地址计算和数据访问在不同功能单元并行执行。
<strong>编译后 .text 段大小：736 字节</strong>（16 KB 程序存储器的 4.5%）。

#### 实验 2：向量 intrinsic——512-bit SIMD

源码：

#include 

extern "C" {

```cpp
void add_one_vector(int32_t *in, int32_t *out, int32_t N) {
  constexpr int VEC_SIZE = 16;   // 512-bit / 32-bit = 16 lanes
  for (int i = 0; i  v = aie::load_v(in + i);
    aie::vector r = aie::add(v, (int32_t)1);
    aie::store_v(out + i, r);
  }
}
}
```


和实验 1 做同样的事（每个元素 +1），但用向量指令一次处理 16 个 int32。反汇编：

; === 准备：广播标量 1 到 512-bit 向量寄存器 ===
vbcst.32  x0, r2              ; x0[0:15] = broadcast(1)

```text
                                ; 把标量 r2=1 复制到 16 个 lane
```


; === 核心循环：每次处理 16 个 int32 = 512 bits ===
vlda  wh2, [p2, #0x20]        ; 向量加载高半: wh2 = in[i+8..i+15]   ← 256-bit
vlda  wl2, [p2, #0x0]         ; 向量加载低半: wl2 = in[i+0..i+7]   ← 256-bit

```text
                                ; wl2 + wh2 拼成完整的 512-bit 向量 x2
      ... (nop 等待) ...
```

vadd.32  x4, x0, x2           ; 512-bit 向量加法: x4 = x0 + x2

```text
                                ; 16 路 int32 并行加！              ← 512-bit
      ... (1 cycle) ...
```

vst  wh4, [p2, #0x20]         ; 向量存储高半                        ← 256-bit
vst  wl4, [p2, #0x0]          ; 向量存储低半                        ← 256-bit

```x86asm
add  r1, r1, #0x10            ; i += 16
```


<strong>关键观察</strong>：

- `vbcst.32 x0, r2` — <strong>向量广播</strong>。把标量值复制到 512-bit 向量寄存器的全部 16 个 lane。这对应 `aie::add(v, (int32_t)1)` 中隐含的标量到向量提升。
- `vlda wl2` / `vlda wh2` — 向量加载分两次。L1 数据端口宽度是 256-bit，所以 512-bit 向量要用两拍加载（低半 `wl` + 高半 `wh`）。这是硬件限制，不是编译器选择。
- `vadd.32 x4, x0, x2` — 一条指令完成 16 个 int32 加法。`x4`、`x0`、`x2` 都是 512-bit 向量寄存器。`.32` 后缀表示按 32-bit 元素粒度操作。
- 循环步长从 1 变成了 16（`add r1, r1, #0x10`）。
<strong>编译后 .text 段大小：752 字节</strong>（只比标量版多 16 字节！向量指令密度非常高）。

#### 实验 3：硬件 MAC——NPU 的核心计算原语

源码：

#include 

extern "C" {

```cpp
void mul_vector(int32_t *in, int32_t *out, int32_t *factor, int32_t N) {
  constexpr int VEC_SIZE = 16;
  int32_t f = *factor;
  for (int i = 0; i  v = aie::load_v(in + i);
    aie::accum acc = aie::mul(v, f);
    aie::store_v(out + i, acc.template to_vector(0));
  }
}
}
```


这里用了 `aie::mul` 返回 `acc64` 累加器——直接调用硬件 MAC 单元。反汇编出来比前两个复杂得多：

; === 准备 ===
lda     r4, [p2, #0]           ; r4 = *factor (标量加载)
vbcst.32  x4, r4               ; x4[0:15] = broadcast(factor)

; === 核心计算：vmul + 3×vmac 流水线 ===
vlda  wh6, [p2, #0x20]         ; 加载输入向量 (高半)
vlda  wl6, [p2, #0x0]          ; 加载输入向量 (低半)  → x6

vshuffle  x8, x6, x0, r0       ; 数据重排 #1: 偶数位元素
vmul   cm0, x8, x4, r4         ; 硬件乘法: cm0 = x8 × x4 → 768-bit 累加器!

vshuffle  x10, x6, x0, r3      ;┐ 数据重排 #2: 奇数位元素
vmac   cm1, cm0, x8, x2, r2    ;┘ 乘累加: cm1 = cm0 + x8 × x2

```text
                                ; ↑ 两条指令并行！VLIW 的威力
```


vmac   cm2, cm1, x10, x4, r5   ; 乘累加 #3
vmac   cm3, cm2, x10, x2, r6   ; 乘累加 #4

; === 累加器 → 内存（带饱和右移）===
vst.srs.s32.s64  bmh3, s0, [p2, #0x20]  ; acc64 → int32 + 存储 (高半)
vst.srs.s32.s64  bml3, s0, [p2, #0x0]   ; acc64 → int32 + 存储 (低半)

<strong>关键观察</strong>：

- **为什么一个 `aie::mul(v, f)` 变成了 4 步 vmul/vmac？**
因为 MAC 单元的物理数据通路无法在一拍内完成 16 个 int32×int32 乘法。编译器把它拆成了 4 步，交替处理偶数位和奇数位元素。`vshuffle` 负责把数据重排成 MAC 单元期望的格式。这是编译器对硬件微架构的深度理解——用户写 `aie::mul`，编译器知道该拆成几步、怎么排数据。

- <strong>VLIW 并行执行</strong>：
vshuffle  x10, x6, x0, r3   ; 向量重排单元
   vmac   cm1, cm0, x8, x2, r2  ; MAC 单元

这两条在同一个 128-bit VLIW 指令字中，使用不同的功能单元，在同一个周期执行。

- **`cm0`-`cm3` 是 768-bit 累加器寄存器**：比 512-bit 向量寄存器更宽，专门用于防止乘累加溢出（16 个 64-bit 累加器 = 1024-bit，打包在 768-bit 物理寄存器中）。
- **`vst.srs.s32.s64`<strong>——三个操作合一：</strong> 

- S**hift: 右移（由 `s0` 寄存器指定移位量）
- <strong>R</strong>ound: 舍入
- <strong>S</strong>aturate: 饱和（64-bit → 32-bit，防止截断溢出）

这条指令直接从累加器读数据、截断、存储到内存，一拍完成。

编译后 .text 段大小：1392 字节**（16 KB 的 8.5%，MAC 版本显著更大）。

#### 三个实验的指令对比

实验 1 (标量)实验 2 (向量)实验 3 (MAC)加载lda (32-bit)vlda wl/wh (2×256-bit)vlda wl/wh (2×256-bit)计算add r2, r2, #1vadd.32 x4, x0, x2vmul + 3×vmac存储st (32-bit)vst wl/wh (2×256-bit)vst.srs.s32.s64每次处理1 个 int3216 个 int3216 个 int32 × int32使用的硬件标量 ALU向量 ALUMAC 引擎 + 累加器.text 大小736 B752 B1392 B
#### 数据搬运：DMA 和硬件锁

NPU 上的数据搬运全部由 DMA 硬件完成，和计算完全解耦。这是空间计算架构的核心设计：<strong>计算和通信并行</strong>。

#### 三级存储层次

```text
Host DDR (GB 级)
    ↕  Shim Tile DMA
Memory Tile SRAM (512 KB/tile, 共 2560 KB)
    ↕  Memory Tile DMA (6 个引擎/tile)
Compute Tile SRAM (64 KB/tile)
```


#### ObjectFIFO：抽象 DMA 的 Buffer 描述符

在 IRON 框架中，数据搬运通过 ObjectFIFO 抽象：

```text
of_in = ObjectFifo(tile_ty, name="in")    # Host → Compute Tile
of_out = ObjectFifo(tile_ty, name="out")   # Compute Tile → Host
```


编译后，这变成 DMA buffer 描述符配置和硬件锁。在 LLVM IR 中可以看到：

```x86asm
call void @llvm.aie2.acquire(i32 49, i32 -1)   ; 等 DMA 填好输入 buffer
call void @llvm.aie2.acquire(i32 50, i32 -1)   ; 等输出 buffer 可用
call void @add_one_scalar(...)                   ; 计算
call void @llvm.aie2.release(i32 48, i32 1)     ; 通知 DMA: 输入已读完
call void @llvm.aie2.release(i32 51, i32 1)     ; 通知 DMA: 输出已写好
```


对应的机器码：

acq  #0x31, r16    ; acquire lock #49, value = -1 (等待)
acq  #0x32, r16    ; acquire lock #50, value = -1 (等待)
jl   #add_one_scalar  ; 调用内核
rel  #0x30, r17    ; release lock #48, value = 1  (通知)
rel  #0x33, r17    ; release lock #51, value = 1  (通知)

acq`（acquire）和 `rel`（release）是 tile 与 DMA 之间**唯一的同步原语**。没有中断，没有轮询，没有信号量——就是硬件锁。当锁不满足条件时，核心**阻塞**在 `acq` 指令上，硬件停止取指，直到 DMA 改变锁状态。

#### 双缓冲

IRON 自动生成双缓冲：两组 buffer（`buff_0` 和 `buff_1`），两对锁。当计算 tile 处理 `buff_0` 时，DMA 可以同时填充 `buff_1`。从 LLVM IR 可以看到循环被展开成：

acquire(49, -1); acquire(50, -1)

```x86asm
call @add_one_scalar(@in_cons_buff_0, @out_buff_0, 256)  ; 处理 buffer 0
```

release(48, 1);  release(51, 1)

acquire(49, -1); acquire(50, -1)

```x86asm
call @add_one_scalar(@in_cons_buff_1, @out_buff_1, 256)  ; 处理 buffer 1
```

release(48, 1);  release(51, 1)

DMA 在后台搬运数据，计算核心只需要等锁。这种计算/通信重叠是 NPU 高吞吐量的关键。

#### 从 Python 到硅片：完整编译流水线

一个 NPU 程序的编译过程涉及多个阶段，最终产出两个二进制文件：

```text
Python (IRON)
    ↓  iron.jit / aiecc
MLIR (aie dialect)           ← 中间表示：tile 拓扑 + 数据流
    ↓  mlir-aie compiler
LLVM IR (.ll)                ← 每个 tile 的控制流 + 内核调用
    ↓  Peano (llvm-aie)
AIE ELF (.elf)               ← 每个 tile 的机器码
    ↓  打包
```

XCLBIN                       ← 最终二进制（ELF + DMA 配置 + 路由表）

#### 阶段 1: Python → MLIR

IRON 的 Python API 描述了数据流和计算任务，`resolve_program()` 将其编译为 MLIR：

module {

```text
  aie.device(npu1) {
    %tile_0_2 = aie.tile(0, 2)
    %shim_0_0 = aie.tile(0, 0)
    aie.objectfifo @in(%shim_0_0, {%tile_0_2}, 2 : i32) : !aie.objectfifo>
    aie.objectfifo @out(%tile_0_2, {%shim_0_0}, 2 : i32) : !aie.objectfifo>

    %core_0_2 = aie.core(%tile_0_2) {
      scf.for ... {
        %0 = aie.objectfifo.acquire @in(Consume, 1)
        %1 = aie.objectfifo.acquire @out(Produce, 1)
        func.call @add_one_scalar(%0, %1, 256)
        aie.objectfifo.release @in(Consume, 1)
        aie.objectfifo.release @out(Produce, 1)
      }
    }

    aie.runtime_sequence(%arg0: memref, %arg1: memref) {
      %0 = aiex.dma_configure_task_for @in { ... }
      aiex.dma_start_task(%0)
      ...
    }
  }
}
```


这是一种空间数据流的声明式描述：哪些 tile 参与计算，数据怎么流动，每个 tile 跑什么代码。

#### 阶段 2: MLIR → LLVM IR

aie.objectfifo.acquire` / `release` 被 lowering 为 `@llvm.aie2.acquire` / `@llvm.aie2.release` intrinsic。双缓冲逻辑被展开。外部内核函数保持为 `declare`，等链接时合并。

#### 阶段 3: LLVM IR + 内核 .o → ELF

Peano 编译器（`clang --target=aie2-none-unknown-elf`）把 C++ 内核编译为 `.o`，然后和 MLIR 生成的 `.o` 链接成 ELF。链接脚本指定了内存布局：

- `.text` 段 → 程序存储器 (16 KB)
- 外部符号 `@in_cons_buff_0` 等 → 绑定到 L1 暂存器中的固定地址

#### 阶段 4: ELF + DMA 配置 → XCLBIN

最终的 XCLBIN 包含：

- <strong>Overlay</strong>：ELF 二进制 + 流交换路由配置
- <strong>Ctrlcode</strong>：DMA 命令序列（`XAIE_IO_BLOCKWRITE` 等），由 ERT 微控制器执行

#### 内核驱动：/dev/accel/accel0

amdxdna` 内核驱动从 Linux 6.14 开始进入主线。用户空间通过 DRM ioctl 与 NPU 交互：

enum amdxdna_drm_ioctl_id {
    DRM_AMDXDNA_CREATE_HWCTX,    // 创建硬件上下文（分配 tile 分区）
    DRM_AMDXDNA_DESTROY_HWCTX,   // 销毁硬件上下文
    DRM_AMDXDNA_CREATE_BO,       // 创建 Buffer Object（NPU 可见内存）
    DRM_AMDXDNA_GET_BO_INFO,     // 查询 BO 信息
    DRM_AMDXDNA_SYNC_BO,         // 同步 BO（CPU ↔ NPU 缓存一致性）
    DRM_AMDXDNA_EXEC_CMD,        // 提交执行命令
    DRM_AMDXDNA_GET_INFO,        // 查询设备信息
    DRM_AMDXDNA_SET_STATE,       // 设置设备状态

```text
};
```


执行流程：

- `CREATE_HWCTX` — 分配一个 NPU 分区（一组 tile + 内存）
- `CREATE_BO` — 分配 NPU 可访问的内存（通过 IOMMU/SVA 共享地址空间）
- `EXEC_CMD` — 提交 XCLBIN + 参数，NPU 开始执行
- 等待 DRM syncobj 信号完成
XRT（Xilinx Runtime）封装了这些 ioctl，提供 C++ API。但理论上，你可以直接用 ioctl 与 NPU 交互——UAPI 头文件是公开的。

#### Ctrlcode：NPU 的”微程序”

DMA 配置不是直接写寄存器，而是打包成 ctrlcode——一系列事务操作码：

```text
typedef enum {
    XAIE_IO_WRITE,              // 写单个寄存器
    XAIE_IO_BLOCKWRITE,         // 批量写寄存器（配置 DMA 描述符）
    XAIE_IO_MASKWRITE,          // 带掩码写（修改寄存器的特定位）
    XAIE_IO_MASKPOLL,           // 轮询等待寄存器值
    XAIE_CONFIG_SHIMDMA_BD,     // 配置 Shim DMA 描述符
    XAIE_IO_CUSTOM_OP_DDR_PATCH, // DDR 地址补丁（运行时绑定）
```

} XAie_TxnOpcode;

这些操作码被 NPU 内部的 ERT（Embedded Runtime）微控制器解释执行。ERT 是 NPU 芯片内的一个小 ARM 核，负责管理 tile 启停、DMA 配置和同步。

#### 工具链全景

┌──────────────────────────────┐

```text
                   │       用户应用 (Python)        │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │   IRON (aie.iron Python API)  │ ← pip install mlir_aie
                   │   定义: tile 拓扑、数据流、任务  │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │      MLIR-AIE 编译器           │ ← 开源 (mlir-aie)
                   │   MLIR aie dialect → LLVM IR   │
                   └──────────────┬───────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                    │
   ┌──────────▼──────────┐  ┌────▼─────────────┐  ┌───▼──────────┐
   │  Peano (llvm-aie)   │  │  DMA 配置生成器   │  │ 路由生成器    │
   │  C++ → AIE ELF      │  │  ctrlcode 生成    │  │ 流交换路由表  │
   │  开源 (Apache 2.0)  │  │                   │  │              │
   └──────────┬──────────┘  └────┬─────────────┘  └───┬──────────┘
              │                   │                    │
              └───────────────────┼────────────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │        XCLBIN 打包            │
                   │  ELF + ctrlcode + 路由 → .xclbin│
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │     XRT (Xilinx Runtime)      │ ← 开源
                   │   加载 XCLBIN, 管理 BO, 执行   │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │   amdxdna 内核驱动             │ ← Linux 主线 (6.14+)
                   │   /dev/accel/accel0            │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────▼───────────────┐
                   │          NPU 硬件             │
                   │   16/32 AIE tiles + DMA + ERT │
                   └──────────────────────────────┘
```


组件开源？获取方式IRON (Python API)是pip install mlir_aieMLIR-AIE 编译器是同上Peano (LLVM AIE backend)是 (Apache 2.0)pip install llvm-aieChess (私有编译器)否Vitis AIE Essentials (多 GB)XRT 运行时是从 xdna-driver 源码编译amdxdna 内核驱动是Linux 6.14+ 主线内核AIE API intrinsic 头文件是随 mlir_aie 安装AM020 架构手册是[http://docs.amd.com](https://link.zhihu.com/?target=http%3A//docs.amd.com) 免费下载ISA 编码 (TableGen)是[http://github.com/Xilinx/llvm-aie](https://link.zhihu.com/?target=http%3A//github.com/Xilinx/llvm-aie)全开源路线（Peano + IRON + XRT）可以完成从 Python 到硬件执行的全流程，无需任何私有工具。本文的三个实验就是用这条路线完成的。

#### XDNA2：从 10 TOPS 到 50 TOPS

本文的实验都在 XDNA1（Phoenix, Ryzen 7040/8040）上完成。2024 年底 AMD 发布了 <strong>XDNA2</strong>（Strix Point, Ryzen AI 300），算力从 10 TOPS 跳到 50 TOPS——5 倍提升。这不是简单的堆核，而是三个维度同时翻倍。

#### 三个乘法因子

维度XDNA1 (Phoenix)XDNA2 (Strix Point)倍数计算 tile 数量16 (4列×4行)32 (8列×4行)2×INT8 MAC/周期/tile2565122×时钟频率~1.0 GHz~1.8 GHz~1.8×16 × 256 × 1.0G = 8.2 TOPS → 32 × 512 × 1.8G ≈ <strong>59 TOPS</strong>（理论峰值，标称 50 TOPS）。

#### 阵列拓扑对比

XDNA1（Phoenix）——4 列：

Col 0    Col 1    Col 2    Col 3
        ┌────────┬────────┬────────┬────────┐
Row 5   │Compute │Compute │Compute │Compute │
Row 4   │Compute │Compute │Compute │Compute │
Row 3   │Compute │Compute │Compute │Compute │
Row 2   │Compute │Compute │Compute │Compute │  16 个计算 tile
        ├────────┼────────┼────────┼────────┤
Row 1   │MemTile │MemTile │MemTile │MemTile │  4 × 512 KB = 2 MB L2
        ├────────┼────────┼────────┼────────┤
Row 0   │  Shim  │  Shim  │  Shim  │  Shim  │
        └────────┴────────┴────────┴────────┘

XDNA2（Strix Point）——8 列：

Col 0  Col 1  Col 2  Col 3  Col 4  Col 5  Col 6  Col 7
        ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
Row 5   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │
Row 4   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │
Row 3   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │
Row 2   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │  C   │  32 个计算 tile
        ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
Row 1   │  M   │  M   │  M   │  M   │  M   │  M   │  M   │  M   │  8 × 512 KB = 4 MB L2
        ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
Row 0   │  D   │  D   │  D   │  D   │  D   │  D   │  D   │  D   │
        └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘

#### AIE2P：不只是更多更快

XDNA2 的计算 tile 从 AIE2 升级到 <strong>AIE2P</strong>（AI Engine 2 Plus）。除了 MAC 吞吐翻倍，还有几个质的变化：

#### 1. Block Floating Point（BFP16）

这是 XDNA2 最重要的新特性。传统量化中，每个元素独立存储完整的数值表示。BFP16 换了一种方式：

传统 FP16:  每个元素 16 bit（1 sign + 5 exp + 10 mantissa）
BFP16:      32 个元素共享 1 个 8-bit 指数 + 每个元素 8-bit 尾数

32 个元素共享一个指数，每个元素只需 8 bit 尾数。存储密度接近 INT8，但精度接近 FP16。关键优势：<strong>不需要重新训练模型</strong>——直接把 FP16 权重转成 BFP16 格式，精度损失极小，吞吐量却和 INT8 一样。

在指令级别，这体现为新的 MAC 配置：

AIE2:   I512.I512.ACC1024.mac          ; INT8 × INT8 → ACC
AIE2P:  BFP576.BFP576.ACC2048.mac.conf ; BFP16 × BFP16 → ACC（新！）

AIE2P 的 MAC 单元原生理解 BFP 格式——硬件自动处理共享指数的对齐和累加。

#### 2. MX（Microscaling）格式支持

AIE2P 支持 OCP 标准的 Microscaling 格式族：

格式说明用途MXFP44-bit 浮点 + 共享指数权重压缩MXFP66-bit 浮点 + 共享指数权重/激活MXFP88-bit 浮点 + 共享指数通用推理MXINT88-bit 整数 + 共享缩放量化推理每种格式都有对应的向量类型和 MAC 指令，全部硬件加速。

#### 3. 硬件非线性函数

AIE2 上做 `tanh`、`exp`、`1/x` 需要查表 + 多项式逼近，消耗多个周期。AIE2P 加了专用硬件：

AIE2:  tanh(x) → 查表 + 插值（几十个周期）
AIE2P: tanh(x) → 单条 aievec.tanh 指令 → 硬件单元直接计算

同样适用于 `exp2`（指数）和 `inv`（倒数）。这对 Transformer 的 softmax 和 LayerNorm 特别有意义——这些操作在 LLM 推理中占显著比例。

#### 4. 动态空间分区

XDNA1 的 NPU 基本上是一整块给一个任务用。XDNA2 支持最多 <strong>8 个并发隔离空间流（spatial streams）</strong>。8 列可以动态划分，比如：

┌──Col 0-1──┬──Col 2-5──┬──Col 6-7──┐
│ 视频通话   │ LLM 推理   │ 背景降噪  │   3 个任务同时跑
│ (2 列)    │ (4 列)     │ (2 列)    │
└───────────┴───────────┴───────────┘

每个分区有独立的电源门控——不用的列可以关掉省电。

#### 完整参数对比

参数XDNA1 PhoenixXDNA1 Hawk PointXDNA2 Strix Point架构代号AIE2AIE2AIE2P编译目标aie2-none-unknown-elfaie2-none-unknown-elfaie2p-none-unknown-elf计算 tile16 (4×4)16 (4×4)32 (8×4)内存 tile448L2 SRAM2 MB2 MB4 MB时钟频率~1.0 GHz~1.6 GHz~1.8 GHzINT8 TOPS101650INT4 TOPS~20~32~100BF16 TFLOPS~5~8~25BFP16不支持不支持硬件原生FP16/FP8不支持不支持硬件原生MX 格式不支持不支持MXFP4/6/8/9硬件 tanh/exp/inv不支持不支持单指令并发空间流11最多 8结构化稀疏不支持不支持50% 稀疏（2× 有效吞吐）搭载处理器Ryzen 7040Ryzen 8040Ryzen AI 300笔记本品牌联想/华硕 2023ThinkPad 2024华硕/联想 2025
#### Strix 家族：NPU 一样，其他不同

XDNA2 NPU 模块在 Strix 家族的三个芯片中完全相同（都是 32 tile, 50 TOPS）。差异在 NPU 之外：

Strix PointStrix HaloKrackan Point品牌Ryzen AI 300Ryzen AI MAXRyzen AI 300（入门）NPU32 tile, 50 TOPS32 tile, 50 TOPS32 tile, 50 TOPSCPU12 核 Zen 516 核 Zen 58 核 Zen 5GPU16 CU RDNA 3.540 CU RDNA 3.58 CU RDNA 3.5内存LPDDR5X 双通道LPDDR5X 四通道LPDDR5X 双通道TDP15-54W55-120W15-54WStrix Halo 的四通道内存带宽（~256 GB/s vs ~120 GB/s）间接提升了 NPU 利用率——当模型权重不能完全放进 4 MB L2 时，内存带宽是瓶颈。

#### 对工具链的影响

XDNA2 的编程模型和 XDNA1 完全一致——同样的 IRON Python API，同样的 ObjectFIFO 数据流，同样的 Peano 编译器。区别仅在于：

# XDNA1

```python
from aie.iron.device import NPU1Col1
dev = NPU1Col1()
```


# XDNA2

```python
from aie.iron.device import NPU2
dev = NPU2()
```


编译时目标从 `aie2` 变成 `aie2p`：

# XDNA1
clang++ --target=aie2-none-unknown-elf -c kernel.cc -o kernel.o

# XDNA2
clang++ --target=aie2p-none-unknown-elf -c kernel.cc -o kernel.o

但如果你要用 XDNA2 的新特性（BFP16、MX 格式、硬件 tanh），需要用 AIE2P 专有的 intrinsic 和数据类型。mlir-aie 仓库中已有 `aie_kernels/aie2p/` 目录，包含 AIE2P 专用的 GEMM 内核。

#### 深入对比：AMD XDNA vs Qualcomm Hexagon NPU

AMD 和 Qualcomm 是目前仅有的两家向开发者暴露底层可编程性的消费级 NPU 厂商。但两者的架构哲学截然不同。

#### 架构对比：空间计算 vs VLIW DSP

<strong>AMD XDNA</strong> 是<strong>空间计算阵列</strong>——一个 2D 的 tile 网格，每个 tile 是独立的处理器，tile 之间通过片上网络通信。数据在 tile 之间”流动”，计算分布在空间上。

<strong>Qualcomm Hexagon</strong> 是传统的 <strong>VLIW DSP + 专用加速器</strong>。它有三个协同工作的功能单元：

单元宽度职责标量核32-bit控制流、地址计算HVX (Hexagon Vector eXtensions)128 字节 (1024-bit)向量运算：dequant、ReLU、softmax、RMSNormHMX (Hexagon Matrix eXtensions)32×32 tile矩阵乘法：GEMM、attention注意 HVX 的向量宽度是 <strong>1024-bit</strong>（128 字节），是 AMD AIE2 的 512-bit 的两倍。一条 HVX 指令可以同时处理 64 个 FP16 或 128 个 INT8。

#### 编程模型对比

AMD 的编程模型是<strong>空间 + 数据流</strong>：你要想好数据怎么在 tile 之间搬运，用 ObjectFifo 定义 DMA 通道，用硬件锁做同步。计算和数据搬运是两个独立的关注点。

Qualcomm 的编程模型是<strong>传统 DSP + 显式 scratchpad</strong>：

```text
// Hexagon: 标准 C + intrinsic，跟写 CPU SIMD 差不多
HVX_VectorPair wp = Q6_Wh_vunpack_Vb(v_i8);        // int8 → int16 (HVX)
HVX_Vector v_f16 = Q6_Vhf_equals_Vh(Q6_V_lo_W(wp)); // int16 → f16 (HVX)
```

hexkl_micro_hmx_mm_f16(vtcm, act_off, wt_off);       // 矩阵乘 (HMX)
# AMD: 空间计算 + 数据流编排

```python
of_in = ObjectFifo(tile_ty, name="in")    # 定义 DMA 通道
of_out = ObjectFifo(tile_ty, name="out")
def core_body():                           # tile 上的计算
    elem = of_in.acquire(1)                # 等待 DMA 填好数据
    scale_fn(elem, out, factor)            # 调用 C++ 内核
    of_out.release(1)                      # 通知 DMA 搬走结果
```


Hexagon 的编程体验更接近传统 SIMD 编程（SSE/NEON），学习曲线更平缓。AMD AIE 的空间编程模型需要理解 tile、DMA、锁三者的协作关系，概念上更陡。

#### 内存层次对比

AMD XDNA (AIE2)Qualcomm Hexagon (v75)L1 (每 tile/核)64 KB scratchpad共享 L1 cache片上高速内存2 MB (Memory Tile, 4×512KB)8 MB (VTCM, 1 周期延迟)L2 Cache无（靠 Memory Tile）有 L2 cacheDDR 带宽通过 Shim Tile DMA通过 UDMA 异步搬运Hexagon 的 <strong>VTCM（Vector Tightly Coupled Memory）</strong> 是关键优势——8MB 的 1 周期延迟 scratchpad，远大于 AMD 的 2MB Memory Tile。HMX 矩阵乘法<strong>只能</strong>从 VTCM 读取数据，所有数据必须先从 DDR 搬到 VTCM。

两者都需要显式管理数据搬运，但方式不同：

// Hexagon: UDMA 异步搬运 DDR → VTCM
Q6_dmstart_A((void *)&desc);              // 启动 DMA（立即返回）
hvx_compute(compute_buf, size);            // HVX 同时计算（重叠！）
Q6_R_dmwait();                             // 等 DMA 完成
# AMD: 硬件锁同步 DMA

```text
elem = of_in.acquire(1)    # acq 指令：等 DMA 填好
kernel(elem, out)           # 计算
of_in.release(1)           # rel 指令：通知 DMA 可以搬下一块
```


#### HMX 矩阵乘法 vs AIE MAC 单元

HMX 的使用方式很特别——<strong>必须用内联汇编</strong>，因为 activation 和 weight 加载必须在同一个 VLIW packet 中：

// Hexagon HMX: 内联汇编是唯一途径
asm volatile("mxclracc.hf" ::: "memory");                       // 清零累加器

```text
asm volatile(
    "{ activation.hf = mxmem(%0, %1)\n"                         // 加载激活值
    "  weight.hf = mxmem(%2, %3) }\n"                           // 加载权重（必须同一 packet！）
    :: "r"(act), "r"(2047), "r"(wt), "r"(2047) : "memory");
asm volatile("mxmem(%0, %1):after.hf = acc\n"                   // 存储累加器到 VTCM
    :: "r"(out), "r"(0) : "memory");
// AMD AIE: C++ intrinsic 即可
aie::vector a = aie::load_v(in);    // 512-bit 向量加载
aie::accum acc = aie::mul(a, factor);       // 硬件 MAC
aie::store_v(out, acc.to_vector());            // 存储（带饱和）
```


两者的 MAC 单元都是 tile/block 粒度的，但 AMD 用 C++ intrinsic 封装得更好，Hexagon 在 HMX 层面必须用 inline asm 或 HexKL 库。

#### 数据布局的”格式墙”

两者都有数据布局限制，但 Hexagon 的问题更突出：

HMX 要求数据按 <strong>AH（Activation-Hexagon）</strong> 和 <strong>WH（Weight-Hexagon）</strong> 格式排列——这是专为 32×32 MAC 阵列设计的 tile 内部重排。每次矩阵乘前都要做布局转换：

// Hexagon: 必须转换为 HMX 专用布局
hexkl_micro_hmx_rm_to_ah_f16(vtcm, dst, src);   // row-major → AH
hexkl_micro_hmx_rm_to_wh_f16(vtcm, dst, wt, ...); // row-major → WH
hexkl_micro_hmx_mm_f16(vtcm, act_off, wt_off);     // 只接受 AH/WH 数据

AMD AIE 没有这个问题——数据按正常的线性顺序排列在 L1 scratchpad 中，向量加载/存储直接访问。

#### LLM 推理的典型流水线

Hexagon 上一个 Transformer 层的执行模式（来自 hexagon-tutorial 实测）：

┌──────────────── 一次 FastRPC / dspqueue 调用 ────────────────┐
│                                                                │
│  RMSNorm    Q/K/V 投影    RoPE     Attention    FFN           │
│  (HVX)     (HMX)         (HVX)    (HMX+HVX)   (HMX)         │
│                                                                │
│  HVX 和 HMX 交替，零成本切换（同一个 DSP 线程内）             │
└────────────────────────────────────────────────────────────────┘

AMD 上的对应模式是：多个 compute tile 并行处理不同的算子，通过 ObjectFifo 构成数据流管道。

#### 工具链和生态对比

AMD XDNAQualcomm Hexagon编译器Peano (LLVM fork, 开源)hexagon-clang (LLVM fork, 闭源)SDKmlir-aie (开源, pip install)Hexagon SDK 6.4 (需注册, ~10GB)向量 intrinsicaie_api/aie.hpp (开源)hvx_hexagon_protos.h (SDK 内)矩阵加速C++ intrinsic (aie::mul)内联汇编 / HexKL 库内核驱动amdxdna (主线 Linux, 开源)厂商闭源 (Android 内核树)模拟器无（需要真硬件）hexagon-sim (可在 x86 上模拟)调试有限（硬件 trace）hexagon-gdb (完整调试器)运行时XRT (开源)FastRPC / dspqueue (部分开源)高层框架ONNX RT / Vitis AIQNN / Genie SDKHexagon 的<strong>模拟器和调试器</strong>是巨大优势——不需要真机就能开发和调试 HVX/HMX 代码。AMD 没有模拟器，必须有 NPU 硬件才能运行。

但 AMD 在<strong>开源透明度</strong>上完胜：内核驱动、编译器、运行时全开源。Hexagon 的 SDK 和编译器是闭源的，内核驱动也不在主线 Linux 中。

#### 综合对比表

AMD XDNA1AMD XDNA2Qualcomm Hexagon v75Intel NPUApple ANE架构空间计算阵列空间计算阵列VLIW DSP + HVX + HMXSHAVE 向量处理器固定功能引擎向量宽度512-bit512-bit1024-bit (HVX)未知N/A矩阵单元AIE MAC (16×16)AIE2P MAC (加倍)HMX (32×32 tile)无固定片上 SRAM2 MB4 MB8 MB (VTCM)未知未知自定义内核C++ intrinsicC++ intrinsicC + intrinsic + asm不支持不支持开源编译器Peano (LLVM)Peano (LLVM)无（LLVM Hexagon 是上游但不含 HMX）无无ISA 可见性完全可反汇编完全可反汇编可反汇编（HVX），HMX 需 inline asm不公开完全不公开裸机编程可以可以可以不可以不可以内核驱动主线 Linux主线 Linux厂商闭源主线 LinuxmacOS 闭源模拟器无无有 (hexagon-sim)无无调试器有限有限完整 (hexagon-gdb)无无算力 (INT8)10-16 TOPS50 TOPS45 TOPS (X Elite)11 TOPS~15 TOPSBFP/MX 格式不支持硬件原生不支持不支持不支持
#### 哪个更好？

取决于你要做什么：

- <strong>想学习 NPU 底层原理、做学术研究</strong>：AMD XDNA。全栈开源，从 Python 到机器指令都能看到，适合理解空间计算、数据流、VLIW 等概念
- <strong>想在手机上部署 LLM 推理</strong>：Qualcomm Hexagon。骁龙平台占有率高，QNN/Genie SDK 成熟，模拟器方便调试
- <strong>想写高性能自定义算子</strong>：两者都可以。AMD 用 IRON + C++ intrinsic，Qualcomm 用 HVX intrinsic + HexKL。Hexagon 的编程模型更传统，AMD 的空间编程更有挑战但也更有潜力（天然并行）
- <strong>关心开源生态</strong>：AMD 完胜。Hexagon SDK 需要注册下载，编译器闭源，内核驱动不在主线
两者是目前消费级 NPU 中仅有的可以做<strong>指令级编程</strong>的平台。Intel NPU 和 Apple ANE 对开发者来说基本是黑盒——只能通过框架 API 使用，无法触及底层。

XDNA2 在保持同样编程模型的基础上，通过翻倍 tile 数量、翻倍单 tile MAC 吞吐、提升频率，实现了 5× 的性能跳跃。更重要的是 BFP16 和 MX 格式的引入——这代表了一种趋势：未来的 AI 硬件不只是”更多 INT8 TOPS”，而是用更聪明的数值格式在精度和吞吐之间找到更好的平衡。

#### 参考资料

- [http://docs.amd.com/r/en-US/am020-versal-aie-ml](https://link.zhihu.com/?target=http%3A//docs.amd.com/r/en-US/am020-versal-aie-ml) — 架构细节
- [http://docs.amd.com/r/en-US/ug1079-ai-engine-kernel-coding](https://link.zhihu.com/?target=http%3A//docs.amd.com/r/en-US/ug1079-ai-engine-kernel-coding) — 内核编程
- [http://github.com/Xilinx/mlir-aie](https://link.zhihu.com/?target=http%3A//github.com/Xilinx/mlir-aie) — IRON 框架和编程示例
- [http://github.com/Xilinx/llvm-aie](https://link.zhihu.com/?target=http%3A//github.com/Xilinx/llvm-aie) — Peano LLVM 后端（含 ISA 编码）
- [http://github.com/amd/xdna-driver](https://link.zhihu.com/?target=http%3A//github.com/amd/xdna-driver) — XRT 运行时和内核驱动
- [http://www.amd.com/content/dam/amd/en/documents/products/processors/ryzen/ai/iron-for-ryzen-ai-tutorial-isca-2025.pdf](https://link.zhihu.com/?target=http%3A//www.amd.com/content/dam/amd/en/documents/products/processors/ryzen/ai/iron-for-ryzen-ai-tutorial-isca-2025.pdf) — 110 页教程
- [http://docs.kernel.org/accel/amdxdna/amdnpu.html](https://link.zhihu.com/?target=http%3A//docs.kernel.org/accel/amdxdna/amdnpu.html) — 内核驱动文档
- [http://github.com/taowen/hexagon-tutorial](https://link.zhihu.com/?target=http%3A//github.com/taowen/hexagon-tutorial) — Qualcomm Hexagon DSP/NPU 编程教程（HVX + HMX 实战）