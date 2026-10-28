---
title: "SystemC学习笔记（一）"
date: "2022-07-01 00:00:00"
updated: "2022-07-01 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/SystemC学习笔记(一)/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/451209295"
---


### 引言

最近工作上需要看一个CPU的模型，这个模型是用SystemC写的。SystemC是一个C++的库，这个库用软件来对硬件建模。作为一个ASIC工程师，本人以前有一些C++基础，但没有学过SystemC，因此边学习边在此做一些学习笔记，并分享一些SystemC的教程和书籍。

<strong>视频教程：</strong>

```text
Learn SystemC (1) - Introduction

Learn SystemC (2) - SC_CTHREAD Clocked Threads

Learn SystemC (3) - Testbenches

Learn SystemC (4) - Handshaking

Learn SystemC (5) - Testbench Measurements

Learn SystemC (6) - Compiling and Running Simulations
```


<strong>参考书籍：</strong>

参考书籍已上传至github。SystemC: From the Ground Up

[](https://link.zhihu.com/?target=https%3A//github.com/kaitoukito/Integrated-Circuit-Textbooks)

### 1. Introduction

#### 1.1. Let's Get Started

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a44c607b7d83.jpg)

#### 1.2. Port I/O

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b90c82655036.jpg)

#### 1.3. Add A Function

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1306ca3327b4.jpg)

#### 1.4. Threads

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d9a1a6d132b7.jpg)

SC_METHOD()

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_29f3003946d3.jpg)

<strong>SC_THREAD()</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e2bd6092a3b5.jpg)

<strong>SC_CTHREAD()</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_feb556061bfd.jpg)

#### 1.5. Add Sensitivity

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8b3635c0acfe.jpg)

假如模块是组合逻辑，输入是a、b，输出是f，那么上述代码改为：

```cpp
#include 
SC_MODULE( and2 ) {
    sc_inDT> a, b;
    sc_outDT> f;

    void func() {
        f.write( a.read() & b.read() );
    }

    SC_CTOR( and2 ) {
        SC_METHOD( func );
        sensitive  a  b;
    }
}
```


假如模块是时序逻辑，输入是a、b，输出是f，时钟为clk并在上升沿采样，那么上述代码改为：

```cpp
#include 
SC_MODULE( and2 ) {
    sc_inDT> a, b;
    sc_outDT> f;
    sc_inbool> clk;

    void func() {
        f.write( a.read() & b.read() );
    }

    SC_CTOR( and2 ) {
        SC_METHOD( func );
        sensitive  clk.pos();
    }
}
```


#### 1.6. Integer Datatypes

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_10c6015f81d7.jpg)

<strong>Unsigned Integers</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0423598b652c.jpg)

<strong>Signed Integers</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fdfb8c06fb02.jpg)

#### 1.7. Add Datatypes

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7efd1b36725c.jpg)

#### 1.8. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4f9e26bf7955.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_19ef43623220.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_caf5f6ffbd50.jpg)

### 2. SC_CTHREAD Clocked Threads

#### 2.1. Last Time

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f63db7e0d22a.jpg)

#### 2.2. SC_METHOD

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_852b66071197.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4c488bafc307.jpg)

#### 2.3. SC_CTHREAD

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d56ab5bad691.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b3996485bf91.jpg)

#### 2.4. FIR Filter

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cab86e7a3ded.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5a338002604a.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_78c87a8157fa.jpg)

<strong>Coefficients for each FIR</strong>

```text
// Coefficients for each FIR
const sc_uint8> coef[5] = {
    18,
    77,
    107,
    77,
    18
};
```


<strong>FIR Main thread</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_14af2d2d9439.jpg)

#### 2.5. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2e6adbae9aaf.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f44b7d355538.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6807f04a07a3.jpg)

### 3. Testbenches

#### 3.1. Last Time

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a271b06846e1.jpg)

#### 3.2. Verification

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f4aecd3164ad.jpg)

#### 3.3. FIR Filter

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_11448e5d4da9.jpg)

<strong>fir.h</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_35669f7d6f01.jpg)

<strong>http://fir.cc</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6d5944dda876.jpg)

#### 3.4. Test Environment

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5b36872ef3d2.jpg)

<strong>http://main.cc</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a5868fe76d65.jpg)

SC_CTOR省略部分代码为：

```text
SC_CTOR( SYSTEM ): clk_sig ("clk_sig", 10, SC_NS)
{
    tb0 = new tb("tb0");
    tb0->clk( clk_sig );
    tb0->rst( rst_sig );
    tb0->inp( inp_sig );

    fir0 = new fir("fir0");
    fir0->clk( clk_sig );
    fir0->rst( rst_sig );
    fir0->inp( inp_sig );
}
```


- 时钟名字为“clk_sig”，频率为10ns
- tb实例名字为“tb0”
- fir实例名字为“fir0”
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_12dfbe31df68.jpg)

<strong>tb.h</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0e7aff19ede4.jpg)

<strong>http://tb.cc</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_57203735aa68.jpg)

