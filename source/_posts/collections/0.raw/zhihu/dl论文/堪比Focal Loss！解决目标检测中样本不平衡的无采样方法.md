---
title: 堪比Focal Loss！解决目标检测中样本不平衡的无采样方法
date: "2019-11-25 00:00:00"
updated: "2019-11-25 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/堪比Focal-Loss-解决目标检测中样本不平衡的无采样方法/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/93658728
---


<strong>码字不易，欢迎给个赞！</strong>

<strong>欢迎交流与转载，文章会同步发布在公众号：机器学习算法工程师(Jeemy110)</strong>

训练目标检测模型的一个难点是样本不均衡，特别是正负样本比例严重失衡。目前解决这类问题主要是两种方案（见综述<strong>[Imbalance Problems in Object Detection: A Review](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1909.00169)</strong>）：一是hard sampling方法，从所有样本中选择一定量的正样本和负样本，只有被选择的样本才计算loss，一般会倾向选择一些难负例样本，比如<strong>[OHEM](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1604.03540)</strong>；另外一类方法是soft sampling方法，选择所有样本计算loss，但是不同的样本赋给不同的权重值，比如<strong>[focal loss](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1708.02002)</strong>。这些基于采样的策略虽然有效，但是需要超参数调节。这里，我们介绍的论文是<strong>[Is Sampling Heuristics Necessary in Training Deep Object Detectors?](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1909.04868.pdf)</strong>，论文提出了一种无采样方案，此方案与前面两种方法的对比如下： 

