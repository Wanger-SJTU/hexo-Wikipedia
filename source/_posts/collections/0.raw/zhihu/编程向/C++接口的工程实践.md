---
title: "C++接口的工程实践"
date: 2021-10-22
tags: [知乎]
source: https://zhuanlan.zhihu.com/p/212862996
---

### 一、引言

程序开发的时候经常会使用到接口。众所周知，C++语言层面并没有接口的概念，但并不意味着C++不能实现接口的功能。相反，正是由于C++语言没有提供标准的接口，导致实际实现接口的方法多种多样。那么C++有哪些实现接口的方法呢，不同的方法又适用于哪些场景呢？本文探讨C++接口的工程实践。

### 二、接口的分类

接口按照功能划分可以分为调用接口与回调接口：

**调用接口：**一段代码、一个模块、一个程序库、一个服务等（后面都称为系统），对外提供什么功能，以接口的形式暴露出来，用户只需要关心接口怎么调用，不用关心具体的实现，即可使用这些功能。这类被用户调用的接口，称为调用接口。

调用接口的主要作用是解耦，对用户隐藏实现，用户只需要关心接口的形式，不用关心具体的实现，只要保持接口的兼容性，实现上的修改或者升级对用户无感知。解耦之后也方便多人合作开发，设计好接口之后，各模块只通过接口进行交互，各自完成各自的模块即可。

**回调接口：**系统定义接口，由用户实现，注册到系统中，系统有异步事件需要通知用户时，回调用户注册的接口实现。系统定义接口的形式，但无需关心接口的实现，而是接受用户的注册，并在适当的时机调用。这类由系统定义，用户实现，被系统调用的接口，称为回调接口。

回调接口的主要作用是异步通知，系统定义好通知的接口，并在适当的时机发出通知，用户接收通知，并执行相应的动作，用户动作执行完后控制权交还给系统，用户动作可以给系统返回一些数据，以决定系统后续的行为。

### 三、调用接口

我们以一个Network接口为例，说明C++中的调用接口的定义及实现，示例如下：

`class Network
{
public:
    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);
}
`

Network接口现在只需要一个send接口，可以向指定地址发送消息。下面我们用不同的方法来定义Network接口。

### 1、虚函数

虚函数是定义C++接口最直接的方式，使用虚函数定义Network接口类如下：

`class Network
{
public:
    virtual bool send(const char* host, 
                      uint16_t port, 
                      const std::string& message) = 0;

    static Network* New();

    static void Delete(Network* network);
}​
`

将send定义为纯虚函数，让子类去实现，子类不对外暴露，提供静态方法New来创建子类对象，并以父类Network的指针形式返回。接口的设计一般遵循对象在哪创建就在哪销毁的原则，因此提供静态的Delete方法来销毁对象。因为对象的销毁封装在接口内部，因此Network接口类可以不用虚析构函数。

使用虚函数定义接口简单直接，但是有很多弊端：

**虚函数开销：**虚函数调用需要使用虚函数表指针间接调用，运行时才能决定调用哪个函数，无法在编译链接期间内联优化。实际上调用接口在编译期间就能确定调用哪个函数，无需虚函数的动态特性。

**二进制兼容：**由于虚函数是按照索引查询虚函数表来调用，增加虚函数会造成索引变化，新接口不能在二进制层面兼容老接口，而且由于用户可能继承了Network接口类，在末尾增加虚函数也有风险，因此虚函数接口一经发布，难以修改。

### 2、指向实现的指针

指向实现的指针是C++比较推荐的定义接口的方式，使用指向实现的指针定义Network接口类如下：

`class NetworkImpl;
class Network
{
public:
    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    Network();

    ~Network();

private:
    NetworkImpl* impl;
}
`

Network的实现通过impl指针转发给NetworkImpl，NetworkImpl使用前置声明，实现对用户隐藏。使用指向实现的指针的方式定义接口，接口类对象的创建和销毁可以由用户负责，因此用户可以选择将Network类的对象创建在栈上，生命周期自动管理。

使用指向实现的指针定义接口具有良好的通用性，用户能够直接创建和销毁接口对象，并且增加新的接口函数不影响二进制兼容性，便于系统的演进。

