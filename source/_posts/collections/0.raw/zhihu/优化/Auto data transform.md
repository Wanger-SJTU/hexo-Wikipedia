---
title: Auto data transform
date: "2021-09-01 00:00:00"
updated: "2021-09-01 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/Auto-data-transform/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/405655362
---


Auto data tranform是AutoSearch的一个功能模块，这部分工作是由AutoKernel实习生（huxingyu)完成的, 整个工作大概花了3个月（2021.1~2021.3），后面实习生离职后，这部分工作也就暂停了>_Data Transform开发文档autokernel-docs-en.readthedocs.io/zh_CN/latest/dev-doc/datatransform.html](https://link.zhihu.com/?target=https%3A//autokernel-docs-en.readthedocs.io/zh_CN/latest/dev-doc/datatransform.html)

一开始为什么做这个工作的原因是，经过调研，目前的自动调优方案，无论是Halide的-scheuduler， tvm的anto-tvm/ansor，基本都是基于一个写好算术表达式的函数去做自动调优。一个函数的表达式写出来，它的数据排布基本也就确定了，而数据的数据排布对性能也有重要影响。

因此，我们的工作是在自动调优之前加一个自动数据排布转换的环节，这个环节需要一个cost model来指导，而cost model设计的基本原理就是，选择合适的数据排布，使得在计算过程中，数据的读取是流畅的连续的，减少cache miss。

#### AutoDataTransform

auto data transform的基本流程是，对应一个计算过程，也就是一个Pipeline，自动对Pipeline中的每个input遍历data transform，计算其计算排布的cost，选择cost最小的一种排布策略。

**具体源码实现在: 

[](https://link.zhihu.com/?target=https%3A//github.com/OAID/AutoKernel/blob/main/AutoSearch/src/common/DataTransform.h)

#### DataTransformer类

`template 
class DataTransformer : public IRVisitor`

DataTransformer：用来在表达式中递归得搜索到目标函数，并对其按照模板T执行data transform。它继承自IRVisitor，可以使用accept和visit来遍历表达式的每一部分，从而找到我们希望执行data transform的目标函数。

DataTransformer类有三个私有成员变量，target_表示要进行数据排布的函数名，replace_func_是替换后的新的函数，op_是要执行的数据排布操作。

`std::string target_;
Func replace_func_;
T op_;`

在DataTransformer中，我们仅考虑了四则运算，即加，减，乘，除和除余，这里以加法运算做说明：

`void visit(const Add *add) override {

```text
    IRVisitor::visit(add);
    Add *node = const_castAdd *>(reinterpret_castconst Add *>(add)) ;
 if (const Halide::Internal::Call *v= node->a.asHalide::Internal::Call>()) {
 if (v->name==target_)
        {
```

 auto expr = v->args;

```text
            op_(expr);
            node->a = replace_func_(expr);
        }
    }
 if (const Halide::Internal::Call *v= node->b.asHalide::Internal::Call>()) {
 if (v->name==target_)
        {
```

 auto expr = v->args;

```text
            op_(expr);
            node->b = replace_func_(expr);
        }
    }
}
```

`

当加法运算的两端中的一个是函数(Call)时，检查其函数名是否为目标名，如果是目标名，则获取其函数的运算参数，并对所有运算参数执行op_的data transform操作，然后将这个Call函数重新用replace_func_定义。

### auto data_transform函数

`template

```cpp
void data_transform(std::vector &outputs,Func target,DataTransformMethod method)

void auto_data_transform(std::vector &outputs)`
```


data_transform_impl的封装函数，根据提供的method来调用不同的data_transform_impl函数。DataTransformMethod是枚举类，定义在DataOP.h中。

auto_data_transform对以outputs为结尾的pipeline，找到他们的输入，并执行最佳的data transform操作。auto_data_transform是所有优化器调用数据排布的接口函数。

实现细节：对outputs进行深拷贝得初始的best_output，然后对best_output搜索每一个input，并对每个input尝试三种data transform，在调用compute_layout_cost_impl函数计算数据排布的cost，选择最小的一个作为新的best_output，重复此过程直到无法再得到一个更低的cost为止。于是我们就获得了最终的best_output。

### DataOP

DataOP.h 头文件定义了进行数据重排布算子的类，它们都继承自DataOP类，并且需要重载DataOP中的函数。

DataTransformMethod是一个枚举类，定义了data transform的三种方法

`enum class DataTransformMethod{
 REORDER,
 INTERLEAVE,
 SPLITY
};`

DataOP需要重载三个函数，两个括号运算符重载和一个命名函数,命名规则是$+算子名。

`class DataOP

```text
{
public:
    // operate the vector
```

 virtual void operator()(std::vector &args){}
 virtual void operator()(Func &lfunc,Func &rfunc){}
 virtual std::string name(){return "$NULL";}
};`

`virtual void operator()(std::vector &args){}`这个重载是用于在定义中将目标函数的参数进行重新排布的，以matmul.cpp为例：

`func(x,y,b)=input_a(k,y,b)*input_b(x,k,b)`

执行reorder操作得到：

`Br(x,y,b) = input_b(y,x,b)
func(x,y,b)=input_a(k,y,b)*Br(k,x,b)`

- `operator()(std::vector &args) `用于在func表达式中将input_b(x,k,b)替换为Br(k,x,b)
- `operator()(Func &lfunc,Func &rfunc)`用于构造Br(x,y,b)=input_b(y,x,b)表达式。
以下是抽象出来的3个data transform op：

- ReorderOP**：将一个input第一维和第二维数据排布交换的操作。其实现方法是定义一个新的函数，令reorder_func(x,y,...) = input(y,x,...)。
- <strong>InterleaveOP</strong>：将一个input第一维每m个数据划分。其实现方法是定义一个新的函数，令interleave_func(x,y,xo,...) = input(xo*m+x,y,...)。
<strong>SplitYOP</strong>:将一个input第二维每m个数据划分。其实现方法是定义一个新的函数，令splity_func(x,y,yo,...) = input(x,yo*m+y,...)。**
AutoDataTransform的cost model**

cost model设计的基本原理就是，选择合适的数据排布，使得在计算过程中，数据的读取是流畅的连续的，减少cache miss。**根据优化经验，几种数据重新排布的方法可以提高优化后的执行速度，为了表征这些排布的效果，cost model的设计定义了两类cost：分别为reorder cost和use_distance cost。
reorder cost****对于一个这样的表达式：

`func(x,y,z,b) = input(y,x,z)*b`

在x和y维度上input和func的数据读取顺序发生了不一致，这种不一致在y很大时会导致cache miss率增大，其cache miss的程度可以用来衡量这种数据排布的cost。

由于当y较大时，对于此运算，发生cache miss的次数为循环次数（即cache几乎没有命中过），故次数为x<strong>y</strong>z*b。

对于上述表达式，如果我们增加一个定义：

`Reorder(x,y,z) = input(y,x,z)
func(x,y,z,b) = Reorder(x,y,z)*b`

可以看到，结果一样，func(x,y,z,b)这个表达式没有发生cache miss，只有上面的Reorder(x,y,z)发生了cache miss，其miss次数为x<strong>y</strong>z，可以看到，miss次数减少了b倍。所以我们定义reorder cost为发生数据读取顺序不一致的表达式的数据总量。

需要注意的是，这个cost并不是线性的，因为它需要x,y维度的大小来计算，当x*y在cache大小内时，此时cache中并不会完全miss，而对于cpu来说，有L1，L2,L3三层cache，每层大小不同，因此这个cost函数是阶梯上升的。具体参数设置可以从DataTransform.h中的compute_order_cost函数中获取。

use_distacne cost****use_distance比reorder更加难理解一些，它是基于如下考虑的，当下游的一个表达式需要的数据大于一个cache大小时，我们可以对数据进行划分，使之按照一个cache大小的划分成块，这样的处理会使数据形成流水线，上游生产的数据顺序与下游需求的数据顺序一致，那么当下游读取数据时就可以不停的从cache中读取，而不需要经过内存-cache访存了。

具体看如下实例：

`Rdom k(0,K);
func(x,y,b) += input_A(k,y,b)*input_b(x,k,b);`

在这个例子中，input_b的数据需求始终是第二维优先的，我们可以通过reroder使其变成第一维，也可以使用划分的操作。我们对x进行划分,形成新的表达式：

`Rdom k(0,K);
Bi(x,y,xo,b) = input_b(xo*16+x,y,b)
func(x,y,b) += input_A(k,y,b)*Bi(x%16,k,x/16,b);`

新增加的Bi表达式的数据产生顺序是x,y,xo,b，其中x的范围为0~16，因此x*y的大小缩小了，这部分数据可以在一个cache中放下，而在func表达式中，我们需求的数据顺序对应到Bi中是y,x,xo,b。

在没有划分前，input_b的数据准备顺序和数据读取顺序之间相差了M倍（input_b的第一维的大小），而划分后，input_b的数据准备顺序和数据读取顺序之间仅相差了16，这大大提高了数据的读取效率。

use_distance cost的定义：表达式相邻两次计算时读取的输入数据在内存上的距离。

注意到如果原始的尺寸中x*y就很小，那么use_distance cost也没有意义，因为所有的数据都放在cache中了。所以我们的use_distance cost是一个分段函数。

### 结语

在自动调优算法不变的情况下，增加auto data transform，gemm的性能提升了一倍，autosearch的文档里给出了一组实测数据

目前auto data transform主要是针对gemm这个例子，根据手工优化经验抽象出来的data_transform_op, 然后设计cost model来衡量使得在计算过程中，数据的读取是流畅的连续的，减少cache miss。如何把这份工作的思想推广到更general的计算，希望和大家多多交流~

传送门**

Tengine：让AI部署更简单

[](https://link.zhihu.com/?target=https%3A//github.com/OAID/Tengine)

AutoKernel：一个致力于降低优化门槛，提升优化开发效率的算子自动优化工具 

[](https://link.zhihu.com/?target=https%3A//github.com/OAID/AutoKernel)

如果你想一起探讨AI部署技术/自动调优技术，欢迎加入OPEN AI LAB 开发者技术QQ群（829565581），入群秘令：CNN