省略部分代码为reset相关代码：

```text
void tb::source() {
    // Reset
    inp.write( 0 );
    rst.write( 1 );
    wait();
    rst.write( 0 );
    wait();
    ...
}
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7c5429e25893.jpg)

#### 3.5. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fc094b262d2d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2d0bc28f08a8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fe8443eb178f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6b2b9c9a4e7d.jpg)

### 4. Handshaking

#### 4.1. Last Time

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_570fa85ab234.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fd43943a4ce8.jpg)

#### 4.2. Test Environment

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5c000a232b4d.jpg)

- 需要增加握手机制，参考附录代码
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1cb495550936.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_21ebac5ae05c.jpg)

#### 4.3. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ac5e20966907.jpg)

### 5. Testbench Measurements

#### 5.1. Last Time

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a123ba19ae0d.jpg)

#### 5.2. Today

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_55981f4f714a.jpg)

#### 5.3. Pass/Fail Criteria

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e808734cf21a.jpg)

#### 5.4. Latency

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_aafd1e39ac65.jpg)

#### 5.5. Time Stamps in SystemC

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_686370fc140b.jpg)

#### 5.6. Throughput

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5ba1c4576b4f.jpg)

#### 5.7. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1f555767b8c9.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0d18877c31c7.jpg)

### 6. Compiling and Running Simulations

#### 6.1. Last Time

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5d310503f8a9.jpg)

#### 6.2. SystemC Compilation

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5f957ad7dfa6.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bb9d8ccfbfd5.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cf23acc3e777.jpg)

#### 6.3. Command line

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_93aecc514bc1.jpg)

1.gcc  `-l`
-l` 参数就是用来指定程序要链接的库，`-l` 参数紧接着就是库名，那么库名跟真正的库文件名有什么关系呢？就拿数学库来说，他的库名是 `m`，他的库文件名是 `libm.so`，很容易看出，把库文件名的头 `lib` 和尾 `.so` 去掉就是库名了。好了现在我们知道怎么得到库名，当我们自已要用到一个第三方提供的库名字 `libtest.so`，那么我们只要把 `libtest.so` 拷贝到 `/usr/lib` 里，编译时加上 `-ltest` 参数，我们就能用上 `libtest.so` 库了（当然要用 `libtest.so` 库里的函数，我们还需要与 `libtest.so` 配套的头文件）
2.gcc `-L`
放在 `/lib` 和 `/usr/lib` 和 `/usr/local/lib` 里的库直接用 `-l` 参数就能链接了，但如果库文件没放在这三个目录里，而是放在其他目录里，这时我们只用 `-l` 参数的话，链接还是会出错，出错信息大概是：`“/usr/bin/ld: cannot find -lxxx”`，也就是链接程序 `ld` 在那3个目录里找不到 `libxxx.so`。这时另外一个参数 `-L` 就派上用场了，比如常用的 `X11` 的库，它在 `/usr/X11R6/lib` 目录下，我们编译时就要用 `-L/usr/X11R6/lib -lX11` 参数，`-L` 参数跟着的是库文件所在的目录名**。再比如我们把 `libtest.so` 放在 `/aaa/bbb/ccc` 目录下，那链接参数就是 `-L/aaa/bbb/ccc -ltest`**3.gcc `-I`
-I` 参数是用来指定头文件目录，`/usr/include` 目录一般是不用指定的，`gcc` 知道去那里找，但是如果头文件不在 `/usr/include` 里我们就要用 `-I` 参数指定了，比如头文件放在 `/myinclude` 目录里，那编译命令行就要加上 `-I/myinclude` 参数了，如果不加你会得到一个 `"xxxx.h: No such file or directory"` 的错误。`-I` 参数可以用相对路径，比如头文件在当前目录，可以用 `-I.` 来指定。

作者：5974bb7fd509
链接：https://www.jianshu.com/p/a834e2cd69b3
来源：简书
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。参考文献：GCC -L -I 等参数区别

编译命令行：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c1e3cfa686a8.jpg)

<strong>Makefile：</strong>

参考附录

#### 6.4. Review

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2c6159d4f90c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f15a90c9b0bc.jpg)

### 附录：源代码

这些代码是看着视频手打的，可能有错误。

#### http://fir.cc（第四课）

```cpp
#include "fir.h"

// Coefficients for each FIR
const sc_int16> coef[5] = {
    18,
    77,
    107,
    77,
    18
};

// FIR Main thread
void fir::fir_main(void)
{
    // FIR instance
    sc_int16> taps[5];

    // Reset protocol
    for(int i = 0; i  5; i++) {
        taps[i] = 0;
    }

    // Initialize handshake
    inp_rdy.write( 0 );
    outp.write( 0 );
    outp_vld.write( 0 );
    wait();

    // FIR filter
    while ( true )
    {
        sc_int16> in_val;
        sc_int16> out_val;

        inp_rdy.write( 1 );
        do {
            wait();
        } while ( !inp_vld.read() );
        in_val = inp.read();
        inp_rdy.write( 0 );

        // Read input into shift register
        for(int i = 5-1; i > 0; i--) {
            taps[i] = taps[i-1];
        }
        taps[0] = in_val;

        // Perform multiply and accumulate
        for(int i = 0; i  5; i++){
            out_val += coef[i] * taps[i];
        }

        outp.write( out_val );
        outp_vld.write( 1 );
        do {
            wait();
        } while ( !outp_rdy.read() );
        outp_vld.write( 0 );
    } // while
}
```


#### tb.h（第五课）

```cpp
#ifndef TB_H
#define TB_H

