---
title: "[AI][昇腾950]NVMe驱动方式分析"
date: "2026-07-28 00:00:00"
updated: "2026-07-28 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/AI-infra/[AI][昇腾950]NVMe驱动方式分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2065534316545937587
---


1. 摘要
昇腾950 平台驱动 NVMe SSD 有 <strong>4 条可行路径</strong>，硬件支撑度从高到低：

#路径Master硬件支撑软件复杂度适用场景1Host CPU + PCIe DMAHost CPU / STARS 调度 PCIe DMA✅低（标准 NVMe driver）主流方案，大块数据2AIV PCIE-THROUGH 直接搬运AIV（MTE2/MTE3）✅中（需配 VA window + AIV kernel）AIV 自治、低延迟小数据3STARS + PCIe ThroughSTARS（c-core/A55）✅中（STARS 软件 + PCIe TH 配置）STARS 直接与 Host 交互 SQE/CQE4SDMA + PCIe BARSTARS 调度 SDMA✅ （SDMAA→PCIe Bar） 支持 STARS→SDMA 单向）中高（SDMA SQE + 跨 PCIe 拆分约束）大块 HBM↔PCIe 搬运<strong>关键差异（昇腾950）</strong>：

- 昇腾950 <strong>AIV PCIE-THROUGH 硬件能力后续能力兼容</strong>
- 昇腾950 <strong>调度链路受限</strong>：HSCB 1.0 硬连线，仅 STARS→AICORE/SDMA 单向，<strong>AICPU 不能调度 AICore</strong>，AICore 不能调度 CCU
- 因此 昇腾950 下 AIV 自治驱动 NVMe（路径2）AICPU 介入调度的能力弱，AIV 直接走 PCIe-THROUGH 反而更顺畅
2. 昇腾950 PCIe-Through 能力
项昇腾950配置方式SPR 或 VA space（VA 优先）VA 窗口≥1GB，boot-time 配置Burst512B/256B/128B 可配支持 pipeAIV MTE2（BUS→UB）+ MTE3（UB→BUS）Atomic不支持数据返回64B/128B 粒度乱序，MTE ROB 重排128B 边界拼接不跨 128B 边界<strong>结论</strong>：AIV 通过 PCIE-THROUGH 直接访问 PCIe（含 NVMe）的硬件能力在 昇腾950 即已具备，后续兼容未做机制性改动。

<strong>结论</strong>：昇腾950 是多 master 共享的 PCIe 访问机制，AICORE（含 AIV）是其中之一。

3. 四条 NVMe 驱动路径详解

路径 1：Host CPU + PCIe DMA（昇腾950 主流方案）
Host CPU                          昇腾950
  │                                  │
  │  1. PCIe 枚举发现 NVMe EP         │
  │  2. NVMe driver 初始化 Admin/SQ/CQ│
  │  3. 提交 NVMe Read/Write SQE      │
  │◀────── PCIe Doorbell ─────────────│
  │                                  │
  │           STARS 调度 PCIe DMA ────┤  
  │                                  │  PCIe DMA 通道搬运数据
  │◀────── PCIe DMA 数据 ─────────────┤
  │                                  │
  │  4. CQ 中断（MSI-X）上报完成       │
  │◀────── MSI-X ─────────────────────│
<strong>硬件支撑</strong>：

- STARS 调度 PCIe DMA 通道（昇腾950 原生支持）<strong>软件链路</strong>：

- Host CPU 运行标准 Linux NVMe driver
- NVMe driver 经 PCIe BAR 发现 NVMe 控制器寄存器
- STARS 或 Host CPU 配置 PCIe DMA 通道搬运 SQE/CQE/data
- NVMe 完成后 MSI-X 中断上报 Host<strong>优点</strong>：成熟、标准、大块数据高效 <strong>缺点</strong>：依赖 Host CPU，Device 侧不能自治

路径 2：AIV PCIE-THROUGH 直接搬运（AIV 自治）

```text
AIV Kernel (昇腾950)
  │
  │  DataCopy<AIV>::Copy(ubBuf, nvmeBufVA_in_PCIE_window, size)
  │    → MTE2 DMA MOV (pcie_through enabled)
  │    → BIF → NoC BUS → PCIe RC ATU → PCIe TLP → NVMe
  │
  │  DataCopy<AIV>::Copy(nvmeBufVA_in_PCIE_window, ubBuf, size)
  │    → MTE3 DMA MOV (pcie_through enabled)
  │    → PCIe RC ATU → PCIe TLP → NVMe
  │
  └─ 绕过 STARS / SDMA / PCIe DMA / AICPU
```

