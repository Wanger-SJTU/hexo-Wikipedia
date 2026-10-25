---
title: (1 条消息) 卷积算法另一种高效实现，as_strided详解
date: "2019-06-13 00:00:00"
updated: "2019-06-13 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/卷积算法另一种高效实现,as_strided详解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64933417
---


感谢 @Sebastian 提供的完整实现：[https://github.com/sebgao/cTensor](https://link.zhihu.com/?target=https%3A//github.com/sebgao/cTensor)

在之前的一篇笔记中推导了卷积运算的im2col方法的实现：[numpy实现卷积转换成矩阵乘法算法](https://zhuanlan.zhihu.com/p/63974249)

不过后面在评论区看到有更高效的方法，主要是用到了np.lib.stride_tricks.as_strided这个函数，试验了一下，总算弄明白参数设置的原理了，在这里写一篇笔记，以防自己以后忘了

首先，从最简单的例子开始，设有一矩阵X：

X=[123456789]" role="presentation">X=[123456789]X = \left[ \begin{array}{lll}{1} & {2} & {3} \\ {4} & {5} & {6} \\ {7} & {8} & {9}\end{array}\right] 

如果卷积核的大小是2x2，stride为1，那么就需要把矩阵X转换为包含如下4个小矩阵的新矩阵A：

A=[[1245][2356][4578][5689]]" role="presentation">A=[[1245][2356][4578][5689]]A = \left[ \begin{array}{ll}{\left[ \begin{array}{ll}{1} & {2} \\ {4} & {5}\end{array}\right]} & {\left[ \begin{array}{ll}{2} & {3} \\ {5} & {6}\end{array}\right]} \\ {\left[ \begin{array}{ll}{4} & {5} \\ {7} & {8}\end{array}\right]} & {\left[ \begin{array}{ll}{5} & {6} \\ {8} & {9}\end{array}\right]}\end{array}\right] 

 而as_strided就是干这种事的，先看看对于参数的描述：

`numpy.lib.stride_tricks.as_strided(x, shape=None, strides=None, subok=False, writeable=True)`

x就是我们要分割的矩阵，可以当做是一个蓝图，shape，strides都是新矩阵的属性，也就是说这个函数按照给定的shape和strides来划分x，返回一个新的矩阵，最后两个参数不讨论，可以看numpy官方手册的描述

shape很好理解，用的也比较多

比如矩阵X的shape：(3, 3)；矩阵A的shape：(2,2,2,2)

至于strides属性，先看下面的代码：

a = np.arange(9, dtype=np.int32).reshape(3,3)
print(a)
'''
[[0 1 2]
 [3 4 5]
 [6 7 8]]
 '''
print(a.strides)
'''
(12, 4)
'''

strides是numpy数组对象的一个属性，官方手册给出的解释是跨越数组各个维度所需要经过的字节数（bytes）

例如，跨越第1维：从a[x,0]到a[x,1]需要经过4个字节，为什么是4个？因为a的数据类型是int32，正好占4个字节

跨越第0维：从a[0,x]到a[1,x]的话，需要经过12（3x4）个字节，因为a[0]，也就是a的一行有3个数据，占据12个字节

为了更好的说明，来看看a展开成一行情况：

`[0 1 2 3 4 5 6 7 8]`

从a[0,0]到a[0,1]，也就是从0到1，经过1个数据；而从a[0,0]到a[1,0]，也就是从0到3，经过3个数据，每个数据占4个字节，所以a.strides = (12, 4)

弄清楚原理后，下面的例子就更好理解了：

b = np.arange(16, dtype=np.float).reshape(4,4)
print(b.strides)
#(32, 8)

c = np.arange(27, dtype=np.int32).reshape(3,3,3)
print(c.strides)
#(36, 12, 4)

现在，再回过头来看as_strided函数，要从X得到A：

`A = as_strided(X, shape=(2,2,2,2), strides)`

A = \left[ \begin{array}{ll}{\left[ \begin{array}{ll}{1} & {2} \\ {4} & {5}\end{array}\right]} & {\left[ \begin{array}{ll}{2} & {3} \\ {5} & {6}\end{array}\right]} \\ {\left[ \begin{array}{ll}{4} & {5} \\ {7} & {8}\end{array}\right]} & {\left[ \begin{array}{ll}{5} & {6} \\ {8} & {9}\end{array}\right]}\end{array}\right] 

显然，shape的值设为（2，2，2，2），但是strides并不是（32，16，8，4）

因为A不是一个新的数组，而是X的一种视图（View），所以，strides的理解是，在矩阵X的基础上，按照给定的strides，来切割出一个符合给定shape的视图

那么，现在来确定stirdes的值，因为所有数据都在X上，所以A的各个维度的跨度都要根据X来确定，先从矩阵A的最低维开始：

对于矩阵A的任意两个元素：A[i, j, k, x]，A[i, j, k, x+1]，它们的跨度与矩阵X一样，都是4（dytpe=int32）

然后确定更高一个维度的距离：A[i, j, k, x]和A[i, j, k+1, x]，对比它们在X上的情况：

X = \left[ \begin{array}{lll}{1} & {2} & {3} \\ {4} & {5} & {6} \\ {7} & {8} & {9}\end{array}\right] 

可以确定距离为12，（如果A是原生数组的话，那么就是该是8）

现在，已经确立了最低的两个维度的stride值：（？，？，12，4）

再来看A更高一个维度的距离，如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f3b1e27dcded.jpg)

也就是要确定上图中相同颜色圈中的两个元素之间的距离：1和2，2和3，8和9，等等

在矩阵 X = \left[ \begin{array}{lll}{1} & {2} & {3} \\ {4} & {5} & {6} \\ {7} & {8} & {9}\end{array}\right] 可以发现，它们的距离都是4字节，就算找遍其他例子也是一样，所以，现在可以确定strides =（？，4，12，4），只剩最后一个维度的距离需要确定了，先上图

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0ce2ab696ab5.jpg)

