---
title: "CPU 优化技术-NEON 自动向量化"
date: "2021-11-22 00:00:00"
updated: "2021-11-22 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/走向cs/CPU-优化技术-NEON-自动向量化/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/435342281"
---


<strong>版权声明 ©本文首发于知乎专栏：移动端算法优化</strong><strong>本专栏「移动端算法优化」所有文章著作权归作者所有。</strong><strong>允许个人直接分享本专栏文章到个人微博、朋友圈。但媒体（包括但不限于网站、微信公众号、微博营销号）转载需事先征得专栏同意。转载需在正文开头显著位置注明出处，给出原始链接，注明「发表于知乎专栏《移动端算法优化》」，并不得进行任何形式的修改演绎。</strong>
### 一、概述

SIMD 作为一种重要的并行化技术，在提升性能的同时也会增加开发的难度。目前大多数编译器都具有自动向量化的功能，将 C/C++ 代码自动替换为 SIMD 指令。

从编译技术上来说，自动向量化一般包含两部分：<strong>循环向量化（Loop vectorization）</strong>和<strong>超字并行向量化（SLP，Superword-Level Parallelism vectorization，又称Basic block vectorization）</strong>。

*演示代码：*

```cpp
void add(int *a, int *b, int n, int * restrict sum)
{
    // it is assumed that the input n is an integer multiple of 4
    for (int i = 0; i  (n & ~3); ++i)
    {
        sum[i] = a[i] + b[i];
    }
}
```


- <strong>循环向量化</strong>：将循环进行展开，增加循环中的执行代码来减少循环次数。如以下代码将循环次数精简到之前的。

```cpp
for (int i = 0; i  (n & ~3); i += 4)
{
    sum[i]     = a[i    ] + b[i];
    sum[i + 1] = a[i + 1] + b[i + 1];
    sum[i + 2] = a[i + 2] + b[i + 2];
    sum[i + 3] = a[i + 3] + b[i + 3];
}
```


- <strong>SLP 向量化</strong>：编译器将多个标量运算绑定到一起，使其成为向量运算。下图将四次标量运算替换为一次向量运算。
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_28d3b678904b.jpg)

SLP 自动向量化接下来介绍如何通过编译器实现自动向量化。

### 二、编译器配置

目前支持自动向量化的编译器有 Arm Compiler 6、Arm C/C++ Compiler、LLVM-clang 以及 GCC，这几种编译器间的相互关系如下表所示。

Arm Compiler 6需arm授权基于LLVM-clang，针对裸机端的嵌入式开发Arm C/C++ Compiler需arm授权基于LLVM-clang，最初为高性能计算设计，针对linux下的用户应用程序开发LLVM-clang开源基于LLVM架构的C/C++/Objective-C编译器前端GCC开源GNU编译器套件**`自动向量化默认不会被启用，编程人员需要向编译器提供允许自动向量化的“许可证”来对自动向量化功能进行使能`。**

#### A. Arm Compiler 中使能自动向量化

