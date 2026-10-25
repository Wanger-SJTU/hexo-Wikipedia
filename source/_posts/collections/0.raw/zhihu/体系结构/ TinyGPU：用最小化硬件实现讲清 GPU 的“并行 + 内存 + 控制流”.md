---
title: (1 封私信) TinyGPU：用最小化硬件实现讲清 GPU 的“并行 + 内存 + 控制流”
date: "2026-04-11 00:00:00"
updated: "2026-04-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/TinyGPU-用最小化硬件实现讲清-GPU-的“并行-内存-控制流”/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/2001389056492319761
---


#### 项目概述

`tiny-gpu` 是一个<strong>面向教学的最小化 GPU 硬件实现</strong>，目标是从“架构 → 控制信号 → 指令执行”把 GPU 的关键原理讲清楚。项目资料明确给出其特点包括：<strong>Verilog 文件</strong>、<strong>完整架构与 ISA 说明</strong>、可运行的<strong>矩阵加法/乘法 kernel</strong>，以及支持<strong>内核仿真与执行 trace</strong>（见 `README.md`）。

其使用方式被刻意简化为“单 kernel 模式”：在启动前由外部把 kernel 代码写入<strong>程序内存</strong>、数据写入<strong>数据内存</strong>，再把线程数写入<strong>设备控制寄存器（DCR）</strong>，最后拉高 `start` 触发执行。

#### 架构解析（从顶层到线程）

下表按源码模块划分 TinyGPU 的核心组件（文件名来自 `src/`）：

组件主要文件作用（资料/注释中明确的要点）顶层 GPUgpu.sv组织 DCR、Dispatcher、多个 Core，以及程序/数据内存控制器；对外暴露 start/done 与外部内存接口设备控制寄存器dcr.sv本实现里只保存 thread_count（总线程数）线程/块派发dispatch.sv把线程按 block 分组并分发给空闲 core；所有 block 完成后置 doneCore（每次处理一个 block）core.sv每个 core 处理一个 block；包含 fetch/decode 与每线程专属执行资源取指/译码/调度fetcher.sv / decoder.sv / scheduler.sv取 16-bit 指令、译码成控制信号、用状态机串起执行阶段计算与访存alu.sv / lsu.sv每线程一个 ALU/LSU；LSU 以异步请求 + 等待 ready的方式访问全局数据内存寄存器与 PCregisters.sv / pc.sv每线程一个寄存器文件与 PC/NZP（用于分支条件）内存控制器controller.sv在“多个消费者（线程/取指）→ 有限通道外部内存”之间做仲裁/节流/转发Cache（README 标注 WIP）资料明确写为 WIP，不作为当前核心路径依赖<strong>并行粒度与资源组织</strong>是该项目的教学重点：每个 core 一次只处理一个 block；对 block 内每个线程，都配置了<strong>专属的 ALU、LSU、PC、寄存器文件</strong>（这使得 SIMD/SIMT 的“每线程状态”更直观）。

#### ISA 与执行流程（最关键的“可读性接口”）

资料中明确：程序内存按 <strong>8-bit 地址（256 行）</strong>寻址、每行 <strong>16-bit 指令</strong>；数据内存按 <strong>8-bit 地址（256 行）</strong>寻址、每行 <strong>8-bit 数据</strong>。ISA 为<strong>11 条指令</strong>：`BRnzp, CMP, ADD, SUB, MUL, DIV, LDR, STR, CONST, RET`（外加 `NOP`）。

下面这段译码器定义展示了指令 opcode（便于对照 ISA 图与测试用例中的二进制程序）：

`localparam NOP = 4'b0000,
        BRnzp = 4'b0001,
        CMP = 4'b0010,
        ADD = 4'b0011,
        SUB = 4'b0100,
        MUL = 4'b0101,
        DIV = 4'b0110,
        LDR = 4'b0111,
        STR = 4'b1000,
        CONST = 4'b1001,
        RET = 4'b1111;`

