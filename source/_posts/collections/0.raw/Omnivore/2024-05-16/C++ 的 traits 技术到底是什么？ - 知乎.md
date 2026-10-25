---
title: C++ 的 traits 技术到底是什么？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-05-16/C-的-traits-技术到底是什么-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: 7952795c-3428-49c8-8c5d-6114fd428fae
---

# C++ 的 traits 技术到底是什么？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/c-traits-18f805c844e)
[Read Original](https://www.zhihu.com/question/651733151/answer/3455360640)



关注者

**57**

被浏览

**8,182**

南山烟雨珠江潮也关注了该问题![南山烟雨珠江潮](https://proxy-prod.omnivore-image-cache.app/0x0,spC-eIxEx3V4CuNtN2bpIfjf1pA4H647IcJN9paj6D8A/https://picx.zhimg.com/v2-077465bf7c056f66150270bd3b6391b0_l.jpg?source=c8b7c179)

创建时间：2024-04-05 05:50:36

最后编辑：2024-04-05 05:50:36

[![星河灿烂梦中寻](https://proxy-prod.omnivore-image-cache.app/0x0,semGxH4cN1UEf4ReJjnTaVSHuNKzntjHaZeP8buTs0fo/https://picx.zhimg.com/v2-8a34fae849c42e8bc254e2b34c580262_l.jpg?source=2c26e567)](https://www.zhihu.com/people/zhong-zhong-s)

[星河灿烂梦中寻](https://www.zhihu.com/people/zhong-zhong-s)

[​](https://www.zhihu.com/question/48510028)

香港科技大学 电信学硕士

​ 关注

65 人赞同了该回答

[发布于 2024-04-05 17:12](https://www.zhihu.com/question/651733151/answer/3455360640)・IP 属地广东

这可得好好说道说道了，我来详细地解释一下 C++ 中的 traits 技术，以帮助大家更好地理解这货的工作原理、应用场景以及如何在实践中使用它。

## 什么是 traits？

**Traits** 是一种编程技术，特别适用于 C++ 这样的泛型编程语言。它的核心思想是在编译时收集和封装关于特定类型的各种属性或行为信息，这些信息对于编写泛型代码至关重要，但通常不会直接体现在类型本身的声明中。

## 为什么需要 traits？

在编写泛型代码时（比如使用模板），经常会遇到这样的情况：

* 需要根据类型的不同特性（如是否为指针、是否支持某种运算符、是否有特定的成员函数等）来选择不同的实现路径。
* 想要提供一套通用的接口，使其能够适应不同类型的特殊要求，如容器类可能需要知道其元素类型的大小以便高效分配内存。
* 希望在编译阶段就能够发现某些类型不满足特定条件（如不支持某个操作）导致的错误，而不是等到运行时出错。

Traits 技术就是为了满足这些需求而诞生的，它提供了一种机制，使得编译器可以根据类型特质而非类型本身来做出编译时决策，生成最合适的代码。

## traits 的实现方式

### 模板类（traits class）

最常见的方式是定义一个模板类，这个类通常是一个空壳，仅用于存放与模板参数类型相关的静态成员（如类型别名、枚举常量、静态函数等）。当指定具体的类型参数后，模板类会提供对该类型相关信息的访问。比方说，创建一个 traits 类来判断一个类型是否支持赋值操作：

```cpp
template <typename T>
struct IsAssignable {
  static constexpr bool value = /* ... 实现判断逻辑 ... */;
};

// 使用示例：
bool supports_assignment = IsAssignable<int>::value;

```

### 模板别名（type alias template）

C++11 引入了模板别名，使得 traits 的定义变得更加简洁。模板别名可以直接表示某种类型属性，而不必借助模板类的静态成员。例如，定义一个模板别名来获取某个类型的引用移除版本：

```cpp
template <typename T>
using RemoveReference = typename std::remove_reference<T>::type;

// 使用示例：
using NonRefInt = RemoveReference<int&>;  // NonRefInt 等同于 int

```

## C++ 标准库中的 traits

C++ 标准库 `<type_traits>` 头文件包含了大量预定义的 traits，涵盖了几乎所有的基本类型检查和转换需求。

这些 traits 可以分为几大类：

* **类型分类**：如 `std::is_integral<>`、`std::is_floating_point<>`、`std::is_pointer<>` 等，用于判断类型属于哪种类别。
* **属性检查**：如 `std::is_const<>`、`std::is_volatile<>`、`std::is_trivially_copyable<>` 等，检查类型是否具有特定属性。
* **类型转换**：如 `std::remove_const<>`、`std::remove_volatile<>`、`std::add_lvalue_reference<>` 等，提供类型修饰符的添加或去除。
* **算术和位操作**：如 `std::make_signed<>`、`std::make_unsigned<>`、`std::integral_constant<>` 等，用于进行类型相关的算术和位操作。
* **其他实用 traits**：如 `std::decay<>`、`std::underlying_type<>`、`std::result_of<>` 等，提供特定场景下的类型处理。

## traits 的应用场景

### 模板元编程

这也是我用的最多的场景。在模板元编程中，traits 被用来构建复杂的编译时逻辑，如计算数组大小、推导表达式的值等。例如，可以使用 traits 和 `std::enable_if<>` 结合，根据类型特性启用或禁用某个模板实例：

```arduino
template <typename T,
          typename std::enable_if_t<std::is_arithmetic<T>::value, int> = 0>
void process(T value) {
  // 对数值类型进行处理
}

template <typename T,
          typename std::enable_if_t<!std::is_arithmetic<T>::value, int> = 0>
void process(T value) {
  // 对非数值类型进行处理
}

```

### 库设计与STL兼容性

在设计自己的容器、算法或其他泛型组件时，traits 有助于确保与 STL 的兼容性。例如，为了支持不同类型的迭代器，可以使用 traits 查询迭代器的类别（如输入迭代器、随机访问迭代器），以便在算法内部正确使用相应迭代器的功能。

### 策略模式与编译时配置

Traits 可以与设计模式（如策略模式）结合，通过类型特质来配置对象的行为。例如，可以定义一组 traits 来描述某个算法的不同策略选项，然后在编译时通过模板参数选择合适的策略实现。

---

总之呢，C++ 中的 traits 技术是一种强大的编译时工具，它允许我们在编写泛型代码时根据类型的不同特性做出适应性的决策。通过使用标准库提供的 traits 或自定义 traits，我们是可以编写出更灵活、更具适应性且易于维护的代码，同时充分利用编译时计算的优势，提高程序的效率和类型安全性。尽管 traits 可能涉及一些相对复杂的模板技术，但对于理解和掌握泛型编程来说，它是不可或缺的一部分。

祝题主学习C++之旅愉快！

Over

[发布于 2024-04-05 17:12](https://www.zhihu.com/question/651733151/answer/3455360640)・IP 属地广东

真诚赞赏，手留余香

赞赏

还没有人赞赏，快来当第一个赞赏的人吧！

​赞同 65​​添加评论​收藏​喜欢

​

收起​

[![草原上唱山歌](https://proxy-prod.omnivore-image-cache.app/0x0,sYPOst_vEAudSx_wTU8sqAW1P6hYvsnvtGO6ogPfY6n0/https://picx.zhimg.com/v2-abed1a8c04700ba7d72b45195223e0ff_l.jpg?source=1def8aca)](https://www.zhihu.com/people/liqingming)

[草原上唱山歌](https://www.zhihu.com/people/liqingming)

思考、实践、思考

traits，又被叫做特性萃取技术，说得简单点就是提取“被传进的对象”对应的返回类型，**让同一个接口实现对应的功能**。

因为STL的算法和容器是分离的，两者通过迭代器链接。算法的实现并不知道自己被传进来什么。萃取器相当于在接口和实现之间加一层**封装**，来隐藏一些细节并协助调用合适的方法，这需要一些技巧（例如，偏特化）。

最后附带一个小小的例子，应该能更好地理解 特性萃取。

 下面大部分来源于《STL源码剖析》，看原书能了解更多细节。

## Traits编程技法

 让我们一点点抛出问题，然后一点点深入。

 1\. 首先，在算法中运用迭代器时，很可能会用到**其相应型别**（迭代器所指之物的型别）。假设算法中有必要声明一个变量，以“迭代器所指对象的型别”为型别，该**怎么办呢？**

 解决方法是：利用function template的参数推导机制。

template <class I, class T>

void func\_impl(I iter, T t) {

 T tmp; // 这里就是迭代器所指物的类型新建的对象

 // ... 功能实现

}

template <class I>

inline

void func(I iter) {

 func\_impl(iter, \*iter); // 传入iter和iter所指的值，class自动推导

}

int main() {

 int i;

 func(&i);

}

这里已经可以看出**封装**的意思了，没有一层impl的封装的话，每次你都要显式地说明迭代器指向对象型别，才能新建tmp变量。加一层封装显得清爽很多。

 迭代器相应型别**不只是**“迭代器所指对象的型别”**一种**而已。根据经验，最常用的相应型别有五种，然而**并非**任何情况下任何一种都可以利用上述的template参数推导机制来取得。

 函数的“template参数推导机制”推导的只是参数，无法推导函数的返回值类型。万一需要推导函数的传回值，就无能为力了。

 2\. 声明内嵌型别似乎是个好主意，这样我们就可以直接获取。

template <class T>

struct MyIter {

 typedef T value\_type; // 内嵌型别声明

 // ...

};

template <class I>

typename I::value\_type

func(I ite) {

 return \*ite;

}

// ...

MyIter<int> ite(new int(8));

cout << func(ite);

看起来不错，但是并不是所有迭代器都是class type，**原生指针就不行！**如果不是class type，就无法为它定义内嵌型别。

 这时候就需要 **偏特化** 出现。

 3\. 偏特化就是在特化的基础上再加一点限制，但它还是特化的template。

1 template <class I>

 2 struct iterator\_traits {

 3 typedef typename I::value\_type value\_type;

 4 };

 5 

 6 template <class I>

 7 struct iterator\_traits<T\*> {

 8 typedef T value\_type;

 9 };

10 

11 template <class I>12 typename iterator\_traits<I>::value\_type

13 func(I ite) {

14 return \*ite;

15 }

func在调用 I 的时候，首先把 I 传到萃取器中，然后萃取器就匹配最适合的 value\_type。（萃取器会先匹配最特别的版本）这样当你传进一个原生指针的时候，首先匹配的是带<T\*>的偏特化版本，这样 value\_type 就是 T，而不是没有事先声明的 I::value\_type。这样返回值就可以使用 typename iterator\_traits<I>::value\_type 来知道返回类型。

 下面附上《STL源码剖析》的图片：

![](https://proxy-prod.omnivore-image-cache.app/526x0,seLcS8_D5kJy_mySAFxpSSDBcurVh4O57OS0ScJSP1Iw/https://picx.zhimg.com/50/v2-acf19b2a68232b7df814115b5811ec93_720w.jpg?source=1def8aca)

## 让traits干更多东西

---

 迭代器有常见有五种类型: value\_type, difference\_type, reference\_type, pointer\_type都比较容易在 traits 和 相应偏特化中提取。但是，iterator\_category一般也有5个，这个相应型别会引发较大规模的写代码工程。

 例如，我们实现了 func\_II, func\_BI, func\_RAI 分别代表迭代器类型是Input Iterator，Bidirectional Iterator和Random Access Iterator的对应实现。

 现在，当客端调用func()的时候，我们可能需要做一个判断：

template<class Iterator>

void func(Iterator& i) {

 if (is\_random\_access\_iterator(i))

 func\_RAI(i);

 if (is\_bidirectional\_iterator(i))

 func\_BI(i);

 else

 func\_II(i);

}

但这样在执行时期才决定使用哪一个版本，会**影响程序效率**。最好能够在编译期就选择正确的版本。

**重载**这个函数机制可以达成这个目标。

struct input\_iterator\_tag {};

struct output\_iterator\_tag {};

struct forward\_iterator\_tag : public input\_iterator\_tag {};

// ...

// 继承的好处就是，当函数需要用 input\_iterator\_tag 的时候

// 假设你传进一个forward\_iterator\_tag，它会沿继承向上找，知道符合条件

声明了一些列 tag 之后，我们就可以重载 func函数： func(tag)。

 到这里，各个型别的具体重载实现已经写好，但是需要一个统一的接口，这时候 traits 就可以出场了。

template<class Iterator>

inline void func(Iterator& i)

{

 typedef typename Iterator\_traits<Iterator>::iterator\_category category;

 \_\_func(i, category()); // 各型别的重载

}

## 简单实例代码 

 所以说，traits一方面，在面对不同的输入类时，能找到合适的返回型别；另一方面，当型别对应有不同的实现函数的时候，能起到一个提取型别然后分流的作用。

 先假设我们有一个 func 函数，可以接受 自定义的类 或者 原始的指针 作为参数，并自动输出使用了什么tag。

 首先根据 traits（由本身或偏特化版本实现） ，它会提取 u 的返回型别，然后调用对应的构造函数 return\_type()， 来当作各个重载版本 \_\_func 的重载标志区分不同的实际函数。

![](https://proxy-prod.omnivore-image-cache.app/418x0,sPWKCHbkDmOLo5_MQN7OXalp_-gP0KsNLhL-0rM2wl5o/https://pica.zhimg.com/50/v2-25eb7ad6e7b1abb51ca0b50c47449c90_720w.jpg?source=1def8aca)

首先我们看看接口代码的编写

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type // 萃取器取得对应型别

func(unknown\_class u) {

 typedef typename unknown\_class\_traits<unknown\_class>::return\_type return\_type;

 return \_\_func(u, return\_type()); // 需要调用构造函数当tag

}

先 return\_type 的构造函数

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

return\_type(unknown\_class) {

 typedef typename unknown\_class\_traits<unknown\_class>::return\_type RT;

 return RT();

}

然后是实现设定的 tag ，用来模仿前面说的 II，RAI等

```basic
1 struct A {};
2 struct B : A{};
```

然后是 traits 隆重登场，有两个偏特化版本。

/\*特性萃取器\*/

template <class unknown\_class>

struct unknown\_class\_traits {

 typedef typename unknown\_class::return\_type return\_type;

};

/\*特性萃取器 —— 针对原生指针\*/

template <class T>

struct unknown\_class\_traits<T\*> {

 typedef T return\_type;

};

/\*特性萃取其 —— 针对指向常数\*/

template <class T>

struct unknown\_class\_traits<const T\*> {

 typedef const T return\_type;

};

* 突然忘记了交代 unknown\_class 的结构，自定义的类，必须要 typedef。

```basic
1 template <class AorB>
2 struct unknown_class {
3     typedef AorB return_type;
4 };
```

最后是func各个重载版本。

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

\_\_func(unknown\_class, A) {

 cout << "use A flag" << endl;

 return A();

}

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

\_\_func(unknown\_class, B) {

 cout << "use B flag" << endl;

 return B();

}

template <class unknown\_class, class T>

T

\_\_func(unknown\_class, T) {

 cout << "use origin ptr" << endl;

 return T();

}

有了这些我们就可以测试了

int main() {

 unknown\_class<B> b;

 unknown\_class<A> a;

 //unknown\_class<int> i;

 int value = 1;

 int \*p = &value;

 A v1 = func(a);

 B v2 = func(b);

 int v3 = func(p);

 char ch = getchar();

}

可以看到，对于用自定义类传入同一个接口，它会自动使用对应的函数，而且返回值也合适。对原始指针也适用，完美！

![](https://proxy-prod.omnivore-image-cache.app/202x0,sehCV_ZSc8N_KyxM4ZI_a0fs9YOyHqwYjxAFA8ZKc9hA/https://picx.zhimg.com/50/v2-18333ae782b5f5ca8ad7f947889fbd11_720w.jpg?source=1def8aca)

下面是完整代码：

#include <iostream>

using namespace std;

/\*先定义一些tag\*/

struct A {};

struct B : A{}; // 继承的好处就是，当函数需要参数为A，

 // 而你传入的参数为B的时候，可以往上一直找到适合的对象

/\*假设有一个未知类\*/

template <class AorB>

struct unknown\_class {

 typedef AorB return\_type;

};

/\*特性萃取器\*/

template <class unknown\_class>

struct unknown\_class\_traits {

 typedef typename unknown\_class::return\_type return\_type;

};

/\*特性萃取器 —— 针对原生指针\*/

template <class T>

struct unknown\_class\_traits<T\*> {

 typedef T return\_type;

};

/\*特性萃取其 —— 针对指向常数\*/

template <class T>

struct unknown\_class\_traits<const T\*> {

 typedef const T return\_type;

};

/\*决定使用哪一个类型\*/

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

return\_type(unknown\_class) {

 typedef typename unknown\_class\_traits<unknown\_class>::return\_type RT;

 return RT();

}

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

\_\_func(unknown\_class, A) {

 cout << "use A flag" << endl;

 return A();

}

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

\_\_func(unknown\_class, B) {

 cout << "use B flag" << endl;

 return B();

}

template <class unknown\_class, class T>

T

\_\_func(unknown\_class, T) {

 cout << "use origin ptr" << endl;

 return T();

}

template <class unknown\_class>

inline typename unknown\_class\_traits<unknown\_class>::return\_type

func(unknown\_class u) {

 typedef typename unknown\_class\_traits<unknown\_class>::return\_type return\_type;

 return \_\_func(u, return\_type());

}

int main() {

 unknown\_class<B> b;

 unknown\_class<A> a;

 //unknown\_class<int> i;

 int value = 1;

 int \*p = &value;

 A v1 = func(a);

 B v2 = func(b);

 int v3 = func(p);

 char ch = getchar();

}

展开阅读全文​

​赞同 26​​1 条评论​收藏​喜欢

​

[![关于linux](https://proxy-prod.omnivore-image-cache.app/0x0,s6HBFmGcY8weZaT9Qa3lc3xCv87m_mw2DcYSu8TvxeZA/https://picx.zhimg.com/v2-0fee65993fc57d05feee123474c13310_l.jpg?source=1def8aca)](https://www.zhihu.com/people/yi-qi-wu-7)

[关于linux](https://www.zhihu.com/people/yi-qi-wu-7)

c/c++Linux服务器高级架构，音视频流媒体开发技术分享

C++的traits技术是一种元编程技术，用于在编译时获取类型相关的信息。它通过特定的模板结构和特化方式，可以根据类型的属性来进行不同的编译时决策。

Traits主要用于实现类型特征萃取（type traits），即从已知类型中提取或推断出与该类型相关的属性和行为。例如，可以使用traits来判断一个类型是否具有某个成员函数、是否是可调用对象、是否是指针等等。

通过使用traits技术，我们可以在编译期间根据类型属性做出决策，并生成相应的代码或执行相应的操作。这种方式使得代码更加灵活和可重用，同时减少了运行时开销。

标准库中已经定义了许多常用的traits，如std::is\_integral、std::is\_floating\_point等。

[发布于 2024-05-10 19:49](https://www.zhihu.com/question/651733151/answer/3494087187)

​赞同​​添加评论​收藏​喜欢

​

