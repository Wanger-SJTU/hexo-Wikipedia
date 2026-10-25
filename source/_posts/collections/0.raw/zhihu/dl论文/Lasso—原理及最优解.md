---
title: Lasso—原理及最优解
date: "2020-03-25 00:00:00"
updated: "2020-03-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/Lasso—原理及最优解/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/116869931
---


Lasso方法最早由Robert  Tibshiran于1996年提出，文章发表在“统计四大”之一的皇家统计学会期刊上，尽管至今已有二十多年，但依然有着广泛的应用，由其发展出的方法层出不穷。本文着重介绍一下Lasso的原理以及2个最优解解法。

0.必要知识背景

0.1 线性模型的最小二乘估计
考虑线性模型：

![](https://www.zhihu.com/equation?tex=+~~~~~~~~~~~~~~~~~~~~~~~~~~~%5Cbegin%7Balign%7D+y%3D%5Cboldsymbol%7BX%7D%5Cbeta%2B%5Cepsilon%2C~~~E%28%5Cepsilon%29%3D0%2C~~~Cov%28%5Cepsilon%29%3D%5Csigma%5E2I+%5Cend%7Balign%7D+) 

的参数 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 和 
![](https://www.zhihu.com/equation?tex=%5Csigma%5E2) 的估计问题，这里 
![](https://www.zhihu.com/equation?tex=y) 是 
![](https://www.zhihu.com/equation?tex=n%5Ctimes1) 观测向量， 
![](https://www.zhihu.com/equation?tex=%5Cboldsymbol%7BX%7D) 为 
![](https://www.zhihu.com/equation?tex=n%5Ctimes+p) 的设计矩阵， 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 是 
![](https://www.zhihu.com/equation?tex=p%5Ctimes1) 未知参数向量， 
![](https://www.zhihu.com/equation?tex=%5Cepsilon) 为随机误差， 
![](https://www.zhihu.com/equation?tex=%5Csigma%5E2) 为误差的方差。

估计参数向量 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的基本方法是**最小二乘法**，其思想是使得误差向量 
![](https://www.zhihu.com/equation?tex=%5Cepsilon%3Dy-%5Cboldsymbol%7BX%7D%5Cbeta) 尽可能的小（这样我们损失的样本信息就尽可能的少），也就是使

![](https://www.zhihu.com/equation?tex=+~~~~~~~~~~~~~~~~~~Q%28%5Cbeta%29%3D%7C%7C%5Cepsilon%7C%7C%5E2%3D%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2%3D%28y-%5Cboldsymbol%7BX%7D%5Cbeta%29%27%28y-%5Cboldsymbol%7BX%7D%5Cbeta%29+) 

到达最小。解的过程略，最后，使得上式达到最小值的解为

![](https://www.zhihu.com/equation?tex=~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+%5Chat%7B%5Cbeta%7D%3D%28%5Cboldsymbol%7BX%7D%27%5Cboldsymbol%7BX%7D%29%5E%7B-1%7D%5Cboldsymbol%7BX%7D%27y) 

在大数据还没兴起之前，我们接触的数据大部分都是 
![](https://www.zhihu.com/equation?tex=n%3Ep) ，即样本数大与变量数，做计量的同学应该很熟悉，这时候，若 
![](https://www.zhihu.com/equation?tex=rank%28%5Cboldsymbol%7BX%7D%29%3Dp) ，则 
![](https://www.zhihu.com/equation?tex=%5Cboldsymbol%7BX%7D%27%5Cboldsymbol%7BX%7D) 可逆，这时， 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 是 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的无偏估计，称 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 为 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的**最小二乘估计**，最小二乘估计有很多优良的性质，在此不再赘述。但是，若 
![](https://www.zhihu.com/equation?tex=rank%28%5Cboldsymbol%7BX%7D%29%3Cp) ，不满秩，那这时候就不存在 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的无偏估计，称 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 是不可估的。不满秩的原因之一就是变量间存在线性关系，在计量经济学上成为共线性，因此计量的实证分析大都要做一些检验，抛开不表。为了解决这一问题，就有了**岭回归（Ridge Regression）**方法，简单来说，岭回归就是在前面最小化目标函数 
![](https://www.zhihu.com/equation?tex=Q%28%5Cbeta%29) 的后面加了一个2-范数的平方（范数接下来会讲）：

![](https://www.zhihu.com/equation?tex=Q%28%5Cbeta%29%3D%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2%2B%5Clambda%7C%7C%5Cbeta%7C%7C%5E2_2%5C%5C+%5Cstackrel%7B%7D%7B%5CLongleftrightarrow%7D~~%5Carg%5Cmin%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2~~~s.t.~%5Csum%5Cbeta%5E2_j%5Cleq+s) 

 上式求解就可得到 
![](https://www.zhihu.com/equation?tex=%5Cbeta) 的岭估计：

![](https://www.zhihu.com/equation?tex=~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+%5Chat%7B%5Cbeta%7D%28%5Clambda%29%3D%28%5Cboldsymbol%7BX%7D%27%5Cboldsymbol%7BX%7D%2B%5Clambda+I%29%5E%7B-1%7D%5Cboldsymbol%7BX%7D%27y) 

从上面我们可以明显看到 
![](https://www.zhihu.com/equation?tex=%5Clambda+I) 保证了 
![](https://www.zhihu.com/equation?tex=%5Cboldsymbol%7BX%7D%27%5Cboldsymbol%7BX%7D%2B%5Clambda+I) 满秩、可逆，当然也由于其加入，此时的 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D%28%5Clambda%29) 是一个有偏估计。关于 
![](https://www.zhihu.com/equation?tex=%5Clambda) 的选择，有Horel-Kennard公式、岭迹法、交叉验证法......

因为本文主要介绍Lasso方法，在此不再做过多介绍，感兴趣的同学可以自行查阅相关资料。

0.2 范数（norm）

向量的范数
**向量的 1-范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C_1%3D%5Csum%5En_%7Bi%3D1%7D%7Cx_i%7C) 向量内各元素的绝对值之和

**向量的 2-范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C_2%3D%28%5Csum%5En_%7Bi%3D1%7Dx%5E2_i%29%5E%7B%5Cfrac%7B1%7D%7B2%7D%7D%3D%5Csqrt%7B%5Csum%5En_%7Bi%3D1%7Dx%5E2_i%7D)  元素的平方和再开平方，一般就直接写 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C) 不加下标了。

**向量的 p-范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C_p%3D%28%5Csum%5En_%7Bi%3D1%7D%7Cx_i%7C%5Ep%29%5E%7B%5Cfrac%7B1%7D%7Bp%7D%7D) 

**向量的无穷范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C_%7B%5Cinfty%7D%3D%5Cmax%5Climits_%7B1%5Cleq+i%5Cleq+n%7D%7Cx_i%7C) 

矩阵的范数
**矩阵的 1-范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CA%7C%7C_1%3D%5Cmax%5Climits_%7BX%5Cnot%3D0%7D%5Cfrac%7B%7C%7CAX%7C%7C_1%7D%7B%7C%7CX%7C%7C_1%7D%3D%5Cmax%5Climits_%7B1%5Cleq+j%5Cleq+n%7D%5Csum%5En_%7Bi%3D1%7D%7Ca_%7Bij%7D%7C)  矩阵的每一**列**上的元素绝对值先求和，再从中取个最大的（列和最大）

**矩阵的 2-范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CA%7C%7C_2%3D%5Cmax%5Climits_%7BX%5Cnot%3D0%7D%5Cfrac%7B%7C%7CAX%7C%7C_2%7D%7B%7C%7CX%7C%7C_2%7D%3D%5Csqrt%7B%5Clambda_%7Bmax%7D%28A%5ETA%29%7D%3D%5Csqrt%7B%5Cmax%5Climits_%7B1%5Cleq+i%5Cleq+n%7D%7C%5Clambda_i%7C%7D) 其中 
![](https://www.zhihu.com/equation?tex=%5Clambda_i) 为 
![](https://www.zhihu.com/equation?tex=A%5E%7BT%7DA) 的特征值，2-范数即为矩阵 
![](https://www.zhihu.com/equation?tex=A%5E%7BT%7DA+) 的最大特征值开平方。

**矩阵的无穷范数**： 
![](https://www.zhihu.com/equation?tex=%7C%7CA%7C%7C_%7B%5Cinfty%7D%3D%5Cmax%5Climits_%7BX%5Cnot%3D0%7D%5Cfrac%7B%7C%7CAX%7C%7C_%7B%5Cinfty%7D%7D%7B%7C%7CX%7C%7C_%7B%5Cinfty%7D%7D%3D%5Cmax%5Climits_%7B1%5Cleq+i%5Cleq+n%7D%5Csum%5En_%7Bj%3D1%7D%7Ca_%7Bij%7D%7C)  矩阵的每一**行**上的元素绝对值先求和，再从中取最大的（行和最大）。**但还有一种情况**，在很多的统计论文中，更常用的是把矩阵的无穷范数定义为矩阵中最大的元素： 
![](https://www.zhihu.com/equation?tex=%7C%7CX%7C%7C_%7B%5Cinfty%7D%3D%5Cmax%5Climits_%7Bi%2Cj%7DX_%7Bij%7D) 

 这里只是借机会都给大家列出来了，本文并不需要用到这么多种范数。
1. Lasso原理
与岭回归类似，Lasso就是在目标函数 
![](https://www.zhihu.com/equation?tex=Q%28%5Cbeta%29) 后面加了一个1-范数 

![](https://www.zhihu.com/equation?tex=Q%28%5Cbeta%29%3D%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2%2B%5Clambda%7C%7C%5Cbeta%7C%7C_1%5C%5C+%5Cstackrel%7B+%7D%7B%5CLongleftrightarrow%7D~~%5Carg%5Cmin%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2~~~s.t.~%5Csum%7C%5Cbeta_j%7C%5Cleq+s) 

**Lasso的提出在岭回归之后，为啥加1-范数的Lasso没有加2-范数的岭回归早？**

可能是因为1-范数作为绝对值之和不方便求导吧（个人猜测），因为做理论统计的学者提出一个新方法，不光要说明这个方法好，还要说明为啥好、哪里好。

**为什么至今Lasso仍长青不老？**

因为它可以解决现在高维数据一个普遍问题——**稀疏性**。高维数据即 
![](https://www.zhihu.com/equation?tex=p%3En) 的情况（超高维是 
![](https://www.zhihu.com/equation?tex=p%5Cgg+n) ，这里不讨论），现在随着数据采集能力的提高，变量（也叫特征）数采集的多，但是其中可能有很多特征是不重要的，系数很小，如果用岭回归，可能这个不重要的变量也给你估出来了，而且可能还不小，而用Lasso方法，就可以把这些不重要变量的系数压缩为0，既实现了较为准确的参数估计，也实现了变量选择（降维）。

**那为什么Lasso可以估计出系数为0？**

我们以Tibshiran在文章中举的 
![](https://www.zhihu.com/equation?tex=p%3D2+) 的例子来讲（我这相当于把他文章的2.3节翻译给大家了）

首先我们假设 
![](https://www.zhihu.com/equation?tex=X%27X) 是满秩的，这样就可以用最小二乘法估计出来 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) ，对于 
![](https://www.zhihu.com/equation?tex=%7C%7Cy-%5Cboldsymbol%7BX%7D%5Chat%5Cbeta%7C%7C%5E2%3D%28y-%5Cboldsymbol%7BX%7D%5Chat%5Cbeta%29%27%28y-%5Cboldsymbol%7BX%7D%5Chat%5Cbeta%29) ，它也可以写成 
![](https://www.zhihu.com/equation?tex=%28%5Cbeta-%5Chat%7B%5Cbeta%7D%29%27%5Cboldsymbol%7BX%7D%27%5Cboldsymbol%7BX%7D%28%5Cbeta-%5Chat%7B%5Cbeta%7D%29) ，在下图中以椭圆表示：

![](https://pic4.zhimg.com/v2-03423e813714ce8bcd0d4246880f4833_r.jpg)上图中（a）是Lasso估计图（b）是岭回归的估计图，横纵坐标分别表示 
![](https://www.zhihu.com/equation?tex=%5Cbeta_1%2C%5Cbeta_2) ，黑色部分表示两种方法的约束

![](https://www.zhihu.com/equation?tex=Lasso%3A%7C%5Cbeta_1%7C%2B%7C%5Cbeta_2%7C%5Cleq+s%5C%5C+Ridge%3A%5Cbeta%5E2_1%2B%5Cbeta%5E2_2%5Cleq+s+) 

从图中可以看出，Lasso方法与之相交的地方恰为 
![](https://www.zhihu.com/equation?tex=%280%2C%5Cbeta_2%29) ，而从图中也可以看出 
![](https://www.zhihu.com/equation?tex=%5Chat%5Cbeta) 所处的位置本就是 
![](https://www.zhihu.com/equation?tex=%5Cbeta_2) 大， 
![](https://www.zhihu.com/equation?tex=%5Cbeta_1) 小，我们取Lasso的结果，意味着 
![](https://www.zhihu.com/equation?tex=%5Cbeta_1) 的系数被压缩到了0。

你可能觉得，这个交点离着 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 也太远了吧，这里要解释两点：一是做这样的图是为了更直观，所以有所夸大。二是，不管Lasso还是岭估计，它们都是有偏估计，肯定会与通过最小二乘法得到的无偏估计 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D) 有差距。

2. Lasso 最优解
Lasso因为其约束条件（也有叫损失函数的）不是连续可导的，因此常规的解法如梯度下降法、牛顿法、就没法用了。接下来会介绍两种常用的方法：**坐标轴下降法**与**最小角回归法**。

2.1 坐标轴下降法
坐标轴下降法是一种迭代算法，与梯度下降法利用目标函数的导数来确定搜索方向不同，坐标轴下降法是在当前坐标轴上搜索函数最小值，不需要求目标函数的导数。

以2维为例，设损失函数为凸函数 
![](https://www.zhihu.com/equation?tex=J%28x%2Cy%29) ，在初始点固定 
![](https://www.zhihu.com/equation?tex=x_0) ，找使得 
![](https://www.zhihu.com/equation?tex=J%28y%29) 达到最小的 
![](https://www.zhihu.com/equation?tex=y_1) ，然后固定 
![](https://www.zhihu.com/equation?tex=y_1) ，找使得 
![](https://www.zhihu.com/equation?tex=J%28x%29) 达到最小的 
![](https://www.zhihu.com/equation?tex=x_2) ，这样一直迭代下去，因为 
![](https://www.zhihu.com/equation?tex=J%28x%2Cy%29) 是凸的，所以一定可以找到使得 
![](https://www.zhihu.com/equation?tex=J%28x%2Cy%29) 达到最小的点 
![](https://www.zhihu.com/equation?tex=%28x_k%2Cy_k%29) 。（如下图）

![](https://pic1.zhimg.com/v2-bed62f0368e241b9324cb195d8ae938e_r.jpg)在 
![](https://www.zhihu.com/equation?tex=p) 维的情况下，同理，参数 
![](https://www.zhihu.com/equation?tex=%5Ctheta) 为 
![](https://www.zhihu.com/equation?tex=p) 维向量，固定 
![](https://www.zhihu.com/equation?tex=p-1) 个参数，计算剩下的那个参数使得凸函数 
![](https://www.zhihu.com/equation?tex=J%28%5Ctheta%29) 达到最小的点， 
![](https://www.zhihu.com/equation?tex=p) 个参数都来一次，就得到了该次迭代的最小值点。具体来说就是（以 
![](https://www.zhihu.com/equation?tex=J%28%5Ctheta%29) 表示第 
![](https://www.zhihu.com/equation?tex=k) 次迭代第 
![](https://www.zhihu.com/equation?tex=j) 个参数的值）：

-  初始位置点为 
![](https://www.zhihu.com/equation?tex=%5Cboldsymbol%7B%5Ctheta%7D%5E%7B%280%29%7D%3D%28%5Ctheta%5E%7B%280%29%7D_1%2C%5Ctheta%5E%7B%280%29%7D_2%2C...%2C%5Ctheta%5E%7B%280%29%7D_p%29) 
 
-  第 
![](https://www.zhihu.com/equation?tex=k) 次迭代，从 
![](https://www.zhihu.com/equation?tex=%5Ctheta%5E%7B%28k%29%7D_1) 开始，固定后面 
![](https://www.zhihu.com/equation?tex=p-1) 个参数，计算使得 
![](https://www.zhihu.com/equation?tex=J%28%5Cboldsymbol%7B%5Ctheta%7D%29) 达到最小的 
![](https://www.zhihu.com/equation?tex=%5Ctheta_1) ，然后依次往后计算，到 
![](https://www.zhihu.com/equation?tex=%5Ctheta%5E%7B%28k%29%7D_j) 为止，一共执行 
![](https://www.zhihu.com/equation?tex=p) 次运算：
 
![](https://www.zhihu.com/equation?tex=~~~~~~~~~~~~~~~~~~~~~~~~%5Cbegin%7Balign%7D+%5Ctheta%5E%7B%28k%29%7D_1%26%3D%5Carg%5Cmin_%7B%5Ctheta_1%7D+J%28%5Ctheta_1%2C%5Ctheta%5E%7B%28k-1%29%7D_2%2C%5Ctheta%5E%7B%28k-1%29%7D_3%2C...%2C%5Ctheta%5E%7B%28k-1%29%7D_p%29%5C%5C+%5Ctheta%5E%7B%28k%29%7D_2%26%3D%5Carg%5Cmin_%7B%5Ctheta_2%7D+J%28%5Ctheta%5E%7B%28k%29%7D_1%2C%5Ctheta_2%2C%5Ctheta%5E%7B%28k-1%29%7D_3%2C...%2C%5Ctheta%5E%7B%28k-1%29%7D_p%29%5C%5C+%5Ctheta%5E%7B%28k%29%7D_3%26%3D%5Carg%5Cmin_%7B%5Ctheta_3%7D+J%28%5Ctheta%5E%7B%28k%29%7D_1%2C%5Ctheta%5E%7B%28k%29%7D_2%2C%5Ctheta_3%2C...%2C%5Ctheta%5E%7B%28k-1%29%7D_p%29%5C%5C+%26...%5C%5C+%5Ctheta%5E%7B%28k%29%7D_p%26%3D%5Carg%5Cmin_%7B%5Ctheta_p%7D+J%28%5Ctheta%5E%7B%28k%29%7D_1%2C%5Ctheta%5E%7B%28k%29%7D_2%2C%5Ctheta%5E%7B%28k%29%7D_3%2C...%2C%5Ctheta_p%29+%5Cend%7Balign%7D) 
- 若各 
![](https://www.zhihu.com/equation?tex=%5Ctheta%5E%7B%28k%29%7D_j) 相较于 
![](https://www.zhihu.com/equation?tex=k-1) 次迭代都变化极小，说明结果已收敛，迭代结束，否则继续迭代。你可能会有疑问，我最后得到的 
![](https://www.zhihu.com/equation?tex=%5Ctheta%5E%7B%28k%29%7D_j) 只是局部（因为固定了其余 
![](https://www.zhihu.com/equation?tex=p-1) 个）最优解啊，为什么 
![](https://www.zhihu.com/equation?tex=%5Cboldsymbol%7B%5Ctheta%7D%5E%7B%28k%29%7D%3D%28%5Ctheta%5E%7B%28k%29%7D_1%2C%5Ctheta%5E%7B%28k%29%7D_2%2C...%2C%5Ctheta%5E%7B%28k%29%7D_p%29) 就是全局最优解了？ 这是**凸优化问题的一个基本性质——任意局部最优解也是全局最优解**。感兴趣的同学可以参考Stephen_Boyd的《convex optimization》第4.2.2节，清华大学出版社有中译本。

2.2 最小角回归法（Least Angle Regression）
最小角回归法（LARS）是Bradley Efron于2004年的论文《Least Angle Regression》中提出的一种算法。该算法与经典向前选择（classic Forward Selection）算法接近，我们先简单介绍一下**向前选择算法**，以2维为例： 
![](https://www.zhihu.com/equation?tex=y%3D%5Cbeta_1x_1%2B%5Cbeta_2x_2) ,为了估计出 
![](https://www.zhihu.com/equation?tex=%5Cbeta_1%2C%5Cbeta_2) ，我们先将 
![](https://www.zhihu.com/equation?tex=y) 往与其最接近（相关性最大）的 
![](https://www.zhihu.com/equation?tex=x_i) 上做投影，假设与 
![](https://www.zhihu.com/equation?tex=x_1) 最近，得到 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D_1) ，然后残差往 
![](https://www.zhihu.com/equation?tex=x_2) 上做投影，得到 
![](https://www.zhihu.com/equation?tex=%5Chat%7B%5Cbeta%7D_2) ，over。（如图所示）

![](https://pica.zhimg.com/v2-9d123a3531ea1f64b004cc7800ef3dba_r.jpg)最小角回归算法与之类似，但不像向前选择一样&#34;贪婪&#34;，按照论文上的说法是这样：

与经典向前选择算法一样，我们所有的系数都从0开始，然后找到与相应变量 
![](https://www.zhihu.com/equation?tex=y) 最相关的预测变量 
![](https://www.zhihu.com/equation?tex=x) ，比如 
![](https://www.zhihu.com/equation?tex=x_1) 。我们朝着这个预测变量的方向尽可能的迈出最大的一步，直到另一个预测变量，比如 
![](https://www.zhihu.com/equation?tex=x_2) ，它与当前残差有与 
![](https://www.zhihu.com/equation?tex=x_1) 相同的相关性。在这个点上，LARS与向前选择不同，不是继续沿着 
![](https://www.zhihu.com/equation?tex=x_1) 前进，而是沿着两者的角平分线前进，直到第三个变量 
![](https://www.zhihu.com/equation?tex=x_3) 与当前残差有与 
![](https://www.zhihu.com/equation?tex=x_1%2Cx_2) 相同的相关性，然后沿着 
![](https://www.zhihu.com/equation?tex=x_1%2Cx_2%2Cx_3) 的角平分线前进，即：最小角方向。直到第四个变量进入，然后以同样的方式继续下去。接下来我们以2维为例作图说明，关于相关性，为了更直观给大家表示，我们选择皮尔逊（Pearson）相关系数，因为Pearson相关系数在数值上等于角的余弦值。

 如果你是第一次知道Pearson相关系数等于两向量的余弦值，我举几个例子：两向量同方向，夹角为0，余弦值为1，Pearson相关系数为1，若两向量垂直，则余弦值与Pearson相关系数为0，若完全反方向（夹角180度），余弦值与Pearson相关系数为-1。因此，夹角越小，说明相关性越大。
![](https://pic3.zhimg.com/v2-201460b090318b557091ee1d2e439cda_r.jpg)这张图只是尽可能的还原论文中的图，实际中，并不一定正好有 
![](https://www.zhihu.com/equation?tex=y%3D%5Cmu_1%2B%5Cmu_2) ，至于为什么没用原论文的图，因为我下的论文不知道为啥图片是糊的。从这张图上我们可以看到，一开始， 
![](https://www.zhihu.com/equation?tex=y) 与 
![](https://www.zhihu.com/equation?tex=x_1) 夹角更小（相关性更大），于是沿着 
![](https://www.zhihu.com/equation?tex=x_1) 的方向走，走到 
![](https://www.zhihu.com/equation?tex=x_1%2Cx_2) 和当前残差相关性相等的地方，开始沿着 
![](https://www.zhihu.com/equation?tex=x_1%2Cx_2) 的角平分线前进（即 
![](https://www.zhihu.com/equation?tex=%5Cmu_2) 的方向），至于最后正好与 
![](https://www.zhihu.com/equation?tex=y) 相交，是巧合，不要被误导以为这个算法就能完美估计出来参数。

3.后续
最后说一下，Lasso方法不管是在Python还是R上都可以轻松实现，调用包以后只需要一行代码就可以求出结果，就不讲了。这里要说一下一开始给出的公式

![](https://www.zhihu.com/equation?tex=+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Q%28%5Cbeta%29%3D%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2%2B%5Clambda%7C%7C%5Cbeta%7C%7C_1+) 

其中的 
![](https://www.zhihu.com/equation?tex=%5Clambda) 在软件中一般以交叉验证（CV）得到。但同时我们也有其等价定义

![](https://www.zhihu.com/equation?tex=~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~%5Carg%5Cmin%7C%7Cy-%5Cboldsymbol%7BX%7D%5Cbeta%7C%7C%5E2~~~s.t.~%5Csum%7C%5Cbeta_j%7C%5Cleq+s+) 

这里 
![](https://www.zhihu.com/equation?tex=s) 选择的越小，参数被压缩到 0 的越多，如果 
![](https://www.zhihu.com/equation?tex=s) 非常大，系数就基本不会被压缩，以Lasso论文中的图片为例：

![](https://pic4.zhimg.com/v2-f1a27c4e37369f0cae712017ea4b29ad_r.jpg)横坐标 
![](https://www.zhihu.com/equation?tex=s) 就是公式中的 
![](https://www.zhihu.com/equation?tex=%5Csum%7C%5Cbeta_j%7C%5Cleq+s) ，这里虚线表示 
![](https://www.zhihu.com/equation?tex=s%3D0.44) ，这时选出来了三个变量，其余变量的系数都被压缩到了 0。从图中我们可以看出，若 
![](https://www.zhihu.com/equation?tex=s%3C0.2) ，那就只剩一个系数了，若 
![](https://www.zhihu.com/equation?tex=s) 很大，所有系数都不会被压缩。

之所以放上这个图，是因为软件输出结果会出现这种图，如果我们需要一定的变量数，而通过CV选出的太少，可以根据这图手动调参，使输出的系数符合我们的要求（当然其他指标如残差平方和也会有所变化）。