#include 

SC_MODULE(tb)
{
    sc_inbool>             clk;
    sc_outbool>            rst;
    sc_out sc_int16> >    inp;
    sc_out sc_unit1> >    inp_vld;
    sc_in sc_unit1> >     inp_rdy;
    sc_in sc_int16> >     outp;
    sc_in sc_int1> >      outp_vld;
    sc_out sc_uint1> >    outp_rdy;

    void source();
    void sink();

    FILE *outfp;
    sc_time start_time[64], end_time[64], clock_period;

    SC_CTOR(tb)
    {
        SC_CTHREAD( source, clk.pos() );
        SC_CTHREAD( sink, clk.pos() );
    }
}

#endif
```


#### http://tb.cc（第四课、第五课）

```cpp
#include "tb.h"

void tb::source()
{
    sc_int16> tmp;

    // Reset
    inp.write( 0 );
    inp_vld.write( 0 );
    rst.write( 1 );
    wait();
    rst.write( 0 );
    wait();

    // Send stimulus to DUT
    for(int i = 0; i  64; i++)
    {
        if (i > 23 && i  29)
            tmp = 256;
        else
            tmp = 0;

        inp.write( tmp );
        inp_vld.write( 1 );
        start_time[i] = sc_time_stamp();
        do {
            wait();
        } while ( !inp_rdy.read() );
        inp_vld.write( 0 );
    }

    // Hanging simulation guard condition
    wait(10000);
    printf("Hanging simulation stopped by TB source thread. Please check DUT module.\n");
}

void tb::sink()
{
    sc_int16> indata;

    // Extract clock period
    sc_clock *clk_p = DCASTsc_clock*>(clk.get_interface());
    clock_period = clk_p->period();

    // Open simulation output results file
    char output_file[256];
    sprintf( output_file, "./output.dat" );
    outfp = fopen(output_file, "wb");
    if (outfp == NULL)
    {
        printf("Couldn't open output.dat for writing.\n");
        exit(0);
    }

    // Initialize port
    outp_rdy.write( 0 );

    double total_cycles = 0;

    // Read output coming from DUT
    for(int i = 0; i  64; i++)
    {
        outp_rdy.write( 1 );
        do {
            wait();
        } while ( !outp_vld.read() );
        indata = outp.read();
        end_time[i] = sc_time_stamp();
        total_cycles += (end_time[i] - start_time[i]) / clock_period;
        outp_rdy.write( 0 );

        fprintf(outfp, "%g\n", indata.to_double());
        cout  i  ":\t"  indata.to_double()  endl;
    }

    // Print latencty
    double total_throughput = (start_time[63] - start_time[0]) / clock_period;
    printf("Average latency is %g cycles.\n", (double)(total_cycles/64));
    printf("Average throughput is %g cycles per input.\n", (double)(total_thropughput/63));

    // End simulation
    fclose(outfp);
    sc_stop();
}
```


#### Makefile（第五课、第六课）

# This makefile assumes SYSTEMC is set to the SystemC
# installation. The SystemC installation should have an include
# directory for the header files and a lib-linux directory for the
# compiled kernel library. For other platforms, change SYSTEMC_ARCH to
# the appropriate value.

SYSTEMC_ARCH=linux64
#SYSTEMC_ARCH=linux
LIB_DIRS=$(SYSTEMC)/lib-$(SYSTEMC_ARCH)

# Include directories.
INCLUDE_DIRS = -I. -I$(SYSTEMC)/include

# header files used, for dependency checking
HEADERS = fir.h tb.h

# source files used, for dependency checking

```text
SOURCES = main.cc fir.cc tb.cc

DEPENDENCIES = \
    Makefile \
    $(HEADERS) \
    $(SOURCES)

LIBS= -lsystemc -lstdc++ -lm

TESTS= main
```


all: $(TESTS)

```text
    ./$(TESTS)
    @make cmp_result
```


$(TESTS): $(DEPENDENCIES)
    gcc -g -o $@ $(SOURCES) $(INCLUDE_DIRS) -L$(LIB_DIRS) $(LIBS)

clean:

```text
    rm -f $(TESTS)

GOLD_DIR = ./golden
GOLD_FILE = $(GOLD_DIR)/ref_output.dat
```


cmp_result:
    @echo "*****************************************"

```text
    @if diff -w $(GOLD_FILE) ./output.dat; then \
            echo "SIMULATION PASSED"; \
    else \
            echo "SIMULATION FAILED"; \
    fi
    @echo "*****************************************"
```