下文中 Arm Compiler 6 与 Arm C/C++ Compiler 使用 armclang 统称`，armclang 使能自动向量化配置信息如下表所示：

配置项说明常用参数--target给定支持 neon 的目标平台arm-none-eabi：32 位 arm 嵌入式平台**aarch64-arm-none-eabi：64 位 arm 嵌入式平台-mcpu给定包含 neon 单元的 cpu（32位）cortex-a53、cortex-a8、cortex-a15 等-fvectorize启用自动向量化（-O2 及以上优化等级默认启用）无-O自动向量化仅在 -O1 及以上优化等级生效-O1、-O2 等--fpmode可选项，针对浮点向量化，定义浮点运算类型ieee_full：完全遵循IEEE标准std：默认配置，非正规数flush到0、舍入到最接近的IEEE标准，不带异常fast：可能会有一点精度损失armclang 实现自动向量化示例：

# AArch32
armclang --target=arm-none-eabi -mcpu=cortex-a53 -O1 -fvectorize main.c

# AArch64
armclang --target=aarch64-arm-none-eabi -O2 main.c

#### B. LLVM-clang中使能自动向量化

Android NDK 从 r13 开始以 clang 为默认编译器，本节通过 cmake 调用Android NDK r19c 工具链展示 clang 的自动向量化方法。

- 使用 Android  NDK 工具链使能自动向量化配置参数如下表：
-fvectorize启用自动向量化（-O2 及以上优化等级默认启用）无-O自动向量化仅在 -O1 及以上优化等级生效-O1、-O2 等

- 在 CMake 中配置自动向量化方式如下：
# method 1

```text
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O1 -fvectorize")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O1 -fvectorize")
```


# method 2

```text
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O2")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2")
```


#### C. GCC 中使能自动向量化

在 gcc 中使能自动向量化配置参数如下：

配置项说明常用参数-mcpu给定支持 neon 的目标平台cortex-a53、cortex-a8、cortex-a15-mfpu明确目标平台支持 neon（64 位弃用，默认支持）vfpv3、neon、vfpv4-ftree-vectorize启用自动向量化（-O3 默认启用）无-O自动向量化仅在 -O1 及以上优化等级生效-O1、-O2--ffast-math可选项，针对浮点向量化，弱化 IEEE-754 标准无-mfloat-abi可选项，针对浮点向量化，明确浮点协处理器soft：不使用 **fpusoftfp：使用 fpu 计算，通过普通寄存器传参数hard：使用 fpu 计算，通过 fpu的寄存器传参数

- 在不明确配置 -mcpu 的情况下，编译器将使用默认配置（取决于编译工具链时的选项设置）**进行编译。
- 通常情况下 -mfpu 和 -mcpu 的配置存在关联性，对应关系如下。（如当选取-mcpu为cortex-a8时，-mfpu一般设置为vfpv3或neon）

```text
-mcpu-mfpu-mfpu-FP onlyFP + SIMDcortex-a5-mfpu=vfpv3-fp16**-mfpu=vfpv3-d16-fp16-mfpu=neon-fp16cortex-a7-mfpu=vfpv4
-mfpu=vfpv4-d16-mfpu=neon-vfpv4cortex-a8-mfpu=vfpv3-mfpu=neoncortex-a9-mfpu=vfpv3-fp16
-mfpu=vfpv3-d16-fp16-mfpu=neon-fp16cortex-a15-mfpu=vfpv4-mfpu=neon-vfpv4gcc 中实现自动向量化的编译配置如下**：
```


# AArch32
arm-none-linux-gnueabihf-gcc -mcpu=cortex-a53 -mfpu=neon -ftree-vectorize -O2 main.c

# AArch64
aarch64-none-linux-gnu-gcc -mcpu=cortex-a53 -ftree-vectorize -O2 main.c

`此外，gcc 中可以通过 -fopt-info-vec 命令查看自动向量化的详细信息，比如哪些代码实现了向量化，哪些代码没有实现向量化及没有进行向量化的原因。` 

#### D. 自动向量化实例

我们以上节的求和示例代码，来对编译器自动向量化的功能进行演示。编译器以 32 位 arm-gcc 为例：

# automatic vectorization is not enabled
arm-none-linux-gnueabihf-gcc -O2 main.c -o avtest

# automatic vectorization is enabled
arm-none-linux-gnueabihf-gcc -mfpu=neon -ftree-vectorize -O2 main.c -o avtest

- 使用 objdump 查看反汇编代码，反汇编命令如下：
`arm-none-linux-gnueabihf-objdump -d avtest > assemble.txt`

- 反汇编结果对比如下图:
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_bbd81026b844.jpg)

反汇编代码启用自动向量化之后，编译器通过*<strong>矢量化加载</strong>* (<strong>ldr</strong> -> <strong>vld1</strong>）、*<strong>求和</strong>* (<strong>add</strong>-> <strong>vadd</strong>)以及*<strong>保存</strong>* (<strong>str</strong> -> <strong>vst1</strong>)等指令，将每次循环中处理的数据变为 4 个，循环次数精简为之前的 。

### 三、自动向量化友好型代码

基于一定的编程优化准则，可以更好的协助编译器完成自动向量化的工作，获得理想的性能状态。

#### A. 避免使用难以向量化的语句

- <strong>数据依赖</strong>
当循环中存在数据依赖时，编译器无法进行向量化。

下述代码中计算 a[i] 时依赖上一次循环的输出，无法被向量化。

```cpp
// the output of a[i] depends on its last result
for (int i = 1; i  n; ++i)
{
    a[i] = a[i - 1] + 1;
}
```


- <strong>多级指针</strong>
编译器无法对间接寻址，多级索引、多级解引用等行为进行向量化，尽量避免使用多级指针。

下述代码通过 `idx` 进行了多级索引，无法被向量化。

```cpp
// idx is unpredictable, so this code cannot be vectorized
for (int i = 0; i  n; ++i)
{
    sum[idx[i]] = a[idx[i]] + b[idx[i]];
}
```


- <strong>条件及跳转语句</strong>
当循环中存在条件语句或跳转语句时，代码很难被向量化。因此应尽量避免在循环中的使用if、break等语句。当循环中需要调用函数时，尽量使用内联函数进行替换。

下述代码通过调用内联函数 add_single2 避免发生函数跳转。

__attribute__((noinline)) int add_single1(int a, int b);

__inline__ __attribute__((always_inline)) int add_single2(int a, int b);

```cpp
void add(const int *a, const int *b, int n, int * restrict sum)
{
    for (int i = 0; i  (n & ~3); ++i)
    {
        // replace normal functions with inline functions
        // sum[i] = add_single1(a[i], b[i]);
        sum[i] = add_single2(a[i], b[i]);
    }
}
```


- <strong>长数据类型</strong>
neon 对 64 位长数据类型的支持有限，且较小的数据位宽有更高的并行度，应尽量选用较小的数据类型。当程序中存在浮点数据时，指明其数据类型。

下述代码指明1.0是浮点数据，否则编译器会优先将其理解为double。

```cpp
// assume that array sum and a are floating-point arrays
for (int i = 0; i  (n & ~3); ++i)
{
    // replace 1.0 with 1.f
    // sum[i] = a[i] + 1.0;
    sum[i] = a[i] + 1.f;
}
```


#### B. 增加自动向量化信息

- <strong>地址交叠</strong>
指针操纵同一片数据区的情况被称为地址交叠。地址交叠会阻止自动向量化操作。

当程序不会发生地址交叠时，用 `restrict` 限定符（C99 引入）在代码中声明指针所指区域是独立的。

下述代码通过 `restrict` 限定 sum 与 a、b 间没有地址交叠的情况。

```cpp
// add restrict before the output parameter sum
void add(const int *a, const int *b, int n, int * restrict sum)
```


- <strong>数组尺寸</strong>
明确数组尺寸，使其达到向量化处理长度的整数倍。但应注意处理不足向量化部分的剩余数据。

下述代码通过掩码操作表明处理循环次数是 4 的整数倍。

```cpp
// make number of cycles is an integer multiple of 4, 
for (int i = 0; i  (n & ~3); ++i)
// don't forget to process the remaining data
```


- <strong>循环展开</strong>
在一些编译器中可以通过在 `for` 循环之前增加预处理语句告知编译器循环展开级数。

下述代码告知 `armclang` 编译器希望将循环展开 4 次。

```cpp
// #pragma unroll (4) // armcc
#pragma clang loop interleave_count(4) //armclang
for (int i = 0; i  n; ++i)
{
    // ...
}
```


- <strong>结构体加载</strong>
编译器仅会对每一成员都有操作的结构体加载操作进行自动向量化，可以结合实际需求考虑去除用于结构体对齐的填充数据。

下述代码中删除用于填充结构体的变量 padding 以避免无法向量化。

```sql
struct st_align  
{    
    char r;    
    char g;
    char b;
    // delete the data used to populate the structure
    // char padding;
};
```


- neon 加载指令要求结构体中的所有项有相同的大小。
下述代码中结构体由于 `short` 类型与 `char` 类型不一致而不会被执行自动向量化。

```text
struct st_align  
{    
    short r; // change short to char to get auto-vectoration
    char g;
    char b;  
};
```


- <strong>循环构造</strong>
尽量通过 `// use '// for(int i = 1; i for (int i = 1; i  n + 1; ++i)

