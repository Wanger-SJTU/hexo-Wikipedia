---
title: 【论文分享】Taskonomy
date: "2019-11-21 00:00:00"
updated: "2019-11-21 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/【论文分享】Taskonomy/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/93036772
---


大家好，本周的论文分享专栏带来的是CVPR2018年的best paper:《Taskonomy：Disentangling Task Transfer Learning》。

```text
	论文链接：[http://taskonomy.stanford.edu/taskonomy_CVPR2018.pdf](https://link.zhihu.com/?target=http%3A//taskonomy.stanford.edu/taskonomy_CVPR2018.pdf)

	Demo网站：[http://taskonomy.stanford.edu/](https://link.zhihu.com/?target=http%3A//taskonomy.stanford.edu/)

	文章二作的解读：[https://zhuanlan.zhihu.com/p/38425434](https://zhuanlan.zhihu.com/p/38425434)
```


	文章标题中写到的Taskonomy，实际上是Task+taxonomy，论文探究的是视觉领域任务之间的分类问题，即任务之间的关系。

	当下，视觉任务主要还是独立训练，各自完成的。但从直观上来看，视觉任务之间应当是有所联系的，比如知道图片中面法向量的方向与判断图片的景深有关系，物体的轮廓抽取会对语义理解有所帮助。因此，本文的意图是探究视觉任务之间的关系，并利用这种关系识别任务之间的冗余，用更低的成本训练新的任务。实验最后表明，用已知的任务关系去训练新的视觉任务模型，可以比从头训练减少约2/3的训练数据。

<strong>一、问题定义：</strong>
目标任务组：T={t1，t2，t3……}

源任务组：S={s1,，s2，s3}

任务字典：V=T∪S

监督预算：γ

      目标是在有限的监督预算下，最大化目标任务组的模型表现。

       其中，目标任务组是最终需要完成的任务，源任务组指的是可以从头训练的任务组，目标任务可以从已经训练得到的源任务中得到帮助，任务字典包含所有涉及任务。监督预算与成本、算力、时间有关，也可以简单处理为 从头训练的任务数-自训练的任务数。

<strong>二、数据字典</strong>
      关于上一部分提到的任务字典，在本文的设计中，涵盖了26个视觉领域的常见任务，包括但不限于：2D边缘检测、平面法线、拼图、自动上色、房间布局构建、物体分类、场景预测。

       值得注意的是，这26个任务的选取是经过了特别的设计的。任务大体分出了三个层次，从一个卷积核图层就能完成的边缘检测这一类低级的图像特征到探索图像的空间构造这一类高级的图像的特征，再到物体检测、场景判断这一类语义层次更加抽象的图像特征。

       再者，这26个任务并不是对视觉任务空间的一个详尽的取样，而是从一些可想象的任务中对这个未知的视觉任务空间进行的稀疏采样，以便从这些任务推广应用到其他任务。

