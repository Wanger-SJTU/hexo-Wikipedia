---
title: GroupSoftmax：利用COCO和CCTSDB训练83类检测器
date: "2019-08-26 00:00:00"
updated: "2019-08-26 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/dl论文/GroupSoftmax-利用COCO和CCTSDB训练83类检测器/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/73162940
---


通常，CV算法工程师在利用YOLO，Faster RCNN，CenterNet等一系列detection算法对公司的业务数据一顿猛train，看到自己的模型用在了业务上，陶醉在CEO对自己的工作很满意、即将升职加薪的幻觉之中时，往往迎来的是CEO的灵魂拷问。考虑如下问题：

- <strong>CEO总是逼我，说客户关心某一个新的类别</strong>：对于一个n类检测数据集和一个m类检测数据集，想要得到一个n+m类检测模型。实际生产环境中，已经标注完成的数据集，因为业务需要增加k个新的检测类别。但不希望对已有数据重新标注，而是只标注接下来新的数据。
- <strong>CEO总是逼我，说客户希望把某一类别分成两种情况对待</strong>：上一个问题再进一步推广，因为业务需要，数据的标注标准发生改变，比如将过去某个类别拆分为多个新的类别。但不希望对已有数据重新标注，而是只标注接下来新的数据。
- <strong>CEO总是逼我，说标注成本太高，公司要倒闭</strong>：对于一个长尾分布的数据集，标注成本往往是巨大的，我们希望收集那些少数类别样本，但是在标注时遇到了多数类别样本，也要花很大的代价进行标注。是否有办法能够对于那些简单的样本类别，选择不进行标注，只标注有价值的少数类别目标。<strong>为了讨好CEO，我们设计了GroupSoftmax交叉熵损失函数，能够有效解决上述3个问题。如下图所示，GroupSoftmax交叉熵损失函数允许类别</strong>
![](https://www.zhihu.com/equation?tex=k)<strong>和 类别</strong>
![](https://www.zhihu.com/equation?tex=j)<strong>发生合并，形成一个新的组合类别</strong>
![](https://www.zhihu.com/equation?tex=g)<strong>，当训练样本</strong>
![](https://www.zhihu.com/equation?tex=y)<strong>的真实标签为组合类别</strong>
![](https://www.zhihu.com/equation?tex=g)<strong>时，也能够计算出类别</strong>
![](https://www.zhihu.com/equation?tex=k)<strong>和 类别</strong>
![](https://www.zhihu.com/equation?tex=j)<strong>的对应梯度，完成网络权重更新。</strong>理论上，GroupSoftmax交叉熵损失函数能够兼容任意数量、任意标注标准的多个数据集联合训练。

![](https://picx.zhimg.com/v2-63e03259ae1b2226f3dd03ad502dd855_r.jpg)softmax交叉熵损失函数和groupsoftmax交叉熵损失函数的梯度对比图，在groupsoftmax中，类别k和类别j能够进行组合，形成一个新的类别g，以此计算相应的梯度    我们利用了80类检测数据集COCO和3类检测数据集CCTSDB联合训练，基于Faster RCNN算法(SyncBN)，联合训练得到了一个83类检测器，在coco_minival2014测试集上，GroupSoftmax交叉熵损失函数和原始的Softmax交叉熵损失函数训练效果相比，mAP由原来的38.6上升到了39.3，也就是说我们利用了一个与COCO无关的CCTSDB数据集，将检测指标提高了0.7个点，还同时能够完成更多的类别检测任务，这算是比较理想的。此外，我们还训练了一个trident*模型，6个epoch在coco_minival2014测试集上的mAP为44.0，由此可见GroupSoftmax交叉熵损失函数是切实有效的。理论上而言，利用GroupSoftmax交叉熵损失函数，可以无限添加不同标注标准的数据集，进行联合训练。

![](https://pic1.zhimg.com/v2-0eacccfeeaeaee09270dfe8e672ed90c_r.jpg)GroupSoftmax和Softmax对比训练试验，在不降低甚至提高检测效果的同时，将检测类别数量由80增加到83
![](https://pic3.zhimg.com/v2-b50e15c1bc997f1e7ddff28ae4ea74f2_r.jpg) 利用训练好的Faster RCNN模型，在一张给定的图片上，即检测到了COCO数据集中的类别（车辆），也检测到了CCTSDB数据集中的类别（交通标志）    我们基于SimpleDet检测框架，实现了mxnet版本的GroupSoftmax交叉熵损失函数，源码地址为[groupsoftmax-simpledet](https://link.zhihu.com/?target=https%3A//github.com/chengzhengxin/groupsoftmax-simpledet)，欢迎试用。下面详述GroupSoftmax交叉熵损失函数的工作原理。

GroupSoftmax交叉熵损失函数的推导
        翻开任意一篇介绍softmax交叉熵损失函数的文章，都能看到，损失 
![](https://www.zhihu.com/equation?tex=L_%7Bi%7D) 对激活值 
![](https://www.zhihu.com/equation?tex=f_%7Bm%7D) 的梯度为：

![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%7B%5Cpartial+%7BL_i%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D+%3D+%5Cleft%5C%7B+%5Cbegin%7Barray%7D%7Bl%7D+%7BP_m%7D%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%2C%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3Bm+%5Cne+%7By_i%7D%5C%5C+%7BP_m%7D+-+1%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%2C%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3Bm+%3D+%7By_i%7D+%5Cend%7Barray%7D+%5Cright.)          (1)

        一般地，我们采用交叉熵损失函数处理分类问题，使用式(1)中得到的梯度，已经能够满足识别分类等算法任务的训练。但是在真实情况中，我们有时候无法确定类别 
![](https://www.zhihu.com/equation?tex=k) 给出对应的 
![](https://www.zhihu.com/equation?tex=P_%7Bk%7D) ，因为不同的数据集之间的分类标准不同，导致类别定义之间的差异性。比如在数据集A中，类别 
![](https://www.zhihu.com/equation?tex=C_%7B4%7D) 为<strong>自行车</strong>，类别 
![](https://www.zhihu.com/equation?tex=C_%7B7%7D) 为<strong>电动车</strong>，在数据集B中，类别 
![](https://www.zhihu.com/equation?tex=C_%7B9%7D) 为<strong>非机动车</strong>。也即数据集A中的 
![](https://www.zhihu.com/equation?tex=C_%7B4%7D) 和
![](https://www.zhihu.com/equation?tex=C_%7B7%7D)，在数据集B中合并成为了一个新的类别
![](https://www.zhihu.com/equation?tex=C_%7B9%7D)，此时Softmax交叉熵损失函数受限，无法支持正常训练。为此提出了<strong>GroupSoftMax交叉熵损失函数</strong>。

    GroupSoftmax交叉熵损失函数的定义为如下，为群组 
![](https://www.zhihu.com/equation?tex=g) 的组合概率的交叉熵：

![](https://www.zhihu.com/equation?tex=%7BL_i%7D+%3D++-+%5Csum%5Climits_g+%7B%7Bp_%7Bi%2Cg%7D%7D%7D+%5Clog+%7BP_g%7D)                                 (2)

    式(2)中， 
![](https://www.zhihu.com/equation?tex=g) 表示一个群组类别（多个类别的组合），其组合概率 
![](https://www.zhihu.com/equation?tex=P_%7Bg%7D) 可以表示为：

![](https://www.zhihu.com/equation?tex=%5C%5B%7BP_g%7D%7B%5Crm%7B+%3D+%7D%7D%5Csum%5Climits_%7Bk+%5Cin+g%7D+%7B%7BP_k%7D%7D++%3D+%5Cfrac%7B%7B%5Csum%5Climits_%7Bk+%5Cin+g%7D+%7B%7Be%5E%7B%7Bf_k%7D%7D%7D%7D+%7D%7D%7B%7B%5Csum%5Cnolimits_j+%7B%7Be%5E%7B%7Bf_j%7D%7D%7D%7D+%7D%7D%5C%5D)                                (3)

    如上文提到的，在数据集B中，类别 
![](https://www.zhihu.com/equation?tex=C_%7B9%7D) 为<strong>非机动车</strong>，该类别即为一个群组类别，其由数据集A中的两个类别组成，分别为数据集A中的 
![](https://www.zhihu.com/equation?tex=C_%7B4%7D) <strong>自行车</strong>和 
![](https://www.zhihu.com/equation?tex=C_%7B7%7D) <strong>电动车</strong>。考虑式(3)中的情况，当
![](https://www.zhihu.com/equation?tex=m%5Cin+g) 时，也即目标类别 
![](https://www.zhihu.com/equation?tex=m) 属于当前群组类别 
![](https://www.zhihu.com/equation?tex=g) 时，有:

![](https://www.zhihu.com/equation?tex=%5C%5B%5Cfrac%7B%7B%5Cpartial+%7BP_g%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D+%3D+%5Cfrac%7B%7B%7Be%5E%7B%7Bf_m%7D%7D%7D%5Csum%5Cnolimits_j+%7B%7Be%5E%7B%7Bf_j%7D%7D%7D%7D++-+%7Be%5E%7B%7Bf_m%7D%7D%7D%5Csum%5Climits_%7Bk+%5Cin+g%7D+%7B%7Be%5E%7B%7Bf_k%7D%7D%7D%7D+%7D%7D%7B%7B%7B%7B%5Cleft%28+%7B%5Csum%5Cnolimits_j+%7B%7Be%5E%7B%7Bf_j%7D%7D%7D%7D+%7D+%5Cright%29%7D%5E2%7D%7D%7D+%3D+%7BP_m%7D%5Cleft%28+%7B1+-+%7BP_g%7D%7D+%5Cright%29%5C%5D)      (4)

    同理，考虑式(3)中的情况，当 
![](https://www.zhihu.com/equation?tex=m%5Cnotin+g) 时，也即目标类别 
![](https://www.zhihu.com/equation?tex=m) 不属于当前群组类别 
![](https://www.zhihu.com/equation?tex=g) 时，有:

![](https://www.zhihu.com/equation?tex=%5C%3B%5Cfrac%7B%7B%5Cpartial+%7BP_g%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D+%3D++-+%5Cfrac%7B%7B%7Be%5E%7B%7Bf_m%7D%7D%7D%5Csum%5Climits_%7Bk+%5Cin+g%7D+%7B%7Be%5E%7B%7Bf_k%7D%7D%7D%7D+%7D%7D%7B%7B%7B%7B%5Cleft%28+%7B%5Csum%5Cnolimits_j+%7B%7Be%5E%7B%7Bf_j%7D%7D%7D%7D+%7D+%5Cright%29%7D%5E2%7D%7D%7D+%3D++-+%7BP_m%7D%7BP_g%7D)           (5)

<strong>由式(2)、式(4)、式(5)，可以得到GroupSoftMax交叉熵损失函数对激活值</strong>
![](https://www.zhihu.com/equation?tex=f_%7Bm%7D)<strong>的梯度为</strong>:

![](https://www.zhihu.com/equation?tex=%5Cbegin%7Barray%7D%7Bl%7D+%5Cfrac%7B%7B%5Cpartial+%7BL_i%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D+%3D++-+%5Csum%5Climits_g+%7B%7Bp_%7Bi%2Cg%7D%7D%5Cfrac%7B%7B%5Cpartial+%5Clog+%7BP_g%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D%7D+%5C%5C+%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B+%3D++-+%5Csum%5Climits_g+%7B%7Bp_%7Bi%2Cg%7D%7D%5Cfrac%7B1%7D%7B%7B%7BP_g%7D%7D%7D%5Cfrac%7B%7B%5Cpartial+%7BP_g%7D%7D%7D%7B%7B%5Cpartial+%7Bf_m%7D%7D%7D%7D+%5C%5C+%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B+%3D++-+%5Csum%5Climits_%7Bm+%5Cin+g%7D+%7B%7Bp_%7Bi%2Cg%7D%7D%5Cfrac%7B1%7D%7B%7B%7BP_g%7D%7D%7D%7BP_m%7D%7D+%5Cleft%28+%7B1+-+%7BP_g%7D%7D+%5Cright%29+%2B+%5Csum%5Climits_%7Bm+%5Cnotin+g%7D+%7B%7Bp_%7Bi%2Cg%7D%7D%5Cfrac%7B1%7D%7B%7B%7BP_g%7D%7D%7D%7D+%7BP_g%7D%7BP_m%7D%5C%5C+%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B+%3D+%5Csum%5Climits_%7Bm+%5Cnotin+g%7D+%7B%7Bp_%7Bi%2Cg%7D%7D%7BP_m%7D%7D++-+%5Csum%5Climits_%7Bm+%5Cin+g%7D+%7B%7Bp_%7Bi%2Cg%7D%7D%7D+%5Cfrac%7B%7B%5Cleft%28+%7B1+-+%7BP_g%7D%7D+%5Cright%29%7D%7D%7B%7B%7BP_g%7D%7D%7D%7BP_m%7D%5C%5C+%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B+%3D+%5Cleft%5C%7B+%5Cbegin%7Barray%7D%7Bl%7D+%7BP_m%7D%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%2C%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3Bm+%5Cnotin+%7By_i%7D%5C%5C+%5Cleft%28+%7B%7BP_g%7D+-+1%7D+%5Cright%29%5Cfrac%7B%7B%7BP_m%7D%7D%7D%7B%7B%7BP_g%7D%7D%7D%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%2C%5C%3B%5C%3B%5C%3B%5C%3B%5C%3B%5C%3Bm+%5Cin+%7By_i%7D+%5Cend%7Barray%7D+%5Cright.+%5Cend%7Barray%7D)   (6)

    式(6)中， 
![](https://www.zhihu.com/equation?tex=y) 表示训练时真实类别群组标签，从式(6)中可以看出，如果数据集B中的类别标签为<strong>非机动车</strong>时，此时电动车类别的梯度为：

![](https://www.zhihu.com/equation?tex=%5Cfrac%7B%7B%5Cpartial+%7BL_i%7D%7D%7D%7B%7B%5Cpartial+%7Bf_%7B%E7%94%B5%E5%8A%A8%E8%BD%A6%7D%7D%7D%7D%7B%5Crm%7B+%3D+%7D%7D%5Cleft%28+%7B%7BP_%7B%E7%94%B5%E5%8A%A8%E8%BD%A6%7D%7D+%2B+%7BP_%7B%E8%87%AA%E8%A1%8C%E8%BD%A6%7D%7D+-+1%7D+%5Cright%29%5Cfrac%7B%7B%7BP_%7B%E7%94%B5%E5%8A%A8%E8%BD%A6%7D%7D%7D%7D%7B%7B%7BP_%7B%E7%94%B5%E5%8A%A8%E8%BD%A6%7D%7D+%2B+%7BP_%7B%E8%87%AA%E8%A1%8C%E8%BD%A6%7D%7D%7D%7D)

    可以看到，对比式(1)和式(6)，得出的结论非常的make sense，对于一个群组类别中的子类别而言，其对应的梯度为群组类别的梯度乘以相应的权重，权重取值为当前子类别的预测概率 
![](https://www.zhihu.com/equation?tex=P_%7Bm%7D) 与群组类别的预测概率 
![](https://www.zhihu.com/equation?tex=P_%7Bg%7D) 的比值，其中群组类别的预测概率 
![](https://www.zhihu.com/equation?tex=P_%7Bg%7D) 等于多个子类别的预测概率之和。从式(1)和式(6)可以看出，当群组类别
![](https://www.zhihu.com/equation?tex=g) 中只包含
![](https://www.zhihu.com/equation?tex=m) 单独一个类别时，GroupSoftmax损失函数退化为Softmax损失函数，也即可以认为GroupSoftmax损失函数是Softmax损失函数的一种推广，一种更复杂也更加灵活的表达，可以自由的发生类别合并。

工程实现需要注意的细节

1、对于某一个数据集中的未进行标注的类别，可以理解为和背景一起作为新的群组类别。

2、在two-stage检测算法中，用于提取proposal的RPN网络通常是2分类网络，因为只用于区分前景和背景，但是对于某些类别未标注的数据集，是无法正确区分前景和背景的。此时需要将RPN网络修改为多分类。比如COCO+CCTSDB联合训练时，COCO中是一种前景，CCTSDB中是另外一种前景，所以此时的RPN应该修改为3分类，如下图所示：

![](https://pic3.zhimg.com/v2-e34620555f1323438dd44bfb91f8e988_r.jpg)COCO数据集对应rpnv1，第2种前景未进行标注，此时跟背景组成一个组合类别。CCTSDB数据集对应rpnv2，第1种前景未进行标注，此时跟背景组成一个组合类别。3、COCO(80)+CCTSDB(3)联合训练时，最终的分类任务为1+83类，对于某个数据集中未标注的类别，比如COCO中未标注的3类，可以和背景类组成一个组合类别。如下图所示：

![](https://pic3.zhimg.com/v2-7b9adf2f436594599669d24c934db03e_r.jpg)COCO标注了80类，后面3类未进行标注，所以后3类group信息为0，与背景类组成一个组合类别。CSTSDB标注了3类，前面80类未进行标注，所以前80类group信息为0，与背景类组成一个组合类别。4、编写CUDA代码时，计算群组类别的概率 
![](https://www.zhihu.com/equation?tex=P_%7Bg%7D) 时，需要加上一个微小量 
![](https://www.zhihu.com/equation?tex=eps) ，避免分母为0带来计算出错的情况。[GroupSoftmax的CUDA代码请参考](https://link.zhihu.com/?target=https%3A//github.com/chengzhengxin/groupsoftmax-simpledet/blob/master/operator_cxx/contrib/group_softmax_output.cu)；