执行控制上，Core 被拆成固定阶段：<strong>FETCH → DECODE → REQUEST → WAIT → EXECUTE → UPDATE</strong>。其中最能体现 GPU 难点的是 <strong>WAIT</strong>：`LDR/STR` 通过 LSU 发起异步访问，调度器需要等待所有线程的 LSU 都不再处于请求/等待态，才能进入执行阶段：

`// SCHEDULER
// > Manages the entire control flow of a single compute core processing 1 block
// 1. FETCH - Retrieve instruction at current program counter (PC) from program memory
// 2. DECODE - Decode the instruction into the relevant control signals
// 3. REQUEST - If we have an instruction that accesses memory, trigger the async memory requests from LSUs
// 4. WAIT - Wait for all async memory requests to resolve (if applicable)
// 5. EXECUTE - Execute computations on retrieved data from registers / memory
// 6. UPDATE - Update register values (including NZP register) and program counter
// > Each core has it's own scheduler where multiple threads can be processed with
//   the same control flow at once.`

#### 技术重难点分析（以及 TinyGPU 的“教学型取舍”）

- <strong>线程调度（Dispatcher ↔ Core）</strong>：`dispatch.sv` 以 <strong>block</strong> 为单位分发工作，体现了“线程总数 → block 切分 → core 领取”的基本模式，但不引入更复杂的占用率/资源建模（资料未描述此类策略）。
- <strong>内存访问与延迟处理（LSU + WAIT）</strong>：项目把内存延迟显式暴露为“请求/等待”，用最少状态机解释：为什么 GPU 需要围绕<strong>全局内存带宽与延迟</strong>来设计调度与结构。
- <strong>控制流与分支</strong>：资料明确说明当前实现<strong>假设线程在每条指令后 PC 收敛</strong>，即不处理真实 GPU 中的<strong>branch divergence</strong>；这让 `BRnzp/CMP/NZP` 的机制更易读，但也点出了真实架构的复杂度来源。
- <strong>带宽仲裁（Memory Controller）</strong>：顶层把多线程 LSU 访问汇聚到固定通道的外部内存接口，强调“<strong>请求数 > 带宽</strong>时必须仲裁/节流”的现实约束。
- <strong>Cache 与高级优化</strong>：`README.md` 将 cache 标注为 <strong>WIP</strong>，并在 Advanced Functionality 讨论了 <strong>memory coalescing、pipelining、warp scheduling、barrier/同步、多级 cache/shared memory</strong> 等——作为读者进一步扩展的路线图，而非当前实现的既成事实。

### <strong>工程入口-流程</strong>（从“启动一个 kernel”到“所有线程结束”）：

- 项目提供基于 `iverilog + cocotb` 的仿真（`make test_matadd`/`make test_matmul`），并生成执行日志与 trace，方便做“功能正确性 + 微架构行为”的联合观察。

下面按 <strong>主机侧准备 → GPU 顶层调度 → Core 内部流水（状态机）→ 访存与回写</strong> 这条链路，把 TinyGPU 的工作流程串起来说明。

#### 1) 启动前：外部把三件事准备好

TinyGPU 设计成“一次只跑一个 kernel”。启动前需要（对应 `README.md` 的描述）：

- <strong>写程序内存（Program Memory）</strong>：把 kernel 的 16-bit 指令序列写到 0..N 行（8-bit 地址、最多 256 行）。
- <strong>写数据内存（Data Memory）</strong>：把输入矩阵/向量等数据写到全局数据内存（8-bit 地址、每行 8-bit 数据）。
- <strong>写设备控制寄存器 DCR</strong>：把本次 kernel 需要启动的 **`thread_count`** 写进去（总线程数）。
最后将 **`start` 拉高<strong>，GPU 开始运行，直到顶层输出</strong>`done=1`**。

#### 2) 顶层：把 thread 切成 block，并分发到多个 core

顶层 `gpu.sv` 里最关键的组合是：<strong>DCR + Dispatcher + 多个 Core +（程序/数据）内存控制器</strong>。

- **DCR（`dcr.sv`）**：输出 `thread_count`。
- **Dispatcher（`dispatch.sv`）**：  