![](https://picx.zhimg.com/v2-180e7948b10fd27a129336ce91fe5553_r.jpg)任务字典提到的部分任务

<strong>三、数据集</strong>
       为了消除由于数据集不同造成的任务关系的偏差，作者为这26个任务建立了一个新的数据集。这个数据集包括4.6M室内图片，每一张图片有这26个任务的所有标签。完整的数据集有11.16TB。

作者公开了一个小sample：[https://github.com/alexsax/taskonomy-sample-model-1](https://link.zhihu.com/?target=https%3A//github.com/alexsax/taskonomy-sample-model-1)

        准备每一张图片的labels势必是一个很大的工程。在本文中，对于非语义类标签，作者采用程序自动计算标签；对于语义类标签，作者采用知识提炼，用已有的模型产生相关语义标签。例如：使用resnet-151（Image-Net 中100 类） 产生 sementic objects任务的标签。最后经过人工检测，发现得到的语义标签错误率不超过7%。这被认为足够用来训练对应任务并构建任务空间（毕竟本文针对的是任务之间的关系，而不是某一个任务做到最拔尖）。

<strong>四、实验设计</strong>

![](https://pic2.zhimg.com/v2-2a0558483e18654fd36c337d419a6351_r.jpg)

       这一部分的四个步骤主要是为了解决最初定义的问题：在有限的监督预算下，最大化目标任务组的模型表现。具体每一步如下：

<strong>1、Task-Specific Modeling</strong>

       首先为每一个任务字典里的任务独立从头监督训练一个模型。为了保证各个模型之间结构的一致性，一律采用encoder-decoder架构。更加具体的描述在补充材料（[http://taskonomy.stanford.edu/taskonomy_supp_CVPR2018.pdf](https://link.zhihu.com/?target=http%3A//taskonomy.stanford.edu/taskonomy_supp_CVPR2018.pdf)）里。

       encoder部分采用ResNet-50，去掉了average pooling层。decoder部分根据不同的视觉目标任务不同。对于pixel-to-pixel的任务（比如auto-encoder），采用15层全卷积结构；对于输出低维度的视觉任务（比如 vanishing point）,采用2-3层全连接。所有模型的基本结构如下图所示：

![](https://pic3.zhimg.com/v2-9c73d6415ed61fe812f6ff077878a788_r.jpg)

        训练好的模型效果如下视频所示：

[
![](https://pic2.zhimg.com/v2-b45bd96304232f8c7be8b029e54ef295.jpg)https://www.zhihu.com/video/1180942161624846336](https://link.zhihu.com/?target=https%3A//www.zhihu.com/video/1180942161624846336)

<strong>2、Transfer Modeling</strong>

       得到每个任务的训练模型后，相当于在任务空间得到一堆孤点，接下来要做的是衡量这些孤点之间的距离。

       作者采用transfer learning，对于每一个目标任务T，用源任务S的encoder结果重新训练目标任务的transfer function + decoder部分，得到的loss可以用来代表s->t的可接近性。

![](https://pic3.zhimg.com/v2-dd85addeebd7046c537618715fd74156_r.jpg)

       可见，如果要任务t从s训练的结果比较好，即Ds->t值比较小。要满足的条件包括：

- s的encode得到的图像信息足够去训练t；
- s训练得到的图像特征更容易转移到t任务。
![](https://picx.zhimg.com/v2-445405be1be4834cf48b2fc25c3e6ad1_r.jpg)如上图显示，作者用从头训练模型所需数据量的1/60去做不同的transfer，可以看到Reshade任务迁移到Surface Normal 和2.5D Segmentation 的效果是最好的。

<strong>注：Higher order Transformation</strong>

 既然可以用一个任务迁到另一个任务，自然而然就会想到，能不能拼接多个任务的特征表示来迁移到新的任务，不同任务之间的特征会不会起到相互补充的效果呢？答案是肯定的，具体例子如下图所示：

![](https://pic3.zhimg.com/v2-a17a6e7fe1d933a741a97b89797083a2_r.jpg)左图：使用Occlusion Edges 和Curvature 提取出来的图像特征拼接后训练Normals 任务得到的效果比只用单个的要好，可以看到在最终结果中楼梯的边缘和曲线特征显示出来了

       多个任务的拼接特征，效果可能比单个任务要好，但是这么做有一个很大的问题：对一个目标任务来说，源任务组的组合非常多（25+C(25,2)+C(25,3)……），这从实验的角度来看未免太不现实，因此，作者给出了一定的限制条件：

	对k<5的，选5个表现最好的单源任务所有k个排列。

        对k>=5的，选 k个表现最好的作为源任务集。

        k:源任务组的任务个数。

<strong>3、Ordinal Normalization</strong>

       基于前两步，已经可以得到每一个任务迁移到另一个任务的loss值，但只用loss代表任务之间的可迁移度是不恰当的，因为不同的任务有不同的loss空间。如果用原始loss，任务之间的可迁移矩阵将如下图（左）所示：

![](https://pic2.zhimg.com/v2-8ba6f120102344621ec716d0f590a597_r.jpg)横坐标源任务，纵坐标目标任务，左图红色越深，迁移loss越大，右图归一化完成后，红色越浅，迁移越容易

       而这一步要做的，就是对得到的loss矩阵组进行归一化，最终得到上图（右）。图只画了源任务组阶数为1的情况。

       归一化的具体方法采用了AHP（层次分析法），具体做法如下：

1）、对每一个目标任务t构建一个矩阵Wt。W(i,j)表示测试集中，有W(i,j）张是i->t的模型表现更好，同理，W(j,i)  表示测试集中，有 W(j,i) 张是j->t的模型表现更好。W(i,j) 同时可以理解为，i->t 比 j->t 迁移效果更好的概率大小。

2）、Laplace smoothing。这一步的主要目的是去除概率为0和1的数据，起到数据间平滑的作用（由于AHP的应用，下文有个除法）。

3)、Wt'=Wt/WTt，此时 Wt'(i,j) 可以理解为 i->t 的效果是 j->t 的 W'(i,j) 倍。

4）、取 Wt' 最大特征值对应的特征向量，就可以得到针对t各个源任务提供信息的能力相对大小。

![](https://pic4.zhimg.com/v2-9ec6334894ee36c54f14e5178afbdb2b_r.jpg)上述AHP四步的举例。假设只有5个源任务，最后得到5个源任务提供给t信息的能力大小分别为0.9928，0.1081，0.0545,0.0268,0.0058。

5）、归一化上一步得到的1*|S|矩阵，让矩阵内部数字和大小等于1。

6）、为了绘图时更好的表现任务之间的距离，采用dist=e-β*P把提供信息能力转换成距离。

![](https://pica.zhimg.com/v2-9568ed6d45bb003a1b43d02c0cf56cfe_r.jpg)	最后，加上transfer order>1 的源任务组，归一化后的距离矩阵如下图所示：

![](https://picx.zhimg.com/v2-80b1b92ceb29fb5c5518221447ea47b9_r.jpg)

<strong>4、Computing the Global Taxonomy</strong>

      原定义的问题是在监督预算的限制下，最大化目标任务组的表现。步骤4主要是利用步骤3得到的矩阵，来得到最终的训练策略，使用的方法是01整数规划。

      可以想象通过上面步骤得到了一个巨大的图，其中每一条带权有向边i->j的权重是任务i迁到任务j，任务j的表现好坏。这一步就是选取某些边，得到一个符合要求的最大子图（从下图1得到下图2）。

![](https://pic1.zhimg.com/v2-fe842bb67e0d80e77960aba7547c970e_r.jpg)图1
![](https://pica.zhimg.com/v2-e64a8d4594057baf9acd53bb8ad97b64_1440w.jpg)图2具体式子如下：

![](https://pic1.zhimg.com/v2-3741240cc79e3046a237aec25b09d4dc_1440w.jpg)
![](https://pic4.zhimg.com/v2-a4a751159b2e2f70a92a7740132ce4b7_1440w.jpg)其中：

- Ei：（{si1, ……，simi}，ti），源任务组到目标任务ti的一条边。
- T：目标任务组（最后需要得到结果的所有任务）。
- S : 源任务组（所有可以从头训练的任务）。
- r j : 每一个目标任务的重要程度（使用者自己定义）。
- l i : Ei带来的训练代价，用来控制监督预算。
- pi : Ei这条边对应的target 的表现，由第三步的矩阵给出。
- ci：pi * r j ，Ei这条边对应的目标任务的最终表现。
- A : 限制矩阵。

下面解释一下A这个限制矩阵。

A需要代表的限制有:

- 每一个迁移对应的源节点/任务都在子图中；
- 每一个目标任务有且只有一个迁移；
- 监督预算不会超支。用算式来表示就是

![](https://pica.zhimg.com/v2-852b1958576a93d267d1f38e89f77f26_r.jpg)式子和论文有出入，采用本文二作给出的修改后的版本，然而还是有那么一丢小问题

A的形状为（|E|+2|V|+1，|E|+|S|）；

X的形状为（|E|+|S|，1）；

b的形状为（|E|+|V|+1，1）。

下面具体解析每一个限制条件：

- 每一个迁移对应的源节点/任务都在子图中。
![](https://pic1.zhimg.com/v2-e6fd9ee22cc82bdaaac330dc204181e6_r.jpg)
![](https://pic1.zhimg.com/v2-600e48b7f61f55a3f29509c5c7f779f4_r.jpg)      A的前E排为限制Ⅰ设计。A(i,i)表示Ei对应的源任务的大小（i<|E|），A(i,|E|+j)=-1则表示sj在Ei的源任务集合中。

      X(i,1)表示Ei在最后的子图里（i<|E|），X(|E|+j,1)表示源节点j被包括在最后的子图里。

2.每一个目标任务有且只有一个迁移。

![](https://picx.zhimg.com/v2-795cc3ac15ec3658a0aff4ff962e2241_r.jpg)
![](https://pica.zhimg.com/v2-fdfaded7df914b1ad481c8c81562d57a_r.jpg)

       A的第E+1到|E|+2|V|排为限制Ⅱ设计。A(|E|+j，i）= 1 表示Ei这条边的目标任务是tj。A(|E|+|V|+j，i）= -1，同理，表示Ei这条边的目标任务是tj。其实这一部分两个式子合并起来就是Ax=b。

3.监督预算不会超支

![](https://picx.zhimg.com/v2-2220ae87320f89275bbb8e2a35cb5979_r.jpg)
![](https://pica.zhimg.com/v2-6c4a6427fdb3cc7b54a7071975998a7c_r.jpg)

      最终BIP解出x得到优化子图。

![](https://picx.zhimg.com/v2-259246f2b2734303ff1caa81322db761_r.jpg)

       值得关注的是，在监督预算26，即每一个模型都可以通过全监督训练得到的情况下，依然有边的存在，即依然有任务是通过迁移学习模型表现更好。

<strong>五、实验结果</strong>
      实验部分，论文写到一共训练26个全监督网络，约3000个迁移网络，用了约50000个GPU工时。这里列两个实验结果。

数据集的使用：120k全监督训练；

                        16k 迁移学习训练使用；

                        17k test使用。

<strong>1.迁移所得的模型性能评估</strong>

![](https://pic1.zhimg.com/v2-fb4bf50c02a158d6465975f6ba439342_r.jpg)

       这张图通过与全监督训练得到的模型，非迁移训练得到的模型进行对比，评估最佳迁移策略得到的任务模型的表现。

win rate：同样的测试集在两个模型上测试，其中一个模型比另一个模型结果好的测试集数据比例。

Gain：与用同样的训练数据集从头训练相比，迁移训练的得到模型的win rate。可以理解为从模型从迁移学习中获得的收益。

Quality：与用120k数据集从头全监督训练一个模型相比，迁移训练得到模型的win rate。

      从上图中看到，迁移学习得到的收益普遍很大。在监督预算8-15，总体效果与最佳模型相差也不是很远，但从成本来看，可以节约1/2到2/3的训练数据。

<strong>2.新任务的应用</strong>

      对其他科研工作来说，最关注的应该是这个工作可以给他们带来什么帮助，比如作者构建的视觉任务空间能不能应用到新的视觉任务。

       答案是可以，如果你此时要完成一个新的视觉任务，而手头只有少量的训练数据（不足以从头训练这个新任务），那么要如何利用本文的工作成果呢？

       首先构建你自己的任务字典，源任务组是本文已经完成了的26个视觉任务，目标任务组只有你要完成的新任务，然后用少量的数据集重复实验设计的2-4步，找到最佳训练策略并训练你的新任务。这个方法麻烦的地方就在于需要训练并评测很多个迁移模型才能找到最佳的迁移策略，但的确可以完成用小数据集做新的任务。

      下图是这种方法得到的新任务模型的评测：

![](https://pic3.zhimg.com/v2-9c4f4646019d5708a43d47f61f57a516_r.jpg)       上左图含义和上一个实验相同，上右图与其它经典的特征抽取模型进行对比，结果相差很大，最佳迁移策略训练得到的模型比通用的特征抽取要好很多。说明针对任务选择迁移策略的选择是必要的（这里提出疑问：结果差距这么大似乎没有排除预训练使用数据集不同的影响）。

<strong>六、总结</strong>
       这篇任务提出一个新的研究方向，构建任务空间并做了初步探索。其发现问题，思考问题的方法很值得学习。而且如文章结尾所说，这个任务空间能否不局限于视觉，如果可以持续深入下去，也许有更多值得挖掘的地方。