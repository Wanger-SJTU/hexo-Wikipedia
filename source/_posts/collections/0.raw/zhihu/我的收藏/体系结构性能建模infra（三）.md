---
title: (2 条消息) 体系结构性能建模infra（三）
date: "2025-05-24 00:00:00"
updated: "2025-05-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/体系结构性能建模infra(三)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1891135474493547187
---


该infra将每个port抽象为一个一写多读的队列，读写分离，通过管理每个port的队列实现打拍，显式记录每个port可以读取的时间，但是代价比较大，但是作者提出了补救方案。此外：该框架也不是最终版本。

每个module维护如下内容：

- write_ports数组
- read_ports数组 
- Parent module 指针
- Children module 数组
每个module支持的功能：

- make_write_port，使用PortMap + name + bandwidth初始化WritePort指针，PortMap内部维护了一写多读的抽象
- make_read_port，使用PortMap + name + bandwidth初始化ReadPort指针，PortMap内部维护了一写多读的抽象
- add_child，向children module数组增加child module
- clock，模块每个周期如何进行更新
该框架的port的设计，我觉得算过度设计了，下面看分析：

首先是上面提到的PortMap抽象，为每个port维护了一写多读的设计，此外用string标识port name，这里就有一个开销的问题了，多读口那么就要用队列，每次创建一个port就要申请一个队列？最大的开销来自动态申请空间，于是作者额外增加了一个预先分配大块空间的内存区域用于创建port queue。

```cpp
struct Cluster
    {
        class BasicWritePort* writer = nullptr;
        std::vectorBasicReadPort*> readers = {};
    };

    std::unordered_map map = { };
```


接着看port的抽象设计，使用lasy_cycle和cycle进行打拍，使用Update_last_cycle来进行port的更新，这里体现为last_cycle = cycle，所以实际的更新操作呢？此外还有额外的开销，是read_port的latency，write_port的fanout以及bandwidth，这些都需要在初始化的时候进行设定。

BasicReadPort继承自Port，使用bandwidth进行初始化？

BasicWritePort继承自Port，使用BasicReadPort数组进行初始化，此外需要统计write_counter，必须小于默认设定的bandwidth，当拍可以多次写入同一个writePort，但是必须在bandwdith范围内。

ReadPort继承自BasicReadPort，这里维护了一个队列，元素类型为`std::pairCycle>` , 先说初始化仍然是bandwidth init，实际上就是将queue的大小设定为(latency + 1) * bandwidth , 注意这是一个port对应的队列大小！为什么要这样设计，因为bandwidth代表的是最多同一拍写入多少个data，但是读data需要latency的延迟，在latency时刻才能读到，所以前面需要加0，最后一个data才是需要用的。检测is_ready的方式是将last_cycle的data出队列，检测当前队列头的data对应的cycle是否正确，read是先检测ready，再queue pop front。ReadPort在计算读取时间时，会在数据写入时记录当前周期+latency作为可以读取的时间再加入队列。

```cpp
Cycle cycle_to_read = cycle + get_latency(); // 延迟计算
 queue.emplace(std::move(what), cycle_to_read);
```


WritePort继承自BasicWritePort，维护了一个ReadPort指针类型的数组名为destinations，这是WritePort设计的核心，该数组不用于读端口对象的所有权，读端口的生命周期由外部管理，若读端口被提前销毁，`destinations` 中的指针会悬空，basic_write方法会遍历destinations将数据分发给所有的读者，从而实现读写分离设计。init方法初始化的时候在destinations里面注册ReadPort指针，真正写入的时候将data以及cycle写入该指针对应位置。

对应的port测试

```x86asm
pop.wp->write( 10, 0_cl);
    pop.wp->write( 11, 1_cl);
    CHECK( pop.rp->is_ready( 1_cl));
    CHECK( pop.rp->is_ready( 2_cl));
    CHECK( pop.rp->read( 2_cl) == 11);
```


对应的module测试

```cpp
class A : public Module
{
public:
    explicit A( Module* root) : Module( root, "A")
    {
        to_B = make_write_port( "A_to_B", Port::BW);
        from_B = make_read_port( "B_to_A", Port::LATENCY);
        init = make_read_port( "init_A", Port::LATENCY);
        stop = make_write_port( "stop", Port::BW);
    }

    void clock( Cycle cycle)
    {
        bool is_init_ready = init->is_ready( cycle);
        bool is_from_B_ready = from_B->is_ready( cycle);

        if ( cycle != 1_cl)
            CHECK( !is_init_ready);
        CHECK( check_readiness( cycle, MODULE_B, is_from_B_ready));

        if ( is_init_ready)
        {
            auto data = init->read( cycle);
            CHECK( cycle == 1_cl );
            CHECK( data == 0 );
            to_B->write( data + 1, cycle);
        }
        else if ( is_from_B_ready)
        {
            auto data = from_B->read( cycle);
            CHECK( check_data( cycle, MODULE_B, data));
            if ( data >= DATA_LIMIT)
                stop->write( true, cycle);
            else
                to_B->write( data + 1, cycle);
        }
    }

private:
    WritePort* to_B;
    ReadPort* from_B;
    ReadPort* init;
    WritePort* stop;
};
```


代码链接：[https://github.com/MIPT-ILab/mipt-mips/tree/main/simulator/infra/ports](https://link.zhihu.com/?target=https%3A//github.com/MIPT-ILab/mipt-mips/tree/main/simulator/infra/ports)