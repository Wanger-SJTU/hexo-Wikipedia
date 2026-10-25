---
title: FPGA前沿项目：FPGA开发者学习NPU的一条捷径 通过chisel-npu项目学习Chisel和NPU架构设计
date: "2024-07-25 00:00:00"
updated: "2024-07-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/体系结构/FPGA前沿项目-FPGA开发者学习NPU的一条捷径-通过chisel-npu项目学习Chisel和NPU架构设计/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/710852593
---


前言：
FPGA开发者在工作两三年之后，各种逻辑设计和接口设计估计都掌握得差不多了，如何提升技术是我们需要面对的问题。毕竟做技术都想更进一步。

同时、AI的到来，我们应该都有职业恐慌，担心自己的知识老化。

还有广大研究生缺乏FPGA实战练习项目的，完全可以把这个项目作为高级项目来练习。

困惑
作为FPGA和芯片开发者，我们知道一直有三种技术我们需要面对权衡。一个是Verilog HDL，一个是HLS，一个是Chisel(Constructing Hardware in a Scala Embedded Language)。

HLS通过多年发展，在算法领域加快原型模块的设计上取得一席之地，值得偏算法的FPGA工程师和芯片设计者学习。

那Chisel呢？

目前Chisel已经对学术界意义重大，典型案例是中科院包云岗团队开发采用了Chisel 在做香山项目，高性能RISC-V。

