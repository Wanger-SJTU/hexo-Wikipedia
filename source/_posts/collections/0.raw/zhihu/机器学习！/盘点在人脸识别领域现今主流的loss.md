---
title: 盘点在人脸识别领域现今主流的loss
date: "2019-04-30 00:00:00"
updated: "2019-04-30 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/机器学习/盘点在人脸识别领域现今主流的loss/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/64314762
---


大家好，今天写这篇文章主要是为大家介绍一下在人脸识别领域（Face recogonition）中现今大家最常用的几种loss function. 

同样，我会step by step推导每一种loss function，让大家一目了然的看出他们之间的区别和联系。同样，这里我先抛出两个问题：为什么这些同样是做分类的loss，在人脸领域如此大火，但在其他领域，比如Imagenet上面被大家用的基本没有呢？一些最普通最基本的问题上面，这些loss的表现如何？

好了，闲话不多说，咱们直接进入正题：

首先，故事的开始，要从模型如何要做分类讲起：

**original softmax：**

首先咱们给出一个相当普通的网络图片，仅当事例：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_ae20830946a6.jpg)

在上图中，分类的最后一层叫做softmax层，其输出是每一类的概率。数学表达为：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_c52a7d472125.jpg)

这里的X是倒数第二层神经元输出的值，我们叫embedding feature. W为倒数第二层和倒数第一层之间的权重值。换言之最后一层神经元利用倒数第二层提取到的特征来做分类（classification）。

我们在做分类时，有几类最后一层便有几个神经元，比如MNIST，手写数字，有0～9十个数字，共有十类，所以最后一层便有十个神经元，在过激活函数（也就是softmax）前的输出为：

W^TX+b 

过完softmax，输出便成了每一类的概率。也就是最后一层所有神经元的输出总和为1，每一个单个神经元输出为0～1。

那么得到了概率，我们如何去优化网络呢？这里面我们最常用的就是最普通的cross-entropy loss（交叉熵损失），交叉熵损失函数大家也很熟悉了，这里再啰嗦两句，因为这对之后我们的推导相当重要：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_541a42058d71.jpg)

这式子咱们定性理解一下，假如说我们图片数字是0，最后一层第一个神经元代表了该图片是0的概率，假如输出为0.8，我们希望它输出是1，所有这其中的损失可以用交叉熵来衡量：

就是损失带入上式就是 -log(0.8) ，概率越接近1，损失越小，越接近0，损失越大。从式子上看，这种损失，会将特征以指数程度分开，从而使分类正确。

好了，开胃菜结束，正餐正式开始：

**ArcFace Loss**

下面，咱们首先介绍的是目前效果最好的一种loss改进，arcFace loss：

首先我们在将最后一层神经元的输出用softmax转换成概率之前，得到是： W^TX+b 

第一步，我们使b = 0，那么最后一层softmax前的输出仅变为： W^TX 

第二步，根据线性代数 W^TX 可以写为： W^TX =|W|* |X |*cos(\theta) ,这里的 |W| 和 |X| 是将W和X进行 l_2 归一化以后的结果，而 \theta 代表了W和X之间的夹角。

第三步：我们将|W| 和 |X|除到左边，然后等式两边同时乘s，我们能够得到：

$$s*cos(\theta) = s*\frac{W}{|W|} *\frac{X}{|X|} $$

这个式子很有意思，假如我们将倒数第二层的X归一化，然后再将最后一层的weight归一化，然后乘上因子s（此为常数），我们可以看到，我们的分类此时仅取决于W和X之间的夹角 \theta 。

然后，我们将上式带入我们原始的交叉熵损失函数之中，我们可以得到：

从：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_3e69a40f4f3b.jpg)

由于b = 0， W和X被归一化并且乘上系数s，上式 变为：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_1ee67d586c5c.jpg)

上面两式在b=0，并完成归一化后完全等价。

好了现在还差最后一步，就推导出我们的arcface啦：

最后一步：我们在 \theta  上加上一个常数m，于是此时式子变为：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_756c9b8e1797.png)

这就是我们的arcface loss。

那么此时有同学问，加了一个m到底意味着什么呢？

一幅图可以清晰解惑：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_a7dfd07c5065.jpg)

**可以看到，m就意味着类别之间的那个距离。添加了参数m，会有两个好处，扩大了类间距，缩小了类内距。从而使分类的效果更好。

下面，我们看下原论文上面的使用arcface loss的flow chart：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_190f0d6f4234.jpg)

从这张图上我们可以清晰看到作者将x和w归一化后相乘得到 cos \theta ，之后求arccos得到角度 \theta ,再加上m得到扩大的角度边界，之后再求cos，然后走交叉熵损失，就得到了arcface loss啦。

好了，理解了上述公式和流程，应该就算是打通了任督二脉，看其他的loss也会莫名简单了。

下面进入第三个loss：

Cosine Face loss：**

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_3ee219e920a8.jpg)

对比一下arcface loss：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_756c9b8e1797.png)

我觉得多余的解释都是徒劳的，，，其实m就是从cos里面换到了cos外面对吧

为啥这样呢？Cosine Face文中说，这样做能够更容易计算，操作更简单，因为不用算arccos，梯度计算快，反向优化速度快，但是性能可能会比arcface略差。好的，这是可以理解的。

好下面进入第四个loss，

**SphereFace loss：**

废话不多说，咱们直接看loss的形式：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_c0681b617ce8.png)

相信大家已经看出来了，这个相比于上面，其实就是多保留了 |X| 这一项，没有什么特别新鲜的。其实就是scalar s变成了变动的，从而使效果更好。

那么现在咱们吧上述四个loss放在一块，看一下分类边界的区别：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_f8d8e84c007e.jpg)

我们发现，除了原始的softmax以外，这三个loss都是为了缩小类内距，扩大类间距从而实现的效果提升。

好了，还有一个loss改善的鼻祖，center loss没有介绍，下面咱们说一下，它的思想虽然和上面三个loss不太一样，但是也非常好理解：

Center loss

在交叉熵损失以外，该论文作者引入了center 的含义，和借由center所产生的损失：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_3202cabd787d.jpg)

这就是center-loss的一部分，我们观察这个公式， c_{y_i} 实际上就是 y_i 类的所有数据的center，换言之就是所有属于这类数据特征的平均值。让这个损失最小实际上就是减少类内距。

所以center loss的总体公式就是 交叉熵损失+中心损失：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_9d013efda67d.jpg)

这里用 \lambda 来控制两种损失的比例，同样我们来看效果图：

![](/images/collections/0.raw/zhihu/%25E6%259C%25BA%25E5%2599%25A8%25E5%25AD%25A6%25E4%25B9%25A0%25EF%25BC%2581/asset/img_1cba9f1642cd.jpg)

随着比例越高，center聚合的效果越明显对吧～

事实上，为什么说这个loss比较原始呢？

因为其只考虑了缩小类内距而没有考虑扩大类间距，所以这种loss的表现不如上面三种好，如今已经不被人关注。

好啦，今天大概就先说到这里，这里还有一个triplet loss我没有讲，当成彩蛋下次讲啦～

希望爱好深度学习的同学们一起学习，在deep learning上多多交流讨论～

咱们下次见。
