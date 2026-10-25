---
title: "RDMA WQE / Doorbell 内存序、WB/WC/UC 与 Cache/LFB 机制详解"
date: "2026-07-16 00:00:00"
updated: "2026-07-16 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/RDMA-WQE-_-Doorbell-内存序、WB_WC_UC-与-Cache_LFB-机制详解/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/2061100810134623162"
---


本文主要是记录一下从事RDMA来对于集中内存机制的一个总结，希望能给其他遇到相关问题的同学提供一个科普。本文以 RDMA 用户态驱动(以 mlx5 / rdma-core 为例)的 WQE 写入 + doorbell 流程出发, 逐层下钻到 x86 内存类型(WB/WC/UC)、内存屏障、cache 一致性、Line Fill Buffer(LFB)、 RFO、以及 BlueFlame 的多 TLP 重组机制。并对比 ARM 弱序架构与非一致 DMA 场景。
 结论若无特别说明,均基于 <strong>x86</strong> 架构。
目录

- [WQE 写入与 doorbell 的排序需求](https://zhuanlan.zhihu.com/write#1-wqe-%E5%86%99%E5%85%A5%E4%B8%8E-doorbell-%E7%9A%84%E6%8E%92%E5%BA%8F%E9%9C%80%E6%B1%82)
- [两种”通知设备”模型:各只需一次 barrier](https://zhuanlan.zhihu.com/write#2-%E4%B8%A4%E7%A7%8D%E9%80%9A%E7%9F%A5%E8%AE%BE%E5%A4%87%E6%A8%A1%E5%9E%8B%E5%90%84%E5%8F%AA%E9%9C%80%E4%B8%80%E6%AC%A1-barrier)
- [WB / WC / UC 三种内存类型](https://zhuanlan.zhihu.com/write#3-wb--wc--uc-%E4%B8%89%E7%A7%8D%E5%86%85%E5%AD%98%E7%B1%BB%E5%9E%8B)
- [如何查看内存映射类型](https://zhuanlan.zhihu.com/write#4-%E5%A6%82%E4%BD%95%E6%9F%A5%E7%9C%8B%E5%86%85%E5%AD%98%E6%98%A0%E5%B0%84%E7%B1%BB%E5%9E%8B)
- [WB 写入 L1D 的真实机制:RFO](https://zhuanlan.zhihu.com/write#5-wb-%E5%86%99%E5%85%A5-l1d-%E7%9A%84%E7%9C%9F%E5%AE%9E%E6%9C%BA%E5%88%B6rfo)
- [WC 与 LFB(Line Fill Buffer)](https://zhuanlan.zhihu.com/write#6-wc-%E4%B8%8E-lfbline-fill-buffer)
- [BlueFlame:WC 直推 WQE 与多 TLP 重组](https://zhuanlan.zhihu.com/write#7-bluefame-wc-%E7%9B%B4%E6%8E%A8-wqe-%E4%B8%8E%E5%A4%9A-tlp-%E9%87%8D%E7%BB%84)
- [PCIe TLP、MPS 与 write-coalescing](https://zhuanlan.zhihu.com/write#8-pcie-tlpmps-%E4%B8%8E-write-coalescing)
- [设备侧完整性判断:乱序到达怎么办](https://zhuanlan.zhihu.com/write#9-%E8%AE%BE%E5%A4%87%E4%BE%A7%E5%AE%8C%E6%95%B4%E6%80%A7%E5%88%A4%E6%96%AD%E4%B9%B1%E5%BA%8F%E5%88%B0%E8%BE%BE%E6%80%8E%E4%B9%88%E5%8A%9E)
- [一致性 DMA vs 非一致 DMA](https://zhuanlan.zhihu.com/write#10-%E4%B8%80%E8%87%B4%E6%80%A7-dma-vs-%E9%9D%9E%E4%B8%80%E8%87%B4-dma)
- [ARM 弱序架构上的差异](https://zhuanlan.zhihu.com/write#11-arm-%E5%BC%B1%E5%BA%8F%E6%9E%B6%E6%9E%84%E4%B8%8A%E7%9A%84%E5%B7%AE%E5%BC%82)
- [LFB 资源竞争](https://zhuanlan.zhihu.com/write#12-lfb-%E8%B5%84%E6%BA%90%E7%AB%9E%E4%BA%89)
- [核心结论速查](https://zhuanlan.zhihu.com/write#13-%E6%A0%B8%E5%BF%83%E7%BB%93%E8%AE%BA%E9%80%9F%E6%9F%A5)
## 1. WQE 写入与 doorbell 的排序需求

RDMA 用户态发送路径的基本约束:

- WQE(Work Queue Element)先写进 Send Queue,再敲 doorbell 通知 HW。
- doorbell 可能先于 WQE 被 HW 观察到,所以 doorbell <strong>之前</strong>需要内存屏障, 确保 WQE 对设备可见后才让设备去取。
- WQE 内部约定:控制段(含 opcode / owner / size 等标志)通常放在首部。<strong>常见误区</strong>:以为需要两次 barrier—— `写 body → barrier → 写 flags → barrier → doorbell`。

实际只需要<strong>一次</strong>。原因见下一节。

伪代码:一条描述符的写入 + doorbell

```cpp
void post_desc(void)
{
    void *dma_addr = xxx;          // 描述符在 host 内存(WB)里的地址,设备 DMA 会来读
    u64 __iomem *db_addr = xxx;    // doorbell 寄存器,设备 MMIO(UC/强序)
    u64 db = xxx;                  // doorbell 值(通常含 producer index)
    u64 desc_content = xxx;        // 描述符正文(offset 8:载荷/地址/长度等)
    u64 desc_flag = xxx;           // 控制字(offset 0:owner/valid/opcode,写它 = 描述符生效)

    /* 步骤1:先写正文。此时 flag 还没写,设备就算来扫也认为这条无效,不会误取。 */
    WRITE_ONCE(*(dma_addr + 8), desc_content);

    /* 步骤2:唯一的 barrier。保证正文先于 flag 对设备可见。
     * dma_wmb() 只排 CPU 侧写顺序,不通知设备、不刷 DRAM——
     * coherent DMA 靠 snoop,数据待 cache 里设备也读得到。 */
    dma_wmb();

    /* 步骤3:写 flag。这一个写入本身就是"描述符已就绪"的信号(owner-bit 模型)。
     * 它后面不需要第二个 barrier——后面没别的正文要排在它前面。 */
    WRITE_ONCE(*dma_addr, desc_flag);

    /* 步骤4:敲 doorbell,踢设备去取。写 UC 寄存器,严格保序、立即发出。
     * writeq 内部对 x86 是普通 store(UC 天然有序);对弱序架构会带屏障。
     * 注意:doorbell 是"提示",正确性锚在上面的 flag/描述符本身。 */
    writeq(db, db_addr);
}
```

要点:barrier <strong>只有一次</strong>(`dma_wmb`),夹在正文与 flag 之间。 `WRITE_ONCE` 防编译器把两次写重排/合并;doorbell 走 UC 保证独立有序发出。

实例:一个常见的 dma_wmb 摆放陷阱(混合模型下的排序 bug)
下面是一段<strong>简化示例</strong>(非任何真实驱动),演示一个很容易踩的坑: 描述符内部先写 `addr` 再写 `flag(OWN)`,两者之间<strong>没有屏障</strong>, 唯一的 `dma_wmb()` 摆在 `flag` 写完之后、doorbell 之前。

```cpp
/* 描述符:addr + flag,flag 的最高位是 OWN(1=软件已填好,归 HW) */
struct tx_desc {
    __le64 addr;   /* 数据缓冲区 DMA 地址 */
    __le32 flag;   /* OWN 位 | 长度等 */
};

static void ring_doorbell(struct tx_ring *ring)
{
    writel(ring->pidx, ring->db_reg);   /* doorbell:MMIO 写 producer index */
}

static int fill_desc(struct tx_ring *ring, dma_addr_t dma, u32 len)
{
    struct tx_desc *desc = &ring->desc[ring->pidx];

    desc->addr = cpu_to_le64(dma);                 /* 写 addr */
    desc->flag = cpu_to_le32(DESC_FLAG_OWN | len); /* 写 flag(含 OWN)—— 与上一行之间无屏障 */

    ring->pidx = (ring->pidx + 1) & (ring->size - 1);
    return 0;
}

static int xmit_one(struct tx_ring *ring, dma_addr_t dma, u32 len)
{
    if (ring_space(ring) < 1)
        return -EBUSY;

    fill_desc(ring, dma, len);

    dma_wmb();            /* 唯一的屏障:摆在 flag 之后、doorbell 之前 */

    ring_doorbell(ring);  /* 敲 doorbell */
    return 0;
}
```


dma_wmb 想做什么
它想保证 `fill_desc` 写的整条描述符(`addr` + `flag`,host WB 内存的 desc ring)在 敲 doorbell 之前对设备可见——设备被 doorbell 踢后 DMA 回读 desc,应读到完整新内容, 而不是 `OWN` 已置位但 `addr` 还是上一圈旧值。dma_wmb 只排 CPU 侧写序、不刷 cache, coherent DMA 靠 snoop 拿 cache 里最新值。

<strong>如果设备是纯 doorbell 模型</strong>(doorbell 前绝不看 desc),这个摆法就对了: 整条 desc 是原子单元,内部 addr/flag 顺序设备看不到,`dma_wmb` 排 `desc < doorbell` 足够(模型 B)。

但混合模型下,这里有 bug
现实里<strong>大部分厂家的 HW 是混合模型</strong>:doorbell 只起通知/加速作用,HW 本身也在 <strong>主动预取</strong>——不等 doorbell 就扫描 desc ring,靠 `OWN` 位判断哪条已就绪。 既然 HW 不等 doorbell 就看 desc,本文模型 A 的约束就生效了: **`addr` 必须先于 `OWN` 对设备可见**——而这个 `data < owner` 屏障在上面缺失。

后果:

- <strong>x86</strong>:TSO 白送 store 顺序(store 不越 store),`addr` 天然先于 `OWN`,侥幸不炸。
- <strong>弱序架构(ARM 等)</strong>:两个 store 可乱序对设备可见。HW 预取时可能看到 `OWN=1` 却读到上一圈的旧 `addr` → DMA 到错误物理地址 → 发错数据 / DMA 错误。 xmit 里那个 `dma_wmb` <strong>补不了</strong>这个洞——它排的是”整 desc < doorbell”, 而 HW 预取根本不等 doorbell,窟窿漏在 `addr` 与 `OWN` 之间。这类 bug 在 x86 上测不出来、一上 ARM 平台就偶发 DMA 错误,是排查内存序问题的典型坑。

修法
在 `addr` 与 `flag` 之间补一个 `dma_wmb`(模型 A 要求的那个屏障):

```text
desc->addr = cpu_to_le64(dma);
```

dma_wmb();                                       /* addr 必须先于 OWN 可见(修复点) */

```text
desc->flag = cpu_to_le32(DESC_FLAG_OWN | len);
```

补上后,xmit 里原来那个 `dma_wmb` 可保留(排 doorbell,无害)也可去掉—— 混合模型下正确性已由这个 “OWN 置位前 addr 已可见” 的屏障保证,doorbell 只是加速通知。 稳妥起见建议<strong>保留</strong> xmit 的 `dma_wmb`。

顺带:doorbell 那侧没问题
writel` 在弱序架构内部含前置 barrier,x86 上 doorbell 走 UC 天然有序, `dma_wmb + writel` 是标准惯用,足够。问题只出在 desc 内部 addr↔OWN 缺屏障那一处。

## 2. 两种”通知设备”模型:各只需一次 barrier


模型 A —— 轮询 / ownership-bit(HW 主动扫 WQE,无 doorbell)
HW 异步读 WQE,靠 valid/owner 位判有效:

写 WQE body
barrier          ← 唯一的 barrier
写 flag/owner 字   ← 这个写入本身 = 信号
owner 字自己就是信号。它后面不需要第二个 barrier——后面没别的东西要排序。

模型 B —— doorbell(HW 只在 doorbell 响后才取 WQE)
写整个 WQE(body + 控制段,内部任意顺序)
barrier          ← 唯一的 barrier
敲 doorbell       ← doorbell 就是信号
doorbell 前 HW 根本不看 WQE。所以 <strong>WQE 内部各字段的写入顺序无所谓</strong>—— CPU 可任意乱序,没人在看。barrier + doorbell = 单一 release 点。

为什么想象中的第二个 barrier 会塌缩
排序是一条单调链:`data seg < control/owner < dbrec/doorbell`。 只在”HW 能独立观测链条两端”的地方才需要 barrier。

- 模型 A:HW 靠 owner 独立观测 → 需要 `data < owner` 一个 barrier; `owner < doorbell` 不需要(doorbell 只是提示,正确性来自 owner)。
- 模型 B:HW 只在 doorbell 后才认 WQE → 整条 WQE 是一个原子单元, 内部 `data < control` 顺序 HW 看不到 → 那个 barrier 免了。<strong>mlx5 SQ 走模型 B</strong>,所以只见一次 barrier。

mlx5 实际的两个 barrier
udma_to_device_barrier();          // (1) 所有 WQE 写入 先于 doorbell-record 写入(host mem)

```text
qp->db[MLX5_SND_DBR] = producer_idx;  // host mem 里的 doorbell record
```

mmio_wc_start();                   // (2) 排序 dbrec+WQE 相对 MMIO doorbell,并 flush WC
mmio_write64_be(bf_reg, ...);      // 敲 doorbell 到 UAR(设备 MMIO)

```text
mmio_flush_writes();
```


- barrier (1):排序<strong>整个 WQE</strong> vs doorbell-record 写。<strong>不是</strong> body vs flags。
- barrier (2):处理 <strong>MMIO / write-combining</strong> 的 doorbell 写(设备内存,规则与 host DRAM 不同)。即两个 barrier 是 <strong>WQE-vs-doorbell</strong> 和 <strong>host-vs-MMIO</strong>,从来不是 WQE 内部的 body-vs-flag。

## 3. WB / WC / UC 三种内存类型

三者本质是 <strong>CPU 对某段地址在「缓存 + 合并 + 保序」三个维度上的策略</strong>。

维度WB Write-BackWC Write-CombiningUC Uncacheable进 cache是(读写都缓存)否(不分配 cacheline)否写合并cacheline 粒度回写同 64B 区合并,LFB 间乱序不合并,一写一事务store 保序强(x86 TSO,store 不越 store)弱,可乱序/延迟,需 SFENCE强,严格串行读行为缓存,快不缓存,可投机预读不缓存,non-posted 阻塞,不投机写投递走 cacheposted,攒着,要 fence 才挤出去posted 到 PCIe,但 CPU 侧不进 WC buffer,立即按序发典型用途普通 RAM、SQ ring、数据 bufferBlueFlame、批量 MMIO 推数据doorbell、控制寄存器
关键澄清

- <strong>UC 不是 WC 简化版,关系相反</strong>:WC 是为吞吐打开合并+乱序的放松版, UC 是关掉合并、乱序、缓存的最严格版。
- <strong>doorbell 必须 UC(或强序)</strong>:若映射成 WC,两次连续 doorbell 可能被合并成一次 → 丢一次 kick;或顺序乱 → 生产者 index 语义错。UC 保证每次 doorbell 独立、有序、立刻发。
- <strong>ARM 对应关系</strong>:WB ≈ Normal Cacheable WB;WC ≈ Normal Non-cacheable / Device-GRE; UC(严格)≈ Device-nGnRnE。Device 类型三字母 = <strong>G</strong>athering / <strong>R</strong>eordering / <strong>E</strong>arly-ack。
barrier 的真正作用

- barrier 是 <strong>CPU 内部的排序指令</strong>,不通知任何设备(<strong>doorbell 才通知设备</strong>)。
- 它只保证顺序 / 可见性,<strong>不刷 DRAM</strong>。coherent DMA 会 snoop cache, 数据待 L1/L2 里设备也读得到。
- x86 上对 WB 而言,`udma_to_device_barrier` 基本就是个编译器 barrier(TSO 已排好序)。 真正的硬件 `sfence` 只在 WC(BlueFlame)路径出现。
## 4. 如何查看内存映射类型

x86 上内存类型由 <strong>MTRR + PAT</strong> 决定:

# 1. PAT 已登记的范围(最有用,设备 BAR 的 WC/UC 基本都在这)

```text
sudo mount -t debugfs none /sys/kernel/debug 2>/dev/null
sudo cat /sys/kernel/debug/x86/pat_memtype_list
```

#   write-back @ 0x...-0x...
#   uncached-minus @ 0x...-0x...
#   write-combining @ 0x...-0x...

# 2. MTRR
cat /proc/mtrr

# 3. PCI BAR 属性(prefetchable 的 BAR 才可能被映射成 WC)
lspci -vvs <BDF>          # 看 Region: Memory at ... (prefetchable / non-prefetchable)
ls /sys/bus/pci/devices/<BDF>/
#   resource0      → 默认 UC 映射
#   resource0_wc   → 内核给 prefetchable BAR 额外导出的 WC 映射入口

# 4. 某进程某段 VA 的属性
cat /proc/<pid>/smaps      # 找目标区间,看 VmFlags 里有无 wc
RDMA 场景:

- <strong>SQ ring / dbrec</strong>:普通 `posix_memalign` 分的匿名内存 → <strong>WB</strong>。
- <strong>UAR / BlueFlame</strong>:libmlx5 mmap 设备文件,内核驱动用 `pgprot_writecombine()`(BF) 或 `pgprot_noncached()`(doorbell)定 pgprot,先试 WC 失败退 UC。
## 5. WB 写入 L1D 的真实机制:RFO

<strong>L1D = L1 数据 cache</strong>(与 L1I 指令 cache 分开)。

WB cache line 的结构
一条 WB line 只有:<strong>1 个 valid 位(整行)+ 1 个 dirty 位(整行)+ tag + MESI 态(M/E/S/I)+ 64B 数据</strong>。 <strong>整行要么全 valid,要么 invalid,没有”部分有效”</strong>,也没有 per-8B 的 valid 位。 (per-byte 的 mask 是 WC 的 LFB 才有,不是 WB。)

地址拆解(以 32KB / 8-way / 64B line → 64 组为例)

```text
PA = 0x12340
  offset = PA[5:0]   = 0        (64B 行内偏移)
  set    = PA[11:6]  = 13 (0xD) (选第 13 组)
  tag    = PA[12+]   = 0x12     (存进行里认身份)
```


L1D 查询查什么
## 1. TLB 把 VA→PA(L1D 是 VIPT:index 用 VA 低位,tag 用 PA;页内低 12 位 VA==PA,不冲突)

## 2. 用 set index 选中对应组

## 3. 组内 N 个 way 并行比对:valid == 1 ? 且 tag 匹配 ?

## 4. 命中还要看 MESI:写操作需 M/E 可写;S 需升级(RFO/Invalidate);无匹配 = miss


RFO(Read For Ownership)—— 以写一个 64B WQE 为例
前提:WQE 对齐写到 WB 的 SQ ring 地址 A,slot 里是上一圈旧 WQE(或全 0,内存永远有某个值,不存在”空”)。

store#1 (写 offset 0 的 8B) → 查 L1D → miss → 触发 RFO:
  ① 分配一个 LFB 跟踪这次未完成请求
  ② 发 RFO:目标整 64B,要 Exclusive 独占
  ③ snoop 其他核:有 M 态则回写/转发并作废,S/E 作废 → 本核独占
  ④ L2/L3/DRAM 返回当前 64B(旧 WQE 或全 0)进 LFB
  ⑤ 装入该组一个空 way(冷 cache 有空位,不驱逐):valid=1, tag, 态 E, data=旧 64B
  ⑥ store buffer 里等着的 8B 合并覆盖 offset 0~7 → 态 E→M(脏)

store#2 ~ #8 (写 offset 8/16/.../56):
  同组同 tag 查询 → 命中 M 态可写 → 就地写,无 RFO
  逐步填满 → 完整新 WQE,行仍 M(脏)
<strong>RFO 只在第一个 miss 的 store 发生一次,后续 7 个全命中。</strong>

为什么写 8B 也要取回整 64B
一致性 / 有效性按<strong>行粒度</strong>:要一条独占可写的行,必须整 64B 都在。 首个 store 只改 8B,其余 56B 得先有内容(旧值占位)。 WC / 非临时写(movnt)正是为省这次 RFO 才不缓存、直接合并推出。

组相连(set-associative),不是全相连
地址的 index 位<strong>算死落哪组</strong>;组内若有空 way(invalid)直接填,不驱逐; 全满则按 LRU/PLRU 选 victim 驱逐(脏则写回 L2)再用。

驱逐/回写时
整条脏行(全 64B)写回 L2 → 清该行 valid 位(标 Invalid)。 SRAM 里数据物理残留但逻辑失效,下次 tag 不匹配即 miss 重取。 <strong>回写在驱逐时发生(替换 / 一致性 / clflush),不由”cacheline 写满”触发</strong>—— 行永远是 64B,没有”填满”概念。(“攒满才刷”是 WC/LFB 的行为,不是 WB。)

设备读 WQE —— 印证”不刷 DRAM”
WQE 现在只在 L1D(M 态,脏),DRAM 还是旧的。coherent DMA 的读是一致性请求 → snoop CPU cache → 发现 L1D 脏行 → 从 L1D 取/转发给设备。<strong>DRAM 全程没参与。</strong>

## 6. WC 与 LFB(Line Fill Buffer)


LFB 是什么
<strong>LFB(Line Fill Buffer)是共享资源,Intel 上约 10-12 个/核</strong>,身兼两职:

- <strong>本职</strong>:服务 cache miss——load/store 未命中时分配 LFB 去取那条 cacheline。
- <strong>兼职</strong>:WC 合并缓冲——WC 内存不进 cache,写就攒进 LFB。关键性质:

- 每个 LFB = <strong>64B</strong>(一条 cacheline)。这就是 64B 粒度的来源。
- <strong>字节掩码(byte-enable)</strong>:同一 64B 区的多次写按字节合并,记录哪些字节写过。
- <strong>多个 LFB 之间的驱逐顺序不保证</strong>——WC 只保证单个 64B 区内按地址合并,跨 buffer 可乱序。
- <strong>驱逐触发</strong>:写满 64B / `SFENCE`·`MFENCE`·serializing 指令 / 读 WC·UC 区 / locked 指令 / 中断 / LFB 不够用(提前逐出)/ 硬件机会性逐出。<strong>没有定时器。</strong>
WC 写 3 个 8B 后未写满会怎样

- flush 前没写第 4 个 → 只把 masked 的 24B 发出去,LFB 释放、mask 清 0。
- flush 前写了第 4 个 → mask 补满 → 合并成整块发。
- flush 后再写同地址 = 分配全新 LFB,从空(mask=0)开始,不”续”上一条。
UC 去哪
UC store 不进 cache、不做 write-combining、不合并: `store buffer → 直接作为一笔独立总线事务发出`,按程序序,一写一事务,严格保序。 发事务时可能短暂占个 buffer 做总线接口,但<strong>没有合并语义</strong>。 UC 读是 non-posted(阻塞,等设备返回),所以读控制寄存器慢。

## 7. BlueFame:WC 直推 WQE 与多 TLP 重组


两条投递路径

- <strong>普通 doorbell(DB)</strong>:WQE 写进 host DRAM 的 SQ ring → 敲 8B doorbell → 设备 DMA 回读 WQE。有一次 PCIe 读往返延迟。
- <strong>BlueFlame(BF)</strong>:CPU 把整条 WQE 用 <strong>WC MMIO 写直接推进设备 BAR 的 BF 寄存器</strong>。 WQE 本身就是 doorbell,省掉 DMA 回读。WC 刷向<strong>设备 MMIO</strong>,不经过 DRAM/cache。
mlx5 关键代码

```text
// post_send_db 分支之前无条件执行:
udma_to_device_barrier();
qp->db[MLX5_SND_DBR] = htobe32(qp->sq.cur_post & 0xffff);   // producer index 写进 dbrec

// 两条路径:
if (... size <= bf->buf_size / 16)
    mlx5_bf_copy(bf->reg + bf->offset, ctrl, align(size*16, 64), qp);  // BF:整条 WQE WC 推
else
    mmio_write64_be(bf->reg + bf->offset, *(__be64 *)ctrl);            // DB:只推 8 字节 doorbell
```


mmio_flush_writes();     // sfence:把本条 WQE 的 WC buffer 全挤出

```text
bf->offset ^= bf->buf_size;   // 乒乓两个 BF buffer,防相邻 doorbell WC 合并
```


mlx5 的 doorbell 8 字节其实带 size
控制段头 8 字节布局:

```text
struct mlx5_wqe_ctrl_seg {
    __be32 opmod_idx_opcode;   // byte 0-3: opmod(8) | wqe_index(16) | opcode(8)
    __be32 qpn_ds;             // byte 4-7: qpn(24) | ds(8)   ← ds = 描述符大小(16B 为单位)
    ...
};
mmio_write64_be(..., *(__be64*)ctrl)` 写的正是这 8 字节 = `{opcode, wqe_index, qpn, ds}`。 所以 **DB 路径的 doorbell 就带着 size(ds)和 index**。
```


BF 路径的正确性锚点是 ring,不是 push

- `mlx5_bf_copy` 的 `src` 就是 <strong>ring 里的 WQE</strong>(到 `qp->sq.qend` 回绕 `sq_start`)。 即 WQE 完整躺在 host ring 里,BF 只是推一份副本省 DMA。
- `qp->db[MLX5_SND_DBR] = cur_post` 在<strong>两条路径都执行</strong>,producer index 独立、有序。
- 因此 <strong>BF push 拼没拼齐不是正确性依赖</strong>:撕裂 / 乱序 → HW 凭 producer index DMA 回读 ring 那份权威副本。push 成了就快,没成就回退,都对。
驱动实际防的乱序
代码注释防的<strong>不是 WQE 内部块乱序</strong>,而是<strong>跨 CPU 的 doorbell 之间乱序</strong>: CPU A 的 doorbell 卡在 WC buffer,CPU B 的先被 flush → HCA 先看到 2 再看到 1。 解法:`mmio_wc_spinlock` + flush 放锁内 + `bf->offset ^= buf_size`(buffer 乒乓)。

## 8. PCIe TLP、MPS 与 write-coalescing


三个不同层次,别串成一条流水线
① store 指令  →  ② WC fill buffer(64B/条)  →  ③ 根复合体 RC 打 PCIe TLP(≤MPS)
   CPU 核内         CPU uncore                     PCIe 链路

- <strong>64B</strong> 是 ②层(WC fill buffer = 1 cacheline)的粒度。
- <strong>MPS(Max Payload Size,128/256/512…)</strong> 是 ③层 PCIe 打包的<strong>上限</strong>,不是触发器。
常见误解:没有 256B 累加器

- 每个 64B WC buffer <strong>独立驱逐</strong>,CPU 不会等 4 个凑成 256B 再一起走。
- MPS 不触发 TLP;TLP 由”RC 有数据要发”触发,MPS 只限单个 TLP 大小。
- 256B WQE = 4 个 64B WC 驱逐 → RC → 常见 4 个 64B TLP, 或 RC 机会性合并成 ≤256B 的更大 TLP(平台相关,不保证)。
RC 何时把 4×64B 合并成 256B
机会性优化,需同时满足:

- 地址连续(offset 0/64/128/192 首尾相接)。
- 背靠背到达(一条 sfence 一起驱逐,紧挨着涌到 RC)。
- 对齐且不跨 4KB 边界(PCIe 规则:一个 TLP payload 不能跨 4KB)。
- MPS 协商 ≥ 256(取整条路径最小值)。
- RC 实现支持 write-coalescing。<strong>全满足也只是”有机会”,软件不能依赖。合并只影响快慢,不影响对错。</strong>

## 9. 设备侧完整性判断:乱序到达怎么办


RC 靠地址,不靠身份
LFB 发给 RC 的每笔写带 `[物理地址 + 数据 + 字节掩码]`,<strong>没有”这是 WQE #N”标签</strong>。 RC 纯看地址是否首尾相接来决定合并。地址是从 LFB → RC → TLP → 设备<strong>每一层唯一的钥匙</strong>。 乱序也不怕:每笔自带绝对地址,任意层都能<strong>按地址归位</strong>重组。

PCIe posted 保序
同一 requester、同一 TC、<strong>非 Relaxed-Ordering</strong> 的 posted write,不许越过另一个 posted write → 按发出顺序投递。所以严格序下 4 条 TLP <strong>不会乱序到达</strong>(前提:不开 RO)。 但 CPU 侧 LFB 驱逐顺序不保证,故设备仍需按地址重组以防万一。

判”齐没齐”:coverage 位图,不是裸计数器

- 裸计数器(数够 256 就算齐)<strong>不够</strong>:有间隙/重复会误判(如 offset 64 收两次、offset 0 没来)。
- 通用 robust 做法 = <strong>地址索引的 valid 位图(scoreboard)</strong>:每个 TLP 按地址点亮对应字节的 valid 位,`[0, size)` 全点亮才判齐。天然去重、天然查间隙。
mlx5 实际更简单
不赌 BF push 完美重组,而是靠三重保险:

- <strong>doorbell 8 字节带 ds</strong> → size。
- <strong>dbrec 的 producer index</strong> → 独立权威给 size。
- <strong>SQ ring 里有权威完整副本</strong> → 拼不齐就 DMA 回读。所以 header(控制段)晚到也只会让设备<strong>多等</strong>(没 size 不敢处理 = 安全), 绝不会”看见字段就取半截”。BF gate 在”数够字节”,不在”看见字段”。

## 10. 一致性 DMA vs 非一致 DMA

核心:cache 夹在 CPU 和设备中间。CPU 写先落 cache,DRAM 可能还是旧的。

一致性 DMA(coherent)
设备挂在一致性总线上,读内存时 snoop CPU cache:

- 设备读 → 最新值在 cache 也自动拿到。
- 设备写 → 自动作废 CPU 对应 cache 行。硬件全包,<strong>软件不用刷 cache,只需 barrier 管顺序</strong>。x86 PCIe、服务器级 ARM(Neoverse + CMN / CXL)都是这类。

非一致 DMA(non-coherent)
设备绕过 cache 直接读写 DRAM,cache 与 DRAM 可能不一致,软件必须手动对账:

方向场景手动操作to-device(CPU 写,设备读)WQE、TX 数据先 clean/写回(DC CVAC)把 cache 抄进 DRAMfrom-device(设备写,CPU 读)CQE、RX 数据先 invalidate(DC CIVAC)让 CPU 重取 DRAM低端嵌入式 ARM SoC 某些 master 属于此类。

两条正交的轴

- <strong>coherency(一致性)</strong> → 管数据值同步,决定要不要刷 cache。
- <strong>barrier(内存屏障)</strong> → 管顺序 / 可见时机,决定 store 谁先谁后。**只有 non-coherent 才有”真刷 DRAM”这一步,而且是 `DC` cache 指令干的,不是 barrier 干的。**

## 11. ARM 弱序架构上的差异

核心:<strong>x86 靠 TSO 白送的顺序,ARM 全部要显式 barrier</strong>。排序点数量一样,但在 ARM 上每个都是真指令。

内存类型对照
x86ARMWBNormal, Cacheable, Write-BackWCNormal Non-cacheable / Device-GREUC(严格)Device-nGnRnEUC(宽松)Device-nGnRE
barrier 指令
指令作用DMB排序内存访问,不等完成。域:ISH/OSH/SY;方向:ST/LDDSB更强,等访问真正完成才放行。敲设备前常用STLR/LDARstore-release / load-acquire,单向序,比全 DMB 便宜
流程对比
x86:                              ARM:

```text
build WQE (WB)   // TSO 自动排序     build WQE (Normal)
compiler_barrier                   dmb oshst   (真指令)
```

write dbrec                        write dbrec
sfence  // 仅 WC BF                 dsb oshst / dsb sy
write doorbell                     write doorbell (Device-nGnRnE)
owner-last` 在 ARM 需要 `dmb ishst` 或用 `STLR`(store-release)保证 body 先于 owner。

非一致 DMA 上的完整发送流程(描述符若为 cacheable)

```text
build_wqe_body(wqe);
```

asm volatile("dmb ishst" ::: "memory");   // body 先于 owner(或 owner 用 STLR)

```cpp
wqe->ctrl.owner = OWN_HW;

for (char *p = (char*)wqe; p < (char*)wqe + wqe_len; p += cache_line_size)
    asm volatile("dc cvac, %0" :: "r"(p) : "memory");   // clean 到 PoC(DRAM)
```

asm volatile("dsb osh" ::: "memory");                   // 等 clean 真完成

*dbrec = producer_index;
asm volatile("dc cvac, %0" :: "r"(dbrec) : "memory");
asm volatile("dsb osh" ::: "memory");

*doorbell_reg = db_val;                                 // Device-nGnRnE,无需 DC
接收方向(CQ 轮询)读前要 `DC CIVAC`+DSB;`DC IVAC` 是 EL1 特权,用户态只能 CIVAC—— 所以<strong>实务一律把 SQ/CQ/dbrec 放 non-cacheable 绕开 cache maintenance,只对 payload 做 streaming sync</strong>。

## 12. LFB 资源竞争


RFO 与 WC 抢同一个池
LFB(~10-12/核)同时服务:load miss、store RFO、WC 合并、非临时写、prefetch。 <strong>RFO 和 WC 确实抢资源。</strong>

占用性质不同
占用时长谁决定释放RFO内存延迟(有界):L2≈12 / L3≈40 / DRAM≈200+ cycle硬件,填完自动放WC到 fence / 满为止软件,可能拖很久
两个方向的干扰

- <strong>RFO 挤 WC</strong>:大量 miss 高频占 LFB → WC 攒不下 → 提前碎逐出 → 碎 TLP、吞吐降、BF 延迟涨。
- <strong>WC 挤 RFO</strong>:狂发 WC 又不及时 fence → LFB 被长期握住 → 新 RFO/load 阻塞等释放。用 Little 定律:`占用数 = 到达率 × 单个占用时长`,高 miss 率占满池即挤压 WC。

规避
WC 写<strong>地址集中</strong>(别散写 >12 个不同 64B 行)、<strong>及时 sfence</strong>、<strong>别跟大量 cache-miss 的 WB 流量混跑</strong>。

## 13. 核心结论速查


- <strong>doorbell 前只需一次 barrier</strong>,不是两次。mlx5 SQ 走”doorbell 模型”, WQE 内部字段顺序 HW 看不到。
- <strong>barrier 管顺序/可见性,不通知设备(doorbell 才通知)、不刷 DRAM</strong>。 x86 上 WB 的这条基本是编译器 barrier;真 sfence 只为 WC(BlueFlame)。
- <strong>WB</strong>:RFO 取整 64B 进 L1D 并夺独占 → 就地改 8B → 行赖在 L1D(M 态)→ 驱逐才回写; 设备靠 snoop 从 cache 直接读,DRAM 没碰。
- <strong>WC</strong>:LFB 64B 合并、LFB 间乱序、需 sfence。<strong>UC</strong>:不合并不缓存不乱序的最严格类型, 一写一事务;<strong>不是 WC 简化版,是它的反面</strong>。
- <strong>BlueFlame</strong>:用 WC 把整条 WQE 直推网卡省 DMA;但 ring 副本 + producer index 始终是权威, push 乱序/拼不齐就回退 DMA 回读——正确性锚在 ring,不锚在 push。
- <strong>PCIe</strong>:64B 是 CPU 合并写的粒度,MPS 是 PCIe 打包的尺寸帽子,中间没有”凑满 256 再发”这一步; RC 靠<strong>地址连续</strong>(非身份)决定合并,设备按<strong>地址归位</strong>重组,靠 coverage 位图判齐。
- <strong>一致性 vs 非一致 DMA</strong>:coherency 管”值同步/刷不刷 cache”,barrier 管”顺序/何时可见”—— 两条正交的轴。只有 non-coherent 才真刷 cache(`DC` 指令)。
- <strong>ARM</strong>:排序点没变多,只是把 x86 白嫖的顺序全按真 barrier(DMB/DSB/STLR)收费, 内存类型换成 Normal / Device-nGnRnE 那套。
- <strong>LFB 竞争</strong>:瓶颈是池小(~10-12),不是 RFO 慢。高 miss 率按 Little 定律占满池即挤 WC。