这里就不用多说了吧，最后可以strides =（12，4，12，4），运行代码：

X = np.arange(9, dtype=np.int32).reshape(3,3)
print(X)
'''
[[0 1 2]
 [3 4 5]
 [6 7 8]]
'''
A = np.lib.stride_tricks.as_strided(X, shape=(2,2,2,2), strides=(12,4,12,4))
print(A)
'''
[[[[0 1]
   [3 4]]

  [[1 2]
   [4 5]]]

 [[[3 4]
   [6 7]]

  [[4 5]
   [7 8]]]]
'''

果然，再来看一个例子

X=\left[ \begin{array}{cccc}{10} & {11} & {12} & {13} \\ {14} & {15} & {16} & {17} \\ {18} & {19} & {20} & {21} \\ {22} & {23} & {24} & {25}\end{array}\right] 

X的strides为：（16，4），如果卷积核大小为3x3，那么要得到新矩阵A：

X = np.arange(16, dtype=np.int32).reshape(4,4)
print(X)
'''
[[ 0  1  2  3]
 [ 4  5  6  7]
 [ 8  9 10 11]
 [12 13 14 15]]
'''
A = np.lib.stride_tricks.as_strided(X, shape=(2,2,3,3), strides=(16,4,16,4))
print(A)
'''
[[[[ 0  1  2]
   [ 4  5  6]
   [ 8  9 10]]

  [[ 1  2  3]
   [ 5  6  7]
   [ 9 10 11]]]

 [[[ 4  5  6]
   [ 8  9 10]
   [12 13 14]]

  [[ 5  6  7]
   [ 9 10 11]
   [13 14 15]]]]
'''

以上，是2维的情况，再来看3维的情况，设有一矩阵：

X_1 = \left[ \begin{array}{lll}{\left[ \begin{array}{lll}{1} & {2} & {3} \\ {4} & {5} & {6} \\ {7} & {8} & {9}\end{array}\right]} & {\left[ \begin{array}{lll}{10} & {11} & {12} \\ {13} & {14} & {15} \\ {16} & {17} & {18}\end{array}\right]}\end{array}\right] 

`X1 = np.arange(1,19, dtype=np.int32).reshape(2,3,3)`

如果卷积核的大小是2x2，那么就需要划出一个包含8个2x2大小的新矩阵：

A_1=\left[ \begin{array}{ll}{\left[ \begin{array}{ll}{\left[ \begin{array}{ll}{1} & {2} \\ {4} & {5}\end{array}\right]} & {\left[ \begin{array}{ll}{2} & {3} \\ {5} & {6}\end{array}\right]} \\ {\left[ \begin{array}{ll}{4} & {5} \\ {7} & {8}\end{array}\right]} & {\left[ \begin{array}{ll}{5} & {6} \\ {8} & {9}\end{array}\right]}\end{array}\right]} & {\left[ \begin{array}{ll}{\left[ \begin{array}{ll}{10} & {11} \\ {13} & {14}\end{array}\right]} & {\left[ \begin{array}{ll}{11} & {12} \\ {14} & {15}\end{array}\right]} \\ {\left[ \begin{array}{ll}{13} & {14} \\ {16} & {17}\end{array}\right]} & {\left[ \begin{array}{ll}{14} & {15} \\ {17} & {18}\end{array}\right]}\end{array}\right]}\end{array}\right] 

