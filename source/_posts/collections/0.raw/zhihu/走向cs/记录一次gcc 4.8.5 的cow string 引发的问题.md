---
title: 记录一次gcc 4.8.5 的cow string 引发的问题
date: "2021-01-14 00:00:00"
updated: "2021-01-14 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/记录一次gcc-4.8.5-的cow-string-引发的问题/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/344115460
---


### 问题说明

最近在对现有服务器做共享内存改造，使得服务器运行时的核心对象体系能分配在共享内存上，在程序意外崩溃或者热更重启时能够根据共享内存内的数据恢复出游戏运行时状态。花了两个月搞的差不多了，今天把流程串起来一测，core了，心里拔凉拔凉的。

看了一下堆栈，挂在了`basic_string::size()`上：

`// Capacity:

```text
      ///  Returns the number of characters in the string, not including any
      ///  null-termination.
      size_type
      size() const _GLIBCXX_NOEXCEPT
      { return _M_rep()->_M_length; }
```

`

第一反应是：会不会关服的时候已经把这个字符串释放了。于是给这个字符串的赋值和所在结构体的析构函数加上log， 然而没有任何异常。

第二反应是：会不会被其他的指针给写坏了，于是在关服前和关服后都打印了一下`c_str`, 发现调用`c_str`函数也是`coredump`，说无法访问对应地址的内存。

既然打印不了`c_str`,我就把整个`string`的字节打印出来吧， 比对了一下，发现前后的值也是一样的，都是八个字节大小。这个时候我才发现事情没有那么简单：

- 看到八个字节大小就感觉很奇怪，传说中的`sso`优化不都是要求`string`大小为24字节或者32字节起么。查了一下源代码，`gcc 4.8.5`的`string`里面只有一个指针数据成员，那64位平台只有八个字节也是很合情合理很合乎逻辑的。
- 我有两个同样类型的结构体，里面的`string`变量都是空字符串，他们打印出来的字节表示都是一样的， 都是`0xd8,c3,1f,b8,d2,7f,00,00`, 转成大端表示为`0x00007fd2b81fc3d8`，上面的值指向一个栈上地址，通过gdb访问这个地址居然不让访问。
- 我明明给这个`string`指定了`allocator`，让他的内存分配走我的共享内存上去，我的共享内存虚拟地址空间是手动指定好的，跟栈基础地址隔了十万八千里，可是为什么`string`内部会出现一个指向栈的指针啊。
为此，我们来走进科学，进入`gcc 4.8.5 libstdc++ string`的实现。先来看`string`的成员变量：

`// Use empty-base optimization: http://www.cantrip.org/emptyopt.html

```text
      struct _Alloc_hider : _Alloc
      {
    _Alloc_hider(_CharT* __dat, const _Alloc& __a)
    : _Alloc(__a), _M_p(__dat) { }

    _CharT* _M_p; // The actual data.
      };
            // Data Members (private):
      mutable _Alloc_hider  _M_dataplus;
```

`

上面的实现用了空基类优化来掩盖`allocator`，所以最优形态下只有一个数据成员`char* _M_p`。这个成员是这么来使用的:

`_CharT*

```text
      _M_data() const
      { return  _M_dataplus._M_p; }
      _Rep*
      _M_rep() const
      { return &((reinterpret_cast_Rep*> (_M_data()))[-1]); }
```

`

上面会强制转换为一个`_Rep`的指针来访问：

