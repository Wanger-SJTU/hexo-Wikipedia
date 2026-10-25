---
title: (2 条消息) 流式聚类算法：DenStream 和 CluStream
date: "2024-12-03 00:00:00"
updated: "2024-12-03 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/流式聚类算法-DenStream-和-CluStream/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/10130905669
---


**直接说结论：全量聚类用 DBSCAN；无监督流式聚类用 DenStream；已知聚类数、按较大时间间隔获取聚类标签且对计算量敏感，用 CluStream.GitHub 项目地址：[stream-clustering](https://link.zhihu.com/?target=https%3A//github.com/luochang212/stream-clustering)

本文涉及的内容包括：

- 提供 DBSCAN、DenStream 和 CluStream 三种聚类算法的使用示例
- 开发对 DBSCAN 自动调参并输出聚类标签的函数 [auto_dbscan](https://link.zhihu.com/?target=https%3A//github.com/luochang212/stream-clustering/blob/main/utils.py%23L76)
- 验证 DenStream 的推理结果（簇号）是否在学习过程中发生变化：会变
- DBSCAN、DenStream 和 CluStream 全量训练效果对比：DBSCAN 最好
- DenStream 和 CluStream 增量训练效果对比：DenStream 最好
✨ 注意：运行以下代码依赖 [utils.py](https://link.zhihu.com/?target=https%3A//github.com/luochang212/stream-clustering/blob/main/utils.py) 文件。

### 一、DBSCAN

#### 1. DBSCAN 算法介绍

DBSCAN（Density-Based Spatial Clustering of Applications with Noise）是一种基于密度的聚类算法，用于从大量数据中识别出高密度区域并将其分为不同的簇（cluster）。与传统的基于划分的聚类算法（如 K-means）不同，DBSCAN 不需要预先指定簇的数量，并且能够识别噪声数据和异常值。

DBSCAN 的核心思想是通过密度来定义簇，它通过以下几个参数来控制聚类过程：

- Eps（ε）**：指定一个点的邻域范围。也就是，某个点的邻域内的其他点如果距离不超过 ε，那么这些点就属于该点的邻居。
- <strong>MinPts</strong>：定义一个簇的最小点数。当一个点的邻域内包含至少 MinPts 个点时，这个点被认为是一个核心点（Core Point）。核心点是簇的中心，可以扩展成一个簇。
- <strong>核心点（Core Point）</strong>：如果一个点的邻域内包含至少 MinPts 个点，那么这个点是一个核心点，并且它可以扩展成一个簇。
- <strong>边界点（Border Point）</strong>：如果一个点不是核心点，但是它在某个核心点的邻域范围内，那么它被认为是边界点。
- <strong>噪声点（Noise Point）</strong>：如果一个点既不是核心点也不是边界点，那么它被认为是噪声点，通常被忽略或标记为异常值。
<strong>DBSCAN 的工作原理</strong>

- 选择一个未被访问的点。
- 判断这个点是否是核心点（即是否有足够的邻居点）。如果是核心点，则该点及其邻域内的所有点形成一个簇。
- 如果该点不是核心点，那么它被标记为噪声点，除非它能作为某个核心点的边界点而被包含到已有的簇中。
- 重复此过程直到所有的点都被访问过。
<strong>优势</strong>

- 不需要预先指定簇的数量，适用于簇的形状不规则的情况。
- 能够识别噪声，即能够自动排除数据中的异常点。
- 适合处理大规模数据集，且对不均匀分布的簇具有良好的适应性。
<strong>劣势</strong>

- 对参数（特别是 ε 和 MinPts）的选择比较敏感，选择不当可能导致聚类结果不理想。
- 在高维空间中可能表现不佳，因为“邻域”在高维空间中变得不明显，容易导致聚类效果差。
总的来说，DBSCAN 是一种非常适合处理不规则形状数据和有噪声的数据集的聚类算法。

`# !pip install scikit-learn

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.cluster import DBSCAN
from sklearn.datasets import make_blobs
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import silhouette_score`
```


#### 2. DBSCAN 的简单示例

`# 生成示例数据
X, _ = make_blobs(n_samples=300, centers=4, cluster_std=0.60, random_state=0)
# X.shape
# (300, 2)

# 选择DBSCAN的参数
dbscan = DBSCAN(eps=0.3, min_samples=10)

# 进行聚类
dbscan.fit(X)

# 获取聚类标签
labels = dbscan.labels_

# 绘制结果
scatter = plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='viridis')

# 使用 set_unique_labels 来为不同的簇分配标签
unique_labels = np.unique(labels)
handles = [plt.Line2D([0], [0],

```text
                      marker='o',
                      color='w',
                      markerfacecolor=scatter.cmap(i / len(unique_labels)),
                      markersize=10)
           for i in range(len(unique_labels))]
```

labels_for_legend = [f'Cluster {label}' for label in unique_labels]
plt.legend(handles, labels_for_legend, title="Clusters", loc='center left', bbox_to_anchor=(1, 0.5))

plt.title('DBSCAN Clustering')
plt.show()`

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_862832183ad9.jpg)

`# 将样本和聚类结果存到一个 DataFrame
cluster_df = pd.DataFrame({

```text
    "sample": X.tolist(),
    "label": labels.tolist()
})
```


# cluster_df`

注意：标记为 -1 的点是离群点，它们不构成一个簇。

#### 3. DBSCAN 的可选参数

参数说明：

- `eps`（邻域的最大距离）：定义了一个点的邻域范围，表示在一个点的周围必须有多少其他点在距离 eps 内，才能将该点视为核心点。较小的 eps 值通常会导致较多的离群点，而较大的 eps 值会导致更多的点被归为一个簇。
- `min_samples`（核心点的最小邻居数）：定义了一个点在其邻域内至少需要有多少个点（包括它自己），才能成为核心点。min_samples 值越大，聚类结果越保守，聚类簇越小，噪声点越多。
- `metric`（距离度量方式）：定义了计算点与点之间距离的方式，常见的有 "euclidean"（欧氏距离），"manhattan"（曼哈顿距离）等。
- `algorithm`（计算方式）：可以选择不同的算法来计算距离，"auto", "ball_tree", "kd_tree", "brute"。
- `leaf_size`（树叶的大小）：在使用 ball_tree 或 kd_tree 算法时，决定了树的叶子节点的大小。适当调整此参数可以影响聚类的速度。
- `p`（用于Minkowski距离的参数）：在计算距离时，p 影响距离度量。p=2 为欧氏距离，p=1 为曼哈顿距离。
- `n_jobs`（并行作业数）：指定计算过程中使用的 CPU 核心数，-1 表示使用所有可用核心。
`# dir(DBSCAN)
# help(DBSCAN)
# DBSCAN??

# 查看当前模型参数
# dbscan.get_params()`

#### 4. DBSCAN 自动调参

**1）基于 K 距离图选择 `eps`** 

<strong>Note:</strong> 这种方法需要人工设置 `min_samples` 参数，但可以减少对eps参数的人工调整。<strong>K 距离图</strong>：DBSCAN 中的 eps 参数控制着邻域的大小。通常通过计算每个点到其 k 个最近邻的距离来估算一个合适的 eps 值。一个常见的做法是，通过绘制每个点的 k 距离排序图（k-distance graph），寻找一个“肘部”位置来确定 eps。

具体步骤：

- 计算每个点到其 k 个最近邻的距离。
- 按照距离从小到大排序，并绘制距离图。
- 寻找图中的“肘部”，即距离增长速度开始加快的点，作为 eps 值。
`# 使用 NearestNeighbors 计算 k 距离
k = 4  # min_samples 设置为 4，选择其邻域的第四个最近邻
neighbors = NearestNeighbors(n_neighbors=k)
neighbors_fit = neighbors.fit(X)
distances, indices = neighbors_fit.kneighbors(X)

# 计算每个点到其第 k 个最近邻的距离，并按升序排列
distances = np.sort(distances[:, k-1], axis=0)

# 绘制 k-distance 图
plt.plot(distances)
plt.title("k-distance graph")
plt.xlabel("Points sorted by distance")
plt.ylabel("Distance to the k-th nearest neighbor")
plt.show()`

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_50fba0830159.jpg)

观察纵坐标，选择一个距离开始加快之前的距离作为 eps 值。

**2）选择 `min_samples` 的经验法则**

- `min_samples` 的定义：min_samples 定义了一个区域需要多少个相邻点才能被认为是一个密集区域，从而成为一个聚类的核心
- `min_samples` 的影响：如果 min_samples 设置得较高，DBSCAN 会找到更密集的聚类；如果设置得较低，找到的聚类会更稀疏
- 默认值：通常情况下，min_samples 的默认值是 4，这是一个常见的推荐值，尤其适用于二维数据。如果数据集的维度较高，可以考虑根据数据的大小和密度来选择 min_samples
- 基于数据集大小选择：通常，min_samples 的值应该大于数据集的维度。也有一些经验法则，例如选择大约 `min_samples = 2 * 数据维度`
<strong>3）使用网格搜索结合合适的评估指标（例如轮廓系数）</strong>

对于 DBSCAN，虽然没有直接的 score 方法来评估聚类效果，但你可以使用 轮廓系数（Silhouette Score）来评估聚类质量。通过网格搜索来选择不同的 eps 和 min_samples，并通过轮廓系数来评估其效果。

`# 定义参数搜索空间
param_grid = {
    'eps': [0.5, 0.6, 0.7, 0.8, 0.9],
    'min_samples': [6, 8, 10, 12, 14]

```text
}
```


# 创建 DBSCAN 实例
dbscan = DBSCAN()

# 假设 X 是你的数据集
best_score = -1  # 用于存储最佳轮廓系数
best_params = {}  # 用于存储最佳参数

# 手动进行网格搜索
for eps in param_grid['eps']:
    for min_samples in param_grid['min_samples']:

```text
        dbscan.set_params(eps=eps, min_samples=min_samples)
        labels = dbscan.fit_predict(X)
```


        # 计算轮廓系数

```python
        if len(set(labels)) > 1:  # 确保至少有两个簇
            score = silhouette_score(X, labels)
            print(f"eps={eps}, min_samples={min_samples}, silhouette_score={score}")
```


            if score > best_score:

```text
                best_score = score
                best_params = {'eps': eps, 'min_samples': min_samples}
```


# 输出最佳参数
print("Best parameters found:", best_params)
# Best parameters found: {'eps': 0.8, 'min_samples': 10}`

#### 5. 使用 `best_params` 进行聚类

使用调参后的参数进行聚类。

`# 选择DBSCAN的参数
dbscan = DBSCAN(**best_params)

# 进行聚类
dbscan.fit(X)

# 获取聚类标签
labels = dbscan.labels_

# 绘制结果
scatter = plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='viridis')

# 使用 set_unique_labels 来为不同的簇分配标签
unique_labels = np.unique(labels)
handles = [plt.Line2D([0], [0],

```text
                      marker='o',
                      color='w',
                      markerfacecolor=scatter.cmap(i / len(unique_labels)),
                      markersize=10)
           for i in range(len(unique_labels))]
```

labels_for_legend = [f'Cluster {label}' for label in unique_labels]
plt.legend(handles, labels_for_legend, title="Clusters", loc='center left', bbox_to_anchor=(1, 0.5))

plt.title('DBSCAN Clustering')
plt.show()`

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cf259b912de4.jpg)

#### 6. 一站式 DBSCAN 函数

写一个自动调参并绘图的 DBSCAN 函数。

`def get_best_params(data, param_grid=None, verbose=False):
    """获取 DBSCAN 的最佳参数"""
    # 如果没有初始化 param_grid
    if param_grid is None:

```text
        param_grid = {
            'eps': [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
            'min_samples': [2, 4, 6, 8, 10, 12, 14]
        }
```


    # 创建 DBSCAN 实例
    dbscan = DBSCAN()

    # 手动进行网格搜索

```text
    best_score = -1  # 用于存储最佳轮廓系数
    best_params = {}  # 用于存储最佳参数
    for eps in param_grid['eps']:
        for min_samples in param_grid['min_samples']:
            dbscan.set_params(eps=eps, min_samples=min_samples)
            labels = dbscan.fit_predict(data)
```


            # 计算轮廓系数

```python
            if len(set(labels)) > 1:  # 确保至少有两个簇
                score = silhouette_score(data, labels)
                if verbose:
                    print(f"eps={eps}, min_samples={min_samples}, silhouette_score={score}")
```


                if score > best_score:

```python
                    best_score = score
                    best_params = {'eps': eps, 'min_samples': min_samples}

    return best_params

def get_labels(data, best_params):
    """使用最优参数计算聚类标签"""

    dbscan = DBSCAN(**best_params)
```


    # 进行聚类
    dbscan.fit(data)

    # 获取聚类标签

```python
    labels = dbscan.labels_

    return labels

def simple_scatter(data, labels, title='DBSCAN Clustering', is_show=True):
    """绘制聚类结果"""
```


    # 绘制结果
    scatter = plt.scatter(data[:, 0], data[:, 1], c=labels, cmap='viridis')

    # 使用 set_unique_labels 来为不同的簇分配标签

```python
    unique_labels = np.unique(labels)
    handles = [plt.Line2D([0], [0],
                          marker='o',
                          color='w',
                          markerfacecolor=scatter.cmap(i / len(unique_labels)),
                          markersize=10)
               for i in range(len(unique_labels))]
    labels_for_legend = [f'Cluster {label}' for label in unique_labels]
    plt.legend(handles, labels_for_legend, title="Clusters", loc='center left', bbox_to_anchor=(1, 0.5))

    plt.title(title)
    if is_show:
        plt.show()

    return plt

def auto_dbscan(data,
                param_grid=None,
                verbose=False,
                title='DBSCAN Clustering',
                is_show=True):
    """"自动对参数进行寻优的 DBSCAN 算法"""
    # 获取最优参数
    best_params = get_best_params(data, param_grid, verbose)
```


    # 获取聚类标签
    labels = get_labels(data, best_params)

    # 绘制聚类结果

```text
    simple_scatter(data, labels, title, is_show)

    return best_params, labels
```


test_data = np.concatenate([

```text
    np.random.randn(100, 2) + np.array([5, 5]),
    np.random.randn(100, 2) + np.array([-1, -5]),
    np.random.randn(100, 2) + np.array([5, -3]),
    np.random.randn(100, 2) + np.array([-2.5, 5]),
    np.random.randn(100, 2) + np.array([0, 0]),
])
```

best_params, labels = auto_dbscan(data=test_data)

```python
print(f'best_params: {best_params}')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_55faad10423a.jpg)

