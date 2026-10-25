---
title: 你见过哪些令你瞠目结舌的C/C++代码技巧？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/你见过哪些令你瞠目结舌的C_C-代码技巧/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/37692782/answer/74130797
---


看轮子哥写了个关于lambda序列化的，我也准备写个相关的东西。

1. 先写个C++反射的吧。

这个反射主要好用在不需要用户先去进行任何注册操作。

Note:刚发现似乎只有在gcc上才不需要注册（哎哟，瞬间感觉不高端了）。
因为gcc类内的静态变量在main之前都构造好了，而有的编译器是在第一次使用前才构造。

而标准里写了：

It is implementation-defined whether the dynamic initialization of a non-local variable with static storage duration is done before the first statement of main.

确实是每种编译器自己实现决定的。

`#include 
#include 
#include 
#include 
#include 
#include 
using namespace std;

templatetypename Base>
class Reflection {
public:
   templatetypename Sub>
   static std::string type_name() {
       return TypeNameSub>::type_name();
   }

   templatetypename Sub>
   static std::string type_name(Sub) {
       return TypeNameSub>::type_name();
   }

   static Base* create(const std::string& name) {
         return (*s_creator[name])();
   }

private:

    class AllocatorBase {
    public:
        virtual Base* operator()() = 0;
    };

    templatetypename T>
    class Allocator : public AllocatorBase{
    public:
        T* operator()() {
           return new T;
        }
    };

    templatetypename Sub>
    class Registery {
    public:
       Registery() {
           s_creator[get_name()] = new AllocatorSub>(); // 简化版本，请忽略这个内存泄漏
       }

       static std::string get_name() {
           // 实际上为避免引入rtti，我们用的是一个没使用rtti的gcc方言搞定的，这里为方便说明简化成这样
           return typeid(Sub).name();
       }
    };

    templatetypename Sub>
    class TypeName {
    public:
      static std::string type_name() {
          return s_registery.get_name();
      }
    private:
        static RegisterySub> s_registery;
    };

    static std::mapstd::string, AllocatorBase* > s_creator;
};

templatetypename Base>
std::mapstd::string, typename ReflectionBase>::AllocatorBase* > ReflectionBase>::s_creator;

templatetypename Base>
templatetypename Sub>
ReflectionBase>::RegisterySub> ReflectionBase>::TypeNameSub>::s_registery;

class MapFn {
public:
   virtual void call() = 0;
};

class UserMapFn : public MapFn {
    void call() {
       puts("User Map Fn called");
    }
};

int main(int argc ,char** argv)
{
    if (argc == 1) {
        std::string cmd = "";
        cmd += argv[0];
        cmd += " \"" + ReflectionMapFn>::type_nameUserMapFn>() + "\"";
        std::cout  cmd  std::endl;
        system(cmd.c_str());
        return 0;
    }
    std::cout  "in sub process"  std::endl;
    std::string name = argv[1];
    ReflectionMapFn>::create(name)->call();  // 注意这子进程里从未显式调用过任何注册相关的代码
}
`

我们的项目目的是实现一个分布式计算的表示层API，有了上面的反射，这个API用起来就可以长得像下边这个样子了（现实要比这个好看不少，这里把功能简化简化再简化了）：

`class ToInt: public MapFnstd::string, int> {
    int map(std::string input) const {
        return boost::lexical_castint>(input);
    }
};

class Sum: public ReduceFnint> {
    int reduce(int a, int b) const {
        return a + b;
    }
}

int main(int argc, char argv) {
    // 本地执行时，init_workflow函数啥也不干，直接返回
    // 远端执行时，init_workflow不会退出，反序列化出各个需要执行的算子，执行计算逻辑
    init_workflow(argc, argv);  

    PCollectionstd::string> p = readlines("hdfs:///input_dir/");
    p.map(ToInt())
     .reduce(Sum()) 
     .writelines("./output_dir");
    
    // 只有本地执行会执行到这里，本地会把前边拼出的执行计划序列化一下，
    // 提交作业到分布式计算框架，让分布式框架在远端启动该程序
    run_workflow();
}
`

然后在client端把这些要执行的函数记录下来，翻译到分布式系统上，再到分布式系统上正确的位置反射出来正确的函数并执行即可。

2. 关于lambda序列化。 // TODO

