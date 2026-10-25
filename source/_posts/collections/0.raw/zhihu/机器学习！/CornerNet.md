---
title: CornerNet
date: "2019-05-25 00:00:00"
updated: "2019-05-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/CornerNet/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/66406815
---


论文  CornerNet: Detecting Objects as Paired Keypoints

这是一篇anchor free的目标检测的论文，文中指出，使用anchor的缺点在于：1. anchor boxes数量巨大，使得正负例不平衡，一般采取的方法有设置IOU阈值上下限，并给定正负例比例(比如1:3)，或者难负例挖掘；2. 引入了超参数，比如anchor的scale，aspect ratio，确定这些超参数是一个较为复杂的工作。

本文提出一个方法CornerNet，顾名思义就是使用左上角和右下角来预测bbox。如图1所示，输入image经过一个ConvNet（用于生成feature map）后，分上下两支，上面分支module负责预测左上角corner，下面分支module负责预测右下角corner。以上面分支为例，这个module以backbone的输出feature map作为输入，输出是heatmaps，预测某个location是否是左上角。这样上下两个分支分别预测出左上角corners和右下角corners，但是哪个左上角对应哪个右下角呢？从图1中可见，每个分支还为corner生成embedding vector，这个嵌入向量与NLP中的词嵌入向量类似，在NLP中将每个word映射到向量空间某一点。这里类似地，将每个corner映射到向量空间某一点，且如果某个topleft corner与bottomright corner属于同一个目标，那么可以**人为设计**让这两corner在向量空间应该靠的很近，即对应embedding vector 差的L1范数很小，这样在检测阶段，使用一个阈值，当某个tl corner与 br corner的embedding vector的差的L1范数小于这个阈值时，就可以认为tl corner与br norner组成一个 bbox。

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_1cd69f5aa0d4.jpg)

本文另一个创新点是使用了corner pooling，即图1中上下两个分支分别使用了corner pooling，这个layer有助于更好地定位bbox的corner。如图2，一个目标的bbox的corner往往位于目标之外，

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_85a4e8e05982.jpg)

所以要确定一个location是不是corner，仅凭location附近的局部信息是不够的。作者认为，要确定一个location是不是top-left corner，需要从这个location水平向右看，才能知道是不是目标的topmost边界，同理，从这个location垂直向下看，才能知道是不是目标的leftmost边界。这就是corner pooling层，如图3，以两个feature map作为输入，在每个location位置，从其中一个feature map上max-pool所有位于这个location右边的位置的feature vectors，从另外一个feature map上max-pool所有位于这个location下边的位置的feature vectors，然后将得到的两个vector相加，最终得到这个location的vector，为什么是一个vector呢？因为每个category独立进行，所以是一个vector，其长度为category数量。所有location的vector就组成heatmap。

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_06f4005fbd23.jpg)

作者还解释了为什么使用检测corner的方法。首先，比起检测bbox的中心，corner仅依赖于object 的两条边，而center则依赖四条边，所以检测corner显得更简单些，并且corner pooling层运用了corner的先验知识（即corner的定义，比如左上角corner是由topmost边界和leftmost边界确定），使得检测更加简单；其次，比起使用region proposal的检测方法，corner在离散化bbox空间更加高效，比如 `(h,w)`的feature map，corner总共有 wh 种可能性，而anchor box则有 [1+2+\cdot \cdot \cdot+(w-1)][1+2+\cdot\cdot\cdot+(h-1)]=\frac {w(w-1) h(h-1)} 4 种可能性，所以可以说使用了 O(wh)  的corners 来表征 O(w^2h^2) 的anchor boxes（之前sota方法中也是固定一组anchor 的scale和aspect ratio，使得每个location有A个anchor，从而降低anchor的可能性到 Awh ，即 O(wh) ）。

### CornerNet

- 概述
简单概括CornerNet就是使用一个卷积网络ConvNet生成两组heat maps来预测不同分类下的corners，其中一组负责预测左上角，另一组负责预测右下角。ConvNet为每个corner预测embedding vector，用于判断某左上角和右下角是否同属一个目标，并且为了使得通过预测左上角和右下角corner得到的bbox更加紧贴目标，ConvNet还预测了corner的location偏差offset。如图4，

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_85eb8875ee61.jpg)

backbone使用hourglass network，后接两个预测模块（top-left和bottom-right），每个模块有自己的corner pooling层，预测heatmap，embedding和offset三个部分。虽然当前的目标检测方法很多都是对不同scale的目标使用不同scale的feature（FPN），但是本文仅将预测模块应用到hourglass network的输出上。