`best_params: {'eps': 0.9, 'min_samples': 6}`

### 二、DenStream

官方文档：[DenStream](https://link.zhihu.com/?target=https%3A//riverml.xyz/latest/api/cluster/DenStream/)

#### 1. DenStream 算法介绍

<strong>DenStream</strong> 是一种用于流数据聚类的算法，属于基于密度的聚类方法（类似于 DBSCAN），但是它特别设计用于处理动态变化的流数据。流数据指的是不断到来的数据，通常是高维、具有噪声和不规则分布的。DenStream 是一种增量式的聚类方法，能够在数据到达时实时更新聚类结果，而不需要重新处理整个数据集。

DenStream 的核心思想是使用“核心对象”和“边界对象”来定义聚类。具体来说，算法将数据点分为三类： 1. <strong>核心对象</strong>（Core Objects）：这些点是某个簇的密度核心，周围有足够多的邻居点。 2. <strong>边界对象</strong>（Border Objects）：这些点距离核心对象较远，但在核心对象的邻域内。 3. <strong>噪声对象</strong>（Noise Objects）：这些点既不属于任何核心对象，也不接近任何边界对象。

<strong>DenStream 的关键技术</strong>

- <strong>Micro-clusters（微簇）</strong>：DenStream 维护一组微簇，这些微簇是对数据流的压缩表示。每个微簇都存储了一些关键的统计信息（如均值和密度等），以便在新数据到来时能够快速更新。
- <strong>动态更新</strong>：随着新数据的到来，算法会实时更新微簇的状态，判断是否有新的簇形成或旧的簇解散。
- <strong>时间窗机制</strong>：为了处理流数据的动态特性，DenStream 会使用一个滑动时间窗，来确保过时的数据不会对聚类结果产生影响。
<strong>优点</strong>

- <strong>处理动态数据</strong>：能够适应数据流的变化，不断调整聚类结果。
- <strong>在线聚类</strong>：无需存储所有历史数据，适用于大规模数据流。
- <strong>噪声鲁棒性</strong>：通过密度的定义，能够有效识别噪声数据。
<strong>应用场景</strong>

- <strong>实时数据流分析</strong>：如社交媒体数据、传感器数据、金融交易数据等。
- <strong>物联网（IoT）数据聚类</strong>：处理从不同设备实时生成的传感器数据。
- <strong>动态市场分析</strong>：实时聚类和分类商品或消费者行为数据。
总之，DenStream 是一个强大的流数据聚类工具，适用于各种需要实时分析和动态调整聚类结果的场景。

`# !pip install river

```python
import numpy as np
import utils

from river import cluster, stream`
```


#### 2. DenStream 的简单示例

`np.random.seed(67)
X = np.concatenate([

```text
    np.random.randn(100, 2) + np.array([5, 5]),
    np.random.randn(100, 2) + np.array([-1, -5]),
    np.random.randn(100, 2) + np.array([5, -3]),
    np.random.randn(100, 2) + np.array([-2.5, 5]),
    np.random.randn(100, 2) + np.array([0, 0]),
])
```


# 打乱数据
np.random.shuffle(X)

# X.shape
# (500, 2)

# 初始化 DenStream 聚类器
denstream = cluster.DenStream(decaying_factor=0.01,

```text
                              beta=0.5,
                              mu=2.5,
                              epsilon=0.5,
                              n_samples_init=10)