![](https://pic4.zhimg.com/v2-55b22e443c60da70993b537f2544bbdf_r.jpg) 图1 三类方法对比无采样方法使用所有的样本进行训练，下面我们具体来看它如何训练出比较好的检测效果，它的策略非常简单。

<strong>从RetinaNet和Focal loss说起</strong>
RetinaNet是目前比较好的one-stage目标检测算法，它采用focal loss来解决正负样本不均衡问题。这里我们探讨focal loss对RetinaNet的影响。我们将采用focal loss的算法称为RetinaNet-FL，而简单采用标准交叉熵的算法称为RetinaNet-None。两种loss的计算如下所示： 

![](https://picx.zhimg.com/v2-424425b0896cb0e3a8fbe412204e9597_r.jpg)

其中
![](https://www.zhihu.com/equation?tex=L%5E%7BFL%7D)表示focal loss，而
![](https://www.zhihu.com/equation?tex=L%5E%7BCE%7D)表示普通交叉熵。
![](https://www.zhihu.com/equation?tex=p_%7Bij%7D)表示的是对第
![](https://www.zhihu.com/equation?tex=i)个anchor（一个anchor对应一个训练实例）的第
![](https://www.zhihu.com/equation?tex=j)的类的预测概率。正负样本的loss就是负对数loss：

![](https://www.zhihu.com/equation?tex=L%5E%7BFG%7D_%7Bij%7D%3D-%5Clog%28%7Bp_%7Bij%7D%7D%29%2C++L%5E%7BBG%7D_%7Bij%7D%3D-%5Clog%281-%7Bp_%7Bij%7D%7D%29+%5C%5C)

对于focal loss其实就是在交叉熵基础上为不同样本分配权重。对于RetinaNet-FL，比较容易训练并取得很好的效果。那么，对于RetinaNet-None，如果只是按同样的设置训练，会发现分类的梯度很快爆炸，如图2a所示，当我们尝试减少分类loss的权重直到除以5000才可以解决梯度爆炸，但是最终的效果很差，AP值仅为6.9。我们来分析这个问题，首先由于负样本太多，模型训练刚开始负样本的loss会很大，而且不稳定，所以很容易出现梯度爆炸。然后我们可以通过降低分类权重避免梯度爆炸，但是从loss曲线上看，分类loss会从一个较大的值迅速降为一个极小值，后面就在此附近来回震荡，这说明模型的分类loss很快被负样本所主导，模型倾向于预测负样本，所以最终模型效果依然很差。这是一个进退难题。

![](https://picx.zhimg.com/v2-b36cd250c77850f76291ad1d3307ba3d_r.jpg) 图2 分类损失的迭代曲线其实梯度容易爆炸的一个原因在于模型初始化策略，一般情况下我们会倾向让初始化的模型对于各类的预测是相同概率的，但是对于我们这个正负样本极度不平衡问题，这其实是非常不利的，因为负样本的loss会很大。所以RetinaNet论文中建议在对分类分支初始化时，对负样本设置一个先验概率值
![](https://www.zhihu.com/equation?tex=%5Cpi)，具体实施是改变分类分支的bias初始化值，对bias设置如下：

![](https://www.zhihu.com/equation?tex=b+%3D+-%5Clog%7B%5Cfrac%7B1+-+%5Cpi%7D%7B%5Cpi%7D%7D+%5C%5C)

RetinaNet中采用的
![](https://www.zhihu.com/equation?tex=%5Cpi)为0.01，那么初始化后的分类分支sigmod处理后的预测概率倾向于0.01，而不是0.5，这会大大减少负样本的初始loss。如图2b所示，但是依然还是出现了梯度爆炸，将分类loss除以500后可以避免，最终的AP值为17.9，从曲线上loss还是有一个突变，说明模型还是陷入负样本中。进一步地调整
![](https://www.zhihu.com/equation?tex=%5Cpi)，当设置为1e-5时，并且分类loss除以10，发现模型可以较好地收敛，最终的AP为35.6，基本达到RetinaNet-FL的效果（AP为36.4）。再进一步地降低
![](https://www.zhihu.com/equation?tex=%5Cpi)为1e-10，发现模型效果反而有稍微下降，AP值为33.8。另外，作者发现RetinaNet-None预测的概率平均值是远远低于RetinaNet-FL，为了提升召回，可以设置较低的阈值，若将阈值从0.05降低至0.005，AP值从35.6提升到36.2，而这对RetinaNet-FL无影响。

这说明只要适当调整模型的初始化以及loss，采用普通交叉熵是可以达到与focal loss类似的效果的。这是此论文最重要的发现，据此给出了无采样的训练机制，主要包括三点，让我们一一道来。

<strong>最优bias初始化</strong>
前面已经说到，分类分支的初始化对模型训练很关键，这里我们理论分析最优的
![](https://www.zhihu.com/equation?tex=%5Cpi)如何确定。假定数据集中共有
![](https://www.zhihu.com/equation?tex=C)个类别，样本量为
![](https://www.zhihu.com/equation?tex=N)，其中正例为
![](https://www.zhihu.com/equation?tex=N_f)。模型刚开始对所有样本的预测概率值是
![](https://www.zhihu.com/equation?tex=%5Cpi)接近的，那么分类loss就可以大致估算出来： 

![](https://pica.zhimg.com/v2-21a6a7c1bc32a5c476b7b55099b09ad2_r.jpg)

在论文的实验中，
![](https://www.zhihu.com/equation?tex=C)为80，而
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BN%7D%7BN_f%7D)大约为1000。给定一系列
![](https://www.zhihu.com/equation?tex=%5Cpi)值，我们可以计算出正负例的分类loss，如下表所示： 

![](https://pic3.zhimg.com/v2-c926b903c77d4838a61ef912ad8d9cca_r.jpg)在前面的分析中，我们发现
![](https://www.zhihu.com/equation?tex=%5Cpi)取1e-5时，模型效果最好。从表中我们可以看到，此时的整体loss是最小，这大大降低了训练初期的梯度爆炸的风险，而且负样本的loss也较小，模型训练过程中更容易学习到正样本。而当
![](https://www.zhihu.com/equation?tex=%5Cpi)为0.5或者0.01时，负样本的loss很大，模型很容易陷入负样本的陷阱中。若
![](https://www.zhihu.com/equation?tex=%5Cpi)取1e-10，虽然负样本loss更低，但是正样本loss增加了，这反而不利于模型的稳定训练。

基于上面的分析，最优的设置应该是要使整体loss最低，我们可以求导数来确定
![](https://www.zhihu.com/equation?tex=%5Cpi)： 

![](https://pic1.zhimg.com/v2-d448bfebfbdaee34dde58892037dec5a_r.jpg)

很容易计算出最优
![](https://www.zhihu.com/equation?tex=%5Cpi)为
![](https://www.zhihu.com/equation?tex=%5Cfrac%7BN_f%7D%7BN%7D+%5Ccdot+%5Cfrac%7B1%7D%7BC%7D)，此时
![](https://www.zhihu.com/equation?tex=L%5E%7BCE%7D)最低。这里我们认为模型训练之初，
![](https://www.zhihu.com/equation?tex=%5Csigma%28wx%2Bb%29%5Capprox%5Csigma%28b%29%3D%5Cpi)。那么可以计算出bias的最优初始化值为：

![](https://www.zhihu.com/equation?tex=b+%3D+-%5Clog%28%7B%5Cfrac%7BN%7D%7BN_f%7D%5Ccdot+C+-+1%7D%29+%5C%5C)

按照上面参数计算，最优的
![](https://www.zhihu.com/equation?tex=%5Cpi)为1.113e-5，和我们的实验值是吻合的。

<strong>Guided Loss</strong>
前面实验的另外一个结论是要降低分类loss，但是降低比例很难确定。但是对于回归loss，其只计算正样本，不会受到正负样本不平衡的影响，所以我们可以通过回归loss来确定分类loss的调整比例：

![](https://www.zhihu.com/equation?tex=r%3D%5Cfrac%7Bw%5E%7Breg%7DL%5E%7Breg%7D%7D%7BL%5E%7Bcls%7D%7D+%5C%5C)

那么最终的loss计算为：

![](https://www.zhihu.com/equation?tex=L+%3D+w%5E%7Breg%7DL%5E%7Breg%7D+%2B+w%5E%7Bcls%7DL%5E%7Bcls%7D%5Ccdot+r+%5C%5C)

这里
![](https://www.zhihu.com/equation?tex=w%5E%7Breg%7D)和
![](https://www.zhihu.com/equation?tex=w%5E%7Bcls%7D)是回归和分类loss的权重系数，是检测模型所固有的参数。简单来说，我们用
![](https://www.zhihu.com/equation?tex=L%5E%7Breg%7D)来引导
![](https://www.zhihu.com/equation?tex=L%5E%7Bcls%7D)，以希望分类loss可以和回归loss维持相同的水平，这在论文中称为guided loss。值得注意的是，我们虽然在训练过程中实时确定r，但是这一过程是不经过BP的，所以这一机制没有带来任何负担，也不引入新的超参数。

<strong>类别自适应阈值</strong>
前面已经提到，RetinaNet-None会出现置信度偏移现象，我们可以采用较低的阈值来进一步提升模型效果，但是其实对每个类别，我们可以采用不同的过滤阈值。这里提出一种基于训练样本的类别自适应阈值（class-adaptive threshold）： 

![](https://pic3.zhimg.com/v2-3d0d630492e3b2bb0c53d9c4c6bc6080_1440w.jpg)

其中第一项是正样本在负样本所占的比例，而第二项是各个类别在所有类中的所占比例。

<strong>实验效果</strong>
首先，要说明的是上面所提出的3种机制对大部分目标检测算法都是适用的，包括基于anchor的one-satge和two-stage方法，以及无anchor的目标检测方法。论文中选取了YOLOv3，RetinaNet，FoveaBox（无anchor），Faster R-CNN以及Cascade R-CNN进行实验，来测试所提出的无采样方法的效果，如下表所示： 

![](https://pic1.zhimg.com/v2-50b1c157b81a1eb690a942ae2a553982_r.jpg)

从表中可以看到，采用无采样方法的模型相比baseline均有一定的提升，这说明这一机制不仅限于理论分析，在实际中确实可以取得较好的效果。

另外，作者也分别实验分析了三种策略，如下表所示： 

![](https://pica.zhimg.com/v2-38e6789d278101a71379632e24cb8330_r.jpg) 可以看到三种策略都是有一定的效果的，但是我觉得第3个策略是最无关紧要的，提升不大，只能算上一种辅助策略。

另外一点是，前两种策略应该是有一定的互补性质的，比如都是适当降低分类loss来避免梯度爆炸的问题。这里作者比较了第一策略的采用与否对第二策略guided loss的影响，结果如下图所示： 

![](https://pic3.zhimg.com/v2-3d9a29d134aa910feccb2cfda37321f8_r.jpg) 这里可以看到只要有了guided loss，第一策略对最终模型效果的影响是微乎其微的。这也很容易理解，最早的实验我们发现最重要的是要降低分类loss，两个策略可以起到同样的效果。不过从收敛曲线上可以看到，加入第一策略，收敛速度稍微更快一些，所以还是推荐加入第一策略。

<strong>小结</strong>
正负样本不平衡一直以来是目标检测中比较头疼的问题，这篇论文的主要贡献是分析了这个问题对训练的影响，并给出了可以解决该问题的无采样方法，思路还是非常清晰的，看起来也是行之有效。

<strong>参考</strong>

- [Is Sampling Heuristics Necessary in Training Deep Object Detectors?](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1909.04868.pdf)
- [Imbalance Problems in Object Detection: A Review](https://link.zhihu.com/?target=https%3A//arxiv.org/abs/1909.00169)
- [Focal Loss for Dense Object Detection](https://link.zhihu.com/?target=https%3A//arxiv.org/pdf/1708.02002.pdf)