可以数一下，A1的shape为：（2，2，2，2，2），其实比之前的A就多一个维度，而且值为X1.shape[0]，用代码描述的话，其关系如下：

`A1.shape = (X1.shape[0], *A.shape)`

 如果要确定新的步长参数strides1，那么考虑到X1不过是在X的基础上增加了一个维度，在卷积中相当于多了一个通道，所以strides1的前四项还是按照上面的方法推导，依然不变，strides1 =（？，12，4，12，4），所以只要确定最高一个维度的值就可以了：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ff94cb6c780d.jpg)

也就是上图1和10，5和14之间的关系，现在来看X中对应元素的距离：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_929e2b88fa1e.jpg)

而X1.strides =（36，12，4），所以strides1 =（36，12，4，12，4）

进一步的，通过观察，可以发现strides1和X1.strides存在如下关系

`strides1 = (*X1.strides[:-2], X1.strides[-2]*s, X1.strides[-1]*s, *X1.strides[-2:])`

即strides1包含了X1.strides的第1个至第-3（含）个元素，以及X1.strides的最后两个元素分别乘上卷积的步长（即上面的s），再加上额外X1.strides的最后两个元素。

运行一遍代码验证一下：

X1 = np.arange(1,19, dtype=np.int32).reshape(2,3,3)
print(X1)
'''
[[[ 1  2  3]
  [ 4  5  6]
  [ 7  8  9]]

 [[10 11 12]
  [13 14 15]
  [16 17 18]]]
'''
A1 = as_strided(X1, shape=(2,2,2,2,2), strides=(*X1.strides, *X1.strides[-2:]))
print(A1)
'''
[[[[[ 1  2]
    [ 4  5]]

   [[ 2  3]
    [ 5  6]]]

  [[[ 4  5]
    [ 7  8]]

   [[ 5  6]
    [ 8  9]]]]

 [[[[10 11]
    [13 14]]

   [[11 12]
    [14 15]]]

  [[[13 14]
    [16 17]]

   [[14 15]
    [17 18]]]]]
'''

完全正确

桶里，当X是四维数组时（X.shape = (N, C, H, W)），卷积核的宽高为：kh，kw

那么可以确定A的shape为：（N，C，？，？，kh，kw），至于中间的两个数值怎么确定？还是用以前的公式：

```python
def split_by_strides(X, kh, kw, s):
    N, C, H, W = X.shape
    oh = (H - kh) // s + 1
    ow = (W - kw) // s + 1
    strides = (*X.strides[:-2], X.strides[-2]*s, X.strides[-1]*s, *X.strides[-2:])
    A = as_strided(X, shape=(N,C,oh,ow,kh,kw), strides=strides)
```


这里没有padding，因为在这之前就X就已经认为是pad过了

还有个小问题，如果X.shape不是上面那个样子怎么弄？这里举个其他的例子：

```python
def split_by_strides(X, kh, kw, s):
    N, H, W, C = X.shape
    oh = (H - kh) // s + 1
    ow = (W - kw) // s + 1
    shape = (N, oh, ow, kh, kw, C)
    strides = (X.strides[0], X.strides[1]*s, X.strides[2]*s, *X.strides[1:])
    A = as_strided(X, shape=shape, strides=strides)
    return A
```


其实就是将shape改一下，strides参数调整一下就行了

现在蛋糕已经切好了，那么是直接吃吗？不过还有卷积核的问题没有解决，如果把A经过transpose和reshape转换成二维矩阵，再把卷积核如法炮制，那么直接用np.dot就可以实现了，得到结果之后再reshape回来也就是想要的feature map了

可是，这么一顿操作下来，好不容易去掉for循环提高的效率，不是又被拉回来了？有没有一行代码的解决方案？这时候就需要用到numpy的另一个函数tensordot了

不过这样就说来话长了，足够另起一篇了，而且单独一篇篇幅太长也不利于阅读，这里先把代码贴出来，然后回头再介绍tensordot

设卷积核的shape为：（kh，kw，C，kn），X.shape：（N，H，W，C），计算feature_map的代码如下：

kh, kw, C, kn = self.filters.shape
X_split = split_by_strides(X, kh, kw, s)   # X_split.shape: (N, oh, ow, kh, kw, C)
feature_map = np.tensordot(X_split, self.filters, axes=[(3,4,5), (0,1,2)]) + self.bias

