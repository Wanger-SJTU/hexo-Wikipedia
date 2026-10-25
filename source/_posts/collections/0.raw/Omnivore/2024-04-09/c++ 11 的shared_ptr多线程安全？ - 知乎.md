---
title: c++ 11 的sharedptr多线程安全？ - 知乎
date: "2026-04-11 21:40:28"
updated: "2026-04-11 21:40:28"
layout: post
permalink: /collections/0.raw/Omnivore/2024-04-09/c-11-的shared_ptr多线程安全-知乎/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

---
id: ee7c123e-d985-4e07-b574-6a02130c79ea
---

# c++ 11 的shared_ptr多线程安全？ - 知乎
#Omnivore

[Read on Omnivore](https://omnivore.app/me/https-www-zhihu-com-answer-2158966805-18ec3639634)
[Read Original](https://www.zhihu.com/question/56836057/answer/2158966805)



最近开了一个贴子说关于 lambda在捕获std::string在不同平台下是不是安全的？点击这里 c11的lambda 捕获的疑问？ 由此应发对sh…显示全部 ​

关注者

**233**

被浏览

**394,210**

[![果冻虾仁](https://proxy-prod.omnivore-image-cache.app/0x0,s4d4mCMaI6hCqTd-QhYjni1Bt7urRNLyyzHrbn-LjS6Y/https://picx.zhimg.com/0e8fe57617db5ac2853988be43d990cd_l.jpg?source=2c26e567)](https://www.zhihu.com/people/guodongxiaren)

[果冻虾仁](https://www.zhihu.com/people/guodongxiaren)

百度/腾讯/C++程序员

​ 关注

194 人赞同了该回答

​

目录

收起

线程安全的定义

你认为shared\_ptr有哪些线程安全隐患？

引用计数的探讨

修改指向时是否是线程安全

情况一：多线程代码操作的是同一个shared\_ptr的对象

情况二：多线程代码操作的不是同一个shared\_ptr的对象

所管理数据的线程安全性

自C++11起，shared\_ptr从boost转正进入标准库已有10年了。然而当C++程序员们在谈论shared\_ptr是不是线程安全的的时候，还时常存在分歧。确实关于shared\_ptr 的线程安全性不能直接了当地用安全或不安全来简单回答的，下面我来探讨一下。

## 线程安全的定义

先回顾一下线程安全这一概念的定义，以下摘录自维基百科：

> **Thread safety** is a [computer programming](https://link.zhihu.com/?target=https%3A//en.wikipedia.org/wiki/Computer%5Fprogramming) concept applicable to [multi-threaded](https://link.zhihu.com/?target=https%3A//en.wikipedia.org/wiki/Thread%5F%28computing%29) code. Thread-safe code only manipulates shared data structures in a manner that ensures that all threads behave properly and fulfill their design specifications without unintended interaction. There are various strategies for making thread-safe data structures.

主要表达的就是多线程操作一个共享数据的时候，能够保证所有线程的行为是符合预期的。

一般而言线程不安全的行为大多数出现了[data race](https://www.zhihu.com/search?q=data%20race&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)导致的，比如你调用了某个系统函数，而这个函数内部其实用到了[静态变量](https://www.zhihu.com/search?q=%E9%9D%99%E6%80%81%E5%8F%98%E9%87%8F&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)，那么多线程执行该函数的时候，就会触发data race，造成结果不符合预期，严重的时候，甚至会导致core dump。

当然这里只是一个例子，线程不安全还可能由其他原因导致。

## 你认为shared\_ptr有哪些线程安全隐患？

shared\_ptr 可能的线程安全隐患大概有如下几种，一是引用计数的加减操作是否线程安全，二是shared\_ptr修改指向时，是否线程安全。另外shared\_ptr不是一个类，而是一个类模板，所以对于shared\_ptr<T>的T的并发操作的安全性，也会被纳入讨论范围。因此造成了探讨其线程安全性问题上的复杂性。

## 引用计数的探讨

岔开个话题，前段时间我面试过几个校招生，每当我问道是否了解shared\_ptr的时候，对方总能巴拉巴拉说出一大堆东西。会讲到[引用计数](https://www.zhihu.com/search?q=%E5%BC%95%E7%94%A8%E8%AE%A1%E6%95%B0&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)、weak\_ptr解决循环引用、自定义删除器的用法等等等等。感觉这些知识都是很八股的东西。我会立马打断去问一句：引用计数具体是怎么实现的？怎么做到多个shared\_ptr之间的计数能共享，同步更新的呢？比如：

```smali
shared_ptr<A> sp1 = make_shared<A>();
...
shared_ptr<A> sp2 = sp1;
...
shared_ptr<A> sp3 = sp1;

```

当sp3出现的时候，sp2怎么感知到计数又加1了的呢？这时候很多学生都会卡住，犯了难。有的同学确实没有了解过的，就盲猜了一个，答道：用static变量存储的引用计数。

答案当然是否定的，因为如果是static变量的话，那么：

```xml
shared_ptr<A> sp1 = make_shared<A>();
shared_ptr<A> sp2 = make_shared<A>();

```

这两个不相干的sp1和sp2，只要模板参数T是同一个类型，就会共享同一个计数…

可以看下cppreference的描述： [std::shared\_ptr - cppreference.com](https://link.zhihu.com/?target=https%3A//en.cppreference.com/w/cpp/memory/shared%5Fptr%23Implementation%5Fnotes) 

shared\_ptr中除了有一个指针，指向所管理数据的地址。还有一个指针执行一个控制块的地址，里面存放了所管理数据的数量（常说的引用计数）、[weak\_ptr](https://www.zhihu.com/search?q=weak%5Fptr&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)的数量、删除器、分配器等。

也就是说对于引用计数这一变量的存储，是在堆上的，多个shared\_ptr的对象都指向同一个堆地址。在多线程环境下，管理同一个数据的shared\_ptr在进行计数的增加或减少的时候是线程安全的吗？

答案是肯定的，这一操作是[原子操作](https://www.zhihu.com/search?q=%E5%8E%9F%E5%AD%90%E6%93%8D%E4%BD%9C&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)。

> To satisfy thread safety requirements, the reference counters are typically incremented using an equivalent of [std::atomic::fetch\_add](https://link.zhihu.com/?target=https%3A//en.cppreference.com/w/cpp/atomic/atomic/fetch%5Fadd) with [std::memory\_order\_relaxed](https://link.zhihu.com/?target=https%3A//en.cppreference.com/w/cpp/atomic/memory%5Forder) (decrementing requires stronger ordering to safely destroy the control block)

## 修改指向时是否是线程安全

这个要分情况来讨论：

### 情况一：多线程代码操作的是同一个shared\_ptr的对象

比如std::thread的回调函数，是一个lambda表达式，其中引用捕获了一个shared\_ptr对象

```nimrod
    std::thread td([&sp1] () {....});

```

又或者通过回调函数的参数传入的shared\_ptr对象，参数类型是指针或引用:

指针类型

```cpp
void fn(shared_ptr<A>* sp) {
    ...
}
...
    std::thread td(fn, &sp1);

```

引用类型

```cpp
void fn(shared_ptr<A>& sp) {
    ...
}
...
    std::thread td(fn, std::ref(sp1));

```

这时候确实是不是线程安全的。

当你在多线程回调中修改shared\_ptr指向的时候。

```armasm
void fn(shared_ptr<A>& sp) {
    ...
    if (..) {
        sp = other_sp;
    } else if (...) {
        sp = other_sp2;
    }
}

```

shared\_ptr内数据指针要修改指向，sp原先指向的引用计数的值要减去1，other\_sp指向的引用计数值要加1。然而这几步操作加起来并不是一个原子操作，如果多少线程都在修改sp的指向的时候，那么有可能会出问题。比如在导致计数在操作减一的时候，其内部的指向，已经被其他线程修改过了。引用计数的异常会导致某个管理的对象被提前析构，后续在使用到该数据的时候触发core dump。

当然如果你没有修改指向的时候，是没有问题的。

### 情况二：多线程代码操作的不是同一个shared\_ptr的对象

这里指的是管理的数据是同一份，而shared\_ptr不是同一个对象。比如多线程回调的[lambda](https://www.zhihu.com/search?q=lambda&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)的是按值捕获的对象。

```nimrod
    std::thread td([sp1] () {....});

```

  
 或者参数传递的shared\_ptr是值传递，而非引用：

```cpp
void fn(shared_ptr<A> sp) {
    ...
}
...
    std::thread td(fn, sp1);

```

这时候每个线程内看到的sp，他们所管理的是同一份数据，用的是同一个引用计数。但是各自是不同的对象，当发生多线程中修改sp指向的操作的时候，是不会出现非预期的异常行为的。

也就是说，如下操作是安全的：

```armasm
void fn(shared_ptr<A> sp) {
    ...
    if (..) {
        sp = other_sp;
    } else if (...) {
        sp = other_sp2;
    }
}

```

## 所管理数据的线程安全性

尽管前面我们提到了如果是按值捕获（或传参）的[shared\_ptr对象](https://www.zhihu.com/search?q=shared%5Fptr%E5%AF%B9%E8%B1%A1&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)，那么是该对象是线程安全的。然而话虽如此，但却可能让人误入歧途。因为我们使用shared\_ptr更多的是操作其中的数据，对齐管理的数据进行读写。尽管在按值捕获的时候shared\_ptr是线程安全的，我们不需要对此施加额外的同步操作（比如加解锁），但是这并不意味着shared\_ptr所管理的对象是线程安全的！

请注意这是两回事。

如果shared\_ptr管理的数据是STL容器，那么多线程如果存在同时修改的情况，是极有可能触发core dump的。比如多个线程中对同一个vector进行push\_back，或者对同一个map进行了insert。甚至是对STL容器中并发的做clear操作，都有可能出发core dump，当然这里的线程不安全性，其实是其所指向数据的类型的线程不安全导致的，并非是shared\_ptr本身的线程安全性导致的。尽管如此，由于shared\_ptr使用上的特殊性，所以我们有时也要将其纳入到shared\_ptr相关的线程安全问题的讨论范围内。

这里简单提一下，除了STL容器的并发修改操作（这里指的是修改容器的结构，并不是修改容器中某个元素的值，后者是线程安全的，前者不是），protobuf的Message对象也是不能并发操作的，比如一个线程中修改Message对象（set、add、clear），另外一个线程也在修改，或者在将其序列化成字符串都会触发core dump。据我的工作经验，由于程序出现了非预期地并发修改容器对象或PB的Message对象的操作导致的core dump问题，在所有core dump事故原因中的占比是相当大的。

不管是STL容器或是PB的Message对象，如果无脑地加锁，当然会解决其潜在的core dump问题。但是效率并不一定高，关于STL容器在某些场景下可以规避掉该隐患，笔者曾经回答过一个相关的问题，有兴趣可以了解：

[](https://www.zhihu.com/question/29987589/answer/1483744520)

除上述回答中提到的一些观点之外呢，有时候调整程序的逻辑，或许能更为优雅的解决问题。

比如我曾经见过的一段代码，一次请求过程中要异步查询Redis的两个key，在异步的[回调函数](https://www.zhihu.com/search?q=%E5%9B%9E%E8%B0%83%E5%87%BD%E6%95%B0&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)中对查询到的value进行处理。，有一个处理逻辑是根据查到的value值，去判断是否满足一个条件，然后清空一个unordere\_map的变量（调用clear成员函数）。这两个回调函数中都有可能会触发这个clear操作。然而这个代码在测试中出现了core dump。原因就是这个clear可能同时触发，对同一个unordere\_map对象进行clear，是会出现这个问题的。

修改办法就是，新增两个bool类型的flag变量，初始为false，两个[异步回调函数](https://www.zhihu.com/search?q=%E5%BC%82%E6%AD%A5%E5%9B%9E%E8%B0%83%E5%87%BD%E6%95%B0&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)中判断满足原先的条件后，各自修改不同的flag为true。

在后续的串行操作中（异步回调结束后）判断这两个flag，有一个为true就进行[unordere\_map](https://www.zhihu.com/search?q=unordere%5Fmap&search%5Fsource=Entity&hybrid%5Fsearch%5Fsource=Entity&hybrid%5Fsearch%5Fextra=%7B%22sourceType%22%3A%22answer%22%2C%22sourceId%22%3A2158966805%7D)对象的clear。

这里扯的有点远了，已经不是shared\_ptr本身的讨论范围了，更多是讨论解决容器本身并发问题的办法。请注意你写的是C++代码，性能是很重要的，不要无脑加锁！

[编辑于 2022-02-27 15:41](https://www.zhihu.com/question/56836057/answer/2158966805)

​赞同 194​​9 条评论​收藏​喜欢收起​

[![sin1080](https://proxy-prod.omnivore-image-cache.app/0x0,ssXhnRiP0HBkGoS2B13w_80qlup68N-Qmg0fN387Yv9I/https://picx.zhimg.com/v2-470e1d3e9b7cac95666bd0d3eb113e77_l.jpg?source=1def8aca)](https://www.zhihu.com/people/sin1080)

[sin1080](https://www.zhihu.com/people/sin1080)

​ 关注

谢邀，继续上一话题，也就是说在多个线程上通过shared\_ptr分享一个对象，会不会因为shared\_ptr的并发导致被分享对象被并发析构、多次析构。关于之前的讨论可以参见题主给出的上一话题的链接，以及我的回答

[c11的lambda 捕获的疑问？](https://www.zhihu.com/question/56766210/answer/150466114)

下面的评论。

以下开始正文部分。

先谈标准：

C++ Standard 20.9.2.2 (4) 

For purposes of determining the presence of a data race, member functions shall access and modify only the shared\_ptr and weak\_ptr objects themselves and not objects they refer to. Changes in use\_count() do not reflect modifications that can introduce data races.

C++ Standard 20.9.2.2.2 (shared\_ptr destructor)

Effects:

— If \*this is empty or shares ownership with another shared\_ptr instance (use\_count() > 1), there are no side effects.

— Otherwise, if \*this owns an object p and a deleter d, d(p) is called.

— Otherwise, \*this owns a pointer p, and delete p is called.

\[ Note: Since the destruction of \*this decreases the number of instances that share ownership with \*this by one, after \*this has been destroyed all shared\_ptr instances that shared ownership with \*this will report a use\_count() that is one less than its previous value. —end note \]

 简而言之，shared\_ptr的析构函数需要在使其他分享同一对象的所有权的shared\_ptr实例的use\_count()汇报数字减1，而C++标准规定对use\_count()结果的变更不可以成为data race，于是析构函数不可以以一种产生data race的方式去修改use\_count()（及其底层对应的计数）。use\_count在这里面汇报的是“强引用个数”，即不包含weak\_ptr只计数shared\_ptr的引用计数，故而析构函数对这个引用计数的修改必须是线程安全的，否则产生data race即违反了C++标准。

而上一话题中提到的跨线程分享ownership的一组shared\_ptr的并发析构，也就是安全的了，因为标准保证了析构函数对“强引用计数”无data race，故而它会被安全地逐个减1，并最终在导致减到0的那个线程上析构被分享的对象。

再看一个实现：

```sqf
      void
      _M_release() noexcept
      {
        // Be race-detector-friendly.  For more info see bits/c++config.
        _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(&_M_use_count);
	if (__gnu_cxx::__exchange_and_add_dispatch(&_M_use_count, -1) == 1)
	  {
            _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_use_count);
	    _M_dispose();
	    // There must be a memory barrier between dispose() and destroy()
	    // to ensure that the effects of dispose() are observed in the
	    // thread that runs destroy().
	    // See http://gcc.gnu.org/ml/libstdc++/2005-11/msg00136.html
	    if (_Mutex_base<_Lp>::_S_need_barriers)
	      {
		__atomic_thread_fence (__ATOMIC_ACQ_REL);
	      }

            // Be race-detector-friendly.  For more info see bits/c++config.
            _GLIBCXX_SYNCHRONIZATION_HAPPENS_BEFORE(&_M_weak_count);
	    if (__gnu_cxx::__exchange_and_add_dispatch(&_M_weak_count,
						       -1) == 1)
              {
                _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_weak_count);
	        _M_destroy();
              }
	  }
      }
...
      _Atomic_word  _M_use_count;     // #shared
      _Atomic_word  _M_weak_count;    // #weak + (#shared != 0)

```

这段代码摘自GNU libstdc++的类\_Sp\_counted\_base，就是shared\_ptr背后的引用计数control block的实现。我们可以看到，在release的时候，首先原子地use\_count即强引用计数减1同时取回上一个值，如果上一个值是1那么原子减之后剩下0，dispose掉被引用的对象。之后的部分是处理weak\_ptr以及再weak\_ptr全部析构之后把control block也回收掉的逻辑，它们和被分享对象的析构无关，并且也还是原子的，所以即使release被并发调用，也只会出现执行顺序交错，不会出现memory corruption。整体上也就是安全的了。

结论：对同一个对象分享所有权的shared\_ptr在多个线程上的析构不需要外部加锁保护，C++标准以及标准的实现保证这一动作的线程安全性。

展开阅读全文​

​赞同 73​​24 条评论​收藏​喜欢

[![子猫](https://proxy-prod.omnivore-image-cache.app/0x0,sYPOst_vEAudSx_wTU8sqAW1P6hYvsnvtGO6ogPfY6n0/https://picx.zhimg.com/v2-abed1a8c04700ba7d72b45195223e0ff_l.jpg?source=1def8aca)](https://www.zhihu.com/people/zi-mao-26)

[子猫](https://www.zhihu.com/people/zi-mao-26)

​ 关注

shared\_ptr的线程安全性与int一样。举个例子

```kotlin
class A
{
private:
  shared_ptr<P> ptr; 
 //类似 int i;

 // 不安全
 //shared_ptr<P>& ptr; 
}

class B
{
private:
  shared_ptr<P> ptr;
  //类似 int i;

 // 不安全
 //shared_ptr<P>& ptr; 
}

A里的ptr与B里的ptr指向是同一个指针地址，那么你使用的时候压根不用管是不是线程安全，
直接用就是了
但是A和B里的ptr只能在同一个线程中使用，如果你要用，
那么复制一份到另一个线程，而不是直接引用。

举个例子
shared_ptr<P> ptr(new P());
//启动新线程
std::async([ptr](){ //传值,正确
	ptr->fun();
	//...
	});

std::async([&ptr](){ //传引用,错误
	ptr->fun();
	//...
	});

如果是在类成员函数中有异步或者跨线程调用，那么一般是这样做的
class A : public  enable_shared_from_this<A>
{
 void fun()
{
	//这样ptr就可以在另一个线程中安全使用了，因为A实例肯定有效，没有析构
	auto self(shared_from_this());
	//异步调用
	async([self, this](){
		ptr->call();
    		...
	};
}

private:
  shared_ptr<P> ptr; 
}
```

所以你只要传值，那么你不用管shared\_ptr是不是线程安全的。

非性能原因，代码写的还要关心shared\_ptr是不是线程安全的，说明代码本身就写的不合格

展开阅读全文​

​赞同 23​​1 条评论​收藏​喜欢