2. 检测corner

两组heatmaps分别负责预测top-left corners和bottom-right corners。每组heatmap有C个channel，其中C是category数量，heatmap的size为 H \times W 。没有 bg 对应的channel，因为预测为corner的则为正location，否则为负location，某个location的所有channel上的值预测可以均为负，表示这个location是bg，所以没有必要为bg增加单独的channel。每个channel就是一个binary mask，表示location是否是这个分类下的corner。

对于某个corner，仅有一个gt positive location，其他location相对于这个corner均为negative。训练阶段，损失函数中对negative location的惩罚不是一视同仁的，因为即使一对错误的corner检测（左上和右下），如果足够靠近 gt corner locations，那么生成的box与 gt box 有很大的IOU，如图5，

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_f470d9b0809b.jpg)

所以在以gt corner location为中心的某个圆内，应该降低对negative location的惩罚比较合理，随着negative location远离圆中心，逐渐增大惩罚。记 y_{cij} 为gt heatmap的值，当 (i,j) 位置处是gt corner且对应分类为 c 时， y_{cij}=1 表示positive，其余情况 y_{cij}=0 表示negative，现在既然在gt corner对应分类 c 下对一定几何范围内的negative location 降低惩罚，不如修改 y_{cij} 为

$$y_{cij}=\begin{cases} e^{-\frac {x^2+y^2} {2 \sigma^2}} ,  & x^2+y^2 \le r^2 \\ 0 , & o.w. \end{cases} $$

其中 x,y 表示negative location (i,j) 与 gt corner location（圆中心）的坐标相对值，注意 y 与 y_{cij} 没有半毛钱关系，表示两个变量， r 是圆的半径（后面讨论如何计算得到），\sigma=\frac r 3 ，这个值控制惩罚降低的变化速度，值越大，随着negative location远离圆中心， y_{cij} 值下降的越慢（高斯函数曲线越扁平）。

经过这个修改后， y_{cij}=1 依然表示positive，而 y_{cij} 表示negative，对negative location的惩罚降低因子就与 y_{cij} 保持一致，即，随着距离增大，两者的增减性一致，于是在原来的惩罚项上增加一个惩罚因子为 (1-y_{cij}) ，表示降低惩罚。使用focal loss，并考虑进这个惩罚因子，损失函数为

$L_{det} = -\frac 1 N \sum_{c=1}^C \sum_{i=1}^H \sum_{j=1}^W \begin {cases} (1-p_{cij})^{\alpha} \log (p_{cij}) & y_{cij}=1 \\ (1-y_{cij})^{\beta} (p_{cij})^{\alpha} \log (1-p_{cij})  & o.w.\end{cases} $

其中N为一个image中object的数量， \alpha, \ \beta 为超参数（分别设置为2和4）控制各项对损失的贡献， p_{cij} 为预测heatmap上的预测值（预测位置 (i,j) 处是分类为 c 的corner的概率）。从上式可见，只对negative positive考虑降低惩罚。

**坐标精度修复**

由于下采样，ConvNet的输出分辨率较输入image的小，假设下采样率为 n，image上location (x,y) 映射到heatmap上位置为 (\lfloor \frac x n \rfloor, \ \lfloor \frac y n \rfloor) ，当在heatmap上预测出一个corner后，映射回image时坐标精度有所损失，在小目标的情况下，这将会显著影响IOU。为此作者增加一个坐标偏差的预测，gt 的坐标偏差为

$$\mathbf o_k=(\frac {x_k} n - \lfloor \frac {x_k} n \rfloor, \ \frac {y_k} n - \lfloor \frac {y_k} n \rfloor ) $$

其中 (x_k, y_k) 为第 k 个gt corner 在image上坐标。记预测坐标偏差为 \hat {\mathbf o}_k ，训练使用smooth L1 损失，

$L_{off}=\frac 1 N \sum_{k=1}^N \sum_{i \in \{x,y\}}\text{SmoothL1Loss}(\mathbf o_k^i -\hat {\mathbf o}_k^i) \\ \text{SmoothL1Loss}(x)=\begin{cases} 0.5x^2 & |x| $

测试阶段，则根据预测的坐标偏差修改坐标，设heatmap上位置 (x,y) 预测为corner，预测的offset为 \hat {\mathbf o}=(\Delta x, \Delta y) ，那么在原image上corner的坐标为