<strong>硬件支撑</strong>：

- AIV MTE2/MTE3 PCIE-THROUGH mode 完整支持
- AICORE → PCIE，支持 1B~512B
- 配置 VA→PCIe BUS 地址<strong>配置要点</strong> ：

- boot-time 配置 PCIE-THROUGH VA window（≥1GB，对齐窗口大小）
- 配置 AIV SMMU bypass（PCIe-through 走 bypass，由 PCIe ATU 翻译）
- 配置 PCIe 把 VA window 映射到 NVMe BAR 空间
- AIV Kernel 用 DataCopy 访问 VA window，保证 128B 对齐、stride×repeat 不跨窗口、单 burst ≤512B<strong>NVMe 命令提交</strong>：AIV 不能直接 ring NVMe Doorbell（MMIO 寄存器需 CPU 类指令），需配合：

- <strong>模式 A</strong>：Host CPU / STARS CPU 提交 NVMe 命令，AIV 只搬数据
- <strong>模式 B</strong>：STARS CPU 运行精简 NVMe driver 子集，提交 Admin/SQ/CQ + Doorbell，AIV 搬运 data buffer<strong>优点</strong>：无 STARS/SDMA 调度开销，AIV 自治，低延迟小数据 <strong>缺点</strong>：单 burst ≤512B、不支持 atomic、不支持 L2Cache hint、需配合 CPU 提交 NVMe 命令

路径 3：STARS + PCIe Through（STARS 直接与 Host 交互）
<strong>与 NVMe 关系</strong>：此路径主要用于 STARS↔Host 控制面交互，若 Host 侧 NVMe driver 把 SQ/CQ 暴露给 STARS，STARS 可直接提交 NVMe SQE。但 STARS 本身不搬运数据，数据搬运由 PCIe DMA（路径1）或 AIV PCIE-THROUGH（路径2）完成。

<strong>优点</strong>：STARS 主动调度，减少 Host CPU 介入 <strong>缺点</strong>：STARS 软件开发复杂，昇腾950 STARS 算力有限

路径 4：SDMA + PCIe BAR（大块数据搬运）
STARS → SDMAM → SDMAA → HA → PCIe BAR → NVMe
                          ↑
              SDMAA → PCIe Bar
              支持 128B/256B/512B，close门控
<strong>硬件支撑</strong>：

- SDMAA 经 HA→PCIE 访问 PCIe BAR，支持 128B/256B/512B
- 昇腾950 支持 STARS→SDMA 单向调度
- 跨 PCIe 搬运 SDMAA 根据地址拆分请求，不受 HA MRRS 限制；PCIe 不支持 atomic，跨 PCIe reduce 需下发到目的地址所在片<strong>约束</strong>

- 跨 PCIe 搬运需用目的地址同片的 SDMAM
- PCIe 不支持 atomic，reduce 需片内做
- SDMAA 请求拆分不受 HA MRRS 限制
- Bypass SMMU 模式下用 PA 搬运<strong>优点</strong>：大块数据高带宽，SDMA 40 通道并行 <strong>缺点</strong>：调度开销高（STARS SQE + SDMAM 解析），不适合低延迟小数据

4. 昇腾950 NVMe 驱动推荐方案

4.1 主流方案：Host CPU + PCIe DMA（路径1）
适用绝大多数生产场景。Host CPU 运行标准 NVMe driver，STARS 调度 PCIe DMA 搬运大块数据。硬件支撑度最高，软件最成熟。

4.2 低延迟方案：AIV PCIE-THROUGH（路径2）
适用 AIV 需要低延迟访问 NVMe 小批量数据的场景（如 KV-Cache 拉取、梯度写回）。配置要点：

1. SC boot-time:
   - 配置 PCIe RC TX ATU：VA window (≥1GB) → NVMe BAR 空间
   - 配置 AIV MTE PCIE-THROUGH VA window（与 ATU 对应）
   - 配置 AIV SMMU bypass

2. STARS CPU  运行精简 NVMe driver:
   - 枚举 NVMe EP（经 PCIE TH，系统参数行42）
   - 初始化 Admin/SQ/CQ，ring Doorbell
   - 在 HBM 分配 NVMe data buffer，ATU 映射

