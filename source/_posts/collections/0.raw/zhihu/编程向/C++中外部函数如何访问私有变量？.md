---
title: C++中外部函数如何访问私有变量？
date: "2026-04-15 00:00:00"
updated: "2026-04-15 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/C-中外部函数如何访问私有变量/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/521898260/answer/2399058597
---


不请自答！

### 正常做法

如果类（私有变量所在的类）的代码可以修改，做法是添加 getter/setter 或者添加友元声明。

如果类的代码不可以修改，GotW #76: Uses and Abuses of Access Rights 这里提到了几种方法。这几种方法中，除了最后一种，其他方法都是非标准的。而最后一种方法的前提是，私有变量所在的这个类原先定义有成员函数模板，然后通过特化这个函数模板而获得对私有变量的访问权（成员函数模板特化后还是类的成员，自然有对私有成员的访问权），具体例子如下。

```cpp
class Bank {
    int money = 999'999'999;
public:
    int getMoney() {
        return money;
    }

    templatetypename T> void f(T& t) {} // exploit this to steal money
};

class Thief;
template<> void Bank::fThief>(Thief&);

class Thief {
public:
    int money = 0;
    void steal(Bank& bank) {
        bank.f(*this);
    }
};

template<>
void Bank::fThief>(Thief& thief) {
    thief.money = money;
    money = 0;
}

int main() {
    Bank bank;
    Thief thief;
    cout  bank.getMoney()  ' '  thief.money  endl; // 999999999 0
    thief.steal(bank);
    cout  bank.getMoney()  ' '  thief.money  endl; // 0 999999999
    return 0;
}  
```


所以，如果类 `Bank` 原先没有那个成员函数模板 `templatevoidf(T& t){}`，这种方法也就行不通了，等于说，还是要修改类的代码，去添加一个成员函数模板，那倒不如正规地添加 getter/setter 了。 

### 模板黑魔法做法

所以真的没有在不能修改类的代码的限制下又符合标准的方法来访问私有成员吗？嗯，还真有。

@WhoTFAmI

 和 @法号桑菜

 都提到用模板的黑魔法，这类方法的核心是，<strong>模板显式实例化会忽略成员访问说明符，不会执行访问控制检查</strong>。

> 6. The usual access checking rules do not apply to names in a declaration of an explicit instantiation or explicit specialization, with the exception of names appearing in a function body, default argument, base-clause, member-specification, enumerator-list, or static data member or variable template initializer. [Note: In particular, the template arguments and names used in the function declarator (including parameter types, return types and exception specifications) may be private types or objects that would normally not be accessible.] -- C++ Draft International Standard (isocpp.org), §13.9 [temp.spec]

#### 显式实例化函数模板

// 定义一个函数模板 steal，模板形参 p 是指向成员的指针，指向的是 Bank_t 类类型中 Money_t 类型的成员
templatetypename Bank_t, typename Money_t, Money_t Bank_t::* p> 

```text
Money_t& steal(Bank_t& bank) {
    return bank.*p;
}

// 显式实例化 steal，[Bank_t = Bank, Money_t = int, p = &Bank::money]，Bank 类的定义同最上面例子
// 模板显式实例化语句中不会执行访问控制检查，所以这里使用 &Bank::money 并不会报错
template int& stealBank, int, &Bank::money>(Bank&);
```


用 godbolt 查一下上面实例化得到的汇编（x86-64 gcc 11.2，-O1）：

```x86asm
int& steal(Bank&):
        mov     rax, rdi
        ret
```


就一句 `move` 指令，传送寄存器 `rdi` 的值到寄存器 `rax`。根据调用约定，`rdi` 保存的是参数，这里是一个 `Bank` 类的对象的起始地址，而返回值记录在 `rax`中，这里要返回的是该对象中 `money` 成员的起始地址，而 `money` 刚好是类 `Bank` 的第一个成员，偏移刚好为 0，所以直接复制 `rdi` 到 `rax` 就行了。可以在成员 `money` 之前添加其他字段，再看看得到的汇编有何不同，就能更加清楚了。

总而言之，上面的 `steal` 函数能帮我们正确地算出一个 `Bank` 类的对象的 `money` 成员的地址，就实现了对私有的 `money` 成员的访问。但可惜的是，我们没办法调用显式实例化函数模板得到的函数！模板显式实例化得到的实例是无法使用的，但如果显式实例化的动作有副作用呢？函数模板相对比较局限，所以下面我们使用类模板来说明。

#### 有副作用的显式实例化

#include 

templatetypename T>