指向实现的指针增加了一层调用，尽管对性能的影响几乎可以忽略不计，但不太符合C++的零开销原则，那么问题来了，C++能否实现零开销的接口呢？当然可以，即下面要介绍的隐藏的子类。

### 3、隐藏的子类

隐藏的子类可以实现零开销的接口，思想非常简单。调用接口要实现的目标是解耦，主要就是隐藏实现，也即隐藏接口类的成员变量，如果能将接口类的成员变量都移到另一个隐藏的实现类中，接口类就不需要任何成员变量，也就实现了隐藏实现的目的。隐藏的子类就是这个隐藏的实现类，使用隐藏的子类定义Network接口类如下：

`class Network
{
public:
    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    static Network* New();

    static void Delete(Network* network);

protected:
    Network();

    ~Network();
}
`

Network接口类只有成员函数（非虚函数），没有成员变量，并且构造函数和析构函数都申明为protected。提供静态方法New创建对象，静态方法Delete销毁对象。New方法的实现中创建隐藏的子类NetworkImpl的对象，并以父类Network指针的形式返回。NetworkImpl类中存放Network类的成员变量，并将Network类声明为friend：

`class NetworkImpl : public Network
{
    friend class Network;

private:
    //Network类的成员变量
}
`

Network的实现中，创建隐藏的子类NetworkImpl的对象，并以父类Network指针的形式返回，通过将this强制转换为NetworkImpl的指针，访问成员变量：

`bool Network::send(const char* host, 
                   uint16_t port, 
                   const std::string& message)
{
    NetworkImpl* impl = (NetworkImpl*)this;
    //通过impl访问成员变量，实现Network
}

static Network* New()
{
    return new NetworkImpl();
}

static void Delete(Network* network)
{
    delete (NetworkImpl*)network;
}
`

使用隐藏的子类定义接口同样具有良好的通用性和二进制兼容性，同时没有增加任何开销，符合C++的零开销原则。

### 四、回调接口

同样以Network接口为例，说明C++中的回调接口的定义及实现，示例如下：

`class Network
{
public:
    class Listener
    {
    public:
        void onReceive(const std::string& message);
    }

    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    void registerListener(Listener* listener);
}
`

现在Network需要增加接收消息的功能，增加Listener接口类，由用户实现，并注册其对象到Network中后，当有消息到达时，回调Listener的onReceive方法。

### 1、虚函数

使用虚函数定义Network接口类如下：

`class Network
{
public:
    class Listener
    {
    public:
        virtual void onReceive(const std::string& message) = 0;
    }

    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    void registerListener(Listener* listener);
}
`

将onReceive定义为纯虚函数，由用户继承实现，由于多态的存在，回调的是实现类的方法。

使用虚函数定义回调接口简单直接，但同样存在和调用接口中使用虚函数同样的弊端：虚函数调用开销，二进制兼容性差。

### 2、函数指针

函数指针是C语言的方式，使用函数指针定义Network接口类如下：

`class Network
{
public:
    typedef void (*OnReceive)(const std::string& message, void* arg);

    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    void registerListener(OnReceive listener, void* arg);
}
`

使用函数指针定义C++回调接口简单高效，但只适用于回调接口中只有一个回调函数的情形，如果Listener接口类中要增加onConnect，onDisconnect等回调方法，单个函数指针无法实现。另外函数指针不太符合面向对象的思想，可以换成下面要介绍的std::function。

### 3、std::function

std::function提供对可调用对象的抽象，可封装签名相符的任意的可调用对象。使用std::function定义Network接口类如下：

`class Network
{
public:
    typedef std::functionvoid(const std::string& message)> OnReceive;

    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    void registerListener(const OnReceive& listener);
}
`

std::function可以很好的取代函数指针，配合std::bind，具有很好的通用性，因而被广受推崇。但std::function同样只适用于回调接口中只有一个回调方法的情形。另外，std::function比较重量级，使用上面的便利却会带来了性能上的损失，有人做过性能对比测试，std::function大概比普通函数慢6倍以上，比虚函数还慢。

### 4、类成员函数指针

类成员函数指针的使用比较灵活，使用类成员函数指针定义Network接口类如下：

