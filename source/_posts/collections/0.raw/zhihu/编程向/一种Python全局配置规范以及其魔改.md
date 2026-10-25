---
title: 一种Python全局配置规范以及其魔改
date: "2017-12-25 00:00:00"
updated: "2017-12-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/一种Python全局配置规范以及其魔改/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/31669135
---


### 0x01 模块 or global

很多初学者有个误区，就是在Python中需要配置一个全局的参数时，首先想到的是global关键字，而实际上global不是干这个事的，global的功能是在将局部作用域的变量声明为全局的，这样可以在局部修改全局的变量。

但这种用法其实非常不好，按照函数式的规范而言，纯函数的输入应该只由输入参数确定，不应该在执行过程中引用外部变量。并且，global也不是用来进行全局配置用的。

在Python中，模块是天然的单例，模块会在项目初始化后执行一次，之后一般不重复执行，符合单例模式的特点。因此，利用模块的这一特性，将整个工程文件中需要配置的选项都配置到一个模块中，在需要用的模块中通过import导入，才是Python中全局配置正确打开方式。

虽然这种规范已经在江苟（Django）等开源框架中展示了无数遍，但“如何在Python中设置全局变量”这个问题仍然是Python社区的月经贴。

通过模块配置全局变量的试例如下，在configs.py中定义CONFIG_A和CONFIG_B。在user.py中用import导入。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_ecc1aceb75e9.jpg)

这个其实是Python中的基本操作了，本来是没啥好讲的，不过在这篇文章最后我展示了一种根据json配置的动态模块，供大家参考。


### 0x02 单例字典

在讲模块之前，我想谈谈我尝试过另一种方式，就是自定义单例字典，具体做法是这样的。

先继承collections模块中MutableMapping，并重写相关接口。这是在Python中自定义数据类型的基本操作了，自定义完成后然后写一个装饰器将继承的类转化成单例的类。

单例模式的写法可以看Stackoverflow上关于单例模式的高票回答。

我习惯采用第一种函数装饰器的写法：

```python
def singleton(class_):
    instances = {}
    def getinstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]
    return getinstance
```


@singleton

```text
class MyClass(BaseClass):
    pass`
```


这种写法非常好理解，用一个类变量instances保存该类生成的实例，每次类被调用的时候判断一下这个类是否在instances字典里，如果不在着生成一个实例并放入instances字典。

但这个写法有个问题，装饰后的返回的不是一个类，而是一个函数，虽然Python语法讲究一切皆对象，但函数是享受不到类的诸如继承之类的特性的。

如果需要返回一个单例类的话需要用元类的写法，或者第四种类装饰器的写法。当然，具体到这里而言，这个类是继承了一个MutableMapping的，不能再继承别的元类了，元类的写法在这里不适用。

### 0x03 单例字典的问题

用单例字典做全局配置看着比模块炫酷，其实并没那么好用。原因是单例模式自身的一个弊病，违背了单一职责原则，这个在相关设计模式的教程里有讲到。而且，字典在这一块还有个弊病就是根本不知道需要用到的key是不是存在字典中。

单例字典是我在项目初期引入，并在项目的迭代过程中给我造成最大困扰的一个东西，在开始时几乎将所有的配置都写入到这个字典中，然后在程序运行中这个字典又被分散在程序各处的各个实例修改，运行到后面根本不知道字典里有什么，字典里的某个内容是否被修改过。不过由于GIL，倒是不需要考虑锁的问题，可能是唯一的一个幸事。

在后期将这个庞大的字典进行重构，重构的过程按照下面的方式进行：

1、将各个类中该字典的引用点，由各个方法收拢到__init__方法。

不应该

```python
class A:

    def __init__(self,):
        pass

    def fun_a(self):
        a = Singleton()['a']

    def fun_b(self):
        b = Singleton()['a']`
```


应该

```python
class B:

    def __init__(self,):
        self.a = Singleton()['a']
        self.b = Singleton()['b']

    def fun_a(self):
        a = self.a

    def fun_b(self):
        b = self.b
```


2、将各个引用点的名称统一。

不应该

```python
class A:

    def __init__(self,):
        self.sets = Singleton()

    def fun_a(self):
        SET = Singleton()

    def fun_b(self):
        self.SET = Singleton()
        b = self.SET['b']`
```


应该

```python
class B:

    def __init__(self,):
        self.sets = Singleton()

    def fun_a(self):
        SET = self.sets

    def fun_b(self):
        b = self.set['b']`
```


3、将子函数中直接引用单例字典的参数放到函数的参数列表中，由调用方获取单例字典内容，由传参的方法传入被调用函数，这样做是为了满足函数式编程中纯函数的原则。

不应该这么用：

```python
def b():
    return Singleton()['c']+'a'

def a():
    returrn b()`
```


应该这样用

```python
def b(c):
    return c +'a'

def a()
    c = Singleton()['c']
    return b(c)`
```


4、将单一的单例字典分成多个单例字典，并将部分单例字典转换成模块，这个就不举例了。

0x04 动态模块

模块的用法很简单，在一个文件里配置好，直接import就行。需要注意的是引用的入口最好在同一个地方。

不过模块有个地方不好就是动态修改不方便，具体到项目中去就是，该项目通过工厂模式生成了一系列产品，每个产品所需的配置参数都不一样。

这里有个办法就是每个产品都通过同一个模块来配置，然后在初始化时根据以产品名称命名的一个json文件修改模块的参数。这样就可以达到引用模块的方式不变，但模块的内容是根据json文件的内容来配置的。

详细的代码见[github](https://link.zhihu.com/?target=https%3A//github.com/lidingke/fiberGeometry/blob/master/setting/configs/tool.py)，主要用来动态修改模块的语句如下：

` [setattr(module, k.decode('utf-8'), v) for k, v in d.items()]`

其实就是通过setattr这个常用的给对象动态的添加功能的函数，d.tiems()是一个从json文件中读取的字典对象。

<strong>0x04 动态模块的优势</strong>

现在，一个配置模块的方案就成了导入configs模块，调用update_config_by_name函数，即动态修改函数，并按照相应的json文件修改模块的值。

相对于在每个类初始化时直接调用json配置变量这种方案是有好处的，定义了configs模块有助于代码的静态检查，形成了一种像C语言中.h文件和.c文件的关系，在头文件中定义相关的变量，在.c文件中实现或使用。这里就成了在configs模块中定义变量，变量的值由json文件确定，然后在其他模块中通过import实现，并且这个东西是全局共享的。当然，这个全局的意思指的是整个解释器。

这段代码还是有个坑，一般出现在单元测试中，来看两段代码：

```python
from configs import CONFIG_A, CONFIG_B
print("use config:", CONFIG_A，CONFIG_B)
import configs
print("use config:", configs.CONFIG_A,configs.CONFIG_B)`
```


在单元测试中由于deepcopy的问题，根据导入的层级不一样，CONFIG_X的值也发生了不一样的改变，这是个还在研究的bug。

本文地址：

[一种Python全局配置规范以及其魔改](https://zhuanlan.zhihu.com/p/31669135)

专栏地址：

[python杂七杂八的使用经验](https://zhuanlan.zhihu.com/c_44490854)
