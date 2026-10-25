---
title: 编译器领域的多面体模型（Polyhderal Model）
date: "2020-11-24 00:00:00"
updated: "2020-11-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/编译器领域的多面体模型(Polyhderal-Model)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/310142893
---


<strong>这篇文章中的图片全是我之前在一本书中摘录的，但是因为我个人习惯不好，现在不知道出处了。如果有人知道请告诉我，我好给那些图片加上reference</strong>

前几周发文章给自己挖了个坑，说要写一下编译领域非常神奇的多面体模型(Polyhedral Model)，但实际上我之前接触的也很少，只是当时给组里写深度学习编译器的时候调研过一阵子。当时还是2019年3月份，很少有中文的多面体模型或者区间分析的资料，没办法自己啃了啃大部头的论文。

今天想着把它捡起来整理一下，发现自己之前写的笔记根本看不懂了。随手查了一下，发现 [@要术甲杰](https://www.zhihu.com/people/f3edc0b3c8221a4fa224169746ae9ed0) 总结了三篇很详细的多面体优化的文章，看了觉得醍醐灌顶，把以前的事情都想起来了。

[深度学习编译器有哪些有价值的研究方向和参考文献？](https://www.zhihu.com/question/338039895/answer/839949892)上面链接就是他的回答，写的很不错了，不过我翻了翻笔记有一些其他的例子里面没有提到，我这里也相当于做个补充，可以让大家更好地了解什么是多面体优化

<strong>基本概念</strong>

多面体模型最关注的（可能也是唯一关注的）就是循环的优化。因此对于多面体模型，它只会把一段段程序当成一堆嵌套循环，至于循环里面的内容他是不大关心的。因此在整个框架中，重要的概念只有4个：Domain，instance，dependency和schedule

- Statement与Instance: 接触过编译器的同学知道Instruction或者Statement，代表一行代码。而在循环中的代码，每被执行一次，就会对应到一个instance

![](https://pic1.zhimg.com/v2-2f3c250ec6a600c45c0ba4edb0ea2930_r.jpg)上图的程序里有两个statement（即S1和S2），每个Stmt的每次执行都是一个Instance，在上面的例子中，有S1和S2两个Stmt，S1被执行了N×N次，S2被执行了N×N次，因此总共有2×N×N个instance​

- Domain:对于一个N重循环，每个instance对应的循环可以被表示成一个长度为N的vector。而所有可能的vector的集合就是Domain。

比如上面的例子，对于S1来说，它的domain就是{(0,0), (0,1)....(0,N-1)....(N-1, N-1)}

每个Statement都有自己的Domain

![](https://pic1.zhimg.com/v2-70c4d660fdaa5bd7e485a9ad0cca9032_r.jpg)在上面的例子中，输入是左上角的一段程序，多面体模型的框架会分析这段程序（主要就是把循环拉出来），然后转换成左下角的格式。这里面Domain用了一个不等式来描述：所有满足这个不等式的<i, j>的vector构成的集合就是Domain

从左下角也可以看出来这是一个仿射变换（Affine transformation），这个概念在多面体模型中非常重要（其实就是最基本的线性代数）

- Dependency：我们都知道程序的语句之间会有数据依赖（读写依赖，写写依赖，写读依赖），我们做优化也要遵守这些约束，不然程序快是快了，结果不对，也没用

![](https://pic4.zhimg.com/v2-5a7954c7d8cfc44b872b5499ec28050b_r.jpg)上面的程序，S1的instance互相之间是没有依赖的（你先算A0,0还是A0,1无所谓），但是S2和S1的instance之间是有依赖的，比如S2(k=0,l=0)需要用到A[0,0]，即S1(i=0,j=0)的结果。

![](https://pic2.zhimg.com/v2-d842501bdc838185f71f5a9e9c0ac61b_r.jpg)和Domain的定义类似，dependency也可以用一个仿射变换的不等式表达

<strong>dependency是两个Stmt之间的，不是instance之间</strong>

<strong>多面体优化</strong>

当我们把程序（源代码）转换成多面体模型（就是把Domain，dependency这些信息提取出来）后，我们可以通过数学上的分析将代码做优化。整个多面体优化有各种各样的研究针对于运用这些数据提升代码性能。本文只是一个最基础的概述，自然不能覆盖到所有的。因此这里面只举两个最基础的例子

<strong>（1）发掘并行</strong>

第一个例子摘自 [@要术甲杰](https://www.zhihu.com/people/f3edc0b3c8221a4fa224169746ae9ed0) 的文章

![](https://pic3.zhimg.com/v2-cdea6eb99fd77614679a7733bea14c18_r.jpg)针对于上面的代码，我们可以很轻易的提取出它的Domain和dependency。因为是二维的（两重循环），我们可以直观的把它的Domain和dependency画出来

![](https://pica.zhimg.com/v2-34fe5ca80e529d51100109321fc6bb96_1440w.jpg)Domain就是图上面的一个个黑点，黑点之间的箭头就表示依赖关系（有神经网络图模型内味了。。。）。我们可以发现图中那个又粗又长（听上去怪怪的？）的绿色线条覆盖的5个节点之间没有依赖关系，因此是可以并行的（确切的说任何位于同一条45°的线上面的节点都是没有依赖的）

然而如果我们用的OpenMP的话，那我们只能并行两个循环，也就是说只能让一排或者一列的节点并行。显然斜线是不能并行的

![](https://pic2.zhimg.com/v2-6853252b10e304d2b7632fda9d5d4071_1440w.jpg)借助多面体模型里面的变换（其实就是改变循环），我们可以变换成如上这种形式，就可以愉快的并行了

对应的源代码如下图所示：

![](https://pica.zhimg.com/v2-0f047be867d3db1c5a0b4da862bc48e2_r.jpg)

<strong>（2）增加连续性</strong>

熟悉cache的同学都知道连续性的重要。在这里可以把连续性分成四类：

时间连续性空间连续性相同代码self-temporalself-spatial不同代码group-temporalgroup-spatial
![](https://pica.zhimg.com/v2-79dca7e10d59a07f71cf1a542fe5209c_r.jpg)在上面的代码中，

因为Z[j+1]分别在一段代码的第一个和第三个被访问，因此Z[j+1]拥有group-temporal​ 

因为Z[j]和Z[j+2]在一段代码中被访问，两者一般来说会在同一个cache line中，因此构成了group-spatial​ 

因为在(0,0),(1,0)中Z[j]都会被同一段代码访问同一个位置(Z[0])，因此拥有self-temporal​ 

同理Z[0]Z[1]会被同一段代码在两次迭代中相继访问，因此拥有self-spatial

首先我们来看一个针对self-temporal做优化的例子。我们知道，如果我连续两个迭代访问的是同一个array的元素，那么这种情况我们就有self-temporal

这里面先引入一个概念，就是我们如何通过仿射变换描述对于某个statement，循环向量和访存之间的关系。

```text
for i in range(N):
    for j in range(N):
        f(X[i-1]) # S1
        f(Y[i, j]) # S2
```

那我们也可以通过如下仿射变换分别描述S1与S2中循环向量(<i, j>)与访存的关系：

![](https://pica.zhimg.com/v2-f7e39057a073df4ad7e6c8d13322ecfc_1440w.jpg)那我们怎么用数学表达式表达self-temporal呢？其实很简单，如下所示，假设对于某个statement，我们分析可以把它的矩阵F和向量f拿出来

![](https://www.zhihu.com/equation?tex=F%5Cvec+%7Bi1%7D+%2B+%5Cvec%7Bf+%7D%3D+F%5Cvec+%7Bi2%7D+%2B+%5Cvec%7Bf%7D) 

![](https://www.zhihu.com/equation?tex=abs%28%5Cvec%7Bi1%7D-%5Cvec%7Bi2%7D%29+%3D+%3C1%2C0%2C0%3E+or+%3C0%2C+1%2C+0%3E+or+%3C0%2C+0%2C+1%3E) 

如果某两个迭代(向量i1与向量i2)访问同样的元素，而且i1和i2之间只有一维差1（即同时满足上面两个条件，假设是3重循环），那么这就是一个self-temporal的例子

进一步做数学变换，我们发现<strong>如果矩阵F的零空间里面存在只有一个1，剩下都是0的向量（实在抱歉我忘了他的学名是什么了），那么就说明我们可以通过仿射变换得到self-temporal</strong>

![](https://www.zhihu.com/equation?tex=F%28%5Cvec+%7Bi1%7D+-++%5Cvec+%7Bi2%7D+%29+%3D+0) 

对于下面的例子，我们可以把这个Stmt对应的矩阵F直接列出来

![](https://pica.zhimg.com/v2-c70a808a795a87e528dcd2cbb2af40d2_r.jpg)假设我们按照i,j,k的顺序列的话，那么F就是

![](https://pic3.zhimg.com/v2-016c7efab4181d11a665bf601b893bd8_1440w.jpg)它的一个零向量就是<0,0,1>，我们发现这个向量正好就是只有一个1的向量，也就是说<strong>当只在K一维做变化，两次迭代访问的是同一块内存，因此考虑把k作为最后一个循环</strong>

![](https://pic2.zhimg.com/v2-4db2dd186481fe40c63edf5601a4e20b_r.jpg)所以我们就直接把k拿到最里面，这样访存就快了很多

除了self-temporal的例子，我们再来看一个group-spatial的例子

```text
for i in range(N):
    for j in range(N):
        f1(A[i, j])
        f2(A[i+1, j)
```

假设我们有上面的代码，那么很显然第一个Stmt的访存仿射变换就是

![](https://www.zhihu.com/equation?tex=%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%26+0+%5C%5C++++0+%26+1+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++i+%5C%5C++++j+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C++%2B+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++0+%5C%5C++++0+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+) 

第二个矩阵就是

![](https://www.zhihu.com/equation?tex=%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%26+0+%5C%5C++++0+%26+1+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++i+%5C%5C++++j+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C++%2B+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%5C%5C++++0+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+) 

我们将两个式子联合在一起，去看当什么情况他们会访问同样的位置

![](https://www.zhihu.com/equation?tex=%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%26+0+%5C%5C++++0+%26+1+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++i1%5C%5C++++j1+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C++%2B+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++0+%5C%5C++++0+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C++%3D+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%26+0+%5C%5C++++0+%26+1+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++i2+%5C%5C++++j2+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C++%2B+%5Cleft%5B+%5Cbegin%7Bmatrix%7D++++1+%5C%5C++++0+++%5Cend%7Bmatrix%7D+%5Cright%5D+%5C+) 

<strong>解出来发现当i1=i2+1, j1=j2的时候，他们会访问一样的位置，也就是如果i1比i2少一轮，他们就可以同时在一次迭代访问相同的位置了</strong>

上面说的有点抽象，实际上如果我们做下面的一个变化呢，就可以得到group-spatial

```text
for j in range(N):
    f1(A[0, j])
for i in range(1, N):
    for j in range(N):
        f1(A[i, j])
        f2(A[i, j)
```

多面体优化只能做仿射变换来改变代码结构。但是仿射变换有很多种，通常来说已经可以应付一般的优化需求了。

![](https://pic4.zhimg.com/v2-c404393cda17acf815d31eb38232bf89_r.jpg)
![](https://pic2.zhimg.com/v2-be3a51ca6d1ed7d54085ba911d6101d1_r.jpg)上面是几个仿射变换以及对应的代码变换的例子。

<strong>呼，累死我了，最后再打两个广告：</strong>

<strong>如果你对我今天介绍的方向感兴趣，可以考虑加入上海交通大学清源实验室一起搞事情！（作者目前就在这里当RA）。</strong>

<strong>老板是徐宁仪(Michael Xu)。小组专注于解决在超算，边缘计算及传感器等领域面临的挑战。组内的技术栈比较全面(系统，体系结构，硬件，算法，HPC)。目前在招PostDoc researchers, tenure track assistant/associate Professors, Master/Ph.D student and visiting researchers(是的没看错，几乎所有的position都有)。有意向的同学可以发简历给我，或者直接联系老板 xuningyi@sjtu.edu.cn。我个人反正非常期待你的加入，咱们可以深入交流一下</strong>

[上海交通大学清源研究院](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s%3F__biz%3DMzU3MjEzOTU2Mg%3D%3D%26mid%3D2247483912%26idx%3D1%26sn%3D3e16637ca81266335c277af52d6fff9d%26chksm%3Dfcd4334dcba3ba5b50b0976850d85f38c12b38c21fc54db88aba25e2e262f2dba1b205321ebb%26mpshare%3D1%26scene%3D1%26srcid%3D1124HnUognIbMD4pUS6rjzv8%26sharer_sharetime%3D1606217565755%26sharer_shareid%3D871ef9b6b4ecdcfb086ad4485a1d2054%26exportkey%3DAQ%252FOH%252F%252BRk6mLmGLJfYAIhDk%253D%26pass_ticket%3DZraprnTYe2hksCIKd5JJtH7U65AtW6b4AdGYDXyrwoRvoTfLp0%252BVOHgZVGjI0p%252FP%26wx_header%3D0%23rd)