```


# 对数据流进行增量学习
for x, _ in stream.iter_array(X):

```text
    denstream.learn_one(x)
    # print(f"Data point: {x} -> Cluster: {denstream.predict_one(x)}")
```


# 预测新的数据点
prediction = denstream.predict_one({0: -1, 1: -2})

# 输出预测结果

```python
print(f"Predicted cluster for point (-1, -2): {prediction}")
```

# Predicted cluster for point (-1, -2): 8

# 打印聚类中心点
# denstream.centers`

#### 3. DenStream 的可选参数

参数说明：

参数默认值说明decaying_factor0.25决定流数据中历史信息的衰减速度，影响历史数据点的权重。beta0.75决定相对于核心微簇异常点的阈值，值域为 (0,1]。mu2决定相对于核心微簇异常点的阈值，值域为 (1/beta, inf)。epsilon0.02控制邻域的范围，影响数据点的相似性判定。n_samples_init1000初始样本数，用于初始化聚类器的微簇状态。stream_speed100单位时间内到达的点数。`# dir(denstream)
# help(denstream)
# denstream??`

#### 4. 验证：推理结果是否随时间变化

在学习过程中，把预测产生的簇号保存下来。当学习和预测完成以后，再将之前用于学习和预测的数据点预测一遍，对比前后簇号是否发生变化。

