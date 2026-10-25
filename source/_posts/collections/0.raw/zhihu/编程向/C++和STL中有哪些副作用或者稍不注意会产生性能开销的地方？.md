---
title: "C++和STL中有哪些副作用或者稍不注意会产生性能开销的地方？"
date: 2026-04-15
tags: [知乎]
source: https://www.zhihu.com/question/355171938/answer/2173582004
---

收录于 · 一鳞半爪

​目录

**先谈一谈开销，再谈一谈其他的容易踩坑的地方**

### **C++和STL中常被忽略的开销**

#### STL容器的clear的时间复杂度不是O(1)

可能很多人都不在意，在使用STL容器的时候，潜意识里面将clear()成员函数视为常量时间复杂度O(1)的。但是其实不然。我感觉可能是很多人都知道对于vector而言，clear()之后，修改了size()的结果，不影响capacity()的结果，因而得出clear()只是修改了某个标记，是常量时间复杂度的错误结论。

其实C++标准明确指出不管是序列容器（比如vector）还是关联容器（比如unordered_map)其clear()成员函数都是线性时间复杂度O(n)的。因为只要执行了clear()就需要对其存储的元素调用析构函数，这个析构操作显然是逐个析构的。因而时间复杂度是O(n)。

当然在实践中，也有个例。比如当vector存储基本数据类型或POD类型（比如基本数据类型构成的struct）的时候，由于其元素类型没有析构函数（也不需要析构函数），加之vector内部连续存储的特性，编译器的实现是可以在常量时间完成clear()的。

**Linear insize(destructions).
This may be optimized to*constant complexity*fortrivially-destructible types(such as scalar or PODs), where elements need not be destroyedhttp://www.cplusplus.com/reference/vector/vector/clear/

当然仅限于vector存储基本数据类型和POD类型的时候，编译器可能有此优化。如果vector存储的是其他类型的对象，或者是其他容器（比如list、map、unordered_map）都是没办法做这个优化的！

所以在工程实践中，我们要思考是否每次都需要及时的clear掉一个容器。比如在后台服务中，有些容器类型的变量在命中某些条件下要进行clear()，后续逻辑中判断容器是空的，就不在用之进行某些逻辑（比如遍历它，进行某种操作）。其实也可以用一个bool标记来存储后续是否需要遍历该容器，待到本次请求的响应返回给client之后，再来清理这个容器也不迟。

当然这种操作在容器的元素个数不多的时候是完全没有必要的**，会丧失一些可读性。不过这种思考还是需要有的。如果元素过多的时候，或许可能是性能优化的一个小点。

#### auto替代手写类型

这个其他答主也讲到了，比如在基于范围的循环中使用auto&，如下这个例子其出自**《Effictive Modern C++》**的条款5（那个答主可能也是参考的这个条款）。

`std::unordered_mapstd::string, int> m;
for (const std::pairstd::string, int>& p: m) {
  ... 
}
`

对于unordered_map而言，其中的元素类型是：

`std::pairconst std::string, int>
`

如上的遍历方法，就会产生一个临时对象，有拷贝的开销。

**

#### 减少隐性的重复操作

从map中查找value。我们一般怎么写呢？比如：

`// dict_data是一个unordered_map
// vec是一个vector
double sum = 0;
for (auto& key : vec) {
    if (dict_data.count(key)) {// 或dict_data.count(key) > 0
        sum += dict_data[key]; // 或 sum += dict_data.at(key);
    }
}
`

或者：

`for (auto& key : vec) {
    if (dict_data.find(key) != dict_data.end()) {
        sum += dict_data[key]; // 或 sum += dict_data.at(key);
    }
}
`

其实map或unordered_map的[] 或者at() 函数内部也会进行查找。不管这次查找的开销大或不大吧。既然我们已经查找过一次key是否存在了，那么就吧结果存储下来就好了。为什么要二次查询呢？

`for (auto& key : vec) {
    auto it = dict_data.find(key);
    if (it != dict_data.end()) {
        sum += it->second;
    }
}
`

当然你可能觉得这样丑点，所以不这样写……但我的原则一向是不要进行重复操作。

对于vector也有at() 所以也有人这样写：

`if (index  v.size()) {
    auto& e = v.at(index);
    // do sth for e
    ... 
}
`