x_0=\lfloor (x+\Delta x)n \rfloor , \ y_0=\lfloor(y+\Delta y)n \rfloor 

**Grouping Corners**

两组heatmaps中将会分别预测出很多左上角corners和右下角corners，如何确定某个左上角corner和右下角corner（组成一对corners）是否来自同一目标？作者使用embedding方法，为每个corner生成embedding vector，如果一对corners来自于同一目标，那么对应的两个embedding vector应该很接近，一个衡量接近的指标是vector的差的L1范数足够小。

训练阶段，ConvNet分别生成top-left embedding feature和bottom-right embedding feature，如图4最右端，embedding feature map 应该是 h\times w \times l ，其中 h, w 是输出size，与heatmap 的size相同， l 是embedding vector的长度，作者实验中为了简便选择 l=1 ，即embedding是标量。这个embedding没有target value，作者引入`pull`损失和`push`损失来学习embedding的预测，令 e_{tk} 是第k个目标的左上corner的embedding， e_{bk} 是第k个目标的右下corner的embedding，那么两种损失分别为，

$$L_{pull}=\frac 1 N \sum_{k=1}^N [(e_{tk}-e_k)^2+(e_{bk}-e_k)^2] \\ L_{push}=\frac 1 {N(N-1)} \sum_{k=1}^N \sum_{j=1 \\ k\ne k}^N \max(0, \Delta - |e_k-e_j|) \\ e_k=\frac {e_{tk}+e_{bk}} 2 $$

其中 N 是单个image中目标数量， \Delta=1 。

从两个损失的命名可见， L_{pull} 是为了将同一目标的 e_{tk}, \ e_{bk} 两个embedding拉的更近，同一目标的两个embedding越接近，`pull`损失越小。使用这个损失学习，更偏向于将同一目标的两个embedding生成的更接近。 L_{push} 则使不同目标的均值embedding尽可能互相“推开”/分离，因为一个目标本身就有左上corner和右下corner的两个embedding，所以`push`中取 e_{tk} 和 e_{bk} 的均值 e_k ，互相推开的程度由 \Delta 来量化，当两个不同目标的均值embedding的差的L1范数超过 \Delta 时，我们认为可以足够区分corner是来自不同的目标，此时`push`损失为0是很合理的（可以等价于理解坐标偏差回归的损失函数中，不包含负例的情况，参考Fast RCNN论文中的(1)式，这个等价类比纯属个人理解，不明白的可以忽略），而不超过 \Delta 时，会导致判断（corner归并同一目标）错误，需要对这样的embedding作惩罚，这就构成了`push`损失。 

总之，embedding本身没有target value（事实上也很难去给出一个绝对的值），embedding是人为设计出来的一套自洽系统或者说一个空间，只要corner的embedding遵循一定的规则，就可以，所以使用`pull`和`push`损失学习，可以看成是为了让生成的embedding遵守规则，这样在Test阶段，就可以基于这些规则然后根据embedding值对corner进行同目标归并。

综合上面三个计算式可以得到，

$$L_{pull}=\frac 1 N \sum_{k=1}^N  \frac {(e_{tk}-e_{bk})^2} 2 \\ L_{push}=\frac 1 {N(N-1)} \sum_{k=1}^N \sum_{j=1 \\ j \ne k}^N \max [0, \Delta -\frac {|(e_{tk}-e_{tj}) + (e_{bk}-e_{bj})|} 2] $$

这样看起来好像更加直观的理解了。

测试阶段，假设分别从两组heatmap上得到K个top-left corners和K个bottom-right corners，那么共有 K^2 pairs（一个top-left与一个bottom-right corner组成一个pair），对每个pair计算 |e_{tk}-e_{bj}| ，如果超过一个阈值（0.5），则这个pair将被忽略，即不能得到object box。实际上从源码中可以看出对 K^2 个pair，还有其他一些筛选条件，比如得分（来自于heatmap），坐标值范围检测，pair中top-left与bottom-right两个corner的分类是否一致等。筛选之后还要（对每个分类分别）使用soft nms等方法，才得到最终的检测结果。具体请阅读源码。

**Corner Pooling**

