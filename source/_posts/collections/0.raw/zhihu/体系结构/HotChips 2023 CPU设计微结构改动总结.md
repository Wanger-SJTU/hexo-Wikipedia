---
title: HotChips 2023 CPU设计微结构改动总结
date: "2024-03-14 00:00:00"
updated: "2024-03-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/HotChips-2023-CPU设计微结构改动总结/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/686419721
---


本文主要记录和介绍CPU设计和微结构改进方面的内容，尤其是我个人认为值得关注的点，考虑到hotchips内容覆盖整个集成电路领域，本文无法做到面面俱到。另外对于只增大size（例如ROB、L1$、TLB）的内容也不做过多介绍，都不做解读，因为这些主要是工艺进步的红利。

###     ARM N2

core流水线前端的改进：

1. 一个cycle预测两个branch，相比原来一个cycle只预测一个branch，取指的吞吐量会更大，尤其是对于分支指令很多的情况，例如每隔两个指令一个分支，一个cylce可以喂给Decode stage的6条指令，相比而言原来只能喂的更少。

2. 把分支预测的TAGE表从4个改为8个，进一步提升TAGE分支预测覆盖的范围。

3. N2只有64KB的icache, AppleM1是128KB, 为什么小的icache也有很好的效果？ 因为decoupled branch预测跑的足够快, 预取效果很好，因此icache大一倍对性能影响不大。

注意：apple没有对外公布微结构信息，目前不确定其是否使用decoupled frontend，不过有些[测试发现apple确实不是decoupled frontend](https://zhuanlan.zhihu.com/p/678983061)。这里ARM想强调的是，decoupled frontend已经足够快，icache太大对于ARM的core性能影响不大。实际我们测试时也发现，decoupled frontend分支预测只要足够准，可以提前发出足够多的指令预取，icache的size确实影响不大。

**

4. 在N2这一带还有mop Cache，但是再往后发展（N3/X等）ARM认为MOpCache功耗很高, 但是只能cover小的loop不能覆盖大的循环, 因此去掉了mOpCache，经过性能评估，即使去掉mOpCache后，增大icache的取指带宽也能起到类似的想能效果.  

注意：mop Cache在X3,N2中还有，但是到了X4，N3中被去掉的：**

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_d15324b1692e.jpg)

ARM X4去掉了Mop Cache![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ddd2d067d7c2.jpg)

5. Malloc后的memset操作会把cacheline memset为0, 自动detect这种streaming write 写操作，对于这类store miss，不在L1和L2 cache中allocate, 避免污染cache, 直接写回memory或者SLC

6. 从ARM V1 2B*256的SVE为何改为V2的4B*128? 原因是考虑到对于vector操作相同数据量, 前者使用更少的指令,后者更适合使用SVE运行non-vector-type的workload; scale down更方便, 可以很快改为2B*128，因此是设计的tradeoff

**

### AMD Zen4

1. 前端流水线的Fetch stage:

```text
    a) Fetch做到单cycle出两个taken branch, 正常只能出一个，跟ARM N2类似

    b) Dispatch时, 也可以最多dispatch 2个taken branch
```


2. 执行单元部分:

```text
    a) Bit manipulation延迟执行降低

    b) 写byte-writeable的数据到L1D时, 不需要读取数据做merge后写回, 直接写入减少读端口冲突, load的带宽就变大。猜测实现前提不使用ecc，基于parity校验
```


3. Cache部分:

```text
    a) L2 size更大，从1MB改为2MB.

    b) 更多并行(MSHR)

    c) 3D V-cache使得L3变为96MB
```


4. AVX-512：

```text
    a) 增加指令处理机器学习, 加解密（包括VNNI、GFNI、BFLOAT16）

    b) 降低AVX指令执行功耗
```


5.** **ARM去掉了MicroOpCache, 相反AMD增加了MicroOpCache, 因为CISC/RISC指令密度不同, 供指速度不同，所以造成了ARM觉得没用但是AMD觉得有用的这种情况。**

**

### Ventana V1

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_74361b53f872.jpg)

Veyron V1 流水线框图1. Icache 512KB, **dcache: 64KB, private L2 512KB

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_adfbb72c4d8a.jpg)

**

2. 流水线宽度8，相比Intel、AMD更激进

