---
title: C++原子操作std::atomic的memory_order解析
date: "2023-02-27 00:00:00"
updated: "2023-02-27 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/C-原子操作std__atomic的memory_order解析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/609771875
---


### 原理

原子操作的memory_order考虑的是编译器优化、缓存一致性和指令级并发，解决的是线程看见其他线程指令执行顺序的不一致。

所谓缓存一致性，多核CPU常有多级高速缓存，例如L1、L2、L3，其中L1是本地的。在一个线程修改一个变量时，会执行缓存一致算法，这个算法保证了如果其他核上有该变量的缓存，那么这个缓存最终是一致的。然而缓存一致性算法的执行是需要时间的，不能看作是瞬时的，这导致了即使是按顺序修改原子变量，其他线程可能看到不一样的修改顺序。

所谓编译器优化，编译器可能优化某些指令的执行顺序，这个优化保证了本线程的执行结果是不变的，然而不对其他线程的结果作保证。

所谓指令级并发，是指现代CPU可以同时执行多条指令，这些指令可能被分解成更小的部分，例如取指、运算、存寄存器、内存访问、更新PC，正在执行的指令可能处于这些部分的不同阶段，也可能处于CPU具有多个功能单元的相同阶段，例如CPU有n个加法模块，那么就可以同时执行n个指令的加法运算。所以指令最终执行完成的顺序是不被保证的。

### memory_order_relaxed

memory_order_relaxed为最宽松规则，只保证在同一线程内同一原子变量操作顺序不变。

```cpp
#include 
#include 
#include 
std::atomicbool> x,y;
std::atomicint> z;
void write_x_then_y()
{
    x.store(true,std::memory_order_relaxed);  // 1
    y.store(true,std::memory_order_relaxed);  // 2
}
void read_y_then_x()
{
    while(!y.load(std::memory_order_relaxed));  // 3
    if(x.load(std::memory_order_relaxed))  // 4
        ++z; 
}
int main() {
    x=false;
    y=false;
    z=0;
    std::thread a(write_x_then_y);
    std::thread b(read_y_then_x);
    a.join();
    b.join();
    assert(z.load()!=0);  // 5
}
```


操作5的断言可能会失败！因为其他线程可能看到相反的1和2的执行顺序。

### memory_order_release和memory_order_acquire对

memory_order_release和memory_order_acquire配对保证了store之前的指令在其他线程load之时是可见的。

```cpp
std::atomicint> data[5];
std::atomicbool> sync1(false);
void thread_1()
{
    data[0].store(42,std::memory_order_relaxed);
    data[1].store(97,std::memory_order_relaxed);
    data[2].store(17,std::memory_order_relaxed);
    data[3].store(-141,std::memory_order_relaxed);
    data[4].store(2003,std::memory_order_relaxed);
    sync1.store(true,std::memory_order_release); // 1.设置sync1
}
void thread_2()
{
    while(!sync1.load(std::memory_order_acquire)); // 2.直到sync1 设置后，循环结束
    assert(data[0].load(std::memory_order_relaxed)==42);
    assert(data[1].load(std::memory_order_relaxed)==97);
    assert(data[2].load(std::memory_order_relaxed)==17);
    assert(data[3].load(std::memory_order_relaxed)==-141);
    assert(data[4].load(std::memory_order_relaxed)==2003);
}
```


按任意顺序启动2个线程，所有断言成立。

由于sync1.store()采取了memory_order_release，而sync1.load()采取了memory_order_acquire，这导致了如果2中读到的是真值，也就是1处存储的值，那么1之前的所有指令在线程2看来是全部已经执行的。

### memory_order_acq_rel

memory_order_acq_rel实际上是memory_order_release和memory_order_acquire的结合版本，主要用在既读值又取值的原子方法，保证了如果读到的是memory_order_release的存储，那么之前存储前面的指令可见；并且下一次使用memory_order_acquire的读时，本条指令前的指令可见。

### memory_order_consume和memory_order_release对

memory_order_consume是较memory_order_acquire更为宽松的语义，适用于原子指针情形，若之前与之配对的store（或其他存储效果的原子方法）为memory_order_release，则保证了store指令之前对所保存的指针所指向的对象的操作是在load操作之前完成的。

```cpp
struct X
{
    int i;
    std::string s;
};
std::atomicX*> p;
std::atomicint> a;
void create_x()
{
    X* x=new X;
    x->i=42;
    x->s="hello";
    a.store(99,std::memory_order_relaxed);  // 1
    p.store(x,std::memory_order_release);  // 2
}
void use_x()
{
    X* x;
    while(!(x=p.load(std::memory_order_consume)))  // 3
        std::this_thread::sleep(std::chrono::microseconds(1));
    assert(x->i==42);  // 4
    assert(x->s=="hello");  // 5
    assert(a.load(std::memory_order_relaxed)==99);  // 6
}
int main() {
    std::thread t1(create_x);
    std::thread t2(use_x);
    t1.join();
    t2.join();
}
```


### memory_order_seq_cst

这是默认的memory_order，最为严格。所有指令与这条指令的相对顺序在其他线程看来不应该改变。

如果你不确定要用哪个，最好的解决是使用默认的内存顺序。
