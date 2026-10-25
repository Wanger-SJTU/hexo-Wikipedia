---
title: "tvm schedule详细举例"
date: "2021-08-23 00:00:00"
updated: "2021-08-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/体系结构/tvm-schedule详细举例/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/94846767"
---


schedule与计算逻辑分离是自动代码生成技术的核心概念，由MIT CASIL组的Jonathan Ragan-Kelley在2012年发表在SIGGRAPH上的文章率先提出，然后在2013年发表在PLDI上的文章给出了schedule的精确定义<span class="wikilink wikilink--missing" title="未导入的页面">1</span>(#ref_1)：

- When and where should be the value at each coordinate in each function be computed?
- Where should they be stored?
- How long are values cached and communicated across multiple consumers, and when are they independently recomputed by each?
事实上，schedule就是一系列优化选择的集合。这些选择不会影响计算的结果，但是由于其包含着对architecture的理解，因此对性能是至关重要的。往往一个选择或者多个选择的组合，都会被称为schedule。Halide和TVM的官方网站里详细介绍了各种各样的schedule，但是缺乏直观的例子，形象的比较每一个schedule对算法的影响到底是怎样（不过halide官网上的几个动画做的非常好）。因此，本文旨在通过以具体的实例来展示每一个schedule。

本文列举了tvm.schedule当中的API，通过具体程序样例所生成的中间代码来详细说明它们的使用方法以及调度效果。

tvm 的guide地址：https://docs.tvm.ai/api/python/schedule.html

样例代码链接为：[https://github.com/StrongSpoon/tvm.schedule](https://link.zhihu.com/?target=https%3A//github.com/StrongSpoon/tvm.schedule)

（分割线以上为调度执行前的中间代码，分割线以下为调度后的结果。建议同时打开样例代码观看效果更佳）

理解schedule本质上是一次理解计算机系统结构、loop optimization和多线程编程的过程，因此文会依次介绍。

### 1. 存储层次相关schedule

<strong>cache_read(tensor, scope, readers)</strong>

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```


---------cutting line---------
// attr [A.shared] storage_scope = "shared"
allocate A.shared[float32 * 1048576]
produce A.shared {

```cpp
  for (ax0, 0, 1024) {
    for (ax1, 0, 1024) {
      A.shared[((ax0*1024) + ax1)] = A[((ax0*1024) + ax1)]
    }
  }
}
```

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A.shared[((i*1024) + k)])
    }
  }
}
```


<strong>cache_read将tensor读入指定存储层次scope的cache，这个设计的意义在于显式利用现有计算设备的on-chip memory hierarchy。这个例子中，会先将A的数据load到shared memory中，然后计算B。在这里，我们需要引入一个stage的概念，一个op对应一个stage，也就是通过cache_read会新增一个stage。cache_write(tensor, scope)</strong>

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```


---------cutting line---------
// attr [B.local] storage_scope = "local"
allocate B.local[float32 * 1024]
produce B.local {

```cpp
  for (i.c, 0, 1024) {
    B.local[i.c] = 0f
    for (k, 0, 1024) {
      B.local[i.c] = (B.local[i.c] + A[((i.c*1024) + k)])
    }
  }
}
```

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = B.local[i]
  }
}
```


<strong>cache_write和cache_read对应，是先在shared memory中存放计算结果，最后将结果写回到global memory。当然在真实的场景中，我们往往是会将结果先放着register中，最后写回。set_scope</strong>

// attr [B] storage_scope = "global"
allocate B[float32 * 1024]
produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```

produce C {

```cpp
  for (i, 0, 1024) {
    C[i] = (B[i] + 10f)
  }
}
```


---------cutting line---------
// attr [B] storage_scope = "shared"
allocate B[float32 * 1024]
produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```

produce C {

```cpp
  for (i, 0, 1024) {
    C[i] = (B[i] + 10f)
  }
}
```


<strong>set_scope指定stage计算结果所在的存储层次，为tensor选择最优的存储位置，适用于设置线程间的共享内存。事实上，set_scope是cache_read的子操作。storage_align</strong>

// attr [A.shared] storage_scope = "shared"
allocate A.shared[float32 * 1048576]
produce A.shared {

```cpp
  for (ax0, 0, 1024) {
    for (ax1, 0, 1024) {
      A.shared[((ax0*1024) + ax1)] = A[((ax0*1024) + ax1)]
    }
  }
}
```

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A.shared[((i*1024) + k)])
    }
  }
}
```


---------cutting line---------
// attr [A.shared] storage_scope = "shared"
allocate A.shared[float32 * 1134592]
produce A.shared {

```cpp
  for (ax0, 0, 1024) {
    for (ax1, 0, 1024) {
      A.shared[((ax0*1108) + ax1)] = A[((ax0*1024) + ax1)]
    }
  }
}
```

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A.shared[((i*1108) + k)])
    }
  }
}
```