- 根据 `THREADS_PER_BLOCK` 把总线程数切成若干个 <strong>block</strong>：**\text{total\_blocks}=\lceil \text{thread\_count}/\text{THREADS\_PER\_BLOCK}\rceil
- 每个 core 空闲时就分配一个 block：给 core 下发 `block_id`<strong>，以及该 block 实际有效的</strong>`thread_count`**（最后一个 block 可能不足整块）。
- core 完成后回报 `core_done`，Dispatcher 统计 `blocks_done`；当 <strong>所有 block 都 done</strong>，顶层 `done` 置 1。

这一步的教学价值在于：你能清晰看到 <strong>thread → block → core</strong> 的映射关系，而不被更复杂的占用率/warp/多 kernel 并发干扰（这些在资料里被列为后续扩展点）。

#### 3) Core 内部：一个“共享控制流”的多线程执行框架

每个 `core.sv` <strong>一次只处理一个 block</strong>。核心思想是：

- 一个 core 里有 <strong>1 套取指（Fetcher）+ 1 套译码（Decoder）+ 1 套调度（Scheduler）</strong>
- 但对 block 内每个线程，都有<strong>专属</strong>的：  

- <strong>寄存器文件</strong>（`registers.sv`）
- <strong>ALU</strong>（`alu.sv`）
- <strong>LSU</strong>（`lsu.sv`）
- <strong>PC/NZP</strong>（`pc.sv`）

**

也就是说：控制是“共享的阶段推进”，状态是“每线程独立一份”**。这正是它用来讲清 SIMD/SIMT 的关键取舍。

#### 4) 指令执行的 6 个阶段（Scheduler 状态机）

TinyGPU 把每条指令拆成固定阶段（`scheduler.sv`）：

- <strong>FETCH</strong>：Fetcher 从程序内存把 `current_pc` 指向的 16-bit 指令取回（通过程序内存控制器转发到外部通道）。
- <strong>DECODE</strong>：Decoder 把 opcode/寄存器号/immediate/nzp 等字段拆出来，生成控制信号（如写回、访存使能、ALU 操作选择等）。
- <strong>REQUEST</strong>：这一拍主要是“发起动作”：  

- `registers.sv` 读出本线程的 `rs/rt`
- 如果是 `LDR/STR`，LSU 进入请求流程，准备对全局数据内存发起访问

**

- WAIT**（关键难点）：如果有异步访存，Scheduler 会停在 WAIT，直到需要的 LSU 都不再处于“请求/等待”状态。
- <strong>EXECUTE</strong>：ALU 计算（ADD/SUB/MUL/DIV），PC 逻辑计算 next_pc（含 BRnzp 判断）。
- <strong>UPDATE</strong>：写回寄存器、更新 NZP、推进 PC；若指令是 **`RET`**，则该 block 执行结束，core_done 拉高。
一个直观的“每条指令生命周期”可以理解为：

`FETCH → DECODE → REQUEST → (WAIT 如果有访存) → EXECUTE → UPDATE`

#### 5) 访存与“为什么必须 WAIT”（LSU + 内存控制器）

<strong>LDR/STR 是异步的</strong>，所以需要显式等待：

- **LSU（`lsu.sv`）**对每线程单独运作：  

- `LDR`：发起 `mem_read_valid + address`，等待外部 `mem_read_ready`，拿到 `mem_read_data`，把结果缓存到 `lsu_out`
- `STR`：发起 `mem_write_valid + address + data`，等待 `mem_write_ready`

**

- 数据内存控制器（`controller.sv`）**在“很多 LSU 请求”与“有限外部通道（例如 4 通道）”之间做仲裁/节流/转发。
因此 Scheduler 的 WAIT 阶段本质是在处理一个 GPU 的核心现实：<strong>外部内存带宽/延迟是瓶颈</strong>，硬件必须围绕它组织控制流。

#### 6) 分支与收敛（PC/NZP 的简化假设）