`# 划分训练数据和测试数据
test_rate = 0.2
train_num = int(len(X) * (1 - test_rate))
x_train, x_test = X[:train_num], X[train_num:]

# 初始化 DenStream 聚类器
denstream = cluster.DenStream(decaying_factor=0.01,

```text
                              beta=0.5,
                              mu=2.5,
                              epsilon=0.5,
                              n_samples_init=10)
```


# 用于存储数据点和学习过程中的簇号
save_train = dict()

# 对数据流进行增量学习
for i, (x, _) in enumerate(stream.iter_array(x_train)):

```text
    denstream.learn_one(x)
    prediction = denstream.predict_one(x)
    save_train[i] = {'data': x,
                     'cluster': prediction}
    # print(f'Train {i}: {x} -> {prediction}')
```


# 预测新的数据点
save_test = dict()
for i, (x, _) in enumerate(stream.iter_array(x_test)):

```text
    prediction = denstream.predict_one(x)
    save_test[i] = {'data': x,
                    'cluster': prediction}
    # print(f'Test {i}: {x} -> {prediction}')`
```


**

`# 再将所有的训练和预测数据预测一遍，看是否发生变化

# 再次预测 训练数据
new_save_train = dict()
for i, (x, _) in enumerate(stream.iter_array(x_train)):