这个at内部同样会检查是否越界，在越界的时候抛异常。所以对于vec，你直接[] 就好了。vector的[] 几乎没有开销，和那些关联如期不同。

`if (index  v.size()) {
    auto& e = v[index];
    // do sth for e
    ... 
}
`

或者直接不检查，而是加try catch

`try {
    ...
    auto& e = v.at[index];
    // do sth for e
    ... 
} catch (...) {

}
`

当然代码更丑一点。。而且我不鼓励在生产环境中使用会抛异常的函数。因为C++不同于java。java如果有未捕获或throw的异常，编译都过不了。而C++则不管。所以如果你的代码不小心抛出了异常，而没被catch，那么就可能让程序core dump！

#### sort给定义对象排序，可能存在对象拷贝的开销

STL中的sort应该是一个高频使用的函数了。比如对于一个vector进行排序。当vector存储的时候自定义类型的时候，我们也都知道给sort传入一个比较算子，或者在外部重载一下operator移动构造函数的时候，调用的是拷贝构造函数！当然如果你的类型，比较简单（比如只是保护2个基本数据类型）那么拷贝构造的开销也不大。但如果你的自定义类型比较复杂的时候，拷贝构造的开销显然大于移动构造函数。

所以当你的最好给你的自定义对象添加一个移动构造函数，另外为了使sort能够成功通过编译，在定义完移动构造函数以后，还要再定义一个移动赋值函数。

当然如果你不想这么麻烦的话，那么用vector存储该类型的指针**，然后传入一个该类型指针进行比较大小的lambda表达式，会是更简单的解决方案。只是这样对于老代码来说可能是侵入性的。而直接修改类定义的方法，则对老代码透明。

#### 如果要排序，不要无脑使用sort()

如果你想着拥有N个元素的vector排序，然后取出K个元素。那么这是典型的TopK问题。不要无脑的使用sort。STL的算法中还有一个partial_sort，只帮助你找到最大（或最小）的K个元素，而不需要把整个vector变得有序。

#### shared_ptr修改指向时有时是有开销的

shared_ptr用起来和普通指针类似，还不要手工管理释放内存。

我们应该大量使用shared_ptr替代裸指针（普通指针），以规避各种各样的内存问题。

`shared_ptrT> p1 = make_sharedT>();
...
shared_ptrT> p2 = make_sharedT>();
...
shared_ptrT> p3 = p1;
...
shared_ptrT> p4 = p2;
...
p4 = p1;
`

上述代码和我们直接用裸指针是类似的：

`T* p1 = new T;
T* p2 = new T;
T* p3 = p1;
T* p4 = p2;
p4 = p1;
`

裸指针可以随意修改指向，可以随意赋值。其开销可以忽略不计。然而shared_ptr则不然。

**当然我这里要讲的并不是shared_ptr这个对象复制的开销。**这个开销很小。shared_ptr一般实现中里面就是存了两个指针成员，shared_ptr对象的size也就是普通指针的2倍而已。复制开销也不大。

我这里说的是，当一个已经存在的shared_ptr修改指向的时候：

`shared_ptrT> p4 = p2;
...
p4 = p1;
`

如果p4是最后一个持有旧对象的shared_ptr的话，那么当p4 = p1的时候，不止是触发shared_ptr成员变量复制操作。还会触发旧对象的析构操作！这不难理解，我们都知道shared_ptr在所管理的数据对应的引用计数清零的时候，会触发析构操作。只是很多时候我们都把智能指针当普通指针用的时候，常常会忽略这一操作的潜在开销。

当T类型比较大的时候，比如里面有一个map/vector，存储了几十万，几百万条数据。这个看似简单的shared_ptr的赋值操作，开销特别大。主要就是这个析构导致的（释放大内存也有开销）。

对于大对象的析构，我们要慎之又慎。大内存释放有时不仅是耗时问题，而且会让CPU IDLE下降。影响服务的整体性能（同期的其他请求处理耗时也增加了）。根据业务需要，有时我们不需要真的析构掉这个对象，只需要clear掉它（内存不释放），后续再复用该对象。也就是类似“对象池”的思想。避免对象创建和析构的开销。又或者我们需要搞一个独立的线程，想办法把这些需要析构的大对象，在不影响服务请求处理耗时的独立线程中，进行定期清理。等等。

### **STL中容易踩坑的副作用（持续补充……）**

