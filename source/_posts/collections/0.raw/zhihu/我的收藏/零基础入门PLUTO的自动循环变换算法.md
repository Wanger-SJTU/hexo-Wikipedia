---
title: "(2 条消息) 零基础入门PLUTO的自动循环变换算法"
date: "2023-06-14 00:00:00"
updated: "2023-06-14 00:00:00"
layout: "post"
permalink: "/collections/0.raw/zhihu/我的收藏/零基础入门PLUTO的自动循环变换算法/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "知乎"
source_url: "https://zhuanlan.zhihu.com/p/631634938"
---


本文主要聚焦于PLUTO原始论文[1]的第三章，详细介绍<strong>PLUTO算法中通过循环变换生成permutable band的具体做法</strong>。相比于Gri04[2]介绍的：先用Feautrier算法求出一个合法的调度再求解Placement两步走的做法，PLUTO算法直接求得一个完全可交换循环带的变换，然后基于变换后的迭代空间进行分块、并标记坐标轴作为时间维度还是空间维度、然后进行代码生成。根据作者的阐述，这样可以得到一个比Gri04局部性更好、数据传输量更小的解。（原因解释：TODO1）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e94faef761e7.jpg)

受限于本人学习效率不高和智力不足等因素，我这两周刚勉强把PLUTO第三章看懂，<strong>然而第三章的知识并不闭环</strong>，它没有讲解——

1）当PLUTO无法求解出一个和原始迭代空间最大维度相同维度的变换时该如何做；

2）PLUTO相比于Feautrier算法的优势；

3）求解得到permutable band后分块的原则（比如遇到long dependency该怎么办）；

4）分块后如何进行波阵面化和代码生成？生成的循环嵌套代表时间维度还是空间维度是由什么因素决定？（是内层的循环表示并行化好？还是外层循环表示并行化好？）有着不同代价函数值上限的循环该以什么样的顺序进行排列？等等诸如此类我能想到但不知道该怎么解决的问题（以及其他我没有想到的问题）。

所以非常惭愧，本文更多地还是在解释[HOW] to Transform to create a Permutable Band，而不是[WHY]，这与我一贯的行文风格不同。不过由于多面体的学习曲线实在过于陡峭，<strong>我已经半个月没有写新的公众号文章了！</strong>考虑过后我决定还是先写一个肤浅的初稿，没有写明白的地方会先标记为TODO，跟大家多多交流，听取建议，等我对PLUTO有更深刻的理解后再补充完善，非常感谢大家的包容和理解嘤嘤嘤~~~


### 一、PLUTO循环变换算法的目标

PLUTO的循环变换算法旨于寻找一个原始迭代空间上的多维仿射变换，使得所有依赖的affine components都满足非负的条件（3.3式），同时希望这样的差尽可能小（3.4式尽可能小），并且想要尽量多的得到这样线性不相关的多维仿射变换，将变换得到的循环组合起来构成permutable band——因为交换这些循环的顺序不违反程序依赖，所以是permutable的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9b5d37aaa38d.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e625328887ea.jpg)

<strong>3.3式的条件使得经过这样变换后的迭代空间以任意矩形形状进行分块都是合法的。</strong>分块的好处在于：对时间维度分块可以减少同步的频率；对空间维度分块一方面受限于物理处理器数量的限制不得不合并虚拟的空间节点，并且也可以减少跨处理器的通信量。

分块变换可以改变循环的执行顺序，将n层循环嵌套拆分成2n层循环嵌套，前n层表示分块之间的迭代顺序，后n层表示分块内部实例的迭代顺序，而不违反原始程序的所有依赖关系。原因在于所有原程序中的依赖关系在经过PLUTO循环变换算法后都指向超平面相等或更大值的方向——事实上Gri04论文按Feautrier和FCO Placement变换后得到的时间维度和空间维度也满足3.3式的条件，进而也实现了可以对变换后的迭代空间任意进行矩形分块的目标，参见：《[零基础入门多面体编译的FCO Placements](https://zhuanlan.zhihu.com/p/624335201)》。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d8f97c6eb7be.jpg)

当仿射函数表示时间维度时，3.4式表示存在数据依赖的迭代实例映射到时间超平面上间隔的虚拟时间，物理含义是数据的时间重用距离，距离越长则意味着数据访问的时间局部性越不好；类似地，当仿射函数表示空间维度时，3.4式表示数据依赖跨越的空间超平面的数量，使用它可以大致估计出分块后跨处理器的数据通信量（而且这个估计值还是仿射的）。

如下图所示[5]，当空间超平面为135°的斜线时，向量(1, 1)表示空间超平面的法向量，是仿射函数值增加的方向。对于原程序迭代实例之间存在的三类依赖关系，粉色依赖跨越2个空间超平面，蓝色跨越1个，紫色没有跨越。当我们进行分块的时候，表示不同处理器上的分块的迭代实例之间如果存在依赖，我们把源点标记出来，用跟空间超平面平行的线段把这些源点连接起来，如(c)图中的两条红线。<strong>因为程序中所有依赖最多跨越了2个空间超平面，所以会发生跨处理器数据传输的迭代实例也构成了2条线段位于分块的边界上。</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6e568a9547cc.jpg)

