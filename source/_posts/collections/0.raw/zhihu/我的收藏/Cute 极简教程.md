---
title: "Cute 极简教程"
date: 2026-01-04
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/1991248525925819668
---

Cute 极简教程

可怕的杰瑞

喵？

收录于 · 现代 CUDA算子开发学习之路

24 人赞同了该文章

Cute 简介
cute 就是做布局变换的现代化工具，抽象掉满天乱飞的c 指针，更符合现代 cuda 算子开发思想。

关于 cute 的介绍已经有很多优秀的文章了，例如 reed 大佬等。还有lei mao 的博客，cutlass 官方的教程。

他们的文章给了我很大启发。

但是我觉得大佬们站在的角度都很高，对于我这种小白来说很难理解。我决定从简单开始做起。通过快速实现简单的 kernel 来体会 cute 编程。

Cute 只看三个函数
虽然 cute 提供的接口函数十分复杂。但是我们只需要懂三个就够了。

- make_tensor，这个函数顾名思义创建一个张量，cute 中的 tensor 是一种布局概念，由形状 shape 和 stride 组合而成。一般而言大部分时候使用这个函数有三种情况：
- make_tensor(make_gmem(xx), ...) 顾名思义将全局内存的一块连续内存视为一个 tensor
- make_tensor(make_smem(xx),...) 将共享内存的一块连续内存视为一个 tensor
- make_tensor(make_rmem(xx),...) 或者直接 make_tensor T (...) 在寄存器中分配 tensor
- local tile
- local partition因为 local tile 和 local partition 功能互补，所以一起辨析：

- local_tile 是取出一块，不关心谁来做，只关心指定的 shape。
- local_partition 是按号领取，关注的是有多少个 worker，每个 worker 分多少个是隐式推导的。 常见的情况是，先 local_tile 按照 block_id 定位出针对某个 block 整体要处理的数据视图，然后用 local_partition 在 block 内部算出当前 thread 需要负责的那几个点。 区别在于：
- local_tile(tensor, tile_shape, coord, [step])  
- tile_shape 是一个 shape，定义了切出来的块的大小
- coord 是坐标，表示当前这个 worker 要第几个块，可以是整数，tuple， 或者 make_coord 封装
- local_partition(tensor, thr_layout, thr_index)  
- thr_layout 必须是一个 layout，定义了线程怎么排布
- thr_index 只能一个索引，通常传入 threadIdx.x其他的一些常用函数，例如 copy，gemm，axpby 等等都是可以直接通过循环自己实现的。

项目创建
使用 xmake 就很方便

xmake create cute
然后在 xmake.lua 中填入：

add_rules("mode.debug", "mode.release")
set_languages("c++20")

add_includedirs("path/to/cutlass/include")
add_includedirs("path/to/cutlass/tools/util/include")

add_cuflags("-arch=sm_80")

target("reduce")
    set_kind("binary")
    add_files("src/reduce.cu")

target("vec_add")
    set_kind("binary")
    add_files("src/vec_add.cu")

vector add
cute 程序的逻辑很直白，相对于传统的 cuda c 风格kernel，无非就是：

- 声明全局的 tensor
- 切分 block 的负载
- 切分每一个线程的负载
- 线程内的计算。。。我们可以用一个简单的 vector add 来体会一下：

#include  cuda_runtime.h 
#include  cute/tensor.hpp 
#include  iostream 
#include  thrust/device_vector.h 
#include  thrust/host_vector.h 

