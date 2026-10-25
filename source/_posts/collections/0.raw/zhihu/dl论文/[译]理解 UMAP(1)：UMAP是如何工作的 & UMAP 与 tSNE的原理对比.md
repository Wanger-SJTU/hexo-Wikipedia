---
title: "[译]理解 UMAP(1)：UMAP是如何工作的 & UMAP 与 tSNE的原理对比"
date: "2021-02-23 00:00:00"
updated: "2021-02-23 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/[译]理解-UMAP(1)-UMAP是如何工作的-UMAP-与-tSNE的原理对比/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/150788883
---


[译]理解 UMAP(1)：UMAP是如何工作的   UMAP 与 tSNE的原理对比

臧泽林

277 人赞同了该文章

本文使用 Zhihu On VSCode 创作并发布

[译]UMAP是如何工作的   UMAP 与 tSNE的原理对比
转载自：https://towardsdatascience.com/how-exactly-umap-works-13e3040e1668

译者：ZelinZang, zelinzang@gmail.com, https://www.zhihu.com/people/zang-ze-lin-54

关联另一篇转载译文：臧泽林：[译] 理解 UMAP（2）

完成日期：2020.6.26

今天我们要深入探讨的是一种叫做UMAP的降维技术，这种技术在现在的单细胞基因组学中占主导地位。我们使用简单的语言解释这种方法。并强调tSNE和UMAP之间的关键差异。

## 1. tSNE 已死，UMAP当立

如果你不知道什么是tSNE，它是如何工作的，也没有读过2008年最初的革命性的van der Maaten   Hinton论文，你可能不需要知道，因为tSNE现在基本上已经死了。尽管tSNE为数据科学带来了巨大的影响，但人们普遍认为它有一些缺点，迟早要解决。

究竟是什么原因让TSNE的效果不那么理想，这里我总结了几点，并做了简短的评论：

- tSNE不能适用大的样本量。如果使用FItSNE加速计算，也会导致内存消耗大，从而只能在计算机集群上进行分析。
- tSNE并没有保留全局结构。也就是说只有簇内的距离才有意义，而簇间的相似性却无法保证；因此人们普遍认为，在tSNE上进行聚类并不是一个很好的主意。

tSNE在mnist上的降维结果
如上图，我们很难说右边箭头指出的三个簇相似度很低。

- tSNE实际上只能嵌入到2维或3维中，即只能用于可视化的目的，所以很难将tSNE作为一般的降维技术；
- tSNE不能直接处理高维数据，通常使用Autoencoder或PCA进行降维处理，然后将降维的结果输入tsne做可视化。
## 2. tSNE工作原理简要回顾

tSNE是一种相对简单的机器学习算法，可以由以下四个方程描述：

\quad p_{i j}=\frac{p_{i \mid j}+p_{j \mid i}}{2 N}， p_{j \mid i}=\frac{\exp \left(-|| x_{i}-x_{j}||^{2} / 2 \sigma_{i}^{2}\right)}{\sum_{k \neq i} \exp \left(-\left\|x_{i}-x_{k}\right\|^{2} / 2 \sigma_{i}^{2}\right)}     \;\;\;\;(1)

式（1）定义了高斯概率观测高维空间中任意两个点之间的距离的概率p_{ij}，该距离满足对称性规则。其中x表示输入的数据，下标为数据的索引，N为样本数，y表示输出的数据。

\sigma_i表示计算距离概率的方差，方差由式（2）确定。

\text { Perplexity }=2^{{-\sum_{j} \mathrm{p}_{j i} \log _{2} \mathrm{p}_{j i}}} \;\;\;\;(2)

式（2）引入了困惑度\text{Perplexity}的概念,困惑度是一个可调节的变量，类似于knn 的K。作为确定每个样本的最佳\sigma_i的约束。在实际的计算中，通过二分法对\sigma_i进行搜索，使满足\text{Perplexity}满足设定的要求。

q_{i j}=\frac{\left(1+\left\|y_{i}-y_{j}\right\|^{2}\right)^{-1}}{\sum_{k \neq l}\left(1+\left\|y_{k}-y_{l}\right\|^{2}\right)^{-1}} \;\;\;\;(3)

式（3）定义了低维嵌入中两对点之间距离的学生t分布。学生t分布的长尾可以用来克服嵌入低尺寸时的拥挤问题。y表示输出的数据。