```text
{
    // ...
}
```


- <strong>数组索引</strong>
当对数组进行操作时，使用数组索引替代指针索引。

下述代码通过 `sum[i]` 进行索引，而不是`*(sum + i)`。

```text
// replace arrary with pointer
// *(sum + i) = *(a + i) + *(b + i);
```

sum[i] = a[i] + b[i];


#### C. 重排数据实现缓存友好

- <strong>循环合并</strong>
当数据连续存储在结构体中时，可以进行循环合并操作，即在一个循环内处理临近的数据，提高缓存命中率。

下述代码将 r、g、b 三个通道的处理合并到一个循环中。

```cpp
// combine the rgb operation
/*
for (...)
{
    pixels[i].r = ....;
}  
for (...)
{
    pixels[i].g = ....;
}  
for (...)
{
    pixels[i].b = ....;
}
```

*/

```cpp
// cache friendly code
for (...) 
{    
    pixels[i].r = ....;    
    pixels[i].g = ....;    
    pixels[i].b = ....;  
}
```


### 四、总结

本章节主要介绍了自动向量化的相关内容，其优缺点对比如下：

优点缺点源代码采用传统 C/C++实现，便于理解源代码可以跨平台，但是依赖编译器无内联汇编或 intrinsic API 调用，可移植性高源代码修改影响优化效果现代编译器具备高级优化能力编译器优化能力有限，难以完整利用硬件特性总之，虽然通过自动向量化技术我们可以在一定程度上降低向量化编程难度，增强代码的可移植性，但是不能完全依赖于编译器，而且有时为了获得更高性能的代码，还是需要通过intrinsic甚至neon汇编进行编程。

<strong>五、参考资料</strong>

- Automatic vectorization
- Compiling for Neon with Auto-Vectorization
- NEON Programmer's Guide
- Auto-vectorization in GCC
- Auto-Vectorization in LLVM
<strong>未完待续。。。</strong>