同理，如果超平面为水平的斜线时，向量(0, 1)表示空间超平面的法向量，是仿射函数值增加的方向。此时原程序所有依赖最多只跨越1个空间超平面，进而当我们分块时，会发生跨处理器数据传递的迭代实例值构成了1条线段位于分块的边界上。

综上这两个都满足正确性的空间分块方案，下面的分块方式可以更好地减少系统的通信量，<strong>体现了3.4式是对分块后跨处理器数据通信量的一个很好的仿射形式的估计值</strong>。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d0c7f1bba6ab.jpg)


### 二、PLUTO循环变换算法的求解过程

PLUTO循环变换算法的目标是：为程序中<strong>每一个静态语句</strong>都生成一个多维仿射变换满足以下四点条件。

1）满足3.3式的合法性条件；

2）尽力最小化3.4式代价函数的值；

3）避免求得系数为全0的平凡解；

4）所有求解得到的仿射函数都彼此线性无关——即，任意一维仿射函数都不能用其他的一维仿射函数来线性表示。


对于1）的目标，使用Farkas引理将一个定义域在多面体的约束下永远非负的仿射函数用非负的系数（Farkas因子）和多面体约束的线性组合进行表示，以线性化不等式中的非线性因子（即，未知的待求系数和循环变量的乘积）；然后令等式左右两边关于循环变量的系数各自相等以消除等式中的循环变量和结构参数。<strong>最终得到只包含Farkas因子和待求的仿射函数系数的等式、以及Farkas因子大于等于0的约束。以上的过程应用于程序中</strong>[每一个依赖关系]（每一个依赖关系都对应一个依赖多面体）**，每一次应用Farkas引理推导得到的约束条件需要整合起来，这些条件最终需要同时被满足。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_256d41dfb259.jpg)


对于2）的目标，考虑到3.4式代价函数是关于循环变量的仿射函数，结构参数既然可以仿射地限制住循环变量的变化范围，也应当存在一个如3.5式表示的关于结构参数的仿射函数，是3.4式代价函数的上限，并且该上限函数对于系统中[每一个依赖]都成立。<strong>我们并不追求3.5式非常逼近3.4式，而是希望3.5式能表示出它作为一个关于结构参数的函数的</strong>物理含义**：同一个系统，迭代空间增大，所包含的依赖不会减少，所以系统开销的上限不会减小。——即，3.5式中关于系统结构参数的系数u应当是非负的。最终得到3.6式和3.7式。

如3.8式所示，我们同样应用Farkas引理将3.7式中<strong>每一个依赖多面体对应</strong>的不等式转换为用多面体边界表达式的非负线性组合来表示的等式，然后用跟1）相同的做法消除循环变量和结构参数，得到关于Farkas因子和待求的仿射函数系数的等式、以及Farkas因子大于等于0的约束。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2172f0dc9275.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5af51b88d7cd.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1c528a3c0fae.jpg)

另外，依赖距离过大也会制约分块大小（tiling width）的取值，优化3.5式的代价函数的上限可以限制依赖距离，增加程序优化的可能。这点我们留在以后再盘，迫不及待的小伙伴可以阅读Gri04[2]的第10章。（TODO2）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_da9b570a64dd.jpg)


对于3）的目标，循环变换仿射系数为全0的平凡解会把所有迭代实例映射至相同的虚拟时间节点上或相同的处理器上，失去并行性。为避免这样的解，一个直观的想法是为[每个静态语句]**增加如3.10式的约束条件。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b376ae16ccde.jpg)