`class Network
{
public:
    class Listener
    {
    public:
        void onReceive(const std::string& message);
    }

    typedef void (Listener::* OnReceive)(const std::string& message);

    bool send(const char* host, 
              uint16_t port, 
              const std::string& message);

    void registerListener(Listener* listener, OnReceive method);

    templatetypename Class>
    void registerListener(Class* listener, void (Class::* method)(const std::string& message)
    {
        registerListener((Listener*)listener, (OnReceive)method);
    }
}
`

因为类成员函数指针必须和类对象一起使用，所以Network的注册接口需要同时提供对象指针和成员函数指针，registerListener模板函数可注册任意类的对象和相应符合签名的方法，无需继承Listener，与接口类解耦。

使用类成员函数指针定义C++回调接口灵活高效，可实现与接口类解耦，并且不破坏面向对象特性，可很好的取代传统的函数指针的方式。

类成员函数指针同样只适用于回调接口中只有一个回调方法的情形，如果有多个回调方法，需要针对每一个回调方法提供一个类成员函数指针。那么有没有方法既能实现与接口类解耦，又能适用于多个回调方法的场景呢？参考下面介绍的非侵入式接口。

### 五、非侵入式接口

Rust中的Trait功能非常强大，可以在类外面，不修改类代码，实现一个Trait，那么C++能否实现Rust的Trait的功能呢？还是以Network接口为例，假设现在Network发送需要考虑序列化，重新设计Network接口，示例如下：

定义Serializable接口：

`class Serializable
{
public:
    virtual void serialize(std::string& buffer) const = 0;
};
`

Network接口示例：

`class Network
{
public:
    bool send(const char* host, 
              uint16_t port, 
              const Serializable& s);
}
`

Serializable接口相当于Rust中的Trait，现在一切实现了Serializable接口的类的对象均可以通过Network接口发送。那么问题来了，能否在不修改类的定义的同时，实现Serializable接口呢？假如我们要通过Network发送int类型的数据，能否做到呢？答案是肯定的：

`class IntSerializable : public Serializable
{
public:
    IntSerializable(const int* i) :
        intThis(i)
    {

    }

    IntSerializable(const int& i) :
        intThis(&i)
    {

    }

    virtual void serialize(std::string& buffer) const override
    {
        buffer += std::to_string(*intThis);
    }

private:
    const int* const intThis;
};
`

有了实现了Serializable接口的IntSerializable，就可以实现通过Network发送int类型的数据了：

`Network* network = Network::New();
int i = 1;
network->send(ip, port, IntSerializable(i));
`

Rust编译器通过impl关键字记录了每个类实现了哪些Trait，因此在赋值时编译器可以自动实现将对象转换为相应的Trait类型，但C++编译器并没有记录这些转换信息，需要手动转换类型。

非侵入式接口让类和接口区分开来，类中的数据只有成员变量，不包含虚函数表指针，类不会因为实现了N个接口而引入N个虚函数表指针；而接口中只有虚函数表指针，不包含数据成员，类和接口之间通过实现类进行类型转换，实现类充当了类与接口之间的桥梁。类只有在充当接口用的时候才会引入虚函数表指针，不充当接口用的时候没有虚函数表指针，更符合C++的零开销原则。

注：以上内容首发于阿里技术

[](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzIzOTU0NTQ0MA%3D%3D%26mid%3D2247499235%26idx%3D1%26sn%3D61d45f1ab4a1d7ce6e32c5a5ecb153b4%26chksm%3De92ac0ecde5d49fa773a67df99b6568f77d211c62e0b4b0cb03a3f090088c24038f795342bf6%26xtrack%3D1%26scene%3D0%26subscene%3D10000%26clicktime%3D1599097224%26enterid%3D1599097224%26ascene%3D7%26devicetype%3Dandroid-29%26version%3D27001237%26nettype%3DWIFI%26abtest_cookie%3DAAACAA%253D%253D%26lang%3Dzh_CN%26exportkey%3DAWf%252BTapgOsfdoX6x0%252BGjOAQ%253D%26pass_ticket%3DRGMLmI%252BywFn7WHVQ7XofRQyJ9AN%252FU8yCFm3pcLz2DTBkGbaCBrM3WpeT1WS%252BaQO0%26wx_header%3D1)