- `CMP` 会把比较结果写入每线程 PC 单元的 <strong>NZP</strong>（负/零/正标志）。
- `BRnzp` 根据指令携带的 `nzp` 掩码与 NZP 做匹配，决定 <strong>跳转到 immediate</strong> 还是 <strong>PC+1</strong>。
但 TinyGPU 为了简单明确写了一个限制：<strong>假设所有线程每条指令后都收敛到同一个 PC</strong>（即不实现真实 GPU 的 <strong>branch divergence</strong>）。所以它适合用来讲“分支机制本身”，而不是讲“发散与重汇合的硬件复杂度”。

#### 7) 仿真时你能看到什么（为什么它适合教学）

仓库用 `iverilog + cocotb` 做仿真（`make test_matadd` / `make test_matmul`）：

- 测试会把 <strong>程序指令（二进制）</strong>写入程序内存、把输入矩阵写入数据内存、设置线程数并启动。
- 运行过程中会打印每周期 trace（寄存器、PC、状态等），最终检查数据内存中的结果是否符合预期。

### 工程视角逐步理解 从顶层接口到每拍发生什么

我会把它按“工程实现视角”的链路拆开：先从顶层接口与时序（reset/start/done、内存握手）讲起，再逐级下钻到 Dispatcher 如何切 block、Core 的状态机如何驱动每线程 ALU/LSU/PC/寄存器，最后用 `matadd` 的一两条指令做端到端走读（从指令比特到控制信号再到写回）。接下来先补读 `controller.sv`、`fetcher.sv`、`alu.sv` 以避免任何细节猜测。

下面我按“<strong>硬件工程师拿到 RTL</strong>”的读法来走：先明确模块边界与接口协议，再把一次 kernel 的生命周期按<strong>时钟拍</strong>拆开。所有结论都来自仓库 `README.md` 与 `src/*.sv` 注释/代码；未出现的细节我不会补写。

### 1) 顶层边界：`gpu.sv` 到底对外暴露了什么？

#### 1.1 三类外部接口

`gpu.sv` 的端口可以分成三组（见 `gpu.sv` 端口声明）：

- <strong>时钟复位</strong>：`clk`, `reset`
- <strong>启动/结束握手</strong>：`start` 输入、`done` 输出（单 kernel 模式）
- <strong>外部内存接口（异步 ready/valid）</strong> 

- 程序内存：`program_mem_read_valid/address` → 外部；外部回 `program_mem_read_ready/data`
- 数据内存：读 `data_mem_read_valid/address`，写 `data_mem_write_valid/address/data`；外部回对应的 `*_ready`

**

这里的关键点是：TinyGPU 不实现片上 SRAM<strong>，而是假设</strong>外部异步内存**存在，内部通过控制器做多路仲裁（这也是它用来讲清“带宽受限”的工程现实）。

#### 1.2 DCR：只存 thread_count

设备控制寄存器 `dcr.sv` 只做一件事：在 `device_control_write_enable` 为 1 时，把 8-bit `device_control_data` 写入寄存器，并输出为 `thread_count`：