#### **clear()不会清空vector的内存**

尽管clear()会调用vector中元素的析构函数，但是并不会释放掉元素所占用的内存。这并不难理解，因为在vector为空的时候，我们也可以用reserver()函数来预分配内存。所以vector所占的内存并不会随着元素的释放而释放。如果你想在vector生命周期结束之前及时释放掉vector的内存，请：

`vectorint>().swap(v);
`

用一个匿名的vector对象来和已有的vector对象v来swap。虽然swap是交换，但由于涉及匿名对象，反过来swap是无法编译通过的：

`v.swap(vectorint>()); // 编译失败
`

**

#### size()-1

如何遍历一个vector？当然在C++11以后我能手写for-range循环了。

`for (auto& e: v) {
    // do sth for e
    ...
}
`

但是有时候我们在循环内需要下标信息，而不仅仅是元素本身。所以就变成传统的下标遍历了。有两种写法，各位看官看看是否有区别？

`for (int i = 0; i  v.size(); ++i) {
    auto& e = v[i]
    // do sth for e and i
    ...
}
`

另外一种：

`for (int i = 0; i  v.size() - 1; ++i) {
    auto& e = v[i]
    // do sth for e and i
    ...
}
`

看起来好像一样？实则不然。因为size() 返回是无符号整型，当 vector是空的时候，size()返回0，无符号的0 减去1，得到的是一个极大的正数。因而在 vector是空的时候，第二种写法会陷入死循环！

#### int和size()比较

看过上一节内容，你是不是以为容器肯定大于0的时候，或者不去对size()做减一的时候，就没有什么副作用的地方了呢？那也未必。可以通过一道leetcode题目来介绍。

实现一个二叉搜索树的迭代器，其中有个函数hashNext()返回还有没有下一个元素。next()表示向右移动虚拟的迭代器，并返回其值，所以我定义了一个成员变量i，初始化为-1。

`    int next() {
        return tree[++i]->val;
    }    
    bool hasNext() {
        return i  tree.size() - 1;
    }
...
    int i = -1;
`

题目保证容器肯定大于0，所以tree.size() - 1的结果最小也就是0（size()为1的时候）。在第一次调用next的时候， i 是 -1，tree().size() - 1即使是0，也是满足小于关系的。所以hasNext()应该返回true，结果意外的是hasNext()返回的是false!

这个是因为tree.size() 是无符号类型，有符号类型i在和它比较的时候被自动转型成了无符号的整型，所以取值为-1的i，变成了一个极大的整数，所以 hasNext() 返回了false！

这是一个常见的坑。

` i  v.size()
`

这种表达式，在i会转型成无符号整型，然后你本以为的 i （负数）小于 v.size() (大于等于0），却判断为了大于！从而触发一下程序逻辑上的bug。

各位，可要小心啊。

#### 多线程一写多读STL容器也不是线程安全的

好吧，关于STL容器的线程安全问题有点老生常谈了。我在另外一篇回答中有写过一些：

[](https://www.zhihu.com/question/29987589/answer/1483744520)

大家都知道并发多个线程去写STL容器（“写”指的是插入新元素）**不是线程安全的，可能会触发core dump。但可能有时候会忽略其实并发的多个线程中，只有一个线程写，其他线程都是读的时候也不是线程安全的。比如vector，尽管只有一个线程来写入，但是如果他触发了扩容了。那么其他线程尽管是只读这个vector的，其中的迭代器也会失效。对于unordered_map也是类似，单线程不停插入元素的话，可能触发rehash，导致其他线程中在map中find的过程中core dump。

送礼物

![](asset/img_105d2f56fe9c.jpg)

1 人已送礼物

[所属专栏 · 2022-11-06 11:18 更新](https://zhuanlan.zhihu.com/c_1572544730096689152)[![](asset/img_44fa8ba141a5.jpg)一鳞半爪

![](asset/img_dd0ccf0ca408.jpg)果冻虾仁

87 篇内容 · 19117 赞同

](https://zhuanlan.zhihu.com/c_1572544730096689152)订阅[最热内容 ·

C++为什么要弄出虚表这个东西？

](https://zhuanlan.zhihu.com/c_1572544730096689152)[编辑于 2021-10-30 22:06](//www.zhihu.com/question/355171938/answer/2173582004)

​​979 ​76 ​分享

​​

收起​
