---
title: "c++ trivial/pod 是什么意思？"
date: "2021-07-20 00:00:00"
updated: "2021-07-20 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/走向cs/c-trivial_pod-是什么意思/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/472942396/answer/2009365067"
---


该问题下有两个回答有瑕疵。

POD类型代表可以直接使用memcpy()直接复制而不会出现任何问题。<strong>POD 只是可以安全使用 memcpy 的充分非必要条件</strong>。其实只要这个类型是 TriviallyCopyable 的，那就能安全地使用 memcpy 去拷贝它。而 POD 是相比 TriviallyCopyable 更加严格的限制，没有必要。

那具体它们之间是什么关系呢？请听我详细地讲解一遍。

首先，众所周知，C++ 的类里头，有六个最为特殊的成员函数：

- 默认构造函数，即 T::T( )
- 拷贝构造函数，即 T::T( (const) (volatile) T&)
- 拷贝赋值运算符，即 T::operator=( (const) (volatile) T&)
- 析构函数，即 T::~T()
- 移动构造函数，即 T::T( (const) (volatile) T&&)
- 移动赋值运算符，即 T::operator=( (const) (volatile) T&&)不严谨地来说，只要这个类的以上对应的成员函数，不做什么”额外“的动作，那么这个成员函数就是 Trivial (平凡) 的。

举一些例子吧。

1.

```cpp
struct Foo
{
    int x;
};
```


Foo 六个成员函数全部都是平凡的，因为：

默认构造函数不做任何初始化动作（连 .x 初始化为 0 也不会做）

拷贝/移动构造函数只是老老实实地依次拷贝/移动各个成员

拷贝/移动赋值函数只是老老实实地依次拷贝/移动赋值各个成员

析构函数什么也没做

2.

```cpp
struct Foo
{
    int x;
    Foo() = default;
    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo &) = default;
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};
```


同上，六个成员函数全部为 Trivial

3.

```cpp
struct Foo
{
    int x;
    Foo() {}
    Foo(const Foo & src) : x(src.x) {}
    Foo(Foo && src) : x(std::move(src.x)) {}
    Foo& operator=(const Foo &) {}
    Foo& operator=(Foo &&) {}
    ~Foo() {}
};
```


这个情况下，不好意思，六个全部都不是 Trivial。因为哪怕就是空的函数体，或是做了和默认提供的版本一样的操作，那我也认为你改变了默认的行为了，不能算 Trivial。

4.

```cpp
struct Goo
{
    Goo() = default;
    Goo(const Goo&) { std::cout << 2333 << std::endl;} // 我不平凡！
    Goo(Goo &&) = default;
    Goo& operator=(const Goo&) = default;
    Goo& operator=(Goo &&) = default;
};

struct Foo : Goo
{
    Foo() = default;
    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo &) = default;
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};
```


这种情况下，Foo 的拷贝构造函数一样是不平凡的。因为你拷贝一个 Foo 类对象就一定会调用到父类 Goo 的拷贝构造函数，打印一行 2333。

如果 Goo 不是基类，而是非静态的成员，则情况相似。

5.

```cpp
struct Goo
{
    Goo() = default;
    Goo(const Goo&) = default;
    Goo(Goo &&) = default;
    Goo& operator=(const Goo&) = default;
    Goo& operator=(Goo &&) = default;

    virtual void f() {}
};

struct Foo : Goo
{
    Foo() = default;
    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo &) = default;
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};
```


这种情况下，有了虚函数了。除了析构函数是 Trivial 的，不做任何事以外，其他五个全部阵亡。因为它们都会去对虚表指针进行一定的处理。

好了，我想介绍到这里，已经够我们接下来讨论的了。就是所谓的 Trivial，只是做和 C 的结构体那样，很”平凡“的事罢了。

其他种种繁琐的我上面没列全的情况还有很多，各位可以用以下的特征萃取工具分别去检测。

```cpp
#include <type_traits>
#include <iostream>

int main()
{
    using namespace std;

    cout << is_trivially_default_constructible<Foo>::value << std::endl;
    cout << is_trivially_copy_constructible<Foo>::value << std::endl;
    cout << is_trivially_move_constructible<Foo>::value << std::endl;
    cout << is_trivially_copy_assignable<Foo>::value << std::endl;
    cout << is_trivially_move_assignable<Foo>::value << std::endl;
    cout << is_trivially_destructible<Foo>::value << std::endl;
}
```


一般而言，在 C++ 库的底层，一个位于动态存储区的对象，它的生命周期里都会经历这四个步骤：