然而从一个凸集中刨去一个凸集（一个全0的向量）会得到一个非凸集合，而Simplex Algorithm只能在凸集上进行lexmin的求解，所以需要将一个非凸集合分裂成多个凸集合（数量与原始凸集合的维度相关）分别求解，并取这多个凸集中的字典序最小值。这会导致算法的复杂度与静态语句的数量成指数级别的关系。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fa27fef38b3f.jpg)

所以，为避免算法指数级别的爆炸，<strong>PLUTO循环变换算法大刀阔斧地增加了[系数向量c每个元素大于等于0]的限制，并且系数和大于等于1意味着消去了全0的平凡解。——施加了这两条约束条件的多面体仍然是凸集。</strong>系数向量每个元素大于等于0的约束条件会使我们失去关于程序循环反转变换的可能，然而根据作者描述，这并不太影响性能。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_044c50658a4e.jpg)

另外，PLUTO+算法[4]通过假设系数向量有边界的限制、用一种类似于进制的方式表示出系数空间上的一个<strong>单射的仿射函数</strong>，于是只有全0的系数会对应于为0的函数值，最终对于每个静态语句只需要考虑在两个凸集的并集上求解lexmin。虽然这仍然存在指数级的爆炸，但从一定程度上减小了求解存在循环反转变换可能性时解空间的大小。关于PLUTO+算法的详细解析我们留作以后再盘：（TODO3）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7b783257b9cd.jpg)


综合1）、2）、3）前三点，我们已经列出了为求解程序中所有静态语句的一维仿射函数的系数需要满足的所有约束条件。

我们接下来对这些约束条件使用Gaussian消去法和Fourier-Motzkin消去法[7]消去约束条件中的Farkas因子，仅保留①代价函数上限的系数：向量u和标量w、②以及循环变换的系数：向量c<strong>——将这些参数视为多面体约束下的自由变量，并将3.9式的字典顺序的最小值设为多面体约束内的优化目标，用Simplex Algorithm算法求解[3]。</strong>（与FCO Placement算法求解多面体cone的rays和lines的方法不同）**

3.9式将代价函数上限的系数u作为字典序权重最高的部分，体现了代价函数<strong>渐进最小化</strong>的优化目标。因为当u向量为全0时，代价函数上限是一个常数（O(1)），与结构参数无关；否则代价函数上限的量级是O(N)，其中向量N代表结构参数。算法导论告诉我们当结构参数非常大的时候要倾向于O(1)的解。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ae5fbb1bc734.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_88ce8bc96485.jpg)


对于4）的目标，我们会在已经求得的一维或多维线性无关的仿射函数的基础上，继续为所有静态语句求得一组新的一维仿射函数，并且与已求得的仿射函数都线性无关。

为此我们根据线性代数的知识，按3.11式首先求出跟已求得的仿射函数系数都正交的矩阵。该正交矩阵的行向量跟已有的系数解都线性无关，如果我们接来能求得一组新的系数解跟正交矩阵的某个行向量线性相关，可得出该系数解跟已有的所有系数解都线性无关。

存在一个正交矩阵的行向量跟待求的系数解线性相关即需要满足：待求系数向量和正交矩阵所有行向量的内积之和的绝对值<strong>大于等于1。跟之前关于解空间最好是凸集的讨论相同，考虑到在第3）步中已经施加了“</strong>系数向量c每个元素大于等于0的约束条件<strong>”（注：向量c就是3.12式的hS），</strong>我们这里继续大刀阔斧地舍弃一半的解，即限制待求的解跟正交矩阵行向量正相关**——于是有3.12式的左面任意向量内积之和大于等于0的约束，以及右面内积之和大于等于1的约束条件。不难看出，3.12式的约束条件是仿射的，我们不会造成解空间的指数级爆炸。

将3.12式求得的约束条件添加至前3步的约束条件中，继续用Simplex Algorithm算法求得一组lexmin，可以得到跟之前解都线性无关的一组一维仿射变换的系数值。不断重复这一过程，直至添加的约束使得多面体无解。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ecd18330bfff.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_08f439cd4ced.jpg)


### 三、PLUTO循环变换算法的求解示例

考虑一个比赵捷老师书里P122页更复杂的一个例子（尽管我这里举的例子也是perfect loop nest的），我们对这个程序找寻一组循环变换得到permutable band。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7741353d121e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ca227a1f92f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1545d2d07be0.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_10285a4c60f3.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_054158720718.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_509ac914294c.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_6ef59228d0a1.jpg)

我们使用isl工具验证得到的约束和我们手工用推导的结果是一致的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3b5cf9a27b8d.jpg)