3. AIV Kernel:
   - DataCopy<AIV>::Copy 从 PCIE window 读 data buffer 到 UB (MTE2)
   - 计算
   - DataCopy<AIV>::Copy 从 UB 写回 PCIE window (MTE3)
   - PipeBarrier 等待完成

4. STARS CPU 检查 CQ，确认 NVMe 写完成
<strong>昇腾950 特有优势</strong>：因 AICPU 不能调度 AICore ，AIV 直接经 PCIE-THROUGH 访问 NVMe 避免了对 AICPU 调度链路的依赖。

4.3 大块数据方案：SDMA + PCIe BAR（路径4）
适用 HBM↔NVMe 大块数据搬运（模型加载、checkpoint 落盘）。STARS 调度 SDMA，SDMAA 经 PCIe BAR 搬运。需遵守跨 PCIe 拆分约束。

5. AIV + NVMe 读写性能不对称与读易受干扰
从硬件机制层面解释 AIV 经 PCIE-THROUGH 驱动 NVMe 时，<strong>读性能显著低于写性能</strong>且<strong>读易受干扰</strong>的根因。

5.1 典型现象
现象表现读写带宽不对称AIV 写 NVMe（MTE3 UB→BUS）带宽 >> AIV 读 NVMe（MTE2 BUS→UB）带宽读延迟远高于写写几乎只受 PCIe link RTT + NVMe ACK 主导；读额外承受 NVMe 介质访问延迟 + ROB 重排延迟读易受干扰BUS 上其他 master 流量、TAGID 耗尽、PCIe 乱序返回、NVMe 内部调度、其他 AIV 核竞争 ROB/outstanding 都会拖慢读写不易受干扰写是”fire-and-forget”，MTE 发出后即释放资源，PCIe 端缓冲吸收，干扰窗口极小
5.2 根因一句话
<strong>写路径单向、顺序、无需重排、资源占用瞬时释放；读路径双向、乱序、必须 ROB 重排、资源长期占用且对 BUS 反压敏感。</strong>

5.3 根因分层
┌─────────────────────────────────────────────────────────────┐
│  应用层：NVMe Read 需介质访问(50~100us)，Write 只需 ACK(<1us) │
├─────────────────────────────────────────────────────────────┤
│  PCIe 层：Read TLP 需 Completion TLP 返回(乱序)，Write TLP   │
│           即发即弃(缓冲吸收)                                  │
├─────────────────────────────────────────────────────────────┤
│  MTE 层：读需 ROB 重排+拼接(64B块)，占用 TAGID+ROB entry；    │
│          写保持 128B 粒度，无需拆分，资源瞬时释放              │
├─────────────────────────────────────────────────────────────┤
│  BUS 层：读通道受 back pressure(TAGID满/BUS反压)，写通道反压小 │
├─────────────────────────────────────────────────────────────┤
│  资源层：outstanding 读 64~128 笔，TAGID 共享，ROB 容量有限；  │
│          写 outstanding 同等但占用时间短                       │
└─────────────────────────────────────────────────────────────┘

5.4 写路径的”快”来自

- 写路径 back pressure（小）; 写通道反压仅在 <strong>TAGID 全部占用</strong> 或 <strong>BUS 主动反压</strong> 时触发。由于 Write TLP 是 posted，PCIe 端缓冲深度大，BUS 反压概率低；TAGID 占用时间短（发出即释放，不等 ACK）。因此写路径反压窗口极小。
- 写路径无需 ROB 重排; 写路径数据来自 UB，顺序读出，MTE 按顺序发 write request，<strong>不需要 ROB 重排</strong>。
5.5 读路径的”慢”来自
环节特性影响NVMe 介质读需真实介质访问，50~100us主导延迟PCIe Completion非 posted，必须等 NVMe 返回数据双向 RTT + 介质延迟PCIe 乱序burst 间 + burst 内乱序，64B/128B 混合粒度必须 ROB 重排，重排有延迟ROB 重排按 TAGID 链表顺序拼接 64B 块占用 ROB entry，重排算法有开销128B 拼接约束128B 数据拼接不能跨 128B 地址边界不对齐时需额外缓冲对齐TAGID 占用读 request 发出后 TAGID 持续占用直到数据返回+重排完成长时间占用，易耗尽outstanding 限制PCIe mode 读 outstanding 64~128 笔并发上限，受 NVMe 响应速度制约BUS 反压读通道在 TAGID 满或 BUS 反压时 on-hold核心干扰点UB 写回 bank conflictUB Write 与 BUS Write 同 bank 冲突时 BUS Write 被反压读路径末端反压
- 读路径 back pressure（大，核心干扰点）读路径有<strong>双重反压</strong>：