<strong>storage_align把stage对应的存储空间以factor为单位、以offset为偏置重新对齐，以避免GPU共享访问时的bank conflict，关于bank conflict可以参考<span class="wikilink wikilink--missing" title="未导入的页面">2</span>(#ref_2)。compute_at</strong>

// attr [B.rf] storage_scope = "global"
allocate B.rf[float32 * 32]
produce B.rf {

```cpp
  for (k.inner, 0, 32) {
    B.rf[k.inner] = 0f
    for (k.outer, 0, 32) {
      B.rf[k.inner] = (B.rf[k.inner] + A[((k.outer*32) + k.inner)])
    }
  }
}
```

produce B {

```text
  // attr [iter_var(threadIdx.x, , threadIdx.x)] thread_extent = 32
  // attr [reduce_temp0] storage_scope = "local"
  allocate reduce_temp0[float32 * 1]
  // attr [comm_reducer(result=[(x + y)], lhs=[x], rhs=[y], identity_element=[0f])] reduce_scope = reinterpret((uint64)0)
  tvm_thread_allreduce((uint32)1, B.rf[threadIdx.x], (bool)1, reduce_temp0, threadIdx.x)
  B[0] = reduce_temp0[0]
}
```


---------cutting line---------
produce B {

```cpp
  // attr [iter_var(threadIdx.x, , threadIdx.x)] thread_extent = 32
  // attr [B.rf] storage_scope = "local"
  allocate B.rf[float32 * 1]
  // attr [reduce_temp0] storage_scope = "local"
  allocate reduce_temp0[float32 * 1]
  produce B.rf {
    B.rf[0] = 0f
    for (k.outer, 0, 32) {
      B.rf[0] = (B.rf[0] + A[((k.outer*32) + threadIdx.x)])
    }
  }
  // attr [comm_reducer(result=[(x + y)], lhs=[x], rhs=[y], identity_element=[0f])] reduce_scope = reinterpret((uint64)0)
  tvm_thread_allreduce((uint32)1, B.rf[0], (bool)1, reduce_temp0, threadIdx.x)
  B[0] = reduce_temp0[0]
}
```


<strong>compute_at将当前的stage附着到目标stage的指定iter方向上，同时与目标stage采用相同的并行方式，在其内部完成当前stage的计算。往往compute_at会与cache_read和cache_write一起使用。compute_inline</strong>

// attr [Apad] storage_scope = "global"
allocate Apad[float32 * 1056784]
produce Apad {

```cpp
  for (yy, 0, 1028) {
    for (xx, 0, 1028) {
      Apad[((yy*1028) + xx)] = tvm_if_then_else(((((2  yy) && (yy  1026)) && (2  xx)) && (xx  1026)), A[(((yy*1024) + xx) - 2050)], 0f)
    }
  }
}
```

produce B {

```cpp
  for (yy, 0, 1026) {
    for (xx, 0, 1026) {
      B[((yy*1026) + xx)] = 0f
      for (ry, 0, 3) {
        for (rx, 0, 3) {
          B[((yy*1026) + xx)] = (B[((yy*1026) + xx)] + (Apad[((((yy*1028) + (ry*1028)) + xx) + rx)]*W[((ry*3) + rx)]))
        }
      }
    }
  }
}
```


---------cutting line---------
produce B {

```cpp
  for (yy, 0, 1026) {
    for (xx, 0, 1026) {
      B[((yy*1026) + xx)] = 0f
      for (ry, 0, 3) {
        for (rx, 0, 3) {
          B[((yy*1026) + xx)] = (B[((yy*1026) + xx)] + (tvm_if_then_else(((((2  (yy + ry)) && ((yy + ry)  1026)) && (2  (xx + rx))) && ((xx + rx)  1026)), A[(((((yy*1024) + (ry*1024)) + xx) + rx) - 2050)], 0f)*W[((ry*3) + rx)]))
        }
      }
    }
  }
}
```


<strong>compute_inline把独立的计算操作转化成内联函数形式，在使用到原计算结果时再调用内联函数完成运算，通过compute_inline来减少一个stage。compute_root</strong>

produce B {

```cpp
  // attr [iter_var(threadIdx.x, , threadIdx.x)] thread_extent = 32
  // attr [B.rf] storage_scope = "local"
  allocate B.rf[float32 * 1]
  // attr [reduce_temp0] storage_scope = "local"
  allocate reduce_temp0[float32 * 1]
  produce B.rf {
    B.rf[0] = 0f
    for (k.outer, 0, 32) {
      B.rf[0] = (B.rf[0] + A[((k.outer*32) + threadIdx.x)])
    }
  }
  // attr [comm_reducer(result=[(x + y)], lhs=[x], rhs=[y], identity_element=[0f])] reduce_scope = reinterpret((uint64)0)
  tvm_thread_allreduce((uint32)1, B.rf[0], (bool)1, reduce_temp0, threadIdx.x)
  B[0] = reduce_temp0[0]
}
```


---------cutting line---------
// attr [B.rf] storage_scope = "global"
allocate B.rf[float32 * 32]
produce B.rf {

```cpp
  for (k.inner, 0, 32) {
    B.rf[k.inner] = 0f
    for (k.outer, 0, 32) {
      B.rf[k.inner] = (B.rf[k.inner] + A[((k.outer*32) + k.inner)])
    }
  }
}
```

produce B {

```text
  // attr [iter_var(threadIdx.x, , threadIdx.x)] thread_extent = 32
  // attr [reduce_temp0] storage_scope = "local"
  allocate reduce_temp0[float32 * 1]
  // attr [comm_reducer(result=[(x + y)], lhs=[x], rhs=[y], identity_element=[0f])] reduce_scope = reinterpret((uint64)0)
  tvm_thread_allreduce((uint32)1, B.rf[threadIdx.x], (bool)1, reduce_temp0, threadIdx.x)
  B[0] = reduce_temp0[0]
}
```


compute_root是compute_at的反操作。因为不做任何schedule的话，每一个stage默认就是compute_root的，这个schedule相当于注释了对之前对一个stage的compute操作。
### 2. 常见循环优化

fuse

produce B {
  B[0] = 0f

```cpp
  for (k.outer, 0, 32) {
    for (k.inner, 0, 32) {
      B[0] = (B[0] + A[((k.outer*32) + k.inner)])
    }
  }
}
```


---------cutting line---------
produce B {
  B[0] = 0f

```cpp
  for (k.outer.k.inner.fused, 0, 1024) {
    B[0] = (B[0] + A[k.outer.k.inner.fused])
  }
}
```


<strong>fuse用于融合两个iter，将两层循环合并到一层，其返回值为iter类型，可以多次合并。split</strong>

produce B {
  B[0] = 0f

```cpp
  for (k, 0, 1024) {
    B[0] = (B[0] + A[k])
  }
}
```


---------cutting line---------
produce B {
  B[0] = 0f

```cpp
  for (k.outer, 0, 32) {
    for (k.inner, 0, 32) {
      B[0] = (B[0] + A[((k.outer*32) + k.inner)])
    }
  }
}
```


<strong>split是fuse的反操作，把iter以factor为间隔分离成outer与inner两层迭代，增加循环层数，用于将循环操作分割为更小的子任务。事实上，以CUDA为例，gridDim和blockDim都可以最多是三维，所以通过split可以产生新的维度用于绑定到grid和block上<span class="wikilink wikilink--missing" title="未导入的页面">3</span>(#ref_3)。reorder</strong>

produce C {

```cpp
  for (i.outer, 0, 32) {
    for (i.inner, 0, 32) {
      for (j.outer, 0, 32) {
        for (j.inner, 0, 32) {
          C[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] = (A[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] + B[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)])
        }
      }
    }
  }
}
```


---------cutting line---------
produce C {

```cpp
  for (i.outer, 0, 32) {
    for (j.outer, 0, 32) {
      for (j.inner, 0, 32) {
        for (i.inner, 0, 32) {
          C[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] = (A[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] + B[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)])
        }
      }
    }
  }
}
```


<strong>reorder用于重置循环iter的内外顺序，根据局部性原理，最大化利用cache中的现有数据，减少反复载入载出的情况。注意，这里到底怎样的顺序是最优化的是一个很有趣的问题。以矩阵乘法为例，M, N, K三维，往往是将K放在最外层可以最大程度利用局部性。这个具体例子，具体探究。tile</strong>

produce C {

```cpp
  for (i, 0, 1024) {
    for (j, 0, 1024) {
      C[((i*1024) + j)] = 0f
      for (K, 0, 1024) {
        C[((i*1024) + j)] = (C[((i*1024) + j)] + (A[((i*1024) + K)]*B[((K*1024) + j)]))
      }
    }
  }
}
```


---------cutting line---------
produce C {

```cpp
  for (i.outer, 0, 32) {
    for (j.outer, 0, 32) {
      for (i.inner, 0, 32) {
        for (j.inner, 0, 32) {
          C[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] = 0f
          for (K, 0, 1024) {
            C[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] = (C[((((i.outer*32768) + (i.inner*1024)) + (j.outer*32)) + j.inner)] + (A[(((i.outer*32768) + (i.inner*1024)) + K)]*B[(((K*1024) + (j.outer*32)) + j.inner)]))
          }
        }
      }
    }
  }
}
```


<strong>tile将stage的两个维度按照各自的factor拆分，并以固定顺序依次返回两个outer和两个inner的iter，从而增加循环层数，形成更小的计算任务。事实上，tile是可以由split和reorder来实现的，tile是矩阵乘法和卷积计算的重要schedule。unroll</strong>

produce C {

```cpp
  for (i.outer, 0, 256) {
    for (i.inner, 0, 4) {
      for (j, 0, 1024) {
        C[(((i.outer*4096) + (i.inner*1024)) + j)] = (A[(((i.outer*4096) + (i.inner*1024)) + j)] + B[(((i.outer*4096) + (i.inner*1024)) + j)])
      }
    }
  }
}
```


---------cutting line---------
produce C {

```cpp
  for (i.outer, 0, 256) {
    for (j, 0, 1024) {
      C[((i.outer*4096) + j)] = (A[((i.outer*4096) + j)] + B[((i.outer*4096) + j)])
    }
    for (j, 0, 1024) {
      C[(((i.outer*4096) + j) + 1024)] = (A[(((i.outer*4096) + j) + 1024)] + B[(((i.outer*4096) + j) + 1024)])
    }
    for (j, 0, 1024) {
      C[(((i.outer*4096) + j) + 2048)] = (A[(((i.outer*4096) + j) + 2048)] + B[(((i.outer*4096) + j) + 2048)])
    }
    for (j, 0, 1024) {
      C[(((i.outer*4096) + j) + 3072)] = (A[(((i.outer*4096) + j) + 3072)] + B[(((i.outer*4096) + j) + 3072)])
    }
  }
}
```


unroll是一种常见的循环优化方法，减分支预测失败减少，如果循环体内语句没有数据相关，增加了并发执行的机会，也有利于指令流水线的调度<span class="wikilink wikilink--missing" title="未导入的页面">4</span>(#ref_4)。
### 3. 多线程并行优化

<strong>vectorize</strong>

produce C {

```cpp
  for (x.outer, 0, 32) {
    for (y.outer, 0, 32) {
      for (x.inner, 0, 32) {
        for (y.inner, 0, 32) {
          C[((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)) + y.inner)] = (A[((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)) + y.inner)] + B[((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)) + y.inner)])
        }
      }
    }
  }
}
```


---------cutting line---------
produce C {

```cpp
  for (x.outer, 0, 32) {
    for (y.outer, 0, 32) {
      for (x.inner, 0, 32) {
        C[ramp((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)), 1, 32)] = (A[ramp((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)), 1, 32)] + B[ramp((((x.outer*32768) + (x.inner*1024)) + (y.outer*32)), 1, 32)])
      }
    }
  }
}
```


<strong>vectorize把iter方向上的循环迭代替换成ramp，从而通过SIMD指令实现数据的批量计算，并且只有在数据size为常数、且分割的iter为2的幂（即满足SIMD的计算数量）时才会发生替换，否则vectorize没有效果，是SIMD计算设备的常用schedule。bind</strong>

produce B {
  B[0] = 0f

```cpp
  for (k.outer, 0, 32) {
    for (k.inner, 0, 32) {
      B[0] = (B[0] + A[((k.outer*32) + k.inner)])
    }
  }
}
```


---------cutting line---------
produce B {

```text
  // attr [iter_var(blockIdx.x, , blockIdx.x)] thread_extent = 32
  // attr [reduce_temp0] storage_scope = "local"
  allocate reduce_temp0[float32 * 1]
  // attr [iter_var(threadIdx.x, , threadIdx.x)] thread_extent = 32
  // attr [comm_reducer(result=[(x + y)], lhs=[x], rhs=[y], identity_element=[0f])] reduce_scope = reinterpret((uint64)0)
  tvm_thread_allreduce((uint32)1, A[((blockIdx.x*32) + threadIdx.x)], (bool)1, reduce_temp0, blockIdx.x, threadIdx.x)
  B[0] = reduce_temp0[0]
}
```


<strong>bind将iter绑定到block或thread的index上，从而把循环的任务分配到线程，实现并行化计算，这是针对CUDA后端最核心的部分。parallel</strong>

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (l, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + l)])
    }
  }
}
```


---------cutting line---------
produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    parallel (l, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + l)])
    }
  }
}
```


parallel将指定iter的for循环替换为parallel操作，从而在GPU以外的CPU等设备上实现并行。
### 4. 其他schedule

pragma

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (l.outer, 0, 256) {
      for (l.inner, 0, 4) {
        B[i] = (B[i] + A[(((i*1024) + (l.outer*4)) + l.inner)])
      }
    }
  }
}
```


---------cutting line---------
produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (l.outer, 0, 256) {
      B[i] = (B[i] + A[((i*1024) + (l.outer*4))])
      B[i] = (B[i] + A[(((i*1024) + (l.outer*4)) + 1)])
      B[i] = (B[i] + A[(((i*1024) + (l.outer*4)) + 2)])
      B[i] = (B[i] + A[(((i*1024) + (l.outer*4)) + 3)])
    }
  }
}
```


<strong>pragma用于添加编译注释，使编译器遵循pragma的要求，实现unroll, vectorize等调度功能。事实上一个新的优化规则，都可以看做是一种gragma，也被称作directive<span class="wikilink wikilink--missing" title="未导入的页面">5</span>(#ref_5)。prefetch</strong>

produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```


---------cutting line---------
produce B {

```cpp
  for (i, 0, 1024) {
    B[i] = 0f
    for (k, 0, 1024) {
      for (prefetch.A.1, 0, 1) {
        for (prefetch.A.0, 0, 1) {
          prefetch(tvm_address_of(A[(((k*1024) + i) + 1024)]), 0, 3, 1)
        }
      }
      B[i] = (B[i] + A[((i*1024) + k)])
    }
  }
}
```


<strong>prefetch利用数据的空间局部性，用于使得前一个iter的计算与后一个iter的访存overlap起来，以提高访存和计算的并行度，减少耗时。本质上是软件流水线的概念，不是硬件prefetch。tensorize</strong>

produce C {

```cpp
  for (i, 0, 1024) {
    for (j.outer, 0, 32) {
      for (j.inner, 0, 16) {
        C[(((i*512) + (j.outer*16)) + j.inner)] = 0f
        for (k, 0, 64) {
          C[(((i*512) + (j.outer*16)) + j.inner)] = (C[(((i*512) + (j.outer*16)) + j.inner)] + (A[((i*64) + k)]*B[(((j.outer*1024) + (j.inner*64)) + k)]))
        }
      }
    }
  }
}
```


---------cutting line---------
produce C {

```cpp
  for (i, 0, 1024) {
    for (j.outer, 0, 32) {
      gemv_update(tvm_access_ptr(type_annotation(), C, ((i*512) + (j.outer*16)), 16, 2), tvm_access_ptr(type_annotation(), A, (i*64), 64, 1), tvm_access_ptr(type_annotation(), B, (j.outer*1024), 1024, 1), 16, 64, 64)
    }
  }
}
```


<strong>tensorize将计算作为整体，编译为一个tensor_intrin函数中。这是因为很多计算属于常用计算，针对这些计算已经有了很好的built-in的schedule，通过tensorize可以直接调用这些内置的intrinsic，其实这也就是intrinsic在计算机科学中的本意<span class="wikilink wikilink--missing" title="未导入的页面">6</span>(#ref_6)。rfactor(tensor, axis, factor_axis=0)</strong>

produce B {
  B[0] = 0f

```cpp
  for (k.outer, 0, 32) {
    for (k.inner, 0, 32) {
      B[0] = (B[0] + A[((k.outer*32) + k.inner)])
    }
  }
}
```


---------cutting line---------
// attr [B.rf] storage_scope = "global"
allocate B.rf[float32 * 32]
produce B.rf {

```cpp
  for (k.inner, 0, 32) {
    B.rf[k.inner] = 0f
    for (k.outer, 0, 32) {
      B.rf[k.inner] = (B.rf[k.inner] + A[((k.outer*32) + k.inner)])
    }
  }
}
```

produce B {
  B[0] = 0f

```cpp
  for (k.inner.v, 0, 32) {
    B[0] = (B[0] + B.rf[k.inner.v])
  }
}
```


<strong>rfactor对原tensor在axis方向以factor_axis为间隔做reduction操作。set_store_predicate</strong>

// attr [B.rf] storage_scope = "global"
allocate B.rf[float32 * 1]
produce B {
  B[0] = 0f

```cpp
  for (k.inner.v, 0, 16) {
    produce B.rf {
      B.rf[0] = 0f
      for (k.outer, 0, 64) {
        B.rf[0] = (B.rf[0] + A[((k.outer*16) + k.inner.v)])
      }
    }
    B[0] = (B[0] + B.rf[0])
  }
}
```


---------cutting line---------
// attr [B.rf] storage_scope = "global"
allocate B.rf[float32 * 1]
produce B {
  B[0] = 0f

```cpp
  for (k.inner.v, 0, 16) {
    produce B.rf {
      B.rf[0] = 0f
      for (k.outer, 0, 64) {
        B.rf[0] = (B.rf[0] + A[((k.outer*16) + k.inner.v)])
      }
    }
    if ((threadIdx.x == 0)) {
      B[0] = (B[0] + B.rf[0])
    }
  }
}
```


<strong>set_store_predicate设置了store的条件，适用于在多线程调度中预防写操作之间的冲突。create_group(outputs, inputs, include_inputs=False)</strong>

// attr [D] storage_scope = "global"
allocate D[float32 * 1048576]
// attr [F] storage_scope = "global"
allocate F[float32 * 1024]
produce D {

```cpp
  for (i, 0, 1024) {
    for (j, 0, 1024) {
      D[((i*1024) + j)] = (A[((i*1024) + j)] + B[((i*1024) + j)])
    }
  }
}
```

produce E {

```cpp
  for (i, 0, 1024) {
    for (j, 0, 1024) {
      E[((i*1024) + j)] = (D[((i*1024) + j)] + B[((i*1024) + j)])
    }
  }
}
```

produce F {

```cpp
  for (i, 0, 1024) {
    F[i] = 0f
    for (k, 0, 1024) {
      F[i] = (F[i] + E[((i*1024) + k)])
    }
  }
}
```


---------cutting line---------
// attr [F] storage_scope = "global"
allocate F[float32 * 1024]
// attr [D] storage_scope = "global"
allocate D[float32 * 1]
produce F {

```cpp
  for (i, 0, 1024) {
    F[i] = 0f
    for (k, 0, 1024) {
      produce D {
        D[0] = (A[((i*1024) + k)] + B[((i*1024) + k)])
      }
      produce E {
        E[((i*1024) + k)] = (D[0] + B[((i*1024) + k)])
      }
      F[i] = (F[i] + E[((i*1024) + k)])
    }
  }
}
```


> create_group对从inputs到outputs的所有stage创建group，group本质上是一个虚拟stage，可以通过操作这个虚拟stage来一起操作这个group里的所有stage。本例中，通过compute_at使这个group中的D和E，一起附着到指定操作中。

感谢北京大学高能效计算与应用中心李之昕同学编写样例代码以及对文章的整理。

### 参考

- [^](#ref_1_0)http://people.csail.mit.edu/jrk/halide-pldi13.pdf
- [^](#ref_2_0)https://devblogs.nvidia.com/using-shared-memory-cuda-cc/
- [^](#ref_3_0)https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#programming-model
- [^](#ref_4_0)https://en.wikipedia.org/wiki/Loop_unrolling
- [^](#ref_5_0)https://en.wikipedia.org/wiki/Directive_(programming))
- [^](#ref_6_0)https://en.wikipedia.org/wiki/Intrinsic_function
