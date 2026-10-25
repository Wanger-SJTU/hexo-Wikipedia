---
title: "你在什么情况下必须用到 dynamic_cast ？"
date: "2024-11-11 00:00:00"
updated: "2024-11-11 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/你在什么情况下必须用到-dynamic_cast/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://www.zhihu.com/question/1149593088/answer/28326210352"
---


理想情况下不需要用dynamic_cast。

《设计模式》中大量的模式都是用面向对象的方式实现，但是没有任何一种模式用到了dynamic_cast，设计完美的模式就是父类不需要知道子类的具体类型，如果需要用dynamic_cast说明抽象程度不够。

![](https://picx.zhimg.com/v2-0c224d02ce2df04eaa8c99118143b5e2_r.jpg?source=2c26e567)但是前面既然说了是理想情况，现实和理想往往是有差距的，当类的继承深度足够深、子类数量足够多时，总是会出现不理想的情况，使用父类指针时需要知道子类的具体类型，这时候就需要向下转换。例如游戏引擎（unreal engine)、面向对象的UI库(Qt)等等，都有大量类似的场景。

![](https://picx.zhimg.com/v2-2d218b79582cbe649db0c2145b141f81_r.jpg?source=2c26e567)既然转换避免不了，能不能用自定义性能更好的xxx_cast，替换掉dynamic_cast呢？其实是可以的，ue和Qt里面都是这样做的。Qt的cast我不知道性能如何，但是ue的cast很多时候都比dynamic_cast更高效。它是这样实现的：

```text
// Engine/Source/Runtime/CoreUObject/Public/UObject/UObject.h
template<class ToClass>
static ToClass* Cast(UClass* ToClass, UObject* Object)
{
    if (!Object || !ToClass || !Object->IsA(ToClass))
    {
        return nullptr;
    }
    return static_cast<ToClass*>(Object);
}
```


总之自己实现dynamic_cast的替代品是可行的，有兴趣可以去它的源码中继续追踪了解IsA的实现，从而了解整个实现原理。

游戏引擎比较追求高效，所以像dynamic_cast这种不高效的特性虽然是ISO C++原装，引擎作者都会尝试寻找自己的解决方案，下面这种问题我时不时看到：

![](https://pica.zhimg.com/v2-6545a10b5c1e04fcc43d0dc0e55bd14f_r.jpg?source=2c26e567)想要了解如何手动实现更快的dynamic_cast，可以参考《C++ Tricks: Fast RTTI and Dynamic Cast》：

[http://kahncode.com/2019/09/24/c-tricks-fast-rtti-and-dynamic-cast/](https://link.zhihu.com/?target=http%3A//kahncode.com/2019/09/24/c-tricks-fast-rtti-and-dynamic-cast/)想要深度了解dynamic_cast实现原理的也可以看《dynamic_cast from scratch》这个视频：

[https://www.youtube.com/watch?v=QzJL-8WbpuU](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DQzJL-8WbpuU)视频对应的ppt：

[https://itp.uni-frankfurt.de/~sciarra/C++_User_Group/Talks/2018_11.pdf](https://link.zhihu.com/?target=https%3A//itp.uni-frankfurt.de/~sciarra/C%2B%2B_User_Group/Talks/2018_11.pdf)