[首届 RISC-V 中国峰会 2021 年 6 月 21 日起在上海举行，有什么值得关注的地方？](https://www.zhihu.com/question/466393646/answer/1955410750)包老师团队宣称5万行chisel代码顶25行Verilog代码。

虽然工业界使用Chisel还很少，但是我感觉工业界内部也会拿这个语言来设计验证架构，因为效率的原因。

还有一个重要推动Chisel的原因是AI。目前AI算法并没有固化，还在不断演进。在这个时间点，采用Chisel设计探索各种NPU架构，是一个划算的买卖。

我们FPGA开发者和芯片设计这个为了研究学习各种NPU架构，可能掌握Chisel要省力一些。

这也是我本人学习Chisel的原因。

学习Chisel路径和资源
虽然Chisel有比较好的学习手段和资源。我建议按这个帖子走一遍，体会一下使用Chisel做一个项目，并在自己的FPGA开发板上实现流水灯。

[https://blog.csdn.net/m0_67981564/article/details/139451444](https://link.zhihu.com/?target=https%3A//blog.csdn.net/m0_67981564/article/details/139451444)通过这种方式，就把VSCODE下面开发Chisel项目，编译、sbt工程构建环境熟悉一下。

//点亮小灯
/*
 * This code is a minimal hardware described in Chisel.
 * 
 * Blinking LED: the FPGA version of Hello World
 */
// 
import chisel3._
// 
/**
 * The blinking LED component.
 */
// 
class Hello extends Module {
  val io = IO(new Bundle {
    val led = Output(UInt(1.W))
  })
  val CNT_MAX = (50000000 / 2 - 1).U
// 
  val cntReg = RegInit(0.U(32.W))
  val blkReg = RegInit(0.U(1.W))
// 
  cntReg := cntReg + 1.U
  when(cntReg === CNT_MAX) {
    cntReg := 0.U
    blkReg := ~blkReg
  }
  io.led := blkReg
}
// 
/**
 * An object extending App to generate the Verilog code.
 */
object Hello extends App {
  (new chisel3.stage.ChiselStage).emitVerilog(new Hello())
}

点亮小灯的Chisel代码。

module Hello(
  input   clock,
  input   reset,
  output  io_led
);
`ifdef RANDOMIZE_REG_INIT
  reg [31:0] _RAND_0;
  reg [31:0] _RAND_1;
`endif // RANDOMIZE_REG_INIT
  reg [31:0] cntReg; // @[Hello.scala 19:23]
  reg  blkReg; // @[Hello.scala 20:23]
  wire [31:0] _cntReg_T_1 = cntReg + 32&#39;h1; // @[Hello.scala 22:20]
  assign io_led = blkReg; // @[Hello.scala 27:10]
  always @(posedge clock) begin
    if (reset) begin // @[Hello.scala 19:23]
      cntReg <= 32&#39;h0; // @[Hello.scala 19:23]
    end else if (cntReg == 32&#39;h17d783f) begin // @[Hello.scala 23:28]
      cntReg <= 32&#39;h0; // @[Hello.scala 24:12]
    end else begin
      cntReg <= _cntReg_T_1; // @[Hello.scala 22:10]
    end
    if (reset) begin // @[Hello.scala 20:23]
      blkReg <= 1&#39;h0; // @[Hello.scala 20:23]
    end else if (cntReg == 32&#39;h17d783f) begin // @[Hello.scala 23:28]
      blkReg <= ~blkReg; // @[Hello.scala 25:12]
    end
  end
// Register and memory initialization
`ifdef RANDOMIZE_GARBAGE_ASSIGN
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_INVALID_ASSIGN
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_REG_INIT
`define RANDOMIZE
`endif
`ifdef RANDOMIZE_MEM_INIT
`define RANDOMIZE
`endif
`ifndef RANDOM
`define RANDOM $random
`endif
`ifdef RANDOMIZE_MEM_INIT
  integer initvar;
`endif
`ifndef SYNTHESIS
`ifdef FIRRTL_BEFORE_INITIAL
`FIRRTL_BEFORE_INITIAL
`endif
initial begin
  `ifdef RANDOMIZE
    `ifdef INIT_RANDOM
      `INIT_RANDOM
    `endif
    `ifndef VERILATOR
      `ifdef RANDOMIZE_DELAY
        #`RANDOMIZE_DELAY begin end
      `else
        #0.002 begin end
      `endif
    `endif
`ifdef RANDOMIZE_REG_INIT
  _RAND_0 = {1{`RANDOM}};
  cntReg = _RAND_0[31:0];
  _RAND_1 = {1{`RANDOM}};
  blkReg = _RAND_1[0:0];
`endif // RANDOMIZE_REG_INIT
  `endif // RANDOMIZE
end // initial
`ifdef FIRRTL_AFTER_INITIAL
`FIRRTL_AFTER_INITIAL
`endif
`endif // SYNTHESIS
endmodule
上面是自动生成的verilog代码，大家可以对比看一下。

学习Chisel代码可以使用这个**开源学习平台，Chisel-Bootcamp**：

[https://blog.csdn.net/u010170039/article/details/137940850?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-2-137940850-blog-139451444.235^v43^pc_blog_bottom_relevance_base7&spm=1001.2101.3001.4242.2&utm_relevant_index=5](https://link.zhihu.com/?target=https%3A//blog.csdn.net/u010170039/article/details/137940850%3Futm_medium%3Ddistribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-2-137940850-blog-139451444.235%255Ev43%255Epc_blog_bottom_relevance_base7%26spm%3D1001.2101.3001.4242.2%26utm_relevant_index%3D5)直接clone这个项目。没有jupyter基础稍微了解，或者安装anaconda自己就会带。做AI的可能没人不知道Jupyter吧。

[https://github.com/freechipsproject/chisel-bootcamp](https://link.zhihu.com/?target=https%3A//github.com/freechipsproject/chisel-bootcamp)
使用Chisel直接上手NPU架构设计，并生成Verilog代码
那如何拿Chiesel来迅速入门NPU呢？

我们来学习github上这个开源的Chisel-NPU项目。

[https://github.com/mpskex/chisel-npu?tab=readme-ov-file](https://link.zhihu.com/?target=https%3A//github.com/mpskex/chisel-npu%3Ftab%3Dreadme-ov-file)我认为这个一个比较牛的项目。当然，我也是想通过这项目，实现Chisel和NPU的同时学习，实现文章题目说的一石二鸟的效果。

1 编译环境搭建及排坑
拉下来，编译运行VSCODE的终端 运行 sbt run 和sbt test。

运行sbt run时，提示需要你安装firtools。

在Windows安装firtools是比较麻烦的事情。

在Nijia(编译器安装好的情况下)，需要编译安装CIRCT项目：

[https://github.com/llvm/circt/tree/main](https://link.zhihu.com/?target=https%3A//github.com/llvm/circt/tree/main)这个项目是在LLVM下面的子模块，关于LLVM可以说做GPU、NPU必须掌握的编译器。当然公司一般由专人在负责这方面工作。我们需要自己学会：

Windows注意克隆地址要改为：[https://github.com/llvm/circt.git](https://link.zhihu.com/?target=https%3A//github.com/llvm/circt.git)

$ git clone git@github.com:llvm/circt.git
$ cd circt
$ git submodule init
$ git submodule update

$ cd llvm
$ git fetch --unshallow
注意Windows下面把下面斜杆去掉（换行）

$ cd circt
$ mkdir llvm/build
$ cd llvm/build
$ cmake -G Ninja ../llvm \
    -DLLVM_ENABLE_PROJECTS=&#34;mlir&#34; \
    -DLLVM_TARGETS_TO_BUILD=&#34;host&#34; \
    -DLLVM_ENABLE_ASSERTIONS=ON \
    -DCMAKE_BUILD_TYPE=DEBUG \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
$ ninja
$ ninja check-mlir

$ cd circt
$ mkdir build
$ cd build
$ cmake -G Ninja .. \
    -DMLIR_DIR=$PWD/../llvm/build/lib/cmake/mlir \
    -DLLVM_DIR=$PWD/../llvm/build/lib/cmake/llvm \
    -DLLVM_ENABLE_ASSERTIONS=ON \
    -DCMAKE_BUILD_TYPE=DEBUG \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
$ ninja
$ ninja check-circt
$ ninja check-circt-integration # Run the integration tests.
就是这样还会出现python 版本问题等，可以私信我，看如何解决。反正我觉得把这两个编译完成，最后生成FIRTOOL工具时，还要系统变量中PATH输入所在地址！！！

最后，还要把Chesel的build.sbt改成这个： 

// See README.md for license details.

ThisBuild / scalaVersion     := &#34;2.13.12&#34;
ThisBuild / version          := &#34;0.1.0&#34;
ThisBuild / organization     := &#34;%ORGANIZATION%&#34;

val chiselVersion = &#34;6.2.0&#34;

lazy val root = (project in file(&#34;.&#34;))
  .settings(
    name := &#34;%NAME%&#34;,
    libraryDependencies ++= Seq(
      &#34;org.chipsalliance&#34; %% &#34;chisel&#34; % chiselVersion,
      &#34;org.scalatest&#34; %% &#34;scalatest&#34; % &#34;3.2.16&#34; % &#34;test&#34;,
    ),
    scalacOptions ++= Seq(
      &#34;-language:reflectiveCalls&#34;,
      &#34;-deprecation&#34;,
      &#34;-feature&#34;,
      &#34;-Xcheckinit&#34;,
      &#34;-Ymacro-annotations&#34;,
    ),
    addCompilerPlugin(&#34;org.chipsalliance&#34; % &#34;chisel-plugin&#34; % chiselVersion cross CrossVersion.full),
  )
否则还是会报错，最后

![](https://pic1.zhimg.com/v2-119409a958c7fe2a40c2726267018f06_r.jpg)

sbt test 还是使用原工程带大build.sbt的编译设置，具体原因可能是因为Chisel的版本问题。用以前的版本TEST是没有问题的。

到目前开发环境就全部搭建完毕。本人感觉不是太容易。

2 Verilog代码的生成
生成verilog代码npu.v

// Generated by CIRCT firtool-1.62.0
module PE(
  input         clock,
                reset,
                io_accum,
  input  [7:0]  io_in_a,
                io_in_b,
  output [27:0] io_out
);

  reg [27:0] res;
  always @(posedge clock) begin
    if (reset)
      res <= 28&#39;h0;
    else begin
      automatic logic [15:0] _GEN;
      automatic logic [15:0] _GEN_0;
      _GEN = {8&#39;h0, io_in_a};
      _GEN_0 = {8&#39;h0, io_in_b};
      if (io_accum)
        res <= res + {12&#39;h0, _GEN * _GEN_0};
      else
        res <= {12&#39;h0, _GEN * _GEN_0};
    end
  end // always @(posedge)
  assign io_out = res;
endmodule

module NPU(
  input         clock,
                reset,
  input  [7:0]  io_in_a,
                io_in_b,
  input         io_accum,
  output [15:0] io_out
);

  wire [27:0] _pe_io_out;
  PE pe (
    .clock    (clock),
    .reset    (reset),
    .io_accum (io_accum),
    .io_in_a  (io_in_a),
    .io_in_b  (io_in_b),
    .io_out   (_pe_io_out)
  );
  assign io_out = _pe_io_out[15:0];
endmodule
另外 要生成各个子模块的verilog代码：

先修改NeuralCore.scala

// See README.md for license details
package ncore

import chisel3._
import java.nio.file.{Paths, Files}
import java.nio.charset.StandardCharsets
import circt.stage.ChiselStage

/**
 * This is the neural core design
 */
 class NeuralCoreforTest(val n: Int = 8, val nbits: Int = 8, val ctrl_width: Int = 8) extends Module {
    val io = IO(new Bundle {
        val vec_a   = Input(Vec(n, UInt(nbits.W)))  // vector `a` is the left input
        val vec_b   = Input(Vec(n, UInt(nbits.W)))  // vector `b` is the top input
        val ctrl    = Input(UInt(ctrl_width.W))
        val out     = Output(Vec(n * n, UInt((2 * nbits + 12).W)))
    })

    // Create n x n pe blocks
    val pe_io = VecInit(Seq.fill(n * n) {Module(new pe.PE(nbits)).io})
    // Create 2d register for horizontal & vertical
    val pe_reg_h = RegInit(VecInit(Seq.fill((n - 1) * n)(0.U(nbits.W))))
    val pe_reg_v = RegInit(VecInit(Seq.fill((n - 1) * n)(0.U(nbits.W))))

    // we use systolic array to pipeline the instructions
    // this will avoid bubble and inst complexity 
    // while simplifying design with higher efficiency
    val ctrl_array = Module(new cu.ControlUnit(n, ctrl_width))
    ctrl_array.io.cbus_in := io.ctrl

    for (i <- 0 until n){
        for (j <- 0 until n) {
            // ==== OUTPUT ====
            // pe array&#39;s output mapped to the matrix position
            io.out(n * i + j) := pe_io(n * i + j).out

            // ==== INPUT ====
            // vertical
            if (i==0) {
                pe_io(j).in_b := io.vec_b(j)
            } else {
                pe_io(n * i + j).in_b := pe_reg_v(n * (i - 1) + j)
            }
            if (i < n - 1 && j < n)
                pe_reg_v(n * i + j) := pe_io(n * i + j).in_b

            // horizontal
            if (j==0) {
                pe_io(n * i).in_a := io.vec_a(i)
            } else {
                pe_io(n * i + j).in_a := pe_reg_h((n - 1) * i + (j - 1))
            }
            if (i < n && j < n - 1)
                pe_reg_h((n - 1) * i + j) := pe_io(n * i + j).in_a

            // ==== CONTROL ====
            // Currently we only have one bit control
            // which is `ACCUM`
            // TODO:
            // Add ALU control to pe elements
            val ctrl = ctrl_array.io.cbus_out(n * i + j).asBools
            pe_io(n * i + j).accum := ctrl(0)
        }
    }
 }
 
 object NeuralCoreforTest extends App {
  // These lines generate the Verilog output

  val hdl = ChiselStage.emitSystemVerilog(
    new NeuralCoreforTest(),
    firtoolOpts = Array(&#34;-disable-all-randomization&#34;, &#34;-strip-debug-info&#34;)
  )
  Files.write(Paths.get(&#34;neuralCore.v&#34;), hdl.getBytes(StandardCharsets.UTF_8))
}
最后生成的NerualCore.v

// Generated by CIRCT firtool-1.62.0
module PE(
  input         clock,
                reset,
                io_accum,
  input  [7:0]  io_in_a,
                io_in_b,
  output [27:0] io_out
);

  reg [27:0] res;
  always @(posedge clock) begin
    if (reset)
      res <= 28&#39;h0;
    else begin
      automatic logic [15:0] _GEN;
      automatic logic [15:0] _GEN_0;
      _GEN = {8&#39;h0, io_in_a};
      _GEN_0 = {8&#39;h0, io_in_b};
      if (io_accum)
        res <= res + {12&#39;h0, _GEN * _GEN_0};
      else
        res <= {12&#39;h0, _GEN * _GEN_0};
    end
  end // always @(posedge)
  assign io_out = res;
endmodule

PE PE (
    .clock    (clock),
    .reset    (reset),
    .io_accum (_ctrl_array_io_cbus_out_0[0]),
    .io_in_a  (io_vec_a_0),
    .io_in_b  (io_vec_b_0),
    .io_out   (io_out_0)
  );
  PE PE_1 (
    .clock    (clock),
    .reset    (reset),
    .io_accum (_ctrl_array_io_cbus_out_1[0]),
    .io_in_a  (pe_reg_h_0),
    .io_in_b  (io_vec_b_1),
    .io_out   (io_out_1)
  );
  PE PE_2 (
    .clock    (clock),
    .reset    (reset),
    .io_accum (_ctrl_array_io_cbus_out_2[0]),
    .io_in_a  (pe_reg_h_1),
    .io_in_b  (io_vec_b_2),
    .io_out   (io_out_2)
  );
  PE PE_3 (
    .clock    (clock),
    .reset    (reset),
    .io_accum (_ctrl_array_io_cbus_out_3[0]),
    .io_in_a  (pe_reg_h_2),
    .io_in_b  (io_vec_b_3),
    .io_out   (io_out_3)
  );
.......

  PE PE_63 (
    .clock    (clock),
    .reset    (reset),
    .io_accum (_ctrl_array_io_cbus_out_63[0]),
    .io_in_a  (pe_reg_h_55),
    .io_in_b  (pe_reg_v_55),
    .io_out   (io_out_63)
  );
 ControlUnit ctrl_array (
    .clock          (clock),
    .reset          (reset),
    .io_cbus_in     (io_ctrl),
    .io_cbus_out_0  (_ctrl_array_io_cbus_out_0),
    .io_cbus_out_1  (_ctrl_array_io_cbus_out_1),
    .io_cbus_out_2  (_ctrl_array_io_cbus_out_2),
    .io_cbus_out_3  (_ctrl_array_io_cbus_out_3),
    .io_cbus_out_4  (_ctrl_array_io_cbus_out_4),
    .io_cbus_out_5  (_ctrl_array_io_cbus_out_5),
    .io_cbus_out_6  (_ctrl_array_io_cbus_out_6),
    .io_cbus_out_7  (_ctrl_array_io_cbus_out_7),
    .io_cbus_out_8  (_ctrl_array_io_cbus_out_8),
    .io_cbus_out_9  (_ctrl_array_io_cbus_out_9),
    .io_cbus_out_10 (_ctrl_array_io_cbus_out_10),
    .io_cbus_out_11 (_ctrl_array_io_cbus_out_11),
    .io_cbus_out_12 (_ctrl_array_io_cbus_out_12),
    .io_cbus_out_13 (_ctrl_array_io_cbus_out_13),
    .io_cbus_out_14 (_ctrl_array_io_cbus_out_14),
    .io_cbus_out_15 (_ctrl_array_io_cbus_out_15),
    .io_cbus_out_16 (_ctrl_array_io_cbus_out_16),
    .io_cbus_out_17 (_ctrl_array_io_cbus_out_17),
    .io_cbus_out_18 (_ctrl_array_io_cbus_out_18),
    .io_cbus_out_19 (_ctrl_array_io_cbus_out_19),
    .io_cbus_out_20 (_ctrl_array_io_cbus_out_20),
    .io_cbus_out_21 (_ctrl_array_io_cbus_out_21),
    .io_cbus_out_22 (_ctrl_array_io_cbus_out_22),
    .io_cbus_out_23 (_ctrl_array_io_cbus_out_23),
    .io_cbus_out_24 (_ctrl_array_io_cbus_out_24),
    .io_cbus_out_25 (_ctrl_array_io_cbus_out_25),
    .io_cbus_out_26 (_ctrl_array_io_cbus_out_26),
    .io_cbus_out_27 (_ctrl_array_io_cbus_out_27),
    .io_cbus_out_28 (_ctrl_array_io_cbus_out_28),
    .io_cbus_out_29 (_ctrl_array_io_cbus_out_29),
    .io_cbus_out_30 (_ctrl_array_io_cbus_out_30),
    .io_cbus_out_31 (_ctrl_array_io_cbus_out_31),
    .io_cbus_out_32 (_ctrl_array_io_cbus_out_32),
    .io_cbus_out_33 (_ctrl_array_io_cbus_out_33),
    .io_cbus_out_34 (_ctrl_array_io_cbus_out_34),
    .io_cbus_out_35 (_ctrl_array_io_cbus_out_35),
    .io_cbus_out_36 (_ctrl_array_io_cbus_out_36),
    .io_cbus_out_37 (_ctrl_array_io_cbus_out_37),
    .io_cbus_out_38 (_ctrl_array_io_cbus_out_38),
    .io_cbus_out_39 (_ctrl_array_io_cbus_out_39),
    .io_cbus_out_40 (_ctrl_array_io_cbus_out_40),
    .io_cbus_out_41 (_ctrl_array_io_cbus_out_41),
    .io_cbus_out_42 (_ctrl_array_io_cbus_out_42),
    .io_cbus_out_43 (_ctrl_array_io_cbus_out_43),
    .io_cbus_out_44 (_ctrl_array_io_cbus_out_44),
    .io_cbus_out_45 (_ctrl_array_io_cbus_out_45),
    .io_cbus_out_46 (_ctrl_array_io_cbus_out_46),
    .io_cbus_out_47 (_ctrl_array_io_cbus_out_47),
    .io_cbus_out_48 (_ctrl_array_io_cbus_out_48),
    .io_cbus_out_49 (_ctrl_array_io_cbus_out_49),
    .io_cbus_out_50 (_ctrl_array_io_cbus_out_50),
    .io_cbus_out_51 (_ctrl_array_io_cbus_out_51),
    .io_cbus_out_52 (_ctrl_array_io_cbus_out_52),
    .io_cbus_out_53 (_ctrl_array_io_cbus_out_53),
    .io_cbus_out_54 (_ctrl_array_io_cbus_out_54),
    .io_cbus_out_55 (_ctrl_array_io_cbus_out_55),
    .io_cbus_out_56 (_ctrl_array_io_cbus_out_56),
    .io_cbus_out_57 (_ctrl_array_io_cbus_out_57),
    .io_cbus_out_58 (_ctrl_array_io_cbus_out_58),
    .io_cbus_out_59 (_ctrl_array_io_cbus_out_59),
    .io_cbus_out_60 (_ctrl_array_io_cbus_out_60),
    .io_cbus_out_61 (_ctrl_array_io_cbus_out_61),
    .io_cbus_out_62 (_ctrl_array_io_cbus_out_62),
    .io_cbus_out_63 (_ctrl_array_io_cbus_out_63)
  );

3 学习NPU的架构设计，并使用Chisel实现

a 指令
回到NPU的设计，分两个部分,一个是指令 一个是NPU core及控制单元：

这个项目采用了OpenTPU的ISA 设计。指令主要是把通用矩阵乘法切成一个一个小块，并行执行。

![](https://pica.zhimg.com/v2-6c1001d39f13e260481f62545c6d1560_r.jpg)

B  PE (processing element)
例化了64个PE。

到现在整个开发编译环境就搭好了。

Chisel-npu的实现：

![](https://pic1.zhimg.com/v2-370044e3af7c12a923dc5556fba5598c_r.jpg)

PE(Processing Element)

脉动阵列

[Systolic Array - Chisel OpenNPU Docs](https://link.zhihu.com/?target=https%3A//chisel-opennpu.readthedocs.io/en/latest/implementations/SystolicArray/)// See README.md for license details.

package ncore.pe

import chisel3._

/**
  * processing element unit in npu design. 
  * This is the core compute unit .
  */
class PE(val nbits: Int = 8) extends Module {
  val io = IO(
    new Bundle {
      val accum       = Input(Bool())
      val in_a        = Input(UInt(nbits.W))
      val in_b        = Input(UInt(nbits.W))
      //  The register bandwith is optimized for large transformer 
      //  The lower bound of max cap matrix size is:
      //    2^12 x 2^12 = (4096 x 4096)
      val out         = Output(UInt((nbits * 2 + 12).W))
  })

  val res = RegInit(0.U((nbits*2 + 12).W))

  when (io.accum) {
    res := res + (io.in_a * io.in_b)
  } .otherwise {
    res := (io.in_a * io.in_b)
  }
  io.out := res
}

C control unit 
// See README.md for license details
package ncore.cu

import chisel3._

/**
 * Control unit also uses systolic array to pass instructions
 */
class ControlUnit(val n: Int = 8, val ctrl_width: Int = 8) extends Module {
    val io = IO(new Bundle {
        val cbus_in     = Input(UInt(ctrl_width.W))
        val cbus_out    = Output(Vec(n * n, UInt(ctrl_width.W)))
    })
    // Assign each element with diagnal control signal
    val reg = RegInit(VecInit(Seq.fill(2*n-1)(0.U(ctrl_width.W))))

    // 1D systolic array for control
    reg(0) := io.cbus_in
    for(i<- 1 until 2*n-1){
        reg(i) := reg(i-1)
    }
    // Boardcast to all elements in the array
    for(i <- 0 until n){
        for(j <- 0 until n){
            io.cbus_out(n*i+j) := reg(i+j)
        }
    }
}
到现在Chisel环境搭建和Chisel-npu就全部很快过了一遍。

最后：
可见 使用 Chisel设计NPU代码量是比Verilog大大减少，非常适合用来探索新的构架。

本项目最近还在更新，适合大家来掌握NPU的设计，指令，内核(脉动阵列)和control。

建议搞定这个项目不要太急，文章收藏下来慢慢看。可以花一周、甚至一个月的时间去吃透。

另外建议读这篇文章的同时，也翻看以前我的一片文章，这样收获更大：

[天川院FPGA培训：一周AI入门到设计一款NPU芯片系列一 给芯片设计爱好者的礼物](https://zhuanlan.zhihu.com/p/708454487)

更多FPGA、芯片项目可以访问我单位网站。或者私信我，这个项目难度比较大，特别是对FPGA开发工程师而言，希望能帮助大家尽快能在FPGA NPU设计。并且能玩出自己的花样出来。 

[天津大学四川创新研究院FPGA培训中心(成都·天府新区·科学城)](https://link.zhihu.com/?target=https%3A//sxfpga.cn/)