template  class T  __global__ void vec_add(T *a, T *b, T *c, int num) {
  using namespace cute;

  Tensor gA = make_tensor(make_gmem_ptr(a), make_shape(num));
  Tensor gB = make_tensor(make_gmem_ptr(b), make_shape(num));
  Tensor gC = make_tensor(make_gmem_ptr(c), make_shape(num));

  auto block_layout = make_layout(make_shape(_128{}));

  auto bA = local_tile(gA, block_layout.shape(), make_coord(blockIdx.x));
  auto bB = local_tile(gB, block_layout.shape(), make_coord(blockIdx.x));
  auto bC = local_tile(gC, block_layout.shape(), make_coord(blockIdx.x));

  auto tA = local_partition(bA, block_layout, threadIdx.x);
  auto tB = local_partition(bB, block_layout, threadIdx.x);
  auto tC = local_partition(bC, block_layout, threadIdx.x);

  //   auto rA = make_fragment_like(tA);
  //   auto rB = make_fragment_like(tB);
  //   auto rC = make_fragment_like(tC);
  auto rA = make_tensor T (tA.layout());
  auto rB = make_tensor T (tB.layout());
  auto rC = make_tensor T (tC.layout());

  copy(tA, rA);
  copy(tB, rB);

  for (int i = 0; i   size 0 (rA); i++) {
    rC(i) = rA(i) + rB(i);
  }

  copy(rC, tC);
}

int main() {
  int num = 1024;
  auto a = thrust::host_vector float (num);
  auto b = thrust::host_vector float (num);
  auto c = thrust::host_vector float (num);
  auto c_ref = thrust::host_vector float (num);

  for (int i = 0; i   num; ++i) {
    a[i] = static_cast float (i);
    b[i] = static_cast float (i * 2);
  }

  thrust::device_vector float  d_a = a;
  thrust::device_vector float  d_b = b;
  thrust::device_vector float  d_c = c;

  dim3 grid((num - 1 + 128) / 128, 1, 1);
  dim3 block(128, 1, 1);
  vec_add float    grid, block   (thrust::raw_pointer_cast(d_a.data()),
                                  thrust::raw_pointer_cast(d_b.data()),
                                  thrust::raw_pointer_cast(d_c.data()), num);

  // copy from device to host
  c = d_c;

  // calculate reference results
  for (int i = 0; i   num; i++) {
    c_ref[i] = a[i] + b[i];
  }

  // check results
  int errors = 0;
  for (int i = 0; i   num; i++) {
    auto err = std::abs(c_ref[i] - c[i]);
    if (err   1e-5) {
      errors++;
      if (errors   10) {
        std::cout    "Error at "    i    ": expected "    c_ref[i]    ", got "
                     c[i]    "\n";
      }
    }
  }

  if (errors == 0) {
    std::cout    "Check passed!\n";
  } else {
    std::cout    "Check failed with "    errors    " errors.\n";
  }

  return 0;
}

copy 这个函数其实就是一层 for 循环的封装，也可以自己实现例如：

#pragma unroll
for (int i=0;i rA.size();i++){
rA(i) = tA(i);
}
当然我们这里的 copy 比较简单，如果要用到向量化等操作那么自己写就比较繁琐了，所以用 copy 这个函数会简单很多。

reduce sum
再来结合一个 reduce 的 kernel 看一下 copy 的用法

#include  cub/cub.cuh 
#include  cuda_runtime.h 
#include  cute/tensor.hpp 
#include  iostream 
#include  random 
#include  thrust/device_vector.h 
#include  thrust/host_vector.h 

template  int block_size, typename CopyBlockShape, typename MyTiledCopy,
          typename T 
__global__ void reduce_kernel(T *input, T *output, int N) {
  using namespace cute;
  auto copy_block_shape = CopyBlockShape{};
  auto block_layout = make_layout(copy_block_shape);
  auto gInput = make_tensor(make_gmem_ptr(input), make_layout(make_shape(N)));
  auto bInput =
      local_tile(gInput, block_layout.shape(), make_coord(blockIdx.x));
  auto tiled_copy = MyTiledCopy{};
  auto thr_copy = tiled_copy.get_slice(threadIdx.x);
  auto tInput = thr_copy.partition_S(bInput);
  auto rInput = make_fragment_like(tInput);

  copy(tiled_copy, tInput, rInput);
  T tSum = 0.f;
#pragma unroll
  for (int i = 0; i   rInput.size(); i++) {
    tSum += rInput(i);
  }
  // block reduce
  using Reduce = cub::BlockReduce float, block_size ;
  __shared__ typename Reduce::TempStorage temp_storage;
  auto bSum = Reduce(temp_storage).Sum(tSum);

  // grid reduce
  if (threadIdx.x == 0) {
    atomicAdd(output, bSum);
  }
}