关于依赖2代价函数上限最小化约束条件的求解采用跟上面一样的方法，这次就不手工推了，直接通过isl工具得到结果如下所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2d8ac78e8980.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_25f78d1c2de7.jpg)

整理目前得到的所有约束条件用isl工具求解lexmin。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ee9a5b3c024.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d44d24218dc2.jpg)

再继续求解第2组线性无关的仿射函数的系数。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b0ea4e53a1f0.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2929f573a715.jpg)


### 四、调用C语言风格的isl API进行Fourier-Motzkin Elimination运算消去Farkas因子并计算集合的lexmin**（Updated on 2023/06/14）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4ed19ab18a33.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8059e2911515.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_66192bb1e249.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ee4777dc284e.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b06765de96f0.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bc8225734ae8.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_06a800ad17bf.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5a93d83208f5.jpg)


### 五、PLUTO循环变换算法总结

每一类的依赖关系都可以用一个依赖多面体来表示，尽管依赖的源点和汇点可能处于不同的迭代空间中，但也只对应一个依赖多面体，并且是否处于不同的迭代空间并不影响1）和2）约束条件的推导；

基于每一个依赖多面体的迭代空间，都需要依据合法性条件1）、或代价函数最小化条件2）的非负仿射函数，应用一次Farkas引理，然后使用高斯消去法和FM消去法消去Farkas因子，推导出关于待求系数的约束条件，最终这些条件需要被添加到一个[集合C]里被同时满足——所以关于1）和2），限制条件的添加是<strong>per-dependency</strong>的；

对于非平凡解条件3），限制条件添加到[集合C]里则是<strong>per-statement</strong>的，即每一个静态语句会对应一个不同的仿射变换，我们希望求得的每一个仿射变换都不要是一个平凡解；

令前三步[集合C]里添加的约束条件同时满足可以为<strong>每一个静态语句</strong>求解一组对应的<strong>[一维]仿射变换</strong>同时满足1）2）3）的条件。求解的方法是使用Simplex Algorithm在[集合C]约束构成的多面体中（注意，这个多面体不是之前说的依赖多面体了！）求解lexicographic-minimum；

对于求解多维仿射函数4），需要在[集合C]的基础上，根据已求得的<strong>多维仿射函数</strong>，添加了线性无关的约束条件得到[集合C’]，重复使用Simplex Algorithm在[集合C’]约束构成的多面体中求解lexicographic-minimum；

[集合C]只需要求解一次便是固定不变的，而线性无关的约束条件是在为程序中所有静态语句每求得一组新的一维仿射函数后，重新计算，得到的约束条件和[集合C]合并得到[集合C’]。

重复第4）步，直至求解出一个和原始迭代空间最大维度相同维度的permutable band。


我们现在再来看Pluto automatic transformation algorithm的伪代码，除了蓝色的部分暂时还看不懂以外，其他的我们是不是已经理论结合示例讲解非常清楚了呢！夸我！！夸我！！！（全文完）

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b4bd49aebc75.jpg)

### 六、参考文献

[1] Bondhugula, Uday Kumar. *Effective automatic parallelization and locality optimization using the polyhedral model*. Diss. The Ohio State University, 2008.

[2] Griebl, Martin. Automatic parallelization of loop programs for distributed memory architectures. Passau, Germany: Univ. Passau, 2004.

[3] Paffenholz, Andreas. "Polyhedral geometry and linear optimization." Technische Universität Darmstadt (2010).

[4] Acharya, Aravind, and Uday Bondhugula. "Pluto+: Near-complete modeling of affine transformations for parallelism and locality." ACM SIGPLAN Notices 50.8 (2015): 54-64.

[5] 《多面体编译理论与深度学习实践》赵捷、李宝亮

[6] 《[零基础入门多面体编译的FCO Placements](https://zhuanlan.zhihu.com/p/624335201)》流霞祭司曌鹓鶵

[7] 《[零基础入门多面体的迭代空间和Fourier-Motzkin Elimination](https://zhuanlan.zhihu.com/p/616813296)》流霞祭司曌鹓鶵


### 附录A：论文中的疑似笔误

1. P51：第一个任意量词符号应该是存在，即，待求的行向量只需要跟正交矩阵中的某一个行向量存在相关性就足够了，不需要所有；

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2a5dce4a3ab8.jpg)

2. P58：依赖2的代价函数公式写错了；

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_81878a196c1b.jpg)

3. P59：求解正交矩阵的公式写错了；

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9e321d42af7b.jpg)