```cpp
#include <memory>

template <typename T>
void life_of_an_object
{
    std::allocator<T> alloc;

    // 1. 通过 allocator 抑或是 malloc 等其他方式分配出空间
    T * p = alloc.allocate(1);

    // 2. 通过 placement new，(在需要的时候) 动态地构造对象
    new (p) T(); // 这里是默认构造，也可能是带参数的构造方式如 new (p) T(构造参数...);

    // 3. 通过显式调用析构函数，(在需要的时候) 动态地销毁对象
    p->~T();

    // 4. 通过分配函数的对应的解分配手段，解分配空间
    alloc.deallocate(p, 1);
}
```


像 std::vector 中的每一个元素，链表 std::list、红黑数 std::set 中的每一个节点，归根结底都要经历这四个步骤。

如果 T 类型是平凡默认构造的，则意味着步骤 2 其实是不需要的——反正 T 类型在默认构造的时候，什么也没做，没有清零内部空间什么的。步骤 2 不做不会对程序的正确性构成任何影响。

如果 T 类型是平凡析构的，则意味着步骤 3 其实是不需要的——反正 T 类型在析构的时候，什么也没做，不用释放内存，不用 close 文件，不用释放 socket…… 。步骤 3 不做同样也不会对程序的正确性构成任何影响。

<strong>那我们在模板库中，就可以为对应的成员函数为 Trivial 的类型，做单独的特化，从而提高性能。</strong>

想必读到这里肯定有读者会很不以为然地质问一句：

<strong>它就是一个空的调用，编译器不会优化的吗？</strong>

诚然，对于这种最简单、最显而易见的情况，哪个编译器做不了优化，哪个是辣鸡。

<strong>但是情况要是复杂一些呢？如果被析构的是一段区间呢？</strong>

```cpp
struct Foo
{
    ~Foo() = default;
};

#include <list>
#include <set>

template <typename Iterator>
void myDestroy(Iterator first, Iterator last)
{
    using value_type = typename std::iterator_traits<Iterator>::value_type;

    while (first != last) {
        first->~value_type();
        ++first;
    }
}

template void myDestroy(Foo*, Foo*);
template void myDestroy(std::set<Foo>::iterator, std::set<Foo>::iterator);
template void myDestroy(std::list<Foo>::iterator, std::list<Foo>::iterator);
```


gcc 9.4 生成的汇编是这样的：