int main() {
  int n = 1024;
  auto h_in = thrust::host_vector float (n);
  auto h_out = thrust::host_vector float (1);

  auto expected_sum = 0.f;
  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_real_distribution float  dis(-1.f, 1.f);
  for (int i = 0; i   h_out.size(); i++) {
    h_in[i] = dis(gen);
    expected_sum += h_in[i];
  }
  const int block_size = 128;
  const int vec_size = 4;
  thrust::device_vector float  d_in = h_in;
  auto d_out = thrust::device_vector float (1);
  using MyCopyAtom = cute::Copy_Atom cute::DefaultCopy, float ;
  using MyTiledCopy = decltype(cute::make_tiled_copy(
      MyCopyAtom{},
      cute::make_layout(cute::make_shape(cute::Int block_size {})),
      cute::make_layout(cute::make_shape(cute::Int vec_size {}))));

  using CopyBlockShape =
      decltype(cute::make_shape(cute::Int block_size * vec_size {}));

  reduce_kernel block_size, CopyBlockShape, MyTiledCopy 
         (n - 1 + block_size) / block_size, block_size   (
          thrust::raw_pointer_cast(d_in.data()),
          thrust::raw_pointer_cast(d_out.data()), n);

  // copy results to host
  h_out = d_out;

  auto abs_err = std::abs(h_out[0] - expected_sum);
  auto rel_err = abs_err / std::abs(expected_sum);

  std::cout    (double)rel_err    "\n";

  return 0;
}
这个例子中，稍微的复杂了一点，我们用了模板组合了一些稍微复杂的逻辑。

在这个例子中，我们首先声明了一个 copy_atom，这个就是相当于咱们copy 的最基础操作，为什么要有这个 copy_atom？因为不同的架构上有不同的访存方法，封装起来对于用户来说就是抽象的，不必关心底层实现，

例如在 sm80 以下就是相当于 dst(i) = rsc(i)， 在 sm80 会使用 cp_async 异步拷贝，在 sm90 以上又会用 tma...

现在我们完全不必去关心不同架构的实现，cute 已经帮我们写好了，只需要用 copy_atom 即可。

然后我们相当于是有了一个最基本的 copy 操作，还不足以完成我们的整块数据拷贝。所以正常来说，我们可以在 kernel 中使用 local_tile 从全局内存划分一个block 需要拷贝的数据，然后用 local_partition 把一个 block 要拷贝的数据划分为每一个线程的负载，最后每一个线程调用 copy_atom 的实现。。。

这样逻辑上肯定是可行的，但是不够灵活，比如我们想要合并访存，向量化，那么这个线程的布局就很重要。

为了避免这种费脑子的布局抽象，cute 又给我们抽象出来了 TileCopy，这个就是对一整块进行 copy 的一个操作。我们只需要把线程的布局扔进去，比如例子中我们用的是一维的布局 make_layout(make_shape(Int block_size {}))，那就是 128 个线程的一维排列。然后再声明每一个线程的工作负载，因为我们知道CUDA 中访存要吃满带宽需要调用 LDG 128这个指令，就是一次访问 128b 的数据。所以对应到我们的数据类型中，就是 4 个 float，那么我们就可以设置这里的一个线程需要访问 vec_size=4。当然这里填个其他的 4倍数也可以，例如 8，16，这样就会让他一次发射多条 LDG 128 这个指令。从而可能带来更好的上下文掩盖，但是同时由于每个线程的负载变大了，那么寄存器资源就会变得相对紧张，有可能会 split 到低级的内存中从而又导致性能下降，所以这个也是一个trade off。

编译后可以查看 sass 代码

cuobjdump -sass reduce   reduce.sass
结果：