3. 面向商用的改动：CHI接口, Chiplet, 完全支持虚拟化, 微架构层防止测信道攻击，VA:48, PA52, AIA中断支持

4.** **通过改进微结构，使得高频物理设计不依赖于定制memory（3.6G/5nm），相比而言，AMD和Intel的的高频设计依赖于k库定制**

5. Fetch最多64B/cycle, 流水线中运行的是fused或者unfused ops，即decode后只存在uop，uop可能是fused也可能是unfused指令

6. 所有整形执行单元都是对称的: 即每个cycle可以任意执行以下四个ops: reg/load/store/branch。<strong>注意这里可以同时执行4个load或者4个store指令，这个是非常激进的，每个pipe都是可以同时支持load/store的，猜测load优先级比store高，或者的load比store高</strong>

7. Mul/div/pcnt/clmul/csr通过共享执行单元

<strong>8.</strong> <strong>Scheduler window: 128 entry，相比而言算很大的。</strong>

<strong>9.</strong> <strong>LUI指令消除，这类指令的处理类似于ARM的mov x1, x2，通过rename stage就可以搞定，直接标记为写回等待提交即可，不需要真正进入执行单元</strong>

<strong>10.</strong> <strong>分开Icache/Dcache，L0 I cache buffer + L2 512KB Icache,</strong> <strong>L1D 64KB, L2D 512KB, 分开后的好处是可以单独针对I/D的power/latency等定向优化，对于footprint大的负载还能做到性能隔离互不影响</strong>

11. 4cycle load to use latency，没什么特殊

12. 15cycle branch mis-predict penalty，3cycle redirect on mispredict：：相对来讲可以进一步优化

13. Pre-decode完成以下动作：解压缩C指令；找到下一个8条指令的边界；找到fuse指令对，pre-decode找到fusion pair

14. LSU：

```text
    a) 每个cycle可执行任意组合的4条load、store指令：相比而言，ARM、Intel、AMD等，都是2ld+1ldst+1st, 或者3ld+1ldst+2st等。

    b) 紧耦合低延迟的L1D、L2cache

    c) **L1D：VIVT. **DCache miss后访问DTLB，硬件处理同义问题，对于多对一的读可以共存，常见的L1D一般是VIPT。

    d) Inclusive write through L2：写回的L2比较常见，写穿的比较少见。

    e) 硬件维护TLB invalid操作，类似于ARM的TLBI，通过DVM处理

    f) L1-L2的datapath 64B：相比而言常见的都是32B甚至16B

    g) 预取器Next-line，sequential，stride，multi-stride patterns，next-line从L2预取到L1，更远的预取到L2
```


15. L3是L2的victim cache，non-inclusve， NINE

<strong>16.</strong> <strong>为什么8-wide的流水线只有4个int执行单元? 答：考虑到Flexibility, 后端瓶颈主要来源于memory, 其他执行单元多了也没用(https://chipsandcheese.com/2023//hot-chips-2023-ventanas-unconventional-veyron-v1/)</strong>

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_ed6ee2ff1561.jpg)

SandyBridge的端口利用率
### Intel Xeon E-core(Sierra Forest)

1. 19个执行单元共享17个执行端口(Vector/FP共享)

序号1234567891011121314151617端口012310111213303108092829202122OpsALUALUALUALULDLDSTASTAJmpJmpSTDSTDVSTDVSTDVALUVALUVALUOpsShiftShiftShiftShiftAESAESMulMulFMULFMULDIVDIVFADDFADDSHAIMULFDIV其他乏善可陈，主要功力在功耗控制，Intel在HotChips很少深入介绍微结构

**

### AMD Ryzen 7040

1. 13% IPC提升比Zen3，TSMC N4P，其他讲的很少

### P870 RISC-V

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_52d071312f99.jpg)

![](/images/collections/0.raw/zhihu/%E4%BD%93%E7%B3%BB%E7%BB%93%E6%9E%84/asset/img_3f0ea1b894ef.jpg)

1. BP3和译码做到一起：猜测应该是Decode bypass，也就是microOp Cache hit时，不需要decode直接进入rename

2. 4cycle Load-to-use：没什么特殊

3.** **ROB：1120（4uop一个entry，一共280entry）典型的ROB合并**

4. NINE L2