![](https://pic1.zhimg.com/v2-5065ec828e963511422f79d9d8a39f67_r.jpg?source=2c26e567)

clang 11 生成的汇编是这样的：

![](https://picx.zhimg.com/v2-936f20970632cbc78af67da61a459c3c_r.jpg?source=2c26e567)

好家伙，真就沿着链表、二叉树遍历了一遍呗。而大家要知道，这样的遍历，其实是毫无用处、毫无意义的，对吧？它只遍历一遍，并无做任何事。

所以在先进的 gcc10.1、clang12 中，这些遍历被成功地优化消除：

![](https://picx.zhimg.com/v2-4fb814a9d4540ff9ea1ca50d65b4f8b9_r.jpg?source=2c26e567)
![](https://picx.zhimg.com/v2-e59ad2f6e8fed41c199594d4b56502bc_r.jpg?source=2c26e567)但是，gcc10.1 是 2020 年 5 月发布的，clang12 是 2021 年 7 月。<strong>这些优化都只是刚刚取得的成果，而且这些新版的编译器还尚未成为业界的主流</strong>。在早些版本的编译器中，譬如堪称一代经典的 gcc4.8.1，那个 C++11 刚出之时茹毛饮血的年代，是没有这些优化的，那就要靠库作者去人为的提供优化了。

我再提供一个我自己库中的例子：

这是我自己实现的一个链表类的区间 erase 方法，当检测到容器存储类型是平凡析构类型，且分配器类型为 std::pmr::polymorphic_allocator，且 memory_resource 使用的是 monotonic_buffer_resource 时，则只调整被移除的区间前后节点的 next、prev 指针，被移除的区间不做任何的析构、解分配处理。这样优化的依据就是存储 T 类型的节点是平凡析构的，而且标准规定，monotonic_buffer_resource 的解分配并无任何动作。

在满足优化条件的情况下，链表的区间 erase 的复杂度就由 O(n) 降到 O(1) 了。再考虑到链表节点存储的不连续性（比如一个创建时内容是随机数的链表经过排序，节点地址严重不连续），在缓存严重失效的情况下，这样的优化就会带来非常极致的性能。

我们可以再发散一下，如果是给红黑树加上这个优化，那么 clear 的时候一样只需要 O(1) 的复杂度，不再需要做一遍二叉树遍历销毁每一个节点了。显然，这种优化能够赋予 STL 风格的链表、红黑树在释放时，同侵入式风格的对应容器一样的性能。

以上介绍的就是 6 个 is_trivially_* 的巨大用处。

然后来讲讲 is_trivially_copyable。

本文的开头说过，”POD 类型代表可以安全使用 memcpy()“ 的说法是充分不必要的。

其实，只要这个类型满足 TriviallyCopyable 要求就足够了。

参见：

[std::is_trivially_copyable - cppreference.com](https://link.zhihu.com/?target=https%3A//zh.cppreference.com/w/cpp/types/is_trivially_copyable)
![](https://pic1.zhimg.com/v2-d459669b7dcf0fa56a31d9d9100811e3_r.jpg?source=2c26e567)又参见：

[C++ 具名要求：可平凡复制 (TriviallyCopyable)](https://link.zhihu.com/?target=https%3A//zh.cppreference.com/w/cpp/named_req/TriviallyCopyable)什么是 TriviallyCopyable 呢？

![](https://pic1.zhimg.com/v2-2ef567d3d24a11ca4693f04446a74364_r.jpg?source=2c26e567)注意，它只对我们上面所讲的六种特殊成员函数中的五种，除了默认构造函数以外，有平凡要求。

为什么呢？

见下例：

```cpp
struct Foo
{
    int x;

    Foo() : x(0)
    {
    }

    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo &) = default;
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};
```


这种情况下，Foo 类型的默认构造函数就是不平凡的（因为有了清零的动作），而其他五个皆为平凡。Foo 类型可安全地被 memcpy 函数拷贝，而不用担心发生任何有关深浅拷贝的问题。

所以 TriviallyCopyable 只要求五个平凡就足够了。

TriviallyCopyable 这一概念有何实际用处呢？

让我们来写一个简易版本的 std::copy 模板函数来看看：

```cpp
struct Foo
{
    int x;

    Foo() : x(0) {}
    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo &) = default;
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};

#include <algorithm>

template Foo* std::copy(Foo*, Foo*, Foo*);

template <typename Iterator, typename OutputIterator>
OutputIterator myCopy(Iterator first, Iterator last, OutputIterator to)
{
    while (first != last) {
        *to = *first;
        ++first;
        ++to;
    }
    return to;
}

template Foo* myCopy(Foo*, Foo*, Foo*);
```


这是 g++ 生成的汇编：

![](https://pic1.zhimg.com/v2-ffe7c767f2d0a75068363d9e40d28a20_r.jpg?source=2c26e567)我们发现，标准库的 std::copy 被成功优化作了对 memmove 的调用，而我们自己写的版本则只是逐个进行拷贝。

我们再把上一例 Foo 中的拷贝赋值函数换成手动的变量赋值，<strong>注意，我们只是做了这一处丝毫没有改变代码意义的变动</strong>，然后再看看有何改变：

```cpp
struct Foo
{
    int x;

    Foo() : x(0) {}
    Foo(const Foo &) = default;
    Foo(Foo &&) = default;
    Foo& operator=(const Foo & src) {
        this->x = src.x;
        return *this;
    }
    Foo& operator=(Foo &&) = default;
    ~Foo() = default;
};

#include <algorithm>

template Foo* std::copy(Foo*, Foo*, Foo*);

template <typename Iterator, typename OutputIterator>
OutputIterator myCopy(Iterator first, Iterator last, OutputIterator to)
{
    while (first != last) {
        *to = *first;
        ++first;
        ++to;
    }
    return to;
}

template Foo* myCopy(Foo*, Foo*, Foo*);
```


这是 gcc 生成的汇编（左边是修改之后的，右边是修改以前的）：

![](https://picx.zhimg.com/v2-b834b153a898ab6a3f0228e37e6ce4aa_r.jpg?source=2c26e567)
![](https://pic1.zhimg.com/v2-d6d9c9e20f4fe3cdf1d6e72c71e3ed2b_r.jpg?source=2c26e567)可见，myCopy 的汇编结果与刚才是一模一样的（除了标号不一样，这不影响结论）。说明将拷贝赋值函数由默认生成改为手动并无影响代码的语义。

然而，std::copy 内的 memmove 优化没有了。这就是因为 Foo 类在改动之后，不再满足 TriviallyCopyable 的要求了，std::copy 为了保守起见，不能再做这种优化。

而另一个问题，为什么我们写的 myCopy 不能被编译器优化成 memmove？我相信任何有些代码经验的 C 程序猿都可以想明白这个问题。<strong>编译器擅自将 myCopy 翻译成 memmove 是错误的优化！！！在目标区间和源区间有重叠的时候，优化成 memmove 后，算法所执行的结果和优化前可能是不一致的。这里和 C 语言中的 restrict 关键字那讨论的其实是同一个问题。</strong>

那可能又有人问，为什么 std::copy 可以做这个优化？因为 STL 已经规定了 std::copy 只适合做不重叠的拷贝或者向前拷贝。重叠的向后拷贝应当交给 std::copy_backward。所以 std::copy 可以在自己内部做此优化，而对我们手写的 myCopy 代码，编译器并不能擅自做此优化。

<strong>和上一节中例子不一样，这里就是一例并不能靠指望编译器做优化的例子。</strong>

<strong>所以对于满足 TriviallyCopyable 要求的类型，可以安全地使用 C 中 memcpy, memmove 等面向字节操作的函数，以提高程序的性能。</strong>

理解了 TriviallyCopyable，TrivialType (平凡类型) 就可以一句话带过了：

[C++ 具名要求：平凡类型 (TrivialType)](https://link.zhihu.com/?target=https%3A//zh.cppreference.com/w/cpp/named_req/TrivialType)
![](https://pica.zhimg.com/v2-5f4949b01afdc3881134555eba16f9c5_r.jpg?source=2c26e567)就是相比于 TriviallyCopyable，多了个对默认构造函数的平凡要求而已。

第四节我们来讨论 StandardLayoutType (标准布局类型)

参见：

[C++ 具名要求：标准布局类型 (StandardLayoutType)](https://link.zhihu.com/?target=https%3A//zh.cppreference.com/w/cpp/named_req/StandardLayoutType)
![](https://pic1.zhimg.com/v2-b480dae7c7cc0570bd8af53546c6a79e_r.jpg?source=2c26e567)C++ 中只是说，满足标准布局类型的对象，可以与其他语言互操作。

举个极端点的例子，哪怕 Foo 的六个成员函数都是不平凡的了：

```cpp
struct Foo
{
    int x;

    Foo() : x(0) {}
    Foo(const Foo & src) : x(src.x) {}
    Foo(Foo && src) : x(std::move(src.x)) {}
    Foo& operator=(const Foo & src) {
        this->x = src.x;
        return *this;
    }
    Foo& operator=(Foo && src) {
        this->x = std::move(src).x;
        return *this;
    }
    ~Foo() {
        x = 0;
    }
};
```


它也是满足标准布局类型的。因为标准布局不对六个特殊成员函数做任何要求。

（冷知识：在我的环境下，libstdc++ libc++ 中的 std::vector<int> 也是满足标准布局的，甚至在 libc++ 中 std::list<int> std::set<int> 也是。标准不保证它们一定要实现成标准布局，所以此结论不具备普适性）

最后，终于到 PODType (简旧类型) 了。

参见：

[C++ 具名要求：简旧数据类型 (PODType)](https://link.zhihu.com/?target=https%3A//zh.cppreference.com/w/cpp/named_req/PODType)
![](https://pica.zhimg.com/v2-b3cf057f596ab180a5ff8256edc9ae83_r.jpg?source=2c26e567)

设立此概念的初衷是为了描述那些 ”和 C 中结构体的概念相似的类型“。

但是，这个概念是太过于抽象和难以精确、严禁描述的。

通过标准中对 POD 定义的变动，甚至在 C++20 中 std::is_pod 被弃用等种种变化可以看出，这是一个很难刻画的概念。

比如自 C++98 起，Goo 就满足 POD 类型的要求。尽管它用到了方法、静态成员这些 C++ 中才有的东西。

```cpp
struct Goo
{
    public:
        int x;
        float y;

        void f() const;

        static int i;
};
```


自 C++11 修改过定义后，下面的 Foo 也算是 POD 类型了。尽管它用到了多继承，甚至还有非 Trivial 的静态成员：

```cpp
struct Hoo
{
    static std::string s;
};

struct Foo : public Goo, public Hoo
{
};
```


这都使得 POD 这一叫法充满着矛盾。

所以 C++20 把 std::is_pod 的特征萃取给弃用了。转而建议使用 std::is_trivial && std::is_standard_layout 去代替。

总结：

希望读者在读完此文后，能更深入地理解文中所提到的具名要求；能对 C++ 底层模板库的优化技术能有更进一步的认识；能知道对于六大特殊成员函数，编译器默认生成的和自己手动定义的，尽管语义完全相同，但是前者要更利于优化。

希望读者了解了这些知识点后，能写出性能更好的程序！