arch = sm_80
....
        /*0090*/                   LDG.E R4, [R2.64] ;                                      /* 0x0000000402047981 */
                                                                                            /* 0x000ea8000c1e1900 */
        /*00a0*/                   LDG.E R5, [R2.64+0x4] ;                                  /* 0x0000040402057981 */
                                                                                            /* 0x000ee8000c1e1900 */
        /*00b0*/                   LDG.E R7, [R2.64+0x8] ;                                  /* 0x0000080402077981 */
                                                                                            /* 0x000f28000c1e1900 */
        /*00c0*/                   LDG.E R9, [R2.64+0xc] ;                                  /* 0x00000c0402097981 */
                                                                                            /* 0x000f68000c1e1900 */
        /*00d0*/                   LDG.E R11, [R2.64+0x10] ;                                /* 0x00001004020b7981 */
                                                                                            /* 0x000f68000c1e1900 */
        /*00e0*/                   LDG.E R13, [R2.64+0x14] ;                                /* 0x00001404020d7981 */
                                                                                            /* 0x000f68000c1e1900 */
        /*00f0*/                   LDG.E R15, [R2.64+0x18] ;                                /* 0x00001804020f7981 */
                                                                                            /* 0x000f68000c1e1900 */
        /*0100*/                   LDG.E R17, [R2.64+0x1c] ;                                /* 0x00001c0402117981 */
发现并没有编译出我们预期的 LDG.E 128 指令，反而是很多条指令。

可能是编译器认为寄存器分配更灵活，它可能不会强行使用一条指令覆盖 4 个寄存器，而是连续发射。但是，由于这些指令在同一个 Warp 内且地址是完美对齐的（float4 对齐），硬件的 L1 Cache / 内存控制器会自动将它们合并为一个 128 位的事务。

编辑于 2026-01-04 21:34・北京
​赞同 24​​4 条评论​73 ​喜欢​分享

​申请转载​​

未登录用户

4 条评论

默认
最新

草原小可汗

  for (int i = 0; i   h_out.size(); i++) {
    h_in[i] = dis(gen);
    expected_sum += h_in[i];
  }   这个写错吧？  应该是 i h_in.size()   才对吧

04-19 · 广东

​回复​喜欢

可怕的杰瑞

作者

✅，我写错了，h-out 是标量，应该是h-in， 
04-19 · 北京

​回复​喜欢

Ferdinand

reduce_kernel block_size, CopyBlockShape, MyTiledCopy 
         (n - 1 + block_size) / block_size, block_size   (
          thrust::raw_pointer_cast(d_in.data()),
          thrust::raw_pointer_cast(d_out.data()), n);
这里是不是有点问题？一个block里面处理的是block_size * vec_size大小，启动block的话应该是(n+block_size * vec_size-1)/block_size * vec_size吧？

01-29 · 山东

​回复​喜欢

可怕的杰瑞

作者

对，感谢指正

01-30 · 北京

​回复​喜欢

关于作者

可怕的杰瑞
喵？

回答
5
文章
11
关注者
63

​关注​发私信

大家都在搜
换一换

日本正式允许出口杀伤性武器510 万热
拼多多被罚 15.2 亿且暴力阻碍监管418 万热
19岁女孩挪用1700万当榜一大姐330 万热
为什么流行反向追剧330 万
女子产后被男友起诉退彩礼分娩费330 万热
伊朗最新局势315 万热
库克不再担任苹果 CEO299 万
卡尔南开大学二轮调剂被刷257 万
法庭上有什么趣事247 万
「16 万年一遇」的彗星来了237 万

推荐阅读

软件SU：基本工具介绍（四）
半平米工坊

cute 之 Hopper前言
之前的“ cute之[1][2][3][4][5][6][7][8][9]”系列文章我们重点介绍了cute中的核心概念和抽象，并且基于这些概念和抽象，按照自低向上的方式逐步构建起了利用cute实现GEMM计算的核心框架，…

reed

CUTLASS CuTe实战(一)-基础
进击的Ki...发表于深度学习加...

有了这个SU插件，同学们都以为我悄悄学了参数化——建模干货第一期
Light...发表于设计狗的自...