`struct _Rep_base

```text
      {
    size_type       _M_length;
    size_type       _M_capacity;
    _Atomic_word        _M_refcount;
      };

      struct _Rep : _Rep_base
      {
    // Types:
```

`

这个`_Rep`其实就是一个控制块，记录了`string`的大小，容量、引用计数。莫非这个控制块的内存分配不归我的`allocator`管，导致`string`内部的指针并不指向共享内存区域，从而导致服务器重启之后字符串恢复失败。 看来应该就是这个问题，继续看代码确认一下这个结构体怎么分配的， 他走的是`_S_create`函数：

`templatetypename _CharT, typename _Traits, typename _Alloc>
    typename basic_string_CharT, _Traits, _Alloc>::_Rep*
    basic_string_CharT, _Traits, _Alloc>::_Rep::

```text
    _S_create(size_type __capacity, size_type __old_capacity,
          const _Alloc& __alloc)
    {
      // _GLIBCXX_RESOLVE_LIB_DEFECTS
      // 83.  String::npos vs. string::max_size()
      if (__capacity > _S_max_size)
    __throw_length_error(__N("basic_string::_S_create"));

      const size_type __pagesize = 4096;
      const size_type __malloc_header_size = 4 * sizeof(void*);

      if (__capacity > __old_capacity && __capacity  2 * __old_capacity)
    __capacity = 2 * __old_capacity;

      size_type __size = (__capacity + 1) * sizeof(_CharT) + sizeof(_Rep);

      const size_type __adj_size = __size + __malloc_header_size;
      if (__adj_size > __pagesize && __capacity > __old_capacity)
    {
      const size_type __extra = __pagesize - __adj_size % __pagesize;
      __capacity += __extra / sizeof(_CharT);
      // Never allocate a string bigger than _S_max_size.
      if (__capacity > _S_max_size)
        __capacity = _S_max_size;
      __size = (__capacity + 1) * sizeof(_CharT) + sizeof(_Rep);
    }

      // NB: Might throw, but no worries about a leak, mate: _Rep()
      // does not throw.
      void* __place = _Raw_bytes_alloc(__alloc).allocate(__size);
      _Rep *__p = new (__place) _Rep;
      __p->_M_capacity = __capacity;

      __p->_M_set_sharable();
      return __p;
    }
```

`

过了一下代码，发现这个`Rep`结构体与对应的字符串是合并`allocate`的，都会通过我们指定的`Allocator`，字符串数据就放在`Rep`结构体的末尾，通过下面的接口来访问的：

`_CharT*

```text
    _M_refdata() throw()
    { return reinterpret_cast_CharT*>(this + 1); }
```

`

又一轮猜测破灭。 之前测试的时候，其他的`string`恢复之后用的好好的，为什么这两个空字符串却恢复失败，而且这两个空字符串指向的是同一个栈上的`Rep`地址，莫非空字符串有特殊操作。为此我们继续探查源代码，发现了一些蛛丝马迹：

`// The following storage is init'd to 0 by the linker, resulting

```text
        // (carefully) in an empty string with one reference.
        static size_type _S_empty_rep_storage[];

        static _Rep&
        _S_empty_rep()
        { 
      // NB: Mild hack to avoid strict-aliasing warnings.  Note that
      // _S_empty_rep_storage is never modified and the punning should
      // be reasonably safe in this case.
      void* __p = reinterpret_castvoid*>(&_S_empty_rep_storage);
      return *reinterpret_cast_Rep*>(__p);
    }
```

`

好像还真是，空字符串的会共享一个静态的`Rep`结构体，我们看`string`的构造函数来确认一下：

`static _Rep&

```text
      _S_empty_rep()
      { return _Rep::_S_empty_rep(); }

    public:
      // Construct/copy/destroy:
      // NB: We overload ctors in some cases instead of using default
      // arguments, per 17.4.4.4 para. 2 item 2.

      /**
       *  @brief  Default constructor creates an empty string.
       */
      basic_string()
#if _GLIBCXX_FULLY_DYNAMIC_STRING == 0
      : _M_dataplus(_S_empty_rep()._M_refdata(), _Alloc()) { }
```

#else

```text
      : _M_dataplus(_S_construct(size_type(), _CharT(), _Alloc()), _Alloc()){ }
#endif
```

`

上面代码的意思就是，如果没有开启全动态字符串的情况下，`gcc 4.8.5`的`string`会使用`copy on write`优化，同样的`string`拷贝复制的时候共享同一个`Rep`结构体指针。此外对于空字符串，会共享同一个静态生命周期的`Rep`结构体。

`// Linker sets _S_empty_rep_storage to all 0s (one reference, empty string)

```text
  // at static init time (before static ctors are run).
  templatetypename _CharT, typename _Traits, typename _Alloc>
    typename basic_string_CharT, _Traits, _Alloc>::size_type
    basic_string_CharT, _Traits, _Alloc>::_Rep::_S_empty_rep_storage[
    (sizeof(_Rep_base) + sizeof(_CharT) + sizeof(size_type) - 1) /
      sizeof(size_type)];
```

`

由于程序装载时的`ASLR`，导致这个静态区域会随时变动。上一次进程启动时的地址在这一次启动时可能没有被映射为有效地址，从而导致访问内存出现`cannot access memory at address`这个问题，因此空字符串的共享内存恢复会失败。

至于解决方案，那当然是升级`gcc`到最新啦。然而面对那些只提供头文件和lib文件的无法升级的爷爷级依赖库，我选择死亡。。。。。。。

搜了一下，原来2004年的时候就有人抱怨gcc的string跟共享内存恢复不兼容：16612 – empty basic_strings can't live in shared memory (gnu.org)

晚上看看能不能`copy`一份高版本的`std string`实现塞到项目里，`copy`也算代码量的是吧。