Corner Pooling前面已经讨论了，如图3，这里讲下具体的做法，以top-left为例，假设位置 (i,j) 是一个top-left corner，记corner pooling层的输入feature maps分别为 f_t, \ f_l ，feature map的size均为 H \times W ，记 (i,j) 处的feature vector分别为 f_{t_{ij}}, \ f_{l_{ij}} ，首先max-pool位于 (i,j) 到 (i,H) 之间所有location的feature vector，得到 (i,j) 处的响应向量 t_{ij} ，vector长度为分类数量，表示每个分类独立进行，然后max-pool位于 (i,j) 到 (W,j) 之间所有location的feature vector，得到 (i,j) 处的响应向量 l_{ij} ，这就是向右看和向下看，找出最大值，作为当前位置的响应，（对于bottom-right则是类似的，但是方向反过来）

$t_{ij}=\begin{cases} \max (f_{t_{ij}}, t_{(i+1)j})  & i  $

观察上两式，发现这其实是一个递归的计算式，可以反过来计算提高效率，计算过程如图6，

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_61dd165c6d81.jpg)

Corner Pooling模块（包含了前后的conv+bn+relu等层）如图7所示，

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_e68b8d958d9c.jpg)

这个结构就不细说了，直接看论文说明和源码。

**Hourglass Network**

CornerNet的backbone使用Hourglass网络，这个网络在人体姿态估计任务中首次被引入。Hourglass网络是全卷积网络，包含一个或多个hourglass模块。

输入image 的size为 511 \times 511 \times 3 ，经过一个`pre`的模块，其中包含一个 conv（ 7 \times 7 -c128-s2-p3 ），以及一个residual（其中conv层的kernel为 3 \times 3 -c256-s2-p1 ）， 所以此时feature size为 128 \times 128 \times 256 ，这个feature 作为hourglass网络的输入。

在hourglass模块中首先使用一些conv层和max pooling层对输入特征进行下采样，然后再上采样使feature 分辨率回到原来大小，由于max-pooling层会丢失细节，所以增加skip层将low level信息带到upsampled feature，于是hourglass模块结合了local 特征和 global 特征生成新的特征，当堆叠（stack）多个hourglass模块时，就可以重复这个过程，从而捕获更加higher-level的信息。

作者使用了两个hourglass模块级联，并做了一些修改，包括：1. 下采样使用stride=2的conv代替max-pooling。2. 在hourglass内部，feature分辨率和channel的变化（见下面的具体讨论部分）。

hourglass结构如下图

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_42c9b9431636.jpg)

显然这个结构是嵌套的（总共5层嵌套，第5层嵌套没有`up1`），可以使用递归构造，从上图中可见，`low1`具有下采样率2，而`low3+up2`则具有上采样率2（最近邻插值），所以结构对称，并且经过`low1` ，channel可能会增大，而经过`low3+up2`，channel可能会减小，大概就是这么个过程，如下代码片段（经过简化处理，参考源码）

`dims=[256,256,384,384,384,512]
for i in range(5):
  curr_dim, next_dim =dims[i],dims[i+1]
  low1 = make_hg_layer(3, curr_dim, next_dim, ...)
  low3 = make_hg_layer(3, next_dim, curr_dim, ...)`

上图中每个 box都包含若干个residual module，5个嵌套层的box所包含的residual module的数量都是2，除了一个特别情况，就是第5嵌套层（最内层）的中间的部分`low2` box包含4个residual module。 hourglass网络的其他细节设计就不一一说了，直接阅读论文。

前面讲到 input feature的spatial size为 128 \times 128 ，由于经过hourglass，feature 分辨率保持不变，所以经过backbone后的feature size依然为 128 \times 128 。

**Experiments**

为了避免过拟合，采样了随机水平翻转、在image上随机crop（保证crop中心位于 image中心的一定范围内）以及颜色抖动（调整对比度，亮度和饱和度）。

训练损失为

$L=L_{det}+\alpha L_{pull} + \beta L_{push}+\gamma L_{off} $

超参数分别选择 \alpha = \beta =1, \ \gamma = 1 。

测试阶段：

- 如何判断location是corner？首先进行nms，对得到的两组heatmaps（回顾一下，heatmap是location属于某个分类的corner的概率/得分）应用`3x3`大小 stride=1，pad=1的max-pooling，不改变feature 大小，保留值保持不变，值改变了的则全部置为0；然后选择top N，这个操作是在所有分类下（分类不独立）进行，记住，选择top N的时候同时保持这些corners的对应分类。
- 左上corners和右下corners的配对？参考前文Grouping Corners部分的分析，更加具体的操作移步源码。
- 再次选择top K的corner pairs，并进行坐标精度调整，就得到bbox。
后记：

本文由于时间仓促，难免会出现纰漏或者理解不对的地方，请小心食用。