K L\left(P_{i} \| Q_{i}\right)=\sum_{i} \sum_{j} p_{j \mid i} \log \frac{p_{j \mid i}}{q_{j \mid i}}, \quad \frac{\partial K L}{\partial y_{i}}=4 \sum_{j}\left(p_{i j}-q_{i j}\right)\left(y_{i}-y_{j}\right)\left(1+\left\|y_{i}-y_{j}\right\|^{2}\right)^{-1} \;\;\;\;(4)

式（4）给出了将高维概率投影到低维概率的Kullback-Leibler散度损失函数，以及用于梯度下降优化的梯度的解析形式。在这里只做一个简单的介绍，接下来会有更加详细的介绍。

高斯分布和t分布的区别
仅看上面的图，我会说Student t分布的粗尾应该提供全局距离信息，因为它们将点在高维度上推得更远，在低维度上甚至更远。然而，这种良好的意愿被成本函数（KL-散度）的选择所扼杀，我们将在后面看到原因。

## 3. tSNE和UMAP之间的主要区别

UMAP是一种新颖且有趣的降维技术，与纯机器学习半经验算法tSNE截然不同，它基于可靠的数学原理。我来自生物学的同事告诉我，原始的UMAP论文太“数学化了”，但是，在阅读UMAP文档并观看Leland McInnes在SciPy 2018上的演讲时，我感到困惑，因为我觉得UMAP是另一种与tSNE非常相似的邻居图技术，我一直在努力了解UMAP与tSNE到底有何不同。

从UMAP论文来看，即使Leland McInnes试图在附录C中总结它们，UMAP和tSNE之间的差异也不是很明显。我想说的是，我确实看到了微小的差异，但是目前尚不清楚为什么它们会对输出带来如此巨大的影响。在这里，我将首先总结我注意到的UMAP和tSNE之间的区别，然后尝试解释为什么这些区别很重要，并找出它们的影响有多大。

- UMAP使用高维度上的指数概率分布，但不一定要像tSNE那样使用欧几里得距离，而是可以插入任何距离。此外，概率未归一化：
p_{i \mid j}=e^{- \frac{d \left( x_{i}, x_{j} \right) - \rho_{i} }{\sigma_{i}}} \;\;\;\;(5)
此处\rho是一个重要参数，代表从第i个数据点到其第一个最近邻居的距离。这样可以确保流形的本地连通性。换句话说，这为每个数据点提供了局部自适应的指数内核，因此距离度量因点而异。
ρ参数是UMAP论文第2节和第3节之间的唯一桥梁。否则，我看不到模糊简单集的构造（即第2节中的奇特拓扑数据分析）与第3节中的UMAP的算法实现有什么关系。
- UMAP并未对高维（或低维）概率进行归一化，这与tSNE有很大不同。仅从高维（或低维）概率的函数形式（公式5）可以看出，它们已经针对段[0，1]进行了缩放，结果证明去掉归一化步骤（意味着不计算等式（1）中的分母部分）大大减少了计算高维图的时间。
- UMAP使用最近邻居的数量而不是困惑度。与之不同的是tSNE根据式（2）定义了困惑度。UMAP定义了没有log2函数的最近邻居k的数量，即：

```text
k=2^{\sum_{i} p_{i j}} \;\;\;\;(6)
```