- <strong>请求侧反压</strong>：TAGID 耗尽或 BUS 反压 → 新读请求 on-hold → outstanding 不再增加 → 吞吐下降
- <strong>数据侧反压</strong>：ROB 重排后的数据写 UB 时，若 UB bank conflict 或写接口反压 → 数据滞留在 back pressure data FIFO → ROB 空间不释放 → 反向影响新数据接收
6. 读写不对称的 6 个根因（逐条对照）

根因 1：NVMe 介质延迟不对称（应用层，主导因素）
操作NVMe 侧延迟Write控制器缓冲接收，ACK 快速返回（<1us），介质写入异步后台Read必须真实介质访问，50~100us（TLC），QLC 更长AIV 发一笔 512B write：PCIe RTT(~1us) + NVMe ACK(<1us) ≈ 2us 即可释放资源发下一笔。 AIV 发一笔 512B read：PCIe RTT(~1us) + NVMe 介质(50~100us) + ROB 重排 ≈ 50~100us 才能释放资源。

<strong>单笔延迟差 25~50 倍</strong>，这是读写不对称的最主要来源。

根因 2：PCIe 事务类型不对称（协议层）
事务PCIe 类型行为WriteMemory Write TLP（posted）即发即弃，无需 Completion，RC/switch 缓冲吸收ReadMemory Read TLP（non-posted）必须等 Completion TLP 返回，占用 outstanding 信用Write TLP 不占 read completion 信用，PCIe 端缓冲深，几乎不反压。 Read TLP 占用 outstanding 信用（PCIe 协议层 credit），受 NVMe 响应速度制约，credit 回收慢。

根因 3：MTE 数据处理不对称（MTE 层）
项写（MTE3）读（MTE2）数据来源UB（本地，顺序，快）PCIe BUS（远端，乱序，慢）数据粒度处理保持 128B，无需拆分64B/128B 混合粒度，需拼接ROB不涉及必须 ROB 重排（64B 块按 TAGID 链表顺序）128B 边界无约束拼接不跨 128B 地址边界对齐缓冲无alignment buffer 收集拼接每行数据读路径的 ROB 重排是写路径完全没有的额外环节。

重排需维护链表、按 recycle status 调度，有固有开销，且 ROB 容量有限。

根因 4：资源占用时长不对称（资源层）
资源写占用时长读占用时长TAGID短（发 request 后即可回收，不等 ACK）长（发 request 到数据返回+重排完成）outstanding短长（受 NVMe 介质延迟制约）ROB entry不占用占用直到重排完成RRETMSG不占用占用（返回消息缓冲）back pressure FIFO不涉及滞留数据时占用读路径资源占用时长 = PCIe RTT + NVMe 介质 + ROB 重排，是写路径的 25~50 倍。资源长期占用导致 outstanding 耗尽快，新请求被 on-hold。

根因 5：outstanding 上限不对称的影响放大
MTE FS（PCIE mode）outstanding 限制：

- 512B burst：<strong>64 outstanding</strong>（line 1413）
- 256B/128B burst：128 outstanding写路径：64 笔 outstanding × 512B = 32KB 在途，因释放快，可持续填满。 读路径：64 笔 outstanding × 512B = 32KB 在途，但因每笔占用 50~100us，32KB 耗尽后必须等回收才能发新请求。

<strong>读有效带宽上限</strong> ≈ 32KB / 50us = 640 MB/s（最坏 NVMe 介质延迟下） <strong>写有效带宽上限</strong> ≈ outstanding × 512B / PCIe RTT ≈ 32KB / 2us = 16 GB/s（理论）

实际受 NVMe 控制器、PCIe link 带宽限制，但读写差距可达 <strong>10~25 倍</strong>。

根因 6：读路径干扰源多（干扰敏感性）
读路径因资源长期占用 + 双重反压，对以下干扰源敏感：