可以检验一下，featrue_map的shape为：（N，oh，ow，kn）

最后就是上面代码中用到的np.tensordot函数了，这个和np.dot类似，不过np.dot是矩阵乘法，tensordot是张量的点乘，简单的写一下用法，先来看看官方手册上tensordot的介绍：

> `numpy.tensordot`(*a*,*b*,*axes=2*)

其中参数a，b都是np数组；axes是给定的轴，axes赋整数的情况不在讨论范围之内，这里讨论的是其为数组的情况，先看最简单的例子：

>>> A = np.random.randint(0,9,(3,4))
>>> B = np.random.randint(0,9,(4,5))
>>> C = np.tensordot(A, B, [1, 0])
>>> C.shape
(3, 5)
>>> C
array([[ 37,  23,  77,  19,  16],
       [ 83,  32, 116,  40,  51],
       [ 86,  43, 127,  47,  47]])
>>> np.dot(A, B)
array([[ 37,  23,  77,  19,  16],
       [ 83,  32, 116,  40,  51],
       [ 86,  43, 127,  47,  47]])

这个和np.dot的结果虽然没有区别，不过为了说明其中的不同，还是用另一种角度来进行抽象，先将上面的两个二维数组分别抽象成一个列向量和一个行向量：

A=\left[ \begin{array}{l}{a_{1}} \\ {a_{2}} \\ {a_{3}}\end{array}\right] 

B=\left[ \begin{array}{lllll}{b_{1}} & {b_{2}} & {b_{3}} & {b_{4}} & {b_{5}}\end{array}\right] 

所以矩阵C为：

C=\left[ \begin{array}{lllll}{a_{1} b_{1}} & {a_{1} b_{2}} & {a_{1} b_{3}} & {a_{1} b_{4}} & {a_{1} b_{5}} \\ {a_{2} b_{1}} & {a_{2} b_{2}} & {a_{2} b_{3}} & {a_{2} b_{4}} & {a_{2} b_{5}} \\ {a_{3} b_{1}} & {a_{3} b_{2}} & {a_{3} b_{3}} & {a_{3} b_{4}} & {a_{3} b_{5}}\end{array}\right] 

其中C的各个元素都是 a_x b_x 进行点乘的运算的结果

关于点乘运算，这里简单介绍一下，设有a,b两个向量（或矩阵）：

$a=\left[ \begin{array}{lll}{a_{1}} & {\cdots} & {a_{n}}\end{array}\right] $

$b=\left[ \begin{array}{lll}{b_{1}} & {\cdots} & {b_{n}}\end{array}\right] $

那么a,b进行点乘就是：

$a \cdot b=a_{1} b_{1}+\dots+a_{n} b_{n} $

所以，简而言之点乘就是两个向量（矩阵）的各个元素对应相乘然后进行累加，所以理所当然的它们的shape是一样的，用代码实现起来就是：

`np.sum(a * b)`

说了这么多，主要是为了接下来的内容做铺垫，再来看一个复杂点的例子：

>>> A = np.random.randint(0,9,(3,4,5))
>>> B = np.random.randint(0,9,(4,5,2))
>>> np.tensordot(A, B, [(1,2), (0,1)])
array([[290, 146],
       [308, 164],
       [316, 205]])

经过上面的解释，想必你肯定知道这些数值是怎么来的了，来验证一下：

>>> np.sum(A[0] * B[:,:,0])
290
>>> np.sum(A[2] * B[:,:,1])
205

上面分别验证了（0，0）和（2，1）位置的值，都完全正确

所以，tensordot的功能就是对于A, B两个多维数组，按给定的axes得到分别得到子数组subA和subB，然后这两个子数组进行点乘运算

官方手册上有个例子，这里搬过来，应该能更好的理解：

>>> a = np.arange(60.).reshape(3,4,5)
>>> b = np.arange(24.).reshape(4,3,2)
>>> c = np.tensordot(a,b, axes=([1,0],[0,1]))
>>> c.shape
(5, 2)
>>> c
array([[ 4400.,  4730.],
       [ 4532.,  4874.],
       [ 4664.,  5018.],
       [ 4796.,  5162.],
       [ 4928.,  5306.]])
>>> # A slower but equivalent way of computing the same...  一个更慢但效果一样的方法
>>> d = np.zeros((5,2))
>>> for i in range(5):
...   for j in range(2):
...     for k in range(3):
...       for n in range(4):
...         d[i,j] += a[k,n,i] * b[n,k,j]