- UMAP使用高维概率的对称化稍有不同:
p_{i j}=p_{i \mid j}+p_{j \mid i}-p_{i \mid j} p_{j \mid i} \;\;\;\;(7)
高维概率对称化是必要的，因为在UMAP将具有局部变化的度量的点粘合在一起（通过参数\rho）之后，可能会发生A和B节点之间的图的权重不等于B和A节点之间的权重的情况。不过我还不清楚，为什么UMAP使用这种对称，而没有使用tSNE的对称形式。
- UMAP使用曲线族 1 /(1 + a \cdot y ^{(2b)})来建模低维距离概率，不完全是学生t分布，而是非常相似。请再次注意，没有应用归一化：
q_{i j}=\left(1+a\left(y_{i}-y_{j}\right)^{2 b}\right)^{-1} \;\;\;\;(8)
其中默认UMAP超参数的a≈1.93和b≈0.79（实际上，对于min\_dist = 0.001），我们可以将公式写成如下的形式：
\left(1+a\left(y_{i}-y_{j}\right)^{2 b}\right)^{-1} \approx\left\{\begin{array}{ll}1   \text { if } y_{i}-y_{j} \leq \text {min_dist } , e^{-\left(y_{i}-y_{j}\right)-\text {min_dist}}   \text { if } y_{i}-y_{j} \text {min_dist }\end{array}\right. \;\;\;\;(9)
为了更好地理解曲线1 /(1 + a \cdot y ^{(2b)})的行为，让我们为不同的a和b绘制一些曲线：

```text
plt.figure(figsize=(20, 15))
y = np.linspace(0, 10, 1000)

my_prob = lambda y, a, b: np.power(1 + a*y**(2*b), -1)
plt.plot(y, my_prob(y, a = 1, b = 1))
plt.plot(y, my_prob(y, a = 1.93, b = 0.79))
plt.plot(y, my_prob(y, a = 1.93, b = 5))

plt.gca().legend(('a = 1, b = 1', 'a = 1.93, b = 0.79', 'a = 1.93, b = 5'), fontsize = 20)
plt.title("Low-Dimensional Probability of Pairwise Euclidean Distances", fontsize = 20)
plt.xlabel("Y", fontsize = 20); plt.ylabel("Q(Y)", fontsize = 20)
plt.show()
```


不同参数下的$1 /(1 + a \cdot y ^{(2b)})$曲线
我们可以看到曲线系列对参数b非常敏感，在b较大时，曲线在纵轴Y较小时变化缓慢。这意味着在UMAP超参数min_dist以下，所有数据点均紧密连接。由于Q(Y)函数的行为几乎类似于Heaviside步进函数，这意味着UMAP为低维空间中彼此靠近的所有点分配几乎相同的低维坐标。 min_dist正是导致经常在UMAP降维图中观察到的超紧密堆积簇的原因。
为了演示如何精确找到a和b参数，让我们显示一个简单的分段函数（其中，通过min_dist参数定义平稳部分），并使用函数族1 /(1 + a \cdot y ^{(2b)})，方法是使用Scipy Python库中的optimize.curve_fit。作为拟合的结果，我们获得了函数1 /(1 + a \cdot y ^{(2b)})的优化a和b参数。

```python
  from scipy import optimize
  import matplotlib.pyplot as plt
  import numpy as np

  MIN_DIST = 1

  x = np.linspace(0, 10, 300)

  def f(x, min_dist):
      y = []
      for i in range(len(x)):
          if(x[i]  = min_dist):
              y.append(1)
          else:
              y.append(np.exp(- x[i] + min_dist))
      return y

  dist_low_dim = lambda x, a, b: 1 / (1 + a*x**(2*b))
```

 
  p , _ = optimize.curve_fit(dist_low_dim, x, f(x, MIN_DIST))

```python
  print(p)

  plt.figure(figsize=(20,15))
  plt.plot(x, f(x, MIN_DIST), "o")
  plt.plot(x, dist_low_dim(x, p[0], p[1]), c = "red")
  plt.title("Non-Linear Least Square Fit of Piecewise Function", fontsize = 20)
  plt.gca().legend(('Original', 'Fit'), fontsize = 20)
  plt.xlabel("X", fontsize = 20)
  plt.ylabel("Y", fontsize = 20)
  plt.show()
```


函数的拟合效果

- UMAP使用二进制交叉熵（CE）作为成本函数，而不是像tSNE那样使用KL散度。
C E(X, Y)=\sum_{i} \sum_{j}\left[p_{i j}(X) \log \left(\frac{p_{i j}(X)}{q_{i j}(Y)}\right)+\left(1-p_{i j}(X)\right) \log \left(\frac{1-p_{i j}(X)}{1-q_{i j}(Y)}\right)\right]  \;\;\;\;(10)
在下一节中，我们将显示CE成本函数中的这个附加项（第二项）使UMAP能够捕获全局数据结构，而tSNE只能以中等的困惑度值对局部结构进行建模。由于我们需要知道交叉熵的梯度才能在以后实现“梯度下降”，因此让我们快速进行计算。忽略仅包含p（X）的常数项，我们可以重写交叉熵并将其区分如下：
C E\left(X, d_{i j}\right)=\sum_{j}\left[-P(X) \log Q\left(d_{i j}\right)+(1-P(X)) \log \left(1-Q\left(d_{i j}\right)\right)\right], \quad \text { where } d_{i j}=y_{i}-y_{j} \;\;\;\;(11)
与tSNE使用的随机法线初始化相反，UMAP使用Graph Laplacian分配初始低维坐标。但是，这对于最终的结果影响不大。图拉普拉斯算子，谱聚类，拉普拉斯算子，扩散图，谱嵌入等方法，实际上是将矩阵分解和近邻图方法结合在一起以解决降维问题的方法。在这种方法中，我们首先构造一个图（或knn图），然后通过构造拉普拉斯矩阵用矩阵代数（邻接度和度矩阵）对其进行形式化，最后我们对拉普拉斯矩阵进行分解，即解决特征值分解问题。

```text
L=D^{1 / 2}(D-A) D^{1 / 2} \;\;\;\;(12)
```

我们可以使用scikit-learn Python库，并在演示数据集上使用SpectralEmbedding函数（谱嵌入）轻松显示初始的低维坐标，该演示数据集是与癌症相关的成纤维细胞（CAF）scRNAseq数据：

```python
from sklearn.manifold import SpectralEmbedding
model = SpectralEmbedding(n_components = 2, n_neighbors = 50)
se = model.fit_transform(np.log(X_train + 1))
plt.figure(figsize=(20,15))
plt.scatter(se[:, 0], se[:, 1], c = y_train.astype(int), cmap = 'tab10', s = 50)
plt.title('Laplacian Eigenmap', fontsize = 20)
plt.xlabel("LAP1", fontsize = 20)
plt.ylabel("LAP2", fontsize = 20)
plt.show()
```


- 最后，UMAP使用随机梯度下降（SGD）代替tSNE / FItSNE等常规梯度下降（GD），这既加快了计算速度，又消耗了更少的内存。
## 4. 为什么tSNE仅保留本地结构？

现在让我们简短地讨论为什么他们确切地说tSNE只保留数据的局部结构。可以从不同的角度来了解tSNE的局部性。首先，我们在等式中有\sigma参数。 （1）设置数据点在本地如何相互“感觉”。由于成对的欧几里得距离的概率呈指数衰减，因此在较小的\sigma值下，距离远的点的概率基本上为零，而仅对于距离近的邻居概率非常快地增长。相反，在\sigma比较大时，相距较近和距离较远的点的概率变得可比，并且在极限\sigma\to \infty中，对于任意一对点之间的所有距离，该概率均等于1，即，点变为等距。

```text
plt.figure(figsize=(20, 15))
x = np.linspace(0, 10, 1000)
sigma_list = [0.1, 1, 5, 10]
```


for sigma in sigma_list:

```text
    my_prob = lambda x: np.exp(-x**2 / (2*sigma**2))
    plt.plot(x, my_prob(x))
plt.gca().legend(('$\sigma$ = 0.1','$\sigma$ = 1', '$\sigma$ = 5', '$\sigma$ = 10'), 
                 fontsize = 20)
plt.title("High-Dimensional Probability of Pairwise Euclidean Distances", fontsize = 20)
plt.xlabel("X", fontsize = 20); plt.ylabel("P(X)", fontsize = 20)
plt.show()
```


TSNE参数变化对概率结果的影响

有趣的是，如果我们将高维成对欧几里德距离的概率扩展为\sigma\to\infty的泰勒级数，我们将在第二个近似中得到幂定律：

P(X) \approx e^{-\frac{X^{2}}{2 \sigma^{2}}}， br P(X) \underset{\sigma \rightarrow \infty}{\longrightarrow} 1-\frac{X^{2}}{2 \sigma^{2}}+\frac{X^{4}}{8 \sigma^{4}}-\dots \;\;\;\;(13)

关于成对的欧几里得距离的幂定律类似于多维标度（MDS）的成本函数，已知该维数函数可以通过尝试保持每对点之间的距离来保持全局距离，而不管它们之间的距离是远还是近。可以将其解释为：拥有大的σ的tSNE确实说明了数据点之间的远程交互作用，因此说tSNE仅可以处理局部距离并不是完全正确的。但是，我们通常通过有限的困惑度（perplexity）来限制，Laurens van der Maaten建议将困惑度值限制在5到50之间，尽管也许本地信息和全局信息之间的一个很好的折衷是选择近似遵循平方根定律≈N^{(1 / 2)}，其中N是样本大小。在相反的极限\sigma\to0中，我们在类似于Dirac三角函数行为的高维概率行为中得到了极端的“局部性”。

P(X) \underset{\sigma \rightarrow 0}{\longrightarrow} \delta_{\sigma}(X) \;\;\;\;(14)

了解tSNE的“局部性”的另一种方法是考虑KL散度函数。让我们尝试绘制它，假设X是高维空间中的点之间的距离，而Y是低维距离：

P(X) \approx e^{-X^{2}} \quad Q(Y) \approx \frac{1}{1+Y^{2}} \;\;\;\;(15)

从KL散度的定义式 式(4) 中可以知道:

K L(X, Y)=P(X) \log \left(\frac{P(X)}{Q(Y)}\right)=P(X) \log P(X)-P(X) \log Q(Y) \;\;\;\;(16)

上式中的第一项，无论X是大是小，其结果都接近于零。如果X比较小，\log P(X)变得接近于1，并且log（1）= 0。如果X比较大，指数预因子变为零的速度快于对数达到-\infty的速度，这一项同样会变成0。因此，为了直观地理解KL散度，仅考虑第二项就足够了：

K L(X, Y) \approx-P(X) \log Q(Y)=e^{-X^{2}} \log \left(1+Y^{2}\right) \;\;\;\;(17)

这个函数看起来很奇怪，我们把这个函数画出来：

```python
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.ticker import LinearLocator, FormatStrFormatter

fig = plt.figure(figsize=(20, 15))
ax = fig.gca(projection = '3d')
```

# Set rotation angle to 30 degrees

```text
ax.view_init(azim=30)

X = np.arange(0, 3, 0.1)
Y = np.arange(0, 3, 0.1)
```

X, Y = np.meshgrid(X, Y)
Z = np.exp(-X**2)*np.log(1 + Y**2)

# Plot the surface.

```text
surf = ax.plot_surface(X, Y, Z, cmap=cm.coolwarm,linewidth=0, antialiased=False)
ax.set_xlabel('X', fontsize = 20)
ax.set_ylabel('Y', fontsize = 20)
ax.set_zlabel('KL (X, Y)', fontsize = 20)
ax.set_zlim(0, 2.2)
```

ax.zaxis.set_major_locator(LinearLocator(10))
ax.zaxis.set_major_formatter(FormatStrFormatter('%.02f'))

```text
fig.colorbar(surf, shrink=0.5, aspect=5)
plt.show()
```


tSNE的代价函数的可视化

该函数具有非常不对称的形状。如果高维X上的点之间的距离很小，则指数前因子变为1，对数项的行为为log(1 + Y ^2)，这意味着，如果低维Y上的距离较大，则将存在一个惩罚较大，因此tSNE会尝试在小X处减少Y，以减少惩罚。相反，对于高尺寸的大距离X，Y基本上可以是从0到\infty的任何值，因为指数项变为零，并且总是胜过对数项。因此，可能会发生在高维度上相距较远的点最终在低维度上彼此接近的情况。因此，换句话说，tSNE不能保证在高维度上相距遥远的点将保留在低维度上相距遥远的点。但是，它确实保证了在高维度上彼此接近的点在低维度上仍将彼此接近。因此，tSNE并不真正擅长将长距离投影到低维度，因此，只要\sigma不为\infty，它就仅保留本地数据结构。

## 5. 为什么UMAP可以保留全局结构

与tSNE相比，UMAP使用交叉熵（CE）作为成本函数，而不是KL散度：

C E(X, Y)=P(X) \log \left(\frac{P(X)}{Q(Y)}\right)+(1-P(X)) \log \left(\frac{1-P(X)}{1-Q(Y)}\right) \;\;\;\;(17)

C E(X, Y)=e^{-X^{2}} \log \left[e^{-X^{2}}\left(1+Y^{2}\right)\right]+\left(1-e^{-X^{2}}\right) \log \left[\frac{\left(1-e^{-X^{2}}\right)\left(1+Y^{2}\right)}{Y^{2}}\right] \;\;\;\;(18)

\approx e^{-X^{2}} \log \left(1+Y^{2}\right)+\left(1-e^{-X^{2}}\right) \log \left(\frac{1+Y^{2}}{Y^{2}}\right) \;\;\;\;(19)

与之前的tsne相比，新的损失函数将导致局部-全局结构平衡的巨大变化。在较小的X值下，我们获得与tSNE相同的限制，因为第二项由于前置因子而消失，并且对数函数比多项式函数慢：

X \rightarrow 0: C E(X, Y) \approx \log \left(1+Y^{2}\right) \;\;\;\;(20)

因此，为了最小化损失，Y坐标被迫很小，即Y\to0。这与tSNE的行为完全一样。但是，在较大的X情况（即X\to\infty）中，第一项消失了，第二项的前置因子变为1，我们得到：

X \rightarrow \infty: C E(X, Y) \approx \log \left(\frac{1+Y^{2}}{Y^{2}}\right) \;\;\;\;(21)

在这里，如果Y小，由于对数分母中的Y，我们将得到高罚分，因此鼓励Y大，以使对数下的比率变为1，并且得到零罚分。因此，我们在X\to\infty处得到Y\to\infty，因此当从高维空间移动到低维空间时，全局距离得以保留，这正是我们想要的。为了说明这一点，让我们绘制UMAP CE成本函数：

```python
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.ticker import LinearLocator, FormatStrFormatter

fig = plt.figure(figsize=(20, 15))
ax = fig.gca(projection = '3d') 
```

# Set rotation angle to 30 degrees

```text
ax.view_init(azim=30)

X = np.arange(0, 3, 0.001)
Y = np.arange(0, 3, 0.001)
```

X, Y = np.meshgrid(X, Y)
Z = np.exp(-X**2)*np.log(1 + Y<strong>2) + (1 - np.exp(-X</strong>2))*np.log((1 + Y<strong>2) / (Y</strong>2+0.01))

# Plot the surface.

```text
surf = ax.plot_surface(X, Y, Z, cmap=cm.coolwarm,linewidth=0, antialiased=False)
ax.set_xlabel('X', fontsize = 20)
ax.set_ylabel('Y', fontsize = 20)
ax.set_zlabel('CE (X, Y)', fontsize = 20)
ax.set_zlim(0, 4.3)
```

ax.zaxis.set_major_locator(LinearLocator(10))
ax.zaxis.set_major_formatter(FormatStrFormatter('%.02f'))

# Add a color bar which maps values to colors.

```text
fig.colorbar(surf, shrink=0.5, aspect=5)
plt.show()
```


UMAP的代价函数的可视化

在这里，我们可以看到该图的“右侧”部分看上去与上方的KL发散表面非常相似。这意味着在低X时，我们仍然希望具有低Y，以减少损失。但是，在X较大的情况下，Y距离的确也希望较大，因为如果它很小，则CE(X,Y)代价将很大。请记住，以前，对于KL(X,Y)曲面，在大X处低Y和高Y之间在惩罚方面没有任何区别。这就是为什么CE(X，Y)成本函数能够保留全局距离以及当地距离。

## 6. 为什么UMAP比tsne快速

我们知道UMAP在涉及以下方面时比tSNE快：

- 大量数据点，
- 嵌入尺寸的数量大于2或3，
- 数据集中的环境尺寸很多。在这里，让我们尝试从数学和算法实现的角度了解UMAP与tSNE相比的优越性。

tSNE和UMAP基本上都包含两个步骤：

- 使用搜索和固定数量的最近邻方法，以高维构建图并计算指数概率\sigma的数值。
- 通过梯度下降优化低维表示。第二步是算法的瓶颈，它是连续的并且很难是多线程的。由于tSNE和UMAP都执行第二步。与tSNE相比，UMAP的第一步变得更快。这是由于两个原因。

- 首先，我们将对数部分放在最近邻居数的定义中，即不使用像tSNE这样的完整熵：k=2 ^{\sum_i p_{i j}}{} \;\;\;\;(22)

由于在算法上对数函数是通过泰勒级数展开来计算的，并且由于对数函数比线性函数慢，因此实际上将对数前置因子放在线性项前面并不会增加太多，因此很好地完全跳过此步骤。

- 第二个原因是我们省略了高维概率的归一化，也就是等式中使用的归一化。 （1）对于tSNE。这个可以说很小的步骤实际上对性能产生了巨大的影响。这是因为求和或积分是计算上的昂贵步骤。接下来，UMAP实际上在第二步也变得更快。这种改进还有几个原因：

- 像tSNE或FItSNE一样，使用随机梯度下降（SGD）代替常规的梯度下降（GD）。这可以提高速度，因为对于SGD，可以从随机样本子集计算梯度，而不是像常规GD一样使用所有样本。除了提高速度外，这还减少了内存消耗，因为不再必须为内存中的所有样本保留梯度，而仅保留一个子集。
- 我们不仅针对高维概率，而且针对低维概率也都跳过了归一化。这也省去了第二阶段的昂贵求和（优化低维嵌入）。
- 由于标准tSNE使用基于树的算法进行最近邻居搜索，因此生成超过2–3个嵌入维的速度太慢，因为基于树的算法会随维数成倍增长。通过降低高维和低维概率的归一化，可以在UMAP中解决此问题。
- 增加原始数据集中的维数，我们在数据上引入了稀疏性，即我们得到了越来越多的零散流形，即有时存在密集区域，有时存在孤立点（局部断开的流形）。 UMAP通过引入局部连通性\rho参数解决了这个问题，该参数通过引入考虑本地数据连通性的自适应指数内核将（在某种程度上）稀疏区域粘合在一起。这正是UMAP可以（理论上）可以在任意数量的尺寸上工作并且在将其插入主尺寸降低过程之前不需要预降维步骤（Autoencoder，PCA）的原因。
7 总结
在这篇文章中，我们了解到，tsne仍然存在许多缺点，例如速度和缺乏全局距离保留。 UMAP总体上遵循tSNE的理念，但是引入了若干改进，例如使用了新的基于CE成本函数（如式10），以及更改了高维和低维概率的归一化（对比式(5)(8)和式(1)(3)）。

两个方法的对比列表如下：

两个方法的对比列表

编辑于 2021-02-23 23:28
数据降维

可视化

流形学习

​赞同 277​​18 条评论​441 ​60 ​分享

​申请转载​​

未登录用户

18 条评论

默认
最新

醉水

tSNE的原罪就是慢和占用空间大。你说的这些理由如果有正确的部分，那也是由于其慢和占用空间大而引起的trade off。如果你不计较时间，内存无限，愿意用原始的tSNE，那这些缺点都不存在。

umap的理论非常高大上，论文里引了什么黎曼几何模糊集simplex之类的高大上的概念，我也看不懂，但我实际看下来感觉就是把graph embedding包装得更好了。当然他用graph这就是比tSNE要先进的地方了，但你要说tSNE已死还是不合适。目前tSNE和umap我都会用，互相做个参考印证。

2021-02-16

​回复​13

醉水

tSNE是有一些缺点，但你说tSNE已死完全就是瞎胡闹，且你的几点理由除了tSNE耗费时间和内存多是正确的以外，基本全都站不住脚。

1、tSNE没有保存全局结构。tSNE计算Pij的时候可以选择使用所有的点，当然也要承受耗时极大增多的劣势，所以一般只会计算邻近的一部分点。且结果来看，两个相似度更低的簇就是会比两个相似度更高的簇离得更远，这是降维本来的目的之一，也是其原理保证的。从你给的mnist的tSNE结果就能看到，4和9明显很近，9和7，9和8，7和1都比较近，而6和9就相对很远。所以说tSNE没有保存全剧结构站不住脚。

2、tSNE只能嵌入2维或3维。原始的tSNE可以嵌入比原本数据维度低的任意维，但是tSNE计算复杂度太高（O(n2)），多数情况下在数据量较大时并不实用，所以人们改良了tSNE，改良后的品种bh-tSNE以较小的精度损失获得了极大的性能提升（O(nlogn)），但改良后的品种只能嵌入2维或3维。我读了sklearn里的源码之后发现，其实bh-tSNE如果要嵌入更高维或1维也是可以做到的，但更高维需要的内存空间成指数增长且其数据结构难以直观想象（2D需要四叉树，3D需要八叉树，4D就需要十六叉树，然后32叉，64叉等等），且绝大多数情况下降维作为一种可视化手段，我们只需要将其放在2D或3D空间中，因此高维和1维的需求并不强烈。

3、tSNE不能直接处理高维数据。可以，只是会很慢。所以一般先用PCA去掉一部分冗余信息，以较小的精度损失获得一个较大的处理时间上的节约。

2021-02-16

​回复​9

臧泽林

作者

欢迎讨论，首先我应该是比较忠实的翻译了原作者的观点，在学习的同时给中文社区一些贡献，最近我也做了些研究工作，下面是我的思考：
 （1）在计算的角度看：tsne的代价函数的确会促进相似度更低的簇会比两个相似度更高的簇离得更远，不过在优化过程中容易陷入局部最优[1]。换句话说，tsne在目的上如果是完全正确的，结果上也会受到优化方法的制约。
（2）umap同样有相似的问题，不过有几个特性使其有可能有更好的性能，第一是他的初始化方法，使用谱嵌入作为初始化，天生有更好的全局性能，也避开了很多优化过程中的局部最优；第二是umap的优化是随机梯度下降法，比tsne的方法引入了更多的随机性，可以比较容易的避开全局最优；这个观点可以从论文[2]找到一些佐证。
（3）总的来说，tsne和umap是同一类方法，原理和处理流程都很相似，应用上最敏感的就是两者的时间复杂度。两个方法的主要应用上的区别是 pij qij计算时两个函数尖锐程度引起的。

另外，也欢迎做更深入的讨论，我们目前也正在努力做一些流形学习和可视化工具。

[1] Vladymyrov, Max. “No Pressure! Addressing the Problem of Local Minima in Manifold Learning Algorithms.” NIPS2019, ArXiv:1906.11389 [Cs, Stat], December 27, 2019. ​http://arxiv.org/abs/1906.11389.
[2] Kobak, Dmitry, and George C. Linderman. “UMAP Does Not Preserve Global Structure Any Better than T-SNE When Using the Same Initialization.” Preprint. Bioinformatics, December 19, 2019. ​https://doi.org/10.1101/2019.12.19.877522.

2021-02-18

​回复​10

Tivon

请问横纵坐标的UMAP1和UMAP2分别代表什么意思在看基因分析的论文这图一直看不懂
2021-10-27

​回复​4

大锤子

没有实际意义的
2021-12-27

​回复​3

Zander

就是把原始高维数据使用UMAP降维后的变量名，这个是没有实际意义的。比如说你原来有个三维数据，3个变量名叫做身高，体重，体脂，使用UMAP降维到2维得到了2个新的变量，这两个变量没有实际意义，就叫做UMAP1和UMAP2呗。

2024-12-16

​回复​1

展开其他 1 条回复​

小白Licko

受教了！
2021-01-28

​回复​1

ggmoney

想问一下，在UMAP高维关系的公式(5)中，σi 是什么呢？有什么作用呢？

2023-12-12

​回复​喜欢

大锤子

想问一下UMAP 降维过程中 PC 的选择？
2021-12-27

​回复​喜欢

二哥

想问一下, umap怎么在matlab上实现

2021-05-11

​回复​喜欢

二哥

臧泽林

多谢，作者的帮助
2021-05-12

​回复​喜欢

臧泽林

作者

我刚刚检索了下，似乎有相关的代码：​https://github.com/sg-s/umap-matlab-wrapper
2021-05-11

​回复​喜欢

bjyxszd666888

如何衡量降维的性能？确定n_components的值？

2020-11-24

​回复​喜欢

臧泽林

作者

你好，在我看来，无监督降维的性能评价没有一个黄金准则，有很多文章提出指标来进行量化。确定n_components的值在很多情况下还是手工进行选择的。

2021-01-20

​回复​1

小白Licko

臧泽林

请教一下，那您通常如何衡量降维效果呢？
2021-01-28

​回复​1

展开其他 2 条回复​

未登录用户

关于作者

臧泽林

回答
1
文章
6
关注者
261

​关注他​发私信

大家都在搜
换一换

伊朗局势464 万热
拼多多被罚 15.2 亿且暴力阻碍监管436 万热
李雨桐泄露薛之谦信息被行拘368 万热
日本发生7.5级地震326 万热
建议低精力人群查维D325 万热
网传酒店打回访电话致住客离婚300 万
女子频繁表白后被确诊「桃花癫」270 万
2026 人形机器人半程马拉松赛259 万
万达电影更名为儒意电影240 万
女子产后被男友起诉退彩礼分娩费225 万

推荐阅读

转录组不求人系列(四):UMAP分析及可视化
什么是UMAP？和PCA一样，一种降维的算法，如果不是统计学或者数据专业的人，我建议不要去看它的原理，知道如何用就足够了。 也许听到UMAP最多的是对单细胞数据的分析降维，类似于下图： 然…

TS的美梦

与分群数量和UMAP相关的魔法
前言：其实到现在单细胞的教程有很多，常规的前期质控跑到umap相信只要稍微看看教程就能跑完。但是每次运行的时候，被问的最多的就是两个问题：1、怎么分群才算合适，2、umap如何才能好看。…

茴的四种写法

使用UMAP对基因组数据降维，对比PCA
GWASL...发表于GWASL...

[译] 理解 UMAP(2): UMAP和一些误解
[译] 理解 UMAP(2): UMAP和一些误解转载自： https://pair-code.github.io/understanding-umap/ 原作者：Andy Coenen, Adam Pearce | Google PAIR译者：ZelinZang, zelinzang@gmail.com, 臧…

臧泽林