干扰源机制影响BUS 其他 master 流量共享 NoC BUS，其他 master（AIC MTE、DVPP、SDMA）占用 read 通道读 request 被仲裁延迟，completion 被 BUS 拥塞TAGID 共享竞争TAGID 跨指令/跨核共享（line 2291: “all read outstanding shared with all CORE”）多核同时读 PCIe 时 TAGID 耗尽更快ROB 容量竞争ROB 被多条读指令占用一条指令的 ROB entry 不足，重排阻塞UB bank conflictROB 数据写 UB 时与 AIV 本地 UB 写冲突BUS Write 被反压（line 1575: write-write conflict BUS Write 反压）PCIe completion 乱序加剧多笔 read outstanding 时 NVMe 乱序返回ROB 链表碎片化，重排延迟增加NVMe 内部调度NVMe 控制器多队列调度，读优先级可能低于写读 completion 延迟抖动大PCIe link 重传PCIe 链路误码重传completion 延迟尖峰其他 AIV 核 PCIe 读多核同时 PCIE-THROUGH 读TAGID/ROB/outstanding 竞争，互相拖慢写路径因资源瞬时释放，上述干扰源影响极小。

7. 读易受干扰的具体场景

7.1 场景 A：多 AIV 核并发读 NVMe
AIV0 读 NVMe LBA 0~63   ─┐
AIV1 读 NVMe LBA 64~127  ├─ 共享 TAGID 池（64~128 笔）+ ROB 容量
AIV2 读 NVMe LBA 128~191─┘

问题：
  - 3 核各需 outstanding，TAGID 池快速耗尽
  - ROB 容量被 3 条指令瓜分，每条指令重排空间不足
  - NVMe 乱序返回 3 核的 completion 混杂，ROB 链表碎片化
  - 读有效带宽随核数增加而下降（非线性）

7.2 场景 B：读与 AIC MTE 流量竞争 BUS
AIC MTE2 从 HBM 读 L1 数据（高带宽、持续）
  +
AIV MTE2 从 NVMe 读（PCIE-THROUGH，低带宽、长延迟）

问题：
  - NoC BUS read 通道被 AIC MTE2 占用，AIV read request 仲裁延迟
  - AIV read completion 经 BUS 返回时被 AIC 流量拥塞
  - AIV TAGID 占用时间进一步拉长 → outstanding 耗尽 → on-hold

7.3 场景 C：读数据写回 UB 时 bank conflict
AIV 正在向 UB 写本地计算结果（UB Write，高优先级）
  +
MTE2 ROB 重排完成后向 UB 写 NVMe 读回数据（BUS Write，低优先级）

MTE FS line 1575: "When bank conflict between UB Write and BUS Write (write-write conflict), the BUS Write is back pressured."

问题：
  - BUS Write（NVMe 读回数据）被 UB Write 反压
  - 数据滞留在 back pressure data FIFO
  - ROB 空间不释放 → 新 completion 无法进入 ROB → 恶性循环

7.4 场景 D：NVMe 介质延迟抖动
AIV 连续发 64 笔 512B read（outstanding 上限）
预期：每笔 50us 返回，流水线持续

实际：
  - NVMe 某些 LBA 命中缓存（<10us），某些需介质（100us）
  - completion 乱序加剧，ROB 链表需大跨度重排
  - 介质慢的笔占用 TAGID 100us，outstanding 被少量慢笔耗尽
  - "head-of-line blocking"：ROB 链表头部慢笔未到，后续快笔数据无法写出

7.5 缓解措施
手段原理配置增大 burst（512B）减少 read request 数量，降低 TAGID 压力SC 配 max_burst_len=512B对齐 128B避免 ROB 拼接跨边界开销buffer 分配
8. 读写不对称对照表
维度写（MTE3 UB→PCIe→NVMe）读（NVMe→PCIe→MTE2→UB）NVMe 介质延迟无（ACK 异步）50~100us（主导）PCIe 事务Posted Write TLPNon-posted Read + CompletionPCIe 返回无（缓冲吸收）64B/128B 粒度乱序MTE 处理保持 128B，无拆分ROB 重排 64B 块 + 128B 拼接ROB 占用无有（长期）TAGID 占用时长短（发后释放）长（等数据返回+重排）outstanding 有效上限高（释放快）低（占用久）back pressure小（write channel 反压少）大（read channel + data channel 双重）BUS 干扰敏感度低高UB bank conflict不涉及（UB 是源）涉及（UB 是目的，BUS Write 被反压）单笔延迟~1~2us~50~100us典型带宽比10~25x1x（基准）