C++普通类型的序列化，可以实现一些序列化类，派生自这个类：

`template
class Serde {
public:
    typedef T ObjectType;

    virtual ~Serde() {}

    virtual T* construct(char* buffer, int buffer_size) const {
        CHECK_GE(buffer_size, sizeof(T));
        return new(buffer) T();
    }

    virtual void destruct(T* ptr) const {
        ptr->~T();
    }

    // Return the size of serialized object,
    // The method is considered as failed when the size is larger than the buffer_size
    virtual uint32_t serialize(const T& object, char* buffer, uint32_t buffer_size) const = 0;

    // The buffer_size is same as object serialized size
    virtual void deserialize(T* object, const char* buffer, uint32_t buffer_size) const = 0;

    // for debug
    virtual std::string to_string(const T& object) const = 0;
};

`

然后，弄一个SerdeOf，用来获取一个类型默认的序列化器：

`template
struct SerdeOf;
`

然后把各种常见类型都注册到SerdeOf上，例如：

`template
class ProtobufSerde : public Serde {
public:
    virtual uint32_t serialize(const T& message, char* buffer, uint32_t buffer_size) const {
        google::protobuf::io::ArrayOutputStream stream(buffer, buffer_size);
        if (message.SerializeToZeroCopyStream(&stream)) {
            return stream.ByteCount();
        }
        return message.ByteSize();
    }

    virtual void deserialize(T* message, const char* buffer, uint32_t buffer_size) const {
        CHECK(message->ParseFromArray(buffer, buffer_size));
    }

    virtual std::string to_string(const T& message) const {
        return message.DebugString();
    }
};

template
struct SerdeOf::type
>::type> {
    typedef ProtobufSerde type;
};
`

这样，就实现了一套可以扩展的且原生、常见类型都不需要用户设置序列化器的序列化机制。
例如注册过vector和int了之后，就可以：SerdeOf >::type来获取一个可以序列化vector的序列化器。

用户的Fn如果有状态，则可以让它派生自一个Protobuf的Message（或者自己实现一个serde，并注册一下），这样就可以在client端把Fn序列化，然后到远端分布式执行时，把Fn反序列化回来。

普通的类都可以这样搞定。

但只有普通的类型，并不能满足我们。

于是，我们试着找一个能够直接把lambda和原生函数序列化、反射、并反序列化的方法，这里是找到的一个将lambda反射的方法，但种方法只能用在没有捕获变量的情况下，也就是必须无状态。

`template
class LambdaMapFn : public MapFn {
    void call() {
        //这样构造一个lambda是经xreborner指点之后我才意识到可以这样搞的。
        (*static_cast(NULL))(); 
    }
};

template
LambdaMapFn map_lambda(F f) {
    return LambdaMapFn();
}

int main(int argc ,char** argv)
{
    if (argc == 1) {
        std::string cmd = "";
        cmd += argv[0];
        cmd += " \"" + Reflection::type_name(map_lambda([](){puts("a lambda");})) + "\"";
        std::cout ::create(name)->call(); 
}
`

如果捕获变量都是POD类型，则可以直接像 @vczh

轮子哥那样memcpy一下，到远端强转一下，把那块内存强转成lambda，然后调用就可以了。

如果捕获变量是non-POD类型，有两个方法，但是那两个方法也不是很完美。
方案一是需要用户指明捕获的参数分别是哪些类型，然后根据这个类型去lambda内存里直接取这些数据，去序列化。但依赖于编译器对lambda中捕获的变量存放的位置。（当时查了标准，似乎没有明确规定变量存放位置）
方案二是必须要用户把用一个我们实现的类型包裹一下捕获的变量（具体方法记不太清楚了）
最后基本上得到结论，没有什么特别完美的方案。

总之,有了这些，前述的API接口就可以变成这样了：

`int main(int argc, char argv) {
    init_workflow(argc, argv);  

    PCollectionstd::string> p = readlines("hdfs:///input_dir/");
    p.map([](std::string n) {return boost::lexical_castint>(n);})
     .reduce([](int a, int b) {return a + b;}) 
     .writelines("./output_dir");

    run_workflow();
}
`

[编辑于 2019-12-30 19:09](//www.zhihu.com/question/37692782/answer/74130797)

​​1008 ​107 ​分享

​​

收起​