```cpp
struct A {
    T n = 123;
    A() {
        printf("A's Ctor\n");
    }
    inline static A obj; // inline static member，C++17 起支持
};

// 显式实例化类模板 A，编译器会生成模板类 A，同时一个副作用是 printf("A's Ctor\n");
// 因为在类 A 中，定义（初始化）了一个静态成员 obj（其类型也为 A），构造函数被调用
template class Aint>;

int main() {
}
```


上面程序会输出 `A's Ctor`。同样的，用 godbolt 查一下生成的汇编代码（x86-64 gcc 11.2，-std=c++17 -O1）：

```x86asm
.LC0:
        .string "A's Ctor"
A::A() [base object constructor]:
        sub     rsp, 8
        # rdi 为当前对象的地址，而 n 是第一个字段，所以 rdi 也是 n 的地址
        mov     DWORD PTR [rdi], 123
        # 下面两条指令是调用 puts，因为 printf 调用只有一个实参时，会被优化为调用 puts
        mov     edi, OFFSET FLAT:.LC0
        call    puts
        add     rsp, 8
        ret
```


#### Thief

所以，进亿步：

templatetypename Class, typename Member>

```text
struct Offset {
    using type = Member Class::*;
    inline static type value;
};
```


templatetypename Bank_t, typename Money_t, typename OffsetBank_t, Money_t>::type offset>

```cpp
struct Thief {
    Thief() {
        OffsetBank_t, Money_t>::value = offset;
    }
    inline static Thief thief;
};

// 显式实例化类模板 Thief（显式实例化不会执行访问控制检查，所以这里 &Bank::money 不会报错）
// 编译器会生成模板类 Thief
// 同时一个副作用是 Offset::value = &Bank::money; 
//          将成员 money 的偏移记录到类 Offset 的静态成员 value 中
template class ThiefBank, int, &Bank::money>;

// 该函数模板在后面代码中被实例化为
// int& steal(Bank& bank) { reteurn bank.*Offset::value; }
// “代入” Offset::value = &Bank::money 得：
// int& steal(Bank& bank) { reteurn bank.*&Bank::money; } templatetypename Bank_t, typename Money_t>
Money_t& steal(Bank_t& bank) {
    return bank.*OffsetBank_t, Money_t>::value;
}

int main() {
    Bank bank;
    cout  bank.getMoney()  endl; // 999999999
    stealBank, int>(bank) -= 123456789;
    cout  bank.getMoney()  endl; // 876543210
    return 0;
}
```


（上面代码魔改自：[Accessing Private Data](https://link.zhihu.com/?target=https%3A//gist.github.com/dabrahams/1528856)）

#### 改进 Thief，基于另外一种形式的副作用

templatetypename Bank, typename Money, Money Bank::* p>

```cpp
class Thief {
public:
    friend Money& steal(Bank& bank) {
        return bank.*p;
    }
};

// 显式实例化类模板 Thief，编译器生成模板类 Thief
// https://cppinsights.io/s/0f7828b7
template class ThiefBank, int, &Bank::money>;

int& steal(Bank&);

int main() {
    Bank bank;
    cout  bank.getMoney()  endl; // 999999999
    steal(bank) -= 123456789;
    cout  bank.getMoney()  endl; // 876543210
}
```


（上面代码魔改自 @WhoTFAmI

 的回答）

核心原理还是模板显式实例化时不会执行访问控制检查。同样遇到的限制是模板显式实例化得到的实例是无法使用的，但这里的解决方法是通过友元函数声明来生成全局函数。所以这里的副作用是全局函数的生成。

为何友元函数声明会生成全局函数，详见 Friend declaration 下关于第二种语法（`friend function-definition`）的具体描述。

同样，还是用 godbolt 查一下生成的汇编代码，但这次不要开 -O1 优化，因为友元声明定义的全局函数默认是 inline 的，开了会被内联掉（x86-64 gcc 11.2，-O0）

```x86asm
steal(Bank&):
        push    rbp
        mov     rbp, rsp
        mov     QWORD PTR [rbp-8], rdi #
        mov     edx, 0
        mov     rax, QWORD PTR [rbp-8] #
        pop     rbp
        ret
```


可见，显式实例化类模板 `Thief` 确实生成了一个全局函数 `steal`。不过因为不能开优化，生成的汇编代码不够简洁，但从标了 `#` 的两条指令来看，不难发现其实就是 `mov rax, rdi`，具体含义前文也有分析过。 

### 结语

没有结语

[发布于 2022-03-20 23:48](//www.zhihu.com/question/521898260/answer/2399058597)

​​151 ​12 ​分享

​​

收起​