```text
    prediction = denstream.predict_one(x)
    new_save_train[i] = {'data': x,
                         'cluster': prediction}
    # print(f'Train {i}: {x} -> {prediction}')
```


# 再次预测 测试数据
new_save_test = dict()
for i, (x, _) in enumerate(stream.iter_array(x_test)):

```text
    prediction = denstream.predict_one(x)
    new_save_test[i] = {'data': x,
                    'cluster': prediction}
    # print(f'Test {i}: {x} -> {prediction}')`
```


`# 训练数据：初次预测与再次预测对比
assert len(save_train) == len(new_save_train)
cnt = 0
for i in save_train.keys():

```python
    is_data_equal = bool(save_train[0]['data'] == new_save_train[0]['data'])
    is_cluster_equal = bool(save_train[0]['cluster'] == new_save_train[0]['cluster'])
    if not (is_data_equal and is_cluster_equal):
        print(f'Train {i}: data_equal={is_data_equal}, cluster_equal={is_cluster_equal}')
        cnt += 1
    if cnt > 5: break`
```


输出：

`Train 0: data_equal=True, cluster_equal=False
Train 1: data_equal=True, cluster_equal=False
Train 2: data_equal=True, cluster_equal=False
Train 3: data_equal=True, cluster_equal=False
Train 4: data_equal=True, cluster_equal=False
Train 5: data_equal=True, cluster_equal=False`

`# 测试数据：初次预测与再次预测对比
assert len(save_test) == len(new_save_test)
for i in save_test.keys():