`reg [7:0] device_conrol_register;
    assign thread_count = device_conrol_register[7:0];

    always @(posedge clk) begin
        if (reset) begin
            device_conrol_register 

### 2) 外部内存如何被“接入”：`controller.sv` 的通道

`controller.sv` 是 TinyGPU 很“工程”的一块：它把“<strong>很多消费者</strong>”（program 侧是每个 core 的 fetcher；data 侧是每个线程的 LSU）汇聚到“<strong>有限通道</strong>”的外部内存接口。

#### 2.1  ready/valid 协议

- 消费者发起：`consumer_read_valid[j]=1` + `consumer_read_address[j]`
- 控制器把它映射到某个通道 i：`mem_read_valid[i]=1` + `mem_read_address[i]`
- 外部内存回应：`mem_read_ready[i]=1` + `mem_read_data[i]`
- 控制器回送到对应消费者：`consumer_read_ready[j]=1` + `consumer_read_data[j]`
写通道也类似：`*_write_valid/address/data` ↔ `*_write_ready`

#### 2.2 “拿起请求 → 等内存 → 回传 → 等消费者撤销 valid”的状态机

每个通道 i 有独立状态 `controller_state[i]`，核心流程在 `controller.sv` 里写得很直白：

- <strong>IDLE</strong>：轮询所有 consumer，找一个 `read_valid` 或 `write_valid`，并用 `channel_serving_consumer` 防止多个通道抢同一个 consumer 的请求
- <strong>READ_WAITING / WRITE_WAITING</strong>：等待外部 `mem_*_ready[i]`
- <strong>READ_RELAYING / WRITE_RELAYING</strong>：把 `consumer_*_ready` 拉高，并<strong>等待消费者撤销 valid</strong>（`!consumer_read_valid[...]`）才回到 IDLE
这最后一步非常“工程化”：它让 `ready` 像一个“完成握手的脉冲/保持信号”，直到对方把 `valid` 放下，避免丢应答。

### 3) 从 thread_count 到 block：`dispatch.sv` 如何驱动多核

Dispatcher 的职责就是把总线程数切块，并把 block 分配给空闲 core：

#### 3.1 切块规则（决定 block 数量）

`dispatch.sv` 用整除实现向上取整：

`wire [7:0] total_blocks;
    assign total_blocks = (thread_count + THREADS_PER_BLOCK - 1) / THREADS_PER_BLOCK;`

#### 3.2 对 core 的“启动包”包含什么

每次给一个 core 派发 block，会同时下发：

- `core_start[i]`（拉高启动）
- `core_block_id[i]`（blockIdx）
- `core_thread_count[i]`（该 block 实际线程数；最后一块可能不足 `THREADS_PER_BLOCK`）
这解释了为何 `core.sv` 里所有 per-thread 资源都有 `enable(i 
### 4) Core 的结构：共享控制流 + 每线程专属状态

在 `core.sv` 里可以把 Core 看成两层：

- <strong>上层（共享）</strong>：`fetcher + decoder + scheduler`
- <strong>下层（按线程复制）</strong>：每线程一个 `alu + lsu + registers + pc`
这一点在 `core.sv` 的 generate 块很明确（每个线程单独例化，并用 `enable(i 
### 5) 每条指令到底怎么跑：`scheduler.sv` 驱动 6 个阶段

Scheduler 是整个 Core 的“拍点”（每拍推进哪个阶段）。状态定义：

`localparam IDLE = 3'b000,
        FETCH = 3'b001,
        DECODE = 3'b010,
        REQUEST = 3'b011,
        WAIT = 3'b100,
        EXECUTE = 3'b101,
        UPDATE = 3'b110,
        DONE = 3'b111;`

#### 5.1 关键工程点：阶段与各模块在哪一拍工作

你可以用下面这张“对拍表”理解（完全对应各模块里的 `if (core_state == ...)` 条件）：

阶段主要动作哪些模块在此阶段“真正干活”FETCH发起程序读请求、等待指令返回fetcher.sv：在 core_state==FETCH 拉 mem_read_valid，等 mem_read_ready 后锁存 instructionDECODE译码出字段与控制信号decoder.sv：在 core_state==DECODE 更新 decoded_*REQUEST从寄存器取 rs/rt；LSU 进入请求流程registers.sv：在 core_state==REQUEST 输出 rs/rt；lsu.sv：在 core_state==REQUEST 进入 REQUESTINGWAIT等所有 LSU 不再 WAITING/REQUESTINGscheduler.sv：遍历 lsu_state[i]，只要有线程 LSU 在等就停住EXECUTEALU 计算、PC 计算 next_pcalu.sv：在 core_state==EXECUTE 计算 alu_out；pc.sv：在 core_state==EXECUTE 计算 next_pcUPDATE写回寄存器；更新 NZP；推进 PC；遇 RET 则 doneregisters.sv：在 core_state==UPDATE 写 rd；pc.sv：在 core_state==UPDATE 写 NZP；scheduler.sv：更新 current_pc 或进入 DONE
#### 5.2 为什么必须有 WAIT：`lsu.sv` 是异步握手

以 `LDR` 为例，LSU 自己有 `IDLE→REQUESTING→WAITING→DONE`：

- REQUESTING：把 `mem_read_valid` 拉高，并给出 `mem_read_address=rs`
- WAITING：等待 `mem_read_ready==1`，然后锁存 `mem_read_data` 到 `lsu_out`
因此 Scheduler 的 WAIT 阶段相当于一个“全线程栅栏”：<strong>所有线程的 LSU 都完成后才进入 EXECUTE/UPDATE</strong>（这是教学化的同步执行模型）。

### 6) 指令编码如何落到硬件控制信号：以 `decoder.sv` 为中心

Decoder 用统一字段切分指令：

- `opcode = instruction[15:12]`
- `rd = instruction[11:8]`
- `rs = instruction[7:4]`
- `rt = instruction[3:0]`
- `immediate = instruction[7:0]`
- `nzp = instruction[11:9]`
并在 `core_state==DECODE` 时根据 opcode 产生控制信号，比如：

- `ADD/SUB/MUL/DIV`：开 `decoded_reg_write_enable`，并设置 `decoded_alu_arithmetic_mux`
- `LDR`：开 `decoded_mem_read_enable`，并选择写回来源为 MEMORY
- `CMP`：让 ALU 输出 NZP 比较位，并使能 `decoded_nzp_write_enable`
- `BRnzp`：使能 PC 选择“分支逻辑”（`decoded_pc_mux
### 7) 控制流（分支）在工程上如何实现、以及当前简化点

#### 7.1 CMP → NZP 的数据路径

ALU 在 `decoded_alu_output_mux==1` 时把比较结果编码进 `alu_out[2:0]`（正/零/负），PC 单元在 UPDATE 阶段写入 `nzp` 寄存器：

`if (decoded_alu_output_mux == 1) begin 
                    alu_out_reg  0), (rs - rt == 0), (rs - rt 

#### 7.2 BRnzp：在 EXECUTE 阶段决定 next_pc

PC 单元在 EXECUTE 阶段，根据 `(nzp & decoded_nzp)` 决定跳转到 `decoded_immediate` 还是 `current_pc+1`：

`if (core_state == 3'b101) begin 
                if (decoded_pc_mux == 1) begin 
                    if (((nzp & decoded_nzp) != 3'b0)) begin 
                        next_pc 

#### 7.3 简化：不支持 branch divergence（所有线程 PC 收敛）

Scheduler 在 UPDATE 阶段只取 `next_pc[THREADS_PER_BLOCK-1]` 作为 `current_pc`，并在注释里明确 “TODO divergence”。这意味着：即使每线程都算了 `next_pc[i]`，也默认大家最终一致（否则行为不符合真实 GPU）。

### 8) 端到端走读（把它当成一次真实 bring-up）

你可以按这个 checklist 去“工程化验证理解”：

- <strong>确认 DCR 写入</strong>：`device_control_write_enable` 拉高一拍，写 `thread_count`
- <strong>拉高 start</strong>：Dispatcher 开始把 block 派发给 core
- <strong>观察每个 core</strong>：  

- `core_reset` 被拉高/拉低后，`core_start` 拉高
- `block_id`、`thread_count` 固定在该 block 生命周期

**

- 观察 Core 状态机**：`IDLE→FETCH→DECODE→REQUEST→WAIT→EXECUTE→UPDATE→...`
- <strong>观察一次 LDR</strong>：  

- REQUEST：LSU 进入 REQUESTING
- 下一拍：`mem_read_valid` 拉高，经 `controller.sv` 映射到外部通道
- WAIT：直到外部 `mem_read_ready` 返回，LSU 锁存数据并回到 DONE
- UPDATE：寄存器把 `lsu_out` 写入 rd

**

- 观察 RET**：Decoder 置 `decoded_ret`，Scheduler 在 UPDATE 进入 DONE，并对 Dispatcher 输出 `core_done`