```python
    is_data_equal = bool(save_test[0]['data'] == new_save_test[0]['data'])
    is_cluster_equal = bool(save_test[0]['cluster'] == new_save_test[0]['cluster'])
    if not (is_data_equal and is_cluster_equal):
        print(f'Train {i}: data_equal={is_data_equal}, cluster_equal={is_cluster_equal}')`
```


（以上代码无输出）

结论：只有训练阶段的簇号会变，预测阶段簇号就不变了。

#### 5. DBSCAN 与 DenStream 效果对比

对比使用 DBSCAN 做全量聚类与使用 DenStream 做流式聚类的效果。

`dbscan_best_params, dbscan_labels = utils.auto_dbscan(data=X)

```python
print(f'best_params: {dbscan_best_params}')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4bc6571643cf.jpg)

`best_params: {'eps': 0.9, 'min_samples': 6}
# dbscan_labels.shape
# (500,)

# 使用 DenStream 流式聚类

```python
def denstream_init(data,
                    decaying_factor=0.01,
                    beta=0.5,
                    mu=2.5,
                    epsilon=0.5,
                    n_samples_init=10):
```


    # 初始化 DenStream 聚类器

```text
    denstream = cluster.DenStream(decaying_factor=decaying_factor,
                                  beta=beta,
                                  mu=mu,
                                  epsilon=epsilon,
                                  n_samples_init=n_samples_init)
```


    # 对数据流进行增量学习

```text
    for x, _ in stream.iter_array(data):
        denstream.learn_one(x)

    return denstream
```


# 对全量数据做流式聚类
denstream = denstream_init(X)

# 对全量数据做预测
denstream_labels = list()
for x, _ in stream.iter_array(X):

```text
    prediction = denstream.predict_one(x)
    denstream_labels.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=denstream_labels,
                     title='DenStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9841ef073e3f.jpg)

结论：DenStream 的聚类效果不如 DBSCAN，主要差在全局信号，从局部来看 DenStream 聚得没什么问题。

#### 6. 使用 DBSCAN 优化过的 `epsilon` 参数

在 DenStream 算法中，使用在相同数据集上使用 DBSCAN 算法在全量数据上寻优过的 `epsilon` 参数，看能否产生更好的聚类效果。

`# 流式聚类：使用与 DBSCAN 相同的 epsilon 参数
denstream_epsilon = dbscan_best_params['eps']

# 对全量数据做流式聚类
denstream = denstream_init(X,

```text
                            decaying_factor=0.01,
                            beta=0.75,
                            mu=2,
                            epsilon=denstream_epsilon,
                            n_samples_init=10)
```


# 对全量数据做预测
denstream_labels = list()
for x, _ in stream.iter_array(X):

```text
    prediction = denstream.predict_one(x)
    denstream_labels.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=denstream_labels,
                     title='DenStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_796a117b7b87.jpg)

结论：借用 DBSCAN 的最优 `epsilon` 参数参数对 DenStream 帮助不大。

### 三、CluStream

官方文档：[CluStream](https://link.zhihu.com/?target=https%3A//riverml.xyz/latest/api/cluster/CluStream/)

#### 1. CluStream 算法介绍

CluStream（Clustering Stream）算法是一种用于数据流聚类的算法，主要应用于大规模、高速生成的数据流场景。它能够高效地对数据流进行实时聚类，且支持动态变化的聚类结构。值得注意的是，CluStream 在执行聚类时需要明确指定聚类数，这包括微观聚类阶段的微簇数量和宏观聚类阶段的最终簇数量。

CluStream算法的基本流程**

CluStream算法的基本思想是通过以下两个主要步骤来对数据流进行聚类：

- <strong>微观聚类（Micro-Clustering）</strong>：

- CluStream 将数据流分为多个小的时间窗口（或者称为微观窗口），每个窗口中的数据被聚成一个微观聚类。微观聚类通常是通过高效的聚类算法（如 k-means）进行实时更新的。
- 每个微观聚类代表了一段时间内流数据的局部模式。这些微观聚类能够捕捉到数据流的变化，确保聚类反映数据流的动态特征。 

- <strong>宏观聚类（Macro-Clustering）</strong>：

- 宏观聚类对微观聚类进行再聚类。微观聚类本身不直接用于最终的聚类结果，而是通过宏观聚类将这些微观聚类进行合并，形成一个全局聚类的结构。
- 宏观聚类算法通常基于相似度度量（如欧几里得距离或余弦相似度）对微观聚类进行进一步聚类。这一层聚类有助于捕捉整个数据流的全局模式。

<strong>CluStream算法的优势：</strong>

- <strong>处理数据流</strong>：CluStream 能够处理数据流，适应数据的增量输入，实时更新聚类结果。
- <strong>动态性</strong>：随着数据流的变化，CluStream 能够动态调整聚类结构，适应数据的变化。
- <strong>高效性</strong>：它将计算复杂度分散到微观聚类和宏观聚类的层次，能够高效地处理大规模数据流。
<strong>应用场景：</strong>

- <strong>实时数据流分析</strong>：如传感器数据、金融市场数据、社交网络流数据等。
- <strong>在线聚类</strong>：适用于需要实时处理大量数据并更新聚类结果的场景。
总体而言，CluStream 是一种能够高效处理动态数据流并适应实时聚类需求的算法，尤其适合那些数据量巨大且数据分布不断变化的应用场景。

`import time

```python
import numpy as np
import utils

from sklearn.datasets import make_blobs
from river import cluster, stream`
```


#### 2. CluStream 的简单示例

`cluster_num = 8
X, _ = make_blobs(n_samples=500, centers=cluster_num, cluster_std=0.60, random_state=0)

# 打乱数据
np.random.shuffle(X)

# 初始化 CluStream 模型
clustream = cluster.CluStream(n_macro_clusters=3,  # n_macro_clusters 是最终形成的宏簇（macro-clusters）的数量

```text
                              max_micro_clusters=100,  # max_micro_clusters 是微簇（micro-clusters）的最大数量
                              micro_cluster_r_factor=2,  # micro_cluster_r_factor 是微簇半径的乘数因子
                              time_window=1000,  # time_window 是时间窗口的大小
                              time_gap=5)  # time_gap 是增量 K-Means 算法应用的时间间隔
```


# 对数据流进行增量学习
for i, (x, _) in enumerate(stream.iter_array(X)):
    clustream.learn_one(x)

# 预测新数据点的聚类
clustream.predict_one({0: -1, 1: -2})
# 0

# 输出聚类中心
# clustream.centers`

#### 3. CluStream 的可选参数

参数说明：

参数默认值说明n_macro_clusters5k-means 算法中的聚类数量。max_micro_clusters100使用的最大微簇数量。micro_cluster_r_factor2微簇半径的乘数因子。在决定将新数据点添加到微簇时，最大边界定义为微簇中数据点从质心的均方根 (RMS) 偏差的 micro_cluster_r_factor 倍。time_window1000如果当前时间是 T，时间窗口是 h，我们只考虑在 (T-h,T) 期间到达的数据。time_gap100在每个 time_gap 之后，对当前可用的微簇应用增量 k-means 聚类算法，以形成最终的宏聚类解决方案。seedNone用于生成初始质心位置的随机种子。kwargs传递给增量 kmeans 的 cluster.KMeans 的其他参数。
#### 4. CluStream 全量训练

使用 CluStream 对全量数据训练后进行预测。

<strong>1）宏簇数量 与 真实聚类数 相等的情况</strong>

当宏簇数量`n_macro_clusters` 数量与当前聚类数相同时：

`n_macro_clusters = cluster_num

# 初始化 CluStream 模型
clustream = cluster.CluStream(n_macro_clusters=n_macro_clusters,

```text
                              max_micro_clusters=100,
                              micro_cluster_r_factor=2,
                              time_window=1000,
                              time_gap=5)
```


# 对数据流进行增量学习
for i, (x, _) in enumerate(stream.iter_array(X)):
    clustream.learn_one(x)

# 对全量数据做预测
clustream_labels = list()
for x, _ in stream.iter_array(X):

```text
    prediction = clustream.predict_one(x)
    clustream_labels.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=clustream_labels,
                     title='CluStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2d2f03bc37a8.jpg)

<strong>2）宏簇数量 与 真实聚类数 不等的情况</strong>

当宏簇数量`n_macro_clusters` 数量与当前聚类数不匹配时：

`n_macro_clusters = 5
assert n_macro_clusters != cluster_num

# 初始化 CluStream 模型
clustream = cluster.CluStream(n_macro_clusters=n_macro_clusters,

```text
                              max_micro_clusters=100,
                              micro_cluster_r_factor=2,
                              time_window=1000,
                              time_gap=5)
```


# 对数据流进行增量学习
for i, (x, _) in enumerate(stream.iter_array(X)):
    clustream.learn_one(x)

# 对全量数据做预测
clustream_labels = list()
for x, _ in stream.iter_array(X):

```text
    prediction = clustream.predict_one(x)
    clustream_labels.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=clustream_labels,
                     title='CluStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3832498e75c9.jpg)

#### 5. DenStream 与 CluStream 增量训练效果对比

收集在学习过程中产生的聚类标签，对比效果。

`# DenStream 增量训练

# 初始化 DenStream 聚类器
denstream = cluster.DenStream(decaying_factor=0.01,

```text
                              beta=0.75,
                              mu=2,
                              epsilon=0.9,
                              n_samples_init=10)
```


# 对数据流进行增量学习
denstream_inc_lables = []
for x, _ in stream.iter_array(X):

```text
    denstream.learn_one(x)
    prediction = denstream.predict_one(x)
    denstream_inc_lables.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=denstream_inc_lables,
                     title='DenStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9b5f14d12e41.jpg)

`# CluStream 增量训练

# 初始化 CluStream 模型
clustream = cluster.CluStream(n_macro_clusters=cluster_num,

```text
                              max_micro_clusters=10,
                              micro_cluster_r_factor=2,
                              time_window=1000,
                              time_gap=3)
```


# 对数据流进行增量学习
clustream_inc_lables = []
for i, (x, _) in enumerate(stream.iter_array(X)):
    # 增加等待时间

```text
    if i % 30 == 0:
        time.sleep(1)

    clustream.learn_one(x)
    prediction = clustream.predict_one(x)
    clustream_inc_lables.append(prediction)
```


# 绘图
utils.simple_scatter(data=X,

```text
                     labels=clustream_inc_lables,
                     title='CluStream Clustering')`
```


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e0e1d5b2f6ee.jpg)

结论：如果你需要对数据做增量学习，并且实时使用聚类标签，那么 DenStream 的效果更胜一筹。

### 附录：轮廓系数

<strong>轮廓系数（Silhouette Coefficient）</strong> 是一种用于评估聚类效果的指标，它从单个样本的角度衡量其聚类的合理性。轮廓系数综合考虑了样本与其所属簇内点的相似性（紧密度）和样本与其最近簇的点的相似性（分离度）。

#### <strong>1. 定义公式</strong>

对于某个样本 i ： 

<strong>1）簇内平均距离（</strong> a(i) <strong>）</strong>：

- 定义为样本 i 到同簇内其他样本的平均距离，反映其与本簇的紧密程度。
- 数值越小，说明样本 i 越靠近本簇的中心。  

```text
    $$a(i) = \frac{1}{|C| - 1} \sum_{j \in C, j \neq i} d(i, j)     $$
```


其中， C 是样本 i 所属的簇， d(i, j) 是样本 i 和 j 之间的距离。

<strong>2）最近簇的平均距离（</strong> b(i) <strong>）</strong>：

- 定义为样本 i 到其最近的其他簇的所有样本的平均距离。
- 最近簇是指与样本 i 的簇 C 之外的簇 C' 中，距离样本 i 最近的簇。

```text
    $$b(i) = \min_{C' \neq C} \frac{1}{|C'|} \sum_{j \in C'} d(i, j)     $$
```


<strong>3）轮廓系数（</strong> s(i) <strong>）</strong>：

$$- 综合 a(i) 和 b(i) ，计算样本 i 的轮廓系数：    s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}     $$
- 取值范围： -1 \leq s(i) \leq 1 

- s(i) \approx 1 ：样本聚类效果好，距离本簇中心较近且远离其他簇。
- s(i) \approx 0 ：样本在簇边界，可能属于多个簇。
- s(i) \approx -1 ：样本聚类效果差，可能被错误分配到簇。

#### 2. 数据集的整体轮廓系数

$$对于整个数据集的轮廓系数，取所有样本 s(i) 的平均值：  S = \frac{1}{n} \sum_{i=1}^n s(i)  其中 n 是样本总数。$$

#### 3. 适用场景

- <strong>聚类效果评价</strong>：轮廓系数可以直观反映聚类效果好坏，常用于评估不同的聚类参数（如 DBSCAN 的 eps 、K-means 的簇数 k ）。
- <strong>聚类模型选择</strong>：在多个聚类结果中，选择轮廓系数更高的模型。
- <strong>无监督学习的模型优化</strong>：尤其是在没有标签的情况下，用轮廓系数对模型进行评估。

#### 4. 优点和局限

<strong>1）优点</strong>

-  不依赖标签，无监督
- 提供了样本级别的聚类质量评价
<strong>2）局限</strong>

- 计算复杂度较高，尤其在大规模数据中
- 对高维数据的评价可能受距离度量方式的影响